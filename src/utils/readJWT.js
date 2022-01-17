const jwt = require("jsonwebtoken");
const { AuthenticationError } = require("apollo-server-express");

const readJWT = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split("Bearer ")[1];
    if (token) {
      try {
        const user = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN);

        return user;
      } catch (err) {
        throw new AuthenticationError("Invalid/Expired token");
      }
    }
  }
};

module.exports = readJWT;
