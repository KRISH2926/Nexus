import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequireAuth from "./RequireAuth";

describe("RequireAuth", () => {
  afterEach(() => localStorage.clear());

  test("redirects unauthenticated visitors to sign in", () => {
    render(
      <MemoryRouter initialEntries={["/student"]}>
        <Routes>
          <Route path="/student" element={<RequireAuth allowedRoles={["student"]}><p>Student workspace</p></RequireAuth>} />
          <Route path="/login" element={<p>Sign-in page</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Sign-in page")).toBeInTheDocument();
    expect(screen.queryByText("Student workspace")).not.toBeInTheDocument();
  });

  test("sends authenticated users to their own role workspace", () => {
    localStorage.setItem("token", "present");
    localStorage.setItem("role", "teacher");

    render(
      <MemoryRouter initialEntries={["/student"]}>
        <Routes>
          <Route path="/student" element={<RequireAuth allowedRoles={["student"]}><p>Student workspace</p></RequireAuth>} />
          <Route path="/mentor" element={<p>Teacher workspace</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Teacher workspace")).toBeInTheDocument();
    expect(screen.queryByText("Student workspace")).not.toBeInTheDocument();
  });
});
