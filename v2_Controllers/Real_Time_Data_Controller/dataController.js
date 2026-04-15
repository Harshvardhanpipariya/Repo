// Import mongoose models for database operations
const RealtimeSensorData = require("../../v2_Models/RealtimeSensorData");
const Device = require("../../v2_Models/Device");
const Region = require("../../v2_Models/Region");

// Import utility functions and constants for real-time calculations
const {
  calculateFuelAndCost,
  removeEmptyFields,
  haversineKm,
  SEA_LEVEL_RL,
} = require("./realTimeCalculations");

/**
 * Main handler to insert real-time sensor data into the database
 * Validates device, calculates metrics (distance, fuel, cost), and stores record
 */
const insertRealtimeData = async (req, res) => {
  try {
    console.log(`📡 Received data from device ${req.body._id}`, req.body);

    // Extract device ID, mount info, and sensor readings from request
    const { _id, equipment_name, sensors } = req.body;

    // Validate required device ID
    if (!_id) {
      return res.status(400).json({
        error: "device _id is required",
      });
    }

    // Record current timestamp for this data point
    const deviceTimestamp = new Date();

    // Initialize sensor data, default to empty object if not provided
    let sensorData = sensors || {};

    // Query database for the device
    const device = await Device.findOne({ _id });

    // Return 404 if device doesn't exist
    if (!device) {
      return res.status(404).json({
        error: `Device ${_id} not registered`,
      });
    }

    console.log(`✅ Device found: ${device} (${_id})`);

    // Validate device has region assignment
    if (!device.region_id) {
      return res.status(400).json({
        error: "Device does not have region_id assigned",
      });
    }

    // Store region ID for metadata
    const region = device.region_id;

    // Fetch the most recent sensor record for this device
    // Used for calculating deltas (distance, time difference, etc.)
    const prev = await RealtimeSensorData.findOne({
      "meta.device_id": _id,
    })
      .sort({ timestamp: -1 })
      .lean();

    console.log("🔍 Previous record:", prev ? prev.sensors.count : "None");

    /*
    ==========================
    FIRST ENTRY CASE
    ==========================
    For the initial data submission, no calculations are performed
    Just store raw sensor data as-is
    */

    if (!prev) {
      console.log("🆕 First entry — storing raw data");

      // Remove null/undefined fields to keep database clean
      sensorData = removeEmptyFields(sensorData);

      // Create new document with metadata and raw sensor readings
      const realtimeDoc = new RealtimeSensorData({
        meta: {
          device_id: _id,
          equipment_name: equipment_name,
          region_id: region,
        },
        timestamp: deviceTimestamp,
        sensors: sensorData,
      });

      // Persist to database
      const saved = await realtimeDoc.save();

      return res.json({
        status: "success",
        message: "First realtime data stored",
        inserted_id: saved._id,
      });
    }

    if (device.device_type == "lora_box") {
      console.log("storing lora box data");

      // Remove null/undefined fields to keep database clean
      sensorData = removeEmptyFields(sensorData);

      // Create new document with metadata and raw sensor readings
      const realtimeDoc = new RealtimeSensorData({
        meta: {
          device_id: _id,
          equipment_name: equipment_name,
          region_id: region,
        },
        timestamp: deviceTimestamp,
        sensors: sensorData,
      });

      // Persist to database
      const saved = await realtimeDoc.save();
      console.log("stored lora box data");
      return res.json({
        status: "success",
        message: "Lora box data stored",
        inserted_id: saved._id,
      });
    } else if (device.device_type == "kache_box") {
      console.log("storing kache box data");

      /*
    ==========================
    NORMAL FLOW (Subsequent entries)
    ==========================
    Calculate delta metrics compared to previous record
    */

      // Parse current GPS latitude
      const latitude =
        sensorData.latitude !== undefined
          ? parseFloat(sensorData.latitude)
          : null;

      // Parse current GPS longitude
      const longitude =
        sensorData.longitude !== undefined
          ? parseFloat(sensorData.longitude)
          : null;

      // Parse pitch/inclination (default 0 if flat)
      const pitch =
        sensorData.pitch !== undefined ? parseFloat(sensorData.pitch) : 0;

      // Parse altitude above sea level
      const altitude =
        sensorData.altitude !== undefined
          ? parseFloat(sensorData.altitude)
          : null;

      // Movement direction or status
      const movement = sensorData.movement || "FLAT";

      // Initialize calculation variables
      let distance = 0; // Haversine distance in km
      let timeDiffHours = 0; // Time elapsed since last reading

      // Extract previous coordinates
      const prevLat = prev.sensors?.latitude;
      const prevLon = prev.sensors?.longitude;

      // Calculate distance traveled using Haversine formula
      // Only if both previous and current coordinates exist
      if (
        prevLat !== undefined &&
        prevLon !== undefined &&
        latitude !== null &&
        longitude !== null
      ) {
        distance = haversineKm(
          [parseFloat(prevLat), parseFloat(prevLon)],
          [latitude, longitude],
        );
      }

      // Calculate time elapsed since previous reading (in hours)
      const prevTime = new Date(prev.timestamp);
      timeDiffHours = Math.max(0, (deviceTimestamp - prevTime) / 3600000);

      /*
    ==========================
    MOVEMENT CONVERSION
    Movement text strings converted to numeric values for calculations
    ==========================
    */

      let movementNumeric = 0;

      const movementRaw = sensorData.movement || "FLAT";
      const movement = movementRaw.toUpperCase();

      if (movement === "DOWN" || movement === "DOWNHILL") movementNumeric = -10;
      else if (movement === "UP" || movement === "UPHILL") movementNumeric = 10;
      else if (movement === "STABLE" || movement === "FLAT")
        movementNumeric = 0;
      else movementNumeric = parseFloat(movement) || 0;

      /*
    ==========================
    FUEL CALCULATION
    Compute fuel consumption and associated cost based on metrics
    ==========================
    */

      const segmentFuelResult = calculateFuelAndCost(
        distance,
        pitch,
        movementNumeric,
        _id,
        timeDiffHours,
      );

      /*
    ==========================
    RL (Reduced Level) CALCULATION
    Convert altitude to RL using sea level reference point
    ==========================
    */

      const rl =
        altitude !== null ? Number((altitude + SEA_LEVEL_RL).toFixed(2)) : null;

      /*
    ==========================
    ADD CALCULATED VALUES TO SENSOR DATA
    ==========================
    */
      console.log(
        "🚀 movementNumeric:",
        movementNumeric,
        typeof movementNumeric,
      );
      sensorData.distance = distance; // Distance traveled since last record
      sensorData.fuel = segmentFuelResult.fuel; // Fuel consumed (Liters)
      sensorData.fuel_cost = segmentFuelResult.cost; // Cost of fuel consumed (₹)
      sensorData.rl = rl; // Reduced level from altitude
      sensorData.movement = movementNumeric;
      // Clean up null/undefined fields before storage
      sensorData = removeEmptyFields(sensorData);

      console.log("📦 Final Sensors Data:", sensorData);

      /*
    ==========================
    SAVE DOCUMENT TO DATABASE
    ==========================
    */

      const realtimeDoc = new RealtimeSensorData({
        meta: {
          device_id: _id,
          equipment_name: equipment_name,
          region_id: region,
        },
        timestamp: deviceTimestamp,
        sensors: sensorData,
      });

      console.log("💾 Saving document to database...");
      const saved = await realtimeDoc.save();

      // Log final calculated metrics
      console.log("\n✅ FINAL RESULT");
      console.log(`Device: ${_id}`);
      console.log(`Distance: ${(distance * 1000).toFixed(2)} m`);
      console.log(`Fuel: ${(segmentFuelResult.fuel * 1000).toFixed(2)} mL`);
      console.log(`Fuel Cost: ₹${segmentFuelResult.cost.toFixed(4)}`);
      console.log(`RL: ${rl}\n`);

      // Return success response with inserted document ID
      res.json({
        status: "success",
        message: "Realtime data stored",
        inserted_id: saved._id,
      });
    }
  } catch (error) {
    // Handle any database or processing errors
    console.error("❌ Insert error:", error);

    res.status(500).json({
      error: "Database error",
      message: error.message,
    });
  }
};

