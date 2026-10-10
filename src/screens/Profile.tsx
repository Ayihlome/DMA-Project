import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CRITICAL_DAYS,
  DAY,
  LOW_DAYS,
  TARGET_DAYS,
  analyticsOf,
  available,
  categoryLabel,
  healthOf,
  longDate,
  productById,
  purchaseTotal,
  rand,
  shortDate,
  startOfToday,
  supplierName,
  unitQty,
  type PurchaseStatus,
} from "../core";
import { shareInventoryReport } from "../lib/report";
import { useNav } from "../nav";
import { SyncStatus } from "../shell";
import { useStore } from "../store";
import { colors, radius, space, type } from "../theme";
import { useToast } from "../toast";
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Figure,
  HScroll,
  Icon,
  Meter,
  Pill,
  ProductThumb,
  SearchField,
  Sheet,
  StatusBadge,
  Tabs,
  TextField,
  ToggleGroup,
  s,
} from "../ui";

type HistoryView = "purchases" | "sales";
type Filter = "all" | PurchaseStatus;
type Period = "today" | "week" | "month";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "planned", label: "Order lists" },
  { key: "in_transit", label: "In transit" },
  { key: "delivered", label: "Received" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS: Record<
  PurchaseStatus,
  { label: string; icon: string; tone: "purple" | "brand" | "success" | "error" }
> = {
  planned: { label: "Order list", icon: "checklist", tone: "purple" },
  in_transit: { label: "In transit", icon: "local_shipping", tone: "brand" },
  delivered: { label: "Received", icon: "check_circle", tone: "success" },
  cancelled: { label: "Cancelled", icon: "cancel", tone: "error" },
};

function EditProfile({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, updateProfile } = useStore();
  const toast = useToast();
  const [owner, setOwner] = useState(state.profile.ownerName);
  const [store, setStore] = useState(state.profile.storeName);
  const [tried, setTried] = useState(false);
  const save = () => {
    setTried(true);
    if (!owner.trim() || !store.trim()) return;
    updateProfile({ ownerName: owner.trim(), storeName: store.trim() });
    toast("Profile updated.");
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit profile"
      footer={
        <>
          <Button icon="check" onPress={save}>
            Save profile
          </Button>
          <Button variant="ghost" onPress={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Field
        label="Your name"
        error={tried && !owner.trim() ? "Enter your name." : undefined}
      >
        <TextField
          value={owner}
          onChangeText={setOwner}
          autoComplete="name"
          accessibilityLabel="Your name"
          invalid={tried && !owner.trim()}
        />
      </Field>
      <Field
        label="Shop name"
        error={tried && !store.trim() ? "Enter your shop name." : undefined}
      >
        <TextField
          value={store}
          onChangeText={setStore}
          autoComplete="organization"
          accessibilityLabel="Shop name"
          invalid={tried && !store.trim()}
        />
      </Field>
    </Sheet>
  );
}

function PurchaseHistory({ query }: { query: string }) {
  const { state, receivePurchase, cancelPurchase } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...state.purchases]
      .sort((a, b) => b.at - a.at)
      .filter((purchase) => filter === "all" || purchase.status === filter)
      .filter(
        (purchase) =>
          !needle ||
          purchase.id.toLowerCase().includes(needle) ||
          supplierName(state, purchase.supplierId)
            .toLowerCase()
            .includes(needle) ||
          purchase.lines.some((line) =>
            productById(state, line.productId)
              ?.name.toLowerCase()
              .includes(needle),
          ),
      );
  }, [filter, query, state]);
  const received = state.purchases.filter(
    (purchase) => purchase.status === "delivered",
  );
  const spent = received.reduce(
    (sum, purchase) => sum + purchaseTotal(purchase),
    0,
  );
  const awaiting = state.purchases.filter(
    (purchase) =>
      purchase.status === "planned" || purchase.status === "in_transit",
  ).length;

  return (
    <View style={styles.section}>
      <View style={styles.figures}>
        <Figure label="Received spend" value={rand(spent)} />
        <Figure label="Received" value={received.length} />
        <Figure
          label="Awaiting"
          value={awaiting}
          tone={awaiting ? colors.primary : colors.textPrimary}
        />
      </View>
      <HScroll inset={0}>
        {FILTERS.map((item) => (
          <Chip
            key={item.key}
            selected={filter === item.key}
            onPress={() => setFilter(item.key)}
          >
            {item.label}
          </Chip>
        ))}
      </HScroll>
      {!results.length && (
        <EmptyState
          icon="receipt_long"
          title="No purchases found"
          body="Try a different filter or search term."
        />
      )}
      {results.map((purchase) => {
        const isOpen = open === purchase.id;
        const status = STATUS[purchase.status];
        const actionable =
          purchase.status === "planned" || purchase.status === "in_transit";
        return (
          <View
            key={purchase.id}
            style={[styles.historyItem, isOpen && styles.historyItemOpen]}
          >
            <Pressable
              onPress={() => setOpen(isOpen ? null : purchase.id)}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              style={styles.historyHeader}
            >
              <View style={styles.flex}>
                <Text style={[type.labelBold, styles.primaryText]}>
                  {purchase.id} · {supplierName(state, purchase.supplierId)}
                </Text>
                <Text style={[type.caption, styles.secondaryText]}>
                  {shortDate(purchase.at)} · {purchase.lines.length} items
                </Text>
              </View>
              <View style={styles.alignEnd}>
                <Text style={[type.labelBold, styles.primaryText]}>
                  {rand(purchaseTotal(purchase))}
                </Text>
                <Pill tone={status.tone} icon={status.icon}>
                  {status.label}
                </Pill>
              </View>
            </Pressable>
            {isOpen && (
              <View style={styles.historyBody}>
                {purchase.lines.map((line) => {
                  const product = productById(state, line.productId);
                  return (
                    <View key={line.productId} style={s.rowBetween}>
                      <View style={styles.flex}>
                        <Text style={[type.label, styles.primaryText]}>
                          {product?.name ?? line.productId}
                        </Text>
                        <Text style={[type.caption, styles.secondaryText]}>
                          {product ? unitQty(product, line.qty) : line.qty} ×{" "}
                          {rand(line.unitPrice)}
                        </Text>
                      </View>
                      <Text style={[type.labelBold, styles.primaryText]}>
                        {rand(line.qty * line.unitPrice)}
                      </Text>
                    </View>
                  );
                })}
                {actionable && (
                  <>
                    <Button
                      icon="inventory"
                      onPress={() => {
                        receivePurchase(purchase.id);
                        toast(`${purchase.id} received. Stock updated.`);
                      }}
                    >
                      Mark as received
                    </Button>
                    <Button
                      variant="danger"
                      icon="cancel"
                      onPress={() => {
                        cancelPurchase(purchase.id);
                        toast(`${purchase.id} cancelled.`, "info");
                      }}
                    >
                      Cancel order
                    </Button>
                  </>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function SalesHistory({ query }: { query: string }) {
  const { state } = useStore();
  const { navigate } = useNav();
  const [period, setPeriod] = useState<Period>("week");
  const rows = useMemo(() => {
    const now = Date.now();
    const since =
      period === "today"
        ? startOfToday(now)
        : now - (period === "week" ? 7 : 30) * DAY;
    const sold = new Map<string, number>();
    state.sales.forEach((sale) => {
      if (sale.at >= since) {
        sale.lines.forEach((line) =>
          sold.set(line.productId, (sold.get(line.productId) ?? 0) + line.qty),
        );
      }
    });
    const needle = query.trim().toLowerCase();
    return state.products
      .filter((product) => product.sellable)
      .filter((product) =>
        `${product.name} ${categoryLabel(product.category)}`
          .toLowerCase()
          .includes(needle),
      )
      .map((product) => ({
        product,
        units: sold.get(product.id) ?? 0,
        revenue: (sold.get(product.id) ?? 0) * product.price,
        health: healthOf(state, product),
      }))
      .sort((a, b) => b.units - a.units);
  }, [period, query, state]);
  const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const units = rows.reduce((sum, row) => sum + row.units, 0);
  const attention = rows.filter((row) => row.health !== "healthy").length;

  return (
    <View style={styles.section}>
      <View style={styles.figures}>
        <Figure label="Revenue" value={rand(revenue)} />
        <Figure label="Units sold" value={units} />
        <Figure
          label="Need attention"
          value={attention}
          tone={attention ? colors.errorDefault : colors.secondary}
        />
      </View>
      <ToggleGroup
        label="Sales period"
        value={period}
        onChange={setPeriod}
        items={[
          { key: "today", label: "Today" },
          { key: "week", label: "7 days" },
          { key: "month", label: "30 days" },
        ]}
      />
      {!rows.length && (
        <EmptyState icon="inventory_2" title="No products found" />
      )}
      {rows.map(({ product, units: sold, revenue: sales, health }) => (
        <View key={product.id} style={styles.productRow}>
          <ProductThumb product={product} size="sm" />
          <View style={styles.flex}>
            <Text style={[type.labelBold, styles.primaryText]}>
              {product.name}
            </Text>
            <Text style={[type.caption, styles.secondaryText]}>
              {sold} sold · {rand(sales)} · {unitQty(product, available(state, product))} available
            </Text>
          </View>
          <StatusBadge health={health} />
        </View>
      ))}
      {attention > 0 && (
        <Button
          icon="inventory_2"
          onPress={() => navigate({ name: "restock" })}
        >
          Open restock plan
        </Button>
      )}
    </View>
  );
}

export default function Profile() {
  const { state } = useStore();
  const { route } = useNav();
  const toast = useToast();
  const analytics = useMemo(() => analyticsOf(state), [state]);
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [view, setView] = useState<HistoryView>(
    route.name === "profile" && route.history === "sales"
      ? "sales"
      : "purchases",
  );
  const [query, setQuery] = useState("");

  const exportReport = async () => {
    setExporting(true);
    try {
      await shareInventoryReport({
        ...analytics,
        store: state.profile.storeName,
        owner: state.profile.ownerName,
      });
      toast("Report ready to share.");
    } catch {
      toast("The report couldn't be created on this device.", "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Card style={styles.profileCard}>
        <Avatar name={state.profile.ownerName} size="lg" />
        <View style={styles.profileIdentity}>
          <Text style={[type.h2, styles.primaryText]}>
            {state.profile.ownerName}
          </Text>
          <Text style={[type.caption, styles.secondaryText]}>
            {state.profile.role} · {state.profile.storeName}
          </Text>
          <SyncStatus />
        </View>
        <Button
          block
          variant="secondary"
          icon="edit"
          onPress={() => setEditing(true)}
        >
          Edit profile
        </Button>
        <Button
          block
          icon="picture_as_pdf"
          busy={exporting}
          onPress={exportReport}
        >
          {exporting ? "Preparing report…" : "Export PDF"}
        </Button>
        <View style={styles.member}>
          <Text style={[type.caption, styles.secondaryText]}>Member since</Text>
          <Text style={[type.labelBold, styles.primaryText]}>
            {longDate(state.profile.memberSince)}
          </Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={s.rowBetween}>
          <Text style={[type.h2, styles.primaryText]}>Stock health</Text>
          <Text style={[type.caption, styles.secondaryText]}>
            {analytics.total} stock items
          </Text>
        </View>
        <View style={styles.health}>
          <View style={styles.healthCircle}>
            <Text style={[type.display, styles.primaryText]}>
              {analytics.percent}%
            </Text>
            <Text style={[type.caption, styles.secondaryText]}>healthy</Text>
          </View>
        </View>
        <Meter percent={analytics.percent} label="Healthy stock percentage" />
        <View style={styles.healthStats}>
          {[
            {
              label: "Healthy",
              value: analytics.healthy,
              color: colors.secondary,
            },
            { label: "Low", value: analytics.low, color: colors.tertiary },
            {
              label: "Critical",
              value: analytics.critical,
              color: colors.errorDefault,
            },
          ].map((item) => (
            <View key={item.label} style={styles.healthStat}>
              <Text style={[type.caption, styles.secondaryText]}>
                {item.label}
              </Text>
              <Text style={[type.h2, { color: item.color }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={s.rowBetween}>
          <Text style={[type.h2, styles.primaryText]}>Category levels</Text>
          <Text style={[type.caption, styles.secondaryText]}>
            % of {TARGET_DAYS}-day target
          </Text>
        </View>
        {analytics.categories.map((category) => {
          const tone =
            category.level < (CRITICAL_DAYS / TARGET_DAYS) * 100
              ? colors.errorDefault
              : category.level < (LOW_DAYS / TARGET_DAYS) * 100
                ? colors.warningDefault
                : undefined;
          return (
            <View key={category.name} style={styles.category}>
              <View style={s.rowBetween}>
                <View style={s.row}>
                  <Icon
                    name={category.icon}
                    size="sm"
                    color={colors.textSecondary}
                  />
                  <Text style={[type.label, styles.categoryName]}>
                    {category.name}
                  </Text>
                </View>
                <Text style={[type.labelBold, styles.primaryText]}>
                  {category.level}%
                </Text>
              </View>
              <Meter
                percent={category.level}
                tone={tone}
                label={`${category.name} stock level`}
              />
            </View>
          );
        })}
      </Card>

      <Card style={styles.card}>
        <Text style={[type.h2, styles.primaryText]}>Stock movement</Text>
        <Text style={[type.caption, styles.secondaryText]}>
          Last 12 weeks · sold versus restocked
        </Text>
        {analytics.weeks.map((week, index) => (
          <View key={`${week}-${index}`} style={styles.movement}>
            <Text style={[type.caption, styles.secondaryText]}>{week}</Text>
            <Text style={[type.captionMedium, styles.primaryText]}>
              {analytics.sold[index]} sold · {analytics.restocked[index]} in
            </Text>
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <Text style={[type.h2, styles.primaryText]}>History</Text>
        <Text style={[type.caption, styles.secondaryText]}>
          Orders, deliveries, stock levels and sales
        </Text>
        <Tabs
          label="History pages"
          value={view}
          onChange={(next) => {
            setView(next);
            setQuery("");
          }}
          items={[
            { key: "purchases", label: "Purchases", icon: "receipt_long" },
            { key: "sales", label: "Stock & Sales", icon: "monitoring" },
          ]}
        />
        <SearchField
          value={query}
          onChange={setQuery}
          label={
            view === "purchases" ? "Search purchases" : "Search products"
          }
          placeholder={
            view === "purchases"
              ? "Supplier, item or PO"
              : "Product or category"
          }
        />
        {view === "purchases" ? (
          <PurchaseHistory query={query} />
        ) : (
          <SalesHistory query={query} />
        )}
      </Card>
      <EditProfile open={editing} onClose={() => setEditing(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { padding: space.md, gap: space.md },
  primaryText: { color: colors.textPrimary },
  secondaryText: { color: colors.textSecondary },
  flex: { flex: 1, minWidth: 0 },
  alignEnd: { alignItems: "flex-end", gap: space["2xs"] },
  card: { padding: space.md, gap: space.md },
  section: { gap: space.sm },
  profileCard: { padding: space.lg, alignItems: "center", gap: space.md },
  profileIdentity: { alignItems: "center", gap: space["2xs"] },
  member: {
    alignSelf: "stretch",
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    gap: space["2xs"],
  },
  health: { alignItems: "center", paddingVertical: space.xs },
  healthCircle: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 10,
    borderColor: colors.accentTint,
    alignItems: "center",
    justifyContent: "center",
  },
  healthStats: { flexDirection: "row", gap: space.xs },
  healthStat: {
    flex: 1,
    alignItems: "center",
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  category: { gap: space.xs },
  categoryName: { color: colors.textPrimary, marginLeft: space.xs },
  movement: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
  },
  figures: { flexDirection: "row", gap: space.xs },
  historyItem: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  historyItemOpen: { borderColor: colors.primary },
  historyHeader: {
    minHeight: 72,
    padding: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  historyBody: {
    padding: space.sm,
    gap: space.sm,
    backgroundColor: colors.surfaceContainerLow,
  },
  productRow: {
    minHeight: 64,
    padding: space.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.lg,
  },
});
