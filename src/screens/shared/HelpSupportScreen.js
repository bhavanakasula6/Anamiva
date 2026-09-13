/**
 * Help & Support Screen
 * FAQs and support options
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../../styles/theme';

import {
  Card,
  Header,
  Button,
} from '../../components/common';

import Icon from '../../components/Icon';

const HelpSupportScreen = ({ navigation }) => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const faqs = [
    {
      id: 1,
      question: 'How do I book an appointment?',
      answer:
        'Go to the Home screen, tap on "Find Doctors", search for a doctor, select them, and tap "Book Appointment". Choose your preferred date and time.',
    },
    {
      id: 2,
      question: 'Can I cancel or reschedule an appointment?',
      answer:
        'Yes! Go to the Appointments tab, select your appointment, and choose "Cancel" or "Reschedule" option.',
    },
    {
      id: 3,
      question: 'How do I make an emergency request?',
      answer:
        'Tap the Emergency button on the Home screen. Select the urgency level and tap "Request Emergency Care". Nearby doctors will be notified.',
    },
    {
      id: 4,
      question: 'Where can I view my medical records?',
      answer:
        'Go to the Records tab to view all your medical records, including consultation notes, prescriptions, and lab reports.',
    },
    {
      id: 5,
      question: 'How do I set medication reminders?',
      answer:
        'Go to the Medications tab, select a medication, and tap "Set Reminder" to configure when you want to be reminded.',
    },
    {
      id: 6,
      question: 'Is my data secure?',
      answer:
        'Yes. We use industry-standard encryption to protect your personal and medical information. Your data is never shared without your consent.',
    },
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const ContactItem = ({ icon, label, value }) => (
    <View style={styles.contactItem}>
      <Icon
        name={icon}
        size={20}
        color={colors.primary[500]}
        style={styles.contactIcon}
      />

      <View style={{ flex: 1 }}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text
          style={styles.contactValue}
          numberOfLines={2}
        >
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header
        title="Help & Support"
        leftIcon="back"
        onLeftPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, Platform.OS === 'web' && styles.webContent]}>
          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Get Help
            </Text>

            <View style={[styles.quickActions, isWide && styles.quickActionsWide]}>
              <TouchableOpacity style={[styles.actionCard, isWide && styles.actionCardWide]}>
                <Icon
                  name="chat"
                  size={28}
                  color={colors.primary[500]}
                />
                <Text style={styles.actionText}>
                  Chat with us
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionCard, isWide && styles.actionCardWide]}>
                <Icon
                  name="mail"
                  size={28}
                  color={colors.primary[500]}
                />
                <Text style={styles.actionText}>
                  Email Support
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.actionCard, isWide && styles.actionCardWide]}>
                <Icon
                  name="phone"
                  size={28}
                  color={colors.primary[500]}
                />
                <Text style={styles.actionText}>
                  Call Us
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* FAQs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Frequently Asked Questions
            </Text>

            {faqs.map((faq) => (
              <Card
                key={faq.id}
                style={styles.faqCard}
              >
                <TouchableOpacity
                  onPress={() => toggleFaq(faq.id)}
                  style={styles.faqHeader}
                  activeOpacity={0.7}
                >
                  <Text
                    style={styles.faqQuestion}
                    numberOfLines={
                      expandedFaq === faq.id ? 0 : 2
                    }
                  >
                    {faq.question}
                  </Text>

                  <Icon
                    name={
                      expandedFaq === faq.id
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={20}
                    color={colors.primary[500]}
                  />
                </TouchableOpacity>

                {expandedFaq === faq.id && (
                  <View style={styles.faqAnswer}>
                    <Text style={styles.faqAnswerText}>
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </Card>
            ))}
          </View>

          {/* Contact Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Contact Information
            </Text>

            <Card style={styles.contactCard}>
              <ContactItem
                icon="mail"
                label="Email"
                value="support@medapp.com"
              />

              <View style={styles.divider} />

              <ContactItem
                icon="phone"
                label="Phone"
                value="+1 (800) 123-4567"
              />

              <View style={styles.divider} />

              <ContactItem
                icon="clock"
                label="Working Hours"
                value="Mon – Fri · 9 AM – 6 PM"
              />
            </Card>
          </View>
        </View>
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

  content: {
    padding: spacing.lg,
  },

  webContent: {
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
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

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },

  quickActionsWide: {
    flexWrap: 'nowrap',
  },

  actionCard: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 120,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.gray[200],
    ...shadows.sm,
  },

  actionCardWide: {
    minWidth: 0,
  },

  actionText: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[700],
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  faqCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
    ...shadows.sm,
  },

  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
  },

  faqQuestion: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.fontSize.base,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.gray[900],
    marginRight: spacing.md,
  },

  faqAnswer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },

  faqAnswerText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray[600],
    marginTop: spacing.md,
  },

  contactCard: {
    padding: spacing.lg,
  },

  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    minWidth: 0,
  },

  contactIcon: {
    marginRight: spacing.md,
  },

  contactLabel: {
    fontSize: typography.fontSize.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.gray[600],
  },

  contactValue: {
    fontSize: typography.fontSize.base,
    color: colors.gray[900],
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: colors.gray[200],
    marginVertical: spacing.sm,
  },
});

export default HelpSupportScreen;
