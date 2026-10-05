import { useState } from 'react'

type Category = 'all' | 'bakery' | 'dairy' | 'pantry' | 'kota' | 'beverages'

interface CartItem {
  id: string
  name: string
  unit: number
  qty: number
}

const INITIAL_CART: CartItem[] = [
  { id: 'bread', name: 'White Bread 700g', unit: 17.0, qty: 1 },
  { id: 'kota', name: 'Kota Special', unit: 35.0, qty: 1 },
]

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bakery', label: 'Bakery' },
  { key: 'dairy', label: 'Dairy & Eggs' },
  { key: 'pantry', label: 'Pantry & Grains' },
  { key: 'kota', label: 'Kota & Hot Food' },
  { key: 'beverages', label: 'Beverages' },
]

const PHOTO_PRODUCTS = [
  { id: 'bread', name: 'White Bread 700g', icon: 'bakery_dining' },
  { id: 'milk', name: 'Fresh Milk 1L', icon: 'local_drink' },
  { id: 'coke', name: 'Coca-Cola 330ml', icon: 'local_bar' },
  { id: 'kota', name: 'Kota Special', icon: 'lunch_dining' },
  { id: 'russian', name: 'Russian & Chips', icon: 'fastfood' },
  { id: 'eggs', name: 'Eggs 6-pack', icon: 'egg' },
]

