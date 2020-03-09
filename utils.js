function isFindGetCacheExist(ctx){
  const findMethod = ctx.method.name.indexOf("find") !== -1;
  const getMethod = ctx.method.name.indexOf("__get") !== -1;

  const cache = ctx && ctx.req && ctx.req.query && ctx.req.query.cache;
  const hasCacheParameter = typeof cache != 'undefined';

  return [findMethod, getMethod, hasCacheParameter];
}

function generateCacheKey({modelName, ctx, id, all = false}) {
  const token = (id)? String(id) : '';

  return all
    ? `${token}_${modelName}_*`
    : `${token}_${modelName}_${new Buffer(JSON.stringify(ctx.req.query)).toString('base64')}`;
}

module.exports = {
  generateCacheKey,
  isFindGetCacheExist
};
