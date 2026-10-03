"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { Frank_Ruhl_Libre } from "next/font/google";
import { Rnd } from "react-rnd";
import ThemeDecoration from "@/components/invitation/ThemeDecoration";
import { formatHebrewDate } from "@/lib/hebrewDate";
import {
  formatGregorianDate,
  getTheme,
  parseEventDate,
  type BoundElementKind,
  type InvitationDraft,
  type InvitationElement,
} from "@/lib/invitation";

const invitationFont = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
});

// Class on the resize-handle wrapper, so the image export can leave the
// handles out.
export const HANDLES_CLASS = "invitation-handles";

// Blends a colour with transparency; works for any CSS colour the couple
// picks, not just 6-digit hex.
function fade(color: string, percent: number) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

const CORNER_DIRECTIONS = new Set([
  "topLeft",
  "topRight",
  "bottomLeft",
  "bottomRight",
]);

// Side handles change the width (text re-wraps); corner handles scale the
// whole box, text included.
const RESIZE_HANDLES = {
  left: true,
  right: true,
  topLeft: true,
  topRight: true,
  bottomLeft: true,
  bottomRight: true,
  top: false,
  bottom: false,
};

const cornerHandle = (
  <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-500 bg-white shadow" />
);
const sideHandle = (
  <span className="absolute left-1/2 top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-500 bg-white shadow" />
);
const HANDLE_COMPONENTS = {
  left: sideHandle,
  right: sideHandle,
  topLeft: cornerHandle,
  topRight: cornerHandle,
  bottomLeft: cornerHandle,
  bottomRight: cornerHandle,
};

interface InvitationCanvasProps {
  draft: InvitationDraft;
  canvasRef: RefObject<HTMLDivElement | null>;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string | null) => void;
  onEdit: (id: string | null) => void;
  onChangeElement: (id: string, changes: Partial<InvitationElement>) => void;
  onDeleteElement: (id: string) => void;
  // Double-clicking a form-backed element jumps to its field.
  onFocusField: (kind: BoundElementKind) => void;
}

