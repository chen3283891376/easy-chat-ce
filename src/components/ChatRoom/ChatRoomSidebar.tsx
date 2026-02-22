import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteIcon, EditIcon, CheckIcon, XIcon, PlusIcon, LogInIcon } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuShortcut,
    ContextMenuTrigger,
} from "@/components/ui/context-menu.tsx";
import type { Room } from "@/lib/types";

interface ChatRoomSidebarProps {
    roomList: Room[];
    currentRoomId: number;
    username: string;
    isEditingName: boolean;
    editNameInput: string;
    isCreatingRoom: boolean;
    isConnected: boolean;
    showNameInput: boolean;
    showIDInput: boolean;
    pendingRoomName: string;
    pendingRoomID: string;
    onRoomSelect: (_roomId: number) => void;
    onRoomDelete: (_roomId: number) => void;
    onUsernameEditStart: () => void;
    onUsernameEditCancel: () => void;
    onUsernameEditInputChange: (_value: string) => void;
    onUsernameSave: (_newName: string) => void;
    onStartCreateRoom: () => void;
    onStartJoinRoom: () => void;
    onPendingRoomNameChange: (_value: string) => void;
    onPendingRoomIDChange: (_value: string) => void;
    onConfirmCreateRoom: () => Promise<void>;
    onCancelCreateRoom: () => void;
    onCancelJoinRoom: () => void;
    onJoinRoom: (_roomIdInput: string | null) => Promise<void>;
}

export function ChatRoomSidebar({
    roomList,
    currentRoomId,
    username,
    isEditingName,
    editNameInput,
    isCreatingRoom,
    isConnected,
    showNameInput,
    showIDInput,
    pendingRoomName,
    pendingRoomID,
    onRoomSelect,
    onRoomDelete,
    onUsernameEditStart,
    onUsernameEditCancel,
    onUsernameEditInputChange,
    onUsernameSave,
    onStartCreateRoom,
    onStartJoinRoom,
    onPendingRoomNameChange,
    onPendingRoomIDChange,
    onConfirmCreateRoom,
    onCancelCreateRoom,
    onCancelJoinRoom,
    onJoinRoom,
}: ChatRoomSidebarProps) {
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
                <div className="mb-2">当前用户：</div>
                <div className="mb-3 flex items-center justify-between">
                    {isEditingName ? (
                        <>
                            <Input
                                value={editNameInput}
                                onChange={(e) => {
                                    onUsernameEditInputChange(e.target.value);
                                }}
                                placeholder="请输入用户名"
                                className="w-24"
                            />
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                    onUsernameSave(editNameInput);
                                }}
                            >
                                <CheckIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={onUsernameEditCancel}>
                                <XIcon className="h-4 w-4" />
                            </Button>
                        </>
                    ) : (
                        <>
                            <span className="text-sm">{username}</span>
                            <Button className="ml-1" variant="outline" size="icon-sm" onClick={onUsernameEditStart}>
                                <EditIcon className="h-4 w-4" />
                            </Button>
                        </>
                    )}
                </div>

                <Separator className="my-4" />

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
            </div>
        </div>
    );
}
