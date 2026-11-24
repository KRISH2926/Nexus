const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Student = require("../models/studentModel");
const Batch = require("../models/batchModel");
const Parent = require("../models/parentModel");
const XLSX = require("xlsx");
const API_PORT = Number(process.env.NEXUS_API_PORT || 5000);
if (!Number.isInteger(API_PORT) || API_PORT < 1 || API_PORT > 65535) {
  throw new Error("NEXUS_API_PORT must be a valid local port");
}

const workbook = XLSX.readFile(path.resolve(__dirname, "../../demo-files/NEXUS-Demo-Credentials-and-Timetable.xlsx"));
const readRows = (name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { range: 1 });
const readMeRows = XLSX.utils.sheet_to_json(workbook.Sheets["Read Me"], { header: 1 });
const counts = { students: readRows("Students").length, parents: readRows("Parents").length,
  teachers: readRows("Staff").filter((account) => account.Role === "Teacher").length,
  timetableEntries: readRows("Timetable").length };
const manifest = {
  database: readMeRows.find((row) => row[0] === "Database")?.[1],
  counts,
  credentials: [
    ...readRows("Students").map((account) => ({ ...account, role: "Student" })),
    ...readRows("Parents").map((account) => ({ ...account, role: "Parent" })),
    ...readRows("Staff").map((account) => ({ ...account, role: account.Role }))
  ]
};
manifest.credentials = manifest.credentials.map((account) => ({
  ...account, email: account.Email, password: account.Password, rollNo: account["Roll number"] || account["Linked roll number"]
}));
const byRole = (role) => manifest.credentials.find((account) => account.role === role);
const checks = [];

async function call(url, options) {
  const response = await fetch(`http://127.0.0.1:${API_PORT}${url}`, {
    ...options,
    signal: AbortSignal.timeout(5000)
  });
  const data = await response.json();
  return { response, data };
}

