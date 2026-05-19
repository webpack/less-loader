"use strict";

function testLoader(content, sourceMap) {
  const result = { css: content };

  if (sourceMap) {
    result.map = sourceMap;
  }

  return `export default ${JSON.stringify(result)}`;
}

module.exports = testLoader;
