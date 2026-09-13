/**
 * Doctor Navigator
 * Bottom tab navigation for doctor app
 */

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Screens
import {
  AnalyticsScreen,
  DoctorAppointmentsScreen,
  DoctorHomeScreen,
  DoctorPatientsScreen,
  DoctorProfileScreen,
  DoctorRecordVerificationScreen,
  EmergencyListScreen,
  PatientRecordsScreen,
  PrescriptionFormScreen,
  DoctorEditProfileScreen,
} from '../screens/doctor';


import {
  AppointmentDetailsScreen,
  HelpSupportScreen,
  NotificationsScreen,
  RecordDetailsScreen,
  SettingsScreen,
} from '../screens/shared';
import VideoCallScreen from '../screens/shared/VideoCallScreen';

import Icon from '../components/Icon';
import { useDoctor } from '../contexts/DoctorContext';
import { colors } from '../styles/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/* ---------- Stacks ---------- */

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DoctorHomeMain" component={DoctorHomeScreen} />
    <Stack.Screen name="DoctorAppointmentsList" component={DoctorAppointmentsScreen} />
    <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
    <Stack.Screen name="PrescriptionForm" component={PrescriptionFormScreen} />
    <Stack.Screen name="EmergencyList" component={EmergencyListScreen} />
    <Stack.Screen name="AnalyticsMain" component={AnalyticsScreen} />
    <Stack.Screen name="AllPatientRecords" component={DoctorPatientsScreen} />
    <Stack.Screen name="PatientRecords" component={PatientRecordsScreen} />
    <Stack.Screen name="DoctorRecordVerification" component={DoctorRecordVerificationScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="DoctorEditProfile" component={DoctorEditProfileScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="RecordDetails" component={RecordDetailsScreen} />
    <Stack.Screen name="VideoCall" component={VideoCallScreen} />
  </Stack.Navigator>
);

const AppointmentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DoctorAppointmentsList" component={DoctorAppointmentsScreen} />
    <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
    <Stack.Screen name="PatientRecords" component={PatientRecordsScreen} />
    <Stack.Screen name="RecordDetails" component={RecordDetailsScreen} />
    <Stack.Screen name="PrescriptionForm" component={PrescriptionFormScreen} />
    <Stack.Screen name="VideoCall" component={VideoCallScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="DoctorEditProfile" component={DoctorEditProfileScreen} />
  </Stack.Navigator>
);

const EmergencyStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="EmergencyList" component={EmergencyListScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

const AnalyticsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AnalyticsMain" component={AnalyticsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="DoctorEditProfile" component={DoctorEditProfileScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="DoctorProfileMain" component={DoctorProfileScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="DoctorEditProfile" component={DoctorEditProfileScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
  </Stack.Navigator>
);

/* ---------- Navigator ---------- */

const DoctorNavigator = () => {
  const insets = useSafeAreaInsets();
  const { emergencyRequests } = useDoctor();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.gray[400],
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.gray[200],
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 6,
          height: 60 + Math.max(insets.bottom, 5),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="home" size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Appointments"
        component={AppointmentsStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="calendar" size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Emergency"
        component={EmergencyStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="warning" size={22} color={color} />
          ),
          tabBarBadge: emergencyRequests?.length > 0 ? emergencyRequests.length.toString() : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.danger[500],
            color: colors.white,
          },
        }}
      />

      <Tab.Screen
        name="Analytics"
        component={AnalyticsStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="file" size={22} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="doctor" size={22} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default DoctorNavigator;
