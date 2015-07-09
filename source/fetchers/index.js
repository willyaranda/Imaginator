var request = require('request');

var wellKnownURLsFetcher = function(domain, cb) {
  /*
    domain.com/favicon.ico
    www.domain.com/favicon.ico
    domain.com/apple-touch-icon.png
  */

};

var headersFetcher = function(domain, cb) {
  /*
    This is some of the icons found on different websites:
    <link rel="apple-touch-icon" href="/static/apple-touch/wikipedia.png">
    <link rel="shortcut icon" href="/static/favicon/wikipedia.ico">
    <meta property="og:image" content="http://images.apple.com/home/images/og.jpg?201506300817">
    <meta content="/images/google_favicon_128.png" itemprop="image">
  */
};

module.exports = {
  fetchers: fetchers
};
