const { ApolloServer } = require("apollo-server-express");
const typeDefs = require("./schema");
const resolvers = require("./resolvers");
const API = require("./datasources/api");
const mongoose = require("mongoose");
require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { execute, subscribe } = require("graphql");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { pubsub } = require("./utils/pubsub");
const { applyMiddleware } = require("graphql-middleware");
const permissions = require("./permissions");
const cors = require("cors");
const expressJwt = require("express-jwt");
const readJWT = require("./utils/readJWT");

const { ApolloServerPluginDrainHttpServer } = require("apollo-server-core");

async function startApolloServer(typeDefs, resolvers) {
  const app = express();

  //Cors
  const allowedDomains = [
    "http://localhost:3000",
    "ws://localhost:4000",
    "https://studio.apollographql.com",
  ];
  const verifyOrigin = (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedDomains.indexOf(origin) === -1) {
      var msg = `This site ${origin} does not have an access. Only specific domains are allowed to access it.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  };

  const corsOptions = {
    origin: verifyOrigin,
    //origin: "http://localhost:3000",
    //origin: "https://studio.apollographql.com",
    credentials: true,
  };

  //Middleware exporess JWT and cors
  app.use(
    expressJwt({
      secret: process.env.SECRET_KEY_ACCESS_TOKEN,
      algorithms: ["HS256"],
      credentialsRequired: false,
    }),
    cors(corsOptions)
  );

  const httpServer = createServer(app);

  let schema = makeExecutableSchema({ typeDefs, resolvers });
  schema = applyMiddleware(schema, permissions);

  const subscriptionServer = SubscriptionServer.create(
    {
      // This is the `schema` we just created.
      schema,
      // These are imported from `graphql`.
      execute,
      subscribe,
      onConnect(connectionParams, webSocket, context) {
        console.log("Connected!");
      },
      onDisconnect(webSocket, context) {
        console.log("Disconnected!");
      },
    },
    {
      // This is the `httpServer` we created in a previous step.
      server: httpServer,
      // Pass a different path here if your ApolloServer serves at
      // a different path.
      path: "/graphql",
    }
  );

  const server = new ApolloServer({
    schema,
    context: ({ req, res }) => {
      const user = readJWT(req);
      //console.log("pubsub1", pubsub);
      //console.log("pubsub", typeof pubsub.asyncIterator === "function");
      return {
        req,
        res,
        pubsub,
        user: user || null,
      };
    },

    plugins: [
      {
        async serverWillStart() {
          return {
            async drainServer() {
              subscriptionServer.close();
            },
          };
        },
      },
    ],
  });
  await server.start();
  server.applyMiddleware({
    app,
    // By default, apollo-server hosts its GraphQL endpoint at the
    // server root. However, *other* Apollo Server packages host it at
    // /graphql. Optionally provide this to match apollo-server.
    path: "/",
  });

  try {
    mongoose.connect(process.env.MONGODB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await new Promise((resolve) => {
      httpServer.listen({
        port: process.env.PORT || 4000,
        resolve,
      }),
        console.log(
          `🚀 Server ready at http://localhost:4000${server.graphqlPath}`
        );
      console.log(
        `🚀 Subscriptions ready at ws://localhost:${4000}${server.graphqlPath}`
      );
    });
  } catch (err) {
    throw new Error(err);
  }
}

startApolloServer(typeDefs, resolvers);
