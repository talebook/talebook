"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[5661],{5661:(e,t,r)=>{r.d(t,{makeFB2:()=>b});let n=e=>e?e.replace(/[\t\n\f\r ]+/g," ").replace(/^[\t\n\f\r ]+/,"").replace(/[\t\n\f\r ]+$/,""):"",i=e=>n(e?.textContent),o={XLINK:"http://www.w3.org/1999/xlink",EPUB:"http://www.idpf.org/2007/ops"},l="application/xml",a="application/xhtml+xml",s={strong:["strong","self"],emphasis:["em","self"],style:["span","self"],a:"anchor",strikethrough:["s","self"],sub:["sub","self"],sup:["sup","self"],code:["code","self"],image:"image"},c={epigraph:["blockquote"],subtitle:["h2",s],"text-author":["p",s],date:["p",s],stanza:["div","self"],v:["div",s]},u={title:["header",{p:["h1",s],"empty-line":["br"]}],epigraph:["blockquote","self"],image:"image",annotation:["aside"],section:["section","self"],p:["p",s],poem:["blockquote",c],subtitle:["h2",s],cite:["blockquote","self"],"empty-line":["br"],table:["table",{tr:["tr",{th:["th",s,["colspan","rowspan","align","valign"]],td:["td",s,["colspan","rowspan","align","valign"]]},["align"]]}],"text-author":["p",s]};c.epigraph.push(u);let p={image:"image",title:["section",{p:["h1",s],"empty-line":["br"]}],epigraph:["section",u],section:["section",u]};class d{constructor(e){this.fb2=e,this.doc=document.implementation.createDocument(o.XHTML,"html"),this.bins=new Map(Array.from(this.fb2.getElementsByTagName("binary"),e=>[e.id,e]))}getImageSrc(e){let t=e.getAttributeNS(o.XLINK,"href");if(!t)return"data:,";let[,r]=t.split("#");if(!r)return t;let n=this.bins.get(r);return n?`data:${n.getAttribute("content-type")};base64,${n.textContent}`:t}image(e){let t=this.doc.createElement("img");return t.alt=e.getAttribute("alt"),t.title=e.getAttribute("title"),t.setAttribute("src",this.getImageSrc(e)),t}anchor(e){let t=this.convert(e,{a:["a",s]});return t.setAttribute("href",e.getAttributeNS(o.XLINK,"href")),"note"===e.getAttribute("type")&&t.setAttributeNS(o.EPUB,"epub:type","noteref"),t}convert(e,t){if(3===e.nodeType)return this.doc.createTextNode(e.textContent);if(4===e.nodeType)return this.doc.createCDATASection(e.textContent);if(8===e.nodeType)return this.doc.createComment(e.textContent);let r=t?.[e.nodeName];if(!r)return null;if("string"==typeof r)return this[r](e);let[n,i,o]=r,l=this.doc.createElement(n);if(e.id&&(l.id=e.id),l.classList.add(e.nodeName),Array.isArray(o))for(let t of o){let r=e.getAttribute(t);r&&l.setAttribute(t,r)}let a="self"===i?t:i,s=e.firstChild;for(;s;){let e=this.convert(s,a);e&&l.append(e),s=s.nextSibling}return l}}let m=async e=>{let t=await e.arrayBuffer(),r=new TextDecoder("utf-8").decode(t),n=new DOMParser,i=n.parseFromString(r,l),o=i.xmlEncoding||r.match(/^<\?xml\s+version\s*=\s*["']1.\d+"\s+encoding\s*=\s*["']([A-Za-z0-9._-]*)["']/)?.[1];if(o&&"utf-8"!==o.toLowerCase()){let e=new TextDecoder(o).decode(t);return n.parseFromString(e,l)}return i},g=URL.createObjectURL(new Blob([`
@namespace epub "http://www.idpf.org/2007/ops";
body > img, section > img {
    display: block;
    margin: auto;
}
.title h1 {
    text-align: center;
}
body > section > .title, body.notesBodyType > .title {
    margin: 3em 0;
}
body.notesBodyType > section .title h1 {
    text-align: start;
}
body.notesBodyType > section .title {
    margin: 1em 0;
}
p {
    text-indent: 1em;
    margin: 0;
}
:not(p) + p, p:first-child {
    text-indent: 0;
}
.stanza {
    text-indent: 0;
    margin: 1em 0;
}
.text-author, .date {
    text-align: end;
}
.text-author:before {
    content: "—";
}
table {
    border-collapse: collapse;
}
td, th {
    padding: .25em;
}
a[epub|type~="noteref"] {
    font-size: .75em;
    vertical-align: super;
}
body:not(.notesBodyType) > .title, body:not(.notesBodyType) > .epigraph {
    margin: 3em 0;
}
`],{type:"text/css"})),f="data-foliate-id",b=async e=>{let t={},r=await m(e),o=new d(r),l=e=>[...r.querySelectorAll(e)],s=e=>{let t=i(e.querySelector("nickname"));if(t)return t;let r=i(e.querySelector("first-name")),n=i(e.querySelector("middle-name")),o=i(e.querySelector("last-name"));return{name:[r,n,o].filter(e=>e).join(" "),sortAs:o?[o,[r,n].filter(e=>e).join(" ")].join(", "):null}},c=e=>e?.getAttribute("value")??i(e),b=r.querySelector("title-info annotation"),h=l("title-info > sequence").map(e=>({name:n(e.getAttribute("name")),position:e.getAttribute("number")||void 0})).filter(e=>e.name);if(t.metadata={title:i(r.querySelector("title-info book-title")),identifier:i(r.querySelector("document-info id")),language:i(r.querySelector("title-info lang")),author:l("title-info author").map(s),translator:l("title-info translator").map(s),contributor:l("document-info author").map(s).concat(l("document-info program-used").map(i)).map(e=>Object.assign("string"==typeof e?{name:e}:e,{role:"bkp"})),belongsTo:h.length?{series:h}:void 0,publisher:i(r.querySelector("publish-info publisher")),published:c(r.querySelector("title-info date")),modified:c(r.querySelector("document-info date")),description:b?o.convert(b,{annotation:["div",u]}).innerHTML:null,subject:l("title-info genre").map(i)},r.querySelector("coverpage image")){let e=o.getImageSrc(r.querySelector("coverpage image"));t.getCover=()=>fetch(e).then(e=>e.blob())}else t.getCover=()=>null;let y=Array.from(r.querySelectorAll("body"),e=>{let t=o.convert(e,{body:["body",p]});return[Array.from(t.children,e=>{let t=[e,...e.querySelectorAll("[id]")].map(e=>e.id);return{el:e,ids:t}}),t]}),x=[],A=y[0][0].map((e,t)=>{let{el:r,ids:n}=e;return{ids:n,titles:Array.from(r.querySelectorAll(":scope > section > .title"),(e,r)=>{e.setAttribute(f,r);let n=e.closest("section"),o=new TextEncoder().encode(n.innerHTML).length-Array.from(n.querySelectorAll("[src]")).reduce((e,t)=>e+(t.getAttribute("src")?.length??0),0);return{title:i(e),index:r,size:o,href:`${t}#${r}`}}),el:r}}).concat(y.slice(1).map(e=>{let[t,r]=e,n=t.map(e=>e.ids).flat();return r.classList.add("notesBodyType"),{ids:n,el:r,linear:"no"}})).map(e=>{let t,{ids:r,titles:i,el:o,linear:l}=e,s=(t=o.outerHTML,`<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
    <head><link href="${g}" rel="stylesheet" type="text/css"/></head>
    <body>${t}</body>
