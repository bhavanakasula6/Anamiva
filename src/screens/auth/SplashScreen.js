/**
 * Splash Screen
 * Initial loading screen
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { useAuth } from '../../contexts/AuthContext';
import theme from '../../styles/theme';
import Loading from '../../components/common/Loading';

const MIN_SPLASH_TIME = 1500; // 1.5 seconds (tune to 1000 or 2000)

const SplashScreen = ({ navigation }) => {
  const { loading, isAuthenticated } = useAuth();

  const hasNavigated = useRef(false);
  const startTime = useRef(Date.now());
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const { width } = useWindowDimensions();
  const isSmall = width < 420;

  // Timer for minimum splash duration
  useEffect(() => {
    const elapsed = Date.now() - startTime.current;
    const remaining = Math.max(MIN_SPLASH_TIME - elapsed, 0);

    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, remaining);

    return () => clearTimeout(timer);
  }, []);

  // Navigate only when BOTH are ready
  useEffect(() => {
    if (loading) return;
    if (!minTimeElapsed) return;
    if (hasNavigated.current) return;

    hasNavigated.current = true;

    navigation.replace(
      isAuthenticated ? 'Main' : 'Login'
    );
  }, [loading, minTimeElapsed, isAuthenticated, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <View style={styles.logoWrapper}>
          <View style={[styles.logo, isSmall && styles.logoSmall]}>
            <Text style={[styles.logoText, isSmall && styles.logoTextSmall]}>A</Text>
            {/* <Image
              source={require('../../assets/logo.png')}
              style={{ width: 72, height: 72, resizeMode: 'contain' }}
            /> */}
          </View>
        </View>

        <Text style={styles.title} allowFontScaling={false}>
          Anamiva
        </Text>

        <Text style={styles.subtitle} allowFontScaling={false}>
          Your health, organized with care
        </Text>

        <View style={styles.loader}>
          <Loading size="small" color={theme.colors.white} />
        </View>
      </View>

      <Text style={styles.footer} allowFontScaling={false}>
        Version 1.0.0
      </Text>
    </View>
  );
};

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#123F39',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing['2xl'],
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoWrapper: {
    marginBottom: theme.spacing.xl,
  },

  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.lg,
  },
  logoSmall: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },

  logoText: {
    fontSize: 48,
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.primary[500],
  },
  logoTextSmall: {
    fontSize: 40,
  },

  title: {
    fontSize: theme.typography.fontSizes['4xl'],
    fontFamily: theme.typography.fontFamily.bold,
    color: theme.colors.white,
    marginBottom: theme.spacing.sm,
  },

  subtitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.white,
    opacity: 0.9,
  },

  loader: {
    marginTop: theme.spacing['2xl'],
  },

  footer: {
    textAlign: 'center',
    fontSize: theme.typography.fontSizes.sm,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.white,
    opacity: 0.7,
  },
});

export default SplashScreen;
