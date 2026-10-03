"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createLead, deleteLead, fetchLeads, updateLead } from "@/lib/api";
import { useEventEngine } from "@/lib/eventEngine";
import {
  LEAD_STATUSES,
  MAX_NOTES_LENGTH,
  type Lead,
  type LeadInput,
  type LeadStatus,
} from "@/types/lead";
import NewClientForm, { type CreatedClient } from "./NewClientForm";

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "חדש",
  contacted: "יצרנו קשר",
  proposal_sent: "הצעה נשלחה",
  won: "נסגר בהצלחה",
  closed: "סגר",
  lost: "אבד",
};

const STATUS_CLASSES: Record<LeadStatus, string> = {
  new: "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
  contacted:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400",
  proposal_sent:
    "bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  closed: "bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400",
  lost: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

// Suggestions only; any event type can be typed.
const EVENT_TYPES = ["חתונה", "בר מצווה", "בת מצווה", "ברית", "אירוע חברה"];

type LeadsView = "open" | "done";

const inputClasses =
  "w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-inset ring-zinc-200 transition placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500/50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700";

const labelClasses =
  "mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300";

// Taller on phones so they're comfortable touch targets.
const buttonClasses =
  "inline-flex min-h-10 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-0";

const errorClasses =
  "rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400";

// request() prefixes the server's message with the method and URL.
function errorMessage(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/^.*failed \(\d+\): /, "");
}

