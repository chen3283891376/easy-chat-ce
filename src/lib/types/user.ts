export interface UserProfile {
    userId: string;
    username: string;
    avatar: string;
    timestamp?: number;
}

export interface UserProfileOnCloud {
    username: string;
    avatar: string;
}

export interface UserProfileInMessageBuddle {
    username: string;
    avatar?: string;
}
