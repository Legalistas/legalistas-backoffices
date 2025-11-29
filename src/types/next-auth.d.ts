import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      accessToken: string;
      role: string;
      roleDetails?: {
        id: number;
        name: string;
        displayName: string;
        description: string | null;
        createdAt: string;
        updatedAt: string;
      };
      permissions: string[];
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    accessToken: string;
    role: string;
    roleDetails?: {
      id: number;
      name: string;
      displayName: string;
      description: string | null;
      createdAt: string;
      updatedAt: string;
    };
    permissions: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    accessToken: string;
    role: string;
    roleDetails?: {
      id: number;
      name: string;
      displayName: string;
      description: string | null;
      createdAt: string;
      updatedAt: string;
    };
    permissions: string[];
  }
}
