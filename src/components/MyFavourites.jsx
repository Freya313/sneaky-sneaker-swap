import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import FavouriteButton from './FavouriteButton.jsx';

export default function MyFavourites({ session, favIds, onToggleFav }) {
  const [favListings, setFavListings] = useState([]);
  const [sellers, setSellers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data } = await supabase
        .from('favourites')
        .select('listing_id, listings(*)')
        .eq('user_id', session.user.id);

      const listings = (data || []).map((f) => f.listings).filter(Boolean);
      setFavListings(listings);

      const sellerIds = [...new Set(listings.map((l) => l.seller_id || l.user_id).filter(Boolean))];
      if (sellerIds.length) {
        const { data: profiles } = await supabase
          .from('public_profiles')
          .select('id, name')
          .in('id', sellerIds);
        if (profiles) {
          const map = {};
          profiles.forEach((p) => { map[p.id] = p.name; });
          setSellers(map);
        }
      }

      setLoading(false);
    };
    load();
  }, [session, favIds]);

  const visible = favListings.filter((l) => favIds.has(l.id));

  return (
    <section className="how">
      <div className="how-head">
        <h2 className="how-title">My Favourites</h2>
        <p className="how-sub">Listings you've saved.</p>
      </div>

      {loading && <p className="feature-text">Loading…</p>}

      {!loading && visible.length === 0 && (
        <p className="how-sub">No favourites yet — click the heart on any listing to save it here.</p>
      )}

      <div className="feature-grid">
        {visible.map((l) => {
          const sellerName = sellers[l.seller_id] || sellers[l.user_id] || 'Unknown seller';
          const isSold = l.status === 'sold';
          const statusLabel = isSold ? 'Sold' : l.status === 'reserved' ? 'Reserved' : 'Available';
          return (
            <div key={l.id} className={`feature fav-card${isSold ? ' fav-card--sold' : ''}`}>
              <div className="listing-photo-wrap">
                {l.photos?.[0] ? (
                  <img src={l.photos[0]} alt={`${l.brand} ${l.model}`} style={{ width: '100%', borderRadius: 8 }} />
                ) : (
                  <div className="fav-card-no-photo" />
                )}
                {isSold && <span className="listing-status-badge badge-sold">SOLD</span>}
                <div className="fav-heart-wrap">
                  <FavouriteButton session={session} isFav onToggle={() => onToggleFav(l.id)} />
                </div>
              </div>
              <p className="fav-card-title">{l.brand} {l.model}</p>
              <p className="feature-text">€{l.price} · {l.size_system} {l.size}</p>
              <p className="feature-text">Seller: {sellerName}</p>
              <p className={`feature-text fav-status fav-status--${l.status}`}>{statusLabel}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
