// LoanAssessmentResponse.ts

export interface LoanAssessmentResponse {

  riskScore: number;
  behavioralScore: number;
  kycScore: number;
  fraudFlag: boolean;

  daysPastDue: number;
  completedLoans: number;
  overdueLoans: number;

  parCategory: string;
  predictiveRisk: string;

  eligibleAmount: number;

  recommendation: string;
  aiReason: string;
  aiConfidence: number;
}