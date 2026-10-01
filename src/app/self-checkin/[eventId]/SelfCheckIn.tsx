"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import { normalizePhone } from "@/lib/guestRsvp";
import type { EventRecord } from "@/types/event";
import { checkInGuest, lookupGuest, type CheckInGuest } from "./actions";

type Step =
  | { kind: "phone" }
  | { kind: "notFound" }
  // The event isn't LIVE yet, or too many unknown numbers from this network.
  | { kind: "unavailable"; reason: "closed" | "rate_limited" }
  | { kind: "partySize"; guest: CheckInGuest }
  | { kind: "welcome"; guest: CheckInGuest; arrivedCount: number }
  | { kind: "needsHostess"; guest: CheckInGuest };

const formatEventDate = (isoDate: string) =>
  new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoDate));

const primaryButtonClasses =
  "flex h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-zinc-900 text-lg font-bold text-white shadow-lg shadow-zinc-900/20 transition hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-amber-400 dark:text-zinc-950 dark:shadow-amber-400/10 dark:hover:bg-amber-300";

const ghostButtonClasses =
  "flex h-12 w-full touch-manipulation items-center justify-center rounded-2xl text-base font-semibold text-zinc-600 transition hover:bg-zinc-900/5 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-white/5";

// Remounting on each step (via key) replays this entrance transition.
const stepEnterClasses =
  "transition duration-500 ease-out starting:translate-y-3 starting:opacity-0";

function StatusIcon({
  tone,
  children,
}: {
  tone: "success" | "warning";
  children: ReactNode;
}) {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-500 text-white shadow-emerald-500/30"
      : "bg-amber-100 text-amber-600 shadow-amber-500/10 dark:bg-amber-500/15 dark:text-amber-400";
  return (
    <div className="relative mx-auto grid h-20 w-20 place-items-center">
      {tone === "success" && (
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30 [animation-iteration-count:2]" />
      )}
      <div
        className={`relative grid h-20 w-20 place-items-center rounded-full shadow-xl ${toneClasses}`}
      >
        {children}
      </div>
    </div>
  );
}

