import type { Gap, User } from "@prisma/client";
import { GapSource, GapStatus, Role } from "@prisma/client";

export type AuthUser = Pick<User, "id" | "role">;

export type GapPermissionTarget = Pick<Gap, "creatorId" | "source" | "status">;

// ACTIVE COMMUNITY creator can edit; ACTIVE COMMUNITY creator can archive;
// ADMIN can do both. The identical conditions are intentional for Gaps v1
// (kept as separate functions since lifecycle/error handling differs per
// caller — see gapService.updateGap vs gapService.archiveGap).
export function canUpdateGap(gap: GapPermissionTarget, user: AuthUser): boolean {
  if (user.role === Role.ADMIN) return true;

  return (
    gap.source === GapSource.COMMUNITY &&
    gap.status === GapStatus.ACTIVE &&
    gap.creatorId !== null &&
    gap.creatorId === user.id
  );
}

export function canArchiveGap(gap: GapPermissionTarget, user: AuthUser): boolean {
  if (user.role === Role.ADMIN) return true;

  return (
    gap.source === GapSource.COMMUNITY &&
    gap.status === GapStatus.ACTIVE &&
    gap.creatorId !== null &&
    gap.creatorId === user.id
  );
}

export function canUnarchiveGap(user: AuthUser): boolean {
  return user.role === Role.ADMIN;
}

// Reusable authorization predicate only — promoteToBook() does not use this
// as its sole control-flow branch, because doing so would lose the required
// distinction between the 403 (not admin) and 409 (already BOOK / archived
// COMMUNITY) states.
export function canPromoteGap(
  gap: Pick<Gap, "source" | "status">,
  user: AuthUser
): boolean {
  return (
    user.role === Role.ADMIN &&
    gap.source === GapSource.COMMUNITY &&
    gap.status === GapStatus.ACTIVE
  );
}
