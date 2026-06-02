import React, { useState } from "react";
import { ChevronLeft, Sparkles, Building2, Globe, MapPin, NotebookPen, ArrowRight, SearchIcon, NotebookIcon } from "lucide-react";

export default function InputPage({ theme, cardStyle, onBack, onSubmit }) {
  const [form, setForm] = useState({
    product_name: "Flexible Ducts with Insulation",
    company_name: "Air Q Aircon",
    website_url: "https://airqaircon.com/services/",
    competitor_region: "South India",
    extra_context: "Focus only on Flexible Ducts with Insulation",
  });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] px-6 py-6 lg:px-14">
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:translate-x-[-1px]"
          style={{ background: theme.soft, color: theme.primaryDark }}
        >
          <ChevronLeft size={16} /> Back to Home
        </button>
        <div className="rounded-full px-5 py-2 text-sm font-medium shadow-sm" style={{ background: "rgba(165, 122, 223, 0.12)", color: theme.primaryDark }}>
          Competitor Discovery Workspace
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
        <section className="space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-3xl" style={{ color: theme.primaryDark }}>
              Enter product details to begin analysis
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-7" style={{ color: theme.muted }}>
              Enter the product details to be analysed
            </p>
          </div>

          <div
            className="w-full rounded-[34px] p-6 md:p-5 shadow-lg"
            style={cardStyle}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[22px] text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})` }}
              >
                <NotebookPen size={20} />
              </div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight" style={{ color: theme.text }}>
                  Analysis Input
                </h2>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
              <TextInput label="Product name" icon={<Sparkles size={18} />} value={form.product_name} onChange={(v) => setField("product_name", v)} placeholder="e.g. AI market intelligence platform" />
              <TextInput label="Company name" icon={<Building2 size={18} />} value={form.company_name} onChange={(v) => setField("company_name", v)} placeholder="e.g. CompeteIntel" />
              <TextInput label="Website URL" icon={<Globe size={18} />} value={form.website_url} onChange={(v) => setField("website_url", v)} placeholder="https://yourdomain.com" />
              <TextInput label="Competitor region" icon={<MapPin size={18} />} value={form.competitor_region} onChange={(v) => setField("competitor_region", v)} placeholder="India" />
              <div className="md:col-span-2">
                <TextArea label="Extra context" icon={<NotebookPen size={18} />} value={form.extra_context} onChange={(v) => setField("extra_context", v)} placeholder="Add anything important about the product, target audience, or market..."/>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => onSubmit(form)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-semibold text-white shadow-xl transition hover:opacity-95 hover:scale-[1.01] active:scale-[0.99]"
                style={{ background: `linear-gradient(135deg, ${theme.primaryDark} 0%, ${theme.primary} 55%, ${theme.accent} 100%)` }}
              >
                Run Analysis <ArrowRight size={18} />
              </button>
              <button
                onClick={onBack}
                className="rounded-2xl border px-6 py-4 text-base font-semibold transition hover:bg-slate-50 hover:scale-[1.01] active:scale-[0.99]"
                style={{ borderColor: "rgba(109, 63, 179, 0.18)", color: theme.primaryDark }}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col space-y-6 lg:pl-6">
          <div className="rounded-[34px] border bg-white/40 p-6 md:p-8 backdrop-blur-sm shadow-sm" style={{ borderColor: "rgba(109, 63, 179, 0.08)" }}>
            <h2 className="text-xl font-bold tracking-tight mb-3" style={{ color: theme.primaryDark }}>
              Analysis Guidelines
            </h2>
            <p className="text-sm leading-6 mb-6" style={{ color: theme.muted }}>
              Providing detailed inputs ensures the model searches for highly relevant competitor profiles and pricing points.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoCard
                title="Product name"
                text="Name of the product you want to analyze"
                icon={<Sparkles size={16} />}
                theme={theme}
              />
              <InfoCard
                title="Company"
                text="Your business name"
                icon={<Building2 size={16} />}
                theme={theme}
              />
              
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <InfoCard
                title="Competitor region"
                text="Target market area"
                icon={<MapPin size={16} />}
                theme={theme}
              />
              <InfoCard
                title="Website URL"
                text="Your company URL"
                icon={<Globe size={16} />}
                theme={theme}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
              <InfoCard
                title="Extra Content"
                text="Provide any specific context or focus areas for the analysis to improve relevance"
                icon={<NotebookPen size={16} />}
                theme={theme}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoCard({ title, text, icon, theme }) {
  return (
    <div className="rounded-3xl border bg-white/90 p-5 shadow-sm transition hover:shadow-md hover:bg-white/95" style={{ borderColor: "rgba(109, 63, 179, 0.1)" }}>
      <div className="flex items-center gap-2.5 text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: theme.primaryDark }}>
        {icon && <span style={{ color: theme.primary }}>{icon}</span>}
        <span>{title}</span>
      </div>
      <div className="mt-2 text-base leading-7" style={{ color: theme.muted }}>
        {text}
      </div>
    </div>
  );
}

function TextInput({ label, icon, value, onChange, placeholder }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: themeColor() }}>
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center rounded-2xl border bg-white px-4 py-4 shadow-sm" style={{ borderColor: "rgba(109, 63, 179, 0.18)" }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
        />
      </div>
    </label>
  );
}

function TextArea({ label, icon, value, onChange, placeholder }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: themeColor() }}>
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="rounded-2xl border bg-white px-4 py-4 shadow-sm" style={{ borderColor: "rgba(109, 63, 179, 0.18)" }}>
        <textarea
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent text-base outline-none placeholder:text-slate-400"
        />
      </div>
    </label>
  );
}

function themeColor() {
  return "#4f2d88";
}
