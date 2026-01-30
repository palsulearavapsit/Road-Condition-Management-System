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
import { COLORS, ZONES } from '../constants';
import { Report } from '../types';
import storageService from '../services/storage';
import authService from '../services/auth';
import { calculateRoadHealthIndex } from '../utils';
import DashboardLayout from '../components/DashboardLayout';

interface AdminHomeScreenProps {
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export default function AdminHomeScreen({ onNavigate, onLogout }: AdminHomeScreenProps) {
    const { t } = useTranslation();
    const [reports, setReports] = useState<Report[]>([]);
    const [zoneStats, setZoneStats] = useState<any>({});
    const [pendingRSOs, setPendingRSOs] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const allReports = await storageService.getReports();
            setReports(allReports);

            // Load Pending RSOs
            const users = await storageService.getRegisteredUsers();
            const pending = users.filter(u => u.role === 'rso' && u.isApproved === false);
            setPendingRSOs(pending);

            // Calculate zone-wise statistics
            const stats: any = {};
            ZONES.forEach(zone => {
                const zoneReports = allReports.filter(r => r.location.zone === zone.id);
                const severityDist = {
                    low: zoneReports.filter(r => r.aiDetection?.severity === 'low').length,
                    medium: zoneReports.filter(r => r.aiDetection?.severity === 'medium').length,
                    high: zoneReports.filter(r => r.aiDetection?.severity === 'high').length,
                };

                stats[zone.id] = {
                    total: zoneReports.length,
                    pending: zoneReports.filter(r => r.status === 'pending').length,
                    completed: zoneReports.filter(r => r.status === 'completed').length,
                    severityDist,
                    healthIndex: calculateRoadHealthIndex(zoneReports.length, severityDist),
                };
            });

            setZoneStats(stats);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const approveRSO = async (username: string) => {
        try {
            await storageService.updateRegisteredUser(username, { isApproved: true });
            Alert.alert(t('success'), `RSO ${username} verified successfully`);
            loadData(); // Refresh list
        } catch (error) {
            Alert.alert(t('error'), 'Failed to approve user');
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        onLogout();
    };

    const totalStats = {
        total: reports.length,
        pending: reports.filter(r => r.status === 'pending').length,
        completed: reports.filter(r => r.status === 'completed').length,
    };

    return (
        <DashboardLayout
            title={t('admin_dashboard')}
            role="admin"
            activeRoute="Dashboard"
            onNavigate={onNavigate}
            onLogout={handleLogout}
        >
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Action Buttons */}
                <View style={[styles.section, { flexDirection: 'row', gap: 12 }]}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onNavigate('UserManagement')}
                    >
                        <View style={styles.actionIconBadge}>
                            <Text style={{ fontSize: 24 }}>👥</Text>
                            {pendingRSOs.length > 0 && (
                                <View style={styles.badgeDot} />
                            )}
                        </View>
                        <View>
                            <Text style={styles.actionButtonTitle}>{t('user_management')}</Text>
                            <Text style={styles.actionButtonSubtitle}>
                                {pendingRSOs.length} Pending Requests
                            </Text>
                        </View>
                        <Text style={styles.actionArrow}>→</Text>
                    </TouchableOpacity>
                </View>

                {/* Overall Stats */}
                <View style={styles.statsCard}>
                    <Text style={styles.cardTitle}>Overall Statistics</Text>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{totalStats.total}</Text>
                            <Text style={styles.statLabel}>{t('total_reports')}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.warning }]}>
                                {totalStats.pending}
                            </Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: COLORS.success }]}>
                                {totalStats.completed}
                            </Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                    </View>
                </View>

                {/* Zone Performance */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('zone_performance')}</Text>
                    {ZONES.map(zone => {
                        const stats = zoneStats[zone.id] || {
                            total: 0,
                            pending: 0,
                            completed: 0,
                            healthIndex: 100,
                            severityDist: { low: 0, medium: 0, high: 0 },
                        };

                        return (
                            <View key={zone.id} style={styles.zoneCard}>
                                <View style={styles.zoneHeader}>
                                    <View>
                                        <Text style={styles.zoneName}>{zone.name}</Text>
                                        <Text style={styles.zoneSubtext}>{stats.total} Reports</Text>
                                    </View>
                                    <View style={[styles.healthBadge, { backgroundColor: stats.healthIndex < 70 ? COLORS.danger : stats.healthIndex < 85 ? COLORS.warning : COLORS.success }]}>
                                        <Text style={styles.healthValue}>{stats.healthIndex}</Text>
                                        <Text style={styles.healthLabel}>RHI</Text>
                                    </View>
                                </View>

                                {/* Severity Distribution */}
                                <View style={styles.severityBar}>
                                    {stats.total > 0 && (
                                        <>
                                            <View style={[styles.severitySegment, { flex: stats.severityDist.low + 0.1, backgroundColor: COLORS.severityLow }]} />
                                            <View style={[styles.severitySegment, { flex: stats.severityDist.medium + 0.1, backgroundColor: COLORS.severityMedium }]} />
                                            <View style={[styles.severitySegment, { flex: stats.severityDist.high + 0.1, backgroundColor: COLORS.severityHigh }]} />
                                        </>
                                    )}
                                    {stats.total === 0 && <View style={[styles.severitySegment, { flex: 1, backgroundColor: COLORS.light }]} />}
                                </View>

                                <View style={styles.severityLegend}>
                                    <Text style={styles.legendText}>Low: {stats.severityDist.low}</Text>
                                    <Text style={styles.legendText}>Med: {stats.severityDist.medium}</Text>
                                    <Text style={styles.legendText}>High: {stats.severityDist.high}</Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </DashboardLayout>
    );
}

const styles = StyleSheet.create({
    pendingCard: {
        backgroundColor: '#fff7ed', // light orange
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    pendingName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    pendingZone: {
        fontSize: 14,
        color: COLORS.gray,
    },
    approveButton: {
        backgroundColor: COLORS.success,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    approveButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    statsCard: {
        backgroundColor: COLORS.white,
        margin: 16,
        padding: 24,
        borderRadius: 16,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: COLORS.secondary,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.border,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    statLabel: {
        fontSize: 14,
        color: COLORS.gray,
        marginTop: 4,
        fontWeight: '500',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 12,
    },
    zoneCard: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    zoneHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    zoneName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    zoneSubtext: {
        fontSize: 13,
        color: COLORS.gray,
        marginTop: 2,
    },
    healthBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        minWidth: 60,
    },
    healthValue: {
        fontSize: 20,
        fontWeight: '900',
        color: COLORS.white,
    },
    healthLabel: {
        fontSize: 10,
        color: COLORS.white,
        fontWeight: '700',
    },
    severityBar: {
        flexDirection: 'row',
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 12,
        backgroundColor: COLORS.light,
    },
    severitySegment: {
        height: '100%',
    },
    severityLegend: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    legendText: {
        fontSize: 12,
        color: COLORS.gray,
        fontWeight: '500',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionIconBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        position: 'relative',
    },
    badgeDot: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 12,
        height: 12,
        backgroundColor: COLORS.danger,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    actionButtonTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    actionButtonSubtitle: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '500',
    },
    actionArrow: {
        fontSize: 20,
        color: COLORS.gray,
        marginLeft: 'auto',
    },
});
