import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "./AuthPages.css";
import API_BASE from "../services/apiBase";

export default function VerifyEmailPage() {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, message: "" });

  useEffect(() => {
    let active = true;
    const token = new URLSearchParams(location.search).get("token");

    if (!token) {
      setState({ loading: false, message: "This verification link is missing its token." });
      return () => {
        active = false;
      };
    }

    fetch(`${API_BASE}/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "This verification link is invalid or expired.");
        return data;
      })
      .then((data) => {
        if (active) setState({ loading: false, message: data.message });
      })
      .catch((error) => {
        if (active) setState({ loading: false, message: error.message });
      });

    return () => {
      active = false;
    };
  }, [location.search]);

  return (
    <main className="auth-page">
      <header className="auth-page__header">
        <Link className="landing-brand" to="/">
          <span className="landing-brand__mark">N</span><span>NEXUS</span>
        </Link>
      </header>
      <section className="auth-card auth-card--result" aria-live="polite">
        <span className="auth-card__step">EMAIL VERIFICATION</span>
        <h1>{state.loading ? "Checking your link..." : "Verification update"}</h1>
        <p>{state.message}</p>
        {!state.loading && <Link className="auth-text-link" to="/login">Return to sign in</Link>}
      </section>
    </main>
  );
}
