import { Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { Loan } from '../../models/loan.model';
import { HttpClient } from '@angular/common/http';
import { LoanSetting } from './settings.service';
import { Account, User } from '../../models/User.model';


@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private baseUrl = 'http://localhost:8080/api/loans';
  private settingsUrl = 'http://localhost:8080/api/settings';
  private apiUrl = 'http://localhost:8080/api'; // ✅ Added for general endpoints

  constructor(private http: HttpClient) {}

  // 🚩 LOAN MANAGEMENT METHODS

  getLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(this.baseUrl);
  }

  getLoanDetailsByNationalId(nationalId: string): Observable<Loan[]> {
  return this.http.get<Loan[]>(`${this.baseUrl}/by-idno/${nationalId}`);
}


  getLoanSettings(): Observable<LoanSetting[]> {
    return this.http.get<LoanSetting[]>(`${this.settingsUrl}/loan`);
  }

  getSettingsByDuration(weeks: number): Observable<LoanSetting> {
    return this.http.get<LoanSetting>(`${this.settingsUrl}/duration/${weeks}`);
  }

  getTotalRepayable(amount: number, duration: number): Observable<number> {
    if (!amount || !duration) return of(0);
    return new Observable<number>((observer) => {
      this.getSettingsByDuration(duration).subscribe({
        next: (settings) => {
          const interest = (settings.interestRate / 100) * amount;
          const total = amount + interest;
          observer.next(total);
          observer.complete();
        },
        error: (err) => {
          console.error('Error fetching loan settings:', err);
          observer.error(err);
        }
      });
    });
  }

  addLoan(loan: Loan): Observable<Loan> {
    return this.http.post<Loan>(this.baseUrl, loan);
  }

  updateLoan(loan: Loan): Observable<any> {
    return this.http.put(`${this.baseUrl}/${loan.id}`, loan);
  }

  deleteLoan(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

  updateLoanStatus(id: number, status: 'approved' | 'rejected'): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/status`, { status });
  }


getLoanTransactions(loanId: number) {
  return this.http.get<{date: string, amount: number, method: string}[]>(`/api/loans/${loanId}/transactions`);
}

checkLoanStatus(idNo: number) {
  return this.http.get<any>(`${this.baseUrl}/check-loan-status/${idNo}`);
}



// loan.service.ts
sendReminder(loanId: number) {
  return this.http.post(`http://localhost:8080/api/loans/send-reminder/${loanId}`, {});
}



  // 📦 IMAGE-BASED METHODS

  updateLoanWithImage(id: number, formData: FormData): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/update-with-image`, formData);
  }

  // 🧠 ELIGIBILITY & STATUS CHECKS

 assessEligibility(data: any): Observable<any> {
  return this.http.post<any>(`${this.apiUrl}/loan-decision/assess`, data);
}


  checkActiveLoanByIdNo(idNo: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/has-active-loan/${idNo}`);
  }

// loan.service.ts
assessEligibilityAndLimits(nationalId: string, currentBalance: number) {
  const payload = {
    nationalId: Number(nationalId),
    currentBalance
  };
  return this.http.post<any>(`${this.apiUrl}/loan-decision/assess`, payload).pipe(
    map((res: any) => {
      const activeLoan = res.activeLoan || null;
      const hasOverdue = activeLoan && activeLoan.dueAmount > 0;
      const eligibleAmount = hasOverdue ? 0 : currentBalance * 0.3;
      return { eligibleAmount, activeLoan };
    })
  );
}

getLoansByIdNo(nationalId: string): Observable<Loan[]> {
  return this.http.get<Loan[]>(`${this.baseUrl}/by-idno/${nationalId}`);
}


addLoanWithImage(formData: FormData): Observable<Loan> {
  return this.http.post<Loan>(`${this.baseUrl}/add-with-image`, formData);
}


  refundLoan(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${id}/refund`, {});
  }

  // 👤 USER INFORMATION
getAccountById(nationalId: string): Observable<Account> {
    return this.http.get<Account>(`${this.baseUrl}/by-id/${nationalId}`);
  }
  

initiateMpesaStkPush(phoneNumber: string, amount: number | string) {
  const payload = {
    phoneNumber,
    amount: amount.toString()
  };
  return this.http.post(`${this.apiUrl}/mpesa/stkpush`, payload);
}



}
