import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AcademicRecord {
  board?: string;
  institutionName?: string;
  passingYear?: number | null;
  percentage?: number | null;
}

export interface Application {
  _id?: string;
  applicant?: string;
  applicationNumber: string;
  status: 'DRAFT';
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
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private http = inject(HttpClient);
  private readonly API_URL = 'http://localhost:3000/api/applications';

  createApplication(payload: Partial<Application> = {}): Observable<{ message: string; application: Application }> {
    return this.http.post<{ message: string; application: Application }>(this.API_URL, payload);
  }

  getMyApplication(): Observable<{ application: Application | null; message?: string }> {
    return this.http.get<{ application: Application | null; message?: string }>(`${this.API_URL}/me`);
  }

  updateMyApplication(payload: Partial<Application>): Observable<{ message: string; application: Application }> {
    return this.http.patch<{ message: string; application: Application }>(`${this.API_URL}/me`, payload);
  }
}
