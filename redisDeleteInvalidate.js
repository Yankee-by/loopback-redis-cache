const redisDeletePattern = require('redis-delete-pattern');

module.exports = function({client, key}, cb) {
  return new Promise( (resolve) => {
    redisDeletePattern({
      redis: client,
      pattern: key
    }, function (err) {
      if(err){
        console.log(err);
      }

      resolve( cb() );
    });
  });
}
