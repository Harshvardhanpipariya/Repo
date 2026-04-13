// models/RealtimeSensorData.js
const mongoose = require("mongoose");

const realtimeSensorDataSchema = new mongoose.Schema(
  {
    meta: {
      device_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
        required: true,
        index: true,
      },

      equipment_name: {
        type: String,
        required: true,
      },

      region_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Region",
        required: true,
        index: true,
      },
    },

    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    sensors: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  {
    collection: "realtime_sensor_data",
  },
  { versionKey: false },
);

realtimeSensorDataSchema.index({ timestamp: -1 });
// Index on device_id and timestamp to efficiently query the latest data point per device
realtimeSensorDataSchema.index({ "meta.device_id": 1, timestamp: -1 });

module.exports = mongoose.model("RealtimeSensorData", realtimeSensorDataSchema);
