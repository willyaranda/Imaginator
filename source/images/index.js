'use strict';
var winston = require('winston');
var sizeOf = require('image-size');

/**
 * Gets the size of the images
 * @param  {Object} imagesObj Holds a object with images and urls
 * @return {Object}           The array modified
 */
var getSize = function(imagesArr) {
  winston.debug('[getSize]');
  imagesArr.forEach(function(i, index) {
    if (i.image) {
      let size = null;
      try {
        size = sizeOf(new Buffer(i.image));
        imagesArr[index].dimentions = size;
        winston.debug('Image ' + i.url + ' -- size=' + JSON.stringify(size));
      } catch (e) {
        //winston.error(e);
      }
    } else {
      winston.debug('Image ' + i.url + ' NOT DOWNLOADED');
    }
  });
  return imagesArr;
};

/**
 * Given an array of images, it returns an object with the mimetype and
 * the binary image (as Buffer)
 * @param  {Array} images Array with images
 * @return {Object}        Holds the biggest image, with mimetype and binary data
 */
var getBestImage = function(images) {
  winston.debug('[getBestImage]');
  let maxPixls = 0;
  // The best image found
  let rv = {
    type: null,
    binary: null
  };
  // A fallback image. Should be the favicon.
  let fallback = {
    type: 'ico', // .ico file, the smallest one
    binary: null
  };
  images.forEach(function(im) {
    // If we find an icon, just save it as fallback
    if (im.url.indexOf('.ico') !== -1) {
      fallback.binary = im.image;
      return;
    }
    // Check if this image is bigger than the one that we have as a best image
    // and substitute if so
    let pxls = im.dimentions.width * im.dimentions.height;
    if (pxls > maxPixls) {
      maxPixls = pxls;
      rv.type = im.dimentions.type;
      rv.binary = im.image;
    }
  });

  // Return only the image if we have found it, if not, send favicon
  if (rv.binary) {
    return rv;
  } else {
    return fallback;
  }
};


module.exports = {
  getBestImage: getBestImage,
  getSize: getSize
};
