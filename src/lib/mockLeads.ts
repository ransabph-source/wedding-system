export interface Lead {
  id: string;
  coupleNames: string;
  phone: string;
  eventType: string;
  status: "new" | "contacted" | "proposal_sent" | "won" | "lost";
  estimatedBudget: number;
  followUpDate: string;
}

export const MOCK_LEADS: Lead[] = [
  {
    id: "lead-1",
    coupleNames: "אורי ושירה נחום",
    phone: "050-9871234",
    eventType: "חתונה",
    status: "new",
    estimatedBudget: 150000,
    followUpDate: "2026-10-01",
  },
  {
    id: "lead-2",
    coupleNames: "משפחת אלבז (בר מצווה)",
    phone: "052-6549871",
    eventType: "בר מצווה",
    status: "contacted",
    estimatedBudget: 60000,
    followUpDate: "2026-09-29",
  },
  {
    id: "lead-3",
    coupleNames: "תומר וליאור וייס",
    phone: "054-3217896",
    eventType: "חתונה",
    status: "proposal_sent",
    estimatedBudget: 180000,
    followUpDate: "2026-10-05",
  },
  {
    id: "lead-4",
    coupleNames: "נטע ואיתי שרון",
    phone: "053-7418529",
    eventType: "חתונה",
    status: "lost",
    estimatedBudget: 130000,
    followUpDate: "2026-09-20",
  },
];
