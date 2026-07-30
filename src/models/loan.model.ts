import { LoanTransaction } from "./loan-transaction.model";


// models/notification.model.ts

export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  referenceId?: number;
  priority: NotificationPriority;
  read: boolean;
  createdAt: string;
}

export interface Repayment {
  date: string; // or Date
  amount: number;
  method: string;
}

export interface Loan {
  id: number;
  applicantName: string;
  nationalId: string | null;
  phoneNumber: number | null;
  location: string;
  amount: number;

rejectedByName?: string;
// OR rejectedBy?: string if you keep the Java name

rejectedByRole?: string;

rejectedAt?: string | Date;

  totalRepayableAmount?: number;
  amountPaid?: number;
  interestRate?: number;
  penaltyRate?: number;

  duration: string;
  status?: string;

  applicationDate: Date | string;
  dueDate?: Date | string;

  userImageUrl?: string;

  // ✅ FROM BACKEND (FIXED)
  income?: number;
  expenses?: number;

  accountNumber?: string;
  dueAmount?: number;
  rejectionReason?: string;

  loanType?: string;
  remainingDue?: number;

  email?: string;

  createdAt?: string; 

  repayments?: LoanTransaction[];
  transactions?: LoanTransaction[];

  accountBalance?: number;

  principalAmount?: number;
  interestAmount?: number;
  penaltyAmount?: number;


  assignedStaff?: {
    name: string;
    phone: string;
    email: string;
  };


  account?: {
  id: number;
  nationalId?: string;
  email?: string;
  monthlyIncome?: number;
  monthlyExpenses?: number;
};

}




