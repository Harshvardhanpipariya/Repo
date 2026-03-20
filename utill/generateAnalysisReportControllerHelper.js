const mongoose = require("mongoose");
const RealtimeSensorData = require("../v2_Models/RealtimeSensorData");

/* =========================
  Monthly Queries
========================= */

/**
 * Fetch sensor data for a specific device within a monthly date range
 * @param {string} device_id - The device ObjectId to filter by
 * @param {string} region_id - The region ObjectId to filter by
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (exclusive)
 * @returns {Promise<Array>} Array of sensor documents sorted by timestamp
 */
const fetchDeviceMonthlyData = async (
  device_id,
  region_id,
  startDate,
  endDate,
) => {
  const query = {
    timestamp: { $gte: startDate, $lt: endDate },
  };

  // Add device filter if a valid ObjectId is provided
  if (device_id && mongoose.Types.ObjectId.isValid(device_id)) {
    query["meta.device_id"] = new mongoose.Types.ObjectId(device_id);
  }

  // Add region filter if a valid ObjectId is provided
  if (region_id && mongoose.Types.ObjectId.isValid(region_id)) {
    query["meta.region_id"] = new mongoose.Types.ObjectId(region_id);
  }

  return RealtimeSensorData.find(query).sort({ timestamp: 1 }).lean();
};

/**
 * Fetch sensor data for all devices in a region within a monthly date range
 * @param {string} region_id - The region ObjectId to filter by
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (exclusive)
 * @returns {Promise<Array>} Array of sensor documents sorted by device_id then timestamp
 */
const fetchAllDevicesMonthlyData = async (region_id, startDate, endDate) => {
  const query = {
    timestamp: { $gte: startDate, $lt: endDate },
  };

  // Add region filter if a valid ObjectId is provided
  if (region_id && mongoose.Types.ObjectId.isValid(region_id)) {
    query["meta.region_id"] = new mongoose.Types.ObjectId(region_id);
  }

  return RealtimeSensorData.find(query)
    .sort({ "meta.device_id": 1, timestamp: 1 })
    .lean();
};

/* =========================
  Shift Queries
========================= */

/**
 * Fetch sensor data for a specific device within a shift date range
 * @param {string} device_id - The device ObjectId to filter by
 * @param {string} region_id - The region ObjectId to filter by
 * @param {Date} startDate - Start of the shift period (inclusive)
 * @param {Date} endDate - End of the shift period (exclusive)
 * @returns {Promise<Array>} Array of sensor documents sorted by timestamp
 */
const fetchDeviceShiftData = async (
  device_id,
  region_id,
  startDate,
  endDate,
) => {
  const query = {
    timestamp: { $gte: startDate, $lt: endDate },
  };

  // Add device filter if a valid ObjectId is provided
  if (device_id && mongoose.Types.ObjectId.isValid(device_id)) {
    query["meta.device_id"] = new mongoose.Types.ObjectId(device_id);
  }

  // Add region filter if a valid ObjectId is provided
  if (region_id && mongoose.Types.ObjectId.isValid(region_id)) {
    query["meta.region_id"] = new mongoose.Types.ObjectId(region_id);
  }

  return RealtimeSensorData.find(query).sort({ timestamp: 1 }).lean();
};

/**
 * Fetch sensor data for all devices in a region within a shift date range
 * @param {string} region_id - The region ObjectId to filter by
 * @param {Date} startDate - Start of the shift period (inclusive)
 * @param {Date} endDate - End of the shift period (exclusive)
 * @returns {Promise<Array>} Array of sensor documents sorted by device_id then timestamp
 */
const fetchAllDevicesShiftData = async (region_id, startDate, endDate) => {
  const query = {
    timestamp: { $gte: startDate, $lt: endDate },
  };

  // Add region filter if a valid ObjectId is provided
  if (region_id && mongoose.Types.ObjectId.isValid(region_id)) {
    query["meta.region_id"] = new mongoose.Types.ObjectId(region_id);
  }

  return RealtimeSensorData.find(query)
    .sort({ "meta.device_id": 1, timestamp: 1 })
    .lean();
};

/* =========================
  Daily Queries
========================= */

/**
 * Fetch sensor data for a specific device within a daily date range
 * @param {string} device_id - The device ObjectId to filter by
 * @param {string} region_id - The region ObjectId to filter by
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (inclusive)
 * @returns {Promise<Array>} Array of sensor documents sorted by timestamp in descending order
 */
const fetchDeviceDailyData = async (
  device_id,
  region_id,
  startDate,
  endDate,
) => {
  const query = {
    timestamp: { $gte: startDate, $lte: endDate },
  };

  // Add device filter if a valid ObjectId is provided
  if (device_id && mongoose.Types.ObjectId.isValid(device_id)) {
    query["meta.device_id"] = new mongoose.Types.ObjectId(device_id);
  }

  // Add region filter if a valid ObjectId is provided
  if (region_id && mongoose.Types.ObjectId.isValid(region_id)) {
    query["meta.region_id"] = new mongoose.Types.ObjectId(region_id);
  }

  return RealtimeSensorData.find(query).sort({ timestamp: -1 }).lean();
};

/**
 * Fetch sensor data for all devices in a region within a daily date range
 * @param {string} region_id - The region ObjectId to filter by
 * @param {Date} startDate - Start of the date range (inclusive)
 * @param {Date} endDate - End of the date range (exclusive)
 * @returns {Promise<Array>} Array of sensor documents sorted by device_id then timestamp
 */
const fetchAllDevicesDailyData = async (region_id, startDate, endDate) => {
  const query = {
    timestamp: { $gte: startDate, $lt: endDate },
  };

  // Add region filter if a valid ObjectId is provided
  if (region_id && mongoose.Types.ObjectId.isValid(region_id)) {
    query["meta.region_id"] = new mongoose.Types.ObjectId(region_id);
  }

  return RealtimeSensorData.find(query)
    .sort({ "meta.device_id": 1, timestamp: 1 })
    .lean();
};

module.export =  {
  fetchDeviceMonthlyData,
  fetchAllDevicesMonthlyData,
  fetchDeviceShiftData,
  fetchAllDevicesShiftData,
  fetchDeviceDailyData,
  fetchAllDevicesDailyData,
};
