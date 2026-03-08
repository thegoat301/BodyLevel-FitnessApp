let currentUser=null;
let xp=0, streak=0, history=[], workout=[], chart;
let age=0, maxSessions=0, trainingLevel="debutant";

/* XP par exercice */
const xpValues={pushups:1.2, squats:1, plank:0.4, lunges:1, mountain:0.7, burpees:3, jumping:0.5, dips:2, crunch:0.8, legraise:1};
/* exercices par niveau */
const exercisesByLevel={
  debutant:["squats","crunch","jumping","plank"],
  moyen:["pushups","lunges","mountain"],
  confirme:["dips","legraise"],
  expert:["burpees"]
};

/* badges */
const BADGES={
  motivated:{name:"🔥 Motivé",condition:u=>u.streak>=3},
  regular:{name:"💪 Régulier",condition:u=>u.streak>=7},
  xp500:{name:"⚡ 500 XP",condition:u=>u.xp>=500},
  xp1000:{name:"🏆 1000 XP",condition:u=>u.xp>=1000},
  discipline:{name:"🧠 Discipline",condition:u=>u.history.length>=20}
};

/* défis possibles */
const DAILY_CHALLENGES=[
  {type:"reps",target:50},{type:"reps",target:80},{type:"xp",target:150},{type:"xp",target:300},{type:"exercises",target:2},{type:"exercises",target:3}
];

/* ---------- UTIL ---------- */
function getUsers(){return JSON.parse(localStorage.getItem("users"))||{};}
function saveUsers(users){localStorage.setItem("users",JSON.stringify(users));}
function getToday(){return new Date().toISOString().slice(0,10);}
function levelXP(level){return Math.floor(100*Math.pow(1.5,level-1));}
function getLevel(currentXP){let lvl=1;while(currentXP>=levelXP(lvl)) lvl++;return lvl;}

/* ---------- DAILY CHALLENGE ---------- */
function generateDailyChallenge(data){
  let today=getToday();
  if(!data.challenge || data.challenge.date!==today){
    let rand=DAILY_CHALLENGES[Math.floor(Math.random()*DAILY_CHALLENGES.length)];
    data.challenge={date:today,type:rand.type,target:rand.target,progress:0,done:false};
  }
  return data.challenge;
}

/* ---------- BADGES ---------- */
function showBadge(name){
  let popup=document.getElementById("badgePopup");
  document.getElementById("badgeName").innerText=name;
  let sound=document.getElementById("badgeSound"); if(sound) sound.play();
  popup.style.display="flex";
  setTimeout(()=>{popup.style.display="none";},2000);
}
function checkBadges(){
  let users=getUsers();
  let user=users[currentUser];
  if(!user.badges) user.badges=[];
  Object.keys(BADGES).forEach(key=>{
    if(!user.badges.includes(key) && BADGES[key].condition(user)){
      user.badges.push(key);
      showBadge(BADGES[key].name);
    }
  });
  saveUsers(users);
}

/* ---------- EXERCICES ---------- */
function loadExercises(){
  let select=document.getElementById("exercise"); select.innerHTML="";
  let allowed=[];
  if(trainingLevel==="debutant") allowed=exercisesByLevel.debutant;
  if(trainingLevel==="moyen") allowed=[...exercisesByLevel.debutant,...exercisesByLevel.moyen];
  if(trainingLevel==="confirme") allowed=[...exercisesByLevel.debutant,...exercisesByLevel.moyen,...exercisesByLevel.confirme];
  if(trainingLevel==="expert") allowed=[...exercisesByLevel.debutant,...exercisesByLevel.moyen,...exercisesByLevel.confirme,...exercisesByLevel.expert];
  allowed.forEach(ex=>{
    let option=document.createElement("option"); option.value=ex; option.textContent=ex; select.appendChild(option);
  });
}

