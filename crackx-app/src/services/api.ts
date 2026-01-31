import { Report } from '../types';
import { API_BASE_URL } from '../config/api';

class ApiService {
    async fetchReports(): Promise<Report[]> {
        const response = await fetch(`${API_BASE_URL}/reports`);
        if (!response.ok) throw new Error('Failed to fetch reports');
        const data = await response.json();
        return data.reports || [];
    }

    async fetchReportsByZone(zone: string): Promise<Report[]> {
        const response = await fetch(`${API_BASE_URL}/reports?zone=${zone}`);
        if (!response.ok) throw new Error('Failed to fetch zone reports');
        const data = await response.json();
        return data.reports || [];
    }

    async postReport(report: Report): Promise<boolean> {
        try {
            const reportsPayload = {
                reports: [report]
            };

            const response = await fetch(`${API_BASE_URL}/sync-reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reportsPayload),
            });

            return response.ok;
        } catch (error) {
            console.error('API Post Error:', error);
            return false;
        }
    }

    // User Management
    async fetchUsers(): Promise<any[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/users`);
            if (!response.ok) return [];
            const data = await response.json();
            return data.users || [];
        } catch (e) {
            return [];
        }
    }

    async registerUser(user: any): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user),
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    }

    async updateUser(username: string, updates: any): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL}/users/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, updates }),
            });
            return response.ok;
        } catch (e) {
            return false;
        }
    }
}

export default new ApiService();
