import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import SellForm from './SellForm.jsx';
import ListingDetail from './ListingDetail.jsx';
import FavouriteButton from './FavouriteButton.jsx';
import SearchFilterBar from './SearchFilterBar.jsx';

const EMPTY_FILTERS = { brand: '', condition: '', color: '', location: '', size: '', priceMin: '', priceMax: '' };

function resolveBadge(status, isSeller, isBuyer) {
  if (status === 'reserved') return 'RESERVED';
  if (status === 'sold') {
    if (isSeller) return 'YOU SOLD THIS';
    if (isBuyer)  return 'YOU BOUGHT THIS';
  }
  if (status === 'withdrawn' && isSeller) return 'YOU WITHDREW THIS';
  return null;
}

const isNew = (createdAt) => new Date(createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);

function applySearchFilters(listings, search, filters, sort, tab, followIds) {
  let result = [...listings];

  if (tab === 'following') {
    result = result.filter((l) => followIds.has(l.seller_id || l.user_id));
  }

  if (search) {
    const t = search.toLowerCase();
    result = result.filter((l) =>
      l.brand?.toLowerCase().includes(t) ||
      l.model?.toLowerCase().includes(t) ||
      l.description?.toLowerCase().includes(t) ||
      l.color?.toLowerCase().includes(t)
    );
  }

  if (filters.brand)     result = result.filter((l) => l.brand === filters.brand);
  if (filters.condition) result = result.filter((l) => l.condition === filters.condition);
  if (filters.color)     result = result.filter((l) => l.color?.toLowerCase().includes(filters.color.toLowerCase()));
  if (filters.location)  result = result.filter((l) => l.pickup_location === filters.location);
  if (filters.size)      result = result.filter((l) => String(l.size) === String(filters.size));
  if (filters.priceMin)  result = result.filter((l) => l.price >= Number(filters.priceMin));
  if (filters.priceMax)  result = result.filter((l) => l.price <= Number(filters.priceMax));

  if (sort === 'price_asc')  result.sort((a, b) => a.price - b.price);
  if (sort === 'price_desc') result.sort((a, b) => b.price - a.price);
  // 'newest' keeps DB order (created_at desc)

  return result;
}

