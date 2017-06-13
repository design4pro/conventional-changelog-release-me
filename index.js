'use strict';

var compareFunc = require('compare-func');
var Q = require('q');
var readFile = Q.denodeify(require('fs').readFile);
var resolve = require('path').resolve;
var changelogrcConfig = require('./lib/changelogrc-config');
var transformFn = require('./lib/transform-fn');

module.exports = Promise.resolve(changelogrcConfig()).then(function (config) {
  return Q.all([
    readFile(resolve(__dirname, 'templates/template.hbs'), 'utf-8'),
    readFile(resolve(__dirname, 'templates/header.hbs'), 'utf-8'),
    readFile(resolve(__dirname, 'templates/commit.hbs'), 'utf-8'),
    readFile(resolve(__dirname, 'templates/footer.hbs'), 'utf-8')
  ]).spread(function (template, header, commit, footer) {
    var parserOpts = {
      headerPattern: /^(\w*)(?:\((.*)\))?\: (.*)$/,
      headerCorrespondence: [
        'type',
        'scope',
        'subject'
      ],
      noteKeywords: ['BREAKING CHANGE', 'BREAKING CHANGES'],
      revertPattern: /^revert:\s([\s\S]*?)\s*This reverts commit (\w*)\./,
      revertCorrespondence: ['header', 'hash']
    };

    var writerOpts = {
      mainTemplate: template,
      headerPartial: header,
      commitPartial: commit,
      footerPartial: footer,
      transform: transformFn(config)
    };

    return {
      parserOpts: parserOpts,
      writerOpts: writerOpts,
      groupBy: 'type',
      commitGroupsSort: compareFunc(['position', 'title']),
      commitsSort: compareFunc(['scope', 'subject']),
      noteGroupsSort: 'title',
      notesSort: compareFunc
    };
  });
});
