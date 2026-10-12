import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import MaterialIcon from '../../components/common/MaterialIcon'
import Checkbox from '../../components/ui/Checkbox'
import FilledInput from '../../components/ui/FilledInput'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useAuth } from '../../providers/AuthProvider'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store'
import { track, trackOnboarding } from '../../lib/telemetry'
import { KOTA_BUILDS, PACKS, buildStarterCatalogue, type PackKey } from '../../data/starterPacks'
import AuthShell, { AuthHeading, HEADER_COMPACT } from '../Auth/AuthShell'
import StockCountList, { type Counts } from './StockCountList'
import { colors, money, radius, space, type } from '../../theme/tokens'

/**
 * What the owner answers once, after verifying their email, before the app has
 * anything in it.
 *
 * Only two questions are asked, and both of them do work: what the shop sells
 * picks the starter catalogues, and which kotas it makes builds the composite
 * products and their recipes. Nothing is asked that the app would not act on —
 * a question that only fills a database column is a question that should not
 * be on this screen.
 *
 * Skipping is always available and leaves the demo catalogue in place, which
 * is how the app is still demonstrable.
 */

/** Two of the six are ticked up front: they are what almost every stand makes. */
const DEFAULT_KOTAS = ['kota-special', 'kota-chips']

export default function OnboardingScreen() {
  const { session } = useAuth()
  const { finishOnboarding, skipOnboarding } = useStore()

  const [packs, setPacks] = useState<PackKey[]>([])
  const [kotas, setKotas] = useState<string[]>(DEFAULT_KOTAS)
  const [ownerName, setOwnerName] = useState('')
  const [shopName, setShopName] = useState('')
  /**
   * Whether to show the shop-name field, decided once when the profile comes
   * back. It cannot be `!shopName`: that would unmount the field on the first
   * keystroke, taking the keyboard and the half-typed name with it.
   */
  const [askShopName, setAskShopName] = useState(false)
  const [counts, setCounts] = useState<Counts>({})
  const [step, setStep] = useState(0)
  // Set once, on mount, so the completed event can report how long setup took
  const [startedAt] = useState(() => Date.now())

  const userId = session?.user?.id

  useEffect(() => {
    track('onboarding_started')
  }, [])

  // The names were given at sign-up and live on the profile row. Pulling them
  // here is what connects the account to the shop the app then shows.
  useEffect(() => {
    if (!userId) return
    let alive = true
    supabase
      .from('profiles')
      .select('display_name, shop_name')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return
        if (data.display_name) setOwnerName(data.display_name)
        if (data.shop_name) setShopName(data.shop_name)
        // Accounts made before the Create account screen asked for it
        else setAskShopName(true)
      })
    return () => {
      alive = false
    }
  }, [userId])

  const wantsKotas = packs.includes('kotas')
  // The kota question only exists if they said they make kotas
  const flow = useMemo<('packs' | 'kotas' | 'count' | 'confirm')[]>(
    () => (wantsKotas ? ['packs', 'kotas', 'count', 'confirm'] : ['packs', 'count', 'confirm']),
    [wantsKotas],
  )
  // Unticking kotas on the way back can shorten the flow underneath us
  const current = flow[Math.min(step, flow.length - 1)]

  const selection = { packs, kotas }
  const catalogue = useMemo(() => buildStarterCatalogue(selection), [packs, kotas]) // eslint-disable-line react-hooks/exhaustive-deps
  const sellable = catalogue.filter((p) => p.sellable).length
  const ingredients = catalogue.length - sellable
  // A kota has no count of its own; its stock comes out of its ingredients
  const countable = useMemo(() => catalogue.filter((p) => !p.composite), [catalogue])
  const counted = Object.values(counts).some((n) => n > 0)

  const togglePack = (key: PackKey) =>
    setPacks((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const toggleKota = (id: string) =>
    setKotas((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]))

  /** The shop name can be edited here, so it has to go back to the profile row too. */
  function saveNames() {
    const trimmed = shopName.trim()
    if (userId && trimmed) {
      void supabase.from('profiles').update({ shop_name: trimmed }).eq('id', userId)
    }
    return { ownerName: ownerName.trim() || 'Owner', storeName: trimmed || 'My shop' }
  }

  function finish() {
    trackOnboarding('onboarding_completed', startedAt, {
      packs,
      kotas,
      product_count: catalogue.length,
      counted,
    })
    finishOnboarding(selection, saveNames(), counts)
  }

  function skip() {
    trackOnboarding('onboarding_skipped', startedAt, { packs, step: current })
    skipOnboarding(saveNames())
  }

  /** Straight past the count with nothing entered; the Dashboard asks again. */
  function countLater() {
    setCounts({})
    setStep((s) => s + 1)
  }

  const canContinue = current === 'packs' ? packs.length > 0 : current === 'kotas' ? kotas.length > 0 : true

  return (
    <AuthShell
      headerHeight={HEADER_COMPACT}
      footer={
        <View style={styles.footer}>
          <StepDots count={flow.length} active={flow.indexOf(current)} />
          {current === 'confirm' ? (
            <PrimaryButton
              label={`Set up my shop · ${catalogue.length} products`}
              onPress={finish}
              // Unticking everything on the way back can empty the selection,
              // and an empty catalogue is a shop with nothing to sell
              disabled={catalogue.length === 0}
            />
          ) : (
            <PrimaryButton label="Continue" onPress={() => setStep((s) => s + 1)} disabled={!canContinue} />
          )}
          <View style={styles.footerLinks}>
            {step > 0 ? (
              <PressableScale onPress={() => setStep((s) => Math.max(0, s - 1))} accessibilityLabel="Go back a step">
                <Text style={styles.link}>Back</Text>
              </PressableScale>
            ) : (
              <View />
            )}
            {current === 'count' ? (
              <PressableScale onPress={countLater} accessibilityLabel="Count stock later">
                <Text style={styles.link}>Count later</Text>
              </PressableScale>
            ) : (
              <PressableScale onPress={skip} accessibilityLabel="Explore with sample data instead">
                <Text style={styles.link}>Explore with sample data</Text>
              </PressableScale>
            )}
          </View>
        </View>
      }
    >
      {current === 'packs' && (
        <>
          <AuthHeading
            title={shopName ? `Set up ${shopName}` : 'Set up your shop'}
            subtitle="Tick what you sell and the app fills itself in. You can change everything afterwards."
          />
          {/* Older accounts signed up before the shop name was asked for */}
          {askShopName && (
            <FilledInput
              label="Shop name"
              value={shopName}
              onChangeText={setShopName}
              autoComplete="organization"
            />
          )}
          <View style={styles.grid}>
            {PACKS.map((pack) => (
              <PackCard
                key={pack.key}
                label={pack.label}
                blurb={pack.blurb}
                icon={pack.icon}
                count={pack.products.length}
                selected={packs.includes(pack.key)}
                onPress={() => togglePack(pack.key)}
              />
            ))}
          </View>
        </>
      )}

      {current === 'kotas' && (
        <>
          <AuthHeading
            title="Which kotas do you make?"
            subtitle="Each one sets up its own recipe, so selling a kota takes the bread, chips and polony out of your stock by itself."
          />
          <View style={styles.list}>
            {KOTA_BUILDS.map((build) => (
              <KotaRow
                key={build.id}
                name={build.name}
                detail={build.detail}
                price={build.price}
                checked={kotas.includes(build.id)}
                onToggle={() => toggleKota(build.id)}
              />
            ))}
          </View>
        </>
      )}

      {current === 'count' && (
        <>
          <AuthHeading
            title="How much do you have now?"
            subtitle="Count what is on the shelf. Leave anything you are not sure about — you can set it later."
          />
          <StockCountList products={countable} counts={counts} onChange={setCounts} />
        </>
      )}

      {current === 'confirm' && catalogue.length === 0 && (
        <AuthHeading
          title="Nothing picked yet"
          subtitle="Go back and tick at least one thing you sell, or skip and look around the sample shop first."
        />
      )}

      {current === 'confirm' && catalogue.length > 0 && (
        <>
          <AuthHeading
            title="Ready to go"
            subtitle={`${sellable} things to sell${ingredients ? ` and ${ingredients} ingredients` : ''}, priced at the usual rates.`}
          />
          <View style={styles.summary}>
            <SummaryLine icon="storefront" text={`${sellable} products on the till`} />
            {ingredients > 0 && <SummaryLine icon="kitchen" text={`${ingredients} ingredients behind the kotas`} />}
            <SummaryLine
              icon="inventory_2"
              text={counted ? 'Stock set from your count' : 'No stock counted yet — the Dashboard will remind you'}
            />
            <SummaryLine
              icon="payments"
              text="Prices are rough, not yours. Tap any product on the Products screen to change its price."
            />
          </View>
          <Text style={styles.warning}>
            This clears the sample sales and suppliers that came with the app, so your reports start from your
            first real sale.
          </Text>
        </>
      )}
    </AuthShell>
  )
}

