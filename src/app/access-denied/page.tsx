import { ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccessDenied() {
	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
			<div className="text-center">
				<ShieldAlert className="mx-auto h-16 w-16 text-red-500 dark:text-red-400 mb-4" />
				<h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
					Acceso denegado
				</h1>
				<p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
					Lo sentimos, no tienes permiso para acceder a esta página.
				</p>
				<div className="space-x-4">
					<Link href="/" passHref>
						<Button variant="default" className="inline-flex items-center">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Volver
						</Button>
					</Link>
					<Link href="/signin" passHref>
						<Button
							variant="outline"
							className="inline-flex items-center dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
						>
							Iniciar sesión
						</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
