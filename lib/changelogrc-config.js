'use strict';

const findup = require('findup');
const fs = require('fs');
const path = require('path');

let CHANGELOGRC = '.changelogrc';

function changelogrcConfig() {
  let promise = new Promise((resolve, reject) => {
    findup(process.cwd(), CHANGELOGRC, (err, filePath) => {
      if (err) {
        reject(err);
        return;
      }

      fs.readFile(path.join(filePath, CHANGELOGRC), (readError, content) => {
        /* istanbul ignore if */
        if (readError) {
          reject(readError);
          return;
        }

        resolve(JSON.parse(content.toString()));
      });
    });
  });

  return promise;
}

module.exports = changelogrcConfig;
