import { pool } from './db';
import { SECTION_LABELS } from './section-keys';

export interface UserPermissions {
  hasFullAccess: boolean;
  sections: Record<string, string[]>; // section_key → allowed_properties
}

/**
 * Fetch all permission rows for an email.
 * No rows → full access (admin/internal user).
 * Has rows → restricted to listed section_keys + allowed_properties.
 */
export async function getUserPermissions(email: string): Promise<UserPermissions> {
  const { rows } = await pool.query<{ section_key: string; allowed_properties: string[] }>(
    'SELECT section_key, allowed_properties FROM auth_quanta.user_permissions WHERE email = $1',
    [email],
  );
  if (rows.length === 0) {
    return { hasFullAccess: true, sections: {} };
  }
  const sections: Record<string, string[]> = {};
  for (const row of rows) {
    sections[row.section_key] = row.allowed_properties ?? [];
  }
  return { hasFullAccess: false, sections };
}

export async function hasAccessToSection(email: string, sectionKey: string): Promise<boolean> {
  const perms = await getUserPermissions(email);
  if (perms.hasFullAccess) return true;
  return sectionKey in perms.sections;
}

/**
 * Returns the allowed properties for a section, or null if all are allowed.
 */
export async function getAllowedProperties(email: string, sectionKey: string): Promise<string[] | null> {
  const perms = await getUserPermissions(email);
  if (perms.hasFullAccess) return null;
  const props = perms.sections[sectionKey];
  if (!props || props.length === 0) return null;
  return props;
}

/**
 * Returns the list of section_keys the user can access, with visible labels.
 */
export async function getAllowedSectionsList(email: string): Promise<{ key: string; label: string }[]> {
  const perms = await getUserPermissions(email);
  if (perms.hasFullAccess) {
    return Object.entries(SECTION_LABELS).map(([key, label]) => ({ key, label }));
  }
  return Object.keys(perms.sections)
    .filter((key) => key in SECTION_LABELS)
    .map((key) => ({ key, label: SECTION_LABELS[key] }));
}
