import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const STEPS = [
  { key: 'payment_held',         label: 'Payment secured' },
  { key: 'awaiting_handover',    label: 'Meetup arranged' },
  { key: 'confirmed',            label: 'Handover confirmed' },
  { key: 'completed',            label: 'Complete' },
];

const DISPUTE_REASONS = [
  'Sneakers not received',
  'Counterfeit or not as described',
  'Wrong size or wrong item',
  'Seller did not attend the meetup',
  'Other',
];

function resolveStep(status) {
  if (['pending_payment', 'payment_held'].includes(status)) return 0;
  if (status === 'awaiting_handover') return 1;
  if (['buyer_confirmed_handover', 'seller_confirmed_handover'].includes(status)) return 2;
  if (status === 'completed') return 3;
  return 0;
}

const fmt = (n) => Number(n).toFixed(2);

export default function OrderScreen({ orderId, session, onBack, onStartChat }) {
  const [order,          setOrder]          = useState(null);
  const [listing,        setListing]        = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [meetupLocation, setMeetupLocation] = useState('');
  const [meetupTime,     setMeetupTime]     = useState('');
  const [savingMeetup,   setSavingMeetup]   = useState(false);
  const [showConfirm,    setShowConfirm]    = useState(false);
  const [showDispute,    setShowDispute]    = useState(false);
  const [disputeReason,  setDisputeReason]  = useState('');
  const [confirming,     setConfirming]     = useState(false);
  const [error,          setError]          = useState('');

  const uid = session.user.id;

  // Fetch order + listing
  useEffect(() => {
    const load = async () => {
      const { data: o } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (o) {
        setOrder(o);
        setMeetupLocation(o.meetup_location || '');
        setMeetupTime(o.meetup_time ? o.meetup_time.slice(0, 16) : '');
        const { data: l } = await supabase.from('listings').select('*').eq('id', o.listing_id).single();
        setListing(l);
      }
      setLoading(false);
    };
    load();
  }, [orderId]);

  // Realtime — live order updates
  useEffect(() => {
    const ch = supabase
      .channel(`order-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${orderId}`,
      }, ({ new: updated }) => setOrder(updated))
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [orderId]);

  if (loading) return <div className="order-loading">Loading order…</div>;
  if (!order)  return <div className="order-loading">Order not found.</div>;

  const isBuyer  = order.buyer_id  === uid;
  const isSeller = order.seller_id === uid;
  const isCompleted = order.status === 'completed';
  const isDisputed  = order.status === 'disputed';
  const isCancelled = ['cancelled', 'refunded'].includes(order.status);

  const myConfirmed    = isBuyer ? order.buyer_handover_confirmed_at  : order.seller_handover_confirmed_at;
  const otherConfirmed = isBuyer ? order.seller_handover_confirmed_at : order.buyer_handover_confirmed_at;

  const canConfirm = !myConfirmed &&
    ['awaiting_handover', 'buyer_confirmed_handover', 'seller_confirmed_handover'].includes(order.status);

  const step = resolveStep(order.status);

  const saveMeetup = async () => {
    if (!meetupLocation) return;
    setSavingMeetup(true);
    await supabase.from('orders').update({
      meetup_location: meetupLocation,
      meetup_time: meetupTime || null,
      status: 'awaiting_handover',
    }).eq('id', orderId);
    setSavingMeetup(false);
  };

  const confirmHandover = async () => {
    setConfirming(true);
    setError('');
    const field = isBuyer ? 'buyer_handover_confirmed_at' : 'seller_handover_confirmed_at';
    const now   = new Date().toISOString();

    const newStatus = otherConfirmed
      ? 'completed'
      : (isBuyer ? 'buyer_confirmed_handover' : 'seller_confirmed_handover');

    const update = {
      [field]: now,
      status: newStatus,
      ...(otherConfirmed ? { payout_released_at: now } : {}),
    };

    if (otherConfirmed) {
      // Mark listing as sold when order completes
      await supabase.from('listings').update({ status: 'sold' }).eq('id', order.listing_id);
    }

    const { error: upErr } = await supabase.from('orders').update(update).eq('id', orderId);
    if (upErr) setError(upErr.message);

    setShowConfirm(false);
    setConfirming(false);
  };

  const reportDispute = async () => {
    if (!disputeReason) return;
    await supabase.from('orders').update({
      status: 'disputed',
      dispute_reason: disputeReason,
    }).eq('id', orderId);
    setShowDispute(false);
  };

  return (
    <div className="order-screen">
      <div className="order-inner">
        <button type="button" className="back-btn" onClick={onBack}>← Back</button>
        <h2 className="order-title">Order</h2>

        {/* Status stepper */}
        {!isDisputed && !isCancelled && (
          <div className="order-stepper">
            {STEPS.map((s, i) => (
              <div key={s.key} className={`ostep${i <= step ? ' ostep--done' : ''}${i === step ? ' ostep--active' : ''}`}>
                <div className="ostep-line-before" />
                <div className="ostep-dot">{i < step ? '✓' : i + 1}</div>
                <div className="ostep-line-after" />
                <span className="ostep-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disputed banner */}
        {isDisputed && (
          <div className="order-banner order-banner--dispute">
            <strong>Dispute open.</strong> Payment is frozen while support reviews.
            {order.dispute_reason && (
              <p className="order-banner-sub">Reason: {order.dispute_reason}</p>
            )}
          </div>
        )}

        {/* Completed banner */}
        {isCompleted && (
          <div className="order-banner order-banner--success">
            <strong>Order complete!</strong> The handover has been confirmed by both parties.
            {isSeller && ' Your payment has been released.'}
          </div>
        )}

        {/* Listing card */}
        {listing && (
          <div className="order-listing-card">
            {listing.photos?.[0] && (
              <img
                src={listing.photos[0]}
                alt={`${listing.brand} ${listing.model}`}
                className="order-listing-img"
              />
            )}
            <div>
              <p className="order-listing-name">{listing.brand} {listing.model}</p>
              <p className="order-listing-meta">{listing.size_system} {listing.size} · {listing.condition}</p>
            </div>
          </div>
        )}

        {/* Price + escrow status */}
        <div className="order-price-card">
          <div className="price-row">
            <span>Item price</span>
            <span>€{fmt(order.item_price)}</span>
          </div>
          <div className="price-row">
            <span>Buyer protection</span>
            <span>€{fmt(order.service_fee)}</span>
          </div>
          <div className="price-row price-total">
            <span>Total paid</span>
            <span>€{fmt(order.total_paid)}</span>
          </div>
          <div className={`escrow-status-row${isCompleted ? ' escrow-status-row--released' : ''}`}>
            {isCompleted
              ? '✓  Payment released to seller'
              : isDisputed
                ? '⏸  Payment frozen — dispute open'
                : '🔒  Payment held securely in escrow'}
          </div>
        </div>

        {/* Meetup section */}
        {!isCompleted && !isCancelled && !isDisputed && (
          <div className="order-section">
            <h3 className="order-section-title">Meetup</h3>
            {order.meetup_location ? (
              <div className="meetup-details">
                <p><strong>Location:</strong> {order.meetup_location}</p>
                {order.meetup_time && (
                  <p>
                    <strong>Time:</strong>{' '}
                    {new Date(order.meetup_time).toLocaleString('en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
              </div>
            ) : (
              <div className="meetup-form">
                <p className="meetup-hint">
                  Arrange a time with the {isBuyer ? 'seller' : 'buyer'} and add the details here.
                </p>
                <label className="field-label">
                  Location
                  <input
                    className="field"
                    value={meetupLocation}
                    onChange={(e) => setMeetupLocation(e.target.value)}
                    placeholder="e.g. Cafétéria, CIUP Paris"
                  />
                </label>
                <label className="field-label">
                  Date & time (optional)
                  <input
                    className="field"
                    type="datetime-local"
                    value={meetupTime}
                    onChange={(e) => setMeetupTime(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={saveMeetup}
                  disabled={!meetupLocation || savingMeetup}
                >
                  {savingMeetup ? 'Saving…' : 'Save meetup details'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Handover confirmations */}
        {['awaiting_handover', 'buyer_confirmed_handover', 'seller_confirmed_handover'].includes(order.status) && (
          <div className="order-section">
            <h3 className="order-section-title">Handover confirmation</h3>
            <div className="confirm-grid">
              <div className={`confirm-cell${order.buyer_handover_confirmed_at ? ' confirm-cell--done' : ''}`}>
                <span className="confirm-icon">{order.buyer_handover_confirmed_at ? '✓' : '○'}</span>
                Buyer confirmed
              </div>
              <div className={`confirm-cell${order.seller_handover_confirmed_at ? ' confirm-cell--done' : ''}`}>
                <span className="confirm-icon">{order.seller_handover_confirmed_at ? '✓' : '○'}</span>
                Seller confirmed
              </div>
            </div>
            {canConfirm && (
              <button type="button" className="primary-btn" onClick={() => setShowConfirm(true)}>
                {isBuyer ? 'I received the sneakers' : 'I handed over the sneakers'}
              </button>
            )}
            {myConfirmed && !otherConfirmed && (
              <p className="order-hint">
                Waiting for the {isBuyer ? 'seller' : 'buyer'} to confirm.
              </p>
            )}
          </div>
        )}

        {error && <p className="field-error">{error}</p>}

        {/* Actions */}
        <div className="order-actions">
          {listing && (
            <button
              type="button"
              className="follow-btn"
              onClick={() => onStartChat?.(listing)}
            >
              Open chat
            </button>
          )}
          {!isCompleted && !isDisputed && !isCancelled && (
            <button
              type="button"
              className="link-btn"
              style={{ color: '#ef4444' }}
              onClick={() => setShowDispute(true)}
            >
              Report an issue
            </button>
          )}
        </div>

        {/* Confirm handover modal */}
        {showConfirm && (
          <div className="modal-backdrop" onClick={() => setShowConfirm(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Confirm handover</h3>
              <p className="modal-body">
                {isBuyer
                  ? 'Confirm that you have received the sneakers and they match the listing description?'
                  : 'Confirm that you have handed the sneakers to the buyer?'}
              </p>
              <p className="modal-warning">
                This action releases the payment. Only confirm once the exchange has happened.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="primary-btn"
                  onClick={confirmHandover}
                  disabled={confirming}
                >
                  {confirming ? 'Confirming…' : 'Yes, confirm handover'}
                </button>
                <button
                  type="button"
                  className="follow-btn"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispute modal */}
        {showDispute && (
          <div className="modal-backdrop" onClick={() => setShowDispute(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Report an issue</h3>
              <p className="modal-body">What is the problem?</p>
              <div className="dispute-options">
                {DISPUTE_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`dispute-option${disputeReason === r ? ' dispute-option--selected' : ''}`}
                    onClick={() => setDisputeReason(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="primary-btn"
                  style={{ background: '#ef4444' }}
                  onClick={reportDispute}
                  disabled={!disputeReason}
                >
                  Submit dispute
                </button>
                <button
                  type="button"
                  className="follow-btn"
                  onClick={() => setShowDispute(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
