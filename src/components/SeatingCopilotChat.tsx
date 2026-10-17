"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ApiError,
  fetchAiSeatingStatus,
  requestAiSeating,
  setAiSeatingLocked,
} from "@/lib/api";
import {
  AI_SEATING_PROMPT_MAX_LENGTH,
  type AiSeatingAssignment,
  type AiSeatingStatus,
} from "@/types/aiSeating";
import type { Guest } from "@/types/guest";
import type { SeatingTable } from "@/types/seating";

interface SeatingCopilotChatProps {
  eventId: string;
  guests: Guest[];
  tables: SeatingTable[];
  onBulkSeatGuests: (assignments: AiSeatingAssignment[]) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  isError?: boolean;
}

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  text: 'שלום! אני סייען ההושבה. ספרו לי מה חשוב לכם, למשל "שים את כל משפחת סבג ביחד" או "סבתא בכיסא גלגלים, קרוב ליציאה".',
};

// Hebrew messages for the errors /api/ai-seating returns, by status code.
// 403 is handled separately, since it also covers phase locks.
const ERROR_MESSAGES: Record<number, string> = {
  409: "אין כרגע שולחנות פנויים או אורחים שאישרו הגעה שאפשר לשבץ.",
  422: "אני יכול לעזור רק בסידורי הושבה לאירוע. נסו לנסח בקשה אחרת.",
  429: "ניצלתם את כל בקשות ה-AI לאירוע זה. אפשר להמשיך לשבץ ידנית.",
  502: "לא הצלחתי לקבל תשובה שמישה מה-AI. נסו שוב או נסחו בקשה ממוקדת יותר.",
  503: "סייען ה-AI אינו זמין כרגע.",
};
const GENERIC_ERROR = "משהו השתבש. נסו שוב בעוד רגע.";

function newMessage(
  role: ChatMessage["role"],
  text: string,
  isError = false,
): ChatMessage {
  return { id: crypto.randomUUID(), role, text, isError };
}

