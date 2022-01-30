const { RedisPubSub } = require("graphql-redis-subscriptions");
const Redis = require("ioredis");

const REDIS_DOMAIN_NAME = "127.0.0.1";
const PORT_NUMBER = 6379;

const options = {
  host: REDIS_DOMAIN_NAME,
  port: PORT_NUMBER,
  retryStrategy: (times) => {
    // reconnect after
    return Math.min(times * 100, 3000);
  },
};

const pubsub = new RedisPubSub({
  publisher: new Redis(options),
  subscriber: new Redis(options),
});

module.exports = pubsub;
