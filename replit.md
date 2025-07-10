# RankVed Chatbot Platform

## Overview

RankVed is a comprehensive chatbot platform that enables users to create, customize, and deploy AI-powered chatbots for websites. The application provides a complete suite of tools for chatbot management, including conversation flow design, appearance customization, lead collection, training data management, and embedding capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API for global app state
- **Data Fetching**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **API Design**: RESTful API with TypeScript
- **Authentication**: Session-based authentication (simplified for demo)
- **File Handling**: Base64 data URI storage for images and assets

### Database Design
- **Users**: Multi-tenant support with agency branding
- **Chatbots**: Configurable chatbot instances with comprehensive settings
- **Leads**: Contact information collected through chatbot interactions
- **Chat Sessions**: Conversation tracking and analytics
- **Chat Messages**: Individual message storage for conversations
- **Usage Stats**: Analytics and reporting data
- **Data Backups**: Automated backup system for data integrity

## Key Components

### 1. Chatbot Management System
- Create and configure multiple chatbots per user
- Comprehensive settings for AI behavior, appearance, and functionality
- Real-time preview functionality
- Support for different business types and use cases

### 2. Conversation Flow Designer
- Visual flow builder for question sequences
- Support for multiple question types (multiple choice, open-ended, contact forms)
- Conditional branching and AI-powered responses
- Pre-built templates for common business scenarios

### 3. Appearance Customization
- Comprehensive branding options (colors, logos, avatars)
- Multiple chat window styles and themes
- Custom messaging and welcome configurations
- Responsive design for all device types

### 4. Lead Collection System
- Smart lead collection triggered by user behavior
- GDPR-compliant consent handling
- Webhook integration for CRM systems
- Export functionality for lead data

### 5. Training Data Management
- Custom AI training data input
- URL content fetching and processing
- OpenAI integration for intelligent responses
- Content processing and summarization

### 6. Embedding System
- Multiple embed options (widget, iframe, React component)
- WordPress compatibility
- Domain security controls
- Cross-origin resource sharing (CORS) support

## Data Flow

### Chat Interaction Flow
1. User visits website with embedded chatbot
2. Chatbot loads configuration from database
3. Conversation follows predefined flow or AI responses
4. Lead collection triggered based on interaction patterns
5. All messages and analytics stored for reporting

### Configuration Management
1. User modifies chatbot settings in admin panel
2. Changes saved to PostgreSQL database
3. Real-time preview updates automatically
4. Embed code reflects new configurations immediately

### Training Data Processing
1. User inputs training content or URLs
2. Content processed through OpenAI API
3. Summarized data stored in chatbot configuration
4. AI responses enhanced with custom knowledge

## External Dependencies

### Core Services
- **OpenAI API**: GPT-4o for intelligent chat responses and content processing
- **Neon Database**: Serverless PostgreSQL hosting
- **WebSocket Support**: Real-time communication capabilities

### Development Tools
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Fast JavaScript/TypeScript bundling
- **PostCSS**: CSS processing with Tailwind
- **TypeScript**: Type safety across the entire application

### Frontend Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon system
- **React Hook Form**: Form validation and handling
- **Zod**: Runtime type validation
- **date-fns**: Date manipulation utilities

## Deployment Strategy

### Production Build Process
1. Frontend assets built with Vite optimization
2. Server code bundled with ESBuild
3. Database migrations applied automatically
4. Static assets served with appropriate caching headers

### Hosting Configuration
- **Platform**: Replit with autoscale deployment
- **Port Configuration**: 5000 (development), 80 (production)
- **Environment Variables**: DATABASE_URL, OPENAI_API_KEY
- **Process Management**: PM2 or similar for production stability

### Security Measures
- Domain-based access control for chatbot embeds
- CORS configuration for cross-origin requests
- Input validation and sanitization
- SQL injection prevention through parameterized queries

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- June 26, 2025. Initial setup
- July 8, 2025. Removed agency branding section from chatbot settings page - agency name and logo now come from user login credentials only
- July 9, 2025. Created completely separate React frontend in /frontend directory with independent build system, API configuration, and deployment-ready structure for Vercel hosting. Configured proper CORS and API connection between backend (port 5000) and frontend (port 5173). Connection tested and working.