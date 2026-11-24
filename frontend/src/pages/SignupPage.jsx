import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AnimatedButton from "../components/ui/AnimatedButton";
import "./AuthPages.css";
import API_BASE from "../services/apiBase";

const initialForm = {
  role: "student",
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  rollNo: "",
  batch: "",
  registrationCode: "",
  studentMobile: "",
  parentName: "",
  parentEmail: "",
  parentMobile: "",
  mobile: "",
  invitationCode: "",
  employeeId: "",
  assignedGate: ""
};

const roleOptions = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "security", label: "Security" }
];

export default function SignupPage() {
  const [form, setForm] = useState(initialForm);
  const [step, setStep] = useState(1);
  const [batches, setBatches] = useState([]);
  const [batchError, setBatchError] = useState("");
  const [batchReload, setBatchReload] = useState(0);
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (form.role === "security") return;

    let active = true;
    setBatches([]);
    const loadBatches = async () => {
      setBatchError("");
      try {
        const response = await fetch(`${API_BASE}/auth/batch-options`);
        if (!response.ok) throw new Error("Could not load campus batches.");
        const data = await response.json();
        if (active) {
          const options = Array.isArray(data) ? data : Array.isArray(data.batches) ? data.batches : [];
          setBatches(options);
          if (options.length === 0) setBatchError("No campus batches are available for registration yet.");
        }
      } catch (error) {
        if (active) {
          setBatchError(error instanceof Error ? error.message : "Could not load campus batches.");
        }
      }
    };

    loadBatches();
    return () => {
      active = false;
    };
  }, [form.role, batchReload]);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const continueToDetails = (event) => {
    event.preventDefault();
    setRequestError("");

    if (!form.name.trim() || !form.email.trim()) {
      setRequestError("Enter your name and email to continue.");
      return;
    }

    if (form.password.length < 10) {
      setRequestError("Choose a password with at least 10 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setRequestError("The passwords do not match.");
      return;
    }

    setStep(2);
  };

  const submitRegistration = async (event) => {
    event.preventDefault();
    setRequestError("");

    const requiredByRole = {
      student: ["rollNo", "batch", "registrationCode", "studentMobile", "parentName", "parentEmail", "parentMobile"],
      teacher: ["batch", "mobile", "invitationCode"],
      security: ["mobile", "employeeId", "assignedGate", "invitationCode"]
    };
    const missing = requiredByRole[form.role].some((field) => !String(form[field]).trim());

    if (missing) {
      setRequestError("Complete all required fields before creating your account.");
      return;
    }

    const roleFields = {
      student: [
        "rollNo", "batch", "registrationCode", "studentMobile",
        "parentName", "parentEmail", "parentMobile"
      ],
      teacher: ["batch", "mobile", "invitationCode"],
      security: ["mobile", "employeeId", "assignedGate", "invitationCode"]
    }[form.role];
    const payload = {
      role: form.role,
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword
    };
    roleFields.forEach((field) => {
      payload[field] = form[field];
    });

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Registration could not be completed.");
      setResult(data);
      setRegisteredEmail(form.email);
      setForm((current) => ({ ...initialForm, name: current.name }));
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Registration could not be completed.");
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
        body: JSON.stringify({ email: registeredEmail })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not resend the verification link.");
      setResendMessage(data.message);
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : "Could not resend the verification link.");
    } finally {
      setResendLoading(false);
    }
  };

  if (result) {
    return (
      <main className="auth-page">
        <header className="auth-page__header">
          <Link className="landing-brand" to="/">
            <span className="landing-brand__mark">N</span><span>NEXUS</span>
          </Link>
          <span><Link to="/parent/register">Parent access</Link></span>
        </header>
        <section className="auth-card auth-card--result" aria-live="polite">
          <span className="auth-card__step">ACCOUNT REQUEST RECEIVED</span>
          <h1>Thanks, {form.name.split(" ")[0]}.</h1>
          <p>{result.message}</p>
          {result.requiresEmailVerification && (
            <p
              className={result.verificationEmailSent === false ? "auth-error" : "auth-card__notice"}
              role={result.verificationEmailSent === false ? "alert" : undefined}
            >
              {result.verificationEmailSent === false
                ? "No verification email was sent. Try requesting a fresh link."
                : "Check your inbox for a verification link. Account activation waits for the required campus checks."}
            </p>
          )}
          {result.verificationEmailSent === false && (
            <>
              {resendMessage && <p className="auth-card__notice" role="status">{resendMessage}</p>}
              <button
                type="button"
                className="auth-retry"
                onClick={resendVerification}
                disabled={resendLoading}
              >
                {resendLoading ? "Sending..." : "Resend verification link"}
              </button>
            </>
          )}
          {result.accountStatus && <p className="auth-card__status">Current status: {result.accountStatus.replaceAll("_", " ")}</p>}
          <Link className="auth-text-link" to="/login">Return to sign in</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <header className="auth-page__header">
        <Link className="landing-brand" to="/">
          <span className="landing-brand__mark">N</span><span>NEXUS</span>
        </Link>
        <span>Already have an account? <Link to="/login">Sign in</Link> · <Link to="/parent/register">Parent access</Link></span>
      </header>
      <section className="auth-card">
        <div className="auth-card__intro">
          <span className="auth-card__step">CREATE YOUR CAMPUS ACCOUNT · STEP {step} OF 2</span>
          <h1>{step === 1 ? "Your account starts here." : "A few details for your portal."}</h1>
          <p>Access is verified for your role before your account is activated.</p>
        </div>
        <div className="auth-progress" aria-label={`Step ${step} of 2`}>
          <span className={step >= 1 ? "is-current" : ""} />
          <span className={step >= 2 ? "is-current" : ""} />
        </div>
        {requestError && <p className="auth-error" role="alert">{requestError}</p>}

        {step === 1 ? (
          <form className="auth-form" onSubmit={continueToDetails}>
            <fieldset className="auth-role-picker">
              <legend>Choose your portal</legend>
              <div>
                {roleOptions.map((option) => (
                  <label key={option.value} className={form.role === option.value ? "is-selected" : ""}>
                    <input
                      type="radio"
                      name="role"
                      value={option.value}
                      checked={form.role === option.value}
                      onChange={update}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Full name
              <input name="name" autoComplete="name" value={form.name} onChange={update} required />
            </label>
            <label>
              Email address
              <input name="email" type="email" autoComplete="email" value={form.email} onChange={update} required />
            </label>
            <div className="auth-form__two-col">
              <label>
                Password
                <input name="password" type="password" autoComplete="new-password" value={form.password} onChange={update} minLength={10} required />
              </label>
              <label>
                Confirm password
                <input name="confirmPassword" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={update} minLength={10} required />
              </label>
            </div>
            <div className="auth-form__actions">
              <AnimatedButton type="submit">Continue <span aria-hidden="true">→</span></AnimatedButton>
            </div>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitRegistration}>
            {form.role === "student" && (
              <>
                <label>
                  Roll number
                  <input name="rollNo" value={form.rollNo} onChange={update} required />
                </label>
                <label>
                  Batch
                  <select name="batch" value={form.batch} onChange={update} required>
                    <option value="">Select your batch</option>
                    {batches.map((batch) => {
                      const id = batch.id || batch._id;
                      return <option value={id} key={id}>{batch.name}</option>;
                    })}
                  </select>
                </label>
                <label>
                  Student registration code
                  <input name="registrationCode" value={form.registrationCode} onChange={update} autoComplete="off" required />
                </label>
                <label>
                  Student mobile
                  <input name="studentMobile" type="tel" value={form.studentMobile} onChange={update} required />
                </label>
                <div className="auth-form__section-title">Parent or guardian</div>
                <label>
                  Full name
                  <input name="parentName" value={form.parentName} onChange={update} required />
                </label>
                <label>
                  Verified email address
                  <input name="parentEmail" type="email" value={form.parentEmail} onChange={update} required />
                </label>
                <label>
                  Mobile number
                  <input name="parentMobile" type="tel" value={form.parentMobile} onChange={update} required />
                </label>
                <p className="auth-card__notice">A registration code grants eligibility only. Your student identity and parent link still require campus verification.</p>
              </>
            )}
            {form.role === "teacher" && (
              <>
                <label>
                  Institutional batch
                  <select name="batch" value={form.batch} onChange={update} required>
                    <option value="">Select an assigned batch</option>
                    {batches.map((batch) => {
                      const id = batch.id || batch._id;
                      return <option value={id} key={id}>{batch.name}</option>;
                    })}
                  </select>
                </label>
                <label>
                  Official mobile number
                  <input name="mobile" type="tel" value={form.mobile} onChange={update} required />
                </label>
                <label>
                  Admin invitation code
                  <input name="invitationCode" value={form.invitationCode} onChange={update} autoComplete="off" required />
                </label>
              </>
            )}
            {form.role === "security" && (
              <>
                <label>
                  Official mobile number
                  <input name="mobile" type="tel" value={form.mobile} onChange={update} required />
                </label>
                <label>
                  Institutional identification
                  <input name="employeeId" value={form.employeeId} onChange={update} required />
                </label>
                <label>
                  Assigned gate or location
                  <input name="assignedGate" value={form.assignedGate} onChange={update} required />
                </label>
                <label>
                  Admin invitation code
                  <input name="invitationCode" value={form.invitationCode} onChange={update} autoComplete="off" required />
                </label>
              </>
            )}
            {batchError && form.role !== "security" && (
              <p className="auth-error" role="alert">
                {batchError}{" "}
                <button type="button" className="auth-retry" onClick={() => setBatchReload((value) => value + 1)}>
                  Try again
                </button>
              </p>
            )}
            <div className="auth-form__actions auth-form__actions--split">
              <button className="auth-back" type="button" onClick={() => setStep(1)}>Back</button>
              <AnimatedButton type="submit" disabled={submitting || (form.role !== "security" && batches.length === 0)}>
                {submitting ? "Sending request..." : "Create account"}
              </AnimatedButton>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}
