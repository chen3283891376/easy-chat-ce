import { useState } from "react";
import { toast } from "sonner";
import { calcFileMD5, getOSSUploadParams, formatFileSize, type UploadParam } from "@/lib/upload/utils";
import { UploadFile } from "@/lib/upload/upload";
import type { IFile } from "@/lib/types";

export function useFileUpload() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [abortUpload, setAbortUpload] = useState<(() => void) | null>(null);

    async function upload(file: File): Promise<IFile> {
        try {
            setIsUploading(true);
            setUploadProgress(0);

            const md5 = await calcFileMD5(file);
            const params = await getOSSUploadParams(file.name, md5);
            const uploadParam: UploadParam = params as unknown as UploadParam;

            const { promise, abort } = UploadFile(file, uploadParam, {
                onProgress: function (percent) {
                    setUploadProgress(percent);
                },
                onAbort: function () {
                    toast.info("上传已取消");
                },
            });

            setAbortUpload(() => abort);
            await promise;

            const ext = file.name.split(".").pop();
            const link = `https://livefile.xesimg.com/programme/python_assets/${md5}${ext && ext.length > 0 ? "." + ext : ""}`;

            const result: IFile = {
                name: file.name,
                link,
                size: formatFileSize(file.size),
                time: new Date().toLocaleString(),
            };

            toast.success("上传成功");
            return result;
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "上传失败");
            throw error;
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setAbortUpload(null);
        }
    }

    function cancel() {
        if (abortUpload) {
            abortUpload();
        }
    }

    return {
        upload,
        cancel,
        isUploading,
        uploadProgress,
    };
}
