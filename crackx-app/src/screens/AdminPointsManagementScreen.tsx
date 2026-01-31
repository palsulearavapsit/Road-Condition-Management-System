import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants';
import { Report, User } from '../types';
import storageService from '../services/storage';
import authService from '../services/auth';
import { formatDate } from '../utils';
import DashboardLayout from '../components/DashboardLayout';

interface AdminPointsManagementScreenProps {
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export default function AdminPointsManagementScreen({ onNavigate, onLogout }: AdminPointsManagementScreenProps) {
    const { t } = useTranslation();
    const [reports, setReports] = useState<Report[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [adminUser, setAdminUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pending' | 'users'>('pending');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [allReports, allUsers, current] = await Promise.all([
                storageService.getReports(),
                storageService.getRegisteredUsers(),
                authService.getCurrentUser()
            ]);
            setReports(allReports);
            setUsers(allUsers);
            setAdminUser(current);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const awardPoints = async (reportId: string, userId: string, points: number, type: 'report' | 'repair') => {
        if (!adminUser || (adminUser.adminPointsPool || 0) < points) {
            Alert.alert('Error', 'Insufficient points in Admin pool');
            return;
        }

        try {
            // 1. Find user and update points
            const targetUser = users.find(u => u.id === userId || u.username === userId);
            if (!targetUser) throw new Error('User not found');

            const updatedPoints = (targetUser.points || 0) + points;
            await storageService.updateRegisteredUser(targetUser.username, { points: updatedPoints });

            // 2. Deduct from Admin Pool
            const updatedPool = (adminUser.adminPointsPool || 0) - points;
            const updatedAdmin = { ...adminUser, adminPointsPool: updatedPool };
            await storageService.updateRegisteredUser(adminUser.username, { adminPointsPool: updatedPool });
            await storageService.saveUser(updatedAdmin);
            setAdminUser(updatedAdmin);

            // 3. Mark report as awarded
            const reportIndex = reports.findIndex(r => r.id === reportId);
            if (reportIndex >= 0) {
                const updatedReport = { ...reports[reportIndex] };
                if (type === 'report') updatedReport.reportApprovedForPoints = true;
                if (type === 'repair') updatedReport.repairApprovedForPoints = true;
                await storageService.saveReport(updatedReport);
            }

            Alert.alert('Success', `Awarded ${points} points to ${targetUser.username}`);
            loadData();
        } catch (error) {
            Alert.alert('Error', 'Failed to award points');
        }
    };

    const pendingPoints = reports.filter(r =>
        (r.status === 'pending' && !r.reportApprovedForPoints) ||
        (r.status === 'completed' && !r.repairApprovedForPoints)
    );

    return (
        <DashboardLayout
            title="Points Management"
            role="admin"
            activeRoute="Points"
            onNavigate={onNavigate}
            onLogout={onLogout}
        >
            <View style={styles.container}>
                {/* Admin Wallet Info */}
                <View style={styles.adminWallet}>
                    <View style={styles.walletHeader}>
                        <Ionicons name="wallet-outline" size={24} color={COLORS.white} />
                        <Text style={styles.walletTitle}>Admin Point Pool</Text>
                    </View>
                    <Text style={styles.walletValue}>{adminUser?.adminPointsPool?.toLocaleString() || 0}</Text>
                    <Text style={styles.walletSubtext}>Remaining points available for distribution</Text>
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>Approvals</Text>
                        {pendingPoints.length > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{pendingPoints.length}</Text></View>}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                        onPress={() => setActiveTab('users')}
                    >
                        <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>User Wallets</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                ) : (
                    <ScrollView style={styles.content}>
                        {activeTab === 'pending' ? (
                            pendingPoints.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="checkmark-circle-outline" size={64} color={COLORS.gray} style={{ opacity: 0.5 }} />
                                    <Text style={styles.emptyText}>All point requests settled!</Text>
                                </View>
                            ) : (
                                pendingPoints.map(report => (
                                    <View key={report.id} style={styles.approvalCard}>
                                        <View style={styles.cardHeader}>
                                            <Text style={styles.reportId}>#{report.id.slice(-6).toUpperCase()}</Text>
                                            <Text style={styles.cardType}>{report.status === 'pending' ? 'Damage Reported' : 'Repair Solved'}</Text>
                                        </View>

                                        <View style={styles.cardUserInfo}>
                                            <Ionicons name="person-outline" size={16} color={COLORS.gray} />
                                            <Text style={styles.cardUser}>{report.citizenId}</Text>
                                            <Text style={styles.cardDate}>{formatDate(report.createdAt)}</Text>
                                        </View>

                                        <View style={styles.actionRow}>
                                            {report.status === 'pending' && !report.reportApprovedForPoints && (
                                                <TouchableOpacity
                                                    style={styles.awardButton}
                                                    onPress={() => awardPoints(report.id, report.citizenId, 15, 'report')}
                                                >
                                                    <Text style={styles.awardButtonText}>Approve & Give 15 Pts</Text>
                                                </TouchableOpacity>
                                            )}
                                            {report.status === 'completed' && !report.repairApprovedForPoints && (
                                                <TouchableOpacity
                                                    style={[styles.awardButton, { backgroundColor: COLORS.success }]}
                                                    onPress={() => awardPoints(report.id, report.rsoId || report.citizenId, 20, 'repair')}
                                                >
                                                    <Text style={styles.awardButtonText}>Verify & Give 20 Pts to RSO</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )
                        ) : (
                            users.map(u => (
                                <View key={u.id || u.username} style={styles.userRow}>
                                    <View style={styles.userMain}>
                                        <View style={styles.avatar}>
                                            <Text style={styles.avatarText}>{u.username[0].toUpperCase()}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.userName}>{u.username}</Text>
                                            <Text style={styles.userRole}>{u.role.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.userWallet}>
                                        <Ionicons name="star" size={16} color="#f59e0b" />
                                        <Text style={styles.userPoints}>{u.points || 0}</Text>
                                    </View>
                                </View>
                            ))
                        )}
                    </ScrollView>
                )}
            </View>
        </DashboardLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    adminWallet: {
        backgroundColor: COLORS.primary,
        padding: 24,
        borderRadius: 20,
        marginBottom: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    walletHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    walletTitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    walletValue: {
        color: COLORS.white,
        fontSize: 36,
        fontWeight: '900',
    },
    walletSubtext: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        flexDirection: 'row',
    },
    activeTab: {
        backgroundColor: COLORS.white,
        elevation: 2,
    },
    tabText: {
        color: COLORS.gray,
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
        color: COLORS.primary,
    },
    badge: {
        backgroundColor: COLORS.danger,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 6,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    approvalCard: {
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    reportId: {
        color: COLORS.gray,
        fontSize: 12,
        fontWeight: '600',
    },
    cardType: {
        backgroundColor: '#eff6ff',
        color: COLORS.primary,
        fontSize: 10,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    cardUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardUser: {
        color: COLORS.dark,
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 4,
    },
    cardDate: {
        color: COLORS.gray,
        fontSize: 12,
        marginLeft: 'auto',
    },
    actionRow: {
        flexDirection: 'row',
    },
    awardButton: {
        flex: 1,
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    awardButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    userMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    userRole: {
        fontSize: 10,
        color: COLORS.gray,
        fontWeight: '700',
    },
    userWallet: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fffbeb',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fef3c7',
    },
    userPoints: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#b45309',
        marginLeft: 4,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: COLORS.gray,
        fontSize: 16,
        marginTop: 12,
        fontWeight: '500',
    },
});
