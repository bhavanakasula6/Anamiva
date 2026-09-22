/**
 * Authentication Context
 * Manages user authentication state and operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useState, useContext, useEffect } from 'react';
import api, { authAPI } from '../services/api';
import storage from '../services/storage';
import { USER_ROLES } from '../data/constants';

const AuthContext = createContext(null);
const OTP_COOLDOWN_MS = 30000;
const lastOtpSentAtByEmail = {};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      setLoading(true);
      try {
        const oldRawToken = await AsyncStorage.getItem('auth_token');
        const newToken = await storage.getToken(); // reads 'medapp_token'
        if (oldRawToken && !newToken) {
          await storage.saveToken(oldRawToken); // writes JSON-wrapped to 'medapp_token'
          await AsyncStorage.removeItem('auth_token'); // clean up old key
        }
      } catch (migrationError) {
        console.warn('[Auth] Token migration failed (non-fatal):', migrationError);
      }
      const storedUser = await storage.getUser();
      const storedToken = await storage.getToken();

      if (storedUser && storedToken) {
        setUser(storedUser);
        api.setCurrentUser(storedUser);
        setToken(storedToken);
        setIsAuthenticated(true);

        const response = await authAPI.getCurrentUser();
        const shouldClearSession =
          (!response.success && !response.isNetworkError && [401, 403].includes(response.status)) ||
          (response.success && !response.user?.isProfileCompleted);

        if (shouldClearSession) {
          await storage.logout();
          await AsyncStorage.removeItem('auth_token');
          setUser(null);
          api.setCurrentUser(null);
          setToken(null);
          setIsAuthenticated(false);
          return;
        }

        if (response.success && response.user) {
          setUser(response.user);
          api.setCurrentUser(response.user);
          await storage.saveUser(response.user);
        }
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send OTP
  const sendOTP = async (email) => {
    try {
      const now = Date.now();
      const lastSentAt = lastOtpSentAtByEmail[email] || 0;

      if (now - lastSentAt < OTP_COOLDOWN_MS) {
        return {
          success: true,
          throttled: true,
          message: 'OTP was already sent recently',
        };
      }

      const response = await authAPI.sendOTP(email);
      if (response?.success) {
        lastOtpSentAtByEmail[email] = now;
      }
      return response;
    } catch (error) {
      console.error('Error sending OTP:', error);
      return { success: false, message: error.message || 'Failed to send OTP' };
    }
  };

  // Verify OTP
  const verifyOTP = async (email, otp) => {
    try {
      const response = await authAPI.verifyOTP(email, otp);

      if (response.success && !response.isNewUser) {
        // Existing user - log them in
        await login(response.user, response.token);
      }

      // if (response.success && response.isNewUser) {
      //   await storage.saveData('medapp_temp_token', response.tempToken);
      // }

      return response;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return { success: false, message: 'Failed to verify OTP' };
    }
  };

  // Select role (for new users)
  const selectRole = async (email, role) => {
    try {
      const response = await authAPI.selectRole(email, role);
      return response;
    } catch (error) {
      console.error('Error selecting role:', error);
      return { success: false, message: 'Failed to select role' };
    }
  };

  // Complete profile (for new users)
  const completeProfile = async (profileData) => {
    try {
      const response = await authAPI.completeProfile(profileData);

      if (response.success) {
        await login(response.user, response.token);
      }

      return response;
    } catch (error) {
      console.error('Error completing profile:', error);
      return { success: false, message: 'Failed to complete profile' };
    }
  };

  // Login
  const login = async (userData, authToken) => {
    try {
      setUser(userData);
      api.setCurrentUser(userData);
      setToken(authToken);
      setIsAuthenticated(true);

      // Save to storage
      await storage.saveUser(userData);
      await storage.saveToken(authToken);
      await storage.saveRole(userData.role);

      return { success: true };
    } catch (error) {
      console.error('Error logging in:', error);
      return { success: false, message: 'Failed to login' };
    }
  };

  // Logout
  const logoutUser = async () => {
    try {
      // Clear state
      setUser(null);
      api.setCurrentUser(null);
      setToken(null);
      setIsAuthenticated(false);

      // Clear storage
      await storage.logout();

      return { success: true };
    } catch (error) {
      console.error('Error logging out:', error);
      return { success: false, message: 'Failed to logout' };
    }
  };

  const deleteAccount = async () => {
    try {
      const response = await authAPI.deleteAccount();
      if (response.success) {
        setUser(null);
        api.setCurrentUser(null);
        setToken(null);
        setIsAuthenticated(false);
        await storage.logout();
      }
      return response;
    } catch (error) {
      console.error('Error deleting account:', error);
      return { success: false, message: 'Failed to delete account' };
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    try {
      const response = await authAPI.updateProfile(updates);

      if (response.success) {
        setUser(response.user);
        api.setCurrentUser(response.user);
        await storage.saveUser(response.user);
      }

      return response;
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, message: 'Failed to update profile' };
    }
  };

  // Refresh user from server (e.g. after avatar upload)
  const refreshUser = async () => {
    try {
      const response = await authAPI.getCurrentUser();
      if (response.success && response.user) {
        setUser(response.user);
        api.setCurrentUser(response.user);
        await storage.saveUser(response.user);
      }
      return response;
    } catch (error) {
      console.error('Error refreshing user:', error);
      return { success: false, message: 'Failed to refresh user' };
    }
  };

  // Check if user is patient
  const isPatient = () => {
    return user?.role === USER_ROLES.PATIENT;
  };

  // Check if user is doctor
  const isDoctor = () => {
    return user?.role === USER_ROLES.DOCTOR;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    isPatient,
    isDoctor,
    sendOTP,
    verifyOTP,
    selectRole,
    completeProfile,
    login,
    logout: logoutUser,
    deleteAccount,
    updateProfile,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
