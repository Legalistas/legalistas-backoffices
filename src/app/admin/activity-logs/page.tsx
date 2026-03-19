import { Suspense } from "react";
import ActivityLogsContent from "@/components/activity-logs/ActivityLogsContent";

export default function ActivityLogsPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center py-16">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
				</div>
			}
		>
			<ActivityLogsContent />
		</Suspense>
	);
}
