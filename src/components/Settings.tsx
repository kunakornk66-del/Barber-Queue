/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Hairdresser, StaffRecorder } from '../types';
import { Scissors, Plus, Trash2, BadgeInfo, CheckCircle, Store, ShieldAlert, Upload, Image as ImageIcon, Link, Sparkles, RefreshCw, Clock, UserCheck, ShieldCheck, AlertTriangle } from 'lucide-react';

const PRESET_LOGOS = [
  {
    name: 'กรรไกรหรูหรา (Luxury Golden)',
    value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%231E293B"/><circle cx="50" cy="50" r="38" stroke="%23D97706" stroke-width="2" fill="none"/><path d="M40 38c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5zm20 0c3 0 5 2 5 5s-2 5-5 5-5-2-5-5 2-5 5-5z M43 45L57 65 M57 45L43 65" stroke="%23F59E0B" stroke-width="4" stroke-linecap="round"/><path d="M50 30L50 42" stroke="%23F59E0B" stroke-width="3" stroke-linecap="round"/></svg>'
  },
  {
    name: 'บาร์เบอร์โพลคลาสสิก (Classic Pole)',
    value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%230F172A"/><path d="M35 15h30v70H35z" fill="%23FFFFFF" stroke="%2394A3B8" stroke-width="2"/><path d="M35 25L65 45M35 45L65 65M35 65L65 85" stroke="%23EF4444" stroke-width="8"/><path d="M35 35L65 55M35 55L65 75" stroke="%233B82F6" stroke-width="8"/><rect x="32" y="10" width="36" height="5" rx="2" fill="%23E2E8F0"/><rect x="32" y="85" width="36" height="5" rx="2" fill="%23E2E8F0"/><circle cx="50" cy="7" r="5" fill="%23F1F5F9"/></svg>'
  },
  {
    name: 'มีดโกนวินเทจ (Vintage Razor)',
    value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2005/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%23451A03"/><circle cx="50" cy="50" r="38" stroke="%23F59E0B" stroke-width="1.5" fill="none"/><path d="M30 60 C35 50, 45 40, 65 35 C68 45, 58 55, 45 60 Z" fill="%2394A3B8" stroke="%2364748B" stroke-width="2"/><path d="M65 35 C70 35, 75 40, 75 47 C75 55, 68 65, 55 70" fill="none" stroke="%23F59E0B" stroke-width="3" stroke-linecap="round"/></svg>'
  },
  {
    name: 'สุภาพบุรุษหนวดงาม (Gentleman)',
    value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%231C1917"/><path d="M30 40h40v6H30zm6-10h28v10H36z" fill="%23D6D3D1"/><path d="M30 60c10 0 15 5 20 0c5 5 10 0 20 0c4-5-4-10-10-10c-5 0-8 5-10 5c-2 0-5-5-10-5c-6 0-14 5-10 10z" fill="%23EA580C"/></svg>'
  },
  {
    name: 'คลื่นผมโมเดิร์น (Modern Wave)',
    value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%23064E3B"/><path d="M25 65 C35 35, 55 25, 75 35 C65 45, 45 45, 35 65 Z" fill="%2334D399"/><path d="M35 75 C45 55, 60 45, 75 50 C65 60, 50 63, 42 75 Z" fill="%23059669"/></svg>'
  },
  {
    name: 'เคราคิงสไตล์ (Royal Beard)',
    value: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" rx="20" fill="%231E1B4B"/><path d="M38 35 L50 25 L62 35 L56 42 L50 38 L44 42 Z" fill="%23FBBF24"/><path d="M35 50 C35 70, 50 82, 50 82 C50 82, 65 70, 65 50 C58 55, 42 55, 35 50 Z" fill="%23818CF8"/></svg>'
  }
];

interface SettingsProps {
  hairdressers: Hairdresser[];
  onAddHairdresser: (name: string) => void;
  onDeleteHairdresser: (id: string) => void;
  onToggleHairdresserLeave: (id: string, currentlyLeave: boolean) => void;
  recorders: StaffRecorder[];
  onAddRecorder: (name: string, role?: string) => void;
  onDeleteRecorder: (id: string) => void;
  shopName: string;
  onUpdateShopName: (name: string) => void;
  adminPin: string;
  onUpdateAdminPin: (newPin: string) => void;
  shopLogoUrl: string;
  onUpdateShopLogo: (logoUrl: string) => void;
  slotDuration: number;
  onUpdateSlotDuration: (duration: number) => void;
  shopHolidays: number[];
  onUpdateShopHolidays: (holidays: number[]) => void;
  shopOpenTime?: string;
  shopCloseTime?: string;
  onUpdateShopOpenTime: (openTime: string) => void;
  onUpdateShopCloseTime: (closeTime: string) => void;
}

