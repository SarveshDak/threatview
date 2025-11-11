const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Threat Intelligence Report",
    },
    summary: {
      totalThreats: Number,
      activeThreats: Number,
      totalAlerts: Number,
      criticalAlerts: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Report", reportSchema);
