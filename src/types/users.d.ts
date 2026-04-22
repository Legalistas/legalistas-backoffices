export interface User {
	id: number;
	name: string;
	email: string;
	image: string;
	role: number;
	createdAt: Date;
	isBlocked?: boolean;
	userProfile: Profile;
	userAddresses: Addresses[];
	roleUser: RoleUser[];
	Transaction: Transaction[];
	transaction: Transaction[];
	employment?: Employment | null;
}

export interface Employment {
	id: number;
	userId: number;
	cuil: string | null;
	hireDate: string | null;
	terminationDate: string | null;
	position: string | null;
	area: string | null;
	collectiveAgreement: string | null;
	healthInsurance: string | null;
	artProvider: string | null;
	baseSalary: string | null;
	status: "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";
	createdAt: string;
	updatedAt: string;
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
	cp: string | null;
	street: string | null;
	streetNumber: string;
	description: string;
	isDefault: boolean;
	country: {
		id: number;
		name: string;
		prefix: string;
		code: string;
		isActive: boolean;
		createdAt: string;
		updatedAt: string;
	};
	state: {
		id: number;
		countryId: number;
		name: string;
		isActive: boolean;
		createdAt: string;
		updatedAt: string;
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
