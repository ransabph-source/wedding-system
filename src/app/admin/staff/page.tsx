"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  createStaff,
  deleteStaff,
  fetchStaff,
  setStaffPassword,
  type NewStaff,
} from "@/lib/api";
import type { StaffAccount } from "@/types/staff";

const MIN_PASSWORD_LENGTH = 6;

const EMPTY_FORM: NewStaff = { name: "", email: "", password: "" };

const inputClasses =
  "w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-inset ring-zinc-200 transition placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500/50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700";

const labelClasses =
  "mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300";

const actionButtonClasses =
  "rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

// request() prefixes the server's message with the method and URL.
function errorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/^.*failed \(\d+\): /, "");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("he-IL");
}

// Staff (hostesses) sign in to the live check-in screens only.
export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let current = true;
    fetchStaff().then(
      (result) => {
        if (!current) return;
        setStaff(result);
        setStatus("ready");
      },
      (err) => {
        console.error(err);
        if (current) setStatus("error");
      },
    );
    return () => {
      current = false;
    };
  }, []);

  return (
    <div className="bg-zinc-100 px-4 py-4 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        <header className="mb-3">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            ניהול צוות
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            חשבונות לדיילות ולצוות האירוע. משתמשי צוות נכנסים רק למסך קבלת
            האורחים (צ&apos;ק-אין).
          </p>
        </header>

        <NewStaffForm
          onCreated={(account) => setStaff((prev) => [account, ...prev])}
        />

        <section className="mt-6">
          <h2 className="mb-2 text-base font-semibold text-zinc-800 dark:text-zinc-100">
            אנשי צוות
            {status === "ready" && (
              <span className="ms-2 text-sm font-normal text-zinc-400 dark:text-zinc-500">
                ({staff.length})
              </span>
            )}
          </h2>

          <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
            {status !== "ready" || staff.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {status === "loading"
                  ? "טוען צוות..."
                  : status === "error"
                    ? "טעינת הצוות נכשלה."
                    : "אין עדיין אנשי צוות."}
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {staff.map((account) => (
                  <StaffRow
                    key={account.userId}
                    account={account}
                    onDeleted={() =>
                      setStaff((prev) =>
                        prev.filter((s) => s.userId !== account.userId),
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function NewStaffForm({
  onCreated,
}: {
  onCreated: (account: StaffAccount) => void;
}) {
  const [form, setForm] = useState<NewStaff>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdEmail, setCreatedEmail] = useState<string | null>(null);

  const update =
    (field: keyof NewStaff) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreatedEmail(null);
    try {
      const account = await createStaff(form);
      setForm(EMPTY_FORM);
      setCreatedEmail(account.email ?? form.email);
      onCreated(account);
    } catch (err) {
      console.error(err);
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-4 rounded-xl bg-white p-4 shadow-md ring-1 ring-black/5 sm:grid-cols-3 dark:bg-zinc-900"
    >
      <div>
        <label htmlFor="staff-name" className={labelClasses}>
          שם
        </label>
        <input
          id="staff-name"
          required
          maxLength={200}
          value={form.name}
          onChange={update("name")}
          placeholder="לדוגמה: מיכל כהן"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor="staff-email" className={labelClasses}>
          אימייל
        </label>
        <input
          id="staff-email"
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
        <label htmlFor="staff-password" className={labelClasses}>
          סיסמה
        </label>
        <input
          id="staff-password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          dir="ltr"
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          className={inputClasses}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:col-span-3 dark:bg-rose-500/10 dark:text-rose-400">
          יצירת איש הצוות נכשלה: {error}
        </p>
      )}
      {createdEmail && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-3 dark:bg-emerald-500/10 dark:text-emerald-400">
          איש הצוות נוצר. כניסה עם <span dir="ltr">{createdEmail}</span> והסיסמה
          שהוגדרה.
        </p>
      )}

      <div className="sm:col-span-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "יוצר..." : "הוספת איש צוות"}
        </button>
      </div>
    </form>
  );
}

function StaffRow({
  account,
  onDeleted,
}: {
  account: StaffAccount;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [notice, setNotice] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const label = account.name || account.email || "איש צוות";

  async function handleDelete() {
    if (!window.confirm(`למחוק את ${label}?\nהחשבון יימחק והגישה תיחסם.`)) {
      return;
    }
    setDeleting(true);
    setNotice(null);
    try {
      await deleteStaff(account.userId);
      onDeleted();
    } catch (err) {
      console.error(err);
      setNotice({ kind: "error", text: `המחיקה נכשלה: ${errorMessage(err)}` });
      setDeleting(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingPassword(true);
    setNotice(null);
    try {
      await setStaffPassword(account.userId, password);
      closePasswordForm();
      setNotice({ kind: "success", text: "הסיסמה עודכנה" });
    } catch (err) {
      console.error(err);
      setNotice({
        kind: "error",
        text: `עדכון הסיסמה נכשל: ${errorMessage(err)}`,
      });
    } finally {
      setSavingPassword(false);
    }
  }

  function closePasswordForm() {
    setEditingPassword(false);
    setPassword("");
  }

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            {account.name || "—"}
          </p>
          <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
            <span dir="ltr">{account.email ?? "—"}</span> · נוצר{" "}
            {formatDate(account.createdAt)} ·{" "}
            {account.lastSignInAt
              ? `כניסה אחרונה ${formatDate(account.lastSignInAt)}`
              : "טרם התחבר/ה"}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() =>
              editingPassword ? closePasswordForm() : setEditingPassword(true)
            }
            disabled={deleting}
            className={`${actionButtonClasses} bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700`}
          >
            שינוי סיסמה
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={`${actionButtonClasses} bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20`}
          >
            {deleting ? "מוחק..." : "מחיקה"}
          </button>
        </div>
      </div>

      {editingPassword && (
        <form
          onSubmit={handlePasswordSubmit}
          className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
        >
          <label
            htmlFor={`password-${account.userId}`}
            className="text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            סיסמה חדשה
          </label>
          <input
            id={`password-${account.userId}`}
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            dir="ltr"
            autoComplete="new-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-48 min-w-0 flex-1 rounded-lg border-0 bg-white px-3 py-1.5 text-sm text-zinc-900 outline-none ring-1 ring-inset ring-zinc-200 transition focus:ring-2 focus:ring-indigo-500/50 sm:flex-none dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
          />
          <button
            type="submit"
            disabled={savingPassword}
            className={`${actionButtonClasses} bg-indigo-600 text-white hover:bg-indigo-700`}
          >
            {savingPassword ? "שומר..." : "שמירה"}
          </button>
          <button
            type="button"
            onClick={closePasswordForm}
            className={`${actionButtonClasses} text-zinc-500 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-700`}
          >
            ביטול
          </button>
        </form>
      )}

      {notice && (
        <p
          className={`text-xs ${
            notice.kind === "success"
              ? "text-emerald-700 dark:text-emerald-400"
              : "text-rose-700 dark:text-rose-400"
          }`}
        >
          {notice.text}
        </p>
      )}
    </li>
  );
}
