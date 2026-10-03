import type { EventRecord } from "@/types/event";

export type ThemeKind = "solid" | "gradient" | "floral" | "themed";

// Illustrated overlays drawn over the background (see ThemeDecoration).
export type ThemeMotif = "tefillin" | "couple" | "kotel" | "romantic";

export interface InvitationTheme {
  id: string;
  label: string;
  kind: ThemeKind;
  // Any CSS background value (a colour or a gradient).
  background: string;
  // Defaults applied when the theme is picked; the couple can override them.
  textColor: string;
  accentColor: string;
  // Floral themes draw SVG bouquets in the corners.
  floral?: { petals: [string, string]; leaves: string };
  motif?: ThemeMotif;
}

export const INVITATION_THEMES: InvitationTheme[] = [
  // Solid pastels
  { id: "ivory", label: "שנהב", kind: "solid", background: "#FAF7F0", textColor: "#3F3A33", accentColor: "#C9A96E" },
  { id: "blush", label: "ורוד אבקה", kind: "solid", background: "#F8E8E6", textColor: "#5A3E3E", accentColor: "#C98B8B" },
  { id: "sage", label: "מרווה", kind: "solid", background: "#E8EEE4", textColor: "#3B4A3A", accentColor: "#8DA585" },
  { id: "sky", label: "תכלת", kind: "solid", background: "#E7EFF6", textColor: "#2F3E52", accentColor: "#8FA9C4" },
  { id: "lavender", label: "לבנדר", kind: "solid", background: "#EEE9F5", textColor: "#463E5C", accentColor: "#A796C6" },
  // Subtle gradients
  { id: "champagne", label: "שמפניה", kind: "gradient", background: "linear-gradient(160deg, #FFF8EC 0%, #F3DFC1 100%)", textColor: "#4A3B2A", accentColor: "#B8925A" },
  { id: "rose-gold", label: "רוז גולד", kind: "gradient", background: "linear-gradient(160deg, #FDF1EE 0%, #E9C3BC 100%)", textColor: "#5B3A36", accentColor: "#B97A6F" },
  { id: "morning-mist", label: "ערפל בוקר", kind: "gradient", background: "linear-gradient(170deg, #F4F7FB 0%, #DCE6F0 55%, #EDE4F3 100%)", textColor: "#34405A", accentColor: "#9AA8C7" },
  { id: "twilight", label: "דמדומים", kind: "gradient", background: "linear-gradient(160deg, #1F2A44 0%, #3B2F5C 100%)", textColor: "#F5EEDC", accentColor: "#D9B26F" },
  { id: "emerald", label: "אמרלד", kind: "gradient", background: "linear-gradient(160deg, #0F3D33 0%, #1E5A4A 100%)", textColor: "#F4EBD6", accentColor: "#D4B26A" },
  // Floral
  { id: "floral-blush", label: "פרחים ורודים", kind: "floral", background: "#FFF9F7", textColor: "#4E3B3B", accentColor: "#C98B8B", floral: { petals: ["#E8A6A6", "#F4CFCB"], leaves: "#9DB59A" } },
  { id: "floral-garden", label: "גן קיצי", kind: "floral", background: "#FBFAF4", textColor: "#3D4A35", accentColor: "#C9A35A", floral: { petals: ["#E9B872", "#F5DDB0"], leaves: "#7E9C76" } },
  { id: "floral-lavender", label: "פרחי לילך", kind: "floral", background: "#F7F5FB", textColor: "#463E5C", accentColor: "#A796C6", floral: { petals: ["#B9A6D9", "#DCD1EF"], leaves: "#8FAF95" } },
  // Themed illustrations
  { id: "tefillin", label: "עיטורי תפילין", kind: "themed", background: "linear-gradient(180deg, #FBF8F1 0%, #F1EADB 100%)", textColor: "#1E2A44", accentColor: "#B8924A", motif: "tefillin" },
  { id: "bride-groom", label: "חתן וכלה", kind: "themed", background: "linear-gradient(180deg, #FFF8F5 0%, #F6E3DD 100%)", textColor: "#4A3438", accentColor: "#B9857A", motif: "couple" },
  { id: "kotel", label: "הכותל המערבי", kind: "themed", background: "linear-gradient(180deg, #FBF6EA 0%, #F2E6CC 100%)", textColor: "#3E3222", accentColor: "#A8854A", motif: "kotel" },
  { id: "romantic", label: "רומנטיקה", kind: "themed", background: "radial-gradient(circle at 50% 38%, #FFF9F9 0%, #F8E0E4 100%)", textColor: "#5A2E3A", accentColor: "#C46A7E", motif: "romantic" },
];

