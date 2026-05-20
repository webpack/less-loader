if (typeof registerPlugin !== "undefined") {
  registerPlugin({
    install: function(less, pluginManager, functions) {
      functions.add('run', function() {
        if (typeof less.webpackLoaderContext !== 'undefined') {
          return 'true';
        }

        return 'false';
      });
    }
  })
}


