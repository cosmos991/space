import {createHash} from 'node:crypto';
import {versionImports,versionEntry} from './static-version.js';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
const files=['upgrade-data.js','upgrades.js','upgrades-ui.js','crafting.js','crafting-ui.js','materials.js','ships-data.js','shipyard.js','shipyard-ui.js','comms-levels.js','urgent-comms.js','outcome-data.js','result-feedback.js','mission-feedback.js','personal-comms.js','officer-links.js','intro-ui.js','faction-shop.js','chart-ui.js','save-bundle.js','save-store.js','archive-client.js','archive-schema.js','image-assets.js','image-request.js','galaxy.js','galaxy-gen.js','galaxy-ui.js','index.html','style.css','app.js','engine.js','crew-data.js','crew.js','crew-ui.js','data-ui.js','missions.js','mission-ui.js','cargo.js','economy.js','trading-ui.js','usage.js','events.js','communications.js','comms-ui.js','world-data.js','factions.js','map-ui.js','location-ui.js','faction-ui.js','news.js','combat.js','combat-ui.js','combat-effects.js','equipment.js','equipment-ui.js'];
const content=await Promise.all(files.map(file=>readFile(file,'utf8')));
const version=createHash('sha256').update(JSON.stringify(content)).update(await readFile('scripts/static-version.js')).digest('hex').slice(0,16);
for(let i=0;i<files.length;i++){const file=files[i];await writeFile('dist/'+file,file.endsWith('.js')?versionImports(content[i],version):file==='index.html'?versionEntry(content[i],version):content[i]);}

console.log('Static bridge built in dist/; API runs as api/comms.js on Vercel.');

await mkdir('dist/assets',{recursive:true});
await copyFile('assets/nomad.jpg','dist/assets/nomad.jpg');

await copyFile('assets/raider-wireframe.jpg','dist/assets/raider-wireframe.jpg');

await mkdir('dist/assets/materials',{recursive:true});
for(const id of ['ore','tech','scrap','alloy','core','special','frame','mechanism','circuit','coil','armor','stable','laser'])await copyFile('assets/materials/'+id+'-v1.webp','dist/assets/materials/'+id+'-v1.webp');