export const THEME_GROUPS: { kind: ThemeKind; label: string }[] = [
  { kind: "solid", label: "צבע אחיד" },
  { kind: "gradient", label: "מעברי צבע" },
  { kind: "floral", label: "פרחוני" },
  { kind: "themed", label: "עיצובים לפי נושא" },
];

export const TEXT_COLOR_PRESETS = [
  { value: "#2B2B2B", label: "פחם" },
  { value: "#4A3B2A", label: "חום חם" },
  { value: "#24344F", label: "כחול לילה" },
  { value: "#6B2737", label: "בורדו" },
  { value: "#2F4A3A", label: "ירוק יער" },
  { value: "#A8823F", label: "זהב" },
  { value: "#FFFFFF", label: "לבן" },
];

export const ACCENT_COLOR_PRESETS = [
  { value: "#C9A96E", label: "זהב" },
  { value: "#C98B8B", label: "ורוד עתיק" },
  { value: "#8DA585", label: "מרווה" },
  { value: "#A7AEB8", label: "כסף" },
  { value: "#24344F", label: "כחול לילה" },
  { value: "#FFFFFF", label: "לבן" },
];

export const DEFAULT_GREETING =
  "בשמחה רבה ובהתרגשות גדולה אנו מתכבדים להזמינכם לחגוג עימנו את יום נישואינו";

export const DEFAULT_CLOSING = "נשמח לראותכם";

// Text and decorations placed freely on the invitation canvas. Every field
// from the form has one fixed element (its id is its kind); couples can add
// any number of "custom" text boxes too.
export const BOUND_ELEMENT_KINDS = [
  "bsd",
  "ornamentTop",
  "greeting",
  "names",
  "ornamentBottom",
  "date",
  "hebrewDate",
  "times",
  "venue",
  "closing",
  "parents",
] as const;

export type BoundElementKind = (typeof BOUND_ELEMENT_KINDS)[number];
export type ElementKind = BoundElementKind | "custom";
export type ElementAlign = "right" | "center" | "left";

export interface InvitationElement {
  id: string;
  kind: ElementKind;
  // Top-left corner as a fraction of the canvas width / height, and width as
  // a fraction of the canvas width, so the layout scales with the preview
  // and the exported image. Height always follows the text.
  x: number;
  y: number;
  width: number;
  // Percent of the canvas width (CSS cqw units).
  fontSize: number;
  align: ElementAlign;
  bold: boolean;
  color: "text" | "accent";
  // Custom text boxes only; bound elements show their form field.
  text: string;
}

export interface InvitationDraft {
  coupleNames: string;
  // YYYY-MM-DD, as stored on the event.
  eventDate: string;
  venue: string;
  brideParents: string;
  groomParents: string;
  // HH:MM or empty when not shown.
  receptionTime: string;
  ceremonyTime: string;
  greeting: string;
  closing: string;
  themeId: string;
  textColor: string;
  accentColor: string;
  showBsd: boolean;
  showHebrewDate: boolean;
  elements: InvitationElement[];
}

export const MIN_FONT_SIZE = 1.5;
export const MAX_FONT_SIZE = 20;

function element(
  kind: ElementKind,
  y: number,
  width: number,
  fontSize: number,
  extra: Partial<InvitationElement> = {},
): InvitationElement {
  return {
    id: kind,
    kind,
    x: (1 - width) / 2,
    y,
    width,
    fontSize,
    align: "center",
    bold: false,
    color: "text",
    text: "",
    ...extra,
  };
}

// The classic centred layout the canvas starts from.
export function defaultElements(): InvitationElement[] {
  return [
    element("bsd", 0.045, 0.14, 2.8, { x: 0.8, align: "right" }),
    element("ornamentTop", 0.11, 0.36, 3.6, { color: "accent" }),
    element("greeting", 0.155, 0.8, 3.6),
    element("names", 0.28, 0.88, 10.5, { bold: true }),
    element("ornamentBottom", 0.415, 0.36, 3.6, { color: "accent" }),
    element("date", 0.46, 0.84, 4.4, { bold: true }),
    element("hebrewDate", 0.515, 0.7, 3.2),
    element("times", 0.57, 0.84, 3.5),
    element("venue", 0.655, 0.84, 4.4),
    element("closing", 0.77, 0.7, 3.5),
    element("parents", 0.83, 0.84, 3.2),
  ];
}

export function newCustomElement(): InvitationElement {
  return {
    ...element("custom", 0.45, 0.5, 4),
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    text: "טקסט חדש",
  };
}

export function getTheme(themeId: string): InvitationTheme {
  return (
    INVITATION_THEMES.find((theme) => theme.id === themeId) ??
    INVITATION_THEMES[0]
  );
}

