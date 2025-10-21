import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/index.js';
import { Mining } from '../components/steps/Mining/index.jsx';
import { PageLayout } from '../components/layout/PageLayout.jsx';

export function MiningPage() {
  const navigate = useNavigate();
  const { mining } = useStore();

  const handleNext = () => {
    if (mining.hasResult) {
      navigate('/turbomining');
    }
  };

  const handleBack = () => {
    navigate('/wallet-setup');
  };

  return (
    <PageLayout 
      currentKey="mining" 
      stepName="Mining Process"
      onNext={handleNext}
      onBack={handleBack}
    >
      <Mining />
    </PageLayout>
  );
}
