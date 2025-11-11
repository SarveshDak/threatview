const express = require("express");
const User = require("../models/user.js");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Generate token
const createToken = (id) => {
  return jwt.sign({ id }, "SECRET_KEY", { expiresIn: "7d" });
};

// REGISTER ✅
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if already exists
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ email, password, name });

    const token = createToken(user._id);

    res.json({ message: "User registered successfully", token, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN ✅
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "User does not exist" });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(400).json({ message: "Invalid email/password" });

  const token = createToken(user._id);

  res.json({ message: "Login successful", token, user });
});

// GET CURRENT USER ✅
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Not authorized" });

    const decoded = jwt.verify(token, "SECRET_KEY");

    const user = await User.findById(decoded.id).select("-password");

    res.json(user);
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
});

module.exports = router;