async function request(url, options) {
  const { response, data } = await call(url, options);
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}: ${data.message || "request failed"}`);
  return data;
}

async function login(account) {
  let data;
  try {
    data = await request("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: account.email, password: account.password })
    });
  } catch (error) { throw new Error(`${account.role} login failed: ${error.message}`); }
  if (data.user?.role?.toLowerCase() !== account.role.toLowerCase()) {
    throw new Error(`${account.role} login resolved to an unexpected role`);
  }
  return data.token;
}

async function verifyParentSignupRoundTrip() {
  const suffix = Date.now().toString();
  const parentEmail = `signup-check-${suffix}@demo.nexus.invalid`;
  const studentEmail = `signup-check-student-${suffix}@demo.nexus.invalid`;
  const rollNo = `NXTEMP-${suffix}`;
  const password = "DemoParent!2026";
  let studentId;
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: manifest.database, serverSelectionTimeoutMS: 5000 });
    const batch = await Batch.findOne({ name: "NEXUS Demo Batch A" }).select("_id");
    const student = await Student.create({
      name: "Temporary Signup Check", rollNo, email: studentEmail,
      password: await bcrypt.hash("DemoStudent!2026", 10), parentName: "Signup Check Parent",
      parentEmail, studentMobile: "9012345678", parentMobile: "9012345679",
      batch: batch._id, status: "active", emailVerified: true
    });
    studentId = student._id;
    const registration = await request("/api/parent/register", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Signup Check Parent", email: parentEmail, rollNo, password, confirmPassword: password })
    });
    if (registration.accountStatus !== "pending" || !registration.developmentVerificationUrl) {
      throw new Error("Parent signup did not return a local demo verification link");
    }
    const token = new URL(registration.developmentVerificationUrl).searchParams.get("token");
    const verification = await request("/api/auth/verify-email", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token })
    });
    if (verification.accountStatus !== "active") throw new Error("Parent verification did not activate the demo account");
    const savedParent = await Parent.findOne({ email: parentEmail }).select("+password").lean();
    if (!savedParent || savedParent.status !== "active" || !savedParent.emailVerified) {
      throw new Error("Verified parent record was not found as active in the demo database");
    }
    const tokenResult = await login({ role: "Parent", email: parentEmail, password });
    const workspace = await request("/api/parent/me", { headers: { Authorization: `Bearer ${tokenResult}` } });
    if (workspace.students?.length !== 1 || String(workspace.students[0]._id) !== String(studentId)) {
      throw new Error("Verified parent account could not access its linked student");
    }
    return "parent signup → local verification → login → linked portal";
  } finally {
    await Parent.deleteOne({ email: parentEmail });
    if (studentId) await Student.deleteOne({ _id: studentId });
    await mongoose.disconnect();
  }
}

async function run() {
  const health = await request("/health");
  if (health.database !== manifest.database) throw new Error("Backend is not connected to the isolated demo database");
  checks.push("backend health and demo database selection");
  const studentToken = await login(byRole("Student"));
  checks.push("student login");
  const teacherToken = await login(byRole("Teacher"));
  checks.push("teacher login");
  const parentToken = await login(byRole("Parent"));
  checks.push("parent login");
  const adminToken = await login(byRole("Admin"));
  checks.push("admin login");
  const securityToken = await login(byRole("Security"));
  checks.push("security login");
  for (let index = 0; index < manifest.credentials.length; index += 8) {
    await Promise.all(manifest.credentials.slice(index, index + 8).map(login));
  }
  checks.push(`all ${manifest.credentials.length} Excel credentials authenticate`);

  const auth = (token) => ({ Authorization: `Bearer ${token}` });
  const [studentAssignments, teacherAssignments, timetable, parentWorkspace, securityProfile, gatepassPolicies, gatepassReports, securityPersonnel] = await Promise.all([
    request("/api/assignment/student", { headers: auth(studentToken) }),
    request("/api/assignment/teacher", { headers: auth(teacherToken) }),
    request("/api/timetable", { headers: auth(adminToken) }),
    request("/api/parent/me", { headers: auth(parentToken) }),
    request("/api/security/profile", { headers: auth(securityToken) }),
    request("/api/gatepass/admin/policies", { headers: auth(adminToken) }),
    request("/api/gatepass/admin/reports", { headers: auth(adminToken) }),
    request("/api/security/admin/personnel", { headers: auth(adminToken) })
  ]);

  const timetableEntries = Array.isArray(timetable) ? timetable.length : timetable.entries?.length;
  if (parentWorkspace.students?.length !== 1 || parentWorkspace.notifications?.length !== 1 ||
      !parentWorkspace.gatepasses?.length) {
    throw new Error("Parent workspace did not load its student, notification, and reviewable sample request");
  }
  if (timetableEntries !== manifest.counts.timetableEntries) throw new Error("Timetable count does not match the seed manifest");
  if (!securityProfile.profile && !securityProfile.securityPersonnel && !securityProfile.name) {
    throw new Error("Security profile did not return a profile payload");
  }
  if (!Array.isArray(studentAssignments.assignments) && !Array.isArray(studentAssignments)) {
    throw new Error("Student assignments response was unexpected");
  }
  if (!Array.isArray(teacherAssignments.assignments) && !Array.isArray(teacherAssignments)) {
    throw new Error("Teacher assignments response was unexpected");
  }
  checks.push(`parent workspace (${parentWorkspace.students.length} linked student, ${parentWorkspace.notifications.length} message)`);
  checks.push(`admin timetable (${timetableEntries} entries)`);
  checks.push("student and teacher assignment views");
  checks.push("security profile");
  if (gatepassPolicies.defaultMonthlyQuota !== 2 || !gatepassReports.statusCounts) throw new Error("Admin gatepass policy and reports endpoints are unavailable");
  checks.push("admin quota policy and gatepass reports");
  if (securityPersonnel.personnel?.length !== 1) throw new Error("Admin security staffing endpoint did not return the demo staff record");
  checks.push("admin security staffing");
  const gatesBefore = await request("/api/campus-gates", { headers: auth(adminToken) });
  let demoGate = gatesBefore.gates.find((gate) => gate.name === "Main Gate");
  const demoShift = { name: "Day", startTime: "08:00", endTime: "16:00", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] };
  if (!demoGate) {
    const createdGate = await request("/api/campus-gates", { method: "POST", headers: { ...auth(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Main Gate", location: "Campus entrance", shifts: [demoShift] }) });
    demoGate = createdGate.gate;
  } else {
    const updatedGate = await request(`/api/campus-gates/${demoGate._id}`, { method: "PATCH", headers: { ...auth(adminToken), "Content-Type": "application/json" },
      body: JSON.stringify({ name: demoGate.name, location: demoGate.location || "Campus entrance", status: "active", shifts: [demoShift] }) });
    demoGate = updatedGate.gate;
  }
  const securityRecord = securityPersonnel.personnel[0];
  const staffingUpdate = await request(`/api/security/admin/personnel/${securityRecord._id}`, { method: "PATCH", headers: { ...auth(adminToken), "Content-Type": "application/json" },
    body: JSON.stringify({ assignedGate: demoGate.name, assignedShift: "Day", status: securityRecord.status || "active" }) });
  if (staffingUpdate.personnel?.assignedShift !== "Day") throw new Error("Security shift assignment was not saved");
  const auditAfterGateSetup = await request("/api/gatepass/admin/audit", { headers: auth(adminToken) });
  if (!auditAfterGateSetup.entries.some((entry) => entry.action === "campus.gate.created" || entry.action === "campus.gate.updated") ||
      !auditAfterGateSetup.entries.some((entry) => entry.action === "security.personnel.updated")) throw new Error("Gate or staffing changes were not audited");
  checks.push("admin campus gates, shift configuration, security assignment, and audit records");
  checks.push(await verifyParentSignupRoundTrip());
  let workflowCheck = false;
  const demoStudents = manifest.credentials.filter((account) => account.role === "Student");
  for (const demoStudent of demoStudents) {
    const studentTokenForPass = await login(demoStudent);
    const quotaForPass = await request("/api/gatepass/quota/me", { headers: auth(studentTokenForPass) });
    if (quotaForPass.remaining < 1) continue;
    const demoParent = manifest.credentials.find((account) => account.role === "Parent" && account.rollNo === demoStudent.rollNo);
    const parentTokenForPass = await login(demoParent);
    const workspaceForPass = await request("/api/parent/me", { headers: auth(parentTokenForPass) });
    const pendingPass = workspaceForPass.gatepasses.find((item) => item.status === "parent_pending");
    if (!pendingPass) continue;
    await request(`/api/gatepass/parent/${pendingPass._id}/decision`, {
      method: "PUT", headers: { ...auth(parentTokenForPass), "Content-Type": "application/json" }, body: JSON.stringify({ decision: "approved" })
    });
    const issued = await request(`/api/gatepass/${pendingPass._id}/issue`, { method: "POST", headers: auth(studentTokenForPass) });
  if (issued.gatepass?.status !== "issued" || !issued.qrToken) throw new Error("Approved demo request was not issued with a QR token");
  const securityHeaders = { ...auth(securityToken), "Content-Type": "application/json" };
  const verify = await request("/api/security/scan/verify", { method: "POST", headers: securityHeaders, body: JSON.stringify({ token: issued.qrToken }) });
  if (!verify.valid || verify.pass?.nextAction !== "exit") throw new Error("Security could not validate the newly issued pass");
  await request("/api/security/scan/exit", { method: "POST", headers: securityHeaders, body: JSON.stringify({ token: issued.qrToken }) });
  const returnCheck = await request("/api/security/scan/verify", { method: "POST", headers: securityHeaders, body: JSON.stringify({ token: issued.qrToken }) });
  if (!returnCheck.valid || returnCheck.pass?.nextAction !== "return") throw new Error("Security could not validate a pass for re-entry");
  await request("/api/security/scan/return", { method: "POST", headers: securityHeaders, body: JSON.stringify({ token: issued.qrToken }) });
  const replayed = await call("/api/security/scan/return", { method: "POST", headers: securityHeaders, body: JSON.stringify({ token: issued.qrToken }) });
  if (replayed.response.status !== 409) throw new Error("The pass allowed a duplicate return scan");
    const quota = await request("/api/gatepass/quota/me", { headers: auth(studentTokenForPass) });
    if (quota.issued < 1 || quota.remaining >= quota.quota) throw new Error("Issued pass was not charged to the monthly quota");
    workflowCheck = true;
    break;
  }
  if (!workflowCheck) throw new Error("No demo request with quota remaining was available to exercise the gatepass lifecycle");
  checks.push("parent decision → quota charged QR issuance → one-time exit and return → replay rejected");
  console.log(JSON.stringify({ database: manifest.database, status: "passed", checks }));
}

run().catch((error) => {
  console.error(`Demo verification failed: ${error.message}`);
  process.exitCode = 1;
});
