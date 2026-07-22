/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { Hairdresser, LeaveRecord } from '../types';
import { Calendar, Clock, User, FileText, Plus, Trash2, Edit2, Save, X, AlertCircle } from 'lucide-react';

// Helper to format Time to Thai style: e.g. "09:30" -> "09.30น."
export const formatThaiTime = (timeStr: string) => {
  if (!timeStr) return '';
  const cleanTime = timeStr.trim().replace(' น.', '').replace('น.', '');
  return cleanTime.replace(':', '.') + 'น.';
};

// Generate 15-minute intervals for beautiful select dropdown
export const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min of ['00', '15', '30', '45']) {
      const hh = String(hour).padStart(2, '0');
      options.push(`${hh}:${min}`);
    }
  }
  return options;
};

interface LeaveManagerProps {
  hairdressers: Hairdresser[];
  leaves: LeaveRecord[];
  onAddLeave: (leave: Omit<LeaveRecord, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateLeave: (id: string, updatedFields: Partial<LeaveRecord>) => Promise<void>;
  onDeleteLeave: (id: string) => Promise<void>;
  shopOpenTime?: string;
  shopCloseTime?: string;
}

export default function LeaveManager({
  hairdressers,
  leaves,
  onAddLeave,
  onUpdateLeave,
  onDeleteLeave,
  shopOpenTime = '10:00',
  shopCloseTime = '21:00'
}: LeaveManagerProps) {
  const TIME_OPTIONS = generateTimeOptions().filter(t => {
    return t >= shopOpenTime && t <= shopCloseTime;
  });
  // Form input states
  const [selectedHairdresserId, setSelectedHairdresserId] = useState<string>('');
  const [leaveDate, setLeaveDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [details, setDetails] = useState<string>('');
  const [recorder, setRecorder] = useState<string>('');

  // Synchronize defaults with shopOpenTime and shopCloseTime
  useEffect(() => {
    if (shopOpenTime) {
      setStartTime(shopOpenTime);
    }
    if (shopCloseTime) {
      setEndTime(shopCloseTime);
    }
  }, [shopOpenTime, shopCloseTime]);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHairdresserId, setEditHairdresserId] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [editDetails, setEditDetails] = useState<string>('');
  const [editRecorder, setEditRecorder] = useState<string>('');

  // Errors / Success status
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!selectedHairdresserId) {
      setErrorMsg('กรุณาเลือกช่างในร้าน');
      return;
    }

    const startNum = parseInt(startTime.replace(':', ''), 10);
    const endNum = parseInt(endTime.replace(':', ''), 10);
    if (endNum <= startNum) {
      setErrorMsg('เวลาสิ้นสุดการปิดคิวต้องมากกว่าเวลาเริ่มต้น');
      return;
    }

    if (!recorder.trim()) {
      setErrorMsg('กรุณาระบุชื่อผู้บันทึกรายการ');
      return;
    }

    const barber = hairdressers.find(h => h.id === selectedHairdresserId);
    if (!barber) {
      setErrorMsg('ไม่พบข้อมูลช่างในระบบ');
      return;
    }

