/**
 * Root Navigator
 * Main navigation structure for the app
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components/common';

import AuthNavigator from './AuthNavigator';
import PatientNavigator from './PatientNavigator';
import DoctorNavigator from './DoctorNavigator';
import { USER_ROLES } from '../data/constants';

const Stack = createStackNavigator();

const linking = {
  prefixes: ['http://localhost:8081', 'https://anamiva.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          Splash: 'splash',
          Login: 'login',
          OTPVerification: 'verify-otp',
          RoleSelection: 'select-role',
          PatientProfileSetup: 'patient/setup',
          DoctorProfileSetup: 'doctor/setup',
        },
      },
      Main: {
        screens: {
          Home: '',
          Appointments: 'appointments',
          Records: 'records',
          Medications: 'medications',
          Emergency: 'emergency',
          Analytics: 'analytics',
          Profile: 'profile',
        },
      },
    },
  },
};

const RootNavigator = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen text="Loading..." />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            // Auth Stack
            <Stack.Screen name="Auth" component={AuthNavigator} />
          ) : user?.role === USER_ROLES.PATIENT ? (
            // Patient App
            <Stack.Screen name="Main" component={PatientNavigator} />
          ) : (
            // Doctor App
            <Stack.Screen name="Main" component={DoctorNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

export default RootNavigator;
