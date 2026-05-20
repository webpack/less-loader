export default lessLoader;
export type LoaderContext = import("webpack").LoaderContext<LoaderOptions>;
export type Schema = import("schema-utils/declarations/validate").Schema;
export type LoaderOptions = import("./utils.js").LoaderOptions;
export type LessError = import("./utils.js").LessError;
export type SourceMap = import("./utils.js").SourceMap;
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
declare function lessLoader(
  this: import("webpack").LoaderContext<import("./utils.js").LoaderOptions>,
  content: string,
): Promise<void>;
