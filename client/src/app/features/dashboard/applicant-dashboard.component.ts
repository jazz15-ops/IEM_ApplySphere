import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService, ReadinessResponse, ApplicationStatusResponse } from '../../core/services/application.service';

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
        <!-- Status Timeline Banner -->
        <div class="card status-card" *ngIf="statusInfo()">
          <div class="status-header">
            <div>
              <span class="sub-title">Application Status</span>
              <h3 class="app-num">{{ statusInfo()?.applicationNumber || 'No Application Created' }}</h3>
            </div>
            <div [class]="getStatusBadgeClass(statusInfo()?.status)">
              {{ formatStatusLabel(statusInfo()?.status) }}
            </div>
          </div>

          <!-- Status Step Timeline -->
          <div class="timeline-container" *ngIf="statusInfo()?.status">
            <div class="timeline-step" [ngClass]="{'active': isStepActive('DRAFT'), 'completed': isStepCompleted('DRAFT')}">
              <div class="step-circle">1</div>
              <div class="step-label">Draft</div>
            </div>
            <div class="timeline-line" [ngClass]="{'active': isStepCompleted('DRAFT')}"></div>

            <div class="timeline-step" [ngClass]="{'active': isStepActive('SUBMITTED'), 'completed': isStepCompleted('SUBMITTED')}">
              <div class="step-circle">2</div>
              <div class="step-label">Submitted</div>
              <div class="step-date" *ngIf="statusInfo()?.submittedAt">{{ statusInfo()?.submittedAt | date:'shortDate' }}</div>
            </div>
            <div class="timeline-line" [ngClass]="{'active': isStepCompleted('SUBMITTED')}"></div>

            <div class="timeline-step" [ngClass]="{'active': isStepActive('UNDER_REVIEW'), 'completed': isStepCompleted('UNDER_REVIEW')}">
              <div class="step-circle">3</div>
              <div class="step-label">Under Review</div>
              <div class="step-date" *ngIf="statusInfo()?.reviewStartedAt">{{ statusInfo()?.reviewStartedAt | date:'shortDate' }}</div>
            </div>
            <div class="timeline-line" [ngClass]="{'active': isStepCompleted('UNDER_REVIEW')}"></div>

            <div class="timeline-step" [ngClass]="{'active-selected': statusInfo()?.status === 'SELECTED', 'active-rejected': statusInfo()?.status === 'REJECTED'}">
              <div class="step-circle">{{ statusInfo()?.status === 'REJECTED' ? '✕' : (statusInfo()?.status === 'SELECTED' ? '✓' : '4') }}</div>
              <div class="step-label">Decision</div>
              <div class="step-date" *ngIf="statusInfo()?.decisionAt">{{ statusInfo()?.decisionAt | date:'shortDate' }}</div>
            </div>
          </div>
        </div>

        <!-- Readiness Summary Card -->
        <div class="card readiness-card" style="margin-top: 1.5rem;" *ngIf="readiness(); else loadingReadiness">
          <div class="readiness-header">
            <div>
              <span class="readiness-title">Explainable Application Readiness</span>
              <h2 class="score-display">{{ readiness()?.readinessScore }}%</h2>
            </div>
            <div class="status-badge" [ngClass]="readiness()?.canSubmit ? 'badge-ready' : 'badge-not-ready'">
              {{ readiness()?.canSubmit ? '✓ Ready for Submission' : '⚠ Not Ready to Submit' }}
            </div>
          </div>

          <div class="progress-bar-container">
            <div class="progress-bar-fill" [style.width.%]="readiness()?.readinessScore"></div>
          </div>

          <!-- Category Score Grid -->
          <div class="category-grid" *ngIf="readiness()?.breakdown as bd">
            <div class="cat-pill">
              <span class="cat-name">Personal Details</span>
              <span class="cat-score">{{ bd.personalAndAddress.score }}/{{ bd.personalAndAddress.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-name">Academic Details</span>
              <span class="cat-score">{{ bd.academic.score }}/{{ bd.academic.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-name">Program Selection</span>
              <span class="cat-score">{{ bd.programSelection.score }}/{{ bd.programSelection.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-name">Marksheets</span>
              <span class="cat-score">{{ bd.marksheets.score }}/{{ bd.marksheets.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-name">ID Proof</span>
              <span class="cat-score">{{ bd.idProof.score }}/{{ bd.idProof.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-name">Passport Photo</span>
              <span class="cat-score">{{ bd.passportPhoto.score }}/{{ bd.passportPhoto.maxScore }}</span>
            </div>
          </div>

          <!-- Missing Requirements Checklist -->
          <div class="checklist-section" *ngIf="(readiness()?.missingItems?.length || 0) > 0">
            <h4>Missing Requirements Checklist ({{ readiness()?.missingItems?.length }})</h4>
            <ul class="missing-list">
              <li *ngFor="let item of readiness()?.missingItems">
                <span class="warn-icon">⚠</span> <strong>{{ item.label }}</strong> ({{ item.category }})
              </li>
            </ul>
          </div>

          <div class="checklist-section" *ngIf="(readiness()?.missingItems?.length || 0) === 0">
            <p class="all-complete">✓ All required application fields and documents are complete!</p>
          </div>
        </div>

        <ng-template #loadingReadiness>
          <div class="card" style="margin-top: 1.5rem;">
            <p style="color: #64748b;">Loading application readiness evaluation...</p>
          </div>
        </ng-template>

        <!-- Main Form Navigation Card -->
        <div class="card" style="margin-top: 1.5rem;">
          <h3>Admission Application Form</h3>
          <p *ngIf="statusInfo()?.status === 'DRAFT'">Complete your personal details, academic history, program choices, and document uploads.</p>
          <p *ngIf="statusInfo()?.status !== 'DRAFT'" style="color: #0369a1; font-weight: 600;">Application submitted. Form and documents are locked in read-only mode.</p>
          <div class="actions">
            <a routerLink="/applicant/application" class="btn-app">
              {{ statusInfo()?.status === 'DRAFT' ? 'Open Admission Application Form →' : 'View Submitted Application →' }}
            </a>
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
    .content { padding: 2rem; max-width: 850px; margin: 0 auto; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h3 { margin-top: 0; color: #0f172a; }
    .actions { margin: 1.25rem 0; }
    .btn-app { background: #2563eb; color: #fff; text-decoration: none; padding: 0.75rem 1.25rem; border-radius: 6px; font-weight: 600; display: inline-block; }
    .btn-app:hover { background: #1d4ed8; }
    .meta-info { margin-top: 1.5rem; border-top: 1px solid #f1f5f9; padding-top: 1rem; }
    .meta-info p { margin: 0.3rem 0; color: #475569; font-size: 0.9rem; }
    
    .status-card { border-left: 4px solid #3b82f6; }
    .status-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .sub-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    .app-num { margin: 0.2rem 0 0 0; font-size: 1.4rem; color: #0f172a; }

    .badge-status { padding: 0.4rem 0.85rem; border-radius: 20px; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
    .badge-draft { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-submitted { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .badge-review { background: #f3e8ff; color: #6b21a8; border: 1px solid #e9d5ff; }
    .badge-selected { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-rejected { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    .timeline-container { display: flex; align-items: center; justify-content: space-between; margin-top: 1.25rem; padding: 0.5rem 0; }
    .timeline-step { display: flex; flex-direction: column; align-items: center; position: relative; z-index: 1; }
    .step-circle { width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0; color: #64748b; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; }
    .step-label { font-size: 0.8rem; font-weight: 600; color: #64748b; margin-top: 0.4rem; }
    .step-date { font-size: 0.7rem; color: #94a3b8; margin-top: 0.1rem; }
    .timeline-line { flex: 1; height: 3px; background: #e2e8f0; margin: 0 0.5rem; margin-top: -1.2rem; }

    .timeline-step.active .step-circle { background: #2563eb; color: #fff; }
    .timeline-step.active .step-label { color: #2563eb; font-weight: 700; }
    .timeline-step.completed .step-circle { background: #10b981; color: #fff; }
    .timeline-line.active { background: #10b981; }

    .timeline-step.active-selected .step-circle { background: #16a34a; color: #fff; }
    .timeline-step.active-selected .step-label { color: #16a34a; font-weight: 700; }
    .timeline-step.active-rejected .step-circle { background: #dc2626; color: #fff; }
    .timeline-step.active-rejected .step-label { color: #dc2626; font-weight: 700; }

    .readiness-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .readiness-title { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    .score-display { margin: 0.25rem 0 0 0; font-size: 2.25rem; font-weight: 800; color: #0f172a; }
    .status-badge { padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 700; }
    .badge-ready { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-not-ready { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

    .progress-bar-container { background: #e2e8f0; height: 10px; border-radius: 5px; overflow: hidden; margin: 1rem 0 1.25rem 0; }
    .progress-bar-fill { background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; transition: width 0.4s ease; }

    .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem; margin-bottom: 1.25rem; }
    .cat-pill { background: #f1f5f9; padding: 0.5rem 0.75rem; border-radius: 6px; font-size: 0.8rem; display: flex; flex-direction: column; }
    .cat-name { color: #64748b; font-weight: 500; }
    .cat-score { color: #0f172a; font-weight: 700; font-size: 0.95rem; margin-top: 0.2rem; }

    .checklist-section { border-top: 1px dashed #cbd5e1; padding-top: 1rem; }
    .checklist-section h4 { margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #334155; }
    .missing-list { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.4rem; }
    .missing-list li { font-size: 0.85rem; color: #b45309; background: #fffbeb; padding: 0.35rem 0.6rem; border-radius: 4px; border: 1px solid #fef3c7; }
    .warn-icon { font-weight: bold; margin-right: 0.2rem; }
    .all-complete { color: #15803d; font-weight: 600; font-size: 0.9rem; margin: 0; }
  `]
})
export class ApplicantDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private applicationService = inject(ApplicationService);

  currentUser = this.authService.currentUserSignal;
  readiness = signal<ReadinessResponse | null>(null);
  statusInfo = signal<ApplicationStatusResponse | null>(null);

  ngOnInit(): void {
    this.fetchStatus();
    this.fetchReadiness();
  }

  fetchStatus(): void {
    this.applicationService.getApplicationStatus().subscribe({
      next: (data) => this.statusInfo.set(data),
      error: (err) => console.error('Failed to load status info:', err)
    });
  }

  fetchReadiness(): void {
    this.applicationService.getReadiness().subscribe({
      next: (data) => this.readiness.set(data),
      error: (err) => console.error('Failed to load readiness score:', err)
    });
  }

  formatStatusLabel(status?: string | null): string {
    if (!status) return 'NOT CREATED';
    switch (status) {
      case 'DRAFT': return 'DRAFT';
      case 'SUBMITTED': return 'SUBMITTED';
      case 'UNDER_REVIEW': return 'UNDER REVIEW';
      case 'SELECTED': return 'SELECTED ✓';
      case 'REJECTED': return 'REJECTED ✕';
      default: return status;
    }
  }

  getStatusBadgeClass(status?: string | null): string {
    const base = 'badge-status ';
    if (!status) return base + 'badge-draft';
    switch (status) {
      case 'DRAFT': return base + 'badge-draft';
      case 'SUBMITTED': return base + 'badge-submitted';
      case 'UNDER_REVIEW': return base + 'badge-review';
      case 'SELECTED': return base + 'badge-selected';
      case 'REJECTED': return base + 'badge-rejected';
      default: return base + 'badge-draft';
    }
  }

  isStepCompleted(step: string): boolean {
    const current = this.statusInfo()?.status;
    if (!current) return false;
    const order = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SELECTED', 'REJECTED'];
    const currIdx = order.indexOf(current);
    const stepIdx = order.indexOf(step);
    return currIdx > stepIdx;
  }

  isStepActive(step: string): boolean {
    return this.statusInfo()?.status === step;
  }

  logout(): void {
    this.authService.logout();
  }
}
