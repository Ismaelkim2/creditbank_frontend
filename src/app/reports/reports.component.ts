import { Component, OnInit } from '@angular/core';
import { ReportService } from '../services/report.service';
import * as XLSX from 'xlsx';
import { Router } from '@angular/router';
import { DataServiceService } from '../services/data.service';
import { LoanService } from '../services/loan.service';
import { RepaymentService } from '../services/repayment.service';

@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  selectedReport: string = 'loanApplications';
  reportData: Array<{ [key: string]: any }> = [];
  filteredReportData: Array<{ [key: string]: any }> = [];

  kpis: any[] = [
    { label: 'Total Loans', value: 0, icon: 'fa fa-credit-card' },
    { label: 'Overdue Loans', value: 0, icon: 'fa fa-exclamation-circle' },
    { label: 'Repayments', value: 0, icon: 'fa fa-money-bill-wave' },
    { label: 'Revenue', value: 0, icon: 'fa fa-coins' },
  ];

  isLoading: boolean = false;
  startDate: string = '';
  endDate: string = '';
  filterStatus: string = 'all';

  constructor(
    private reportService: ReportService,
    private router: Router,
    private repaymentService: RepaymentService,
    private dataService: DataServiceService,
    private loanService: LoanService,
  ) {}

  ngOnInit(): void {
    this.loadKPIs();
    this.fetchReport();
  }

  toNumber(value: unknown): number {
  if (value == null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}


  fetchReport(): void {
    this.isLoading = true;

    this.reportService.getReport(this.selectedReport, this.startDate, this.endDate).subscribe({
      next: (data) => {
        this.reportData = data;
        this.isLoading = false;

        // Apply filter if report type is 'repayments' or 'overdues'
        if (this.selectedReport === 'repayments' || this.selectedReport === 'overdues') {
          this.filterReportByStatus(this.filterStatus);
        } else {
          this.filteredReportData = this.reportData;
        }

        // Update KPI for Overdue Loans dynamically
        this.updateKPIsForSelectedReport();
      },
      error: (error) => {
        console.error("Failed to fetch report", error);
        this.reportData = [];
        this.filteredReportData = [];
        this.isLoading = false;
      }
    });
  }

  filterReportByStatus(status: string): void {
    this.filterStatus = status;

    if (status === 'all') {
      this.filteredReportData = this.reportData;
    } else {
      this.filteredReportData = this.reportData.filter(row => {
        const rowStatus = row['status']?.toLowerCase() || '';
        if (status === 'partial') {
          return rowStatus.includes('partial');
        } else {
          return rowStatus === status;
        }
      });
    }
  }

  clearWithBalance(row: any): void {
    const repaymentData = {
      loanId: row['id'] || row['loanId'] || row['loan_id'] || null,
      applicantName: row['applicantName'] || row['name'],
      phoneNumber: row['phoneNumber']?.toString() || '',
      idNo: row['idNo'] || '',
      location: row['location'] || '',
      amount: row['amount'],
      totalRepayableAmount: row['totalRepayableAmount'],
      amountPaid: row['amountPaid'] || 0,
      balance: row['totalRepayableAmount'] - (row['amountPaid'] || 0),
      repaymentDate: new Date().toISOString().split('T')[0]
    };

    if (!repaymentData.loanId && !repaymentData.phoneNumber && !repaymentData.idNo) {
      alert('⚠️ Missing identifiers — cannot fetch loan details.');
      return;
    }

    this.dataService.setRepaymentData(repaymentData);
    this.router.navigate(['/repayment-form']);
  }

  loadKPIs() {
    this.loanService.getLoans().subscribe(loans => {
      // Total Loans
      const totalLoans = loans.reduce((sum, loan) => sum + (loan.amount ?? 0), 0);
      this.updateKPI('Total Loans', totalLoans);

      // Overdue Loans
      const overdue = loans
        .filter(loan => loan?.status?.toLowerCase() === 'overdue')
        .reduce((sum, loan) => sum + (loan.dueAmount ?? loan.amount ?? 0), 0);
      this.updateKPI('Overdue Loans', overdue);
    });

    this.repaymentService.getAllRepayments().subscribe(repayments => {
      const totalRepayments = repayments.reduce((sum, r) => sum + (r.amountPaid ?? 0), 0);
      this.updateKPI('Repayments', totalRepayments);

      // Revenue (10% interest example)
      const revenue = totalRepayments * 0.1;
      this.updateKPI('Revenue', revenue);
    });
  }

  updateKPI(label: string, value: number) {
    const kpi = this.kpis.find(k => k.label === label);
    if (kpi) kpi.value = value;
  }

  updateKPIsForSelectedReport() {
    if (this.selectedReport === 'overdues') {
      // Sum only overdue loans from filtered data
      const overdue = this.reportData
        .filter(loan => loan?.['status']?.toLowerCase() === 'overdue')
        .reduce((sum, loan) => sum + (loan?.['dueAmount'] ?? loan?.['amount'] ?? 0), 0);
      this.updateKPI('Overdue Loans', overdue);
    }
    // You can add similar logic for other reports if needed
  }

  exportToExcel(): void {
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(this.filteredReportData);
    const workbook: XLSX.WorkBook = {
      Sheets: { data: worksheet },
      SheetNames: ['data']
    };
    XLSX.writeFile(workbook, `${this.selectedReport}_report.xlsx`);
  }
}
