'use strict';
var async = require('async');
var winston = require('winston');
var express = require('express');
var app = express();

var config = require('./config.json');
winston.level = config.logger.level || 'debug';
var domainValidator = require('./domain/index.js').domainValidator;

app.get('/get', function (req, res) {
  console.log('hola');
  winston.debug('GET /get');
  let domain = req.query.domain;
  domainValidator(domain, function(err, clean) {
    if (err || clean === null) {
      let msg = "Requested INVALID domain=" + domain;
      res.status(400).send(msg);
      return winston.error(msg);
    }
    let msg = "Domain to be requested=" + clean;
    res.status(200).send(msg);
    winston.debug(msg);
  });

});

var server = app.listen(config.server.port, function () {
  winston.info("Server ready on port " + config.server.port);
});
