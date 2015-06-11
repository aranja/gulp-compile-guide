var consolidate = require('consolidate');
var frontMatter = require('front-matter');
var gulpUtil = require('gulp-util');
var highlight = require('highlight.js');
var humanize = require('string-humanize');
var marked = require('marked');
var path = require('path');
var slug = require('slug');
var through = require('through2');
var PluginError = gulpUtil.PluginError;

// Prepare markdown renderer
marked.setOptions({
  highlight: function (code) {
    return highlight.highlightAuto(code).value;
  },
  renderer: (function() {
    var renderer = new marked.Renderer({
      highlight: true
    });
    var baseCode = renderer.code;
    renderer.code = function(code, language) {
      return '<section class="guide-demo">' + code + '</section>' +
        baseCode.apply(renderer, [code, language]);
    };
    return renderer;
  })()
});

module.exports = compileGuide;
function compileGuide(opts) {
  // Process options
  opts = opts || {};
  opts.defaultPage = opts.defaultPage || 'Styleguide';
  opts.indexPage = opts.indexPage || opts.defaultPage;

  // Built assets
  var components = [];
  var pages = [];

  function updatePage(component) {
    // Try and find already created page.
    var page = pages.filter(function(p) { return p.title === component.page; })[0];

    if (!page) {
      // Page not found, create it!
      var url = 'index.html';
      if (component.page !== opts.indexPage) {
        url = slug(component.page, {lower: true}) + '.html';
      }

      page = {
        components: [],
        index: component.page === opts.indexPage,
        title: component.page,
        url: url
      };
      console.log(page);
      pages.push(page);
    }

    // Update it.
    page.components.push(component);
  }

  return through.obj(function(file, enc, callback) {
    if (file.isStream()) {
      return callback(new PluginError('gulp-compile-guide', 'Streaming not supported'));
    }

    // Extract yaml front matter for component metadata
    var content = frontMatter(file.contents.toString());

    // Build component metadata with default values
    var component = content.attributes;
    component.path = file.path;
    component.name = component.name || path.basename(path.dirname(file.path));
    component.title = component.title || humanize(component.name);
    component.html = marked(content.body);
    component.page = component.page || opts.defaultPage;

    // Store it
    updatePage(component);
    callback();
  }, function(callback) {
    var that = this;

    function nextPage(i) {
      if (i === pages.length) return callback();

      var page = pages[i];
      var context = {
        components: page.components,
        currentPage: page,
        pages: pages
      };
      consolidate.jade(opts.layout, context, function(err, html) {
        if (err) {
          return callback(new PluginError('gulp-compile-guide', err));
        }

        that.push(new gulpUtil.File({
          base: path.dirname(opts.layout),
          contents: new Buffer(html),
          path: path.join(path.dirname(opts.layout), page.url)
        }));

        nextPage(i + 1);
      })
    }
    nextPage(0);
  });
}
