/**
 * Analytics Screen
 * Doctor analytics and statistics dashboard
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Header } from '../../components/common';
import AnalyticsFilterBar from '../../components/common/AnalyticsFilterBar';
import Icon from '../../components/Icon';
import { useDoctor } from '../../contexts/DoctorContext';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';

const AnalyticsScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const chartViewportWidth = Math.min(width, 1180);
  const {
    analytics,
    analyticsFilter,
    loadAnalytics,
  } = useDoctor();

  const [showFromPicker, setShowFromPicker] = React.useState(false);
  const [showToPicker, setShowToPicker] = React.useState(false);
  const [fromDate, setFromDate] = React.useState(null);
  const [toDate, setToDate] = React.useState(null);

  const revenueData = {
    labels: analytics?.chartData?.revenue?.map(r => r.day) || [],
    datasets: [{ data: analytics?.chartData?.revenue?.map(r => r.amount) || [] }],
  };

  const appointmentsData = {
    labels: analytics?.chartData?.appointments?.map(a => a.day) || [],
    datasets: [{ data: analytics?.chartData?.appointments?.map(a => a.count) || [] }],
  };

  const chartConfig = {
    backgroundGradientFrom: colors.white,
    backgroundGradientTo: colors.white,
    color: () => colors.primary[400],
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
  };

  const StatCard = ({ icon, title, value, change, color }) => (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {change && (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon
            name={change > 0 ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={change > 0 ? colors.success[500] : colors.danger[500]}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.statChangeText}>
            {Math.abs(change)}% from last month
          </Text>
        </View>

      )}
    </Card>
  );
  const getPeriodLabel = () => {
    switch (analyticsFilter.period) {
      case 'today':
        return 'Today';
      case 'week':
        return 'Last 7 days';
      case 'month':
        return 'Last 30 days';
      case 'year':
        return 'This year';
      case 'custom':
        return fromDate && toDate
          ? `${fromDate.toDateString()} → ${toDate.toDateString()}`
          : 'Select date range';
      default:
        return '';
    }
  };

  const hasNonZeroRevenue =
    revenueData.datasets[0].data.some(v => Number(v) > 0);

  const hasNonZeroAppointments =
    appointmentsData.datasets[0].data.some(v => Number(v) > 0);

  const baseChartWidth = Math.max(240, chartViewportWidth - spacing.lg * 4);

  const isScrollablePeriod =
    analyticsFilter.period === 'month' ||
    analyticsFilter.period === 'year' ||
    analyticsFilter.period === 'custom';

  const getChartWidth = (points) => {
    if (!isScrollablePeriod) return baseChartWidth;

    // 40px per data point is a good balance
    const dynamicWidth = points * 40;

    return Math.max(dynamicWidth, baseChartWidth);
  };

  const promptForDate = (label, initialDate) => {
    if (!isWeb || typeof window === 'undefined') return null;

    const defaultValue = initialDate ? initialDate.toISOString().slice(0, 10) : '';
    const value = window.prompt(`${label} (YYYY-MM-DD)`, defaultValue);
    if (!value) return null;

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      window.alert('Please enter a valid date in YYYY-MM-DD format.');
      return null;
    }

    return parsedDate;
  };

  const openFromPicker = () => {
    if (isWeb) {
      const selectedDate = promptForDate('From date', fromDate);
      if (selectedDate) {
        setFromDate(selectedDate);
        setToDate(null);
      }
      return;
    }

    setShowFromPicker(true);
  };

  const openToPicker = () => {
    if (isWeb) {
      const selectedDate = promptForDate('To date', toDate || fromDate);
      if (selectedDate) {
        setToDate(selectedDate);
        loadAnalytics({
          period: 'custom',
          startDate: fromDate,
          endDate: selectedDate,
        });
      }
      return;
    }

    setShowToPicker(true);
  };



  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Analytics"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        variant="surface"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={isWeb && styles.webScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <AnalyticsFilterBar
          value={analyticsFilter.period}
          onChange={(period) => {
            if (period === 'custom') {
              loadAnalytics({ period: 'custom', startDate: null, endDate: null });
            } else {
              loadAnalytics({ period, startDate: null, endDate: null });
            }
          }}
        />
        {analyticsFilter.period === 'custom' && (
          <View style={{ marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <TouchableOpacity
                style={styles.dateChip}
                onPress={openFromPicker}
              >
                <Text style={styles.dateText}>
                  {fromDate ? fromDate.toDateString() : 'From date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateChip}
                onPress={openToPicker}
                disabled={!fromDate}
              >
                <Text style={styles.dateText}>
                  {toDate ? toDate.toDateString() : 'To date'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* Overview Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <View style={styles.statsGrid}>
              <StatCard
                icon="wallet"
                title="Total Revenue"
                value={`₹${analytics?.summary?.revenue ?? 0}`}
                color={colors.success[500]}
              />
              <StatCard
                icon="calendar"
                title="Appointments"
                value={analytics?.summary?.appointments ?? 0}
                color={colors.primary[500]}
              />
              <StatCard
                icon="users"
                title="Total Patients"
                value={analytics?.summary?.patients ?? 0}
                color={colors.secondary[500]}
              />
              <StatCard
                icon="star"
                title="Avg Rating"
                value={analytics?.summary?.rating ?? '0.0'}
                color={colors.warning[500]}
              />
            </View>
          </View>

          {/* Revenue Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Revenue
            </Text>

            <Card style={styles.chartCard}>
              {hasNonZeroRevenue ? (
                <>
                  <ScrollView
                    style={styles.chartScroller}
                    contentContainerStyle={styles.chartScrollerContent}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    <LineChart
                      data={revenueData}
                      width={getChartWidth(revenueData.labels.length)}
                      height={220}
                      chartConfig={chartConfig}
                      bezier
                      style={styles.chart}
                      withDots={
                        analyticsFilter.period === 'today' ||
                        analyticsFilter.period === 'week'
                      }
                      strokeWidth={2}
                      withInnerLines={false}
                      withOuterLines={false}
                      withHorizontalLines
                      withVerticalLines={false}
                      formatYLabel={(value) => {
                        const num = Number(value);
                        return Number.isFinite(num)
                          ? `₹${(num / 1000).toFixed(0)}k`
                          : '₹0';
                      }}
                    />
                  </ScrollView>
                  {isScrollablePeriod && (
                    <Text style={[styles.scrollDescription, { opacity: 0.5 }]}>
                      Swipe to view more →
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.chartDescription, { fontStyle: 'italic' }]}>
                  No revenue recorded for this period
                </Text>
              )}
              <Text style={[styles.chartDescription, { opacity: 0.7 }]}>
                Revenue • {getPeriodLabel()}
              </Text>
            </Card>
          </View>

          {/* Appointments Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Appointments
            </Text>

            <Card style={styles.chartCard}>
              {hasNonZeroAppointments ? (
                <>
                  <ScrollView
                    style={styles.chartScroller}
                    contentContainerStyle={styles.chartScrollerContent}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    <BarChart
                      data={appointmentsData}
                      width={getChartWidth(appointmentsData.labels.length)}
                      height={220}
                      chartConfig={chartConfig}
                      style={styles.chart}
                      fromZero
                      withInnerLines={false}
                      showValuesOnTopOfBars={false}
                    />
                  </ScrollView>
                  {isScrollablePeriod && (
                    <Text style={[styles.scrollDescription, { opacity: 0.5 }]}>
                      Swipe to view more →
                    </Text>
                  )}
                </>
              ) : (
                <Text style={[styles.chartDescription, { fontStyle: 'italic' }]}>
                  No appointments recorded for this period
                </Text>
              )}
              <Text style={[styles.chartDescription, { opacity: 0.7 }]}>
                Appointments • {getPeriodLabel()}
              </Text>
            </Card>
          </View>

          {/* Patient Demographics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Patient Demographics</Text>
            <Card style={styles.demographicsCard}>
              <View style={styles.demographicRow}>
                <Text style={styles.demographicLabel}>Age Groups</Text>
                <View style={styles.demographicBars}>
                  {analytics?.demographics?.ageGroups?.map((group, index) => (
                    <View key={index} style={styles.demographicBarRow}>
                      <Text style={styles.demographicAge}>{group.label}</Text>
                      <View style={styles.demographicBarContainer}>
                        <View
                          style={[
                            styles.demographicBar,
                            {
                              width: `${Math.max(group.value, 2)}%`,
                              backgroundColor: [colors.primary[400], colors.secondary[400], colors.warning[400], colors.info?.[400] || colors.primary[300]][index % 4]
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.demographicValue}>{group.value}%</Text>
                    </View>
                  ))}
                  {(!analytics?.demographics?.ageGroups || analytics.demographics.ageGroups.length === 0) && (
                    <Text style={styles.chartDescription}>No demographic data available</Text>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.demographicRow}>
                <Text style={styles.demographicLabel}>Gender Distribution</Text>
                <View style={styles.genderStats}>
                  {analytics?.demographics?.gender?.map((g, index) => (
                    <View key={index} style={styles.genderItem}>
                      <Text style={styles.genderText}>{g.label}: {g.value}%</Text>
                    </View>
                  ))}
                  {(!analytics?.demographics?.gender || analytics.demographics.gender.length === 0) && (
                    <Text style={styles.chartDescription}>No gender data available</Text>
                  )}
                </View>
              </View>
            </Card>
          </View>


          {/* Top Conditions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Conditions Treated</Text>
            <Card style={styles.conditionsCard}>
              {analytics?.topConditions?.length > 0 ? (
                analytics.topConditions.map((condition, index) => (
                  <View key={index} style={styles.conditionItem}>
                    <Text style={styles.conditionRank}>{index + 1}</Text>
                    <Text style={styles.conditionName}>{condition.name}</Text>
                    <Text style={styles.conditionCount}>{condition.count} patients</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.chartDescription}>No condition data available</Text>
              )}
            </Card>
          </View>
        </View>
        {showFromPicker && !isWeb && (
          <DateTimePicker
            value={fromDate || new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_, selectedDate) => {
              setShowFromPicker(false);
              if (selectedDate) {
                setFromDate(selectedDate);
                setToDate(null);
              }
            }}
          />
        )}

        {showToPicker && !isWeb && (
          <DateTimePicker
            value={toDate || fromDate || new Date()}
            mode="date"
            display="default"
            minimumDate={fromDate}
            maximumDate={new Date()}
            onChange={(_, selectedDate) => {
              setShowToPicker(false);
              if (selectedDate) {
                setToDate(selectedDate);
                loadAnalytics({
                  period: 'custom',
                  startDate: fromDate,
                  endDate: selectedDate,
                });
              }
            }}
          />
        )}

      </ScrollView>
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
  webScrollContent: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingBottom: spacing['2xl'],
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flexBasis: 220,
    flexGrow: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statEmoji: {
    fontSize: 24,
  },
  statChangeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.primary[400],
  },

  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    marginBottom: spacing.xs / 2,
  },
  statTitle: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    textAlign: 'center',
  },
  statChange: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.medium,
    marginTop: spacing.xs,
  },
  chartCard: {
    padding: spacing.lg,
    alignItems: 'stretch',
    gap: spacing.md,
    overflow: 'hidden',
  },
  chartScroller: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  chartScrollerContent: {
    alignItems: 'center',
  },

  chart: {
    alignSelf: 'center',
    marginVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  chartDescription: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    textAlign: 'center',
    marginTop: spacing.md,
  },
  scrollDescription: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[400],
    textAlign: 'center',
  },
  demographicsCard: {
    padding: spacing.lg,
  },
  demographicRow: {
    marginBottom: spacing.md,
  },
  demographicLabel: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  demographicBars: {
    gap: spacing.md,
  },
  demographicBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  demographicAge: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
    width: 50,
  },
  demographicBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  demographicBar: {
    height: '100%',
    borderRadius: borderRadius.sm,
  },
  demographicValue: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
    width: 40,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.md,
  },
  genderStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  genderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  genderIcon: {
    fontSize: 20,
  },
  genderText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
  },
  conditionsCard: {
    padding: spacing.lg,
  },
  conditionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  conditionRank: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary[100],
    color: colors.primary[700],
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.bold,
    textAlign: 'center',
    lineHeight: 30,
    marginRight: spacing.md,
  },
  conditionName: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[900],
  },
  conditionCount: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
  },
  dateChip: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[200],
    alignItems: 'center',
  },

  dateText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[700],
  },

});

export default AnalyticsScreen;
