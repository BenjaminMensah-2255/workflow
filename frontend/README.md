Workflow Builder App
A visual workflow automation builder that allows you to create, manage, and execute automation workflows with drag-and-drop nodes and real service integrations.

Features
🎯 Visual Workflow Builder - Drag and drop interface for creating automation workflows

🔌 Real Service Integrations - Email, SMS, Weather, GitHub, Twitter, and more

📊 Database Backed - MySQL database for persistent storage

🚀 Node.js Backend - Express.js with TypeScript

⚡ Next.js Frontend - React with TypeScript and inline styling

🔄 Real-time Execution - Execute workflows and view results

Tech Stack
Backend:

Node.js + Express.js

TypeScript

MySQL with mysql2

Nodemailer, Twilio, Twitter API, GitHub API, OpenWeather API

Frontend:

Next.js 14

React 18

TypeScript

Lucide React icons

Inline CSS styling

Quick Start
Prerequisites
Node.js 18+

MySQL 5.7+ or 8.0+

npm or yarn

1. Clone and Setup Backend
bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
Edit .env file with your database credentials:

env
PORT=3001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=workflow_builder

# Optional: Add API keys for real services
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your smtp user
# SMTP_PASSWORD= your smtp password

# TWILIO_ACCOUNT_SID=your_twilio_sid
# TWILIO_AUTH_TOKEN=your_twilio_token
# OPENWEATHER_API_KEY=your_weather_api_key
# GITHUB_TOKEN = your github token
# TWITTER_API_KEY=your-twitter-api-key
# TWITTER_API_SECRET=your-twitter-api-secret
# TWITTER_ACCESS_TOKEN=your-twitter-access-token
# TWITTER_ACCESS_SECRET=your-twitter-access-secret

2. Start Backend Server
bash
# Development mode with auto-reload
npm run dev

# Or build and start production
npm run build
npm start
The backend will start on http://localhost:3001

3. Setup Frontend
bash
# Open new terminal and navigate to frontend
cd frontend

# Install dependencies
npm install
4. Start Frontend
bash
# Development server
npm run dev
The frontend will start on http://localhost:3000

Usage
Open your browser to http://localhost:3000

Create a new workflow or use a template

Add nodes from the sidebar (Triggers, Data sources, Logic, Actions)

Connect nodes by clicking the blue dots

Configure nodes by clicking the settings icon

Execute workflow and view results

API Endpoints
GET /api/workflows - List all workflows

POST /api/workflows - Create new workflow

GET /api/workflows/:id - Get workflow details

POST /api/workflows/:id/execute - Execute workflow

GET /health - Health check and service status

Project Structure
text
backend/
├── src/
│   ├── config/     # Database configuration
│   ├── controllers/ # Route handlers
│   ├── routes/     # Express routes
│   ├── services/   # Business logic & external APIs
│   └── types/      # TypeScript interfaces
frontend/
├── app/            # Next.js app router
├── components/     # React components
└── page.tsx        # Main page
Troubleshooting
Port already in use?

bash
# Find and kill process using port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Or change port in backend/.env
PORT=3002
Database connection issues?

Verify MySQL is running

Check credentials in .env file

Ensure database workflow_builder exists

Missing dependencies?

bash
# In both backend and frontend directories
npm install
Development
Backend auto-reloads with ts-node-dev

Frontend hot-reloads with Next.js

All TypeScript errors shown in console

Database tables auto-created on first run

Production Deployment
Build both frontend and backend

Set production environment variables

Use process manager like PM2 for backend

Deploy frontend to Vercel/Netlify