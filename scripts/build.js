import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js','engine.js','economy.js','trading-ui.js'])await copyFile(file,`dist/${file}`);
console.log('Static bridge built in dist/; API runs as api/comms.js on Vercel.');
