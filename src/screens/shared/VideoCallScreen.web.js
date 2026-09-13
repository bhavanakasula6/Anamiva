import React from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from '../../components/Icon';
import { Button, Header } from '../../components/common';
import { borderRadius, colors, shadows, spacing, typography } from '../../styles/theme';

const VideoCallScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Header
        title="Video Call"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
        variant="surface"
      />
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Icon name="video" size={42} color={colors.primary[500]} />
          </View>
          <Text style={styles.title}>Video Calls Coming To Web</Text>
          <Text style={styles.text}>
            The website shell is ready, but video calling needs a browser WebRTC flow.
          </Text>
          <Button onPress={() => navigation.goBack()}>Go Back</Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.gray[50],
  },
  card: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },
  iconBox: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
    textAlign: 'center',
  },
  text: {
    maxWidth: 420,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
});

export default VideoCallScreen;
