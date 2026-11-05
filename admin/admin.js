/* لوحة الإدارة: تعدّل data/schedule.json في المستودع عبر واجهة GitHub */
(function(){
'use strict';
var DK=window.DK,PH=DK.PH,DAYS=DK.DAYS,esc=DK.esc,yearLabel=DK.yearLabel,toMin=DK.toMin,hueOf=DK.hueOf;
var $=function(s){return document.querySelector(s)};
var API='https://api.github.com',FILE='data/schedule.json',KEY='dk.admin';
var cfg=null,sha=null,sessions=[],dirty=false,busy=false,editId=null;
var SITE_FILE='data/site.json',siteSha=null,site={notice:'',centerName:'',address:'',phone:'',motto:'',tips:[]},siteDirty=false;

function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v);return true}catch(e){return false}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
var toast=function(msg){var t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(function(){t.classList.remove('on')},2400)};
function setStatus(el,msg,err){el.textContent=msg;el.classList.toggle('err',!!err)}

/* ---------- GitHub ---------- */
function gh(path,opts){
  opts=opts||{};
  opts.headers=Object.assign({'Authorization':'Bearer '+cfg.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},opts.headers||{});
  return fetch(API+path,opts);
}
function repoPath(){return '/repos/'+encodeURIComponent(cfg.owner)+'/'+encodeURIComponent(cfg.repo)}
function loadFile(){
  return gh(repoPath()+'/contents/'+FILE+'?t='+Date.now()).then(function(r){
    if(r.status===404){sha=null;sessions=DK.seed();return}
    if(!r.ok)throw new Error('read '+r.status);
    return r.json().then(function(j){
      sha=j.sha;
      var d=JSON.parse(DK.b64dec(j.content));
      sessions=(Array.isArray(d.sessions)?d.sessions:[]).map(DK.clean).filter(Boolean);
    });
  });
}
function loadSite(){
  return gh(repoPath()+'/contents/'+SITE_FILE+'?t='+Date.now()).then(function(r){
    if(r.status===404){siteSha=null;return}
    if(!r.ok)throw new Error('read '+r.status);
    return r.json().then(function(j){siteSha=j.sha;var d=JSON.parse(DK.b64dec(j.content));
      site={notice:String(d.notice||''),centerName:String(d.centerName||''),address:String(d.address||''),phone:String(d.phone||''),motto:String(d.motto||''),tips:(Array.isArray(d.tips)?d.tips:[]).filter(function(x){return Array.isArray(x)&&typeof x[0]==='string'&&typeof x[1]==='string'})};
    });
  });
}
function fillSite(){
  $('#sNotice').value=site.notice;$('#sName').value=site.centerName;$('#sAddr').value=site.address;$('#sPhone').value=site.phone;$('#sMotto').value=site.motto.replace(/\n/g,' | ');
  renderTips();
}
function renderTips(){
  var ul=$('#tipList');
  if(!site.tips.length){ul.innerHTML='<li class="empty"><b>لا توجد نصائح</b>أضف نصيحة من النموذج أدناه.</li>';return}
  ul.innerHTML=site.tips.map(function(t,i){return '<li class="sess" style="--h:'+hueOf(t[0])+';grid-template-columns:1fr auto"><div><h4>'+esc(t[0])+'</h4><p>'+esc(t[1])+'</p></div><button class="btn danger" type="button" data-tdel="'+i+'">حذف</button></li>'}).join('');
}
['sNotice','sName','sAddr','sPhone','sMotto'].forEach(function(id){
  document.getElementById(id).addEventListener('input',function(){
    site.notice=$('#sNotice').value;site.centerName=$('#sName').value;site.address=$('#sAddr').value;site.phone=$('#sPhone').value;
    site.motto=$('#sMotto').value.split('|').map(function(x){return x.trim()}).join('\n');
    siteDirty=true;updateBar();
  });
});
$('#tAdd').addEventListener('click',function(){
  var t=$('#tTitle').value.trim(),x=$('#tText').value.trim();
  if(!t||!x){setStatus($('#aStatus'),'اكتب عنوان النصيحة ونصها.',true);return}
  site.tips.push([t,x]);$('#tTitle').value='';$('#tText').value='';siteDirty=true;renderTips();updateBar();
});
$('#tipList').addEventListener('click',function(e){
  var b=e.target.closest('[data-tdel]');if(!b)return;
  if(b.dataset.armed){site.tips.splice(+b.dataset.tdel,1);siteDirty=true;renderTips();updateBar()}
  else{b.dataset.armed='1';b.textContent='تأكيد الحذف؟';setTimeout(function(){if(b.isConnected){delete b.dataset.armed;b.textContent='حذف'}},3000)}
});
function serialize(){
  return '{\n "updatedAt": '+JSON.stringify(new Date().toISOString())+',\n "sessions": [\n'+
    sessions.map(function(s){return '  '+JSON.stringify(s)}).join(',\n')+'\n ]\n}\n';
}

