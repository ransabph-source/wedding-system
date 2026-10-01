import "server-only";
import {
  LEAD_STATUSES,
  MAX_NOTES_LENGTH,
  type LeadInput,
  type LeadStatus,
} from "@/types/lead";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TEXT_LENGTH = 200;

function isLeadStatus(value: unknown): value is LeadStatus {
  return LEAD_STATUSES.includes(value as LeadStatus);
}

function text(value: unknown, field: string, max = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return `${field} must be a string`;
  const trimmed = value.trim();
  if (trimmed.length > max) return `${field} must be at most ${max} characters`;
  return { value: trimmed };
}

// Validates a lead from a request body. With partial, only the fields present
// are checked and returned (for PUT); otherwise names is required and the
// rest default to empty. Returns an error message on invalid input.
export function parseLeadInput(
  body: unknown,
  { partial }: { partial: boolean },
): Partial<LeadInput> | string {
  if (typeof body !== "object" || body === null) return "Expected a JSON object";
  const input = body as Record<string, unknown>;
  const lead: Partial<LeadInput> = {};

  if (input.names !== undefined || !partial) {
    const names = text(input.names, "names");
    if (typeof names === "string") return names;
    if (!names.value) return "names is required";
    lead.names = names.value;
  }

  for (const field of ["phone", "eventType"] as const) {
    if (input[field] === undefined) continue;
    const value = text(input[field], field);
    if (typeof value === "string") return value;
    lead[field] = value.value;
  }

  if (input.notes !== undefined) {
    const notes = text(input.notes, "notes", MAX_NOTES_LENGTH);
    if (typeof notes === "string") return notes;
    lead.notes = notes.value;
  }

  if (input.status !== undefined) {
    if (!isLeadStatus(input.status)) {
      return `status must be one of: ${LEAD_STATUSES.join(", ")}`;
    }
    lead.status = input.status;
  }

  if (input.followUpDate !== undefined) {
    const date = input.followUpDate;
    if (date !== null && (typeof date !== "string" || !DATE_PATTERN.test(date))) {
      return "followUpDate must be YYYY-MM-DD or null";
    }
    lead.followUpDate = date;
  }

  return lead;
}
