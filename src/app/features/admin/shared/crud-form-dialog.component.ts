import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FieldDef } from './crud-types';

export interface CrudDialogData {
  title: string;
  fields: FieldDef[];
  value: Record<string, unknown>;
}

/** Builds an edit form from a field schema — shared by every admin entity page. */
@Component({
  selector: 'app-crud-form-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatCheckboxModule, MatSelectModule, MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>

    <mat-dialog-content class="!pt-2">
      <div class="flex flex-col gap-1 min-w-[320px]">
        <ng-container *ngFor="let field of editableFields">

          <mat-checkbox *ngIf="field.kind === 'checkbox'"
                        [(ngModel)]="model[field.key]" class="mb-3">
            {{ field.label }}
            <span *ngIf="field.hint" class="block text-xs text-gray-500">{{ field.hint }}</span>
          </mat-checkbox>

          <mat-form-field *ngIf="field.kind === 'select'" appearance="outline">
            <mat-label>{{ field.label }}</mat-label>
            <mat-select [(ngModel)]="model[field.key]">
              <mat-option [value]="null">—</mat-option>
              <mat-option *ngFor="let option of field.options" [value]="option.value">
                {{ option.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field *ngIf="isInput(field)" appearance="outline">
            <mat-label>{{ field.label }}</mat-label>
            <input matInput
                   [type]="inputType(field)"
                   [(ngModel)]="model[field.key]"
                   [required]="!!field.required" />
            <mat-hint *ngIf="field.hint">{{ field.hint }}</mat-hint>
          </mat-form-field>

        </ng-container>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-flat-button color="primary" (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
})
export class CrudFormDialogComponent {
  model: Record<string, unknown>;
  editableFields: FieldDef[];

  constructor(
    public dialogRef: MatDialogRef<CrudFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CrudDialogData,
  ) {
    this.model = { ...data.value };
    this.editableFields = data.fields.filter(f => !f.readonly);
  }

  isInput(field: FieldDef): boolean {
    return field.kind === 'text' || field.kind === 'number'
        || field.kind === 'date' || field.kind === 'color';
  }

  inputType(field: FieldDef): string {
    return field.kind === 'number' ? 'number'
         : field.kind === 'date' ? 'date'
         : field.kind === 'color' ? 'color'
         : 'text';
  }

  save(): void {
    const missing = this.editableFields
      .filter(f => f.required && !String(this.model[f.key] ?? '').trim())
      .map(f => f.label);

    if (missing.length > 0) return;
    this.dialogRef.close(this.model);
  }
}
