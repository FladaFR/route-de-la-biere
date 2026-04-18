'use client';

import { useRouter } from 'next/navigation';

const tabs = [
  { key: 'bieres',     label: 'Bières',     icon: '🍺', href: '/bieres'     },
  { key: 'classement', label: 'Classement', icon: '📋', href: '/classement' },
  { key: 'resultats',  label: 'Résultats',  icon: '🏆', href: '/resultats'  },
];

export default function NavBar({ active }) {
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="flex">
        {tabs.map(tab => {
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.href)}
              className={`
                flex-1 flex flex-col items-center justify-center py-3 gap-0.5
                transition-colors active:scale-95
                ${isActive ? 'text-amber-600' : 'text-gray-400'}
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className={`text-xs font-medium ${isActive ? 'text-amber-600' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}