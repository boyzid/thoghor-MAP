// Gaps v1 functional test suite. Follows this project's established
// pattern (no test framework in the repo — see scripts/ci/integration-test.mjs
// and scripts/ci/verify-seed.mjs): a small deterministic script using
// Node's built-in fetch plus the existing `pg` dependency, run against a
// disposable Postgres + a real Next.js server. Never touches production.
//
// Usage: node scripts/ci/gap-service-test.mjs
// Requires: DATABASE_URL and BASE_URL (server already running and migrated).

import { Client } from "pg";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const DATABASE_URL = process.env.DATABASE_URL;

const ADMIN_COOKIE = "next-auth.session-token=gaps-test-admin-token";
const USER_A_COOKIE = "next-auth.session-token=gaps-test-usera-token";
const USER_B_COOKIE = "next-auth.session-token=gaps-test-userb-token";

let failed = false;
let passCount = 0;
function ok(label) {
  passCount++;
  console.log(`OK: ${label}`);
}
function fail(label, detail) {
  failed = true;
  console.error(`FAIL: ${label}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ""}`);
}

async function req(path, { method = "GET", cookie, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }
  return { status: res.status, body: json };
}

function assertStatus(label, actualStatus, expected, extra) {
  if (actualStatus !== expected) {
    fail(label, { expected, actual: actualStatus, extra });
    return false;
  }
  ok(`${label} -> ${actualStatus}`);
  return true;
}

async function seedIdentities(client) {
  await client.query(`
    INSERT INTO "User" (id, name, email, role, "createdAt", "updatedAt") VALUES
      ('gaps-test-admin', 'Test Admin', 'gaps-admin@example.com', 'ADMIN', now(), now()),
      ('gaps-test-usera', 'User A', 'gaps-usera@example.com', 'USER', now(), now()),
      ('gaps-test-userb', 'User B', 'gaps-userb@example.com', 'USER', now(), now())
    ON CONFLICT (id) DO NOTHING;
  `);
  await client.query(`
    INSERT INTO "Session" (id, "sessionToken", "userId", expires) VALUES
      ('gaps-test-admin-sess', 'gaps-test-admin-token', 'gaps-test-admin', now() + interval '1 day'),
      ('gaps-test-usera-sess', 'gaps-test-usera-token', 'gaps-test-usera', now() + interval '1 day'),
      ('gaps-test-userb-sess', 'gaps-test-userb-token', 'gaps-test-userb', now() + interval '1 day')
    ON CONFLICT (id) DO NOTHING;
  `);
}

async function waitForReady() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.status === 200) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Server did not become ready in time");
}

