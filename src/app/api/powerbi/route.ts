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

function getRoleFromEmail(email: string): string {
  const prefix = email.split("@")[0].toUpperCase();
  return VALID_ROLES.has(prefix) ? prefix : DEFAULT_ROLE;
}

async function datasetHasRls(
  accessToken: string,
  workspaceId: string,
  datasetId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets/${datasetId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return false;
    const ds = await res.json();
    return ds.isEffectiveIdentityRequired === true;
  } catch {
    return false;
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

  // Check if dataset requires RLS before choosing token strategy
  const needsRls = datasetId
    ? await datasetHasRls(accessToken, workspaceId, datasetId)
    : false;

  console.info(`[PowerBI] Token strategy | workspace=${workspaceId} | report=${reportId} | dataset=${datasetId} | needsRls=${needsRls} | role=${role}`);

  let body: any;

  if (needsRls && datasetId) {
    // Dataset requires effective identity — send RLS identity directly
    body = {
      accessLevel: "View",
      identities: [
        {
          username: "QuantaViewer",
          roles: [role],
          datasets: [datasetId],
        },
      ],
    };
  } else {
    // No RLS required — simple View token
    body = { accessLevel: "View" };
  }

  let response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[PowerBI] Token generation FAILED | status=${response.status} | needsRls=${needsRls} | workspace=${workspaceId} | report=${reportId} | dataset=${datasetId} | role=${role} | body=${errorText}`);

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

  return await response.json();
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = getRoleFromEmail(session.user.email);

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const workspaceId = searchParams.get("workspaceId") || process.env.POWERBI_WORKSPACE_ID;

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
