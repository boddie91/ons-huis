(function(){
/* ---------- spots ---------- */
const SPOTS=[
  {id:'dak',name:'Dak en goten',room:'Buiten',x:262,y:48},
  {id:'cv',name:'Zolder en cv',room:'Zolder',x:239,y:88},
  {id:'bed',name:'Bed',room:'Slaapkamer',x:136,y:194},
  {id:'kast',name:'Kledingkast',room:'Slaapkamer',x:184,y:154},
  {id:'badkamer',name:'Badkamer',room:'Badkamer',x:236,y:196},
  {id:'woonkamer',name:'Woonkamer',room:'Woonkamer',x:120,y:290},
  {id:'hal',name:'Hal en post',room:'Hal',x:196,y:314},
  {id:'kalender',name:'Kalender',room:'Hal',x:196,y:238},
  {id:'koelkast',name:'Koelkast en voorraad',room:'Keuken',x:300,y:252},
  {id:'keuken',name:'Aanrecht en kookhoek',room:'Keuken',x:252,y:290},
  {id:'kluis',name:'Kluis',room:'Geldzaken',x:372,y:296},
  {id:'afval',name:'Prullenbak',room:'Voortuin',x:121,y:350},
  {id:'tuin',name:'Tuin',room:'Buiten',x:30,y:206},
  {id:'auto',name:'Auto',room:'Oprit',x:372,y:348}
];
const SP=Object.fromEntries(SPOTS.map(s=>[s.id,s]));
const LEGACY={schoonmaak:'woonkamer',onderhoud:'dak',tuin:'tuin',auto:'auto',voorraad:'koelkast',geld:'kluis',agenda:'hal'};
const CATS=[['schoonmaak','Schoonmaak'],['opruimen','Opruimen'],['onderhoud','Onderhoud'],['voorraad','Voorraad'],['geld','Geld en papieren'],['planning','Planning'],['overig','Overig']];
const CATN=Object.fromEntries(CATS);
function catOf(t){ if(CATN[t.cat]) return t.cat; const sp=SP[t.spot]?t.spot:(LEGACY[t.zone]||''); if(sp==='kluis') return 'geld'; if(sp==='hal') return 'planning'; const n=(t.name||'').toLowerCase();
  if(/voorraad|sokken|medicijn/.test(n)) return 'voorraad'; if(/schoon|stofzuig|lappen|wassen|verschon|uitmest|harken|poets|dweil/.test(n)) return 'schoonmaak'; if(/opruim|seizoen/.test(n)) return 'opruimen'; return 'onderhoud'; }
const dateFrom=s=>{ const [y,m,d]=String(s).split('-').map(Number); return new Date(y,(m||1)-1,d||1); };
const DAY=864e5;
const S={loaded:false,connecting:false,tasks:[],shopping:[],afspraken:[],dagen:[],geregeld:{},log:[],profiles:{},hh:{},beloningen:[],gewonnen:[],swipes:[],fotos:[],meId:null,demo:false};
const LS={code:'onshuis-code',me:'onshuis-ik',weer:'onshuis-weer'};
const lsGet=k=>{ try{ return localStorage.getItem(k); }catch(_){ return null; } };
const lsSet=(k,v)=>{ try{ if(v===null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(_){ } };
const $=s=>document.querySelector(s);
const setA=(id,a,v)=>{const el=document.getElementById(id); if(el) el.setAttribute(a,v);};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const spotOf=t=>SP[t.spot]?t.spot:(LEGACY[t.zone]||'woonkamer');

/* ---------- dates ---------- */
const startOfDay=d=>{const x=new Date(d); x.setHours(0,0,0,0); return x;};
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const daysUntil=d=>Math.round((startOfDay(d)-startOfDay(new Date()))/DAY);
function isoWeek(d){ const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const n=t.getUTCDay()||7; t.setUTCDate(t.getUTCDate()+4-n); const y=new Date(Date.UTC(t.getUTCFullYear(),0,1)); return Math.ceil(((t-y)/DAY+1)/7); }
function season(d){ const m=d.getMonth()+1, day=d.getDate(), v=m*100+day; if(v>=320&&v<621) return 'lente'; if(v>=621&&v<922) return 'zomer'; if(v>=922&&v<1221) return 'herfst'; return 'winter'; }
function easter(y){ const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1; return new Date(y,mo-1,da); }
const addD=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
function nthSunday(y,m,n){ const d=new Date(y,m,1); const first=addD(d,(7-d.getDay())%7); return addD(first,7*(n-1)); }
function lastSunday(y,m){ const d=new Date(y,m+1,0); return addD(d,-d.getDay()); }
function holidays(y){
  const e=easter(y), kd=new Date(y,3,27); if(kd.getDay()===0) kd.setDate(26);
  return [
    ['Nieuwjaarsdag',new Date(y,0,1)],['Valentijnsdag',new Date(y,1,14),3,'Kaartje of attentie'],
    ['Carnaval',addD(e,-49),14,'Pakken en planning regelen'],['Goede Vrijdag',addD(e,-2)],['Pasen',e,7,'Brunch en boodschappen'],['Tweede paasdag',addD(e,1)],
    ['Zomertijd: klok vooruit',lastSunday(y,2),1,'Klokken een uur vooruit'],['Koningsdag',kd],['Bevrijdingsdag',new Date(y,4,5)],
    ['Moederdag',nthSunday(y,4,2),7,'Cadeau of kaartje'],['Hemelvaart',addD(e,39)],['Pinksteren',addD(e,49)],['Tweede pinksterdag',addD(e,50)],
    ['Vaderdag',nthSunday(y,5,3),7,'Cadeau of kaartje'],['Wintertijd: klok terug',lastSunday(y,9),1,'Klokken een uur terug'],
    ['Sint-Maarten',new Date(y,10,11),3,'Snoep in huis'],['Sinterklaas',new Date(y,11,5),21,'Cadeaus en surprises'],
    ['Kerstavond',new Date(y,11,24)],['Eerste kerstdag',new Date(y,11,25),14,'Menu en boodschappen'],['Tweede kerstdag',new Date(y,11,26)],['Oudejaarsavond',new Date(y,11,31),7,'Oliebollen en vuurwerk regelen']
  ].map(([titel,date,rem,actie])=>({key:'fd-'+titel+'-'+y,titel,date,type:'feestdag',rem:rem||0,actie:actie||'',needs:!!rem}));
}
/* all upcoming events within ~13 months */
function occurrences(yrs){
  const out=[]; yrs.forEach(yr=>holidays(yr).forEach(h=>out.push(h)));
  const dagen=S.dagen.slice();
  Object.entries(S.profiles).forEach(([id,p])=>{ if(p.verjaardag&&/^\d{4}-\d{2}-\d{2}$/.test(p.verjaardag)){ const [jj,mm,dd]=p.verjaardag.split('-').map(Number); dagen.push({id:'p-'+id,titel:p.naam||personName(id),type:'verjaardag',maand:mm,dag:dd,jaar:jj,cadeau:id!==S.meId,herinnering:14,fromProfile:true}); }});
  dagen.forEach(d=>{ yrs.forEach(yr=>{ const date=new Date(yr,(d.maand||1)-1,d.dag||1); const age=d.jaar&&d.type==='verjaardag'?yr-d.jaar:null; const jaren=d.jaar&&d.type==='jubileum'?yr-d.jaar:null;
    out.push({key:'dag-'+d.id+'-'+yr,dagId:d.id,fromProfile:d.fromProfile,titel:d.titel,date,type:d.type||'verjaardag',rem:d.cadeau?(Number(d.herinnering)||7):0,actie:d.cadeau?'Cadeau regelen':'',needs:!!d.cadeau,age,jaren}); }); });
  S.afspraken.forEach(a=>{ if(/^\d{4}-\d{2}-\d{2}$/.test(a.datum||'')){ const [jj,mm,dd]=a.datum.split('-').map(Number); if(yrs.includes(jj)) out.push({key:'af-'+a.id,afId:a.id,titel:a.titel,date:new Date(jj,mm-1,dd),type:'afspraak',rem:a.voorbereiding?3:0,actie:a.voorbereiding||'',needs:!!a.voorbereiding}); }});
  return out;
}
/* all upcoming events within ~13 months */
function events(){ const y=new Date().getFullYear(); return occurrences([y,y+1]).filter(e=>{const n=daysUntil(e.date); return n>=0&&n<=400;}).sort((a,b)=>a.date-b.date); }
/* voorbereiding: subtaken per gebeurtenis, elk met eigen termijn en eventueel een vaste persoon */
const DEFAULT_PREP={
  'Sinterklaas':[['Cadeaus kopen',21],['Surprise maken',10],['Gedichten schrijven',7],['Cadeaus inpakken',3]],
  'Eerste kerstdag':[['Kerstboom halen',18],['Kerstmenu bedenken',14],['Kerstboodschappen doen',3]],
  'Oudejaarsavond':[['Oliebollen bestellen of bakken',7],['Vuurwerk en drankjes regelen',5]],
  'Moederdag':[['Cadeau regelen',7],['Kaartje schrijven',3]],
  'Vaderdag':[['Cadeau regelen',7],['Kaartje schrijven',3]]
};
function tplKey(e){ return e.type==='feestdag'?'fd-'+e.titel:e.type==='afspraak'?'af-'+e.afId:'dag-'+e.dagId; }
const prepId=k=>k.replace(/[^A-Za-z0-9_\-.~:@+]/g,'_').slice(0,190);
function defaultPrep(e){
  if(e.type==='feestdag'){ const d=DEFAULT_PREP[e.titel]; if(d) return d.map(([titel,dagen],i)=>({id:'d'+i,titel,dagen,wie:null})); return e.rem?[{id:'a',titel:e.actie,dagen:e.rem,wie:null}]:[]; }
  return e.rem?[{id:'a',titel:e.actie,dagen:e.rem,wie:null}]:[];
}
function prepItems(e){ const doc=(D.voorbereiding||{})[prepId(tplKey(e))]; return doc&&Array.isArray(doc.items)?doc.items:defaultPrep(e); }
function isGeregeld(e,item){ return !!(S.geregeld[e.key+'|'+item.id]||(item.id==='a'&&S.geregeld[e.key])); }
function reminders(){ const out=[]; events().forEach(e=>{ const n=daysUntil(e.date); prepItems(e).forEach(it=>{ if(n<=Number(it.dagen)&&!isGeregeld(e,it)) out.push({...e,actie:it.titel,key:e.key+'|'+it.id,wie:it.wie||null,rem:Number(it.dagen),item:it}); }); }); return out.sort((a,b)=>a.date-b.date); }
async function savePrep(e,items){ return put('voorbereiding',prepId(tplKey(e)),{items}); }
const openPrep=new Set();

/* ---------- health ---------- */
const SEAS=[['lente','Lente'],['zomer','Zomer'],['herfst','Herfst'],['winter','Winter']];
const TRIG={sneeuw:'als het gesneeuwd heeft',vorst:'als er vorst op komst is',storm:'na een storm'};
function interval(t){ if(t.perSeizoen&&typeof t.perSeizoen==='object'){ const v=Number(t.perSeizoen[season(new Date())]); return Number.isFinite(v)?v:(t.everyDays||7); } return t.everyDays||7; }
function triggerOn(tr){ const m=handWeer(), f=W.flags||{}; if(tr==='sneeuw') return m==='sneeuw'||!!f.sneeuw; if(tr==='vorst') return m==='vorst'||m==='sneeuw'||!!f.vorst||!!f.sneeuw; if(tr==='storm') return m==='storm'||!!f.storm; return false; }
function isActive(t){ if(t.once) return !t.done; if(t.trigger) return triggerOn(t.trigger); return interval(t)>0; }
function fresh(t){ if(t.once){ if(t.done) return 1; if(!t.due) return .7; const n=daysUntil(dateFrom(t.due)); return n<0?.1:n>7?1:.4+.6*n/7; }
  if(t.trigger){ if(!triggerOn(t.trigger)) return 1; return t.lastDone&&ymd(new Date(t.lastDone))===ymd(new Date())?1:.15; }
  const e=interval(t); if(e<=0) return 1; if(!t.lastDone) return 0; const d=(Date.now()-new Date(t.lastDone))/DAY; return Math.max(0,Math.min(1,1-d/e)); }
function daysAgo(t){ if(!t.lastDone) return null; return Math.floor((Date.now()-new Date(t.lastDone))/DAY); }
function spotHealth(id){
  if(id==='kalender'){ return Math.max(0,1-.3*reminders().length); }
  const ts=S.tasks.filter(t=>spotOf(t)===id&&isActive(t)); if(!ts.length) return 1; return ts.reduce((a,t)=>a+fresh(t),0)/ts.length; }
function stateColor(h){ return h>=.6?css('--good'):h>=.3?css('--warn'):css('--bad'); }
function lerp(a,b,t){ t=Math.max(0,Math.min(1,t)); const p=x=>[1,3,5].map(i=>parseInt(x.slice(i,i+2),16)); const A=p(a),B=p(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); }
function ring(h,size=38,label=true){ const r=size/2-4,c=2*Math.PI*r; return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" style="flex:none"><circle class="ring-bg" cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke-width="4"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${stateColor(h)}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${c*h} ${c}" transform="rotate(-90 ${size/2} ${size/2})"/>${label?`<text class="ring-num" x="50%" y="54%" text-anchor="middle" dominant-baseline="middle">${Math.round(h*100)}</text>`:''}</svg>`; }

/* ---------- people ---------- */
function bewoners(){ return Array.isArray(S.hh.bewoners)?S.hh.bewoners.filter(b=>b&&b.id):[]; }
function personName(id){ if(!id) return null; const p=S.profiles[id]; if(p&&p.naam) return p.naam; const b=bewoners().find(x=>x.id===id); return b?b.naam:'iemand'; }
function whoBadge(id){ if(!id||!bewoners().some(b=>b.id===id)) return ''; const c=personColor(id); return ` <span class="who-badge" style="color:${c};border-color:${c}">${esc(personName(id))}</span>`; }
function whoSelect(name,cur){ return `<select name="${name}" aria-label="Voor wie" style="flex:0 1 150px"><option value="">Wie maar wil</option>${bewoners().map(b=>`<option value="${esc(b.id)}" ${b.id===cur?'selected':''}>${esc(personName(b.id))}</option>`).join('')}</select>`; }
const validWie=v=>bewoners().some(b=>b.id===v)?v:null;
function mineFilter(){ return lsGet('onshuis-filter')==='mij'; }
const forMe=w=>!mineFilter()||!w||w===S.meId;
function personColor(id){ const i=bewoners().findIndex(b=>b.id===id); return i===1?css('--p2'):css('--accent'); }

/* ---------- weather ---------- */
const WEERS=[['zon','Zonnig'],['bewolkt','Bewolkt'],['regen','Regen'],['vorst','Vorst op komst'],['sneeuw','Sneeuw'],['storm','Storm']];
const W={data:null,at:0,key:'',visual:null,flags:{},temp:null,sun:null};
try{ const c=JSON.parse(lsGet(LS.weer)||'null'); if(c&&c.data){ Object.assign(W,c); readWeather(); } }catch(_){ }
function handWeer(){ return S.hh.weerDatum===ymd(new Date())?S.hh.weer:null; }
function weerNu(){ return handWeer()||W.visual||null; }
function readWeather(){
  const j=W.data; if(!j||!j.current){ W.visual=null; W.flags={}; return; }
  const c=j.current, d=j.daily||{}, code=Number(c.weather_code), gust=Number(c.wind_gusts_10m)||0;
  const snowToday=(Number(c.snowfall)||0)>0||((d.snowfall_sum||[])[0]||0)>0||(code>=71&&code<=77)||code===85||code===86;
  const mins=(d.temperature_2m_min||[]).slice(0,2).map(Number);
  W.flags={sneeuw:snowToday,vorst:mins.some(t=>t<=0),storm:gust>=75||code>=95};
  W.visual=W.flags.storm?'storm':snowToday&&(code>=71||(Number(c.snowfall)||0)>0)?'sneeuw':(code>=51&&code<=67)||(code>=80&&code<=82)?'regen':code>=2?'bewolkt':'zon';
  W.temp=Number.isFinite(Number(c.temperature_2m))?Math.round(Number(c.temperature_2m)):null;
  const h=s=>{ const m=/T(\d\d):(\d\d)/.exec(s||''); return m?Number(m[1])+Number(m[2])/60:null; };
  const today=ymd(new Date()), idx=(d.time||[]).indexOf(today);
  W.sun=idx>=0?{op:h(d.sunrise[idx]),onder:h(d.sunset[idx])}:null;
}
async function loadWeather(force){
  const p=S.hh.plaats; if(!p||!Number.isFinite(Number(p.lat))) return;
  const key=p.lat+','+p.lon; if(!force&&W.key===key&&Date.now()-W.at<30*60e3) return;
  try{
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${Number(p.lat)}&longitude=${Number(p.lon)}&current=temperature_2m,weather_code,wind_gusts_10m,snowfall&daily=weather_code,temperature_2m_min,temperature_2m_max,snowfall_sum,sunrise,sunset&timezone=Europe%2FAmsterdam&forecast_days=3`;
    const r=await fetch(u); if(!r.ok) throw new Error('weer '+r.status);
    W.data=await r.json(); W.at=Date.now(); W.key=key; readWeather();
    lsSet(LS.weer,JSON.stringify({data:W.data,at:W.at,key:W.key}));
    rerender();
  }catch(_){ /* offline: oude gegevens blijven staan */ }
}
async function zoekPlaats(q){
  const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=nl&format=json`);
  if(!r.ok) throw new Error('zoeken mislukt'); const j=await r.json();
  return (j.results||[]).map(x=>({naam:x.name,regio:[x.admin1,x.country_code].filter(Boolean).join(', '),lat:x.latitude,lon:x.longitude}));
}

/* ---------- scene ---------- */
const SR=[8.8,8.2,7.3,7.2,6.2,5.5,5.6,6.3,7.2,8.0,7.9,8.7], SS=[16.8,17.6,18.5,20.3,21.1,21.9,21.8,21.1,20.0,18.9,17.0,16.5];
let rainBuilt=false;
function buildWeatherFx(){
  if(rainBuilt) return; rainBuilt=true;
  let r='',s='';
  for(let i=0;i<46;i++){ const x=(i*37)%430, d=(i*0.13)%0.7; r+=`<line class="rainline" x1="${x}" y1="0" x2="${x-4}" y2="12" style="animation-delay:-${d.toFixed(2)}s"/>`; }
  for(let i=0;i<40;i++){ const x=(i*53)%420, d=(i*0.37)%7, rr=1.2+(i%3)*.6; s+=`<circle class="flake" cx="${x}" cy="0" r="${rr}" style="animation-delay:-${d.toFixed(2)}s"/>`; }
  $('#rain').innerHTML=r; $('#snow').innerHTML=s;
}
function drawScene(){
  const now=new Date(), mo=now.getMonth(), hr=now.getHours()+now.getMinutes()/60, sz=season(now), weer=weerNu();
  const sr=(W.sun&&W.sun.op)||SR[mo], ss=(W.sun&&W.sun.onder)||SS[mo];
  const phase = hr<sr-.6||hr>ss+.6?'nacht':(hr<sr+.6||hr>ss-.6?'schemer':'dag');
  const grey = weer==='bewolkt'||weer==='regen'||weer==='sneeuw', dark=weer==='storm';
  let top,bot;
  if(phase==='nacht'){top='#0b1530';bot='#2b3656';}
  else if(phase==='schemer'){top=grey||dark?'#59667a':'#5a6fa8';bot=grey||dark?'#b9a7a0':'#f3b38a';}
  else if(dark){top='#5e6873';bot='#9aa3ab';}
  else if(grey){top='#9aa7b3';bot='#d9dfe3';}
  else {top=sz==='winter'?'#a9cde3':'#8fc7ea';bot='#e6f4f8';}
  setA('sky1','stop-color',top); setA('sky2','stop-color',bot);
  $('#scene').style.setProperty('--out',phase==='nacht'?.55:phase==='schemer'?.8:(dark?.8:grey?.92:1));
  setA('stars','opacity',phase==='nacht'&&!grey&&!dark?1:0);
  setA('moon','opacity',phase==='nacht'?(grey||dark?.35:1):0);
  const frac=Math.max(0,Math.min(1,(hr-sr)/(ss-sr)));
  setA('sun','cx',(40+frac*340).toFixed(1)); setA('sun','cy',(78-Math.sin(frac*Math.PI)*50).toFixed(1));
  setA('sun','opacity',phase==='nacht'?0:(grey||dark?.25:1));
  setA('clouds','opacity',weer&&weer!=='zon'?(dark?1:.92):(phase==='dag'?.55:.2));
  document.querySelectorAll('#clouds ellipse').forEach(e=>e.setAttribute('fill',dark?'#7c858e':grey?'#e9edf0':'#ffffff'));
  buildWeatherFx();
  setA('rain','opacity',weer==='regen'||weer==='storm'?1:0);
  setA('snow','opacity',weer==='sneeuw'?1:0);
  $('#bolt').style.display=weer==='storm'?'':'none';
  document.querySelectorAll('.glass').forEach(g=>g.setAttribute('fill',phase==='nacht'?'#22304d':phase==='schemer'?'#c9a9a6':'#9fcbe4'));
  setA('lamp1','opacity',phase==='dag'&&!dark?0:1); setA('lamp2','opacity',phase==='nacht'?1:0);

  const g=spotHealth('tuin');
  const lush={lente:'#6db34f',zomer:'#5fa34a',herfst:'#6c9a48',winter:'#7f9c6a'}[sz];
  setA('lawn','fill',lerp('#c2ad6c',lush,g));
  const snowy=weer==='sneeuw';
  setA('lawnsnow','opacity',snowy?.9:(weer==='vorst'||(!handWeer()&&W.flags&&W.flags.vorst))?.38:(sz==='winter'?.12:0)); setA('roofsnow','opacity',snowy?1:0);
  const crownC={lente:'#7cbf5a',zomer:'#4f9a42',herfst:'#d6893a',winter:'#000'}[sz];
  const crown=$('#crown'); crown.style.display=sz==='winter'?'none':'';
  crown.querySelectorAll('circle').forEach((c,i)=>c.setAttribute('fill',sz==='herfst'?['#d6893a','#c4552f','#e0a83c'][i]:lerp('#b28a46',crownC,Math.min(1,g*1.3))));
  $('#branches').style.display=sz==='winter'?'':'none';
  $('#blossom').innerHTML=sz==='lente'?[[14,222],[30,210],[46,226],[22,244],[52,246],[40,238],[8,250],[60,258]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="3"/>`).join(''):'';
  setA('hedge','fill',lerp('#9a8f4a',sz==='winter'?'#5e7a4c':'#4f8a3c',g));
  $('#leaves').innerHTML=sz==='herfst'?[[20,230,0],[44,240,1.6],[10,250,3.1],[56,230,2.2]].map(([x,y,d],i)=>`<ellipse class="leaf" cx="${x}" cy="${y}" rx="3.5" ry="2" fill="${['#d6893a','#c4552f','#e0a83c','#b8642c'][i]}" style="animation-delay:-${d}s"/>`).join(''):'';
  setA('leaves','opacity',sz==='herfst'?1:0);
  setA('weeds','opacity',(sz==='winter'?.4:1)*(1-g));
  const bloom=sz==='winter'?0:sz==='herfst'?.5:1;
  const petal=lerp('#8a6a4a','#e8618c',g*bloom), petal2=lerp('#8a6a4a','#f2b53a',g*bloom), stem=lerp('#8a7a4a','#4f8a3c',g);
  const fx=[90,104,118,132,146,160,224,240,256,272,288,304];
  $('#flowers').innerHTML=fx.map((x,i)=>{ const hgt=(sz==='winter'?3:6+9*g), dr=(1-g)*5*(i%2?1:-1); return `<path d="M${x} 336 q${dr/2} ${-hgt/2} ${dr} ${-hgt}" stroke="${stem}" stroke-width="2" fill="none"/>${sz==='winter'?'':`<circle cx="${x+dr}" cy="${336-hgt}" r="${2+2.5*g*bloom}" fill="${i%2?petal2:petal}"/>`}`; }).join('');

  const d=spotHealth('dak'); setA('moss','opacity',Math.max(0,1-d*1.4)); setA('gleaves','opacity',Math.max(0,1-d*1.6)); setA('drips','opacity',d<.35?1:0);
  const cv=spotHealth('cv'), cl=$('#cvlight'); cl.setAttribute('fill',cv>=.6?'#5fd17a':cv>=.3?'#f0b84a':'#e5533f'); cl.classList.toggle('blink',cv<.3);
  const b=spotHealth('bed'); setA('rumple','opacity',Math.max(0,1-b*1.4)); setA('floormess','opacity',b<.35?1:0); setA('duvet','fill',lerp('#9a8f86','#7fa6d6',b));
  const k=spotHealth('kast'); setA('kastmess','opacity',Math.max(0,1-k*1.5));
  const ba=spotHealth('badkamer'); setA('bathgrime','opacity',Math.max(0,Math.min(1,1-ba*1.3)).toFixed(2)); setA('bathspark','opacity',ba>.75?(ba-.75)*4:0);
  const w=spotHealth('woonkamer'); setA('dust','opacity',Math.max(0,1-w*1.4)); setA('webwk','opacity',Math.max(0,1-w*1.8)); setA('wingrime','opacity',Math.max(0,.8-w));
  const h=spotHealth('hal'); setA('postpile','opacity',h<.5?1:0); setA('letters','opacity',h<.4?1:0);
  const rem=reminders(); setA('calbadge','opacity',rem.length?1:0); $('#calnum').textContent=now.getDate();
  const soon=events().some(e=>e.type!=='feestdag'&&daysUntil(e.date)<=3);
  setA('flag','transform',soon?'':'rotate(90 175.5 337)');
  const ko=spotHealth('koelkast'); setA('fridgenote','opacity',S.shopping.some(i=>!i.done)||ko<.4?1:0); setA('fridgenote','fill',ko<.3?'#e5735f':'#f2d35e');
  const ke=spotHealth('keuken'); $('#dishes').innerHTML=dishesSvg(1-ke); setA('grease','opacity',Math.max(0,1-ke*1.5));
  setA('toiletdirt','opacity',Math.max(0,Math.min(1,(.6-ba)*2.2)).toFixed(2));
  const af=spotHealth('afval');
  setA('over1','opacity',af<.45?1:0); setA('over2','opacity',af<.3?1:0); setA('bags','opacity',af<.2?1:0);
  setA('lid1','transform',af<.45?'rotate(-24 98.5 358)':''); setA('lid2','transform',af<.3?'rotate(-18 122.5 358)':'');
  const m=spotHealth('kluis'); setA('vaultglow','opacity',m>.6?((m-.6)*1.1).toFixed(2):0); setA('cobweb','opacity',Math.max(0,1-m*1.6));
  const a=spotHealth('auto'); setA('carmud','opacity',Math.max(0,Math.min(1,.95-a*1.1)).toFixed(2)); setA('carshine','opacity',a>.7?1:0);
  setA('carwindirt','opacity',a<.6?Math.min(1,(.6-a)*2.5).toFixed(2):0); setA('hubloose','opacity',a<.4?1:0); setA('hub2','opacity',a<.4?0:1); setA('hoodopen','opacity',a<.25?1:0);
  $('#markers').innerHTML=SPOTS.map(s=>{ const v=spotHealth(s.id); if(v<.3) return `<circle cx="${s.x}" cy="${s.y}" r="5" fill="none" stroke="#e5533f" stroke-width="2" class="pulse"/><circle cx="${s.x}" cy="${s.y}" r="3.2" fill="#e5533f"/>`; return ''; }).join('');
  // vuil en glans
  let fxs='';
  const dirtAt={keuken:[257,284,ke],badkamer:[296,200,ba],afval:[121,352,af],koelkast:[300,250,ko]};
  Object.entries(dirtAt).forEach(([id,[x,y,v]])=>{ if(v<.45) fxs+=stinkSvg(x,y,v); if(v<.32) fxs+=fliesSvg(x,y-6,v<.15?5:3,id); });
  SPOTS.forEach(s=>{ const v=spotHealth(s.id); if(s.id==='kalender') return; const g=GLINT_AT[s.id]||[s.x,s.y,14]; if(v>=.97) fxs+=glitterSvg(g[0],g[1],g[2],6,s.id); else if(v>=.85) fxs+=glitterSvg(g[0],g[1],g[2]*.6,2,s.id); });
  $('#fx').innerHTML=fxs;
  // whole house mood
  const all=SPOTS.reduce((acc,s)=>acc+spotHealth(s.id),0)/SPOTS.length;
  setA('houseshade','opacity',all<.55?((.55-all)*.9).toFixed(2):0);
  setA('smoke','opacity',all>.6?1:0);
  setA('bunting','opacity',all>.8?1:0);
  $('#houseglitter').innerHTML=all>=.95?glitterSvg(200,190,120,18,'huis')+`<path class="shine" d="M70 334 Q200 150 330 334" stroke="url(#rainbowg)" stroke-width="7" fill="none"/>`:'';
  if(!$('#flags').innerHTML){ const cols=['#e8618c','#f2b53a','#4f8a3c','#3f78b5','#d9703f']; let f=''; for(let i=0;i<11;i++){ const x=94+i*20.5, t=(x-84)/232, y=139+4*13*t*(1-t)*0.9; f+=`<path d="M${x-5} ${y} L${x+5} ${y} L${x} ${y+9}Z" fill="${cols[i%5]}"/>`; } $('#flags').innerHTML=f; }
}

/* ---------- vuil en glans ---------- */
const GLINT_AT={dak:[200,96,40],cv:[239,108,16],bed:[130,208,22],kast:[184,190,16],badkamer:[262,196,30],woonkamer:[124,300,28],hal:[196,300,14],koelkast:[300,290,14],keuken:[252,292,22],kluis:[372,312,16],tuin:[60,330,40],auto:[376,370,30],afval:[121,372,18]};
function seeded(i,salt){ let h=2166136261; for(const c of salt+':'+i){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return (h>>>0)/4294967295; }
function glitterSvg(x,y,r,n,salt){ let s=''; for(let i=0;i<n;i++){ const a=seeded(i,salt+'a')*Math.PI*2, rr=r*(.25+.75*seeded(i,salt+'r')), px=(x+Math.cos(a)*rr).toFixed(1), py=(y+Math.sin(a)*rr*.75).toFixed(1), k=1.4+seeded(i,salt+'k')*2.2, d=(seeded(i,salt+'d')*1.8).toFixed(2);
  s+=`<path class="glint" style="animation-delay:-${d}s" d="M${px} ${py-k*2}L${+px+k*.45} ${py-k*.45}L${+px+k*2} ${py}L${+px+k*.45} ${+py+k*.45}L${px} ${+py+k*2}L${px-k*.45} ${+py+k*.45}L${px-k*2} ${py}L${px-k*.45} ${py-k*.45}Z" fill="#fffbe6" stroke="#f0c94a" stroke-width=".5"/>`; } return s; }
function fliesSvg(x,y,n,salt){ let s=''; for(let i=0;i<n;i++){ const dx=((seeded(i,salt+'x')-.5)*16).toFixed(1), dy=(-seeded(i,salt+'y')*10).toFixed(1);
  s+=`<g transform="translate(${x+ +dx} ${y+ +dy})"><g class="fly f${i%3+1}" style="animation-delay:-${(i*.37).toFixed(2)}s"><ellipse class="wing" cx="-1.7" cy="-1.8" rx="2" ry="1.2" fill="#e4edf2" stroke="#9aa5ab" stroke-width=".3"/><ellipse class="wing" cx="1.7" cy="-1.8" rx="2" ry="1.2" fill="#e4edf2" stroke="#9aa5ab" stroke-width=".3"/><ellipse rx="2.1" ry="1.5" fill="#1c1f22"/></g></g>`; } return s; }
function stinkSvg(x,y,v){ const op=Math.min(1,(.45-v)*3+.3).toFixed(2); return [0,1,2].map(i=>`<path class="stink" style="animation-delay:${(i*.8).toFixed(1)}s;opacity:${op}" d="M${x-6+i*6} ${y} q2.5 -3 0 -6 t0 -6" stroke="#8a9a3c" stroke-width="1.3" fill="none" stroke-linecap="round"/>`).join(''); }
function dishesSvg(dirt){ const n=Math.round(dirt*9); if(!n) return ''; const plate=lerp('#f6f6f2','#d6c7a6',dirt), rim=lerp('#b9bec2','#8c7a58',dirt); let s='';
  if(dirt>.45) s+=`<ellipse cx="240" cy="296" rx="8" ry="2.4" fill="#3b3f43"/><path d="M232 295 h-7" stroke="#3b3f43" stroke-width="2" stroke-linecap="round"/><ellipse cx="240" cy="295.4" rx="5" ry="1.2" fill="#8a4a24"/>`;
  for(let i=0;i<n;i++){ const cx=257+((i*3)%5-2)*.8, cy=296-i*2.4; s+=`<ellipse cx="${cx}" cy="${cy}" rx="8.5" ry="1.9" fill="${plate}" stroke="${rim}" stroke-width=".8"/>`;
    if(dirt>.3&&i%2===0) s+=`<ellipse cx="${cx-3+(i%3)*2.5}" cy="${cy-.4}" rx="2.2" ry=".8" fill="${i%4?'#b5652d':'#c9a227'}"/>`; }
  if(dirt>.6) s+=`<rect x="268" y="287" width="4.5" height="9" rx="1" fill="#cfe2ea" stroke="#9fb3bc" stroke-width=".6"/><rect x="268.5" y="292" width="3.5" height="3.6" fill="#9a7a3a" opacity=".7"/><rect x="274" y="289" width="4" height="7" rx="1" fill="#cfe2ea" stroke="#9fb3bc" stroke-width=".6"/>`;
  if(dirt>.75) s+=`<path d="M244 303 q1 4 0 7 M262 303 q-1 3 1 9 M278 303 q1 2 0 5" stroke="#8a5a2a" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="252" cy="326" rx="6" ry="1.2" fill="#8a5a2a" opacity=".6"/>`;
  return s; }

/* ---------- points ---------- */
function clampPts(v,dflt){ const n=Math.round(Number(v)); return Number.isFinite(n)&&String(v).trim()!==''?Math.max(0,Math.min(500,n)):dflt; }
function ptsOf(t){ if(t.punten!==null&&t.punten!==undefined&&t.punten!==''&&Number.isFinite(Number(t.punten))) return Number(t.punten); if(t.once) return 10; if(t.trigger) return 15; const e=t.everyDays||7; return e<=3?5:e<=7?10:e<=30?15:e<=90?20:30; }
const lp=l=>Number.isFinite(Number(l.punten))&&l.punten!==null?Number(l.punten):10;
function cfg(){ const a=Number(S.hh.minAandeel); return {samen:Number(S.hh.drempelSamen)||200,solo:Number(S.hh.drempelSolo)||100,aandeel:Number.isFinite(a)&&S.hh.minAandeel!==undefined&&S.hh.minAandeel!==''?a:30}; }
function people(){ return bewoners().map(b=>b.id); }
function pots(){
  const c=cfg(), ids=people();
  const earned=id=>S.log.filter(l=>l.by===id).reduce((a,l)=>a+lp(l),0);
  const solo={}; ids.forEach(id=>{ solo[id]=earned(id)-S.gewonnen.filter(g=>g.soort==='solo'&&g.wie===id).reduce((a,g)=>a+(Number(g.kosten)||0),0); });
  const totalAll=S.log.reduce((a,l)=>a+lp(l),0);
  const samenBal=totalAll-S.gewonnen.filter(g=>g.soort==='samen').reduce((a,g)=>a+(Number(g.kosten)||0),0);
  const last=S.gewonnen.filter(g=>g.soort==='samen').map(g=>g.at).sort().pop()||'';
  const share={}; ids.forEach(id=>{ share[id]=S.log.filter(l=>l.by===id&&(l.at||'')>last).reduce((a,l)=>a+lp(l),0); });
  const need=Math.ceil(c.samen*c.aandeel/100);
  const short=ids.filter(id=>share[id]<need);
  const samenReady=samenBal>=c.samen&&ids.length>=2&&short.length===0;
  return {c,ids,solo,samenBal,share,need,short,samenReady};
}
function poolFor(soort,id){ return S.beloningen.filter(b=>b.actief!==false&&(soort==='samen'?b.soort==='samen':(b.soort==='solo'&&(b.voor==='iedereen'||b.voor===id)))); }
let spinning=false, spinView=null;
async function spin(soort){
  if(spinning) return; const P=pots(); const me=S.meId;
  if(soort==='samen'&&!P.samenReady) return; if(soort==='solo'&&P.solo[me]<P.c.solo) return;
  const pool=poolFor(soort,me); if(!pool.length) return;
  spinning=true; const pick=pool[Math.floor(Math.random()*pool.length)];
  const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  spinView={soort,text:pool[0].titel,done:false}; renderRewards();
  let i=0; const steps=reduce?1:18;
  await new Promise(res=>{ const tick=()=>{ i++; if(i>=steps){ res(); return; } spinView.text=pool[i%pool.length].titel; const el=document.getElementById('spin-t'); if(el) el.textContent=spinView.text; setTimeout(tick,60+i*12); }; tick(); });
  spinView={soort,text:pick.titel,done:true};
  try{
    await put('gewonnen',uid(),{soort,wie:soort==='solo'?me:null,titel:pick.titel,beloningId:pick.id,kosten:soort==='samen'?P.c.samen:P.c.solo,at:new Date().toISOString(),door:me,verzilverd:false});
    if(!pick.herhalend) await put('beloningen',pick.id,{actief:false},true);
  }catch(e){ safe(Promise.reject(e)); spinView=null; }
  spinning=false; renderRewards();
}
function renderRewards(){
  const P=pots(), c=P.c, me=S.meId;
  const sharePct=id=>Math.min(100,P.share[id]/c.samen*100);
  const samenPool=poolFor('samen',me).length, soloPool=poolFor('solo',me).length;
  const shortTxt=P.ids.length<2?'Zodra jullie allebei punten verdienen, telt de gezamenlijke pot.':P.short.length?P.short.map(id=>`${esc(personName(id))} nog ${P.need-P.share[id]}`).join(' · ')+` punten voor een eerlijk aandeel`:'Allebei genoeg bijgedragen';
  const st=swipeState();
  const samenBtn=samenPool<2?`<button class="btn ghost small" data-v="punten">Zet gezamenlijke ideeën op de lijst om te swipen</button>`
    :`<button class="btn${st.match&&P.samenReady?'':' ghost'}" data-openswipe="1">${st.match?(P.samenReady?'Match! Bekijk en verzilver':'Er is een match, pot nog niet vol'):(st.remaining.length?`Swipe gezamenlijke wensen (${st.remaining.length} te gaan)`:'Swipen: wachten op je partner')}</button>`;
  const soloRows=P.ids.map(id=>{ const bal=Math.max(0,P.solo[id]); const ready=bal>=c.solo; return `<div class="pot"><div class="pot-head"><b><i class="dot" style="background:${personColor(id)}"></i>${esc(id===me?'Jouw pot':'Pot van '+personName(id))}</b><span class="pts">${bal} / ${c.solo}</span></div>
    <div class="bar"><span style="width:${Math.min(100,bal/c.solo*100)}%;background:${personColor(id)}"></span></div>
    ${id===me&&ready?(soloPool?`<div><button class="btn" data-spin="solo">Draai jouw rad</button></div>`:`<div><button class="btn ghost small" data-v="punten" data-goto="rw-settings">Voeg eerst een beloning voor jezelf toe</button></div>`):''}</div>`; }).join('');
  const open=S.gewonnen.filter(g=>!g.verzilverd&&(g.soort==='samen'||g.wie===me)).sort((a,b)=>(b.at||'').localeCompare(a.at||''));
  const ws=weekStart(), wk=S.log.filter(l=>new Date(l.at)>=ws), wkPts=wk.reduce((a,l)=>a+lp(l),0);
  $('#samen').innerHTML=`<div class="samen-head"><h2>Punten en beloningen</h2><span class="pts">deze week ${wk.length} taken · ${wkPts} punten</span></div>
    ${spinView?`<div class="spin" aria-live="polite"><span class="eyebrow">${spinView.soort==='samen'?'Samen gewonnen':'Jij hebt gewonnen'}</span><span class="spin-t" id="spin-t">${esc(spinView.text)}</span>${spinView.done?`<div><button class="btn ghost small" data-spinclose="1">Mooi!</button></div>`:''}</div>`:''}
    <div class="pot"><div class="pot-head"><b>Gezamenlijke pot</b><span class="pts">${Math.max(0,P.samenBal)} / ${c.samen}</span></div>
      <div class="bar">${P.ids.map(id=>`<span style="width:${sharePct(id)}%;background:${personColor(id)}"></span>`).join('')}${P.ids.length>1?`<i class="mark" style="left:${Math.min(100,c.aandeel)}%" title="minimaal aandeel"></i>`:''}</div>
      <div class="legend">${P.ids.map(id=>`<span><i class="dot" style="background:${personColor(id)}"></i>${esc(personName(id))} ${P.share[id]}</span>`).join('')}<span>${shortTxt}</span></div>
      ${samenBtn?`<div>${samenBtn}</div>`:''}</div>
    ${soloRows}
    ${open.length?`<div class="pot"><b style="font-family:var(--f-display)">Nog te verzilveren</b><ul class="win-list">${open.map(g=>`<li><input type="checkbox" data-redeem="${g.id}" aria-label="Verzilverd"><span>${esc(g.titel)} <span class="muted">· ${g.soort==='samen'?'samen':'voor jou'} · ${new Date(g.at).toLocaleDateString('nl-NL',{day:'numeric',month:'short'})}</span></span></li>`).join('')}</ul></div>`:''}
    <div><button class="askbtn" data-goto="rw-settings">Beloningen en spelregels beheren</button></div>`;
}
function renderRewardSettings(){
  const c=cfg(); ['c-samen','c-aandeel','c-solo'].forEach((id,i)=>{ const el=$('#'+id); if(document.activeElement!==el) el.value=[c.samen,c.aandeel,c.solo][i]; });
  const others=people().filter(id=>id!==S.meId);
  const sel=$('#rw-voor'), cur=sel.value;
  sel.innerHTML=`<option value="samen">Samen (allebei bijdragen)</option><option value="iedereen">Voor ieder van ons, apart</option><option value="${esc(S.meId)}">Alleen voor mij</option>${others.map(id=>`<option value="${esc(id)}">Alleen voor ${esc(personName(id))}</option>`).join('')}`;
  if(cur) sel.value=cur;
  const lbl=b=>b.soort==='samen'?'samen':b.voor==='iedereen'?'ieder apart':b.voor===S.meId?'voor mij':'voor '+personName(b.voor);
  const list=S.beloningen.slice().sort((a,b)=>(a.soort||'').localeCompare(b.soort||'')||(a.titel||'').localeCompare(b.titel||''));
  $('#rw-list').innerHTML=list.length?`<ul class="list">${list.map(b=>`<li><span>${esc(b.titel)} <span class="muted">· ${esc(lbl(b))} · ${b.herhalend?'terugkerend':(b.actief===false?'al gewonnen':'eenmalig')}</span></span>${b.actief===false?`<button class="btn ghost small" data-rwrevive="${b.id}">Weer aanzetten</button>`:''}<button class="btn ghost small" data-rwdel="${b.id}">Weg</button></li>`).join('')}</ul>`:'<div class="empty">Nog geen beloningen. Voeg er een paar toe; bij het draaien kiest het rad er willekeurig een uit.</div>';
  const SUG=['Ontbijt op bed','Samen uit eten','Uitslapen in het weekend','Filmavond met snacks','Een avond vrij van taken','Massage','Dagje weg','Bloemen'];
  $('#rw-sugg').innerHTML=SUG.filter(t=>!S.beloningen.some(b=>b.titel===t)).map(t=>`<button data-rwsug="${esc(t)}">+ ${esc(t)}</button>`).join('');
}
async function addReward(titel,voor,herhalend){ return put('beloningen',uid(),{titel:String(titel).slice(0,120),soort:voor==='samen'?'samen':'solo',voor:voor==='samen'?null:voor,herhalend:!!herhalend,actief:true,by:S.meId,at:new Date().toISOString()}); }

/* ---------- swipe ---------- */
function samenRound(){ return S.gewonnen.filter(g=>g.soort==='samen').length; }
function hashStr(x){ let h=2166136261; for(const c of String(x)){ h^=c.charCodeAt(0); h=Math.imul(h,16777619); } return h>>>0; }
function swipeState(){
  const round=samenRound(), me=S.meId, ids=people();
  const cands=poolFor('samen',me).slice().sort((a,b)=>a.id.localeCompare(b.id));
  const docs=S.swipes.filter(x=>x.round===round);
  const mine=docs.find(d=>d.by===me)||{likes:[],nos:[]};
  const seen=new Set([...(mine.likes||[]),...(mine.nos||[])]);
  const remaining=cands.filter(c=>!seen.has(c.id)).sort((a,b)=>hashStr(me+round+a.id)-hashStr(me+round+b.id));
  const others=ids.filter(id=>id!==me);
  const likedByAll=ids.length>=2?cands.filter(c=>ids.every(id=>{ const d=docs.find(x=>x.by===id); return d&&(d.likes||[]).includes(c.id); })):[];
  const match=likedByAll.length?likedByAll[hashStr('m'+round)%likedByAll.length]:null;
  const partnerDone=others.length>0&&others.every(id=>{ const d=docs.find(x=>x.by===id); if(!d) return false; const z=new Set([...(d.likes||[]),...(d.nos||[])]); return cands.every(c=>z.has(c.id)); });
  return {round,cands,remaining,match,partnerDone,mine,docs,me,others};
}
async function vote(id,yes){ const st=swipeState(); const docId=`r${st.round}_${st.me}`; const likes=new Set(st.mine.likes||[]), nos=new Set(st.mine.nos||[]); (yes?likes:nos).add(id); (yes?nos:likes).delete(id);
  const data={round:st.round,by:st.me,likes:[...likes],nos:[...nos],at:new Date().toISOString()};
  return put('swipes',docId,data); }
async function claimMatch(){ const st=swipeState(), P=pots(); if(!st.match||!P.samenReady) return;
  await put('gewonnen','samen-r'+st.round,{soort:'samen',wie:null,titel:st.match.titel,beloningId:st.match.id,kosten:P.c.samen,at:new Date().toISOString(),door:S.meId,verzilverd:false,via:'match'});
  if(!st.match.herhalend) await put('beloningen',st.match.id,{actief:false},true); }
async function resetSwipes(all){ const st=swipeState(); for(const d of (all?st.docs:st.docs.filter(x=>x.by===st.me))) await del('swipes',d.id); }
function renderSwipe(){
  const st=swipeState(), P=pots(); let body='';
  if(st.cands.length<2) body=`<div class="empty">Zet eerst minstens twee gezamenlijke beloningen op de lijst, dan valt er iets te swipen.</div><div><button class="btn ghost" data-v="punten" data-goto="rw-settings" data-closesheet="1">Naar de beloningen</button></div>`;
  else if(st.match) body=P.samenReady?`<div class="spin"><span class="eyebrow">Het is een match</span><span class="spin-t">${esc(st.match.titel)}</span><span class="muted">Jullie wilden dit allebei en de gezamenlijke pot is vol.</span><div><button class="btn" data-claim="1">Verzilver de match</button></div></div>`
    :`<div class="spin"><span class="eyebrow">Er is een match</span><span class="spin-t">? ? ?</span><span class="muted">Jullie willen allebei hetzelfde. Wat het is, zie je zodra de gezamenlijke pot vol is en jullie allebei genoeg hebben bijgedragen (${Math.max(0,P.samenBal)} van ${P.c.samen}).</span></div>`;
  else if(st.remaining.length){ const c=st.remaining[0];
    body=`<p class="muted" style="margin:0">Naar rechts als je het wilt, naar links als je het overslaat. Je partner ziet nooit wat jij kiest, alleen de match.</p>
    <div class="swipe-area"><div class="swipe-card" id="swipe-card" data-id="${c.id}"><span class="eyebrow">${st.cands.length-st.remaining.length+1} van ${st.cands.length}</span><span class="swipe-t">${esc(c.titel)}</span><span class="muted">${c.herhalend?'kan vaker':'eenmalig'}</span><span class="stamp yes">JA</span><span class="stamp no">NEE</span></div></div>
    <div class="row" style="justify-content:center;gap:28px"><button class="sw-btn no" data-vote="no" aria-label="Nee, overslaan">✕</button><button class="sw-btn yes" data-vote="yes" aria-label="Ja, dit wil ik">♥</button></div>`; }
  else if(!st.others.length) body=`<div class="empty">Je hebt alles geswiped. Zodra je partner meedoet en ook swipet, kan er een match komen.</div><div><button class="btn ghost small" data-reswipe="me">Mijn keuzes opnieuw doen</button></div>`;
  else if(st.partnerDone) body=`<div class="empty">Geen match deze keer: jullie kozen niet hetzelfde. Begin een nieuwe ronde, of zet nieuwe ideeën op de lijst.</div><div class="row"><button class="btn" data-reswipe="all">Nieuwe ronde voor allebei</button><button class="btn ghost" data-v="punten" data-goto="rw-settings" data-closesheet="1">Ideeën toevoegen</button></div>`;
  else body=`<div class="empty">Je bent klaar met swipen. Nu is het wachten op ${esc(personName(st.others[0])||'je partner')}.</div><div><button class="btn ghost small" data-reswipe="me">Mijn keuzes opnieuw doen</button></div>`;
  $('#sheet-in').innerHTML=`<div class="sheet-head"><div><div class="eyebrow">Gezamenlijke beloning</div><h2 id="sheet-title">Swipen tot een match</h2></div><button class="x" id="sheet-x" aria-label="Sluiten">×</button></div>${body}`;
  bindSwipe();
}
function bindSwipe(){ const card=document.getElementById('swipe-card'); if(!card) return; let x0=null,dx=0;
  card.addEventListener('pointerdown',e=>{ x0=e.clientX; dx=0; try{card.setPointerCapture(e.pointerId);}catch(_){} card.style.transition='none'; });
  card.addEventListener('pointermove',e=>{ if(x0===null) return; dx=e.clientX-x0; card.style.transform=`translateX(${dx}px) rotate(${dx/18}deg)`; card.classList.toggle('lean-yes',dx>40); card.classList.toggle('lean-no',dx<-40); });
  const end=()=>{ if(x0===null) return; x0=null; card.style.transition=''; if(Math.abs(dx)>90) flyOut(dx>0); else { card.style.transform=''; card.classList.remove('lean-yes','lean-no'); } };
  card.addEventListener('pointerup',end); card.addEventListener('pointercancel',end); }
function flyOut(yes){ const card=document.getElementById('swipe-card'); if(!card) return; const id=card.dataset.id; card.classList.add(yes?'lean-yes':'lean-no'); card.style.transform=`translateX(${yes?440:-440}px) rotate(${yes?24:-24}deg)`; card.style.opacity='0'; setTimeout(()=>safe(vote(id,yes)),200); }

/* ---------- foto's ---------- */
const CAM=`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>`;
const PHOTO_HINT={afval:'Bijv. de afvalkalender van de gemeente, zodat je de ophaaldagen bij de hand hebt.',koelkast:'Bijv. de binnenkant van koelkast of vriezer, of het typeplaatje.',cv:'Bijv. de cv-ketel, het typeplaatje of de drukmeter.',keuken:'Bijv. het typeplaatje van afzuigkap, oven of vaatwasser.',badkamer:'Bijv. wasmachine, droger of het typeplaatje daarvan.',auto:'Bijv. het kentekenbewijs, een dashboardlampje of de banden.',tuin:'Bijv. de robotmaaier, het gereedschap of een plant.',kast:'Bijv. de sokkenla of een stapel versleten kleding.'};
const safeImg=u=>typeof u==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(u)?u:'';
function fotoCard(f){
  return `<div class="foto"><button class="foto-open" data-fopen="${f.id}" aria-label="Foto groot bekijken"><img src="${esc(safeImg(f.thumb))}" alt="Foto bij ${esc(SP[f.spot]?.name||'')}"></button><form class="stack" data-fmeta="${f.id}" style="gap:6px;min-width:0">
  <span class="muted" style="font-size:.8rem">${new Date(f.at).toLocaleDateString('nl-NL',{day:'numeric',month:'short',year:'numeric'})}${f.by?` · ${esc(personName(f.by))}`:''}</span>
  <div class="row"><input type="text" name="merk" placeholder="Merk" value="${esc(f.merk||'')}" aria-label="Merk" style="flex:1 1 90px"><input type="text" name="type" placeholder="Type of model" value="${esc(f.type||'')}" aria-label="Type" style="flex:1 1 110px"></div>
  <input type="text" name="notitie" placeholder="Notitie, bijv. filter vervangen in maart" value="${esc(f.notitie||'')}" aria-label="Notitie">
  <div class="row"><button class="btn ghost small" type="submit">Bewaar</button><button class="btn ghost small" type="button" data-fdel="${f.id}">Weg</button></div></form></div>`; }
function fotosHtml(){ const list=S.fotos.filter(f=>f.spot===openSpot).sort((a,b)=>(b.at||'').localeCompare(a.at||''));
  return `<div class="stack"><label class="btn" style="justify-self:start;display:inline-flex;gap:8px;align-items:center;cursor:pointer" for="foto-in">${CAM} Foto maken of kiezen</label><input type="file" id="foto-in" class="vh" accept="image/*">
  <span class="muted" style="font-size:.82rem">${esc(PHOTO_HINT[openSpot]||'Bijv. het typeplaatje van een apparaat, zodat je merk en type altijd bij de hand hebt.')}</span>
  <div id="foto-status" class="muted" style="font-size:.85rem" aria-live="polite"></div>
  ${list.length?`<div class="fotos">${list.map(fotoCard).join('')}</div>`:`<div class="empty">Nog geen foto's van deze plek.</div>`}</div>`; }
function setFotoStatus(t){ const el=$('#foto-status'); if(el) el.textContent=t; }
async function shrinkTo(file,max,q){ const url=URL.createObjectURL(file); try{ const img=await new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>rej(new Error('kan de foto niet openen')); i.src=url; });
  const sc=Math.min(1,max/Math.max(img.naturalWidth,img.naturalHeight)); const c=document.createElement('canvas'); c.width=Math.round(img.naturalWidth*sc); c.height=Math.round(img.naturalHeight*sc); c.getContext('2d').drawImage(img,0,0,c.width,c.height);
  return c.toDataURL('image/jpeg',q); } finally { URL.revokeObjectURL(url); } }
async function handlePhoto(input){ const file=input.files&&input.files[0]; input.value=''; if(!file) return; const spot=openSpot;
  try{ setFotoStatus('Foto verkleinen…'); const big=await shrinkTo(file,1400,.8), thumb=await shrinkTo(file,260,.7);
    setFotoStatus('Opslaan…'); const id=uid();
    await Store.set('fotobestand',id,{img:big});
    await put('fotos',id,{spot,thumb,at:new Date().toISOString(),by:S.meId,merk:'',type:'',notitie:''});
    setFotoStatus('');
  }catch(e){ setFotoStatus('Dat lukte niet: '+(e&&e.message||'onbekende fout')+'.'); } }
async function openFoto(id){ const v=$('#viewer'), img=$('#viewer-img'); const f=S.fotos.find(x=>x.id===id); img.src=safeImg(f&&f.thumb); v.hidden=false;
  try{ const d=await Store.get('fotobestand',id); if(d&&safeImg(d.img)&&!v.hidden) img.src=d.img; }catch(_){ } }

/* ---------- home ---------- */
function weekStart(){ const d=new Date(); const day=(d.getDay()+6)%7; d.setHours(0,0,0,0); return new Date(d-day*DAY); }
const SEASONNAME={lente:'Lente',zomer:'Zomer',herfst:'Herfst',winter:'Winter'};
function fmtDate(d){ return d.toLocaleDateString('nl-NL',{weekday:'short',day:'numeric',month:'short'}); }
function whenTxt(n){ return n===0?'vandaag':n===1?'morgen':`over ${n} dagen`; }
function renderClock(){
  const now=new Date(), weer=weerNu(), hand=handWeer();
  const wl=weer?WEERS.find(w=>w[0]===weer)[1].toLowerCase():null;
  const live=!hand&&W.visual;
  $('#today').textContent=now.toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  $('#clockline').innerHTML=`<span class="pill clock">${now.toLocaleTimeString('nl-NL',{hour:'2-digit',minute:'2-digit'})}</span><span class="pill">Week ${isoWeek(now)}</span><span class="pill">${SEASONNAME[season(now)]}</span><button class="pill" id="weer-btn" aria-expanded="${!$('#weather-pick').hidden}">${live?`${W.temp!==null?W.temp+'° · ':''}${wl}`:hand?`${wl} (zelf ingesteld)`:S.hh.plaats?'Weer laden…':'Weer kiezen'}</button>${(W.flags&&W.flags.vorst&&!hand)?'<span class="pill" style="color:var(--bad)">Vorst op komst</span>':''}${S.hh.plaats?`<span class="pill muted">${esc(S.hh.plaats.naam)}</span>`:''}`;
  $('#weather-pick').innerHTML=`${S.hh.plaats?`<button data-weer="auto" aria-pressed="${!hand}">Automatisch</button>`:''}`+WEERS.map(([k,l])=>`<button data-weer="${k}" aria-pressed="${hand===k}">${l}</button>`).join('');
}
function renderHome(){
  renderClock();
  $('#hh-name').textContent=S.hh.naam||'Ons huis';
  const hs=SPOTS.map(s=>spotHealth(s.id)), all=hs.reduce((a,b)=>a+b,0)/hs.length;
  $('#glow-num').textContent=Math.round(all*100)+'%';
  const r=19,c=2*Math.PI*r,gr=$('#glow-ring'); gr.setAttribute('stroke',stateColor(all)); gr.setAttribute('stroke-dasharray',`${c*all} ${c}`);
  const rem=reminders();
  $('#zones').innerHTML=GROUPS.map(g=>{ const h=groupHealth(g), n=groupAttention(g); return `<button class="zchip" data-group="${g.id}">${ring(h,48)}<span class="t"><span class="n" style="font-size:1rem">${esc(g.name)}</span><span class="s">${n?`${n} te doen`:'op orde'}</span></span></button>`; }).join('');
  // attention
  const remF=rem.filter(e=>forMe(e.wie));
  const worst=S.tasks.filter(t=>!t.once&&isActive(t)&&forMe(t.wie)).map(t=>({t,f:fresh(t)})).sort((a,b)=>a.f-b.f).slice(0,4);
  const onceDue=S.tasks.filter(t=>t.once&&!t.done&&t.due&&daysUntil(dateFrom(t.due))<=3&&forMe(t.wie)).sort((a,b)=>a.due.localeCompare(b.due));
  $('#attention').innerHTML=`<div class="samen-head"><h3>Komt nu aan de beurt</h3>${bewoners().length>1?`<div class="seg" role="group" aria-label="Filter"><button data-filter="alles" aria-pressed="${!mineFilter()}">Alles</button><button data-filter="mij" aria-pressed="${mineFilter()}">Van mij</button></div>`:''}</div><ul class="att-list">
    ${remF.map(e=>{const n=daysUntil(e.date);return `<li><button class="link" data-spot="${e.type==='afspraak'?'hal':'kalender'}"><b>${esc(e.actie)}</b>${whoBadge(e.wie)} <span class="muted">· ${esc(e.titel)}${e.age?` wordt ${e.age}`:''} · ${whenTxt(n)}</span></button><button class="btn small" data-regel="${esc(e.key)}">Geregeld</button></li>`;}).join('')}
    ${onceDue.map(t=>{const n=daysUntil(dateFrom(t.due));return `<li><button class="link" data-spot="${spotOf(t)}" data-opensub="eenmalig">${esc(t.name)}${whoBadge(t.wie)} <span class="muted">· ${esc(SP[spotOf(t)].name)} · ${n<0?'te laat':whenTxt(n)}</span></button><button class="btn small" data-oncedone="${t.id}">Klaar</button></li>`;}).join('')}
    ${worst.map(({t,f})=>`<li><button class="link" data-spot="${spotOf(t)}">${esc(t.name)}${whoBadge(t.wie)} <span class="muted">· ${esc(SP[spotOf(t)].name)}</span></button><span style="color:${stateColor(f)};font-weight:700;font-variant-numeric:tabular-nums">${Math.round(f*100)}%</span></li>`).join('')}</ul>`;
  renderRewards();
  renderWheel();
  drawScene();
}

/* ---------- jaarwiel ---------- */
function renderWheel(){
  const now=new Date(), y=now.getFullYear(), C=130, R=104;
  const doy=d=>(startOfDay(d)-new Date(d.getFullYear(),0,1))/DAY;
  const len=(new Date(y+1,0,1)-new Date(y,0,1))/DAY;
  const ang=d=>doy(d)/len*2*Math.PI-Math.PI/2;
  const pt=(a,r)=>[C+Math.cos(a)*r,C+Math.sin(a)*r];
  const arc=(a0,a1,r0,r1,fill)=>{ const [x0,y0]=pt(a0,r1),[x1,y1]=pt(a1,r1),[x2,y2]=pt(a1,r0),[x3,y3]=pt(a0,r0); const lg=a1-a0>Math.PI?1:0; return `<path d="M${x0} ${y0} A${r1} ${r1} 0 ${lg} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${lg} 0 ${x3} ${y3}Z" fill="${fill}"/>`; };
  const seasons=[[new Date(y,0,1),new Date(y,2,20),'#9cb8d1'],[new Date(y,2,20),new Date(y,5,21),'#9fcf86'],[new Date(y,5,21),new Date(y,8,22),'#f0c766'],[new Date(y,8,22),new Date(y,11,21),'#e09a5e'],[new Date(y,11,21),new Date(y,11,31,23),'#9cb8d1']];
  let s=seasons.map(([a,b,c])=>arc(ang(a),ang(b),R-10,R,c)).join('');
  const MN=['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  for(let mI=0;mI<12;mI++){ const a=ang(new Date(y,mI,1)), [x0,y0]=pt(a,R-26), [x1,y1]=pt(a,R); s+=`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="var(--line)" stroke-width="1"/>`; const am=ang(new Date(y,mI,15)), [tx,ty]=pt(am,R-19); s+=`<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="middle">${MN[mI]}</text>`; }
  // past part of year shaded
  s+=arc(-Math.PI/2,ang(now),R-10,R,'rgba(0,0,0,.14)');
  const evs=events().filter(e=>e.date.getFullYear()===y||daysUntil(e.date)<=365);
  const all=[]; holidays(y).forEach(h=>all.push(h));
  const personal=[]; events().forEach(e=>{ if(e.type!=='feestdag') personal.push(e); });
  // show all holidays of this year (muted) + personal (accent)
  all.forEach(e=>{ const [x,yy]=pt(ang(e.date),R-36); s+=`<circle cx="${x}" cy="${yy}" r="2.6" fill="var(--muted)" opacity=".6"><title>${esc(e.titel)} · ${fmtDate(e.date)}</title></circle>`; });
  personal.forEach(e=>{ const dd=new Date(y,e.date.getMonth(),e.date.getDate()); const [x,yy]=pt(ang(dd),R-46); s+=`<circle cx="${x}" cy="${yy}" r="4" fill="${e.type==='verjaardag'?'var(--p2)':'var(--accent)'}"><title>${esc(e.titel)} · ${fmtDate(e.date)}</title></circle>`; });
  const [nx,ny]=pt(ang(now),R+4);
  s+=`<line x1="${C}" y1="${C}" x2="${nx}" y2="${ny}" stroke="var(--ink)" stroke-width="2" stroke-linecap="round"/><circle cx="${C}" cy="${C}" r="30" fill="var(--surface)" stroke="var(--line)"/>`;
  const next=evs.find(e=>daysUntil(e.date)>0)||evs[0];
  s+=next?`<text class="center-big" x="${C}" y="${C-2}" text-anchor="middle">${daysUntil(next.date)}</text><text class="center-small" x="${C}" y="${C+13}" text-anchor="middle">dagen tot</text>`:'';
  const list=evs.slice(0,7);
  $('#wheelcard').innerHTML=`<div class="samen-head"><h2>Jaarwiel</h2><button class="btn ghost small" data-spot="kalender">Verjaardag toevoegen</button></div>
  <div class="wheel-wrap"><svg class="wheel" viewBox="0 0 260 260" role="img" aria-label="Het jaar als wiel met seizoenen, feestdagen en verjaardagen">${s}</svg>
  <div class="stack"><ul class="upcoming">${list.map(e=>{const n=daysUntil(e.date);return `<li><span>${e.type==='verjaardag'?'<i class="dot" style="background:var(--p2)"></i>':e.type==='feestdag'?'<i class="dot" style="background:var(--muted);opacity:.6"></i>':'<i class="dot" style="background:var(--accent)"></i>'}${esc(e.titel)}${e.age?` <span class="muted">wordt ${e.age}</span>`:''}${e.jaren?` <span class="muted">${e.jaren} jaar</span>`:''}</span><span class="d">${n===0?'vandaag':n===1?'morgen':fmtDate(e.date)}</span></li>`;}).join('')}</ul>
  <div class="legend"><span><i class="dot" style="background:var(--p2)"></i>verjaardag</span><span><i class="dot" style="background:var(--accent)"></i>afspraak of jubileum</span><span><i class="dot" style="background:var(--muted);opacity:.6"></i>feestdag</span></div></div></div>`;
}

/* ---------- sheet ---------- */
let openSpot=null, openSub=null;
const GROUPS=[{id:'huis',name:'Huis',spots:['dak','cv','bed','kast','badkamer','woonkamer','hal','kalender','koelkast','keuken','kluis','afval']},{id:'tuin',name:'Tuin',spots:['tuin']},{id:'auto',name:'Auto',spots:['auto']}];
const GR=Object.fromEntries(GROUPS.map(g=>[g.id,g]));
function spotAttention(id){ return id==='kalender'?reminders().length:S.tasks.filter(t=>spotOf(t)===id&&isActive(t)&&fresh(t)<.15).length; }
function groupHealth(g){ return g.spots.reduce((a,id)=>a+spotHealth(id),0)/g.spots.length; }
function groupAttention(g){ return g.spots.reduce((a,id)=>a+spotAttention(id),0); }
let openFrom=null;
function openGroup(gid){ const g=GR[gid]; if(!g) return; if(g.spots.length===1){ openFrom=null; return openSheet(g.spots[0]); } openFrom=null; openSheet('groep:'+gid); }
function groupHtml(g){ return `<div class="tiles">${g.spots.map(id=>{ const s=SP[id], n=spotAttention(id); return `<button class="tile" data-gospot="${id}">${ring(spotHealth(id),40)}<span class="tn">${esc(s.name)}</span><span class="ts">${n?`${n} vraagt aandacht`:esc(s.room)}</span></button>`; }).join('')}</div>`; }
function openSheet(id,sub){ if(id==='kalender'){ closeSheet(); showTab('kalender'); return; } if(!SP[id]&&id!=='swipe'&&!/^groep:/.test(id)) return; openSpot=id; openSub=sub||null; $('#scrim').hidden=false; $('#sheet').hidden=false; renderSheet(); $('#sheet').scrollTop=0; }
function closeSheet(){ openFrom=null; openSpot=null; openSub=null; $('#scrim').hidden=true; $('#sheet').hidden=true; }
function taskMeta(t){ const d=daysAgo(t); const who=personName(t.lastBy); const when=d===null?'nog nooit':d===0?'vandaag':d===1?'gisteren':`${d} dagen geleden`; let rit; if(t.trigger) rit=triggerOn(t.trigger)?`nu nodig (${TRIG[t.trigger]})`:`slaapt · ${TRIG[t.trigger]||''}`; else if(t.perSeizoen){ const e=interval(t), sz=season(new Date()); rit=e>0?`nu elke ${e} dagen (${sz})`:`rust in de ${sz}`; } else rit=`elke ${t.everyDays} dagen`;
  return `${rit} · ${when}${who?` door ${esc(who)}`:''}`; }
function ritmeFields(t){ const r=t&&t.trigger?'weer':t&&t.perSeizoen?'seizoen':'jaar'; const ps=(t&&t.perSeizoen)||{}; const base=(t&&t.everyDays)||30;
  return `<div class="stack" style="gap:6px;flex:1 1 100%"><label class="row muted" style="gap:6px;font-size:.85rem">Ritme<select name="ritme" style="flex:0 1 230px"><option value="jaar" ${r==='jaar'?'selected':''}>Het hele jaar hetzelfde</option><option value="seizoen" ${r==='seizoen'?'selected':''}>Per seizoen anders</option><option value="weer" ${r==='weer'?'selected':''}>Alleen bij bepaald weer</option></select></label>
  <div class="row" data-r="seizoen" ${r==='seizoen'?'':'hidden'}>${SEAS.map(([k,l])=>`<label class="f" style="flex:1 1 64px">${l}<input type="number" name="s_${k}" min="0" value="${ps[k]??base}"></label>`).join('')}<span class="muted" style="font-size:.78rem;flex:1 1 100%">Aantal dagen tussen twee keer; 0 betekent: in dat seizoen niet.</span></div>
  <label class="row muted" data-r="weer" style="gap:6px;font-size:.85rem" ${r==='weer'?'':'hidden'}>Nodig<select name="trigger">${Object.entries(TRIG).map(([k,l])=>`<option value="${k}" ${t&&t.trigger===k?'selected':''}>${l}</option>`).join('')}</select></label></div>`; }
function readRitme(f){ const r=f.elements.ritme?f.elements.ritme.value:'jaar';
  if(r==='seizoen'){ const ps={}; SEAS.forEach(([k])=>ps[k]=Math.max(0,Math.round(Number(f.elements['s_'+k].value)||0))); const pos=Object.values(ps).filter(v=>v>0); return {perSeizoen:ps,trigger:null,everyDays:pos.length?Math.min(...pos):30}; }
  if(r==='weer') return {perSeizoen:null,trigger:f.elements.trigger.value,everyDays:1};
  return {perSeizoen:null,trigger:null,everyDays:Math.max(1,Number(f.elements.every.value)||7)}; }
function onceMeta(t){ if(t.done){ const who=personName(t.doneBy); return `afgerond${who?' door '+esc(who):''}`; } if(!t.due) return 'geen datum'; const n=daysUntil(dateFrom(t.due)); return `uiterlijk ${fmtDate(dateFrom(t.due))} · ${n<0?`${-n} ${-n===1?'dag':'dagen'} te laat`:whenTxt(n)}`; }
const ASKS={};const _OLDASKS={kast:'Wat moet er in de kledingkast vervangen worden? Bijv. sokken of ondergoed',koelkast:'Wat eten we deze week en wat moet er in huis komen?',kalender:'Welk cadeau past bij wie er binnenkort jarig is?',tuin:'Wat moet er deze maand in de tuin gebeuren?',auto:'Waar moet ik deze tijd van het jaar aan denken bij de auto?',kluis:'Welke geldzaken spelen er deze maand?',cv:'Wat moet ik voor de winter aan de cv en het dak doen?',dak:'Wat moet ik voor de winter aan de cv en het dak doen?'};
const SPECIAL={koelkast:[['boodschappen','Boodschappenlijst']],hal:[['afspraken','Afspraken']]};
function healthOf(ts){ const l=ts.filter(isActive); return l.length?l.reduce((a,t)=>a+fresh(t),0)/l.length:1; }
function subsFor(spot){
  const ts=S.tasks.filter(t=>spotOf(t)===spot), out=[];
  (SPECIAL[spot]||[]).forEach(([id,name])=>{ let h=1,sub=''; if(id==='boodschappen'){ const n=S.shopping.filter(i=>!i.done).length; sub=n?`${n} op de lijst`:'lijst is leeg'; h=n?.75:1; } if(id==='afspraken'){ const up=S.afspraken.filter(a=>/^\d{4}-\d{2}-\d{2}$/.test(a.datum||'')&&daysUntil(dateFrom(a.datum))>=0); sub=up.length?`${up.length} gepland`:'niets gepland'; } out.push({id,name,h,sub}); });
  CATS.forEach(([c,name])=>{ const l=ts.filter(t=>!t.once&&catOf(t)===c); if(!l.length) return; const att=l.filter(t=>isActive(t)&&fresh(t)<.15).length; out.push({id:c,name,h:healthOf(l),sub:`${l.length} ${l.length===1?'taak':'taken'}${att?` · ${att} vraagt aandacht`:''}`}); });
  const once=ts.filter(t=>t.once&&!t.done), late=once.filter(t=>t.due&&daysUntil(dateFrom(t.due))<0).length;
  const nf=S.fotos.filter(f=>f.spot===spot).length; const fotoTile={id:'fotos',name:"Foto's",h:null,sub:nf?`${nf} ${nf===1?'foto':"foto's"}`:'apparaten, typeplaatjes, inhoud'};

  out.push({id:'eenmalig',name:'Eenmalig',h:healthOf(once),sub:once.length?`${once.length} open${late?` · ${late} te laat`:''}`:'niets open'});
  out.push(fotoTile);
  return out;
}
function newForm(cat,mode){
  return `<form class="stack card" id="f-new" data-mode="${mode}"><h3>Iets toevoegen</h3>
    <input type="text" name="name" placeholder="Wat moet er gebeuren?" required aria-label="Taak">
    <div class="row"><div class="seg" role="group" aria-label="Herhaling"><button type="button" data-mode="rep" aria-pressed="${mode==='rep'}">Terugkerend</button><button type="button" data-mode="once" aria-pressed="${mode==='once'}">Eenmalig</button></div>
    <select name="cat" aria-label="Soort" style="flex:0 1 180px">${CATS.map(([c,n])=>`<option value="${c}" ${c===cat?'selected':''}>${n}</option>`).join('')}</select>${whoSelect('wie',null)}</div>
    <div class="stack" data-for="rep" style="gap:6px" ${mode==='rep'?'':'hidden'}>${ritmeFields(null)}<label class="row muted" data-r="jaar" style="gap:6px;font-size:.85rem">elke<input type="number" name="every" class="n-input" min="1" value="7">dagen</label></div>
    <label class="row muted" style="gap:6px;font-size:.85rem">levert<input type="number" name="punten" class="n-input" min="0" max="500" placeholder="auto">punten op <span style="font-size:.78rem">(leeg: naar zwaarte)</span></label>
    <label class="f" data-for="once" ${mode==='once'?'':'hidden'}>Uiterlijk op (mag leeg blijven)<input type="date" name="due"></label>
    <div><button class="btn" type="submit">Toevoegen</button></div></form>`;
}
function recurringRows(ts){ return ts.length?`<div class="tasks">${ts.map(t=>`<div class="task" style="${isActive(t)?'':'opacity:.62'}">${ring(fresh(t),44)}<div style="min-width:0"><div class="name">${esc(t.name)}${whoBadge(t.wie)}</div><div class="meta">${taskMeta(t)}</div></div><button class="btn small" data-done="${t.id}">Gedaan +${ptsOf(t)}</button>
  <details class="edit"><summary>Aanpassen</summary><form class="row" data-edit="${t.id}" style="margin-top:8px"><input type="text" name="name" class="grow" value="${esc(t.name)}" aria-label="Naam">${ritmeFields(t)}<label class="row muted" data-r="jaar" style="gap:6px;font-size:.85rem" ${t.trigger||t.perSeizoen?'hidden':''}>elke<input type="number" name="every" class="n-input" min="1" value="${t.everyDays}" aria-label="Elke zoveel dagen">dagen</label><select name="spot" aria-label="Plek in huis" style="flex:0 1 170px">${SPOTS.filter(x=>x.id!=='kalender').map(x=>`<option value="${x.id}" ${x.id===spotOf(t)?'selected':''}>${esc(x.name)}</option>`).join('')}</select><select name="cat" aria-label="Soort" style="flex:0 1 150px">${CATS.map(([c,n])=>`<option value="${c}" ${c===catOf(t)?'selected':''}>${n}</option>`).join('')}</select>${whoSelect('wie',t.wie)}<label class="row muted" style="gap:6px;font-size:.85rem"><input type="number" name="punten" class="n-input" min="0" max="500" value="${ptsOf(t)}" aria-label="Punten">punten</label><button class="btn small" type="submit">Bewaar</button><button class="btn ghost small" type="button" data-del="${t.id}">Verwijder</button></form></details></div>`).join('')}</div>`:''; }
function onceRows(ts){ return ts.length?`<div class="tasks">${ts.map(t=>{ const late=!t.done&&t.due&&daysUntil(dateFrom(t.due))<0; return `<div class="once ${late?'late':''}"><input type="checkbox" data-oncedone="${t.id}" ${t.done?'checked disabled':''} aria-label="Afronden"><div style="min-width:0"><div class="name" style="font-weight:600;${t.done?'text-decoration:line-through;color:var(--muted)':''}">${esc(t.name)}${whoBadge(t.wie)}</div><div class="meta">${onceMeta(t)}${t.cat&&openSub==='eenmalig'?` · ${esc(CATN[catOf(t)])}`:''}</div></div>${t.done?'':`<span class="badge-pts">+${ptsOf(t)}</span>`}<button class="btn ghost small" data-del="${t.id}">Weg</button>${t.done?'':`<details class="edit"><summary>Aanpassen</summary><form class="row" data-onceedit="${t.id}" style="margin-top:8px"><input type="text" name="name" class="grow" value="${esc(t.name)}" aria-label="Naam"><input type="date" name="due" value="${esc(t.due||'')}" aria-label="Uiterlijk op" style="flex:0 1 160px">${whoSelect('wie',t.wie)}<button class="btn small" type="submit">Bewaar</button></form></details>`}</div>`; }).join('')}</div>`:''; }
function specialHtml(id){
  if(id==='boodschappen') return `<div class="stack">
      <form class="row" id="f-shop"><input type="text" id="shop-in" class="grow" placeholder="Wat moet erbij?"><button class="btn" type="submit">Erbij</button></form>
      ${S.shopping.length?`<ul class="list">${S.shopping.slice().sort((a,b)=>(a.done?1:0)-(b.done?1:0)).map(i=>`<li class="${i.done?'done':''}"><input type="checkbox" data-shop="${i.id}" ${i.done?'checked':''} aria-label="Afvinken"><span>${esc(i.name)}${i.waar?` <span class="muted">· ${esc(i.waar)}</span>`:''}</span>${!i.done?`<a class="muted" style="font-size:.8rem" href="${/bol/i.test(i.waar||'')?'https://www.bol.com/nl/nl/s/?searchtext=':'https://www.ah.nl/zoeken?query='}${encodeURIComponent(i.name)}" target="_blank" rel="noopener">zoek</a>`:''}<button class="btn ghost small" data-shopdel="${i.id}">Weg</button></li>`).join('')}</ul>`:'<div class="empty">De lijst is leeg. Zet hier iets op, of vraag het de vraagbaak.</div>'}
      ${S.shopping.some(i=>i.done)?`<div><button class="btn ghost small" id="shop-clear">Afgevinkte weghalen</button></div>`:''}</div>`;
  if(id==='afspraken'){ const up=S.afspraken.slice().sort((a,b)=>(a.datum||'').localeCompare(b.datum||''));
    return `<div class="stack">${up.length?`<ul class="list">${up.map(a=>{const d=/^\d{4}-\d{2}-\d{2}$/.test(a.datum||'')?daysUntil(dateFrom(a.datum)):null;return `<li><span><b>${esc(a.titel)}</b> <span class="muted">· ${d!==null?fmtDate(dateFrom(a.datum)):esc(a.datum)}${d!==null?(d>=0?` · ${whenTxt(d)}`:' · geweest'):''}</span>${a.voorbereiding?`<br><span class="muted">Voorbereiden: ${esc(a.voorbereiding)}</span>`:''}</span><button class="btn ghost small" data-afdel="${a.id}">Weg</button></li>`;}).join('')}</ul>`:'<div class="empty">Nog geen afspraken. Zet er een in, met wat er vooraf moet gebeuren. Drie dagen ervoor verschijnt de voorbereiding bij "Komt nu aan de beurt".</div>'}
      <form class="stack" id="f-af"><div class="row"><input type="text" id="af-titel" class="grow" placeholder="Afspraak, bijv. tandarts" required><input type="date" id="af-datum" style="flex:0 1 160px" required></div><input type="text" id="af-prep" placeholder="Voorbereiding, bijv. pasje en vragenlijstje mee"><div><button class="btn" type="submit">Afspraak toevoegen</button></div></form></div>`; }
  return '';
}
function kalenderHtml(){
  const evs=events().slice(0,14), rem=reminders();
  return `${rem.length?`<div class="stack"><h3>Herinneringen</h3><ul class="list">${rem.map(e=>`<li><span><b>${esc(e.actie)}</b>${whoBadge(e.wie)}<br><span class="muted">${esc(e.titel)}${e.age?` wordt ${e.age}`:''} · ${fmtDate(e.date)} · ${whenTxt(daysUntil(e.date))}</span></span><button class="btn small" data-regel="${esc(e.key)}">Geregeld</button></li>`).join('')}</ul></div>`:''}
    <div class="stack"><h3>Binnenkort</h3><ul class="list">${evs.map(e=>{const n=daysUntil(e.date); const items=prepItems(e); const klaar=items.filter(it=>isGeregeld(e,it)).length; const tk=tplKey(e);
      return `<li class="ev"><div class="ev-head"><span><b>${esc(e.titel)}</b>${e.age?` <span class="muted">wordt ${e.age}</span>`:''}${e.jaren?` <span class="muted">${e.jaren} jaar</span>`:''}<br><span class="muted">${fmtDate(e.date)} · ${whenTxt(n)}</span></span>${e.type==='feestdag'?'<span class="tag">feestdag</span>':e.type==='afspraak'?'<span class="tag">afspraak</span>':e.fromProfile?'<span class="tag gift">profiel</span>':`<button class="btn ghost small" data-dagdel="${esc(e.dagId)}">Weg</button>`}</div>
      <details class="prep" data-prep="${esc(tk)}" ${openPrep.has(tk)?'open':''}><summary>Voorbereiding${items.length?` · ${klaar} van ${items.length} geregeld`:''}</summary>
        ${items.length?`<ul class="prep-list">${items.map(it=>{ const done=isGeregeld(e,it), due=Number(it.dagen); const act=!done&&n<=due; return `<li><input type="checkbox" ${done?'checked':''} data-prepcheck="${esc(e.key)}|${esc(it.id)}" aria-label="Geregeld"><span class="${done?'done':''}">${esc(it.titel)}${whoBadge(it.wie)}<br><span class="muted" style="${act?'color:var(--warn);font-weight:600':''}">${due} ${due===1?'dag':'dagen'} vooraf${act?' · nu aan de beurt':''}</span></span><button class="btn ghost small" data-prepdel="${esc(e.key)}|${esc(it.id)}" aria-label="Subtaak verwijderen">×</button></li>`; }).join('')}</ul>`:'<p class="muted" style="margin:6px 0">Nog niets voor te bereiden.</p>'}
        <form class="row" data-prepadd="${esc(e.key)}" style="margin-top:8px"><input type="text" name="titel" class="grow" placeholder="Bijv. gedicht schrijven" aria-label="Subtaak" required><label class="row muted" style="gap:6px;font-size:.85rem"><input type="number" name="dagen" class="n-input" min="0" max="120" value="7" aria-label="Dagen vooraf">dagen vooraf</label>${whoSelect('wie',null)}<button class="btn small" type="submit">Toevoegen</button></form>
      </details></li>`;}).join('')}</ul></div>
    <form class="stack card" id="f-dag"><h3>Verjaardag of bijzondere dag toevoegen</h3>
      <div class="row"><input type="text" id="dg-titel" class="grow" placeholder="Naam, bijv. oma Riet" required><select id="dg-type" style="flex:0 1 150px"><option value="verjaardag">Verjaardag</option><option value="jubileum">Jubileum</option><option value="overig">Andere dag</option></select></div>
      <div class="row"><label class="f grow">Datum (jaar mag ook een gok zijn)<input type="date" id="dg-datum" required></label><label class="row muted" style="gap:6px;font-size:.85rem"><input type="checkbox" id="dg-cadeau" checked> cadeau nodig</label><label class="row muted" style="gap:6px;font-size:.85rem">herinner<input type="number" id="dg-rem" class="n-input" min="1" max="60" value="7">dagen vooraf</label></div>
      <label class="row muted" style="gap:6px;font-size:.85rem"><input type="checkbox" id="dg-geenjaar"> jaar niet bekend (geen leeftijd tonen)</label>
      <div><button class="btn" type="submit">Toevoegen</button></div></form>`;
}
function renderSheet(){
  if(!openSpot) return; if(openSpot==='swipe') return renderSwipe();
  if(/^groep:/.test(openSpot)){ const g=GR[openSpot.slice(6)]; if(!g){ closeSheet(); return; } $('#sheet-in').innerHTML=`<div class="sheet-head"><div class="row" style="gap:12px">${ring(groupHealth(g),52)}<div><div class="eyebrow">Overzicht</div><h2 id="sheet-title">${esc(g.name)}</h2></div></div><button class="x" id="sheet-x" aria-label="Sluiten">×</button></div>${groupHtml(g)}`; return; }
  const s=SP[openSpot];
  const ts=S.tasks.filter(t=>spotOf(t)===openSpot);
  let body='', title=s.name, eyebrow=s.room, h=spotHealth(openSpot);
  if(openSpot==='kalender'){ body=kalenderHtml(); }
  else if(!openSub){
    const seedFor=(window.ONS_HUIS_SEED||[]).filter(t=>t.spot===openSpot);
    const defaultsBtn=!ts.length&&seedFor.length?`<div class="card stack"><b>Nog geen taken hier</b><span class="muted">Begin met ${seedFor.length} standaardtaken: ${esc(seedFor.map(t=>t.name).join(', '))}. Pas daarna het ritme aan op jullie ophaaldagen.</span><div><button class="btn" data-seedspot="${openSpot}">Standaardtaken toevoegen</button></div></div>`:'';
    body=defaultsBtn+`<div class="tiles">${subsFor(openSpot).map(x=>`<button class="tile" data-sub="${x.id}">${x.h===null?`<span class="tile-ic">${CAM}</span>`:ring(x.h,40)}<span class="tn">${esc(x.name)}</span><span class="ts">${esc(x.sub)}</span></button>`).join('')}</div>${newForm('overig'===defaultCat(openSpot)?'overig':defaultCat(openSpot),'rep')}`;
  } else {
    eyebrow=s.name; const back=`<button class="back" data-back="1">‹ Terug naar ${esc(s.name)}</button>`;
    if(SPECIAL[openSpot]&&SPECIAL[openSpot].some(([id])=>id===openSub)){ title=SPECIAL[openSpot].find(([id])=>id===openSub)[1]; body=back+specialHtml(openSub); h=null; }
    else if(openSub==='fotos'){ title="Foto's"; h=null; body=back+fotosHtml(); }
    else if(openSub==='eenmalig'){ title='Eenmalig'; const open=ts.filter(t=>t.once&&!t.done).sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')); const done=ts.filter(t=>t.once&&t.done).sort((a,b)=>(b.doneAt||'').localeCompare(a.doneAt||'')).slice(0,5);
      h=healthOf(open); body=back+(open.length?onceRows(open):'<div class="empty">Niets eenmaligs open hier.</div>')+(done.length?`<h3>Onlangs afgerond</h3>${onceRows(done)}`:'')+newForm(defaultCat(openSpot),'once'); }
    else { title=CATN[openSub]||openSub; const rec=ts.filter(t=>!t.once&&catOf(t)===openSub).sort((a,b)=>fresh(a)-fresh(b)); const once=ts.filter(t=>t.once&&!t.done&&catOf(t)===openSub);
      h=healthOf(rec.concat(once)); body=back+(rec.length?`<h3>Terugkerend</h3>${recurringRows(rec)}`:'')+(once.length?`<h3>Eenmalig</h3>${onceRows(once)}`:'')+(!rec.length&&!once.length?'<div class="empty">Nog niets in deze soort.</div>':'')+newForm(openSub,'rep'); }
  }
  $('#sheet-in').innerHTML=`<div class="sheet-head"><div class="row" style="gap:12px">${h===null?'':ring(h,52)}<div><div class="eyebrow">${esc(eyebrow)}</div><h2 id="sheet-title">${esc(title)}</h2></div></div><button class="x" id="sheet-x" aria-label="Sluiten">×</button></div>
    ${openFrom&&!openSub?`<button class="back" data-backgroup="${openFrom}">‹ Terug naar ${esc(GR[openFrom].name)}</button>`:''}
    ${ASKS[openSpot]&&!openSub?`<button class="askbtn" data-askfill="${esc(ASKS[openSpot])}">Vraag de vraagbaak hierover</button>`:''}${body}`;
}
function defaultCat(spot){ return {afval:'opruimen',kluis:'geld',hal:'planning',koelkast:'voorraad',kast:'opruimen',tuin:'onderhoud',auto:'onderhoud',dak:'onderhoud',cv:'onderhoud'}[spot]||'schoonmaak'; }

/* ---------- writes ---------- */
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const D={};
function derive(){
  const arr=c=>Object.entries(D[c]||{}).map(([id,d])=>({id,...d}));
  S.tasks=arr('tasks'); S.shopping=arr('shopping'); S.afspraken=arr('afspraken'); S.dagen=arr('dagen'); S.beloningen=arr('beloningen'); S.gewonnen=arr('gewonnen'); S.swipes=arr('swipes'); S.fotos=arr('fotos'); S.log=arr('log');
  S.geregeld={}; arr('geregeld').forEach(g=>{ if(g.key) S.geregeld[g.key]=true; });
  S.profiles={...(D.profiles||{})}; S.voorbereiding=D.voorbereiding||{}; S.hh=(D.household&&D.household.main)||{};
}
function applyRows(rows,full){ if(full) for(const k in D) delete D[k]; rows.forEach(r=>{ const c=D[r.collection]||(D[r.collection]={}); if(r.data&&r.data._del) delete c[r.id]; else c[r.id]=r.data||{}; }); derive(); }
function local(col,id,data,merge){ const c=D[col]||(D[col]={}); c[id]=merge?{...(c[id]||{}),...data}:{...data}; }
async function put(col,id,data,merge){ local(col,id,data,merge); derive(); rerender(); return merge?Store.merge(col,id,data):Store.set(col,id,data); }
async function del(col,id){ if(D[col]) delete D[col][id]; derive(); rerender(); return Store.del(col,id); }
async function batch(ops){ ops.forEach(o=>local(o.c,o.id,o.data,o.op==='merge')); derive(); rerender(); return Store.batch(ops); }
async function markDone(id){ const t=S.tasks.find(x=>x.id===id); if(!t) return; const at=new Date().toISOString(); return batch([{op:'merge',c:'tasks',id,data:{lastDone:at,lastBy:S.meId}},{op:'set',c:'log',id:uid(),data:{taskId:id,spot:spotOf(t),by:S.meId,at,punten:ptsOf(t),naam:t.name}}]); }
async function addTask(spot,name,every,cat,punten,extra,wie){ return put('tasks',uid(),{spot,wie:validWie(wie),cat:CATN[cat]?cat:'overig',name,punten:clampPts(punten,null),perSeizoen:(extra&&extra.perSeizoen)||null,trigger:(extra&&extra.trigger)||null,everyDays:Math.max(1,Number(every)||7),lastDone:new Date().toISOString(),lastBy:null}); }
async function addOnce(spot,name,due,cat,punten,wie){ return put('tasks',uid(),{spot,wie:validWie(wie),cat:CATN[cat]?cat:'overig',name,punten:clampPts(punten,10),once:true,due:/^\d{4}-\d{2}-\d{2}$/.test(due||'')?due:null,done:false,by:S.meId,at:new Date().toISOString()}); }
async function doneOnce(id){ const t=S.tasks.find(x=>x.id===id); if(!t||t.done) return; const at=new Date().toISOString(); return batch([{op:'merge',c:'tasks',id,data:{done:true,doneAt:at,doneBy:S.meId}},{op:'set',c:'log',id:uid(),data:{taskId:id,spot:spotOf(t),by:S.meId,at,punten:ptsOf(t),naam:t.name}}]); }
async function addShop(name,waar){ return put('shopping',uid(),{name,waar:waar||'',done:false,by:S.meId,at:new Date().toISOString()}); }
async function addAfspraak(titel,datum,voorbereiding){ return put('afspraken',uid(),{titel,datum,voorbereiding:voorbereiding||'',by:S.meId}); }
async function addDag(titel,type,datum,cadeau,herinnering,geenJaar){ const [jj,mm,dd]=datum.split('-').map(Number); return put('dagen',uid(),{titel,type,maand:mm,dag:dd,jaar:geenJaar?null:jj,cadeau:!!cadeau,herinnering:Math.max(1,Number(herinnering)||7),by:S.meId}); }
async function regel(key){ const id=key.replace(/[^A-Za-z0-9_\-.~:@+]/g,'_').slice(0,190); return put('geregeld',id,{key,by:S.meId,at:new Date().toISOString()}); }
async function setWeer(w){ return put('household','main',w==='auto'?{weer:null,weerDatum:null}:{weer:w,weerDatum:ymd(new Date())},true); }
function safe(p){ Promise.resolve(p).catch(e=>{ $('#banner').hidden=false; $('#banner').textContent=(e&&e.code==='offline')?'Geen internet: je wijziging is niet opgeslagen. Probeer het zo nog eens.':'Opslaan lukte niet: '+(e&&e.message||'onbekende fout')+'. Probeer het zo nog eens.'; Store.resetSince(); poll(); }); }

/* ---------- events ---------- */
function showTab(v){ document.querySelectorAll('.tab').forEach(t=>t.setAttribute('aria-selected',t.dataset.v===v)); ['huis','lijst','kalender','punten','inst'].forEach(x=>$('#v-'+x).hidden=x!==v); renderKalender(); if(v==='punten') renderRewardSettings(); window.scrollTo(0,0); if(v==='inst') fillSettings(); renderLijst(); }
document.addEventListener('click',e=>{
  const gEl=e.target.closest('[data-group]'); if(gEl&&!e.target.closest('#sheet')){ openGroup(gEl.dataset.group); return; }
  const goEl=e.target.closest('[data-gospot]'); if(goEl&&goEl.dataset.gospot==='kalender'){ closeSheet(); showTab('kalender'); return; } if(goEl){ openFrom=openSpot.slice(6); openSpot=goEl.dataset.gospot; openSub=null; renderSheet(); $('#sheet').scrollTop=0; return; }
  const bgEl=e.target.closest('[data-backgroup]'); if(bgEl){ const g=bgEl.dataset.backgroup; openFrom=null; openSpot='groep:'+g; openSub=null; renderSheet(); return; }
  const sEl=e.target.closest('[data-spot]'); if(sEl&&!e.target.closest('#sheet')&&!e.target.closest('button[data-regel]')){ openSheet(sEl.dataset.spot,sEl.dataset.opensub); return; }
  const b=e.target.closest('button,input[type=checkbox]'); if(!b) return;
  if(b.id==='sheet-x') return closeSheet();
  if(b.dataset.sub){ openSub=b.dataset.sub; renderSheet(); $('#sheet').scrollTop=0; return; }
  if(b.dataset.back){ openSub=null; renderSheet(); return; }
  if(b.dataset.mode){ const f=b.closest('form'); f.dataset.mode=b.dataset.mode; f.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',x===b)); f.querySelectorAll('[data-for]').forEach(x=>x.hidden=x.dataset.for!==b.dataset.mode); return; }
  if(b.dataset.oncedone){ b.disabled=true; safe(doneOnce(b.dataset.oncedone)); return; }
  if(b.dataset.spin){ spin(b.dataset.spin); return; }
  if(b.dataset.spinclose){ spinView=null; renderRewards(); return; }
  if(b.dataset.redeem){ safe(put('gewonnen',b.dataset.redeem,{verzilverd:true,verzilverdOp:new Date().toISOString()},true)); return; }
  if(b.dataset.rwsug){ safe(addReward(b.dataset.rwsug,$('#rw-voor').value||'samen',true)); return; }
  if(b.dataset.rwdel){ if(b.dataset.armed){ safe(del('beloningen',b.dataset.rwdel)); } else { b.dataset.armed='1'; b.textContent='Zeker?'; } return; }
  if(b.dataset.rwrevive){ safe(put('beloningen',b.dataset.rwrevive,{actief:true},true)); return; }
  if(b.id==='weer-btn'){ const wp=$('#weather-pick'); wp.hidden=!wp.hidden; b.setAttribute('aria-expanded',!wp.hidden); }
  if(b.dataset.weer){ safe(setWeer(b.dataset.weer)); $('#weather-pick').hidden=true; }
  if(b.dataset.done){ b.disabled=true; safe(markDone(b.dataset.done)); }
  if(b.dataset.del){ if(b.dataset.armed){ safe(del('tasks',b.dataset.del)); } else { b.dataset.armed='1'; b.textContent='Zeker weten?'; } }
  if(b.dataset.shop){ safe(put('shopping',b.dataset.shop,{done:b.checked},true)); }
  if(b.dataset.shopdel){ safe(del('shopping',b.dataset.shopdel)); }
  if(b.dataset.afdel){ safe(del('afspraken',b.dataset.afdel)); }
  if(b.dataset.dagdel){ if(b.dataset.armed){ safe(del('dagen',b.dataset.dagdel)); } else { b.dataset.armed='1'; b.textContent='Zeker?'; } }
  if(b.dataset.regel){ b.disabled=true; safe(regel(b.dataset.regel)); }
  if(b.dataset.calday){ calSel=b.dataset.calday; const d=dateFrom(calSel); if(d.getMonth()!==calMonth.getMonth()) calMonth=new Date(d.getFullYear(),d.getMonth(),1); renderKalender(); return; }
  if(b.dataset.calnav){ const n=b.dataset.calnav; if(n==='nu'){ const t=new Date(); calMonth=new Date(t.getFullYear(),t.getMonth(),1); calSel=ymd(t); } else calMonth=new Date(calMonth.getFullYear(),calMonth.getMonth()+(n==='+'?1:-1),1); renderKalender(); return; }
  if(b.dataset.filter){ lsSet('onshuis-filter',b.dataset.filter==='mij'?'mij':null); renderHome(); return; }
  if(b.dataset.prepcheck){ const key=b.dataset.prepcheck; if(b.checked) safe(regel(key)); else { const [ek]=key.split('|'); safe(del('geregeld',key.replace(/[^A-Za-z0-9_\-.~:@+]/g,'_').slice(0,190))); if(key.endsWith('|a')&&S.geregeld[ek]) safe(del('geregeld',ek.replace(/[^A-Za-z0-9_\-.~:@+]/g,'_').slice(0,190))); } return; }
  if(b.dataset.prepdel){ const i=b.dataset.prepdel.lastIndexOf('|'); const ek=b.dataset.prepdel.slice(0,i), iid=b.dataset.prepdel.slice(i+1); const e=events().find(x=>x.key===ek); if(e){ openPrep.add(tplKey(e)); safe(savePrep(e,prepItems(e).filter(it=>it.id!==iid))); } return; }
  if(b.id==='shop-clear'){ S.shopping.filter(i=>i.done).forEach(i=>safe(del('shopping',i.id))); }
  if(b.dataset.closesheet) closeSheet();
  if(b.dataset.v){ showTab(b.dataset.v); }
  if(b.dataset.goto){ if(!b.dataset.v) showTab('punten'); const el=document.getElementById(b.dataset.goto); if(el) setTimeout(()=>el.scrollIntoView({behavior:'smooth',block:'start'}),60); }
  if(b.dataset.openswipe){ openSheet('swipe'); return; }
  if(b.dataset.vote){ flyOut(b.dataset.vote==='yes'); return; }
  if(b.dataset.claim){ b.disabled=true; safe(claimMatch()); return; }
  if(b.dataset.reswipe){ safe(resetSwipes(b.dataset.reswipe==='all')); return; }
  if(b.dataset.seedspot){ b.disabled=true; const now=Date.now(); const ops=(window.ONS_HUIS_SEED||[]).filter(t=>t.spot===b.dataset.seedspot).map((t,i)=>{ const {id,...data}=t; return {op:'set',c:'tasks',id:uid()+i,data:{...data,lastDone:new Date(now-DAY*Math.round((data.everyDays||7)*.3)).toISOString(),lastBy:null}}; }); safe(batch(ops)); return; }
  if(b.dataset.fopen){ openFoto(b.dataset.fopen); return; }
  if(b.id==='viewer-x'){ $('#viewer').hidden=true; $('#viewer-img').removeAttribute('src'); return; }
  if(b.dataset.fdel){ if(!b.dataset.armed){ b.dataset.armed='1'; b.textContent='Zeker?'; return; } const id=b.dataset.fdel; safe(del('fotos',id)); Store.del('fotobestand',id).catch(()=>{}); return; }
  if(b.dataset.who){ kiesIk(b.dataset.who); return; }
  if(b.dataset.plaats){ const p=JSON.parse(b.dataset.plaats); const tgt=b.closest('[data-plaats-for]'); if(tgt&&tgt.dataset.plaatsFor==='setup'){ setupPlaats=p; $('#su-plaats-res').innerHTML=`<span class="saved">Gekozen: ${esc(p.naam)}, ${esc(p.regio)}</span>`; } else { safe(put('household','main',{plaats:p},true).then(()=>{ $('#pl-res').innerHTML=`<span class="saved">Opgeslagen: ${esc(p.naam)}</span>`; W.at=0; loadWeather(true); })); } return; }
  if(b.id==='code-reset'){ lsSet(LS.code,null); location.reload(); return; }
});
$('#scrim').addEventListener('click',closeSheet);
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeSheet(); });
document.addEventListener('toggle',e=>{ const d=e.target; if(d&&d.dataset&&d.dataset.prep){ if(d.open) openPrep.add(d.dataset.prep); else openPrep.delete(d.dataset.prep); } },true);
document.addEventListener('change',e=>{ const el=e.target;
  if(el.name==='ritme'){ const f=el.closest('form'); f.querySelectorAll('[data-r]').forEach(x=>x.hidden=x.dataset.r!==el.value); }
  if(el.id==='foto-in') handlePhoto(el);
  if(el.id==='who-sel'){ kiesIk(el.value); } });
document.addEventListener('submit',e=>{
  const f=e.target; e.preventDefault();
  if(f.id==='f-new'){ const n=f.elements.name.value.trim(); if(!n) return; const cat=f.elements.cat.value;
    const pts=f.elements.punten.value;
    const wie=f.elements.wie?f.elements.wie.value:'';
    if(f.dataset.mode==='once'){ safe(addOnce(openSpot,n,f.elements.due.value,cat,pts,wie)); if(openSub&&openSub!=='eenmalig'&&openSub!==cat) openSub=cat; }
    else { const R=readRitme(f); safe(addTask(openSpot,n,R.everyDays,cat,pts,R,wie)); if(openSub&&openSub!==cat) openSub=cat; } }
  else if(f.dataset.edit){ safe(put('tasks',f.dataset.edit,{name:f.elements.name.value.trim()||'Taak',...(({perSeizoen,trigger,everyDays})=>({perSeizoen,trigger,everyDays}))(readRitme(f)),spot:f.elements.spot.value,cat:f.elements.cat.value,wie:validWie(f.elements.wie.value),punten:clampPts(f.elements.punten.value,null)},true)); }
  else if(f.id==='f-kal-af'){ const t=f.elements.titel.value.trim(); if(t) safe(addAfspraak(t.slice(0,120),calSel,f.elements.prep.value.trim().slice(0,240))); }
  else if(f.dataset.onceedit){ const due=f.elements.due.value; safe(put('tasks',f.dataset.onceedit,{name:f.elements.name.value.trim()||'Taak',due:/^\d{4}-\d{2}-\d{2}$/.test(due)?due:null,wie:validWie(f.elements.wie.value)},true)); }
  else if(f.dataset.prepadd){ const e=events().find(x=>x.key===f.dataset.prepadd); const t=f.elements.titel.value.trim(); if(e&&t){ const items=prepItems(e).slice(); items.push({id:uid(),titel:t.slice(0,100),dagen:Math.max(0,Math.min(120,Number(f.elements.dagen.value)||7)),wie:validWie(f.elements.wie.value)}); openPrep.add(tplKey(e)); safe(savePrep(e,items)); } }
  else if(f.id==='f-shop'){ const inp=f.querySelector('input'); const n=inp.value.trim(); inp.value=''; if(n) safe(addShop(n)); }
  else if(f.id==='f-af'){ safe(addAfspraak($('#af-titel').value.trim(),$('#af-datum').value,$('#af-prep').value.trim())); }
  else if(f.id==='f-dag'){ const t=$('#dg-titel').value.trim(), d=$('#dg-datum').value; if(t&&d) safe(addDag(t,$('#dg-type').value,d,$('#dg-cadeau').checked,$('#dg-rem').value,$('#dg-geenjaar').checked)); }
  else if(f.id==='f-me'){ saveMe(); }
  else if(f.id==='f-rw'){ const t=$('#rw-titel').value.trim(); if(t){ safe(addReward(t,$('#rw-voor').value,$('#rw-herhaal').checked)); $('#rw-titel').value=''; } }
  else if(f.id==='f-rwcfg'){ safe(put('household','main',{drempelSamen:Math.max(10,Number($('#c-samen').value)||200),minAandeel:Math.max(0,Math.min(50,Number($('#c-aandeel').value)||0)),drempelSolo:Math.max(10,Number($('#c-solo').value)||100)},true).then(()=>flash('#cfg-saved'))); }
  else if(f.id==='f-hh'){ saveHH(); }
  else if(f.dataset.fmeta){ safe(put('fotos',f.dataset.fmeta,{merk:f.elements.merk.value.trim().slice(0,60),type:f.elements.type.value.trim().slice(0,80),notitie:f.elements.notitie.value.trim().slice(0,300)},true)); }
  else if(f.id==='f-lock'){ tryCode($('#lock-code').value.trim()); }
  else if(f.id==='f-setup'){ doSetup(); }
  else if(f.id==='f-plaats'){ zoekUI($('#pl-q'),$('#pl-res'),'inst'); }
  else if(f.id==='f-bew'){ const names=[$('#bw-1').value.trim(),$('#bw-2').value.trim()]; if(!names[0]||!names[1]) return; const bw=bewoners(); safe(put('household','main',{bewoners:[{id:bw[0]?.id||'p1',naam:names[0]},{id:bw[1]?.id||'p2',naam:names[1]}]},true).then(()=>flash('#bw-saved'))); }
});
document.addEventListener('click',e=>{ if(e.target.closest('#su-zoek')) zoekUI($('#su-plaats'),$('#su-plaats-res'),'setup'); });
document.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.id==='su-plaats'){ e.preventDefault(); zoekUI($('#su-plaats'),$('#su-plaats-res'),'setup'); } });
function zoekUI(inp,out,mode){ const q=inp.value.trim(); if(!q) return; out.textContent='Zoeken…';
  zoekPlaats(q).then(rs=>{ out.innerHTML=rs.length?`<div class="suggest" data-plaats-for="${mode}">${rs.map(r=>`<button type="button" data-plaats="${esc(JSON.stringify(r))}">${esc(r.naam)} <span class="muted">${esc(r.regio)}</span></button>`).join('')}</div>`:'Niets gevonden. Probeer een andere schrijfwijze.'; }).catch(()=>{ out.textContent='Zoeken lukte niet. Is er internet?'; }); }

