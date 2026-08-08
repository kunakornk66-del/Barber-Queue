import React, { useState } from 'react';
import { ShieldAlert, LogOut, RefreshCw, Clock, Ban, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ShopSubscription } from '../types';

interface AccessControlGuardProps {
  subscription: ShopSubscription | null;
  shopEmail: string;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
}

export const AccessControlGuard: React.FC<AccessControlGuardProps> = ({
  subscription,
  shopEmail,
  onLogout,
  onRefresh,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    setRefreshMessage(null);
    try {
      await onRefresh();
      setRefreshMessage('อัปเดตสถานะล่าสุดเรียบร้อยแล้ว');
    } catch (err) {
      setRefreshMessage('ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshMessage(null), 4000);
    }
  };

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();
  const isExpired = subscription ? subscription.expiryDate < todayStr || subscription.status === 'expired' : false;
  const status = subscription?.status || 'pending';

  let title = 'จำกัดการเข้าใช้งานระบบ';
  let badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  let badgeText = '🔴 รอดำเนินการอนุมัติสิทธิ์ (Pending)';
  let icon = <Clock className="w-10 h-10 text-amber-400 animate-pulse" />;
  let description =
    'บัญชีร้านค้าของคุณอยู่ระหว่างรอการตรวจสอบและอนุมัติสิทธิ์การใช้งานจากผู้ดูแลระบบ (Super Admin)';

  if (status === 'suspended') {
    badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    badgeText = '🚫 บัญชีถูกระงับการใช้งาน (Suspended)';
    icon = <Ban className="w-10 h-10 text-rose-400" />;
    description =
      'บัญชีร้านค้านี้ถูกระงับสิทธิ์การใช้งานชั่วคราว โปรดติดต่อผู้ดูแลระบบเพื่อขอข้อมูลเพิ่มเติมหรือขอปลดล็อกสิทธิ์';
  } else if (isExpired || status === 'expired') {
    badgeColor = 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    badgeText = `⏳ สิทธิ์การใช้งานหมดอายุแล้ว (Expired)`;
    icon = <AlertTriangle className="w-10 h-10 text-orange-400" />;
    description = `แพ็กเกจสิทธิ์การใช้งานของคุณหมดอายุแล้วเมื่อวันที่ ${subscription?.expiryDate || 'ไม่ระบุ'} โปรดติดต่อผู้ดูแลระบบเพื่อทำการต่ออายุสิทธิ์`;
  }

  return (
    <div className="min-h-screen bg-[#0B1325] text-stone-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500" />
      <div className="absolute -top-32 -left-32 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="max-w-lg w-full bg-[#131F37] border border-stone-800 rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 text-center space-y-6">
        
        {/* Status Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-stone-900/80 border border-stone-700/60 flex items-center justify-center shadow-inner">
          {icon}
        </div>

        {/* Title & Badges */}
        <div className="space-y-2">
          <div className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold border ${badgeColor} mb-2`}>
            {badgeText}
          </div>
          <h1 className="text-2xl font-serif font-bold text-white tracking-wide">
            {title}
          </h1>
          <p className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
            {description}
          </p>
        </div>

        {/* Shop Info Box */}
        <div className="bg-[#0D1627] rounded-2xl p-4 border border-stone-800 text-left space-y-2.5 text-xs">
          <div className="flex justify-between items-center border-b border-stone-800/80 pb-2">
            <span className="text-stone-400">อีเมลร้านค้า:</span>
            <span className="font-mono font-semibold text-white">{shopEmail}</span>
          </div>
          <div className="flex justify-between items-center border-b border-stone-800/80 pb-2">
            <span className="text-stone-400">ชื่อร้านค้า:</span>
            <span className="font-semibold text-amber-300">{subscription?.shopName || 'ร้านค้าใหม่'}</span>
          </div>
          {subscription?.expiryDate && (
            <div className="flex justify-between items-center border-b border-stone-800/80 pb-2">
              <span className="text-stone-400">วันหมดอายุสิทธิ์:</span>
              <span className={`font-mono font-semibold ${isExpired ? 'text-rose-400' : 'text-emerald-400'}`}>
                {subscription.expiryDate}
              </span>
            </div>
          )}
          {subscription?.notes && (
            <div className="pt-1">
              <span className="text-stone-400 block mb-1">หมายเหตุจากผู้ดูแลระบบ:</span>
              <p className="bg-stone-900/70 text-stone-300 p-2.5 rounded-xl text-[11px] leading-relaxed border border-stone-800">
                {subscription.notes}
              </p>
            </div>
          )}
        </div>

        {refreshMessage && (
          <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 py-2.5 px-4 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{refreshMessage}</span>
          </div>
        )}

        {/* Instructions */}
        <div className="text-[11px] text-stone-400 bg-amber-950/20 border border-amber-900/30 p-3.5 rounded-xl text-left space-y-1">
          <p className="font-semibold text-amber-300">💡 วิธีดำเนินการ:</p>
          <p>• หากท่านชำระค่าบริการแล้ว หรือต้องการขออนุมัติใช้งาน โปรดติดต่อ Super Admin</p>
          <p>• เมื่อ Super Admin อนุมัติสิทธิ์แล้ว ให้กดปุ่ม <b>"ตรวจสอบสิทธิ์อีกครั้ง"</b> ด้านล่างเพื่อเข้าใช้งานระบบทันที</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'กำลังตรวจสอบ...' : 'ตรวจสอบสิทธิ์อีกครั้ง'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold py-3 px-5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-stone-700/80 active:scale-98"
          >
            <LogOut className="w-4 h-4 text-stone-400" />
            <span>ออกจากระบบ</span>
          </button>
        </div>

      </div>
    </div>
  );
};
