import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  healthOf,
  pricesFor,
  productById,
  purchaseTotal,
  rand,
  recommendations,
  stockItems,
  supplierName,
  unitQty,
  type Purchase,
  type Recommendation,
} from "../core";
import { useNav } from "../nav";
import { useStore } from "../store";
import { colors, radius, space, type } from "../theme";
import { useToast } from "../toast";
import {
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Icon,
  Meter,
  Pill,
  ProductThumb,
  Select,
  Sheet,
  StatusBadge,
  Stepper,
  TextField,
  s,
} from "../ui";

type Line = {
  productId: string;
  qty: number;
  supplierId: string;
  include: boolean;
  custom?: boolean;
};

function priceOf(
  state: ReturnType<typeof useStore>["state"],
  productId: string,
  supplierId: string,
) {
  const prices = pricesFor(state, productId);
  return (
    (prices.find((price) => price.supplierId === supplierId) ?? prices[0])
      ?.unitPrice ??
    productById(state, productId)?.cost ??
    0
  );
}

function CreatedOrders({
  orders,
  onDone,
}: {
  orders: Purchase[];
  onDone: () => void;
}) {
  const { state } = useStore();
  const { navigate } = useNav();
  const text = orders
    .map(
      (order) =>
        `${supplierName(state, order.supplierId)} (${order.id})\n${order.lines
          .map((line) => {
            const product = productById(state, line.productId)!;
            return `- ${unitQty(product, line.qty)} ${product.name} @ ${rand(line.unitPrice)}`;
          })
          .join("\n")}\nTotal ${rand(purchaseTotal(order))}`,
    )
    .join("\n\n");

  return (
    <Card style={styles.created}>
      <View style={styles.titleRow}>
        <View style={styles.successIcon}>
          <Icon name="task_alt" color={colors.secondary} />
        </View>
        <View style={styles.flex}>
          <Text style={[type.h2, styles.primaryText]}>
            Restock order list created
          </Text>
          <Text style={[type.caption, styles.secondaryText]}>
            Nothing was sent to suppliers. Take this list with you and mark it
            received when the stock arrives.
          </Text>
        </View>
      </View>
      {orders.map((order) => (
        <View key={order.id} style={styles.order}>
          <View style={s.rowBetween}>
            <Text style={[type.labelBold, styles.primaryText]}>
              {supplierName(state, order.supplierId)} · {order.id}
            </Text>
            <Text style={[type.labelBold, styles.primaryText]}>
              {rand(purchaseTotal(order))}
            </Text>
          </View>
          {order.lines.map((line) => (
            <Text
              key={line.productId}
              style={[type.caption, styles.secondaryText]}
            >
              {productById(state, line.productId)?.name} ·{" "}
              {rand(line.qty * line.unitPrice)}
            </Text>
          ))}
        </View>
      ))}
      <Button
        icon="share"
        onPress={() =>
          Share.share({ message: `StockEvo restock list\n\n${text}` })
        }
      >
        Share list
      </Button>
      <Button
        variant="secondary"
        icon="receipt_long"
        onPress={() => navigate({ name: "profile", history: "purchases" })}
      >
        View purchase history
      </Button>
      <Button variant="ghost" onPress={onDone}>
        Back to plan
      </Button>
    </Card>
  );
}

