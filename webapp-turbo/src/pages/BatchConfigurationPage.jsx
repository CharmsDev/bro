import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import { BatchConfig } from '../components/steps/BatchConfig/index.jsx';
import { PageLayout } from '../components/layout/PageLayout.jsx';

export function BatchConfigurationPage() {
  const navigate = useNavigate();
  const { batch } = useStore();

  const handleNext = () => {
    if (batch.isConfigured && batch.selectedUtxos?.length > 0) {
      navigate('/mining-process');
    }
  };

  const handleBack = () => {
    navigate('/wallet-setup');
  };

  return (
    <PageLayout currentKey="batch" stepName="Batch Configuration">
      <BatchConfig />
    </PageLayout>
  );
}
