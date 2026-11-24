import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API_BASE from "../services/apiBase";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });
const emptyShift = () => ({ name: "Day", startTime: "08:00", endTime: "16:00", days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] });

export default function AdminCampusGates() {
  const [gates, setGates] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [newShift, setNewShift] = useState(emptyShift());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setError("");
    try {
      const response = await fetch(`${API_BASE}/campus-gates`, { headers: headers() });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load campus gates.");
      setGates(data.gates || []);
      setDrafts(Object.fromEntries((data.gates || []).map((gate) => [gate._id, {
        name: gate.name, location: gate.location || "", status: gate.status,
        shifts: (gate.shifts || []).map(({ name: shiftName, startTime, endTime, days }) => ({ name: shiftName, startTime, endTime, days }))
      }])));
    } catch (requestError) { setError(requestError.message || "Could not load campus gates."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const createGate = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const response = await fetch(`${API_BASE}/campus-gates`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ name, location, shifts: [newShift] }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not create gate.");
      setMessage(data.message); setName(""); setLocation(""); setNewShift(emptyShift()); await load();
    } catch (requestError) { setError(requestError.message || "Could not create gate."); }
  };

  const saveGate = async (event, gate) => {
    event.preventDefault(); setError(""); setMessage("");
    try {
      const response = await fetch(`${API_BASE}/campus-gates/${gate._id}`, { method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify(drafts[gate._id]) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save gate settings.");
      setMessage(data.message); await load();
    } catch (requestError) { setError(requestError.message || "Could not save gate settings."); }
  };

  const patchDraft = (id, patch) => setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  const patchShift = (id, index, patch) => setDrafts((current) => ({ ...current, [id]: { ...current[id], shifts: current[id].shifts.map((shift, i) => i === index ? { ...shift, ...patch } : shift) } }));
  const toggleDay = (days, day) => days.includes(day) ? days.filter((item) => item !== day) : [...days, day];

  return <main className="min-h-screen bg-slate-50 p-5 md:p-8"><header className="mx-auto flex max-w-5xl items-center justify-between rounded-2xl bg-white p-5 shadow-sm"><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">NEXUS ADMIN</p><h1 className="text-2xl font-bold">Campus gates and shifts</h1></div><Link className="rounded-lg border px-4 py-2" to="/admin/gatepass-policy">Back to gatepass controls</Link></header>
    {message && <p className="mx-auto mt-4 max-w-5xl rounded-xl bg-emerald-50 p-3 text-emerald-800" role="status">{message}</p>}{error && <p className="mx-auto mt-4 max-w-5xl rounded-xl bg-red-50 p-3 text-red-800" role="alert">{error}</p>}
    <div className="mx-auto mt-5 grid max-w-5xl gap-5"><section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Register a gate</h2><form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={createGate}><label className="grid gap-1 text-sm">Gate name<input className="rounded-lg border p-2" maxLength="100" required value={name} onChange={(event) => setName(event.target.value)} /></label><label className="grid gap-1 text-sm">Location<input className="rounded-lg border p-2" maxLength="200" value={location} onChange={(event) => setLocation(event.target.value)} /></label><div className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-3 md:col-span-2"><label className="grid gap-1 text-sm">First shift name<input className="rounded border p-2" required maxLength="60" value={newShift.name} onChange={(event) => setNewShift({ ...newShift, name: event.target.value })} /></label><label className="grid gap-1 text-sm">Starts<input className="rounded border p-2" type="time" required value={newShift.startTime} onChange={(event) => setNewShift({ ...newShift, startTime: event.target.value })} /></label><label className="grid gap-1 text-sm">Ends<input className="rounded border p-2" type="time" required value={newShift.endTime} onChange={(event) => setNewShift({ ...newShift, endTime: event.target.value })} /></label><fieldset className="flex flex-wrap gap-3 text-xs sm:col-span-3"><legend className="mb-1 font-semibold">Days</legend>{WEEKDAYS.map((day) => <label key={day} className="flex items-center gap-1"><input type="checkbox" checked={newShift.days.includes(day)} onChange={() => setNewShift({ ...newShift, days: toggleDay(newShift.days, day) })} />{day.slice(0, 3)}</label>)}</fieldset></div><button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white md:col-span-2">Create gate and shift</button></form></section>
      <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Manage registered gates</h2>{loading ? <p className="mt-3">Loading…</p> : gates.length ? <div className="mt-3 grid gap-4">{gates.map((gate) => { const draft = drafts[gate._id]; if (!draft) return null; return <form key={gate._id} className="grid gap-3 rounded-xl border p-4" onSubmit={(event) => saveGate(event, gate)}><div className="grid gap-3 md:grid-cols-3"><label className="grid gap-1 text-sm">Gate name<input className="rounded border p-2" required maxLength="100" value={draft.name} onChange={(event) => patchDraft(gate._id, { name: event.target.value })} /></label><label className="grid gap-1 text-sm">Location<input className="rounded border p-2" maxLength="200" value={draft.location} onChange={(event) => patchDraft(gate._id, { location: event.target.value })} /></label><label className="grid gap-1 text-sm">Status<select className="rounded border p-2" value={draft.status} onChange={(event) => patchDraft(gate._id, { status: event.target.value })}><option value="active">Active</option><option value="disabled">Disabled</option></select></label></div><div className="grid gap-3">{draft.shifts.map((shift, index) => <div key={`${gate._id}-${index}`} className="grid gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-3"><label className="grid gap-1 text-sm">Shift name<input className="rounded border p-2" required maxLength="60" value={shift.name} onChange={(event) => patchShift(gate._id, index, { name: event.target.value })} /></label><label className="grid gap-1 text-sm">Starts<input className="rounded border p-2" type="time" required value={shift.startTime} onChange={(event) => patchShift(gate._id, index, { startTime: event.target.value })} /></label><label className="grid gap-1 text-sm">Ends<input className="rounded border p-2" type="time" required value={shift.endTime} onChange={(event) => patchShift(gate._id, index, { endTime: event.target.value })} /></label><fieldset className="flex flex-wrap gap-3 text-xs sm:col-span-3"><legend className="mb-1 font-semibold">Days</legend>{WEEKDAYS.map((day) => <label key={day} className="flex items-center gap-1"><input type="checkbox" checked={shift.days.includes(day)} onChange={() => patchShift(gate._id, index, { days: toggleDay(shift.days, day) })} />{day.slice(0, 3)}</label>)}</fieldset><button type="button" className="justify-self-start rounded border border-red-300 px-3 py-1 text-sm text-red-700" onClick={() => patchDraft(gate._id, { shifts: draft.shifts.filter((_, i) => i !== index) })}>Remove shift</button></div>)}</div><div className="flex flex-wrap gap-2"><button type="button" className="rounded border px-3 py-2 text-sm" disabled={draft.shifts.length >= 12} onClick={() => patchDraft(gate._id, { shifts: [...draft.shifts, { ...emptyShift(), name: `Shift ${draft.shifts.length + 1}` }] })}>Add shift</button><button className="rounded bg-slate-900 px-4 py-2 text-sm text-white">Save gate settings</button></div><p className="text-xs text-slate-500">A staffed gate cannot be disabled or have its assigned shift removed.</p></form>; })}</div> : <p className="mt-3 text-sm text-slate-600">No gates are registered yet.</p>}</section>
    </div></main>;
}
