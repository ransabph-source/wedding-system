// A row in the couple's gift ledger. Rows are filled in spreadsheet-style, so
// any field may still be blank (empty name, null numbers).
export interface Gift {
  id: string;
  guestName: string;
  attendees: number | null;
  // In NIS.
  amount: number | null;
}
