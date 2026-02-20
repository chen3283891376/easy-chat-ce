import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteIcon, EditIcon, CheckIcon, XIcon, PlusIcon, LogInIcon } from 'lucide-react';

type Room = {
    id: number;
    title: string;
};

interface ChatRoomSidebarProps {
    roomList: Room[];
    currentRoomId: number;
    username: string;
    isEditingName: boolean;
    editNameInput: string;
    isCreatingRoom: boolean;
    isConnected: boolean;
    onRoomSelect: (roomId: number) => void;
    onRoomDelete: (roomId: number) => void;
    onUsernameEditStart: () => void;
    onUsernameEditCancel: () => void;
    onUsernameEditInputChange: (value: string) => void;
    onUsernameSave: (newName: string) => void;
    onCreateRoom: () => void;
    onJoinRoom: (roomId: string | null) => void;
}

export function ChatRoomSidebar({
    roomList,
    currentRoomId,
    username,
    isEditingName,
    editNameInput,
    isCreatingRoom,
    isConnected,
    onRoomSelect,
    onRoomDelete,
    onUsernameEditStart,
    onUsernameEditCancel,
    onUsernameEditInputChange,
    onUsernameSave,
    onCreateRoom,
    onJoinRoom,
}: ChatRoomSidebarProps) {
    return (
        <div className="w-56 p-4 bg-gray-50 flex flex-col border-r">
            <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">选择聊天室</h4>
            <ScrollArea className="flex-1 max-h-1/2 p-2 my-2 border rounded">
                {roomList.map((item, index) => (
                    <div key={item.id}>
                        <div className="mb-2 flex items-center gap-2">
                            <Button
                                disabled={!isConnected}
                                variant={currentRoomId === item.id ? 'default' : 'secondary'}
                                onClick={() => onRoomSelect(item.id)}
                                className="flex-1"
                            >
                                {item.title}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={e => {
                                    e.stopPropagation();
                                    onRoomDelete(item.id);
                                }}
                                className="shrink-0"
                                title="删除房间"
                            >
                                <DeleteIcon className="h-4 w-4" />
                            </Button>
                        </div>
                        {index !== roomList.length - 1 && <Separator className="my-2" />}
                    </div>
                ))}
            </ScrollArea>
            <Separator className="my-2" />
            <div className="mt-4">
                <div className="mb-2">当前用户：</div>
                <div className="mb-3 flex items-center">
                    {isEditingName ? (
                        <>
                            <Input
                                value={editNameInput}
                                onChange={e => onUsernameEditInputChange(e.target.value)}
                                onBlur={onUsernameEditCancel}
                                placeholder="请输入用户名"
                                className="w-24"
                            />
                            <Button variant="ghost" size="icon-sm" onClick={() => onUsernameSave(editNameInput)}>
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
                    <Button disabled={isCreatingRoom || !isConnected} size="sm" onClick={onCreateRoom}>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        创建房间
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={isCreatingRoom}
                        onClick={() => {
                            const roomId = window.prompt('请输入房间ID：');
                            onJoinRoom(roomId);
                        }}
                    >
                        <LogInIcon className="h-4 w-4 mr-1" />
                        加入房间
                    </Button>
                </div>
            </div>
        </div>
    );
}
