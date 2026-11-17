'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Armchair, ChevronDown, Clock, MapPin, Snowflake, Star, Tag, Ticket } from 'lucide-react';
import type { Trip } from '@/lib/types';
import { BUS_TYPE_LABEL, cn, formatDate, formatDuration, inr } from '@/lib/utils';
import { Badge, Button } from '@/components/ui';
import { AmenityIcon } from './AmenityIcon';

export function BusCard({ trip, onBook, index = 0 }: { trip: Trip; onBook: (t: Trip) => void; index?: number }) {
  const [open, setOpen] = useState(false);
  const discounted = Math.round(trip.fare * (1 - trip.discountPercent / 100));
  const low = trip.availableSeats <= 6;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft transition-shadow hover:shadow-lift"
      aria-label={`${trip.operatorName} ${trip.busName}, departs ${trip.departureTime}, fare ${inr(discounted)}`}
    >
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-bold text-ink">{trip.operatorName}</h3>
              <span className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2 py-0.5 text-xs font-bold text-white" aria-label={`Rated ${trip.rating} out of 5`}>
                <Star className="h-3 w-3 fill-white" /> {trip.rating.toFixed(1)}
              </span>
              <span className="text-xs text-muted">({trip.reviews.toLocaleString('en-IN')} reviews)</span>
            </div>
            <p className="mt-0.5 text-sm text-muted">
              {trip.busName} · <span className="font-medium">{trip.busNumber}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={trip.ac ? 'primary' : 'neutral'} icon={trip.ac ? <Snowflake className="h-3 w-3" /> : undefined}>
                {BUS_TYPE_LABEL[trip.busType]}
              </Badge>
              {trip.discountPercent > 0 && <Badge tone="accent" icon={<Tag className="h-3 w-3" />}>{trip.discountPercent}% OFF</Badge>}
              {trip.couponCode && <Badge tone="secondary" icon={<Ticket className="h-3 w-3" />}>Use {trip.couponCode}</Badge>}
            </div>
          </div>
          <div className="text-right">
            {trip.discountPercent > 0 && <p className="text-sm text-muted line-through">{inr(trip.fare)}</p>}
            <p className="text-2xl font-extrabold text-ink">{inr(discounted)}</p>
            <p className="text-xs text-muted">per seat onwards</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-card p-3 sm:p-4">
          <div>
            <p className="text-xl font-extrabold text-ink">{trip.departureTime}</p>
            <p className="truncate text-sm font-medium text-slate-600">{trip.fromCity}</p>
            <p className="text-xs text-muted">{formatDate(trip.journeyDate)}</p>
          </div>
          <div className="flex flex-col items-center text-xs font-semibold text-muted">
            <Clock className="mb-1 h-4 w-4 text-primary" />
            {formatDuration(trip.durationMins)}
            <span className="mt-1 h-0.5 w-16 rounded-full gradient-brand sm:w-24" aria-hidden />
          </div>
          <div className="text-right">
            <p className="text-xl font-extrabold text-ink">{trip.arrivalTime}</p>
            <p className="truncate text-sm font-medium text-slate-600">{trip.toCity}</p>
            <p className="text-xs text-muted">Arrival</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className={cn('inline-flex items-center gap-1 font-semibold', low ? 'text-red-600' : 'text-green-700')}>
              <Armchair className="h-4 w-4" /> {trip.availableSeats} seats left
            </span>
            <span className="text-muted">{trip.windowSeats} window</span>
            <span className="text-muted">of {trip.totalSeats}</span>
          </div>
          <div className="flex flex-wrap gap-1" aria-label="Amenities">
            {trip.amenities.map((a) => (
              <AmenityIcon key={a} amenity={a} />
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-primary"
          >
            Boarding & dropping points <ChevronDown className={cn('h-4 w-4 transition', open && 'rotate-180')} />
          </button>
          <Button onClick={() => onBook(trip)} className="px-6">
            Book Now
          </Button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-card/60">
            <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
              {[
                ['Boarding points', trip.boardingPoints],
                ['Dropping points', trip.droppingPoints],
              ].map(([title, pts]) => (
                <div key={title as string}>
                  <p className="mb-2 text-sm font-bold">{title as string}</p>
                  <ul className="space-y-2">
                    {(pts as Trip['boardingPoints']).map((p) => (
                      <li key={p.id} className="flex gap-2 text-sm">
                        <span className="w-12 shrink-0 font-bold">{p.time}</span>
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>
                          <span className="font-medium">{p.name}</span>
                          <span className="block text-xs text-muted">{p.address}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export function BusCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-soft" role="status" aria-label="Loading bus">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="skeleton h-5 w-48" />
          <div className="skeleton h-3 w-32" />
          <div className="skeleton h-6 w-40" />
        </div>
        <div className="skeleton h-10 w-24" />
      </div>
      <div className="skeleton mt-4 h-20 w-full" />
      <div className="mt-4 flex justify-between">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-11 w-32" />
      </div>
    </div>
  );
}