export default function Settings({
  hairdressers,
  onAddHairdresser,
  onDeleteHairdresser,
  onToggleHairdresserLeave,
  recorders,
  onAddRecorder,
  onDeleteRecorder,
  shopName,
  onUpdateShopName,
  adminPin,
  onUpdateAdminPin,
  shopLogoUrl,
  onUpdateShopLogo,
  slotDuration,
  onUpdateSlotDuration,
  shopHolidays,
  onUpdateShopHolidays,
  shopOpenTime,
  shopCloseTime,
  onUpdateShopOpenTime,
  onUpdateShopCloseTime
}: SettingsProps) {
  const [newHairdresserName, setNewHairdresserName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hairdresserToDelete, setHairdresserToDelete] = useState<string | null>(null);

  // Recorders (Non-barber staff like receptionists, cashiers, owners) settings states
  const [newRecorderName, setNewRecorderName] = useState('');
  const [newRecorderRole, setNewRecorderRole] = useState('เจ้าของร้าน');
  const [recorderError, setRecorderError] = useState<string | null>(null);
  const [recorderSuccess, setRecorderSuccess] = useState<string | null>(null);
  const [recorderToDelete, setRecorderToDelete] = useState<string | null>(null);

  const handleAddRecorderSubmit = (e: FormEvent) => {
    e.preventDefault();
    setRecorderError(null);
    setRecorderSuccess(null);

    const trimmed = newRecorderName.trim();
    if (!trimmed) {
      setRecorderError('กรุณากรอกชื่อผู้บันทึก');
      return;
    }

    if (recorders.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) {
      setRecorderError(`มีชื่อผู้บันทึก "${trimmed}" ในระบบแล้ว`);
      return;
    }

    onAddRecorder(trimmed, newRecorderRole);
    setNewRecorderName('');
    setRecorderSuccess(`เพิ่มรายชื่อผู้บันทึก "${trimmed} (${newRecorderRole})" เรียบร้อยแล้ว!`);
    setTimeout(() => setRecorderSuccess(null), 3000);
  };
  
  // Shop opening/closing hours settings states
  const [hoursSuccess, setHoursSuccess] = useState(false);
  const getHourOptions = () => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min of ['00', '30']) {
        options.push(`${String(hour).padStart(2, '0')}:${min}`);
      }
    }
    return options;
  };
  const hourOptions = getHourOptions();
  
  // Store name settings states
  const [newShopName, setNewShopName] = useState(shopName);
  const [shopNameSuccess, setShopNameSuccess] = useState(false);

  // Admin PIN settings states
  const [newPinWord, setNewPinWord] = useState(adminPin);
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinChangeError, setPinChangeError] = useState<string | null>(null);

  // Shop Logo settings states
  const [logoInputTab, setLogoInputTab] = useState<'upload' | 'preset' | 'link'>('upload');
  const [externalLogoUrl, setExternalLogoUrl] = useState(shopLogoUrl && !shopLogoUrl.startsWith('data:') ? shopLogoUrl : '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  
  // Slot duration settings states
  const [tempSlotDuration, setTempSlotDuration] = useState<number>(slotDuration || 30);
  const [slotSuccess, setSlotSuccess] = useState(false);

  // Shop weekly holidays settings states
  const [holidaysSuccess, setHolidaysSuccess] = useState(false);

  const DAYS_OF_WEEK = [
    { value: 0, label: 'วันอาทิตย์' },
    { value: 1, label: 'วันจันทร์' },
    { value: 2, label: 'วันอังคาร' },
    { value: 3, label: 'วันพุธ' },
    { value: 4, label: 'วันพฤหัสบดี' },
    { value: 5, label: 'วันศุกร์' },
    { value: 6, label: 'วันเสาร์' }
  ];

  const handleToggleHoliday = (dayValue: number) => {
    let updated: number[];
    if (shopHolidays.includes(dayValue)) {
      updated = shopHolidays.filter(d => d !== dayValue);
    } else {
      updated = [...shopHolidays, dayValue].sort();
    }
    onUpdateShopHolidays(updated);
    setHolidaysSuccess(true);
    const timer = setTimeout(() => setHolidaysSuccess(false), 3000);
    return () => clearTimeout(timer);
  };

  const handleClearHolidays = () => {
    onUpdateShopHolidays([]);
    setHolidaysSuccess(true);
    const timer = setTimeout(() => setHolidaysSuccess(false), 3000);
    return () => clearTimeout(timer);
  };

  // Sync temperature slot duration when loaded from remote Firestore
  useEffect(() => {
    if (slotDuration) {
      setTempSlotDuration(slotDuration);
    }
  }, [slotDuration]);

  const handleUpdateLogoLinkSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLogoError(null);
    setLogoSuccess(null);

    const trimmed = externalLogoUrl.trim();
    if (!trimmed) {
      setLogoError('กรุณากรอก URL ลิงก์รูปภาพ');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setLogoError('ลิงก์รูปภาพต้องเริ่มต้นด้วย http:// หรือ https://');
      return;
    }

    onUpdateShopLogo(trimmed);
    setLogoSuccess('บันทึกลิงก์รูปภาพสำเร็จแล้ว!');
    const timer = setTimeout(() => setLogoSuccess(null), 3500);
    return () => clearTimeout(timer);
  };

  const handlePresetSelect = (value: string) => {
    setLogoError(null);
    onUpdateShopLogo(value);
    setLogoSuccess('เปลี่ยนเป็นโลโก้สำเร็จรูปเรียบร้อยแล้ว!');
    const timer = setTimeout(() => setLogoSuccess(null), 3500);
    return () => clearTimeout(timer);
  };

  const handleResetLogo = () => {
    if (window.confirm('คุณต้องการรีเซ็ตกลับไปใช้โลโก๊กรรไกรเริ่มต้นหรือไม่?')) {
      onUpdateShopLogo('');
      setExternalLogoUrl('');
      setLogoSuccess('รีเซ็ตสำเร็จ!');
      const timer = setTimeout(() => setLogoSuccess(null), 3500);
      return () => clearTimeout(timer);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoError('กรุณาเลือกไฟล์รูปภาพหลักที่ถูกต้อง (.jpg, .png, .webp)');
      return;
    }

    setLogoUploading(true);
    setLogoError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.7);
          onUpdateShopLogo(base64);
          setLogoSuccess('อัพโหลดและบีบอัดรูปโปรไฟล์ร้านสำเร็จ!');
          const timer = setTimeout(() => setLogoSuccess(null), 3500);
          setLogoUploading(false);
          return () => clearTimeout(timer);
        } else {
          setLogoError('ไม่สามารถจำลองภาพถ่ายเพื่อจัดเก็บได้');
          setLogoUploading(false);
        }
      };
      img.onerror = () => {
        setLogoError('ไม่สามารถถอดรหัสรูปภาพได้');
        setLogoUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setLogoError('ไม่สามารถอ่านไฟล์ภาพต้นฉบับได้');
      setLogoUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleUpdatePinSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPinChangeError(null);
    setPinChangeSuccess(false);

    const trimmed = newPinWord.trim();
    if (!trimmed) {
      setPinChangeError('กรุณากรอกรหัสผ่าน PIN');
      return;
    }

    if (trimmed.length < 4) {
      setPinChangeError('รหัสผ่าน PIN ต้องมีความยาวอย่างน้อย 4 ตัวเลข');
      return;
    }

    if (/[^0-9]/.test(trimmed)) {
      setPinChangeError('รหัสผ่าน PIN ต้องเป็นตัวเลขเท่านั้น');
      return;
    }

    onUpdateAdminPin(trimmed);
    setPinChangeSuccess(true);
    const timer = setTimeout(() => {
      setPinChangeSuccess(false);
    }, 4000);
    return () => clearTimeout(timer);
  };

  const handleUpdateShopNameSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newShopName.trim();
    if (trimmed) {
      onUpdateShopName(trimmed);
      setShopNameSuccess(true);
      const timer = setTimeout(() => {
        setShopNameSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  };

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const nameTrimed = newHairdresserName.trim();
    if (!nameTrimed) {
      setErrorMessage('กรุณากรอกชื่อช่างทำผม');
      return;
    }

    if (nameTrimed.length > 20) {
      setErrorMessage('ชื่อช่างทำผมยาวเกินไป (สูงสุด 20 ตัวอักษร)');
      return;
    }

    // Check duplication
    const exists = hairdressers.some(
      (h) => h.name.toLowerCase() === nameTrimed.toLowerCase()
    );
    if (exists) {
      setErrorMessage(`มีช่างชื่อ "ช่าง${nameTrimed}" อยู่ในระบบแล้ว`);
      return;
    }

    onAddHairdresser(nameTrimed);
    setNewHairdresserName('');
    setSuccessMessage(`เพิ่ม "ช่าง${nameTrimed}" เรียบร้อยแล้ว`);

    // Hide success message after 3 seconds
    const timer = setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);

    return () => clearTimeout(timer);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      
      {/* Shop Name Configuration Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden" id="shop-name-settings-card">
        <div className="bg-stone-earth px-6 py-5 text-white flex justify-between items-center border-b border-brand/20">
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-brand-light flex items-center gap-2">
              <Store className="w-5 h-5 text-brand" /> ตั้งค่าชื่อร้านตัดผม
            </h2>
            <p className="text-stone-400 text-xs mt-1 font-light">
              กำหนดชื่อร้านที่แสดงอยู่ด้านบนสุดและส่วนต่าง ๆ ของระบบจองคิว
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <form onSubmit={handleUpdateShopNameSubmit} className="space-y-4">
            {shopNameSuccess && (
              <div className="bg-brand-light border border-brand/30 text-brand-dark px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in" id="shop-name-success-msg">
                <CheckCircle className="w-4 h-4 text-brand shrink-0" />
                <span>บันทึกชื่อร้านใหม่เรียบร้อยแล้ว! (ข้อความส่วนหัวจะเปลี่ยนรูปทันที)</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  id="shop-name-input"
                  placeholder="ป้อนชื่อร้านตัดผมของคุณ"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                  maxLength={30}
                  className="w-full px-4 py-3 text-sm rounded-2xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all placeholder:text-stone-400 font-sans font-bold text-stone-900"
                  required
                />
              </div>
              <button
                type="submit"
                id="save-shop-name-btn"
                className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer active:scale-95 ${
                  shopNameSuccess
                    ? 'bg-green-700 hover:bg-green-800 text-white ring-2 ring-green-150 animate-pulse'
                    : 'bg-brand hover:bg-brand-dark text-white'
                }`}
              >
                {shopNameSuccess ? '✅ บันทึกสำเร็จแล้ว!' : '💾 บันทึกชื่อร้าน'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Target Booking Duration Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden" id="booking-slot-duration-settings-card">
        <div className="bg-stone-earth px-6 py-5 text-white flex justify-between items-center border-b border-brand/20">
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-brand-light flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand" /> ตั้งค่าเวลาต่อหนึ่งคิวจอง
            </h2>
            <p className="text-stone-400 text-xs mt-1 font-light">
              กำหนดระยะเวลาของแต่ละคิวเพื่อคำนวณและปรับระยะเวลาสิ้นสุดคิวโดยอัตโนมัติเมื่อกดเลือกเวลาเริ่มจอง
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-4">
          {slotSuccess && (
            <div className="bg-amber-100 border border-brand/30 text-stone-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in" id="slot-success-msg">
              <CheckCircle className="w-4 h-4 text-brand shrink-0" />
              <span>บันทึกตั้งค่ารอบเวลาต่อหนึ่งคิวสำเร็จแล้ว!</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-250/50">
            <div>
              <p className="text-xs font-bold text-stone-700">ระยะเวลากำหนดต่อ 1 คิวจอง (คนละ)</p>
              <p className="text-[11px] text-stone-500 mt-0.5">เมื่อเลือกเวลาเริ่มจองในระบบ ระบบจะบวกเพิ่มเวลาโดยอัตโนมัติตามค่านี้</p>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={tempSlotDuration}
                onChange={(e) => {
                  const d = Number(e.target.value);
                  setTempSlotDuration(d);
                  onUpdateSlotDuration(d);
                  setSlotSuccess(true);
                  setTimeout(() => setSlotSuccess(false), 3000);
                }}
                className="px-4 py-2.5 rounded-xl border border-stone-300 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all bg-white font-bold text-stone-900 text-xs shadow-2xs cursor-pointer"
              >
                <option value={30}>30 นาที (ค่าเริ่มต้น)</option>
                <option value={60}>1 ชั่วโมง (60 นาที)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Business Hours Configuration Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden" id="shop-hours-settings-card">
        <div className="bg-stone-earth px-6 py-5 text-white flex justify-between items-center border-b border-brand/20">
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-brand-light flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand" /> ตั้งค่าเวลาทำการร้าน (เวลาเปิด-ปิดร้าน)
            </h2>
            <p className="text-stone-400 text-xs mt-1 font-light">
              กำหนดเวลาเปิดและปิดร้าน เพื่อให้สอดคล้องกันทั้งการแสดงผลตารางคิวรวมช่าง และการเลือกเวลาจอง/ปิดคิว
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-4">
          {hoursSuccess && (
            <div className="bg-amber-100 border border-brand/30 text-stone-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in" id="hours-success-msg">
              <CheckCircle className="w-4 h-4 text-brand shrink-0" />
              <span>บันทึกตั้งค่าเวลาเปิด-ปิดร้านเรียบร้อยแล้ว!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 bg-stone-50 p-4 rounded-2xl border border-stone-250/50">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                🌅 เวลาเปิดร้าน
              </label>
              <select
                value={shopOpenTime || '10:00'}
                onChange={(e) => {
                  onUpdateShopOpenTime(e.target.value);
                  setHoursSuccess(true);
                  setTimeout(() => setHoursSuccess(false), 3000);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all bg-white font-bold text-stone-900 text-xs shadow-2xs cursor-pointer"
              >
                {hourOptions.map((opt) => (
                  <option key={`open-opt-${opt}`} value={opt}>{opt.replace(':', '.')} น.</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 bg-stone-50 p-4 rounded-2xl border border-stone-250/50">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                🌙 เวลาปิดร้าน
              </label>
              <select
                value={shopCloseTime || '21:00'}
                onChange={(e) => {
                  onUpdateShopCloseTime(e.target.value);
                  setHoursSuccess(true);
                  setTimeout(() => setHoursSuccess(false), 3000);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all bg-white font-bold text-stone-900 text-xs shadow-2xs cursor-pointer"
              >
                {hourOptions.map((opt) => (
                  <option key={`close-opt-${opt}`} value={opt}>{opt.replace(':', '.')} น.</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Shop Logo & Profile Configuration Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden" id="shop-logo-settings-card">
        <div className="bg-stone-earth px-6 py-5 text-white flex justify-between items-center border-b border-brand/20">
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-brand-light flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-brand" /> ตั้งค่าโลโก้ร้าน / รูปโปรไฟล์สาขา
            </h2>
            <p className="text-stone-400 text-xs mt-1 font-light">
              อัพโหลดไฟล์รูปภาพแบรนด์ร้าน หรือเลือกสัญลักษณ์วินเทจบาร์เบอร์สำเร็จรูป
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {logoSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in" id="logo-success-msg">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{logoSuccess}</span>
            </div>
          )}

          {logoError && (
            <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-shake" id="logo-error-msg">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{logoError}</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Left: Preview Section */}
            <div className="w-full md:w-1/3 flex flex-col items-center justify-center p-6 bg-stone-50 rounded-2xl border border-stone-100 text-center shrink-0">
              <span className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-3">แสดงตัวอย่างโลโก้ปัจจุบัน</span>
              
              <div className="w-24 h-24 rounded-3xl bg-white border border-stone-200 shadow-md flex items-center justify-center overflow-hidden relative group">
                {shopLogoUrl ? (
                  <img
                    src={shopLogoUrl}
                    alt="Logo Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-stone-300">
                    <Scissors className="w-10 h-10 text-stone-300 mb-1" />
                    <span className="text-[10px] text-stone-400 font-medium">กรรไกรเบื้องต้น</span>
                  </div>
                )}
              </div>

              {shopLogoUrl && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="mt-4 text-[11px] text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  🗑️ รีเซ็ตใช้แบบดั้งเดิม
                </button>
              )}
            </div>

            {/* Right: Upload Options */}
            <div className="flex-1 w-full space-y-4">
              {/* Tab Selector */}
              <div className="flex border-b border-stone-100">
                <button
                  type="button"
                  onClick={() => setLogoInputTab('upload')}
                  className={`flex-1 pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                    logoInputTab === 'upload' ? 'text-brand border-b-2 border-brand' : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" /> อัพโหลดไฟล์ภาพ
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoInputTab('preset')}
                  className={`flex-1 pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                    logoInputTab === 'preset' ? 'text-brand border-b-2 border-brand' : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> บาร์เบอร์สำเร็จรูป
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLogoInputTab('link')}
                  className={`flex-1 pb-2.5 text-xs font-bold transition-all relative cursor-pointer ${
                    logoInputTab === 'link' ? 'text-brand border-b-2 border-brand' : 'text-stone-400 hover:text-stone-600'
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Link className="w-3.5 h-3.5" /> วางลิงก์รูปภาพ
                  </span>
                </button>
              </div>

              {/* Tab Content 1: Upload File */}
              {logoInputTab === 'upload' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="border-2 border-dashed border-stone-200 rounded-2xl p-6 text-center hover:bg-stone-50/50 transition-all relative">
                    <input
                      type="file"
                      id="logo-file-input"
                      accept="image/*"
                      onChange={handleFileChange}
                      disabled={logoUploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2">
                      <div className="mx-auto w-10 h-10 rounded-full bg-brand/5 flex items-center justify-center text-brand">
                        {logoUploading ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-stone-700">
                        {logoUploading ? 'กำลังอัพโหลดและประมวลผลขนาด...' : 'คลิกเพื่อเลือกรูปภาพโปรไฟล์ร้านของคุณ'}
                      </p>
                      <p className="text-[10px] text-stone-400 font-light leading-relaxed">
                        ระบบจะทำการลดขนาดและบีบอัดเป็นอัตราส่วนพอดีให้อัตโนมัติ เพื่อประหยัดพื้นที่และโหลดไว
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content 2: Preset List */}
              {logoInputTab === 'preset' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-fade-in">
                  {PRESET_LOGOS.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handlePresetSelect(preset.value)}
                      className={`p-3 rounded-2xl border text-center transition-all bg-stone-50 hover:bg-white flex flex-col items-center gap-2 cursor-pointer group active:scale-95 ${
                        shopLogoUrl === preset.value
                          ? 'border-brand ring-2 ring-brand/10 bg-brand-light/25'
                          : 'border-stone-100 hover:border-stone-300'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm group-hover:scale-105 transition-all">
                        <img
                          src={preset.value}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full"
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-stone-700 truncate max-w-full">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Tab Content 3: External Link */}
              {logoInputTab === 'link' && (
                <form onSubmit={handleUpdateLogoLinkSubmit} className="space-y-3 animate-fade-in">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder=""
                      value={externalLogoUrl}
                      onChange={(e) => setExternalLogoUrl(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none text-stone-800 bg-white placeholder:text-stone-350"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-brand hover:bg-brand-dark text-white rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0 active:scale-95"
                    >
                      บันทึกลิงก์
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-400 font-light italic">
                    * รูปภาพภายนอกจะต้องเป็น URL สาธารณะที่ปลอดภัย (https:// เท่านั้น)
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shop Holiday Configuration Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden" id="shop-holiday-settings-card">
        <div className="bg-stone-earth px-6 py-5 text-white flex justify-between items-center border-b border-brand/20">
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-brand-light flex items-center gap-2">
              📅 กำหนดวันหยุดประจำสัปดาห์ของร้าน
            </h2>
            <p className="text-stone-400 text-xs mt-1 font-light">
              กำหนดวันหยุดของร้านตัดผม โดยหากถึงวันดังกล่าว ระบบจะปิดไม่ให้รับคิวจองอัตโนมัติทั้งสาขา
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          {holidaysSuccess && (
            <div className="bg-[#FAF6F0] border border-brand/30 text-brand-dark px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in" id="holiday-save-success-msg">
              <CheckCircle className="w-4 h-4 text-brand shrink-0" />
              <span>บันทึกข้อมูลวันหยุดร้านสำเร็จแล้ว!</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleClearHolidays}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                  shopHolidays.length === 0
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                🚫 ไม่มีวันหยุด (เปิดให้บริการทุกวัน)
              </button>
            </div>

            <div className="h-px bg-stone-100 my-4"></div>

            <p className="text-xs font-bold text-stone-700">เลือกวันหยุดประจำสัปดาห์ของร้าน (สามารถเลือกได้มากกว่า 1 วัน):</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = shopHolidays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => handleToggleHoliday(day.value)}
                    className={`p-3.5 rounded-2xl border text-xs font-bold transition-all flex flex-col items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-red-50 border-red-300 text-red-700 shadow-xs ring-2 ring-red-100'
                        : 'bg-stone-50/50 hover:bg-stone-50 text-stone-850 border-stone-200'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-red-600 animate-pulse' : 'bg-stone-300'}`}></span>
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Admin PIN Configuration Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden" id="admin-pin-settings-card">
        <div className="bg-stone-earth px-6 py-5 text-white flex justify-between items-center border-b border-brand/20">
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-brand-light flex items-center gap-2">
              🔐 ตั้งค่ารหัสผ่าน PIN สาขา
            </h2>
            <p className="text-stone-400 text-xs mt-1 font-light">
              รหัสสำหรับการล็อกหน้าตั้งค่าช่างและข้อมูลหลังบ้านเพื่อความปลอดภัยของกิจการ
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <form onSubmit={handleUpdatePinSubmit} className="space-y-4">
            {pinChangeSuccess && (
              <div className="bg-[#FAF6F0] border border-brand/30 text-brand-dark px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in" id="pin-change-success-msg">
                <CheckCircle className="w-4 h-4 text-brand shrink-0" />
                <span>บันทึกรหัส PIN ใหม่เรียบร้อยแล้ว! (กรุณาจำรหัสผ่านใหม่นี้ไว้ใช้งาน)</span>
              </div>
            )}

            {pinChangeError && (
              <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-shake" id="pin-change-error-msg">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>{pinChangeError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={12}
                  id="admin-pin-input"
                  placeholder="ป้อนรหัสผ่าน"
                  value={newPinWord}
                  onChange={(e) => setNewPinWord(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full px-4 py-3 text-sm rounded-2xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all placeholder:text-stone-400 font-mono text-lg font-bold text-stone-900"
                  required
                />
              </div>
              <button
                type="submit"
                id="save-pin-code-btn"
                className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer active:scale-95 ${
                  pinChangeSuccess
                    ? 'bg-green-700 hover:bg-green-800 text-white ring-2 ring-green-150 animate-pulse'
                    : 'bg-brand hover:bg-brand-dark text-white'
                }`}
              >
                {pinChangeSuccess ? '✅ บันทึก PIN สำเร็จ!' : '💾 บันทึกรหัส PIN ใหม่'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Settings Grid Card */}
      <div className="bg-white rounded-3xl border border-stone-105 shadow-sm overflow-hidden" id="barbers-settings-card">
        
        {/* Banner */}
        <div className="bg-stone-earth px-6 py-5 text-white flex justify-between items-center border-b border-brand/20">
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-brand-light flex items-center gap-2">
              <Scissors className="w-5 h-5 text-brand" /> จัดการช่างตัดผมในร้าน
            </h2>
            <p className="text-stone-400 text-xs mt-1 font-light">
              เพิ่มหรือลบรายชื่อช่างหลักของร้าน ช่างเหล่านี้จะปรากฏในตัวเลือกลงคิวและช่างผู้บันทึกสถิติ
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          
          {/* Form to Add New Barber */}
          <form onSubmit={handleAdd} className="space-y-4">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider pb-1 border-b border-stone-100">
              ➕ เพิ่มช่างทำผมใหม่เข้าระบบ
            </h3>

            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-2xl text-xs font-medium flex items-center gap-2 animate-shake" id="add-barber-error">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-medium flex items-center gap-2 animate-fade-in" id="add-barber-success">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-stone-400 font-semibold">
                  ช่าง
                </span>
                <input
                  type="text"
                  id="add-barber-input"
                  placeholder=""
                  value={newHairdresserName}
                  onChange={(e) => setNewHairdresserName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 text-sm rounded-2xl border border-stone-200 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all placeholder:text-stone-400 font-sans font-bold text-stone-900"
                  required
                />
              </div>
              <button
                type="submit"
                id="add-barber-submit-btn"
                className="px-6 py-3 bg-brand hover:bg-brand-dark text-white rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> เพิ่มช่าง
              </button>
            </div>
          </form>

          {/* List of Current Barbers */}
          <div className="space-y-4 pt-4 border-t border-stone-100">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
                👤 รายชื่อช่างทำผมปัจจุบัน ({hairdressers.length} ท่าน)
              </h3>
              <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md font-medium">
                รายชื่อคิวจะอิงตามข้อมูลตรงนี้
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="barbers-list-settings">
              {hairdressers.length > 0 ? (
                hairdressers.map((hd) => {
                  return (
                    <div
                      key={hd.id}
                      id={`barber-setting-row-${hd.id}`}
                      className="border border-stone-100 bg-stone-50/50 rounded-2xl p-4 flex justify-between items-center gap-3 transition-all hover:bg-white hover:border-stone-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-stone-950 font-bold text-xs text-white flex items-center justify-center font-mono">
                          {hd.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <h4 className={`font-bold text-sm truncate ${hd.onLeave ? 'text-stone-400 line-through' : 'text-stone-900'}`}>ช่าง{hd.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${hd.onLeave ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                            <span className={`text-[10px] font-bold ${hd.onLeave ? 'text-amber-600' : 'text-emerald-705'}`}>
                              {hd.onLeave ? 'ลางาน/ปิดคิว' : 'ปฏิบัติงานปกติ'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Deletion control */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onToggleHairdresserLeave(hd.id, !!hd.onLeave)}
                          className={`px-3 py-1.5 text-[10px] font-bold rounded-xl transition-all cursor-pointer ${
                            hd.onLeave 
                              ? 'bg-amber-100 hover:bg-amber-250 text-amber-800 hover:text-amber-900 border border-amber-200' 
                              : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200/65'
                          }`}
                          title={hd.onLeave ? "เปิดรับคิวจองช่างคนนี้" : "ตั้งค่าปิดคิว/ลางาน (จะไม่ปรากฏในแบบฟอร์มจอง)"}
                        >
                          {hd.onLeave ? '🔓 เปิดคิว' : '🔕 ปิดคิว/ลางาน'}
                        </button>
                        <button
                          type="button"
                          id={`barber-delete-trigger-${hd.id}`}
                          onClick={() => setHairdresserToDelete(hd.id)}
                          className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="ลบรายชื่อช่างนี้ออก"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-1 sm:col-span-2 p-8 border border-dashed border-stone-200 rounded-3xl text-center bg-stone-50" id="no-barbers-settings-view">
                  <p className="text-xs text-stone-500 font-medium">ยังไม่มีรายชื่อช่างในระบบ</p>
                  <p className="text-[10px] text-stone-400 mt-1">กรุณาเพิ่มรายชื่อช่างอย่างน้อย 1 คน เพื่อเริ่มใช้งานตัวผู้จองและผู้บันทึกคิว</p>
                </div>
              )}
            </div>
          </div>

          {/* Guide Section */}
          <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-100 flex gap-3 text-xs text-stone-600 leading-relaxed" id="settings-help">
            <BadgeInfo className="w-5 h-5 text-brand shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-stone-800">คำชี้แจงระบบช่างแบบเชื่อมโยง:</p>
              <ul className="list-disc pl-4 space-y-1 mt-1 font-light text-[11px]">
                <li>การลบช่างจากตรงนี้ คิวเก่าที่มีชื่อช่างคนนี้จะยังแสดงชื่อเดิมตามปกติ (สืบทอดข้อมูลไว้ให้อ้างอิงปลอดภัย)</li>
                <li>ช่างในร้านทุกคนจะปรากฏเป็นตัวเลือกในช่องผู้ลงคิวจองและช่องผู้บันทึกคิวอัตโนมัติ</li>
              </ul>
            </div>
          </div>

        </div>
      </div>

      {/* Non-Barber Staff Recorders Management Card */}
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden" id="recorders-settings-card">
        <div className="bg-stone-earth px-6 py-5 text-white flex justify-between items-center border-b border-brand/20">
          <div>
            <h2 className="text-xl font-serif font-bold tracking-tight text-brand-light flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-brand" /> จัดการรายชื่อผู้บันทึกคิว (เจ้าของร้าน / Reception / แคชเชียร์)
            </h2>
            <p className="text-stone-400 text-xs mt-1 font-light">
              เพิ่มรายชื่อพนักงานหน้าร้านหรือเจ้าของร้านที่ไม่ใช่ช่างตัดผม เพื่อให้สามารถเลือกเป็น "ผู้บันทึกคิว" ในแบบฟอร์มจองคิวได้
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8 space-y-6">
          <form onSubmit={handleAddRecorderSubmit} className="space-y-4">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider pb-1 border-b border-stone-100">
              ➕ เพิ่มรายชื่อผู้บันทึกคิวใหม่ (พนักงานต้อนรับ / เจ้าของร้าน)
            </h3>

            {recorderError && (
              <div className="bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-2xl text-xs font-medium flex items-center gap-2 animate-shake" id="add-recorder-error">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>{recorderError}</span>
              </div>
            )}

            {recorderSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-2xl text-xs font-medium flex items-center gap-2 animate-fade-in" id="add-recorder-success">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{recorderSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-[11px] font-bold text-stone-600 mb-1">ตำแหน่ง / บทบาท</label>
                <select
                  value={newRecorderRole}
                  onChange={(e) => setNewRecorderRole(e.target.value)}
                  className="w-full px-3 py-3 text-xs rounded-2xl border border-stone-200 bg-stone-50 font-bold text-stone-800 outline-none focus:border-brand"
                >
                  <option value="เจ้าของร้าน">👑 เจ้าของร้าน</option>
                  <option value="พนักงานต้อนรับ">🛎️ พนักงานต้อนรับ (Reception)</option>
                  <option value="แคชเชียร์">💵 แคชเชียร์</option>
                  <option value="ผู้จัดการร้าน">👔 ผู้จัดการร้าน</option>
                  <option value="พนักงาน">👤 พนักงานทั่วไป</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">ชื่อผู้บันทึก</label>
                  <input
                    type="text"
                    placeholder="ป้อนชื่อผู้บันทึก (เช่น คุณดาว, Reception 1)"
                    value={newRecorderName}
                    onChange={(e) => setNewRecorderName(e.target.value)}
                    className="w-full px-4 py-3 text-xs rounded-2xl border border-stone-200 focus:border-brand outline-none font-bold text-stone-900"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 bg-brand hover:bg-brand-dark text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 shadow-sm"
                >
                  <Plus className="w-4 h-4" /> เพิ่มผู้บันทึก
                </button>
              </div>
            </div>
          </form>

          {/* Current Recorders List */}
          <div className="space-y-3 pt-4 border-t border-stone-100">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
              📋 รายชื่อผู้บันทึกหน้าร้านปัจจุบัน ({recorders.length} ท่าน)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="recorders-list-settings">
              {recorders.length > 0 ? (
                recorders.map((rec) => {
                  return (
                    <div
                      key={rec.id}
                      className="border border-stone-200/80 bg-stone-50/60 rounded-2xl p-3.5 flex justify-between items-center gap-3 hover:bg-white transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-brand/10 border border-brand/30 text-brand font-bold text-xs flex items-center justify-center shrink-0">
                          {rec.name.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-stone-900 truncate">{rec.name}</h4>
                          <span className="inline-block text-[10px] font-semibold text-stone-500 bg-stone-200/70 px-2 py-0.5 rounded-md mt-0.5">
                            {rec.role || 'พนักงาน'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        id={`recorder-delete-trigger-${rec.id}`}
                        onClick={() => setRecorderToDelete(rec.id)}
                        className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer shrink-0"
                        title="ลบรายชื่อผู้บันทึกนี้"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-1 sm:col-span-2 p-6 border border-dashed border-stone-200 rounded-2xl text-center bg-stone-50">
                  <p className="text-xs text-stone-500 font-medium">ยังไม่มีผู้บันทึกประเภทพนักงานต้อนรับ/เจ้าของร้าน</p>
                  <p className="text-[10px] text-stone-400 mt-1">ช่างทำผมทุกคนสามารถเลือกเป็นผู้บันทึกคิวได้อยู่แล้ว หรือเพิ่มชื่อเจ้าของร้านตรงนี้ได้เลย</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Hairdresser Deletion */}
      {(() => {
        const selectedHairdresserForDelete = hairdressers.find(h => h.id === hairdresserToDelete);
        if (!selectedHairdresserForDelete) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in" id="delete-hairdresser-modal-overlay">
            <div className="absolute inset-0" onClick={() => setHairdresserToDelete(null)} />
            <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl relative z-10 p-6 space-y-5 animate-scale-up" id="delete-hairdresser-modal">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">ยืนยันการลบรายชื่อช่าง</h3>
                  <p className="text-xs text-stone-500 font-light">โปรดตรวจสอบก่อนยืนยันการลบช่างออก</p>
                </div>
              </div>

              <div className="bg-red-50/70 border border-red-200/60 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-stone-700">
                  <span className="text-stone-500">ชื่อช่าง:</span>
                  <span className="font-bold text-stone-900 text-sm">ช่าง{selectedHairdresserForDelete.name}</span>
                </div>
                <div className="flex justify-between items-center text-stone-700">
                  <span className="text-stone-500">สถานะปัจจุบัน:</span>
                  <span className={`font-bold ${selectedHairdresserForDelete.onLeave ? 'text-amber-600' : 'text-emerald-700'}`}>
                    {selectedHairdresserForDelete.onLeave ? 'ลางาน / ปิดคิว' : 'ปฏิบัติงานปกติ'}
                  </span>
                </div>
              </div>

              <div className="bg-stone-100 p-3.5 rounded-2xl border border-stone-200 text-stone-600 text-xs leading-relaxed space-y-1">
                <p className="font-bold text-stone-800">💡 สิ่งที่จะเกิดขึ้นหลังลบ:</p>
                <ul className="list-disc pl-4 text-[11px] space-y-1 text-stone-600">
                  <li>คิวเก่าที่มีชื่อช่างคนนี้จะยังแสดงชื่อเดิมตามปกติเพื่ออ้างอิงย้อนหลัง</li>
                  <li>ชื่อช่างคนนี้จะถูกถอดออกจากตัวเลือกการลงคิวใหม่ทั้งหมด</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  id="cancel-delete-hairdresser-btn"
                  onClick={() => setHairdresserToDelete(null)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  id="confirm-delete-hairdresser-btn"
                  onClick={() => {
                    onDeleteHairdresser(selectedHairdresserForDelete.id);
                    setHairdresserToDelete(null);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> ยืนยันลบช่าง
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Confirmation Modal for Recorder Deletion */}
      {(() => {
        const selectedRecorderForDelete = recorders.find(r => r.id === recorderToDelete);
        if (!selectedRecorderForDelete) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fade-in" id="delete-recorder-modal-overlay">
            <div className="absolute inset-0" onClick={() => setRecorderToDelete(null)} />
            <div className="bg-white rounded-3xl max-w-md w-full border border-stone-200 shadow-2xl relative z-10 p-6 space-y-5 animate-scale-up" id="delete-recorder-modal">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-900 text-base">ยืนยันการลบรายชื่อผู้บันทึก</h3>
                  <p className="text-xs text-stone-500 font-light">โปรดตรวจสอบก่อนยืนยันการลบผู้บันทึกออก</p>
                </div>
              </div>

              <div className="bg-red-50/70 border border-red-200/60 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-stone-700">
                  <span className="text-stone-500">ชื่อผู้บันทึก:</span>
                  <span className="font-bold text-stone-900 text-sm">{selectedRecorderForDelete.name}</span>
                </div>
                <div className="flex justify-between items-center text-stone-700">
                  <span className="text-stone-500">ตำแหน่ง / บทบาท:</span>
                  <span className="font-bold text-brand-dark">{selectedRecorderForDelete.role || 'พนักงาน'}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-stone-700 text-xs leading-relaxed">
                ⚠️ <strong>คำเตือน:</strong> หากลบแล้ว ชื่อผู้บันทึกนี้จะไม่ปรากฏในตัวเลือกแบบฟอร์มจองคิวอีกต่อไป (แต่ข้อมูลคิวในอดีตยังถูกบันทึกไว้อย่างปลอดภัย)
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  id="cancel-delete-recorder-btn"
                  onClick={() => setRecorderToDelete(null)}
                  className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  id="confirm-delete-recorder-btn"
                  onClick={() => {
                    onDeleteRecorder(selectedRecorderForDelete.id);
                    setRecorderToDelete(null);
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Trash2 className="w-4 h-4" /> ยืนยันลบผู้บันทึก
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
