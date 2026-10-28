import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BedDouble, CalendarCheck, Headset, LifeBuoy, Mail, MessageCircle, Phone, Send, X } from 'lucide-react';
import { request } from './lib/api.js';
import { SLOTS, SUPPORT, isAbusive, telLink, waLink } from './lib/support.js';
import { fmtDate, money, roomFreeFor, todayIso, addDays, nightsBetween } from './lib/utils.js';
import './chatbot.css';

export function WhatsAppIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

// Floating WhatsApp button — opens a WhatsApp chat with the hotel's support number.
export function WhatsAppButton({ user }) {
  const text = user ? `Hi HotelPro, I'm ${user.name} (${user.email}). I need help.` : 'Hi HotelPro, I need help with a booking.';
  return (
    <a className="wa-fab" href={waLink(text)} target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp" title="Chat on WhatsApp">
      <WhatsAppIcon size={24} />
    </a>
  );
}

const CATEGORIES = ['Booking', 'Payment & refund', 'Cancellation', 'Room / stay issue', 'Account', 'Complaint', 'Other'];
const QUICK = [
  { label: 'Find available rooms', icon: BedDouble, action: 'search' },
  { label: 'My bookings', icon: CalendarCheck, action: 'bookings' },
  { label: 'Raise a ticket', icon: LifeBuoy, action: 'ticket' },
  { label: 'Book a call', icon: Phone, action: 'call' },
  { label: 'Talk to support', icon: Headset, action: 'support' },
];
let uid = 0;
const mk = (from, text, extra = {}) => ({ id: ++uid, from, text, ...extra });
const has = (t, re) => re.test(t);

