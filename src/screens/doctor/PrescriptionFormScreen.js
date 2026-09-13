/**
 * Prescription Form Screen
 * Doctor-only
 * - Creates prescription if none exists
 * - Edits prescription if already created
 * - Locked after appointment completion
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Platform,
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
        refreshData,
    } = useDoctor();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [prescriptionId, setPrescriptionId] = useState(null);
    const [recordDate, setRecordDate] = useState(new Date().toISOString().slice(0, 10));
    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    const [medications, setMedications] = useState([
        { name: '', dosage: '', frequency: '', duration: '' },
    ]);

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
                        ? res.prescription.medications
                        : [{ name: '', dosage: '', frequency: '', duration: '' }]
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
            { name: '', dosage: '', frequency: '', duration: '' },
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

        setSaving(true);

        let res;

        if (isEditMode) {
            // ✅ UPDATE
            res = await updatePrescription(prescriptionId, {
                recordDate,
                diagnosis,
                notes,
                medications: validMeds,
            });
        } else {
            // ✅ CREATE
            res = await createPrescription(appointmentId, {
                recordDate,
                diagnosis,
                notes,
                medications: validMeds,
            });
        }

        setSaving(false);

        if (!res?.success) {
            Alert.alert('Error', 'Failed to save prescription');
            return;
        }

        await refreshData();

        navigation.navigate('AppointmentDetails', {
            appointmentId,
            refresh: Date.now(),
        });
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

                                <Input
                                    placeholder="Frequency (e.g. Twice daily)"
                                    value={med.frequency}
                                    onChangeText={v => updateMedication(index, 'frequency', v)}
                                    editable={!isLocked}
                                />

                                <Input
                                    placeholder="Duration (e.g. 5 days)"
                                    value={med.duration}
                                    onChangeText={v => updateMedication(index, 'duration', v)}
                                    editable={!isLocked}
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

    bottomBar: {
        marginTop: spacing.lg,
    },

    lockedText: {
        textAlign: 'center',
        color: colors.gray[500],
        marginTop: spacing.lg,
        fontSize: typography.fontSize.sm,
    },
});

export default PrescriptionFormScreen;
