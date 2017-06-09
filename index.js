'use strict';

const compareFunc = require('compare-func');
const Q = require('q');
const readFile = Q.denodeify(require('fs').readFile);
const resolve = require('path').resolve;

const changelogrcConfig = require('./lib/changelogrc-config');
const transformFn = require('./lib/transform-fn');

module.exports = Promise.all([
  changelogrcConfig()
]).then(args => Q.all([
  readFile(resolve(__dirname, 'templates/template.hbs'), 'utf-8'),
  readFile(resolve(__dirname, 'templates/header.hbs'), 'utf-8'),
  readFile(resolve(__dirname, 'templates/commit.hbs'), 'utf-8'),
  readFile(resolve(__dirname, 'templates/footer.hbs'), 'utf-8')
])
  .spread((template, header, commit, footer) => {
    const parserOpts = {
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

    let writerOpts = {
      mainTemplate: template,
      headerPartial: header,
      commitPartial: commit,
      footerPartial: footer,
      transform: transformFn(args[0])
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
  }));
