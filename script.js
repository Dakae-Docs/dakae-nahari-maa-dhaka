/* الموقع العام: يقرأ الحصص من data/schedule.json */
(function(){
'use strict';
var DK=window.DK,PH=DK.PH,DAYS=DK.DAYS,MONTHS=DK.MONTHS,esc=DK.esc,yearLabel=DK.yearLabel,toMin=DK.toMin,hueOf=DK.hueOf,
    idxOf=DK.idxOf,dateOf=DK.dateOf,fmtShort=DK.fmtShort,dayNum=DK.dayNum,algiersNow=DK.algiersNow;
var $=function(s){return document.querySelector(s)};
var TIPS=[
 ['جهّز غدك من الليلة','رتّب الحقيبة مع طفلك، وراجع مستلزمات الحصة حتى يبدأ يومه بهدوء.'],
 ['دقيقة شرح','بعد المراجعة، يغلق الطفل الدفتر ويشرح ما تعلّمه في دقيقة واحدة. ما يستطيع شرحه فقد فهمه.'],
 ['وقت ثابت للمراجعة','اختاروا ساعة قصيرة ثابتة كل يوم. الانتظام أنفع من ساعات طويلة قبل الاختبار.'],
 ['اسأل سؤالًا واحدًا','اسأله عن أجمل شيء تعلّمه اليوم بدل أن تسأله عمّا حفظ.'],
 ['استراحة بين المراجعتين','بعد 25 دقيقة من العمل، خذ استراحة من 5 دقائق بعيدًا عن الشاشة.'],
 ['نوم كافٍ','الدماغ يثبّت المعلومة أثناء النوم. نوم مبكر يساوي حفظًا أفضل.']
];
var toast=function(msg){var t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('on')},2200)};
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}

var now=algiersNow();
var TODAY=dayNum(now.year,now.month,now.day);
var st={p:null,y:null,week:TODAY-idxOf(TODAY),sel:TODAY,sessions:DK.seed(),updatedAt:null};
var demo=function(){return st.sessions.some(DK.isDemo)};
var forLevel=function(p,y){return st.sessions.filter(function(x){return x.p===p&&x.y===y}).sort(function(a,b){return a.d-b.d||toMin(a.s)-toMin(b.s)})};
var forDay=function(p,y,d){return forLevel(p,y).filter(function(x){return x.d===d})};

/* ---------- level ---------- */
function renderLevel(){
  $('#phases').innerHTML=Object.keys(PH).map(function(p){
    return '<button class="phase" type="button" data-p="'+p+'" aria-pressed="'+(st.p===p)+'"><span aria-hidden="true">'+PH[p].icon+'</span>'+PH[p].label+'</button>';
  }).join('');
  var yb=$('#years');
  if(!st.p){yb.innerHTML='<span class="hint">اختر الطور أولًا لتظهر السنوات.</span>'}
  else{
    var h='';for(var y=1;y<=PH[st.p].years;y++)h+='<button class="chip" type="button" data-y="'+y+'" aria-pressed="'+(st.y===y)+'">'+yearLabel(st.p,y)+'</button>';
    yb.innerHTML=h;
  }
  $('#saveLevel').disabled=!(st.p&&st.y);
}
$('#phases').addEventListener('click',function(e){
  var b=e.target.closest('[data-p]');if(!b)return;
  if(st.p!==b.dataset.p){st.p=b.dataset.p;st.y=null}
  $('#savedNote').textContent='';renderAll();
});
$('#years').addEventListener('click',function(e){
  var b=e.target.closest('[data-y]');if(!b)return;
  st.y=+b.dataset.y;$('#savedNote').textContent='';renderAll();
  $('#schedule').scrollIntoView({behavior:'smooth',block:'start'});
});
$('#saveLevel').addEventListener('click',function(){
  if(!(st.p&&st.y))return;
  var ok=lsSet('dakae.level',JSON.stringify({p:st.p,y:st.y}));
  $('#savedNote').textContent=ok?'تم حفظ مستواك على هذا الجهاز ✓':'تعذّر الحفظ في هذا المتصفح.';
});
try{var sv=JSON.parse(lsGet('dakae.level')||'null');if(sv&&PH[sv.p]&&sv.y>=1&&sv.y<=PH[sv.p].years){st.p=sv.p;st.y=sv.y}}catch(e){}