function AddItemSheet({
  open,
  exclude,
  onClose,
  onAdd,
}: {
  open: boolean;
  exclude: string[];
  onClose: () => void;
  onAdd: (productId: string, qty: number) => void;
}) {
  const { state } = useStore();
  const products = stockItems(state).filter(
    (product) => !exclude.includes(product.id),
  );
  const [id, setId] = useState("");
  const [packs, setPacks] = useState("1");
  const product = productById(state, id || products[0]?.id || "");
  const count = Number.parseInt(packs, 10);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add another item"
      description="Add something that is not recommended yet."
      footer={
        <>
          <Button
            icon="add"
            disabled={!product || !(count > 0)}
            onPress={() => {
              if (!product) return;
              onAdd(product.id, count * product.packSize);
              setId("");
              setPacks("1");
              onClose();
            }}
          >
            Add to plan
          </Button>
          <Button variant="ghost" onPress={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      {!product ? (
        <EmptyState
          icon="inventory_2"
          title="Every item is already in the plan"
        />
      ) : (
        <>
          <Field label="Item">
            <Select
              value={product.id}
              label="Item"
              options={products.map((item) => ({
                key: item.id,
                label: item.name,
                sub: `${unitQty(item, item.stock)} on hand`,
              }))}
              onChange={setId}
            />
          </Field>
          <Field
            label={`How many (${product.packLabel})`}
            hint={
              count > 0
                ? `${unitQty(product, count * product.packSize)} at about ${rand(
                    priceOf(state, product.id, "") *
                      count *
                      product.packSize,
                  )}`
                : undefined
            }
          >
            <TextField
              value={packs}
              onChangeText={setPacks}
              keyboardType="number-pad"
              accessibilityLabel="Number of packs"
            />
          </Field>
        </>
      )}
    </Sheet>
  );
}

export default function Restock() {
  const { state, setBudget, createOrderList } = useStore();
  const toast = useToast();
  const recommendationsList = useMemo(
    () => recommendations(state),
    [state],
  );
  const onOrder = useMemo(() => {
    const result = new Map<string, string>();
    state.purchases.forEach((purchase) => {
      if (
        purchase.status === "planned" ||
        purchase.status === "in_transit"
      ) {
        purchase.lines.forEach((line) =>
          result.set(line.productId, purchase.id),
        );
      }
    });
    return result;
  }, [state.purchases]);
  const [lines, setLines] = useState<Line[]>(() =>
    recommendationsList.map((item) => ({
      productId: item.product.id,
      qty: item.qty,
      supplierId: item.supplierId,
      include: !onOrder.has(item.product.id),
    })),
  );
  const [expanded, setExpanded] = useState<string | null>(
    recommendationsList[0]?.product.id ?? null,
  );
  const [adding, setAdding] = useState(false);
  const [created, setCreated] = useState<Purchase[] | null>(null);
  const [budgetText, setBudgetText] = useState(String(state.budget));

  const recommendationOf = (id: string): Recommendation | undefined =>
    recommendationsList.find((item) => item.product.id === id);
  const lineCost = (line: Line) =>
    Math.round(
      line.qty *
        priceOf(state, line.productId, line.supplierId) *
        100,
    ) / 100;
  const included = lines.filter((line) => line.include && line.qty > 0);
  const total = included.reduce((sum, line) => sum + lineCost(line), 0);
  const remaining = state.budget - total;
  const over = remaining < 0;
  const percent =
    state.budget > 0
      ? Math.min(100, (total / state.budget) * 100)
      : total > 0
        ? 100
        : 0;
  const update = (id: string, patch: Partial<Line>) =>
    setLines((current) =>
      current.map((line) =>
        line.productId === id ? { ...line, ...patch } : line,
      ),
    );
  const commitBudget = (value: string) => {
    setBudgetText(value);
    const parsed = Number.parseFloat(value);
    setBudget(Number.isFinite(parsed) ? parsed : 0);
  };
  const create = () => {
    if (over || !included.length) return;
    const orders = createOrderList(
      included.map((line) => ({
        productId: line.productId,
        qty: line.qty,
        supplierId: line.supplierId,
        unitPrice: priceOf(state, line.productId, line.supplierId),
      })),
    );
    setLines((current) =>
      current.map((line) =>
        line.include ? { ...line, include: false } : line,
      ),
    );
    setCreated(orders);
    toast(
      `Order list created for ${orders.length} ${
        orders.length === 1 ? "supplier" : "suppliers"
      }.`,
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View>
          <Text style={[type.h1, styles.primaryText]}>
            <Icon name="checklist" color={colors.brandPurple} /> Restock plan
          </Text>
          <Text style={[type.caption, styles.secondaryText]}>
            Most urgent items first, using your chosen or cheapest saved price.
          </Text>
        </View>
        {created && (
          <CreatedOrders orders={created} onDone={() => setCreated(null)} />
        )}
        <Card style={styles.card}>
          <View style={s.rowBetween}>
            <View>
              <Text style={[type.caption, styles.secondaryText]}>
                Available budget
              </Text>
              <View style={styles.budgetRow}>
                <Text style={[type.display, styles.primaryText]}>R</Text>
                <TextField
                  value={budgetText}
                  onChangeText={commitBudget}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Available budget in rand"
                  style={styles.budgetInput}
                />
              </View>
            </View>
            <View style={styles.alignEnd}>
              <Text style={[type.caption, styles.secondaryText]}>Allocated</Text>
              <Text style={[type.labelBold, styles.primaryText]}>
                {rand(total)}
              </Text>
              <Text style={[type.captionMedium, styles.secondaryText]}>
                {percent.toFixed(0)}% used
              </Text>
            </View>
          </View>
          <Meter
            percent={over ? 100 : percent}
            tone={over ? colors.errorDefault : undefined}
            label={`${rand(total)} of ${rand(state.budget)} budget used`}
            height={12}
          />
          <View style={s.rowBetween}>
            <Pill
              tone={over ? "error" : "success"}
              icon={over ? "warning" : "check_circle"}
            >
              {over
                ? `${rand(-remaining)} over budget`
                : `${rand(remaining)} left`}
            </Pill>
            <Button
              variant="ghost"
              size="sm"
              icon="add"
              onPress={() => commitBudget(String(state.budget + 500))}
            >
              R500
            </Button>
          </View>
          {over && (
            <View style={styles.error}>
              <Icon name="error" color={colors.errorDefault} />
              <Text style={[type.captionMedium, styles.errorText]}>
                Remove items or raise the budget to create the order list.
              </Text>
            </View>
          )}
        </Card>

        <View style={s.rowBetween}>
          <Text style={[type.labelBold, styles.primaryText]}>
            Recommended items ({lines.length})
          </Text>
          <Text style={[type.caption, styles.secondaryText]}>
            Most urgent first
          </Text>
        </View>

        {!lines.length && (
          <Card>
            <EmptyState
              icon="verified"
              title="Nothing needs restocking"
              body="All stock items are above their safe levels."
            />
          </Card>
        )}

        {lines.map((line) => {
          const product = productById(state, line.productId)!;
          const recommendation = recommendationOf(product.id);
          const health = recommendation?.health ?? healthOf(state, product);
          const options = pricesFor(state, product.id);
          const isOpen = expanded === product.id;
          const purchaseId = onOrder.get(product.id);
          return (
            <Card
              key={product.id}
              style={[styles.card, !line.include && styles.dimmed]}
            >
              <View style={styles.itemTop}>
                <Checkbox
                  checked={line.include}
                  onChange={(include) => update(product.id, { include })}
                  label={`Include ${product.name}`}
                />
                <ProductThumb product={product} size="sm" />
                <View style={styles.flex}>
                  <View style={styles.wrapRow}>
                    {line.custom ? (
                      <Pill tone="purple" icon="person">
                        Added by you
                      </Pill>
                    ) : (
                      <StatusBadge health={health} solid />
                    )}
                    {purchaseId && (
                      <Pill tone="brand" icon="local_shipping">
                        On order · {purchaseId}
                      </Pill>
                    )}
                  </View>
                  <View style={s.rowBetween}>
                    <Text
                      style={[type.h2, styles.primaryText, styles.flex]}
                      numberOfLines={1}
                    >
                      {product.name}
                    </Text>
                    <Text style={[type.labelBold, styles.primaryText]}>
                      {rand(lineCost(line))}
                    </Text>
                  </View>
                  <Text style={[type.caption, styles.secondaryText]}>
                    {unitQty(product, product.stock)} on hand
                  </Text>
                </View>
              </View>
              <View style={styles.control}>
                <Text style={[type.captionMedium, styles.secondaryText]}>
                  Quantity
                </Text>
                <Stepper
                  value={unitQty(product, line.qty)}
                  onMinus={() =>
                    update(product.id, {
                      qty:
                        Math.round((line.qty - product.packSize) * 100) / 100,
                    })
                  }
                  onPlus={() =>
                    update(product.id, {
                      qty:
                        Math.round((line.qty + product.packSize) * 100) / 100,
                    })
                  }
                  minusDisabled={line.qty <= product.packSize}
                  minusLabel={`Fewer ${product.name}`}
                  plusLabel={`More ${product.name}`}
                />
              </View>
              <Select
                value={line.supplierId}
                label={`Supplier for ${product.name}`}
                left={<Icon name="storefront" color={colors.brandGreen} />}
                options={
                  options.length
                    ? options.map((price, index) => ({
                        key: price.supplierId,
                        label: supplierName(state, price.supplierId),
                        sub: `${rand(price.unitPrice)} per ${product.unit}${
                          index === 0 ? " · cheapest" : ""
                        }`,
                      }))
                    : [
                        {
                          key: "",
                          label: "Average cost estimate",
                          sub: rand(product.cost),
                        },
                      ]
                }
                onChange={(supplierId) =>
                  update(product.id, { supplierId })
                }
              />
              {recommendation && (
                <>
                  <Pressable
                    onPress={() =>
                      setExpanded(isOpen ? null : product.id)
                    }
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    style={styles.why}
                  >
                    <View style={s.row}>
                      <Icon name="info" size="sm" color={colors.primary} />
                      <Text style={[type.captionMedium, styles.linkText]}>
                        Why this item?
                      </Text>
                    </View>
                    <Icon
                      name={isOpen ? "expand_less" : "expand_more"}
                      color={colors.primary}
                    />
                  </Pressable>
                  {isOpen && (
                    <View style={styles.reasons}>
                      {recommendation.reasons.map((reason) => (
                        <View key={reason} style={styles.reason}>
                          <Icon
                            name="check"
                            size="sm"
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              type.caption,
                              styles.secondaryText,
                              styles.flex,
                            ]}
                          >
                            {reason}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
              {line.custom && (
                <Button
                  variant="danger"
                  size="sm"
                  icon="delete"
                  onPress={() =>
                    setLines((current) =>
                      current.filter(
                        (item) => item.productId !== product.id,
                      ),
                    )
                  }
                >
                  Remove
                </Button>
              )}
            </Card>
          );
        })}

        <Pressable
          onPress={() => setAdding(true)}
          accessibilityRole="button"
          style={styles.add}
        >
          <Icon name="add_circle" color={colors.textSecondary} />
          <Text style={[type.labelBold, styles.secondaryText]}>
            Add another item
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.actionBar}>
        <View style={s.rowBetween}>
          <Text style={[type.captionMedium, styles.primaryText]}>
            {included.length} {included.length === 1 ? "item" : "items"} ·{" "}
            <Text style={type.labelBold}>{rand(total)}</Text>
          </Text>
          <Text
            style={[
              type.captionMedium,
              { color: over ? colors.errorDefault : colors.secondary },
            ]}
          >
            {over ? "Over budget" : "Within budget"}
          </Text>
        </View>
        <Button
          block
          icon={over ? "block" : "shopping_bag"}
          disabled={over || !included.length}
          onPress={create}
        >
          {over
            ? "Over budget"
            : !included.length
              ? "Select items to order"
              : "Create restock order list"}
        </Button>
      </View>

      <AddItemSheet
        open={adding}
        onClose={() => setAdding(false)}
        exclude={lines.map((line) => line.productId)}
        onAdd={(productId, qty) => {
          const supplierId =
            state.preferred[productId] ??
            pricesFor(state, productId)[0]?.supplierId ??
            "";
          setLines((current) => [
            ...current,
            { productId, qty, supplierId, include: true, custom: true },
          ]);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  content: { padding: space.md, paddingBottom: 112, gap: space.md },
  primaryText: { color: colors.textPrimary },
  secondaryText: { color: colors.textSecondary },
  errorText: { color: colors.errorDefault, flex: 1 },
  linkText: { color: colors.primary, marginLeft: space["2xs"] },
  flex: { flex: 1, minWidth: 0 },
  card: { padding: space.md, gap: space.sm },
  created: { padding: space.md, gap: space.sm },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  successIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.successTint,
    alignItems: "center",
    justifyContent: "center",
  },
  order: {
    padding: space.sm,
    gap: space["2xs"],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  budgetRow: { flexDirection: "row", alignItems: "center", gap: space.xs },
  budgetInput: { width: 132, ...type.display },
  alignEnd: { alignItems: "flex-end", gap: space["2xs"] },
  error: {
    flexDirection: "row",
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.errorTint,
  },
  itemTop: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: space["2xs"] },
  dimmed: { opacity: 0.72 },
  control: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    padding: space.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.bgBase,
  },
  why: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reasons: {
    padding: space.sm,
    gap: space.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  reason: { flexDirection: "row", alignItems: "flex-start", gap: space.xs },
  add: {
    minHeight: 56,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.borderDisabled,
    borderRadius: radius.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.xs,
    backgroundColor: colors.bgSurface,
  },
});
