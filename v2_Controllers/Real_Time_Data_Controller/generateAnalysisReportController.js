const { exec } = require("child_process");
const path = require("path");
const {
  fetchDeviceMonthlyData,
  fetchAllDevicesMonthlyData,
  fetchDeviceShiftData,
  fetchAllDevicesShiftData,
  fetchDeviceDailyData,
  fetchAllDevicesDailyData,
} = require("../../utill/generateAnalysisReportControllerHelper");

/**
 * Generates an analysis report for device sensor data and exports it as an Excel file.
 * 
 * This controller fetches sensor data based on specified filters (device ID, region, time range),
 * processes it through a Python analysis script, and returns the results as an Excel file.
 * 
 * @async
 * @function generateAnalysisReport
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.device_id] - Optional device ID; \
 * @param {string} req.query.region_id - Required. The region identifier for filtering data
 * @param {string} req.query.timeRange - Required. Time range for data: "daily", "monthly", or "shift"
 * @param {string} [req.query.shift] - Required if timeRange is "shift". Format: "6am-2pm", "2pm-10pm", or "10pm-6am"
 * @param {Object} res - Express response object
 * 
 * @returns {void} Sends Excel file as attachment or JSON error response
 * 
 * @throws {400} Bad Request - Missing required parameters or invalid timeRange/shift values
 * @throws {500} Internal Server Error - Python script execution failure, parsing errors, or report generation issues
 * 
 * @example
 * // Request for daily analysis of all devices in a region
 * GET /api/analysis/report?region_id=asia&timeRange=daily
 * 
 * @example
 * // Request for shift-based analysis of a specific device
 * GET /api/analysis/report?device_id=dev123&region_id=asia&timeRange=shift&shift=6am-2pm
 * 
 * @description
 * - Validates input parameters and calculates date ranges based on timeRange
 * - Selects appropriate data fetcher function based on device scope and time range
 * - Fetches sensor data (device ID, timestamp, GPS coordinates, fuel, speed, altitude)
 * - Invokes Python analysis script via child process with serialized data
 * - Parses Python output and converts base64-encoded Excel file to Buffer
 * - Returns Excel file with appropriate headers for file download
 */
