export default function AlertBanner({ message, level, onDismiss }: { message: string, level: 1 | 2 | 3, onDismiss?: () => void }) {
  const styles = {
    1: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-500', text: 'text-blue-200', btnText: 'text-blue-400', btnBorder: 'border-blue-500/30', btnHover: 'hover:bg-blue-500/10', prefix: 'INFO' },
    2: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-500', text: 'text-amber-200', btnText: 'text-amber-400', btnBorder: 'border-amber-500/30', btnHover: 'hover:bg-amber-500/10', prefix: 'WARNING' },
    3: { bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500', text: 'text-red-200', btnText: 'text-red-400', btnBorder: 'border-red-500/30', btnHover: 'hover:bg-red-500/10', prefix: 'ANOMALY' },
  };

  const style = styles[level];

  return (
    <div className={`${style.bg} border ${style.border} p-3 rounded-xl flex items-center justify-between mb-4`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-2 w-2 rounded-full ${style.dot} animate-pulse`}></span>
        <p className={`text-sm ${style.text}`}><span className="font-bold">{style.prefix}:</span> {message}</p>
      </div>
      <button onClick={onDismiss} className={`text-xs font-bold uppercase tracking-wider ${style.btnText} border ${style.btnBorder} px-3 py-1 rounded-lg ${style.btnHover} transition-colors`}>
        Dismiss
      </button>
    </div>
  );
}
