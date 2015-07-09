'use strict';

var request = require('request');
var htmlparser = require('htmlparser2');
var winston = require('winston');
var async = require('async');

/**
 * Receives a full string html page, and returns possible image URLs to fetch
 * @param  {String} body a HTML page, as string
 * @param  {String} url  the url of the given body
 * @return {Array}      Returns a list of possible images found on the page
 */
var internalParser = function(body, url) {
  winston.debug('[internalParser]');
  /*
    This is some of the icons found on different websites:
    <link rel="apple-touch-icon" href="/static/apple-touch/wikipedia.png">
    <link rel="shortcut icon" href="/static/favicon/wikipedia.ico">
    <meta property="og:image" content="http://images.apple.com/home/images/og.jpg?201506300817">
    <meta content="/images/google_favicon_128.png" itemprop="image">
  */
  let internalUrls = [];
  let parser = new htmlparser.Parser({
    onopentag: function(name, attrs) {
      if ((name === 'link') && (attrs.rel === 'apple-touch-icon')) {
        internalUrls.push(attrs.href);
      } else if ((name === 'link') && (attrs.rel === 'icon')) {
        internalUrls.push(attrs.href);
      } else if ((name === 'link') && (attrs.rel === 'shortcut icon')) {
        internalUrls.push(attrs.href);
      } else if ((name === 'meta') && (attrs.property === 'og:image')) {
        internalUrls.push(attrs.content);
      } else if ((name === 'meta') && (attrs.itemprop === 'image')) {
        internalUrls.push(attrs.content);
      }
    }
  });
  parser.write(body);
  parser.end();

  // Add URL at start if they do not have (maybe they are relative to the domain)
  let rv = internalUrls.map(function(el) {
    if (el.substr(0, 2) === '//') {
      return 'http:' + el;
    } else if (el.substr(0, 4) !== 'http') {
      return url + '/' + el;
    } else {
      return el;
    }
  });
  return rv;
};

/**
 * Calls the callback with an (optional) error and a list of images found on the
 * website
 * @param  {String}   url url to check for images
 * @param  {Function} cb  called with err, [imagesUrl]
 */
var generatePossibleURLs = function(url, cb) {
  let validURLs = [];

  // Well-known URLs
  validURLs.push(url + '/favicon.ico');

  request.get(url, function(error, response, body) {
    // Bail out if we have an error or a 200
    if (error || response.statusCode !== 200) {
      let err = error || response.statusCode;
      winston.error("[generatePossibleURLs] Error=" + err);
      return cb(err);
    } else {
      validURLs = validURLs.concat(internalParser(body, url));
      cb(null, validURLs);
    }
  });
};

/**
 * Download a list of given urls in batch (parallel) and calls the callback with
 * an (optional) error and an object with the url and the image (as Buffer)
 * @param  {Array}   urls urls to download
 * @param  {Function} cb
 */
var downloadImages = function (urls, cb) {
  let images = [];
  // Images array should contain this obj:
  /*
    obj =
      {
        url:
        image:
      }
  */
  var _fetch = function(url, cb) {
    winston.debug("Fetching " + url);
    let obj = {
      url: url,
      image: null
    };
    let opts = {
      url: url,
      encoding: null
    };
    request.get(opts, function(err, res, body) {
      if (err || res.statusCode !== 200) {
        let msg = "[_fetch]" + url + " -- err=" + err || res.statusCode;
        winston.error(msg);
        cb();
        return;
      }

      let msg = "[_fetch] correct! " + url;
      winston.debug(msg);
      obj.image = body;
      images.push(obj);
      cb();
    });
  };

  async.each(urls, _fetch, function () {
    winston.debug('Fetch finished');
    cb(null, images);
  });
};

module.exports = {
  downloadImages: downloadImages,
  generatePossibleURLs: generatePossibleURLs
};
