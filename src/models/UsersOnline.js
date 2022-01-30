const { model, Schema } = require("mongoose");

const usersOnlineSchema = new Schema({
  users: [
    {
      username: String,
      settings: {
        usernameColor: String,
      },
    },
  ],
});

module.exports = model("UsersOnline", usersOnlineSchema);
