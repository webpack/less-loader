import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  compile,
  getCodeFromBundle,
  getCodeFromLess,
  getCompiler,
  getErrors,
  getWarnings,
} from "./helpers/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('"sourceMap" options', () => {
  it('should generate source maps when value is "true"', async (t) => {
    const testId = "./source-map.less";
    const compiler = getCompiler(testId, {
      sourceMap: true,
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);
    const { css, map } = codeFromBundle;

    map.sourceRoot = "";
    map.sources = map.sources.map((source) => {
      assert.strictEqual(path.isAbsolute(source), true);
      assert.strictEqual(source, path.normalize(source));
      assert.strictEqual(
        fs.existsSync(path.resolve(map.sourceRoot, source)),
        true,
      );

      return path
        .relative(path.resolve(__dirname, ".."), source)
        .replaceAll("\\", "/");
    });

    assert.strictEqual(css, codeFromLess.css);
    t.assert.snapshot(css);
    t.assert.snapshot(map);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should generate source maps when the "devtool" value is "source-map"', async (t) => {
    const testId = "./source-map.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        devtool: "source-map",
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);
    const { css, map } = codeFromBundle;

    map.sourceRoot = "";
    map.sources = map.sources.map((source) => {
      assert.strictEqual(path.isAbsolute(source), true);
      assert.strictEqual(source, path.normalize(source));
      assert.strictEqual(
        fs.existsSync(path.resolve(map.sourceRoot, source)),
        true,
      );

      return path
        .relative(path.resolve(__dirname, ".."), source)
        .replaceAll("\\", "/");
    });

    assert.strictEqual(css, codeFromLess.css);
    t.assert.snapshot(css);
    t.assert.snapshot(map);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should generate source maps when value is "true" and the "devtool" value is "false"', async (t) => {
    const testId = "./source-map.less";
    const compiler = getCompiler(
      testId,
      {
        sourceMap: true,
      },
      {
        devtool: false,
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);
    const { css, map } = codeFromBundle;

    map.sourceRoot = "";
    map.sources = map.sources.map((source) => {
      assert.strictEqual(path.isAbsolute(source), true);
      assert.strictEqual(source, path.normalize(source));
      assert.strictEqual(
        fs.existsSync(path.resolve(map.sourceRoot, source)),
        true,
      );

      return path
        .relative(path.resolve(__dirname, ".."), source)
        .replaceAll("\\", "/");
    });

    assert.strictEqual(css, codeFromLess.css);
    t.assert.snapshot(css);
    t.assert.snapshot(map);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should generate source maps when value has "false" value, but the "lessOptions.sourceMap.outputSourceFiles" is "true"', async (t) => {
    const testId = "./source-map.less";
    const compiler = getCompiler(testId, {
      sourceMap: false,
      lessOptions: {
        sourceMap: { outputSourceFiles: true },
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const { css, map } = codeFromBundle;

    map.sourceRoot = "";
    map.sources = map.sources.map((source) =>
      path.normalize(source).replaceAll("\\", "/"),
    );

    t.assert.snapshot(css);
    t.assert.snapshot(map);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should not generate source maps when value is "false"', async (t) => {
    const testId = "./source-map.less";
    const compiler = getCompiler(testId, {
      sourceMap: false,
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);
    const { css, map } = codeFromBundle;

    assert.strictEqual(css, codeFromLess.css);
    t.assert.snapshot(css);
    assert.strictEqual(map, undefined);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should not generate source maps when the "devtool" value is "false"', async (t) => {
    const testId = "./source-map.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        devtool: false,
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);
    const { css, map } = codeFromBundle;

    assert.strictEqual(css, codeFromLess.css);
    t.assert.snapshot(css);
    assert.strictEqual(map, undefined);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should not generate source maps when value is "false" and the "devtool" value is "source-map"', async (t) => {
    const testId = "./source-map.less";
    const compiler = getCompiler(
      testId,
      {
        sourceMap: false,
      },
      {
        devtool: "source-map",
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);
    const { css, map } = codeFromBundle;

    assert.strictEqual(css, codeFromLess.css);
    t.assert.snapshot(css);
    assert.strictEqual(map, undefined);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work and generate custom source maps", async (t) => {
    const testId = "./source-map.less";
    const lessOptions = {
      sourceMap: {
        sourceMapFileInline: true,
        // cspell:disable-next-line
        sourceMapBasepath: path.resolve(__dirname, "fixtures"),
        outputSourceFiles: true,
      },
    };
    const options = { lessOptions };
    const compiler = getCompiler(testId, options);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId, options);
    const { css, map } = codeFromBundle;

    assert.strictEqual(css, codeFromLess.css);
    t.assert.snapshot(css);
    t.assert.snapshot(map);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });
});
