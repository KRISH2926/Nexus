const Student = require("../models/studentModel");
const Teacher = require("../models/teacherModel");
const SecurityPersonnel = require("../models/securityPersonnelModel");
const Admin = require("../models/adminModel");
const Parent = require("../models/parentModel");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const getJwtSecret = require("../config/jwtSecret");

// ---------------- LOGIN ONLY ----------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    let user = null;
    let role = null;

    // ---------------- CHECK STUDENT ----------------
    user = await Student.findOne({ email });
    if (user) role = "student";

    // ---------------- CHECK TEACHER ----------------
    if (!user) {
      user = await Teacher.findOne({ email });
      if (user) role = "teacher";
    }

    if (!user) {
      user = await SecurityPersonnel.findOne({ email });
      if (user) role = "security";
    }

    if (!user) {
      user = await Parent.findOne({ email }).select("+password");
      if (user) role = "parent";
    }

    // ---------------- CHECK ADMIN ----------------
    if (!user) {
      user = await Admin.findOne({ email });
      if (user) role = "admin";
    }

    // ---------------- USER NOT FOUND ----------------
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    // ---------------- PASSWORD CHECK ----------------
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password"
      });
    }

    if (user.status === "pending" || user.status === "disabled") {
      return res.status(403).json({
        message: user.status === "pending"
          ? "Account is pending admin activation"
          : "Account is disabled"
      });
    }

    // ---------------- TOKEN GENERATION ----------------
    const token = jwt.sign(
      {
        id: user._id,
        role: role
      },
      getJwtSecret(),
      { expiresIn: "7d" }
    );

    // ---------------- RESPONSE ----------------
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: role
      }
    });

  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
