/**
 * Camera Screen - Photo capture for question solving
 * Handles camera permissions, image capture, gallery pick, and solve upload.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { questionAPI } from '../services/api.js';
import { useAppStore } from '../store/authStore.js';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState(null);
  const [flashOn, setFlashOn] = useState(false);
  const { addRecentQuestion, incrementSolved } = useAppStore();
  const cameraRef = useRef(null);

  // Camera permissions via expo-camera hook
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // ---------------------------------------------------------------------------
  // Capture
  // ---------------------------------------------------------------------------
  const handleCapture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
      });
      setCapturedImage(photo.uri);
    } catch {
      setError('Failed to capture photo. Please try again.');
    }
  };

  // ---------------------------------------------------------------------------
  // Gallery pick
  // ---------------------------------------------------------------------------
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setCapturedImage(result.assets[0].uri);
      }
    } catch {
      setError('Could not open gallery.');
    }
  };

  // ---------------------------------------------------------------------------
  // Solve
  // ---------------------------------------------------------------------------
  const handleSolve = async () => {
    if (!capturedImage) return;
    setIsSolving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', {
        uri: capturedImage,
        type: 'image/jpeg',
        name: 'question.jpg',
      });

      const { data } = await questionAPI.solveImage(formData);

      addRecentQuestion({
        id: data.questionId,
        extractedText: data.extractedText,
        subject: data.subject,
        topic: data.topic,
      });
      incrementSolved();

      navigation.navigate('Solution', {
        questionId: data.questionId,
        solution: data.solution,
        extractedText: data.extractedText,
        subject: data.subject,
        confidence: data.confidence,
      });
    } catch (err) {
      setError(
        err.response?.data?.error || 'Failed to solve. Please try again.'
      );
    } finally {
      setIsSolving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Permission denied state
  // ---------------------------------------------------------------------------
  if (permission && !permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.permTitle}>Camera Permission Required</Text>
        <Text style={styles.permSubtext}>
          DoubtMaster needs camera access to photograph questions.
        </Text>
        {permission.canAskAgain ? (
          <TouchableOpacity
            style={styles.permButton}
            onPress={requestPermission}
            accessibilityRole="button"
            accessibilityLabel="Grant camera permission"
          >
            <Text style={styles.permButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.permButton}
            onPress={() => Linking.openSettings()}
            accessibilityRole="button"
            accessibilityLabel="Open device settings"
          >
            <Text style={styles.permButtonText}>Open Settings</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.permButton, styles.permSecondary]}
          onPress={handlePickFromGallery}
          accessibilityRole="button"
          accessibilityLabel="Pick from gallery instead"
        >
          <Text style={[styles.permButtonText, { color: '#6366F1' }]}>
            Pick from Gallery Instead
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Loading permission state
  // ---------------------------------------------------------------------------
  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Preview + solve UI
  // ---------------------------------------------------------------------------
  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: capturedImage }}
            style={styles.previewImage}
            resizeMode="contain"
            accessibilityLabel="Captured question image"
          />
          {error && (
            <View style={styles.errorBanner} accessible accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => {
              setCapturedImage(null);
              setError(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Retake photo"
          >
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.solveButton, isSolving && styles.solvingButton]}
            onPress={handleSolve}
            disabled={isSolving}
            accessibilityRole="button"
            accessibilityLabel={isSolving ? 'Solving question' : 'Solve now'}
          >
            {isSolving ? (
              <>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.solveText}>Solving...</Text>
              </>
            ) : (
              <Text style={styles.solveText}>Solve Now</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Camera viewfinder
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flashOn ? 'on' : 'off'}
      >
        {/* Crop overlay */}
        <View style={styles.overlayContainer}>
          <View style={styles.cropOverlay}>
            <View style={styles.cropCorner} />
            <View style={[styles.cropCorner, styles.cropTopRight]} />
            <View style={[styles.cropCorner, styles.cropBottomLeft]} />
            <View style={[styles.cropCorner, styles.cropBottomRight]} />
          </View>
          <Text style={styles.viewfinderHint}>Point at your question</Text>
        </View>
      </CameraView>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.galleryButton}
          onPress={handlePickFromGallery}
          accessibilityRole="button"
          accessibilityLabel="Pick image from gallery"
        >
          <Text style={styles.controlIcon}>{'🖼️'}</Text>
          <Text style={styles.controlLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCapture}
          accessibilityRole="button"
          accessibilityLabel="Capture photo"
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.flashButton}
          onPress={() => setFlashOn((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel={flashOn ? 'Turn flash off' : 'Turn flash on'}
        >
          <Text style={styles.controlIcon}>{flashOn ? '⚡' : '🔦'}</Text>
          <Text style={styles.controlLabel}>{flashOn ? 'On' : 'Off'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 24 },

  camera: { flex: 1 },
  overlayContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewfinderHint: { color: '#FFFFFF', fontSize: 14, marginTop: 16, textShadowColor: '#000', textShadowRadius: 4 },

  cropOverlay: { width: width - 40, height: 200, borderWidth: 2, borderColor: '#6366F1', borderRadius: 12 },
  cropCorner: { position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#6366F1' },
  cropTopRight: { left: undefined, right: -2, borderLeftWidth: 0, borderRightWidth: 4 },
  cropBottomLeft: { top: undefined, bottom: -2, borderTopWidth: 0, borderBottomWidth: 4 },
  cropBottomRight: { top: undefined, bottom: -2, left: undefined, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomWidth: 4, borderRightWidth: 4 },

  controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 30, paddingBottom: 50, backgroundColor: '#000000' },
  captureButton: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'transparent', borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  captureButtonInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF' },
  galleryButton: { alignItems: 'center' },
  flashButton: { alignItems: 'center' },
  controlIcon: { fontSize: 28 },
  controlLabel: { color: '#FFFFFF', fontSize: 12, marginTop: 4 },

  previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  previewImage: { width: width - 40, height: 300, borderRadius: 16 },

  errorBanner: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#EF4444', padding: 12, borderRadius: 8 },
  errorText: { color: '#FFFFFF', textAlign: 'center' },

  actionBar: { flexDirection: 'row', padding: 20, paddingBottom: 40, gap: 12, backgroundColor: '#000000' },
  retakeButton: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center' },
  retakeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  solveButton: { flex: 2, flexDirection: 'row', padding: 16, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', gap: 8 },
  solvingButton: { backgroundColor: '#4F46E5' },
  solveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Permission denied UI
  permTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  permSubtext: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 24 },
  permButton: { backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginBottom: 12, minWidth: 200, alignItems: 'center' },
  permSecondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#6366F1' },
  permButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
