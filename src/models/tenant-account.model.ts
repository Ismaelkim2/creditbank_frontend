export interface TenantAccountSummary {
  leaseId: number;
  leaseReference: string;
  tenantName: string;
  totalRentCharged: number;
  totalValidPayments: number;
  totalOutstanding: number;
  overdueArrears: number;
  availableCredit: number;
  netAccountPosition: number;
   nextRentDueDate: string | null;
  propertyName: string;
  unitName: string;
  tenantImageUrl?: string | null;
}

export interface TenantRentStatementTransaction {
  date: string;
  type: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface TenantRentStatement {
  leaseId: number;
  leaseReference: string;
  tenantName: string;
  from: string;
  to: string;
  openingBalance: number;
  totalCharges: number;
  totalPayments: number;
  totalReversals: number;
  closingBalance: number;
  transactions: TenantRentStatementTransaction[];
}