import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import OfferModal from './chat/OfferModal.jsx';

// ── helpers ──────────────────────────────────────────────────────────

function timeLabel(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function expiryLabel(iso) {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return 'Expired';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const QUICK_PROMPTS = [
  'Is this still available?',
  'What are the measurements?',
  'Can you reserve this for me?',
];

// ── sub-components ────────────────────────────────────────────────────

function SystemMessage({ body }) {
  return <div className="msg-system"><span>{body}</span></div>;
}

function TextBubble({ msg, isMine }) {
  return (
    <div className={`msg-row${isMine ? ' msg-row--mine' : ''}`}>
      <div className={`msg-bubble${isMine ? ' msg-bubble--mine' : ' msg-bubble--theirs'}`}>
        <span>{msg.body}</span>
        <span className="msg-time">{timeLabel(msg.created_at)}{isMine && msg.read_at ? ' ✓✓' : ''}</span>
      </div>
    </div>
  );
}

function ImageBubble({ msg, isMine }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className={`msg-row${isMine ? ' msg-row--mine' : ''}`}>
        <button type="button" className="msg-image-wrap" onClick={() => setOpen(true)}>
          <img src={msg.image_url} alt="Chat image" className="msg-image" />
          <span className="msg-time" style={{ display: 'block', textAlign: 'right', padding: '2px 4px' }}>
            {timeLabel(msg.created_at)}
          </span>
        </button>
      </div>
      {open && (
        <div className="listing-overlay" onClick={() => setOpen(false)}>
          <img src={msg.image_url} alt="Full size" style={{ maxWidth: '95vw', maxHeight: '95vh', borderRadius: 8 }} />
        </div>
      )}
    </>
  );
}

function OfferCard({ msg, session, conversation, onAccept, onDecline, onCounter }) {
  const offer = msg.offer;
  if (!offer) return null;

  const isMine     = offer.proposed_by_id === session.user.id;
  const isSeller   = conversation.seller_id === session.user.id;
  const canRespond = !isMine && offer.status === 'pending';

  const statusLabel = {
    pending:   isMine ? 'Waiting for response…' : null,
    accepted:  '✓ Offer accepted',
    declined:  '✗ Offer declined',
    countered: 'Counter-offer sent',
    expired:   'Offer expired',
    withdrawn: 'Offer withdrawn',
  }[offer.status];

  return (
    <div className="offer-card">
      <p className="offer-card-label">💰 Offer</p>
      <p className="offer-card-amount">€{offer.amount}</p>
      {offer.status === 'pending' && (
        <p className="offer-card-expiry">Expires in {expiryLabel(offer.expires_at)}</p>
      )}
      {statusLabel && <p className="offer-card-status">{statusLabel}</p>}
      {canRespond && (
        <div className="offer-card-actions">
          <button type="button" className="primary-btn offer-accept-btn" onClick={() => onAccept(offer)}>Accept</button>
          <button type="button" className="follow-btn" onClick={() => onCounter(offer)}>Counter</button>
          <button type="button" className="link-btn" onClick={() => onDecline(offer)}>Decline</button>
        </div>
      )}
      {isMine && offer.status === 'pending' && (
        <button type="button" className="link-btn" style={{ fontSize: 13 }}
          onClick={async () => {
            await supabase.from('chat_offers').update({ status: 'withdrawn' }).eq('id', offer.id);
          }}>
          Withdraw offer
        </button>
      )}
      <span className="msg-time">{timeLabel(msg.created_at)}</span>
    </div>
  );
}

// ── ItemChatHeader ────────────────────────────────────────────────────

function ItemChatHeader({ conversation, listing, session, onMakeOffer, onBack }) {
  const isBuyer  = conversation?.buyer_id === session?.user?.id;
  const isSeller = conversation?.seller_id === session?.user?.id;
  const status   = listing?.status;

  const markSold = async () => {
    await supabase.from('listings').update({ status: 'sold' }).eq('id', listing.id);
  };
  const markReserved = async () => {
    await supabase.from('listings').update({ status: 'reserved' }).eq('id', listing.id);
  };

  return (
    <div className="chat-header">
      <button type="button" className="link-btn chat-back-btn" onClick={onBack}>← Back</button>
      {listing && (
        <div className="chat-header-item">
          {listing.photos?.[0] && (
            <img src={listing.photos[0]} alt={`${listing.brand} ${listing.model}`} className="chat-header-thumb" />
          )}
          <div className="chat-header-info">
            <span className="chat-header-title">{listing.brand} {listing.model}</span>
            <span className="chat-header-price">€{listing.price}</span>
            <span className={`chat-header-status status-${status}`}>
              {status === 'active' ? 'Available' : status === 'reserved' ? 'Reserved' : status === 'sold' ? 'Sold' : status || ''}
            </span>
          </div>
          <div className="chat-header-actions">
            {isBuyer && status === 'active' && (
              <button type="button" className="primary-btn" onClick={onMakeOffer}>Make an offer</button>
            )}
            {isSeller && status === 'active' && (
              <>
                <button type="button" className="follow-btn" onClick={markReserved}>Reserve</button>
                <button type="button" className="follow-btn" onClick={markSold}>Mark sold</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ChatScreen ────────────────────────────────────────────────────────

export default function ChatScreen({ conversationId, session, openOffer = false, onBack }) {
  const [conversation, setConversation] = useState(null);
  const [listing,      setListing]      = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [text,         setText]         = useState('');
  const [uploading,    setUploading]    = useState(false);
  const [showOffer,    setShowOffer]    = useState(openOffer);
  const [counterOffer, setCounterOffer] = useState(null);
  const bottomRef  = useRef(null);
  const fileRef    = useRef(null);

  const scrollToBottom = () =>
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

  // ── load ──────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      // conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      setConversation(conv);

      // listing
      if (conv?.listing_id) {
        const { data: l } = await supabase
          .from('listings').select('*').eq('id', conv.listing_id).single();
        setListing(l);
      }

      // messages (with embedded offer data)
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*, offer:chat_offers(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      setMessages(msgs || []);
      scrollToBottom();

      // mark incoming messages as read
      const unreadIds = (msgs || [])
        .filter((m) => m.sender_id !== session.user.id && !m.read_at)
        .map((m) => m.id);
      if (unreadIds.length) {
        await supabase.from('chat_messages')
          .update({ read_at: new Date().toISOString() })
          .in('id', unreadIds);
      }
    };
    load();

    // ── realtime subscription ─────────────────────────
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, async ({ new: msg }) => {
        // Fetch offer data if present
        if (msg.offer_id) {
          const { data: offer } = await supabase
            .from('chat_offers').select('*').eq('id', msg.offer_id).single();
          msg = { ...msg, offer };
        }
        setMessages((prev) => [...prev, msg]);
        scrollToBottom();
        // Auto-mark as read if we're the recipient
        if (msg.sender_id !== session.user.id) {
          await supabase.from('chat_messages')
            .update({ read_at: new Date().toISOString() }).eq('id', msg.id);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_offers',
      }, ({ new: updatedOffer }) => {
        setMessages((prev) => prev.map((m) =>
          m.offer_id === updatedOffer.id ? { ...m, offer: updatedOffer } : m
        ));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [conversationId, session.user.id]);

  // ── send helpers ──────────────────────────────────────

  const updateConversation = async (preview) => {
    await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      last_message_preview: preview,
    }).eq('id', conversationId);
  };

  const sendMessage = async (type = 'text', extra = {}) => {
    const { _offerAmount, ...dbExtra } = extra; // _offerAmount is private — not a DB column
    const body = type === 'text' ? text.trim() : dbExtra.body;
    if (type === 'text' && !body) return;

    const { data: msg } = await supabase.from('chat_messages').insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      type,
      body: body || null,
      ...dbExtra,
    }).select('*, offer:chat_offers(*)').single();

    if (msg) {
      setMessages((prev) => [...prev, msg]);
      scrollToBottom();
      const preview =
        type === 'text'   ? body.substring(0, 60) :
        type === 'image'  ? '📷 Photo' :
        type === 'offer'  ? `💰 Offer: €${_offerAmount}` :
        type === 'system' ? body : body || '';
      await updateConversation(preview);
    }
    if (type === 'text') setText('');
  };

  const sendImage = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Only images allowed.');
    if (file.size > 10 * 1024 * 1024) return alert('Max image size is 10 MB.');

    setUploading(true);
    const path = `${conversationId}/${Date.now()}_${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
    const { error } = await supabase.storage.from('chat-images').upload(path, file);
    if (error) { setUploading(false); return alert('Upload failed: ' + error.message); }

    const { data: { publicUrl } } = supabase.storage.from('chat-images').getPublicUrl(path);
    await sendMessage('image', { image_url: publicUrl });
    setUploading(false);
  };

  // ── offer actions ─────────────────────────────────────

  const handleAcceptOffer = async (offer) => {
    await supabase.from('chat_offers').update({ status: 'accepted' }).eq('id', offer.id);
    await sendMessage('system', { body: `✓ Offer of €${offer.amount} accepted.` });
  };

  const handleDeclineOffer = async (offer) => {
    await supabase.from('chat_offers').update({ status: 'declined' }).eq('id', offer.id);
    await sendMessage('system', { body: `Offer of €${offer.amount} declined.` });
  };

  const handleCounterOffer = (offer) => {
    setCounterOffer(offer);
    setShowOffer(true);
  };

  const isBuyer = conversation?.buyer_id === session?.user?.id;

  return (
    <div className="chat-wrap">
      <ItemChatHeader
        conversation={conversation}
        listing={listing}
        session={session}
        onMakeOffer={() => setShowOffer(true)}
        onBack={onBack}
      />

      {/* ── message list ── */}
      <div className="msg-list">
        {/* Quick prompts for buyer on new conversation */}
        {isBuyer && messages.length === 0 && (
          <div className="quick-prompts">
            <p className="field-label">Quick questions</p>
            {QUICK_PROMPTS.map((q) => (
              <button key={q} type="button" className="quick-prompt-btn"
                onClick={() => { setText(q); }}>
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => {
          const isMine = m.sender_id === session.user.id;
          if (m.type === 'system') return <SystemMessage key={m.id} body={m.body} />;
          if (m.type === 'image')  return <ImageBubble  key={m.id} msg={m} isMine={isMine} />;
          if (m.type === 'offer')  return (
            <OfferCard key={m.id} msg={m} session={session} conversation={conversation}
              onAccept={handleAcceptOffer}
              onDecline={handleDeclineOffer}
              onCounter={handleCounterOffer}
            />
          );
          return <TextBubble key={m.id} msg={m} isMine={isMine} />;
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── input bar ── */}
      <div className="chat-input-bar">
        <button type="button" className="chat-icon-btn" title="Send image"
          onClick={() => fileRef.current?.click()} disabled={uploading}>
          {uploading ? '⏳' : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { sendImage(e.target.files[0]); e.target.value = ''; }} />

        <input
          type="text"
          className="field chat-input"
          placeholder="Message…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage('text'))}
        />
        <button type="button" className="chat-send-btn" onClick={() => sendMessage('text')} disabled={!text.trim()}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
          </svg>
        </button>
      </div>

      {showOffer && (
        <OfferModal
          listing={listing}
          conversation={conversation}
          session={session}
          counterOffer={counterOffer}
          onClose={() => { setShowOffer(false); setCounterOffer(null); }}
          onSent={async (offer) => {
            // Insert the offer message
            await sendMessage('offer', { offer_id: offer.id, _offerAmount: offer.amount });
            setShowOffer(false);
            setCounterOffer(null);
          }}
        />
      )}
    </div>
  );
}