export default function Sales() {
  const [category, setCategory] = useState<Category>('all')
  const [cart, setCart] = useState<CartItem[]>(INITIAL_CART)
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [ingredientsOpen, setIngredientsOpen] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [photoManagerOpen, setPhotoManagerOpen] = useState(false)
  const [photoMessage, setPhotoMessage] = useState('')
  const [productImages, setProductImages] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sisonke-product-images') || '{}')
    } catch {
      return {}
    }
  })

  const total = cart.reduce((sum, i) => sum + i.unit * i.qty, 0)

  function addToCart(id: string, name: string, unit: number) {
    setCart(prev => {
      const existing = prev.find(i => i.id === id)
      if (existing) return prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id, name, unit, qty: 1 }]
    })
    setDrawerOpen(true)
  }

  function changeQty(id: string, delta: number) {
    setCart(prev =>
      prev
        .map(i => i.id === id ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    )
  }

  function confirmSale() {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2800)
  }

  function updateProductImage(productId: string, file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setPhotoMessage('Please choose an image file.')
      return
    }
    if (file.size > 1_500_000) {
      setPhotoMessage('Please choose an image smaller than 1.5 MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const next = { ...productImages, [productId]: String(reader.result) }
      try {
        localStorage.setItem('sisonke-product-images', JSON.stringify(next))
        setProductImages(next)
        setPhotoMessage('Product photo saved on this device.')
      } catch {
        setPhotoMessage('This image could not be saved. Try a smaller file.')
      }
    }
    reader.readAsDataURL(file)
  }

  function removeProductImage(productId: string) {
    const next = { ...productImages }
    delete next[productId]
    localStorage.setItem('sisonke-product-images', JSON.stringify(next))
    setProductImages(next)
    setPhotoMessage('Custom photo removed.')
  }

  return (
    <main className="flex flex-col relative w-full pt-16 pb-20 bg-bg-base lg:pl-64 lg:pt-0 lg:pb-0">
      <div className="flex flex-col w-full relative lg:max-w-7xl lg:mx-auto lg:py-space-lg">
        {/* Search & Barcode */}
        <div className="px-space-md pt-space-xs pb-space-sm bg-bg-surface shadow-sm lg:mr-96 lg:rounded-xl lg:mx-space-lg">
          <div className="flex items-center gap-space-xs">
            <div className="flex-1 flex items-center bg-surface-container-low rounded-lg px-space-sm h-12">
              <span className="material-symbols-outlined text-text-secondary text-[22px] shrink-0">search</span>
              <input
                className="w-full bg-transparent px-space-xs font-body text-body text-text-primary placeholder:text-text-secondary focus:outline-none"
                placeholder="Search item or scan barcode..."
                type="text"
              />
              <button aria-label="Clear search" className="text-text-secondary hover:text-text-primary p-1" type="button">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <button aria-label="Scan barcode" className="h-12 w-12 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 active:scale-95 transition-transform" type="button">
              <span className="material-symbols-outlined text-[24px]">barcode_scanner</span>
            </button>
          </div>
          {/* Category Pills */}
          <div className="flex items-center gap-space-xs overflow-x-auto pt-space-sm pb-1 no-scrollbar -mx-space-md px-space-md">
            {CATEGORIES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`shrink-0 h-9 px-space-sm rounded-lg font-label text-label flex items-center gap-1 transition-colors ${
                  category === key
                    ? 'bg-accent-tint text-primary font-label-bold text-label-bold shadow-sm'
                    : 'bg-surface-container-low text-text-secondary hover:text-text-primary'
                }`}
              >
                <span>{label}</span>
                {category === key && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="px-space-md pt-space-md pb-44 lg:mr-96 lg:pb-space-lg lg:px-space-lg">
          <div className="flex items-center justify-between pb-space-xs">
            <span className="font-label-bold text-label-bold text-text-primary">Quick Tap Catalog</span>
            <button
              onClick={() => {
                setPhotoMessage('')
                setPhotoManagerOpen(true)
              }}
              className="h-9 px-space-sm rounded-lg border border-border-default bg-bg-surface text-primary font-label-bold text-label flex items-center gap-space-xs hover:bg-accent-tint"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
              <span>Product photos</span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-space-sm md:grid-cols-3 xl:grid-cols-4">
            {/* White Bread */}
            <button
              onClick={() => addToCart('bread', 'White Bread 700g', 17.0)}
              className="flex flex-col text-left p-space-md rounded-xl bg-bg-surface shadow-sm active:bg-accent-tint/30 transition-all relative overflow-hidden group"
              type="button"
            >
              <div className="h-20 w-full rounded-lg bg-surface-container-low mb-space-xs overflow-hidden relative">
                <img className="w-full h-full object-cover" src={productImages.bread || "https://lh3.googleusercontent.com/aida-public/AB6AXuC2lDs3Kx5thKp0TTKr6JWdjkGtfc-oG_UyRukFC1xYhTu7ZBNtxGTqwDI2N9Xgn189ef0yLzqjoNZMe9vFlMWO6I-msI4eGa1_cyCY5e28r0t16qDGOwWXcjZqoM7S5ZhcOPhESoMxXGdgdOKJvGeeU9btrdYipJkJApzJKYa7dz3gmHAyomAvo_EtBtS05CxsahUz9g9zy23cN3vjk5OQwZFToB3zqBjOUBPff-EkA7IsM2oid4nw"} alt="White Bread" />
                <span className="absolute top-1 right-1 bg-secondary text-on-secondary font-caption-medium text-caption-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">check</span>In stock
                </span>
              </div>
              <span className="font-label-bold text-label-bold text-text-primary line-clamp-1">White Bread 700g</span>
              <span className="font-caption text-caption text-text-secondary">Bakery • 18 left</span>
              <div className="mt-space-xs flex items-center justify-between">
                <span className="font-h2 text-h2 text-text-primary">R17.00</span>
                <span className="w-8 h-8 rounded-full bg-accent-tint text-primary flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">+</span>
              </div>
            </button>

            {/* Fresh Milk */}
            <button
              onClick={() => addToCart('milk', 'Fresh Milk 1L', 15.5)}
              className="flex flex-col text-left p-space-md rounded-xl bg-bg-surface shadow-sm active:bg-accent-tint/30 transition-all relative overflow-hidden group"
              type="button"
            >
              <div className="h-20 w-full rounded-lg bg-surface-container-low mb-space-xs overflow-hidden relative">
                <img className="w-full h-full object-cover" src={productImages.milk || "https://lh3.googleusercontent.com/aida-public/AB6AXuCSRun0pjw7KCVk8AMRf5oyHEtoL6iA9_D9YFlWpSWIYZm_tKM_UlF7QfzGe0GnpVRyKaIaaYz7S7Ma5vxbwor_YNzFc16KGz_SNmUxviyWFLN9b5POMWWCAnRZOOJETfdIbTD4eO73daNdmbM267zfwrxQWusTkp5ijACmnmIntqDRwLB01QDiMWUJY8kTMc4eXlF4nYS2A_KHf_W8da_xl8tErgchcrNhNw0FaLEDIffdJKuKvy5t"} alt="Fresh Milk" />
                <span className="absolute top-1 right-1 bg-surface-container-highest text-on-surface font-caption-medium text-caption-medium px-1.5 py-0.5 rounded-full">9 left</span>
              </div>
              <span className="font-label-bold text-label-bold text-text-primary line-clamp-1">Fresh Milk 1L</span>
              <span className="font-caption text-caption text-text-secondary">Dairy • Full Cream</span>
              <div className="mt-space-xs flex items-center justify-between">
                <span className="font-h2 text-h2 text-text-primary">R15.50</span>
                <span className="w-8 h-8 rounded-full bg-accent-tint text-primary flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">+</span>
              </div>
            </button>

            {/* Coca-Cola */}
            <button
              onClick={() => addToCart('coke', 'Coca-Cola 330ml', 13.0)}
              className="flex flex-col text-left p-space-md rounded-xl bg-bg-surface shadow-sm active:bg-accent-tint/30 transition-all relative overflow-hidden group"
              type="button"
            >
              <div className="h-20 w-full rounded-lg bg-surface-container-low mb-space-xs overflow-hidden relative">
                <img className="w-full h-full object-cover" src={productImages.coke || "https://lh3.googleusercontent.com/aida-public/AB6AXuBc-dprPUKNpyvotLLe3XfnKrznVTZzOvGMDt349DjBBuypHaSiRMq6DTH-OU_2V-HaoeBqedAd_TVVj0mZttDxhE-Fcy-k3oDZTx2jJR50cK6fkfwWhU2T4NGly6tGBIozesesaqsVktBmYtQB93qKAtzAjVU9Dpx3HIN6FZwV9PFV2MclAhwNfVygBqFn_SzcaASinHPhDV4t10cSN8718YBxC3P7ERlxqnYNYR5-ZCEiZ5kghl0-"} alt="Coca-Cola" />
                <span className="absolute top-1 right-1 bg-secondary text-on-secondary font-caption-medium text-caption-medium px-1.5 py-0.5 rounded-full">32 left</span>
              </div>
              <span className="font-label-bold text-label-bold text-text-primary line-clamp-1">Coca-Cola 330ml</span>
              <span className="font-caption text-caption text-text-secondary">Cold Drinks • Can</span>
              <div className="mt-space-xs flex items-center justify-between">
                <span className="font-h2 text-h2 text-text-primary">R13.00</span>
                <span className="w-8 h-8 rounded-full bg-accent-tint text-primary flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">+</span>
              </div>
            </button>

            {/* Kota Special */}
            <button
              onClick={() => addToCart('kota', 'Kota Special', 35.0)}
              className="flex flex-col text-left p-space-md rounded-xl bg-bg-surface shadow-sm active:bg-accent-tint/30 transition-all relative overflow-hidden group"
              type="button"
            >
              <div className="h-20 w-full rounded-lg bg-surface-container-low mb-space-xs overflow-hidden relative">
                <img className="w-full h-full object-cover" src={productImages.kota || "https://lh3.googleusercontent.com/aida-public/AB6AXuBoe3ECGaQypyFJnbv4MWHXeN9cuI1VKTHmZhL1yTcMZn0QfrRTz_bH9A4vGSUH_wPxsQv1816y3Bt__57ERWui33heHk6ZoCgoApTa8sxFLkZZAkVfDgmnYbQtsOUm1zxCqip9WaGzvOcb3q74ev0eosnTfzjoj36g6jNTWh4_On1P71Hbs8l-J1mJBZnFXsDDNfBsE96nlIdlA5Fb9RNDWL98Q-xszK3yDY0NTOYKGVEX"} alt="Kota Special" />
                <span className="absolute top-1 right-1 bg-accent-tint text-primary font-caption-medium text-caption-medium px-1.5 py-0.5 rounded-full">Recipe linked</span>
              </div>
              <span className="font-label-bold text-label-bold text-text-primary line-clamp-1">Kota Special</span>
              <span className="font-caption text-caption text-text-secondary line-clamp-1">Chips, polony, cheese</span>
              <div className="mt-space-xs flex items-center justify-between">
                <span className="font-h2 text-h2 text-text-primary">R35.00</span>
                <span className="w-8 h-8 rounded-full bg-accent-tint text-primary flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">+</span>
              </div>
            </button>

            {/* Russian & Chips - Disabled */}
            <div className="flex flex-col text-left p-space-md rounded-xl bg-bg-surface/60 opacity-80 relative shadow-sm">
              <div className="h-20 w-full rounded-lg bg-surface-container-low mb-space-xs overflow-hidden relative">
                <img className="w-full h-full object-cover grayscale" src={productImages.russian || "https://lh3.googleusercontent.com/aida-public/AB6AXuABt4T9cNkMxeIcx7qKxsh79ly1T-fql7lqNkNGVB_58caBynSiWvKwm6cZP9PLgTR3JX4XJJqky8bigkj5YhTvwhiCCNaymGT_ncw19tr0aQMbT0otJoYL5cNRs55PajaTP-z9S4lm_5RyxfPm687ujH6pk9bHF3kRVx_F5z3q0xY_yrlyLRWOmEtZtGPxqjVIlOAX5YlB1htqeHpK51KLOvyDyihStQpDyGvgJyejlDPJUkTP0Xoh"} alt="Russian & Chips" />
                <span className="absolute inset-0 bg-surface-dim/40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-error text-[28px]">lock</span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-label-bold text-label-bold text-text-primary line-clamp-1">Russian & Chips</span>
              </div>
              <div className="mt-1 p-1.5 rounded-lg bg-error-tint flex items-start gap-1">
                <span className="material-symbols-outlined text-error-default text-[14px] shrink-0 mt-0.5">warning</span>
                <span className="font-caption text-caption text-error-default leading-tight">Recipe missing - cannot deduct stock</span>
              </div>
              <div className="mt-auto pt-space-xs flex items-center justify-between">
                <span className="font-h2 text-h2 text-text-secondary">R28.00</span>
                <button className="h-8 px-2 rounded-lg bg-border-disabled text-on-surface-variant font-caption-medium text-caption-medium cursor-not-allowed" disabled type="button">Blocked</button>
              </div>
            </div>

            {/* Eggs */}
            <button
              onClick={() => addToCart('eggs', 'Eggs 6-pack', 22.0)}
              className="flex flex-col text-left p-space-md rounded-xl bg-bg-surface shadow-sm active:bg-accent-tint/30 transition-all relative overflow-hidden group"
              type="button"
            >
              <div className="h-20 w-full rounded-lg bg-surface-container-low mb-space-xs overflow-hidden relative">
                <img className="w-full h-full object-cover" src={productImages.eggs || "https://lh3.googleusercontent.com/aida-public/AB6AXuC0-Lz47x6RcePml0tSaLpubykIJW2kux-rjbugE2Txv0udy8p-BjeJKj-OYOVEcjPWp2MdguBN7KlN8c_uInvorfZ3LbF4mjDXPrrdOwz60ygo_iwAJbPCFXL74mFnAK72Brh7HJ4AMWZ9IGxUbSjfsC3a0iWXxfJYz-faMGEZBWE7w2sshyabMH9UtxbI1iFAHF7lnSPX68TWQo-DItAIXzmfQBXxGBDyfCAvO9Uhqn-PbDPd_xZz"} alt="Eggs 6-pack" />
                <span className="absolute top-1 right-1 bg-surface-container-highest text-on-surface font-caption-medium text-caption-medium px-1.5 py-0.5 rounded-full">14 left</span>
              </div>
              <span className="font-label-bold text-label-bold text-text-primary line-clamp-1">Eggs 6-pack</span>
              <span className="font-caption text-caption text-text-secondary">Dairy & Eggs</span>
              <div className="mt-space-xs flex items-center justify-between">
                <span className="font-h2 text-h2 text-text-primary">R22.00</span>
                <span className="w-8 h-8 rounded-full bg-accent-tint text-primary flex items-center justify-center font-bold text-lg group-hover:scale-105 transition-transform">+</span>
              </div>
            </button>
          </div>
        </div>

        {/* Cart Drawer */}
        <div className="fixed inset-x-0 bottom-16 z-40 bg-bg-surface rounded-t-2xl shadow-[0_-4px_16px_rgba(45,55,72,0.12)] flex flex-col lg:left-auto lg:right-0 lg:top-0 lg:bottom-0 lg:w-96 lg:rounded-none lg:border-l lg:border-border-default lg:shadow-none">
          <button
            onClick={() => setDrawerOpen(o => !o)}
            className="w-full py-2.5 px-space-md flex flex-col items-center justify-center bg-bg-surface rounded-t-2xl focus:outline-none lg:rounded-none"
            type="button"
          >
            <div className="w-10 h-1 bg-border-disabled rounded-full mb-1 lg:hidden" />
            <div className="w-full flex items-center justify-between">
              <div className="flex items-center gap-space-xs">
                <span className="font-label-bold text-label-bold text-text-primary">Current Cart</span>
                <span className="px-2 py-0.5 rounded-full bg-accent-tint text-primary font-caption-medium text-caption-medium">{cart.length} items</span>
              </div>
              <div className="flex items-center gap-1 text-text-secondary">
                <span className="font-caption text-caption">{drawerOpen ? 'Hide details' : 'Show items'}</span>
                <span className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${drawerOpen ? '' : 'rotate-180'}`}>keyboard_arrow_down</span>
              </div>
            </div>
          </button>

          {drawerOpen && (
            <div className="overflow-y-auto px-space-md pb-space-sm space-y-space-sm max-h-[40vh]">
              {cart.map(item => (
                <div key={item.id} className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between gap-space-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-label-bold text-label-bold text-text-primary truncate">{item.name}</p>
                      <p className="font-caption text-caption text-text-secondary">Unit: R{item.unit.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center bg-bg-surface rounded-lg shadow-sm">
                      <button
                        onClick={() => changeQty(item.id, -1)}
                        aria-label="Decrease"
                        className="w-12 h-12 flex items-center justify-center text-text-primary active:bg-surface-container transition-colors rounded-l-lg"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">remove</span>
                      </button>
                      <span className="w-8 text-center font-label-bold text-label-bold text-text-primary">{item.qty}</span>
                      <button
                        onClick={() => changeQty(item.id, 1)}
                        aria-label="Increase"
                        className="w-12 h-12 flex items-center justify-center text-text-primary active:bg-surface-container transition-colors rounded-r-lg"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                      </button>
                    </div>
                    <div className="w-16 text-right font-label-bold text-label-bold text-text-primary">
                      R{(item.unit * item.qty).toFixed(2)}
                    </div>
                  </div>
                  {item.id === 'kota' && (
                    <div className="mt-1 p-space-xs bg-bg-surface rounded-lg">
                      <button
                        onClick={() => setIngredientsOpen(o => !o)}
                        className="w-full flex items-center justify-between text-left focus:outline-none"
                        type="button"
                      >
                        <div className="flex items-center gap-1.5 text-primary">
                          <span className="material-symbols-outlined text-[16px]">inventory</span>
                          <span className="font-caption-medium text-caption-medium">Ingredient deductions</span>
                        </div>
                        <span className={`material-symbols-outlined text-text-secondary text-[16px] transition-transform ${ingredientsOpen ? '' : 'rotate-180'}`}>expand_more</span>
                      </button>
                      {ingredientsOpen && (
                        <div className="mt-2 text-caption text-text-secondary font-caption leading-relaxed pl-1">
                          Quarter loaf, 50g polony, 1 slice cheese, 100g slap chips will be deducted.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sale Total Bar */}
          <div className="p-space-md bg-bg-surface shadow-[0_-2px_8px_rgba(45,55,72,0.12)] z-10 flex flex-col gap-space-xs">
            <div className="flex items-baseline justify-between">
              <div className="flex items-center gap-2">
                <span className="font-caption text-caption text-text-secondary">Summary ({cart.length} items)</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-success-tint text-secondary font-caption-medium text-caption-medium">Cash Sale</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-caption text-caption text-text-secondary">Total:</span>
                <span className="font-h1 text-h1 text-text-primary">R{total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={confirmSale}
              className="w-full h-12 rounded-lg bg-primary text-on-primary font-label-bold text-label-bold flex items-center justify-center gap-space-xs active:bg-accent-pressed transition-colors shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">payments</span>
              <span>Confirm Sale (R{total.toFixed(2)})</span>
            </button>
          </div>
        </div>

        {photoManagerOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center p-space-md bg-on-background/40 backdrop-blur-sm"
            onClick={event => {
              if (event.target === event.currentTarget) setPhotoManagerOpen(false)
            }}
          >
            <div className="w-full max-w-2xl max-h-[85dvh] overflow-y-auto bg-bg-surface rounded-2xl p-space-md lg:p-space-lg shadow-xl">
              <div className="flex items-start justify-between gap-space-md mb-space-md">
                <div>
                  <h2 className="font-h2 text-h2 text-text-primary">Product photos</h2>
                  <p className="font-caption text-caption text-text-secondary mt-1">
                    Add your own image for each product. Photos are saved on this device.
                  </p>
                </div>
                <button
                  onClick={() => setPhotoManagerOpen(false)}
                  aria-label="Close product photos"
                  className="w-10 h-10 rounded-lg bg-surface-container-low text-text-secondary flex items-center justify-center hover:text-text-primary"
                  type="button"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                {PHOTO_PRODUCTS.map(product => (
                  <div
                    key={product.id}
                    className="p-space-sm rounded-xl border border-border-default flex items-center gap-space-sm"
                  >
                    <div className="w-16 h-16 rounded-lg bg-surface-container-low overflow-hidden shrink-0 flex items-center justify-center text-primary">
                      {productImages[product.id] ? (
                        <img className="w-full h-full object-cover" src={productImages[product.id]} alt="" />
                      ) : (
                        <span className="material-symbols-outlined text-[28px]">{product.icon}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-label-bold text-label-bold text-text-primary truncate">{product.name}</div>
                      <div className="flex items-center gap-space-xs mt-space-xs">
                        <label className="h-9 px-space-sm rounded-lg bg-primary text-on-primary font-caption-medium text-caption-medium flex items-center gap-1.5 cursor-pointer hover:bg-accent-pressed">
                          <span className="material-symbols-outlined text-[17px]">upload</span>
                          <span>{productImages[product.id] ? 'Replace' : 'Add photo'}</span>
                          <input
                            className="sr-only"
                            type="file"
                            accept="image/*"
                            onChange={event => updateProductImage(product.id, event.target.files?.[0])}
                          />
                        </label>
                        {productImages[product.id] && (
                          <button
                            onClick={() => removeProductImage(product.id)}
                            className="h-9 px-space-xs rounded-lg text-error-default font-caption-medium text-caption-medium hover:bg-error-tint"
                            type="button"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {photoMessage && (
                <div className="mt-space-md p-space-sm rounded-lg bg-accent-tint text-primary font-caption-medium text-caption-medium flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  {photoMessage}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toast */}
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-inverse-surface text-inverse-on-surface px-space-md py-space-sm rounded-xl shadow-lg flex items-center gap-space-xs transition-all duration-300 ${toastVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <span className="material-symbols-outlined text-secondary-fixed text-[20px]">check_circle</span>
          <span className="font-label text-label">Sale of R{total.toFixed(2)} recorded & stock deducted!</span>
        </div>
      </div>
    </main>
  )
}
