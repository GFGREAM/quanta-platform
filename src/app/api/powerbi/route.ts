import { NextResponse } from "next/server";
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

async function generateEmbedToken(
  accessToken: string,
  workspaceId: string,
  reportId: string,
  datasetId: string | null,
  role: string | null
) {
  const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  let body: any = { accessLevel: "View" };

  let response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (errorText.includes("effective identity") && datasetId) {
      body = {
        accessLevel: "View",
        identities: [
          {
            username: "QuantaViewer",
            roles: [role || "GFGAM"],
            datasets: [datasetId],
          },
        ],
      };

      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const retryError = await response.text();
        return { error: retryError };
      }
    } else {
      return { error: errorText };
    }
  }

  return await response.json();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const workspaceId = searchParams.get("workspaceId") || process.env.POWERBI_WORKSPACE_ID;
    const role = searchParams.get("role");

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
      return NextResponse.json({ error: `Failed to get report: ${error}` }, { status: 500 });
    }

    const report = await reportResponse.json();

    const embedResult = await generateEmbedToken(
      accessToken,
      workspaceId!,
      reportId,
      report.datasetId,
      role
    );

    if (embedResult.error) {
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