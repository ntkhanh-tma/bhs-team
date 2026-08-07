import { Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { describeError } from '../../../core/services/data.service';
import { CrudFormDialogComponent } from './crud-form-dialog.component';
import { EntityConfig, FieldDef } from './crud-types';

/**
 * Generic list + create/edit/delete surface. Drives the teams, positions,
 * origins, vacation types, countries, holidays, release plans and event plans
 * pages from a declarative EntityConfig.
 */
@Component({
  selector: 'app-crud-table',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatIconModule, MatDialogModule, MatSnackBarModule,
    MatProgressBarModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="flex items-start justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold text-[#1E293B]">{{ config.title }}</h1>
        <p *ngIf="config.description" class="text-sm text-[#64748B] mt-1 max-w-2xl">
          {{ config.description }}
        </p>
      </div>
      <button *ngIf="config.create" mat-flat-button color="primary" (click)="openCreate()">
        Add {{ config.singular }}
      </button>
    </div>

    <mat-form-field appearance="outline" class="w-full max-w-xs">
      <mat-label>Filter</mat-label>
      <input matInput (input)="applyFilter($event)" placeholder="Type to filter…" />
    </mat-form-field>

    <mat-progress-bar *ngIf="loading" mode="indeterminate" class="mb-2"></mat-progress-bar>

    <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table mat-table [dataSource]="dataSource" matSort class="w-full">

        <ng-container *ngFor="let field of tableFields" [matColumnDef]="field.key">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>{{ field.label }}</th>
          <td mat-cell *matCellDef="let row">
            <ng-container [ngSwitch]="field.kind">
              <span *ngSwitchCase="'checkbox'">{{ row[field.key] ? '✓' : '—' }}</span>
              <span *ngSwitchCase="'color'" class="inline-flex items-center gap-2">
                <span class="inline-block w-4 h-4 rounded border border-gray-300"
                      [style.background]="row[field.key]"></span>
                {{ row[field.key] }}
              </span>
              <span *ngSwitchDefault>{{ row[field.key] ?? '—' }}</span>
            </ng-container>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="!text-right">Actions</th>
          <td mat-cell *matCellDef="let row" class="!text-right whitespace-nowrap">
            <button *ngIf="config.update" mat-button (click)="openEdit(row)">Edit</button>
            <button *ngIf="config.remove" mat-button color="warn" (click)="remove(row)">Delete</button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>

        <tr class="mat-row" *matNoDataRow>
          <td class="p-6 text-center text-[#64748B]" [attr.colspan]="displayedColumns.length">
            {{ loading ? 'Loading…' : 'Nothing here yet.' }}
          </td>
        </tr>
      </table>
    </div>

    <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" pageSize="25" showFirstLastButtons />
  `,
})
export class CrudTableComponent<T extends { id: string }> implements OnInit {
  @Input({ required: true }) config!: EntityConfig<T>;

  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly dataSource = new MatTableDataSource<T>([]);
  loading = false;
  tableFields: FieldDef[] = [];
  displayedColumns: string[] = [];

  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) this.dataSource.paginator = value;
  }
  @ViewChild(MatSort) set sort(value: MatSort) {
    if (value) this.dataSource.sort = value;
  }

  ngOnInit(): void {
    this.tableFields = this.config.fields.filter(f => !f.hideInTable);
    this.displayedColumns = [...this.tableFields.map(f => f.key)];
    if (this.config.update || this.config.remove) this.displayedColumns.push('actions');
    this.load();
  }

  load(): void {
    this.loading = true;
    this.config.list().subscribe({
      next: rows => { this.dataSource.data = rows; this.loading = false; },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  openCreate(): void {
    if (!this.config.create) return;
    this.openDialog(`Add ${this.config.singular}`, { ...(this.config.defaults ?? {}) }, body =>
      this.config.create!(body));
  }

  openEdit(row: T): void {
    if (!this.config.update) return;
    this.openDialog(`Edit ${this.config.singular}`, { ...row }, body =>
      this.config.update!(row.id, body));
  }

  private openDialog(
    title: string,
    value: Record<string, unknown>,
    submit: (body: Record<string, unknown>) => { subscribe: Function },
  ): void {
    this.dialog
      .open(CrudFormDialogComponent, {
        data: { title, fields: this.config.fields, value },
        width: '460px',
      })
      .afterClosed()
      .subscribe((result?: Record<string, unknown>) => {
        if (!result) return;
        this.loading = true;
        submit(result).subscribe({
          next: () => { this.snackBar.open('Saved.', 'OK', { duration: 2500 }); this.load(); },
          error: (err: unknown) => { this.loading = false; this.fail(err); },
        });
      });
  }

  remove(row: T): void {
    if (!this.config.remove) return;
    if (!confirm(`Delete this ${this.config.singular.toLowerCase()}? This cannot be undone.`)) return;

    this.loading = true;
    this.config.remove(row.id).subscribe({
      next: () => { this.snackBar.open('Deleted.', 'OK', { duration: 2500 }); this.load(); },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  private fail(err: unknown): void {
    this.snackBar.open(describeError(err), 'Dismiss', { duration: 6000 });
  }
}
