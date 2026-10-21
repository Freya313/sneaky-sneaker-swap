import { useCallback, useEffect, useState } from 'react';
import Nav from './components/Nav.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import AboutUs from './components/AboutUs.jsx';
import CampusMap from './components/CampusMap.jsx';
import CtaBanner from './components/CtaBanner.jsx';
import Footer from './components/Footer.jsx';
import Marketplace from './components/Marketplace.jsx';
import MyFavourites from './components/MyFavourites.jsx';
import InboxScreen from './components/InboxScreen.jsx';
import ChatScreen from './components/ChatScreen.jsx';
import ActivityBell from './components/ActivityBell.jsx';
import { supabase } from './lib/supabase.js';

export default function App() {
  const [session, setSession]           = useState(null);
  const [view, setView]                 = useState('home');
  const [favIds, setFavIds]             = useState(new Set());
  const [followIds, setFollowIds]       = useState(new Set());
  const [savedSearches, setSavedSearches] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingSearch, setPendingSearch] = useState(null);
  const [chatConversationId, setChatConversationId] = useState(null);
  const [chatOpenOffer, setChatOpenOffer]           = useState(false);
  const [inboxUnreadCount, setInboxUnreadCount]     = useState(0);
  const [activityNotifs, setActivityNotifs]         = useState([]);

  // ── auth ──────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  // ── per-session data ──────────────────────────────────
  useEffect(() => {
    if (!session) {
      setFavIds(new Set());
      setFollowIds(new Set());
      setSavedSearches([]);
      setNotifications([]);
      setInboxUnreadCount(0);
      setActivityNotifs([]);
      return;
    }

    supabase.from('favourites').select('listing_id').eq('user_id', session.user.id)
      .then(({ data }) => { if (data) setFavIds(new Set(data.map((f) => f.listing_id))); });

    supabase.from('follows').select('followed_id').eq('follower_id', session.user.id)
      .then(({ data }) => { if (data) setFollowIds(new Set(data.map((f) => f.followed_id))); });

    supabase.from('saved_searches').select('*').eq('user_id', session.user.id).order('created_at')
      .then(({ data }) => {
        if (data) {
          setSavedSearches(data);
          checkNotifications(data);
        }
      });

    loadUnreadCount(session.user.id);
    loadActivityNotifs(session.user.id);
  }, [session]);

  // ── realtime: activity notifications ─────────────────
  useEffect(() => {
    if (!session) return;
    const uid = session.user.id;
    const channel = supabase
      .channel('activity-notifs')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'user_notifications',
        filter: `user_id=eq.${uid}`,
      }, ({ new: notif }) => {
        setActivityNotifs((prev) => [notif, ...prev]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session]);

  // ── activity notifications ────────────────────────────
  const loadActivityNotifs = async (uid) => {
    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setActivityNotifs(data);
  };

  const dismissActivityNotif = async (id) => {
    const now = new Date().toISOString();
    await supabase.from('user_notifications').update({ read_at: now }).eq('id', id);
    setActivityNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read_at: now } : n));
  };

  const openActivityNotif = async (notif) => {
    // mark read
    await dismissActivityNotif(notif.id);

    // if it links to a listing, try to find the conversation between actor (buyer) and that listing
    if (notif.listing_id && notif.actor_id) {
      const { data: conv } = await supabase
        .from('conversations').select('id')
        .eq('listing_id', notif.listing_id)
        .eq('buyer_id', notif.actor_id)
        .maybeSingle();

      if (conv) {
        setChatConversationId(conv.id);
        setChatOpenOffer(false);
        setView('chat');
        return;
      }
    }
    // no conversation yet — just show the inbox
    setView('inbox');
  };

  // ── inbox unread count ────────────────────────────────
  const loadUnreadCount = async (uid) => {
    const { count } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .neq('sender_id', uid)
      .is('read_at', null)
      .filter('conversation_id', 'in', `(select id from conversations where buyer_id='${uid}' or seller_id='${uid}')`);
    setInboxUnreadCount(count || 0);
  };

  // ── saved-search notification check ──────────────────
  const checkNotifications = useCallback(async (searches) => {
    if (!searches?.length) { setNotifications([]); return; }
    const hits = [];
    for (const s of searches) {
      let q = supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .in('status', ['active', 'reserved'])
        .gt('created_at', s.last_notified_at);

      const f = s.filters || {};
      if (f.search)   q = q.or(`brand.ilike.%${f.search}%,model.ilike.%${f.search}%,color.ilike.%${f.search}%`);
      if (f.brand)    q = q.eq('brand', f.brand);
      if (f.condition) q = q.eq('condition', f.condition);
      if (f.color)    q = q.ilike('color', `%${f.color}%`);
      if (f.location) q = q.eq('pickup_location', f.location);
      if (f.size)     q = q.eq('size', Number(f.size));
      if (f.priceMin) q = q.gte('price', Number(f.priceMin));
      if (f.priceMax) q = q.lte('price', Number(f.priceMax));

      const { count } = await q;
      if (count > 0) hits.push({ id: s.id, name: s.name, count, filters: s.filters });
    }
    setNotifications(hits);
  }, []);

  // ── favourites ────────────────────────────────────────
  const toggleFav = async (listingId) => {
    if (!session) return;
    if (favIds.has(listingId)) {
      setFavIds((p) => { const s = new Set(p); s.delete(listingId); return s; });
      await supabase.from('favourites').delete()
        .eq('user_id', session.user.id).eq('listing_id', listingId);
    } else {
      setFavIds((p) => new Set([...p, listingId]));
      await supabase.from('favourites').insert({ user_id: session.user.id, listing_id: listingId });
    }
  };

  // ── follows ───────────────────────────────────────────
  const toggleFollow = async (userId) => {
    if (!session || userId === session.user.id) return;
    if (followIds.has(userId)) {
      setFollowIds((p) => { const s = new Set(p); s.delete(userId); return s; });
      await supabase.from('follows').delete()
        .eq('follower_id', session.user.id).eq('followed_id', userId);
    } else {
      setFollowIds((p) => new Set([...p, userId]));
      await supabase.from('follows').insert({ follower_id: session.user.id, followed_id: userId });
    }
  };

  // ── saved searches ────────────────────────────────────
  const saveSearch = async (name, filters) => {
    const { data } = await supabase.from('saved_searches')
      .insert({ user_id: session.user.id, name, filters })
      .select().single();
    if (data) setSavedSearches((p) => [...p, data]);
  };

  const deleteSearch = async (id) => {
    await supabase.from('saved_searches').delete().eq('id', id);
    setSavedSearches((p) => p.filter((s) => s.id !== id));
    setNotifications((p) => p.filter((n) => n.id !== id));
  };

  // ── start / open chat ────────────────────────────────
  const startChat = async (listing, openOffer = false) => {
    if (!session) return;
    const sellerId = listing.seller_id || listing.user_id;

    // find existing conversation first (upsert not used — RLS only allows buyer to insert)
    const { data: existing } = await supabase
      .from('conversations').select('id')
      .eq('buyer_id', session.user.id).eq('listing_id', listing.id)
      .maybeSingle();

    let convId = existing?.id;
    if (!convId) {
      const { data: newConv } = await supabase.from('conversations')
        .insert({ buyer_id: session.user.id, seller_id: sellerId, listing_id: listing.id })
        .select('id').single();
      convId = newConv?.id;
    }

    if (convId) {
      setChatConversationId(convId);
      setChatOpenOffer(openOffer);
      setView('chat');
    }
  };

  // ── notifications ─────────────────────────────────────
  const dismissNotification = async (searchId) => {
    const now = new Date().toISOString();
    await supabase.from('saved_searches').update({ last_notified_at: now }).eq('id', searchId);
    setSavedSearches((p) => p.map((s) => s.id === searchId ? { ...s, last_notified_at: now } : s));
    setNotifications((p) => p.filter((n) => n.id !== searchId));
  };

  const applyNotification = (notification) => {
    setPendingSearch(notification.filters);
    setView('marketplace');
    dismissNotification(notification.id);
  };

  // ── shared props ──────────────────────────────────────
  const sharedProps = {
    session, favIds, onToggleFav: toggleFav,
    followIds, onToggleFollow: toggleFollow,
    onStartChat: startChat,
  };
  const marketplaceProps = {
    ...sharedProps,
    savedSearches,
    onSaveSearch: saveSearch,
    onDeleteSearch: deleteSearch,
    pendingSearch,
    onPendingSearchCleared: () => setPendingSearch(null),
  };

  return (
    <div className="page">
      <Nav
        session={session}
        view={view}
        onNavigate={setView}
        notifications={notifications}
        onApplyNotification={applyNotification}
        onDismissNotification={dismissNotification}
        inboxUnreadCount={inboxUnreadCount}
        activityNotifs={activityNotifs}
        onOpenActivityNotif={openActivityNotif}
        onDismissActivityNotif={dismissActivityNotif}
      />

      {view === 'home' && (
        <>
          <Hero session={session} />
          <HowItWorks />
          <Marketplace {...marketplaceProps} />
          <AboutUs />
          <CampusMap />
          <CtaBanner />
        </>
      )}

      {view === 'marketplace' && <Marketplace {...marketplaceProps} />}
      {view === 'favourites'  && <MyFavourites {...sharedProps} />}
      {view === 'inbox'       && (
        <InboxScreen
          session={session}
          onOpenChat={(convId) => {
            setChatConversationId(convId);
            setChatOpenOffer(false);
            setView('chat');
          }}
        />
      )}
      {view === 'chat' && chatConversationId && (
        <ChatScreen
          conversationId={chatConversationId}
          session={session}
          openOffer={chatOpenOffer}
          onBack={() => setView('inbox')}
        />
      )}

      <Footer />
    </div>
  );
}
