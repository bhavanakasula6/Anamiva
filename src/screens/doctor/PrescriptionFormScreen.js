/**
 * Prescription Form Screen
 * Doctor-only
 * - Creates prescription if none exists
 * - Edits prescription if already created
 * - Locked after appointment completion
 */

import React, { useEffect, useState } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
    TouchableOpacity,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDoctor } from '../../contexts/DoctorContext';

import {
    Card,
    Button,
    Input,
    Header,
    Loading,
    DropdownPicker,
} from '../../components/common';

import Icon from '../../components/Icon';
import { colors, spacing, typography, shadows, borderRadius } from '../../styles/theme';
import { APPOINTMENT_STATUS } from '../../data/constants';

const PrescriptionFormScreen = ({ route, navigation }) => {
    const { appointmentId = '', appointmentStatus = null } = route.params || {};
    const { width } = useWindowDimensions();
    const isWeb = Platform.OS === 'web';
    const isTabletUp = width >= 768;

    const {
        createPrescription,
        updatePrescription,
        getAppointmentPrescription,
    } = useDoctor();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    const [prescriptionId, setPrescriptionId] = useState(null);
    const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    const [medications, setMedications] = useState([
        { name: '', dosage: '', frequency: '', frequencyMode: 'standard', durationValue: '', durationUnit: 'days', startDate: '' },
    ]);

    const durationUnits = ['days', 'weeks', 'months'];
    const frequencyOptions = [
        'Other / Custom',
        'Morning',
        'Afternoon',
        'Evening',
        'Night',
        'Morning and night',
        'Morning, afternoon and night',
        'Once daily',
        'Twice daily',
        'Three times daily',
        'With meals',
        'After meals',
        'Before meals',
        'Every 2 hours',
        'Every 4 hours',
        'Every 6 hours',
        'Every 8 hours',
        'Every 12 hours',
        'As needed',
    ];
    const [startDatePickerIndex, setStartDatePickerIndex] = useState(null);

    const dateFromInput = (value) => {
        const [year, month, day] = String(value || '').split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return year && month && day && !Number.isNaN(date.getTime()) ? date : new Date();
    };

    const formatDisplayDate = (value) => {
        if (!value) return 'Select start date';
        return dateFromInput(value).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    const formatInputDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const normalizeLoadedMedication = (med) => {
        if (med.durationValue) {
            return { ...med, durationValue: String(med.durationValue), durationUnit: med.durationUnit || 'days', frequencyMode: med.frequency && !frequencyOptions.includes(med.frequency) ? 'custom' : 'standard', startDate: med.startDate ? new Date(med.startDate).toISOString().slice(0, 10) : '' };
        }
        const match = String(med.duration || '').trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months)?$/);
        return {
            ...med,
            durationValue: match ? match[1] : '',
            durationUnit: med.durationUnit || (
                match?.[2]?.startsWith('week') ? 'weeks' : match?.[2]?.startsWith('month') ? 'months' : 'days'
            ),
            startDate: med.startDate ? new Date(med.startDate).toISOString().slice(0, 10) : '',
            frequencyMode: med.frequency && !frequencyOptions.includes(med.frequency) ? 'custom' : 'standard',
        };
    };

    const isLocked =
        appointmentStatus === APPOINTMENT_STATUS.COMPLETED ||
        appointmentStatus === APPOINTMENT_STATUS.CANCELLED;

    const isEditMode = Boolean(prescriptionId);

    // ================================
    // Load prescription (if exists)
    // ================================
    useEffect(() => {
        (async () => {
            setLoading(true);

            const res = await getAppointmentPrescription(appointmentId);

            if (res?.success && res.prescription) {
                setPrescriptionId(res.prescription.id);
                setRecordDate(
                    new Date(res.prescription.recordDate || res.prescription.date || res.prescription.createdAt)
                        .toISOString()
                        .slice(0, 10)
                );
                setDiagnosis(res.prescription.diagnosis || '');
                setNotes(res.prescription.notes || '');
                setMedications(
                    res.prescription.medications?.length
                        ? res.prescription.medications.map(normalizeLoadedMedication)
                        : [{ name: '', dosage: '', frequency: '', frequencyMode: 'standard', durationValue: '', durationUnit: 'days', startDate: '' }]
                );
            }

            setLoading(false);
        })();
    }, [appointmentId]);

    // ================================
    // Medication helpers
    // ================================
    const addMedication = () => {
        setMedications(prev => [
            ...prev,
            { name: '', dosage: '', frequency: '', frequencyMode: 'standard', durationValue: '', durationUnit: 'days', startDate: '' },
        ]);
    };

    const updateMedication = (index, field, value) => {
        setMedications(prev =>
            prev.map((med, i) =>
                i === index ? { ...med, [field]: value } : med
            )
        );
    };

    const removeMedication = (index) => {
        setMedications(prev => prev.filter((_, i) => i !== index));
    };

    // ================================
    // Save (CREATE or EDIT)
    // ================================
    const handleSave = async () => {
        if (isLocked) return;

        if (!diagnosis.trim()) {
            Alert.alert('Validation error', 'Diagnosis is required');
            return;
        }

        if (Number.isNaN(new Date(recordDate).getTime())) {
            Alert.alert('Validation error', 'Enter prescription date in YYYY-MM-DD format');
            return;
        }

        const validMeds = medications.filter(
            m => m.name && m.dosage && m.frequency
        );

        if (!validMeds.length) {
            Alert.alert('Validation error', 'Add at least one medication');
            return;
        }

        const hasInvalidDuration = validMeds.some(
            m => !Number.isFinite(Number(m.durationValue)) || Number(m.durationValue) <= 0 || !durationUnits.includes(m.durationUnit)
        );
        if (hasInvalidDuration) {
            Alert.alert('Validation error', 'Enter a valid duration value and select days, weeks, or months for every medication');
            return;
        }

        const hasInvalidStartDate = validMeds.some(
            m => m.startDate && Number.isNaN(new Date(m.startDate).getTime())
        );
        if (hasInvalidStartDate) {
            Alert.alert('Validation error', 'Enter each start date in YYYY-MM-DD format or leave it blank');
            return;
        }

        setSaving(true);
        setSaveMessage('Saving prescription...');

        try {
            let res;

            if (isEditMode) {
                res = await updatePrescription(prescriptionId, {
                    recordDate,
                    diagnosis,
                    notes,
                    medications: validMeds,
                });
            } else {
                res = await createPrescription(appointmentId, {
                    recordDate,
                    diagnosis,
                    notes,
                    medications: validMeds,
                });
            }

            if (!res?.success) {
                throw new Error(res?.message || 'Failed to save prescription');
            }

            // The DoctorContext refreshes appointments after a successful save.
            // Avoid a second full dashboard refresh before returning to details.
            setSaveMessage('Prescription saved. Opening appointment...');
            navigation.navigate('AppointmentDetails', {
                appointmentId,
                refresh: Date.now(),
            });
        } catch (error) {
            console.error('Error saving prescription:', error);
            setSaveMessage('');
            Alert.alert('Unable to save prescription', error?.message || 'Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Loading fullScreen text="Loading prescription..." />;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <Header
                title={isEditMode ? 'Edit Prescription' : 'Create Prescription'}
                leftIcon="back"
                onLeftPress={navigation.goBack}
            />

            <ScrollView
                style={styles.container}
                contentContainerStyle={[styles.scrollContent, isWeb && styles.webScrollContent]}
                showsVerticalScrollIndicator={false}
            >

                {/* Diagnosis */}
                <View style={[styles.formGrid, isTabletUp && styles.formGridWide]}>
                    <Card style={[styles.card, isTabletUp && styles.primaryCard]}>
                        <Text style={styles.section}>Diagnosis</Text>
                        <Input
                            label="Prescription Date"
                            value={recordDate}
                            onChangeText={setRecordDate}
                            placeholder="YYYY-MM-DD"
                            keyboardType="numbers-and-punctuation"
                            editable={!isLocked}
                        />
                        <Input
                            value={diagnosis}
                            onChangeText={setDiagnosis}
                            placeholder="Enter diagnosis"
                            multiline
                            editable={!isLocked}
                        />
                    </Card>

                    {/* Medications */}
                    <Card style={[styles.card, isTabletUp && styles.primaryCard]}>
                        <Text style={styles.section}>Medications</Text>

                        {medications.map((med, index) => (
                            <View key={index} style={styles.medBox}>
                                <View style={styles.medHeader}>
                                    <Text style={styles.medTitle}>
                                        Medication {index + 1}
                                    </Text>

                                    {!isLocked && medications.length > 1 && (
                                        <Icon
                                            name="trash"
                                            size={16}
                                            color={colors.danger[500]}
                                            onPress={() => removeMedication(index)}
                                        />
                                    )}
                                </View>

                                <Input
                                    placeholder="Medicine name"
                                    value={med.name}
                                    onChangeText={v => updateMedication(index, 'name', v)}
                                    editable={!isLocked}
                                />

                                <Input
                                    placeholder="Dosage (e.g. 500mg)"
                                    value={med.dosage}
                                    onChangeText={v => updateMedication(index, 'dosage', v)}
                                    editable={!isLocked}
                                />

                                <DropdownPicker
                                    label="Frequency"
                                    value={med.frequencyMode === 'custom' ? 'Other / Custom' : med.frequency}
                                    options={frequencyOptions}
                                    onSelect={v => {
                                        if (v === 'Other / Custom') {
                                            updateMedication(index, 'frequencyMode', 'custom');
                                            updateMedication(index, 'frequency', '');
                                        } else {
                                            updateMedication(index, 'frequencyMode', 'standard');
                                            updateMedication(index, 'frequency', v);
                                        }
                                    }}
                                    disabled={isLocked}
                                    searchable
                                />

                                {med.frequencyMode === 'custom' && (
                                    <Input
                                        label="Custom frequency"
                                        placeholder="Enter frequency or instructions"
                                        value={med.frequency || ''}
                                        onChangeText={v => updateMedication(index, 'frequency', v)}
                                        editable={!isLocked}
                                    />
                                )}

                                {Platform.OS === 'web' ? (
                                    <View style={styles.dateField}>
                                        <Text style={styles.dateLabel}>Start date (optional)</Text>
                                        {React.createElement('input', {
                                            type: 'date',
                                            value: med.startDate || '',
                                            onChange: event => updateMedication(index, 'startDate', event.target.value),
                                            disabled: isLocked,
                                            style: {
                                                width: '100%',
                                                minHeight: 48,
                                                boxSizing: 'border-box',
                                                padding: '0 12px',
                                                border: '1px solid #D1D5DB',
                                                borderRadius: 8,
                                                backgroundColor: isLocked ? '#F3F4F6' : '#FFFFFF',
                                                color: '#111827',
                                                fontSize: 16,
                                            },
                                        })}
                                    </View>
                                ) : (
                                    <View style={styles.dateField}>
                                        <Text style={styles.dateLabel}>Start date (optional)</Text>
                                        <TouchableOpacity
                                            style={[styles.dateButton, isLocked && styles.dateButtonDisabled]}
                                            disabled={isLocked}
                                            onPress={() => setStartDatePickerIndex(index)}
                                        >
                                            <Text style={[styles.dateButtonText, !med.startDate && styles.datePlaceholder]}>
                                                {formatDisplayDate(med.startDate)}
                                            </Text>
                                            <Icon name="calendar" size={18} color={colors.gray[500]} />
                                        </TouchableOpacity>
                                        {startDatePickerIndex === index && (
                                            <DateTimePicker
                                                value={med.startDate ? dateFromInput(med.startDate) : new Date()}
                                                mode="date"
                                                display="default"
                                                onChange={(_, selectedDate) => {
                                                    setStartDatePickerIndex(null);
                                                    if (selectedDate) updateMedication(index, 'startDate', formatInputDate(selectedDate));
                                                }}
                                            />
                                        )}
                                    </View>
                                )}

                                <Input
                                    placeholder="Duration value (e.g. 5)"
                                    value={String(med.durationValue || '')}
                                    onChangeText={v => updateMedication(index, 'durationValue', v.replace(/[^0-9.]/g, ''))}
                                    keyboardType="numeric"
                                    editable={!isLocked}
                                />

                                <DropdownPicker
                                    label="Duration unit"
                                    value={med.durationUnit}
                                    options={durationUnits}
                                    onSelect={v => updateMedication(index, 'durationUnit', v)}
                                    disabled={isLocked}
                                    searchable={false}
                                />
                            </View>
                        ))}

                        {!isLocked && (
                            <Button variant="outline" onPress={addMedication}>
                                + Add Medication
                            </Button>
                        )}
                    </Card>
                </View>

                {/* Notes */}
                <Card style={styles.card}>
                    <Text style={styles.section}>Notes</Text>
                    <Input
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Additional notes"
                        multiline
                        editable={!isLocked}
                    />
                </Card>

                {/* Save */}
                {!isLocked && (
                    <View style={styles.bottomBar}>
                        <Button
                            size="lg"
                            loading={saving}
                            onPress={handleSave}
                            fullWidth
                        >
                            {isEditMode ? 'Save Changes' : 'Create Prescription'}
                        </Button>
                        {saving && (
                            <Text style={styles.saveMessage}>{saveMessage}</Text>
                        )}
                    </View>
                )}

                {isLocked && (
                    <Text style={styles.lockedText}>
                        Prescription is locked after consultation completion
                    </Text>
                )}

                <View style={{ height: spacing.xl }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.white },
    container: {
        flex: 1,
        backgroundColor: colors.gray[50],
    },
    scrollContent: {
        padding: spacing.lg,
        paddingBottom: spacing['2xl'],
    },
    webScrollContent: {
        width: '100%',
        maxWidth: 1180,
        alignSelf: 'center',
    },
    formGrid: {
        width: '100%',
    },
    formGridWide: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.lg,
    },

    card: {
        flex: 1,
        marginBottom: spacing.md,
        padding: spacing.lg,
        ...shadows.sm,
    },
    primaryCard: {
        minWidth: 0,
    },

    section: {
        fontSize: typography.fontSize.base,
        fontFamily: typography.fontFamily.semiBold,
        marginBottom: spacing.sm,
    },

    medBox: {
        backgroundColor: colors.gray[100],
        padding: spacing.md,
        borderRadius: borderRadius.md,
        marginBottom: spacing.md,
    },

    medHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },

    medTitle: {
        fontSize: typography.fontSize.sm,
        fontFamily: typography.fontFamily.semiBold,
    },

    dateField: {
        marginBottom: spacing.md,
    },

    dateLabel: {
        color: colors.gray[700],
        fontSize: typography.fontSize.sm,
        marginBottom: spacing.xs,
    },

    dateButton: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        borderWidth: 1,
        borderColor: colors.gray[300],
        borderRadius: borderRadius.md,
        backgroundColor: colors.white,
    },

    dateButtonDisabled: {
        backgroundColor: colors.gray[100],
        opacity: 0.7,
    },

    dateButtonText: {
        color: colors.gray[900],
        fontSize: typography.fontSize.base,
    },

    datePlaceholder: {
        color: colors.gray[500],
    },

    bottomBar: {
        marginTop: spacing.lg,
    },

    saveMessage: {
        marginTop: spacing.sm,
        textAlign: 'center',
        color: colors.gray[600],
        fontSize: typography.fontSize.sm,
    },

    lockedText: {
        textAlign: 'center',
        color: colors.gray[500],
        marginTop: spacing.lg,
        fontSize: typography.fontSize.sm,
    },
});

export default PrescriptionFormScreen;
