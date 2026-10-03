"use client";

import { useRef, useState, type ChangeEvent } from "react";
import Papa from "papaparse";
import readXlsxFile from "read-excel-file/browser";
import ExcelImportGroupModal from "@/components/ExcelImportGroupModal";
import type { Guest } from "@/types/guest";

interface ImportGuestsButtonProps {
  groups: string[];
  onImportGuests: (guests: Guest[]) => void;
}

type RawRow = Record<string, unknown>;

interface GuestDraft {
  name: string;
  phone: string;
  partySize: number;
}

interface ParsedSheet {
  sheetName: string;
  drafts: GuestDraft[];
}

type GuestField = "name" | "phone" | "partySize";

// Aliases are matched after normalization (trim, collapse whitespace, strip
// punctuation, lowercase), so header typos, extra spacing and Excel's
// trailing colons/parentheses don't cause a column to go unrecognized.
const FIELD_ALIASES: Record<GuestField, string[]> = {
  name: [
    "שם אורח",
    "שם מלא",
    "שם פרטי",
    "שם משפחה",
    "שם",
    "שמות",
    "אורח",
    "מוזמן",
  ],
  phone: ["טלפון", "נייד", "סלולרי", "מספר טלפון", "פלאפון", "phone"],
  partySize: [
    "כמות מגיעים",
    "כמות",
    "מספר אנשים",
    "סהכ",
    "מגיעים",
    "כמות אורחים",
  ],
};

