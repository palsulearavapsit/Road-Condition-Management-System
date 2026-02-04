import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import authService from './supabaseAuth';
import notificationService from './notifications';
import { Report } from '../types';

class RealtimeListenerService {
    private channel: RealtimeChannel | null = null;
    private userId: string | null = null;
    private userRole: string | null = null;
    private userZone: string | null = null;

    /**
     * Start listening for real-time updates based on user role
     */
    async startListening() {
        const user = await authService.getCurrentUser();
        if (!user) return;

        this.userId = user.id;
        this.userRole = user.role;
        this.userZone = user.zone || null;

        if (this.channel) {
            await this.stopListening();
        }

        console.log(`📡 Starting Realtime Listener for ${this.userRole} (${this.userId})`);

        this.channel = supabase
            .channel('public:reports')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reports',
                },
                (payload) => {
                    this.handleDatabaseEvent(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Realtime Connected to Reports Table');
                }
            });
    }

    /**
     * Handle incoming database events
     */
    private handleDatabaseEvent(payload: any) {
        const { eventType, new: newRecord, old: oldRecord } = payload;
        const record = newRecord as any; // Supabase returns snake_case keys

        console.log('Reatime Event:', eventType, record?.id);

        // 1. CITIZEN NOTIFICATIONS
        if (this.userRole === 'citizen') {
            // Alert if MY report is updated
            if ((eventType === 'UPDATE' || eventType === 'INSERT') && record.citizen_id === this.userId) {
                // Status changed to 'completed'
                if (record.status === 'completed' && oldRecord?.status !== 'completed') {
                    notificationService.notifyStatusChange(record.id, 'completed');
                }
                // Status changed to 'in-progress'
                if (record.status === 'in-progress' && oldRecord?.status !== 'in-progress') {
                    notificationService.notifyStatusChange(record.id, 'in-progress');
                }
            }
        }

        // 2. RSO NOTIFICATIONS
        if (this.userRole === 'rso') {
            // Alert if NEW report in MY zone
            if (eventType === 'INSERT' && record.status === 'pending') {
                // Check zone match (assuming zone is stored in location object string or dedicated column)
                // Note: userZone is typically 'zone1', record.location.zone is 'zone1'
                if (this.userZone && record.location?.zone === this.userZone) {
                    const address = record.location.roadName || record.location.address || 'Unknown Location';
                    const type = record.aiDetection?.damageType || 'Road Damage';
                    notificationService.scheduleRSOAssignmentNotification(
                        record.id,
                        `${type} at ${address}`
                    );
                }
            }
        }

        // 3. ADMIN NOTIFICATIONS
        if (this.userRole === 'admin') {
            // Notify on ANY new report
            if (eventType === 'INSERT') {
                const zone = record.location?.zone || 'Unknown Zone';
                notificationService.scheduleNotification(
                    'New Report Logged',
                    `New report in ${zone}. ID: ${record.id.slice(-4)}`
                );
            }

            // Notify when RSO completes work
            if (eventType === 'UPDATE' && record.status === 'completed' && oldRecord?.status !== 'completed') {
                notificationService.scheduleNotification(
                    'Work Completed',
                    `RSO ${record.rsoId || 'Unknown'} completed report #${record.id.slice(-4)}`
                );
            }
        }
    }

    /**
     * Stop listening
     */
    async stopListening() {
        if (this.channel) {
            await supabase.removeChannel(this.channel);
            this.channel = null;
        }
    }
}

export default new RealtimeListenerService();
