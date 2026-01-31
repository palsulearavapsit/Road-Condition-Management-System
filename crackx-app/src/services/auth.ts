import { User, UserRole } from '../types';
import { DEMO_CREDENTIALS } from '../constants';
import storageService from './storage';

class AuthService {
    /**
     * Login with demo credentials or registered users
     */
    async login(username: string, password: string, role: UserRole): Promise<User | null> {
        let user: User | null = null;

        // 0. Hardcoded Admin - Always allow if credentials match, regardless of selected role
        if (username === 'admin' && password === 'admin123') {
            user = {
                id: 'admin_master',
                username: 'admin',
                role: 'admin',
            };
        }
        // 1. Check Demo Credentials (Only for Non-Admin roles now, or if demo user is wanted)
        else if (username === DEMO_CREDENTIALS.username && password === DEMO_CREDENTIALS.password) {
            user = {
                id: `demo_${role}_${Date.now()}`,
                username,
                role,
                zone: role === 'rso' ? 'zone8' : undefined,
                isApproved: true
            };
        } else {
            // 2. Check Registered Users
            const registeredUsers = await storageService.getRegisteredUsers();
            const found = registeredUsers.find(u => u.username === username && u.password === password && u.role === role);

            if (found) {
                if (found.role === 'rso' && found.isApproved === false) {
                    throw new Error('Account is pending Admin approval.');
                }
                const { password, ...rest } = found;
                user = rest as User;
            }
        }

        if (user) {
            await storageService.saveUser(user);
            return user;
        }

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