/* ---------- login ---------- */
function detect(){
  var m=location.hostname.match(/^(.+)\.github\.io$/),seg=location.pathname.split('/').filter(Boolean);
  return m?{owner:m[1],repo:seg[0]&&seg[0]!=='admin'?seg[0]:''}:{owner:'',repo:''};
}
function showEditor(){
  $('#login').classList.add('hidden');$('#editor').classList.remove('hidden');$('#logout').classList.remove('hidden');
  fillPhaseYear();renderList();fillSite();updateBar();
}
function login(c,quiet){
  cfg=c;
  var st=$('#lStatus');if(!quiet)setStatus(st,'جارٍ التحقق…');
  return gh(repoPath()).then(function(r){
    if(r.status===401)throw new Error('المفتاح غير صالح أو منتهي.');
    if(r.status===404)throw new Error('لم أجد المستودع. تحقق من اسم الحساب والمستودع، ومن أن المفتاح يشمله.');
    if(!r.ok)throw new Error('تعذّر الاتصال بـ GitHub ('+r.status+').');
    return r.json();
  }).then(function(repo){
    if(!(repo.permissions&&repo.permissions.push))throw new Error('هذا المفتاح لا يملك صلاحية الكتابة. اجعل Contents على Read and write.');
    return loadFile().then(loadSite);
  }).then(function(){
    lsSet(KEY,JSON.stringify(cfg));showEditor();setStatus(st,'');
  }).catch(function(e){
    cfg=null;
    if(quiet){lsDel(KEY)}
    setStatus(st,e.message||'تعذّر الدخول.',true);
  });
}
$('#loginForm').addEventListener('submit',function(e){
  e.preventDefault();
  login({owner:$('#lOwner').value.trim(),repo:$('#lRepo').value.trim(),token:$('#lToken').value.trim()});
});
$('#logout').addEventListener('click',function(){
  lsDel(KEY);cfg=null;sessions=[];dirty=false;
  $('#editor').classList.add('hidden');$('#login').classList.remove('hidden');$('#logout').classList.add('hidden');$('#lToken').value='';
});
(function init(){
  var d=detect();$('#lOwner').value=d.owner;$('#lRepo').value=d.repo;
  var saved=null;try{saved=JSON.parse(lsGet(KEY)||'null')}catch(e){}
  if(saved&&saved.owner&&saved.repo&&saved.token){$('#lOwner').value=saved.owner;$('#lRepo').value=saved.repo;login(saved,true)}
})();

/* ---------- form ---------- */
function opt(list){return list.map(function(x){return '<option value="'+x[0]+'">'+esc(x[1])+'</option>'}).join('')}
function fillYears(sel){
  var p=$('#fPhase').value,h=[];for(var y=1;y<=PH[p].years;y++)h.push([y,yearLabel(p,y)]);
  $('#fYear').innerHTML=opt(h);if(sel)$('#fYear').value=sel;
}
function fillPhaseYear(){
  $('#fPhase').innerHTML=opt(Object.keys(PH).map(function(p){return [p,PH[p].label]}));
  $('#fDay').innerHTML=opt(DAYS.map(function(d,i){return [i,d]}));
  fillYears();
}
$('#fPhase').addEventListener('change',function(){fillYears();renderList()});
$('#fYear').addEventListener('change',renderList);

function level(){return {p:$('#fPhase').value,y:+$('#fYear').value}}
function renderList(){
  var L=level(),ul=$('#aList');
  var l=sessions.filter(function(x){return x.p===L.p&&x.y===L.y}).sort(function(a,b){return a.d-b.d||toMin(a.s)-toMin(b.s)});
  if(!l.length){ul.innerHTML='<li class="empty"><b>لا توجد حصص لهذا المستوى</b>أضف أول حصة من النموذج أعلاه.</li>';return}
  ul.innerHTML=l.map(function(s){
    return '<li class="sess" style="--h:'+hueOf(s.sub)+'"><div class="time"><b>'+s.s+'</b><span>'+s.e+'</span></div><div><h4>'+esc(s.sub)+(DK.isDemo(s)?' <span class="pill">تجريبية</span>':'')+'</h4><p>'+DAYS[s.d]+(s.room?' · '+esc(s.room):'')+(s.note?' · '+esc(s.note):'')+'</p></div><button class="btn" type="button" data-edit="'+esc(s.id)+'">تعديل</button><button class="btn danger" type="button" data-del="'+esc(s.id)+'">حذف</button></li>';
  }).join('');
}
function updateBar(){
  var demos=sessions.filter(DK.isDemo).length;
  var any=dirty||siteDirty;
  $('#publish').disabled=!any||busy;
  $('#fWarn').textContent=demos?('ما تزال '+demos+' حصة تجريبية ظاهرة للزوار. احذفها بزر «حذف الحصص التجريبية» قبل النشر.'):'';
  if(!busy)setStatus($('#aStatus'),any?'لديك تغييرات غير منشورة.':'لا توجد تغييرات.');
}
function resetForm(){
  editId=null;$('#fSubmit').textContent='إضافة الحصة';$('#formTitle').textContent='إضافة حصة';$('#fCancel').classList.add('hidden');
  $('#fSub').value='';$('#fNote').value='';$('#fRoom').value='';
}
function change(){dirty=true;renderList();updateBar()}

