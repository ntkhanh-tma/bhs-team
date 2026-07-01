import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Member } from '../../core/models/models';
import { MockDataService } from '../../core/services/mock-data.service';
import { ProfileUpdatePayload } from '../../core/services/api.service';

interface ProfileForm {
  department: string;
  dc: string;
  ip: string;
  publicIp: string;
  pcName: string;
  macAddress: string;
  email: string;
  mobile: string;
  birthday: string;
  username: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="min-h-full bg-[#F8FAFC] p-6">
      <div class="max-w-xl mx-auto">

        <!-- Back -->
        <a routerLink="/home"
           class="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#1E293B] mb-5 transition-colors">
          &#8249; Back
        </a>

        <!-- Not logged in -->
        <div *ngIf="!user" class="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <p class="text-[#64748B]">You must be logged in to view your profile.</p>
          <a routerLink="/home" class="mt-4 inline-block text-sm text-[#003bc4] underline">Go to Home</a>
        </div>

        <ng-container *ngIf="user">

          <!-- Avatar + identity -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
            <div class="flex items-center gap-4">
              <div class="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-4xl flex-shrink-0 select-none">
                {{ user.avatarUrl }}
              </div>
              <div>
                <h1 class="text-xl font-bold text-[#1E293B]">{{ user.name }}</h1>
                <p class="text-sm text-[#64748B] mt-0.5">{{ user.position }}</p>
                <span class="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                  {{ user.department || 'No team' }}
                </span>
              </div>
            </div>
            <!-- Read-only badge row -->
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div class="bg-gray-50 rounded-lg px-3 py-2">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-0.5">ID</p>
                <p class="text-sm font-mono text-[#475569]">{{ user.id || '—' }}</p>
              </div>
              <div class="bg-gray-50 rounded-lg px-3 py-2">
                <p class="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-0.5">Role</p>
                <p class="text-sm text-[#475569]">{{ user.position || '—' }}</p>
              </div>
            </div>
          </div>

          <!-- Editable fields -->
          <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 class="text-sm font-bold text-[#1E293B] mb-4">Profile Details</h2>

            <div class="space-y-3">

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Team</label>
                  <input [(ngModel)]="form.department"
                         placeholder="e.g. BESTMED"
                         class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003bc4]/20 focus:border-[#003bc4] transition-colors" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">DC</label>
                  <input [(ngModel)]="form.dc"
                         placeholder="e.g. DC01"
                         class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003bc4]/20 focus:border-[#003bc4] transition-colors" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">IP Address</label>
                  <input [(ngModel)]="form.ip"
                         placeholder="e.g. 192.168.1.10"
                         class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003bc4]/20 focus:border-[#003bc4] transition-colors font-mono" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Public IP</label>
                  <input [(ngModel)]="form.publicIp"
                         placeholder="e.g. 203.0.113.10"
                         class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003bc4]/20 focus:border-[#003bc4] transition-colors font-mono" />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">PC Name</label>
                  <input [(ngModel)]="form.pcName"
                         placeholder="e.g. BHS-PC-001"
                         class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003bc4]/20 focus:border-[#003bc4] transition-colors font-mono" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">MAC Address</label>
                  <input [(ngModel)]="form.macAddress"
                         placeholder="e.g. AA:BB:CC:DD:EE:FF"
                         class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003bc4]/20 focus:border-[#003bc4] transition-colors font-mono" />
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">BHS Email</label>
                <input [(ngModel)]="form.email"
                       type="email"
                       placeholder="e.g. you@bestmed.com.au"
                       class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003bc4]/20 focus:border-[#003bc4] transition-colors" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Mobile</label>
                  <input [(ngModel)]="form.mobile"
                         placeholder="e.g. +84 90 000 0000"
                         class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003bc4]/20 focus:border-[#003bc4] transition-colors" />
                </div>
                <div>
                  <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Birthday</label>
                  <input [(ngModel)]="form.birthday"
                         placeholder="e.g. 1995-06-15"
                         class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003bc4]/20 focus:border-[#003bc4] transition-colors" />
                </div>
              </div>

              <!-- Username — separate section with warning -->
              <div class="border-t border-gray-100 pt-3 mt-1">
                <label class="block text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">
                  Username
                  <span *ngIf="usernameChanged" class="normal-case text-amber-600 ml-1">&#9888; Changing this updates your login</span>
                </label>
                <input [(ngModel)]="form.username"
                       autocomplete="off"
                       class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-colors font-mono"
                       [class.border-amber-300]="usernameChanged" />
              </div>

            </div>

            <!-- Status message -->
            <div *ngIf="statusMsg"
                 class="mt-4 rounded-lg px-3 py-2 text-sm"
                 [class.bg-green-50]="statusOk"
                 [class.text-green-700]="statusOk"
                 [class.bg-red-50]="!statusOk"
                 [class.text-red-700]="!statusOk">
              {{ statusMsg }}
            </div>

            <!-- Actions -->
            <div class="flex gap-2 mt-5">
              <button (click)="save()"
                      [disabled]="saving"
                      class="flex-1 bg-[#003bc4] text-white text-sm font-semibold px-4 py-2.5 rounded-lg
                             hover:bg-[#0031a8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {{ saving ? 'Saving…' : 'Save Changes' }}
              </button>
              <button (click)="reset()"
                      [disabled]="saving"
                      class="px-4 py-2.5 text-sm text-[#64748B] hover:text-[#1E293B] rounded-lg border border-gray-200
                             hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Reset
              </button>
            </div>
          </div>

        </ng-container>
      </div>
    </div>
  `,
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: Member | null = null;
  form: ProfileForm = this.emptyForm();
  saving = false;
  statusMsg = '';
  statusOk = false;

  private destroy$ = new Subject<void>();

  constructor(
    private dataService: MockDataService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.dataService.authenticatedUser$.pipe(takeUntil(this.destroy$)).subscribe(u => {
      this.user = u;
      if (u) this.populateForm(u);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get usernameChanged(): boolean {
    return !!this.user && this.form.username.trim().toLowerCase() !== this.user.username;
  }

  private emptyForm(): ProfileForm {
    return { department: '', dc: '', ip: '', publicIp: '', pcName: '', macAddress: '', email: '', mobile: '', birthday: '', username: '' };
  }

  private populateForm(u: Member): void {
    this.form = {
      department: u.department   ?? '',
      dc:         u.dc           ?? '',
      ip:         u.ip           ?? '',
      publicIp:   u.publicIp     ?? '',
      pcName:     u.pcName       ?? '',
      macAddress: u.macAddress   ?? '',
      email:      u.email        ?? '',
      mobile:     u.mobile       ?? '',
      birthday:   u.birthday     ?? '',
      username:   u.username     ?? '',
    };
  }

  reset(): void {
    if (this.user) this.populateForm(this.user);
    this.statusMsg = '';
  }

  save(): void {
    if (!this.user || this.saving) return;
    this.saving = true;
    this.statusMsg = '';

    const updates: ProfileUpdatePayload['updates'] = {
      department: this.form.department.trim(),
      dc:         this.form.dc.trim(),
      ip:         this.form.ip.trim(),
      publicIp:   this.form.publicIp.trim(),
      pcName:     this.form.pcName.trim(),
      macAddress: this.form.macAddress.trim(),
      email:      this.form.email.trim(),
      mobile:     this.form.mobile.trim(),
      birthday:   this.form.birthday.trim(),
      username:   this.form.username.trim().toLowerCase(),
    };

    this.dataService.updateMemberProfile(updates).subscribe(result => {
      this.saving = false;
      this.statusOk = result.success;
      this.statusMsg = result.success ? 'Profile saved successfully.' : (result.error ?? 'Unknown error.');
    });
  }
}