export default function Chatbot({ user, hotels, rooms, bookings, dates, onSetDates, onBook, onSignIn, onBookingsChanged, onGo }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scroller = useRef(null);
  const abuseCount = useRef(0);
  const missCount = useRef(0);
  const msgsRef = useRef([]); msgsRef.current = msgs;

  const cities = useMemo(() => Array.from(new Set(hotels.map((h) => h.city))).filter(Boolean), [hotels]);
  const firstName = user?.name?.split(' ')[0];

  const push = useCallback((m) => setMsgs((p) => [...p, m]), []);
  const botSay = useCallback((text, extra) => push(mk('bot', text, extra)), [push]);
  const later = (fn, ms = 450) => { setTyping(true); setTimeout(() => { setTyping(false); fn(); }, ms); };

  useEffect(() => {
    if (open && msgs.length === 0) {
      botSay(`${firstName ? `Hi ${firstName}! 👋` : 'Hi! 👋'} Main HotelPro assistant hoon. Main rooms dhoondh sakta hoon, hotel book karwa sakta hoon, aapki booking check/cancel kar sakta hoon aur kisi bhi problem ka ticket bana sakta hoon. Bataiye, kya help chahiye?`, { quick: true });
    }
  }, [open]); // eslint-disable-line
  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [msgs, typing, open]);

  // ---------- actions the bot can perform ----------
  const askCity = () => botSay('Kaunse shehar me rehna hai? Choose karein ya city ka naam likh dein.', { buttons: [...cities.map((c) => ({ label: c, action: 'city', value: c })), { label: 'Any city', action: 'city', value: '' }] });
  const askDates = (city) => botSay(`${city ? `${city} — ` : ''}Dates aur guests select karein, main available rooms dikha deta hoon:`, { widget: 'dates', city: city || '' });

  function showRooms({ city, checkIn, checkOut, guests }) {
    onSetDates(checkIn, checkOut, guests);
    const n = nightsBetween(checkIn, checkOut);
    const hotelIds = new Set(hotels.filter((h) => !city || h.city === city).map((h) => h.id));
    const list = rooms.filter((r) => hotelIds.has(r.hotelId) && r.capacity >= guests && roomFreeFor(r, checkIn, checkOut)).sort((a, b) => a.price - b.price);
    if (!list.length) {
      return botSay(`Sorry, ${city || 'in hotels'} ${fmtDate(checkIn)} – ${fmtDate(checkOut)} ke liye ${guests} guest(s) ke liye koi room khali nahi hai. Dusri dates ya city try karein?`, { buttons: [{ label: 'Change dates', action: 'dates', value: city }, { label: 'Other city', action: 'search' }, { label: 'Talk to support', action: 'support' }] });
    }
    botSay(`${list.length} room${list.length > 1 ? 's' : ''} available hain (${fmtDate(checkIn)} → ${fmtDate(checkOut)}, ${n} night${n > 1 ? 's' : ''}, ${guests} guest${guests > 1 ? 's' : ''}). "Book" dabate hi booking form khulega:`, { widget: 'rooms', rooms: list.slice(0, 6), nights: n });
  }

  function showBookings(filter) {
    if (!user) return botSay('Booking dekhne ke liye pehle sign in karein.', { buttons: [{ label: 'Sign in', action: 'signin' }] });
    const list = (filter ? bookings.filter(filter) : bookings).slice(0, 5);
    if (!list.length) return botSay('Abhi koi booking nahi mili. Naya room book karna chahenge?', { buttons: [{ label: 'Find available rooms', action: 'search' }] });
    botSay(`Ye rahi aapki booking${list.length > 1 ? 's' : ''}:`, { widget: 'bookings', items: list });
  }

  function askCancel() {
    if (!user) return botSay('Booking cancel karne ke liye pehle sign in karein.', { buttons: [{ label: 'Sign in', action: 'signin' }] });
    const list = bookings.filter((b) => b.status === 'Confirmed');
    if (!list.length) return botSay('Aapki koi confirmed booking nahi hai jo cancel ho sake.');
    botSay('Kaunsi booking cancel karni hai? (Paid booking ka refund "Refunded" mark ho jata hai.)', { widget: 'bookings', items: list.slice(0, 5), cancellable: true });
  }

  async function cancelBooking(b) {
    setTyping(true);
    try {
      await request(`/bookings/${b.id}`, { method: 'PUT', body: JSON.stringify({ status: 'Cancelled' }) });
      onBookingsChanged?.();
      botSay(`✅ Booking ${b.bookingCode} (${b.hotelName}) cancel ho gayi.${b.payment?.status === 'Paid' ? ' Payment refund ke liye mark kar diya gaya hai.' : ''}`);
    } catch (e) { botSay(`Cancel nahi ho paya: ${e.message}`, { buttons: [{ label: 'Talk to support', action: 'support' }] }); }
    finally { setTyping(false); }
  }

  function askTicket(preset = {}) { botSay('Zaroor, problem ka ticket bana dete hain. Neeche details bharein — hamari team aapse contact karegi:', { widget: 'ticket', preset }); }

  function askCall() { botSay('Call appointment book karein — hamari team aapko chuni hui date aur time par call karegi:', { widget: 'call' }); }

  function supportCard() {
    botSay('Hamari support team se yahan se contact karein:', { widget: 'support', buttons: [{ label: 'Book a call appointment', action: 'call' }, { label: 'Raise a ticket', action: 'ticket' }] });
  }

  async function ticketStatus() {
    if (!user) return botSay('Tickets dekhne ke liye pehle sign in karein.', { buttons: [{ label: 'Sign in', action: 'signin' }] });
    setTyping(true);
    try {
      const { tickets } = await request('/tickets');
      if (!tickets.length) botSay('Aapka abhi koi ticket nahi hai.', { buttons: [{ label: 'Raise a ticket', action: 'ticket' }] });
      else botSay('Aapke tickets:', { widget: 'tickets', items: tickets.slice(0, 5) });
    } catch (e) { botSay(e.message); } finally { setTyping(false); }
  }

  function handleAbuse() {
    abuseCount.current += 1;
    if (abuseCount.current === 1) {
      return botSay('Main samajh sakta hoon ki aap pareshan hain, aur main sach me madad karna chahta hoon. Kripya respectful tareeke se baat karein 🙏 — bataiye kya problem hui? Agar aap chahein to abhi hamari customer support team se seedha baat kar sakte hain.', { buttons: [{ label: 'Talk to customer support', action: 'support' }, { label: 'Book a call', action: 'call' }] });
    }
    botSay('Main aapko ab hamari customer support team se jod raha hoon, taaki koi insaan aapki problem sunke solve kare. Neeche ticket submit karein (priority High mark hogi) ya seedha WhatsApp/call karein.', { buttons: [] });
    askTicket({ category: 'Complaint', message: 'Customer is upset and asked to speak with a human agent (escalated from chatbot). Please call back.', escalated: true, priority: 'High' });
    supportCard();
  }

  function onAction(a) {
    if (a.action === 'search') return later(askCity);
    if (a.action === 'city') { push(mk('user', a.value || 'Any city')); return later(() => askDates(a.value)); }
    if (a.action === 'dates') return later(() => askDates(a.value || ''));
    if (a.action === 'bookings') { push(mk('user', 'My bookings')); return later(() => showBookings()); }
    if (a.action === 'ticket') { push(mk('user', 'Raise a ticket')); return later(() => askTicket()); }
    if (a.action === 'call') { push(mk('user', 'Book a call appointment')); return later(askCall); }
    if (a.action === 'support') { push(mk('user', 'Talk to customer support')); return later(supportCard); }
    if (a.action === 'cancel') { push(mk('user', 'Cancel a booking')); return later(askCancel); }
    if (a.action === 'ticketstatus') { push(mk('user', 'My tickets')); return ticketStatus(); }
    if (a.action === 'signin') return onSignIn();
    if (a.action === 'faq') { push(mk('user', a.label)); return later(() => answer(a.value)); }
  }

  // ---------- understanding what the customer typed ----------
  function answer(raw) {
    const t = raw.toLowerCase().trim();
    if (isAbusive(t)) return handleAbuse();

    const code = raw.match(/\bHP[0-9A-F]{7}\b/i);
    if (code) {
      if (!user) return botSay('Booking details dekhne ke liye pehle sign in karein.', { buttons: [{ label: 'Sign in', action: 'signin' }] });
      const found = bookings.filter((b) => b.bookingCode.toUpperCase() === code[0].toUpperCase());
      return found.length ? showBookings((b) => b.bookingCode.toUpperCase() === code[0].toUpperCase()) : botSay(`Booking ${code[0].toUpperCase()} aapke account me nahi mili. Code dobara check karein, ya support se poochh lein.`, { buttons: [{ label: 'Talk to support', action: 'support' }] });
    }
    if (has(t, /\bTK[0-9a-f]{6}\b|ticket status|my tickets|mere ticket/)) return ticketStatus();

    const city = cities.find((c) => t.includes(c.toLowerCase()));
    if (has(t, /^(hi+|hello+|hey+|hii+|namaste|namaskar|good (morning|afternoon|evening))\b/)) { missCount.current = 0; return botSay(`${firstName ? `Hello ${firstName}!` : 'Hello!'} Kaise madad kar sakta hoon?`, { quick: true }); }
    if (has(t, /(thank|thanks|shukriya|dhanyavad|dhanyawad|धन्यवाद|शुक्रिया)/)) return botSay('Aapka swagat hai! 😊 Aur kuch help chahiye to bataiye.');
    if (has(t, /^(bye|goodbye|ok bye|alvida)\b/)) return botSay('Dhanyavad! Aapka stay shaandar ho. 🏨');
    if (has(t, /(appointment|callback|call back|call me|call karo|call kar|phone kar|baat karni|baat karna|schedule a call|book a call|कॉल)/)) return askCall();
    if (has(t, /(human|agent|customer (care|support)|support team|executive|representative|manager|insaan|मदद|सहायता)/)) return supportCard();
    if (has(t, /(cancel|radd|रद्द|band kar)/)) return askCancel();
    if (has(t, /(refund|paisa wapas|paise wapas|money back|पैसे वापस)/)) return botSay('Refund: jab aap booking cancel karte hain aur payment "Paid" thi, to payment "Refunded" mark ho jata hai. Pay-at-hotel bookings me koi payment nahi hoti. Refund me koi problem ho to ticket raise karein.', { buttons: [{ label: 'Cancel a booking', action: 'cancel' }, { label: 'Raise a ticket', action: 'ticket' }] });
    if (has(t, /(my booking|meri booking|mera booking|booking status|booking details|reservation|booking dekh|बुकिंग देख)/)) return showBookings();
    if (has(t, /(complain|complaint|shikayat|शिकायत|problem|issue|dikkat|pareshani|samasya|दिक्कत|समस्या|not working|nahi chal|galat|wrong|fraud)/)) return askTicket({ message: raw.length > 12 ? raw : '' });
    if (has(t, /\btickets?\b/)) return botSay('Aap kis cheez ka ticket chahte hain?', { buttons: [{ label: 'Support ticket (problem)', action: 'ticket' }, { label: 'Book a hotel room', action: 'search' }] });
    if (has(t, /(payment|pay\b|upi|net ?banking|card|paise|gst|tax|charges?)/) && !has(t, /(book|room|available)/)) return botSay('Payment options: Card, UPI, Net banking ya Pay at hotel. Taxes 12% hote hain aur final total booking se pehle dikhta hai. Card ki poori details store nahi hoti — sirf brand aur last 4 digits.', { buttons: [{ label: 'Find available rooms', action: 'search' }] });
    if (has(t, /(price|rate|kitna|kitne|cost|sasta|cheap|budget|कीमत|किराया)/) && !city) return botSay('Rooms ke rate hotel aur room type par depend karte hain. Dates batayein, main per-night price ke saath available rooms dikha deta hoon.', { buttons: [{ label: 'Find available rooms', action: 'search' }] });
    if (has(t, /(id proof|aadhaar|aadhar|passport|documents?)/)) return botSay('Booking ke time guest ka ID proof (Aadhaar, Passport, Driving licence, Voter ID ya PAN) type aur number dena hota hai.');
    if (has(t, /(contact|phone number|email|address|helpline|number)/)) return supportCard();
    if (has(t, /(book|hotel|room|rooms|available|availability|stay|kamra|kamre|rukna|ruk|khali|vacant|search|dhund|dhoond|होटल|कमरा|बुक)/) || city) {
      missCount.current = 0;
      return city ? askDates(city) : askCity();
    }
    // not understood
    missCount.current += 1;
    if (missCount.current >= 2) return botSay('Lagta hai main aapki baat sahi se samajh nahi paa raha. Chahein to hamari support team se seedha baat kar lein — woh har problem solve karegi.', { buttons: [{ label: 'Talk to customer support', action: 'support' }, { label: 'Raise a ticket', action: 'ticket' }] });
    botSay('Maaf kijiye, main ye samajh nahi paya. Aap ye try kar sakte hain:', { quick: true });
  }

  function send(e) {
    e?.preventDefault();
    const text = input.trim(); if (!text) return;
    setInput(''); push(mk('user', text));
    later(() => answer(text), 500);
  }

  const transcript = () => msgsRef.current.filter((m) => m.text).map((m) => ({ from: m.from, text: m.text }));
  const ctx = { user, dates, cities, transcript, botSay, push, later, cancelBooking, onBook: (room) => { setOpen(false); onBook(room); }, showRooms, onAction, onGo: (p) => { setOpen(false); onGo(p); } };

  return (
    <>
      {!open && (
        <button className="cb-fab" onClick={() => setOpen(true)} aria-label="Open HotelPro assistant" title="Chat with us"><MessageCircle size={22} /></button>
      )}
      {open && (
        <section className="cb-panel" role="dialog" aria-label="HotelPro assistant">
          <header className="cb-head">
            <div className="cb-avatar"><MessageCircle size={19} /></div>
            <div><strong>HotelPro Assistant</strong><small><i /> Online · replies instantly</small></div>
            <button onClick={() => setOpen(false)} aria-label="Close chat"><X size={19} /></button>
          </header>
          <div className="cb-body" ref={scroller}>
            {msgs.map((m) => <Message key={m.id} m={m} ctx={ctx} />)}
            {typing && <div className="cb-row bot"><div className="cb-bubble cb-typing"><i /><i /><i /></div></div>}
          </div>
          <form className="cb-input" onSubmit={send}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question… (Hindi / English)" maxLength={400} aria-label="Message" />
            <button type="submit" disabled={!input.trim()} aria-label="Send"><Send size={18} /></button>
          </form>
          <div className="cb-foot"><a href={waLink()} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={14} /> WhatsApp</a><a href={telLink()}><Phone size={13} /> Call</a><a href={`mailto:${SUPPORT.email}`}><Mail size={13} /> Email</a></div>
        </section>
      )}
    </>
  );
}

