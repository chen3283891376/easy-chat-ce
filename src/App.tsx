import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { XESCloudValue } from './utils/XesCloud';
import { LogInIcon, PlusIcon, SendIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageBubble, type Message } from '@/components/MessageBuddle';

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
    const [messages, setMessages] = useState<Message[]>([]);
    const [roomList, setRoomList] = useState<Room[]>(
        localStorage.getItem('roomList') ? JSON.parse(localStorage.getItem('roomList') as string) : [],
    );
    const [input, setInput] = useState<string>('');
    const pollingRef = useRef<number | null>(null);
    const xRef = useRef<XESCloudValue | null>(null);
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

    const startPolling = () => {
        stopPolling();
        xRef.current = new XESCloudValue(String(chatId));
        const x = xRef.current;
        const tick = async () => {
            const all = await x.getAllNum();
            const parsed: Message[] = [];
            Object.entries(all).forEach(([name]) => {
                const parsedJson = JSON.parse(name);
                const t = Number(parsedJson.time) || 0;
                parsed.push({
                    username: parsedJson.username || '',
                    msg: parsedJson.msg || '',
                    time: t,
                });
            });
            parsed.sort((a, b) => a.time - b.time);
            setMessages(parsed);
        };
        tick();
        pollingRef.current = window.setInterval(tick, 1000);
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
        if (!sendButtonRef.current) return;
        sendButtonRef.current.disabled = true;
        const x = xRef.current;
        if (!x) return;
        const t = String(Date.now() / 1000);
        const payload = JSON.stringify({ username, msg: input.trim(), time: t });
        try {
            await x.sendNum(payload, t);
            setInput('');
            toast.success('发送成功');
        } catch (e) {
            toast.error('发送失败');
            console.error(`发送消息失败: ${e}`);
        } finally {
            sendButtonRef.current.disabled = false;
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
                                    if (!xRef.current) return;
                                    setChatId(item.id);
                                    xRef.current.valueData.projectId = String(item.id);
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
                            disabled={!xRef.current}
                            size="sm"
                            onClick={async () => {
                                const projectId = String(Math.floor(Math.random() * 1000000000));
                                const x = xRef.current;
                                if (!x) return;
                                try {
                                    x.valueData.projectId = projectId;
                                    const time = String(Date.now() / 1000);
                                    const data = { username, msg: 'Init.', time: time };
                                    await x.sendNum(JSON.stringify(data), time);
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
                                }
                            }}
                        >
                            <PlusIcon />
                            创建房间
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
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
                <div className="flex-1 p-4 overflow-auto">
                    {messages.map((message, index) => (
                        <MessageBubble
                            key={index}
                            message={message}
                            currentUsername={username}
                            formatTime={formatTime}
                        />
                    ))}
                </div>

                <div className="p-3 flex gap-2 items-center bg-white border-t">
                    <Input
                        disabled={!xRef.current}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="请输入文本"
                        className="flex-1"
                    />
                    <Button ref={sendButtonRef} onClick={handleSend} size={'icon-sm'}>
                        <SendIcon />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default App;
