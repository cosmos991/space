import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['image-assets.js','image-request.js','galaxy.js','galaxy-gen.js','galaxy-ui.js','index.html','style.css','app.js','engine.js','crew-data.js','crew.js','crew-ui.js','data-ui.js','missions.js','mission-ui.js','cargo.js','economy.js','trading-ui.js','usage.js','events.js','communications.js','comms-ui.js','world-data.js','factions.js','map-ui.js','location-ui.js','faction-ui.js','news.js','combat.js','combat-ui.js','combat-effects.js','equipment.js','equipment-ui.js'])await copyFile(file,`dist/${file}`);
console.log('Static bridge built in dist/; API runs as api/comms.js on Vercel.');

await mkdir('dist/assets',{recursive:true});
await copyFile('assets/nomad.jpg','dist/assets/nomad.jpg');

await copyFile('assets/raider-wireframe.jpg','dist/assets/raider-wireframe.jpg');
