import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-layout">
      <header class="navbar">
        <div class="brand">IEM ApplySphere | Admin Portal</div>
        <div class="user-info">
          <span>Welcome, <strong>{{ currentUser()?.name }}</strong> (Administrator)</span>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </header>
      <main class="content">
        <div class="card">
          <h3>Admin Portal Foundation</h3>
          <p>Admin authentication and RBAC verified. You have administrative access.</p>
          <div class="meta-info">
            <p><strong>Email:</strong> {{ currentUser()?.email }}</p>
            <p><strong>Role Badge:</strong> <span class="badge-admin">ADMINISTRATOR</span></p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; min-height: 100vh; }
    .navbar { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 1rem 2rem; }
    .brand { font-size: 1.1rem; font-weight: 700; color: #38bdf8; }
    .user-info { display: flex; align-items: center; gap: 1rem; font-size: 0.9rem; }
    .btn-logout { background: #ef4444; color: #fff; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .content { padding: 2rem; max-width: 800px; margin: 0 auto; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h3 { margin-top: 0; color: #0f172a; }
    .badge-admin { background: #dbeafe; color: #1e40af; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.8rem; }
  `]
})
export class AdminDashboardComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUserSignal;

  logout(): void {
    this.authService.logout();
  }
}
