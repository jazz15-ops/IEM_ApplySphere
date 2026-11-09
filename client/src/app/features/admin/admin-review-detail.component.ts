import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, AdminApplicationDetail } from '../../core/services/admin.service';
import { DocumentMetadata, DocumentSlots } from '../../core/services/application.service';

interface DocSlotConfig {
  key: keyof DocumentSlots;
  label: string;
}

@Component({
  selector: 'app-admin-review-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="admin-review-layout fade-in">
      <header class="navbar">
        <div class="brand-container">
          <span class="brand-logo-mark">IEM</span>
          <div class="brand-text">
            <span class="brand-title">ApplySphere</span>
            <span class="brand-subtitle">Candidate Evaluation Workspace</span>
          </div>
        </div>
        <div class="user-nav-box">
          <a routerLink="/admin/dashboard" class="btn btn-secondary btn-sm">← Back to Applications List</a>
          <button (click)="logout()" class="btn-logout">Sign Out</button>
        </div>
      </header>

      <main class="page-container" *ngIf="application() as app; else loadingOrError">
        <!-- 1. Top Decision & Status Action Header Banner -->
        <div class="card-elevated decision-banner-card">
          <div class="banner-top-row">
            <div>
              <span class="card-kicker">Candidate Application File</span>
              <h2 class="app-num-mono">{{ app.applicationNumber }}</h2>
              <span class="created-meta">Registered: {{ app.createdAt | date:'mediumDate' }}</span>
            </div>
            <div [class]="getStatusBadgeClass(app.status)">
              STATUS: {{ formatStatusLabel(app.status) }}
            </div>
          </div>

          <!-- Dynamic Status Decision Buttons -->
          <div class="decision-action-box">
            <!-- Action for SUBMITTED: Start Review -->
            <div *ngIf="app.status === 'SUBMITTED'" class="action-prompt">
              <div class="prompt-text">
                <strong>📥 Application Submitted: Awaiting Initial Evaluation</strong>
                <p>Click below to transition status to UNDER_REVIEW and initiate formal candidate assessment.</p>
              </div>
              <button (click)="changeStatus('UNDER_REVIEW')" [disabled]="isUpdating()" class="btn btn-primary btn-lg">
                <span *ngIf="isUpdating()">⏳</span>
                {{ isUpdating() ? 'Updating...' : '🔍 Start Review (UNDER REVIEW)' }}
              </button>
            </div>

            <!-- Action for UNDER_REVIEW: Select or Reject -->
            <div *ngIf="app.status === 'UNDER_REVIEW'" class="action-prompt">
              <div class="prompt-text">
                <strong>🔍 Active Review Evaluation Phase</strong>
                <p>Inspect academic records and documents below to render a final admission decision.</p>
              </div>
              <div class="decision-btn-group">
                <button (click)="changeStatus('SELECTED')" [disabled]="isUpdating()" class="btn btn-success btn-lg">
                  ✓ Select Candidate (ACCEPT)
                </button>
                <button (click)="changeStatus('REJECTED')" [disabled]="isUpdating()" class="btn btn-danger btn-lg">
                  ✕ Reject Candidate (DECLINE)
                </button>
              </div>
            </div>

            <!-- Terminal State Information -->
            <div *ngIf="app.status === 'SELECTED' || app.status === 'REJECTED'" class="terminal-decision-box" [ngClass]="app.status === 'SELECTED' ? 'terminal-selected' : 'terminal-rejected'">
              <div class="terminal-header">
                <span class="terminal-icon">{{ app.status === 'SELECTED' ? '✓' : '✕' }}</span>
                <div>
                  <strong>{{ app.status === 'SELECTED' ? 'Candidate Selected for Admission' : 'Candidate Application Declined' }}</strong>
                  <p>Final evaluation decision recorded on {{ app.decisionAt | date:'medium' }}. Workflow transition is closed.</p>
                </div>
              </div>
            </div>

            <div *ngIf="app.status === 'DRAFT'" class="action-prompt">
              <div class="prompt-text">
                <strong>📝 Draft Status</strong>
                <p>The candidate has not yet submitted this application file for formal review.</p>
              </div>
            </div>
          </div>
        </div>

        <div *ngIf="actionSuccess()" class="alert alert-success">
          <span>✓</span> {{ actionSuccess() }}
        </div>
        <div *ngIf="actionError()" class="alert alert-error">
          <span>⚠</span> {{ actionError() }}
        </div>

        <!-- 2. Personal Details Card -->
        <div class="card-elevated section-card">
          <h3 class="section-title">1. Applicant Personal Details</h3>
          <div class="detail-grid">
            <div class="detail-item"><label>First Name:</label> <span>{{ app.personalDetails.firstName || '—' }}</span></div>
            <div class="detail-item"><label>Middle Name:</label> <span>{{ app.personalDetails.middleName || '—' }}</span></div>
            <div class="detail-item"><label>Last Name:</label> <span>{{ app.personalDetails.lastName || '—' }}</span></div>
            <div class="detail-item"><label>Date of Birth:</label> <span>{{ app.personalDetails.dateOfBirth || '—' }}</span></div>
            <div class="detail-item"><label>Gender:</label> <span>{{ app.personalDetails.gender || '—' }}</span></div>
            <div class="detail-item"><label>Mobile Phone:</label> <span>{{ app.personalDetails.phone || '—' }}</span></div>
            <div class="detail-item"><label>Email Address:</label> <span>{{ app.personalDetails.email || '—' }}</span></div>
            <div class="detail-item"><label>Nationality:</label> <span>{{ app.personalDetails.nationality || '—' }}</span></div>
          </div>
        </div>

        <!-- 3. Address Details Card -->
        <div class="card-elevated section-card">
          <h3 class="section-title">2. Communication & Address Details</h3>
          <div class="detail-grid">
            <div class="detail-item full-width"><label>Address Line 1:</label> <span>{{ app.addressDetails.addressLine1 || '—' }}</span></div>
            <div class="detail-item full-width"><label>Address Line 2:</label> <span>{{ app.addressDetails.addressLine2 || '—' }}</span></div>
            <div class="detail-item"><label>City:</label> <span>{{ app.addressDetails.city || '—' }}</span></div>
            <div class="detail-item"><label>State:</label> <span>{{ app.addressDetails.state || '—' }}</span></div>
            <div class="detail-item"><label>Postal Code:</label> <span>{{ app.addressDetails.postalCode || '—' }}</span></div>
            <div class="detail-item"><label>Country:</label> <span>{{ app.addressDetails.country || '—' }}</span></div>
          </div>
        </div>

        <!-- 4. Academic Details Card -->
        <div class="card-elevated section-card">
          <h3 class="section-title">3. Academic Performance History</h3>
          <div class="academic-block">
            <h4 class="sub-heading">Class 10 (Secondary Examination)</h4>
            <div class="detail-grid" *ngIf="app.academicDetails.class10 as c10">
              <div class="detail-item"><label>Board:</label> <span>{{ c10.board || '—' }}</span></div>
              <div class="detail-item"><label>Institution:</label> <span>{{ c10.institutionName || '—' }}</span></div>
              <div class="detail-item"><label>Passing Year:</label> <span>{{ c10.passingYear || '—' }}</span></div>
              <div class="detail-item"><label>Percentage:</label> <span class="highlight-score">{{ c10.percentage ? (c10.percentage + '%') : '—' }}</span></div>
            </div>
          </div>

          <div class="academic-block mt-1">
            <h4 class="sub-heading">Class 12 / Diploma (Higher Secondary Examination)</h4>
            <div class="detail-grid" *ngIf="app.academicDetails.class12 as c12">
              <div class="detail-item"><label>Board:</label> <span>{{ c12.board || '—' }}</span></div>
              <div class="detail-item"><label>Institution:</label> <span>{{ c12.institutionName || '—' }}</span></div>
              <div class="detail-item"><label>Passing Year:</label> <span>{{ c12.passingYear || '—' }}</span></div>
              <div class="detail-item"><label>Percentage:</label> <span class="highlight-score">{{ c12.percentage ? (c12.percentage + '%') : '—' }}</span></div>
            </div>
          </div>
        </div>

        <!-- 5. Program Choice Card -->
        <div class="card-elevated section-card">
          <h3 class="section-title">4. Degree & Programme Selection</h3>
          <div class="detail-grid">
            <div class="detail-item"><label>Program Level:</label> <span>{{ app.programSelection.programLevel || 'Undergraduate (UG)' }}</span></div>
            <div class="detail-item"><label>Degree:</label> <span>{{ formatDegree(app.programSelection.programName) }}</span></div>
            <div class="detail-item full-width"><label>Preferred Programme / Specialisation:</label> <strong class="dept-text">{{ app.programSelection.preferredDepartment || '—' }}</strong></div>
          </div>
        </div>

        <!-- 6. Document Viewer Cards -->
        <div class="card-elevated section-card">
          <h3 class="section-title">5. Uploaded Verification Documents</h3>
          <div class="doc-card-grid">
            <div class="doc-review-slot" *ngFor="let slot of docSlots">
              <div class="slot-title">
                <strong>{{ slot.label }}</strong>
                <span [class]="getDocMeta(slot.key) ? 'badge-status badge-selected' : 'badge-status badge-draft'">
                  {{ getDocMeta(slot.key) ? 'Available' : 'Not Uploaded' }}
                </span>
              </div>

              <div *ngIf="getDocMeta(slot.key) as doc; else noDoc" class="file-preview-box">
                <div class="doc-meta">
                  <span class="file-icon">📄</span>
                  <div>
                    <span class="file-name">{{ doc.originalName }}</span>
                    <span class="file-size">({{ (doc.size / 1024).toFixed(1) }} KB)</span>
                  </div>
                </div>
                <button (click)="viewDocument(slot.key)" [disabled]="isDownloading(slot.key)" class="btn btn-primary btn-sm btn-block mt-1">
                  {{ isDownloading(slot.key) ? 'Opening Stream...' : '👁 Open Secure Document File' }}
                </button>
              </div>

              <ng-template #noDoc>
                <p class="missing-text">No document attached by candidate.</p>
              </ng-template>
            </div>
          </div>
        </div>

        <!-- 7. Readiness Engine Scorecard -->
        <div class="card-elevated section-card" *ngIf="app.readiness">
          <h3 class="section-title">6. Explainable Readiness Scorecard</h3>
          <div class="readiness-summary-row">
            <div>
              <span class="card-kicker">Evaluated Score</span>
              <h2 class="score-display">{{ app.readiness.readinessScore }}%</h2>
            </div>
            <div class="badge-status" [ngClass]="app.readiness.canSubmit ? 'badge-selected' : 'badge-draft'">
              {{ app.readiness.canSubmit ? '✓ Completeness Standard Satisfied' : '⚠ Incomplete Candidate Profile' }}
            </div>
          </div>

          <div class="progress-track mt-1 mb-2">
            <div
              class="progress-fill"
              [ngClass]="app.readiness.canSubmit ? 'fill-selected' : 'fill-draft'"
              [style.width.%]="app.readiness.readinessScore"
            ></div>
          </div>

          <div class="category-grid" *ngIf="app.readiness.breakdown as bd">
            <div class="cat-pill"><span class="cat-name">Personal</span> <span class="cat-num">{{ bd.personalAndAddress.score }}/{{ bd.personalAndAddress.maxScore }}</span></div>
            <div class="cat-pill"><span class="cat-name">Academic</span> <span class="cat-num">{{ bd.academic.score }}/{{ bd.academic.maxScore }}</span></div>
            <div class="cat-pill"><span class="cat-name">Program</span> <span class="cat-num">{{ bd.programSelection.score }}/{{ bd.programSelection.maxScore }}</span></div>
            <div class="cat-pill"><span class="cat-name">Marksheets</span> <span class="cat-num">{{ bd.marksheets.score }}/{{ bd.marksheets.maxScore }}</span></div>
            <div class="cat-pill"><span class="cat-name">ID Proof</span> <span class="cat-num">{{ bd.idProof.score }}/{{ bd.idProof.maxScore }}</span></div>
            <div class="cat-pill"><span class="cat-name">Photo</span> <span class="cat-num">{{ bd.passportPhoto.score }}/{{ bd.passportPhoto.maxScore }}</span></div>
          </div>
        </div>

        <!-- 8. Status History Audit Trail Timeline -->
        <div class="card-elevated section-card" *ngIf="app.statusHistory && app.statusHistory.length > 0">
          <h3 class="section-title">7. Status History Audit Trail</h3>
          <div class="audit-timeline">
            <div *ngFor="let entry of app.statusHistory" class="audit-item">
              <div class="audit-badge">
                <span [class]="getStatusBadgeClass(entry.status)">
                  {{ formatStatusLabel(entry.status) }}
                </span>
              </div>
              <div class="audit-info">
                <span class="audit-date">{{ entry.changedAt | date:'medium' }}</span>
                <span class="audit-role">Triggered by: <strong>{{ entry.changedByRole }}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer-poc">
          Academic Admission Management POC | IEM ApplySphere Admin Portal
        </div>
      </main>

      <ng-template #loadingOrError>
        <main class="page-container">
          <div class="card-elevated loading-box">
            <p *ngIf="!errorMessage()">Loading candidate evaluation file...</p>
            <div *ngIf="errorMessage()" class="alert alert-error">
              <span>⚠</span> {{ errorMessage() }}
            </div>
          </div>
        </main>
      </ng-template>
    </div>
  `,
  styles: [`
    .admin-review-layout { min-height: 100vh; background-color: var(--color-bg-light); }

    /* Decision Banner Card */
    .decision-banner-card { border-left: 4px solid var(--color-accent-blue); }

    .banner-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 1rem;
      margin-bottom: 1.25rem;
    }

    .app-num-mono {
      font-family: var(--font-mono);
      font-size: 1.6rem;
      color: var(--color-accent-blue);
      margin: 0.2rem 0;
    }

    .created-meta { font-size: 0.8rem; color: var(--color-text-muted); }

    .decision-action-box {
      background: #f8fafc;
      border: 1px solid var(--color-border-subtle);
      padding: 1.25rem;
      border-radius: var(--radius-sm);
    }

    .action-prompt {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .prompt-text strong { font-size: 0.95rem; color: var(--color-navy-dark); display: block; }
    .prompt-text p { margin: 0.2rem 0 0 0; font-size: 0.85rem; color: var(--color-text-muted); }

    .decision-btn-group { display: flex; gap: 0.75rem; }

    .terminal-decision-box {
      padding: 1rem 1.25rem;
      border-radius: var(--radius-sm);
    }

    .terminal-selected { background: var(--color-success-bg); border: 1px solid var(--color-success-border); }
    .terminal-rejected { background: var(--color-danger-bg); border: 1px solid var(--color-danger-border); }

    .terminal-header { display: flex; align-items: center; gap: 0.85rem; }
    .terminal-icon { font-size: 1.4rem; font-weight: 800; }
    .terminal-selected .terminal-icon { color: var(--color-success); }
    .terminal-rejected .terminal-icon { color: var(--color-danger); }
    .terminal-header strong { font-size: 1rem; color: var(--color-navy-dark); }
    .terminal-header p { margin: 0.2rem 0 0 0; font-size: 0.825rem; color: var(--color-text-body); }

    /* Section Cards */
    .section-title {
      font-size: 1.1rem;
      color: var(--color-navy-dark);
      margin: 0 0 1.25rem 0;
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.5rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.15rem;
    }

    .detail-item { display: flex; flex-direction: column; }
    .detail-item label { font-size: 0.8rem; font-weight: 600; color: var(--color-text-muted); margin-bottom: 0.2rem; }
    .detail-item span { font-size: 0.95rem; font-weight: 500; color: var(--color-navy-dark); }
    .highlight-score { font-weight: 700 !important; color: var(--color-accent-blue) !important; }
    .dept-text { color: var(--color-accent-blue); font-size: 1rem; }

    .academic-block {
      background: #f8fafc;
      border: 1px solid var(--color-border-subtle);
      padding: 1.15rem;
      border-radius: var(--radius-sm);
    }

    .sub-heading { margin: 0 0 0.85rem 0; font-size: 0.9rem; color: var(--color-navy-dark); }

    /* Document Slots Grid */
    .doc-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
    }

    .doc-review-slot {
      background: #ffffff;
      border: 1px solid var(--color-border-medium);
      border-radius: var(--radius-sm);
      padding: 1.15rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .slot-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; font-size: 0.875rem; }
    .file-preview-box { background: #f8fafc; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sm); padding: 0.75rem; }
    .doc-meta { display: flex; align-items: center; gap: 0.5rem; }
    .file-icon { font-size: 1.1rem; }
    .file-name { font-size: 0.8rem; font-weight: 600; color: var(--color-navy-dark); display: block; overflow: hidden; text-overflow: ellipsis; }
    .file-size { font-size: 0.725rem; color: var(--color-text-muted); }
    .missing-text { font-size: 0.825rem; color: var(--color-text-muted); margin: 0; font-style: italic; }

    /* Readiness Meter */
    .readiness-summary-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .score-display { font-size: 2rem; font-weight: 800; color: var(--color-navy-dark); margin: 0.2rem 0; }
    
    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.6rem;
      margin-top: 1rem;
    }

    .cat-pill { background: #f8fafc; border: 1px solid var(--color-border-subtle); border-radius: var(--radius-sm); padding: 0.5rem 0.65rem; display: flex; flex-direction: column; }
    .cat-name { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600; }
    .cat-num { font-size: 0.9rem; font-weight: 700; color: var(--color-navy-dark); margin-top: 0.15rem; }

    /* Audit Timeline */
    .audit-timeline { display: flex; flex-direction: column; gap: 0.85rem; }
    .audit-item { display: flex; align-items: center; gap: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: var(--radius-sm); border: 1px solid var(--color-border-subtle); }
    .audit-info { display: flex; flex-direction: column; font-size: 0.825rem; }
    .audit-date { color: var(--color-text-muted); }
    .audit-role { color: var(--color-text-body); margin-top: 0.1rem; }

    .btn-block { width: 100%; }
    .loading-box { text-align: center; padding: 3rem; color: var(--color-text-muted); }
    .mt-1 { margin-top: 1rem; }
    .mb-2 { margin-bottom: 1rem; }
  `]
})
export class AdminReviewDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  application = signal<AdminApplicationDetail | null>(null);
  isLoading = signal(false);
  isUpdating = signal(false);
  isDownloadingMap = signal<Record<string, boolean>>({});
  actionSuccess = signal<string | null>(null);
  actionError = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  docSlots: DocSlotConfig[] = [
    { key: 'class10Marksheet', label: 'Class 10 Marksheet' },
    { key: 'class12Marksheet', label: 'Class 12 Marksheet' },
    { key: 'idProof', label: 'Government ID Proof' },
    { key: 'passportPhoto', label: 'Passport Photograph' }
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('applicationId') || this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadDetail(id);
    } else {
      this.errorMessage.set('Application ID missing in route.');
    }
  }

  loadDetail(id: string): void {
    this.isLoading.set(true);
    this.adminService.getApplicationDetail(id).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.application.set(data);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to load application review details.');
      }
    });
  }

  changeStatus(newStatus: string): void {
    const app = this.application();
    if (!app) return;

    if (newStatus === 'SELECTED' && !confirm('Are you sure you want to SELECT this candidate for admission?')) return;
    if (newStatus === 'REJECTED' && !confirm('Are you sure you want to REJECT this candidate application?')) return;

    this.isUpdating.set(true);
    this.actionSuccess.set(null);
    this.actionError.set(null);

    this.adminService.updateApplicationStatus(app._id, newStatus).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.actionSuccess.set(`Status updated successfully to ${newStatus}.`);
        this.loadDetail(app._id);
        setTimeout(() => this.actionSuccess.set(null), 4000);
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.actionError.set(err.error?.message || 'Failed to update application status.');
      }
    });
  }

  getDocMeta(slotKey: keyof DocumentSlots): DocumentMetadata | null {
    const docs = this.application()?.documents;
    return docs && docs[slotKey] ? docs[slotKey] : null;
  }

  isDownloading(slotKey: keyof DocumentSlots): boolean {
    return !!this.isDownloadingMap()[slotKey];
  }

  viewDocument(slotKey: keyof DocumentSlots): void {
    const app = this.application();
    if (!app) return;

    this.setDownloading(slotKey, true);
    this.adminService.downloadAdminDocument(app._id, slotKey).subscribe({
      next: (blob) => {
        this.setDownloading(slotKey, false);
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err) => {
        this.setDownloading(slotKey, false);
        this.actionError.set('Failed to stream candidate document file.');
      }
    });
  }

  private setDownloading(slotKey: string, status: boolean): void {
    this.isDownloadingMap.update((map) => ({ ...map, [slotKey]: status }));
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
