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
    <div class="dashboard-layout fade-in">
      <header class="navbar">
        <div class="brand-container">
          <span class="brand-logo-mark">IEM</span>
          <div class="brand-text">
            <span class="brand-title">ApplySphere</span>
            <span class="brand-subtitle">Smart Candidate Admission Portal</span>
          </div>
        </div>
        <div class="user-nav-box">
          <div class="user-badge-info">
            <span class="user-name">{{ currentUser()?.name }}</span>
            <span class="user-role-pill">Applicant Candidate</span>
          </div>
          <button (click)="logout()" class="btn-logout">Sign Out</button>
        </div>
      </header>

      <main class="page-container">
        <!-- Hero Welcome Header -->
        <div class="welcome-hero">
          <div>
            <div class="applicant-context-kicker" *ngIf="showApplicantContextLine()">
              Candidate: {{ currentUser()?.name }}
            </div>
            <h1>{{ getHeroTitle() }}</h1>
            <p>{{ getHeroSubtitle() }}</p>
          </div>
        </div>

        <!-- 1. Application Status Snapshot Card & Journey Timeline -->
        <div class="card-elevated status-card" *ngIf="statusInfo()">
          <div class="status-top-bar">
            <div>
              <span class="card-kicker">Application Reference</span>
              <h2 class="app-num-mono">{{ getApplicationReference() }}</h2>
            </div>
            <div [class]="getStatusBadgeClass(statusInfo()?.status)">
              {{ formatStatusLabel(statusInfo()?.status) }}
            </div>
          </div>

          <!-- 4-Step Status Journey Timeline -->
          <div class="timeline-wrapper" *ngIf="statusInfo()?.status">
            <div class="timeline-step" [ngClass]="{'active': isStepActive('DRAFT'), 'completed': isStepCompleted('DRAFT')}">
              <div class="step-icon">1</div>
              <span class="step-title">Draft</span>
              <span class="step-meta">In Progress</span>
            </div>
            <div class="timeline-connector" [ngClass]="{'active': isStepCompleted('DRAFT')}"></div>

            <div class="timeline-step" [ngClass]="{'active': isStepActive('SUBMITTED'), 'completed': isStepCompleted('SUBMITTED')}">
              <div class="step-icon">2</div>
              <span class="step-title">Submitted</span>
              <span class="step-meta">{{ statusInfo()?.submittedAt ? (statusInfo()?.submittedAt | date:'mediumDate') : 'Pending' }}</span>
            </div>
            <div class="timeline-connector" [ngClass]="{'active': isStepCompleted('SUBMITTED')}"></div>

            <div class="timeline-step" [ngClass]="{'active': isStepActive('UNDER_REVIEW'), 'completed': isStepCompleted('UNDER_REVIEW')}">
              <div class="step-icon">3</div>
              <span class="step-title">Under Review</span>
              <span class="step-meta">{{ statusInfo()?.reviewStartedAt ? (statusInfo()?.reviewStartedAt | date:'mediumDate') : 'Pending' }}</span>
            </div>
            <div class="timeline-connector" [ngClass]="{'active': isStepCompleted('UNDER_REVIEW')}"></div>

            <div class="timeline-step" [ngClass]="{'active-selected': statusInfo()?.status === 'SELECTED', 'active-rejected': statusInfo()?.status === 'REJECTED'}">
              <div class="step-icon">
                {{ statusInfo()?.status === 'REJECTED' ? '✕' : (statusInfo()?.status === 'SELECTED' ? '✓' : '4') }}
              </div>
              <span class="step-title">Decision</span>
              <span class="step-meta">{{ statusInfo()?.decisionAt ? (statusInfo()?.decisionAt | date:'mediumDate') : 'Awaiting' }}</span>
            </div>
          </div>
        </div>

        <!-- 2. Explainable Readiness Scorecard -->
        <div class="card-elevated readiness-card" *ngIf="readiness(); else loadingReadiness">
          <div class="readiness-header-bar">
            <div>
              <span class="card-kicker">Application Readiness Evaluation</span>
              <div class="score-row">
                <h2 class="score-value">{{ readiness()?.readinessScore }}%</h2>
                <span class="score-caption">Application Readiness Score</span>
              </div>
              <p class="readiness-helper-desc">Rule-based completeness assessment based on required admission information and documents.</p>
            </div>
            <div class="badge-status" [ngClass]="readiness()?.canSubmit ? 'badge-selected' : 'badge-draft'">
              {{ readiness()?.canSubmit ? '✓ Ready for Final Submission' : '⚠ Complete Required Sections Before Submission' }}
            </div>
          </div>

          <div class="progress-track mt-1 mb-2">
            <div
              class="progress-fill"
              [ngClass]="readiness()?.canSubmit ? 'fill-selected' : 'fill-draft'"
              [style.width.%]="readiness()?.readinessScore"
            ></div>
          </div>

          <!-- Category Breakdown Score Grid -->
          <div class="category-grid" *ngIf="readiness()?.breakdown as bd">
            <div class="cat-card">
              <span class="cat-label">Personal & Address</span>
              <span class="cat-val">{{ bd.personalAndAddress.score }}/{{ bd.personalAndAddress.maxScore }}</span>
            </div>
            <div class="cat-card">
              <span class="cat-label">Academic Details</span>
              <span class="cat-val">{{ bd.academic.score }}/{{ bd.academic.maxScore }}</span>
            </div>
            <div class="cat-card">
              <span class="cat-label">Program Selection</span>
              <span class="cat-val">{{ bd.programSelection.score }}/{{ bd.programSelection.maxScore }}</span>
            </div>
            <div class="cat-card">
              <span class="cat-label">Class 10/12 Marksheets</span>
              <span class="cat-val">{{ bd.marksheets.score }}/{{ bd.marksheets.maxScore }}</span>
            </div>
            <div class="cat-card">
              <span class="cat-label">Government ID Proof</span>
              <span class="cat-val">{{ bd.idProof.score }}/{{ bd.idProof.maxScore }}</span>
            </div>
            <div class="cat-card">
              <span class="cat-label">Passport Photograph</span>
              <span class="cat-val">{{ bd.passportPhoto.score }}/{{ bd.passportPhoto.maxScore }}</span>
            </div>
          </div>

          <!-- Missing Requirements Checklist -->
          <div class="checklist-box" *ngIf="(readiness()?.missingItems?.length || 0) > 0">
            <h4>Missing Requirement Checklist ({{ readiness()?.missingItems?.length }})</h4>
            <div class="missing-grid">
              <div *ngFor="let item of readiness()?.missingItems" class="missing-pill">
                <span class="warn-dot">●</span>
                <strong>{{ item.label }}</strong>
                <span class="category-tag">({{ item.category }})</span>
              </div>
            </div>
          </div>

          <div class="checklist-box complete-box" *ngIf="(readiness()?.missingItems?.length || 0) === 0">
            <p class="all-complete-text">✓ Excellent! All required profile information, academic records, and document marksheets are complete.</p>
          </div>
        </div>

        <ng-template #loadingReadiness>
          <div class="card-elevated loading-box">
            <p>Evaluating application completeness metrics...</p>
          </div>
        </ng-template>

        <!-- 3. Primary Contextual Action & Form Launcher Card -->
        <div class="card-elevated action-card">
          <div class="action-header">
            <div>
              <h3>Admission Application Form Workspace</h3>
              <p *ngIf="!statusInfo()?.status">
                Start your admission application by entering personal details, academic records, program preferences, and required documents.
              </p>
              <p *ngIf="statusInfo()?.status === 'DRAFT'">
                Complete your personal details, academic history, program preference, and upload marksheets/certificates.
              </p>
              <p *ngIf="isSubmittedOrLocked()" class="locked-text">
                🔒 Application submitted. Your form data and uploaded documents are locked in read-only mode for institutional review.
              </p>
            </div>
            <div class="action-btn-area">
              <a routerLink="/applicant/application" class="btn btn-primary btn-lg">
                {{ getActionButtonText() }}
              </a>
            </div>
          </div>

          <div class="meta-strip">
            <span><strong>Applicant Email:</strong> {{ currentUser()?.email }}</span>
            <span><strong>Mobile Phone:</strong> {{ currentUser()?.phone }}</span>
            <span><strong>Portal Access:</strong> Applicant Candidate</span>
          </div>
        </div>

        <div class="footer-poc">
          Academic Admission Management POC | IEM ApplySphere
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout { min-height: 100vh; background-color: var(--color-bg-light); }
    
    .welcome-hero {
      margin-bottom: 1.75rem;
    }

    .applicant-context-kicker {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-accent-blue);
      margin-bottom: 0.35rem;
    }

    .welcome-hero h1 {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--color-navy-dark);
      margin: 0 0 0.35rem 0;
    }

    .welcome-hero p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 0.95rem;
    }

    .readiness-helper-desc {
      margin: 0.35rem 0 0 0;
      font-size: 0.825rem;
      color: var(--color-text-muted);
    }

    .card-kicker {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
    }

    /* Status Snapshot & Timeline */
    .status-card { border-top: 4px solid var(--color-accent-blue); }

    .status-top-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 1rem;
    }

    .app-num-mono {
      font-family: var(--font-mono);
      font-size: 1.5rem;
      color: var(--color-accent-blue);
      margin: 0.2rem 0 0 0;
      font-weight: 700;
    }

    .timeline-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 0;
    }

    .timeline-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 1;
    }

    .step-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: #e2e8f0;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.9rem;
      transition: all 0.2s ease;
    }

    .step-title {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-text-muted);
      margin-top: 0.4rem;
    }

    .step-meta {
      font-size: 0.725rem;
      color: var(--color-text-light);
      margin-top: 0.1rem;
    }

    .timeline-connector {
      flex: 1;
      height: 3px;
      background-color: #e2e8f0;
      margin: 0 0.5rem;
      margin-top: -1.4rem;
      transition: background-color 0.2s ease;
    }

    .timeline-step.active .step-icon {
      background-color: var(--color-accent-blue);
      color: #ffffff;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
    }

    .timeline-step.active .step-title { color: var(--color-accent-blue); font-weight: 700; }
    
    .timeline-step.completed .step-icon {
      background-color: var(--color-success);
      color: #ffffff;
    }

    .timeline-connector.active { background-color: var(--color-success); }

    .timeline-step.active-selected .step-icon {
      background-color: var(--color-success);
      color: #ffffff;
      box-shadow: 0 0 0 4px rgba(21, 128, 61, 0.2);
    }
    
    .timeline-step.active-selected .step-title { color: var(--color-success); font-weight: 700; }

    .timeline-step.active-rejected .step-icon {
      background-color: var(--color-danger);
      color: #ffffff;
      box-shadow: 0 0 0 4px rgba(185, 28, 28, 0.2);
    }

    .timeline-step.active-rejected .step-title { color: var(--color-danger); font-weight: 700; }

    /* Readiness Meter */
    .readiness-card { border-top: 4px solid var(--color-navy-dark); }

    .readiness-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .score-row {
      display: flex;
      align-items: baseline;
      gap: 0.8rem;
      margin-top: 0.2rem;
    }

    .score-value {
      font-size: 2.25rem;
      font-weight: 800;
      color: var(--color-navy-dark);
      margin: 0;
      line-height: 1;
    }

    .score-caption {
      font-size: 0.85rem;
      color: var(--color-text-muted);
      font-weight: 500;
    }

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
      transition: width 0.4s ease;
    }

    .fill-selected { background-color: var(--color-success); }
    .fill-draft { background-color: var(--color-warning); }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .cat-card {
      background: #f8fafc;
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.65rem 0.85rem;
      display: flex;
      flex-direction: column;
    }

    .cat-label {
      font-size: 0.775rem;
      color: var(--color-text-muted);
      font-weight: 600;
    }

    .cat-val {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-navy-dark);
      margin-top: 0.2rem;
    }

    .checklist-box {
      border-top: 1px dashed var(--color-border-medium);
      padding-top: 1rem;
    }

    .checklist-box h4 {
      margin: 0 0 0.6rem 0;
      font-size: 0.875rem;
      color: var(--color-text-body);
    }

    .missing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 0.5rem;
    }

    .missing-pill {
      font-size: 0.825rem;
      background: var(--color-warning-bg);
      color: var(--color-warning);
      border: 1px solid var(--color-warning-border);
      padding: 0.4rem 0.75rem;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .warn-dot { font-size: 0.65rem; }
    .category-tag { font-size: 0.75rem; color: #92400e; }

    .complete-box { border-top: 1px solid var(--color-success-border); }
    .all-complete-text { color: var(--color-success); font-weight: 600; font-size: 0.9rem; margin: 0; }

    /* Action Launcher Card */
    .action-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.25rem;
    }

    .action-header h3 {
      margin: 0 0 0.35rem 0;
      color: var(--color-navy-dark);
      font-size: 1.2rem;
    }

    .action-header p {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 0.9rem;
    }

    .locked-text { color: var(--color-info) !important; font-weight: 600; }

    .btn-lg {
      padding: 0.8rem 1.4rem;
      font-size: 0.95rem;
    }

    .meta-strip {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
      border-top: 1px solid var(--color-border-subtle);
      margin-top: 1.25rem;
      padding-top: 0.85rem;
      font-size: 0.825rem;
      color: var(--color-text-muted);
    }

    .loading-box { text-align: center; padding: 2.5rem; color: var(--color-text-muted); }
    .mt-1 { margin-top: 0.5rem; }
    .mb-2 { margin-bottom: 1rem; }
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

  getHeroTitle(): string {
    const name = this.currentUser()?.name || 'Applicant';
    const status = this.statusInfo()?.status;

    if (!status) {
      return `Welcome to IEM ApplySphere, ${name}`;
    }
    switch (status) {
      case 'DRAFT':
        return `Welcome back, ${name}`;
      case 'SUBMITTED':
        return 'Application Submitted Successfully';
      case 'UNDER_REVIEW':
        return 'Your Application Is Under Review';
      case 'SELECTED':
        return 'Congratulations! You Have Been Selected';
      case 'REJECTED':
        return 'Application Decision Available';
      default:
        return `Welcome back, ${name}`;
    }
  }

  getHeroSubtitle(): string {
    const status = this.statusInfo()?.status;

    if (!status) {
      return 'Begin your admission application and complete each required section to become eligible for submission.';
    }
    switch (status) {
      case 'DRAFT':
        return 'Continue your admission application, review your readiness status, and complete any remaining requirements.';
      case 'SUBMITTED':
        return 'Your application has been received and is currently awaiting review by the admissions team.';
      case 'UNDER_REVIEW':
        return 'The admissions team is currently evaluating your submitted application and supporting documents.';
      case 'SELECTED':
        return 'Your application has been approved. Please review the next steps shown in your admission status.';
      case 'REJECTED':
        return 'The review of your application has been completed. Please refer to your application status for the final decision.';
      default:
        return 'Track your admission readiness, update application details, and inspect evaluation progress.';
    }
  }

  showApplicantContextLine(): boolean {
    const status = this.statusInfo()?.status;
    return Boolean(status && status !== 'DRAFT' && this.currentUser()?.name);
  }

  getApplicationReference(): string {
    if (this.statusInfo()?.applicationNumber) {
      return this.statusInfo()!.applicationNumber!;
    }
    if (this.statusInfo()?.status === 'DRAFT') {
      return 'Application Draft';
    }
    return 'Application Not Started';
  }

  formatStatusLabel(status?: string | null): string {
    if (!status) return 'Application Not Started';
    switch (status) {
      case 'DRAFT': return 'Application Draft';
      case 'SUBMITTED': return 'Application Submitted';
      case 'UNDER_REVIEW': return 'Under Admission Review';
      case 'SELECTED': return 'Selected for Admission';
      case 'REJECTED': return 'Application Not Selected';
      default: return status;
    }
  }

  getActionButtonText(): string {
    const status = this.statusInfo()?.status;
    if (!status) return 'Start Application Form →';
    if (status === 'DRAFT') return 'Continue Application Form →';
    return 'View Submitted Application (Read-Only) →';
  }

  isSubmittedOrLocked(): boolean {
    const status = this.statusInfo()?.status;
    return Boolean(status && status !== 'DRAFT');
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
