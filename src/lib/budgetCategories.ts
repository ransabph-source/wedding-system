import type { BudgetItem } from "@/types/budget";

// Our own service, listed in every new budget with the supplier filled in.
// The budget screen keeps this row's supplier name fixed.
export const BRANDED_BUDGET_ITEM_ID = "budget-rsvp-seating";
const BRANDED_BUDGET_ITEM: BudgetItem = {
  id: BRANDED_BUDGET_ITEM_ID,
  category: "ספק אישורי הגעה וסידור הושבה",
  supplierName: "I R Sidurim",
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
