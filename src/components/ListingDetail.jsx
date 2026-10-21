import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import FavouriteButton from './FavouriteButton.jsx';
import FollowButton from './FollowButton.jsx';

function computeSimilar(listing, allListings) {
  return allListings
    .filter((l) => l.id !== listing.id && l.status === 'active')
    .map((l) => ({
      ...l,
      _score:
        (l.brand === listing.brand ? 3 : 0) +
        (l.size === listing.size && l.size_system === listing.size_system ? 2 : 0) +
        (l.condition === listing.condition ? 1 : 0),
    }))
    .filter((l) => l._score > 0)
    .sort((a, b) => b._score - a._score)
    .slice(0, 4);
}

function MiniCard({ l, session, onClick }) {
  return (
    <button type="button" className="mini-card" onClick={onClick}>
      {l.photos?.[0] ? (
        <img src={l.photos[0]} alt={`${l.brand} ${l.model}`} className="mini-card-img" />
      ) : (
        <div className="mini-card-img mini-card-placeholder" />
      )}
      <p className="mini-card-title">{l.brand} {l.model}</p>
      <p className="feature-text">€{l.price} · {l.size_system} {l.size}</p>
    </button>
  );
}

export default function ListingDetail({
  listing, allListings = [], session,
  favIds, onToggleFav,
  followIds, onToggleFollow,
  onStartChat,
  onClose,
}) {
  const { badge, isSeller, isBuyer } = listing;
  const sellerId   = listing.seller_id || listing.user_id;
  const isFav      = favIds?.has(listing.id);
  const isFollowing = followIds?.has(sellerId);
  const [sellerName, setSellerName] = useState('');
  // When a mini card is clicked, we push a new "page" inside the dialog
  const [inner, setInner] = useState(null);

  useEffect(() => {
    setInner(null); // reset when top-level listing changes
    if (!sellerId) return;
    supabase.from('public_profiles').select('name').eq('id', sellerId).single()
      .then(({ data }) => { if (data) setSellerName(data.name); });
  }, [listing.id, sellerId]);

  const similar       = computeSimilar(listing, allListings);
  const moreFromSeller = allListings
    .filter((l) => l.id !== listing.id &&
      (l.seller_id === sellerId || l.user_id === sellerId) &&
      l.status === 'active')
    .slice(0, 4);

  const openMini = (l) => {
    const isSell = session && (l.seller_id === session.user.id || l.user_id === session.user.id);
    const b = l.status === 'reserved' ? 'RESERVED' : (l.status === 'sold' && isSell ? 'YOU SOLD THIS' : null);
    setInner({ ...l, isSeller: isSell, isBuyer: false, badge: b });
  };

  // If the user clicked a mini card, render a new detail over this one
  if (inner) {
    return (
      <ListingDetail
        listing={inner}
        allListings={allListings}
        session={session}
        favIds={favIds}
        onToggleFav={onToggleFav}
        followIds={followIds}
        onToggleFollow={onToggleFollow}
        onStartChat={onStartChat}
        onClose={() => setInner(null)}
      />
    );
  }

  const canMessage = session && !isSeller && (listing.status === 'active' || listing.status === 'reserved');

  return (
    <div className="listing-overlay" onClick={onClose}>
      <div className="listing-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>

        {/* ── top bar ── */}
        <div className="listing-dialog-top">
          <button type="button" className="link-btn" onClick={onClose}>Close</button>
          <FavouriteButton session={session} isFav={isFav} onToggle={() => onToggleFav(listing.id)} />
        </div>

        {/* ── photo ── */}
        {listing.photos?.[0] && (
          <div className="listing-photo-wrap">
            <img src={listing.photos[0]} alt={`${listing.brand} ${listing.model}`} style={{ width: '100%', borderRadius: 12 }} />
            {badge && <span className={`listing-status-badge badge-${listing.status}`}>{badge}</span>}
          </div>
        )}

        {/* ── title + follow ── */}
        <div className="listing-seller-row">
          <h3 className="feature-title" style={{ margin: 0 }}>{listing.brand} {listing.model}</h3>
          <FollowButton
            sellerId={sellerId}
            isFollowing={isFollowing}
            onToggle={() => onToggleFollow(sellerId)}
            session={session}
            currentUserId={session?.user?.id}
          />
        </div>

        {sellerName && <p className="feature-text">Seller: <strong>{sellerName}</strong></p>}
        <p className="feature-text">{listing.size_system} {listing.size} · {listing.condition} · {listing.color}</p>
        <p className="feature-text">€{listing.price}</p>
        <p className="feature-text">Pickup: {listing.pickup_location}</p>

        {/* ── contact buttons ── */}
        {canMessage && (
          <div className="listing-contact-row">
            <button type="button" className="primary-btn"
              onClick={() => { onClose(); onStartChat?.(listing, false); }}>
              Ask seller
            </button>
            {listing.status === 'active' && (
              <button type="button" className="follow-btn"
                onClick={() => { onClose(); onStartChat?.(listing, true); }}>
                Make an offer
              </button>
            )}
          </div>
        )}

        {session ? (
          <>
            {listing.description && <p className="feature-text">{listing.description}</p>}
            <p className="feature-text">Authenticity: {listing.authenticity_note}</p>
          </>
        ) : (
          <div className="listing-lock">
            <span className="signup-kicker">LOG IN TO SEE MORE</span>
            <p className="feature-text">Description and authenticity details are only visible to logged-in students.</p>
            <a href="#signup" className="primary-btn" onClick={onClose}>Log in or sign up</a>
          </div>
        )}

        {/* ── similar items ── */}
        {similar.length > 0 && (
          <div className="listing-related">
            <p className="field-label">Similar items</p>
            <div className="mini-grid">
              {similar.map((l) => <MiniCard key={l.id} l={l} session={session} onClick={() => openMini(l)} />)}
            </div>
          </div>
        )}

        {/* ── more from seller ── */}
        {moreFromSeller.length > 0 && (
          <div className="listing-related">
            <p className="field-label">More from {sellerName || 'this seller'}</p>
            <div className="mini-grid">
              {moreFromSeller.map((l) => <MiniCard key={l.id} l={l} session={session} onClick={() => openMini(l)} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
