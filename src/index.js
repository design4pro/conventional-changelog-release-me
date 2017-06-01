'use strict';

const extend = require('extend');
const angularChangelogPromise = require('conventional-changelog-angular');
const lib = require('./lib');

module.exports = extend(true, {}, angularChangelogPromise, {
  writerOpts: {
    transform: lib.transformFn(lib.changelogrcConfig())
  }
});
