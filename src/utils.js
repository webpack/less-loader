import path from "node:path";

const trailingSlash = /[/\\]$/;

// This somewhat changed in Less 3.x. Now the file name comes without the
// automatically added extension whereas the extension is passed in as `options.ext`.
// So, if the file name matches this regexp, we simply ignore the proposed extension.
const IS_SPECIAL_MODULE_IMPORT = /^~[^/]+$/;

// `[drive_letter]:\` + `\\[server]\[share_name]\`
const IS_NATIVE_WIN32_PATH = /^[a-z]:[/\\]|^\\\\/i;

// Examples:
// - ~package
// - ~package/
// - ~@org
// - ~@org/
// - ~@org/package
// - ~@org/package/
const IS_MODULE_IMPORT =
  /^~([^/]+|[^/]+\/|@[^/]+[/][^/]+|@[^/]+\/?|@[^/]+[/][^/]+\/)$/;
const MODULE_REQUEST_REGEX = /^[^?]*~/;

/**
 * Creates a Less plugin that uses webpack's resolving engine that is provided by the loaderContext.
 *
 * @param {LoaderContext} loaderContext
 * @param {object} implementation
 * @returns {LessPlugin}
 */
function createWebpackLessPlugin(loaderContext, implementation) {
  const lessOptions = loaderContext.getOptions();
  const resolve = loaderContext.getResolve({
    dependencyType: "less",
    conditionNames: ["less", "style", "..."],
    mainFields: ["less", "style", "main", "..."],
    mainFiles: ["index", "..."],
    extensions: [".less", ".css"],
    preferRelative: true,
  });

  class WebpackFileManager extends implementation.FileManager {
    supports(filename) {
      if (filename[0] === "/" || IS_NATIVE_WIN32_PATH.test(filename)) {
        return true;
      }

      if (this.isPathAbsolute(filename)) {
        return false;
      }

      return true;
    }

    // Sync resolving is used at least by the `data-uri` function.
    // This file manager doesn't know how to do it, so let's delegate it
    // to the default file manager of Less.
    // We could probably use loaderContext.resolveSync, but it's deprecated,
    // see https://webpack.js.org/api/loaders/#this-resolvesync
    supportsSync() {
      return false;
    }

    async resolveFilename(filename, currentDirectory) {
      // Less is giving us trailing slashes, but the context should have no trailing slash
      const context = currentDirectory.replace(trailingSlash, "");

      let request = filename;

      // A `~` makes the url an module
      if (MODULE_REQUEST_REGEX.test(filename)) {
        request = request.replace(MODULE_REQUEST_REGEX, "");
      }

      if (IS_MODULE_IMPORT.test(filename)) {
        request = request[request.length - 1] === "/" ? request : `${request}/`;
      }

      return this.resolveRequests(context, [...new Set([request, filename])]);
    }

    async resolveRequests(context, possibleRequests) {
      if (possibleRequests.length === 0) {
        throw new Error("No possible requests to resolve");
      }

      let result;

      try {
        result = await resolve(context, possibleRequests[0]);
      } catch (error) {
        const [, ...tailPossibleRequests] = possibleRequests;

        if (tailPossibleRequests.length === 0) {
          throw error;
        }

        result = await this.resolveRequests(context, tailPossibleRequests);
      }

      return result;
    }

    async loadFile(filename, ...args) {
      let result;

      try {
        if (
          IS_SPECIAL_MODULE_IMPORT.test(filename) ||
          lessOptions.webpackImporter === "only"
        ) {
          const error = new Error("Next");

          error.type = "Next";

          throw error;
        }

        result = await super.loadFile(filename, ...args);
      } catch (error) {
        if (error.type !== "File" && error.type !== "Next") {
          throw error;
        }

        try {
          result = await this.resolveFilename(filename, ...args);
        } catch (err) {
          error.message =
            `Less resolver error:\n${error.message}\n\n` +
            `Webpack resolver error details:\n${err.details}\n\n` +
            `Webpack resolver error missing:\n${err.missing}\n\n`;

          throw error;
        }

        loaderContext.addDependency(result);

        return super.loadFile(result, ...args);
      }

      const absoluteFilename = path.isAbsolute(result.filename)
        ? result.filename
        : path.resolve(".", result.filename);

      loaderContext.addDependency(path.normalize(absoluteFilename));

      return result;
    }
  }

  return {
    install(lessInstance, pluginManager) {
      pluginManager.addFileManager(new WebpackFileManager());
    },
    minVersion: [3, 0, 0],
  };
}

/**
 * Get the `less` options from the loader context and normalizes its values
 *
 * @param {object} loaderContext
 * @param {object} loaderOptions
 * @param {object} implementation
 * @returns {Object}
 */
function getLessOptions(loaderContext, loaderOptions, implementation) {
  const options =
    typeof loaderOptions.lessOptions === "function"
      ? loaderOptions.lessOptions(loaderContext) || {}
      : loaderOptions.lessOptions || {};

  const lessOptions = {
    plugins: [],
    relativeUrls: true,
    // We need to set the filename because otherwise our WebpackFileManager will receive an undefined path for the entry
    filename: loaderContext.resourcePath,
    ...options,
  };

  const plugins = [...lessOptions.plugins];
  const shouldUseWebpackImporter =
    typeof loaderOptions.webpackImporter === "boolean" ||
    loaderOptions.webpackImporter === "only"
      ? loaderOptions.webpackImporter
      : true;

  if (shouldUseWebpackImporter) {
    plugins.unshift(createWebpackLessPlugin(loaderContext, implementation));
  }

  plugins.unshift({
    install(lessProcessor, pluginManager) {
      pluginManager.webpackLoaderContext = loaderContext;

      lessOptions.pluginManager = pluginManager;
    },
  });

  lessOptions.plugins = plugins;

  return lessOptions;
}

function isUnsupportedUrl(url) {
  // Is Windows path
  if (IS_NATIVE_WIN32_PATH.test(url)) {
    return false;
  }

  // Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
  // Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
}

function normalizeSourceMap(map) {
  const newMap = map;

  // map.file is an optional property that provides the output filename.
  // Since we don't know the final filename in the webpack build chain yet, it makes no sense to have it.

  delete newMap.file;

  newMap.sourceRoot = "";

  // `less` returns POSIX paths, that's why we need to transform them back to native paths.

  newMap.sources = newMap.sources.map((source) => path.normalize(source));

  return newMap;
}

function getLessImplementation(loaderContext, implementation) {
  let resolvedImplementation = implementation;

  if (!implementation || typeof implementation === "string") {
    const lessImplPkg = implementation || "less";

    resolvedImplementation = require(lessImplPkg);
  }

  return resolvedImplementation;
}

function getFileExcerptIfPossible(error) {
  if (typeof error.extract === "undefined") {
    return [];
  }

  const excerpt = error.extract.slice(0, 2);
  const column = Math.max(error.column - 1, 0);

  if (typeof excerpt[0] === "undefined") {
    excerpt.shift();
  }

  excerpt.push(`${" ".repeat(column)}^`);

  return excerpt;
}

function errorFactory(error) {
  const message = [
    "\n",
    ...getFileExcerptIfPossible(error),
    error.message.charAt(0).toUpperCase() + error.message.slice(1),
    error.filename
      ? `      Error in ${path.normalize(error.filename)} (line ${
          error.line
        }, column ${error.column})`
      : "",
  ].join("\n");

  const obj = new Error(message, { cause: error });

  obj.stack = null;

  return obj;
}

export {
  errorFactory,
  getLessImplementation,
  getLessOptions,
  isUnsupportedUrl,
  normalizeSourceMap,
};