function Message({ m, ctx }) {
  return (
    <div className={`cb-row ${m.from}`}>
      <div className="cb-stack">
        <div className="cb-bubble">{m.text}</div>
        {m.widget === 'dates' && <DatesWidget ctx={ctx} city={m.city} />}
        {m.widget === 'rooms' && <RoomsWidget m={m} ctx={ctx} />}
        {m.widget === 'bookings' && <BookingsWidget m={m} ctx={ctx} />}
        {m.widget === 'tickets' && <TicketsList items={m.items} />}
        {m.widget === 'ticket' && <TicketWidget preset={m.preset} ctx={ctx} />}
        {m.widget === 'support' && <SupportWidget />}
        {m.widget === 'wa' && <div className="cb-card cb-support"><a className="wa" href={m.href} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} /> Confirm on WhatsApp</a></div>}
        {m.widget === 'call' && <CallWidget ctx={ctx} />}
        {m.quick && <div className="cb-chips">{QUICK.map((q) => <button key={q.action} onClick={() => ctx.onAction(q)}><q.icon size={14} /> {q.label}</button>)}</div>}
        {m.buttons?.length > 0 && <div className="cb-chips">{m.buttons.map((b) => <button key={b.label} onClick={() => ctx.onAction(b)}>{b.label}</button>)}</div>}
      </div>
    </div>
  );
}

