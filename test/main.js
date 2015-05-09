var compileGuide = require('../');
var should = require('should');
var gulp = require('gulp');
require('mocha');

describe('gulp-compile-guide', function() {
  describe('compileGuide()', function() {
    it('should throw, when arguments is missing', function () {
      (function() {
        compileGuide();
      }).should.throw('Missing layout option for gulp-compile-guide');
    });
  });
});
