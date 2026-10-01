"use client";

import { useState, type FormEvent } from "react";
import { createClientAccount, type NewClient } from "@/lib/api";
import type { EventRecord } from "@/types/event";

const EMPTY_FORM: Required<NewClient> = {
  coupleNames: "",
  email: "",
  password: "",
  eventDate: "",
  venue: "",
  phone: "",
};

const inputClasses =
  "w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-inset ring-zinc-200 transition placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500/50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700";

const labelClasses =
  "mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300";

export interface CreatedClient {
  email: string;
  event: EventRecord;
}

// Creates a couple's account and their first event. Used inline on the
// dashboard and in a modal when converting a lead.
export default function NewClientForm({
  initial,
  idPrefix = "client",
  className = "",
  onCreated,
  onCancel,
}: {
  // Pre-fills fields, e.g. names and phone from a lead.
  initial?: Partial<NewClient>;
  // Keeps element IDs unique when more than one form is on the page.
  idPrefix?: string;
  className?: string;
  onCreated: (created: CreatedClient) => void;
  // Shows a cancel button when given.
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<Required<NewClient>>(() => ({
    ...EMPTY_FORM,
    ...initial,
  }));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update =
    (field: keyof NewClient) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { event } = await createClientAccount(form);
      setForm(EMPTY_FORM);
      onCreated({ email: form.email, event });
    } catch (err) {
      console.error(err);
      // request() prefixes the server's message with the method and URL.
      const message = err instanceof Error ? err.message : String(err);
      setError(message.replace(/^.*failed \(\d+\): /, ""));
    } finally {
      setSubmitting(false);
    }
  }

  const id = (field: keyof NewClient) => `${idPrefix}-${field}`;

  return (
    <form
      onSubmit={handleSubmit}
      className={`grid gap-4 sm:grid-cols-2 ${className}`}
    >
      <div className="sm:col-span-2">
        <label htmlFor={id("coupleNames")} className={labelClasses}>
          שמות בני הזוג
        </label>
        <input
          id={id("coupleNames")}
          required
          value={form.coupleNames}
          onChange={update("coupleNames")}
          placeholder="לדוגמה: נועה ואיתי"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={id("email")} className={labelClasses}>
          אימייל
        </label>
        <input
          id={id("email")}
          type="email"
          required
          dir="ltr"
          autoComplete="off"
          value={form.email}
          onChange={update("email")}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={id("password")} className={labelClasses}>
          סיסמה
        </label>
        <input
          id={id("password")}
          type="password"
          required
          minLength={6}
          dir="ltr"
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={id("phone")} className={labelClasses}>
          טלפון
        </label>
        <input
          id={id("phone")}
          type="tel"
          dir="ltr"
          maxLength={200}
          value={form.phone}
          onChange={update("phone")}
          placeholder="050-1234567"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={id("eventDate")} className={labelClasses}>
          תאריך האירוע
        </label>
        <input
          id={id("eventDate")}
          type="date"
          required
          value={form.eventDate}
          onChange={update("eventDate")}
          className={inputClasses}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={id("venue")} className={labelClasses}>
          מיקום האירוע
        </label>
        <input
          id={id("venue")}
          required
          value={form.venue}
          onChange={update("venue")}
          placeholder="שם האולם / הגן"
          className={inputClasses}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-2 dark:bg-rose-500/10 dark:text-rose-400">
          יצירת הלקוח נכשלה: {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "יוצר לקוח..." : "יצירת לקוח"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ביטול
          </button>
        )}
      </div>
    </form>
  );
}
