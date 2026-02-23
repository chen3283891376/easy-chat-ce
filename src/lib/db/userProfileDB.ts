import Dexie from "dexie";
import type { Table } from "dexie";
import type { UserProfile } from "../types/user";

class UserProfileDB extends Dexie {
    userProfiles!: Table<UserProfile, string>;

    constructor() {
        super("UserProfileDB");
        this.version(1).stores({
            userProfiles: "userId, username, avatar, timestamp",
        });
    }

    async getProfile(userId: string): Promise<UserProfile | null> {
        return (await this.userProfiles.get(userId)) || null;
    }

    async saveProfile(profile: UserProfile): Promise<void> {
        await this.userProfiles.put({
            ...profile,
            timestamp: Date.now(),
        });
    }

    async clear(): Promise<void> {
        await this.userProfiles.clear();
    }
}

export const userProfileDB = new UserProfileDB();
