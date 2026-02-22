export interface IFile {
    name: string;
    link: string;
    size: string;
    time: string;
}

export interface Message {
    username: string;
    msg: string;
    time: number;
    type?: "name" | "share";
    recalled?: boolean;
    quoteTimeStamp?: number;
}

export interface MessageAreaProps {
    messages: Message[];
    chatId: number;
    username: string;
    sendMessage: (content: string, quoteMessage?: Message) => Promise<boolean>;
    recallMessage: (messageTime: number, isAdmin?: boolean) => Promise<boolean>;
}

export interface MessageBubbleProps {
    message: Message;
    username: string;
    isAdmin?: boolean;
    onRecall: (messageTime: number) => void;
}

export interface FileDisplayProps {
    message: Message;
}

export interface Room {
    id: number;
    title: string;
}

export interface ChatRoomSidebarProps {
    chatId: number;
    setChatId: (id: number) => void;
    roomList: Room[];
    deleteRoom: (roomId: number) => void;
    showNameInput: boolean;
    setShowNameInput: (show: boolean) => void;
    showIDInput: boolean;
    setShowIDInput: (show: boolean) => void;
    pendingRoomName: string;
    setPendingRoomName: (name: string) => void;
    pendingRoomID: string;
    setPendingRoomID: (name: string) => void;
    startCreateRoom: (username: string) => void;
    startJoinRoom: () => void;
    confirmCreateRoom: () => Promise<void>;
    cancelCreateRoom: () => void;
    cancelJoinRoom: () => void;
}

export interface UploadFileProps {
    setSelectedFile: (value: File | null) => void;
    disabled?: boolean;
}

export interface ValidationError {
    message: string;
}
