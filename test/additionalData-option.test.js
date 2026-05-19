import assert from "node:assert";
import path from "node:path";
import { describe, it } from "node:test";

import {
  compile,
  getCodeFromBundle,
  getCodeFromLess,
  getCompiler,
  getErrors,
  getWarnings,
} from "./helpers/index.js";

describe('"additionalData" option', () => {
  it("should work as string", async (t) => {
    const testId = "./additional-data.less";
    const additionalData = "@background: coral;";
    const compiler = getCompiler(testId, { additionalData });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId, { additionalData });

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should as function", async (t) => {
    const testId = "./additional-data.less";
    const additionalData = (content, loaderContext) => {
      const { resourcePath, rootContext } = loaderContext;

      const relativePath = path.relative(rootContext, resourcePath);

      return `
          /* RelativePath: ${relativePath}; */

          @background: coral;
          ${content};
          .custom-class {color: red};
        `;
    };
    const compiler = getCompiler(testId, { additionalData });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId, { additionalData });

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work as async function", async (t) => {
    const testId = "./additional-data.less";
    const additionalData = async (content, loaderContext) => {
      const { resourcePath, rootContext } = loaderContext;

      const relativePath = path.relative(rootContext, resourcePath);

      return `
          /* RelativePath: ${relativePath}; */

          @background: coral;
          ${content};
          .custom-class {color: red};
        `;
    };
    const compiler = getCompiler(testId, { additionalData });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId, { additionalData });

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });
});
