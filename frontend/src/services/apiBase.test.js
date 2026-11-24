import { resolveApiBase } from "./apiBase";

test("production uses the same-origin API instead of a localhost URL by default", () => {
  expect(resolveApiBase("production")).toBe("/api");
});

test("uses a configured API origin and removes trailing slashes", () => {
  expect(resolveApiBase("production", "https://api.example.edu/api///")).toBe("https://api.example.edu/api");
});

test("rejects insecure or protocol-relative production API URLs", () => {
  expect(() => resolveApiBase("production", "http://api.example.edu/api")).toThrow(/HTTPS URL/);
  expect(() => resolveApiBase("production", "//api.example.edu/api")).toThrow(/HTTPS URL/);
});

test("development retains the local API default", () => {
  expect(resolveApiBase("development")).toBe("http://127.0.0.1:5000/api");
});
