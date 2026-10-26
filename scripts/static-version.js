// Version the complete browser module graph, not only app.js.
export function versionImports(source,version){
 return source.replace(/(\bfrom\s*['"]|\bimport\s*['"]|\bimport\s*\(\s*['"])(\.{1,2}\/[^'"?]+\.js)(['"])/g,(_,prefix,path,quote)=>prefix+path+'?v='+version+quote);
}
export function versionEntry(source,version){
 return source.replace(/((?:src|href)=["'])(\/(?:app\.js|style\.css))(["'])/g,(_,prefix,path,quote)=>prefix+path+'?v='+version+quote);
}
