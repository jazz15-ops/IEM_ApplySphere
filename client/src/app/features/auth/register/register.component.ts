import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h2>IEM ApplySphere</h2>
        <p class="subtitle">Create an Applicant Account</p>

        <div *ngIf="errorMessage()" class="alert alert-error">
          {{ errorMessage() }}
        </div>

        <form (ngSubmit)="onSubmit()" #regForm="ngForm">
          <div class="form-group">
            <label for="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              [(ngModel)]="formData.name"
              required
              placeholder="Full Name"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="formData.email"
              required
              email
              placeholder="user@example.com"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="phone">Phone Number</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              [(ngModel)]="formData.phone"
              required
              placeholder="10-digit mobile number"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="formData.password"
              required
              minlength="6"
              placeholder="••••••••"
              class="form-control"
            />
          </div>

          <button type="submit" [disabled]="regForm.invalid || isLoading()" class="btn btn-primary">
            {{ isLoading() ? 'Creating Account...' : 'Register as Applicant' }}
          </button>
        </form>

        <div class="auth-footer">
          <p>Already have an account? <a routerLink="/login">Sign in here</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 1rem;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 2rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      background: #fff;
    }
    h2 { margin: 0 0 0.5rem; color: #1e293b; text-align: center; }
    .subtitle { color: #64748b; margin-bottom: 1.5rem; text-align: center; font-size: 0.9rem; }
    .form-group { margin-bottom: 1.15rem; }
    label { display: block; margin-bottom: 0.35rem; font-weight: 500; font-size: 0.875rem; color: #334155; }
    .form-control {
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      box-sizing: border-box;
      font-size: 0.95rem;
    }
    .btn {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.95rem;
      margin-top: 0.5rem;
    }
    .btn-primary { background: #2563eb; color: #fff; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .alert-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
      padding: 0.75rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }
    .auth-footer { margin-top: 1.5rem; text-align: center; font-size: 0.875rem; color: #64748b; }
    .auth-footer a { color: #2563eb; text-decoration: none; font-weight: 500; }
  `]
})
export class RegisterComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  formData = { name: '', email: '', phone: '', password: '' };
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.formData.name || !this.formData.email || !this.formData.phone || !this.formData.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.register(this.formData).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/applicant/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Registration failed. Please try again.');
      }
    });
  }
}
