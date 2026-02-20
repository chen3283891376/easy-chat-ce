// hooks/useUsername.ts
import { useState, useEffect } from 'react';

export function useUsername() {
    const [username, setUsername] = useState<string>('guest');
    const [isEditing, setIsEditing] = useState(false);
    const [editInput, setEditInput] = useState('');

    useEffect(() => {
        const stored = localStorage.getItem('username');
        if (stored) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setUsername(stored);
        } else {
            const name = window.prompt('请输入用户名（将保存在本地）', '匿名');
            if (name) {
                localStorage.setItem('username', name);
                setUsername(name);
            }
        }
    }, []);

    const startEditing = () => {
        setEditInput(username);
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
    };

    const saveUsername = (newName: string) => {
        setUsername(newName);
        localStorage.setItem('username', newName);
        setIsEditing(false);
    };

    return {
        username,
        isEditing,
        editInput,
        setEditInput,
        startEditing,
        cancelEditing,
        saveUsername,
    };
}