/* ---------- next session ---------- */
function renderNext(){
  var box=$('#next');
  if(!(st.p&&st.y)){box.classList.remove('on');return}
  var nm=algiersNow(),nowMin=nm.hour*60+nm.minute,today=dayNum(nm.year,nm.month,nm.day),found=null,k,i;
  for(k=0;k<8&&!found;k++){
    var list=forDay(st.p,st.y,idxOf(today+k));
    for(i=0;i<list.length;i++){
      var s=list[i];
      if(k>0||toMin(s.e)>nowMin){found={s:s,k:k,live:k===0&&toMin(s.s)<=nowMin};break}
    }
  }
  box.classList.add('on');
  if(!found){box.innerHTML='<div><small>'+esc(yearLabel(st.p,st.y))+'</small><div class="big">لا توجد حصص منشورة بعد</div></div>';return}
  var when=found.live?'جارية الآن':found.k===0?'اليوم':found.k===1?'غدًا':DAYS[idxOf(today+found.k)];
  box.innerHTML='<div><small>حصتك القادمة</small><div class="big">'+esc(found.s.sub)+'</div></div><span class="tag">'+when+' · '+found.s.s+'</span>';
}

/* ---------- week & day ---------- */
function renderWeek(){
  var a=st.week,b=st.week+6;
  $('#range').textContent=fmtShort(a)+' — '+fmtShort(b)+' '+dateOf(b).y;
  var h='';
  for(var i=0;i<7;i++){
    var n=a+i,c=(st.p&&st.y)?forDay(st.p,st.y,i).length:0;
    h+='<button class="day'+(n===TODAY?' is-today':'')+'" type="button" data-n="'+n+'" aria-pressed="'+(n===st.sel)+'"><span>'+DAYS[i]+'</span><b>'+dateOf(n).d+'</b><i>'+(c?c+(c===1?' حصة':' حصص'):'')+'</i></button>';
  }
  $('#days').innerHTML=h;
}
function renderDay(){
  var idx=idxOf(st.sel),o=dateOf(st.sel);
  $('#dayName').textContent=DAYS[idx]+'، '+o.d+' '+MONTHS[o.m];
  var ul=$('#sessions');
  if(!(st.p&&st.y)){ul.innerHTML='<li class="empty"><b>اختر مستواك أولًا</b>اختر الطور والسنة في الأعلى لتظهر حصصك.</li>';return}
  var list=forDay(st.p,st.y,idx);
  if(!list.length){ul.innerHTML='<li class="empty"><b>لا توجد حصص منشورة لهذا اليوم</b>اختر يومًا آخر أو تابع الصفحة لاحقًا.</li>';return}
  var nm=algiersNow(),nowMin=nm.hour*60+nm.minute,isToday=st.sel===TODAY;
  ul.innerHTML=list.map(function(s){
    var cls='',pill='حصة';
    if(isToday){
      if(nowMin>=toMin(s.e)){cls=' done';pill='انتهت'}
      else if(nowMin>=toMin(s.s)){cls=' now';pill='جارية الآن'}
      else{pill='قادمة'}
    }
    var meta=[s.room,s.note].filter(Boolean).join(' · ');
    return '<li class="sess'+cls+'" style="--h:'+hueOf(s.sub)+'"><div class="time"><b>'+s.s+'</b><span>'+s.e+'</span></div><div><h4>'+esc(s.sub)+'</h4>'+(meta?'<p>'+esc(meta)+'</p>':'')+'</div><span class="pill">'+pill+'</span></li>';
  }).join('');
}
$('#days').addEventListener('click',function(e){var b=e.target.closest('[data-n]');if(!b)return;st.sel=+b.dataset.n;renderWeek();renderDay()});
function shiftWeek(dlt){
  st.week+=dlt;var idx=idxOf(st.sel);
  st.sel=(TODAY>=st.week&&TODAY<=st.week+6)?TODAY:st.week+idx;
  renderWeek();renderDay();
}
$('#prevW').addEventListener('click',function(){shiftWeek(-7)});
$('#nextW').addEventListener('click',function(){shiftWeek(7)});
$('#todayB').addEventListener('click',function(){st.week=TODAY-idxOf(TODAY);st.sel=TODAY;renderWeek();renderDay()});

