# ColdSense AI

A production-quality enterprise Cold Storage Monitoring Platform built with modern web technologies.

## Tech Stack

- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **TailwindCSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful, accessible component library
- **Framer Motion** - Production-ready animations
- **React Router** - Declarative routing
- **Zustand** - Lightweight state management
- **TanStack React Query** - Powerful data fetching
- **Chart.js** - Data visualization
- **Lucide Icons** - Beautiful icon library
- **React Hook Form** - Performant form handling
- **Zod** - Schema validation

## Features

### Core Modules
- **Dashboard** - Real-time overview of all facilities
- **Cold Storages** - Manage storage facilities
- **Monitoring** - Real-time sensor monitoring
- **Inventory** - Track inventory across facilities
- **Market Intelligence** - Market prices and trends
- **AI Insights** - AI-powered predictions
- **Reports** - Generate and view reports
- **Alerts** - System alert management
- **Orders** - Order management
- **Finance** - Financial tracking
- **Energy** - Energy consumption monitoring
- **Carbon Credits** - Carbon credit tracking
- **Product Quality** - Quality monitoring
- **Batch Traceability** - Supply chain tracking
- **Historical Analytics** - Data analysis
- **Settings** - Application settings
- **Profile** - User profile management

### Design System
- **Glassmorphism** - Modern glass effects
- **Dark/Light Mode** - Theme switching
- **Responsive Design** - Mobile-first approach
- **Premium Animations** - Smooth transitions
- **Enterprise UI** - Fortune 500 quality interface

## Project Structure

```
src/
├── assets/           # Static assets
├── components/       # Reusable components
│   ├── common/      # Shared components
│   └── ui/          # UI components (Card, Button, etc.)
├── features/        # Feature-based modules
│   ├── dashboard/
│   ├── cold-storages/
│   ├── monitoring/
│   └── ...
├── hooks/           # Custom React hooks
├── layouts/         # Layout components
│   ├── MainLayout.tsx
│   ├── Sidebar.tsx
│   ├── Topbar.tsx
│   └── BottomNav.tsx
├── lib/            # Utility libraries
├── routes/         # React Router configuration
├── services/       # API services
├── stores/         # Zustand state management
├── styles/         # Global styles
├── types/          # TypeScript types
├── utils/          # Utility functions
└── constants/      # Application constants
```

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_API_BASE_URL=https://api.coldsense.ai
VITE_WS_BASE_URL=wss://api.coldsense.ai/ws
```

## Architecture

### State Management
- **Zustand** for global state (theme, sidebar, user, notifications)
- **React Query** for server state and caching
- **React Context** for component-level state

### Routing
- **React Router** with lazy loading for optimal performance
- Protected routes for authenticated users
- Dynamic route parameters for resource access

### Data Fetching
- **TanStack Query** for API calls with caching
- Automatic refetching and background updates
- Optimistic updates for better UX

### Styling
- **TailwindCSS** for utility classes
- **CSS variables** for theming
- **Glassmorphism** effects for modern UI

## Future Enhancements

The architecture supports these upcoming features:
- AWS IoT Core integration
- MQTT real-time messaging
- WebSocket live streaming
- Camera integration
- Video widgets
- GIS maps
- Digital twin visualization
- Multi-language support
- Advanced analytics
- Predictive maintenance

## Contributing

1. Follow the existing code style
2. Use TypeScript for type safety
3. Write meaningful commit messages
4. Test your changes thoroughly
5. Update documentation as needed

## License

Proprietary - All rights reserved

## Support

For support, contact the development team.
