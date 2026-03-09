const express = require("express");
const router = express.Router();
const {
  getDeviceMonthlyData,
  getAllDevicesMonthlyData,
} = require("../v2_Controllers/Real_Time_Data_Controller/monthlyDataController");

//EXAMPLE: GET /v2/monthlyData?device_id=123&region_id=456
router.get("/", getDeviceMonthlyData);
//EXAMPLE: GET /v2/monthlyData/allDevices?region_id=456
router.get("/allDevices", getAllDevicesMonthlyData);

module.exports = router;
