import React from 'react';
import { PageLayout } from '../components/layout/PageLayout.jsx';
import { Turbomining } from '../components/steps/Turbomining/index.jsx';

export function TurbominingPage() {
  return (
    <PageLayout currentKey="turbomining" stepName="Turbomining">
      <Turbomining />
    </PageLayout>
  );
}
