import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { MAPBOX_CONFIG } from '../config/mapbox';

// Conditionally import Mapbox to avoid crashes on Web
let Mapbox: any = null;
if (Platform.OS !== 'web') {
    try {
        Mapbox = require('@rnmapbox/maps').default;
        Mapbox.setAccessToken(MAPBOX_CONFIG.accessToken);
    } catch (e) {
        console.warn("Mapbox not found (using Expo Go?)");
    }
}

interface MapComponentProps {
    latitude: number;
    longitude: number;
    onLocationSelect?: (lat: number, lng: number) => void;
    interactive?: boolean;
}

export const MapComponent: React.FC<MapComponentProps> = ({
    latitude,
    longitude,
    onLocationSelect,
    interactive = true,
}) => {
    useEffect(() => {
        if (Mapbox) {
            Mapbox.setTelemetryEnabled(false);
        }
    }, []);

    // Web Fallback
    if (Platform.OS === 'web') {
        return (
            <View style={[styles.container, styles.fallbackContainer]}>
                <Text style={styles.fallbackText}>Maps are not available on Web</Text>
                <Text style={styles.fallbackSubtext}>Use Android Emulator to see Mapbox</Text>
            </View>
        );
    }

    // Expo Go Fallback (Mapbox is null)
    if (!Mapbox) {
        return (
            <View style={[styles.container, styles.fallbackContainer]}>
                <Text style={styles.fallbackText}>Native Maps Missing</Text>
                <Text style={styles.fallbackSubtext}>Run "npx expo run:android" to view</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Mapbox.MapView
                style={styles.map}
                styleURL={MAPBOX_CONFIG.styleUrl}
                rotateEnabled={false}
                attributionEnabled={false}
                logoEnabled={false}
                onPress={(feature: any) => {
                    if (interactive && onLocationSelect && feature.geometry.type === 'Point') {
                        const [lng, lat] = feature.geometry.coordinates;
                        onLocationSelect(lat, lng);
                    }
                }}
            >
                <Mapbox.Camera
                    zoomLevel={15}
                    centerCoordinate={[longitude, latitude]}
                    animationMode={'flyTo'}
                    animationDuration={2000}
                />

                {/* User Marker */}
                <Mapbox.PointAnnotation
                    id="userLocation"
                    coordinate={[longitude, latitude]}
                >
                    <View style={styles.markerContainer}>
                        <View style={styles.markerDot} />
                    </View>
                </Mapbox.PointAnnotation>
            </Mapbox.MapView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 300,
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 16,
        marginBottom: 16,
    },
    map: {
        flex: 1,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 30,
    },
    markerDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ef4444',
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    fallbackContainer: {
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    fallbackText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#64748b',
        marginBottom: 8,
    },
    fallbackSubtext: {
        fontSize: 14,
        color: '#94a3b8',
    }
});
