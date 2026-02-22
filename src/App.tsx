import { useState } from "react";
import { useChatMessages } from "./hooks/useChatMessages";
import { useRoomManager } from "./hooks/useRoomManager";
import { useUsername } from "./hooks/useUsername";
import { ChatRoomSidebar } from "@/components/ChatRoom/ChatRoomSidebar";
import { MessageArea } from "./components/ChatRoom/MessageArea";
import InitProfilePage from "@/pages/InitProfile.tsx";
import type { KeyboardEvent } from "react";
import type { Message } from "@/lib/types";
import { toast } from "sonner";

export default function App() {
    const {
        username,
        isEditing: isEditingName,
        editInput: editNameInput,
        setEditInput: setEditNameInput,
        startEditing: startNameEdit,
        cancelEditing: cancelNameEdit,
        saveUsername,
    } = useUsername();

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

    const { messages, isSending, sendMessage, sendFile, recallMessage } = useChatMessages(
        chatId,
        typeof username === "string" ? username : "",
    );

    const [input, setInput] = useState("");

    const handleSend = async (quoteMessage?: Message) => {
        const success = await sendMessage(input, quoteMessage);
        if (success) {
            setInput("");
            toast.info("发送成功");
        } else {
            setInput("");
            toast.error("发送失败");
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    const isConnected = Boolean(chatId);

    if (username === null) return <InitProfilePage />;

    return (
        <div className="h-screen flex">
            <>
                <ChatRoomSidebar
                    roomList={roomList}
                    currentRoomId={chatId}
                    username={username}
                    isEditingName={isEditingName}
                    editNameInput={editNameInput}
                    isCreatingRoom={isCreatingRoom}
                    isConnected={isConnected}
                    showNameInput={showNameInput}
                    showIDInput={showIDInput}
                    pendingRoomName={pendingRoomName}
                    pendingRoomID={pendingRoomID}
                    setRoomList={setRoomList}
                    onRoomSelect={setChatId}
                    onRoomDelete={deleteRoom}
                    onUsernameEditStart={startNameEdit}
                    onUsernameEditCancel={cancelNameEdit}
                    onUsernameEditInputChange={setEditNameInput}
                    onUsernameSave={saveUsername}
                    onStartCreateRoom={() => {
                        startCreateRoom(username);
                    }}
                    onStartJoinRoom={startJoinRoom}
                    onPendingRoomNameChange={setPendingRoomName}
                    onPendingRoomIDChange={setPendingRoomID}
                    onConfirmCreateRoom={confirmCreateRoom}
                    onCancelCreateRoom={cancelCreateRoom}
                    onCancelJoinRoom={cancelJoinRoom}
                    onJoinRoom={joinRoom}
                />

                <MessageArea
                    messages={messages}
                    currentUsername={username}
                    input={input}
                    isSending={isSending}
                    isConnected={isConnected}
                    onInputChange={setInput}
                    onSend={handleSend}
                    onKeyDown={handleKeyDown}
                    chatId={chatId.toString()}
                    sendFile={sendFile}
                    handleRecall={(message: Message) => {
                        void recallMessage(message.time);
                    }}
                />
            </>
        </div>
    );
}
