/* global require */
// Process-local lab DNS only. Never installed in the deployed command.
// CommonJS is required by this process-local --require preload.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dns = require('node:dns');
const lookup = dns.lookup;
dns.lookup = function (host, options, callback) {
  return lookup.call(dns, host === 'game.p9b.test' ? '127.0.0.1' : host, options, callback);
};
