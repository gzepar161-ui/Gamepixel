(() => {
'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;
const isSnow=location.pathname.includes('map-snow');
const tileImg=new Image(); tileImg.src=isSnow?'assets/maps/snow_tile.png':'assets/maps/grave_tile.png';
const playerImg=new Image(); playerImg.src='assets/sprites/knight.png';
const enemyImg=new Image(); enemyImg.src=isSnow?'assets/sprites/white_fox.png':'assets/sprites/zombie.png';
const summonImg=new Image(); summonImg.src=isSnow?'assets/sprites/snow_golem.png':'assets/sprites/zombie.png';
const bossImg=new Image(); bossImg.src=isSnow?'assets/sprites/boss_nine_tail.png':'assets/sprites/boss_big_zombie.png';
const wingImg=new Image(); wingImg.src='assets/sprites/dark_wings.png';

const ui={
 hp:document.getElementById('hp'),hpText:document.getElementById('hpText'),xpText:document.getElementById('xpText'),level:document.getElementById('level'),kills:document.getElementById('kills'),coins:document.getElementById('coins'),shopCoins:document.getElementById('shopCoins'),toast:document.getElementById('toast'),bossbar:document.getElementById('bossbar'),bossHp:document.getElementById('bossHp'),bossHpText:document.getElementById('bossHpText'),bossName:document.getElementById('bossName'),shop:document.getElementById('shop'),shopGrid:document.getElementById('shopGrid')};
const W=1600,H=900;
let vw=innerWidth,vh=innerHeight,dpr=devicePixelRatio||1;
function resize(){vw=innerWidth;vh=innerHeight;canvas.width=vw*dpr;canvas.height=vh*dpr;canvas.style.width=vw+'px';canvas.style.height=vh+'px';ctx.setTransform(dpr,0,0,dpr,0,0)} addEventListener('resize',resize); resize();

const world={w:3600,h:2400};
const player={x:1800,y:1200,r:24,hp:400,maxHp:400,atk:52,speed:250,level:1,xp:0,xpNeed:100,kills:0,coins:0,angle:0,attackCd:0,attackAnim:0,holdStart:0,charging:false,dash:0,invuln:0,lifesteal:0,wing:0,shield:0,damageBoost:0};
const keys={}; addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(['1','2','3'].includes(e.key))cast(+e.key);if(e.key.toLowerCase()==='r')cast(4)}); addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
let enemies=[],summons=[],particles=[],floating=[],boss=null,spawnTimer=0,shake=0,time=0;
const cooldowns={1:0,2:0,3:0,4:0};
const CDMAX={1:9,2:5,3:12,4:16};
const itemDefs=[
 {id:'redrelic',name:'Crimson Relic',cost:30,desc:'+70 max HP',apply(){player.maxHp+=70;player.hp+=70}},
 {id:'voidedge',name:'Void Edge',cost:45,desc:'+12 basic/skill damage',apply(){player.atk+=12}},
 {id:'bloodseal',name:'Blood Seal',cost:55,desc:'+25% lifesteal outside ultimate',apply(){player.lifesteal+=0.25}},
 {id:'boots',name:'Dreadstep Boots',cost:40,desc:'+55 move speed',apply(){player.speed+=55}},
 {id:'ward',name:'Abyss Ward',cost:50,desc:'+20% shield duration',apply(){player.shield+=0.2}},
 {id:'ember',name:'Murderous Ember',cost:65,desc:'+20% attack damage',apply(){player.damageBoost+=0.2}}
];
let purchased={};
function toast(s){ui.toast.textContent=s;ui.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>ui.toast.classList.remove('show'),1700)}
function updateUI(){ui.hp.style.width=Math.max(0,player.hp/player.maxHp*100)+'%';ui.hpText.textContent=`${Math.ceil(player.hp)}/${player.maxHp}`;ui.xpText.textContent=`${Math.floor(player.xp)}/${player.xpNeed}`;ui.level.textContent='LV '+player.level;ui.kills.textContent=player.kills%100;ui.coins.textContent=player.coins;ui.shopCoins.textContent=player.coins;if(boss){ui.bossbar.style.display='block';ui.bossHp.style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';ui.bossHpText.textContent=`${Math.ceil(boss.hp)}/${boss.maxHp}`}else ui.bossbar.style.display='none'}
function addXP(n){player.xp+=n;while(player.xp>=player.xpNeed){player.xp-=player.xpNeed;player.level++;player.xpNeed=Math.floor(player.xpNeed*1.25);player.maxHp+=35;player.hp=player.maxHp;player.atk+=7;toast('LEVEL UP!')}}
function spawnEnemy(){if(boss||enemies.length>34)return;const a=Math.random()*Math.PI*2,dist=450+Math.random()*750;const e={x:player.x+Math.cos(a)*dist,y:player.y+Math.sin(a)*dist,r:26,hp:isSnow?82:70,maxHp:isSnow?82:70,atk:isSnow?22:19,speed:isSnow?76:63,hit:0,walk:Math.random()*7,dead:false};e.x=Math.max(40,Math.min(world.w-40,e.x));e.y=Math.max(40,Math.min(world.h-40,e.y));enemies.push(e)}
function triggerBoss(){boss={x:player.x+650,y:player.y,maxHp:isSnow?3000:2600,hp:isSnow?3000:2600,r:66,atk:isSnow?45:38,speed:isSnow?54:48,hit:0,phase:0};ui.bossName.textContent=isSnow?'NINE-TAILED FOX':'BIG ZOMBIE';for(let i=0;i<25;i++)particles.push({x:boss.x+(Math.random()-.5)*80,y:boss.y+(Math.random()-.5)*80,vx:(Math.random()-.5)*40,vy:(Math.random()-.5)*40,life:1,sz:8});toast('BOSS INCOMING');shake=14}
function killEnemy(e){if(e.dead)return;e.dead=true;player.kills++;player.coins+=5;addXP(isSnow?18:15);gainLife(0.03);for(let i=0;i<7;i++)particles.push({x:e.x,y:e.y,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,life:.6,sz:3+Math.random()*4});floating.push({x:e.x,y:e.y,t:0,text:'+5 COINS'});if(player.kills%100===0)triggerBoss()}
function damageTarget(t,damage){t.hp-=damage;t.hit=.14;const heal=damage*(player.lifesteal+(player.wing>0?2:0));if(heal>0)player.hp=Math.min(player.maxHp,player.hp+heal);floating.push({x:t.x,y:t.y-25,t:0,text:'-'+Math.floor(damage)})}
function gainLife(frac){player.hp=Math.min(player.maxHp,player.hp+player.maxHp*frac)}
function nearestEnemy(range=180){let best=null,bd=Infinity;for(const e of enemies){if(e.dead)continue;let d=Math.hypot(e.x-player.x,e.y-player.y);if(d<range&&d<bd){bd=d;best=e}}if(boss){let d=Math.hypot(boss.x-player.x,boss.y-player.y);if(d<range&&d<bd)best=boss}return best}
function basicTap(){if(player.attackCd>0)return;player.attackCd=.34;player.attackAnim=.18;const t=nearestEnemy(135);if(t){let dmg=(player.atk*(1+player.damageBoost));damageTarget(t,dmg);shake=3}}
function dashAttack(){if(player.attackCd>0)return;player.attackCd=.55;player.dash=.22;const speed=1100;const dx=Math.cos(player.angle),dy=Math.sin(player.angle);player.x+=dx*speed*.22;player.y+=dy*speed*.22;const hitSet=[...enemies];for(const e of hitSet){if(e.dead)continue;let d=Math.hypot(e.x-player.x,e.y-player.y);if(d<95)damageTarget(e,player.atk*1.7*(1+player.damageBoost))}if(boss&&Math.hypot(boss.x-player.x,boss.y-player.y)<125)damageTarget(boss,player.atk*1.25*(1+player.damageBoost));shake=8}
function spawnSummon(){summons.push({x:player.x+(Math.random()-.5)*70,y:player.y+(Math.random()-.5)*70,r:22,hp:40,maxHp:40,atk:30,life:5,hit:0,a:Math.random()*Math.PI*2})}
function cast(n){const now=performance.now()/1000;if(cooldowns[n]>now)return;cooldowns[n]=now+CDMAX[n];
 if(n===1){spawnSummon();spawnSummon();toast(isSnow?'2 Snow Golems summoned':'2 Zombies summoned');}
 else if(n===2){for(const e of enemies.filter(e=>!e.dead&&Math.hypot(e.x-player.x,e.y-player.y)<220))damageTarget(e,player.atk*2*(1+player.damageBoost));if(boss&&Math.hypot(boss.x-player.x,boss.y-player.y)<250)damageTarget(boss,player.atk*1.7*(1+player.damageBoost));shake=7;toast('SHADOW CLEAVE')}
 else if(n===3){player.shield=2.6*(1+player.shield);toast('ABYSS BARRIER')}
 else {player.invuln=10;player.lifesteal=Math.max(player.lifesteal,0);player.wing=10;for(let i=0;i<10;i++)spawnSummon();toast('UNDEATH AWAKENED — 10 SECONDS');}
}
function currentCooldown(n){return Math.max(0,cooldowns[n]-performance.now()/1000)}
function updateSkillUI(){for(const [n,id] of [[1,'s1'],[2,'s2'],[3,'s3'],[4,'ult']]){const el=document.getElementById(id),cd=currentCooldown(n);el.classList.toggle('cool',cd>0);el.querySelector('.cd').textContent=cd>0?cd.toFixed(1):''}}
['s1','s2','s3','ult'].forEach((id,i)=>document.getElementById(id).addEventListener('pointerdown',e=>{e.stopPropagation();cast(i+1)}));

document.getElementById('shopBtn').onclick=()=>{ui.shop.classList.add('open');buildShop()};document.getElementById('shopClose').onclick=()=>ui.shop.classList.remove('open');
function buildShop(){ui.shopGrid.innerHTML='';itemDefs.forEach(it=>{let d=document.createElement('div');d.className='item';d.innerHTML=`<img src="assets/ui/${it.id==='voidedge'?'sword':it.id==='bloodseal'?'heart':it.id==='redrelic'?'potion':it.id==='boots'?'sword':'shield'}.png"><h4>${it.name}</h4><p>${it.desc}</p><button class="btn small" ${player.coins<it.cost?'disabled':''}>BUY ${it.cost}</button>`;d.querySelector('button').onclick=()=>{if(player.coins>=it.cost){player.coins-=it.cost;purchased[it.id]=(purchased[it.id]||0)+1;it.apply();toast(it.name+' purchased');buildShop();updateUI()}};ui.shopGrid.appendChild(d)})}

// Analog control
let joyActive=false,joyId=null,joyCX=0,joyCY=0,joyX=0,joyY=0;const joy=document.getElementById('joy'),knob=document.getElementById('knob');
function joySet(e){const r=joy.getBoundingClientRect();joyCX=r.left+r.width/2;joyCY=r.top+r.height/2;let dx=e.clientX-joyCX,dy=e.clientY-joyCY;const max=42;const m=Math.hypot(dx,dy)||1;if(m>max){dx=dx/m*max;dy=dy/m*max}joyX=dx/max;joyY=dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`}
joy.addEventListener('pointerdown',e=>{joyActive=true;joyId=e.pointerId;joy.setPointerCapture(e.pointerId);joySet(e)});joy.addEventListener('pointermove',e=>{if(joyActive&&e.pointerId===joyId)joySet(e)});joy.addEventListener('pointerup',()=>{joyActive=false;joyX=joyY=0;knob.style.transform='translate(0,0)'});joy.addEventListener('pointercancel',()=>{joyActive=false;joyX=joyY=0;knob.style.transform='translate(0,0)'});

const attack=document.getElementById('attack');let attackDown=false,attackT=0;
attack.addEventListener('pointerdown',e=>{attackDown=true;attackT=performance.now();attack.setPointerCapture(e.pointerId);player.holdStart=attackT;player.charging=true});
attack.addEventListener('pointerup',()=>{if(!attackDown)return;attackDown=false;const dur=performance.now()-attackT;player.charging=false;if(dur>360)dashAttack();else basicTap()});
attack.addEventListener('pointercancel',()=>{attackDown=false;player.charging=false});

// Audio: royalty-free procedural ambient for map only.
let audio=null;function initAudio(){try{audio=new (window.AudioContext||window.webkitAudioContext)();const master=audio.createGain();master.gain.value=.07;master.connect(audio.destination);const osc=audio.createOscillator(),lfo=audio.createOscillator(),lg=audio.createGain();osc.type='sine';osc.frequency.value=isSnow?72:55;lfo.frequency.value=.08;lg.gain.value=8;lfo.connect(lg);lg.connect(osc.frequency);osc.connect(master);osc.start();lfo.start();}catch(e){}}document.addEventListener('pointerdown',()=>{if(audio?.state==='suspended')audio.resume();if(!audio)initAudio()},{once:false});

function inputMove(dt){let dx=joyX,dy=joyY;if(!joyActive){dx=(keys.d?1:0)-(keys.a?1:0);dy=(keys.s?1:0)-(keys.w?1:0)}const m=Math.hypot(dx,dy);if(m>0.05){dx/=m;dy/=m;player.x+=dx*player.speed*dt;player.y+=dy*player.speed*dt;player.angle=Math.atan2(dy,dx)}player.x=Math.max(40,Math.min(world.w-40,player.x));player.y=Math.max(40,Math.min(world.h-40,player.y))}
function update(dt){time+=dt;inputMove(dt);player.attackCd=Math.max(0,player.attackCd-dt);player.attackAnim=Math.max(0,player.attackAnim-dt);player.invuln=Math.max(0,player.invuln-dt);player.wing=Math.max(0,player.wing-dt);player.shield=Math.max(0,player.shield-dt);spawnTimer-=dt;if(!boss&&spawnTimer<=0){spawnTimer=.55;spawnEnemy()}
 for(const e of enemies){if(e.dead)continue;e.hit=Math.max(0,e.hit-dt);e.walk+=dt;const dx=player.x-e.x,dy=player.y-e.y,d=Math.hypot(dx,dy)||1;if(d>62){e.x+=dx/d*e.speed*dt;e.y+=dy/d*e.speed*dt}else if(player.invuln<=0&&player.shield<=0){player.hp-=e.atk*dt;if(player.hp<=0)respawn()}}
 enemies=enemies.filter(e=>!e.dead);
 for(const s of summons){s.life-=dt;s.hit=Math.max(0,s.hit-dt);let tar=nearestFrom(s.x,s.y,260);if(tar){const dx=tar.x-s.x,dy=tar.y-s.y,d=Math.hypot(dx,dy)||1;s.a=Math.atan2(dy,dx);if(d>55){s.x+=dx/d*95*dt;s.y+=dy/d*95*dt}else if(s.hit<=0){s.hit=.8;damageTarget(tar,s.atk)}}}
 summons=summons.filter(s=>s.life>0&&s.hp>0);
 if(boss&&!boss.dead){boss.hit=Math.max(0,boss.hit-dt);const dx=player.x-boss.x,dy=player.y-boss.y,d=Math.hypot(dx,dy)||1;if(d>110){boss.x+=dx/d*boss.speed*dt;boss.y+=dy/d*boss.speed*dt}else if(player.invuln<=0&&player.shield<=0){player.hp-=boss.atk*dt;if(player.hp<=0)respawn()}}
 if(boss&&boss.hp<=0){boss.dead=true;player.coins+=100;addXP(250);toast('BOSS DEFEATED +100 COINS');shake=20;boss=null}
 for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.97;p.vy*=.97}particles=particles.filter(p=>p.life>0);for(const f of floating){f.t+=dt;f.y-=25*dt}floating=floating.filter(f=>f.t<.9);shake=Math.max(0,shake-dt*20);updateUI();updateSkillUI()}
function nearestFrom(x,y,range){let best=null,bd=Infinity;for(const e of enemies){if(e.dead)continue;const d=Math.hypot(e.x-x,e.y-y);if(d<range&&d<bd){best=e;bd=d}}if(boss){const d=Math.hypot(boss.x-x,boss.y-y);if(d<range&&d<bd)best=boss}return best}
function respawn(){player.hp=player.maxHp;player.x=world.w/2;player.y=world.h/2;toast('YOU RETURN FROM THE ABYSS');shake=16}
function worldToScreen(x,y,camX,camY){return [x-camX,y-camY]}
function draw(){const camX=Math.max(0,Math.min(world.w-vw,player.x-vw/2)),camY=Math.max(0,Math.min(world.h-vh,player.y-vh/2));ctx.save();let sx=(Math.random()-.5)*shake,sy=(Math.random()-.5)*shake;ctx.translate(sx,sy);ctx.fillStyle=isSnow?'#adbdcf':'#17131b';ctx.fillRect(0,0,vw,vh);
 const tile=128;let ox=(-camX)%tile,oy=(-camY)%tile;for(let x=ox- tile;x<vw+tile;x+=tile)for(let y=oy-tile;y<vh+tile;y+=tile)ctx.drawImage(tileImg,x,y,tile,tile);
 // atmospheric fog/particles
 const [px,py]=worldToScreen(player.x,player.y,camX,camY);
 for(const e of enemies){const [x,y]=worldToScreen(e.x,e.y,camX,camY);if(x<-80||x>vw+80||y<-80||y>vh+80)continue;drawEntity(enemyImg,x,y,48,48,e.walk,e.hit)}
 for(const s of summons){const [x,y]=worldToScreen(s.x,s.y,camX,camY);drawEntity(summonImg,x,y,52,52,s.a,s.hit)}
 if(boss){const [x,y]=worldToScreen(boss.x,boss.y,camX,camY);drawEntity(bossImg,x,y,132,132,boss.phase,boss.hit)}
 if(player.wing>0){ctx.globalAlpha=.72*(player.wing/10);ctx.drawImage(wingImg,px-65,py-60,130,130);ctx.globalAlpha=1}
 drawEntity(playerImg,px,py,72,72,time*8,player.attackAnim);if(player.charging){ctx.beginPath();ctx.strokeStyle='rgba(184,80,250,.7)';ctx.lineWidth=5;ctx.arc(px,py,36+Math.sin(time*18)*4,player.angle-.8,player.angle+.8);ctx.stroke()}
 for(const p of particles){const [x,y]=worldToScreen(p.x,p.y,camX,camY);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=isSnow?'#d7f3ff':'#bc4fe1';ctx.fillRect(x-p.sz/2,y-p.sz/2,p.sz,p.sz)}ctx.globalAlpha=1;
 for(const f of floating){const [x,y]=worldToScreen(f.x,f.y,camX,camY);ctx.fillStyle=f.text.includes('COIN')?'#e6c35b':'#ffd6df';ctx.font='bold 13px Share Tech Mono';ctx.textAlign='center';ctx.fillText(f.text,x,y)}
 // world vignette
 const g=ctx.createRadialGradient(vw/2,vh/2,Math.min(vw,vh)*.25,vw/2,vh/2,Math.max(vw,vh)*.65);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,isSnow?'rgba(18,34,52,.52)':'rgba(24,5,19,.6)');ctx.fillStyle=g;ctx.fillRect(0,0,vw,vh);ctx.restore()}
function drawEntity(img,x,y,w,h,phase,hit){ctx.save();const bob=Math.sin(phase*1.9)*3;ctx.translate(x,y+bob);if(hit>0){ctx.globalAlpha=.68+Math.sin(hit*60)*.2}ctx.drawImage(img,-w/2,-h/2,w,h);ctx.restore()}
let last=performance.now();function loop(now){const dt=Math.min(.033,(now-last)/1000);last=now;update(dt);draw();requestAnimationFrame(loop)}requestAnimationFrame(loop);updateUI();
// Try orientation lock where supported.
(async()=>{try{if(screen.orientation?.lock)await screen.orientation.lock('landscape')}catch(e){}})();
})();
