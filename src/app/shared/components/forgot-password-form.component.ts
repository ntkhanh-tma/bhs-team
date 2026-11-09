import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { describeError } from '../../core/services/data.service';

/**
 * Forgot password, shared by the sign-in page and the sign-in dialog. The parent
 * owns the heading; this owns the body.
 *
 * The API answers every request the same way, so the confirmation never claims an
 * email was sent — only that one is on its way *if* the account matches.
 */
@Component({
  selector: 'app-forgot-password-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <ng-container *ngIf="!sent; else sentTpl">
      <p class="text-[#64748B] text-sm mb-6">
        Enter your username or email and we'll send a temporary password to the address on your profile.
      </p>

      <label class="block text-sm font-medium text-[#1E293B] mb-2">Username or email</label>
      <input [(ngModel)]="value" type="text" name="usernameOrEmail" autocomplete="username"
             placeholder="Enter username or email" [disabled]="busy" (keydown.enter)="onSubmit()"
             class="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm
                    focus:outline-none focus:ring-2 focus:ring-[#003bc4] focus:border-transparent" />

      <p *ngIf="error" class="text-red-500 text-xs mt-3">{{ error }}</p>

      <button (click)="onSubmit()" [disabled]="busy"
              class="w-full mt-6 bg-[#003bc4] text-white rounded-lg py-2.5 text-sm font-medium
                     hover:bg-[#002da3] disabled:opacity-60">
        {{ busy ? 'Sending…' : 'Send temporary password' }}
      </button>

      <button (click)="back.emit()" [disabled]="busy"
              class="w-full mt-3 text-sm text-[#64748B] hover:text-[#1E293B] disabled:opacity-60">
        Back to sign in
      </button>
    </ng-container>

    <ng-template #sentTpl>
      <div class="flex items-center justify-center w-11 h-11 rounded-full bg-[#e8eefb] text-[#003bc4] mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2"></rect>
          <path d="m3 7 9 6 9-6"></path>
        </svg>
      </div>

      <p class="text-sm text-[#1E293B]">
        If an account matches <span class="font-medium break-all">{{ submitted }}</span>, a temporary password
        is on its way to the email address on file. It works for 30 minutes.
      </p>
      <p class="text-sm text-[#64748B] mt-3">
        Your current password keeps working until then. No email after a few minutes? Check your spam folder,
        or ask an admin to confirm the address on your profile.
      </p>

      <button (click)="back.emit()"
              class="w-full mt-6 bg-[#003bc4] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#002da3]">
        Back to sign in
      </button>
    </ng-template>
  `,
})
export class ForgotPasswordFormComponent implements OnInit {
  /** Pre-fills the field with whatever was typed on the sign-in step. */
  @Input() initialValue = '';
  @Output() back = new EventEmitter<void>();

  private readonly auth = inject(AuthService);

  value = '';
  submitted = '';
  sent = false;
  busy = false;
  error = '';

  ngOnInit(): void {
    this.value = this.initialValue.trim();
  }

  onSubmit(): void {
    const who = this.value.trim();
    if (!who) { this.error = 'Please enter your username or email.'; return; }

    this.busy = true;
    this.error = '';

    this.auth.forgotPassword(who).subscribe({
      next: () => {
        this.busy = false;
        this.submitted = who;
        this.sent = true;
      },
      error: err => {
        this.busy = false;
        this.error = (err as { status?: number })?.status === 429
          ? 'Too many requests. Please wait a few minutes and try again.'
          : describeError(err);
      },
    });
  }
}
