import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import * as z from "zod";
import type { MouseEvent } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { ValidationError } from "@/lib/types";
import { toast } from "sonner";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

const MAX_USERNAME_LENGTH = 20;

export default function InitProfilePage() {
    const [username, setUsername] = useState<string>("");
    const [avatar, setAvatar] = useState<string>("");
    const [userId, setUserId] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string | null>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [currentTab, setCurrentTab] = useState<string>("register");
    const { initUserProfile, getUserProfileWithUserID } = useUserProfile();
    const { upload, cancel, isUploading, uploadProgress } = useFileUpload();

    const usernameSchema = z.object({
        username: z.string().min(1, "用户名不得为空").max(MAX_USERNAME_LENGTH, "用户名不得超过二十字"),
    });

    const handleRegister = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        const result = usernameSchema.safeParse({ username });

        if (!result.success) {
            let errors: ValidationError[] = [];

            try {
                errors = JSON.parse(result.error.message) as ValidationError[];
            } catch {
                errors = [{ message: "验证失败" }];
            }

            setErrorMessage(errors[0]?.message || "验证失败");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            await initUserProfile(username, avatar);

            window.location.href = "/";
        } catch (error) {
            console.error("初始化用户资料失败:", error);
            setErrorMessage(error instanceof Error ? error.message : "初始化失败，请稍后重试");
            toast.error("初始化失败，请稍后重试");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();

        if (!userId.trim()) {
            setErrorMessage("用户ID不能为空");
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const profile = await getUserProfileWithUserID(userId);

            if (!profile) {
                setErrorMessage("用户不存在");
                toast.error("用户不存在");
                return;
            }

            localStorage.setItem("currentProfile", JSON.stringify(profile));
            localStorage.setItem("userId", profile.userId);

            window.location.href = "/";
        } catch (error) {
            console.error("登录失败:", error);
            setErrorMessage(error instanceof Error ? error.message : "登录失败，请稍后重试");
            toast.error("登录失败，请稍后重试");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: MouseEvent<HTMLButtonElement>) => {
        if (currentTab === "register") {
            await handleRegister(e);
        } else {
            await handleLogin(e);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setErrorMessage("请上传图片文件");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage("图片大小不能超过 5MB");
            return;
        }

        setErrorMessage(null);

        try {
            const fileData = await upload(file);
            setAvatar(fileData.link);
        } catch (error) {
            console.error("上传失败:", error);
            setErrorMessage("头像上传失败，请稍后重试");
        }
    };

    return (
        <div className="flex justify-center items-center w-screen h-screen">
            <Card className="w-md max-w-md">
                <CardHeader>
                    <CardTitle>EasyChat Community Edition</CardTitle>
                    <CardDescription>请选择注册新账号或使用已有用户ID登录</CardDescription>
                </CardHeader>

                <CardContent>
                    <Tabs defaultValue="register" value={currentTab} onValueChange={setCurrentTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="register">注册新账号</TabsTrigger>
                            <TabsTrigger value="login">使用ID登录</TabsTrigger>
                        </TabsList>
                        <TabsContent value="register" className="mt-4">
                            <Field data-invalid={errorMessage !== null && errorMessage.length > 0} className="mb-4">
                                <FieldLabel>用户名</FieldLabel>
                                <Input
                                    placeholder="请输入一个用户名"
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        setErrorMessage(null);
                                    }}
                                    aria-invalid={errorMessage !== null && errorMessage.length > 0}
                                />
                                {errorMessage !== null && errorMessage.length > 0 && (
                                    <FieldDescription className="text-red-500">{errorMessage}</FieldDescription>
                                )}
                            </Field>

                            <Field className="mb-4">
                                <FieldLabel>头像</FieldLabel>
                                <div className="flex items-center gap-4">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarUpload}
                                        className="flex-1"
                                        disabled={isUploading}
                                    />
                                    {avatar && !isUploading && (
                                        <div className="w-12 h-12 rounded-full overflow-hidden border border-gray-300">
                                            <img src={avatar} alt="预览" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                                {isUploading && (
                                    <div className="mt-2">
                                        <div className="flex items-center gap-2">
                                            <Progress value={uploadProgress} className="flex-1 h-2" />
                                            <span className="text-xs font-medium">{uploadProgress}%</span>
                                            <Button size="icon-sm" variant="ghost" onClick={cancel}>
                                                取消
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Field>
                        </TabsContent>
                        <TabsContent value="login" className="mt-4">
                            <Field data-invalid={errorMessage !== null && errorMessage.length > 0} className="mb-4">
                                <FieldLabel>用户ID</FieldLabel>
                                <Input
                                    placeholder="请输入用户ID"
                                    value={userId}
                                    onChange={(e) => {
                                        setUserId(e.target.value);
                                        setErrorMessage(null);
                                    }}
                                    aria-invalid={errorMessage !== null && errorMessage.length > 0}
                                />
                                {errorMessage !== null && errorMessage.length > 0 && (
                                    <FieldDescription className="text-red-500">{errorMessage}</FieldDescription>
                                )}
                            </Field>
                            <FieldDescription className="mb-4">请输入用户ID进行登录</FieldDescription>
                        </TabsContent>
                    </Tabs>
                </CardContent>

                <CardFooter>
                    <Button onClick={handleSubmit} className="cursor-pointer w-full" disabled={isLoading}>
                        {isLoading ? "处理中..." : currentTab === "register" ? "注册" : "登录"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
