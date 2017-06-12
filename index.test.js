'use strict';

const execSync = require('child_process').execSync;
const conventionalChangelogCore = require('conventional-changelog-core');
const preset = require('./index');
const expect = require('chai').expect;
const commit = require('git-dummy-commit');
const shell = require('shelljs');
const through = require('through2');
const betterThanBefore = require('better-than-before')();
const preparing = betterThanBefore.preparing;

betterThanBefore.setups([
  () => {
    shell.config.silent = true;
    shell.rm('-rf', 'tmp');
    shell.mkdir('tmp');
    shell.cd('tmp');
    shell.mkdir('git-templates');
    shell.exec('git init --template=./git-templates');

    commit('chore: first commit');
    commit('feat: amazing new module\nBREAKING CHANGE: Not backward compatible.');
    commit('fix(compile): avoid a bug\nBREAKING CHANGE: The Change is huge.');
    commit('perf(ngOptions): make it faster\n closes #1, #2');
    commit('revert(ngOptions): bad commit');
    commit('fix(*): oops');
  },
  () => {
    commit('feat(awesome): addresses the issue brought up in #133');
  },
  () => {
    commit('feat(awesome): fix #88');
  },
  () => {
    commit('feat(awesome): issue brought up by @bcoe! on Friday');
  },
  () => {
    commit('docs(readme): make it clear\nBREAKING CHANGE: The Change is huge.');
    commit('style(whitespace): make it easier to read\nBREAKING CHANGE: The Change is huge.');
    commit('refactor(code): change a lot of code\nBREAKING CHANGE: The Change is huge.');
    commit('test(*): more tests\nBREAKING CHANGE: The Change is huge.');
    commit('chore(deps): bump\nBREAKING CHANGE: The Change is huge.');
  },
  () => {
    commit('feat(deps): bump\nBREAKING CHANGES: Also works :)');
  },
  () => {
    shell.exec('git tag v1.0.0');
    commit('feat: some more features');
  }
]);

betterThanBefore.tearsWithJoy(() => {
  shell.cd('../');
  shell.rm('-rf', 'tmp');
});

describe('preset', () => {

  it('should work if there is no semver tag', (done) => {
    preparing(1);

    shell.exec('git status');
    shell.exec('git log');

    conventionalChangelogCore({
      config: preset
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();

        expect(chunk).to.include('amazing new module');
        expect(chunk).to.include('**compile:** avoid a bug');
        expect(chunk).to.include('make it faster');
        expect(chunk).to.include(', closes [#1](https://github.com/design4pro/conventional-changelog-release-me/issues/1) [#2](https://github.com/design4pro/conventional-changelog-release-me/issues/2)');
        expect(chunk).to.include('Not backward compatible.');
        expect(chunk).to.include('**compile:** The Change is huge.');
        expect(chunk).to.include('Features');
        expect(chunk).to.include('Bug Fixes');
        expect(chunk).to.include('Performance Improvements');
        expect(chunk).to.include('Reverts');
        expect(chunk).to.include('bad commit');
        expect(chunk).to.include('BREAKING CHANGES');

        expect(chunk).to.not.include('first commit');
        expect(chunk).to.not.include('feat');
        expect(chunk).to.not.include('fix');
        expect(chunk).to.not.include('perf');
        expect(chunk).to.not.include('revert');
        expect(chunk).to.not.include('***:**');
        expect(chunk).to.not.include(': Not backward compatible.');

        done();
      }));
  });

  it('should replace #[0-9]+ with GitHub issue URL', (done) => {
    preparing(2);

    conventionalChangelogCore({
      config: preset
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();
        expect(chunk).to.include('[#133](https://github.com/design4pro/conventional-changelog-release-me/issues/133)');
        done();
      }));
  });

  it('should remove the issues that already appear in the subject', (done) => {
    preparing(3);

    conventionalChangelogCore({
      config: preset
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();
        expect(chunk).to.include('[#88](https://github.com/design4pro/conventional-changelog-release-me/issues/88)');
        expect(chunk).to.not.include('closes [#88](https://github.com/design4pro/conventional-changelog-release-me/issues/88)');
        done();
      }));
  });

  it('should replace @username with GitHub user URL', (done) => {
    preparing(4);

    conventionalChangelogCore({
      config: preset
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();
        expect(chunk).to.include('[@bcoe](https://github.com/bcoe)');
        done();
      }));
  });

  it('should not discard commit if there is BREAKING CHANGE', (done) => {
    preparing(5);

    conventionalChangelogCore({
      config: preset
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();

        expect(chunk).to.include('Documentation');
        expect(chunk).to.include('Styles');
        expect(chunk).to.include('Code Refactoring');
        expect(chunk).to.include('Tests');
        expect(chunk).to.include('Chores');

        done();
      }));
  });

  it('should BREAKING CHANGES the same as BREAKING CHANGE', (done) => {
    preparing(6);

    conventionalChangelogCore({
      config: preset
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk) {
        chunk = chunk.toString();

        expect(chunk).to.include('Also works :)');

        done();
      }));
  });

  it('should work if there is a semver tag', (done) => {
    preparing(7);
    var i = 0;

    conventionalChangelogCore({
      config: preset,
      outputUnreleased: true
    })
      .on('error', function(err) {
        done(err);
      })
      .pipe(through(function(chunk, enc, cb) {
        chunk = chunk.toString();

        expect(chunk).to.include('some more features');
        expect(chunk).to.not.include('BREAKING');

        i++;
        cb();
      }, () => {
        expect(i).to.equal(1);
        done();
      }));
  });
});
