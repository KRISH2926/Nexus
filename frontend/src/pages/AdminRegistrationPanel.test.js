import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminRegistrationPanel from "./AdminRegistrationPanel";

describe("AdminRegistrationPanel", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  test("creates a student code and displays its one-time value", async () => {
    localStorage.setItem("token", "admin-token");
    global.fetch = jest.fn((url, options = {}) => {
      if (url.endsWith("/auth/batch-options")) {
        return Promise.resolve({ ok: true, json: async () => ({ batches: [{ id: "batch-1", name: "Batch 2026" }] }) });
      }
      if (url.endsWith("/registration/student-codes") && options.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ message: "Created.", code: "NXS-one-time" }) });
      }
      if (url.endsWith("/registration/student-codes")) {
        return Promise.resolve({ ok: true, json: async () => ({ codes: [] }) });
      }
      if (url.endsWith("/registration/invitations")) {
        return Promise.resolve({ ok: true, json: async () => ({ invitations: [] }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({ accounts: [] }) });
    });

    render(<AdminRegistrationPanel />);

    await screen.findByRole("option", { name: "Batch 2026" });
    fireEvent.change(screen.getByLabelText("Batch"), { target: { value: "batch-1" } });
    fireEvent.change(screen.getByLabelText("Student roll number"), { target: { value: "ST-42" } });
    fireEvent.click(screen.getByRole("button", { name: "Create code" }));

    expect(await screen.findByText(/NXS-one-time/)).toBeInTheDocument();
    await waitFor(() => {
      const createCall = global.fetch.mock.calls.find(([, options]) => options?.method === "POST");
      expect(createCall).toBeDefined();
      expect(createCall[1].headers.Authorization).toBe("Bearer admin-token");
      expect(JSON.parse(createCall[1].body)).toMatchObject({
        type: "individual",
        batch: "batch-1",
        rollNo: "ST-42",
        maxRedemptions: 1
      });
    });
  });
});
