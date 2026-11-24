import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../services/apiBase";

const API = API_BASE;
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];

const emptyForm = {
  batch: "",
  day: "Monday",
  startTime: "",
  endTime: "",
  subject: "",
  teacher: ""
};

const AdminTimetable = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    }),
    [token]
  );

  const [entries, setEntries] = useState([]);
  const [batches, setBatches] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [filters, setFilters] = useState({ batch: "", teacher: "", day: "" });
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState([]);
  const [file, setFile] = useState(null);
  const [importSummary, setImportSummary] = useState(null);

  const loadEntries = async () => {
    const params = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, value]) => value))
    );
    const response = await fetch(`${API}/timetable?${params}`, { headers });
    const data = await response.json();
    setEntries(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [batchRes, teacherRes, subjectRes] = await Promise.all([
          fetch(`${API}/batch`),
          fetch(`${API}/teacher`),
          fetch(`${API}/subject`)
        ]);
        setBatches(await batchRes.json());
        setTeachers(await teacherRes.json());
        setSubjects(await subjectRes.json());
        await loadEntries();
      } catch (error) {
        setMessage("Failed to load timetable data");
      }
    };
    load();
  }, []);

  useEffect(() => {
    loadEntries().catch(() => setMessage("Failed to refresh timetable"));
  }, [filters]);

  const availableSubjects = subjects.filter(
    (subject) => (subject.batch?._id || subject.batch) === form.batch
  );

  const visibleEntries = entries.filter((entry) => {
    const text = `${entry.batch?.name} ${entry.teacher?.name} ${entry.subject?.name}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const saveEntry = async (event) => {
    event.preventDefault();
    setMessage("");
    setErrors([]);

    const response = await fetch(
      editingId ? `${API}/timetable/${editingId}` : `${API}/timetable`,
      {
        method: editingId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form)
      }
    );
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || "Unable to save timetable entry");
      return;
    }

    setMessage(data.message);
    resetForm();
    loadEntries();
  };

  const editEntry = (entry) => {
    setEditingId(entry._id);
    setForm({
      batch: entry.batch?._id || "",
      day: entry.day,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subject: entry.subject?._id || "",
      teacher: entry.teacher?._id || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Delete this timetable entry?")) return;
    const response = await fetch(`${API}/timetable/${id}`, {
      method: "DELETE",
      headers
    });
    const data = await response.json();
    setMessage(data.message || "Unable to delete timetable entry");
    if (response.ok) loadEntries();
  };

  const importFile = async (event, dryRun = false) => {
    event?.preventDefault();
    if (!file) return;

    const body = new FormData();
    body.append("file", file);
    body.append("replaceExisting", "true");
    body.append("dryRun", String(dryRun));

    const response = await fetch(`${API}/timetable/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body
    });
    const data = await response.json();
    setMessage(data.message);
    setErrors(data.errors || []);
    setImportSummary(data.created || null);
    if (response.ok && !dryRun) {
      setFile(null);
      event?.target.reset();
      loadEntries();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-800 text-white rounded-2xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider">
              Nexus ERP
            </p>
            <h1 className="text-3xl font-bold mt-1">Timetable Management</h1>
            <p className="text-indigo-100 mt-2">
              Central scheduling for teachers, batches and subjects.
            </p>
          </div>
          <button
            onClick={() => navigate("/admin")}
            className="bg-white text-indigo-800 px-4 py-2 rounded-lg font-semibold"
          >
            Back to Admin
          </button>
        </div>

        {message && (
          <div className="mt-4 bg-blue-100 text-blue-800 p-3 rounded-xl">{message}</div>
        )}
        {errors.length > 0 && (
          <div className="mt-3 bg-red-50 text-red-700 p-3 rounded-xl">
            {errors.map((error, index) => <p key={`${error}-${index}`}>{error}</p>)}
          </div>
        )}
        {importSummary && (
          <div className="mt-3 bg-emerald-50 text-emerald-800 p-4 rounded-xl">
            <p className="font-bold">Import Summary</p>
            <p className="text-sm mt-1">
              Created {importSummary.batches.length} batches, {importSummary.teachers.length} teachers
              and {importSummary.subjects.length} subjects. The same timetable now powers student and
              teacher schedules.
            </p>
            {importSummary.teachers.length > 0 && (
              <div className="mt-3 text-sm">
                <p className="font-semibold">New faculty temporary logins</p>
                {importSummary.teachers.map((teacher) => (
                  <p key={teacher.email}>{teacher.name}: {teacher.email} / {teacher.password}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
          <form onSubmit={saveEntry} className="bg-white rounded-2xl shadow p-5">
            <h2 className="text-lg font-bold">{editingId ? "Edit Entry" : "Create Entry"}</h2>
            <div className="space-y-3 mt-4">
              <select value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value, subject: "" })} className="w-full border rounded-lg p-2" required>
                <option value="">Select Batch</option>
                {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
              </select>
              <select value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} className="w-full border rounded-lg p-2">
                {DAYS.map((day) => <option key={day}>{day}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="border rounded-lg p-2" required />
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="border rounded-lg p-2" required />
              </div>
              <select value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full border rounded-lg p-2" required>
                <option value="">Select Subject</option>
                {availableSubjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
              </select>
              <select value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} className="w-full border rounded-lg p-2" required>
                <option value="">Select Teacher</option>
                {teachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg">{editingId ? "Update" : "Add Slot"}</button>
              {editingId && <button type="button" onClick={resetForm} className="border px-4 py-2 rounded-lg">Cancel</button>}
            </div>
          </form>

          <form onSubmit={importFile} className="bg-white rounded-2xl shadow p-5 xl:col-span-2">
            <h2 className="text-lg font-bold">Upload Timetable Excel</h2>
            <p className="text-sm text-gray-600 mt-2">
              Upload your departmental weekly timetable grid or a normalized sheet with columns:
              Batch, Day, Start Time, End Time, Subject, Teacher. Import updates shared batch,
              student and faculty schedules after every slot passes validation.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files[0])} className="border rounded-lg p-2 flex-1" required />
              <button type="button" onClick={(event) => importFile(event, true)} className="border border-indigo-600 text-indigo-700 px-5 py-2 rounded-lg font-semibold">Validate File</button>
              <button className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-semibold">Import and Replace</button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow p-5 mt-5">
          <h2 className="text-lg font-bold">Filters and Search</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
            <select value={filters.batch} onChange={(e) => setFilters({ ...filters, batch: e.target.value })} className="border rounded-lg p-2">
              <option value="">All batches</option>
              {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
            </select>
            <select value={filters.teacher} onChange={(e) => setFilters({ ...filters, teacher: e.target.value })} className="border rounded-lg p-2">
              <option value="">All teachers</option>
              {teachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.name}</option>)}
            </select>
            <select value={filters.day} onChange={(e) => setFilters({ ...filters, day: e.target.value })} className="border rounded-lg p-2">
              <option value="">All days</option>
              {DAYS.map((day) => <option key={day}>{day}</option>)}
            </select>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search batch, teacher or subject" className="border rounded-lg p-2" />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-5 mt-5 overflow-x-auto">
          <h2 className="text-lg font-bold mb-4">Weekly Timetable</h2>
          <table className="w-full min-w-[850px] border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="p-3 text-left">Day</th>
                <th className="p-3 text-left">Time</th>
                <th className="p-3 text-left">Batch</th>
                <th className="p-3 text-left">Subject</th>
                <th className="p-3 text-left">Teacher</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry._id} className="border-b hover:bg-indigo-50">
                  <td className="p-3 font-semibold">{entry.day}</td>
                  <td className="p-3">{entry.startTime} - {entry.endTime}</td>
                  <td className="p-3">{entry.batch?.name}</td>
                  <td className="p-3">{entry.subject?.name}</td>
                  <td className="p-3">{entry.teacher?.name}</td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => editEntry(entry)} className="text-indigo-700 font-semibold">Edit</button>
                    <button onClick={() => deleteEntry(entry._id)} className="text-red-600 font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {visibleEntries.length === 0 && <p className="text-gray-500 mt-4">No timetable entries found.</p>}
        </div>
      </div>
    </div>
  );
};

export default AdminTimetable;
