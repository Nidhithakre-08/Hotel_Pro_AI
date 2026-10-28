const IMG = {
  pool: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1400&q=85',
  r1: 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85',
  r2: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85',
  r3: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85',
  r4: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85',
  r5: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85',
  r6: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85',
};
export const seedHotels = [
  { id: 'H-GOA', name: 'HotelPro Beach Resort', city: 'Goa', country: 'India', address: 'Candolim Beach Road, Goa 403515', stars: 5, rating: 4.9, reviews: 412, image: IMG.pool, description: 'A beachfront resort with palm-lined pools, a spa and sunset dining just steps from the sand.', amenities: ['Pool', 'Spa', 'Beach access', 'Restaurant', 'Free Wi-Fi'], status: 'Active' },
  { id: 'H-MUM', name: 'HotelPro Grand Mumbai', city: 'Mumbai', country: 'India', address: 'Marine Drive, Mumbai 400020', stars: 5, rating: 4.8, reviews: 530, image: IMG.r3, description: 'A landmark city hotel overlooking the Arabian Sea, built for business and leisure travellers.', amenities: ['Sea view', 'Gym', 'Restaurant', 'Airport shuttle', 'Free Wi-Fi'], status: 'Active' },
  { id: 'H-JAI', name: 'HotelPro Heritage Jaipur', city: 'Jaipur', country: 'India', address: 'Civil Lines, Jaipur 302006', stars: 4, rating: 4.7, reviews: 286, image: IMG.r5, description: 'A heritage-style haveli stay with courtyards, local cuisine and warm Rajasthani hospitality.', amenities: ['Courtyard', 'Restaurant', 'Yoga deck', 'Free parking', 'Free Wi-Fi'], status: 'Active' },
];
const room = (id, hotelId, name, type, price, capacity, beds, size, rating, reviews, tag, image, description, amenities) =>
  ({ id, hotelId, name, type, price, capacity, beds, size, rating, reviews, tag, image, description, amenities, status: 'Available' });
export const seedRooms = [
  room('HP-101', 'H-GOA', 'The Garden Suite', 'Suite', 12500, 2, '1 King bed', '48 m²', 4.96, 128, 'GUEST FAVOURITE', IMG.r1, 'A quiet sanctuary with warm natural textures, a private balcony and leafy garden views.', ['Wi-Fi', 'Breakfast', 'Balcony', 'Rain shower']),
  room('HP-204', 'H-GOA', 'Oceanview Deluxe', 'Deluxe', 8900, 2, '1 Queen bed', '36 m²', 4.89, 96, 'OCEAN VIEW', IMG.r2, 'Wake up to the horizon in this airy room with calming tones and a sweeping sea view.', ['Wi-Fi', 'Ocean view', 'Mini bar', 'Smart TV']),
  room('HP-118', 'H-GOA', 'Minimalist Studio', 'Studio', 5200, 2, '1 Queen bed', '28 m²', 4.82, 61, 'SMART STAY', IMG.r4, 'Thoughtfully designed and beautifully simple, with everything you need for a restful reset.', ['Wi-Fi', 'Work desk', 'Coffee', 'Smart TV']),
  room('HP-305', 'H-MUM', 'The Penthouse', 'Penthouse', 28000, 4, '2 King beds', '92 m²', 5, 74, 'SIGNATURE STAY', IMG.r3, 'Our signature residence with an expansive lounge, bespoke furnishings and a private terrace.', ['Wi-Fi', 'Private terrace', 'Lounge', 'Breakfast']),
  room('HP-221', 'H-MUM', 'Urban Executive', 'Executive', 9800, 2, '1 King bed', '40 m²', 4.87, 83, 'WORK & UNWIND', IMG.r6, 'A polished city retreat with a generous work area and the comfort to switch off.', ['Wi-Fi', 'Work desk', 'Coffee', 'Lounge access']),
  room('HP-402', 'H-JAI', 'The Family Residence', 'Family', 11000, 5, '2 beds + sofa bed', '68 m²', 4.91, 112, 'FAMILY PICK', IMG.r5, 'Room to spread out, thoughtful family comforts and a cosy corner for everyone.', ['Wi-Fi', 'Family lounge', 'Breakfast', 'Bath']),
  room('HP-130', 'H-JAI', 'Royal Haveli Suite', 'Suite', 14500, 3, '1 King bed + daybed', '55 m²', 4.93, 64, 'HERITAGE', IMG.r1, 'Carved-wood interiors, a private sit-out and views over the courtyard fountain.', ['Wi-Fi', 'Courtyard view', 'Breakfast', 'Bathtub']),
];
