# VastuPlan Collaboration Server

Real-time collaboration backend for VastuPlan 2D floor plan designer.

## Features

- **Room-based Collaboration**: Users join rooms to collaborate on the same floor plan
- **Real-time Plan Sync**: Changes to rooms, walls, and elements sync instantly across clients
- **Live Cursors**: See other users' mouse positions on the canvas
- **Built-in Chat**: Communicate with collaborators in real-time
- **Auto-cleanup**: Empty rooms are automatically cleaned up after 5 minutes
- **Health Monitoring**: Built-in health check endpoint for monitoring

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Neon PostgreSQL database (free tier available)

### Installation

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your configuration
```

### Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm run build
npm start
```

The server will start on port 3001 by default.

### Environment Variables

Create a `.env` file in the `server/` directory:

```env
PORT=3001
CLIENT_URL=http://localhost:3000
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/vastuplan
JWT_SECRET=your-secret-key-here
```

## Production Deployment

### Deploy to Render

1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set the build command: `cd server && npm install && npm run build`
4. Set the start command: `cd server && npm start`
5. Add environment variables from `.env.example`
6. Add the `DATABASE_URL` with your Neon PostgreSQL connection string
7. Deploy

### Deploy to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect your GitHub repository
3. Add the `DATABASE_URL` with your Neon PostgreSQL connection string
4. Add the `JWT_SECRET` environment variable
5. Deploy

## Database Setup

The server uses Neon PostgreSQL for persistent storage.

### Create a Neon Database

1. Go to [Neon](https://neon.tech)
2. Sign up and create a new project
3. Copy the connection string (includes SSL configuration)
4. Add it to your `.env` as `DATABASE_URL`

### Run Migrations

```bash
cd server
npm run db:migrate  # Create tables
npm run db:push   # Push schema changes
```

## API Endpoints

### GET /health

Returns server health status and room statistics.

### GET /room/:roomId

Returns room information including active users.

## Socket.io Events

### Client → Server

| Event          | Data                                   | Description               |
| -------------- | -------------------------------------- | ------------------------- |
| `join-room`    | `{ roomId: string, userName: string }` | Join a collaboration room |
| `plan-update`  | `PlanUpdateEvent`                      | Broadcast a plan change   |
| `plan-sync`    | `FloorPlan`                            | Sync full plan state      |
| `cursor-move`  | `{ x: number, y: number }`             | Update cursor position    |
| `chat-message` | `string`                               | Send a chat message       |
| `undo-request` | -                                      | Request undo action       |
| `redo-request` | -                                      | Request redo action       |

### Server → Client

| Event            | Data                                        | Description                   |
| ---------------- | ------------------------------------------- | ----------------------------- |
| `room-joined`    | `{ roomId, userId, users, plan, messages }` | Successfully joined room      |
| `user-joined`    | `CollaborationUser`                         | New user joined the room      |
| `user-left`      | `{ userId }`                                | User left the room            |
| `users-updated`  | `CollaborationUser[]`                       | User list updated             |
| `plan-updated`   | `PlanUpdateEvent`                           | Another user changed the plan |
| `plan-synced`    | `{ plan, timestamp, modifiedBy }`           | Full plan was synced          |
| `cursor-moved`   | `{ userId, userName, userColor, position }` | User cursor moved             |
| `chat-message`   | `ChatMessage`                               | New chat message              |
| `undo-requested` | `{ userId, userName }`                      | Undo requested by user        |
| `redo-requested` | `{ userId, userName }`                      | Redo requested by user        |

## Architecture

```
server/
├── index.ts          # Main server with Socket.io
├── package.json      # Server dependencies
├── tsconfig.json     # TypeScript configuration
└── .env              # Environment variables (create this)
```

## Client Integration

The frontend uses the `useCollaboration` hook in `src/hooks/useCollaboration.ts` to connect to this server.

```tsx
import { useCollaboration } from './hooks/useCollaboration';

function App() {
  const { isConnected, joinRoom, leaveRoom, broadcastUpdate, users, messages, sendMessage } =
    useCollaboration(plan, onPlanChange);

  return (
    <CollaborationPanel
      isConnected={isConnected}
      joinRoom={joinRoom}
      leaveRoom={leaveRoom}
      users={users}
      messages={messages}
      sendMessage={sendMessage}
    />
  );
}
```

## Technologies

- **Express.js** - Web framework
- **Socket.io** - Real-time bidirectional communication
- **CORS** - Cross-origin resource sharing
- **TypeScript** - Type-safe server code

## License

MIT
