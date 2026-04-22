import EmployeeHrPage from "@/components/members/EmployeeHrPage";

export default async function Page({
	params,
}: {
	params: Promise<{ userId: string }>;
}) {
	const { userId } = await params;
	return <EmployeeHrPage userId={Number(userId)} />;
}
