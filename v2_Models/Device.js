// models/Device.js
const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    device_name: { type: String, required: true, index: true },
    installation_date: Date,
     device_type: {
      type: String,
      enum: ["lora_box", "kache_box", "TypeC"], // allowed values
      required: true,
      index: true,
    },
    software_version: String,
    region_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Region",
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Device", deviceSchema);
