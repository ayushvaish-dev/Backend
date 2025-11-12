const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true, 
    servername: process.env.REDIS_HOST, 
  },
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('ready', () => console.log('Redis Client Ready'));


(async () => {
  await redisClient.connect();
})();

module.exports = redisClient;