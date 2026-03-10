const {generateAnalysisReport} = require("../v2_Controllers/Real_Time_Data_Controller/generateAnalysisReportController");
const express = require("express");
const router = express.Router();


router.get("/", generateAnalysisReport);

module.exports = router;