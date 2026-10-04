import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApplicationService, Application, DocumentSlots, DocumentMetadata, ReadinessResponse } from '../../core/services/application.service';

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
    <div class="app-container">
      <header class="navbar">
        <div class="brand">IEM ApplySphere | Admission Application</div>
        <div class="nav-links">
          <a routerLink="/applicant/dashboard" class="btn-back">← Back to Dashboard</a>
        </div>
      </header>

      <main class="content">
        <div class="status-banner" *ngIf="application()?.applicationNumber">
          <span>Application No: <strong>{{ application()?.applicationNumber }}</strong></span>
          <span class="badge-draft">STATUS: {{ application()?.status }}</span>
        </div>

        <!-- Live Application Readiness Panel -->
        <div class="readiness-card" *ngIf="readiness()">
          <div class="readiness-header">
            <div>
              <span class="readiness-title">Live Application Readiness Evaluation</span>
              <h2 class="score-display">{{ readiness()?.readinessScore }}%</h2>
            </div>
            <div class="status-badge" [ngClass]="readiness()?.canSubmit ? 'badge-ready' : 'badge-not-ready'">
              {{ readiness()?.canSubmit ? '✓ Ready for Submission' : '⚠ Not Ready to Submit' }}
            </div>
          </div>

          <div class="progress-bar-container">
            <div class="progress-bar-fill" [style.width.%]="readiness()?.readinessScore"></div>
          </div>

          <!-- Category Score Summary Grid -->
          <div class="category-grid" *ngIf="readiness()?.breakdown as bd">
            <div class="cat-pill">
              <span class="cat-name">Personal & Address</span>
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

          <div class="missing-summary" *ngIf="(readiness()?.missingItems?.length || 0) > 0">
            <span class="missing-badge">⚠ {{ readiness()?.missingItems?.length }} Missing Item(s)</span>
            <span class="missing-hint">Complete required fields below to reach 100% readiness score.</span>
          </div>
        </div>

        <div *ngIf="successMessage()" class="alert alert-success" style="margin-top: 1rem;">
          {{ successMessage() }}
        </div>
        <div *ngIf="errorMessage()" class="alert alert-error" style="margin-top: 1rem;">
          {{ errorMessage() }}
        </div>

        <form (ngSubmit)="saveDraft()" #appForm="ngForm">
          <!-- Section 1: Personal Details -->
          <fieldset class="section-card">
            <legend>1. Personal Details</legend>
            <div class="form-grid">
              <div class="form-group">
                <label>First Name *</label>
                <input type="text" [(ngModel)]="form.firstName" name="firstName" class="form-control" />
              </div>
              <div class="form-group">
                <label>Middle Name (Optional)</label>
                <input type="text" [(ngModel)]="form.middleName" name="middleName" class="form-control" />
              </div>
              <div class="form-group">
                <label>Last Name *</label>
                <input type="text" [(ngModel)]="form.lastName" name="lastName" class="form-control" />
              </div>
              <div class="form-group">
                <label>Date of Birth *</label>
                <input type="date" [(ngModel)]="form.dateOfBirth" name="dateOfBirth" class="form-control" />
              </div>
              <div class="form-group">
                <label>Gender *</label>
                <select [(ngModel)]="form.gender" name="gender" class="form-control">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Mobile Phone *</label>
                <input type="tel" [(ngModel)]="form.phone" name="phone" class="form-control" />
              </div>
              <div class="form-group">
                <label>Email Address *</label>
                <input type="email" [(ngModel)]="form.email" name="email" class="form-control" />
              </div>
              <div class="form-group">
                <label>Nationality *</label>
                <input type="text" [(ngModel)]="form.nationality" name="nationality" class="form-control" placeholder="Indian" />
              </div>
            </div>
          </fieldset>

          <!-- Section 2: Address -->
          <fieldset class="section-card">
            <legend>2. Address Details</legend>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>Address Line 1 *</label>
                <input type="text" [(ngModel)]="form.addressLine1" name="addressLine1" class="form-control" />
              </div>
              <div class="form-group full-width">
                <label>Address Line 2 (Optional)</label>
                <input type="text" [(ngModel)]="form.addressLine2" name="addressLine2" class="form-control" />
              </div>
              <div class="form-group">
                <label>City *</label>
                <input type="text" [(ngModel)]="form.city" name="city" class="form-control" />
              </div>
              <div class="form-group">
                <label>State *</label>
                <input type="text" [(ngModel)]="form.state" name="state" class="form-control" />
              </div>
              <div class="form-group">
                <label>Postal Code *</label>
                <input type="text" [(ngModel)]="form.postalCode" name="postalCode" class="form-control" />
              </div>
              <div class="form-group">
                <label>Country *</label>
                <input type="text" [(ngModel)]="form.country" name="country" class="form-control" placeholder="India" />
              </div>
            </div>
          </fieldset>

          <!-- Section 3: Academic Details -->
          <fieldset class="section-card">
            <legend>3. Academic History</legend>
            <h4 class="sub-heading">Class 10 (Secondary)</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Board *</label>
                <input type="text" [(ngModel)]="form.class10!.board" name="c10_board" class="form-control" placeholder="CBSE / ICSE / State" />
              </div>
              <div class="form-group">
                <label>Institution Name *</label>
                <input type="text" [(ngModel)]="form.class10!.institutionName" name="c10_school" class="form-control" />
              </div>
              <div class="form-group">
                <label>Passing Year *</label>
                <input type="number" [(ngModel)]="form.class10!.passingYear" name="c10_year" class="form-control" placeholder="2022" />
              </div>
              <div class="form-group">
                <label>Percentage (%) *</label>
                <input type="number" [(ngModel)]="form.class10!.percentage" name="c10_pct" class="form-control" placeholder="85.5" step="0.1" />
              </div>
            </div>

            <h4 class="sub-heading mt">Class 12 / Diploma (Higher Secondary)</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Board *</label>
                <input type="text" [(ngModel)]="form.class12!.board" name="c12_board" class="form-control" placeholder="CBSE / ISC / State" />
              </div>
              <div class="form-group">
                <label>Institution Name *</label>
                <input type="text" [(ngModel)]="form.class12!.institutionName" name="c12_school" class="form-control" />
              </div>
              <div class="form-group">
                <label>Passing Year *</label>
                <input type="number" [(ngModel)]="form.class12!.passingYear" name="c12_year" class="form-control" placeholder="2024" />
              </div>
              <div class="form-group">
                <label>Percentage (%) *</label>
                <input type="number" [(ngModel)]="form.class12!.percentage" name="c12_pct" class="form-control" placeholder="88.0" step="0.1" />
              </div>
            </div>
          </fieldset>

          <!-- Section 4: Program Selection -->
          <fieldset class="section-card">
            <legend>4. Program Selection</legend>
            <div class="form-grid">
              <div class="form-group">
                <label>Program Level *</label>
                <select [(ngModel)]="form.programLevel" name="programLevel" class="form-control">
                  <option value="Undergraduate">Undergraduate (UG)</option>
                  <option value="Postgraduate">Postgraduate (PG)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Program Name *</label>
                <select [(ngModel)]="form.programName" name="programName" class="form-control">
                  <option value="B.Tech Computer Science">B.Tech Computer Science & Engineering</option>
                  <option value="B.Tech Information Technology">B.Tech Information Technology</option>
                  <option value="B.Tech Electronics & Comm">B.Tech Electronics & Comm Engineering</option>
                  <option value="BBA">BBA (Bachelor of Business Administration)</option>
                  <option value="MBA">MBA (Master of Business Administration)</option>
                  <option value="MCA">MCA (Master of Computer Applications)</option>
                </select>
              </div>
              <div class="form-group full-width">
                <label>Preferred Department *</label>
                <input type="text" [(ngModel)]="form.preferredDepartment" name="preferredDepartment" class="form-control" readonly />
              </div>
            </div>
          </fieldset>

          <div class="form-actions">
            <button type="submit" [disabled]="isSaving()" class="btn btn-save">
              {{ isSaving() ? 'Saving Draft...' : 'Save Draft Application' }}
            </button>
          </div>
        </form>

        <!-- Section 5: Document Uploads -->
        <fieldset class="section-card mt-2" *ngIf="application()">
          <legend>5. Required Document Uploads</legend>
          <p class="section-hint">Upload required certificates & ID proof (PDF, JPG, PNG up to 5 MB). Passport photo must be an image file.</p>

          <div class="doc-grid">
            <div class="doc-card" *ngFor="let slot of docSlots">
              <div class="doc-header">
                <strong>{{ slot.label }}</strong>
                <span [class]="getDocMeta(slot.key) ? 'badge-uploaded' : 'badge-pending'">
                  {{ getDocMeta(slot.key) ? 'Uploaded' : 'Not Uploaded' }}
                </span>
              </div>
              <p class="hint-text">{{ slot.hint }}</p>

              <div *ngIf="getDocMeta(slot.key) as doc" class="doc-info">
                <p class="file-name">📄 {{ doc.originalName }} ({{ (doc.size / 1024).toFixed(1) }} KB)</p>
                <div class="doc-actions">
                  <button (click)="viewDocument(slot.key)" [disabled]="isDownloading(slot.key)" class="btn-sm btn-view">
                    {{ isDownloading(slot.key) ? 'Opening...' : 'View / Download' }}
                  </button>
                  <button (click)="removeDocument(slot.key)" class="btn-sm btn-delete">Remove</button>
                </div>
              </div>

              <div class="upload-controls" *ngIf="!getDocMeta(slot.key)">
                <input
                  type="file"
                  [accept]="slot.accept"
                  (change)="onFileSelected(slot.key, $event)"
                  #fileInput
                  class="file-input"
                />
                <button
                  (click)="uploadFile(slot.key, fileInput)"
                  [disabled]="!selectedFiles[slot.key] || isUploading(slot.key)"
                  class="btn-sm btn-upload"
                >
                  {{ isUploading(slot.key) ? 'Uploading...' : 'Upload' }}
                </button>
              </div>
            </div>
          </div>
        </fieldset>
      </main>
    </div>
  `,
  styles: [`
    .app-container { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; min-height: 100vh; }
    .navbar { display: flex; justify-content: space-between; align-items: center; background: #1e293b; color: #fff; padding: 1rem 2rem; }
    .brand { font-size: 1.1rem; font-weight: 700; }
    .btn-back { color: #94a3b8; text-decoration: none; font-size: 0.9rem; font-weight: 500; }
    .btn-back:hover { color: #fff; }
    .content { padding: 2rem; max-width: 900px; margin: 0 auto; }
    .status-banner { display: flex; justify-content: space-between; align-items: center; background: #e0f2fe; border: 1px solid #bae6fd; padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1.5rem; color: #0369a1; }
    .badge-draft { background: #fef08a; color: #854d0e; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.8rem; }
    
    .readiness-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 1.5rem; }
    .readiness-header { display: flex; justify-content: space-between; align-items: flex-start; }
    .readiness-title { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #64748b; }
    .score-display { margin: 0.2rem 0 0 0; font-size: 2rem; font-weight: 800; color: #0f172a; }
    .status-badge { padding: 0.4rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 700; }
    .badge-ready { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-not-ready { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

    .progress-bar-container { background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden; margin: 0.75rem 0 1rem 0; }
    .progress-bar-fill { background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; transition: width 0.4s ease; }

    .category-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem; }
    .cat-pill { background: #f1f5f9; padding: 0.4rem 0.6rem; border-radius: 6px; font-size: 0.8rem; display: flex; flex-direction: column; }
    .cat-name { color: #64748b; font-weight: 500; }
    .cat-score { color: #0f172a; font-weight: 700; font-size: 0.9rem; margin-top: 0.1rem; }

    .missing-summary { margin-top: 0.75rem; border-top: 1px dashed #e2e8f0; padding-top: 0.75rem; display: flex; align-items: center; gap: 0.75rem; font-size: 0.85rem; }
    .missing-badge { background: #fef3c7; color: #92400e; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; }
    .missing-hint { color: #64748b; }

    .section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    legend { font-weight: 700; font-size: 1.05rem; color: #0f172a; padding: 0 0.5rem; }
    .section-hint { font-size: 0.85rem; color: #64748b; margin-bottom: 1rem; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-top: 0.5rem; }
    .full-width { grid-column: 1 / -1; }
    .sub-heading { color: #334155; margin: 0.5rem 0 0.25rem; font-size: 0.95rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem; }
    .mt { margin-top: 1.25rem; }
    .mt-2 { margin-top: 2rem; }
    .form-group { display: flex; flex-direction: column; }
    label { font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 0.25rem; }
    .form-control { padding: 0.55rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; }
    .form-control:focus { outline: none; border-color: #2563eb; }
    .form-actions { display: flex; justify-content: flex-end; margin-top: 1rem; }
    .btn-save { background: #16a34a; color: #fff; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-weight: 700; cursor: pointer; font-size: 1rem; }
    .btn-save:hover { background: #15803d; }
    .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
    .alert { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1.5rem; font-size: 0.9rem; }
    .alert-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
    .alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }

    /* Documents Grid */
    .doc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); gap: 1.25rem; margin-top: 1rem; }
    .doc-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; }
    .doc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; }
    .badge-uploaded { background: #dcfce7; color: #15803d; font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; }
    .badge-pending { background: #f1f5f9; color: #64748b; font-size: 0.75rem; font-weight: 700; padding: 0.15rem 0.4rem; border-radius: 4px; }
    .hint-text { font-size: 0.8rem; color: #64748b; margin: 0 0 0.75rem; }
    .doc-info { margin-top: 0.5rem; background: #fff; padding: 0.6rem; border: 1px solid #e2e8f0; border-radius: 4px; }
    .file-name { margin: 0 0 0.5rem; font-size: 0.85rem; font-weight: 600; color: #334155; word-break: break-all; }
    .doc-actions { display: flex; gap: 0.5rem; }
    .upload-controls { display: flex; gap: 0.5rem; align-items: center; }
    .file-input { font-size: 0.8rem; width: 100%; }
    .btn-sm { padding: 0.4rem 0.75rem; border-radius: 4px; border: none; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
    .btn-upload { background: #2563eb; color: #fff; }
    .btn-upload:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-view { background: #0284c7; color: #fff; }
    .btn-view:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-delete { background: #dc2626; color: #fff; }
  `]
})
export class ApplicationFormComponent implements OnInit {
  private appService = inject(ApplicationService);

  application = signal<Application | null>(null);
  documents = signal<DocumentSlots>({});
  readiness = signal<ReadinessResponse | null>(null);
  isSaving = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  selectedFiles: { [key: string]: File | null } = {};
  uploadingState: { [key: string]: boolean } = {};
  downloadingState: { [key: string]: boolean } = {};

  docSlots: DocSlotConfig[] = [
    { key: 'class10Marksheet', label: 'Class 10 Marksheet', accept: '.pdf,.jpg,.jpeg,.png', hint: 'PDF or Image up to 5 MB' },
    { key: 'class12Marksheet', label: 'Class 12 Marksheet', accept: '.pdf,.jpg,.jpeg,.png', hint: 'PDF or Image up to 5 MB' },
    { key: 'idProof', label: 'Government ID Proof', accept: '.pdf,.jpg,.jpeg,.png', hint: 'Aadhaar / Passport / Voter ID up to 5 MB' },
    { key: 'passportPhoto', label: 'Passport Size Photo', accept: '.jpg,.jpeg,.png', hint: 'Image file (JPG/PNG) up to 5 MB' }
  ];

  form: Partial<Application> = {
    firstName: '', middleName: '', lastName: '', dateOfBirth: '', gender: '',
    phone: '', alternatePhone: '', email: '', nationality: 'Indian',
    addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India',
    class10: { board: '', institutionName: '', passingYear: null, percentage: null },
    class12: { board: '', institutionName: '', passingYear: null, percentage: null },
    programLevel: 'Undergraduate',
    programName: 'B.Tech Computer Science',
    preferredDepartment: 'School of Engineering & Technology'
  };

  ngOnInit(): void {
    this.loadApplication();
    this.fetchReadiness();
  }

  fetchReadiness(): void {
    this.appService.getReadiness().subscribe({
      next: (res) => this.readiness.set(res),
      error: (err) => console.error('Error fetching readiness:', err)
    });
  }

  loadApplication(): void {
    this.appService.getMyApplication().subscribe({
      next: (res) => {
        if (res.application) {
          this.application.set(res.application);
          this.documents.set(res.application.documents || {});
          this.populateForm(res.application);
        }
      },
      error: (err) => {
        console.error('Error loading application:', err);
      }
    });
  }

  saveDraft(): void {
    this.isSaving.set(true);
    this.successMessage.set(null);
    this.errorMessage.set(null);

    const existing = this.application();

    if (existing) {
      this.appService.updateMyApplication(this.form).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.application.set(res.application);
          if (res.application.documents) {
            this.documents.set(res.application.documents);
          }
          this.successMessage.set('Draft application updated successfully!');
          this.fetchReadiness();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to update draft application.');
        }
      });
    } else {
      this.appService.createApplication(this.form).subscribe({
        next: (res) => {
          this.isSaving.set(false);
          this.application.set(res.application);
          if (res.application.documents) {
            this.documents.set(res.application.documents);
          }
          this.successMessage.set(`Draft application created! Application No: ${res.application.applicationNumber}`);
          this.fetchReadiness();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to create draft application.');
        }
      });
    }
  }

  onFileSelected(slotKey: keyof DocumentSlots, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFiles[slotKey] = input.files[0];
    }
  }

  uploadFile(slotKey: keyof DocumentSlots, inputRef: HTMLInputElement): void {
    const file = this.selectedFiles[slotKey];
    if (!file) return;

    this.uploadingState[slotKey] = true;
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.appService.uploadDocument(slotKey, file).subscribe({
      next: (res) => {
        this.uploadingState[slotKey] = false;
        this.selectedFiles[slotKey] = null;
        inputRef.value = '';
        this.successMessage.set(`Uploaded ${file.name} successfully!`);
        this.refreshDocMetadata();
        this.fetchReadiness();
      },
      error: (err) => {
        this.uploadingState[slotKey] = false;
        this.errorMessage.set(err.error?.message || `Failed to upload ${file.name}.`);
      }
    });
  }

  removeDocument(slotKey: keyof DocumentSlots): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.appService.deleteDocument(slotKey).subscribe({
      next: () => {
        this.successMessage.set(`Document removed successfully.`);
        this.refreshDocMetadata();
        this.fetchReadiness();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || `Failed to remove document.`);
      }
    });
  }

  viewDocument(slotKey: keyof DocumentSlots): void {
    const docMeta = this.getDocMeta(slotKey);
    if (!docMeta) return;

    this.downloadingState[slotKey] = true;
    this.successMessage.set(null);
    this.errorMessage.set(null);

    this.appService.downloadDocumentFile(slotKey).subscribe({
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
        this.errorMessage.set(err.error?.message || 'Failed to download protected file.');
      }
    });
  }

  getDocMeta(slotKey: keyof DocumentSlots): DocumentMetadata | null {
    const docs = this.documents();
    return docs ? (docs[slotKey] || null) : null;
  }

  isUploading(slotKey: keyof DocumentSlots): boolean {
    return !!this.uploadingState[slotKey];
  }

  isDownloading(slotKey: keyof DocumentSlots): boolean {
    return !!this.downloadingState[slotKey];
  }

  private refreshDocMetadata(): void {
    this.appService.getDocumentMetadata().subscribe({
      next: (res) => {
        this.documents.set(res.documents || {});
      }
    });
  }

  private populateForm(app: Application): void {
    this.form = {
      firstName: app.firstName || '',
      middleName: app.middleName || '',
      lastName: app.lastName || '',
      dateOfBirth: app.dateOfBirth || '',
      gender: app.gender || '',
      phone: app.phone || '',
      alternatePhone: app.alternatePhone || '',
      email: app.email || '',
      nationality: app.nationality || 'Indian',
      addressLine1: app.addressLine1 || '',
      addressLine2: app.addressLine2 || '',
      city: app.city || '',
      state: app.state || '',
      postalCode: app.postalCode || '',
      country: app.country || 'India',
      class10: {
        board: app.class10?.board || '',
        institutionName: app.class10?.institutionName || '',
        passingYear: app.class10?.passingYear || null,
        percentage: app.class10?.percentage || null
      },
      class12: {
        board: app.class12?.board || '',
        institutionName: app.class12?.institutionName || '',
        passingYear: app.class12?.passingYear || null,
        percentage: app.class12?.percentage || null
      },
      programLevel: app.programLevel || 'Undergraduate',
      programName: app.programName || 'B.Tech Computer Science',
      preferredDepartment: app.preferredDepartment || 'School of Engineering & Technology'
    };
  }
}
