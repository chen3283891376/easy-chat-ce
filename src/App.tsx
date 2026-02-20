import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { XESCloudValue, MessageCacheManager } from './utils/XesCloud';
import { LogInIcon, PlusIcon, SendIcon } from 'lucide-react';
import { MessageBubble, type Message as ChatMessage } from '@/components/MessageBuddle';

type Room = {
    id: number;
    title: string;
};

const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

function App() {
    const [chatId, setChatId] = useState<number>(26329675);
    const [username, setUsername] = useState<string>('guest');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [roomList, setRoomList] = useState<Room[]>(
        localStorage.getItem('roomList') ? JSON.parse(localStorage.getItem('roomList') as string) : [],
    );
    const [input, setInput] = useState<string>('');
    const [isSending, setIsSending] = useState<boolean>(false);
    const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
    const pollingRef = useRef<number | null>(null);
    const xRef = useRef<XESCloudValue | null>(null);
    const cacheManagerRef = useRef<MessageCacheManager>(
        new MessageCacheManager({
            memoryMaxSize: 200,
            localStorageExpiry: 30 * 60 * 1000,
            version: 1,
        }),
    );
    const sendButtonRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem('username');
        if (stored) setUsername(stored);
        else {
            const name = window.prompt('请输入用户名（将保存在本地）', '匿名');
            if (name) {
                localStorage.setItem('username', name);
                setUsername(name);
            }
        }
    }, []);

    useEffect(() => {
        startPolling();
        return () => stopPolling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatId]);

    useEffect(() => {
        if (roomList.length === 0) {
            const defaultRooms = [{ id: 26329675, title: '项目大群' }];
            setRoomList(defaultRooms);
            localStorage.setItem('roomList', JSON.stringify(defaultRooms));
        } else {
            localStorage.setItem('roomList', JSON.stringify(roomList));
        }
    }, [roomList]);

    const cleanupResources = () => {
        stopPolling();
        if (xRef.current) {
            xRef.current.clearCache();
            xRef.current = null;
        }
    };

    const startPolling = () => {
        cleanupResources();

        xRef.current = new XESCloudValue(String(chatId));
        const x = xRef.current;
        const cacheManager = cacheManagerRef.current;

        const tick = async () => {
            if (!x) return;

            try {
                let allMessages: Record<string, string> = {};

                const cachedMessages = cacheManager.get(chatId);
                if (cachedMessages) {
                    allMessages = cachedMessages;
                } else {
                    allMessages = await x.getAllNum();
                    cacheManager.set(chatId, allMessages);
                }

                const parsed: ChatMessage[] = [];

                Object.entries(allMessages).forEach(([payload, timestampStr]) => {
                    try {
                        const parsedJson = JSON.parse(payload);
                        const t = Number(timestampStr) || Number(parsedJson.time) || 0;

                        parsed.push({
                            username: parsedJson.username || '未知用户',
                            msg: parsedJson.msg || '',
                            time: t,
                        });
                    } catch (e) {
                        toast.error('解析消息失败');
                        console.warn('解析消息失败:', e, payload);
                    }
                });

                parsed.sort((a, b) => a.time - b.time);
                setMessages(parsed);
            } catch (e) {
                console.error('获取消息失败:', e);
                toast.error('获取消息失败，请检查连接');
            }
        };

        tick();
        pollingRef.current = window.setInterval(async () => {
            if (!x) return;
            try {
                const freshMessages = await x.getAllNum();
                cacheManagerRef.current.set(chatId, freshMessages);
                tick();
            } catch (e) {
                console.error('更新缓存失败:', e);
            }
        }, 5000);
    };

    const stopPolling = () => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    };

    const handleSend = async () => {
        if (!input.trim()) {
            toast.info('不能发送空消息');
            return;
        }
        if (!sendButtonRef.current || !xRef.current) return;

        setIsSending(true);
        const x = xRef.current;
        const cacheManager = cacheManagerRef.current;
        const t = String(Date.now() / 1000);

        try {
            const payload = JSON.stringify({
                username: username || '匿名用户',
                msg: input.trim(),
                time: t,
            });

            await x.sendNum(payload, t);
            setInput('');

            cacheManager.clear(chatId);

            const freshMessages = await x.getAllNum();
            cacheManager.set(chatId, freshMessages);

            const parsed: ChatMessage[] = [];
            Object.entries(freshMessages).forEach(([payload, timestampStr]) => {
                try {
                    const parsedJson = JSON.parse(payload);
                    const time = Number(timestampStr) || Number(parsedJson.time) || 0;
                    parsed.push({
                        username: parsedJson.username || '未知用户',
                        msg: parsedJson.msg || '',
                        time,
                    });
                } catch (e) {
                    console.warn('解析消息失败:', e);
                }
            });

            parsed.sort((a, b) => a.time - b.time);
            setMessages(parsed);

            toast.success('发送成功');
        } catch (e) {
            toast.error('发送失败');
            console.error(`发送消息失败: ${e}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="h-screen flex">
            <div className="w-56 p-4 bg-gray-50 flex flex-col border-r">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">选择聊天室</h4>
                <ScrollArea className="flex-1 max-h-1/2 p-2 my-2 border rounded">
                    {roomList.map((item: Room, index) => (
                        <div key={item.id} className="mb-2">
                            <Button
                                disabled={!xRef.current}
                                variant={chatId === item.id ? 'default' : 'secondary'}
                                onClick={() => {
                                    setChatId(item.id);
                                }}
                                className="w-full"
                            >
                                {item.title}
                            </Button>
                            {index !== roomList.length - 1 && <Separator className="my-2" />}
                        </div>
                    ))}
                </ScrollArea>
                <Separator className="my-2" />
                <div className="mt-4">
                    <div className="mb-2">当前用户：</div>
                    <div className="mb-3 flex items-center">
                        {username}
                        <Button
                            className="ml-2"
                            variant="outline"
                            size="xs"
                            onClick={() => {
                                const n = window.prompt('输入新的用户名：', username || '');
                                if (n) {
                                    localStorage.setItem('username', n);
                                    setUsername(n);
                                }
                            }}
                        >
                            切换用户名
                        </Button>
                    </div>

                    <Separator className="my-4" />

                    <div className="mt-4 flex gap-2">
                        <Button
                            disabled={isCreatingRoom || !xRef.current}
                            size="sm"
                            onClick={async () => {
                                setIsCreatingRoom(true);
                                const projectId = String(Math.floor(Math.random() * 1000000000));
                                const x = xRef.current;
                                if (!x) {
                                    setIsCreatingRoom(false);
                                    return;
                                }

                                try {
                                    const newXesInstance = new XESCloudValue(projectId);
                                    const time = String(Date.now() / 1000);
                                    const data = { username, msg: 'Init.', time };
                                    await newXesInstance.sendNum(JSON.stringify(data), time);

                                    setChatId(Number(projectId));
                                    setRoomList(prev => [
                                        ...prev,
                                        { id: Number(projectId), title: `房间${projectId}` },
                                    ]);

                                    await navigator.clipboard.writeText(projectId);
                                    toast.success('新聊天室创建成功，聊天室ID已复制，发给好友即可加入');
                                } catch (e) {
                                    toast.error('新聊天室创建失败');
                                    console.error(`创建聊天室失败: ${e}`);
                                } finally {
                                    setIsCreatingRoom(false);
                                }
                            }}
                        >
                            <PlusIcon />
                            创建房间
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isCreatingRoom}
                            onClick={() => {
                                const projectId = window.prompt('请输入房间ID：');
                                if (projectId && !roomList.some(room => room.id === Number(projectId))) {
                                    setChatId(Number(projectId));
                                    setRoomList(prev => [
                                        ...prev,
                                        { id: Number(projectId), title: `房间${projectId}` },
                                    ]);
                                }
                            }}
                        >
                            <LogInIcon />
                            加入房间
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 h-[calc(100%-64px)] p-4 relative">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400">暂无消息</div>
                    ) : (
                        messages.map((message, index) => (
                            <MessageBubble
                                key={`${message.time}-${index}`}
                                message={message}
                                currentUsername={username}
                                formatTime={formatTime}
                            />
                        ))
                    )}
                </ScrollArea>

                <div className="p-3 flex gap-2 items-center bg-white border-t">
                    <Input
                        disabled={isSending || !xRef.current}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="请输入文本"
                        className="flex-1"
                    />
                    <Button
                        ref={sendButtonRef}
                        onClick={handleSend}
                        size={'icon-sm'}
                        disabled={isSending || !xRef.current}
                    >
                        <SendIcon className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default App;
