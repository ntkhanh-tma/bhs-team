import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { forkJoin } from 'rxjs';
import { MemberDetailDto } from '../../../core/models/api.models';
import { describeError } from '../../../core/services/data.service';
import { AdminApiService } from '../admin-api.service';
import { CrudFormDialogComponent } from '../shared/crud-form-dialog.component';
import { FieldDef } from '../shared/crud-types';

/**
 * Member administration: full records including the PII columns, plus the two
 * actions that have no equivalent anywhere else — granting Admin and forcing a
 * password reset.
 */
@Component({
  selector: 'app-admin-members',
  standalone: true,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule,
    MatMenuModule, MatDialogModule, MatSnackBarModule, MatProgressBarModule,
    MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="flex items-start justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold text-[#1E293B]">Members</h1>
        <p class="text-sm text-[#64748B] mt-1 max-w-2xl">
          Every member, including inactive ones and those hidden from the directory.
          Deleting deactivates rather than erases, so vacation history survives.
        </p>
      </div>
      <button mat-flat-button color="primary" (click)="openCreate()">Add member</button>
    </div>

    <mat-form-field appearance="outline" class="w-full max-w-xs">
      <mat-label>Filter</mat-label>
      <input matInput (input)="applyFilter($event)" placeholder="Name, username, team…" />
    </mat-form-field>

    <mat-progress-bar *ngIf="loading" mode="indeterminate" class="mb-2"></mat-progress-bar>

    <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table mat-table [dataSource]="dataSource" matSort class="w-full">

        <ng-container matColumnDef="username">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Username</th>
          <td mat-cell *matCellDef="let row">{{ row.username }}</td>
        </ng-container>

        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
          <td mat-cell *matCellDef="let row">{{ row.name }}</td>
        </ng-container>

        <ng-container matColumnDef="department">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Team</th>
          <td mat-cell *matCellDef="let row">{{ row.department || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="position">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Position</th>
          <td mat-cell *matCellDef="let row">{{ row.position || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Email</th>
          <td mat-cell *matCellDef="let row">{{ row.email || '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="accessRole">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Access</th>
          <td mat-cell *matCellDef="let row">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                  [class]="row.accessRole === 'Admin'
                    ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'">
              {{ row.accessRole }}
            </span>
          </td>
        </ng-container>

        <ng-container matColumnDef="isActive">
          <th mat-header-cell *matHeaderCellDef>Active</th>
          <td mat-cell *matCellDef="let row">{{ row.isActive ? '✓' : '—' }}</td>
        </ng-container>

        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef class="!text-right">Actions</th>
          <td mat-cell *matCellDef="let row" class="!text-right whitespace-nowrap">
            <button mat-button (click)="openEdit(row)">Edit</button>
            <button mat-button [matMenuTriggerFor]="menu">More</button>
            <mat-menu #menu="matMenu">
              <button mat-menu-item (click)="toggleAdmin(row)">
                {{ row.accessRole === 'Admin' ? 'Revoke admin' : 'Make admin' }}
              </button>
              <button mat-menu-item (click)="resetPassword(row)">Reset password</button>
              <button mat-menu-item (click)="deactivate(row)" [disabled]="!row.isActive">
                Deactivate
              </button>
            </mat-menu>
          </td>
        </ng-container>

        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>

        <tr class="mat-row" *matNoDataRow>
          <td class="p-6 text-center text-[#64748B]" [attr.colspan]="columns.length">
            {{ loading ? 'Loading…' : 'No members yet — run the sheet importer.' }}
          </td>
        </tr>
      </table>
    </div>

    <mat-paginator [pageSizeOptions]="[10, 25, 50, 100]" pageSize="25" showFirstLastButtons />
  `,
})
export class AdminMembersComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly columns = [
    'username', 'name', 'department', 'position', 'email', 'accessRole', 'isActive', 'actions',
  ];
  readonly dataSource = new MatTableDataSource<MemberDetailDto>([]);
  loading = false;

  private fields: FieldDef[] = [];

  @ViewChild(MatPaginator) set paginator(v: MatPaginator) { if (v) this.dataSource.paginator = v; }
  @ViewChild(MatSort) set sort(v: MatSort) { if (v) this.dataSource.sort = v; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;

    // Lookup lists populate the team/position/origin pickers in the edit dialog.
    forkJoin({
      members: this.api.listMembers(),
      teams: this.api.listTeams(),
      positions: this.api.listPositions(),
      origins: this.api.listOrigins(),
    }).subscribe({
      next: ({ members, teams, positions, origins }) => {
        this.fields = [
          { key: 'username', label: 'Username', kind: 'text', required: true },
          { key: 'name', label: 'Name', kind: 'text', required: true },
          {
            key: 'teamId', label: 'Team', kind: 'select',
            options: teams.map(t => ({ value: t.id, label: t.name })),
          },
          {
            key: 'positionId', label: 'Position', kind: 'select',
            options: positions.map(p => ({ value: p.id, label: p.name })),
          },
          {
            key: 'originId', label: 'Origin', kind: 'select',
            options: origins.map(o => ({ value: o.id, label: o.name })),
          },
          { key: 'ip', label: 'IP', kind: 'text' },
          { key: 'publicIp', label: 'Public IP', kind: 'text' },
          { key: 'pcName', label: 'PC name', kind: 'text' },
          { key: 'macAddress', label: 'MAC address', kind: 'text' },
          { key: 'email', label: 'Email', kind: 'text' },
          { key: 'mobile', label: 'Mobile', kind: 'text' },
          { key: 'birthday', label: 'Birthday', kind: 'text', hint: 'DD/MM — no year' },
          { key: 'isActive', label: 'Active', kind: 'checkbox' },
        ];

        this.dataSource.data = members;
        this.loading = false;
      },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  applyFilter(event: Event): void {
    this.dataSource.filter = (event.target as HTMLInputElement).value.trim().toLowerCase();
  }

  openCreate(): void {
    this.openDialog('Add member', { isActive: true }, body => this.api.createMember(body));
  }

  openEdit(row: MemberDetailDto): void {
    // The list returns resolved names; the write API takes ids, so start from a
    // blank picker rather than mis-mapping a name into an id field.
    this.openDialog('Edit member', { ...row, teamId: null, positionId: null, originId: null },
      body => this.api.updateMember(row.id, body));
  }

  private openDialog(
    title: string,
    value: Record<string, unknown>,
    submit: (body: Record<string, unknown>) => { subscribe: Function },
  ): void {
    this.dialog
      .open(CrudFormDialogComponent, { data: { title, fields: this.fields, value }, width: '460px' })
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

  toggleAdmin(row: MemberDetailDto): void {
    const next = row.accessRole === 'Admin' ? 'Member' : 'Admin';
    if (!confirm(`Set ${row.username}'s access level to ${next}?`)) return;

    this.loading = true;
    this.api.setAccessRole(row.id, next).subscribe({
      next: () => { this.snackBar.open(`${row.username} is now ${next}.`, 'OK', { duration: 3000 }); this.load(); },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  resetPassword(row: MemberDetailDto): void {
    if (!confirm(
      `Clear ${row.username}'s password? They will be asked to set a new one at next sign-in, ` +
      'and all their sessions will be revoked.')) return;

    this.loading = true;
    this.api.resetPassword(row.id).subscribe({
      next: () => { this.snackBar.open('Password reset.', 'OK', { duration: 3000 }); this.load(); },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  deactivate(row: MemberDetailDto): void {
    if (!confirm(`Deactivate ${row.username}? Their vacation history is kept.`)) return;

    this.loading = true;
    this.api.deactivateMember(row.id).subscribe({
      next: () => { this.snackBar.open('Deactivated.', 'OK', { duration: 3000 }); this.load(); },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  private fail(err: unknown): void {
    this.snackBar.open(describeError(err), 'Dismiss', { duration: 6000 });
  }
}
