const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),events={};
function element(id){if(!elements.has(id))elements.set(id,{textContent:'',hidden:false,style:{},classList:{add(){},remove(){}},dataset:{},tagName:'DIV',addEventListener(){},setAttribute(){},focus(){},blur(){},querySelector(){return element('menu-card')},innerHTML:''});return elements.get(id)}
const gifts=[10,25,50].map(n=>Object.assign(element('gift'+n),{dataset:{gift:String(n)}}));
const context=new Proxy({},{get:(o,k)=>k==='createLinearGradient'||k==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});element('game').getContext=()=>context;
const env={console,Math,Set,JSON,Number,String,document:{getElementById:element,querySelectorAll:s=>s==='[data-gift]'?gifts:[],body:element('body'),addEventListener(){},activeElement:element('active')},localStorage:{getItem(){return null},setItem(){}},addEventListener:(n,f)=>events[n]=f,requestAnimationFrame(){}};env.window=env;
vm.createContext(env);let source=fs.readFileSync(__dirname+'/dist/game.js','utf8').replace('window.PinkAdventure={','window.test={startGame,loadLevel,update,keys,hurt,openDialog,closeDialog,complete,resume,updateBoss,drawBoss, get player(){return player},get world(){return world},set coins(v){coins=v},set affection(v){affection=v},set gold(v){power.gold=v}};window.PinkAdventure={');if(process.env.DEBUG_GAME)source=source.replace('lives--;burst','console.log("damage",level,player.x,player.y,fall);lives--;burst');vm.runInContext(source,env);const t=env.test,s=()=>env.PinkAdventure.snapshot(),step=(n=1)=>{for(let i=0;i<n;i++)t.update(1/120)};
t.startGame();step(120);assert.equal(s().player.y,446,'ground collision');
events.keydown({code:'Space',target:{tagName:'DIV'},preventDefault(){}});step(25);assert(s().player.y<365,'keyboard jump');t.keys.clear();step(150);assert.equal(s().player.y,446,'jump landing');
t.player.x=580;t.player.y=446;t.keys.add('ArrowRight');step(40);assert(t.player.x<=560,'solid wall side collision');t.keys.clear();
t.player.x=190;t.player.y=446;const before=s().coins;step();assert(s().coins>before,'coin collection');
for(const type of ['jump','gold','speed']){const item=t.world.items.find(x=>x.type===type);t.player.x=item.x;t.player.y=item.y;t.player.vy=0;step();assert(s().power[type]>0,'power activation '+type);t.player.x=90;t.player.y=446;step(1300);assert.equal(s().power[type],0,'power expiry '+type)}
t.player.x=230;t.player.y=446;t.openDialog();assert.equal(s().state,'dialog');t.coins=9;gifts[0].onclick();assert.equal(s().affection,0,'no overspending');t.coins=200;gifts[2].onclick();assert.equal(s().affection,35);assert.equal(s().coins,150);gifts[2].onclick();gifts[1].onclick();assert(s().shield,'relationship shield');gifts[2].onclick();assert.equal(s().affection,100,'affection cap');t.closeDialog();
t.startGame();t.player.inv=0;const e=t.world.enemies[0];t.player.x=e.x;t.player.y=e.y-45;t.player.vy=150;step(5);assert(!e.alive,'stomp enemy');assert(s().score>=50);
t.player.inv=0;t.hurt();assert.equal(s().lives,2);t.hurt();assert.equal(s().lives,2,'damage grace');t.hurt(true);t.hurt(true);assert.equal(s().state,'over');
// Focused boss checks: wake-up, telegraphed charge, damage, rewards and reset.
t.startGame();let boss=t.world.boss;assert.equal(boss.awake,false);t.drawBoss();
t.player.x=500;t.updateBoss(1/120,490);assert(boss.awake);assert.equal(boss.phase,'warning');t.drawBoss();
t.updateBoss(1.5,490);assert.equal(boss.phase,'charge');t.updateBoss(.2,490);assert(boss.x>=boss.lo&&boss.x<=boss.hi);
t.player.x=boss.x;t.player.y=446;t.player.inv=0;t.updateBoss(.01,490);assert.equal(s().lives,2,'boss side damage');
for(let hit=0;hit<3;hit++){boss.inv=0;t.player.x=boss.x+30;t.player.y=boss.y-40;t.player.vy=100;t.updateBoss(.01,boss.y-2);assert.equal(boss.hp,2-hit);if(hit===0){t.player.y=boss.y-40;t.player.vy=100;t.updateBoss(.01,boss.y-2);assert.equal(boss.hp,2,'boss hit cooldown')}}
assert.equal(s().score,500);assert.equal(s().coins,15);t.updateBoss(1,490);assert.equal(s().score,500,'boss rewards only once');t.drawBoss();
t.startGame();assert.equal(t.world.boss.hp,3);assert.equal(t.world.boss.awake,false);t.loadLevel(1);assert.equal(t.world.boss,null);
console.log('PASS: Noctis sleeping/awake rendering, warning, charge bounds, side damage, three stomps, hit cooldown, rewards and restart.');
if(process.argv.includes('--boss'))process.exit(0);
// Full traversal using ordinary horizontal movement and timed jumps, no teleportation.
t.startGame();const results=[];
for(let n=0;n<3;n++){
 if(n>0){element('overlay-action').onclick()}
 let frames=0;
 while(s().state==='playing'&&frames<14000){const p=t.player,w=t.world;if(p.x>=w.portal.x&&p.x<=w.portal.x+w.portal.w)t.keys.delete('ArrowRight');else t.keys.add('ArrowRight');
  const platform=w.platforms.find(a=>Math.abs(a.y-p.y-p.h)<2&&p.x+p.w>a.x&&p.x<a.x+a.w);
  const edge=platform&&platform.x+platform.w<w.width?platform.x+platform.w:Infinity;
  const threat=w.enemies.some(e=>e.alive&&e.x>p.x-10&&e.x-p.x<75&&p.y+p.h>e.y)||w.hazards.some(h=>h.x>p.x-10&&h.x-p.x<75&&p.y+p.h>h.y)||w.platforms.some(a=>!a.ground&&a.y<p.y+p.h&&a.y>p.y+p.h-115&&a.x>p.x&&a.x-p.x<80);
  if(p.grounded&&(edge-p.x<40||threat)){events.keydown({code:'Space',target:{tagName:'DIV'},preventDefault(){}})}else t.keys.delete('Space');
  step();frames++;
 }
 results.push({level:n+1,state:s().state,frames,lives:s().lives});if(process.env.DEBUG_GAME)console.log(results.at(-1),s().player);assert.equal(s().state,n===2?'won':'transition','finish level '+(n+1));
}
console.log('PASS: physics, keyboard, coins, all powers/expiry, gifting/cap/rewards, enemy stomp, damage/grace, game over.');console.log('Full movement traversal:',results);
