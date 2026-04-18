'use client';

import { Suspense } from 'react';
import ClassementContent from './ClassementContent';

export default function ClassementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-amber-700 text-lg">Chargement du classement…</p>
      </div>
    }>
      <ClassementContent />
    </Suspense>
  );
}