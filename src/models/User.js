const { model, Schema } = require("mongoose");

const userSchema = new Schema({
  username: String,
  password: String,
  tokenVersion: { type: Number, default: 0 },
  email: String,
  createdAt: String,
  roles: { type: [String], default: ["USER"] },
  permissions: { type: [String], default: ["useChat", "read_own_user"] },
  lastSeen: String,
  settings: {
    usernameColor: { type: String, default: "white" },
  },
});

module.exports = model("User", userSchema);
