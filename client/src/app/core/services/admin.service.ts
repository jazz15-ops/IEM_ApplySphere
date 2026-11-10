import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AcademicRecord, DocumentSlots, ReadinessResponse, StatusHistoryEntry } from './application.service';

export interface AdminApplicationListItem {
  _id: string;
  applicationNumber: string;
  applicantName: string;
  applicantEmail: string;
  preferredDepartment: string;
  programName: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SELECTED' | 'REJECTED';
  readinessScore: number;
  submittedAt?: string | null;
  updatedAt?: string;
}

export interface AdminPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminApplicationsResponse {
  applications: AdminApplicationListItem[];
  pagination: AdminPaginationMeta;
}

export interface AdminApplicationDetail {
  _id: string;
  applicationNumber: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SELECTED' | 'REJECTED';
  submittedAt?: string | null;
  reviewStartedAt?: string | null;
  decisionAt?: string | null;
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  applicant: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
  };
  personalDetails: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    phone?: string;
    alternatePhone?: string;
    email?: string;
    nationality?: string;
  };
  addressDetails: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  academicDetails: {
    class10?: AcademicRecord;
    class12?: AcademicRecord;
  };
  programSelection: {
    programLevel?: string;
    programName?: string;
    preferredDepartment?: string;
  };
  documents: DocumentSlots;
  readiness: ReadinessResponse;
}

export interface AnalyticsOverview {
  totalApplications: number;
  draft: number;
  submitted: number;
  underReview: number;
  selected: number;
  rejected: number;
}

export interface StatusCount {
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SELECTED' | 'REJECTED';
  count: number;
}

export interface DepartmentCount {
  department: string;
  count: number;
}

export interface DecisionSummary {
  decidedApplications: number;
  selected: number;
  rejected: number;
  selectionRate: number;
}

export interface ReviewPipeline {
  awaitingReview: number;
  currentlyUnderReview: number;
  completedDecisions: number;
}

export interface AdminAnalyticsResponse {
  overview: AnalyticsOverview;
  byStatus: StatusCount[];
  byDepartment: DepartmentCount[];
  decisions: DecisionSummary;
  reviewPipeline: ReviewPipeline;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/admin/applications`;
  private readonly ANALYTICS_URL = `${environment.apiUrl}/admin/analytics`;

  getAnalytics(): Observable<AdminAnalyticsResponse> {
    return this.http.get<AdminAnalyticsResponse>(this.ANALYTICS_URL);
  }

  getApplications(filters: { status?: string; department?: string; search?: string; page?: number; limit?: number } = {}): Observable<AdminApplicationsResponse> {
    let params = new HttpParams();

    if (filters.status && filters.status.trim()) params = params.set('status', filters.status.trim());
    if (filters.department && filters.department.trim()) params = params.set('department', filters.department.trim());
    if (filters.search && filters.search.trim()) params = params.set('search', filters.search.trim());
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());

    return this.http.get<AdminApplicationsResponse>(this.API_URL, { params });
  }

  getApplicationDetail(applicationId: string): Observable<AdminApplicationDetail> {
    return this.http.get<AdminApplicationDetail>(`${this.API_URL}/${applicationId}`);
  }

  updateApplicationStatus(applicationId: string, status: string): Observable<{ message: string; status: string; applicationNumber: string }> {
    return this.http.patch<{ message: string; status: string; applicationNumber: string }>(
      `${this.API_URL}/${applicationId}/status`,
      { status }
    );
  }

  getAdminDocumentViewUrl(applicationId: string, documentType: string): Observable<{ url: string; storageProvider: 'local' | 'blob' }> {
    return this.http.get<{ url: string; storageProvider: 'local' | 'blob' }>(
      `${this.API_URL}/${applicationId}/documents/${documentType}/view-url`
    );
  }

  downloadAdminDocument(applicationId: string, documentType: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/${applicationId}/documents/${documentType}/file`, {
      responseType: 'blob'
    });
  }
}
