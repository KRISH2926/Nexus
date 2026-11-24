import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ParentRegister from "./ParentRegister";

afterEach(() => { delete global.fetch; jest.restoreAllMocks(); });

test("parent registration shows the actual verification delivery state", async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      message: "Parent registration received, but no verification email was delivered.",
      verificationEmailSent: false
    })
  });
  render(<MemoryRouter><ParentRegister /></MemoryRouter>);

  fireEvent.change(screen.getByLabelText(/parent or guardian name/i), { target: { value: "Parent One" } });
  fireEvent.change(screen.getByLabelText(/verified parent email/i), { target: { value: "parent@example.test" } });
  fireEvent.change(screen.getByLabelText(/student roll number/i), { target: { value: "R-100" } });
  fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "a-strong-parent-password" } });
  fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "a-strong-parent-password" } });
  fireEvent.click(screen.getByRole("button", { name: /create parent account/i }));

  expect(await screen.findByText(/no verification email was delivered/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /request a fresh verification link/i })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("/parent/register"), expect.objectContaining({ method: "POST" }));
});
