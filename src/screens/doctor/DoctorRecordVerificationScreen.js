/**
 * Doctor Record Verification Screen
 * Review & verify patient-uploaded records
 */

import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDoctor } from '../../contexts/DoctorContext';
import socketService from '../../services/socketService';

import {
  Card,
  Badge,
  EmptyState,
  Loading,
  Header,
} from '../../components/common';

import Icon from '../../components/Icon';
import { colors, spacing, typography, shadows } from '../../styles/theme';

const DoctorRecordVerificationScreen = ({ navigation }) => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isTabletUp = width >= 768;
  const {
    pendingRecords,
    loadPendingRecords,
  } = useDoctor();

  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      (async () => {
      setLoading(true);
      await loadPendingRecords();
        if (active) setLoading(false);
      })();

      return () => {
        active = false;
      };
    }, [])
  );

  React.useEffect(() => {
    const refreshPendingRecords = () => {
      loadPendingRecords();
    };

    const registerListeners = () => {
      const socket = socketService.getSocket();
      if (!socket) return false;

      socket.off('medical-record-created', refreshPendingRecords);
      socket.off('medical-record-updated', refreshPendingRecords);
      socket.off('connect', registerListeners);

      socket.on('medical-record-created', refreshPendingRecords);
      socket.on('medical-record-updated', refreshPendingRecords);
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
        socket.off('medical-record-created', refreshPendingRecords);
        socket.off('medical-record-updated', refreshPendingRecords);
        socket.off('connect', registerListeners);
      }
    };
  }, [loadPendingRecords]);

  const renderItem = ({ item }) => (
    <Card
      style={styles.card}
      onPress={() =>
        navigation.navigate('RecordDetails', {
            record: item,
            mode: 'DOCTOR_VERIFY',
        })
      }
    >
      <View style={styles.row}>
        <Icon name="file-text" size={20} color={colors.primary[500]} />

        <View style={styles.info}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.sub}>
            Uploaded on {new Date(item.createdAt).toDateString()}
          </Text>
        </View>

        <Badge variant="warning" size="sm">
          Pending
        </Badge>
      </View>
    </Card>
  );

  if (loading) {
    return <Loading fullScreen text="Loading pending records..." />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="Pending Records"
        leftIcon="back"
        onLeftPress={navigation.goBack}
      />

      <FlatList
        data={pendingRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, isWeb && styles.webList]}
        numColumns={isTabletUp ? 2 : 1}
        key={isTabletUp ? 'verify-grid' : 'verify-list'}
        columnWrapperStyle={isTabletUp && styles.listColumn}
        ListEmptyComponent={
          <EmptyState
            icon={<Icon name="check-circle" size={48} color={colors.gray[400]} />}
            title="No Pending Records"
            description="All uploaded records have been reviewed"
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.white },
  list: { padding: spacing.lg },
  webList: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
    paddingBottom: spacing['2xl'],
  },
  listColumn: { gap: spacing.md },
  card: { flex: 1, marginBottom: spacing.md, padding: spacing.lg, ...shadows.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  info: { flex: 1, minWidth: 0 },
  title: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
  },
  sub: { fontSize: typography.fontSize.sm, color: colors.gray[600] },
});

export default DoctorRecordVerificationScreen;
