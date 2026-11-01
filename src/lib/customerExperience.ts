/** Original, short Vietnamese customer feedback lines. Kept separate from the renderer. */
export type GuestPhase = 'waiting' | 'served' | 'impatient';
export type AlertTarget = 'sell' | 'market' | 'upgrade' | null;
export type RestaurantAlert = {
  id: 'orders' | 'inventory' | 'crowded' | 'departures';
  level: 'info' | 'warning' | 'urgent';
  title: string;
  detail: string;
  target: AlertTarget;
};

const CHAT: Record<GuestPhase, readonly string[]> = {
  waiting: [
    'Nghe nói cá ở đây tươi lắm!',
    'Hôm nay có món gì ngon nhỉ?',
    'Mùi đồ biển thơm quá!',
    'Cho mình xem thực đơn với!',
    'Ngồi hóng gió biển thích ghê!',
  ],
  served: ['Tươi ngon quá!', 'Mai mình lại ghé!', 'Đúng vị biển quê mình!'],
  impatient: ['Món của mình đâu rồi?', 'Chờ hơi lâu rồi đó!', 'Hay mình ghé quán khác?'],
};

export function customerChat(phase: GuestPhase, sequence: number): string {
  const lines = CHAT[phase];
  const i = Number.isFinite(sequence) ? Math.abs(Math.floor(sequence)) : 0;
  return lines[i % lines.length];
}

export function getRestaurantWarnings(input: {
  waiting: number; stock: number; leftUnserved: number; tables: number;
}): RestaurantAlert[] {
  const waiting = Math.max(0, Math.floor(input.waiting || 0));
  const stock = Math.max(0, Math.floor(input.stock || 0));
  const left = Math.max(0, Math.floor(input.leftUnserved || 0));
  const tables = Math.max(1, Math.floor(input.tables || 1));
  const alerts: RestaurantAlert[] = [];
  if (left > 0) alerts.push({ id: 'departures', level: 'urgent',
    title: `${left} khách đã bỏ về`,
    detail: 'Khách đợi quá lâu. Tăng tốc phục vụ để giữ danh tiếng quán.', target: null });
  if (waiting > 0) alerts.push({ id: 'orders', level: waiting >= 3 ? 'warning' : 'info',
    title: `${waiting} khách đang gọi món`, detail: 'Chọn cá trong kho để phục vụ khách trước khi hết kiên nhẫn.', target: 'sell' });
  if (stock <= 2) alerts.push({ id: 'inventory', level: stock === 0 ? 'urgent' : 'warning',
    title: stock === 0 ? 'Kho đã hết hải sản' : 'Hải sản sắp hết',
    detail: 'Đi câu cá hoặc nhập hàng ở chợ để có món cho khách.', target: 'market' });
  if (waiting >= tables && tables >= 2) alerts.push({ id: 'crowded', level: 'warning',
    title: 'Quán đang đông khách', detail: 'Xem xét mở thêm bàn để đón khách mới.', target: 'upgrade' });
  return alerts;
}