export default function SeatingCopilotChat({
  eventId,
  guests,
  tables,
  onBulkSeatGuests,
}: SeatingCopilotChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [inputValue, setInputValue] = useState("");
  const [status, setStatus] = useState<AiSeatingStatus | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isTogglingLock, setIsTogglingLock] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAiSeatingStatus(eventId).then(
      (next) => {
        if (!cancelled) setStatus(next);
      },
      // The chat still works without it; the server enforces the limits.
      console.error,
    );
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, isOpen, isSending]);

  const isLocked = status?.isLocked ?? false;
  const isQuotaUsed = status !== null && status.usageCount >= status.usageLimit;
  const isInputDisabled = isLocked || isQuotaUsed || isSending;

  async function handleToggleLock() {
    setIsTogglingLock(true);
    try {
      setStatus(await setAiSeatingLocked(eventId, !isLocked));
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        newMessage("assistant", "לא הצלחתי לשנות את נעילת ההושבה.", true),
      ]);
    } finally {
      setIsTogglingLock(false);
    }
  }

  // Keeps only moves that still make sense for what's on screen, in case a
  // guest or table was removed while the request was out.
  function applyAssignments(assignments: AiSeatingAssignment[]) {
    const guestIds = new Set(guests.map((guest) => guest.id));
    const tableIds = new Set(tables.map((table) => table.id));
    const valid = assignments.filter(
      (a) => guestIds.has(a.guestId) && tableIds.has(a.tableId),
    );
    if (valid.length > 0) onBulkSeatGuests(valid);
    return valid.length;
  }

  async function describeError(error: unknown): Promise<string> {
    if (!(error instanceof ApiError)) return GENERIC_ERROR;
    if (error.status === 429) {
      setStatus((prev) => prev && { ...prev, usageCount: prev.usageLimit });
    }
    if (error.status === 403) {
      const latest = await fetchAiSeatingStatus(eventId).catch(() => null);
      if (latest) setStatus(latest);
      return latest?.isLocked
        ? "ההושבה נעולה, ולכן הסייען כבוי. בטלו את הנעילה כדי להמשיך."
        : "אין אפשרות לשנות את ההושבה בשלב זה של האירוע.";
    }
    return ERROR_MESSAGES[error.status] ?? GENERIC_ERROR;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const prompt = inputValue.trim();
    if (!prompt || isInputDisabled) return;

    setMessages((prev) => [...prev, newMessage("user", prompt)]);
    setInputValue("");
    setIsSending(true);
    try {
      const result = await requestAiSeating(eventId, prompt);
      setStatus({
        usageCount: result.usageCount,
        usageLimit: result.usageLimit,
        isLocked: result.isLocked,
      });
      const moved = applyAssignments(result.assignments);
      setMessages((prev) => [
        ...prev,
        newMessage(
          "assistant",
          moved > 0
            ? `סידרתי! העברתי ${moved} אורחים לשולחנות חדשים. אפשר לגרור כל אחד מהם אם תרצו לשנות.`
            : "בדקתי, ולא נדרשו שינויים בהושבה לפי הבקשה.",
        ),
      ]);
    } catch (error) {
      console.error(error);
      const text = await describeError(error);
      setMessages((prev) => [...prev, newMessage("assistant", text, true)]);
    } finally {
      setIsSending(false);
    }
  }

  const remaining = status
    ? Math.max(status.usageLimit - status.usageCount, 0)
    : null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-x-2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 flex h-[min(32rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-3xl sm:inset-x-auto sm:bottom-24 sm:start-6 sm:w-[22rem] bg-white shadow-2xl ring-1 ring-black/5 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2 bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-600 px-4 py-3.5 text-white">
            <div className="flex min-w-0 flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <span className="font-bold">סייען הושבה AI</span>
              </div>
              {remaining !== null && (
                <span className="text-xs text-white/80">
                  נותרו {remaining} מתוך {status?.usageLimit} בקשות
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                role="switch"
                aria-checked={isLocked}
                onClick={handleToggleLock}
                disabled={status === null || isTogglingLock}
                className="flex min-h-10 items-center gap-1.5 rounded-full px-2 text-xs font-semibold transition hover:bg-white/20 disabled:opacity-50"
              >
                <span
                  aria-hidden="true"
                  className={`relative h-5 w-9 rounded-full transition ${isLocked ? "bg-amber-400" : "bg-white/30"}`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${isLocked ? "start-[1.125rem]" : "start-0.5"}`}
                  />
                </span>
                נעילת הושבה
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="סגירת הצ׳אט"
                className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-white/20"
              >
                ✕
              </button>
            </div>
          </div>

          {isLocked && (
            <div className="bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
              🔒 ההושבה נעולה - הסייען כבוי עד לביטול הנעילה.
            </div>
          )}

          <div
            ref={historyRef}
            className="flex flex-1 flex-col gap-2 overflow-y-auto p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-indigo-600 text-white"
                      : message.isError
                        ? "bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300"
                        : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start" role="status">
                <div className="rounded-2xl bg-zinc-100 px-3.5 py-2 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  חושב על סידור ההושבה...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-1 border-t border-zinc-100 p-3 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                maxLength={AI_SEATING_PROMPT_MAX_LENGTH}
                disabled={isInputDisabled}
                placeholder={
                  isLocked
                    ? "ההושבה נעולה"
                    : isQuotaUsed
                      ? "נוצלו כל בקשות ה-AI"
                      : "לדוגמה: שים את כל משפחת סבג ביחד"
                }
                className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
              />
              <button
                type="submit"
                disabled={isInputDisabled || !inputValue.trim()}
                aria-label="שליחה"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-600 text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                </svg>
              </button>
            </div>
            <span
              className={`px-4 text-end text-[11px] ${
                inputValue.length >= AI_SEATING_PROMPT_MAX_LENGTH
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {inputValue.length}/{AI_SEATING_PROMPT_MAX_LENGTH}
            </span>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? "סגירת סייען ההושבה" : "פתיחת סייען ההושבה"}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] start-4 z-40 grid h-14 w-14 sm:bottom-6 sm:start-6 place-items-center rounded-full bg-gradient-to-l from-fuchsia-600 via-violet-600 to-indigo-600 text-2xl text-white shadow-lg shadow-violet-500/40 transition hover:shadow-xl hover:shadow-violet-500/50 active:scale-95"
      >
        {isOpen ? "✕" : isLocked ? "🔒" : "✨"}
      </button>
    </>
  );
}
