/**
 * Record Details Screen
 * Shared between Patient & Doctor
 */

import { useFocusEffect } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Linking,
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

import { useDoctor } from '../../contexts/DoctorContext';
import { usePatient } from '../../contexts/PatientContext';

import {
  Button,
  Card,
  EmptyState,
  Header,
  Loading,
} from '../../components/common';

import Icon from '../../components/Icon';
import { API_BASE_URL } from '../../services/httpClient';

import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from '../../styles/theme';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

const getAttachmentName = (url, index) => {
  const fallback = `Attachment ${index + 1}`;
  if (!url) return fallback;

  const cleanUrl = url.split('?')[0];
  const name = cleanUrl.split('/').filter(Boolean).pop();
  return name || fallback;
};

const getAttachmentType = (url) => {
  const cleanUrl = (url || '').split('?')[0].toLowerCase();

  if (/\.(jpg|jpeg|png|gif|webp)$/.test(cleanUrl)) return 'image';
  if (cleanUrl.endsWith('.pdf')) return 'pdf';
  return 'document';
};

const resolveAttachmentUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('file://') || url.startsWith('content://')) {
    return url;
  }

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_ORIGIN}${normalizedPath}`;
};

const RecordDetailsScreen = ({ route, navigation }) => {
  const { recordId = '', patientId = '', mode, record: passedRecord } = route.params || {};
  const { width } = useWindowDimensions();
  const isPatientView = mode === 'PATIENT';
  const isWeb = Platform.OS === 'web';
  const isWide = width >= 768;

  const { medicalRecords, loadMedicalRecords } = usePatient();
  const { getPatientMedicalRecords, updatePrescription, verifyRecord, rejectRecord } = useDoctor();

  const [record, setRecord] = useState(null);
  const [recordDateText, setRecordDateText] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingDate, setSavingDate] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadRecord();
    }, [recordId])
  );

  const loadRecord = async () => {
    setLoading(true);

    // Some callers already have an authorized record payload.
    if (passedRecord) {
      setRecord(passedRecord);
      setRecordDateText(
        new Date(passedRecord.recordDate || passedRecord.date || passedRecord.createdAt)
          .toISOString()
          .slice(0, 10)
      );
      setLoading(false);
      return;
    }

    // 🟢 Patient view
    if (isPatientView) {
      const response = await loadMedicalRecords();
      const latestRecords = response?.success ? response.records : medicalRecords;
      const found = latestRecords.find(r => (r._id || r.id) === recordId);
      setRecord(found || null);
      if (found) {
        setRecordDateText(
          new Date(found.recordDate || found.date || found.createdAt).toISOString().slice(0, 10)
        );
      }
      setLoading(false);
      return;
    }

    // 🟢 Doctor viewing verified records
    const response = await getPatientMedicalRecords(patientId);
    if (response?.success) {
      const found = response.records.find(r => (r._id || r.id) === recordId);
      setRecord(found || null);
      if (found) {
        setRecordDateText(
          new Date(found.recordDate || found.date || found.createdAt).toISOString().slice(0, 10)
        );
      }
    }

    setLoading(false);
  };

  const handleSaveDate = async () => {
    if (Number.isNaN(new Date(recordDateText).getTime())) {
      Alert.alert('Invalid prescription date', 'Please enter date in YYYY-MM-DD format');
      return;
    }

    setSavingDate(true);
    const response = await updatePrescription(record.id || record._id, {
      recordDate: recordDateText,
    });
    setSavingDate(false);

    if (response?.success) {
      setRecord(response.record);
      Alert.alert('Saved', 'Prescription date updated');
      return;
    }

    Alert.alert('Error', 'Failed to update prescription date');
  };

  const handleVerify = async () => {
    setVerifying(true);
    const response = await verifyRecord(record.id || record._id);
    setVerifying(false);

    if (response?.success) {
      setRecord(response.record);
      navigation.goBack();
      return;
    }

    Alert.alert('Error', 'Failed to verify record');
  };

  const handleReject = () => {
    Alert.alert(
      'Reject Record',
      'Are you sure you want to reject this record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setRejecting(true);
            const response = await rejectRecord(record.id || record._id, 'Rejected by doctor');
            setRejecting(false);

            if (response?.success) {
              setRecord(response.record);
              navigation.goBack();
              return;
            }

            Alert.alert('Error', 'Failed to reject record');
          },
        },
      ]
    );
  };

  const attachmentUrls = Array.from(
    new Set([
      ...(Array.isArray(record?.files) ? record.files : []),
      record?.fileUrl,
    ].filter(Boolean))
  );

  const openAttachment = async (url) => {
    const resolvedUrl = resolveAttachmentUrl(url);

    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      const canOpen = await Linking.canOpenURL(resolvedUrl);
      if (!canOpen) {
        Alert.alert('Unable to open file', 'No app is available to open this document.');
        return;
      }

      await Linking.openURL(resolvedUrl);
    } catch (error) {
      console.error('Failed to open attachment:', error);
      Alert.alert('Unable to open file', 'Please try again.');
    }
  };

  if (loading) {
    return <Loading fullScreen text="Loading record..." />;
  }

  if (!record) {
    return (
      <EmptyState
        title="Record Not Found"
        description="The requested medical record could not be found."
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Medical Record"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={isWeb && styles.webScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, isWeb && styles.webContent]}>
        {/* HEADER CARD */}
        <Card style={[styles.headerCard, isWide && styles.wideCard]}>
          <Text style={styles.title}>{record.title}</Text>

          <View style={styles.metaRow}>
            <Icon
              name="calendar"
              size={14}
              color={colors.gray[500]}
            />
            <Text style={styles.metaText}>
              {new Date(record.recordDate || record.date || record.createdAt).toDateString()}
            </Text>
          </View>
        </Card>

        {/* ATTACHMENTS */}
        {attachmentUrls.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Attachments</Text>

            <View style={[styles.attachmentsGrid, isWide && styles.attachmentsGridWide]}>
            {attachmentUrls.map((fileUrl, index) => {
              const attachmentType = getAttachmentType(fileUrl);
              const resolvedUrl = resolveAttachmentUrl(fileUrl);
              const attachmentName = getAttachmentName(fileUrl, index);

              if (attachmentType === 'image') {
                return (
                  <TouchableOpacity
                    key={`${fileUrl}-${index}`}
                    activeOpacity={0.85}
                    onPress={() => openAttachment(fileUrl)}
                    style={[styles.imageAttachment, isWide && styles.attachmentTileWide]}
                  >
                    <Image
                      source={{ uri: resolvedUrl }}
                      style={styles.attachmentImage}
                      resizeMode="contain"
                    />
                    <View style={styles.attachmentFooter}>
                      <Icon name="image" size={16} color={colors.primary[500]} />
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {attachmentName}
                      </Text>
                      <Icon name="external-link" size={14} color={colors.gray[500]} />
                    </View>
                  </TouchableOpacity>
                );
              }

              return (
                <TouchableOpacity
                  key={`${fileUrl}-${index}`}
                  style={[styles.fileAttachment, isWide && styles.attachmentTileWide]}
                  onPress={() => openAttachment(fileUrl)}
                >
                  <View style={styles.fileIcon}>
                    <Icon
                      name={attachmentType === 'pdf' ? 'file-text' : 'file'}
                      size={22}
                      color={colors.primary[500]}
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {attachmentName}
                    </Text>
                    <Text style={styles.fileHint}>
                      Tap to open
                    </Text>
                  </View>
                  <Icon name="external-link" size={16} color={colors.gray[500]} />
                </TouchableOpacity>
              );
            })}
            </View>
          </Card>
        )}

        {/* DIAGNOSIS */}
        {record.diagnosis && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Diagnosis</Text>
            <Text style={styles.bodyText}>
              {record.diagnosis}
            </Text>
          </Card>
        )}

        {/* MEDICATIONS */}
        {record.medications?.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Medications</Text>

            {record.medications.map((med, index) => (
              <View key={med.id || med._id || `${med.name}-${index}`} style={styles.medItem}>
                <View style={styles.medHeader}>
                  <Icon
                    name="pills"
                    size={16}
                    color={colors.primary[500]}
                  />
                  <Text style={styles.medName}>
                    {med.name}
                  </Text>
                </View>

                <Text style={styles.medSub}>
                  {med.dosage} · {med.frequency}
                </Text>
                <Text style={styles.medSub}>
                  Duration: {med.duration}
                </Text>
              </View>
            ))}
          </Card>
        )}

        {mode === 'DOCTOR_VERIFY' && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Prescription Date</Text>
            <TextInput
              style={styles.input}
              value={recordDateText}
              onChangeText={setRecordDateText}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.gray[400]}
              keyboardType="numbers-and-punctuation"
            />
            <View style={styles.actionRow}>
              <Button
                variant="outline"
                onPress={handleReject}
                loading={rejecting}
                disabled={savingDate || verifying || rejecting}
              >
                Reject
              </Button>
              <Button
                variant="outline"
                onPress={handleSaveDate}
                loading={savingDate}
                disabled={savingDate || verifying || rejecting}
              >
                Save
              </Button>
              <Button
                onPress={handleVerify}
                loading={verifying}
                disabled={savingDate || verifying || rejecting}
              >
                Verify
              </Button>
            </View>
          </Card>
        )}

        {/* DOCTOR VIEW NOTICE */}
        {mode === 'DOCTOR_VERIFY' && (
          <View style={styles.noticeBox}>
            <Icon name="alert-circle" size={16} color={colors.warning[500]} />
            <Text style={styles.noticeText}>
              Pending verification · Doctor review required
            </Text>
          </View>
        )}
        {mode === 'DOCTOR' && (
          <View style={styles.noticeBox}>
            <Icon name="lock" size={16} color={colors.gray[500]} />
            <Text style={styles.noticeText}>
              View-only access · Shared by patient
            </Text>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
        </View>
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

  content: {
    padding: spacing.lg,
  },

  webScrollContent: {
    alignItems: 'center',
  },

  webContent: {
    width: '100%',
    maxWidth: 920,
  },

  headerCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },

  wideCard: {
    padding: spacing.xl,
  },

  title: {
    flexShrink: 1,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },

  metaText: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },

  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.sm,
  },

  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[800],
    marginBottom: spacing.sm,
  },

  imageAttachment: {
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[50],
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },

  attachmentsGrid: {
    gap: spacing.sm,
  },

  attachmentsGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  attachmentTileWide: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 260,
  },

  attachmentImage: {
    width: '100%',
    height: 280,
    backgroundColor: colors.gray[100],
  },

  attachmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },

  fileAttachment: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[50],
    marginBottom: spacing.sm,
  },

  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },

  fileInfo: {
    flex: 1,
    minWidth: 0,
  },

  attachmentName: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[800],
  },

  fileHint: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginTop: 2,
  },

  bodyText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },

  medItem: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    marginBottom: spacing.sm,
  },

  medHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },

  medName: {
    flexShrink: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
  },

  medSub: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginTop: 2,
  },

  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
  },

  noticeText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
  },

  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },

  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});

export default RecordDetailsScreen;
