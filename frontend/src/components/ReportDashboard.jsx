import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ExternalLink,
  Sparkles,
  Globe2,
  Bot,
  Layers3,
  ClipboardList,
  Lightbulb,
  Info,
  Target,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { swotAnalysis, gapsAnalysis, detailsAnalysis } from "../lib/api";

export default function ReportDashboard({
  result,
  theme,
  onBack,
}) {
  const primary = theme?.primaryDark || "#4f46e5";
  const [activeTab, setActiveTab] = useState("features");

  const [swotData, setSwotData] = useState(null);
  const [swotLoading, setSwotLoading] = useState(false);
  const [swotError, setSwotError] = useState(null);

  const [gapsData, setGapsData] = useState(null);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [gapsError, setGapsError] = useState(null);

  const [detailsData, setDetailsData] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  useEffect(() => {
    if (activeTab === "gaps" && !gapsData && !gapsLoading) {
      const companyName = result?.company_name || "this company";
      const websiteUrl = result?.website_url;
      const productName = result?.product_name || "";
      const competitorRegion = result?.competitor_region || "";
      if (!websiteUrl) {
        setGapsError("Website URL not found in results.");
        return;
      }
      setGapsLoading(true);
      setGapsError(null);
      gapsAnalysis({
        product_name: productName,
        company_name: companyName,
        website_url: websiteUrl,
        competitor_region: competitorRegion,
      })
        .then((data) => {
          setGapsData(data);
        })
        .catch((err) => {
          setGapsError(err.message || "Failed to load Market Gaps & Insights.");
        })
        .finally(() => {
          setGapsLoading(false);
        });
    }
  }, [activeTab, gapsData, gapsLoading, result]);

  useEffect(() => {
    if (activeTab === "details" && !detailsData && !detailsLoading) {
      const companyName = result?.company_name || "this company";
      const websiteUrl = result?.website_url;
      const productName = result?.product_name || "";
      if (!websiteUrl) {
        setDetailsError("Website URL not found in results.");
        return;
      }
      setDetailsLoading(true);
      setDetailsError(null);
      detailsAnalysis({
        product_name: productName,
        company_name: companyName,
        website_url: websiteUrl,
      })
        .then((data) => {
          setDetailsData(data);
        })
        .catch((err) => {
          setDetailsError(err.message || "Failed to load Product Details.");
        })
        .finally(() => {
          setDetailsLoading(false);
        });
    }
  }, [activeTab, detailsData, detailsLoading, result]);

  useEffect(() => {
    if (activeTab === "swot" && !swotData && !swotLoading) {
      const companyName = result?.company_name || "this company";
      const websiteUrl = result?.website_url;
      if (!websiteUrl) {
        setSwotError("Website URL not found in results.");
        return;
      }
      setSwotLoading(true);
      setSwotError(null);
      swotAnalysis({ company_name: companyName, website_url: websiteUrl })
        .then((data) => {
          setSwotData(data);
        })
        .catch((err) => {
          setSwotError(err.message || "Failed to load SWOT analysis.");
        })
        .finally(() => {
          setSwotLoading(false);
        });
    }
  }, [activeTab, swotData, swotLoading, result]);

  const analysis = result?.analysis || {};
  const discovery = result?.competitor_discovery || {};
  const insights = result?.market_insights || {};
  const competitors =
    discovery?.discovered_competitors ||
    discovery?.result?.discovered_competitors ||
    discovery?.competitors ||
    discovery?.result?.competitors ||
    [];

  const discoveryCount = competitors.length;

  const tabs = [
    { id: "features", label: "Product Features & Target Customers", icon: Bot },
    { id: "competitors", label: "Competitors", icon: Layers3, badge: discoveryCount },
    { id: "swot", label: "SWOT Analysis", icon: ClipboardList },
    { id: "gaps", label: "Market Gaps & Insights", icon: Lightbulb },
    { id: "details", label: "Product Details", icon: Info },
  ];

  return (
    <div
      className="min-h-screen bg-slate-50/80 text-slate-900"
      style={{
        backgroundImage:
          "radial-gradient(circle at top left, rgba(99,102,241,0.08), transparent 30%), radial-gradient(circle at top right, rgba(14,165,233,0.06), transparent 26%), linear-gradient(180deg, rgba(248,250,252,1), rgba(248,250,252,0.92))",
      }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">

        {/* Top Block: Header & Overview */}
        <header className="overflow-hidden rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-indigo-700">
                <Sparkles className="h-3.5 w-3.5" />
                CompeteIntel analysis
              </div>

              <div>
                <h1
                  className="text-3xl font-extrabold tracking-tight sm:text-4xl"
                  style={{ color: primary }}
                >
                  Intelligence Dashboard
                </h1>
                {result?.company_name && (
                  <p className="mt-1 text-base font-bold text-slate-600">
                    {result.company_name}
                  </p>
                )}
                <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-xl">
                  Market analysis and discovered competitors for your product. Navigate through the tabs below to explore different intelligence signals.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onBack}
                  className="inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] hover:shadow-indigo-500/20"
                  style={{ background: `linear-gradient(135deg, ${primary}, #7c3aed)` }}
                >
                  <ChevronLeft size={16} />
                  New Search
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:w-1/2">
              <MetricCard label="Product" value={result?.product_name || "—"} icon={Bot} tint="#eef2ff" />
              <MetricCard label="Region" value={result?.competitor_region || "—"} icon={Globe2} tint="#ecfeff" />
              <MetricCard label="Competitors Found" value={String(discoveryCount)} icon={Layers3} tint="#f5f3ff" />
              <MetricCard label="Category" value={analysis?.category || "—"} icon={Layers3} tint="#fdf2f8" />
            </div>
          </div>
        </header>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar scroll-smooth gap-2 pb-px" style={{ scrollbarWidth: 'none' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold whitespace-nowrap transition-all duration-200 ${active
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
              >
                <Icon className={`h-4.5 w-4.5 ${active ? "text-indigo-600" : "text-slate-400"}`} />
                {tab.label}
                {tab.badge !== undefined && (
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${active ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"
                    }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <main className="w-full mt-2">

          {/* Tab 1: Product Features & Target Customers */}
          {activeTab === "features" && (
            <div className="grid gap-6 md:grid-cols-3">
              <ListBlock title="Target Customers" items={analysis?.target_users} />
              <ListBlock title="Pricing Observations" items={analysis?.pricing_observations} />
              <ListBlock title="Core Features" items={analysis?.core_features} />
            </div>
          )}

          {/* Tab 2: Competitors */}
          {activeTab === "competitors" && (
            <Panel title="Discovered Competitors" icon={Layers3}>
              {competitors.length === 0 ? (
                <EmptyState
                  title="No competitors discovered"
                  text="The pipeline did not return competitor entries for this analysis."
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {competitors.map((competitor, index) => {
                    const name =
                      competitor?.name ||
                      competitor?.company_name ||
                      `Competitor ${index + 1}`;
                    const website = competitor?.website || competitor?.url || competitor?.domain || "";

                    return (
                      <div
                        key={`${name}-${index}`}
                        className="group flex flex-col justify-between rounded-[22px] border border-slate-200 bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {name}
                              </h4>
                              <p className="text-xs font-semibold text-slate-400">
                                {competitor?.category || "Relevant Market Competitor"}
                              </p>
                            </div>
                            <ConfidenceBadge value={competitor?.confidence} />
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {competitor?.reason || "Relevant market participant identified by agent."}
                          </p>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                          {website ? (
                            <a
                              href={website.startsWith("http") ? website : `https://${website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                            >
                              Visit website
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No website listed</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          )}

          {/* Tab 3: SWOT Analysis */}
          {activeTab === "swot" && (
            <Panel title="SWOT Analysis" icon={ClipboardList}>
              {swotLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-slate-500">
                  <Loader2 className="mb-4 h-8 w-8 animate-spin text-indigo-600" />
                  Generating SWOT analysis for {result?.company_name || "this company"}...
                </div>
              ) : swotError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {swotError}
                </div>
              ) : swotData ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <MiniCard title="Strengths" items={swotData.strengths} tone="emerald" />
                  <MiniCard title="Weaknesses" items={swotData.weaknesses} tone="rose" />
                  <MiniCard title="Opportunities" items={swotData.opportunities} tone="sky" />
                  <MiniCard title="Threats" items={swotData.threats} tone="amber" />
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No SWOT data available.
                </div>
              )}
            </Panel>
          )}

          {/* Tab 4: Market Gaps & Insights */}
          {activeTab === "gaps" && (
            <Panel title="Market Gaps & Insights" icon={Lightbulb}>
              {gapsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-slate-500">
                  <Loader2 className="mb-4 h-8 w-8 animate-spin text-indigo-600" />
                  Generating Market Gaps & Insights for {result?.company_name || "this company"}...
                </div>
              ) : gapsError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {gapsError}
                </div>
              ) : gapsData ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <BulletListBlock title="Market Gaps" items={gapsData.market_gaps} highlight />
                  <BulletListBlock title="Strategic Insights" items={gapsData.insights} />
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No Market Gaps & Insights data available.
                </div>
              )}
            </Panel>
          )}

          {/* Tab 5: Product Details */}
          {activeTab === "details" && (
            <Panel title="Product Details" icon={Info}>
              {detailsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-slate-500">
                  <Loader2 className="mb-4 h-8 w-8 animate-spin text-indigo-600" />
                  Generating Product Details for {result?.company_name || "this company"}...
                </div>
              ) : detailsError ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {detailsError}
                </div>
              ) : detailsData ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <TextBlock
                    title="Product value proposition"
                    text={detailsData.value_proposition}
                    icon={Target}
                  />
                  <TextBlock
                    title="Competitive edge"
                    text={detailsData.competitive_edge}
                    icon={Info}
                  />
                  <TextBlock
                    title="Strategic positioning"
                    text={detailsData.strategic_positioning}
                    icon={ShieldAlert}
                  />
                  <TextBlock
                    title="Market summary"
                    text={detailsData.executive_summary}
                    icon={Info}
                  />
                </div>
              ) : (
                <div className="text-center py-10 text-slate-400 text-sm">
                  No Product Details available.
                </div>
              )}
            </Panel>
          )}

          {/* Tab 6: Market Insights */}
          {activeTab === "insights" && (
            <Panel title="Market Insights" icon={ShieldAlert}>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <TextBlock
                    title="Competitive positioning"
                    text={insights?.competitive_positioning || "No competitive positioning found in the output."}
                    icon={Info}
                    compact
                  />
                  <TextBlock
                    title="Recommended positioning"
                    text={insights?.recommended_positioning || "No recommended positioning found in the output."}
                    icon={Target}
                    compact
                  />
                </div>
                <ListBlock title="Recommended next steps" items={insights?.recommended_next_steps} highlight />
              </div>
            </Panel>
          )}

        </main>

      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="rounded-[30px] border border-white/80 bg-white/95 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:p-6">
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

function ListBlock({ title, items, highlight = false, compact = false }) {
  const list = toArray(items);

  return (
    <div
      className={`rounded-[20px] border p-4 ${highlight ? "border-indigo-100 bg-indigo-50/50" : "border-slate-200 bg-white"
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

function BulletListBlock({ title, items, highlight = false }) {
  const list = toArray(items);

  return (
    <div
      className={`rounded-[20px] border p-5 ${
        highlight ? "border-indigo-50/50 bg-indigo-50/20" : "border-slate-200 bg-white"
      }`}
    >
      <h4 className="text-sm font-bold text-slate-900 mb-4">{title}</h4>
      {list.length === 0 ? (
        <p className="text-sm text-slate-400">No items available.</p>
      ) : (
        <ul className="space-y-3.5">
          {list.map((item, idx) => (
            <li key={`${title}-${idx}`} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
              <span className="mt-1.5 flex h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
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
      className={`inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 ${compact ? "" : "shadow-sm"
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

function TextBlock({ title, text, icon: Icon, compact = false, muted = false }) {
  const body = text && String(text).trim();
  return (
    <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm h-full flex flex-col justify-start">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-indigo-600" /> : null}
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      </div>
      <p
        className={`mt-3 ${compact ? "text-sm leading-6" : "text-[14px] leading-7"
          } ${muted ? "text-slate-400" : "text-slate-600"} flex-grow`}
      >
        {body || "No content available."}
      </p>
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
