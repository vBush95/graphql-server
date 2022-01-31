const sendRefreshToken = (res, refreshToken) => {
  res.cookie(process.env.SECRET_KEY_COOKIE, refreshToken, {
    sameSite: "none",
    secure: true,
    httpOnly: true,
    path: "/refresh_token",
  });
};

module.exports = sendRefreshToken;
