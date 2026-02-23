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
import type { Room } from "@/lib/types";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { useState, memo } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AvatarImage, Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

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
    onJoinRoom: (_roomIdInput: string | null) => Promise<void>;
    onOpenUserProfile: () => void;
    onLogout: () => void;
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
}: ChatRoomSidebarProps) {
    const [renamingRoomId, setRenamingRoomId] = useState<number | null>(null);
    const [renameInputValue, setRenameInputValue] = useState("");
    const { currentProfile } = useUserProfile();

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
        } else if (action === "logout") {
            if (window.confirm("确定要注销账号吗？这将清除所有本地数据")) {
                onLogout();
            }
        }
    };

    return (
        <div className="w-56 p-4 bg-gray-50 flex flex-col justify-between border-r">
            <div className="h-full">
                <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">选择聊天室</h4>
                <ScrollArea className="flex-1 max-h-full h-full p-2 my-2 border rounded-sm">
                    {roomList.map((item) => (
                        <div key={item.id}>
                            <div className="mb-2 flex items-center gap-2">
                                <ContextMenu>
                                    <ContextMenuTrigger className="w-full">
                                        <Button
                                            disabled={!isConnected}
                                            variant={currentRoomId === item.id ? "default" : "secondary"}
                                            onClick={() => {
                                                onRoomSelect(item.id);
                                            }}
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
                                                onClick={() => {
                                                    onRoomSelect(item.id);
                                                }}
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
                        </div>
                    ))}
                </ScrollArea>
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
                                onChange={(e) => {
                                    onPendingRoomNameChange(e.target.value);
                                }}
                                placeholder="请输入房间名称"
                                autoFocus
                            />
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => {
                                        void onConfirmCreateRoom();
                                    }}
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
                                onChange={(e) => {
                                    onPendingRoomIDChange(e.target.value);
                                }}
                                placeholder="请输入房间ID"
                                autoFocus
                            />
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => {
                                        void onJoinRoom(pendingRoomID);
                                    }}
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
                                        编辑资料
                                        <ContextMenuShortcut>
                                            <UserIcon />
                                        </ContextMenuShortcut>
                                    </ContextMenuItem>
                                    <ContextMenuItem onClick={() => handleMenuClick("logout")}>
                                        注销账号
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
        </div>
    );
});

export { ChatRoomSidebar };
