const { shield, rule, and, or, inputRule, allow } = require("graphql-shield");
const { verify } = require("jsonwebtoken");

const checkPermission = (user, permission) => {
  if (user) {
    return user.permissions.includes(permission);
  }

  return false;
};

const checkRole = (user, role) => {
  if (user) {
    return user.roles.includes(role);
  }

  return false;
};

/*
const isAuthenticated = rule({ cache: "contextual" })(
  async (parent, args, context, info) => {
    const authorization = context.req.headers["authorization"];

    if (!authorization) {
      throw new Error("Not authenticated");
    }

    try {
      const token = authorization.split(" ")[1];
      // payload is what we specified signing the Token , e.g. {
      //id: user.id,
      //email: user.email,
      //username: user.username,
    //}
    
      const payload = verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);

      context.payload = payload;

      return true;
    } catch {
      throw new Error("Not authenticated");
    }
    //return context.headers.role === "USER";
  }
);
*/

const isAuthenticated = rule({ cache: "contextual" })(
  async (_, __, { user }) => {
    return user !== null;
  }
);
const canReadAnyUser = rule()(async (_, __, { user }) => {
  return checkPermission(user, "read_any_user");
});
const canReadOwnUser = rule()(async (_, __, { user }) => {
  return checkPermission(user, "read_own_user");
});

const isAdmin = rule({ cache: "contextual" })(
  async (parent, args, { user }, info) => {
    return checkRole(user, "ADMIN");
  }
);

const isNotAlreadyRegistered = inputRule();

const isEditor = rule()(async (parent, args, ctx, info) => {
  return ctx.user.role === "editor";
});

const isOwner = rule()(async (parent, args, ctx, info) => {
  return ctx.user.items.some((id) => id === parent.id);
});

const permissions = shield(
  {
    Query: {
      sayHi: isAuthenticated,
      getUsers: and(isAuthenticated, isAdmin),
      getMessages: isAuthenticated,
      viewer: isAuthenticated,
      user: isAdmin,
      me: isAuthenticated,
    },
    Mutation: {
      updateUserInChat: isAuthenticated,
      register: !isAuthenticated,
      registerValidateKey: !isAuthenticated,
      registerValidateEmail: !isAuthenticated,
      registerValidateUsername: !isAuthenticated,
      registerValidatePassword: !isAuthenticated,
      createMessage: isAuthenticated,
      updateUserSettingsNameColor: isAuthenticated,
      createRegisterKey: isAdmin,
      revokeRefreshTokensForUser: isAdmin,
      login: !isAuthenticated,
      logout: isAuthenticated,
      updateLastSeen: isAuthenticated,
      removeFromUsersInChat: isAuthenticated,
      addToUsersInChat: isAuthenticated,
      updateUserSettingsNameColor: isAuthenticated,
    },
    Subscription: {
      messageCreated: isAuthenticated,
      userCreated: isAuthenticated,
      usersOnline: isAuthenticated,
      usernameColorChanged: isAuthenticated,
    },
  },
  {
    /*
    By default shield ensures no internal data is exposed to client
     if it was not meant to be. Therefore, all thrown errors 
     during execution resolve in Not Authorised!
      error message if not otherwise specified using error wrapper.
       This can be turned off by setting allowExternalErrors
        option to true
    */
    fallbackRule: allow,
    allowExternalErrors: true,
  }
);

module.exports = permissions;

/*
// this will only allow query1 and query2.
// query3 for instance will be denied
// it will also deny every mutation
// (you can still use `fallbackRule` option with it)
const permissions = shield({
    Query: {
      "*": deny
      query1: allow,
      query2: allow,
    },
    Mutation: {
      "*": deny
    },
  }, {
    fallbackRule: allow
  })
  */
