export interface BudgetItem {
  id: string;
  category: string;
  supplierName: string;
  estimatedCost: number;
  actualCost: number;
  paidSoFar: number;
}
