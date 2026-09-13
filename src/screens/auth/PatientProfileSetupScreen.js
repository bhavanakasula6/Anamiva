/**
 * Patient Profile Setup Screen
 * Complete patient profile information
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme';
import { Button, Input, DropdownPicker } from '../../components/common';
import { validateEmail, validateRequired } from '../../utils/validation';
import { USER_ROLES, BLOOD_GROUPS, GENDERS, INDIAN_STATES, CITIES_BY_STATE } from '../../data/constants';
import Icon from '../../components/Icon';

// Coordinates for major cities (used for geocoding during profile setup)
const CITY_COORDINATES = {
  'Chennai': { latitude: 13.0827, longitude: 80.2707 },
  'Coimbatore': { latitude: 11.0168, longitude: 76.9558 },
  'Madurai': { latitude: 9.9252, longitude: 78.1198 },
  'Trichy': { latitude: 10.7905, longitude: 78.7047 },
  'Salem': { latitude: 11.6643, longitude: 78.1460 },
  'Erode': { latitude: 11.3410, longitude: 77.7172 },
  'Tirunelveli': { latitude: 8.7139, longitude: 77.7567 },
  'Vellore': { latitude: 12.9165, longitude: 79.1325 },
  'Bangalore': { latitude: 12.9716, longitude: 77.5946 },
  'Mysore': { latitude: 12.2958, longitude: 76.6394 },
  'Mangalore': { latitude: 12.9141, longitude: 74.8560 },
  'Kochi': { latitude: 9.9312, longitude: 76.2673 },
  'Thiruvananthapuram': { latitude: 8.5241, longitude: 76.9366 },
  'Hyderabad': { latitude: 17.3850, longitude: 78.4867 },
  'Visakhapatnam': { latitude: 17.6868, longitude: 83.2185 },
  'Mumbai': { latitude: 19.0760, longitude: 72.8777 },
  'Pune': { latitude: 18.5204, longitude: 73.8567 },
  'New Delhi': { latitude: 28.7041, longitude: 77.1025 },
  'Ahmedabad': { latitude: 23.0225, longitude: 72.5714 },
  'Jaipur': { latitude: 26.9124, longitude: 75.7873 },
  'Lucknow': { latitude: 26.8467, longitude: 80.9462 },
  'Kolkata': { latitude: 22.5726, longitude: 88.3639 },
  'Bhopal': { latitude: 23.2599, longitude: 77.4126 },
  'Patna': { latitude: 25.6093, longitude: 85.1376 },
  'Chandigarh': { latitude: 30.7333, longitude: 76.7794 },
  'Gurugram': { latitude: 28.4595, longitude: 77.0266 },
  'Noida': { latitude: 28.5355, longitude: 77.3910 },
  'Indore': { latitude: 22.7196, longitude: 75.8577 },
  'Nagpur': { latitude: 21.1458, longitude: 79.0882 },
  'Guwahati': { latitude: 26.1445, longitude: 91.7362 },
  'Panaji': { latitude: 15.4909, longitude: 73.8278 },
  'Ranchi': { latitude: 23.3441, longitude: 85.3096 },
  'Bhubaneswar': { latitude: 20.2961, longitude: 85.8245 },
  'Raipur': { latitude: 21.2514, longitude: 81.6296 },
  'Dindigul': { latitude: 10.3673, longitude: 77.9803 },
  'Thanjavur': { latitude: 10.7870, longitude: 79.1378 },
  'Tiruppur': { latitude: 11.1085, longitude: 77.3411 },
  'Nagercoil': { latitude: 8.1833, longitude: 77.4119 },
  'Thoothukudi': { latitude: 8.7642, longitude: 78.1348 },
  // Additional state capitals and major cities
  'Shimla': { latitude: 31.1048, longitude: 77.1734 },
  'Dehradun': { latitude: 30.3165, longitude: 78.0322 },
  'Srinagar': { latitude: 34.0837, longitude: 74.7973 },
  'Jammu': { latitude: 32.7266, longitude: 74.8570 },
  'Leh': { latitude: 34.1526, longitude: 77.5771 },
  'Itanagar': { latitude: 27.0844, longitude: 93.6053 },
  'Shillong': { latitude: 25.5788, longitude: 91.8933 },
  'Aizawl': { latitude: 23.7271, longitude: 92.7176 },
  'Kohima': { latitude: 25.6751, longitude: 94.1086 },
  'Imphal': { latitude: 24.8170, longitude: 93.9368 },
  'Agartala': { latitude: 23.8315, longitude: 91.2868 },
  'Gangtok': { latitude: 27.3389, longitude: 88.6065 },
  'Dibrugarh': { latitude: 27.4728, longitude: 94.9120 },
  'Silchar': { latitude: 24.8333, longitude: 92.7789 },
  'Jorhat': { latitude: 26.7509, longitude: 94.2037 },
  'Puducherry': { latitude: 11.9416, longitude: 79.8083 },
  'Port Blair': { latitude: 11.6234, longitude: 92.7265 },
  'Haridwar': { latitude: 29.9457, longitude: 78.1642 },
  'Amritsar': { latitude: 31.6340, longitude: 74.8723 },
  'Surat': { latitude: 21.1702, longitude: 72.8311 },
  'Vadodara': { latitude: 22.3072, longitude: 73.1812 },
  'Rajkot': { latitude: 22.3039, longitude: 70.8022 },
  'Varanasi': { latitude: 25.3176, longitude: 82.9739 },
  'Agra': { latitude: 27.1767, longitude: 78.0081 },
  'Jamshedpur': { latitude: 22.8046, longitude: 86.2029 },
  'Dhanbad': { latitude: 23.7957, longitude: 86.4304 },
};

// State capital coordinates (fallback when district not in CITY_COORDINATES)
const STATE_CAPITAL_COORDINATES = {
  'Andaman and Nicobar Islands': { latitude: 11.6234, longitude: 92.7265 },
  'Andhra Pradesh': { latitude: 16.5062, longitude: 80.6480 },
  'Arunachal Pradesh': { latitude: 27.0844, longitude: 93.6053 },
  'Assam': { latitude: 26.1445, longitude: 91.7362 },
  'Bihar': { latitude: 25.6093, longitude: 85.1376 },
  'Chandigarh': { latitude: 30.7333, longitude: 76.7794 },
  'Chhattisgarh': { latitude: 21.2514, longitude: 81.6296 },
  'Dadra and Nagar Haveli and Daman and Diu': { latitude: 20.3974, longitude: 72.8328 },
  'Delhi': { latitude: 28.7041, longitude: 77.1025 },
  'Goa': { latitude: 15.4909, longitude: 73.8278 },
  'Gujarat': { latitude: 23.2156, longitude: 72.6369 },
  'Haryana': { latitude: 30.7333, longitude: 76.7794 },
  'Himachal Pradesh': { latitude: 31.1048, longitude: 77.1734 },
  'Jammu and Kashmir': { latitude: 34.0837, longitude: 74.7973 },
  'Jharkhand': { latitude: 23.3441, longitude: 85.3096 },
  'Karnataka': { latitude: 12.9716, longitude: 77.5946 },
  'Kerala': { latitude: 8.5241, longitude: 76.9366 },
  'Ladakh': { latitude: 34.1526, longitude: 77.5771 },
  'Lakshadweep': { latitude: 10.5667, longitude: 72.6417 },
  'Madhya Pradesh': { latitude: 23.2599, longitude: 77.4126 },
  'Maharashtra': { latitude: 19.0760, longitude: 72.8777 },
  'Manipur': { latitude: 24.8170, longitude: 93.9368 },
  'Meghalaya': { latitude: 25.5788, longitude: 91.8933 },
  'Mizoram': { latitude: 23.7271, longitude: 92.7176 },
  'Nagaland': { latitude: 25.6751, longitude: 94.1086 },
  'Odisha': { latitude: 20.2961, longitude: 85.8245 },
  'Puducherry': { latitude: 11.9416, longitude: 79.8083 },
  'Punjab': { latitude: 30.7333, longitude: 76.7794 },
  'Rajasthan': { latitude: 26.9124, longitude: 75.7873 },
  'Sikkim': { latitude: 27.3389, longitude: 88.6065 },
  'Tamil Nadu': { latitude: 13.0827, longitude: 80.2707 },
  'Telangana': { latitude: 17.3850, longitude: 78.4867 },
  'Tripura': { latitude: 23.8315, longitude: 91.2868 },
  'Uttar Pradesh': { latitude: 26.8467, longitude: 80.9462 },
  'Uttarakhand': { latitude: 30.3165, longitude: 78.0322 },
  'West Bengal': { latitude: 22.5726, longitude: 88.3639 },
};

const getCityLocation = (city, state) => {
  if (city && CITY_COORDINATES[city]) {
    return CITY_COORDINATES[city];
  }
  if (state && STATE_CAPITAL_COORDINATES[state]) {
    return STATE_CAPITAL_COORDINATES[state];
  }
  // Default to New Delhi (central India)
  return { latitude: 28.7041, longitude: 77.1025 };
};

const PatientProfileSetupScreen = ({ navigation, route }) => {
  const { email = '', role = 'patient' } = route.params || {};
  const { completeProfile } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = width >= 900;
  const isTabletUp = width >= 768;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    address: '',
    state: '',
    city: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: null,
      }));
    }
  };

  const handleBack = () => {
    navigation.replace('RoleSelection', { email });
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else {
      const emailError = validateEmail(formData.email);
      if (emailError) newErrors.email = emailError;
    }

    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood group is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);

    if (selectedDate) {
      const formattedDate = selectedDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
      updateField('dateOfBirth', formattedDate);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const profileData = {
        ...formData,
        email,
        role: USER_ROLES.PATIENT,
        fullName: `${formData.firstName} ${formData.lastName}`,
        phoneVerified: true,
        avatar: '',
        address: {
          street: formData.address,
          city: formData.city,
          state: formData.state || '',
          pincode: formData.pincode || '',
          country: 'India',
        },
        location: getCityLocation(formData.city, formData.state),
        emergencyContact: {
          name: formData.emergencyContactName,
          phone: formData.emergencyContactPhone,
          relationship: 'Family',
        },
        medicalHistory: {
          conditions: [],
          allergies: [],
          previousSurgeries: [],
          familyHistory: null,
        },
      };

      const response = await completeProfile(profileData);

      if (!response.success) {
        Alert.alert('Error', response.message || 'Failed to create profile');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.content,
              isWeb && styles.webContent,
              isDesktop && styles.desktopContent,
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  activeOpacity={0.8}
                  onPress={handleBack}
                >
                  <Icon name="back" size={20} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerText}>
                  <Text style={styles.title}>Complete Your Profile</Text>
                </View>
              </View>
              <Text style={styles.subtitle}>
                Help us serve you better by providing your information
              </Text>
            </View>

            {/* Form */}
            <View style={[styles.form, isWeb && isTabletUp && styles.formCard]}>
              {/* Personal Information */}
              <View style={styles.sectionHeader}>
                <Icon name="personalInfo" size={28} color={colors.primary[500]} />
                <Text style={styles.sectionTitle}>Personal Information</Text>
              </View>


              <Input
                label="First Name *"
                value={formData.firstName}
                onChangeText={(value) => updateField('firstName', value)}
                placeholder="Enter first name"
                error={errors.firstName}
                autoCapitalize="words"
              />

              <Input
                label="Last Name *"
                value={formData.lastName}
                onChangeText={(value) => updateField('lastName', value)}
                placeholder="Enter last name"
                error={errors.lastName}
                autoCapitalize="words"
              />

              <Input
                label="Email *"
                value={formData.email}
                onChangeText={(value) => updateField('email', value)}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />

              {/* Date Picker */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Date of Birth *</Text>
                {isWeb ? (
                  <TextInput
                    style={styles.dateInputWeb}
                    value={formData.dateOfBirth}
                    onChangeText={(value) => updateField('dateOfBirth', value)}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor={colors.gray[400]}
                  />
                ) : (
                  <TouchableOpacity style={styles.datePickerButton} onPress={() => setShowDatePicker(true)}>
                    <Icon name="calendar" size={16} color={colors.gray[500]} />
                    <Text style={styles.datePickerText}>
                      {formData.dateOfBirth || 'Select date'}
                    </Text>
                  </TouchableOpacity>
                )}
                {errors.dateOfBirth && (
                  <Text style={styles.errorText}>{errors.dateOfBirth}</Text>
                )}
              </View>

              {/* Gender Selection */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Gender *</Text>

                <View style={styles.optionsRow}>
                  {GENDERS.map((gender) => {
                    const isSelected = formData.gender === gender;

                    return (
                      <TouchableOpacity
                        key={gender}
                        style={[
                          styles.optionButton,
                          isSelected && styles.optionButtonSelected,
                        ]}
                        onPress={() => updateField('gender', gender)}
                      >
                        <Icon
                          name={
                            gender === 'male'
                              ? 'male'
                              : gender === 'female'
                                ? 'female'
                                : 'gender-other'
                          }
                          size={18}
                          color={isSelected ? colors.primary[500] : colors.gray[600]}
                        />

                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {gender.charAt(0).toUpperCase() + gender.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
              </View>


              {/* Blood Group Selection */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Blood Group *</Text>
                <View style={styles.optionsGrid}>
                  {BLOOD_GROUPS.map((group) => (
                    <TouchableOpacity
                      key={group}
                      style={[
                        styles.gridButton,
                        isDesktop && styles.gridButtonDesktop,
                        formData.bloodGroup === group && styles.gridButtonSelected,
                      ]}
                      onPress={() => updateField('bloodGroup', group)}
                    >
                      <Text
                        style={[
                          styles.gridButtonText,
                          formData.bloodGroup === group && styles.gridButtonTextSelected,
                        ]}
                      >
                        {group}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors.bloodGroup && <Text style={styles.errorText}>{errors.bloodGroup}</Text>}
              </View>

              {/* Address */}
              <Text style={styles.sectionTitle}>Address</Text>

              <Input
                label="Street Address"
                value={formData.address}
                onChangeText={(value) => updateField('address', value)}
                placeholder="Enter street address"
              />

              {/* State Selection */}
              <DropdownPicker
                label="State"
                placeholder="Select state"
                value={formData.state}
                options={INDIAN_STATES}
                onSelect={(st) => {
                  updateField('state', st);
                  updateField('city', '');
                }}
              />

              {/* City Selection */}
              <DropdownPicker
                label="City *"
                placeholder={formData.state ? 'Select city' : 'Select a state first'}
                value={formData.city}
                options={formData.state ? (CITIES_BY_STATE[formData.state] || []) : []}
                onSelect={(ct) => updateField('city', ct)}
                disabled={!formData.state}
                error={errors.city}
              />

              {/* Emergency Contact */}
              <Text style={styles.sectionTitle}>Emergency Contact</Text>

              <Input
                label="Contact Name"
                value={formData.emergencyContactName}
                onChangeText={(value) => updateField('emergencyContactName', value)}
                placeholder="Enter contact name"
                autoCapitalize="words"
              />

              <Input
                label="Contact Phone"
                value={formData.emergencyContactPhone}
                onChangeText={(value) => updateField('emergencyContactPhone', value)}
                placeholder="Enter contact phone"
                keyboardType="phone-pad"
              />

              {/* Submit Button */}
              <Button
                onPress={handleSubmit}
                loading={loading}
                fullWidth
                style={styles.submitButton}
              >
                Complete Profile
              </Button>
            </View>
          </View>
        </ScrollView>

        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={onDateChange}
          />
        )}

        {showDatePicker && Platform.OS === 'ios' && (
          <View style={styles.iosDatePickerOverlay}>
            <View style={styles.iosDatePickerContainer}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.iosDatePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  // The picker's current value is already tracked via onChange
                  setShowDatePicker(false);
                }}>
                  <Text style={styles.iosDatePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.dateOfBirth ? new Date(formData.dateOfBirth.split('/').reverse().join('-')) : new Date()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    const formattedDate = selectedDate.toLocaleDateString('en-GB');
                    updateField('dateOfBirth', formattedDate);
                  }
                }}
              />
            </View>
          </View>
        )}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  scrollContent: {
    flexGrow: 1,
  },
  webScroll: {
    flex: 1,
    height: '100vh',
    maxHeight: '100vh',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    backgroundColor: '#F1FBF8',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  webContent: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
  },
  desktopContent: {
    paddingTop: spacing['2xl'],
  },
  header: {
    marginBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },

  datePickerText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  dateInputWeb: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    backgroundColor: colors.white,
    outlineStyle: 'none',
    outlineWidth: 0,
    boxShadow: 'none',
  },

  form: {
    marginTop: spacing.sm,
  },
  formCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary[100],
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },

  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  fieldContainer: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    alignItems: 'center',
  },
  optionButtonSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  optionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
  },
  optionTextSelected: {
    color: colors.primary[500],
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  gridButton: {
    width: '22%',
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    alignItems: 'center',
  },
  gridButtonDesktop: {
    width: '15%',
  },
  gridButtonSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  gridButtonText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
  },
  gridButtonTextSelected: {
    color: colors.primary[500],
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.danger[500],
    marginTop: spacing.xs,
  },
  optionChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  optionChipSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  optionChipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
  },
  optionChipTextSelected: {
    color: colors.primary[500],
  },
  submitButton: {
    marginTop: spacing.xl,
  },
  iosDatePickerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  iosDatePickerContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: spacing.xl,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  iosDatePickerCancel: {
    fontSize: typography.fontSize.base,
    color: colors.gray[500],
  },
  iosDatePickerDone: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[500],
  },
});

export default PatientProfileSetupScreen;
