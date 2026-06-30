export type VacationType = 'Vacation' | 'Compensation' | 'Event';

export interface Member {
  username: string;
  name: string;
  department: string;
  position: string;
  daysUsed: number;
  daysLeft: number;
  avatarUrl: string;
  avatarColor?: string;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  country?: string; // e.g. 'Australia', 'Vietnam'
}

export interface Vacation {
  id: string;
  username: string;
  date: string; // YYYY-MM-DD
  type: VacationType;
  note?: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  isPast: boolean;
  holidays: Holiday[];
  yourVacation?: Vacation;
  othersVacations: { vacation: Vacation; member: Member }[];
}
