import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, AdminApplicationListItem, AdminPaginationMeta, AdminAnalyticsResponse } from '../../core/services/admin.service';
import { BTECH_PROGRAMS } from '../../core/constants/programs.constant';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="dashboard-layout fade-in">
      <header class="navbar">
        <div class="brand-container">
          <div class="brand-logo-container">
            <img src="/iem-logo.png" alt="Institute of Engineering & Management" class="brand-logo-img" />
          </div>
          <div class="brand-text">
            <span class="brand-title">ApplySphere</span>
            <span class="brand-subtitle">Admission Operations Console</span>
          </div>
        </div>
        <div class="user-nav-box">
          <div class="user-badge-info">
            <span class="user-name">{{ currentUser()?.name }}</span>
            <span class="user-role-pill">Administrator</span>
          </div>
          <button (click)="logout()" class="btn-logout">Sign Out</button>
        </div>
      </header>

      <main class="page-container">
        <!-- Section 1: Analytics & Pipeline Summary -->
        <section class="analytics-section">
          <div class="section-header-bar">
            <div>
              <span class="card-kicker">Real-Time MongoDB Aggregation</span>
              <h2>Admissions Pipeline & Statistical Summary</h2>
            </div>
            <button (click)="loadAnalytics()" class="btn btn-secondary btn-sm" [disabled]="isAnalyticsLoading()">
              🔄 Refresh Analytics
            </button>
          </div>

          <!-- Analytics Loading & Error States -->
          <div *ngIf="isAnalyticsLoading()" class="card-elevated loading-box">
            <p>Processing MongoDB statistical aggregation pipelines...</p>
          </div>

          <div *ngIf="analyticsError()" class="alert alert-error">
            <span>⚠</span> {{ analyticsError() }}
          </div>

          <!-- Analytics Widgets Grid -->
          <ng-container *ngIf="!isAnalyticsLoading() && analytics() as data">
            <!-- 5 Overview Summary Cards -->
            <div class="metrics-grid">
              <div class="metric-card total-card">
                <span class="metric-label">Total Applications</span>
                <span class="metric-value">{{ data.overview.totalApplications }}</span>
                <span class="metric-sub">All system records</span>
              </div>
              <div class="metric-card submitted-card">
                <span class="metric-label">Awaiting Review</span>
                <span class="metric-value">{{ data.overview.submitted }}</span>
                <span class="metric-sub">Submitted candidates</span>
              </div>
              <div class="metric-card review-card">
                <span class="metric-label">Under Evaluation</span>
                <span class="metric-value">{{ data.overview.underReview }}</span>
                <span class="metric-sub">Active reviews</span>
              </div>
              <div class="metric-card selected-card">
                <span class="metric-label">Selected</span>
                <span class="metric-value">{{ data.overview.selected }}</span>
                <span class="metric-sub">Approved admissions</span>
              </div>
              <div class="metric-card rejected-card">
                <span class="metric-label">Rejected</span>
                <span class="metric-value">{{ data.overview.rejected }}</span>
                <span class="metric-sub">Declined candidates</span>
              </div>
            </div>

            <div class="analytics-split-grid">
              <!-- Status Distribution Progress Bars -->
              <div class="card-elevated analytics-box">
                <h3 class="widget-title">Applications by Workflow Status</h3>
                <div class="status-bars-list">
                  <div *ngFor="let item of data.byStatus" class="bar-row">
                    <div class="bar-row-head">
                      <span class="status-name">{{ formatStatusLabel(item.status) }}</span>
                      <span class="status-count-tag">
                        <strong>{{ item.count }}</strong> ({{ getPercentage(item.count, data.overview.totalApplications) }}%)
                      </span>
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

              <!-- Decision Summary & Review Pipeline -->
              <div class="card-elevated analytics-box">
                <h3 class="widget-title">Admissions Decision & Workload Summary</h3>
                <div class="decision-rate-row">
                  <div class="rate-circle-badge">
                    <span class="rate-num">{{ data.decisions.selectionRate }}%</span>
                    <span class="rate-text">Selection Rate</span>
                  </div>
                  <div class="rate-breakdown-list">
                    <div class="rate-item">
                      <span>Decided Candidates:</span>
                      <strong>{{ data.decisions.decidedApplications }}</strong>
                    </div>
                    <div class="rate-item text-success">
                      <span>Selected Candidates:</span>
                      <strong>{{ data.decisions.selected }}</strong>
                    </div>
                    <div class="rate-item text-danger">
                      <span>Rejected Candidates:</span>
                      <strong>{{ data.decisions.rejected }}</strong>
                    </div>
                  </div>
                </div>

                <div class="pipeline-list">
                  <div class="pipeline-row">
                    <span>Awaiting Review (SUBMITTED):</span>
                    <span class="badge-status badge-submitted">{{ data.reviewPipeline.awaitingReview }}</span>
                  </div>
                  <div class="pipeline-row">
                    <span>In Active Review (UNDER_REVIEW):</span>
                    <span class="badge-status badge-review">{{ data.reviewPipeline.currentlyUnderReview }}</span>
                  </div>
                  <div class="pipeline-row">
                    <span>Completed Decisions (SELECTED/REJECTED):</span>
                    <span class="badge-status badge-selected">{{ data.reviewPipeline.completedDecisions }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Department Distribution Grid -->
            <div class="card-elevated analytics-box dept-box">
              <h3 class="widget-title">Applications by Preferred Department</h3>
              <div *ngIf="data.byDepartment.length === 0" class="empty-state">
                <p>No department records registered yet.</p>
              </div>
              <div class="dept-card-grid" *ngIf="data.byDepartment.length > 0">
                <div *ngFor="let dept of data.byDepartment" class="dept-metric-card">
                  <span class="dept-title-text">{{ dept.department }}</span>
                  <div class="dept-count-strip">
                    <strong>{{ dept.count }}</strong> Applications ({{ getPercentage(dept.count, data.overview.totalApplications) }}%)
                  </div>
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

        <!-- Section 2: Application Review Table & Filtering -->
        <section class="applications-section">
          <div class="card-elevated filter-card">
            <div class="section-title">
              <h2>Candidate Applications Review Workspace</h2>
              <p>Search candidate records, filter by status or B.Tech programme, view document attachments, and execute server-controlled status evaluations.</p>
            </div>

            <!-- Filter Controls -->
            <div class="filter-controls-row">
              <div class="search-input-wrap">
                <input
                  type="text"
                  [(ngModel)]="searchQuery"
                  (keyup.enter)="applyFilters()"
                  placeholder="Search by App No, Name, or Email..."
                  class="form-control"
                />
                <button (click)="applyFilters()" class="btn btn-primary">Search</button>
              </div>

              <div class="filter-dropdown-wrap">
                <select [(ngModel)]="statusFilter" (change)="applyFilters()" class="form-control">
                  <option value="">All Workflow Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="SELECTED">Selected</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div class="filter-dropdown-wrap">
                <select [(ngModel)]="deptFilter" (change)="applyFilters()" class="form-control">
                  <option value="">All B.Tech Programmes</option>
                  <option *ngFor="let prog of btechPrograms" [value]="prog">{{ prog }}</option>
                </select>
              </div>

              <button (click)="resetFilters()" class="btn btn-secondary">Reset</button>
            </div>
          </div>

          <!-- Applications Table Card -->
          <div class="card-elevated table-container-card">
            <div *ngIf="isLoading()" class="loading-box">
              <p>Loading candidate application records...</p>
            </div>

            <div *ngIf="errorMessage()" class="alert alert-error">
              <span>⚠</span> {{ errorMessage() }}
            </div>

            <div *ngIf="!isLoading() && applications().length === 0" class="empty-state">
              <p>No admission applications match the specified search or filter criteria.</p>
            </div>

            <div class="table-responsive" *ngIf="!isLoading() && applications().length > 0">
              <table class="admin-data-table">
                <thead>
                  <tr>
                    <th>App Number</th>
                    <th>Candidate Name & Email</th>
                    <th>Degree / Programme</th>
                    <th>Readiness Index</th>
                    <th>Workflow Status</th>
                    <th>Submitted Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let app of applications()">
                    <td class="font-mono"><strong>{{ app.applicationNumber }}</strong></td>
                    <td>
                      <div class="cell-column">
                        <span class="candidate-name">{{ app.applicantName }}</span>
                        <span class="candidate-email">{{ app.applicantEmail }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="cell-column">
                        <span class="program-title">{{ formatDegree(app.programName) }}</span>
                        <span class="dept-subtitle">{{ app.preferredDepartment }}</span>
                      </div>
                    </td>
                    <td>
                      <div class="readiness-pill-box" [ngClass]="app.readinessScore === 100 ? 'ready-full' : 'ready-part'">
                        {{ app.readinessScore }}%
                      </div>
                    </td>
                    <td>
                      <span [class]="getStatusBadgeClass(app.status)">
                        {{ formatStatusLabel(app.status) }}
                      </span>
                    </td>
                    <td class="date-text">
                      {{ app.submittedAt ? (app.submittedAt | date:'mediumDate') : 'Not Submitted' }}
                    </td>
                    <td>
                      <a [routerLink]="['/admin/applications', app._id]" class="btn btn-primary btn-sm">
                        Review Candidate →
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination Bar -->
            <div class="pagination-footer" *ngIf="pagination() && pagination()!.totalPages > 1">
              <span class="pagination-text">
                Showing Page {{ pagination()?.page }} of {{ pagination()?.totalPages }} (Total {{ pagination()?.total }} Applications)
              </span>

              <div class="pagination-btns">
                <button
                  (click)="goToPage(pagination()!.page - 1)"
                  [disabled]="pagination()!.page <= 1"
                  class="btn btn-secondary btn-sm"
                >
                  ← Previous
                </button>
                <span class="page-current-num">{{ pagination()?.page }}</span>
                <button
                  (click)="goToPage(pagination()!.page + 1)"
                  [disabled]="pagination()!.page >= pagination()!.totalPages"
                  class="btn btn-secondary btn-sm"
                >
                  Next →
                </button>
              </div>
            </div>
          </div>
        </section>

        <div class="footer-poc">
          Academic Admission Management POC | IEM ApplySphere Admin Portal
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout { min-height: 100vh; background-color: var(--color-bg-light); }

    /* Section Header */
    .section-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: 1.5rem;
    }

    .section-header-bar h2 {
      margin: 0.2rem 0 0 0;
      color: var(--color-navy-dark);
      font-size: 1.6rem;
      font-weight: 800;
    }

    .card-kicker {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
    }

    /* Summary Metrics Cards */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }

    .metric-card {
      background: #ffffff;
      border-radius: var(--radius-md);
      padding: 1.25rem;
      border: 1px solid var(--color-border-subtle);
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-sm);
    }

    .metric-label {
      font-size: 0.775rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-text-muted);
      letter-spacing: 0.04em;
    }

    .metric-value {
      font-size: 2rem;
      font-weight: 800;
      color: var(--color-navy-dark);
      margin: 0.2rem 0;
    }

    .metric-sub {
      font-size: 0.75rem;
      color: var(--color-text-light);
    }

    .total-card { border-left: 4px solid var(--color-accent-blue); }
    .submitted-card { border-left: 4px solid var(--color-info); }
    .review-card { border-left: 4px solid var(--color-purple); }
    .selected-card { border-left: 4px solid var(--color-success); }
    .rejected-card { border-left: 4px solid var(--color-danger); }

    /* Analytics Split Layout */
    .analytics-split-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    @media (max-width: 900px) {
      .analytics-split-grid { grid-template-columns: 1fr; }
    }

    .widget-title {
      margin: 0 0 1.25rem 0;
      font-size: 1.05rem;
      color: var(--color-navy-dark);
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.6rem;
    }

    .status-bars-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .bar-row-head {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      margin-bottom: 0.3rem;
    }

    .status-name { font-weight: 600; color: var(--color-text-body); }
    .status-count-tag { color: var(--color-text-muted); font-size: 0.8rem; }

    .progress-track {
      background-color: #f1f5f9;
      height: 10px;
      border-radius: 6px;
      overflow: hidden;
      width: 100%;
    }

    .progress-fill {
      height: 100%;
      border-radius: 6px;
      transition: width 0.3s ease;
    }

    .fill-draft { background-color: var(--color-warning); }
    .fill-submitted { background-color: var(--color-info); }
    .fill-review { background-color: var(--color-purple); }
    .fill-selected { background-color: var(--color-success); }
    .fill-rejected { background-color: var(--color-danger); }
    .fill-dept { background-color: var(--color-accent-blue); }

    .decision-rate-row {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px dashed var(--color-border-medium);
      margin-bottom: 1rem;
    }

    .rate-circle-badge {
      background: var(--color-navy-dark);
      color: #38bdf8;
      width: 95px;
      height: 95px;
      border-radius: 50%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 6px rgba(15, 23, 42, 0.2);
    }

    .rate-num { font-size: 1.5rem; font-weight: 800; line-height: 1; }
    .rate-text { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; margin-top: 0.25rem; }

    .rate-breakdown-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.875rem;
      flex: 1;
    }

    .rate-item { display: flex; justify-content: space-between; color: var(--color-text-body); }
    .text-success { color: var(--color-success) !important; }
    .text-danger { color: var(--color-danger) !important; }

    .pipeline-list {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      font-size: 0.85rem;
    }

    .pipeline-row { display: flex; justify-content: space-between; align-items: center; color: var(--color-text-body); }

    /* Department Cards */
    .dept-box { margin-bottom: 1.5rem; }

    .dept-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 1rem;
    }

    .dept-metric-card {
      background: #f8fafc;
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.9rem 1rem;
    }

    .dept-title-text { font-weight: 700; font-size: 0.875rem; color: var(--color-navy-dark); display: block; }
    .dept-count-strip { font-size: 0.8rem; color: var(--color-accent-blue); margin-top: 0.25rem; }

    /* Application Filtering */
    .filter-card h2 { margin: 0 0 0.35rem 0; color: var(--color-navy-dark); font-size: 1.35rem; }
    .filter-card p { margin: 0 0 1.25rem 0; color: var(--color-text-muted); font-size: 0.9rem; }

    .filter-controls-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.85rem;
      align-items: center;
    }

    .search-input-wrap {
      flex: 1;
      min-width: 280px;
      display: flex;
      gap: 0.5rem;
    }

    .filter-dropdown-wrap { min-width: 190px; }

    /* Data Table Styling */
    .table-container-card { padding: 0; overflow: hidden; }

    .admin-data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.875rem;
    }

    .admin-data-table th {
      background: #f8fafc;
      color: var(--color-text-muted);
      padding: 1rem 1.25rem;
      font-weight: 700;
      border-bottom: 1px solid var(--color-border-subtle);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .admin-data-table td {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--color-border-subtle);
      vertical-align: middle;
    }

    .admin-data-table tr:hover { background-color: #f8fafc; }

    .font-mono { font-family: var(--font-mono); color: var(--color-accent-blue); }

    .cell-column { display: flex; flex-direction: column; }
    .candidate-name { font-weight: 700; color: var(--color-navy-dark); }
    .candidate-email { font-size: 0.8rem; color: var(--color-text-muted); }

    .program-title { font-weight: 600; color: var(--color-text-body); }
    .dept-subtitle { font-size: 0.8rem; color: var(--color-text-muted); }

    .readiness-pill-box {
      display: inline-block;
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-weight: 700;
      font-size: 0.8rem;
    }

    .ready-full { background: var(--color-success-bg); color: var(--color-success); }
    .ready-part { background: var(--color-warning-bg); color: var(--color-warning); }

    .date-text { color: var(--color-text-muted); font-size: 0.825rem; }

    .pagination-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.25rem;
      background: #f8fafc;
      border-top: 1px solid var(--color-border-subtle);
      font-size: 0.85rem;
      color: var(--color-text-muted);
    }

    .pagination-btns { display: flex; align-items: center; gap: 0.5rem; }
    .page-current-num { font-weight: 700; color: var(--color-navy-dark); padding: 0 0.5rem; }

    .loading-box, .empty-state { padding: 3rem; text-align: center; color: var(--color-text-muted); font-size: 0.95rem; }
    .mt-1 { margin-top: 0.5rem; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  readonly btechPrograms = BTECH_PROGRAMS;

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
      search: this.searchQuery?.trim() || '',
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

  formatDegree(val?: string): string {
    if (!val || val === 'N/A') return 'Bachelor of Technology (B.Tech)';
    if (val === 'B.Tech Computer Science' || val.includes('B.Tech')) {
      return 'Bachelor of Technology (B.Tech)';
    }
    return val;
  }

  logout(): void {
    this.authService.logout();
  }
}
