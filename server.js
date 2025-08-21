// import express from 'express';
// import mongoose from 'mongoose';
// import http from 'http';
// import { Server } from 'socket.io';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import cookieParser from 'cookie-parser';

// import pollRoutes from './routes/pollRoutes.js';

// dotenv.config();

// const app = express();
// const server = http.createServer(app);
// app.use(cors({
//   origin: "https://poll-react-app-1rqr.vercel.app",
//   credentials: true
// }));
// // --- WebSocket (Socket.IO) Setup ---
// const io = new Server(server, {
//   cors: {
//     // This will be handled by the more specific CORS middleware below
//     origin: '*', 
//     methods: ["GET", "POST"],
//   },
// });

// // Make io accessible to our controllers
// app.set('socketio', io);

// // --- Database Connection ---
// // The server will exit if it can't connect to the database.
// if (!process.env.MONGO_URL) {
//   console.error('FATAL ERROR: MONGO_URL is not defined in environment variables.');
//   process.exit(1);
// }
// mongoose.connect(process.env.MONGO_URL)
//   .then(() => console.log('MongoDB connected successfully...'))
//   .catch(err => {
//     console.error('MongoDB connection error:', err);
//     process.exit(1);
//   });

// // --- Middleware ---

// // Handles CORS by allowing multiple origins from your environment variables
// // Example CLIENT_URL: https://your-frontend.com,http://localhost:5173
// const allowedOrigins = process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',') : [];
// const corsOptions = {
//   origin: (origin, callback) => {
//     // Allow requests with no origin (like Postman, mobile apps, etc.)
//     if (!origin) return callback(null, true);
    
//     if (allowedOrigins.indexOf(origin) === -1) {
//       const msg = 'The CORS policy for this site does not allow access from your origin.';
//       return callback(new Error(msg), false);
//     }
//     return callback(null, true);
//   },
//   credentials: true,
// };
// app.use(cors(corsOptions));

// app.use(express.json()); // Middleware to parse JSON bodies
// app.use(cookieParser()); // Middleware to parse cookies

// // --- API Routes ---
// // All API routes are prefixed with /api
// app.use('/api', pollRoutes);

// // --- Socket.IO Connection Logic ---
// io.on('connection', (socket) => {
//   console.log('A user connected:', socket.id);

//   socket.on('joinPoll', (pollId) => {
//     socket.join(pollId);
//     console.log(`User ${socket.id} joined poll room: ${pollId}`);
//   });

//   socket.on('disconnect', () => {
//     console.log('User disconnected:', socket.id);
//   });
// });

// // --- Server Startup ---
// const PORT = process.env.PORT || 5000;

// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
// import express from 'express';
// import mongoose from 'mongoose';
// import http from 'http';
// import { Server } from 'socket.io';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import cookieParser from 'cookie-parser';

// import pollRoutes from './routes/pollRoutes.js';

// dotenv.config();

// const app = express();
// const server = http.createServer(app);

// // --- Allowed Origins ---
// const allowedOrigins = [
//   "http://localhost:5173",                  // local dev
//   "https://poll-react-app-1rqr.vercel.app"  // deployed frontend
// ];

// app.use(
//   cors({
//     origin: function (origin, callback) {
//       // allow requests with no origin (like Postman)
//       if (!origin) return callback(null, true);
//       if (allowedOrigins.includes(origin)) {
//         return callback(null, true);
//       } else {
//         return callback(new Error("The CORS policy for this site does not allow access from your origin."));
//       }
//     },
//     credentials: true,
//   })
// );

// // --- Apply Middleware ---
// app.use(express.json());
// app.use(cookieParser());

// // --- Database Connection ---
// if (!process.env.MONGO_URL) {
//   console.error("FATAL ERROR: MONGO_URL is not defined in environment variables.");
//   process.exit(1);
// }

// mongoose
//   .connect(process.env.MONGO_URL)
//   .then(() => console.log("MongoDB connected successfully..."))
//   .catch((err) => {
//     console.error("MongoDB connection error:", err);
//     process.exit(1);
//   });

// // --- API Routes ---
// app.use("/api", pollRoutes);

// // --- WebSocket (Socket.IO) Setup ---
// const io = new Server(server, {
//   cors: {
//     origin: allowedOrigins,
//     methods: ["GET", "POST"],
//     credentials: true,
//   },
// });

// app.set("socketio", io);

// io.on("connection", (socket) => {
//   console.log("A user connected:", socket.id);

//   socket.on("joinPoll", (pollId) => {
//     socket.join(pollId);
//     console.log(`User ${socket.id} joined poll room: ${pollId}`);
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected:", socket.id);
//   });
// });

// // --- Server Startup ---
// const PORT = process.env.PORT || 5000;

// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import pollRoutes from './routes/pollRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

// --- Database Connection ---
if (!process.env.MONGO_URL) {
  console.error("FATAL ERROR: MONGO_URL is not defined in environment variables.");
  process.exit(1);
}
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected successfully..."))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// --- Middleware ---

// Use environment variables for allowed origins
const allowedOrigins = [
  "http://localhost:5173", 
  "https://poll-react-app.vercel.app"
];
// This is a simpler and more direct way to configure CORS
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// --- API Routes ---
app.use("/api", pollRoutes);

// --- WebSocket (Socket.IO) Setup ---
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("socketio", io);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinPoll", (pollId) => {
    socket.join(pollId);
    console.log(`User ${socket.id} joined poll room: ${pollId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// --- Server Startup ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});