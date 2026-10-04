import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApplicationService, ReadinessResponse } from '../../core/services/application.service';

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
        <!-- Readiness Summary Card -->
        <div class="card readiness-card" *ngIf="readiness(); else loadingReadiness">
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
          <div class="card">
            <p style="color: #64748b;">Loading application readiness evaluation...</p>
          </div>
        </ng-template>

        <!-- Main Form Navigation Card -->
        <div class="card" style="margin-top: 1.5rem;">
          <h3>Admission Application Form</h3>
          <p>Complete your personal details, academic history, program choices, and document uploads.</p>
          <div class="actions">
            <a routerLink="/applicant/application" class="btn-app">Open Admission Application Form →</a>
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

  ngOnInit(): void {
    this.fetchReadiness();
  }

  fetchReadiness(): void {
    this.applicationService.getReadiness().subscribe({
      next: (data) => this.readiness.set(data),
      error: (err) => console.error('Failed to load readiness score:', err)
    });
  }

  logout(): void {
    this.authService.logout();
  }
}
