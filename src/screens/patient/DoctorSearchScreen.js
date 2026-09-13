/**
 * Doctor Search Screen
 * Fully Fixed Version
 */

import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../contexts/AuthContext';
import { usePatient } from '../../contexts/PatientContext';

import {
  borderRadius,
  colors,
  spacing,
  typography,
} from '../../styles/theme';

import {
  Avatar,
  Badge,
  Card,
  Header,
  Loading,
  SearchBar,
} from '../../components/common';

import Icon from '../../components/Icon';

import {
  SPECIALIZATIONS,
  MAJOR_CITIES,
} from '../../data/constants';

const DoctorSearchScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { searchDoctors } = usePatient();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;

  const patientCity =
    typeof user?.address === 'object'
      ? user?.address?.city || ''
      : '';

  const hasPatientLocation = !!(
    user?.location?.latitude &&
    user?.location?.longitude
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] =
    useState(null);

  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedCity, setSelectedCity] = useState('');
  const [showLocationFilter, setShowLocationFilter] =
    useState(false);
  const [debouncedSearch, setDebouncedSearch] =
    useState('');

  const [filters, setFilters] = useState({
    availableNow: false,
    sortBy: 'rating',
  });

  const loadDoctors = useCallback(async () => {
    setLoading(true);

    try {
      const payload = {
        ...(debouncedSearch.trim() && {
          query: debouncedSearch.trim(),
        }),

        ...(selectedSpecialization && {
          specialization: selectedSpecialization,
        }),

        ...(selectedCity && {
          city: selectedCity,
        }),

        ...(filters.availableNow && {
          availableNow: true,
        }),

        sortBy:
          filters.sortBy === 'distance' &&
            !hasPatientLocation
            ? 'rating'
            : filters.sortBy,

        // IMPORTANT FIX
        // only send coordinates for nearest sorting
        ...(filters.sortBy === 'distance' &&
          hasPatientLocation && {
          latitude: user.location.latitude,
          longitude: user.location.longitude,
          radius: 50,
        }),
      };

      const response = await searchDoctors(payload);

      setDoctors(
        response?.doctors ||
        response?.data?.doctors ||
        []
      );
    } catch (err) {
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [
    filters.availableNow,
    filters.sortBy,
    hasPatientLocation,
    searchDoctors,
    debouncedSearch,
    selectedCity,
    selectedSpecialization,
    user?.location?.latitude,
    user?.location?.longitude,
  ]);

  useEffect(() => {
    loadDoctors();
  }, [
    selectedSpecialization,
    selectedCity,
    filters,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getDoctorName = (doc) => {
    return (
      doc?.userId?.fullName ||
      doc?.userId?.name ||
      `${doc?.userId?.firstName || ''} ${doc?.userId?.lastName || ''
        }`.trim() ||
      'Doctor'
    );
  };

  const DoctorCard = ({ doctor }) => {
    const address =
      doctor?.address || doctor?.userId?.address;

    const city =
      address && typeof address === 'object'
        ? address.city
        : null;

    const clinicAddress =
      doctor?.clinicInfo?.address;

    const locationText =
      city || clinicAddress || '';

    return (
      <Card
        style={styles.doctorCard}
        onPress={() =>
          navigation.navigate('DoctorDetails', {
            doctorId: doctor._id,
          })
        }
      >
        <View style={styles.doctorCardHeader}>
          <Avatar
            source={{
              uri:
                doctor?.userId?.profilePicture ||
                doctor?.userId?.avatar ||
                undefined,
            }}
            size={64}
            name={getDoctorName(doctor)}
          />

          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>
              {getDoctorName(doctor)}
            </Text>

            <Text style={styles.doctorSpecialty}>
              {doctor?.speciality ||
                doctor?.specialization ||
                'General Physician'}
            </Text>

            {!!locationText && (
              <View style={styles.cityRow}>
                <Icon
                  name="map-pin"
                  size={12}
                  color={colors.gray[500]}
                />

                <Text style={styles.doctorCity}>
                  {locationText}
                </Text>
              </View>
            )}

            <View style={styles.ratingRow}>
              <Icon
                name="star"
                size={14}
                color={colors.warning[500]}
              />

              <Text style={styles.ratingText}>
                {doctor?.rating || 0} (
                {doctor?.reviewCount || 0})
              </Text>
            </View>
          </View>

          {doctor?.availability?.online && (
            <Badge variant="success" size="sm">
              Online
            </Badge>
          )}
        </View>

        <View style={styles.doctorDetails}>
          <View style={styles.detailItem}>
            <Icon
              name="briefcase"
              size={14}
              color={colors.gray[600]}
            />

            <Text style={styles.detailText}>
              {doctor?.experience || 0}+ yrs
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Icon
              name="wallet"
              size={14}
              color={colors.gray[600]}
            />

            <Text style={styles.detailText}>
              ₹{doctor?.consultationFee || 0}
            </Text>
          </View>

          {doctor?.distance !== undefined &&
            doctor?.distance !== null && (
              <View style={styles.detailItem}>
                <Icon
                  name="map-pin"
                  size={14}
                  color={colors.gray[600]}
                />

                <Text style={styles.detailText}>
                  {doctor.distance.toFixed(1)} km
                </Text>
              </View>
            )}
        </View>

        <TouchableOpacity
          style={styles.bookButton}
          onPress={() =>
            navigation.navigate(
              'BookAppointment',
              {
                doctorId: doctor._id,
              }
            )
          }
        >
          <Text style={styles.bookButtonText}>
            Book Appointment
          </Text>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <Header
        title="Find Doctors"
        leftIcon="back"
        onLeftPress={() =>
          navigation.goBack()
        }
      />

      <View style={styles.container}>
        {/* SEARCH */}

        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onClear={() =>
              setSearchQuery('')
            }
            placeholder="Search doctors..."
            icon={
              <Icon
                name="search"
                size={18}
                color={colors.gray[500]}
              />
            }
            onSubmitEditing={loadDoctors}
          />
        </View>

        {/* SPECIALIZATIONS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.specializationsScroll}
          contentContainerStyle={
            styles.specializationsContent
          }
        >
          <Chip
            label="All"
            active={!selectedSpecialization}
            onPress={() =>
              setSelectedSpecialization(null)
            }
          />

          {SPECIALIZATIONS.map((spec) => (
            <Chip
              key={spec}
              label={spec}
              active={
                selectedSpecialization === spec
              }
              onPress={() =>
                setSelectedSpecialization(spec)
              }
            />
          ))}
        </ScrollView>

        {/* FILTERS */}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroller}
          contentContainerStyle={
            styles.filtersRow
          }
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              filters.availableNow &&
              styles.filterChipActive,
            ]}
            onPress={() =>
              setFilters((f) => ({
                ...f,
                availableNow:
                  !f.availableNow,
              }))
            }
          >
            <Icon
              name="check"
              size={14}
              color={
                filters.availableNow
                  ? colors.success[600]
                  : colors.gray[500]
              }
            />

            <Text style={styles.filterText}>
              Available Now
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedCity &&
              styles.locationChipActive,
            ]}
            onPress={() =>
              setShowLocationFilter(
                !showLocationFilter
              )
            }
          >
            <Icon
              name="map-pin"
              size={14}
              color={
                selectedCity
                  ? colors.primary[500]
                  : colors.gray[500]
              }
            />

            <Text
              style={[
                styles.filterText,
                styles.locationFilterText,
                selectedCity && {
                  color:
                    colors.primary[600],
                },
              ]}
              numberOfLines={1}
            >
              {selectedCity ||
                'All Cities'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortChip}
            onPress={() =>
              setFilters((f) => ({
                ...f,
                sortBy:
                  f.sortBy ===
                    'rating' &&
                    hasPatientLocation
                    ? 'distance'
                    : 'rating',
              }))
            }
          >
            <Icon
              name="arrow-up"
              size={14}
              color={colors.gray[600]}
            />

            <Icon
              name="arrow-down"
              size={14}
              color={colors.gray[600]}
            />

            <Text style={styles.filterText}>
              {filters.sortBy ===
                'rating' ||
                !hasPatientLocation
                ? 'Top Rated'
                : 'Nearest'}
            </Text>
          </TouchableOpacity>

          {(searchQuery ||
            selectedSpecialization ||
            selectedCity ||
            filters.availableNow ||
            filters.sortBy !==
            'rating') && (
              <TouchableOpacity
                style={
                  styles.clearFiltersChip
                }
                onPress={() => {
                  setSearchQuery('');
                  setSelectedSpecialization(
                    null
                  );
                  setSelectedCity('');
                  setShowLocationFilter(
                    false
                  );

                  setFilters({
                    availableNow: false,
                    sortBy: 'rating',
                  });
                }}
              >
                <Icon
                  name="x"
                  size={14}
                  color={colors.danger[500]}
                />

                <Text
                  style={
                    styles.clearFiltersText
                  }
                >
                  Clear
                </Text>
              </TouchableOpacity>
            )}
        </ScrollView>

        {/* CITY FILTER */}

        {showLocationFilter && (
          <View
            style={
              styles.cityFilterContainer
            }
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.cityChipsContent
              }
            >
              <TouchableOpacity
                style={[
                  styles.cityChip,
                  !selectedCity &&
                  styles.cityChipSelected,
                ]}
                onPress={() => {
                  setSelectedCity('');
                  setShowLocationFilter(
                    false
                  );
                }}
              >
                <Text
                  style={[
                    styles.cityChipText,
                    !selectedCity &&
                    styles.cityChipTextSelected,
                  ]}
                >
                  All Cities
                </Text>
              </TouchableOpacity>

              {!!patientCity && (
                <TouchableOpacity
                  style={[
                    styles.cityChip,
                    selectedCity ===
                    patientCity &&
                    styles.cityChipSelected,
                  ]}
                  onPress={() => {
                    setSelectedCity(
                      patientCity
                    );

                    setShowLocationFilter(
                      false
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.cityChipText,
                      selectedCity ===
                      patientCity &&
                      styles.cityChipTextSelected,
                    ]}
                  >
                    {patientCity} (My City)
                  </Text>
                </TouchableOpacity>
              )}

              {MAJOR_CITIES.filter(
                (c) =>
                  c !== patientCity
              )
                .slice(0, 30)
                .map((ct) => (
                  <TouchableOpacity
                    key={ct}
                    style={[
                      styles.cityChip,
                      selectedCity === ct &&
                      styles.cityChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedCity(ct);

                      setShowLocationFilter(
                        false
                      );
                    }}
                  >
                    <Text
                      style={[
                        styles.cityChipText,
                        selectedCity === ct &&
                        styles.cityChipTextSelected,
                      ]}
                    >
                      {ct}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        )}

        {/* RESULTS */}

        {loading ? (
          <Loading text="Finding doctors..." />
        ) : (
          <FlatList
            data={doctors}
            renderItem={({ item }) => (
              <DoctorCard
                doctor={item}
              />
            )}
            keyExtractor={(item) =>
              item._id
            }
            contentContainerStyle={[styles.listContent, isWeb && styles.webListContent]}
            numColumns={isTabletUp ? 2 : 1}
            key={isTabletUp ? 'doctor-grid' : 'doctor-list'}
            columnWrapperStyle={isTabletUp && styles.listColumn}
            showsVerticalScrollIndicator={
              false
            }
            ListEmptyComponent={
              <View
                style={
                  styles.emptyContainer
                }
              >
                <Icon
                  name="search"
                  size={50}
                  color={
                    colors.gray[400]
                  }
                />

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  No doctors found
                </Text>

                <Text
                  style={
                    styles.emptySubtext
                  }
                >
                  Try adjusting filters
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const Chip = ({
  label,
  active,
  onPress,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.specializationChip,
        active &&
        styles.specializationChipActive,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.specializationText,
          active &&
          styles.specializationTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
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

  searchContainer: {
    padding: spacing.lg,
    backgroundColor: colors.white,
  },

  specializationsScroll: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
    minHeight: 100,
    maxHeight: 110,
  },

  specializationsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingRight: spacing['2xl'],
  },

  specializationChip: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',

    paddingHorizontal: spacing.lg,

    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],

    marginRight: spacing.sm,

    borderWidth: 1,
    borderColor: colors.gray[200],

    flexShrink: 0,
  },

  specializationChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },

  specializationText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[800],

    includeFontPadding: false,
    textAlignVertical: 'center',
  },

  specializationTextActive: {
    color: colors.white,
  },

  filtersScroller: {
    backgroundColor: colors.white,
    minHeight: 100,
  },

  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingRight: spacing['3xl'],
  },

  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginRight: spacing.sm,
    minHeight: 40,
    flexShrink: 0,
  },

  filterChipActive: {
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: colors.success[500],
  },

  locationChipActive: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },

  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginRight: spacing.sm,
    minHeight: 40,
    flexShrink: 0,
  },

  clearFiltersChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger[50],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginRight: spacing.lg,
    minHeight: 40,
    flexShrink: 0,
  },

  clearFiltersText: {
    color: colors.danger[600],
    fontSize: typography.fontSize.sm,
    marginLeft: 6,
  },

  filterText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    marginLeft: 6,
    fontFamily:
      typography.fontFamily.medium,
  },

  locationFilterText: {
    maxWidth: 120,
  },

  cityFilterContainer: {
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },

  cityChipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },

  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    marginRight: spacing.sm,
    flexShrink: 0,
  },

  cityChipSelected: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },

  cityChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },

  cityChipTextSelected: {
    color: colors.primary[600],
    fontFamily:
      typography.fontFamily.medium,
  },

  listContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  webListContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingBottom: spacing['2xl'],
  },
  listColumn: {
    gap: spacing.md,
  },

  doctorCard: {
    flex: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  doctorCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },

  doctorInfo: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },

  doctorName: {
    fontSize: typography.fontSize.lg,
    fontFamily:
      typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: 2,
    flexShrink: 1,
  },

  doctorSpecialty: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontFamily:
      typography.fontFamily.medium,
    marginBottom: 4,
    flexShrink: 1,
  },

  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },

  doctorCity: {
    fontSize: typography.fontSize.xs,
    color: colors.gray[500],
    marginLeft: 4,
    flex: 1,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  ratingText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    marginLeft: 4,
  },

  doctorDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    marginBottom: spacing.md,
  },

  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.lg,
    marginBottom: spacing.sm,
  },

  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
    marginLeft: 4,
  },

  bookButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  bookButtonText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontFamily:
      typography.fontFamily.semiBold,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },

  emptyText: {
    fontSize: typography.fontSize.lg,
    fontFamily:
      typography.fontFamily.semiBold,
    marginTop: spacing.md,
    color: colors.gray[800],
  },

  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
});

export default DoctorSearchScreen;
