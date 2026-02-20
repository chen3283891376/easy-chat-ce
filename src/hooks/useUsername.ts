import { useState } from 'react';

export function useUsername() {
    const [isEditing, setIsEditing] = useState(false);
    const [editInput, setEditInput] = useState('');
    const [username, setUsername] = useState<string | null>(() => localStorage.getItem('username'));

    const startEditing = () => {
        if (!username) throw new Error('请先设立一个用户名');

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
