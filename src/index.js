import path from "node:path";

import schema from "./options.json" with { type: "json" };
import {
  errorFactory,
  getLessImplementation,
  getLessOptions,
  isUnsupportedUrl,
  normalizeSourceMap,
} from "./utils.js";

/** @typedef {import("webpack").LoaderContext<LoaderOptions>} LoaderContext */
/** @typedef {import("schema-utils/declarations/validate").Schema} Schema */
/** @typedef {import("./utils.js").LoaderOptions} LoaderOptions */
/** @typedef {import("./utils.js").LessError} LessError */
/** @typedef {import("./utils.js").SourceMap} SourceMap */

/**
 * Webpack loader that compiles Less to CSS.
 * @this {LoaderContext}
 * @param {string} content content
 * @returns {Promise<void>} loader result
 */
async function lessLoader(content) {
  const options = this.getOptions(/** @type {Schema} */ (schema));
  const callback = this.async();
  let implementation;

  try {
    implementation = await getLessImplementation(this, options.implementation);
  } catch (error) {
    callback(/** @type {Error} */ (error));

    return;
  }

  if (!implementation) {
    callback(
      new Error(
        `The Less implementation "${options.implementation}" not found`,
      ),
    );

    return;
  }

  const { lessOptions, pendingDependencyTasks } = getLessOptions(
    this,
    options,
    implementation,
  );
  const useSourceMap =
    typeof options.sourceMap === "boolean" ? options.sourceMap : this.sourceMap;

  if (useSourceMap) {
    lessOptions.sourceMap = {
      sourceMapBasepath: "",
      outputSourceFiles: true,
      // @ts-expect-error bad types
      disableSourcemapAnnotation: true,
    };
  }

  let data = content;

  if (typeof options.additionalData !== "undefined") {
    data =
      typeof options.additionalData === "function"
        ? `${await options.additionalData(data, this)}`
        : `${options.additionalData}\n${data}`;
  }

  const logger = this.getLogger("less-loader");
  const loaderContext = this;
  const loggerListener = {
    /** @param {string} message message */
    error(message) {
      // TODO enable by default in the next major release
      if (options.lessLogAsWarnOrErr) {
        loaderContext.emitError(new Error(message));
      } else {
        logger.error(message);
      }
    },
    /** @param {string} message message */
    warn(message) {
      // TODO enable by default in the next major release
      if (options.lessLogAsWarnOrErr) {
        loaderContext.emitWarning(new Error(message));
      } else {
        logger.warn(message);
      }
    },
    /** @param {string} message message */
    info(message) {
      logger.log(message);
    },
    /** @param {string} message message */
    debug(message) {
      logger.debug(message);
    },
  };

  // @ts-expect-error bad types
  implementation.logger.addListener(loggerListener);

  let result;

  try {
    result = await implementation.render(data, lessOptions);
  } catch (error) {
    const lessError = /** @type {LessError} */ (error);

    if (lessError.filename) {
      // `less` returns forward slashes on windows when `webpack` resolver return an absolute windows path in `WebpackFileManager`
      // Ref: https://github.com/webpack/less-loader/issues/357
      this.addDependency(path.normalize(lessError.filename));
    }

    // Wait for any pending sync-load dependency tracking so the failed
    // build still snapshots the files it touched.
    await Promise.all(pendingDependencyTasks);

    callback(errorFactory(lessError));

    return;
  } finally {
    // Fix memory leaks in `less`
    // @ts-expect-error bad types
    implementation.logger.removeListener(loggerListener);

    // @ts-expect-error we need it to reset loader context
    delete lessOptions.pluginManager.webpackLoaderContext;
    // @ts-expect-error we need it to reset loader context
    delete lessOptions.pluginManager;
  }

  // Ensure dependencies for any synchronously loaded resources (e.g.
  // `data-uri()`, `@plugin`) are tracked before the loader completes.
  await Promise.all(pendingDependencyTasks);

  const { css, imports } = result;

  for (const item of imports) {
    if (isUnsupportedUrl(item)) {
      continue;
    }

    // `less` return forward slashes on windows when `webpack` resolver return an absolute windows path in `WebpackFileManager`
    // Ref: https://github.com/webpack/less-loader/issues/357
    const normalizedItem = path.normalize(item);

    // Custom `importer` can return only `contents` so item will be relative
    if (path.isAbsolute(normalizedItem)) {
      this.addDependency(normalizedItem);
    }
  }

  let map =
    typeof result.map === "string" ? JSON.parse(result.map) : result.map;

  if (map && useSourceMap) {
    map = normalizeSourceMap(map);
  }

  callback(null, css, map);
}

export default lessLoader;
