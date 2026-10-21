/**
 * Doctor Profile Screen
 */

import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Button, Card, Header } from '../../components/common';
import Icon from '../../components/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsAPI } from '../../services/api';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';

const DoctorProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const [patientCount, setPatientCount] = useState(null);

  useEffect(() => {
    let active = true;

    analyticsAPI.getDoctorAnalytics({ period: 'all', startDate: null, endDate: null })
      .then(response => {
        if (active && response?.success) {
          setPatientCount(response.summary?.patients ?? 0);
        }
      })
      .catch(error => {
        console.error('Error loading doctor patient count:', error);
        if (active) setPatientCount(0);
      });

    return () => {
      active = false;
    };
  }, []);

  const MenuItem = ({ icon, title, subtitle, onPress }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIcon}>
        <Icon name={icon} size={20} color={colors.primary[500]} />
      </View>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
      </View>
      <Icon name="chevron-right" size={18} color={colors.gray[400]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Profile"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={isWeb && styles.webScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Avatar
            source={{ uri: user?.avatar || user?.profilePicture }}
            size={80}
            name={user?.fullName || user?.name}
          />
          <Text style={styles.userName}>{user?.fullName || user?.name || 'Doctor'}</Text>
          <Text style={styles.userEmail}>{user?.email || user?.phone || user?.phoneNumber || '-'}</Text>
          <Text style={styles.specialization}>{user?.specialization || 'General Physician'}</Text>
          <Button
            variant="outline"
            size="sm"
            style={styles.editButton}
            onPress={() => navigation.navigate('DoctorEditProfile')}
          >
            Edit Profile
          </Button>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.experience || 0}+</Text>
            <Text style={styles.statLabel}>Years</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{patientCount ?? '-'}</Text>
            <Text style={styles.statLabel}>Patients</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>₹{user?.consultationFee || 0}</Text>
            <Text style={styles.statLabel}>Fee</Text>
          </View>
        </View>

        <View style={[styles.profileContentGrid, isTabletUp && styles.profileContentGridWide]}>
          {/* Info */}
          <Card style={[styles.section, isTabletUp && styles.infoSectionWide]}>
            <Text style={styles.sectionTitle}>Professional Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Clinic Name</Text>
              <Text style={styles.infoValue}>{user?.address?.clinic || user?.clinicInfo?.name || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Qualifications</Text>
              <Text style={styles.infoValue}>{user?.qualifications || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registration No</Text>
              <Text style={styles.infoValue}>{user?.registrationNumber || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{user?.phone || user?.phoneNumber || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>{user?.address?.city || '-'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>State</Text>
              <Text style={styles.infoValue}>{user?.address?.state || '-'}</Text>
            </View>
          </Card>

          {/* Menu */}
          <Card style={[styles.section, isTabletUp && styles.menuSectionWide]}>
            <MenuItem
              icon="settings"
              title="Settings"
              subtitle="App preferences"
              onPress={() => navigation.navigate('Settings')}
            />
          </Card>
        </View>

        <View style={styles.bottomPadding} />
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
  webScrollContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingBottom: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderBottomLeftRadius: borderRadius['2xl'],
    borderBottomRightRadius: borderRadius['2xl'],
    ...shadows.sm,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginTop: spacing.md,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  editButton: {
    marginTop: spacing.md,
  },
  specialization: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
    marginTop: spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  locationText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  star: {
    fontSize: 16,
  },
  rating: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  profileContentGrid: {
    width: '100%',
  },
  profileContentGridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[500],
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    marginTop: spacing.xs / 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.gray[200],
  },
  section: {
    margin: spacing.lg,
    padding: spacing.lg,
  },
  infoSectionWide: {
    flex: 1.5,
    marginHorizontal: 0,
  },
  menuSectionWide: {
    flex: 1,
    marginHorizontal: 0,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    flexShrink: 0,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[900],
    flex: 1,
    textAlign: 'right',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuContent: {
    flex: 1,
    minWidth: 0,
  },
  menuTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[900],
  },
  menuSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },
  bottomPadding: {
    height: spacing.xl,
  },
});

export default DoctorProfileScreen;
