import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminRegistrationPanel from "./AdminRegistrationPanel";
import API_BASE from "../services/apiBase";

const authorizationHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`
});

const AdminDashboard = () => {
  const navigate = useNavigate();

  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [expandedBatch, setExpandedBatch] = useState(null);
  const [message, setMessage] = useState("");

  const [batchName, setBatchName] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");

  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherMobile, setTeacherMobile] = useState("");
  const [teacherBatch, setTeacherBatch] = useState("");
  const [isMentor, setIsMentor] = useState(false);

  const [subjectName, setSubjectName] = useState("");
  const [subjectTeacher, setSubjectTeacher] = useState("");
  const [subjectBatch, setSubjectBatch] = useState("");

  const [studentName, setStudentName] = useState("");
  const [studentRollNo, setStudentRollNo] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPassword, setStudentPassword] = useState("");
  const [studentMobile, setStudentMobile] = useState("");
  const [parentMobile, setParentMobile] = useState("");
  const [studentBatch, setStudentBatch] = useState("");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const fetchAllData = async () => {
    try {
      const [batchRes, teacherRes, subjectRes, studentRes] = await Promise.all([
        fetch(`${API_BASE}/batch`, { headers: authorizationHeaders() }),
        fetch(`${API_BASE}/teacher`, { headers: authorizationHeaders() }),
        fetch(`${API_BASE}/subject`, { headers: authorizationHeaders() }),
        fetch(`${API_BASE}/student`, { headers: authorizationHeaders() })
      ]);

      const batchData = await batchRes.json();
      const teacherData = await teacherRes.json();
      const subjectData = await subjectRes.json();
      const studentData = await studentRes.json();

      setBatches(Array.isArray(batchData) ? batchData : []);
      setTeachers(Array.isArray(teacherData) ? teacherData : []);
      setSubjects(Array.isArray(subjectData) ? subjectData : []);
      setStudents(Array.isArray(studentData) ? studentData : []);
    } catch (error) {
      console.error("Fetch error:", error);
      setMessage("Failed to fetch dashboard data");
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleAddBatch = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/batch/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authorizationHeaders()
        },
        body: JSON.stringify({
          name: batchName,
          startYear,
          endYear
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || data.error || "Failed to add batch");
        return;
      }

      setMessage("Batch added successfully");
      setBatchName("");
      setStartYear("");
      setEndYear("");
      fetchAllData();
    } catch (error) {
      console.error("Add batch error:", error);
      setMessage("Something went wrong");
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/teacher/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authorizationHeaders()
        },
        body: JSON.stringify({
          name: teacherName,
          email: teacherEmail,
          password: teacherPassword,
          mobile: teacherMobile,
          batch: teacherBatch,
          isMentor
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || data.error || "Failed to add teacher");
        return;
      }

      setMessage("Teacher added successfully");

      setTeacherName("");
      setTeacherEmail("");
      setTeacherPassword("");
      setTeacherMobile("");
      setTeacherBatch("");
      setIsMentor(false);

      fetchAllData();
    } catch (error) {
      console.error("Add teacher error:", error);
      setMessage("Error adding teacher");
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/subject/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authorizationHeaders()
        },
        body: JSON.stringify({
          name: subjectName,
          teacher: subjectTeacher,
          batch: subjectBatch
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || data.error || "Failed to add subject");
        return;
      }

      setMessage("Subject added successfully");

      setSubjectName("");
      setSubjectTeacher("");
      setSubjectBatch("");

      fetchAllData();
    } catch (error) {
      console.error("Add subject error:", error);
      setMessage("Error adding subject");
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await fetch(`${API_BASE}/student/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authorizationHeaders()
        },
        body: JSON.stringify({
          name: studentName,
          rollNo: studentRollNo,
          email: studentEmail,
          password: studentPassword,
          studentMobile,
          parentMobile,
          batch: studentBatch
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || data.error || "Failed to add student");
        return;
      }

      setMessage("Student added successfully");

      setStudentName("");
      setStudentRollNo("");
      setStudentEmail("");
      setStudentPassword("");
      setStudentMobile("");
      setParentMobile("");
      setStudentBatch("");

      fetchAllData();
    } catch (error) {
      console.error("Add student error:", error);
      setMessage("Error adding student");
    }
  };

  const handleDeleteTeacher = async (id) => {
    const confirmDelete = window.confirm("Delete this teacher?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE}/teacher/${id}`, {
        method: "DELETE",
        headers: authorizationHeaders()
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || data.error || "Failed to delete teacher");
        return;
      }

      setMessage("Teacher deleted successfully");
      fetchAllData();
    } catch (error) {
      console.error("Delete teacher error:", error);
      setMessage("Error deleting teacher");
    }
  };

  const handleDeleteStudent = async (id) => {
    const confirmDelete = window.confirm("Delete this student?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_BASE}/student/${id}`, {
        method: "DELETE",
        headers: authorizationHeaders()
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.message || data.error || "Failed to delete student");
        return;
      }

      setMessage("Student deleted successfully");
      fetchAllData();
    } catch (error) {
      console.error("Delete student error:", error);
      setMessage("Error deleting student");
    }
  };

  const getBatchTeachers = (batchId) =>
    teachers.filter((teacher) => teacher.batch?._id === batchId || teacher.batch === batchId);

  const getBatchStudents = (batchId) =>
    students.filter((student) => student.batch?._id === batchId || student.batch === batchId);

  const getBatchSubjects = (batchId) =>
    subjects.filter((subject) => subject.batch?._id === batchId || subject.batch === batchId);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* HEADER */}
      <div className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Admin Dashboard</h2>
          <p className="text-gray-500">Manage Nexus ERP</p>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {message && (
        <div className="mt-4 bg-blue-100 text-blue-700 p-3 rounded">
          {message}
        </div>
      )}

      <div className="mt-6 bg-gradient-to-r from-slate-900 to-indigo-800 text-white p-5 rounded-xl shadow flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Timetable Management</h3>
          <p className="text-indigo-100 mt-1">
            Upload weekly schedules, manage slots and detect timetable conflicts.
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/timetable")}
          className="bg-white text-indigo-800 px-4 py-2 rounded-lg font-semibold"
        >
          Open Timetable
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl bg-white p-5 shadow md:flex-row md:items-center md:justify-between">
        <div><h3 className="text-lg font-bold">Gatepass policy and quota reports</h3><p className="text-slate-600">Configure global, batch, and student quotas with an audit trail.</p></div>
        <button onClick={() => navigate("/admin/gatepass-policy")} className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Open policies</button>
      </div>

      <AdminRegistrationPanel />

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold">Total Batches</h3>
          <p className="text-2xl font-bold">{batches.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold">Total Teachers</h3>
          <p className="text-2xl font-bold">{teachers.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold">Total Subjects</h3>
          <p className="text-2xl font-bold">{subjects.length}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <h3 className="font-semibold">Total Students</h3>
          <p className="text-2xl font-bold">{students.length}</p>
        </div>
      </div>

      {/* ADD BATCH */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Add Batch</h3>

        <form
          onSubmit={handleAddBatch}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            type="text"
            placeholder="Batch Name e.g. 2023-27"
            value={batchName}
            onChange={(e) => setBatchName(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="number"
            placeholder="Start Year"
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="number"
            placeholder="End Year"
            value={endYear}
            onChange={(e) => setEndYear(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Add Batch
          </button>
        </form>
      </div>

      {/* ADD TEACHER */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Add Teacher</h3>

        <form
          onSubmit={handleAddTeacher}
          className="grid grid-cols-1 md:grid-cols-6 gap-3"
        >
          <input
            type="text"
            placeholder="Name"
            value={teacherName}
            onChange={(e) => setTeacherName(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={teacherEmail}
            onChange={(e) => setTeacherEmail(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={teacherPassword}
            onChange={(e) => setTeacherPassword(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="text"
            placeholder="Mobile"
            value={teacherMobile}
            onChange={(e) => setTeacherMobile(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <select
            value={teacherBatch}
            onChange={(e) => setTeacherBatch(e.target.value)}
            className="border p-2 rounded"
            required
          >
            <option value="">Select Batch</option>
            {batches.map((batch) => (
              <option key={batch._id} value={batch._id}>
                {batch.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isMentor}
              onChange={(e) => setIsMentor(e.target.checked)}
            />
            <span>Mentor</span>
          </div>

          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 md:col-span-6">
            Add Teacher
          </button>
        </form>
      </div>

      {/* ADD SUBJECT */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Add Subject</h3>

        <form
          onSubmit={handleAddSubject}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            type="text"
            placeholder="Subject Name"
            value={subjectName}
            onChange={(e) => setSubjectName(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <select
            value={subjectTeacher}
            onChange={(e) => setSubjectTeacher(e.target.value)}
            className="border p-2 rounded"
            required
          >
            <option value="">Select Teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher._id} value={teacher._id}>
                {teacher.name}
              </option>
            ))}
          </select>

          <select
            value={subjectBatch}
            onChange={(e) => setSubjectBatch(e.target.value)}
            className="border p-2 rounded"
            required
          >
            <option value="">Select Batch</option>
            {batches.map((batch) => (
              <option key={batch._id} value={batch._id}>
                {batch.name}
              </option>
            ))}
          </select>

          <button className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600">
            Add Subject
          </button>
        </form>
      </div>

      {/* ADD STUDENT */}
      <div className="mt-6 bg-white p-4 rounded-xl shadow">
        <h3 className="font-semibold mb-3">Add Student</h3>

        <form
          onSubmit={handleAddStudent}
          className="grid grid-cols-1 md:grid-cols-4 gap-3"
        >
          <input
            type="text"
            placeholder="Student Name"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="text"
            placeholder="Roll No"
            value={studentRollNo}
            onChange={(e) => setStudentRollNo(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={studentPassword}
            onChange={(e) => setStudentPassword(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="text"
            placeholder="Student Mobile"
            value={studentMobile}
            onChange={(e) => setStudentMobile(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <input
            type="text"
            placeholder="Parent Mobile"
            value={parentMobile}
            onChange={(e) => setParentMobile(e.target.value)}
            className="border p-2 rounded"
            required
          />

          <select
            value={studentBatch}
            onChange={(e) => setStudentBatch(e.target.value)}
            className="border p-2 rounded"
            required
          >
            <option value="">Select Batch</option>
            {batches.map((batch) => (
              <option key={batch._id} value={batch._id}>
                {batch.name}
              </option>
            ))}
          </select>

          <button className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600">
            Add Student
          </button>
        </form>
      </div>

      {/* BATCH CARDS */}
      <div className="mt-6">
        <h3 className="font-semibold mb-3 text-xl">Batch Wise Management</h3>

        {batches.length === 0 ? (
          <p className="text-gray-500">No batches found</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {batches.map((batch) => {
              const batchTeachers = getBatchTeachers(batch._id);
              const batchStudents = getBatchStudents(batch._id);
              const batchSubjects = getBatchSubjects(batch._id);
              const isOpen = expandedBatch === batch._id;

              return (
                <div key={batch._id} className="bg-white rounded-xl shadow">
                  <button
                    onClick={() =>
                      setExpandedBatch(isOpen ? null : batch._id)
                    }
                    className="w-full p-4 text-left flex flex-col md:flex-row md:justify-between md:items-center gap-3"
                  >
                    <div>
                      <h4 className="text-lg font-bold">{batch.name}</h4>
                      <p className="text-gray-500">
                        {batch.startYear} - {batch.endYear}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-blue-100 px-4 py-2 rounded">
                        <p className="font-bold">{batchStudents.length}</p>
                        <p className="text-sm">Students</p>
                      </div>

                      <div className="bg-green-100 px-4 py-2 rounded">
                        <p className="font-bold">{batchTeachers.length}</p>
                        <p className="text-sm">Teachers</p>
                      </div>

                      <div className="bg-purple-100 px-4 py-2 rounded">
                        <p className="font-bold">{batchSubjects.length}</p>
                        <p className="text-sm">Subjects</p>
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-4 border-t">
                      {/* SUBJECTS */}
                      <div className="mb-6">
                        <h5 className="font-semibold mb-2">
                          Subjects in {batch.name}
                        </h5>

                        {batchSubjects.length === 0 ? (
                          <p className="text-gray-500">No subjects</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full border">
                              <thead>
                                <tr className="bg-gray-200">
                                  <th className="p-2 border text-left">
                                    Subject
                                  </th>
                                  <th className="p-2 border text-left">
                                    Teacher
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {batchSubjects.map((subject) => (
                                  <tr key={subject._id}>
                                    <td className="p-2 border">
                                      {subject.name}
                                    </td>
                                    <td className="p-2 border">
                                      {subject.teacher?.name || "Not assigned"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* TEACHERS */}
                      <div className="mb-6">
                        <h5 className="font-semibold mb-2">
                          Teachers in {batch.name}
                        </h5>

                        {batchTeachers.length === 0 ? (
                          <p className="text-gray-500">No teachers</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full border">
                              <thead>
                                <tr className="bg-gray-200">
                                  <th className="p-2 border text-left">
                                    Name
                                  </th>
                                  <th className="p-2 border text-left">
                                    Email
                                  </th>
                                  <th className="p-2 border text-left">
                                    Mobile
                                  </th>
                                  <th className="p-2 border text-left">
                                    Mentor
                                  </th>
                                  <th className="p-2 border text-left">
                                    Action
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {batchTeachers.map((teacher) => (
                                  <tr key={teacher._id}>
                                    <td className="p-2 border">
                                      {teacher.name}
                                    </td>
                                    <td className="p-2 border">
                                      {teacher.email}
                                    </td>
                                    <td className="p-2 border">
                                      {teacher.mobile}
                                    </td>
                                    <td className="p-2 border">
                                      {teacher.isMentor ? "Yes" : "No"}
                                    </td>
                                    <td className="p-2 border">
                                      <button
                                        onClick={() =>
                                          handleDeleteTeacher(teacher._id)
                                        }
                                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* STUDENTS */}
                      <div>
                        <h5 className="font-semibold mb-2">
                          Students in {batch.name}
                        </h5>

                        {batchStudents.length === 0 ? (
                          <p className="text-gray-500">No students</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full border">
                              <thead>
                                <tr className="bg-gray-200">
                                  <th className="p-2 border text-left">
                                    Roll No
                                  </th>
                                  <th className="p-2 border text-left">
                                    Name
                                  </th>
                                  <th className="p-2 border text-left">
                                    Email
                                  </th>
                                  <th className="p-2 border text-left">
                                    Student Mobile
                                  </th>
                                  <th className="p-2 border text-left">
                                    Parent Mobile
                                  </th>
                                  <th className="p-2 border text-left">
                                    Action
                                  </th>
                                </tr>
                              </thead>

                              <tbody>
                                {batchStudents.map((student) => (
                                  <tr key={student._id}>
                                    <td className="p-2 border">
                                      {student.rollNo}
                                    </td>
                                    <td className="p-2 border">
                                      {student.name}
                                    </td>
                                    <td className="p-2 border">
                                      {student.email}
                                    </td>
                                    <td className="p-2 border">
                                      {student.studentMobile}
                                    </td>
                                    <td className="p-2 border">
                                      {student.parentMobile}
                                    </td>
                                    <td className="p-2 border">
                                      <button
                                        onClick={() =>
                                          handleDeleteStudent(student._id)
                                        }
                                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
