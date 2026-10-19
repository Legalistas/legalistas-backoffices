import { redirect } from "next/navigation";

// The workspace replaced this screen (19/10/2026); its tasks were copied there.
// The old component (components/tasks) stays in the code, unlinked.
export default function TasksPage() {
	redirect("/admin/workspace");
}
