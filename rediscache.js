const app = require('../../server/server');
const redis = require('redis');
const deleteKey = require('./redisDeleteInvalidate');

const {
  generateCacheKey,
  isFindGetCacheExist,
  getKeyPrefix
} = require('./utils');

module.exports = function(Model, options) {
  let clientSettings = options && options.client
    ? options.client
    : app.get('redis');

  let redisClient = redis.createClient(clientSettings);

  redisClient.on("error", function (err) {
    console.log(err);
    // try to connect again with server config
    if ( err.toString().indexOf("invalid password") !== -1 ) {
      console.log("Invalid password... reconnecting with server config...");
      const clientSettings = app.get('redis');

      redisClient = redis.createClient(clientSettings);
    }
  });

  Model.beforeRemote('**', function(ctx, res, next) {
    // get all find methods and search first in cache
    const [
      findMethod,
      getMethod,
      hasCacheParameter
    ] = isFindGetCacheExist(ctx);

    if (
      ( findMethod || getMethod ) && redisClient.connected
    ) {

      if (hasCacheParameter) {
        let modelName = ctx.method.sharedClass.name;

        // set key name
        const prefix = getKeyPrefix({options, ctx});
        const cache_key = generateCacheKey({modelName, ctx, id: prefix});

        // search for cache
        redisClient.get(cache_key, function(err, val) {
          if(err){
            console.log(err);
          }

          if ( val !== null ) {
            ctx.result = JSON.parse(val);
            ctx.done( function(err) {
              if (err) return next(err);
            } );
          } else {
            next();
          }
        });
      } else {
        next();
      }
    } else {
      next();
    }
  });

  Model.afterRemote('**', function(ctx, res, next) {
    // get all find methods and search first in cache - if not exist save in cache
    const [
      findMethod,
      getMethod,
      hasCacheParameter
    ] = isFindGetCacheExist(ctx);

    if (
      ( findMethod || getMethod ) && redisClient.connected
    ) {
      if (hasCacheParameter) {
        const modelName = ctx.method.sharedClass.name;
        const cachExpire = ctx.req.query.cache;

        // set key name
        const prefix = getKeyPrefix({options, ctx});
        const cache_key = generateCacheKey({modelName, ctx, id: prefix});

        // search for cache
        redisClient.get(cache_key, function(err, val) {
          if (err) {
            console.log(err);
          }

          if ( val == null ) {
            // set cache key
            redisClient.set(cache_key, JSON.stringify(res));
            redisClient.expire(cache_key, cachExpire);
            next();
          } else {
            next();
          }
        });
      } else {
        next();
      }
    } else {
      next();
    }
  });

  Model.afterRemote('**', function(ctx, res, next) {
    // delete cache on patchOrCreate, create, delete, update, destroy, upsert
    const [
      findMethod,
      getMethod
    ] = isFindGetCacheExist(ctx);

    if (
      (!findMethod && !getMethod) && redisClient.connected
    ) {
      const modelName = ctx.method.sharedClass.name;

      // set key name
      const prefix = getKeyPrefix({options, ctx});
      const cache_key = generateCacheKey({
        modelName,
        ctx,
        id: prefix,
        all: true
      });

      // delete cache
      return deleteKey({client: redisClient, key: cache_key}, next);
    } else {
      next();
    }
  });
}


