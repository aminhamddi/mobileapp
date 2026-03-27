/**
 * Composant capture photo avec expo-camera — compatible web et native
 */
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    Modal,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { API_URL } from '../constants/config';
import { uploadPhoto } from '../services/api';

const PhotoCapture = ({ photos, onPhotosChange, maxPhotos = 3, disabled }) => {
    const [showCamera, setShowCamera] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);

    // Ouvrir caméra
    const handleOpenCamera = async () => {
        if (photos.length >= maxPhotos) {
            Alert.alert('Limite atteinte', `Maximum ${maxPhotos} photos`);
            return;
        }

        // On web, camera permission is handled by browser prompt
        if (Platform.OS !== 'web') {
            if (!permission?.granted) {
                const result = await requestPermission();
                if (!result.granted) {
                    Alert.alert('Permission requise', 'Autorisez la caméra.');
                    return;
                }
            }
        }

        setShowCamera(true);
    };

    // Prendre photo
    const handleTakePhoto = async () => {
        if (!cameraRef.current) return;

        try {
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.7,
            });

            setShowCamera(false);

            if (Platform.OS === 'web') {
                // On web, photo.uri is a data URI (base64) — convert to File
                await uploadDataUriToServer(photo.uri);
            } else {
                await uploadPhotoToServer(photo.uri);
            }
        } catch (error) {
            console.error('Camera error:', error);
            Alert.alert('Erreur', 'Impossible de prendre la photo');
        }
    };

    // Galerie — native
    const handlePickFromGallery = async () => {
        if (photos.length >= maxPhotos) {
            Alert.alert('Limite atteinte', `Maximum ${maxPhotos} photos`);
            return;
        }

        // Permission auto-granted on web, need request on native
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission requise');
                return;
            }
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
            allowsEditing: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            if (Platform.OS === 'web') {
                // On web, the asset may have a file reference in nativeEvent
                // expo-image-picker on web returns a blob URL or data URI
                const uri = result.assets[0].uri;
                if (uri.startsWith('data:')) {
                    await uploadDataUriToServer(uri);
                } else {
                    // blob URL — fetch as File
                    await uploadBlobUrlToServer(uri);
                }
            } else {
                await uploadPhotoToServer(result.assets[0].uri);
            }
        }
    };

    // Upload from native URI (file path)
    const uploadPhotoToServer = async (uri) => {
        setUploading(true);
        try {
            const response = await uploadPhoto(uri);
            const photoUrl = typeof response === 'string' ? response : (response.url || response.path);
            if (photoUrl) {
                onPhotosChange([...photos, photoUrl]);
            } else {
                throw new Error('Format de réponse invalide');
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Erreur upload');
        } finally {
            setUploading(false);
        }
    };

    // Upload from data URI (web camera)
    const uploadDataUriToServer = async (dataUri) => {
        setUploading(true);
        try {
            const response = await uploadPhoto(dataUri);
            const photoUrl = typeof response === 'string' ? response : (response.url || response.path);
            if (photoUrl) {
                onPhotosChange([...photos, photoUrl]);
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Erreur upload');
        } finally {
            setUploading(false);
        }
    };

    // Upload from blob URL (web image picker)
    const uploadBlobUrlToServer = async (blobUrl) => {
        setUploading(true);
        try {
            const response = await uploadPhoto(blobUrl);
            const photoUrl = typeof response === 'string' ? response : (response.url || response.path);
            if (photoUrl) {
                onPhotosChange([...photos, photoUrl]);
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Erreur upload');
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = (index) => {
        if (Platform.OS === 'web') {
            // window.confirm on web
            if (window.confirm('Supprimer cette photo ?')) {
                onPhotosChange(photos.filter((_, i) => i !== index));
            }
        } else {
            Alert.alert('Supprimer ?', '', [
                { text: 'Annuler', style: 'cancel' },
                {
                    text: 'Supprimer',
                    style: 'destructive',
                    onPress: () => {
                        onPhotosChange(photos.filter((_, i) => i !== index));
                    },
                },
            ]);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>
                Photos ({photos.length}/{maxPhotos})
            </Text>

            {!disabled && photos.length < maxPhotos && (
                <View style={styles.actions}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handleOpenCamera}
                    >
                        <Text style={styles.actionButtonText}>
                            {Platform.OS === 'web' ? '📷 Webcam' : '📷 Caméra'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={handlePickFromGallery}
                    >
                        <Text style={styles.actionButtonText}>🖼️ Galerie</Text>
                    </TouchableOpacity>
                </View>
            )}

            {uploading && (
                <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.uploadingText}>Upload...</Text>
                </View>
            )}

            {photos.length > 0 && (
                <View style={styles.photosList}>
                    {photos.map((url, i) => (
                        <View key={i} style={styles.photoItem}>
                            <Image
                                source={{
                                    uri: url.startsWith('http') ? url : `${API_URL}${url}`,
                                }}
                                style={styles.photoImage}
                            />
                            {!disabled && (
                                <TouchableOpacity
                                    style={styles.deleteButton}
                                    onPress={() => handleDeletePhoto(i)}
                                >
                                    <Text style={styles.deleteButtonText}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* CAMERA MODAL — works on both native and web (getUserMedia) */}
            <Modal visible={showCamera} animationType="slide">
                <View style={styles.cameraContainer}>
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing="back"
                    />

                    <View style={styles.cameraControls}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => setShowCamera(false)}
                        >
                            <Text style={styles.cancelButtonText}>Annuler</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={handleTakePhoto}
                        >
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>

                        <View style={{ width: 80 }} />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginVertical: 15 },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 10,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    actionButton: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderRadius: 8,
        padding: 12,
        marginHorizontal: 5,
        alignItems: 'center',
    },
    actionButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        marginBottom: 10,
    },
    uploadingText: {
        marginLeft: 10,
        color: COLORS.primary,
    },
    photosList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
    photoItem: {
        width: 100,
        height: 100,
        marginRight: 10,
        marginBottom: 10,
        borderRadius: 8,
        overflow: 'hidden',
    },
    photoImage: { width: '100%', height: '100%' },
    deleteButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: COLORS.danger,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteButtonText: { color: '#fff', fontWeight: 'bold' },
    cameraContainer: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    cameraControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    cancelButtonText: { color: '#fff', fontSize: 16 },
    captureButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        borderColor: '#000',
    },
});

export default PhotoCapture;
