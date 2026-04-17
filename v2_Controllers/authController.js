const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../v2_Models/User.js");
const Sector = require("../v2_Models/Sector.js");
const Company = require("../v2_Models/Company.js");
const Region = require("../v2_Models/Region.js");
/* =========================
   LOGIN
========================= */
const logIn = async (req, res) => {
  try {
    let { phone_no, password } = req.body;

    if (!phone_no || !password) {
      return res.status(400).json({
        message: "Phone number and password are required",
      });
    }

    // 🔥 Normalize phone (VERY IMPORTANT)
    const normalizePhone = (phone) => {
      let digits = phone.replace(/\D/g, "");
      if (digits.length === 10) return "+91" + digits;
      if (digits.startsWith("91")) return "+" + digits;
      return "+" + digits;
    };

    phone_no = normalizePhone(phone_no);

    console.log("Normalized phone number:", phone_no);

    // 🔍 Find user + populate
    const user = await User.findOne({ phone_no })
      .populate({
        path: "company",
        select: "company_name company_location sectors",
      })
      .populate({
        path: "regions",
        select: "region_name",
      });
    console.log("User found:", user);
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 🔐 Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    // 🎟 JWT
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        phone_no: user.phone_no,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // ✅ Clean response (BEST PRACTICE)

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone_no: user.phone_no,
        company: {
          id: user.company?._id,
          name: user.company?.company_name,
          location: user.company?.company_location,
        },
        regions: user.regions || [],
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* =========================
   SIGN UP
========================= */
const signUp = async (req, res) => {
  try {
    let { name, email, phone_no, password, company, regions } = req.body;
    console.log("Signup data received:", req.body);
    // 🔎 Basic Validation
    if (!name || !email || !phone_no || !password || !company) {
      return res.status(400).json({
        message: "All required fields are missing",
      });
    }

    // 🔐 PIN validation
    if (!/^\d{4}$/.test(password)) {
      return res.status(400).json({
        message: "PIN must be exactly 4 digits",
      });
    }

    // 🔥 Normalize regions (VERY IMPORTANT)
    const regionArray = regions
      ? [...new Set(Array.isArray(regions) ? regions : [regions])]
      : [];

    console.log("Normalized regions:", regionArray);

    // 🔹 1️⃣ Fetch company
    const companyDoc = await Company.findOne({ company_name: company });

    if (!companyDoc) {
      return res.status(400).json({
        message: "Company is invalid",
      });
    }

    // 🔥 2️⃣ Validate regions (must belong to company)
    let regionIds = [];

    if (regionArray.length > 0) {
      const regionDocs = await Region.find({
        _id: { $in: regionArray },
        company: companyDoc._id, // 🔥 IMPORTANT
      });
      console.log(regionDocs.length, regionArray.length);

      if (regionDocs.length !== regionArray.length) {
        return res.status(400).json({
          message: "One or more regions are invalid for this company",
        });
      }

      regionIds = regionDocs.map((r) => r._id);
    }

    // 🔍 Check duplicate user
    const existingUser = await User.findOne({
      $or: [{ email }, { phone_no }],
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // 🔐 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Create user
    const newUser = await User.create({
      name,
      email,
      phone_no,
      password: hashedPassword,
      company: companyDoc._id,
      regions: regionIds, // 🔥 SAVE REGIONS HERE
    });

    return res.status(201).json({
      message: "Signup successful",
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone_no: newUser.phone_no,
        company: companyDoc.company_name,
        regions: regionArray,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email or phone already exists",
      });
    }

    return res.status(500).json({
      message: "Server error",
    });
  }
};
/* =========================
   FORGOT PASSWORD
========================= */
const forgotPassword = async (req, res) => {
  try {
    const { phone_no, newPassword, confirmPassword } = req.body;

    // 🔎 Required fields check
    if (!phone_no || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Phone number, new password and confirm password are required",
      });
    }

    // 🔐 Check password match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    // 🔐 Validate PIN format (exactly 4 digits)
    if (!/^\d{4}$/.test(newPassword)) {
      return res.status(400).json({
        message: "PIN must be exactly 4 digits",
      });
    }

    const cleanPhone = phone_no.trim();

    // 🔍 Find user
    const user = await User.findOne({ phone_no: cleanPhone });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // 🔐 Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 📝 Update password
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

module.exports = { logIn, signUp, forgotPassword };
