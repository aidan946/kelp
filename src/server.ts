// kelp - Server

import config from '../config.json';

import express, { Express, /* Request, Response */ } from 'express';
import * as http from 'http';
import next, { NextApiHandler } from 'next';
import * as socketio from 'socket.io';
import Room from './RoomManager/Room';
import RoomManager from './RoomManager';

const port: number = config.port || 3000;
const nextApp = next({ dev: config.devMode });
const nextHandler: NextApiHandler = nextApp.getRequestHandler();

nextApp.prepare().then(async() => {
  const Rooms = new RoomManager();

  const app: Express = express();
  const server: http.Server = http.createServer(app);
  const io: socketio.Server = new socketio.Server();
  io.attach(server);
  
  /* # Endpoints for torrent files and subtitles will be here 
  app.get('/hello', async (_: Request, res: Response) => {
      res.send('Hello World');
  });
  */

  io.on('connection', (socket: socketio.Socket) => {
    console.log('connection');

    io.emit('allRooms', Rooms.getRoomList());

    socket.on('disconnect', () => {
      console.log('client disconnected');
    });

    // Room related events
    socket.on('createRoom', (roomData: any, callback: any) => {
      // Validate room name...
      if (typeof roomData.name !== 'string') return callback({ error: 'Room name must be a string' });
      if (roomData.name.length < 1) return callback({ error: 'Room name is required' });
      if (roomData.name.length > 15) return callback({ error: 'Room name must be at most 15 characters' });

      // Validate room password if there is one...
      if (roomData.password) {
        if (typeof roomData.password !== 'string') return callback({ error: 'Room password must be a string' });
        if (roomData.password.length > 30) return callback({ error: 'Room password must be at most 30 characters' });
      }
      
      // Create room...
      const room: Room = Rooms.createRoom(roomData.name, roomData.password);
      callback({ roomId: room.id });

      io.emit('allRooms', Rooms.getRoomList());
    });

    socket.on('getRoom', (roomData: any, callback: any) => {
      const room: Room = Rooms.getRoomById(roomData.id);
      console.dir(roomData);
      if (!room) return callback({ error: 'Room does not exist' });
      if (room.hasPassword() && (!roomData.password || roomData.password === '')) return callback({ error: 'Room requires a password', passwordRequest: true });
      if (room.hasPassword() && roomData.password !== room.getPassword()) return callback({ error: 'Room password is incorrect', passwordRequest: true });
      callback({ room: room.name });
    });
  });

  app.all('*', (req: any, res: any) => nextHandler(req, res));

  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});