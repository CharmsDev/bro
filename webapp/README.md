# Bitcoin Mining Webapp - BRO Token

A modern Bitcoin mining and wallet management web application built with vanilla JavaScript and modular architecture.

## Project Structure

```
webapp/
├── package.json              # Dependencies and scripts
├── package-lock.json         # Locked dependency versions
├── vite.config.js           # Vite build configuration
├── .env                     # Environment variables
├── README.md                # Project documentation
├── node_modules/            # Dependencies
├── tests/                   # Test files
└── src/                     # Source code
    ├── index.html           # Main HTML file
    ├── css/                 # Modular CSS architecture
    │   ├── main.css         # Main CSS entry point
    │   ├── base/            # Base styles (variables, reset, typography)
    │   ├── layout/          # Layout components (container, header, footer)
    │   ├── components/      # UI components (buttons, cards, forms, animations)
    │   ├── sections/        # Page sections (hero, wallet, mining, etc.)
    │   └── utils/           # Utility classes (responsive, utilities)
    ├── js/                  # JavaScript entry points
    │   ├── main.js          # Application entry point
    │   └── polyfills.js     # Browser polyfills
    ├── assets/              # Static assets
    │   ├── images/          # Image files
    │   └── icons/           # Icon files
    ├── components/          # JavaScript components
    ├── services/            # Business logic services
    ├── managers/            # Application managers
    ├── controllers/         # Application controllers
    ├── store/               # State management
    ├── config/              # Configuration files
    ├── core/                # Core utilities
    └── mining/              # Mining-specific logic
```

## Architecture Features

### 🎨 **Modular CSS Architecture**
- **Base Layer**: Variables, reset styles, typography
- **Layout Layer**: Container, header, footer layouts
- **Component Layer**: Reusable UI components
- **Section Layer**: Page-specific sections
- **Utility Layer**: Helper classes and responsive design

### 🧩 **Component-Based JavaScript**
- **Services**: Business logic and API interactions
- **Components**: Reusable UI components
- **Managers**: Feature-specific management
- **Controllers**: Application flow control
- **Store**: Centralized state management

### 🛠️ **Modern Development Stack**
- **Vite**: Fast build tool and dev server
- **ES6 Modules**: Modern JavaScript module system
- **Modular Architecture**: Scalable and maintainable code structure
- **Environment Configuration**: Flexible deployment settings

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
```bash
npm install
```

### Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Features

- 🪙 **Bitcoin Wallet Creation**: Generate secure HD wallets
- ⛏️ **Proof of Work Mining**: Interactive mining demonstration
- 💰 **Transaction Creation**: Build and sign Bitcoin transactions
- 📡 **Network Broadcasting**: Broadcast transactions to Bitcoin network
- 🎯 **Token Claiming**: Claim BRO tokens based on mining results
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Environment Variables

Create a `.env` file in the root directory:

```env
VITE_BITCOIN_NETWORK=testnet4
VITE_MEMPOOL_API_URL=https://mempool.space/testnet4/api
VITE_MAINNET_MEMPOOL_API_URL=https://mempool.space/api
```

## Contributing

1. Follow the modular architecture patterns
2. Add new CSS to appropriate modular files
3. Keep JavaScript components focused and reusable
4. Update documentation for new features

## License

MIT License - see LICENSE file for details
