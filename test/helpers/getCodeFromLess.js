import fs from "node:fs";
import path from "node:path";

import less from "less";

const pathMap = {
  "some/css.css": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "some",
    "css.css",
  ),
  "~some/css.css": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "some",
    "css.css",
  ),
  "some/module": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "some",
    "module.less",
  ),
  "~some/module": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "some",
    "module.less",
  ),
  "some/module.less": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "some",
    "module.less",
  ),
  "module.less": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "some",
    "module.less",
  ),
  "@scope/css.css": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "@scope",
    "css.css",
  ),
  "@scope/module": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "@scope",
    "module.less",
  ),
  "~fileAlias": path.resolve(__dirname, "..", "fixtures", "img.less"),
  fileAlias: path.resolve(__dirname, "..", "fixtures", "img.less"),
  "assets/basic.less": path.resolve(__dirname, "..", "fixtures", "basic.less"),
  "@{absolutePath}": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "import-absolute-target.less",
  ),
  "package/style.less": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "package",
    "style.less",
  ),
  "/styles/style.less": path.resolve(__dirname, "..", "fixtures", "basic.less"),
  "../../some.file": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "folder",
    "some.file",
  ),
  "package-with-exports": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "package-with-exports",
    "style.less",
  ),
  preferAlias: path.resolve(
    __dirname,
    "..",
    "fixtures",
    "prefer-relative",
    "index.less",
  ),
  "custom-main-files": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "custom-main-files",
    "custom.less",
  ),
  "less-package-1/index.less": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "less-package-2",
    "node_modules",
    "less-package-1",
    "index.less",
  ),
  "less-package-2": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "node_modules",
    "less-package-2",
    "index.less",
  ),
  "./resolve-working-directory-a.less": path.resolve(
    __dirname,
    "..",
    "fixtures",
    "resolve-working-directory",
    "resolve-working-directory-a.less",
  ),
  "3rd/b.less": path.resolve(__dirname, "..", "fixtures", "3rd", "b.less"),
};

class ResolvePlugin extends less.FileManager {
  supports(filename) {
    if (filename[0] === "/" || path.win32.isAbsolute(filename)) {
      return true;
    }

    if (this.isPathAbsolute(filename)) {
      return false;
    }

    return true;
  }

  supportsSync() {
    return false;
  }

  async loadFile(filename, ...args) {
    const result =
      pathMap[filename] || path.resolve(__dirname, "..", "fixtures", filename);

    return super.loadFile(result, ...args);
  }
}

class CustomImportPlugin {
  install(lessInstance, pluginManager) {
    pluginManager.addFileManager(new ResolvePlugin());
  }
}

async function getCodeFromLess(testId, options = {}, context = {}) {
  let pathToFile;

  if (context.packageExportsCustomConditionTestVariant === 1) {
    pathToFile = path.resolve(
      __dirname,
      "..",
      "fixtures",
      "node_modules/package-with-exports-and-custom-condition/style-1.less",
    );
  } else if (context.packageExportsCustomConditionTestVariant === 2) {
    pathToFile = path.resolve(
      __dirname,
      "..",
      "fixtures",
      "node_modules/package-with-exports-and-custom-condition/style-2.less",
    );
  } else {
    pathToFile = path.resolve(__dirname, "..", "fixtures", testId);
  }

  const defaultOptions = {
    plugins: [],
    relativeUrls: true,
    filename: pathToFile,
  };
  const lessOptions = options.lessOptions || {};

  let data = await fs.promises.readFile(pathToFile);

  if (typeof options.additionalData !== "undefined") {
    data =
      typeof options.additionalData === "function"
        ? `${await options.additionalData(data, {
            rootContext: path.resolve(__dirname, "../fixtures"),
            resourcePath: pathToFile,
          })}`
        : `${options.additionalData}\n${data}`;
  }

  const mergedOptions = {
    ...defaultOptions,
    ...lessOptions,
  };

  mergedOptions.plugins.unshift(new CustomImportPlugin());

  return less.render(data.toString(), mergedOptions);
}

export default getCodeFromLess;
