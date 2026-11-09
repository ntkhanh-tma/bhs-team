import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { describeError } from '../../core/services/data.service';
import { ForgotPasswordFormComponent } from '../../shared/components/forgot-password-form.component';

/**
 * Real sign-in, replacing the username-only dialog. Members imported from the
 * sheet have no password, so a first login returns a short-lived setup token and
 * this screen switches to the "choose a password" step.
 */
@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ForgotPasswordFormComponent],
  template: `
    <div class="min-h-[70vh] flex items-center justify-center px-4">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-8 border border-gray-100">

        <!-- Step 1: credentials -->
        <ng-container *ngIf="step === 'credentials'">
          <h2 class="text-2xl font-bold text-[#1E293B]">Welcome Back</h2>
          <p class="text-[#64748B] text-sm mt-1 mb-6">Sign in to continue.</p>

          <label class="block text-sm font-medium text-[#1E293B] mb-2">Username</label>
          <input [(ngModel)]="username" type="text" name="username" autocomplete="username"
                 placeholder="Enter username" [disabled]="busy"
                 class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4
                        focus:outline-none focus:ring-2 focus:ring-[#003bc4] focus:border-transparent" />

          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-[#1E293B]">Password</label>
            <button type="button" (click)="openForgot()" [disabled]="busy"
                    class="text-xs font-medium text-[#003bc4] hover:underline disabled:opacity-60">
              Forgot password?
            </button>
          </div>
          <input [(ngModel)]="password" type="password" name="password" autocomplete="current-password"
                 placeholder="Enter password" [disabled]="busy" (keydown.enter)="onLogin()"
                 class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm
                        focus:outline-none focus:ring-2 focus:ring-[#003bc4] focus:border-transparent" />

          <p *ngIf="error" class="text-red-500 text-xs mt-3">{{ error }}</p>

          <button (click)="onLogin()" [disabled]="busy"
                  class="w-full mt-6 bg-[#003bc4] text-white rounded-lg py-2.5 text-sm font-medium
                         hover:bg-[#002da3] disabled:opacity-60">
            {{ busy ? 'Signing in…' : 'Sign in' }}
          </button>

          <p class="text-[#94A3B8] text-xs mt-4 text-center">
            First time here? Sign in with the temporary password from your welcome email and you'll be asked to set your own.
          </p>
        </ng-container>

        <!-- Forgot password: emails a temporary password -->
        <ng-container *ngIf="step === 'forgot'">
          <h2 class="text-2xl font-bold text-[#1E293B] mb-1">Reset password</h2>
          <app-forgot-password-form [initialValue]="username" (back)="backToSignIn()"></app-forgot-password-form>
        </ng-container>

        <!-- Step 2: choose a password (first sign-in, or after a temporary one) -->
        <ng-container *ngIf="step === 'set-password'">
          <h2 class="text-2xl font-bold text-[#1E293B]">Choose a password</h2>
          <p class="text-[#64748B] text-sm mt-1 mb-6">
            Set your own password to finish signing in.
          </p>

          <label class="block text-sm font-medium text-[#1E293B] mb-2">New password</label>
          <input [(ngModel)]="newPassword" type="password" name="newPassword" autocomplete="new-password"
                 placeholder="At least 10 characters" [disabled]="busy"
                 class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm mb-4
                        focus:outline-none focus:ring-2 focus:ring-[#003bc4] focus:border-transparent" />

          <label class="block text-sm font-medium text-[#1E293B] mb-2">Confirm password</label>
          <input [(ngModel)]="confirmPassword" type="password" name="confirmPassword" autocomplete="new-password"
                 placeholder="Repeat it" [disabled]="busy" (keydown.enter)="onSetPassword()"
                 class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm
                        focus:outline-none focus:ring-2 focus:ring-[#003bc4] focus:border-transparent" />

          <p *ngIf="error" class="text-red-500 text-xs mt-3">{{ error }}</p>

          <button (click)="onSetPassword()" [disabled]="busy"
                  class="w-full mt-6 bg-[#003bc4] text-white rounded-lg py-2.5 text-sm font-medium
                         hover:bg-[#002da3] disabled:opacity-60">
            {{ busy ? 'Saving…' : 'Set password and continue' }}
          </button>
        </ng-container>

      </div>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  step: 'credentials' | 'forgot' | 'set-password' = 'credentials';
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
        this.navigateOnward();
      },
      error: err => {
        this.busy = false;
        this.error = describeError(err);
      },
    });
  }

  openForgot(): void {
    this.error = '';
    this.step = 'forgot';
  }

  backToSignIn(): void {
    this.password = '';
    this.error = '';
    this.step = 'credentials';
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
      next: () => { this.busy = false; this.navigateOnward(); },
      error: err => {
        this.busy = false;
        this.error = describeError(err);
        // An expired setup token means starting over from the credentials step.
        if ((err as { status?: number })?.status === 401) this.step = 'credentials';
      },
    });
  }

  private navigateOnward(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/home';
    this.router.navigateByUrl(returnUrl);
  }
}
