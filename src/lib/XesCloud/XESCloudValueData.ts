export class XESCloudValueData {
    projectId: string;
    constructor(projectId: string) {
        this.projectId = projectId;
    }
    handshakeData(): Record<string, string> {
        return {
            method: "handshake",
            user: "16641346",
            project_id: this.projectId,
        };
    }
    uploadData(name: string, value: string): Record<string, string> {
        return {
            method: "set",
            user: "16641346",
            project_id: this.projectId,
            name: name,
            value: value,
        };
    }
}
