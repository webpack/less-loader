import path from "node:path";
import url from "node:url";

/** @typedef {import("webpack").LoaderContext<LessLoaderOptions>} LoaderContext */
/** @typedef {import("less")} Less */
/** @typedef {Less["FileManager"]} LessFileManager */
/** @typedef {InstanceType<LessFileManager>} LessFileManagerInstance */
/** @typedef {Parameters<LessFileManagerInstance["loadFile"]>} LoadFileArgs */
/** @typedef {Awaited<ReturnType<LessFileManagerInstance["loadFile"]>>} LoadFileResult */

/**
 * @typedef {object} LessPluginManager
 * @property {(fileManager: LessFileManagerInstance) => void} addFileManager
 * @property {LoaderContext} [webpackLoaderContext]
 */

/**
 * @typedef {object} LessPlugin
 * @property {(lessInstance: Less, pluginManager: LessPluginManager) => void} install
 * @property {[number, number, number]} [minVersion]
 */

/**
 * @typedef {object} LessOptions
 * @property {LessPlugin[]} plugins
 * @property {boolean} [relativeUrls]
 * @property {string} [filename]
 * @property {LessPluginManager} [pluginManager]
 * @property {{ sourceMapBasepath: string, outputSourceFiles: boolean, disableSourcemapAnnotation: boolean }} [sourceMap]
 */

/**
 * @typedef {object} LessLoaderOptions
 * @property {LessOptions | ((loaderContext: LoaderContext) => LessOptions)} [lessOptions]
 * @property {string | ((source: string, loaderContext: LoaderContext) => string | Promise<string>)} [additionalData]
 * @property {boolean} [sourceMap]
 * @property {boolean | "only"} [webpackImporter]
 * @property {string | Less} [implementation]
 * @property {boolean} [lessLogAsWarnOrErr]
 */

/**
 * @typedef {object} SourceMap
 * @property {string} [file]
 * @property {string} [sourceRoot]
 * @property {string[]} sources
 */

/**
 * @typedef {Error & { type?: string, filename?: string, line?: number, column?: number, extract?: string[] }} LessError
 */

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
 * @param {Less} implementation
 * @param {Array<Promise<void>>} pendingDependencyTasks
 * @returns {LessPlugin}
 */
