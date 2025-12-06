import { Component, OnInit } from '@angular/core';
import { Loan } from '../../models/loan.model';
import { LoanService } from '../services/loan.service';
import { HttpClient } from '@angular/common/http';
import { MpesaService } from '../services/mpesa.service';
import { Chart, registerables } from 'chart.js';
import { AuthService } from '../services/auth-service.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  loans: Loan[] = [];
  totalLoans = 0;
  totalApproved = 0;
  totalPending = 0;
  totalRejected = 0;
  totalPartial = 0;
  totalLoansAmount: number = 0;

  userRole: string = '';

  topApplicants: { name: string, total: number }[] = [];
repaymentStats = {
  totalDisbursed: 0,
  totalRepaid: 0,
  outstanding: 0
};


  balance: number | null = null;
  errorMessage: string = '';

  constructor(
    private loanService: LoanService,
    private http: HttpClient,
    private mpesaService: MpesaService,
    private authService: AuthService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.userRole = this.authService.getRole(); 
    
    this.loanService.getLoans().subscribe(loans => {
      this.loans = loans.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
      this.calculateStats();
      this.renderLoanStatusChart();
      this.renderLoanTrendChart();
    });

    this.mpesaService.getBalance().subscribe(
      (response: any) => {
        this.balance = this.parseBalance(response);
      },
      error => {
        console.error(error);
        this.balance = null;
        this.errorMessage = 'Error fetching balance';
      }
    );
  }

  parseBalance(response: string): number {
    const match = response.match(/KES\s?([\d,]+\.\d{2})/);
    return match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  }

 calculateStats() {
  this.totalLoans = this.loans.length;
  this.totalApproved = this.loans.filter(l => l.status?.toLowerCase() === 'approved').length;
  this.totalPending = this.loans.filter(l => l.status?.toLowerCase() === 'pending').length;
  this.totalRejected = this.loans.filter(l => l.status?.toLowerCase() === 'rejected').length;
  this.totalPartial = this.loans.filter(l => l.status?.toLowerCase() === 'partial').length;
  this.totalLoansAmount = this.loans.reduce((sum, loan) => sum + loan.amount, 0);

  // Top 5 applicants
  const applicantTotals: { [name: string]: number } = {};
  this.loans.forEach(loan => {
    applicantTotals[loan.applicantName] = (applicantTotals[loan.applicantName] || 0) + loan.amount;
  });

  this.topApplicants = Object.entries(applicantTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Repayment stats
  this.repaymentStats.totalDisbursed = this.totalLoansAmount;
  this.repaymentStats.totalRepaid = this.loans.reduce((sum, l) => sum + (l.amountPaid || 0), 0);
  this.repaymentStats.outstanding = this.repaymentStats.totalDisbursed - this.repaymentStats.totalRepaid;
}


  renderRepaymentChart() {
  const repaid = this.repaymentStats.totalRepaid;
  const outstanding = this.repaymentStats.outstanding;

  new Chart("repaymentChart", {
    type: 'bar',
    data: {
      labels: ['Repaid', 'Outstanding'],
      datasets: [{
        label: 'KES',
        data: [repaid, outstanding],
        backgroundColor: ['#28a745', '#dc3545']
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          ticks: {
            callback: (value) => `KES ${value}`
          }
        }
      }
    }
  });
}


  renderLoanStatusChart() {
    new Chart("loanStatusChart", {
      type: 'doughnut',
      data: {
        labels: ['Approved', 'Pending', 'Rejected', 'Partial'],
        datasets: [{
          data: [
            this.totalApproved,
            this.totalPending,
            this.totalRejected,
            this.totalPartial
          ],
          backgroundColor: ['#28a745', '#ffc107', '#dc3545', '#17a2b8']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  renderLoanTrendChart() {
    const monthlyTotals = this.getMonthlyLoanData();

    new Chart("loanTrendChart", {
      type: 'line',
      data: {
        labels: monthlyTotals.map(m => m.month),
        datasets: [{
          label: 'Loan Disbursements (KES)',
          data: monthlyTotals.map(m => m.total),
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.2)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            ticks: {
              callback: (value) => `KES ${value}`
            }
          }
        }
      }
    });
  }

  // 📊 Monthly aggregation from loans
  getMonthlyLoanData(): { month: string, total: number }[] {
    const monthlyMap: { [key: string]: number } = {};

    this.loans.forEach(loan => {
      const date = new Date(loan.applicationDate);
      const key = date.toLocaleString('default', { month: 'short', year: 'numeric' }); // e.g., "Jan 2025"
      monthlyMap[key] = (monthlyMap[key] || 0) + loan.amount;
    });

    // Return sorted by month
    return Object.entries(monthlyMap)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, total]) => ({ month, total }));
  }
}
