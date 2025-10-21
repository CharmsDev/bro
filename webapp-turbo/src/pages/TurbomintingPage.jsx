import { PageLayout } from '../components/layout/PageLayout.jsx';
import { Turbominting } from '../components/steps/Turbominting/index.jsx';

export function TurbomintingPage() {
  return (
    <PageLayout 
      currentKey="turbominting"
      title="Step 4: Turbominting"
      description="Automated multi-output BRO token minting process"
    >
      <Turbominting />
    </PageLayout>
  );
}
