export interface Account {
  id: number;
  accountNumber: string;
  nationalId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  balance: number;
  createdAt: string; // can be string if returned as ISO date
   image?: Uint8Array | null; 
}
