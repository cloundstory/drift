/* Study-only storage. No browser storage is read or written. Iframes share
   this page's in-memory fixture, which disappears when the study is closed. */
(function(){
  'use strict';
  function memoryStorage(){
    const values=new Map();
    return {
      get length(){ return values.size; },
      key(i){ return [...values.keys()][i]??null; },
      getItem(k){ return values.get(String(k))??null; },
      setItem(k,v){ values.set(String(k),String(v)); },
      removeItem(k){ values.delete(String(k)); },
      clear(){ values.clear(); }
    };
  }
  const local=memoryStorage(), session=memoryStorage();
  const origin={n:'ผู้เขียนตัวอย่าง',p:'กรุงเทพ',la:13.7,lo:100.5};
  const destination={n:'ผู้รับตัวอย่าง',p:'เชียงใหม่',la:18.8,lo:99.0};
  const letter={id:'study-synthetic-letter',f:origin,t:destination,
    s:Date.now()-7*3600000,th:6,ct:0,lo:-1,dir:'out',
    lg:Array.from({length:12},()=>[.5,0,18,210,0,0,0,24,0]),
    bd:'จดหมายตัวอย่างสำหรับศึกษาภาพ ไม่มีข้อมูลจากบัญชีของคุณ'};
  local.setItem('lw.v1.me',JSON.stringify({name:origin.n,place:origin.p,
    lat:origin.la,lng:origin.lo,pid:'STUDY00000000001'}));
  local.setItem('lw.v1.letters',JSON.stringify([letter]));
  local.setItem('lw.v1.intro','1');
  session.setItem('lw.v1.splash','1');
  window.DriftStudy={local,session};
  window.DRIFT_LOCAL=local;
  window.DRIFT_SESSION=session;
})();
