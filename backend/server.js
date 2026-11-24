require("dotenv").config();
require("dotenv").config({
  path: require("path").resolve(__dirname, ".env.local")
});

// The explicit --demo switch always targets the isolated demo database, even
// when a developer's local environment file selects another database.
const demoMode = process.argv.includes("--demo");
if (demoMode) process.env.NEXUS_DEMO_MODE = "true";

require("./config/jwtSecret")();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const createCorsOptions = require("./config/corsOptions");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors(createCorsOptions()));
app.use(express.json());

/* ================= FORCE MODEL REGISTRATION ================= */
require("./models/batchModel");
require("./models/subjectModel");
require("./models/studentModel");
require("./models/teacherModel");
require("./models/securityPersonnelModel");
require("./models/campusGateModel");
require("./models/parentModel");
require("./models/parentNotificationModel");
require("./models/registrationCodeModel");
require("./models/registrationInvitationModel");
require("./models/attendanceModel");
require("./models/gatepassModel");
require("./models/gatepassPolicyModel");
require("./models/gatepassQuotaUsageModel");
require("./models/gatepassScanLogModel");
require("./models/auditLogModel");
require("./models/notificationModel");
require("./models/timetableModel");

/* ===== NEW ASSIGNMENT MODELS ===== */
require("./models/assignmentModel");
require("./models/submissionModel");

/* ================= ROUTES ================= */
const authRoutes = require("./routes/authRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const gatepassRoutes = require("./routes/gatepassRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const batchRoutes = require("./routes/batchRoutes");
const studentRoutes = require("./routes/studentRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const timetableRoutes = require("./routes/timetableRoutes");

/* ===== NEW ASSIGNMENT ROUTES ===== */
const assignmentRoutes = require("./routes/assignmentRoutes");
const registrationRoutes = require("./routes/registrationRoutes");
const securityRoutes = require("./routes/securityRoutes");
const parentRoutes = require("./routes/parentRoutes");
const gatepassAdminRoutes = require("./routes/gatepassAdminRoutes");
const campusGateRoutes = require("./routes/campusGateRoutes");

/* ================= API ENDPOINTS ================= */
app.use("/api/auth", authRoutes);
app.use("/api/teacher", teacherRoutes);
app.use("/api/gatepass", gatepassRoutes);
app.use("/api/gatepass/admin", gatepassAdminRoutes);
app.use("/api/subject", subjectRoutes);
app.use("/api/batch", batchRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/timetable", timetableRoutes);

/* ===== ASSIGNMENT API ===== */
app.use("/api/assignment", assignmentRoutes);
app.use("/api/registration", registrationRoutes);
app.use("/api/security", securityRoutes);
app.use("/api/campus-gates", campusGateRoutes);
app.use("/api/parent", parentRoutes);

/* ================= CRON JOB ================= */
require("./cron/assignmentCron");
require("./cron/gatepassCron");

/* ================= HOME ROUTE ================= */
app.get("/", (req, res) => {
  res.send("Nexus Backend is Running 🚀");
});

app.get("/health", (_req, res) => {
  const connected = mongoose.connection.readyState === 1;
  return res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "database_unavailable",
    ...(connected && process.env.NODE_ENV !== "production" ? { database: mongoose.connection.name } : {})
  });
});

/* ================= DATABASE CONNECTION ================= */
/* ================= START SERVER ================= */
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "127.0.0.1";

const mongoOptions = demoMode
  ? { dbName: "nexus_demo" }
  : process.env.MONGO_DB_NAME
    ? { dbName: process.env.MONGO_DB_NAME }
  : {};

mongoose
  .connect(process.env.MONGO_URI, mongoOptions)
  .then(() => {
    console.log("MongoDB Connected");
    app.listen(PORT, HOST, () => console.log(`Server running on ${HOST}:${PORT}`));
  })
  .catch(() => {
    console.error("Database connection failed; API server was not started.");
    process.exitCode = 1;
  });
