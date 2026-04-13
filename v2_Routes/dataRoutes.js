const express = require("express");
const router = express.Router();
const {
  insertRealtimeData,
  fetchDashboardDataby,
  fetchMinePlannerData
} = require("../v2_Controllers/Real_Time_Data_Controller/DataController");
const authenticateToken = require("../v2_Middlewares/authMiddleware");

// router.use(authenticateToken); // Apply authentication middleware to all routes in this router

/// Example of the expected JSON body for inserting real-time sensor data sensors can be dynamic
// and may include various types of sensor readings
// id is device id, mounted_to is the vehicle / machine where our device pluggedin,
// such as GPS coordinates, speed, pressure, etc.
// {
//   "_id": "69a9348240ca32af3d6ab83d",
//   "mounted_to": "D1",
//   "sensors": {
//     "latitude": 42.96180,
//     "longitude": 97.73640,
//     "altitude": 1009,
//     "speed": 20.40,
//     "pressure": 0,
//     "pitch": -72.6,
//     "roll": -0.19
//   }
// }
router.post("/insert", insertRealtimeData);

// /fetchDashboardDataBy?companyId=5fasarq2342&region=North
router.get("/fetchDashboardDataBy", fetchDashboardDataby);


router.get("/fetchMinePlannerData", fetchMinePlannerData);  
module.exports = router;
