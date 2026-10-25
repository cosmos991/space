import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import handler from './api/comms.js';
const files={'/assets/raider-wireframe.jpg':'assets/raider-wireframe.jpg','/equipment.js':'equipment.js','/equipment-ui.js':'equipment-ui.js','/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/engine.js':'engine.js','/economy.js':'economy.js','/trading-ui.js':'trading-ui.js','/usage.js':'usage.js','/events.js':'events.js','/communications.js':'communications.js','/comms-ui.js':'comms-ui.js','/world-data.js':'world-data.js','/factions.js':'factions.js','/map-ui.js':'map-ui.js','/location-ui.js':'location-ui.js','/faction-ui.js':'faction-ui.js','/news.js':'news.js','/combat.js':'combat.js','/combat-ui.js':'combat-ui.js','/assets/nomad.jpg':'assets/nomad.jpg'};
const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',jpg:'image/jpeg'};
const root=fileURLToPath(new URL('.',import.meta.url));
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/comms'){
  let chunks=[],size=0;try{for await(const chunk of req){size+=chunk.length;if(size>20000){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}req.body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):undefined;}catch{res.writeHead(400);res.end('{"error":"Invalid JSON"}');return;}
  return handler(req,res);
 }
 const file=files[pathname];if(!file){res.writeHead(404);res.end('Not found');return;}
 try{const content=await readFile(root+file);res.writeHead(200,{'Content-Type':mime[file.split('.').at(-1)],'X-Content-Type-Options':'nosniff'});res.end(content);}catch{res.writeHead(500);res.end('Unable to load application');}
});
server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log(`ASTERION ready at http://localhost:${Number(process.env.PORT)||3000}`));
