import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-applicant-dashboard',
  standalone: true,
  imports: [CommonModule],
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
          <h3>Applicant Dashboard Foundation</h3>
          <p>Authentication and role authorization verified. Applicant status is active.</p>
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
    .meta-info p { margin: 0.3rem 0; color: #475569; }
  `]
})
export class ApplicantDashboardComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUserSignal;

  logout(): void {
    this.authService.logout();
  }
}
