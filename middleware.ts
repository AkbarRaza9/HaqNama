// Rate limiting middleware for all API routes.
//
// Mandatory security requirement — applies to /api/* paths.
// In-memory per-IP limiter: 30 requests per 60-second window.
// Returns 429 with Retry-After header when exceeded.
//
// LIMITATION: In-memory only. State resets on cold start and is not
// shared across serverless function instances. This is acceptable for
// MVP. For production scale, swap the store to Redis / Upstash —
// the interface (checkLimit / reset) is designed to be swappable.

import { NextRequest, NextResponse } from "next/server";

const RATE_LIMIT = 30; // requests
const RATE_WINDOW_MS = 60_000; // 60 seconds

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateStore = new Map<string, RateEntry>();

function getClientIp(request: NextRequest): string {
  // Vercel sets x-forwarded-for; fall back to "unknown"
  // Note: request.ip was removed in Next.js 15 — do not use it.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP in the chain (closest to client)
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

// Sweep expired entries so the Map doesn't grow unbounded from many
// distinct IPs over time. Runs on every request — cheap because it
// only iterates entries that have already expired.
function cleanupExpired(): void {
  const now = Date.now();
  for (const [ip, entry] of rateStore) {
    if (now >= entry.resetAt) {
      rateStore.delete(ip);
    }
  }
}

function checkLimit(ip: string): { allowed: boolean; retryAfter: number } {
  cleanupExpired();

  const now = Date.now();
  const entry = rateStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    // New window
    rateStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function middleware(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getClientIp(request);
  const { allowed, retryAfter } = checkLimit(ip);

  if (!allowed) {
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests. Please slow down.",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
