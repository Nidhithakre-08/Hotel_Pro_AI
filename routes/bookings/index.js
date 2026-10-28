import { handler, methodNotAllowed, getAuth, requireUser, str, HttpError } from '../../lib/http.js';
import { find, findOne, insert, newId } from '../../lib/store.js';
import { validateGuest, validateDates, buildPayment, overlaps, TAX_RATE } from '../../lib/booking.js';
export default handler(async (req, res) => {
  const auth = getAuth(req);
  if (req.method === 'GET') {
    if (!auth) throw new HttpError(401, 'Please sign in to view bookings.');
    const q = auth.role === 'admin' ? {} : { userId: auth.sub };
    return res.json({ bookings: await find('bookings', q) });
  }
  if (req.method === 'POST') {
    const { sub } = requireUser(req);
    const b = req.body || {};
    const room = await findOne('rooms', { id: str(b.roomId, 60) });
    if (!room) throw new HttpError(404, 'Room not found.');
    if (room.status !== 'Available') throw new HttpError(409, 'This room is not available for booking right now.');
    const hotel = await findOne('hotels', { id: room.hotelId });
    if (!hotel || hotel.status === 'Inactive') throw new HttpError(409, 'This hotel is not accepting bookings.');
    const nights = validateDates(b.checkIn, b.checkOut);
    const guests = Number(b.guests);
    if (!Number.isInteger(guests) || guests < 1) throw new HttpError(400, 'At least one guest is required.');
    if (guests > room.capacity) throw new HttpError(400, `This room sleeps up to ${room.capacity} guests.`);
    const clash = (await find('bookings', { roomId: room.id })).some((x) => ['Confirmed', 'Checked-in'].includes(x.status) && overlaps(b.checkIn, b.checkOut, x.checkIn, x.checkOut));
    if (clash) throw new HttpError(409, 'Sorry, this room was just booked for those dates. Please pick different dates.');
    const guest = validateGuest(b.guest || {});
    const subtotal = room.price * nights, taxes = Math.round(subtotal * TAX_RATE), total = subtotal + taxes;
    const payment = buildPayment(b.payment, total);
    const booking = await insert('bookings', {
      bookingCode: 'HP' + newId().slice(0, 7), userId: sub,
      hotelId: hotel.id, hotelName: hotel.name, hotelCity: hotel.city,
      roomId: room.id, roomName: room.name, roomType: room.type, image: room.image,
      checkIn: b.checkIn, checkOut: b.checkOut, nights, guests,
      pricePerNight: room.price, subtotal, taxes, amount: total,
      status: 'Confirmed', guest, payment,
    });
    return res.status(201).json({ booking });
  }
  return methodNotAllowed(res, 'GET, POST');
});
