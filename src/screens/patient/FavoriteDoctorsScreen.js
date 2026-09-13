/**
 * Favorite Doctors Screen
 * + Extended medical history access
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { usePatient } from '../../contexts/PatientContext';
import socketService from '../../services/socketService';
import { colors, spacing, typography } from '../../styles/theme';

import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Header,
  Loading,
} from '../../components/common';

import Icon from '../../components/Icon';

import { ACCESS_STATUS, CONSENT_TYPES } from '../../data/constants';

const FavoriteDoctorsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const {
    favorites,
    toggleFavorite,
    shareExtendedRecords,
    revokeConsent,
    getAccessStatus,
    loadFavorites,
  } = usePatient();

  const [loading, setLoading] = useState(false);
  const [accessMap, setAccessMap] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    loadAccess();
  }, [favorites]);

  useFocusEffect(
    useCallback(() => {
      loadFavorites();
    }, [])
  );

  useEffect(() => {
    const refreshAccess = () => {
      loadFavorites();
      loadAccess();
    };

    const registerListeners = () => {
      const socket = socketService.getSocket();
      if (!socket) return false;

      socket.off('consent-granted', refreshAccess);
      socket.off('consent-revoked', refreshAccess);
      socket.off('access-request-approved', refreshAccess);
      socket.off('access-request-denied', refreshAccess);
      socket.off('access-request-cancelled', refreshAccess);
      socket.off('connect', registerListeners);

      socket.on('consent-granted', refreshAccess);
      socket.on('consent-revoked', refreshAccess);
      socket.on('access-request-approved', refreshAccess);
      socket.on('access-request-denied', refreshAccess);
      socket.on('access-request-cancelled', refreshAccess);
      socket.on('connect', registerListeners);
      return true;
    };

    if (!registerListeners()) {
      const interval = setInterval(() => {
        if (registerListeners()) clearInterval(interval);
      }, 500);
      return () => clearInterval(interval);
    }

    return () => {
      const socket = socketService.getSocket();
      if (socket) {
        socket.off('consent-granted', refreshAccess);
        socket.off('consent-revoked', refreshAccess);
        socket.off('access-request-approved', refreshAccess);
        socket.off('access-request-denied', refreshAccess);
        socket.off('access-request-cancelled', refreshAccess);
        socket.off('connect', registerListeners);
      }
    };
  }, [favorites]);

  const loadAccess = async () => {
    setLoading(true);

    const map = {};
    for (const doctor of favorites) {
      map[doctor._id] = await getAccessStatus({
        doctorId: doctor._id,
        appointmentId: null,
      });
    }

    setAccessMap(map);
    setLoading(false);
  };

  const grantExtendedAccess = async (doctor) => {
    Alert.alert(
      'Share Full Medical History?',
      'This doctor will be able to view your medical history beyond individual consultations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: async () => {
            try {
              setActionLoading(`share-${doctor._id}`);
              await shareExtendedRecords(doctor._id);
              await loadAccess();
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const revokeExtendedAccess = async (doctor) => {
    Alert.alert(
      'Revoke Extended Access?',
      'The doctor will immediately lose access to your medical history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(`revoke-${doctor._id}`);
              await revokeConsent({ doctorId: doctor._id });
              await loadAccess();
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const confirmRemoveFavorite = (doctor) => {
    const access = accessMap[doctor._id];
    const hasExtendedAccess =
      access?.status === ACCESS_STATUS.GRANTED &&
      access?.type === CONSENT_TYPES.EXTENDED;

    Alert.alert(
      'Remove from Favorites?',
      hasExtendedAccess
        ? 'This will also revoke extended access to your medical history.'
        : 'This doctor will be removed from your favorites.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading(`remove-${doctor._id}`);
              if (hasExtendedAccess) {
                await revokeConsent({ doctorId: doctor._id });
              }
              await toggleFavorite(doctor._id);
              await loadAccess();
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const DoctorCard = ({ doctor }) => {
    const access = accessMap[doctor._id];
    const hasExtendedAccess =
      access?.status === ACCESS_STATUS.GRANTED &&
      access?.type === CONSENT_TYPES.EXTENDED;

    return (
      <Card style={styles.doctorCard}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('DoctorDetails', { doctorId: doctor._id })
          }
        >
          {/* HEADER */}
          <View style={styles.doctorHeader}>
            <Avatar
              source={{ uri: doctor.avatar }}
              size={60}
              name={doctor.fullName}
            />

            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName} numberOfLines={1}>
                {doctor.fullName}
              </Text>
              <Text style={styles.doctorSpecialty} numberOfLines={1}>
                {doctor.specialization}
              </Text>

              <View style={styles.ratingRow}>
                <Icon name="star" size={14} color={colors.warning[500]} />
                <Text style={styles.ratingText}>{doctor.rating}</Text>
                <Text style={styles.reviewCount}>
                  ({doctor.reviewCount})
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => confirmRemoveFavorite(doctor)}
            >
              <Icon
                name="heart-filled"
                size={28}
                color={colors.danger[500]}
              />
            </TouchableOpacity>
          </View>

          {/* DETAILS */}
          <View style={styles.doctorDetails}>
            <View style={styles.detailItem}>
              <Icon name="users" size={14} color={colors.gray[600]} />
              <Text style={styles.detailText}>
                {doctor.experience} yrs
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Icon name="wallet" size={14} color={colors.gray[600]} />
              <Text style={styles.detailText}>
                ₹{doctor.consultationFee}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Icon name="map-pin" size={14} color={colors.gray[600]} />
              <Text
                style={styles.detailText}
                numberOfLines={1}
              >
                {[doctor?.address?.clinic, doctor?.address?.city].filter(Boolean).join(', ') || 'Clinic'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* EXTENDED ACCESS */}
        <View style={styles.accessBox}>
          <View style={styles.accessRow}>
            <View style={styles.accessStatus}>
              <Icon
                name={hasExtendedAccess ? 'unlock' : 'lock'}
                size={14}
                color={
                  hasExtendedAccess
                    ? colors.success[600]
                    : colors.gray[500]
                }
              />
              <Text
                style={[
                  styles.accessText,
                  hasExtendedAccess
                    ? styles.accessGranted
                    : styles.accessDenied,
                ]}
              >
                {hasExtendedAccess
                  ? 'Full medical history shared'
                  : 'Full medical history not shared'}
              </Text>
            </View>

            {hasExtendedAccess ? (
              <Button
                size="sm"
                variant="danger"
                loading={actionLoading === `revoke-${doctor._id}`}
                disabled={!!actionLoading}
                onPress={() => revokeExtendedAccess(doctor)}
              >
                Revoke
              </Button>
            ) : (
              <Button
                size="sm"
                loading={actionLoading === `share-${doctor._id}`}
                disabled={!!actionLoading}
                onPress={() => grantExtendedAccess(doctor)}
              >
                Share
              </Button>
            )}
          </View>
        </View>

        <Button
          style={styles.bookButton}
          disabled={!!actionLoading}
          onPress={() =>
            navigation.navigate('BookAppointment', {
              doctorId: doctor._id,
            })
          }
        >
          Book Appointment
        </Button>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Favorite Doctors"
        leftIcon="back"
        onLeftPress={navigation.goBack}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={isWeb && styles.webScrollContent}
      >
        <View style={[styles.content, isTabletUp && styles.contentWide]}>
          {loading && <Loading fullScreen text="Loading..." />}

          {!loading && favorites.length === 0 ? (
            <EmptyState
              icon={<Icon name="heart-outline" size={48} color={colors.gray[400]} />}
              title="No Favorite Doctors"
              description="Add doctors to favorites to share extended medical history."
            />
          ) : (
            favorites.map((doctor) => (
              <DoctorCard key={doctor._id} doctor={doctor} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  container: { flex: 1, backgroundColor: colors.gray[50] },
  webScrollContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingBottom: spacing['2xl'],
  },
  content: { padding: spacing.lg },
  contentWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },

  doctorCard: {
    flexBasis: 360,
    flexGrow: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },

  doctorHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    alignItems: 'center',
  },

  doctorInfo: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },

  doctorName: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
  },

  doctorSpecialty: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: 2,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },

  ratingText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
  },

  reviewCount: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[600],
  },

  doctorDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minWidth: '30%',
  },

  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },

  accessBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },

  accessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  accessStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    minWidth: 0,
  },

  accessText: {
    fontSize: typography.fontSize.sm,
    flexShrink: 1,
  },

  accessGranted: { color: colors.success[600] },
  accessDenied: { color: colors.gray[500] },

  bookButton: {
    marginTop: spacing.md,
  },
});

export default FavoriteDoctorsScreen;
