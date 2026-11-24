import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import Loading from "../components/Loading";
import TodayScheduleCard from "../components/TodayScheduleCard";
import API_BASE from "../services/apiBase";
import { Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const TeacherDashboard = () => {
  const navigate = useNavigate();

  const [teacher, setTeacher] = useState(null);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [gatepasses, setGatepasses] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedSubject, setSelectedSubject] = useState("");
  const [attendanceDate, setAttendanceDate] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [viewStudent, setViewStudent] = useState(null);
  const [viewSubject, setViewSubject] = useState("");
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [monthlyAttendance, setMonthlyAttendance] = useState(null);

  const [alertSubject, setAlertSubject] = useState("");
  const [alertMonth, setAlertMonth] = useState(new Date().getMonth() + 1);
  const [alertYear, setAlertYear] = useState(new Date().getFullYear());
  const [lowStudents, setLowStudents] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [scheduleDay, setScheduleDay] = useState("");

  const teacherId = localStorage.getItem("userId");
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        if (!teacherId || !token) {
          setLoading(false);
          return;
        }

        const headers = {
          Authorization: `Bearer ${token}`
        };

        const teacherRes = await fetch(
          `${API_BASE}/teacher/dashboard/${teacherId}`,
          { headers }
        );
        const teacherData = await teacherRes.json();

        const studentsRes = await fetch(
          `${API_BASE}/teacher/students/${teacherId}`,
          { headers }
        );
        const studentsData = await studentsRes.json();

        const subjectsRes = await fetch(
          `${API_BASE}/teacher/subjects/${teacherId}`,
          { headers }
        );
        const subjectsData = await subjectsRes.json();

        const gatepassRes = await fetch(
          `${API_BASE}/gatepass/mentor/pending`,
          { headers }
        );
        const gatepassData = await gatepassRes.json();

        const scheduleRes = await fetch(
          `${API_BASE}/timetable/teacher/${teacherId}/today`,
          { headers }
        );
        const scheduleData = await scheduleRes.json();

        setTeacher(teacherData);
        setStudents(Array.isArray(studentsData) ? studentsData : []);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        setGatepasses(Array.isArray(gatepassData) ? gatepassData : []);
        setTodaySchedule(Array.isArray(scheduleData.schedule) ? scheduleData.schedule : []);
        setScheduleDay(scheduleData.day || "");

        const defaultAttendance = {};
        if (Array.isArray(studentsData)) {
          studentsData.forEach((student) => {
            defaultAttendance[student._id] = "present";
          });
        }

        setAttendance(defaultAttendance);
      } catch (error) {
        console.error("Teacher dashboard error:", error);
        setMessage("Failed to load teacher dashboard");
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherData();
  }, [teacherId, token]);

  if (loading) {
    return <Loading message="Loading teacher dashboard..." />;
  }

  if (!teacher) {
    return (
      <div className="p-6 text-red-500 font-bold">
        Teacher data not found
      </div>
    );
  }

  const handleAttendanceChange = (studentId, status) => {
    setAttendance({
      ...attendance,
      [studentId]: status
    });
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!selectedSubject || !attendanceDate) {
      setMessage("Please select subject and date");
      return;
    }

    if (students.length === 0) {
      setMessage("No students found in your batch");
      return;
    }

    try {
      const records = students.map((student) => ({
        student: student._id,
        status: attendance[student._id] || "present"
      }));

      const res = await fetch(`${API_BASE}/attendance/mark-bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          batch: teacher.batch?._id || teacher.batch,
          subject: selectedSubject,
          date: attendanceDate,
          records
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Attendance marking failed");
        return;
      }

      alert("Attendance submitted successfully");

      setSelectedSubject("");
      setAttendanceDate("");
      setMessage("");
    } catch (error) {
      console.error("Attendance error:", error);
      setMessage("Something went wrong while marking attendance");
    }
  };

  const handleViewAttendance = async (student) => {
  setMessage("");
  setMonthlyAttendance(null);

  const subjectToUse = viewSubject || subjects[0]?._id;

  if (!subjectToUse) {
    alert("No subject found");
    return;
  }

  try {
    const res = await fetch(
      `${API_BASE}/attendance/monthly/${student._id}/${subjectToUse}/${viewMonth}/${viewYear}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to fetch attendance");
      return;
    }

    setViewStudent(student);
    setMonthlyAttendance(data);
  } catch (error) {
    console.error(error);
    alert("Something went wrong");
  }
};

  const handleIssueLowAttendance = async () => {
    setMessage("");
    setLowStudents([]);

    if (!alertSubject || !alertMonth || !alertYear) {
      setMessage("Please select subject, month and year");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/attendance/low-monthly/${alertSubject}/${alertMonth}/${alertYear}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to fetch low attendance students");
        return;
      }

      setLowStudents(data.students || []);

      if ((data.students || []).length === 0) {
        alert("No students below 50% monthly attendance");
      } else {
        alert("Low attendance notifications issued");
      }
    } catch (error) {
      console.error("Low attendance error:", error);
      setMessage("Something went wrong");
    }
  };

  const handleApproveGatepass = async (id) => {
    try {
      const gatepass = gatepasses.find((gp) => gp._id === id);
      const studentName = gatepass?.student?.name || "student";

      const res = await fetch(
        `${API_BASE}/gatepass/mentor/approve/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to approve gatepass");
        return;
      }

      setGatepasses(gatepasses.filter((gp) => gp._id !== id));

      const delivery = data.parentNotification;
      const deliveryMessage = delivery?.status === "sent"
        ? "Parent portal notice created and email sent."
        : delivery?.status === "in_app_only"
        ? delivery.emailFailed > 0
          ? "Parent portal notice created; email delivery failed."
          : delivery.emailConfigured
          ? "Parent portal notice created; email delivery has not been confirmed."
          : "Parent portal notice created; campus email is not configured."
        : delivery?.status === "pending"
        ? "Parent request is available in the portal; email delivery is still pending."
        : "Parent review is pending in NEXUS, but notification delivery failed.";
      setMessage(`Campus approved the request for ${studentName}. ${deliveryMessage}`);
    } catch (error) {
      console.error("Approve error:", error);
      setMessage("Something went wrong");
    }
  };

  const handleRejectGatepass = async (id) => {
    try {
      const gatepass = gatepasses.find((gp) => gp._id === id);
      const studentName = gatepass?.student?.name || "student";

      const res = await fetch(
        `${API_BASE}/gatepass/mentor/reject/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || "Failed to reject gatepass");
        return;
      }

      setGatepasses(gatepasses.filter((gp) => gp._id !== id));

      const delivery = data.parentNotification;
      const deliveryMessage = delivery?.status === "sent"
        ? "Parent portal notice created and email sent."
        : delivery?.status === "in_app_only"
        ? delivery.emailFailed > 0
          ? "Parent portal notice created; email delivery failed."
          : delivery.emailConfigured
          ? "Parent portal notice created; email delivery has not been confirmed."
          : "Parent portal notice created; campus email is not configured."
        : delivery?.status === "no_verified_parent"
        ? "No verified parent portal account is linked."
        : "Notification delivery failed.";
      setMessage(`Gatepass rejected for ${studentName}. ${deliveryMessage}`);
    } catch (error) {
      console.error("Reject error:", error);
      setMessage("Something went wrong");
    }
  };

  const monthlyPieData = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [
          monthlyAttendance?.present || 0,
          monthlyAttendance?.absent || 0
        ],
        backgroundColor: ["#22c55e", "#ef4444"]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl font-bold">Teacher Dashboard</h2>

          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <p>
            <span className="font-semibold">Name:</span> {teacher.name}
          </p>
          <p>
            <span className="font-semibold">Email:</span> {teacher.email}
          </p>
          <p>
            <span className="font-semibold">Mobile:</span> {teacher.mobile}
          </p>
          <p>
            <span className="font-semibold">Batch:</span>{" "}
            {teacher.batch?.name || "Not assigned"}
          </p>
          <p>
            <span className="font-semibold">Mentor:</span>{" "}
            {teacher.isMentor ? "Yes" : "No"}
          </p>
        </div>
      </div>

      {message && (
        <div className="mt-4 bg-blue-100 text-blue-700 p-3 rounded">
          {message}
        </div>
      )}

     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
  <div className="bg-white p-4 rounded-xl shadow">
    <h3 className="font-semibold">Total Students</h3>
    <p className="text-2xl font-bold">{students.length}</p>
  </div>

  <div className="bg-white p-4 rounded-xl shadow">
    <h3 className="font-semibold">Assigned Subjects</h3>
    <p className="text-2xl font-bold">{subjects.length}</p>
  </div>

  <div className="bg-white p-4 rounded-xl shadow">
    <h3 className="font-semibold">Pending Gatepasses</h3>
    <p className="text-2xl font-bold">{gatepasses.length}</p>
  </div>

  <div
    onClick={() => navigate("/teacher/assignments")}
    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-xl shadow cursor-pointer hover:scale-105 transition"
  >
    <div className="flex items-center gap-2">
      <PlusCircle size={22} />
      <h3 className="font-semibold">Assignments</h3>
    </div>

    <p className="mt-2 text-sm">
       View Analytics & Create Assignments
    </p>

    <p className="mt-3 font-bold">
      Open →
    </p>
  </div>
