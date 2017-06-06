'use strict';

import { resolve } from 'path';
import compareFunc from 'compare-func';
import changelogrcConfig from './lib/changelogrc-config';
import transformFn from './lib/transform-fn';
import Q from 'q';
import { readFile } from 'fs';
const qReadFile = Q.denodeify(readFile);

module.exports = Promise.all([
  changelogrcConfig()
]).then(args => Q.all([
  qReadFile(resolve(__dirname, 'templates/template.hbs'), 'utf-8'),
  qReadFile(resolve(__dirname, 'templates/header.hbs'), 'utf-8'),
  qReadFile(resolve(__dirname, 'templates/commit.hbs'), 'utf-8'),
  qReadFile(resolve(__dirname, 'templates/footer.hbs'), 'utf-8')
])
  .spread(function (template, header, commit, footer) {
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
