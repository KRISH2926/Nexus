import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ParentDashboard from "./ParentDashboard";

afterEach(() => {
  localStorage.clear();
  delete global.fetch;
  jest.restoreAllMocks();
});

test("parent portal shows linked students and never presents a notification as an approval", async () => {
  localStorage.setItem("token", "parent-token");
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      parent: { id: "parent-1", name: "Parent One", email: "parent@example.test" },
      students: [{ _id: "student-1", name: "Student One", rollNo: "R-100", batch: { name: "2025" } }],
      notifications: [{ _id: "notification-1", message: "Review a gatepass request in NEXUS.", createdAt: new Date().toISOString(), readAt: null, student: { name: "Student One" } }],
      gatepasses: []
    })
  });

  render(<MemoryRouter><ParentDashboard /></MemoryRouter>);
  expect(await screen.findByRole("heading", { name: /welcome, parent one/i })).toBeInTheDocument();
  expect(screen.getByText(/R-100/)).toBeInTheDocument();
  expect(screen.getByText(/review a gatepass request in nexus/i)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /approve|reject/i })).not.toBeInTheDocument();
});

test("parent portal submits additional student links through the authenticated endpoint", async () => {
  localStorage.setItem("token", "parent-token");
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ parent: { name: "Parent One", email: "parent@example.test" }, students: [], notifications: [], gatepasses: [] }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Student linked to your parent portal" }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ parent: { name: "Parent One", email: "parent@example.test" }, students: [{ _id: "student-2", name: "Student Two", rollNo: "R-200" }], notifications: [], gatepasses: [] }) });

  render(<MemoryRouter><ParentDashboard /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText(/link another student/i), { target: { value: "R-200" } });
  fireEvent.click(screen.getByRole("button", { name: "Link student" }));
  expect(await screen.findByText(/student linked to your parent portal/i)).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(3);
  await waitFor(() => expect(screen.getByText(/R-200/)).toBeInTheDocument());
  expect(global.fetch.mock.calls[1][0]).toContain("/parent/link-student");
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ rollNo: "R-200" });
});

test("parent decisions post to NEXUS and update the gatepass status", async () => {
  localStorage.setItem("token", "parent-token");
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({
      parent: { name: "Parent One", email: "parent@example.test" }, students: [], notifications: [],
      gatepasses: [{ _id: "pass-1", status: "parent_pending", reason: "Medical appointment", date: new Date().toISOString(), student: { name: "Student One" } }]
    }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({
      message: "Parent approval recorded",
      gatepass: { _id: "pass-1", status: "approved", parentDecision: { decision: "approved", decidedAt: new Date().toISOString() } }
    }) });

  render(<MemoryRouter><ParentDashboard /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", { name: "Approve request" }));
  expect(await screen.findByText(/parent approval recorded/i)).toBeInTheDocument();
  expect(global.fetch.mock.calls[1][0]).toContain("/gatepass/parent/pass-1/decision");
  expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ decision: "approved" });
  expect(screen.getByText("approved")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Approve request" })).not.toBeInTheDocument();
});
