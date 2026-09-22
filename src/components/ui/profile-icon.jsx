import React from 'react';
import { cn } from '@/utils/utils';
import { resolveChannel } from '@/utils/channelColors';

/**
 * Kanalfärgad kontoikon med initialer
 *
 * Samma visuella språk som profilikonerna i Meta Analytics, så att ett konto
 * går att känna igen på färgen oavsett vilken av apparna man tittar i.
 *
 * @param {string} props.name - Kontots visningsnamn
 * @param {string} [props.handle] - Kontots @-namn, används också för matchning
 * @param {'sm'|'md'} [props.size] - 'sm' = 24px, 'md' = 36px
 */
export function ProfileIcon({ name, handle, size = 'sm', className }) {
  const { label, color, channel } = resolveChannel({ name, handle });

  return (
    <div
      className={cn(
        'shrink-0 rounded-sm flex items-center justify-center font-bold text-white leading-none',
        size === 'md' ? 'w-9 h-9 text-xs' : 'w-6 h-6 text-[10px]',
        className
      )}
      style={{ backgroundColor: color }}
      title={channel ? `${name} (${channel})` : name}
      aria-hidden="true"
    >
      {label}
    </div>
  );
}
