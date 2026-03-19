"use client";

import { AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ErrorClient() {
	const searchParams = useSearchParams();
	const error = searchParams.get("error");

	const getErrorMessage = (errorCode: string) => {
		switch (errorCode) {
			case "AccessDenied":
				return "Acceso denegado. No tienes permiso para acceder a esta cuenta o recurso.";
			case "Configuration":
				return "Hay un problema con la configuración de autenticación.";
			case "Verification":
				return "El enlace de verificación ha expirado o ya ha sido utilizado.";
			case "OAuthSignin":
				return "Error al iniciar el proceso de autenticación con el proveedor.";
			case "OAuthCallback":
				return "Error al procesar la respuesta del proveedor de autenticación.";
			case "OAuthCreateAccount":
				return "No se pudo crear una cuenta vinculada al proveedor de autenticación.";
			case "EmailCreateAccount":
				return "No se pudo crear una cuenta usando el correo electrónico proporcionado.";
			case "Callback":
				return "Error durante el proceso de autenticación.";
			case "OAuthAccountNotLinked":
				return "Este correo ya está asociado a otra cuenta. Por favor inicia sesión con el método que usaste anteriormente.";
			case "EmailSignin":
				return "Error al enviar el correo de verificación.";
			case "CredentialsSignin":
				return "Las credenciales proporcionadas no son válidas.";
			case "SessionRequired":
				return "Se requiere iniciar sesión para acceder a esta página.";
			default:
				return "Se ha producido un error durante la autenticación.";
		}
	};

	return (
		<div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-start dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
			<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3 mt-0.5 shrink-0" />
			<div>
				<p className="font-medium">Error: {error}</p>
				<p className="mt-1 text-sm">{getErrorMessage(error || "")}</p>
			</div>
		</div>
	);
}
