import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "../components/Loading";
import TodayScheduleCard from "../components/TodayScheduleCard";
import { QRCodeSVG } from "qrcode.react";
import API_BASE from "../services/apiBase";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

const gatepassStatusLabel = (gatepass) => {
  if (gatepass.status === "pending") return "Waiting for teacher";
  if (gatepass.status === "parent_pending") return "Waiting for parent";
  if (gatepass.status === "approved") return gatepass.parentDecision?.decision === "approved"
    ? "Approved by parent"
    : "Approved (legacy request)";
  if (gatepass.status === "rejected") return gatepass.parentDecision?.decision === "rejected"
    ? "Rejected by parent"
    : "Rejected by campus";
  if (gatepass.status === "issued") return "QR issued";
  if (gatepass.status === "exited") return "Exited campus";
  if (gatepass.status === "returned") return "Returned to campus";
  return gatepass.status;
};

const StudentDashboard = () => {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [gatepasses, setGatepasses] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [scheduleDay, setScheduleDay] = useState("");
  const [loading, setLoading] = useState(true);

  const [gatepassDate, setGatepassDate] = useState("");
  const [gatepassReason, setGatepassReason] = useState("");
  const [gatepassMessage, setGatepassMessage] = useState("");
  const [gatepassQuota, setGatepassQuota] = useState(null);
  const [gatepassExitTime, setGatepassExitTime] = useState("09:00");
  const [gatepassReturnTime, setGatepassReturnTime] = useState("17:00");
  const [issuedToken, setIssuedToken] = useState("");
  const [issuingGatepass, setIssuingGatepass] = useState("");

  const studentId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!studentId) {
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${API_BASE}/student/dashboard/${studentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await res.json();

        setStudent(data);
        setAttendance(data.attendance || []);

        const quotaResponse = await fetch(`${API_BASE}/gatepass/quota/me`, { headers: { Authorization: `Bearer ${token}` } });
        const quotaData = await quotaResponse.json();
        if (quotaResponse.ok) setGatepassQuota(quotaData);

        const gpRes = await fetch(
          `${API_BASE}/gatepass/student/${studentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const gpData = await gpRes.json();
        setGatepasses(Array.isArray(gpData) ? gpData : []);

        const notiRes = await fetch(
          `${API_BASE}/notification/student/${studentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const notiData = await notiRes.json();
        setNotifications(Array.isArray(notiData) ? notiData : []);

        const scheduleRes = await fetch(
          `${API_BASE}/timetable/student/${studentId}/today`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        const scheduleData = await scheduleRes.json();
        setTodaySchedule(Array.isArray(scheduleData.schedule) ? scheduleData.schedule : []);
        setScheduleDay(scheduleData.day || "");
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [studentId, token]);

  if (loading) {
    return <Loading message="Loading student dashboard..." />;
  }

  if (!student) {
    return (
      <div className="p-6 text-red-500 font-bold">
        No student data found
      </div>
    );
  }

  const total = attendance.reduce((a, c) => a + (c.total || 0), 0);
  const present = attendance.reduce((a, c) => a + (c.present || 0), 0);
  const overallPercent = total === 0 ? 0 : (present / total) * 100;

  const today = new Date().toISOString().split("T")[0];

  const todayGatepass = gatepasses.find(
    (gp) => new Date(gp.date).toISOString().split("T")[0] === today
  );

  const handleGatepassSubmit = async (e) => {
    e.preventDefault();
    setGatepassMessage("");

    try {
      const res = await fetch(`${API_BASE}/gatepass/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: gatepassReason,
          date: gatepassDate,
          exitTime: gatepassExitTime,
          expectedReturnTime: gatepassReturnTime
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setGatepassMessage(data.message || "Gatepass request failed");
        return;
      }

      setGatepasses([data.gatepass, ...gatepasses]);
      setGatepassDate("");
      setGatepassReason("");
      setGatepassExitTime("09:00");
      setGatepassReturnTime("17:00");
      setGatepassMessage("Gatepass request sent successfully");
    } catch (err) {
      console.error("Gatepass error:", err);
      setGatepassMessage("Something went wrong");
    }
  };

  const issueGatepass = async (id) => {
    setGatepassMessage(""); setIssuedToken(""); setIssuingGatepass(id);
    try {
      const response = await fetch(`${API_BASE}/gatepass/${id}/issue`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not issue this gatepass.");
      setIssuedToken(data.qrToken); setGatepassMessage(data.message);
      const quotaResponse = await fetch(`${API_BASE}/gatepass/quota/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (quotaResponse.ok) setGatepassQuota(await quotaResponse.json());
      setGatepasses((current) => current.map((item) => item._id === id ? data.gatepass : item));
    } catch (requestError) { setGatepassMessage(requestError.message || "Could not issue this gatepass."); }
    finally { setIssuingGatepass(""); }
  };

  const pieData = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [present, total - present],
        backgroundColor: ["#22c55e", "#ef4444"]
      }
    ]
  };

  const barData = {
    labels: attendance.map((a) => a.subject),
    datasets: [
      {
        label: "Attendance %",
        data: attendance.map((a) => a.percentage),
        backgroundColor: attendance.map((a) =>
          a.percentage < 50 ? "#ef4444" : "#3b82f6"
        )
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow">
        <div>
          <h2 className="text-xl font-bold">{student.name}</h2>
          <p>Roll No: {student.rollNo}</p>
          <p>Batch: {student.batch?.name}</p>
        </div>

        <div className="text-center">
          <h3 className="font-semibold">Overall Attendance</h3>
          <p
            className={`text-2xl font-bold ${
              overallPercent < 50 ? "text-red-500" : "text-green-600"
            }`}
          >
            {overallPercent.toFixed(2)}%
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* ================= NOTIFICATIONS ================= */}
      {notifications.length > 0 && (
        <div className="mt-6 bg-red-100 border border-red-400 text-red-700 p-4 rounded-xl shadow">
          <h3 className="font-bold mb-2">⚠️ Notifications</h3>

          {notifications.map((notification) => (
            <div
              key={notification._id}
              className="border-b border-red-300 py-2 last:border-b-0"
            >
              <p className="font-medium">{notification.message}</p>

              <p className="text-sm">
                Subject: {notification.subject?.name || "N/A"} | Month:{" "}
                {notification.month} | Year: {notification.year}
              </p>
            </div>
          ))}
        </div>
      )}
{/* ================= ASSIGNMENTS ================= */}

<div className="mt-6">

  <div
    onClick={() => navigate("/student/assignments")}
    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-2xl shadow-lg cursor-pointer hover:scale-[1.02] transition"
  >
    <h3 className="text-2xl font-bold">
      📝 Assignment Center
    </h3>

    <p className="mt-3 text-blue-100">
      View pending, submitted and missed assignments.
      Attempt assignments and track your scores.
    </p>

    <div className="mt-4 font-semibold text-lg">
      Open Assignments →
    </div>
  </div>

</div>

      <TodayScheduleCard
        title="Today's Timetable"
        day={scheduleDay}
        schedule={todaySchedule}
      />

      {/* ================= CHARTS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-2">Overall Attendance</h3>
          <Pie data={pieData} />
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold mb-2">Subject Wise Attendance</h3>
          <Bar data={barData} />
        </div>
      </div>

      {/* ================= SUBJECT LIST ================= */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Subjects</h3>

        {attendance.length === 0 ? (
          <p className="text-red-500">No attendance data found</p>
        ) : (
          attendance.map((sub, i) => (
            <div
              key={i}
              className={`flex justify-between p-2 border-b ${
                sub.percentage < 50 ? "text-red-500 font-semibold" : ""
              }`}
            >
              <span>{sub.subject}</span>
              <span>{sub.percentage}%</span>
            </div>
          ))
        )}
      </div>

      {/* ================= GATEPASS REQUEST ================= */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Request Gatepass</h3>
        {gatepassQuota && <p className="mb-3 text-sm text-slate-600">Monthly quota: {gatepassQuota.remaining} of {gatepassQuota.quota} issued passes remain ({gatepassQuota.month}).</p>}

        {todayGatepass ? (
          <div className="p-4 rounded bg-gray-100">
            <p className="font-medium">Today&apos;s Gatepass Status</p>

            <span
              className={`inline-block mt-2 px-3 py-1 rounded text-white text-sm ${
                todayGatepass.status === "approved"
                  ? "bg-green-500"
                  : todayGatepass.status === "rejected"
                  ? "bg-red-500"
                  : "bg-yellow-500"
              }`}
            >
              {gatepassStatusLabel(todayGatepass)}
            </span>

            <p className="mt-2 text-sm text-gray-600">
              Reason: {todayGatepass.reason}
            </p>

            <p className="text-sm text-gray-600">
              Mentor: {todayGatepass.mentor?.name || "Not assigned"}
            </p>
          </div>
        ) : (
          <form onSubmit={handleGatepassSubmit}>
            <input
              type="date"
              value={gatepassDate}
              min={today}
              max={new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]}
              onChange={(e) => setGatepassDate(e.target.value)}
              className="border p-2 w-full mb-2"
              required
            />

            <label className="mb-2 block text-sm">Requested exit time<input type="time" value={gatepassExitTime} onChange={(e) => setGatepassExitTime(e.target.value)} className="border p-2 w-full" required /></label>
            <label className="mb-2 block text-sm">Expected return time<input type="time" value={gatepassReturnTime} onChange={(e) => setGatepassReturnTime(e.target.value)} className="border p-2 w-full" required /></label>

            <input
              type="text"
              value={gatepassReason}
              onChange={(e) => setGatepassReason(e.target.value)}
              className="border p-2 w-full mb-2"
              placeholder="Reason"
              required
            />

            <button className="bg-blue-500 text-white px-4 py-2 rounded">
              Submit Request
            </button>
          </form>
        )}

        {gatepassMessage && (
          <p className="mt-2 text-sm text-blue-600">
            {gatepassMessage}
          </p>
        )}
      </div>

      {/* ================= GATEPASS STATUS ================= */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">My Gatepass Requests</h3>

        {gatepasses.length === 0 ? (
          <p className="text-gray-500">No gatepass requests</p>
        ) : (
          gatepasses.map((gp) => (
            <div
              key={gp._id}
              className="flex justify-between items-center p-3 border-b"
            >
              <div>
                <p className="font-medium">{gp.reason}</p>

                <p className="text-sm text-gray-500">
                  Date: {new Date(gp.date).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-500">Exit: {gp.exitTime || "09:00"} · Return by: {gp.expectedReturnTime || "17:00"}</p>

                <p className="text-sm text-gray-500">
                  Mentor: {gp.mentor?.name || "Not assigned"}
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded text-white text-sm ${
                  gp.status === "approved"
                    ? "bg-green-500"
                    : gp.status === "rejected"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
              >
                {gatepassStatusLabel(gp)}
              </span>
              {(["approved", "issued"].includes(gp.status)) && gp.parentDecision?.decision === "approved" && (
                <button type="button" disabled={Boolean(issuingGatepass)} onClick={() => issueGatepass(gp._id)} className="ml-2 rounded bg-indigo-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {issuingGatepass === gp._id ? "Issuing…" : gp.status === "issued" ? "Refresh pass QR" : "Issue pass QR"}
                </button>
              )}
              {gp.status === "issued" && <span className="ml-2 text-sm text-emerald-700">QR pass issued · valid until {gp.expiresAt ? new Date(gp.expiresAt).toLocaleString() : "expiry unavailable"}</span>}
              {issuedToken && issuedToken.length > 20 && <div className="basis-full pt-3"><QRCodeSVG value={issuedToken} size={220} level="M" aria-label="One-use gatepass QR code" /><p className="text-xs text-slate-500">Show this QR to security. A refresh creates a replacement token.</p></div>}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
