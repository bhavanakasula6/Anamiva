/**
 * Doctor Profile Setup Screen
 * Complete doctor profile information
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme';
import { Button, Input, DropdownPicker } from '../../components/common';
import { validateEmail, validateRequired } from '../../utils/validation';
import { USER_ROLES, SPECIALIZATIONS, GENDERS, INDIAN_STATES, CITIES_BY_STATE } from '../../data/constants';
import Icon from '../../components/Icon';

const DoctorProfileSetupScreen = ({ navigation, route }) => {
  const { email = '', role = 'doctor' } = route.params || {};
  const { completeProfile } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isDesktop = width >= 900;
  const isTabletUp = width >= 768;
  const isNarrow = width < 560;

  const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
    const h = i + 6;
    const label = h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
    return { value: h, label };
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: email || '',
    gender: '',
    specialization: '',
    qualifications: '',
    registrationNumber: '',
    experience: '',
    consultationFee: '',
    clinicName: '',
    clinicAddress: '',
    state: '',
    city: '',
    bio: '',
    consultingHourStart: 9,
    consultingHourEnd: 17,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

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

    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.specialization) newErrors.specialization = 'Specialization is required';
    if (!formData.qualifications) newErrors.qualifications = 'Qualifications are required';
    if (!formData.registrationNumber) newErrors.registrationNumber = 'Registration number is required';
    if (!formData.experience) newErrors.experience = 'Experience is required';
    if (!formData.consultationFee) newErrors.consultationFee = 'Consultation fee is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        role: USER_ROLES.DOCTOR,
        fullName: `Dr. ${formData.firstName} ${formData.lastName}`,
        phoneVerified: true,
        avatar: '',
        experience: parseInt(formData.experience),
        consultationFee: parseInt(formData.consultationFee),
        rating: 4.5,
        reviewCount: 0,
        address: {
          clinic: formData.clinicName,
          street: formData.clinicAddress,
          city: formData.city,
          state: formData.state,
          pincode: '',
          country: 'India',
        },
        clinicName: formData.clinicName,
        clinicAddress: formData.clinicAddress,
        consultingHours: {
          start: formData.consultingHourStart,
          end: formData.consultingHourEnd,
        },
        location: {
          latitude: 19.0760 + (Math.random() - 0.5) * 0.1,
          longitude: 72.8777 + (Math.random() - 0.5) * 0.1,
        },
        availability: {
          isOnline: true,
          acceptingEmergency: false,
          schedule: [
            { day: 'Monday', available: true, slots: [{ start: '09:00', end: '17:00' }] },
            { day: 'Tuesday', available: true, slots: [{ start: '09:00', end: '17:00' }] },
            { day: 'Wednesday', available: true, slots: [{ start: '09:00', end: '17:00' }] },
            { day: 'Thursday', available: true, slots: [{ start: '09:00', end: '17:00' }] },
            { day: 'Friday', available: true, slots: [{ start: '09:00', end: '17:00' }] },
            { day: 'Saturday', available: true, slots: [{ start: '09:00', end: '13:00' }] },
            { day: 'Sunday', available: false, slots: [] },
          ],
        },
        languages: ['English', 'Hindi'],
        verified: true,
        totalPatients: 0,
        totalAppointments: 0,
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
                Provide your professional information to get started
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

              {/* Gender Selection */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Gender *</Text>

                <View style={styles.optionsRow}>
                  {GENDERS.slice(0, 2).map((gender) => {
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
                          name={gender === 'male' ? 'male' : 'female'}
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


              {/* Professional Information */}
              <Text style={styles.sectionTitle}>Professional Information</Text>

              {/* Specialization */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Specialization *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.specializationScroll}
                >
                  {SPECIALIZATIONS.map((spec) => (
                    <TouchableOpacity
                      key={spec}
                      style={[
                        styles.specializationButton,
                        formData.specialization === spec && styles.specializationButtonSelected,
                      ]}
                      onPress={() => updateField('specialization', spec)}
                    >
                      <Text
                        style={[
                          styles.specializationText,
                          formData.specialization === spec && styles.specializationTextSelected,
                        ]}
                      >
                        {spec}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.specialization && <Text style={styles.errorText}>{errors.specialization}</Text>}
              </View>

              <Input
                label="Qualifications *"
                value={formData.qualifications}
                onChangeText={(value) => updateField('qualifications', value)}
                placeholder="e.g., MBBS, MD"
                error={errors.qualifications}
              />

              <Input
                label="Registration Number *"
                value={formData.registrationNumber}
                onChangeText={(value) => updateField('registrationNumber', value)}
                placeholder="Enter medical registration number"
                error={errors.registrationNumber}
              />

              <Input
                label="Years of Experience *"
                value={formData.experience}
                onChangeText={(value) => updateField('experience', value)}
                placeholder="Enter years of experience"
                keyboardType="number-pad"
                error={errors.experience}
              />

              <Input
                label="Consultation Fee (₹) *"
                value={formData.consultationFee}
                onChangeText={(value) => updateField('consultationFee', value)}
                placeholder="Enter consultation fee"
                keyboardType="number-pad"
                error={errors.consultationFee}
              />

              <Text style={styles.sectionTitle}>Consulting Hours</Text>
              <View style={[styles.hoursRow, isNarrow && styles.hoursRowStack]}>
                <View style={styles.hourPicker}>
                  <DropdownPicker
                    label="Start Time"
                    placeholder="Start"
                    value={HOUR_OPTIONS.find(h => h.value === formData.consultingHourStart)?.label || '9:00 AM'}
                    options={HOUR_OPTIONS.map(h => h.label)}
                    onSelect={(label) => {
                      const hour = HOUR_OPTIONS.find(h => h.label === label);
                      if (!hour) return;
                      updateField('consultingHourStart', hour.value);
                      if (formData.consultingHourEnd <= hour.value) {
                        updateField('consultingHourEnd', hour.value + 1);
                      }
                    }}
                  />
                </View>
                <View style={styles.hourPicker}>
                  <DropdownPicker
                    label="End Time"
                    placeholder="End"
                    value={HOUR_OPTIONS.find(h => h.value === formData.consultingHourEnd)?.label || '5:00 PM'}
                    options={HOUR_OPTIONS.filter(h => h.value > formData.consultingHourStart).map(h => h.label)}
                    onSelect={(label) => {
                      const hour = HOUR_OPTIONS.find(h => h.label === label);
                      if (hour) updateField('consultingHourEnd', hour.value);
                    }}
                  />
                </View>
              </View>

              <Input
                label="Bio"
                value={formData.bio}
                onChangeText={(value) => updateField('bio', value)}
                placeholder="Tell us about yourself"
                multiline
                numberOfLines={4}
              />

              {/* Clinic Information */}
              <Text style={styles.sectionTitle}>Clinic Information</Text>

              <Input
                label="Clinic Name"
                value={formData.clinicName}
                onChangeText={(value) => updateField('clinicName', value)}
                placeholder="Enter clinic name"
                autoCapitalize="words"
              />

              <Input
                label="Clinic Address"
                value={formData.clinicAddress}
                onChangeText={(value) => updateField('clinicAddress', value)}
                placeholder="Enter clinic address"
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
    maxWidth: 920,
    alignSelf: 'center',
  },
  desktopContent: {
    paddingTop: spacing['2xl'],
  },
  header: {
    marginBottom: spacing.xl,
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
  form: {
    marginTop: spacing.md,
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
    justifyContent: 'center',
    gap: 6,
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
  specializationScroll: {
    marginBottom: spacing.sm,
  },
  specializationButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  specializationButtonSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  specializationText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
  },
  specializationTextSelected: {
    color: colors.primary[500],
  },
  hoursRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  hoursRowStack: {
    flexDirection: 'column',
    gap: 0,
  },
  hourPicker: {
    flex: 1,
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.danger[500],
    marginTop: spacing.xs,
  },
  accessMuted: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500],
    paddingVertical: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.xl,
  },
});

export default DoctorProfileSetupScreen;
