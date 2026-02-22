import { useState, useEffect } from "react";
import { toast } from "sonner";
import { XESCloudValue } from "@/lib/XesCloud";
import { parseMessages } from "./useChatMessages";
import type { Message } from "@/lib/types";

const DEFAULT_ROOM_ID = 185655560;
const INVALID_ROOM_ID = 26329675;
const RANDOM_PROJECT_ID_MAX = 1000000000;
const MS_TO_SECONDS = 1000;

interface Room {
    id: number;
    title: string;
}

interface UseRoomManagerReturn {
    chatId: number;
    setChatId: (_id: number) => void;
    roomList: Room[];
    isCreatingRoom: boolean;
    createRoom: (_username: string, _roomName: string) => Promise<number | null>;
    joinRoom: (_roomIdInput: string | null) => Promise<void>;
    deleteRoom: (_roomId: number) => void;
    showNameInput: boolean;
    setShowNameInput: (_show: boolean) => void;
    showIDInput: boolean;
    setShowIDInput: (_show: boolean) => void;
    pendingRoomName: string;
    setPendingRoomName: (_name: string) => void;
    pendingRoomID: string;
    setPendingRoomID: (_name: string) => void;
    startCreateRoom: (_username: string) => void;
    startJoinRoom: () => void;
    confirmCreateRoom: () => Promise<void>;
    cancelCreateRoom: () => void;
    cancelJoinRoom: () => void;
}

export function useRoomManager(initialChatId: number): UseRoomManagerReturn {
    const [chatId, setChatId] = useState<number>(initialChatId);
    const [roomList, setRoomList] = useState<Room[]>(() => {
        const stored = localStorage.getItem("roomList");
        return stored !== null && stored.length > 0 ? (JSON.parse(stored) as Room[]) : [];
    });
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);

    const [showNameInput, setShowNameInput] = useState(false);
    const [showIDInput, setShowIDInput] = useState(false);
    const [pendingRoomName, setPendingRoomName] = useState("");
    const [pendingUsername, setPendingUsername] = useState("");
    const [pendingRoomID, setPendingRoomID] = useState("");

    useEffect(() => {
        if (roomList.length === 0) {
            const defaultRooms = [{ id: DEFAULT_ROOM_ID, title: "项目大群" }];
            setRoomList(defaultRooms);
            localStorage.setItem("roomList", JSON.stringify(defaultRooms));
        } else {
            localStorage.setItem("roomList", JSON.stringify(roomList));
        }
        const storedData = localStorage.getItem("roomList");
        let roomListStored: Room[] = [];
        if (storedData !== null && storedData.length > 0) {
            roomListStored = JSON.parse(storedData) as Room[];
        }
        roomListStored = roomListStored.filter((room) => room.id !== INVALID_ROOM_ID);
        if (!roomListStored.some((room) => room.id === DEFAULT_ROOM_ID)) {
            roomListStored.push({ id: DEFAULT_ROOM_ID, title: "项目大群" });
        }
        localStorage.setItem("roomList", JSON.stringify(roomListStored));
    }, [roomList]);

    async function createRoom(username: string, roomName: string): Promise<number | null> {
        if (roomName.length === 0) {
            toast.error("房间名称不能为空");
            return null;
        }

        setIsCreatingRoom(true);
        try {
            const projectId = String(Math.floor(Math.random() * RANDOM_PROJECT_ID_MAX));
            const roomId = Number(projectId);
            const finalRoomName = roomName.length > 0 ? roomName : `房间${String(roomId)}`;

            const newXesInstance = new XESCloudValue(projectId);
            const time = Date.now() / MS_TO_SECONDS;
            const data: Message = { username, msg: finalRoomName, time, type: "name" };
            await newXesInstance.sendNum(JSON.stringify(data), time.toString());

            setRoomList((prev) => [...prev, { id: roomId, title: finalRoomName }]);
            setChatId(roomId);
            await navigator.clipboard.writeText(projectId);
            toast.success("新聊天室创建成功，聊天室ID已复制，发给好友即可加入");

            return roomId;
        } catch (e) {
            toast.error("新聊天室创建失败");
            console.error("创建聊天室失败:", e);
            return null;
        } finally {
            setIsCreatingRoom(false);
        }
    }

    function startCreateRoom(username: string): void {
        setPendingUsername(username);
        setPendingRoomName("");
        setShowNameInput(true);
    }

    async function confirmCreateRoom(): Promise<void> {
        if (pendingUsername.length === 0) return;

        const roomName = pendingRoomName.length > 0 ? pendingRoomName : "";
        await createRoom(pendingUsername, roomName);

        setShowNameInput(false);
        setPendingRoomName("");
        setPendingUsername("");
    }

    function cancelCreateRoom(): void {
        setShowNameInput(false);
        setPendingRoomName("");
        setPendingUsername("");
    }

    function startJoinRoom(): void {
        setPendingRoomID("");
        setShowIDInput(true);
    }

    async function joinRoom(roomIdInput: string | null): Promise<void> {
        if (roomIdInput === null || roomIdInput.length === 0) return;

        const roomId = Number(roomIdInput);
        if (!roomList.some((room) => room.id === roomId)) {
            const newXesInstance = new XESCloudValue(roomIdInput);
            const messages = parseMessages(await newXesInstance.getAllNum());
            let roomName = `房间${String(roomId)}`;
            const nameMessage = messages.find((message) => message.type === "name");
            const msgContent = nameMessage?.msg;
            if (msgContent !== undefined && msgContent.length > 0) {
                roomName = msgContent;
            }

            setRoomList((prev) => [...prev, { id: roomId, title: roomName }]);
            setChatId(roomId);
        }

        setShowIDInput(false);
        setPendingRoomID("");
    }

    function cancelJoinRoom(): void {
        setShowIDInput(false);
        setPendingRoomID("");
    }

    function deleteRoom(roomId: number): void {
        setRoomList((prev) => {
            const newList = prev.filter((room) => room.id !== roomId);
            if (roomId === chatId) {
                if (newList.length > 0) {
                    setChatId(newList[0].id);
                } else {
                    const defaultRoom = { id: DEFAULT_ROOM_ID, title: "项目大群" };
                    setChatId(defaultRoom.id);
                    return [defaultRoom];
                }
            }
            return newList;
        });
    }

    return {
        chatId,
        setChatId,
        roomList,
        isCreatingRoom,
        createRoom,
        joinRoom,
        deleteRoom,
        showNameInput,
        setShowNameInput,
        showIDInput,
        setShowIDInput,
        pendingRoomName,
        setPendingRoomName,
        pendingRoomID,
        setPendingRoomID,
        startCreateRoom,
        startJoinRoom,
        confirmCreateRoom,
        cancelCreateRoom,
        cancelJoinRoom,
    };
}
