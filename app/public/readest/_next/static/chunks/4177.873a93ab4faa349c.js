"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[4177],{44177:(e,t,a)=>{a.d(t,{migrate:()=>n});async function n(e,t){let a=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},n=t.length;if(0===n)return;let i=await e.select("PRAGMA user_version");if((i[0]?.user_version??0)>=n)return;let E=a.table??"__migrations";await e.execute(`CREATE TABLE IF NOT EXISTS ${E} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);let l=new Set((await e.select(`SELECT name FROM ${E}`)).map(e=>e.name));for(let a=0;a<t.length;a++){let n=t[a];if(l.has(n.name))continue;let i=n.sql.split(";").map(e=>e.trim()).filter(e=>e.length>0),s=n.name.replace(/'/g,"''");i.push(`INSERT INTO ${E} (name) VALUES ('${s}')`),i.push(`PRAGMA user_version = ${a+1}`),await e.batch(i)}}}}]);
//# sourceMappingURL=4177.873a93ab4faa349c.js.map