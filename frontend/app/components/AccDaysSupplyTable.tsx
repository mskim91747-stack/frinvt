"use client";

import React, { useState } from "react";
import { BrandKey, BRAND_ORDER, MONTHS } from "../../lib/types";
import { ChevronDownIcon, ChevronRightIcon } from "./Icons";

export interface AccAccountDays {
  id: string;
  name: string;
  months: Record<number, number | null>;         // total ACC
  신발: Record<number, number | null>;
  모자: Record<number, number | null>;
  가방: Record<number, number | null>;
  기타: Record<number, number | null>;
}

export interface AccBrandDays {
  total: Record<number, number | null>;
  신발: Record<number, number | null>;
  모자: Record<number, number | null>;
  가방: Record<number, number | null>;
  기타: Record<number, number | null>;
  accounts: AccAccountDays[];
}

export type AccDaysSupplyData = Record<string, AccBrandDays>;

const BRAND_DOT: Record<BrandKey, string> = {
  MLB: "bg-blue-500",
  "MLB KIDS": "bg-amber-400",
  DISCOVERY: "bg-emerald-500",
};

const ACC_ORDER = ["신발", "모자", "가방", "기타"] as const;

type ItemKey = "total" | "신발" | "모자" | "가방" | "기타" | "account";
type ViewMode = "item" | "account";

// 아이템별 색상 기준: 초록(< green), 노랑(green ~ yellow), 빨강(> yellow)
const THRESHOLDS: Record<ItemKey, { green: number; yellow: number }> = {
  total: { green: 15, yellow: 30 },
  신발: { green: 15, yellow: 30 },
  모자: { green: 10, yellow: 20 },
  가방: { green: 10, yellow: 25 },
  기타: { green: 15, yellow: 30 },
  account: { green: 15, yellow: 30 },
};

interface Props {
  data: AccDaysSupplyData | null;
  year: string;
}

function fmtWeeks(v: number | null): string {
  if (v === null) return "—";
  return `${v.toFixed(1)}주`;
}

function cellColor(v: number | null, item: ItemKey): string {
  if (v === null) return "text-slate-300";
  const { green, yellow } = THRESHOLDS[item];
  if (v < green) return "text-emerald-600 font-semibold";
  if (v <= yellow) return "text-amber-600 font-semibold";
  return "text-red-500 font-semibold";
}

