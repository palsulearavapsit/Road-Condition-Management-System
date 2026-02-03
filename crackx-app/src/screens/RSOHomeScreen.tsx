import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    Modal,
    Image,
    Platform,
    TextInput
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { Report, User } from '../types';
import storageService from '../services/supabaseStorage';
import authService from '../services/supabaseAuth';
import { formatDate, getSeverityColor } from '../utils';
import * as ImagePicker from 'expo-image-picker';
import notificationService from '../services/notifications';
import { uploadImageToSupabase } from '../services/imageUpload';
import DashboardLayout from '../components/DashboardLayout';

interface RSOHomeScreenProps {
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export default function RSOHomeScreen({ onNavigate, onLogout }: RSOHomeScreenProps) {
    const { t } = useTranslation();
    const [reports, setReports] = useState<Report[]>([]);
    const [sortBySeverity, setSortBySeverity] = useState(false);
    const [userZone, setUserZone] = useState<string>('');
    const [user, setUser] = useState<User | null>(null);

    // Completion Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [repairPhoto, setRepairPhoto] = useState<string | null>(null);
    const [materials, setMaterials] = useState<{ name: string; quantity: string; unit: string }[]>([]);
    const [newMaterial, setNewMaterial] = useState({ name: '', quantity: '', unit: 'kg' });
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        loadReports();

        // Poll for new reports every 30 seconds
        const interval = setInterval(() => {
            loadReports();
        }, 30000);

        return () => clearInterval(interval);
    }, [sortBySeverity]);

    const loadReports = async () => {
        try {
            const user = await authService.getCurrentUser();
            if (user && user.zone) {
                setUserZone(user.zone);
                setUser(user);
                let zoneReports = await storageService.getReportsByZone(user.zone);

                // Self-Healing: Deduplicate Reports by ID
                const uniqueReports = new Map();
                let hasDuplicates = false;

                zoneReports.forEach(r => {
                    if (uniqueReports.has(r.id)) {
                        hasDuplicates = true;
                        // Keep the one with later updatedAt or status completed
                        const existing = uniqueReports.get(r.id);
                        if (new Date(r.updatedAt) > new Date(existing.updatedAt) || r.status === 'completed') {
                            uniqueReports.set(r.id, r);
                        }
                    } else {
                        uniqueReports.set(r.id, r);
                    }
                });

                if (hasDuplicates) {
                    console.log('Found and removing duplicate reports...');
                    zoneReports = Array.from(uniqueReports.values());
                    // We should ideally save this back, but storageService does not expose saveAll.
                    // For now, the UI will just show clean data.
                }

                if (sortBySeverity) {
                    zoneReports = zoneReports.sort((a, b) => {
                        const severityOrder = { high: 3, medium: 2, low: 1 };
                        const aSeverity = a.aiDetection?.severity || 'low';
                        const bSeverity = b.aiDetection?.severity || 'low';
                        return severityOrder[bSeverity] - severityOrder[aSeverity];
                    });
                }

                setReports(zoneReports);
                // ... rest of the function

                // Check if there are any new pending reports to notify about
                const pending = zoneReports.filter(r => r.status === 'pending');
                if (pending.length > 0) {
                    notificationService.scheduleRSOAssignmentNotification(
                        pending[0].id,
                        pending[0].location.roadName || 'Assigned Zone'
                    );
                }
            }
        } catch (error) {
            console.error('Error loading reports:', error);
        }
    };

    const handleLogout = async () => {
        await authService.logout();
        onLogout();
    };

    const initiateCompletion = (report: Report) => {
        setSelectedReport(report);
        setRepairPhoto(null);
        setMaterials([]);
        setModalVisible(true);
    };

    const addMaterial = () => {
        if (newMaterial.name && newMaterial.quantity) {
            setMaterials([...materials, newMaterial]);
            setNewMaterial({ name: '', quantity: '', unit: 'kg' });
        } else {
            Alert.alert(t('error'), 'Please fill material name and quantity');
        }
    };

    const removeMaterial = (index: number) => {
        const updated = [...materials];
        updated.splice(index, 1);
        setMaterials(updated);
    };

    const takeRepairPhoto = async () => {
        try {
            if (Platform.OS === 'web') {
                // On Web, file upload is more reliable than camera for PWA/Basic testing
                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.5,
                    allowsEditing: true,
                });
                if (!result.canceled && result.assets && result.assets.length > 0) {
                    setRepairPhoto(result.assets[0].uri);
                }
            } else {
                // On Native, try Camera first
                const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                if (permissionResult.granted === false) {
                    Alert.alert(t('error'), 'Camera permission is required');
                    return;
                }

                const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    quality: 0.5,
                    allowsEditing: true,
                });

                if (!result.canceled && result.assets && result.assets.length > 0) {
                    setRepairPhoto(result.assets[0].uri);
                }
            }
        } catch (error) {
            console.log('Error taking photo:', error);
            Alert.alert('Error', 'Could not open camera/gallery.');
        }
    };

    const confirmCompletion = async () => {
        if (!selectedReport || !repairPhoto) {
            Alert.alert(t('error'), t('photo_required'));
            return;
        }

        if (materials.length === 0) {
            Alert.alert(t('error'), 'Please add at least one material used');
            return;
        }

        setUploading(true);
        try {
            const report = await storageService.getReportById(selectedReport.id);
            if (report) {
                // Upload photo to Supabase
                try {
                    const publicUrl = await uploadImageToSupabase(repairPhoto, 'repair-proofs', report.id);

                    report.status = 'completed';
                    report.repairCompletedAt = new Date().toISOString();
                    report.repairProofUri = publicUrl; // Save Public URL
                    report.materialsUsed = materials;
                    report.rsoId = user?.username;

                    await storageService.saveReport(report);

                    setModalVisible(false);
                    loadReports();
                    Alert.alert(t('success'), t('repair_completed'));
                } catch (uploadError) {
                    console.error('Upload failed:', uploadError);
                    Alert.alert('Upload Failed', 'Could not upload repair photo. Please check your connection and try again.');
                    setUploading(false); // Stop here
                    return;
                }
            }
        } catch (error) {
            console.error(error);
            Alert.alert(t('error'), 'Failed to update report');
        } finally {
            setUploading(false);
        }
    };

    const stats = {
        total: reports.length,
        pending: reports.filter(r => r.status === 'pending').length,
        inProgress: reports.filter(r => r.status === 'in-progress').length,
        completed: reports.filter(r => r.status === 'completed').length,
    };

    return (
        <DashboardLayout
            title={`${t('rso_dashboard')} - ${userZone.toUpperCase()}`}
            role="rso"
            activeRoute="Dashboard"
            onNavigate={onNavigate}
            onLogout={handleLogout}
        >
            <View style={styles.walletBar}>

                <Text style={styles.welcomeText}>RSO: {user?.username}</Text>
            </View>
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Stats */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{stats.total}</Text>
                        <Text style={styles.statLabel}>Total</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: COLORS.warning }]}>
                            {stats.pending}
                        </Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: COLORS.success }]}>
                            {stats.completed}
                        </Text>
                        <Text style={styles.statLabel}>Done</Text>
                    </View>
                </View>

                {/* Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity
                        style={[styles.sortButton, sortBySeverity && styles.sortButtonActive]}
                        onPress={() => setSortBySeverity(!sortBySeverity)}
                    >
                        <Text style={styles.sortButtonText}>
                            {t('sort_by_severity')}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Reports List */}
                <View style={styles.reportsSection}>
                    <Text style={styles.sectionTitle}>{t('assigned_complaints')}</Text>
                    {reports.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="folder-open-outline" size={64} color={COLORS.gray} style={{ marginBottom: 16, opacity: 0.5 }} />
                            <Text style={styles.emptyText}>No complaints assigned</Text>
                        </View>
                    ) : (
                        reports.map((report) => (
                            <View key={report.id} style={styles.reportCard}>
                                {/* Report Photo */}
                                {report.photoUri && (
                                    <View style={styles.imageContainer}>
                                        {Platform.OS === 'web' && report.photoUri.startsWith('file://') ? (
                                            <View style={{ alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                                <Ionicons name="phone-portrait-outline" size={48} color={COLORS.gray} />
                                                <Text style={{ color: COLORS.gray, marginTop: 8 }}>Image only available on Mobile</Text>
                                            </View>
                                        ) : (
                                            <Image
                                                source={{ uri: report.photoUri }}
                                                style={styles.reportImage}
                                                resizeMode="cover"
                                            />
                                        )}
                                    </View>
                                )}

                                <View style={styles.reportHeader}>
                                    <View>
                                        <Text style={styles.reportType}>
                                            {report.aiDetection?.damageType || 'Unknown'}
                                        </Text>
                                        <Text style={styles.reportLocation}>
                                            {report.location.roadName || report.location.address || 'Unknown'}
                                        </Text>
                                    </View>
                                    <View
                                        style={[
                                            styles.severityBadge,
                                            {
                                                backgroundColor: getSeverityColor(
                                                    report.aiDetection?.severity || 'low'
                                                ),
                                            },
                                        ]}
                                    >
                                        <Text style={styles.severityText}>
                                            {report.aiDetection?.severity || 'N/A'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.reportMeta}>
                                    <Text style={styles.reportDate}>
                                        {formatDate(report.createdAt)}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.statusBadge,
                                            {
                                                color:
                                                    report.status === 'completed'
                                                        ? COLORS.success
                                                        : report.status === 'in-progress'
                                                            ? COLORS.secondary
                                                            : COLORS.warning,
                                            },
                                        ]}
                                    >
                                        {report.status}
                                    </Text>
                                </View>

                                {report.status !== 'completed' && (
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => initiateCompletion(report)}
                                    >
                                        <Text style={styles.actionButtonText}>
                                            {t('mark_as_completed')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Completion Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('repair_completed')}?</Text>
                        <Text style={styles.modalSubtitle}>{t('upload_repair_proof')}</Text>

                        {repairPhoto ? (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: repairPhoto }} style={styles.previewImage} />
                                <TouchableOpacity onPress={takeRepairPhoto} style={styles.retakeButton}>
                                    <Text style={styles.retakeText}>{t('retake_photo')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={takeRepairPhoto} style={styles.photoPlaceholder}>
                                <Ionicons name="camera-outline" size={64} color={COLORS.gray} style={{ marginBottom: 12 }} />
                                <Text style={styles.photoPlaceholderText}>{t('take_photo')}</Text>
                            </TouchableOpacity>
                        )}

                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Material Inventory Tracking</Text>
                        <View style={styles.materialInputRow}>
                            <TextInput
                                style={styles.materialInput}
                                placeholder="Material (e.g. Asphalt)"
                                value={newMaterial.name}
                                onChangeText={(text) => setNewMaterial({ ...newMaterial, name: text })}
                            />
                            <TextInput
                                style={[styles.materialInput, { width: 80, marginLeft: 8 }]}
                                placeholder="Qty"
                                value={newMaterial.quantity}
                                onChangeText={(text) => setNewMaterial({ ...newMaterial, quantity: text })}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity style={styles.addButton} onPress={addMaterial}>
                                <Ionicons name="add" size={24} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.materialsList}>
                            {materials.map((m, index) => (
                                <View key={index} style={styles.materialTag}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={styles.materialTagText}>{m.name} ({m.quantity} {m.unit})</Text>
                                        <TouchableOpacity onPress={() => removeMaterial(index)}>
                                            <Ionicons name="close-circle" size={18} color={COLORS.danger} style={{ marginLeft: 8 }} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setModalVisible(false)}
                            >
                                <Text style={styles.modalButtonTextCancel}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.modalButtonConfirm,
                                    (!repairPhoto || materials.length === 0) && styles.disabledButton
                                ]}
                                onPress={confirmCompletion}
                                disabled={!repairPhoto || materials.length === 0 || uploading}
                            >
                                <Text style={styles.modalButtonTextConfirm}>
                                    {uploading ? t('loading') : t('confirm')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </DashboardLayout>
    );
}

const styles = StyleSheet.create({
    content: {
        flex: 1,
    },
    statsCard: {
        flexDirection: 'row',
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
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.border,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.gray,
        marginTop: 4,
        fontWeight: '500',
    },
    controls: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sortButton: {
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sortButtonActive: {
        backgroundColor: COLORS.secondary,
        borderColor: COLORS.primary,
    },
    sortButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.dark,
    },
    reportsSection: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 12,
    },
    emptyState: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
    },
    emptyIcon: {
        fontSize: 64,
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.gray,
    },
    reportCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    imageContainer: {
        marginHorizontal: -16,
        marginTop: -16,
        marginBottom: 12,
        height: 200,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reportImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    reportType: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    reportLocation: {
        fontSize: 14,
        color: COLORS.gray,
    },
    severityBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        height: 24,
    },
    severityText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    reportMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    reportDate: {
        fontSize: 12,
        color: COLORS.gray,
    },
    statusBadge: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    actionButton: {
        backgroundColor: COLORS.success,
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    actionButtonText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        minHeight: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: COLORS.gray,
        marginBottom: 20,
    },
    photoPlaceholder: {
        height: 200,
        backgroundColor: COLORS.light,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    photoPlaceholderIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    photoPlaceholderText: {
        color: COLORS.gray,
        fontWeight: '600',
    },
    previewContainer: {
        marginBottom: 24,
        alignItems: 'center',
    },
    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        marginBottom: 12,
        resizeMode: 'cover',
    },
    retakeButton: {
        padding: 8,
        marginTop: 8,
    },
    retakeText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 14,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonCancel: {
        backgroundColor: COLORS.light,
    },
    modalButtonConfirm: {
        backgroundColor: COLORS.success,
    },
    disabledButton: {
        opacity: 0.5,
    },
    modalButtonTextCancel: {
        color: COLORS.dark,
        fontWeight: '600',
        fontSize: 16,
    },
    modalButtonTextConfirm: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
    materialInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    materialInput: {
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        flex: 1,
    },
    addButton: {
        backgroundColor: COLORS.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    materialsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 20,
        gap: 8,
    },
    materialTag: {
        backgroundColor: '#f1f5f9',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    materialTagText: {
        fontSize: 12,
        color: COLORS.dark,
        fontWeight: '500',
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
