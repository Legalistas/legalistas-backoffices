import { redirect } from "next/navigation";

// El chat se quitó del panel (sin ChatProvider, ChatContent se rompería).
export default function Chat() {
	return redirect("/admin/dashboard");
}
