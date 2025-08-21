import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import pollRoutes from './routes/pollRoutes.js';
import Poll from './models/Poll.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Set io instance on app to access in controllers
app.set('socketio', io);

// DB Connection
if (!process.env.MONGO_URI) {
  console.error('Error: MONGO_URI is not defined in environment variables.');
  process.exit(1);
}
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected...'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Middleware
const allowedOrigins = process.env.CLIENT_URL.split(',');
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// API Routes
app.use('/api', pollRoutes);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve frontend static files
const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendPath));

// SSR for Open Graph tags for poll pages
app.get('/poll/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const poll = await Poll.findById(id);

        if (!poll) {
            return res.status(404).sendFile(path.join(frontendPath, 'index.html'));
        }

        const filePath = path.join(frontendPath, 'index.html');
        fs.readFile(filePath, 'utf8', (err, htmlData) => {
            if (err) {
                console.error('Error reading index.html file:', err);
                return res.status(500).end();
            }
            // Inject meta tags
            const optionsText = poll.options.map(o => o.text).join(', ');
            let htmlWithMeta = htmlData.replace(
                '<title>Quick Poll</title>',
                `<title>${poll.question}</title>`
            );
             htmlWithMeta = htmlWithMeta.replace(
                '<meta name="description" content="A real-time polling application." />',
                `<meta name="description" content="Vote on: ${optionsText}" />
                 <meta property="og:title" content="${poll.question}" />
                 <meta property="og:description" content="Click to cast your vote anonymously!" />
                 <meta property="og:type" content="website" />
                 <meta property="og:image" content="${process.env.CLIENT_URL}/favicon.svg" />`
            );
            res.send(htmlWithMeta);
        });
    } catch (error) {
        next(); // Fallback to serving the static index.html
    }
});

// Fallback to frontend's index.html for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});


// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinPoll', (pollId) => {
    socket.join(pollId);
    console.log(`User ${socket.id} joined poll ${pollId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));