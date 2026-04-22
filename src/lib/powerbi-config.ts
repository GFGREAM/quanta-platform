// Centralized Power BI workspace and report IDs.
// Update this file when reports are added, moved, or re-published.

export interface PowerBIReportConfig {
  reportId: string;
  workspaceId: string;
  /** Optional RLS role override for this workspace. */
  rlsRole?: string;
}

export const POWERBI_REPORTS = {
  home: {
    reportId: 'f05be719-0c0a-43a8-8498-c42d2fa6b8ea',
    workspaceId: '3eabf576-cb9c-4f2e-970d-b29d851d31b3',
  },
  guestSatisfaction: {
    reportId: '6895b69c-ccf2-484c-aea3-ee9f8cc266eb',
    workspaceId: '8926167c-fb2b-44ff-8aa2-bcff7fcf9339',
    rlsRole: 'WACCR',
  },
  metaPositioning: {
    reportId: '78093172-4f5c-4d8b-b644-f3a09351b147',
    workspaceId: '41e9f90d-3c73-42ea-a4f3-a805c7b90f1b',
  },
  airportPassengers: {
    reportId: '86b1f391-cafd-4752-8cde-a2e38aa4bfde',
    workspaceId: '8c4b04ea-258e-415f-a8cc-cc5533ddb07e',
  },
} as const satisfies Record<string, PowerBIReportConfig>;

// Workspace → RLS role overrides, derived from the config above.
// Used by api/powerbi/route.ts to pick the correct role per workspace.
export const WORKSPACE_ROLE_MAP: Record<string, string> = {};
for (const r of Object.values(POWERBI_REPORTS)) {
  if ('rlsRole' in r) WORKSPACE_ROLE_MAP[r.workspaceId] = r.rlsRole;
}
