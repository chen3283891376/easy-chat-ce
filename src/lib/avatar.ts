import { XESCloudValue } from "./XesCloud";
import type { UserProfileOnCloud } from "./types/user";

// 此函数用于根据用户ID查找图片
export async function getAvatar(userId: string) {
    try {
        // 初始化一个云变量实例
        const cloudVarInstance = new XESCloudValue("199999999");

        // 获取所有数据
        const allData = await cloudVarInstance.getAllNum();

        // 查找该用户的所有资料
        const userEntries = Object.entries(allData).filter(([v, _]) => {
            try {
                const profile = JSON.parse(v);
                return profile.userId === userId;
            } catch {
                return false;
            }
        });

        // 判断是否存在用户资料
        if (userEntries.length === 0) {
            return null;
        }

        // 按key排序获取最新条目
        userEntries.sort(([k1], [k2]) => {
            return parseInt(k2) - parseInt(k1);
        });

        // 获取最新的资料
        const profileStr = userEntries[0][0];

        // 解析资料
        const profileOnCloud: UserProfileOnCloud = JSON.parse(profileStr);
        return profileOnCloud.avatar;
    } catch (error) {
        console.error("获取用户头像失败：", error);
        return null;
    }
}
