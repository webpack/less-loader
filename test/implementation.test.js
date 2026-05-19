import assert from "node:assert";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import {
  compile,
  getCodeFromBundle,
  getCodeFromLess,
  getCompiler,
  getErrors,
  getWarnings,
} from "./helpers/index.js";

const require = createRequire(import.meta.url);

describe('"implementation" option', () => {
  it("should work", async (t) => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId, {
      implementation: require("less"),
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work when implementation option is string", async (t) => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId, {
      implementation: require.resolve("less"),
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should throw error when unresolved package", async (t) => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId, {
      implementation: "unresolved",
    });
    const stats = await compile(compiler);

    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should throw error when implementation has error", async (t) => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId, {
      implementation: require.resolve("./fixtures/implementation-error.cjs"),
    });
    const stats = await compile(compiler);

    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });
});
