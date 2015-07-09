## Image fetcher

Give me a domain, I'll give you an image!

### How to run it?

`$ iojs source/index.js`

#### How does it do the magic?

* It receives a domain, in the URL, like `http://localhost:3000/get?domain=dashlane.com`
* Tries to fix the domain, if there is any problem (if it's emtpy, if it does not have a tld…)
* Fetches the main page (following redirects, if any), and parses the HTML.
* It only extracts some tags that are known of containing a image.
* Builds up an array of URLs.
* Downloads all of them
* Gets the biggest one, caching it.
* Serves it to the user.

#### Caching

If I receive another request for the same sanitized domain, I try to send the cached image.

I do not save if a domain is not available, or if it has been contacted more than once. I just send the data if I have it on the cache.

It uses the fantastic lru-cache module, that can be configured with different options.

On a shared environment, the cache could be a Redis cluster. In my opinion, it's the fastest out there and in the last release it become much more robust on clustering.

#### Two concurrent requests

If I have only one instance, I could have a requestsMap that saves the domain and an array of requests. If a request is pending for a domain, I would put on hold the second one, and wait the first to finish, and then call the response for each of them.

In a shared instance, I can do the same on top of redis, a simple locking mechanism. In this case, it is possible to do a polling to check if the lock is removed and then download the image from redis and send to the second concurrent request.

#### Parallelize

Parallelization is in use. Since Node.js is single thread, but can do async I/O, I can send multiple requests to the URL.

Before sending the requests, it is impossible to know what is the size of the image (some links could have a `128`, `512` on their name, but it can be widely used).

So download all images is the way to go to be as fast as possible and only save the biggest one.

But, I use favicon as a fallback, since they are the smallest one (16x16 pixels).

#### Rate limiting

It can be used with some Node.js modules like rate-limiter, as a express middleware, rejecting some requests that have exceeded the number of allowed requets.

#### Architecture
