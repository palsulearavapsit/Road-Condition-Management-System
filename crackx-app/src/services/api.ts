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
            const formData = new FormData();

            // Reconstruct report JSON for backend format
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
}

export default new ApiService();
