const express = require("express");
const router = express.Router();
const getLast10ZAxis = require("../v2_Controllers/Real_Time_Data_Controller/getLast10ZAxis");


// Controller function to get the last 10 Z-axis values
//Example API call: /v2/getLast10ZAxis/
router.get("/", getLast10ZAxis);

module.exports = router;