export function draftFromEvent(event: EventRecord | undefined): InvitationDraft {
  const theme = INVITATION_THEMES[0];
  return {
    coupleNames: event?.coupleNames ?? "",
    eventDate: event?.eventDate ?? "",
    venue: event?.venue ?? "",
    brideParents: "",
    groomParents: "",
    receptionTime: "",
    ceremonyTime: "",
    greeting: DEFAULT_GREETING,
    closing: DEFAULT_CLOSING,
    themeId: theme.id,
    textColor: theme.textColor,
    accentColor: theme.accentColor,
    showBsd: false,
    showHebrewDate: true,
    elements: defaultElements(),
  };
}

// Drafts aren't stored in the database yet, so they're kept per event in
// this browser. Storage can be unavailable (private mode, blocked site
// data), which just means starting from the event's details.
function draftStorageKey(eventId: string) {
  return `invitation-draft:${eventId}`;
}

// Written by the first version of the invitation tab (greeting only).
function legacyGreetingKey(eventId: string) {
  return `invitation-greeting:${eventId}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const ELEMENT_KINDS: readonly string[] = [...BOUND_ELEMENT_KINDS, "custom"];

function sanitizeElement(value: unknown): InvitationElement | null {
  if (typeof value !== "object" || value === null) return null;
  const e = value as Record<string, unknown>;
  const numbers = [e.x, e.y, e.width, e.fontSize];
  if (
    typeof e.id !== "string" ||
    typeof e.kind !== "string" ||
    !ELEMENT_KINDS.includes(e.kind) ||
    !numbers.every((n) => typeof n === "number" && Number.isFinite(n))
  ) {
    return null;
  }
  const kind = e.kind as ElementKind;
  return {
    // Bound elements are looked up by kind, so their id must match it.
    id: kind === "custom" ? e.id : kind,
    kind,
    x: clamp(e.x as number, 0, 1),
    y: clamp(e.y as number, 0, 1),
    width: clamp(e.width as number, 0.05, 1),
    fontSize: clamp(e.fontSize as number, MIN_FONT_SIZE, MAX_FONT_SIZE),
    align:
      e.align === "right" || e.align === "left" ? e.align : "center",
    bold: e.bold === true,
    color: e.color === "accent" ? "accent" : "text",
    text: typeof e.text === "string" ? e.text : "",
  };
}

// Keeps valid saved elements, drops duplicates, and adds back any bound
// element that's missing (e.g. from a draft saved before it existed).
function sanitizeElements(value: unknown): InvitationElement[] {
  if (!Array.isArray(value)) return defaultElements();
  const seen = new Set<string>();
  const elements: InvitationElement[] = [];
  for (const item of value) {
    const el = sanitizeElement(item);
    if (el && !seen.has(el.id)) {
      seen.add(el.id);
      elements.push(el);
    }
  }
  for (const fallback of defaultElements()) {
    if (!seen.has(fallback.id)) elements.push(fallback);
  }
  return elements;
}

export function loadDraft(
  eventId: string,
  event: EventRecord | undefined,
): InvitationDraft {
  const draft = draftFromEvent(event);
  try {
    const raw = localStorage.getItem(draftStorageKey(eventId));
    if (!raw) {
      const legacyGreeting = localStorage.getItem(legacyGreetingKey(eventId));
      return legacyGreeting === null
        ? draft
        : { ...draft, greeting: legacyGreeting };
    }
    const saved: unknown = JSON.parse(raw);
    if (typeof saved !== "object" || saved === null) return draft;
    const fields = saved as Record<string, unknown>;
    // Take only known fields of the right type, so an old or tampered entry
    // can't break the editor.
    const result: InvitationDraft = { ...draft };
    for (const key of Object.keys(draft) as (keyof InvitationDraft)[]) {
      const value = fields[key];
      if (typeof draft[key] === "string" && typeof value === "string") {
        (result as unknown as Record<string, unknown>)[key] = value;
      } else if (typeof draft[key] === "boolean" && typeof value === "boolean") {
        (result as unknown as Record<string, unknown>)[key] = value;
      }
    }
    result.elements = sanitizeElements(fields.elements);
    return result;
  } catch {
    return draft;
  }
}

export function saveDraft(eventId: string, draft: InvitationDraft) {
  try {
    localStorage.setItem(draftStorageKey(eventId), JSON.stringify(draft));
  } catch {
    // Not persisted; the changes still apply for this visit.
  }
}

export function clearDraft(eventId: string) {
  try {
    localStorage.removeItem(draftStorageKey(eventId));
    localStorage.removeItem(legacyGreetingKey(eventId));
  } catch {
    // Nothing stored to clear.
  }
}

// eventDate is a plain YYYY-MM-DD string; build the date locally so it
// doesn't shift a day in timezones west of UTC.
export function parseEventDate(eventDate: string) {
  const [year, month, day] = eventDate.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatGregorianDate(date: Date) {
  return date.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
