// Shared by /api/ai-seating and the seating assistant chat.

// The longest request a user may type into the assistant.
export const AI_SEATING_PROMPT_MAX_LENGTH = 300;

// How many AI requests each event may make in total.
export const AI_SEATING_USAGE_LIMIT = 30;

export interface AiSeatingStatus {
  usageCount: number;
  usageLimit: number;
  isLocked: boolean;
}

export interface AiSeatingAssignment {
  guestId: string;
  // Null returns the guest to the unseated list.
  tableId: string | null;
}

export interface AiSeatingResult extends AiSeatingStatus {
  // Only guests whose table changes.
  assignments: AiSeatingAssignment[];
  // Entries in the model's answer that named an unknown guest or table and
  // were dropped.
  ignoredCount: number;
}
