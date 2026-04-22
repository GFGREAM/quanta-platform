"use client";

import dynamic from "next/dynamic";
import { POWERBI_REPORTS } from "@/lib/powerbi-config";

const PowerBIEmbed = dynamic(
  () => import("@/components/powerbi/PowerBIEmbed"),
  { ssr: false }
);

export default function MetaPositioningPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4" style={{ color: 'var(--primary)' }}>
        Hotel META Positioning
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <PowerBIEmbed
          reportId={POWERBI_REPORTS.metaPositioning.reportId}
          workspaceId={POWERBI_REPORTS.metaPositioning.workspaceId}
        />
      </div>
    </div>
  );
}
