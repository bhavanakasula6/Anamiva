/**
 * Role Selection Screen
 * Choose between Patient and Doctor roles
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../../styles/theme';
import { Button } from '../../components/common';
import { USER_ROLES } from '../../data/constants';
import Icon from '../../components/Icon';

const RoleSelectionScreen = ({ navigation, route }) => {
  const { email = '' } = route.params || {};
  const { selectRole } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = width >= 900;
  const isTabletUp = width >= 700;

  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: USER_ROLES.PATIENT,
      title: 'Patient',
      subtitle: 'Access healthcare services',
      description:
        'Book appointments, manage your medical records, request emergency care, and track medications.',
      features: [
        'Find and book doctors',
        'Emergency care requests',
        'Medical records management',
        'Medication tracking',
      ],
    },
    {
      id: USER_ROLES.DOCTOR,
      title: 'Doctor',
      subtitle: 'Provide medical care',
      description:
        'Manage appointments, respond to emergencies, view patient records, and prescribe treatments.',
      features: [
        'Manage appointments',
        'Respond to emergencies',
        'Access patient records',
        'Prescribe medications',
      ],
    },
  ];

  const handleContinue = async () => {
    if (!selectedRole) return;

    setLoading(true);
    try {
      await selectRole(email, selectedRole);

      if (selectedRole === USER_ROLES.PATIENT) {
        navigation.replace('PatientProfileSetup', {
          email,
          role: selectedRole,
        });
      } else {
        navigation.replace('DoctorProfileSetup', {
          email,
          role: selectedRole,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={[styles.container, isWeb && styles.webContainer]}>
        <ScrollView
          style={isWeb && styles.webScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            isWeb && styles.webScrollContent,
            isDesktop && styles.desktopScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={[styles.header, isWeb && styles.webHeader]}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>ROLE</Text>
            </View>

            <Text style={[styles.title, isWeb && styles.webTitle]}>Choose how you will use Anamiva</Text>
            <Text style={styles.subtitle}>
              Select the role that best describes you
            </Text>
          </View>

          {/* Role Cards */}
          <View style={[styles.cards, isTabletUp && styles.cardsTablet]}>
            {roles.map(role => {
              const selected = selectedRole === role.id;

              return (
                <TouchableOpacity
                  key={role.id}
                  activeOpacity={0.85}
                  onPress={() => setSelectedRole(role.id)}
                  style={[
                    styles.card,
                    isTabletUp && styles.cardTablet,
                    selected && styles.cardSelected,
                  ]}
                >
                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <View>
                      <Icon
                        name={role.id === USER_ROLES.PATIENT ? 'patient' : 'doctor'}
                        size={36}
                        color={selected ? colors.primary[500] : colors.gray[600]}
                        style={{ marginBottom: spacing.md }}
                      />

                      <Text style={styles.cardTitle}>
                        {role.title}
                      </Text>
                      <Text style={styles.cardSubtitle}>
                        {role.subtitle}
                      </Text>
                    </View>

                    {selected && (
                      <View style={styles.checkCircle}>
                        <Icon
                          name="checkCircleFilled"
                          size={18}
                          color={colors.white}
                        />
                      </View>
                    )}

                  </View>

                  {/* Description */}
                  <Text style={styles.description}>
                    {role.description}
                  </Text>

                  {/* Features */}
                  <View style={styles.features}>
                    {role.features.map((f, i) => (
                      <View key={i} style={styles.featureRow}>
                        <View style={styles.dot} />
                        <Text style={styles.featureText}>
                          {f}
                        </Text>
                      </View>
                    ))}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.footer, isWeb && styles.webFooter]}>
          <View style={isWeb && styles.footerInner}>
            <Button
              fullWidth
              size="md"
              loading={loading}
              disabled={!selectedRole}
              onPress={handleContinue}
            >
              Continue
            </Button>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },

  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  webContainer: {
    backgroundColor: '#F1FBF8',
    height: '100vh',
    maxHeight: '100vh',
    overflow: 'hidden',
  },
  webScroll: {
    flex: 1,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  webScrollContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingBottom: spacing['3xl'],
  },
  desktopScrollContent: {
    paddingTop: spacing.xl,
  },

  header: {
    marginBottom: spacing['2xl'],
  },
  webHeader: {
    alignItems: 'center',
  },

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.md,
  },

  badgeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[500],
    letterSpacing: 1,
  },

  title: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  webTitle: {
    textAlign: 'center',
  },

  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },

  cards: {
    gap: spacing.lg,
  },
  cardsTablet: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  card: {
    borderWidth: 2,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  cardTablet: {
    flex: 1,
  },

  cardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
    ...shadows.md,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },

  cardTitle: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
  },

  cardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.xs / 2,
  },

  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkText: {
    color: colors.white,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
  },

  description: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    marginBottom: spacing.md,
  },

  features: {
    marginTop: spacing.sm,
  },

  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[500],
    marginRight: spacing.sm,
  },

  featureText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    backgroundColor: colors.white,
  },
  webFooter: {
    backgroundColor: '#F1FBF8',
  },
  footerInner: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
});

export default RoleSelectionScreen;
