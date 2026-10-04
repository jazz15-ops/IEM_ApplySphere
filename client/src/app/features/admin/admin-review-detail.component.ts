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
    <div class="review-layout">
      <header class="navbar">
        <div class="brand">IEM ApplySphere | Admin Application Review</div>
        <div class="nav-links">
          <a routerLink="/admin/dashboard" class="btn-back">← Back to Applications List</a>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </header>

      <main class="content" *ngIf="application() as app; else loadingOrError">
        <!-- Status & Decision Action Bar -->
        <div class="card status-action-card">
          <div class="status-meta">
            <div>
              <span class="sub-title">Application Number</span>
              <h2 class="app-num">{{ app.applicationNumber }}</h2>
            </div>
            <div [class]="getStatusBadgeClass(app.status)">
              {{ formatStatusLabel(app.status) }}
            </div>
          </div>

          <!-- Dynamic Status Decision Buttons -->
          <div class="decision-bar">
            <!-- Action for SUBMITTED: Start Review -->
            <div *ngIf="app.status === 'SUBMITTED'" class="action-box">
              <span class="action-hint">This application is submitted and pending review. Click below to begin active evaluation.</span>
              <button (click)="changeStatus('UNDER_REVIEW')" [disabled]="isUpdating()" class="btn btn-review">
                {{ isUpdating() ? 'Updating Status...' : '🔍 Start Review (UNDER REVIEW)' }}
              </button>
            </div>

            <!-- Action for UNDER_REVIEW: Select or Reject -->
            <div *ngIf="app.status === 'UNDER_REVIEW'" class="action-box flex-actions">
              <span class="action-hint">Application is currently under active review. Make final admission decision:</span>
              <div class="btn-group">
                <button (click)="changeStatus('SELECTED')" [disabled]="isUpdating()" class="btn btn-select">
                  ✓ Select Candidate (ACCEPT)
                </button>
                <button (click)="changeStatus('REJECTED')" [disabled]="isUpdating()" class="btn btn-reject">
                  ✕ Reject Candidate (DECLINE)
                </button>
              </div>
            </div>

            <!-- Terminal State Information -->
            <div *ngIf="app.status === 'SELECTED' || app.status === 'REJECTED'" class="terminal-box">
              <span class="terminal-text" [ngClass]="app.status === 'SELECTED' ? 'text-green' : 'text-red'">
                {{ app.status === 'SELECTED' ? '✓ Candidate Selected for Admission' : '✕ Candidate Application Rejected' }}
              </span>
              <span class="decision-date" *ngIf="app.decisionAt">Decision Recorded: {{ app.decisionAt | date:'medium' }}</span>
            </div>

            <div *ngIf="app.status === 'DRAFT'" class="action-box">
              <span class="action-hint">Application is still in DRAFT status. Waiting for applicant submission.</span>
            </div>
          </div>
        </div>

        <div *ngIf="actionSuccess()" class="alert alert-success">
          {{ actionSuccess() }}
        </div>
        <div *ngIf="actionError()" class="alert alert-error">
          {{ actionError() }}
        </div>

        <!-- 1. Applicant & Personal Details Card -->
        <div class="card detail-section">
          <h3>1. Applicant Personal Details</h3>
          <div class="grid-display">
            <div><label>First Name:</label> <span>{{ app.personalDetails.firstName || '—' }}</span></div>
            <div><label>Middle Name:</label> <span>{{ app.personalDetails.middleName || '—' }}</span></div>
            <div><label>Last Name:</label> <span>{{ app.personalDetails.lastName || '—' }}</span></div>
            <div><label>Date of Birth:</label> <span>{{ app.personalDetails.dateOfBirth || '—' }}</span></div>
            <div><label>Gender:</label> <span>{{ app.personalDetails.gender || '—' }}</span></div>
            <div><label>Phone Number:</label> <span>{{ app.personalDetails.phone || '—' }}</span></div>
            <div><label>Email Address:</label> <span>{{ app.personalDetails.email || '—' }}</span></div>
            <div><label>Nationality:</label> <span>{{ app.personalDetails.nationality || '—' }}</span></div>
          </div>
        </div>

        <!-- 2. Address Details Card -->
        <div class="card detail-section">
          <h3>2. Address Details</h3>
          <div class="grid-display">
            <div class="full-width"><label>Address Line 1:</label> <span>{{ app.addressDetails.addressLine1 || '—' }}</span></div>
            <div class="full-width"><label>Address Line 2:</label> <span>{{ app.addressDetails.addressLine2 || '—' }}</span></div>
            <div><label>City:</label> <span>{{ app.addressDetails.city || '—' }}</span></div>
            <div><label>State:</label> <span>{{ app.addressDetails.state || '—' }}</span></div>
            <div><label>Postal Code:</label> <span>{{ app.addressDetails.postalCode || '—' }}</span></div>
            <div><label>Country:</label> <span>{{ app.addressDetails.country || '—' }}</span></div>
          </div>
        </div>

        <!-- 3. Academic Details Card -->
        <div class="card detail-section">
          <h3>3. Academic Details</h3>
          <div class="sub-section">
            <h4>Class 10 (Secondary)</h4>
            <div class="grid-display" *ngIf="app.academicDetails.class10 as c10">
              <div><label>Board:</label> <span>{{ c10.board || '—' }}</span></div>
              <div><label>Institution:</label> <span>{{ c10.institutionName || '—' }}</span></div>
              <div><label>Passing Year:</label> <span>{{ c10.passingYear || '—' }}</span></div>
              <div><label>Percentage:</label> <span>{{ c10.percentage ? (c10.percentage + '%') : '—' }}</span></div>
            </div>
          </div>

          <div class="sub-section mt">
            <h4>Class 12 (Higher Secondary)</h4>
            <div class="grid-display" *ngIf="app.academicDetails.class12 as c12">
              <div><label>Board:</label> <span>{{ c12.board || '—' }}</span></div>
              <div><label>Institution:</label> <span>{{ c12.institutionName || '—' }}</span></div>
              <div><label>Passing Year:</label> <span>{{ c12.passingYear || '—' }}</span></div>
              <div><label>Percentage:</label> <span>{{ c12.percentage ? (c12.percentage + '%') : '—' }}</span></div>
            </div>
          </div>
        </div>

        <!-- 4. Program Selection Card -->
        <div class="card detail-section">
          <h3>4. Program Selection</h3>
          <div class="grid-display">
            <div><label>Program Level:</label> <span>{{ app.programSelection.programLevel || '—' }}</span></div>
            <div><label>Program Name:</label> <span>{{ app.programSelection.programName || '—' }}</span></div>
            <div class="full-width"><label>Preferred Department:</label> <span>{{ app.programSelection.preferredDepartment || '—' }}</span></div>
          </div>
        </div>

        <!-- 5. Uploaded Documents Grid -->
        <div class="card detail-section">
          <h3>5. Uploaded Documents</h3>
          <div class="doc-grid">
            <div class="doc-card" *ngFor="let slot of docSlots">
              <div class="doc-header">
                <strong>{{ slot.label }}</strong>
                <span [class]="getDocMeta(app.documents, slot.key) ? 'badge-uploaded' : 'badge-pending'">
                  {{ getDocMeta(app.documents, slot.key) ? 'Uploaded' : 'Missing' }}
                </span>
              </div>

              <div *ngIf="getDocMeta(app.documents, slot.key) as doc" class="doc-info">
                <p class="file-name">📄 {{ doc.originalName }}</p>
                <p class="file-meta">Size: {{ (doc.size / 1024).toFixed(1) }} KB | Type: {{ doc.mimeType }}</p>
                <button (click)="viewAdminDocument(slot.key)" [disabled]="isDownloading(slot.key)" class="btn-sm btn-view">
                  {{ isDownloading(slot.key) ? 'Opening...' : 'View Document (Protected)' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Server-Calculated Readiness Engine Card -->
        <div class="card detail-section" *ngIf="app.readiness as r">
          <h3>6. Explainable Application Readiness (Server-Calculated)</h3>
          <div class="readiness-header">
            <div>
              <span class="readiness-title">Server Readiness Evaluation Score</span>
              <h2 class="score-display">{{ r.readinessScore }}%</h2>
            </div>
            <div class="status-badge" [ngClass]="r.canSubmit ? 'badge-ready' : 'badge-not-ready'">
              {{ r.canSubmit ? '✓ Fully Complete' : '⚠ Incomplete' }}
            </div>
          </div>

          <div class="progress-bar-container">
            <div class="progress-bar-fill" [style.width.%]="r.readinessScore"></div>
          </div>

          <div class="category-grid" *ngIf="r.breakdown as bd">
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
        </div>

        <!-- 7. Status Audit Trail Timeline -->
        <div class="card detail-section">
          <h3>7. Status Audit Trail & History</h3>
          <div class="history-list" *ngIf="app.statusHistory && app.statusHistory.length > 0">
            <div class="history-item" *ngFor="let h of app.statusHistory">
              <div class="history-badge" [ngClass]="'badge-' + h.status.toLowerCase()">{{ h.status }}</div>
              <div class="history-details">
                <span class="history-role">Changed by: {{ h.changedByRole | uppercase }}</span>
                <span class="history-time">{{ h.changedAt | date:'medium' }}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <ng-template #loadingOrError>
        <main class="content">
          <div class="card" *ngIf="isLoading()">
            <p style="color: #64748b;">Loading candidate application details...</p>
          </div>
          <div class="alert alert-error" *ngIf="errorMessage()">
            {{ errorMessage() }}
          </div>
        </main>
      </ng-template>
    </div>
  `,
  styles: [`
    .review-layout { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; min-height: 100vh; }
    .navbar { display: flex; justify-content: space-between; align-items: center; background: #0f172a; color: #fff; padding: 1rem 2rem; }
    .brand { font-size: 1.1rem; font-weight: 700; color: #38bdf8; }
    .nav-links { display: flex; align-items: center; gap: 1rem; }
    .btn-back { color: #94a3b8; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
    .btn-back:hover { color: #fff; }
    .btn-logout { background: #ef4444; color: #fff; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer; font-weight: 600; }
    .content { padding: 2rem; max-width: 950px; margin: 0 auto; }

    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 1.5rem; }
    .status-action-card { border-left: 5px solid #2563eb; }
    .status-meta { display: flex; justify-content: space-between; align-items: flex-start; }
    .sub-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    .app-num { margin: 0.2rem 0 0 0; font-size: 1.8rem; color: #0f172a; }

    .badge-status { padding: 0.4rem 0.85rem; border-radius: 20px; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; }
    .badge-draft { background: #fef08a; color: #854d0e; }
    .badge-submitted { background: #bae6fd; color: #0369a1; }
    .badge-review { background: #e9d5ff; color: #6b21a8; }
    .badge-selected { background: #dcfce7; color: #15803d; }
    .badge-rejected { background: #fee2e2; color: #991b1b; }

    .decision-bar { margin-top: 1.25rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
    .action-box { display: flex; flex-direction: column; gap: 0.5rem; background: #f8fafc; padding: 1rem; border-radius: 6px; border: 1px solid #cbd5e1; }
    .flex-actions { flex-direction: row; justify-content: space-between; align-items: center; }
    .btn-group { display: flex; gap: 0.75rem; }
    .action-hint { font-size: 0.85rem; color: #475569; font-weight: 500; }

    .btn { padding: 0.6rem 1.2rem; border-radius: 6px; border: none; font-weight: 700; font-size: 0.9rem; cursor: pointer; }
    .btn-review { background: #6b21a8; color: #fff; }
    .btn-select { background: #16a34a; color: #fff; }
    .btn-reject { background: #dc2626; color: #fff; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .terminal-box { background: #f1f5f9; padding: 1rem; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; }
    .terminal-text { font-weight: 700; font-size: 1rem; }
    .text-green { color: #15803d; }
    .text-red { color: #991b1b; }
    .decision-date { font-size: 0.85rem; color: #64748b; }

    .detail-section h3 { margin: 0 0 1rem 0; font-size: 1.05rem; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.5rem; }
    .grid-display { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.85rem; font-size: 0.9rem; }
    .grid-display label { font-weight: 600; color: #64748b; display: block; font-size: 0.8rem; }
    .grid-display span { color: #0f172a; font-weight: 500; }
    .full-width { grid-column: 1 / -1; }
    .sub-section h4 { font-size: 0.9rem; color: #334155; margin: 0 0 0.5rem 0; }
    .mt { margin-top: 1.25rem; }

    .doc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; }
    .doc-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.85rem; }
    .doc-header { display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
    .badge-uploaded { background: #dcfce7; color: #15803d; font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; }
    .badge-pending { background: #f1f5f9; color: #64748b; font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; }
    .doc-info { margin-top: 0.5rem; }
    .file-name { font-size: 0.85rem; font-weight: 600; color: #334155; margin: 0 0 0.2rem; word-break: break-all; }
    .file-meta { font-size: 0.75rem; color: #64748b; margin: 0 0 0.6rem; }

    .readiness-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .readiness-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    .score-display { margin: 0.2rem 0 0 0; font-size: 2rem; font-weight: 800; color: #0f172a; }
    .progress-bar-container { background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin: 0.75rem 0 1rem 0; }
    .progress-bar-fill { background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; }

    .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem; }
    .cat-pill { background: #f1f5f9; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.8rem; display: flex; flex-direction: column; }
    .cat-name { color: #64748b; font-weight: 500; }
    .cat-score { color: #0f172a; font-weight: 700; font-size: 0.9rem; margin-top: 0.1rem; }

    .history-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .history-item { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 0.6rem 0.85rem; border-radius: 6px; border: 1px solid #e2e8f0; }
    .history-badge { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 4px; text-transform: uppercase; }
    .history-details { display: flex; gap: 1rem; font-size: 0.8rem; color: #64748b; }

    .btn-sm { padding: 0.4rem 0.75rem; border-radius: 4px; border: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-view { background: #0284c7; color: #fff; }

    .alert { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.9rem; }
    .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
  `]
})
export class AdminReviewDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  application = signal<AdminApplicationDetail | null>(null);
  isLoading = signal(true);
  isUpdating = signal(false);
  errorMessage = signal<string | null>(null);
  actionSuccess = signal<string | null>(null);
  actionError = signal<string | null>(null);

  downloadingState: { [key: string]: boolean } = {};

  docSlots: DocSlotConfig[] = [
    { key: 'class10Marksheet', label: 'Class 10 Marksheet' },
    { key: 'class12Marksheet', label: 'Class 12 Marksheet' },
    { key: 'idProof', label: 'Government ID Proof' },
    { key: 'passportPhoto', label: 'Passport Photo' }
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadApplicationDetail(id);
    } else {
      this.errorMessage.set('Application ID missing from route.');
      this.isLoading.set(false);
    }
  }

  loadApplicationDetail(id: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.adminService.getApplicationDetail(id).subscribe({
      next: (data) => {
        this.isLoading.set(false);
        this.application.set(data);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to load application detail.');
      }
    });
  }

  changeStatus(targetStatus: string): void {
    const app = this.application();
    if (!app) return;

    this.isUpdating.set(true);
    this.actionSuccess.set(null);
    this.actionError.set(null);

    this.adminService.updateApplicationStatus(app._id, targetStatus).subscribe({
      next: (res) => {
        this.isUpdating.set(false);
        this.actionSuccess.set(`Status updated to '${targetStatus}' successfully!`);
        this.loadApplicationDetail(app._id);
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.actionError.set(err.error?.message || `Failed to update status to '${targetStatus}'.`);
      }
    });
  }

  viewAdminDocument(slotKey: keyof DocumentSlots): void {
    const app = this.application();
    if (!app) return;

    const docMeta = this.getDocMeta(app.documents, slotKey);
    if (!docMeta) return;

    this.downloadingState[slotKey] = true;
    this.actionSuccess.set(null);
    this.actionError.set(null);

    this.adminService.downloadAdminDocument(app._id, slotKey).subscribe({
      next: (blob) => {
        this.downloadingState[slotKey] = false;
        const blobUrl = URL.createObjectURL(new Blob([blob], { type: docMeta.mimeType }));
        window.open(blobUrl, '_blank');

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
        }, 60000);
      },
      error: (err) => {
        this.downloadingState[slotKey] = false;
        this.actionError.set(err.error?.message || 'Failed to stream document file.');
      }
    });
  }

  getDocMeta(docs: DocumentSlots | undefined, slotKey: keyof DocumentSlots): DocumentMetadata | null {
    return docs ? (docs[slotKey] || null) : null;
  }

  isDownloading(slotKey: keyof DocumentSlots): boolean {
    return !!this.downloadingState[slotKey];
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