</div>
      <TodayScheduleCard
        title="Today's Schedule"
        day={scheduleDay}
        schedule={todaySchedule}
        showBatch
      />
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Students List</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <select
            value={viewSubject}
            onChange={(e) => setViewSubject(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select Subject for Monthly View</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>

          <select
            value={viewMonth}
            onChange={(e) => setViewMonth(e.target.value)}
            className="border p-2 rounded"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                Month {m}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={viewYear}
            onChange={(e) => setViewYear(e.target.value)}
            className="border p-2 rounded"
            placeholder="Year"
          />
        </div>

        {students.length === 0 ? (
          <p className="text-gray-500">No students found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 border text-left">Roll No</th>
                  <th className="p-2 border text-left">Name</th>
                  <th className="p-2 border text-left">Email</th>
                  <th className="p-2 border text-left">Mobile</th>
                  <th className="p-2 border text-left">Attendance</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student) => (
                  <tr key={student._id}>
                    <td className="p-2 border">{student.rollNo}</td>
                    <td className="p-2 border">{student.name}</td>
                    <td className="p-2 border">{student.email}</td>
                    <td className="p-2 border">{student.studentMobile}</td>
                    <td className="p-2 border">
                      <button
                        onClick={() => handleViewAttendance(student)}
                        className="bg-indigo-500 text-white px-3 py-1 rounded"
                      >
                        View Attendance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {viewStudent && monthlyAttendance && (
          <div className="mt-6 bg-gray-100 p-4 rounded-xl">
            <h3 className="font-semibold mb-3">
              Monthly Attendance: {viewStudent.name}
            </h3>

            <p className="mb-2">
              Percentage:{" "}
              <span
                className={`font-bold ${
                  Number(monthlyAttendance.percentage) < 50
                    ? "text-red-500"
                    : "text-green-600"
                }`}
              >
                {monthlyAttendance.percentage}%
              </span>
            </p>

            <p>Total Classes: {monthlyAttendance.total}</p>
            <p>Present: {monthlyAttendance.present}</p>
            <p>Absent: {monthlyAttendance.absent}</p>

            <div className="max-w-xs mt-4">
              <Pie data={monthlyPieData} />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">
          Issue Monthly Low Attendance Notification
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={alertSubject}
            onChange={(e) => setAlertSubject(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="">Select Subject</option>
            {subjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subject.name}
              </option>
            ))}
          </select>

          <select
            value={alertMonth}
            onChange={(e) => setAlertMonth(e.target.value)}
            className="border p-2 rounded"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
              <option key={m} value={m}>
                Month {m}
              </option>
            ))}
          </select>

          <input
            type="number"
            value={alertYear}
            onChange={(e) => setAlertYear(e.target.value)}
            className="border p-2 rounded"
            placeholder="Year"
          />

          <button
            onClick={handleIssueLowAttendance}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Issue Notifications
          </button>
        </div>

        {lowStudents.length > 0 && (
          <div className="mt-4">
            <h4 className="font-semibold mb-2">Students Below 50%</h4>

            {lowStudents.map((item) => (
              <div
                key={item.student._id}
                className="p-3 border-b bg-red-50"
              >
                <p className="font-medium">
                  {item.student.name} - {item.percentage}%
                </p>
                <p className="text-sm text-gray-600">
                  Present: {item.present}, Absent: {item.absent}, Total:{" "}
                  {item.total}
                </p>
                <p className="text-sm text-red-600">
                  {item.notification}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Mark Attendance</h3>

        <form onSubmit={handleMarkAttendance}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="border p-2 rounded"
              required
            >
              <option value="">Select Subject</option>

              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>
                  {subject.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="border p-2 rounded"
              required
            />
          </div>

          {students.length === 0 ? (
            <p className="text-gray-500">No students available for attendance</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-2 border text-left">Roll No</th>
                    <th className="p-2 border text-left">Name</th>
                    <th className="p-2 border text-left">Attendance</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td className="p-2 border">{student.rollNo}</td>
                      <td className="p-2 border">{student.name}</td>
                      <td className="p-2 border">
                        <select
                          value={attendance[student._id] || "present"}
                          onChange={(e) =>
                            handleAttendanceChange(student._id, e.target.value)
                          }
                          className="border p-1 rounded"
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
            Submit Attendance
          </button>
        </form>
      </div>

      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Pending Gatepass Requests</h3>

        {!teacher.isMentor ? (
          <p className="text-gray-500">
            You are not assigned as a mentor, so no gatepass requests are shown.
          </p>
        ) : gatepasses.length === 0 ? (
          <p className="text-gray-500">No pending gatepass requests</p>
        ) : (
          gatepasses.map((gp) => (
            <div
              key={gp._id}
              className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 p-3 border-b"
            >
              <div>
                <p className="font-medium">
                  {gp.student?.name} ({gp.student?.rollNo})
                </p>

                <p className="text-sm text-gray-500">
                  Date: {new Date(gp.date).toLocaleDateString()}
                </p>

                <p className="text-sm text-gray-500">Exit: {gp.exitTime || "09:00"} · expected return: {gp.expectedReturnTime || "17:00"}</p>

                <p className="text-sm text-gray-500">
                  Reason: {gp.reason}
                </p>
                {gp.details && <p className="text-sm text-gray-500">Details: {gp.details}</p>}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApproveGatepass(gp._id)}
                  className="bg-green-500 text-white px-3 py-1 rounded"
                >
                  Approve
                </button>

                <button
                  onClick={() => handleRejectGatepass(gp._id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
