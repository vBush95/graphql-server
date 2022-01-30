const expressJwt = require("express-jwt");

const jwtMiddleware = expressJwt({
  secret: process.env.SECRET_KEY_ACCESS_TOKEN,
  algorithms: ["HS256"],
  credentialsRequired: false,
  /*
  getToken: function fromHeaderOrQuerystring(req) {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      return req.headers.authorization.split(" ")[1];
    } else if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  },
  */
});

module.exports = jwtMiddleware;
