import React, { useCallback, useEffect, useState } from "react";
import API_BASE from "../services/apiBase";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Registration administration request failed.");
  return data;
}

const expiryValue = (value) => value ? new Date(value).toLocaleString() : "—";

export default function AdminRegistrationPanel() {
  const [batches, setBatches] = useState([]);
  const [codes, setCodes] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [codeType, setCodeType] = useState("individual");
  const [codeBatch, setCodeBatch] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("1");
  const [codeExpiry, setCodeExpiry] = useState("");
  const [invitationRole, setInvitationRole] = useState("teacher");
  const [invitationEmail, setInvitationEmail] = useState("");
  const [invitationExpiry, setInvitationExpiry] = useState("");
  const [oneTimeCode, setOneTimeCode] = useState("");
  const [oneTimeInvitation, setOneTimeInvitation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [batchData, codeData, invitationData, accountData] = await Promise.all([
        request("/auth/batch-options"),
        request("/registration/student-codes"),
        request("/registration/invitations"),
        request("/registration/pending-accounts")
      ]);
      setBatches(Array.isArray(batchData.batches) ? batchData.batches : []);
      setCodes(Array.isArray(codeData.codes) ? codeData.codes : []);
      setInvitations(Array.isArray(invitationData.invitations) ? invitationData.invitations : []);
      setPendingAccounts(Array.isArray(accountData.accounts) ? accountData.accounts : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load registration administration data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runAction = async (key, action, successText) => {
    setWorking(key);
    setError("");
    setMessage("");
    try {
      const result = await action();
      if (result.code) setOneTimeCode(result.code);
      if (result.invitationCode) setOneTimeInvitation(result.invitationCode);
      setMessage(result.message || successText);
      await loadData();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The requested action failed.");
    } finally {
      setWorking("");
    }
  };

  const createStudentCode = (event) => {
    event.preventDefault();
    const body = {
      type: codeType,
      batch: codeBatch,
      maxRedemptions: codeType === "individual" ? 1 : Number(maxRedemptions)
    };
    if (codeType === "individual") body.rollNo = rollNo.trim();
    if (codeExpiry) body.expiresAt = new Date(codeExpiry).toISOString();
    runAction("create-code", () => request("/registration/student-codes", {
      method: "POST",
      body: JSON.stringify(body)
    }), "Registration code created.");
  };

  const createInvitation = (event) => {
    event.preventDefault();
    const body = { role: invitationRole };
    if (invitationEmail.trim()) body.email = invitationEmail.trim();
    if (invitationExpiry) body.expiresAt = new Date(invitationExpiry).toISOString();
    runAction("create-invitation", () => request("/registration/invitations", {
      method: "POST",
      body: JSON.stringify(body)
    }), "Invitation created.");
  };

  const revoke = (key, path, successText) => runAction(
    key,
    () => request(path, { method: "PATCH" }),
    successText
  );

  const approve = (account) => runAction(
    `approve-${account.id}`,
    () => request(`/registration/pending-accounts/${account.role}/${account.id}/approve`, { method: "POST" }),
    "Account activated."
  );

  return (
    <section className="mt-6 space-y-6" aria-labelledby="registration-admin-title">
      <div className="rounded-xl bg-white p-5 shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="registration-admin-title" className="text-xl font-bold">Account registration</h2>
            <p className="mt-1 text-sm text-gray-600">Issue eligibility codes, invite staff, and review verified signups.</p>
          </div>
          <button type="button" className="rounded-lg border px-3 py-2" onClick={loadData} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        {error && <p className="mt-4 rounded bg-red-50 p-3 text-red-700" role="alert">{error}</p>}
        {message && <p className="mt-4 rounded bg-green-50 p-3 text-green-800" role="status">{message}</p>}
        {oneTimeCode && (
          <p className="mt-3 break-all rounded bg-amber-50 p-3 text-amber-950">
            Student code (shown once): <strong>{oneTimeCode}</strong>
          </p>
        )}
        {oneTimeInvitation && (
          <p className="mt-3 break-all rounded bg-amber-50 p-3 text-amber-950">
            Staff invitation (shown once): <strong>{oneTimeInvitation}</strong>
          </p>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-3 rounded-xl bg-white p-5 shadow" onSubmit={createStudentCode}>
          <h3 className="font-semibold">Create student registration code</h3>
          <label className="block text-sm">
            Code type
            <select className="mt-1 w-full rounded border p-2" value={codeType} onChange={(event) => setCodeType(event.target.value)}>
              <option value="individual">Individual student</option>
              <option value="batch">Batch allowance</option>
            </select>
          </label>
          <label className="block text-sm">
            Batch
            <select className="mt-1 w-full rounded border p-2" value={codeBatch} onChange={(event) => setCodeBatch(event.target.value)} required>
              <option value="">Select a batch</option>
              {batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.name}</option>)}
            </select>
          </label>
          {codeType === "individual" ? (
            <label className="block text-sm">
              Student roll number
              <input className="mt-1 w-full rounded border p-2" value={rollNo} onChange={(event) => setRollNo(event.target.value)} required />
            </label>
          ) : (
            <label className="block text-sm">
              Maximum redemptions
              <input className="mt-1 w-full rounded border p-2" type="number" min="1" max="10000" value={maxRedemptions} onChange={(event) => setMaxRedemptions(event.target.value)} required />
            </label>
          )}
          <label className="block text-sm">
            Expires at (optional)
            <input className="mt-1 w-full rounded border p-2" type="datetime-local" value={codeExpiry} onChange={(event) => setCodeExpiry(event.target.value)} />
          </label>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white" disabled={Boolean(working)}>
            {working === "create-code" ? "Creating..." : "Create code"}
          </button>
        </form>

        <form className="space-y-3 rounded-xl bg-white p-5 shadow" onSubmit={createInvitation}>
          <h3 className="font-semibold">Invite staff</h3>
          <label className="block text-sm">
            Role
            <select className="mt-1 w-full rounded border p-2" value={invitationRole} onChange={(event) => setInvitationRole(event.target.value)}>
              <option value="teacher">Teacher</option>
              <option value="security">Security</option>
            </select>
          </label>
          <label className="block text-sm">
            Restricted email (optional)
            <input className="mt-1 w-full rounded border p-2" type="email" value={invitationEmail} onChange={(event) => setInvitationEmail(event.target.value)} />
          </label>
          <label className="block text-sm">
            Expires at (optional)
            <input className="mt-1 w-full rounded border p-2" type="datetime-local" value={invitationExpiry} onChange={(event) => setInvitationExpiry(event.target.value)} />
          </label>
          <button className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white" disabled={Boolean(working)}>
            {working === "create-invitation" ? "Creating..." : "Create invitation"}
          </button>
        </form>
      </div>

      <section className="rounded-xl bg-white p-5 shadow" aria-labelledby="pending-accounts-title">
        <h3 id="pending-accounts-title" className="font-semibold">Pending account review</h3>
        {pendingAccounts.length === 0 ? <p className="mt-3 text-sm text-gray-600">No pending account requests.</p> : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead><tr className="border-b"><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Email verified</th><th className="p-2">Action</th></tr></thead>
              <tbody>
                {pendingAccounts.map((account) => (
                  <tr className="border-b" key={`${account.role}-${account.id}`}>
                    <td className="p-2">{account.name}</td>
                    <td className="p-2">{account.email}</td>
                    <td className="p-2">{account.role}</td>
                    <td className="p-2">{account.emailVerified ? "Yes" : "No"}</td>
                    <td className="p-2">
                      <button
                        type="button"
                        className="rounded bg-green-700 px-3 py-1 text-white disabled:opacity-50"
                        onClick={() => approve(account)}
                        disabled={!account.emailVerified || Boolean(working)}
                      >
                        Activate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow">
          <h3 className="font-semibold">Student codes</h3>
          {codes.length === 0 ? <p className="mt-3 text-sm text-gray-600">No registration codes issued.</p> : (
            <ul className="mt-3 divide-y">
              {codes.map((code) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" key={code.id}>
                  <span>{code.type} · {code.batch?.name || "Batch removed"} · {code.redemptionCount}/{code.maxRedemptions} · expires {expiryValue(code.expiresAt)}</span>
                  {!code.revokedAt && (
                    <button type="button" className="text-red-700 underline" onClick={() => revoke(`revoke-code-${code.id}`, `/registration/student-codes/${code.id}/revoke`, "Student code revoked.")} disabled={Boolean(working)}>
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <h3 className="font-semibold">Staff invitations</h3>
          {invitations.length === 0 ? <p className="mt-3 text-sm text-gray-600">No staff invitations issued.</p> : (
            <ul className="mt-3 divide-y">
              {invitations.map((invitation) => (
                <li className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" key={invitation.id}>
                  <span>{invitation.role} · {invitation.email || "Any email"} · {invitation.redeemedAt ? "redeemed" : invitation.revokedAt ? "revoked" : `expires ${expiryValue(invitation.expiresAt)}`}</span>
                  {!invitation.redeemedAt && !invitation.revokedAt && (
                    <button type="button" className="text-red-700 underline" onClick={() => revoke(`revoke-invitation-${invitation.id}`, `/registration/invitations/${invitation.id}/revoke`, "Invitation revoked.")} disabled={Boolean(working)}>
                      Revoke
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </section>
  );
}
