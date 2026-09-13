/**
 * OTP Verification Screen
 * Enter and verify OTP code
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
  Alert,
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

const OTPVerificationScreen = ({ navigation, route }) => {
  const { email = '' } = route.params || {};
  const { verifyOTP, sendOTP } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = width >= 900;
  const isTabletUp = width >= 768;
  const isSmall = width < 420;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  /* ---------- RESEND TIMER ---------- */
  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(v => v - 1), 1000);
      return () => clearTimeout(t);
    }
    setCanResend(true);
  }, [resendTimer]);

  /* ---------- OTP INPUT ---------- */
  const handleOtpChange = (index, value) => {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 6 - index);
    if (value && !digits) return;

    const newOtp = [...otp];
    if (digits.length > 1) {
      digits.split('').forEach((digit, offset) => {
        newOtp[index + offset] = digit;
      });
    } else {
      newOtp[index] = digits;
    }
    setOtp(newOtp);

    if (digits && index < 5) {
      inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  /* ---------- VERIFY ---------- */
  const handleVerifyOTP = async () => {
    const code = otp.join('');

    if (code.length !== 6) {
      Alert.alert('Error', 'Enter the complete OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOTP(email, code);

      if (res?.success) {
        if (res.isNewUser) {
          navigation.replace('RoleSelection', { email });
        }
        // For existing users: AuthContext.login() sets isAuthenticated=true,
        // RootNavigator auto-switches to Main. No manual navigation needed.
      } else {
        throw new Error(res?.message || 'Invalid OTP');
      }
    } catch (e) {
      Alert.alert('Error', e.message);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  /* ---------- RESEND ---------- */
  const handleResendOTP = async () => {
    if (!canResend) return;

    try {
      const res = await sendOTP(email);
      if (res?.success) {
        setOtp(['', '', '', '', '', '']);
        setResendTimer(30);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        throw new Error(res?.message);
      }
    } catch {
      Alert.alert('Error', 'Failed to resend OTP');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ScrollView
          style={isWeb && styles.webScroll}
          contentContainerStyle={[
            styles.scrollContent,
            isWeb && styles.webScrollContent,
            isWeb && !isTabletUp && styles.mobileScrollContent,
            isDesktop && styles.desktopScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={[
          styles.content,
          isWeb && styles.webContent,
          isWeb && !isTabletUp && styles.mobileWebContent,
          isDesktop && styles.desktopContent,
        ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[
              styles.iconCircle,
              isSmall && styles.iconCircleSmall,
              isDesktop && styles.iconCircleDesktop,
            ]}>
              <Text style={[styles.iconText, isSmall && styles.iconTextSmall]}>OTP</Text>
            </View>

            <Text style={[styles.title, isSmall && styles.titleSmall]}>Verify your email</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to
            </Text>
            <Text style={styles.phone}>{email}</Text>
          </View>

          {/* OTP INPUT */}
          <View style={[styles.otpRow, isSmall && styles.otpRowSmall]}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => (inputRefs.current[index] = ref)}
                value={digit}
                onChangeText={v => handleOtpChange(index, v)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(index, nativeEvent.key)
                }
                style={[
                  styles.otpInput,
                  isSmall && styles.otpInputSmall,
                  digit && styles.otpFilled,
                ]}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            ))}
          </View>

          {/* VERIFY BUTTON */}
          <Button
            fullWidth
            size="md"
            loading={loading}
            disabled={otp.join('').length !== 6}
            onPress={handleVerifyOTP}
            style={styles.verifyButton}
          >
            Verify OTP
          </Button>

          {/* RESEND */}
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>
              {"Didn't receive the code?"}
            </Text>

            <TouchableOpacity
              disabled={!canResend}
              onPress={handleResendOTP}
            >
              <Text
                style={[
                  styles.resendLink,
                  !canResend && styles.resendDisabled,
                ]}
              >
                {canResend ? 'Resend OTP' : `Resend in ${resendTimer}s`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* CHANGE NUMBER */}
          <TouchableOpacity
            style={styles.changeButton}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.changeText}>
              Change email address
            </Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
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
  },
  webScroll: {
    flex: 1,
    height: '100vh',
    maxHeight: '100vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    backgroundColor: '#F1FBF8',
  },
  scrollContent: {
    flexGrow: 1,
  },
  webScrollContent: {
    minHeight: '100vh',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingBottom: spacing['3xl'],
    paddingHorizontal: spacing.xl,
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

  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
  },
  webContent: {
    flexGrow: 0,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  mobileWebContent: {
    flexGrow: 0,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    boxSizing: 'border-box',
  },
  desktopContent: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.lg,
    padding: spacing['2xl'],
    ...shadows.md,
  },

  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },

  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconCircleSmall: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  iconCircleDesktop: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },

  iconText: {
    fontSize: 20,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[500],
    letterSpacing: 1,
  },
  iconTextSmall: {
    fontSize: typography.fontSize.base,
  },

  title: {
    fontSize: typography.fontSize['3xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  titleSmall: {
    fontSize: typography.fontSize['2xl'],
  },

  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
  },

  phone: {
    marginTop: spacing.xs,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[500],
  },

  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  otpRowSmall: {
    gap: spacing.xs,
  },

  otpInput: {
    width: 48,
    height: 58,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.gray[300],
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
    color: colors.gray[900],
    backgroundColor: colors.white,
    outlineStyle: 'none',
    outlineWidth: 0,
    boxShadow: 'none',
  },
  otpInputSmall: {
    width: 36,
    height: 48,
    fontSize: typography.fontSize.lg,
  },

  otpFilled: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },

  helper: {
    textAlign: 'center',
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.xl,
  },

  helperBold: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[500],
  },

  verifyButton: {
    marginBottom: spacing.lg,
  },

  resendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },

  resendText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    textAlign: 'center',
  },

  resendLink: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[500],
  },

  resendDisabled: {
    color: colors.gray[400],
  },

  changeButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },

  changeText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },
});

export default OTPVerificationScreen;
