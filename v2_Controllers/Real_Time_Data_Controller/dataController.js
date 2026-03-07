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
} = require("./realtimeCalculations");

/**
 * Main handler to insert real-time sensor data into the database
 * Validates device, calculates metrics (distance, fuel, cost), and stores record
 */
const insertRealtimeData = async (req, res) => {
  try {
    console.log(`📡 Received data from device ${req.body._id}`, req.body);

    // Extract device ID, mount info, and sensor readings from request
    const { _id, mounted_to, sensors } = req.body;

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

    console.log("🔍 Previous record:", prev ? prev._id : "None");

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
          mounted_to: mounted_to,
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

    if (movement === "DOWN" || movement === "DOWNHILL") movementNumeric = -10;
    else if (movement === "UP" || movement === "UPHILL") movementNumeric = 10;
    else if (movement === "STABLE" || movement === "FLAT") movementNumeric = 0;
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

    sensorData.distance = distance; // Distance traveled since last record
    sensorData.fuel = segmentFuelResult.fuel; // Fuel consumed (Liters)
    sensorData.fuel_cost = segmentFuelResult.cost; // Cost of fuel consumed (₹)
    sensorData.rl = rl; // Reduced level from altitude

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
        mounted_to: mounted_to,
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

module.exports = { insertRealtimeData, fetchDashboardDataby };
