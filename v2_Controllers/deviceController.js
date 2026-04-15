const device = require("../v2_Models/Device");
const region = require("../v2_Models/Region");

const createDevice = async (req, res) => {
  try {
    const {
      device_name,
      device_type,
      region_name,
      installation_date,
      software_version,
    } = req.body;

    if (!device_name || !device_type || !region_name) {
      return res
        .status(400)
        .json({ message: "Device name and region name are required" });
    }

    const regionId = await region.findOne({ region_name });
    console.log("Region ID found:", regionId._id);
    const newDevice = new device({
      device_name: device_name,
      region_id: regionId._id,
      installation_date: installation_date,
      software_version: software_version,
      device_type: device_type,
    });
    await newDevice.save();
    res.status(201).json(newDevice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const fetchAllDevices = async (req, res) => {
  try {
    const devices = await device.find();
    console.log("Devices fetched:", devices);
    res.status(200).json(devices);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDevice,
  fetchAllDevices,
};
