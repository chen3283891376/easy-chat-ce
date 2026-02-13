// 不知道有没有用喵 —— Aur
// 参考: https://code.xueersi.com/home/project/detail?lang=code&pid=58539710

class XESCloudValueData {
    pid: string;
    uid: string;

    constructor(pid: string, uid = '16641346') {
        this.pid = pid;
        this.uid = uid;
    }
    handshake() {
        return {
            method: 'handshake',
            user: this.uid,
            project_id: this.pid,
        };
    }
    set(name: string, value: string) {
        return {
            method: 'set',
            user: this.uid,
            project_id: this.pid,
            name,
            value,
        };
    }
}

type Pending = {
    ok: (v: any) => void;
    err: (e: any) => void;
    timer: any;
};

export class XESCloudValue {
    private data: XESCloudValueData;
    private url = 'wss://api.xueersi.com/codecloudvariable/ws:80';
    private ws: WebSocket | null = null;
    private connecting = false;
    private waitQueue: any[] = [];
    private pendings = new Map<string, Pending>();
    private retryCount = 0;
    private readonly maxRetry = 5;
    private heartbeat: any;
    private cache = new Map<string, string>();
    private cacheTime = 0;
    private readonly cacheTTL = 5000;

    constructor(pid: string, uid?: string) {
        this.data = new XESCloudValueData(pid, uid);
    }

    async send(name: string, val: string | number): Promise<void> {
        const str = String(val);
        if (!str) throw new Error('空值');

        this.cache.set(name, str);

        await this.request(this.data.set(name, str));
    }

    async sendBatch(items: Record<string, string | number>) {
        for (const [k, v] of Object.entries(items)) {
            await this.send(k, v);
        }
    }

    async getAll(force = false): Promise<Record<string, string>> {
        if (!force && Date.now() - this.cacheTime < this.cacheTTL) {
            return Object.fromEntries(this.cache);
        }

        const res = await this.request(this.data.handshake(), 30000);

        if (res && typeof res === 'object') {
            if (Array.isArray(res)) {
                res.forEach((item: any) => {
                    if (item.name) this.cache.set(item.name, String(item.value ?? ''));
                });
            } else {
                Object.entries(res).forEach(([k, v]) => {
                    this.cache.set(k, String(v ?? ''));
                });
            }
            this.cacheTime = Date.now();
        }

        return Object.fromEntries(this.cache);
    }
    async get(name: string): Promise<string | undefined> {
        if (this.cache.has(name)) return this.cache.get(name);
        const all = await this.getAll();
        return all[name];
    }
    clearCache() {
        this.cache.clear();
        this.cacheTime = 0;
    }
    close() {
        this.ws?.close();
        this.cleanup();
    }

    private async request(payload: any, timeout = 10000): Promise<any> {
        const ws = await this.ensureWs();
        const id = payload.name || payload.method + Date.now();

        return new Promise((ok, err) => {
            const timer = setTimeout(() => {
                this.pendings.delete(id);
                err(new Error('timeout'));
            }, timeout);

            this.pendings.set(id, { ok, err, timer });
            ws.send(JSON.stringify(payload));
        });
    }

    private async ensureWs(): Promise<WebSocket> {
        if (this.ws?.readyState === 1) return this.ws;

        if (this.connecting) {
            return new Promise((ok, err) => {
                const check = setInterval(() => {
                    if (this.ws?.readyState === 1) {
                        clearInterval(check);
                        ok(this.ws!);
                    }
                }, 50);
                setTimeout(() => {
                    clearInterval(check);
                    err(new Error('connect timeout'));
                }, 30000);
            });
        }

        return this.connect();
    }

    private connect(): Promise<WebSocket> {
        this.connecting = true;

        return new Promise((ok, err) => {
            const ws = new WebSocket(this.url);
            const timer = setTimeout(() => {
                ws.close();
                err(new Error('ws open timeout'));
            }, 10000);

            ws.onopen = () => {
                clearTimeout(timer);
                this.ws = ws;
                this.connecting = false;
                this.retryCount = 0;
                this.startPing();

                while (this.waitQueue.length) {
                    const { resolve, p } = this.waitQueue.shift();
                    this.request(p)
                        .then(resolve)
                        .catch(() => {});
                }

                ok(ws);
            };

            ws.onmessage = e => {
                try {
                    const msg = JSON.parse(e.data);
                    const key = msg.name || msg.method;
                    const pending = this.pendings.get(key);
                    if (pending) {
                        clearTimeout(pending.timer);
                        this.pendings.delete(key);
                        pending.ok(msg);
                    }
                } catch {}
            };

            ws.onerror = e => {
                clearTimeout(timer);
                this.connecting = false;
                err(e);
            };

            ws.onclose = () => {
                this.cleanup();
                this.tryReconnect();
            };
        });
    }

    private startPing() {
        this.heartbeat = setInterval(() => {
            this.ws?.send(JSON.stringify({ method: 'ping' }));
        }, 30000);
    }

    private cleanup() {
        this.ws = null;
        this.connecting = false;
        clearInterval(this.heartbeat);
        this.pendings.forEach(p => {
            clearTimeout(p.timer);
            p.err(new Error('disconnected'));
        });
        this.pendings.clear();
    }

    private tryReconnect() {
        if (this.retryCount++ >= this.maxRetry) {
            console.error('重连失败，刷新页面重新尝试吧');
            return;
        }
        setTimeout(() => this.connect().catch(() => {}), 1000 * this.retryCount);
    }
}
