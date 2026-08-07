import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { describeError } from '../../../core/services/data.service';
import { AdminApiService, AdminVacation } from '../admin-api.service';
import { CrudFormDialogComponent } from '../shared/crud-form-dialog.component';
import { FieldDef } from '../shared/crud-types';

/**
 * Vacation administration. Unlike the member-facing view this shows soft-deleted
 * rows (the sheet's old 'Deleted' tombstones) and can restore them, and booking
 * here bypasses the lock period and throttle.
 */
@Component({
  selector: 'app-admin-vacations',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatPaginatorModule, MatSortModule,
    MatButtonModule, MatCheckboxModule, MatDialogModule, MatSnackBarModule,
    MatProgressBarModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="flex items-start justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold text-[#1E293B]">Vacations</h1>
        <p class="text-sm text-[#64748B] mt-1 max-w-2xl">
          Booking here is on a member's behalf and bypasses the lock period and submit throttle.
        </p>
      </div>
      <button mat-flat-button color="primary" (click)="openCreate()">Add entry</button>
    </div>

    <div class="flex flex-wrap items-center gap-4 mb-2">
      <mat-form-field appearance="outline" class="w-full max-w-xs">
        <mat-label>Filter</mat-label>
        <input matInput (input)="applyFilter($event)" placeholder="Username, name, type…" />
      </mat-form-field>

      <mat-checkbox [(ngModel)]="includeDeleted" (change)="load()">
        Show deleted entries
      </mat-checkbox>
    </div>

    <mat-progress-bar *ngIf="loading" mode="indeterminate" class="mb-2"></mat-progress-bar>

    <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table mat-table [dataSource]="dataSource" matSort class="w-full">

        <ng-container matColumnDef="date">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
          <td mat-cell *matCellDef="let row">{{ row.date }}</td>
        </ng-container>

        <ng-container matColumnDef="username">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Username</th>
          <td mat-cell *matCellDef="let row">{{ row.username }}</td>
        </ng-container>

        <ng-container matColumnDef="memberName">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Member</th>
          <td mat-cell *matCellDef="let row">{{ row.memberName }}</td>
        </ng-container>

        <ng-container matColumnDef="type">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Type</th>
          <td mat-cell *matCellDef="let row">{{ row.type }}</td>
        </ng-container>

        <ng-container matColumnDef="isDeleted">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let row">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  [class]="row.isDeleted
                    ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-800'">
              {{ row.isDeleted ? 'Deleted' : 'Active' }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="!text-right">Actions</th>
          <td mat-cell *matCellDef="let row" class="!text-right whitespace-nowrap">
            <button *ngIf="!row.isDeleted" mat-button color="warn" (click)="remove(row)">Delete</button>
            <button *ngIf="row.isDeleted" mat-button (click)="restore(row)">Restore</button>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>

        <tr class="mat-row" *matNoDataRow>
          <td class="p-6 text-center text-[#64748B]" [attr.colspan]="columns.length">
            {{ loading ? 'Loading…' : 'No entries.' }}
          </td>
        </tr>
      </table>
    </div>

    <mat-paginator [pageSizeOptions]="[25, 50, 100]" pageSize="50" showFirstLastButtons />
  `,
})
export class AdminVacationsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ['date', 'username', 'memberName', 'type', 'isDeleted', 'actions'];
  readonly dataSource = new MatTableDataSource<AdminVacation>([]);
  loading = false;
  includeDeleted = true;

  private fields: FieldDef[] = [];

  @ViewChild(MatPaginator) set paginator(v: MatPaginator) { if (v) this.dataSource.paginator = v; }
  @ViewChild(MatSort) set sort(v: MatSort) { if (v) this.dataSource.sort = v; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;

    forkJoin({
      vacations: this.api.listVacations(this.includeDeleted),
      members: this.api.listMembers(),
      types: this.api.listVacationTypes(),
    }).subscribe({
      next: ({ vacations, members, types }) => {
        this.fields = [
          {
            key: 'memberId', label: 'Member', kind: 'select', required: true,
            options: members
              .filter(m => m.isActive !== false)
              .map(m => ({ value: m.id, label: `${m.name} (${m.username})` })),
          },
          { key: 'date', label: 'Date', kind: 'date', required: true },
          {
            key: 'vacationTypeId', label: 'Type', kind: 'select', required: true,
            options: types.map(t => ({ value: t.id, label: t.name })),
          },
        ];

        this.dataSource.data = vacations;
        this.loading = false;
      },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  openCreate(): void {
    this.dialog
      .open(CrudFormDialogComponent, {
        data: { title: 'Add vacation entry', fields: this.fields, value: {} },
        width: '460px',
      })
      .afterClosed()
      .subscribe((result?: Record<string, unknown>) => {
        if (!result?.['memberId'] || !result['date'] || !result['vacationTypeId']) return;

        this.loading = true;
        this.api.createVacation(
          String(result['memberId']), String(result['date']), String(result['vacationTypeId']),
        ).subscribe({
          next: () => { this.snackBar.open('Entry added.', 'OK', { duration: 2500 }); this.load(); },
          error: err => { this.loading = false; this.fail(err); },
        });
      });
  }

  remove(row: AdminVacation): void {
    if (!confirm(`Delete ${row.username}'s leave on ${row.date}? It can be restored later.`)) return;

    this.loading = true;
    this.api.deleteVacation(row.id).subscribe({
      next: () => { this.snackBar.open('Deleted.', 'OK', { duration: 2500 }); this.load(); },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  restore(row: AdminVacation): void {
    this.loading = true;
    this.api.restoreVacation(row.id).subscribe({
      next: () => { this.snackBar.open('Restored.', 'OK', { duration: 2500 }); this.load(); },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  private fail(err: unknown): void {
    this.snackBar.open(describeError(err), 'Dismiss', { duration: 6000 });
  }
}
