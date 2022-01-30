const User = require("./models/User");
const Message = require("./models/Message");
const UsersOnline = require("./models/UsersOnline");
const RegisterKey = require("./models/RegisterKey");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { UserInputError } = require("apollo-server-express");
const { generateAccessToken, generateRefreshToken } = require("./utils/token");
const checkAuth = require("./utils/checkAuth");
const pubsub = require("./utils/pubsub");
const guid = require("./utils/generateRandomId");
const sendRefreshToken = require("./utils/sendRefreshToken");

const {
  validateRegisterInput,
  validateRegisterInputKey,
  validateRegisterInputEmail,
  validateRegisterInputUsername,
  validateRegisterInputPassword,
  validateLoginInput,
} = require("./utils/validators");

const resolvers = {
  Query: {
    sayHi: () => "Hello World!",
    getUsers: async (_, __, { payload }) => {
      try {
        const users = await User.find().sort({ createdAt: -1 });
        return {
          id: payload.id,
          users,
        };
      } catch (err) {
        throw new Error(err);
      }
    },
    viewer: async (_, __, { user }) => {
      /*
      const userDb = await User.findOne({ _id: user.sub });
      return userDb;
      */
      return user;
    },
    user: async (_, { username }) => {
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error("User id does not exist");
      }
      return user;
    },
    me: async (_, __, { user, req }) => {
      /*
      const authorization = req.headers["authorization"];
      if (!authorization) {
        return null;
      }

      try {
        const token = authorization.split(" ")[1];
        const payload = verify(token, prozess.env.SECRET_KEY_ACCESS_TOKEN);
        context.payload = payload;
        return User.findOne(payload.username);
      } catch (err) {
        console.log(err);
        return null;
      }
      */
      if (user) {
        try {
          return User.findOne({ username: user.username });
        } catch (err) {
          console.log(err);
          return null;
        }
      }
      return null;
    },
    getMessages: async (_, __, { user }) => {
      if (user) {
        try {
          const messages = await Message.find();

          return messages;
        } catch (err) {
          console.log(err);
          return null;
        }
      }
    },
  },
  Mutation: {
    // login user and validate login credentials
    login: async (_, { username, password }, { res }) => {
      const { errors, valid } = validateLoginInput(username, password);
      const user = await User.findOne({ username });

      if (!valid) {
        throw new UserInputError("Errors", { errors });
      }
      if (!user) {
        errors.general = "User not found";
        throw new UserInputError("User not found", { errors });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        errors.general = "Wrong credentials";
        throw new UserInputError("Wrong credentials", { errors });
      }

      const accessToken = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);

      sendRefreshToken(res, refreshToken);

      return { accessToken, user };
    },
    logout: async (_, __, { res }) => {
      sendRefreshToken(res, "");

      return true;
    },
    // multi-step validation for registering new users
    registerValidateKey: async (_, { registerKey }) => {
      const registerKeyDb = await RegisterKey.findOne({ registerKey });
      if (!registerKeyDb) {
        throw new UserInputError("The Register-Key is not valid.", {
          errors: {
            registerKey: "This Register-Key is not valid.",
          },
        });
      }
      return true;
    },
    registerValidateEmail: async (_, { email }) => {
      const emailDb = await User.findOne({ email });
      if (emailDb) {
        throw new UserInputError("Email is aleady in Use", {
          errors: {
            email: "This Email has already registered an account",
          },
        });
      }
      const { valid, errors } = validateRegisterInputEmail(email);
      if (!valid) {
        throw new UserInputError("Please enter a valid E-Mail address.", {
          errors: errors,
        });
      }

      return true;
    },
    registerValidateUsername: async (_, { username }) => {
      const { valid, errors } = validateRegisterInputUsername(username);
      if (!valid) {
        throw new UserInputError("Username ist not valid.", { errors: errors });
      }
      // Make sure user doesnt already exist
      const user = await User.findOne({ username });
      if (user) {
        throw new UserInputError("Username is already taken", {
          errors: {
            username: "This username is taken",
          },
        });
      }
      return true;
    },

    registerValidatePassword: async (_, { password, confirmPassword }) => {
      const { valid, errors } = validateRegisterInputPassword(
        password,
        confirmPassword
      );
      if (!valid) {
        throw new UserInputError("Passwords do not match.", { errors: errors });
      }

      return true;
    },
    // create a new user and check for valid inputs and existing users
    register: async (
      _,
      {
        registerInput: {
          registerKey,
          email,
          username,
          password,
          confirmPassword,
        },
      }
    ) => {
      // Validate user data

      const { valid, errors } = validateRegisterInput(
        registerKey,
        email,
        username,
        password,
        confirmPassword
      );
      if (!valid) {
        throw new UserInputError("Errors", { errors: errors });
      }

      //Make sure the key is valid
      const registerKeyDb = await RegisterKey.findOne({ registerKey });
      if (!registerKeyDb) {
        throw new UserInputError("The Register-Key is not valid.", {
          errors: {
            registerKey: "This Register-Key is not valid.",
          },
        });
      } else if (registerKeyDb.remainingUses <= 0) {
        throw new UserInputError("The Register-Key is not valid.", {
          errors: {
            registerKey: "This Register-Key has been used up.",
          },
        });
      }

      // Make sure email doesnt exist
      const emailDb = await User.findOne({ email });
      if (emailDb) {
        throw new UserInputError("Email is aleady in Use", {
          errors: {
            email: "This Email has already registered an account",
          },
        });
      }
      // Make sure user doesnt already exist
      const user = await User.findOne({ username });
      if (user) {
        throw new UserInputError("Username is already taken", {
          errors: {
            username: "This username is taken",
          },
        });
      }
      // hash password
      password = await bcrypt.hash(password, 12);

      // create new user
      const newUser = new User({
        email,
        username,
        password,
        createdAt: new Date().toISOString(),
        lastSeen: "",
      });

      const res = await newUser.save();

      pubsub.publish("NEW_USER", { userCreated: res });
      //console.log("mut pubsub", typeof pubsub.asyncIterator === "function");

      //decrement Register-Key remaining Uses
      const updatedKey = await RegisterKey.updateOne(
        { registerKey },
        { $set: { remainingUses: registerKeyDb.remainingUses - 1 } }
      );

      // create auth token
      const token = generateAccessToken(res);

      return {
        ...res._doc,
        _id: res._id,
        remainingUses: updatedKey.remainingUses,
        token,
      };
    },
    //createMessage: async (_, { username, content }, { pubsub }) => {
    createMessage: async (_, { username, content }) => {
      const id = guid();
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error("User not found.");
      }

      const newMessage = new Message({
        username: user.username,
        content,
      });

      const res = await newMessage.save();

      // const message = {
      //   id,
      //   username: user.username,
      //   content,
      //   createdAt: new Date().toString(),
      // };

      pubsub.publish("NEW_MESSAGE", { messageCreated: res });

      return res;
    },
    updateUserSettingsNameColor: async (_, { color }, { user }) => {
      const username = user.username;
      const updatedUser = await User.findOneAndUpdate(
        { username },
        {
          $set: {
            settings: {
              usernameColor: color,
            },
          },
        },
        {
          new: true,
        }
      );

      const usersArray = await UsersOnline.findOneAndUpdate(
        { "users.username": username },
        {
          $set: {
            "users.$.settings": {
              usernameColor: color,
            },
          },
        },
        {
          new: true,
        }
      );
      //console.log("color", color);
      pubsub.publish("USERNAME_COLOR_CHANGED", {
        usernameColorChanged: updatedUser,
      });

      if (usersArray.users) {
        //console.log("users", usersArray.users);
        pubsub.publish("USERS_ONLINE", { usersOnline: usersArray.users });
      }

      return updatedUser;
    },
    createRegisterKey: async (_, { registerKey, remainingUses }) => {
      const newRegisterKey = new RegisterKey({
        registerKey,
        remainingUses,
      });

      const res = await newRegisterKey.save();
      return {
        ...res._doc,
        id: res._id,
      };
    },
    revokeRefreshTokensForUser: async (_, { username }) => {
      const user = await User.findOne({ username });
      await User.updateOne(
        { username },
        { $set: { tokenVersion: user.tokenVersion + 1 } }
      );
      return true;
    },
    addToUsersInChat: async (_, __, { user }) => {
      //console.log("user", user);
      const userDb = await User.findOne({ username: user.username });
      const userIsAlreadyOnline = await UsersOnline.findOne({
        "users.username": userDb.username,
      });
      //console.log("userisAlreadyOnline", userIsAlreadyOnline);
      if (!userIsAlreadyOnline) {
        const usersArray = await UsersOnline.findOneAndUpdate(
          { __id: "61eefd61093c73157c32b0bd" },
          {
            $addToSet: {
              users: {
                username: userDb.username,
                settings: {
                  usernameColor: userDb.settings.usernameColor,
                },
              },
            },
          },
          {
            new: true,
          }
        );

        pubsub.publish("USERS_ONLINE", { usersOnline: usersArray.users });
        return usersArray.users;
      } else {
        pubsub.publish("USERS_ONLINE", {
          usersOnline: userIsAlreadyOnline.users,
        });
        return userIsAlreadyOnline.users;
      }
    },
    removeFromUsersInChat: async (_, __, { user }) => {
      const userDb = await User.findOne({ username: user.username });
      const usersArray = await UsersOnline.findOneAndUpdate(
        { "users.username": userDb.username },
        { $pull: { users: { username: userDb.username } } },
        { safe: true, multi: true, new: true }
      );
      if (usersArray) {
        pubsub.publish("USERS_ONLINE", { usersOnline: usersArray.users });
        return usersArray.users;
      }
    },
    updateLastSeen: async (_, { timestamp }, { user }) => {
      const username = user.username;
      const userDb = await User.updateOne(
        { username },
        { $set: { lastSeen: timestamp } }
      );
      return timestamp;
    },
  },
  Subscription: {
    messageCreated: {
      //subscribe: (_, __, { pubsub }) =>

      subscribe: (_, __, ___) => {
        return pubsub.asyncIterator("NEW_MESSAGE");
      },
    },
    userCreated: {
      subscribe: (_, __, ___) => pubsub.asyncIterator(["NEW_USER"]),
    },
    usersOnline: {
      subscribe: (_, __, ___) => pubsub.asyncIterator(["USERS_ONLINE"]),
    },
    usernameColorChanged: {
      subscribe: (_, __, ___) =>
        pubsub.asyncIterator(["USERNAME_COLOR_CHANGED"]),
    },
  },
};

module.exports = resolvers;

/*
pubsub.publish('POST_CREATED', {
  postCreated: {
    author: 'Ali Baba',
    comment: 'Open sesame'
  }
});

*/
