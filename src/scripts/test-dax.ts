import { config } from "dotenv";
import { ConfidentialClientApplication } from "@azure/msal-node";

config({ path: ".env.local" });

const DATASET_ID = process.env.POWERBI_DATASET_ID || "";

async function main() {
  const cca = new ConfidentialClientApplication({
    auth: {
      clientId: process.env.POWERBI_CLIENT_ID || "",
      clientSecret: process.env.POWERBI_CLIENT_SECRET || "",
      authority: `https://login.microsoftonline.com/${process.env.POWERBI_TENANT_ID || ""}`,
    },
  });

  const tokenResponse = await cca.acquireTokenByClientCredential({
    scopes: ["https://analysis.windows.net/powerbi/api/.default"],
  });

  if (!tokenResponse?.accessToken) {
    console.error("Failed to acquire token");
    process.exit(1);
  }

  console.log("Token acquired successfully\n");

  const queries = [
    `EVALUATE DISTINCT('AAG'[Data])`,
  ];

  for (const query of queries) {
    console.log(`--- Query ---\n${query}\n`);

    const response = await fetch(
      `https://api.powerbi.com/v1.0/myorg/datasets/${DATASET_ID}/executeQueries`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokenResponse.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: [{ query }],
          serializerSettings: { includeNulls: true },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}):`, errorText);
      continue;
    }

    const result = await response.json();
    const rows = result.results[0].tables[0].rows as Record<string, any>[];
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        console.log(`  ${key}: ${value}`);
      }
    }
    console.log();
  }
}

main();
