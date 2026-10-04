import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-applicant-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard-layout">
      <header class="navbar">
        <div class="brand">IEM ApplySphere | Applicant Portal</div>
        <div class="user-info">
          <span>Welcome, <strong>{{ currentUser()?.name }}</strong> (Applicant)</span>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </header>
      <main class="content">
        <div class="card">
          <h3>Admission Application Status</h3>
          <p>Manage your admission application, update personal details, and save progress.</p>
          <div class="actions">
            <a routerLink="/applicant/application" class="btn-app">Open Admission Application Form →</a>
          </div>
          <div class="meta-info">
            <p><strong>Email:</strong> {{ currentUser()?.email }}</p>
            <p><strong>Phone:</strong> {{ currentUser()?.phone }}</p>
            <p><strong>Role:</strong> {{ currentUser()?.role }}</p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; min-height: 100vh; }
    .navbar { display: flex; justify-content: space-between; align-items: center; background: #1e293b; color: #fff; padding: 1rem 2rem; }
    .brand { font-size: 1.1rem; font-weight: 700; }
    .user-info { display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; }
    .btn-logout { background: #ef4444; color: #fff; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .content { padding: 2rem; max-width: 800px; margin: 0 auto; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h3 { margin-top: 0; color: #0f172a; }
    .actions { margin: 1.25rem 0; }
    .btn-app { background: #2563eb; color: #fff; text-decoration: none; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 600; display: inline-block; }
    .btn-app:hover { background: #1d4ed8; }
    .meta-info { margin-top: 1.5rem; border-top: 1px solid #f1f5f9; padding-top: 1rem; }
    .meta-info p { margin: 0.3rem 0; color: #475569; font-size: 0.9rem; }
  `]
})
export class ApplicantDashboardComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUserSignal;

  logout(): void {
    this.authService.logout();
  }
}
