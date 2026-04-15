'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

const NAV = [
  { href: '/',        icon: 'home',      label: 'Home'  },
  { href: '/round',   icon: 'sports_golf', label: 'Round', fab: true },
  { href: '/stats',   icon: 'bar_chart', label: 'Stats' },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="glass border-t border-outline-v/20 safe-bottom fixed bottom-0 left-0 right-0 z-40">
      <div className="flex items-center justify-around h-16 px-4 max-w-lg mx-auto">
        {NAV.map(({ href, icon, label, fab }) =>
          fab ? (
            <Link key={href} href={href}
              className="btn-primary rounded-full w-16 h-16 -mt-6 flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: '0 4px 24px rgba(120,220,119,0.35)' }}>
              <Icon name={icon} className="text-2xl text-on-primary" />
            </Link>
          ) : (
            <Link key={href} href={href}
              className="flex flex-col items-center gap-0.5 px-5 py-1 min-w-[56px] min-h-[44px] justify-center">
              <Icon name={icon} filled={path === href} className={`text-2xl ${path === href ? 'text-primary' : 'text-on-variant'}`} />
              <span className={`text-[10px] tracking-wide font-semibold ${path === href ? 'text-primary' : 'text-on-variant'}`}>
                {label}
              </span>
            </Link>
          )
        )}
      </div>
    </nav>
  );
}
