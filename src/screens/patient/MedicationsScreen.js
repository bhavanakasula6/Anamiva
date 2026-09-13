/**
 * Medications Screen
 * View active medications
 */

import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePatient } from '../../contexts/PatientContext';

import {
  colors,
  typography,
  spacing,
  shadows,
} from '../../styles/theme';

import {
  Card,
  Badge,
  EmptyState,
  Loading,
  Header,
} from '../../components/common';

import Icon from '../../components/Icon';

const MedicationsScreen = ({navigation}) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const {
    activeMedications,
    loadActiveMedications,
    loading,
  } = usePatient();

  useFocusEffect(
    React.useCallback(() => {
      loadActiveMedications();
    }, [])
  );

  const MedicationCard = ({ medication }) => (
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

        <Badge variant="success" size="sm">
          Active
        </Badge>
      </View>

      <View style={styles.cardBody}>
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
      </View>
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading medications..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Active Medications"
        leftIcon="back"
        onLeftPress={navigation.goBack}
      />

      <View style={styles.container}>
        <FlatList
          data={activeMedications}
          renderItem={({ item }) => (
            <MedicationCard medication={item} />
          )}
          keyExtractor={(item) => item.id || item._id}
          contentContainerStyle={[styles.listContent, isWeb && styles.webListContent]}
          numColumns={isTabletUp ? 2 : 1}
          key={isTabletUp ? 'medications-grid' : 'medications-list'}
          columnWrapperStyle={isTabletUp && styles.listColumn}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={
                <Icon
                  name="pills"
                  size={48}
                  color={colors.gray[400]}
                />
              }
              title="No Active Medications"
              description="You don't have any active medications"
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
});

export default MedicationsScreen;
