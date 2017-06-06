'use strict';

import findup from 'findup';
import fs from 'fs';
import path from 'path';

const CHANGELOGRC = '.changelogrc';

function changelogrcConfig(cb) {
  const promise = new Promise((resolve, reject) => {
    findup(process.cwd(), CHANGELOGRC, (err, filePath) => {
      if (err) {
        reject(err);
        return;
      }

      fs.readFile(path.join(filePath, CHANGELOGRC), (readError, content) => {
        if (readError) {
          reject(readError);
          return;
        }

        resolve(JSON.parse(content.toString()));
      });
    });
  });

  if (typeof cb === 'function') {
    promise.then((content) => cb(null, content), cb);
  }

  return promise;
}

export default changelogrcConfig;
