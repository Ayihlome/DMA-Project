import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing, type } from '../../theme/theme'

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{heading}</Text>
      {children}
    </View>
  )
}

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Privacy notice</Text>
        <Text style={styles.intro}>
          StockMate is a stock-keeping app for small shops. This notice explains what it stores about
          you and your shop, why, and how to get rid of it. It follows South Africa&apos;s Protection of
          Personal Information Act (POPIA).
        </Text>

        <Section heading="What is stored">
          <Text style={styles.body}>
            Your name and email address, so you can sign in. Your shop&apos;s products, stock levels,
            sales, supplier prices and restock orders, because that is what the app is for. Nothing
            about your customers is collected: a sale records what was sold, never who bought it.
          </Text>
        </Section>

        <Section heading="Why it is stored">
          <Text style={styles.body}>
            To show your stock levels and sales, work out what is running low, and compare supplier
            prices. Your data is used only to run the app for you. It is never sold, and it is never
            shared with other shops or with advertisers.
          </Text>
        </Section>

        <Section heading="Where it is kept">
          <Text style={styles.body}>
            Your shop&apos;s products, stock, sales and orders are saved on this device only. The app
            never needs the network to record a sale, and that data is not copied to the cloud yet,
            so if you lose this phone that history is gone with it. Cloud backup is planned, and
            this notice will be updated before it is switched on.
          </Text>
          <Text style={styles.body}>
            Your account details and the measurements described below are stored in a Supabase
            database. Access rules there mean each account can only ever read and write its own
            rows.
          </Text>
        </Section>

        <Section heading="Measurement during the study">
          <Text style={styles.body}>
            While StockMate is being evaluated, the app records how long recording a sale takes and
            whether the stock deducted matched what the recipe expected. These measurements are tied
            to your account but contain no personal detail beyond that, and are used only to report
            on whether the app works as intended.
          </Text>
        </Section>

        <Section heading="How long it is kept">
          <Text style={styles.body}>
            For as long as you keep your account. Sign-ups that are never verified are removed
            automatically within 24 hours.
          </Text>
        </Section>

        <Section heading="Your rights">
          <Text style={styles.body}>
            You may see your data, correct it, or have it deleted. Your name and shop details can be
            edited on the Profile screen. To delete everything, use &quot;Delete my account&quot; on the
            Profile screen: it removes your account and every row belonging to it from the database,
            and erases your shop&apos;s data from this device. This cannot be undone.
          </Text>
        </Section>

        <Section heading="Consent">
          <Text style={styles.body}>
            Ticking the box when you create an account records your agreement to this notice,
            together with the date and time. You can withdraw it at any time by deleting your
            account.
          </Text>
        </Section>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { ...type.h1, color: colors.textPrimary, marginBottom: spacing.sm },
  intro: { ...type.body, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.md },
  section: { marginBottom: spacing.md, gap: spacing.xs2 },
  heading: { ...type.bodyMedium, color: colors.textPrimary, fontWeight: '700' },
  body: { ...type.body, color: colors.textSecondary, lineHeight: 22 },
})
