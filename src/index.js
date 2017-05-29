'use strict';

import compareFunc from 'compare-func';
import findConfig from 'find-config';
import Q from 'q';
import {resolve} from 'path';
import gufg from 'github-url-from-git';

const readFile = Q.denodeify(require('fs').readFile);

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

function readPackage() {
  try {
    return findConfig.require('package.json', {home: false});
  } catch (err) {
    /* istanbul ignore next */
    return {};
  }
}

function issueUrl() {
  const pkgJson = readPackage();

  /* istanbul ignore else  */
  if (pkgJson.bugs && pkgJson.bugs.url) {
    return pkgJson.bugs.url;
  } else if (pkgJson.repository && pkgJson.repository.url && ~pkgJson.repository.url.indexOf('github.com')) {
    let gitUrl = gufg(pkgJson.repository.url);

    // GitHub
    if (gitUrl) {
      return gitUrl + '/issues/';
    }
  }
}

function presetOpts(cb) {
  const writerOpts = {
    transform: (commit) => {
      let discard = true;
      let issues = [];

      commit.notes.forEach((note) => {
        note.title = 'BREAKING CHANGES';
        discard = false;
      });

      if (commit.type === 'feat') {
        commit.type = 'Features';
      } else if (commit.type === 'fix') {
        commit.type = 'Bug Fixes';
      } else if (commit.type === 'perf') {
        commit.type = 'Performance Improvements';
      } else if (commit.type === 'revert') {
        commit.type = 'Reverts';
      } else if (discard) {
        return;
      } else if (commit.type === 'docs') {
        commit.type = 'Documentation';
      } else if (commit.type === 'style') {
        commit.type = 'Styles';
      } else if (commit.type === 'refactor') {
        commit.type = 'Code Refactoring';
      } else if (commit.type === 'test') {
        commit.type = 'Tests';
      } else if (commit.type === 'chore') {
        commit.type = 'Chores';
      } else if (commit.type === 'build') {
        commit.type = 'Build';
      } else if (commit.type === 'ci') {
        commit.type = 'Continuous Integration';
      }

      if (commit.scope === '*') {
        commit.scope = '';
      }

      if (typeof commit.hash === 'string') {
        commit.hash = commit.hash.substring(0, 7);
      }

      if (typeof commit.subject === 'string') {
        let url = issueUrl();
        // Issue URLs.
        if (url) {
          commit.subject = commit.subject.replace(/#([0-9]+)/g, (_, issue) => {
            issues.push(issue);
            return '[#' + issue + '](' + url + issue + ')';
          });
        }
        // GitHub user URLs.
        commit.subject = commit.subject.replace(/@([a-zA-Z0-9_]+)/g, '[@$1](https://github.com/$1)');
      }

      // remove references that already appear in the subject
      commit.references = commit.references.filter((reference) => {
        return issues.indexOf(reference.issue) === -1;
      });

      return commit;
    },
    groupBy: 'type',
    commitGroupsSort: 'title',
    commitsSort: ['scope', 'subject'],
    noteGroupsSort: 'title',
    notesSort: compareFunc
  };

  Q.all([
    readFile(resolve(__dirname, 'templates/template.hbs'), 'utf-8'),
    readFile(resolve(__dirname, 'templates/header.hbs'), 'utf-8'),
    readFile(resolve(__dirname, 'templates/commit.hbs'), 'utf-8'),
    readFile(resolve(__dirname, 'templates/footer.hbs'), 'utf-8')
  ])
    .spread((template, header, commit, footer) => {

      writerOpts.mainTemplate = template;
      writerOpts.headerPartial = header;
      writerOpts.commitPartial = commit;
      writerOpts.footerPartial = footer;

      cb(null, {
        parserOpts: parserOpts,
        writerOpts: writerOpts
      });
    });
}

module.exports = presetOpts;
