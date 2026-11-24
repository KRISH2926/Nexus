import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SecurityDashboard from "./SecurityDashboard";

const originalFetch = global.fetch;
const originalMediaDevices = Object.getOwnPropertyDescriptor(navigator, "mediaDevices");
const originalBarcodeDetector = Object.getOwnPropertyDescriptor(window, "BarcodeDetector");

const profile = {
  name: "Jordan Lee",
  email: "jordan@example.edu",
  assignedGate: "East gate",
  employeeId: "SEC-204",
  accountStatus: "active"
};

function renderWorkspace() {
  return render(
    <MemoryRouter>
      <SecurityDashboard />
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.setItem("token", "security-test-token");
});

afterEach(() => {
  global.fetch = originalFetch;
  localStorage.clear();
  if (originalMediaDevices) Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  else delete navigator.mediaDevices;
  if (originalBarcodeDetector) Object.defineProperty(window, "BarcodeDetector", originalBarcodeDetector);
  else delete window.BarcodeDetector;
});

test("loads and displays the verified security profile", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => profile
  });

  renderWorkspace();

  expect(await screen.findByRole("heading", { name: "Jordan Lee" })).toBeInTheDocument();
  expect(screen.getByText("East gate")).toBeInTheDocument();
  expect(screen.getByText("SEC-204")).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/security/profile"),
    expect.objectContaining({
      headers: { Authorization: "Bearer security-test-token" }
    })
  );
});

test("offers an explicit retry when the profile request fails", async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Profile service unavailable" })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => profile
    });

  renderWorkspace();

  expect(await screen.findByRole("alert")).toHaveTextContent("Profile service unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));

  expect(await screen.findByRole("heading", { name: "Jordan Lee" })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(3);
});

test("explains the manual-token fallback when browser QR scanning is unsupported", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => profile
  });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
  Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: undefined });

  renderWorkspace();

  await screen.findByRole("heading", { name: "Jordan Lee" });
  fireEvent.click(screen.getByRole("button", { name: "Open QR camera" }));

  expect(await screen.findByText(/QR camera scanning is unavailable in this browser/i)).toBeInTheDocument();
  expect(screen.getByLabelText("QR token from scanner")).toBeInTheDocument();
});

test("reports camera permission failures and keeps manual token entry available", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => profile
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: jest.fn().mockRejectedValue(new Error("Permission denied")) }
  });
  Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: jest.fn() });

  renderWorkspace();

  await screen.findByRole("heading", { name: "Jordan Lee" });
  fireEvent.click(screen.getByRole("button", { name: "Open QR camera" }));

  expect(await screen.findByText(/Camera access failed/i)).toBeInTheDocument();
  expect(screen.getByLabelText("QR token from scanner")).toBeInTheDocument();
});

test("stops a late camera stream when security closes the camera prompt", async () => {
  let resolvePermission;
  const getUserMedia = jest.fn(() => new Promise((resolve) => {
    resolvePermission = resolve;
  }));
  const stop = jest.fn();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => profile
  });
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia }
  });
  Object.defineProperty(window, "BarcodeDetector", { configurable: true, value: jest.fn() });

  renderWorkspace();

  await screen.findByRole("heading", { name: "Jordan Lee" });
  fireEvent.click(screen.getByRole("button", { name: "Open QR camera" }));
  await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
  fireEvent.click(screen.getByRole("button", { name: "Stop camera" }));
  resolvePermission({ getTracks: () => [{ stop }] });

  await waitFor(() => expect(stop).toHaveBeenCalled());
});

test("keeps a successful gate action visible if refreshing activity fails", async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => profile })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ events: [] }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        pass: {
          student: "Student One",
          rollNo: "R-1",
          batch: "Class 1",
          reason: "Appointment",
          exitTime: "10:00",
          expectedReturnTime: "12:00",
          expiresAt: "2026-11-25T12:00:00.000Z",
          nextAction: "exit"
        },
        message: "Pass verified"
      })
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: "Exit recorded", scanReference: "scan-123" })
    })
    .mockRejectedValueOnce(new Error("Activity refresh failed"));

  renderWorkspace();
  await screen.findByRole("heading", { name: "Jordan Lee" });
  fireEvent.change(screen.getByLabelText("QR token from scanner"), {
    target: { value: "issued-qr-token" }
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify pass" }));
  fireEvent.click(await screen.findByRole("button", { name: "Confirm exit" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Exit recorded · scan-123");
  expect(await screen.findByRole("alert")).toHaveTextContent("Activity refresh failed");
});
