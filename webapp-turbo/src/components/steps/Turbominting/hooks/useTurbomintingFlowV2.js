/**
 * useTurbomintingFlowV2 - Flujo lineal y síncrono de Turbominting
 * 
 * Gestiona el flujo secuencial de 4 pasos:
 * 1. Mining TX (broadcast + confirmación)
 * 2. Funding Analysis (análisis de UTXOs)
 * 3. Funding TX (si necesario)
 * 4. Minting Loop (minteo de tokens)
 * 
 * Single Source of Truth: localStorage vía TurbomintingService
 */

import { useState, useEffect, useCallback } from 'react';
import TurbomintingService from '../../../../services/turbominting/TurbomintingService.js';
import TurbominingModule from '../../../../modules/turbomining/TurbominingModule.js';

export function useTurbomintingFlowV2() {
  const [state, setState] = useState({
    step1Complete: false,
    step2Complete: false,
    step3Complete: false,
    step4Ready: false,
    currentData: null,
    error: null,
    isLoading: true
  });

  // ═══════════════════════════════════════════════════════════════
  // INICIALIZACIÓN - Cargar estado desde localStorage
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    const loadState = () => {
      try {
        // Cargar datos de turbomining
        const turbominingData = TurbominingModule.load();
        
        if (!turbominingData?.spendableOutputs?.length) {
          setState(prev => ({
            ...prev,
            error: 'No turbomining data found. Please complete Step 3 (Turbomining) first.',
            isLoading: false
          }));
          return;
        }

        // Cargar estado guardado de turbominting
        const savedData = TurbomintingService.loadV2();
        
        // Determinar estado de cada paso
        const step1Complete = savedData?.miningTxConfirmed === true;
        const step2Complete = savedData?.fundingAnalysis?.completed === true;
        
        // Step 3 completo si:
        // - No necesita funding (strategy = 'sufficient_utxos'), O
        // - Ya se hizo broadcast de funding TX
        const needsFunding = savedData?.fundingAnalysis?.strategy === 'reorganize';
        const step3Complete = !needsFunding || savedData?.fundingBroadcasted === true;
        
        // Step 4 ready si todos los anteriores están completos
        const step4Ready = step1Complete && step2Complete && step3Complete;

        setState({
          step1Complete,
          step2Complete,
          step3Complete,
          step4Ready,
          currentData: savedData,
          error: null,
          isLoading: false
        });
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: `Failed to load state: ${error.message}`,
          isLoading: false
        }));
      }
    };

    loadState();
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // STEP 1: Mining TX Complete
  // ═══════════════════════════════════════════════════════════════
  const completeStep1 = useCallback((confirmationData) => {
    TurbomintingService.completeStep1(confirmationData);
    setState(prev => ({
      ...prev,
      step1Complete: true,
      currentData: TurbomintingService.loadV2()
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // STEP 2: Funding Analysis Complete
  // ═══════════════════════════════════════════════════════════════
  const completeStep2 = useCallback((analysisResult) => {
    TurbomintingService.completeStep2(analysisResult);
    
    // Si no necesita funding, auto-completar step 3
    const needsFunding = analysisResult.strategy === 'reorganize';
    
    setState(prev => ({
      ...prev,
      step2Complete: true,
      step3Complete: !needsFunding, // Auto-complete si no necesita funding
      currentData: TurbomintingService.loadV2()
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // STEP 3: Funding TX Complete
  // ═══════════════════════════════════════════════════════════════
  const completeStep3 = useCallback((fundingTxid) => {
    TurbomintingService.completeStep3(fundingTxid);
    setState(prev => ({
      ...prev,
      step3Complete: true,
      step4Ready: true, // Ahora sí puede iniciar minting
      currentData: TurbomintingService.loadV2()
    }));
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // RE-ANÁLISIS: Cuando usuario añade más fondos
  // ═══════════════════════════════════════════════════════════════
  const handleAddMoreFunds = useCallback(async () => {
    // Resetear desde step 2
    TurbomintingService.resetFromStep2();
    
    setState(prev => ({
      ...prev,
      step2Complete: false,
      step3Complete: false,
      step4Ready: false,
      currentData: TurbomintingService.loadV2()
    }));
    
    // El re-análisis se ejecutará automáticamente cuando los hooks detecten
    // que step2Complete = false
  }, []);

  return {
    ...state,
    completeStep1,
    completeStep2,
    completeStep3,
    handleAddMoreFunds
  };
}
