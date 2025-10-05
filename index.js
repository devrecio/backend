import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// === HISTORIAL GLOBAL COMPARTIDO ===
let history = [];
let undone = [];

// Cuando un cliente se conecta
io.on("connection", (socket) => {
  console.log("🟢 Cliente conectado:", socket.id);

  // Enviar historial actual al nuevo cliente
  socket.emit("init", history);

  // Cuando alguien dibuja
  socket.on("drawing", (data) => {
    history.push(data);
    undone = []; // si dibuja, se limpia el stack de redo
    io.emit("drawing", data); // retransmitir a todos
  });

  // Deshacer (undo)
  socket.on("undo", () => {
    if (history.length > 0) {
      const last = history.pop();
      undone.push(last);
      io.emit("syncHistory", history);
    }
  });

  // Rehacer (redo)
  socket.on("redo", () => {
    if (undone.length > 0) {
      const redoStroke = undone.pop();
      history.push(redoStroke);
      io.emit("syncHistory", history);
    }
  });

  // Limpiar todo
  socket.on("clear", () => {
    history = [];
    undone = [];
    io.emit("clear");
  });

  socket.on("disconnect", () => {
    console.log("🔴 Cliente desconectado:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`✅ Servidor activo en puerto ${PORT}`));
