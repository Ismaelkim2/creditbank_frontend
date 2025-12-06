export interface Loan {
  id: number;
  applicantName: string;
  idNo: number | null;
  phoneNumber: number | null;
  location: string;
  amount: number;
  totalRepayableAmount?: number;
  amountPaid?: number;  // ✅ Add this line
  interestRate?: number;
  penaltyRate?: number;
  duration: string;
  status?: string;
  applicationDate: Date | string;
  dueDate?: Date | string;
  userImageUrl?: string;
  income: number;
  expenses: number;
 accountNumber?: string;
   dueAmount?: number;

    loanType?: string;        // ✅ add this
  remainingDue?: number;    // ✅ add this
  [key: string]: any;
}
