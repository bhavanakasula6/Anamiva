/**
 * Doctor Details Screen
 * Detailed view of doctor profile with modern UI
 */

import { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePatient } from '../../contexts/PatientContext';
import {
  borderRadius,
  colors,
  shadows,
  spacing,
  typography,
} from '../../styles/theme';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Header,
  Loading
} from '../../components/common';

import Icon from '../../components/Icon';

const DoctorDetailsScreen = ({ route, navigation }) => {
  const { doctorId = '' } = route.params || {};
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const { favorites, getDoctorDetails, toggleFavorite } = usePatient();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  const isFavorite = !!favorites?.find(d => (d._id || d.id) === doctorId);

  useEffect(() => {
    loadDoctorDetails();
  }, []);

  const loadDoctorDetails = async () => {
    setLoading(true);
    const response = await getDoctorDetails(doctorId);
    if (response?.success) {
      setDoctor(response.doctor);
    }
    setLoading(false);
  };

  const handleToggleFavorite = async () => {
    const res = await toggleFavorite(doctorId);
    if (!res?.success) {
      alert('Failed to update favorite status');
    }
  };

  if (loading) {
    return <Loading fullScreen />;
  }

  if (!doctor) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={{ padding: spacing.lg }}>Doctor not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Doctor Profile"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        rightIcon={isFavorite ? 'heart-filled' : 'heart-outline'}
        onRightPress={handleToggleFavorite}
        rightIconProps={{
          size: 60,
          color: isFavorite ? colors.danger[500] : colors.gray[400],
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={isWeb && styles.webScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Avatar
            source={{ uri: doctor.userId?.profilePicture || doctor.avatar }}
            size={110}
            name={doctor.fullName}
          />

          {(doctor.availability?.online || doctor.availability?.isOnline) && (
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
            </View>
          )}
        </View>

        {/* Doctor Info */}
        <View style={styles.infoSection}>
          <Text style={styles.doctorName}>
            {doctor.fullName || 'Doctor'}
          </Text>
          <Text style={styles.specialization}>
            {doctor.specialization || doctor.speciality}
          </Text>

          <View style={styles.ratingRow}>
            <Icon name="star" size={16} color={colors.warning[500]} />
            <Text style={styles.ratingValue}>{doctor.rating || 0}</Text>
            <Text style={styles.ratingLabel}>
              ({doctor.reviewCount || 0} reviews)
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {doctor.experience}+
              </Text>
              <Text style={styles.statLabel}>Years Exp</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {doctor.totalPatients || 0}
              </Text>
              <Text style={styles.statLabel}>Patients</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                ₹{doctor.consultationFee}
              </Text>
              <Text style={styles.statLabel}>Fee</Text>
            </View>
          </View>
        </View>

        {/* About */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>
            {doctor.bio ||
              `Experienced ${doctor.speciality || doctor.specialization || 'specialist'} with ${doctor.experience || 0} years of practice.`}
          </Text>
        </Card>

        {/* Qualifications */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Qualifications</Text>

          <View style={styles.row}>
            <Icon name="award" size={16} color={colors.primary[500]} />
            <Text style={styles.rowText}>
              {doctor.degree || doctor.qualifications || '-'}
            </Text>
          </View>

          <View style={styles.row}>
            <Icon name="file-text" size={16} color={colors.primary[500]} />
            <Text style={styles.rowText}>
              Reg. No: {doctor.registrationNo || doctor.registrationNumber || '-'}
            </Text>
          </View>
        </Card>

        {/* Clinic Address */}
        {(doctor.clinicInfo || doctor.userId?.address) && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Clinic Address</Text>

            <View style={styles.row}>
              <Icon name="map-pin" size={16} color={colors.primary[500]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.clinicName}>
                  {doctor.clinicInfo?.name || doctor.userId?.address?.clinic || 'Clinic'}
                </Text>
                <Text style={styles.addressText}>
                  {[
                    doctor.clinicInfo?.address || doctor.address?.street || doctor.userId?.address?.street,
                    doctor.address?.city || doctor.userId?.address?.city
                  ].filter(Boolean).join(', ') || '-'}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Languages */}
        {doctor.languages && doctor.languages.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Languages</Text>

            <View style={styles.languagesRow}>
              {doctor.languages.map((lang, idx) => (
                <Badge
                  key={idx}
                  variant="gray"
                  size="sm"
                  style={styles.languageBadge}
                >
                  {lang}
                </Badge>
              ))}
            </View>
          </Card>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <View style={isWeb && styles.bottomActionInner}>
          <Button
            fullWidth
            size="lg"
            onPress={() =>
              navigation.navigate('BookAppointment', {
                doctorId: doctor._id || doctor.id,
              })
            }
          >
            Book Appointment
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
    paddingBottom: 120,
  },

  avatarSection: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },

  onlineBadge: {
    position: 'absolute',
    bottom: 6,
    right: '40%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 3,
  },

  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success[500],
  },

  infoSection: {
    alignItems: 'center',
    padding: spacing.xl,
  },

  doctorName: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
  },

  specialization: {
    fontSize: typography.fontSize.base,
    color: colors.primary[500],
    marginTop: spacing.xs,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
  },

  ratingValue: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
  },

  ratingLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },

  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },

  statItem: { flex: 1, alignItems: 'center' },

  statValue: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary[500],
  },

  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
    marginTop: 2,
  },

  statDivider: {
    width: 1,
    backgroundColor: colors.gray[200],
    marginHorizontal: spacing.md,
  },

  section: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    padding: spacing.lg,
  },

  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    marginBottom: spacing.md,
  },

  bioText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  rowText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },

  clinicName: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
  },

  addressText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
  },

  languagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  languageBadge: {
    marginRight: 0,
  },

  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.xl,
  },
  bottomActionInner: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
});

export default DoctorDetailsScreen;
