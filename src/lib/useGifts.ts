"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { deleteGifts, fetchGifts, saveGifts } from "@/lib/api";
import type { Gift } from "@/types/gift";

export type GiftsLoadStatus = "loading" | "ready" | "error";
export type GiftsSaveStatus = "saved" | "saving" | "error";

const SAVE_DELAY_MS = 700;

// The couple's gift ledger. Edits apply locally at once and are saved in
// batches after a short pause in typing, so a fast typist doesn't send a
// request per keystroke. Saves and deletes run one at a time, in order, so a
// late save can never bring back a row that was deleted after it.
export function useGifts(eventId: string) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [loadStatus, setLoadStatus] = useState<GiftsLoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<GiftsSaveStatus>("saved");

  const giftsRef = useRef<Gift[]>([]);
  const pendingRef = useRef(new Map<string, Gift>());
  const timerRef = useRef<number | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const inFlightRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchGifts(eventId)
      .then((loaded) => {
        if (cancelled) return;
        giftsRef.current = loaded;
        setGifts(loaded);
        setLoadStatus("ready");
      })
      .catch((error: unknown) => {
        console.error(error);
        if (!cancelled) setLoadStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const enqueue = useCallback((task: () => Promise<void>) => {
    inFlightRef.current += 1;
    setSaveStatus("saving");
    queueRef.current = queueRef.current
      .then(task)
      .then(
        () => {
          inFlightRef.current -= 1;
          if (inFlightRef.current === 0 && pendingRef.current.size === 0) {
            setSaveStatus("saved");
          }
        },
        (error: unknown) => {
          console.error(error);
          inFlightRef.current -= 1;
          setSaveStatus("error");
        },
      );
  }, []);

  const flush = useCallback(
    (keepalive = false) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pendingRef.current.size === 0) return;
      const batch = [...pendingRef.current.values()];
      pendingRef.current.clear();
      setSaveStatus("saving");
      enqueue(async () => {
        try {
          await saveGifts(eventId, batch, keepalive);
        } catch (error) {
          // Keep the unsaved rows for the next attempt, unless they've been
          // edited again (and so re-queued) in the meantime.
          for (const gift of batch) {
            if (
              !pendingRef.current.has(gift.id) &&
              giftsRef.current.some((g) => g.id === gift.id)
            ) {
              pendingRef.current.set(gift.id, gift);
            }
          }
          throw error;
        }
      });
    },
    [enqueue, eventId],
  );

  // Saves whatever is still waiting when the tab closes or the view unmounts.
  useEffect(() => {
    const handlePageHide = () => flush(true);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      flush(true);
    };
  }, [flush]);

  const scheduleSave = useCallback(() => {
    setSaveStatus("saving");
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => flush(), SAVE_DELAY_MS);
  }, [flush]);

  // Updates a gift, or adds it if the ID is new (the blank row being typed in).
  const updateGift = useCallback(
    (id: string, changes: Partial<Omit<Gift, "id">>) => {
      const existing = giftsRef.current.find((gift) => gift.id === id);
      const updated: Gift = existing
        ? { ...existing, ...changes }
        : { id, guestName: "", attendees: null, amount: null, ...changes };
      giftsRef.current = existing
        ? giftsRef.current.map((gift) => (gift.id === id ? updated : gift))
        : [...giftsRef.current, updated];
      setGifts(giftsRef.current);
      pendingRef.current.set(id, updated);
      scheduleSave();
    },
    [scheduleSave],
  );

  const removeGift = useCallback(
    (id: string) => {
      giftsRef.current = giftsRef.current.filter((gift) => gift.id !== id);
      setGifts(giftsRef.current);
      pendingRef.current.delete(id);
      // Saves queued before this delete still go first.
      flush();
      enqueue(() => deleteGifts(eventId, [id]));
    },
    [enqueue, eventId, flush],
  );

  return {
    gifts,
    loadStatus,
    saveStatus,
    updateGift,
    removeGift,
    retrySave: () => flush(),
  };
}
