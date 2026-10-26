"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  sendRsvpMessages,
  sendTestMessage,
  type SendMessagesResult,
} from "@/app/admin/events/[id]/messageActions";
import { hasPhoneNumber } from "@/lib/guestRsvp";
import type { Guest } from "@/types/guest";

type Audience = "selected" | "pending" | "all";

interface SendMessagesModalProps {
  eventId: string;
  guests: Guest[];
  // Guests picked in the guest table, if any; offered as the default audience.
  selectedGuestIds?: string[];
  onClose: () => void;
}

type Feedback = { tone: "success" | "warning" | "error"; text: string } | null;

const ERROR_MESSAGES: Record<
  Extract<SendMessagesResult, { ok: false }>["reason"],
  string
> = {
  unauthorized: "שליחת הודעות זמינה למנהלי המערכת בלבד.",
  not_configured:
    "חיבור WhatsApp לא הוגדר בשרת (אסימון גישה, מזהה מספר או תבנית הודעה).",
  invalid: "הפרטים שהוזנו אינם תקינים.",
  rate_limited: "נשלחו יותר מדי הודעות נסיון. נסו שוב בעוד מספר דקות.",
  send_failed: "WhatsApp לא אישר את שליחת ההודעות. נסו שוב מאוחר יותר.",
  send_unconfirmed:
    "לא התקבל אישור מ-WhatsApp. ייתכן שההודעה בכל זאת נשלחה – בדקו בטלפון לפני שליחה חוזרת.",
};

const FEEDBACK_CLASSES: Record<NonNullable<Feedback>["tone"], string> = {
  success:
    "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300",
  warning:
    "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  error: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
};

// Guests who haven't answered yet, whether or not they were already contacted.
function isAwaitingAnswer(guest: Guest) {
  return guest.rsvpStatus === "pending_whatsapp" || guest.rsvpStatus === "needs_call";
}

function audienceRadioClasses(active: boolean) {
  return `flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm ring-1 transition ${
    active
      ? "bg-indigo-50 font-semibold text-indigo-900 ring-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-400/40"
      : "text-zinc-700 ring-zinc-200 hover:bg-zinc-50 dark:text-zinc-300 dark:ring-zinc-700 dark:hover:bg-zinc-800"
  }`;
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      role={feedback.tone === "success" ? "status" : "alert"}
      className={`rounded-lg px-3 py-2 text-sm font-medium ${FEEDBACK_CLASSES[feedback.tone]}`}
    >
      {feedback.text}
    </p>
  );
}

