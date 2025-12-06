import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Repayment {
  id: number;
  loanId: number;
  amountPaid: number;
  repaymentDate: string;
  phoneNumber?: string;
  applicantName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RepaymentService {
  private baseUrl = 'http://localhost:8080/api/repayments';

  constructor(private http: HttpClient) {}

  // ✅ Fetch all repayments for KPI calculations
  getAllRepayments(): Observable<Repayment[]> {
    return this.http.get<Repayment[]>(this.baseUrl + '/all'); // backend endpoint
  }

  // ✅ Save a repayment (used in your form)
  saveRepayment(repayment: Partial<Repayment>): Observable<any> {
    return this.http.post(this.baseUrl, repayment);
  }

  // ✅ Fetch repayment by loan ID
  getRepaymentsByLoanId(loanId: number): Observable<Repayment[]> {
    return this.http.get<Repayment[]>(`${this.baseUrl}/by-loan/${loanId}`);
  }

  // ✅ Attach live due amount to loan (optional)
  attachLiveDueAmount(loan: any): any {
    if (!loan) return loan;
    loan.dueAmount = (loan.totalRepayableAmount || 0) - (loan.amountPaid || 0);
    return loan;
  }
}
