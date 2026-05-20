import path from "node:path";
import url from "node:url";

/** @typedef {import("webpack").LoaderContext<LoaderOptions>} LoaderContext */
/** @typedef {import("less")} Less */

/** @typedef {Parameters<Less["render"]>[1]} LessOptions */
/** @typedef {NonNullable<LessOptions["plugins"]>[number]} LessPlugin */
/** @typedef {Less["FileManager"]} LessFileManager */
/** @typedef {InstanceType<Less["PluginManager"]>} PluginManager */
/** @typedef {InstanceType<LessFileManager>} LessFileManagerInstance */
/** @typedef {Parameters<InstanceType<LessFileManager>["loadFile"]>[2]} LoadFileOptions */
/** @typedef {Parameters<InstanceType<LessFileManager>["loadFile"]>[3]} Environment */
/** @typedef {Awaited<ReturnType<LessFileManagerInstance["loadFile"]>>} LoadFileResult */

/**
 * @typedef {object} LoaderOptions
 * @property {LessOptions | ((loaderContext: LoaderContext) => LessOptions)=} lessOptions less options
 * @property {string | ((source: string, loaderContext: LoaderContext) => string | Promise<string>)=} additionalData additional data
 * @property {boolean=} sourceMap true when need to generate source map, otherwise false
 * @property {boolean | "only"=} webpackImporter true when need to use webpack importer, otherwise false
 * @property {string | Less=} implementation implementation
 * @property {boolean=} lessLogAsWarnOrErr true when need to log less warnings and errors as webpack warnings and errors
 */

/**
 * @typedef {object} SourceMap
 * @property {string=} file file
 * @property {string=} sourceRoot source root
 * @property {string[]} sources sources
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
 * @param {LoaderContext} loaderContext loader context
 * @param {Less} implementation implementation
 * @param {Promise<void>[]} pendingDependencyTasks pending dependency tasks
 * @returns {LessPlugin} less plugin
 */
function createWebpackLessPlugin(
  loaderContext,
  implementation,
  pendingDependencyTasks,
) {
  const lessOptions =
    /** @type {LoaderOptions} */
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
     * @param {string} filename filename
     * @returns {boolean} true when filename is supported, otherwise false
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
     * @returns {boolean} true when support sync, otherwise false
     */
    supportsSync() {
      return true;
    }

    /**
     * @param {string} filename filename
     * @param {string} currentDirectory current directory
     * @param {LoadFileOptions} options options
     * @param {Environment} environment environment
     * @returns {LoadFileResult} loaded file
     */
    loadFileSync(filename, currentDirectory, options, environment) {
      // The default Less `loadFileSync` internally dispatches to
      // `this.loadFile` with `options.syncImport = true`. Because we
      // override `loadFile` (async), dynamic dispatch would land back in
      // our async version and break the sync contract. Invoke the parent
      // `loadFile` directly with the sync flag instead.
      // @ts-expect-error bad types in less
      const result = /** @type {LoadFileResult} */ (
        super.loadFile(
          filename,
          currentDirectory,
          { ...options, syncImport: true },
          environment,
        )
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
     * @param {string} filename filename
     * @param {string} currentDirectory current directory
     * @returns {Promise<string>} resolved filename
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
     * @param {string} context context
     * @param {string[]} possibleRequests possible requests
     * @returns {Promise<string>} resolved requests
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
     * @param {string} filename filename
     * @param {string} currentDirectory current directory
     * @param {LoadFileOptions} options options
     * @param {Environment} environment environment
     * @returns {Promise<LoadFileResult>} loaded file
     */
    async loadFile(filename, currentDirectory, options, environment) {
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

        result = await super.loadFile(
          filename,
          currentDirectory,
          options,
          environment,
        );
      } catch (error) {
        const lessError = /** @type {LessError} */ (error);

        if (lessError.type !== "File" && lessError.type !== "Next") {
          throw error;
        }

        try {
          result = await this.resolveFilename(filename, currentDirectory);
        } catch (err) {
          lessError.message =
            `Less resolver error:\n${lessError.message}\n\n` +
            `Webpack resolver error details:\n${/** @type {{ details: string }} */ (err).details}\n\n` +
            `Webpack resolver error missing:\n${/** @type {{ missing: string }} */ (err).missing}\n\n`;

          throw error;
        }

        loaderContext.addDependency(result);

        return super.loadFile(result, currentDirectory, options, environment);
      }

      const absoluteFilename = path.isAbsolute(result.filename)
        ? result.filename
        : path.resolve(".", result.filename);

      loaderContext.addDependency(path.normalize(absoluteFilename));

      return result;
    }
  }

  return {
    /**
     * @param {Less} less less
     * @param {PluginManager} pluginManager plugin manager
     */
    install(less, pluginManager) {
      pluginManager.addFileManager(new WebpackFileManager());
    },
    minVersion: [3, 0, 0],
  };
}

/**
 * Get the `less` options from the loader context and normalizes its values
 * @param {LoaderContext} loaderContext loader context
 * @param {LoaderOptions} loaderOptions loader options
 * @param {Less} implementation implementation
 * @returns {{ lessOptions: LessOptions, pendingDependencyTasks: Promise<void>[] }} implementation and pending tasks
 */
function getLessOptions(loaderContext, loaderOptions, implementation) {
  const options =
    typeof loaderOptions.lessOptions === "function"
      ? loaderOptions.lessOptions(loaderContext) || {}
      : loaderOptions.lessOptions || {};

  /** @type {LessOptions} */
  const lessOptions = {
    // @ts-expect-error bad types
    relativeUrls: true,
    // We need to set the filename because otherwise our WebpackFileManager will receive an undefined path for the entry
    filename: loaderContext.resourcePath,
    ...options,
  };

  // Collects async dependency-resolution promises kicked off from
  // synchronous Less file loads (e.g. `data-uri()`, `@plugin`). The loader
  // awaits these before completing so webpack's dependency snapshot is
  // accurate.
  /** @type {Promise<void>[]} */
  const pendingDependencyTasks = [];

  /** @type {LessPlugin[]} */
  const plugins = [...(lessOptions.plugins || [])];
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
    /**
     * @param {Less} less less
     * @param {PluginManager} pluginManager plugin manager
     */
    install(less, pluginManager) {
      // @ts-expect-error to provide loader context into plugin
      pluginManager.webpackLoaderContext = loaderContext;
      // @ts-expect-error to reset it after execution
      lessOptions.pluginManager = pluginManager;
    },
  });

  lessOptions.plugins = plugins;

  return { lessOptions, pendingDependencyTasks };
}

/**
 * @param {string} url url
 * @returns {boolean} true when url is unsupported, otherwise false
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
 * @param {SourceMap} map map
 * @returns {SourceMap} normalized source map
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
 * @param {string} specifier specifier
 * @returns {string} resolved specifier
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
 * @param {LoaderContext} loaderContext loader context
 * @param {string | Less | undefined} implementation implementation
 * @returns {Promise<Less>} less implementation
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
 * @param {LessError} error error
 * @returns {string[]} file excerpt
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
 * @param {LessError} error error
 * @returns {Error} built error
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

  // @ts-expect-error avoid extra stack for less
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
