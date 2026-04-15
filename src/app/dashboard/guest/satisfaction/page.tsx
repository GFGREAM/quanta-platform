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
          reportId="6895b69c-ccf2-484c-aea3-ee9f8cc266eb"
          workspaceId="8926167c-fb2b-44ff-8aa2-bcff7fcf9339"
        />
      </div>
    </div>
  );
}
