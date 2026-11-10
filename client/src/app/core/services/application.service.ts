import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, from } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AcademicRecord {
  board?: string;
  institutionName?: string;
  passingYear?: number | null;
  percentage?: number | null;
}

export interface DocumentMetadata {
  originalName: string;
  storedName: string;
  relativePath: string;
  storageProvider?: 'local' | 'blob';
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface DocumentSlots {
  class10Marksheet?: DocumentMetadata | null;
  class12Marksheet?: DocumentMetadata | null;
  idProof?: DocumentMetadata | null;
  passportPhoto?: DocumentMetadata | null;
}

export interface StatusHistoryEntry {
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SELECTED' | 'REJECTED';
  changedAt: string;
  changedBy?: string;
  changedByRole: 'applicant' | 'admin';
}

export interface Application {
  _id?: string;
  applicant?: string;
  applicationNumber: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SELECTED' | 'REJECTED';
  statusHistory?: StatusHistoryEntry[];
  submittedAt?: string | null;
  reviewStartedAt?: string | null;
  decisionAt?: string | null;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  phone?: string;
  alternatePhone?: string;
  email?: string;
  nationality?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  class10?: AcademicRecord;
  class12?: AcademicRecord;
  programLevel?: string;
  programName?: string;
  preferredDepartment?: string;
  documents?: DocumentSlots;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadinessItem {
  key: string;
  label: string;
  category: string;
}

export interface ReadinessCategoryScore {
  score: number;
  maxScore: number;
}

export interface ReadinessBreakdown {
  personalAndAddress: ReadinessCategoryScore;
  academic: ReadinessCategoryScore;
  programSelection: ReadinessCategoryScore;
  marksheets: ReadinessCategoryScore;
  idProof: ReadinessCategoryScore;
  passportPhoto: ReadinessCategoryScore;
}

export interface ReadinessResponse {
  applicationNumber: string | null;
  readinessScore: number;
  canSubmit: boolean;
  breakdown: ReadinessBreakdown;
  missingItems: ReadinessItem[];
  completedItems: ReadinessItem[];
}

export interface ApplicationStatusResponse {
  applicationNumber: string | null;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'SELECTED' | 'REJECTED' | null;
  submittedAt: string | null;
  reviewStartedAt: string | null;
  decisionAt: string | null;
  statusHistory: StatusHistoryEntry[];
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/applications`;

  createApplication(payload: Partial<Application> = {}): Observable<{ message: string; application: Application }> {
    return this.http.post<{ message: string; application: Application }>(this.API_URL, payload);
  }

  getMyApplication(): Observable<{ application: Application | null; message?: string }> {
    return this.http.get<{ application: Application | null; message?: string }>(`${this.API_URL}/me`);
  }

  updateMyApplication(payload: Partial<Application>): Observable<{ message: string; application: Application }> {
    return this.http.patch<{ message: string; application: Application }>(`${this.API_URL}/me`, payload);
  }

  getReadiness(): Observable<ReadinessResponse> {
    return this.http.get<ReadinessResponse>(`${this.API_URL}/me/readiness`);
  }

  submitApplication(): Observable<{ message: string; application: Application }> {
    return this.http.post<{ message: string; application: Application }>(`${this.API_URL}/me/submit`, {});
  }

  getApplicationStatus(): Observable<ApplicationStatusResponse> {
    return this.http.get<ApplicationStatusResponse>(`${this.API_URL}/me/status`);
  }

  uploadDocument(documentType: string, file: File): Observable<{ message: string; documentType: string; metadata: DocumentMetadata }> {
    if (!environment.production) {
      // Development mode: multipart/local upload workflow to Express Multer
      const formData = new FormData();
      formData.append('file', file);
      return this.http.post<{ message: string; documentType: string; metadata: DocumentMetadata }>(
        `${this.API_URL}/me/documents/${documentType}`,
        formData
      );
    } else {
      // Production mode: direct client PUT to Vercel Private Blob signed URL (bypassing 4.5 MB Function limit)
      return from(this.uploadDirectToBlob(documentType, file));
    }
  }

  private async uploadDirectToBlob(
    documentType: string,
    file: File
  ): Promise<{ message: string; documentType: string; metadata: DocumentMetadata }> {
    // Step 1: Request short-lived signed PUT URL from backend
    const signedUrlRes = await firstValueFrom(
      this.http.post<{ uploadUrl: string; pathname: string; documentType: string }>(
        `${this.API_URL}/me/documents/${documentType}/signed-upload-url`,
        {
          originalName: file.name,
          mimeType: file.type,
          size: file.size
        }
      )
    );

    // Step 2: Directly upload file bytes to the signed Blob URL with PUT (no custom Authorization headers)
    const uploadRes = await fetch(signedUrlRes.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'content-type': file.type || 'application/octet-stream'
      }
    });

    if (!uploadRes.ok) {
      let errorDetail = '';
      try {
        errorDetail = await uploadRes.text();
      } catch {}
      throw new Error(`Direct document upload failed (${uploadRes.status}): ${errorDetail || uploadRes.statusText}`);
    }

    // Step 3: Call authenticated finalize endpoint so backend verifies blob existence before DB update
    const confirmRes = await firstValueFrom(
      this.http.post<{ message: string; documentType: string; metadata: DocumentMetadata }>(
        `${this.API_URL}/me/documents/${documentType}/confirm`,
        {
          pathname: signedUrlRes.pathname,
          originalName: file.name,
          mimeType: file.type
        }
      )
    );

    return confirmRes;
  }

  deleteDocument(documentType: string): Observable<{ message: string; documentType: string }> {
    return this.http.delete<{ message: string; documentType: string }>(`${this.API_URL}/me/documents/${documentType}`);
  }

  getDocumentMetadata(): Observable<{ documents: DocumentSlots }> {
    return this.http.get<{ documents: DocumentSlots }>(`${this.API_URL}/me/documents`);
  }

  getDocumentViewUrl(documentType: string): Observable<{ url: string; storageProvider: 'local' | 'blob' }> {
    return this.http.get<{ url: string; storageProvider: 'local' | 'blob' }>(
      `${this.API_URL}/me/documents/${documentType}/view-url`
    );
  }

  downloadDocumentFile(documentType: string): Observable<Blob> {
    return this.http.get(`${this.API_URL}/me/documents/${documentType}/file`, {
      responseType: 'blob'
    });
  }
}
