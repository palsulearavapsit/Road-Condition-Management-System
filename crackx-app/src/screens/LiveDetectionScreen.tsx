import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Platform,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import aiService from '../services/ai';
import { AIDetectionResult, Report } from '../types';
import locationService from '../services/location';
import storageService from '../services/supabaseStorage';
import authService from '../services/supabaseAuth';
import { uploadImageToSupabase } from '../services/imageUpload';
import { uploadVideoToSupabase } from '../services/videoUpload';
import { generateId } from '../utils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LiveDetectionScreenProps {
    onCapture: (photoUri: string, detection: AIDetectionResult) => void;
    onClose: () => void;
}

export default function LiveDetectionScreen({ onCapture, onClose }: LiveDetectionScreenProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [micPermission, requestMicPermission] = useMicrophonePermissions();
    const [facing, setFacing] = useState<CameraType>('back');
    const [isScanning, setIsScanning] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [detection, setDetection] = useState<AIDetectionResult | null>(null);
    const [lastScanTime, setLastScanTime] = useState(0);

    // Track the best detection during a recording session
    const bestDetectionRef = useRef<{ detection: AIDetectionResult; uri: string } | null>(null);
    const cameraRef = useRef<CameraView>(null);

    useEffect(() => {
        if (permission && !permission.granted) {
            requestPermission();
        }
        if (micPermission && !micPermission.granted) {
            requestMicPermission();
        }
    }, [permission, micPermission]);

    // Continuous scanning loop (runs during scanning AND recording)
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        const scanFrame = async () => {
            if ((!isScanning && !isRecording) || !cameraRef.current || isUploading) return;

            const now = Date.now();
            if (now - lastScanTime < 1000) return; // Limit to 1 FPS

            try {
                // Take a silent snapshot for analysis
                // Note: skipProcessing is Android only, speeds up capture
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.4,
                    base64: false,
                    skipProcessing: true,
                    shutterSound: false,
                });

                if (photo && photo.uri) {
                    setLastScanTime(Date.now());

                    // Send to AI
                    const result = await aiService.detectDamage(photo.uri);

                    // Update UI if valid detection
                    if (result && result.confidence > 0.5) {
                        setDetection(result);

                        // If recording, check if this is the best detection so far
                        if (isRecording) {
                            const currentBest = bestDetectionRef.current;
                            // Update if no previous best, or if current confidence is higher
                            if (!currentBest || result.confidence > currentBest.detection.confidence) {
                                console.log('📸 New Best Frame Found:', result.damageType, result.confidence);
                                bestDetectionRef.current = { detection: result, uri: photo.uri };
                            }
                        }
                    } else {
                        setDetection(null);
                    }
                }
            } catch (error) {
                // Ignore frequent errors during recording (common on some devices)
                // console.log('Live Scan Error (expected during recording):', error);
            }
        };

        if (isScanning || isRecording) {
            intervalId = setInterval(scanFrame, 1500);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isScanning, isRecording, lastScanTime, isUploading]);

    const handleStartRecording = async () => {
        if (cameraRef.current) {
            setIsRecording(true);
            setIsScanning(false); // Stop "scanning mode" UI, enter "recording mode"
            bestDetectionRef.current = null; // Reset best detection

            try {
                console.log('🎥 Recording started...');
                // Small delay to ensure camera is ready for video mode
                await new Promise(resolve => setTimeout(resolve, 500));

                if (!cameraRef.current) return;

                const video = await cameraRef.current.recordAsync({
                    maxDuration: 60, // Limit to 60 seconds
                });

                // This code runs when recording stops (either manually or limit reached)
                console.log('🛑 Recording finished. Video URI:', video?.uri);
                handleRecordingFinished(video?.uri);

            } catch (error) {
                console.error('Recording error:', error);
                Alert.alert('Error', 'Failed to record video');
                setIsRecording(false);
                setIsScanning(true);
            }
        }
    };

    const handleStopRecording = () => {
        if (cameraRef.current && isRecording) {
            cameraRef.current.stopRecording();
            // isRecording state will be set to false in handleRecordingFinished/cleanup
            // but we set it here to update UI immediately
            setIsRecording(false);
        }
    };

    const handleRecordingFinished = async (videoUri?: string) => {
        setIsRecording(false);
        const best = bestDetectionRef.current;

        if (best && videoUri) {
            // Damage was detected! Auto-submit report.
            Alert.alert(
                'Damage Detected',
                `We detected ${best.detection.damageType} with ${(best.detection.confidence * 100).toFixed(0)}% confidence. Submitting report...`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => setIsScanning(true) },
                    { text: 'Upload Now', onPress: () => submitAutoReport(best, videoUri) }
                ]
            );
        } else {
            if (!videoUri) {
                Alert.alert('Error', 'Video recording failed.');
            } else {
                Alert.alert('No Significant Damage', 'No significant damage was detected in this recording.');
            }
            setIsScanning(true);
        }
    };

    const submitAutoReport = async (bestFrame: { detection: AIDetectionResult, uri: string }, videoUri: string) => {
        setIsUploading(true);
        try {
            // 1. Get User & Location
            const user = await authService.getCurrentUser();
            if (!user) throw new Error('User not logged in');

            const location = await locationService.getCurrentLocation();
            if (!location) throw new Error('Could not get location. Enable GPS.');

            const reportId = generateId();

            // 2. Upload Best Frame (Image)
            console.log('📤 Uploading best frame...');
            const photoUrl = await uploadImageToSupabase(bestFrame.uri, 'damage-photos', reportId);

            // 3. Upload Video
            console.log('📤 Uploading video...');
            const videoUrl = await uploadVideoToSupabase(videoUri, reportId);

            // 4. Create Report
            const report: Report = {
                id: reportId,
                citizenId: user.id,
                reportingMode: 'on-site',
                location: {
                    ...location,
                    zone: location.zone || 'zone1' // Fallback
                },
                photoUri: photoUrl,
                videoUri: videoUrl,
                aiDetection: bestFrame.detection,
                status: 'pending',
                syncStatus: 'synced',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            await storageService.saveReport(report);

            Alert.alert('Success', 'Report submitted automatically with video evidence!', [
                { text: 'OK', onPress: onClose }
            ]);

        } catch (error: any) {
            console.error('Auto-submit failed:', error);
            Alert.alert('Upload Failed', error.message || 'Could not submit report.');
            setIsScanning(true);
        } finally {
            setIsUploading(false);
        }
    };

    if (!permission || !micPermission) return <View style={styles.container} />;
    if (!permission.granted || !micPermission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Camera & Microphone Permission required</Text>
                <TouchableOpacity onPress={() => { requestPermission(); requestMicPermission(); }} style={styles.button}>
                    <Text style={styles.buttonText}>Grant Permissions</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} facing={facing} ref={cameraRef} mode="video">
                {/* Overlay for detections */}
                {detection && (
                    <View style={styles.overlayContainer}>
                        <View style={[
                            styles.boundingBox,
                            {
                                top: detection.boundingBox.y * SCREEN_HEIGHT * 0.7,
                                left: detection.boundingBox.x * SCREEN_WIDTH,
                                width: detection.boundingBox.width * SCREEN_WIDTH,
                                height: detection.boundingBox.height * SCREEN_HEIGHT * 0.7,
                                borderColor: detection.severity === 'high' ? COLORS.danger : COLORS.warning,
                            }
                        ]}>
                            <View style={[styles.labelBadge, { backgroundColor: detection.severity === 'high' ? COLORS.danger : COLORS.warning }]}>
                                <Text style={styles.labelText}>
                                    {detection.damageType} ({Math.round(detection.confidence * 100)}%)
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Loading Overlay */}
                {isUploading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={COLORS.white} />
                        <Text style={styles.loadingText}>Uploading Report & Video...</Text>
                    </View>
                )}

                {/* Controls */}
                {!isUploading && (
                    <View style={styles.controlsContainer}>
                        <View style={styles.topBar}>
                            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                                <Ionicons name="close-circle" size={40} color="white" />
                            </TouchableOpacity>
                            <View style={styles.statusBadge}>
                                <View style={[styles.statusDot, { backgroundColor: isRecording ? '#ef4444' : '#22c55e' }]} />
                                <Text style={styles.statusText}>
                                    {isRecording ? 'RECORDING REC' : 'LIVE ANALYSIS'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setFacing(c => (c === 'back' ? 'front' : 'back'))} style={styles.iconButton}>
                                <Ionicons name="camera-reverse" size={32} color="white" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.bottomBar}>
                            {detection && (
                                <View style={styles.detectionInfo}>
                                    <Text style={styles.detectionTitle}>{detection.damageType.toUpperCase()}</Text>
                                    <Text style={styles.detectionSubtitle}>{detection.severity.toUpperCase()} SEVERITY</Text>
                                </View>
                            )}

                            {!detection && (
                                <Text style={styles.hintText}>
                                    {isRecording ? 'Analyzing frames...' : 'Ready to analyze'}
                                </Text>
                            )}

                            {isRecording ? (
                                <TouchableOpacity style={styles.stopButton} onPress={handleStopRecording}>
                                    <View style={styles.stopInner} />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.recordButton} onPress={handleStartRecording}>
                                    <View style={styles.recordInner} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                )}
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    camera: { flex: 1 },
    text: { color: 'white', textAlign: 'center' },
    button: { alignSelf: 'center', backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, marginTop: 20 },
    buttonText: { color: 'white', fontWeight: 'bold' },
    overlayContainer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
    boundingBox: { position: 'absolute', borderWidth: 3, borderRadius: 4, zIndex: 10 },
    labelBadge: { position: 'absolute', top: -25, left: -2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    labelText: { color: 'white', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 50 },
    loadingText: { color: 'white', marginTop: 10, fontSize: 16, fontWeight: 'bold' },
    controlsContainer: { flex: 1, justifyContent: 'space-between', padding: 20, paddingTop: 50, zIndex: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    iconButton: { padding: 8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    statusText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
    bottomBar: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 20, paddingBottom: 40 },
    recordButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    recordInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#ef4444' },
    stopButton: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
    stopInner: { width: 40, height: 40, borderRadius: 4, backgroundColor: '#ef4444' },
    detectionInfo: { alignItems: 'center', marginBottom: 10 },
    detectionTitle: { color: 'white', fontWeight: 'bold', fontSize: 20, marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.75)', textShadowRadius: 3 },
    detectionSubtitle: { color: '#fbbf24', fontWeight: 'bold', fontSize: 16 },
    hintText: { color: '#d1d5db', fontSize: 14, marginBottom: 20, fontStyle: 'italic' },
});
