function Pulse({ className = "" }: { className?: string }) {
	return (
		<div
			className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
		/>
	);
}

export default function TasksSkeleton() {
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<Pulse className="h-9 w-40" />
				<Pulse className="h-9 w-32 rounded-lg" />
			</div>

			{/* Filters bar */}
			<div className="flex flex-wrap items-center gap-3">
				<Pulse className="h-9 w-64 rounded-lg" />
				<Pulse className="h-9 w-32 rounded-lg" />
				<Pulse className="h-9 w-32 rounded-lg" />
				<Pulse className="h-9 w-32 rounded-lg" />
			</div>

			{/* Stats cards */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<div
						key={i}
						className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 p-4"
					>
						<Pulse className="h-3 w-20 mb-2" />
						<Pulse className="h-7 w-12" />
					</div>
				))}
			</div>

			{/* Table */}
			<div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3">
				{/* Table header */}
				<div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
					<Pulse className="h-4 w-[5%]" />
					<Pulse className="h-4 w-[25%]" />
					<Pulse className="h-4 w-[12%]" />
					<Pulse className="h-4 w-[12%]" />
					<Pulse className="h-4 w-[15%]" />
					<Pulse className="h-4 w-[15%]" />
					<Pulse className="h-4 w-[8%]" />
				</div>

				{/* Table rows */}
				{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
					<div
						key={i}
						className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
					>
						<Pulse className="h-4 w-[5%]" />
						<div className="w-[25%] space-y-1.5">
							<Pulse className="h-4 w-4/5" />
							<Pulse className="h-3 w-3/5" />
						</div>
						<Pulse className="h-5 w-[12%] rounded-full" />
						<Pulse className="h-5 w-[12%] rounded-full" />
						<div className="w-[15%] flex items-center gap-2">
							<Pulse className="h-6 w-6 rounded-full shrink-0" />
							<Pulse className="h-3 w-20" />
						</div>
						<Pulse className="h-4 w-[15%]" />
						<div className="w-[8%] flex justify-end gap-2">
							<Pulse className="h-7 w-7 rounded" />
							<Pulse className="h-7 w-7 rounded" />
						</div>
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<Pulse className="h-4 w-40" />
				<div className="flex items-center gap-2">
					<Pulse className="h-8 w-8 rounded" />
					<Pulse className="h-8 w-8 rounded" />
					<Pulse className="h-8 w-8 rounded" />
					<Pulse className="h-8 w-8 rounded" />
				</div>
			</div>
		</div>
	);
}
