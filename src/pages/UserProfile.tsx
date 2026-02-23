import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useFileUpload } from "@/hooks/useFileUpload";
import { Progress } from "@/components/ui/progress";

interface UserProfileProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function UserProfilePage({ open, onOpenChange }: UserProfileProps) {
    const { currentProfile, updateUserProfile } = useUserProfile();
    const [username, setUsername] = useState(currentProfile?.username || "");
    const [avatar, setAvatar] = useState(currentProfile?.avatar || "");
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const { upload, cancel, isUploading, uploadProgress } = useFileUpload();

    if (!currentProfile) {
        onOpenChange(false);
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username.trim()) {
            toast.error("用户名不能为空");
            return;
        }
        if (!avatar.trim()) {
            toast.error("头像链接不能为空");
            return;
        }

        setIsLoading(true);
        try {
            await updateUserProfile({ username, avatar });
            toast.success("资料更新成功");
            onOpenChange(false);
        } catch (error) {
            console.error("更新资料失败：", error);
            toast.error("更新资料失败，请重试");
        } finally {
            setIsLoading(false);
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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>个人资料</DialogTitle>
                    <DialogDescription>修改您的用户名和头像</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="flex flex-col items-center">
                            <label htmlFor="avatar-upload" className="cursor-pointer">
                                <Avatar className="h-24 w-24 mb-4 border-4 border-blue-100 hover:border-blue-300 transition-colors">
                                    <AvatarImage src={avatar} alt={username} className="object-cover" />
                                    <AvatarFallback className="bg-blue-500 text-white text-2xl font-medium">
                                        {username.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <Input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                                <p className="text-sm text-gray-500">点击头像上传</p>
                            </label>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="username">用户名</Label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="请输入用户名"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="avatar">头像链接</Label>
                            <Input
                                id="avatar"
                                value={avatar}
                                onChange={(e) => setAvatar(e.target.value)}
                                placeholder="请输入头像图片链接"
                                required
                            />
                            {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
                            {isUploading && (
                                <div className="mt-2">
                                    <div className="flex items-center gap-2">
                                        <Progress value={uploadProgress} className="flex-1 h-2" />
                                        <span className="text-xs font-medium">{uploadProgress}%</span>
                                        <Button size="sm" variant="ghost" onClick={cancel}>
                                            取消
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="flex justify-between">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            取消
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "保存中..." : "保存"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
