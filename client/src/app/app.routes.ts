import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { ApplicantDashboardComponent } from './features/dashboard/applicant-dashboard.component';
import { AdminDashboardComponent } from './features/dashboard/admin-dashboard.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'applicant/dashboard',
    component: ApplicantDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'applicant' }
  },
  {
    path: 'admin/dashboard',
    component: AdminDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'admin' }
  },
  { path: '**', redirectTo: 'login' }
];
