'use client';

import * as React from 'react';

import ResearchSection from '../sections/ResearchSection';

export default function ResearchPage() {
  return (
    <React.Suspense>
      <ResearchSection />
    </React.Suspense>
  );
}
