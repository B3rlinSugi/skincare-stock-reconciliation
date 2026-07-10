'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, AlertTriangle, ArrowRightCircle } from 'lucide-react'
import { supabase } from '@/lib/db/browser'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'WARNING' | 'INFO'
  message: string
  link?: string
  read: boolean
  timestamp: Date
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch initial notifications or mock them
  useEffect(() => {
    // In a real app, these would come from a notifications table.
    // We'll mock a low stock warning for demo, and then listen to real-time events.
    setNotifications([
      {
        id: 'mock-1',
        type: 'WARNING',
        message: 'Stok Lip Balm Strawberry di bawah batas minimum (Sisa 12).',
        link: '/products',
        read: false,
        timestamp: new Date(Date.now() - 1000 * 60 * 30) // 30 mins ago
      },
    ])
  }, [])

  // Listen to Supabase Realtime for new audit logs or returns
  useEffect(() => {
    // 1. Listen for new Returns (which need inspection)
    const returnsChannel = supabase.channel('public:returns')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'returns' }, payload => {
        const newNotif: Notification = {
          id: payload.new.id,
          type: 'INFO',
          message: 'Retur baru masuk dari ' + payload.new.marketplace + '. Perlu inspeksi.',
          link: '/returns',
          read: false,
          timestamp: new Date()
        }
        setNotifications(prev => [newNotif, ...prev])
      })
      .subscribe()

    // 2. Listen for Stock changes that drop below threshold
    // This is harder without a backend trigger evaluating the threshold.
    // For this MVP, listening to returns is a great showcase of real-time.

    return () => {
      supabase.removeChannel(returnsChannel)
    }
  }, [])

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div style={{ position: 'fixed', top: 20, right: 32, zIndex: 100 }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: '50%',
          width: 44,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          transition: 'all 0.2s',
          color: 'var(--text-primary)'
        }}
        className="hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute', top: -2, right: -2,
            background: 'var(--accent-danger)', color: 'white',
            fontSize: 10, fontWeight: 'bold',
            width: 20, height: 20, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-default)'
          }}>
            {unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 52, right: 0,
          width: 320, background: 'var(--bg-overlay)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--border-strong)',
          borderRadius: 12,
          boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 20px var(--accent-primary-glow)',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          zIndex: 50
        }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 600, margin: 0 }}>Notifikasi</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} style={{ fontSize: 12, color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                Tandai sudah dibaca
              </button>
            )}
          </div>
          
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Belum ada notifikasi
              </div>
            ) : (
              notifications.map(notif => (
                <div key={notif.id} style={{
                  padding: 16, borderBottom: '1px solid var(--border-subtle)',
                  background: notif.read ? 'transparent' : 'rgba(139, 92, 246, 0.05)',
                  display: 'flex', gap: 12
                }}>
                  <div style={{ color: notif.type === 'WARNING' ? 'var(--accent-warning)' : 'var(--accent-primary)' }}>
                    {notif.type === 'WARNING' ? <AlertTriangle size={18} /> : <Bell size={18} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.4 }}>
                      {notif.message}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {notif.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {notif.link && (
                        <Link href={notif.link} onClick={() => setIsOpen(false)} style={{ fontSize: 12, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                          Lihat Detail <ArrowRightCircle size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
