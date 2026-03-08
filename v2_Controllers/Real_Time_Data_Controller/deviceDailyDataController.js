const RealtimeSensorData = require("../../v2_Models/RealtimeSensorData");
const mongoose = require("mongoose");
const { formatIST } = require("./realTimeCalculations");

/**
 * Retrieves daily sensor data for a specific device and region within a 24-hour window.
 *
 * This function fetches real-time sensor data records from the database for the given device_id and region_id.
 * It calculates a time range from 6:00 AM of the previous day to 6:00 AM of the current day (IST, assuming formatIST handles timezone).
 * The data is queried from the RealtimeSensorData collection, sorted by timestamp in descending order.
 *
 * @param {Object} req - The HTTP request object, expected to contain query parameters 'device_id' and 'region_id'.
 * @param {Object} res - The HTTP response object used to send back the JSON response.
 *
 * @returns {Object} A JSON response with status 'success', including device_id, region_id, total_records count, and the data array.
 *                  On error, returns a 400 status for missing parameters or 500 for database errors.
 *
 * @throws {Error} If database query fails, logs the error and returns a 500 status with "Database error".
 */
const getDeviceDailyData = async (req, res) => {
  try {
    const { device_id, region_id } = req.query;

    if (!device_id || !region_id) {
      return res.status(400).json({
        error: "device_id and region_id required",
      });
    }

    const deviceObjectId = new mongoose.Types.ObjectId(device_id);
    const regionObjectId = new mongoose.Types.ObjectId(region_id);

    const endDate = new Date();
    endDate.setHours(6, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);

    const results = await RealtimeSensorData.find({
      "meta.device_id": deviceObjectId,
      "meta.region_id": regionObjectId,
      timestamp: { $gte: startDate, $lte: endDate },
    })
      .sort({ timestamp: -1 })
      .lean();

    console.log(
      `Fetched ${results.length} records for device_id: ${device_id} in region_id: ${region_id} from ${formatIST(startDate)} to ${formatIST(endDate)}`,
    );

    res.json({
      status: "success",
      device_id,
      region_id,
      total_records: results.length,
      data: results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Database error",
    });
  }
};

/**
 * Retrieves all real-time sensor data for devices within a specified region for the current 24-hour period (6 AM to 6 AM).
 *
 * @async
 * @function getAllDevicesDailyData
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} req.query.region_id - MongoDB ObjectId of the region (required)
 * @param {Object} res - Express response object
 *
 * @returns {Object} JSON response object
 * @returns {string} returns.status - Status of the request ("success" or error)
 * @returns {string} returns.region_id - The queried region ID
 * @returns {Object} returns.period - Time period information
 * @returns {Date} returns.period.from - Start timestamp (today at 6 AM)
 * @returns {Date} returns.period.to - End timestamp (tomorrow at 6 AM)
 * @returns {string} returns.period.duration - Duration label ("24 hours")
 * @returns {number} returns.total_records - Total number of records after filtering
 * @returns {number} returns.devices - Number of unique devices found
 * @returns {Array} returns.data - Array of sensor records with null/undefined values removed
 * @returns {Object} returns.grouped_by_device - Sensor records grouped by device ID
 *
 * @throws {Error} Returns 400 status if region_id is not provided
 * @throws {Error} Returns 500 status if database query fails
 *
 * @description
 * - Validates that region_id query parameter is provided
 * - Queries RealtimeSensorData collection for records within the 24-hour period (6 AM to 6 AM)
 * - Filters out null and undefined values from results
 * - Groups results by device_id for easier processing
 * - Returns both flattened and grouped data structures
 */
const getAllDevicesDailyData = async (req, res) => {
  try {
    const { region_id } = req.query;

    if (!region_id) {
      return res.status(400).json({ error: "region_id required" });
    }

    const regionObjectId = new mongoose.Types.ObjectId(region_id);

    const today = new Date();

    const endDate = new Date();
    endDate.setHours(6, 0, 0, 0);

    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);

    console.log(
      `Fetching data for region_id: ${region_id} from ${formatIST(startDate)} to ${formatIST(endDate)}`,
    );
    const results = await RealtimeSensorData.find({
      "meta.region_id": regionObjectId,
      timestamp: {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .sort({ "meta.device_id": 1, timestamp: 1 })
      .lean();

    // Remove null / undefined values
    const filteredResults = results.map((row) => {
      const filteredRow = {};
      Object.keys(row).forEach((key) => {
        if (row[key] !== null && row[key] !== undefined) {
          filteredRow[key] = row[key];
        }
      });
      return filteredRow;
    });

    // Group by device_id
    const groupedByDevice = {};
    filteredResults.forEach((record) => {
      const deviceId = record.meta.device_id.toString();

      if (!groupedByDevice[deviceId]) {
        groupedByDevice[deviceId] = [];
      }

      groupedByDevice[deviceId].push(record);
    });

    res.json({
      status: "success",
      region_id,
      period: {
        from: startDate,
        to: endDate,
        duration: "24 hours",
      },
      total_records: filteredResults.length,
      devices: Object.keys(groupedByDevice).length,
      data: filteredResults,
      grouped_by_device: groupedByDevice,
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Database error" });
  }
};

module.exports = { getDeviceDailyData, getAllDevicesDailyData };
