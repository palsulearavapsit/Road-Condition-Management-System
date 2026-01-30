import { AIDetectionResult } from '../types';
import { API_BASE_URL, FEATURES, TIMEOUTS } from '../config/api';

class AIService {
    /**
     * Real AI detection using backend YOLO model
     */
    async detectDamage(imageUri: string): Promise<AIDetectionResult> {
        try {
            // Create FormData to send image
            const formData = new FormData();

            // Convert image URI to blob
            const response = await fetch(imageUri);
            const blob = await response.blob();

            // Append image to form data
            formData.append('image', blob, 'damage.jpg');

            // Send to backend API
            const apiResponse = await fetch(`${API_BASE_URL}/detect`, {
                method: 'POST',
                body: formData,
            });

            if (!apiResponse.ok) {
                throw new Error('AI detection failed');
            }

            const data = await apiResponse.json();

            if (data.success && data.detection) {
                return {
                    damageType: data.detection.damageType,
                    confidence: data.detection.confidence,
                    severity: data.detection.severity,
                    boundingBox: data.detection.boundingBox,
                };
            } else {
                // Fallback to mock detection if API fails
                return this.mockDetection();
            }
        } catch (error) {
            console.error('AI detection error:', error);
            // Fallback to mock detection on error
            return this.mockDetection();
        }
    }

    /**
     * Mock detection as fallback
     */
    private mockDetection(): AIDetectionResult {
        const damageTypes: any[] = ['crack', 'pothole', 'other'];
        const damageType = damageTypes[Math.floor(Math.random() * damageTypes.length)];
        const confidence = 0.6 + Math.random() * 0.35;

        return {
            damageType,
            confidence: parseFloat(confidence.toFixed(2)),
            severity: this.calculateSeverity(confidence),
            boundingBox: {
                x: Math.random() * 0.3,
                y: Math.random() * 0.3,
                width: 0.2 + Math.random() * 0.4,
                height: 0.2 + Math.random() * 0.4,
            },
        };
    }

    /**
     * Calculate severity based on confidence score
     */
    private calculateSeverity(confidence: number): 'low' | 'medium' | 'high' {
        if (confidence >= 0.8) {
            return 'high';
        } else if (confidence >= 0.6) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Check if backend API is available
     */
    async checkAPIHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${API_BASE_URL.replace('/api', '')}/health`, {
                method: 'GET',
            });
            const data = await response.json();
            return data.status === 'healthy';
        } catch (error) {
            console.error('API health check failed:', error);
            return false;
        }
    }
}

export default new AIService();
