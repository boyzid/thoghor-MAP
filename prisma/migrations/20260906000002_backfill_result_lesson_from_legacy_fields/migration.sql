-- Data migration only (no schema changes): copy the free-text achievements /
-- results / lessonsLearned fields on completed Projects into the new
-- normalized Result / Lesson tables, before the legacy columns are dropped
-- in the next migration. Safe to re-run: only inserts rows for legacy values
-- that still exist as columns (which the next migration removes).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO "Result" (id, "projectId", title, description, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, id, 'الإنجازات', achievements, "updatedAt", "updatedAt"
FROM "Project"
WHERE achievements IS NOT NULL AND btrim(achievements) <> '';

INSERT INTO "Result" (id, "projectId", title, description, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, id, 'النتائج المحققة', results, "updatedAt", "updatedAt"
FROM "Project"
WHERE results IS NOT NULL AND btrim(results) <> '';

INSERT INTO "Lesson" (id, "projectId", title, description, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, id, 'الدروس المستفادة', "lessonsLearned", "updatedAt", "updatedAt"
FROM "Project"
WHERE "lessonsLearned" IS NOT NULL AND btrim("lessonsLearned") <> '';
