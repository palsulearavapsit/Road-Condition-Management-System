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
    useWindowDimensions
} from 'react-native';
import Sidebar from './Sidebar';
import { COLORS } from '../constants';
import { UserRole } from '../types';

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

    const toggleSidebar = () => setSidebarVisible(!isSidebarVisible);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.mainContainer}>

                {/* Desktop: Permanent Sidebar */}
                {isLargeScreen && (
                    <View style={styles.desktopSidebar}>
                        <Sidebar
                            role={role}
                            activeRoute={activeRoute}
                            onNavigate={onNavigate}
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
                            <View style={{ width: 40 }} />
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
                                        onNavigate(route);
                                    }}
                                    onLogout={onLogout}
                                    onClose={() => setSidebarVisible(false)}
                                />
                            </View>
                        </View>
                    </Modal>
                )}
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
});
