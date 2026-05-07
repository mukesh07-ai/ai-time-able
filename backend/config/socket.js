const { Server } = require('socket.io');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join_timetable', (timetableId) => {
      socket.join(`timetable:${timetableId}`);
      console.log(`📡 Socket ${socket.id} joined room timetable:${timetableId}`);
    });

    socket.on('leave_timetable', (timetableId) => {
      socket.leave(`timetable:${timetableId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIo() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}

function emitToRoom(timetableId, event, data) {
  if (!io) return;
  io.to(`timetable:${timetableId}`).emit(event, data);
}

function emitToAll(event, data) {
  if (!io) return;
  io.emit(event, data);
}

module.exports = { initSocket, getIo, emitToRoom, emitToAll };
