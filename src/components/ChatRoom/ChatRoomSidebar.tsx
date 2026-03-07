import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteIcon, PlusIcon, LogInIcon, UserIcon, LogOutIcon } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/components/ui/context-menu.tsx";
import type { ApplyPrivateChatMessage, Room } from "@/lib/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { useState, memo, useEffect, useCallback } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AvatarImage, Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialog,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { formatTime } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatRoomSidebarProps {
    roomList: Room[];
    currentRoomId: number;
    isCreatingRoom: boolean;
    isConnected: boolean;
    showNameInput: boolean;
    showIDInput: boolean;
    pendingRoomName: string;
    pendingRoomID: string;
    setRoomList: (_roomList: Room[]) => void;
    onRoomSelect: (_roomId: number) => void;
    onRoomDelete: (_roomId: number) => void;
    onStartCreateRoom: () => void;
    onStartJoinRoom: () => void;
    onPendingRoomNameChange: (_value: string) => void;
    onPendingRoomIDChange: (_value: string) => void;
    onConfirmCreateRoom: () => Promise<void>;
    onCancelCreateRoom: () => void;
    onCancelJoinRoom: () => void;
    onJoinRoom: (_roomIdInput: string | null, roomname?: string) => Promise<void>;
    onOpenUserProfile: () => void;
    onLogout: () => void;

    getApplyList: () => Promise<ApplyPrivateChatMessage[]>;
    acceptApply: (_applyId: number) => Promise<void>;
}

