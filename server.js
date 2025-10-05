import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // Cargar .env

const app = express();

// Configurar CORS
const corsOptions = {
  origin: process.env.CLIENT_URL || "*", // usa la URL del frontend si está definida
  methods: ["GET", "POST"],
  credentials: true,
};
app.use(cors(corsOptions));

// Crear servidor HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

// === HISTORIAL GLOBAL COMPARTIDO ===
let history = [];
let undone = [];

// Conexión de sockets
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  // Enviar historial al nuevo cliente
  socket.emit("init", history);

  // Evento de dibujo
  socket.on("drawing", (data) => {
    history.push(data);
    undone = []; // Al dibujar se reinicia el stack de rehacer
    io.emit("drawing", data); // Emitir a todos
  });

  // Evento de deshacer (undo)
  socket.on("undo", () => {
    if (history.length > 0) {
      const last = history.pop();
      undone.push(last);
      io.emit("syncHistory", history);
    }
  });

  // Evento de rehacer (redo)
  socket.on("redo", () => {
    if (undone.length > 0) {
      const redoStroke = undone.pop();
      history.push(redoStroke);
      io.emit("syncHistory", history);
    }
  });

  // Evento de limpiar
  socket.on("clear", () => {
    history = [];
    undone = [];
    io.emit("clear");
  });

  // Cliente desconectado
  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

// Puerto configurable
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Servidor activo en puerto ${PORT}`);
});

