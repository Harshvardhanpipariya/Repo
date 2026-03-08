/**
 * Daily Data Routes
 *
 * @module routes/dailyDataRoutes
 * @requires express
 * @requires ../v2_Controllers/Real_Time_Data_Controller/deviceDailyDataController
 */

const express = require("express");
const router = express.Router();
const {
  getDeviceDailyData,
  getAllDevicesDailyData,
} = require("../v2_Controllers/Real_Time_Data_Controller/deviceDailyDataController");

/**
 * GET /v2/dailyData
 * Fetch last 24 hours sensor data for a specific device in a region.
 *
 * @route GET /
 * @param {string} region_id - Required query parameter for the region identifier
 * @param {string} device_id - Required query parameter for the device identifier
 * @returns {object} Sensor data from the last 24 hours for the specified device
 */

router.get("/", getDeviceDailyData);

/**
 * GET /v2/dailyData/allDevices
 * Fetch last 24 hours sensor data for all devices.
 *
 * @route GET /allDevices
 * @returns {object} Sensor data from the last 24 hours for all devices
 */
router.get("/allDevices", getAllDevicesDailyData);

module.exports = router;
