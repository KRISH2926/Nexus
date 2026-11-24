import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API_BASE from "../services/apiBase";

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

export default function AdminGatepassPolicy() {
  const navigate = useNavigate();
  const [policies, setPolicies] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [usage, setUsage] = useState([]);
  const [audit, setAudit] = useState([]);
  const [reports, setReports] = useState({ statusCounts: {}, recentScans: [] });
  const [activePasses, setActivePasses] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [gates, setGates] = useState([]);
  const [personnelDrafts, setPersonnelDrafts] = useState({});
  const [scope, setScope] = useState("global");
  const [scopeId, setScopeId] = useState("");
  const [monthlyQuota, setMonthlyQuota] = useState("2");
  const [reason, setReason] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [effectiveUntil, setEffectiveUntil] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError("");
    try {
      const responses = await Promise.all([
        fetch(`${API_BASE}/gatepass/admin/policies`, { headers: headers() }),
        fetch(`${API_BASE}/gatepass/admin/usage`, { headers: headers() }),
        fetch(`${API_BASE}/gatepass/admin/audit`, { headers: headers() }),
        fetch(`${API_BASE}/gatepass/admin/reports`, { headers: headers() }),
        fetch(`${API_BASE}/gatepass/admin/active`, { headers: headers() }),
        fetch(`${API_BASE}/security/admin/personnel`, { headers: headers() }),
        fetch(`${API_BASE}/batch`, { headers: headers() }),
        fetch(`${API_BASE}/student`, { headers: headers() }),
        fetch(`${API_BASE}/campus-gates`, { headers: headers() })
      ]);
      const data = await Promise.all(responses.map((response) => response.json()));
      const failed = responses.findIndex((response) => !response.ok);
      if (failed >= 0) throw new Error(data[failed].message || "Could not load admin policy data.");
      setPolicies(data[0].policies || []); setUsage(data[1].usage || []); setAudit(data[2].entries || []); setReports(data[3]); setActivePasses(data[4].gatepasses || []);
      setPersonnel(data[5].personnel || []); setGates(data[8].gates || []);
      setPersonnelDrafts(Object.fromEntries((data[5].personnel || []).map((person) => [person._id, { assignedGate: person.assignedGate || "", assignedShift: person.assignedShift || "Day", status: person.status || "active" }])));
      setBatches(Array.isArray(data[6]) ? data[6] : []); setStudents(Array.isArray(data[7]) ? data[7] : []);
    } catch (requestError) { setError(requestError.message || "Could not load admin policy data."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const savePolicy = async (event) => {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch(`${API_BASE}/gatepass/admin/policies`, {
        method: "POST", headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ scope, scopeId: scope === "global" ? null : scopeId, monthlyQuota: Number(monthlyQuota), reason,
          effectiveFrom: effectiveFrom ? new Date(effectiveFrom).toISOString() : undefined,
          effectiveUntil: effectiveUntil ? new Date(effectiveUntil).toISOString() : undefined })
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not save policy.");
      setMessage(data.message); setReason(""); setEffectiveFrom(""); setEffectiveUntil(""); await load();
    } catch (requestError) { setError(requestError.message || "Could not save policy."); }
    finally { setSaving(false); }
  };

  const revokePass = async (pass) => {
    const revokeReason = window.prompt("Enter why this unused gatepass must be revoked:");
    if (!revokeReason) return;
    setError(""); setMessage("");
    try {
      const response = await fetch(`${API_BASE}/gatepass/admin/${pass._id}/revoke`, {
        method: "POST", headers: { ...headers(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason })
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not revoke pass.");
      setMessage(data.message); await load();
    } catch (requestError) { setError(requestError.message || "Could not revoke pass."); }
  };

  const savePersonnel = async (event, person) => {
    event.preventDefault(); setError(""); setMessage("");
    const draft = personnelDrafts[person._id];
    try {
      const response = await fetch(`${API_BASE}/security/admin/personnel/${person._id}`, {
        method: "PATCH", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(draft)
      });
      const data = await response.json(); if (!response.ok) throw new Error(data.message || "Could not update security assignment.");
      setMessage(data.message); await load();
    } catch (requestError) { setError(requestError.message || "Could not update security assignment."); }
  };

  const scopeOptions = scope === "batch" ? batches : scope === "student" ? students : [];
  return (
    <main className="min-h-screen bg-slate-50 p-5 md:p-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
        <div><p className="text-xs font-bold uppercase tracking-widest text-indigo-600">NEXUS ADMIN</p><h1 className="text-2xl font-bold text-slate-900">Gatepass policies and reports</h1></div>
        <div className="flex gap-3"><Link className="rounded-lg border px-4 py-2" to="/admin">Back to admin</Link><button className="rounded-lg bg-slate-900 px-4 py-2 text-white" onClick={() => { localStorage.clear(); navigate("/"); }}>Sign out</button></div>
      </header>
      {message && <p className="mx-auto mt-4 max-w-6xl rounded-xl bg-emerald-50 p-3 text-emerald-800" role="status">{message}</p>}
      {error && <p className="mx-auto mt-4 max-w-6xl rounded-xl bg-red-50 p-3 text-red-800" role="alert">{error}</p>}
      <div className="mx-auto mt-5 grid max-w-6xl gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">Create a quota policy</h2><p className="mt-1 text-sm text-slate-600">Default: 2 issued passes per student per calendar month. Exceptions are audited.</p>
          <form className="mt-4 grid gap-3" onSubmit={savePolicy}>
            <label className="grid gap-1 text-sm">Scope<select className="rounded-lg border p-2" value={scope} onChange={(event) => { setScope(event.target.value); setScopeId(""); }}><option value="global">Global</option><option value="batch">Batch</option><option value="student">Student</option></select></label>
            {scope !== "global" && <label className="grid gap-1 text-sm">{scope === "batch" ? "Batch" : "Student"}<select className="rounded-lg border p-2" required value={scopeId} onChange={(event) => setScopeId(event.target.value)}><option value="">Choose {scope}</option>{scopeOptions.map((item) => <option key={item._id} value={item._id}>{scope === "batch" ? item.name : `${item.name} (${item.rollNo})`}</option>)}</select></label>}
            <label className="grid gap-1 text-sm">Issued passes per calendar month<input className="rounded-lg border p-2" type="number" min="0" max="31" required value={monthlyQuota} onChange={(event) => setMonthlyQuota(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">Effective from (optional)<input className="rounded-lg border p-2" type="datetime-local" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">Effective until (optional)<input className="rounded-lg border p-2" type="datetime-local" value={effectiveUntil} onChange={(event) => setEffectiveUntil(event.target.value)} /></label>
            <label className="grid gap-1 text-sm">Reason for change<input className="rounded-lg border p-2" required minLength="3" maxLength="300" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={saving}>{saving ? "Saving…" : "Save audited policy"}</button>
          </form>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Policy history</h2>{loading ? <p className="mt-4">Loading…</p> : policies.length ? <div className="mt-4 overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Scope</th><th className="p-2">Quota</th><th className="p-2">Effective</th><th className="p-2">Reason</th></tr></thead><tbody>{policies.map((item) => <tr className="border-b" key={item._id}><td className="p-2">{item.scope}{item.scopeId?.name ? ` · ${item.scopeId.name}` : ""}</td><td className="p-2">{item.monthlyQuota}</td><td className="p-2">{new Date(item.effectiveFrom).toLocaleDateString()}{item.effectiveUntil ? ` – ${new Date(item.effectiveUntil).toLocaleDateString()}` : " – open"}</td><td className="p-2">{item.reason}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-slate-600">No overrides yet. The default quota of 2 applies.</p>}</section>
        <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Issued quota usage</h2>{usage.length ? <ul className="mt-3 divide-y">{usage.map((item) => <li className="flex justify-between py-2 text-sm" key={item.student?._id}><span>{item.student?.name} · {item.student?.rollNo}</span><strong>{item.issued} issued</strong></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No passes have used the monthly quota yet.</p>}</section>
        <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Gatepass status report</h2><div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">{Object.entries(reports.statusCounts || {}).map(([status, count]) => <div className="rounded-lg bg-slate-50 p-3" key={status}><strong className="block text-xl">{count}</strong><span className="capitalize text-slate-600">{status.replaceAll("_", " ")}</span></div>)}</div><h3 className="mt-5 font-semibold">Recent gate scans</h3>{reports.recentScans?.length ? <ul className="mt-2 divide-y">{reports.recentScans.slice(0, 10).map((item) => <li className="flex justify-between gap-2 py-2 text-sm" key={item._id}><span className="capitalize">{item.action} · {item.result} · {item.student?.name || item.reasonCode}</span><time className="text-slate-500">{new Date(item.createdAt).toLocaleString()}</time></li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No gate scan events have been recorded.</p>}</section>
        <section className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2"><h2 className="text-lg font-bold">Active passes and revocation</h2><p className="mt-1 text-sm text-slate-600">Only unused or unscanned passes can be revoked. Every revocation requires a reason and is audited.</p>{activePasses.length ? <div className="mt-3 overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-2">Student</th><th className="p-2">Date and time</th><th className="p-2">Reason</th><th className="p-2">Status</th><th className="p-2">Action</th></tr></thead><tbody>{activePasses.map((pass) => <tr className="border-b" key={pass._id}><td className="p-2">{pass.student?.name} · {pass.student?.rollNo}</td><td className="p-2">{new Date(pass.date).toLocaleDateString()} · {pass.exitTime || "09:00"}</td><td className="p-2">{pass.reason}</td><td className="p-2 capitalize">{pass.status}</td><td className="p-2"><button className="rounded border border-red-300 px-3 py-1 text-red-700" onClick={() => revokePass(pass)}>Revoke pass</button></td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-600">No unused approved or issued passes.</p>}</section>
        <section className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold">Security staffing</h2><p className="mt-1 text-sm text-slate-600">Gate and shift assignments are checked against the active campus gate roster. Every change is audited.</p></div><Link className="rounded-lg border px-3 py-2 text-sm" to="/admin/campus-gates">Manage gates and shifts</Link></div>{personnel.length ? <div className="mt-3 grid gap-3 md:grid-cols-2">{personnel.map((person) => { const draft = personnelDrafts[person._id] || {}; const selectedGate = gates.find((gate) => gate.name === draft.assignedGate); return <form className="grid gap-2 rounded-xl border p-3 sm:grid-cols-2" key={person._id} onSubmit={(event) => savePersonnel(event, person)}><div className="sm:col-span-2"><strong>{person.name}</strong><p className="text-xs text-slate-500">{person.employeeId} · {person.email}</p></div><label className="grid gap-1 text-xs">Assigned active gate<select className="rounded border p-2 text-sm" required value={draft.assignedGate || ""} onChange={(event) => { const gate = gates.find((item) => item.name === event.target.value); setPersonnelDrafts((current) => ({ ...current, [person._id]: { ...current[person._id], assignedGate: event.target.value, assignedShift: gate?.shifts?.[0]?.name || "" } })); }}><option value="">Choose gate</option>{gates.filter((gate) => gate.status === "active").map((gate) => <option key={gate._id} value={gate.name}>{gate.name}</option>)}</select></label><label className="grid gap-1 text-xs">Assigned shift<select className="rounded border p-2 text-sm" required value={draft.assignedShift || ""} onChange={(event) => setPersonnelDrafts((current) => ({ ...current, [person._id]: { ...current[person._id], assignedShift: event.target.value } }))}><option value="">Choose shift</option>{(selectedGate?.shifts || []).map((shift) => <option key={shift._id || shift.name} value={shift.name}>{shift.name} · {shift.startTime}–{shift.endTime}</option>)}</select></label><div className="flex gap-2 sm:col-span-2"><select aria-label={`${person.name} account status`} className="rounded border p-2 text-sm" value={draft.status || "active"} onChange={(event) => setPersonnelDrafts((current) => ({ ...current, [person._id]: { ...current[person._id], status: event.target.value } }))}><option value="active">Active</option><option value="disabled">Disabled</option></select><button className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Save staffing</button></div></form>; })}</div> : <p className="mt-3 text-sm text-slate-600">No security personnel accounts are registered.</p>}</section>
        <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-bold">Admin audit history</h2>{audit.length ? <ul className="mt-3 divide-y">{audit.map((item) => <li className="py-2 text-sm" key={item._id}><strong>{item.summary}</strong><p className="text-slate-500">{item.actor?.name || "Admin"} · {new Date(item.createdAt).toLocaleString()}</p></li>)}</ul> : <p className="mt-3 text-sm text-slate-600">No admin quota changes have been recorded.</p>}</section>
      </div>
    </main>
  );
}
