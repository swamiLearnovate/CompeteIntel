import React, { useState, useRef } from "react";
import {
  ChevronLeft,
  ExternalLink,
  Sparkles,
  Building2,
  Globe2,
  BadgeCheck,
  Bot,
  Search,
  TrendingUp,
  Layers3,
  Target,
  ShieldAlert,
  Lightbulb,
  ClipboardList,
  FileText,
  ArrowRight,
  Info,
  Loader2,
} from "lucide-react";
import { downloadReportAsPdf } from "../utils/downloadPdf";

export default function ReportDashboard({
  result,
  selectedCompetitor,
  onSelectCompetitor,
  competitorDetails,
  competitorLoading,
  competitorError,
  theme,
  onBack,
}) {
  const primary = theme?.primaryDark || "#4f46e5";
  const [isDownloading, setIsDownloading] = useState(false);
  const reportRef = useRef(null);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const sanitizedProductName = (result?.product_name || "report")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      const fileName = `competeintel-report-${sanitizedProductName}.pdf`;
      await downloadReportAsPdf({ result, competitorDetails, theme }, fileName);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to download PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const analysis = result?.analysis || {};
  const discovery = result?.competitor_discovery || {};
  const insights = result?.market_insights || {};
  const scraped = result?.scraped_data || {};

  const competitors =
    discovery?.discovered_competitors ||
    discovery?.result?.discovered_competitors ||
    discovery?.competitors ||
    discovery?.result?.competitors ||
    [];

  const selectedCompetitorData =
    typeof selectedCompetitor === "number" && selectedCompetitor >= 0
      ? competitors[selectedCompetitor] || null
      : null;

  const discoveryCount = competitors.length;
  const featureCount = toArray(analysis?.core_features).length;
  const insightCount = toArray(insights?.recommended_next_steps).length;

  return (
    <div
      ref={reportRef}
      className="min-h-screen bg-slate-50/80 text-slate-900"
      style={{
        backgroundImage:
          "radial-gradient(circle at top left, rgba(99,102,241,0.10), transparent 28%), radial-gradient(circle at top right, rgba(14,165,233,0.08), transparent 24%), linear-gradient(180deg, rgba(248,250,252,1), rgba(248,250,252,0.92))",
      }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-indigo-700">
                  <Sparkles className="h-3.5 w-3.5" />
                  CompeteIntel report
                </div>

                <div>
                  <h1
                    className="text-2xl font-extrabold tracking-tight sm:text-3xl"
                    style={{ color: primary }}
                  >
                    Intelligence Report
                  </h1>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                    Structured output for product analysis, competitor discovery, and strategic insights.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3" data-html2canvas-ignore="true">
                  <button
                    onClick={onBack}
                    className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99]"
                    style={{ background: `linear-gradient(135deg, ${primary}, #7c3aed)` }}
                  >
                    <ChevronLeft size={16} />
                    New Analysis
                  </button>

                  <button
                    disabled={isDownloading}
                    onClick={handleDownload}
                    className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] ${
                      isDownloading ? "opacity-75 cursor-not-allowed" : ""
                    }`}
                    style={{ background: `linear-gradient(135deg, ${primary}, #7c3aed)` }}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4" />
                        Download Report
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard label="Product" value={result?.product_name || "—"} icon={Bot} tint="#eef2ff" />
                <MetricCard label="Region" value={result?.competitor_region || "—"} icon={Globe2} tint="#ecfeff" />
                <MetricCard label="Competitors" value={String(discoveryCount)} icon={Layers3} tint="#f5f3ff" />
                <MetricCard label="Category" value={analysis?.category || insights?.competitive_positioning || "—"} icon={Layers3} tint="#f5f3ff" />
              </div>
            </div>
          </div>
        </header>

        {/* Competitor list placed immediately below the Intelligence Report block */}
        <main className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
            <Panel title="Executive summary" icon={ClipboardList}>
              <div className="grid gap-4 md:grid-cols-2">
                <ListBlock title="Target customers" items={analysis?.target_users} />
                 <ListBlock title="Pricing observations" items={analysis?.pricing_observations} />
              </div>
              <div className="grid gap-4 md:grid-cols-1">
                <ListBlock title="Core features" items={analysis?.core_features} />
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <TextBlock
                  title="Product value proposition"
                  text={analysis?.value_proposition || "No value proposition found in the output."}
                  icon={Target}
                />
                <TextBlock
                  title="Competitive edge"
                  text={analysis?.competitive_edge || "No competitive edge found in the output."}
                  icon={TrendingUp}
                />
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <TextBlock
                  title="Strategic positioning"
                  text={analysis?.strategic_positioning || "No positioning statement found in the output."}
                  icon={ShieldAlert}
                />
                <TextBlock
                  title="Market summary"
                  text={insights?.executive_summary || "No executive summary found in the output."}
                  icon={Info}
                />
              </div>
            </Panel>
            <Panel title="SWOT Analysis" icon={ClipboardList}>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <MiniCard title="Strengths" items={insights?.strengths} tone="emerald" />
                <MiniCard title="Weaknesses" items={insights?.weaknesses} tone="rose" />
                <MiniCard title="Opportunities" items={insights?.opportunities} tone="sky" />
                <MiniCard title="Threats" items={insights?.threats} tone="amber" />
              </div>  
              <div className="mt-6 grid gap-4 md:grid-cols-1">
                <ListBlock title="Market gaps" items={analysis?.market_gaps} highlight />
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-1">
                <TextBlock
                  title="Notes"
                  text={joinNotes(analysis?.notes)}
                  icon={Lightbulb}
                  compact
                  muted={!joinNotes(analysis?.notes)}
                />
              </div>   
            </Panel>

        </main>




        <main className="grid gap-6 xl:grid-cols-[1.4fr_0.95fr]">
          <Panel title="Discovered competitors" icon={Layers3}>
          {competitors.length === 0 ? (
            <EmptyState
              title="No competitors discovered"
              text="The pipeline did not return competitor entries for this analysis."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {competitors.map((competitor, index) => {
                const name =
                  competitor?.name ||
                  competitor?.company_name ||
                  `Competitor ${index + 1}`;
                const website = competitor?.website || competitor?.url || competitor?.domain || "";
                const active = selectedCompetitor === index;

                return (
                  <button
                    key={`${name}-${index}`}
                    onClick={() => onSelectCompetitor(index, competitor)}
                    className={`group rounded-[22px] border p-4 text-left transition-all duration-300 ${
                      active
                        ? "border-indigo-400 bg-indigo-50/70 shadow-lg shadow-indigo-100"
                        : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{name}</p>
                          <ConfidenceBadge value={competitor?.confidence} />
                        </div>
                        <p className="text-xs text-slate-500">
                          {competitor?.category || "Competitor"} •{" "}
                          {competitor?.reason || "Relevant market participant"}
                        </p>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-400 transition group-hover:text-indigo-600">
                        <ExternalLink className="h-4 w-4" />
                      </div>
                    </div>

                    {competitor?.website ? (
                      <p className="mt-4 break-all text-xs font-medium text-indigo-600 underline decoration-indigo-200 underline-offset-4">
                        {competitor.website}
                      </p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel title="Selected competitor details" icon={Building2}>
              {!selectedCompetitorData && !competitorDetails ? (
                <EmptyState
                  title="Choose a competitor"
                  text="Select a competitor card above to see its enrichment and pricing profile here."
                  icon={<Sparkles className="h-6 w-6 text-indigo-500" />}
                />
              ) : competitorLoading ? (
                <div className="flex flex-col items-center justify-center py-10 text-sm text-slate-500">
                  <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
                  Enriching competitor details…
                </div>
              ) : competitorError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {competitorError}
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                          Competitor profile
                        </p>
                        <h4 className="mt-2 text-lg font-bold text-slate-900">
                          {selectedCompetitorData?.name || competitorDetails?.enriched_competitor?.name || "Selected competitor"}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          {selectedCompetitorData?.category || competitorDetails?.enriched_competitor?.category || "Profile details"}
                        </p>
                      </div>
                      <ConfidenceBadge
                        value={
                          selectedCompetitorData?.confidence ||
                          competitorDetails?.enriched_competitor?.confidence
                        }
                      />
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {selectedCompetitorData?.reason ||
                        competitorDetails?.enriched_competitor?.reason ||
                        "Enrichment details and pricing intelligence are shown below."}
                    </p>

                    {selectedCompetitorData?.website || competitorDetails?.enriched_competitor?.website ? (
                      <a
                        href={selectedCompetitorData?.website || competitorDetails?.enriched_competitor?.website}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        Visit website
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <CompactJsonCard
                      title="Enriched profile"
                      value={competitorDetails?.enriched_competitor || {}}
                    />
                    <CompactJsonCard
                      title="Pricing intelligence"
                      value={competitorDetails?.pricing_item || {}}
                    />
                  </div>
                </div>
              )}
            </Panel>
        </main>


        

        <main className="grid gap-6 xl:col-span-full">
          

          <div className="space-y-6">
            <Panel title="Market insights" icon={TrendingUp}>
              <div className="space-y-4">
                <TextBlock
                  title="Competitive positioning"
                  text={insights?.competitive_positioning || "No competitive positioning found in the output."}
                  icon={TrendingUp}
                  compact
                />
                <TextBlock
                  title="Recommended positioning"
                  text={insights?.recommended_positioning || "No recommended positioning found in the output."}
                  icon={Target}
                  compact
                />
              </div>

              <div className="mt-6">
                <ListBlock title="Recommended next steps" items={insights?.recommended_next_steps} highlight />
              </div>

              
            </Panel>

          </div>
        </main>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[30px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6">
      <div className="flex items-center gap-3">
        {Icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
        <div>
          <h3 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{title}</h3>
          <div className="mt-1 h-px w-16 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400" />
        </div>
      </div>

      <div className="mt-5">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, icon: Icon, tint }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-2xl"
        style={{ backgroundColor: tint || "#eef2ff" }}
      >
        <Icon className="h-4.5 w-4.5 text-indigo-600" />
      </div>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function StatChip({ label, value, accent = "indigo" }) {
  const palette = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className={`rounded-[18px] border px-4 py-3 ${palette[accent] || palette.slate}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}

function InfoCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
          <p className="mt-1 truncate text-sm font-semibold text-slate-800">{value}</p>
        </div>
      </div>
    </div>
  );
}

function TextBlock({ title, text, icon: Icon, compact = false, muted = false }) {
  const body = text && String(text).trim();
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-indigo-600" /> : null}
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      </div>
      <p
        className={`mt-3 ${
          compact ? "text-sm leading-6" : "text-[15px] leading-7"
        } ${muted ? "text-slate-400" : "text-slate-600"}`}
      >
        {body || "No content available."}
      </p>
    </div>
  );
}

function ListBlock({ title, items, highlight = false, compact = false }) {
  const list = toArray(items);

  return (
    <div
      className={`rounded-[20px] border p-4 ${
        highlight ? "border-indigo-100 bg-indigo-50/50" : "border-slate-200 bg-white"
      }`}
    >
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      {list.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No items available.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {list.map((item, idx) => (
            <Tag key={`${title}-${idx}-${item}`} text={item} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniCard({ title, items, tone = "slate" }) {
  const list = toArray(items);

  const toneMap = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-800",
    rose: "border-rose-100 bg-rose-50 text-rose-800",
    sky: "border-sky-100 bg-sky-50 text-sky-800",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className={`rounded-[20px] border p-4 ${toneMap[tone] || toneMap.slate}`}>
      <h4 className="text-sm font-bold">{title}</h4>
      <div className="mt-3 flex flex-wrap gap-2">
        {list.length > 0 ? (
          list.slice(0, 6).map((item, idx) => (
            <span
              key={`${title}-${idx}-${item}`}
              className="rounded-full border border-current/10 bg-white/80 px-3 py-1 text-xs font-medium"
            >
              {item}
            </span>
          ))
        ) : (
          <p className="text-sm text-slate-400">No items available.</p>
        )}
      </div>
    </div>
  );
}

function CompactJsonCard({ title, value }) {
  const entries = Object.entries(value || {})
    .filter(([, v]) => isSimpleValue(v))
    .slice(0, 8);

  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">No displayable fields available.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map(([key, val]) => (
            <div key={key} className="rounded-2xl bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                {formatKey(key)}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-700">{String(val)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConfidenceBadge({ value }) {
  if (!value) return null;

  const tone =
    value === "high"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : value === "medium"
      ? "bg-amber-50 text-amber-700 border-amber-100"
      : "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone}`}>
      {value}
    </span>
  );
}

function Tag({ text, compact = false }) {
  const value = String(text || "").trim();
  if (!value) return null;

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 ${
        compact ? "" : "shadow-sm"
      }`}
    >
      <span className="max-w-[240px] truncate">{value}</span>
    </span>
  );
}

function EmptyState({ title, text, icon = null }) {
  return (
    <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
      {icon || <Sparkles className="mx-auto h-7 w-7 text-indigo-500" />}
      <p className="mt-4 text-sm font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p>
    </div>
  );
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/\n|•|;/g)
      .map((item) => item.replace(/^\d+[.)\-\s]*/, "").trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
}

function joinNotes(value) {
  const items = toArray(value);
  return items.length ? items.join(" ") : "";
}

function formatKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function compactDomain(value) {
  try {
    const url = value.startsWith("http") ? value : `https://${value}`;
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

function isSimpleValue(value) {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
