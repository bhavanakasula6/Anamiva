/**
 * Patient Profile Screen
 * View and edit patient profile
 */

import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';

import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from '../../styles/theme';

import {
  Avatar,
  Button,
  Card,
  Header,
} from '../../components/common';

import Icon from '../../components/Icon';

const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;

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
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIcon}>
        <Icon
          name={icon}
          size={20}
          color={colors.primary[500]}
        />
      </View>

      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle && (
          <Text style={styles.menuSubtitle}>{subtitle}</Text>
        )}
      </View>

      {showArrow && (
        <Icon
          name="chevron-right"
          size={18}
          color={colors.gray[400]}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Profile"
        leftIcon="back"
        onLeftPress={navigation.goBack}
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

          <Text style={styles.userName}>
            {user?.fullName || user?.name}
          </Text>
          <Text style={styles.userEmail}>
            {user?.email || user?.phoneNumber || user?.phone}
          </Text>

          <Button
            variant="outline"
            size="sm"
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            Edit Profile
          </Button>
        </View>

        <View style={[styles.profileContentGrid, isTabletUp && styles.profileContentGridWide]}>
          {/* Personal Info */}
          <Card style={[styles.section, isTabletUp && styles.infoSectionWide]}>
            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Blood Group</Text>
            <Text style={styles.infoValue}>
              {user?.bloodGroup || 'Not set'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>
              {user?.gender || 'Not set'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>
              {user?.phoneNumber || user?.phone || 'Not set'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>
              {(typeof user?.address === 'object' ? user?.address?.city : null) || 'Not set'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>State</Text>
            <Text style={styles.infoValue}>
              {(typeof user?.address === 'object' ? user?.address?.state : null) || 'Not set'}
            </Text>
          </View>
          </Card>

          <View style={isTabletUp && styles.menuColumnWide}>
            {/* Main Menu */}
            <Card style={styles.section}>
              <MenuItem
                icon="calendar"
                title="Appointments"
                subtitle="View your appointments"
                onPress={() => navigation.navigate('Appointments')}
              />

          <MenuItem
            icon="file-text"
            title="Medical Records"
            subtitle="View your records"
            onPress={() => navigation.navigate('MedicalRecords')}
          />

          <MenuItem
            icon="pills"
            title="Medications"
            subtitle="View active medications"
            onPress={() => navigation.navigate('Medications')}
          />

          <MenuItem
            icon="heart-filled"
            title="Favorite Doctors"
            subtitle="View saved doctors"
            onPress={() => navigation.navigate('FavoriteDoctors')}
          />
            </Card>

            {/* Settings */}
            <Card style={styles.section}>
              <MenuItem
                icon="bell"
                title="Notifications"
                subtitle="Manage notifications"
                onPress={() => navigation.navigate('Notifications')}
              />

          <MenuItem
            icon="settings"
            title="Settings"
            subtitle="App preferences"
            onPress={() => navigation.navigate('Settings')}
          />

          <MenuItem
            icon="help-circle"
            title="Help & Support"
            subtitle="Get help"
            onPress={() => navigation.navigate('HelpSupport')}
          />
            </Card>
          </View>
        </View>

        {/* Logout */}
        <Button
          variant="outline"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Logout
        </Button>

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

  section: {
    margin: spacing.lg,
    padding: spacing.lg,
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
  infoSectionWide: {
    flex: 1.35,
    marginHorizontal: 0,
  },
  menuColumnWide: {
    flex: 1,
  },

  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
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

  logoutButton: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
  },

  bottomPadding: {
    height: spacing.xl,
  },
});

export default ProfileScreen;