$('#form').addEventListener('submit',function(e){
  e.preventDefault();
  var obj=DK.clean({id:editId||('s'+Date.now().toString(36)),p:$('#fPhase').value,y:$('#fYear').value,d:$('#fDay').value,s:$('#fStart').value,e:$('#fEnd').value,sub:$('#fSub').value.trim(),room:$('#fRoom').value.trim(),note:$('#fNote').value.trim()});
  if(!obj){setStatus($('#aStatus'),'أكمل المادة والوقت.',true);return}
  if(toMin(obj.e)<=toMin(obj.s)){setStatus($('#aStatus'),'وقت النهاية يجب أن يكون بعد البداية.',true);return}
  if(editId){sessions=sessions.map(function(x){return x.id===editId?obj:x})}else{sessions.push(obj)}
  var was=!!editId;resetForm();change();toast(was?'تم تعديل الحصة (غير منشورة بعد)':'تمت إضافة الحصة (غير منشورة بعد)');
});
$('#fCancel').addEventListener('click',resetForm);
$('#aList').addEventListener('click',function(e){
  var ed=e.target.closest('[data-edit]'),dl=e.target.closest('[data-del]');
  if(ed){
    var s=sessions.filter(function(x){return x.id===ed.dataset.edit})[0];if(!s)return;
    editId=s.id;$('#fPhase').value=s.p;fillYears(s.y);$('#fDay').value=s.d;$('#fStart').value=s.s;$('#fEnd').value=s.e;
    $('#fSub').value=s.sub;$('#fRoom').value=s.room;$('#fNote').value=s.note;
    $('#fSubmit').textContent='حفظ التعديل';$('#formTitle').textContent='تعديل حصة';$('#fCancel').classList.remove('hidden');
    $('#form').scrollIntoView({behavior:'smooth',block:'center'});
  }
  if(dl){
    if(dl.dataset.armed){sessions=sessions.filter(function(x){return x.id!==dl.dataset.del});change()}
    else{dl.dataset.armed='1';dl.textContent='تأكيد الحذف؟';setTimeout(function(){if(dl.isConnected){delete dl.dataset.armed;dl.textContent='حذف'}},3000)}
  }
});
$('#clearDemo').addEventListener('click',function(){
  var b=this;
  if(!b.dataset.armed){b.dataset.armed='1';b.textContent='تأكيد حذف التجريبية؟';setTimeout(function(){delete b.dataset.armed;b.textContent='حذف الحصص التجريبية'},3000);return}
  delete b.dataset.armed;b.textContent='حذف الحصص التجريبية';
  sessions=sessions.filter(function(x){return !DK.isDemo(x)});change();
});

/* ---------- publish ---------- */
function putFile(path,text,curSha){
  var body={message:'تحديث '+path,content:DK.b64enc(text)};
  if(curSha)body.sha=curSha;
  return gh(repoPath()+'/contents/'+path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){
    if(r.status===409||r.status===422)throw new Error('تغيّر الملف من مكان آخر. أعد تحميل الصفحة ثم كرّر التعديل.');
    if(r.status===401||r.status===403)throw new Error('لا تملك صلاحية الكتابة. تحقق من المفتاح.');
    if(!r.ok)throw new Error('فشل النشر ('+r.status+').');
    return r.json();
  }).then(function(j){return j.content.sha});
}
$('#publish').addEventListener('click',function(){
  if(busy||!(dirty||siteDirty)||!cfg)return;
  busy=true;updateBar();setStatus($('#aStatus'),'جارٍ النشر…');
  var p=Promise.resolve();
  if(dirty)p=p.then(function(){return putFile(FILE,serialize(),sha)}).then(function(s){sha=s;dirty=false});
  if(siteDirty)p=p.then(function(){return putFile(SITE_FILE,JSON.stringify(site,null,1)+'\n',siteSha)}).then(function(s){siteSha=s;siteDirty=false});
  p.then(function(){
    busy=false;updateBar();setStatus($('#aStatus'),'تم النشر ✓ يظهر للزوار خلال دقائق.');toast('تم النشر ✓');
  }).catch(function(e){
    busy=false;updateBar();setStatus($('#aStatus'),e.message||'فشل النشر.',true);
  });
});
window.addEventListener('beforeunload',function(e){if(dirty||siteDirty){e.preventDefault();e.returnValue=''}});
})();
