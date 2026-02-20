import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { XESCloudValue } from '@/lib/XesCloud';
import { parseMessages } from './useChatMessages';
import type { Message } from '@/components/MessageBuddle';

type Room = {
    id: number;
    title: string;
};

export function useRoomManager(initialChatId: number) {
    const [chatId, setChatId] = useState<number>(initialChatId);
    const [roomList, setRoomList] = useState<Room[]>(() => {
        const stored = localStorage.getItem('roomList');
        return stored ? JSON.parse(stored) : [];
    });
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);

    useEffect(() => {
        if (roomList.length === 0) {
            const defaultRooms = [{ id: 26329675, title: '项目大群' }];
            setRoomList(defaultRooms);
            localStorage.setItem('roomList', JSON.stringify(defaultRooms));
        } else {
            localStorage.setItem('roomList', JSON.stringify(roomList));
        }
    }, [roomList]);

    const createRoom = async (username: string): Promise<number | null> => {
        setIsCreatingRoom(true);
        try {
            const projectId = String(Math.floor(Math.random() * 1000000000));
            const roomId = Number(projectId);
            const roomName = prompt('请输入房间名称') || `房间${roomId}`;

            const newXesInstance = new XESCloudValue(projectId);
            const time = Date.now() / 1000;
            const data: Message = { username, msg: roomName, time, type: 'name' };
            await newXesInstance.sendNum(JSON.stringify(data), time.toString());

            setRoomList(prev => [...prev, { id: roomId, title: roomName }]);
            setChatId(roomId);
            await navigator.clipboard.writeText(projectId);
            toast.success('新聊天室创建成功，聊天室ID已复制，发给好友即可加入');

            return roomId;
        } catch (e) {
            toast.error('新聊天室创建失败');
            console.error(`创建聊天室失败: ${e}`);
            return null;
        } finally {
            setIsCreatingRoom(false);
        }
    };

    const joinRoom = async (roomIdInput: string | null) => {
        if (!roomIdInput) return;

        const roomId = Number(roomIdInput);
        if (!roomList.some(room => room.id === roomId)) {
            const newXesInstance = new XESCloudValue(roomIdInput);
            const messages = parseMessages(await newXesInstance.getAllNum());
            let roomName = `房间${roomId}`;
            const nameMessage = messages.find(message => message.type === 'name');
            roomName = nameMessage?.msg || '';

            setRoomList(prev => [...prev, { id: roomId, title: roomName }]);
            setChatId(roomId);
        }
    };

    const deleteRoom = (roomId: number) => {
        setRoomList(prev => {
            const newList = prev.filter(room => room.id !== roomId);
            if (roomId === chatId) {
                if (newList.length > 0) {
                    setChatId(newList[0].id);
                } else {
                    const defaultRoom = { id: 26329675, title: '项目大群' };
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
    };
}
