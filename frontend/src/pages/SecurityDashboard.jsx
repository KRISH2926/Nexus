import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SecurityDashboard.css";
import API_BASE from "../services/apiBase";
const AUTH_KEYS = ["token", "role", "name", "userId"];

export default function SecurityDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [scanToken, setScanToken] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [verifiedPass, setVerifiedPass] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [activityError, setActivityError] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    const loadProfile = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`${API_BASE}/security/profile`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
          signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Could not load the security workspace.");
        }
        setProfile(data);
        try {
          const activityResponse = await fetch(`${API_BASE}/security/activity`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
            signal: controller.signal
          });
          if (activityResponse) {
            const activityData = await activityResponse.json();
            if (activityResponse.ok) { setEvents(activityData.events || []); setActivityError(""); }
            else setActivityError(activityData.message || "Could not load gate activity.");
          }
        } catch (activityLoadError) {
          if (!controller.signal.aborted) setActivityError(activityLoadError instanceof Error ? activityLoadError.message : "Could not load gate activity.");
        }
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setProfile(null);
          setError(loadError instanceof Error ? loadError.message : "Could not load the security workspace.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    loadProfile();
    return () => controller.abort();
  }, [retryCount]);

  useEffect(() => {
    if (!cameraActive) return undefined;
    if (!navigator.mediaDevices?.getUserMedia || typeof window.BarcodeDetector !== "function") {
      setScanMessage("QR camera scanning is unavailable in this browser. Use a connected scanner or paste the QR token below.");
      setCameraActive(false);
      return undefined;
    }
    let active = true;
    let stream;
    let frame;
    let detector;
    try {
      detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    } catch {
      setScanMessage("QR camera scanning could not start. Use a connected scanner or paste the QR token below.");
      setCameraActive(false);
      return () => { active = false; };
    }
    let lastScanAt = 0;
    const scanFrame = async () => {
      if (!active) return;
      if (!videoRef.current || videoRef.current.readyState < 2 || performance.now() - lastScanAt < 200) {
        frame = requestAnimationFrame(scanFrame);
        return;
      }
      lastScanAt = performance.now();
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes[0]?.rawValue) {
          setScanToken(codes[0].rawValue);
          setScanMessage("QR captured. Verify it to confirm the pass state.");
          setCameraActive(false);
          return;
        }
      } catch {
        setScanMessage("QR decoding failed. Reopen the camera or paste the QR token below.");
        setCameraActive(false);
        return;
      }
      if (active) frame = requestAnimationFrame(scanFrame);
    };
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then((cameraStream) => {
        if (!active) { cameraStream.getTracks().forEach((track) => track.stop()); return; }
        stream = cameraStream;
        videoRef.current.srcObject = stream;
        return videoRef.current.play().then(() => {
          if (active) frame = requestAnimationFrame(scanFrame);
        });
      })
      .catch(() => {
        setScanMessage("Camera access failed. Check browser permission or enter the QR token manually.");
        setCameraActive(false);
      });
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [cameraActive]);

  const verifyPass = async () => {
    setScanBusy(true); setScanMessage(""); setVerifiedPass(null);
    try {
      const response = await fetch(`${API_BASE}/security/scan/verify`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ token: scanToken.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Pass verification failed.");
      setVerifiedPass(data.pass); setScanMessage(data.message);
    } catch (requestError) { setScanMessage(requestError.message || "Pass verification failed."); }
    finally { setScanBusy(false); }
  };

  const recordGateAction = async (action) => {
    setScanBusy(true); setScanMessage("");
    try {
      const response = await fetch(`${API_BASE}/security/scan/${action}`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body: JSON.stringify({ token: scanToken.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `Could not record ${action}.`);
      setScanMessage(`${data.message} · ${data.scanReference}`); setVerifiedPass(null); setScanToken("");
      try {
        const responseEvents = await fetch(`${API_BASE}/security/activity`, { headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` } });
        const dataEvents = await responseEvents.json();
        if (responseEvents.ok) {
          setEvents(dataEvents.events || []);
          setActivityError("");
        } else {
          setActivityError(dataEvents.message || "Could not refresh gate activity.");
        }
      } catch (activityLoadError) {
        setActivityError(activityLoadError instanceof Error ? activityLoadError.message : "Could not refresh gate activity.");
      }
    } catch (requestError) { setScanMessage(requestError.message || `Could not record ${action}.`); }
    finally { setScanBusy(false); }
  };

  const logout = () => {
    AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    navigate("/login", { replace: true });
  };

  return (
    <main className="security-workspace">
      <div className="security-workspace__shell">
        <header className="security-workspace__header">
          <a className="security-workspace__brand" href="/" aria-label="NEXUS home">
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <path d="M8 9.5 18 18 28 8M8 26.5 18 18l10 10M8 9.5v17" />
              <circle cx="8" cy="9.5" r="3" />
              <circle cx="28" cy="8" r="3" />
              <circle cx="18" cy="18" r="3.5" />
              <circle cx="8" cy="26.5" r="3" />
              <circle cx="28" cy="28" r="3" />
            </svg>
            <span>NEXUS</span>
          </a>
          <div className="security-workspace__header-actions">
            {profile && <span className="security-workspace__signed-in">{profile.name}</span>}
            <button type="button" onClick={logout}>Sign out</button>
          </div>
        </header>

        <section className="security-workspace__intro" aria-labelledby="security-workspace-title">
          <p className="security-workspace__eyebrow"><span /> CAMPUS OPERATIONS</p>
          <div className="security-workspace__intro-row">
            <div>
              <h1 id="security-workspace-title">Security workspace</h1>
              <p>Gate assignments and campus checks, kept in view.</p>
            </div>
            {profile && (
              <span className={`security-workspace__account-status${profile.accountStatus === "active" ? " is-active" : ""}`}>
                <i aria-hidden="true" />
                {profile.accountStatus || "Account status unavailable"}
              </span>
            )}
          </div>
        </section>

        {loading && (
          <p className="security-workspace__notice" role="status">
            Loading your assigned campus profile...
          </p>
        )}

        {!loading && error && (
          <div className="security-workspace__error" role="alert">
            <div>
              <strong>We could not load your workspace.</strong>
              <p>{error}</p>
            </div>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
              Try again
            </button>
          </div>
        )}

        {!loading && profile && (
          <>
            <section className="security-workspace__profile" aria-labelledby="security-profile-title">
              <div className="security-workspace__profile-heading">
                <span className="security-workspace__profile-mark" aria-hidden="true">
                  {profile.name?.trim().charAt(0).toUpperCase() || "N"}
                </span>
                <div>
                  <p className="security-workspace__eyebrow">YOUR VERIFIED PROFILE</p>
                  <h2 id="security-profile-title">{profile.name}</h2>
                  <p>{profile.email}</p>
                </div>
              </div>
              <dl className="security-workspace__details">
                <div>
                  <dt>Assigned gate</dt>
                  <dd>{profile.assignedGate || "Not assigned"}</dd>
                </div>
                <div>
                  <dt>Employee ID</dt>
                  <dd>{profile.employeeId || "Not available"}</dd>
                </div>
                <div>
                  <dt>Account status</dt>
                  <dd>{profile.accountStatus || "Not available"}</dd>
                </div>
              </dl>
            </section>

            <section className="security-workspace__operations" aria-labelledby="security-operations-title">
              <div className="security-workspace__operations-heading">
                <div>
                  <p className="security-workspace__eyebrow">GATE ACTIVITY</p>
                  <h2 id="security-operations-title">Verify passes and record campus movements</h2>
                </div>
                <span className="security-workspace__setup-label">{profile.assignedGate ? "QR SCAN READY" : "GATE NOT ASSIGNED"}</span>
              </div>
              <div className="security-workspace__scanner">
                <div className="security-workspace__scanner-actions">
                  <button type="button" onClick={() => { setScanMessage(""); setCameraActive((active) => !active); }}>
                    {cameraActive ? "Stop camera" : "Open QR camera"}
                  </button>
                  <label>QR token from scanner<input value={scanToken} onChange={(event) => setScanToken(event.target.value)} autoComplete="off" /></label>
                  <button type="button" disabled={scanBusy || !scanToken.trim()} onClick={verifyPass}>{scanBusy ? "Checking…" : "Verify pass"}</button>
                </div>
                {cameraActive && <video className="security-workspace__camera" ref={videoRef} muted playsInline aria-label="QR code camera preview" />}
                {scanMessage && <p className="security-workspace__scan-message" role="status">{scanMessage}</p>}
                {verifiedPass && <div className="security-workspace__verified-pass">
                  <p className="security-workspace__eyebrow">VERIFY THE PERSON BEFORE CONFIRMING</p>
                  <h3>{verifiedPass.student}</h3>
                  <dl><div><dt>Roll number</dt><dd>{verifiedPass.rollNo}</dd></div><div><dt>Batch</dt><dd>{verifiedPass.batch}</dd></div><div><dt>Reason</dt><dd>{verifiedPass.reason}</dd></div><div><dt>Requested time</dt><dd>{verifiedPass.exitTime} · return by {verifiedPass.expectedReturnTime}</dd></div><div><dt>Valid until</dt><dd>{new Date(verifiedPass.expiresAt).toLocaleString()}</dd></div></dl>
                  <button type="button" disabled={scanBusy} onClick={() => recordGateAction(verifiedPass.nextAction)}>{verifiedPass.nextAction === "exit" ? "Confirm exit" : "Record return"}</button>
                </div>}
              </div>
              <div className="security-workspace__activity"><h3>Recent scans</h3>{activityError && <p role="alert">{activityError}</p>}{events.length ? <ul>{events.map((event) => <li key={event._id}><strong>{event.action} · {event.result}</strong><span>{event.student?.name ? `${event.student.name} (${event.student.rollNo})` : event.reasonCode || "No student details"}</span><time>{new Date(event.createdAt).toLocaleString()}</time></li>)}</ul> : !activityError && <p>No scan activity recorded.</p>}</div>
              <div className="security-workspace__next">
                <span><i>01</i> Verify a one-use pass</span>
                <span><i>02</i> Confirm student identity</span>
                <span><i>03</i> Record exit and return</span>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
