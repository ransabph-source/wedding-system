import type { BudgetItem } from "@/types/budget";

// Our own service, listed in every new budget with the supplier filled in.
// The budget screen and API keep this row's supplier name fixed.
export const BRANDED_BUDGET_ITEM_ID = "budget-rsvp-seating";
export const BRANDED_SUPPLIER_NAME = "I R Sidurim";
const BRANDED_BUDGET_ITEM: BudgetItem = {
  id: BRANDED_BUDGET_ITEM_ID,
  category: "ספק אישורי הגעה וסידור הושבה",
  supplierName: BRANDED_SUPPLIER_NAME,
  actualCost: 0,
  paidSoFar: 0,
};

export const DEFAULT_BUDGET_CATEGORIES = [
  "אולם",
  "דיג'יי",
  "צלם",
  "שמלת כלה",
  "איפור ושיער",
  "חליפת חתן",
];

// Added to an event's budget the first time it's opened (see
// /api/events/[eventId]/budget). The IDs are fixed so that adding them twice
// at once can't create duplicates.
export const DEFAULT_BUDGET_ITEMS: BudgetItem[] = [
  ...DEFAULT_BUDGET_CATEGORIES.map((category, index) => ({
    id: `budget-${index + 1}`,
    category,
    supplierName: "",
    actualCost: 0,
    paidSoFar: 0,
  })),
  BRANDED_BUDGET_ITEM,
];
