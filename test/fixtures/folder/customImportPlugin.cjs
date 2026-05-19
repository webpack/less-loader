class PluginPreProcessor {
  process() {
    return '.imported-class {color: coral;}'
  }
}

class CustomImportPlugin {
  install(less, pluginManager) {
    pluginManager.addPreProcessor(new PluginPreProcessor());
  }
}

module.exports = CustomImportPlugin;
