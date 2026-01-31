import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Report } from '../types';
import { STORAGE_KEYS } from '../constants';
import apiService from './api';
import notificationService from './notifications';

class StorageService {
    // User Management
    async saveUser(user: User): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    }

    async getUser(): Promise<User | null> {
        const userStr = await AsyncStorage.getItem(STORAGE_KEYS.USER);
        return userStr ? JSON.parse(userStr) : null;
    }

    async removeUser(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEYS.USER);
    }

    // Registered Users
    async saveRegisteredUser(user: any): Promise<void> {
        // Try saving to backend first for persistence
        try {
            await apiService.registerUser(user);
        } catch (e) {
            console.log('User sync to backend failed');
        }

        const users = await this.getRegisteredUsers();
        if (!users.find(u => u.username === user.username)) {
            users.push(user);
            await AsyncStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
        }
    }

    async getRegisteredUsers(): Promise<any[]> {
        // Try fetching from backend first
        try {
            const onlineUsers = await apiService.fetchUsers();
            if (onlineUsers && onlineUsers.length > 0) {
                await AsyncStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(onlineUsers));
                return onlineUsers;
            }
        } catch (e) {
            console.log('Offline: Loading local users');
        }

        const usersStr = await AsyncStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
        return usersStr ? JSON.parse(usersStr) : [];
    }

    async updateRegisteredUser(username: string, updates: any): Promise<void> {
        // Sync to backend
        try {
            await apiService.updateUser(username, updates);
        } catch (e) {
            console.log('User update sync failed');
        }

        const users = await this.getRegisteredUsers();
        const index = users.findIndex(u => u.username === username);
        if (index >= 0) {
            users[index] = { ...users[index], ...updates };
            await AsyncStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(users));
        }
    }

    async deleteRegisteredUser(username: string): Promise<void> {
        // Attempt to delete from backend
        try {
            await apiService.deleteUser(username);
        } catch (e) {
            console.log('User delete sync failed');
        }

        // Get local users directly to avoid re-fetching stale data from backend
        const usersStr = await AsyncStorage.getItem(STORAGE_KEYS.REGISTERED_USERS);
        const users = usersStr ? JSON.parse(usersStr) : [];

        const filteredUsers = users.filter((u: any) => u.username !== username);
        await AsyncStorage.setItem(STORAGE_KEYS.REGISTERED_USERS, JSON.stringify(filteredUsers));
    }

    // Reports Management
    async saveReport(report: Report): Promise<void> {
        const reports = await this.getReports();
        const existingIndex = reports.findIndex(r => r.id === report.id);

        if (existingIndex >= 0) {
            reports[existingIndex] = report;
            // Notify if completed
            if (report.status === 'completed' && reports[existingIndex].status !== 'completed') {
                notificationService.scheduleCompletionNotification(report.id);
            }
        } else {
            reports.push(report);
            notificationService.scheduleReportSubmissionNotification(report.id);
        }

        await AsyncStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));

        // Attempt background sync
        try {
            await apiService.postReport(report);
        } catch (e) {
            console.log('Online sync failed, saving to queue');
        }
    }

    async getReports(): Promise<Report[]> {
        // Try fetching online first
        try {
            const onlineReports = await apiService.fetchReports();
            if (onlineReports && onlineReports.length > 0) {
                await AsyncStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(onlineReports));
                return onlineReports;
            }
        } catch (e) {
            console.log('Offline mode: Loading local reports');
        }

        const reportsStr = await AsyncStorage.getItem(STORAGE_KEYS.REPORTS);
        return reportsStr ? JSON.parse(reportsStr) : [];
    }

    async getReportById(id: string): Promise<Report | null> {
        const reports = await this.getReports();
        return reports.find(r => r.id === id) || null;
    }

    async getReportsByZone(zone: string): Promise<Report[]> {
        const reports = await this.getReports();
        return reports.filter(r => r.location.zone === zone);
    }

    async getReportsByCitizen(citizenId: string): Promise<Report[]> {
        const reports = await this.getReports();
        return reports.filter(r => r.citizenId === citizenId);
    }

    async deleteReport(id: string): Promise<void> {
        const reports = await this.getReports();
        const filtered = reports.filter(r => r.id !== id);
        await AsyncStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(filtered));
    }

    // Sync Queue Management
    async addToSyncQueue(reportId: string): Promise<void> {
        const queue = await this.getSyncQueue();
        if (!queue.includes(reportId)) {
            queue.push(reportId);
            await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
        }
    }

    async getSyncQueue(): Promise<string[]> {
        const queueStr = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
        return queueStr ? JSON.parse(queueStr) : [];
    }

    async removeFromSyncQueue(reportId: string): Promise<void> {
        const queue = await this.getSyncQueue();
        const filtered = queue.filter(id => id !== reportId);
        await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(filtered));
    }

    async clearSyncQueue(): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([]));
    }

    // Location Permission
    async saveLocationPermission(granted: boolean): Promise<void> {
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_PERMISSION, JSON.stringify(granted));
    }

    async getLocationPermission(): Promise<boolean | null> {
        const permStr = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_PERMISSION);
        return permStr ? JSON.parse(permStr) : null;
    }

    // Clear All Data
    async clearAll(): Promise<void> {
        await AsyncStorage.clear();
    }
}

export default new StorageService();
