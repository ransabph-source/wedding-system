import "server-only";
import { getSupabase } from "@/lib/supabase/server";
import { eventFromRow, type EventRow } from "@/lib/db/mappers";
import type { EventRecord } from "@/types/event";

export async function getEvent(id: string): Promise<EventRecord | null> {
  const { data, error } = await getSupabase()
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle<EventRow>();
  if (error) throw error;
  return data ? eventFromRow(data) : null;
}
