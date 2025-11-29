"use client";
import React from "react";
import ChatSidebar from "./ChatSidebar";
import ChatBox from "./ChatBox";


export default function ChatContent() {
    return (

        <div>
            <div className="h-[calc(100vh-150px)] overflow-hidden sm:h-[calc(100vh-174px)]">
                <div className="flex flex-col h-full gap-6 xl:flex-row xl:gap-5">
                    {/* <!-- Chat Sidebar Start --> */}
                    <ChatSidebar />
                    {/* <!-- Chat Sidebar End --> */}
                    {/* <!-- Chat Box Start --> */}
                    <ChatBox />
                    {/* <!-- Chat Box End --> */}
                </div>
            </div>
        </div>

    );
}