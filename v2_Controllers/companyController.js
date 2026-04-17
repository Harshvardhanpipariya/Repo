const Company = require("../v2_Models/Company");
const Sector = require("../v2_Models/Sector");

/* =========================
   CREATE COMPANY (Setter)
========================= */
const createCompany = async (req, res) => {
  try {
    const { company_name, company_mail, company_location, sector_name } =
      req.body;

    if (!company_name || !company_mail || !company_location || !sector_name) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // 🔎 Find sector by name
    const sector = await Sector.findOne({ sector_name });

    if (!sector) {
      return res.status(404).json({
        message: "Sector not found",
      });
    }

    // 🔎 Check duplicate company
    const existing = await Company.findOne({ company_name });
    if (existing) {
      return res.status(409).json({
        message: "Company already exists",
      });
    }

    const newCompany = await Company.create({
      company_name,
      company_mail,
      company_location,
      sector: sector._id,
    });

    return res.status(201).json({
      message: "Company created successfully",
      company: newCompany,
    });
  } catch (error) {
    console.error("Error creating company:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   GET COMPANIES BY SECTOR (Getter)
========================= */
const getCompanies = async (req, res) => {
  try {
    const { sector } = req.query;

    console.log("Received sector query:", sector);
    if (!sector) {
      return res.status(400).json({
        message: "Sector is required",
      });
    }

    // 🔎 Find sector by name
    const sectorDoc = await Sector.findOne({ sector_name: sector });

    if (!sectorDoc) {
      return res.status(404).json({
        message: "Sector not found",
      });
    }

    const companies = await Company.find({
      sectors: sectorDoc._id,
    })
      .select("company_name company_mail company_location")
      .sort({ createdAt: 1 });

    return res.status(200).json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createCompany,
  getCompanies,
};
