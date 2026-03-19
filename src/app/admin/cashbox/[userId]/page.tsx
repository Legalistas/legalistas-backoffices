import CashBoxUserDetail from "@/components/cash/CashBoxUserDetail";

export default async function CashBoxUserPage({
	params,
}: {
	params: Promise<{ userId: number }>;
}) {
	const { userId } = await params;

	return <CashBoxUserDetail userId={userId} />;
}
