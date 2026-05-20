import assert from "node:assert";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import lessPluginGlob from "less-plugin-glob";

import {
  compile,
  getCodeFromBundle,
  getCodeFromLess,
  getCompiler,
  getErrors,
  getWarnings,
  validateDependencies,
} from "./helpers/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const CustomFileLoaderPlugin = require("./fixtures/folder/customFileLoaderPlugin.cjs");
const CustomImportPlugin = require("./fixtures/folder/customImportPlugin.cjs");

const nodeModulesPath = path.resolve(__dirname, "fixtures", "node_modules");

describe("loader", { timeout: 30000 }, () => {
  it("should work", async (t) => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should compile data-uri function", async (t) => {
    const testId = "./data-uri.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should track files loaded synchronously by data-uri as dependencies", async () => {
    const testId = "./data-uri.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const { fileDependencies } = stats.compilation;

    validateDependencies(fileDependencies);

    const fixtures = [
      path.resolve(__dirname, "fixtures", "data-uri.less"),
      path.resolve(__dirname, "fixtures", "resources", "circle.svg"),
    ];

    for (const fixture of fixtures) {
      assert.strictEqual(
        fileDependencies.has(fixture),
        true,
        `Expected ${fixture} to be tracked as a file dependency`,
      );
    }
  });

  it("should transform urls", async (t) => {
    const testId = "./url-path.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should install plugins", async (t) => {
    let pluginInstalled = false;
    // Using prototype inheritance here since Less plugins are usually instances of classes
    // See https://github.com/webpack/less-loader/issues/181#issuecomment-288220113
    const testPlugin = {
      install() {
        pluginInstalled = true;
      },
    };
    const sourceMap = { outputSourceFiles: false };
    const plugins = [testPlugin];
    const testId = "./basic.less";
    const compiler = await getCompiler(testId, {
      sourceMap: true,
      lessOptions: { plugins, sourceMap },
    });
    const stats = await compile(compiler);

    assert.strictEqual(plugins.length, 1);
    assert.deepStrictEqual(sourceMap, { outputSourceFiles: false });
    assert.strictEqual(pluginInstalled, true);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should import from plugins", async (t) => {
    const testId = "./empty.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        plugins: [new CustomImportPlugin()],
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId, {
      lessOptions: {
        plugins: [new CustomImportPlugin()],
      },
    });

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work third-party plugins as fileLoader", async (t) => {
    const testId = "./file-load.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        plugins: [new CustomFileLoaderPlugin()],
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId, {
      lessOptions: {
        plugins: [new CustomFileLoaderPlugin()],
      },
    });

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should not alter the original options object", async (t) => {
    const options = { lessOptions: { plugins: [] } };
    const copiedOptions = { ...options };

    const testId = "./empty.less";
    const compiler = getCompiler(testId, options);
    const stats = await compile(compiler);

    assert.deepStrictEqual(copiedOptions, options);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve all imports", async (t) => {
    const testId = "./import.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve nested imports", async (t) => {
    const testId = "./import-nested.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work lessOptions.relativeUrls is true", async (t) => {
    const testId = "./import-relative.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        relativeUrls: true,
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId, {
      lessOptions: {
        relativeUrls: true,
      },
    });

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work lessOptions.relativeUrls is false", async (t) => {
    const testId = "./import-relative.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        relativeUrls: false,
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId, {
      lessOptions: {
        relativeUrls: false,
      },
    });

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve all imports from node_modules using webpack's resolver", async (t) => {
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

  it("should resolve aliases in different variants", async (t) => {
    const testId = "./import-webpack-aliases.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        resolve: {
          alias: {
            fileAlias: path.resolve(__dirname, "fixtures", "img.less"),
            assets: path.resolve(__dirname, "fixtures"),
          },
        },
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve all imports from the given paths using Less resolver", async (t) => {
    const testId = "./import-paths.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        paths: [path.resolve(nodeModulesPath, "some")],
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should not to disable webpack's resolver by passing an empty paths array", async (t) => {
    const testId = "./import-webpack-aliases.less";
    const compiler = getCompiler(
      testId,
      {
        lessOptions: {
          paths: [],
        },
      },
      {
        resolve: {
          alias: {
            fileAlias: path.resolve(__dirname, "fixtures", "img.less"),
            assets: path.resolve(__dirname, "fixtures"),
          },
        },
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should prefer-relative imports correctly", async (t) => {
    const testId = "./import-prefer-relative.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        resolve: {
          alias: {
            preferAlias: "prefer-relative/index.less",
          },
        },
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should not try to resolve CSS imports with URLs", async (t) => {
    const testId = "./import-url.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should allow to import non-less files", async (t) => {
    const testId = "./import-non-less.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should provide a useful error message if the import could not be found", async (t) => {
    const testId = "./error-import-not-existing.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);

    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should provide a useful error message if there was a syntax error", async (t) => {
    const testId = "./error-syntax.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);

    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should be able to import a file with an absolute path", async (t) => {
    const importedFilePath = path.resolve(
      __dirname,
      "fixtures",
      "import-absolute-target.less",
    );

    const testId = "./import-absolute.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        globalVars: {
          absolutePath: `'${importedFilePath}'`,
        },
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);

    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should add all resolved imports as dependencies", async (t) => {
    const testId = "./import.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const { fileDependencies } = stats.compilation;

    validateDependencies(fileDependencies);

    const fixtures = [
      path.resolve(__dirname, "fixtures", "import.less"),
      path.resolve(__dirname, "fixtures", "css.css"),
      path.resolve(__dirname, "fixtures", "basic.less"),
    ];

    for (const fixture of fixtures) {
      assert.strictEqual(fileDependencies.has(fixture), true);
    }
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should add all resolved imports as dependencies, including aliased ones", async (t) => {
    const testId = "./import-webpack-alias.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        resolve: {
          alias: {
            "aliased-some": "some",
          },
        },
      },
    );
    const stats = await compile(compiler);
    const { fileDependencies } = stats.compilation;

    validateDependencies(fileDependencies);

    const fixtures = [
      path.resolve(__dirname, "fixtures", "import-webpack-alias.less"),
      path.resolve(
        __dirname,
        "fixtures",
        "node_modules",
        "some",
        "module.less",
      ),
    ];

    for (const fixture of fixtures) {
      assert.strictEqual(fileDependencies.has(fixture), true);
    }
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should add all resolved imports as dependencies, including those from the Less resolver", async (t) => {
    const testId = "./import-dependency.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        paths: [__dirname, nodeModulesPath],
      },
    });
    const stats = await compile(compiler);
    const { fileDependencies } = stats.compilation;

    validateDependencies(fileDependencies);

    const fixtures = [
      path.resolve(__dirname, "fixtures", "import-dependency.less"),
      path.resolve(
        __dirname,
        "fixtures",
        "node_modules",
        "some",
        "module.less",
      ),
    ];

    for (const fixture of fixtures) {
      assert.strictEqual(fileDependencies.has(fixture), true);
    }
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should add a file with an error as dependency so that the watcher is triggered when the error is fixed", async (t) => {
    const testId = "./error-import-file-with-error.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        paths: [__dirname, nodeModulesPath],
      },
    });
    const stats = await compile(compiler);
    const { fileDependencies } = stats.compilation;

    validateDependencies(fileDependencies);

    const fixtures = [
      path.resolve(__dirname, "fixtures", "error-import-file-with-error.less"),
      path.resolve(__dirname, "fixtures", "error-syntax.less"),
    ];

    for (const fixture of fixtures) {
      assert.strictEqual(fileDependencies.has(fixture), true);
    }
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should add all resolved imports as dependencies, including node_modules", async (t) => {
    const testId = "./import-webpack.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const { fileDependencies } = stats.compilation;

    validateDependencies(fileDependencies);

    const fixtures = [
      path.resolve(__dirname, "fixtures", "import-webpack.less"),
      path.resolve(
        __dirname,
        "fixtures",
        "node_modules",
        "some",
        "module.less",
      ),
    ];

    for (const fixture of fixtures) {
      assert.strictEqual(fileDependencies.has(fixture), true);
    }
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should watch imports correctly", async (t) => {
    const testId = "./watch.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);
    const { fileDependencies } = stats.compilation;

    validateDependencies(fileDependencies);

    const fixtures = [
      path.resolve(__dirname, "fixtures", "watch.less"),
      path.resolve(
        __dirname,
        "fixtures",
        "node_modules",
        "package",
        "style.less",
      ),
    ];

    for (const fixture of fixtures) {
      assert.strictEqual(fileDependencies.has(fixture), true);
    }

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should get absolute path relative rootContext", async (t) => {
    const testId = "./import-absolute-2.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        context: path.resolve(__dirname),
        entry: path.resolve(__dirname, "./fixtures", testId),
      },
    );
    const stats = await compile(compiler);

    const codeFromBundle = getCodeFromBundle(stats, compiler);

    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve unresolved url with alias", async (t) => {
    const testId = "./import-absolute-3.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        resolve: {
          alias: {
            "/styles/style.less": path.resolve(
              __dirname,
              "fixtures",
              "basic.less",
            ),
          },
        },
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve absolute path", async (t) => {
    // Create the file with absolute path
    const file = path.resolve(__dirname, "fixtures", "generated-1.less");
    const absolutePath = path.resolve(__dirname, "fixtures", "basic.less");

    fs.writeFileSync(file, `@import "${absolutePath}";`);

    const testId = "./generated-1.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve absolute path with alias", async (t) => {
    // Create the file with absolute path
    const file = path.resolve(__dirname, "fixtures", "generated-2.less");
    const absolutePath = path.resolve(__dirname, "fixtures", "unresolved.less");

    fs.writeFileSync(file, `@import "${absolutePath}";`);

    const config = {};
    config.resolve = {};
    config.resolve.alias = {};
    config.resolve.alias[absolutePath] = path.resolve(
      __dirname,
      "fixtures",
      "basic.less",
    );

    const testId = "./generated-2.less";
    const compiler = getCompiler(testId, {}, config);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);

    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve non-less import with alias", async (t) => {
    const testId = "./import-non-less-2.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        resolve: {
          alias: {
            "../../some.file": path.resolve(
              __dirname,
              "fixtures",
              "folder",
              "some.file",
            ),
          },
        },
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should add path to dependencies", async (t) => {
    // Create the file with absolute path
    const file = path.resolve(__dirname, "fixtures", "generated-3.less");
    const absolutePath = path.resolve(__dirname, "fixtures", "basic.less");

    fs.writeFileSync(file, `@import "${absolutePath}";`);

    const testId = "./generated-3.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const { fileDependencies } = stats.compilation;

    validateDependencies(fileDependencies);

    let isAddedToDependencies = false;

    for (const item of fileDependencies) {
      if (item === absolutePath) {
        isAddedToDependencies = true;
      }
    }

    assert.strictEqual(isAddedToDependencies, true);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should resolve the "less" field from the "exports" field from "package.json"', async (t) => {
    const testId = "./import-package-with-exports.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should resolve "@import" without "less" extension', async (t) => {
    const testId = "./import-without-extension.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should resolve "@import" with "less" extension', async (t) => {
    const testId = "./import-without-extension.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should resolve "@import" with "css" extension', async (t) => {
    const testId = "./import-with-css-extension.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should resolve "@import" with "php" extension', async (t) => {
    const testId = "./import-with-php-extension.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work and have loaderContext in less plugins", async (t) => {
    let contextInClass = false;
    let contextInObject = false;

    const less = require("less");

    class Plugin extends less.FileManager {
      constructor(lessInstance, pluginManager) {
        super();

        if (typeof pluginManager.webpackLoaderContext !== "undefined") {
          contextInClass = true;
        }
      }
    }

    class CustomClassPlugin {
      install(lessInstance, pluginManager) {
        pluginManager.addFileManager(new Plugin(lessInstance, pluginManager));
      }
    }

    const customObjectPlugin = {
      install(lessInstance, packageManager) {
        if (typeof packageManager.webpackLoaderContext !== "undefined") {
          contextInObject = true;
        }
      },
    };

    const testId = "./basic-plugins-2.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        plugins: [new CustomClassPlugin(), customObjectPlugin],
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);

    assert.strictEqual(contextInClass, true);
    assert.strictEqual(contextInObject, true);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve nested package", async (t) => {
    const testId = "./node_modules/less-package-2/index.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve nested package #2", async (t) => {
    const testId = "./less-package.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should resolve in working directory", async (t) => {
    const oldCwd = process.cwd();

    process.chdir(path.resolve(__dirname, "fixtures"));

    const testId = "./resolve-working-directory/index.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));

    process.chdir(oldCwd);
  });

  it("should work and respect the 'resolve.byDependency.less' option", async (t) => {
    const testId = "./by-dependency.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        resolve: {
          byDependency: {
            less: {
              mainFiles: ["custom"],
            },
          },
        },
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should import from glob expressions", async (t) => {
    const testId = "./glob.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        plugins: [lessPluginGlob],
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId, {
      lessOptions: {
        plugins: [lessPluginGlob],
      },
    });

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should emit an error", async (t) => {
    const testId = "./error.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);

    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should work and logging", async (t) => {
    const testId = "./logging.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);
    const logs = [];

    for (const [name, value] of stats.compilation.logging) {
      if (/less-loader/.test(name)) {
        logs.push(
          value.map((item) => ({
            type: item.type,
            args: item.args,
          })),
        );
      }
    }

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(logs);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should work with a package with "sass" and "exports" fields and a custom condition (theme1)', async (t) => {
    const testId = "./import-package-with-exports-and-custom-condition.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        resolve: {
          conditionNames: ["theme1", "..."],
        },
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(
      testId,
      {},
      {
        packageExportsCustomConditionTestVariant: 1,
      },
    );

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it('should work with a package with "sass" and "exports" fields and a custom condition (theme2)', async (t) => {
    const testId = "./import-package-with-exports-and-custom-condition.less";
    const compiler = getCompiler(
      testId,
      {},
      {
        resolve: {
          conditionNames: ["theme2", "..."],
        },
      },
    );
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(
      testId,
      {},
      {
        packageExportsCustomConditionTestVariant: 2,
      },
    );

    assert.strictEqual(codeFromBundle.css, codeFromLess.css);
    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should throw an error", async (t) => {
    const testId = "./broken.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);

    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });

  it("should emit less warning as webpack warning", async (t) => {
    const testId = "./warn.less";
    const compiler = getCompiler(testId, {
      lessLogAsWarnOrErr: true,
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);

    t.assert.snapshot(codeFromBundle.css);
    t.assert.snapshot(getWarnings(stats));
    t.assert.snapshot(getErrors(stats));
  });
});