/* ---------- CREATION COMPTE ---------- */
document.getElementById("createAccountBtn").onclick=()=>{
  let username=document.getElementById("username").value; if(!username) return;
  let users=getUsers(); if(users[username]){ alert("Compte existe déjà"); return; }
  age=parseInt(prompt("Quel âge as-tu ?"));
  if(age<=10) maxSessions=3; else if(age<=20) maxSessions=5; else if(age<=25) maxSessions=8; else maxSessions=10;
  trainingLevel=document.getElementById("levelSelect").value;
  users[username]={ xp:0, streak:0, history:[], records:{}, age, maxSessions, trainingLevel, dailySessions:{}, badges:[], challenge:{}, lastWorkout:null };
  saveUsers(users);
  alert("Compte créé !");
  const levelWrapper=document.getElementById("levelWrapper"); if(levelWrapper) levelWrapper.remove();
};

/* ---------- LOGIN ---------- */
document.getElementById("loginBtn").onclick=()=>{
  let username=document.getElementById("username").value;
  let users=getUsers(); if(!users[username]){ alert("Compte introuvable"); return; }
  currentUser=username; let data=users[username];
  xp=data.xp; streak=data.streak; history=data.history; age=data.age; maxSessions=data.maxSessions; trainingLevel=data.trainingLevel;
  generateDailyChallenge(data); saveUsers(users);

  document.getElementById("login").style.display="none";
  document.getElementById("app").style.display="block";

  /* --- AFFICHER LES BOUTONS BAS --- */
  document.getElementById("bottomNav").style.display="flex";

  loadExercises(); updateUI(); updateChart(); updateSessionCounter();
};

/* ---------- AJOUT EXERCICE ---------- */
document.getElementById("addExerciseBtn").onclick=()=>{
  let ex=document.getElementById("exercise").value; let reps=parseInt(document.getElementById("reps").value);
  if(reps<=0) return; if(reps>500) reps=500; // anti-triche
  workout.push({ex,reps}); updateWorkoutList();
};

/* ---------- LISTE ---------- */
function updateWorkoutList(){
  let list=document.getElementById("workoutList"); list.innerHTML="";
  workout.forEach((w,i)=>{
    let li=document.createElement("li"); li.innerText=w.ex+" : "+w.reps;
    let btn=document.createElement("button"); btn.innerText="X"; btn.className="remove-btn";
    btn.onclick=()=>{ workout.splice(i,1); updateWorkoutList(); };
    li.appendChild(btn); list.appendChild(li);
  });
}

/* ---------- STREAK ---------- */
function updateStreak(data){
  let today=getToday();
  if(!data.lastWorkout){ data.streak=1; }
  else{
    let last=new Date(data.lastWorkout);
    let now=new Date(today);
    let diff=(now-last)/(1000*60*60*24);
    if(diff===1) data.streak++; else if(diff>1) data.streak=1;
  }
  data.lastWorkout=today; streak=data.streak;
}

/* ---------- FIN SEANCE ---------- */
document.getElementById("finishWorkoutBtn").onclick=()=>{
  if(workout.length===0){ alert("Séance vide"); return; }
  let users=getUsers(); let data=users[currentUser]; let today=getToday();
  if(!data.dailySessions[today]) data.dailySessions[today]=0;
  if(data.dailySessions[today]>=maxSessions){ alert("Limite de séances atteinte pour aujourd'hui !"); return; }
  data.dailySessions[today]++;

  let gainedXP=0; let totalReps=0;
  workout.forEach(w=>{
    gainedXP+=w.reps*xpValues[w.ex];
    totalReps+=w.reps;
    if(!data.records[w.ex] || w.reps>data.records[w.ex]) data.records[w.ex]=w.reps;
  });
  if(gainedXP>500) gainedXP=500; // anti-triche

  /* challenge */
  let challenge=data.challenge;
  if(!challenge.done){
    if(challenge.type==="reps") challenge.progress+=totalReps;
    if(challenge.type==="xp") challenge.progress+=gainedXP;
    if(challenge.type==="exercises") challenge.progress+=workout.length;
    if(challenge.progress>=challenge.target){ challenge.done=true; gainedXP+=50; alert("🎯 Défi réussi ! +50 XP"); }
  }

  updateStreak(data);
  xp+=Math.floor(gainedXP); history.push(gainedXP); data.xp=xp; data.history=history; data.streak=streak;
  saveUsers(users); checkBadges();

  workout=[]; updateWorkoutList(); updateUI(); updateChart(); updateSessionCounter();
};

