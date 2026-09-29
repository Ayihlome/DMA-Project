import { colors } from '../../../theme/theme'

export type Category = 'all' | 'bakery' | 'dairy' | 'pantry' | 'kota' | 'beverages'

export interface Product {
  id: string
  name: string
  category: string
  stockLabel: string
  price: number
  uri: string
  badge?: string
  badgeBg?: string
  badgeText?: string
  disabled?: boolean
  disabledReason?: string
  hasRecipe?: boolean
}

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bakery', label: 'Bakery' },
  { key: 'dairy', label: 'Dairy & Eggs' },
  { key: 'pantry', label: 'Pantry & Grains' },
  { key: 'kota', label: 'Kota & Hot Food' },
  { key: 'beverages', label: 'Beverages' },
]

export const PRODUCTS: Product[] = [
  {
    id: 'bread', name: 'White Bread 700g', category: 'Bakery', stockLabel: '18 left', price: 17,
    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC2lDs3Kx5thKp0TTKr6JWdjkGtfc-oG_UyRukFC1xYhTu7ZBNtxGTqwDI2N9Xgn189ef0yLzqjoNZMe9vFlMWO6I-msI4eGa1_cyCY5e28r0t16qDGOwWXcjZqoM7S5ZhcOPhESoMxXGdgdOKJvGeeU9btrdYipJkJApzJKYa7dz3gmHAyomAvo_EtBtS05CxsahUz9g9zy23cN3vjk5OQwZFToB3zqBjOUBPff-EkA7IsM2oid4nw',
    badge: 'In stock', badgeBg: colors.secondary, badgeText: colors.onSecondary,
  },
  {
    id: 'milk', name: 'Fresh Milk 1L', category: 'Dairy • Full Cream', stockLabel: '9 left', price: 15.5,
    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCSRun0pjw7KCVk8AMRf5oyHEtoL6iA9_D9YFlWpSWIYZm_tKM_UlF7QfzGe0GnpVRyKaIaaYz7S7Ma5vxbwor_YNzFc16KGz_SNmUxviyWFLN9b5POMWWCAnRZOOJETfdIbTD4eO73daNdmbM267zfwrxQWusTkp5ijACmnmIntqDRwLB01QDiMWUJY8kTMc4eXlF4nYS2A_KHf_W8da_xl8tErgchcrNhNw0FaLEDIffdJKuKvy5t',
    badge: '9 left', badgeBg: colors.surfaceContainerHighest, badgeText: colors.onSurface,
  },
  {
    id: 'coke', name: 'Coca-Cola 330ml', category: 'Cold Drinks • Can', stockLabel: '32 left', price: 13,
    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBc-dprPUKNpyvotLLe3XfnKrznVTZzOvGMDt349DjBBuypHaSiRMq6DTH-OU_2V-HaoeBqedAd_TVVj0mZttDxhE-Fcy-k3oDZTx2jJR50cK6fkfwWhU2T4NGly6tGBIozesesaqsVktBmYtQB93qKAtzAjVU9Dpx3HIN6FZwV9PFV2MclAhwNfVygBqFn_SzcaASinHPhDV4t10cSN8718YBxC3P7ERlxqnYNYR5-ZCEiZ5kghl0-',
    badge: '32 left', badgeBg: colors.secondary, badgeText: colors.onSecondary,
  },
  {
    id: 'kota', name: 'Kota Special', category: 'Chips, polony, cheese', stockLabel: 'Recipe linked', price: 35,
    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBoe3ECGaQypyFJnbv4MWHXeN9cuI1VKTHmZhL1yTcMZn0QfrRTz_bH9A4vGSUH_wPxsQv1816y3Bt__57ERWui33heHk6ZoCgoApTa8sxFLkZZAkVfDgmnYbQtsOUm1zxCqip9WaGzvOcb3q74ev0eosnTfzjoj36g6jNTWh4_On1P71Hbs8l-J1mJBZnFXsDDNfBsE96nlIdlA5Fb9RNDWL98Q-xszK3yDY0NTOYKGVEX',
    badge: 'Recipe linked', badgeBg: colors.accentTint, badgeText: colors.primary,
    hasRecipe: true,
  },
  {
    id: 'russian', name: 'Russian & Chips', category: 'Hot Food', stockLabel: '', price: 28,
    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABt4T9cNkMxeIcx7qKxsh79ly1T-fql7lqNkNGVB_58caBynSiWvKwm6cZP9PLgTR3JX4XJJqky8bigkj5YhTvwhiCCNaymGT_ncw19tr0aQMbT0otJoYL5cNRs55PajaTP-z9S4lm_5RyxfPm687ujH6pk9bHF3kRVx_F5z3q0xY_yrlyLRWOmEtZtGPxqjVIlOAX5YlB1htqeHpK51KLOvyDyihStQpDyGvgJyejlDPJUkTP0Xoh',
    disabled: true, disabledReason: 'Recipe missing - cannot deduct stock',
  },
  {
    id: 'eggs', name: 'Eggs 6-pack', category: 'Dairy & Eggs', stockLabel: '14 left', price: 22,
    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0-Lz47x6RcePml0tSaLpubykIJW2kux-rjbugE2Txv0udy8p-BjeJKj-OYOVEcjPWp2MdguBN7KlN8c_uInvorfZ3LbF4mjDXPrrdOwz60ygo_iwAJbPCFXL74mFnAK72Brh7HJ4AMWZ9IGxUbSjfsC3a0iWXxfJYz-faMGEZBWE7w2sshyabMH9UtxbI1iFAHF7lnSPX68TWQo-DItAIXzmfQBXxGBDyfCAvO9Uhqn-PbDPd_xZz',
    badge: '14 left', badgeBg: colors.surfaceContainerHighest, badgeText: colors.onSurface,
  },
]

