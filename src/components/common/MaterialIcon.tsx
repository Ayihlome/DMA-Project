import { SymbolView } from 'expo-symbols'

type Props = {
  name: string
  size?: number
  color?: string
}

const IOS_SYMBOLS: Record<string, string> = {
  add: 'plus',
  add_circle: 'plus.circle.fill',
  add_shopping_cart: 'cart.badge.plus',
  arrow_upward: 'arrow.up',
  auto_awesome: 'sparkles',
  bakery_dining: 'birthday.cake',
  check: 'checkmark',
  check_circle: 'checkmark.circle.fill',
  close: 'xmark',
  edit: 'pencil',
  error: 'exclamationmark.circle.fill',
  flag: 'flag.fill',
  info: 'info.circle.fill',
  inventory: 'shippingbox.fill',
  inventory_2: 'shippingbox.fill',
  keyboard_arrow_down: 'chevron.down',
  keyboard_arrow_up: 'chevron.up',
  local_fire_department: 'flame.fill',
  local_shipping: 'truck.box.fill',
  location_on: 'mappin.and.ellipse',
  lock: 'lock.fill',
  payments: 'creditcard.fill',
  person: 'person.fill',
  psychology: 'brain.head.profile',
  qr_code_scanner: 'qrcode.viewfinder',
  remove: 'minus',
  savings: 'banknote.fill',
  schedule: 'clock.fill',
  search: 'magnifyingglass',
  sort: 'line.3.horizontal.decrease',
  south_east: 'arrow.down.right',
  storefront: 'storefront.fill',
  swap_horiz: 'arrow.left.arrow.right',
  trending_down: 'chart.line.downtrend.xyaxis',
  trending_up: 'chart.line.uptrend.xyaxis',
  verified: 'checkmark.seal.fill',
  warning: 'exclamationmark.triangle.fill',
  warehouse: 'shippingbox.fill',
  notification_important: 'bell.badge.fill',
  save_as: 'square.and.arrow.down.fill',
  expand_more: 'chevron.down',
  expand_less: 'chevron.up',
  chevron_right: 'chevron.right',
  logout: 'rectangle.portrait.and.arrow.right',
  lunch_dining: 'takeoutbag.and.cup.and.straw.fill',
  local_drink: 'cup.and.saucer.fill',
  water_drop: 'drop.fill',
  egg: 'oval.fill',
  shopping_basket: 'basket.fill',
  receipt_long: 'list.bullet.rectangle.fill',
}

export default function MaterialIcon({ name, size = 24, color = '#000' }: Props) {
  const iosName = IOS_SYMBOLS[name] ?? 'circle.fill'

  return (
    <SymbolView
      name={{ ios: iosName as any, android: name as any, web: name as any }}
      tintColor={color}
      size={size}
    />
  )
}