/* this controller use to take companyid and region and give back you last entery as per device in that company and region */
const fetchDashboardDataby = async (req, res) => {
  try {
    const { companyId, region } = req.query;

    if (!companyId || !region) {
      return res.status(400).json({
        error: "Company and region are required",
      });
    }
    console.log(
      `📊 Fetching dashboard data for company ${companyId}, region ${region}`,
    );
    const regionName = region.trim();

    // 1️⃣ Find region belonging to company
    const regionDoc = await Region.findOne({
      region_name: regionName,
      company: companyId,
    });

    console.log(regionDoc);
    if (!regionDoc) {
      return res.status(404).json({
        error: "Region not found",
      });
    }

    // 2️⃣ Find devices in that region
    const devices = await Device.find({
      region_id: regionDoc._id,
    }).select("_id region_id");

    console.log(`🔍 Found ${devices[0]._id} devices in region ${regionName}`);

    if (!devices.length) {
      return res.status(404).json({
        error: "No devices found",
      });
    }

    // 3️⃣ Fetch latest realtime sensor data for each device
    const deviceIds = devices.map((d) => d._id);

    console.log(`📡 Fetching realtime data for devices: ${deviceIds}`);

    // MongoDB aggregation pipeline to get latest data point per device
    const results = await RealtimeSensorData.aggregate([
      {
        $match: {
          "meta.region_id": regionDoc._id,
          "meta.device_id": { $in: deviceIds },
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: "$meta.device_id",
          device_name: { $first: "$meta.mounted_to" },
          timestamp: { $first: "$timestamp" },
          sensors: { $first: "$sensors" },
        },
      },
    ]);

    // ✅ If realtime data exists

    return res.json({
      status: "success",
      source: "realtime_sensor_data",
      company: companyId,
      region: regionName,
      totalDevices: results.length,
      devices: results.map((r) => ({
        device_id: r._id,
        device_name: r.device_name,
        timestamp: r.timestamp,
        sensors: r.sensors,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error",
    });
  }
};

const fetchMinePlannerData = async (req, res) => {
  try {
    const { companyId, region } = req.query;

    if (!companyId || !region) {
      return res.status(400).json({
        error: "companyId and region are required",
      });
    }

    const regionName = region.trim();

    // 1️⃣ Find region
    const regionDoc = await Region.findOne({
      region_name: regionName,
      company: companyId,
    });

    if (!regionDoc) {
      return res.status(404).json({ error: "Region not found" });
    }

    // 2️⃣ Devices
    const devices = await Device.find({
      region_id: regionDoc._id,
      device_type: "kache_box",
    }).select("_id device_name");

    if (!devices.length) {
      return res.status(404).json({
        error: "No kache devices found",
      });
    }

    const deviceIds = devices.map((d) => d._id);

    // 🕒 Time
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // =========================================================
    // 1️⃣ LAT/LONG (24h + fallback)
    // =========================================================
    const nowUTC = new Date();
    const last24HoursUTC = new Date(nowUTC.getTime() - 24 * 60 * 60 * 1000);

    // ✅ SINGLE QUERY FOR ALL DEVICES
    const locationData = await RealtimeSensorData.find({
      "meta.device_id": { $in: deviceIds },
      timestamp: {
        $gte: last24HoursUTC,
        $lte: nowUTC,
      },
    })
      .sort({ "meta.device_id": 1, timestamp: 1 }) // group-friendly sort
      .select("meta.device_id timestamp sensors.latitude sensors.longitude");

    console.log(
      `📍 Fetched ${locationData} location records for last 24h for devices in region ${regionName}`,
    );
    // ✅ GROUP IN MEMORY
    const latLongMap = {};

    locationData.forEach((d) => {
      if (!d?.meta?.device_id) return;

      const id = d.meta.device_id.toString();

      if (!latLongMap[id]) latLongMap[id] = [];

      const lat = d.sensors?.get("latitude");
      const lng = d.sensors?.get("longitude");

      if (lat == null || lng == null) return;

      latLongMap[id].push({
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        timestamp: d.timestamp,
      });
    });
    // =========================================================
    // 2️⃣ LAST 6
    // =========================================================
    const last6Data = await RealtimeSensorData.aggregate([
      {
        $match: {
          "meta.device_id": { $in: deviceIds },
        },
      },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$meta.device_id",
          entries: {
            $push: {
              timestamp: "$timestamp",
              sensors: "$sensors",
            },
          },
        },
      },
      {
        $project: {
          entries: { $slice: ["$entries", 6] },
        },
      },
    ]);

    const last6Map = {};
    last6Data.forEach((d) => {
      last6Map[d._id.toString()] = d.entries;
    });

    // =========================================================
    // 3️⃣ FUEL
    // =========================================================
    const fuelData = await RealtimeSensorData.aggregate([
      {
        $match: {
          "meta.device_id": { $in: deviceIds },
          timestamp: { $gte: last7Days },
        },
      },
      {
        $group: {
          _id: {
            device: "$meta.device_id",
            day: { $dayOfWeek: "$timestamp" },
          },
          totalFuel: { $sum: "$sensors.fuel" },
        },
      },
    ]);

    const daysMap = {
      1: "Sunday",
      2: "Monday",
      3: "Tuesday",
      4: "Wednesday",
      5: "Thursday",
      6: "Friday",
      7: "Saturday",
    };

    const fuelMap = {};

    fuelData.forEach((d) => {
      const deviceId = d._id.device.toString();
      const dayName = daysMap[d._id.day];

      if (!fuelMap[deviceId]) fuelMap[deviceId] = {};
      fuelMap[deviceId][dayName] = d.totalFuel;
    });

    const orderedDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    // =========================================================
    // FINAL RESPONSE
    // =========================================================
    const equipmentList = devices.map((device) => {
      const id = device._id.toString();

      const latestSensor = last6Map[id]?.[0]?.sensors || {};

      const fuelWeek = {};
      orderedDays.forEach((day) => {
        fuelWeek[day] = fuelMap[id]?.[day] || 0;
      });

      return {
        vehicleId: id,
        name: device.device_name,

        latitude: latestSensor.latitude || null,
        longitude: latestSensor.longitude || null,
        altitude: latestSensor.altitude || null,

        latLong_24h: latLongMap[id] || [],
        last6Entries: last6Map[id] || [],

        fuelCost_week: fuelWeek,
      };
    });

    return res.json({
      status: "success",
      device_type: "kache_box",
      totalDevices: equipmentList.length,
      equipmentList,
    });
  } catch (err) {
    console.error("❌ Mine Planner Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const fetchDumpCount = async (req, res) => {
  try {
    const { companyId, region } = req.query;

    if (!companyId || !region) {
      return res.status(400).json({
        error: "Company and region are required",
      });
    }

    const regionName = region.trim();

    // 1️⃣ Find region
    const regionDoc = await Region.findOne({
      region_name: regionName,
      company: companyId,
    });

    if (!regionDoc) {
      return res.status(404).json({
        error: "Region not found",
      });
    }

    // 2️⃣ Get devices
    const devices = await Device.find({
      region_id: regionDoc._id,
      device_type: "lora_box",
    }).select("_id device_name");

    if (!devices.length) {
      return res.status(404).json({
        error: "No devices found",
      });
    }

    const deviceIds = devices.map((d) => d._id);

    // 3️⃣ Get latest entry per device
    const latestData = await RealtimeSensorData.aggregate([
      {
        $match: {
          "meta.device_id": { $in: deviceIds },
        },
      },
      {
        $sort: { timestamp: -1 },
      },
      {
        $group: {
          _id: "$meta.device_id",
          timestamp: { $first: "$timestamp" },
          sensors: { $first: "$sensors" },
        },
      },
    ]);

    // 4️⃣ Convert to frontend format
    const responseMap = {};

    devices.forEach((device) => {
      const id = device._id.toString();

      const found = latestData.find((d) => d._id.toString() === id);

      // 🔥 IMPORTANT: sensors is Map → convert
      let count = 0;

      if (found?.sensors) {
        const sensorsObj =
          found.sensors instanceof Map
            ? Object.fromEntries(found.sensors)
            : found.sensors;

        count = sensorsObj.count || 0; // 👈 YOUR DUMP COUNT FIELD
      }

      responseMap[id] = {
        device_name: device.device_name,
        latest: {
          count,
          timestamp: found?.timestamp || null,
        },
      };
    });

    return res.json({
      status: "success",
      company: companyId,
      region: regionName,
      totalDevices: devices.length,
      devices: responseMap,
    });
  } catch (err) {
    console.error("❌ Dump Count Error:", err);
    res.status(500).json({
      error: "Server error",
    });
  }
};
module.exports = {
  insertRealtimeData,
  fetchDashboardDataby,
  fetchMinePlannerData,
  fetchDumpCount,
};
