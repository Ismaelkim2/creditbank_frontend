export interface Notification {

  id: number;

  loanId?: number;

  title: string;

  message: string;

  type: string;

  recipient?: string;

  read: boolean;

  createdAt: string;

}