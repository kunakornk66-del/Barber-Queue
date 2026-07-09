/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Hairdresser {
  id: string;
  name: string;
  onLeave?: boolean;
}

export interface Booking {
  id: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  hairdresserId: string | null;  // null = ไม่ระบุช่าง (Anyone)
  customerName: string;
  customerPhone: string;
  remarks: string;
  recordedBy: string; // ช่างผู้บันทึก (Hairdresser ID or Name)
  createdAt: string;  // ISO timestamp
  isAnyBarber?: boolean; // แท็กบอกว่าจองแบบ "ไม่ระบุช่าง" แต่ระบบสุ่มช่างว่างให้
}

export interface LeaveRecord {
  id: string;
  hairdresserId: string;
  hairdresserName: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  details: string;    // รายละเอียดการลา/ปิดคิว
  recorder: string;   // ช่างผู้บันทึก
  createdAt: string;  // ISO timestamp
}
