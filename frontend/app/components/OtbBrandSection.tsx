"use client";

import { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "./Icons";
import { OtbRow, BrandKey, BRAND_COLOR } from "../../lib/types";
import { fmtAmt } from "../../lib/utils";
import OtbAccountDrillSection from "./OtbAccountDrillSection";

export function rowTotal(acc: OtbRow): number {
  return (acc.categories ?? []).reduce(
    (s, cat) =>
      s + cat.subcategories.reduce((ss, sub) => ss + Object.values(sub.months).reduce((a, b) => a + b, 0), 0),
    0
  );
}

interface Props {
  brand: BrandKey;
  accounts: OtbRow[];
  defaultOpen?: boolean;
}

export default function OtbBrandSection({ brand, accounts, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const brandTotal = accounts.reduce((s, a) => s + rowTotal(a), 0);
  const colorClass = BRAND_COLOR[brand];

  return (
    <tbody>
      {/* 브랜드 헤더 행 */}
      <tr
        className="cursor-pointer select-none transition-[filter,transform] duration-200 hover:brightness-[1.04]"
        onClick={() => setOpen((v) => !v)}
      >
        <td
          className={`${colorClass} sticky left-0 z-10 whitespace-nowrap border-b border-white/40 px-6 py-4 text-sm font-semibold text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]`}
        >
          <div className="inline-flex items-center gap-1.5">
            {brand}
            {open ? (
              <ChevronDownIcon className="h-4 w-4 text-slate-600/90" />
            ) : (
              <ChevronRightIcon className="h-4 w-4 text-slate-600/90" />
            )}
            <span className="ml-1 rounded-full bg-white/55 px-2 py-0.5 text-[11px] font-normal text-slate-500">
              ({accounts.length}개 계정)
            </span>
          </div>
        </td>
        <td
          className={`${colorClass} whitespace-nowrap border-b border-white/40 px-3 py-4 text-right text-sm font-bold text-slate-800 tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]`}
        >
          {fmtAmt(brandTotal)}
        </td>
      </tr>

      {/* 대리상 행 */}
      {open &&
        accounts.map((acc, idx) => (
          <OtbAccountDrillSection key={acc.account_id} acc={acc} idx={idx} />
        ))}
    </tbody>
  );
}