export default function SendMessagesModal({
  eventId,
  guests,
  selectedGuestIds = [],
  onClose,
}: SendMessagesModalProps) {
  const selectedIds = new Set(selectedGuestIds);
  const audiences: { id: Audience; label: string; guests: Guest[] }[] = [
    ...(selectedIds.size > 0
      ? [
          {
            id: "selected" as const,
            label: "האורחים שנבחרו בטבלה",
            guests: guests.filter((guest) => selectedIds.has(guest.id)),
          },
        ]
      : []),
    {
      id: "pending",
      label: "כל מי שטרם השיב",
      guests: guests.filter(isAwaitingAnswer),
    },
    { id: "all", label: "כל המוזמנים", guests },
  ];

  const [audience, setAudience] = useState<Audience>(
    selectedIds.size > 0 ? "selected" : "pending",
  );
  const [sending, setSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<Feedback>(null);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const [testFeedback, setTestFeedback] = useState<Feedback>(null);

  const recipients =
    audiences.find((option) => option.id === audience)?.guests ?? [];
  const withoutPhone = recipients.filter((guest) => !hasPhoneNumber(guest));
  const sendableCount = recipients.length - withoutPhone.length;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSend() {
    if (sendableCount === 0) return;
    const message =
      sendableCount === 1
        ? "לשלוח הודעת אישור הגעה לאורח אחד?"
        : `לשלוח הודעת אישור הגעה ל-${sendableCount} אורחים?`;
    if (!window.confirm(message)) return;

    setSending(true);
    setSendFeedback(null);
    try {
      const result = await sendRsvpMessages(
        eventId,
        recipients.filter(hasPhoneNumber).map((guest) => guest.id),
      );
      if (!result.ok) {
        setSendFeedback({ tone: "error", text: ERROR_MESSAGES[result.reason] });
        return;
      }
      const skippedText =
        result.skipped.length > 0
          ? ` ${result.skipped.length} אורחים דולגו (ללא מספר טלפון תקין או שטרם נשמרו).`
          : "";
      const failedText =
        result.failed.length > 0
          ? ` השליחה נכשלה עבור: ${result.failed.join(", ")}.`
          : "";
      // Not failures: the message may have arrived, so admins are told not
      // to send these guests another one.
      const unconfirmedText =
        result.unconfirmed.length > 0
          ? ` לא התקבל אישור מ-WhatsApp עבור: ${result.unconfirmed.join(", ")}. ייתכן שההודעה הגיעה אליהם – אין לשלוח להם שוב.`
          : "";
      const anySent = result.sent > 0 || result.unconfirmed.length > 0;
      setSendFeedback({
        tone:
          result.failed.length > 0 || !anySent
            ? "error"
            : result.unconfirmed.length > 0
              ? "warning"
              : "success",
        text: (
          (result.sent > 0
            ? `הודעות WhatsApp נשלחו ל-${result.sent} אורחים.`
            : anySent
              ? ""
              : "לא נשלחו הודעות.") +
          `${skippedText}${failedText}${unconfirmedText}`
        ).trim(),
      });
    } catch (error) {
      console.error(error);
      setSendFeedback({ tone: "error", text: "השליחה נכשלה. נסו שוב." });
    } finally {
      setSending(false);
    }
  }

  async function handleTest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTesting(true);
    setTestFeedback(null);
    try {
      const result = await sendTestMessage(eventId, testPhone);
      setTestFeedback(
        result.ok
          ? { tone: "success", text: "הודעת הנסיון נשלחה ב-WhatsApp." }
          : {
              tone: result.reason === "send_unconfirmed" ? "warning" : "error",
              text:
                result.reason === "invalid"
                  ? "מספר הטלפון אינו תקין."
                  : ERROR_MESSAGES[result.reason],
            },
      );
    } catch (error) {
      console.error(error);
      setTestFeedback({ tone: "error", text: "השליחה נכשלה. נסו שוב." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-messages-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl pb-[env(safe-area-inset-bottom)] sm:max-h-[90vh] sm:rounded-3xl sm:pb-0 bg-white shadow-2xl ring-1 ring-black/5 transition duration-200 starting:scale-95 starting:opacity-0 dark:bg-zinc-900">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 p-4 sm:p-5 dark:border-zinc-800">
          <div className="min-w-0">
            <h2
              id="send-messages-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              שליחת הודעות
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              כל אורח יקבל הודעה עם קישור אישי לאישור הגעה.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-5 p-4 sm:p-5">
          <section className="flex flex-col gap-3 rounded-2xl bg-amber-50/60 p-4 ring-1 ring-amber-200 dark:bg-amber-500/5 dark:ring-amber-500/30">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                שלח הודעת נסיון
              </h3>
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                מומלץ לבדוק את ההודעה ב-WhatsApp לפני השליחה לאורחים.
              </p>
            </div>
            <form onSubmit={handleTest} className="flex gap-2">
              <label htmlFor="test-phone" className="sr-only">
                מספר טלפון להודעת נסיון
              </label>
              <input
                id="test-phone"
                type="tel"
                inputMode="tel"
                dir="ltr"
                autoComplete="tel"
                placeholder="050-1234567"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="min-h-10 min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-left text-sm text-zinc-900 ring-1 ring-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
              />
              <button
                type="submit"
                disabled={testing || testPhone.trim() === ""}
                className="min-h-10 shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 active:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testing ? "שולח..." : "שלח הודעת נסיון"}
              </button>
            </form>
            <FeedbackMessage feedback={testFeedback} />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              למי לשלוח?
            </h3>
            <div className="flex flex-col gap-2" role="radiogroup">
              {audiences.map((option) => (
                <label
                  key={option.id}
                  className={audienceRadioClasses(audience === option.id)}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="audience"
                      value={option.id}
                      checked={audience === option.id}
                      onChange={() => {
                        setAudience(option.id);
                        setSendFeedback(null);
                      }}
                      className="accent-indigo-600"
                    />
                    {option.label}
                  </span>
                  <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    {option.guests.length}
                  </span>
                </label>
              ))}
            </div>

            {withoutPhone.length > 0 && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                {withoutPhone.length === 1
                  ? `${withoutPhone[0].name} ללא מספר טלפון ולא יקבל/תקבל הודעה.`
                  : `${withoutPhone.length} אורחים ללא מספר טלפון ולא יקבלו הודעה.`}
              </p>
            )}

            <FeedbackMessage feedback={sendFeedback} />

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || sendableCount === 0}
              className="min-h-11 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending
                ? "שולח..."
                : sendableCount === 0
                  ? "אין אורחים לשליחה"
                  : `שליחה ל-${sendableCount} אורחים`}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
