'use strict';
var async = require('async');
var sizeOf = require('image-size');
var winston = require('winston');
var express = require('express');
var app = express();

var config = require('./config.json');
winston.level = config.logger.level || 'debug';
var domainValidator = require('./domain/index.js').domainValidator;
var generatePossibleURLs = require('./fetchers/index.js').generatePossibleURLs;
var downloadImages = require('./fetchers/index.js').downloadImages;

var LRU = require('lru-cache');
var cacheOpts = {
  max: 500,
  maxAge: 1000 * 60 * 60
};

var imagesCache = LRU(cacheOpts);

var getSize = function(imagesObj) {
  winston.debug('[getSize]');
  imagesObj.forEach(function(i, index) {
    if (i.image) {
      let size = null;
      try {
        size = sizeOf(new Buffer(i.image));
        imagesObj[index].dimentions = size;
        winston.debug('Image ' + i.url + ' -- size=' + JSON.stringify(size));
      } catch (e) {
        //winston.error(e);
      }
    } else {
      winston.debug('Image ' + i.url + ' NOT DOWNLOADED');
    }
  });
  return imagesObj;
};

var getBestImage = function(images) {
  winston.debug('[getBestImage]');
  let maxPixls = 0;
  let rv = {
    type: null,
    binary: null
  };
  let fallback = {
    type: 'ico', // .ico file, the smallest one
    binary: null
  };
  images.forEach(function(im) {
    if (im.url.substr(im.url.length - 4) === '.ico') {
      fallback.binary = im.image;
      return;
    }
    let pxls = im.dimentions.width * im.dimentions.height;
    if (pxls > maxPixls) {
      maxPixls = pxls;
      rv.type = im.dimentions.type;
      rv.binary = im.image;
    }
  });

  // Return only the image if we have a binary file, if not, send favicon
  if (rv.binary) {
    return rv;
  } else {
    return fallback;
  }
};

app.get('/get', function (req, res) {
  winston.debug('GET /get');
  let domain = req.query.domain;
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
    if (img = imagesCache.get(cleanDomain)) {
      winston.info(cleanDomain + ' found on cache, yay!');
      res.setHeader('X-Cache', true);
      res.status(200).type(img.type).send(img.binary);
      return;
    }

    generatePossibleURLs(cleanDomain, function(err, urls) {
      if (err) {
        return res.status(500).send(err);
      }
      let msg = 'Wohooo, URLs to be fetched=' + urls;
      winston.debug(msg);
      downloadImages(urls, function(err, imagesObj) {
        let imgs = getSize(imagesObj);
        let bestImage = getBestImage(imgs);
        imagesCache.set(cleanDomain, bestImage);
        res.status(200).type(bestImage.type).send(bestImage.binary);
      });
    });
  });
});

var server = app.listen(config.server.port, function () {
  winston.info('Server ready on port ' + config.server.port);
});
