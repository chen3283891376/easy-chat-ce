import { AvatarGroupCount } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type Message = {
    username: string;
    msg: string;
    time: number;
};

type MessageBubbleProps = {
    message: Message;
    currentUsername: string;
    formatTime: (timestamp: number) => string;
};

export const MessageBubble = ({ message, currentUsername, formatTime }: MessageBubbleProps) => {
    const isCurrentUser = message.username === currentUsername;

    return (
        <div className={cn('flex mb-4', isCurrentUser ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[70%] flex items-start gap-3', { 'flex-row-reverse': isCurrentUser })}>
                <AvatarGroupCount>{message.username ? message.username[0] : '?'}</AvatarGroupCount>
                <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}>
                    <div
                        className={cn(
                            'flex flex-col max-w-xs sm:max-w-sm lg:max-w-md',
                            isCurrentUser ? 'items-end' : 'items-start',
                        )}
                    >
                        <div className={`flex gap-1 min-w-12 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                            <span className="text-xs truncate">{message.username}</span>
                            <span className="text-xs">{formatTime(message.time)}</span>
                        </div>
                        <div className={cn('flex items-end gap-2', isCurrentUser ? 'flex-row-reverse' : 'flex-row')}>
                            <div
                                className={`rounded-2xl px-4 py-2 shadow-sm ${
                                    isCurrentUser
                                        ? 'bg-primary text-(--color-background) rounded-br-none'
                                        : 'bg-surface border border-border text-text-primary rounded-bl-none'
                                }`}
                            >
                                <p className="text-sm wrap-break-word whitespace-pre-wrap">{message.msg}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
