// Progress Grid Component - Visual representation of outputs
import { OUTPUT_STATUS, SUB_STEPS } from './constants.js';
import styles from './ProgressGrid.module.css';

export function ProgressGrid({ outputsProgress, currentOutputIndex, lastProcessedIndex, affordableOutputs }) {
  const getStatusColor = (status) => {
    switch (status) {
      case OUTPUT_STATUS.PENDING:
        // Gris pálido - esperando análisis (estado inicial)
        return 'bg-slate-700/30 border-slate-600';
      case OUTPUT_STATUS.READY:
        // Naranja - listo para mintear
        return 'bg-orange-500/20 border-orange-500';
      case OUTPUT_STATUS.PROCESSING:
        // Naranja brillante animado - procesando ahora
        return 'bg-orange-500 border-orange-400 animate-pulse shadow-sm shadow-orange-500/50';
      case OUTPUT_STATUS.COMPLETED:
        // Verde sólido - completado
        return 'bg-emerald-500 border-emerald-400';
      case OUTPUT_STATUS.FAILED:
        // Rojo - error
        return 'bg-red-500 border-red-400';
      default:
        return 'bg-slate-700/30 border-slate-600';
    }
  };

  const getSubStepIcon = (subStep) => {
    switch (subStep) {
      case SUB_STEPS.COMPOSE_PAYLOAD:
        return '📦';
      case SUB_STEPS.CALL_PROVER:
        return '🔮';
      case SUB_STEPS.SIGN_TXS:
        return '✍️';
      case SUB_STEPS.BROADCAST:
        return '📡';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Grid of small squares - fits up to 256 outputs */}
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(20px, 1fr))' }}>
        {outputsProgress.map((output) => {
          // Determine effective status based on affordability
          const isAffordable = affordableOutputs === undefined || output.index < affordableOutputs;
          const effectiveStatus = (output.status === 'ready' && !isAffordable) ? 'pending' : output.status;
          
          return (
            <div
              key={output.index}
              className={`
                relative w-5 h-5 rounded border
                flex items-center justify-center
                transition-all duration-300
                ${getStatusColor(effectiveStatus)}
                ${output.index === currentOutputIndex ? 'ring-2 ring-orange-400 scale-110' : ''}
              `}
              title={`Output #${output.index + 1} - ${isAffordable ? effectiveStatus : 'not affordable yet'}`}
            >
              {/* Animación de "burning" cuando está procesando */}
              {output.index === currentOutputIndex && output.status === OUTPUT_STATUS.PROCESSING && (
                <>
                  {/* Glow effect interno */}
                  <div className="absolute inset-0 rounded bg-orange-400 animate-pulse opacity-60"></div>
                  {/* Sparkle effect */}
                  <div className="absolute inset-0 rounded bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 animate-pulse"></div>
                  {/* Icono de fuego pequeño */}
                  <span className="relative z-10 text-[10px]">🔥</span>
                </>
              )}
              
              {/* Sub-step indicator - tiny dot */}
              {output.status === OUTPUT_STATUS.PROCESSING && output.currentSubStep && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full animate-ping"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Summary - Below grid */}
      <div className="flex flex-col gap-1 text-sm px-1">
        <span className="text-slate-400 font-medium">
          {outputsProgress.filter(o => o.status === OUTPUT_STATUS.COMPLETED).length} / {outputsProgress.length} completed
        </span>
        {currentOutputIndex !== null && (
          <span className="text-yellow-400 font-semibold">
            Processing output #{currentOutputIndex + 1}
          </span>
        )}
      </div>

      {/* Sub-steps - Always visible */}
      {(() => {
        // Show current output if processing, last processed if completed, or first output by default
        const displayIndex = currentOutputIndex !== null ? currentOutputIndex : 
                            lastProcessedIndex !== null ? lastProcessedIndex : 0;
        const current = outputsProgress[displayIndex];
        
        if (!current || outputsProgress.length === 0) return null;
        
        return (
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-600">
            <div className="text-sm text-slate-300 mb-6">
              <span className="font-semibold">Output #{displayIndex + 1}</span> - Processing Steps
            </div>
            
            {/* Horizontal step indicators with proper spacing */}
            <div className={styles.stepsContainer}>
              {Object.values(SUB_STEPS).map((step, idx) => {
                const isFailed = current.status === OUTPUT_STATUS.FAILED;
                const currentStepIndex = Object.values(SUB_STEPS).indexOf(current.currentSubStep);
                const isCompleted = currentStepIndex > idx || current.status === OUTPUT_STATUS.COMPLETED;
                const isActive = current.currentSubStep === step && current.status !== OUTPUT_STATUS.COMPLETED;
                const isPending = currentStepIndex < idx && current.status !== OUTPUT_STATUS.COMPLETED;
                
                return (
                  <div key={step} className={styles.stepWrapper}>
                    {/* Step circle */}
                    <div className={`
                      ${styles.stepCircle}
                      ${isCompleted ? styles.completed : ''}
                      ${isActive && !isFailed ? styles.active : ''}
                      ${isActive && isFailed ? styles.failed : ''}
                      ${isPending ? styles.pending : ''}
                    `}>
                      {/* Icon or spinner */}
                      {isCompleted ? (
                        <span className="text-emerald-400 text-xl font-bold">✓</span>
                      ) : isActive && !isFailed ? (
                        <div className={styles.spinner}></div>
                      ) : isActive && isFailed ? (
                        <span className="text-red-400 text-xl font-bold">✗</span>
                      ) : isPending ? (
                        <span className="text-slate-500 text-sm font-bold">{idx + 1}</span>
                      ) : null}
                    </div>
                    
                    {/* Step label */}
                    <div className={`
                      ${styles.stepLabel}
                      ${isCompleted ? styles.completed : ''}
                      ${isActive && !isFailed ? styles.active : ''}
                      ${isActive && isFailed ? styles.failed : ''}
                      ${isPending ? styles.pending : ''}
                    `}>
                      {getSubStepIcon(step)}<br/>
                      {step.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}
                    </div>
                    
                    {/* Connector line (except for last step) */}
                    {idx < Object.values(SUB_STEPS).length - 1 && (
                      <div className={`
                        ${styles.connectorLine}
                        ${isCompleted ? styles.completed : styles.pending}
                      `}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
