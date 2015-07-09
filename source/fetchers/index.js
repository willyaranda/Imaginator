'use strict';

var request = require('request');
var htmlparser = require('htmlparser2');
var winston = require('winston');
var async = require('async');

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
      // if (name === 'link' || name === 'meta') {
      //   winston.debug(name + " -- " + JSON.stringify(attrs));
      // }
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
      } else {

      }
    }
  });
  parser.write(body);
  parser.end();

  // Add URL at start if they do not have
  let rv = internalUrls.map(function(el) {
    if (el.substr(0, 4) !== 'http') {
      return url + '/' + el;
    } else {
      return el;
    }
  });
  return rv;
};

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
        winston.err(msg);
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
}

module.exports = {
  downloadImages: downloadImages,
  generatePossibleURLs: generatePossibleURLs
};
