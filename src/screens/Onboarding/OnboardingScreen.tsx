import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import MaterialIcon from '../../components/common/MaterialIcon'
import Checkbox from '../../components/ui/Checkbox'
import FilledInput from '../../components/ui/FilledInput'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useAuth } from '../../providers/AuthProvider'
import { supabase } from '../../lib/supabase'
import { useStore } from '../../store'
import { track, trackOnboarding } from '../../lib/telemetry'
import {
  KITCHEN_QUESTIONS,
  KOTA_BUILDS,
  PACKS,
  POTATO_DEFAULTS,
  buildStarterCatalogue,
  defaultKitchen,
  type ChipsAnswer,
  type ExtraItem,
  type KitchenAnswers,
  type PackKey,
  type StarterSelection,
} from '../../data/starterPacks'
import AuthShell, { AuthHeading, HEADER_COMPACT } from '../Auth/AuthShell'
import StockCountList, { type Counts } from './StockCountList'
import { colors, fonts, money, radius, space, tabular, type } from '../../theme/tokens'

/**
 * What the owner answers once, after verifying their email, before the app has
 * anything in it.
 *
 * Every question does work: what the shop sells picks the starter catalogues,
 * the item list lets the owner drop what they don't sell, fix prices and add
 * their own, and the kitchen step turns "a loaf makes 4 kotas" into recipe
 * amounts. Every answer starts filled in, so the fastest path is Continue,
 * Continue — and all of it can be changed later.
 *
 * Skipping is always available and leaves the demo catalogue in place, which
 * is how the app is still demonstrable.
 */

/** Two of the six are ticked up front: they are what almost every stand makes. */
const DEFAULT_KOTAS = ['kota-special', 'kota-chips']

type Step = 'packs' | 'items' | 'kotas' | 'kitchen' | 'count' | 'confirm'

const parse = (t: string) => {
  const n = Number(t.replace(',', '.').trim())
  return t.trim() !== '' && Number.isFinite(n) ? n : NaN
}

