import { AlertTriangle, Info, BellRing, X } from 'lucide-react';

export default function AlertBanner({ message, level, onDismiss }: { message: string, level: 1 | 2 | 3, onDismiss?: () => void }) {
  const styles = {
    1: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: <Info className="w-5 h-5 text-blue-400" />, text: 'text-blue-200', btnText: 'text-blue-400', btnBorder: 'border-blue-500/30', btnHover: 'hover:bg-blue-500/20', prefix: 'INFO' },
    2: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, text: 'text-amber-200', btnText: 'text-amber-400', btnBorder: 'border-amber-500/30', btnHover: 'hover:bg-amber-500/20', prefix: 'WARNING' },
    3: { bg: 'bg-red-500/10', border: 'border-red-500/20', icon: <BellRing className="w-5 h-5 text-red-500" />, text: 'text-red-200', btnText: 'text-red-400', btnBorder: 'border-red-500/30', btnHover: 'hover:bg-red-500/20', prefix: 'ANOMALY' },
  };

  const style = styles[level];

  return (
    <div className={`${style.bg} border ${style.border} p-4 rounded-xl flex items-start sm:items-center justify-between mb-4 shadow-sm w-full gap-4`}>
      <div className="flex items-start sm:items-center gap-3">
        <div className="mt-0.5 sm:mt-0 shrink-0">
          {style.icon || <span className={`flex h-2 w-2 rounded-full bg-blue-500 animate-pulse`}></span>}
        </div>
        <p className={`text-sm ${style.text} leading-tight`}><span className="font-bold tracking-wide mr-1">{style.prefix}:</span> {message}</p>
      </div>
      <button onClick={onDismiss} className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-lg ${style.btnHover} ${style.btnText} transition-colors`}>
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
