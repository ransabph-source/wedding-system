import {
  BRANDED_BUDGET_ITEM_ID,
  BRANDED_SUPPLIER_NAME,
  DEFAULT_BUDGET_ITEMS,
} from "@/lib/budgetCategories";
import { budgetItemFromRow, budgetItemToRow } from "@/lib/db/mappers";
import {
  authorizeEvent,
  createCollectionHandlers,
  jsonError,
  readJson,
  withErrorHandling,
} from "@/lib/db/routeHelpers";
import { getSupabase } from "@/lib/supabase/server";

// The couple's budget. Private to the couple and admins: hostesses, who may
// view every event's guests, can neither read nor change it. Couples may edit
// it in the phases eventPhaseRules allows for "budget".
const collection = createCollectionHandlers({
  table: "budget_items",
  fromRow: budgetItemFromRow,
  toRow: budgetItemToRow,
  staffCanRead: false,
  coupleSection: "budget",
});

type EventScopedContext = { params: Promise<{ eventId: string }> };

// Gives an event the default categories the first time its budget is opened.
// Concurrent first loads both insert, but the fixed default IDs make the
// second insert a no-op.
async function addDefaultBudgetItems(eventId: string) {
  const { data, error } = await getSupabase()
    .from("events")
    .select("budget_initialized_at")
    .eq("id", eventId)
    .maybeSingle<{ budget_initialized_at: string | null }>();
  if (error) throw error;
  if (!data || data.budget_initialized_at) return;

  const { error: insertError } = await getSupabase()
    .from("budget_items")
    .upsert(
      DEFAULT_BUDGET_ITEMS.map((item) => budgetItemToRow(eventId, item)),
      { onConflict: "event_id,id", ignoreDuplicates: true },
    );
  if (insertError) throw insertError;

  const { error: markError } = await getSupabase()
    .from("events")
    .update({ budget_initialized_at: new Date().toISOString() })
    .eq("id", eventId)
    .is("budget_initialized_at", null);
  if (markError) throw markError;
}

// Our own service row always names us as the supplier, whoever saves it.
async function refuseBrandedSupplierChange(
  request: Request,
): Promise<Response | null> {
  const body = await readJson(request.clone());
  // Malformed bodies are left for the collection handler to report.
  if (!Array.isArray(body)) return null;
  const changesSupplier = body.some(
    (item: unknown) =>
      typeof item === "object" &&
      item !== null &&
      (item as { id?: unknown }).id === BRANDED_BUDGET_ITEM_ID &&
      (item as { supplierName?: unknown }).supplierName !==
        BRANDED_SUPPLIER_NAME,
  );
  return changesSupplier
    ? jsonError(`The supplier on this row must stay "${BRANDED_SUPPLIER_NAME}"`, 400)
    : null;
}

export const GET = withErrorHandling(
  async (request: Request, ctx: EventScopedContext) => {
    const { eventId } = await ctx.params;
    // Checked before seeding, so nobody without access can trigger it; the
    // collection handler then checks again as usual.
    const auth = await authorizeEvent(eventId, "view");
    if (auth instanceof Response) return auth;
    if (auth.role === "staff") {
      return jsonError("You don't have access to this event", 403);
    }
    await addDefaultBudgetItems(eventId);
    return collection.GET(request, ctx);
  },
);

export const POST = withErrorHandling(
  async (request: Request, ctx: EventScopedContext) =>
    (await refuseBrandedSupplierChange(request)) ??
    collection.POST(request, ctx),
);

export const PUT = withErrorHandling(
  async (request: Request, ctx: EventScopedContext) =>
    (await refuseBrandedSupplierChange(request)) ??
    collection.PUT(request, ctx),
);

export const { DELETE } = collection;
