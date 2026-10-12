"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { MAX_RSVP_COUNT } from "@/lib/guestRsvp";
import { formatHebrewDate } from "@/lib/hebrewDate";
import { formatGregorianDate, parseEventDate } from "@/lib/invitation";
import type { EventRecord } from "@/types/event";
import { submitRsvp, type RsvpAnswer } from "./actions";

export interface RsvpGuest {
  name: string;
  // Their invited party size; the count starts here on a first answer.
  partySize: number;
  // Their current answer, or null if they haven't answered yet.
  answer: RsvpAnswer | null;
}

type Choice = "attending" | "declined" | null;

const serifClasses = "font-[family-name:var(--font-invitation-serif)]";

const primaryButtonClasses =
  "flex h-14 w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#3F3A33] text-lg font-bold text-[#FAF7F0] shadow-lg shadow-[#3F3A33]/20 transition hover:bg-[#2E2A25] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#D4B26A] dark:text-zinc-950 dark:shadow-[#D4B26A]/10 dark:hover:bg-[#E0C285]";

const ghostButtonClasses =
  "flex h-12 w-full touch-manipulation items-center justify-center rounded-2xl text-base font-semibold text-[#6B604F] transition hover:bg-[#3F3A33]/5 active:scale-[0.98] dark:text-zinc-300 dark:hover:bg-white/5";

const stepButtonClasses =
  "grid h-14 w-14 shrink-0 touch-manipulation place-items-center rounded-full bg-[#F3ECDD] text-3xl font-light text-[#3F3A33] transition hover:bg-[#EADFC8] active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 disabled:active:scale-100 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700";

// Remounting on each screen (via key) replays this entrance transition.
const enterClasses =
  "transition duration-700 ease-out starting:translate-y-3 starting:opacity-0";

const formatGuestCount = (count: number) =>
  count === 1 ? "אורח אחד" : `${count} אורחים`;

function Ornament() {
  return (
    <svg
      viewBox="0 0 120 12"
      aria-hidden="true"
      className="mx-auto h-3 w-28 text-[#C9A96E] dark:text-[#D4B26A]"
    >
      <path d="M0 6h48M72 6h48" stroke="currentColor" strokeWidth="0.75" />
      <path
        d="M60 1.5 64.5 6 60 10.5 55.5 6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.75"
      />
      <circle cx="60" cy="6" r="1.4" fill="currentColor" />
      <circle cx="51" cy="6" r="0.9" fill="currentColor" />
      <circle cx="69" cy="6" r="0.9" fill="currentColor" />
    </svg>
  );
}

