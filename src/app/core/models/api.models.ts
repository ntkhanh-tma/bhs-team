import { AccessRole, Member } from './models';

// ── Wire shapes returned by the .NET API ─────────────────────────────────────

export interface MemberSummaryDto {
  id: string;
  username: string;
  name: string;
  department: string;
  position: string;
}

export interface MemberDetailDto extends MemberSummaryDto {
  dc?: string;
  ip?: string;
  publicIp?: string;
  pcName?: string;
  macAddress?: string;
  email?: string;
  mobile?: string;
  birthday?: string;
  accessRole?: AccessRole;
  isActive?: boolean;
}

export interface VacationDto {
  id: string;
  memberId: string;
  username: string;
  date: string;      // YYYY-MM-DD
  type: string;
  typeCode: string;
}

export interface HolidayDto {
  id: string;
  date: string;
  name: string;
  countryCode?: string;
  country?: string;
  flagEmoji?: string;
}

export interface ReleasePlanDto { id: string; date: string; release: string; }
export interface EventPlanDto { id: string; date: string; description: string; }

export interface LookupItemDto { id: string; name: string; }

export interface VacationTypeDto {
  id: string;
  name: string;
  code: string;
  colorHex: string;
  colorDarkHex: string;
  displayOrder: number;
}

export interface CountryDto { id: string; code: string; name: string; flagEmoji: string; }

export interface LookupsDto {
  teams: LookupItemDto[];
  positions: LookupItemDto[];
  origins: LookupItemDto[];
  vacationTypes: VacationTypeDto[];
  countries: CountryDto[];
}

export interface AppSettingDto {
  key: string;
  value: string;
  valueType: 'String' | 'Int' | 'Bool' | 'Json';
  category: string;
  description?: string;
  isPublic: boolean;
}

// ── Avatar derivation ────────────────────────────────────────────────────────
//
// Deterministic from the username, so no avatar column is needed anywhere.
// The palettes are overridden at runtime from the server's ui.* settings; these
// are the fallbacks used before settings load.

export const DEFAULT_AVATAR_COLORS = [
  '#003bc4', '#7CC9A7', '#F7C873', '#B48CF2',
  '#F97316', '#EC4899', '#06B6D4', '#84CC16',
  '#8B5CF6', '#EF4444', '#14B8A6', '#F59E0B',
];

export const DEFAULT_ANIMAL_EMOJIS = [
  '🐶', '🐱', '🐻', '🦊', '🐼', '🐨', '🐯', '🦁',
  '🐸', '🐧', '🦉', '🦅', '🦋', '🐙', '🦄', '🦝',
  '🦘', '🦦', '🦥', '🐿️', '🦔', '🐇', '🦜', '🦩',
  '🐳', '🦭', '🐆', '🦏', '🦒', '🐘',
];

let avatarColors = DEFAULT_AVATAR_COLORS;
let animalEmojis = DEFAULT_ANIMAL_EMOJIS;

/** Called once by SettingsService so avatars follow the admin-managed palettes. */
export function configureAvatars(colors?: string[], emojis?: string[]): void {
  if (colors?.length) avatarColors = colors;
  if (emojis?.length) animalEmojis = emojis;
}

export function animalEmoji(username: string): string {
  let h = 0;
  for (let i = 0; i < username.length; i++) {
    h = (Math.imul(31, h) + username.charCodeAt(i)) | 0;
  }
  return animalEmojis[Math.abs(h) % animalEmojis.length];
}

export function toMember(dto: MemberSummaryDto | MemberDetailDto, index: number): Member {
  const detail = dto as MemberDetailDto;
  const username = (dto.username ?? '').trim().toLowerCase();

  return {
    id: dto.id,
    username,
    name: (dto.name ?? '').trim(),
    department: (dto.department ?? '').trim(),
    position: (dto.position ?? '').trim(),
    dc: detail.dc || undefined,
    ip: detail.ip || undefined,
    publicIp: detail.publicIp || undefined,
    pcName: detail.pcName || undefined,
    macAddress: detail.macAddress || undefined,
    email: detail.email || undefined,
    mobile: detail.mobile || undefined,
    birthday: detail.birthday || undefined,
    accessRole: detail.accessRole,
    isActive: detail.isActive,
    // Not stored anywhere: the members page derives a real count from vacations$.
    daysUsed: 0,
    daysLeft: 0,
    avatarUrl: animalEmoji(username),
    avatarColor: avatarColors[index % avatarColors.length],
  };
}
