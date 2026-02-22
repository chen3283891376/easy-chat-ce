import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useState } from "react";
import { useUsername } from "@/hooks/useUsername.ts";
import * as z from "zod";
import type { MouseEvent } from "react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { ValidationError } from "@/lib/types";

const MAX_USERNAME_LENGTH = 20;

export default function InitProfilePage() {
    const [name, setName] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string | null>("");
    const { saveUsername } = useUsername();

    const usernameSchema = z.object({
        username: z.string().min(1, "用户名不得为空").max(MAX_USERNAME_LENGTH, "用户名不得超过二十字"),
    });

    function setUsername(e: MouseEvent<HTMLButtonElement>) {
        e.preventDefault();

        const result = usernameSchema.safeParse({ username: name });

        if (!result.success) {
            let errors: ValidationError[] = [];

            try {
                errors = JSON.parse(result.error.message) as ValidationError[];
            } catch {
                errors = [{ message: "验证失败" }];
            }

            setErrorMessage(errors[0]?.message || "验证失败");
            return;
        }

        saveUsername(name);

        // 刷新页面
        window.location.href = "/";
    }

    return (
        <div className="flex justify-center items-center w-screen h-screen">
            <Card className="w-md max-w-md">
                <CardHeader>
                    <CardTitle>输入一个用户名</CardTitle>
                    <CardDescription>
                        在使用EasyChat Community Edition之前，你需要为你的账号设立一个名称
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Field data-invalid={errorMessage !== null && errorMessage.length > 0}>
                        <FieldLabel>用户名</FieldLabel>
                        <Input
                            placeholder="请输入一个用户名"
                            onChange={(e) => {
                                setName(e.target.value);
                            }}
                            aria-invalid={errorMessage !== null && errorMessage.length > 0}
                        />
                        {errorMessage !== null && errorMessage.length > 0 && (
                            <FieldDescription className="text-red-500">{errorMessage}</FieldDescription>
                        )}
                    </Field>
                </CardContent>

                <CardFooter>
                    <Button onClick={setUsername} className="cursor-pointer">
                        确认
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
