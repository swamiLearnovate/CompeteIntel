import React from "react";
import { Sparkles } from "lucide-react";

export default function LoadingView({ progress, stepIndex, theme }) {
  const steps = [
    'Scraping target website',
    'Analyzing content',
    'Discovering competitors',
    'Enriching competitor data',
    'Building pricing intelligence'
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col justify-center px-6 py-6 lg:px-14 text-center">
      <div className="mb-8 flex justify-center">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-purple-100 text-purple-600 shadow-inner">
          <Sparkles className="h-10 w-10 animate-pulse text-purple-600" />
          <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 border-t-purple-600 animate-spin" />
        </div>
      </div>

      <h2 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: theme.primaryDark }}>
        Running Competitive Pipeline
      </h2>
      <p className="max-w-md mx-auto text-base mb-8" style={{ color: theme.muted }}>
        Our intelligent agent is scanning the target product, discovering its market rivals, and pulling real-time pricing intelligence.
      </p>

      {/* Progress Bar Container */}
      <div className="mb-10 max-w-xl mx-auto rounded-full bg-slate-200/60 p-1 backdrop-blur-sm border border-slate-300/30">
        <div
          className="h-4 rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-400 transition-all duration-300 shadow-md"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Steps Grid */}
      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl mx-auto">
        {steps.map((step, index) => {
          const active = index === stepIndex;
          const done = index < stepIndex;
          return (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-sm font-semibold transition-all duration-300 shadow-sm ${done
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : active
                    ? 'border-purple-300 bg-purple-50 text-purple-700 animate-pulse scale-[1.01] ring-2 ring-purple-500/10'
                    : 'border-slate-200 bg-white/60 text-slate-400'
                }`}
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done
                  ? 'bg-emerald-500 text-white'
                  : active
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                {done ? '✓' : index + 1}
              </div>
              <span className="text-left">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
