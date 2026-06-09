import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getUserPermissions } from '@/lib/permissions';
import { SECTION_LABELS, getAllowedMenus } from '@/lib/section-keys';

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const perms = await getUserPermissions(email);

  // Build the allowed sections list with labels for the modal
  let allowedSections: { key: string; label: string }[];
  if (perms.hasFullAccess) {
    allowedSections = Object.entries(SECTION_LABELS).map(([key, label]) => ({ key, label }));
  } else {
    allowedSections = Object.keys(perms.sections)
      .filter((key) => key in SECTION_LABELS)
      .map((key) => ({ key, label: SECTION_LABELS[key] }));
  }

  // Menu-grouped list for modal display (deduplicated by route)
  const allowedMenus = perms.hasFullAccess
    ? getAllowedMenus(Object.keys(SECTION_LABELS))
    : getAllowedMenus(Object.keys(perms.sections));

  return NextResponse.json({
    email,
    hasFullAccess: perms.hasFullAccess,
    sections: perms.sections,
    allowedSections,
    allowedMenus,
  });
}