export default function AccDaysSupplyTable({ data, year }: Props) {
  const [openBrands, setOpenBrands] = useState<Record<string, boolean>>({
    MLB: false,
    "MLB KIDS": false,
    DISCOVERY: false,
  });
  const [openAccounts, setOpenAccounts] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<ViewMode>("item");

  const toggle = (brand: string) => {
    setOpenBrands((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  const toggleAccount = (key: string) => {
    setOpenAccounts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!data) {
    return (
      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 text-center text-sm text-slate-400 shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
        ACC 재고주수 데이터 없음
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
      {/* 헤더 */}
      <div className="flex items-center justify-between bg-[#1e3a5f] px-5 py-3">
        <h3 className="text-sm font-bold tracking-tight text-white">
          ACC 재고주수
        </h3>
        <div className="flex items-center gap-3">
          {/* 뷰 토글 */}
          <div className="flex overflow-hidden rounded-full bg-white/15">
            {(["item", "account"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-0.5 text-[11px] font-medium transition-colors ${
                  viewMode === mode
                    ? "bg-white text-[#1e3a5f]"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {mode === "item" ? "아이템별" : "대리상별"}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-medium text-white">
            {year}년 · 재고주수 = 당월말재고 ÷ (당월리테일 ÷ 당월일수 × 7)
          </span>
        </div>
      </div>

      {/* 범례: 아이템별 기준 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-100 bg-slate-50/70 px-5 py-1.5">
        <span className="text-[11px] text-slate-500">범례:</span>
        <span className="text-[11px] font-semibold text-emerald-600">초록 &lt;기준</span>
        <span className="text-[11px] font-semibold text-amber-600">노랑 기준~상한</span>
        <span className="text-[11px] font-semibold text-red-500">빨강 &gt;상한</span>
        <span className="text-[11px] text-slate-400">|</span>
        <span className="text-[11px] text-slate-500">전체/신발/기타: 15·30주</span>
        <span className="text-[11px] text-slate-500">모자: 10·20주</span>
        <span className="text-[11px] text-slate-500">가방: 10·25주</span>
        <span className="text-[11px] text-slate-300">—: 리테일 없음</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-100/80">
              <th className="min-w-[160px] px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {viewMode === "item" ? "브랜드 / 아이템" : "브랜드 / 대리상"}
              </th>
              {MONTHS.map((m) => (
                <th
                  key={m}
                  className="min-w-[44px] px-2 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500"
                >
                  {m}월
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(BRAND_ORDER as readonly string[]).map((brand) => {
              const open = openBrands[brand];
              const bd = data[brand];
              if (!bd) return null;

              return (
                <React.Fragment key={brand}>
                  {/* 브랜드 행 */}
                  <tr
                    className="cursor-pointer bg-white hover:bg-slate-50/80"
                    onClick={() => toggle(brand)}
                  >
                    <td className="rounded-l px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400" aria-hidden>
                          {open ? (
                            <ChevronDownIcon className="h-4 w-4" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4" />
                          )}
                        </span>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${BRAND_DOT[brand as BrandKey]}`}
                          aria-hidden
                        />
                        <span className="text-sm font-semibold text-slate-700">
                          {brand}
                        </span>
                      </div>
                    </td>
                    {MONTHS.map((m) => (
                      <td
                        key={m}
                        className={`px-2 py-2.5 text-right text-sm tabular-nums ${cellColor(bd.total[m] ?? null, "total")}`}
                      >
                        {fmtWeeks(bd.total[m] ?? null)}
                      </td>
                    ))}
                  </tr>

                  {/* 펼침: 아이템별 */}
                  {open && viewMode === "item" &&
                    ACC_ORDER.map((item) => (
                      <tr
                        key={`${brand}-${item}`}
                        className="bg-slate-50/50 hover:bg-slate-50/80"
                      >
                        <td className="rounded-l py-1.5 pl-10 pr-3 text-[13px] text-slate-500">
                          ㄴ{item}
                        </td>
                        {MONTHS.map((m) => (
                          <td
                            key={m}
                            className={`px-2 py-1.5 text-right text-[13px] tabular-nums ${cellColor(bd[item]?.[m] ?? null, item)}`}
                          >
                            {fmtWeeks(bd[item]?.[m] ?? null)}
                          </td>
                        ))}
                      </tr>
                    ))}

                  {/* 펼침: 대리상별 (대리상 > 아이템) */}
                  {open && viewMode === "account" &&
                    bd.accounts.map((acc) => {
                      const accKey = `${brand}::${acc.id}`;
                      const accOpen = openAccounts[accKey] ?? false;
                      return (
                        <React.Fragment key={accKey}>
                          {/* 대리상 행 — 클릭 시 아이템 펼치기 */}
                          <tr
                            className="cursor-pointer bg-slate-50/50 hover:bg-slate-50/80"
                            onClick={() => toggleAccount(accKey)}
                          >
                            <td
                              className="rounded-l py-1.5 pl-7 pr-3 text-[13px] text-slate-600"
                              title={acc.id}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400" aria-hidden>
                                  {accOpen ? (
                                    <ChevronDownIcon className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronRightIcon className="h-3.5 w-3.5" />
                                  )}
                                </span>
                                {acc.name}
                              </div>
                            </td>
                            {MONTHS.map((m) => (
                              <td
                                key={m}
                                className={`px-2 py-1.5 text-right text-[13px] tabular-nums ${cellColor(acc.months[m] ?? null, "account")}`}
                              >
                                {fmtWeeks(acc.months[m] ?? null)}
                              </td>
                            ))}
                          </tr>

                          {/* 대리상 하위 아이템 행 */}
                          {accOpen && ACC_ORDER.map((item) => (
                            <tr
                              key={`${accKey}::${item}`}
                              className="bg-white hover:bg-slate-50/50"
                            >
                              <td className="rounded-l py-1 pl-14 pr-3 text-[12px] text-slate-400">
                                ㄴ{item}
                              </td>
                              {MONTHS.map((m) => (
                                <td
                                  key={m}
                                  className={`px-2 py-1 text-right text-[12px] tabular-nums ${cellColor(acc[item]?.[m] ?? null, item)}`}
                                >
                                  {fmtWeeks(acc[item]?.[m] ?? null)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
