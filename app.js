const express = require("express");
const fetch = require("./routes/fetch");
const insert = require("./routes/insert");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ extended: true, limit: "200mb" }));

// ✅ Serve React build (VERY IMPORTANT)
app.use(express.static(path.join(__dirname, "public")));

// Serve temp models
app.use("/models", express.static("temp_models"));

const PORT = 5001;

// ================= API ROUTES =================

// Company/region APIs
app.get("/getcompanies", fetch.getcompanies);
app.get("/sectors", fetch.getsectors);
app.get("/getregions", fetch.getregions);

// Dashboard APIs
app.get("/api/get_last_10_zaxis", insert.getLast10ZAxis);
app.post("/insert-realtime-data", insert.insertRealtimeData);

// Auth
app.post("/register", insert.register);
app.post("/signin", insert.signin);
app.post("/forgot-password", insert.forgotPassword);
app.post("/register-token", insert.registerToken);

// Data APIs
app.get("/getAll-Devices-MonthlyData", insert.getAllDevicesMonthlyData);
app.get("/getDevice-MonthlyData", insert.getDeviceMonthlyData);
app.get("/getAllDevices-DailyData", insert.getAllDevicesDailyData);
app.get("/getDevice-DailyData", insert.getDeviceDailyData);
app.get("/getAllDevices-ShiftData", insert.getAllDevicesShiftData);
app.get("/getDevice-ShiftData", insert.getDeviceShiftData);

app.get("/generate-analysis", insert.generateAnalysisReport);
app.get("/api/devices", insert.getDevices);
app.get("/fetchDashboardDataby", insert.fetchDashboardDataby);

// Test route
app.post("/test", (req, res) => {
  res.json({ message: "Test successful", received: req.body });
});

// ================= FRONTEND ROUTES =================

// ✅ Root route → also serve React app
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ SPA fallback (VERY IMPORTANT)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});


//********************************************************************/
//+++++++FROM HERE ONWARDS , IM WRITING NEW CODE FOR VERSION 2.0+++++++
//********************************************************************/

const authRoutes = require("./v2_Routes/authRoutes");
const authenticateToken = require("./v2_Middlewares/authMiddleware");
// 🔥 MUST COME BEFORE app.use()
const connectMongoDB = require("./dao/database");
app.use("/v2/auth", authRoutes);
app.use("/v2/sector", require("./v2_Routes/sectorRoutes"));
app.use("/v2/company", require("./v2_Routes/companyRoutes"));
app.use("/v2/regions", require("./v2_Routes/regionRoutes"));
app.use("/v2/data", require("./v2_Routes/dataRoutes"));
app.use("/v2/device", require("./v2_Routes/devicesRoutes"));
app.use("/v2/dailyData", require("./v2_Routes/dailyDataRoutes"));
app.use("/v2/monthlyData", require("./v2_Routes/monthlyDataRoutes"));
app.use("/v2/getLast10ZAxis", require("./v2_Routes/getLast10ZAxisRoute"));
app.use("/v2/shiftData", require("./v2_Routes/shiftWiseDataRoutes"));
app.use("/v2/analysis", require("./v2_Routes/generateAnalysisReportRoutes"));
connectMongoDB();

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on http://0.0.0.0:${PORT}`);
  console.log(`📡 24-hour data endpoints available:`);
  console.log(`   GET /fetch-24h-data?device_id=D3&company=TMC&region=Kache`);
  console.log(`   GET /fetch-all-devices-24h?company=TMC&region=Kache`);
});
