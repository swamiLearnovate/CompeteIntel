import React from "react";
import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Mail, Lock } from "lucide-react";

export default function HomePage({ theme, cardStyle, onStart }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-6 py-6 lg:px-14">
      <div className="mb-6 flex items-center justify-between">
        <div className="rounded-full px-5 py-2 text-sm font-medium tracking-wide shadow-sm"
          style={{ background: "rgba(165, 122, 223, 0.12)", color: theme.primaryDark }}>
          CompeteIntel Analytics Platform
        </div>
        <button
          onClick={onStart}
          className="hidden items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 md:flex"
          style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 100%)` }}
        >
          Start Analysis <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid flex-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-3xl">
          <h1
            className="text-4xl font-extrabold leading-[1.12] tracking-tight md:text-5xl lg:text-[3.0rem]"
            style={{ color: theme.primaryDark }}
          >
            CompeteIntel Market
            <br />
            Intelligence Dashboard
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 md:text-xl" style={{ color: theme.muted }}>
            Discover competitors, analyze pricing signals, and generate practical market insights
            with a clean, modern intelligence workflow.
          </p>

          <div className="mt-8 flex flex-wrap gap-6 text-[15px] font-semibold" style={{ color: theme.text }}>
            <FeatureChip icon={<BarChart3 size={16} />} label="Real-Time Insights" />
            <FeatureChip icon={<ShieldCheck size={16} />} label="Secure Analysis" />
            <FeatureChip icon={<Sparkles size={16} />} label="Actionable Reports" />
          </div>

          <div className="mt-10 flex gap-4">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 rounded-2xl px-7 py-4 text-base font-semibold text-white shadow-xl transition hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${theme.primaryDark} 0%, ${theme.primary} 55%, ${theme.accent} 100%)` }}
            >
              Go to Input Page <ArrowRight size={18} />
            </button>
          </div>

          <div className="mt-14 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard value="01" label="Enter product details" theme={theme} />
            <StatCard value="02" label="Run competitor analysis" theme={theme} />
            <StatCard value="03" label="Review dashboard output" theme={theme} />
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div
            className="w-full max-w-[620px] rounded-[34px] p-6 md:p-10"
            style={cardStyle}
          >
            <div className="flex justify-center">
              <div
                className="flex h-24 w-24 items-center justify-center rounded-[28px] text-white shadow-lg"
                style={{ background: `linear-gradient(135deg, ${theme.primaryDark}, ${theme.primary})` }}
              >
                <BarChart3 size={42} />
              </div>
            </div>

            <div className="mt-8 text-center">
              <h2 className="text-4xl font-bold tracking-tight" style={{ color: theme.text }}>
                Welcome Back
              </h2>
              <p className="mt-3 text-lg" style={{ color: theme.muted }}>
                Continue to the analysis workspace
              </p>
            </div>

            <div className="mt-10 space-y-6">
              <ReadOnlyField icon={<Mail size={19} />} placeholder="Email Address*" />
              <ReadOnlyField icon={<Lock size={19} />} placeholder="Password*" />

              <div className="flex items-center gap-3 text-base" style={{ color: theme.muted }}>
                <input type="checkbox" className="h-5 w-5 rounded border-2 border-slate-400" />
                <span>Trust this device for 30 days</span>
              </div>

              <button
                onClick={onStart}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-lg font-semibold text-white shadow-xl transition hover:opacity-95"
                style={{ background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 100%)` }}
              >
                <ArrowRight size={18} /> ENTER DASHBOARD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureChip({ icon, label }) {
  return (
    <div className="inline-flex items-center gap-2">
      <span style={{ color: "#6d3fb3" }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function StatCard({ value, label, theme }) {
  return (
    <div className="rounded-3xl border bg-white px-5 py-5 shadow-sm" style={{ borderColor: "rgba(109, 63, 179, 0.1)" }}>
      <div className="text-3xl font-bold" style={{ color: theme.primaryDark }}>
        {value}
      </div>
      <div className="mt-2 text-sm leading-6" style={{ color: theme.muted }}>
        {label}
      </div>
    </div>
  );
}

function ReadOnlyField({ icon, placeholder }) {
  return (
    <div className="flex items-center rounded-xl border bg-white px-4 py-4 shadow-sm" style={{ borderColor: "rgba(109, 63, 179, 0.18)" }}>
      <input
        readOnly
        placeholder={placeholder}
        className="w-full bg-transparent text-lg outline-none placeholder:text-slate-400"
      />
      <span className="ml-3 text-slate-800">{icon}</span>
    </div>
  );
}
