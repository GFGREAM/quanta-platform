import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ConfidentialClientApplication } from "@azure/msal-node";

function getMsalClient() {
  return new ConfidentialClientApplication({
    auth: {
      clientId: process.env.POWERBI_CLIENT_ID || "",
      clientSecret: process.env.POWERBI_CLIENT_SECRET || "",
      authority: `https://login.microsoftonline.com/${process.env.POWERBI_TENANT_ID || ""}`,
    },
  });
}

const VALID_ROLES = new Set([
  "BBG", "BBGZ", "BURSZTYN", "GFGAM", "HALABE", "HDMLC", "HELMUT",
  "HYATT HOUSE SANTA FE", "JAC", "MARRIOT", "ST REGIS", "WALDORF ASTORIA", "ZOETRY",
]);

const DEFAULT_ROLE = "GFGAM";

const WORKSPACE_ROLE_MAP: Record<string, string> = {
  "8926167c-fb2b-44ff-8aa2-bcff7fcf9339": "WACCR", // Guest Satisfaction
};

function getRoleFromEmail(email: string): string {
  const prefix = email.split("@")[0].toUpperCase();
  return VALID_ROLES.has(prefix) ? prefix : DEFAULT_ROLE;
}

async function getDatasetRlsInfo(
  accessToken: string,
  workspaceId: string,
  datasetId: string
): Promise<{ needsRls: boolean; roles: string[] }> {
  try {
    const dsRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!dsRes.ok) return { needsRls: false, roles: [] };
    const ds = await dsRes.json();

    if (!ds.isEffectiveIdentityRequired) return { needsRls: false, roles: [] };

    // Fetch actual RLS roles configured in the dataset
    const rolesDirectRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}/roles`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const roles: string[] = [];
    if (rolesDirectRes.ok) {
      const rolesData = await rolesDirectRes.json();
      if (rolesData.value) {
        rolesData.value.forEach((r: any) => {
          if (r.name) roles.push(r.name);
        });
      }
    }

    console.info(`[PowerBI] Dataset RLS info | dataset=${datasetId} | needsRls=true | roles=[${roles.join(', ')}]`);
    return { needsRls: true, roles };
  } catch {
    return { needsRls: false, roles: [] };
  }
}

async function generateEmbedToken(
  accessToken: string,
  workspaceId: string,
  reportId: string,
  datasetId: string | null,
  role: string
) {
  const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // Check if dataset requires RLS and discover available roles
  const rlsInfo = datasetId
    ? await getDatasetRlsInfo(accessToken, workspaceId, datasetId)
    : { needsRls: false, roles: [] as string[] };

  const { needsRls } = rlsInfo;

  // Pick the best role: prefer the user's role if it exists in the dataset, otherwise use the first available
  let effectiveRole = role;
  if (needsRls && rlsInfo.roles.length > 0) {
    const userRoleMatch = rlsInfo.roles.find(
      (r) => r.toUpperCase() === role.toUpperCase()
    );
    effectiveRole = userRoleMatch || rlsInfo.roles[0];
  }

  console.info(`[PowerBI] Token strategy | workspace=${workspaceId} | report=${reportId} | dataset=${datasetId} | needsRls=${needsRls} | requestedRole=${role} | effectiveRole=${effectiveRole} | availableRoles=[${rlsInfo.roles.join(', ')}]`);

  // ────────────────────────────────────────────────────────────────────────
  // RLS TEMPORALMENTE NEUTRALIZADO (17 abril 2026)
  // ────────────────────────────────────────────────────────────────────────
  // Motivo: Microsoft no permite Service Principal + executeQueries sobre
  // datasets con RLS. Esto rompe las KPI cards del Home (PowerBINotAuthorizedException).
  //
  // Mientras no haya propietarios en producción (Assignment Required en Azure AD
  // bloquea a todos menos T2BGFGREAM), forzamos tokens sin effective identity.
  // Los roles RLS siguen definidos en los datasets y se reactivarán cuando se
  // implemente OBO flow (token del usuario autenticado) antes del piloto.
  //
  // Para reactivar: restaurar el bloque if (needsRls && datasetId) { ... } else { ... }
  // Toda la lógica de apoyo (datasetHasRls, WORKSPACE_ROLE_MAP, VALID_ROLES,
  // getRoleFromEmail) se mantiene intacta para facilitar la reactivación.
  // ────────────────────────────────────────────────────────────────────────
  let body: any;
  body = { accessLevel: "View" };

  let response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PowerBI] Token generation FAILED | status=${response.status} | needsRls=${needsRls} | workspace=${workspaceId} | report=${reportId} | dataset=${datasetId} | effectiveRole=${effectiveRole} | body=${errorText}`);

    // If we sent RLS identity and it failed, retry without identity as fallback
    if (needsRls) {
      console.warn(`[PowerBI] RLS token failed, retrying with simple View token`);
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ accessLevel: "View" }),
      });

      if (!response.ok) {
        const fallbackError = await response.text();
        console.error(`[PowerBI] Fallback (simple View) also FAILED | status=${response.status} | body=${fallbackError}`);
        return { error: fallbackError };
      }
    } else {
      return { error: errorText };
    }
  }

  const tokenData = await response.json();
  console.info(`[PowerBI] Token generated OK | workspace=${workspaceId} | report=${reportId} | needsRls=${needsRls} | effectiveRole=${effectiveRole} | hasToken=${!!tokenData.token} | expiry=${tokenData.expiration || 'n/a'}`);
  return tokenData;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const workspaceId = searchParams.get("workspaceId") || process.env.POWERBI_WORKSPACE_ID;

    const userRole = WORKSPACE_ROLE_MAP[workspaceId!] || getRoleFromEmail(session.user.email);

    if (!reportId) {
      return NextResponse.json({ error: "reportId is required" }, { status: 400 });
    }

    const cca = getMsalClient();

    const tokenResponse = await cca.acquireTokenByClientCredential({
      scopes: ["https://analysis.windows.net/powerbi/api/.default"],
    });

    if (!tokenResponse || !tokenResponse.accessToken) {
      return NextResponse.json({ error: "Failed to acquire token" }, { status: 500 });
    }

    const accessToken = tokenResponse.accessToken;

    const reportResponse = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!reportResponse.ok) {
      const error = await reportResponse.text();
      console.error(`[PowerBI] Report fetch FAILED | status=${reportResponse.status} | workspace=${workspaceId} | report=${reportId} | body=${error}`);
      return NextResponse.json({ error: `Failed to get report: ${error}` }, { status: 500 });
    }

    const report = await reportResponse.json();

    let datasetId: string | null = report.datasetId || null;

    if (!datasetId) {
      const datasetsRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (datasetsRes.ok) {
        const { value: datasets } = await datasetsRes.json();
        if (datasets?.length === 1) {
          datasetId = datasets[0].id;
        } else if (datasets?.length > 1) {
          const match = datasets.find((ds: any) => ds.name === report.name);
          if (match) datasetId = match.id;
          else datasetId = datasets[0].id;
        }
        console.warn(`[PowerBI] report.datasetId was null, resolved from datasets API: ${datasetId}`);
      }
    }

    const embedResult = await generateEmbedToken(
      accessToken,
      workspaceId!,
      reportId,
      datasetId,
      userRole
    );

    if (embedResult.error) {
      console.error(`[PowerBI] Embed token FAILED | workspace=${workspaceId} | report=${reportId} | dataset=${datasetId} | role=${userRole} | error=${embedResult.error}`);
      return NextResponse.json(
        { error: `Failed to generate embed token: ${embedResult.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      embedUrl: report.embedUrl,
      embedToken: embedResult.token,
      reportId: report.id,
      expiry: embedResult.expiration,
    });
  } catch (error) {
    console.error("Power BI API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
