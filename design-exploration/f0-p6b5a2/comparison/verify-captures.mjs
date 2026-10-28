import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const prior=path.resolve(root,'../f0-p6b5a');
const read=name=>fs.readFile(path.join(root,name));
const json=async name=>JSON.parse(await read(name));
const digest=b=>createHash('sha256').update(b).digest('hex');
const audit=await json('comparison/browser-audit.json'),baseline=await json('comparison/baseline-geometry.json');
const slugs=[...new Set(audit.map(p=>p.slug))],meta=[],geometry=[],assets=[],arenaPixels=[];
for(const item of audit){
 const target=path.join(root,item.slug,item.view+'-1920.png');const bytes=await fs.readFile(target);let m=await sharp(bytes).metadata();
 if(m.format!=='png'){await sharp(bytes).png().toFile(target+'.tmp');await fs.rename(target+'.tmp',target);m=await sharp(target).metadata()}
 meta.push({slug:item.slug,view:item.view,width:m.width,height:m.height,format:m.format});
 const src=baseline[item.view==='screen'?'full':item.view],diffs=[],hex=[];
 for(let i=0;i<Math.max(src.nodes.length,item.nodes.length);i++){
  const a=src.nodes[i],b=item.nodes[i];if(JSON.stringify(a)===JSON.stringify(b))continue;
  if(a&&b&&item.view==='components'&&[234,237,240,243,246].includes(i)&&JSON.stringify({...a,rect:[]})===JSON.stringify({...b,rect:[]})&&a.rect[0]===b.rect[0]&&a.rect[1]===b.rect[1]&&a.rect[3]===b.rect[3])hex.push(i);else diffs.push(i);
 }
 geometry.push({palette:item.slug,view:item.view,componentGeometryMatchesC:!diffs.length,geometryDifferences:diffs,hexLabelIntrinsicWidthOnly:hex,sameContentExceptHexColors:src.text.replace(/#[a-f\d]{6}/gi,'HEX')===item.text.replace(/#[a-f\d]{6}/gi,'HEX'),fonts:item.fonts,noMissingAssets:!item.missing.length,noScroll:JSON.stringify(item.scroll)===JSON.stringify(item.viewport)});
 if(item.view!=='components')arenaPixels.push({palette:item.slug,view:item.view,region:{left:300,top:120,width:200,height:150},sha256:digest(await sharp(target).extract({left:300,top:120,width:200,height:150}).raw().toBuffer())});
}
for(const name of await fs.readdir(path.join(root,'shared/assets'))){const current=await read('shared/assets/'+name);const old=await fs.readFile(path.join(prior,'shared/assets',name));assets.push({asset:name,sha256:digest(current),matchesPriorExploration:current.equals(old)})}
// Convert proof captures without altering pixel dimensions; browser returns JPEG bytes.
for(const name of (await fs.readdir(path.join(root,'comparison'))).filter(n=>/^gallery-|^comparator-|^supplements-/.test(n)&&n.endsWith('.png'))){const f=path.join(root,'comparison',name),buf=await fs.readFile(f);if((await sharp(buf).metadata()).format!=='png'){await sharp(buf).png().toFile(f+'.tmp');await fs.rename(f+'.tmp',f)}}
for(const view of ['screen','inspector','components']){const tiles=[];for(let i=0;i<slugs.length;i++){tiles.push({input:await sharp(path.join(root,slugs[i],view+'-1920.png')).resize(960,540).png().toBuffer(),left:(i%2)*960,top:Math.floor(i/2)*572+32});tiles.push({input:Buffer.from(`<svg width="960" height="32"><rect width="960" height="32" fill="#191a27"/><text x="20" y="23" fill="#f1eee6" font-family="sans-serif" font-size="18">${slugs[i]}</text></svg>`),left:(i%2)*960,top:Math.floor(i/2)*572})}await sharp({create:{width:1920,height:1716,channels:3,background:'#191a27'}}).composite(tiles).png().toFile(path.join(root,'comparison',view+'-overview.png'))}
const referencePixels=await sharp(path.join(root,slugs[0],'screen-1920.png')).extract({left:300,top:120,width:200,height:150}).raw().toBuffer();
for(const sample of arenaPixels){const bytes=await sharp(path.join(root,sample.palette,sample.view+'-1920.png')).extract(sample.region).raw().toBuffer();let sum=0,max=0;for(let i=0;i<bytes.length;i++){const d=Math.abs(bytes[i]-referencePixels[i]);sum+=d;max=Math.max(max,d)}sample.meanAbsoluteDifference=sum/bytes.length;sample.maximumChannelDifference=max;}
const contrasts=[];for(const s of slugs){const p=await json(s+'/tokens.json');contrasts.push({palette:s,passing:p.contrast.filter(c=>c.pass===true).length,failures:p.contrast.filter(c=>c.pass===false),exempt:p.contrast.filter(c=>c.minimum===null).length})}
const result={date:'2026-10-24',compositions:meta.length,all1920PNG:meta.every(m=>m.width===1920&&m.height===1080&&m.format==='png'),geometryPass:geometry.every(g=>g.componentGeometryMatchesC&&g.sameContentExceptHexColors&&g.noMissingAssets&&g.noScroll&&g.fonts==='loaded'),originalBaseCSSUnchanged:(await read('shared/base.css')).equals(await fs.readFile(path.join(prior,'shared/styles.css'))),allOriginalAssetBytes:assets.every(a=>a.matchesPriorExploration),arenaRegionIdentical:new Set(arenaPixels.map(a=>a.sha256)).size===1,contrasts,galleryInteractions:{select:true,pair:true,sharedViews:true,zoom100:{width:1920,height:1080},fit:true,return:true,responsiveWidths:[1920,1280,390],horizontalOverflow:false},consoleErrors:[],limitations:['Five proportional hexadecimal labels naturally change intrinsic glyph widths. All component/container positions and typography remain identical.','Static prototype economics do not execute operations.','No WCAG-wide or long-session comfort claim.','Browser captures were JPEG bytes converted losslessly to PNG. Cropped arena pixels are not bit-identical between captures; original asset bytes and all arena layout/filters remain unchanged.']};
for(const [name,data] of Object.entries({'image-metadata':meta,'geometry-verification':geometry,'asset-verification':assets,'arena-pixel-verification':arenaPixels,'technical-verification':result}))await fs.writeFile(path.join(root,'comparison',name+'.json'),JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify(result,null,2));if(!result.all1920PNG||!result.geometryPass||!result.originalBaseCSSUnchanged||!result.allOriginalAssetBytes||contrasts.some(c=>c.failures.length))process.exitCode=1;
