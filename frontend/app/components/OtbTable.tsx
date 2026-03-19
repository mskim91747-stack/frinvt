"use client";

import { OtbData, BRAND_ORDER } from "../../lib/types";
import { fmtAmt } from "../../lib/utils";
import OtbBrandSection, { rowTotal } from "./OtbBrandSection";

interface Props {
  data: OtbData;
}

export default function OtbTable({ data }: Props) {
  const allAccounts = BRAND_ORDER.flatMap((b) => data.brands[b] ?? []);
  const grandTotal = allAccounts.reduce((s, a) => s + rowTotal(a), 0);

  return (
    <div className="overflow-hidden rounded-[26px] border border-stone-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99)_0%,rgba(250,250,249,0.98)_100%)] shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-stone-100">
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-[linear-gradient(135deg,#355c8a_0%,#274a78_100%)] text-white">
              <th className="sticky left-0 z-20 min-w-[240px] whitespace-nowrap border-b border-blue-900/30 bg-[linear-gradient(135deg,#355c8a_0%,#274a78_100%)] px-6 py-4 text-left text-sm font-semibold backdrop-blur">
                대리상 명칭
              </th>
              <th className="min-w-[120px] whitespace-nowrap border-b border-blue-900/30 bg-[linear-gradient(135deg,#2a4f7a_0%,#1e3d62_100%)] px-3 py-4 text-center text-sm font-semibold">
                주문합계 (천위안)
              </th>
            </tr>
          </thead>

          {BRAND_ORDER.map((brand) => (
            <OtbBrandSection
              key={brand}
              brand={brand}
              accounts={data.brands[brand] ?? []}
              defaultOpen={false}
            />
          ))}

          <tfoot>
            <tr className="bg-[linear-gradient(135deg,#4a6f99_0%,#355c8a_100%)] text-white">
              <td className="sticky left-0 z-10 whitespace-nowrap border-t border-white/10 bg-[linear-gradient(135deg,#4a6f99_0%,#355c8a_100%)] px-6 py-4 text-sm font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                전체 합계
              </td>
              <td className="whitespace-nowrap border-t border-white/10 bg-[linear-gradient(135deg,#3a5f8a_0%,#2a4f7a_100%)] px-3 py-4 text-right text-sm font-bold tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {fmtAmt(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
