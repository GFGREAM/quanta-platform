import { ConfidentialClientApplication } from "@azure/msal-node";

const DATASET_ID = process.env.POWERBI_DATASET_ID || "";

async function run() {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.POWERBI_CLIENT_ID || "",
      clientSecret: process.env.POWERBI_CLIENT_SECRET || "",
      authority: `https://login.microsoftonline.com/${process.env.POWERBI_TENANT_ID || ""}`,
    },
  });

  const token = await cca.acquireTokenByClientCredential({
    scopes: ["https://analysis.windows.net/powerbi/api/.default"],
  });

  if (!token?.accessToken) throw new Error("No token");

  // Query 1: list all tables
  const q1 = await fetch(
    `https://api.powerbi.com/v1.0/myorg/datasets/${DATASET_ID}/executeQueries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queries: [{ query: "EVALUATE INFO.VIEW.TABLES()" }],
        serializerSettings: { includeNulls: true },
      }),
    }
  );
  const tables = await q1.json();
  console.log("=== TABLES ===");
  console.log(JSON.stringify(tables, null, 2));

  // Query 2: list all columns
  const q2 = await fetch(
    `https://api.powerbi.com/v1.0/myorg/datasets/${DATASET_ID}/executeQueries`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queries: [{ query: "EVALUATE INFO.VIEW.COLUMNS()" }],
        serializerSettings: { includeNulls: true },
      }),
    }
  );
  const columns = await q2.json();
  console.log("=== COLUMNS ===");
  console.log(JSON.stringify(columns, null, 2));
}

run().catch(console.error);
