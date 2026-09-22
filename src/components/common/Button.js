/**
 * Button Component
 * Reusable button with variants, sizes, loading & icons
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Icon from '../Icon';
import theme from '../../styles/theme';

const SIZE_CONFIG = {
  sm: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    fontSize: theme.typography.fontSizes.sm,
    iconSize: 14,
  },
  md: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    fontSize: theme.typography.fontSizes.base,
    iconSize: 16,
  },
  lg: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    fontSize: theme.typography.fontSizes.lg,
    iconSize: 18,
  },
};

const VARIANT_CONFIG = {
  primary: {
    backgroundColor: theme.colors.primary[500],
    textColor: theme.colors.text.inverse,
    borderColor: 'transparent',
    loaderColor: theme.colors.text.inverse,
  },
  secondary: {
    backgroundColor: theme.colors.secondary[500],
    textColor: theme.colors.text.inverse,
    borderColor: 'transparent',
    loaderColor: theme.colors.text.inverse,
  },
  danger: {
    backgroundColor: theme.colors.danger[500],
    textColor: theme.colors.text.inverse,
    borderColor: 'transparent',
    loaderColor: theme.colors.text.inverse,
  },
  outline: {
    backgroundColor: 'transparent',
    textColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
    loaderColor: theme.colors.primary[500],
  },
  ghost: {
    backgroundColor: 'transparent',
    textColor: theme.colors.primary[500],
    borderColor: 'transparent',
    loaderColor: theme.colors.primary[500],
  },
};

const Button = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
  textStyle,
  ...props
}) => {
  const sizeConfig = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const variantConfig = VARIANT_CONFIG[variant] || VARIANT_CONFIG.primary;

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        {
          backgroundColor: variantConfig.backgroundColor,
          borderColor: variantConfig.borderColor,
          paddingVertical: sizeConfig.paddingVertical,
          paddingHorizontal: sizeConfig.paddingHorizontal,
          minHeight: size === 'sm' ? 40 : 44,
        },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantConfig.loaderColor}
        />
      ) : (
        <>
          {icon && (
            <Icon
              name={icon}
              size={sizeConfig.iconSize}
              color={variantConfig.textColor}
            />
          )}

          <Text
            style={[
              styles.text,
              {
                color: variantConfig.textColor,
                fontSize: sizeConfig.fontSize,
                marginLeft: icon ? theme.spacing.xs : 0,
              },
              textStyle,
            ]}
            allowFontScaling={false}
          >
            {children}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontFamily: theme.typography.fontFamily.semiBold,
    textAlign: 'center',
  },
});

export default Button;
