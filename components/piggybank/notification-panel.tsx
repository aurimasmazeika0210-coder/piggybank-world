"use client"

import { Check, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export interface NotificationItem {
  id: number
  title: string
  body: string
  isRead: boolean
  type: string
  createdAt: string
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function dotColor(type: string): string {
  if (type === "success" || type === "top_up" || type === "card_unfrozen") return "bg-emerald-500"
  if (type === "alert" || type === "card_frozen") return "bg-red-500"
  if (type === "dividend") return "bg-amber-500"
  return "bg-blue-500"
}

interface NotificationPanelProps {
  notifications: NotificationItem[]
  onMarkAllRead: () => void | Promise<void>
  onDelete?: (id: number) => void | Promise<void>
  onDeleteAll?: () => void | Promise<void>
  markingRead?: boolean
  deletingAll?: boolean
  className?: string
  emptyMessage?: string
}

export function NotificationPanel({
  notifications,
  onMarkAllRead,
  onDelete,
  onDeleteAll,
  markingRead = false,
  deletingAll = false,
  className,
  emptyMessage = "No notifications yet",
}: NotificationPanelProps) {
  const hasUnread = notifications.some((n) => !n.isRead)

  return (
    <div
      className={cn(
        "bg-card rounded-2xl shadow-xl border w-80 z-50 text-foreground",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 p-3 border-b">
        <span className="font-semibold text-sm shrink-0">Notifications</span>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              className="text-xs text-primary font-medium disabled:opacity-50 flex items-center gap-1"
              disabled={markingRead || !hasUnread}
              onClick={(e) => {
                e.stopPropagation()
                void onMarkAllRead()
              }}
            >
              <Check className="w-3 h-3" />
              {markingRead ? "Saving…" : "Mark all read"}
            </button>
            {onDeleteAll && (
              <button
                type="button"
                className="text-xs text-destructive font-medium disabled:opacity-50 flex items-center gap-1"
                disabled={deletingAll}
                onClick={(e) => {
                  e.stopPropagation()
                  void onDeleteAll()
                }}
              >
                <Trash2 className="w-3 h-3" />
                {deletingAll ? "Deleting…" : "Delete all"}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground text-center">{emptyMessage}</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              className={cn(
                "p-3 border-b last:border-0 flex gap-2 items-start",
                n.isRead && "opacity-60"
              )}
            >
              {!n.isRead ? (
                <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColor(n.type))} />
              ) : (
                <span className="w-2 h-2 mt-1.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(n.createdAt)}</p>
              </div>
              {onDelete && (
                <button
                  type="button"
                  aria-label="Delete notification"
                  onClick={() => void onDelete(n.id)}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
