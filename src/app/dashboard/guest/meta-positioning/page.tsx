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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <PowerBIEmbed
          reportId="78093172-4f5c-4d8b-b644-f3a09351b147"
          workspaceId="41e9f90d-3c73-42ea-a4f3-a805c7b90f1b"
        />
      </div>
    </div>
  );
}
