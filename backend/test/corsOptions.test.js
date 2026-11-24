const test = require("node:test");
const assert = require("node:assert/strict");
const createCorsOptions = require("../config/corsOptions");

function checkOrigin(options, origin) {
  return new Promise((resolve, reject) => {
    options.origin(origin, (error, allowed) => {
      if (error) reject(error);
      else resolve(allowed);
    });
  });
}

test("production requires an explicit HTTPS frontend origin", () => {
  assert.throws(
    () => createCorsOptions({ NODE_ENV: "production" }),
    /CORS_ORIGINS must list the HTTPS frontend origin/
  );
  assert.throws(
    () => createCorsOptions({ NODE_ENV: "production", CORS_ORIGINS: "http://app.example.edu" }),
    /Invalid CORS origin/
  );
});

test("production allows configured origins and rejects all others", async () => {
  const options = createCorsOptions({
    NODE_ENV: "production",
    CORS_ORIGINS: "https://nexus.example.edu, https://admin.example.edu/"
  });

  assert.equal(await checkOrigin(options, "https://nexus.example.edu"), true);
  assert.equal(await checkOrigin(options, "https://admin.example.edu"), true);
  assert.equal(await checkOrigin(options, "https://other.example.edu"), false);
  assert.equal(await checkOrigin(options, undefined), true);
});

test("development permits loopback origins while keeping remote origins denied", async () => {
  const options = createCorsOptions({ NODE_ENV: "development" });

  assert.equal(await checkOrigin(options, "http://localhost:3001"), true);
  assert.equal(await checkOrigin(options, "http://127.0.0.1:4173"), true);
  assert.equal(await checkOrigin(options, "https://remote.example.edu"), false);
});
