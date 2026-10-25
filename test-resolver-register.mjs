// Registers the ESM resolver hook for tests.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register(pathToFileURL("./test-resolver.mjs"));