function todayIso() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Adds a timestamped entry to the end of a lead's notes log.
function appendNote(notes: string, entry: string) {
  const stamp = new Date().toLocaleString("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const line = `[${stamp}] ${entry.trim()}`;
  return notes.trim() ? `${notes.trimEnd()}\n${line}` : line;
}

// Same order as the API: soonest follow-up first, then undated leads,
// newest first.
function compareLeads(a: Lead, b: Lead) {
  if (a.followUpDate !== b.followUpDate) {
    if (!a.followUpDate) return 1;
    if (!b.followUpDate) return -1;
    return a.followUpDate < b.followUpDate ? -1 : 1;
  }
  return b.createdAt.localeCompare(a.createdAt);
}

function isOpen(lead: Lead) {
  return (
    lead.status !== "won" && lead.status !== "closed" && lead.status !== "lost"
  );
}

function viewTabClasses(active: boolean) {
  return `min-h-9 flex-1 rounded-md px-2.5 py-1 text-xs font-semibold transition sm:min-h-0 sm:flex-none ${
    active
      ? "bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900"
      : "text-zinc-500 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800"
  }`;
}

export default function LeadsPanel() {
  const { refreshEvents } = useEventEngine();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [view, setView] = useState<LeadsView>("open");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [notice, setNotice] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);

  useEffect(() => {
    let current = true;
    fetchLeads().then(
      (result) => {
        if (!current) return;
        setLeads(result);
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

  const sortedLeads = useMemo(() => [...leads].sort(compareLeads), [leads]);
  const openCount = leads.filter(isOpen).length;
  const visibleLeads = sortedLeads.filter((lead) =>
    view === "open" ? isOpen(lead) : !isOpen(lead),
  );
  const today = todayIso();

  function replaceLead(lead: Lead) {
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? lead : l)));
  }

  async function handleCreate(input: LeadInput) {
    const lead = await createLead(input);
    setLeads((prev) => [...prev, lead]);
    setCreating(false);
  }

  async function handleUpdate(id: string, input: Partial<LeadInput>) {
    replaceLead(await updateLead(id, input));
  }

  async function handleDelete(id: string) {
    await deleteLead(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setEditingId(null);
  }

  // The event already exists at this point, so the modal closes either way;
  // a failed lead update is reported instead of inviting a second event.
  async function handleConverted(lead: Lead, { event }: CreatedClient) {
    setConvertingLead(null);
    refreshEvents().catch(console.error);
    try {
      replaceLead(
        await updateLead(lead.id, {
          status: "closed",
          notes: appendNote(
            lead.notes,
            `הומר לאירוע: ${event.venue} · ${event.eventDate}`,
          ),
        }),
      );
      setNotice({
        kind: "success",
        message: `האירוע של ${event.coupleNames} נוצר והליד סומן כ"סגר". הוא מופיע עכשיו בלשונית "אירועים סגורים".`,
      });
    } catch (err) {
      console.error(err);
      setNotice({
        kind: "error",
        message: `האירוע נוצר, אך עדכון הליד ל"סגר" נכשל: ${errorMessage(err)}. עדכנו את הסטטוס ידנית.`,
      });
    }
  }

  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 sm:mb-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            לידים
          </h2>
          {status === "ready" && (
            <div className="flex gap-0.5 rounded-lg bg-zinc-200/60 p-0.5 sm:inline-flex dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setView("open")}
                className={viewTabClasses(view === "open")}
              >
                לידים פתוחים ({openCount})
              </button>
              <button
                type="button"
                onClick={() => setView("done")}
                className={viewTabClasses(view === "done")}
              >
                סגורים ואבודים ({leads.length - openCount})
              </button>
            </div>
          )}
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setEditingId(null);
            }}
            className={`${buttonClasses} w-full bg-indigo-600 text-white shadow hover:bg-indigo-700 sm:w-auto`}
          >
            + ליד חדש
          </button>
        )}
      </div>

      {notice && (
        <div
          role="status"
          className={`mb-3 flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm ring-1 ${
            notice.kind === "success"
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20"
              : "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/20"
          }`}
        >
          <p>{notice.message}</p>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="סגירת ההודעה"
            className="-m-2 grid h-9 w-9 shrink-0 place-items-center opacity-60 transition hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {creating && (
        <div className="mb-3 rounded-xl bg-white p-3 shadow-md sm:p-4 ring-1 ring-black/5 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            ליד חדש
          </h3>
          <LeadForm
            submitLabel="הוספת ליד"
            onSubmit={handleCreate}
            onCancel={() => setCreating(false)}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-xl bg-white shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
        {status !== "ready" || visibleLeads.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            {status === "loading"
              ? "טוען לידים..."
              : status === "error"
                ? "טעינת הלידים נכשלה."
                : leads.length === 0
                  ? "אין עדיין לידים. הוסיפו את הראשון עם \"ליד חדש\"."
                  : view === "open"
                    ? "אין לידים פתוחים."
                    : "אין עדיין לידים סגורים או אבודים."}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {visibleLeads.map((lead) =>
              editingId === lead.id ? (
                <li key={lead.id} className="bg-zinc-50/60 px-3 py-4 sm:px-4 dark:bg-zinc-800/30">
                  <LeadForm
                    initial={lead}
                    submitLabel="שמירה"
                    onSubmit={async (input) => {
                      await handleUpdate(lead.id, input);
                      setEditingId(null);
                    }}
                    onCancel={() => setEditingId(null)}
                    onDelete={() => handleDelete(lead.id)}
                  />
                </li>
              ) : (
                <li key={lead.id}>
                  <LeadCard
                    lead={lead}
                    overdue={
                      isOpen(lead) &&
                      lead.followUpDate !== null &&
                      lead.followUpDate < today
                    }
                    onUpdate={(changes) => handleUpdate(lead.id, changes)}
                    onEdit={() => {
                      setEditingId(lead.id);
                      setCreating(false);
                    }}
                    onConvert={() => {
                      setNotice(null);
                      setConvertingLead(lead);
                    }}
                  />
                </li>
              ),
            )}
          </ul>
        )}
      </div>

      {convertingLead && (
        <ConvertLeadModal
          lead={convertingLead}
          onClose={() => setConvertingLead(null)}
          onCreated={(created) => handleConverted(convertingLead, created)}
        />
      )}
    </section>
  );
}

