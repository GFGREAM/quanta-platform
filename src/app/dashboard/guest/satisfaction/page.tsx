"use client";

import dynamic from "next/dynamic";
import { POWERBI_REPORTS } from "@/lib/powerbi-config";

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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <PowerBIEmbed
          reportId={POWERBI_REPORTS.guestSatisfaction.reportId}
          workspaceId={POWERBI_REPORTS.guestSatisfaction.workspaceId}
        />
      </div>
    </div>
  );
}