export default function Marketplace({
  session, favIds, onToggleFav, followIds, onToggleFollow,
  savedSearches, onSaveSearch, onDeleteSearch,
  pendingSearch, onPendingSearchCleared,
  onStartChat,
}) {
  const [listings,  setListings]  = useState([]);
  const [boughtIds, setBoughtIds] = useState(new Set());
  const [showForm,  setShowForm]  = useState(false);
  const [error,     setError]     = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selected,  setSelected]  = useState(null);
  const [tab,    setTab]    = useState('all');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort,   setSort]   = useState('newest');

  // ── fetch listings ────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      if (!session) {
        const { data, error } = await supabase.rpc('sneak_peeks');
        if (error) return setError(error.message);
        setListings(data);
        return;
      }
      const { data, error } = await supabase
        .from('listings').select('*').order('created_at', { ascending: false });
      if (error) return setError(error.message);
      setListings(data);

      const { data: txns } = await supabase
        .from('transactions').select('listing_id').eq('buyer_id', session.user.id);
      if (txns) setBoughtIds(new Set(txns.map((t) => t.listing_id)));
    };
    load();
  }, [session, reloadKey]);

  // ── apply pending search from notification click ──────
  useEffect(() => {
    if (!pendingSearch) return;
    setSearch(pendingSearch.search || '');
    setFilters({
      brand:    pendingSearch.brand    || '',
      condition: pendingSearch.condition || '',
      color:    pendingSearch.color    || '',
      location: pendingSearch.location || '',
      size:     pendingSearch.size     || '',
      priceMin: pendingSearch.priceMin || '',
      priceMax: pendingSearch.priceMax || '',
    });
    setSort('newest');
    setTab('all');
    onPendingSearchCleared();
  }, [pendingSearch]);

  // ── derived state ─────────────────────────────────────
  const filtered = useMemo(
    () => applySearchFilters(listings, search, filters, sort, tab, followIds),
    [listings, search, filters, sort, tab, followIds]
  );

  const followingNewCount = useMemo(() => {
    if (!session || followIds.size === 0) return 0;
    return listings.filter((l) => followIds.has(l.seller_id || l.user_id) && isNew(l.created_at)).length;
  }, [listings, followIds, session]);

  const hasSearch = search || Object.values(filters).some((v) => v !== '');

  const loadSavedSearch = (s) => {
    const f = s.filters || {};
    setSearch(f.search || '');
    setFilters({
      brand:    f.brand    || '',
      condition: f.condition || '',
      color:    f.color    || '',
      location: f.location || '',
      size:     f.size     || '',
      priceMin: f.priceMin || '',
      priceMax: f.priceMax || '',
    });
  };

  return (
    <section id="marketplace" className="how">
      <div className="how-head">
        <h2 className="how-title">Marketplace</h2>
        <p className="how-sub">
          {session ? 'Sneakers from students on campus.' : 'A sneak peek. Sign up to see every listing.'}
        </p>
        {session && (
          <button type="button" className="primary-btn" onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Close' : 'Sell now'}
          </button>
        )}
      </div>

      {showForm && <SellForm session={session} onPublished={() => { setShowForm(false); setReloadKey((k) => k + 1); }} />}
      {error && <span className="field-error">{error}</span>}

      <SearchFilterBar
        listings={listings}
        search={search}
        filters={filters}
        sort={sort}
        onSearch={setSearch}
        onFilter={setFilters}
        onSort={setSort}
        session={session}
        savedSearches={savedSearches || []}
        onSaveSearch={onSaveSearch}
        onLoadSearch={loadSavedSearch}
        onDeleteSearch={onDeleteSearch}
      />

      {session && (
        <div className="market-tabs">
          <button type="button" className={`tab${tab === 'all' ? ' is-active' : ''}`} onClick={() => setTab('all')}>
            All listings
          </button>
          <button type="button" className={`tab${tab === 'following' ? ' is-active' : ''}`} onClick={() => setTab('following')}>
            Following
            {followingNewCount > 0 && <span className="tab-new-badge">{followingNewCount} new</span>}
          </button>
        </div>
      )}

      {tab === 'following' && followIds.size === 0 && (
        <p className="how-sub">Follow sellers to see their listings here — click "+ Follow" on any listing.</p>
      )}

      <div className="feature-grid">
        {filtered.map((l) => {
          const isSeller = session && (l.seller_id === session.user.id || l.user_id === session.user.id);
          const isBuyer  = session && boughtIds.has(l.id);
          const badge    = resolveBadge(l.status, isSeller, isBuyer);
          const isFav    = favIds.has(l.id);
          const newBadge = session && !badge && isNew(l.created_at);
          return (
            <div
              key={l.id}
              role="button"
              tabIndex={0}
              className="feature listing-card"
              onClick={() => setSelected({ ...l, isSeller, isBuyer, badge })}
              onKeyDown={(e) => e.key === 'Enter' && setSelected({ ...l, isSeller, isBuyer, badge })}
            >
              <div className="listing-photo-wrap">
                {l.photos?.[0] && (
                  <img src={l.photos[0]} alt={`${l.brand} ${l.model}`} style={{ width: '100%', borderRadius: 12 }} />
                )}
                {badge    && <span className={`listing-status-badge badge-${l.status}`}>{badge}</span>}
                {newBadge && <span className="listing-status-badge badge-new">NEW</span>}
                <div className="fav-heart-wrap">
                  <FavouriteButton session={session} isFav={isFav} onToggle={() => onToggleFav(l.id)} />
                </div>
              </div>
              <h3 className="feature-title">{l.brand} {l.model}</h3>
              <p className="feature-text">{l.size_system} {l.size} · {l.condition} · {l.color}</p>
              <p className="feature-text">€{l.price}</p>
              <p className="feature-text">Pickup: {l.pickup_location}</p>
            </div>
          );
        })}
      </div>

      {selected && (
        <ListingDetail
          listing={selected}
          allListings={listings}
          session={session}
          favIds={favIds}
          onToggleFav={onToggleFav}
          followIds={followIds}
          onToggleFollow={onToggleFollow}
          onStartChat={onStartChat}
          onClose={() => setSelected(null)}
        />
      )}

      {filtered.length === 0 && !error && (
        <p className="how-sub">
          {hasSearch ? 'No listings match your search.' : 'No listings yet.'}
        </p>
      )}
    </section>
  );
}
