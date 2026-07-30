export interface Account {
  id: number;
  accountNumber: string;
  nationalId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  balance: number;
  createdAt: string;
   modeOfOperation: string;
  imageUrl?: string | null;
}

export interface County {
    id: number;
    name: string;
}

export interface Town {
    id: number;
    countyId: number;
    name: string;
}