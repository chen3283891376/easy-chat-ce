// 参考：https://code.xueersi.com/home/project/detail?lang=code&pid=58539710&version=cpp&form=cpp&langType=cpp
class XESCloudValueData {
    projectId: string;
    constructor(projectId: string) {
        this.projectId = projectId;
    }
    handShakeData() {
        const handshakeData = {
            method: 'handshake',
            user: '16641346',
            project_id: this.projectId,
        };
        return handshakeData;
    }
    uploadData(name: string, value: string) {
        const uploadData = {
            method: 'set',
            user: '16641346',
            project_id: this.projectId,
            name: name,
            value: value,
        };
        return uploadData;
    }
}

class XESCloudValue {
    valueData: XESCloudValueData;
    url: string;
    constructor(projectId: string) {
        this.valueData = new XESCloudValueData(projectId);
        this.url = 'wss://api.xueersi.com/codecloudvariable/ws:80';
    }

    sendNum(name: string, num: string) {
        if (typeof num !== 'string') {
            throw new Error('num must be a string');
        } else if (num === '') {
            throw new Error('the num is null, please input a num');
        }
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.url);
            ws.onopen = () => {
                ws.send(JSON.stringify(this.valueData.uploadData(name, num)));
            };
            ws.onmessage = event => {
                const res = JSON.parse(event.data);
                ws.close();
                if (res.method === 'ack' && res.reply === 'OK') {
                    resolve('success');
                } else {
                    reject('failed');
                }
            };
        });
    }
    getAllNum(): Promise<Record<string, string>> {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(this.url);
            const dic: Record<string, string> = {};

            const timeoutId = setTimeout(() => {
                console.log(this.valueData.handShakeData().project_id);
                ws.close();
                reject(new Error('获取数据超时'));
            }, 30000);

            ws.onopen = () => {
                ws.send(JSON.stringify(this.valueData.handShakeData()));
            };

            ws.onmessage = event => {
                try {
                    const res = JSON.parse(event.data);
                    if (res.method === 'handshake') {
                        ws.send(JSON.stringify(this.valueData.handShakeData()));
                        return;
                    }

                    const value = String(res.value || '');
                    const name = String(res.name || '');

                    if (name in dic) {
                        clearTimeout(timeoutId);
                        ws.close();
                        resolve(dic);
                        return;
                    }

                    dic[name] = value;

                    ws.send(JSON.stringify(this.valueData.handShakeData()));
                } catch (error) {
                    clearTimeout(timeoutId);
                    ws.close();
                    reject(new Error(`解析响应数据失败: ${error}`));
                }
            };

            ws.onerror = error => {
                clearTimeout(timeoutId);
                reject(new Error(`WebSocket连接错误: ${error}`));
            };

            ws.onclose = () => {
                clearTimeout(timeoutId);
            };
        });
    }
    async findNum(name: string) {
        const dic = await this.getAllNum();
        if (name in dic) {
            return { name: dic[name] };
        } else {
            return 'the num is not exist';
        }
    }
}

export { XESCloudValue };
