import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ParentPortal.css";
import API_BASE from "../services/apiBase";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null);
  const [rollNo, setRollNo] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  const token = localStorage.getItem("token");
  const loadWorkspace = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`${API_BASE}/parent/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load the parent portal.");
      setWorkspace(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not load the parent portal.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  const signOut = () => {
    ["token", "role", "name", "userId"].forEach((key) => localStorage.removeItem(key));
    navigate("/login");
  };

  const linkStudent = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setLinking(true);
    try {
      const response = await fetch(`${API_BASE}/parent/link-student`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rollNo: rollNo.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not link that student.");
      setNotice(data.message);
      setRollNo("");
      await loadWorkspace();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not link that student.");
    } finally {
      setLinking(false);
    }
  };

  const markRead = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/parent/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not update notification.");
      setWorkspace((current) => ({
        ...current,
        notifications: current.notifications.map((item) => item._id === id
          ? { ...item, readAt: data.notification.readAt }
          : item)
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update notification.");
    }
  };

  const decideGatepass = async (id, decision) => {
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_BASE}/gatepass/parent/${id}/decision`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ decision })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not record your decision.");
      setNotice(data.message);
      setWorkspace((current) => ({
        ...current,
        gatepasses: current.gatepasses.map((pass) => pass._id === id
          ? { ...data.gatepass, student: pass.student }
          : pass)
      }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not record your decision.");
    }
  };

  if (loading) return <main className="parent-portal"><p role="status">Loading parent portal…</p></main>;
  if (error && !workspace) return <main className="parent-portal"><p className="parent-error" role="alert">{error}</p><button onClick={loadWorkspace}>Retry</button><button onClick={signOut}>Sign out</button></main>;

  return (
    <main className="parent-portal">
      <header className="parent-header">
        <div><span className="parent-kicker">NEXUS PARENT PORTAL</span><h1>Welcome, {workspace.parent.name}</h1><p>{workspace.parent.email}</p></div>
        <button className="parent-secondary" onClick={signOut}>Sign out</button>
      </header>
      {error && <p className="parent-error" role="alert">{error}</p>}
      {notice && <p className="parent-notice" role="status">{notice}</p>}

      <section className="parent-section">
        <div className="parent-section__heading"><div><span className="parent-kicker">YOUR FAMILY</span><h2>Linked students</h2></div><span>{workspace.students.length} linked</span></div>
        {workspace.students.length === 0 ? <p className="parent-empty">No active students are linked to this account yet.</p> : (
          <div className="parent-student-grid">
            {workspace.students.map((student) => (
              <article className="parent-student-card" key={student._id}>
                <span className="parent-student-card__avatar" aria-hidden="true">{student.name.slice(0, 1).toUpperCase()}</span>
                <div><h3>{student.name}</h3><p>Roll no. {student.rollNo}</p><p>{student.batch?.name || "Batch information unavailable"}</p></div>
              </article>
            ))}
          </div>
        )}
        <form className="parent-link-form" onSubmit={linkStudent}>
          <label htmlFor="additional-rollno">Link another student using their roll number</label>
          <div><input id="additional-rollno" value={rollNo} onChange={(event) => setRollNo(event.target.value)} maxLength={50} required /><button disabled={linking}>{linking ? "Linking…" : "Link student"}</button></div>
          <small>Only students whose campus record contains this verified parent email can be linked.</small>
        </form>
      </section>

      <div className="parent-content-grid">
        <section className="parent-section">
          <div className="parent-section__heading"><div><span className="parent-kicker">CAMPUS UPDATES</span><h2>Notifications</h2></div></div>
          {workspace.notifications.length === 0 ? <p className="parent-empty">No parent notifications yet.</p> : (
            <ul className="parent-notification-list">
              {workspace.notifications.map((item) => (
                <li key={item._id} className={item.readAt ? "is-read" : ""}>
                  <div><strong>{item.student?.name || "Student"}</strong><p>{item.message}</p><span className="parent-email-status">Email delivery: {item.emailStatus ? item.emailStatus.replaceAll("_", " ") : "not configured"}</span><time>{new Date(item.createdAt).toLocaleString()}</time></div>
                  {!item.readAt && <button className="parent-text-button" onClick={() => markRead(item._id)}>Mark read</button>}
                </li>
              ))}
            </ul>
          )}
          <p className="parent-delivery-note">Email is sent only when campus SMTP is configured. Messages invite you to sign in; decisions are recorded inside NEXUS.</p>
        </section>

        <section className="parent-section">
          <div className="parent-section__heading"><div><span className="parent-kicker">CAMPUS ACCESS</span><h2>Gatepass requests</h2></div></div>
          {workspace.gatepasses.length === 0 ? <p className="parent-empty">No gatepass requests for linked students.</p> : (
            <ul className="parent-gatepass-list">
              {workspace.gatepasses.map((pass) => (
                <li key={pass._id}>
                  <div>
                    <strong>{pass.student?.name || "Student"}</strong>
                    <p>{pass.reason}</p>
                    <time>{new Date(pass.date).toLocaleString()}</time>
                    <p>Requested exit: {pass.exitTime || "09:00"} · expected return: {pass.expectedReturnTime || "17:00"}</p>
                    {pass.details && <p>Additional details: {pass.details}</p>}
                    {pass.status === "parent_pending" && <p className="parent-campus-status">Campus review is complete. Your decision is needed.</p>}
                    {pass.status === "approved" && !pass.parentDecision?.decidedAt && <p className="parent-campus-status">Legacy campus approval; no parent decision is recorded.</p>}
                    {pass.parentDecision?.decidedAt && <p className="parent-campus-status">Your decision was recorded on {new Date(pass.parentDecision.decidedAt).toLocaleString()}.</p>}
                    {pass.status === "parent_pending" && <div className="parent-decision-actions"><button onClick={() => decideGatepass(pass._id, "approved")}>Approve request</button><button className="parent-reject-button" onClick={() => decideGatepass(pass._id, "rejected")}>Reject request</button></div>}
                  </div>
                  <span className={`parent-status parent-status--${pass.status}`}>{pass.status.replaceAll("_", " ")}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="parent-delivery-note">Email notices only prompt you to sign in. Your decision is recorded here and cannot be made from an email link.</p>
        </section>
      </div>
    </main>
  );
}
