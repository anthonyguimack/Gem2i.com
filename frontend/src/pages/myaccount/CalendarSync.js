import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import CalendarSyncCard from '../../components/CalendarSyncCard';

const v = (name, fb) => `var(--ma-${name}, ${fb})`;

export default function CalendarSync() {
  const ctx = useOutletContext() || {};
  const title = ctx.sectionLabel ? ctx.sectionLabel('calendar-sync', 'Calendar Sync') : 'Calendar Sync';
  return (
    <div className="max-w-3xl" data-testid="calendar-sync-page">
      <div className="flex items-center gap-3 mb-2">
        <Calendar className="w-6 h-6" style={{ color: v('accent', '#c9a84c') }} />
        <h1 className="text-2xl font-bold" style={{ color: v('text-primary', '#fff'), fontFamily: 'Playfair Display, serif' }} data-testid="calendar-sync-title">
          {title}
        </h1>
      </div>
      <p className="text-sm mb-6" style={{ color: v('text-secondary', '#9ca3af') }}>
        Subscribe to your personal feed and every booked mentorship session + registered event
        shows up in Google Calendar, Apple Calendar, or Outlook — automatically, on all your devices.
      </p>
      <div className="rounded-lg p-5" style={{ backgroundColor: v('card-bg', '#13161e'), border: `1px solid ${v('card-border', 'rgba(255,255,255,0.05)')}` }}>
        <CalendarSyncCard />
      </div>
    </div>
  );
}