/* ---------- UI ---------- */
function updateSessionCounter(){
  let users=getUsers(); let data=users[currentUser]; let today=getToday();
  let done=data.dailySessions?.[today]||0;
  let remaining=maxSessions-done;
  document.getElementById("sessionCounter").innerText="Séances restantes : "+remaining+" / "+maxSessions;
}
function updateUI(){
  document.getElementById("xp").innerText=xp;
  let level=getLevel(xp); document.getElementById("level").innerText=level; document.getElementById("streak").innerText=streak;
  let prev=levelXP(level-1), next=levelXP(level); document.getElementById("xpfill").style.width=((xp-prev)/(next-prev)*100)+"%";
}
function updateChart(){
  let ctx=document.getElementById("chart"); if(chart) chart.destroy();
  chart=new Chart(ctx,{ type:"line", data:{ labels:history.map((_,i)=>"S"+(i+1)), datasets:[{label:"XP",data:history}] } });
}

/* ---------- NAVIGATION BOUTONS BAS ---------- */
document.getElementById("navProfile").onclick=()=>{
  let users=getUsers(); let data=users[currentUser];
  document.getElementById("profileXP").innerText=data.xp;
  document.getElementById("profileLevel").innerText=getLevel(data.xp);
  document.getElementById("profileStreak").innerText=data.streak;
  document.getElementById("profileAge").innerText=data.age;
  document.getElementById("profileTraining").innerText=data.trainingLevel;

  let list=document.getElementById("recordsList"); list.innerHTML="";
  Object.keys(data.records).forEach(ex=>{ let li=document.createElement("li"); li.innerText=ex+" : "+data.records[ex]; list.appendChild(li); });
  document.getElementById("profileModal").style.display="flex";
};
document.getElementById("navBadges").onclick=()=>{
  let users=getUsers(); let data=users[currentUser];
  let list=document.getElementById("badgesList"); list.innerHTML="";
  Object.keys(BADGES).forEach(key=>{
    let li=document.createElement("li"); let cond="";
    switch(key){ case "motivated": cond="Avoir une streak ≥ 3"; break;
                  case "regular": cond="Avoir une streak ≥ 7"; break;
                  case "xp500": cond="XP ≥ 500"; break;
                  case "xp1000": cond="XP ≥ 1000"; break;
                  case "discipline": cond="Avoir ≥ 20 séances"; break;}
    li.innerText=(data.badges.includes(key)?BADGES[key].name+" ✔":"🔒 "+BADGES[key].name)+" - "+cond;
    list.appendChild(li);
  });
  document.getElementById("badgesModal").style.display="flex";
};
document.getElementById("navChallenge").onclick=()=>{
  let users=getUsers(); let data=users[currentUser]; let c=data.challenge; let text="";
  if(c.type==="reps") text="Faire "+c.target+" répétitions";
  if(c.type==="xp") text="Gagner "+c.target+" XP";
  if(c.type==="exercises") text="Faire "+c.target+" exercices";
  text+="\nProgression : "+c.progress+" / "+c.target;
  if(c.done) text+="\n✅ Défi réussi";
  document.getElementById("challengeText").innerText=text;
  document.getElementById("challengeModal").style.display="flex";
};

/* ---------- FERMETURE MODALS ---------- */
document.getElementById("closeProfile").onclick=()=>{document.getElementById("profileModal").style.display="none";};
document.getElementById("closeBadges").onclick=()=>{document.getElementById("badgesModal").style.display="none";};
document.getElementById("closeChallenge").onclick=()=>{document.getElementById("challengeModal").style.display="none";};
window.onclick=(event)=>{
  const profile=document.getElementById("profileModal");
  const badges=document.getElementById("badgesModal");
  const challenge=document.getElementById("challengeModal");
  if(event.target===profile) profile.style.display="none";
  if(event.target===badges) badges.style.display="none";
  if(event.target===challenge) challenge.style.display="none";
};