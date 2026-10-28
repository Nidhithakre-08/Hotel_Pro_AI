import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, BedDouble, CalendarCheck, CalendarDays, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Compass, Heart, Hotel, LockKeyhole, LogIn, LogOut, Mail, MapPin, Menu, MoreHorizontal, Phone, Search, Settings, ShieldCheck, SlidersHorizontal, Sparkles, Star, Users, Wallet, X } from 'lucide-react';
import { request, TOKEN_KEYS } from './lib/api.js';
import { addDays, initials, money, nightsBetween, roomFreeFor, todayIso } from './lib/utils.js';
import { NotificationsPanel, ProfileDashboard, SettingsPanel } from './AccountPanels.jsx';
import BookingFlow from './BookingFlow.jsx';
import MyBookings from './MyBookings.jsx';
import { StatusPill } from './components.jsx';
import Chatbot, { WhatsAppButton } from './Chatbot.jsx';
import { waLink } from './lib/support.js';

const HERO = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2200&q=90';

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('hotelpro_user') || 'null'); } catch { return null; } });
  const [hotels, setHotels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [page, setPage] = useState('Discover');
  const [hotelId, setHotelId] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All stays');
  const [sort, setSort] = useState('Recommended');
  const [checkIn, setCheckIn] = useState(() => addDays(todayIso(), 3));
  const [checkOut, setCheckOut] = useState(() => addDays(todayIso(), 6));
  const [guests, setGuests] = useState(2);
  const [toast, setToast] = useState('');
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => { try { const s = JSON.parse(localStorage.getItem('hotelpro_notifications') || '[]'); return Array.isArray(s) ? s : []; } catch { return []; } });
  const [saved, setSaved] = useState(() => { try { return JSON.parse(localStorage.getItem('hotelpro_saved') || '[]'); } catch { return []; } });
  const [auth, setAuth] = useState(null); // {mode, notice}
  const [bookRoom, setBookRoom] = useState(null);
  const [pendingRoom, setPendingRoom] = useState(null);

  useEffect(() => { localStorage.setItem('hotelpro_saved', JSON.stringify(saved)); }, [saved]);
  useEffect(() => { localStorage.setItem('hotelpro_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 3500); return () => clearTimeout(t); } }, [toast]);

  const loadCatalog = useCallback(async () => {
    try {
      const [h, r] = await Promise.all([request('/hotels'), request('/rooms')]);
      setHotels(h.hotels); setRooms(r.rooms); setCatalogError('');
    } catch (e) { setCatalogError(e.message); } finally { setLoadingCatalog(false); }
  }, []);
  const loadBookings = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEYS.guest)) { setBookings([]); return; }
    setLoadingBookings(true);
    try { setBookings((await request('/bookings')).bookings); }
    catch (e) { if (e.status === 401) signOut(true); } finally { setLoadingBookings(false); }
  }, []); // eslint-disable-line
  useEffect(() => { loadCatalog(); }, [loadCatalog]);
  useEffect(() => { loadBookings(); }, [user, loadBookings]);

  const note = (type, message) => setNotifications((p) => [{ id: `${Date.now()}-${Math.random()}`, type, message, createdAt: new Date().toISOString(), read: false }, ...p].slice(0, 20));
  const go = (p) => { setPage(p); setMobileNav(false); setProfileOpen(false); window.scrollTo?.({ top: 0 }); };
  function signOut(silent) {
    localStorage.removeItem(TOKEN_KEYS.guest); localStorage.removeItem('hotelpro_user');
    setUser(null); setBookings([]); setProfileOpen(false); if (silent !== true) { setToast('You have been signed out.'); go('Discover'); }
  }
  function onAuthed(data, registering) {
    localStorage.setItem(TOKEN_KEYS.guest, data.token); localStorage.setItem('hotelpro_user', JSON.stringify(data.user));
    setUser(data.user); setAuth(null);
    setToast(registering ? `Welcome to HotelPro, ${data.user.name}.` : `Welcome back, ${data.user.name}.`);
    note('account', registering ? `Your account was created for ${data.user.email}.` : `You signed in as ${data.user.email}.`);
    if (pendingRoom) { setBookRoom(pendingRoom); setPendingRoom(null); }
  }
  function startBooking(room) {
    if (!user) { setPendingRoom(room); setAuth({ mode: 'signin', notice: 'Please sign in or create an account to book your stay.' }); return; }
    setBookRoom(room);
  }
  function bookingDone(b) { note('booking', `Your stay at ${b.hotelName} is confirmed (${b.bookingCode}).`); loadBookings(); loadCatalog(); }

  const hotelById = useMemo(() => Object.fromEntries(hotels.map((h) => [h.id, h])), [hotels]);
  const nights = nightsBetween(checkIn, checkOut);
  const datesValid = nights > 0;

  const visibleHotels = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = hotels.filter((h) => {
      const rs = rooms.filter((r) => r.hotelId === h.id);
      if (q && !`${h.name} ${h.city} ${h.country} ${h.address}`.toLowerCase().includes(q)) return false;
      if (!rs.some((r) => r.capacity >= guests && (!datesValid || roomFreeFor(r, checkIn, checkOut)))) return false;
      return true;
    });
    if (sort === 'Price: low to high') list = [...list].sort((a, b) => (a.fromPrice ?? 1e9) - (b.fromPrice ?? 1e9));
    if (sort === 'Top rated') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [hotels, rooms, query, guests, checkIn, checkOut, datesValid, sort]);

  const hotel = hotelById[hotelId];
  const hotelRooms = useMemo(() => {
    let list = rooms.filter((r) => r.hotelId === hotelId);
    if (typeFilter !== 'All stays') list = list.filter((r) => r.type === typeFilter);
    list = list.filter((r) => r.capacity >= guests);
    if (sort === 'Price: low to high') list = [...list].sort((a, b) => a.price - b.price);
    if (sort === 'Top rated') list = [...list].sort((a, b) => b.rating - a.rating);
    return list;
  }, [rooms, hotelId, typeFilter, guests, sort]);
  const roomTypes = useMemo(() => ['All stays', ...Array.from(new Set(rooms.filter((r) => r.hotelId === hotelId).map((r) => r.type)))], [rooms, hotelId]);
  const savedRooms = rooms.filter((r) => saved.includes(r.id));
  const toggleSave = (id) => setSaved((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const upcomingCount = bookings.filter((b) => ['Confirmed', 'Checked-in'].includes(b.status)).length;
  const openHotel = (id) => { setHotelId(id); setTypeFilter('All stays'); go('Hotel'); };

  const navItems = [{ name: 'Discover', icon: Compass }, { name: 'My bookings', icon: CalendarCheck }, { name: 'Saved stays', icon: Heart }];
  const crumb = page === 'Hotel' ? hotel?.name || 'Hotel' : page;

  const searchBar = (
    <section className="search-panel">
      <div className="search-field destination-field"><MapPin size={19} /><div><label>DESTINATION</label><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="City or hotel name" /></div></div><div className="search-separator" />
      <div className="search-field"><CalendarDays size={19} /><div><label>CHECK IN</label><input type="date" min={todayIso()} value={checkIn} onChange={(e) => { setCheckIn(e.target.value); if (e.target.value >= checkOut) setCheckOut(addDays(e.target.value, 1)); }} /></div></div><div className="search-separator" />
      <div className="search-field"><CalendarDays size={19} /><div><label>CHECK OUT</label><input type="date" min={addDays(checkIn, 1)} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div></div><div className="search-separator" />
      <div className="search-field guest-field"><Users size={19} /><div><label>GUESTS</label><select value={guests} onChange={(e) => setGuests(+e.target.value)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}</select></div></div>
      <button className="search-submit" aria-label="Search" onClick={() => { if (page !== 'Discover') go('Discover'); setTimeout(() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' }), 50); }}><Search size={19} /></button>
    </section>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
        <div className="brand"><div className="brand-mark"><Hotel size={21} /></div><div><span className="brand-name">hotelpro<span>.</span></span><small>STAYS, REIMAGINED</small></div><button className="icon-btn close-nav" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="workspace-label">YOUR SPACE</div>
        <nav>{navItems.map((n) => <button key={n.name} className={`nav-item ${page === n.name || (n.name === 'Discover' && page === 'Hotel') ? 'active' : ''}`} onClick={() => go(n.name)}><n.icon size={18} /><span>{n.name}</span>{n.name === 'My bookings' && upcomingCount > 0 && <b className="nav-count">{upcomingCount}</b>}{n.name === 'Saved stays' && saved.length > 0 && <b className="nav-count">{saved.length}</b>}</button>)}</nav>
        <div className="sidebar-bottom">
          <div className="help-card"><div className="help-icon"><CircleHelp size={18} /></div><strong>Need a hand?</strong><p>Our team is here for you, anytime.</p><button onClick={() => window.open(waLink(), '_blank', 'noopener')}>Get support <ArrowRight size={14} /></button></div>
          <button className={`nav-item settings-link ${page === 'Settings' ? 'active' : ''}`} onClick={() => go('Settings')}><Settings size={18} /><span>Settings</span></button>
          <div className="user-card">
            <button className="avatar profile-trigger" onClick={() => go('Profile')} aria-label="Open profile">{initials(user?.name || 'Guest')}</button>
            <button className="user-details profile-user-trigger" onClick={() => go('Profile')}><strong>{user?.name || 'Guest'}</strong><small>{user?.email || 'Not signed in'}</small></button>
            <button className="icon-btn" aria-label="Account menu" onClick={() => setProfileOpen(!profileOpen)}><MoreHorizontal size={19} /></button>
            {profileOpen && <div className="profile-menu">{user ? <><button onClick={() => go('Profile')}><Users size={15} /> My profile</button><button onClick={() => go('My bookings')}><CalendarCheck size={15} /> My bookings</button><button onClick={() => signOut()}><LogOut size={15} /> Sign out</button></> : <button onClick={() => { setProfileOpen(false); setAuth({ mode: 'signin' }); }}><LogIn size={15} /> Sign in</button>}</div>}
          </div>
        </div>
      </aside>
      {mobileNav && <div className="mobile-overlay" onClick={() => setMobileNav(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-btn menu-toggle" onClick={() => setMobileNav(true)} aria-label="Menu"><Menu size={20} /></button><span className="breadcrumb">HotelPro <ChevronRight size={14} /> <strong>{crumb}</strong></span></div>
          <div className="topbar-right">
            {!user ? <><button className="sign-in-btn" onClick={() => setAuth({ mode: 'signin' })}><LogIn size={15} /> Sign in</button><button className="sign-up-btn" onClick={() => setAuth({ mode: 'register' })}>Create account</button></> : <button className="sign-in-btn" onClick={() => signOut()}><LogOut size={15} /> Sign out</button>}
            <button className="icon-btn notification" aria-label="Notifications" onClick={() => setNotificationsOpen((o) => !o)}><Bell size={19} />{notifications.some((n) => !n.read) && <i />}</button>
            <button className="top-avatar top-profile-trigger" onClick={() => go('Profile')} aria-label="Profile">{initials(user?.name || 'Guest')}</button>
          </div>
          {notificationsOpen && <NotificationsPanel notifications={notifications} onClose={() => setNotificationsOpen(false)} onMarkRead={() => setNotifications((p) => p.map((n) => ({ ...n, read: true })))} onNavigate={(p) => { go(p); setNotificationsOpen(false); }} />}
        </header>

        {catalogError && <div className="top-alert">{catalogError} <button onClick={loadCatalog}>Retry</button></div>}

        {page === 'Discover' && <>
          <section className="hero"><img src={HERO} alt="Luxury resort pool and hotel" /><div className="hero-shade" /><div className="hero-content"><div className="eyebrow"><Sparkles size={14} /> YOUR NEXT CHAPTER STARTS HERE</div><h1>Stay somewhere<br /><em>special.</em></h1><p>Thoughtful spaces. Unforgettable moments.<br />Find a stay that feels like you.</p><button className="hero-cta" onClick={() => document.getElementById('stays')?.scrollIntoView({ behavior: 'smooth' })}>Explore hotels <ArrowRight size={16} /></button></div></section>
          {searchBar}
          <section className="content-section" id="stays">
            <div className="section-heading"><div><div className="section-kicker">MADE FOR YOUR KIND OF GETAWAY</div><h2>Find your <em>perfect hotel</em></h2><p>{datesValid ? `${nights} night${nights > 1 ? 's' : ''} · ${guests} guest${guests > 1 ? 's' : ''} · ${visibleHotels.length} hotel${visibleHotels.length === 1 ? '' : 's'} available` : 'Choose valid dates to see availability.'}</p></div>
              <label className="sort-select"><SlidersHorizontal size={16} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recommended</option><option>Price: low to high</option><option>Top rated</option></select><ChevronDown size={14} /></label></div>
            {loadingCatalog ? <div className="empty-state"><h3>Loading hotels…</h3></div> :
              <div className="room-grid hotel-grid">{visibleHotels.map((h) => (
                <article className="room-card" key={h.id}>
                  <div className="room-image-wrap"><img className="room-image" src={h.image} alt={h.name} /><span className="room-tag">{'★'.repeat(h.stars)} {h.stars}-STAR</span></div>
                  <div className="room-info">
                    <div className="room-title-line"><div><h3>{h.name}</h3><span className="room-subtitle"><MapPin size={12} /> {h.city}, {h.country}</span></div><div className="rating"><Star size={14} fill="currentColor" /> {h.rating}</div></div>
                    <p className="room-desc">{h.description}</p>
                    <div className="chip-row">{(h.amenities || []).slice(0, 4).map((a) => <span key={a}>{a}</span>)}</div>
                    <div className="room-card-bottom"><div>{h.fromPrice != null ? <><small>from </small><strong>{money(h.fromPrice)}</strong><span> / night</span></> : <span>No rooms yet</span>}</div><button className="view-room" onClick={() => openHotel(h.id)}>View rooms <ArrowRight size={15} /></button></div>
                  </div>
                </article>))}</div>}
            {!loadingCatalog && visibleHotels.length === 0 && <div className="empty-state"><Search size={28} /><h3>No hotels found</h3><p>Try another destination, different dates or fewer guests.</p><button onClick={() => { setQuery(''); setGuests(1); }}>Clear filters</button></div>}
            <div className="trust-strip"><div><ShieldCheck size={21} /><span><strong>Secure booking</strong><small>Your details stay protected</small></span></div><div><Wallet size={21} /><span><strong>Flexible payments</strong><small>Card, UPI, net banking or pay at hotel</small></span></div><div><Clock3 size={21} /><span><strong>Free cancellation</strong><small>Cancel anytime from My bookings</small></span></div><div><Sparkles size={21} /><span><strong>Handpicked quality</strong><small>Every detail considered</small></span></div></div>
          </section></>}

        {page === 'Hotel' && (hotel ? <>
          <section className="hero hotel-hero"><img src={hotel.image} alt={hotel.name} /><div className="hero-shade" /><div className="hero-content"><button className="back-link" onClick={() => go('Discover')}><ArrowLeft size={15} /> All hotels</button><div className="eyebrow"><MapPin size={14} /> {hotel.city.toUpperCase()}, {hotel.country.toUpperCase()}</div><h1>{hotel.name}</h1><p>{hotel.address}<br /><Star size={13} fill="currentColor" /> {hotel.rating} ({hotel.reviews} reviews) · {'★'.repeat(hotel.stars)}</p></div></section>
          {searchBar}
          <section className="content-section">
            <div className="hotel-about"><p>{hotel.description}</p><div className="chip-row big">{(hotel.amenities || []).map((a) => <span key={a}><Check size={13} /> {a}</span>)}</div></div>
            <div className="section-heading"><div><div className="section-kicker">CHOOSE YOUR ROOM</div><h2>Available <em>rooms</em></h2><p>{datesValid ? `${fmtRange(checkIn, checkOut)} · ${nights} night${nights > 1 ? 's' : ''}` : 'Choose valid dates to check availability.'}</p></div>
              <label className="sort-select"><SlidersHorizontal size={16} /><select value={sort} onChange={(e) => setSort(e.target.value)}><option>Recommended</option><option>Price: low to high</option><option>Top rated</option></select><ChevronDown size={14} /></label></div>
            <div className="type-filters filter-row">{roomTypes.map((t) => <button key={t} className={typeFilter === t ? 'filter-active' : ''} onClick={() => setTypeFilter(t)}>{t}</button>)}</div>
            <div className="room-grid">{hotelRooms.map((room) => {
              const free = datesValid && roomFreeFor(room, checkIn, checkOut);
              return (
                <article className={`room-card ${free ? '' : 'room-unavailable'}`} key={room.id}>
                  <div className="room-image-wrap"><img className="room-image" src={room.image} alt={room.name} />{room.tag && <span className="room-tag">{room.tag}</span>}<button className={`save-btn ${saved.includes(room.id) ? 'saved' : ''}`} aria-label="Save room" onClick={() => toggleSave(room.id)}><Heart size={18} fill={saved.includes(room.id) ? 'currentColor' : 'none'} /></button>{!free && <span className="sold-out">{room.status !== 'Available' ? 'Not available' : 'Booked for these dates'}</span>}</div>
                  <div className="room-info">
                    <div className="room-title-line"><div><h3>{room.name}</h3><span className="room-subtitle">{room.type} · {room.size}</span></div><div className="rating"><Star size={14} fill="currentColor" /> {room.rating}</div></div>
                    <p className="room-desc">{room.description}</p>
                    <div className="room-features"><span><BedDouble size={15} />{room.beds}</span><span><Users size={15} />Up to {room.capacity}</span></div>
                    <div className="chip-row">{(room.amenities || []).slice(0, 4).map((a) => <span key={a}>{a}</span>)}</div>
                    <div className="room-card-bottom"><div><strong>{money(room.price)}</strong><span> / night</span></div><button className="book-btn" disabled={!free} onClick={() => startBooking(room)}>{free ? <>Book now <ArrowRight size={15} /></> : 'Unavailable'}</button></div>
                  </div>
                </article>);
            })}</div>
            {hotelRooms.length === 0 && <div className="empty-state"><BedDouble size={28} /><h3>No rooms match</h3><p>Try a different room type or fewer guests.</p><button onClick={() => { setTypeFilter('All stays'); setGuests(1); }}>Clear filters</button></div>}
          </section></> : <section className="page-content"><div className="empty-state"><h3>Hotel not found</h3><button onClick={() => go('Discover')}>Back to hotels</button></div></section>)}

        {page === 'My bookings' && (user ? <MyBookings bookings={bookings} loading={loadingBookings} setPage={go} onChanged={async () => { await loadBookings(); await loadCatalog(); }} toast={setToast} /> :
          <section className="page-content"><div className="empty-state"><LockKeyhole size={30} /><h3>Sign in to see your bookings</h3><p>Your reservations are saved to your HotelPro account.</p><button onClick={() => setAuth({ mode: 'signin' })}>Sign in <ArrowRight size={15} /></button></div></section>)}

        {page === 'Saved stays' && <section className="page-content"><div className="section-kicker">YOUR SHORTLIST</div><h2>Saved <em>stays</em></h2><p className="page-lead">All the rooms you’ve had your eye on.</p>
          <div className="room-grid saved-grid">{savedRooms.map((r) => <article className="room-card" key={r.id}><div className="room-image-wrap"><img className="room-image" src={r.image} alt={r.name} /><button className="save-btn saved" onClick={() => toggleSave(r.id)} aria-label="Remove"><Heart size={18} fill="currentColor" /></button></div><div className="room-info"><h3>{r.name}</h3><span className="room-subtitle">{hotelById[r.hotelId]?.name} · {r.type}</span><div className="room-card-bottom"><strong>{money(r.price)} <small>/ night</small></strong><button className="view-room" onClick={() => openHotel(r.hotelId)}>View hotel <ArrowRight size={15} /></button></div></div></article>)}</div>
          {savedRooms.length === 0 && <div className="empty-state"><Heart size={28} /><h3>Your wishlist is waiting</h3><p>Tap the heart on any room to keep it close.</p><button onClick={() => go('Discover')}>Explore stays <ArrowRight size={15} /></button></div>}</section>}

        {page === 'Profile' && <ProfileDashboard user={user} bookings={bookings} savedRooms={savedRooms} onNavigate={go} onSignIn={() => setAuth({ mode: 'signin' })} />}
        {page === 'Settings' && <SettingsPanel user={user} onSignIn={() => setAuth({ mode: 'signin' })} onSignOut={() => signOut()} onToast={setToast} />}

        <footer className="footer"><div className="footer-brand"><div className="brand-mark"><Hotel size={18} /></div><span>hotelpro<span>.</span></span></div><p>Make room for better moments.</p><span>© 2026 HotelPro Hospitality</span></footer>
      </main>

      {bookRoom && <BookingFlow room={bookRoom} hotel={hotelById[bookRoom.hotelId]} user={user} dates={{ checkIn, checkOut, guests }} onClose={() => setBookRoom(null)} onDone={(b) => { bookingDone(b); go('My bookings'); }} />}
      {auth && <AuthModal mode={auth.mode} notice={auth.notice} onClose={() => { setAuth(null); setPendingRoom(null); }} onAuthed={onAuthed} />}
      <Chatbot user={user} hotels={hotels} rooms={rooms} bookings={bookings} dates={{ checkIn, checkOut, guests }}
        onSetDates={(a, b, c) => { setCheckIn(a); setCheckOut(b); setGuests(c); }} onBook={startBooking}
        onSignIn={() => setAuth({ mode: 'signin' })} onBookingsChanged={() => { loadBookings(); loadCatalog(); }} onGo={go} />
      <WhatsAppButton user={user} />
      {toast && <div className="toast"><span className="toast-check"><Check size={16} /></span>{toast}<button onClick={() => setToast('')}><X size={15} /></button></div>}
    </div>
  );
}
const fmtRange = (a, b) => `${new Date(a + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(b + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

export function AuthModal({ mode: initial, notice, onClose, onAuthed }) {
  const [mode, setMode] = useState(initial);
  const [role, setRole] = useState('guest'); // 'guest' | 'admin'
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdminLogin = role === 'admin' && mode !== 'register';
  const registering = mode === 'register';
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (isAdminLogin) {
        const d = await request('/auth/admin-login', { method: 'POST', body: JSON.stringify({ email: f.email, password: f.password }) }, 'admin');
        localStorage.setItem(TOKEN_KEYS.admin, d.token);
        window.location.assign('/admin'); // admin panel opens already signed in
        return;
      }
      const data = await request(`/auth/${registering ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(registering ? { name: f.name, email: f.email, phone: f.phone, password: f.password } : { email: f.email, password: f.password }) });
      onAuthed(data, registering);
    } catch (x) { setError(x.message); } finally { setBusy(false); }
  }
  return (
    <div className="login-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
        <div className="login-photo"><img src={HERO} alt="A peaceful luxury hotel resort" /><div className="login-photo-shade" /><div className="login-photo-brand"><span className="login-brand-mark"><Hotel size={19} /></span><span>hotelpro<span>.</span></span></div><div className="login-photo-copy"><span>THE ART OF GETTING AWAY</span><h2>A little more<br />room to <em>unwind.</em></h2><p>Come back to the places that make every journey feel special.</p></div></div>
        <div className="login-form-panel">
          <button type="button" className="login-close" onClick={onClose} aria-label="Close"><X size={19} /></button>
          <div className="login-form-content">
            <div className="login-kicker">{registering ? 'JOIN HOTELPRO' : isAdminLogin ? 'STAFF ACCESS' : 'WELCOME BACK'}</div>
            <h2 id="login-title">{registering ? 'Create your account' : isAdminLogin ? 'Admin sign in' : 'Guest sign in'}</h2>
            <p className="login-intro">{isAdminLogin ? 'Sign in with the administrator account to manage hotels, rooms and bookings.' : (notice || (registering ? 'Create an account to book stays and manage reservations.' : 'Sign in to book and manage your stays.'))}</p>
            {!registering && <div className="login-role-tabs" role="tablist"><button type="button" role="tab" aria-selected={role === 'guest'} className={role === 'guest' ? 'active' : ''} onClick={() => { setRole('guest'); setError(''); }}><Users size={15} /> Customer</button><button type="button" role="tab" aria-selected={role === 'admin'} className={role === 'admin' ? 'active' : ''} onClick={() => { setRole('admin'); setError(''); }}><ShieldCheck size={15} /> Admin</button></div>}
            <form className="login-form" onSubmit={submit}>
              {registering && <><label htmlFor="a-name">FULL NAME</label><div className="login-input-wrap"><Users size={17} /><input id="a-name" autoComplete="name" placeholder="Your name" value={f.name} onChange={set('name')} maxLength={120} required /></div></>}
              <label htmlFor="a-email">EMAIL ADDRESS</label><div className="login-input-wrap"><Mail size={17} /><input id="a-email" type="email" autoComplete="email" placeholder={isAdminLogin ? 'admin@hotelpro.com' : 'you@example.com'} value={f.email} onChange={set('email')} required /></div>
              {registering && <><label htmlFor="a-phone">PHONE (OPTIONAL)</label><div className="login-input-wrap"><Phone size={17} /><input id="a-phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" value={f.phone} onChange={set('phone')} /></div></>}
              <label htmlFor="a-pass">PASSWORD</label><div className="login-input-wrap"><LockKeyhole size={17} /><input id="a-pass" type="password" autoComplete={registering ? 'new-password' : 'current-password'} placeholder={registering ? 'At least 8 characters' : 'Enter your password'} value={f.password} onChange={set('password')} minLength={registering ? 8 : undefined} maxLength={128} required /></div>
              {error && <div className="login-error" role="alert">{error}</div>}
              <button className="login-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : <>{registering ? 'Create account' : isAdminLogin ? 'Sign in as admin' : 'Sign in'} <ArrowRight size={16} /></>}</button>
            </form>
            {!isAdminLogin && <div className="login-switch">{registering ? 'Already have an account?' : 'New to HotelPro?'} <button type="button" onClick={() => { setMode(registering ? 'signin' : 'register'); setError(''); }}>{registering ? 'Sign in' : 'Create account'}</button></div>}
          </div>
        </div>
      </section>
    </div>
  );
}
