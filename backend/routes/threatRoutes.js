const express = require("express");
const Threat = require("../models/threat.js");
const axios = require("axios");   // for external API lookup

const router = express.Router();

/**
 * GET /api/threats
 * Fetch all threats stored in DB
 */
router.get("/", async (req, res) => {
  try {
    const threats = await Threat.find().sort({ createdAt: -1 });
    res.json(threats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/**
 * GET /api/ioc/search?value=<ioc>
 * Search IOC via 3rd party threat intel API (VirusTotal / AbuseIPDB etc.)
 */
router.get("/ioc/search", async (req, res) => {
  try {
    const { value } = req.query;

    if (!value) {
      return res.status(400).json({ message: "IOC value is required" });
    }

    // External Threat API (placeholder — replace with your API key later)
    const result = await axios.get(`https://ipinfo.io/${value}/json`);

    res.json({
      input: value,
      result: result.data,
    });
  } catch (err) {
    res.status(500).json({ message: "IOC lookup failed", error: err.message });
  }
});

/**
 * GET /api/threats/stats
 * Dashboard stats (counts, trends)
 */
router.get("/stats", async (req, res) => {
  try {
    const total = await Threat.countDocuments();
    const active = await Threat.countDocuments({ status: "active" });

    res.json({
      totalThreats: total,
      activeThreats: active,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
