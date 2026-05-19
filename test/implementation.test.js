import {
  compile,
  getCodeFromBundle,
  getCodeFromLess,
  getCompiler,
  getErrors,
  getWarnings,
} from "./helpers";

describe('"implementation" option', () => {
  it("should work", async () => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId, {
      implementation: require("less"),
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should work when implementation option is string", async () => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId, {
      implementation: require.resolve("less"),
    });
    const stats = await compile(compiler);
    const codeFromBundle = getCodeFromBundle(stats, compiler);
    const codeFromLess = await getCodeFromLess(testId);

    expect(codeFromBundle.css).toBe(codeFromLess.css);
    expect(codeFromBundle.css).toMatchSnapshot("css");
    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should throw error when unresolved package", async () => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId, {
      implementation: "unresolved",
    });
    const stats = await compile(compiler);

    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });

  it("should throw error when implementation has error", async () => {
    const testId = "./basic.less";
    const compiler = getCompiler(testId, {
      implementation: require.resolve("./fixtures/implementation-error.js"),
    });
    const stats = await compile(compiler);

    expect(getWarnings(stats)).toMatchSnapshot("warnings");
    expect(getErrors(stats)).toMatchSnapshot("errors");
  });
});
