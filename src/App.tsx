import { useEffect, useRef, useState } from 'react';
import { Button, Layout, Input, List, Avatar, Toast, Typography, Card } from '@douyinfe/semi-ui-19';
import { XESCloudValue } from './utils/XesCloud';

const { Sider, Content } = Layout;

type Message = {
    username: string;
    msg: string;
    time: number;
};

function App() {
    const [chatId, setChatId] = useState<number>(26329675);
    const [username, setUsername] = useState<string>('guest');
    const [messages, setMessages] = useState<Message[]>([]);
    const [roomList, setRoomList] = useState<{ id: number; title: string }[]>(
        localStorage.getItem('roomList') ? JSON.parse(localStorage.getItem('roomList') as string) : [],
    );
    const [input, setInput] = useState<string>('');
    const pollingRef = useRef<number | null>(null);
    const xRef = useRef<XESCloudValue | null>(null);

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
            setRoomList([
                { id: 26329675, title: '项目大群' },
            ]);
            localStorage.setItem('roomList', JSON.stringify(roomList));
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
            Toast.info('不能发送空消息');
            return;
        }
        const x = xRef.current;
        if (!x) return;
        const t = String(Date.now() / 1000);
        const payload = JSON.stringify({ username, msg: input.trim(), time: t });
        try {
            await x.sendNum(payload, t);
            setInput('');
            Toast.success('发送成功');
        } catch (e) {
            Toast.error('发送失败');
            console.error(`发送消息失败: ${e}`);
        }
    };

    return (
        <Layout style={{ height: '100vh' }}>
            <Sider style={{ padding: 16, background: '#f5f7fa' }}>
                <Typography.Title heading={5}>选择聊天室</Typography.Title>
                <List
                    className="max-h-1/2 overflow-scroll"
                    dataSource={roomList}
                    renderItem={(item: { id: number; title: string }) => (
                        <List.Item>
                            <Button
                                disabled={!xRef.current}
                                type={chatId === item.id ? 'primary' : 'tertiary'}
                                onClick={() => {
                                    if (!xRef.current) return;
                                    setChatId(item.id);
                                    xRef.current.valueData.projectId = String(item.id);
                                }}
                                style={{ width: '100%' }}
                            >
                                {item.title}
                            </Button>
                        </List.Item>
                    )}
                />
                <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 8 }}>当前用户：</div>
                    <div style={{ marginBottom: 12 }}>{username}</div>
                    <Button
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

                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                        <Button
                            disabled={!xRef.current}
                            type="primary"
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
                                    Toast.success('新聊天室创建成功，聊天室ID已复制，发给好友即可加入');
                                } catch (e) {
                                    Toast.error('新聊天室创建失败');
                                    console.error(`创建聊天室失败: ${e}`);
                                }
                            }}
                        >
                            创建房间
                        </Button>
                        <Button
                            type="tertiary"
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
                            加入房间
                        </Button>
                    </div>
                </div>
            </Sider>
            <Layout>
                <Content style={{ padding: 16, overflow: 'auto' }}>
                    <List
                        dataSource={messages}
                        renderItem={(item: Message) => (
                            <List.Item>
                                <Card.Meta
                                    avatar={<Avatar>{item.username ? item.username[0] : '?'}</Avatar>}
                                    title={`${item.username}  ${new Date(item.time * 1000).toLocaleString()}`}
                                    description={<div style={{ whiteSpace: 'pre-wrap' }}>{item.msg}</div>}
                                />
                            </List.Item>
                        )}
                    />
                </Content>
                <div style={{ padding: 12, display: 'flex', gap: 8, alignItems: 'center', background: '#fff' }}>
                    <Input
                        disabled={!xRef.current}
                        value={input}
                        onChange={v => setInput(v)}
                        placeholder="请输入文本"
                        style={{ flex: 1 }}
                    />
                    <Button type="primary" onClick={handleSend}>
                        发送
                    </Button>
                </div>
            </Layout>
        </Layout>
    );
}

export default App;
