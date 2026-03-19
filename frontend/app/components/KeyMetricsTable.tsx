"use client";

import { useState } from "react";
import { BrandKey, BRAND_ORDER } from "../../lib/types";
import { fmtAmt } from "../../lib/utils";
import { ArrowDownIcon, ArrowUpIcon, ChevronDownIcon, ChevronRightIcon } from "./Icons";

interface Props {
  inboundPrev: Record<string, number>;
  inboundCurr: Record<string, number>;
  retailPrev: Record<string, number>;
  retailCurr: Record<string, number>;
  stockPrev: Record<string, number>;
  stockCurr: Record<string, number>;
}

function fmtPct(value: number): string {
  return `${value.toFixed(0)}%`;
}

function calcYoyPct(prev: number, curr: number): number | null {
  if (prev === 0) return null;
  return (curr / prev) * 100;
}

interface MetricSectionProps {
  label: string;
  prev: Record<string, number>;
  curr: Record<string, number>;
}

function MetricSection({ label, prev, curr }: MetricSectionProps) {
  const [open, setOpen] = useState(false);

  const totalPrev = BRAND_ORDER.reduce((s, b) => s + (prev[b] ?? 0), 0);
  const totalCurr = BRAND_ORDER.reduce((s, b) => s + (curr[b] ?? 0), 0);
  const totalYoyAmt = totalCurr - totalPrev;
  const totalYoyPct = calcYoyPct(totalPrev, totalCurr);

  const tdData = "px-5 py-2.5 text-right text-sm font-medium text-slate-700 tabular-nums whitespace-nowrap";
  const tdCurr = "px-5 py-2.5 text-right text-sm font-semibold text-slate-800 tabular-nums whitespace-nowrap";

  function YoYCell({ pct }: { pct: number | null }) {
    if (pct === null) return <td className={tdData}><span className="text-slate-400">—</span></td>;
    const up = pct >= 100;
    return (
      <td className={`${tdData} text-center`}>
        <span className={`inline-flex h-7 min-w-[2.5rem] items-center justify-center gap-0.5 rounded-full px-2 text-xs font-semibold tabular-nums ${
          up ? "bg-emerald-500/15 text-emerald-700" : "bg-red-500/15 text-red-600"
        }`}>
          {up ? <ArrowUpIcon className="h-3 w-3" /> : <ArrowDownIcon className="h-3 w-3" />}
          {fmtPct(pct)}
        </span>
      </td>
    );
  }

  return (
    <>
      {/* 지표 합계 행 */}
      <tr
        className="cursor-pointer bg-slate-100/70 hover:bg-slate-100 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="whitespace-nowrap rounded-l px-5 py-2.5 text-sm font-medium text-slate-700">
          <div className="inline-flex items-center gap-1.5">
            {open
              ? <ChevronDownIcon className="h-3.5 w-3.5 text-slate-500" />
              : <ChevronRightIcon className="h-3.5 w-3.5 text-slate-500" />}
            {label}
          </div>
        </td>
        <td className={tdData}>{fmtAmt(totalPrev)}</td>
        <td className={tdCurr}>{fmtAmt(totalCurr)}</td>
        <td className={`${tdData} ${totalYoyAmt >= 0 ? "text-emerald-600" : "text-red-500"}`}>
          {totalYoyAmt >= 0 ? "+" : ""}{fmtAmt(totalYoyAmt)}
        </td>
        <YoYCell pct={totalYoyPct} />
      </tr>

      {/* 브랜드별 하위 행 */}
      {open && BRAND_ORDER.map((brand) => {
        const p = prev[brand] ?? 0;
        const c = curr[brand] ?? 0;
        const amt = c - p;
        const pct = calcYoyPct(p, c);
        return (
          <tr key={brand} className="bg-white hover:bg-slate-50/60 transition-colors">
            <td className="whitespace-nowrap pl-8 pr-5 py-2.5 text-sm font-medium text-slate-700">
              {brand}
            </td>
            <td className={tdData}>{fmtAmt(p)}</td>
            <td className={tdCurr}>{fmtAmt(c)}</td>
            <td className={`${tdData} ${amt >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {amt >= 0 ? "+" : ""}{fmtAmt(amt)}
            </td>
            <YoYCell pct={pct} />
          </tr>
        );
      })}
    </>
  );
}

export default function KeyMetricsTable({
  inboundPrev, inboundCurr,
  retailPrev, retailCurr,
  stockPrev, stockCurr,
}: Props) {
  const thClass = "px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-slate-500 whitespace-nowrap border-b border-slate-200/60 bg-slate-100/80";

  return (
    <div className="mb-6 inline-block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
      <div className="bg-[#1e3a5f] px-5 py-3">
        <h3 className="text-sm font-bold tracking-tight text-white">
          대리상 주요지표
        </h3>
      </div>
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            <th className={`${thClass} text-left`}>지표</th>
            <th className={`${thClass} text-center`}>전년</th>
            <th className={`${thClass} text-center`}>당년 Rolling</th>
            <th className={`${thClass} text-center`}>YoY (금액)</th>
            <th className={`${thClass} text-center`}>YoY (%)</th>
          </tr>
        </thead>
        <tbody>
          <MetricSection label="입고" prev={inboundPrev} curr={inboundCurr} />
          <MetricSection label="리테일 판매" prev={retailPrev} curr={retailCurr} />
          <MetricSection label="기말재고" prev={stockPrev} curr={stockCurr} />
        </tbody>
      </table>
    </div>
  );
}
