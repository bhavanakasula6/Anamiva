/**
 * Edit Profile Screen
 * Patient profile editing with proper pickers for DOB, Gender, Blood Group
 */

import { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
} from '../../styles/theme';

import {
  Avatar,
  Button,
  Header,
  Input,
  DropdownPicker,
} from '../../components/common';

import Icon from '../../components/Icon';
import { BLOOD_GROUPS, GENDERS, INDIAN_STATES, CITIES_BY_STATE } from '../../data/constants';
import { pickImage } from '../../utils/imagePicker';
import { authAPI } from '../../services/api';

const EditProfileScreen = ({ navigation }) => {
  const { user, updateProfile, refreshUser, sendOTP, changeEmail } = useAuth();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;

  const [formData, setFormData] = useState({
    firstName: user?.firstName || user?.name?.split(' ')[0] || '',
    lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phoneNumber || user?.phone || '',
    dateOfBirth: user?.dateOfBirth || '',
    gender: user?.gender || '',
    bloodGroup: user?.bloodGroup || '',
    height: user?.height?.toString() || '',
    weight: user?.weight?.toString() || '',
    address: typeof user?.address === 'object' ? user?.address?.street || '' : user?.address || '',
    state: typeof user?.address === 'object' ? user?.address?.state || '' : '',
    city: typeof user?.address === 'object' ? user?.address?.city || '' : '',
  });

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [avatarUri, setAvatarUri] = useState(user?.avatar || user?.profilePicture || null);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState('email');
  const [emailLoading, setEmailLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await pickImage();
      if (!result.cancelled && result.uri) {
        setAvatarUri(result.uri);
        // Upload to server immediately
        const uploadRes = await authAPI.uploadAvatar(result);
        if (uploadRes.success) {
          setAvatarUri(uploadRes.avatarUrl);
          if (refreshUser) refreshUser();
          Alert.alert('Success', 'Profile photo updated!');
        } else {
          Alert.alert('Error', uploadRes.message || 'Failed to upload photo');
          // Revert to old avatar
          setAvatarUri(user?.avatar || user?.profilePicture || null);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const startEmailChange = () => {
    setNewEmail('');
    setEmailOtp('');
    setEmailStep('email');
    setEmailModalVisible(true);
  };

  const sendEmailChangeOtp = async () => {
    setEmailLoading(true);
    const response = await sendOTP(newEmail.trim().toLowerCase());
    setEmailLoading(false);
    if (response.success) setEmailStep('otp');
    else Alert.alert('Unable to send OTP', response.message || 'Please try again.');
  };

  const verifyEmailChange = async () => {
    setEmailLoading(true);
    const response = await changeEmail(newEmail.trim().toLowerCase(), emailOtp.trim());
    setEmailLoading(false);
    if (response.success) {
      setFormData(prev => ({ ...prev, email: response.user.email }));
      setEmailModalVisible(false);
      Alert.alert('Success', 'Email changed successfully.');
    } else {
      Alert.alert('Unable to change email', response.message || 'Invalid or expired OTP.');
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await updateProfile({
        ...formData,

        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`,
        name: `${formData.firstName} ${formData.lastName}`,

        address: {
          street: formData.address,
          city: formData.city,
          state: formData.state,
          country: 'India',
        },
      });
      if (response?.success !== false) {
        if (refreshUser) refreshUser();
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        throw new Error(response?.message || 'Update failed');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const formattedDate = selectedDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
      setFormData({ ...formData, dateOfBirth: formattedDate });
    }
  };

  const openDatePicker = () => {
    if (Platform.OS === 'web') {
      const value = window.prompt('Enter date of birth (DD/MM/YYYY)', formData.dateOfBirth || '');
      if (value) {
        setFormData({ ...formData, dateOfBirth: value });
      }
      return;
    }

    setShowDatePicker(true);
  };

  // Parse current DOB string to a Date object for the picker
  const parseDOB = () => {
    if (!formData.dateOfBirth) return new Date(2000, 0, 1);
    try {
      const parts = formData.dateOfBirth.split('/');
      if (parts.length === 3) {
        return new Date(parts[2], parts[1] - 1, parts[0]);
      }
    } catch {}
    return new Date(2000, 0, 1);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Edit Profile"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.webScrollContent]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity activeOpacity={0.7} onPress={handlePickImage} disabled={loading}>
              <Avatar
                key={avatarUri}
                source={{ uri: avatarUri }}
                size={100}
                name={`${user?.firstName} ${user?.lastName}`}
              />

              <View style={styles.cameraIconContainer}>
                <Icon
                  name="camera"
                  size={16}
                  color={colors.white}
                />
              </View>
            </TouchableOpacity>

            <Text style={styles.changePhotoText}>
              Tap to change photo
            </Text>
          </View>

          {/* Personal Information */}
          <View style={[styles.section, isTabletUp && styles.sectionCard]}>
            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>

            <Input
              label="First Name"
              value={formData.firstName}
              onChangeText={text =>
                setFormData({ ...formData, firstName: text })
              }
              placeholder="Enter first name"
            />

            <Input
              label="Last Name"
              value={formData.lastName}
              onChangeText={text =>
                setFormData({ ...formData, lastName: text })
              }
              placeholder="Enter last name"
            />

            <Input
              label="Email"
              value={formData.email}
              placeholder="Enter email"
              keyboardType="email-address"
              autoCapitalize="none"
              disabled
            />
            <TouchableOpacity style={styles.changeEmailButton} onPress={startEmailChange}>
              <Text style={styles.changeEmailText}>Change email</Text>
            </TouchableOpacity>

            <Input
              label="Phone"
              value={formData.phone}
              onChangeText={text =>
                setFormData({ ...formData, phone: text.replace(/[^0-9+ ]/g, '') })
              }
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              maxLength={15}
            />

            {/* Date of Birth Picker */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={openDatePicker}
              >
                <Icon name="calendar" size={16} color={colors.gray[500]} />
                <Text style={[
                  styles.datePickerText,
                  !formData.dateOfBirth && styles.placeholderText,
                ]}>
                  {formData.dateOfBirth || 'Select date'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Gender Selector */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Gender</Text>
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
                      onPress={() => setFormData({ ...formData, gender })}
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
            </View>
          </View>

          {/* Medical Information */}
          <View style={[styles.section, isTabletUp && styles.sectionCard]}>
            <Text style={styles.sectionTitle}>
              Medical Information
            </Text>

            {/* Blood Group Selector */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Blood Group</Text>
              <View style={styles.optionsGrid}>
                {BLOOD_GROUPS.map((group) => (
                  <TouchableOpacity
                    key={group}
                    style={[
                      styles.gridButton,
                      formData.bloodGroup === group && styles.gridButtonSelected,
                    ]}
                    onPress={() => setFormData({ ...formData, bloodGroup: group })}
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
            </View>

            <Input
              label="Height (cm)"
              value={formData.height}
              onChangeText={text =>
                setFormData({ ...formData, height: text })
              }
              placeholder="Enter height"
              keyboardType="numeric"
            />

            <Input
              label="Weight (kg)"
              value={formData.weight}
              onChangeText={text =>
                setFormData({ ...formData, weight: text })
              }
              placeholder="Enter weight"
              keyboardType="numeric"
            />
          </View>

          {/* Address */}
          <View style={[styles.section, isTabletUp && styles.sectionCard]}>
            <Text style={styles.sectionTitle}>Address</Text>

            <Input
              label="Street Address"
              value={formData.address}
              onChangeText={text =>
                setFormData({ ...formData, address: text })
              }
              placeholder="Enter your street address"
              multiline
              numberOfLines={3}
            />

            {/* State Selection */}
            <DropdownPicker
              label="State"
              placeholder="Select state"
              value={formData.state}
              options={INDIAN_STATES}
              onSelect={(st) => setFormData({ ...formData, state: st, city: '' })}
            />

            {/* City Selection */}
            <DropdownPicker
              label="City"
              placeholder={formData.state ? 'Select city' : 'Select a state first'}
              value={formData.city}
              options={formData.state ? (CITIES_BY_STATE[formData.state] || []) : []}
              onSelect={(ct) => setFormData({ ...formData, city: ct })}
              disabled={!formData.state}
            />
          </View>

          {/* Save */}
          <Button
            onPress={handleUpdate}
            loading={loading}
            fullWidth
            style={styles.saveButton}
          >
            Save Changes
          </Button>
        </View>
      </ScrollView>

      <Modal visible={emailModalVisible} transparent animationType="fade" onRequestClose={() => setEmailModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.emailModal}>
            <Text style={styles.modalTitle}>Change email</Text>
            <Text style={styles.modalMessage}>
              {emailStep === 'email' ? 'Enter your new email address.' : `Enter the OTP sent to ${newEmail}.`}
            </Text>
            {emailStep === 'email' ? (
              <Input label="New email" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            ) : (
              <Input label="OTP" value={emailOtp} onChangeText={value => setEmailOtp(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" />
            )}
            <Button fullWidth loading={emailLoading} onPress={emailStep === 'email' ? sendEmailChangeOtp : verifyEmailChange}>
              {emailStep === 'email' ? 'Send OTP' : 'Verify and change email'}
            </Button>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setEmailModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Android DatePicker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={parseDOB()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {/* iOS DatePicker with modal overlay */}
      {showDatePicker && Platform.OS === 'ios' && (
        <View style={styles.iosDatePickerOverlay}>
          <View style={styles.iosDatePickerContainer}>
            <View style={styles.iosDatePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.iosDatePickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.iosDatePickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={parseDOB()}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          </View>
        </View>
      )}
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: spacing['4xl'],
  },
  webScrollContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingBottom: spacing['4xl'],
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary[500],
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  changePhotoText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[500],
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
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
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  datePickerText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },
  placeholderText: {
    color: colors.gray[400],
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
    backgroundColor: colors.white,
  },
  optionButtonSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  optionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
    marginTop: 4,
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
    backgroundColor: colors.white,
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
  chipScroll: {
    marginBottom: spacing.sm,
  },
  chipButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 20,
    marginRight: spacing.sm,
    backgroundColor: colors.white,
  },
  chipButtonSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  chipText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
  },
  chipTextSelected: {
    color: colors.primary[500],
  },
  mutedText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[500],
    paddingVertical: spacing.sm,
  },
  saveButton: {
    marginBottom: spacing.xl,
  },
  changeEmailButton: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', marginTop: -spacing.sm, marginBottom: spacing.sm },
  changeEmailText: { color: colors.primary[600], fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: spacing.lg },
  emailModal: { backgroundColor: colors.white, borderRadius: borderRadius.xl, padding: spacing.xl },
  modalTitle: { fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bold, color: colors.gray[900], marginBottom: spacing.sm },
  modalMessage: { fontSize: typography.fontSize.sm, color: colors.gray[600], marginBottom: spacing.lg },
  modalCancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  modalCancelText: { color: colors.gray[600], fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.semiBold },
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

export default EditProfileScreen;
