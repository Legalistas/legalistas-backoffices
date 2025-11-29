import { Suspense } from "react";
import ErrorClient from "./error-client";
import Link from "next/link";
import Button from "@/components/ui/button/Button";

export default function AuthError() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md space-y-6">
                <h1 className="text-3xl font-bold text-center">Error de Autenticación</h1>

                <Suspense fallback={
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4">
                        Cargando detalles del error...
                    </div>
                }>
                    <ErrorClient />
                </Suspense>

                <div className="flex justify-center">
                    <Button variant="outline" className="w-full">
                        <Link href="/signin">
                            Volver a iniciar sesión
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}




