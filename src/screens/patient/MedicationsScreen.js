/**
 * Medications Screen
 * View active medications
 */

import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePatient } from '../../contexts/PatientContext';
import { medicationAPI } from '../../services/api';

import {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
} from '../../styles/theme';

import {
  Card,
  Badge,
  Button,
  EmptyState,
  Loading,
  Header,
} from '../../components/common';

import Icon from '../../components/Icon';

const getIndiaDateKey = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
  }).format(date);
};

const formatMedicationDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getMedicationProgress = (medication) => {
  const startKey = getIndiaDateKey(medication.startDate);
  const todayKey = getIndiaDateKey(new Date());
  if (!startKey || !todayKey) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  const startDay = Date.parse(`${startKey}T00:00:00Z`);
  const todayDay = Date.parse(`${todayKey}T00:00:00Z`);
  const elapsedDays = Math.floor((todayDay - startDay) / dayMs) + 1;

  if (elapsedDays < 1) {
    return `Starts ${startKey}`;
  }

  let totalDays = null;
  const endKey = getIndiaDateKey(medication.endDate);
  if (endKey) {
    const endDay = Date.parse(`${endKey}T00:00:00Z`);
    totalDays = Math.max(1, Math.round((endDay - startDay) / dayMs));
  } else {
    const legacyMatch = String(medication.duration || '').trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months)?$/);
    const durationValue = Number.isFinite(Number(medication.durationValue))
      ? Number(medication.durationValue)
      : legacyMatch ? Number(legacyMatch[1]) : null;
    const durationUnit = medication.durationUnit || (legacyMatch?.[2]?.startsWith('week') ? 'weeks' : legacyMatch?.[2]?.startsWith('month') ? 'months' : 'days');
    if (durationValue === null) return `Day ${elapsedDays}`;
    totalDays = durationUnit === 'weeks'
      ? durationValue * 7
      : durationUnit === 'months'
        ? durationValue * 30
        : durationValue;
  }

  return totalDays
    ? `Day ${Math.min(elapsedDays, totalDays)} of ${totalDays}`
    : `Day ${elapsedDays}`;
};

const MedicationsScreen = ({navigation}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const [activeTab, setActiveTab] = useState('active');
  const [historyMedications, setHistoryMedications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const {
    activeMedications,
    loadActiveMedications,
    loading,
  } = usePatient();

  useFocusEffect(
    useCallback(() => {
      loadActiveMedications();
      medicationAPI.getMedications().then((response) => {
        if (response.success) {
          setHistoryMedications(response.medications.filter((medication) => (
            medication.active === false ||
            (medication.endDate && new Date(medication.endDate) < new Date())
          )));
        }
      });
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActiveMedications();
    const response = await medicationAPI.getMedications();
    if (response.success) {
      setHistoryMedications(response.medications.filter((medication) => (
        medication.active === false ||
        (medication.endDate && new Date(medication.endDate) < new Date())
      )));
    }
    setRefreshing(false);
  };

  const MedicationCard = ({ medication, isHistory }) => (
    <Card style={styles.medicationCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Icon
            name="pills"
            size={22}
            color={colors.primary[500]}
          />
        </View>

        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName}>
            {medication.name}
          </Text>
          <Text style={styles.dosage}>
            {medication.dosage} • {medication.frequency}
          </Text>
        </View>

        <Badge variant={isHistory ? 'gray' : 'success'} size="sm">
          {isHistory ? 'Expired' : 'Active'}
        </Badge>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Start date</Text>
          <Text style={styles.detailValue}>
            {formatMedicationDate(medication.startDate || medication.createdAt)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Current day</Text>
          <Text style={[styles.detailValue, styles.progressValue]}>
            {isHistory ? 'Completed' : getMedicationProgress(medication) || 'Start date unavailable'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration</Text>
          <Text style={styles.detailValue}>
            {medication.duration}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Prescribed by</Text>
          <Text
            style={styles.detailValue}
            numberOfLines={1}
          >
            {medication.prescribedBy}
          </Text>
        </View>

        {medication.prescriptionRecordId && (
          <Button
            size="sm"
            variant="outline"
            icon="file-text"
            onPress={() => navigation.getParent()?.navigate('Records', {
              screen: 'RecordDetails',
              params: { recordId: medication.prescriptionRecordId },
            })}
            style={styles.prescriptionButton}
          >
            View prescription
          </Button>
        )}
      </View>
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading medications..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Medications"
        leftIcon="back"
        onLeftPress={navigation.goBack}
      />

      <View style={styles.container}>
        <View style={[styles.tabsContainer, isWeb && styles.webTabsContainer]}>
          {[
            { id: 'active', label: 'Active' },
            { id: 'history', label: 'History' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {activeTab === tab.id && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={activeTab === 'active' ? activeMedications : historyMedications}
          renderItem={({ item }) => (
            <MedicationCard medication={item} isHistory={activeTab === 'history'} />
          )}
          keyExtractor={(item) => item.id || item._id}
          contentContainerStyle={[styles.listContent, isWeb && styles.webListContent]}
          numColumns={isTabletUp ? 2 : 1}
          key={isTabletUp ? 'medications-grid' : 'medications-list'}
          columnWrapperStyle={isTabletUp && styles.listColumn}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={
                <Icon
                  name="pills"
                  size={48}
                  color={colors.gray[400]}
                />
              }
              title={activeTab === 'active' ? 'No Active Medications' : 'No Medication History'}
              description={activeTab === 'active' ? "You don't have any active medications" : "Expired medications will appear here"}
            />
          }
        />
      </View>
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

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  webTabsContainer: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[500],
  },
  tabTextActive: {
    color: colors.primary[500],
  },
  tabIndicator: {
    marginTop: spacing.xs,
    height: 3,
    width: '100%',
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
  },

  listContent: {
    padding: spacing.lg,
  },
  webListContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingBottom: spacing['2xl'],
  },
  listColumn: {
    gap: spacing.md,
  },

  medicationCard: {
    flex: 1,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadows.sm,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },

  medicationInfo: {
    flex: 1,
    minWidth: 0,
  },

  medicationName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
    flexShrink: 1,
  },

  dosage: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },

  cardBody: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },

  detailLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },

  detailValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[900],
    maxWidth: '60%',
    textAlign: 'right',
  },

  progressValue: {
    color: colors.primary[600],
  },
});

export default MedicationsScreen;
