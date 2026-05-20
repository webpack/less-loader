/**
 * @param {string} str str
 * @returns {string} str without cwd
 */
function removeCWD(str) {
  const isWin = process.platform === "win32";
  let cwd = process.cwd();

  if (isWin) {
    str = str.replaceAll("\\", "/");

    cwd = cwd.replaceAll("\\", "/");
  }

  return str
    .replace(/\(from .*?\)/, "(from `replaced original path`)")
    .replaceAll(new RegExp(cwd, "g"), "");
}

export default (errors) =>
  errors.map((error) =>
    removeCWD(error.toString().split("\n").slice(0, 2).join("\n")),
  );
