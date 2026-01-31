import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { syncService } from '../services/sync';

interface WorkOrder {
    id: string;
    orderNumber: string;
    reportId: string;
    title: string;
    description: string;
    zone: string;
    location: string;
    damageType: string;
    severity: string;
    estimatedCost: number;
    actualCost?: number;
    status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
    deadline: string;
    createdAt: string;
    assignedVendor?: string;
}

export default function VendorPortalScreen({ navigation }: any) {
    const { t } = useTranslation();
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadWorkOrders();
    }, []);

    const loadWorkOrders = async () => {
        try {
            // Fetch from backend or local storage
            const orders = await syncService.fetchWorkOrders();
            setWorkOrders(orders);
            setLoading(false);
        } catch (error) {
            console.error('Error loading work orders:', error);
            // Load demo data
            setWorkOrders(demoWorkOrders);
            setLoading(false);
        }
    };

    const acceptWorkOrder = async (orderId: string) => {
        try {
            await syncService.updateWorkOrder(orderId, { status: 'assigned' });
            Alert.alert('Success', 'Work order accepted successfully!');
            loadWorkOrders();
        } catch (error) {
            Alert.alert('Error', 'Failed to accept work order');
        }
    };

    const startWork = async (orderId: string) => {
        try {
            await syncService.updateWorkOrder(orderId, { status: 'in-progress' });
            Alert.alert('Success', 'Work started!');
            loadWorkOrders();
        } catch (error) {
            Alert.alert('Error', 'Failed to start work');
        }
    };

    const completeWork = async (orderId: string, actualCost: number) => {
        try {
            await syncService.updateWorkOrder(orderId, {
                status: 'completed',
                actualCost,
                completedAt: new Date().toISOString(),
            });
            Alert.alert('Success', 'Work order completed!');
            setShowDetailModal(false);
            loadWorkOrders();
        } catch (error) {
            Alert.alert('Error', 'Failed to complete work order');
        }
    };

    const getStatusColor = (status: string): string => {
        const colors: Record<string, string> = {
            pending: '#f59e0b',
            assigned: '#3b82f6',
            'in-progress': '#8b5cf6',
            completed: '#10b981',
            cancelled: '#ef4444',
        };
        return colors[status] || '#64748b';
    };

    const getSeverityColor = (severity: string): string => {
        const colors: Record<string, string> = {
            low: '#10b981',
            medium: '#f59e0b',
            high: '#ef4444',
        };
        return colors[severity] || '#64748b';
    };

    const filteredOrders = workOrders.filter((order) => {
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        const matchesSearch =
            searchQuery === '' ||
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.zone.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const stats = {
        pending: workOrders.filter((o) => o.status === 'pending').length,
        assigned: workOrders.filter((o) => o.status === 'assigned').length,
        inProgress: workOrders.filter((o) => o.status === 'in-progress').length,
        completed: workOrders.filter((o) => o.status === 'completed').length,
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading Work Orders...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Vendor Portal</Text>
                <Text style={styles.headerSubtitle}>Work Order Management System</Text>
            </View>

            {/* Stats Cards */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
                <View style={[styles.statsCard, { borderLeftColor: '#f59e0b' }]}>
                    <Text style={styles.statsValue}>{stats.pending}</Text>
                    <Text style={styles.statsLabel}>Pending</Text>
                </View>
                <View style={[styles.statsCard, { borderLeftColor: '#3b82f6' }]}>
                    <Text style={styles.statsValue}>{stats.assigned}</Text>
                    <Text style={styles.statsLabel}>Assigned</Text>
                </View>
                <View style={[styles.statsCard, { borderLeftColor: '#8b5cf6' }]}>
                    <Text style={styles.statsValue}>{stats.inProgress}</Text>
                    <Text style={styles.statsLabel}>In Progress</Text>
                </View>
                <View style={[styles.statsCard, { borderLeftColor: '#10b981' }]}>
                    <Text style={styles.statsValue}>{stats.completed}</Text>
                    <Text style={styles.statsLabel}>Completed</Text>
                </View>
            </ScrollView>

            {/* Search and Filter */}
            <View style={styles.filterSection}>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by order number, title, or zone..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor="#94a3b8"
                />

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterButtons}>
                    {['all', 'pending', 'assigned', 'in-progress', 'completed'].map((status) => (
                        <TouchableOpacity
                            key={status}
                            style={[
                                styles.filterButton,
                                filterStatus === status && styles.filterButtonActive,
                            ]}
                            onPress={() => setFilterStatus(status)}
                        >
                            <Text
                                style={[
                                    styles.filterButtonText,
                                    filterStatus === status && styles.filterButtonTextActive,
                                ]}
                            >
                                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Work Orders List */}
            <ScrollView style={styles.ordersContainer} showsVerticalScrollIndicator={false}>
                {filteredOrders.map((order) => (
                    <TouchableOpacity
                        key={order.id}
                        style={styles.orderCard}
                        onPress={() => {
                            setSelectedOrder(order);
                            setShowDetailModal(true);
                        }}
                    >
                        <View style={styles.orderHeader}>
                            <View>
                                <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                                <Text style={styles.orderTitle}>{order.title}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                                <Text style={styles.statusText}>
                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.orderDetails}>
                            <View style={styles.orderDetailItem}>
                                <Text style={styles.orderDetailLabel}>Zone:</Text>
                                <Text style={styles.orderDetailValue}>{order.zone}</Text>
                            </View>
                            <View style={styles.orderDetailItem}>
                                <Text style={styles.orderDetailLabel}>Severity:</Text>
                                <View
                                    style={[
                                        styles.severityBadge,
                                        { backgroundColor: getSeverityColor(order.severity) },
                                    ]}
                                >
                                    <Text style={styles.severityText}>{order.severity.toUpperCase()}</Text>
                                </View>
                            </View>
                            <View style={styles.orderDetailItem}>
                                <Text style={styles.orderDetailLabel}>Est. Cost:</Text>
                                <Text style={styles.orderDetailValue}>₹{order.estimatedCost.toLocaleString()}</Text>
                            </View>
                        </View>

                        <View style={styles.orderFooter}>
                            <Text style={styles.orderDate}>
                                Created: {new Date(order.createdAt).toLocaleDateString()}
                            </Text>
                            {order.deadline && (
                                <Text style={styles.orderDeadline}>
                                    Deadline: {new Date(order.deadline).toLocaleDateString()}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}

                {filteredOrders.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateText}>No work orders found</Text>
                        <Text style={styles.emptyStateSubtext}>Try changing your filters</Text>
                    </View>
                )}
            </ScrollView>

            {/* Work Order Detail Modal */}
            <Modal visible={showDetailModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {selectedOrder && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>{selectedOrder.orderNumber}</Text>
                                    <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                                        <Text style={styles.modalClose}>✕</Text>
                                    </TouchableOpacity>
                                </View>

                                <View
                                    style={[
                                        styles.modalStatusBadge,
                                        { backgroundColor: getStatusColor(selectedOrder.status) },
                                    ]}
                                >
                                    <Text style={styles.modalStatusText}>{selectedOrder.status.toUpperCase()}</Text>
                                </View>

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Work Details</Text>
                                    <Text style={styles.modalText}>{selectedOrder.title}</Text>
                                    <Text style={styles.modalDescription}>{selectedOrder.description}</Text>
                                </View>

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Location</Text>
                                    <Text style={styles.modalText}>Zone: {selectedOrder.zone}</Text>
                                    <Text style={styles.modalText}>Address: {selectedOrder.location}</Text>
                                </View>

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Damage Information</Text>
                                    <Text style={styles.modalText}>Type: {selectedOrder.damageType}</Text>
                                    <Text style={styles.modalText}>Severity: {selectedOrder.severity}</Text>
                                </View>

                                <View style={styles.modalSection}>
                                    <Text style={styles.modalSectionTitle}>Cost Estimation</Text>
                                    <Text style={styles.modalText}>
                                        Estimated Cost: ₹{selectedOrder.estimatedCost.toLocaleString()}
                                    </Text>
                                    {selectedOrder.actualCost && (
                                        <Text style={styles.modalText}>
                                            Actual Cost: ₹{selectedOrder.actualCost.toLocaleString()}
                                        </Text>
                                    )}
                                </View>

                                {/* Action Buttons */}
                                <View style={styles.actionButtons}>
                                    {selectedOrder.status === 'pending' && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.acceptButton]}
                                            onPress={() => acceptWorkOrder(selectedOrder.id)}
                                        >
                                            <Text style={styles.actionButtonText}>Accept Work Order</Text>
                                        </TouchableOpacity>
                                    )}

                                    {selectedOrder.status === 'assigned' && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.startButton]}
                                            onPress={() => startWork(selectedOrder.id)}
                                        >
                                            <Text style={styles.actionButtonText}>Start Work</Text>
                                        </TouchableOpacity>
                                    )}

                                    {selectedOrder.status === 'in-progress' && (
                                        <TouchableOpacity
                                            style={[styles.actionButton, styles.completeButton]}
                                            onPress={() => {
                                                Alert.prompt(
                                                    'Complete Work Order',
                                                    'Enter actual cost (₹):',
                                                    (text) => completeWork(selectedOrder.id, parseFloat(text) || 0),
                                                    'plain-text',
                                                    selectedOrder.estimatedCost.toString()
                                                );
                                            }}
                                        >
                                            <Text style={styles.actionButtonText}>Mark as Completed</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// Demo data
const demoWorkOrders: WorkOrder[] = [
    {
        id: 'wo1',
        orderNumber: 'WO-20260131-001',
        reportId: 'rep1',
        title: 'Pothole Repair - Main Street',
        description: 'Large pothole detected on Main Street causing traffic disruption. Immediate repair required.',
        zone: 'Zone 1',
        location: 'Main Street, Near City Hall',
        damageType: 'Pothole',
        severity: 'high',
        estimatedCost: 25000,
        status: 'pending',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
    },
    {
        id: 'wo2',
        orderNumber: 'WO-20260130-002',
        reportId: 'rep2',
        title: 'Crack Sealing - Highway Junction',
        description: 'Multiple alligator cracks detected at highway junction. Preventive sealing needed.',
        zone: 'Zone 4',
        location: 'Highway Junction, Sector 12',
        damageType: 'Crack',
        severity: 'medium',
        estimatedCost: 18000,
        status: 'in-progress',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        assignedVendor: 'ABC Constructions',
    },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#64748b',
    },
    header: {
        backgroundColor: '#1e293b',
        paddingTop: 60,
        paddingBottom: 24,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#94a3b8',
    },
    statsContainer: {
        marginTop: 16,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    statsCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginRight: 12,
        minWidth: 120,
        borderLeftWidth: 4,
    },
    statsValue: {
        fontSize: 32,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 4,
    },
    statsLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    filterSection: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    searchInput: {
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 12,
        fontSize: 16,
        color: '#1e293b',
        marginBottom: 12,
    },
    filterButtons: {
        flexDirection: 'row',
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#e2e8f0',
        marginRight: 8,
    },
    filterButtonActive: {
        backgroundColor: '#2563eb',
    },
    filterButtonText: {
        fontSize: 14,
        color: '#64748b',
        fontWeight: '600',
    },
    filterButtonTextActive: {
        color: '#fff',
    },
    ordersContainer: {
        flex: 1,
        paddingHorizontal: 20,
    },
    orderCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    orderNumber: {
        fontSize: 14,
        color: '#64748b',
        marginBottom: 4,
    },
    orderTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    orderDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    orderDetailItem: {
        flex: 1,
    },
    orderDetailLabel: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 4,
    },
    orderDetailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    severityText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    orderFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingTop: 12,
    },
    orderDate: {
        fontSize: 12,
        color: '#64748b',
    },
    orderDeadline: {
        fontSize: 12,
        color: '#ef4444',
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#94a3b8',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
    },
    modalClose: {
        fontSize: 28,
        color: '#64748b',
    },
    modalStatusBadge: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 24,
    },
    modalStatusText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    modalSection: {
        marginBottom: 24,
    },
    modalSectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 12,
    },
    modalText: {
        fontSize: 14,
        color: '#475569',
        marginBottom: 8,
    },
    modalDescription: {
        fontSize: 14,
        color: '#64748b',
        lineHeight: 20,
    },
    actionButtons: {
        marginTop: 24,
    },
    actionButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    acceptButton: {
        backgroundColor: '#10b981',
    },
    startButton: {
        backgroundColor: '#3b82f6',
    },
    completeButton: {
        backgroundColor: '#8b5cf6',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
