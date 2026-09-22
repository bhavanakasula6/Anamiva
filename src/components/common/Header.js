/**
 * Header Component
 * Reusable app header with title, subtitle, and optional actions
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IconButton from './IconButton';
import theme from '../../styles/theme';

const VARIANT_CONFIG = {
  surface: {
    backgroundColor: theme.colors.surface.elevated,
    titleColor: theme.colors.text.primary,
    subtitleColor: theme.colors.text.secondary,
    divider: true,
  },
  solid: {
    backgroundColor: theme.colors.primary[500],
    titleColor: theme.colors.text.inverse,
    subtitleColor: theme.colors.primary[50],
    divider: false,
  },
};

const Header = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  leftIconProps = {},
  rightIconProps = {},
  variant = 'surface',
  style,
}) => {
  const insets = useSafeAreaInsets();
  const variantConfig = VARIANT_CONFIG[variant] || VARIANT_CONFIG.surface;

  const topPadding =
    Platform.OS === 'ios'
      ? insets.top + theme.spacing.sm
      : theme.spacing.sm;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPadding,
          backgroundColor: variantConfig.backgroundColor,
        },
        variantConfig.divider && styles.divider,
        style,
      ]}
      accessibilityRole="header"
    >
      {/* Left */}
      <View style={styles.side}>
        {leftIcon && (
          <IconButton
            icon={leftIcon}
            onPress={onLeftPress}
            {...leftIconProps}
          />
        )}
      </View>

      {/* Center */}
      <View style={styles.center}>
        <Text
          style={[
            styles.title,
            { color: variantConfig.titleColor },
          ]}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              { color: variantConfig.subtitleColor },
            ]}
            numberOfLines={1}
            allowFontScaling={false}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right */}
      <View style={styles.side}>
        {rightIcon && (
          <IconButton
            icon={rightIcon}
            onPress={onRightPress}
            {...rightIconProps}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },

  divider: {
    borderBottomWidth: 1,
    borderBottomColor: theme.borders.subtle,
  },

  side: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: theme.typography.fontSizes.lg,
    fontFamily: theme.typography.fontFamily.semiBold,
    maxWidth: '100%',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: theme.typography.fontSizes.sm,
    marginTop: theme.spacing.xs / 2,
  },
});

export default Header;
