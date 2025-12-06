import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DataServiceService {
  private repaymentData: any;

  setRepaymentData(data: any): void {
    this.repaymentData = data;
  }

  getRepaymentData(): any {
    return this.repaymentData;
  }
}
