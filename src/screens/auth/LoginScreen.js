/**
 * Login Screen
 * Email entry for authentication
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme';
import { Button, Input } from '../../components/common';
import { validateEmail } from '../../utils/validation';

const LoginScreen = ({ navigation }) => {
  const { sendOTP } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const showDesktopInfo = width >= 1180;
  const isDesktop = width >= 900;
  const isTabletUp = width >= 768;
  const isSmall = width < 420;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(cooldownRef.current);
  }, [cooldown]);

  const handleSendOTP = async () => {
    if (loading || requestInFlightRef.current) return; // Prevent duplicate sends

    const normalizedEmail = email.trim().toLowerCase();
    setEmail(normalizedEmail);

    const emailError = validateEmail(normalizedEmail);
    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setErrors({});
    requestInFlightRef.current = true;
    setLoading(true);

    try {
      const response = await sendOTP(normalizedEmail);

      if (response?.success) {
        setCooldown(30);
        navigation.replace('OTPVerification', { email: normalizedEmail });
      } else {
        Alert.alert('Error', response?.message || 'Failed to send OTP');
      }
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      requestInFlightRef.current = false;
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={isWeb && styles.webScroll}
          contentContainerStyle={[
            styles.scroll,
            isWeb && styles.webScrollContent,
            isWeb && !isTabletUp && styles.mobileScrollContent,
            isDesktop && styles.desktopScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* CONTENT */}
          <View style={[styles.desktopShell, showDesktopInfo && styles.desktopShellActive]}>
            {showDesktopInfo && (
              <View style={styles.infoPanel}>
                <Text style={styles.infoEyebrow}>Anamiva Care</Text>
                <Text style={styles.infoTitle}>One place for appointments, records, and urgent care.</Text>
                <Text style={styles.infoText}>
                  Sign in once to continue as a patient or doctor and manage your healthcare workflow securely.
                </Text>

                <View style={styles.infoList}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemTitle}>Fast access</Text>
                    <Text style={styles.infoItemText}>OTP login keeps sign-in quick without passwords.</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemTitle}>Care continuity</Text>
                    <Text style={styles.infoItemText}>Appointments, records, and emergency flows stay connected.</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={[
              styles.content,
              isWeb && !isTabletUp && styles.mobileWebContent,
              isWeb && isTabletUp && styles.responsiveCard,
              showDesktopInfo && styles.desktopContent,
            ]}>
            {/* Logo */}
            <View style={styles.logoWrapper}>
              <View style={[
                styles.logoCircle,
                isSmall && styles.logoCircleSmall,
                isDesktop && styles.logoCircleDesktop,
              ]}>
                <Text style={[
                  styles.logoText,
                  isSmall && styles.logoTextSmall,
                  isDesktop && styles.logoTextDesktop,
                ]}>A</Text>
                {/* <Image
                  source={require('../../assets/logo.png')}
                  style={{ width: 56, height: 56, resizeMode: 'contain' }}
                /> */}

              </View>
            </View>

            {/* Title */}
            <Text style={[
              styles.title,
              isSmall && styles.titleSmall,
              isDesktop && styles.titleDesktop,
            ]}>Welcome to Anamiva</Text>
            <Text style={styles.subtitle}>
              Sign in securely with your email address
            </Text>

            {/* Form */}
            <View style={[styles.form, isWeb && styles.webForm]}>
              <Text style={styles.label}>Email Address</Text>

              <View style={styles.phoneRow}>
                <View style={styles.phoneInputContainer}>
                  <Input
                    value={email}
                    onChangeText={text => {
                      setEmail(text.toLowerCase());
                      setErrors({});
                    }}
                    placeholder="you@example.com"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    autoCapitalize="none"
                    maxLength={120}
                    error={errors.email}
                    style={styles.phoneInput}
                  />
                </View>
              </View>

              <Button
                fullWidth
                size="md"
                loading={loading}
                disabled={Boolean(validateEmail(email.trim())) || cooldown > 0 || loading}
                onPress={handleSendOTP}
                style={styles.button}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send OTP'}
              </Button>

              <Text style={styles.helperText}>
                We will send a one-time password for verification
              </Text>
              <View style={styles.securityNote}>
                <Text style={styles.securityTitle}>Secure OTP login</Text>
                <Text style={styles.securityText}>
                  No password needed. Your care workspace opens after email verification.
                </Text>
              </View>
            </View>
            </View>

            {showDesktopInfo && (
              <View style={styles.sidePanel}>
                <Text style={styles.sideTitle}>After verification</Text>
                <View style={styles.sideStep}>
                  <Text style={styles.sideStepNumber}>1</Text>
                  <View style={styles.sideStepTextWrap}>
                    <Text style={styles.sideStepTitle}>Choose your role</Text>
                    <Text style={styles.sideStepText}>Continue as patient or doctor.</Text>
                  </View>
                </View>
                <View style={styles.sideStep}>
                  <Text style={styles.sideStepNumber}>2</Text>
                  <View style={styles.sideStepTextWrap}>
                    <Text style={styles.sideStepTitle}>Complete profile</Text>
                    <Text style={styles.sideStepText}>Add only the details needed for care.</Text>
                  </View>
                </View>
                <View style={styles.sideStep}>
                  <Text style={styles.sideStepNumber}>3</Text>
                  <View style={styles.sideStepTextWrap}>
                    <Text style={styles.sideStepTitle}>Open dashboard</Text>
                    <Text style={styles.sideStepText}>Book, review, respond, or manage records.</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* FOOTER */}
          <View style={[styles.footer, isWeb && styles.webFooter]}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms & Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  webScroll: {
    flex: 1,
    height: '100vh',
    maxHeight: '100vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    backgroundColor: '#F1FBF8',
  },
  webScrollContent: {
    minHeight: '100vh',
    paddingVertical: spacing.xl,
    paddingBottom: spacing['3xl'],
    justifyContent: 'center',
    backgroundColor: '#F1FBF8',
  },
  mobileScrollContent: {
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  desktopScrollContent: {
    paddingHorizontal: spacing.xl,
  },
  desktopShell: {
    width: '100%',
  },
  desktopShellActive: {
    maxWidth: 1180,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  infoPanel: {
    width: 360,
    flexShrink: 1,
    padding: spacing.xl,
  },
  infoEyebrow: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[700],
    marginBottom: spacing.md,
  },
  infoTitle: {
    fontSize: typography.fontSize['3xl'],
    lineHeight: 38,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoText: {
    fontSize: typography.fontSize.base,
    lineHeight: 26,
    color: colors.text.secondary,
  },
  infoList: {
    marginTop: spacing['2xl'],
    gap: spacing.md,
  },
  infoItem: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  infoItemTitle: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  infoItemText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: colors.text.secondary,
  },

  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
  },
  mobileWebContent: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.sm,
    boxSizing: 'border-box',
  },
  webContent: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  responsiveCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    ...shadows.sm,
  },
  desktopContent: {
    width: 440,
    minWidth: 440,
    flexShrink: 0,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    padding: spacing['2xl'],
    ...shadows.md,
  },
  sidePanel: {
    width: 360,
    flexShrink: 1,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  sideTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[900],
    marginBottom: spacing.lg,
  },
  sideStep: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sideStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
    backgroundColor: colors.primary[500],
  },
  sideStepTextWrap: {
    flex: 1,
  },
  sideStepTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[900],
    marginBottom: 2,
  },
  sideStepText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: colors.gray[700],
  },

  logoWrapper: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircleSmall: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  logoCircleDesktop: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },

  logoText: {
    fontSize: 42,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[500],
  },
  logoTextSmall: {
    fontSize: 32,
  },
  logoTextDesktop: {
    fontSize: 38,
  },

  title: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleSmall: {
    fontSize: typography.fontSize['2xl'],
  },
  titleDesktop: {
    fontSize: typography.fontSize['3xl'],
  },

  subtitle: {
    fontSize: typography.fontSize.base,
    lineHeight: 24,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  form: {
    marginTop: spacing.xl,
  },
  webForm: {
    width: '100%',
  },

  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },

  phoneRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  countryCodeBox: {
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
    justifyContent: 'center',
  },
  countryCode: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
  },
  phoneInputContainer: {
    flex: 1,
    minWidth: 0,
  },
  phoneInput: {
    marginBottom: 0,
    minWidth: 0,
  },
  button: {
    marginTop: spacing.xl,
  },
  helperText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
  securityNote: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  securityTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[800],
    marginBottom: spacing.xs,
  },
  securityText: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    color: colors.gray[700],
  },
  footer: {
    paddingHorizontal: spacing.xl,
    padding: spacing.xl,
  },
  webFooter: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  footerText: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    textAlign: 'center',
  },
});

export default LoginScreen;
