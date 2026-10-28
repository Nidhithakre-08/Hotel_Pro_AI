import { handler, methodNotAllowed, getAuth, str, HttpError } from '../../lib/http.js';
import { findOne, update, remove } from '../../lib/store.js';
import { validateGuest, BOOKING_STATUSES, PAYMENT_STATUSES } from '../../lib/booking.js';
export default handler(async (req, res) => {
  const auth = getAuth(req);
  if (!auth) throw new HttpError(401, 'Please sign in.');
  const isAdmin = auth.role === 'admin';
  const id = req.query.id;
  const booking = (await findOne('bookings', { id })) || (await findOne('bookings', { bookingCode: id }));
  if (!booking || (!isAdmin && booking.userId !== auth.sub)) throw new HttpError(404, 'Booking not found.');
  if (req.method === 'GET') return res.json({ booking });
  if (req.method === 'PUT') {
    const b = req.body || {};
    const patch = {};
    if (b.status !== undefined) {
      if (!BOOKING_STATUSES.includes(b.status)) throw new HttpError(400, 'Invalid status.');
      if (!isAdmin && b.status !== 'Cancelled') throw new HttpError(403, 'You can only cancel your own booking.');
      if (!isAdmin && booking.status !== 'Confirmed') throw new HttpError(409, 'Only confirmed bookings can be cancelled.');
      patch.status = b.status;
      if (b.status === 'Cancelled') {
        patch.cancelledAt = new Date().toISOString();
        if (booking.payment?.status === 'Paid') patch.payment = { ...booking.payment, status: 'Refunded', refundedAt: new Date().toISOString() };
      }
    }
    if (isAdmin && b.paymentStatus !== undefined) {
      if (!PAYMENT_STATUSES.includes(b.paymentStatus)) throw new HttpError(400, 'Invalid payment status.');
      patch.payment = { ...(patch.payment || booking.payment), status: b.paymentStatus };
    }
    if (b.guest !== undefined) {
      if (booking.status === 'Cancelled' || booking.status === 'Completed') throw new HttpError(409, 'This booking can no longer be edited.');
      patch.guest = validateGuest({ ...booking.guest, ...b.guest });
    }
    if (!Object.keys(patch).length) throw new HttpError(400, 'Nothing to update.');
    return res.json({ booking: await update('bookings', booking.id, patch) });
  }
  if (req.method === 'DELETE') {
    if (!isAdmin && !['Cancelled', 'Completed'].includes(booking.status)) throw new HttpError(409, 'Cancel this booking first, then you can delete it from your list.');
    await remove('bookings', booking.id);
    return res.json({ ok: true });
  }
  return methodNotAllowed(res, 'GET, PUT, DELETE');
});
