'use strict';

var extend = require('extend');
var path = require('path');
var gufg = require('github-url-from-git');
var defaultConfig = require('./../default-config');
var log = require('winston');
var pkgJson = {};
try {
  pkgJson = require(path.resolve(
    process.cwd(),
    './package.json'
  ));
} catch (err) {
  /* istanbul ignore next */
  log.warn('no root package.json found');
}

module.exports = function (someConfig) {
  var config = extend(true, {}, defaultConfig, someConfig);
  var url = issueUrl();
  var issues = [];
  var importantNoteKeywords = config.notes
    .filter(function (note) {
      return note.important;
    })
    .map(function (note) {
      return note.keyword;
    });

  function hasImportantNote(commit) {
    return commit.notes.reduce(function (hadImportant, note) {
      if (hadImportant) {
        return true;
      }

      return importantNoteKeywords.indexOf(note.title) !== -1;
    }, false);
  }

  function trimHash(commit) {
    if (typeof commit.hash === 'string') {
      return commit.hash.substring(0, 7);
    }

    return undefined;
  }

  function issueUrl() {
    if (pkgJson.bugs && pkgJson.bugs.url) {
      var lastChar = pkgJson.bugs.url.substr(-1); // Selects the last character

      if (lastChar !== '/') { // If the last character is not a slash
        pkgJson.bugs.url = pkgJson.bugs.url + '/'; // Append a slash to it.
      }

      return pkgJson.bugs.url;
    } else if (pkgJson.repository && pkgJson.repository.url && ~pkgJson.repository.url.indexOf('github.com')) {
      var gitUrl = gufg(pkgJson.repository.url);

      if (gitUrl) {
        return gitUrl + '/issues/';
      }
    }
  }

  function parseIssueId(string) {
    if (url) {
      var JIRA_ISSUE_MATCHER = /([A-Z]+-[0-9]+)/g;
      var DEFAULT_MATCHER = /#([0-9]+)/g;

      // Jira Issues
      /* istanbul ignore next */
      string = string.replace(JIRA_ISSUE_MATCHER, function (_, issue) {
        issues.push(issue);
        return '[' + issue + '](' + url + issue + ')';
      });

      // Issue URLs
      string = string.replace(DEFAULT_MATCHER, function (_, issue) {
        issues.push(issue);
        return '[#' + issue + '](' + url + issue + ')';
      });
    }

    return string;
  }

  return function transform(commit) {
    var isImportant = hasImportantNote(commit);
    var typeConfig = config.types.reduce(function (theType, aType) {
      if (!theType && aType.key === commit.type) {
        return aType;
      }

      return theType;
    }, isImportant ? {} : undefined);

    if (!typeConfig) {
      return undefined;
    }

    if (!isImportant && typeConfig.hide) {
      return undefined;
    }

    commit.notes.forEach(function (note) {
      note.title = 'BREAKING CHANGES';
    });

    commit.type = config.types.find(function (type) {
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
    if (!commit.position) {
      commit.position = 0;

      if (typeConfig.position) {
        commit.position = typeConfig.position;
      }
    }

    if (typeof commit.hash === 'string') {
      commit.hash = trimHash(commit);
    }

    if (typeof commit.subject === 'string') {
      if (url) {
        commit.subject = parseIssueId(commit.subject);
      }

      // GitHub user URLs.
      commit.subject = commit.subject.replace(/@([a-zA-Z0-9_]+)/g, '[@$1](https://github.com/$1)');
    }

    // Remove references that already appear in the subject
    commit.references = commit.references.filter(function (reference) {
      if (issues.indexOf(reference.issue) === -1) {
        return true;
      }

      return false;
    });

    return commit;
  };
};
