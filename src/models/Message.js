const { model, Schema } = require("mongoose");

const messageSchema = new Schema({
  username: String,
  content: String,
  // delets message after x seconds
  createdAt: { type: Date, expires: 120, default: Date.now },
});

messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 120 });

module.exports = model("Message", messageSchema);
