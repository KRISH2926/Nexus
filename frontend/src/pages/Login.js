import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Eye, EyeOff, GraduationCap, LoaderCircle, ShieldCheck, UsersRound, Wrench } from "lucide-react";
import API from "../services/api";
import "./Login.css";

const roles = [
  { value: "student", label: "Student", detail: "Classes & assignments", Icon: GraduationCap },
  { value: "teacher", label: "Teacher", detail: "Teaching & progress", Icon: BookOpen },
  { value: "parent", label: "Parent", detail: "Updates & approvals", Icon: UsersRound },
  { value: "security", label: "Security", detail: "Campus gate checks", Icon: ShieldCheck },
  { value: "admin", label: "Admin", detail: "Campus operations", Icon: Wrench }
];

const destinations = {
  student: "/student",
  teacher: "/mentor",
  parent: "/parent",
  security: "/security",
  admin: "/admin"
};

function NexusMark() {
  return (
    <svg className="nexus-login__mark" viewBox="0 0 36 36" aria-hidden="true">
      <path d="M8 9.5 18 18 28 8M8 26.5 18 18l10 10M8 9.5v17" />
      <circle cx="8" cy="9.5" r="3" />
      <circle cx="28" cy="8" r="3" />
      <circle cx="18" cy="18" r="3.5" />
      <circle cx="8" cy="26.5" r="3" />
      <circle cx="28" cy="28" r="3" />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");

    if (!role) {
      setError("Choose the portal that matches your campus account.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await API.post("/auth/login", { email, password });
      const user = response.data.user;
      const userId = user?.id || user?._id;

      if (user?.role !== role) {
        setError(`This account belongs to the ${user?.role || "unknown"} portal. Choose that role to sign in.`);
        return;
      }

      if (!userId || !response.data.token) {
        setError("We couldn't complete sign in because the account response was incomplete. Please try again.");
        return;
      }

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("name", user.name || "");
      localStorage.setItem("userId", userId);
      navigate(destinations[user.role] || "/login", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't sign you in. Check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="nexus-login">
      <section className="nexus-login__story" aria-labelledby="nexus-login-story-title">
        <Link className="nexus-login__brand" to="/" aria-label="NEXUS home">
          <NexusMark />
          <span>NEXUS</span>
        </Link>

        <div className="nexus-login__story-copy">
          <p className="nexus-login__eyebrow"><span /> THE CAMPUS, CONNECTED.</p>
          <h1 id="nexus-login-story-title">A lot happens.<br /><em>Stay in sync.</em></h1>
          <p>One place for the people, plans and everyday moments that keep your campus moving.</p>
        </div>

        <div className="nexus-login__network" aria-label="Students, teachers, parents and campus teams connected through NEXUS">
          <svg viewBox="0 0 600 370" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            <path className="nexus-login__route" d="M82 88 C168 34 204 101 292 160 S421 238 520 83" />
            <path className="nexus-login__route nexus-login__route--second" d="M82 286 C168 341 218 218 292 160 S413 93 520 282" />
            <path className="nexus-login__route nexus-login__route--third" d="M82 88 C155 166 171 247 82 286 M520 83 C433 162 438 231 520 282" />
          </svg>
          <div className="nexus-login__network-center">
            <NexusMark />
            <strong>In sync</strong>
            <span>ONE CAMPUS</span>
          </div>
          <div className="nexus-login__node nexus-login__node--student"><i /><span>Students</span></div>
          <div className="nexus-login__node nexus-login__node--teacher"><i /><span>Teachers</span></div>
          <div className="nexus-login__node nexus-login__node--parent"><i /><span>Parents</span></div>
          <div className="nexus-login__node nexus-login__node--campus"><i /><span>Campus teams</span></div>
          <div className="nexus-login__signal nexus-login__signal--one" />
          <div className="nexus-login__signal nexus-login__signal--two" />
        </div>

        <p className="nexus-login__story-foot"><span>01</span> PEOPLE / PLANS / PERMISSIONS</p>
      </section>

      <section className="nexus-login__access" aria-labelledby="nexus-login-title">
        <div className="nexus-login__access-top">
          <span>YOUR CAMPUS, ONE SIGN IN</span>
          <span>New to NEXUS? <Link to="/signup">Create an account <ArrowRight aria-hidden="true" /></Link></span>
        </div>

        <div className="nexus-login__form-wrap">
          <p className="nexus-login__eyebrow"><span /> WELCOME BACK</p>
          <h2 id="nexus-login-title">Pick up where<br />campus left off.</h2>
          <p className="nexus-login__form-intro">Choose your portal, then sign in with your account.</p>

          <form onSubmit={handleLogin} aria-busy={submitting}>
            <fieldset className="nexus-login__roles" disabled={submitting}>
              <legend>Your portal</legend>
              <div className="nexus-login__role-grid">
                {roles.map(({ value, label, detail, Icon }) => (
                  <label className={`nexus-login__role${role === value ? " is-selected" : ""}`} key={value}>
                    <input
                      type="radio"
                      name="role"
                      value={value}
                      checked={role === value}
                      onChange={() => {
                        setRole(value);
                        setError("");
                      }}
                    />
                    <Icon aria-hidden="true" />
                    <span className="nexus-login__role-text">
                      <strong>{label}</strong>
                      <small>{detail}</small>
                    </span>
                    <span className="nexus-login__role-check" aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="nexus-login__field">
              <span>Email address</span>
              <input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="you@yourcollege.edu"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                }}
                required
                disabled={submitting}
              />
            </label>

            <div className="nexus-login__field">
              <label htmlFor="nexus-login-password">Password</label>
              <span className="nexus-login__password">
                <input
                  id="nexus-login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  required
                  disabled={submitting}
                />
                <button
                  className="nexus-login__password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </span>
            </div>

            {error && <p className="nexus-login__error" role="alert">{error}</p>}

            <button className="nexus-login__submit" type="submit" disabled={submitting}>
              {submitting ? (
                <><LoaderCircle className="nexus-login__spinner" aria-hidden="true" /> Signing you in…</>
              ) : (
                <>Sign in to NEXUS <ArrowRight aria-hidden="true" /></>
              )}
            </button>
          </form>

          <div className="nexus-login__portal-link">
            <span>Need access for your family?</span>
            <Link to="/parent/register">Go to parent registration <ArrowRight aria-hidden="true" /></Link>
          </div>
        </div>

        <footer className="nexus-login__access-foot">
          <Link to="/">← Back to NEXUS</Link>
          <span>Made for the people who keep a campus moving.</span>
        </footer>
      </section>
    </main>
  );
}
