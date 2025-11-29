export interface User {
  id: number;
  name: string;
  email: string;
  image: string;
  role: number;
  createdAt: Date;
  userProfile: Profile;
  userAddresses: Addresses[];
  roleUser: RoleUser[];
  Transaction: Transaction[];
  transaction: Transaction[];
}

export interface Profile {
  id: number;
  userId: number;
  docType: number;
  docNumber: string;
  gender: number;
  birthDate: Date;
  phone: string;
}

export interface Addresses {
  id: number;
  userId: number;
  countryId: number;
  stateId: number;
  city: string;
  cp: string;
  street: string;
  streetNumber: string;
  description: string;
  isDefault: boolean;
  state: {
    id: number;
    name: string;
    countryId: number;
    country: {
      id: number;
      name: string;
      code: string;
      phoneCode: string;
    };
  };
}

export interface RoleUser {
  id: number;
  userId: number;
  roleId: number;
  role: {
    id: number;
    name: string;
    displayName: string;
    description: string;
  };
}


export interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string | null;
    role: string;
    permissions: string[];
    image?: string;
  };
  error?: string; // Added for consistent error handling
}
