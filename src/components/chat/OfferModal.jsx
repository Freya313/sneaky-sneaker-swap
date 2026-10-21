import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';

export default function OfferModal({ listing, conversation, session, counterOffer, onClose, onSent }) {
  const [amount,  setAmount]  = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const isSeller    = conversation?.seller_id === session?.user?.id;
  const askingPrice = listing?.price || 0;

  const validate = (val) => {
    const n = Number(val);
    if (!val || isNaN(n) || n <= 0) return 'Enter a valid amount.';
    if (!isSeller) {
      if (n >= askingPrice) return `Offer must be below asking price (€${askingPrice}).`;
      if (n < askingPrice * 0.5) return `Offer must be at least 50% of asking price (€${(askingPrice * 0.5).toFixed(2)}).`;
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate(amount);
    if (err) { setError(err); return; }
    setLoading(true);

    // mark original offer as countered before creating the counter
    if (counterOffer) {
      await supabase.from('chat_offers').update({ status: 'countered' }).eq('id', counterOffer.id);
    }

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: offer, error: dbErr } = await supabase.from('chat_offers').insert({
      conversation_id: conversation.id,
      buyer_id: conversation.buyer_id,
      seller_id: conversation.seller_id,
      proposed_by_id: session.user.id,
      amount: Number(amount),
      expires_at: expires,
    }).select().single();

    setLoading(false);
    if (dbErr) { setError(dbErr.message); return; }
    onSent(offer);
  };

  return (
    <div className="listing-overlay" onClick={onClose}>
      <div className="listing-dialog offer-modal" role="dialog" aria-modal="true"
        onClick={(e) => e.stopPropagation()}>

        <div className="listing-dialog-top">
          <h3 className="feature-title" style={{ margin: 0 }}>
            {counterOffer ? 'Counter offer' : 'Make an offer'}
          </h3>
          <button type="button" className="link-btn" onClick={onClose}>Cancel</button>
        </div>

        {listing && (
          <div className="offer-modal-item">
            {listing.photos?.[0] && (
              <img src={listing.photos[0]} alt="" className="offer-modal-thumb" />
            )}
            <div>
              <p className="offer-modal-name">{listing.brand} {listing.model}</p>
              <p className="feature-text" style={{ margin: '2px 0 0' }}>
                Asking price: <strong>€{listing.price}</strong>
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="field-label">Your offer (€)</label>
          <input
            type="number"
            className="field"
            min="1"
            step="0.01"
            placeholder={isSeller
              ? 'Enter amount'
              : `${Math.ceil(askingPrice * 0.5)}–${askingPrice - 1}`}
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(''); }}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {!isSeller && (
            <p className="field-hint">
              Must be between €{Math.ceil(askingPrice * 0.5)} and €{askingPrice - 1}
            </p>
          )}
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="primary-btn"
            disabled={loading} style={{ width: '100%', marginTop: 12 }}>
            {loading ? 'Sending…' : counterOffer ? 'Send counter offer' : 'Send offer'}
          </button>
        </form>
      </div>
    </div>
  );
}
