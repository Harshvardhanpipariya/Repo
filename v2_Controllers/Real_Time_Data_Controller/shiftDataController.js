const mongoose = require("mongoose");
const RealtimeSensorData = require("../../v2_Models/RealtimeSensorData");

// Get shift data for a specific device
/**
 * Retrieves sensor data for a specific device during a given shift within a region.
 *
 * @async
 * @function getDeviceShiftData
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.device_id - MongoDB ObjectId of the device
 * @param {string} req.query.shift - Shift identifier ('morning', 'afternoon', or 'night')
 * @param {string} req.query.region_id - MongoDB ObjectId of the region
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response containing:
 * @returns {string} returns.status - Status of the request ('success')
 * @returns {string} returns.device_id - The queried device ID
 * @returns {string} returns.region_id - The queried region ID
 * @returns {string} returns.shift - The queried shift
 * @returns {string} returns.date - ISO date string of the query date
 * @returns {number} returns.total_records - Count of returned records
 * @returns {Array} returns.data - Array of sensor data objects
 *
 * @throws {400} Returns 400 if required parameters are missing or shift is invalid
 * @throws {500} Returns 500 on database query errors
 *
 * @description
 * Queries RealtimeSensorData collection for sensor readings during the specified shift.
 * Shift times are relative to today's date:
 * - morning: 6:00 - 14:00
 * - afternoon: 14:00 - 22:00
 * - night: 22:00 (today) - 6:00 (next day)
 * Results are sorted by timestamp in ascending order.
 */
const getDeviceShiftData = async (req, res) => {
  try {
    const { device_id, shift, region_id } = req.query;

    if (!device_id || !shift || !region_id) {
      return res.status(400).json({
        error: "device_id, shift and region_id required",
      });
    }

    const shifts = {
      morning: { start: 6, end: 14 },
      afternoon: { start: 14, end: 22 },
      night: { start: 22, end: 6 },
    };

    if (!shifts[shift]) {
      return res.status(400).json({ error: "Invalid shift" });
    }

    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const tomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

    let timeFilter = {};

    if (shift === "night") {
      const nightStart = new Date(startOfToday);
      nightStart.setHours(22, 0, 0, 0);

      const nightEnd = new Date(tomorrow);
      nightEnd.setHours(6, 0, 0, 0);

      timeFilter = {
        $or: [
          { timestamp: { $gte: nightStart, $lt: tomorrow } },
          { timestamp: { $gte: startOfToday, $lt: nightEnd } },
        ],
      };
    } else {
      const shiftStart = new Date(startOfToday);
      shiftStart.setHours(shifts[shift].start, 0, 0, 0);

      const shiftEnd = new Date(startOfToday);
      shiftEnd.setHours(shifts[shift].end, 0, 0, 0);

      timeFilter = {
        timestamp: { $gte: shiftStart, $lt: shiftEnd },
      };
    }

    const results = await RealtimeSensorData.find({
      "meta.device_id": new mongoose.Types.ObjectId(device_id),
      "meta.region_id": new mongoose.Types.ObjectId(region_id),
      ...timeFilter,
    })
      .sort({ timestamp: 1 })
      .lean();

    res.json({
      status: "success",
      device_id,
      region_id,
      shift,
      date: startOfToday.toISOString().split("T")[0],
      total_records: results.length,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching shift data:", error);
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * Retrieves sensor data for all devices in a specific region during a given shift.
 *
 * @async
 * @function getAllDevicesShiftData
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.shift - Shift identifier ('morning', 'afternoon', or 'night')
 * @param {string} req.query.region_id - MongoDB ObjectId of the region
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response containing:
 * @returns {string} returns.status - Status of the request ('success')
 * @returns {string} returns.region_id - The queried region ID
 * @returns {string} returns.shift - The queried shift
 * @returns {Date} returns.start_time - Start time of the shift window
 * @returns {Date} returns.end_time - End time of the shift window
 * @returns {number} returns.total_records - Count of returned records
 * @returns {Array} returns.data - Array of sensor data objects sorted by device and timestamp
 *
 * @throws {400} Returns 400 if required parameters are missing or shift is invalid
 * @throws {500} Returns 500 on database query errors
 */
const getAllDevicesShiftData = async (req, res) => {
  try {
    // Extract shift and region_id from query parameters
    const { shift, region_id } = req.query;

    // Validate required parameters
    if (!shift || !region_id) {
      return res.status(400).json({ error: "shift and region_id required" });
    }

    // Convert region_id string to MongoDB ObjectId
    const regionObjectId = new mongoose.Types.ObjectId(region_id);

    // Get today's date and normalize to start of day
    const today = new Date();
    const todayDate = new Date(today.toISOString().split("T")[0]);

    // Define shift time windows
    const shifts = {
      morning: { start: 6, end: 14 },
      afternoon: { start: 14, end: 22 },
      night: { start: 22, end: 6 },
    };

    // Validate shift parameter
    if (!shifts[shift]) {
      return res.status(400).json({ error: "Invalid shift" });
    }

    // Calculate start and end times based on shift type
    let startDate, endDate;

    if (shift === "night") {
      // Night shift spans from 22:00 today to 6:00 tomorrow
      startDate = new Date(todayDate);
      startDate.setHours(22, 0, 0, 0);

      endDate = new Date(todayDate);
      endDate.setDate(endDate.getDate() + 1);
      endDate.setHours(6, 0, 0, 0);
    } else {
      // Morning and afternoon shifts are within the same day
      startDate = new Date(todayDate);
      startDate.setHours(shifts[shift].start, 0, 0, 0);

      endDate = new Date(todayDate);
      endDate.setHours(shifts[shift].end, 0, 0, 0);
    }

    // Query database for all sensor data in the region during the shift
    const results = await RealtimeSensorData.find({
      "meta.region_id": regionObjectId,
      timestamp: {
        $gte: startDate,
        $lt: endDate,
      },
    }).sort({
      "meta.device_id": 1,
      timestamp: 1,
    });

    // Return successful response with shift data
    res.json({
      status: "success",
      region_id,
      shift,
      start_time: startDate,
      end_time: endDate,
      total_records: results.length,
      data: results,
    });
  } catch (error) {
    // Log error and return error response
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = { getDeviceShiftData, getAllDevicesShiftData };
