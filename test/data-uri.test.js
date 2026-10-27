import assert from "node:assert";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { compile, getCompiler, getErrors, readAsset } from "./helpers/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("data: URI resource", () => {
  it("should resolve imports from the loader's context", async () => {
    // An inline <style lang="less"> body from an HTML page reaches the loader as a data: URI.
    const compiler = getCompiler(
      "",
      {},
      {
        entry:
          "data:text/less;base64,QGltcG9ydCAiLi9kYXRhLXVyaS12YXJzLmxlc3MiOwouZGF0YS11cmktbGVzcyB7IGNvbG9yOiBAZGF0YS11cmktY29sb3I7IH0K",
        output: {
          path: path.resolve(__dirname, "./outputs"),
          cssFilename: "[name].bundle.css",
        },
        module: {
          rules: [
            {
              mimetype: "text/less",
              type: "css/auto",
              loader: path.resolve(__dirname, "../src/index.js"),
            },
          ],
        },
        experiments: { css: true },
      },
    );
    const stats = await compile(compiler);

    assert.deepStrictEqual(getErrors(stats), []);
    // `@import "./data-uri-vars.less"` resolves from the context the data: URI is given.
    assert.match(
      readAsset("main.bundle.css", compiler, stats),
      /\.data-uri-less\s*\{\s*color: green;/,
    );
  });
});
