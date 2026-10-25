import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js','engine.js','economy.js','trading-ui.js','usage.js','events.js','communications.js','comms-ui.js','world-data.js','factions.js','map-ui.js','location-ui.js','faction-ui.js'])await copyFile(file,`dist/${file}`);
console.log('Static bridge built in dist/; API runs as api/comms.js on Vercel.');

await mkdir('dist/assets',{recursive:true});
await copyFile('assets/nomad.jpg','dist/assets/nomad.jpg');
