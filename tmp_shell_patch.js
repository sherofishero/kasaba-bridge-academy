const fs = require('fs');
const p = 'C:\\Users\\Seref\\kasaba-bridge-academy\\app\\components\\global-panel\\GlobalShell.tsx';

const content = `"use client";

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import GlobalPanel from './GlobalPanel';
import { GlobalTableProvider } from './GlobalTableContext';

type GlobalShellProps = {
  children: ReactNode;
};

export default function GlobalShell({
  children,
}: GlobalShellProps) {
  const pathname = usePathname();

  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  const hidePanel =
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/uye-ol';

  if (hidePanel) {
    return <>{children}</>;
  }

  return (
    <GlobalTableProvider>
      <div
        className='min-h-screen w-full'
        style={{
          width: '100%',
          maxWidth: '100vw',
          minWidth: 0,
          margin: 0,
          padding: 0,
          overflowX: 'clip',
        }}
      >
        {/* ANA SAYFA */}
        <main
          className='min-w-0 w-full overflow-x-hidden'
          style={{
            width: '100%',
            maxWidth: '100vw',
            minWidth: 0,
            paddingRight: '0px',
          }}
        >
          {children}
        </main>

        {/* PANEL AÇMA DÜĞMESİ */}
        {!panelOpen && (
          <button
            type='button'
            onClick={() => setPanelOpen(true)}
            className='fixed right-2 top-2 z-40 rounded-md border border-yellow-700 bg-yellow-300 px-2 py-1 text-xs font-bold text-black shadow hover:bg-yellow-200'
            aria-label='Panel aç'
          >
            Panel
          </button>
        )}

        {/* GLOBAL PANEL (OVERLAY) */}
        {panelOpen && (
          <div
            className='fixed inset-0 z-50'
            onClick={() => setPanelOpen(false)}
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          >
            <div
              className='flex justify-end h-full'
              onClick={(e) => e.stopPropagation()}
            >
              <GlobalPanel
                open={panelOpen}
                width={280}
                onOpenChange={setPanelOpen}
                onWidthChange={() => {}}
              />
            </div>
          </div>
        )}
      </div>
    </GlobalTableProvider>
  );
}
";

fs.writeFileSync(p, content, 'utf8');
console.log('GlobalShell.tsx written');
