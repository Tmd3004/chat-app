const mongoose = require("mongoose");

const OneToOneMessageSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  messages: [
    {
      to: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      from: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
      },
      type: {
        type: String,
        enum: ["Text", "Media", "Document", "Link"],
      },
      create_at: {
        type: Date,
        default: Date.now(),
      },
      text: {
        type: String,
      },
      file: {
        type: String,
      },
    },
  ],
});

const OneToOneMessage = new mongoose.model(
  "OneToOneMessage",
  OneToOneMessageSchema
);

module.exports = OneToOneMessage;
