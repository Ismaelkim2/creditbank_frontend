import { NgModule, Component } from '@angular/core';
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
import { ApplicantDashboardComponent } from './applicant-dashboard/applicant-dashboard.component';
import { AccountRegistrationComponent } from './account-registration/account-registration.component';
import { DebtloansComponent } from './debtloans/debtloans.component';
import { UserStatementComponent } from './user-statement/user-statement.component';
import { ApplicantSidebarComponent } from './applicant-sidebar/applicant-sidebar.component';
import { PaymentsComponent } from './payment-summary/payment-summary.component';
import { AuthGuard } from './services/auth-guard.service';
import { ProfileComponent } from './profile/profile.component';
import { AccountsComponent } from './accounts/accounts.component';
import { TransactionsComponent } from './transactions/transactions.component';

// -------------------- Placeholder Components --------------------
@Component({
  selector: 'app-overview',
  template: `
    <div class="card p-3">
      <h5>Overview</h5>
      <p>Welcome to your dashboard overview.</p>
    </div>
  `
})
export class OverviewComponent {}

@Component({
  selector: 'app-dashboard-settings',
  template: `
    <div class="card p-3">
      <h5>Settings</h5>
      <p>Manage your preferences here.</p>
    </div>
  `
})
export class DashboardSettingsComponent {}

// -------------------- Application Routes --------------------
const routes: Routes = [
  // 🔹 Default route
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // 🔹 Public routes (no AuthGuard)
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegistrationComponent },
  { path: 'unauthorized', component: UnauthorizedComponent },

  // 🔹 Protected routes (require AuthGuard)
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'data-manager-dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'admin-approvals', component: AdminApprovalsComponent, canActivate: [AuthGuard] },
  { path: 'account-registration', component: AccountRegistrationComponent, canActivate: [AuthGuard] },
  { path: 'repayment-form', component: RepaymentFormComponent, canActivate: [AuthGuard] },
  { path: 'statement', component: UserStatementComponent, canActivate: [AuthGuard] },
  { path: 'debtloans', component: DebtloansComponent, canActivate: [AuthGuard] },
  { path: 'payments', component: PaymentsComponent, canActivate: [AuthGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [AuthGuard] },
  { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
  { path: 'loans', component: LoanListComponent, canActivate: [AuthGuard] },
  { path: 'user-profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'accounts', component: AccountsComponent },
  {path: 'transactions',component:TransactionsComponent, canActivate: [AuthGuard] },

  {
  path: 'admin/profile',
  component: ProfileComponent,
  data: { role: 'ADMIN' }
},
{
  path: 'applicant/profile',
  component: ProfileComponent,
  data: { role: 'APPLICANT' }
},



  // 🔹 Applicant Dashboard with children
  {
    path: 'applicant-dashboard',
    component: ApplicantDashboardComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'overview', component: OverviewComponent },
      { path: 'debtloans', component: DebtloansComponent },
      { path: 'settings', component: DashboardSettingsComponent },
      { path: '', redirectTo: 'overview', pathMatch: 'full' }
    ]
  },

  // 🔹 Utility routes
  { path: 'applicant-sidebar', component: ApplicantSidebarComponent, canActivate: [AuthGuard] },

  // 🔹 Wildcard route for undefined paths
  { path: '**', redirectTo: 'unauthorized' }
];

@NgModule({
  declarations: [OverviewComponent, DashboardSettingsComponent],
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
