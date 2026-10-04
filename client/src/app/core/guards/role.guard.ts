import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRole = route.data['role'];
  const userRole = authService.userRole();

  if (authService.isAuthenticated() && userRole === expectedRole) {
    return true;
  }

  // Redirect based on current role or login
  if (userRole === 'admin') {
    router.navigate(['/admin/dashboard']);
  } else if (userRole === 'applicant') {
    router.navigate(['/applicant/dashboard']);
  } else {
    router.navigate(['/login']);
  }

  return false;
};