/** One of the "what do you sell" tiles. Selected = yellow fill, ink border. */
function PackCard({
  label,
  blurb,
  icon,
  count,
  selected,
  onPress,
}: {
  label: string
  blurb: string
  icon: string
  count: number
  selected: boolean
  onPress: () => void
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${label}. ${blurb}`}
      containerStyle={styles.cardSlot}
      style={[styles.card, selected && styles.cardOn]}
    >
      <MaterialIcon name={icon} size={24} color={colors.ink} />
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardBlurb} numberOfLines={2}>
        {blurb}
      </Text>
      {/* The kota tile seeds nothing by itself, so it promises nothing */}
      {count > 0 && <Text style={styles.cardCount}>{`${count} products`}</Text>}
    </PressableScale>
  )
}

function KotaRow({
  name,
  detail,
  price,
  checked,
  onToggle,
}: {
  name: string
  detail: string
  price: number
  checked: boolean
  onToggle: () => void
}) {
  return (
    <PressableScale
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={`${name}, ${detail}, ${money(price)}`}
      style={[styles.row, checked && styles.rowOn]}
    >
      {/* Decorative here: the whole row is the control and carries the label */}
      <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Checkbox checked={checked} onToggle={onToggle} accessibilityLabel={name} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowName}>{name}</Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {detail}
        </Text>
      </View>
      <Text style={styles.rowPrice}>{money(price, { whole: true })}</Text>
    </PressableScale>
  )
}

function SummaryLine({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.summaryLine}>
      <MaterialIcon name={icon} size={18} color={colors.ink} />
      <Text style={styles.summaryText}>{text}</Text>
    </View>
  )
}

function StepDots({ count, active }: { count: number; active: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Step ${active + 1} of ${count}`}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotOn]} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  // Two columns: half the row minus half the gap
  cardSlot: { width: '48%', flexGrow: 1 },
  card: {
    minHeight: 124,
    padding: space.lg,
    gap: space.xs,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  cardOn: { borderColor: colors.ink, backgroundColor: colors.brandSoft },
  cardLabel: { ...type.itemName, color: colors.ink, marginTop: space.xs },
  cardBlurb: { ...type.badge, color: colors.muted },
  cardCount: { ...type.badge, color: colors.ink, marginTop: 'auto' },

  list: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  rowOn: { borderColor: colors.ink, backgroundColor: colors.brandSoft },
  rowText: { flex: 1, gap: 2 },
  rowName: { ...type.bodyStrong, color: colors.ink },
  rowDetail: { ...type.badge, color: colors.muted },
  rowPrice: { ...type.moneySm, color: colors.ink },

  summary: { gap: space.md },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  summaryText: { ...type.caption, color: colors.ink, flex: 1 },
  warning: {
    ...type.caption,
    color: colors.muted,
    backgroundColor: colors.field,
    padding: space.lg,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },

  footer: { gap: space.lg },
  footerLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { ...type.caption, color: colors.muted, textDecorationLine: 'underline' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotOn: { backgroundColor: colors.ink, width: 20 },
})
