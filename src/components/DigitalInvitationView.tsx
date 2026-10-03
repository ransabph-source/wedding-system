"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { toJpeg, toPng } from "html-to-image";
import InvitationCanvas, {
  HANDLES_CLASS,
} from "@/components/invitation/InvitationCanvas";
import PremiumWhatsAppBanner from "@/components/invitation/PremiumWhatsAppBanner";
import ThemeDecoration from "@/components/invitation/ThemeDecoration";
import { formatHebrewDate } from "@/lib/hebrewDate";
import {
  ACCENT_COLOR_PRESETS,
  clearDraft,
  defaultElements,
  draftFromEvent,
  getTheme,
  INVITATION_THEMES,
  loadDraft,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  newCustomElement,
  parseEventDate,
  saveDraft,
  TEXT_COLOR_PRESETS,
  THEME_GROUPS,
  type BoundElementKind,
  type ElementAlign,
  type InvitationDraft,
  type InvitationElement,
} from "@/lib/invitation";
import type { EventRecord } from "@/types/event";

const MAX_GREETING_LENGTH = 300;

type ImageFormat = "png" | "jpeg";

type TextField = {
  [K in keyof InvitationDraft]: InvitationDraft[K] extends string ? K : never;
}[keyof InvitationDraft];

const inputClasses =
  "w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-1 ring-inset ring-zinc-200 transition placeholder:text-zinc-400 focus:ring-2 focus:ring-indigo-500/50 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700";

const labelClasses =
  "mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300";

const checkboxClasses =
  "h-5 w-5 shrink-0 cursor-pointer rounded border-zinc-300 accent-indigo-600 sm:h-4 sm:w-4 dark:border-zinc-600";

// The form control each canvas element is filled from; double-clicking the
// element on the canvas jumps there.
const FIELD_FOR_ELEMENT: Partial<Record<BoundElementKind, string>> = {
  bsd: "inv-show-bsd",
  greeting: "inv-greeting",
  names: "inv-names",
  date: "inv-date",
  hebrewDate: "inv-date",
  times: "inv-reception",
  venue: "inv-venue",
  closing: "inv-closing",
  parents: "inv-bride-parents",
};

