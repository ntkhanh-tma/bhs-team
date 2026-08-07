import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { describeError } from '../../core/services/data.service';

/**
 * Modal sign-in. Same @Output contract as the username-only version it replaces,
 * so the header wiring in app.ts is unchanged — but it now takes a password and
 * handles the first-login setup step for members migrated from the sheet.
 */
@Component({
  selector: 'app-login-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
         (click)="onBackdropClick($event)">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8"
           (click)="$event.stopPropagation()">

        <div class="flex justify-between items-start mb-6">
          <div>
            <h2 class="text-2xl font-bold text-[#1E293B]">
              {{ step === 'credentials' ? 'Welcome Back' : 'Choose a password' }}
            </h2>
            <p class="text-[#64748B] text-sm mt-1">
              {{ step === 'credentials'
                  ? 'Sign in to continue.'
                  : 'Your account has no password yet.' }}
            </p>
          </div>
          <button (click)="close.emit()"
            class="text-[#64748B] hover:text-[#1E293B] text-xl leading-none">&times;</button>
        </div>

        <ng-container *ngIf="step === 'credentials'">
          <label class="block text-sm font-medium text-[#1E293B] mb-2">Username</label>
          <input [(ngModel)]="username" name="username" type="text" autocomplete="username"
                 placeholder="Enter username" [disabled]="busy"
                 class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4
                        focus:outline-none focus:ring-2 focus:ring-[#003bc4] focus:border-transparent" />

          <label class="block text-sm font-medium text-[#1E293B] mb-2">Password</label>
          <input [(ngModel)]="password" name="password" type="password" autocomplete="current-password"
                 placeholder="Enter password" [disabled]="busy" (keydown.enter)="onLogin()"
                 class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm
                        focus:outline-none focus:ring-2 focus:ring-[#003bc4] focus:border-transparent" />
        </ng-container>

        <ng-container *ngIf="step === 'set-password'">
          <label class="block text-sm font-medium text-[#1E293B] mb-2">New password</label>
          <input [(ngModel)]="newPassword" name="newPassword" type="password" autocomplete="new-password"
                 placeholder="At least 10 characters" [disabled]="busy"
                 class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4
                        focus:outline-none focus:ring-2 focus:ring-[#003bc4] focus:border-transparent" />

          <label class="block text-sm font-medium text-[#1E293B] mb-2">Confirm password</label>
          <input [(ngModel)]="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password"
                 placeholder="Repeat it" [disabled]="busy" (keydown.enter)="onSetPassword()"
                 class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm
                        focus:outline-none focus:ring-2 focus:ring-[#003bc4] focus:border-transparent" />
        </ng-container>

        <p *ngIf="error" class="text-red-500 text-xs mt-3">{{ error }}</p>

        <div class="flex gap-3 mt-6">
          <button (click)="close.emit()" [disabled]="busy"
            class="flex-1 border border-gray-200 text-[#1E293B] rounded-lg py-2.5 text-sm font-medium
                   hover:bg-gray-50 disabled:opacity-60">
            Cancel
          </button>
          <button (click)="step === 'credentials' ? onLogin() : onSetPassword()" [disabled]="busy"
            class="flex-1 bg-[#003bc4] text-white rounded-lg py-2.5 text-sm font-medium
                   hover:bg-[#002da3] disabled:opacity-60">
            {{ busy ? 'Please wait…' : (step === 'credentials' ? 'Sign in' : 'Save') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class LoginDialogComponent {
  @Output() close = new EventEmitter<void>();
  @Output() loggedIn = new EventEmitter<void>();

  private readonly auth = inject(AuthService);

  step: 'credentials' | 'set-password' = 'credentials';
  username = '';
  password = '';
  newPassword = '';
  confirmPassword = '';
  error = '';
  busy = false;

  private setupToken = '';

  onLogin(): void {
    const user = this.username.trim();
    if (!user) { this.error = 'Please enter your username.'; return; }
    if (!this.password) { this.error = 'Please enter your password.'; return; }

    this.busy = true;
    this.error = '';

    this.auth.login(user, this.password).subscribe({
      next: result => {
        this.busy = false;
        if (result.mustSetPassword && result.passwordSetupToken) {
          this.setupToken = result.passwordSetupToken;
          this.step = 'set-password';
          return;
        }
        this.loggedIn.emit();
        this.close.emit();
      },
      error: err => { this.busy = false; this.error = describeError(err); },
    });
  }

  onSetPassword(): void {
    if (this.newPassword.length < 10) {
      this.error = 'Password must be at least 10 characters long.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Those passwords do not match.';
      return;
    }

    this.busy = true;
    this.error = '';

    this.auth.setInitialPassword(this.setupToken, this.newPassword).subscribe({
      next: () => {
        this.busy = false;
        this.loggedIn.emit();
        this.close.emit();
      },
      error: err => {
        this.busy = false;
        this.error = describeError(err);
        if ((err as { status?: number })?.status === 401) this.step = 'credentials';
      },
    });
  }

  onBackdropClick(_event: MouseEvent): void { this.close.emit(); }
}
