import crewPromptHandler from './api/crew-prompt.js';
import archiveHandler from './api/archive.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import imageHandler from './api/images.js';
import handler from './api/comms.js';
import exploreHandler from './api/explore.js';
const files={'/save-store.js':'save-store.js','/archive-client.js':'archive-client.js','/archive-schema.js':'archive-schema.js','/image-assets.js':'image-assets.js','/image-request.js':'image-request.js','/galaxy.js':'galaxy.js','/galaxy-gen.js':'galaxy-gen.js','/galaxy-ui.js':'galaxy-ui.js','/data-ui.js':'data-ui.js','/crew-data.js':'crew-data.js','/crew.js':'crew.js','/crew-ui.js':'crew-ui.js','/missions.js':'missions.js','/mission-ui.js':'mission-ui.js','/cargo.js':'cargo.js','/combat-effects.js':'combat-effects.js','/assets/raider-wireframe.jpg':'assets/raider-wireframe.jpg','/equipment.js':'equipment.js','/equipment-ui.js':'equipment-ui.js','/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/engine.js':'engine.js','/economy.js':'economy.js','/trading-ui.js':'trading-ui.js','/usage.js':'usage.js','/events.js':'events.js','/communications.js':'communications.js','/comms-ui.js':'comms-ui.js','/world-data.js':'world-data.js','/factions.js':'factions.js','/map-ui.js':'map-ui.js','/location-ui.js':'location-ui.js','/faction-ui.js':'faction-ui.js','/news.js':'news.js','/combat.js':'combat.js','/combat-ui.js':'combat-ui.js','/assets/nomad.jpg':'assets/nomad.jpg'};
const mime={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',jpg:'image/jpeg'};
const root=fileURLToPath(new URL('.',import.meta.url));
const server=http.createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/crew-prompt'||pathname==='/api/archive'||pathname==='/api/images'||pathname==='/api/comms'||pathname==='/api/explore'){
  let chunks=[],size=0;try{for await(const chunk of req){size+=chunk.length;if(size>(pathname==='/api/archive'?4200000:64000)){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}req.body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):undefined;}catch{res.writeHead(400);res.end('{"error":"Invalid JSON"}');return;}
  return (pathname==='/api/crew-prompt'?crewPromptHandler:pathname==='/api/archive'?archiveHandler:pathname==='/api/images'?imageHandler:pathname==='/api/explore'?exploreHandler:handler)(req,res);
 }
 const file=files[pathname];if(!file){res.writeHead(404);res.end('Not found');return;}
 try{const content=await readFile(root+file);res.writeHead(200,{'Content-Type':mime[file.split('.').at(-1)],'X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(content);}catch{res.writeHead(500);res.end('Unable to load application');}
});
server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log(`ASTERION ready at http://localhost:${Number(process.env.PORT)||3000}`));
