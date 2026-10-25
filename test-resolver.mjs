// ESM resolver hook: adds .ts extension to extensionless relative imports
// so that `import "./db"` resolves to `./db.ts` under --experimental-strip-types.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve as pathResolve } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  // Only intercept relative imports that have no extension
  if (specifier.startsWith(".") && !/\.[a-zA-Z]+$/.test(specifier)) {
    const parentPath = context.parentURL ? fileURLToPath(context.parentURL) : process.cwd();
    const parentDir = dirname(parentPath);
    const candidate = pathResolve(parentDir, specifier + ".ts");
    if (existsSync(candidate)) {
      return nextResolve(specifier + ".ts", context);
    }
  }
  return nextResolve(specifier, context);
}
