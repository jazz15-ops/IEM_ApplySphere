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
    <div class="auth-wrapper fade-in">
      <!-- Left Hero Branding Section -->
      <div class="auth-hero-panel">
        <div class="brand-badge">
          <span class="badge-logo">IEM</span>
          <span class="badge-title">ApplySphere</span>
        </div>

        <h1 class="hero-title">Candidate Admission Portal Registration</h1>
        <p class="hero-desc">
          Create your candidate account to start your university admission application, track readiness metrics, upload documents securely, and submit for institutional evaluation.
        </p>

        <div class="hero-features">
          <div class="feature-item">
            <span class="feature-icon">🎓</span>
            <div>
              <strong>Single Candidate Account</strong>
              <p>One applicant profile for undergraduate and postgraduate applications.</p>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📊</span>
            <div>
              <strong>Real-Time Completeness Tracking</strong>
              <p>Instant visual feedback on profile completeness before final submission.</p>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">📁</span>
            <div>
              <strong>Encrypted Certificate Uploads</strong>
              <p>Upload Class 10/12 marksheets, photo, and identity proof safely.</p>
            </div>
          </div>
        </div>

        <div class="hero-footer">
          Academic Admission Management POC | IEM ApplySphere
        </div>
      </div>

      <!-- Right Form Card Section -->
      <div class="auth-form-panel">
        <div class="auth-card">
          <div class="card-header">
            <h2>Candidate Registration</h2>
            <p>Fill in your details below to register your applicant profile</p>
          </div>

          <div *ngIf="errorMessage()" class="alert alert-error">
            <span>⚠</span> {{ errorMessage() }}
          </div>

          <form (ngSubmit)="onSubmit()" #regForm="ngForm">
            <div class="form-group">
              <label for="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                [(ngModel)]="formData.name"
                required
                placeholder="e.g. Ananya Roy"
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label for="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                [(ngModel)]="formData.email"
                required
                email
                placeholder="ananya@example.com"
                class="form-control"
              />
            </div>

            <div class="form-group">
              <label for="phone">Mobile Phone Number *</label>
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
              <label for="password">Account Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                [(ngModel)]="formData.password"
                required
                minlength="6"
                placeholder="At least 6 characters"
                class="form-control"
              />
            </div>

            <button type="submit" [disabled]="regForm.invalid || isLoading()" class="btn btn-primary btn-block">
              <span *ngIf="isLoading()" class="spinner">⏳</span>
              {{ isLoading() ? 'Creating Profile...' : 'Register Applicant Profile →' }}
            </button>
          </form>

          <div class="auth-card-footer">
            <p>Already registered? <a routerLink="/login">Sign in here</a></p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-wrapper {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 100vh;
      background-color: var(--color-bg-light);
    }

    @media (max-width: 900px) {
      .auth-wrapper { grid-template-columns: 1fr; }
      .auth-hero-panel { display: none; }
    }

    /* Left Hero Panel */
    .auth-hero-panel {
      background: linear-gradient(145deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      padding: 4rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 4px solid var(--color-accent-blue);
    }

    .brand-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
    }

    .badge-logo {
      background: var(--color-accent-blue);
      color: #fff;
      font-weight: 800;
      padding: 0.4rem 0.75rem;
      border-radius: 6px;
      font-size: 1.1rem;
      letter-spacing: 0.05em;
    }

    .badge-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: -0.01em;
    }

    .hero-title {
      font-size: 2.1rem;
      font-weight: 800;
      line-height: 1.25;
      margin: 2rem 0 1rem 0;
      color: #f8fafc;
    }

    .hero-desc {
      font-size: 1rem;
      color: #94a3b8;
      line-height: 1.6;
      margin-bottom: 2.5rem;
    }

    .hero-features {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .feature-item {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
      background: rgba(255, 255, 255, 0.04);
      padding: 1rem 1.25rem;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .feature-icon {
      font-size: 1.35rem;
      line-height: 1;
    }

    .feature-item strong {
      display: block;
      color: #f1f5f9;
      font-size: 0.95rem;
      margin-bottom: 0.2rem;
    }

    .feature-item p {
      margin: 0;
      font-size: 0.825rem;
      color: #94a3b8;
    }

    .hero-footer {
      font-size: 0.8rem;
      color: #64748b;
      margin-top: 3rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 1rem;
    }

    /* Right Form Panel */
    .auth-form-panel {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 2rem;
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      background: #ffffff;
      padding: 2.5rem;
      border-radius: 12px;
      border: 1px solid var(--color-border-medium);
      box-shadow: var(--shadow-lg);
    }

    .card-header {
      text-align: center;
      margin-bottom: 1.75rem;
    }

    .card-header h2 {
      margin: 0 0 0.4rem 0;
      color: var(--color-navy-dark);
      font-size: 1.5rem;
    }

    .card-header p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }

    .btn-block {
      width: 100%;
      padding: 0.8rem;
      font-size: 0.95rem;
      margin-top: 0.75rem;
    }

    .auth-card-footer {
      margin-top: 1.75rem;
      text-align: center;
      font-size: 0.875rem;
      color: var(--color-text-muted);
      border-top: 1px solid var(--color-border-subtle);
      padding-top: 1.25rem;
    }

    .auth-card-footer a {
      color: var(--color-accent-blue);
      text-decoration: none;
      font-weight: 600;
    }

    .auth-card-footer a:hover {
      text-decoration: underline;
    }
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
