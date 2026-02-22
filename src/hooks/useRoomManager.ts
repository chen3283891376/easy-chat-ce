import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { XESCloudValue } from '@/lib/XesCloud';
import { parseMessages } from './useChatMessages';
import type { Message } from '@/components/FileDisplay';

type Room = {
    id: number;
    title: string;
};

interface UseRoomManagerReturn {
    chatId: number;
    setChatId: (id: number) => void;
    roomList: Room[];
    isCreatingRoom: boolean;
    createRoom: (username: string, roomName: string) => Promise<number | null>;
    joinRoom: (roomIdInput: string | null) => Promise<void>;
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

export function useRoomManager(initialChatId: number): UseRoomManagerReturn {
    const [chatId, setChatId] = useState<number>(initialChatId);
    const [roomList, setRoomList] = useState<Room[]>(() => {
        const stored = localStorage.getItem('roomList');
        return stored !== null && stored.length > 0 ? (JSON.parse(stored) as Room[]) : [];
    });
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);

    const [showNameInput, setShowNameInput] = useState(false);
    const [showIDInput, setShowIDInput] = useState(false);
    const [pendingRoomName, setPendingRoomName] = useState('');
    const [pendingUsername, setPendingUsername] = useState('');
    const [pendingRoomID, setPendingRoomID] = useState('');

    useEffect(() => {
        if (roomList.length === 0) {
            const defaultRooms = [{ id: 185655560, title: '项目大群' }];
            setRoomList(defaultRooms);
            localStorage.setItem('roomList', JSON.stringify(defaultRooms));
        } else {
            localStorage.setItem('roomList', JSON.stringify(roomList));
        }
        const storedData = localStorage.getItem('roomList');
        let roomListStored: Room[] = [];
        if (storedData !== null && storedData.length > 0) {
            roomListStored = JSON.parse(storedData) as Room[];
        }
        roomListStored = roomListStored.filter(room => room.id !== 26329675);
        if (!roomListStored.some(room => room.id === 185655560)) {
            roomListStored.push({ id: 185655560, title: '项目大群' });
        }
        localStorage.setItem('roomList', JSON.stringify(roomListStored));
    }, [roomList]);

    const createRoom = async (username: string, roomName: string): Promise<number | null> => {
        if (roomName.length === 0) {
            toast.error('房间名称不能为空');
            return null;
        }

        setIsCreatingRoom(true);
        try {
            const projectId = String(Math.floor(Math.random() * 1000000000));
            const roomId = Number(projectId);
            const finalRoomName = roomName.length > 0 ? roomName : `房间${String(roomId)}`;

            const newXesInstance = new XESCloudValue(projectId);
            const time = Date.now() / 1000;
            const data: Message = { username, msg: finalRoomName, time, type: 'name' };
            await newXesInstance.sendNum(JSON.stringify(data), time.toString());

            setRoomList(prev => [...prev, { id: roomId, title: finalRoomName }]);
            setChatId(roomId);
            await navigator.clipboard.writeText(projectId);
            toast.success('新聊天室创建成功，聊天室ID已复制，发给好友即可加入');

            return roomId;
        } catch (e) {
            toast.error('新聊天室创建失败');
            console.error(`创建聊天室失败: ${String(e)}`);
            return null;
        } finally {
            setIsCreatingRoom(false);
        }
    };

    const startCreateRoom = (username: string): void => {
        setPendingUsername(username);
        setPendingRoomName('');
        setShowNameInput(true);
    };

    const confirmCreateRoom = async (): Promise<void> => {
        if (pendingUsername.length === 0) return;

        const roomName = pendingRoomName.length > 0 ? pendingRoomName : '';
        await createRoom(pendingUsername, roomName);

        setShowNameInput(false);
        setPendingRoomName('');
        setPendingUsername('');
    };

    const cancelCreateRoom = (): void => {
        setShowNameInput(false);
        setPendingRoomName('');
        setPendingUsername('');
    };

    const startJoinRoom = (): void => {
        setPendingRoomID('');
        setShowIDInput(true);
    };

    const joinRoom = async (roomIdInput: string | null): Promise<void> => {
        if (roomIdInput === null || roomIdInput.length === 0) return;

        const roomId = Number(roomIdInput);
        if (!roomList.some(room => room.id === roomId)) {
            const newXesInstance = new XESCloudValue(roomIdInput);
            const messages = parseMessages(await newXesInstance.getAllNum());
            let roomName = `房间${String(roomId)}`;
            const nameMessage = messages.find(message => message.type === 'name');
            const msgContent = nameMessage?.msg;
            if (msgContent !== undefined && msgContent.length > 0) {
                roomName = msgContent;
            }

            setRoomList(prev => [...prev, { id: roomId, title: roomName }]);
            setChatId(roomId);
        }

        setShowIDInput(false);
        setPendingRoomID('');
    };

    const cancelJoinRoom = (): void => {
        setShowIDInput(false);
        setPendingRoomID('');
    };

    const deleteRoom = (roomId: number): void => {
        setRoomList(prev => {
            const newList = prev.filter(room => room.id !== roomId);
            if (roomId === chatId) {
                if (newList.length > 0) {
                    setChatId(newList[0].id);
                } else {
                    const defaultRoom = { id: 185655560, title: '项目大群' };
                    setChatId(defaultRoom.id);
                    return [defaultRoom];
                }
            }
            return newList;
        });
    };

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
