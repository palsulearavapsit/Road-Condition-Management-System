import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { Report, User } from '../types';
import storageService from '../services/storage';
import syncService from '../services/sync';
import authService from '../services/auth';
import DashboardLayout from '../components/DashboardLayout';

interface CitizenHomeScreenProps {
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export default function CitizenHomeScreen({ onNavigate, onLogout }: CitizenHomeScreenProps) {
    const { t } = useTranslation();
    const [reports, setReports] = useState<Report[]>([]);
    const [user, setUser] = useState<User | null>(null);
    const [syncStats, setSyncStats] = useState({ pendingSync: 0, synced: 0 });
    const [isOnline, setIsOnline] = useState(false);
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState<User[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const user = await authService.getCurrentUser();
            if (user) {
                setUser(user);
                const userReports = await storageService.getReportsByCitizen(user.id);
                setReports(userReports);
            }

            const stats = await syncService.getSyncStats();
            setSyncStats(stats);

            const online = await syncService.isOnline();
            setIsOnline(online);

            // Load all users to find RSO officers
            const allUsers = await storageService.getRegisteredUsers();
            setUsers(allUsers);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            const result = await syncService.syncReports();
            Alert.alert(
                t('success'),
                `Synced ${result.success} reports successfully${result.failed > 0 ? `, ${result.failed} failed` : ''
                }`
            );
            loadData();
        } catch (error: any) {
            Alert.alert(t('error'), error.message || 'Failed to sync reports');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        onLogout();
    };

    return (
        <DashboardLayout
            title={t('citizen_dashboard')}
            role="citizen"
            activeRoute="Dashboard"
            onNavigate={(route) => {
                if (route === 'Sync') {
                    handleSync();
                } else {
                    onNavigate(route);
                }
            }}
            onLogout={handleLogout}
        >
            <View style={styles.walletBar}>
                <View style={styles.pointsBadge}>
                    <Ionicons name="star" size={16} color="#f59e0b" />
                    <Text style={styles.pointsText}>{user?.points || 0} Points</Text>
                </View>
                <Text style={styles.welcomeText}>Welcome, {user?.username}!</Text>
            </View>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Status Card */}
                <View style={styles.statusCard}>
                    <View style={styles.statusRow}>
                        <View style={styles.statusItem}>
                            <Text style={styles.statusValue}>{reports.length}</Text>
                            <Text style={styles.statusLabel}>{t('my_reports')}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusValue, { color: COLORS.warning }]}>
                                {syncStats.pendingSync}
                            </Text>
                            <Text style={styles.statusLabel}>{t('pending_sync')}</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Actions Grid */}
                <View style={styles.gridContainer}>
                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => onNavigate('ReportDamage')}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: '#ffedd5' }]}>
                            <Ionicons name="camera-outline" size={28} color={COLORS.primary} />
                        </View>
                        <Text style={styles.actionTitle}>{t('report_damage')}</Text>
                        <Text style={styles.actionSubtitle}>Click photo of road issue</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionCard}
                        onPress={() => onNavigate('MyReports')}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: '#dbeafe' }]}>
                            <Ionicons name="list-outline" size={28} color={COLORS.primary} />
                        </View>
                        <Text style={styles.actionTitle}>{t('my_reports')}</Text>
                        <Text style={styles.actionSubtitle}>View status updates</Text>
                    </TouchableOpacity>
                </View>

                {/* Recent Reports List */}
                <View style={styles.recentSection}>
                    <Text style={styles.sectionTitle}>Recent Reports</Text>
                    {reports.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="file-tray-outline" size={48} color={COLORS.gray} style={{ opacity: 0.5, marginBottom: 16 }} />
                            <Text style={styles.emptyText}>{t('no_reports')}</Text>
                            <Text style={styles.emptySubtext}>
                                Tap "Report Damage" to create your first report
                            </Text>
                        </View>
                    ) : (
                        reports.slice(0, 3).map((report) => (
                            <View key={report.id} style={styles.reportCard}>
                                <View style={styles.reportHeader}>
                                    <Text style={styles.reportType}>
                                        {report.aiDetection?.damageType || 'Unknown'}
                                    </Text>
                                    <View
                                        style={[
                                            styles.severityBadge,
                                            {
                                                backgroundColor:
                                                    report.aiDetection?.severity === 'high'
                                                        ? COLORS.severityHigh
                                                        : report.aiDetection?.severity === 'medium'
                                                            ? COLORS.severityMedium
                                                            : COLORS.severityLow,
                                            },
                                        ]}
                                    >
                                        <Text style={styles.severityText}>
                                            {report.aiDetection?.severity || 'N/A'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.reportLocation}>
                                    {report.location.zone?.toUpperCase()} • {report.location.roadName || 'Unknown Location'}
                                    {(() => {
                                        const rsoOfficer = users.find(u => u.role === 'rso' && u.zone === report.location.zone);
                                        if (rsoOfficer) {
                                            return ` • RSO: ${rsoOfficer.username.charAt(0).toUpperCase() + rsoOfficer.username.slice(1)}`;
                                        }
                                        return '';
                                    })()}
                                </Text>
                                <View style={styles.reportFooter}>
                                    <Text style={styles.reportDate}>
                                        {new Date(report.createdAt).toLocaleDateString()}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.syncBadge,
                                            {
                                                color:
                                                    report.syncStatus === 'synced'
                                                        ? COLORS.success
                                                        : COLORS.warning,
                                            },
                                        ]}
                                    >
                                        {report.status} • {report.syncStatus}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>
        </DashboardLayout>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    statusCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: COLORS.secondary,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    statusItem: {
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.border,
    },
    statusValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    statusLabel: {
        fontSize: 14,
        color: COLORS.gray,
        marginTop: 4,
        fontWeight: '500',
    },
    gridContainer: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    actionCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 20,
        borderRadius: 16,
        alignItems: 'flex-start',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionIcon: {
        fontSize: 24,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 4,
    },
    actionSubtitle: {
        fontSize: 12,
        color: COLORS.gray,
    },
    recentSection: {
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 16,
    },
    reportCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reportType: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
        textTransform: 'capitalize',
    },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    severityText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    reportLocation: {
        fontSize: 13,
        color: COLORS.gray,
        marginBottom: 12,
    },
    reportFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.light,
        paddingTop: 12,
    },
    reportDate: {
        fontSize: 12,
        color: COLORS.gray,
    },
    syncBadge: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.gray,
        textTransform: 'capitalize',
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 16,
        opacity: 0.5,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.gray,
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: COLORS.gray,
        textAlign: 'center',
    },
    walletBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.secondary,
    },
    pointsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#fef3c7',
    },
    pointsText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#b45309',
        marginLeft: 6,
    },
    welcomeText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
    }
});
