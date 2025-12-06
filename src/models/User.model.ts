export interface Account {
  id: number;
  accountNumber: string;
  // Add any other fields returned in the account object
}

export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: number;
  location: string;
  account: Account; // nested account object
}
