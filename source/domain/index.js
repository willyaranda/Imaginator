'use strict';
var request = require('request');
var url = require('url');
var winston = require('winston');

/**
 * Domain sanitizer (async, as we can use a test, like checking by DNS if the
 * domain exists or not)
 * @param  {String}   domain the domain to be cleaned
 * @param  {Function} cb     called with error, cleanDomain
 */
var domainValidator = function(domain, cb) {
  winston.debug('[domainValidator] validating ' + domain);

  let cleanDomain = null;
  let finalDomain = null;
  // Check for falsy domains (`!domain` would also work :))
  if ((domain === '') || (domain === null) || (domain === undefined)) {
    return cb(new Error('empty domain'));
  }

  // Add http:// if it is not found. We can then change to https if we
  // don't have any response
  if (domain.indexOf('http') === -1) {
    cleanDomain = 'http://' + domain;
  } else {
    cleanDomain = domain;
  }

  // Parse the URL and format a correct URL
  var urlParsed = url.parse(cleanDomain);
  if ((urlParsed.protocol !== null) && (urlParsed.host !== null)) {
    finalDomain = urlParsed.protocol + '//' + urlParsed.host;
  }

  // Let's add a .com in case we can't found a TLD
  // (so we can be queried with amazon, google, facebook)
  var tld = urlParsed.hostname.match(/\.([a-zA-Z]*?)$/);
  if (!tld) {
    finalDomain = finalDomain + '.com';
  }

  winston.info('[domainValidator] Domain cleaned. Before=' + domain +
  ', after=' + finalDomain);

  // Let's call this in another stack, do really async stuff
  setImmediate(function() {
    cb(null, finalDomain);
  });
};

module.exports = {domainValidator};
