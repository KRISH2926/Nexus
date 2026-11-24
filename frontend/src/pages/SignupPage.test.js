import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignupPage from "./SignupPage";

describe("SignupPage", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("submits student details without exposing an admin signup option", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ batches: [{ id: "batch-1", name: "Batch 2026" }] })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({
          message: "Registration received.",
          accountStatus: "pending_review",
          requiresEmailVerification: true,
          verificationEmailSent: false
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ message: "If an eligible pending account exists, a new verification link has been sent." })
      });

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    );

    expect(screen.queryByRole("radio", { name: "Admin" })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Asha Student" }
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "asha@example.edu" }
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-horse-42" }
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "correct-horse-42" }
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    fireEvent.change(await screen.findByLabelText("Roll number"), {
      target: { value: "ST-42" }
    });
    fireEvent.change(screen.getByLabelText("Batch"), {
      target: { value: "batch-1" }
    });
    fireEvent.change(screen.getByLabelText("Student registration code"), {
      target: { value: "one-time-code" }
    });
    fireEvent.change(screen.getByLabelText("Student mobile"), {
      target: { value: "9876543210" }
    });
    fireEvent.change(screen.getByLabelText("Full name", { selector: "input[name=parentName]" }), {
      target: { value: "Parent Student" }
    });
    fireEvent.change(screen.getByLabelText("Verified email address"), {
      target: { value: "parent@example.edu" }
    });
    fireEvent.change(screen.getByLabelText("Mobile number"), {
      target: { value: "9876543211" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await screen.findByText("Current status: pending review");
    fireEvent.click(screen.getByRole("button", { name: "Resend verification link" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/new verification link has been sent/i);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
    const [, options] = global.fetch.mock.calls[1];
    expect(JSON.parse(options.body)).toMatchObject({
      role: "student",
      rollNo: "ST-42",
      batch: "batch-1",
      parentEmail: "parent@example.edu"
    });
    const [, resendOptions] = global.fetch.mock.calls[2];
    expect(JSON.parse(resendOptions.body)).toEqual({ email: "asha@example.edu" });
  });

  test("allows retry when campus batch options fail to load", async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error("Could not load campus batches."))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ batches: [{ id: "batch-1", name: "Batch 2026" }] })
      });

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Asha Student" }
    });
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "asha@example.edu" }
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-horse-42" }
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "correct-horse-42" }
    });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not load campus batches/);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("option", { name: "Batch 2026" })).toBeInTheDocument();
  });
});
