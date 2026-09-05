import { getServerSession } from "next-auth";
import { authOptions } from "./authOptions";

/**
 * Uses the "database" session strategy, so this always reflects the
 * User row as it currently stands in Postgres — never a stale JWT claim.
 */
export async function getSessionUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Authentication required", 401);
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("Admin access required", 403);
  return user;
}
