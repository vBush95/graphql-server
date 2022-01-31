const { RedisPubSub } = require("graphql-redis-subscriptions");
const Redis = require("ioredis");
require("dotenv").config();

const REDIS_DOMAIN_NAME = "127.0.0.1";
const PORT_NUMBER = 6379;

const REDIS_PORT = 16638;
// const options = {
//   host: REDIS_DOMAIN_NAME,
//   port: PORT_NUMBER,
//   retryStrategy: (times) => {
//     // reconnect after
//     return Math.min(times * 100, 3000);
//   },
// };

// const options = {
//   host: process.env.REDIS_HOST,
//   port: 16638,
//   password: process.env.REDIS_PW,
//   username: "default",
// };

// const pubsub = new RedisPubSub({
//   publisher: new Redis(options),
//   subscriber: new Redis(options),
// });

const pubsub = new RedisPubSub({
  publisher: new Redis(process.env.REDIS_URL),
  subscriber: new Redis(process.env.REDIS_URL),
});

module.exports = pubsub;
