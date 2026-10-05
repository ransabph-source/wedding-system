"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteFloorPlan, fetchFloorPlanUrl, uploadFloorPlan } from "@/lib/api";

export interface FloorPlanState {
  url: string | null;
  isSaving: boolean;
  error: string | null;
  upload: (file: File) => void;
  remove: () => void;
}

// The event's saved hall floor plan. Uploads show a local preview right away
// and switch to the stored image once it's saved, or roll back on failure.
export function useFloorPlan(eventId: string): FloorPlanState {
  const [url, setUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchFloorPlanUrl(eventId)
      .then((loaded) => {
        if (!cancelled) setUrl(loaded);
      })
      .catch((err: unknown) => console.error(err));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const upload = useCallback(
    (file: File) => {
      const previous = url;
      const preview = URL.createObjectURL(file);
      setUrl(preview);
      setIsSaving(true);
      setError(null);
      uploadFloorPlan(eventId, file)
        .then((saved) => setUrl(saved))
        .catch((err: unknown) => {
          console.error(err);
          setUrl(previous);
          setError("שמירת הסקיצה נכשלה. נסו קובץ PNG/JPG עד 10MB.");
        })
        .finally(() => {
          URL.revokeObjectURL(preview);
          setIsSaving(false);
        });
    },
    [eventId, url],
  );

  const remove = useCallback(() => {
    const previous = url;
    setUrl(null);
    setIsSaving(true);
    setError(null);
    deleteFloorPlan(eventId)
      .catch((err: unknown) => {
        console.error(err);
        setUrl(previous);
        setError("הסרת הסקיצה נכשלה.");
      })
      .finally(() => setIsSaving(false));
  }, [eventId, url]);

  return { url, isSaving, error, upload, remove };
}