/* ---------- settings ---------- */
const PF=[['naam','p-naam','Naam'],['verjaardag','p-verjaardag','Verjaardag'],['kleding','p-kleding','Kledingmaat'],['sok','p-sok','Sokmaat'],['schoen','p-schoen','Schoenmaat'],['eten','p-eten','Eten en dieet'],['merken','p-merken','Merken'],['wens','p-wens','Cadeau-ideeën'],['overig','p-overig','Verder']];
function fillSettings(){
  renderRewardSettings();
  const me=S.profiles[S.meId]||{}; PF.forEach(([k,id])=>{ const el=$('#'+id); if(document.activeElement!==el) el.value=me[k]||''; });
  $('#h-naam').value=S.hh.naam||''; $('#h-over').value=S.hh.over||'';
  const others=Object.entries(S.profiles).filter(([id])=>id!==S.meId);
  const other=bewoners().find(b=>b.id!==S.meId); const op=other?S.profiles[other.id]:null;
  $('#partner-card').innerHTML=`<h2>${esc(other?other.naam:'Partner')}</h2>`+(op&&PF.some(([k])=>op[k])?`<div class="form-grid">${PF.filter(([k])=>op[k]).map(([k,,l])=>`<div><div class="eyebrow">${l}</div><div>${esc(op[k])}</div></div>`).join('')}</div>`:`<div class="empty">${esc(other?other.naam:'Je partner')} vult dit zelf in, op het eigen apparaat. Zodra dat profiel is opgeslagen, verschijnt het hier en komt de verjaardag vanzelf in de kalender.</div>`);
  const bw=bewoners(); if(document.activeElement!==$('#bw-1')) $('#bw-1').value=bw[0]?.naam||''; if(document.activeElement!==$('#bw-2')) $('#bw-2').value=bw[1]?.naam||'';
  $('#pl-now').textContent=S.hh.plaats?`Nu: ${S.hh.plaats.naam}${S.hh.plaats.regio?', '+S.hh.plaats.regio:''}`:'Nog geen woonplaats ingesteld.';
  $('#mode-txt').textContent=Store.remote?'Gekoppeld aan jullie gedeelde database. Wijzigingen verschijnen binnen een halve minuut op het andere apparaat.':'Proefmodus: alles staat alleen op dit apparaat. Volg de uitleg in de README om de gedeelde database te koppelen.';
  $('#code-reset').hidden=!Store.remote;
}
function flash(id){ const el=$(id); el.hidden=false; setTimeout(()=>el.hidden=true,1800); }
async function saveMe(){ if(!S.meId) return; const d={}; PF.forEach(([k,id])=>d[k]=$('#'+id).value.trim()); d.updated=new Date().toISOString();
  safe(put('profiles',S.meId,d).then(()=>flash('#me-saved'))); }
