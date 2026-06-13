"use client";
import { useState } from "react";
import { useNotifStore } from "@/lib/store";
import { useT } from "@/lib/i18n";

export default function NotificationBell() {
  const { notifications, markRead, markAllRead, clear } = useNotifStore();
  const [open, setOpen] = useState(false);
  const t = useT();
  const unread = notifications.filter(n => !n.read).length;

  const TYPE_ICON: Record<string, string> = { deposit: "↙", transfer: "↗", withdraw: "↓", info: "ℹ" };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
      >
        <span className="text-[18px]">🔔</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-[13px] text-slate-800">{t("notif")}</span>
            <div className="flex gap-2">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[11px] text-indigo-600 hover:underline">{t("markAllRead")}</button>
              )}
              <button onClick={clear} className="text-[11px] text-slate-400 hover:text-red-500">Clear</button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-slate-400">{t("noNotif")}</div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors ${n.read ? "opacity-60" : "hover:bg-slate-50"}`}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 text-white"
                    style={{ background: n.color }}
                  >
                    {TYPE_ICON[n.type] || "ℹ"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-800">{n.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{n.body}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {new Date(n.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-1" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
