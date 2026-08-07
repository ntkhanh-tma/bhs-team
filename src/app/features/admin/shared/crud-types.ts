import { Observable } from 'rxjs';

export type FieldKind = 'text' | 'number' | 'checkbox' | 'date' | 'color' | 'select';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  /** Hidden in the table but still editable in the dialog. */
  hideInTable?: boolean;
  /** Shown in the table but not editable. */
  readonly?: boolean;
  required?: boolean;
  options?: { value: unknown; label: string }[];
  hint?: string;
}

/**
 * Declarative description of one admin entity. Nine of the ten admin pages are
 * driven entirely by one of these plus the generic table/dialog pair.
 */
export interface EntityConfig<T extends { id: string }> {
  title: string;
  singular: string;
  fields: FieldDef[];
  list: () => Observable<T[]>;
  create?: (body: Record<string, unknown>) => Observable<unknown>;
  update?: (id: string, body: Record<string, unknown>) => Observable<unknown>;
  remove?: (id: string) => Observable<unknown>;
  /** Values applied to a brand-new record before the dialog opens. */
  defaults?: Record<string, unknown>;
  description?: string;
}