/* ---------- share & print ---------- */
function weekText(){
  if(!(st.p&&st.y))return '';
  var lines=['برنامج '+yearLabel(st.p,st.y)+' — مركز ذكاء','الأسبوع: '+fmtShort(st.week)+' — '+fmtShort(st.week+6),''];
  var any=false;
  for(var i=0;i<7;i++){
    var l=forDay(st.p,st.y,i);if(!l.length)continue;any=true;
    lines.push(DAYS[i]+' '+dateOf(st.week+i).d);
    l.forEach(function(s){lines.push('  • '+s.s+' – '+s.e+'  '+s.sub+(s.room?' ('+s.room+')':''))});
  }
  if(!any)lines.push('لا توجد حصص منشورة بعد.');
  if(demo())lines.push('','(حصص تجريبية للتعرّف على الصفحة)');
  lines.push('','شارع محمد خميستي، بجانب CNAS — عين البرد، سيدي بلعباس');
  try{lines.push(location.href.split('#')[0])}catch(e){}
  return lines.join('\n');
}
function needLevel(){if(!(st.p&&st.y)){toast('اختر المستوى أولًا');return true}return false}
function copyText(t){
  return (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).catch(function(){
    var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();
    var ok=false;try{ok=document.execCommand('copy')}catch(e){}ta.remove();if(!ok)throw new Error('copy');
  });
}
$('#copyWeek').addEventListener('click',function(){
  if(needLevel())return;
  copyText(weekText()).then(function(){toast('تم نسخ برنامج الأسبوع ✓')},function(){toast('تعذّر النسخ')});
});
$('#wa').addEventListener('click',function(e){
  if(needLevel()){e.preventDefault();return}
  this.href='https://wa.me/?text='+encodeURIComponent(weekText());
});
function renderPrint(){
  var sh=$('#printSheet');
  if(!(st.p&&st.y)){sh.innerHTML='';return}
  var rows='';
  for(var i=0;i<7;i++){
    var l=forDay(st.p,st.y,i),o=dateOf(st.week+i);
    rows+='<tr><th>'+DAYS[i]+'<br><small>'+o.d+' '+MONTHS[o.m]+'</small></th><td>'+(l.length?l.map(function(s){
      return '<div><b>'+s.s+' – '+s.e+'</b> '+esc(s.sub)+(s.room?' ('+esc(s.room)+')':'')+(s.note?' — '+esc(s.note):'')+'</div>';
    }).join(''):'<span class="n">—</span>')+'</td></tr>';
  }
  sh.innerHTML='<h1>مركز ذكاء — '+esc(yearLabel(st.p,st.y))+'</h1><p>الأسبوع: '+fmtShort(st.week)+' — '+fmtShort(st.week+6)+' '+dateOf(st.week+6).y+' · بتوقيت الجزائر'+(demo()?' · حصص تجريبية':'')+'</p><table>'+rows+'</table><p>شارع محمد خميستي، بجانب CNAS — عين البرد، سيدي بلعباس</p>';
}
$('#dl').addEventListener('click',function(){
  if(needLevel())return;
  renderPrint();
  window.print();
});

