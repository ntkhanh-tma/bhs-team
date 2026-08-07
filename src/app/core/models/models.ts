export type VacationType = string;

/**
 * Permission level. Deliberately NOT called "role": `position` below is the
 * free-text job title the sheet called "Role".
 */
export type AccessRole = 'Member' | 'Admin';

export interface Member {
  id: string;            // server-side identifier (GUID), never displayed
  username: string;      // login key
  name: string;          // display name, not self-editable
  department: string;    // Team
  position: string;      // job title
  dc?: string;           // Origin — owner (or admin) only
  ip?: string;           // owner only
  publicIp?: string;     // owner only
  pcName?: string;       // owner only
  macAddress?: string;   // owner only
  email?: string;        // owner only
  mobile?: string;       // owner only
  birthday?: string;     // DD/MM — owner only
  accessRole?: AccessRole;
  isActive?: boolean;
  daysUsed: number;
  daysLeft: number;
  avatarUrl: string;
  avatarColor?: string;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  country?: string;
}

export interface Vacation {
  id: string;
  username: string;
  date: string; // YYYY-MM-DD
  type: VacationType;
}

export interface ReleasePlan {
  date: string; // YYYY-MM-DD
  release: string;
}

export interface EventPlan {
  date: string; // YYYY-MM-DD
  description: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isToday: boolean;
  isPast: boolean;
  holidays: Holiday[];
  releases: ReleasePlan[];
  events: EventPlan[];
  yourVacation?: Vacation;
  othersVacations: { vacation: Vacation; member: Member }[];
}
