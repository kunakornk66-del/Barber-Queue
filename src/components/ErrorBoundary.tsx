import { Component, ErrorInfo, ReactNode } from 'react';
import { Scissors, RefreshCw, AlertTriangle, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn("Error clearing storage:", e);
    }
    window.location.href = window.location.origin + window.location.pathname;
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B1325] text-stone-100 flex items-center justify-center p-4 font-sans antialiased">
          <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center animate-fade-in">
            
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Scissors className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>พบข้อผิดพลาดในการแสดงผลบนอุปกรณ์นี้</span>
              </div>
              <h1 className="text-xl font-bold font-serif text-white">ระบบกำลังกู้คืนหน้าเว็บ</h1>
              <p className="text-xs text-stone-400 leading-relaxed">
                เบราว์เซอร์หรืออุปกรณ์คอมพิวเตอร์ของคุณพบบล็อกการเข้าถึงบางส่วน (หรือข้อมูลแคชเดิมค้างอยู่) คุณสามารถกดปุ่มด้านล่างเพื่อเริ่มการทำงานใหม่ได้ทันที
              </p>
            </div>

            {this.state.error && (
              <div className="bg-stone-950 p-3.5 rounded-xl border border-stone-800 text-left overflow-x-auto max-h-32 text-[10px] font-mono text-stone-400 leading-snug">
                <span className="text-rose-400 font-bold">Error detail:</span> {this.state.error.toString()}
              </div>
            )}

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold py-3.5 px-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>รีเฟรชโหลดหน้าเว็บใหม่ (Reload Page)</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="w-full bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white font-bold py-3 px-4 rounded-2xl transition-all border border-stone-700 flex items-center justify-center gap-2 text-xs cursor-pointer active:scale-98"
              >
                <Trash2 className="w-3.5 h-3.5 text-stone-400" />
                <span>ล้างแคชชั่วคราวและกลับหน้าแรก (Clear Cache & Reset)</span>
              </button>
            </div>

            <div className="text-[10px] text-stone-500 pt-2 border-t border-stone-800/80">
              💡 ข้อมูลในระบบคลาวด์ Firebase จะถูกบันทึกอย่างปลอดภัย ไม่สูญหาย
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
