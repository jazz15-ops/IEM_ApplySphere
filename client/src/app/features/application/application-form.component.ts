import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApplicationService, Application, DocumentSlots, DocumentMetadata, ReadinessResponse } from '../../core/services/application.service';
import { AuthService } from '../../core/services/auth.service';

interface DocSlotConfig {
  key: keyof DocumentSlots;
  label: string;
  accept: string;
  hint: string;
}

@Component({
  selector: 'app-application-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="app-form-layout fade-in">
      <header class="navbar">
        <div class="brand-container">
          <span class="brand-logo-mark">IEM</span>
          <div class="brand-text">
            <span class="brand-title">ApplySphere</span>
            <span class="brand-subtitle">Admission Application Workspace</span>
          </div>
        </div>
        <div class="user-nav-box">
          <a routerLink="/applicant/dashboard" class="btn btn-secondary btn-sm">← Back to Candidate Hub</a>
        </div>
      </header>

      <main class="page-container">
        <!-- Status & Locking Header Strip -->
        <div class="card-elevated banner-card" *ngIf="application()?.applicationNumber">
          <div class="banner-content">
            <div>
              <span class="card-kicker">Application Tracking Identifier</span>
              <h2 class="app-num-mono">{{ application()?.applicationNumber }}</h2>
            </div>
            <div [class]="getStatusBadgeClass(application()?.status)">
              STATUS: {{ formatStatusLabel(application()?.status) }}
            </div>
          </div>

          <!-- Locked Banner if Submitted -->
          <div class="alert alert-info mt-1" *ngIf="isLocked()">
            <span>🔒</span>
            <div>
              <strong>Application Locked (Submitted):</strong> Your application has been submitted and is under institutional processing. Form fields and document attachments are in read-only mode.
            </div>
          </div>
        </div>

        <!-- Section Navigation Strip -->
        <nav class="section-nav-bar card-elevated">
          <a href="#section-personal" class="nav-chip">1. Personal</a>
          <a href="#section-address" class="nav-chip">2. Address</a>
          <a href="#section-academic" class="nav-chip">3. Academic</a>
          <a href="#section-program" class="nav-chip">4. Program</a>
          <a href="#section-documents" class="nav-chip">5. Documents & Submission</a>
        </nav>

        <!-- Live Readiness & Submission Action Card -->
        <div class="card-elevated readiness-box" *ngIf="readiness()">
          <div class="readiness-top">
            <div>
              <span class="card-kicker">Explainable Completeness Meter</span>
              <div class="score-display">
                <h2>{{ readiness()?.readinessScore }}%</h2>
                <span class="score-sub">Application Index</span>
              </div>
            </div>
            <div class="badge-status" [ngClass]="readiness()?.canSubmit ? 'badge-selected' : 'badge-draft'">
              {{ readiness()?.canSubmit ? '✓ Ready to Submit' : '⚠ Submission Locked' }}
            </div>
          </div>

          <div class="progress-track mt-1 mb-2">
            <div
              class="progress-fill"
              [ngClass]="readiness()?.canSubmit ? 'fill-selected' : 'fill-draft'"
              [style.width.%]="readiness()?.readinessScore"
            ></div>
          </div>

          <!-- Category Score Breakdown Grid -->
          <div class="category-grid" *ngIf="readiness()?.breakdown as bd">
            <div class="cat-pill">
              <span class="cat-title">Personal & Address</span>
              <span class="cat-num">{{ bd.personalAndAddress.score }}/{{ bd.personalAndAddress.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-title">Academic History</span>
              <span class="cat-num">{{ bd.academic.score }}/{{ bd.academic.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-title">Program Choice</span>
              <span class="cat-num">{{ bd.programSelection.score }}/{{ bd.programSelection.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-title">Class 10/12 Marksheets</span>
              <span class="cat-num">{{ bd.marksheets.score }}/{{ bd.marksheets.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-title">Government ID</span>
              <span class="cat-num">{{ bd.idProof.score }}/{{ bd.idProof.maxScore }}</span>
            </div>
            <div class="cat-pill">
              <span class="cat-title">Passport Photo</span>
              <span class="cat-num">{{ bd.passportPhoto.score }}/{{ bd.passportPhoto.maxScore }}</span>
            </div>
          </div>

          <!-- Submission Launcher Strip -->
          <div class="submit-strip" *ngIf="!isLocked()">
            <div *ngIf="readiness()?.canSubmit; else missingRequirementsBox" class="submit-ready-row">
              <div class="ready-info">
                <strong>✓ All Requirements Complete!</strong>
                <p>You may now execute final submission to send your candidate record for institutional evaluation.</p>
              </div>
              <button (click)="confirmSubmit()" [disabled]="isSubmitting()" class="btn btn-success btn-lg">
                <span *ngIf="isSubmitting()">⏳</span>
                {{ isSubmitting() ? 'Submitting...' : '🚀 Submit Final Application' }}
              </button>
            </div>

            <ng-template #missingRequirementsBox>
              <div class="missing-bar" *ngIf="(readiness()?.missingItems?.length || 0) > 0">
                <span class="missing-count-badge">⚠ {{ readiness()?.missingItems?.length }} Missing Requirements</span>
                <span class="missing-hint-text">Complete the missing fields and documents below to unlock submission.</span>
              </div>
            </ng-template>
          </div>
        </div>

        <div *ngIf="successMessage()" class="alert alert-success">
          <span>✓</span> {{ successMessage() }}
        </div>
        <div *ngIf="errorMessage()" class="alert alert-error">
          <span>⚠</span> {{ errorMessage() }}
        </div>

        <!-- Admission Form -->
        <form (ngSubmit)="saveDraft()" #appForm="ngForm" novalidate>
          <!-- Section 1: Personal Details -->
          <fieldset id="section-personal" class="card-elevated section-fieldset" [disabled]="isLocked()">
            <legend class="section-legend">1. Personal Candidate Details</legend>
            <div class="form-grid">
              <div class="form-group">
                <label>First Name *</label>
                <input type="text" [(ngModel)]="form.firstName" name="firstName" class="form-control" [readonly]="isLocked()" placeholder="e.g. Rahul" />
              </div>
              <div class="form-group">
                <label>Middle Name (Optional)</label>
                <input type="text" [(ngModel)]="form.middleName" name="middleName" class="form-control" [readonly]="isLocked()" placeholder="e.g. Kumar" />
              </div>
              <div class="form-group">
                <label>Last Name *</label>
                <input type="text" [(ngModel)]="form.lastName" name="lastName" class="form-control" [readonly]="isLocked()" placeholder="e.g. Sharma" />
              </div>
              <div class="form-group">
                <label>Date of Birth *</label>
                <input type="date" [(ngModel)]="form.dateOfBirth" name="dateOfBirth" class="form-control" [readonly]="isLocked()" />
              </div>
              <div class="form-group" [class.has-error]="genderModel.invalid && (genderModel.touched || appForm.submitted)">
                <label for="gender">Gender *</label>
                <select
                  id="gender"
                  [(ngModel)]="form.gender"
                  name="gender"
                  required
                  #genderModel="ngModel"
                  class="form-control"
                  [class.is-invalid]="genderModel.invalid && (genderModel.touched || appForm.submitted)"
                  [disabled]="isLocked()"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <span
                  class="field-error-text"
                  *ngIf="genderModel.invalid && (genderModel.touched || appForm.submitted)"
                >
                  Please select a valid gender option.
                </span>
              </div>
              <div class="form-group">
                <label>Mobile Phone *</label>
                <input type="tel" [(ngModel)]="form.phone" name="phone" class="form-control" [readonly]="isLocked()" placeholder="10-digit phone number" />
              </div>
              <div class="form-group">
                <label>Email Address *</label>
                <input type="email" [(ngModel)]="form.email" name="email" class="form-control" [readonly]="isLocked()" placeholder="candidate@example.com" />
              </div>
              <div class="form-group">
                <label>Nationality *</label>
                <input type="text" [(ngModel)]="form.nationality" name="nationality" class="form-control" placeholder="Indian" [readonly]="isLocked()" />
              </div>
            </div>
          </fieldset>

          <!-- Section 2: Address -->
          <fieldset id="section-address" class="card-elevated section-fieldset" [disabled]="isLocked()">
            <legend class="section-legend">2. Communication & Address Details</legend>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>Address Line 1 *</label>
                <input type="text" [(ngModel)]="form.addressLine1" name="addressLine1" class="form-control" [readonly]="isLocked()" placeholder="Street Address, House/Flat No." />
              </div>
              <div class="form-group full-width">
                <label>Address Line 2 (Optional)</label>
                <input type="text" [(ngModel)]="form.addressLine2" name="addressLine2" class="form-control" [readonly]="isLocked()" placeholder="Apartment, Landmark, Area" />
              </div>
              <div class="form-group">
                <label>City *</label>
                <input type="text" [(ngModel)]="form.city" name="city" class="form-control" [readonly]="isLocked()" placeholder="e.g. Kolkata" />
              </div>
              <div class="form-group">
                <label>State *</label>
                <input type="text" [(ngModel)]="form.state" name="state" class="form-control" [readonly]="isLocked()" placeholder="e.g. West Bengal" />
              </div>
              <div class="form-group">
                <label>Postal Code *</label>
                <input type="text" [(ngModel)]="form.postalCode" name="postalCode" class="form-control" [readonly]="isLocked()" placeholder="6-digit PIN code" />
              </div>
              <div class="form-group">
                <label>Country *</label>
                <input type="text" [(ngModel)]="form.country" name="country" class="form-control" placeholder="India" [readonly]="isLocked()" />
              </div>
            </div>
          </fieldset>

          <!-- Section 3: Academic Details -->
          <fieldset id="section-academic" class="card-elevated section-fieldset" [disabled]="isLocked()">
            <legend class="section-legend">3. Academic Performance History</legend>
            
            <div class="sub-section-box">
              <h4 class="sub-title">Class 10 (Secondary Examination)</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Board *</label>
                  <input type="text" [(ngModel)]="form.class10!.board" name="c10_board" class="form-control" placeholder="CBSE / ICSE / State Board" [readonly]="isLocked()" />
                </div>
                <div class="form-group">
                  <label>Institution / School Name *</label>
                  <input type="text" [(ngModel)]="form.class10!.institutionName" name="c10_school" class="form-control" [readonly]="isLocked()" placeholder="School Name" />
                </div>
                <div class="form-group">
                  <label>Passing Year *</label>
                  <input type="number" [(ngModel)]="form.class10!.passingYear" name="c10_year" class="form-control" placeholder="e.g. 2022" [readonly]="isLocked()" />
                </div>
                <div class="form-group">
                  <label>Overall Percentage (%) *</label>
                  <input type="number" [(ngModel)]="form.class10!.percentage" name="c10_pct" class="form-control" placeholder="e.g. 88.5" step="0.1" [readonly]="isLocked()" />
                </div>
              </div>
            </div>

            <div class="sub-section-box mt-2">
              <h4 class="sub-title">Class 12 / Diploma (Higher Secondary Examination)</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Board *</label>
                  <input type="text" [(ngModel)]="form.class12!.board" name="c12_board" class="form-control" placeholder="CBSE / ISC / State Board" [readonly]="isLocked()" />
                </div>
                <div class="form-group">
                  <label>Institution / School Name *</label>
                  <input type="text" [(ngModel)]="form.class12!.institutionName" name="c12_school" class="form-control" [readonly]="isLocked()" placeholder="School/College Name" />
                </div>
                <div class="form-group">
                  <label>Passing Year *</label>
                  <input type="number" [(ngModel)]="form.class12!.passingYear" name="c12_year" class="form-control" placeholder="e.g. 2024" [readonly]="isLocked()" />
                </div>
                <div class="form-group">
                  <label>Overall Percentage (%) *</label>
                  <input type="number" [(ngModel)]="form.class12!.percentage" name="c12_pct" class="form-control" placeholder="e.g. 91.0" step="0.1" [readonly]="isLocked()" />
                </div>
              </div>
            </div>
          </fieldset>

          <!-- Section 4: Program Selection -->
          <fieldset id="section-program" class="card-elevated section-fieldset" [disabled]="isLocked()">
            <legend class="section-legend">4. Academic Program Selection</legend>
            <div class="form-grid">
              <div class="form-group">
                <label>Program Level *</label>
                <select [(ngModel)]="form.programLevel" name="programLevel" class="form-control" [disabled]="isLocked()">
                  <option value="Undergraduate">Undergraduate (UG)</option>
                  <option value="Postgraduate">Postgraduate (PG)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Degree *</label>
                <select [(ngModel)]="form.programName" name="programName" class="form-control" [disabled]="isLocked()">
                  <option value="Bachelor of Technology (B.Tech)">Bachelor of Technology (B.Tech)</option>
                  <!-- Backward compatibility option for legacy stored values like Ana Roy's -->
                  <option *ngIf="form.programName && form.programName !== 'Bachelor of Technology (B.Tech)'" [value]="form.programName">
                    {{ form.programName }}
                  </option>
                </select>
              </div>
              <div class="form-group full-width" [class.has-error]="programSpecialisationModel.invalid && (programSpecialisationModel.touched || appForm.submitted)">
                <label for="preferredDepartment">Preferred B.Tech Programme / Specialisation *</label>
                <span class="field-hint-text">Select the programme or specialisation you wish to be considered for during admission review.</span>
                <select
                  id="preferredDepartment"
                  [(ngModel)]="form.preferredDepartment"
                  name="preferredDepartment"
                  required
                  #programSpecialisationModel="ngModel"
                  class="form-control"
                  [class.is-invalid]="programSpecialisationModel.invalid && (programSpecialisationModel.touched || appForm.submitted)"
                  [disabled]="isLocked()"
                >
                  <option value="">Select preferred programme / specialisation</option>
                  <option *ngFor="let prog of btechPrograms" [value]="prog">{{ prog }}</option>
                  <!-- Support for legacy non-standard values like Ana Roy's existing record -->
                  <option *ngIf="form.preferredDepartment && !isStandardProgram(form.preferredDepartment)" [value]="form.preferredDepartment">
                    {{ form.preferredDepartment }}
                  </option>
                </select>
                <span
                  class="field-error-text"
                  *ngIf="programSpecialisationModel.invalid && (programSpecialisationModel.touched || appForm.submitted)"
                >
                  Please select your preferred B.Tech programme or specialisation.
                </span>
              </div>
            </div>
          </fieldset>

          <!-- Save Draft Action Bar -->
          <div class="save-bar" *ngIf="!isLocked()">
            <button type="submit" [disabled]="isSaving()" class="btn btn-primary btn-lg">
              <span *ngIf="isSaving()">⏳</span>
              {{ isSaving() ? 'Saving Draft...' : '💾 Save Draft Application' }}
            </button>
          </div>
        </form>

        <!-- Section 5: Document Uploads Cards -->
        <div class="card-elevated section-fieldset mt-2" *ngIf="!application()">
          <legend class="section-legend">5. Required Document Attachments</legend>
          <p class="section-desc">
            💡 Save your initial draft application using the button above to assign an application tracking identifier and enable document uploads.
          </p>
        </div>

        <fieldset id="section-documents" class="card-elevated section-fieldset mt-2" *ngIf="application()">
          <legend class="section-legend">5. Required Document Attachments</legend>
          <p class="section-desc" *ngIf="!isLocked()">
            Attach official marksheets and verification documents (PDF, JPG, PNG up to 5 MB each).
          </p>
          <p class="section-desc locked-text" *ngIf="isLocked()">
            🔒 Uploaded documents are verified and locked. Click below to view stored files.
          </p>

          <div class="doc-card-grid">
            <div class="doc-slot-card" *ngFor="let slot of docSlots">
              <div class="slot-header">
                <strong>{{ slot.label }}</strong>
                <span [class]="getDocMeta(slot.key) ? 'badge-status badge-selected' : 'badge-status badge-draft'">
                  {{ getDocMeta(slot.key) ? 'Uploaded' : 'Missing' }}
                </span>
              </div>
              <p class="slot-hint">{{ slot.hint }}</p>

              <!-- Uploaded Metadata Info Box -->
              <div *ngIf="getDocMeta(slot.key) as doc" class="uploaded-doc-box">
                <div class="doc-file-meta">
                  <span class="file-icon">📄</span>
                  <div>
                    <span class="file-name">{{ doc.originalName }}</span>
                    <span class="file-size">({{ (doc.size / 1024).toFixed(1) }} KB)</span>
                  </div>
                </div>
                <div class="doc-btn-group">
                  <button (click)="viewDocument(slot.key)" [disabled]="isDownloading(slot.key)" class="btn btn-secondary btn-sm">
                    {{ isDownloading(slot.key) ? 'Opening...' : '👁 View / Download' }}
                  </button>
                  <button *ngIf="!isLocked()" (click)="removeDocument(slot.key)" class="btn btn-danger btn-sm">
                    🗑 Remove
                  </button>
                </div>
              </div>

              <!-- Upload Picker Dropzone -->
              <div class="upload-picker-area" *ngIf="!getDocMeta(slot.key) && !isLocked()">
                <input
                  type="file"
                  [accept]="slot.accept"
                  (change)="onFileSelected(slot.key, $event)"
                  #fileInput
                  class="file-input-hidden"
                />
                <button (click)="fileInput.click()" [disabled]="isUploading(slot.key)" class="btn btn-secondary btn-block">
                  <span *ngIf="isUploading(slot.key)">⏳ Uploading...</span>
                  <span *ngIf="!isUploading(slot.key)">📤 Choose File & Upload</span>
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        <div class="footer-poc">
          Academic Admission Management POC | IEM ApplySphere
        </div>
      </main>
    </div>
  `,
  styles: [`
    .app-form-layout { min-height: 100vh; background-color: var(--color-bg-light); }

    /* Sticky Section Navigator */
    .section-nav-bar {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding: 0.75rem;
      position: sticky;
      top: 0;
      z-index: 10;
      background: #ffffff;
      margin-bottom: 1.5rem;
    }

    .nav-chip {
      padding: 0.4rem 0.85rem;
      background: #f1f5f9;
      color: var(--color-text-body);
      border-radius: 20px;
      font-size: 0.825rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.2s ease;
    }

    .nav-chip:hover {
      background: var(--color-accent-blue);
      color: #ffffff;
    }

    /* Banner & Header Strip */
    .banner-card { border-left: 4px solid var(--color-accent-blue); }

    .banner-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-kicker {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
    }

    .app-num-mono {
      font-family: var(--font-mono);
      font-size: 1.4rem;
      color: var(--color-accent-blue);
      margin: 0.2rem 0 0 0;
    }

    /* Readiness Meter */
    .readiness-box { border-top: 4px solid var(--color-navy-dark); }

    .readiness-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .score-display {
      display: flex;
      align-items: baseline;
      gap: 0.6rem;
    }

    .score-display h2 {
      font-size: 2.25rem;
      font-weight: 800;
      margin: 0;
      color: var(--color-navy-dark);
    }

    .score-sub { font-size: 0.85rem; color: var(--color-text-muted); }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 0.65rem;
      margin-bottom: 1.25rem;
    }

    .cat-pill {
      background: #f8fafc;
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.6rem 0.75rem;
      display: flex;
      flex-direction: column;
    }

    .cat-title { font-size: 0.75rem; color: var(--color-text-muted); font-weight: 600; }
    .cat-num { font-size: 0.95rem; font-weight: 700; color: var(--color-navy-dark); margin-top: 0.2rem; }

    /* Submit Strip */
    .submit-strip {
      border-top: 1px solid var(--color-border-subtle);
      padding-top: 1rem;
      margin-top: 1rem;
    }

    .submit-ready-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--color-success-bg);
      border: 1px solid var(--color-success-border);
      padding: 1rem 1.25rem;
      border-radius: var(--radius-sm);
    }

    .ready-info strong { color: var(--color-success); font-size: 0.95rem; }
    .ready-info p { margin: 0.2rem 0 0 0; font-size: 0.825rem; color: #166534; }

    .missing-bar {
      display: flex;
      align-items: center;
      gap: 0.8rem;
      background: var(--color-warning-bg);
      border: 1px solid var(--color-warning-border);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
    }

    .missing-count-badge { font-weight: 700; color: var(--color-warning); font-size: 0.85rem; }
    .missing-hint-text { font-size: 0.825rem; color: #92400e; }

    /* Fieldset Sections */
    .section-fieldset {
      padding: 1.75rem;
      margin-bottom: 1.75rem;
    }

    .section-legend {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--color-navy-dark);
      padding: 0 0.5rem;
    }

    .sub-section-box {
      background: #f8fafc;
      border: 1px solid var(--color-border-subtle);
      padding: 1.25rem;
      border-radius: var(--radius-sm);
    }

    .sub-title {
      margin: 0 0 1rem 0;
      font-size: 0.95rem;
      color: var(--color-navy-dark);
      border-bottom: 1px solid var(--color-border-subtle);
      padding-bottom: 0.4rem;
    }

    .save-bar {
      margin-top: 1.5rem;
      margin-bottom: 2rem;
      text-align: right;
    }

    /* Document Slots */
    .section-desc { font-size: 0.875rem; color: var(--color-text-muted); margin-bottom: 1.25rem; }

    .doc-card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
    }

    .doc-slot-card {
      background: #ffffff;
      border: 1px solid var(--color-border-medium);
      border-radius: var(--radius-sm);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .slot-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
    }

    .slot-header strong { font-size: 0.9rem; color: var(--color-navy-dark); }
    .slot-hint { font-size: 0.775rem; color: var(--color-text-muted); margin: 0 0 1rem 0; }

    .uploaded-doc-box {
      background: #f8fafc;
      border: 1px solid var(--color-border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.75rem;
    }

    .doc-file-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.6rem;
    }

    .file-icon { font-size: 1.1rem; }
    .file-name { font-size: 0.825rem; font-weight: 600; color: var(--color-navy-dark); display: block; overflow: hidden; text-overflow: ellipsis; }
    .file-size { font-size: 0.75rem; color: var(--color-text-muted); }

    .doc-btn-group { display: flex; gap: 0.4rem; }
    .file-input-hidden { display: none; }
    .btn-block { width: 100%; }

    .mt-1 { margin-top: 0.5rem; }
    .mt-2 { margin-top: 1.5rem; }
    .mb-2 { margin-bottom: 1rem; }
  `]
})
export class ApplicationFormComponent implements OnInit {
  private applicationService = inject(ApplicationService);
  private authService = inject(AuthService);

  currentUser = this.authService.currentUserSignal;
  application = signal<Application | null>(null);
  readiness = signal<ReadinessResponse | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  isSubmitting = signal(false);
  isUploadingMap = signal<Record<string, boolean>>({});
  isDownloadingMap = signal<Record<string, boolean>>({});
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  form = {
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    phone: '',
    email: '',
    nationality: 'Indian',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    class10: { board: '', institutionName: '', passingYear: undefined as number | undefined | null, percentage: undefined as number | undefined | null },
    class12: { board: '', institutionName: '', passingYear: undefined as number | undefined | null, percentage: undefined as number | undefined | null },
    programLevel: 'Undergraduate',
    programName: 'Bachelor of Technology (B.Tech)',
    preferredDepartment: ''
  };

  readonly btechPrograms: string[] = [
    'CSE — Computer Science and Engineering',
    'CSE (AIML) — Computer Science and Engineering (Artificial Intelligence and Machine Learning)',
    'CSE (AI) — Computer Science and Engineering (Artificial Intelligence)',
    'CSE (IoT) — Computer Science and Engineering (Internet of Things)',
    'CSE (IoTCSBT) — Computer Science and Engineering (Internet of Things and Cyber Security including Blockchain Technology)',
    'CSE (Cyber Security) — Computer Science and Engineering (Cyber Security)',
    'CSE (DS) — Computer Science and Engineering (Data Science)',
    'CSE (AI & DS) — Computer Science and Engineering (Artificial Intelligence and Data Science)',
    'CSBS — Computer Science and Business Systems',
    'IT — Information Technology',
    'ECE — Electronics and Communication Engineering',
    'EE — Electrical Engineering',
    'EEE — Electrical and Electronics Engineering',
    'ME — Mechanical Engineering'
  ];

  isStandardProgram(val: string): boolean {
    return this.btechPrograms.includes(val);
  }

  docSlots: DocSlotConfig[] = [
    { key: 'class10Marksheet', label: 'Class 10 Marksheet', accept: '.pdf,.jpg,.jpeg,.png', hint: 'Secondary mark sheet (PDF or image, max 5 MB)' },
    { key: 'class12Marksheet', label: 'Class 12 Marksheet', accept: '.pdf,.jpg,.jpeg,.png', hint: 'Higher secondary / diploma certificate (PDF/image, max 5 MB)' },
    { key: 'idProof', label: 'Government ID Proof', accept: '.pdf,.jpg,.jpeg,.png', hint: 'Aadhaar Card, Passport, or Voter ID (PDF/image, max 5 MB)' },
    { key: 'passportPhoto', label: 'Passport Photograph', accept: '.jpg,.jpeg,.png', hint: 'Recent passport photo (JPG or PNG only, max 5 MB)' }
  ];

  ngOnInit(): void {
    this.loadApplicationData();
  }

  isLocked(): boolean {
    const status = this.application()?.status;
    return !!status && status !== 'DRAFT';
  }

  loadApplicationData(): void {
    this.isLoading.set(true);
    this.applicationService.getMyApplication().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        const app = res.application;
        this.application.set(app);
        if (app) {
          this.populateForm(app);
        } else {
          this.prepopulateNewApplicantForm();
        }
        this.refreshReadiness();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to load application profile.');
      }
    });
  }

  prepopulateNewApplicantForm(): void {
    const user = this.currentUser();
    if (user) {
      if (!this.form.firstName && user.name) {
        const parts = user.name.trim().split(' ');
        this.form.firstName = parts[0] || '';
        if (parts.length > 1) {
          this.form.lastName = parts.slice(1).join(' ');
        }
      }
      if (!this.form.email && user.email) {
        this.form.email = user.email;
      }
      if (!this.form.phone && user.phone) {
        this.form.phone = user.phone;
      }
    }
  }

  refreshReadiness(): void {
    this.applicationService.getReadiness().subscribe({
      next: (res) => this.readiness.set(res),
      error: (err) => console.error('Failed to load readiness:', err)
    });
  }

  populateForm(app: Application): void {
    this.form.firstName = app.firstName || '';
    this.form.middleName = app.middleName || '';
    this.form.lastName = app.lastName || '';
    this.form.dateOfBirth = app.dateOfBirth ? app.dateOfBirth.split('T')[0] : '';
    this.form.gender = app.gender || '';
    this.form.phone = app.phone || '';
    this.form.email = app.email || '';
    this.form.nationality = app.nationality || 'Indian';

    this.form.addressLine1 = app.addressLine1 || '';
    this.form.addressLine2 = app.addressLine2 || '';
    this.form.city = app.city || '';
    this.form.state = app.state || '';
    this.form.postalCode = app.postalCode || '';
    this.form.country = app.country || 'India';

    if (app.class10) {
      this.form.class10 = {
        board: app.class10.board || '',
        institutionName: app.class10.institutionName || '',
        passingYear: app.class10.passingYear || null,
        percentage: app.class10.percentage || null
      };
    }
    if (app.class12) {
      this.form.class12 = {
        board: app.class12.board || '',
        institutionName: app.class12.institutionName || '',
        passingYear: app.class12.passingYear || null,
        percentage: app.class12.percentage || null
      };
    }

    this.form.programLevel = app.programLevel || 'Undergraduate';
    this.form.programName = app.programName || 'Bachelor of Technology (B.Tech)';
    this.form.preferredDepartment = app.preferredDepartment || '';
  }

  saveDraft(): void {
    if (this.isLocked()) return;

    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const payload: Partial<Application> = {
      firstName: this.form.firstName,
      middleName: this.form.middleName,
      lastName: this.form.lastName,
      dateOfBirth: this.form.dateOfBirth,
      gender: this.form.gender,
      phone: this.form.phone,
      email: this.form.email,
      nationality: this.form.nationality,
      addressLine1: this.form.addressLine1,
      addressLine2: this.form.addressLine2,
      city: this.form.city,
      state: this.form.state,
      postalCode: this.form.postalCode,
      country: this.form.country,
      class10: this.form.class10,
      class12: this.form.class12,
      programLevel: this.form.programLevel,
      programName: this.form.programName,
      preferredDepartment: this.form.preferredDepartment
    };

    const hasExistingApp = !!this.application() && !!this.application()?.applicationNumber;

    const save$ = hasExistingApp
      ? this.applicationService.updateMyApplication(payload)
      : this.applicationService.createApplication(payload);

    save$.subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.application.set(res.application);
        this.populateForm(res.application);
        this.refreshReadiness();
        this.successMessage.set('Draft application saved successfully!');
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to save draft application.');
      }
    });
  }

  getDocMeta(slotKey: keyof DocumentSlots): DocumentMetadata | null {
    const docs = this.application()?.documents;
    return docs && docs[slotKey] ? docs[slotKey] : null;
  }

  isUploading(slotKey: keyof DocumentSlots): boolean {
    return !!this.isUploadingMap()[slotKey];
  }

  isDownloading(slotKey: keyof DocumentSlots): boolean {
    return !!this.isDownloadingMap()[slotKey];
  }

  onFileSelected(slotKey: keyof DocumentSlots, event: Event): void {
    if (this.isLocked()) return;
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.setUploading(slotKey, true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.applicationService.uploadDocument(slotKey, file).subscribe({
      next: () => {
        this.setUploading(slotKey, false);
        this.loadApplicationData();
        this.successMessage.set(`Document '${file.name}' uploaded successfully!`);
        setTimeout(() => this.successMessage.set(null), 4000);
        input.value = '';
      },
      error: (err) => {
        this.setUploading(slotKey, false);
        this.errorMessage.set(err.error?.message || `Failed to upload document.`);
        input.value = '';
      }
    });
  }

  viewDocument(slotKey: keyof DocumentSlots): void {
    this.setDownloading(slotKey, true);
    this.applicationService.downloadDocumentFile(slotKey).subscribe({
      next: (blob: Blob) => {
        this.setDownloading(slotKey, false);
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: () => {
        this.setDownloading(slotKey, false);
        this.errorMessage.set('Failed to open document file stream.');
      }
    });
  }

  removeDocument(slotKey: keyof DocumentSlots): void {
    if (this.isLocked()) return;
    if (!confirm('Are you sure you want to remove this uploaded document?')) return;

    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.applicationService.deleteDocument(slotKey).subscribe({
      next: () => {
        this.loadApplicationData();
        this.successMessage.set('Document attachment removed.');
        setTimeout(() => this.successMessage.set(null), 4000);
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Failed to remove document.');
      }
    });
  }

  confirmSubmit(): void {
    if (this.isLocked()) return;
    if (!this.readiness()?.canSubmit) return;

    if (!confirm('Are you sure you want to submit your application? Once submitted, your application and document attachments cannot be modified.')) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.applicationService.submitApplication().subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.application.set(res.application);
        this.refreshReadiness();
        this.successMessage.set('Application submitted successfully! Your file is now under institutional review.');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(err.error?.message || 'Failed to submit application.');
      }
    });
  }

  private setUploading(slotKey: string, status: boolean): void {
    this.isUploadingMap.update((map) => ({ ...map, [slotKey]: status }));
  }

  private setDownloading(slotKey: string, status: boolean): void {
    this.isDownloadingMap.update((map) => ({ ...map, [slotKey]: status }));
  }

  formatStatusLabel(status?: string): string {
    if (!status) return 'DRAFT';
    switch (status) {
      case 'DRAFT': return 'DRAFT';
      case 'SUBMITTED': return 'SUBMITTED';
      case 'UNDER_REVIEW': return 'UNDER REVIEW';
      case 'SELECTED': return 'SELECTED ✓';
      case 'REJECTED': return 'REJECTED ✕';
      default: return status;
    }
  }

  getStatusBadgeClass(status?: string): string {
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
}
