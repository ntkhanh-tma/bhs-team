import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppSettingDto } from '../../../core/models/api.models';
import { describeError } from '../../../core/services/data.service';
import { AdminApiService } from '../admin-api.service';

interface EditableSetting extends AppSettingDto {
  draft: string;
  boolDraft: boolean;
}

/**
 * The configuration screen. Everything here was a hardcoded constant in the
 * Angular bundle or in Code.gs; changes take effect immediately because the API
 * drops its settings cache on save.
 */
@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatCheckboxModule,
    MatFormFieldModule, MatInputModule, MatProgressBarModule, MatSnackBarModule,
  ],
  template: `
    <div class="flex items-start justify-between gap-4 mb-4">
      <div>
        <h1 class="text-2xl font-bold text-[#1E293B]">Settings</h1>
        <p class="text-sm text-[#64748B] mt-1 max-w-2xl">
          Booking rules are enforced by the server, so changes here take effect immediately —
          no redeploy needed.
        </p>
      </div>
      <button mat-flat-button color="primary" [disabled]="loading || !dirty" (click)="save()">
        Save changes
      </button>
    </div>

    <mat-progress-bar *ngIf="loading" mode="indeterminate" class="mb-4"></mat-progress-bar>

    <div *ngFor="let group of groups" class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-[#94A3B8] mb-3">
        {{ group.category }}
      </h2>

      <div class="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
        <div *ngFor="let setting of group.settings" class="p-4 flex flex-col gap-2">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <code class="text-sm font-semibold text-[#1E293B]">{{ setting.key }}</code>
              <p *ngIf="setting.description" class="text-xs text-[#64748B] mt-0.5">
                {{ setting.description }}
              </p>
            </div>
            <span class="text-[10px] uppercase tracking-wide text-[#94A3B8] shrink-0">
              {{ setting.valueType }}
            </span>
          </div>

          <mat-checkbox *ngIf="setting.valueType === 'Bool'"
                        [(ngModel)]="setting.boolDraft" (change)="markDirty()">
            Enabled
          </mat-checkbox>

          <mat-form-field *ngIf="setting.valueType !== 'Bool'" appearance="outline"
                          class="w-full" [class.max-w-xs]="setting.valueType === 'Int'">
            <input matInput
                   [type]="setting.valueType === 'Int' ? 'number' : 'text'"
                   [(ngModel)]="setting.draft" (ngModelChange)="markDirty()" />
            <mat-hint *ngIf="setting.valueType === 'Json'">Must be valid JSON.</mat-hint>
          </mat-form-field>
        </div>
      </div>
    </div>
  `,
})
export class AdminSettingsComponent implements OnInit {
  private readonly api = inject(AdminApiService);
  private readonly snackBar = inject(MatSnackBar);

  groups: { category: string; settings: EditableSetting[] }[] = [];
  loading = false;
  dirty = false;

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.dirty = false;

    this.api.listSettings().subscribe({
      next: settings => {
        const editable = settings.map<EditableSetting>(s => ({
          ...s,
          draft: s.value,
          boolDraft: s.value === 'true',
        }));

        const byCategory = new Map<string, EditableSetting[]>();
        editable.forEach(s => {
          if (!byCategory.has(s.category)) byCategory.set(s.category, []);
          byCategory.get(s.category)!.push(s);
        });

        this.groups = Array.from(byCategory.entries())
          .map(([category, list]) => ({ category, settings: list }))
          .sort((a, b) => a.category.localeCompare(b.category));

        this.loading = false;
      },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  markDirty(): void { this.dirty = true; }

  save(): void {
    const payload = this.groups.flatMap(g => g.settings).map(s => ({
      key: s.key,
      value: s.valueType === 'Bool' ? String(s.boolDraft) : s.draft,
    }));

    this.loading = true;
    this.api.updateSettings(payload).subscribe({
      next: () => {
        this.snackBar.open('Settings saved. Reload the app to pick up display changes.',
          'OK', { duration: 5000 });
        this.load();
      },
      error: err => { this.loading = false; this.fail(err); },
    });
  }

  private fail(err: unknown): void {
    this.snackBar.open(describeError(err), 'Dismiss', { duration: 6000 });
  }
}
