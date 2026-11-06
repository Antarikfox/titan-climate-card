/* TITAN MECHA Climate · by Antarikfox · MIT */
import {clamp,numeric,status,interpolate,historySegments,validateConfig} from './logic.mjs';
const BACKPLATE='__BACKPLATE__';
const NS='http://www.w3.org/2000/svg';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const style=`
:host{display:block;--cyan:#7ee9f4;--amber:#ffc16b;--hot:#ffb24c;--ink:#f3fbff;--body-opacity:1;--led-brightness:.7;font-family:'Segoe UI',Arial,sans-serif;contain:content}
*{box-sizing:border-box}ha-card{display:block;background:transparent!important;border:0!important;box-shadow:none!important;overflow:hidden;border-radius:0}
.stage{position:relative;width:100%;aspect-ratio:1;isolation:isolate;container-type:inline-size;background:transparent;border-radius:22px}
.backplate{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:var(--body-opacity)}
svg.scene{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.scene text{fill:var(--ink);font-family:'Segoe UI',Arial,sans-serif;font-variant-numeric:tabular-nums}.scene .tech{font-family:'Bahnschrift','Consolas',monospace;letter-spacing:1px}.scene .muted{fill:#b4c9d0}.scene .dim{fill:#78949e}.scene .label{letter-spacing:2px}
.readouts{transition:opacity .8s}.offline .readouts{opacity:.62}.offline #status{fill:#e7b084}.offline .energy{opacity:.1;animation:none}.offline .led-bank{opacity:.12}
.led-bank{opacity:var(--led-brightness)}.led{animation:ledBlink var(--duration) linear infinite;animation-delay:var(--delay);opacity:.65}.energy{animation:energyBreath 18s ease-in-out infinite;opacity:.5}
@keyframes ledBlink{0%,82%,89%,100%{opacity:.62}83.5%{opacity:.12}85%{opacity:1}86.5%{opacity:.22}88%{opacity:.7}}
@keyframes energyBreath{0%,100%{opacity:.27}50%{opacity:.53}}
.paused *,.reduced *,.off *{animation-play-state:paused!important}.reduced .led,.off .led{opacity:.55;animation:none}.reduced .energy,.off .energy{opacity:.35;animation:none}.leds-off .led-bank,.leds-off .energy{display:none}
.hit{position:absolute;background:transparent;color:transparent;border:0;padding:0;border-radius:8px;cursor:pointer}.hit:focus-visible{outline:2px solid var(--cyan);outline-offset:2px;background:#7ee9f415}.hit.temp{left:32%;top:35.5%;width:39%;height:6%}.hit.hum{left:32%;top:56.8%;width:39%;height:6%}.hit.graph-t{left:36.2%;top:43.5%;width:33.8%;height:6.2%}.hit.graph-h{left:36.2%;top:64.3%;width:33.8%;height:6.2%}
.tooltip{position:absolute;display:none;z-index:4;background:#101820f5;border:1px solid #8dc5ce;border-radius:8px;padding:8px 10px;font-size:clamp(10px,1.7cqw,14px);color:#e9fdff;pointer-events:none;white-space:nowrap;box-shadow:0 8px 25px #0008}.tooltip.open{display:block}
@media(prefers-reduced-motion:reduce){.led,.energy{animation:none!important}}
`;
class TitanClimateCard extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this._connected=false;this._segments=[[],[]];this._drawn=[[],[]];this._historyCache=new Map();this._visible=true;this._reduced=matchMedia('(prefers-reduced-motion: reduce)');this._mediaChange=()=>this._motion();this._visibility=()=>this._motion();this._lastHistory=0;this._lastFrame=0;this._liquid=.48;this._targetLiquid=.48;this._raf=0;this._generation=0;this._historyToken=0;}
  static getStubConfig(){return {name:'Гостиная',temperature_entity:'sensor.gostinaia_klimat_temperatura',humidity_entity:'sensor.gostinaia_klimat_vlazhnost',animations:'full',show_sparkline:true,precision:1};}
  static getConfigElement(){return document.createElement('titan-climate-editor');}
  setConfig(config){validateConfig(config);this._config={name:'Спальня',precision:1,animations:'full',show_sparkline:true,show_last_updated:true,show_battery:true,background_opacity:0,body_opacity:1,leds_enabled:true,led_brightness:.7,...config};this._lastHistory=0;this._historyToken++;this._historyCache.clear();this._segments=[[],[]];this._drawn=[[],[]];this._plotTargets=[[],[]];this._from=[[],[]];this._lastValues=null;if(this._connected){this._render();this._update();}}
  set hass(hass){this._hass=hass;if(this._connected&&this._config)this._update();}
  getCardSize(){return 7;}
  getGridOptions(){return {columns:12,rows:7,min_columns:6,min_rows:4};}
  connectedCallback(){this._connected=true;if(!this._config)this.setConfig({...TitanClimateCard.getStubConfig()});else this._render();this._observer=new IntersectionObserver(([e])=>{this._visible=e.isIntersecting;this._motion();});this._observer.observe(this);this._reduced.addEventListener('change',this._mediaChange);document.addEventListener('visibilitychange',this._visibility);this._clock=setInterval(()=>{this._updatedText();if(this._config?.demo)return;if(Date.now()-this._lastHistory>300000)this._loadHistory();},30000);this._update();}
  disconnectedCallback(){this._connected=false;this._generation++;this._historyToken++;this._observer?.disconnect();this._reduced.removeEventListener('change',this._mediaChange);document.removeEventListener('visibilitychange',this._visibility);clearInterval(this._clock);clearTimeout(this._singleTap);clearTimeout(this._hold);cancelAnimationFrame(this._raf);this._raf=0;}
  _render(){
    cancelAnimationFrame(this._raf);this._raf=0;this._lastFrame=0;
    const led=(x,y,color,angle=0,length=20,duration=13,delay=0)=>`<g class="led" style="--duration:${duration}s;--delay:-${delay}s" transform="translate(${x} ${y}) rotate(${angle})"><rect x="${-length/2-3}" y="-5" width="${length+6}" height="10" rx="5" fill="${color}" filter="url(#ledGlow)" opacity=".75"/><rect x="${-length/2}" y="-2" width="${length}" height="4" rx="2" fill="${color}"/><rect x="${-length/2+2}" y="-1" width="${Math.max(2,length-4)}" height="2" rx="1" fill="#f5ffff" opacity=".85"/></g>`;
    this.shadowRoot.innerHTML=`<style>${style}</style><ha-card><div class="stage"><img class="backplate" alt="Белый матовый корпус TITAN с полупрозрачной бронёй и кабелями" src="${BACKPLATE}"><svg class="scene" viewBox="0 0 1254 1254" role="img" aria-label="Климатический датчик TITAN">
    <defs><filter id="ledGlow" x="-200%" y="-400%" width="500%" height="900%"><feGaussianBlur stdDeviation="4"/></filter>
    <linearGradient id="fade0" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--cyan)" stop-opacity=".28"/><stop offset="1" stop-color="var(--cyan)" stop-opacity="0"/></linearGradient>
    <linearGradient id="fade1" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--amber)" stop-opacity=".28"/><stop offset="1" stop-color="var(--amber)" stop-opacity="0"/></linearGradient>
    <radialGradient id="energy"><stop stop-color="#ffe9b5" stop-opacity=".9"/><stop offset=".35" stop-color="#ffc865" stop-opacity=".55"/><stop offset="1" stop-color="#ffba4f" stop-opacity="0"/></radialGradient>
    <clipPath id="graphclip0"><rect x="455" y="548" width="420" height="63"/></clipPath><clipPath id="graphclip1"><rect x="455" y="810" width="420" height="63"/></clipPath></defs>
    <g class="readouts">
    <text id="room" x="455" y="439" font-size="17" class="muted label"></text><text id="status" x="875" y="439" text-anchor="end" font-size="15" class="muted"></text>
    <g transform="translate(452 483)" stroke="var(--cyan)" stroke-width="3.5" fill="none" stroke-linecap="round"><path d="M-6-26v31a12 12 0 1 0 12 0v-31a6 6 0 0 0-12 0Z"/><path d="M0-12v25"/><path d="M14-20h5m-5 8h5m-5 8h5"/></g>
    <text id="temperature" x="529" y="514" font-size="82" font-weight="500" class="tech">—</text>
    <g transform="translate(452 743)" stroke="var(--cyan)" stroke-width="3.5" fill="none"><path d="M0-24C-9-10-24 4-23 15C-21 41 21 41 23 15C24 4 9-10 0-24Z"/></g>
    <text id="humidity" x="543" y="779" font-size="86" class="tech">—</text><text id="humidityStatus" x="875" y="714" text-anchor="end" font-size="15" class="muted"></text>
    ${[0,1].map(i=>{const y=548+i*262;return `<g class="plot" id="plot${i}">
    <g stroke="#8097a7" stroke-opacity=".14" stroke-width="1">${[0,1,2].map(j=>`<path d="M455 ${y+j*31}h420"/>`).join('')}${[0,1,2,3,4].map(j=>`<path d="M${455+j*105} ${y}v63" stroke-dasharray="2 8"/>`).join('')}</g>
    <g clip-path="url(#graphclip${i})"><path id="area${i}" fill="url(#fade${i})"/><path id="line${i}" fill="none" stroke="${i?'var(--amber)':'var(--cyan)'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle id="dot${i}" r="4.5" fill="${i?'#ffdf9c':'#d3fdff'}"/></g>
    <text id="range${i}hi" x="442" y="${y+5}" font-size="17" text-anchor="end" class="muted"></text><text id="range${i}lo" x="442" y="${y+63}" font-size="17" text-anchor="end" class="muted"></text><text id="empty${i}" x="668" y="${y+37}" text-anchor="middle" font-size="19" class="muted">Нет истории</text>
    ${['−24ч','−18ч','−12ч','−6ч','сейчас'].map((s,j)=>`<text x="${455+j*105}" y="${y+88}" font-size="15" text-anchor="${j===0?'start':j===4?'end':'middle'}" class="muted">${s}</text>`).join('')}</g>`;}).join('')}
    <text id="updated" x="671" y="653" font-size="12" text-anchor="middle" class="dim"></text>
    <g id="batteryGroup" transform="translate(510 704)"><rect x="0" y="-11" width="27" height="12" rx="2" fill="none" stroke="#7b9ba6" stroke-width="1.5"/><path d="M29-8v6" stroke="#7b9ba6" stroke-width="2"/><rect id="batteryFill" x="3" y="-8" width="21" height="6" rx="1" fill="#a9e3e8"/><text id="battery" x="35" y="0" font-size="14" class="muted"></text></g>
    </g>
    <g class="led-bank" pointer-events="none">
    ${led(984,338,'#73f3ff',0,31,14.7,3.2)}${led(1083,298,'#ffc861',68,20,17.3,7.8)}${led(278,614,'#ffc861',90,27,11.9,4.1)}
    ${led(321,806,'#87f4ff',0,5,9.7,5)}${led(321,830,'#87f4ff',0,5,12.3,2)}${led(323,854,'#87f4ff',0,5,15.1,11)}
    ${led(532,1118,'#81f5ff',0,28,19.3,9)}${led(976,1019,'#ffc861',-59,23,16.1,1.4)}
    </g><g class="energy" pointer-events="none"><circle cx="1037" cy="580" r="43" fill="url(#energy)"/></g>
    </svg><button class="hit temp" data-entity="temperature_entity" aria-label="Открыть температуру"></button><button class="hit hum" data-entity="humidity_entity" aria-label="Открыть влажность"></button><button class="hit graph-t" data-graph="0" data-entity="temperature_entity" aria-label="График температуры за 24 часа"></button><button class="hit graph-h" data-graph="1" data-entity="humidity_entity" aria-label="График влажности за 24 часа"></button><div class="tooltip" role="status"></div></div></ha-card>`;
    this._stage=this.shadowRoot.querySelector('.stage');this._appearance();
    for(const hit of this.shadowRoot.querySelectorAll('.hit')){
      hit.addEventListener('click',()=>{if(this._held){this._held=false;return;}clearTimeout(this._singleTap);this._singleTap=setTimeout(()=>this._action(this._config.tap_action,hit.dataset.entity),230);});
      hit.addEventListener('dblclick',()=>{clearTimeout(this._singleTap);this._action(this._config.double_tap_action||this._config.tap_action,hit.dataset.entity);});
      hit.addEventListener('pointerdown',()=>{this._held=false;this._hold=setTimeout(()=>{this._held=true;this._action(this._config.hold_action,hit.dataset.entity);},600);});
      for(const event of ['pointerup','pointerleave','pointercancel'])hit.addEventListener(event,()=>clearTimeout(this._hold));
      if(hit.dataset.graph!=null){hit.addEventListener('pointermove',e=>this._tooltip(e,Number(hit.dataset.graph)));hit.addEventListener('pointerleave',()=>this.shadowRoot.querySelector('.tooltip').classList.remove('open'));}
    }
    this._motion();
  }
  _appearance(){
    if(!this._stage)return;const c=this._config;
    this._stage.style.backgroundColor=`rgba(12,17,24,${clamp(Number(c.background_opacity)||0,0,1)})`;
    this._stage.style.backdropFilter=`blur(${clamp(Number(c.background_blur)||0,0,30)}px)`;
    this.style.setProperty('--body-opacity',String(clamp(Number(c.body_opacity??1),0,1)));
    this.style.setProperty('--led-brightness',String(clamp(Number(c.led_brightness??.7),0,1)));
    this.style.setProperty('--cyan',/^#[0-9a-f]{6}$/i.test(c.accent||'')?c.accent:'#7ee9f4');
    this._stage.classList.toggle('leds-off',c.leds_enabled===false);
  }
  setAppearance(options){const next={...this._config};for(const key of ['background_opacity','background_blur','body_opacity','led_brightness','leds_enabled','animations'])if(key in options)next[key]=options[key];validateConfig(next);this._config=next;this._appearance();this._motion();}
  _el(id){return this.shadowRoot.getElementById(id);}
  _text(id,value){const el=this._el(id);if(el&&el.textContent!==String(value))el.textContent=value;}
  _update(){
    if(!this._stage||!this._config)return;
    const c=this._config,states=this._hass?.states||{},ts=states[c.temperature_entity],hs=states[c.humidity_entity];
    const t=c.demo?(this._demo?this._demo.t:22.5):numeric(ts),h=c.demo?(this._demo?this._demo.h:48):numeric(hs);
    const unit=c.demo?'°C':ts?.attributes?.unit_of_measurement||'°C';
    const tc=t==null?null:unit==='°F'?(t-32)*5/9:t;
    const st=status(tc,h,c.thresholds);this._state={t,h,unit,status:st};
    this.style.setProperty('--hot',st.color);
    this._stage.classList.toggle('offline',t==null||h==null);
    const tempText=t==null?'—':t.toFixed(clamp(Number(c.precision),0,2))+unit;
    this._text('temperature',tempText);this._el('temperature').setAttribute('font-size',String(Math.min(82,350/(tempText.length*.60))));
    this._text('humidity',h==null?'—':Math.round(h)+'%');
    const room=String(c.name||'Климат');this._text('room',room.length>16?room.slice(0,15)+'…':room.toUpperCase());
    this._el('room').setAttribute('font-size',room.length>12?'14':'17');
    this._text('status',String(c.labels?.[st.key]||st.name).toUpperCase());
    this._el('status').setAttribute('font-size',st.key==='offline'?'12':'15');this._text('humidityStatus',st.humidity.toUpperCase());
    const b=c.demo?92:numeric(states[c.battery_entity]);this._el('batteryGroup').style.display=c.show_battery===false||b==null?'none':'';
    this._text('battery',b==null?'—':Math.round(clamp(b,0,100))+'%');this._el('batteryFill').setAttribute('width',String(clamp(b??0,0,100)*.21));
    for(const p of this.shadowRoot.querySelectorAll('.plot'))p.style.display=c.show_sparkline===false?'none':'';
    for(const p of this.shadowRoot.querySelectorAll('[data-graph]'))p.style.display=c.show_sparkline===false?'none':'';
    this._el('updated').style.display=c.show_last_updated===false?'none':'';
    this.shadowRoot.querySelector('.scene').setAttribute('aria-label',`${room}: температура ${t??'нет данных'} ${unit}, влажность ${h??'нет данных'} процентов. ${st.name}`);
    this._updatedText();this._motion();
    if(!c.demo){
      const vals=[t,h],previous=this._lastValues;this._lastValues=vals;
      if(previous&&vals.some((v,i)=>v!==previous[i])){
        const end=Date.now(),start=end-86400000;
        const next=this._segments.map((parts,i)=>{
          const copy=parts.map(part=>part.filter(p=>p[0]>=start).map(p=>[...p])).filter(part=>part.length);
          const tail=copy[copy.length-1];
          if(vals[i]!=null){
            if(previous[i]!=null&&tail){if(tail[tail.length-1][0]===end)tail[tail.length-1][1]=vals[i];else tail.push([end,vals[i]]);}
            else if(copy.length)copy.push([[end,vals[i]]]);
          }else if(previous[i]!=null&&tail)tail.push([end,previous[i]]);
          return copy;
        });this._historyEnd=end;this._setHistory(next);
      }
      this._loadHistory();
    }
  }
  _updatedText(){if(!this._stage)return;const c=this._config;if(c.demo){this._text('updated','ДЕМО · синтетические данные');return;}
    const s=this._hass?.states||{},times=[s[c.temperature_entity]?.last_updated,s[c.humidity_entity]?.last_updated].map(Date.parse).filter(Number.isFinite);
    if(!times.length){this._text('updated','Нет связи с датчиками');return;}const sec=Math.max(0,Math.floor((Date.now()-Math.min(...times))/1000));
    this._text('updated',sec<60?'Обновлено только что':sec<3600?`Обновлено ${Math.floor(sec/60)} мин назад`:`Обновлено ${Math.floor(sec/3600)} ч назад`);
  }
  _motion(){if(!this._stage)return;const c=this._config,paused=!this._connected||!this._visible||document.hidden;
    this._stage.classList.toggle('paused',paused);this._stage.classList.toggle('reduced',c.animations==='reduced'||this._reduced.matches);this._stage.classList.toggle('off',c.animations==='off');
    this._animated=!paused&&c.animations==='full'&&!this._reduced.matches&&this._state?.t!=null&&this._state?.h!=null;
    if(paused){cancelAnimationFrame(this._raf);this._raf=0;return;}
    if(c.animations==='off'||this._reduced.matches){cancelAnimationFrame(this._raf);this._raf=0;this._lastFrame=0;this._frame(performance.now());return;}
    if(!this._raf)this._raf=requestAnimationFrame(t=>this._frame(t));
  }
  _frame(now){
    this._raf=0;if(!this._connected||!this._visible||document.hidden)return;
    const instant=this._config.animations==='off'||this._reduced.matches;
    if(this._drawPlots(now,instant))this._raf=requestAnimationFrame(t=>this._frame(t));
  }
  _setHistory(segments){
    this._from=this._drawn.map(s=>s.map(p=>({...p})));
    this._segments=segments;this._plotTargets=segments.map((parts,index)=>{
      const values=parts.flat().map(p=>p[1]);if(!values.length){this._text('range'+index+'hi','');this._text('range'+index+'lo','');return [];}
      const lo=Math.min(...values),hi=Math.max(...values),pad=Math.max(index?2:.5,(hi-lo)*.15);this._ranges??=[];this._ranges[index]=[lo-pad,hi+pad];
      this._text('range'+index+'hi',(hi+pad).toFixed(index?0:1)+(index?'%':this._state?.unit||'°C'));
      this._text('range'+index+'lo',(lo-pad).toFixed(index?0:1)+(index?'%':this._state?.unit||'°C'));
      const end=this._historyEnd||Date.now(),start=end-86400000;
      return parts.flatMap((part,seg)=>{if(!part.length)return [];const x0=Math.max(start,part[0][0]),x1=Math.min(end,part[part.length-1][0]);if(x1<x0)return [];
        const n=Math.max(2,Math.ceil((x1-x0)/86400000*240));return Array.from({length:n},(_,j)=>{const time=x0+(x1-x0)*j/(n-1);return {x:455+(time-start)/86400000*420,y:548+index*262+63-(interpolate(part,time)-(lo-pad))/(hi-lo+2*pad)*63,seg};});});
    });this._plotStart=performance.now();this._motion();
  }
  _drawPlots(now,instant){let moving=false;
    for(let i=0;i<2;i++){const target=this._plotTargets?.[i]||[];this._el('empty'+i).style.display=target.length?'none':'';
      if(!target.length){this._el('line'+i).setAttribute('d','');this._el('area'+i).setAttribute('d','');this._el('dot'+i).style.display='none';continue;}
      const old=this._from?.[i]||[];const compatible=old.length===target.length&&old.every((p,j)=>p.seg===target[j].seg);
      let u=instant||!compatible?1:clamp((now-this._plotStart)/1400,0,1);if(u<1)moving=true;u=u*u*(3-2*u);
      const pts=target.map((p,j)=>({...p,y:compatible?old[j].y+(p.y-old[j].y)*u:p.y}));this._drawn[i]=pts;
      let d='',area='',lastSeg=-1,firstX=0,lastX=0;const floor=611+i*262;
      for(const p of pts){if(p.seg!==lastSeg){if(lastSeg!==-1)area+=`L${lastX} ${floor}L${firstX} ${floor}Z`;d+=`M${p.x.toFixed(2)} ${p.y.toFixed(2)}`;area+=`M${p.x.toFixed(2)} ${p.y.toFixed(2)}`;firstX=p.x;lastSeg=p.seg;}else {d+=`L${p.x.toFixed(2)} ${p.y.toFixed(2)}`;area+=`L${p.x.toFixed(2)} ${p.y.toFixed(2)}`;}lastX=p.x;}
      area+=`L${lastX} ${floor}L${firstX} ${floor}Z`;this._el('line'+i).setAttribute('d',d);this._el('area'+i).setAttribute('d',area);
      const p=pts[pts.length-1],dot=this._el('dot'+i);dot.style.display='';dot.setAttribute('cx',p.x);dot.setAttribute('cy',p.y);
    }return moving;
  }
  async _loadHistory(){
    if(!this._connected||!this._hass?.callApi||!this._config||this._config.demo||this._config.show_sparkline===false||this._loading||Date.now()-this._lastHistory<300000)return;
    this._loading=true;const token=this._historyToken,c=this._config,now=Date.now();this._lastHistory=now;this._historyEnd=now;
    const start=now-86400000;
    try{const segments=await Promise.all([c.temperature_entity,c.humidity_entity].map(async id=>{
      try{const result=await this._hass.callApi('GET',`history/period/${new Date(start).toISOString()}?filter_entity_id=${encodeURIComponent(id)}&end_time=${new Date(now).toISOString()}&minimal_response&no_attributes`);
        const rows=result?.[0]||[];this._historyCache.set(id,rows);return historySegments(rows,start,now);
      }catch{return historySegments(this._historyCache.get(id)||[],start,now);}
    }));if(token===this._historyToken&&this._connected){this._setHistory(segments);}}
    finally{this._loading=false;if(token!==this._historyToken&&this._connected)this._loadHistory();}
  }
  setDemo(t,h,history){this._demo={t,h};this._update();if(history){this._historyEnd=Date.now();this._setHistory(history);}}
  _tooltip(event,index){const parts=this._segments[index]||[];if(!parts.length)return;const el=this.shadowRoot.querySelector('.tooltip'),rect=this._stage.getBoundingClientRect();const p=clamp((event.clientX-rect.left)/rect.width*1254,455,875);const end=this._historyEnd||Date.now(),time=end-86400000+(p-455)/420*86400000;
    const part=parts.find(a=>time>=a[0][0]&&time<=a[a.length-1][0]);if(!part){el.classList.remove('open');return;}const value=interpolate(part,time),all=parts.flat().map(p=>p[1]);
    el.textContent=`${new Date(time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} · ${value.toFixed(index?0:1)}${index?'%':this._state.unit} · min ${Math.min(...all).toFixed(1)} / max ${Math.max(...all).toFixed(1)}`;
    el.classList.add('open');el.style.left=clamp(event.clientX-rect.left-130,5,Math.max(5,rect.width-el.offsetWidth-5))+'px';el.style.top=Math.max(5,event.clientY-rect.top-45)+'px';
  }
  _action(action,kind){
    const a=action||{action:'more-info'},entity=this._config[kind];if(this._config.demo){this.dispatchEvent(new CustomEvent('titan-demo-action',{detail:{entity,action:a.action},bubbles:true,composed:true}));return;}
    switch(a.action){
      case 'none':return;
      case 'more-info':this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:entity},bubbles:true,composed:true}));break;
      case 'navigate':if(a.navigation_path){history.pushState(null,'',a.navigation_path);window.dispatchEvent(new Event('location-changed'));}break;
      case 'url':if(/^https?:\/\//i.test(a.url_path||''))window.open(a.url_path,'_blank','noopener');break;
      case 'call-service':case 'perform-action':{const service=a.perform_action||a.service;if(service&&this._hass){const [domain,name]=service.split('.');this._hass.callService(domain,name,a.data||a.service_data||{},a.target).catch(()=>{});}break;}
    }
  }
}
class TitanClimateEditor extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});}
  setConfig(c){this._config={...c};this.render();}
  set hass(h){this._hass=h;if(!this.shadowRoot.querySelector('input'))this.render();else this._options();}
  _options(){const list=this.shadowRoot.querySelector('datalist');if(!list)return;list.innerHTML=Object.keys(this._hass?.states||{}).filter(k=>k.startsWith('sensor.')).map(k=>`<option value="${esc(k)}">${esc(this._hass.states[k].attributes.friendly_name||k)}</option>`).join('');}
  render(){if(!this._config)return;const c=this._config;
    const field=(label,key,type='text',value=c[key]??'')=>`<label>${label}<input data-key="${key}" type="${type}" value="${esc(value)}" ${['background_opacity','body_opacity','led_brightness'].includes(key)?'min="0" max="1" step="0.05"':''} ${key.endsWith('_entity')?'list="entities"':''}></label>`;
    this.shadowRoot.innerHTML=`<style>:host{display:block;color:var(--primary-text-color,#eee);font-family:inherit}label{display:block;margin:12px 0;font-size:14px}input,select{display:block;width:100%;margin-top:5px;padding:10px;background:var(--card-background-color,#191919);color:inherit;border:1px solid #777;border-radius:6px}input[type=checkbox]{display:inline;width:auto;margin-right:8px}.note{font-size:12px;opacity:.7}.error{color:#ff8060}</style>
    ${field('Название комнаты','name')}${field('Датчик температуры','temperature_entity')}${field('Датчик влажности','humidity_entity')}${field('Батарея — необязательно','battery_entity')}<datalist id="entities"></datalist>
    <label>Анимации<select data-key="animations">${['full','reduced','off'].map((v,i)=>`<option value="${v}" ${c.animations===v?'selected':''}>${['Полные','Уменьшенные','Выключены'][i]}</option>`).join('')}</select></label>
    ${field('Знаков после запятой (0–2)','precision','number',c.precision??1)}${field('Акцент (#rrggbb)','accent','text',c.accent||'#7ee9f4')}${field('Непрозрачность фона: 0 — прозрачный, 1 — тёмный','background_opacity','number',c.background_opacity??0)}${field('Размытие фона (0–30 px)','background_blur','number',c.background_blur??0)}${field('Непрозрачность корпуса: 0–1','body_opacity','number',c.body_opacity??1)}${field('Яркость светодиодов: 0–1','led_brightness','number',c.led_brightness??.7)}<label><input type="checkbox" data-key="leds_enabled" ${c.leds_enabled!==false?'checked':''}>Подмигивание светодиодов</label>
    <label><input type="checkbox" data-key="show_sparkline" ${c.show_sparkline!==false?'checked':''}>Плавные графики за 24 часа</label><label><input type="checkbox" data-key="show_last_updated" ${c.show_last_updated!==false?'checked':''}>Время обновления</label>
    <details><summary>Пороги статусов, °C и %</summary>${Object.entries({temperature:{cold:16,cool:19,comfort_max:24,warm_max:28},humidity:{dry:30,low:45,optimum_max:60,high:75}}).map(([k,values])=>Object.entries(values).map(([name,def])=>field(k+' / '+name,`thresholds.${k}.${name}`,'number',c.thresholds?.[k]?.[name]??def)).join('')).join('')}</details><p class="note">Тап по показанию открывает соответствующий датчик. Расширенные действия настраиваются в YAML.</p><p class="error"></p>`;
    this._options();
    if(this._changeHandler)this.shadowRoot.removeEventListener('change',this._changeHandler);
    this._changeHandler=e=>{const key=e.target.dataset.key;if(!key)return;const value=e.target.type==='checkbox'?e.target.checked:e.target.type==='number'?Number(e.target.value):e.target.value;
      let next={...this._config};if(key.startsWith('thresholds.')){const [,kind,name]=key.split('.');next.thresholds={...next.thresholds,[kind]:{...next.thresholds?.[kind],[name]:value}};}else next[key]=value;
      if(key==='battery_entity'&&!value)delete next[key];try{validateConfig(next);this.shadowRoot.querySelector('.error').textContent='';this._config=next;this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:next},bubbles:true,composed:true}));}catch(err){this.shadowRoot.querySelector('.error').textContent=err.message;}
    };this.shadowRoot.addEventListener('change',this._changeHandler);
  }
}
if(!customElements.get('titan-climate-card'))customElements.define('titan-climate-card',TitanClimateCard);
if(!customElements.get('titan-climate-editor'))customElements.define('titan-climate-editor',TitanClimateEditor);
window.customCards=window.customCards||[];if(!window.customCards.some(c=>c.type==='titan-climate-card'))window.customCards.push({type:'titan-climate-card',name:'TITAN · MECHA Climate',description:'Белый матовый MECHA датчик с живыми графиками · by Antarikfox',preview:true});
