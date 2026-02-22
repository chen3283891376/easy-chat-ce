import { Field, FieldDescription, FieldLabel } from '@/components/ui/field.tsx';
import { Input } from '@/components/ui/input.tsx';

interface UploadFileProps {
    setSelectedFile: (value: File) => void;
}

export default function UploadFile({ setSelectedFile }: UploadFileProps) {
    return (
        <div>
            <Field>
                <FieldLabel htmlFor="file">文件</FieldLabel>
                <Input
                    id="file"
                    type="file"
                    onChange={e => {
                        const file = e.target.files?.[0];
                        if (file != null) {
                            setSelectedFile(file);
                        }
                    }}
                />
                <FieldDescription>选择一个文件以供上传</FieldDescription>
            </Field>
        </div>
    );
}
