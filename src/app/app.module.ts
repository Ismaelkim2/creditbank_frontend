import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common'; 
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
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
import { MainDashboardComponent } from './main-dashboard/main-dashboard.component';
import { CustomerInfoComponent } from './customer-info/customer-info.component';
import { TenantPropertyRegistrationComponent } from './tenant-property-registration/tenant-property-registration.component';
import { TenantRegistrationComponent } from './tenant-registration/tenant-registration.component';
import { TenantUnitManagementComponent } from './tenant-unit-management/tenant-unit-management.component';
import { TenantLeaseManagementComponent } from './tenant-lease-management/tenant-lease-management.component';
import { TenantRentManagementComponent } from './tenant-rent-management/tenant-rent-management.component';
import { TenantDirectoryComponent } from './tenant-directory/tenant-directory.component';
import { TenantRemindersComponent } from './tenant-reminders/tenant-reminders.component';
import { TenantAgentDashboardComponent } from './tenant-agent-dashboard/tenant-agent-dashboard.component';
import { TenantCalendarComponent } from './tenant-calendar/tenant-calendar.component';
import { TenantPortfolioActivityComponent } from './tenant-portfolio-activity/tenant-portfolio-activity.component';

@NgModule({
  declarations: [
    AppComponent,
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
    AuthLayoutComponent,
    MainDashboardComponent,
    CustomerInfoComponent,
    TenantPropertyRegistrationComponent,
    TenantRegistrationComponent,
    TenantUnitManagementComponent,
    TenantLeaseManagementComponent,
    TenantRentManagementComponent,
    TenantDirectoryComponent,
    TenantRemindersComponent,
    TenantAgentDashboardComponent,
    TenantCalendarComponent,
    TenantPortfolioActivityComponent
  
    
  

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
