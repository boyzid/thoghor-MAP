import { Prisma, GapSource, GapStatus, Role } from "@prisma/client";
import type { Priority } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from "@/lib/api/errors";
import { canUpdateGap, canArchiveGap, canUnarchiveGap, type AuthUser } from "./gapAuth";

// All Gap database access lives here. API routes must never call
// prisma.gap.* directly — this keeps authorization, lifecycle rules, and
// the protected-field allowlist in one place instead of duplicated per
// route.

const CREATOR_SELECT = { select: { id: true, name: true, image: true } } as const;

export interface GapFilters {
  source?: GapSource;
  category?: string;
  search?: string;
}

export interface AdminGapFilters extends GapFilters {
  status?: GapStatus;
}

export interface CreateGapInput {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  skills: string[];
  source?: GapSource;
}

export interface UpdateGapInput {
  title?: string;
  description?: string;
  category?: string;
  priority?: Priority;
  skills?: string[];
}

function buildWhere(filters: GapFilters, status?: GapStatus): Prisma.GapWhereInput {
  const where: Prisma.GapWhereInput = {};
  if (status) where.status = status;
  if (filters.source) where.source = filters.source;
  if (filters.category) where.category = filters.category;
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  return where;
}

// 7.1 — public listing. ACTIVE only; ARCHIVED must never appear here.
export async function listPublicGaps(filters: GapFilters = {}) {
  return prisma.gap.findMany({
    where: buildWhere(filters, GapStatus.ACTIVE),
    include: { creator: CREATOR_SELECT },
    orderBy: { createdAt: "asc" },
  });
}

// 7.2 — admin listing. Enforces admin authorization itself, independent of
// whatever the calling route already checked via requireAdmin().
export async function listAllGapsForAdmin(filters: AdminGapFilters, user: AuthUser) {
  if (user.role !== Role.ADMIN) {
    throw new ForbiddenError("Admin access required");
  }
  const { status, ...rest } = filters;
  return prisma.gap.findMany({
    where: buildWhere(rest, status),
    include: { creator: CREATOR_SELECT },
    orderBy: { createdAt: "asc" },
  });
}

// 7.3 — public single-gap lookup. `status` is not a unique field, so this
// cannot be expressed as a single findUnique `where` clause — fetch by id,
// then treat "missing" and "archived" identically as 404.
export async function getPublicGapById(id: string) {
  const gap = await prisma.gap.findUnique({
    where: { id },
    include: { creator: CREATOR_SELECT },
  });
  if (!gap || gap.status !== GapStatus.ACTIVE) {
    throw new NotFoundError("Gap not found");
  }
  return gap;
}

// 7.4 — admin single-gap lookup. No status filter: admins can retrieve
// ACTIVE and ARCHIVED gaps alike.
export async function getAdminGapById(id: string, user: AuthUser) {
  if (user.role !== Role.ADMIN) {
    throw new ForbiddenError("Admin access required");
  }
  const gap = await prisma.gap.findUnique({
    where: { id },
    include: { creator: CREATOR_SELECT },
  });
  if (!gap) {
    throw new NotFoundError("Gap not found");
  }
  return gap;
}

// 8 — createGap. Never trusts client-supplied source/status/creatorId for a
// non-admin caller; a USER always gets COMMUNITY/ACTIVE/self, regardless of
// what the payload claims. ADMIN must explicitly choose a validated source
// (never silently defaulted to BOOK).
export async function createGap(data: CreateGapInput, user: AuthUser) {
  let source: GapSource;
  let creatorId: string | null;

  if (user.role === Role.ADMIN) {
    if (!data.source) {
      throw new ValidationError([
        { path: "source", message: "source is required for admin-created gaps" },
      ]);
    }
    source = data.source;
    creatorId = source === GapSource.BOOK ? null : user.id;
  } else {
    source = GapSource.COMMUNITY;
    creatorId = user.id;
  }

  return prisma.gap.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      priority: data.priority,
      skills: data.skills,
      source,
      status: GapStatus.ACTIVE,
      creatorId,
    },
    include: { creator: CREATOR_SELECT },
  });
}

// 9 — updateGap. Order: fetch -> missing 404 -> canUpdateGap -> 403 ->
// apply an explicit allowlisted update. id/source/status/creatorId/
// createdAt/updatedAt can never be reached here regardless of caller.
export async function updateGap(id: string, data: UpdateGapInput, user: AuthUser) {
  const gap = await prisma.gap.findUnique({ where: { id } });
  if (!gap) {
    throw new NotFoundError("Gap not found");
  }
  if (!canUpdateGap(gap, user)) {
    throw new ForbiddenError();
  }

  const update: Prisma.GapUpdateInput = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.category !== undefined) update.category = data.category;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.skills !== undefined) update.skills = data.skills;

  return prisma.gap.update({
    where: { id },
    data: update,
    include: { creator: CREATOR_SELECT },
  });
}