// Each step asks the server about the entered phone number only, so the
// guest list never reaches the browser and is always current.
export default function SelfCheckIn({
  eventId,
  event,
  isOpen,
}: {
  eventId: string;
  event: Pick<EventRecord, "coupleNames" | "eventDate" | "venue">;
  // False until the event is LIVE; the server enforces this too.
  isOpen: boolean;
}) {
  const [step, setStep] = useState<Step>(
    isOpen ? { kind: "phone" } : { kind: "unavailable", reason: "closed" },
  );
  const [phone, setPhone] = useState("");
  const [partySizeInput, setPartySizeInput] = useState("");
  const [partySizeError, setPartySizeError] = useState<string | null>(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const [requestError, setRequestError] = useState(false);

  function restart() {
    setStep({ kind: "phone" });
    setPhone("");
    setPartySizeInput("");
    setPartySizeError(null);
    setRequestError(false);
  }

  // Runs a server call, showing a retry message if it fails.
  async function withPending(run: () => Promise<void>) {
    setPending(true);
    setRequestError(false);
    try {
      await run();
    } catch (error) {
      console.error(error);
      setRequestError(true);
    } finally {
      setPending(false);
    }
  }

  function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault();
    void withPending(async () => {
      const result = await lookupGuest(eventId, phone);
      if (!result.ok) {
        setStep(
          result.reason === "not_found"
            ? { kind: "notFound" }
            : { kind: "unavailable", reason: result.reason },
        );
        return;
      }
      const { guest } = result;
      setPartySizeInput(
        String(guest.confirmedCount > 0 ? guest.confirmedCount : 1),
      );
      setPartySizeError(null);
      setStep({ kind: "partySize", guest });
    });
  }

  function adjustPartySize(delta: number) {
    const current = Math.floor(Number(partySizeInput)) || 0;
    setPartySizeInput(String(Math.max(1, current + delta)));
    setPartySizeError(null);
  }

  function handlePartySizeSubmit(e: FormEvent, guest: CheckInGuest) {
    e.preventDefault();
    const entered = Math.floor(Number(partySizeInput));
    if (!Number.isFinite(entered) || entered < 1) {
      setPartySizeError("יש להזין מספר אורחים תקין");
      return;
    }

    // Guests who haven't confirmed have 0 confirmed seats, so they are
    // always routed to the hostess desk rather than checked in blindly.
    if (entered > guest.confirmedCount) {
      setStep({ kind: "needsHostess", guest });
      return;
    }

    void withPending(async () => {
      // The server re-checks the phone and count before saving.
      const result = await checkInGuest(eventId, phone, entered);
      if (result.ok) {
        setStep({ kind: "welcome", guest, arrivedCount: entered });
      } else if (result.reason === "needs_hostess") {
        setStep({ kind: "needsHostess", guest });
      } else if (result.reason === "not_found") {
        setStep({ kind: "notFound" });
      } else {
        setStep({ kind: "unavailable", reason: result.reason });
      }
    });
  }

  const stepIndex =
    step.kind === "phone" ||
    step.kind === "notFound" ||
    step.kind === "unavailable"
      ? 0
      : step.kind === "partySize"
        ? 1
        : 2;

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-[#FAF9F6] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
      {/* Soft champagne glow behind the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-200/60 via-rose-100/40 to-transparent blur-3xl dark:from-amber-500/15 dark:via-rose-500/5"
      />

      <div className="relative flex w-full max-w-sm flex-1 flex-col">
        <header className="mb-8 text-center">
          {!logoFailed && (
            <Image
              src="/logo.png"
              alt=""
              width={1408}
              height={768}
              priority
              onError={() => setLogoFailed(true)}
              className="mx-auto mb-5 h-12 w-auto object-contain"
            />
          )}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700/80 dark:text-amber-400/80">
            צ&apos;ק-אין עצמאי
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
            {event.coupleNames}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {formatEventDate(event.eventDate)} · {event.venue}
          </p>
        </header>

        {step.kind !== "welcome" && (
          <ol
            aria-label="שלבי הצ'ק-אין"
            className="mb-5 flex items-center justify-center gap-2"
          >
            {[0, 1, 2].map((index) => (
              <li
                key={index}
                aria-current={index === stepIndex ? "step" : undefined}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  index === stepIndex
                    ? "w-8 bg-amber-500"
                    : index < stepIndex
                      ? "w-3 bg-amber-300 dark:bg-amber-600"
                      : "w-3 bg-zinc-200 dark:bg-zinc-800"
                }`}
              />
            ))}
          </ol>
        )}

        <section
          key={step.kind}
          className={`rounded-[2rem] bg-white/90 p-6 shadow-[0_20px_60px_-15px_rgba(120,90,40,0.25)] ring-1 ring-amber-900/5 backdrop-blur-sm dark:bg-zinc-900/90 dark:ring-white/10 ${stepEnterClasses}`}
        >
          {step.kind === "phone" && (
            <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-5">
              <div className="text-center">
                <h2 className="text-xl font-bold">נעים לראות אתכם!</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                  הזינו את מספר הטלפון שאיתו אישרתם הגעה
                </p>
              </div>
              <label htmlFor="self-checkin-phone" className="sr-only">
                מספר טלפון
              </label>
              <input
                id="self-checkin-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="050-1234567"
                autoFocus
                required
                className="h-16 w-full rounded-2xl border-0 bg-zinc-100/80 px-4 text-center text-2xl font-semibold tracking-wider text-zinc-900 outline-none ring-1 ring-inset ring-zinc-200 transition placeholder:text-zinc-300 focus:bg-white focus:ring-2 focus:ring-amber-500 dark:bg-zinc-800 dark:text-zinc-50 dark:ring-zinc-700 dark:placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={pending || normalizePhone(phone).length === 0}
                className={primaryButtonClasses}
              >
                {pending ? "מחפש..." : "המשך"}
              </button>
            </form>
          )}

          {step.kind === "notFound" && (
            <div className="flex flex-col gap-5 text-center" role="alert">
              <StatusIcon tone="warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-9 w-9" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </StatusIcon>
              <p className="text-lg font-semibold leading-relaxed">
                מספר הטלפון לא זוהה במערכת. אנא גשו לצוות הדיילות
              </p>
              <button type="button" onClick={restart} className={primaryButtonClasses}>
                ניסיון נוסף
              </button>
            </div>
          )}

          {step.kind === "unavailable" && (
            <div className="flex flex-col gap-5 text-center" role="alert">
              <StatusIcon tone="warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-9 w-9" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </StatusIcon>
              <p className="text-lg font-semibold leading-relaxed">
                {step.reason === "closed"
                  ? "הצ'ק-אין העצמאי ייפתח עם תחילת האירוע. בינתיים צוות הדיילות ישמח לסייע"
                  : "לא ניתן להשלים צ'ק-אין עצמאי כרגע. אנא גשו לצוות הדיילות"}
              </p>
              <button type="button" onClick={restart} className={primaryButtonClasses}>
                ניסיון נוסף
              </button>
            </div>
          )}

          {step.kind === "partySize" && (
            <form
              onSubmit={(e) => handlePartySizeSubmit(e, step.guest)}
              className="flex flex-col gap-6"
            >
              <h2 className="text-center text-2xl font-bold leading-snug">
                היי {step.guest.name}!
                <span className="mt-1 block text-lg font-medium text-zinc-500 dark:text-zinc-400">
                  כמה אורחים הגעתם?
                </span>
              </h2>

              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => adjustPartySize(1)}
                  aria-label="הוספת אורח"
                  className="grid h-14 w-14 shrink-0 touch-manipulation place-items-center rounded-full bg-zinc-100 text-3xl font-light text-zinc-700 transition hover:bg-zinc-200 active:scale-90 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  +
                </button>
                <label htmlFor="self-checkin-party-size" className="sr-only">
                  מספר האורחים שהגיעו
                </label>
                <input
                  id="self-checkin-party-size"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={partySizeInput}
                  onChange={(e) => {
                    setPartySizeInput(e.target.value);
                    setPartySizeError(null);
                  }}
                  required
                  className="h-20 w-24 rounded-2xl border-0 bg-transparent text-center text-6xl font-bold tabular-nums text-zinc-900 outline-none ring-0 [appearance:textfield] focus:bg-amber-50 dark:text-zinc-50 dark:focus:bg-amber-500/10 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => adjustPartySize(-1)}
                  aria-label="הפחתת אורח"
                  className="grid h-14 w-14 shrink-0 touch-manipulation place-items-center rounded-full bg-zinc-100 text-3xl font-light text-zinc-700 transition hover:bg-zinc-200 active:scale-90 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  −
                </button>
              </div>

              {partySizeError && (
                <p className="-mt-2 text-center text-sm font-medium text-rose-600 dark:text-rose-400">
                  {partySizeError}
                </p>
              )}

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={pending}
                  className={primaryButtonClasses}
                >
                  {pending ? "רושם..." : <>צ&apos;ק-אין</>}
                </button>
                <button type="button" onClick={restart} className={ghostButtonClasses}>
                  זה לא אני
                </button>
              </div>
            </form>
          )}

          {step.kind === "needsHostess" && (
            <div className="flex flex-col gap-5 text-center" role="alert">
              <StatusIcon tone="warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-9 w-9" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              </StatusIcon>
              <div>
                <p className="text-lg font-bold">רק רגע, {step.guest.name}</p>
                <p className="mt-2 leading-relaxed text-zinc-600 dark:text-zinc-300">
                  מספר המגיעים שונה מהכמות שאושרה מראש. אנא גשו לצוות הדיילות
                  לעדכון מהיר
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPartySizeError(null);
                  setStep({ kind: "partySize", guest: step.guest });
                }}
                className={ghostButtonClasses}
              >
                חזרה לעדכון מספר האורחים
              </button>
            </div>
          )}

          {step.kind === "welcome" && (
            <WelcomeScreen
              guest={step.guest}
              arrivedCount={step.arrivedCount}
              onDone={restart}
            />
          )}
        </section>

        {requestError && (
          <p
            role="alert"
            className="mt-4 text-center text-sm font-medium text-rose-600 dark:text-rose-400"
          >
            משהו השתבש. נסו שוב או גשו לצוות הדיילות
          </p>
        )}

        <p className="mt-auto pt-8 text-center text-xs text-zinc-400 dark:text-zinc-600">
          זקוקים לעזרה? צוות הדיילות בכניסה ישמח לסייע
        </p>
      </div>
    </main>
  );
}

function WelcomeScreen({
  guest,
  arrivedCount,
  onDone,
}: {
  guest: CheckInGuest;
  arrivedCount: number;
  onDone: () => void;
}) {
  const { table } = guest;

  return (
    <div className="flex flex-col items-center gap-6 py-2 text-center" role="status">
      <StatusIcon tone="success">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-10 w-10" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </StatusIcon>

      <div>
        <h2 className="text-4xl font-extrabold tracking-tight">ברוכים הבאים!</h2>
        <p className="mt-2 text-zinc-500 dark:text-zinc-400">
          {guest.name} · {arrivedCount === 1 ? "אורח אחד" : `${arrivedCount} אורחים`}
        </p>
      </div>

      {table.kind === "number" ? (
        <div className="w-full rounded-3xl bg-gradient-to-b from-amber-50 to-amber-100/60 px-6 py-7 ring-1 ring-inset ring-amber-200/70 dark:from-amber-500/10 dark:to-amber-500/5 dark:ring-amber-500/20">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
            שולחן מספר
          </p>
          <p className="mt-1 text-[7rem] font-black leading-none tabular-nums text-zinc-900 dark:text-amber-50">
            {table.value}
          </p>
        </div>
      ) : table.kind === "label" ? (
        <div className="w-full rounded-3xl bg-gradient-to-b from-amber-50 to-amber-100/60 px-6 py-7 ring-1 ring-inset ring-amber-200/70 dark:from-amber-500/10 dark:to-amber-500/5 dark:ring-amber-500/20">
          <p className="text-3xl font-extrabold text-zinc-900 dark:text-amber-50">
            {table.value}
          </p>
        </div>
      ) : (
        <p className="rounded-2xl bg-zinc-100 px-5 py-4 text-base font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          צוות הדיילות ישמח להכווין אתכם למקומכם
        </p>
      )}

      <button type="button" onClick={onDone} className={ghostButtonClasses}>
        סיום
      </button>
    </div>
  );
}
