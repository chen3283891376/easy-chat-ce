import { useEffect, useRef, useState } from "react";
import {
    Button,
    Layout,
    Input,
    List,
    Avatar,
    Toast,
    Typography,
    Card,
} from "@douyinfe/semi-ui-19";
import { XESCloudValue } from "./utils/XesCloud";

const { Sider, Content } = Layout;

type Message = {
    username: string;
    msg: string;
    time: number;
};

function App() {
    const [chatId, setChatId] = useState<number>(26329673);
    const [username, setUsername] = useState<string>("guest");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState<string>("");
    const pollingRef = useRef<number | null>(null);

    useEffect(() => {
        const stored = localStorage.getItem("username");
        if (stored) setUsername(stored);
        else {
            const name = window.prompt("请输入用户名（将保存在本地）", "匿名");
            if (name) {
                localStorage.setItem("username", name);
                setUsername(name);
            }
        }
    }, []);

    useEffect(() => {
        startPolling();
        return () => stopPolling();
    }, [chatId]);

    const startPolling = () => {
        stopPolling();
        const x = new XESCloudValue(String(chatId));
        const tick = async () => {
            try {
                const all = await x.getAllNum();
                const parsed: Message[] = [];
                Object.entries(all).forEach(([name]) => {
                    try {
                        const parsedJson = JSON.parse(name);
                        const t = Number(parsedJson.time) || 0;
                        parsed.push({
                            username: parsedJson.username || "",
                            msg: parsedJson.msg || "",
                            time: t,
                        });
                    } catch (e) {
                        // ignore malformed
                    }
                });
                parsed.sort((a, b) => a.time - b.time);
                setMessages(parsed);
            } catch (err) {
                // ignore polling errors silently
            }
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
            Toast.info("不能发送空消息");
            return;
        }
        const x = new XESCloudValue(String(chatId));
        const t = String(Date.now() / 1000);
        const payload = JSON.stringify({ username, msg: input.trim(), time: t });
        try {
            await x.sendNum(payload, t);
            setInput("");
            Toast.success("发送成功");
        } catch (e) {
            Toast.error("发送失败");
        }
    };

    return (
        <Layout style={{ height: "100vh" }}>
            <Sider style={{ padding: 16, background: "#f5f7fa" }}>
                <Typography.Title heading={5}>选择聊天室</Typography.Title>
                <List
                    dataSource={[{ id: 26329673, title: "一号聊天室" }, { id: 26329674, title: "二号聊天室" }, { id: 26329678, title: "三号聊天室" }]}
                    renderItem={(item: any) => (
                        <List.Item>
                            <Button type={chatId === item.id ? "primary" : "tertiary"} onClick={() => setChatId(item.id)} style={{ width: "100%" }}>
                                {item.title}
                            </Button>
                        </List.Item>
                    )}
                />
                <div style={{ marginTop: 16 }}>
                    <div style={{ marginBottom: 8 }}>当前用户：</div>
                    <div style={{ marginBottom: 12 }}>{username}</div>
                    <Button onClick={() => {
                        const n = window.prompt("输入新的用户名：", username || "");
                        if (n) { localStorage.setItem("username", n); setUsername(n); }
                    }}>切换用户名</Button>

                    {/* <Button onClick={async ()=>{
                        const randNum = Math.floor(Math.random() * 10000000);
                        const x = new XESCloudValue(String());
                        const t = String(Date.now() / 1000);
                        const payload = JSON.stringify({ username, msg: 'Init.', time: t });
                        try {
                            await x.sendNum(payload, t);
                            setInput("");
                            Toast.success("发送成功");
                        } catch (e) {
                            Toast.error("发送失败");
                        }
                    }}>新建聊天室</Button> */}
                </div>
            </Sider>
            <Layout>
                <Content style={{ padding: 16, overflow: "auto" }}>
                    <List
                        dataSource={messages}
                        renderItem={(item: Message) => (
                            <List.Item>
                                <Card.Meta
                                    avatar={<Avatar>{item.username ? item.username[0] : "?"}</Avatar>}
                                    title={`${item.username}  ${new Date(item.time * 1000).toLocaleString()}`}
                                    description={<div style={{ whiteSpace: "pre-wrap" }}>{item.msg}</div>}
                                />
                            </List.Item>
                        )}
                    />
                </Content>
                <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center", background: "#fff" }}>
                    <Input value={input} onChange={(v) => setInput(v)} placeholder="请输入文本" onEnterPress={handleSend} style={{ flex: 1 }} />
                    <Button type="primary" onClick={handleSend}>发送</Button>
                </div>
            </Layout>
        </Layout>
    );
}

export default App;
