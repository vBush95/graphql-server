const User = require("./models/User");
const RegisterKey = require("./models/RegisterKey");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { UserInputError } = require("apollo-server-express");
const { generateAccessToken, generateRefreshToken } = require("./utils/token");
const checkAuth = require("./utils/checkAuth");

const {
  validateRegisterInput,
  validateRegisterInputKey,
  validateRegisterInputEmail,
  validateRegisterInputUsername,
  validateRegisterInputPassword,
  validateLoginInput,
} = require("./utils/validators");

let messages = [{ username: "admin", content: "message1" }];

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
      const userDb = await User.findOne({ _id: user.sub });
      return userDb;
    },
    user: async (_, { username }) => {
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error("User id does not exist");
      }
      return user;
    },
    messages: () => messages,
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

      res.cookie(process.env.SECRET_KEY_COOKIE, refreshToken, {
        httpOnly: true,
      });

      return accessToken;
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
      },
      { pubsub }
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
        roles: ["USER"],
        permissions: ["useChat", "read_own_user"],
        createdAt: new Date().toISOString(),
      });

      const res = await newUser.save();

      pubsub.publish("NEW_USER", newUser);
      console.log("mut pubsub", typeof pubsub.asyncIterator === "function");

      //decrement Register-Key remaining Uses
      const updatedKey = await RegisterKey.updateOne(
        { registerKey },
        { $set: { remainingUses: registerKeyDb.remainingUses - 1 } }
      );

      // create auth token
      const token = generateAccessToken(res);

      return {
        ...res._doc,
        id: res._id,
        remainingUses: updatedKey.remainingUses,
        token,
      };
    },
    //createMessage: async (_, { username, content }, { pubsub }) => {
    createMessage: async (_, { username, content }, { pubsub }) => {
      const id = messages.length;
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error("User not found.");
      }

      const message = {
        id,
        user: user.username,
        content,
        createdAt: new Date().toISOString(),
      };

      messages.push(message);

      return { id, content };
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
  },
  Subscription: {
    messageCreated: {
      //subscribe: (_, __, { pubsub }) =>
      /*
      subscribe: (_, __, { pubsub }) => {
        return pubsub.asyncIterator("MESSAGES");
      },
      */
    },
    newUser: {
      subscribe: (_, __, { pubsub }) => pubsub.asyncIterator(["NEW_USER"]),
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
