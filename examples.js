/* Generate sample JSONs with Node.js; no installation required. */
const fs=require('node:fs'),path=require('node:path');
const Templates=require('./src/templates.js');
fs.mkdirSync(path.join(__dirname,'exemplos'),{recursive:true});
for(const m of Templates.catalog){fs.writeFileSync(path.join(__dirname,'exemplos',m.id+'.json'),JSON.stringify(Templates.create(m.id),null,2));}
console.log('Cinco JSONs de exemplo atualizados.');