</html>`),c=new Blob([s],{type:a}),u=URL.createObjectURL(c);return x.push(u),{ids:r,title:n(o.querySelector(".title, .subtitle, p")?.textContent??(o.classList.contains("title")?o.textContent:"")),titles:i,load:()=>u,createDocument:()=>new DOMParser().parseFromString(s,a),size:c.size-Array.from(o.querySelectorAll("[src]"),e=>e.getAttribute("src")?.length??0).reduce((e,t)=>e+t,0),linear:l}}),S=new Map;return t.sections=A.map((e,t)=>{let{ids:r,load:n,createDocument:i,size:o,linear:l,titles:a}=e;for(let e of r)e&&S.set(e,t);return{id:t,load:n,createDocument:i,size:o,linear:l,subitems:a}}),t.toc=A.map((e,t)=>{let{title:r,titles:n}=e,i=t.toString();return{label:r,href:i,subitems:n?.length?n.map(e=>{let{title:t,index:r}=e;return{label:t,href:`${i}#${r}`}}):null}}).filter(e=>e),t.resolveHref=e=>{let[t,r]=e.split("#");return t?{index:Number(t),anchor:e=>e.querySelector(`[${f}="${r}"]`)}:{index:S.get(r),anchor:e=>e.getElementById(r)}},t.splitTOCHref=e=>e?.split("#")?.map(e=>Number(e))??[],t.getTOCFragment=(e,t)=>e.querySelector(`[${f}="${t}"]`),t.destroy=()=>{for(let e of x)URL.revokeObjectURL(e)},t}}}]);
//# sourceMappingURL=5661.506ee97014550c34.js.map