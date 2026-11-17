import { BatteryCharging, BedDouble, Cctv, Droplets, Lamp, Navigation, Wifi } from 'lucide-react';
import type { Amenity } from '@/lib/types';
import { AMENITY_LABEL } from '@/lib/utils';

const ICONS: Record<Amenity, React.ComponentType<{ className?: string }>> = {
  CHARGING_PORT: BatteryCharging,
  WATER_BOTTLE: Droplets,
  BLANKET: BedDouble,
  LIVE_TRACKING: Navigation,
  CCTV: Cctv,
  WIFI: Wifi,
  READING_LIGHT: Lamp,
};

export function AmenityIcon({ amenity, className = 'h-4 w-4' }: { amenity: Amenity; className?: string }) {
  const Icon = ICONS[amenity];
  return (
    <span title={AMENITY_LABEL[amenity]} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-card text-slate-600">
      <Icon className={className} aria-hidden />
      <span className="sr-only">{AMENITY_LABEL[amenity]}</span>
    </span>
  );
}
