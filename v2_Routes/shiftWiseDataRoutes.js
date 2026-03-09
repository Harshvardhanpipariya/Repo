const express = require("express");
const router = express.Router();
const {
  getDeviceShiftData,
  getAllDevicesShiftData,
} = require("../v2_Controllers/Real_Time_Data_Controller/shiftDataController");

// Get shift data for a specific device
//v2/shiftData?device_id=69aaaf4ca573d48d4516d2b6&shift=morning&region_id=69aaadcaa573d48d4516d2b0
router.get("/", getDeviceShiftData);

// Get shift data for all devices
//v2/shiftData/allDevices?shift=morning&region_id=69aaadcaa573d48d4516d2b0
router.get("/allDevices", getAllDevicesShiftData);

module.exports = router;
