"use client";

import dynamic from "next/dynamic";

const PowerBIEmbed = dynamic(
  () => import("@/components/powerbi/PowerBIEmbed"),
  { ssr: false }
);

export default function GuestSatisfactionPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[#172951] mb-4">
        Guest Satisfaction
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: "700px" }}>
        <PowerBIEmbed
          reportId={process.env.NEXT_PUBLIC_POWERBI_SATISFACTION_REPORT_ID || ""}
          workspaceId={process.env.NEXT_PUBLIC_POWERBI_SATISFACTION_WORKSPACE_ID || ""}
        />
      </div>
    </div>
  );
}
