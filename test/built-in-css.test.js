import assert from "node:assert";
import { describe, it } from "node:test";

import {
  compile,
  getCssCompiler,
  getErrors,
  getWarnings,
  readAsset,
  readsAssets,
} from "./helpers/index.js";

describe("built-in CSS support", { timeout: 30000 }, () => {
  it("should work", async (t) => {
    const testId = "./built-in-css/basic.less";
    const compiler = getCssCompiler(testId);
    const stats = await compile(compiler);

    t.assert.snapshot(readAsset("main.css", compiler, stats));
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should emit assets from `url()`", async (t) => {
    const testId = "./built-in-css/basic.less";
    const compiler = getCssCompiler(testId);
    const stats = await compile(compiler);
    const assets = readsAssets(compiler, stats);

    assert.strictEqual(
      Object.keys(assets).includes("circle.svg"),
      true,
      "Expected `circle.svg` to be emitted",
    );
    assert.match(assets["main.css"], /url\(circle\.svg\)/);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work with CSS modules", async (t) => {
    const testId = "./built-in-css/style.module.less";
    const compiler = getCssCompiler(testId);
    const stats = await compile(compiler);
    const css = readAsset("main.css", compiler, stats);

    assert.doesNotMatch(
      css,
      /^\.box\b/m,
      "Expected local class names to be renamed",
    );
    assert.match(css, /^\.[\w-]+-box\b/m);
    assert.match(css, /^\.[\w-]+-nested\b/m);
    t.assert.snapshot(css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should not treat a file as a CSS module with the `css` type", async (t) => {
    const testId = "./built-in-css/style.module.less";
    const compiler = getCssCompiler(testId, {}, { type: "css" });
    const stats = await compile(compiler);
    const css = readAsset("main.css", compiler, stats);

    assert.match(css, /^\.box\b/m, "Expected local class names to be kept");
    t.assert.snapshot(css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should treat any file as a CSS module with the `css/module` type", async (t) => {
    const testId = "./built-in-css/basic.less";
    const compiler = getCssCompiler(testId, {}, { type: "css/module" });
    const stats = await compile(compiler);
    const css = readAsset("main.css", compiler, stats);

    assert.doesNotMatch(
      css,
      /^\.box\b/m,
      "Expected local class names to be renamed",
    );
    assert.match(css, /^\.[\w-]+-box\b/m);
    t.assert.snapshot(css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work with the `lessOptions` option", async (t) => {
    const testId = "./built-in-css/variables.less";
    const compiler = getCssCompiler(testId, {
      lessOptions: { globalVars: { color: "hotpink" } },
    });
    const stats = await compile(compiler);

    t.assert.snapshot(readAsset("main.css", compiler, stats));
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work with the `additionalData` option", async (t) => {
    const testId = "./built-in-css/variables.less";
    const compiler = getCssCompiler(testId, {
      additionalData: "@color: coral;",
    });
    const stats = await compile(compiler);

    t.assert.snapshot(readAsset("main.css", compiler, stats));
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should generate source maps", async (t) => {
    const testId = "./built-in-css/basic.less";
    const compiler = getCssCompiler(
      testId,
      { sourceMap: true },
      { devtool: "source-map" },
    );
    const stats = await compile(compiler);
    const assets = readsAssets(compiler, stats);
    const map = JSON.parse(assets["main.css.map"]);

    assert.strictEqual(
      map.sources.some((source) => source.endsWith("built-in-css/basic.less")),
      true,
      "Expected the source map to reference the original Less file",
    );
    assert.strictEqual(
      map.sourcesContent.some((content) => content.includes("@base: #f938ab;")),
      true,
      "Expected the source map to contain the original Less source",
    );
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should emit less warning as webpack warning", async (t) => {
    const testId = "./warn.less";
    const compiler = getCssCompiler(testId);
    const stats = await compile(compiler);

    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should emit an error on a broken file", async (t) => {
    const testId = "./error.less";
    const compiler = getCssCompiler(testId);
    const stats = await compile(compiler);

    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });
});
