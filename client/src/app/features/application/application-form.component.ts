import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApplicationService, Application } from '../../core/services/application.service';

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

        <div *ngIf="successMessage()" class="alert alert-success">
          {{ successMessage() }}
        </div>
        <div *ngIf="errorMessage()" class="alert alert-error">
          {{ errorMessage() }}
        </div>

        <form (ngSubmit)="saveDraft()" #appForm="ngForm">
          <!-- Section 1: Personal Details -->
          <fieldset class="section-card">
            <legend>1. Personal Details</legend>
            <div class="form-grid">
              <div class="form-group">
                <label>First Name</label>
                <input type="text" [(ngModel)]="form.firstName" name="firstName" class="form-control" />
              </div>
              <div class="form-group">
                <label>Middle Name (Optional)</label>
                <input type="text" [(ngModel)]="form.middleName" name="middleName" class="form-control" />
              </div>
              <div class="form-group">
                <label>Last Name</label>
                <input type="text" [(ngModel)]="form.lastName" name="lastName" class="form-control" />
              </div>
              <div class="form-group">
                <label>Date of Birth</label>
                <input type="date" [(ngModel)]="form.dateOfBirth" name="dateOfBirth" class="form-control" />
              </div>
              <div class="form-group">
                <label>Gender</label>
                <select [(ngModel)]="form.gender" name="gender" class="form-control">
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Mobile Phone</label>
                <input type="tel" [(ngModel)]="form.phone" name="phone" class="form-control" />
              </div>
              <div class="form-group">
                <label>Email Address</label>
                <input type="email" [(ngModel)]="form.email" name="email" class="form-control" />
              </div>
              <div class="form-group">
                <label>Nationality</label>
                <input type="text" [(ngModel)]="form.nationality" name="nationality" class="form-control" placeholder="Indian" />
              </div>
            </div>
          </fieldset>

          <!-- Section 2: Address -->
          <fieldset class="section-card">
            <legend>2. Address Details</legend>
            <div class="form-grid">
              <div class="form-group full-width">
                <label>Address Line 1</label>
                <input type="text" [(ngModel)]="form.addressLine1" name="addressLine1" class="form-control" />
              </div>
              <div class="form-group full-width">
                <label>Address Line 2 (Optional)</label>
                <input type="text" [(ngModel)]="form.addressLine2" name="addressLine2" class="form-control" />
              </div>
              <div class="form-group">
                <label>City</label>
                <input type="text" [(ngModel)]="form.city" name="city" class="form-control" />
              </div>
              <div class="form-group">
                <label>State</label>
                <input type="text" [(ngModel)]="form.state" name="state" class="form-control" />
              </div>
              <div class="form-group">
                <label>Postal Code</label>
                <input type="text" [(ngModel)]="form.postalCode" name="postalCode" class="form-control" />
              </div>
              <div class="form-group">
                <label>Country</label>
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
                <label>Board</label>
                <input type="text" [(ngModel)]="form.class10!.board" name="c10_board" class="form-control" placeholder="CBSE / ICSE / State" />
              </div>
              <div class="form-group">
                <label>Institution Name</label>
                <input type="text" [(ngModel)]="form.class10!.institutionName" name="c10_school" class="form-control" />
              </div>
              <div class="form-group">
                <label>Passing Year</label>
                <input type="number" [(ngModel)]="form.class10!.passingYear" name="c10_year" class="form-control" placeholder="2022" />
              </div>
              <div class="form-group">
                <label>Percentage (%)</label>
                <input type="number" [(ngModel)]="form.class10!.percentage" name="c10_pct" class="form-control" placeholder="85.5" step="0.1" />
              </div>
            </div>

            <h4 class="sub-heading mt">Class 12 / Diploma (Higher Secondary)</h4>
            <div class="form-grid">
              <div class="form-group">
                <label>Board</label>
                <input type="text" [(ngModel)]="form.class12!.board" name="c12_board" class="form-control" placeholder="CBSE / ISC / State" />
              </div>
              <div class="form-group">
                <label>Institution Name</label>
                <input type="text" [(ngModel)]="form.class12!.institutionName" name="c12_school" class="form-control" />
              </div>
              <div class="form-group">
                <label>Passing Year</label>
                <input type="number" [(ngModel)]="form.class12!.passingYear" name="c12_year" class="form-control" placeholder="2024" />
              </div>
              <div class="form-group">
                <label>Percentage (%)</label>
                <input type="number" [(ngModel)]="form.class12!.percentage" name="c12_pct" class="form-control" placeholder="88.0" step="0.1" />
              </div>
            </div>
          </fieldset>

          <!-- Section 4: Program Selection -->
          <fieldset class="section-card">
            <legend>4. Program Selection</legend>
            <div class="form-grid">
              <div class="form-group">
                <label>Program Level</label>
                <select [(ngModel)]="form.programLevel" name="programLevel" class="form-control">
                  <option value="Undergraduate">Undergraduate (UG)</option>
                  <option value="Postgraduate">Postgraduate (PG)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Program Name</label>
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
                <label>Preferred Department</label>
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
    .section-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
    legend { font-weight: 700; font-size: 1.05rem; color: #0f172a; padding: 0 0.5rem; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-top: 0.5rem; }
    .full-width { grid-column: 1 / -1; }
    .sub-heading { color: #334155; margin: 0.5rem 0 0.25rem; font-size: 0.95rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 0.25rem; }
    .mt { margin-top: 1.25rem; }
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
  `]
})
export class ApplicationFormComponent implements OnInit {
  private appService = inject(ApplicationService);

  application = signal<Application | null>(null);
  isSaving = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

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
  }

  loadApplication(): void {
    this.appService.getMyApplication().subscribe({
      next: (res) => {
        if (res.application) {
          this.application.set(res.application);
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
          this.successMessage.set('Draft application updated successfully!');
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
          this.successMessage.set(`Draft application created! Application No: ${res.application.applicationNumber}`);
        },
        error: (err) => {
          this.isSaving.set(false);
          this.errorMessage.set(err.error?.message || 'Failed to create draft application.');
        }
      });
    }
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
