# Utils Module Documentation

This directory contains the modularized components of the webapp, breaking down the previously monolithic `script.js` file into organized, maintainable modules.

## Module Structure

### Core Modules

#### `app-controller.js`
- **Purpose**: Main orchestrator that initializes and coordinates all other modules
- **Responsibilities**: 
  - Initialize global modules (AppState, CharmsWallet, etc.)
  - Set up module dependencies
  - Configure state event listeners
  - Provide public API for accessing modules

#### `dom-elements.js`
- **Purpose**: Centralized DOM element management
- **Responsibilities**:
  - Initialize and cache all DOM element references
  - Provide helper methods for common DOM operations (show, hide, setText, etc.)
  - Reduce repetitive `document.getElementById()` calls

#### `step-controller.js`
- **Purpose**: Manages the workflow steps and UI state transitions
- **Responsibilities**:
  - Enable/disable workflow steps (mining, transaction, claim tokens)
  - Update visual state indicators
  - Handle step progression logic
  - Reset application state

### Feature Modules

#### `wallet-manager.js`
- **Purpose**: Handles all wallet-related functionality
- **Responsibilities**:
  - Wallet creation and validation
  - Seed phrase management
  - Address copying utilities
  - Wallet reset functionality
  - Check for existing wallets on initialization

#### `mining-manager.js`
- **Purpose**: Manages mining operations and UI updates
- **Responsibilities**:
  - Start/stop mining operations
  - Update mining progress UI
  - Handle mining completion
  - Progress bar and hash display updates

#### `transaction-manager.js`
- **Purpose**: Handles transaction monitoring and creation
- **Responsibilities**:
  - Automatic UTXO monitoring
  - Transaction creation with OP_RETURN data
  - UTXO display and management
  - Transaction result display

#### `ui-helpers.js`
- **Purpose**: Utility functions for UI interactions
- **Responsibilities**:
  - FAQ functionality
  - Animation helpers (fadeIn, fadeOut)
  - Button state management
  - Notification system
  - Progress bar utilities

## Benefits of Modularization

### 1. **Maintainability**
- Each module has a single responsibility
- Easier to locate and fix bugs
- Cleaner code organization

### 2. **Reusability**
- Modules can be reused across different parts of the application
- Helper functions are centralized and accessible

### 3. **Testability**
- Individual modules can be unit tested
- Dependencies are clearly defined
- Easier to mock dependencies for testing

### 4. **Scalability**
- New features can be added as separate modules
- Existing modules can be extended without affecting others
- Clear separation of concerns

### 5. **Debugging**
- Easier to trace issues to specific modules
- Better error isolation
- Cleaner console logging

## Usage Example

```javascript
// Initialize the application
const appController = new AppController();
await appController.initialize();

// Access specific modules
const domElements = appController.getModule('domElements');
const walletManager = appController.getModule('walletManager');

// Use DOM helpers
domElements.setText('status', 'Ready');
domElements.show('miningDisplay');
```

## Migration Notes

The original `script.js` file (400+ lines) has been broken down into:
- `app-controller.js` (120 lines) - Main orchestrator
- `dom-elements.js` (80 lines) - DOM management
- `step-controller.js` (85 lines) - Step workflow
- `wallet-manager.js` (130 lines) - Wallet functionality
- `mining-manager.js` (100 lines) - Mining operations
- `transaction-manager.js` (140 lines) - Transaction handling
- `ui-helpers.js` (180 lines) - UI utilities

Total: ~835 lines across 7 focused modules vs 400+ lines in a single file.

## Future Enhancements

Potential areas for further modularization:
- **Error handling module**: Centralized error management
- **Configuration module**: Application settings and constants
- **Analytics module**: User interaction tracking
- **Storage module**: LocalStorage management
- **API module**: External service interactions
