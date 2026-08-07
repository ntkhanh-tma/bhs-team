import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { describeError } from '../../../core/services/data.service';
import { AdminApiService, AuditLogEntry } from '../admin-api.service';

/** Read-only trail. Admins can edit other people's PII, so every write is recorded. */
@Component({
  selector: 'app-admin-audit-log',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatProgressBarModule, MatSnackBarModule],
  template: `
    <h1 class="text-2xl font-bold text-[#1E293B] mb-1">Audit log</h1>
    <p class="text-sm text-[#64748B] mb-4">Every administrative change, newest first.</p>

    <mat-progress-bar *ngIf="loading" mode="indeterminate" class="mb-2"></mat-progress-bar>

    <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table mat-table [dataSource]="rows" class="w-full">
        <ng-container matColumnDef="at">
          <th mat-header-cell *matHeaderCellDef>When</th>
          <td mat-cell *matCellDef="let row">{{ row.at | date: 'short' }}</td>
        </ng-container>

        <ng-container matColumnDef="actorUsername">
          <th mat-header-cell *matHeaderCellDef>Who</th>
          <td mat-cell *matCellDef="let row">{{ row.actorUsername ?? 'system' }}</td>
        </ng-container>

        <ng-container matColumnDef="entity">
          <th mat-header-cell *matHeaderCellDef>Entity</th>
          <td mat-cell *matCellDef="let row">{{ row.entity }}</td>
        </ng-container>

        <ng-container matColumnDef="action">
          <th mat-header-cell *matHeaderCellDef>Action</th>
          <td mat-cell *matCellDef="let row">{{ row.action }}</td>
        </ng-container>

        <ng-container matColumnDef="changesJson">
          <th mat-header-cell *matHeaderCellDef>Changes</th>
          <td mat-cell *matCellDef="let row">
            <code class="text-xs break-all">{{ row.changesJson }}</code>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>

        <tr class="mat-row" *matNoDataRow>
          <td class="p-6 text-center text-[#64748B]" [attr.colspan]="columns.length">
            {{ loading ? 'Loading…' : 'No entries yet.' }}
          </td>
        </tr>
      </table>
    </div>

    <mat-paginator [length]="total" [pageSize]="pageSize"
                   [pageSizeOptions]="[25, 50, 100]" (page)="onPage($event)" />
  `,
})
export class AdminAuditLogComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = ['at', 'actorUsername', 'entity', 'action', 'changesJson'];
  rows: AuditLogEntry[] = [];
  total = 0;
  pageSize = 25;
  private page = 1;

  ngOnInit(): void { this.load(); }

  onPage(event: PageEvent): void {
    this.page = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.api.listAuditLogs(this.page, this.pageSize).subscribe({
      next: result => {
        this.rows = result.items;
        this.total = result.total;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.snackBar.open(describeError(err), 'Dismiss', { duration: 6000 });
      },
    });
  }

  loading = false;
}
