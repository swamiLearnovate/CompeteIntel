import { Search, Globe, Building2, MapPinned, FileText } from 'lucide-react'

function Field({ label, icon, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-200">
        {icon}
        {label}
      </span>
      {children}
      {hint ? <span className="mt-2 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}

export default function AnalysisForm({
  values,
  onChange,
  onSubmit,
  loading,
}) {
  const handleInput = (field) => (event) => {
    onChange(field, event.target.value)
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur">
      <div className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-300">CompeteIntel</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">
          Competitive intelligence, separated cleanly
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Analyze a product website, discover competitors, and inspect the market view through a
          dedicated FastAPI backend.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2">
        <Field
          label="Product / Service Name"
          icon={<Search className="h-4 w-4 text-sky-300" />}
          hint="The product or service you want to analyze."
        >
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            value={values.product_name}
            onChange={handleInput('product_name')}
            placeholder="Flexible Ducts with Insulation"
            required
          />
        </Field>

        <Field
          label="Company Name (Optional)"
          icon={<Building2 className="h-4 w-4 text-sky-300" />}
          hint="Your company name can help exclude your own brand from results."
        >
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            value={values.company_name}
            onChange={handleInput('company_name')}
            placeholder="Acme Air Solutions"
          />
        </Field>

        <Field
          label="Website URL"
          icon={<Globe className="h-4 w-4 text-sky-300" />}
          hint="The page that describes the product or service."
        >
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            value={values.website_url}
            onChange={handleInput('website_url')}
            placeholder="https://example.com/product"
            required
            type="url"
          />
        </Field>

        <Field
          label="Competitor Region"
          icon={<MapPinned className="h-4 w-4 text-sky-300" />}
          hint="For example: Chennai, India or North America."
        >
          <input
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            value={values.competitor_region}
            onChange={handleInput('competitor_region')}
            placeholder="India"
            required
          />
        </Field>

        <div className="md:col-span-2">
          <Field
            label="Extra Context"
            icon={<FileText className="h-4 w-4 text-sky-300" />}
            hint="Optional notes to guide the analysis."
          >
            <textarea
              className="min-h-32 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
              value={values.extra_context}
              onChange={handleInput('extra_context')}
              placeholder="Any special focus, competitors to ignore, or market details..."
            />
          </Field>
        </div>

        <div className="md:col-span-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Backend endpoint: <span className="text-slate-200">http://localhost:8000</span>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>
      </form>
    </section>
  )
}
