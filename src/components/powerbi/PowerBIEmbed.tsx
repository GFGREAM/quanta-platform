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
  const [permanentError, setPermanentError] = useState(false);
  const [loading, setLoading] = useState(true);
  const attemptsRef = useRef(0);
  const loadedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxAttempts = 3;

  const embedReport = useCallback(async () => {
    if (!reportId) return;

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
        },
      };

      const report = powerbi.embed(embedRef.current, config) as pbi.Report;
      reportRef.current = report;

      const clearFallback = () => {
        if (loadedTimerRef.current) {
          clearTimeout(loadedTimerRef.current);
          loadedTimerRef.current = null;
        }
      };

      const revealReport = () => {
        clearFallback();
        setLoading(false);
      };

      report.on("loaded", () => {
        attemptsRef.current = 0;
        // Start fallback timer — if "rendered" never fires, reveal after 4s
        loadedTimerRef.current = setTimeout(() => {
          console.warn("[PowerBI] Fallback: rendered event not received 4s after loaded, forcing reveal");
          revealReport();
        }, 4000);
        if (filters && filters.length > 0) {
          report.setFilters(filters as unknown as pbi.models.IFilter[]).catch(() => {});
        }
      });

      report.on("rendered", async () => {
        revealReport();
        try {
          const pages = await report.getPages();
          const activePage = pages.find((p) => p.isActive);
          if (activePage) {
            const size = (activePage as pbi.Page & { defaultSize?: { width: number; height: number } }).defaultSize;
            if (size?.width && size?.height && containerRef.current) {
              containerRef.current.style.aspectRatio = String(size.width / size.height);
            }
          }
        } catch {}
      });

      report.on("pageChanged", () => {
        revealReport();
      });

      report.on("error", (event: pbi.service.ICustomEvent<pbi.models.IError>) => {
        const errorMsg = event?.detail?.message || "";
        console.error("[PowerBI] Embed error event:", JSON.stringify(event?.detail));

        // Ignore non-fatal warnings
        if (errorMsg === "mobileLayoutError") return;

        // Only retry on actual errors
        attemptsRef.current++;
        if (attemptsRef.current < maxAttempts) {
          setTimeout(() => embedReport(), 3000);
        } else {
          setPermanentError(true);
          setError("Error loading dashboard");
          setLoading(false);
        }
      });
    } catch (err) {
      console.error("[PowerBI] embedReport catch:", err);
      attemptsRef.current++;
      if (attemptsRef.current < maxAttempts) {
        setTimeout(() => embedReport(), 3000);
      } else {
        setError("Failed to connect to Power BI");
        setPermanentError(true);
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- filters are applied in a dedicated effect below; including them here would cause the entire embed to re-initialize on every filter change
  }, [reportId, workspaceId]);

  useEffect(() => {
    if (!reportId) return;
    attemptsRef.current = 0;
    embedReport();
  }, [embedReport, reportId]);

  useEffect(() => {
    if (!reportRef.current || loading) return;
    if (filters && filters.length > 0) {
      reportRef.current.setFilters(filters as unknown as pbi.models.IFilter[]).catch(() => {});
    } else {
      reportRef.current.removeFilters().catch(() => {});
    }
  }, [filters, loading]);

  return (
    <div ref={containerRef} className="w-full relative" style={{ aspectRatio: String(DEFAULT_ASPECT_RATIO) }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAFA]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#FAFAFA]">
          <div className="flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-red-500">{error}</p>
            {!permanentError && (
              <button
                onClick={() => {
                  attemptsRef.current = 0;
                  setPermanentError(false);
                  embedReport();
                }}
                className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}
      <div ref={embedRef} className="w-full h-full" />
    </div>
  );
}