function fileName(coupleNames: string, format: ImageFormat) {
  const safeNames = coupleNames.replace(/[\\/:*?"<>|]+/g, "").trim();
  return `הזמנה${safeNames ? ` - ${safeNames}` : ""}.${format === "png" ? "png" : "jpg"}`;
}

function isTypingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export default function DigitalInvitationView({
  eventId,
  event,
}: {
  eventId: string;
  event: EventRecord | undefined;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const editorAreaRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<InvitationDraft>(() =>
    loadDraft(eventId, event),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<ImageFormat | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const selected = draft.elements.find((el) => el.id === selectedId) ?? null;
  const eventDate = parseEventDate(draft.eventDate);

  // Keep the browser copy in step with every change (typing, dragging,
  // resizing), so nothing is lost on refresh.
  useEffect(() => {
    saveDraft(eventId, draft);
  }, [eventId, draft]);

  // Every keystroke and design pick goes straight into the draft the
  // preview renders from.
  function update(changes: Partial<InvitationDraft>) {
    setDraft((prev) => ({ ...prev, ...changes }));
  }

  const field =
    (key: TextField) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      update({ [key]: e.target.value });

  function updateElement(id: string, changes: Partial<InvitationElement>) {
    setDraft((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id ? { ...el, ...changes } : el,
      ),
    }));
  }

  function deleteElement(id: string) {
    setDraft((prev) => ({
      ...prev,
      elements: prev.elements.filter((el) => el.id !== id),
    }));
    setSelectedId((current) => (current === id ? null : current));
    setEditingId((current) => (current === id ? null : current));
  }

  function addTextBox() {
    const el = newCustomElement();
    setDraft((prev) => ({ ...prev, elements: [...prev.elements, el] }));
    setSelectedId(el.id);
    setEditingId(el.id);
  }

  function scaleFont(factor: number) {
    if (!selected) return;
    updateElement(selected.id, {
      fontSize: Math.min(
        MAX_FONT_SIZE,
        Math.max(MIN_FONT_SIZE, selected.fontSize * factor),
      ),
    });
  }

  function focusField(kind: BoundElementKind) {
    const input = document.getElementById(FIELD_FOR_ELEMENT[kind] ?? "");
    if (!input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    input.focus({ preventScroll: true });
  }

  // Clicking anywhere outside the canvas and its toolbar deselects.
  useEffect(() => {
    if (!selectedId) return;
    function handlePointerDown(e: PointerEvent) {
      if (!editorAreaRef.current?.contains(e.target as Node)) {
        setSelectedId(null);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [selectedId]);

  // Keyboard shortcuts for the selected element: arrows nudge it (Shift for
  // bigger steps), Delete removes a custom box, Escape deselects.
  useEffect(() => {
    if (!selectedId || editingId) return;
    const id = selectedId;
    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      const step = e.shiftKey ? 0.02 : 0.005;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      };
      if (e.key in moves) {
        e.preventDefault();
        const [dx, dy] = moves[e.key];
        setDraft((prev) => ({
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === id
              ? {
                  ...el,
                  x: Math.min(1 - el.width, Math.max(0, el.x + dx)),
                  y: Math.min(0.98, Math.max(0, el.y + dy)),
                }
              : el,
          ),
        }));
      } else if (e.key === "Escape") {
        setSelectedId(null);
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        id.startsWith("custom-")
      ) {
        e.preventDefault();
        setDraft((prev) => ({
          ...prev,
          elements: prev.elements.filter((el) => el.id !== id),
        }));
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, editingId]);

  function handleThemeSelect(themeId: string) {
    const theme = getTheme(themeId);
    // A theme brings its own matching colours; they can be changed after.
    update({
      themeId: theme.id,
      textColor: theme.textColor,
      accentColor: theme.accentColor,
    });
  }

  function handleReset() {
    if (
      !window.confirm(
        "לאפס את ההזמנה? כל השינויים יימחקו והפרטים ייטענו מחדש מפרטי האירוע.",
      )
    ) {
      return;
    }
    clearDraft(eventId);
    setSelectedId(null);
    setEditingId(null);
    setDraft(draftFromEvent(event));
  }

  function handleResetLayout() {
    if (
      !window.confirm(
        "להחזיר את כל הטקסטים למיקום המקורי? תיבות טקסט שהוספתם יימחקו.",
      )
    ) {
      return;
    }
    setSelectedId(null);
    setEditingId(null);
    update({ elements: defaultElements() });
  }

  async function handleDownload(format: ImageFormat) {
    // Drop the selection outline and handles before taking the picture.
    flushSync(() => {
      setSelectedId(null);
      setEditingId(null);
    });
    const canvas = canvasRef.current;
    if (!canvas) return;
    setDownloading(format);
    setDownloadError(null);
    try {
      // Rendered at 3x the on-screen size so the image stays sharp when
      // shared or printed.
      const options = {
        pixelRatio: 3,
        cacheBust: true,
        filter: (node: HTMLElement) =>
          !(node.classList && node.classList.contains(HANDLES_CLASS)),
      };
      const dataUrl =
        format === "png"
          ? await toPng(canvas, options)
          : await toJpeg(canvas, {
              ...options,
              quality: 0.95,
              // JPEG has no transparency; anything not painted comes out white.
              backgroundColor: "#FFFFFF",
            });

      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = fileName(draft.coupleNames, format);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      setDownloadError("יצירת התמונה נכשלה. נסו שוב או צלמו מסך של ההזמנה.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    // In RTL the first grid column is on the right: the form sits there and
    // the preview on the left. On phones the wrapper below dissolves
    // (display: contents) so the order becomes preview, form, then actions.
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start">
      <section className="order-2 flex flex-col gap-4 lg:order-none">
        <EditorPanel
          title="פרטי האירוע"
          description="נטענו מפרטי האירוע - אפשר לשנות הכל. השינויים מופיעים מיד בתצוגה."
          action={
            <button
              type="button"
              onClick={handleReset}
              className="min-h-9 shrink-0 rounded-lg px-2.5 text-xs font-semibold text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800 sm:min-h-0 sm:py-1 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              איפוס
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-medium text-zinc-700 sm:col-span-2 dark:text-zinc-200">
              <input
                id="inv-show-bsd"
                type="checkbox"
                checked={draft.showBsd}
                onChange={(e) => update({ showBsd: e.target.checked })}
                className={checkboxClasses}
              />
              הוספת &quot;בס״ד&quot; בראש ההזמנה
            </label>

            <div className="sm:col-span-2">
              <label htmlFor="inv-names" className={labelClasses}>
                שמות בני הזוג
              </label>
              <input
                id="inv-names"
                maxLength={80}
                value={draft.coupleNames}
                onChange={field("coupleNames")}
                placeholder="לדוגמה: נועה ואיתי"
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="inv-date" className={labelClasses}>
                תאריך האירוע
              </label>
              <input
                id="inv-date"
                type="date"
                value={draft.eventDate}
                onChange={field("eventDate")}
                className={inputClasses}
              />
              <label className="mt-2 flex min-h-9 cursor-pointer items-center gap-2 text-sm text-zinc-700 sm:min-h-0 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={draft.showHebrewDate}
                  onChange={(e) =>
                    update({ showHebrewDate: e.target.checked })
                  }
                  className={checkboxClasses}
                />
                <span>
                  הצגת התאריך העברי
                  {eventDate && (
                    <span className="ms-1 text-zinc-400 dark:text-zinc-500">
                      ({formatHebrewDate(eventDate)})
                    </span>
                  )}
                </span>
              </label>
            </div>

            <div>
              <label htmlFor="inv-venue" className={labelClasses}>
                מיקום
              </label>
              <input
                id="inv-venue"
                maxLength={120}
                value={draft.venue}
                onChange={field("venue")}
                placeholder="שם האולם / הגן, עיר"
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="inv-reception" className={labelClasses}>
                קבלת פנים <Optional />
              </label>
              <input
                id="inv-reception"
                type="time"
                value={draft.receptionTime}
                onChange={field("receptionTime")}
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="inv-ceremony" className={labelClasses}>
                חופה וקידושין <Optional />
              </label>
              <input
                id="inv-ceremony"
                type="time"
                value={draft.ceremonyTime}
                onChange={field("ceremonyTime")}
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="inv-bride-parents" className={labelClasses}>
                הורי הכלה <Optional />
              </label>
              <input
                id="inv-bride-parents"
                maxLength={80}
                value={draft.brideParents}
                onChange={field("brideParents")}
                placeholder="לדוגמה: רחל ודוד לוי"
                className={inputClasses}
              />
            </div>

            <div>
              <label htmlFor="inv-groom-parents" className={labelClasses}>
                הורי החתן <Optional />
              </label>
              <input
                id="inv-groom-parents"
                maxLength={80}
                value={draft.groomParents}
                onChange={field("groomParents")}
                placeholder="לדוגמה: מירי ויוסי כהן"
                className={inputClasses}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <label
                  htmlFor="inv-greeting"
                  className="text-xs font-semibold text-zinc-600 dark:text-zinc-300"
                >
                  ברכה אישית
                </label>
                <span className="text-[11px] tabular-nums text-zinc-400 dark:text-zinc-500">
                  {draft.greeting.length}/{MAX_GREETING_LENGTH}
                </span>
              </div>
              <textarea
                id="inv-greeting"
                rows={3}
                maxLength={MAX_GREETING_LENGTH}
                value={draft.greeting}
                onChange={field("greeting")}
                placeholder="כתבו כאן את הברכה שתופיע בהזמנה..."
                className={`${inputClasses} resize-y leading-relaxed`}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="inv-closing" className={labelClasses}>
                שורת סיום <Optional />
              </label>
              <input
                id="inv-closing"
                maxLength={80}
                value={draft.closing}
                onChange={field("closing")}
                className={inputClasses}
              />
            </div>
          </div>
        </EditorPanel>

        <EditorPanel title="הגדרות עיצוב">
          <fieldset>
            <legend className={labelClasses}>רקע</legend>
            <div className="flex flex-col gap-3">
              {THEME_GROUPS.map((group) => (
                <div key={group.kind}>
                  <p className="mb-1.5 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {INVITATION_THEMES.filter(
                      (theme) => theme.kind === group.kind,
                    ).map((theme) => (
                      <ThemeSwatch
                        key={theme.id}
                        themeId={theme.id}
                        selected={draft.themeId === theme.id}
                        onSelect={handleThemeSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>

          <ColorPicker
            legend="צבע הטקסט"
            presets={TEXT_COLOR_PRESETS}
            value={draft.textColor}
            onChange={(textColor) => update({ textColor })}
          />

          <ColorPicker
            legend="צבע העיטורים"
            presets={ACCENT_COLOR_PRESETS}
            value={draft.accentColor}
            onChange={(accentColor) => update({ accentColor })}
          />
        </EditorPanel>
      </section>

      <div className="contents lg:flex lg:flex-col lg:gap-3">
        <section
          ref={editorAreaRef}
          aria-label="תצוגה מקדימה ועריכה ישירה"
          className="order-1 mx-auto flex w-full max-w-md flex-col gap-2 lg:order-none"
        >
          <CanvasToolbar
            selected={selected}
            onAddTextBox={addTextBox}
            onResetLayout={handleResetLayout}
            onScaleFont={scaleFont}
            onChange={(changes) =>
              selected && updateElement(selected.id, changes)
            }
            onEditText={() => selected && setEditingId(selected.id)}
            onDelete={() => selected && deleteElement(selected.id)}
          />
          <InvitationCanvas
            draft={draft}
            canvasRef={canvasRef}
            selectedId={selectedId}
            editingId={editingId}
            onSelect={(id) => {
              setSelectedId(id);
              if (id !== editingId) setEditingId(null);
            }}
            onEdit={setEditingId}
            onChangeElement={updateElement}
            onDeleteElement={deleteElement}
            onFocusField={focusField}
          />
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">
            גררו כדי להזיז · משכו את הידיות כדי לשנות גודל · לחיצה כפולה
            לעריכת הטקסט
          </p>
        </section>

        <div className="order-3 mx-auto flex w-full max-w-md flex-col gap-2 lg:order-none">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDownload("png")}
              disabled={downloading !== null}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-indigo-700 active:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
              </svg>
              {downloading === "png" ? "מכין תמונה..." : "הורדה כתמונה (PNG)"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload("jpeg")}
              disabled={downloading !== null}
              className="min-h-11 shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm ring-1 ring-black/10 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-900 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-zinc-800"
            >
              {downloading === "jpeg" ? "מכין..." : "JPEG"}
            </button>
          </div>
          {downloadError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-400">
              {downloadError}
            </p>
          )}

          <PremiumWhatsAppBanner />
        </div>
      </div>
    </div>
  );
}

function EditorPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-zinc-800 dark:text-zinc-100">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Optional() {
  return (
    <span className="font-normal text-zinc-400 dark:text-zinc-500">
      (רשות)
    </span>
  );
}

function ThemeSwatch({
  themeId,
  selected,
  onSelect,
}: {
  themeId: string;
  selected: boolean;
  onSelect: (themeId: string) => void;
}) {
  const theme = getTheme(themeId);
  return (
    <button
      type="button"
      onClick={() => onSelect(theme.id)}
      aria-pressed={selected}
      className={`group flex flex-col items-center gap-1 rounded-lg p-1 transition ${
        selected
          ? "bg-indigo-50 ring-2 ring-indigo-500 dark:bg-indigo-500/10"
          : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      <span
        aria-hidden="true"
        className="relative grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-md ring-1 ring-black/10"
        style={{ background: theme.background }}
      >
        <ThemeDecoration theme={theme} accent={theme.accentColor} />
        <span
          className="text-sm font-bold"
          style={{ color: theme.textColor }}
        >
          אב
        </span>
      </span>
      <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
        {theme.label}
      </span>
    </button>
  );
}

function ColorPicker({
  legend,
  presets,
  value,
  onChange,
}: {
  legend: string;
  presets: { value: string; label: string }[];
  value: string;
  onChange: (color: string) => void;
}) {
  const isPreset = presets.some(
    (preset) => preset.value.toLowerCase() === value.toLowerCase(),
  );

  return (
    <fieldset>
      <legend className={labelClasses}>{legend}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const selected = preset.value.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              aria-pressed={selected}
              aria-label={preset.label}
              title={preset.label}
              className={`h-9 w-9 rounded-full ring-1 ring-black/15 transition sm:h-8 sm:w-8 dark:ring-white/20 ${
                selected
                  ? "outline-2 outline-offset-2 outline-indigo-500"
                  : "hover:scale-110"
              }`}
              style={{ background: preset.value }}
            />
          );
        })}
        {/* Native picker for any other colour. */}
        <label
          title="צבע אחר"
          className={`relative grid h-9 w-9 cursor-pointer place-items-center overflow-hidden rounded-full ring-1 ring-black/15 sm:h-8 sm:w-8 dark:ring-white/20 ${
            isPreset ? "" : "outline-2 outline-offset-2 outline-indigo-500"
          }`}
          style={{
            background: isPreset
              ? "conic-gradient(#f87171, #facc15, #4ade80, #60a5fa, #c084fc, #f87171)"
              : value,
          }}
        >
          <span className="sr-only">{legend}: צבע אחר</span>
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>
    </fieldset>
  );
}

const toolButtonClasses =
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

function toolToggleClasses(active: boolean) {
  return `${toolButtonClasses} ${
    active
      ? "bg-indigo-600 text-white"
      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
  }`;
}

const ALIGN_OPTIONS: { value: ElementAlign; label: string; icon: string }[] = [
  { value: "right", label: "יישור לימין", icon: "M4 6h16M10 12h10M4 18h16" },
  { value: "center", label: "מרכוז", icon: "M4 6h16M7 12h10M4 18h16" },
  { value: "left", label: "יישור לשמאל", icon: "M4 6h16M4 12h10M4 18h16" },
];

// Formatting for whichever canvas element is selected. Always visible
// (disabled with nothing selected), so it doesn't jump around on phones.
function CanvasToolbar({
  selected,
  onAddTextBox,
  onResetLayout,
  onScaleFont,
  onChange,
  onEditText,
  onDelete,
}: {
  selected: InvitationElement | null;
  onAddTextBox: () => void;
  onResetLayout: () => void;
  onScaleFont: (factor: number) => void;
  onChange: (changes: Partial<InvitationElement>) => void;
  onEditText: () => void;
  onDelete: () => void;
}) {
  const isOrnament =
    selected?.kind === "ornamentTop" || selected?.kind === "ornamentBottom";
  const textDisabled = !selected || isOrnament;
  const neutral =
    "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800";

  return (
    <div
      role="toolbar"
      aria-label="עיצוב הטקסט הנבחר"
      // Keeps the selection while clicking toolbar buttons.
      onMouseDown={(e) => e.preventDefault()}
      className="flex flex-wrap items-center gap-1 rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-black/5 dark:bg-zinc-900"
    >
      <button
        type="button"
        onClick={onAddTextBox}
        className={`${toolButtonClasses} gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20`}
      >
        <span aria-hidden="true">+</span> תיבת טקסט
      </button>

      <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-zinc-200 dark:bg-zinc-700" />

      <button
        type="button"
        onClick={() => onScaleFont(1 / 1.1)}
        disabled={textDisabled}
        aria-label="הקטנת גופן"
        title="הקטנת גופן"
        className={`${toolButtonClasses} ${neutral} text-xs`}
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => onScaleFont(1.1)}
        disabled={textDisabled}
        aria-label="הגדלת גופן"
        title="הגדלת גופן"
        className={`${toolButtonClasses} ${neutral} text-base`}
      >
        A+
      </button>
      <button
        type="button"
        onClick={() => selected && onChange({ bold: !selected.bold })}
        disabled={textDisabled}
        aria-pressed={selected?.bold ?? false}
        aria-label="הדגשה"
        title="הדגשה"
        className={toolToggleClasses(Boolean(selected?.bold) && !isOrnament)}
      >
        B
      </button>

      {ALIGN_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange({ align: option.value })}
          disabled={textDisabled}
          aria-pressed={selected?.align === option.value}
          aria-label={option.label}
          title={option.label}
          className={toolToggleClasses(
            selected?.align === option.value && !isOrnament,
          )}
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d={option.icon} />
          </svg>
        </button>
      ))}

      <button
        type="button"
        onClick={() =>
          selected &&
          onChange({ color: selected.color === "accent" ? "text" : "accent" })
        }
        disabled={textDisabled}
        aria-pressed={selected?.color === "accent"}
        title="צבע הטקסט / צבע העיטורים"
        className={toolToggleClasses(
          selected?.color === "accent" && !isOrnament,
        )}
      >
        צבע עיטור
      </button>

      {selected?.kind === "custom" && (
        <>
          <button
            type="button"
            onClick={onEditText}
            className={`${toolButtonClasses} ${neutral}`}
          >
            עריכה
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="מחיקת תיבת הטקסט"
            title="מחיקת תיבת הטקסט"
            className={`${toolButtonClasses} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10`}
          >
            מחיקה
          </button>
        </>
      )}

      <button
        type="button"
        onClick={onResetLayout}
        className={`${toolButtonClasses} ${neutral} ms-auto text-xs font-medium`}
      >
        איפוס פריסה
      </button>
    </div>
  );
}
