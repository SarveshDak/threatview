const express = require("express");
const Alert = require("../models/alert.js");

const router = express.Router();

// ✅ Get all alerts
router.get("/", async (req, res) => {
  try {
    const alerts = await Alert.find().sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Create alert
router.post("/", async (req, res) => {
  try {
    const alert = await Alert.create({
      userId: req.body.userId || null,
      name: req.body.name || req.body.title,  // UI sends 'title'
      description: req.body.description,
      conditions: req.body.conditions || {
        type: "Any",
        value: ""
      },
      severity: req.body.severity || "Medium",
      sources: req.body.sources || ["Manual"]
    });

    res.json({ message: "Alert created", alert });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Update alert
router.put("/:id", async (req, res) => {
  try {
    const updated = await Alert.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json({ message: "Alert updated", updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Delete alert
router.delete("/:id", async (req, res) => {
  try {
    await Alert.findByIdAndDelete(req.params.id);
    res.json({ message: "Alert deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
