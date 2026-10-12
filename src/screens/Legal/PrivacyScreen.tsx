import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, fonts, space } from '../../theme/tokens'

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
          StockEvo is a stock-keeping app for small shops. This notice explains what it stores about
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
            Everything is saved on this device first, so the app never needs the network to record a
            sale. When you are online, a copy of your shop&apos;s products, stock, sales and orders is
            also backed up to a Supabase database, so you can get it back if this phone is lost. The
            Profile screen tells you whether that backup has actually been made.
          </Text>
          <Text style={styles.body}>
            The backup is a copy, not a shared workspace: it is restored only onto a device signed
            in to your account, and only when that device has no shop data of its own. Access rules
            on the database mean each account can only ever read and write its own rows.
          </Text>
          <Text style={styles.body}>
            Product photos you add are the exception. They stay on the device that took them and are
            never uploaded, so they are not restored onto a new phone.
          </Text>
        </Section>

        <Section heading="Measurement during the study">
          <Text style={styles.body}>
            While StockEvo is being evaluated, the app records how long recording a sale takes and
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
            edited on the Profile screen. To delete everything, use &quot;Delete account&quot; on the
            Profile screen: it removes your account, your backup and every row belonging to it from
            the database, and erases your shop&apos;s data and photos from this device. This cannot be
            undone.
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
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: 28, paddingTop: space.lg, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink, marginBottom: space.md },
  intro: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 24, color: colors.quiet, marginBottom: space.xl },
  section: { marginBottom: space.xl, gap: space.sm },
  heading: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 23, color: colors.quiet },
})
