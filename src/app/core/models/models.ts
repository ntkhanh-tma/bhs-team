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
}

export interface Vacation {
  id: string;
  username: string;
  date: string; // YYYY-MM-DD
  note?: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  isPast: boolean;
  holiday?: Holiday;
  yourVacation?: Vacation;
  othersVacations: { vacation: Vacation; member: Member }[];
}
