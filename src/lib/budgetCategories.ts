import type { BudgetItem } from "@/types/budget";

export const DEFAULT_BUDGET_CATEGORIES = [
  "אולם",
  "קייטרינג",
  "דיג'יי",
  "צלם",
  "שמלת כלה",
  "איפור ושיער",
  "חליפת חתן",
];

export const DEFAULT_BUDGET_ITEMS: BudgetItem[] = DEFAULT_BUDGET_CATEGORIES.map(
  (category, index) => ({
    id: `budget-${index + 1}`,
    category,
    supplierName: "",
    estimatedCost: 0,
    actualCost: 0,
    paidSoFar: 0,
  }),
);
