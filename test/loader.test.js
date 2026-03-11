import fs from "node:fs";
import path from "node:path";

import lessPluginGlob from "less-plugin-glob";
import CustomImportPlugin from "./fixtures/folder/customImportPlugin";

import {
  compile,
  getCodeFromBundle,
  getCodeFromLess,
  getCompiler,
  getErrors,
  getWarnings,
  validateDependencies,
} from "./helpers";

const nodeModulesPath = path.resolve(__dirname, "fixtures", "node_modules");

jest.setTimeout(30000);

describe("loader", () => {
  it("should work", async () => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should compile data-uri function", async () => {
    const testId = "./data-uri.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should transform urls", async () => {
    const testId = "./url-path.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should install plugins", async () => {
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

    expect(plugins).toHaveLength(1);
    expect(sourceMap).toEqual({ outputSourceFiles: false });
    expect(pluginInstalled).toBe(true);
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should import from plugins", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should work third-party plugins as fileLoader", async () => {
    const getCustomFileLoaderPlugin = (
      await import("./fixtures/folder/customFileLoaderPlugin")
    ).default.default;
    const CustomFileLoaderPlugin = await getCustomFileLoaderPlugin();

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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should not alter the original options object", async () => {
    const options = { lessOptions: { plugins: [] } };
    const copiedOptions = { ...options };

    const testId = "./empty.less";
    const compiler = getCompiler(testId, options);
    const stats = await compile(compiler);

    expect(copiedOptions).toEqual(options);
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve all imports", async () => {
    const testId = "./import.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve nested imports", async () => {
    const testId = "./import-nested.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should work lessOptions.relativeUrls is true", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should work lessOptions.relativeUrls is false", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve all imports from node_modules using webpack's resolver", async () => {
    const testId = "./import-webpack.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve aliases in different variants", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve all imports from the given paths using Less resolver", async () => {
    const testId = "./import-paths.less";
    const compiler = getCompiler(testId, {
      lessOptions: {
        paths: [path.resolve(nodeModulesPath, "some")],
      },
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should not to disable webpack's resolver by passing an empty paths array", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should prefer-relative imports correctly", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should not try to resolve CSS imports with URLs", async () => {
    const testId = "./import-url.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  // eslint-disable-next-line jest/no-commented-out-tests
  // it('should delegate resolving (LESS) imports with URLs to "less" package', async () => {
  //   const testId = "./import-keyword-url.less";
  //   const compiler = getCompiler(testId);
  //   const stats = await compile(compiler);
  //   const codeFromBundle = getCodeFromBundle(stats, compiler);
  //   const codeFromLess = await getCodeFromLess(testId);
  //
  //   expect(codeFromBundle.css).toBe(codeFromLess.css);
  //   expect(codeFromBundle.css).toMatchSnapshot("css");
  //   expect(getWarnings(stats)).toMatchSnapshot("warnings");
  //   expect(getErrors(stats)).toMatchSnapshot("errors");
  // });

  it("should allow to import non-less files", async () => {
    const testId = "./import-non-less.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should provide a useful error message if the import could not be found", async () => {
    const testId = "./error-import-not-existing.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);

    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should provide a useful error message if there was a syntax error", async () => {
    const testId = "./error-syntax.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);

    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should be able to import a file with an absolute path", async () => {
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

    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should add all resolved imports as dependencies", async () => {
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
      expect(fileDependencies.has(fixture)).toBe(true);
    }
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should add all resolved imports as dependencies, including aliased ones", async () => {
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
      expect(fileDependencies.has(fixture)).toBe(true);
    }
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should add all resolved imports as dependencies, including those from the Less resolver", async () => {
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
      expect(fileDependencies.has(fixture)).toBe(true);
    }
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should add a file with an error as dependency so that the watcher is triggered when the error is fixed", async () => {
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
      expect(fileDependencies.has(fixture)).toBe(true);
    }
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should add all resolved imports as dependencies, including node_modules", async () => {
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
      expect(fileDependencies.has(fixture)).toBe(true);
    }
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should watch imports correctly", async () => {
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
      expect(fileDependencies.has(fixture)).toBe(true);
    }

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should get absolute path relative rootContext", async () => {
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

    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve unresolved url with alias", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve absolute path", async () => {
    // Create the file with absolute path
    const file = path.resolve(__dirname, "fixtures", "generated-1.less");
    const absolutePath = path.resolve(__dirname, "fixtures", "basic.less");

    fs.writeFileSync(file, `@import "${absolutePath}";`);

    const testId = "./generated-1.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve absolute path with alias", async () => {
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

    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve non-less import with alias", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  // eslint-disable-next-line jest/no-commented-out-tests
  // it("should not add to dependencies imports with URLs", async () => {
  //   const testId = "./import-url-deps.less";
  //   const compiler = getCompiler(testId);
  //   const stats = await compile(compiler);
  //   const codeFromBundle = getCodeFromBundle(stats, compiler);
  //   const codeFromLess = await getCodeFromLess(testId);
  //   const { fileDependencies } = stats.compilation;
  //
  //   validateDependencies(fileDependencies);
  //
  //   Array.from(fileDependencies).forEach((item) => {
  //     ["http", "https"].forEach((protocol) => {
  //       expect(item.includes(protocol)).toBe(false);
  //     });
  //   });
  //
  //   expect(codeFromBundle.css).toBe(codeFromLess.css);
  //   expect(codeFromBundle.css).toMatchSnapshot("css");
  //   expect(getWarnings(stats)).toMatchSnapshot("warnings");
  //   expect(getErrors(stats)).toMatchSnapshot("errors");
  // });

  it("should add path to dependencies", async () => {
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

    expect(isAddedToDependencies).toBe(true);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it('should resolve the "less" field from the "exports" field from "package.json"', async () => {
    const testId = "./import-package-with-exports.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it('should resolve "@import" without "less" extension', async () => {
    const testId = "./import-without-extension.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it('should resolve "@import" with "less" extension', async () => {
    const testId = "./import-without-extension.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it('should resolve "@import" with "css" extension', async () => {
    const testId = "./import-with-css-extension.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it('should resolve "@import" with "php" extension', async () => {
    const testId = "./import-with-php-extension.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should work and have loaderContext in less plugins", async () => {
    let contextInClass = false;
    let contextInObject = false;

    class Plugin extends require("less").FileManager {
      constructor(less, pluginManager) {
        super();

        if (typeof pluginManager.webpackLoaderContext !== "undefined") {
          contextInClass = true;
        }
      }
    }

    class CustomClassPlugin {
      install(less, pluginManager) {
        pluginManager.addFileManager(new Plugin(less, pluginManager));
      }
    }

    const customObjectPlugin = {
      install(less, packageManager) {
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

    expect(contextInClass).toBe(true);
    expect(contextInObject).toBe(true);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve nested package", async () => {
    const testId = "./node_modules/less-package-2/index.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve nested package #2", async () => {
    const testId = "./less-package.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should resolve in working directory", async () => {
    const oldCwd = process.cwd();

    process.chdir(path.resolve(__dirname, "fixtures"));

    const testId = "./resolve-working-directory/index.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");

    process.chdir(oldCwd);
  });

  it("should work and respect the 'resolve.byDependency.less' option", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should import from glob expressions", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should emit an error", async () => {
    const testId = "./error.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);

    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should work and logging", async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(logs).toMatchSnapshot("logs");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it('should work with a package with "sass" and "exports" fields and a custom condition (theme1)', async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it('should work with a package with "sass" and "exports" fields and a custom condition (theme2)', async () => {
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

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should throw an error", async () => {
    const testId = "./broken.less";
    const compiler = getCompiler(testId);
    const stats = await compile(compiler);

    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should emit less warning as webpack warning", async () => {
    const testId = "./warn.less";
    const compiler = getCompiler(testId, {
      lessLogAsWarnOrErr: true,
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);

    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });
});
