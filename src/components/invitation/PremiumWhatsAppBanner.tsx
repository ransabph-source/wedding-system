"use client";

import { useState } from "react";

const PREMIUM_FEATURES = [
  "שליחה אוטומטית של ההזמנה לכל המוזמנים בוואטסאפ",
  "כפתורי אישור הגעה ישירות מתוך ההודעה",
  "תזכורות חכמות למי שטרם ענה",
  "עדכון אוטומטי של רשימת המוזמנים בזמן אמת",
];

// Upsell only: the automated sending service is run by the agency, so the
// call to action just tells the couple how to get it.
export default function PremiumWhatsAppBanner() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <aside
      aria-labelledby="premium-whatsapp-title"
      className="relative mt-3 overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950 p-5 text-white shadow-xl ring-1 ring-amber-400/30"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -end-16 -top-16 h-44 w-44 rounded-full bg-emerald-500/20 blur-3xl"
      />

      <div className="relative flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#25D366] text-white shadow-lg shadow-emerald-500/30">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.04c-.24.68-1.42 1.3-1.96 1.34-.5.05-.97.23-3.27-.68-2.77-1.09-4.52-3.92-4.66-4.1-.13-.18-1.11-1.48-1.11-2.83 0-1.34.7-2 .95-2.28.25-.27.55-.34.73-.34h.52c.17 0 .4-.06.62.48.24.55.8 1.92.87 2.06.07.14.11.3.02.48-.09.18-.14.3-.27.46-.14.16-.29.36-.41.48-.14.14-.28.28-.12.56.16.27.71 1.17 1.52 1.9 1.05.93 1.93 1.22 2.2 1.36.28.14.44.11.6-.07.16-.18.69-.8.87-1.08.18-.27.37-.23.62-.14.25.09 1.6.75 1.87.89.28.14.46.2.53.32.07.11.07.66-.17 1.33Z" />
              </svg>
            </div>
            <div>
              <h3
                id="premium-whatsapp-title"
                className="text-base font-bold leading-tight"
              >
                הפצה אוטומטית בוואטסאפ
              </h3>
              <p className="text-xs text-zinc-400">
                ההזמנה נשלחת לכל המוזמנים - בלי לגעת בטלפון
              </p>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-l from-amber-300 to-amber-500 px-2.5 py-1 text-[11px] font-bold text-amber-950 shadow">
            <svg
              className="h-3 w-3"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                clipRule="evenodd"
              />
            </svg>
            פרימיום
          </span>
        </div>

        {/* A blurred sample message behind a lock, hinting at what's unlocked. */}
        <div className="relative overflow-hidden rounded-xl bg-[#0B141A] p-3">
          <div aria-hidden="true" className="select-none blur-[3px]">
            <div className="ms-auto w-4/5 rounded-lg rounded-se-none bg-[#005C4B] px-3 py-2 text-xs leading-relaxed text-emerald-50">
              שלום! הוזמנתם לחתונה שלנו 💍 לחצו לאישור הגעה:
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <span className="rounded bg-white/10 py-1 text-center">
                  מגיעים ✓
                </span>
                <span className="rounded bg-white/10 py-1 text-center">
                  לא נוכל
                </span>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 grid place-items-center bg-zinc-950/40">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950/80 px-3 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-300/40">
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                  clipRule="evenodd"
                />
              </svg>
              זמין בחבילת פרימיום
            </span>
          </div>
        </div>

        <ul className="flex flex-col gap-1.5 text-sm text-zinc-300">
          {PREMIUM_FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-[10px] text-emerald-400"
              >
                ✓
              </span>
              {feature}
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => setShowDetails((prev) => !prev)}
          aria-expanded={showDetails}
          className="min-h-11 rounded-xl bg-gradient-to-l from-amber-300 to-amber-500 px-4 py-2.5 text-sm font-bold text-amber-950 shadow-lg shadow-amber-500/20 transition hover:from-amber-200 hover:to-amber-400 active:scale-[0.99]"
        >
          שדרוג לפרימיום
        </button>

        {showDetails && (
          <p
            role="status"
            className="rounded-lg bg-white/5 px-3 py-2 text-sm text-zinc-200 ring-1 ring-white/10"
          >
            שירות ההפצה האוטומטית מופעל על ידי צוות ההפקה. פנו לנציג שלכם
            כדי להוסיף אותו לחבילה, וההזמנה תישלח לכל המוזמנים עם אפשרות
            לאשר הגעה בלחיצה.
          </p>
        )}
      </div>
    </aside>
  );
}
