"use client";

import dynamic from "next/dynamic";

const PowerBIEmbed = dynamic(
  () => import("@/components/powerbi/PowerBIEmbed"),
  { ssr: false }
);

export default function MetaPositioningPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[#172951] mb-4">
        Hotel META Positioning
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" style={{ height: "700px" }}>
        <PowerBIEmbed reportId="36ef53bd-e4cb-4b2c-a6f9-8240f03206f8" />
      </div>
    </div>
  );
}
