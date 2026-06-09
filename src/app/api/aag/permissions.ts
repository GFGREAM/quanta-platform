import { getUserPermissions } from "@/lib/permissions";

/**
 * Returns the list of hotel names a user is allowed to see in P&L routes,
 * or null if the user has full access (no filtering needed).
 * Collects allowed_properties across all pnl-* section_keys (union).
 */
export async function getPnlAllowedHotels(
  email: string,
): Promise<string[] | null> {
  const perms = await getUserPermissions(email);
  if (perms.hasFullAccess) return null;

  const hotels = new Set<string>();
  for (const [key, props] of Object.entries(perms.sections)) {
    if (key.startsWith("pnl-") && props.length > 0) {
      for (const p of props) hotels.add(p);
    }
  }

  // User has pnl sections but no property restrictions → no filter
  if (hotels.size === 0) {
    // Check if user has any pnl section at all
    const hasPnl = Object.keys(perms.sections).some((k) => k.startsWith("pnl-"));
    return hasPnl ? null : [];
  }

  return [...hotels];
}
