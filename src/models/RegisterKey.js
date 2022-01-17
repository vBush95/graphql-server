const { model, Schema } = require("mongoose");

const registerKeySchema = new Schema({
  registerKey: String,
  remainingUses: Number,
});

module.exports = model("RegisterKey", registerKeySchema);