async function saveHH(){ safe(put('household','main',{naam:$('#h-naam').value.trim(),over:$('#h-over').value.trim()},true).then(()=>flash('#hh-saved'))); }

/* ---------- kalender-tab ---------- */
let calMonth=null, calSel=null;
const MAANDEN=['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
const KIND={verjaardag:['var(--p2)','verjaardag'],jubileum:['var(--p2)','jubileum'],overig:['var(--p2)','bijzondere dag'],afspraak:['var(--accent)','afspraak'],feestdag:['var(--muted)','feestdag'],taak:['var(--warn)','taak met deadline'],prep:['var(--warn)','voorbereiding begint']};
function dayMap(y,m){
  const map={}; const add=(k,it)=>{ (map[k]||(map[k]=[])).push(it); };
  const occ=occurrences([y-1,y,y+1]);
  occ.forEach(e=>{ add(ymd(e.date),{kind:e.type,titel:e.titel+(e.age?` wordt ${e.age}`:'')+(e.jaren?` (${e.jaren} jaar)`:''),e});
    prepItems(e).forEach(it=>{ const dd=Number(it.dagen); if(dd>0) add(ymd(addD(e.date,-dd)),{kind:'prep',titel:`${it.titel}`,sub:e.titel,wie:it.wie,done:isGeregeld(e,it),key:e.key+'|'+it.id}); }); });
  S.tasks.filter(t=>t.once&&t.due).forEach(t=>add(t.due,{kind:'taak',titel:t.name,wie:t.wie,done:!!t.done,t}));
  return map;
}
function renderKalender(){
  if($('#v-kalender').hidden){ return; }
  const now=new Date(); if(!calMonth) calMonth=new Date(now.getFullYear(),now.getMonth(),1); if(!calSel) calSel=ymd(now);
  const y=calMonth.getFullYear(), m=calMonth.getMonth(), map=dayMap(y,m);
  const first=new Date(y,m,1), start=addD(first,-((first.getDay()+6)%7));
  let cells=''; for(let i=0;i<42;i++){ const d=addD(start,i), k=ymd(d), its=map[k]||[], other=d.getMonth()!==m;
    if(i===35&&other) break;
    const kinds=[...new Set(its.map(x=>x.kind))].slice(0,4);
    cells+=`<button class="cal-day${other?' other':''}${k===ymd(now)?' today':''}${k===calSel?' sel':''}" data-calday="${k}" aria-label="${d.getDate()} ${MAANDEN[d.getMonth()]}${its.length?`, ${its.length} ${its.length===1?'item':'items'}`:''}"><span class="cal-n">${d.getDate()}</span><span class="cal-dots">${kinds.map(kd=>kd==='prep'?`<i style="border:1.5px solid ${KIND[kd][0]};background:none"></i>`:`<i style="background:${KIND[kd][0]}"></i>`).join('')}</span></button>`; }
  $('#cal-title').textContent=MAANDEN[m]+' '+y;
  $('#cal-grid').innerHTML=['ma','di','wo','do','vr','za','zo'].map(d=>`<span class="cal-dow">${d}</span>`).join('')+cells;
  const sel=dateFrom(calSel), its=map[calSel]||[];
  $('#cal-day').innerHTML=`<div class="samen-head"><h2>${sel.toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})}</h2><span class="muted">${whenTxtAny(daysUntil(sel))}</span></div>
    ${its.length?`<ul class="list">${its.map(x=>`<li><i class="dot" style="${x.kind==='prep'?`border:2px solid ${KIND[x.kind][0]};background:none`:`background:${KIND[x.kind][0]}`};flex:none"></i><span><b style="${x.done?'text-decoration:line-through;color:var(--muted)':''}">${esc(x.titel)}</b>${whoBadge(x.wie)}<br><span class="muted">${esc(KIND[x.kind][1])}${x.sub?` · ${esc(x.sub)}`:''}</span></span>${x.kind==='prep'&&!x.done?`<button class="btn small" data-regel="${esc(x.key)}">Geregeld</button>`:x.kind==='taak'&&!x.done?`<button class="btn small" data-oncedone="${x.t.id}">Klaar</button>`:''}</li>`).join('')}</ul>`:'<p class="muted" style="margin:0">Niets op deze dag.</p>'}
    <form class="stack" id="f-kal-af" style="gap:8px;margin-top:4px"><h3>Afspraak op deze dag</h3><input type="text" name="titel" placeholder="Bijv. tandarts 10:30" required aria-label="Afspraak"><input type="text" name="prep" placeholder="Voorbereiding, bijv. pasje mee (mag leeg)" aria-label="Voorbereiding"><div><button class="btn" type="submit">Afspraak toevoegen</button></div></form>`;
  $('#cal-legend').innerHTML=Object.entries(KIND).filter(([k])=>!['jubileum','overig'].includes(k)).map(([k,[c,l]])=>`<span><i class="dot" style="${k==='prep'?`border:2px solid ${c};background:none`:`background:${c}`}"></i>${l}</span>`).join('');
  $('#kal-body').innerHTML=kalenderHtml();
}
function whenTxtAny(n){ return n===0?'vandaag':n===1?'morgen':n===-1?'gisteren':n>0?`over ${n} dagen`:`${-n} dagen geleden`; }

/* ---------- lijst-tab ---------- */
function renderLijst(){ if($('#v-lijst').hidden){ $('#lijst-body').innerHTML=''; return; } const keep=document.activeElement&&document.activeElement.id==='shop-in'?$('#shop-in').value:null;
  $('#lijst-body').innerHTML=specialHtml('boodschappen'); if(keep!==null){ $('#shop-in').value=keep; $('#shop-in').focus(); } }

/* ---------- wie ben jij ---------- */
function renderWho(){ const bw=bewoners(); const sel=$('#who-sel');
  sel.innerHTML=bw.map(b=>`<option value="${esc(b.id)}" ${b.id===S.meId?'selected':''}>${esc(personName(b.id))}</option>`).join('');
  $('#who-wrap').hidden=bw.length<2; }
function kiesIk(id){ if(!bewoners().some(b=>b.id===id)) return; S.meId=id; lsSet(LS.me,id); $('#who').hidden=true; rerender(); }
function needWho(){ const bw=bewoners(); if(bw.length<2) return false; if(bw.some(b=>b.id===S.meId)) return false;
  $('#who-btns').innerHTML=bw.map(b=>`<button class="btn" data-who="${esc(b.id)}">${esc(personName(b.id))}</button>`).join(''); $('#who').hidden=false; return true; }

/* ---------- opstarten ---------- */
let setupPlaats=null, pollTimer=null, lastFull=0;
function rerender(){ if(!S.loaded) return; renderWho(); renderHome(); renderSheet(); renderLijst(); renderKalender(); if(!$('#v-inst').hidden) fillSettings(); if(!$('#v-punten').hidden) renderRewardSettings(); }
async function poll(){
  if(!S.loaded&&!S.connecting) return;
  try{
    if(Date.now()-lastFull>10*60e3){ Store.resetSince(); lastFull=Date.now(); }
    const {rows,full}=await Store.changes();
    if(full||rows.length){ applyRows(rows,full); rerender(); }
    $('#banner').hidden=true;
  }catch(e){
    if(e&&e.code==='bad_code'){ lsSet(LS.code,null); showLock('De huiscode klopt niet meer. Vul de nieuwe code in.'); return; }
    $('#banner').hidden=false; $('#banner').textContent=e&&e.code==='offline'?'Geen internet. Je ziet de laatst bekende stand.':'Verbinding met de database hapert: '+(e&&e.message||'')+'.';
  }
}
function showLock(msg){ $('#lock').hidden=false; $('#lock-err').textContent=msg||''; setTimeout(()=>$('#lock-code').focus(),50); }
async function tryCode(code){ if(!code) return; $('#lock-err').textContent='Even controleren…'; Store.setCode(code);
  try{ const {rows,full}=await Store.changes(); lsSet(LS.code,code); $('#lock').hidden=true; applyRows(rows,full); lastFull=Date.now(); afterLoad(); }
  catch(e){ $('#lock-err').textContent=e&&e.code==='bad_code'?'Deze code klopt niet.':e&&e.code==='offline'?'Geen verbinding. Is er internet?':'Er ging iets mis: '+(e&&e.message||'onbekend'); } }
function afterLoad(){ S.loaded=true;
  if(bewoners().length<2){ $('#setup').hidden=false; return; }
  $('#setup').hidden=true; S.meId=lsGet(LS.me); needWho(); rerender(); loadWeather();
  clearInterval(pollTimer); pollTimer=setInterval(()=>{ if(document.visibilityState==='visible') poll(); },20000); }
async function doSetup(){
  const n1=$('#su-1').value.trim(), n2=$('#su-2').value.trim(); if(!n1||!n2){ $('#su-err').textContent='Vul allebei de namen in.'; return; }
  $('#su-err').textContent='Bezig met instellen…'; $('#su-go').disabled=true;
  const ops=[{op:'merge',c:'household',id:'main',data:{naam:$('#su-huis').value.trim()||'Ons huis',bewoners:[{id:'p1',naam:n1},{id:'p2',naam:n2}],plaats:setupPlaats||null}}];
  if($('#su-seed').checked&&Array.isArray(window.ONS_HUIS_SEED)) window.ONS_HUIS_SEED.forEach(t=>{ const {id,...data}=t; ops.push({op:'set',c:'tasks',id,data}); });
  try{ await batch(ops); $('#setup').hidden=true; $('#su-go').disabled=false; afterLoad(); }
  catch(e){ $('#su-err').textContent='Instellen lukte niet: '+(e&&e.message||'onbekend'); $('#su-go').disabled=false; } }
async function boot(){
  if(!Store.remote){ $('#banner').hidden=false; $('#banner').textContent='Proefmodus: gegevens staan alleen op dit apparaat. Koppel de database (zie de uitleg) om samen te delen.'; }
  if(Store.remote){ const c=lsGet(LS.code); if(!c){ showLock(); return; } Store.setCode(c); }
  S.connecting=true;
  try{ const {rows,full}=await Store.changes(); applyRows(rows,full); lastFull=Date.now(); afterLoad(); }
  catch(e){ if(e&&e.code==='bad_code'){ lsSet(LS.code,null); showLock('De huiscode klopt niet meer. Vul de nieuwe code in.'); return; }
    $('#banner').hidden=false; $('#banner').textContent='Kan de gegevens niet ophalen: '+(e&&e.message||'onbekend')+'. Probeer het zo opnieuw.'; setTimeout(boot,15000); }
}
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&S.loaded){ poll(); loadWeather(); } });
boot();
setInterval(()=>{ if(S.loaded){ renderHome(); loadWeather(); } },60000);
if('serviceWorker' in navigator&&location.protocol==='https:') navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
