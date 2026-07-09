import { useState, FormEvent } from 'react';
import { Booking, Hairdresser } from '../types';
import { Sparkles, User, Phone, Calendar, Clock, Scissors, Star, ShieldAlert, Send, ArrowRight, RefreshCw, MessageSquare } from 'lucide-react';

interface CustomerInsightsProps {
  bookings: Booking[];
  hairdressers: Hairdresser[];
}

interface AIInsightResult {
  preferredStyles: string;
  barberAdvice: string;
  recommendedStyles: string;
  idealFrequency: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function CustomerInsights({ bookings, hairdressers }: CustomerInsightsProps) {
  const [selectedCustomerKey, setSelectedCustomerKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [insights, setInsights] = useState<{ [key: string]: AIInsightResult }>({});
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<{ [key: string]: ChatMessage[] }>({});
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);

  // Helper to find hairdresser name
  const getHairdresserName = (id: string | null) => {
    if (id === null) return 'ไม่ระบุช่าง (ใครก็ได้)';
    const found = hairdressers.find(h => h.id === id);
    return found ? `ช่าง${found.name}` : 'ช่างนิรนาม';
  };

  // Group bookings by unique customer key (Name + Phone)
  const customerMap = new Map<string, { name: string; phone: string; bookings: Booking[] }>();

  bookings.forEach(booking => {
    const name = booking.customerName.trim();
    const phone = booking.customerPhone.trim() || '-';
    const key = `${name} (${phone})`;

    if (!customerMap.has(key)) {
      customerMap.set(key, { name, phone, bookings: [] });
    }
    customerMap.get(key)!.bookings.push(booking);
  });

  // Convert to array and sort by number of visits descending
  const customersList = Array.from(customerMap.entries()).map(([key, data]) => {
    // Sort customer bookings from newest to oldest
    const sortedBookings = [...data.bookings].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return b.startTime.localeCompare(a.startTime);
    });

    return {
      key,
      name: data.name,
      phone: data.phone,
      bookingsCount: data.bookings.length,
      bookings: sortedBookings,
    };
  }).sort((a, b) => b.bookingsCount - a.bookingsCount);

  // Currently selected customer details
  const activeCustomer = customersList.find(c => c.key === selectedCustomerKey) || null;

  // Fetch AI insights for the active customer
  const handleGenerateInsights = async () => {
    if (!activeCustomer) return;

    setIsLoading(true);
    setError(null);

    try {
      const simplifiedBookings = activeCustomer.bookings.map(b => ({
        date: b.date,
        startTime: b.startTime,
        endTime: b.endTime,
        hairdresserName: getHairdresserName(b.hairdresserId),
        remarks: b.remarks || '',
      }));

      const res = await fetch('/api/customer-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: activeCustomer.name,
          customerPhone: activeCustomer.phone,
          bookings: simplifiedBookings,
        }),
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถเชื่อมต่อบริการ AI ได้ กรุณาลองใหม่อีกครั้ง');
      }

      const data = await res.json();
      setInsights(prev => ({
        ...prev,
        [activeCustomer.key]: data,
      }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  // Send interactive chat message
  const handleSendChatMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !inputMessage.trim() || isSendingChat) return;

    const userMsgText = inputMessage.trim();
    setInputMessage('');

    // Append user message immediately
    const currentHistory = chatMessages[activeCustomer.key] || [];
    const updatedHistory: ChatMessage[] = [...currentHistory, { role: 'user', text: userMsgText }];
    
    setChatMessages(prev => ({
      ...prev,
      [activeCustomer.key]: updatedHistory,
    }));

    setIsSendingChat(true);

    try {
      const historyText = activeCustomer.bookings.map((b, index) => {
        return `ครั้งที่ ${index + 1}: วันที่ ${b.date} | ช่าง: ${getHairdresserName(b.hairdresserId)} | บันทึก: ${b.remarks || 'ไม่มี'}`;
      }).join('\n');

      const res = await fetch('/api/customer-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: activeCustomer.name,
          historyText,
          message: userMsgText,
          chatHistory: currentHistory,
        }),
      });

      if (!res.ok) {
        throw new Error('ไม่สามารถติดต่อผู้ช่วย AI ได้');
      }

      const data = await res.json();
      setChatMessages(prev => ({
        ...prev,
        [activeCustomer.key]: [...updatedHistory, { role: 'assistant', text: data.reply }],
      }));
    } catch (err: any) {
      console.error(err);
      setChatMessages(prev => ({
        ...prev,
        [activeCustomer.key]: [...updatedHistory, { role: 'assistant', text: '⚠️ ขออภัย เกิดข้อผิดพลาด ไม่สามารถส่งข้อความได้' }],
      }));
    } finally {
      setIsSendingChat(false);
    }
  };

  // Active customer's insights
  const activeCustomerInsights = activeCustomer ? insights[activeCustomer.key] : null;
  const activeCustomerChat = activeCustomer ? (chatMessages[activeCustomer.key] || []) : [];

  return (
    <div className="max-w-6xl mx-auto space-y-6" id="ai-insights-page">
      {/* Header Banner */}
      <div className="bg-stone-earth border border-brand/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl text-stone-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand/5 blur-3xl -mr-20 -mt-20"></div>
        <div className="space-y-2 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/35 text-brand text-[10px] font-bold">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI BARBER CONSULTANT</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-brand-light">วิเคราะห์โปรไฟล์ลูกค้าด้วย AI</h2>
          <p className="text-xs text-stone-400 max-w-xl leading-relaxed">
            ระบบอัจฉริยะวิเคราะห์ความถี่ ความชอบส่วนตัว และประวัติทรงผมย้อนหลังของลูกค้าแต่ละคน เพื่อให้ช่างทำผมบริการได้ตรงใจและเพิ่มโอกาสในการแนะนำทรงผมหรือผลิตภัณฑ์ดูแลเส้นผมที่เหมาะสม
          </p>
        </div>
        <div className="shrink-0 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-brand/10 border border-brand/30 flex items-center justify-center shadow-lg">
            <Sparkles className="w-9 h-9 text-brand" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Customers List (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-stone-200/60 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col h-[650px]" id="customers-sidebar">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-stone-800 flex items-center gap-2">
              <User className="w-4 h-4 text-brand" /> รายชื่อลูกค้าทั้งหมด ({customersList.length})
            </h3>
            <p className="text-[10px] text-stone-400">เลือกรายชื่อลูกค้าเพื่อดูประวัติและการวิเคราะห์เชิงลึก</p>
          </div>

          <div className="overflow-y-auto flex-1 pr-1 space-y-2 scrollbar-thin">
            {customersList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <p className="text-xs font-semibold">ยังไม่มีข้อมูลลูกค้าในระบบ</p>
                <p className="text-[10px] mt-1">กรุณาลงคิวเพื่อเริ่มสะสมประวัติ</p>
              </div>
            ) : (
              customersList.map((customer) => (
                <button
                  key={customer.key}
                  onClick={() => {
                    setSelectedCustomerKey(customer.key);
                    setError(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    selectedCustomerKey === customer.key
                      ? 'bg-brand/10 border-brand text-stone-900 shadow-sm'
                      : 'bg-stone-50/50 border-stone-200/50 text-stone-600 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-bold text-stone-800 truncate">{customer.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-500">
                      <Phone className="w-3 h-3" />
                      <span>{customer.phone}</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-200/60 font-bold text-stone-700">
                      {customer.bookingsCount} ครั้ง
                    </span>
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${selectedCustomerKey === customer.key ? 'translate-x-0.5 text-brand' : 'text-stone-300'}`} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right column: Selected Customer Profile & AI Analysis (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6" id="customer-profile-section">
          {!activeCustomer ? (
            <div className="bg-white border border-stone-200/60 rounded-3xl p-12 text-center flex flex-col items-center justify-center h-[650px] space-y-4">
              <div className="w-16 h-16 rounded-full bg-brand/5 border border-brand/20 flex items-center justify-center text-brand">
                <User className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-stone-800">โปรดเลือกรายชื่อลูกค้าด้านซ้าย</p>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  เพื่อเรียกดูสถิติ ประวัติการมาใช้บริการ และวิเคราะห์สไตล์ทรงผมด้วย AI อย่างแม่นยำ
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer summary card */}
              <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand font-bold text-sm shrink-0">
                    {activeCustomer.name.slice(0, 2)}
                  </div>
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-base font-bold text-stone-900 truncate">{activeCustomer.name}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-brand" />
                        <span>เบอร์โทร: {activeCustomer.phone}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-brand" />
                        <span>จองในระบบ: {activeCustomer.bookingsCount} ครั้ง</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Consult Button */}
                <div className="flex md:justify-end">
                  <button
                    onClick={handleGenerateInsights}
                    disabled={isLoading}
                    className="w-full md:w-auto px-4 py-2.5 bg-brand hover:bg-brand-dark text-stone-900 font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    )}
                    <span>{activeCustomerInsights ? 'วิเคราะห์โปรไฟล์ใหม่' : 'ให้ AI วิเคราะห์ข้อมูล'}</span>
                  </button>
                </div>
              </div>

              {/* Insights Results Bento Grid */}
              {isLoading && (
                <div className="bg-white border border-stone-200/60 rounded-3xl p-12 text-center space-y-4 flex flex-col items-center justify-center h-[350px]">
                  <RefreshCw className="w-10 h-10 text-brand animate-spin" />
                  <p className="text-xs font-bold text-stone-700 animate-pulse">
                    AI กำลังเจาะลึกวิเคราะห์พฤติกรรม สไตล์ความชอบ และคัดเลือกทรงผมที่สมบูรณ์แบบ...
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-2.5 text-red-800 text-xs">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {!isLoading && !error && activeCustomerInsights && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in" id="insights-grid">
                  {/* Preferred Styles Card */}
                  <div className="bg-white border border-stone-200/60 hover:border-brand/40 transition-all rounded-3xl p-5 shadow-sm space-y-2 flex flex-col">
                    <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
                      <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/25 flex items-center justify-center text-brand">
                        <Scissors className="w-3.5 h-3.5" />
                      </div>
                      <span>ทรงผมย้อนหลัง & สไตล์หลักที่ชอบ</span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed flex-1 bg-stone-50/50 p-3.5 rounded-2xl border border-stone-100">
                      {activeCustomerInsights.preferredStyles}
                    </p>
                  </div>

                  {/* Barber Guidance Card */}
                  <div className="bg-white border border-stone-200/60 hover:border-brand/40 transition-all rounded-3xl p-5 shadow-sm space-y-2 flex flex-col">
                    <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
                      <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </div>
                      <span>คำแนะนำสำหรับช่าง (ข้อควรจำ)</span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed flex-1 bg-red-50/30 p-3.5 rounded-2xl border border-red-100/50">
                      {activeCustomerInsights.barberAdvice}
                    </p>
                  </div>

                  {/* Recommended styles Card */}
                  <div className="bg-white border border-stone-200/60 hover:border-brand/40 transition-all rounded-3xl p-5 shadow-sm space-y-2 flex flex-col">
                    <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                        <Star className="w-3.5 h-3.5" />
                      </div>
                      <span>สไตล์หรือบริการที่ควรแนะนำครั้งหน้า</span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed flex-1 bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100/50">
                      {activeCustomerInsights.recommendedStyles}
                    </p>
                  </div>

                  {/* Return Cycle Card */}
                  <div className="bg-white border border-stone-200/60 hover:border-brand/40 transition-all rounded-3xl p-5 shadow-sm space-y-2 flex flex-col">
                    <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <span>ระยะเวลาการมาซ้ำที่เหมาะสม</span>
                    </div>
                    <p className="text-xs text-stone-600 leading-relaxed flex-1 bg-blue-50/30 p-3.5 rounded-2xl border border-blue-100/50">
                      {activeCustomerInsights.idealFrequency}
                    </p>
                  </div>
                </div>
              )}

              {/* Chat Assistant Component */}
              {!isLoading && activeCustomerInsights && (
                <div className="bg-stone-earth text-stone-100 border border-brand/20 rounded-3xl p-5 shadow-md flex flex-col gap-4 animate-fade-in" id="ai-chat-assistant">
                  <div className="flex items-center gap-2 border-b border-brand/25 pb-3">
                    <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center text-brand">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-brand-light">พูดคุยกับผู้ช่วย AI เกี่ยวกับลูกค้าคนนี้</h4>
                      <p className="text-[10px] text-stone-400">ถามปรึกษาเกี่ยวกับสไตล์ เส้นผม สี หรือการออกแบบทรงผมที่เหมาะกับ {activeCustomer.name}</p>
                    </div>
                  </div>

                  {/* Chat messages box */}
                  <div className="max-h-48 overflow-y-auto space-y-3 pr-1 scrollbar-thin text-xs">
                    {activeCustomerChat.length === 0 ? (
                      <p className="text-[11px] text-stone-400 text-center py-2">
                        ลองถามปรึกษา เช่น "ลูกค้าคนนี้ชอบสไตล์วินเทจ แนะนำทรงอะไรดี?" หรือ "ทรงผมสำหรับฤดูร้อนของลูกค้าท่านนี้คืออะไร?"
                      </p>
                    ) : (
                      activeCustomerChat.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                            msg.role === 'user'
                              ? 'bg-brand text-stone-900 font-semibold rounded-tr-none'
                              : 'bg-white/10 text-stone-200 border border-white/5 rounded-tl-none'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      ))
                    )}
                    {isSendingChat && (
                      <div className="flex justify-start">
                        <div className="bg-white/10 text-stone-300 p-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-brand rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chat Input form */}
                  <form onSubmit={handleSendChatMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder={`ถามข้อมูลหรือทรงผมเพิ่มเติมเกี่ยวกับคุณ ${activeCustomer.name}...`}
                      className="flex-1 bg-white/5 border border-white/10 outline-none focus:border-brand rounded-xl px-4 py-2 text-xs text-stone-200 placeholder:text-stone-500"
                      disabled={isSendingChat}
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isSendingChat}
                      className="px-4 py-2 bg-brand text-stone-900 rounded-xl text-xs font-bold transition-all shadow active:scale-95 hover:bg-brand-dark disabled:opacity-55 cursor-pointer flex items-center justify-center shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Timeline of past visits */}
              <div className="bg-white border border-stone-200/60 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-sm font-bold text-stone-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-brand" /> ประวัติความต้องการจากการจองที่ผ่านมา ({activeCustomer.bookings.length})
                </h4>

                <div className="relative border-l border-stone-200/80 ml-3.5 pl-5 space-y-5">
                  {activeCustomer.bookings.map((b) => (
                    <div key={b.id} className="relative">
                      {/* Timeline dot */}
                      <div className="absolute -left-[26px] top-1 w-3 h-3 rounded-full bg-brand border-2 border-white shadow-xs"></div>
                      
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-stone-800">วันที่ {b.date}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-light border border-brand/20 text-brand-dark font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {b.startTime} - {b.endTime} น.
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-stone-600 font-medium">
                            ช่าง: {getHairdresserName(b.hairdresserId)}
                          </span>
                        </div>
                        {b.remarks ? (
                          <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-150 inline-block max-w-full">
                            📝 <strong>ความต้องการ/บริการ:</strong> {b.remarks}
                          </p>
                        ) : (
                          <p className="text-[11px] text-stone-400 italic">ไม่มีการบันทึกความต้องการเพิ่มเติม</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
