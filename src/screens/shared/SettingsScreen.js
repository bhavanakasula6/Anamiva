/**
 * Settings Screen
 * App settings and preferences
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme';
import { Card, Header, Button } from '../../components/common';
import Icon from '../../components/Icon';

const SettingsScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to logout?');
      if (confirmed) {
        await logout();
      }
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const SettingItem = ({ icon, title, subtitle, onPress }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.iconBox}>
        <Icon name={icon} size={18} color={colors.primary[500]} />
      </View>
      <View style={styles.textBox}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
        )}
      </View>
      <Icon name="chevron-right" size={18} color={colors.gray[400]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Settings"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.content, Platform.OS === 'web' && styles.webContent]}>

          {/* ACCOUNT */}
          <Section title="Account">
            <Card style={styles.card}>

              <SettingItem
                icon="bell"
                title="Notifications"
                subtitle="Manage notification preferences"
                onPress={() => navigation.navigate('Notifications')}
              />
              <Divider />

              <SettingItem
                icon="lock"
                title="Privacy & Security"
                subtitle="Manage privacy settings"
                onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon')}
              />
            </Card>
          </Section>

          {/* APP SETTINGS */}
          <Section title="App Settings">
            <Card style={styles.card}>
              <SettingItem
                icon="settings"
                title="Dark Mode"
                subtitle="Switch theme appearance"
                onPress={() => Alert.alert('Dark Mode', 'Dark mode coming soon')}
              />
              <Divider />
              <SettingItem
                icon="globe"
                title="Language"
                subtitle="English"
                onPress={() => Alert.alert('Language', 'Language settings coming soon')}
              />
            </Card>
          </Section>

          {/* SUPPORT */}
          <Section title="Support">
            <Card style={styles.card}>
              <SettingItem
                icon="help-circle"
                title="Help & Support"
                subtitle="FAQs and support"
                onPress={() => navigation.navigate('HelpSupport')}
              />
              <Divider />
              <SettingItem
                icon="file-text"
                title="Terms & Conditions"
                subtitle="Read our terms"
                onPress={() => Alert.alert('Terms', 'Terms & Conditions coming soon')}
              />
              <Divider />
              <SettingItem
                icon="shield"
                title="Privacy Policy"
                subtitle="Read our privacy policy"
                onPress={() => Alert.alert('Privacy', 'Privacy Policy coming soon')}
              />
            </Card>
          </Section>

          {/* ABOUT */}
          <Section title="About">
            <Card style={styles.card}>
              <SettingItem
                icon="info"
                title="About MedApp"
                subtitle="Version 1.0.0"
                onPress={() =>
                  Alert.alert('MedApp', 'Version 1.0.0\n\nYour healthcare companion')
                }
              />
            </Card>
          </Section>

          <Button
            variant="outline"
            fullWidth
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </Button>

          <View style={{ height: spacing.xl }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.gray[50] },
  content: { padding: spacing.lg },
  webContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[600],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  card: { padding: 0, ...shadows.sm },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  textBox: { flex: 1, minWidth: 0 },
  title: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[900],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    marginTop: spacing.xs / 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginLeft: spacing.lg + 40 + spacing.md,
  },
  logoutButton: { borderColor: colors.primary[500] },
});

export default SettingsScreen;
