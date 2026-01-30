import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Report } from '../types';

class NotificationService {
    constructor() {
        this.configureNotifications();
    }

    private configureNotifications() {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        if (Platform.OS === 'android') {
            Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
    }

    async requestPermissions() {
        const { status } = await Notifications.requestPermissionsAsync();
        return status === 'granted';
    }

    async scheduleReportSubmissionNotification(reportId: string) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Report Submitted 🚀",
                body: `Your report #${reportId.slice(-4)} has been submitted successfully to the zone office.`,
                data: { reportId },
            },
            trigger: null, // Send immediately
        });
    }

    async scheduleRSOAssignmentNotification(reportId: string, address: string) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "New Task Assigned 🚧",
                body: `New damage report at ${address} requires your attention.`,
                data: { reportId },
            },
            trigger: null,
        });
    }

    async scheduleCompletionNotification(reportId: string) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Repair Verified ✅",
                body: `Report #${reportId.slice(-4)} marked as completed. Great work!`,
                data: { reportId },
            },
            trigger: null,
        });
    }
}

export default new NotificationService();
