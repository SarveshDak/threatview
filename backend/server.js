const fs = require('fs');
console.log('server.js running. cwd=', process.cwd());
console.log('./routes/authRoutes.js exists?', fs.existsSync('./routes/authRoutes.js'));
console.log('__dirname:', __dirname);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes.js");
const threatRoutes = require("./routes/threatRoutes");
const alertRoutes = require("./routes/alertRoutes");
const reportRoutes = require("./routes/reportRoutes");



const app = express();
app.use(express.json());
app.use(cors());

// Database connect ✅
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB error:", err));

// Register routes ✅
app.use("/api/auth", authRoutes);
app.use("/api/threats", threatRoutes);
app.use("/api/alerts", alertRoutes);
app.use("/api/reports", reportRoutes);

// Test route ✅
app.get("/", (req, res) => {
  res.send("✅ Backend running successfully");
});

// Start server ✅
app.listen(process.env.PORT || 5000, () =>
  console.log(`🚀 Server running on port ${process.env.PORT}`)
);
