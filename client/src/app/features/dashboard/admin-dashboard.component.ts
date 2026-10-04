import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, AdminApplicationListItem, AdminPaginationMeta } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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
        <div class="header-card">
          <h2>Admission Applications Review</h2>
          <p>Review submitted candidate applications, filter by status or department, inspect documents, and execute status decisions.</p>

          <!-- Filter & Search Bar -->
          <div class="filter-bar">
            <div class="filter-group search-box">
              <input
                type="text"
                [(ngModel)]="searchQuery"
                (keyup.enter)="applyFilters()"
                placeholder="Search by App No, Name, or Email..."
                class="form-control"
              />
              <button (click)="applyFilters()" class="btn btn-search">Search</button>
            </div>

            <div class="filter-group">
              <select [(ngModel)]="statusFilter" (change)="applyFilters()" class="form-control">
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="SELECTED">Selected</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <div class="filter-group">
              <select [(ngModel)]="deptFilter" (change)="applyFilters()" class="form-control">
                <option value="">All Departments</option>
                <option value="School of Engineering & Technology">School of Engineering & Tech</option>
                <option value="Department of Management">Department of Management</option>
                <option value="School of Computer Applications">School of Computer Applications</option>
              </select>
            </div>

            <button (click)="resetFilters()" class="btn btn-reset">Reset</button>
          </div>
        </div>

        <!-- Applications Table Card -->
        <div class="card table-card">
          <div *ngIf="isLoading()" class="loading-state">
            <p>Loading application records...</p>
          </div>

          <div *ngIf="errorMessage()" class="alert alert-error">
            {{ errorMessage() }}
          </div>

          <div *ngIf="!isLoading() && applications().length === 0" class="empty-state">
            <p>No admission applications found matching the current filters.</p>
          </div>

          <div class="table-responsive" *ngIf="!isLoading() && applications().length > 0">
            <table class="data-table">
              <thead>
                <tr>
                  <th>App Number</th>
                  <th>Applicant Name & Email</th>
                  <th>Program / Department</th>
                  <th>Readiness</th>
                  <th>Status</th>
                  <th>Submitted Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let app of applications()">
                  <td class="font-mono"><strong>{{ app.applicationNumber }}</strong></td>
                  <td>
                    <div class="applicant-cell">
                      <span class="name">{{ app.applicantName }}</span>
                      <span class="email">{{ app.applicantEmail }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="dept-cell">
                      <span class="program">{{ app.programName }}</span>
                      <span class="dept">{{ app.preferredDepartment }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="readiness-cell">
                      <div class="readiness-badge" [ngClass]="app.readinessScore === 100 ? 'ready-100' : 'ready-partial'">
                        {{ app.readinessScore }}%
                      </div>
                    </div>
                  </td>
                  <td>
                    <span [class]="getStatusBadgeClass(app.status)">
                      {{ formatStatusLabel(app.status) }}
                    </span>
                  </td>
                  <td class="date-cell">
                    {{ app.submittedAt ? (app.submittedAt | date:'mediumDate') : 'Not Submitted' }}
                  </td>
                  <td>
                    <a [routerLink]="['/admin/applications', app._id]" class="btn-sm btn-review">
                      Review Application →
                    </a>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="pagination-bar" *ngIf="pagination() && pagination()!.totalPages > 1">
            <span class="pagination-info">
              Showing Page {{ pagination()?.page }} of {{ pagination()?.totalPages }} (Total {{ pagination()?.total }} Applications)
            </span>

            <div class="pagination-controls">
              <button
                (click)="goToPage(pagination()!.page - 1)"
                [disabled]="pagination()!.page <= 1"
                class="btn-sm btn-page"
              >
                ← Previous
              </button>
              <span class="current-page">{{ pagination()?.page }}</span>
              <button
                (click)="goToPage(pagination()!.page + 1)"
                [disabled]="pagination()!.page >= pagination()!.totalPages"
                class="btn-sm btn-page"
              >
                Next →
              </button>
            </div>
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
    .content { padding: 2rem; max-width: 1100px; margin: 0 auto; }
    
    .header-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .header-card h2 { margin: 0 0 0.5rem 0; color: #0f172a; }
    .header-card p { margin: 0 0 1.25rem 0; color: #64748b; font-size: 0.9rem; }

    .filter-bar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }
    .filter-group { display: flex; gap: 0.5rem; }
    .search-box { flex: 1; min-width: 280px; }
    .form-control { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.85rem; width: 100%; }
    .form-control:focus { outline: none; border-color: #2563eb; }

    .btn { padding: 0.5rem 1rem; border-radius: 6px; border: none; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
    .btn-search { background: #2563eb; color: #fff; }
    .btn-search:hover { background: #1d4ed8; }
    .btn-reset { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
    .btn-reset:hover { background: #e2e8f0; }

    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .table-card { padding: 0; overflow: hidden; }

    .data-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
    .data-table th { background: #f8fafc; color: #475569; padding: 0.85rem 1rem; font-weight: 700; border-bottom: 1px solid #e2e8f0; }
    .data-table td { padding: 0.85rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
    .data-table tr:hover { background: #f8fafc; }

    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0284c7; }
    .applicant-cell { display: flex; flex-direction: column; }
    .applicant-cell .name { font-weight: 600; color: #0f172a; }
    .applicant-cell .email { color: #64748b; font-size: 0.8rem; }

    .dept-cell { display: flex; flex-direction: column; }
    .dept-cell .program { font-weight: 600; color: #334155; }
    .dept-cell .dept { color: #64748b; font-size: 0.8rem; }

    .readiness-badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 12px; font-weight: 700; font-size: 0.8rem; }
    .ready-100 { background: #dcfce7; color: #15803d; }
    .ready-partial { background: #fef3c7; color: #92400e; }

    .badge-status { padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
    .badge-draft { background: #fef08a; color: #854d0e; }
    .badge-submitted { background: #bae6fd; color: #0369a1; }
    .badge-review { background: #e9d5ff; color: #6b21a8; }
    .badge-selected { background: #bbf7d0; color: #15803d; }
    .badge-rejected { background: #fecaca; color: #991b1b; }

    .date-cell { color: #64748b; font-size: 0.8rem; }

    .btn-sm { padding: 0.4rem 0.75rem; border-radius: 4px; border: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-review { background: #0f172a; color: #38bdf8; }
    .btn-review:hover { background: #1e293b; }

    .pagination-bar { display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 0.85rem; color: #64748b; }
    .pagination-controls { display: flex; align-items: center; gap: 0.5rem; }
    .btn-page { background: #fff; border: 1px solid #cbd5e1; color: #334155; }
    .btn-page:disabled { opacity: 0.4; cursor: not-allowed; }
    .current-page { font-weight: 700; color: #0f172a; padding: 0 0.4rem; }

    .loading-state, .empty-state { padding: 3rem; text-align: center; color: #64748b; font-size: 0.95rem; }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 1rem; margin: 1rem; border-radius: 6px; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  currentUser = this.authService.currentUserSignal;
  applications = signal<AdminApplicationListItem[]>([]);
  pagination = signal<AdminPaginationMeta | null>(null);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  searchQuery = '';
  statusFilter = '';
  deptFilter = '';
  currentPage = 1;

  ngOnInit(): void {
    this.loadApplications();
  }

  loadApplications(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getApplications({
      status: this.statusFilter,
      department: this.deptFilter,
      search: this.searchQuery,
      page: this.currentPage,
      limit: 10
    }).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        this.applications.set(res.applications);
        this.pagination.set(res.pagination);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to load admission applications.');
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadApplications();
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.statusFilter = '';
    this.deptFilter = '';
    this.currentPage = 1;
    this.loadApplications();
  }

  goToPage(page: number): void {
    if (page < 1 || (this.pagination() && page > this.pagination()!.totalPages)) return;
    this.currentPage = page;
    this.loadApplications();
  }

  formatStatusLabel(status: string): string {
    switch (status) {
      case 'DRAFT': return 'DRAFT';
      case 'SUBMITTED': return 'SUBMITTED';
      case 'UNDER_REVIEW': return 'UNDER REVIEW';
      case 'SELECTED': return 'SELECTED ✓';
      case 'REJECTED': return 'REJECTED ✕';
      default: return status;
    }
  }

  getStatusBadgeClass(status: string): string {
    const base = 'badge-status ';
    switch (status) {
      case 'DRAFT': return base + 'badge-draft';
      case 'SUBMITTED': return base + 'badge-submitted';
      case 'UNDER_REVIEW': return base + 'badge-review';
      case 'SELECTED': return base + 'badge-selected';
      case 'REJECTED': return base + 'badge-rejected';
      default: return base + 'badge-draft';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}
