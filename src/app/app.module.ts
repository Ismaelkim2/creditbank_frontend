import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common'; 

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { LoanListComponent } from './loan-list/loan-list.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ReportsComponent } from './reports/reports.component';
import { SettingsComponent } from './settings/settings.component';
import { LoginComponent } from './login/login.component';
import { RegistrationComponent } from './registration/registration.component';
import { RepaymentFormComponent } from './repayment-form/repayment-form.component';
import { UnauthorizedComponent } from './unauthorized/unauthorized.component';
import { ApplicantDashboardComponent } from './applicant-dashboard/applicant-dashboard.component';
import { AccountRegistrationComponent } from './account-registration/account-registration.component';
import { DebtloansComponent } from './debtloans/debtloans.component';
import { UserStatementComponent } from './user-statement/user-statement.component';
import { ApplicantSidebarComponent } from './applicant-sidebar/applicant-sidebar.component';
import { PaymentsComponent } from './payment-summary/payment-summary.component';
import { ProfileComponent } from './profile/profile.component';
import { AccountsComponent } from './accounts/accounts.component';
import { TokenInterceptor } from './services/token.interceptor';
import { TransactionsComponent } from './transactions/transactions.component';
import { LoanApplicationComponent } from './loan-application/loan-application.component';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { LayoutComponent } from './layout/layout.component';
import { CustomerDetailsComponent } from './customer-details/customer-details.component';
import { AssignStaffComponent } from './assign-staff/assign-staff.component';
import { AdminApprovalsComponent } from './admin-approvals/admin-approvals.component';
import { StaffComponent } from './staff/staff.component';
import { TopNavComponent } from './top-nav/top-nav.component';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { AuthLayoutComponent } from './auth-layout/auth-layout.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    LoanListComponent,
    SidebarComponent,
    ReportsComponent,
    SettingsComponent,
    TopNavComponent,
    LoginComponent,
    RegistrationComponent,
    RepaymentFormComponent,
    UnauthorizedComponent,
    AdminApprovalsComponent,
    ApplicantDashboardComponent,
    AccountRegistrationComponent,
    DebtloansComponent,
    UserStatementComponent,
    ApplicantSidebarComponent,
    PaymentsComponent,
    ProfileComponent,
    AccountsComponent,
    StaffComponent,
    TransactionsComponent,
    LoanApplicationComponent,
    MainLayoutComponent,
    CustomerDetailsComponent,
    LayoutComponent,
    AssignStaffComponent,
    ForgotPasswordComponent,
    AuthLayoutComponent

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    ReactiveFormsModule
  ],
  providers: [
    provideClientHydration(),
    DecimalPipe,
    DatePipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: TokenInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
