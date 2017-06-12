'use strict';

const extend = require('extend');
const path = require('path');
const gufg = require('github-url-from-git');
const defaultConfig = require('./../default-config');

let log = require('winston');
let pkgJson = {};
try {
  pkgJson = require(path.resolve(
    process.cwd(),
    './package.json'
  ));
} catch (err) {
  /* istanbul ignore next */
  log.warn('no root package.json found');
}

function transformFn(someConfig) {
  let config = extend(true, {}, defaultConfig, someConfig);
  let url = issueUrl();
  let issues = [];

  const importantNoteKeywords = config.notes
    .filter(note => note.important)
    .map(note => note.keyword);

  function hasImportantNote(commit) {
    return commit.notes.reduce((hadImportant, note) => {
      /* istanbul ignore if */
      if (hadImportant) {
        return true;
      }

      return importantNoteKeywords.indexOf(note.title) !== -1;
    }, false);
  }

  function trimHash(commit) {
    /* istanbul ignore else */
    if (typeof commit.hash === 'string') {
      return commit.hash.substring(0, 7);
    }

    /* istanbul ignore next */
    return undefined;
  }

  function issueUrl() {
    /* istanbul ignore else */
    if (pkgJson.bugs && pkgJson.bugs.url) {
      var lastChar = pkgJson.bugs.url.substr(-1); // Selects the last character
      /* istanbul ignore else */
      if (lastChar !== '/') { // If the last character is not a slash
        pkgJson.bugs.url = pkgJson.bugs.url + '/'; // Append a slash to it.
      }

      return pkgJson.bugs.url;
    } else if (pkgJson.repository && pkgJson.repository.url && ~pkgJson.repository.url.indexOf('github.com')) {
      let gitUrl = gufg(pkgJson.repository.url);

      if (gitUrl) {
        return gitUrl + '/issues/';
      }
    }
  }

  function parseIssueId(string) {
    /* istanbul ignore else */
    if (url) {
      const JIRA_ISSUE_MATCHER = /([A-Z]+-[0-9]+)/g;
      const DEFAULT_MATCHER = /#([0-9]+)/g;

      // Jira Issues
      /* istanbul ignore next */
      string = string.replace(JIRA_ISSUE_MATCHER, (_, issue) => {
        issues.push(issue);
        return '[' + issue + '](' + url + issue + ')';
      });

      // Issue URLs
      string = string.replace(DEFAULT_MATCHER, (_, issue) => {
        issues.push(issue);
        return '[#' + issue + '](' + url + issue + ')';
      });
    }

    return string;
  }

  return function transform(commit) {
    let isImportant = hasImportantNote(commit);
    let typeConfig = config.types.reduce((theType, aType) => {
      if (!theType && aType.key === commit.type) {
        return aType;
      }

      return theType;
    }, isImportant ? {} : undefined);

    /* istanbul ignore if */
    if (!typeConfig) {
      return undefined;
    }

    if (!isImportant && typeConfig.hide) {
      return undefined;
    }

    commit.notes.forEach(note => {
      note.title = 'BREAKING CHANGES';
    });

    commit.type = config.types.find(type => {
      if (commit.type === type.key) {
        return true;
      }

      return false;
    }).name;

    // If empty scope
    if (commit.scope === '*') {
      commit.scope = '';
    } else if (url && commit.scope) {
      commit.scope = parseIssueId(commit.scope);
    }

    // Position for sort
    /* istanbul ignore else */
    if (!commit.position) {
      commit.position = 0;

      /* istanbul ignore if */
      if (typeConfig.position) {
        commit.position = typeConfig.position;
      }
    }

    /* istanbul ignore else */
    if (typeof commit.hash === 'string') {
      commit.hash = trimHash(commit);
    }

    /* istanbul ignore else */
    if (typeof commit.subject === 'string') {
      /* istanbul ignore else */
      if (url) {
        commit.subject = parseIssueId(commit.subject);
      }

      // GitHub user URLs.
      commit.subject = commit.subject.replace(/@([a-zA-Z0-9_]+)/g, '[@$1](https://github.com/$1)');
    }

    // Remove references that already appear in the subject
    commit.references = commit.references.filter(reference => {
      if (issues.indexOf(reference.issue) === -1) {
        return true;
      }

      return false;
    });

    return commit;
  };
}

module.exports = transformFn;
