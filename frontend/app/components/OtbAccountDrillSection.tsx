"use client";

import { useState } from "react";
import { OtbRow, OtbCategory, OtbSubCategory } from "../../lib/types";
import { ChevronDownIcon, ChevronRightIcon } from "./Icons";
import { fmtAmt } from "../../lib/utils";

function sumMonths(months: Record<string, number>): number {
  return Object.values(months).reduce((a, b) => a + b, 0);
}

// ─────────────────────────────────────────────
// 중분류 행 (leaf)
// ─────────────────────────────────────────────
function SubCategoryTr({ sub, depth }: { sub: OtbSubCategory; depth: number }) {
  const indent = depth * 20;
  const total = sumMonths(sub.months);
  return (
    <tr className="bg-slate-50/40">
      <td className="sticky left-0 z-10 min-w-[240px] border-b border-stone-100 bg-slate-50/40 px-6 py-2 text-sm">
        <div
          className="flex items-center gap-1 text-slate-500"
          style={{ paddingLeft: `${indent}px` }}
        >
          <span className="mr-1 text-slate-300 select-none">└</span>
          <span className="text-[12px]">{sub.중분류}</span>
        </div>
      </td>
      <td className="whitespace-nowrap border-b border-stone-100 bg-slate-100/40 px-3 py-2 text-right text-[12px] text-slate-500 tabular-nums">
        {fmtAmt(total)}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────
// 대분류 행 (접기/펴기)
// ─────────────────────────────────────────────
function CategorySection({ cat, depth }: { cat: OtbCategory; depth: number }) {
  const [open, setOpen] = useState(false);
  const indent = depth * 20;
  const catTotal = cat.subcategories.reduce((s, sub) => s + sumMonths(sub.months), 0);

  return (
    <>
      <tr
        className="cursor-pointer bg-slate-100/60 hover:brightness-[0.97]"
        onClick={() => setOpen((v) => !v)}
      >
        <td className="sticky left-0 z-10 min-w-[240px] border-b border-stone-200 bg-slate-100/60 px-6 py-2.5 text-sm font-medium text-slate-600">
          <div
            className="inline-flex items-center gap-1"
            style={{ paddingLeft: `${indent}px` }}
          >
            {open ? (
              <ChevronDownIcon className="h-3.5 w-3.5 text-slate-500" />
            ) : (
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-500" />
            )}
            <span>{cat.대분류}</span>
            <span className="ml-1 text-[11px] font-normal text-slate-400">
              ({cat.subcategories.length})
            </span>
          </div>
        </td>
        <td className="whitespace-nowrap border-b border-stone-200 bg-slate-200/40 px-3 py-2.5 text-right text-[12px] font-semibold text-slate-700 tabular-nums">
          {fmtAmt(catTotal)}
        </td>
      </tr>

      {open &&
        cat.subcategories.map((sub) => (
          <SubCategoryTr key={sub.중분류} sub={sub} depth={depth + 1} />
        ))}
    </>
  );
}

// ─────────────────────────────────────────────
// 대리상 행 (접기/펴기 → 대분류/중분류)
// ─────────────────────────────────────────────
interface Props {
  acc: OtbRow;
  idx: number;
}

export default function OtbAccountDrillSection({ acc, idx }: Props) {
  const [open, setOpen] = useState(false);
  const hasCategories = acc.categories && acc.categories.length > 0;

  const rowBg = idx % 2 === 0 ? "bg-white" : "bg-stone-50/80";
  const hoverBg = "group-hover:bg-sky-50/60";

  return (
    <>
      <tr
        className={`group transition-colors ${rowBg} ${hasCategories ? "cursor-pointer" : ""}`}
        onClick={hasCategories ? () => setOpen((v) => !v) : undefined}
      >
        <td
          className={`sticky left-0 z-10 min-w-[240px] border-b border-stone-200 px-6 py-3 text-sm transition-colors ${rowBg} ${hoverBg}`}
        >
          <div className="inline-flex items-center gap-1.5 font-medium text-slate-800 leading-tight">
            {hasCategories && (
              open ? (
                <ChevronDownIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              )
            )}
            <span className="truncate">{acc.account_nm}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400 pl-5">
            <span>{acc.account_id}</span>
          </div>
        </td>

        <td className={`whitespace-nowrap border-b border-stone-200 bg-slate-50/60 px-3 py-3 text-right text-sm font-semibold text-slate-700 tabular-nums ${hoverBg}`}>
          {fmtAmt(
            (acc.categories ?? []).reduce(
              (s, cat) => s + cat.subcategories.reduce((ss, sub) => ss + sumMonths(sub.months), 0),
              0
            )
          )}
        </td>
      </tr>

      {open &&
        acc.categories.map((cat) => (
          <CategorySection key={cat.대분류} cat={cat} depth={1} />
        ))}
    </>
  );
}
