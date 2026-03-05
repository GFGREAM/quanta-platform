"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as pbi from "powerbi-client";

interface PowerBIEmbedProps {
  reportId: string;
  workspaceId?: string;
}

export default function PowerBIEmbed({ reportId, workspaceId }: PowerBIEmbedProps) {
  const embedRef = useRef<HTMLDivElement>(null);
  const powerbiRef = useRef<pbi.service.Service | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const attemptsRef = useRef(0);
  const maxAttempts = 3;

  const embedReport = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const params = new URLSearchParams({ reportId });
      if (workspaceId) params.append("workspaceId", workspaceId);

      const response = await fetch(`/api/powerbi?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load report");
      }

      if (!embedRef.current) return;

      // Clean up previous embed
      if (powerbiRef.current) {
        powerbiRef.current.reset(embedRef.current);
      }

      const powerbi = new pbi.service.Service(
        pbi.factories.hpmFactory,
        pbi.factories.wpmpFactory,
        pbi.factories.routerFactory
      );
      powerbiRef.current = powerbi;

      const config: pbi.IEmbedConfiguration = {
        type: "report",
        id: data.reportId,
        embedUrl: data.embedUrl,
        accessToken: data.embedToken,
        tokenType: pbi.models.TokenType.Embed,
        settings: {
          panes: {
            filters: { visible: false },
            pageNavigation: { visible: true },
          },
          background: pbi.models.BackgroundType.Transparent,
        },
      };

      const report = powerbi.embed(embedRef.current, config);

      report.on("loaded", () => {
        attemptsRef.current = 0;
        setLoading(false);
      });

      report.on("error", () => {
        attemptsRef.current++;
        if (attemptsRef.current < maxAttempts) {
          setTimeout(() => embedReport(), 3000);
        } else {
          setError("Error loading dashboard");
          setLoading(false);
        }
      });
    } catch (err) {
      attemptsRef.current++;
      if (attemptsRef.current < maxAttempts) {
        setTimeout(() => embedReport(), 3000);
      } else {
        setError("Failed to connect to Power BI");
        setLoading(false);
      }
    }
  }, [reportId, workspaceId]);

  useEffect(() => {
    attemptsRef.current = 0;
    embedReport();
  }, [embedReport]);

  return (
    <div className="w-full h-full relative">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAFA]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#00AFAD] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAFA]">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              onClick={() => {
                attemptsRef.current = 0;
                embedReport();
              }}
              className="px-4 py-2 text-sm bg-[#00AFAD] text-white rounded-md hover:bg-[#009490] transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <div ref={embedRef} className="w-full h-full min-h-[600px]" />
    </div>
  );
}