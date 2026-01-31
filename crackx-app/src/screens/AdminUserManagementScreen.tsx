import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, ZONES } from '../constants';
import storageService from '../services/storage';
import authService from '../services/auth';
import DashboardLayout from '../components/DashboardLayout';

interface AdminUserManagementScreenProps {
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export default function AdminUserManagementScreen({ onNavigate, onLogout }: AdminUserManagementScreenProps) {
    const { t } = useTranslation();
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [activeUsers, setActiveUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const users = await storageService.getRegisteredUsers();
            const pending = users.filter(u => u.role === 'rso' && u.isApproved === false);
            const active = users.filter(u => u.isApproved !== false); // Users who are approved or don't need approval

            setPendingUsers(pending);
            setActiveUsers(active);
        } catch (error) {
            console.error('Error loading users:', error);
            Alert.alert(t('error'), 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (username: string) => {
        try {
            await storageService.updateRegisteredUser(username, { isApproved: true });
            Alert.alert(t('success'), `User ${username} approved successfully`);
            loadUsers();
        } catch (error) {
            Alert.alert(t('error'), 'Failed to approve user');
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        onLogout();
    };

    return (
        <DashboardLayout
            title={t('user_management')} // Ensure this key exists or fallback
            role="admin"
            activeRoute="UserManagement"
            onNavigate={onNavigate}
            onLogout={handleLogout}
        >
            <ScrollView style={styles.content}>

                {/* Pending Approvals Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Pending Approvals</Text>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{pendingUsers.length}</Text>
                        </View>
                    </View>

                    {pendingUsers.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No pending requests</Text>
                        </View>
                    ) : (
                        pendingUsers.map(user => (
                            <View key={user.username} style={styles.userCardPending}>
                                <View style={styles.userInfo}>
                                    <View style={styles.avatarContainer}>
                                        <Text style={styles.avatarText}>{user.username.substring(0, 2).toUpperCase()}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.username}>{user.username}</Text>
                                        <View style={styles.roleTag}>
                                            <Text style={styles.roleTagText}>{t(user.role)}</Text>
                                            {user.zone && (
                                                <Text style={styles.zoneTagText}> • {ZONES.find(z => z.id === user.zone)?.name || user.zone}</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                                <TouchableOpacity
                                    style={styles.approveButton}
                                    onPress={() => handleApprove(user.username)}
                                >
                                    <Text style={styles.approveButtonText}>Approve</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                {/* Active Users Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Active Users</Text>

                    {activeUsers.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No active users found</Text>
                        </View>
                    ) : (
                        activeUsers.map(user => (
                            <View key={user.username} style={styles.userCard}>
                                <View style={styles.userInfo}>
                                    <View style={[styles.avatarContainer, { backgroundColor: COLORS.secondary }]}>
                                        <Text style={[styles.avatarText, { color: COLORS.primary }]}>{user.username.substring(0, 2).toUpperCase()}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.username}>{user.username}</Text>
                                        <View style={styles.row}>
                                            <Text style={styles.userRole}>{t(user.role)}</Text>
                                            {user.zone && (
                                                <Text style={styles.userZone}> • {ZONES.find(z => z.id === user.zone)?.name || user.zone}</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>Active</Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

            </ScrollView>
        </DashboardLayout>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    badge: {
        backgroundColor: COLORS.danger,
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyState: {
        padding: 24,
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    emptyText: {
        color: COLORS.gray,
        fontSize: 14,
    },
    userCardPending: {
        backgroundColor: '#fff7ed',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.warning,
    },
    userCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    roleTag: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    roleTagText: {
        fontSize: 12,
        color: COLORS.gray,
    },
    zoneTagText: {
        fontSize: 12,
        color: COLORS.gray,
    },
    row: {
        flexDirection: 'row',
    },
    userRole: {
        fontSize: 12,
        color: COLORS.gray,
        textTransform: 'capitalize',
    },
    userZone: {
        fontSize: 12,
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
        fontSize: 12,
    },
    statusBadge: {
        backgroundColor: '#dcfce7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#166534',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
