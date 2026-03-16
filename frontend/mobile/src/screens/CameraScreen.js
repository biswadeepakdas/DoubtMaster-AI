/**
 * Camera Screen - Photo capture for question solving
 * One-tap capture → crop → solve
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import { questionAPI } from '../services/api.js';
import { useAppStore } from '../store/authStore.js';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
  const [capturedImage, setCapturedImage] = useState(null);
  const [isSolving, setIsSolving] = useState(false);
  const [error, setError] = useState(null);
  const { addRecentQuestion, incrementSolved } = useAppStore();

  const handleCapture = async () => {
    // In production: use expo-camera
    // const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, base64: false });
    // setCapturedImage(photo.uri);

    // Demo: simulate capture
    setCapturedImage('captured');
  };

  const handleSolve = async () => {
    setIsSolving(true);
    setError(null);

    try {
      // In production: create FormData with actual image
      const formData = new FormData();
      // formData.append('image', { uri: capturedImage, type: 'image/jpeg', name: 'question.jpg' });

      // Demo: use text solve
      const { data } = await questionAPI.solveText({
        textQuestion: 'Solve: 2x + 5 = 15',
        subject: 'math',
        language: 'en',
      });

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
      setError(err.response?.data?.error || 'Failed to solve. Please try again.');
    } finally {
      setIsSolving(false);
    }
  };

  const handlePickFromGallery = async () => {
    // In production: use expo-image-picker
    // const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    // if (!result.canceled) setCapturedImage(result.assets[0].uri);
    setCapturedImage('gallery');
  };

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          {/* In production: show actual image */}
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Question Image Preview</Text>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.retakeButton}
            onPress={() => { setCapturedImage(null); setError(null); }}
          >
            <Text style={styles.retakeText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.solveButton, isSolving && styles.solvingButton]}
            onPress={handleSolve}
            disabled={isSolving}
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

  return (
    <View style={styles.container}>
      {/* Camera Viewfinder */}
      <View style={styles.viewfinder}>
        <Text style={styles.viewfinderText}>Camera Viewfinder</Text>
        <Text style={styles.viewfinderHint}>Point at your question</Text>

        {/* Crop overlay */}
        <View style={styles.cropOverlay}>
          <View style={styles.cropCorner} />
          <View style={[styles.cropCorner, styles.cropTopRight]} />
          <View style={[styles.cropCorner, styles.cropBottomLeft]} />
          <View style={[styles.cropCorner, styles.cropBottomRight]} />
        </View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryButton} onPress={handlePickFromGallery}>
          <Text style={styles.controlIcon}>{'🖼️'}</Text>
          <Text style={styles.controlLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.flashButton}
          onPress={() => {}}
        >
          <Text style={styles.controlIcon}>{'⚡'}</Text>
          <Text style={styles.controlLabel}>Flash</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },

  viewfinder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a1a2e' },
  viewfinderText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  viewfinderHint: { color: '#94A3B8', fontSize: 14, marginTop: 8 },

  cropOverlay: { position: 'absolute', width: width - 40, height: 200, borderWidth: 2, borderColor: '#6366F1', borderRadius: 12 },
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
  imagePlaceholder: { width: width - 40, height: 300, backgroundColor: '#1E293B', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { color: '#94A3B8', fontSize: 16 },

  errorBanner: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#EF4444', padding: 12, borderRadius: 8 },
  errorText: { color: '#FFFFFF', textAlign: 'center' },

  actionBar: { flexDirection: 'row', padding: 20, paddingBottom: 40, gap: 12, backgroundColor: '#000000' },
  retakeButton: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center' },
  retakeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  solveButton: { flex: 2, flexDirection: 'row', padding: 16, borderRadius: 12, backgroundColor: '#6366F1', alignItems: 'center', justifyContent: 'center', gap: 8 },
  solvingButton: { backgroundColor: '#4F46E5' },
  solveText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
