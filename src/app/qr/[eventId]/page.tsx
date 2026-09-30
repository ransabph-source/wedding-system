"use client";

import { useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useEventEngine } from "@/lib/eventEngine";
import { getEventById } from "@/lib/mockEvents";
import { DEFAULT_TABLES } from "@/lib/seatingTables";
import { formatTableLabel } from "@/lib/tableDisplay";
import type { Guest } from "@/types/guest";

type Stage = "phone" | "partySize" | "success" | "fail";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function tableLabelForGuest(guest: Guest): string {
  if (!guest.seatingAssignment) return "טרם שובץ לשולחן";
  if (guest.seatingAssignment.kind === "zone") return "אזור הושבה";
  const table = DEFAULT_TABLES.find(
    (t) => t.id === guest.seatingAssignment?.id,
  );
  return table ? formatTableLabel(table) : "טרם שובץ לשולחן";
}

const inputClasses =
  "h-14 min-h-[56px] w-full touch-manipulation rounded-xl border border-zinc-300 bg-zinc-50 px-4 text-center text-base font-semibold text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50";

const primaryButtonClasses =
  "flex h-14 min-h-[56px] w-full touch-manipulation items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white transition hover:bg-indigo-700 active:scale-[0.98]";

const secondaryButtonClasses =
  "flex h-14 min-h-[56px] w-full touch-manipulation items-center justify-center rounded-xl bg-zinc-100 text-base font-semibold text-zinc-700 transition hover:bg-zinc-200 active:scale-[0.98] dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700";

export default function QrSelfCheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const event = getEventById(eventId);
  const { getGuests, setGuests } = useEventEngine();

  const [stage, setStage] = useState<Stage>("phone");
  const [phone, setPhone] = useState("");
  const [partySizeInput, setPartySizeInput] = useState("");
  const [matchedGuest, setMatchedGuest] = useState<Guest | null>(null);
  const [failMessage, setFailMessage] = useState("");

  function resetToStart() {
    setStage("phone");
    setPhone("");
    setPartySizeInput("");
    setMatchedGuest(null);
    setFailMessage("");
  }

  function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault();
    const normalizedInput = normalizePhone(phone);
    const guests = getGuests(eventId);
    const guest = guests.find(
      (candidate) => normalizePhone(candidate.phone) === normalizedInput,
    );

    if (!guest) {
      setFailMessage("מספר הטלפון לא נמצא ברשימת המוזמנים.");
      setStage("fail");
      return;
    }

    setMatchedGuest(guest);
    setPartySizeInput(String(guest.partySize));
    setStage("partySize");
  }

  function handlePartySizeSubmit(e: FormEvent) {
    e.preventDefault();
    if (!matchedGuest) return;

    const entered = Math.floor(Number(partySizeInput));

    if (
      !Number.isFinite(entered) ||
      entered < 1 ||
      entered > matchedGuest.partySize
    ) {
      setFailMessage(
        `מספר האורחים שהוזן (${partySizeInput || 0}) גבוה ממספר האורחים שאושר (${matchedGuest.partySize}).`,
      );
      setStage("fail");
      return;
    }

    setGuests(eventId, (prev) =>
      prev.map((guest) =>
        guest.id === matchedGuest.id ? { ...guest, arrived: true } : guest,
      ),
    );
    setStage("success");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 px-4 py-8 dark:from-zinc-950 dark:to-zinc-900">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5 dark:bg-zinc-900">
        <h1 className="mb-1 text-center text-xl font-bold text-zinc-900 dark:text-zinc-50">
          צ&apos;ק-אין עצמאי
        </h1>
        {event && (
          <p className="mb-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {event.coupleNames} · {event.venue}
          </p>
        )}

        {stage === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
            <label
              htmlFor="phone"
              className="text-center text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              הזינו את מספר הטלפון שאיתו אישרתם הגעה
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="050-1234567"
              autoFocus
              required
              className={inputClasses}
            />
            <button type="submit" className={primaryButtonClasses}>
              המשך
            </button>
          </form>
        )}

        {stage === "partySize" && matchedGuest && (
          <form
            onSubmit={handlePartySizeSubmit}
            className="flex flex-col gap-4"
          >
            <p className="text-center text-lg font-bold text-zinc-900 dark:text-zinc-50">
              שלום {matchedGuest.name}!
            </p>
            <label
              htmlFor="partySize"
              className="text-center text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              כמה מגיעים כרגע? (אושרו {matchedGuest.partySize})
            </label>
            <input
              id="partySize"
              type="number"
              inputMode="numeric"
              min={1}
              max={matchedGuest.partySize}
              value={partySizeInput}
              onChange={(e) => setPartySizeInput(e.target.value)}
              autoFocus
              required
              className={inputClasses}
            />
            <button type="submit" className={primaryButtonClasses}>
              אישור הגעה
            </button>
          </form>
        )}

        {stage === "success" && matchedGuest && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-9 w-9">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
              ברוכים הבאים, {matchedGuest.name}!
            </p>
            <div className="rounded-xl bg-indigo-600 px-6 py-3 text-2xl font-extrabold text-white">
              {tableLabelForGuest(matchedGuest)}
            </div>
            <button
              type="button"
              onClick={resetToStart}
              className={secondaryButtonClasses}
            >
              צ&apos;ק-אין לאורח הבא
            </button>
          </div>
        )}

        {stage === "fail" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-9 w-9">
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.169 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.515-2.63L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
              {failMessage}
            </p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              אנא פנו לדלפק הדיילות לקבלת סיוע
            </p>
            <button
              type="button"
              onClick={resetToStart}
              className={secondaryButtonClasses}
            >
              נסה שוב
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
