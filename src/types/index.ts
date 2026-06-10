export interface DailyLog {
  date: string; // YYYY-MM-DD
  count: number;
  updatedAt?: Date;
}

export interface Payment {
  id: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD
  month: string; // YYYY-MM
}

export interface MonthSetting {
  month: string; // YYYY-MM
  openingBalance: number;
  pricePerTea: number;
}

export interface MonthlySummary {
  totalTeas: number;
  totalCost: number;
  totalCredited: number;
  openingBalance: number;
  balance: number;
  daysLogged: number;
}
