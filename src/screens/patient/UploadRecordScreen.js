import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePatient } from '../../contexts/PatientContext';

import {
  Button,
  Card,
  Header,
} from '../../components/common';

import Icon from '../../components/Icon';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';

const RECORD_TYPES = [
  { label: 'Lab Report', value: 'lab-report' },
  { label: 'X-Ray / Scan', value: 'x-ray' },
  { label: 'Prescription', value: 'prescription' },
  { label: 'Other', value: 'other' },
];

const UploadRecordScreen = ({ navigation }) => {
  const { uploadMedicalRecord } = usePatient();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';

  const [type, setType] = useState('lab-report');
  const [title, setTitle] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please allow access to your photo library');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          file: asset.file,
          name: asset.fileName || asset.name || asset.file?.name || 'image.jpg',
          type: 'image',
          mimeType: asset.mimeType || asset.file?.type,
        });
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          file: asset.file,
          name: asset.name || asset.file?.name || 'document',
          type: 'document',
          mimeType: asset.mimeType || asset.file?.type,
        });
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const showPickerOptions = () => {
    Alert.alert(
      'Select Document',
      'Choose how to add your document',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        { text: 'Pick Document', onPress: pickDocument },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takePhoto = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Camera unavailable', 'Please use Choose from Gallery or Pick Document on the website.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        setSelectedFile({
          uri: result.assets[0].uri,
          name: 'photo.jpg',
          type: 'image',
        });
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleUpload = async () => {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter record title');
      return;
    }

    if (!selectedFile) {
      Alert.alert('No document', 'Please upload a document');
      return;
    }

    if (Number.isNaN(new Date(recordDate).getTime())) {
      Alert.alert('Invalid date', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    setLoading(true);

    const res = await uploadMedicalRecord({
      type,
      title,
      recordDate,
      file: selectedFile,
    });

    setLoading(false);

    if (res.success) {
      Alert.alert('Success', 'Record uploaded successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert('Error', res.message || 'Failed to upload record');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Upload Record"
        leftIcon="back"
        onLeftPress={navigation.goBack}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.webContentContainer]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          {/* TITLE */}
          <Text style={styles.label}>Record Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Blood Test Report"
            value={title}
            onChangeText={setTitle}
            placeholderTextColor={colors.gray[400]}
          />

          <Text style={styles.label}>Record Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={recordDate}
            onChangeText={setRecordDate}
            placeholderTextColor={colors.gray[400]}
            keyboardType="numbers-and-punctuation"
          />

          {/* TYPE */}
          <Text style={styles.label}>Record Type</Text>
          <View style={styles.typeRow}>
            {RECORD_TYPES.map(item => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.typeChip,
                  type === item.value && styles.typeChipActive,
                ]}
                onPress={() => setType(item.value)}
              >
                <Text
                  style={[
                    styles.typeText,
                    type === item.value && styles.typeTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* SELECTED FILE PREVIEW */}
          {selectedFile && (
            <View style={styles.previewContainer}>
              {selectedFile.type === 'image' ? (
                <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.documentPreview}>
                  <Icon name="file-text" size={32} color={colors.primary[500]} />
                  <Text style={styles.documentName} numberOfLines={1}>{selectedFile.name}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => setSelectedFile(null)}
              >
                <Icon name="x" size={16} color={colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* UPLOAD */}
          <Button
            variant="outline"
            icon="upload"
            onPress={showPickerOptions}
          >
            {selectedFile ? 'Change Document' : 'Upload Document'}
          </Button>

          {/* SUBMIT */}
          <Button
            loading={loading}
            onPress={handleUpload}
            style={{ marginTop: spacing.md }}
            disabled={!title.trim() || !selectedFile}
          >
            Submit Record
          </Button>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  webContentContainer: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  card: {
    padding: spacing.lg,
    ...shadows.sm,
  },
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    ...(Platform.OS === 'web'
      ? {
          outlineStyle: 'none',
          outlineWidth: 0,
          boxShadow: 'none',
        }
      : {}),
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  typeChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.gray[300],
  },
  typeChipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  typeText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  typeTextActive: {
    color: colors.primary[600],
    fontFamily: typography.fontFamily.semiBold,
  },
  previewContainer: {
    marginBottom: spacing.md,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.lg,
    resizeMode: 'cover',
  },
  documentPreview: {
    padding: spacing.lg,
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentName: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  removeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.danger[500],
    borderRadius: 12,
    padding: spacing.xs,
  },
});

export default UploadRecordScreen;
