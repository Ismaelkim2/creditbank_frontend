import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard.component';
import { LoanListComponent } from './loan-list/loan-list.component';
import { ReportsComponent } from './reports/reports.component';
import { SettingsComponent } from './settings/settings.component';
import { LoginComponent } from './login/login.component';
import { RegistrationComponent } from './registration/registration.component';
import { RepaymentFormComponent } from './repayment-form/repayment-form.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { AdminApprovalsComponent } from './admin-approvals/admin-approvals.component';
import { AccountRegistrationComponent } from './account-registration/account-registration.component';
import { DebtloansComponent } from './debtloans/debtloans.component';
import { UserStatementComponent } from './user-statement/user-statement.component';
import { PaymentsComponent } from './payment-summary/payment-summary.component';
import { ProfileComponent } from './profile/profile.component';
import { AccountsComponent } from './accounts/accounts.component';
import { TransactionsComponent } from './transactions/transactions.component';
import { LoanApplicationComponent } from './loan-application/loan-application.component';
import { LayoutComponent } from './layout/layout.component';
import { CustomerDetailsComponent } from './customer-details/customer-details.component';
import { AssignStaffComponent } from './assign-staff/assign-staff.component';
import { StaffComponent } from './staff/staff.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ApplicantDashboardComponent } from './applicant-dashboard/applicant-dashboard.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';
import { AuthGuard } from './services/auth-guard.service';
import { AdminGuard } from './services/services/AdminGuard.services';
import { DataManagerGuard } from './services/services/DataManagerGuard.service';
import { ApplicantGuard } from './services/services/ApplicantGuard.service';
import { AdminOrDataManagerGuard } from './services/admin-or-data-manager-guard.service';


const routes: Routes = [

  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },

  // =====================================================
  // PUBLIC ROUTES
  // =====================================================

  {
    path: '',
    component: AuthLayoutComponent,
    children: [

      {
        path: 'login',
        component: LoginComponent
      },

      {
        path: 'register',
        component: RegistrationComponent
      },

      {
        path: 'forgot-password',
        component: ForgotPasswordComponent
      }

    ]
  },

  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  },

  // =====================================================
  // PROTECTED AREA
  // =====================================================

  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [

      // Default after login (change if desired)
      {
        path: '',
        redirectTo: 'applicant',
        pathMatch: 'full'
      },

      // =====================================================
      // ADMIN + DATA MANAGER
      // =====================================================

      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AdminOrDataManagerGuard]
      },

      {
        path: 'accountsopening',
        component: AccountRegistrationComponent,
        canActivate: [AdminOrDataManagerGuard]
      },

      {
        path: 'loans',
        component: LoanListComponent,
        canActivate: [AdminOrDataManagerGuard]
      },

      {
        path: 'accounts',
        component: AccountsComponent,
        canActivate: [AdminOrDataManagerGuard]
      },

      {
        path: 'loanApplication',
        component: LoanApplicationComponent,
        canActivate: [AdminOrDataManagerGuard]
      },

      {
        path: 'transactions',
        component: TransactionsComponent,
        canActivate: [AdminOrDataManagerGuard]
      },

      {
        path: 'statement',
        component: UserStatementComponent,
        canActivate: [AdminOrDataManagerGuard]
      },

      {
        path: 'user-profile',
        component: ProfileComponent,
        canActivate: [AdminOrDataManagerGuard]
      },

      // =====================================================
      // ADMIN ONLY
      // =====================================================

      {
        path: 'staff',
        component: StaffComponent,
        canActivate: [AdminGuard]
      },

      {
        path: 'loanApplication',
        component: LoanApplicationComponent,
        canActivate: [AdminGuard]
      },

      {
        path: 'management',
        component: AdminApprovalsComponent,
        canActivate: [AdminGuard]
      },

      {
        path: 'reports',
        component: ReportsComponent,
        canActivate: [AdminGuard]
      },

      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [AdminGuard]
      },

      {
        path: 'customer-details',
        component: CustomerDetailsComponent,
        canActivate: [AdminGuard]
      },

      {
        path: 'accountsopening',
        component: AccountRegistrationComponent,
        canActivate: [AdminGuard]
      },

      {
        path: 'assign-staff',
        component: AssignStaffComponent,
        canActivate: [AdminGuard]
      },

      // =====================================================
      // DATA MANAGER ONLY
      // =====================================================

      {
        path: 'account-registration',
        component: AccountRegistrationComponent,
        canActivate: [DataManagerGuard]
      },

      // =====================================================
      // APPLICANT ONLY
      // =====================================================

      {
        path: 'applicant',
        component: ApplicantDashboardComponent,
        canActivate: [ApplicantGuard]
      },

      {
        path: 'loan-application',
        component: LoanApplicationComponent,
        canActivate: [ApplicantGuard]
      },

      {
        path: 'debtloans',
        component: DebtloansComponent,
        canActivate: [ApplicantGuard]
      },

      {
        path: 'payments',
        component: PaymentsComponent,
        canActivate: [ApplicantGuard]
      },

      {
        path: 'repayment-form',
        component: RepaymentFormComponent,
        canActivate: [AuthGuard]
      }

    ]
  },

  // =====================================================
  // FALLBACK
  // =====================================================

  {
    path: '**',
    redirectTo: 'login'
  }

];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      onSameUrlNavigation: 'reload',
      scrollPositionRestoration: 'enabled'
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }