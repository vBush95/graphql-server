const sendRefreshToken = (res, refreshToken) => {
  res.cookie(process.env.SECRET_KEY_COOKIE, refreshToken, {
    httpOnly: true,
    path: "/refresh_token",
  });
};

module.exports = sendRefreshToken;
