import { Metadata } from "next";
import ChatContent from "@/components/chats/ChatContent";

export const metadata: Metadata = {
    title: "Next.js Messages | TailAdmin - Next.js Dashboard Template",
    description:
        "This is Next.js Messages page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
    // other metadata
};

export default function Chat() {
    return <ChatContent />;
}
