const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const Admin = require("./models/adminModel");

mongoose.connect("mongodb://127.0.0.1:27017/nexus")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

const createAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ email: "admin@nexus.com" });

    if (existingAdmin) {
      console.log("Admin already exists");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = new Admin({
      name: "System Admin",
      email: "admin@nexus.com",
      password: hashedPassword,
      role: "admin"
    });

    await admin.save();

    console.log("Admin created successfully");
    console.log("Email: admin@nexus.com");
    console.log("Password: admin123");

    process.exit();
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

createAdmin();