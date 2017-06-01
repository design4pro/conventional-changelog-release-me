#!/usr/bin/env node

const conventionalChangelog = require('conventional-changelog');
const config = require('../src/index');

console.log('config', config);

conventionalChangelog({
  config,
  /* ... */
}).pipe(process.stdout); // or any writable stream
