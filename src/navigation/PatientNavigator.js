/**
 * Patient Navigator
 * Bottom tab navigation for patient app
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Patient screens
import {
  HomeScreen,
  DoctorSearchScreen,
  DoctorDetailsScreen,
  BookAppointmentScreen,
  AppointmentsScreen,
  EmergencyRequestScreen,
  MedicalRecordsScreen,
  UploadRecordScreen,
  MedicationsScreen,
  ProfileScreen,
  EditProfileScreen,
  FavoriteDoctorsScreen,
} from '../screens/patient';

// Shared screens
import {
  NotificationsScreen,
  SettingsScreen,
  HelpSupportScreen,
  RecordDetailsScreen,
  AppointmentDetailsScreen,
} from '../screens/shared';
import VideoCallScreen from '../screens/shared/VideoCallScreen';

import Icon from '../components/Icon';
import { colors } from '../styles/theme';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

/* ---------- Stacks ---------- */

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeMain" component={HomeScreen} />
    <Stack.Screen name="DoctorSearch" component={DoctorSearchScreen} />
    <Stack.Screen name="DoctorDetails" component={DoctorDetailsScreen} />
    <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} />
    <Stack.Screen name="UploadRecord" component={UploadRecordScreen} />
    <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
    <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
    <Stack.Screen name="VideoCall" component={VideoCallScreen} />
    <Stack.Screen name="EmergencyRequest" component={EmergencyRequestScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="FavoriteDoctors" component={FavoriteDoctorsScreen} />
    <Stack.Screen name="RecordDetails" component={RecordDetailsScreen} />
  </Stack.Navigator>
);

const AppointmentsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AppointmentsList" component={AppointmentsScreen} />
    <Stack.Screen name="DoctorSearch" component={DoctorSearchScreen} />
    <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
    <Stack.Screen name="AppointmentDetails" component={AppointmentDetailsScreen} />
    <Stack.Screen name="RecordDetails" component={RecordDetailsScreen} />
    <Stack.Screen name="VideoCall" component={VideoCallScreen} />
  </Stack.Navigator>
);

const RecordsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} />
    <Stack.Screen name="UploadRecord" component={UploadRecordScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="RecordDetails" component={RecordDetailsScreen} />
  </Stack.Navigator>
);

const MedicationsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MedicationsList" component={MedicationsScreen} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ProfileMain" component={ProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="FavoriteDoctors" component={FavoriteDoctorsScreen} />
    <Stack.Screen name="MedicalRecords" component={MedicalRecordsScreen} />
    <Stack.Screen name="UploadRecord" component={UploadRecordScreen} />
    <Stack.Screen name="Notifications" component={NotificationsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
    <Stack.Screen name="DoctorDetails" component={DoctorDetailsScreen} />
    <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} />
  </Stack.Navigator>
);

/* ---------- Navigator ---------- */

const PatientNavigator = () => {
  const insets = useSafeAreaInsets();

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
        name="Records"
        component={RecordsStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="file" size={22} color={color} />
          ),
          tabBarLabel: 'Records',
        }}
      />

      <Tab.Screen
        name="Medications"
        component={MedicationsStack}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="pills" size={22} color={color} />
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

export default PatientNavigator;
