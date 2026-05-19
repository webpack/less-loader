import assert from "node:assert";
import { describe, it } from "node:test";

import {
  compile,
  getCodeFromBundle,
  getCodeFromLess,
  getCompiler,
  getErrors,
  getWarnings,
} from "./helpers/index.js";

describe('"webpackImporter" option', () => {
  it("should work when value is not specify", async (t) => {
    const testId = "./import-webpack.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should work when value is "true"', async (t) => {
    const testId = "./import-webpack.less";
    const compiler = getCompiler(testId, {
      webpackImporter: true,
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should work when value is "only"', async (t) => {
    const testId = "./import-webpack.less";
    const compiler = getCompiler(testId, {
      webpackImporter: "only",
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should work when value is "false"', async (t) => {
    const testId = "./import.less";
    const compiler = getCompiler(testId, {
      webpackImporter: false,
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should throw an error on webpack import when value is "false"', async (t) => {
    const testId = "./import-webpack.less";
    const compiler = getCompiler(testId, {
      webpackImporter: false,
    });
    const stats = await compile(compiler);

    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });
});