    try {
      await onAddLeave({
        hairdresserId: selectedHairdresserId,
        hairdresserName: barber.name,
        date: leaveDate,
        startTime,
        endTime,
        details: details.trim() || 'ทำธุระ / ลางานรายวัน',
        recorder: recorder.trim()
      });

      // Reset form variables safely
      setDetails('');
      setSuccessMsg('📝 บันทึกข้อมูลปิดคิวจองช่างเรียบร้อยแล้ว!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setErrorMsg(e.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const startEdit = (record: LeaveRecord) => {
    setEditingId(record.id);
    setEditHairdresserId(record.hairdresserId);
    setEditDate(record.date);
    setEditStartTime(record.startTime);
    setEditEndTime(record.endTime);
    setEditDetails(record.details);
    setEditRecorder(record.recorder);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (id: string) => {
    setErrorMsg(null);

    const startNum = parseInt(editStartTime.replace(':', ''), 10);
    const endNum = parseInt(editEndTime.replace(':', ''), 10);
    if (endNum <= startNum) {
      setErrorMsg('เวลาสิ้นสุดการแก้ไขการปิดคิวต้องมากกว่าเวลาเริ่มต้น');
      return;
    }

    if (!editRecorder.trim()) {
      setErrorMsg('กรุณาระบุผู้บันทึกรายการ');
      return;
    }

    const barber = hairdressers.find(h => h.id === editHairdresserId);
    if (!barber) {
      setErrorMsg('ไม่พบข้อมูลช่างในระบบ');
      return;
    }

    try {
      await onUpdateLeave(id, {
        hairdresserId: editHairdresserId,
        hairdresserName: barber.name,
        date: editDate,
        startTime: editStartTime,
        endTime: editEndTime,
        details: editDetails.trim(),
        recorder: editRecorder.trim()
      });
      setEditingId(null);
      setSuccessMsg('💾 อัปเดตข้อมูลปิดคิวจองช่างสำเร็จ!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setErrorMsg(e.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteLeave(id);
      setSuccessMsg('🗑️ ลบรายการปิดคิวเรียบร้อย');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (e: any) {
      setErrorMsg(e.message || 'เกิดข้อผิดพลาดในการลบ');
    }
  };

  // Helper formatting Buddhist Calendar
  const formatThaiDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10) + 543;
    const monthNames = [
      'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
    ];
    const month = monthNames[parseInt(parts[1], 10) - 1];
    const day = parseInt(parts[2], 10);
    return `${day} ${month} ${year}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8" id="leave-manager-view">
      <div className="bg-stone-earth text-brand-light p-6 rounded-3xl border border-brand/20 shadow-md">
        <h2 className="text-xl md:text-2xl font-serif font-bold tracking-tight">ระบบจัดการตารางปิดคิวและลางานของช่าง</h2>
        <p className="text-stone-350 text-xs mt-1.5 leading-relaxed font-light">
          ช่างตัดผมทุกคนใช้งานได้โดย<b>ไม่ต้องติดรหัสผ่าน PIN</b> สามารถปิดคิวตัดผมชั่วคราวบางส่วนของวัน หรือเต็มวันได้ตามสะดวก 
          ระบบจะอัปเดตและปลดล็อกตารางคิวให้ลูกค้าจองต่อได้ทันทีเมื่อเวลาลางานหรือเวลาปิดคิวนั้นๆ ผ่านพ้นไปแล้ว
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form Column */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-6" id="leave-insert-form">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-serif font-bold text-stone-900 border-l-4 border-brand pl-2.5">
              บันทึกการปิดคิว / ลางานรายวัน
            </h3>
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3 items-center text-sm text-red-800 font-medium">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-center text-sm text-amber-900 font-medium animate-fade-in">
              <span className="text-base">✨</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Barber Dropdown selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand" /> เลือกช่างตัดผม
              </label>
              <select
                value={selectedHairdresserId}
                onChange={(e) => {
                  setSelectedHairdresserId(e.target.value);
                  // Auto fill recorder with barber name if recorder is empty
                  const barber = hairdressers.find(h => h.id === e.target.value);
                  if (barber && !recorder) {
                    setRecorder(barber.name);
                  }
                }}
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-stone-205 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all bg-[#FAF9F6] font-medium"
                required
              >
                <option value="">-- กรุณาเลือกช่างในร้าน --</option>
                {hairdressers.map((hd) => (
                  <option key={hd.id} value={hd.id}>
                    ช่าง{hd.name} {hd.onLeave ? '(ปิดคิวหลักอยู่)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-brand" /> ปิดคิวจองวันที่
              </label>
              <input
                type="date"
                value={leaveDate}
                onChange={(e) => setLeaveDate(e.target.value)}
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-stone-205 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all bg-white font-medium"
                required
              />
            </div>

            {/* Start and End Time in row */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" /> ตั้งแต่เวลา (จาก)
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-stone-205 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all bg-white text-stone-800 font-bold"
                  required
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={`leave-start-${t}`} value={t}>
                      {formatThaiTime(t)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-red-600" /> ถึงเวลา (สิ้นสุด)
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-xs px-3.5 py-3 rounded-xl border border-stone-205 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all bg-white text-stone-800 font-bold"
                  required
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={`leave-end-${t}`} value={t}>
                      {formatThaiTime(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Details input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand" /> รายละเอียดการปิดคิว/สาเหตุการลา
              </label>
              <input
                type="text"
                placeholder=""
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-stone-205 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all bg-white placeholder:text-stone-400 font-medium"
              />
            </div>

            {/* Recorder dropdown selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-brand" /> ผู้บันทึกข้อมูล
              </label>
              <select
                value={recorder}
                onChange={(e) => setRecorder(e.target.value)}
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-stone-205 focus:border-brand focus:ring-2 focus:ring-brand/10 outline-none transition-all bg-white font-medium shadow-2xs"
                required
              >
                <option value="">-- กรุณาเลือกผู้บันทึก --</option>
                {hairdressers.map((hd) => (
                  <option key={`rec-${hd.id}`} value={hd.name}>
                    ช่าง{hd.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Button */}
            <button
              type="submit"
              className="w-full bg-brand hover:bg-brand-dark hover:ring-2 hover:ring-brand/20 text-white py-3.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>บันทึกการปิดคิวจอง</span>
            </button>
          </form>
        </div>

        {/* Right Table/List Column */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200 shadow-sm space-y-5" id="leaves-list-column">
          <div className="flex justify-between items-center border-b border-stone-100 pb-3">
            <h3 className="font-serif font-bold text-stone-900 flex items-center gap-2">
              📅 รายการปิดคิวจองของช่างในระบบ
              <span className="text-xs px-2 py-0.5 bg-stone-100 border border-stone-200/80 rounded-full font-sans font-semibold text-stone-500">
                {leaves.length} รายการ
              </span>
            </h3>
          </div>

          <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
            {leaves.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-stone-100 rounded-3xl space-y-2">
                <p className="text-3xl">💤</p>
                <p className="text-stone-700 font-bold text-sm">ไม่มีเวลาปิดคิวชั่วคราวขณะนี้</p>
                <p className="text-[11px] text-stone-400">ช่างทุกคนพร้อมรับคิวเต็มเวลาตามตารางระบบปกติ</p>
              </div>
            ) : (
              leaves.map((leave) => {
                const isEditing = editingId === leave.id;

                if (isEditing) {
                  return (
                    <div key={leave.id} className="p-4 rounded-2xl bg-amber-50/50 border-2 border-brand/40 animate-fade-in space-y-4 shadow-sm">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600">ช่างที่ลางาน</label>
                          <select
                            value={editHairdresserId}
                            onChange={(e) => setEditHairdresserId(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white"
                          >
                            {hairdressers.map(h => (
                              <option key={h.id} value={h.id}>ช่าง{h.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600">วันที่</label>
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600">เริ่มเวลา</label>
                          <select
                            value={editStartTime}
                            onChange={(e) => setEditStartTime(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white font-bold"
                            required
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={`edit-leave-start-${t}`} value={t}>
                                {formatThaiTime(t)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600">ถึงเวลา</label>
                          <select
                            value={editEndTime}
                            onChange={(e) => setEditEndTime(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white font-bold"
                            required
                          >
                            {TIME_OPTIONS.map((t) => (
                              <option key={`edit-leave-end-${t}`} value={t}>
                                {formatThaiTime(t)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600">รายละเอียดสาเหตุ</label>
                          <input
                            type="text"
                            value={editDetails}
                            onChange={(e) => setEditDetails(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-600">ผู้บันทึก</label>
                          <select
                            value={editRecorder}
                            onChange={(e) => setEditRecorder(e.target.value)}
                            className="w-full text-xs p-2 rounded-lg border border-stone-300 bg-white font-medium"
                            required
                          >
                            <option value="">-- เลือกผู้บันทึก --</option>
                            {hairdressers.map((hd) => (
                              <option key={`edit-rec-${hd.id}`} value={hd.name}>
                                ช่าง{hd.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-2 border-t border-stone-200/55">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                        >
                          ยกเลิก
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdate(leave.id)}
                          className="bg-brand text-white px-4.5 py-1.5 text-xs font-bold rounded-lg hover:bg-brand-dark transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>บันทึกความเปลี่ยนแปลง</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={leave.id} className="p-4 sm:p-5 rounded-2xl border border-stone-205 hover:border-brand/35 bg-stone-50/55 hover:bg-white transition-all flex flex-col sm:flex-row justify-between gap-3.5 items-start sm:items-center relative group">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">ช่าง{leave.hairdresserName}</span>
                        <div className="text-[10px] font-bold px-2 py-0.5 bg-brand-light border border-brand/20 text-brand-dark rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatThaiTime(leave.startTime)} - {formatThaiTime(leave.endTime)}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 bg-stone-100 border border-stone-200/40 px-2 py-0.5 rounded-full font-semibold font-mono">
                          {formatThaiDate(leave.date)}
                        </span>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-stone-600 flex gap-1 font-semibold">
                          <span className="text-stone-400">📝 รายละเอียด:</span>
                          <span className="text-stone-800">{leave.details}</span>
                        </p>
                        <p className="text-[10px] text-stone-500 font-medium">
                          👤 บันทึกโดย: <span className="font-bold text-stone-700">{leave.recorder}</span>
                        </p>
                      </div>
                    </div>

                    {confirmDeleteId === leave.id ? (
                      <div className="bg-red-50 border border-red-200 p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs w-full sm:w-auto font-sans">
                        <span className="font-bold text-red-950 shrink-0">ลบรายการปิดคิวนี้?</span>
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-850 font-bold rounded-lg cursor-pointer transition-all"
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleDelete(leave.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white font-black rounded-lg cursor-pointer transition-all shadow-xs"
                          >
                            ยืนยันลบ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-1.5 sm:self-center shrink-0 w-full sm:w-auto justify-end border-t sm:border-t-0 border-stone-100 pt-2 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => startEdit(leave)}
                          className="px-3 py-1.5 text-[11px] font-bold border border-stone-200 hover:border-brand bg-white hover:bg-brand-light text-stone-600 hover:text-brand-dark rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          title="แก้ไขรายละเอียดการปิดเวลา"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>แก้ไข</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(leave.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                          title="ลบรายการปิดเวลาออก"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
