export const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function numeric(state){
  if(!state || ['unknown','unavailable',''].includes(state.state) || state.state==null)return null;
  const n=Number(state.state);return Number.isFinite(n)?n:null;
}
export function status(t,h,thresholds={}){
  const a={cold:16,cool:19,comfort_max:24,warm_max:28,...thresholds.temperature};
  const b={dry:30,low:45,optimum_max:60,high:75,...thresholds.humidity};
  if(t==null||h==null)return {name:'Сигнал потерян',color:'#8b9299',speed:4,key:'offline',humidity:'Нет данных'};
  const i=t<a.cold?0:t<=a.cool?1:t<=a.comfort_max?2:t<=a.warm_max?3:4;
  const j=h<b.dry?0:h<b.low?1:h<=b.optimum_max?2:h<=b.high?3:4;
  return {name:['Криосон','Прохлада','Гомеостаз','Активация','Перегрев'][i],color:['#79d9ff','#89e6df','#ffb24c','#ff8c34','#ff4e47'][i],speed:[4,3.6,3,1.7,.9][i],key:['cold','cool','comfort','warm','hot'][i],humidity:['Иссушение','Сухо','Оптимум','Насыщение','Спорообразование'][j]};
}
// Fritsch-Carlson monotone cubic Hermite interpolation: smooth, no false extrema.
export function interpolate(points,x){
  if(!points.length)return null;if(points.length===1)return points[0][1];
  if(x<=points[0][0])return points[0][1];
  const last=points.length-1;if(x>=points[last][0])return points[last][1];
  let lo=0,hi=last;while(hi-lo>1){const m=(lo+hi)>>1;if(points[m][0]<=x)lo=m;else hi=m;}
  const slope=i=>(points[i+1][1]-points[i][1])/(points[i+1][0]-points[i][0]);
  const tangent=i=>{
    if(i===0)return slope(0);if(i===last)return slope(last-1);
    const d0=slope(i-1),d1=slope(i);if(d0*d1<=0)return 0;
    const h0=points[i][0]-points[i-1][0],h1=points[i+1][0]-points[i][0];
    const w1=2*h1+h0,w2=h1+2*h0;return (w1+w2)/(w1/d0+w2/d1);
  };
  const h=points[hi][0]-points[lo][0],u=(x-points[lo][0])/h;
  return (2*u**3-3*u**2+1)*points[lo][1]+(u**3-2*u**2+u)*h*tangent(lo)+(-2*u**3+3*u**2)*points[hi][1]+(u**3-u**2)*h*tangent(hi);
}
export function cleanPoints(points){
  const byTime=new Map();for(const [x,y]of points)if(Number.isFinite(x)&&Number.isFinite(y))byTime.set(x,y);
  return [...byTime].sort((a,b)=>a[0]-b[0]);
}
export function historySegments(rows,start,end){
  let segments=[],part=[],lastBefore=null;
  const sorted=[...rows].sort((a,b)=>Date.parse(a.last_changed||a.last_updated)-Date.parse(b.last_changed||b.last_updated));
  for(const s of sorted){const x=Date.parse(s.last_changed||s.last_updated),y=numeric(s);if(!Number.isFinite(x)||x>end)continue;
    if(x<start){lastBefore=y;continue;}
    if(!part.length&&lastBefore!=null){part.push([start,lastBefore]);lastBefore=null;}
    if(y==null){if(part.length){part.push([x,part[part.length-1][1]]);segments.push(cleanPoints(part));part=[];}lastBefore=null;}
    else part.push([x,y]);
  }
  if(!part.length&&lastBefore!=null)part.push([start,lastBefore]);
  if(part.length){part.push([end,part[part.length-1][1]]);segments.push(cleanPoints(part));}
  return segments;
}
export function validateConfig(c){
  if(!c||typeof c!=='object')throw Error('Нужна конфигурация карточки');
  if(!c.demo){for(const k of ['temperature_entity','humidity_entity'])if(typeof c[k]!=='string'||!/^sensor\.[a-z0-9_]+$/.test(c[k]))throw Error('Укажи '+k+' — sensor.…');}
  for(const [kind,keys]of Object.entries({temperature:['cold','cool','comfort_max','warm_max'],humidity:['dry','low','optimum_max','high']})){
    const def=kind==='temperature'?[16,19,24,28]:[30,45,60,75];
    const vals=keys.map((k,i)=>Number(c.thresholds?.[kind]?.[k]??def[i]));
    if(vals.some((v,i)=>!Number.isFinite(v)||(i&&v<=vals[i-1])))throw Error('Пороги '+kind+' должны возрастать');
  }
  if(c.precision!=null&&![0,1,2].includes(Number(c.precision)))throw Error('Точность: 0, 1 или 2');
  if(c.animations&&!['full','reduced','off'].includes(c.animations))throw Error('Анимации: full, reduced или off');
  for(const k of ['background_opacity','body_opacity','led_brightness'])if(c[k]!=null&&(!Number.isFinite(Number(c[k]))||Number(c[k])<0||Number(c[k])>1))throw Error(k+': укажи число от 0 до 1');
  return c;
}