/* ---------- tips ---------- */
var tipI=((TODAY%TIPS.length)+TIPS.length)%TIPS.length;
function renderTip(){
  $('#tipT').textContent=TIPS[tipI][0];$('#tipP').textContent=TIPS[tipI][1];
  $('#dots').innerHTML=TIPS.map(function(_,i){return '<i class="'+(i===tipI?'on':'')+'"></i>'}).join('');
}
$('#tipN').addEventListener('click',function(){tipI=(tipI+1)%TIPS.length;renderTip()});
var checks=document.querySelectorAll('.check input');
function allChecked(){return [].every.call(checks,function(c){return c.checked})}
function updateDone(){
  $('#doneMsg').textContent=allChecked()?'ممتاز! أنتم جاهزون ✓':'';
  var m={};[].forEach.call(checks,function(c){m[c.dataset.k]=c.checked});
  lsSet('dakae.check.'+TODAY,JSON.stringify(m));
}
try{var cs=JSON.parse(lsGet('dakae.check.'+TODAY)||'{}');[].forEach.call(checks,function(c){c.checked=!!cs[c.dataset.k]})}catch(e){}
[].forEach.call(checks,function(c){c.addEventListener('change',updateDone)});
$('#doneMsg').textContent=allChecked()?'ممتاز! أنتم جاهزون ✓':'';

/* ---------- render & load ---------- */
var SITE={notice:''};
function renderMeta(){
  var msg=demo()?'هذه حصص تجريبية للتعرّف على الصفحة. سينشر المركز برنامجه المعتمد هنا قريبًا.':(SITE.notice||'');
  $('#noticeText').textContent=msg;
  $('#notice').classList.toggle('on',!!msg);
  $('#updated').textContent=st.updatedAt?('آخر تحديث: '+st.updatedAt.toLocaleString('ar-DZ',{timeZone:'Africa/Algiers',dateStyle:'short',timeStyle:'short'})):'';
}
function renderAll(){renderLevel();renderNext();renderWeek();renderDay();renderMeta()}
renderAll();renderTip();

function applySite(d){
  if(!d||typeof d!=='object')return;
  var str=function(v,n){return typeof v==='string'?v.slice(0,n):''};
  SITE.notice=str(d.notice,300);
  if(d.centerName)$('#cname').textContent=str(d.centerName,120);
  if(d.address)$('#addr').textContent=str(d.address,200);
  var ph=str(d.phone,40);$('#phone').hidden=!ph;$('#phone').textContent=ph?('الهاتف: '+ph):'';
  if(d.motto){var m=$('#motto');m.textContent='';str(d.motto,80).split('\n').forEach(function(l,i){if(i)m.appendChild(document.createElement('br'));m.appendChild(document.createTextNode(l))})}
  if(Array.isArray(d.tips)){
    var t=d.tips.filter(function(x){return Array.isArray(x)&&typeof x[0]==='string'&&typeof x[1]==='string'&&x[0]}).slice(0,20).map(function(x){return [x[0].slice(0,80),x[1].slice(0,400)]});
    if(t.length){TIPS=t;tipI=((TODAY%TIPS.length)+TIPS.length)%TIPS.length;renderTip()}
  }
  renderMeta();
}
fetch('data/site.json?v='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw 0;return r.json()}).then(applySite).catch(function(){});

fetch('data/schedule.json?v='+Date.now(),{cache:'no-store'})
  .then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})
  .then(function(d){
    var arr=Array.isArray(d.sessions)?d.sessions.map(DK.clean).filter(Boolean):null;
    if(!arr)return;
    st.sessions=arr;
    if(d.updatedAt){var t=new Date(d.updatedAt);if(!isNaN(t))st.updatedAt=t}
    renderAll();
  })
  .catch(function(){/* بدون ملف البيانات (مثل فتح الملف محليًا) تبقى الحصص التجريبية */});
})();
