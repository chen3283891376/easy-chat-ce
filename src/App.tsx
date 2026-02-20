import { useState } from 'react';
import { useChatMessages } from './hooks/useChatMessages';
import { useRoomManager } from './hooks/useRoomManager';
import { useUsername } from './hooks/useUsername';
import { ChatRoomSidebar } from '@/components/ChatRoom/ChatRoomSidebar';
import { MessageArea } from './components/ChatRoom/MessageArea';

function App() {
    const {
        username,
        isEditing: isEditingName,
        editInput: editNameInput,
        setEditInput: setEditNameInput,
        startEditing: startNameEdit,
        cancelEditing: cancelNameEdit,
        saveUsername,
    } = useUsername();

    const { chatId, setChatId, roomList, isCreatingRoom, createRoom, joinRoom, deleteRoom } = useRoomManager(26329675);

    const { messages, isSending, sendMessage } = useChatMessages(chatId, username);

    const [input, setInput] = useState('');

    const handleSend = async () => {
        const success = await sendMessage(input);
        if (success) setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const isConnected = Boolean(chatId);

    return (
        <div className="h-screen flex">
            <ChatRoomSidebar
                roomList={roomList}
                currentRoomId={chatId}
                username={username}
                isEditingName={isEditingName}
                editNameInput={editNameInput}
                isCreatingRoom={isCreatingRoom}
                isConnected={isConnected}
                onRoomSelect={setChatId}
                onRoomDelete={deleteRoom}
                onUsernameEditStart={startNameEdit}
                onUsernameEditCancel={cancelNameEdit}
                onUsernameEditInputChange={setEditNameInput}
                onUsernameSave={saveUsername}
                onCreateRoom={() => createRoom(username)}
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
            />
        </div>
    );
}

export default App;