const ChatRoomSidebar = memo(function ChatRoomSidebar({
    roomList,
    currentRoomId,
    isCreatingRoom,
    isConnected,
    showNameInput,
    showIDInput,
    pendingRoomName,
    pendingRoomID,
    setRoomList,
    onRoomSelect,
    onRoomDelete,
    onStartCreateRoom,
    onStartJoinRoom,
    onPendingRoomNameChange,
    onPendingRoomIDChange,
    onConfirmCreateRoom,
    onCancelCreateRoom,
    onCancelJoinRoom,
    onJoinRoom,
    onOpenUserProfile,
    onLogout,
    getApplyList,
    acceptApply
}: ChatRoomSidebarProps) {
    const [renamingRoomId, setRenamingRoomId] = useState<number | null>(null);
    const [renameInputValue, setRenameInputValue] = useState("");
    const { currentProfile } = useUserProfile();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);
    const [applyList, setApplyList] = useState<ApplyPrivateChatMessage[]>([]);
    const [isAccepting, setIsAccepting] = useState<number | null>(null);

    const fetchApplyList = useCallback(async () => {
        try {
            const list = await getApplyList();
            const pendingApplies = list.filter(apply => apply.applyed !== true);
            setApplyList(pendingApplies);
        } catch (error) {
            console.error("获取申请列表失败:", error);
        }
    }, [getApplyList]);

    useEffect(() => {
        fetchApplyList();
    }, [fetchApplyList]);

    const handleAcceptApply = useCallback(async (item: ApplyPrivateChatMessage) => {
        if (!item.roomId) {
            toast.error("无效的房间ID");
            return;
        }
        if (JSON.parse(localStorage.getItem('roomList') || '[]').some((room: Room) => room.id === item.roomId)) {
            toast.error("房间已存在");
            return;
        }

        setIsAccepting(item.roomId);

        try {
            // 移除已处理的申请
            setApplyList(prev => prev.filter(apply => 
                apply.time !== item.time || apply.roomId !== item.roomId
            ));
            
            await onJoinRoom(item.roomId.toString(), item.applyer);
            
            toast.success("已接受申请并加入私聊房间");
        } catch (error) {
            console.error("接受申请失败:", error);
            toast.error("操作失败，请重试");
            await fetchApplyList();
        } finally {
            setIsAccepting(null);
        }
    }, [acceptApply, onJoinRoom, fetchApplyList]);

    const handleRename = () => {
        if (!renameInputValue.trim()) return;
        const newRoomList = [...roomList];
        const roomIndex = roomList.findIndex((room) => room.id === renamingRoomId);
        if (roomIndex >= 0) {
            newRoomList[roomIndex].title = renameInputValue;
            setRoomList(newRoomList);
            localStorage.setItem("roomList", JSON.stringify(newRoomList));
        }
        setRenamingRoomId(null);
        setRenameInputValue("");
    };

    const handleMenuClick = (action: string) => {
        if (action === "edit") {
            onOpenUserProfile();
        }
    };

    const groupRooms = roomList;

    return (
        <div className="w-56 max-h-screen p-4 bg-gray-50 flex flex-col justify-between border-r">
            <div className="flex flex-col h-full overflow-hidden">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight mb-2">选择聊天室</h4>
                
                <Tabs defaultValue="group" className="w-full flex flex-col flex-1 overflow-hidden">
                    <TabsList className="w-full shrink-0">
                        <TabsTrigger value="group" className="flex-1">群聊</TabsTrigger>
                        <TabsTrigger value="private" className="flex-1">私聊</TabsTrigger>
                    </TabsList>
                    
                    {/* 群聊列表 */}
                    <TabsContent value="group" className="mt-2 flex-1 overflow-hidden">
                        <ScrollArea className="h-full p-2 border rounded-sm">
                            {groupRooms.length > 0 ? (
                                groupRooms.map((item) => (
                                    <div key={item.id} className="mb-2">
                                        <ContextMenu>
                                            <ContextMenuTrigger className="w-full">
                                                <Button
                                                    disabled={!isConnected}
                                                    variant={currentRoomId === item.id ? "default" : "secondary"}
                                                    onClick={() => onRoomSelect(item.id)}
                                                    className="w-full"
                                                >
                                                    {item.id === 185655560 ? "项目大群" : item.title}
                                                </Button>
                                            </ContextMenuTrigger>
                                            <ContextMenuContent>
                                                <ContextMenuGroup>
                                                    <ContextMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRoomDelete(item.id);
                                                        }}
                                                    >
                                                        退出
                                                        <ContextMenuShortcut>
                                                            <DeleteIcon />
                                                        </ContextMenuShortcut>
                                                    </ContextMenuItem>
                                                    <ContextMenuItem
                                                        disabled={!isConnected}
                                                        onClick={() => onRoomSelect(item.id)}
                                                    >
                                                        进入
                                                        <ContextMenuShortcut>
                                                            <LogInIcon />
                                                        </ContextMenuShortcut>
                                                    </ContextMenuItem>
                                                </ContextMenuGroup>
                                            </ContextMenuContent>
                                        </ContextMenu>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-sm text-gray-500 py-4">暂无群聊</div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                    
                    {/* 私聊列表 */}
                    <TabsContent value="private" className="mt-2 flex-1 overflow-hidden">
                        <ScrollArea className="h-full p-2 border rounded-sm">
                            {applyList.length > 0 ? (
                                applyList.map((item) => (
                                    <div
                                        key={`${item.time}-${item.roomId}`}
                                        className="mb-3 p-3 rounded-lg bg-white border border-gray-200 shadow-sm"
                                    >
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-gray-800">
                                                    {item.applyer || "匿名用户"}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {formatTime(item.time)}
                                                </span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => handleAcceptApply(item)}
                                                disabled={isAccepting === item.roomId || !isConnected}
                                            >
                                                {isAccepting === item.roomId ? "处理中..." : "接受私聊申请"}
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-sm text-gray-500 py-4">暂无私聊申请</div>
                            )}
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
            </div>

            <div className="my-4" />

            <div className="mt-4">
                <div className="mt-4 flex flex-col gap-2">
                    <Button
                        disabled={isCreatingRoom || !isConnected || showNameInput}
                        size="sm"
                        onClick={onStartCreateRoom}
                    >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        创建房间
                    </Button>

                    {showNameInput && (
                        <div className="flex flex-col gap-2 p-2 border rounded bg-white">
                            <Input
                                value={pendingRoomName}
                                onChange={(e) => onPendingRoomNameChange(e.target.value)}
                                placeholder="请输入房间名称"
                                autoFocus
                            />
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => void onConfirmCreateRoom()}
                                    disabled={pendingRoomName.length === 0}
                                >
                                    确认
                                </Button>
                                <Button size="sm" variant="outline" onClick={onCancelCreateRoom}>
                                    取消
                                </Button>
                            </div>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isCreatingRoom || !isConnected || showIDInput}
                        onClick={onStartJoinRoom}
                    >
                        <LogInIcon className="h-4 w-4 mr-1" />
                        加入房间
                    </Button>

                    {showIDInput && (
                        <div className="flex flex-col gap-2 p-2 border rounded bg-white">
                            <Input
                                value={pendingRoomID}
                                onChange={(e) => onPendingRoomIDChange(e.target.value)}
                                placeholder="请输入房间ID"
                                autoFocus
                            />
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => void onJoinRoom(pendingRoomID)}
                                    disabled={pendingRoomID.length === 0}
                                >
                                    确认
                                </Button>
                                <Button size="sm" variant="outline" onClick={onCancelJoinRoom}>
                                    取消
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {currentProfile !== null && (
                    <>
                        <Separator className="my-4" />

                        <ContextMenu>
                            <ContextMenuTrigger className="w-full cursor-pointer">
                                <div
                                    className="mb-3 p-3 rounded-lg bg-white border border-gray-200 shadow-sm transition-all duration-200 hover:shadow-md"
                                    onClick={() => toast.info("请使用点击右键唤起菜单")}
                                >
                                    <div className="flex items-center gap-3 w-full">
                                        <Avatar className="h-10 w-10 border-2 border-blue-100">
                                            <AvatarImage
                                                src={currentProfile.avatar}
                                                alt={currentProfile.username}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-blue-500 text-white font-medium">
                                                {currentProfile.username.charAt(0).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-sm font-medium text-gray-800 truncate block">
                                                {currentProfile.username}
                                            </span>
                                            <span className="text-xs text-gray-500 truncate block">
                                                {currentProfile.userId.substring(0, 8)}...
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuGroup>
                                    <ContextMenuItem onClick={() => handleMenuClick("edit")}>
                                        编辑
                                        <ContextMenuShortcut>
                                            <UserIcon />
                                        </ContextMenuShortcut>
                                    </ContextMenuItem>

                                    <ContextMenuItem onClick={() => setShowLogoutDialog(true)}>
                                        退登
                                        <ContextMenuShortcut>
                                            <LogOutIcon />
                                        </ContextMenuShortcut>
                                    </ContextMenuItem>
                                </ContextMenuGroup>
                            </ContextMenuContent>
                        </ContextMenu>
                    </>
                )}
            </div>

            <Dialog
                open={renamingRoomId !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setRenamingRoomId(null);
                        setRenameInputValue("");
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>重命名房间</DialogTitle>
                    </DialogHeader>
                    <Input
                        placeholder="请输入新的房间名"
                        value={renameInputValue}
                        autoFocus
                        onChange={(e) => setRenameInputValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && renameInputValue.trim()) {
                                handleRename();
                            }
                        }}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setRenamingRoomId(null);
                                setRenameInputValue("");
                            }}
                        >
                            取消
                        </Button>
                        <Button onClick={handleRename} disabled={!renameInputValue.trim()}>
                            确认
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>你确定要退出登录吗？</AlertDialogTitle>
                        <AlertDialogDescription>退出后如果没有记住用户ID那么数据将全部丢失</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>取消</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={() => {
                                setShowLogoutDialog(false);
                                onLogout();
                            }}
                        >
                            登出
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
});

export { ChatRoomSidebar };
