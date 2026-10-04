import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, AdminApplicationListItem, AdminPaginationMeta, AdminAnalyticsResponse } from '../../core/services/admin.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="dashboard-layout">
      <header class="navbar">
        <div class="brand">IEM ApplySphere | Admin Analytics & Review Portal</div>
        <div class="user-info">
          <span>Welcome, <strong>{{ currentUser()?.name }}</strong> (Administrator)</span>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </header>

      <main class="content">
        <!-- Analytics Section -->
        <section class="analytics-section">
          <div class="section-title-bar">
            <h3>Applications Analytics & Workload Summary</h3>
            <button (click)="loadAnalytics()" class="btn-sm btn-refresh" [disabled]="isAnalyticsLoading()">
              🔄 Refresh Analytics
            </button>
          </div>

          <!-- Analytics Loading & Error States -->
          <div *ngIf="isAnalyticsLoading()" class="analytics-loading">
            <p>Gathering MongoDB statistical aggregation data...</p>
          </div>

          <div *ngIf="analyticsError()" class="alert alert-error">
            {{ analyticsError() }}
          </div>

          <!-- Analytics Content Widgets -->
          <ng-container *ngIf="!isAnalyticsLoading() && analytics() as data">
            <!-- 1. Summary Cards -->
            <div class="metrics-grid">
              <div class="metric-card total-card">
                <span class="metric-label">Total Applications</span>
                <span class="metric-value">{{ data.overview.totalApplications }}</span>
                <span class="metric-sub">All system records</span>
              </div>
              <div class="metric-card submitted-card">
                <span class="metric-label">Awaiting Review</span>
                <span class="metric-value">{{ data.overview.submitted }}</span>
                <span class="metric-sub">Submitted applications</span>
              </div>
              <div class="metric-card review-card">
                <span class="metric-label">Under Review</span>
                <span class="metric-value">{{ data.overview.underReview }}</span>
                <span class="metric-sub">In-progress evaluations</span>
              </div>
              <div class="metric-card selected-card">
                <span class="metric-label">Selected</span>
                <span class="metric-value">{{ data.overview.selected }}</span>
                <span class="metric-sub">Approved admissions</span>
              </div>
              <div class="metric-card rejected-card">
                <span class="metric-label">Rejected</span>
                <span class="metric-value">{{ data.overview.rejected }}</span>
                <span class="metric-sub">Not accepted</span>
              </div>
            </div>

            <div class="analytics-detail-grid">
              <!-- 2. Status Distribution (CSS Progress Bars) -->
              <div class="analytics-box">
                <h4>Status Distribution</h4>
                <div class="status-bars">
                  <div *ngFor="let item of data.byStatus" class="status-bar-item">
                    <div class="status-bar-header">
                      <span class="status-bar-name">{{ formatStatusLabel(item.status) }}</span>
                      <span class="status-bar-count"><strong>{{ item.count }}</strong> ({{ getPercentage(item.count, data.overview.totalApplications) }}%)</span>
                    </div>
                    <div class="progress-track">
                      <div
                        class="progress-fill"
                        [ngClass]="getStatusFillClass(item.status)"
                        [style.width.%]="getPercentage(item.count, data.overview.totalApplications)"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 3. Decision Summary & Pipeline Workload -->
              <div class="analytics-box">
                <h4>Decision & Workload Summary</h4>
                <div class="decision-rate-widget">
                  <div class="rate-circle">
                    <span class="rate-number">{{ data.decisions.selectionRate }}%</span>
                    <span class="rate-label">Selection Rate</span>
                  </div>
                  <div class="rate-details">
                    <div class="rate-detail-line">
                      <span>Decided Applications:</span>
                      <strong>{{ data.decisions.decidedApplications }}</strong>
                    </div>
                    <div class="rate-detail-line text-success">
                      <span>Selected Candidates:</span>
                      <strong>{{ data.decisions.selected }}</strong>
                    </div>
                    <div class="rate-detail-line text-danger">
                      <span>Rejected Candidates:</span>
                      <strong>{{ data.decisions.rejected }}</strong>
                    </div>
                  </div>
                </div>

                <div class="pipeline-summary-list">
                  <div class="pipeline-item">
                    <span>Awaiting Initial Review:</span>
                    <span class="badge-status badge-submitted">{{ data.reviewPipeline.awaitingReview }}</span>
                  </div>
                  <div class="pipeline-item">
                    <span>Currently Under Evaluation:</span>
                    <span class="badge-status badge-review">{{ data.reviewPipeline.currentlyUnderReview }}</span>
                  </div>
                  <div class="pipeline-item">
                    <span>Completed Final Decisions:</span>
                    <span class="badge-status badge-selected">{{ data.reviewPipeline.completedDecisions }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 4. Department Distribution -->
            <div class="analytics-box dept-box">
              <h4>Applications by Preferred Department</h4>
              <div *ngIf="data.byDepartment.length === 0" class="empty-dept">
                <p>No department data recorded yet.</p>
              </div>
              <div class="dept-grid" *ngIf="data.byDepartment.length > 0">
                <div *ngFor="let dept of data.byDepartment" class="dept-card">
                  <div class="dept-name">{{ dept.department }}</div>
                  <div class="dept-count-badge">{{ dept.count }} Applications</div>
                  <div class="progress-track mt-1">
                    <div
                      class="progress-fill fill-dept"
                      [style.width.%]="getPercentage(dept.count, data.overview.totalApplications)"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </ng-container>
        </section>

        <!-- Existing Application Review Filter & Table Header Card -->
        <div class="header-card">
          <h2>Admission Applications List</h2>
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
    .content { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    
    /* Analytics Styles */
    .analytics-section { margin-bottom: 2rem; }
    .section-title-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .section-title-bar h3 { margin: 0; color: #0f172a; font-size: 1.15rem; }
    .btn-refresh { background: #e2e8f0; color: #1e293b; border: 1px solid #cbd5e1; font-weight: 600; cursor: pointer; }
    .btn-refresh:hover { background: #cbd5e1; }
    .analytics-loading { background: #fff; padding: 1.5rem; text-align: center; border-radius: 8px; border: 1px solid #e2e8f0; color: #64748b; }

    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .metric-card { background: #fff; border-radius: 8px; padding: 1.25rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .metric-label { font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .metric-value { font-size: 1.8rem; font-weight: 800; color: #0f172a; margin: 0.3rem 0; }
    .metric-sub { font-size: 0.75rem; color: #94a3b8; }
    
    .total-card { border-left: 4px solid #0284c7; }
    .submitted-card { border-left: 4px solid #0369a1; }
    .review-card { border-left: 4px solid #6b21a8; }
    .selected-card { border-left: 4px solid #15803d; }
    .rejected-card { border-left: 4px solid #b91c1c; }

    .analytics-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem; }
    @media (max-width: 768px) { .analytics-detail-grid { grid-template-columns: 1fr; } }

    .analytics-box { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
    .analytics-box h4 { margin: 0 0 1rem 0; font-size: 0.95rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }
    
    .status-bars { display: flex; flex-direction: column; gap: 0.85rem; }
    .status-bar-header { display: flex; justify-content: space-between; font-size: 0.8rem; color: #334155; margin-bottom: 0.25rem; }
    .progress-track { background: #f1f5f9; height: 10px; border-radius: 6px; overflow: hidden; width: 100%; }
    .progress-fill { height: 100%; border-radius: 6px; transition: width 0.3s ease; }
    .fill-draft { background: #eab308; }
    .fill-submitted { background: #0284c7; }
    .fill-review { background: #9333ea; }
    .fill-selected { background: #16a34a; }
    .fill-rejected { background: #dc2626; }
    .fill-dept { background: #3b82f6; }

    .decision-rate-widget { display: flex; align-items: center; gap: 1.5rem; padding-bottom: 1rem; border-bottom: 1px dashed #e2e8f0; margin-bottom: 1rem; }
    .rate-circle { background: #0f172a; color: #38bdf8; width: 90px; height: 90px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .rate-number { font-size: 1.4rem; font-weight: 800; line-height: 1; }
    .rate-label { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; margin-top: 0.2rem; }
    .rate-details { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.85rem; flex: 1; }
    .rate-detail-line { display: flex; justify-content: space-between; color: #475569; }
    .text-success { color: #16a34a; }
    .text-danger { color: #dc2626; }

    .pipeline-summary-list { display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.8rem; }
    .pipeline-item { display: flex; justify-content: space-between; align-items: center; color: #475569; }

    .dept-box { margin-bottom: 1.5rem; }
    .dept-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 1rem; }
    .dept-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0.85rem; }
    .dept-name { font-weight: 700; font-size: 0.85rem; color: #0f172a; margin-bottom: 0.25rem; }
    .dept-count-badge { font-size: 0.75rem; color: #0284c7; font-weight: 600; }
    .mt-1 { margin-top: 0.5rem; }
    .empty-dept { text-align: center; color: #94a3b8; padding: 1rem; font-size: 0.85rem; }

    /* Application Table Header Styles */
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

  // Analytics Signals
  analytics = signal<AdminAnalyticsResponse | null>(null);
  isAnalyticsLoading = signal(false);
  analyticsError = signal<string | null>(null);

  searchQuery = '';
  statusFilter = '';
  deptFilter = '';
  currentPage = 1;

  ngOnInit(): void {
    this.loadAnalytics();
    this.loadApplications();
  }

  loadAnalytics(): void {
    this.isAnalyticsLoading.set(true);
    this.analyticsError.set(null);

    this.adminService.getAnalytics().subscribe({
      next: (data) => {
        this.isAnalyticsLoading.set(false);
        this.analytics.set(data);
      },
      error: (err) => {
        this.isAnalyticsLoading.set(false);
        this.analyticsError.set(err.error?.message || 'Failed to load admin analytics summary.');
      }
    });
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

  getPercentage(count: number, total: number): number {
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  }

  getStatusFillClass(status: string): string {
    switch (status) {
      case 'DRAFT': return 'fill-draft';
      case 'SUBMITTED': return 'fill-submitted';
      case 'UNDER_REVIEW': return 'fill-review';
      case 'SELECTED': return 'fill-selected';
      case 'REJECTED': return 'fill-rejected';
      default: return 'fill-submitted';
    }
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
