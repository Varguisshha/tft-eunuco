from pathlib import Path
import json, hashlib
root=Path('design-exploration/f0-p6b5a2')
seeds=[('royal-pop','Royal Pop',['#373078','#8465E8','#46B9EC','#F6C454','#F4EADB']),('neon-playground','Neon Playground',['#222653','#5078F5','#C7EF60','#F56DC3','#F4F3FF']),('tropical-party','Tropical Party',['#175D70','#28C3BA','#A6E77B','#FFD166','#FF817A']),('coastal-mint','Coastal Mint',['#263E4A','#6A9E9B','#B7D4C7','#D9B675','#F3F0E7']),('soft-royal','Soft Royal',['#32364F','#7776A8','#B9B5D4','#C8AA76','#ECE9E2']),('warm-sand','Warm Sand',['#343B43','#8D9CA3','#C8A58B','#D6BF8B','#F1EAE0'])]
def rgb(c): return [int(c[i:i+2],16) for i in (1,3,5)]
def mix(a,b,t): return '#'+''.join(f'{round(x*(1-t)+y*t):02X}' for x,y in zip(rgb(a),rgb(b)))
def lum(c):
 v=[x/255 for x in rgb(c)];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v];return sum(x*y for x,y in zip(v,[.2126,.7152,.0722]))
def ratio(a,b):return (max(lum(a),lum(b))+.05)/(min(lum(a),lum(b))+.05)
def fg(bg,light,dark): return max([light,dark],key=lambda c:ratio(c,bg))
def readable(bg,light):
 for n in range(101):
  c=mix(bg,'#000000',n/100)
  if ratio(c,light)>=5: return c
 return '#000000'
