import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet icons in Webpack/Metro
const customIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

interface MapComponentProps {
    latitude: number;
    longitude: number;
    onLocationSelect?: (lat: number, lng: number) => void;
    interactive?: boolean;
}

// Component to handle map clicks
function LocationMarker({ onSelect }: { onSelect?: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            if (onSelect) {
                onSelect(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
}

// Component to re-center map when props change
function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    map.setView(center, map.getZoom());
    return null;
}

export const MapComponent: React.FC<MapComponentProps> = ({
    latitude,
    longitude,
    onLocationSelect,
    interactive = true,
}) => {
    return (
        <View style={styles.container}>
            {/* Inject container styles for Leaflet */}
            <style type="text/css">{`
                .leaflet-container {
                    width: 100%;
                    height: 100%;
                    z-index: 1; /* Low z-index to not overlap dropdowns */
                }
            `}</style>

            <MapContainer
                center={[latitude, longitude]}
                zoom={15}
                scrollWheelZoom={interactive}
                style={{ width: '100%', height: '100%' }}
                dragging={interactive}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                <Marker position={[latitude, longitude]} icon={customIcon} />

                {interactive && <LocationMarker onSelect={onLocationSelect} />}
                <ChangeView center={[latitude, longitude]} />
            </MapContainer>

            {/* Overlay hint for web users */}
            {interactive && (
                <View style={styles.webHint}>
                    <Text style={styles.webHintText}>Click on map to move marker</Text>
                </View>
            )}
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
        borderWidth: 1,
        borderColor: '#e2e8f0',
        zIndex: 1, // Ensure map acts as base layer
        position: 'relative'
    },
    webHint: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        zIndex: 1000, // Above map tiles
    },
    webHintText: {
        fontSize: 10,
        color: '#64748b'
    }
});
