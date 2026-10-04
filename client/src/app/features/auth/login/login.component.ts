import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h2>IEM ApplySphere</h2>
        <p class="subtitle">Sign in to your portal account</p>

        <div *ngIf="errorMessage()" class="alert alert-error">
          {{ errorMessage() }}
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              [(ngModel)]="credentials.email"
              required
              email
              placeholder="user@example.com"
              class="form-control"
            />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              [(ngModel)]="credentials.password"
              required
              placeholder="••••••••"
              class="form-control"
            />
          </div>

          <button type="submit" [disabled]="loginForm.invalid || isLoading()" class="btn btn-primary">
            {{ isLoading() ? 'Signing in...' : 'Sign In' }}
          </button>
        </form>

        <div class="auth-footer">
          <p>Don't have an account? <a routerLink="/register">Register here</a></p>
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
      max-width: 400px;
      padding: 2rem;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      background: #fff;
    }
    h2 { margin: 0 0 0.5rem; color: #1e293b; text-align: center; }
    .subtitle { color: #64748b; margin-bottom: 1.5rem; text-align: center; font-size: 0.9rem; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; margin-bottom: 0.35rem; font-weight: 500; font-size: 0.875rem; color: #334155; }
    .form-control {
      width: 100%;
      padding: 0.6rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      box-sizing: border-box;
      font-size: 0.95rem;
    }
    .form-control:focus { outline: none; border-color: #2563eb; ring: 2px #93c5fd; }
    .btn {
      width: 100%;
      padding: 0.75rem;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.95rem;
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
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  credentials = { email: '', password: '' };
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.credentials.email || !this.credentials.password) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.credentials).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.user.role === 'admin') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/applicant/dashboard']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to sign in. Please check credentials.');
      }
    });
  }
}
