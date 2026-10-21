import { useState } from 'react';
import { supabase } from '../lib/supabase.js';

const FEE_RATE = 0.05;

const fmt = (n) => Number(n).toFixed(2);

export default function CheckoutScreen({ listing, session, onBack, onOrderCreated }) {
  const [payMethod, setPayMethod] = useState('card');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const itemPrice = Number(listing.price);
  const fee       = Math.round(itemPrice * FEE_RATE * 100) / 100;
  const total     = itemPrice + fee;
  const sellerId  = listing.user_id || listing.seller_id;

  const handlePay = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      // Reserve the listing atomically — only succeeds if it's still active
      const { error: resErr, count } = await supabase
        .from('listings')
        .update({ status: 'reserved' })
        .eq('id', listing.id)
        .eq('status', 'active')
        .select('id', { count: 'exact', head: true });
      if (resErr) throw resErr;
      if (count === 0) throw new Error('This listing is no longer available.');

      // TODO: Stripe PaymentIntent creation + confirmation goes here
      // For now we simulate a successful capture and create the order directly

      const { data: order, error: ordErr } = await supabase
        .from('orders')
        .insert({
          listing_id:       listing.id,
          buyer_id:         session.user.id,
          seller_id:        sellerId,
          item_price:       itemPrice,
          service_fee:      fee,
          total_paid:       total,
          currency:         'EUR',
          status:           'payment_held',
        })
        .select()
        .single();
      if (ordErr) throw ordErr;

      onOrderCreated(order);
    } catch (e) {
      // Roll back listing reservation on failure
      await supabase.from('listings').update({ status: 'active' }).eq('id', listing.id);
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div className="checkout-wrap">
      <div className="checkout-inner">
        <button type="button" className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="checkout-title">Checkout</h2>

        {/* Item summary */}
        <div className="checkout-item-card">
          {listing.photos?.[0] ? (
            <img
              src={listing.photos[0]}
              alt={`${listing.brand} ${listing.model}`}
              className="checkout-item-img"
            />
          ) : (
            <div className="checkout-item-img checkout-item-img--placeholder" />
          )}
          <div className="checkout-item-info">
            <p className="checkout-item-brand">{listing.brand}</p>
            <p className="checkout-item-model">{listing.model}</p>
            <p className="checkout-item-meta">{listing.size_system} {listing.size} · {listing.condition}</p>
            <p className="checkout-item-location">Pickup: {listing.pickup_location}</p>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="checkout-price-box">
          <div className="price-row">
            <span>Item price</span>
            <span>€{fmt(itemPrice)}</span>
          </div>
          <div className="price-row">
            <span>Buyer protection (5%)</span>
            <span>€{fmt(fee)}</span>
          </div>
          <div className="price-row price-total">
            <span>Total</span>
            <span>€{fmt(total)}</span>
          </div>
        </div>

        {/* Escrow trust statement */}
        <div className="escrow-box">
          <span className="escrow-icon" aria-hidden="true">🔒</span>
          <p>
            <strong>Payment held securely.</strong><br />
            Your €{fmt(total)} is held by Sneaky Sneaker Swap and released to the seller
            <em> only after both of you confirm the handover in person.</em>
          </p>
        </div>

        {/* Payment method */}
        <div className="pay-methods">
          {[
            { key: 'card',       label: '💳  Card' },
            { key: 'apple-pay',  label: ' Apple Pay' },
            { key: 'google-pay', label: 'G  Google Pay' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`pay-method-btn${payMethod === key ? ' pay-method-btn--active' : ''}`}
              onClick={() => setPayMethod(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {payMethod === 'card' && (
          <div className="card-field-mock">
            <input className="field" placeholder="1234  5678  9012  3456" disabled />
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="field" placeholder="MM / YY" disabled />
              <input className="field" placeholder="CVC" disabled />
            </div>
            <p className="field-hint">Secure card input via Stripe — coming soon</p>
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        <button
          type="button"
          className="primary-btn checkout-pay-btn"
          onClick={handlePay}
          disabled={loading}
        >
          {loading ? 'Processing…' : `Pay €${fmt(total)}`}
        </button>

        <p className="checkout-legal">
          By paying you agree to our terms. Payments are processed securely.
          Your money is protected until you confirm the handover.
        </p>
      </div>
    </div>
  );
}
