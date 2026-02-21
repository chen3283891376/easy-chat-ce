import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { IFile } from '@/hooks/useChatMessages';
import { DownloadIcon, FileAudioIcon, FileTextIcon, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';

export type Message = {
    username: string;
    msg: string;
    time: number;
    type?: 'name' | 'share';
    recalled?: boolean;
    quoteTimeStamp?: number;
};

type FileDisplayProps = {
    fileData: IFile;
    isCurrentUser?: boolean;
};

const isImageFile = (filename: string): boolean => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'];
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? imageExtensions.includes(ext) : false;
};

const isAudioFile = (filename: string): boolean => {
    const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac'];
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? audioExtensions.includes(ext) : false;
};

const isVideoFile = (filename: string): boolean => {
    const videoExtensions = ['mp4', 'webm', 'ogg', 'avi', 'mkv'];
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext ? videoExtensions.includes(ext) : false;
}

export const FileDisplay = ({ fileData, isCurrentUser }: FileDisplayProps) => {
    const [imageError, setImageError] = useState(false);
    const [audioError, setAudioError] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    const resetImageError = () => setImageError(false);
    const resetAudioError = () => setAudioError(false);
    const resetVideoError = () => setVideoError(false);

    const downloadUrl = fileData
        ? `https://livefile.xesimg.com/programme/python_assets/844958913c304c040803a9d7f79f898e.html?name=${fileData.name}&file=${fileData.link.split('python_assets/')[1]}`
        : '';

    const isImage = isImageFile(fileData.name) && !imageError;
    const isAudio = isAudioFile(fileData.name) && !audioError;
    const isVideo = isVideoFile(fileData.name) && !videoError;

    return (
        <div className="flex flex-col gap-1 w-full max-w-md">
            {(isImage || isVideo) ? (
                <div className="relative group">
                    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                        <DialogTrigger asChild>
                            {/* <img
                                src={fileData?.link}
                                alt={fileData?.name}
                                className="max-w-full max-h-64 rounded-t-2xl rounded-br-2xl object-contain cursor-zoom-in"
                                onError={() => setImageError(true)}
                                onLoad={resetImageError}
                            /> */}
                            {isImage ? (
                                <img
                                    src={fileData?.link}
                                    alt={fileData?.name}
                                    className="max-w-full max-h-64 rounded-t-2xl rounded-br-2xl object-contain cursor-zoom-in"
                                    onError={() => setImageError(true)}
                                    onLoad={resetImageError}
                                />
                            ) : (
                                <video
                                    src={fileData?.link}
                                    controls
                                    className="max-w-full max-h-64 rounded-t-2xl rounded-br-2xl object-contain cursor-zoom-in"
                                    onError={() => setVideoError(true)}
                                    onLoad={resetVideoError}
                                />
                            )}
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl w-full h-auto p-0 bg-transparent border-none shadow-none">
                            <div className="relative flex items-center justify-center">
                                {isImage ? (
                                    <img
                                        src={fileData?.link}
                                        alt={fileData?.name}
                                        className="max-w-full max-h-[90vh] object-contain"
                                    />
                                ) : (
                                    <video
                                        src={fileData?.link}
                                        controls
                                        className="max-w-full max-h-[90vh] object-contain"
                                    />
                                )}
                                <DialogClose className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                                    <X size={20} />
                                </DialogClose>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <a
                        href={downloadUrl}
                        className={cn(
                            'absolute top-2 right-2 p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100',
                            isCurrentUser
                                ? 'bg-white/20 text-white hover:bg-white/30'
                                : 'bg-background/80 text-text-secondary hover:bg-background',
                        )}
                        title="下载"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                    >
                        <DownloadIcon size={18} />
                    </a>
                </div>
            ) : (
                <div className="flex flex-col gap-2 p-3 border rounded-lg transition-colors opacity-70">
                    <div className={cn('flex items-center gap-3')}>
                        <div
                            className={cn(
                                'w-10 h-10 border rounded flex items-center justify-center shrink-0',
                                isCurrentUser
                                    ? 'bg-white/10 border-white/20 dark:bg-black/10 dark:border-black/20'
                                    : 'bg-background border-border',
                            )}
                        >
                            {isAudio ? (
                                <FileAudioIcon
                                    size={20}
                                    className={cn(
                                        isCurrentUser
                                            ? 'text-white/80 dark:text-black/80'
                                            : 'text-text-secondary',
                                    )}
                                />
                            ) : (
                                <FileTextIcon
                                    size={20}
                                    className={cn(
                                        isCurrentUser
                                            ? 'text-white/80 dark:text-black/80'
                                            : 'text-text-secondary',
                                    )}
                                />
                            )}
                        </div>
                        <div className="flex-1 min-w-25">
                            <p className="text-sm font-medium truncate">
                                {fileData?.name || '未知文件名'}
                            </p>
                            <p className="text-xs text-gray-500">
                                {fileData?.size || '未知大小'}
                            </p>
                        </div>
                        <a
                            href={downloadUrl}
                            className={cn(
                                'p-2 rounded transition-colors shrink-0',
                                isCurrentUser && 'text-white dark:text-black',
                            )}
                            title="下载"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <DownloadIcon size={18} />
                        </a>
                    </div>
                    {isAudio && (
                        <audio
                            src={fileData?.link}
                            controls
                            className={cn(
                                'w-full h-10',
                                isCurrentUser ? 'bg-white/10' : 'bg-background',
                            )}
                            onError={() => setAudioError(true)}
                            onLoad={resetAudioError}
                        />
                    )}
                </div>
            )}
        </div>
    );
};