function DatesWidget({ ctx, city }) {
  const today = todayIso();
  const [ci, setCi] = useState(ctx.dates.checkIn >= today ? ctx.dates.checkIn : addDays(today, 1));
  const [co, setCo] = useState(ctx.dates.checkOut > ci ? ctx.dates.checkOut : addDays(ci, 2));
  const [g, setG] = useState(ctx.dates.guests || 2);
  const [done, setDone] = useState(false);
  const bad = !(co > ci) || nightsBetween(ci, co) > 30;
  function go(e) {
    e.preventDefault(); if (bad) return; setDone(true);
    ctx.push({ id: ++uid, from: 'user', text: `${fmtDate(ci)} → ${fmtDate(co)} · ${g} guest${g > 1 ? 's' : ''}` });
    ctx.later(() => ctx.showRooms({ city, checkIn: ci, checkOut: co, guests: g }), 600);
  }
  return (
    <form className="cb-card cb-form" onSubmit={go}>
      <div className="cb-grid2">
        <label>CHECK-IN<input type="date" min={today} value={ci} onChange={(e) => { setCi(e.target.value); if (co <= e.target.value) setCo(addDays(e.target.value, 1)); }} disabled={done} /></label>
        <label>CHECK-OUT<input type="date" min={addDays(ci, 1)} value={co} onChange={(e) => setCo(e.target.value)} disabled={done} /></label>
      </div>
      <label>GUESTS<select value={g} onChange={(e) => setG(+e.target.value)} disabled={done}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}</select></label>
      {bad && <small className="cb-err">Check-out must be after check-in (max 30 nights).</small>}
      <button className="cb-primary" disabled={bad || done}>Show available rooms <ArrowRight size={15} /></button>
    </form>
  );
}
function RoomsWidget({ m, ctx }) {
  return (
    <div className="cb-rooms">
      {m.rooms.map((r) => (
        <div className="cb-room" key={r.id}>
          <img src={r.image} alt="" loading="lazy" />
          <div><b>{r.name}</b><small>{r.type} · up to {r.capacity} guests</small><span>{money(r.price)} <i>/ night</i> · {money(r.price * m.nights)} total*</span></div>
          <button onClick={() => ctx.onBook(r)}>Book</button>
        </div>
      ))}
      <small className="cb-note">*Taxes (12%) extra, booking form me dikhte hain.</small>
    </div>
  );
}

