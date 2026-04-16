// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    phone_no: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    password: { type: String, required: true },

    access: {
      type: String,
      enum: ["admin", "manager", "user"],
      default: "user",
      index: true,
    },

    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },

    // 🔥 Many-to-Many stored directly
    sector: [{ type: mongoose.Schema.Types.ObjectId, ref: "Sector" }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