function ChoiceButton({
  selected,
  onSelect,
  tone,
  icon,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  tone: "yes" | "no";
  icon: ReactNode;
  children: ReactNode;
}) {
  const selectedClasses =
    tone === "yes"
      ? "bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400"
      : "bg-rose-50 text-rose-800 ring-2 ring-rose-400 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`flex h-24 flex-1 touch-manipulation flex-col items-center justify-center gap-1.5 rounded-2xl text-lg font-bold transition active:scale-[0.97] ${
        selected
          ? selectedClasses
          : "bg-white text-[#3F3A33] ring-1 ring-[#E6DCC6] hover:ring-[#C9A96E] dark:bg-zinc-800/60 dark:text-zinc-100 dark:ring-zinc-700 dark:hover:ring-[#D4B26A]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

const CheckIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-6 w-6" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const CrossIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-6 w-6" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export default function RsvpInvitation({
  token,
  event,
  guest,
  isOpen,
}: {
  token: string;
  event: Pick<EventRecord, "coupleNames" | "eventDate" | "venue">;
  guest: RsvpGuest;
  // False once the event is locked; the server enforces this too.
  isOpen: boolean;
}) {
  const [choice, setChoice] = useState<Choice>(
    guest.answer === null
      ? null
      : guest.answer.attending
        ? "attending"
        : "declined",
  );
  const [count, setCount] = useState(
    guest.answer?.attending ? guest.answer.count : guest.partySize,
  );
  // The answer on record, updated as the guest sends new ones.
  const [savedAnswer, setSavedAnswer] = useState(guest.answer);
  // Whether to show the thank-you screen for savedAnswer.
  const [showThanks, setShowThanks] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(!isOpen);

  const date = parseEventDate(event.eventDate);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!choice) return;
    const answer: RsvpAnswer =
      choice === "attending"
        ? { attending: true, count }
        : { attending: false };

    setPending(true);
    setError(null);
    submitRsvp(token, answer)
      .then((result) => {
        if (result.ok) {
          setSavedAnswer(answer);
          setShowThanks(true);
        } else if (result.reason === "closed") {
          setClosed(true);
        } else if (result.reason === "invalid") {
          setError("מספר האורחים אינו תקין. נסו שוב");
        } else {
          setError("הקישור אינו תקף עוד. פנו לבעלי השמחה");
        }
      })
      .catch((err: unknown) => {
        console.error(err);
        setError("משהו השתבש. בדקו את החיבור ונסו שוב");
      })
      .finally(() => setPending(false));
  }

  const screen =
    showThanks && savedAnswer ? "thanks" : closed ? "closed" : "form";

  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-[#FAF7F0] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-[#3F3A33] dark:bg-zinc-950 dark:text-zinc-50">
      {/* Soft champagne glow behind the card. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-[#F3DFC1]/80 via-rose-100/40 to-transparent blur-3xl dark:from-[#D4B26A]/15 dark:via-rose-500/5"
      />

      <div className="relative flex w-full max-w-sm flex-1 flex-col">
        <header className={`mb-7 text-center ${enterClasses}`}>
          <p className="text-xs font-semibold tracking-[0.3em] text-[#A8823F] dark:text-[#D4B26A]">
            {guest.name}, הוזמנתם
          </p>
          <p className={`mt-4 text-base text-[#6B604F] dark:text-zinc-400 ${serifClasses}`}>
            בשמחה רבה ובהתרגשות אנו מתכבדים להזמינכם לחגוג עימנו
          </p>
          <h1
            className={`mt-3 text-[2.6rem] font-bold leading-[1.15] tracking-tight ${serifClasses}`}
          >
            {event.coupleNames}
          </h1>
          <div className="my-5">
            <Ornament />
          </div>
          {date && (
            <>
              <p className={`text-lg font-medium ${serifClasses}`}>
                {formatGregorianDate(date)}
              </p>
              <p className="mt-0.5 text-sm text-[#6B604F] dark:text-zinc-400">
                {formatHebrewDate(date)}
              </p>
            </>
          )}
          {event.venue && (
            <p className={`mt-3 text-lg font-medium ${serifClasses}`}>
              {event.venue}
            </p>
          )}
        </header>

        <section
          key={screen}
          className={`rounded-[2rem] bg-white/90 p-6 shadow-[0_20px_60px_-15px_rgba(120,90,40,0.25)] ring-1 ring-[#C9A96E]/20 backdrop-blur-sm dark:bg-zinc-900/90 dark:ring-white/10 ${enterClasses}`}
        >
          {screen === "form" && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="text-center">
                <h2 className={`text-2xl font-bold ${serifClasses}`}>
                  אישור הגעה
                </h2>
                <p className="mt-1.5 text-sm text-[#6B604F] dark:text-zinc-400">
                  {savedAnswer
                    ? "כבר השבתם, ואפשר לעדכן את התשובה בכל עת"
                    : "נשמח לדעת אם תוכלו להגיע"}
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="האם תגיעו?"
                className="flex gap-3"
              >
                <ChoiceButton
                  tone="yes"
                  selected={choice === "attending"}
                  onSelect={() => setChoice("attending")}
                  icon={CheckIcon}
                >
                  מגיע/ה
                </ChoiceButton>
                <ChoiceButton
                  tone="no"
                  selected={choice === "declined"}
                  onSelect={() => setChoice("declined")}
                  icon={CrossIcon}
                >
                  לא מגיע/ה
                </ChoiceButton>
              </div>

              {choice === "attending" && (
                <div className={`flex flex-col items-center gap-3 ${enterClasses}`}>
                  <p id="rsvp-count-label" className="text-base font-semibold">
                    כמה תגיעו?
                  </p>
                  <div
                    role="group"
                    aria-labelledby="rsvp-count-label"
                    className="flex items-center justify-center gap-5"
                  >
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.min(MAX_RSVP_COUNT, c + 1))}
                      disabled={count >= MAX_RSVP_COUNT}
                      aria-label="הוספת אורח"
                      className={stepButtonClasses}
                    >
                      +
                    </button>
                    <output
                      aria-live="polite"
                      className="w-16 text-center text-5xl font-bold tabular-nums"
                    >
                      {count}
                    </output>
                    <button
                      type="button"
                      onClick={() => setCount((c) => Math.max(1, c - 1))}
                      disabled={count <= 1}
                      aria-label="הפחתת אורח"
                      className={stepButtonClasses}
                    >
                      −
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="-mt-2 text-center text-sm font-medium text-rose-600 dark:text-rose-400"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!choice || pending}
                className={primaryButtonClasses}
              >
                {pending ? "שולח..." : "שליחת תשובה"}
              </button>
            </form>
          )}

          {screen === "closed" && (
            <div className="flex flex-col gap-3 text-center" role="status">
              <h2 className={`text-2xl font-bold ${serifClasses}`}>
                אישורי ההגעה נסגרו
              </h2>
              {savedAnswer && (
                <p className="font-medium">
                  {savedAnswer.attending
                    ? `רשמנו שתגיעו: ${formatGuestCount(savedAnswer.count)}`
                    : "רשמנו שלא תוכלו להגיע"}
                </p>
              )}
              <p className="leading-relaxed text-[#6B604F] dark:text-zinc-400">
                לשינויים נא לפנות ישירות לבעלי השמחה
              </p>
            </div>
          )}

          {screen === "thanks" && savedAnswer && (
            <ThankYou
              answer={savedAnswer}
              venue={event.venue}
              onEdit={() => setShowThanks(false)}
            />
          )}
        </section>

        <p className="mt-auto pt-8 text-center text-xs text-[#A39883] dark:text-zinc-600">
          הקישור אישי עבורכם, נא לא להעביר אותו הלאה
        </p>
      </div>
    </main>
  );
}

function ThankYou({
  answer,
  venue,
  onEdit,
}: {
  answer: RsvpAnswer;
  venue: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-5 py-2 text-center" role="status">
      <div className="relative grid h-20 w-20 place-items-center">
        {answer.attending && (
          <span className="absolute inset-0 animate-ping rounded-full bg-[#C9A96E]/30 [animation-iteration-count:2]" />
        )}
        <div className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-b from-[#D9BC84] to-[#B8925A] text-white shadow-xl shadow-[#B8925A]/30">
          {answer.attending ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-10 w-10" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-9 w-9" aria-hidden="true">
              <path d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z" />
            </svg>
          )}
        </div>
      </div>

      <div>
        <h2 className={`text-4xl font-bold ${serifClasses}`}>תודה רבה!</h2>
        <p className="mt-3 text-lg leading-relaxed">
          {answer.attending
            ? `התשובה התקבלה: ${formatGuestCount(answer.count)}. מחכים לראותכם ולשמוח יחד!`
            : "חבל שלא תוכלו להגיע. תודה שעדכנתם אותנו, נשמח לחגוג איתכם בהזדמנות אחרת"}
        </p>
      </div>

      <Ornament />

      {answer.attending && venue && (
        <a
          href={`https://waze.com/ul?q=${encodeURIComponent(venue)}&navigate=yes`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-full touch-manipulation items-center justify-center gap-2 rounded-2xl bg-[#F3ECDD] text-base font-semibold text-[#3F3A33] transition hover:bg-[#EADFC8] active:scale-[0.98] dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
          </svg>
          ניווט ב-Waze
        </a>
      )}

      <button type="button" onClick={onEdit} className={ghostButtonClasses}>
        עדכון התשובה
      </button>
    </div>
  );
}
