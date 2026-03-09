const RealtimeSensorData = require("../../v2_Models/RealtimeSensorData");

// Retrieves monthly data for a specific device in a specific region
const getDeviceMonthlyData = async (req, res) => {
  try {
    // Extract device_id and region_id from query parameters
    const { device_id, region_id } = req.query;

    // Validate that both device_id and region_id are provided
    if (!device_id || !region_id) {
      return res.status(400).json({
        error: "device_id and region_id required",
      });
    }

    // Get current date and calculate month boundaries
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based

    // First day of current month
    const startDate = new Date(year, month, 1);

    // First day of next month (exclusive upper bound)
    const endDate = new Date(year, month + 1, 1);

    // Query database for sensor data matching device and region during this month
    const results = await RealtimeSensorData.find({
      "meta.device_id": device_id,
      "meta.region_id": region_id,
      timestamp: {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .sort({ timestamp: 1 })
      .lean();

    // Return successful response with results
    res.json({
      status: "success",
      device_id,
      region_id,
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      date_range: {
        from: startDate,
        to: endDate,
      },
      total_records: results.length,
      data: results,
    });
  } catch (error) {
    // Handle database errors
    console.error("Error:", error);
    res.status(500).json({
      error: "Database error",
    });
  }
};



// Retrieves monthly data for all devices in a specific region
const getAllDevicesMonthlyData = async (req, res) => {
  try {
    // Extract region_id from query parameters
    const { region_id } = req.query;

    // Validate that region_id is provided
    if (!region_id) {
      return res.status(400).json({
        error: "region_id required",
      });
    }

    // Get current date and calculate month boundaries
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based (0 = January)

    // First day of current month
    const startDate = new Date(year, month, 1);

    // First day of next month (exclusive upper bound)
    const endDate = new Date(year, month + 1, 1);

    // Query database for all sensor data in the region during this month
    const results = await RealtimeSensorData.find({
      "meta.region_id": region_id,
      timestamp: {
        $gte: startDate,
        $lt: endDate,
      },
    })
      .sort({
        "meta.device_id": 1,
        timestamp: 1,
      })
      .lean();

    // Return successful response with results
    res.json({
      status: "success",
      region_id,
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      date_range: {
        from: startDate,
        to: endDate,
      },
      total_records: results.length,
      data: results,
    });
  } catch (error) {
    // Handle database errors
    console.error("Error:", error);
    res.status(500).json({
      error: "Database error",
    });
  }
};

module.exports = { getDeviceMonthlyData, getAllDevicesMonthlyData };
