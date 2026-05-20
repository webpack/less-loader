export type LoaderContext = import("webpack").LoaderContext<LoaderOptions>;
export type Less = LessStatic;
export type LessOptions = Parameters<Less["render"]>[1];
export type LessPlugin = NonNullable<LessOptions["plugins"]>[number];
export type LessFileManager = Less["FileManager"];
export type PluginManager = InstanceType<Less["PluginManager"]>;
export type LessFileManagerInstance = InstanceType<LessFileManager>;
export type LoadFileOptions = Parameters<
  InstanceType<LessFileManager>["loadFile"]
>[2];
export type Environment = Parameters<
  InstanceType<LessFileManager>["loadFile"]
>[3];
export type LoadFileResult = Awaited<
  ReturnType<LessFileManagerInstance["loadFile"]>
>;
export type LoaderOptions = {
  /**
   * less options
   */
  lessOptions?:
    | (LessOptions | ((loaderContext: LoaderContext) => LessOptions))
    | undefined;
  /**
   * additional data
   */
  additionalData?:
    | (
        | string
        | ((
            source: string,
            loaderContext: LoaderContext,
          ) => string | Promise<string>)
      )
    | undefined;
  /**
   * true when need to generate source map, otherwise false
   */
  sourceMap?: boolean | undefined;
  /**
   * true when need to use webpack importer, otherwise false
   */
  webpackImporter?: (boolean | "only") | undefined;
  /**
   * implementation
   */
  implementation?: (string | Less) | undefined;
  /**
   * true when need to log less warnings and errors as webpack warnings and errors
   */
  lessLogAsWarnOrErr?: boolean | undefined;
};
export type SourceMap = {
  /**
   * file
   */
  file?: string | undefined;
  /**
   * source root
   */
  sourceRoot?: string | undefined;
  /**
   * sources
   */
  sources: string[];
};
export type LessError = Error & {
  type?: string;
  filename?: string;
  line?: number;
  column?: number;
  extract?: string[];
};
/**
 * @param {LessError} error error
 * @returns {Error} built error
 */
export function errorFactory(error: LessError): Error;
/**
 * @param {LoaderContext} loaderContext loader context
 * @param {string | Less | undefined} implementation implementation
 * @returns {Promise<Less>} less implementation
 */
export function getLessImplementation(
  loaderContext: LoaderContext,
  implementation: string | Less | undefined,
): Promise<Less>;
/**
 * Get the `less` options from the loader context and normalizes its values
 * @param {LoaderContext} loaderContext loader context
 * @param {LoaderOptions} loaderOptions loader options
 * @param {Less} implementation implementation
 * @returns {{ lessOptions: LessOptions, pendingDependencyTasks: Promise<void>[] }} implementation and pending tasks
 */
export function getLessOptions(
  loaderContext: LoaderContext,
  loaderOptions: LoaderOptions,
  implementation: Less,
): {
  lessOptions: LessOptions;
  pendingDependencyTasks: Promise<void>[];
};
/**
 * @param {string} url url
 * @returns {boolean} true when url is unsupported, otherwise false
 */
export function isUnsupportedUrl(url: string): boolean;
/**
 * @param {SourceMap} map map
 * @returns {SourceMap} normalized source map
 */
export function normalizeSourceMap(map: SourceMap): SourceMap;
