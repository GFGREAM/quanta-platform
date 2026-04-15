"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type * as pbi from "powerbi-client";

export interface PowerBIFilter {
  $schema: string;
  target: { table: string; column: string };
  operator: string;
  values: (string | number)[];
}

interface PowerBIEmbedProps {
  reportId: string;
  workspaceId?: string;
  filters?: PowerBIFilter[];
}

const DEFAULT_ASPECT_RATIO = 16 / 9;

export default function PowerBIEmbed({ reportId, workspaceId, filters }: PowerBIEmbedProps) {
  const embedRef = useRef<HTMLDivElement>(null);
  const powerbiRef = useRef<pbi.service.Service | null>(null);
  const reportRef = useRef<pbi.Report | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

      if (powerbiRef.current) {
        powerbiRef.current.reset(embedRef.current);
      }

      const pbiModule = await import("powerbi-client");

      const powerbi = new pbiModule.service.Service(
        pbiModule.factories.hpmFactory,
        pbiModule.factories.wpmpFactory,
        pbiModule.factories.routerFactory
      );
      powerbiRef.current = powerbi;

      const config: pbi.IEmbedConfiguration = {
        type: "report",
        id: data.reportId,
        embedUrl: data.embedUrl,
        accessToken: data.embedToken,
        tokenType: pbiModule.models.TokenType.Embed,
        settings: {
          panes: {
            filters: { visible: false },
            pageNavigation: { visible: false },
          },
          bars: {
            statusBar: { visible: false },
            actionBar: { visible: false },
          },
          background: 1,
          layoutType: 3,
        },
      };

      const report = powerbi.embed(embedRef.current, config) as pbi.Report;
      reportRef.current = report;

      report.on("loaded", () => {
        attemptsRef.current = 0;
        setLoading(false);
        if (filters && filters.length > 0) {
          report.setFilters(filters as any[]).catch(() => {});
        }
      });

      report.on("rendered", async () => {
        try {
          const pages = await report.getPages();
          const activePage = pages.find((p: any) => p.isActive);
          if (activePage && (activePage as any).defaultSize) {
            const { width, height } = (activePage as any).defaultSize;
            if (width && height && containerRef.current) {
              containerRef.current.style.aspectRatio = String(width / height);
            }
          }
        } catch {}
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

  useEffect(() => {
    if (!reportRef.current || loading) return;
    if (filters && filters.length > 0) {
      reportRef.current.setFilters(filters as any[]).catch(() => {});
    } else {
      reportRef.current.removeFilters().catch(() => {});
    }
  }, [filters, loading]);

  return (
    <div ref={containerRef} className="w-full relative" style={{ aspectRatio: String(DEFAULT_ASPECT_RATIO) }}>
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
      <div ref={embedRef} className="w-full h-full" />
    </div>
  );
}