function LeadCard({
  lead,
  overdue,
  onUpdate,
  onEdit,
  onConvert,
}: {
  lead: Lead;
  overdue: boolean;
  onUpdate: (changes: Partial<LeadInput>) => Promise<void>;
  onEdit: () => void;
  onConvert: () => void;
}) {
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState(lead.followUpDate ?? "");
  const [pending, setPending] = useState<"status" | "note" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const idPrefix = `lead-card-${lead.id}`;

  // The log is chronological, so keep the latest call in view.
  useEffect(() => {
    const box = notesRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [lead.notes]);

  async function run(kind: "status" | "note", action: () => Promise<void>) {
    setPending(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(`השמירה נכשלה: ${errorMessage(err)}`);
    } finally {
      setPending(null);
    }
  }

  function handleStatusChange(status: LeadStatus) {
    void run("status", () => onUpdate({ status }));
  }

  function handleAddNote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!note.trim()) return;
    void run("note", async () => {
      await onUpdate({
        notes: appendNote(lead.notes, note),
        followUpDate: followUpDate || null,
      });
      setNote("");
    });
  }

  const details = [
    lead.eventType,
    lead.phone && (
      <a
        key="phone"
        href={`tel:${lead.phone}`}
        dir="ltr"
        className="underline-offset-2 hover:underline"
      >
        {lead.phone}
      </a>
    ),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3 px-3 py-3 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-zinc-800 sm:text-sm dark:text-zinc-100">
            {lead.names}
          </p>
          <p className="mt-0.5 text-sm text-zinc-500 sm:text-xs dark:text-zinc-400">
            {details.map((detail, i) => (
              <span key={i}>
                {i > 0 && " · "}
                {detail}
              </span>
            ))}
            {lead.followUpDate && (
              <span
                className={
                  overdue ? "font-semibold text-rose-600 dark:text-rose-400" : ""
                }
              >
                {details.length > 0 && " · "}
                {overdue ? "מעקב באיחור: " : "מעקב עד "}
                {lead.followUpDate}
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <label htmlFor={`${idPrefix}-status`} className="sr-only">
            סטטוס הליד
          </label>
          <select
            id={`${idPrefix}-status`}
            value={lead.status}
            disabled={pending !== null}
            onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            className={`min-h-10 rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none ring-1 ring-inset ring-black/5 transition focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-60 sm:min-h-0 sm:px-2.5 ${STATUS_CLASSES[lead.status]}`}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          {lead.status !== "closed" && (
            <button
              type="button"
              onClick={onConvert}
              disabled={pending !== null}
              className={`${buttonClasses} bg-teal-600 text-xs text-white shadow hover:bg-teal-700`}
            >
              המר לאירוע
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            disabled={pending !== null}
            aria-label={`עריכת הליד ${lead.names}`}
            className={`${buttonClasses} text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`}
          >
            עריכה
          </button>
        </div>
      </div>

      {lead.notes && (
        <div
          ref={notesRef}
          className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-zinc-50 px-3 py-2 text-sm leading-relaxed sm:max-h-32 sm:text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-300"
        >
          {lead.notes}
        </div>
      )}

      <form
        onSubmit={handleAddNote}
        className="grid grid-cols-[1fr_auto] items-end gap-2 sm:flex sm:flex-wrap"
      >
        <div className="col-span-2 sm:min-w-48 sm:flex-1">
          <label htmlFor={`${idPrefix}-note`} className="sr-only">
            הערה על השיחה
          </label>
          <input
            id={`${idPrefix}-note`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            placeholder="סיכום השיחה האחרונה..."
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-followUp`}
            className="mb-0.5 block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400"
          >
            מעקב הבא
          </label>
          <input
            id={`${idPrefix}-followUp`}
            type="date"
            value={followUpDate}
            onChange={(e) => setFollowUpDate(e.target.value)}
            className={inputClasses}
          />
        </div>
        <button
          type="submit"
          disabled={pending !== null || !note.trim()}
          className={`${buttonClasses} bg-indigo-600 py-2 text-white shadow hover:bg-indigo-700`}
        >
          {pending === "note" ? "שומר..." : "הוספת הערה"}
        </button>
      </form>

      {error && <p className={errorClasses}>{error}</p>}
    </div>
  );
}

function ConvertLeadModal({
  lead,
  onClose,
  onCreated,
}: {
  lead: Lead;
  onClose: () => void;
  onCreated: (created: CreatedClient) => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="convert-lead-title"
    >
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto overscroll-contain rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] sm:max-h-full sm:rounded-3xl sm:pb-0 shadow-2xl ring-1 ring-black/5 transition duration-200 starting:scale-95 starting:opacity-0 dark:bg-zinc-900">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-100 bg-white p-4 sm:p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="min-w-0">
            <h2
              id="convert-lead-title"
              className="text-lg font-bold text-zinc-900 dark:text-zinc-50"
            >
              המרה לאירוע: {lead.names}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              פתיחת חשבון לזוג ויצירת האירוע. לאחר היצירה הליד יסומן כ&quot;סגר&quot;.
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

        <NewClientForm
          idPrefix={`convert-${lead.id}`}
          className="p-4 sm:p-5"
          initial={{ coupleNames: lead.names, phone: lead.phone }}
          onCreated={onCreated}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}

interface FormState {
  names: string;
  phone: string;
  eventType: string;
  status: LeadStatus;
  followUpDate: string;
  notes: string;
}

function toFormState(lead?: Lead): FormState {
  return {
    names: lead?.names ?? "",
    phone: lead?.phone ?? "",
    eventType: lead?.eventType ?? "",
    status: lead?.status ?? "new",
    followUpDate: lead?.followUpDate ?? "",
    notes: lead?.notes ?? "",
  };
}

function LeadForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial?: Lead;
  submitLabel: string;
  onSubmit: (input: LeadInput) => Promise<void>;
  onCancel: () => void;
  // Shown only when editing an existing lead.
  onDelete?: () => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [pending, setPending] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idPrefix = initial ? `lead-${initial.id}` : "lead-new";

  const update =
    (field: keyof FormState) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function run(kind: "save" | "delete", action: () => Promise<void>) {
    setPending(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(err);
      setError(
        `${kind === "save" ? "השמירה" : "המחיקה"} נכשלה: ${errorMessage(err)}`,
      );
      setPending(null);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void run("save", () =>
      onSubmit({
        names: form.names.trim(),
        phone: form.phone.trim(),
        eventType: form.eventType.trim(),
        status: form.status,
        followUpDate: form.followUpDate || null,
        notes: form.notes.trim(),
      }),
    );
  }

  function handleDelete() {
    if (!onDelete || !initial) return;
    if (!window.confirm(`למחוק את הליד של ${initial.names}? לא ניתן לבטל.`)) {
      return;
    }
    void run("delete", onDelete);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-names`} className={labelClasses}>
          שמות
        </label>
        <input
          id={`${idPrefix}-names`}
          required
          maxLength={200}
          autoFocus
          value={form.names}
          onChange={update("names")}
          placeholder="לדוגמה: נועה ואיתי כהן"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-phone`} className={labelClasses}>
          טלפון
        </label>
        <input
          id={`${idPrefix}-phone`}
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
        <label htmlFor={`${idPrefix}-eventType`} className={labelClasses}>
          סוג אירוע
        </label>
        <input
          id={`${idPrefix}-eventType`}
          list="lead-event-types"
          maxLength={200}
          value={form.eventType}
          onChange={update("eventType")}
          className={inputClasses}
        />
        <datalist id="lead-event-types">
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-status`} className={labelClasses}>
          סטטוס
        </label>
        <select
          id={`${idPrefix}-status`}
          value={form.status}
          onChange={update("status")}
          className={inputClasses}
        >
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-followUpDate`} className={labelClasses}>
          תאריך מעקב
        </label>
        <input
          id={`${idPrefix}-followUpDate`}
          type="date"
          value={form.followUpDate}
          onChange={update("followUpDate")}
          className={inputClasses}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`${idPrefix}-notes`} className={labelClasses}>
          הערות
        </label>
        <textarea
          id={`${idPrefix}-notes`}
          rows={5}
          maxLength={MAX_NOTES_LENGTH}
          value={form.notes}
          onChange={update("notes")}
          className={inputClasses}
        />
      </div>

      {error && <p className={`${errorClasses} sm:col-span-2`}>{error}</p>}

      <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={pending !== null}
          className={`${buttonClasses} bg-indigo-600 text-white shadow hover:bg-indigo-700`}
        >
          {pending === "save" ? "שומר..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending !== null}
          className={`${buttonClasses} text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800`}
        >
          ביטול
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending !== null}
            className={`${buttonClasses} ms-auto bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20`}
          >
            {pending === "delete" ? "מוחק..." : "מחיקת ליד"}
          </button>
        )}
      </div>
    </form>
  );
}
