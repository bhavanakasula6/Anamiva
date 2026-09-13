/**
 * Input Component
 * Reusable text input with label, icons, and error handling
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from '../Icon';
import IconButton from './IconButton';
import theme from '../../styles/theme';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  disabled = false,
  secureTextEntry = false,
  keyboardType = 'default',
  multiline = false,
  numberOfLines = 1,
  icon,               // string icon name OR ReactNode
  rightIcon,          // string icon name OR ReactNode
  onRightIconPress,
  autoCapitalize = 'none',
  autoCorrect = false,
  maxLength,
  style,
  inputStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const showError = Boolean(error);

  const renderLeftIcon = () => {
    if (!icon) return null;

    if (typeof icon === 'string') {
      return (
        <Icon
          name={icon}
          size={18}
          color={theme.colors.text.secondary}
        />
      );
    }

    return icon;
  };

  const renderRightIcon = () => {
    if (!rightIcon) return null;

    if (typeof rightIcon === 'string') {
      return (
        <IconButton
          icon={rightIcon}
          size="sm"
          onPress={onRightIconPress}
          disabled={!onRightIconPress}
        />
      );
    }

    return (
      <TouchableOpacity
        onPress={onRightIconPress}
        disabled={!onRightIconPress}
      >
        {rightIcon}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={styles.label}
          allowFontScaling={false}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          isFocused && !showError && styles.focused,
          showError && styles.error,
          disabled && styles.disabled,
        ]}
      >
        {icon && <View style={styles.iconLeft}>{renderLeftIcon()}</View>}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.muted}
          editable={!disabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[
            styles.input,
            icon && styles.inputWithIconLeft,
            rightIcon && styles.inputWithIconRight,
            multiline && styles.multiline,
            inputStyle,
          ]}
          accessibilityState={{
            disabled,
            invalid: showError,
          }}
          {...props}
        />

        {rightIcon && (
          <View style={styles.iconRight}>
            {renderRightIcon()}
          </View>
        )}
      </View>

      {showError && (
        <Text
          style={styles.errorText}
          allowFontScaling={false}
          accessibilityRole="alert"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexShrink: 1,
    flexGrow: 1,
    marginBottom: theme.spacing.md,
  },

  label: {
    fontSize: theme.typography.fontSizes.sm,
    fontFamily: theme.typography.fontFamily.medium,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: theme.borders.subtle,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface.elevated,
    paddingHorizontal: theme.spacing.sm,
  },

  focused: {
    borderColor: theme.borders.subtle,
  },

  error: {
    borderColor: theme.colors.danger[500],
  },

  disabled: {
    backgroundColor: theme.colors.gray[100],
    opacity: 0.6,
  },

  input: {
    flex: 1,
    fontSize: theme.typography.fontSizes.base,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.text.primary,
    paddingVertical: theme.spacing.sm,
    ...(Platform.OS === 'web'
      ? {
          outlineStyle: 'none',
          outlineWidth: 0,
          boxShadow: 'none',
        }
      : {}),
  },

  inputWithIconLeft: {
    marginLeft: theme.spacing.xs,
  },

  inputWithIconRight: {
    marginRight: theme.spacing.xs,
  },

  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.sm,
  },

  iconLeft: {
    marginRight: theme.spacing.xs,
  },

  iconRight: {
    marginLeft: theme.spacing.xs,
  },

  errorText: {
    fontSize: theme.typography.fontSizes.xs,
    fontFamily: theme.typography.fontFamily.regular,
    color: theme.colors.danger[500],
    marginTop: theme.spacing.xs,
  },
});

export default Input;
