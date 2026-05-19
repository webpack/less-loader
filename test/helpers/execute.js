import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default (code) => {
  const resource = "test.js";
  const m = new Module(resource);

  m.paths = Module._nodeModulePaths(path.resolve(__dirname, "../fixtures"));
  m.filename = resource;

  m._compile(code, resource);

  return m.exports;
};
