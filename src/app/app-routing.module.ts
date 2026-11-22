
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

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

import { MainDashboardComponent } from './main-dashboard/main-dashboard.component';
import { CustomerInfoComponent } from './customer-info/customer-info.component';

import { TenantAgentDashboardComponent } from './tenant-agent-dashboard/tenant-agent-dashboard.component';
import { TenantPropertyRegistrationComponent } from './tenant-property-registration/tenant-property-registration.component';
import { TenantRegistrationComponent } from './tenant-registration/tenant-registration.component';
import { TenantUnitManagementComponent } from './tenant-unit-management/tenant-unit-management.component';
import { TenantLeaseManagementComponent } from './tenant-lease-management/tenant-lease-management.component';
import { TenantRentManagementComponent } from './tenant-rent-management/tenant-rent-management.component';
import { TenantDirectoryComponent } from './tenant-directory/tenant-directory.component';
import { TenantRemindersComponent } from './tenant-reminders/tenant-reminders.component';
import { TenantCalendarComponent } from './tenant-calendar/tenant-calendar.component';
import { TenantPortfolioActivityComponent } from './tenant-portfolio-activity/tenant-portfolio-activity.component';
import { StaffInvitationComponent } from './staff-invitation/staff-invitation.component';

const routes: Routes = [
  // =====================================================
  // ROOT
  // =====================================================
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
  path: 'staff-invitation',
  component: StaffInvitationComponent
},

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
  // PROTECTED APPLICATION
  // =====================================================
  {
    path: 'app',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      // Default application route
      {
        path: '',
        redirectTo: 'applicant',
        pathMatch: 'full'
      },

      // =====================================================
      // GENERAL DASHBOARDS
      // =====================================================
      {
        path: 'dashboard',
        component: MainDashboardComponent,
        canActivate: [AdminOrDataManagerGuard]
      },

      {
        path: 'tenant-agent-dashboard',
        component: TenantAgentDashboardComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT']
        }
      },

      // =====================================================
      // TENANT / PROPERTY DIRECTORY ROUTES
      // =====================================================

      // Property directory
      {
        path: 'tenant/properties',
        component: TenantDirectoryComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT', 'ADMIN'],
          directory: 'properties'
        }
      },

      // Property registration
      {
        path: 'tenant/properties/register',
        component: TenantPropertyRegistrationComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT']
        }
      },

      // Unit directory MUST remain separate from unit management
      {
        path: 'tenant/units/directory',
        component: TenantDirectoryComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT', 'ADMIN'],
          directory: 'units'
        }
      },

            {
        path: 'tenant/reminders',
        component: TenantRemindersComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT', 'ADMIN'],
          directory: 'reminders'
        }
      },

      // Existing unit management page
      {
        path: 'tenant/units',
        component: TenantUnitManagementComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT', 'ADMIN']
        }
      },

      // Tenant / resident directory
      {
        path: 'tenant/tenants',
        component: TenantDirectoryComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT', 'ADMIN'],
          directory: 'tenants'
        }
      },

      // Tenant registration
      {
        path: 'tenant/register',
        component: TenantRegistrationComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT', 'ADMIN']
        }
      },

      // Lease management
      {
        path: 'tenant/leases',
        component: TenantLeaseManagementComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT', 'ADMIN']
        }
      },

      // Rent management
      {
        path: 'tenant/rent',
        component: TenantRentManagementComponent,
        canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT', 'ADMIN']
        }
      },

      {
  path: 'tenant/calendar',
  component: TenantCalendarComponent,
  canActivate: [AuthGuard],
  data: {
    roles: ['TENANT_AGENT', 'ADMIN']
  }
},

{
  path: 'tenant/portfolio-activity',
  component: TenantPortfolioActivityComponent,
   canActivate: [AuthGuard],
  data: {
    roles: ['TENANT_AGENT', 'ADMIN']
  }
},

      // =====================================================
      // ADMIN + DATA MANAGER ROUTES
      // =====================================================
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
        path: 'customer-info/:accountNumber',
        component: CustomerInfoComponent,
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
       canActivate: [AuthGuard],
        data: {
          roles: ['TENANT_AGENT', 'ADMIN']
        }
      },

      // =====================================================
      // ADMIN-ONLY ROUTES
      // =====================================================
      {
        path: 'staff',
        component: StaffComponent,
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
        path: 'assign-staff',
        component: AssignStaffComponent,
        canActivate: [AdminGuard]
      },

      // =====================================================
      // DATA MANAGER-ONLY ROUTES
      // =====================================================
      {
        path: 'account-registration',
        component: AccountRegistrationComponent,
        canActivate: [DataManagerGuard]
      },

      // =====================================================
      // APPLICANT ROUTES
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
      },

      // =====================================================
      // UNKNOWN APPLICATION ROUTE
      // =====================================================
      {
        path: '**',
        redirectTo: 'unauthorized'
      }
    ]
  },

  // =====================================================
  // GLOBAL FALLBACK
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
export class AppRoutingModule {}