const generateAnalysisReport = async (req, res) => {
  try {
    // Extract query parameters from request
    const { device_id, region_id, timeRange, shift } = req.query;

    // Validate required parameters
    if (!region_id || !timeRange) {
      return res.status(400).json({
        error: "region_id and timeRange required",
      });
    }

    // Determine if report is for all devices or a specific device
    const isAllDevices = !device_id;

    // Variables to store data fetcher function and date range
    let dataFetcher;
    let startDate;
    let endDate;

    const now = new Date();

    /* =========================
       TIME RANGE CALCULATION
    ========================== */

    if (timeRange === "monthly") {
      // Set date range for current month
      const year = now.getFullYear();
      const month = now.getMonth();

      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 1);
    } else if (timeRange === "daily") {
      // Set date range for previous 24 hours (from 6am today to 6am yesterday)
      endDate = new Date();
      endDate.setHours(6, 0, 0, 0);

      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 1);
    } else if (timeRange === "shift") {
      // Map shift labels to standardized names and define hour ranges
      const shiftMap = {
        "6am-2pm": "morning",
        "2pm-10pm": "afternoon",
        "10pm-6am": "night",
      };

      const normalizedShift = shiftMap[shift] || shift;

      const shifts = {
        morning: { start: 6, end: 14 },
        afternoon: { start: 14, end: 22 },
        night: { start: 22, end: 6 },
      };

      const shiftInfo = shifts[normalizedShift];

      // Return error if shift is invalid
      if (!shiftInfo) {
        return res.status(400).json({ error: "Invalid shift value" });
      }

      // Calculate start and end times for the shift
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));

      startDate = new Date(startOfDay);
      startDate.setHours(shiftInfo.start, 0, 0, 0);

      endDate = new Date(startOfDay);
      endDate.setHours(shiftInfo.end, 0, 0, 0);

      // Handle night shift spanning midnight
      if (normalizedShift === "night") {
        endDate = new Date(startDate);
        endDate.setHours(30);
      }
    } else {
      // Return error if timeRange is not recognized
      return res.status(400).json({ error: "Invalid timeRange" });
    }

    /* =========================
       SELECT DATA FETCHER
    ========================== */

    // Choose appropriate fetcher based on device scope and time range
    if (isAllDevices) {
      if (timeRange === "shift") dataFetcher = fetchAllDevicesShiftData;
      else if (timeRange === "daily") dataFetcher = fetchAllDevicesDailyData;
      else dataFetcher = fetchAllDevicesMonthlyData;
    } else {
      if (timeRange === "shift") dataFetcher = fetchDeviceShiftData;
      else if (timeRange === "daily") dataFetcher = fetchDeviceDailyData;
      else dataFetcher = fetchDeviceMonthlyData;
    }

    /* =========================
       FETCH DATA
    ========================== */

    // Fetch sensor data from database based on parameters
    let results;

    if (isAllDevices) {
      results = await dataFetcher(region_id, startDate, endDate);
    } else {
      results = await dataFetcher(device_id, region_id, startDate, endDate);
    }

    console.log(`✅ ${results.length} records fetched`);

    /* =========================
       FORMAT DATA FOR PYTHON
    ========================== */

    // Transform fetched data into format expected by Python analysis script
    const pythonInput = {
      data: results.map((row) => ({
        device_id: row.meta?.device_id?.toString(),
        time: row.timestamp,
        lat: parseFloat(row.sensors?.latitude || 0),
        lon: parseFloat(row.sensors?.longitude || 0),
        pitch: parseFloat(row.sensors?.pitch || 0),
        fuel: parseFloat(row.sensors?.fuel || 0),
        speed: parseFloat(row.sensors?.speed || 0),
        alt: parseFloat(row.sensors?.altitude || 0),
      })),
    };

    console.log(`🚀 Sending ${pythonInput.data.length} records to Python...`);

    /* =========================
       RUN PYTHON SCRIPT
    ========================== */

    // Execute Python analysis script and handle its output
    const pythonScript = path.join(__dirname, "../../routes/analysis.py");

    const pythonProcess = exec(
      `python "${pythonScript}"`,
      (error, stdout, stderr) => {
        // Handle Python execution errors
        if (error) {
          console.error("❌ Python error:", error);
          return res.status(500).json({ error: "Analysis failed" });
        }

        // Log Python script output
        if (stderr) {
          console.log("📝 Python log:", stderr);
        }

        try {
          // Parse Python response as JSON
          const result = JSON.parse(stdout);

          // Check for error status in response
          if (result.status === "error") {
            return res.status(500).json({ error: result.error });
          }

          // Ensure report data exists
          if (!result.report) {
            return res.status(500).json({ error: "No report generated" });
          }

          // Decode base64 Excel file to buffer
          const excelBuffer = Buffer.from(result.report, "base64");

          // Generate filename with device info, time range, and current date
          const filename =
            result.filename ||
            `analysis_${device_id || "all"}_${timeRange}_${
              new Date().toISOString().split("T")[0]
            }.xlsx`;

          // Set response headers for Excel file download
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          );

          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${filename}"`,
          );

          res.setHeader("Content-Length", excelBuffer.length);

          // Send Excel file as response
          res.send(excelBuffer);

          console.log(`✅ Excel report sent: ${filename}`);
        } catch (e) {
          // Handle JSON parsing errors
          console.error("❌ Failed to parse Python output:", e);

          res.status(500).json({
            error: "Invalid response from analysis engine",
          });
        }
      },
    );

    // Send formatted data to Python script via stdin
    pythonProcess.stdin.write(JSON.stringify(pythonInput));
    pythonProcess.stdin.end();
  } catch (error) {
    // Handle unexpected errors during execution
    console.error("Analysis Report Error:", error);

    res.status(500).json({
      error: "Failed to generate analysis report",
    });
  }
};

module.exports = { generateAnalysisReport };
