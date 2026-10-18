"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  deleteBudgetItems,
  fetchBudgetItems,
  saveBudgetItems,
} from "@/lib/api";
import type { BudgetItem } from "@/types/budget";

export type BudgetLoadStatus = "loading" | "ready" | "error";
export type BudgetSaveStatus = "saved" | "saving" | "error";

// The couple's budget. Edits apply locally at once and are saved right away
// (budget cells commit on blur or Enter, not per keystroke). Saves and
// deletes run one at a time, in order, so a late save can never bring back a
// row that was deleted after it. Failed saves and deletes are kept for
// retrySave.
export function useBudget(eventId: string) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loadStatus, setLoadStatus] = useState<BudgetLoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<BudgetSaveStatus>("saved");

  const itemsRef = useRef<BudgetItem[]>([]);
  const pendingRef = useRef(new Map<string, BudgetItem>());
  const failedDeletesRef = useRef(new Set<string>());
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const inFlightRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchBudgetItems(eventId)
      .then((loaded) => {
        if (cancelled) return;
        itemsRef.current = loaded;
        setItems(loaded);
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
          if (
            inFlightRef.current === 0 &&
            pendingRef.current.size === 0 &&
            failedDeletesRef.current.size === 0
          ) {
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

  const flush = useCallback(() => {
    if (pendingRef.current.size === 0) return;
    const batch = [...pendingRef.current.values()];
    pendingRef.current.clear();
    enqueue(async () => {
      try {
        await saveBudgetItems(eventId, batch);
      } catch (error) {
        // Keep the unsaved rows for the next attempt, unless they've been
        // edited again (and so re-queued) or deleted in the meantime.
        for (const item of batch) {
          if (
            !pendingRef.current.has(item.id) &&
            itemsRef.current.some((i) => i.id === item.id)
          ) {
            pendingRef.current.set(item.id, item);
          }
        }
        throw error;
      }
    });
  }, [enqueue, eventId]);

  const saveItem = useCallback(
    (item: BudgetItem) => {
      pendingRef.current.set(item.id, item);
      flush();
    },
    [flush],
  );

  const addItem = useCallback(
    (item: BudgetItem) => {
      itemsRef.current = [...itemsRef.current, item];
      setItems(itemsRef.current);
      saveItem(item);
    },
    [saveItem],
  );

  const updateItem = useCallback(
    (id: string, changes: Partial<Omit<BudgetItem, "id">>) => {
      const existing = itemsRef.current.find((item) => item.id === id);
      if (!existing) return;
      const updated = { ...existing, ...changes };
      itemsRef.current = itemsRef.current.map((item) =>
        item.id === id ? updated : item,
      );
      setItems(itemsRef.current);
      saveItem(updated);
    },
    [saveItem],
  );

  const deleteIds = useCallback(
    (ids: string[]) => {
      enqueue(async () => {
        try {
          await deleteBudgetItems(eventId, ids);
        } catch (error) {
          for (const id of ids) failedDeletesRef.current.add(id);
          throw error;
        }
      });
    },
    [enqueue, eventId],
  );

  const removeItem = useCallback(
    (id: string) => {
      itemsRef.current = itemsRef.current.filter((item) => item.id !== id);
      setItems(itemsRef.current);
      pendingRef.current.delete(id);
      deleteIds([id]);
    },
    [deleteIds],
  );

  const retrySave = useCallback(() => {
    const ids = [...failedDeletesRef.current];
    failedDeletesRef.current.clear();
    if (ids.length > 0) deleteIds(ids);
    flush();
  }, [deleteIds, flush]);

  return {
    items,
    loadStatus,
    saveStatus,
    addItem,
    updateItem,
    removeItem,
    retrySave,
  };
}
