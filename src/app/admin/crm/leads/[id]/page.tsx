import LeadDetailPageContent from "@/components/crm/LeadDetailPageContent";

export default async function LeadDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return <LeadDetailPageContent id={id} />;
}
