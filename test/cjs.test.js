import assert from "node:assert";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

const require = createRequire(import.meta.url);

const cjs = require("../dist/cjs.js");
const src = require("../dist/index.js");

describe("cjs", () => {
  it("should exported", () => {
    assert.strictEqual(cjs, src.default);
  });
});
