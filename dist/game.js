'use strict';
(() => {
const $=id=>document.getElementById(id), canvas=$('game'), ctx=canvas.getContext('2d');
const W=1200,H=580, groundY=490, keys=new Set();
let state='menu',level=0,coins=0,score=0,lives=3,affection=0,best=0,time=0,cam=0,last=0,acc=0,toastTime=0,muted=true,audio,shield=false,rewarded=new Set(),talkIndex=0;
try{best=Number(localStorage.getItem('pink-purple-best'))||0}catch{} $('best').textContent=best;
let player,world,particles=[],power={jump:0,gold:0,speed:0},checkpoint=90,jumpBuffer=0,coyote=0;
const names=['Šeříkové louky','Krystalové výšiny','Měsíční zahrady'];
const intersect=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const rect=(x,y,w,h)=>({x,y,w,h});
function levelData(n){
 const gaps=n===0?[[1000,110],[1910,130]]:n===1?[[850,140],[1630,150],[2460,150]]:[[720,150],[1430,170],[2170,170],[2840,160]];
 const width= n===0?2850:n===1?3350:3750;
 let platforms=[],start=0;
 for(const [x,w] of gaps){platforms.push({...rect(start,groundY,x-start,140),ground:true});start=x+w}
 platforms.push({...rect(start,groundY,width-start,140),ground:true});
 const steps=n===0?[[410,390,150],[690,320,160],[1190,393,160],[1450,325,160],[1750,397,100],[2150,385,170],[2450,320,140]]:n===1?[[390,387,130],[650,310,140],[1060,390,140],[1320,305,130],[1830,380,140],[2090,290,130],[2680,375,150],[2960,300,130]]:[[330,380,120],[560,300,110],[940,385,120],[1190,295,120],[1660,380,110],[1910,290,120],[2410,370,120],[2660,280,110],[3070,375,140],[3330,290,130]];
 for(const [x,y,w]of steps)platforms.push({...rect(x,y,w,24),ground:false});
 // Low solid blocks exercise side collision without blocking the main route.
 platforms.push({...rect(590,448,60,42),ground:false});
 let items=[];
 for(const p of platforms){if(p.ground){for(let x=p.x+60;x<p.x+p.w-35;x+=65)items.push({...rect(x,groundY-47,18,24),type:'coin',taken:false})}else if(p.w>90){for(let x=p.x+22;x<p.x+p.w-10;x+=38)items.push({...rect(x,p.y-40,18,24),type:'coin',taken:false})}}
 const types=['jump','gold','speed'];steps.forEach(([x,y,w],i)=>{if(i%3===0)items.push({...rect(x+w/2-12,y-73,24,36),type:types[(i/3+n)%3|0],taken:false})});
 let enemies=[];platforms.filter(p=>p.ground&&p.w>300).forEach((p,i)=>{if(p.x+p.w<550)return;const lo=Math.max(p.x+45,620),hi=p.x+p.w-70;if(hi>lo)enemies.push({...rect(lo+40,groundY-31,34,31),lo,hi,dir:i%2?-1:1,speed:55+n*16,alive:true})});
 const hazards=n===0?[]:n===1?[1240,2200]:[1100,1780,2570,3220];
 const boss=n===0?{...rect(810,400,112,90),hp:3,maxHp:3,awake:false,phase:'sleep',timer:0,inv:0,dir:-1,lo:670,hi:870}:null;
 if(boss)enemies.shift();
 return {width,platforms,items,enemies,boss,hazards:hazards.map(x=>rect(x,groundY-20,40,20)),npc:rect(230,groundY-52,34,52),portal:rect(width-140,groundY-100,65,100),checkpoints:[width*.46,width*.75]};
}
function loadLevel(n){level=n;world=levelData(n);checkpoint=90;player={...rect(90,groundY-45,30,44),vx:0,vy:0,grounded:true,inv:1,face:1};cam=0;particles=[];power={jump:0,gold:0,speed:0};coyote=0;jumpBuffer=0;updateHud()}
function updateHud(){ $('coins').textContent=coins;$('score').textContent=String(score).padStart(5,'0');$('lives').textContent='♥ '.repeat(lives)+'♡ '.repeat(3-lives);$('level-number').textContent='0'+(level+1);$('level-name').textContent=names[level];$('best').textContent=best; }
function saveBest(){if(score>best){best=score;try{localStorage.setItem('pink-purple-best',String(best))}catch{}}updateHud()}
function beep(freq=600,duration=.08){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(freq*1.5,audio.currentTime+duration);g.gain.setValueAtTime(.045,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration)}catch{}}
function toast(t){$('toast').textContent=t;$('toast').style.opacity=1;toastTime=3}
function burst(x,y,color,count=12){for(let i=0;i<count;i++)particles.push({x,y,vx:(Math.random()-.5)*220,vy:-50-Math.random()*170,life:.6+Math.random()*.4,color})}
function updateBoss(dt,prevBottom){
 const b=world.boss;if(!b||b.hp<=0)return;
 if(!b.awake){if(player.x<500)return;b.awake=true;b.phase='warning';b.timer=1.4;toast('☠ NOCTIS se probouzí! Třikrát mu skoč na hřbet.');beep(85,.4)}
 b.inv=Math.max(0,b.inv-dt);b.timer-=dt;
 if(b.phase==='warning'){
  if(b.timer<=0){b.dir=player.x+15<b.x+b.w/2?-1:1;b.phase='charge';b.timer=.65;beep(110,.2)}
 }else if(b.phase==='charge'){
  b.x=Math.max(b.lo,Math.min(b.hi,b.x+b.dir*330*dt));
  if(b.timer<=0||b.x===b.lo||b.x===b.hi){b.phase='recover';b.timer=1.5}
 }else if(b.timer<=0){b.phase='warning';b.timer=1.1}
 if(!intersect(player,b))return;
 if(player.vy>0&&prevBottom<=b.y+12){
  player.y=b.y-player.h;player.vy=-650;
  if(b.inv>0)return;
  b.hp--;b.inv=1;b.phase='recover';b.timer=1.5;burst(b.x+b.w/2,b.y,'#ff4d78',24);beep(170,.2);
  if(b.hp===0){score+=500;coins+=15;burst(b.x+b.w/2,b.y+35,'#ffd38c',50);toast('☠ Noctis poražen! +500 bodů · +15 mincí');saveBest()}else toast('Zásah! Noctis: '+b.hp+' / 3 životy');
 }else hurt();
}
function startGame(){coins=0;score=0;lives=3;affection=0;shield=false;rewarded.clear();talkIndex=0;loadLevel(0);state='playing';$('overlay').hidden=true;document.body.classList.add('playing');document.activeElement?.blur();keys.clear();$('footer-status').textContent='Sbírej mince. Najdi portál. Užij si cestu.';beep(450)}
function showOverlay(title,description,label,action){$('overlay').hidden=false;$('overlay').querySelector('.menu-card').innerHTML='<div class="pill">PINK & PURPLE ADVENTURE</div><h2>'+title+'</h2><p>'+description+'</p><button class="primary" id="overlay-action">'+label+' ↗</button><div class="menu-note">OSOBNÍ REKORD '+best+' BODŮ</div>';$('overlay-action').onclick=action;$('overlay-action').focus();keys.clear();document.body.classList.remove('playing')}
function pause(){if(state==='playing'){state='paused';showOverlay('Chvilka <span>na výdech.</span>','Tvůj svět na tebe počká.','Pokračovat',resume)}else if(state==='paused')resume()}
function resume(){state='playing';$('overlay').hidden=true;document.activeElement?.blur();document.body.classList.add('playing');keys.clear()}
function hurt(fall=false){if(!fall&&(player.inv>0||power.gold>0))return;if(!fall&&shield){shield=false;player.inv=2;toast('Lunin štít tě ochránil ♡');return}lives--;burst(player.x+15,player.y+20,'#ffa1d0',20);beep(130,.2);updateHud();if(lives<=0){state='over';saveBest();showOverlay('Ještě jeden <span>pokus?</span>','Dobrodružství končí, odvaha zůstává.<br>Tvoje skóre: '+score+' · Nasbírané mince: '+coins,'Hrát znovu',startGame)}else{player.x=checkpoint;player.y=groundY-60;player.vx=0;player.vy=0;player.inv=2;cam=Math.max(0,Math.min(world.width-W,player.x-250));toast(fall?'Propast! Zpátky na bezpečný bod.':'Au! Ještě máš '+lives+' '+(lives===1?'život.':'životy.'))}}
function complete(){score+=200;saveBest();beep(800,.2);if(level<2){state='transition';showOverlay('Svět <span>zdolán!</span>','+200 bodů · Další zastávka: '+names[level+1],'Do dalšího světa',()=>{loadLevel(level+1);resume()})}else{state='won';showOverlay('Jsi prostě <span>kouzelná.</span>','Všechny tři světy jsou za tebou!<br>Skóre: '+score+' · Mince: '+coins+' · Náklonnost: '+affection+' ♡','Nové dobrodružství',startGame)}}
function relation(){return affection<25?'Neznámí':affection<50?'Kamarádi':affection<80?'Dobří přátelé':'Maximální náklonnost'}
const lines=[['Ahoj! Jsem Luna. Sbíráš mince, nebo jen utíkáš před povinnostmi?','Zelená okurka ti pomůže vyskočit výš. Ano, tady zelenina opravdu funguje.','Na příšerky skákej shora. Objímání zatím nedoporučuji.'],['Už tě poznávám! Jsi ta růžová šmouha s plnými kapsami.','Kamarádská rada: za každou propastí je další dobrodružství. A občas další propast.'],['S tebou je i fialové pondělí dobrodružství!','Jsi skvělá parťačka. Zlatá okurka je skoro tak spolehlivá jako naše přátelství.'],['Naše přátelství je silnější než okurkový nálev. A to už něco znamená!','Máš ode mě štít a spoustu palců nahoru. Ten portál je tvůj!']];
function randomLine(){const tier=affection<25?0:affection<50?1:affection<80?2:3;return lines[tier][talkIndex++%lines[tier].length]}
function refreshDialog(text){$('dialog-text').textContent=text;$('relation').textContent=relation();$('affection-value').textContent=affection+' / 100 ♡';$('meter-fill').style.width=affection+'%';document.querySelectorAll('[data-gift]').forEach(b=>b.disabled=coins<Number(b.dataset.gift)||affection===100)}
function openDialog(){if(state!=='playing'||Math.abs(player.x-world.npc.x)>105)return;state='dialog';keys.clear();$('dialog').hidden=false;$('interact').hidden=true;refreshDialog(randomLine());$('close-dialog').focus()}
function closeDialog(){if(state!=='dialog')return;$('dialog').hidden=true;state='playing';keys.clear()}
document.querySelectorAll('[data-gift]').forEach(b=>b.onclick=()=>{const amount=+b.dataset.gift;if(state!=='dialog'||coins<amount||affection>=100)return;coins-=amount;affection=Math.min(100,affection+({10:5,25:15,50:35}[amount]));let text='Děkuju za '+amount+' mincí! '+randomLine();if(affection>=50&&!rewarded.has(50)){rewarded.add(50);lives=Math.min(3,lives+1);text+=' Za přátelství získáváš život (nejvýše 3)!'}if(affection>=80&&!rewarded.has(80)){rewarded.add(80);shield=true;text+=' Získáváš štít proti jednomu zásahu!'}updateHud();refreshDialog(text);beep(900)});
$('talk').onclick=()=>refreshDialog(randomLine());$('close-dialog').onclick=closeDialog;$('start').onclick=startGame;$('pause').onclick=pause;$('interact').onclick=openDialog;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'♪':'♫';$('sound').setAttribute('aria-label',muted?'Zapnout zvuk':'Vypnout zvuk');$('sound').title=muted?'Zapnout zvuk':'Vypnout zvuk';beep()};
function keyDown(code){if(!keys.has(code)&&['Space','ArrowUp','KeyW'].includes(code)&&state==='playing')jumpBuffer=.14;keys.add(code)}
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','Space','Escape','KeyA','KeyD','KeyW','KeyE'].includes(e.code)){if(e.target.tagName!=='BUTTON'||e.code!=='Space')e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){if(state==='dialog')closeDialog();else pause()}else if(e.code==='KeyE')openDialog();else keyDown(e.code)}});
addEventListener('keyup',e=>{keys.delete(e.code);if(['Space','ArrowUp','KeyW'].includes(e.code)&&player&&player.vy<-250)player.vy=-250});
document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keyDown(b.dataset.key)});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>{keys.delete(b.dataset.key)})});
addEventListener('blur',()=>{keys.clear();if(state==='playing')pause()});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause()});
function update(dt){time+=dt;if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').style.opacity=0}if(state!=='playing')return;
 for(const k in power)power[k]=Math.max(0,power[k]-dt);player.inv=Math.max(0,player.inv-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);coyote=player.grounded?.1:Math.max(0,coyote-dt);
 const axis=(keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0);player.vx=axis*(power.speed>0?440:275);if(axis)player.face=axis;
 if(jumpBuffer>0&&coyote>0){player.vy=power.jump>0?-790:-615;player.grounded=false;coyote=0;jumpBuffer=0;beep(360,.07);burst(player.x+15,player.y+44,'#d5a4fa',5)}
 player.x+=player.vx*dt;for(const p of world.platforms)if(intersect(player,p)){if(player.vx>0)player.x=p.x-player.w;else if(player.vx<0)player.x=p.x+p.w}player.x=Math.max(0,Math.min(world.width-player.w,player.x));
 const prevBottom=player.y+player.h;player.vy=Math.min(1100,player.vy+1650*dt);player.y+=player.vy*dt;player.grounded=false;
 for(const p of world.platforms)if(intersect(player,p)){if(player.vy>=0&&prevBottom<=p.y+3){player.y=p.y-player.h;player.vy=0;player.grounded=true}else if(player.vy<0){player.y=p.y+p.h;player.vy=0}}
 if(player.grounded){for(const mark of world.checkpoints)if(player.x>mark&&checkpoint<mark){const safe=world.platforms.find(p=>p.ground&&mark>=p.x+20&&mark<=p.x+p.w-50);if(safe){checkpoint=mark;toast('✦ Bezpečný bod uložen')}}}
 if(player.y>H+130){hurt(true);return}
 for(const item of world.items)if(!item.taken&&intersect(player,item)){item.taken=true;if(item.type==='coin'){coins++;score+=10;beep(950,.045);burst(item.x+9,item.y,'#ffe193',7)}else{score+=25;power[item.type]=item.type==='gold'?8:10;toast(({jump:'🥒 Super skok · 10 sekund',gold:'🥒 Nezranitelnost · 8 sekund',speed:'🥒 Super rychlost · 10 sekund'})[item.type]);beep(750,.16);burst(item.x,item.y,'#c5ff9b',20)}updateHud()}
 for(const e of world.enemies){if(!e.alive)continue;e.x+=e.dir*e.speed*dt;if(e.x<e.lo){e.x=e.lo;e.dir=1}if(e.x>e.hi){e.x=e.hi;e.dir=-1}if(intersect(player,e)){if(power.gold>0||(player.vy>0&&prevBottom<=e.y+12)){e.alive=false;score+=50;player.vy=-390;burst(e.x+15,e.y,'#bd8cef',16);beep(240);updateHud()}else hurt()}}
 for(const h of world.hazards)if(intersect(player,h))hurt();
 updateBoss(dt,prevBottom);if(state!=='playing')return;
 if(intersect(player,world.portal)){complete();return}cam+= (Math.max(0,Math.min(world.width-W,player.x-W*.32))-cam)*Math.min(1,dt*7);
 $('interact').hidden=Math.abs(player.x-world.npc.x)>105;
 const active=Object.entries(power).filter(([,v])=>v>0).map(([k,v])=>({jump:'🥒 Super skok',gold:'✦ Nezranitelnost',speed:'↗ Super rychlost'}[k])+' '+Math.ceil(v)+' s');if(shield)active.push('♡ Lunin štít');$('power').style.display=active.length?'block':'none';$('power').textContent=active.join(' · ');
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=460*dt;p.life-=dt}particles=particles.filter(p=>p.life>0);
}
function rounded(x,y,w,h,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function ellipse(x,y,rx,ry,c){ctx.fillStyle=c;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}
function star(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x+2,y-2,x+r,y);ctx.quadraticCurveTo(x+2,y+2,x,y+r);ctx.quadraticCurveTo(x-2,y+2,x-r,y);ctx.quadraticCurveTo(x-2,y-2,x,y-r);ctx.fill()}
function mountainLayer(parallax,base,color,height){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,H);for(let x=-50;x<W+60;x+=10){const a=(x+cam*parallax);const y=base-Math.pow((Math.sin(a*.006)+1)/2,1.9)*height-Math.sin(a*.013)*18;ctx.lineTo(x,y)}ctx.lineTo(W,H);ctx.closePath();ctx.fill()}
function flower(x,y,s=1){ctx.strokeStyle='#665b89';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-18*s);ctx.stroke();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ellipse(x+Math.cos(a)*5*s,y-20*s+Math.sin(a)*5*s,4*s,4*s,'#efa4d0')}ellipse(x,y-20*s,2*s,2*s,'#ffe3b3')}
function mushroom(x,y,s=1){rounded(x-5*s,y-25*s,10*s,26*s,4,'#c8a2df');ctx.fillStyle='#d778b7';ctx.beginPath();ctx.ellipse(x,y-25*s,23*s,17*s,0,Math.PI,Math.PI*2);ctx.fill();ellipse(x-9*s,y-33*s,4*s,2.5*s,'#ffcbdf');ellipse(x+6*s,y-36*s,3*s,2.5*s,'#ffcbdf')}
function drawBoss(){
 const b=world.boss;if(!b||b.hp<=0)return;
 const awake=b.awake,warning=b.phase==='warning',charging=b.phase==='charge';
 const pulse=.5+Math.sin(time*8)*.5;
 ellipse(b.x+56,groundY+2,85,12,awake?'#ff265044':'#1b092c66');
 if(warning){ctx.strokeStyle='#ff5169';ctx.lineWidth=3;ctx.setLineDash([9,8]);ctx.beginPath();ctx.moveTo(b.lo-40,groundY-3);ctx.lineTo(b.hi+b.w+40,groundY-3);ctx.stroke();ctx.setLineDash([])}
 ctx.save();ctx.translate(b.x+b.w/2,groundY);ctx.scale(b.dir<0?-1:1,1);
 if(b.inv>0&&Math.floor(time*16)%2)ctx.globalAlpha=.55;
 const bob=awake?Math.sin(time*(charging?22:4))*3:Math.sin(time*2)*3;
 ctx.translate(0,bob);
 // Bat wings, jagged silhouette and ember tail behind the horse's body.
 const wing=(points,fill)=>{ctx.fillStyle=fill;ctx.strokeStyle='#c84a75';ctx.lineWidth=2;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke()};
 wing([[-20,-55],[-70,-135],[-30,-115],[-12,-161],[7,-120],[42,-136],[19,-64]],'#200c32');
 wing([[5,-66],[36,-129],[51,-105],[79,-122],[58,-82],[45,-52]],'#37122f');
 ctx.strokeStyle=awake?'#ff4268':'#87527e';ctx.lineWidth=13;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-44,-53);ctx.bezierCurveTo(-85,-82,-60,-100,-90,-115-Math.sin(time*7)*9);ctx.stroke();
 // Four legs with heavy cloven, red-hot hooves.
 for(let i=0;i<4;i++){const x=[-36,-22,24,39][i],stride=charging?Math.sin(time*25+i*2)*11:0;rounded(x-7,-47,13,43+stride,5,i%2?'#241226':'#44203c');rounded(x-9,-10+stride,19,10,3,awake?'#f25b73':'#815272');ctx.fillStyle='#170c22';ctx.fillRect(x,-9+stride,2,9)}
 ellipse(-2,-63,56,32,'#32182f');ellipse(-6,-68,48,23,'#51233e');
 // Neck, equine head and long muzzle; the single horn dominates the silhouette.
 ctx.save();ctx.translate(29,-70);ctx.rotate(awake?(charging?.45:-.12):.3);
 rounded(-7,-56,28,69,14,'#452039');ellipse(11,-61,23,28,'#54223d');rounded(7,-67,45,25,10,'#602840');ellipse(46,-54,4,3,'#180b20');
 wing([[-1,-80],[-9,-108],[12,-90]],'#35132e');
 ctx.shadowColor='#ff244f';ctx.shadowBlur=awake?18:0;
 wing([[16,-79],[39,-139],[29,-76]],awake?'#ffe2c2':'#b797ac');
 ctx.strokeStyle='#c52c5a';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(21,-93);ctx.lineTo(32,-91);ctx.moveTo(25,-105);ctx.lineTo(35,-103);ctx.stroke();
 if(awake){ellipse(20,-66,7,4,'#ff234c');ellipse(22,-67,2,2,'#fff3b0')}else{ctx.strokeStyle='#c6799d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(14,-65);ctx.lineTo(26,-63);ctx.stroke()}
 ctx.shadowBlur=0;wing([[27,-43],[30,-34],[34,-43]],'#fff3dc');ctx.restore();
 // Flame mane and molten cracks instead of a friendly rainbow.
 for(let i=0;i<7;i++){const x=20-i*8,y=-107+i*7,h=awake?22+Math.sin(time*11+i)*8:11;wing([[x-8,y+18],[x-17,y-h],[x+1,y-2],[x+7,y+15]],awake?(i%2?'#ff8653':'#db2858'):'#854365')}
 ctx.strokeStyle=awake?'#f74c72':'#8b4469';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-28,-77);ctx.lineTo(-17,-62);ctx.lineTo(-25,-52);ctx.moveTo(-8,-81);ctx.lineTo(1,-69);ctx.lineTo(-3,-54);ctx.stroke();ctx.restore();
 ctx.textAlign='center';ctx.font='bold 13px "Space Grotesk",sans-serif';ctx.fillStyle=awake?'#ffd1d7':'#cca5c2';ctx.fillText(awake?'☠ NOCTIS · DÉMON DUHY':'NOCTIS · spící démon',b.x+56,b.y-116);
 if(!awake){ctx.font='18px sans-serif';ctx.fillText('z Z z',b.x+100,b.y-85-Math.sin(time*2)*5)}
 else{ctx.save();ctx.translate(cam,0);const x=360,y=H-43;rounded(x,y,480,32,9,'#1a0c25ed');ctx.font='bold 11px sans-serif';ctx.textAlign='left';ctx.fillStyle='#ffb7ca';ctx.fillText('☠ NOCTIS',x+12,y+20);rounded(x+104,y+10,225,12,6,'#54233b');rounded(x+104,y+10,225*b.hp/b.maxHp,12,6,warning?'#ff655d':'#df376e');ctx.textAlign='right';ctx.fillStyle='#ffdeea';ctx.fillText(warning?'POZOR: VÝPAD!':charging?'USKOČ!':'SKOČ NA HŘBET · '+b.hp+'/3',x+466,y+20);ctx.restore()}
}
function character(x,y,npc=false){const bounce=state==='playing'&&player.grounded&&Math.abs(player.vx)>0?Math.sin(time*19)*2:Math.sin(time*3)*1;ctx.save();ctx.translate(x+15,y+22+bounce);if(!npc&&player.face<0)ctx.scale(-1,1);if(!npc&&player.inv>0&&Math.floor(time*14)%2===0)ctx.globalAlpha=.4;if(!npc&&power.gold>0){ctx.shadowColor='#ffe796';ctx.shadowBlur=18;ctx.globalAlpha=.65+Math.sin(time*20)*.3}if(!npc&&shield){ctx.strokeStyle='#efc4ff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,25,32,0,0,Math.PI*2);ctx.stroke()}if(npc){ellipse(0,-2,21,29,'#7963bc');rounded(-14,-19,28,35,12,'#a58ae2')}else{rounded(-12,-34,9,23,5,'#ff9bc9');rounded(3,-32,9,22,5,'#ff9bc9');rounded(-10,-30,4,15,3,'#d9559b');rounded(5,-28,4,13,3,'#d9559b')}
 rounded(-15,-19,30,36,12,npc?'#baa1ef':'#ff9bc9');rounded(-11,10,22,12,5,npc?'#7460b8':'#eb76ae');ellipse(-9,21,7,4,npc?'#d1baff':'#ffc2dd');ellipse(10,21,7,4,npc?'#d1baff':'#ffc2dd');ellipse(-6,-4,2.5,3.5,'#39204e');ellipse(7,-4,2.5,3.5,'#39204e');ellipse(-6.5,-5,0.8,1,'white');ellipse(6.5,-5,0.8,1,'white');ellipse(-10,2,4,2,'#ec73ad');ellipse(11,2,4,2,'#ec73ad');ctx.strokeStyle='#81395f';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(1,1,3,0,Math.PI);ctx.stroke();if(npc)star(13,-22,8,'#ffe9a7');ctx.restore()}
function draw(){ctx.clearRect(0,0,W,H);const grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,level===2?'#281c50':'#492568');grad.addColorStop(1,'#93618f');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 ellipse(1000-cam*.025,100,48,48,'#f0c3dd');ellipse(1017-cam*.025,87,43,43,'#53316d');for(let i=0;i<48;i++){const x=((i*149+67-cam*.07)%W+W)%W,y=(i*71%255)+22;star(x,y,1.3+(i%3),`rgba(255,218,244,${.25+Math.sin(time*1.4+i)*.18})`)}
 for(let i=0;i<5;i++){const x=((i*350+100-cam*.12)%(W+300)+W+300)%(W+300)-150;ellipse(x,135+i%3*39,80,13,'#bc8bbb12');ellipse(x+45,126+i%3*39,50,20,'#bc8bbb12')}
 mountainLayer(.12,390,'#583975',200);mountainLayer(.23,450,'#68427c',160);mountainLayer(.38,515,'#7c4c87',135);
 ctx.save();ctx.translate(-cam,0);
 // Tall, soft silhouettes and tiny lights give the world its depth.
 for(let i=0;i<world.width/160;i++){const x=i*167+45,y=490;ctx.fillStyle='#472e63';ctx.beginPath();ctx.moveTo(x-8,y);ctx.quadraticCurveTo(x-18,y-80,x+2,y-165-i%3*20);ctx.quadraticCurveTo(x+16,y-85,x+11,y);ctx.fill();ellipse(x,y-135-i%3*20,40,55,'#79528a77');ellipse(x+24,y-125-i%3*20,25,34,'#835d9277')}
 for(const p of world.platforms){if(p.x+p.w<cam-50||p.x>cam+W+50)continue;rounded(p.x,p.y,p.w,p.h, p.ground?5:9,p.ground?'#3c254f':'#67447d');rounded(p.x,p.y,p.w,8,4,'#bd86bb');rounded(p.x,p.y+7,p.w,5,2,'#8a5d9b');if(p.ground){for(let x=p.x+14;x<p.x+p.w;x+=42){ctx.fillStyle='#70416f55';ctx.beginPath();ctx.moveTo(x,p.y+30);ctx.lineTo(x+8,p.y+24);ctx.lineTo(x+15,p.y+35);ctx.lineTo(x+8,p.y+40);ctx.fill()}for(let x=p.x+35;x<p.x+p.w-15;x+=125){flower(x,p.y,0.7);if(Math.floor(x)%3===0)mushroom(x+37,p.y,.8)}}else{ctx.fillStyle='#78518a';ctx.beginPath();ctx.moveTo(p.x+8,p.y+23);ctx.lineTo(p.x+27,p.y+42);ctx.lineTo(p.x+43,p.y+23);ctx.fill()}}
 for(const h of world.hazards){for(let i=0;i<3;i++){ctx.fillStyle='#ff8ab9';ctx.beginPath();ctx.moveTo(h.x+i*14,h.y+20);ctx.lineTo(h.x+i*14+7,h.y);ctx.lineTo(h.x+i*14+14,h.y+20);ctx.fill()}}
 for(const item of world.items){if(item.taken||item.x<cam-30||item.x>cam+W+30)continue;const y=item.y+Math.sin(time*3+item.x*.02)*4;if(item.type==='coin'){ctx.shadowColor='#ffd57a';ctx.shadowBlur=9;ellipse(item.x+9,y+12,9,12,'#e3a54f');ellipse(item.x+9,y+11,6.5,10,'#ffdc88');ctx.shadowBlur=0;ctx.fillStyle='#b87840';ctx.fillRect(item.x+8,y+6,2,10)}else{ctx.save();ctx.translate(item.x+12,y+18);ctx.rotate(.35);ctx.shadowBlur=17;const col={jump:'#b5ef8b',gold:'#ffda73',speed:'#ff8dc0'}[item.type];ctx.shadowColor=col;rounded(-8,-17,16,34,8,col);ctx.shadowBlur=0;for(let i=0;i<5;i++)ellipse(i%2?3:-3,-10+i*5,1.5,2,'#486c4c88');ctx.restore()}}
 const npc=world.npc;character(npc.x,npc.y,true);ctx.textAlign='center';ctx.font='11px "DM Sans",sans-serif';ctx.fillStyle='#f5d1ec';ctx.fillText('LUNA ♡',npc.x+15,npc.y-29);ctx.font='10px sans-serif';ctx.fillStyle='#dfbedf';ctx.fillText('E · povídat si',npc.x+15,npc.y-13);
 for(const e of world.enemies){if(!e.alive)continue;const by=Math.sin(time*7+e.x*.01)*2;rounded(e.x,e.y+by,e.w,e.h,13,'#a07bc6');rounded(e.x+3,e.y+3+by,e.w-6,13,9,'#b996de');ellipse(e.x+10,e.y+13+by,3,4,'#39264f');ellipse(e.x+24,e.y+13+by,3,4,'#39264f');ctx.fillStyle='#ffdeef';ctx.beginPath();ctx.moveTo(e.x+7,e.y+3+by);ctx.lineTo(e.x+5,e.y-7+by);ctx.lineTo(e.x+14,e.y+2+by);ctx.fill();ellipse(e.x+7,e.y+31,6,3,'#745292');ellipse(e.x+28,e.y+31,6,3,'#745292')}
 drawBoss();
 const portal=world.portal;ctx.save();ctx.shadowColor='#ffb5e9';ctx.shadowBlur=25;ctx.strokeStyle='#f1b1ed';ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(portal.x+32,portal.y+50,29,49,0,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;const pg=ctx.createRadialGradient(portal.x+32,portal.y+50,0,portal.x+32,portal.y+50,48);pg.addColorStop(0,'#ffacd588');pg.addColorStop(1,'#ac8df320');ctx.fillStyle=pg;ctx.fill();for(let i=0;i<6;i++)star(portal.x+32+Math.sin(time+i)*20,portal.y+50+Math.cos(time*1.2+i)*39,3,'#ffdcf3');ctx.restore();ctx.fillStyle='#f9d7ef';ctx.font='10px sans-serif';ctx.fillText('DALŠÍ DOBRODRUŽSTVÍ',portal.x+32,portal.y-20);
 if(player)character(player.x,player.y);for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);star(p.x,p.y,4,p.color)}ctx.globalAlpha=1;ctx.restore();
 // Foreground glimmer, deliberately outside the collision space.
 for(let i=0;i<12;i++){const x=(i*137-time*8)%W,y=H-20+Math.sin(i+time)*20;ellipse(x,y,2,2,'#ffd2ed44')}
}
function frame(now){const elapsed=Math.min((now-last)/1000||0,.1);last=now;acc+=elapsed;while(acc>=1/120){update(1/120);acc-=1/120}draw();requestAnimationFrame(frame)}
loadLevel(0);requestAnimationFrame(frame);
// Small read-only inspection surface for deterministic verification and troubleshooting.
window.PinkAdventure={snapshot:()=>({state,level,coins,score,lives,affection,power:{...power},shield,player:{...player},world:JSON.parse(JSON.stringify(world))}),levelData};
})();
