import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "./Login";
import API from "../services/api";

jest.mock("../services/api", () => ({
  __esModule: true,
  default: { post: jest.fn() }
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/student" element={<p>Student workspace</p>} />
        <Route path="/mentor" element={<p>Teacher workspace</p>} />
        <Route path="/parent" element={<p>Parent workspace</p>} />
        <Route path="/security" element={<p>Security workspace</p>} />
        <Route path="/admin" element={<p>Admin workspace</p>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  API.post.mockReset();
  localStorage.clear();
});

test("shows all campus portals and supports revealing the password", () => {
  renderLogin();

  expect(screen.getByRole("group", { name: "Your portal" })).toBeInTheDocument();
  expect(screen.getAllByRole("radio")).toHaveLength(5);
  expect(screen.getByRole("link", { name: /parent registration/i })).toHaveAttribute("href", "/parent/register");

  const password = screen.getByLabelText("Password", { selector: "input" });
  expect(password).toHaveAttribute("type", "password");
  fireEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(password).toHaveAttribute("type", "text");
});

test("asks for a portal before sending login credentials", () => {
  renderLogin();
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "student@example.edu" } });
  fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), { target: { value: "example-password" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in to NEXUS/i }));

  expect(screen.getByRole("alert")).toHaveTextContent(/choose the portal/i);
  expect(API.post).not.toHaveBeenCalled();
});

test("keeps the user out when the selected portal does not match the account", async () => {
  API.post.mockResolvedValue({
    data: { token: "token", user: { id: "student-1", role: "student", name: "Student" } }
  });
  renderLogin();
  fireEvent.click(screen.getByRole("radio", { name: /teacher/i }));
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "student@example.edu" } });
  fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), { target: { value: "example-password" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in to NEXUS/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/belongs to the student portal/i);
  expect(screen.queryByText("Teacher workspace")).not.toBeInTheDocument();
  expect(localStorage.getItem("token")).toBeNull();
});

test("shows the server message inline when authentication fails", async () => {
  API.post.mockRejectedValue({
    response: { data: { message: "Account is pending admin activation" } }
  });
  renderLogin();
  fireEvent.click(screen.getByRole("radio", { name: /student/i }));
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "student@example.edu" } });
  fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), { target: { value: "example-password" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in to NEXUS/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Account is pending admin activation");
});

test("routes a valid account to its role workspace and stores its session", async () => {
  API.post.mockResolvedValue({
    data: { token: "session-token", user: { id: "student-1", role: "student", name: "Student One" } }
  });
  renderLogin();
  fireEvent.click(screen.getByRole("radio", { name: /student/i }));
  fireEvent.change(screen.getByLabelText("Email address"), { target: { value: "student@example.edu" } });
  fireEvent.change(screen.getByLabelText("Password", { selector: "input" }), { target: { value: "example-password" } });
  fireEvent.click(screen.getByRole("button", { name: /sign in to NEXUS/i }));

  expect(await screen.findByText("Student workspace")).toBeInTheDocument();
  await waitFor(() => expect(localStorage.getItem("role")).toBe("student"));
  expect(localStorage.getItem("token")).toBe("session-token");
  expect(localStorage.getItem("userId")).toBe("student-1");
  expect(API.post).toHaveBeenCalledWith("/auth/login", {
    email: "student@example.edu",
    password: "example-password"
  });
});
