import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
// import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { Report } from '../types';
import storageService from '../services/storage';
import DashboardLayout from '../components/DashboardLayout';
import { MapComponent } from '../components/MapComponent';

interface AdminHeatmapScreenProps {
    onNavigate: (screen: string) => void;
    onLogout: () => void;
}

export default function AdminHeatmapScreen({ onNavigate, onLogout }: AdminHeatmapScreenProps) {
    const { t } = useTranslation();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const allReports = await storageService.getReports();
            setReports(allReports);
        } catch (error) {
            console.error('Failed to load heatmap data:', error);
            Alert.alert('Error', 'Failed to load heatmap data');
        } finally {
            setLoading(false);
        }
    };

    // Filter reports by severity for Heatmap visualization
    const highSeverityReports = reports.filter(r => r.aiDetection?.severity === 'high');
    const mediumSeverityReports = reports.filter(r => r.aiDetection?.severity === 'medium');

    // Prepare Markers for Heatmap
    const mapMarkers = [
        ...highSeverityReports.map(r => ({
            id: r.id,
            latitude: r.location?.latitude || 0,
            longitude: r.location?.longitude || 0,
            color: COLORS.danger
        })),
        ...mediumSeverityReports.map(r => ({
            id: r.id,
            latitude: r.location?.latitude || 0,
            longitude: r.location?.longitude || 0,
            color: COLORS.warning
        }))
    ];

    return (
        <DashboardLayout
            title="Disaster Heatmap"
            role="admin"
            activeRoute="Heatmap"
            onNavigate={onNavigate}
            onLogout={onLogout}
        >
            {loading ? (
                <View style={[styles.container, styles.centerContent]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <View style={styles.container}>
                    <View style={styles.mapHeader}>
                        <Text style={styles.mapTitle}>Vulnerability Map</Text>
                        <Text style={styles.mapSubtitle}>High concentration areas of road damage</Text>
                    </View>

                    {/* Heatmap Legend */}
                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: COLORS.danger }]} />
                            <Text style={styles.legendText}>High Severity (Critical)</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: COLORS.warning }]} />
                            <Text style={styles.legendText}>Medium Severity</Text>
                        </View>
                    </View>

                    <View style={styles.mapContainer}>
                        {/* Heatmap Visualization: Rendering all critical points */}
                        <MapComponent
                            latitude={mapMarkers.length > 0 ? mapMarkers[0].latitude : 17.6599}
                            longitude={mapMarkers.length > 0 ? mapMarkers[0].longitude : 75.9064}
                            interactive={false}
                            markers={mapMarkers}
                        />
                    </View>

                    <ScrollView style={styles.hotspotsList}>
                        <Text style={styles.sectionTitle}>Critical Hotspots</Text>
                        {highSeverityReports.length === 0 ? (
                            <Text style={styles.emptyText}>No critical hotspots detected.</Text>
                        ) : (
                            highSeverityReports.map(report => (
                                <View key={report.id} style={styles.hotspotCard}>
                                    <View style={styles.hotspotIcon}>
                                        <Ionicons name="warning" size={24} color={COLORS.danger} />
                                    </View>
                                    <View style={styles.hotspotInfo}>
                                        <Text style={styles.hotspotRoad}>{report.location?.roadName || 'Unknown Road'}</Text>
                                        <Text style={styles.hotspotZone}>{report.location?.zone?.toUpperCase()}</Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.inspectButton}
                                        onPress={() => Alert.alert('Hotspot Selected', `Location: ${report.location?.latitude || 'N/A'}, ${report.location?.longitude || 'N/A'}`)}
                                    >
                                        <Ionicons name="eye-outline" size={20} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </ScrollView>
                </View>
            )}
        </DashboardLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapHeader: {
        marginBottom: 16,
    },
    mapTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    mapSubtitle: {
        fontSize: 14,
        color: COLORS.gray,
    },
    legend: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 6,
    },
    legendText: {
        fontSize: 12,
        color: COLORS.gray,
        fontWeight: '500',
    },
    mapContainer: {
        height: 300,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 24,
    },
    hotspotsList: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.dark,
        marginBottom: 12,
    },
    hotspotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    hotspotIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fee2e2',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    hotspotInfo: {
        flex: 1,
    },
    hotspotRoad: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.dark,
    },
    hotspotZone: {
        fontSize: 12,
        color: COLORS.gray,
        marginTop: 2,
    },
    inspectButton: {
        padding: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.gray,
        marginTop: 20,
        fontStyle: 'italic',
    },
});
