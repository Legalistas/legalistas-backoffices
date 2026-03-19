import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import ErrorClient from "./error-client";

export default function AuthError() {
	return (
		<div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white dark:bg-gray-900">
			<div className="w-full max-w-md space-y-6">
				<h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
					Error de Autenticación
				</h1>

				<Suspense
					fallback={
						<div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
							Cargando detalles del error...
						</div>
					}
				>
					<ErrorClient />
				</Suspense>

				<div className="flex justify-center">
					<Button
						variant="outline"
						className="w-full dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
						asChild
					>
						<Link href="/signin">Volver a iniciar sesión</Link>
					</Button>
				</div>
			</div>
		</div>
	);
}
