import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import {
	GOOGLE_LOGIN_ENDPOINT,
	LOGIN_ENDPOINT,
} from "./constant/api-endpoints";
import type { AuthResponse } from "./types/users";

// Roles que NO pueden iniciar sesión en el panel
const BLOCKED_LOGIN_ROLES = [
	"cliente",
	"demandado",
	"interviniente_juicio",
	"abogado_contraparte",
	"reconociente",
	"oficiado",
];

export const authOptions: NextAuthOptions = {
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "text" },
				password: { label: "Password", type: "password" },
				userAgent: { label: "UserAgent", type: "text" },
			},
			async authorize(credentials): Promise<any | null> {
				if (!credentials?.email || !credentials?.password) {
					throw new Error("Email and password are required");
				}

				try {
					const response = await fetch(`${LOGIN_ENDPOINT}`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							email: credentials.email,
							password: credentials.password,
							userAgent: credentials.userAgent || "",
						}),
					});

					const data = await response.json();

					if (response.status === 403 || data.blocked === true) {
						throw new Error(
							data.message ||
								"Tu cuenta ha sido bloqueada. Contacta al administrador para más información.",
						);
					}

					if (!response.ok) {
						throw new Error(data.message || "Credenciales inválidas");
					}

					if (data.status === "success") {
						const user = data.user;
						const userRole = user.roleUser?.[0]?.role?.name;

						if (userRole && BLOCKED_LOGIN_ROLES.includes(userRole)) {
							throw new Error(
								"No tienes permisos para acceder al panel. Contacta al administrador.",
							);
						}

						return {
							id: String(user.id),
							name: user.name,
							email: user.email,
							image: user.image || null,
							token: data.token,
							role: userRole,
							roleDetails: user.roleUser[0].role,
							permissions: user.permissionUser || [],
							activityLogId: data.activityLogId || null,
						};
					} else {
						throw new Error(data.message || "Error de autenticación");
					}
				} catch (error) {
					console.error("Error during login:", error);
					if (error instanceof Error) {
						throw error;
					}
					throw new Error("Error de autenticación");
				}
			},
		}),
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
			authorization: {
				params: {
					scope:
						"openid email profile https://www.googleapis.com/auth/userinfo.profile",
					access_type: "offline",
					prompt: "consent",
				},
			},
		}),
	],
	callbacks: {
		async jwt({
			token,
			user,
			account,
		}: {
			token: any;
			user: any;
			account: any;
		}) {
			// Login por Google
			if (account?.provider === "google") {
				const res = await fetch(`${GOOGLE_LOGIN_ENDPOINT}`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						idToken: account.id_token,
					}),
				});

				const data: AuthResponse = await res.json();

				if (res.status === 403 || (data as any).blocked === true) {
					throw new Error(
						(data as any).message ||
							"Tu cuenta ha sido bloqueada. Contacta al administrador para más información.",
					);
				}

				if (res.ok && data.token && data.user) {
					const googleUser = data.user as any;
					const googleUserRole = googleUser.roleUser?.[0]?.role?.name;

					if (googleUserRole && BLOCKED_LOGIN_ROLES.includes(googleUserRole)) {
						throw new Error(
							"No tienes permisos para acceder al panel. Contacta al administrador.",
						);
					}

					token.id = googleUser.id;
					token.name = googleUser.name;
					token.email = googleUser.email;
					token.image = googleUser.image || null;
					token.accessToken = data.token;
					token.role = googleUser.roleUser?.[0]?.role?.name || null;
					token.roleDetails = googleUser.roleUser?.[0]?.role || null;
					token.permissions =
						googleUser.permissionUser?.map(
							(p: any) => p.perm?.name,
						) || [];
					token.activityLogId = (data as any).activityLogId || null;
				} else {
					console.error(
						"Fallo al validar cuenta de Google en backend:",
						data?.error || "Respuesta inesperada",
					);
					throw new Error(
						data.error ||
							"Fallo al validar cuenta de Google en backend",
					);
				}
			} else if (user) {
				// Login por Credentials
				token.id = user.id;
				token.name = user.name;
				token.email = user.email;
				token.image = user.image || null;
				token.accessToken = user.token;
				token.role = user.role;
				token.roleDetails = user.roleDetails;
				token.permissions = user.permissions;
				token.activityLogId = user.activityLogId || null;
			}

			return token;
		},
		async session({ session, token }: { session: any; token: any }) {
			if (session.user) {
				session.user.id = token.id;
				session.user.name = token.name;
				session.user.email = token.email;
				session.user.image = token.image || null;
				session.user.accessToken = token.accessToken;
				session.user.role = token.role;
				session.user.roleDetails = token.roleDetails;
				session.user.permissions = token.permissions;
				session.user.activityLogId = token.activityLogId;
			}
			return session;
		},
	},
	pages: {
		signIn: "/signin",
		error: "/signin",
	},
	session: {
		strategy: "jwt",
		maxAge: 7 * 24 * 60 * 60,
	},
	jwt: {
		maxAge: 7 * 24 * 60 * 60,
	},
	secret: process.env.NEXTAUTH_SECRET,
	debug: process.env.NODE_ENV === "development",
};
