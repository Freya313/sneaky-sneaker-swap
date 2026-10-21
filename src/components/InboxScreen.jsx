import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

function timeLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function InboxScreen({ session, onOpenChat }) {
  const [conversations, setConversations] = useState([]);
  const [profileMap, setProfileMap]       = useState({});
  const [unreadMap, setUnreadMap]         = useState({});
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const uid = session.user.id;

      // ── conversations + listing info ──────────────────
      const { data: convs } = await supabase
        .from('conversations')
        .select('*, listing:listings(id, brand, model, photos, price, status)')
        .or(`buyer_id.eq.${uid},seller_id.eq.${uid}`)
        .order('last_message_at', { ascending: false });

      if (!convs) { setLoading(false); return; }
      setConversations(convs);

      // ── other-party profiles ──────────────────────────
      const otherIds = [...new Set(convs.map((c) =>
        c.buyer_id === uid ? c.seller_id : c.buyer_id
      ))];
      if (otherIds.length) {
        const { data: profiles } = await supabase
          .from('public_profiles').select('id, name, avatar_url').in('id', otherIds);
        if (profiles) {
          const map = {};
          profiles.forEach((p) => { map[p.id] = p; });
          setProfileMap(map);
        }
      }

      // ── unread counts ─────────────────────────────────
      const convIds = convs.map((c) => c.id);
      if (convIds.length) {
        const { data: unread } = await supabase
          .from('chat_messages')
          .select('conversation_id')
          .in('conversation_id', convIds)
          .neq('sender_id', uid)
          .is('read_at', null);
        if (unread) {
          const counts = {};
          unread.forEach((m) => { counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1; });
          setUnreadMap(counts);
        }
      }

      setLoading(false);
    };
    load();
  }, [session]);

  const uid = session.user.id;

  return (
    <section className="how">
      <div className="how-head">
        <h2 className="how-title">Messages</h2>
        <p className="how-sub">Your conversations with buyers and sellers.</p>
      </div>

      {loading && <p className="feature-text">Loading…</p>}

      {!loading && conversations.length === 0 && (
        <p className="how-sub">No conversations yet. Click "Ask seller" on any listing to start one.</p>
      )}

      <div className="conv-list">
        {conversations.map((c) => {
          const otherId  = c.buyer_id === uid ? c.seller_id : c.buyer_id;
          const other    = profileMap[otherId];
          const unread   = unreadMap[c.id] || 0;
          const listing  = c.listing;
          const isBuyer  = c.buyer_id === uid;
          const thumb    = listing?.photos?.[0];
          const preview  = c.last_message_preview || 'No messages yet';

          return (
            <button
              key={c.id}
              type="button"
              className="conv-item"
              onClick={() => onOpenChat(c.id)}
            >
              {/* Other user avatar */}
              <div className="conv-avatar">
                {other?.avatar_url
                  ? <img src={other.avatar_url} alt={other.name} className="conv-avatar-img" />
                  : <span className="conv-avatar-initials">{(other?.name || '?')[0].toUpperCase()}</span>}
              </div>

              {/* Item thumbnail */}
              {thumb && <img src={thumb} alt="" className="conv-thumb" />}

              {/* Text info */}
              <div className="conv-info">
                <div className="conv-info-top">
                  <span className="conv-name">{other?.name || 'Unknown user'}</span>
                  <span className="conv-time">{timeLabel(c.last_message_at)}</span>
                </div>
                {listing && (
                  <span className="conv-listing">{listing.brand} {listing.model} · €{listing.price}</span>
                )}
                <span className={`conv-preview${unread > 0 ? ' conv-preview--unread' : ''}`}>
                  {preview}
                </span>
              </div>

              {/* Unread badge */}
              {unread > 0 && <span className="conv-unread-badge">{unread}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