export default function OnboardingScreen() {
  const { session } = useAuth()
  const { finishOnboarding, skipOnboarding } = useStore()

  const [packs, setPacks] = useState<PackKey[]>([])
  const [kotas, setKotas] = useState<string[]>(DEFAULT_KOTAS)
  // Pack items the owner unticked, and prices they typed (kept as text while typing)
  const [exclude, setExclude] = useState<string[]>([])
  const [priceText, setPriceText] = useState<Record<string, string>>({})
  const [extras, setExtras] = useState<ExtraItem[]>([])
  const [kitchen, setKitchen] = useState<Required<KitchenAnswers>>(defaultKitchen)
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
  // The kota questions only exist if they said they make kotas
  const flow = useMemo<Step[]>(
    () => ['packs', 'items', ...(wantsKotas ? (['kotas', 'kitchen'] as const) : []), 'count', 'confirm'],
    [wantsKotas],
  )
  // Unticking kotas on the way back can shorten the flow underneath us
  const current = flow[Math.min(step, flow.length - 1)]

  const prices = useMemo(() => {
    const out: Record<string, number> = {}
    for (const [id, t] of Object.entries(priceText)) {
      const n = parse(t)
      if (Number.isFinite(n) && n >= 0) out[id] = n
    }
    return out
  }, [priceText])

  const selection: StarterSelection = {
    packs,
    kotas,
    exclude,
    prices,
    extras,
    ...(wantsKotas ? { kitchen } : {}),
  }
  const catalogue = useMemo(() => buildStarterCatalogue(selection), [packs, kotas, exclude, prices, extras, kitchen]) // eslint-disable-line react-hooks/exhaustive-deps
  const sellable = catalogue.filter((p) => p.sellable).length
  const ingredients = catalogue.length - sellable
  // A kota has no count of its own (its stock comes out of its ingredients), and airtime isn't counted
  const countable = useMemo(() => catalogue.filter((p) => !p.composite && !p.untracked), [catalogue])
  const counted = Object.values(counts).some((n) => n > 0)

  // The kitchen step asks only about what the ticked kotas use
  const used = useMemo(
    () => new Set(KOTA_BUILDS.filter((b) => kotas.includes(b.id)).flatMap((b) => b.recipe.map((l) => l.productId))),
    [kotas],
  )

  const togglePack = (key: PackKey) =>
    setPacks((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const toggleKota = (id: string) =>
    setKotas((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]))

  const toggleItem = (id: string) =>
    setExclude((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]))

  const setPrice = (id: string, t: string) => setPriceText((m) => ({ ...m, [id]: t }))

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
      unticked: exclude.length,
      own_items: extras.length,
      own_prices: Object.keys(prices).length,
      chips: wantsKotas ? kitchen.chips.mode : null,
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

  const itemsLeft = catalogue.filter((p) => p.sellable && !p.composite).length
  const canContinue =
    current === 'packs'
      ? packs.length > 0
      : current === 'items'
        ? itemsLeft > 0 || wantsKotas
        : current === 'kotas'
          ? kotas.length > 0
          : true

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
            subtitle="Tick what you sell. Next you can untick what you don't stock, fix prices and add your own."
          />
          {/* Older accounts signed up before the shop name was asked for */}
          {askShopName && (
            <FilledInput label="Shop name" value={shopName} onChangeText={setShopName} autoComplete="organization" />
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

      {current === 'items' && (
        <>
          <AuthHeading
            title="What you stock"
            subtitle="Untick anything you don't sell and change any price that isn't yours. Rough is fine."
          />
          {PACKS.filter((p) => p.key !== 'kotas' && packs.includes(p.key)).map((pack) => (
            <View key={pack.key} style={styles.itemGroup}>
              <Text style={styles.groupTitle} accessibilityRole="header">
                {pack.label}
              </Text>
              {pack.products.map((t) => (
                <ItemRow
                  key={t.id}
                  name={t.name}
                  checked={!exclude.includes(t.id)}
                  onToggle={() => toggleItem(t.id)}
                  // Airtime's price is the amount picked at the counter
                  price={t.priceOptions ? undefined : (priceText[t.id] ?? String(t.price))}
                  onPrice={(v) => setPrice(t.id, v)}
                />
              ))}
            </View>
          ))}
          <OwnItems extras={extras} onChange={setExtras} />
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
                price={priceText[build.id] ?? String(build.price)}
                onPrice={(v) => setPrice(build.id, v)}
                checked={kotas.includes(build.id)}
                onToggle={() => toggleKota(build.id)}
              />
            ))}
          </View>
        </>
      )}

      {current === 'kitchen' && (
        <>
          <AuthHeading
            title="How do you make them?"
            subtitle="So the app takes the right amount off your stock. Rough numbers are fine; change any of it later in Menu."
          />
          {used.has('fries') ? <ChipsCard value={kitchen.chips} onChange={(chips) => setKitchen((k) => ({ ...k, chips }))} /> : null}
          <View style={styles.list}>
            {KITCHEN_QUESTIONS.filter((q) => used.has(q.id)).map((q) => (
              <NumberLine
                key={q.id}
                label={q.label}
                after={q.after}
                value={kitchen.answers[q.id]}
                onChange={(n) => setKitchen((k) => ({ ...k, answers: { ...k.answers, [q.id]: n } }))}
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
            subtitle={`${sellable} things to sell${ingredients ? ` and ${ingredients} ingredients` : ''}.`}
          />
          <Text style={styles.warning}>
            This clears the sample sales and suppliers that came with the app, so your reports start from your
            first real sale.
          </Text>
          <View style={styles.summary}>
            <SummaryLine icon="storefront" text={`${sellable} products on the till`} />
            {ingredients > 0 && <SummaryLine icon="kitchen" text={`${ingredients} ingredients behind the kotas`} />}
            <SummaryLine
              icon="inventory_2"
              text={counted ? 'Stock set from your count' : 'No stock counted yet — the Dashboard will remind you'}
            />
            <SummaryLine icon="payments" text="Change any price or recipe later: Profile → What you sell, or Menu." />
          </View>
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

/** A price typed in rand. Kept as text so "12," survives the keystroke. */
function PriceField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <View style={styles.priceField}>
      <Text style={styles.priceR}>R</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        inputMode="decimal"
        selectTextOnFocus
        accessibilityLabel={label}
        style={styles.priceInput}
      />
    </View>
  )
}

function ItemRow({
  name,
  checked,
  onToggle,
  price,
  onPrice,
}: {
  name: string
  checked: boolean
  onToggle: () => void
  /** Absent when the price is chosen at the counter (airtime). */
  price?: string
  onPrice: (v: string) => void
}) {
  return (
    <View style={styles.itemRow}>
      <PressableScale
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={name}
        containerStyle={styles.flex}
        style={styles.itemToggle}
      >
        <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Checkbox checked={checked} onToggle={onToggle} accessibilityLabel={name} />
        </View>
        <Text style={[styles.itemName, !checked && styles.itemOff]} numberOfLines={2}>
          {name}
        </Text>
      </PressableScale>
      {checked && price !== undefined ? <PriceField value={price} onChange={onPrice} label={`Price of ${name}`} /> : null}
      {checked && price === undefined ? <Text style={styles.itemNote}>amount at the counter</Text> : null}
    </View>
  )
}

/** "Add my own": things the shop sells that no pack has. */
function OwnItems({ extras, onChange }: { extras: ExtraItem[]; onChange: (e: ExtraItem[]) => void }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const priceValue = parse(price)
  const canAdd = name.trim().length > 0 && Number.isFinite(priceValue) && priceValue >= 0

  return (
    <View style={styles.itemGroup}>
      <Text style={styles.groupTitle} accessibilityRole="header">
        Your own items
      </Text>
      {extras.map((e, i) => (
        <View key={`${e.name}-${i}`} style={styles.itemRow}>
          <Text style={[styles.itemName, styles.flex]} numberOfLines={1}>
            {e.name}
          </Text>
          <Text style={styles.rowPrice}>{money(e.price)}</Text>
          <PressableScale
            onPress={() => onChange(extras.filter((_, j) => j !== i))}
            accessibilityLabel={`Remove ${e.name}`}
            style={styles.remove}
            hitSlop={8}
          >
            <MaterialIcon name="close" size={16} color={colors.muted} />
          </PressableScale>
        </View>
      ))}
      <FilledInput label="Something else you sell, e.g. Vetkoek" value={name} onChangeText={setName} autoCapitalize="words" />
      {name.trim() ? (
        <View style={styles.addRow}>
          <View style={styles.flex}>
            <FilledInput label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <PressableScale
            onPress={() => {
              if (!canAdd) return
              onChange([...extras, { name: name.trim(), price: priceValue }])
              setName('')
              setPrice('')
            }}
            disabled={!canAdd}
            accessibilityLabel={`Add ${name.trim()}`}
            style={[styles.addBtn, !canAdd && styles.addOff]}
          >
            <Text style={styles.addText}>Add</Text>
          </PressableScale>
        </View>
      ) : null}
    </View>
  )
}

function KotaRow({
  name,
  detail,
  price,
  onPrice,
  checked,
  onToggle,
}: {
  name: string
  detail: string
  price: string
  onPrice: (v: string) => void
  checked: boolean
  onToggle: () => void
}) {
  return (
    <View style={[styles.row, checked && styles.rowOn]}>
      <PressableScale
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${name}, ${detail}`}
        containerStyle={styles.flex}
        style={styles.kotaToggle}
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
      </PressableScale>
      {checked ? (
        <PriceField value={price} onChange={onPrice} label={`Price of ${name}`} />
      ) : (
        <Text style={styles.rowPrice}>{`R${price}`}</Text>
      )}
    </View>
  )
}

/** "One loaf makes about [4] kotas": a number in a sentence, prefilled. */
function NumberLine({
  label,
  after,
  value,
  onChange,
}: {
  label: string
  after: string
  value: number
  onChange: (n: number) => void
}) {
  const [text, setText] = useState(String(value))
  return (
    <View style={styles.numberLine}>
      <Text style={[styles.numberLabel, styles.flex]}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t)
          const n = parse(t)
          if (Number.isFinite(n) && n > 0) onChange(n)
        }}
        keyboardType="decimal-pad"
        inputMode="decimal"
        selectTextOnFocus
        accessibilityLabel={`${label}, in ${after}`}
        style={styles.numberInput}
      />
      <Text style={styles.numberAfter}>{after}</Text>
    </View>
  )
}

/** Chips: frozen bags, or cut from potatoes. The questions follow the answer. */
function ChipsCard({ value, onChange }: { value: ChipsAnswer; onChange: (c: ChipsAnswer) => void }) {
  const bag = value.mode === 'bag' ? value : defaultKitchen().chips
  const potato = value.mode === 'potato' ? value : { mode: 'potato' as const, ...POTATO_DEFAULTS }
  const choose = (mode: 'bag' | 'potato') => onChange(mode === 'bag' ? bag : potato)

  return (
    <View style={styles.chipsCard}>
      <Text style={styles.rowName}>Chips</Text>
      <View style={styles.choiceRow}>
        {(
          [
            ['bag', 'Frozen bags'],
            ['potato', 'I cut potatoes'],
          ] as const
        ).map(([mode, label]) => {
          const on = value.mode === mode
          return (
            <PressableScale
              key={mode}
              onPress={() => choose(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              containerStyle={styles.flex}
              style={[styles.choice, on && styles.choiceOn]}
            >
              <Text style={styles.choiceText}>{label}</Text>
            </PressableScale>
          )
        })}
      </View>
      {value.mode === 'bag' ? (
        <NumberLine
          key="bag"
          label="A 2 kg bag does about"
          after="kotas"
          value={value.kotasPerBag}
          onChange={(n) => onChange({ mode: 'bag', kotasPerBag: n })}
        />
      ) : (
        <>
          <NumberLine
            key="per-potato"
            label="One potato gives about"
            after="chips"
            value={value.chipsPerPotato}
            onChange={(n) => onChange({ ...value, chipsPerPotato: n })}
          />
          <NumberLine
            key="per-kota"
            label="A kota gets about"
            after="chips"
            value={value.chipsPerKota}
            onChange={(n) => onChange({ ...value, chipsPerKota: n })}
          />
          <NumberLine
            key="per-bag"
            label="A bag you buy has about"
            after="potatoes"
            value={value.potatoesPerBag}
            onChange={(n) => onChange({ ...value, potatoesPerBag: n })}
          />
        </>
      )}
    </View>
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
  flex: { flex: 1 },
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

  itemGroup: { gap: space.xs },
  groupTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.quiet, marginTop: space.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 48 },
  itemToggle: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  itemName: { ...type.bodyStrong, color: colors.ink, flexShrink: 1 },
  itemOff: { color: colors.muted, textDecorationLine: 'line-through' },
  itemNote: { ...type.badge, color: colors.muted },
  priceField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.field,
  },
  priceR: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  priceInput: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, minWidth: 48, paddingVertical: 0, ...tabular },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  addBtn: { height: 58, paddingHorizontal: space.xl, borderRadius: radius.md, backgroundColor: colors.brand, justifyContent: 'center' },
  addOff: { opacity: 0.4 },
  addText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },

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
  kotaToggle: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowText: { flex: 1, gap: 2 },
  rowName: { ...type.bodyStrong, color: colors.ink },
  rowDetail: { ...type.badge, color: colors.muted },
  rowPrice: { ...type.moneySm, color: colors.ink },

  chipsCard: { gap: space.sm, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.brandSoft },
  choiceRow: { flexDirection: 'row', gap: space.sm },
  choice: {
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOn: { borderColor: colors.ink },
  choiceText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  numberLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 },
  numberLabel: { ...type.caption, color: colors.ink },
  numberInput: {
    ...type.bodyStrong,
    ...tabular,
    color: colors.ink,
    minWidth: 56,
    height: 44,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.field,
    textAlign: 'center',
  },
  numberAfter: { ...type.caption, color: colors.muted, minWidth: 56 },

  summary: { gap: space.md },
  summaryLine: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  summaryText: { ...type.caption, color: colors.ink, flex: 1 },
  warning: {
    ...type.caption,
    color: colors.ink,
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
