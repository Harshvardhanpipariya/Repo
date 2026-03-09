const RealtimeSensorData = require("../../v2_Models/RealtimeSensorData");

// Controller function to get the last 10 Z-axis values for each device
const getLast10ZAxis = async (req, res) => {
    try {
        // Aggregate sensor data: sort by device and timestamp, group by device, and get last 10 records
        const rows = await RealtimeSensorData.aggregate([
            {
                // Sort by device ID ascending, then by timestamp descending (most recent first)
                $sort: {
                    "meta.device_id": 1,
                    timestamp: -1
                }
            },
            {
                // Group records by device ID and collect all records into an array
                $group: {
                    _id: "$meta.device_id",
                    records: {
                        $push: {
                            z_axis: "$sensors.pitch",
                            timestamp: "$timestamp"
                        }
                    }
                }
            },
            {
                // Limit each device to only the last 10 records
                $project: {
                    records: { $slice: ["$records", 10] }
                }
            }
        ]);

        // Initialize object to store formatted data by device
        const haulerData = {};

        // Transform aggregated data into the response format
        rows.forEach(row => {
            const device = row._id;
            
            // Convert Z-axis values to numbers and format records
            haulerData[device] = row.records.map(r => ({
                z_axis: Number(r.z_axis),
                timestamp: r.timestamp
            }));
        });

        // Send formatted data as JSON response
        res.json(haulerData);

    } catch (err) {
        // Log error and send error response
        console.error("Error fetching last 10 z_axis per device:", err);
        res.status(500).json({ error: "Error fetching z_axis values" });
    }
};

module.exports = getLast10ZAxis;