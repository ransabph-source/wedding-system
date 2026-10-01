"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  deleteClient,
  deleteEvent,
  fetchClients,
  setClientPassword,
} from "@/lib/api";
import type { ClientAccount } from "@/types/client";

const MIN_PASSWORD_LENGTH = 6;

// request() prefixes the server's message with the method and URL.
function errorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/^.*failed \(\d+\): /, "");
}

const actionButtonClasses =
  "rounded-lg px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

interface ClientListProps {
  // Change this to reload the list, e.g. after creating a client.
  reloadKey: number;
  // Called after a client is deleted, so other views can refresh.
  onDeleted?: () => void;
}

export default function ClientList({ reloadKey, onDeleted }: ClientListProps) {
  const [clients, setClients] = useState<ClientAccount[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    // Ignore a response that lands after a newer reload started.
    let current = true;
    fetchClients().then(
      (result) => {
        if (!current) return;
        setClients(result);
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
  }, [reloadKey]);

  function handleDeleted(key: string) {
    setClients((prev) => prev.filter((client) => client.key !== key));
    onDeleted?.();
  }

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-base font-semibold text-zinc-800 dark:text-zinc-100">
        לקוחות קיימים
        {status === "ready" && (
          <span className="ms-2 text-sm font-normal text-zinc-400 dark:text-zinc-500">
            ({clients.length})
          </span>
        )}
      </h2>

      <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
        {status !== "ready" || clients.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {status === "loading"
              ? "טוען לקוחות..."
              : status === "error"
                ? "טעינת הלקוחות נכשלה."
                : "אין עדיין לקוחות."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {clients.map((client) => (
              <ClientRow
                key={client.key}
                client={client}
                onDeleted={() => handleDeleted(client.key)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
        {label}
      </dt>
      <dd className="truncate text-sm text-zinc-700 dark:text-zinc-200">
        {children}
      </dd>
    </div>
  );
}

function ClientRow({
  client,
  onDeleted,
}: {
  client: ClientAccount;
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

  const { userId } = client;
  const label = client.coupleNames || client.email || "לקוח";

  // A row without an account (e.g. a legacy mock event) is deleted by event.
  async function handleDelete() {
    const confirmed = window.confirm(
      userId
        ? `למחוק את ${label}?\nהחשבון, האירוע וכל המוזמנים וההושבה שלו יימחקו לצמיתות.`
        : `למחוק את ${label}?\nהאירוע וכל המוזמנים וההושבה שלו יימחקו לצמיתות.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    setNotice(null);
    try {
      if (userId) {
        await deleteClient(userId);
      } else {
        for (const event of client.events) await deleteEvent(event.id);
      }
      onDeleted();
    } catch (err) {
      console.error(err);
      setNotice({ kind: "error", text: `המחיקה נכשלה: ${errorMessage(err)}` });
      setDeleting(false);
    }
  }

  async function handlePasswordSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userId) return;
    setSavingPassword(true);
    setNotice(null);
    try {
      await setClientPassword(userId, password);
      setPassword("");
      setEditingPassword(false);
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

  // Most clients have exactly one event; show a row of details per event.
  const events = client.events.length > 0 ? client.events : [null];

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {events.map((event, i) => (
            <dl
              key={event?.id ?? i}
              className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4"
            >
              <Detail label="שמות בני הזוג">
                {event ? (
                  <Link
                    href={`/couple/${event.id}`}
                    className="font-semibold text-zinc-800 underline-offset-2 hover:underline dark:text-zinc-100"
                  >
                    {event.coupleNames}
                  </Link>
                ) : (
                  <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                    {client.coupleNames || "—"}
                  </span>
                )}
              </Detail>
              <Detail label="אימייל">
                {userId ? (
                  <span dir="ltr">{client.email ?? "—"}</span>
                ) : (
                  <span className="text-zinc-400 dark:text-zinc-500">
                    ללא חשבון
                  </span>
                )}
              </Detail>
              <Detail label="תאריך האירוע">
                {event ? event.eventDate : "אין אירוע"}
              </Detail>
              <Detail label="מיקום">{event?.venue || "—"}</Detail>
            </dl>
          ))}
        </div>

        <div className="flex shrink-0 gap-2">
          {/* Only accounts have a password; delete is always available. */}
          {userId && (
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
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className={`${actionButtonClasses} bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20`}
          >
            {deleting ? "מוחק..." : "מחיקת לקוח"}
          </button>
        </div>
      </div>

      {userId && editingPassword && (
        <form
          onSubmit={handlePasswordSubmit}
          className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50"
        >
          <label
            htmlFor={`password-${client.key}`}
            className="text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          >
            סיסמה חדשה
          </label>
          <input
            id={`password-${client.key}`}
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
