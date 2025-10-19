const redis = require('redis');

const redisClient = redis.createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => { 
  if (!redisClient.isOpen) await redisClient.connect(); 
})();

module.exports = redisClient;
