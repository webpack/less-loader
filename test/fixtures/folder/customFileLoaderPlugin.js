import path from "path";
import less from "less";

class Plugin extends less.FileManager {
  supports(filename) {
    if (filename === 'forFileLoaderPluginResolve.less') {
      return true;
    }
    
    if (filename === "https://fonts.googleapis.com/css?family=Roboto:500") {
      return true;
    }

    return false;
  }

  loadFile(filename, ...args) {
    let result;
    
    if (filename === 'forFileLoaderPluginResolve.less') {
      result = path.resolve(__dirname, '../', 'file-load-replacement.less');
    } else if (filename === "https://fonts.googleapis.com/css?family=Roboto:500") {
      result = path.resolve(__dirname, '../', 'mock-fonts.less');
    }

    return super.loadFile(result, ...args);
  };
}

class CustomFileLoaderPlugin {
  install(less, pluginManager) {
    pluginManager.addFileManager(new Plugin());
  }
}

module.exports = CustomFileLoaderPlugin;
