import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import {
  GOOGLE_LOGIN_ENDPOINT,
  LOGIN_ENDPOINT,
} from "./constant/api-endpoints";
import { AuthResponse } from "./types/users";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
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
            }),
          });

          const data = await response.json();

          if (data.status === "success") {
            const user = data.user;

            return {
              id: String(user.id),
              name: user.name,
              email: user.email,
              image: user.image || null,
              token: data.token,
              role: user.roleUser[0].role.name,
              roleDetails: user.roleUser[0].role,
              permissions: user.permissionUser || [],
            };
          } else {
            throw new Error(data.message || "Authentication failed");
          }
        } catch (error) {
          console.error("Error during login:", error);
          throw new Error("Authentication failed");
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
      // En login por Google
      if (account?.provider === "google") {
        // Llama a tu backend (el Server Action `googleLogin` que te proporcioné)
        const res = await fetch(`${GOOGLE_LOGIN_ENDPOINT}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: account.id_token }),
        });

        const data: AuthResponse = await res.json(); // Espera la estructura AuthResponse de tu backend
        console.log(
          "🚀 ~ Respuesta de tu backend (GOOGLE_LOGIN_ENDPOINT):",
          data
        ); // ¡Verifica esta salida!

        if (res.ok && data.token && data.user) {
          // Mapea los datos de tu AuthResponse del backend al token JWT de NextAuth
          token.id = data.user.id;
          token.name = data.user.name;
          token.email = data.user.email;
          token.image = data.user.image || null;
          token.accessToken = data.token; // <-- ¡CORREGIDO! Tu token personalizado está en data.token
          token.role = data.user.role;
          // token.roleDetails = data.user.roleDetails; // Si tu backend lo devuelve, asegúrate de que AuthResponse lo incluya
          token.permissions = data.user.permissions;
        } else {
          // Maneja errores del backend o si la respuesta no tiene la estructura esperada
          console.error(
            "Fallo al validar cuenta de Google en backend:",
            data?.error || "Respuesta inesperada"
          );
          throw new Error(
            data.error || "Fallo al validar cuenta de Google en backend"
          );
        }
      } else if (user) {
        // Este bloque se ejecuta para el login con CredentialsProvider
        // El objeto 'user' ya contiene los datos personalizados del 'authorize' callback
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image || null;
        token.accessToken = user.token; // El token personalizado ya viene en user.token
        token.role = user.role;
        token.roleDetails = user.roleDetails; // Asumiendo que CredentialsProvider's authorize devuelve esto
        token.permissions = user.permissions;
      }

      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      // Mapea los datos del token JWT a la sesión del usuario
      if (session.user) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.image || null;
        session.user.accessToken = token.accessToken;
        session.user.role = token.role;
        session.user.roleDetails = token.roleDetails; // Asegúrate de que esto se mapee desde el token si lo necesitas
        session.user.permissions = token.permissions;
      }
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt", // ahora sí lo acepta como literal correcto
    maxAge: 7 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 24 horas también aquí
  },
  // Ensure you have this in your .env file
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
