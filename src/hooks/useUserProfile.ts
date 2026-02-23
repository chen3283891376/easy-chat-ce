// 这是我注释写得最多的一回了 —— Aur
import { useState, useEffect, useCallback } from "react";
import type { UserProfile } from "@/lib/types/user";
import { XESCloudValue } from "@/lib/XesCloud";
import { userProfileDB } from "@/lib/db/userProfileDB";
import { toast } from "sonner";
import { md5 } from "hash-wasm";

export async function generateUserId(username: string) {
    if (username === null || username === undefined || username.trim() === "") {
        throw new Error("用户名不能为空");
    }

    const uuid = crypto.randomUUID();
    const usernameMD5 = await md5(username);
    return `${usernameMD5}-${uuid}`;
}

export function useUserProfile() {
    const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(() => {
        const storedProfile = localStorage.getItem("currentProfile");
        return storedProfile ? JSON.parse(storedProfile) : null;
    });

    useEffect(() => {
        async function loadUserProfile() {
            const storedUserId = localStorage.getItem("userId");
            if (storedUserId?.trim() && !currentProfile) {
                try {
                    // 先尝试从本地IndexedDB获取
                    const cachedProfile = await userProfileDB.getProfile(storedUserId);
                    if (cachedProfile) {
                        setCurrentProfile(cachedProfile);
                        localStorage.setItem("currentProfile", JSON.stringify(cachedProfile));
                    } else {
                        await getUserProfileWithCurrentUserID();
                    }
                } catch (error) {
                    console.error("自动加载用户资料失败：", error);
                }
            }
        }

        loadUserProfile();
    }, [currentProfile]);

    const initUserProfile = useCallback(async (username: string, avatar: string) => {
        // 判断用户名或头像是否为空
        if (username === null || username === undefined || username.trim() === "") {
            throw new Error("用户名不能为空");
        }
        if (avatar === null || avatar === undefined || avatar.trim() === "") {
            throw new Error("头像链接不能为空");
        }

        try {
            // 初始化一个云变量实例
            const cloudVarInstance = new XESCloudValue("199999999");

            // 构造用户信息
            // 生成一个用户ID
            const userId = await generateUserId(username);
            // 生成数字类型的key（使用时间戳）
            const key = Date.now().toString();
            // 构造云端用户信息
            const profileOnCloud: UserProfile = {
                userId,
                username,
                avatar,
            };
            // 将云端信息转为String的形式(JSON)
            const profileStr = JSON.stringify(profileOnCloud);

            // 将信息放入云端
            await cloudVarInstance.sendNum(profileStr, key);

            // 设置当前会话资料
            // 构造信息
            const profileOnLocal: UserProfile = {
                userId,
                username,
                avatar,
            };
            // 保存信息
            setCurrentProfile(profileOnLocal);
            // 持久化到localStorage
            localStorage.setItem("currentProfile", JSON.stringify(profileOnLocal));
            localStorage.setItem("userId", userId);
        } catch (error) {
            console.error(`初始化资料失败: ${error}`);
            toast.error("初始化资料失败，详细报错信息已打印至控制台");
            throw new Error(error instanceof Error ? error.message : "初始化资料失败");
        }
    }, []);

    // 此函数用于根据用户ID查找用户
    const getUserProfileWithUserID = useCallback(async (userId: string) => {
        // 判断userId是否为空
        if (userId === null || userId === undefined || userId.trim() === "") {
            throw new Error("用户ID不能为空");
        }

        try {
            // 先看看缓存有没有
            const cachedProfile = await userProfileDB.getProfile(userId);
            if (cachedProfile) {
                return cachedProfile;
            }

            // 从云端获取
            const cloudVarInstance = new XESCloudValue("199999999");
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

            // 按时间戳排序获取最新条目
            userEntries.sort(([, v1], [, v2]) => {
                return parseInt(v2) - parseInt(v1);
            });

            // 获取最新的资料
            const profileStr = userEntries[0][0];

            // 解析资料
            const profileOnCloud: UserProfile = JSON.parse(profileStr);

            // 保存到本地IndexedDB缓存
            await userProfileDB.saveProfile(profileOnCloud);

            return profileOnCloud;
        } catch (error) {
            console.error("查找用户失败：", error);
            return null;
        }
    }, []);

    // 此函数用于查找用户自身的资料
    const getUserProfileWithCurrentUserID = useCallback(async (): Promise<UserProfile | null> => {
        try {
            // 从localStorage获取userId
            const userId = localStorage.getItem("userId");
            // 判断用户ID是否为空
            if (!userId?.trim()) {
                return null;
            }

            // 根据用户ID查找资料
            const profile = await getUserProfileWithUserID(userId);

            // 更新本地状态
            setCurrentProfile(profile);
            // 持久化到localStorage
            localStorage.setItem("currentProfile", JSON.stringify(profile));

            // 返回信息
            return profile;
        } catch (error) {
            if (localStorage.getItem("userId") === null) {
                return null;
            }
            console.error("查找用户自身资料时发送错误：", error);
            toast.error(
                error instanceof Error ? error.message : "无法查到到当前会话资料，请重新创建资料，将在5s后跳转",
            );
            localStorage.removeItem("userId");
            localStorage.removeItem("currentProfile");
            setTimeout(() => {
                window.location.href = "/";
            }, 5000);
            return null;
        }
    }, [getUserProfileWithUserID]);

    // 该函数用于更新用户资料
    const updateUserProfile = useCallback(
        async ({ username, avatar }: { username?: string; avatar?: string }) => {
            // 从localStorage或currentProfile获取userId
            const userId = localStorage.getItem("userId") || currentProfile?.userId;
            if (!userId?.trim()) throw new Error("请先创建资料");
            if (!currentProfile) throw new Error("无法更新，请重试或重新创建资料");

            try {
                // 创建一个云变量实例
                const cloudVarInstance = new XESCloudValue("199999999");

                // 生成key
                const key = Date.now().toString();

                // 合并新资料
                const updatedProfile: UserProfile = {
                    userId,
                    username: username !== undefined && username.trim() !== "" ? username : currentProfile.username,
                    avatar: avatar !== undefined && avatar.trim() !== "" ? avatar : currentProfile.avatar,
                };

                // 转为字符串
                const updatedProfileStr = JSON.stringify(updatedProfile);

                // 保存资料
                await cloudVarInstance.sendNum(updatedProfileStr, key);

                // 更新本地状态
                const profileOnLocal: UserProfile = {
                    userId,
                    username: updatedProfile.username,
                    avatar: updatedProfile.avatar,
                };
                setCurrentProfile(profileOnLocal);
                // 持久化到localStorage
                localStorage.setItem("currentProfile", JSON.stringify(profileOnLocal));
                // 保存到本地IndexedDB缓存
                await userProfileDB.saveProfile(profileOnLocal);
            } catch (error) {
                console.error("更新用户资料时发送错误：", error);
                toast.error("更新用户资料失败，详细内容已打印至控制台");
                throw new Error(error instanceof Error ? error.message : "更新用户资料时发送错误");
            }
        },
        [currentProfile],
    );

    return {
        currentProfile,
        initUserProfile,
        getUserProfileWithCurrentUserID,
        getUserProfileWithUserID,
        updateUserProfile,
    };
}
