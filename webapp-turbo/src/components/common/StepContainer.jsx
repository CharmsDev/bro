// StepContainer - Common container for all steps
import './StepContainer.css';

export function StepContainer({ 
  stepNumber, 
  title, 
  description, 
  children, 
  isActive = false,
  isCompleted = false 
}) {
  return (
    <section className={`step-container ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
      <div className="step-header">
        <div className="step-number">
          {isCompleted ? '✓' : stepNumber}
        </div>
        <div className="step-info">
          <h3 className="step-title">{title}</h3>
          <p className="step-description">{description}</p>
        </div>
      </div>
      
      {isActive && (
        <div className="step-content">
          {children}
        </div>
      )}
    </section>
  );
}