function createWebpackLessPlugin(
  loaderContext,
  implementation,
  pendingDependencyTasks,
) {
  const lessOptions =
    /** @type {LessLoaderOptions} */
    (loaderContext.getOptions());
  const resolve = loaderContext.getResolve({
    dependencyType: "less",
    conditionNames: ["less", "style", "..."],
    mainFields: ["less", "style", "main", "..."],
    mainFiles: ["index", "..."],
    extensions: [".less", ".css"],
    preferRelative: true,
  });

  class WebpackFileManager extends implementation.FileManager {
    /**
     * @param {string} filename
     * @returns {boolean}
     */
    supports(filename) {
      if (filename[0] === "/" || IS_NATIVE_WIN32_PATH.test(filename)) {
        return true;
      }

      if (this.isPathAbsolute(filename)) {
        return false;
      }

      return true;
    }

    // Sync loading is used by `data-uri()` and any custom Less function
    // (including those installed via `@plugin`). Webpack doesn't expose a
    // sync resolver, so we fulfil the sync read by delegating to Less's
    // default file manager (which can only handle native filesystem paths)
    // and, in parallel, kick off an async webpack resolve so the loaded
    // file is tracked as a webpack file dependency. Without this, webpack's
    // persistent cache won't invalidate when a sync-loaded file changes.
    // See https://github.com/webpack/less-loader/issues/492.
    /**
     * @returns {boolean}
     */
    supportsSync() {
      return true;
    }

    /**
     * @param {string} filename
     * @param {string} currentDirectory
     * @param {{ [key: string]: unknown }} options
     * @param {unknown} environment
     * @returns {LoadFileResult}
     */
    loadFileSync(filename, currentDirectory, options, environment) {
      // The default Less `loadFileSync` internally dispatches to
      // `this.loadFile` with `options.syncImport = true`. Because we
      // override `loadFile` (async), dynamic dispatch would land back in
      // our async version and break the sync contract. Invoke the parent
      // `loadFile` directly with the sync flag instead.
      const result = super.loadFile(
        filename,
        currentDirectory,
        { ...options, syncImport: true },
        environment,
      );

      if (result && result.filename) {
        loaderContext.addDependency(
          path.normalize(
            path.isAbsolute(result.filename)
              ? result.filename
              : path.resolve(currentDirectory || ".", result.filename),
          ),
        );
      }

      // Also try to resolve via webpack so aliases / custom resolvers can
      // contribute dependencies. The resolved content is discarded - we
      // only need the file path to track as a dependency.
      pendingDependencyTasks.push(
        this.resolveFilename(filename, currentDirectory)
          .then((resolved) => {
            const absoluteFilename = path.isAbsolute(resolved)
              ? resolved
              : path.resolve(".", resolved);

            loaderContext.addDependency(path.normalize(absoluteFilename));
          })
          .catch(() => {
            // Webpack may legitimately fail to resolve paths that Less's
            // default sync manager handled (e.g. node-style relative
            // lookups). The sync result above is what Less consumes, so
            // ignore the async failure.
          }),
      );

      return result;
    }

    /**
     * @param {string} filename
     * @param {string} currentDirectory
     * @returns {Promise<string>}
     */
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

    /**
     * @param {string} context
     * @param {string[]} possibleRequests
     * @returns {Promise<string>}
     */
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

    /**
     * @param {string} filename
     * @param {LoadFileArgs} args
     * @returns {Promise<LoadFileResult>}
     */
    async loadFile(filename, ...args) {
      let result;

      try {
        if (
          IS_SPECIAL_MODULE_IMPORT.test(filename) ||
          lessOptions.webpackImporter === "only"
        ) {
          const error = /** @type {LessError} */ (new Error("Next"));

          error.type = "Next";

          throw error;
        }

        result = await super.loadFile(filename, ...args);
      } catch (error) {
        const lessError = /** @type {LessError} */ (error);

        if (lessError.type !== "File" && lessError.type !== "Next") {
          throw error;
        }

        try {
          result = await this.resolveFilename(filename, ...args);
        } catch (err) {
          lessError.message =
            `Less resolver error:\n${lessError.message}\n\n` +
            `Webpack resolver error details:\n${/** @type {{ details: string }} */ (err).details}\n\n` +
            `Webpack resolver error missing:\n${/** @type {{ missing: string }} */ (err).missing}\n\n`;

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
 * @param {LoaderContext} loaderContext
 * @param {LessLoaderOptions} loaderOptions
 * @param {Less} implementation
 * @returns {{ lessOptions: LessOptions, pendingDependencyTasks: Array<Promise<void>> }}
 */
function getLessOptions(loaderContext, loaderOptions, implementation) {
  const options =
    typeof loaderOptions.lessOptions === "function"
      ? loaderOptions.lessOptions(loaderContext) || {}
      : loaderOptions.lessOptions || {};

  /** @type {LessOptions} */
  const lessOptions = {
    plugins: [],
    relativeUrls: true,
    // We need to set the filename because otherwise our WebpackFileManager will receive an undefined path for the entry
    filename: loaderContext.resourcePath,
    ...options,
  };

  // Collects async dependency-resolution promises kicked off from
  // synchronous Less file loads (e.g. `data-uri()`, `@plugin`). The loader
  // awaits these before completing so webpack's dependency snapshot is
  // accurate.
  /** @type {Array<Promise<void>>} */
  const pendingDependencyTasks = [];

  const plugins = [...lessOptions.plugins];
  const shouldUseWebpackImporter =
    typeof loaderOptions.webpackImporter === "boolean" ||
    loaderOptions.webpackImporter === "only"
      ? loaderOptions.webpackImporter
      : true;

  if (shouldUseWebpackImporter) {
    plugins.unshift(
      createWebpackLessPlugin(
        loaderContext,
        implementation,
        pendingDependencyTasks,
      ),
    );
  }

  plugins.unshift({
    install(lessProcessor, pluginManager) {
      pluginManager.webpackLoaderContext = loaderContext;

      lessOptions.pluginManager = pluginManager;
    },
  });

  lessOptions.plugins = plugins;

  return { lessOptions, pendingDependencyTasks };
}

/**
 * @param {string} url
 * @returns {boolean}
 */
function isUnsupportedUrl(url) {
  // Is Windows path
  if (IS_NATIVE_WIN32_PATH.test(url)) {
    return false;
  }

  // Scheme: https://tools.ietf.org/html/rfc3986#section-3.1
  // Absolute URL: https://tools.ietf.org/html/rfc3986#section-4.3
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url);
}

/**
 * @param {SourceMap} map
 * @returns {SourceMap}
 */
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

/**
 * @param {string} specifier
 * @returns {string}
 */
function normalizeImportSpecifier(specifier) {
  if (specifier.startsWith("file:")) {
    return specifier;
  }

  if (path.isAbsolute(specifier)) {
    return url.pathToFileURL(specifier).href;
  }

  return specifier;
}

/**
 * @param {LoaderContext} loaderContext
 * @param {string | Less | undefined} implementation
 * @returns {Promise<Less>}
 */
async function getLessImplementation(loaderContext, implementation) {
  let resolvedImplementation = implementation;

  if (!implementation || typeof implementation === "string") {
    const lessImplPkg = implementation || "less";
    const imported = await import(normalizeImportSpecifier(lessImplPkg));

    resolvedImplementation = imported.default ?? imported;
  }

  return /** @type {Less} */ (resolvedImplementation);
}

/**
 * @param {LessError} error
 * @returns {string[]}
 */
function getFileExcerptIfPossible(error) {
  if (typeof error.extract === "undefined") {
    return [];
  }

  const excerpt = error.extract.slice(0, 2);
  const column = Math.max(/** @type {number} */ (error.column) - 1, 0);

  if (typeof excerpt[0] === "undefined") {
    excerpt.shift();
  }

  excerpt.push(`${" ".repeat(column)}^`);

  return excerpt;
}

/**
 * @param {LessError} error
 * @returns {Error}
 */
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

  const obj = /** @type {Error & { stack: string | null }} */ (
    new Error(message, { cause: error })
  );

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