const FIELD_ORDER: GuestField[] = ["name", "phone", "partySize"];

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/["'׳"]/g, "")
    .replace(/[:.,_\-()[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const NORMALIZED_FIELD_ALIASES: Record<GuestField, string[]> = Object.fromEntries(
  (Object.entries(FIELD_ALIASES) as [GuestField, string[]][]).map(
    ([field, aliases]) => [field, aliases.map(normalizeHeader)],
  ),
) as Record<GuestField, string[]>;

function resolveFieldToHeader(
  headers: string[],
): Partial<Record<GuestField, string>> {
  const result: Partial<Record<GuestField, string>> = {};
  const usedHeaders = new Set<string>();

  for (const field of FIELD_ORDER) {
    const aliasSet = NORMALIZED_FIELD_ALIASES[field];
    const match = headers.find(
      (header) =>
        !usedHeaders.has(header) && aliasSet.includes(normalizeHeader(header)),
    );
    if (match) {
      result[field] = match;
      usedHeaders.add(match);
    }
  }

  return result;
}

// Older exports of this app used separate "שם פרטי" / "שם משפחה" columns.
// If both are present, combine them instead of letting the generic alias
// match on just one and silently drop the other.
const LEGACY_FIRST_NAME_HEADER = normalizeHeader("שם פרטי");
const LEGACY_LAST_NAME_HEADER = normalizeHeader("שם משפחה");

interface LegacyNameHeaders {
  firstHeader: string;
  lastHeader: string;
}

function findLegacyNameHeaders(headers: string[]): LegacyNameHeaders | null {
  const firstHeader = headers.find(
    (header) => normalizeHeader(header) === LEGACY_FIRST_NAME_HEADER,
  );
  const lastHeader = headers.find(
    (header) => normalizeHeader(header) === LEGACY_LAST_NAME_HEADER,
  );
  return firstHeader && lastHeader ? { firstHeader, lastHeader } : null;
}

function normalizePartySize(value: unknown): number {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function resolveName(
  row: RawRow,
  fieldToHeader: Partial<Record<GuestField, string>>,
  legacyNameHeaders: LegacyNameHeaders | null,
): string {
  if (legacyNameHeaders) {
    const first = String(row[legacyNameHeaders.firstHeader] ?? "").trim();
    const last = String(row[legacyNameHeaders.lastHeader] ?? "").trim();
    const combined = `${first} ${last}`.trim();
    if (combined) return combined;
  }

  return fieldToHeader.name ? String(row[fieldToHeader.name] ?? "").trim() : "";
}

function rowToGuestDraft(
  row: RawRow,
  fieldToHeader: Partial<Record<GuestField, string>>,
  legacyNameHeaders: LegacyNameHeaders | null,
): GuestDraft | null {
  const name = resolveName(row, fieldToHeader, legacyNameHeaders);
  const phone = fieldToHeader.phone
    ? String(row[fieldToHeader.phone] ?? "").trim()
    : "";
  const partySizeRaw = fieldToHeader.partySize
    ? row[fieldToHeader.partySize]
    : undefined;
  const hasPartySizeValue =
    partySizeRaw !== undefined &&
    partySizeRaw !== null &&
    String(partySizeRaw).trim() !== "";

  // Skip rows with no recognizable data at all (blank lines, stray rows),
  // but never drop a row just because one column is missing or unmatched.
  if (!name && !phone && !hasPartySizeValue) return null;

  return { name, phone, partySize: normalizePartySize(partySizeRaw) };
}

function rowsToDrafts(rows: RawRow[], headers: string[]): GuestDraft[] {
  const fieldToHeader = resolveFieldToHeader(headers);
  const legacyNameHeaders = findLegacyNameHeaders(headers);
  return rows
    .map((row) => rowToGuestDraft(row, fieldToHeader, legacyNameHeaders))
    .filter((draft): draft is GuestDraft => draft !== null);
}

function parseCsv(file: File): Promise<ParsedSheet> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        const headers = (results.meta.fields ?? []).filter(Boolean);
        resolve({
          sheetName: file.name.replace(/\.csv$/i, ""),
          drafts: rowsToDrafts(results.data, headers),
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}

async function parseExcelSheets(file: File): Promise<ParsedSheet[]> {
  const sheets = await readXlsxFile(file);

  return sheets.map(({ sheet, data }) => {
    if (data.length === 0) return { sheetName: sheet, drafts: [] };

    const [headerRow, ...dataRows] = data;
    const headers = headerRow.map((cell) => String(cell ?? "").trim());
    const rows: RawRow[] = dataRows.map((row) => {
      const obj: RawRow = {};
      headers.forEach((header, i) => {
        obj[header] = row[i];
      });
      return obj;
    });

    return { sheetName: sheet, drafts: rowsToDrafts(rows, headers) };
  });
}

async function parseFileIntoSheets(file: File): Promise<ParsedSheet[]> {
  const isCsv = file.name.toLowerCase().endsWith(".csv");
  if (isCsv) return [await parseCsv(file)];
  return parseExcelSheets(file);
}

export default function ImportGuestsButton({
  groups,
  onImportGuests,
}: ImportGuestsButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [pendingSheets, setPendingSheets] = useState<ParsedSheet[] | null>(
    null,
  );

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setStatus(null);

    try {
      const sheets = (await parseFileIntoSheets(file)).filter(
        (sheet) => sheet.drafts.length > 0,
      );

      if (sheets.length === 0) {
        setStatus({
          type: "error",
          message:
            "לא נמצאו שורות עם נתונים בקובץ. ודאו שהקובץ מכיל שורות אורחים (שם, טלפון וכו').",
        });
        return;
      }

      setPendingFileName(file.name);
      setPendingSheets(sheets);
    } catch {
      setStatus({
        type: "error",
        message:
          "אירעה שגיאה בקריאת הקובץ. ודאו שמדובר בקובץ Excel (xlsx) או CSV תקין.",
      });
    } finally {
      setIsLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleConfirmImport(groupBySheetName: Record<string, string>) {
    if (!pendingSheets) return;

    const guests: Guest[] = pendingSheets.flatMap((sheet) =>
      sheet.drafts.map((draft) => ({
        id: crypto.randomUUID(),
        name: draft.name,
        phone: draft.phone,
        partySize: draft.partySize,
        group: groupBySheetName[sheet.sheetName] ?? "כללי",
        seatingAssignment: null,
        arrived: false,
        rsvpStatus: "pending_whatsapp",
        contactCount: 0,
      })),
    );

    onImportGuests(guests);
    setStatus({
      type: "success",
      message: `יובאו בהצלחה ${guests.length} אורחים מהקובץ "${pendingFileName}"`,
    });
    setPendingSheets(null);
    setPendingFileName("");
  }

  function handleCancelImport() {
    setPendingSheets(null);
    setPendingFileName("");
  }

  return (
    <div className="rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5 dark:bg-zinc-900">
      <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
            ייבוא קובץ אקסל
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            שם אורח, טלפון וכמות מגיעים - זיהוי כותרות אוטומטי
          </p>
        </div>

        <label
          htmlFor="guest-import"
          className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-indigo-600 px-3 py-1.5 sm:min-h-0 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50 active:bg-indigo-100 dark:hover:bg-indigo-500/10 ${
            isLoading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
            />
          </svg>
          {isLoading ? "קורא קובץ..." : "ייבוא קובץ אקסל"}
        </label>
        <input
          ref={inputRef}
          id="guest-import"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
        />
      </div>

      {status && (
        <p
          className={`mt-3 text-sm ${
            status.type === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {status.message}
        </p>
      )}

      {pendingSheets && (
        <ExcelImportGroupModal
          fileName={pendingFileName}
          sheets={pendingSheets.map((sheet) => ({
            name: sheet.sheetName,
            guestCount: sheet.drafts.length,
          }))}
          groups={groups}
          onCancel={handleCancelImport}
          onConfirm={handleConfirmImport}
        />
      )}
    </div>
  );
}
