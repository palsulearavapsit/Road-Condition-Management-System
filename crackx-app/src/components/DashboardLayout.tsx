import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    Platform,
    StatusBar,
    useWindowDimensions,
    ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Sidebar from './Sidebar';
import { COLORS } from '../constants';
import { UserRole } from '../types';
import realtimeListener from '../services/realtimeListener';
import { Ionicons } from '@expo/vector-icons';
import notificationService, { AppNotification } from '../services/notifications';
import authService from '../services/supabaseAuth';
import { formatDate } from '../utils';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title: string;
    role: UserRole;
    activeRoute: string; // Identify which menu item is active
    onNavigate: (route: string) => void;
    onLogout: () => void;
}

export default function DashboardLayout({
    children,
    title,
    role,
    activeRoute,
    onNavigate,
    onLogout
}: DashboardLayoutProps) {
    const { width } = useWindowDimensions();
    const isLargeScreen = width >= 768; // Tablet/Desktop breakpoint
    const [isSidebarVisible, setSidebarVisible] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotifVisible, setNotifVisible] = useState(false);
    const { t } = useTranslation();

    const toggleSidebar = () => setSidebarVisible(!isSidebarVisible);

    const loadNotifications = async () => {
        const user = await authService.getCurrentUser();
        if (user) {
            const data = await notificationService.getInAppNotifications(user.id);
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.read).length);
        }
    };

    React.useEffect(() => {
        loadNotifications();

        // Start listening for realtime events
        realtimeListener.startListening();

        // Subscribe to new notification events
        const unsubscribe = realtimeListener.subscribeToNotifications((newNotif) => {
            setNotifications(prev => [newNotif, ...prev]);
            setUnreadCount(prev => prev + 1);
        });

        return () => {
            realtimeListener.stopListening();
            unsubscribe();
        };
    }, []);

    const markAllRead = async () => {
        const user = await authService.getCurrentUser();
        if (user) {
            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadCount(0);

            // Backend update (could iterate or we could add a bulk method)
            for (const n of notifications.filter(notif => !notif.read)) {
                await notificationService.markInAppRead(n.id);
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContainer}>

                {/* Desktop: Permanent Sidebar */}
                {isLargeScreen && (
                    <View style={styles.desktopSidebar}>
                        <Sidebar
                            role={role}
                            activeRoute={activeRoute}
                            onNavigate={(route) => {
                                if (route === 'Notifications') {
                                    setNotifVisible(true);
                                } else {
                                    onNavigate(route);
                                }
                            }}
                            onLogout={onLogout}
                        />
                    </View>
                )}

                {/* Main Content Area */}
                <View style={styles.contentArea}>

                    {/* Mobile Header (Only visible on small screens) */}
                    {!isLargeScreen && (
                        <View style={styles.header}>
                            <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
                                <Text style={styles.menuIcon}>☰</Text>
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>{title}</Text>
                            <TouchableOpacity
                                onPress={() => setNotifVisible(true)}
                                style={styles.notifButton}
                            >
                                <Ionicons name="notifications-outline" size={24} color={COLORS.dark} />
                                {unreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Desktop Header Enhancement (Always show notif bell) */}
                    {isLargeScreen && (
                        <View style={styles.desktopHeader}>
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity
                                onPress={() => setNotifVisible(true)}
                                style={styles.notifButton}
                            >
                                <Ionicons name="notifications-outline" size={24} color={COLORS.dark} />
                                {unreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Page Content */}
                    <View style={styles.pageContent}>
                        {children}
                    </View>
                </View>

                {/* Mobile: Sidebar Drawer (Modal) */}
                {!isLargeScreen && (
                    <Modal
                        visible={isSidebarVisible}
                        transparent={true}
                        animationType="slide" // Or 'fade'
                        onRequestClose={() => setSidebarVisible(false)}
                    >
                        <View style={styles.modalOverlay}>
                            {/* Backdrop tap to close */}
                            <TouchableOpacity
                                style={styles.backdrop}
                                onPress={() => setSidebarVisible(false)}
                            />

                            {/* Sidebar Container */}
                            <View style={styles.mobileSidebarContainer}>
                                <Sidebar
                                    role={role}
                                    activeRoute={activeRoute}
                                    onNavigate={(route) => {
                                        setSidebarVisible(false);
                                        if (route === 'Notifications') {
                                            setNotifVisible(true);
                                        } else {
                                            onNavigate(route);
                                        }
                                    }}
                                    onLogout={onLogout}
                                    onClose={() => setSidebarVisible(false)}
                                />
                            </View>
                        </View>
                    </Modal>
                )}

                {/* Notification Modal */}
                <Modal
                    visible={isNotifVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setNotifVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={styles.backdrop}
                            activeOpacity={1}
                            onPress={() => setNotifVisible(false)}
                        />
                        <View style={styles.notifCenter}>
                            <View style={styles.notifHeader}>
                                <Text style={styles.notifTitle}>{t('notifications')}</Text>
                                <TouchableOpacity onPress={markAllRead}>
                                    <Text style={styles.markReadText}>{t('mark_all_read')}</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.notifList}>
                                {notifications.length === 0 ? (
                                    <View style={styles.emptyNotifs}>
                                        <Ionicons name="notifications-off-outline" size={48} color={COLORS.gray} style={{ opacity: 0.3 }} />
                                        <Text style={styles.emptyNotifText}>{t('no_notifications')}</Text>
                                    </View>
                                ) : (
                                    notifications.map((notif) => (
                                        <View key={notif.id} style={[styles.notifItem, !notif.read && styles.unreadNotifItem]}>
                                            <View style={styles.notifIconContainer}>
                                                <Ionicons
                                                    name={notif.title.includes('Repair') ? 'checkmark-circle' : 'alert-circle'}
                                                    size={24}
                                                    color={notif.title.includes('Repair') ? COLORS.success : COLORS.primary}
                                                />
                                            </View>
                                            <View style={styles.notifContent}>
                                                <Text style={styles.notifItemTitle}>{notif.title}</Text>
                                                <Text style={styles.notifItemBody}>{notif.body}</Text>
                                                <Text style={styles.notifItemTime}>{formatDate(notif.created_at)}</Text>
                                            </View>
                                            {!notif.read && <View style={styles.unreadDot} />}
                                        </View>
                                    ))
                                )}
                            </ScrollView>

                            <TouchableOpacity
                                style={styles.closeNotifBtn}
                                onPress={() => setNotifVisible(false)}
                            >
                                <Text style={styles.closeNotifText}>{t('close')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    mainContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    desktopSidebar: {
        width: 280,
    },
    contentArea: {
        flex: 1,
        backgroundColor: COLORS.light,
    },
    header: {
        height: 60,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    menuButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuIcon: {
        fontSize: 24,
        color: COLORS.dark,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    pageContent: {
        flex: 1,
        padding: 16,
    },
    // Mobile Drawer Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        flexDirection: 'row',
    },
    backdrop: {
        flex: 1,
    },
    mobileSidebarContainer: {
        width: '80%',
        maxWidth: 300,
        backgroundColor: COLORS.white,
        height: '100%',
        position: 'absolute', // Make it slide over
        left: 0,
        top: 0,
        bottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 16,
    },
    desktopHeader: {
        height: 60,
        backgroundColor: COLORS.white,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    notifButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.light,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: COLORS.danger,
        borderRadius: 9,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: 'bold',
    },
    notifCenter: {
        width: '90%',
        maxWidth: 400,
        backgroundColor: COLORS.white,
        borderRadius: 24,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
        overflow: 'hidden',
        alignSelf: 'center',
        marginTop: '10%',
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    notifTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    markReadText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    notifList: {
        flex: 1,
    },
    notifItem: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.light,
        alignItems: 'center',
    },
    unreadNotifItem: {
        backgroundColor: '#f8fafc',
    },
    notifIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    notifContent: {
        flex: 1,
    },
    notifItemTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    notifItemBody: {
        fontSize: 13,
        color: COLORS.gray,
        marginTop: 2,
    },
    notifItemTime: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.primary,
        marginLeft: 8,
    },
    emptyNotifs: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyNotifText: {
        marginTop: 12,
        color: COLORS.gray,
        fontSize: 14,
    },
    closeNotifBtn: {
        backgroundColor: COLORS.light,
        padding: 16,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    closeNotifText: {
        color: COLORS.dark,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
