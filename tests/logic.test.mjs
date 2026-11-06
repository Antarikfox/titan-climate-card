import test from 'node:test';
import assert from 'node:assert/strict';
import {numeric,status,interpolate,historySegments,validateConfig} from '../src/logic.mjs';
test('all climate thresholds including decimal boundaries',()=>{
  for(const [t,name]of [[-10,'Криосон'],[15.99,'Криосон'],[16,'Прохлада'],[19,'Прохлада'],[19.5,'Гомеостаз'],[24,'Гомеостаз'],[24.01,'Активация'],[28,'Активация'],[28.1,'Перегрев']])assert.equal(status(t,48).name,name);
  for(const [h,name]of [[0,'Иссушение'],[29.99,'Иссушение'],[30,'Сухо'],[45,'Оптимум'],[60,'Оптимум'],[60.1,'Насыщение'],[75,'Насыщение'],[76,'Спорообразование']])assert.equal(status(22,h).humidity,name);
  assert.equal(status(10,50,{temperature:{cold:5,cool:8,comfort_max:12,warm_max:15}}).name,'Гомеостаз');
});
test('missing and invalid sensor values never become false zero',()=>{
  for(const state of [undefined,{state:'unknown'},{state:'unavailable'},{state:''},{state:'NaN'},{state:null}])assert.equal(numeric(state),null);
  assert.equal(numeric({state:'0'}),0);assert.equal(numeric({state:'-5.25'}),-5.25);
  assert.equal(status(null,50).key,'offline');assert.equal(status(22,null).key,'offline');
});
test('monotone cubic has no invented peaks across irregular sample intervals',()=>{
  const curves=[[[0,0],[1,1],[2,0]],[[0,5],[.01,8],[15,9],[30,3],[31,3]],[[0,42],[1,42],[2,42]],[[0,80],[2,10],[12,11],[13,95]]];
  for(const p of curves)for(let j=0;j<p.length-1;j++)for(let i=0;i<=200;i++){
    const x=p[j][0]+(p[j+1][0]-p[j][0])*i/200,y=interpolate(p,x);
    assert.ok(y>=Math.min(p[j][1],p[j+1][1])-1e-9&&y<=Math.max(p[j][1],p[j+1][1])+1e-9);
  }
  assert.equal(interpolate([[1,4]],7),4);assert.equal(interpolate([],7),null);
  assert.equal(interpolate([[1,4],[2,8]],0),4);assert.equal(interpolate([[1,4],[2,8]],3),8);
});
test('history respects actual timestamps and breaks unavailable intervals',()=>{
  const start=Date.parse('2026-11-06T00:00:00Z'),at=m=>new Date(start+m*60000).toISOString();
  const segments=historySegments([{state:'20',last_changed:at(-20)},{state:'21',last_changed:at(5)},{state:'unavailable',last_changed:at(10)},{state:'23',last_changed:at(20)}],start,start+30*60000);
  assert.equal(segments.length,2);assert.deepEqual(segments[0][0],[start,20]);assert.equal(segments[0].at(-1)[0],start+10*60000);assert.equal(segments[1][0][0],start+20*60000);
  assert.deepEqual(historySegments([],start,start+100),[]);
});
test('configuration rejects bad thresholds and permits optional battery',()=>{
  const c={temperature_entity:'sensor.temp',humidity_entity:'sensor.hum'};assert.doesNotThrow(()=>validateConfig(c));
  assert.throws(()=>validateConfig({...c,precision:3}));assert.throws(()=>validateConfig({...c,temperature_entity:'light.temp'}));
  assert.throws(()=>validateConfig({...c,thresholds:{temperature:{cold:30}}}));assert.throws(()=>validateConfig({...c,animations:'chaos'}));
  assert.doesNotThrow(()=>validateConfig({demo:true}));
});

test('opacity and LED brightness accept only finite 0..1 values',()=>{for(const key of ['background_opacity','body_opacity','led_brightness']){assert.doesNotThrow(()=>validateConfig({demo:true,[key]:0}));assert.doesNotThrow(()=>validateConfig({demo:true,[key]:1}));for(const v of [-.01,1.01,NaN])assert.throws(()=>validateConfig({demo:true,[key]:v}));}});
