"use client";

import { createContext, useContext } from "react";

// Tap-to-move for seating: tap a guest chip to pick it up, then tap
// "העבר לכאן" on a table, zone or the unseated list to drop it there.
// Works alongside drag-and-drop and is the easy path on phones, where
// dragging across a long scrolling page is awkward.
export interface SeatingPick {
  pickedGuestId: string | null;
  togglePick: (guestId: string) => void;
  // Target is a table id, zone id or "unseated" (same ids as the droppables).
  placePicked: (targetId: string) => void;
}

const SeatingPickContext = createContext<SeatingPick | null>(null);

export const SeatingPickProvider = SeatingPickContext.Provider;

export function useSeatingPick() {
  return useContext(SeatingPickContext);
}
