const jwt = require("jsonwebtoken");

const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
    },
    process.env.SECRET_KEY_ACCESS_TOKEN,
    { algorithm: "HS256", subject: user._id.toString(), expiresIn: "7d" }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      username: user.username,
      roles: user.roles,
      permissions: user.permissions,
    },
    process.env.SECRET_KEY_REFRESH_TOKEN,
    { algorithm: "HS256", subject: user._id.toString(), expiresIn: "60m" }
  );
};

module.exports = { generateAccessToken, generateRefreshToken };
