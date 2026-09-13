/**
 * Book Appointment Screen
 * Select date, time slot, and book appointment
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { usePatient } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';

import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../../styles/theme';

import {
  Button,
  Card,
  Input,
  Loading,
  Header,
} from '../../components/common';

import Icon from '../../components/Icon';
import { APPOINTMENT_TYPES } from '../../data/constants';

const BookAppointmentScreen = ({ route, navigation }) => {
  const { doctorId = '' } = route.params || {};
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const { user } = useAuth();
  const { getDoctorDetails, getDoctorAvailability, bookAppointment } =
    usePatient();

  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [appointmentType, setAppointmentType] = useState(
    APPOINTMENT_TYPES.IN_PERSON
  );
  const [symptoms, setSymptoms] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [dates, setDates] = useState([]);

  useEffect(() => {
    loadDoctor();
    generateDates();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadAvailability();
    }
  }, [selectedDate]);

  // Auto-refresh slots every 30 seconds
  const refreshIntervalRef = useRef(null);
  useFocusEffect(
    useCallback(() => {
      if (selectedDate) loadAvailability();
      refreshIntervalRef.current = setInterval(() => {
        if (selectedDate) loadAvailability();
      }, 30000);
      return () => clearInterval(refreshIntervalRef.current);
    }, [selectedDate])
  );

  const generateDates = () => {
    const next = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      next.push(d);
    }
    setDates(next);
    setSelectedDate(next[0]);
  };

  const loadDoctor = async () => {
    const res = await getDoctorDetails(doctorId);
    if (res.success) {
      const doc = res.doctor;
      const doctorUser = doc?.userId || {};
      setDoctor({
        ...doc,
        fullName: doctorUser.fullName || doctorUser.name || doc?.fullName || 'Doctor',
        specialization: doc?.speciality || doc?.specialization || 'General Physician',
        consultationFee: doc?.consultationFee || 0,
        consultingHours: doc?.consultingHours,
      });
    }
    setLoading(false);
  };

  const loadAvailability = async () => {
    const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
    const res = await getDoctorAvailability(doctorId, dateStr);
    if (res.success) {
      setAvailableSlots(res.slots);
      if (selectedTime && !res.slots.some(slot => slot.time === selectedTime && slot.available)) {
        setSelectedTime(null);
      }
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please select date and time');
      return;
    }

    setBooking(true);

    const res = await bookAppointment({
      doctorId,
      patientId: user.id,
      date: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
      time: selectedTime,
      type: appointmentType,
      symptoms,
    });

    setBooking(false);

    if (res.success) {
      Alert.alert('Success', 'Appointment booked successfully', [
        { text: 'OK', onPress: () => navigation.navigate('Appointments') },
      ]);
    } else {
      Alert.alert('Error', res.message || 'Failed to book appointment');
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Book Appointment"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={isWeb && styles.webScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Info */}
        <Card style={styles.doctorCard}>
          <Text style={styles.doctorName}>{doctor?.fullName}</Text>
          <Text style={styles.doctorSpecialty}>
            {doctor?.specialization}
          </Text>

          <View style={styles.feeRow}>
            <Icon name="wallet" size={14} color={colors.primary[500]} />
            <Text style={styles.consultationFee}>
              ₹{doctor?.consultationFee}
            </Text>
          </View>
        </Card>

        {/* Appointment Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Type</Text>

          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeButton,
                appointmentType === APPOINTMENT_TYPES.IN_PERSON &&
                  styles.typeButtonActive,
              ]}
              onPress={() =>
                setAppointmentType(APPOINTMENT_TYPES.IN_PERSON)
              }
            >
              <Icon
                name="home"
                size={28}
                color={
                  appointmentType === APPOINTMENT_TYPES.IN_PERSON
                    ? colors.primary[500]
                    : colors.gray[600]
                }
              />
              <Text
                style={[
                  styles.typeText,
                  appointmentType === APPOINTMENT_TYPES.IN_PERSON &&
                    styles.typeTextActive,
                ]}
              >
                In-Person
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                appointmentType === APPOINTMENT_TYPES.ONLINE &&
                  styles.typeButtonActive,
              ]}
              onPress={() =>
                setAppointmentType(APPOINTMENT_TYPES.ONLINE)
              }
            >
              <Icon
                name="video"
                size={28}
                color={
                  appointmentType === APPOINTMENT_TYPES.ONLINE
                    ? colors.primary[500]
                    : colors.gray[600]
                }
              />
              <Text
                style={[
                  styles.typeText,
                  appointmentType === APPOINTMENT_TYPES.ONLINE &&
                    styles.typeTextActive,
                ]}
              >
                Online
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Select Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {dates.map((date, idx) => {
              const isSelected =
                selectedDate?.toDateString() ===
                date.toDateString();

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dateCard,
                    isSelected && styles.dateCardActive,
                  ]}
                  onPress={() => setSelectedDate(date)}
                >
                  <Text
                    style={[
                      styles.dateDay,
                      isSelected && styles.dateTextActive,
                    ]}
                  >
                    {date.toLocaleDateString('en-US', {
                      weekday: 'short',
                    })}
                  </Text>
                  <Text
                    style={[
                      styles.dateNumber,
                      isSelected && styles.dateTextActive,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  <Text
                    style={[
                      styles.dateMonth,
                      isSelected && styles.dateTextActive,
                    ]}
                  >
                    {date.toLocaleDateString('en-US', {
                      month: 'short',
                    })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Select Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time Slot</Text>

          <View style={styles.timeGrid}>
            {(() => {
              const now = new Date();
              const isToday = selectedDate?.toDateString() === now.toDateString();
              const displaySlots = availableSlots.filter(s => {
                if (!isToday) return true;
                // Client-side: hide past time slots for today
                const [h, m] = s.time.split(':').map(Number);
                const slotTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
                return slotTime > now;
              });
              return displaySlots.length ? (
              displaySlots.map((slot, idx) => {
                const isSelected = selectedTime === slot.time;

                return (
                  <TouchableOpacity
                    key={idx}
                    disabled={!slot.available}
                    onPress={() =>
                      slot.available &&
                      setSelectedTime(slot.time)
                    }
                    style={[
                      styles.timeSlot,
                      isSelected && styles.timeSlotActive,
                      !slot.available &&
                        styles.timeSlotDisabled,
                    ]}
                  >
                    <Icon
                      name="clock"
                      size={14}
                      color={
                        isSelected
                          ? colors.white
                          : slot.available
                          ? colors.gray[600]
                          : colors.gray[400]
                      }
                    />
                    <Text
                      style={[
                        styles.timeText,
                        isSelected && styles.timeTextActive,
                      ]}
                    >
                      {slot.time}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.noSlots}>
                No slots available for this date
              </Text>
            );
            })()}
          </View>
        </View>

        {/* Symptoms */}
        <View style={styles.section}>
          <Input
            label="Describe your symptoms (optional)"
            value={symptoms}
            onChangeText={setSymptoms}
            placeholder="Describe your health concern"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <View style={isWeb && styles.bottomActionInner}>
        <View style={styles.priceRow}>
          <Text style={styles.priceLabel}>Total Amount</Text>
          <Text style={styles.priceValue}>
            ₹{doctor?.consultationFee}
          </Text>
        </View>

        <Button
          size="lg"
          fullWidth
          loading={booking}
          disabled={!selectedDate || !selectedTime}
          onPress={handleBookAppointment}
        >
          Confirm Booking
        </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.gray[50] },
  webScrollContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingBottom: 140,
  },

  doctorCard: {
    margin: spacing.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },

  doctorName: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
  },

  doctorSpecialty: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: 4,
  },

  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  consultationFee: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[500],
  },

  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },

  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.md,
  },

  typeRow: { flexDirection: 'row', gap: spacing.md },

  typeButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    alignItems: 'center',
    backgroundColor: colors.white,
  },

  typeButtonActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },

  typeText: {
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },

  typeTextActive: {
    color: colors.primary[500],
  },

  dateCard: {
    alignItems: 'center',
    padding: spacing.md,
    marginRight: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.gray[200],
    backgroundColor: colors.white,
    minWidth: 72,
  },

  dateCardActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },

  dateDay: { fontSize: 12, color: colors.gray[600] },
  dateNumber: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
  },
  dateMonth: { fontSize: 12, color: colors.gray[600] },

  dateTextActive: { color: colors.white },

  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.gray[300],
    backgroundColor: colors.white,
  },

  timeSlotActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },

  timeSlotDisabled: {
    backgroundColor: colors.gray[100],
  },

  timeText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },

  timeTextActive: {
    color: colors.white,
  },

  noSlots: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },

  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.xl,
  },
  bottomActionInner: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  priceLabel: {
    fontSize: typography.fontSize.base,
    color: colors.gray[700],
  },

  priceValue: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[500],
  },
});

export default BookAppointmentScreen;
