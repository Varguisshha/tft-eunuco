import {palettes} from './palettes.js';
// Isolated art-direction preview. No game imports, storage, network API or simulation.
const base = new URL('./', import.meta.url);
const asset = name => new URL('assets/'+name, base).href;
const folder = location.pathname.split('/').filter(Boolean).at(-2);
const themes = {
 'festival-tactico': {id:'A',name:'Festival Táctico',material:'Cintas tejidas · entradas troqueladas · esmalte cálido',type:'Barlow Condensed',colors:['#FF9B48','#F85E85','#61D5CC','#A98CF5','#FFF0B9'],ink:'#302348',paper:'#FFF0B9'},
 'pixel-pop-arena': {id:'B',name:'Pixel Pop Arena',material:'Cartuchos esmaltados · cantos de píxel · cierres mecánicos',type:'Silkscreen',colors:['#3578DD','#F5B642','#EC668E','#63CDB2','#393361'],ink:'#252446',paper:'#E6F2E6'},
 'festival-pop': {id:'C',name:'Festival Pop',material:'Medallones de torneo · cerámica tintada · encastres pixelados',type:'Bungee',colors:['#FFB755','#F4759E','#74E1CD','#8065CF','#292541'],ink:'#292541',paper:'#FFF1D5'}
};
const palette=palettes.find(p=>p.slug===folder)||palettes[0];
const theme={...themes['festival-pop'],colors:palette.colors,ink:'var(--border-frame)'}; document.body.dataset.theme=theme.id;
const paths={
 gold:'M8 3H24L29 9V23L24 29H8L3 23V9Z M11 8H21V24H11Z M16 11V21',
 xp:'M5 23L16 5L27 23H21L16 15L11 23Z M5 29H27',
 renew:'M26 11A11 11 0 1 0 26 23 M26 3V12H17',
 lock:'M8 14V9A8 8 0 0 1 24 9V14 M5 14H27V29H5Z M16 20V24',
 heart:'M16 28L4 17C-3 7 9 0 16 9C23 0 35 7 28 17Z',
 mana:'M16 2L27 18L23 28H9L5 18Z M16 8V21',
 attack:'M5 29L10 24 M8 17L16 25 M11 20L25 3L29 3L28 10L17 24',
 star:'M16 2L20 11L30 12L22 19L25 29L16 24L7 29L10 19L2 12L12 11Z',
 hortaleza:'M4 29V13H10V5H20V13H28V29Z M13 29V20H19V29 M14 10H16',
 padel:'M17 3C30 3 30 20 18 23L13 29L8 24L14 18C5 10 8 3 17 3Z M16 7H20 M13 11H22 M16 15H20',
 upm:'M3 12L16 3L29 12Z M6 14V25 M12 14V25 M20 14V25 M26 14V25 M2 29H30',
 predator:'M3 5L10 8L16 3L22 8L29 5L26 23L16 30L6 23Z M8 14L13 17 M24 14L19 17 M12 24H20',
 bottle:'M12 2H20V8L24 13V29H8V13L12 8Z M10 17H22 M14 5H18',
 plus:'M16 5V27 M5 16H27', close:'M7 7L25 25 M25 7L7 25', shield:'M5 4H27V17L16 29L5 17Z', book:'M4 5H13L16 8L19 5H28V27H19L16 30L13 27H4Z M16 8V29', play:'M9 4L27 16L9 28Z', stats:'M4 28V20H9V28 M14 28V12H19V28 M24 28V4H29V28'
};
const pixelPaths={
 gold:'M8 2H24V6H28V10H30V22H26V28H22V30H8V26H4V22H2V10H6V6H8Z M12 8H20V24H12Z',
 xp:'M4 26V20H8V14H12V8H16V2H20V8H24V14H28V20H30V26H22V20H18V14H16V20H12V26Z',
 renew:'M28 2V14H16V10H10V14H6V22H10V26H22V22H28V26H24V30H8V26H2V12H6V6H20V2Z',
 lock:'M6 14V6H10V2H22V6H26V14 M2 14H30V30H2Z M14 20H18V26H14Z',
 heart:'M16 30L2 16V6H6V2H12V6H20V2H26V6H30V16Z',
 mana:'M14 2H18V6H22V10H26V14H30V22H26V28H22V30H10V28H6V22H2V14H6V10H10V6H14Z',
 star:'M12 2H20V10H30V18H24V22H26V30H18V26H14V30H6V22H8V18H2V10H12Z',
 predator:'M2 2H10V6H14V2H18V6H22V2H30V18H26V24H22V28H10V24H6V18H2Z M8 12H12V16 M24 12H20V16 M12 22H20',
 padel:'M12 2H24V6H28V18H24V22H18V26H14V30H8V26H4V20H8V16H6V6H12Z M12 8H22 M12 14H22',
 hortaleza:'M2 30V14H8V2H22V14H30V30Z M12 30V22H20V30 M12 8H18V14H12Z',
 bottle:'M10 2H22V10H26V14H30V30H2V14H6V10H10Z M6 20H26 M14 6H18',
 upm:'M2 12V8H8V4H12V0H20V4H24V8H30V12Z M4 16H8V26H4Z M14 16H18V26H14Z M24 16H28V26H24Z M2 30H30'
};
const popPaths={gold:'M10 2H22L30 10V22L22 30H10L2 22V10Z M16 6L24 16L16 26L8 16Z M12 2V6H20V2',xp:'M3 22L16 9L29 22 M3 30L16 17L29 30 M12 3H20',renew:'M28 16A12 12 0 1 0 24 26 M23 2L30 9L23 16 M30 9H18',lock:'M9 14V8L14 3H19L24 8V14 M3 14H29V25L24 30H8L3 25Z M16 20V25',star:'M16 2L20 10L30 12L23 19L24 30L16 25L8 30L9 19L2 12L12 10Z'};
function icon(name,cls=''){const drawing=(theme.id==='B'?pixelPaths[name]:theme.id==='C'?popPaths[name]:null)||paths[name]||paths.star;return `<svg class="icon ${cls}" viewBox="0 0 32 32" aria-hidden="true"><path d="${drawing}"/></svg>`;}
function stars(n=1){return `<span class="stars">${Array.from({length:n},()=>icon('star')).join('')}</span>`;}
function frame(w,h,type='panel',cost=2){
 const t=theme.id,stroke=t==='B'?'#161b3c':theme.ink,fill=type==='card'?'var(--card-paper)':'var(--plate)',trim='var(--trim)';
 let shapes='';
 if(t==='A'){
 shapes=`<path d="M20 4H${w-20}Q${w-4} 4 ${w-4} 20V${h/2-13}Q${w-23} ${h/2} ${w-4} ${h/2+13}V${h-20}Q${w-4} ${h-4} ${w-20} ${h-4}H20Q4 ${h-4} 4 ${h-20}V${h/2+13}Q23 ${h/2} 4 ${h/2-13}V20Q4 4 20 4Z" fill="${stroke}"/>
 <path d="M22 10H${w-22}Q${w-10} 10 ${w-10} 22V${h/2-17}Q${w-30} ${h/2} ${w-10} ${h/2+17}V${h-23}Q${w-10} ${h-12} ${w-23} ${h-12}H23Q10 ${h-12} 10 ${h-23}V${h/2+17}Q30 ${h/2} 10 ${h/2-17}V23Q10 10 22 10Z" fill="${fill}"/>
 <path d="M25 17H${w-25}M25 ${h-20}H${w-25}" stroke="${trim}" stroke-width="3"/>
 ${Array.from({length:Math.floor((w-70)/18)},(_,i)=>`<circle cx="${35+i*18}" cy="${h-14}" r="1.5" fill="${stroke}" opacity=".35"/>`).join('')}`;
 }else if(t==='B'){
 shapes=`<path d="M16 0H${w-16}V8H${w-8}V16H${w}V${h-16}H${w-8}V${h-8}H${w-16}V${h}H16V${h-8}H8V${h-16}H0V16H8V8H16Z" fill="${stroke}"/>
 <path d="M20 6H${w-20}V14H${w-6}V${h-20}H${w-14}V${h-6}H20V${h-14}H6V20H14V14H20Z" fill="${trim}"/>
 <path d="M24 13H${w-24}V21H${w-13}V${h-25}H${w-21}V${h-15}H24V${h-22}H13V25H21V21H24Z" fill="${fill}"/>
 <path d="M25 17H${w-25}M17 26V${h-26}" stroke="#ffffff" opacity=".5" stroke-width="4"/>
 <path d="M25 ${h-11}H${w-24}L${w-11} ${h-25}V26" fill="none" stroke="#080d32" opacity=".55" stroke-width="5"/>`;
 }else{
 shapes=`<path d="M0 27L27 0H${w-35}L${w-12} 17H${w}V${h-27}L${w-27} ${h}H35L12 ${h-17}H0Z" fill="${stroke}"/>
 <path d="M7 30L30 7H${w-37}L${w-15} 23H${w-7}V${h-30}L${w-30} ${h-7}H37L15 ${h-23}H7Z" fill="${trim}"/>
 <path d="M14 33L33 14H${w-40}L${w-19} 30H${w-14}V${h-33}L${w-33} ${h-14}H40L19 ${h-30}H14Z" fill="${fill}"/>
 <path d="M33 21H${w-48}M21 38V${h-41}" stroke="var(--material-highlight)" opacity=".4" stroke-width="3"/>
 <path d="M${w-42} ${h-21}H${w-28}V${h-35}M28 21V35H14" fill="none" stroke="${stroke}" stroke-width="4"/>`;
 }
 return `<svg class="frame" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">${shapes}</svg>`;
}
function action(label,name,cost='',state='',extra=''){
 return `<button type="button" class="action ${state} ${extra}" ${state==='disabled'?'disabled':''} aria-label="${label}${cost?' · '+cost+' oro':''}">${frame(230,70,'button')}<span class="button-face">${icon(name)}<b>${label}</b>${cost!==''?`<span class="price">${icon('gold')}${cost}</span>`:''}</span></button>`;
}
const roster=[
 {name:'VARGAS',img:'vargas.png',cost:3,traits:[['upm','UPM'],['predator','El Depredador']],role:'Asesino'},
 {name:'DOLEA',img:'dolea.png',cost:2,traits:[['hortaleza','Hortaleza'],['padel','Llama de Pádel']],role:'Vanguardia'},
 {name:'K-01',img:'k01.svg',cost:1,traits:[['shield','Aleación']],role:'Vanguardia',proto:true},
 {name:'R-03',img:'r03.svg',cost:2,traits:[['shield','Aleación'],['mana','Pulso']],role:'Tirador',proto:true},
 {name:'DOLEA',img:'dolea-2.png',cost:2,traits:[['hortaleza','Hortaleza'],['padel','Llama de Pádel']],role:'Vanguardia'}
];
function card(u,index=0){return `<button class="shop-card cost-${u.cost}" aria-label="${u.name} · ${u.cost} oro" style="--i:${index}">${frame(258,231,'card',u.cost)}<div class="card-motif" aria-hidden="true"></div>${theme.id==='C'?`<span class="card-medallion">${icon('gold')}</span>`:''}<span class="card-code">${u.proto?'PROVISIONAL':u.role}</span><img class="portrait" src="${asset(u.img)}" alt="${u.name}"/><div class="card-traits">${u.traits.map(([i,n])=>`<span>${icon(i)}${n}</span>`).join('')}</div><footer><strong>${u.name}</strong><b>${icon('gold')}${u.cost}</b></footer><span class="cost-pips">${Array.from({length:u.cost},()=>'<i></i>').join('')}</span></button>`;}
function badge(name,label,num,active=false){return `<div class="trait ${active?'active':''}"><span class="trait-emblem">${icon(name)}</span><span><strong>${label}</strong><small>${active?'Nivel 1 · Activa':'Inactiva'}</small></span><b>${num}</b></div>`;}
function participants(){return `<div class="participant you">${icon('shield')}<span><b>Vargas</b><small>Tú · Jade</small></span><strong>100</strong><i></i></div><div class="participant rival">${icon('shield')}<span><b>Florin</b><small>Rival · Ámbar</small></span><strong>88</strong><i></i></div>`;}
function bench(){return `<section class="bench" aria-label="Banquillo de nueve posiciones"><div class="bench-title"><b>BANQUILLO</b><span>3 / 9</span></div><div class="bench-slots">${Array.from({length:9},(_,i)=>`<div class="bench-slot ${i<3?'occupied':''}"><span>${i+1}</span>${i<3?`<img src="${asset(roster[i].img)}" alt="${roster[i].name}"/>${stars()}`:'<i></i>'}</div>`).join('')}</div></section>`;}
// Identical calibrated point placement in all three static concepts. No new projection.
function unitLayer(){const positions=[['dolea.png',699,412,true],['r03.svg',816,447,true],['k01.svg',1021,439,true],['vargas.png',926,381,true],['vargas.png',656,539,false],['dolea.png',827,554,false],['k01.svg',969,609,false],['r03.svg',1114,552,false]];return positions.map(([img,x,y,enemy],i)=>`<div class="arena-unit ${enemy?'enemy':''}" style="left:${x/1672*100}%;top:${y/941*100}%;z-index:${Math.round(y)}"><div class="unit-bar"><i style="width:${[85,65,95,78,100,88,100,60][i]}%"></i></div><div class="unit-mana"><i style="width:${[35,40,15,5,79,70,0,15][i]}%"></i></div><img src="${asset(img)}" alt="${enemy?'Rival':'Aliado'} ${img.includes('dolea')?'DOLEA':img.includes('vargas')?'VARGAS':'provisional'}"/>${i===4?'<span class="unit-counter">R 0/5 · D 5</span>':''}</div>`).join('');}
function inspector(){return `<aside class="inspector" aria-label="Inspector de VARGAS">${frame(360,654)}<div class="inspect-top"><span>UNIDAD SELECCIONADA</span><button class="close" aria-label="Cerrar inspector">${icon('close')}</button></div><div class="inspect-identity"><img src="${asset('vargas.png')}" alt="VARGAS"/><div><h2>VARGAS</h2><p>Asesino · ${icon('gold')} 3</p>${stars()}</div></div><div class="inspect-traits">${icon('upm')} UPM ${icon('predator')} El Depredador</div><div class="vital"><span>${icon('heart')}700 / 700</span><span>${icon('mana')}55 / 70</span></div><div class="vital-bars"><i></i><i></i></div><div class="stat-row"><span>${icon('attack')}<b>110</b><small>AD</small></span><span>${icon('stats')}<b>0.96</b><small>Ataques/s</small></span><span>${icon('shield')}<b>25</b><small>Armadura</small></span></div><div class="counter"><div>${icon('bottle')}<b>Resaca Controlada</b><strong>0<span>/5</span></strong></div><div class="counter-track">${'<i></i>'.repeat(5)}</div><small>Consumo · +20 % velocidad · 3.0 s</small></div><div class="counter"><div>${icon('predator')}<b>El Depredador</b><strong>5</strong></div><div class="milestones"><span class="on">2 · Curación</span><span class="on">4 · +15 AD</span><span>6 · Salto</span></div><small>5 eliminaciones · siguiente umbral: 6</small></div><div class="ability"><b>${icon('bottle')}Copita Perhaps</b><span>Mixta · 70 maná</span></div>${action('Vender','gold','3','','sell')}<small class="sample-note">Datos ilustrativos de una traza de combate.</small></aside>`;}
function full(){document.querySelector('#canvas').innerHTML=`<main class="game-scene"><div class="arena-stage"><img class="arena-image" src="${asset('mar-de-cristal.webp')}" alt="Arena Mar de Cristal original"/>${unitLayer()}</div><div class="scene-vignette"></div><header class="top-hud"><div class="game-logo">TFT <b>EUNUCO</b></div><div class="phase"><span>RONDA <b>03</b></span><strong>PREPARACIÓN</strong><b class="time">18.4<span>s</span></b><div class="phase-progress"></div></div><div class="top-actions">${action('Iniciar partida','play','','','start')}${action('Ajustes','stats','','','secondary')}</div></header><aside class="left-rail"><div class="rail-heading">CLASIFICACIÓN</div>${participants()}<button class="record">${icon('book')}Registro de partida</button><div class="rail-heading synergy-label">SINERGIAS</div><section class="traits" aria-label="Sinergias">${badge('hortaleza','Hortaleza','1/2')}${badge('padel','Llama de Pádel','1/2')}${badge('upm','UPM','1/2')}${badge('predator','El Depredador','1/1',true)}</section></aside><div class="formation"><span>${icon('shield')}4 / 4</span>Tu formación</div>${bench()}<section class="shop-dock"><aside class="economy">${frame(246,231)}<div class="gold">${icon('gold')}<strong>52</strong><span>ORO</span></div><div class="interest">Interés previsto <b>+5</b></div><div class="level"><span>NIVEL <b>4</b></span><strong>4 / 10 XP</strong></div><div class="xp-track"><i></i></div>${action('Comprar XP','xp','4')}</aside><div class="shop-cards" aria-label="Cinco ofertas">${roster.map(card).join('')}</div><aside class="shop-controls"><div class="shop-heading">TIENDA <span>Costes 1 · 2 · 3</span></div>${action('Renovar','renew','2')}${action('Bloquear','lock')}<small>Ofertas cambian en la próxima ronda</small></aside></section><footer class="concept-stamp">${theme.id} · ${theme.name.toUpperCase()}<span>EXPLORACIÓN VISUAL · DATOS DE MUESTRA · F0-P6B.5-A</span></footer>${new URLSearchParams(location.search).has('inspector')?inspector():''}</main>`;}
function detail(){document.body.classList.add('detail');document.querySelector('#canvas').innerHTML=`<main class="component-board"><header><h1>${theme.name}</h1><p>${theme.material}</p><a href="./index.html">Ver composición completa</a></header><section class="detail-cards"><h2>Retrato, insignia y coste</h2><div>${roster.map(card).join('')}</div></section><section class="detail-states"><h2>Un control. Cinco respuestas.</h2><div>${[['Normal',''],['Hover','hover'],['Pulsado','pressed'],['Activo','active'],['Deshabilitado','disabled']].map(([s,c])=>`<div>${action('Renovar','renew','2',c)}<span>${s}</span></div>`).join('')}</div></section><section class="detail-bottom"><div class="design-swatch"><h2>Paleta y material</h2><div class="swatches">${theme.colors.map(c=>`<span><i style="background:${c}"></i><b>${c}</b></span>`).join('')}</div><p>${theme.material}</p></div><div class="icon-spec"><h2>Una familia, un gesto</h2><div>${['gold','xp','renew','lock','heart','mana','stats','star','hortaleza','padel','upm','predator','bottle'].map(i=>`<span>${icon(i)}</span>`).join('')}</div><p>Oro · XP · renovar · bloqueo · vida · maná · estadísticas<br>Hortaleza · Llama de Pádel · UPM · El Depredador</p></div><div class="type-spec"><h2>Tipografía y lectura</h2><strong class="spec-display">${theme.type}</strong><p>DOLEA / VARGAS / 52 / 18.4s</p><p>DM Sans · lectura y datos<br>La arena respira. La decisión destaca.</p><small>Fuentes SIL OFL · archivos locales</small></div></section><footer>${theme.id} · EXPLORACIÓN VISUAL · NO INTEGRADO EN EL JUEGO</footer></main>`;}
new URLSearchParams(location.search).has('detail')?detail():full();
function fit(){const canvas=document.querySelector('#canvas'),scale=Math.min(innerWidth/1920,innerHeight/1080);canvas.style.transform=`scale(${scale})`;canvas.style.left=`${Math.max(0,(innerWidth-1920*scale)/2)}px`;canvas.style.top=`${Math.max(0,(innerHeight-1080*scale)/2)}px`;}
addEventListener('resize',fit);fit();
document.querySelectorAll('.shop-card,.arena-unit').forEach(el=>el.addEventListener('click',()=>{location.search='?inspector';}));document.querySelector('.close')?.addEventListener('click',()=>{location.search='';});