function BookingsWidget({ m, ctx }) {
  const [busy, setBusy] = useState(null);
  return (
    <div className="cb-rooms">
      {m.items.map((b) => (
        <div className="cb-booking" key={b.id}>
          <div><b>{b.hotelName}</b><small>{b.roomName} · {fmtDate(b.checkIn)} → {fmtDate(b.checkOut)}</small><small>{b.bookingCode} · {money(b.amount)} · <em className={`cb-st st-${b.status.replace(/\W/g, '')}`}>{b.status}</em> · Payment {b.payment?.status}</small></div>
          {m.cancellable && <button className="cb-danger" disabled={busy === b.id} onClick={async () => { setBusy(b.id); await ctx.cancelBooking(b); setBusy(null); }}>Cancel</button>}
        </div>
      ))}
      {!m.cancellable && m.items.some((b) => b.status === 'Confirmed') && <div className="cb-chips"><button onClick={() => ctx.onAction({ action: 'cancel' })}>Cancel a booking</button><button onClick={() => ctx.onGo('My bookings')}>Open My bookings</button></div>}
    </div>
  );
}

function TicketsList({ items }) {
  return <div className="cb-rooms">{items.map((t) => <div className="cb-booking" key={t.id}><div><b>{t.ticketCode} · {t.category}</b><small>{t.subject}</small><small>Status: <em className="cb-st">{t.status}</em>{t.replies?.length ? ` · ${t.replies.length} repl${t.replies.length > 1 ? 'ies' : 'y'}` : ''}</small>{t.replies?.length > 0 && <small className="cb-reply">Support: {t.replies[t.replies.length - 1].text}</small>}</div></div>)}</div>;
}

