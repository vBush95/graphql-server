const User = require("./models/User");

const checkRefreshToken = async (req, res) => {
  const token = req.cookies[process.env.SECRET_KEY_COOKIE];
  if (!token) {
    return res.send({ ok: false, accessToken: "" });
  }
  let payload = null;
  try {
    payload = verify(token, process.env.SECRET_KEY_REFRESH_TOKEN);
  } catch (err) {
    console.log(err);
    return res.send({ ok: false, accessToken: "" });
  }

  //if we get here token is valid and we can send back an access token
  const user = await User.findOne({ username: payload.username });

  if (!user) {
    return res.send({ ok: false, accessToken: "" });
  }

  return res.send({ ok: true, accessToken: generateAccessToken(user) });
};

module.exports = checkRefreshToken;
