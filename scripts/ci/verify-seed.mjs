// CI-only helper: asserts the Prisma seed is genuinely idempotent against a
// real database, not just "idempotent by reading the source." The seed
// script's own console output is not evidence of this — only a direct query
// of row counts, duplicate IDs, and relational correctness before/after a
// second run is. Uses the project's existing `pg` dependency; no new
// package is introduced for this.
//
// Usage:
//   node scripts/ci/verify-seed.mjs record   (after the 1st seed run)
//   node scripts/ci/verify-seed.mjs verify   (after the 2nd seed run)

import { readFile, writeFile } from "node:fs/promises";
import { Client } from "pg";

const MODELS = ["Gap", "Project", "Result", "Lesson"];
const SNAPSHOT_PATH = "/tmp/thoghur-ci-seed-counts.json";

// The two COMPLETED projects seeded by prisma/seed.ts and the relational
// Result/Lesson rows they are expected to carry, plus the two ACTIVE
// projects that must carry none.
const EXPECTED_COMPLETED = {
  p2: { results: 2, lessons: 1 },
  p4: { results: 2, lessons: 1 },
};
const EXPECTED_ACTIVE = ["p1", "p3"];

let failed = false;
function fail(message) {
  failed = true;
  console.error(`FAIL: ${message}`);
}

async function getCounts(client) {
  const counts = {};
  for (const model of MODELS) {
    const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM "${model}"`);
    counts[model] = rows[0].count;
  }
  return counts;
}

async function getDuplicateIds(client, model) {
  const { rows } = await client.query(
    `SELECT id, COUNT(*)::int AS count FROM "${model}" GROUP BY id HAVING COUNT(*) > 1`
  );
  return rows;
}

async function getProjectResultLessonCounts(client, projectId) {
  const { rows } = await client.query(
    `SELECT
       (SELECT COUNT(*)::int FROM "Result" WHERE "projectId" = $1) AS results,
       (SELECT COUNT(*)::int FROM "Lesson" WHERE "projectId" = $1) AS lessons`,
    [projectId]
  );
  return rows[0];
}

async function main() {
  const mode = process.argv[2];
  if (mode !== "record" && mode !== "verify") {
    console.error("Usage: node scripts/ci/verify-seed.mjs <record|verify>");
    process.exit(2);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const counts = await getCounts(client);
    console.log(`[verify-seed:${mode}] row counts:`, counts);

    if (mode === "record") {
      await writeFile(SNAPSHOT_PATH, JSON.stringify(counts));
      console.log("[verify-seed:record] snapshot saved for post-second-run comparison");
      return;
    }

    // mode === "verify"
    const before = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
    for (const model of MODELS) {
      if (before[model] !== counts[model]) {
        fail(
          `${model} row count changed after the second seed run: ${before[model]} -> ${counts[model]}`
        );
      }
    }

    for (const model of MODELS) {
      const dupes = await getDuplicateIds(client, model);
      if (dupes.length > 0) {
        fail(`${model} has ${dupes.length} duplicate id(s): ${JSON.stringify(dupes)}`);
      }
    }

    for (const [projectId, expected] of Object.entries(EXPECTED_COMPLETED)) {
      const actual = await getProjectResultLessonCounts(client, projectId);
      if (actual.results !== expected.results || actual.lessons !== expected.lessons) {
        fail(
          `${projectId}: expected ${expected.results} Result row(s) and ${expected.lessons} Lesson row(s), found ${actual.results}/${actual.lessons}`
        );
      }
    }

    for (const projectId of EXPECTED_ACTIVE) {
      const actual = await getProjectResultLessonCounts(client, projectId);
      if (actual.results !== 0 || actual.lessons !== 0) {
        fail(
          `${projectId} is ACTIVE but unexpectedly has Result/Lesson rows: ${JSON.stringify(actual)}`
        );
      }
    }

    if (failed) {
      console.error("[verify-seed:verify] FAILED");
      process.exit(1);
    }
    console.log(
      "[verify-seed:verify] PASSED: counts stable, no duplicate IDs, relational data correct"
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[verify-seed] unexpected error:", err);
  process.exit(1);
});