function SupportWidget() {
  return (
    <div className="cb-card cb-support">
      <a className="wa" href={waLink()} target="_blank" rel="noopener noreferrer"><WhatsAppIcon size={18} /> Chat on WhatsApp</a>
      <a href={telLink()}><Phone size={16} /> Call {SUPPORT.phone}</a>
      <a href={`mailto:${SUPPORT.email}`}><Mail size={16} /> {SUPPORT.email}</a>
    </div>
  );
}

function TicketWidget({ preset = {}, ctx }) {
  const u = ctx.user;
  const [f, setF] = useState({ name: u?.name || '', phone: u?.phone || '', email: u?.email || '', category: preset.category || 'Booking', bookingCode: '', message: preset.message || '' });
  const [state, setState] = useState('idle'); // idle | busy | done
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setErr(''); setState('busy');
    try {
      const { ticket } = await request('/tickets', { method: 'POST', body: JSON.stringify({ ...f, subject: `${f.category}${f.bookingCode ? ` · ${f.bookingCode}` : ''}`, escalated: !!preset.escalated, priority: preset.priority || 'Normal', transcript: ctx.transcript() }) });
      setState('done');
      ctx.botSay(`✅ Ticket ${ticket.ticketCode} ban gaya. Hamari team jaldi aapse ${f.phone ? 'call/WhatsApp' : 'email'} par contact karegi. Is code se aap yahan status poochh sakte hain ("ticket status").`, { widget: 'support' });
    } catch (x) { setErr(x.message); setState('idle'); }
  }
  if (state === 'done') return <div className="cb-card cb-ok">Ticket submitted ✔</div>;
  return (
    <form className="cb-card cb-form" onSubmit={submit}>
      {!u && <div className="cb-grid2"><label>NAME<input value={f.name} onChange={set('name')} maxLength={120} required /></label><label>PHONE<input type="tel" value={f.phone} onChange={set('phone')} placeholder="+91…" /></label></div>}
      {!u && <label>EMAIL (optional)<input type="email" value={f.email} onChange={set('email')} /></label>}
      <div className="cb-grid2"><label>TOPIC<select value={f.category} onChange={set('category')}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label><label>BOOKING CODE<input value={f.bookingCode} onChange={set('bookingCode')} placeholder="HP… (optional)" maxLength={12} /></label></div>
      <label>WHAT HAPPENED?<textarea rows={3} value={f.message} onChange={set('message')} placeholder="Apni problem likhein…" maxLength={1500} required /></label>
      {err && <small className="cb-err">{err}</small>}
      <button className="cb-primary" disabled={state === 'busy'}>{state === 'busy' ? 'Submitting…' : 'Submit ticket'}</button>
    </form>
  );
}

