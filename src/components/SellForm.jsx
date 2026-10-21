import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { ciupHouses } from '../data/ciupHouses.js';

const CONDITIONS = ['New', 'Like new', 'Very good', 'Good', 'Fair'];
const STATUSES = ['active', 'reserved', 'sold', 'withdrawn'];
const MAX_PHOTOS = 20;

const emptyForm = {
  brand: '',
  model: '',
  size: '',
  size_system: 'EU',
  color: '',
  condition: 'Very good',
  price: '',
  authenticity_note: '',
  status: 'active',
  pickup_location: '',
  description: '',
};

export default function SellForm({ session, onPublished }) {
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setError('');
  };

  const pickPhotos = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > MAX_PHOTOS) {
      setPhotos([]);
      return setError(`You can upload up to ${MAX_PHOTOS} photos.`);
    }
    setPhotos(files);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    const required = ['brand', 'model', 'size', 'color', 'price', 'authenticity_note', 'pickup_location'];
    if (photos.length === 0) return setError('Add at least one photo.');
    if (required.some((field) => !String(form[field]).trim())) {
      return setError('Please fill in all required fields.');
    }

    setLoading(true);
    try {
      const urls = [];
      for (const file of photos) {
        const ext = file.name.split('.').pop().toLowerCase();
        const path = `${session.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('listing-photos').upload(path, file);
        if (uploadError) throw uploadError;
        urls.push(supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl);
      }

      const { error: insertError } = await supabase.from('listings').insert({
        user_id:   session.user.id,
        seller_id: session.user.id,
        brand: form.brand.trim(),
        model: form.model.trim(),
        size: Number(form.size),
        size_system: form.size_system,
        color: form.color.trim(),
        condition: form.condition,
        price: Number(form.price),
        authenticity_note: form.authenticity_note.trim(),
        status: form.status,
        pickup_location: form.pickup_location,
        description: form.description.trim() || null,
        photos: urls,
      });
      if (insertError) throw insertError;

      setForm(emptyForm);
      setPhotos([]);
      onPublished();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="signup-form" onSubmit={submit} noValidate>
      <label className="field-label" htmlFor="photos">PHOTOS (UP TO {MAX_PHOTOS})</label>
      <input id="photos" className="field" type="file" accept="image/*" multiple onChange={pickPhotos} />
      {photos.length > 0 && <span className="legal">{photos.length} photo(s) selected</span>}

      <label className="field-label" htmlFor="brand">BRAND</label>
      <input id="brand" className="field" value={form.brand} onChange={update('brand')} placeholder="Nike" />

      <label className="field-label" htmlFor="model">MODEL</label>
      <input id="model" className="field" value={form.model} onChange={update('model')} placeholder="Air Jordan 1 Low" />

      <label className="field-label" htmlFor="size">SIZE</label>
      <input id="size" className="field" type="number" step="0.5" value={form.size} onChange={update('size')} placeholder="42" />

      <label className="field-label" htmlFor="size_system">SIZE SYSTEM</label>
      <select id="size_system" className="field" value={form.size_system} onChange={update('size_system')}>
        <option>EU</option>
        <option>US</option>
        <option>UK</option>
      </select>

      <label className="field-label" htmlFor="color">COLOR</label>
      <input id="color" className="field" value={form.color} onChange={update('color')} placeholder="Black / White" />

      <label className="field-label" htmlFor="condition">CONDITION</label>
      <select id="condition" className="field" value={form.condition} onChange={update('condition')}>
        {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
      </select>

      <label className="field-label" htmlFor="price">PRICE (EUR)</label>
      <input id="price" className="field" type="number" min="0" step="1" value={form.price} onChange={update('price')} placeholder="60" />

      <label className="field-label" htmlFor="authenticity_note">AUTHENTICITY NOTE</label>
      <textarea id="authenticity_note" className="field" rows="2" value={form.authenticity_note} onChange={update('authenticity_note')} placeholder="Bought at Nike store, box and receipt included" />

      <label className="field-label" htmlFor="status">STATUS</label>
      <select id="status" className="field" value={form.status} onChange={update('status')}>
        {STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>

      <label className="field-label" htmlFor="pickup_location">CAMPUS PICKUP LOCATION</label>
      <select id="pickup_location" className="field" value={form.pickup_location} onChange={update('pickup_location')}>
        <option value="">Choose a house</option>
        {ciupHouses.map((h) => <option key={h.name}>{h.name}</option>)}
      </select>

      <label className="field-label" htmlFor="description">DESCRIPTION (OPTIONAL)</label>
      <textarea id="description" className="field" rows="3" value={form.description} onChange={update('description')} />

      {error && <span className="field-error">{error}</span>}

      <button type="submit" className="primary-btn" disabled={loading}>
        {loading ? 'Uploading…' : 'Upload'}
      </button>
    </form>
  );
}
