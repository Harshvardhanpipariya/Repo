const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      process.env.MONGODB_URI,
    );

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // 🔥 Create Time-Series Collection If Not Exists
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const exists = collections.some((c) => c.name === "realtime_sensor_data");

    if (!exists) {
      await db.createCollection("realtime_sensor_data", {
        timeseries: {
          timeField: "timestamp",
          metaField: "meta",
          granularity: "seconds",
        },
      });

      console.log("Time-Series Collection Created 🚀");
    } else {
      console.log("Time-Series Collection Already Exists ✅");
    }

    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
