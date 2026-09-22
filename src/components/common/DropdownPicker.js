/**
 * DropdownPicker - A modal-based dropdown selector
 * Shows a searchable list of options in a bottom sheet
 */

import React, { useState, useMemo } from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../styles/theme';
import Icon from '../Icon';

const DropdownPicker = ({
  label,
  placeholder = 'Select...',
  value,
  options = [],
  onSelect,
  error,
  disabled = false,
  searchable = true,
}) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(q));
  }, [options, search]);

  const handleSelect = (item) => {
    onSelect(item);
    setVisible(false);
    setSearch('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[
          styles.selector,
          error && styles.selectorError,
          disabled && styles.selectorDisabled,
        ]}
        onPress={() => !disabled && setVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.selectorText,
            !value && styles.placeholderText,
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Icon name="chevron-down" size={18} color={colors.gray[400]} />
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.bottomSheet}>
                {/* Header */}
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>{label || 'Select'}</Text>
                  <TouchableOpacity
                    onPress={() => setVisible(false)}
                    style={styles.closeButton}
                    accessibilityRole="button"
                    accessibilityLabel="Close selector"
                  >
                    <Icon name="x" size={22} color={colors.gray[600]} />
                  </TouchableOpacity>
                </View>

                {/* Search */}
                {searchable && options.length > 5 && (
                  <View style={styles.searchContainer}>
                    <Icon name="search" size={16} color={colors.gray[400]} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search..."
                      value={search}
                      onChangeText={setSearch}
                      autoFocus={false}
                      placeholderTextColor={colors.gray[400]}
                    />
                    {search ? (
                      <TouchableOpacity
                        onPress={() => setSearch('')}
                        style={styles.clearSearchButton}
                        accessibilityRole="button"
                        accessibilityLabel="Clear search"
                      >
                        <Icon name="x" size={16} color={colors.gray[400]} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                {/* Options */}
                <FlatList
                  data={filteredOptions}
                  keyExtractor={(item) => item}
                  style={styles.optionsList}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                  renderItem={({ item }) => {
                    const isSelected = item === value;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.optionItem,
                          isSelected && styles.optionItemSelected,
                        ]}
                        onPress={() => handleSelect(item)}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                        {isSelected && (
                          <Icon name="check" size={18} color={colors.primary[500]} />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No options found</Text>
                    </View>
                  }
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
    marginBottom: spacing.sm,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  selectorError: {
    borderColor: colors.danger[500],
  },
  selectorDisabled: {
    backgroundColor: colors.gray[100],
    opacity: 0.7,
  },
  selectorText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[900],
  },
  placeholderText: {
    color: colors.gray[400],
  },
  errorText: {
    fontSize: typography.fontSize.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.danger[500],
    marginTop: spacing.xs,
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  sheetTitle: {
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.bold,
    color: colors.gray[900],
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.gray[900],
    paddingVertical: 0,
  },
  clearSearchButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  optionsList: {
    paddingHorizontal: spacing.md,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
    borderRadius: 8,
  },
  optionItemSelected: {
    backgroundColor: colors.primary[50],
  },
  optionText: {
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.regular,
    color: colors.gray[900],
  },
  optionTextSelected: {
    fontFamily: typography.fontFamily.semiBold,
    color: colors.primary[600],
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[500],
  },
});

export default DropdownPicker;