palettes=[]
for slug,name,c in seeds:
 primary,border,accent,special,light=c
 if slug=='tropical-party': light=mix(special,'#FFFFFF',.91)
 dark=mix(primary,'#000000',.55);elev=mix(primary,light,.055);overlay=mix(primary,'#000000',.18)
 button=readable(border,light);hover=readable(mix(button,light,.10),light);pressed=mix(button,dark,.22)
 gold='#F6C454' if slug=='neon-playground' else special
 interaction=accent
 if slug=='warm-sand':interaction=accent
 pale=mix(border,light,.70);motif=mix(border,light,.55)
 onAccent=fg(interaction,light,dark);onPale=dark
 disabled=mix(primary,light,.20)
 token={
 'surface.primary':primary,'surface.elevated':elev,'surface.overlay':overlay,'surface.canvas':dark,'surface.paper':pale,
 'border.primary':border,'border.highlight':mix(border,light,.38),'border.frame':dark,
 'text.primary':light,'text.secondary':mix(light,primary,.15),'text.onPaper':onPale,'text.onAccent':onAccent,
 'accent.primary':interaction,'accent.secondary':c[4] if slug=='tropical-party' else special,
 'button.default':button,'button.hover':hover,'button.pressed':pressed,'button.active':interaction,'button.activeHover':mix(interaction,light,.15),'button.activePressed':mix(interaction,dark,.12),'button.disabled':disabled,'button.disabledText':mix(light,primary,.20),'button.disabledBorder':mix(primary,light,.40),
 'card.paper':light,'card.motif':motif,'card.motifInk':dark,'card.footer':primary,'card.trait':overlay,'card.text':light,'card.code':dark,
 'game.playerLifeFill':'#267264','game.rivalLifeFill':'#986035','game.life':'#70E0A3','game.enemyLife':'#FFB56F','game.mana':'#66C9ED','game.shield':'#B4DDF0','game.gold':gold,'game.cost1':'#A9B5C7','game.cost2':'#74E1CD','game.cost3':'#FFB755','game.danger':'#FF817A','game.damagePhysical':'#FFD166','game.damageMagic':'#B9A3FF','game.threshold':'#74E1CD','game.thresholdInk':'#152D2B','game.track':'#171E2B',
 'tooltip.surface':overlay,'tooltip.text':light,'result.surface':primary,'result.title':interaction,'counter.surface':overlay,'counter.text':light,
 'material.highlight':mix(border,light,.60),'material.shadow':dark,
 'phase.surface':pale,'phase.text':dark,'phase.timer':readable(border,pale),
 'emblem.surface':button,'emblem.text':light,'emblem.activeSurface':gold,'emblem.activeText':fg(gold,light,dark),
 'state.locked':interaction,'state.insufficient':'#FF817A','state.selected':interaction,
 }
 # Ensure the four interaction faces keep the same label contrast in every state.
 for key in ['button.activeHover','button.activePressed']:
  if ratio(token[key],onAccent)<4.5: token[key]=interaction
 # Boundary >=3:1 to the canvas; a light tonal edge is essential on low-saturation palettes.
 edge=token['border.highlight']
 while ratio(edge,dark)<3:edge=mix(edge,light,.10)
 token['border.highlight']=edge
 checks=[]
 def check(label,a,b,minimum=4.5): checks.append({'use':label,'foreground':a,'background':b,'ratio':round(ratio(a,b),4),'minimum':minimum,'pass':ratio(a,b)>=minimum})
 for surf in ['surface.primary','surface.elevated','surface.overlay']:
  check('Texto principal / '+surf,light,token[surf]);check('Texto secundario / '+surf,token['text.secondary'],token[surf])
 for state in ['default','hover','pressed']:check('Botón '+state,light,token['button.'+state])
 for state in ['active','activeHover','activePressed']:check('Botón '+state,onAccent,token['button.'+state])
 check('Precio de tienda',gold,primary);check('Nombre de tienda',light,primary);check('Sinergias de tienda',light,overlay);check('Temporizador',token['phase.timer'],pale);check('Ronda y clasificación',dark,pale)
 for bg in [light,motif,mix(motif,light,.15)]:check('Código / material de retrato',dark,bg)
 check('Umbral activo',token['game.thresholdInk'],token['game.threshold']);check('Emblema de sinergia',light,button,3);check('Emblema activo',token['emblem.activeText'],gold,3)
 check('Borde esencial / fondo',edge,dark,3);check('Foco / fondo',interaction,dark,3)
 for stat in ['life','enemyLife','mana','shield']:check('Barra '+stat,token['game.'+stat],token['game.track'],3)
 check('Texto auxiliar: inspector',token['text.secondary'],primary);check('Texto auxiliar: sinergias',token['text.secondary'],elev);check('Vida jugador / clasificación',token['game.playerLifeFill'],pale,3);check('Vida rival / clasificación',token['game.rivalLifeFill'],pale,3);check('Tooltip',light,overlay);check('Resultado: título',interaction,primary,3);check('Contador',light,overlay)
 # Disabled controls exempt under WCAG but measured for transparency.
 checks.append({'use':'Deshabilitado (exento)','foreground':token['button.disabledText'],'background':disabled,'ratio':round(ratio(token['button.disabledText'],disabled),4),'minimum':None,'pass':None})
 data={'slug':slug,'name':name,'colors':c,'tokens':token,'contrast':checks,'adjustments':{'buttonFrom':border,'buttonTo':button,'phaseTimer':token['phase.timer'],'paper':pale,'note':'Rampas sRGB derivadas únicamente de las cinco semillas y blanco/negro. Tropical usa coral + 91% blanco para texto; Neon reserva magenta como acento secundario y usa oro semántico común.'}}
 palettes.append(data);d=root/slug;d.mkdir(exist_ok=True)
 (d/'tokens.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 (d/'tokens.css').write_text('/* Generated from tokens.json by comparison/build-palettes.py. */\nbody[data-theme=C]{\n'+''.join('  --'+k.replace('.','-')+':'+v+';\n' for k,v in token.items())+'}\n')
 (d/'index.html').write_text(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{name} · Festival Pop</title><link rel="stylesheet" href="../shared/base.css"><link rel="stylesheet" href="../shared/palette.css"><link rel="stylesheet" href="./tokens.css"></head><body><div id="canvas"></div><script type="module" src="../shared/app.js"></script></body></html>')
(root/'shared/palettes.js').write_text('export const palettes='+json.dumps(palettes,ensure_ascii=False,indent=2)+';\n')
app=Path('design-exploration/f0-p6b5a/shared/app.js').read_text();app="import {palettes} from './palettes.js';\n"+app
app=app.replace("const theme=themes[folder]||themes['festival-pop'];", "const palette=palettes.find(p=>p.slug===folder)||palettes[0];\nconst theme={...themes['festival-pop'],colors:palette.colors,ink:'var(--border-frame)'};")
app=app.replace('stroke="#ffffff" opacity=".4"','stroke="var(--material-highlight)" opacity=".4"')
# Preserve all markup/layout/content of C, including the historical sample stamp.
(root/'shared/app.js').write_text(app)
(root/'comparison/contrast.json').write_text(json.dumps([{k:p[k] for k in ['slug','name','contrast','adjustments']} for p in palettes],ensure_ascii=False,indent=2)+'\n')
print('Generated 6 palettes,',sum(len(p['tokens']) for p in palettes),'tokens,',sum(len(p['contrast']) for p in palettes),'checks')
for p in palettes:
 print(p['name'],'FAIL:',[x['use'] for x in p['contrast'] if x['pass']==False])
