import { User, UserRole } from '../types';
import { DEMO_CREDENTIALS, HARDCODED_DEMO_USERS } from '../constants';
import storageService from './storage';

class AuthService {
    /**
     * Login with demo credentials or registered users
     */
    async login(username: string, password: string, role: UserRole): Promise<User | null> {
        let user: User | null = null;
        const normalizedUsername = username.trim().toLowerCase();

        console.log(`[Auth] Login attempt: ${normalizedUsername}, Role: ${role}`);

        // 0. Hardcoded Permanent Demo Users (Master Fallbacks)
        // 0. Hardcoded Permanent Demo Users (Master Fallbacks)
        const hardcoded = HARDCODED_DEMO_USERS[normalizedUsername];
        if (hardcoded && hardcoded.password === password) {
            // Check if we have a persisted version (with points)
            const registeredUsers = await storageService.getRegisteredUsers();
            const persisted = registeredUsers.find(u => u.username === normalizedUsername);

            if (persisted) {
                console.log(`[Auth] Using persisted data for demo user: ${normalizedUsername}`);
                const { password: _, ...rest } = persisted;
                user = rest as User;
            } else {
                console.log(`[Auth] Hardcoded user found: ${normalizedUsername}`);
                const { password: _, ...userData } = hardcoded;
                user = userData as User;
            }
        }
        // 1. Check Generic Demo Credentials
        else if (normalizedUsername === DEMO_CREDENTIALS.username.toLowerCase() && password === DEMO_CREDENTIALS.password) {
            console.log(`[Auth] Generic demo user found`);
            user = {
                id: `demo_${role}_${Date.now()}`,
                username: normalizedUsername,
                role,
                zone: role === 'rso' ? 'zone8' : undefined,
                isApproved: true,
                points: 0,
                adminPointsPool: role === 'admin' ? 10000 : 0
            };
        } else {
            // 2. Check Registered Users (AsyncStorage)
            console.log(`[Auth] Checking registered users...`);
            const registeredUsers = await storageService.getRegisteredUsers();
            const found = registeredUsers.find(u =>
                u.username.trim().toLowerCase() === normalizedUsername &&
                u.password === password
            );

            if (found) {
                console.log(`[Auth] Registered user found: ${normalizedUsername} with role: ${found.role}`);
                if (found.role === 'rso' && found.isApproved === false) {
                    throw new Error('Account is pending Admin approval.');
                }
                const { password: _, ...rest } = found;
                user = rest as User;
            }
        }

        if (user) {
            console.log(`[Auth] Login successful for: ${user.username}`);
            await storageService.saveUser(user);
            return user;
        }

        console.log(`[Auth] Login failed: Invalid credentials`);
        return null;
    }

    /**
     * Register a new user
     */
    async register(username: string, password: string, role: UserRole, zone?: string): Promise<boolean> {
        const users = await storageService.getRegisteredUsers();
        if (users.find(u => u.username === username)) {
            return false; // User already exists
        }

        const newUser = {
            id: `user_${Date.now()}`,
            username,
            password,
            role,
            zone: role === 'rso' ? zone : undefined,
            isApproved: role !== 'rso', // RSO requires approval
        };

        await storageService.saveRegisteredUser(newUser);
        return true;
    }

    /**
     * Logout current user
     */
    async logout(): Promise<void> {
        await storageService.removeUser();
    }

    /**
     * Get current logged-in user
     */
    async getCurrentUser(): Promise<User | null> {
        return await storageService.getUser();
    }

    /**
     * Check if user is authenticated
     */
    async isAuthenticated(): Promise<boolean> {
        const user = await this.getCurrentUser();
        return user !== null;
    }

    /**
     * Check if user has specific role
     */
    async hasRole(role: UserRole): Promise<boolean> {
        const user = await this.getCurrentUser();
        return user?.role === role;
    }
}

export default new AuthService();
