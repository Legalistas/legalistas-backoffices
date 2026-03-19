import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface DataNotFoundProps {
	error: string;
	description: string;
	buttonText?: string;
	icon?: React.ReactNode;
	pathname: string;
}

export const DataNotFound = ({
	error,
	description,
	pathname,
	icon,
	buttonText,
}: DataNotFoundProps) => {
	const router = useRouter();

	return (
		<div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
			<div className="text-center max-w-md">
				<AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
				<h1 className="text-2xl font-bold text-destructive mb-2">{error}</h1>
				<p className="text-muted-foreground mb-6">{description}</p>
				<Button
					variant="outline"
					onClick={() => router.push(pathname)}
					className="bg-primary"
				>
					{icon}
					{buttonText || "Volver al inicio"}
				</Button>
			</div>
		</div>
	);
};
