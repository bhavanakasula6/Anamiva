/**
 * Edit Profile Screen — DOCTOR (FIXED VERSION)
 */

import { useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { pickImage } from '../../utils/imagePicker';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography, borderRadius, shadows } from '../../styles/theme';
import { Avatar, Button, Header, Input, DropdownPicker } from '../../components/common';
import { validateEmail } from '../../utils/validation';
import Icon from '../../components/Icon';
import { INDIAN_STATES, CITIES_BY_STATE } from '../../data/constants';
import { authAPI } from '../../services/api';

const DoctorEditProfileScreen = ({ navigation }) => {
    const { user, updateProfile } = useAuth();
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isTabletUp = width >= 768;
    const isNarrow = width < 560;

    const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => {
        const h = i + 6; // 6 AM to 10 PM
        const label = h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
        return { value: h, label };
    });

    const [formData, setFormData] = useState({
        avatar: user?.avatar || '',
        firstName:
            user?.firstName ||
            user?.fullName?.replace(/^Dr\.\s*/, '').split(' ')[0] ||
            '',
        lastName:
            user?.lastName ||
            user?.fullName
                ?.replace(/^Dr\.\s*/, '')
                .split(' ')
                .slice(1)
                .join(' ') || '',
        email: user?.email || '',
        phone: user?.phone || user?.phoneNumber || '',
        gender: user?.gender || '',
        specialization: user?.specialization || '',
        qualifications: user?.qualifications || '',
        registrationNumber: user?.registrationNumber || '',
        experience: user?.experience?.toString() || '',
        consultationFee: user?.consultationFee?.toString() || '',
        clinicName: user?.address?.clinic || user?.clinicInfo?.name || '',
        clinicAddress: user?.address?.street || user?.clinicInfo?.address || '',
        city: user?.address?.city || '',
        state: user?.address?.state || '',
        pincode: user?.address?.pincode || '',
        bio: user?.bio || '',
        consultingHourStart: user?.consultingHours?.start ?? 9,
        consultingHourEnd: user?.consultingHours?.end ?? 17,
    });

    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [avatarUri, setAvatarUri] = useState(user?.avatar || null);
    const [hasChanges, setHasChanges] = useState(false);

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
        
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    const handlePickImage = async () => {
        try {
            const result = await pickImage();
            if (!result.cancelled && result.uri) {
                setAvatarUri(result.uri);
                // Upload to server
                const uploadRes = await authAPI.uploadAvatar(result);
                if (uploadRes.success) {
                    setAvatarUri(uploadRes.avatarUrl);
                    setFormData(prev => ({ ...prev, avatar: uploadRes.avatarUrl }));
                    setHasChanges(true);
                    Alert.alert('Success', 'Profile photo updated!');
                } else {
                    Alert.alert('Error', uploadRes.message || 'Failed to upload photo');
                    setAvatarUri(user?.avatar || null);
                }
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', 'Failed to pick image');
        }
    };

    const validate = () => {
        const newErrors = {};

        // Required fields
        if (!formData.firstName?.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName?.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        // Email validation
        if (!formData.email?.trim()) {
            newErrors.email = 'Email is required';
        } else {
            const emailError = validateEmail(formData.email);
            if (emailError) newErrors.email = emailError;
        }

        // Professional validations
        if (!formData.specialization?.trim()) {
            newErrors.specialization = 'Specialization is required';
        }

        if (!formData.qualifications?.trim()) {
            newErrors.qualifications = 'Qualifications are required';
        }

        if (!formData.registrationNumber?.trim()) {
            newErrors.registrationNumber = 'Registration number is required';
        }

        // Experience validation
        if (!formData.experience?.trim()) {
            newErrors.experience = 'Experience is required';
        } else {
            const exp = parseInt(formData.experience);
            if (isNaN(exp) || exp < 0) {
                newErrors.experience = 'Invalid experience';
            } else if (exp > 60) {
                newErrors.experience = 'Experience seems too high';
            }
        }

        // Consultation fee validation
        if (!formData.consultationFee?.trim()) {
            newErrors.consultationFee = 'Consultation fee is required';
        } else {
            const fee = parseInt(formData.consultationFee);
            if (isNaN(fee) || fee < 0) {
                newErrors.consultationFee = 'Invalid consultation fee';
            } else if (fee < 100) {
                newErrors.consultationFee = 'Fee should be at least ₹100';
            } else if (fee > 50000) {
                newErrors.consultationFee = 'Fee seems too high';
            }
        }

        // Pincode validation (if provided)
        if (formData.pincode?.trim()) {
            if (!/^\d{6}$/.test(formData.pincode)) {
                newErrors.pincode = 'Invalid pincode (must be 6 digits)';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleUpdate = async () => {
        if (!hasChanges) {
            Alert.alert('No Changes', 'No changes to save');
            return;
        }

        if (!validate()) {
            Alert.alert('Validation Error', 'Please fix the errors before saving');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email.trim().toLowerCase(),
                phone: formData.phone.trim(),
                specialization: formData.specialization.trim(),
                qualifications: formData.qualifications.trim(),
                registrationNumber: formData.registrationNumber.trim(),
                experience: parseInt(formData.experience, 10),
                consultationFee: parseInt(formData.consultationFee, 10),
                bio: formData.bio?.trim() || '',
                consultingHours: {
                    start: formData.consultingHourStart,
                    end: formData.consultingHourEnd,
                },
                avatar: avatarUri || formData.avatar,
                fullName: `Dr. ${formData.firstName.trim()} ${formData.lastName.trim()}`,
                name: `Dr. ${formData.firstName.trim()} ${formData.lastName.trim()}`,
                address: {
                    ...user?.address,
                    clinic: formData.clinicName?.trim() || '',
                    street: formData.clinicAddress?.trim() || '',
                    city: formData.city?.trim() || '',
                    state: formData.state?.trim() || '',
                    pincode: formData.pincode?.trim() || '',
                },
            };

            const response = await updateProfile(payload);

            if (response.success) {
                setHasChanges(false);
                Alert.alert('Success', 'Profile updated successfully', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                throw new Error(response.message || 'Update failed');
            }
        } catch (error) {
            console.error('Update error:', error);
            
            let errorMessage = 'Failed to update profile. Please try again.';
            
            if (error.message?.toLowerCase().includes('network')) {
                errorMessage = 'No internet connection. Please check your network.';
            } else if (error.message?.toLowerCase().includes('timeout')) {
                errorMessage = 'Request timed out. Please try again.';
            } else if (error.response?.status === 409) {
                errorMessage = 'Email or registration number already in use.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleGoBack = () => {
        if (hasChanges) {
            Alert.alert(
                'Unsaved Changes',
                'You have unsaved changes. Are you sure you want to leave?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <Header
                title="Edit Profile"
                leftIcon="back"
                onLeftPress={handleGoBack}
            />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={isWeb && styles.webScrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        {/* Avatar */}
                        <View style={styles.avatarSection}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={handlePickImage}
                                disabled={loading}
                            >
                                <Avatar
                                    key={avatarUri || user?.avatar}
                                    source={{ uri: avatarUri || user?.avatar }}
                                    size={100}
                                    name={user?.fullName || user?.name}
                                />

                                <View style={styles.cameraIconContainer}>
                                    <Icon name="camera" size={16} color={colors.white} />
                                </View>
                            </TouchableOpacity>

                            <Text style={styles.changePhotoText}>
                                Tap to change photo
                            </Text>
                        </View>

                        <View style={[styles.sectionGrid, isTabletUp && styles.sectionGridWide]}>
                            {/* Basic Info */}
                            <View style={[styles.section, isTabletUp && styles.sectionCard]}>
                                <Text style={styles.sectionTitle}>Basic Information</Text>

                                <Input
                                    label="First Name *"
                                    value={formData.firstName}
                                    onChangeText={text => updateField('firstName', text)}
                                    error={errors.firstName}
                                    autoCapitalize="words"
                                    editable={!loading}
                                />

                                <Input
                                    label="Last Name *"
                                    value={formData.lastName}
                                    onChangeText={text => updateField('lastName', text)}
                                    error={errors.lastName}
                                    autoCapitalize="words"
                                    editable={!loading}
                                />

                                <Input
                                    label="Email *"
                                    value={formData.email}
                                    onChangeText={text => updateField('email', text)}
                                    error={errors.email}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!loading}
                                />

                                <Input
                                    label="Phone"
                                    value={formData.phone}
                                    onChangeText={text => updateField('phone', text.replace(/[^0-9+ ]/g, ''))}
                                    placeholder="Enter phone number"
                                    keyboardType="phone-pad"
                                    maxLength={15}
                                    editable={!loading}
                                />
                            </View>

                            {/* Professional Info */}
                            <View style={[styles.section, isTabletUp && styles.sectionCard]}>
                                <Text style={styles.sectionTitle}>Professional Information</Text>

                            <Input
                                label="Specialization *"
                                value={formData.specialization}
                                onChangeText={text => updateField('specialization', text)}
                                error={errors.specialization}
                                editable={!loading}
                            />

                            <Input
                                label="Qualifications *"
                                value={formData.qualifications}
                                onChangeText={text => updateField('qualifications', text)}
                                error={errors.qualifications}
                                placeholder="e.g., MBBS, MD"
                                editable={!loading}
                            />

                            <Input
                                label="Registration Number *"
                                value={formData.registrationNumber}
                                onChangeText={text => updateField('registrationNumber', text)}
                                error={errors.registrationNumber}
                                editable={!loading}
                            />

                            <Input
                                label="Experience (years) *"
                                value={formData.experience}
                                onChangeText={text => updateField('experience', text)}
                                error={errors.experience}
                                keyboardType="number-pad"
                                maxLength={2}
                                editable={!loading}
                            />

                            <Input
                                label="Consultation Fee (₹) *"
                                value={formData.consultationFee}
                                onChangeText={text => updateField('consultationFee', text)}
                                error={errors.consultationFee}
                                keyboardType="number-pad"
                                maxLength={5}
                                editable={!loading}
                            />

                            <Input
                                label="Bio"
                                value={formData.bio}
                                onChangeText={text => updateField('bio', text)}
                                placeholder="Tell patients about yourself and your practice"
                                multiline
                                numberOfLines={4}
                                maxLength={500}
                                editable={!loading}
                            />
                            </View>
                        </View>

                        {/* Consulting Hours */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Consulting Hours</Text>
                            <Text style={{ fontSize: 13, color: colors.gray[500], marginBottom: spacing.md }}>
                                Set the hours during which patients can book appointments
                            </Text>
                            <View style={[styles.hoursRow, isNarrow && styles.hoursRowStack]}>
                                <View style={{ flex: 1 }}>
                                    <DropdownPicker
                                        label="Start Time"
                                        placeholder="Start"
                                        value={HOUR_OPTIONS.find(h => h.value === formData.consultingHourStart)?.label || '9:00 AM'}
                                        options={HOUR_OPTIONS.map(h => h.label)}
                                        onSelect={(label) => {
                                            const hour = HOUR_OPTIONS.find(h => h.label === label);
                                            if (hour) updateField('consultingHourStart', hour.value);
                                        }}
                                        disabled={loading}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <DropdownPicker
                                        label="End Time"
                                        placeholder="End"
                                        value={HOUR_OPTIONS.find(h => h.value === formData.consultingHourEnd)?.label || '5:00 PM'}
                                        options={HOUR_OPTIONS.filter(h => h.value > formData.consultingHourStart).map(h => h.label)}
                                        onSelect={(label) => {
                                            const hour = HOUR_OPTIONS.find(h => h.label === label);
                                            if (hour) updateField('consultingHourEnd', hour.value);
                                        }}
                                        disabled={loading}
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Clinic Info */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Clinic Information</Text>

                            <Input
                                label="Clinic Name"
                                value={formData.clinicName}
                                onChangeText={text => updateField('clinicName', text)}
                                placeholder="Enter clinic name"
                                autoCapitalize="words"
                                editable={!loading}
                            />

                            <Input
                                label="Clinic Address"
                                value={formData.clinicAddress}
                                onChangeText={text => updateField('clinicAddress', text)}
                                placeholder="Enter clinic address"
                                multiline
                                numberOfLines={3}
                                editable={!loading}
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
                                disabled={loading}
                            />

                            {/* City Selection */}
                            <DropdownPicker
                                label="City"
                                placeholder={formData.state ? 'Select city' : 'Select a state first'}
                                value={formData.city}
                                options={formData.state ? (CITIES_BY_STATE[formData.state] || []) : []}
                                onSelect={(ct) => updateField('city', ct)}
                                disabled={loading || !formData.state}
                            />

                            <Input
                                label="Pincode"
                                value={formData.pincode}
                                onChangeText={text => updateField('pincode', text)}
                                placeholder="Enter pincode"
                                error={errors.pincode}
                                keyboardType="numeric"
                                maxLength={6}
                                editable={!loading}
                            />
                        </View>

                        <Button
                            onPress={handleUpdate}
                            loading={loading}
                            disabled={loading || !hasChanges}
                            fullWidth
                            style={styles.saveButton}
                        >
                            {hasChanges ? 'Save Changes' : 'No Changes'}
                        </Button>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
    scrollView: {
        flex: 1,
    },
    webScrollContent: {
        width: '100%',
        maxWidth: 1180,
        alignSelf: 'center',
    },
    content: {
        padding: spacing.lg,
        paddingBottom: spacing['2xl'],
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
    sectionGrid: {
        width: '100%',
    },
    sectionGridWide: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.lg,
    },
    sectionCard: {
        flex: 1,
        minWidth: 0,
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.gray[200],
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
    hoursRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    hoursRowStack: {
        flexDirection: 'column',
        gap: 0,
    },
    saveButton: {
        marginBottom: spacing.xl,
    },
});

export default DoctorEditProfileScreen;
