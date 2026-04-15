"use client";

import dynamic from "next/dynamic";

const PowerBIEmbed = dynamic(
  () => import("@/components/powerbi/PowerBIEmbed"),
  { ssr: false }
);

export default function AirportPassengersPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-[#172951] mb-4">
        Airport Passengers
      </h1>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <PowerBIEmbed
          reportId="86b1f391-cafd-4752-8cde-a2e38aa4bfde"
          workspaceId="8c4b04ea-258e-415f-a8cc-cc5533ddb07e"
        />
      </div>
    </div>
  );
}
