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
const pubsub = require("./utils/pubsub");
const { applyMiddleware } = require("graphql-middleware");
const permissions = require("./permissions");
const cors = require("cors");
const expressJwt = require("express-jwt");

const jwtMiddleware = require("./utils/jwtMiddleware");
const corsOptions = require("./utils/cors");
const readJWT = require("./utils/readJWT");
const cookieParser = require("cookie-parser");
const { RedisPubSub } = require("graphql-redis-subscriptions");
const { generateAccessToken, generateRefreshToken } = require("./utils/token");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const sendRefreshToken = require("./utils/sendRefreshToken");

async function startApolloServer(typeDefs, resolvers) {
  const app = express();

  //Middleware exporess JWT and cors
  //app.use(jwtMiddleware, cors(corsOptions));
  app.use(cors(corsOptions));
  app.use(cookieParser());

  app.post("/refresh_token", async (req, res) => {
    const token = req.cookies[process.env.SECRET_KEY_COOKIE];
    if (!token) {
      return res.send({ ok: false, accessToken: "" });
    }
    let payload = null;
    try {
      payload = jwt.verify(token, process.env.SECRET_KEY_REFRESH_TOKEN);
    } catch (err) {
      console.log(err);
      return res.send({ ok: false, accessToken: "" });
    }

    //if we get here token is valid and we can send back an access token
    const user = await User.findOne({ username: payload.username });

    if (!user) {
      return res.send({ ok: false, accessToken: "" });
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      return res.send({ ok: false, accessToken: "" });
    }

    const refreshToken = generateRefreshToken(user);
    sendRefreshToken(res, refreshToken);

    return res.send({ ok: true, accessToken: generateAccessToken(user) });
  });

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
        console.log(`${connectionParams.decodedToken.username} - connected`);
      },
      onDisconnect(webSocket, context) {
        //console.log(context);
        console.log(`disconnected`);
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
      //console.log("pubsub", pubsub);
      //console.log("pubsub", typeof pubsub.asyncIterator === "function");
      //console.log("user", user);
      return {
        req,
        res,
        //pubsub,
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
    cors: false,
  });

  try {
    mongoose.connect(process.env.MONGODB_PRODUCTION, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await new Promise((resolve) => {
      httpServer.listen({
        //port: process.env.PORT || 4000,
        port: process.env.PORT || 80,
        resolve,
      }),
        console.log(
          `🚀 Server ready`
          // `🚀 Server ready at http://localhost:4000${server.graphqlPath}`
        );
      console.log(
        `🚀 Subscriptions ready`
        //`🚀 Subscriptions ready at ws://localhost:${4000}${server.graphqlPath}`
      );
    });
  } catch (err) {
    throw new Error(err);
  }
}

startApolloServer(typeDefs, resolvers);
