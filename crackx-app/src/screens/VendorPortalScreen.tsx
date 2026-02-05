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
import { Ionicons } from '@expo/vector-icons';
import syncService from '../services/sync';
import DashboardLayout from '../components/DashboardLayout';
import { COLORS } from '../constants';

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

interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
    unit: string;
}

interface VendorPortalScreenProps {
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export default function VendorPortalScreen({ onNavigate, onLogout }: VendorPortalScreenProps) {
    const { t } = useTranslation();
    const [viewMode, setViewMode] = useState<'orders' | 'inventory'>('orders');
    const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([
        { id: '1', name: 'Asphalt Mix', quantity: 500, unit: 'kg' },
        { id: '2', name: 'Road Sealant', quantity: 120, unit: 'liters' },
        { id: '3', name: 'Line Paint (White)', quantity: 45, unit: 'liters' },
    ]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showInventoryModal, setShowInventoryModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemQty, setNewItemQty] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadWorkOrders();
    }, []);

    const loadWorkOrders = async () => {
        try {
            const orders = await syncService.fetchWorkOrders();
            setWorkOrders(orders);
            setLoading(false);
        } catch (error) {
            console.error('Error loading work orders:', error);
            setWorkOrders(demoWorkOrders);
            setLoading(false);
        }
    };

    const addInventoryItem = () => {
        if (!newItemName || !newItemQty) {
            Alert.alert('Error', 'Please enter name and quantity');
            return;
        }
        const item: InventoryItem = {
            id: Date.now().toString(),
            name: newItemName,
            quantity: parseFloat(newItemQty),
            unit: 'units',
        };
        setInventory([...inventory, item]);
        setNewItemName('');
        setNewItemQty('');
        setShowInventoryModal(false);
    };

    const removeInventoryItem = (id: string) => {
        setInventory(inventory.filter(item => item.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setInventory(inventory.map(item =>
            item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        ));
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
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading Data...</Text>
            </View>
        );
    }

    return (
        <DashboardLayout
            title="Material & Inventory"
            role="rso"
            activeRoute="VendorPortal"
            onNavigate={onNavigate}
            onLogout={onLogout}
        >
            <View style={styles.container}>
                {/* View Mode Switcher */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tab, viewMode === 'orders' && styles.tabActive]}
                        onPress={() => setViewMode('orders')}
                    >
                        <Text style={[styles.tabText, viewMode === 'orders' && styles.tabTextActive]}>Work Orders</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, viewMode === 'inventory' && styles.tabActive]}
                        onPress={() => setViewMode('inventory')}
                    >
                        <Text style={[styles.tabText, viewMode === 'inventory' && styles.tabTextActive]}>Inventory</Text>
                    </TouchableOpacity>
                </View>

                {viewMode === 'orders' ? (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Stats Cards */}
                        <View style={styles.statsRow}>
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
                        </View>

                        {/* Search and Filter */}
                        <View style={styles.filterSection}>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search work orders..."
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
                        <View style={styles.ordersList}>
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

                                    <View style={styles.orderFooter}>
                                        <View style={styles.orderDetailItem}>
                                            <Text style={styles.orderDetailLabel}>Zone:</Text>
                                            <Text style={styles.orderDetailValue}>{order.zone}</Text>
                                        </View>
                                        <View style={styles.orderDetailItem}>
                                            <Text style={styles.orderDetailLabel}>Severity:</Text>
                                            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(order.severity) }]}>
                                                <Text style={styles.severityText}>{order.severity.toUpperCase()}</Text>
                                            </View>
                                        </View>
                                        <Text style={styles.orderDate}>
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                ) : (
                    <View style={{ flex: 1 }}>
                        <View style={styles.inventoryHeader}>
                            <Text style={styles.inventoryTitle}>Stock Management</Text>
                            <TouchableOpacity style={styles.addBtn} onPress={() => setShowInventoryModal(true)}>
                                <Ionicons name="add" size={24} color={COLORS.white} />
                                <Text style={styles.addBtnText}>Add Item</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {inventory.map(item => (
                                <View key={item.id} style={styles.inventoryCard}>
                                    <View style={styles.inventoryInfo}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                                    </View>
                                    <View style={styles.inventoryActions}>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateQuantity(item.id, -1)}
                                        >
                                            <Ionicons name="remove-circle-outline" size={24} color={COLORS.danger} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.qtyBtn}
                                            onPress={() => updateQuantity(item.id, 1)}
                                        >
                                            <Ionicons name="add-circle-outline" size={24} color={COLORS.success} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.deleteBtn}
                                            onPress={() => removeInventoryItem(item.id)}
                                        >
                                            <Ionicons name="trash-outline" size={24} color={COLORS.gray} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}

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

                                    <View style={[styles.modalStatusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                                        <Text style={styles.modalStatusText}>{selectedOrder.status.toUpperCase()}</Text>
                                    </View>

                                    <View style={styles.modalSection}>
                                        <Text style={styles.modalSectionTitle}>Work Details</Text>
                                        <Text style={styles.modalText}>{selectedOrder.title}</Text>
                                        <Text style={styles.modalDescription}>{selectedOrder.description}</Text>
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
                                                style={[styles.actionButton, styles.completeBtn]}
                                                onPress={() => completeWork(selectedOrder.id, selectedOrder.estimatedCost)}
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

                {/* Add Inventory Modal */}
                <Modal visible={showInventoryModal} animationType="fade" transparent>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { maxHeight: 400 }]}>
                            <Text style={styles.modalTitle}>Add New Material</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Material Name (e.g. Cement)"
                                value={newItemName}
                                onChangeText={setNewItemName}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Quantity"
                                keyboardType="numeric"
                                value={newItemQty}
                                onChangeText={setNewItemQty}
                            />
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowInventoryModal(false)}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.confirmBtn} onPress={addInventoryItem}>
                                    <Text style={styles.confirmBtnText}>Add to Stock</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </DashboardLayout>
    );
}

