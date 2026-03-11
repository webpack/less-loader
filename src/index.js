import path from "node:path";

import schema from "./options.json";
import {
  errorFactory,
  getLessImplementation,
  getLessOptions,
  isUnsupportedUrl,
  normalizeSourceMap,
} from "./utils";

async function lessLoader(source) {
  const options = this.getOptions(schema);
  const callback = this.async();
  let implementation;

  try {
    implementation = await getLessImplementation(this, options.implementation);
  } catch (error) {
    callback(error);

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

  const lessOptions = getLessOptions(this, options, implementation);
  const useSourceMap =
    typeof options.sourceMap === "boolean" ? options.sourceMap : this.sourceMap;

  if (useSourceMap) {
    lessOptions.sourceMap = {
      outputSourceFiles: true,
    };
  }

  let data = source;

  if (typeof options.additionalData !== "undefined") {
    data =
      typeof options.additionalData === "function"
        ? `${await options.additionalData(data, this)}`
        : `${options.additionalData}\n${data}`;
  }

  const logger = this.getLogger("less-loader");
  const loaderContext = this;
  const loggerListener = {
    error(message) {
      // TODO enable by default in the next major release
      if (options.lessLogAsWarnOrErr) {
        loaderContext.emitError(new Error(message));
      } else {
        logger.error(message);
      }
    },
    warn(message) {
      // TODO enable by default in the next major release
      if (options.lessLogAsWarnOrErr) {
        loaderContext.emitWarning(new Error(message));
      } else {
        logger.warn(message);
      }
    },
    info(message) {
      logger.log(message);
    },
    debug(message) {
      logger.debug(message);
    },
  };

  implementation.logger.addListener(loggerListener);

  let result;

  try {
    result = await implementation.render(data, lessOptions);
  } catch (error) {
    if (error.filename) {
      // `less` returns forward slashes on windows when `webpack` resolver return an absolute windows path in `WebpackFileManager`
      // Ref: https://github.com/webpack/less-loader/issues/357
      this.addDependency(path.normalize(error.filename));
    }

    callback(errorFactory(error));

    return;
  } finally {
    // Fix memory leaks in `less`
    implementation.logger.removeListener(loggerListener);

    delete lessOptions.pluginManager.webpackLoaderContext;
    delete lessOptions.pluginManager;
  }

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
    map = normalizeSourceMap(map, this.rootContext);
  }

  callback(null, css, map);
}

export default lessLoader;
