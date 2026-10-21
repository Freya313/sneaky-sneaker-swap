import { useState } from 'react';

const CONDITIONS = ['New', 'Like new', 'Very good', 'Good', 'Fair'];

function genName(search, filters) {
  const parts = [];
  if (search) parts.push(search);
  if (filters.brand) parts.push(filters.brand);
  if (filters.size) parts.push(`sz ${filters.size}`);
  if (filters.condition) parts.push(filters.condition);
  if (filters.priceMax) parts.push(`≤€${filters.priceMax}`);
  return parts.join(' · ') || 'My search';
}

export default function SearchFilterBar({
  listings, search, filters, sort,
  onSearch, onFilter, onSort,
  session, savedSearches, onSaveSearch, onLoadSearch, onDeleteSearch,
}) {
  const [showFilters, setShowFilters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState('');

  // Derive unique option lists from whatever listings are currently loaded
  const brands    = [...new Set(listings.map((l) => l.brand).filter(Boolean))].sort();
  const sizes     = [...new Set(listings.map((l) => l.size).filter(Boolean))].sort((a, b) => a - b);
  const colors    = [...new Set(listings.map((l) => l.color).filter(Boolean))].sort();
  const locations = [...new Set(listings.map((l) => l.pickup_location).filter(Boolean))].sort();

  const setFilter = (key, val) => onFilter({ ...filters, [key]: val });

  const clearAll = () => {
    onSearch('');
    onFilter({ brand: '', condition: '', color: '', location: '', size: '', priceMin: '', priceMax: '' });
  };

  const activeFilterCount =
    (search ? 1 : 0) + Object.values(filters).filter((v) => v !== '').length;

  const startSave = () => {
    setSaveName(genName(search, filters));
    setSaving(true);
  };

  const confirmSave = () => {
    const name = saveName.trim();
    if (name) {
      onSaveSearch(name, { search, ...filters });
      setSaving(false);
      setSaveName('');
    }
  };

  return (
    <div className="search-bar-wrap">
      {/* ── top row: search + filter toggle + sort ── */}
      <div className="search-row">
        <input
          type="search"
          className="field search-input"
          placeholder="Search brand, model, color, description…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <button
          type="button"
          className={`filter-toggle-btn${showFilters ? ' is-active' : ''}`}
          onClick={() => setShowFilters((s) => !s)}
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}&nbsp;{showFilters ? '▲' : '▼'}
        </button>
        <select className="field sort-select" value={sort} onChange={(e) => onSort(e.target.value)}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low → high</option>
          <option value="price_desc">Price: high → low</option>
        </select>
      </div>

      {/* ── filter panel ── */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-grid">
            <label className="filter-item">
              <span className="field-label">Brand</span>
              <select className="field" value={filters.brand} onChange={(e) => setFilter('brand', e.target.value)}>
                <option value="">All brands</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
            <label className="filter-item">
              <span className="field-label">Size</span>
              <select className="field" value={filters.size} onChange={(e) => setFilter('size', e.target.value)}>
                <option value="">Any size</option>
                {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="filter-item">
              <span className="field-label">Condition</span>
              <select className="field" value={filters.condition} onChange={(e) => setFilter('condition', e.target.value)}>
                <option value="">Any condition</option>
                {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="filter-item">
              <span className="field-label">Color</span>
              <select className="field" value={filters.color} onChange={(e) => setFilter('color', e.target.value)}>
                <option value="">Any color</option>
                {colors.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="filter-item">
              <span className="field-label">Location</span>
              <select className="field" value={filters.location} onChange={(e) => setFilter('location', e.target.value)}>
                <option value="">Any location</option>
                {locations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </label>
            <label className="filter-item">
              <span className="field-label">Min price (€)</span>
              <input
                type="number" min={0} placeholder="0"
                className="field"
                value={filters.priceMin}
                onChange={(e) => setFilter('priceMin', e.target.value)}
              />
            </label>
            <label className="filter-item">
              <span className="field-label">Max price (€)</span>
              <input
                type="number" min={0} placeholder="∞"
                className="field"
                value={filters.priceMax}
                onChange={(e) => setFilter('priceMax', e.target.value)}
              />
            </label>
          </div>
          {activeFilterCount > 0 && (
            <button type="button" className="link-btn" onClick={clearAll}>Clear all filters</button>
          )}
        </div>
      )}

      {/* ── save search ── */}
      {session && activeFilterCount > 0 && !saving && (
        <button type="button" className="link-btn" style={{ marginTop: 4 }} onClick={startSave}>
          + Save this search
        </button>
      )}
      {saving && (
        <div className="save-search-row">
          <input
            autoFocus
            className="field save-name-input"
            placeholder="Name this search…"
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && confirmSave()}
          />
          <button type="button" className="primary-btn" onClick={confirmSave}>Save</button>
          <button type="button" className="link-btn" onClick={() => setSaving(false)}>Cancel</button>
        </div>
      )}

      {/* ── saved search pills ── */}
      {savedSearches.length > 0 && (
        <div className="saved-searches-row">
          <span className="field-label">Saved:</span>
          {savedSearches.map((s) => (
            <span key={s.id} className="saved-pill">
              <button type="button" className="saved-pill-name" onClick={() => onLoadSearch(s)}>
                {s.name}
              </button>
              <button
                type="button"
                className="saved-pill-del"
                aria-label="Delete"
                onClick={() => onDeleteSearch(s.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
