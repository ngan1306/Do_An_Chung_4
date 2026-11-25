import type { Device, Room } from '../types';

/**
 * Sơ đồ nhà: 4 phòng, mỗi phòng vài thiết bị (mục 12 - chia theo phòng).
 * Thêm phòng / thiết bị mới chỉ cần khai báo ở đây, phần giao diện tự sinh.
 */
export const ROOMS: Room[] = [
  { id: 'living', name: 'Phòng khách', hint: 'Khu vực sinh hoạt chung' },
  { id: 'bedroom', name: 'Phòng ngủ', hint: 'Điều hoà & rèm cửa' },
  { id: 'kitchen', name: 'Nhà bếp', hint: 'Quạt hút & đèn bếp' },
  { id: 'garden', name: 'Sân vườn', hint: 'Bơm nước & đèn ngoài trời' },
];

export const DEVICES: Device[] = [
  { id: 'light-living', name: 'Đèn trần', roomId: 'living', kind: 'light' },
  { id: 'fan-living', name: 'Quạt trần', roomId: 'living', kind: 'fan' },
  { id: 'curtain-living', name: 'Rèm cửa', roomId: 'living', kind: 'curtain' },
  { id: 'light-bedroom', name: 'Đèn ngủ', roomId: 'bedroom', kind: 'light' },
  { id: 'fan-bedroom', name: 'Quạt điều hoà', roomId: 'bedroom', kind: 'fan' },
  { id: 'light-kitchen', name: 'Đèn bếp', roomId: 'kitchen', kind: 'light' },
  { id: 'fan-kitchen', name: 'Quạt hút mùi', roomId: 'kitchen', kind: 'fan' },
  { id: 'relay-kitchen', name: 'Ổ cắm thông minh', roomId: 'kitchen', kind: 'relay' },
  { id: 'light-garden', name: 'Đèn sân vườn', roomId: 'garden', kind: 'light' },
  { id: 'pump-garden', name: 'Máy bơm nước', roomId: 'garden', kind: 'pump' },
];

/** Lấy thiết bị theo phòng. */
export function devicesOfRoom(roomId: string): Device[] {
  return DEVICES.filter((device) => device.roomId === roomId);
}

/** Tìm thiết bị theo id, trả về undefined nếu không có. */
export function findDevice(deviceId: string): Device | undefined {
  return DEVICES.find((device) => device.id === deviceId);
}

/** Tên phòng của một thiết bị. */
export function roomNameOf(deviceId: string): string {
  const device = findDevice(deviceId);
  const room = ROOMS.find((item) => item.id === device?.roomId);
  return room ? room.name : 'Không rõ phòng';
}
