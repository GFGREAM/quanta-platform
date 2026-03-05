"use client";

import PowerBIEmbed from "@/components/powerbi/PowerBIEmbed";

export default function GuestSatisfactionPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[#172951] mb-4">
        Guest Satisfaction
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: "700px" }}>
        <PowerBIEmbed
          reportId="b33408a6-356c-47ea-a1eb-b01cdd2e77d7"
          workspaceId="8926167c-fb2b-44ff-8aa2-bcff7fcf9339"
        />
      </div>
    </div>
  );
}
