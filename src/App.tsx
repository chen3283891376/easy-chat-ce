import { useState, useCallback } from "react";
import { useChatMessages } from "./hooks/useChatMessages";
import { useRoomManager } from "./hooks/useRoomManager";
import { ChatRoomSidebar } from "@/components/ChatRoom/ChatRoomSidebar";
import { MessageArea } from "./components/ChatRoom/MessageArea";
import InitProfilePage from "@/pages/InitProfile.tsx";
import UserProfilePage from "@/pages/UserProfile";
import type { KeyboardEvent } from "react";
import type { Message } from "@/lib/types";
import { toast } from "sonner";
import { useUserProfile } from "./hooks/useUserProfile";
import { userProfileDB } from "@/lib/db/userProfileDB";

export default function App() {
    const {
        chatId,
        setChatId,
        roomList,
        setRoomList,
        isCreatingRoom,
        joinRoom,
        deleteRoom,
        showNameInput,
        showIDInput,
        pendingRoomName,
        setPendingRoomName,
        pendingRoomID,
        setPendingRoomID,
        startCreateRoom,
        startJoinRoom,
        confirmCreateRoom,
        cancelCreateRoom,
        cancelJoinRoom,
    } = useRoomManager(185655560);

    const { currentProfile } = useUserProfile();

    const [showUserProfile, setShowUserProfile] = useState(false);

    const { messages, isSending, sendMessage, sendFile, recallMessage } = useChatMessages(
        chatId,
        currentProfile ? `user_${currentProfile.userId}` : "",
    );

    const [input, setInput] = useState("");

    const handleSend = useCallback(
        async (quoteMessage?: Message) => {
            const success = await sendMessage(input, quoteMessage);
            if (success) {
                setInput("");
                toast.success("发送成功");
            } else {
                setInput("");
                toast.error("发送失败");
            }
        },
        [input, sendMessage],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
            }
        },
        [handleSend],
    );

    const handleStartCreateRoom = useCallback(() => {
        if (currentProfile?.username) {
            startCreateRoom(currentProfile.username);
        }
    }, [currentProfile, startCreateRoom]);

    const handleRecall = useCallback(
        (message: Message) => {
            void recallMessage(message.time);
        },
        [recallMessage],
    );

    const handleOpenUserProfile = useCallback(() => {
        setShowUserProfile(true);
    }, []);

    const handleLogout = useCallback(async () => {
        try {
            localStorage.removeItem("currentProfile");
            localStorage.removeItem("userId");
            localStorage.removeItem("roomList");

            await userProfileDB.clear();

            window.location.href = "/";
        } catch (error) {
            console.error("注销失败：", error);
            toast.error("注销失败，请重试");
        }
    }, []);

    const isConnected = Boolean(chatId);

    if (currentProfile === null) return <InitProfilePage />;

    return (
        <div className="h-screen flex">
            <>
                <ChatRoomSidebar
                    roomList={roomList}
                    currentRoomId={chatId}
                    isCreatingRoom={isCreatingRoom}
                    isConnected={isConnected}
                    showNameInput={showNameInput}
                    showIDInput={showIDInput}
                    pendingRoomName={pendingRoomName}
                    pendingRoomID={pendingRoomID}
                    setRoomList={setRoomList}
                    onRoomSelect={setChatId}
                    onRoomDelete={deleteRoom}
                    onStartCreateRoom={handleStartCreateRoom}
                    onStartJoinRoom={startJoinRoom}
                    onPendingRoomNameChange={setPendingRoomName}
                    onPendingRoomIDChange={setPendingRoomID}
                    onConfirmCreateRoom={confirmCreateRoom}
                    onCancelCreateRoom={cancelCreateRoom}
                    onCancelJoinRoom={cancelJoinRoom}
                    onJoinRoom={joinRoom}
                    onOpenUserProfile={handleOpenUserProfile}
                    onLogout={handleLogout}
                />

                <MessageArea
                    messages={messages}
                    currentUsername={`user_${currentProfile.userId}`}
                    input={input}
                    isSending={isSending}
                    isConnected={isConnected}
                    onInputChange={setInput}
                    onSend={handleSend}
                    onKeyDown={handleKeyDown}
                    chatId={chatId.toString()}
                    sendFile={sendFile}
                    handleRecall={handleRecall}
                />

                <UserProfilePage open={showUserProfile} onOpenChange={setShowUserProfile} />
            </>
        </div>
    );
}
