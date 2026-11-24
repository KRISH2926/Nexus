import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./AuthPages.css";
import API_BASE from "../services/apiBase";

export default function ParentRegister() {
  const [form, setForm] = useState({ name: "", email: "", rollNo: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    if (form.password.length < 10) {
      setError("Choose a password with at least 10 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/parent/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, email: form.email.trim(), rollNo: form.rollNo.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Parent registration failed.");
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Parent registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const resendVerification = async () => {
    setResendLoading(true);
    setResendMessage("");
    try {
      const response = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not request a verification link.");
      setResendMessage(data.message);
    } catch (requestError) {
      setResendMessage(requestError instanceof Error ? requestError.message : "Could not request a verification link.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <header className="auth-page__header">
        <Link className="landing-brand" to="/"><span className="landing-brand__mark">N</span><span>NEXUS</span></Link>
        <span>Already registered? <Link to="/login">Sign in</Link></span>
      </header>
      <section className="auth-card">
        <div className="auth-card__intro">
          <span className="auth-card__step">PARENT PORTAL</span>
          <h1>Create your parent account</h1>
          <p>Use the email address the student provided to the campus. We’ll verify your email before linking the student.</p>
        </div>
        {result ? (
          <div className={result.verificationEmailSent ? "auth-card__notice" : "auth-error"} role="status">
            <p>{result.message}</p>
            {result.verificationEmailSent && <p>Check your inbox for a verification link. Your student becomes visible after you verify.</p>}
            {result.developmentVerificationUrl && <p>Your local demo verification is ready: <a className="auth-text-link" href={result.developmentVerificationUrl}>Verify parent account</a></p>}
            {!result.verificationEmailSent && <p>Email delivery is unavailable. You can request a fresh verification link after campus support configures delivery.</p>}
            {!result.verificationEmailSent && <button className="auth-retry" onClick={resendVerification} disabled={resendLoading}>{resendLoading ? "Requesting…" : "Request a fresh verification link"}</button>}
            {resendMessage && <p role="status">{resendMessage}</p>}
            <Link className="auth-text-link" to="/login">Return to sign in</Link>
          </div>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label>Parent or guardian name
              <input name="name" autoComplete="name" required minLength={2} maxLength={100} value={form.name} onChange={update} />
            </label>
            <label>Verified parent email
              <input name="email" type="email" autoComplete="email" required value={form.email} onChange={update} />
            </label>
            <label>Student roll number
              <input name="rollNo" required maxLength={50} value={form.rollNo} onChange={update} />
            </label>
            <label>Password
              <input name="password" type="password" autoComplete="new-password" required minLength={10} value={form.password} onChange={update} />
            </label>
            <label>Confirm password
              <input name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} value={form.confirmPassword} onChange={update} />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-primary-button" type="submit" disabled={submitting}>{submitting ? "Creating account…" : "Create parent account"}</button>
          </form>
        )}
      </section>
    </main>
  );
}
