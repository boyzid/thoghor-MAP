// Task 4 integration gate: lightweight HTTP smoke tests against the real
// production Docker image (see docker-compose.test.yml), run from the host.
// No browser-testing framework - just Node's built-in fetch and assertions.
//
// Usage:
//   node scripts/ci/integration-test.mjs full      (initial run - full suite)
//   node scripts/ci/integration-test.mjs recheck   (after a restart - light suite)
//
// A test User/Session row must already exist in the database before "full"
// runs (seeded separately via `docker compose exec postgres psql ...` - see
// the workflow/README for the exact statement) so the authenticated checks
// below have a real, valid session cookie to use, without ever touching
// Google OAuth in CI.

const BASE_URL = process.env.INTEGRATION_BASE_URL ?? "http://127.0.0.1:3100";
const SESSION_COOKIE = "next-auth.session-token=itest-session-token";
const READY_TIMEOUT_MS = 60_000;

let failed = false;
function fail(message) {
  failed = true;
  console.error(`FAIL: ${message}`);
}

async function assertStatus(label, res, expected) {
  if (res.status !== expected) {
    fail(`${label}: expected HTTP ${expected}, got ${res.status}`);
    // Drain the body even on failure so the connection can close cleanly
    // instead of leaving a dangling socket/handle open until process exit.
    await res.text().catch(() => {});
    return false;
  }
  console.log(`OK: ${label} -> ${res.status}`);
  return true;
}

async function waitForReady() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError = "no attempt made";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.status === 200) {
        console.log("OK: application is ready (GET / returned 200)");
        return;
      }
      lastError = `GET / returned ${res.status}`;
    } catch (err) {
      lastError = err.message;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Application did not become ready within ${READY_TIMEOUT_MS}ms: ${lastError}`);
}

async function checkHome() {
  const res = await fetch(`${BASE_URL}/`);
  await assertStatus("GET /", res, 200);
}

async function checkHealth() {
  const res = await fetch(`${BASE_URL}/api/health`);
  if (!(await assertStatus("GET /api/health", res, 200))) return;
  const body = await res.json();
  if (body.status !== "ok" || body.db !== "connected") {
    fail(`GET /api/health: expected {status:"ok",db:"connected"}, got ${JSON.stringify(body)}`);
  } else {
    console.log("OK: /api/health reports database connectivity");
  }
}

async function checkUnauthenticatedRejected() {
  const res = await fetch(`${BASE_URL}/api/gaps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "t", description: "d", priority: "high" }),
  });
  await assertStatus("POST /api/gaps (unauthenticated)", res, 401);
}

async function checkMalformedPayloadRejected() {
  const res = await fetch(`${BASE_URL}/api/gaps`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: SESSION_COOKIE },
    body: JSON.stringify({ title: "   ", description: "d" }), // whitespace-only + missing priority
  });
  if (!(await assertStatus("POST /api/gaps (malformed payload)", res, 400))) return;
  const body = await res.json();
  if (!body.error || !Array.isArray(body.issues) || body.issues.length === 0) {
    fail(`Malformed-payload response is not a sanitized structured validation error: ${JSON.stringify(body)}`);
    return;
  }
  const text = JSON.stringify(body);
  if (/prisma|postgres|at\s+\S+\.js:\d+/i.test(text)) {
    fail(`Malformed-payload response appears to leak internal error detail: ${text}`);
    return;
  }
  console.log("OK: malformed payload returns a sanitized structured validation error");
}

async function checkValidGapCreation() {
  const res = await fetch(`${BASE_URL}/api/gaps`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: SESSION_COOKIE },
    body: JSON.stringify({
      title: "Integration test gap",
      description: "Created by scripts/ci/integration-test.mjs",
      priority: "medium",
    }),
  });
  if (!(await assertStatus("POST /api/gaps (valid, authenticated)", res, 201))) return null;
  const body = await res.json();
  if (!body.id || body.creatorId !== "itest-user") {
    fail(`Created gap missing id or has unexpected creatorId: ${JSON.stringify(body)}`);
    return null;
  }
  console.log(`OK: gap created with server-derived creatorId (id=${body.id})`);
  return body.id;
}

async function checkNonexistentGapRejected() {
  const res = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: SESSION_COOKIE },
    body: JSON.stringify({
      gapId: "does-not-exist",
      title: "t",
      owner: "o",
      country: "c",
      summary: "s",
    }),
  });
  await assertStatus("POST /api/projects (nonexistent gapId)", res, 404);
}

async function checkCompletionAndConflict(gapId) {
  const createRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: SESSION_COOKIE },
    body: JSON.stringify({
      gapId,
      title: "Integration test project",
      owner: "Integration Tester",
      country: "Testland",
      summary: "Created by scripts/ci/integration-test.mjs",
    }),
  });
  if (!(await assertStatus("POST /api/projects (valid, authenticated)", createRes, 201))) return;
  const project = await createRes.json();

  const completeRes = await fetch(`${BASE_URL}/api/projects/${project.id}/complete`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: SESSION_COOKIE },
    body: JSON.stringify({
      achievements: "Achieved things.",
      results: "Results happened.",
      lessonsLearned: "We learned things.",
    }),
  });
  if (!(await assertStatus("PATCH .../complete (first time)", completeRes, 200))) return;
  const completed = await completeRes.json();
  if (!Array.isArray(completed.results) || completed.results.length !== 2) {
    fail(`Completed project missing expected 2 Result rows: ${JSON.stringify(completed)}`);
  }
  if (!Array.isArray(completed.lessons) || completed.lessons.length !== 1) {
    fail(`Completed project missing expected 1 Lesson row: ${JSON.stringify(completed)}`);
  }

  const repeatRes = await fetch(`${BASE_URL}/api/projects/${project.id}/complete`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: SESSION_COOKIE },
    body: JSON.stringify({ achievements: "a2", results: "r2", lessonsLearned: "l2" }),
  });
  await assertStatus("PATCH .../complete (repeat -> conflict)", repeatRes, 409);
}

async function checkGapPersistedAfterRestart() {
  const res = await fetch(`${BASE_URL}/api/gaps`);
  if (!(await assertStatus("GET /api/gaps (post-restart persistence check)", res, 200))) return;
  const gaps = await res.json();
  const found = gaps.some((g) => g.description === "Created by scripts/ci/integration-test.mjs");
  if (!found) {
    fail("Gap created before restart is missing after restart - possible data loss");
  } else {
    console.log("OK: previously-created data survived the restart");
  }
}

async function runFull() {
  await waitForReady();
  await checkHome();
  await checkHealth();
  await checkUnauthenticatedRejected();
  await checkMalformedPayloadRejected();
  const gapId = await checkValidGapCreation();
  await checkNonexistentGapRejected();
  if (gapId) {
    await checkCompletionAndConflict(gapId);
  } else {
    fail("Skipped completion/conflict checks because gap creation failed");
  }
}

async function runRecheck() {
  await waitForReady();
  await checkHome();
  await checkHealth();
  await checkGapPersistedAfterRestart();
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "full" && mode !== "recheck") {
    console.error("Usage: node scripts/ci/integration-test.mjs <full|recheck>");
    process.exit(2);
  }

  if (mode === "full") {
    await runFull();
  } else {
    await runRecheck();
  }

  if (failed) {
    console.error(`[integration-test:${mode}] FAILED`);
    process.exit(1);
  }
  console.log(`[integration-test:${mode}] PASSED`);
}

main().catch((err) => {
  console.error("[integration-test] unexpected error:", err);
  process.exit(1);
});
