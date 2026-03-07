import type { ApplyPrivateChatMessage } from "@/lib/types";
import { XESCloudValue } from "@/lib/XesCloud";
import { useCallback } from "react";
import { toast } from "sonner";

const parseApplyData = (data: Record<string, string>) => {
    const parsed: ApplyPrivateChatMessage[] = [];
    Object.entries(data).forEach(([payload, timestampStr]) => {
        try {
            const parsedJson = JSON.parse(payload);
            if (typeof parsedJson === "object" && parsedJson !== null) {
                const time = Number(timestampStr) || Number(parsedJson.time) || 0;
                parsed.push({
                    username: typeof parsedJson.username === "string" ? parsedJson.username : "匿名用户",
                    time,
                    type: typeof parsedJson.type === "string" ? parsedJson.type : undefined,
                    applyer: typeof parsedJson.applyer === "string" ? parsedJson.applyer : undefined,
                    roomId: typeof parsedJson.roomId === "number" ? parsedJson.roomId : undefined,
                    applyed: typeof parsedJson.applyed === "boolean" ? parsedJson.applyed : false,
                });
            }
        } catch (e) {
            toast.error("解析消息失败");
            console.warn("解析消息失败:", e, payload);
        }
    });
    return parsed;
};

function deduplicateMessages(messages: ApplyPrivateChatMessage[]): ApplyPrivateChatMessage[] {
    const roomIdSet = new Set<number>();
    const filteredMessages = messages.filter((m) => {
        if (m.applyed) {
            roomIdSet.add(m.roomId);
        } else if (roomIdSet.has(m.roomId)) {
            return false;
        }
        return true;
    });
    return filteredMessages.sort((a, b) => a.time - b.time);
}

export const usePrivateChat = (currentUsername: string, currentFullUsername: string) => {
    const APPLY_PROJECT_ID = "2666870203";

    const sendPrivateChatApply = useCallback(
        async (username: string, roomId: number) => {
            const x = new XESCloudValue(APPLY_PROJECT_ID);
            const timestamp = Date.now() / 1000;

            const applyData: ApplyPrivateChatMessage = {
                type: "applyPrivateChat",
                username,
                time: timestamp,
                applyer: currentUsername,
                roomId,
            };

            try {
                await x.sendNum(JSON.stringify(applyData), timestamp.toString());
                toast.success("申请成功，等待对方同意");
            } catch (e) {
                console.error(e);
                toast.error("发送请求失败，请稍后再试");
            }
        },
        [currentUsername],
    );

    const getPrivateChatApplys = useCallback(async (forceRefresh = false) => {
        const x = new XESCloudValue(APPLY_PROJECT_ID);
        
        if (forceRefresh) {
            x.clearCache();
        }
        
        const allMessages = await x.getAllNum();
        const parsedMessages = parseApplyData(allMessages);
        // console.log(parsedMessages)
        const currentUserApplys = parsedMessages
            .filter((m) => m.username === currentFullUsername)
            .filter((m) => m.type === "applyPrivateChat");
        return deduplicateMessages(currentUserApplys)
    }, [currentFullUsername]);

    const getPendingPrivateChatApplys = useCallback(async () => {
        const allApplys = await getPrivateChatApplys();
        return allApplys.filter(apply => apply.applyed !== true);
    }, [getPrivateChatApplys]);

    const acceptPrivateChatApply = useCallback(
        async (applyId: number) => {
            const x = new XESCloudValue(APPLY_PROJECT_ID);
            const timestamp = Date.now() / 1000;

            const applyData: ApplyPrivateChatMessage = {
                type: "applyPrivateChat",
                username: currentFullUsername,
                time: timestamp,
                applyer: currentUsername,
                roomId: applyId,
                applyed: true,
            };

            try {
                await x.sendNum(JSON.stringify(applyData), timestamp.toString());
                x.clearCache();
                toast.success("已同意对方的申请");
            } catch (e) {
                console.error(e);
                toast.error("同意请求失败，请稍后再试");
            }
        },
        [currentUsername, currentFullUsername],
    );

    return {
        sendPrivateChatApply,
        getPrivateChatApplys,
        getPendingPrivateChatApplys,
        acceptPrivateChatApply
    };
};