function CallWidget({ ctx }) {
  const u = ctx.user; const today = todayIso();
  const [f, setF] = useState({ name: u?.name || '', phone: u?.phone || '', date: addDays(today, 1), slot: SLOTS[0], message: '' });
  const [state, setState] = useState('idle'); const [err, setErr] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setErr(''); setState('busy');
    try {
      const { ticket } = await request('/tickets', { method: 'POST', body: JSON.stringify({ name: f.name, phone: f.phone, email: u?.email || '', message: f.message, appointment: { date: f.date, slot: f.slot }, transcript: ctx.transcript() }) });
      setState('done');
      const wa = waLink(`Hi HotelPro, I booked a call appointment ${ticket.ticketCode} for ${fmtDate(f.date)}, ${f.slot}. Name: ${f.name}.`);
      ctx.botSay(`✅ Call appointment confirm: ${fmtDate(f.date)}, ${f.slot}. Reference: ${ticket.ticketCode}. Hamari team ${f.phone} par call karegi.`, { widget: 'wa', href: wa });
    } catch (x) { setErr(x.message); setState('idle'); }
  }
  if (state === 'done') return <div className="cb-card cb-ok">Appointment booked ✔</div>;
  return (
    <form className="cb-card cb-form" onSubmit={submit}>
      <div className="cb-grid2"><label>NAME<input value={f.name} onChange={set('name')} maxLength={120} required /></label><label>PHONE<input type="tel" value={f.phone} onChange={set('phone')} placeholder="+91…" required /></label></div>
      <div className="cb-grid2"><label>DATE<input type="date" min={today} value={f.date} onChange={set('date')} required /></label><label>TIME<select value={f.slot} onChange={set('slot')}>{SLOTS.map((s) => <option key={s}>{s}</option>)}</select></label></div>
      <label>TOPIC (optional)<input value={f.message} onChange={set('message')} placeholder="Booking help, refund, group stay…" maxLength={300} /></label>
      {err && <small className="cb-err">{err}</small>}
      <button className="cb-primary" disabled={state === 'busy'}>{state === 'busy' ? 'Booking…' : 'Book call appointment'}</button>
    </form>
  );
}