const demoWorkOrders: WorkOrder[] = [
    {
        id: 'wo1', orderNumber: 'WO-101', reportId: 'rep1', title: 'Pothole Repair',
        description: 'Large pothole on highway', zone: 'Zone 1', location: 'Main St',
        damageType: 'Pothole', severity: 'high', estimatedCost: 25000, status: 'pending',
        deadline: '', createdAt: new Date().toISOString()
    },
    {
        id: 'wo2', orderNumber: 'WO-102', reportId: 'rep2', title: 'Crack Sealing',
        description: 'Medium cracks on junction', zone: 'Zone 4', location: 'Sector 12',
        damageType: 'Crack', severity: 'medium', estimatedCost: 15000, status: 'in-progress',
        deadline: '', createdAt: new Date().toISOString()
    }
];

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, color: COLORS.gray },
    tabBar: { flexDirection: 'row', backgroundColor: COLORS.light, borderRadius: 12, padding: 4, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabActive: { backgroundColor: COLORS.white, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, elevation: 2 },
    tabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
    tabTextActive: { color: COLORS.primary },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -8, marginBottom: 8 },
    statsCard: { backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginHorizontal: 8, marginBottom: 16, flex: 1, minWidth: 140, height: 100, borderLeftWidth: 4, borderWidth: 1, borderColor: COLORS.border, elevation: 2 },
    statsValue: { fontSize: 24, fontWeight: '700', color: COLORS.dark },
    statsLabel: { fontSize: 12, color: COLORS.gray },
    filterSection: { marginBottom: 16 },
    searchInput: { backgroundColor: COLORS.white, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12, color: COLORS.dark },
    filterButtons: { flexDirection: 'row' },
    filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.light, marginRight: 8 },
    filterButtonActive: { backgroundColor: COLORS.primary },
    filterButtonText: { fontSize: 12, color: COLORS.gray },
    filterButtonTextActive: { color: COLORS.white },
    ordersList: { gap: 12 },
    orderCard: { backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    orderNumber: { fontSize: 12, color: COLORS.gray },
    orderTitle: { fontSize: 16, fontWeight: '600', color: COLORS.dark },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
    orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
    orderDetailItem: { alignItems: 'flex-start' },
    orderDetailLabel: { fontSize: 10, color: COLORS.gray },
    orderDetailValue: { fontSize: 12, fontWeight: '600' },
    severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    severityText: { color: COLORS.white, fontSize: 8, fontWeight: '700' },
    orderDate: { fontSize: 10, color: COLORS.gray },
    inventoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    inventoryTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.dark },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    addBtnText: { color: COLORS.white, fontWeight: '600', marginLeft: 4 },
    inventoryCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
    inventoryInfo: { flex: 1 },
    itemName: { fontSize: 16, fontWeight: 'bold', color: COLORS.dark },
    itemQty: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
    inventoryActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qtyBtn: { padding: 4 },
    deleteBtn: { padding: 4, marginLeft: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalClose: { fontSize: 24, color: COLORS.gray },
    modalStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginBottom: 20 },
    modalStatusText: { color: COLORS.white, fontWeight: 'bold' },
    modalSection: { marginBottom: 24 },
    modalSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
    modalText: { fontSize: 14, marginBottom: 4 },
    modalDescription: { fontSize: 14, color: COLORS.gray, lineHeight: 20 },
    actionButtons: { gap: 12 },
    actionButton: { padding: 16, borderRadius: 12, alignItems: 'center' },
    acceptButton: { backgroundColor: COLORS.success },
    startButton: { backgroundColor: COLORS.primary },
    completeBtn: { backgroundColor: '#8b5cf6' },
    actionButtonText: { color: COLORS.white, fontWeight: 'bold' },
    input: { backgroundColor: COLORS.light, padding: 12, borderRadius: 12, marginBottom: 16, color: COLORS.dark },
    modalActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    cancelBtnText: { color: COLORS.gray, fontWeight: '600' },
    confirmBtn: { flex: 2, padding: 12, alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 12 },
    confirmBtnText: { color: COLORS.white, fontWeight: 'bold' },
});