// 10 — archiveGap. Required exact order: missing -> 404, already archived
// -> 409, then authorization -> 403, then transition.
export async function archiveGap(id: string, user: AuthUser) {
  const gap = await prisma.gap.findUnique({ where: { id } });
  if (!gap) {
    throw new NotFoundError("Gap not found");
  }
  if (gap.status === GapStatus.ARCHIVED) {
    throw new ConflictError("Gap already archived");
  }
  if (!canArchiveGap(gap, user)) {
    throw new ForbiddenError();
  }

  // Atomic transition (same pattern as the existing project-completion
  // race fix): only succeeds if the row is still ACTIVE, so a concurrent
  // archive request loses cleanly with 409 instead of double-applying.
  const transition = await prisma.gap.updateMany({
    where: { id, status: GapStatus.ACTIVE },
    data: { status: GapStatus.ARCHIVED },
  });
  if (transition.count === 0) {
    throw new ConflictError("Gap already archived");
  }

  return prisma.gap.findUniqueOrThrow({ where: { id }, include: { creator: CREATOR_SELECT } });
}

// 11 — unarchiveGap. ADMIN-only. Exact order: non-admin -> 403, missing ->
// 404, already ACTIVE -> 409, then transition.
export async function unarchiveGap(id: string, adminUser: AuthUser) {
  if (adminUser.role !== Role.ADMIN) {
    throw new ForbiddenError("Admin access required");
  }

  const gap = await prisma.gap.findUnique({ where: { id } });
  if (!gap) {
    throw new NotFoundError("Gap not found");
  }
  if (gap.status === GapStatus.ACTIVE) {
    throw new ConflictError("Gap already active");
  }
  if (!canUnarchiveGap(adminUser)) {
    throw new ForbiddenError();
  }

  const transition = await prisma.gap.updateMany({
    where: { id, status: GapStatus.ARCHIVED },
    data: { status: GapStatus.ACTIVE },
  });
  if (transition.count === 0) {
    throw new ConflictError("Gap already active");
  }

  return prisma.gap.findUniqueOrThrow({ where: { id }, include: { creator: CREATOR_SELECT } });
}

// 12 — promoteToBook. ADMIN-only. Steps 1-5 fully establish the only valid
// remaining state (COMMUNITY + ACTIVE), so no further canPromoteGap()
// branch is needed — canPromoteGap() remains available as a reusable
// predicate for other callers (e.g. UI-side convenience checks), but is
// not used as control flow here because it collapses the 403 vs 409
// distinction this order requires.
export async function promoteToBook(id: string, adminUser: AuthUser) {
  if (adminUser.role !== Role.ADMIN) {
    throw new ForbiddenError("Admin access required");
  }

  const gap = await prisma.gap.findUnique({ where: { id } });
  if (!gap) {
    throw new NotFoundError("Gap not found");
  }
  if (gap.source === GapSource.BOOK) {
    throw new ConflictError("Gap is already a BOOK gap");
  }
  if (gap.source === GapSource.COMMUNITY && gap.status === GapStatus.ARCHIVED) {
    throw new ConflictError("Archived COMMUNITY gaps cannot be promoted");
  }

  // Only remaining valid state: COMMUNITY + ACTIVE. Change source only —
  // creatorId and status are never touched, so attribution and lifecycle
  // state survive promotion unchanged.
  const transition = await prisma.gap.updateMany({
    where: { id, source: GapSource.COMMUNITY, status: GapStatus.ACTIVE },
    data: { source: GapSource.BOOK },
  });
  if (transition.count !== 1) {
    throw new ConflictError("Gap state changed before promotion could complete");
  }

  return prisma.gap.findUniqueOrThrow({ where: { id }, include: { creator: CREATOR_SELECT } });
}

// Used by the Project-creation route so it never queries prisma.gap.*
// directly either. Archived gaps must not receive new Projects; historical
// Projects/Results/Lessons under an archived Gap remain readable elsewhere.
export async function assertGapAcceptsNewProjects(gapId: string): Promise<{ id: string }> {
  const gap = await prisma.gap.findUnique({
    where: { id: gapId },
    select: { id: true, status: true },
  });
  if (!gap) {
    throw new NotFoundError("Gap not found");
  }
  if (gap.status === GapStatus.ARCHIVED) {
    throw new ConflictError("Cannot create a project under an archived gap");
  }
  return { id: gap.id };
}

// Used by the public profile route. Attribution is creatorId-based, not
// source-based, so a COMMUNITY gap later promoted to BOOK stays in the
// creator's contribution history. ACTIVE only, matching the public-UI rule
// that archived content is excluded from public-facing views.
export async function listGapsForProfile(userId: string) {
  return prisma.gap.findMany({
    where: { creatorId: userId, status: GapStatus.ACTIVE },
    orderBy: { createdAt: "asc" },
  });
}
