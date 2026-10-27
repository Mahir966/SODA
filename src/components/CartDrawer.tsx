import React, { useState } from 'react';
import {
  FLAVORS,
  PACK_OPTIONS,
  PROMO_CODES,
  type CartItem,
  type FlavorId,
  type PackSizeId,
} from '../data/sodaData';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeFlavor: FlavorId;
  onSelectFlavor: (flavor: FlavorId) => void;
  cart: CartItem[];
  onAddToCart: (flavorId: FlavorId, packId: PackSizeId, quantity: number) => void;
  onUpdateQuantity: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  activeFlavor,
  onSelectFlavor,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [selectedFlavor, setSelectedFlavor] = useState<FlavorId>(activeFlavor);
  const [selectedPack, setSelectedPack] = useState<PackSizeId>('pack12');
  const [builderQty, setBuilderQty] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingZip, setShippingZip] = useState('');
  const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});
  const [preparedOrderSummary, setPreparedOrderSummary] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Sync builder flavor when activeFlavor changes externally
  React.useEffect(() => {
    setSelectedFlavor(activeFlavor);
  }, [activeFlavor]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((sum, item) => {
    const pack = PACK_OPTIONS.find((p) => p.id === item.packId);
    return sum + (pack ? pack.price * item.quantity : 0);
  }, 0);

  const promoObj = appliedPromo ? PROMO_CODES[appliedPromo] : null;
  const discountAmount = promoObj ? +(subtotal * (promoObj.discountPercent / 100)).toFixed(2) : 0;
  const discountedSubtotal = Math.max(0, +(subtotal - discountAmount).toFixed(2));

  const qualifiesFreeShipping =
    discountedSubtotal >= 29.99 || Boolean(promoObj?.freeShipping) || cart.length === 0;
  const shippingCost = qualifiesFreeShipping ? 0 : 4.99;
  const finalTotal = +(discountedSubtotal + shippingCost).toFixed(2);
  const freeShippingRemaining = Math.max(0, +(29.99 - discountedSubtotal).toFixed(2));

  const currentPackObj = PACK_OPTIONS.find((p) => p.id === selectedPack) || PACK_OPTIONS[0];

  const handleQuickAdd = () => {
    onAddToCart(selectedFlavor, selectedPack, builderQty);
    const flavorName = FLAVORS[selectedFlavor].name;
    setAddedFeedback(`Added ${builderQty} × ${flavorName} (${currentPackObj.label}) to cart`);
    setTimeout(() => setAddedFeedback(null), 2600);
  };

  const handleApplyPromo = (codeToApply?: string) => {
    const raw = (codeToApply ?? promoInput).trim().toUpperCase();
    if (!raw) {
      setPromoFeedback({ type: 'error', message: 'Please enter a promo code.' });
      return;
    }
    const found = PROMO_CODES[raw];
    if (!found) {
      setPromoFeedback({
        type: 'error',
        message: `Invalid code "${raw}". Try REFRESH10, PUREZERO, or FREESHIP.`,
      });
      return;
    }
    setAppliedPromo(found.code);
    setPromoInput(found.code);
    setPromoFeedback({
      type: 'success',
      message: `Applied ${found.code}: ${found.description}`,
    });
  };

  const validateCheckout = () => {
    const errs: Record<string, string> = {};
    if (cart.length === 0) {
      errs.cart = 'Your cart is empty. Add at least one item before preparing an order.';
    }
    if (customerName.trim().length < 2) {
      errs.name = 'Please enter your full name (at least 2 characters).';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (shippingAddress.trim().length < 5) {
      errs.address = 'Please enter a valid street address.';
    }
    if (shippingCity.trim().length < 2) {
      errs.city = 'Please enter your city.';
    }
    if (shippingZip.trim().length < 3) {
      errs.zip = 'Please enter a valid postal / ZIP code.';
    }
    setCheckoutErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePrepareOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCheckout()) return;

    const lines = cart.map((item) => {
      const f = FLAVORS[item.flavorId];
      const p = PACK_OPTIONS.find((pk) => pk.id === item.packId)!;
      return `- ${item.quantity}x ${f.name} — ${p.label} ($${(p.price * item.quantity).toFixed(2)})`;
    });

    const summaryText = [
      `SODA ORDER QUOTE / DRAFT`,
      `Customer: ${customerName.trim()} (${customerEmail.trim()})`,
      `Ship To: ${shippingAddress.trim()}, ${shippingCity.trim()} ${shippingZip.trim()}`,
      `Items:`,
      ...lines,
      `Subtotal: $${subtotal.toFixed(2)}`,
      ...(discountAmount > 0 ? [`Promo (${appliedPromo}): -$${discountAmount.toFixed(2)}`] : []),
      `Shipping: ${shippingCost === 0 ? 'FREE' : `$${shippingCost.toFixed(2)}`}`,
      `Total Estimate: $${finalTotal.toFixed(2)}`,
    ].join('\n');

    try {
      const existingDrafts = JSON.parse(localStorage.getItem('soda_order_drafts') || '[]');
      existingDrafts.unshift({
        createdAt: new Date().toISOString(),
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        total: finalTotal,
        summaryText,
      });
      localStorage.setItem('soda_order_drafts', JSON.stringify(existingDrafts.slice(0, 10)));
    } catch {
      // Ignore storage errors
    }

    setPreparedOrderSummary(summaryText);
  };

  const handleCopySummary = async () => {
    if (!preparedOrderSummary) return;
    try {
      await navigator.clipboard.writeText(preparedOrderSummary);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch {
      setCopiedSummary(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex justify-end bg-black/65 backdrop-blur-sm transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-white/15 bg-[#041d19]/95 p-6 text-white shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-xs font-bold tracking-widest uppercase text-[#fbcfe8]">
              Pure Zero Shop
            </span>
            <h2 id="cart-drawer-title" className="font-['Outfit'] text-2xl font-extrabold">
              {isCheckoutStep ? 'Order & Checkout' : 'Select Cans & Cart'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shopping cart"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-lg text-white transition hover:border-[#fbcfe8] hover:bg-[#fbcfe8] hover:text-[#011d17]"
          >
            ✕
          </button>
        </div>

        {!isCheckoutStep ? (
          <div className="flex flex-1 flex-col gap-6 pt-5">
            {/* Product Configurator */}
            <div className="rounded-3xl border border-white/15 bg-white/5 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider uppercase text-white/70">
                  1. Choose Flavor
                </span>
                <span className="text-xs text-[#fbcfe8]">Switches 3D Can</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {(['classic', 'blue'] as FlavorId[]).map((fId) => {
                  const fl = FLAVORS[fId];
                  const isSel = selectedFlavor === fId;
                  return (
                    <button
                      key={fId}
                      type="button"
                      onClick={() => {
                        setSelectedFlavor(fId);
                        onSelectFlavor(fId);
                      }}
                      className={`flex items-center gap-3 rounded-2xl border p-2.5 text-left transition ${
                        isSel
                          ? 'border-[#fbcfe8] bg-white/15 shadow-lg'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <img
                        src={fl.image}
                        alt={fl.name}
                        className="h-12 w-12 object-contain drop-shadow"
                      />
                      <div>
                        <div className="text-sm font-bold text-white">{fl.name}</div>
                        <div className="text-xs text-white/65">{fl.tagline}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pack Size Selection */}
              <div className="mt-4">
                <span className="mb-2 block text-xs font-bold tracking-wider uppercase text-white/70">
                  2. Choose Pack Size
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {PACK_OPTIONS.map((pack) => {
                    const isPackSel = selectedPack === pack.id;
                    return (
                      <button
                        key={pack.id}
                        type="button"
                        onClick={() => setSelectedPack(pack.id)}
                        className={`flex flex-col justify-between rounded-2xl border p-2.5 text-left transition ${
                          isPackSel
                            ? 'border-[#fbcfe8] bg-[#fbcfe8]/15'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white">{pack.label}</span>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span className="font-['Outfit'] text-base font-extrabold text-[#fbcfe8]">
                            ${pack.price.toFixed(2)}
                          </span>
                          {pack.badge && (
                            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/85">
                              {pack.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity + Add Button */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex items-center rounded-full border border-white/15 bg-black/30 px-2 py-1">
                  <button
                    type="button"
                    aria-label="Decrease quantity to add"
                    onClick={() => setBuilderQty((q) => Math.max(1, q - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-white hover:bg-white/10"
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-bold">{builderQty}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity to add"
                    onClick={() => setBuilderQty((q) => Math.min(20, q + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-white hover:bg-white/10"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleQuickAdd}
                  className="flex-1 rounded-full bg-[#fbcfe8] px-5 py-3 text-sm font-extrabold text-[#011d17] transition hover:brightness-105 active:scale-[0.99]"
                >
                  Add to Cart · ${(currentPackObj.price * builderQty).toFixed(2)}
                </button>
              </div>

              {addedFeedback && (
                <div
                  role="status"
                  className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-200"
                >
                  ✓ {addedFeedback}
                </div>
              )}
            </div>

            {/* Free shipping progress */}
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              {qualifiesFreeShipping && cart.length > 0 ? (
                <p className="text-xs font-semibold text-emerald-300">
                  ✓ Your order qualifies for FREE carbon-neutral shipping!
                </p>
              ) : (
                <div>
                  <p className="text-xs text-white/80">
                    Add{' '}
                    <strong className="text-[#fbcfe8]">${freeShippingRemaining.toFixed(2)}</strong>{' '}
                    more for <strong className="text-white">FREE shipping</strong> (or use code{' '}
                    <code className="text-[#fbcfe8]">FREESHIP</code>).
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-[#fbcfe8] transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (discountedSubtotal / 29.99) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold tracking-wider uppercase text-white/70">
                  Your Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)
                </h3>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-xs text-white/60 underline hover:text-[#fbcfe8]"
                  >
                    Clear all
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/60">
                  Your cart is currently empty. Choose a flavor and pack size above to add cans!
                </div>
              ) : (
                cart.map((item) => {
                  const fl = FLAVORS[item.flavorId];
                  const pk = PACK_OPTIONS.find((p) => p.id === item.packId)!;
                  return (
                    <div
                      key={item.key}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={fl.image}
                          alt={fl.name}
                          className="h-14 w-12 object-contain drop-shadow"
                        />
                        <div>
                          <div className="text-sm font-bold text-white">{fl.name}</div>
                          <div className="text-xs text-white/65">{pk.label}</div>
                          <div className="mt-0.5 text-xs font-semibold text-[#fbcfe8]">
                            ${pk.price.toFixed(2)} each
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/30 px-1.5 py-0.5">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${fl.name} ${pk.label}`}
                            onClick={() => onUpdateQuantity(item.key, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold hover:bg-white/15"
                          >
                            −
                          </button>
                          <span className="min-w-[1.5rem] text-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase quantity of ${fl.name} ${pk.label}`}
                            onClick={() => onUpdateQuantity(item.key, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold hover:bg-white/15"
                          >
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-['Outfit'] text-sm font-bold">
                            ${(pk.price * item.quantity).toFixed(2)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.key)}
                            aria-label={`Remove ${fl.name} ${pk.label} from cart`}
                            className="text-xs text-white/50 hover:text-rose-300"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Promo Code Box */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  placeholder="Promo code (REFRESH10, PUREZERO)"
                  aria-label="Promo code"
                  className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-xs text-white placeholder-white/45"
                />
                <button
                  type="button"
                  onClick={() => handleApplyPromo()}
                  className="rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition hover:border-[#fbcfe8] hover:bg-[#fbcfe8] hover:text-[#011d17]"
                >
                  Apply
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-white/55">Available codes:</span>
                {Object.keys(PROMO_CODES).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleApplyPromo(code)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold transition ${
                      appliedPromo === code
                        ? 'bg-[#fbcfe8] text-[#011d17]'
                        : 'bg-white/10 text-white/80 hover:bg-white/20'
                    }`}
                  >
                    {code}
                  </button>
                ))}
                {appliedPromo && (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedPromo(null);
                      setPromoInput('');
                      setPromoFeedback(null);
                    }}
                    className="ml-auto text-[11px] text-rose-300 underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              {promoFeedback && (
                <p
                  role="status"
                  className={`mt-2 text-xs ${
                    promoFeedback.type === 'success' ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {promoFeedback.message}
                </p>
              )}
            </div>

            {/* Totals & Proceed */}
            <div className="border-t border-white/15 pt-4">
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-white/75">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#fbcfe8]">
                    <span>Discount ({appliedPromo})</span>
                    <span>−${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white/75">
                  <span>Estimated Shipping</span>
                  <span>
                    {shippingCost === 0 ? (
                      <strong className="text-emerald-300">FREE</strong>
                    ) : (
                      `$${shippingCost.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 font-['Outfit'] text-lg font-extrabold text-white">
                  <span>Estimated Total</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={cart.length === 0}
                onClick={() => {
                  setPreparedOrderSummary(null);
                  setIsCheckoutStep(true);
                }}
                className="mt-4 w-full rounded-full bg-[#fbcfe8] py-3.5 text-sm font-extrabold text-[#011d17] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to Order Details · ${finalTotal.toFixed(2)}
              </button>
            </div>
          </div>
        ) : (
          /* Checkout / Order Preparation View */
          <div className="flex flex-1 flex-col gap-4 pt-5">
            <button
              type="button"
              onClick={() => setIsCheckoutStep(false)}
              className="w-fit text-xs font-semibold text-[#fbcfe8] hover:underline"
            >
              ← Back to Cart & Pack Selection
            </button>

            <div className="rounded-2xl border border-amber-300/30 bg-amber-400/10 p-3.5 text-xs leading-relaxed text-amber-100">
              <strong className="block font-bold text-amber-200">
                Payment Gateway Configuration Notice
              </strong>
              Live payment processing (e.g., Stripe Checkout API /{' '}
              <code>VITE_CHECKOUT_API_URL</code>) is not configured in this static browser
              environment. No payment card will be requested or charged. You can validate your
              shipping details below to generate an itemized order quote and dispatch it via your
              email client.
            </div>

            <form onSubmit={handlePrepareOrder} noValidate className="space-y-3.5">
              <div>
                <label
                  htmlFor="checkout-name"
                  className="mb-1 block text-xs font-semibold text-white/80"
                >
                  Full Name *
                </label>
                <input
                  id="checkout-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Elena Rostova"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/40"
                />
                {checkoutErrors.name && (
                  <p className="mt-1 text-xs text-rose-300">{checkoutErrors.name}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="checkout-email"
                  className="mb-1 block text-xs font-semibold text-white/80"
                >
                  Email Address *
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="elena@example.com"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/40"
                />
                {checkoutErrors.email && (
                  <p className="mt-1 text-xs text-rose-300">{checkoutErrors.email}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="checkout-address"
                  className="mb-1 block text-xs font-semibold text-white/80"
                >
                  Street Address *
                </label>
                <input
                  id="checkout-address"
                  type="text"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="742 Evergreen Terrace, Apt 4B"
                  className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/40"
                />
                {checkoutErrors.address && (
                  <p className="mt-1 text-xs text-rose-300">{checkoutErrors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="checkout-city"
                    className="mb-1 block text-xs font-semibold text-white/80"
                  >
                    City *
                  </label>
                  <input
                    id="checkout-city"
                    type="text"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="Portland"
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/40"
                  />
                  {checkoutErrors.city && (
                    <p className="mt-1 text-xs text-rose-300">{checkoutErrors.city}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="checkout-zip"
                    className="mb-1 block text-xs font-semibold text-white/80"
                  >
                    Postal / ZIP Code *
                  </label>
                  <input
                    id="checkout-zip"
                    type="text"
                    value={shippingZip}
                    onChange={(e) => setShippingZip(e.target.value)}
                    placeholder="97201"
                    className="w-full rounded-xl border border-white/15 bg-black/30 px-3.5 py-2.5 text-sm text-white placeholder-white/40"
                  />
                  {checkoutErrors.zip && (
                    <p className="mt-1 text-xs text-rose-300">{checkoutErrors.zip}</p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#fbcfe8] py-3.5 text-sm font-extrabold text-[#011d17] transition hover:brightness-105"
              >
                Validate & Prepare Order Quote (${finalTotal.toFixed(2)})
              </button>
            </form>

            {preparedOrderSummary && (
              <div
                role="region"
                aria-label="Prepared order quote"
                className="mt-2 space-y-3 rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-4"
              >
                <div className="text-xs font-bold text-emerald-200">
                  ✓ Order Quote Validated & Saved to Local Browser Storage
                </div>
                <p className="text-xs text-white/80">
                  Because no payment backend is connected, no real order or charge has been
                  processed. Use the actions below to copy your quote or send it via your email
                  client:
                </p>
                <pre className="max-h-40 overflow-y-auto rounded-xl bg-black/40 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-white/90">
                  {preparedOrderSummary}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20"
                  >
                    {copiedSummary ? '✓ Copied to Clipboard' : 'Copy Order Summary'}
                  </button>
                  <a
                    href={`mailto:orders@soda.example?subject=${encodeURIComponent(
                      `Soda Order Inquiry - ${customerName.trim()}`
                    )}&body=${encodeURIComponent(preparedOrderSummary)}`}
                    className="rounded-full bg-[#fbcfe8] px-4 py-2 text-xs font-extrabold text-[#011d17] hover:brightness-105"
                  >
                    Open in Email Client (mailto:)
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
    </div>
  );
};