// Colours come from the draft, so they're inline styles; nothing here uses
// dark: variants, so the downloaded image matches whatever theme the
// device is in.
export default function InvitationCanvas({
  draft,
  canvasRef,
  selectedId,
  editingId,
  onSelect,
  onEdit,
  onChangeElement,
  onDeleteElement,
  onFocusField,
}: InvitationCanvasProps) {
  const theme = getTheme(draft.themeId);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const resizeStart = useRef<{ widthPx: number; fontSize: number } | null>(
    null,
  );

  // Element positions are stored as fractions of the canvas, so track its
  // pixel size to place them (it changes with the window).
  useLayoutEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const measure = () =>
      setSize({ width: node.clientWidth, height: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [canvasRef]);

  const { width: W, height: H } = size;

  return (
    <div
      ref={canvasRef}
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
      style={{
        background: theme.background,
        color: draft.textColor,
        containerType: "inline-size",
      }}
      className={`${invitationFont.className} relative aspect-[4/5] w-full select-none shadow-xl ring-1 ring-black/5`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-3 border"
        style={{ borderColor: fade(draft.accentColor, 75) }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[18px] border"
        style={{ borderColor: fade(draft.accentColor, 35) }}
      />

      <ThemeDecoration theme={theme} accent={draft.accentColor} />

      {W > 0 &&
        draft.elements.map((el) => {
          const isEditing = editingId === el.id && el.kind === "custom";
          const content = isEditing ? (
            <InlineTextEditor
              value={el.text}
              onChange={(text) => onChangeElement(el.id, { text })}
              onDone={() => {
                onEdit(null);
                if (!el.text.trim()) onDeleteElement(el.id);
              }}
            />
          ) : (
            renderContent(el, draft)
          );
          if (content === null) return null;

          const selected = selectedId === el.id;
          const color = el.color === "accent" ? draft.accentColor : draft.textColor;
          const style: CSSProperties = {
            fontSize: `${el.fontSize}cqw`,
            lineHeight: 1.35,
            textAlign: el.align,
            fontWeight: el.bold ? 700 : 400,
            color: MUTED_KINDS.has(el.kind) && el.color === "text"
              ? fade(color, 78)
              : color,
          };

          return (
            <Rnd
              key={el.id}
              bounds="parent"
              size={{ width: el.width * W, height: "auto" }}
              position={{ x: el.x * W, y: el.y * H }}
              minWidth={24}
              enableResizing={selected && !isEditing ? RESIZE_HANDLES : false}
              disableDragging={isEditing}
              resizeHandleWrapperClass={HANDLES_CLASS}
              resizeHandleComponent={HANDLE_COMPONENTS}
              onMouseDown={() => onSelect(el.id)}
              onDragStart={() => onSelect(el.id)}
              onDragStop={(_e, d) => {
                const x = d.x / W;
                const y = d.y / H;
                if (x !== el.x || y !== el.y) onChangeElement(el.id, { x, y });
              }}
              onResizeStart={(_e, _dir, ref) => {
                resizeStart.current = {
                  widthPx: ref.offsetWidth,
                  fontSize: el.fontSize,
                };
              }}
              onResize={(_e, direction, ref, _delta, position) => {
                const start = resizeStart.current;
                if (!start) return;
                const widthPx = ref.offsetWidth;
                onChangeElement(el.id, {
                  width: widthPx / W,
                  x: position.x / W,
                  y: position.y / H,
                  ...(CORNER_DIRECTIONS.has(direction)
                    ? { fontSize: (start.fontSize * widthPx) / start.widthPx }
                    : {}),
                });
              }}
              onResizeStop={() => {
                resizeStart.current = null;
              }}
              className={`touch-none ${isEditing ? "cursor-text" : "cursor-move"} ${
                selected
                  ? "z-10 outline outline-1 outline-dashed outline-indigo-500"
                  : "hover:outline hover:outline-1 hover:outline-indigo-400/60"
              }`}
            >
              <div
                style={style}
                className="whitespace-pre-line break-words px-1 py-0.5"
                onDoubleClick={() => {
                  if (el.kind === "custom") onEdit(el.id);
                  else onFocusField(el.kind);
                }}
              >
                {content}
              </div>
            </Rnd>
          );
        })}
    </div>
  );
}

// Secondary lines are drawn slightly softer than the main text colour.
const MUTED_KINDS = new Set(["greeting", "hebrewDate", "closing"]);

// What each element shows; null hides it (an empty optional field or a
// switched-off line).
function renderContent(
  el: InvitationElement,
  draft: InvitationDraft,
): ReactNode | null {
  const date = parseEventDate(draft.eventDate);

  switch (el.kind) {
    case "bsd":
      return draft.showBsd ? "בס״ד" : null;
    case "ornamentTop":
      return <Ornament color={draft.accentColor} />;
    case "ornamentBottom":
      return <Ornament color={draft.accentColor} flipped />;
    case "greeting":
      return draft.greeting.trim() ? draft.greeting : null;
    case "names":
      return draft.coupleNames.trim() || "שמות בני הזוג";
    case "date":
      return date ? formatGregorianDate(date) : "תאריך האירוע";
    case "hebrewDate":
      return draft.showHebrewDate && date ? formatHebrewDate(date) : null;
    case "times":
      return draft.receptionTime || draft.ceremonyTime ? (
        <TimesRow draft={draft} align={el.align} />
      ) : null;
    case "venue":
      return (
        <>
          <span
            className="block text-[0.6em] tracking-[0.2em]"
            style={{ color: draft.accentColor }}
          >
            המקום
          </span>
          <span className="block font-semibold">
            {draft.venue.trim() || "מיקום האירוע"}
          </span>
        </>
      );
    case "closing":
      return draft.closing.trim() ? draft.closing : null;
    case "parents":
      return draft.brideParents.trim() || draft.groomParents.trim() ? (
        <span
          className="grid grid-cols-2 gap-[1em] border-t pt-[0.6em]"
          style={{ borderColor: fade(draft.accentColor, 40) }}
        >
          {/* An empty side keeps its column, so the other names stay put. */}
          <span className="min-w-0">{draft.brideParents.trim()}</span>
          <span className="min-w-0">{draft.groomParents.trim()}</span>
        </span>
      ) : null;
    case "custom":
      return el.text;
  }
}

const JUSTIFY = { right: "flex-start", center: "center", left: "flex-end" };

function TimesRow({
  draft,
  align,
}: {
  draft: InvitationDraft;
  align: InvitationElement["align"];
}) {
  const slots = [
    { label: "קבלת פנים", time: draft.receptionTime },
    { label: "חופה וקידושין", time: draft.ceremonyTime },
  ].filter((slot) => slot.time);

  return (
    <span
      className="flex items-stretch gap-[1em]"
      style={{ justifyContent: JUSTIFY[align] }}
    >
      {slots.map((slot, i) => (
        <span key={slot.label} className="flex items-stretch gap-[1em]">
          {i > 0 && (
            <span
              aria-hidden="true"
              className="w-px"
              style={{ background: fade(draft.accentColor, 60) }}
            />
          )}
          <span className="flex flex-col items-center">
            <span
              className="text-[0.75em] tracking-wide"
              style={{ color: draft.accentColor }}
            >
              {slot.label}
            </span>
            <span dir="ltr" className="font-semibold tabular-nums">
              {slot.time}
            </span>
          </span>
        </span>
      ))}
    </span>
  );
}

// Grows with its text so the box on the canvas keeps hugging the content.
function InlineTextEditor({
  value,
  onChange,
  onDone,
}: {
  value: string;
  onChange: (value: string) => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label="טקסט התיבה"
      onChange={(e) => onChange(e.target.value)}
      onBlur={onDone}
      onKeyDown={(e) => {
        if (e.key === "Escape") e.currentTarget.blur();
      }}
      // Typing and selecting text mustn't start a drag.
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="block w-full resize-none overflow-hidden bg-transparent p-0 outline-none"
      style={{
        font: "inherit",
        color: "inherit",
        textAlign: "inherit",
        lineHeight: "inherit",
      }}
    />
  );
}

function Ornament({
  color,
  flipped = false,
}: {
  color: string;
  flipped?: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 16"
      className={`block h-auto w-full ${flipped ? "rotate-180" : ""}`}
      fill="none"
      stroke={color}
      strokeWidth={1}
    >
      <path d="M0 8h62M98 8h62" />
      <path d="M80 2l6 6-6 6-6-6z" fill={color} />
      <circle cx="68" cy="8" r="1.5" fill={color} />
      <circle cx="92" cy="8" r="1.5" fill={color} />
    </svg>
  );
}
