'use strict';
var LRU = require('lru-cache');
var winston = require('winston');
var express = require('express');
var app = express();

var config = require('./config.json');
winston.level = config.logger.level || 'debug';

var domainValidator = require('./domain/index.js').domainValidator;
var fetchers = require('./fetchers/index.js');
var generatePossibleURLs = fetchers.generatePossibleURLs;
var downloadImages = fetchers.downloadImages;
var imageFuncs = require('./images/index.js');


// Holds images, up to 500 entries, so 500 different domains
var cacheOpts = {
  max: 500,
  maxAge: 1000 * 60 * 60
};
var imagesCache = LRU(cacheOpts);

// Routes, as we only have a simple get, let's put it here, and don't add
// complexity to the code
app.get('/get', function (req, res) {
  winston.debug('GET /get');
  let domain = req.query.domain;
  // 1st pass: clean the received domain
  domainValidator(domain, function(err, cleanDomain) {
    if (err || cleanDomain === null) {
      let msg = 'Requested INVALID domain=' + domain;
      res.status(400).send(msg);
      return winston.error(msg);
    }
    let msg = 'Domain to be requested=' + cleanDomain;
    //res.status(200).send(msg);
    winston.debug(msg);

    // Early return if we have the image on cache
    let img = null;
    // 2nd (part a): if we have the image in the cache, just return it
    if (img = imagesCache.get(cleanDomain)) {
      winston.info(cleanDomain + ' found on cache, yay!');
      res.setHeader('X-Cache', true);
      res.status(200).type(img.type).send(img.binary);
      return;
    }

    // 2nd (part b): we do not have in the cache, let's build the possible
    // image URLS we can have!
    generatePossibleURLs(cleanDomain, function(err, urls) {
      if (err) {
        return res.status(500).send(err);
      }
      let msg = 'Wohooo, URLs to be fetched=' + urls;
      winston.debug(msg);
      // 3rd: let's download the images and store it on imagesObj
      downloadImages(urls, function(err, imagesObj) {
        let imgs = imageFuncs.getSize(imagesObj);
        // 4th: get the biggest image and send
        let bestImage = imageFuncs.getBestImage(imgs);
        imagesCache.set(cleanDomain, bestImage);
        res.status(200).type(bestImage.type).send(bestImage.binary);
      });
    });
  });
});

var server = app.listen(config.server.port, function () {
  winston.info('Server ready on port ' + config.server.port);
});
