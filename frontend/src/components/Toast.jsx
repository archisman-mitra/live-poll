import { useEffect } from "react";

export default function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  const typeStyles = {
    success: "border-green-800/40 bg-green-950/90 text-green-400",
    error: "border-red-800/40 bg-red-950/90 text-red-400",
    info: "border-blue-800/40 bg-blue-950/90 text-blue-400",
  };

  const icons = {
    success: "✅",
    error: "⚠️",
    info: "ℹ️",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-[slide-up_0.3s_ease-out]">
      <div
        onClick={onClose}
        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md transition-all hover:scale-105 ${typeStyles[type]}`}
      >
        <span className="text-lg">{icons[type]}</span>
        <p className="font-medium">{message}</p>
      </div>
    </div>
  );
}
