import { AvatarGroupCount } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { IFile } from "@/lib/types";
import { DownloadIcon, UndoIcon, QuoteIcon } from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuGroup,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu.tsx";
import { FileDisplay } from "./FileDisplay";
import type { Message } from "@/lib/types";
import { toast } from "sonner";

interface MessageBubbleProps {
    quoteMessage?: Message;
    message: Message;
    currentUsername: string;
    formatTime: (timestamp: number) => string;
    handleRecall: (message: Message) => void;
    setQuoteMessage: (message: Message | undefined) => void;
    keyString?: string;
}

export function MessageBubble({
    quoteMessage,
    message,
    currentUsername,
    formatTime,
    handleRecall,
    setQuoteMessage,
    keyString,
}: MessageBubbleProps) {
    const isCurrentUser = message.username === currentUsername;

    let fileData: IFile | null = null;
    let isMedia = false;
    if (message.type === "share") {
        try {
            const parsedData = JSON.parse(message.msg);
            if (parsedData && typeof parsedData === "object" && "name" in parsedData) {
                fileData = parsedData as IFile;
                const mediaExtensions = [
                    "jpg",
                    "jpeg",
                    "png",
                    "gif",
                    "webp",
                    "svg",
                    "bmp",
                    "mp4",
                    "webm",
                    "mov",
                    "avi",
                ];
                const ext = fileData.name.split(".").pop();
                isMedia = ext !== undefined && mediaExtensions.includes(ext.toLowerCase());
            }
        } catch {
            fileData = null;
        }
    }

    const downloadUrl =
        fileData && fileData.link && fileData.link.includes("python_assets/")
            ? `https://livefile.xesimg.com/programme/python_assets/844958913c304c040803a9d7f79f898e.html?name=${fileData.name}&file=${fileData.link.split("python_assets/")[1]}`
            : "";

    return (
        <div className={cn("flex mb-4", isCurrentUser ? "justify-end" : "justify-start")} key={keyString}>
            <div className={cn("max-w-[70%] flex items-start gap-3", isCurrentUser && "flex-row-reverse")}>
                <AvatarGroupCount>{message.username ? message.username[0] : "?"}</AvatarGroupCount>
                <div className={cn("flex mb-2", isCurrentUser ? "justify-end" : "justify-start")}>
                    <div
                        className={cn(
                            "flex flex-col max-w-xs sm:max-w-sm lg:max-w-md",
                            isCurrentUser ? "items-end" : "items-start",
                        )}
                    >
                        <div className={cn("flex gap-1 min-w-12", isCurrentUser ? "items-end" : "items-start")}>
                            <span className="text-xs truncate">{message.username}</span>
                            <span className="text-xs">{formatTime(message.time)}</span>
                        </div>

                        <div className={cn("flex items-end gap-2", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
                            <ContextMenu>
                                <ContextMenuTrigger>
                                    <div
                                        className={cn(
                                            "rounded-2xl shadow-sm",
                                            isMedia
                                                ? "bg-transparent p-0 rounded-none shadow-none"
                                                : isCurrentUser
                                                  ? "bg-primary text-background rounded-br-none px-4 py-2"
                                                  : "bg-surface border border-border text-text-primary rounded-bl-none px-4 py-2",
                                        )}
                                    >
                                        {quoteMessage && (
                                            <div
                                                className={cn(
                                                    "text-xs p-2 mb-2 rounded border-l-4 overflow-hidden",
                                                    isCurrentUser
                                                        ? "bg-indigo-900/30 border-indigo-400 text-indigo-100"
                                                        : "bg-slate-50 border-slate-400 text-slate-800",
                                                )}
                                            >
                                                <p className="font-bold mb-0.5">@{quoteMessage.username}</p>
                                                <div className="prose prose-sm max-w-none prose-p:my-0 prose-headings:my-1 prose-ul:my-0 prose-ol:my-0 prose-li:my-0 prose-pre:my-1">
                                                    {quoteMessage.type !== "share" ? (
                                                        quoteMessage.msg
                                                    ) : (
                                                        <FileDisplay
                                                            fileData={JSON.parse(quoteMessage.msg) as IFile}
                                                            isCurrentUser={isCurrentUser}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {message.type !== "share" ? (
                                            <p className="text-sm wrap-break-word whitespace-pre-wrap">{message.msg}</p>
                                        ) : (
                                            fileData && (
                                                <FileDisplay fileData={fileData} isCurrentUser={isCurrentUser} />
                                            )
                                        )}
                                    </div>
                                </ContextMenuTrigger>

                                {message.recalled === false && (
                                    <ContextMenuContent>
                                        <ContextMenuGroup>
                                            {message.type === "share" && downloadUrl !== "" && (
                                                <ContextMenuItem
                                                    onClick={() => {
                                                        if (downloadUrl !== "") {
                                                            const newWindow = window.open(downloadUrl, "_blank");
                                                            if (!newWindow) {
                                                                toast.error("弹窗被拦截，请允许浏览器弹窗后重试");
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <DownloadIcon />
                                                    下载
                                                </ContextMenuItem>
                                            )}
                                            {isCurrentUser && !message.recalled && (
                                                <ContextMenuItem
                                                    onClick={() => {
                                                        handleRecall(message);
                                                    }}
                                                >
                                                    <UndoIcon />
                                                    撤回
                                                </ContextMenuItem>
                                            )}
                                            <ContextMenuItem
                                                onClick={() => {
                                                    setQuoteMessage(message);
                                                }}
                                            >
                                                <QuoteIcon />
                                                引用
                                            </ContextMenuItem>
                                        </ContextMenuGroup>
                                    </ContextMenuContent>
                                )}
                            </ContextMenu>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