const validGapPayload = () => ({
  title: `Test gap ${Math.random().toString(36).slice(2)}`,
  description: "A test gap created by gap-service-test.mjs",
  category: "Testing",
  priority: "medium",
  skills: ["testing"],
});

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  await seedIdentities(client);
  await waitForReady();

  // ================= CREATION =================
  {
    const { status, body } = await req("/api/gaps", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: validGapPayload(),
    });
    if (assertStatus("USER creation succeeds", status, 201)) {
      if (body.source !== "COMMUNITY") fail("USER creation forces COMMUNITY", body.source);
      else ok("USER creation forces COMMUNITY");
      if (body.status !== "ACTIVE") fail("USER creation forces ACTIVE", body.status);
      else ok("USER creation forces ACTIVE");
      if (body.creatorId !== "gaps-test-usera") fail("creatorId from authenticated user", body.creatorId);
      else ok("creatorId comes from authenticated user");
    }
  }
  {
    const { status, body } = await req("/api/gaps", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: { ...validGapPayload(), source: "BOOK" },
    });
    if (assertStatus("USER malicious BOOK injection still succeeds (not escalated)", status, 201)) {
      if (body.source !== "COMMUNITY") fail("malicious BOOK injection cannot escalate", body.source);
      else ok("malicious BOOK injection cannot escalate");
    }
  }
  {
    const { status, body } = await req("/api/gaps", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: { ...validGapPayload(), status: "ARCHIVED" },
    });
    if (assertStatus("USER malicious ARCHIVED injection still succeeds (not escalated)", status, 201)) {
      if (body.status !== "ACTIVE") fail("malicious ARCHIVED injection cannot escalate", body.status);
      else ok("malicious ARCHIVED injection cannot escalate");
    }
  }
  {
    const { status, body } = await req("/api/gaps", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: { ...validGapPayload(), creatorId: "gaps-test-userb" },
    });
    if (assertStatus("USER arbitrary creatorId injection still succeeds (not escalated)", status, 201)) {
      if (body.creatorId !== "gaps-test-usera") fail("arbitrary creatorId cannot be injected", body.creatorId);
      else ok("arbitrary creatorId cannot be injected");
    }
  }
  let bookGapId, communityGapAdminId;
  {
    const { status, body } = await req("/api/gaps", {
      method: "POST",
      cookie: ADMIN_COOKIE,
      body: { ...validGapPayload(), source: "BOOK" },
    });
    if (assertStatus("ADMIN BOOK creation", status, 201)) {
      bookGapId = body.id;
      if (body.creatorId !== null) fail("ADMIN+BOOK creatorId is null", body.creatorId);
      else ok("ADMIN+BOOK creatorId is null");
    }
  }
  {
    const { status, body } = await req("/api/gaps", {
      method: "POST",
      cookie: ADMIN_COOKIE,
      body: { ...validGapPayload(), source: "COMMUNITY" },
    });
    if (assertStatus("ADMIN COMMUNITY creation", status, 201)) {
      communityGapAdminId = body.id;
      if (body.creatorId !== "gaps-test-admin") fail("ADMIN+COMMUNITY creatorId is admin", body.creatorId);
      else ok("ADMIN+COMMUNITY creatorId is admin");
    }
  }
  {
    const { status } = await req("/api/gaps", {
      method: "POST",
      cookie: ADMIN_COOKIE,
      body: validGapPayload(), // no source
    });
    assertStatus("ADMIN creation without source is rejected", status, 400);
  }

  // ================= UPDATE =================
  let ownedActiveCommunityId;
  {
    const { body } = await req("/api/gaps", { method: "POST", cookie: USER_A_COOKIE, body: validGapPayload() });
    ownedActiveCommunityId = body.id;
  }
  {
    const { status, body } = await req(`/api/gaps/${ownedActiveCommunityId}`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
      body: { title: "Updated by owner" },
    });
    if (assertStatus("owner can update ACTIVE COMMUNITY", status, 200)) {
      if (body.title !== "Updated by owner") fail("update applied", body.title);
    }
  }
  {
    const { status } = await req(`/api/gaps/${ownedActiveCommunityId}`, {
      method: "PATCH",
      cookie: USER_B_COOKIE,
      body: { title: "hijack attempt" },
    });
    assertStatus("non-owner cannot update", status, 403);
  }
  {
    const { status } = await req(`/api/gaps/${bookGapId}`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
      body: { title: "should fail" },
    });
    assertStatus("USER cannot update BOOK", status, 403);
  }
  {
    const { status } = await req(`/api/gaps/${ownedActiveCommunityId}`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
      body: { source: "BOOK" },
    });
    assertStatus("update rejects protected field (source) with 400", status, 400);
  }
  {
    // Dedicated COMMUNITY gap with a real (non-null) creatorId, updated
    // through the real API/service path, then re-fetched from the server
    // (not just read off the PATCH response) to confirm creatorId/source
    // survive the update untouched, alongside status and the edited field.
    const { body: created } = await req("/api/gaps", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: validGapPayload(),
    });
    const creatorIdBefore = created.creatorId;

    const { status: patchStatus } = await req(`/api/gaps/${created.id}`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
      body: { description: "Updated description for creatorId-preservation check" },
    });
    assertStatus("creatorId-preservation update succeeds", patchStatus, 200);

    const { status: getStatus, body: fetched } = await req(`/api/gaps/${created.id}`);
    if (assertStatus("creatorId-preservation gap re-fetched", getStatus, 200)) {
      if (fetched.source !== "COMMUNITY") {
        fail("creatorId preservation: source unchanged", fetched.source);
      } else if (fetched.creatorId !== creatorIdBefore || fetched.creatorId !== "gaps-test-usera") {
        fail("creatorId preservation: creatorId unchanged", {
          before: creatorIdBefore,
          after: fetched.creatorId,
        });
      } else if (fetched.status !== "ACTIVE") {
        fail("creatorId preservation: status unchanged", fetched.status);
      } else if (fetched.description !== "Updated description for creatorId-preservation check") {
        fail("creatorId preservation: content field applied", fetched.description);
      } else {
        ok("updateGap preserves creatorId/source/status for a COMMUNITY gap while applying the edit");
      }
    }
  }
  {
    const { status, body } = await req(`/api/gaps/${bookGapId}`, {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
      body: { title: "admin edits BOOK" },
    });
    if (assertStatus("ADMIN can update BOOK", status, 200)) {
      if (body.source !== "BOOK" || body.creatorId !== null) {
        fail("ADMIN update of BOOK preserves source/creatorId", { source: body.source, creatorId: body.creatorId });
      } else ok("ADMIN update of BOOK preserves source/creatorId");
    }
  }
  {
    const { status } = await req(`/api/gaps/${communityGapAdminId}`, {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
      body: { title: "admin edits COMMUNITY" },
    });
    assertStatus("ADMIN can update COMMUNITY", status, 200);
  }

  // ================= ARCHIVE =================
  let archiveOwnerGapId, archiveAdminGapId, archiveUnauthGapId;
  {
    const { body } = await req("/api/gaps", { method: "POST", cookie: USER_A_COOKIE, body: validGapPayload() });
    archiveOwnerGapId = body.id;
  }
  {
    const { body } = await req("/api/gaps", { method: "POST", cookie: USER_A_COOKIE, body: validGapPayload() });
    archiveAdminGapId = body.id;
  }
  {
    const { body } = await req("/api/gaps", { method: "POST", cookie: USER_A_COOKIE, body: validGapPayload() });
    archiveUnauthGapId = body.id;
  }
  {
    const { status, body } = await req(`/api/gaps/${archiveOwnerGapId}/archive`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
    });
    if (assertStatus("owner can archive ACTIVE COMMUNITY", status, 200)) {
      if (body.status !== "ARCHIVED") fail("archive applied", body.status);
    }
  }
  {
    const { status } = await req(`/api/gaps/${archiveOwnerGapId}/archive`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
    });
    assertStatus("already archived -> 409", status, 409);
  }
  {
    const { status } = await req(`/api/gaps/${archiveUnauthGapId}/archive`, {
      method: "PATCH",
      cookie: USER_B_COOKIE,
    });
    assertStatus("unauthorized active archive -> 403", status, 403);
  }
  {
    const { status } = await req(`/api/gaps/${archiveAdminGapId}/archive`, {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
    });
    assertStatus("ADMIN can archive active gap", status, 200);
  }
  {
    const { status } = await req("/api/gaps/does-not-exist/archive", {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
    });
    assertStatus("archive missing gap -> 404", status, 404);
  }

  // ================= UNARCHIVE =================
  {
    const { status } = await req(`/api/admin/gaps/${archiveOwnerGapId}/unarchive`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
    });
    assertStatus("non-admin unarchive -> 403", status, 403);
  }
  {
    const { status } = await req("/api/admin/gaps/does-not-exist/unarchive", {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
    });
    assertStatus("unarchive missing -> 404", status, 404);
  }
  {
    const { status } = await req(`/api/admin/gaps/${archiveAdminGapId}/unarchive`, {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
    });
    // archiveAdminGapId was archived above, so this is the success case;
    // run it first, then repeat for the already-active 409 case.
    if (assertStatus("ADMIN unarchive of archived gap succeeds", status, 200)) {
      const repeat = await req(`/api/admin/gaps/${archiveAdminGapId}/unarchive`, {
        method: "PATCH",
        cookie: ADMIN_COOKIE,
      });
      assertStatus("unarchive already-active -> 409", repeat.status, 409);
    }
  }

  // ================= PROMOTE =================
  let promoteGapId, promoteArchivedGapId;
  {
    const { body } = await req("/api/gaps", { method: "POST", cookie: USER_A_COOKIE, body: validGapPayload() });
    promoteGapId = body.id;
  }
  {
    const { body } = await req("/api/gaps", { method: "POST", cookie: USER_A_COOKIE, body: validGapPayload() });
    promoteArchivedGapId = body.id;
    await req(`/api/gaps/${promoteArchivedGapId}/archive`, { method: "PATCH", cookie: USER_A_COOKIE });
  }
  {
    const { status } = await req(`/api/admin/gaps/${promoteGapId}/promote`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
    });
    assertStatus("non-admin promote -> 403", status, 403);
  }
  {
    const { status } = await req("/api/admin/gaps/does-not-exist/promote", {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
    });
    assertStatus("promote missing -> 404", status, 404);
  }
  {
    const { status, body } = await req(`/api/admin/gaps/${promoteGapId}/promote`, {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
    });
    if (assertStatus("ADMIN promote COMMUNITY+ACTIVE succeeds", status, 200)) {
      if (body.source !== "BOOK") fail("promotion sets source to BOOK", body.source);
      if (body.creatorId !== "gaps-test-usera") fail("promotion preserves creatorId", body.creatorId);
      else ok("promotion preserves creatorId");
      if (body.status !== "ACTIVE") fail("promotion preserves ACTIVE status", body.status);
      else ok("promotion preserves ACTIVE status");
    }
  }
  {
    const { status } = await req(`/api/gaps/${promoteGapId}`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
      body: { title: "should fail post-promotion" },
    });
    assertStatus("original creator loses update permission after promotion", status, 403);
  }
  {
    const { status } = await req(`/api/gaps/${promoteGapId}/archive`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
    });
    assertStatus("original creator loses archive permission after promotion", status, 403);
  }
  {
    const { status } = await req(`/api/admin/gaps/${promoteGapId}/promote`, {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
    });
    assertStatus("promote already-BOOK -> 409", status, 409);
  }
  {
    const { status } = await req(`/api/admin/gaps/${promoteArchivedGapId}/promote`, {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
    });
    assertStatus("promote archived COMMUNITY -> 409", status, 409);
  }

  // ================= PUBLIC ACCESS =================
  {
    const { status } = await req(`/api/gaps/${communityGapAdminId}`);
    assertStatus("public active gap -> 200", status, 200);
  }
  {
    const { status, body } = await req("/api/gaps");
    if (assertStatus("public list -> 200", status, 200)) {
      const archivedPresent = body.some((g) => g.id === archiveOwnerGapId);
      if (archivedPresent) fail("archived excluded from public list", archiveOwnerGapId);
      else ok("archived excluded from public list");
    }
  }
  {
    const { status } = await req(`/api/gaps/${archiveOwnerGapId}`);
    assertStatus("archived direct id -> 404", status, 404);
  }
  {
    const { status } = await req(`/api/admin/gaps/${archiveOwnerGapId}`, { cookie: ADMIN_COOKIE });
    assertStatus("admin archived direct id -> 200", status, 200);
  }

  // ================= PROJECTS =================
  let activeGapForProject, historicalProjectId;
  {
    const { body } = await req("/api/gaps", { method: "POST", cookie: USER_A_COOKIE, body: validGapPayload() });
    activeGapForProject = body.id;
  }
  {
    const { status, body } = await req("/api/projects", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: {
        gapId: activeGapForProject,
        title: "Test project",
        owner: "Tester",
        country: "Testland",
        summary: "A test project",
      },
    });
    if (assertStatus("active gap can receive new Project", status, 201)) {
      historicalProjectId = body.id;
    }
  }
  {
    const { status } = await req("/api/projects", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: {
        gapId: archiveOwnerGapId, // already archived above
        title: "Should fail",
        owner: "Tester",
        country: "Testland",
        summary: "Should be rejected",
      },
    });
    assertStatus("archived gap cannot receive new Project", status, 409);
  }
  if (historicalProjectId) {
    await req(`/api/projects/${historicalProjectId}/complete`, {
      method: "PATCH",
      cookie: USER_A_COOKIE,
      body: { achievements: "a", results: "r", lessonsLearned: "l" },
    });
    await req(`/api/gaps/${activeGapForProject}/archive`, { method: "PATCH", cookie: USER_A_COOKIE });
    const { status, body } = await req("/api/projects");
    if (assertStatus("historical Projects remain readable after gap archival", status, 200)) {
      const found = body.find((p) => p.id === historicalProjectId);
      if (!found) fail("historical project present", historicalProjectId);
      else {
        if (!found.results || found.results.length === 0) fail("historical Results remain readable");
        else ok("historical Results remain readable");
        if (!found.lessons || found.lessons.length === 0) fail("historical Lessons remain readable");
        else ok("historical Lessons remain readable");
      }
    }
  }

  // ================= FOLLOW-UP COVERAGE =================
  {
    // TEST 1 — ADMIN UPDATE OF ARCHIVED GAP: an ADMIN can edit an archived
    // COMMUNITY gap's allowed fields through the real update path, and
    // source/status/creatorId must survive the edit untouched.
    const { body: created } = await req("/api/gaps", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: validGapPayload(),
    });
    await req(`/api/gaps/${created.id}/archive`, { method: "PATCH", cookie: USER_A_COOKIE });

    const updatedDescription = "Admin-edited description on an archived gap";
    const { status: adminUpdateStatus } = await req(`/api/gaps/${created.id}`, {
      method: "PATCH",
      cookie: ADMIN_COOKIE,
      body: { description: updatedDescription },
    });
    const { status: adminGetStatus, body: fetched } = await req(`/api/admin/gaps/${created.id}`, {
      cookie: ADMIN_COOKIE,
    });

    if (adminUpdateStatus !== 200) {
      fail("ADMIN update of archived gap succeeds", { status: adminUpdateStatus });
    } else if (adminGetStatus !== 200) {
      fail("ADMIN re-fetch of archived gap succeeds", { status: adminGetStatus });
    } else if (fetched.source !== "COMMUNITY") {
      fail("ADMIN update of archived gap: source unchanged", fetched.source);
    } else if (fetched.status !== "ARCHIVED") {
      fail("ADMIN update of archived gap: status remains ARCHIVED", fetched.status);
    } else if (fetched.creatorId !== created.creatorId) {
      fail("ADMIN update of archived gap: creatorId unchanged", {
        before: created.creatorId,
        after: fetched.creatorId,
      });
    } else if (fetched.description !== updatedDescription) {
      fail("ADMIN update of archived gap: allowed field applied", fetched.description);
    } else {
      ok("ADMIN can update an archived COMMUNITY gap's allowed fields while source/status/creatorId remain unchanged");
    }
  }
  {
    // TEST 2 — PROJECT CREATION WITH NONEXISTENT GAP: the real
    // POST /api/projects path must reject a gapId that does not exist,
    // matching the existing "missing -> 404" idiom used elsewhere in this
    // file (see "unarchive missing -> 404", "promote missing -> 404").
    const { status } = await req("/api/projects", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: {
        gapId: "does-not-exist",
        title: "Should fail — nonexistent gap",
        owner: "Tester",
        country: "Testland",
        summary: "Should be rejected",
      },
    });
    assertStatus("project creation with nonexistent gap -> 404", status, 404);
  }
  {
    // TEST 3 — ADMIN LISTING INCLUDES ARCHIVED GAP: GET /api/admin/gaps
    // must include archived gaps by default (no implicit status filter),
    // unlike the public listing which excludes them.
    const { body: created } = await req("/api/gaps", {
      method: "POST",
      cookie: USER_A_COOKIE,
      body: validGapPayload(),
    });
    await req(`/api/gaps/${created.id}/archive`, { method: "PATCH", cookie: USER_A_COOKIE });

    const { status, body: list } = await req("/api/admin/gaps", { cookie: ADMIN_COOKIE });
    const found = Array.isArray(list) ? list.find((g) => g.id === created.id) : undefined;

    if (status !== 200) {
      fail("admin listing includes archived gap", { status });
    } else if (!found) {
      fail("admin listing includes archived gap: gap present", created.id);
    } else if (found.status !== "ARCHIVED") {
      fail("admin listing includes archived gap: status is ARCHIVED", found.status);
    } else {
      ok("GET /api/admin/gaps includes an archived gap with status ARCHIVED");
    }
  }

  // ================= PROFILE =================
  {
    const before = await req("/api/users/gaps-test-usera");
    const beforeHas = before.body?.gaps?.some((g) => g.id === ownedActiveCommunityId);
    if (!beforeHas) fail("profile contribution history uses creatorId (pre-check)", ownedActiveCommunityId);
    else ok("profile contribution history uses creatorId");

    const afterPromote = await req("/api/users/gaps-test-usera");
    const stillHas = afterPromote.body?.gaps?.some((g) => g.id === promoteGapId);
    if (!stillHas) fail("promoted COMMUNITY->BOOK remains visible in profile", promoteGapId);
    else ok("promoted COMMUNITY->BOOK remains visible in profile");
  }
  {
    // Null creator handled safely: a BOOK gap's `creator` must be null, not
    // throw/omit unexpectedly.
    const { status, body } = await req(`/api/gaps/${bookGapId}`);
    if (assertStatus("BOOK gap public fetch -> 200", status, 200)) {
      if (body.creator !== null) fail("null creator handled safely", body.creator);
      else ok("null creator handled safely");
    }
  }

  await client.end();

  if (failed) {
    console.error(`[gap-service-test] FAILED (${passCount} checks passed before first failure count)`);
    process.exit(1);
  }
  console.log(`[gap-service-test] PASSED (${passCount} checks)`);
}

main().catch((err) => {
  console.error("[gap-service-test] unexpected error:", err);
  process.exit(1);
});
