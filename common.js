/* مشترك بين الموقع العام ولوحة الإدارة */
(function(){
'use strict';
var PH={
  primary:{label:'الطور الابتدائي',short:'ابتدائي',years:5,icon:'✎'},
  middle:{label:'الطور المتوسط',short:'متوسط',years:4,icon:'▦'},
  secondary:{label:'الطور الثانوي',short:'ثانوي',years:3,icon:'♜'}
};
var ORD=['الأولى','الثانية','الثالثة','الرابعة','الخامسة'];
var DAYS=['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
var MONTHS=['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
var HUES=[215,35,160,330,270,95];
var SUBJ={
  primary:['الرياضيات','اللغة العربية','اللغة الفرنسية','الإعلام الآلي'],
  middle:['الرياضيات','اللغة الفرنسية','اللغة الإنجليزية','الفيزياء','الإعلام الآلي'],
  secondary:['الرياضيات','الفيزياء','علوم الطبيعة والحياة','اللغة الإنجليزية','الإعلام الآلي']
};
var SLOTS=[['16:00','17:30'],['17:30','19:00'],['14:00','15:30']];

var DK={PH:PH,ORD:ORD,DAYS:DAYS,MONTHS:MONTHS};
DK.esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
DK.yearLabel=function(p,y){return 'السنة '+ORD[y-1]+' '+PH[p].short};
DK.toMin=function(t){var a=t.split(':');return (+a[0])*60+(+a[1])};
DK.hueOf=function(s){var n=0;for(var i=0;i<s.length;i++)n+=s.charCodeAt(i);return HUES[n%HUES.length]};
DK.algiersNow=function(){
  var f=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Algiers',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',hourCycle:'h23'});
  var o={};f.formatToParts(new Date()).forEach(function(x){o[x.type]=+x.value});return o;
};
DK.dayNum=function(y,m,d){return Math.floor(Date.UTC(y,m-1,d)/864e5)};
DK.idxOf=function(n){return ((((n+4)%7)+1)%7)};          /* السبت = 0 ... الجمعة = 6 */
DK.dateOf=function(n){var d=new Date(n*864e5);return {d:d.getUTCDate(),m:d.getUTCMonth(),y:d.getUTCFullYear()}};
DK.fmtShort=function(n){var o=DK.dateOf(n);return o.d+' '+MONTHS[o.m]};

DK.clean=function(x){
  if(!x||!PH[x.p])return null;
  var y=+x.y,d=+x.d;
  if(!(y>=1&&y<=PH[x.p].years)||!(d>=0&&d<=6))return null;
  var re=/^\d{2}:\d{2}$/;
  if(!re.test(x.s)||!re.test(x.e)||typeof x.sub!=='string'||!x.sub)return null;
  return {id:String(x.id||('s'+Math.random().toString(36).slice(2,9))),p:x.p,y:y,d:d,s:x.s,e:x.e,sub:x.sub.slice(0,60),room:String(x.room||'').slice(0,30),note:String(x.note||'').slice(0,80)};
};
DK.isDemo=function(s){return String(s.id).indexOf('demo-')===0};

DK.seed=function(){
  var out=[],k=0;
  Object.keys(PH).forEach(function(p){
    for(var y=1;y<=PH[p].years;y++){
      for(var i=0;i<3;i++){
        var s=SLOTS[(k+i)%3],list=SUBJ[p];
        out.push({id:'demo-'+p+y+'-'+i,p:p,y:y,d:(k+i*2)%6,s:s[0],e:s[1],sub:list[(k+i)%list.length],room:'القاعة '+(1+((k+i)%3)),note:''});
      }
      k++;
    }
  });
  return out;
};

/* تحويل نص UTF-8 من/إلى base64 (لواجهة GitHub) */
DK.b64enc=function(str){var b=new TextEncoder().encode(str),s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return btoa(s)};
DK.b64dec=function(b64){var s=atob(b64.replace(/\s/g,'')),b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i);return new TextDecoder().decode(b)};

window.DK=DK;
})();
