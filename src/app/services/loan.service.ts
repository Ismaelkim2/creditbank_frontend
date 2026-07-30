import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map, BehaviorSubject, tap } from 'rxjs';
import { Loan } from '../../models/loan.model';
import { Account } from '../../models/User.model';
import { LoanAssessmentResponse } from '../../models/LoanAssessmentResponse';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  private baseUrl = 'http://localhost:8080/api/loans';
  private settingsUrl = 'http://localhost:8080/api/settings';
  private apiUrl = 'http://localhost:8080/api';

  constructor(private http: HttpClient) {}

  // ===============================
  // CORE LOAN FETCH
  // ===============================

  private portfolioSubject = new BehaviorSubject<number>(0);
portfolio$ = this.portfolioSubject.asObservable();

getLoans(): Observable<Loan[]> {
  return this.http.get<Loan[]>(this.baseUrl).pipe(

    tap(loans => {

      const total = (loans || []).reduce(
        (sum, l) => sum + (l.amount || 0),
        0
      );

      this.portfolioSubject.next(total);

    })

  );
}

createStaff(data: any) {
  return this.http.post(
    `${this.baseUrl}/staff`,
    data
  );
}

  getLoansByPhone(phone: string): Observable<Loan[]> {
  return this.http.get<Loan[]>(
    `${this.baseUrl}/by-phone/${phone}`
  );
}

 getLoansByIdNo(idNo: string): Observable<Loan[]> {
  return this.http.get<Loan[]>(
    `${this.baseUrl}/by-nationalId/${idNo}`
  );
}


  getLoanTransactions(loanId: number) {
    return this.http.get<any[]>(`${this.baseUrl}/${loanId}/transactions`);
  }

  // ===============================
  // APPLICANT AUTO LOAD
  // ===============================

  checkLoanStatus(idNo: string) {
    return this.http.get<any>(`${this.baseUrl}/check-loan-status/${idNo}`);
  }

  // ===============================
  // CREATE / UPDATE
  // ===============================

  addLoanWithImage(formData: FormData): Observable<Loan> {
    return this.http.post<Loan>(`${this.baseUrl}/add-with-image`, formData);
  }

  updateLoanWithImage(id: number, formData: FormData) {
    return this.http.put(`${this.baseUrl}/${id}/update-with-image`, formData);
  }

  deleteLoan(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }

 approveLoan(id: number): Observable<Loan> {
  return this.http.patch<Loan>(
    `${this.baseUrl}/${id}/approve`,
    {}
  );
}

rejectLoanWithReason(
  id: number,
  reason: string
): Observable<Loan> {

  return this.http.patch<Loan>(
    `${this.baseUrl}/${id}/reject`,
    { reason }
  );

}

  refundLoan(id: number) {
    return this.http.post(`${this.baseUrl}/${id}/refund`, {});
  }

  // ===============================
  // REPAYMENTS
  // ===============================

// ================= REPAYMENTS =================
// ================= REPAYMENTS =================
processRepayment(
  loanId: number,
  amountPaid: number,
  accountNumber: string,
  phoneNumber: string
) {

  const payload = {
    loanId,
    amountPaid,
    accountNumber,
    phoneNumber
  };

  return this.http.post<any>(
    `${this.apiUrl}/repayments`,
    payload
  );
}

  sendReminder(loanId: number) {
    return this.http.post(`${this.baseUrl}/send-reminder/${loanId}`, {});
  }

  initiateMpesaStkPush(phoneNumber: string, amount: number) {
    return this.http.post(`${this.apiUrl}/mpesa/stkpush`, {
      phoneNumber,
      amount
    });
  }

  assessEligibilityAndLimits(nationalId: string, balance: number): Observable<{ eligibleAmount: number, activeLoan?: Loan | null }> {
  const payload = { nationalId, balance };
  return this.http.post<any>(`${this.apiUrl}/loan-decision/assess`, payload).pipe(
    map((res: any) => {
      const activeLoan: Loan | null = res.activeLoan || null;
      const eligibleAmount = res.hasOverdue ? 0 : balance * 0.3; // Example logic
      return { eligibleAmount, activeLoan };
    })
  );
}

/**
 * Add a new loan
 */
addLoan(payload: any): Observable<Loan> {
  return this.http.post<Loan>(`${this.baseUrl}`, payload);
}


getAllStaff() {
  return this.http.get<any[]>(`${this.baseUrl}/staff`);
}

getLoanById(loanId: number) {
  return this.http.get<any>(`${this.baseUrl}/${loanId}`);
}

assignStaffToLoan(loanId: number, staffId: number) {
  return this.http.put(
    `${this.baseUrl}/${loanId}/assign-staff/${staffId}`,
    {}
  );
}

getRepaymentStatus(ref: string) {
  return this.http.get<any>(`${this.apiUrl}/repayments/status/${ref}`);
}

// ================= APPLICANT =================
fetchApplicantById(nationalId: string): Observable<any> {
  return this.http.get<any>(`${this.apiUrl}/accounts/by-id/${nationalId}`);
}

// FIXED
getLoanDetailsByNationalId(nationalId: string): Observable<Loan[]> {
  return this.http.get<Loan[]>(`${this.baseUrl}/by-nationalId/${nationalId}`);
}

getCreditIntelligenceByNationalId(
  nationalId: string,
  body: any
): Observable<LoanAssessmentResponse> {

  return this.http.post<LoanAssessmentResponse>(
    `http://localhost:8080/api/credit-intelligence/analyze/${nationalId}`,
    body
  );
}

getCreditIntelligence(accountId: number, payload: any): Observable<any> {
  return this.http.post<any>(
    `${this.apiUrl}/credit-intelligence/analyze/${accountId}`,
    payload
  );
}


analyzeCreditBatch(
  requests: any[]
): Observable<LoanAssessmentResponse[]> {

  return this.http.post<LoanAssessmentResponse[]>(

    `${this.apiUrl}/credit-intelligence/analyze/batch`,

    requests

  );

}

}