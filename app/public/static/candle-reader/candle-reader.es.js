var Fc = {};
/**
* @vue/shared v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function qn(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const qe = Fc.NODE_ENV !== "production" ? Object.freeze({}) : {}, Xo = Fc.NODE_ENV !== "production" ? Object.freeze([]) : [], ft = () => {
}, Cv = () => !1, ji = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), El = (e) => e.startsWith("onUpdate:"), et = Object.assign, Ps = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, Ev = Object.prototype.hasOwnProperty, Fe = (e, t) => Ev.call(e, t), _e = Array.isArray, Eo = (e) => zi(e) === "[object Map]", Ql = (e) => zi(e) === "[object Set]", zr = (e) => zi(e) === "[object Date]", Te = (e) => typeof e == "function", Qe = (e) => typeof e == "string", Vn = (e) => typeof e == "symbol", Le = (e) => e !== null && typeof e == "object", Ds = (e) => (Le(e) || Te(e)) && Te(e.then) && Te(e.catch), Lc = Object.prototype.toString, zi = (e) => Lc.call(e), $s = (e) => zi(e).slice(8, -1), Rc = (e) => zi(e) === "[object Object]", Ms = (e) => Qe(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, bi = /* @__PURE__ */ qn(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), xv = /* @__PURE__ */ qn(
  "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
), ea = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, Vv = /-(\w)/g, yt = ea(
  (e) => e.replace(Vv, (t, n) => n ? n.toUpperCase() : "")
), Nv = /\B([A-Z])/g, uo = ea(
  (e) => e.replace(Nv, "-$1").toLowerCase()
), Qt = ea((e) => e.charAt(0).toUpperCase() + e.slice(1)), _o = ea(
  (e) => e ? `on${Qt(e)}` : ""
), so = (e, t) => !Object.is(e, t), Wo = (e, ...t) => {
  for (let n = 0; n < e.length; n++)
    e[n](...t);
}, xl = (e, t, n, o = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: o,
    value: n
  });
}, Vl = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
}, Tv = (e) => {
  const t = Qe(e) ? Number(e) : NaN;
  return isNaN(t) ? e : t;
};
let Ur;
const Ui = () => Ur || (Ur = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function on(e) {
  if (_e(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const o = e[n], i = Qe(o) ? Pv(o) : on(o);
      if (i)
        for (const l in i)
          t[l] = i[l];
    }
    return t;
  } else if (Qe(e) || Le(e))
    return e;
}
const Ov = /;(?![^(]*\))/g, Av = /:([^]+)/, Iv = /\/\*[^]*?\*\//g;
function Pv(e) {
  const t = {};
  return e.replace(Iv, "").split(Ov).forEach((n) => {
    if (n) {
      const o = n.split(Av);
      o.length > 1 && (t[o[0].trim()] = o[1].trim());
    }
  }), t;
}
function rn(e) {
  let t = "";
  if (Qe(e))
    t = e;
  else if (_e(e))
    for (let n = 0; n < e.length; n++) {
      const o = rn(e[n]);
      o && (t += o + " ");
    }
  else if (Le(e))
    for (const n in e)
      e[n] && (t += n + " ");
  return t.trim();
}
const Dv = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot", $v = "svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,text,textPath,title,tspan,unknown,use,view", Mv = "annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics", Bv = /* @__PURE__ */ qn(Dv), Fv = /* @__PURE__ */ qn($v), Lv = /* @__PURE__ */ qn(Mv), Rv = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Hv = /* @__PURE__ */ qn(Rv);
function Hc(e) {
  return !!e || e === "";
}
function jv(e, t) {
  if (e.length !== t.length) return !1;
  let n = !0;
  for (let o = 0; n && o < e.length; o++)
    n = ta(e[o], t[o]);
  return n;
}
function ta(e, t) {
  if (e === t) return !0;
  let n = zr(e), o = zr(t);
  if (n || o)
    return n && o ? e.getTime() === t.getTime() : !1;
  if (n = Vn(e), o = Vn(t), n || o)
    return e === t;
  if (n = _e(e), o = _e(t), n || o)
    return n && o ? jv(e, t) : !1;
  if (n = Le(e), o = Le(t), n || o) {
    if (!n || !o)
      return !1;
    const i = Object.keys(e).length, l = Object.keys(t).length;
    if (i !== l)
      return !1;
    for (const a in e) {
      const s = e.hasOwnProperty(a), r = t.hasOwnProperty(a);
      if (s && !r || !s && r || !ta(e[a], t[a]))
        return !1;
    }
  }
  return String(e) === String(t);
}
function zv(e, t) {
  return e.findIndex((n) => ta(n, t));
}
const jc = (e) => !!(e && e.__v_isRef === !0), Oe = (e) => Qe(e) ? e : e == null ? "" : _e(e) || Le(e) && (e.toString === Lc || !Te(e.toString)) ? jc(e) ? Oe(e.value) : JSON.stringify(e, zc, 2) : String(e), zc = (e, t) => jc(t) ? zc(e, t.value) : Eo(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (n, [o, i], l) => (n[Ca(o, l) + " =>"] = i, n),
    {}
  )
} : Ql(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((n) => Ca(n))
} : Vn(t) ? Ca(t) : Le(t) && !_e(t) && !Rc(t) ? String(t) : t, Ca = (e, t = "") => {
  var n;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    Vn(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e
  );
};
var Ke = {};
function en(e, ...t) {
  console.warn(`[Vue warn] ${e}`, ...t);
}
let Vt;
class Uc {
  constructor(t = !1) {
    this.detached = t, this._active = !0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.parent = Vt, !t && Vt && (this.index = (Vt.scopes || (Vt.scopes = [])).push(
      this
    ) - 1);
  }
  get active() {
    return this._active;
  }
  pause() {
    if (this._active) {
      this._isPaused = !0;
      let t, n;
      if (this.scopes)
        for (t = 0, n = this.scopes.length; t < n; t++)
          this.scopes[t].pause();
      for (t = 0, n = this.effects.length; t < n; t++)
        this.effects[t].pause();
    }
  }
  /**
   * Resumes the effect scope, including all child scopes and effects.
   */
  resume() {
    if (this._active && this._isPaused) {
      this._isPaused = !1;
      let t, n;
      if (this.scopes)
        for (t = 0, n = this.scopes.length; t < n; t++)
          this.scopes[t].resume();
      for (t = 0, n = this.effects.length; t < n; t++)
        this.effects[t].resume();
    }
  }
  run(t) {
    if (this._active) {
      const n = Vt;
      try {
        return Vt = this, t();
      } finally {
        Vt = n;
      }
    } else Ke.NODE_ENV !== "production" && en("cannot run an inactive effect scope.");
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    Vt = this;
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    Vt = this.parent;
  }
  stop(t) {
    if (this._active) {
      let n, o;
      for (n = 0, o = this.effects.length; n < o; n++)
        this.effects[n].stop();
      for (n = 0, o = this.cleanups.length; n < o; n++)
        this.cleanups[n]();
      if (this.scopes)
        for (n = 0, o = this.scopes.length; n < o; n++)
          this.scopes[n].stop(!0);
      if (!this.detached && this.parent && !t) {
        const i = this.parent.scopes.pop();
        i && i !== this && (this.parent.scopes[this.index] = i, i.index = this.index);
      }
      this.parent = void 0, this._active = !1;
    }
  }
}
function Bs(e) {
  return new Uc(e);
}
function Uv() {
  return Vt;
}
function At(e, t = !1) {
  Vt ? Vt.cleanups.push(e) : Ke.NODE_ENV !== "production" && !t && en(
    "onScopeDispose() is called when there is no active effect scope to be associated with."
  );
}
let Ue;
const Ea = /* @__PURE__ */ new WeakSet();
class Wc {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, Vt && Vt.active && Vt.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, Ea.has(this) && (Ea.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Kc(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, Wr(this), Gc(this);
    const t = Ue, n = un;
    Ue = this, un = !0;
    try {
      return this.fn();
    } finally {
      Ke.NODE_ENV !== "production" && Ue !== this && en(
        "Active effect was not restored correctly - this is likely a Vue internal bug."
      ), Yc(this), Ue = t, un = n, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep)
        Rs(t);
      this.deps = this.depsTail = void 0, Wr(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? Ea.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    Xa(this) && this.run();
  }
  get dirty() {
    return Xa(this);
  }
}
let qc = 0, _i, wi;
function Kc(e, t = !1) {
  if (e.flags |= 8, t) {
    e.next = wi, wi = e;
    return;
  }
  e.next = _i, _i = e;
}
function Fs() {
  qc++;
}
function Ls() {
  if (--qc > 0)
    return;
  if (wi) {
    let t = wi;
    for (wi = void 0; t; ) {
      const n = t.next;
      t.next = void 0, t.flags &= -9, t = n;
    }
  }
  let e;
  for (; _i; ) {
    let t = _i;
    for (_i = void 0; t; ) {
      const n = t.next;
      if (t.next = void 0, t.flags &= -9, t.flags & 1)
        try {
          t.trigger();
        } catch (o) {
          e || (e = o);
        }
      t = n;
    }
  }
  if (e) throw e;
}
function Gc(e) {
  for (let t = e.deps; t; t = t.nextDep)
    t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function Yc(e) {
  let t, n = e.depsTail, o = n;
  for (; o; ) {
    const i = o.prevDep;
    o.version === -1 ? (o === n && (n = i), Rs(o), Wv(o)) : t = o, o.dep.activeLink = o.prevActiveLink, o.prevActiveLink = void 0, o = i;
  }
  e.deps = t, e.depsTail = n;
}
function Xa(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (t.dep.version !== t.version || t.dep.computed && (Xc(t.dep.computed) || t.dep.version !== t.version))
      return !0;
  return !!e._dirty;
}
function Xc(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === xi))
    return;
  e.globalVersion = xi;
  const t = e.dep;
  if (e.flags |= 2, t.version > 0 && !e.isSSR && e.deps && !Xa(e)) {
    e.flags &= -3;
    return;
  }
  const n = Ue, o = un;
  Ue = e, un = !0;
  try {
    Gc(e);
    const i = e.fn(e._value);
    (t.version === 0 || so(i, e._value)) && (e._value = i, t.version++);
  } catch (i) {
    throw t.version++, i;
  } finally {
    Ue = n, un = o, Yc(e), e.flags &= -3;
  }
}
function Rs(e, t = !1) {
  const { dep: n, prevSub: o, nextSub: i } = e;
  if (o && (o.nextSub = i, e.prevSub = void 0), i && (i.prevSub = o, e.nextSub = void 0), Ke.NODE_ENV !== "production" && n.subsHead === e && (n.subsHead = i), n.subs === e && (n.subs = o, !o && n.computed)) {
    n.computed.flags &= -5;
    for (let l = n.computed.deps; l; l = l.nextDep)
      Rs(l, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function Wv(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let un = !0;
const Jc = [];
function Kn() {
  Jc.push(un), un = !1;
}
function Gn() {
  const e = Jc.pop();
  un = e === void 0 ? !0 : e;
}
function Wr(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const n = Ue;
    Ue = void 0;
    try {
      t();
    } finally {
      Ue = n;
    }
  }
}
let xi = 0;
class qv {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class Hs {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, Ke.NODE_ENV !== "production" && (this.subsHead = void 0);
  }
  track(t) {
    if (!Ue || !un || Ue === this.computed)
      return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== Ue)
      n = this.activeLink = new qv(Ue, this), Ue.deps ? (n.prevDep = Ue.depsTail, Ue.depsTail.nextDep = n, Ue.depsTail = n) : Ue.deps = Ue.depsTail = n, Zc(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const o = n.nextDep;
      o.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = o), n.prevDep = Ue.depsTail, n.nextDep = void 0, Ue.depsTail.nextDep = n, Ue.depsTail = n, Ue.deps === n && (Ue.deps = o);
    }
    return Ke.NODE_ENV !== "production" && Ue.onTrack && Ue.onTrack(
      et(
        {
          effect: Ue
        },
        t
      )
    ), n;
  }
  trigger(t) {
    this.version++, xi++, this.notify(t);
  }
  notify(t) {
    Fs();
    try {
      if (Ke.NODE_ENV !== "production")
        for (let n = this.subsHead; n; n = n.nextSub)
          n.sub.onTrigger && !(n.sub.flags & 8) && n.sub.onTrigger(
            et(
              {
                effect: n.sub
              },
              t
            )
          );
      for (let n = this.subs; n; n = n.prevSub)
        n.sub.notify() && n.sub.dep.notify();
    } finally {
      Ls();
    }
  }
}
function Zc(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let o = t.deps; o; o = o.nextDep)
        Zc(o);
    }
    const n = e.dep.subs;
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), Ke.NODE_ENV !== "production" && e.dep.subsHead === void 0 && (e.dep.subsHead = e), e.dep.subs = e;
  }
}
const Nl = /* @__PURE__ */ new WeakMap(), xo = Symbol(
  Ke.NODE_ENV !== "production" ? "Object iterate" : ""
), Ja = Symbol(
  Ke.NODE_ENV !== "production" ? "Map keys iterate" : ""
), Vi = Symbol(
  Ke.NODE_ENV !== "production" ? "Array iterate" : ""
);
function dt(e, t, n) {
  if (un && Ue) {
    let o = Nl.get(e);
    o || Nl.set(e, o = /* @__PURE__ */ new Map());
    let i = o.get(n);
    i || (o.set(n, i = new Hs()), i.map = o, i.key = n), Ke.NODE_ENV !== "production" ? i.track({
      target: e,
      type: t,
      key: n
    }) : i.track();
  }
}
function _n(e, t, n, o, i, l) {
  const a = Nl.get(e);
  if (!a) {
    xi++;
    return;
  }
  const s = (r) => {
    r && (Ke.NODE_ENV !== "production" ? r.trigger({
      target: e,
      type: t,
      key: n,
      newValue: o,
      oldValue: i,
      oldTarget: l
    }) : r.trigger());
  };
  if (Fs(), t === "clear")
    a.forEach(s);
  else {
    const r = _e(e), d = r && Ms(n);
    if (r && n === "length") {
      const c = Number(o);
      a.forEach((f, m) => {
        (m === "length" || m === Vi || !Vn(m) && m >= c) && s(f);
      });
    } else
      switch ((n !== void 0 || a.has(void 0)) && s(a.get(n)), d && s(a.get(Vi)), t) {
        case "add":
          r ? d && s(a.get("length")) : (s(a.get(xo)), Eo(e) && s(a.get(Ja)));
          break;
        case "delete":
          r || (s(a.get(xo)), Eo(e) && s(a.get(Ja)));
          break;
        case "set":
          Eo(e) && s(a.get(xo));
          break;
      }
  }
  Ls();
}
function Kv(e, t) {
  const n = Nl.get(e);
  return n && n.get(t);
}
function jo(e) {
  const t = ve(e);
  return t === e ? t : (dt(t, "iterate", Vi), Tt(e) ? t : t.map(_t));
}
function na(e) {
  return dt(e = ve(e), "iterate", Vi), e;
}
const Gv = {
  __proto__: null,
  [Symbol.iterator]() {
    return xa(this, Symbol.iterator, _t);
  },
  concat(...e) {
    return jo(this).concat(
      ...e.map((t) => _e(t) ? jo(t) : t)
    );
  },
  entries() {
    return xa(this, "entries", (e) => (e[1] = _t(e[1]), e));
  },
  every(e, t) {
    return Mn(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return Mn(this, "filter", e, t, (n) => n.map(_t), arguments);
  },
  find(e, t) {
    return Mn(this, "find", e, t, _t, arguments);
  },
  findIndex(e, t) {
    return Mn(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return Mn(this, "findLast", e, t, _t, arguments);
  },
  findLastIndex(e, t) {
    return Mn(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return Mn(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return Va(this, "includes", e);
  },
  indexOf(...e) {
    return Va(this, "indexOf", e);
  },
  join(e) {
    return jo(this).join(e);
  },
  // keys() iterator only reads `length`, no optimisation required
  lastIndexOf(...e) {
    return Va(this, "lastIndexOf", e);
  },
  map(e, t) {
    return Mn(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return fi(this, "pop");
  },
  push(...e) {
    return fi(this, "push", e);
  },
  reduce(e, ...t) {
    return qr(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return qr(this, "reduceRight", e, t);
  },
  shift() {
    return fi(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return Mn(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return fi(this, "splice", e);
  },
  toReversed() {
    return jo(this).toReversed();
  },
  toSorted(e) {
    return jo(this).toSorted(e);
  },
  toSpliced(...e) {
    return jo(this).toSpliced(...e);
  },
  unshift(...e) {
    return fi(this, "unshift", e);
  },
  values() {
    return xa(this, "values", _t);
  }
};
function xa(e, t, n) {
  const o = na(e), i = o[t]();
  return o !== e && !Tt(e) && (i._next = i.next, i.next = () => {
    const l = i._next();
    return l.value && (l.value = n(l.value)), l;
  }), i;
}
const Yv = Array.prototype;
function Mn(e, t, n, o, i, l) {
  const a = na(e), s = a !== e && !Tt(e), r = a[t];
  if (r !== Yv[t]) {
    const f = r.apply(e, l);
    return s ? _t(f) : f;
  }
  let d = n;
  a !== e && (s ? d = function(f, m) {
    return n.call(this, _t(f), m, e);
  } : n.length > 2 && (d = function(f, m) {
    return n.call(this, f, m, e);
  }));
  const c = r.call(a, d, o);
  return s && i ? i(c) : c;
}
function qr(e, t, n, o) {
  const i = na(e);
  let l = n;
  return i !== e && (Tt(e) ? n.length > 3 && (l = function(a, s, r) {
    return n.call(this, a, s, r, e);
  }) : l = function(a, s, r) {
    return n.call(this, a, _t(s), r, e);
  }), i[t](l, ...o);
}
function Va(e, t, n) {
  const o = ve(e);
  dt(o, "iterate", Vi);
  const i = o[t](...n);
  return (i === -1 || i === !1) && Ni(n[0]) ? (n[0] = ve(n[0]), o[t](...n)) : i;
}
function fi(e, t, n = []) {
  Kn(), Fs();
  const o = ve(e)[t].apply(e, n);
  return Ls(), Gn(), o;
}
const Xv = /* @__PURE__ */ qn("__proto__,__v_isRef,__isVue"), Qc = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(Vn)
);
function Jv(e) {
  Vn(e) || (e = String(e));
  const t = ve(this);
  return dt(t, "has", e), t.hasOwnProperty(e);
}
class ed {
  constructor(t = !1, n = !1) {
    this._isReadonly = t, this._isShallow = n;
  }
  get(t, n, o) {
    const i = this._isReadonly, l = this._isShallow;
    if (n === "__v_isReactive")
      return !i;
    if (n === "__v_isReadonly")
      return i;
    if (n === "__v_isShallow")
      return l;
    if (n === "__v_raw")
      return o === (i ? l ? ad : ld : l ? id : od).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(o) ? t : void 0;
    const a = _e(t);
    if (!i) {
      let r;
      if (a && (r = Gv[n]))
        return r;
      if (n === "hasOwnProperty")
        return Jv;
    }
    const s = Reflect.get(
      t,
      n,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      Je(t) ? t : o
    );
    return (Vn(n) ? Qc.has(n) : Xv(n)) || (i || dt(t, "get", n), l) ? s : Je(s) ? a && Ms(n) ? s : s.value : Le(s) ? i ? Wi(s) : gt(s) : s;
  }
}
class td extends ed {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, o, i) {
    let l = t[n];
    if (!this._isShallow) {
      const r = Un(l);
      if (!Tt(o) && !Un(o) && (l = ve(l), o = ve(o)), !_e(t) && Je(l) && !Je(o))
        return r ? !1 : (l.value = o, !0);
    }
    const a = _e(t) && Ms(n) ? Number(n) < t.length : Fe(t, n), s = Reflect.set(
      t,
      n,
      o,
      Je(t) ? t : i
    );
    return t === ve(i) && (a ? so(o, l) && _n(t, "set", n, o, l) : _n(t, "add", n, o)), s;
  }
  deleteProperty(t, n) {
    const o = Fe(t, n), i = t[n], l = Reflect.deleteProperty(t, n);
    return l && o && _n(t, "delete", n, void 0, i), l;
  }
  has(t, n) {
    const o = Reflect.has(t, n);
    return (!Vn(n) || !Qc.has(n)) && dt(t, "has", n), o;
  }
  ownKeys(t) {
    return dt(
      t,
      "iterate",
      _e(t) ? "length" : xo
    ), Reflect.ownKeys(t);
  }
}
class nd extends ed {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return Ke.NODE_ENV !== "production" && en(
      `Set operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
  deleteProperty(t, n) {
    return Ke.NODE_ENV !== "production" && en(
      `Delete operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
}
const Zv = /* @__PURE__ */ new td(), Qv = /* @__PURE__ */ new nd(), eh = /* @__PURE__ */ new td(!0), th = /* @__PURE__ */ new nd(!0), Za = (e) => e, il = (e) => Reflect.getPrototypeOf(e);
function nh(e, t, n) {
  return function(...o) {
    const i = this.__v_raw, l = ve(i), a = Eo(l), s = e === "entries" || e === Symbol.iterator && a, r = e === "keys" && a, d = i[e](...o), c = n ? Za : t ? Qa : _t;
    return !t && dt(
      l,
      "iterate",
      r ? Ja : xo
    ), {
      // iterator protocol
      next() {
        const { value: f, done: m } = d.next();
        return m ? { value: f, done: m } : {
          value: s ? [c(f[0]), c(f[1])] : c(f),
          done: m
        };
      },
      // iterable protocol
      [Symbol.iterator]() {
        return this;
      }
    };
  };
}
function ll(e) {
  return function(...t) {
    if (Ke.NODE_ENV !== "production") {
      const n = t[0] ? `on key "${t[0]}" ` : "";
      en(
        `${Qt(e)} operation ${n}failed: target is readonly.`,
        ve(this)
      );
    }
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function oh(e, t) {
  const n = {
    get(i) {
      const l = this.__v_raw, a = ve(l), s = ve(i);
      e || (so(i, s) && dt(a, "get", i), dt(a, "get", s));
      const { has: r } = il(a), d = t ? Za : e ? Qa : _t;
      if (r.call(a, i))
        return d(l.get(i));
      if (r.call(a, s))
        return d(l.get(s));
      l !== a && l.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return !e && dt(ve(i), "iterate", xo), Reflect.get(i, "size", i);
    },
    has(i) {
      const l = this.__v_raw, a = ve(l), s = ve(i);
      return e || (so(i, s) && dt(a, "has", i), dt(a, "has", s)), i === s ? l.has(i) : l.has(i) || l.has(s);
    },
    forEach(i, l) {
      const a = this, s = a.__v_raw, r = ve(s), d = t ? Za : e ? Qa : _t;
      return !e && dt(r, "iterate", xo), s.forEach((c, f) => i.call(l, d(c), d(f), a));
    }
  };
  return et(
    n,
    e ? {
      add: ll("add"),
      set: ll("set"),
      delete: ll("delete"),
      clear: ll("clear")
    } : {
      add(i) {
        !t && !Tt(i) && !Un(i) && (i = ve(i));
        const l = ve(this);
        return il(l).has.call(l, i) || (l.add(i), _n(l, "add", i, i)), this;
      },
      set(i, l) {
        !t && !Tt(l) && !Un(l) && (l = ve(l));
        const a = ve(this), { has: s, get: r } = il(a);
        let d = s.call(a, i);
        d ? Ke.NODE_ENV !== "production" && Kr(a, s, i) : (i = ve(i), d = s.call(a, i));
        const c = r.call(a, i);
        return a.set(i, l), d ? so(l, c) && _n(a, "set", i, l, c) : _n(a, "add", i, l), this;
      },
      delete(i) {
        const l = ve(this), { has: a, get: s } = il(l);
        let r = a.call(l, i);
        r ? Ke.NODE_ENV !== "production" && Kr(l, a, i) : (i = ve(i), r = a.call(l, i));
        const d = s ? s.call(l, i) : void 0, c = l.delete(i);
        return r && _n(l, "delete", i, void 0, d), c;
      },
      clear() {
        const i = ve(this), l = i.size !== 0, a = Ke.NODE_ENV !== "production" ? Eo(i) ? new Map(i) : new Set(i) : void 0, s = i.clear();
        return l && _n(
          i,
          "clear",
          void 0,
          void 0,
          a
        ), s;
      }
    }
  ), [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ].forEach((i) => {
    n[i] = nh(i, e, t);
  }), n;
}
function oa(e, t) {
  const n = oh(e, t);
  return (o, i, l) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? o : Reflect.get(
    Fe(n, i) && i in o ? n : o,
    i,
    l
  );
}
const ih = {
  get: /* @__PURE__ */ oa(!1, !1)
}, lh = {
  get: /* @__PURE__ */ oa(!1, !0)
}, ah = {
  get: /* @__PURE__ */ oa(!0, !1)
}, sh = {
  get: /* @__PURE__ */ oa(!0, !0)
};
function Kr(e, t, n) {
  const o = ve(n);
  if (o !== n && t.call(e, o)) {
    const i = $s(e);
    en(
      `Reactive ${i} contains both the raw and reactive versions of the same object${i === "Map" ? " as keys" : ""}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`
    );
  }
}
const od = /* @__PURE__ */ new WeakMap(), id = /* @__PURE__ */ new WeakMap(), ld = /* @__PURE__ */ new WeakMap(), ad = /* @__PURE__ */ new WeakMap();
function rh(e) {
  switch (e) {
    case "Object":
    case "Array":
      return 1;
    case "Map":
    case "Set":
    case "WeakMap":
    case "WeakSet":
      return 2;
    default:
      return 0;
  }
}
function uh(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : rh($s(e));
}
function gt(e) {
  return Un(e) ? e : ia(
    e,
    !1,
    Zv,
    ih,
    od
  );
}
function ch(e) {
  return ia(
    e,
    !1,
    eh,
    lh,
    id
  );
}
function Wi(e) {
  return ia(
    e,
    !0,
    Qv,
    ah,
    ld
  );
}
function kn(e) {
  return ia(
    e,
    !0,
    th,
    sh,
    ad
  );
}
function ia(e, t, n, o, i) {
  if (!Le(e))
    return Ke.NODE_ENV !== "production" && en(
      `value cannot be made ${t ? "readonly" : "reactive"}: ${String(
        e
      )}`
    ), e;
  if (e.__v_raw && !(t && e.__v_isReactive))
    return e;
  const l = i.get(e);
  if (l)
    return l;
  const a = uh(e);
  if (a === 0)
    return e;
  const s = new Proxy(
    e,
    a === 2 ? o : n
  );
  return i.set(e, s), s;
}
function Vo(e) {
  return Un(e) ? Vo(e.__v_raw) : !!(e && e.__v_isReactive);
}
function Un(e) {
  return !!(e && e.__v_isReadonly);
}
function Tt(e) {
  return !!(e && e.__v_isShallow);
}
function Ni(e) {
  return e ? !!e.__v_raw : !1;
}
function ve(e) {
  const t = e && e.__v_raw;
  return t ? ve(t) : e;
}
function sd(e) {
  return !Fe(e, "__v_skip") && Object.isExtensible(e) && xl(e, "__v_skip", !0), e;
}
const _t = (e) => Le(e) ? gt(e) : e, Qa = (e) => Le(e) ? Wi(e) : e;
function Je(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function ie(e) {
  return rd(e, !1);
}
function he(e) {
  return rd(e, !0);
}
function rd(e, t) {
  return Je(e) ? e : new dh(e, t);
}
class dh {
  constructor(t, n) {
    this.dep = new Hs(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : ve(t), this._value = n ? t : _t(t), this.__v_isShallow = n;
  }
  get value() {
    return Ke.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, o = this.__v_isShallow || Tt(t) || Un(t);
    t = o ? t : ve(t), so(t, n) && (this._rawValue = t, this._value = o ? t : _t(t), Ke.NODE_ENV !== "production" ? this.dep.trigger({
      target: this,
      type: "set",
      key: "value",
      newValue: t,
      oldValue: n
    }) : this.dep.trigger());
  }
}
function an(e) {
  return Je(e) ? e.value : e;
}
const fh = {
  get: (e, t, n) => t === "__v_raw" ? e : an(Reflect.get(e, t, n)),
  set: (e, t, n, o) => {
    const i = e[t];
    return Je(i) && !Je(n) ? (i.value = n, !0) : Reflect.set(e, t, n, o);
  }
};
function ud(e) {
  return Vo(e) ? e : new Proxy(e, fh);
}
function js(e) {
  Ke.NODE_ENV !== "production" && !Ni(e) && en("toRefs() expects a reactive object but received a plain one.");
  const t = _e(e) ? new Array(e.length) : {};
  for (const n in e)
    t[n] = cd(e, n);
  return t;
}
class mh {
  constructor(t, n, o) {
    this._object = t, this._key = n, this._defaultValue = o, this.__v_isRef = !0, this._value = void 0;
  }
  get value() {
    const t = this._object[this._key];
    return this._value = t === void 0 ? this._defaultValue : t;
  }
  set value(t) {
    this._object[this._key] = t;
  }
  get dep() {
    return Kv(ve(this._object), this._key);
  }
}
class vh {
  constructor(t) {
    this._getter = t, this.__v_isRef = !0, this.__v_isReadonly = !0, this._value = void 0;
  }
  get value() {
    return this._value = this._getter();
  }
}
function se(e, t, n) {
  return Je(e) ? e : Te(e) ? new vh(e) : Le(e) && arguments.length > 1 ? cd(e, t, n) : ie(e);
}
function cd(e, t, n) {
  const o = e[t];
  return Je(o) ? o : new mh(e, t, n);
}
class hh {
  constructor(t, n, o) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new Hs(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = xi - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = o;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    Ue !== this)
      return Kc(this, !0), !0;
  }
  get value() {
    const t = Ke.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track();
    return Xc(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter ? this.setter(t) : Ke.NODE_ENV !== "production" && en("Write operation failed: computed value is readonly");
  }
}
function gh(e, t, n = !1) {
  let o, i;
  Te(e) ? o = e : (o = e.get, i = e.set);
  const l = new hh(o, i, n);
  return Ke.NODE_ENV !== "production" && t && !n && (l.onTrack = t.onTrack, l.onTrigger = t.onTrigger), l;
}
const al = {}, Tl = /* @__PURE__ */ new WeakMap();
let wo;
function yh(e, t = !1, n = wo) {
  if (n) {
    let o = Tl.get(n);
    o || Tl.set(n, o = []), o.push(e);
  } else Ke.NODE_ENV !== "production" && !t && en(
    "onWatcherCleanup() was called when there was no active watcher to associate with."
  );
}
function ph(e, t, n = qe) {
  const { immediate: o, deep: i, once: l, scheduler: a, augmentJob: s, call: r } = n, d = (C) => {
    (n.onWarn || en)(
      "Invalid watch source: ",
      C,
      "A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types."
    );
  }, c = (C) => i ? C : Tt(C) || i === !1 || i === 0 ? jn(C, 1) : jn(C);
  let f, m, h, v, g = !1, y = !1;
  if (Je(e) ? (m = () => e.value, g = Tt(e)) : Vo(e) ? (m = () => c(e), g = !0) : _e(e) ? (y = !0, g = e.some((C) => Vo(C) || Tt(C)), m = () => e.map((C) => {
    if (Je(C))
      return C.value;
    if (Vo(C))
      return c(C);
    if (Te(C))
      return r ? r(C, 2) : C();
    Ke.NODE_ENV !== "production" && d(C);
  })) : Te(e) ? t ? m = r ? () => r(e, 2) : e : m = () => {
    if (h) {
      Kn();
      try {
        h();
      } finally {
        Gn();
      }
    }
    const C = wo;
    wo = f;
    try {
      return r ? r(e, 3, [v]) : e(v);
    } finally {
      wo = C;
    }
  } : (m = ft, Ke.NODE_ENV !== "production" && d(e)), t && i) {
    const C = m, x = i === !0 ? 1 / 0 : i;
    m = () => jn(C(), x);
  }
  const w = Uv(), E = () => {
    f.stop(), w && Ps(w.effects, f);
  };
  if (l && t) {
    const C = t;
    t = (...x) => {
      C(...x), E();
    };
  }
  let A = y ? new Array(e.length).fill(al) : al;
  const P = (C) => {
    if (!(!(f.flags & 1) || !f.dirty && !C))
      if (t) {
        const x = f.run();
        if (i || g || (y ? x.some((I, N) => so(I, A[N])) : so(x, A))) {
          h && h();
          const I = wo;
          wo = f;
          try {
            const N = [
              x,
              // pass undefined as the old value when it's changed for the first time
              A === al ? void 0 : y && A[0] === al ? [] : A,
              v
            ];
            r ? r(t, 3, N) : (
              // @ts-expect-error
              t(...N)
            ), A = x;
          } finally {
            wo = I;
          }
        }
      } else
        f.run();
  };
  return s && s(P), f = new Wc(m), f.scheduler = a ? () => a(P, !1) : P, v = (C) => yh(C, !1, f), h = f.onStop = () => {
    const C = Tl.get(f);
    if (C) {
      if (r)
        r(C, 4);
      else
        for (const x of C) x();
      Tl.delete(f);
    }
  }, Ke.NODE_ENV !== "production" && (f.onTrack = n.onTrack, f.onTrigger = n.onTrigger), t ? o ? P(!0) : A = f.run() : a ? a(P.bind(null, !0), !0) : f.run(), E.pause = f.pause.bind(f), E.resume = f.resume.bind(f), E.stop = E, E;
}
function jn(e, t = 1 / 0, n) {
  if (t <= 0 || !Le(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e)))
    return e;
  if (n.add(e), t--, Je(e))
    jn(e.value, t, n);
  else if (_e(e))
    for (let o = 0; o < e.length; o++)
      jn(e[o], t, n);
  else if (Ql(e) || Eo(e))
    e.forEach((o) => {
      jn(o, t, n);
    });
  else if (Rc(e)) {
    for (const o in e)
      jn(e[o], t, n);
    for (const o of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, o) && jn(e[o], t, n);
  }
  return e;
}
var V = {};
const No = [];
function ml(e) {
  No.push(e);
}
function vl() {
  No.pop();
}
let Na = !1;
function Z(e, ...t) {
  if (Na) return;
  Na = !0, Kn();
  const n = No.length ? No[No.length - 1].component : null, o = n && n.appContext.config.warnHandler, i = bh();
  if (o)
    li(
      o,
      n,
      11,
      [
        // eslint-disable-next-line no-restricted-syntax
        e + t.map((l) => {
          var a, s;
          return (s = (a = l.toString) == null ? void 0 : a.call(l)) != null ? s : JSON.stringify(l);
        }).join(""),
        n && n.proxy,
        i.map(
          ({ vnode: l }) => `at <${ca(n, l.type)}>`
        ).join(`
`),
        i
      ]
    );
  else {
    const l = [`[Vue warn]: ${e}`, ...t];
    i.length && l.push(`
`, ..._h(i)), console.warn(...l);
  }
  Gn(), Na = !1;
}
function bh() {
  let e = No[No.length - 1];
  if (!e)
    return [];
  const t = [];
  for (; e; ) {
    const n = t[0];
    n && n.vnode === e ? n.recurseCount++ : t.push({
      vnode: e,
      recurseCount: 0
    });
    const o = e.component && e.component.parent;
    e = o && o.vnode;
  }
  return t;
}
function _h(e) {
  const t = [];
  return e.forEach((n, o) => {
    t.push(...o === 0 ? [] : [`
`], ...wh(n));
  }), t;
}
function wh({ vnode: e, recurseCount: t }) {
  const n = t > 0 ? `... (${t} recursive calls)` : "", o = e.component ? e.component.parent == null : !1, i = ` at <${ca(
    e.component,
    e.type,
    o
  )}`, l = ">" + n;
  return e.props ? [i, ...kh(e.props), l] : [i + l];
}
function kh(e) {
  const t = [], n = Object.keys(e);
  return n.slice(0, 3).forEach((o) => {
    t.push(...dd(o, e[o]));
  }), n.length > 3 && t.push(" ..."), t;
}
function dd(e, t, n) {
  return Qe(t) ? (t = JSON.stringify(t), n ? t : [`${e}=${t}`]) : typeof t == "number" || typeof t == "boolean" || t == null ? n ? t : [`${e}=${t}`] : Je(t) ? (t = dd(e, ve(t.value), !0), n ? t : [`${e}=Ref<`, t, ">"]) : Te(t) ? [`${e}=fn${t.name ? `<${t.name}>` : ""}`] : (t = ve(t), n ? t : [`${e}=`, t]);
}
function Sh(e, t) {
  V.NODE_ENV !== "production" && e !== void 0 && (typeof e != "number" ? Z(`${t} is not a valid number - got ${JSON.stringify(e)}.`) : isNaN(e) && Z(`${t} is NaN - the duration expression might be incorrect.`));
}
const zs = {
  sp: "serverPrefetch hook",
  bc: "beforeCreate hook",
  c: "created hook",
  bm: "beforeMount hook",
  m: "mounted hook",
  bu: "beforeUpdate hook",
  u: "updated",
  bum: "beforeUnmount hook",
  um: "unmounted hook",
  a: "activated hook",
  da: "deactivated hook",
  ec: "errorCaptured hook",
  rtc: "renderTracked hook",
  rtg: "renderTriggered hook",
  0: "setup function",
  1: "render function",
  2: "watcher getter",
  3: "watcher callback",
  4: "watcher cleanup function",
  5: "native event handler",
  6: "component event handler",
  7: "vnode hook",
  8: "directive hook",
  9: "transition hook",
  10: "app errorHandler",
  11: "app warnHandler",
  12: "ref function",
  13: "async component loader",
  14: "scheduler flush",
  15: "component update",
  16: "app unmount cleanup function"
};
function li(e, t, n, o) {
  try {
    return o ? e(...o) : e();
  } catch (i) {
    qi(i, t, n);
  }
}
function fn(e, t, n, o) {
  if (Te(e)) {
    const i = li(e, t, n, o);
    return i && Ds(i) && i.catch((l) => {
      qi(l, t, n);
    }), i;
  }
  if (_e(e)) {
    const i = [];
    for (let l = 0; l < e.length; l++)
      i.push(fn(e[l], t, n, o));
    return i;
  } else V.NODE_ENV !== "production" && Z(
    `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof e}`
  );
}
function qi(e, t, n, o = !0) {
  const i = t ? t.vnode : null, { errorHandler: l, throwUnhandledErrorInProduction: a } = t && t.appContext.config || qe;
  if (t) {
    let s = t.parent;
    const r = t.proxy, d = V.NODE_ENV !== "production" ? zs[n] : `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; s; ) {
      const c = s.ec;
      if (c) {
        for (let f = 0; f < c.length; f++)
          if (c[f](e, r, d) === !1)
            return;
      }
      s = s.parent;
    }
    if (l) {
      Kn(), li(l, null, 10, [
        e,
        r,
        d
      ]), Gn();
      return;
    }
  }
  Ch(e, n, i, o, a);
}
function Ch(e, t, n, o = !0, i = !1) {
  if (V.NODE_ENV !== "production") {
    const l = zs[t];
    if (n && ml(n), Z(`Unhandled error${l ? ` during execution of ${l}` : ""}`), n && vl(), o)
      throw e;
    console.error(e);
  } else {
    if (i)
      throw e;
    console.error(e);
  }
}
const Nt = [];
let bn = -1;
const Jo = [];
let no = null, qo = 0;
const fd = /* @__PURE__ */ Promise.resolve();
let Ol = null;
const Eh = 100;
function ot(e) {
  const t = Ol || fd;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function xh(e) {
  let t = bn + 1, n = Nt.length;
  for (; t < n; ) {
    const o = t + n >>> 1, i = Nt[o], l = Ti(i);
    l < e || l === e && i.flags & 2 ? t = o + 1 : n = o;
  }
  return t;
}
function la(e) {
  if (!(e.flags & 1)) {
    const t = Ti(e), n = Nt[Nt.length - 1];
    !n || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= Ti(n) ? Nt.push(e) : Nt.splice(xh(t), 0, e), e.flags |= 1, md();
  }
}
function md() {
  Ol || (Ol = fd.then(gd));
}
function vd(e) {
  _e(e) ? Jo.push(...e) : no && e.id === -1 ? no.splice(qo + 1, 0, e) : e.flags & 1 || (Jo.push(e), e.flags |= 1), md();
}
function Gr(e, t, n = bn + 1) {
  for (V.NODE_ENV !== "production" && (t = t || /* @__PURE__ */ new Map()); n < Nt.length; n++) {
    const o = Nt[n];
    if (o && o.flags & 2) {
      if (e && o.id !== e.uid || V.NODE_ENV !== "production" && Us(t, o))
        continue;
      Nt.splice(n, 1), n--, o.flags & 4 && (o.flags &= -2), o(), o.flags & 4 || (o.flags &= -2);
    }
  }
}
function hd(e) {
  if (Jo.length) {
    const t = [...new Set(Jo)].sort(
      (n, o) => Ti(n) - Ti(o)
    );
    if (Jo.length = 0, no) {
      no.push(...t);
      return;
    }
    for (no = t, V.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map()), qo = 0; qo < no.length; qo++) {
      const n = no[qo];
      V.NODE_ENV !== "production" && Us(e, n) || (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2);
    }
    no = null, qo = 0;
  }
}
const Ti = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function gd(e) {
  V.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map());
  const t = V.NODE_ENV !== "production" ? (n) => Us(e, n) : ft;
  try {
    for (bn = 0; bn < Nt.length; bn++) {
      const n = Nt[bn];
      if (n && !(n.flags & 8)) {
        if (V.NODE_ENV !== "production" && t(n))
          continue;
        n.flags & 4 && (n.flags &= -2), li(
          n,
          n.i,
          n.i ? 15 : 14
        ), n.flags & 4 || (n.flags &= -2);
      }
    }
  } finally {
    for (; bn < Nt.length; bn++) {
      const n = Nt[bn];
      n && (n.flags &= -2);
    }
    bn = -1, Nt.length = 0, hd(e), Ol = null, (Nt.length || Jo.length) && gd(e);
  }
}
function Us(e, t) {
  const n = e.get(t) || 0;
  if (n > Eh) {
    const o = t.i, i = o && nr(o.type);
    return qi(
      `Maximum recursive updates exceeded${i ? ` in component <${i}>` : ""}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`,
      null,
      10
    ), !0;
  }
  return e.set(t, n + 1), !1;
}
let sn = !1;
const hl = /* @__PURE__ */ new Map();
V.NODE_ENV !== "production" && (Ui().__VUE_HMR_RUNTIME__ = {
  createRecord: Ta(yd),
  rerender: Ta(Th),
  reload: Ta(Oh)
});
const Do = /* @__PURE__ */ new Map();
function Vh(e) {
  const t = e.type.__hmrId;
  let n = Do.get(t);
  n || (yd(t, e.type), n = Do.get(t)), n.instances.add(e);
}
function Nh(e) {
  Do.get(e.type.__hmrId).instances.delete(e);
}
function yd(e, t) {
  return Do.has(e) ? !1 : (Do.set(e, {
    initialDef: Al(t),
    instances: /* @__PURE__ */ new Set()
  }), !0);
}
function Al(e) {
  return af(e) ? e.__vccOpts : e;
}
function Th(e, t) {
  const n = Do.get(e);
  n && (n.initialDef.render = t, [...n.instances].forEach((o) => {
    t && (o.render = t, Al(o.type).render = t), o.renderCache = [], sn = !0, o.update(), sn = !1;
  }));
}
function Oh(e, t) {
  const n = Do.get(e);
  if (!n) return;
  t = Al(t), Yr(n.initialDef, t);
  const o = [...n.instances];
  for (let i = 0; i < o.length; i++) {
    const l = o[i], a = Al(l.type);
    let s = hl.get(a);
    s || (a !== n.initialDef && Yr(a, t), hl.set(a, s = /* @__PURE__ */ new Set())), s.add(l), l.appContext.propsCache.delete(l.type), l.appContext.emitsCache.delete(l.type), l.appContext.optionsCache.delete(l.type), l.ceReload ? (s.add(l), l.ceReload(t.styles), s.delete(l)) : l.parent ? la(() => {
      sn = !0, l.parent.update(), sn = !1, s.delete(l);
    }) : l.appContext.reload ? l.appContext.reload() : typeof window < "u" ? window.location.reload() : console.warn(
      "[HMR] Root or manually mounted instance modified. Full reload required."
    ), l.root.ce && l !== l.root && l.root.ce._removeChildStyle(a);
  }
  vd(() => {
    hl.clear();
  });
}
function Yr(e, t) {
  et(e, t);
  for (const n in e)
    n !== "__file" && !(n in t) && delete e[n];
}
function Ta(e) {
  return (t, n) => {
    try {
      return e(t, n);
    } catch (o) {
      console.error(o), console.warn(
        "[HMR] Something went wrong during Vue component hot-reload. Full reload required."
      );
    }
  };
}
let wn, yi = [], es = !1;
function Ki(e, ...t) {
  wn ? wn.emit(e, ...t) : es || yi.push({ event: e, args: t });
}
function pd(e, t) {
  var n, o;
  wn = e, wn ? (wn.enabled = !0, yi.forEach(({ event: i, args: l }) => wn.emit(i, ...l)), yi = []) : /* handle late devtools injection - only do this if we are in an actual */ /* browser environment to avoid the timer handle stalling test runner exit */ /* (#4815) */ typeof window < "u" && // some envs mock window but not fully
  window.HTMLElement && // also exclude jsdom
  // eslint-disable-next-line no-restricted-syntax
  !((o = (n = window.navigator) == null ? void 0 : n.userAgent) != null && o.includes("jsdom")) ? ((t.__VUE_DEVTOOLS_HOOK_REPLAY__ = t.__VUE_DEVTOOLS_HOOK_REPLAY__ || []).push((l) => {
    pd(l, t);
  }), setTimeout(() => {
    wn || (t.__VUE_DEVTOOLS_HOOK_REPLAY__ = null, es = !0, yi = []);
  }, 3e3)) : (es = !0, yi = []);
}
function Ah(e, t) {
  Ki("app:init", e, t, {
    Fragment: Ee,
    Text: Lo,
    Comment: rt,
    Static: yl
  });
}
function Ih(e) {
  Ki("app:unmount", e);
}
const Ph = /* @__PURE__ */ Ws(
  "component:added"
  /* COMPONENT_ADDED */
), bd = /* @__PURE__ */ Ws(
  "component:updated"
  /* COMPONENT_UPDATED */
), Dh = /* @__PURE__ */ Ws(
  "component:removed"
  /* COMPONENT_REMOVED */
), $h = (e) => {
  wn && typeof wn.cleanupBuffer == "function" && // remove the component if it wasn't buffered
  !wn.cleanupBuffer(e) && Dh(e);
};
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Ws(e) {
  return (t) => {
    Ki(
      e,
      t.appContext.app,
      t.uid,
      t.parent ? t.parent.uid : void 0,
      t
    );
  };
}
const Mh = /* @__PURE__ */ _d(
  "perf:start"
  /* PERFORMANCE_START */
), Bh = /* @__PURE__ */ _d(
  "perf:end"
  /* PERFORMANCE_END */
);
function _d(e) {
  return (t, n, o) => {
    Ki(e, t.appContext.app, t.uid, t, n, o);
  };
}
function Fh(e, t, n) {
  Ki(
    "component:emit",
    e.appContext.app,
    e,
    t,
    n
  );
}
let wt = null, wd = null;
function Il(e) {
  const t = wt;
  return wt = e, wd = e && e.type.__scopeId || null, t;
}
function _(e, t = wt, n) {
  if (!t || e._n)
    return e;
  const o = (...i) => {
    o._d && cu(-1);
    const l = Il(t);
    let a;
    try {
      a = e(...i);
    } finally {
      Il(l), o._d && cu(1);
    }
    return V.NODE_ENV !== "production" && bd(t), a;
  };
  return o._n = !0, o._c = !0, o._d = !0, o;
}
function kd(e) {
  xv(e) && Z("Do not use built-in directive ids as custom directive id: " + e);
}
function lt(e, t) {
  if (wt === null)
    return V.NODE_ENV !== "production" && Z("withDirectives can only be used inside render functions."), e;
  const n = ua(wt), o = e.dirs || (e.dirs = []);
  for (let i = 0; i < t.length; i++) {
    let [l, a, s, r = qe] = t[i];
    l && (Te(l) && (l = {
      mounted: l,
      updated: l
    }), l.deep && jn(a), o.push({
      dir: l,
      instance: n,
      value: a,
      oldValue: void 0,
      arg: s,
      modifiers: r
    }));
  }
  return e;
}
function ho(e, t, n, o) {
  const i = e.dirs, l = t && t.dirs;
  for (let a = 0; a < i.length; a++) {
    const s = i[a];
    l && (s.oldValue = l[a].value);
    let r = s.dir[o];
    r && (Kn(), fn(r, n, 8, [
      e.el,
      s,
      e,
      t
    ]), Gn());
  }
}
const Sd = Symbol("_vte"), Cd = (e) => e.__isTeleport, To = (e) => e && (e.disabled || e.disabled === ""), Lh = (e) => e && (e.defer || e.defer === ""), Xr = (e) => typeof SVGElement < "u" && e instanceof SVGElement, Jr = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement, ts = (e, t) => {
  const n = e && e.to;
  if (Qe(n))
    if (t) {
      const o = t(n);
      return V.NODE_ENV !== "production" && !o && !To(e) && Z(
        `Failed to locate Teleport target with selector "${n}". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.`
      ), o;
    } else
      return V.NODE_ENV !== "production" && Z(
        "Current renderer does not support string target for Teleports. (missing querySelector renderer option)"
      ), null;
  else
    return V.NODE_ENV !== "production" && !n && !To(e) && Z(`Invalid Teleport target: ${n}`), n;
}, Rh = {
  name: "Teleport",
  __isTeleport: !0,
  process(e, t, n, o, i, l, a, s, r, d) {
    const {
      mc: c,
      pc: f,
      pbc: m,
      o: { insert: h, querySelector: v, createText: g, createComment: y }
    } = d, w = To(t.props);
    let { shapeFlag: E, children: A, dynamicChildren: P } = t;
    if (V.NODE_ENV !== "production" && sn && (r = !1, P = null), e == null) {
      const C = t.el = V.NODE_ENV !== "production" ? y("teleport start") : g(""), x = t.anchor = V.NODE_ENV !== "production" ? y("teleport end") : g("");
      h(C, n, o), h(x, n, o);
      const I = (T, $) => {
        E & 16 && (i && i.isCE && (i.ce._teleportTarget = T), c(
          A,
          T,
          $,
          i,
          l,
          a,
          s,
          r
        ));
      }, N = () => {
        const T = t.target = ts(t.props, v), $ = Ed(T, t, g, h);
        T ? (a !== "svg" && Xr(T) ? a = "svg" : a !== "mathml" && Jr(T) && (a = "mathml"), w || (I(T, $), gl(t, !1))) : V.NODE_ENV !== "production" && !w && Z(
          "Invalid Teleport target on mount:",
          T,
          `(${typeof T})`
        );
      };
      w && (I(n, x), gl(t, !0)), Lh(t.props) ? It(N, l) : N();
    } else {
      t.el = e.el, t.targetStart = e.targetStart;
      const C = t.anchor = e.anchor, x = t.target = e.target, I = t.targetAnchor = e.targetAnchor, N = To(e.props), T = N ? n : x, $ = N ? C : I;
      if (a === "svg" || Xr(x) ? a = "svg" : (a === "mathml" || Jr(x)) && (a = "mathml"), P ? (m(
        e.dynamicChildren,
        P,
        T,
        i,
        l,
        a,
        s
      ), Si(e, t, !0)) : r || f(
        e,
        t,
        T,
        $,
        i,
        l,
        a,
        s,
        !1
      ), w)
        N ? t.props && e.props && t.props.to !== e.props.to && (t.props.to = e.props.to) : sl(
          t,
          n,
          C,
          d,
          1
        );
      else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
        const O = t.target = ts(
          t.props,
          v
        );
        O ? sl(
          t,
          O,
          null,
          d,
          0
        ) : V.NODE_ENV !== "production" && Z(
          "Invalid Teleport target on update:",
          x,
          `(${typeof x})`
        );
      } else N && sl(
        t,
        x,
        I,
        d,
        1
      );
      gl(t, w);
    }
  },
  remove(e, t, n, { um: o, o: { remove: i } }, l) {
    const {
      shapeFlag: a,
      children: s,
      anchor: r,
      targetStart: d,
      targetAnchor: c,
      target: f,
      props: m
    } = e;
    if (f && (i(d), i(c)), l && i(r), a & 16) {
      const h = l || !To(m);
      for (let v = 0; v < s.length; v++) {
        const g = s[v];
        o(
          g,
          t,
          n,
          h,
          !!g.dynamicChildren
        );
      }
    }
  },
  move: sl,
  hydrate: Hh
};
function sl(e, t, n, { o: { insert: o }, m: i }, l = 2) {
  l === 0 && o(e.targetAnchor, t, n);
  const { el: a, anchor: s, shapeFlag: r, children: d, props: c } = e, f = l === 2;
  if (f && o(a, t, n), (!f || To(c)) && r & 16)
    for (let m = 0; m < d.length; m++)
      i(
        d[m],
        t,
        n,
        2
      );
  f && o(s, t, n);
}
function Hh(e, t, n, o, i, l, {
  o: { nextSibling: a, parentNode: s, querySelector: r, insert: d, createText: c }
}, f) {
  const m = t.target = ts(
    t.props,
    r
  );
  if (m) {
    const h = To(t.props), v = m._lpa || m.firstChild;
    if (t.shapeFlag & 16)
      if (h)
        t.anchor = f(
          a(e),
          t,
          s(e),
          n,
          o,
          i,
          l
        ), t.targetStart = v, t.targetAnchor = v && a(v);
      else {
        t.anchor = a(e);
        let g = v;
        for (; g; ) {
          if (g && g.nodeType === 8) {
            if (g.data === "teleport start anchor")
              t.targetStart = g;
            else if (g.data === "teleport anchor") {
              t.targetAnchor = g, m._lpa = t.targetAnchor && a(t.targetAnchor);
              break;
            }
          }
          g = a(g);
        }
        t.targetAnchor || Ed(m, t, c, d), f(
          v && a(v),
          t,
          m,
          n,
          o,
          i,
          l
        );
      }
    gl(t, h);
  }
  return t.anchor && a(t.anchor);
}
const jh = Rh;
function gl(e, t) {
  const n = e.ctx;
  if (n && n.ut) {
    let o, i;
    for (t ? (o = e.el, i = e.anchor) : (o = e.targetStart, i = e.targetAnchor); o && o !== i; )
      o.nodeType === 1 && o.setAttribute("data-v-owner", n.uid), o = o.nextSibling;
    n.ut();
  }
}
function Ed(e, t, n, o) {
  const i = t.targetStart = n(""), l = t.targetAnchor = n("");
  return i[Sd] = l, e && (o(i, e), o(l, e)), l;
}
const oo = Symbol("_leaveCb"), rl = Symbol("_enterCb");
function xd() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  return vn(() => {
    e.isMounted = !0;
  }), pt(() => {
    e.isUnmounting = !0;
  }), e;
}
const Xt = [Function, Array], Vd = {
  mode: String,
  appear: Boolean,
  persisted: Boolean,
  // enter
  onBeforeEnter: Xt,
  onEnter: Xt,
  onAfterEnter: Xt,
  onEnterCancelled: Xt,
  // leave
  onBeforeLeave: Xt,
  onLeave: Xt,
  onAfterLeave: Xt,
  onLeaveCancelled: Xt,
  // appear
  onBeforeAppear: Xt,
  onAppear: Xt,
  onAfterAppear: Xt,
  onAppearCancelled: Xt
}, Nd = (e) => {
  const t = e.subTree;
  return t.component ? Nd(t.component) : t;
}, zh = {
  name: "BaseTransition",
  props: Vd,
  setup(e, { slots: t }) {
    const n = ra(), o = xd();
    return () => {
      const i = t.default && qs(t.default(), !0);
      if (!i || !i.length)
        return;
      const l = Td(i), a = ve(e), { mode: s } = a;
      if (V.NODE_ENV !== "production" && s && s !== "in-out" && s !== "out-in" && s !== "default" && Z(`invalid <transition> mode: ${s}`), o.isLeaving)
        return Oa(l);
      const r = Zr(l);
      if (!r)
        return Oa(l);
      let d = Oi(
        r,
        a,
        o,
        n,
        // #11061, ensure enterHooks is fresh after clone
        (m) => d = m
      );
      r.type !== rt && $o(r, d);
      const c = n.subTree, f = c && Zr(c);
      if (f && f.type !== rt && !ko(r, f) && Nd(n).type !== rt) {
        const m = Oi(
          f,
          a,
          o,
          n
        );
        if ($o(f, m), s === "out-in" && r.type !== rt)
          return o.isLeaving = !0, m.afterLeave = () => {
            o.isLeaving = !1, n.job.flags & 8 || n.update(), delete m.afterLeave;
          }, Oa(l);
        s === "in-out" && r.type !== rt && (m.delayLeave = (h, v, g) => {
          const y = Od(
            o,
            f
          );
          y[String(f.key)] = f, h[oo] = () => {
            v(), h[oo] = void 0, delete d.delayedLeave;
          }, d.delayedLeave = g;
        });
      }
      return l;
    };
  }
};
function Td(e) {
  let t = e[0];
  if (e.length > 1) {
    let n = !1;
    for (const o of e)
      if (o.type !== rt) {
        if (V.NODE_ENV !== "production" && n) {
          Z(
            "<transition> can only be used on a single element or component. Use <transition-group> for lists."
          );
          break;
        }
        if (t = o, n = !0, V.NODE_ENV === "production") break;
      }
  }
  return t;
}
const Uh = zh;
function Od(e, t) {
  const { leavingVNodes: n } = e;
  let o = n.get(t.type);
  return o || (o = /* @__PURE__ */ Object.create(null), n.set(t.type, o)), o;
}
function Oi(e, t, n, o, i) {
  const {
    appear: l,
    mode: a,
    persisted: s = !1,
    onBeforeEnter: r,
    onEnter: d,
    onAfterEnter: c,
    onEnterCancelled: f,
    onBeforeLeave: m,
    onLeave: h,
    onAfterLeave: v,
    onLeaveCancelled: g,
    onBeforeAppear: y,
    onAppear: w,
    onAfterAppear: E,
    onAppearCancelled: A
  } = t, P = String(e.key), C = Od(n, e), x = (T, $) => {
    T && fn(
      T,
      o,
      9,
      $
    );
  }, I = (T, $) => {
    const O = $[1];
    x(T, $), _e(T) ? T.every((k) => k.length <= 1) && O() : T.length <= 1 && O();
  }, N = {
    mode: a,
    persisted: s,
    beforeEnter(T) {
      let $ = r;
      if (!n.isMounted)
        if (l)
          $ = y || r;
        else
          return;
      T[oo] && T[oo](
        !0
        /* cancelled */
      );
      const O = C[P];
      O && ko(e, O) && O.el[oo] && O.el[oo](), x($, [T]);
    },
    enter(T) {
      let $ = d, O = c, k = f;
      if (!n.isMounted)
        if (l)
          $ = w || d, O = E || c, k = A || f;
        else
          return;
      let D = !1;
      const R = T[rl] = (G) => {
        D || (D = !0, G ? x(k, [T]) : x(O, [T]), N.delayedLeave && N.delayedLeave(), T[rl] = void 0);
      };
      $ ? I($, [T, R]) : R();
    },
    leave(T, $) {
      const O = String(e.key);
      if (T[rl] && T[rl](
        !0
        /* cancelled */
      ), n.isUnmounting)
        return $();
      x(m, [T]);
      let k = !1;
      const D = T[oo] = (R) => {
        k || (k = !0, $(), R ? x(g, [T]) : x(v, [T]), T[oo] = void 0, C[O] === e && delete C[O]);
      };
      C[O] = e, h ? I(h, [T, D]) : D();
    },
    clone(T) {
      const $ = Oi(
        T,
        t,
        n,
        o,
        i
      );
      return i && i($), $;
    }
  };
  return N;
}
function Oa(e) {
  if (Gi(e))
    return e = mn(e), e.children = null, e;
}
function Zr(e) {
  if (!Gi(e))
    return Cd(e.type) && e.children ? Td(e.children) : e;
  if (V.NODE_ENV !== "production" && e.component)
    return e.component.subTree;
  const { shapeFlag: t, children: n } = e;
  if (n) {
    if (t & 16)
      return n[0];
    if (t & 32 && Te(n.default))
      return n.default();
  }
}
function $o(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, $o(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function qs(e, t = !1, n) {
  let o = [], i = 0;
  for (let l = 0; l < e.length; l++) {
    let a = e[l];
    const s = n == null ? a.key : String(n) + String(a.key != null ? a.key : l);
    a.type === Ee ? (a.patchFlag & 128 && i++, o = o.concat(
      qs(a.children, t, s)
    )) : (t || a.type !== rt) && o.push(s != null ? mn(a, { key: s }) : a);
  }
  if (i > 1)
    for (let l = 0; l < o.length; l++)
      o[l].patchFlag = -2;
  return o;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Wh(e, t) {
  return Te(e) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    et({ name: e.name }, t, { setup: e })
  ) : e;
}
function Ad(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
const qh = /* @__PURE__ */ new WeakSet();
function ns(e, t, n, o, i = !1) {
  if (_e(e)) {
    e.forEach(
      (v, g) => ns(
        v,
        t && (_e(t) ? t[g] : t),
        n,
        o,
        i
      )
    );
    return;
  }
  if (ki(o) && !i)
    return;
  const l = o.shapeFlag & 4 ? ua(o.component) : o.el, a = i ? null : l, { i: s, r } = e;
  if (V.NODE_ENV !== "production" && !s) {
    Z(
      "Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function."
    );
    return;
  }
  const d = t && t.r, c = s.refs === qe ? s.refs = {} : s.refs, f = s.setupState, m = ve(f), h = f === qe ? () => !1 : (v) => V.NODE_ENV !== "production" && (Fe(m, v) && !Je(m[v]) && Z(
    `Template ref "${v}" used on a non-ref value. It will not work in the production build.`
  ), qh.has(m[v])) ? !1 : Fe(m, v);
  if (d != null && d !== r && (Qe(d) ? (c[d] = null, h(d) && (f[d] = null)) : Je(d) && (d.value = null)), Te(r))
    li(r, s, 12, [a, c]);
  else {
    const v = Qe(r), g = Je(r);
    if (v || g) {
      const y = () => {
        if (e.f) {
          const w = v ? h(r) ? f[r] : c[r] : r.value;
          i ? _e(w) && Ps(w, l) : _e(w) ? w.includes(l) || w.push(l) : v ? (c[r] = [l], h(r) && (f[r] = c[r])) : (r.value = [l], e.k && (c[e.k] = r.value));
        } else v ? (c[r] = a, h(r) && (f[r] = a)) : g ? (r.value = a, e.k && (c[e.k] = a)) : V.NODE_ENV !== "production" && Z("Invalid template ref type:", r, `(${typeof r})`);
      };
      a ? (y.id = -1, It(y, n)) : y();
    } else V.NODE_ENV !== "production" && Z("Invalid template ref type:", r, `(${typeof r})`);
  }
}
Ui().requestIdleCallback;
Ui().cancelIdleCallback;
const ki = (e) => !!e.type.__asyncLoader, Gi = (e) => e.type.__isKeepAlive;
function Id(e, t) {
  Pd(e, "a", t);
}
function Ks(e, t) {
  Pd(e, "da", t);
}
function Pd(e, t, n = mt) {
  const o = e.__wdc || (e.__wdc = () => {
    let i = n;
    for (; i; ) {
      if (i.isDeactivated)
        return;
      i = i.parent;
    }
    return e();
  });
  if (aa(t, o, n), n) {
    let i = n.parent;
    for (; i && i.parent; )
      Gi(i.parent.vnode) && Kh(o, t, n, i), i = i.parent;
  }
}
function Kh(e, t, n, o) {
  const i = aa(
    t,
    e,
    o,
    !0
    /* prepend */
  );
  Dd(() => {
    Ps(o[t], i);
  }, n);
}
function aa(e, t, n = mt, o = !1) {
  if (n) {
    const i = n[e] || (n[e] = []), l = t.__weh || (t.__weh = (...a) => {
      Kn();
      const s = Yi(n), r = fn(t, n, e, a);
      return s(), Gn(), r;
    });
    return o ? i.unshift(l) : i.push(l), l;
  } else if (V.NODE_ENV !== "production") {
    const i = _o(zs[e].replace(/ hook$/, ""));
    Z(
      `${i} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
    );
  }
}
const Yn = (e) => (t, n = mt) => {
  (!Ii || e === "sp") && aa(e, (...o) => t(...o), n);
}, Gs = Yn("bm"), vn = Yn("m"), Gh = Yn(
  "bu"
), Ys = Yn("u"), pt = Yn(
  "bum"
), Dd = Yn("um"), Yh = Yn(
  "sp"
), Xh = Yn("rtg"), Jh = Yn("rtc");
function Zh(e, t = mt) {
  aa("ec", e, t);
}
const os = "components", Qh = "directives", eg = Symbol.for("v-ndc");
function tg(e) {
  return Qe(e) && $d(os, e, !1) || e;
}
function Nn(e) {
  return $d(Qh, e);
}
function $d(e, t, n = !0, o = !1) {
  const i = wt || mt;
  if (i) {
    const l = i.type;
    if (e === os) {
      const s = nr(
        l,
        !1
      );
      if (s && (s === t || s === yt(t) || s === Qt(yt(t))))
        return l;
    }
    const a = (
      // local registration
      // check instance[type] first which is resolved for options API
      Qr(i[e] || l[e], t) || // global registration
      Qr(i.appContext[e], t)
    );
    if (!a && o)
      return l;
    if (V.NODE_ENV !== "production" && n && !a) {
      const s = e === os ? `
If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.` : "";
      Z(`Failed to resolve ${e.slice(0, -1)}: ${t}${s}`);
    }
    return a;
  } else V.NODE_ENV !== "production" && Z(
    `resolve${Qt(e.slice(0, -1))} can only be used in render() or setup().`
  );
}
function Qr(e, t) {
  return e && (e[t] || e[yt(t)] || e[Qt(yt(t))]);
}
function jt(e, t, n, o) {
  let i;
  const l = n, a = _e(e);
  if (a || Qe(e)) {
    const s = a && Vo(e);
    let r = !1;
    s && (r = !Tt(e), e = na(e)), i = new Array(e.length);
    for (let d = 0, c = e.length; d < c; d++)
      i[d] = t(
        r ? _t(e[d]) : e[d],
        d,
        void 0,
        l
      );
  } else if (typeof e == "number") {
    V.NODE_ENV !== "production" && !Number.isInteger(e) && Z(`The v-for range expect an integer value but got ${e}.`), i = new Array(e);
    for (let s = 0; s < e; s++)
      i[s] = t(s + 1, s, void 0, l);
  } else if (Le(e))
    if (e[Symbol.iterator])
      i = Array.from(
        e,
        (s, r) => t(s, r, void 0, l)
      );
    else {
      const s = Object.keys(e);
      i = new Array(s.length);
      for (let r = 0, d = s.length; r < d; r++) {
        const c = s[r];
        i[r] = t(e[c], c, r, l);
      }
    }
  else
    i = [];
  return i;
}
const is = (e) => e ? of(e) ? ua(e) : is(e.parent) : null, Oo = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ et(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => V.NODE_ENV !== "production" ? kn(e.props) : e.props,
    $attrs: (e) => V.NODE_ENV !== "production" ? kn(e.attrs) : e.attrs,
    $slots: (e) => V.NODE_ENV !== "production" ? kn(e.slots) : e.slots,
    $refs: (e) => V.NODE_ENV !== "production" ? kn(e.refs) : e.refs,
    $parent: (e) => is(e.parent),
    $root: (e) => is(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Js(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      la(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = ot.bind(e.proxy)),
    $watch: (e) => Pg.bind(e)
  })
), Xs = (e) => e === "_" || e === "$", Aa = (e, t) => e !== qe && !e.__isScriptSetup && Fe(e, t), Md = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: n, setupState: o, data: i, props: l, accessCache: a, type: s, appContext: r } = e;
    if (V.NODE_ENV !== "production" && t === "__isVue")
      return !0;
    let d;
    if (t[0] !== "$") {
      const h = a[t];
      if (h !== void 0)
        switch (h) {
          case 1:
            return o[t];
          case 2:
            return i[t];
          case 4:
            return n[t];
          case 3:
            return l[t];
        }
      else {
        if (Aa(o, t))
          return a[t] = 1, o[t];
        if (i !== qe && Fe(i, t))
          return a[t] = 2, i[t];
        if (
          // only cache other properties when instance has declared (thus stable)
          // props
          (d = e.propsOptions[0]) && Fe(d, t)
        )
          return a[t] = 3, l[t];
        if (n !== qe && Fe(n, t))
          return a[t] = 4, n[t];
        ls && (a[t] = 0);
      }
    }
    const c = Oo[t];
    let f, m;
    if (c)
      return t === "$attrs" ? (dt(e.attrs, "get", ""), V.NODE_ENV !== "production" && $l()) : V.NODE_ENV !== "production" && t === "$slots" && dt(e, "get", t), c(e);
    if (
      // css module (injected by vue-loader)
      (f = s.__cssModules) && (f = f[t])
    )
      return f;
    if (n !== qe && Fe(n, t))
      return a[t] = 4, n[t];
    if (
      // global properties
      m = r.config.globalProperties, Fe(m, t)
    )
      return m[t];
    V.NODE_ENV !== "production" && wt && (!Qe(t) || // #1091 avoid internal isRef/isVNode checks on component instance leading
    // to infinite warning loop
    t.indexOf("__v") !== 0) && (i !== qe && Xs(t[0]) && Fe(i, t) ? Z(
      `Property ${JSON.stringify(
        t
      )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
    ) : e === wt && Z(
      `Property ${JSON.stringify(t)} was accessed during render but is not defined on instance.`
    ));
  },
  set({ _: e }, t, n) {
    const { data: o, setupState: i, ctx: l } = e;
    return Aa(i, t) ? (i[t] = n, !0) : V.NODE_ENV !== "production" && i.__isScriptSetup && Fe(i, t) ? (Z(`Cannot mutate <script setup> binding "${t}" from Options API.`), !1) : o !== qe && Fe(o, t) ? (o[t] = n, !0) : Fe(e.props, t) ? (V.NODE_ENV !== "production" && Z(`Attempting to mutate prop "${t}". Props are readonly.`), !1) : t[0] === "$" && t.slice(1) in e ? (V.NODE_ENV !== "production" && Z(
      `Attempting to mutate public property "${t}". Properties starting with $ are reserved and readonly.`
    ), !1) : (V.NODE_ENV !== "production" && t in e.appContext.config.globalProperties ? Object.defineProperty(l, t, {
      enumerable: !0,
      configurable: !0,
      value: n
    }) : l[t] = n, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: n, ctx: o, appContext: i, propsOptions: l }
  }, a) {
    let s;
    return !!n[a] || e !== qe && Fe(e, a) || Aa(t, a) || (s = l[0]) && Fe(s, a) || Fe(o, a) || Fe(Oo, a) || Fe(i.config.globalProperties, a);
  },
  defineProperty(e, t, n) {
    return n.get != null ? e._.accessCache[t] = 0 : Fe(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
  }
};
V.NODE_ENV !== "production" && (Md.ownKeys = (e) => (Z(
  "Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead."
), Reflect.ownKeys(e)));
function ng(e) {
  const t = {};
  return Object.defineProperty(t, "_", {
    configurable: !0,
    enumerable: !1,
    get: () => e
  }), Object.keys(Oo).forEach((n) => {
    Object.defineProperty(t, n, {
      configurable: !0,
      enumerable: !1,
      get: () => Oo[n](e),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: ft
    });
  }), t;
}
function og(e) {
  const {
    ctx: t,
    propsOptions: [n]
  } = e;
  n && Object.keys(n).forEach((o) => {
    Object.defineProperty(t, o, {
      enumerable: !0,
      configurable: !0,
      get: () => e.props[o],
      set: ft
    });
  });
}
function ig(e) {
  const { ctx: t, setupState: n } = e;
  Object.keys(ve(n)).forEach((o) => {
    if (!n.__isScriptSetup) {
      if (Xs(o[0])) {
        Z(
          `setup() return property ${JSON.stringify(
            o
          )} should not start with "$" or "_" which are reserved prefixes for Vue internals.`
        );
        return;
      }
      Object.defineProperty(t, o, {
        enumerable: !0,
        configurable: !0,
        get: () => n[o],
        set: ft
      });
    }
  });
}
function eu(e) {
  return _e(e) ? e.reduce(
    (t, n) => (t[n] = null, t),
    {}
  ) : e;
}
function lg() {
  const e = /* @__PURE__ */ Object.create(null);
  return (t, n) => {
    e[n] ? Z(`${t} property "${n}" is already defined in ${e[n]}.`) : e[n] = t;
  };
}
let ls = !0;
function ag(e) {
  const t = Js(e), n = e.proxy, o = e.ctx;
  ls = !1, t.beforeCreate && tu(t.beforeCreate, e, "bc");
  const {
    // state
    data: i,
    computed: l,
    methods: a,
    watch: s,
    provide: r,
    inject: d,
    // lifecycle
    created: c,
    beforeMount: f,
    mounted: m,
    beforeUpdate: h,
    updated: v,
    activated: g,
    deactivated: y,
    beforeDestroy: w,
    beforeUnmount: E,
    destroyed: A,
    unmounted: P,
    render: C,
    renderTracked: x,
    renderTriggered: I,
    errorCaptured: N,
    serverPrefetch: T,
    // public API
    expose: $,
    inheritAttrs: O,
    // assets
    components: k,
    directives: D,
    filters: R
  } = t, G = V.NODE_ENV !== "production" ? lg() : null;
  if (V.NODE_ENV !== "production") {
    const [oe] = e.propsOptions;
    if (oe)
      for (const ee in oe)
        G("Props", ee);
  }
  if (d && sg(d, o, G), a)
    for (const oe in a) {
      const ee = a[oe];
      Te(ee) ? (V.NODE_ENV !== "production" ? Object.defineProperty(o, oe, {
        value: ee.bind(n),
        configurable: !0,
        enumerable: !0,
        writable: !0
      }) : o[oe] = ee.bind(n), V.NODE_ENV !== "production" && G("Methods", oe)) : V.NODE_ENV !== "production" && Z(
        `Method "${oe}" has type "${typeof ee}" in the component definition. Did you reference the function correctly?`
      );
    }
  if (i) {
    V.NODE_ENV !== "production" && !Te(i) && Z(
      "The data option must be a function. Plain object usage is no longer supported."
    );
    const oe = i.call(n, n);
    if (V.NODE_ENV !== "production" && Ds(oe) && Z(
      "data() returned a Promise - note data() cannot be async; If you intend to perform data fetching before component renders, use async setup() + <Suspense>."
    ), !Le(oe))
      V.NODE_ENV !== "production" && Z("data() should return an object.");
    else if (e.data = gt(oe), V.NODE_ENV !== "production")
      for (const ee in oe)
        G("Data", ee), Xs(ee[0]) || Object.defineProperty(o, ee, {
          configurable: !0,
          enumerable: !0,
          get: () => oe[ee],
          set: ft
        });
  }
  if (ls = !0, l)
    for (const oe in l) {
      const ee = l[oe], B = Te(ee) ? ee.bind(n, n) : Te(ee.get) ? ee.get.bind(n, n) : ft;
      V.NODE_ENV !== "production" && B === ft && Z(`Computed property "${oe}" has no getter.`);
      const M = !Te(ee) && Te(ee.set) ? ee.set.bind(n) : V.NODE_ENV !== "production" ? () => {
        Z(
          `Write operation failed: computed property "${oe}" is readonly.`
        );
      } : ft, H = p({
        get: B,
        set: M
      });
      Object.defineProperty(o, oe, {
        enumerable: !0,
        configurable: !0,
        get: () => H.value,
        set: (K) => H.value = K
      }), V.NODE_ENV !== "production" && G("Computed", oe);
    }
  if (s)
    for (const oe in s)
      Bd(s[oe], o, n, oe);
  if (r) {
    const oe = Te(r) ? r.call(n) : r;
    Reflect.ownKeys(oe).forEach((ee) => {
      ht(ee, oe[ee]);
    });
  }
  c && tu(c, e, "c");
  function re(oe, ee) {
    _e(ee) ? ee.forEach((B) => oe(B.bind(n))) : ee && oe(ee.bind(n));
  }
  if (re(Gs, f), re(vn, m), re(Gh, h), re(Ys, v), re(Id, g), re(Ks, y), re(Zh, N), re(Jh, x), re(Xh, I), re(pt, E), re(Dd, P), re(Yh, T), _e($))
    if ($.length) {
      const oe = e.exposed || (e.exposed = {});
      $.forEach((ee) => {
        Object.defineProperty(oe, ee, {
          get: () => n[ee],
          set: (B) => n[ee] = B
        });
      });
    } else e.exposed || (e.exposed = {});
  C && e.render === ft && (e.render = C), O != null && (e.inheritAttrs = O), k && (e.components = k), D && (e.directives = D), T && Ad(e);
}
function sg(e, t, n = ft) {
  _e(e) && (e = as(e));
  for (const o in e) {
    const i = e[o];
    let l;
    Le(i) ? "default" in i ? l = Ge(
      i.from || o,
      i.default,
      !0
    ) : l = Ge(i.from || o) : l = Ge(i), Je(l) ? Object.defineProperty(t, o, {
      enumerable: !0,
      configurable: !0,
      get: () => l.value,
      set: (a) => l.value = a
    }) : t[o] = l, V.NODE_ENV !== "production" && n("Inject", o);
  }
}
function tu(e, t, n) {
  fn(
    _e(e) ? e.map((o) => o.bind(t.proxy)) : e.bind(t.proxy),
    t,
    n
  );
}
function Bd(e, t, n, o) {
  let i = o.includes(".") ? Yd(n, o) : () => n[o];
  if (Qe(e)) {
    const l = t[e];
    Te(l) ? ge(i, l) : V.NODE_ENV !== "production" && Z(`Invalid watch handler specified by key "${e}"`, l);
  } else if (Te(e))
    ge(i, e.bind(n));
  else if (Le(e))
    if (_e(e))
      e.forEach((l) => Bd(l, t, n, o));
    else {
      const l = Te(e.handler) ? e.handler.bind(n) : t[e.handler];
      Te(l) ? ge(i, l, e) : V.NODE_ENV !== "production" && Z(`Invalid watch handler specified by key "${e.handler}"`, l);
    }
  else V.NODE_ENV !== "production" && Z(`Invalid watch option: "${o}"`, e);
}
function Js(e) {
  const t = e.type, { mixins: n, extends: o } = t, {
    mixins: i,
    optionsCache: l,
    config: { optionMergeStrategies: a }
  } = e.appContext, s = l.get(t);
  let r;
  return s ? r = s : !i.length && !n && !o ? r = t : (r = {}, i.length && i.forEach(
    (d) => Pl(r, d, a, !0)
  ), Pl(r, t, a)), Le(t) && l.set(t, r), r;
}
function Pl(e, t, n, o = !1) {
  const { mixins: i, extends: l } = t;
  l && Pl(e, l, n, !0), i && i.forEach(
    (a) => Pl(e, a, n, !0)
  );
  for (const a in t)
    if (o && a === "expose")
      V.NODE_ENV !== "production" && Z(
        '"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.'
      );
    else {
      const s = rg[a] || n && n[a];
      e[a] = s ? s(e[a], t[a]) : t[a];
    }
  return e;
}
const rg = {
  data: nu,
  props: ou,
  emits: ou,
  // objects
  methods: pi,
  computed: pi,
  // lifecycle
  beforeCreate: xt,
  created: xt,
  beforeMount: xt,
  mounted: xt,
  beforeUpdate: xt,
  updated: xt,
  beforeDestroy: xt,
  beforeUnmount: xt,
  destroyed: xt,
  unmounted: xt,
  activated: xt,
  deactivated: xt,
  errorCaptured: xt,
  serverPrefetch: xt,
  // assets
  components: pi,
  directives: pi,
  // watch
  watch: cg,
  // provide / inject
  provide: nu,
  inject: ug
};
function nu(e, t) {
  return t ? e ? function() {
    return et(
      Te(e) ? e.call(this, this) : e,
      Te(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function ug(e, t) {
  return pi(as(e), as(t));
}
function as(e) {
  if (_e(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++)
      t[e[n]] = e[n];
    return t;
  }
  return e;
}
function xt(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function pi(e, t) {
  return e ? et(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function ou(e, t) {
  return e ? _e(e) && _e(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : et(
    /* @__PURE__ */ Object.create(null),
    eu(e),
    eu(t ?? {})
  ) : t;
}
function cg(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = et(/* @__PURE__ */ Object.create(null), e);
  for (const o in t)
    n[o] = xt(e[o], t[o]);
  return n;
}
function Fd() {
  return {
    app: null,
    config: {
      isNativeTag: Cv,
      performance: !1,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: void 0,
      warnHandler: void 0,
      compilerOptions: {}
    },
    mixins: [],
    components: {},
    directives: {},
    provides: /* @__PURE__ */ Object.create(null),
    optionsCache: /* @__PURE__ */ new WeakMap(),
    propsCache: /* @__PURE__ */ new WeakMap(),
    emitsCache: /* @__PURE__ */ new WeakMap()
  };
}
let dg = 0;
function fg(e, t) {
  return function(o, i = null) {
    Te(o) || (o = et({}, o)), i != null && !Le(i) && (V.NODE_ENV !== "production" && Z("root props passed to app.mount() must be an object."), i = null);
    const l = Fd(), a = /* @__PURE__ */ new WeakSet(), s = [];
    let r = !1;
    const d = l.app = {
      _uid: dg++,
      _component: o,
      _props: i,
      _container: null,
      _context: l,
      _instance: null,
      version: vu,
      get config() {
        return l.config;
      },
      set config(c) {
        V.NODE_ENV !== "production" && Z(
          "app.config cannot be replaced. Modify individual options instead."
        );
      },
      use(c, ...f) {
        return a.has(c) ? V.NODE_ENV !== "production" && Z("Plugin has already been applied to target app.") : c && Te(c.install) ? (a.add(c), c.install(d, ...f)) : Te(c) ? (a.add(c), c(d, ...f)) : V.NODE_ENV !== "production" && Z(
          'A plugin must either be a function or an object with an "install" function.'
        ), d;
      },
      mixin(c) {
        return l.mixins.includes(c) ? V.NODE_ENV !== "production" && Z(
          "Mixin has already been applied to target app" + (c.name ? `: ${c.name}` : "")
        ) : l.mixins.push(c), d;
      },
      component(c, f) {
        return V.NODE_ENV !== "production" && ds(c, l.config), f ? (V.NODE_ENV !== "production" && l.components[c] && Z(`Component "${c}" has already been registered in target app.`), l.components[c] = f, d) : l.components[c];
      },
      directive(c, f) {
        return V.NODE_ENV !== "production" && kd(c), f ? (V.NODE_ENV !== "production" && l.directives[c] && Z(`Directive "${c}" has already been registered in target app.`), l.directives[c] = f, d) : l.directives[c];
      },
      mount(c, f, m) {
        if (r)
          V.NODE_ENV !== "production" && Z(
            "App has already been mounted.\nIf you want to remount the same app, move your app creation logic into a factory function and create fresh app instances for each mount - e.g. `const createMyApp = () => createApp(App)`"
          );
        else {
          V.NODE_ENV !== "production" && c.__vue_app__ && Z(
            "There is already an app instance mounted on the host container.\n If you want to mount another app on the same host container, you need to unmount the previous app by calling `app.unmount()` first."
          );
          const h = d._ceVNode || u(o, i);
          return h.appContext = l, m === !0 ? m = "svg" : m === !1 && (m = void 0), V.NODE_ENV !== "production" && (l.reload = () => {
            e(
              mn(h),
              c,
              m
            );
          }), f && t ? t(h, c) : e(h, c, m), r = !0, d._container = c, c.__vue_app__ = d, V.NODE_ENV !== "production" && (d._instance = h.component, Ah(d, vu)), ua(h.component);
        }
      },
      onUnmount(c) {
        V.NODE_ENV !== "production" && typeof c != "function" && Z(
          `Expected function as first argument to app.onUnmount(), but got ${typeof c}`
        ), s.push(c);
      },
      unmount() {
        r ? (fn(
          s,
          d._instance,
          16
        ), e(null, d._container), V.NODE_ENV !== "production" && (d._instance = null, Ih(d)), delete d._container.__vue_app__) : V.NODE_ENV !== "production" && Z("Cannot unmount an app that is not mounted.");
      },
      provide(c, f) {
        return V.NODE_ENV !== "production" && c in l.provides && Z(
          `App already provides property with key "${String(c)}". It will be overwritten with the new value.`
        ), l.provides[c] = f, d;
      },
      runWithContext(c) {
        const f = Zo;
        Zo = d;
        try {
          return c();
        } finally {
          Zo = f;
        }
      }
    };
    return d;
  };
}
let Zo = null;
function ht(e, t) {
  if (!mt)
    V.NODE_ENV !== "production" && Z("provide() can only be used inside setup().");
  else {
    let n = mt.provides;
    const o = mt.parent && mt.parent.provides;
    o === n && (n = mt.provides = Object.create(o)), n[e] = t;
  }
}
function Ge(e, t, n = !1) {
  const o = mt || wt;
  if (o || Zo) {
    const i = Zo ? Zo._context.provides : o ? o.parent == null ? o.vnode.appContext && o.vnode.appContext.provides : o.parent.provides : void 0;
    if (i && e in i)
      return i[e];
    if (arguments.length > 1)
      return n && Te(t) ? t.call(o && o.proxy) : t;
    V.NODE_ENV !== "production" && Z(`injection "${String(e)}" not found.`);
  } else V.NODE_ENV !== "production" && Z("inject() can only be used inside setup() or functional components.");
}
const Ld = {}, Rd = () => Object.create(Ld), Hd = (e) => Object.getPrototypeOf(e) === Ld;
function mg(e, t, n, o = !1) {
  const i = {}, l = Rd();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), jd(e, t, i, l);
  for (const a in e.propsOptions[0])
    a in i || (i[a] = void 0);
  V.NODE_ENV !== "production" && Ud(t || {}, i, e), n ? e.props = o ? i : ch(i) : e.type.props ? e.props = i : e.props = l, e.attrs = l;
}
function vg(e) {
  for (; e; ) {
    if (e.type.__hmrId) return !0;
    e = e.parent;
  }
}
function hg(e, t, n, o) {
  const {
    props: i,
    attrs: l,
    vnode: { patchFlag: a }
  } = e, s = ve(i), [r] = e.propsOptions;
  let d = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(V.NODE_ENV !== "production" && vg(e)) && (o || a > 0) && !(a & 16)
  ) {
    if (a & 8) {
      const c = e.vnode.dynamicProps;
      for (let f = 0; f < c.length; f++) {
        let m = c[f];
        if (sa(e.emitsOptions, m))
          continue;
        const h = t[m];
        if (r)
          if (Fe(l, m))
            h !== l[m] && (l[m] = h, d = !0);
          else {
            const v = yt(m);
            i[v] = ss(
              r,
              s,
              v,
              h,
              e,
              !1
            );
          }
        else
          h !== l[m] && (l[m] = h, d = !0);
      }
    }
  } else {
    jd(e, t, i, l) && (d = !0);
    let c;
    for (const f in s)
      (!t || // for camelCase
      !Fe(t, f) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((c = uo(f)) === f || !Fe(t, c))) && (r ? n && // for camelCase
      (n[f] !== void 0 || // for kebab-case
      n[c] !== void 0) && (i[f] = ss(
        r,
        s,
        f,
        void 0,
        e,
        !0
      )) : delete i[f]);
    if (l !== s)
      for (const f in l)
        (!t || !Fe(t, f)) && (delete l[f], d = !0);
  }
  d && _n(e.attrs, "set", ""), V.NODE_ENV !== "production" && Ud(t || {}, i, e);
}
function jd(e, t, n, o) {
  const [i, l] = e.propsOptions;
  let a = !1, s;
  if (t)
    for (let r in t) {
      if (bi(r))
        continue;
      const d = t[r];
      let c;
      i && Fe(i, c = yt(r)) ? !l || !l.includes(c) ? n[c] = d : (s || (s = {}))[c] = d : sa(e.emitsOptions, r) || (!(r in o) || d !== o[r]) && (o[r] = d, a = !0);
    }
  if (l) {
    const r = ve(n), d = s || qe;
    for (let c = 0; c < l.length; c++) {
      const f = l[c];
      n[f] = ss(
        i,
        r,
        f,
        d[f],
        e,
        !Fe(d, f)
      );
    }
  }
  return a;
}
function ss(e, t, n, o, i, l) {
  const a = e[n];
  if (a != null) {
    const s = Fe(a, "default");
    if (s && o === void 0) {
      const r = a.default;
      if (a.type !== Function && !a.skipFactory && Te(r)) {
        const { propsDefaults: d } = i;
        if (n in d)
          o = d[n];
        else {
          const c = Yi(i);
          o = d[n] = r.call(
            null,
            t
          ), c();
        }
      } else
        o = r;
      i.ce && i.ce._setProp(n, o);
    }
    a[
      0
      /* shouldCast */
    ] && (l && !s ? o = !1 : a[
      1
      /* shouldCastTrue */
    ] && (o === "" || o === uo(n)) && (o = !0));
  }
  return o;
}
const gg = /* @__PURE__ */ new WeakMap();
function zd(e, t, n = !1) {
  const o = n ? gg : t.propsCache, i = o.get(e);
  if (i)
    return i;
  const l = e.props, a = {}, s = [];
  let r = !1;
  if (!Te(e)) {
    const c = (f) => {
      r = !0;
      const [m, h] = zd(f, t, !0);
      et(a, m), h && s.push(...h);
    };
    !n && t.mixins.length && t.mixins.forEach(c), e.extends && c(e.extends), e.mixins && e.mixins.forEach(c);
  }
  if (!l && !r)
    return Le(e) && o.set(e, Xo), Xo;
  if (_e(l))
    for (let c = 0; c < l.length; c++) {
      V.NODE_ENV !== "production" && !Qe(l[c]) && Z("props must be strings when using array syntax.", l[c]);
      const f = yt(l[c]);
      iu(f) && (a[f] = qe);
    }
  else if (l) {
    V.NODE_ENV !== "production" && !Le(l) && Z("invalid props options", l);
    for (const c in l) {
      const f = yt(c);
      if (iu(f)) {
        const m = l[c], h = a[f] = _e(m) || Te(m) ? { type: m } : et({}, m), v = h.type;
        let g = !1, y = !0;
        if (_e(v))
          for (let w = 0; w < v.length; ++w) {
            const E = v[w], A = Te(E) && E.name;
            if (A === "Boolean") {
              g = !0;
              break;
            } else A === "String" && (y = !1);
          }
        else
          g = Te(v) && v.name === "Boolean";
        h[
          0
          /* shouldCast */
        ] = g, h[
          1
          /* shouldCastTrue */
        ] = y, (g || Fe(h, "default")) && s.push(f);
      }
    }
  }
  const d = [a, s];
  return Le(e) && o.set(e, d), d;
}
function iu(e) {
  return e[0] !== "$" && !bi(e) ? !0 : (V.NODE_ENV !== "production" && Z(`Invalid prop name: "${e}" is a reserved property.`), !1);
}
function yg(e) {
  return e === null ? "null" : typeof e == "function" ? e.name || "" : typeof e == "object" && e.constructor && e.constructor.name || "";
}
function Ud(e, t, n) {
  const o = ve(t), i = n.propsOptions[0], l = Object.keys(e).map((a) => yt(a));
  for (const a in i) {
    let s = i[a];
    s != null && pg(
      a,
      o[a],
      s,
      V.NODE_ENV !== "production" ? kn(o) : o,
      !l.includes(a)
    );
  }
}
function pg(e, t, n, o, i) {
  const { type: l, required: a, validator: s, skipCheck: r } = n;
  if (a && i) {
    Z('Missing required prop: "' + e + '"');
    return;
  }
  if (!(t == null && !a)) {
    if (l != null && l !== !0 && !r) {
      let d = !1;
      const c = _e(l) ? l : [l], f = [];
      for (let m = 0; m < c.length && !d; m++) {
        const { valid: h, expectedType: v } = _g(t, c[m]);
        f.push(v || ""), d = h;
      }
      if (!d) {
        Z(wg(e, t, f));
        return;
      }
    }
    s && !s(t, o) && Z('Invalid prop: custom validator check failed for prop "' + e + '".');
  }
}
const bg = /* @__PURE__ */ qn(
  "String,Number,Boolean,Function,Symbol,BigInt"
);
function _g(e, t) {
  let n;
  const o = yg(t);
  if (o === "null")
    n = e === null;
  else if (bg(o)) {
    const i = typeof e;
    n = i === o.toLowerCase(), !n && i === "object" && (n = e instanceof t);
  } else o === "Object" ? n = Le(e) : o === "Array" ? n = _e(e) : n = e instanceof t;
  return {
    valid: n,
    expectedType: o
  };
}
function wg(e, t, n) {
  if (n.length === 0)
    return `Prop type [] for prop "${e}" won't match anything. Did you mean to use type Array instead?`;
  let o = `Invalid prop: type check failed for prop "${e}". Expected ${n.map(Qt).join(" | ")}`;
  const i = n[0], l = $s(t), a = lu(t, i), s = lu(t, l);
  return n.length === 1 && au(i) && !kg(i, l) && (o += ` with value ${a}`), o += `, got ${l} `, au(l) && (o += `with value ${s}.`), o;
}
function lu(e, t) {
  return t === "String" ? `"${e}"` : t === "Number" ? `${Number(e)}` : `${e}`;
}
function au(e) {
  return ["string", "number", "boolean"].some((n) => e.toLowerCase() === n);
}
function kg(...e) {
  return e.some((t) => t.toLowerCase() === "boolean");
}
const Wd = (e) => e[0] === "_" || e === "$stable", Zs = (e) => _e(e) ? e.map(ln) : [ln(e)], Sg = (e, t, n) => {
  if (t._n)
    return t;
  const o = _((...i) => (V.NODE_ENV !== "production" && mt && (!n || n.root === mt.root) && Z(
    `Slot "${e}" invoked outside of the render function: this will not track dependencies used in the slot. Invoke the slot function inside the render function instead.`
  ), Zs(t(...i))), n);
  return o._c = !1, o;
}, qd = (e, t, n) => {
  const o = e._ctx;
  for (const i in e) {
    if (Wd(i)) continue;
    const l = e[i];
    if (Te(l))
      t[i] = Sg(i, l, o);
    else if (l != null) {
      V.NODE_ENV !== "production" && Z(
        `Non-function value encountered for slot "${i}". Prefer function slots for better performance.`
      );
      const a = Zs(l);
      t[i] = () => a;
    }
  }
}, Kd = (e, t) => {
  V.NODE_ENV !== "production" && !Gi(e.vnode) && Z(
    "Non-function value encountered for default slot. Prefer function slots for better performance."
  );
  const n = Zs(t);
  e.slots.default = () => n;
}, rs = (e, t, n) => {
  for (const o in t)
    (n || o !== "_") && (e[o] = t[o]);
}, Cg = (e, t, n) => {
  const o = e.slots = Rd();
  if (e.vnode.shapeFlag & 32) {
    const i = t._;
    i ? (rs(o, t, n), n && xl(o, "_", i, !0)) : qd(t, o);
  } else t && Kd(e, t);
}, Eg = (e, t, n) => {
  const { vnode: o, slots: i } = e;
  let l = !0, a = qe;
  if (o.shapeFlag & 32) {
    const s = t._;
    s ? V.NODE_ENV !== "production" && sn ? (rs(i, t, n), _n(e, "set", "$slots")) : n && s === 1 ? l = !1 : rs(i, t, n) : (l = !t.$stable, qd(t, i)), a = t;
  } else t && (Kd(e, t), a = { default: 1 });
  if (l)
    for (const s in i)
      !Wd(s) && a[s] == null && delete i[s];
};
let mi, lo;
function Fn(e, t) {
  e.appContext.config.performance && Dl() && lo.mark(`vue-${t}-${e.uid}`), V.NODE_ENV !== "production" && Mh(e, t, Dl() ? lo.now() : Date.now());
}
function Ln(e, t) {
  if (e.appContext.config.performance && Dl()) {
    const n = `vue-${t}-${e.uid}`, o = n + ":end";
    lo.mark(o), lo.measure(
      `<${ca(e, e.type)}> ${t}`,
      n,
      o
    ), lo.clearMarks(n), lo.clearMarks(o);
  }
  V.NODE_ENV !== "production" && Bh(e, t, Dl() ? lo.now() : Date.now());
}
function Dl() {
  return mi !== void 0 || (typeof window < "u" && window.performance ? (mi = !0, lo = window.performance) : mi = !1), mi;
}
function xg() {
  const e = [];
  if (V.NODE_ENV !== "production" && e.length) {
    const t = e.length > 1;
    console.warn(
      `Feature flag${t ? "s" : ""} ${e.join(", ")} ${t ? "are" : "is"} not explicitly defined. You are running the esm-bundler build of Vue, which expects these compile-time feature flags to be globally injected via the bundler config in order to get better tree-shaking in the production bundle.

For more details, see https://link.vuejs.org/feature-flags.`
    );
  }
}
const It = Rg;
function Vg(e) {
  return Ng(e);
}
function Ng(e, t) {
  xg();
  const n = Ui();
  n.__VUE__ = !0, V.NODE_ENV !== "production" && pd(n.__VUE_DEVTOOLS_GLOBAL_HOOK__, n);
  const {
    insert: o,
    remove: i,
    patchProp: l,
    createElement: a,
    createText: s,
    createComment: r,
    setText: d,
    setElementText: c,
    parentNode: f,
    nextSibling: m,
    setScopeId: h = ft,
    insertStaticContent: v
  } = e, g = (b, S, L, Y = null, j = null, z = null, le = void 0, ne = null, te = V.NODE_ENV !== "production" && sn ? !1 : !!S.dynamicChildren) => {
    if (b === S)
      return;
    b && !ko(b, S) && (Y = Pe(b), Ne(b, j, z, !0), b = null), S.patchFlag === -2 && (te = !1, S.dynamicChildren = null);
    const { type: X, ref: Ve, shapeFlag: ae } = S;
    switch (X) {
      case Lo:
        y(b, S, L, Y);
        break;
      case rt:
        w(b, S, L, Y);
        break;
      case yl:
        b == null ? E(S, L, Y, le) : V.NODE_ENV !== "production" && A(b, S, L, le);
        break;
      case Ee:
        D(
          b,
          S,
          L,
          Y,
          j,
          z,
          le,
          ne,
          te
        );
        break;
      default:
        ae & 1 ? x(
          b,
          S,
          L,
          Y,
          j,
          z,
          le,
          ne,
          te
        ) : ae & 6 ? R(
          b,
          S,
          L,
          Y,
          j,
          z,
          le,
          ne,
          te
        ) : ae & 64 || ae & 128 ? X.process(
          b,
          S,
          L,
          Y,
          j,
          z,
          le,
          ne,
          te,
          Et
        ) : V.NODE_ENV !== "production" && Z("Invalid VNode type:", X, `(${typeof X})`);
    }
    Ve != null && j && ns(Ve, b && b.ref, z, S || b, !S);
  }, y = (b, S, L, Y) => {
    if (b == null)
      o(
        S.el = s(S.children),
        L,
        Y
      );
    else {
      const j = S.el = b.el;
      S.children !== b.children && d(j, S.children);
    }
  }, w = (b, S, L, Y) => {
    b == null ? o(
      S.el = r(S.children || ""),
      L,
      Y
    ) : S.el = b.el;
  }, E = (b, S, L, Y) => {
    [b.el, b.anchor] = v(
      b.children,
      S,
      L,
      Y,
      b.el,
      b.anchor
    );
  }, A = (b, S, L, Y) => {
    if (S.children !== b.children) {
      const j = m(b.anchor);
      C(b), [S.el, S.anchor] = v(
        S.children,
        L,
        j,
        Y
      );
    } else
      S.el = b.el, S.anchor = b.anchor;
  }, P = ({ el: b, anchor: S }, L, Y) => {
    let j;
    for (; b && b !== S; )
      j = m(b), o(b, L, Y), b = j;
    o(S, L, Y);
  }, C = ({ el: b, anchor: S }) => {
    let L;
    for (; b && b !== S; )
      L = m(b), i(b), b = L;
    i(S);
  }, x = (b, S, L, Y, j, z, le, ne, te) => {
    S.type === "svg" ? le = "svg" : S.type === "math" && (le = "mathml"), b == null ? I(
      S,
      L,
      Y,
      j,
      z,
      le,
      ne,
      te
    ) : $(
      b,
      S,
      j,
      z,
      le,
      ne,
      te
    );
  }, I = (b, S, L, Y, j, z, le, ne) => {
    let te, X;
    const { props: Ve, shapeFlag: ae, transition: ye, dirs: F } = b;
    if (te = b.el = a(
      b.type,
      z,
      Ve && Ve.is,
      Ve
    ), ae & 8 ? c(te, b.children) : ae & 16 && T(
      b.children,
      te,
      null,
      Y,
      j,
      Ia(b, z),
      le,
      ne
    ), F && ho(b, null, Y, "created"), N(te, b, b.scopeId, le, Y), Ve) {
      for (const xe in Ve)
        xe !== "value" && !bi(xe) && l(te, xe, null, Ve[xe], z, Y);
      "value" in Ve && l(te, "value", null, Ve.value, z), (X = Ve.onVnodeBeforeMount) && pn(X, Y, b);
    }
    V.NODE_ENV !== "production" && (xl(te, "__vnode", b, !0), xl(te, "__vueParentComponent", Y, !0)), F && ho(b, null, Y, "beforeMount");
    const U = Tg(j, ye);
    U && ye.beforeEnter(te), o(te, S, L), ((X = Ve && Ve.onVnodeMounted) || U || F) && It(() => {
      X && pn(X, Y, b), U && ye.enter(te), F && ho(b, null, Y, "mounted");
    }, j);
  }, N = (b, S, L, Y, j) => {
    if (L && h(b, L), Y)
      for (let z = 0; z < Y.length; z++)
        h(b, Y[z]);
    if (j) {
      let z = j.subTree;
      if (V.NODE_ENV !== "production" && z.patchFlag > 0 && z.patchFlag & 2048 && (z = er(z.children) || z), S === z || Zd(z.type) && (z.ssContent === S || z.ssFallback === S)) {
        const le = j.vnode;
        N(
          b,
          le,
          le.scopeId,
          le.slotScopeIds,
          j.parent
        );
      }
    }
  }, T = (b, S, L, Y, j, z, le, ne, te = 0) => {
    for (let X = te; X < b.length; X++) {
      const Ve = b[X] = ne ? io(b[X]) : ln(b[X]);
      g(
        null,
        Ve,
        S,
        L,
        Y,
        j,
        z,
        le,
        ne
      );
    }
  }, $ = (b, S, L, Y, j, z, le) => {
    const ne = S.el = b.el;
    V.NODE_ENV !== "production" && (ne.__vnode = S);
    let { patchFlag: te, dynamicChildren: X, dirs: Ve } = S;
    te |= b.patchFlag & 16;
    const ae = b.props || qe, ye = S.props || qe;
    let F;
    if (L && go(L, !1), (F = ye.onVnodeBeforeUpdate) && pn(F, L, S, b), Ve && ho(S, b, L, "beforeUpdate"), L && go(L, !0), V.NODE_ENV !== "production" && sn && (te = 0, le = !1, X = null), (ae.innerHTML && ye.innerHTML == null || ae.textContent && ye.textContent == null) && c(ne, ""), X ? (O(
      b.dynamicChildren,
      X,
      ne,
      L,
      Y,
      Ia(S, j),
      z
    ), V.NODE_ENV !== "production" && Si(b, S)) : le || B(
      b,
      S,
      ne,
      null,
      L,
      Y,
      Ia(S, j),
      z,
      !1
    ), te > 0) {
      if (te & 16)
        k(ne, ae, ye, L, j);
      else if (te & 2 && ae.class !== ye.class && l(ne, "class", null, ye.class, j), te & 4 && l(ne, "style", ae.style, ye.style, j), te & 8) {
        const U = S.dynamicProps;
        for (let xe = 0; xe < U.length; xe++) {
          const Ce = U[xe], fe = ae[Ce], $e = ye[Ce];
          ($e !== fe || Ce === "value") && l(ne, Ce, fe, $e, j, L);
        }
      }
      te & 1 && b.children !== S.children && c(ne, S.children);
    } else !le && X == null && k(ne, ae, ye, L, j);
    ((F = ye.onVnodeUpdated) || Ve) && It(() => {
      F && pn(F, L, S, b), Ve && ho(S, b, L, "updated");
    }, Y);
  }, O = (b, S, L, Y, j, z, le) => {
    for (let ne = 0; ne < S.length; ne++) {
      const te = b[ne], X = S[ne], Ve = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        te.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (te.type === Ee || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !ko(te, X) || // - In the case of a component, it could contain anything.
        te.shapeFlag & 70) ? f(te.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          L
        )
      );
      g(
        te,
        X,
        Ve,
        null,
        Y,
        j,
        z,
        le,
        !0
      );
    }
  }, k = (b, S, L, Y, j) => {
    if (S !== L) {
      if (S !== qe)
        for (const z in S)
          !bi(z) && !(z in L) && l(
            b,
            z,
            S[z],
            null,
            j,
            Y
          );
      for (const z in L) {
        if (bi(z)) continue;
        const le = L[z], ne = S[z];
        le !== ne && z !== "value" && l(b, z, ne, le, j, Y);
      }
      "value" in L && l(b, "value", S.value, L.value, j);
    }
  }, D = (b, S, L, Y, j, z, le, ne, te) => {
    const X = S.el = b ? b.el : s(""), Ve = S.anchor = b ? b.anchor : s("");
    let { patchFlag: ae, dynamicChildren: ye, slotScopeIds: F } = S;
    V.NODE_ENV !== "production" && // #5523 dev root fragment may inherit directives
    (sn || ae & 2048) && (ae = 0, te = !1, ye = null), F && (ne = ne ? ne.concat(F) : F), b == null ? (o(X, L, Y), o(Ve, L, Y), T(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      S.children || [],
      L,
      Ve,
      j,
      z,
      le,
      ne,
      te
    )) : ae > 0 && ae & 64 && ye && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    b.dynamicChildren ? (O(
      b.dynamicChildren,
      ye,
      L,
      j,
      z,
      le,
      ne
    ), V.NODE_ENV !== "production" ? Si(b, S) : (
      // #2080 if the stable fragment has a key, it's a <template v-for> that may
      //  get moved around. Make sure all root level vnodes inherit el.
      // #2134 or if it's a component root, it may also get moved around
      // as the component is being moved.
      (S.key != null || j && S === j.subTree) && Si(
        b,
        S,
        !0
        /* shallow */
      )
    )) : B(
      b,
      S,
      L,
      Ve,
      j,
      z,
      le,
      ne,
      te
    );
  }, R = (b, S, L, Y, j, z, le, ne, te) => {
    S.slotScopeIds = ne, b == null ? S.shapeFlag & 512 ? j.ctx.activate(
      S,
      L,
      Y,
      le,
      te
    ) : G(
      S,
      L,
      Y,
      j,
      z,
      le,
      te
    ) : re(b, S, te);
  }, G = (b, S, L, Y, j, z, le) => {
    const ne = b.component = qg(
      b,
      Y,
      j
    );
    if (V.NODE_ENV !== "production" && ne.type.__hmrId && Vh(ne), V.NODE_ENV !== "production" && (ml(b), Fn(ne, "mount")), Gi(b) && (ne.ctx.renderer = Et), V.NODE_ENV !== "production" && Fn(ne, "init"), Gg(ne, !1, le), V.NODE_ENV !== "production" && Ln(ne, "init"), ne.asyncDep) {
      if (V.NODE_ENV !== "production" && sn && (b.el = null), j && j.registerDep(ne, oe, le), !b.el) {
        const te = ne.subTree = u(rt);
        w(null, te, S, L);
      }
    } else
      oe(
        ne,
        b,
        S,
        L,
        j,
        z,
        le
      );
    V.NODE_ENV !== "production" && (vl(), Ln(ne, "mount"));
  }, re = (b, S, L) => {
    const Y = S.component = b.component;
    if (Fg(b, S, L))
      if (Y.asyncDep && !Y.asyncResolved) {
        V.NODE_ENV !== "production" && ml(S), ee(Y, S, L), V.NODE_ENV !== "production" && vl();
        return;
      } else
        Y.next = S, Y.update();
    else
      S.el = b.el, Y.vnode = S;
  }, oe = (b, S, L, Y, j, z, le) => {
    const ne = () => {
      if (b.isMounted) {
        let { next: ae, bu: ye, u: F, parent: U, vnode: xe } = b;
        {
          const st = Gd(b);
          if (st) {
            ae && (ae.el = xe.el, ee(b, ae, le)), st.asyncDep.then(() => {
              b.isUnmounted || ne();
            });
            return;
          }
        }
        let Ce = ae, fe;
        V.NODE_ENV !== "production" && ml(ae || b.vnode), go(b, !1), ae ? (ae.el = xe.el, ee(b, ae, le)) : ae = xe, ye && Wo(ye), (fe = ae.props && ae.props.onVnodeBeforeUpdate) && pn(fe, U, ae, xe), go(b, !0), V.NODE_ENV !== "production" && Fn(b, "render");
        const $e = Pa(b);
        V.NODE_ENV !== "production" && Ln(b, "render");
        const it = b.subTree;
        b.subTree = $e, V.NODE_ENV !== "production" && Fn(b, "patch"), g(
          it,
          $e,
          // parent may have changed if it's in a teleport
          f(it.el),
          // anchor may have changed if it's in a fragment
          Pe(it),
          b,
          j,
          z
        ), V.NODE_ENV !== "production" && Ln(b, "patch"), ae.el = $e.el, Ce === null && Lg(b, $e.el), F && It(F, j), (fe = ae.props && ae.props.onVnodeUpdated) && It(
          () => pn(fe, U, ae, xe),
          j
        ), V.NODE_ENV !== "production" && bd(b), V.NODE_ENV !== "production" && vl();
      } else {
        let ae;
        const { el: ye, props: F } = S, { bm: U, m: xe, parent: Ce, root: fe, type: $e } = b, it = ki(S);
        if (go(b, !1), U && Wo(U), !it && (ae = F && F.onVnodeBeforeMount) && pn(ae, Ce, S), go(b, !0), ye && yn) {
          const st = () => {
            V.NODE_ENV !== "production" && Fn(b, "render"), b.subTree = Pa(b), V.NODE_ENV !== "production" && Ln(b, "render"), V.NODE_ENV !== "production" && Fn(b, "hydrate"), yn(
              ye,
              b.subTree,
              b,
              j,
              null
            ), V.NODE_ENV !== "production" && Ln(b, "hydrate");
          };
          it && $e.__asyncHydrate ? $e.__asyncHydrate(
            ye,
            b,
            st
          ) : st();
        } else {
          fe.ce && fe.ce._injectChildStyle($e), V.NODE_ENV !== "production" && Fn(b, "render");
          const st = b.subTree = Pa(b);
          V.NODE_ENV !== "production" && Ln(b, "render"), V.NODE_ENV !== "production" && Fn(b, "patch"), g(
            null,
            st,
            L,
            Y,
            b,
            j,
            z
          ), V.NODE_ENV !== "production" && Ln(b, "patch"), S.el = st.el;
        }
        if (xe && It(xe, j), !it && (ae = F && F.onVnodeMounted)) {
          const st = S;
          It(
            () => pn(ae, Ce, st),
            j
          );
        }
        (S.shapeFlag & 256 || Ce && ki(Ce.vnode) && Ce.vnode.shapeFlag & 256) && b.a && It(b.a, j), b.isMounted = !0, V.NODE_ENV !== "production" && Ph(b), S = L = Y = null;
      }
    };
    b.scope.on();
    const te = b.effect = new Wc(ne);
    b.scope.off();
    const X = b.update = te.run.bind(te), Ve = b.job = te.runIfDirty.bind(te);
    Ve.i = b, Ve.id = b.uid, te.scheduler = () => la(Ve), go(b, !0), V.NODE_ENV !== "production" && (te.onTrack = b.rtc ? (ae) => Wo(b.rtc, ae) : void 0, te.onTrigger = b.rtg ? (ae) => Wo(b.rtg, ae) : void 0), X();
  }, ee = (b, S, L) => {
    S.component = b;
    const Y = b.vnode.props;
    b.vnode = S, b.next = null, hg(b, S.props, Y, L), Eg(b, S.children, L), Kn(), Gr(b), Gn();
  }, B = (b, S, L, Y, j, z, le, ne, te = !1) => {
    const X = b && b.children, Ve = b ? b.shapeFlag : 0, ae = S.children, { patchFlag: ye, shapeFlag: F } = S;
    if (ye > 0) {
      if (ye & 128) {
        H(
          X,
          ae,
          L,
          Y,
          j,
          z,
          le,
          ne,
          te
        );
        return;
      } else if (ye & 256) {
        M(
          X,
          ae,
          L,
          Y,
          j,
          z,
          le,
          ne,
          te
        );
        return;
      }
    }
    F & 8 ? (Ve & 16 && ke(X, j, z), ae !== X && c(L, ae)) : Ve & 16 ? F & 16 ? H(
      X,
      ae,
      L,
      Y,
      j,
      z,
      le,
      ne,
      te
    ) : ke(X, j, z, !0) : (Ve & 8 && c(L, ""), F & 16 && T(
      ae,
      L,
      Y,
      j,
      z,
      le,
      ne,
      te
    ));
  }, M = (b, S, L, Y, j, z, le, ne, te) => {
    b = b || Xo, S = S || Xo;
    const X = b.length, Ve = S.length, ae = Math.min(X, Ve);
    let ye;
    for (ye = 0; ye < ae; ye++) {
      const F = S[ye] = te ? io(S[ye]) : ln(S[ye]);
      g(
        b[ye],
        F,
        L,
        null,
        j,
        z,
        le,
        ne,
        te
      );
    }
    X > Ve ? ke(
      b,
      j,
      z,
      !0,
      !1,
      ae
    ) : T(
      S,
      L,
      Y,
      j,
      z,
      le,
      ne,
      te,
      ae
    );
  }, H = (b, S, L, Y, j, z, le, ne, te) => {
    let X = 0;
    const Ve = S.length;
    let ae = b.length - 1, ye = Ve - 1;
    for (; X <= ae && X <= ye; ) {
      const F = b[X], U = S[X] = te ? io(S[X]) : ln(S[X]);
      if (ko(F, U))
        g(
          F,
          U,
          L,
          null,
          j,
          z,
          le,
          ne,
          te
        );
      else
        break;
      X++;
    }
    for (; X <= ae && X <= ye; ) {
      const F = b[ae], U = S[ye] = te ? io(S[ye]) : ln(S[ye]);
      if (ko(F, U))
        g(
          F,
          U,
          L,
          null,
          j,
          z,
          le,
          ne,
          te
        );
      else
        break;
      ae--, ye--;
    }
    if (X > ae) {
      if (X <= ye) {
        const F = ye + 1, U = F < Ve ? S[F].el : Y;
        for (; X <= ye; )
          g(
            null,
            S[X] = te ? io(S[X]) : ln(S[X]),
            L,
            U,
            j,
            z,
            le,
            ne,
            te
          ), X++;
      }
    } else if (X > ye)
      for (; X <= ae; )
        Ne(b[X], j, z, !0), X++;
    else {
      const F = X, U = X, xe = /* @__PURE__ */ new Map();
      for (X = U; X <= ye; X++) {
        const ut = S[X] = te ? io(S[X]) : ln(S[X]);
        ut.key != null && (V.NODE_ENV !== "production" && xe.has(ut.key) && Z(
          "Duplicate keys found during update:",
          JSON.stringify(ut.key),
          "Make sure keys are unique."
        ), xe.set(ut.key, X));
      }
      let Ce, fe = 0;
      const $e = ye - U + 1;
      let it = !1, st = 0;
      const vt = new Array($e);
      for (X = 0; X < $e; X++) vt[X] = 0;
      for (X = F; X <= ae; X++) {
        const ut = b[X];
        if (fe >= $e) {
          Ne(ut, j, z, !0);
          continue;
        }
        let Mt;
        if (ut.key != null)
          Mt = xe.get(ut.key);
        else
          for (Ce = U; Ce <= ye; Ce++)
            if (vt[Ce - U] === 0 && ko(ut, S[Ce])) {
              Mt = Ce;
              break;
            }
        Mt === void 0 ? Ne(ut, j, z, !0) : (vt[Mt - U] = X + 1, Mt >= st ? st = Mt : it = !0, g(
          ut,
          S[Mt],
          L,
          null,
          j,
          z,
          le,
          ne,
          te
        ), fe++);
      }
      const Yt = it ? Og(vt) : Xo;
      for (Ce = Yt.length - 1, X = $e - 1; X >= 0; X--) {
        const ut = U + X, Mt = S[ut], mo = ut + 1 < Ve ? S[ut + 1].el : Y;
        vt[X] === 0 ? g(
          null,
          Mt,
          L,
          mo,
          j,
          z,
          le,
          ne,
          te
        ) : it && (Ce < 0 || X !== Yt[Ce] ? K(Mt, L, mo, 2) : Ce--);
      }
    }
  }, K = (b, S, L, Y, j = null) => {
    const { el: z, type: le, transition: ne, children: te, shapeFlag: X } = b;
    if (X & 6) {
      K(b.component.subTree, S, L, Y);
      return;
    }
    if (X & 128) {
      b.suspense.move(S, L, Y);
      return;
    }
    if (X & 64) {
      le.move(b, S, L, Et);
      return;
    }
    if (le === Ee) {
      o(z, S, L);
      for (let ae = 0; ae < te.length; ae++)
        K(te[ae], S, L, Y);
      o(b.anchor, S, L);
      return;
    }
    if (le === yl) {
      P(b, S, L);
      return;
    }
    if (Y !== 2 && X & 1 && ne)
      if (Y === 0)
        ne.beforeEnter(z), o(z, S, L), It(() => ne.enter(z), j);
      else {
        const { leave: ae, delayLeave: ye, afterLeave: F } = ne, U = () => o(z, S, L), xe = () => {
          ae(z, () => {
            U(), F && F();
          });
        };
        ye ? ye(z, U, xe) : xe();
      }
    else
      o(z, S, L);
  }, Ne = (b, S, L, Y = !1, j = !1) => {
    const {
      type: z,
      props: le,
      ref: ne,
      children: te,
      dynamicChildren: X,
      shapeFlag: Ve,
      patchFlag: ae,
      dirs: ye,
      cacheIndex: F
    } = b;
    if (ae === -2 && (j = !1), ne != null && ns(ne, null, L, b, !0), F != null && (S.renderCache[F] = void 0), Ve & 256) {
      S.ctx.deactivate(b);
      return;
    }
    const U = Ve & 1 && ye, xe = !ki(b);
    let Ce;
    if (xe && (Ce = le && le.onVnodeBeforeUnmount) && pn(Ce, S, b), Ve & 6)
      J(b.component, L, Y);
    else {
      if (Ve & 128) {
        b.suspense.unmount(L, Y);
        return;
      }
      U && ho(b, null, S, "beforeUnmount"), Ve & 64 ? b.type.remove(
        b,
        S,
        L,
        Et,
        Y
      ) : X && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !X.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (z !== Ee || ae > 0 && ae & 64) ? ke(
        X,
        S,
        L,
        !1,
        !0
      ) : (z === Ee && ae & 384 || !j && Ve & 16) && ke(te, S, L), Y && we(b);
    }
    (xe && (Ce = le && le.onVnodeUnmounted) || U) && It(() => {
      Ce && pn(Ce, S, b), U && ho(b, null, S, "unmounted");
    }, L);
  }, we = (b) => {
    const { type: S, el: L, anchor: Y, transition: j } = b;
    if (S === Ee) {
      V.NODE_ENV !== "production" && b.patchFlag > 0 && b.patchFlag & 2048 && j && !j.persisted ? b.children.forEach((le) => {
        le.type === rt ? i(le.el) : we(le);
      }) : Ie(L, Y);
      return;
    }
    if (S === yl) {
      C(b);
      return;
    }
    const z = () => {
      i(L), j && !j.persisted && j.afterLeave && j.afterLeave();
    };
    if (b.shapeFlag & 1 && j && !j.persisted) {
      const { leave: le, delayLeave: ne } = j, te = () => le(L, z);
      ne ? ne(b.el, z, te) : te();
    } else
      z();
  }, Ie = (b, S) => {
    let L;
    for (; b !== S; )
      L = m(b), i(b), b = L;
    i(S);
  }, J = (b, S, L) => {
    V.NODE_ENV !== "production" && b.type.__hmrId && Nh(b);
    const { bum: Y, scope: j, job: z, subTree: le, um: ne, m: te, a: X } = b;
    su(te), su(X), Y && Wo(Y), j.stop(), z && (z.flags |= 8, Ne(le, b, S, L)), ne && It(ne, S), It(() => {
      b.isUnmounted = !0;
    }, S), S && S.pendingBranch && !S.isUnmounted && b.asyncDep && !b.asyncResolved && b.suspenseId === S.pendingId && (S.deps--, S.deps === 0 && S.resolve()), V.NODE_ENV !== "production" && $h(b);
  }, ke = (b, S, L, Y = !1, j = !1, z = 0) => {
    for (let le = z; le < b.length; le++)
      Ne(b[le], S, L, Y, j);
  }, Pe = (b) => {
    if (b.shapeFlag & 6)
      return Pe(b.component.subTree);
    if (b.shapeFlag & 128)
      return b.suspense.next();
    const S = m(b.anchor || b.el), L = S && S[Sd];
    return L ? m(L) : S;
  };
  let Xe = !1;
  const Me = (b, S, L) => {
    b == null ? S._vnode && Ne(S._vnode, null, null, !0) : g(
      S._vnode || null,
      b,
      S,
      null,
      null,
      null,
      L
    ), S._vnode = b, Xe || (Xe = !0, Gr(), hd(), Xe = !1);
  }, Et = {
    p: g,
    um: Ne,
    m: K,
    r: we,
    mt: G,
    mc: T,
    pc: B,
    pbc: O,
    n: Pe,
    o: e
  };
  let nn, yn;
  return {
    render: Me,
    hydrate: nn,
    createApp: fg(Me, nn)
  };
}
function Ia({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function go({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Tg(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function Si(e, t, n = !1) {
  const o = e.children, i = t.children;
  if (_e(o) && _e(i))
    for (let l = 0; l < o.length; l++) {
      const a = o[l];
      let s = i[l];
      s.shapeFlag & 1 && !s.dynamicChildren && ((s.patchFlag <= 0 || s.patchFlag === 32) && (s = i[l] = io(i[l]), s.el = a.el), !n && s.patchFlag !== -2 && Si(a, s)), s.type === Lo && (s.el = a.el), V.NODE_ENV !== "production" && s.type === rt && !s.el && (s.el = a.el);
    }
}
function Og(e) {
  const t = e.slice(), n = [0];
  let o, i, l, a, s;
  const r = e.length;
  for (o = 0; o < r; o++) {
    const d = e[o];
    if (d !== 0) {
      if (i = n[n.length - 1], e[i] < d) {
        t[o] = i, n.push(o);
        continue;
      }
      for (l = 0, a = n.length - 1; l < a; )
        s = l + a >> 1, e[n[s]] < d ? l = s + 1 : a = s;
      d < e[n[l]] && (l > 0 && (t[o] = n[l - 1]), n[l] = o);
    }
  }
  for (l = n.length, a = n[l - 1]; l-- > 0; )
    n[l] = a, a = t[a];
  return n;
}
function Gd(e) {
  const t = e.subTree.component;
  if (t)
    return t.asyncDep && !t.asyncResolved ? t : Gd(t);
}
function su(e) {
  if (e)
    for (let t = 0; t < e.length; t++)
      e[t].flags |= 8;
}
const Ag = Symbol.for("v-scx"), Ig = () => {
  {
    const e = Ge(Ag);
    return e || V.NODE_ENV !== "production" && Z(
      "Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build."
    ), e;
  }
};
function Ut(e, t) {
  return Qs(e, null, t);
}
function ge(e, t, n) {
  return V.NODE_ENV !== "production" && !Te(t) && Z(
    "`watch(fn, options?)` signature has been moved to a separate API. Use `watchEffect(fn, options?)` instead. `watch` now only supports `watch(source, cb, options?) signature."
  ), Qs(e, t, n);
}
function Qs(e, t, n = qe) {
  const { immediate: o, deep: i, flush: l, once: a } = n;
  V.NODE_ENV !== "production" && !t && (o !== void 0 && Z(
    'watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.'
  ), i !== void 0 && Z(
    'watch() "deep" option is only respected when using the watch(source, callback, options?) signature.'
  ), a !== void 0 && Z(
    'watch() "once" option is only respected when using the watch(source, callback, options?) signature.'
  ));
  const s = et({}, n);
  V.NODE_ENV !== "production" && (s.onWarn = Z);
  const r = t && o || !t && l !== "post";
  let d;
  if (Ii) {
    if (l === "sync") {
      const h = Ig();
      d = h.__watcherHandles || (h.__watcherHandles = []);
    } else if (!r) {
      const h = () => {
      };
      return h.stop = ft, h.resume = ft, h.pause = ft, h;
    }
  }
  const c = mt;
  s.call = (h, v, g) => fn(h, c, v, g);
  let f = !1;
  l === "post" ? s.scheduler = (h) => {
    It(h, c && c.suspense);
  } : l !== "sync" && (f = !0, s.scheduler = (h, v) => {
    v ? h() : la(h);
  }), s.augmentJob = (h) => {
    t && (h.flags |= 4), f && (h.flags |= 2, c && (h.id = c.uid, h.i = c));
  };
  const m = ph(e, t, s);
  return Ii && (d ? d.push(m) : r && m()), m;
}
function Pg(e, t, n) {
  const o = this.proxy, i = Qe(e) ? e.includes(".") ? Yd(o, e) : () => o[e] : e.bind(o, o);
  let l;
  Te(t) ? l = t : (l = t.handler, n = t);
  const a = Yi(this), s = Qs(i, l.bind(o), n);
  return a(), s;
}
function Yd(e, t) {
  const n = t.split(".");
  return () => {
    let o = e;
    for (let i = 0; i < n.length && o; i++)
      o = o[n[i]];
    return o;
  };
}
const Dg = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${yt(t)}Modifiers`] || e[`${uo(t)}Modifiers`];
function $g(e, t, ...n) {
  if (e.isUnmounted) return;
  const o = e.vnode.props || qe;
  if (V.NODE_ENV !== "production") {
    const {
      emitsOptions: c,
      propsOptions: [f]
    } = e;
    if (c)
      if (!(t in c))
        (!f || !(_o(yt(t)) in f)) && Z(
          `Component emitted event "${t}" but it is neither declared in the emits option nor as an "${_o(yt(t))}" prop.`
        );
      else {
        const m = c[t];
        Te(m) && (m(...n) || Z(
          `Invalid event arguments: event validation failed for event "${t}".`
        ));
      }
  }
  let i = n;
  const l = t.startsWith("update:"), a = l && Dg(o, t.slice(7));
  if (a && (a.trim && (i = n.map((c) => Qe(c) ? c.trim() : c)), a.number && (i = n.map(Vl))), V.NODE_ENV !== "production" && Fh(e, t, i), V.NODE_ENV !== "production") {
    const c = t.toLowerCase();
    c !== t && o[_o(c)] && Z(
      `Event "${c}" is emitted in component ${ca(
        e,
        e.type
      )} but the handler is registered for "${t}". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "${uo(
        t
      )}" instead of "${t}".`
    );
  }
  let s, r = o[s = _o(t)] || // also try camelCase event handler (#2249)
  o[s = _o(yt(t))];
  !r && l && (r = o[s = _o(uo(t))]), r && fn(
    r,
    e,
    6,
    i
  );
  const d = o[s + "Once"];
  if (d) {
    if (!e.emitted)
      e.emitted = {};
    else if (e.emitted[s])
      return;
    e.emitted[s] = !0, fn(
      d,
      e,
      6,
      i
    );
  }
}
function Xd(e, t, n = !1) {
  const o = t.emitsCache, i = o.get(e);
  if (i !== void 0)
    return i;
  const l = e.emits;
  let a = {}, s = !1;
  if (!Te(e)) {
    const r = (d) => {
      const c = Xd(d, t, !0);
      c && (s = !0, et(a, c));
    };
    !n && t.mixins.length && t.mixins.forEach(r), e.extends && r(e.extends), e.mixins && e.mixins.forEach(r);
  }
  return !l && !s ? (Le(e) && o.set(e, null), null) : (_e(l) ? l.forEach((r) => a[r] = null) : et(a, l), Le(e) && o.set(e, a), a);
}
function sa(e, t) {
  return !e || !ji(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), Fe(e, t[0].toLowerCase() + t.slice(1)) || Fe(e, uo(t)) || Fe(e, t));
}
let us = !1;
function $l() {
  us = !0;
}
function Pa(e) {
  const {
    type: t,
    vnode: n,
    proxy: o,
    withProxy: i,
    propsOptions: [l],
    slots: a,
    attrs: s,
    emit: r,
    render: d,
    renderCache: c,
    props: f,
    data: m,
    setupState: h,
    ctx: v,
    inheritAttrs: g
  } = e, y = Il(e);
  let w, E;
  V.NODE_ENV !== "production" && (us = !1);
  try {
    if (n.shapeFlag & 4) {
      const C = i || o, x = V.NODE_ENV !== "production" && h.__isScriptSetup ? new Proxy(C, {
        get(I, N, T) {
          return Z(
            `Property '${String(
              N
            )}' was accessed via 'this'. Avoid using 'this' in templates.`
          ), Reflect.get(I, N, T);
        }
      }) : C;
      w = ln(
        d.call(
          x,
          C,
          c,
          V.NODE_ENV !== "production" ? kn(f) : f,
          h,
          m,
          v
        )
      ), E = s;
    } else {
      const C = t;
      V.NODE_ENV !== "production" && s === f && $l(), w = ln(
        C.length > 1 ? C(
          V.NODE_ENV !== "production" ? kn(f) : f,
          V.NODE_ENV !== "production" ? {
            get attrs() {
              return $l(), kn(s);
            },
            slots: a,
            emit: r
          } : { attrs: s, slots: a, emit: r }
        ) : C(
          V.NODE_ENV !== "production" ? kn(f) : f,
          null
        )
      ), E = t.props ? s : Mg(s);
    }
  } catch (C) {
    Ci.length = 0, qi(C, e, 1), w = u(rt);
  }
  let A = w, P;
  if (V.NODE_ENV !== "production" && w.patchFlag > 0 && w.patchFlag & 2048 && ([A, P] = Jd(w)), E && g !== !1) {
    const C = Object.keys(E), { shapeFlag: x } = A;
    if (C.length) {
      if (x & 7)
        l && C.some(El) && (E = Bg(
          E,
          l
        )), A = mn(A, E, !1, !0);
      else if (V.NODE_ENV !== "production" && !us && A.type !== rt) {
        const I = Object.keys(s), N = [], T = [];
        for (let $ = 0, O = I.length; $ < O; $++) {
          const k = I[$];
          ji(k) ? El(k) || N.push(k[2].toLowerCase() + k.slice(3)) : T.push(k);
        }
        T.length && Z(
          `Extraneous non-props attributes (${T.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes.`
        ), N.length && Z(
          `Extraneous non-emits event listeners (${N.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.`
        );
      }
    }
  }
  return n.dirs && (V.NODE_ENV !== "production" && !ru(A) && Z(
    "Runtime directive used on component with non-element root node. The directives will not function as intended."
  ), A = mn(A, null, !1, !0), A.dirs = A.dirs ? A.dirs.concat(n.dirs) : n.dirs), n.transition && (V.NODE_ENV !== "production" && !ru(A) && Z(
    "Component inside <Transition> renders non-element root node that cannot be animated."
  ), $o(A, n.transition)), V.NODE_ENV !== "production" && P ? P(A) : w = A, Il(y), w;
}
const Jd = (e) => {
  const t = e.children, n = e.dynamicChildren, o = er(t, !1);
  if (o) {
    if (V.NODE_ENV !== "production" && o.patchFlag > 0 && o.patchFlag & 2048)
      return Jd(o);
  } else return [e, void 0];
  const i = t.indexOf(o), l = n ? n.indexOf(o) : -1, a = (s) => {
    t[i] = s, n && (l > -1 ? n[l] = s : s.patchFlag > 0 && (e.dynamicChildren = [...n, s]));
  };
  return [ln(o), a];
};
function er(e, t = !0) {
  let n;
  for (let o = 0; o < e.length; o++) {
    const i = e[o];
    if (Mo(i)) {
      if (i.type !== rt || i.children === "v-if") {
        if (n)
          return;
        if (n = i, V.NODE_ENV !== "production" && t && n.patchFlag > 0 && n.patchFlag & 2048)
          return er(n.children);
      }
    } else
      return;
  }
  return n;
}
const Mg = (e) => {
  let t;
  for (const n in e)
    (n === "class" || n === "style" || ji(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, Bg = (e, t) => {
  const n = {};
  for (const o in e)
    (!El(o) || !(o.slice(9) in t)) && (n[o] = e[o]);
  return n;
}, ru = (e) => e.shapeFlag & 7 || e.type === rt;
function Fg(e, t, n) {
  const { props: o, children: i, component: l } = e, { props: a, children: s, patchFlag: r } = t, d = l.emitsOptions;
  if (V.NODE_ENV !== "production" && (i || s) && sn || t.dirs || t.transition)
    return !0;
  if (n && r >= 0) {
    if (r & 1024)
      return !0;
    if (r & 16)
      return o ? uu(o, a, d) : !!a;
    if (r & 8) {
      const c = t.dynamicProps;
      for (let f = 0; f < c.length; f++) {
        const m = c[f];
        if (a[m] !== o[m] && !sa(d, m))
          return !0;
      }
    }
  } else
    return (i || s) && (!s || !s.$stable) ? !0 : o === a ? !1 : o ? a ? uu(o, a, d) : !0 : !!a;
  return !1;
}
function uu(e, t, n) {
  const o = Object.keys(t);
  if (o.length !== Object.keys(e).length)
    return !0;
  for (let i = 0; i < o.length; i++) {
    const l = o[i];
    if (t[l] !== e[l] && !sa(n, l))
      return !0;
  }
  return !1;
}
function Lg({ vnode: e, parent: t }, n) {
  for (; t; ) {
    const o = t.subTree;
    if (o.suspense && o.suspense.activeBranch === e && (o.el = e.el), o === e)
      (e = t.vnode).el = n, t = t.parent;
    else
      break;
  }
}
const Zd = (e) => e.__isSuspense;
function Rg(e, t) {
  t && t.pendingBranch ? _e(e) ? t.effects.push(...e) : t.effects.push(e) : vd(e);
}
const Ee = Symbol.for("v-fgt"), Lo = Symbol.for("v-txt"), rt = Symbol.for("v-cmt"), yl = Symbol.for("v-stc"), Ci = [];
let Rt = null;
function Q(e = !1) {
  Ci.push(Rt = e ? null : []);
}
function Hg() {
  Ci.pop(), Rt = Ci[Ci.length - 1] || null;
}
let Ai = 1;
function cu(e) {
  Ai += e, e < 0 && Rt && (Rt.hasOnce = !0);
}
function Qd(e) {
  return e.dynamicChildren = Ai > 0 ? Rt || Xo : null, Hg(), Ai > 0 && Rt && Rt.push(e), e;
}
function Re(e, t, n, o, i, l) {
  return Qd(
    ue(
      e,
      t,
      n,
      o,
      i,
      l,
      !0
    )
  );
}
function me(e, t, n, o, i) {
  return Qd(
    u(
      e,
      t,
      n,
      o,
      i,
      !0
    )
  );
}
function Mo(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function ko(e, t) {
  if (V.NODE_ENV !== "production" && t.shapeFlag & 6 && e.component) {
    const n = hl.get(t.type);
    if (n && n.has(e.component))
      return e.shapeFlag &= -257, t.shapeFlag &= -513, !1;
  }
  return e.type === t.type && e.key === t.key;
}
const jg = (...e) => tf(
  ...e
), ef = ({ key: e }) => e ?? null, pl = ({
  ref: e,
  ref_key: t,
  ref_for: n
}) => (typeof e == "number" && (e = "" + e), e != null ? Qe(e) || Je(e) || Te(e) ? { i: wt, r: e, k: t, f: !!n } : e : null);
function ue(e, t = null, n = null, o = 0, i = null, l = e === Ee ? 0 : 1, a = !1, s = !1) {
  const r = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && ef(t),
    ref: t && pl(t),
    scopeId: wd,
    slotScopeIds: null,
    children: n,
    component: null,
    suspense: null,
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null,
    anchor: null,
    target: null,
    targetStart: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag: l,
    patchFlag: o,
    dynamicProps: i,
    dynamicChildren: null,
    appContext: null,
    ctx: wt
  };
  return s ? (tr(r, n), l & 128 && e.normalize(r)) : n && (r.shapeFlag |= Qe(n) ? 8 : 16), V.NODE_ENV !== "production" && r.key !== r.key && Z("VNode created with invalid key (NaN). VNode type:", r.type), Ai > 0 && // avoid a block node from tracking itself
  !a && // has current parent block
  Rt && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (r.patchFlag > 0 || l & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  r.patchFlag !== 32 && Rt.push(r), r;
}
const u = V.NODE_ENV !== "production" ? jg : tf;
function tf(e, t = null, n = null, o = 0, i = null, l = !1) {
  if ((!e || e === eg) && (V.NODE_ENV !== "production" && !e && Z(`Invalid vnode type when creating vnode: ${e}.`), e = rt), Mo(e)) {
    const s = mn(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return n && tr(s, n), Ai > 0 && !l && Rt && (s.shapeFlag & 6 ? Rt[Rt.indexOf(e)] = s : Rt.push(s)), s.patchFlag = -2, s;
  }
  if (af(e) && (e = e.__vccOpts), t) {
    t = zg(t);
    let { class: s, style: r } = t;
    s && !Qe(s) && (t.class = rn(s)), Le(r) && (Ni(r) && !_e(r) && (r = et({}, r)), t.style = on(r));
  }
  const a = Qe(e) ? 1 : Zd(e) ? 128 : Cd(e) ? 64 : Le(e) ? 4 : Te(e) ? 2 : 0;
  return V.NODE_ENV !== "production" && a & 4 && Ni(e) && (e = ve(e), Z(
    "Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with `markRaw` or using `shallowRef` instead of `ref`.",
    `
Component that was made reactive: `,
    e
  )), ue(
    e,
    t,
    n,
    o,
    i,
    a,
    l,
    !0
  );
}
function zg(e) {
  return e ? Ni(e) || Hd(e) ? et({}, e) : e : null;
}
function mn(e, t, n = !1, o = !1) {
  const { props: i, ref: l, patchFlag: a, children: s, transition: r } = e, d = t ? be(i || {}, t) : i, c = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: d,
    key: d && ef(d),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      n && l ? _e(l) ? l.concat(pl(t)) : [l, pl(t)] : pl(t)
    ) : l,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: V.NODE_ENV !== "production" && a === -1 && _e(s) ? s.map(nf) : s,
    target: e.target,
    targetStart: e.targetStart,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: t && e.type !== Ee ? a === -1 ? 16 : a | 16 : a,
    dynamicProps: e.dynamicProps,
    dynamicChildren: e.dynamicChildren,
    appContext: e.appContext,
    dirs: e.dirs,
    transition: r,
    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: e.component,
    suspense: e.suspense,
    ssContent: e.ssContent && mn(e.ssContent),
    ssFallback: e.ssFallback && mn(e.ssFallback),
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return r && o && $o(
    c,
    r.clone(c)
  ), c;
}
function nf(e) {
  const t = mn(e);
  return _e(e.children) && (t.children = e.children.map(nf)), t;
}
function q(e = " ", t = 0) {
  return u(Lo, null, e, t);
}
function We(e = "", t = !1) {
  return t ? (Q(), me(rt, null, e)) : u(rt, null, e);
}
function ln(e) {
  return e == null || typeof e == "boolean" ? u(rt) : _e(e) ? u(
    Ee,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : Mo(e) ? io(e) : u(Lo, null, String(e));
}
function io(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : mn(e);
}
function tr(e, t) {
  let n = 0;
  const { shapeFlag: o } = e;
  if (t == null)
    t = null;
  else if (_e(t))
    n = 16;
  else if (typeof t == "object")
    if (o & 65) {
      const i = t.default;
      i && (i._c && (i._d = !1), tr(e, i()), i._c && (i._d = !0));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !Hd(t) ? t._ctx = wt : i === 3 && wt && (wt.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else Te(t) ? (t = { default: t, _ctx: wt }, n = 32) : (t = String(t), o & 64 ? (n = 16, t = [q(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function be(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    for (const i in o)
      if (i === "class")
        t.class !== o.class && (t.class = rn([t.class, o.class]));
      else if (i === "style")
        t.style = on([t.style, o.style]);
      else if (ji(i)) {
        const l = t[i], a = o[i];
        a && l !== a && !(_e(l) && l.includes(a)) && (t[i] = l ? [].concat(l, a) : a);
      } else i !== "" && (t[i] = o[i]);
  }
  return t;
}
function pn(e, t, n, o = null) {
  fn(e, t, 7, [
    n,
    o
  ]);
}
const Ug = Fd();
let Wg = 0;
function qg(e, t, n) {
  const o = e.type, i = (t ? t.appContext : e.appContext) || Ug, l = {
    uid: Wg++,
    vnode: e,
    type: o,
    parent: t,
    appContext: i,
    root: null,
    // to be immediately set
    next: null,
    subTree: null,
    // will be set synchronously right after creation
    effect: null,
    update: null,
    // will be set synchronously right after creation
    job: null,
    scope: new Uc(
      !0
      /* detached */
    ),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: t ? t.provides : Object.create(i.provides),
    ids: t ? t.ids : ["", 0, 0],
    accessCache: null,
    renderCache: [],
    // local resolved assets
    components: null,
    directives: null,
    // resolved props and emits options
    propsOptions: zd(o, i),
    emitsOptions: Xd(o, i),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: qe,
    // inheritAttrs
    inheritAttrs: o.inheritAttrs,
    // state
    ctx: qe,
    data: qe,
    props: qe,
    attrs: qe,
    slots: qe,
    refs: qe,
    setupState: qe,
    setupContext: null,
    // suspense related
    suspense: n,
    suspenseId: n ? n.pendingId : 0,
    asyncDep: null,
    asyncResolved: !1,
    // lifecycle hooks
    // not using enums here because it results in computed properties
    isMounted: !1,
    isUnmounted: !1,
    isDeactivated: !1,
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null
  };
  return V.NODE_ENV !== "production" ? l.ctx = ng(l) : l.ctx = { _: l }, l.root = t ? t.root : l, l.emit = $g.bind(null, l), e.ce && e.ce(l), l;
}
let mt = null;
const ra = () => mt || wt;
let Ml, cs;
{
  const e = Ui(), t = (n, o) => {
    let i;
    return (i = e[n]) || (i = e[n] = []), i.push(o), (l) => {
      i.length > 1 ? i.forEach((a) => a(l)) : i[0](l);
    };
  };
  Ml = t(
    "__VUE_INSTANCE_SETTERS__",
    (n) => mt = n
  ), cs = t(
    "__VUE_SSR_SETTERS__",
    (n) => Ii = n
  );
}
const Yi = (e) => {
  const t = mt;
  return Ml(e), e.scope.on(), () => {
    e.scope.off(), Ml(t);
  };
}, du = () => {
  mt && mt.scope.off(), Ml(null);
}, Kg = /* @__PURE__ */ qn("slot,component");
function ds(e, { isNativeTag: t }) {
  (Kg(e) || t(e)) && Z(
    "Do not use built-in or reserved HTML elements as component id: " + e
  );
}
function of(e) {
  return e.vnode.shapeFlag & 4;
}
let Ii = !1;
function Gg(e, t = !1, n = !1) {
  t && cs(t);
  const { props: o, children: i } = e.vnode, l = of(e);
  mg(e, o, l, t), Cg(e, i, n);
  const a = l ? Yg(e, t) : void 0;
  return t && cs(!1), a;
}
function Yg(e, t) {
  var n;
  const o = e.type;
  if (V.NODE_ENV !== "production") {
    if (o.name && ds(o.name, e.appContext.config), o.components) {
      const l = Object.keys(o.components);
      for (let a = 0; a < l.length; a++)
        ds(l[a], e.appContext.config);
    }
    if (o.directives) {
      const l = Object.keys(o.directives);
      for (let a = 0; a < l.length; a++)
        kd(l[a]);
    }
    o.compilerOptions && Xg() && Z(
      '"compilerOptions" is only supported when using a build of Vue that includes the runtime compiler. Since you are using a runtime-only build, the options should be passed via your build tool config instead.'
    );
  }
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Md), V.NODE_ENV !== "production" && og(e);
  const { setup: i } = o;
  if (i) {
    Kn();
    const l = e.setupContext = i.length > 1 ? Zg(e) : null, a = Yi(e), s = li(
      i,
      e,
      0,
      [
        V.NODE_ENV !== "production" ? kn(e.props) : e.props,
        l
      ]
    ), r = Ds(s);
    if (Gn(), a(), (r || e.sp) && !ki(e) && Ad(e), r) {
      if (s.then(du, du), t)
        return s.then((d) => {
          fu(e, d, t);
        }).catch((d) => {
          qi(d, e, 0);
        });
      if (e.asyncDep = s, V.NODE_ENV !== "production" && !e.suspense) {
        const d = (n = o.name) != null ? n : "Anonymous";
        Z(
          `Component <${d}>: setup function returned a promise, but no <Suspense> boundary was found in the parent component tree. A component with async setup() must be nested in a <Suspense> in order to be rendered.`
        );
      }
    } else
      fu(e, s, t);
  } else
    lf(e, t);
}
function fu(e, t, n) {
  Te(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Le(t) ? (V.NODE_ENV !== "production" && Mo(t) && Z(
    "setup() should not return VNodes directly - return a render function instead."
  ), V.NODE_ENV !== "production" && (e.devtoolsRawSetupState = t), e.setupState = ud(t), V.NODE_ENV !== "production" && ig(e)) : V.NODE_ENV !== "production" && t !== void 0 && Z(
    `setup() should return an object. Received: ${t === null ? "null" : typeof t}`
  ), lf(e, n);
}
let fs;
const Xg = () => !fs;
function lf(e, t, n) {
  const o = e.type;
  if (!e.render) {
    if (!t && fs && !o.render) {
      const i = o.template || Js(e).template;
      if (i) {
        V.NODE_ENV !== "production" && Fn(e, "compile");
        const { isCustomElement: l, compilerOptions: a } = e.appContext.config, { delimiters: s, compilerOptions: r } = o, d = et(
          et(
            {
              isCustomElement: l,
              delimiters: s
            },
            a
          ),
          r
        );
        o.render = fs(i, d), V.NODE_ENV !== "production" && Ln(e, "compile");
      }
    }
    e.render = o.render || ft;
  }
  {
    const i = Yi(e);
    Kn();
    try {
      ag(e);
    } finally {
      Gn(), i();
    }
  }
  V.NODE_ENV !== "production" && !o.render && e.render === ft && !t && (o.template ? Z(
    'Component provided template option but runtime compilation is not supported in this build of Vue. Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".'
  ) : Z("Component is missing template or render function: ", o));
}
const mu = V.NODE_ENV !== "production" ? {
  get(e, t) {
    return $l(), dt(e, "get", ""), e[t];
  },
  set() {
    return Z("setupContext.attrs is readonly."), !1;
  },
  deleteProperty() {
    return Z("setupContext.attrs is readonly."), !1;
  }
} : {
  get(e, t) {
    return dt(e, "get", ""), e[t];
  }
};
function Jg(e) {
  return new Proxy(e.slots, {
    get(t, n) {
      return dt(e, "get", "$slots"), t[n];
    }
  });
}
function Zg(e) {
  const t = (n) => {
    if (V.NODE_ENV !== "production" && (e.exposed && Z("expose() should be called only once per setup()."), n != null)) {
      let o = typeof n;
      o === "object" && (_e(n) ? o = "array" : Je(n) && (o = "ref")), o !== "object" && Z(
        `expose() should be passed a plain object, received ${o}.`
      );
    }
    e.exposed = n || {};
  };
  if (V.NODE_ENV !== "production") {
    let n, o;
    return Object.freeze({
      get attrs() {
        return n || (n = new Proxy(e.attrs, mu));
      },
      get slots() {
        return o || (o = Jg(e));
      },
      get emit() {
        return (i, ...l) => e.emit(i, ...l);
      },
      expose: t
    });
  } else
    return {
      attrs: new Proxy(e.attrs, mu),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
}
function ua(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(ud(sd(e.exposed)), {
    get(t, n) {
      if (n in t)
        return t[n];
      if (n in Oo)
        return Oo[n](e);
    },
    has(t, n) {
      return n in t || n in Oo;
    }
  })) : e.proxy;
}
const Qg = /(?:^|[-_])(\w)/g, ey = (e) => e.replace(Qg, (t) => t.toUpperCase()).replace(/[-_]/g, "");
function nr(e, t = !0) {
  return Te(e) ? e.displayName || e.name : e.name || t && e.__name;
}
function ca(e, t, n = !1) {
  let o = nr(t);
  if (!o && t.__file) {
    const i = t.__file.match(/([^/\\]+)\.\w+$/);
    i && (o = i[1]);
  }
  if (!o && e && e.parent) {
    const i = (l) => {
      for (const a in l)
        if (l[a] === t)
          return a;
    };
    o = i(
      e.components || e.parent.type.components
    ) || i(e.appContext.components);
  }
  return o ? ey(o) : n ? "App" : "Anonymous";
}
function af(e) {
  return Te(e) && "__vccOpts" in e;
}
const p = (e, t) => {
  const n = gh(e, t, Ii);
  if (V.NODE_ENV !== "production") {
    const o = ra();
    o && o.appContext.config.warnRecursiveComputed && (n._warnRecursive = !0);
  }
  return n;
};
function co(e, t, n) {
  const o = arguments.length;
  return o === 2 ? Le(t) && !_e(t) ? Mo(t) ? u(e, null, [t]) : u(e, t) : u(e, null, t) : (o > 3 ? n = Array.prototype.slice.call(arguments, 2) : o === 3 && Mo(n) && (n = [n]), u(e, t, n));
}
function ty() {
  if (V.NODE_ENV === "production" || typeof window > "u")
    return;
  const e = { style: "color:#3ba776" }, t = { style: "color:#1677ff" }, n = { style: "color:#f5222d" }, o = { style: "color:#eb2f96" }, i = {
    __vue_custom_formatter: !0,
    header(f) {
      return Le(f) ? f.__isVue ? ["div", e, "VueInstance"] : Je(f) ? [
        "div",
        {},
        ["span", e, c(f)],
        "<",
        // avoid debugger accessing value affecting behavior
        s("_value" in f ? f._value : f),
        ">"
      ] : Vo(f) ? [
        "div",
        {},
        ["span", e, Tt(f) ? "ShallowReactive" : "Reactive"],
        "<",
        s(f),
        `>${Un(f) ? " (readonly)" : ""}`
      ] : Un(f) ? [
        "div",
        {},
        ["span", e, Tt(f) ? "ShallowReadonly" : "Readonly"],
        "<",
        s(f),
        ">"
      ] : null : null;
    },
    hasBody(f) {
      return f && f.__isVue;
    },
    body(f) {
      if (f && f.__isVue)
        return [
          "div",
          {},
          ...l(f.$)
        ];
    }
  };
  function l(f) {
    const m = [];
    f.type.props && f.props && m.push(a("props", ve(f.props))), f.setupState !== qe && m.push(a("setup", f.setupState)), f.data !== qe && m.push(a("data", ve(f.data)));
    const h = r(f, "computed");
    h && m.push(a("computed", h));
    const v = r(f, "inject");
    return v && m.push(a("injected", v)), m.push([
      "div",
      {},
      [
        "span",
        {
          style: o.style + ";opacity:0.66"
        },
        "$ (internal): "
      ],
      ["object", { object: f }]
    ]), m;
  }
  function a(f, m) {
    return m = et({}, m), Object.keys(m).length ? [
      "div",
      { style: "line-height:1.25em;margin-bottom:0.6em" },
      [
        "div",
        {
          style: "color:#476582"
        },
        f
      ],
      [
        "div",
        {
          style: "padding-left:1.25em"
        },
        ...Object.keys(m).map((h) => [
          "div",
          {},
          ["span", o, h + ": "],
          s(m[h], !1)
        ])
      ]
    ] : ["span", {}];
  }
  function s(f, m = !0) {
    return typeof f == "number" ? ["span", t, f] : typeof f == "string" ? ["span", n, JSON.stringify(f)] : typeof f == "boolean" ? ["span", o, f] : Le(f) ? ["object", { object: m ? ve(f) : f }] : ["span", n, String(f)];
  }
  function r(f, m) {
    const h = f.type;
    if (Te(h))
      return;
    const v = {};
    for (const g in f.ctx)
      d(h, g, m) && (v[g] = f.ctx[g]);
    return v;
  }
  function d(f, m, h) {
    const v = f[h];
    if (_e(v) && v.includes(m) || Le(v) && m in v || f.extends && d(f.extends, m, h) || f.mixins && f.mixins.some((g) => d(g, m, h)))
      return !0;
  }
  function c(f) {
    return Tt(f) ? "ShallowRef" : f.effect ? "ComputedRef" : "Ref";
  }
  window.devtoolsFormatters ? window.devtoolsFormatters.push(i) : window.devtoolsFormatters = [i];
}
const vu = "3.5.12", Ot = V.NODE_ENV !== "production" ? Z : ft;
var Wt = {};
let ms;
const hu = typeof window < "u" && window.trustedTypes;
if (hu)
  try {
    ms = /* @__PURE__ */ hu.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch (e) {
    Wt.NODE_ENV !== "production" && Ot(`Error creating trusted types policy: ${e}`);
  }
const sf = ms ? (e) => ms.createHTML(e) : (e) => e, ny = "http://www.w3.org/2000/svg", oy = "http://www.w3.org/1998/Math/MathML", Hn = typeof document < "u" ? document : null, gu = Hn && /* @__PURE__ */ Hn.createElement("template"), iy = {
  insert: (e, t, n) => {
    t.insertBefore(e, n || null);
  },
  remove: (e) => {
    const t = e.parentNode;
    t && t.removeChild(e);
  },
  createElement: (e, t, n, o) => {
    const i = t === "svg" ? Hn.createElementNS(ny, e) : t === "mathml" ? Hn.createElementNS(oy, e) : n ? Hn.createElement(e, { is: n }) : Hn.createElement(e);
    return e === "select" && o && o.multiple != null && i.setAttribute("multiple", o.multiple), i;
  },
  createText: (e) => Hn.createTextNode(e),
  createComment: (e) => Hn.createComment(e),
  setText: (e, t) => {
    e.nodeValue = t;
  },
  setElementText: (e, t) => {
    e.textContent = t;
  },
  parentNode: (e) => e.parentNode,
  nextSibling: (e) => e.nextSibling,
  querySelector: (e) => Hn.querySelector(e),
  setScopeId(e, t) {
    e.setAttribute(t, "");
  },
  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  insertStaticContent(e, t, n, o, i, l) {
    const a = n ? n.previousSibling : t.lastChild;
    if (i && (i === l || i.nextSibling))
      for (; t.insertBefore(i.cloneNode(!0), n), !(i === l || !(i = i.nextSibling)); )
        ;
    else {
      gu.innerHTML = sf(
        o === "svg" ? `<svg>${e}</svg>` : o === "mathml" ? `<math>${e}</math>` : e
      );
      const s = gu.content;
      if (o === "svg" || o === "mathml") {
        const r = s.firstChild;
        for (; r.firstChild; )
          s.appendChild(r.firstChild);
        s.removeChild(r);
      }
      t.insertBefore(s, n);
    }
    return [
      // first
      a ? a.nextSibling : t.firstChild,
      // last
      n ? n.previousSibling : t.lastChild
    ];
  }
}, eo = "transition", vi = "animation", ei = Symbol("_vtc"), rf = {
  name: String,
  type: String,
  css: {
    type: Boolean,
    default: !0
  },
  duration: [String, Number, Object],
  enterFromClass: String,
  enterActiveClass: String,
  enterToClass: String,
  appearFromClass: String,
  appearActiveClass: String,
  appearToClass: String,
  leaveFromClass: String,
  leaveActiveClass: String,
  leaveToClass: String
}, uf = /* @__PURE__ */ et(
  {},
  Vd,
  rf
), ly = (e) => (e.displayName = "Transition", e.props = uf, e), Bo = /* @__PURE__ */ ly(
  (e, { slots: t }) => co(Uh, cf(e), t)
), yo = (e, t = []) => {
  _e(e) ? e.forEach((n) => n(...t)) : e && e(...t);
}, yu = (e) => e ? _e(e) ? e.some((t) => t.length > 1) : e.length > 1 : !1;
function cf(e) {
  const t = {};
  for (const k in e)
    k in rf || (t[k] = e[k]);
  if (e.css === !1)
    return t;
  const {
    name: n = "v",
    type: o,
    duration: i,
    enterFromClass: l = `${n}-enter-from`,
    enterActiveClass: a = `${n}-enter-active`,
    enterToClass: s = `${n}-enter-to`,
    appearFromClass: r = l,
    appearActiveClass: d = a,
    appearToClass: c = s,
    leaveFromClass: f = `${n}-leave-from`,
    leaveActiveClass: m = `${n}-leave-active`,
    leaveToClass: h = `${n}-leave-to`
  } = e, v = ay(i), g = v && v[0], y = v && v[1], {
    onBeforeEnter: w,
    onEnter: E,
    onEnterCancelled: A,
    onLeave: P,
    onLeaveCancelled: C,
    onBeforeAppear: x = w,
    onAppear: I = E,
    onAppearCancelled: N = A
  } = t, T = (k, D, R) => {
    to(k, D ? c : s), to(k, D ? d : a), R && R();
  }, $ = (k, D) => {
    k._isLeaving = !1, to(k, f), to(k, h), to(k, m), D && D();
  }, O = (k) => (D, R) => {
    const G = k ? I : E, re = () => T(D, k, R);
    yo(G, [D, re]), pu(() => {
      to(D, k ? r : l), Rn(D, k ? c : s), yu(G) || bu(D, o, g, re);
    });
  };
  return et(t, {
    onBeforeEnter(k) {
      yo(w, [k]), Rn(k, l), Rn(k, a);
    },
    onBeforeAppear(k) {
      yo(x, [k]), Rn(k, r), Rn(k, d);
    },
    onEnter: O(!1),
    onAppear: O(!0),
    onLeave(k, D) {
      k._isLeaving = !0;
      const R = () => $(k, D);
      Rn(k, f), Rn(k, m), ff(), pu(() => {
        k._isLeaving && (to(k, f), Rn(k, h), yu(P) || bu(k, o, y, R));
      }), yo(P, [k, R]);
    },
    onEnterCancelled(k) {
      T(k, !1), yo(A, [k]);
    },
    onAppearCancelled(k) {
      T(k, !0), yo(N, [k]);
    },
    onLeaveCancelled(k) {
      $(k), yo(C, [k]);
    }
  });
}
function ay(e) {
  if (e == null)
    return null;
  if (Le(e))
    return [Da(e.enter), Da(e.leave)];
  {
    const t = Da(e);
    return [t, t];
  }
}
function Da(e) {
  const t = Tv(e);
  return Wt.NODE_ENV !== "production" && Sh(t, "<transition> explicit duration"), t;
}
function Rn(e, t) {
  t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[ei] || (e[ei] = /* @__PURE__ */ new Set())).add(t);
}
function to(e, t) {
  t.split(/\s+/).forEach((o) => o && e.classList.remove(o));
  const n = e[ei];
  n && (n.delete(t), n.size || (e[ei] = void 0));
}
function pu(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let sy = 0;
function bu(e, t, n, o) {
  const i = e._endId = ++sy, l = () => {
    i === e._endId && o();
  };
  if (n != null)
    return setTimeout(l, n);
  const { type: a, timeout: s, propCount: r } = df(e, t);
  if (!a)
    return o();
  const d = a + "end";
  let c = 0;
  const f = () => {
    e.removeEventListener(d, m), l();
  }, m = (h) => {
    h.target === e && ++c >= r && f();
  };
  setTimeout(() => {
    c < r && f();
  }, s + 1), e.addEventListener(d, m);
}
function df(e, t) {
  const n = window.getComputedStyle(e), o = (v) => (n[v] || "").split(", "), i = o(`${eo}Delay`), l = o(`${eo}Duration`), a = _u(i, l), s = o(`${vi}Delay`), r = o(`${vi}Duration`), d = _u(s, r);
  let c = null, f = 0, m = 0;
  t === eo ? a > 0 && (c = eo, f = a, m = l.length) : t === vi ? d > 0 && (c = vi, f = d, m = r.length) : (f = Math.max(a, d), c = f > 0 ? a > d ? eo : vi : null, m = c ? c === eo ? l.length : r.length : 0);
  const h = c === eo && /\b(transform|all)(,|$)/.test(
    o(`${eo}Property`).toString()
  );
  return {
    type: c,
    timeout: f,
    propCount: m,
    hasTransform: h
  };
}
function _u(e, t) {
  for (; e.length < t.length; )
    e = e.concat(e);
  return Math.max(...t.map((n, o) => wu(n) + wu(e[o])));
}
function wu(e) {
  return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
}
function ff() {
  return document.body.offsetHeight;
}
function ry(e, t, n) {
  const o = e[ei];
  o && (t = (t ? [t, ...o] : [...o]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
const Bl = Symbol("_vod"), mf = Symbol("_vsh"), hn = {
  beforeMount(e, { value: t }, { transition: n }) {
    e[Bl] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : hi(e, t);
  },
  mounted(e, { value: t }, { transition: n }) {
    n && t && n.enter(e);
  },
  updated(e, { value: t, oldValue: n }, { transition: o }) {
    !t != !n && (o ? t ? (o.beforeEnter(e), hi(e, !0), o.enter(e)) : o.leave(e, () => {
      hi(e, !1);
    }) : hi(e, t));
  },
  beforeUnmount(e, { value: t }) {
    hi(e, t);
  }
};
Wt.NODE_ENV !== "production" && (hn.name = "show");
function hi(e, t) {
  e.style.display = t ? e[Bl] : "none", e[mf] = !t;
}
const uy = Symbol(Wt.NODE_ENV !== "production" ? "CSS_VAR_TEXT" : ""), cy = /(^|;)\s*display\s*:/;
function dy(e, t, n) {
  const o = e.style, i = Qe(n);
  let l = !1;
  if (n && !i) {
    if (t)
      if (Qe(t))
        for (const a of t.split(";")) {
          const s = a.slice(0, a.indexOf(":")).trim();
          n[s] == null && bl(o, s, "");
        }
      else
        for (const a in t)
          n[a] == null && bl(o, a, "");
    for (const a in n)
      a === "display" && (l = !0), bl(o, a, n[a]);
  } else if (i) {
    if (t !== n) {
      const a = o[uy];
      a && (n += ";" + a), o.cssText = n, l = cy.test(n);
    }
  } else t && e.removeAttribute("style");
  Bl in e && (e[Bl] = l ? o.display : "", e[mf] && (o.display = "none"));
}
const fy = /[^\\];\s*$/, ku = /\s*!important$/;
function bl(e, t, n) {
  if (_e(n))
    n.forEach((o) => bl(e, t, o));
  else if (n == null && (n = ""), Wt.NODE_ENV !== "production" && fy.test(n) && Ot(
    `Unexpected semicolon at the end of '${t}' style value: '${n}'`
  ), t.startsWith("--"))
    e.setProperty(t, n);
  else {
    const o = my(e, t);
    ku.test(n) ? e.setProperty(
      uo(o),
      n.replace(ku, ""),
      "important"
    ) : e[o] = n;
  }
}
const Su = ["Webkit", "Moz", "ms"], $a = {};
function my(e, t) {
  const n = $a[t];
  if (n)
    return n;
  let o = yt(t);
  if (o !== "filter" && o in e)
    return $a[t] = o;
  o = Qt(o);
  for (let i = 0; i < Su.length; i++) {
    const l = Su[i] + o;
    if (l in e)
      return $a[t] = l;
  }
  return t;
}
const Cu = "http://www.w3.org/1999/xlink";
function Eu(e, t, n, o, i, l = Hv(t)) {
  o && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Cu, t.slice(6, t.length)) : e.setAttributeNS(Cu, t, n) : n == null || l && !Hc(n) ? e.removeAttribute(t) : e.setAttribute(
    t,
    l ? "" : Vn(n) ? String(n) : n
  );
}
function xu(e, t, n, o, i) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? sf(n) : n);
    return;
  }
  const l = e.tagName;
  if (t === "value" && l !== "PROGRESS" && // custom elements may use _value internally
  !l.includes("-")) {
    const s = l === "OPTION" ? e.getAttribute("value") || "" : e.value, r = n == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      e.type === "checkbox" ? "on" : ""
    ) : String(n);
    (s !== r || !("_value" in e)) && (e.value = r), n == null && e.removeAttribute(t), e._value = n;
    return;
  }
  let a = !1;
  if (n === "" || n == null) {
    const s = typeof e[t];
    s === "boolean" ? n = Hc(n) : n == null && s === "string" ? (n = "", a = !0) : s === "number" && (n = 0, a = !0);
  }
  try {
    e[t] = n;
  } catch (s) {
    Wt.NODE_ENV !== "production" && !a && Ot(
      `Failed setting prop "${t}" on <${l.toLowerCase()}>: value ${n} is invalid.`,
      s
    );
  }
  a && e.removeAttribute(i || t);
}
function So(e, t, n, o) {
  e.addEventListener(t, n, o);
}
function vy(e, t, n, o) {
  e.removeEventListener(t, n, o);
}
const Vu = Symbol("_vei");
function hy(e, t, n, o, i = null) {
  const l = e[Vu] || (e[Vu] = {}), a = l[t];
  if (o && a)
    a.value = Wt.NODE_ENV !== "production" ? Tu(o, t) : o;
  else {
    const [s, r] = gy(t);
    if (o) {
      const d = l[t] = by(
        Wt.NODE_ENV !== "production" ? Tu(o, t) : o,
        i
      );
      So(e, s, d, r);
    } else a && (vy(e, s, a, r), l[t] = void 0);
  }
}
const Nu = /(?:Once|Passive|Capture)$/;
function gy(e) {
  let t;
  if (Nu.test(e)) {
    t = {};
    let o;
    for (; o = e.match(Nu); )
      e = e.slice(0, e.length - o[0].length), t[o[0].toLowerCase()] = !0;
  }
  return [e[2] === ":" ? e.slice(3) : uo(e.slice(2)), t];
}
let Ma = 0;
const yy = /* @__PURE__ */ Promise.resolve(), py = () => Ma || (yy.then(() => Ma = 0), Ma = Date.now());
function by(e, t) {
  const n = (o) => {
    if (!o._vts)
      o._vts = Date.now();
    else if (o._vts <= n.attached)
      return;
    fn(
      _y(o, n.value),
      t,
      5,
      [o]
    );
  };
  return n.value = e, n.attached = py(), n;
}
function Tu(e, t) {
  return Te(e) || _e(e) ? e : (Ot(
    `Wrong type passed as event handler to ${t} - did you forget @ or : in front of your prop?
Expected function or array of functions, received type ${typeof e}.`
  ), ft);
}
function _y(e, t) {
  if (_e(t)) {
    const n = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      n.call(e), e._stopped = !0;
    }, t.map(
      (o) => (i) => !i._stopped && o && o(i)
    );
  } else
    return t;
}
const Ou = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // lowercase letter
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, wy = (e, t, n, o, i, l) => {
  const a = i === "svg";
  t === "class" ? ry(e, o, a) : t === "style" ? dy(e, n, o) : ji(t) ? El(t) || hy(e, t, n, o, l) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : ky(e, t, o, a)) ? (xu(e, t, o), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Eu(e, t, o, a, l, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && (/[A-Z]/.test(t) || !Qe(o)) ? xu(e, yt(t), o, l, t) : (t === "true-value" ? e._trueValue = o : t === "false-value" && (e._falseValue = o), Eu(e, t, o, a));
};
function ky(e, t, n, o) {
  if (o)
    return !!(t === "innerHTML" || t === "textContent" || t in e && Ou(t) && Te(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA")
    return !1;
  if (t === "width" || t === "height") {
    const i = e.tagName;
    if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE")
      return !1;
  }
  return Ou(t) && Qe(n) ? !1 : t in e;
}
const vf = /* @__PURE__ */ new WeakMap(), hf = /* @__PURE__ */ new WeakMap(), Fl = Symbol("_moveCb"), Au = Symbol("_enterCb"), Sy = (e) => (delete e.props.mode, e), Cy = /* @__PURE__ */ Sy({
  name: "TransitionGroup",
  props: /* @__PURE__ */ et({}, uf, {
    tag: String,
    moveClass: String
  }),
  setup(e, { slots: t }) {
    const n = ra(), o = xd();
    let i, l;
    return Ys(() => {
      if (!i.length)
        return;
      const a = e.moveClass || `${e.name || "v"}-move`;
      if (!Ny(
        i[0].el,
        n.vnode.el,
        a
      ))
        return;
      i.forEach(Ey), i.forEach(xy);
      const s = i.filter(Vy);
      ff(), s.forEach((r) => {
        const d = r.el, c = d.style;
        Rn(d, a), c.transform = c.webkitTransform = c.transitionDuration = "";
        const f = d[Fl] = (m) => {
          m && m.target !== d || (!m || /transform$/.test(m.propertyName)) && (d.removeEventListener("transitionend", f), d[Fl] = null, to(d, a));
        };
        d.addEventListener("transitionend", f);
      });
    }), () => {
      const a = ve(e), s = cf(a);
      let r = a.tag || Ee;
      if (i = [], l)
        for (let d = 0; d < l.length; d++) {
          const c = l[d];
          c.el && c.el instanceof Element && (i.push(c), $o(
            c,
            Oi(
              c,
              s,
              o,
              n
            )
          ), vf.set(
            c,
            c.el.getBoundingClientRect()
          ));
        }
      l = t.default ? qs(t.default()) : [];
      for (let d = 0; d < l.length; d++) {
        const c = l[d];
        c.key != null ? $o(
          c,
          Oi(c, s, o, n)
        ) : Wt.NODE_ENV !== "production" && c.type !== Lo && Ot("<TransitionGroup> children must be keyed.");
      }
      return u(r, null, l);
    };
  }
}), or = Cy;
function Ey(e) {
  const t = e.el;
  t[Fl] && t[Fl](), t[Au] && t[Au]();
}
function xy(e) {
  hf.set(e, e.el.getBoundingClientRect());
}
function Vy(e) {
  const t = vf.get(e), n = hf.get(e), o = t.left - n.left, i = t.top - n.top;
  if (o || i) {
    const l = e.el.style;
    return l.transform = l.webkitTransform = `translate(${o}px,${i}px)`, l.transitionDuration = "0s", e;
  }
}
function Ny(e, t, n) {
  const o = e.cloneNode(), i = e[ei];
  i && i.forEach((s) => {
    s.split(/\s+/).forEach((r) => r && o.classList.remove(r));
  }), n.split(/\s+/).forEach((s) => s && o.classList.add(s)), o.style.display = "none";
  const l = t.nodeType === 1 ? t : t.parentNode;
  l.appendChild(o);
  const { hasTransform: a } = df(o);
  return l.removeChild(o), a;
}
const Ll = (e) => {
  const t = e.props["onUpdate:modelValue"] || !1;
  return _e(t) ? (n) => Wo(t, n) : t;
};
function Ty(e) {
  e.target.composing = !0;
}
function Iu(e) {
  const t = e.target;
  t.composing && (t.composing = !1, t.dispatchEvent(new Event("input")));
}
const Qo = Symbol("_assign"), Oy = {
  created(e, { modifiers: { lazy: t, trim: n, number: o } }, i) {
    e[Qo] = Ll(i);
    const l = o || i.props && i.props.type === "number";
    So(e, t ? "change" : "input", (a) => {
      if (a.target.composing) return;
      let s = e.value;
      n && (s = s.trim()), l && (s = Vl(s)), e[Qo](s);
    }), n && So(e, "change", () => {
      e.value = e.value.trim();
    }), t || (So(e, "compositionstart", Ty), So(e, "compositionend", Iu), So(e, "change", Iu));
  },
  // set value on mounted so it's after min/max for type="range"
  mounted(e, { value: t }) {
    e.value = t ?? "";
  },
  beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: o, trim: i, number: l } }, a) {
    if (e[Qo] = Ll(a), e.composing) return;
    const s = (l || e.type === "number") && !/^0\d/.test(e.value) ? Vl(e.value) : e.value, r = t ?? "";
    s !== r && (document.activeElement === e && e.type !== "range" && (o && t === n || i && e.value.trim() === r) || (e.value = r));
  }
}, Ay = {
  // <select multiple> value need to be deep traversed
  deep: !0,
  created(e, { value: t, modifiers: { number: n } }, o) {
    const i = Ql(t);
    So(e, "change", () => {
      const l = Array.prototype.filter.call(e.options, (a) => a.selected).map(
        (a) => n ? Vl(Rl(a)) : Rl(a)
      );
      e[Qo](
        e.multiple ? i ? new Set(l) : l : l[0]
      ), e._assigning = !0, ot(() => {
        e._assigning = !1;
      });
    }), e[Qo] = Ll(o);
  },
  // set value in mounted & updated because <select> relies on its children
  // <option>s.
  mounted(e, { value: t }) {
    Pu(e, t);
  },
  beforeUpdate(e, t, n) {
    e[Qo] = Ll(n);
  },
  updated(e, { value: t }) {
    e._assigning || Pu(e, t);
  }
};
function Pu(e, t) {
  const n = e.multiple, o = _e(t);
  if (n && !o && !Ql(t)) {
    Wt.NODE_ENV !== "production" && Ot(
      `<select multiple v-model> expects an Array or Set value for its binding, but got ${Object.prototype.toString.call(t).slice(8, -1)}.`
    );
    return;
  }
  for (let i = 0, l = e.options.length; i < l; i++) {
    const a = e.options[i], s = Rl(a);
    if (n)
      if (o) {
        const r = typeof s;
        r === "string" || r === "number" ? a.selected = t.some((d) => String(d) === String(s)) : a.selected = zv(t, s) > -1;
      } else
        a.selected = t.has(s);
    else if (ta(Rl(a), t)) {
      e.selectedIndex !== i && (e.selectedIndex = i);
      return;
    }
  }
  !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
}
function Rl(e) {
  return "_value" in e ? e._value : e.value;
}
const Iy = ["ctrl", "shift", "alt", "meta"], Py = {
  stop: (e) => e.stopPropagation(),
  prevent: (e) => e.preventDefault(),
  self: (e) => e.target !== e.currentTarget,
  ctrl: (e) => !e.ctrlKey,
  shift: (e) => !e.shiftKey,
  alt: (e) => !e.altKey,
  meta: (e) => !e.metaKey,
  left: (e) => "button" in e && e.button !== 0,
  middle: (e) => "button" in e && e.button !== 1,
  right: (e) => "button" in e && e.button !== 2,
  exact: (e, t) => Iy.some((n) => e[`${n}Key`] && !t.includes(n))
}, _l = (e, t) => {
  const n = e._withMods || (e._withMods = {}), o = t.join(".");
  return n[o] || (n[o] = (i, ...l) => {
    for (let a = 0; a < t.length; a++) {
      const s = Py[t[a]];
      if (s && s(i, t)) return;
    }
    return e(i, ...l);
  });
}, Dy = /* @__PURE__ */ et({ patchProp: wy }, iy);
let Du;
function $y() {
  return Du || (Du = Vg(Dy));
}
const My = (...e) => {
  const t = $y().createApp(...e);
  Wt.NODE_ENV !== "production" && (Fy(t), Ly(t));
  const { mount: n } = t;
  return t.mount = (o) => {
    const i = Ry(o);
    if (!i) return;
    const l = t._component;
    !Te(l) && !l.render && !l.template && (l.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const a = n(i, !1, By(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), a;
  }, t;
};
function By(e) {
  if (e instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement)
    return "mathml";
}
function Fy(e) {
  Object.defineProperty(e.config, "isNativeTag", {
    value: (t) => Bv(t) || Fv(t) || Lv(t),
    writable: !1
  });
}
function Ly(e) {
  {
    const t = e.config.isCustomElement;
    Object.defineProperty(e.config, "isCustomElement", {
      get() {
        return t;
      },
      set() {
        Ot(
          "The `isCustomElement` config option is deprecated. Use `compilerOptions.isCustomElement` instead."
        );
      }
    });
    const n = e.config.compilerOptions, o = 'The `compilerOptions` config option is only respected when using a build of Vue.js that includes the runtime compiler (aka "full build"). Since you are using the runtime-only build, `compilerOptions` must be passed to `@vue/compiler-dom` in the build setup instead.\n- For vue-loader: pass it via vue-loader\'s `compilerOptions` loader option.\n- For vue-cli: see https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-loader\n- For vite: pass it via @vitejs/plugin-vue options. See https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#example-for-passing-options-to-vuecompiler-sfc';
    Object.defineProperty(e.config, "compilerOptions", {
      get() {
        return Ot(o), n;
      },
      set() {
        Ot(o);
      }
    });
  }
}
function Ry(e) {
  if (Qe(e)) {
    const t = document.querySelector(e);
    return Wt.NODE_ENV !== "production" && !t && Ot(
      `Failed to mount app: mount target selector "${e}" returned null.`
    ), t;
  }
  return Wt.NODE_ENV !== "production" && window.ShadowRoot && e instanceof window.ShadowRoot && e.mode === "closed" && Ot(
    'mounting on a ShadowRoot with `{mode: "closed"}` may lead to unpredictable bugs'
  ), e;
}
var Hy = {};
function jy() {
  ty();
}
Hy.NODE_ENV !== "production" && jy();
function Wn(e, t) {
  let n;
  function o() {
    n = Bs(), n.run(() => t.length ? t(() => {
      n == null || n.stop(), o();
    }) : t());
  }
  ge(e, (i) => {
    i && !n ? o() : i || (n == null || n.stop(), n = void 0);
  }, {
    immediate: !0
  }), At(() => {
    n == null || n.stop();
  });
}
const je = typeof window < "u", ir = je && "IntersectionObserver" in window, zy = je && ("ontouchstart" in window || window.navigator.maxTouchPoints > 0);
function gf(e, t, n) {
  const o = t.length - 1;
  if (o < 0) return e === void 0 ? n : e;
  for (let i = 0; i < o; i++) {
    if (e == null)
      return n;
    e = e[t[i]];
  }
  return e == null || e[t[o]] === void 0 ? n : e[t[o]];
}
function ai(e, t) {
  if (e === t) return !0;
  if (e instanceof Date && t instanceof Date && e.getTime() !== t.getTime() || e !== Object(e) || t !== Object(t))
    return !1;
  const n = Object.keys(e);
  return n.length !== Object.keys(t).length ? !1 : n.every((o) => ai(e[o], t[o]));
}
function vs(e, t, n) {
  return e == null || !t || typeof t != "string" ? n : e[t] !== void 0 ? e[t] : (t = t.replace(/\[(\w+)\]/g, ".$1"), t = t.replace(/^\./, ""), gf(e, t.split("."), n));
}
function zn(e, t, n) {
  if (t === !0) return e === void 0 ? n : e;
  if (t == null || typeof t == "boolean") return n;
  if (e !== Object(e)) {
    if (typeof t != "function") return n;
    const i = t(e, n);
    return typeof i > "u" ? n : i;
  }
  if (typeof t == "string") return vs(e, t, n);
  if (Array.isArray(t)) return gf(e, t, n);
  if (typeof t != "function") return n;
  const o = t(e, n);
  return typeof o > "u" ? n : o;
}
function lr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
  return Array.from({
    length: e
  }, (n, o) => t + o);
}
function pe(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "px";
  if (!(e == null || e === ""))
    return isNaN(+e) ? String(e) : isFinite(+e) ? `${Number(e)}${t}` : void 0;
}
function yf(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function $u(e) {
  let t;
  return e !== null && typeof e == "object" && ((t = Object.getPrototypeOf(e)) === Object.prototype || t === null);
}
function ar(e) {
  if (e && "$el" in e) {
    const t = e.$el;
    return (t == null ? void 0 : t.nodeType) === Node.TEXT_NODE ? t.nextElementSibling : t;
  }
  return e;
}
const Mu = Object.freeze({
  enter: 13,
  tab: 9,
  delete: 46,
  esc: 27,
  space: 32,
  up: 38,
  down: 40,
  left: 37,
  right: 39,
  end: 35,
  home: 36,
  del: 46,
  backspace: 8,
  insert: 45,
  pageup: 33,
  pagedown: 34,
  shift: 16
}), Uy = Object.freeze({
  enter: "Enter",
  tab: "Tab",
  delete: "Delete",
  esc: "Escape",
  space: "Space",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  end: "End",
  home: "Home",
  del: "Delete",
  backspace: "Backspace",
  insert: "Insert",
  pageup: "PageUp",
  pagedown: "PageDown",
  shift: "Shift"
});
function pf(e) {
  return Object.keys(e);
}
function Ba(e, t) {
  return t.every((n) => e.hasOwnProperty(n));
}
function bf(e, t) {
  const n = {}, o = new Set(Object.keys(e));
  for (const i of t)
    o.has(i) && (n[i] = e[i]);
  return n;
}
function hs(e, t, n) {
  const o = /* @__PURE__ */ Object.create(null), i = /* @__PURE__ */ Object.create(null);
  for (const l in e)
    t.some((a) => a instanceof RegExp ? a.test(l) : a === l) && !(n != null && n.some((a) => a === l)) ? o[l] = e[l] : i[l] = e[l];
  return [o, i];
}
function Xn(e, t) {
  const n = {
    ...e
  };
  return t.forEach((o) => delete n[o]), n;
}
function Wy(e, t) {
  const n = {};
  return t.forEach((o) => n[o] = e[o]), n;
}
const _f = /^on[^a-z]/, sr = (e) => _f.test(e), qy = ["onAfterscriptexecute", "onAnimationcancel", "onAnimationend", "onAnimationiteration", "onAnimationstart", "onAuxclick", "onBeforeinput", "onBeforescriptexecute", "onChange", "onClick", "onCompositionend", "onCompositionstart", "onCompositionupdate", "onContextmenu", "onCopy", "onCut", "onDblclick", "onFocusin", "onFocusout", "onFullscreenchange", "onFullscreenerror", "onGesturechange", "onGestureend", "onGesturestart", "onGotpointercapture", "onInput", "onKeydown", "onKeypress", "onKeyup", "onLostpointercapture", "onMousedown", "onMousemove", "onMouseout", "onMouseover", "onMouseup", "onMousewheel", "onPaste", "onPointercancel", "onPointerdown", "onPointerenter", "onPointerleave", "onPointermove", "onPointerout", "onPointerover", "onPointerup", "onReset", "onSelect", "onSubmit", "onTouchcancel", "onTouchend", "onTouchmove", "onTouchstart", "onTransitioncancel", "onTransitionend", "onTransitionrun", "onTransitionstart", "onWheel"];
function rr(e) {
  const [t, n] = hs(e, [_f]), o = Xn(t, qy), [i, l] = hs(n, ["class", "style", "id", /^data-/]);
  return Object.assign(i, t), Object.assign(l, o), [i, l];
}
function cn(e) {
  return e == null ? [] : Array.isArray(e) ? e : [e];
}
function Ky(e, t) {
  let n = 0;
  const o = function() {
    for (var i = arguments.length, l = new Array(i), a = 0; a < i; a++)
      l[a] = arguments[a];
    clearTimeout(n), n = setTimeout(() => e(...l), an(t));
  };
  return o.clear = () => {
    clearTimeout(n);
  }, o.immediate = e, o;
}
function zt(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
  return Math.max(t, Math.min(n, e));
}
function Bu(e) {
  const t = e.toString().trim();
  return t.includes(".") ? t.length - t.indexOf(".") - 1 : 0;
}
function Fu(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0";
  return e + n.repeat(Math.max(0, t - e.length));
}
function Lu(e, t) {
  return (arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0").repeat(Math.max(0, t - e.length)) + e;
}
function Gy(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1;
  const n = [];
  let o = 0;
  for (; o < e.length; )
    n.push(e.substr(o, t)), o += t;
  return n;
}
function kt() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = arguments.length > 2 ? arguments[2] : void 0;
  const o = {};
  for (const i in e)
    o[i] = e[i];
  for (const i in t) {
    const l = e[i], a = t[i];
    if ($u(l) && $u(a)) {
      o[i] = kt(l, a, n);
      continue;
    }
    if (n && Array.isArray(l) && Array.isArray(a)) {
      o[i] = n(l, a);
      continue;
    }
    o[i] = a;
  }
  return o;
}
function wf(e) {
  return e.map((t) => t.type === Ee ? wf(t.children) : t).flat();
}
function Ao() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  if (Ao.cache.has(e)) return Ao.cache.get(e);
  const t = e.replace(/[^a-z]/gi, "-").replace(/\B([A-Z])/g, "-$1").toLowerCase();
  return Ao.cache.set(e, t), t;
}
Ao.cache = /* @__PURE__ */ new Map();
function Ko(e, t) {
  if (!t || typeof t != "object") return [];
  if (Array.isArray(t))
    return t.map((n) => Ko(e, n)).flat(1);
  if (t.suspense)
    return Ko(e, t.ssContent);
  if (Array.isArray(t.children))
    return t.children.map((n) => Ko(e, n)).flat(1);
  if (t.component) {
    if (Object.getOwnPropertySymbols(t.component.provides).includes(e))
      return [t.component];
    if (t.component.subTree)
      return Ko(e, t.component.subTree).flat(1);
  }
  return [];
}
function ur(e) {
  const t = gt({}), n = p(e);
  return Ut(() => {
    for (const o in n.value)
      t[o] = n.value[o];
  }, {
    flush: "sync"
  }), js(t);
}
function Hl(e, t) {
  return e.includes(t);
}
function kf(e) {
  return e[2].toLowerCase() + e.slice(3);
}
const Pt = () => [Function, Array];
function Ru(e, t) {
  return t = "on" + Qt(t), !!(e[t] || e[`${t}Once`] || e[`${t}Capture`] || e[`${t}OnceCapture`] || e[`${t}CaptureOnce`]);
}
function Sf(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), o = 1; o < t; o++)
    n[o - 1] = arguments[o];
  if (Array.isArray(e))
    for (const i of e)
      i(...n);
  else typeof e == "function" && e(...n);
}
function Pi(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0;
  const n = ["button", "[href]", 'input:not([type="hidden"])', "select", "textarea", "[tabindex]"].map((o) => `${o}${t ? ':not([tabindex="-1"])' : ""}:not([disabled])`).join(", ");
  return [...e.querySelectorAll(n)];
}
function Cf(e, t, n) {
  let o, i = e.indexOf(document.activeElement);
  const l = t === "next" ? 1 : -1;
  do
    i += l, o = e[i];
  while ((!o || o.offsetParent == null || !((n == null ? void 0 : n(o)) ?? !0)) && i < e.length && i >= 0);
  return o;
}
function Ei(e, t) {
  var o, i, l, a;
  const n = Pi(e);
  if (!t)
    (e === document.activeElement || !e.contains(document.activeElement)) && ((o = n[0]) == null || o.focus());
  else if (t === "first")
    (i = n[0]) == null || i.focus();
  else if (t === "last")
    (l = n.at(-1)) == null || l.focus();
  else if (typeof t == "number")
    (a = n[t]) == null || a.focus();
  else {
    const s = Cf(n, t);
    s ? s.focus() : Ei(e, t === "next" ? "first" : "last");
  }
}
function jl(e, t) {
  if (!(je && typeof CSS < "u" && typeof CSS.supports < "u" && CSS.supports(`selector(${t})`))) return null;
  try {
    return !!e && e.matches(t);
  } catch {
    return null;
  }
}
function Ef(e) {
  return e.some((t) => Mo(t) ? t.type === rt ? !1 : t.type !== Ee || Ef(t.children) : !0) ? e : null;
}
function Yy(e, t) {
  if (!je || e === 0)
    return t(), () => {
    };
  const n = window.setTimeout(t, e);
  return () => window.clearTimeout(n);
}
function Xy(e, t) {
  const n = e.clientX, o = e.clientY, i = t.getBoundingClientRect(), l = i.left, a = i.top, s = i.right, r = i.bottom;
  return n >= l && n <= s && o >= a && o <= r;
}
function gs() {
  const e = he(), t = (n) => {
    e.value = n;
  };
  return Object.defineProperty(t, "value", {
    enumerable: !0,
    get: () => e.value,
    set: (n) => e.value = n
  }), Object.defineProperty(t, "el", {
    enumerable: !0,
    get: () => ar(e.value)
  }), t;
}
function Hu(e) {
  const t = e.key.length === 1, n = !e.ctrlKey && !e.metaKey && !e.altKey;
  return t && n;
}
const xf = ["top", "bottom"], Jy = ["start", "end", "left", "right"];
function ys(e, t) {
  let [n, o] = e.split(" ");
  return o || (o = Hl(xf, n) ? "start" : Hl(Jy, n) ? "top" : "center"), {
    side: ju(n, t),
    align: ju(o, t)
  };
}
function ju(e, t) {
  return e === "start" ? t ? "right" : "left" : e === "end" ? t ? "left" : "right" : e;
}
function Fa(e) {
  return {
    side: {
      center: "center",
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left"
    }[e.side],
    align: e.align
  };
}
function La(e) {
  return {
    side: e.side,
    align: {
      center: "center",
      top: "bottom",
      bottom: "top",
      left: "right",
      right: "left"
    }[e.align]
  };
}
function zu(e) {
  return {
    side: e.align,
    align: e.side
  };
}
function Uu(e) {
  return Hl(xf, e.side) ? "y" : "x";
}
class Io {
  constructor(t) {
    let {
      x: n,
      y: o,
      width: i,
      height: l
    } = t;
    this.x = n, this.y = o, this.width = i, this.height = l;
  }
  get top() {
    return this.y;
  }
  get bottom() {
    return this.y + this.height;
  }
  get left() {
    return this.x;
  }
  get right() {
    return this.x + this.width;
  }
}
function Wu(e, t) {
  return {
    x: {
      before: Math.max(0, t.left - e.left),
      after: Math.max(0, e.right - t.right)
    },
    y: {
      before: Math.max(0, t.top - e.top),
      after: Math.max(0, e.bottom - t.bottom)
    }
  };
}
function Vf(e) {
  return Array.isArray(e) ? new Io({
    x: e[0],
    y: e[1],
    width: 0,
    height: 0
  }) : e.getBoundingClientRect();
}
function cr(e) {
  const t = e.getBoundingClientRect(), n = getComputedStyle(e), o = n.transform;
  if (o) {
    let i, l, a, s, r;
    if (o.startsWith("matrix3d("))
      i = o.slice(9, -1).split(/, /), l = +i[0], a = +i[5], s = +i[12], r = +i[13];
    else if (o.startsWith("matrix("))
      i = o.slice(7, -1).split(/, /), l = +i[0], a = +i[3], s = +i[4], r = +i[5];
    else
      return new Io(t);
    const d = n.transformOrigin, c = t.x - s - (1 - l) * parseFloat(d), f = t.y - r - (1 - a) * parseFloat(d.slice(d.indexOf(" ") + 1)), m = l ? t.width / l : e.offsetWidth + 1, h = a ? t.height / a : e.offsetHeight + 1;
    return new Io({
      x: c,
      y: f,
      width: m,
      height: h
    });
  } else
    return new Io(t);
}
function Co(e, t, n) {
  if (typeof e.animate > "u") return {
    finished: Promise.resolve()
  };
  let o;
  try {
    o = e.animate(t, n);
  } catch {
    return {
      finished: Promise.resolve()
    };
  }
  return typeof o.finished > "u" && (o.finished = new Promise((i) => {
    o.onfinish = () => {
      i(o);
    };
  })), o;
}
const wl = /* @__PURE__ */ new WeakMap();
function Zy(e, t) {
  Object.keys(t).forEach((n) => {
    if (sr(n)) {
      const o = kf(n), i = wl.get(e);
      if (t[n] == null)
        i == null || i.forEach((l) => {
          const [a, s] = l;
          a === o && (e.removeEventListener(o, s), i.delete(l));
        });
      else if (!i || ![...i].some((l) => l[0] === o && l[1] === t[n])) {
        e.addEventListener(o, t[n]);
        const l = i || /* @__PURE__ */ new Set();
        l.add([o, t[n]]), wl.has(e) || wl.set(e, l);
      }
    } else
      t[n] == null ? e.removeAttribute(n) : e.setAttribute(n, t[n]);
  });
}
function Qy(e, t) {
  Object.keys(t).forEach((n) => {
    if (sr(n)) {
      const o = kf(n), i = wl.get(e);
      i == null || i.forEach((l) => {
        const [a, s] = l;
        a === o && (e.removeEventListener(o, s), i.delete(l));
      });
    } else
      e.removeAttribute(n);
  });
}
const zo = 2.4, qu = 0.2126729, Ku = 0.7151522, Gu = 0.072175, ep = 0.55, tp = 0.58, np = 0.57, op = 0.62, ul = 0.03, Yu = 1.45, ip = 5e-4, lp = 1.25, ap = 1.25, Xu = 0.078, Ju = 12.82051282051282, cl = 0.06, Zu = 1e-3;
function Qu(e, t) {
  const n = (e.r / 255) ** zo, o = (e.g / 255) ** zo, i = (e.b / 255) ** zo, l = (t.r / 255) ** zo, a = (t.g / 255) ** zo, s = (t.b / 255) ** zo;
  let r = n * qu + o * Ku + i * Gu, d = l * qu + a * Ku + s * Gu;
  if (r <= ul && (r += (ul - r) ** Yu), d <= ul && (d += (ul - d) ** Yu), Math.abs(d - r) < ip) return 0;
  let c;
  if (d > r) {
    const f = (d ** ep - r ** tp) * lp;
    c = f < Zu ? 0 : f < Xu ? f - f * Ju * cl : f - cl;
  } else {
    const f = (d ** op - r ** np) * ap;
    c = f > -Zu ? 0 : f > -Xu ? f - f * Ju * cl : f + cl;
  }
  return c * 100;
}
function xn(e) {
  Ot(`Vuetify: ${e}`);
}
function zl(e) {
  Ot(`Vuetify error: ${e}`);
}
function sp(e, t) {
  t = Array.isArray(t) ? t.slice(0, -1).map((n) => `'${n}'`).join(", ") + ` or '${t.at(-1)}'` : `'${t}'`, Ot(`[Vuetify UPGRADE] '${e}' is deprecated, use ${t} instead.`);
}
const Ul = 0.20689655172413793, rp = (e) => e > Ul ** 3 ? Math.cbrt(e) : e / (3 * Ul ** 2) + 4 / 29, up = (e) => e > Ul ? e ** 3 : 3 * Ul ** 2 * (e - 4 / 29);
function Nf(e) {
  const t = rp, n = t(e[1]);
  return [116 * n - 16, 500 * (t(e[0] / 0.95047) - n), 200 * (n - t(e[2] / 1.08883))];
}
function Tf(e) {
  const t = up, n = (e[0] + 16) / 116;
  return [t(n + e[1] / 500) * 0.95047, t(n), t(n - e[2] / 200) * 1.08883];
}
const cp = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]], dp = (e) => e <= 31308e-7 ? e * 12.92 : 1.055 * e ** (1 / 2.4) - 0.055, fp = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], mp = (e) => e <= 0.04045 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4;
function Of(e) {
  const t = Array(3), n = dp, o = cp;
  for (let i = 0; i < 3; ++i)
    t[i] = Math.round(zt(n(o[i][0] * e[0] + o[i][1] * e[1] + o[i][2] * e[2])) * 255);
  return {
    r: t[0],
    g: t[1],
    b: t[2]
  };
}
function dr(e) {
  let {
    r: t,
    g: n,
    b: o
  } = e;
  const i = [0, 0, 0], l = mp, a = fp;
  t = l(t / 255), n = l(n / 255), o = l(o / 255);
  for (let s = 0; s < 3; ++s)
    i[s] = a[s][0] * t + a[s][1] * n + a[s][2] * o;
  return i;
}
function ps(e) {
  return !!e && /^(#|var\(--|(rgb|hsl)a?\()/.test(e);
}
function vp(e) {
  return ps(e) && !/^((rgb|hsl)a?\()?var\(--/.test(e);
}
const ec = /^(?<fn>(?:rgb|hsl)a?)\((?<values>.+)\)/, hp = {
  rgb: (e, t, n, o) => ({
    r: e,
    g: t,
    b: n,
    a: o
  }),
  rgba: (e, t, n, o) => ({
    r: e,
    g: t,
    b: n,
    a: o
  }),
  hsl: (e, t, n, o) => tc({
    h: e,
    s: t,
    l: n,
    a: o
  }),
  hsla: (e, t, n, o) => tc({
    h: e,
    s: t,
    l: n,
    a: o
  }),
  hsv: (e, t, n, o) => Di({
    h: e,
    s: t,
    v: n,
    a: o
  }),
  hsva: (e, t, n, o) => Di({
    h: e,
    s: t,
    v: n,
    a: o
  })
};
function Sn(e) {
  if (typeof e == "number")
    return (isNaN(e) || e < 0 || e > 16777215) && xn(`'${e}' is not a valid hex color`), {
      r: (e & 16711680) >> 16,
      g: (e & 65280) >> 8,
      b: e & 255
    };
  if (typeof e == "string" && ec.test(e)) {
    const {
      groups: t
    } = e.match(ec), {
      fn: n,
      values: o
    } = t, i = o.split(/,\s*/).map((l) => l.endsWith("%") && ["hsl", "hsla", "hsv", "hsva"].includes(n) ? parseFloat(l) / 100 : parseFloat(l));
    return hp[n](...i);
  } else if (typeof e == "string") {
    let t = e.startsWith("#") ? e.slice(1) : e;
    [3, 4].includes(t.length) ? t = t.split("").map((o) => o + o).join("") : [6, 8].includes(t.length) || xn(`'${e}' is not a valid hex(a) color`);
    const n = parseInt(t, 16);
    return (isNaN(n) || n < 0 || n > 4294967295) && xn(`'${e}' is not a valid hex(a) color`), yp(t);
  } else if (typeof e == "object") {
    if (Ba(e, ["r", "g", "b"]))
      return e;
    if (Ba(e, ["h", "s", "l"]))
      return Di(Af(e));
    if (Ba(e, ["h", "s", "v"]))
      return Di(e);
  }
  throw new TypeError(`Invalid color: ${e == null ? e : String(e) || e.constructor.name}
Expected #hex, #hexa, rgb(), rgba(), hsl(), hsla(), object or number`);
}
function Di(e) {
  const {
    h: t,
    s: n,
    v: o,
    a: i
  } = e, l = (s) => {
    const r = (s + t / 60) % 6;
    return o - o * n * Math.max(Math.min(r, 4 - r, 1), 0);
  }, a = [l(5), l(3), l(1)].map((s) => Math.round(s * 255));
  return {
    r: a[0],
    g: a[1],
    b: a[2],
    a: i
  };
}
function tc(e) {
  return Di(Af(e));
}
function Af(e) {
  const {
    h: t,
    s: n,
    l: o,
    a: i
  } = e, l = o + n * Math.min(o, 1 - o), a = l === 0 ? 0 : 2 - 2 * o / l;
  return {
    h: t,
    s: a,
    v: l,
    a: i
  };
}
function dl(e) {
  const t = Math.round(e).toString(16);
  return ("00".substr(0, 2 - t.length) + t).toUpperCase();
}
function gp(e) {
  let {
    r: t,
    g: n,
    b: o,
    a: i
  } = e;
  return `#${[dl(t), dl(n), dl(o), i !== void 0 ? dl(Math.round(i * 255)) : ""].join("")}`;
}
function yp(e) {
  e = pp(e);
  let [t, n, o, i] = Gy(e, 2).map((l) => parseInt(l, 16));
  return i = i === void 0 ? i : i / 255, {
    r: t,
    g: n,
    b: o,
    a: i
  };
}
function pp(e) {
  return e.startsWith("#") && (e = e.slice(1)), e = e.replace(/([^0-9a-f])/gi, "F"), (e.length === 3 || e.length === 4) && (e = e.split("").map((t) => t + t).join("")), e.length !== 6 && (e = Fu(Fu(e, 6), 8, "F")), e;
}
function bp(e, t) {
  const n = Nf(dr(e));
  return n[0] = n[0] + t * 10, Of(Tf(n));
}
function _p(e, t) {
  const n = Nf(dr(e));
  return n[0] = n[0] - t * 10, Of(Tf(n));
}
function wp(e) {
  const t = Sn(e);
  return dr(t)[1];
}
function If(e) {
  const t = Math.abs(Qu(Sn(0), Sn(e)));
  return Math.abs(Qu(Sn(16777215), Sn(e))) > Math.min(t, 50) ? "#fff" : "#000";
}
function W(e, t) {
  return (n) => Object.keys(e).reduce((o, i) => {
    const a = typeof e[i] == "object" && e[i] != null && !Array.isArray(e[i]) ? e[i] : {
      type: e[i]
    };
    return n && i in n ? o[i] = {
      ...a,
      default: n[i]
    } : o[i] = a, t && !o[i].source && (o[i].source = t), o;
  }, {});
}
const Ae = W({
  class: [String, Array, Object],
  style: {
    type: [String, Array, Object],
    default: null
  }
}, "component");
function at(e, t) {
  const n = ra();
  if (!n)
    throw new Error(`[Vuetify] ${e} must be called from inside a setup function`);
  return n;
}
function Tn() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "composables";
  const t = at(e).type;
  return Ao((t == null ? void 0 : t.aliasName) || (t == null ? void 0 : t.name));
}
let Pf = 0, kl = /* @__PURE__ */ new WeakMap();
function gn() {
  const e = at("getUid");
  if (kl.has(e)) return kl.get(e);
  {
    const t = Pf++;
    return kl.set(e, t), t;
  }
}
gn.reset = () => {
  Pf = 0, kl = /* @__PURE__ */ new WeakMap();
};
function kp(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : at("injectSelf");
  const {
    provides: n
  } = t;
  if (n && e in n)
    return n[e];
}
const ti = Symbol.for("vuetify:defaults");
function Sp(e) {
  return ie(e);
}
function fr() {
  const e = Ge(ti);
  if (!e) throw new Error("[Vuetify] Could not find defaults instance");
  return e;
}
function Jn(e, t) {
  const n = fr(), o = ie(e), i = p(() => {
    if (an(t == null ? void 0 : t.disabled)) return n.value;
    const a = an(t == null ? void 0 : t.scoped), s = an(t == null ? void 0 : t.reset), r = an(t == null ? void 0 : t.root);
    if (o.value == null && !(a || s || r)) return n.value;
    let d = kt(o.value, {
      prev: n.value
    });
    if (a) return d;
    if (s || r) {
      const c = Number(s || 1 / 0);
      for (let f = 0; f <= c && !(!d || !("prev" in d)); f++)
        d = d.prev;
      return d && typeof r == "string" && r in d && (d = kt(kt(d, {
        prev: d
      }), d[r])), d;
    }
    return d.prev ? kt(d.prev, d) : d;
  });
  return ht(ti, i), i;
}
function Cp(e, t) {
  var n, o;
  return typeof ((n = e.props) == null ? void 0 : n[t]) < "u" || typeof ((o = e.props) == null ? void 0 : o[Ao(t)]) < "u";
}
function Ep() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : fr();
  const o = at("useDefaults");
  if (t = t ?? o.type.name ?? o.type.__name, !t)
    throw new Error("[Vuetify] Could not determine component name");
  const i = p(() => {
    var r;
    return (r = n.value) == null ? void 0 : r[e._as ?? t];
  }), l = new Proxy(e, {
    get(r, d) {
      var f, m, h, v, g, y, w;
      const c = Reflect.get(r, d);
      return d === "class" || d === "style" ? [(f = i.value) == null ? void 0 : f[d], c].filter((E) => E != null) : typeof d == "string" && !Cp(o.vnode, d) ? ((m = i.value) == null ? void 0 : m[d]) !== void 0 ? (h = i.value) == null ? void 0 : h[d] : ((g = (v = n.value) == null ? void 0 : v.global) == null ? void 0 : g[d]) !== void 0 ? (w = (y = n.value) == null ? void 0 : y.global) == null ? void 0 : w[d] : c : c;
    }
  }), a = he();
  Ut(() => {
    if (i.value) {
      const r = Object.entries(i.value).filter((d) => {
        let [c] = d;
        return c.startsWith(c[0].toUpperCase());
      });
      a.value = r.length ? Object.fromEntries(r) : void 0;
    } else
      a.value = void 0;
  });
  function s() {
    const r = kp(ti, o);
    ht(ti, p(() => a.value ? kt((r == null ? void 0 : r.value) ?? {}, a.value) : r == null ? void 0 : r.value));
  }
  return {
    props: l,
    provideSubDefaults: s
  };
}
function si(e) {
  if (e._setup = e._setup ?? e.setup, !e.name)
    return xn("The component is missing an explicit name, unable to generate default prop value"), e;
  if (e._setup) {
    e.props = W(e.props ?? {}, e.name)();
    const t = Object.keys(e.props).filter((n) => n !== "class" && n !== "style");
    e.filterProps = function(o) {
      return bf(o, t);
    }, e.props._as = String, e.setup = function(o, i) {
      const l = fr();
      if (!l.value) return e._setup(o, i);
      const {
        props: a,
        provideSubDefaults: s
      } = Ep(o, o._as ?? e.name, l), r = e._setup(a, i);
      return s(), r;
    };
  }
  return e;
}
function de() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !0;
  return (t) => (e ? si : Wh)(t);
}
function da(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "div", n = arguments.length > 2 ? arguments[2] : void 0;
  return de()({
    name: n ?? Qt(yt(e.replace(/__/g, "-"))),
    props: {
      tag: {
        type: String,
        default: t
      },
      ...Ae()
    },
    setup(o, i) {
      let {
        slots: l
      } = i;
      return () => {
        var a;
        return co(o.tag, {
          class: [e, o.class],
          style: o.style
        }, (a = l.default) == null ? void 0 : a.call(l));
      };
    }
  });
}
function Df(e) {
  if (typeof e.getRootNode != "function") {
    for (; e.parentNode; ) e = e.parentNode;
    return e !== document ? null : document;
  }
  const t = e.getRootNode();
  return t !== document && t.getRootNode({
    composed: !0
  }) !== document ? null : t;
}
const $i = "cubic-bezier(0.4, 0, 0.2, 1)", xp = "cubic-bezier(0.0, 0, 0.2, 1)", Vp = "cubic-bezier(0.4, 0, 1, 1)";
function $f(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
  for (; e; ) {
    if (t ? Np(e) : mr(e)) return e;
    e = e.parentElement;
  }
  return document.scrollingElement;
}
function Wl(e, t) {
  const n = [];
  if (t && e && !t.contains(e)) return n;
  for (; e && (mr(e) && n.push(e), e !== t); )
    e = e.parentElement;
  return n;
}
function mr(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return t.overflowY === "scroll" || t.overflowY === "auto" && e.scrollHeight > e.clientHeight;
}
function Np(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return ["scroll", "auto"].includes(t.overflowY);
}
function Tp(e) {
  for (; e; ) {
    if (window.getComputedStyle(e).position === "fixed")
      return !0;
    e = e.offsetParent;
  }
  return !1;
}
function Se(e) {
  const t = at("useRender");
  t.render = e;
}
function Ye(e, t, n) {
  let o = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : (f) => f, i = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : (f) => f;
  const l = at("useProxiedModel"), a = ie(e[t] !== void 0 ? e[t] : n), s = Ao(t), d = p(s !== t ? () => {
    var f, m, h, v;
    return e[t], !!(((f = l.vnode.props) != null && f.hasOwnProperty(t) || (m = l.vnode.props) != null && m.hasOwnProperty(s)) && ((h = l.vnode.props) != null && h.hasOwnProperty(`onUpdate:${t}`) || (v = l.vnode.props) != null && v.hasOwnProperty(`onUpdate:${s}`)));
  } : () => {
    var f, m;
    return e[t], !!((f = l.vnode.props) != null && f.hasOwnProperty(t) && ((m = l.vnode.props) != null && m.hasOwnProperty(`onUpdate:${t}`)));
  });
  Wn(() => !d.value, () => {
    ge(() => e[t], (f) => {
      a.value = f;
    });
  });
  const c = p({
    get() {
      const f = e[t];
      return o(d.value ? f : a.value);
    },
    set(f) {
      const m = i(f), h = ve(d.value ? e[t] : a.value);
      h === m || o(h) === f || (a.value = m, l == null || l.emit(`update:${t}`, m));
    }
  });
  return Object.defineProperty(c, "externalValue", {
    get: () => d.value ? e[t] : a.value
  }), c;
}
const Op = {
  badge: "Badge",
  open: "Open",
  close: "Close",
  dismiss: "Dismiss",
  confirmEdit: {
    ok: "OK",
    cancel: "Cancel"
  },
  dataIterator: {
    noResultsText: "No matching records found",
    loadingText: "Loading items..."
  },
  dataTable: {
    itemsPerPageText: "Rows per page:",
    ariaLabel: {
      sortDescending: "Sorted descending.",
      sortAscending: "Sorted ascending.",
      sortNone: "Not sorted.",
      activateNone: "Activate to remove sorting.",
      activateDescending: "Activate to sort descending.",
      activateAscending: "Activate to sort ascending."
    },
    sortBy: "Sort by"
  },
  dataFooter: {
    itemsPerPageText: "Items per page:",
    itemsPerPageAll: "All",
    nextPage: "Next page",
    prevPage: "Previous page",
    firstPage: "First page",
    lastPage: "Last page",
    pageText: "{0}-{1} of {2}"
  },
  dateRangeInput: {
    divider: "to"
  },
  datePicker: {
    itemsSelected: "{0} selected",
    range: {
      title: "Select dates",
      header: "Enter dates"
    },
    title: "Select date",
    header: "Enter date",
    input: {
      placeholder: "Enter date"
    }
  },
  noDataText: "No data available",
  carousel: {
    prev: "Previous visual",
    next: "Next visual",
    ariaLabel: {
      delimiter: "Carousel slide {0} of {1}"
    }
  },
  calendar: {
    moreEvents: "{0} more",
    today: "Today"
  },
  input: {
    clear: "Clear {0}",
    prependAction: "{0} prepended action",
    appendAction: "{0} appended action",
    otp: "Please enter OTP character {0}"
  },
  fileInput: {
    counter: "{0} files",
    counterSize: "{0} files ({1} in total)"
  },
  timePicker: {
    am: "AM",
    pm: "PM",
    title: "Select Time"
  },
  pagination: {
    ariaLabel: {
      root: "Pagination Navigation",
      next: "Next page",
      previous: "Previous page",
      page: "Go to page {0}",
      currentPage: "Page {0}, Current page",
      first: "First page",
      last: "Last page"
    }
  },
  stepper: {
    next: "Next",
    prev: "Previous"
  },
  rating: {
    ariaLabel: {
      item: "Rating {0} of {1}"
    }
  },
  loading: "Loading...",
  infiniteScroll: {
    loadMore: "Load more",
    empty: "No more"
  }
}, nc = "$vuetify.", oc = (e, t) => e.replace(/\{(\d+)\}/g, (n, o) => String(t[+o])), Mf = (e, t, n) => function(o) {
  for (var i = arguments.length, l = new Array(i > 1 ? i - 1 : 0), a = 1; a < i; a++)
    l[a - 1] = arguments[a];
  if (!o.startsWith(nc))
    return oc(o, l);
  const s = o.replace(nc, ""), r = e.value && n.value[e.value], d = t.value && n.value[t.value];
  let c = vs(r, s, null);
  return c || (xn(`Translation key "${o}" not found in "${e.value}", trying fallback locale`), c = vs(d, s, null)), c || (zl(`Translation key "${o}" not found in fallback`), c = o), typeof c != "string" && (zl(`Translation key "${o}" has a non-string value`), c = o), oc(c, l);
};
function Bf(e, t) {
  return (n, o) => new Intl.NumberFormat([e.value, t.value], o).format(n);
}
function Ra(e, t, n) {
  const o = Ye(e, t, e[t] ?? n.value);
  return o.value = e[t] ?? n.value, ge(n, (i) => {
    e[t] == null && (o.value = n.value);
  }), o;
}
function Ff(e) {
  return (t) => {
    const n = Ra(t, "locale", e.current), o = Ra(t, "fallback", e.fallback), i = Ra(t, "messages", e.messages);
    return {
      name: "vuetify",
      current: n,
      fallback: o,
      messages: i,
      t: Mf(n, o, i),
      n: Bf(n, o),
      provide: Ff({
        current: n,
        fallback: o,
        messages: i
      })
    };
  };
}
function Ap(e) {
  const t = he((e == null ? void 0 : e.locale) ?? "en"), n = he((e == null ? void 0 : e.fallback) ?? "en"), o = ie({
    en: Op,
    ...e == null ? void 0 : e.messages
  });
  return {
    name: "vuetify",
    current: t,
    fallback: n,
    messages: o,
    t: Mf(t, n, o),
    n: Bf(t, n),
    provide: Ff({
      current: t,
      fallback: n,
      messages: o
    })
  };
}
const ql = Symbol.for("vuetify:locale");
function Ip(e) {
  return e.name != null;
}
function Pp(e) {
  const t = e != null && e.adapter && Ip(e == null ? void 0 : e.adapter) ? e == null ? void 0 : e.adapter : Ap(e), n = $p(t, e);
  return {
    ...t,
    ...n
  };
}
function ri() {
  const e = Ge(ql);
  if (!e) throw new Error("[Vuetify] Could not find injected locale instance");
  return e;
}
function Dp() {
  return {
    af: !1,
    ar: !0,
    bg: !1,
    ca: !1,
    ckb: !1,
    cs: !1,
    de: !1,
    el: !1,
    en: !1,
    es: !1,
    et: !1,
    fa: !0,
    fi: !1,
    fr: !1,
    hr: !1,
    hu: !1,
    he: !0,
    id: !1,
    it: !1,
    ja: !1,
    km: !1,
    ko: !1,
    lv: !1,
    lt: !1,
    nl: !1,
    no: !1,
    pl: !1,
    pt: !1,
    ro: !1,
    ru: !1,
    sk: !1,
    sl: !1,
    srCyrl: !1,
    srLatn: !1,
    sv: !1,
    th: !1,
    tr: !1,
    az: !1,
    uk: !1,
    vi: !1,
    zhHans: !1,
    zhHant: !1
  };
}
function $p(e, t) {
  const n = ie((t == null ? void 0 : t.rtl) ?? Dp()), o = p(() => n.value[e.current.value] ?? !1);
  return {
    isRtl: o,
    rtl: n,
    rtlClasses: p(() => `v-locale--is-${o.value ? "rtl" : "ltr"}`)
  };
}
function $t() {
  const e = Ge(ql);
  if (!e) throw new Error("[Vuetify] Could not find injected rtl instance");
  return {
    isRtl: e.isRtl,
    rtlClasses: e.rtlClasses
  };
}
const fa = {
  "001": 1,
  AD: 1,
  AE: 6,
  AF: 6,
  AG: 0,
  AI: 1,
  AL: 1,
  AM: 1,
  AN: 1,
  AR: 1,
  AS: 0,
  AT: 1,
  AU: 1,
  AX: 1,
  AZ: 1,
  BA: 1,
  BD: 0,
  BE: 1,
  BG: 1,
  BH: 6,
  BM: 1,
  BN: 1,
  BR: 0,
  BS: 0,
  BT: 0,
  BW: 0,
  BY: 1,
  BZ: 0,
  CA: 0,
  CH: 1,
  CL: 1,
  CM: 1,
  CN: 1,
  CO: 0,
  CR: 1,
  CY: 1,
  CZ: 1,
  DE: 1,
  DJ: 6,
  DK: 1,
  DM: 0,
  DO: 0,
  DZ: 6,
  EC: 1,
  EE: 1,
  EG: 6,
  ES: 1,
  ET: 0,
  FI: 1,
  FJ: 1,
  FO: 1,
  FR: 1,
  GB: 1,
  "GB-alt-variant": 0,
  GE: 1,
  GF: 1,
  GP: 1,
  GR: 1,
  GT: 0,
  GU: 0,
  HK: 0,
  HN: 0,
  HR: 1,
  HU: 1,
  ID: 0,
  IE: 1,
  IL: 0,
  IN: 0,
  IQ: 6,
  IR: 6,
  IS: 1,
  IT: 1,
  JM: 0,
  JO: 6,
  JP: 0,
  KE: 0,
  KG: 1,
  KH: 0,
  KR: 0,
  KW: 6,
  KZ: 1,
  LA: 0,
  LB: 1,
  LI: 1,
  LK: 1,
  LT: 1,
  LU: 1,
  LV: 1,
  LY: 6,
  MC: 1,
  MD: 1,
  ME: 1,
  MH: 0,
  MK: 1,
  MM: 0,
  MN: 1,
  MO: 0,
  MQ: 1,
  MT: 0,
  MV: 5,
  MX: 0,
  MY: 1,
  MZ: 0,
  NI: 0,
  NL: 1,
  NO: 1,
  NP: 0,
  NZ: 1,
  OM: 6,
  PA: 0,
  PE: 0,
  PH: 0,
  PK: 0,
  PL: 1,
  PR: 0,
  PT: 0,
  PY: 0,
  QA: 6,
  RE: 1,
  RO: 1,
  RS: 1,
  RU: 1,
  SA: 0,
  SD: 6,
  SE: 1,
  SG: 0,
  SI: 1,
  SK: 1,
  SM: 1,
  SV: 0,
  SY: 6,
  TH: 0,
  TJ: 1,
  TM: 1,
  TR: 1,
  TT: 0,
  TW: 0,
  UA: 1,
  UM: 0,
  US: 0,
  UY: 1,
  UZ: 1,
  VA: 1,
  VE: 0,
  VI: 0,
  VN: 1,
  WS: 0,
  XK: 1,
  YE: 0,
  ZA: 0,
  ZW: 0
};
function Mp(e, t, n) {
  const o = [];
  let i = [];
  const l = Lf(e), a = Rf(e), s = n ?? fa[t.slice(-2).toUpperCase()] ?? 0, r = (l.getDay() - s + 7) % 7, d = (a.getDay() - s + 7) % 7;
  for (let c = 0; c < r; c++) {
    const f = new Date(l);
    f.setDate(f.getDate() - (r - c)), i.push(f);
  }
  for (let c = 1; c <= a.getDate(); c++) {
    const f = new Date(e.getFullYear(), e.getMonth(), c);
    i.push(f), i.length === 7 && (o.push(i), i = []);
  }
  for (let c = 1; c < 7 - d; c++) {
    const f = new Date(a);
    f.setDate(f.getDate() + c), i.push(f);
  }
  return i.length > 0 && o.push(i), o;
}
function Bp(e, t, n) {
  const o = n ?? fa[t.slice(-2).toUpperCase()] ?? 0, i = new Date(e);
  for (; i.getDay() !== o; )
    i.setDate(i.getDate() - 1);
  return i;
}
function Fp(e, t) {
  const n = new Date(e), o = ((fa[t.slice(-2).toUpperCase()] ?? 0) + 6) % 7;
  for (; n.getDay() !== o; )
    n.setDate(n.getDate() + 1);
  return n;
}
function Lf(e) {
  return new Date(e.getFullYear(), e.getMonth(), 1);
}
function Rf(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 0);
}
function Lp(e) {
  const t = e.split("-").map(Number);
  return new Date(t[0], t[1] - 1, t[2]);
}
const Rp = /^([12]\d{3}-([1-9]|0[1-9]|1[0-2])-([1-9]|0[1-9]|[12]\d|3[01]))$/;
function Hf(e) {
  if (e == null) return /* @__PURE__ */ new Date();
  if (e instanceof Date) return e;
  if (typeof e == "string") {
    let t;
    if (Rp.test(e))
      return Lp(e);
    if (t = Date.parse(e), !isNaN(t)) return new Date(t);
  }
  return null;
}
const ic = new Date(2e3, 0, 2);
function Hp(e, t) {
  const n = t ?? fa[e.slice(-2).toUpperCase()] ?? 0;
  return lr(7).map((o) => {
    const i = new Date(ic);
    return i.setDate(ic.getDate() + n + o), new Intl.DateTimeFormat(e, {
      weekday: "narrow"
    }).format(i);
  });
}
function jp(e, t, n, o) {
  const i = Hf(e) ?? /* @__PURE__ */ new Date(), l = o == null ? void 0 : o[t];
  if (typeof l == "function")
    return l(i, t, n);
  let a = {};
  switch (t) {
    case "fullDate":
      a = {
        year: "numeric",
        month: "long",
        day: "numeric"
      };
      break;
    case "fullDateWithWeekday":
      a = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      };
      break;
    case "normalDate":
      const s = i.getDate(), r = new Intl.DateTimeFormat(n, {
        month: "long"
      }).format(i);
      return `${s} ${r}`;
    case "normalDateWithWeekday":
      a = {
        weekday: "short",
        day: "numeric",
        month: "short"
      };
      break;
    case "shortDate":
      a = {
        month: "short",
        day: "numeric"
      };
      break;
    case "year":
      a = {
        year: "numeric"
      };
      break;
    case "month":
      a = {
        month: "long"
      };
      break;
    case "monthShort":
      a = {
        month: "short"
      };
      break;
    case "monthAndYear":
      a = {
        month: "long",
        year: "numeric"
      };
      break;
    case "monthAndDate":
      a = {
        month: "long",
        day: "numeric"
      };
      break;
    case "weekday":
      a = {
        weekday: "long"
      };
      break;
    case "weekdayShort":
      a = {
        weekday: "short"
      };
      break;
    case "dayOfMonth":
      return new Intl.NumberFormat(n).format(i.getDate());
    case "hours12h":
      a = {
        hour: "numeric",
        hour12: !0
      };
      break;
    case "hours24h":
      a = {
        hour: "numeric",
        hour12: !1
      };
      break;
    case "minutes":
      a = {
        minute: "numeric"
      };
      break;
    case "seconds":
      a = {
        second: "numeric"
      };
      break;
    case "fullTime":
      a = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !0
      };
      break;
    case "fullTime12h":
      a = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !0
      };
      break;
    case "fullTime24h":
      a = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !1
      };
      break;
    case "fullDateTime":
      a = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !0
      };
      break;
    case "fullDateTime12h":
      a = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !0
      };
      break;
    case "fullDateTime24h":
      a = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !1
      };
      break;
    case "keyboardDate":
      a = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      };
      break;
    case "keyboardDateTime":
      a = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !1
      };
      break;
    case "keyboardDateTime12h":
      a = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !0
      };
      break;
    case "keyboardDateTime24h":
      a = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !1
      };
      break;
    default:
      a = l ?? {
        timeZone: "UTC",
        timeZoneName: "short"
      };
  }
  return new Intl.DateTimeFormat(n, a).format(i);
}
function zp(e, t) {
  const n = e.toJsDate(t), o = n.getFullYear(), i = Lu(String(n.getMonth() + 1), 2, "0"), l = Lu(String(n.getDate()), 2, "0");
  return `${o}-${i}-${l}`;
}
function Up(e) {
  const [t, n, o] = e.split("-").map(Number);
  return new Date(t, n - 1, o);
}
function Wp(e, t) {
  const n = new Date(e);
  return n.setMinutes(n.getMinutes() + t), n;
}
function qp(e, t) {
  const n = new Date(e);
  return n.setHours(n.getHours() + t), n;
}
function Kp(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}
function Gp(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t * 7), n;
}
function Yp(e, t) {
  const n = new Date(e);
  return n.setDate(1), n.setMonth(n.getMonth() + t), n;
}
function Xp(e) {
  return e.getFullYear();
}
function Jp(e) {
  return e.getMonth();
}
function Zp(e) {
  return e.getDate();
}
function Qp(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 1);
}
function eb(e) {
  return new Date(e.getFullYear(), e.getMonth() - 1, 1);
}
function tb(e) {
  return e.getHours();
}
function nb(e) {
  return e.getMinutes();
}
function ob(e) {
  return new Date(e.getFullYear(), 0, 1);
}
function ib(e) {
  return new Date(e.getFullYear(), 11, 31);
}
function lb(e, t) {
  return Kl(e, t[0]) && rb(e, t[1]);
}
function ab(e) {
  const t = new Date(e);
  return t instanceof Date && !isNaN(t.getTime());
}
function Kl(e, t) {
  return e.getTime() > t.getTime();
}
function sb(e, t) {
  return Kl(bs(e), bs(t));
}
function rb(e, t) {
  return e.getTime() < t.getTime();
}
function lc(e, t) {
  return e.getTime() === t.getTime();
}
function ub(e, t) {
  return e.getDate() === t.getDate() && e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function cb(e, t) {
  return e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function db(e, t) {
  return e.getFullYear() === t.getFullYear();
}
function fb(e, t, n) {
  const o = new Date(e), i = new Date(t);
  switch (n) {
    case "years":
      return o.getFullYear() - i.getFullYear();
    case "quarters":
      return Math.floor((o.getMonth() - i.getMonth() + (o.getFullYear() - i.getFullYear()) * 12) / 4);
    case "months":
      return o.getMonth() - i.getMonth() + (o.getFullYear() - i.getFullYear()) * 12;
    case "weeks":
      return Math.floor((o.getTime() - i.getTime()) / (1e3 * 60 * 60 * 24 * 7));
    case "days":
      return Math.floor((o.getTime() - i.getTime()) / (1e3 * 60 * 60 * 24));
    case "hours":
      return Math.floor((o.getTime() - i.getTime()) / (1e3 * 60 * 60));
    case "minutes":
      return Math.floor((o.getTime() - i.getTime()) / (1e3 * 60));
    case "seconds":
      return Math.floor((o.getTime() - i.getTime()) / 1e3);
    default:
      return o.getTime() - i.getTime();
  }
}
function mb(e, t) {
  const n = new Date(e);
  return n.setHours(t), n;
}
function vb(e, t) {
  const n = new Date(e);
  return n.setMinutes(t), n;
}
function hb(e, t) {
  const n = new Date(e);
  return n.setMonth(t), n;
}
function gb(e, t) {
  const n = new Date(e);
  return n.setDate(t), n;
}
function yb(e, t) {
  const n = new Date(e);
  return n.setFullYear(t), n;
}
function bs(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
}
function pb(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
}
class bb {
  constructor(t) {
    this.locale = t.locale, this.formats = t.formats;
  }
  date(t) {
    return Hf(t);
  }
  toJsDate(t) {
    return t;
  }
  toISO(t) {
    return zp(this, t);
  }
  parseISO(t) {
    return Up(t);
  }
  addMinutes(t, n) {
    return Wp(t, n);
  }
  addHours(t, n) {
    return qp(t, n);
  }
  addDays(t, n) {
    return Kp(t, n);
  }
  addWeeks(t, n) {
    return Gp(t, n);
  }
  addMonths(t, n) {
    return Yp(t, n);
  }
  getWeekArray(t, n) {
    return Mp(t, this.locale, n ? Number(n) : void 0);
  }
  startOfWeek(t, n) {
    return Bp(t, this.locale, n ? Number(n) : void 0);
  }
  endOfWeek(t) {
    return Fp(t, this.locale);
  }
  startOfMonth(t) {
    return Lf(t);
  }
  endOfMonth(t) {
    return Rf(t);
  }
  format(t, n) {
    return jp(t, n, this.locale, this.formats);
  }
  isEqual(t, n) {
    return lc(t, n);
  }
  isValid(t) {
    return ab(t);
  }
  isWithinRange(t, n) {
    return lb(t, n);
  }
  isAfter(t, n) {
    return Kl(t, n);
  }
  isAfterDay(t, n) {
    return sb(t, n);
  }
  isBefore(t, n) {
    return !Kl(t, n) && !lc(t, n);
  }
  isSameDay(t, n) {
    return ub(t, n);
  }
  isSameMonth(t, n) {
    return cb(t, n);
  }
  isSameYear(t, n) {
    return db(t, n);
  }
  setMinutes(t, n) {
    return vb(t, n);
  }
  setHours(t, n) {
    return mb(t, n);
  }
  setMonth(t, n) {
    return hb(t, n);
  }
  setDate(t, n) {
    return gb(t, n);
  }
  setYear(t, n) {
    return yb(t, n);
  }
  getDiff(t, n, o) {
    return fb(t, n, o);
  }
  getWeekdays(t) {
    return Hp(this.locale, t ? Number(t) : void 0);
  }
  getYear(t) {
    return Xp(t);
  }
  getMonth(t) {
    return Jp(t);
  }
  getDate(t) {
    return Zp(t);
  }
  getNextMonth(t) {
    return Qp(t);
  }
  getPreviousMonth(t) {
    return eb(t);
  }
  getHours(t) {
    return tb(t);
  }
  getMinutes(t) {
    return nb(t);
  }
  startOfDay(t) {
    return bs(t);
  }
  endOfDay(t) {
    return pb(t);
  }
  startOfYear(t) {
    return ob(t);
  }
  endOfYear(t) {
    return ib(t);
  }
}
const _b = Symbol.for("vuetify:date-options"), ac = Symbol.for("vuetify:date-adapter");
function wb(e, t) {
  const n = kt({
    adapter: bb,
    locale: {
      af: "af-ZA",
      // ar: '', # not the same value for all variants
      bg: "bg-BG",
      ca: "ca-ES",
      ckb: "",
      cs: "cs-CZ",
      de: "de-DE",
      el: "el-GR",
      en: "en-US",
      // es: '', # not the same value for all variants
      et: "et-EE",
      fa: "fa-IR",
      fi: "fi-FI",
      // fr: '', #not the same value for all variants
      hr: "hr-HR",
      hu: "hu-HU",
      he: "he-IL",
      id: "id-ID",
      it: "it-IT",
      ja: "ja-JP",
      ko: "ko-KR",
      lv: "lv-LV",
      lt: "lt-LT",
      nl: "nl-NL",
      no: "no-NO",
      pl: "pl-PL",
      pt: "pt-PT",
      ro: "ro-RO",
      ru: "ru-RU",
      sk: "sk-SK",
      sl: "sl-SI",
      srCyrl: "sr-SP",
      srLatn: "sr-SP",
      sv: "sv-SE",
      th: "th-TH",
      tr: "tr-TR",
      az: "az-AZ",
      uk: "uk-UA",
      vi: "vi-VN",
      zhHans: "zh-CN",
      zhHant: "zh-TW"
    }
  }, e);
  return {
    options: n,
    instance: kb(n, t)
  };
}
function kb(e, t) {
  const n = gt(typeof e.adapter == "function" ? new e.adapter({
    locale: e.locale[t.current.value] ?? t.current.value,
    formats: e.formats
  }) : e.adapter);
  return ge(t.current, (o) => {
    n.locale = e.locale[o] ?? o ?? n.locale;
  }), n;
}
const ma = ["sm", "md", "lg", "xl", "xxl"], _s = Symbol.for("vuetify:display"), sc = {
  mobileBreakpoint: "lg",
  thresholds: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
    xxl: 2560
  }
}, Sb = function() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : sc;
  return kt(sc, e);
};
function rc(e) {
  return je && !e ? window.innerWidth : typeof e == "object" && e.clientWidth || 0;
}
function uc(e) {
  return je && !e ? window.innerHeight : typeof e == "object" && e.clientHeight || 0;
}
function cc(e) {
  const t = je && !e ? window.navigator.userAgent : "ssr";
  function n(v) {
    return !!t.match(v);
  }
  const o = n(/android/i), i = n(/iphone|ipad|ipod/i), l = n(/cordova/i), a = n(/electron/i), s = n(/chrome/i), r = n(/edge/i), d = n(/firefox/i), c = n(/opera/i), f = n(/win/i), m = n(/mac/i), h = n(/linux/i);
  return {
    android: o,
    ios: i,
    cordova: l,
    electron: a,
    chrome: s,
    edge: r,
    firefox: d,
    opera: c,
    win: f,
    mac: m,
    linux: h,
    touch: zy,
    ssr: t === "ssr"
  };
}
function Cb(e, t) {
  const {
    thresholds: n,
    mobileBreakpoint: o
  } = Sb(e), i = he(uc(t)), l = he(cc(t)), a = gt({}), s = he(rc(t));
  function r() {
    i.value = uc(), s.value = rc();
  }
  function d() {
    r(), l.value = cc();
  }
  return Ut(() => {
    const c = s.value < n.sm, f = s.value < n.md && !c, m = s.value < n.lg && !(f || c), h = s.value < n.xl && !(m || f || c), v = s.value < n.xxl && !(h || m || f || c), g = s.value >= n.xxl, y = c ? "xs" : f ? "sm" : m ? "md" : h ? "lg" : v ? "xl" : "xxl", w = typeof o == "number" ? o : n[o], E = s.value < w;
    a.xs = c, a.sm = f, a.md = m, a.lg = h, a.xl = v, a.xxl = g, a.smAndUp = !c, a.mdAndUp = !(c || f), a.lgAndUp = !(c || f || m), a.xlAndUp = !(c || f || m || h), a.smAndDown = !(m || h || v || g), a.mdAndDown = !(h || v || g), a.lgAndDown = !(v || g), a.xlAndDown = !g, a.name = y, a.height = i.value, a.width = s.value, a.mobile = E, a.mobileBreakpoint = o, a.platform = l.value, a.thresholds = n;
  }), je && window.addEventListener("resize", r, {
    passive: !0
  }), {
    ...js(a),
    update: d,
    ssr: !!t
  };
}
const Eb = W({
  mobile: {
    type: Boolean,
    default: !1
  },
  mobileBreakpoint: [Number, String]
}, "display");
function vr() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn();
  const n = Ge(_s);
  if (!n) throw new Error("Could not find Vuetify display injection");
  const o = p(() => {
    if (e.mobile != null) return e.mobile;
    if (!e.mobileBreakpoint) return n.mobile.value;
    const l = typeof e.mobileBreakpoint == "number" ? e.mobileBreakpoint : n.thresholds.value[e.mobileBreakpoint];
    return n.width.value < l;
  }), i = p(() => t ? {
    [`${t}--mobile`]: o.value
  } : {});
  return {
    ...n,
    displayClasses: i,
    mobile: o
  };
}
const jf = Symbol.for("vuetify:goto");
function zf() {
  return {
    container: void 0,
    duration: 300,
    layout: !1,
    offset: 0,
    easing: "easeInOutCubic",
    patterns: {
      linear: (e) => e,
      easeInQuad: (e) => e ** 2,
      easeOutQuad: (e) => e * (2 - e),
      easeInOutQuad: (e) => e < 0.5 ? 2 * e ** 2 : -1 + (4 - 2 * e) * e,
      easeInCubic: (e) => e ** 3,
      easeOutCubic: (e) => --e ** 3 + 1,
      easeInOutCubic: (e) => e < 0.5 ? 4 * e ** 3 : (e - 1) * (2 * e - 2) * (2 * e - 2) + 1,
      easeInQuart: (e) => e ** 4,
      easeOutQuart: (e) => 1 - --e ** 4,
      easeInOutQuart: (e) => e < 0.5 ? 8 * e ** 4 : 1 - 8 * --e ** 4,
      easeInQuint: (e) => e ** 5,
      easeOutQuint: (e) => 1 + --e ** 5,
      easeInOutQuint: (e) => e < 0.5 ? 16 * e ** 5 : 1 + 16 * --e ** 5
    }
  };
}
function xb(e) {
  return hr(e) ?? (document.scrollingElement || document.body);
}
function hr(e) {
  return typeof e == "string" ? document.querySelector(e) : ar(e);
}
function Ha(e, t, n) {
  if (typeof e == "number") return t && n ? -e : e;
  let o = hr(e), i = 0;
  for (; o; )
    i += t ? o.offsetLeft : o.offsetTop, o = o.offsetParent;
  return i;
}
function Vb(e, t) {
  return {
    rtl: t.isRtl,
    options: kt(zf(), e)
  };
}
async function dc(e, t, n, o) {
  const i = n ? "scrollLeft" : "scrollTop", l = kt((o == null ? void 0 : o.options) ?? zf(), t), a = o == null ? void 0 : o.rtl.value, s = (typeof e == "number" ? e : hr(e)) ?? 0, r = l.container === "parent" && s instanceof HTMLElement ? s.parentElement : xb(l.container), d = typeof l.easing == "function" ? l.easing : l.patterns[l.easing];
  if (!d) throw new TypeError(`Easing function "${l.easing}" not found.`);
  let c;
  if (typeof s == "number")
    c = Ha(s, n, a);
  else if (c = Ha(s, n, a) - Ha(r, n, a), l.layout) {
    const v = window.getComputedStyle(s).getPropertyValue("--v-layout-top");
    v && (c -= parseInt(v, 10));
  }
  c += l.offset, c = Tb(r, c, !!a, !!n);
  const f = r[i] ?? 0;
  if (c === f) return Promise.resolve(c);
  const m = performance.now();
  return new Promise((h) => requestAnimationFrame(function v(g) {
    const w = (g - m) / l.duration, E = Math.floor(f + (c - f) * d(zt(w, 0, 1)));
    if (r[i] = E, w >= 1 && Math.abs(E - r[i]) < 10)
      return h(c);
    if (w > 2)
      return xn("Scroll target is not reachable"), h(r[i]);
    requestAnimationFrame(v);
  }));
}
function Nb() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const t = Ge(jf), {
    isRtl: n
  } = $t();
  if (!t) throw new Error("[Vuetify] Could not find injected goto instance");
  const o = {
    ...t,
    // can be set via VLocaleProvider
    rtl: p(() => t.rtl.value || n.value)
  };
  async function i(l, a) {
    return dc(l, kt(e, a), !1, o);
  }
  return i.horizontal = async (l, a) => dc(l, kt(e, a), !0, o), i;
}
function Tb(e, t, n, o) {
  const {
    scrollWidth: i,
    scrollHeight: l
  } = e, [a, s] = e === document.scrollingElement ? [window.innerWidth, window.innerHeight] : [e.offsetWidth, e.offsetHeight];
  let r, d;
  return o ? n ? (r = -(i - a), d = 0) : (r = 0, d = i - a) : (r = 0, d = l + -s), Math.max(Math.min(t, d), r);
}
const Ob = {
  collapse: "mdi-chevron-up",
  complete: "mdi-check",
  cancel: "mdi-close-circle",
  close: "mdi-close",
  delete: "mdi-close-circle",
  // delete (e.g. v-chip close)
  clear: "mdi-close-circle",
  success: "mdi-check-circle",
  info: "mdi-information",
  warning: "mdi-alert-circle",
  error: "mdi-close-circle",
  prev: "mdi-chevron-left",
  next: "mdi-chevron-right",
  checkboxOn: "mdi-checkbox-marked",
  checkboxOff: "mdi-checkbox-blank-outline",
  checkboxIndeterminate: "mdi-minus-box",
  delimiter: "mdi-circle",
  // for carousel
  sortAsc: "mdi-arrow-up",
  sortDesc: "mdi-arrow-down",
  expand: "mdi-chevron-down",
  menu: "mdi-menu",
  subgroup: "mdi-menu-down",
  dropdown: "mdi-menu-down",
  radioOn: "mdi-radiobox-marked",
  radioOff: "mdi-radiobox-blank",
  edit: "mdi-pencil",
  ratingEmpty: "mdi-star-outline",
  ratingFull: "mdi-star",
  ratingHalf: "mdi-star-half-full",
  loading: "mdi-cached",
  first: "mdi-page-first",
  last: "mdi-page-last",
  unfold: "mdi-unfold-more-horizontal",
  file: "mdi-paperclip",
  plus: "mdi-plus",
  minus: "mdi-minus",
  calendar: "mdi-calendar",
  treeviewCollapse: "mdi-menu-down",
  treeviewExpand: "mdi-menu-right",
  eyeDropper: "mdi-eyedropper"
}, Ab = {
  // Not using mergeProps here, functional components merge props by default (?)
  component: (e) => co(Wf, {
    ...e,
    class: "mdi"
  })
}, ze = [String, Function, Object, Array], ws = Symbol.for("vuetify:icons"), va = W({
  icon: {
    type: ze
  },
  // Could not remove this and use makeTagProps, types complained because it is not required
  tag: {
    type: String,
    required: !0
  }
}, "icon"), fc = de()({
  name: "VComponentIcon",
  props: va(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return () => {
      const o = e.icon;
      return u(e.tag, null, {
        default: () => {
          var i;
          return [e.icon ? u(o, null, null) : (i = n.default) == null ? void 0 : i.call(n)];
        }
      });
    };
  }
}), Uf = si({
  name: "VSvgIcon",
  inheritAttrs: !1,
  props: va(),
  setup(e, t) {
    let {
      attrs: n
    } = t;
    return () => u(e.tag, be(n, {
      style: null
    }), {
      default: () => [u("svg", {
        class: "v-icon__svg",
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        role: "img",
        "aria-hidden": "true"
      }, [Array.isArray(e.icon) ? e.icon.map((o) => Array.isArray(o) ? u("path", {
        d: o[0],
        "fill-opacity": o[1]
      }, null) : u("path", {
        d: o
      }, null)) : u("path", {
        d: e.icon
      }, null)])]
    });
  }
});
si({
  name: "VLigatureIcon",
  props: va(),
  setup(e) {
    return () => u(e.tag, null, {
      default: () => [e.icon]
    });
  }
});
const Wf = si({
  name: "VClassIcon",
  props: va(),
  setup(e) {
    return () => u(e.tag, {
      class: e.icon
    }, null);
  }
});
function Ib() {
  return {
    svg: {
      component: Uf
    },
    class: {
      component: Wf
    }
  };
}
function Pb(e) {
  const t = Ib(), n = (e == null ? void 0 : e.defaultSet) ?? "mdi";
  return n === "mdi" && !t.mdi && (t.mdi = Ab), kt({
    defaultSet: n,
    sets: t,
    aliases: {
      ...Ob,
      /* eslint-disable max-len */
      vuetify: ["M8.2241 14.2009L12 21L22 3H14.4459L8.2241 14.2009Z", ["M7.26303 12.4733L7.00113 12L2 3H12.5261C12.5261 3 12.5261 3 12.5261 3L7.26303 12.4733Z", 0.6]],
      "vuetify-outline": "svg:M7.26 12.47 12.53 3H2L7.26 12.47ZM14.45 3 8.22 14.2 12 21 22 3H14.45ZM18.6 5 12 16.88 10.51 14.2 15.62 5ZM7.26 8.35 5.4 5H9.13L7.26 8.35Z",
      "vuetify-play": ["m6.376 13.184-4.11-7.192C1.505 4.66 2.467 3 4.003 3h8.532l-.953 1.576-.006.01-.396.677c-.429.732-.214 1.507.194 2.015.404.503 1.092.878 1.869.806a3.72 3.72 0 0 1 1.005.022c.276.053.434.143.523.237.138.146.38.635-.25 2.09-.893 1.63-1.553 1.722-1.847 1.677-.213-.033-.468-.158-.756-.406a4.95 4.95 0 0 1-.8-.927c-.39-.564-1.04-.84-1.66-.846-.625-.006-1.316.27-1.693.921l-.478.826-.911 1.506Z", ["M9.093 11.552c.046-.079.144-.15.32-.148a.53.53 0 0 1 .43.207c.285.414.636.847 1.046 1.2.405.35.914.662 1.516.754 1.334.205 2.502-.698 3.48-2.495l.014-.028.013-.03c.687-1.574.774-2.852-.005-3.675-.37-.391-.861-.586-1.333-.676a5.243 5.243 0 0 0-1.447-.044c-.173.016-.393-.073-.54-.257-.145-.18-.127-.316-.082-.392l.393-.672L14.287 3h5.71c1.536 0 2.499 1.659 1.737 2.992l-7.997 13.996c-.768 1.344-2.706 1.344-3.473 0l-3.037-5.314 1.377-2.278.004-.006.004-.007.481-.831Z", 0.6]]
      /* eslint-enable max-len */
    }
  }, e);
}
const Db = (e) => {
  const t = Ge(ws);
  if (!t) throw new Error("Missing Vuetify Icons provide!");
  return {
    iconData: p(() => {
      var r;
      const o = an(e);
      if (!o) return {
        component: fc
      };
      let i = o;
      if (typeof i == "string" && (i = i.trim(), i.startsWith("$") && (i = (r = t.aliases) == null ? void 0 : r[i.slice(1)])), i || xn(`Could not find aliased icon "${o}"`), Array.isArray(i))
        return {
          component: Uf,
          icon: i
        };
      if (typeof i != "string")
        return {
          component: fc,
          icon: i
        };
      const l = Object.keys(t.sets).find((d) => typeof i == "string" && i.startsWith(`${d}:`)), a = l ? i.slice(l.length + 1) : i;
      return {
        component: t.sets[l ?? t.defaultSet].component,
        icon: a
      };
    })
  };
}, Mi = Symbol.for("vuetify:theme"), nt = W({
  theme: String
}, "theme");
function mc() {
  return {
    defaultTheme: "light",
    variations: {
      colors: [],
      lighten: 0,
      darken: 0
    },
    themes: {
      light: {
        dark: !1,
        colors: {
          background: "#FFFFFF",
          surface: "#FFFFFF",
          "surface-bright": "#FFFFFF",
          "surface-light": "#EEEEEE",
          "surface-variant": "#424242",
          "on-surface-variant": "#EEEEEE",
          primary: "#1867C0",
          "primary-darken-1": "#1F5592",
          secondary: "#48A9A6",
          "secondary-darken-1": "#018786",
          error: "#B00020",
          info: "#2196F3",
          success: "#4CAF50",
          warning: "#FB8C00"
        },
        variables: {
          "border-color": "#000000",
          "border-opacity": 0.12,
          "high-emphasis-opacity": 0.87,
          "medium-emphasis-opacity": 0.6,
          "disabled-opacity": 0.38,
          "idle-opacity": 0.04,
          "hover-opacity": 0.04,
          "focus-opacity": 0.12,
          "selected-opacity": 0.08,
          "activated-opacity": 0.12,
          "pressed-opacity": 0.12,
          "dragged-opacity": 0.08,
          "theme-kbd": "#212529",
          "theme-on-kbd": "#FFFFFF",
          "theme-code": "#F5F5F5",
          "theme-on-code": "#000000"
        }
      },
      dark: {
        dark: !0,
        colors: {
          background: "#121212",
          surface: "#212121",
          "surface-bright": "#ccbfd6",
          "surface-light": "#424242",
          "surface-variant": "#a3a3a3",
          "on-surface-variant": "#424242",
          primary: "#2196F3",
          "primary-darken-1": "#277CC1",
          secondary: "#54B6B2",
          "secondary-darken-1": "#48A9A6",
          error: "#CF6679",
          info: "#2196F3",
          success: "#4CAF50",
          warning: "#FB8C00"
        },
        variables: {
          "border-color": "#FFFFFF",
          "border-opacity": 0.12,
          "high-emphasis-opacity": 1,
          "medium-emphasis-opacity": 0.7,
          "disabled-opacity": 0.5,
          "idle-opacity": 0.1,
          "hover-opacity": 0.04,
          "focus-opacity": 0.12,
          "selected-opacity": 0.08,
          "activated-opacity": 0.12,
          "pressed-opacity": 0.16,
          "dragged-opacity": 0.08,
          "theme-kbd": "#212529",
          "theme-on-kbd": "#FFFFFF",
          "theme-code": "#343434",
          "theme-on-code": "#CCCCCC"
        }
      }
    }
  };
}
function $b() {
  var o, i;
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : mc();
  const t = mc();
  if (!e) return {
    ...t,
    isDisabled: !0
  };
  const n = {};
  for (const [l, a] of Object.entries(e.themes ?? {})) {
    const s = a.dark || l === "dark" ? (o = t.themes) == null ? void 0 : o.dark : (i = t.themes) == null ? void 0 : i.light;
    n[l] = kt(s, a);
  }
  return kt(t, {
    ...e,
    themes: n
  });
}
function Mb(e) {
  const t = $b(e), n = ie(t.defaultTheme), o = ie(t.themes), i = p(() => {
    const c = {};
    for (const [f, m] of Object.entries(o.value)) {
      const h = c[f] = {
        ...m,
        colors: {
          ...m.colors
        }
      };
      if (t.variations)
        for (const v of t.variations.colors) {
          const g = h.colors[v];
          if (g)
            for (const y of ["lighten", "darken"]) {
              const w = y === "lighten" ? bp : _p;
              for (const E of lr(t.variations[y], 1))
                h.colors[`${v}-${y}-${E}`] = gp(w(Sn(g), E));
            }
        }
      for (const v of Object.keys(h.colors)) {
        if (/^on-[a-z]/.test(v) || h.colors[`on-${v}`]) continue;
        const g = `on-${v}`, y = Sn(h.colors[v]);
        h.colors[g] = If(y);
      }
    }
    return c;
  }), l = p(() => i.value[n.value]), a = p(() => {
    var v;
    const c = [];
    (v = l.value) != null && v.dark && po(c, ":root", ["color-scheme: dark"]), po(c, ":root", vc(l.value));
    for (const [g, y] of Object.entries(i.value))
      po(c, `.v-theme--${g}`, [`color-scheme: ${y.dark ? "dark" : "normal"}`, ...vc(y)]);
    const f = [], m = [], h = new Set(Object.values(i.value).flatMap((g) => Object.keys(g.colors)));
    for (const g of h)
      /^on-[a-z]/.test(g) ? po(m, `.${g}`, [`color: rgb(var(--v-theme-${g})) !important`]) : (po(f, `.bg-${g}`, [`--v-theme-overlay-multiplier: var(--v-theme-${g}-overlay-multiplier)`, `background-color: rgb(var(--v-theme-${g})) !important`, `color: rgb(var(--v-theme-on-${g})) !important`]), po(m, `.text-${g}`, [`color: rgb(var(--v-theme-${g})) !important`]), po(m, `.border-${g}`, [`--v-border-color: var(--v-theme-${g})`]));
    return c.push(...f, ...m), c.map((g, y) => y === 0 ? g : `    ${g}`).join("");
  });
  function s() {
    return {
      style: [{
        children: a.value,
        id: "vuetify-theme-stylesheet",
        nonce: t.cspNonce || !1
      }]
    };
  }
  function r(c) {
    if (t.isDisabled) return;
    const f = c._context.provides.usehead;
    if (f)
      if (f.push) {
        const m = f.push(s);
        je && ge(a, () => {
          m.patch(s);
        });
      } else
        je ? (f.addHeadObjs(p(s)), Ut(() => f.updateDOM())) : f.addHeadObjs(s());
    else {
      let h = function() {
        if (typeof document < "u" && !m) {
          const v = document.createElement("style");
          v.type = "text/css", v.id = "vuetify-theme-stylesheet", t.cspNonce && v.setAttribute("nonce", t.cspNonce), m = v, document.head.appendChild(m);
        }
        m && (m.innerHTML = a.value);
      }, m = je ? document.getElementById("vuetify-theme-stylesheet") : null;
      je ? ge(a, h, {
        immediate: !0
      }) : h();
    }
  }
  const d = p(() => t.isDisabled ? void 0 : `v-theme--${n.value}`);
  return {
    install: r,
    isDisabled: t.isDisabled,
    name: n,
    themes: o,
    current: l,
    computedThemes: i,
    themeClasses: d,
    styles: a,
    global: {
      name: n,
      current: l
    }
  };
}
function ct(e) {
  at("provideTheme");
  const t = Ge(Mi, null);
  if (!t) throw new Error("Could not find Vuetify theme injection");
  const n = p(() => e.theme ?? t.name.value), o = p(() => t.themes.value[n.value]), i = p(() => t.isDisabled ? void 0 : `v-theme--${n.value}`), l = {
    ...t,
    name: n,
    current: o,
    themeClasses: i
  };
  return ht(Mi, l), l;
}
function qf() {
  at("useTheme");
  const e = Ge(Mi, null);
  if (!e) throw new Error("Could not find Vuetify theme injection");
  return e;
}
function po(e, t, n) {
  e.push(`${t} {
`, ...n.map((o) => `  ${o};
`), `}
`);
}
function vc(e) {
  const t = e.dark ? 2 : 1, n = e.dark ? 1 : 2, o = [];
  for (const [i, l] of Object.entries(e.colors)) {
    const a = Sn(l);
    o.push(`--v-theme-${i}: ${a.r},${a.g},${a.b}`), i.startsWith("on-") || o.push(`--v-theme-${i}-overlay-multiplier: ${wp(l) > 0.18 ? t : n}`);
  }
  for (const [i, l] of Object.entries(e.variables)) {
    const a = typeof l == "string" && l.startsWith("#") ? Sn(l) : void 0, s = a ? `${a.r}, ${a.g}, ${a.b}` : void 0;
    o.push(`--v-${i}: ${s ?? l}`);
  }
  return o;
}
function ni(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "content";
  const n = gs(), o = ie();
  if (je) {
    const i = new ResizeObserver((l) => {
      l.length && (t === "content" ? o.value = l[0].contentRect : o.value = l[0].target.getBoundingClientRect());
    });
    pt(() => {
      i.disconnect();
    }), ge(() => n.el, (l, a) => {
      a && (i.unobserve(a), o.value = void 0), l && i.observe(l);
    }, {
      flush: "post"
    });
  }
  return {
    resizeRef: n,
    contentRect: Wi(o)
  };
}
const Bi = Symbol.for("vuetify:layout"), Kf = Symbol.for("vuetify:layout-item"), hc = 1e3, Bb = W({
  overlaps: {
    type: Array,
    default: () => []
  },
  fullHeight: Boolean
}, "layout"), Gf = W({
  name: {
    type: String
  },
  order: {
    type: [Number, String],
    default: 0
  },
  absolute: Boolean
}, "layout-item");
function Yf() {
  const e = Ge(Bi);
  if (!e) throw new Error("[Vuetify] Could not find injected layout");
  return {
    getLayoutItem: e.getLayoutItem,
    mainRect: e.mainRect,
    mainStyles: e.mainStyles
  };
}
function Xf(e) {
  const t = Ge(Bi);
  if (!t) throw new Error("[Vuetify] Could not find injected layout");
  const n = e.id ?? `layout-item-${gn()}`, o = at("useLayoutItem");
  ht(Kf, {
    id: n
  });
  const i = he(!1);
  Ks(() => i.value = !0), Id(() => i.value = !1);
  const {
    layoutItemStyles: l,
    layoutItemScrimStyles: a
  } = t.register(o, {
    ...e,
    active: p(() => i.value ? !1 : e.active.value),
    id: n
  });
  return pt(() => t.unregister(n)), {
    layoutItemStyles: l,
    layoutRect: t.layoutRect,
    layoutItemScrimStyles: a
  };
}
const Fb = (e, t, n, o) => {
  let i = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  };
  const l = [{
    id: "",
    layer: {
      ...i
    }
  }];
  for (const a of e) {
    const s = t.get(a), r = n.get(a), d = o.get(a);
    if (!s || !r || !d) continue;
    const c = {
      ...i,
      [s.value]: parseInt(i[s.value], 10) + (d.value ? parseInt(r.value, 10) : 0)
    };
    l.push({
      id: a,
      layer: c
    }), i = c;
  }
  return l;
};
function Lb(e) {
  const t = Ge(Bi, null), n = p(() => t ? t.rootZIndex.value - 100 : hc), o = ie([]), i = gt(/* @__PURE__ */ new Map()), l = gt(/* @__PURE__ */ new Map()), a = gt(/* @__PURE__ */ new Map()), s = gt(/* @__PURE__ */ new Map()), r = gt(/* @__PURE__ */ new Map()), {
    resizeRef: d,
    contentRect: c
  } = ni(), f = p(() => {
    const x = /* @__PURE__ */ new Map(), I = e.overlaps ?? [];
    for (const N of I.filter((T) => T.includes(":"))) {
      const [T, $] = N.split(":");
      if (!o.value.includes(T) || !o.value.includes($)) continue;
      const O = i.get(T), k = i.get($), D = l.get(T), R = l.get($);
      !O || !k || !D || !R || (x.set($, {
        position: O.value,
        amount: parseInt(D.value, 10)
      }), x.set(T, {
        position: k.value,
        amount: -parseInt(R.value, 10)
      }));
    }
    return x;
  }), m = p(() => {
    const x = [...new Set([...a.values()].map((N) => N.value))].sort((N, T) => N - T), I = [];
    for (const N of x) {
      const T = o.value.filter(($) => {
        var O;
        return ((O = a.get($)) == null ? void 0 : O.value) === N;
      });
      I.push(...T);
    }
    return Fb(I, i, l, s);
  }), h = p(() => !Array.from(r.values()).some((x) => x.value)), v = p(() => m.value[m.value.length - 1].layer), g = p(() => ({
    "--v-layout-left": pe(v.value.left),
    "--v-layout-right": pe(v.value.right),
    "--v-layout-top": pe(v.value.top),
    "--v-layout-bottom": pe(v.value.bottom),
    ...h.value ? void 0 : {
      transition: "none"
    }
  })), y = p(() => m.value.slice(1).map((x, I) => {
    let {
      id: N
    } = x;
    const {
      layer: T
    } = m.value[I], $ = l.get(N), O = i.get(N);
    return {
      id: N,
      ...T,
      size: Number($.value),
      position: O.value
    };
  })), w = (x) => y.value.find((I) => I.id === x), E = at("createLayout"), A = he(!1);
  vn(() => {
    A.value = !0;
  }), ht(Bi, {
    register: (x, I) => {
      let {
        id: N,
        order: T,
        position: $,
        layoutSize: O,
        elementSize: k,
        active: D,
        disableTransitions: R,
        absolute: G
      } = I;
      a.set(N, T), i.set(N, $), l.set(N, O), s.set(N, D), R && r.set(N, R);
      const oe = Ko(Kf, E == null ? void 0 : E.vnode).indexOf(x);
      oe > -1 ? o.value.splice(oe, 0, N) : o.value.push(N);
      const ee = p(() => y.value.findIndex((K) => K.id === N)), B = p(() => n.value + m.value.length * 2 - ee.value * 2), M = p(() => {
        const K = $.value === "left" || $.value === "right", Ne = $.value === "right", we = $.value === "bottom", Ie = k.value ?? O.value, J = Ie === 0 ? "%" : "px", ke = {
          [$.value]: 0,
          zIndex: B.value,
          transform: `translate${K ? "X" : "Y"}(${(D.value ? 0 : -(Ie === 0 ? 100 : Ie)) * (Ne || we ? -1 : 1)}${J})`,
          position: G.value || n.value !== hc ? "absolute" : "fixed",
          ...h.value ? void 0 : {
            transition: "none"
          }
        };
        if (!A.value) return ke;
        const Pe = y.value[ee.value];
        if (!Pe) throw new Error(`[Vuetify] Could not find layout item "${N}"`);
        const Xe = f.value.get(N);
        return Xe && (Pe[Xe.position] += Xe.amount), {
          ...ke,
          height: K ? `calc(100% - ${Pe.top}px - ${Pe.bottom}px)` : k.value ? `${k.value}px` : void 0,
          left: Ne ? void 0 : `${Pe.left}px`,
          right: Ne ? `${Pe.right}px` : void 0,
          top: $.value !== "bottom" ? `${Pe.top}px` : void 0,
          bottom: $.value !== "top" ? `${Pe.bottom}px` : void 0,
          width: K ? k.value ? `${k.value}px` : void 0 : `calc(100% - ${Pe.left}px - ${Pe.right}px)`
        };
      }), H = p(() => ({
        zIndex: B.value - 1
      }));
      return {
        layoutItemStyles: M,
        layoutItemScrimStyles: H,
        zIndex: B
      };
    },
    unregister: (x) => {
      a.delete(x), i.delete(x), l.delete(x), s.delete(x), r.delete(x), o.value = o.value.filter((I) => I !== x);
    },
    mainRect: v,
    mainStyles: g,
    getLayoutItem: w,
    items: y,
    layoutRect: c,
    rootZIndex: n
  });
  const P = p(() => ["v-layout", {
    "v-layout--full-height": e.fullHeight
  }]), C = p(() => ({
    zIndex: t ? n.value : void 0,
    position: t ? "relative" : void 0,
    overflow: t ? "hidden" : void 0
  }));
  return {
    layoutClasses: P,
    layoutStyles: C,
    getLayoutItem: w,
    items: y,
    layoutRect: c,
    layoutRef: d
  };
}
function Jf() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const {
    blueprint: t,
    ...n
  } = e, o = kt(t, n), {
    aliases: i = {},
    components: l = {},
    directives: a = {}
  } = o, s = Sp(o.defaults), r = Cb(o.display, o.ssr), d = Mb(o.theme), c = Pb(o.icons), f = Pp(o.locale), m = wb(o.date, f), h = Vb(o.goTo, f);
  return {
    install: (g) => {
      for (const y in a)
        g.directive(y, a[y]);
      for (const y in l)
        g.component(y, l[y]);
      for (const y in i)
        g.component(y, si({
          ...i[y],
          name: y,
          aliasName: i[y].name
        }));
      if (d.install(g), g.provide(ti, s), g.provide(_s, r), g.provide(Mi, d), g.provide(ws, c), g.provide(ql, f), g.provide(_b, m.options), g.provide(ac, m.instance), g.provide(jf, h), je && o.ssr)
        if (g.$nuxt)
          g.$nuxt.hook("app:suspense:resolve", () => {
            r.update();
          });
        else {
          const {
            mount: y
          } = g;
          g.mount = function() {
            const w = y(...arguments);
            return ot(() => r.update()), g.mount = y, w;
          };
        }
      gn.reset(), g.mixin({
        computed: {
          $vuetify() {
            return gt({
              defaults: Uo.call(this, ti),
              display: Uo.call(this, _s),
              theme: Uo.call(this, Mi),
              icons: Uo.call(this, ws),
              locale: Uo.call(this, ql),
              date: Uo.call(this, ac)
            });
          }
        }
      });
    },
    defaults: s,
    display: r,
    theme: d,
    icons: c,
    locale: f,
    date: m,
    goTo: h
  };
}
const Rb = "3.7.4";
Jf.version = Rb;
function Uo(e) {
  var o, i;
  const t = this.$, n = ((o = t.parent) == null ? void 0 : o.provides) ?? ((i = t.vnode.appContext) == null ? void 0 : i.provides);
  if (n && e in n)
    return n[e];
}
const ro = [
  // —— 纯色主题（沿用既有配色，作为设置面板的 4 个快捷图标）——
  {
    id: "white",
    name: "白色",
    type: "solid",
    mode: "day",
    bg: "#F6F6F6",
    surface: "#E9E9E9",
    text: "#142614",
    icon: "mdi-weather-sunny",
    sample: "白底黑字，清爽分明"
  },
  {
    id: "eyecare",
    name: "护眼",
    type: "solid",
    mode: "day",
    bg: "#D3E3D3",
    surface: "#BCD3BC",
    text: "#142614",
    icon: "mdi-eye",
    sample: "绿意护眼，久读不累"
  },
  {
    id: "grey",
    name: "夜灰",
    type: "solid",
    mode: "night",
    bg: "#1A1A1A",
    surface: "#2C2C2C",
    text: "#C3C3C3",
    icon: "mdi-weather-night",
    sample: "暗夜阅读，柔和不刺眼"
  },
  {
    id: "dark",
    name: "纯黑",
    type: "solid",
    mode: "night",
    bg: "#000000",
    surface: "#171717",
    text: "#4B4B4B",
    icon: "mdi-candle",
    sample: "极致省电，深邃沉静"
  },
  // —— 背景图皮肤（每套三图：缩略图 / 竖版 / 横版）——
  {
    id: "zhulin",
    name: "竹林清风",
    type: "image",
    mode: "day",
    bg: "#eef5e4",
    surface: "#dbe9c6",
    text: "#33472f",
    mask: "rgba(255,255,255,0.20)",
    bgTop: "#e9f2db",
    bgBottom: "#d9e8c3",
    thumb: "/themes/skins/zhulin-thumb.svg",
    portrait: "/themes/skins/zhulin-portrait.svg",
    landscape: "/themes/skins/zhulin-landscape.svg",
    sample: "看花饮美酒，听鸟临晴山"
  },
  {
    id: "parchment",
    name: "故纸堆",
    type: "image",
    mode: "day",
    bg: "#f7efd9",
    surface: "#ebdcb4",
    text: "#5a3b1a",
    mask: "rgba(252,246,232,0.20)",
    bgTop: "#f8f0dc",
    bgBottom: "#edddb7",
    thumb: "/themes/skins/parchment-thumb.svg",
    portrait: "/themes/skins/parchment-portrait.svg",
    landscape: "/themes/skins/parchment-landscape.svg",
    sample: "旧纸新墨，字里春秋"
  },
  {
    id: "huitu",
    name: "灰土",
    type: "image",
    mode: "night",
    bg: "#211e1a",
    surface: "#36302a",
    text: "#cfcabf",
    mask: "rgba(20,18,15,0.30)",
    bgTop: "#2e2922",
    bgBottom: "#13100c",
    thumb: "/themes/skins/huitu-thumb.svg",
    portrait: "/themes/skins/huitu-portrait.svg",
    landscape: "/themes/skins/huitu-landscape.svg",
    sample: "荒土残阳，独行天地间"
  },
  {
    id: "xingye",
    name: "星夜",
    type: "image",
    mode: "night",
    bg: "#101730",
    surface: "#1d2a52",
    text: "#cdd6e6",
    mask: "rgba(12,16,32,0.28)",
    bgTop: "#161e37",
    bgBottom: "#080c1c",
    thumb: "/themes/skins/xingye-thumb.svg",
    portrait: "/themes/skins/xingye-portrait.svg",
    landscape: "/themes/skins/xingye-landscape.svg",
    sample: "万族之上，星河为劫"
  }
];
function Bn(e) {
  const t = ro.find((n) => n.id === e);
  return t || (console.error(`[themes] 未找到主题 id="${e}"，已回退到「${ro[0].name}」`), ro[0]);
}
const Hb = Object.fromEntries(
  ro.map((e) => [e.id, { dark: e.mode === "night", colors: { background: e.bg, surface: e.surface } }])
), jb = Jf({
  theme: {
    defaultTheme: "white",
    themes: Hb
  }
}), zb = {
  install: (e, t) => {
    const n = t.server;
    e.config.globalProperties.$alert = function(o, i, l) {
      e.$store.commit("alert", { type: o, msg: i, to: l }), o === "success" && setTimeout(() => {
        e.$store.commit("close_alert");
      }, 1300);
    }, e.config.globalProperties.$backend = async function(o, i) {
      if (o === void 0)
        throw "url is undefined ";
      var l = {
        mode: "cors",
        redirect: "follow",
        credentials: "include",
        timeout: 1e4
        // 添加超时设置
      }, a = n + o;
      i !== void 0 && Object.assign(l, i);
      const s = new AbortController(), r = setTimeout(() => s.abort(), l.timeout || 1e4);
      return fetch(a, {
        ...l,
        signal: s.signal
      }).then((d) => {
        clearTimeout(r);
        var c = "";
        if (d.status === 413)
          throw c = "服务器响应了413异常状态码。<br/>可能是上传的文件过大，超过了服务器设置的上传大小。", e.$alert("error", c), c;
        if (d.status === 502)
          throw c = "服务器正在启动中...", e.$alert("info", c), c;
        try {
          return d.json().then((f) => (d.status !== 200, f));
        } catch {
          throw d.status !== 200 ? (c = "服务器异常，状态码: " + d.status + "<br/>请查阅服务器日志:<br/>talebook.log", e.$alert("error", c), c) : (c = "服务器异常，响应非JSON<br/>请查阅服务器日志:<br/>talebook.log", e.$alert("error", c), c);
        }
      }).then((d) => (d.err === "exception" && (e.$store ? e.$store.commit("alert", { type: "error", msg: d.msg, to: null }) : console.error("API 异常:", d.msg)), d)).catch((d) => {
        clearTimeout(r);
        var c = "";
        return d.name === "AbortError" ? c = "请求超时，请检查网络连接或服务器状态" : navigator.onLine ? c = "请求失败: " + (d.message || "未知错误") : c = "网络连接已断开，请检查网络设置", console.error("API请求失败:", d), { err: "network_error", msg: c, data: {} };
      });
    };
  }
};
function Ub(e, t) {
  e.use(jb).use(zb, t);
}
const On = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [o, i] of t)
    n[o] = i;
  return n;
}, Wb = da("v-alert-title"), Zn = W({
  border: [Boolean, Number, String]
}, "border");
function Qn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn();
  return {
    borderClasses: p(() => {
      const o = Je(e) ? e.value : e.border, i = [];
      if (o === !0 || o === "")
        i.push(`${t}--border`);
      else if (typeof o == "string" || o === 0)
        for (const l of String(o).split(" "))
          i.push(`border-${l}`);
      return i;
    })
  };
}
const qb = [null, "default", "comfortable", "compact"], Kt = W({
  density: {
    type: String,
    default: "default",
    validator: (e) => qb.includes(e)
  }
}, "density");
function tn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn();
  return {
    densityClasses: p(() => `${t}--density-${e.density}`)
  };
}
const An = W({
  elevation: {
    type: [Number, String],
    validator(e) {
      const t = parseInt(e);
      return !isNaN(t) && t >= 0 && // Material Design has a maximum elevation of 24
      // https://material.io/design/environment/elevation.html#default-elevations
      t <= 24;
    }
  }
}, "elevation");
function In(e) {
  return {
    elevationClasses: p(() => {
      const n = Je(e) ? e.value : e.elevation, o = [];
      return n == null || o.push(`elevation-${n}`), o;
    })
  };
}
const St = W({
  rounded: {
    type: [Boolean, Number, String],
    default: void 0
  },
  tile: Boolean
}, "rounded");
function Ct(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn();
  return {
    roundedClasses: p(() => {
      const o = Je(e) ? e.value : e.rounded, i = Je(e) ? e.value : e.tile, l = [];
      if (o === !0 || o === "")
        l.push(`${t}--rounded`);
      else if (typeof o == "string" || o === 0)
        for (const a of String(o).split(" "))
          l.push(`rounded-${a}`);
      else (i || o === !1) && l.push("rounded-0");
      return l;
    })
  };
}
const Ze = W({
  tag: {
    type: String,
    default: "div"
  }
}, "tag");
function gr(e) {
  return ur(() => {
    const t = [], n = {};
    if (e.value.background)
      if (ps(e.value.background)) {
        if (n.backgroundColor = e.value.background, !e.value.text && vp(e.value.background)) {
          const o = Sn(e.value.background);
          if (o.a == null || o.a === 1) {
            const i = If(o);
            n.color = i, n.caretColor = i;
          }
        }
      } else
        t.push(`bg-${e.value.background}`);
    return e.value.text && (ps(e.value.text) ? (n.color = e.value.text, n.caretColor = e.value.text) : t.push(`text-${e.value.text}`)), {
      colorClasses: t,
      colorStyles: n
    };
  });
}
function qt(e, t) {
  const n = p(() => ({
    text: Je(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: o,
    colorStyles: i
  } = gr(n);
  return {
    textColorClasses: o,
    textColorStyles: i
  };
}
function Dt(e, t) {
  const n = p(() => ({
    background: Je(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: o,
    colorStyles: i
  } = gr(n);
  return {
    backgroundColorClasses: o,
    backgroundColorStyles: i
  };
}
const Kb = ["elevated", "flat", "tonal", "outlined", "text", "plain"];
function Ro(e, t) {
  return u(Ee, null, [e && u("span", {
    key: "overlay",
    class: `${t}__overlay`
  }, null), u("span", {
    key: "underlay",
    class: `${t}__underlay`
  }, null)]);
}
const Pn = W({
  color: String,
  variant: {
    type: String,
    default: "elevated",
    validator: (e) => Kb.includes(e)
  }
}, "variant");
function Ho(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn();
  const n = p(() => {
    const {
      variant: l
    } = an(e);
    return `${t}--variant-${l}`;
  }), {
    colorClasses: o,
    colorStyles: i
  } = gr(p(() => {
    const {
      variant: l,
      color: a
    } = an(e);
    return {
      [["elevated", "flat"].includes(l) ? "background" : "text"]: a
    };
  }));
  return {
    colorClasses: o,
    colorStyles: i,
    variantClasses: n
  };
}
const Zf = W({
  baseColor: String,
  divided: Boolean,
  ...Zn(),
  ...Ae(),
  ...Kt(),
  ...An(),
  ...St(),
  ...Ze(),
  ...nt(),
  ...Pn()
}, "VBtnGroup"), Go = de()({
  name: "VBtnGroup",
  props: Zf(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = ct(e), {
      densityClasses: i
    } = tn(e), {
      borderClasses: l
    } = Qn(e), {
      elevationClasses: a
    } = In(e), {
      roundedClasses: s
    } = Ct(e);
    Jn({
      VBtn: {
        height: "auto",
        baseColor: se(e, "baseColor"),
        color: se(e, "color"),
        density: se(e, "density"),
        flat: !0,
        variant: se(e, "variant")
      }
    }), Se(() => u(e.tag, {
      class: ["v-btn-group", {
        "v-btn-group--divided": e.divided
      }, o.value, l.value, i.value, a.value, s.value, e.class],
      style: e.style
    }, n));
  }
}), ha = W({
  modelValue: {
    type: null,
    default: void 0
  },
  multiple: Boolean,
  mandatory: [Boolean, String],
  max: Number,
  selectedClass: String,
  disabled: Boolean
}, "group"), yr = W({
  value: null,
  disabled: Boolean,
  selectedClass: String
}, "group-item");
function pr(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0;
  const o = at("useGroupItem");
  if (!o)
    throw new Error("[Vuetify] useGroupItem composable must be used inside a component setup function");
  const i = gn();
  ht(Symbol.for(`${t.description}:id`), i);
  const l = Ge(t, null);
  if (!l) {
    if (!n) return l;
    throw new Error(`[Vuetify] Could not find useGroup injection with symbol ${t.description}`);
  }
  const a = se(e, "value"), s = p(() => !!(l.disabled.value || e.disabled));
  l.register({
    id: i,
    value: a,
    disabled: s
  }, o), pt(() => {
    l.unregister(i);
  });
  const r = p(() => l.isSelected(i)), d = p(() => l.items.value[0].id === i), c = p(() => l.items.value[l.items.value.length - 1].id === i), f = p(() => r.value && [l.selectedClass.value, e.selectedClass]);
  return ge(r, (m) => {
    o.emit("group:selected", {
      value: m
    });
  }, {
    flush: "sync"
  }), {
    id: i,
    isSelected: r,
    isFirst: d,
    isLast: c,
    toggle: () => l.select(i, !r.value),
    select: (m) => l.select(i, m),
    selectedClass: f,
    value: a,
    disabled: s,
    group: l
  };
}
function Xi(e, t) {
  let n = !1;
  const o = gt([]), i = Ye(e, "modelValue", [], (m) => m == null ? [] : Qf(o, cn(m)), (m) => {
    const h = Yb(o, m);
    return e.multiple ? h : h[0];
  }), l = at("useGroup");
  function a(m, h) {
    const v = m, g = Symbol.for(`${t.description}:id`), w = Ko(g, l == null ? void 0 : l.vnode).indexOf(h);
    an(v.value) == null && (v.value = w, v.useIndexAsValue = !0), w > -1 ? o.splice(w, 0, v) : o.push(v);
  }
  function s(m) {
    if (n) return;
    r();
    const h = o.findIndex((v) => v.id === m);
    o.splice(h, 1);
  }
  function r() {
    const m = o.find((h) => !h.disabled);
    m && e.mandatory === "force" && !i.value.length && (i.value = [m.id]);
  }
  vn(() => {
    r();
  }), pt(() => {
    n = !0;
  }), Ys(() => {
    for (let m = 0; m < o.length; m++)
      o[m].useIndexAsValue && (o[m].value = m);
  });
  function d(m, h) {
    const v = o.find((g) => g.id === m);
    if (!(h && (v != null && v.disabled)))
      if (e.multiple) {
        const g = i.value.slice(), y = g.findIndex((E) => E === m), w = ~y;
        if (h = h ?? !w, w && e.mandatory && g.length <= 1 || !w && e.max != null && g.length + 1 > e.max) return;
        y < 0 && h ? g.push(m) : y >= 0 && !h && g.splice(y, 1), i.value = g;
      } else {
        const g = i.value.includes(m);
        if (e.mandatory && g) return;
        i.value = h ?? !g ? [m] : [];
      }
  }
  function c(m) {
    if (e.multiple && xn('This method is not supported when using "multiple" prop'), i.value.length) {
      const h = i.value[0], v = o.findIndex((w) => w.id === h);
      let g = (v + m) % o.length, y = o[g];
      for (; y.disabled && g !== v; )
        g = (g + m) % o.length, y = o[g];
      if (y.disabled) return;
      i.value = [o[g].id];
    } else {
      const h = o.find((v) => !v.disabled);
      h && (i.value = [h.id]);
    }
  }
  const f = {
    register: a,
    unregister: s,
    selected: i,
    select: d,
    disabled: se(e, "disabled"),
    prev: () => c(o.length - 1),
    next: () => c(1),
    isSelected: (m) => i.value.includes(m),
    selectedClass: p(() => e.selectedClass),
    items: p(() => o),
    getItemIndex: (m) => Gb(o, m)
  };
  return ht(t, f), f;
}
function Gb(e, t) {
  const n = Qf(e, [t]);
  return n.length ? e.findIndex((o) => o.id === n[0]) : -1;
}
function Qf(e, t) {
  const n = [];
  return t.forEach((o) => {
    const i = e.find((a) => ai(o, a.value)), l = e[o];
    (i == null ? void 0 : i.value) != null ? n.push(i.id) : l != null && n.push(l.id);
  }), n;
}
function Yb(e, t) {
  const n = [];
  return t.forEach((o) => {
    const i = e.findIndex((l) => l.id === o);
    if (~i) {
      const l = e[i];
      n.push(l.value != null ? l.value : i);
    }
  }), n;
}
const br = Symbol.for("vuetify:v-btn-toggle"), Xb = W({
  ...Zf(),
  ...ha()
}, "VBtnToggle");
de()({
  name: "VBtnToggle",
  props: Xb(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isSelected: o,
      next: i,
      prev: l,
      select: a,
      selected: s
    } = Xi(e, br);
    return Se(() => {
      const r = Go.filterProps(e);
      return u(Go, be({
        class: ["v-btn-toggle", e.class]
      }, r, {
        style: e.style
      }), {
        default: () => {
          var d;
          return [(d = n.default) == null ? void 0 : d.call(n, {
            isSelected: o,
            next: i,
            prev: l,
            select: a,
            selected: s
          })];
        }
      });
    }), {
      next: i,
      prev: l,
      select: a
    };
  }
});
const Jb = W({
  defaults: Object,
  disabled: Boolean,
  reset: [Number, String],
  root: [Boolean, String],
  scoped: Boolean
}, "VDefaultsProvider"), tt = de(!1)({
  name: "VDefaultsProvider",
  props: Jb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      defaults: o,
      disabled: i,
      reset: l,
      root: a,
      scoped: s
    } = js(e);
    return Jn(o, {
      reset: l,
      root: a,
      scoped: s,
      disabled: i
    }), () => {
      var r;
      return (r = n.default) == null ? void 0 : r.call(n);
    };
  }
}), Zb = ["x-small", "small", "default", "large", "x-large"], Ji = W({
  size: {
    type: [String, Number],
    default: "default"
  }
}, "size");
function Zi(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn();
  return ur(() => {
    let n, o;
    return Hl(Zb, e.size) ? n = `${t}--size-${e.size}` : e.size && (o = {
      width: pe(e.size),
      height: pe(e.size)
    }), {
      sizeClasses: n,
      sizeStyles: o
    };
  });
}
const Qb = W({
  color: String,
  disabled: Boolean,
  start: Boolean,
  end: Boolean,
  icon: ze,
  ...Ae(),
  ...Ji(),
  ...Ze({
    tag: "i"
  }),
  ...nt()
}, "VIcon"), De = de()({
  name: "VIcon",
  props: Qb(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = ie(), {
      themeClasses: l
    } = ct(e), {
      iconData: a
    } = Db(p(() => i.value || e.icon)), {
      sizeClasses: s
    } = Zi(e), {
      textColorClasses: r,
      textColorStyles: d
    } = qt(se(e, "color"));
    return Se(() => {
      var m, h;
      const c = (m = o.default) == null ? void 0 : m.call(o);
      c && (i.value = (h = wf(c).filter((v) => v.type === Lo && v.children && typeof v.children == "string")[0]) == null ? void 0 : h.children);
      const f = !!(n.onClick || n.onClickOnce);
      return u(a.value.component, {
        tag: e.tag,
        icon: a.value.icon,
        class: ["v-icon", "notranslate", l.value, s.value, r.value, {
          "v-icon--clickable": f,
          "v-icon--disabled": e.disabled,
          "v-icon--start": e.start,
          "v-icon--end": e.end
        }, e.class],
        style: [s.value ? void 0 : {
          fontSize: pe(e.size),
          height: pe(e.size),
          width: pe(e.size)
        }, d.value, e.style],
        role: f ? "button" : void 0,
        "aria-hidden": !f,
        tabindex: f ? e.disabled ? -1 : 0 : void 0
      }, {
        default: () => [c]
      });
    }), {};
  }
});
function em(e, t) {
  const n = ie(), o = he(!1);
  if (ir) {
    const i = new IntersectionObserver((l) => {
      o.value = !!l.find((a) => a.isIntersecting);
    }, t);
    pt(() => {
      i.disconnect();
    }), ge(n, (l, a) => {
      a && (i.unobserve(a), o.value = !1), l && i.observe(l);
    }, {
      flush: "post"
    });
  }
  return {
    intersectionRef: n,
    isIntersecting: o
  };
}
const e_ = W({
  bgColor: String,
  color: String,
  indeterminate: [Boolean, String],
  modelValue: {
    type: [Number, String],
    default: 0
  },
  rotate: {
    type: [Number, String],
    default: 0
  },
  width: {
    type: [Number, String],
    default: 4
  },
  ...Ae(),
  ...Ji(),
  ...Ze({
    tag: "div"
  }),
  ...nt()
}, "VProgressCircular"), tm = de()({
  name: "VProgressCircular",
  props: e_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = 20, i = 2 * Math.PI * o, l = ie(), {
      themeClasses: a
    } = ct(e), {
      sizeClasses: s,
      sizeStyles: r
    } = Zi(e), {
      textColorClasses: d,
      textColorStyles: c
    } = qt(se(e, "color")), {
      textColorClasses: f,
      textColorStyles: m
    } = qt(se(e, "bgColor")), {
      intersectionRef: h,
      isIntersecting: v
    } = em(), {
      resizeRef: g,
      contentRect: y
    } = ni(), w = p(() => Math.max(0, Math.min(100, parseFloat(e.modelValue)))), E = p(() => Number(e.width)), A = p(() => r.value ? Number(e.size) : y.value ? y.value.width : Math.max(E.value, 32)), P = p(() => o / (1 - E.value / A.value) * 2), C = p(() => E.value / A.value * P.value), x = p(() => pe((100 - w.value) / 100 * i));
    return Ut(() => {
      h.value = l.value, g.value = l.value;
    }), Se(() => u(e.tag, {
      ref: l,
      class: ["v-progress-circular", {
        "v-progress-circular--indeterminate": !!e.indeterminate,
        "v-progress-circular--visible": v.value,
        "v-progress-circular--disable-shrink": e.indeterminate === "disable-shrink"
      }, a.value, s.value, d.value, e.class],
      style: [r.value, c.value, e.style],
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": e.indeterminate ? void 0 : w.value
    }, {
      default: () => [u("svg", {
        style: {
          transform: `rotate(calc(-90deg + ${Number(e.rotate)}deg))`
        },
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${P.value} ${P.value}`
      }, [u("circle", {
        class: ["v-progress-circular__underlay", f.value],
        style: m.value,
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: o,
        "stroke-width": C.value,
        "stroke-dasharray": i,
        "stroke-dashoffset": 0
      }, null), u("circle", {
        class: "v-progress-circular__overlay",
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: o,
        "stroke-width": C.value,
        "stroke-dasharray": i,
        "stroke-dashoffset": x.value
      }, null)]), n.default && u("div", {
        class: "v-progress-circular__content"
      }, [n.default({
        value: w.value
      })])]
    })), {};
  }
}), Dn = W({
  height: [Number, String],
  maxHeight: [Number, String],
  maxWidth: [Number, String],
  minHeight: [Number, String],
  minWidth: [Number, String],
  width: [Number, String]
}, "dimension");
function $n(e) {
  return {
    dimensionStyles: p(() => {
      const n = {}, o = pe(e.height), i = pe(e.maxHeight), l = pe(e.maxWidth), a = pe(e.minHeight), s = pe(e.minWidth), r = pe(e.width);
      return o != null && (n.height = o), i != null && (n.maxHeight = i), l != null && (n.maxWidth = l), a != null && (n.minHeight = a), s != null && (n.minWidth = s), r != null && (n.width = r), n;
    })
  };
}
const gc = {
  center: "center",
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
}, ui = W({
  location: String
}, "location");
function Qi(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, n = arguments.length > 2 ? arguments[2] : void 0;
  const {
    isRtl: o
  } = $t();
  return {
    locationStyles: p(() => {
      if (!e.location) return {};
      const {
        side: l,
        align: a
      } = ys(e.location.split(" ").length > 1 ? e.location : `${e.location} center`, o.value);
      function s(d) {
        return n ? n(d) : 0;
      }
      const r = {};
      return l !== "center" && (t ? r[gc[l]] = `calc(100% - ${s(l)}px)` : r[l] = 0), a !== "center" ? t ? r[gc[a]] = `calc(100% - ${s(a)}px)` : r[a] = 0 : (l === "center" ? r.top = r.left = "50%" : r[{
        top: "left",
        bottom: "left",
        left: "top",
        right: "top"
      }[l]] = "50%", r.transform = {
        top: "translateX(-50%)",
        bottom: "translateX(-50%)",
        left: "translateY(-50%)",
        right: "translateY(-50%)",
        center: "translate(-50%, -50%)"
      }[l]), r;
    })
  };
}
const t_ = W({
  absolute: Boolean,
  active: {
    type: Boolean,
    default: !0
  },
  bgColor: String,
  bgOpacity: [Number, String],
  bufferValue: {
    type: [Number, String],
    default: 0
  },
  bufferColor: String,
  bufferOpacity: [Number, String],
  clickable: Boolean,
  color: String,
  height: {
    type: [Number, String],
    default: 4
  },
  indeterminate: Boolean,
  max: {
    type: [Number, String],
    default: 100
  },
  modelValue: {
    type: [Number, String],
    default: 0
  },
  opacity: [Number, String],
  reverse: Boolean,
  stream: Boolean,
  striped: Boolean,
  roundedBar: Boolean,
  ...Ae(),
  ...ui({
    location: "top"
  }),
  ...St(),
  ...Ze(),
  ...nt()
}, "VProgressLinear"), _r = de()({
  name: "VProgressLinear",
  props: t_(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    var O;
    let {
      slots: n
    } = t;
    const o = Ye(e, "modelValue"), {
      isRtl: i,
      rtlClasses: l
    } = $t(), {
      themeClasses: a
    } = ct(e), {
      locationStyles: s
    } = Qi(e), {
      textColorClasses: r,
      textColorStyles: d
    } = qt(e, "color"), {
      backgroundColorClasses: c,
      backgroundColorStyles: f
    } = Dt(p(() => e.bgColor || e.color)), {
      backgroundColorClasses: m,
      backgroundColorStyles: h
    } = Dt(p(() => e.bufferColor || e.bgColor || e.color)), {
      backgroundColorClasses: v,
      backgroundColorStyles: g
    } = Dt(e, "color"), {
      roundedClasses: y
    } = Ct(e), {
      intersectionRef: w,
      isIntersecting: E
    } = em(), A = p(() => parseFloat(e.max)), P = p(() => parseFloat(e.height)), C = p(() => zt(parseFloat(e.bufferValue) / A.value * 100, 0, 100)), x = p(() => zt(parseFloat(o.value) / A.value * 100, 0, 100)), I = p(() => i.value !== e.reverse), N = p(() => e.indeterminate ? "fade-transition" : "slide-x-transition"), T = je && ((O = window.matchMedia) == null ? void 0 : O.call(window, "(forced-colors: active)").matches);
    function $(k) {
      if (!w.value) return;
      const {
        left: D,
        right: R,
        width: G
      } = w.value.getBoundingClientRect(), re = I.value ? G - k.clientX + (R - G) : k.clientX - D;
      o.value = Math.round(re / G * A.value);
    }
    return Se(() => u(e.tag, {
      ref: w,
      class: ["v-progress-linear", {
        "v-progress-linear--absolute": e.absolute,
        "v-progress-linear--active": e.active && E.value,
        "v-progress-linear--reverse": I.value,
        "v-progress-linear--rounded": e.rounded,
        "v-progress-linear--rounded-bar": e.roundedBar,
        "v-progress-linear--striped": e.striped
      }, y.value, a.value, l.value, e.class],
      style: [{
        bottom: e.location === "bottom" ? 0 : void 0,
        top: e.location === "top" ? 0 : void 0,
        height: e.active ? pe(P.value) : 0,
        "--v-progress-linear-height": pe(P.value),
        ...e.absolute ? s.value : {}
      }, e.style],
      role: "progressbar",
      "aria-hidden": e.active ? "false" : "true",
      "aria-valuemin": "0",
      "aria-valuemax": e.max,
      "aria-valuenow": e.indeterminate ? void 0 : x.value,
      onClick: e.clickable && $
    }, {
      default: () => [e.stream && u("div", {
        key: "stream",
        class: ["v-progress-linear__stream", r.value],
        style: {
          ...d.value,
          [I.value ? "left" : "right"]: pe(-P.value),
          borderTop: `${pe(P.value / 2)} dotted`,
          opacity: parseFloat(e.bufferOpacity),
          top: `calc(50% - ${pe(P.value / 4)})`,
          width: pe(100 - C.value, "%"),
          "--v-progress-linear-stream-to": pe(P.value * (I.value ? 1 : -1))
        }
      }, null), u("div", {
        class: ["v-progress-linear__background", T ? void 0 : c.value],
        style: [f.value, {
          opacity: parseFloat(e.bgOpacity),
          width: e.stream ? 0 : void 0
        }]
      }, null), u("div", {
        class: ["v-progress-linear__buffer", T ? void 0 : m.value],
        style: [h.value, {
          opacity: parseFloat(e.bufferOpacity),
          width: pe(C.value, "%")
        }]
      }, null), u(Bo, {
        name: N.value
      }, {
        default: () => [e.indeterminate ? u("div", {
          class: "v-progress-linear__indeterminate"
        }, [["long", "short"].map((k) => u("div", {
          key: k,
          class: ["v-progress-linear__indeterminate", k, T ? void 0 : v.value],
          style: g.value
        }, null))]) : u("div", {
          class: ["v-progress-linear__determinate", T ? void 0 : v.value],
          style: [g.value, {
            width: pe(x.value, "%")
          }]
        }, null)]
      }), n.default && u("div", {
        class: "v-progress-linear__content"
      }, [n.default({
        value: x.value,
        buffer: C.value
      })])]
    })), {};
  }
}), wr = W({
  loading: [Boolean, String]
}, "loader");
function kr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn();
  return {
    loaderClasses: p(() => ({
      [`${t}--loading`]: e.loading
    }))
  };
}
function nm(e, t) {
  var o;
  let {
    slots: n
  } = t;
  return u("div", {
    class: `${e.name}__loader`
  }, [((o = n.default) == null ? void 0 : o.call(n, {
    color: e.color,
    isActive: e.active
  })) || u(_r, {
    absolute: e.absolute,
    active: e.active,
    color: e.color,
    height: "2",
    indeterminate: !0
  }, null)]);
}
const n_ = ["static", "relative", "fixed", "absolute", "sticky"], ga = W({
  position: {
    type: String,
    validator: (
      /* istanbul ignore next */
      (e) => n_.includes(e)
    )
  }
}, "position");
function ya(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn();
  return {
    positionClasses: p(() => e.position ? `${t}--${e.position}` : void 0)
  };
}
function o_() {
  const e = at("useRoute");
  return p(() => {
    var t;
    return (t = e == null ? void 0 : e.proxy) == null ? void 0 : t.$route;
  });
}
function i_() {
  var e, t;
  return (t = (e = at("useRouter")) == null ? void 0 : e.proxy) == null ? void 0 : t.$router;
}
function pa(e, t) {
  var f, m;
  const n = tg("RouterLink"), o = p(() => !!(e.href || e.to)), i = p(() => (o == null ? void 0 : o.value) || Ru(t, "click") || Ru(e, "click"));
  if (typeof n == "string" || !("useLink" in n)) {
    const h = se(e, "href");
    return {
      isLink: o,
      isClickable: i,
      href: h,
      linkProps: gt({
        href: h
      })
    };
  }
  const l = p(() => ({
    ...e,
    to: se(() => e.to || "")
  })), a = n.useLink(l.value), s = p(() => e.to ? a : void 0), r = o_(), d = p(() => {
    var h, v, g;
    return s.value ? e.exact ? r.value ? ((g = s.value.isExactActive) == null ? void 0 : g.value) && ai(s.value.route.value.query, r.value.query) : ((v = s.value.isExactActive) == null ? void 0 : v.value) ?? !1 : ((h = s.value.isActive) == null ? void 0 : h.value) ?? !1 : !1;
  }), c = p(() => {
    var h;
    return e.to ? (h = s.value) == null ? void 0 : h.route.value.href : e.href;
  });
  return {
    isLink: o,
    isClickable: i,
    isActive: d,
    route: (f = s.value) == null ? void 0 : f.route,
    navigate: (m = s.value) == null ? void 0 : m.navigate,
    href: c,
    linkProps: gt({
      href: c,
      "aria-current": p(() => d.value ? "page" : void 0)
    })
  };
}
const ba = W({
  href: String,
  replace: Boolean,
  to: [String, Object],
  exact: Boolean
}, "router");
let ja = !1;
function l_(e, t) {
  let n = !1, o, i;
  je && (ot(() => {
    window.addEventListener("popstate", l), o = e == null ? void 0 : e.beforeEach((a, s, r) => {
      ja ? n ? t(r) : r() : setTimeout(() => n ? t(r) : r()), ja = !0;
    }), i = e == null ? void 0 : e.afterEach(() => {
      ja = !1;
    });
  }), At(() => {
    window.removeEventListener("popstate", l), o == null || o(), i == null || i();
  }));
  function l(a) {
    var s;
    (s = a.state) != null && s.replaced || (n = !0, setTimeout(() => n = !1));
  }
}
function a_(e, t) {
  ge(() => {
    var n;
    return (n = e.isActive) == null ? void 0 : n.value;
  }, (n) => {
    e.isLink.value && n && t && ot(() => {
      t(!0);
    });
  }, {
    immediate: !0
  });
}
const ks = Symbol("rippleStop"), s_ = 80;
function yc(e, t) {
  e.style.transform = t, e.style.webkitTransform = t;
}
function Ss(e) {
  return e.constructor.name === "TouchEvent";
}
function om(e) {
  return e.constructor.name === "KeyboardEvent";
}
const r_ = function(e, t) {
  var f;
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, o = 0, i = 0;
  if (!om(e)) {
    const m = t.getBoundingClientRect(), h = Ss(e) ? e.touches[e.touches.length - 1] : e;
    o = h.clientX - m.left, i = h.clientY - m.top;
  }
  let l = 0, a = 0.3;
  (f = t._ripple) != null && f.circle ? (a = 0.15, l = t.clientWidth / 2, l = n.center ? l : l + Math.sqrt((o - l) ** 2 + (i - l) ** 2) / 4) : l = Math.sqrt(t.clientWidth ** 2 + t.clientHeight ** 2) / 2;
  const s = `${(t.clientWidth - l * 2) / 2}px`, r = `${(t.clientHeight - l * 2) / 2}px`, d = n.center ? s : `${o - l}px`, c = n.center ? r : `${i - l}px`;
  return {
    radius: l,
    scale: a,
    x: d,
    y: c,
    centerX: s,
    centerY: r
  };
}, Gl = {
  /* eslint-disable max-statements */
  show(e, t) {
    var h;
    let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    if (!((h = t == null ? void 0 : t._ripple) != null && h.enabled))
      return;
    const o = document.createElement("span"), i = document.createElement("span");
    o.appendChild(i), o.className = "v-ripple__container", n.class && (o.className += ` ${n.class}`);
    const {
      radius: l,
      scale: a,
      x: s,
      y: r,
      centerX: d,
      centerY: c
    } = r_(e, t, n), f = `${l * 2}px`;
    i.className = "v-ripple__animation", i.style.width = f, i.style.height = f, t.appendChild(o);
    const m = window.getComputedStyle(t);
    m && m.position === "static" && (t.style.position = "relative", t.dataset.previousPosition = "static"), i.classList.add("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--visible"), yc(i, `translate(${s}, ${r}) scale3d(${a},${a},${a})`), i.dataset.activated = String(performance.now()), setTimeout(() => {
      i.classList.remove("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--in"), yc(i, `translate(${d}, ${c}) scale3d(1,1,1)`);
    }, 0);
  },
  hide(e) {
    var l;
    if (!((l = e == null ? void 0 : e._ripple) != null && l.enabled)) return;
    const t = e.getElementsByClassName("v-ripple__animation");
    if (t.length === 0) return;
    const n = t[t.length - 1];
    if (n.dataset.isHiding) return;
    n.dataset.isHiding = "true";
    const o = performance.now() - Number(n.dataset.activated), i = Math.max(250 - o, 0);
    setTimeout(() => {
      n.classList.remove("v-ripple__animation--in"), n.classList.add("v-ripple__animation--out"), setTimeout(() => {
        var s;
        e.getElementsByClassName("v-ripple__animation").length === 1 && e.dataset.previousPosition && (e.style.position = e.dataset.previousPosition, delete e.dataset.previousPosition), ((s = n.parentNode) == null ? void 0 : s.parentNode) === e && e.removeChild(n.parentNode);
      }, 300);
    }, i);
  }
};
function im(e) {
  return typeof e > "u" || !!e;
}
function Fi(e) {
  const t = {}, n = e.currentTarget;
  if (!(!(n != null && n._ripple) || n._ripple.touched || e[ks])) {
    if (e[ks] = !0, Ss(e))
      n._ripple.touched = !0, n._ripple.isTouch = !0;
    else if (n._ripple.isTouch) return;
    if (t.center = n._ripple.centered || om(e), n._ripple.class && (t.class = n._ripple.class), Ss(e)) {
      if (n._ripple.showTimerCommit) return;
      n._ripple.showTimerCommit = () => {
        Gl.show(e, n, t);
      }, n._ripple.showTimer = window.setTimeout(() => {
        var o;
        (o = n == null ? void 0 : n._ripple) != null && o.showTimerCommit && (n._ripple.showTimerCommit(), n._ripple.showTimerCommit = null);
      }, s_);
    } else
      Gl.show(e, n, t);
  }
}
function pc(e) {
  e[ks] = !0;
}
function Ft(e) {
  const t = e.currentTarget;
  if (t != null && t._ripple) {
    if (window.clearTimeout(t._ripple.showTimer), e.type === "touchend" && t._ripple.showTimerCommit) {
      t._ripple.showTimerCommit(), t._ripple.showTimerCommit = null, t._ripple.showTimer = window.setTimeout(() => {
        Ft(e);
      });
      return;
    }
    window.setTimeout(() => {
      t._ripple && (t._ripple.touched = !1);
    }), Gl.hide(t);
  }
}
function lm(e) {
  const t = e.currentTarget;
  t != null && t._ripple && (t._ripple.showTimerCommit && (t._ripple.showTimerCommit = null), window.clearTimeout(t._ripple.showTimer));
}
let Li = !1;
function am(e) {
  !Li && (e.keyCode === Mu.enter || e.keyCode === Mu.space) && (Li = !0, Fi(e));
}
function sm(e) {
  Li = !1, Ft(e);
}
function rm(e) {
  Li && (Li = !1, Ft(e));
}
function um(e, t, n) {
  const {
    value: o,
    modifiers: i
  } = t, l = im(o);
  if (l || Gl.hide(e), e._ripple = e._ripple ?? {}, e._ripple.enabled = l, e._ripple.centered = i.center, e._ripple.circle = i.circle, yf(o) && o.class && (e._ripple.class = o.class), l && !n) {
    if (i.stop) {
      e.addEventListener("touchstart", pc, {
        passive: !0
      }), e.addEventListener("mousedown", pc);
      return;
    }
    e.addEventListener("touchstart", Fi, {
      passive: !0
    }), e.addEventListener("touchend", Ft, {
      passive: !0
    }), e.addEventListener("touchmove", lm, {
      passive: !0
    }), e.addEventListener("touchcancel", Ft), e.addEventListener("mousedown", Fi), e.addEventListener("mouseup", Ft), e.addEventListener("mouseleave", Ft), e.addEventListener("keydown", am), e.addEventListener("keyup", sm), e.addEventListener("blur", rm), e.addEventListener("dragstart", Ft, {
      passive: !0
    });
  } else !l && n && cm(e);
}
function cm(e) {
  e.removeEventListener("mousedown", Fi), e.removeEventListener("touchstart", Fi), e.removeEventListener("touchend", Ft), e.removeEventListener("touchmove", lm), e.removeEventListener("touchcancel", Ft), e.removeEventListener("mouseup", Ft), e.removeEventListener("mouseleave", Ft), e.removeEventListener("keydown", am), e.removeEventListener("keyup", sm), e.removeEventListener("dragstart", Ft), e.removeEventListener("blur", rm);
}
function u_(e, t) {
  um(e, t, !1);
}
function c_(e) {
  delete e._ripple, cm(e);
}
function d_(e, t) {
  if (t.value === t.oldValue)
    return;
  const n = im(t.oldValue);
  um(e, t, n);
}
const ci = {
  mounted: u_,
  unmounted: c_,
  updated: d_
}, dm = W({
  active: {
    type: Boolean,
    default: void 0
  },
  activeColor: String,
  baseColor: String,
  symbol: {
    type: null,
    default: br
  },
  flat: Boolean,
  icon: [Boolean, String, Function, Object],
  prependIcon: ze,
  appendIcon: ze,
  block: Boolean,
  readonly: Boolean,
  slim: Boolean,
  stacked: Boolean,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  text: String,
  ...Zn(),
  ...Ae(),
  ...Kt(),
  ...Dn(),
  ...An(),
  ...yr(),
  ...wr(),
  ...ui(),
  ...ga(),
  ...St(),
  ...ba(),
  ...Ji(),
  ...Ze({
    tag: "button"
  }),
  ...nt(),
  ...Pn({
    variant: "elevated"
  })
}, "VBtn"), ce = de()({
  name: "VBtn",
  props: dm(),
  emits: {
    "group:selected": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      themeClasses: i
    } = ct(e), {
      borderClasses: l
    } = Qn(e), {
      densityClasses: a
    } = tn(e), {
      dimensionStyles: s
    } = $n(e), {
      elevationClasses: r
    } = In(e), {
      loaderClasses: d
    } = kr(e), {
      locationStyles: c
    } = Qi(e), {
      positionClasses: f
    } = ya(e), {
      roundedClasses: m
    } = Ct(e), {
      sizeClasses: h,
      sizeStyles: v
    } = Zi(e), g = pr(e, e.symbol, !1), y = pa(e, n), w = p(() => {
      var O;
      return e.active !== void 0 ? e.active : y.isLink.value ? (O = y.isActive) == null ? void 0 : O.value : g == null ? void 0 : g.isSelected.value;
    }), E = p(() => w.value ? e.activeColor ?? e.color : e.color), A = p(() => {
      var k, D;
      return {
        color: (g == null ? void 0 : g.isSelected.value) && (!y.isLink.value || ((k = y.isActive) == null ? void 0 : k.value)) || !g || ((D = y.isActive) == null ? void 0 : D.value) ? E.value ?? e.baseColor : e.baseColor,
        variant: e.variant
      };
    }), {
      colorClasses: P,
      colorStyles: C,
      variantClasses: x
    } = Ho(A), I = p(() => (g == null ? void 0 : g.disabled.value) || e.disabled), N = p(() => e.variant === "elevated" && !(e.disabled || e.flat || e.border)), T = p(() => {
      if (!(e.value === void 0 || typeof e.value == "symbol"))
        return Object(e.value) === e.value ? JSON.stringify(e.value, null, 0) : e.value;
    });
    function $(O) {
      var k;
      I.value || y.isLink.value && (O.metaKey || O.ctrlKey || O.shiftKey || O.button !== 0 || n.target === "_blank") || ((k = y.navigate) == null || k.call(y, O), g == null || g.toggle());
    }
    return a_(y, g == null ? void 0 : g.select), Se(() => {
      const O = y.isLink.value ? "a" : e.tag, k = !!(e.prependIcon || o.prepend), D = !!(e.appendIcon || o.append), R = !!(e.icon && e.icon !== !0);
      return lt(u(O, be({
        type: O === "a" ? void 0 : "button",
        class: ["v-btn", g == null ? void 0 : g.selectedClass.value, {
          "v-btn--active": w.value,
          "v-btn--block": e.block,
          "v-btn--disabled": I.value,
          "v-btn--elevated": N.value,
          "v-btn--flat": e.flat,
          "v-btn--icon": !!e.icon,
          "v-btn--loading": e.loading,
          "v-btn--readonly": e.readonly,
          "v-btn--slim": e.slim,
          "v-btn--stacked": e.stacked
        }, i.value, l.value, P.value, a.value, r.value, d.value, f.value, m.value, h.value, x.value, e.class],
        style: [C.value, s.value, c.value, v.value, e.style],
        "aria-busy": e.loading ? !0 : void 0,
        disabled: I.value || void 0,
        tabindex: e.loading || e.readonly ? -1 : void 0,
        onClick: $,
        value: T.value
      }, y.linkProps), {
        default: () => {
          var G;
          return [Ro(!0, "v-btn"), !e.icon && k && u("span", {
            key: "prepend",
            class: "v-btn__prepend"
          }, [o.prepend ? u(tt, {
            key: "prepend-defaults",
            disabled: !e.prependIcon,
            defaults: {
              VIcon: {
                icon: e.prependIcon
              }
            }
          }, o.prepend) : u(De, {
            key: "prepend-icon",
            icon: e.prependIcon
          }, null)]), u("span", {
            class: "v-btn__content",
            "data-no-activator": ""
          }, [!o.default && R ? u(De, {
            key: "content-icon",
            icon: e.icon
          }, null) : u(tt, {
            key: "content-defaults",
            disabled: !R,
            defaults: {
              VIcon: {
                icon: e.icon
              }
            }
          }, {
            default: () => {
              var re;
              return [((re = o.default) == null ? void 0 : re.call(o)) ?? e.text];
            }
          })]), !e.icon && D && u("span", {
            key: "append",
            class: "v-btn__append"
          }, [o.append ? u(tt, {
            key: "append-defaults",
            disabled: !e.appendIcon,
            defaults: {
              VIcon: {
                icon: e.appendIcon
              }
            }
          }, o.append) : u(De, {
            key: "append-icon",
            icon: e.appendIcon
          }, null)]), !!e.loading && u("span", {
            key: "loader",
            class: "v-btn__loader"
          }, [((G = o.loader) == null ? void 0 : G.call(o)) ?? u(tm, {
            color: typeof e.loading == "boolean" ? void 0 : e.loading,
            indeterminate: !0,
            width: "2"
          }, null)])];
        }
      }), [[ci, !I.value && e.ripple, "", {
        center: !!e.icon
      }]]);
    }), {
      group: g
    };
  }
}), f_ = ["success", "info", "warning", "error"], m_ = W({
  border: {
    type: [Boolean, String],
    validator: (e) => typeof e == "boolean" || ["top", "end", "bottom", "start"].includes(e)
  },
  borderColor: String,
  closable: Boolean,
  closeIcon: {
    type: ze,
    default: "$close"
  },
  closeLabel: {
    type: String,
    default: "$vuetify.close"
  },
  icon: {
    type: [Boolean, String, Function, Object],
    default: null
  },
  modelValue: {
    type: Boolean,
    default: !0
  },
  prominent: Boolean,
  title: String,
  text: String,
  type: {
    type: String,
    validator: (e) => f_.includes(e)
  },
  ...Ae(),
  ...Kt(),
  ...Dn(),
  ...An(),
  ...ui(),
  ...ga(),
  ...St(),
  ...Ze(),
  ...nt(),
  ...Pn({
    variant: "flat"
  })
}, "VAlert"), Yo = de()({
  name: "VAlert",
  props: m_(),
  emits: {
    "click:close": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      emit: n,
      slots: o
    } = t;
    const i = Ye(e, "modelValue"), l = p(() => {
      if (e.icon !== !1)
        return e.type ? e.icon ?? `$${e.type}` : e.icon;
    }), a = p(() => ({
      color: e.color ?? e.type,
      variant: e.variant
    })), {
      themeClasses: s
    } = ct(e), {
      colorClasses: r,
      colorStyles: d,
      variantClasses: c
    } = Ho(a), {
      densityClasses: f
    } = tn(e), {
      dimensionStyles: m
    } = $n(e), {
      elevationClasses: h
    } = In(e), {
      locationStyles: v
    } = Qi(e), {
      positionClasses: g
    } = ya(e), {
      roundedClasses: y
    } = Ct(e), {
      textColorClasses: w,
      textColorStyles: E
    } = qt(se(e, "borderColor")), {
      t: A
    } = ri(), P = p(() => ({
      "aria-label": A(e.closeLabel),
      onClick(C) {
        i.value = !1, n("click:close", C);
      }
    }));
    return () => {
      const C = !!(o.prepend || l.value), x = !!(o.title || e.title), I = !!(o.close || e.closable);
      return i.value && u(e.tag, {
        class: ["v-alert", e.border && {
          "v-alert--border": !!e.border,
          [`v-alert--border-${e.border === !0 ? "start" : e.border}`]: !0
        }, {
          "v-alert--prominent": e.prominent
        }, s.value, r.value, f.value, h.value, g.value, y.value, c.value, e.class],
        style: [d.value, m.value, v.value, e.style],
        role: "alert"
      }, {
        default: () => {
          var N, T;
          return [Ro(!1, "v-alert"), e.border && u("div", {
            key: "border",
            class: ["v-alert__border", w.value],
            style: E.value
          }, null), C && u("div", {
            key: "prepend",
            class: "v-alert__prepend"
          }, [o.prepend ? u(tt, {
            key: "prepend-defaults",
            disabled: !l.value,
            defaults: {
              VIcon: {
                density: e.density,
                icon: l.value,
                size: e.prominent ? 44 : 28
              }
            }
          }, o.prepend) : u(De, {
            key: "prepend-icon",
            density: e.density,
            icon: l.value,
            size: e.prominent ? 44 : 28
          }, null)]), u("div", {
            class: "v-alert__content"
          }, [x && u(Wb, {
            key: "title"
          }, {
            default: () => {
              var $;
              return [(($ = o.title) == null ? void 0 : $.call(o)) ?? e.title];
            }
          }), ((N = o.text) == null ? void 0 : N.call(o)) ?? e.text, (T = o.default) == null ? void 0 : T.call(o)]), o.append && u("div", {
            key: "append",
            class: "v-alert__append"
          }, [o.append()]), I && u("div", {
            key: "close",
            class: "v-alert__close"
          }, [o.close ? u(tt, {
            key: "close-defaults",
            defaults: {
              VBtn: {
                icon: e.closeIcon,
                size: "x-small",
                variant: "text"
              }
            }
          }, {
            default: () => {
              var $;
              return [($ = o.close) == null ? void 0 : $.call(o, {
                props: P.value
              })];
            }
          }) : u(ce, be({
            key: "close-btn",
            icon: e.closeIcon,
            size: "x-small",
            variant: "text"
          }, P.value), null)])];
        }
      });
    };
  }
}), Po = de()({
  name: "VCardActions",
  props: Ae(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Jn({
      VBtn: {
        slim: !0,
        variant: "text"
      }
    }), Se(() => {
      var o;
      return u("div", {
        class: ["v-card-actions", e.class],
        style: e.style
      }, [(o = n.default) == null ? void 0 : o.call(n)]);
    }), {};
  }
}), v_ = W({
  opacity: [Number, String],
  ...Ae(),
  ...Ze()
}, "VCardSubtitle"), h_ = de()({
  name: "VCardSubtitle",
  props: v_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Se(() => u(e.tag, {
      class: ["v-card-subtitle", e.class],
      style: [{
        "--v-card-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), ao = da("v-card-title");
function g_(e) {
  return {
    aspectStyles: p(() => {
      const t = Number(e.aspectRatio);
      return t ? {
        paddingBottom: String(1 / t * 100) + "%"
      } : void 0;
    })
  };
}
const fm = W({
  aspectRatio: [String, Number],
  contentClass: null,
  inline: Boolean,
  ...Ae(),
  ...Dn()
}, "VResponsive"), bc = de()({
  name: "VResponsive",
  props: fm(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      aspectStyles: o
    } = g_(e), {
      dimensionStyles: i
    } = $n(e);
    return Se(() => {
      var l;
      return u("div", {
        class: ["v-responsive", {
          "v-responsive--inline": e.inline
        }, e.class],
        style: [i.value, e.style]
      }, [u("div", {
        class: "v-responsive__sizer",
        style: o.value
      }, null), (l = n.additional) == null ? void 0 : l.call(n), n.default && u("div", {
        class: ["v-responsive__content", e.contentClass]
      }, [n.default()])]);
    }), {};
  }
}), di = W({
  transition: {
    type: [Boolean, String, Object],
    default: "fade-transition",
    validator: (e) => e !== !0
  }
}, "transition"), Cn = (e, t) => {
  let {
    slots: n
  } = t;
  const {
    transition: o,
    disabled: i,
    group: l,
    ...a
  } = e, {
    component: s = l ? or : Bo,
    ...r
  } = typeof o == "object" ? o : {};
  return co(s, be(typeof o == "string" ? {
    name: i ? "" : o
  } : r, typeof o == "string" ? {} : Object.fromEntries(Object.entries({
    disabled: i,
    group: l
  }).filter((d) => {
    let [c, f] = d;
    return f !== void 0;
  })), a), n);
};
function y_(e, t) {
  if (!ir) return;
  const n = t.modifiers || {}, o = t.value, {
    handler: i,
    options: l
  } = typeof o == "object" ? o : {
    handler: o,
    options: {}
  }, a = new IntersectionObserver(function() {
    var f;
    let s = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], r = arguments.length > 1 ? arguments[1] : void 0;
    const d = (f = e._observe) == null ? void 0 : f[t.instance.$.uid];
    if (!d) return;
    const c = s.some((m) => m.isIntersecting);
    i && (!n.quiet || d.init) && (!n.once || c || d.init) && i(c, s, r), c && n.once ? mm(e, t) : d.init = !0;
  }, l);
  e._observe = Object(e._observe), e._observe[t.instance.$.uid] = {
    init: !1,
    observer: a
  }, a.observe(e);
}
function mm(e, t) {
  var o;
  const n = (o = e._observe) == null ? void 0 : o[t.instance.$.uid];
  n && (n.observer.unobserve(e), delete e._observe[t.instance.$.uid]);
}
const Sr = {
  mounted: y_,
  unmounted: mm
}, p_ = W({
  absolute: Boolean,
  alt: String,
  cover: Boolean,
  color: String,
  draggable: {
    type: [Boolean, String],
    default: void 0
  },
  eager: Boolean,
  gradient: String,
  lazySrc: String,
  options: {
    type: Object,
    // For more information on types, navigate to:
    // https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
    default: () => ({
      root: void 0,
      rootMargin: void 0,
      threshold: void 0
    })
  },
  sizes: String,
  src: {
    type: [String, Object],
    default: ""
  },
  crossorigin: String,
  referrerpolicy: String,
  srcset: String,
  position: String,
  ...fm(),
  ...Ae(),
  ...St(),
  ...di()
}, "VImg"), Cr = de()({
  name: "VImg",
  directives: {
    intersect: Sr
  },
  props: p_(),
  emits: {
    loadstart: (e) => !0,
    load: (e) => !0,
    error: (e) => !0
  },
  setup(e, t) {
    let {
      emit: n,
      slots: o
    } = t;
    const {
      backgroundColorClasses: i,
      backgroundColorStyles: l
    } = Dt(se(e, "color")), {
      roundedClasses: a
    } = Ct(e), s = at("VImg"), r = he(""), d = ie(), c = he(e.eager ? "loading" : "idle"), f = he(), m = he(), h = p(() => e.src && typeof e.src == "object" ? {
      src: e.src.src,
      srcset: e.srcset || e.src.srcset,
      lazySrc: e.lazySrc || e.src.lazySrc,
      aspect: Number(e.aspectRatio || e.src.aspect || 0)
    } : {
      src: e.src,
      srcset: e.srcset,
      lazySrc: e.lazySrc,
      aspect: Number(e.aspectRatio || 0)
    }), v = p(() => h.value.aspect || f.value / m.value || 0);
    ge(() => e.src, () => {
      g(c.value !== "idle");
    }), ge(v, (k, D) => {
      !k && D && d.value && P(d.value);
    }), Gs(() => g());
    function g(k) {
      if (!(e.eager && k) && !(ir && !k && !e.eager)) {
        if (c.value = "loading", h.value.lazySrc) {
          const D = new Image();
          D.src = h.value.lazySrc, P(D, null);
        }
        h.value.src && ot(() => {
          var D;
          n("loadstart", ((D = d.value) == null ? void 0 : D.currentSrc) || h.value.src), setTimeout(() => {
            var R;
            if (!s.isUnmounted)
              if ((R = d.value) != null && R.complete) {
                if (d.value.naturalWidth || w(), c.value === "error") return;
                v.value || P(d.value, null), c.value === "loading" && y();
              } else
                v.value || P(d.value), E();
          });
        });
      }
    }
    function y() {
      var k;
      s.isUnmounted || (E(), P(d.value), c.value = "loaded", n("load", ((k = d.value) == null ? void 0 : k.currentSrc) || h.value.src));
    }
    function w() {
      var k;
      s.isUnmounted || (c.value = "error", n("error", ((k = d.value) == null ? void 0 : k.currentSrc) || h.value.src));
    }
    function E() {
      const k = d.value;
      k && (r.value = k.currentSrc || k.src);
    }
    let A = -1;
    pt(() => {
      clearTimeout(A);
    });
    function P(k) {
      let D = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 100;
      const R = () => {
        if (clearTimeout(A), s.isUnmounted) return;
        const {
          naturalHeight: G,
          naturalWidth: re
        } = k;
        G || re ? (f.value = re, m.value = G) : !k.complete && c.value === "loading" && D != null ? A = window.setTimeout(R, D) : (k.currentSrc.endsWith(".svg") || k.currentSrc.startsWith("data:image/svg+xml")) && (f.value = 1, m.value = 1);
      };
      R();
    }
    const C = p(() => ({
      "v-img__img--cover": e.cover,
      "v-img__img--contain": !e.cover
    })), x = () => {
      var R;
      if (!h.value.src || c.value === "idle") return null;
      const k = u("img", {
        class: ["v-img__img", C.value],
        style: {
          objectPosition: e.position
        },
        src: h.value.src,
        srcset: h.value.srcset,
        alt: e.alt,
        crossorigin: e.crossorigin,
        referrerpolicy: e.referrerpolicy,
        draggable: e.draggable,
        sizes: e.sizes,
        ref: d,
        onLoad: y,
        onError: w
      }, null), D = (R = o.sources) == null ? void 0 : R.call(o);
      return u(Cn, {
        transition: e.transition,
        appear: !0
      }, {
        default: () => [lt(D ? u("picture", {
          class: "v-img__picture"
        }, [D, k]) : k, [[hn, c.value === "loaded"]])]
      });
    }, I = () => u(Cn, {
      transition: e.transition
    }, {
      default: () => [h.value.lazySrc && c.value !== "loaded" && u("img", {
        class: ["v-img__img", "v-img__img--preload", C.value],
        style: {
          objectPosition: e.position
        },
        src: h.value.lazySrc,
        alt: e.alt,
        crossorigin: e.crossorigin,
        referrerpolicy: e.referrerpolicy,
        draggable: e.draggable
      }, null)]
    }), N = () => o.placeholder ? u(Cn, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [(c.value === "loading" || c.value === "error" && !o.error) && u("div", {
        class: "v-img__placeholder"
      }, [o.placeholder()])]
    }) : null, T = () => o.error ? u(Cn, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [c.value === "error" && u("div", {
        class: "v-img__error"
      }, [o.error()])]
    }) : null, $ = () => e.gradient ? u("div", {
      class: "v-img__gradient",
      style: {
        backgroundImage: `linear-gradient(${e.gradient})`
      }
    }, null) : null, O = he(!1);
    {
      const k = ge(v, (D) => {
        D && (requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            O.value = !0;
          });
        }), k());
      });
    }
    return Se(() => {
      const k = bc.filterProps(e);
      return lt(u(bc, be({
        class: ["v-img", {
          "v-img--absolute": e.absolute,
          "v-img--booting": !O.value
        }, i.value, a.value, e.class],
        style: [{
          width: pe(e.width === "auto" ? f.value : e.width)
        }, l.value, e.style]
      }, k, {
        aspectRatio: v.value,
        "aria-label": e.alt,
        role: e.alt ? "img" : void 0
      }), {
        additional: () => u(Ee, null, [u(x, null, null), u(I, null, null), u($, null, null), u(N, null, null), u(T, null, null)]),
        default: o.default
      }), [[Nn("intersect"), {
        handler: g,
        options: e.options
      }, null, {
        once: !0
      }]]);
    }), {
      currentSrc: r,
      image: d,
      state: c,
      naturalWidth: f,
      naturalHeight: m
    };
  }
}), b_ = W({
  start: Boolean,
  end: Boolean,
  icon: ze,
  image: String,
  text: String,
  ...Zn(),
  ...Ae(),
  ...Kt(),
  ...St(),
  ...Ji(),
  ...Ze(),
  ...nt(),
  ...Pn({
    variant: "flat"
  })
}, "VAvatar"), Ht = de()({
  name: "VAvatar",
  props: b_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = ct(e), {
      borderClasses: i
    } = Qn(e), {
      colorClasses: l,
      colorStyles: a,
      variantClasses: s
    } = Ho(e), {
      densityClasses: r
    } = tn(e), {
      roundedClasses: d
    } = Ct(e), {
      sizeClasses: c,
      sizeStyles: f
    } = Zi(e);
    return Se(() => u(e.tag, {
      class: ["v-avatar", {
        "v-avatar--start": e.start,
        "v-avatar--end": e.end
      }, o.value, i.value, l.value, r.value, d.value, c.value, s.value, e.class],
      style: [a.value, f.value, e.style]
    }, {
      default: () => [n.default ? u(tt, {
        key: "content-defaults",
        defaults: {
          VImg: {
            cover: !0,
            src: e.image
          },
          VIcon: {
            icon: e.icon
          }
        }
      }, {
        default: () => [n.default()]
      }) : e.image ? u(Cr, {
        key: "image",
        src: e.image,
        alt: "",
        cover: !0
      }, null) : e.icon ? u(De, {
        key: "icon",
        icon: e.icon
      }, null) : e.text, Ro(!1, "v-avatar")]
    })), {};
  }
}), __ = W({
  appendAvatar: String,
  appendIcon: ze,
  prependAvatar: String,
  prependIcon: ze,
  subtitle: [String, Number],
  title: [String, Number],
  ...Ae(),
  ...Kt()
}, "VCardItem"), vm = de()({
  name: "VCardItem",
  props: __(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Se(() => {
      var d;
      const o = !!(e.prependAvatar || e.prependIcon), i = !!(o || n.prepend), l = !!(e.appendAvatar || e.appendIcon), a = !!(l || n.append), s = !!(e.title != null || n.title), r = !!(e.subtitle != null || n.subtitle);
      return u("div", {
        class: ["v-card-item", e.class],
        style: e.style
      }, [i && u("div", {
        key: "prepend",
        class: "v-card-item__prepend"
      }, [n.prepend ? u(tt, {
        key: "prepend-defaults",
        disabled: !o,
        defaults: {
          VAvatar: {
            density: e.density,
            image: e.prependAvatar
          },
          VIcon: {
            density: e.density,
            icon: e.prependIcon
          }
        }
      }, n.prepend) : u(Ee, null, [e.prependAvatar && u(Ht, {
        key: "prepend-avatar",
        density: e.density,
        image: e.prependAvatar
      }, null), e.prependIcon && u(De, {
        key: "prepend-icon",
        density: e.density,
        icon: e.prependIcon
      }, null)])]), u("div", {
        class: "v-card-item__content"
      }, [s && u(ao, {
        key: "title"
      }, {
        default: () => {
          var c;
          return [((c = n.title) == null ? void 0 : c.call(n)) ?? e.title];
        }
      }), r && u(h_, {
        key: "subtitle"
      }, {
        default: () => {
          var c;
          return [((c = n.subtitle) == null ? void 0 : c.call(n)) ?? e.subtitle];
        }
      }), (d = n.default) == null ? void 0 : d.call(n)]), a && u("div", {
        key: "append",
        class: "v-card-item__append"
      }, [n.append ? u(tt, {
        key: "append-defaults",
        disabled: !l,
        defaults: {
          VAvatar: {
            density: e.density,
            image: e.appendAvatar
          },
          VIcon: {
            density: e.density,
            icon: e.appendIcon
          }
        }
      }, n.append) : u(Ee, null, [e.appendIcon && u(De, {
        key: "append-icon",
        density: e.density,
        icon: e.appendIcon
      }, null), e.appendAvatar && u(Ht, {
        key: "append-avatar",
        density: e.density,
        image: e.appendAvatar
      }, null)])])]);
    }), {};
  }
}), w_ = W({
  opacity: [Number, String],
  ...Ae(),
  ...Ze()
}, "VCardText"), Jt = de()({
  name: "VCardText",
  props: w_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Se(() => u(e.tag, {
      class: ["v-card-text", e.class],
      style: [{
        "--v-card-text-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), k_ = W({
  appendAvatar: String,
  appendIcon: ze,
  disabled: Boolean,
  flat: Boolean,
  hover: Boolean,
  image: String,
  link: {
    type: Boolean,
    default: void 0
  },
  prependAvatar: String,
  prependIcon: ze,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  subtitle: [String, Number],
  text: [String, Number],
  title: [String, Number],
  ...Zn(),
  ...Ae(),
  ...Kt(),
  ...Dn(),
  ...An(),
  ...wr(),
  ...ui(),
  ...ga(),
  ...St(),
  ...ba(),
  ...Ze(),
  ...nt(),
  ...Pn({
    variant: "elevated"
  })
}, "VCard"), bt = de()({
  name: "VCard",
  directives: {
    Ripple: ci
  },
  props: k_(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      themeClasses: i
    } = ct(e), {
      borderClasses: l
    } = Qn(e), {
      colorClasses: a,
      colorStyles: s,
      variantClasses: r
    } = Ho(e), {
      densityClasses: d
    } = tn(e), {
      dimensionStyles: c
    } = $n(e), {
      elevationClasses: f
    } = In(e), {
      loaderClasses: m
    } = kr(e), {
      locationStyles: h
    } = Qi(e), {
      positionClasses: v
    } = ya(e), {
      roundedClasses: g
    } = Ct(e), y = pa(e, n), w = p(() => e.link !== !1 && y.isLink.value), E = p(() => !e.disabled && e.link !== !1 && (e.link || y.isClickable.value));
    return Se(() => {
      const A = w.value ? "a" : e.tag, P = !!(o.title || e.title != null), C = !!(o.subtitle || e.subtitle != null), x = P || C, I = !!(o.append || e.appendAvatar || e.appendIcon), N = !!(o.prepend || e.prependAvatar || e.prependIcon), T = !!(o.image || e.image), $ = x || N || I, O = !!(o.text || e.text != null);
      return lt(u(A, be({
        class: ["v-card", {
          "v-card--disabled": e.disabled,
          "v-card--flat": e.flat,
          "v-card--hover": e.hover && !(e.disabled || e.flat),
          "v-card--link": E.value
        }, i.value, l.value, a.value, d.value, f.value, m.value, v.value, g.value, r.value, e.class],
        style: [s.value, c.value, h.value, e.style],
        onClick: E.value && y.navigate,
        tabindex: e.disabled ? -1 : void 0
      }, y.linkProps), {
        default: () => {
          var k;
          return [T && u("div", {
            key: "image",
            class: "v-card__image"
          }, [o.image ? u(tt, {
            key: "image-defaults",
            disabled: !e.image,
            defaults: {
              VImg: {
                cover: !0,
                src: e.image
              }
            }
          }, o.image) : u(Cr, {
            key: "image-img",
            cover: !0,
            src: e.image
          }, null)]), u(nm, {
            name: "v-card",
            active: !!e.loading,
            color: typeof e.loading == "boolean" ? void 0 : e.loading
          }, {
            default: o.loader
          }), $ && u(vm, {
            key: "item",
            prependAvatar: e.prependAvatar,
            prependIcon: e.prependIcon,
            title: e.title,
            subtitle: e.subtitle,
            appendAvatar: e.appendAvatar,
            appendIcon: e.appendIcon
          }, {
            default: o.item,
            prepend: o.prepend,
            title: o.title,
            subtitle: o.subtitle,
            append: o.append
          }), O && u(Jt, {
            key: "text"
          }, {
            default: () => {
              var D;
              return [((D = o.text) == null ? void 0 : D.call(o)) ?? e.text];
            }
          }), (k = o.default) == null ? void 0 : k.call(o), o.actions && u(Po, null, {
            default: o.actions
          }), Ro(E.value, "v-card")];
        }
      }), [[Nn("ripple"), E.value && e.ripple]]);
    }), {};
  }
}), S_ = W({
  disabled: Boolean,
  group: Boolean,
  hideOnLeave: Boolean,
  leaveAbsolute: Boolean,
  mode: String,
  origin: String
}, "transition");
function Gt(e, t, n) {
  return de()({
    name: e,
    props: S_({
      mode: n,
      origin: t
    }),
    setup(o, i) {
      let {
        slots: l
      } = i;
      const a = {
        onBeforeEnter(s) {
          o.origin && (s.style.transformOrigin = o.origin);
        },
        onLeave(s) {
          if (o.leaveAbsolute) {
            const {
              offsetTop: r,
              offsetLeft: d,
              offsetWidth: c,
              offsetHeight: f
            } = s;
            s._transitionInitialStyles = {
              position: s.style.position,
              top: s.style.top,
              left: s.style.left,
              width: s.style.width,
              height: s.style.height
            }, s.style.position = "absolute", s.style.top = `${r}px`, s.style.left = `${d}px`, s.style.width = `${c}px`, s.style.height = `${f}px`;
          }
          o.hideOnLeave && s.style.setProperty("display", "none", "important");
        },
        onAfterLeave(s) {
          if (o.leaveAbsolute && (s != null && s._transitionInitialStyles)) {
            const {
              position: r,
              top: d,
              left: c,
              width: f,
              height: m
            } = s._transitionInitialStyles;
            delete s._transitionInitialStyles, s.style.position = r || "", s.style.top = d || "", s.style.left = c || "", s.style.width = f || "", s.style.height = m || "";
          }
        }
      };
      return () => {
        const s = o.group ? or : Bo;
        return co(s, {
          name: o.disabled ? "" : e,
          css: !o.disabled,
          ...o.group ? void 0 : {
            mode: o.mode
          },
          ...o.disabled ? {} : a
        }, l.default);
      };
    }
  });
}
function hm(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "in-out";
  return de()({
    name: e,
    props: {
      mode: {
        type: String,
        default: n
      },
      disabled: Boolean,
      group: Boolean
    },
    setup(o, i) {
      let {
        slots: l
      } = i;
      const a = o.group ? or : Bo;
      return () => co(a, {
        name: o.disabled ? "" : e,
        css: !o.disabled,
        // mode: props.mode, // TODO: vuejs/vue-next#3104
        ...o.disabled ? {} : t
      }, l.default);
    }
  });
}
function gm() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  const n = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1) ? "width" : "height", o = yt(`offset-${n}`);
  return {
    onBeforeEnter(a) {
      a._parent = a.parentNode, a._initialStyle = {
        transition: a.style.transition,
        overflow: a.style.overflow,
        [n]: a.style[n]
      };
    },
    onEnter(a) {
      const s = a._initialStyle;
      a.style.setProperty("transition", "none", "important"), a.style.overflow = "hidden";
      const r = `${a[o]}px`;
      a.style[n] = "0", a.offsetHeight, a.style.transition = s.transition, e && a._parent && a._parent.classList.add(e), requestAnimationFrame(() => {
        a.style[n] = r;
      });
    },
    onAfterEnter: l,
    onEnterCancelled: l,
    onLeave(a) {
      a._initialStyle = {
        transition: "",
        overflow: a.style.overflow,
        [n]: a.style[n]
      }, a.style.overflow = "hidden", a.style[n] = `${a[o]}px`, a.offsetHeight, requestAnimationFrame(() => a.style[n] = "0");
    },
    onAfterLeave: i,
    onLeaveCancelled: i
  };
  function i(a) {
    e && a._parent && a._parent.classList.remove(e), l(a);
  }
  function l(a) {
    const s = a._initialStyle[n];
    a.style.overflow = a._initialStyle.overflow, s != null && (a.style[n] = s), delete a._initialStyle;
  }
}
const C_ = W({
  target: [Object, Array]
}, "v-dialog-transition"), Er = de()({
  name: "VDialogTransition",
  props: C_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = {
      onBeforeEnter(i) {
        i.style.pointerEvents = "none", i.style.visibility = "hidden";
      },
      async onEnter(i, l) {
        var m;
        await new Promise((h) => requestAnimationFrame(h)), await new Promise((h) => requestAnimationFrame(h)), i.style.visibility = "";
        const {
          x: a,
          y: s,
          sx: r,
          sy: d,
          speed: c
        } = wc(e.target, i), f = Co(i, [{
          transform: `translate(${a}px, ${s}px) scale(${r}, ${d})`,
          opacity: 0
        }, {}], {
          duration: 225 * c,
          easing: xp
        });
        (m = _c(i)) == null || m.forEach((h) => {
          Co(h, [{
            opacity: 0
          }, {
            opacity: 0,
            offset: 0.33
          }, {}], {
            duration: 225 * 2 * c,
            easing: $i
          });
        }), f.finished.then(() => l());
      },
      onAfterEnter(i) {
        i.style.removeProperty("pointer-events");
      },
      onBeforeLeave(i) {
        i.style.pointerEvents = "none";
      },
      async onLeave(i, l) {
        var m;
        await new Promise((h) => requestAnimationFrame(h));
        const {
          x: a,
          y: s,
          sx: r,
          sy: d,
          speed: c
        } = wc(e.target, i);
        Co(i, [{}, {
          transform: `translate(${a}px, ${s}px) scale(${r}, ${d})`,
          opacity: 0
        }], {
          duration: 125 * c,
          easing: Vp
        }).finished.then(() => l()), (m = _c(i)) == null || m.forEach((h) => {
          Co(h, [{}, {
            opacity: 0,
            offset: 0.2
          }, {
            opacity: 0
          }], {
            duration: 125 * 2 * c,
            easing: $i
          });
        });
      },
      onAfterLeave(i) {
        i.style.removeProperty("pointer-events");
      }
    };
    return () => e.target ? u(Bo, be({
      name: "dialog-transition"
    }, o, {
      css: !1
    }), n) : u(Bo, {
      name: "dialog-transition"
    }, n);
  }
});
function _c(e) {
  var n;
  const t = (n = e.querySelector(":scope > .v-card, :scope > .v-sheet, :scope > .v-list")) == null ? void 0 : n.children;
  return t && [...t];
}
function wc(e, t) {
  const n = Vf(e), o = cr(t), [i, l] = getComputedStyle(t).transformOrigin.split(" ").map((w) => parseFloat(w)), [a, s] = getComputedStyle(t).getPropertyValue("--v-overlay-anchor-origin").split(" ");
  let r = n.left + n.width / 2;
  a === "left" || s === "left" ? r -= n.width / 2 : (a === "right" || s === "right") && (r += n.width / 2);
  let d = n.top + n.height / 2;
  a === "top" || s === "top" ? d -= n.height / 2 : (a === "bottom" || s === "bottom") && (d += n.height / 2);
  const c = n.width / o.width, f = n.height / o.height, m = Math.max(1, c, f), h = c / m || 0, v = f / m || 0, g = o.width * o.height / (window.innerWidth * window.innerHeight), y = g > 0.12 ? Math.min(1.5, (g - 0.12) * 10 + 1) : 1;
  return {
    x: r - (i + o.left),
    y: d - (l + o.top),
    sx: h,
    sy: v,
    speed: y
  };
}
Gt("fab-transition", "center center", "out-in");
Gt("dialog-bottom-transition");
Gt("dialog-top-transition");
const kc = Gt("fade-transition"), E_ = Gt("scale-transition");
Gt("scroll-x-transition");
Gt("scroll-x-reverse-transition");
Gt("scroll-y-transition");
Gt("scroll-y-reverse-transition");
Gt("slide-x-transition");
Gt("slide-x-reverse-transition");
const ym = Gt("slide-y-transition");
Gt("slide-y-reverse-transition");
const pm = hm("expand-transition", gm()), bm = hm("expand-x-transition", gm("", !0)), Cs = Symbol.for("vuetify:list");
function _m() {
  const e = Ge(Cs, {
    hasPrepend: he(!1),
    updateHasPrepend: () => null
  }), t = {
    hasPrepend: he(!1),
    updateHasPrepend: (n) => {
      n && (t.hasPrepend.value = n);
    }
  };
  return ht(Cs, t), e;
}
function wm() {
  return Ge(Cs, null);
}
const xr = (e) => {
  const t = {
    activate: (n) => {
      let {
        id: o,
        value: i,
        activated: l
      } = n;
      return o = ve(o), e && !i && l.size === 1 && l.has(o) || (i ? l.add(o) : l.delete(o)), l;
    },
    in: (n, o, i) => {
      let l = /* @__PURE__ */ new Set();
      if (n != null)
        for (const a of cn(n))
          l = t.activate({
            id: a,
            value: !0,
            activated: new Set(l),
            children: o,
            parents: i
          });
      return l;
    },
    out: (n) => Array.from(n)
  };
  return t;
}, km = (e) => {
  const t = xr(e);
  return {
    activate: (o) => {
      let {
        activated: i,
        id: l,
        ...a
      } = o;
      l = ve(l);
      const s = i.has(l) ? /* @__PURE__ */ new Set([l]) : /* @__PURE__ */ new Set();
      return t.activate({
        ...a,
        id: l,
        activated: s
      });
    },
    in: (o, i, l) => {
      let a = /* @__PURE__ */ new Set();
      if (o != null) {
        const s = cn(o);
        s.length && (a = t.in(s.slice(0, 1), i, l));
      }
      return a;
    },
    out: (o, i, l) => t.out(o, i, l)
  };
}, x_ = (e) => {
  const t = xr(e);
  return {
    activate: (o) => {
      let {
        id: i,
        activated: l,
        children: a,
        ...s
      } = o;
      return i = ve(i), a.has(i) ? l : t.activate({
        id: i,
        activated: l,
        children: a,
        ...s
      });
    },
    in: t.in,
    out: t.out
  };
}, V_ = (e) => {
  const t = km(e);
  return {
    activate: (o) => {
      let {
        id: i,
        activated: l,
        children: a,
        ...s
      } = o;
      return i = ve(i), a.has(i) ? l : t.activate({
        id: i,
        activated: l,
        children: a,
        ...s
      });
    },
    in: t.in,
    out: t.out
  };
}, N_ = {
  open: (e) => {
    let {
      id: t,
      value: n,
      opened: o,
      parents: i
    } = e;
    if (n) {
      const l = /* @__PURE__ */ new Set();
      l.add(t);
      let a = i.get(t);
      for (; a != null; )
        l.add(a), a = i.get(a);
      return l;
    } else
      return o.delete(t), o;
  },
  select: () => null
}, Sm = {
  open: (e) => {
    let {
      id: t,
      value: n,
      opened: o,
      parents: i
    } = e;
    if (n) {
      let l = i.get(t);
      for (o.add(t); l != null && l !== t; )
        o.add(l), l = i.get(l);
      return o;
    } else
      o.delete(t);
    return o;
  },
  select: () => null
}, T_ = {
  open: Sm.open,
  select: (e) => {
    let {
      id: t,
      value: n,
      opened: o,
      parents: i
    } = e;
    if (!n) return o;
    const l = [];
    let a = i.get(t);
    for (; a != null; )
      l.push(a), a = i.get(a);
    return new Set(l);
  }
}, Vr = (e) => {
  const t = {
    select: (n) => {
      let {
        id: o,
        value: i,
        selected: l
      } = n;
      if (o = ve(o), e && !i) {
        const a = Array.from(l.entries()).reduce((s, r) => {
          let [d, c] = r;
          return c === "on" && s.push(d), s;
        }, []);
        if (a.length === 1 && a[0] === o) return l;
      }
      return l.set(o, i ? "on" : "off"), l;
    },
    in: (n, o, i) => {
      let l = /* @__PURE__ */ new Map();
      for (const a of n || [])
        l = t.select({
          id: a,
          value: !0,
          selected: new Map(l),
          children: o,
          parents: i
        });
      return l;
    },
    out: (n) => {
      const o = [];
      for (const [i, l] of n.entries())
        l === "on" && o.push(i);
      return o;
    }
  };
  return t;
}, Cm = (e) => {
  const t = Vr(e);
  return {
    select: (o) => {
      let {
        selected: i,
        id: l,
        ...a
      } = o;
      l = ve(l);
      const s = i.has(l) ? /* @__PURE__ */ new Map([[l, i.get(l)]]) : /* @__PURE__ */ new Map();
      return t.select({
        ...a,
        id: l,
        selected: s
      });
    },
    in: (o, i, l) => {
      let a = /* @__PURE__ */ new Map();
      return o != null && o.length && (a = t.in(o.slice(0, 1), i, l)), a;
    },
    out: (o, i, l) => t.out(o, i, l)
  };
}, O_ = (e) => {
  const t = Vr(e);
  return {
    select: (o) => {
      let {
        id: i,
        selected: l,
        children: a,
        ...s
      } = o;
      return i = ve(i), a.has(i) ? l : t.select({
        id: i,
        selected: l,
        children: a,
        ...s
      });
    },
    in: t.in,
    out: t.out
  };
}, A_ = (e) => {
  const t = Cm(e);
  return {
    select: (o) => {
      let {
        id: i,
        selected: l,
        children: a,
        ...s
      } = o;
      return i = ve(i), a.has(i) ? l : t.select({
        id: i,
        selected: l,
        children: a,
        ...s
      });
    },
    in: t.in,
    out: t.out
  };
}, I_ = (e) => {
  const t = {
    select: (n) => {
      let {
        id: o,
        value: i,
        selected: l,
        children: a,
        parents: s
      } = n;
      o = ve(o);
      const r = new Map(l), d = [o];
      for (; d.length; ) {
        const f = d.shift();
        l.set(ve(f), i ? "on" : "off"), a.has(f) && d.push(...a.get(f));
      }
      let c = ve(s.get(o));
      for (; c; ) {
        const f = a.get(c), m = f.every((v) => l.get(ve(v)) === "on"), h = f.every((v) => !l.has(ve(v)) || l.get(ve(v)) === "off");
        l.set(c, m ? "on" : h ? "off" : "indeterminate"), c = ve(s.get(c));
      }
      return e && !i && Array.from(l.entries()).reduce((m, h) => {
        let [v, g] = h;
        return g === "on" && m.push(v), m;
      }, []).length === 0 ? r : l;
    },
    in: (n, o, i) => {
      let l = /* @__PURE__ */ new Map();
      for (const a of n || [])
        l = t.select({
          id: a,
          value: !0,
          selected: new Map(l),
          children: o,
          parents: i
        });
      return l;
    },
    out: (n, o) => {
      const i = [];
      for (const [l, a] of n.entries())
        a === "on" && !o.has(l) && i.push(l);
      return i;
    }
  };
  return t;
}, Ri = Symbol.for("vuetify:nested"), Em = {
  id: he(),
  root: {
    register: () => null,
    unregister: () => null,
    parents: ie(/* @__PURE__ */ new Map()),
    children: ie(/* @__PURE__ */ new Map()),
    open: () => null,
    openOnSelect: () => null,
    activate: () => null,
    select: () => null,
    activatable: ie(!1),
    selectable: ie(!1),
    opened: ie(/* @__PURE__ */ new Set()),
    activated: ie(/* @__PURE__ */ new Set()),
    selected: ie(/* @__PURE__ */ new Map()),
    selectedValues: ie([]),
    getPath: () => []
  }
}, P_ = W({
  activatable: Boolean,
  selectable: Boolean,
  activeStrategy: [String, Function, Object],
  selectStrategy: [String, Function, Object],
  openStrategy: [String, Object],
  opened: null,
  activated: null,
  selected: null,
  mandatory: Boolean
}, "nested"), D_ = (e) => {
  let t = !1;
  const n = ie(/* @__PURE__ */ new Map()), o = ie(/* @__PURE__ */ new Map()), i = Ye(e, "opened", e.opened, (v) => new Set(v), (v) => [...v.values()]), l = p(() => {
    if (typeof e.activeStrategy == "object") return e.activeStrategy;
    if (typeof e.activeStrategy == "function") return e.activeStrategy(e.mandatory);
    switch (e.activeStrategy) {
      case "leaf":
        return x_(e.mandatory);
      case "single-leaf":
        return V_(e.mandatory);
      case "independent":
        return xr(e.mandatory);
      case "single-independent":
      default:
        return km(e.mandatory);
    }
  }), a = p(() => {
    if (typeof e.selectStrategy == "object") return e.selectStrategy;
    if (typeof e.selectStrategy == "function") return e.selectStrategy(e.mandatory);
    switch (e.selectStrategy) {
      case "single-leaf":
        return A_(e.mandatory);
      case "leaf":
        return O_(e.mandatory);
      case "independent":
        return Vr(e.mandatory);
      case "single-independent":
        return Cm(e.mandatory);
      case "classic":
      default:
        return I_(e.mandatory);
    }
  }), s = p(() => {
    if (typeof e.openStrategy == "object") return e.openStrategy;
    switch (e.openStrategy) {
      case "list":
        return T_;
      case "single":
        return N_;
      case "multiple":
      default:
        return Sm;
    }
  }), r = Ye(e, "activated", e.activated, (v) => l.value.in(v, n.value, o.value), (v) => l.value.out(v, n.value, o.value)), d = Ye(e, "selected", e.selected, (v) => a.value.in(v, n.value, o.value), (v) => a.value.out(v, n.value, o.value));
  pt(() => {
    t = !0;
  });
  function c(v) {
    const g = [];
    let y = v;
    for (; y != null; )
      g.unshift(y), y = o.value.get(y);
    return g;
  }
  const f = at("nested"), m = /* @__PURE__ */ new Set(), h = {
    id: he(),
    root: {
      opened: i,
      activatable: se(e, "activatable"),
      selectable: se(e, "selectable"),
      activated: r,
      selected: d,
      selectedValues: p(() => {
        const v = [];
        for (const [g, y] of d.value.entries())
          y === "on" && v.push(g);
        return v;
      }),
      register: (v, g, y) => {
        if (m.has(v)) {
          const w = c(v).map(String).join(" -> "), E = c(g).concat(v).map(String).join(" -> ");
          zl(`Multiple nodes with the same ID
	${w}
	${E}`);
          return;
        } else
          m.add(v);
        g && v !== g && o.value.set(v, g), y && n.value.set(v, []), g != null && n.value.set(g, [...n.value.get(g) || [], v]);
      },
      unregister: (v) => {
        if (t) return;
        m.delete(v), n.value.delete(v);
        const g = o.value.get(v);
        if (g) {
          const y = n.value.get(g) ?? [];
          n.value.set(g, y.filter((w) => w !== v));
        }
        o.value.delete(v);
      },
      open: (v, g, y) => {
        f.emit("click:open", {
          id: v,
          value: g,
          path: c(v),
          event: y
        });
        const w = s.value.open({
          id: v,
          value: g,
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: y
        });
        w && (i.value = w);
      },
      openOnSelect: (v, g, y) => {
        const w = s.value.select({
          id: v,
          value: g,
          selected: new Map(d.value),
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: y
        });
        w && (i.value = w);
      },
      select: (v, g, y) => {
        f.emit("click:select", {
          id: v,
          value: g,
          path: c(v),
          event: y
        });
        const w = a.value.select({
          id: v,
          value: g,
          selected: new Map(d.value),
          children: n.value,
          parents: o.value,
          event: y
        });
        w && (d.value = w), h.root.openOnSelect(v, g, y);
      },
      activate: (v, g, y) => {
        if (!e.activatable)
          return h.root.select(v, !0, y);
        f.emit("click:activate", {
          id: v,
          value: g,
          path: c(v),
          event: y
        });
        const w = l.value.activate({
          id: v,
          value: g,
          activated: new Set(r.value),
          children: n.value,
          parents: o.value,
          event: y
        });
        w && (r.value = w);
      },
      children: n,
      parents: o,
      getPath: c
    }
  };
  return ht(Ri, h), h.root;
}, xm = (e, t) => {
  const n = Ge(Ri, Em), o = Symbol(gn()), i = p(() => e.value !== void 0 ? e.value : o), l = {
    ...n,
    id: i,
    open: (a, s) => n.root.open(i.value, a, s),
    openOnSelect: (a, s) => n.root.openOnSelect(i.value, a, s),
    isOpen: p(() => n.root.opened.value.has(i.value)),
    parent: p(() => n.root.parents.value.get(i.value)),
    activate: (a, s) => n.root.activate(i.value, a, s),
    isActivated: p(() => n.root.activated.value.has(ve(i.value))),
    select: (a, s) => n.root.select(i.value, a, s),
    isSelected: p(() => n.root.selected.value.get(ve(i.value)) === "on"),
    isIndeterminate: p(() => n.root.selected.value.get(i.value) === "indeterminate"),
    isLeaf: p(() => !n.root.children.value.get(i.value)),
    isGroupActivator: n.isGroupActivator
  };
  return !n.isGroupActivator && n.root.register(i.value, n.id.value, t), pt(() => {
    !n.isGroupActivator && n.root.unregister(i.value);
  }), t && ht(Ri, l), l;
}, $_ = () => {
  const e = Ge(Ri, Em);
  ht(Ri, {
    ...e,
    isGroupActivator: !0
  });
};
function el() {
  const e = he(!1);
  return vn(() => {
    window.requestAnimationFrame(() => {
      e.value = !0;
    });
  }), {
    ssrBootStyles: p(() => e.value ? void 0 : {
      transition: "none !important"
    }),
    isBooted: Wi(e)
  };
}
const M_ = si({
  name: "VListGroupActivator",
  setup(e, t) {
    let {
      slots: n
    } = t;
    return $_(), () => {
      var o;
      return (o = n.default) == null ? void 0 : o.call(n);
    };
  }
}), B_ = W({
  /* @deprecated */
  activeColor: String,
  baseColor: String,
  color: String,
  collapseIcon: {
    type: ze,
    default: "$collapse"
  },
  expandIcon: {
    type: ze,
    default: "$expand"
  },
  prependIcon: ze,
  appendIcon: ze,
  fluid: Boolean,
  subgroup: Boolean,
  title: String,
  value: null,
  ...Ae(),
  ...Ze()
}, "VListGroup"), Yl = de()({
  name: "VListGroup",
  props: B_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isOpen: o,
      open: i,
      id: l
    } = xm(se(e, "value"), !0), a = p(() => `v-list-group--id-${String(l.value)}`), s = wm(), {
      isBooted: r
    } = el();
    function d(h) {
      h.stopPropagation(), i(!o.value, h);
    }
    const c = p(() => ({
      onClick: d,
      class: "v-list-group__header",
      id: a.value
    })), f = p(() => o.value ? e.collapseIcon : e.expandIcon), m = p(() => ({
      VListItem: {
        active: o.value,
        activeColor: e.activeColor,
        baseColor: e.baseColor,
        color: e.color,
        prependIcon: e.prependIcon || e.subgroup && f.value,
        appendIcon: e.appendIcon || !e.subgroup && f.value,
        title: e.title,
        value: e.value
      }
    }));
    return Se(() => u(e.tag, {
      class: ["v-list-group", {
        "v-list-group--prepend": s == null ? void 0 : s.hasPrepend.value,
        "v-list-group--fluid": e.fluid,
        "v-list-group--subgroup": e.subgroup,
        "v-list-group--open": o.value
      }, e.class],
      style: e.style
    }, {
      default: () => [n.activator && u(tt, {
        defaults: m.value
      }, {
        default: () => [u(M_, null, {
          default: () => [n.activator({
            props: c.value,
            isOpen: o.value
          })]
        })]
      }), u(Cn, {
        transition: {
          component: pm
        },
        disabled: !r.value
      }, {
        default: () => {
          var h;
          return [lt(u("div", {
            class: "v-list-group__items",
            role: "group",
            "aria-labelledby": a.value
          }, [(h = n.default) == null ? void 0 : h.call(n)]), [[hn, o.value]])];
        }
      })]
    })), {
      isOpen: o
    };
  }
}), F_ = W({
  opacity: [Number, String],
  ...Ae(),
  ...Ze()
}, "VListItemSubtitle"), _a = de()({
  name: "VListItemSubtitle",
  props: F_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Se(() => u(e.tag, {
      class: ["v-list-item-subtitle", e.class],
      style: [{
        "--v-list-item-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), tl = da("v-list-item-title"), L_ = W({
  active: {
    type: Boolean,
    default: void 0
  },
  activeClass: String,
  /* @deprecated */
  activeColor: String,
  appendAvatar: String,
  appendIcon: ze,
  baseColor: String,
  disabled: Boolean,
  lines: [Boolean, String],
  link: {
    type: Boolean,
    default: void 0
  },
  nav: Boolean,
  prependAvatar: String,
  prependIcon: ze,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  slim: Boolean,
  subtitle: [String, Number],
  title: [String, Number],
  value: null,
  onClick: Pt(),
  onClickOnce: Pt(),
  ...Zn(),
  ...Ae(),
  ...Kt(),
  ...Dn(),
  ...An(),
  ...St(),
  ...ba(),
  ...Ze(),
  ...nt(),
  ...Pn({
    variant: "text"
  })
}, "VListItem"), He = de()({
  name: "VListItem",
  directives: {
    Ripple: ci
  },
  props: L_(),
  emits: {
    click: (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o,
      emit: i
    } = t;
    const l = pa(e, n), a = p(() => e.value === void 0 ? l.href.value : e.value), {
      activate: s,
      isActivated: r,
      select: d,
      isOpen: c,
      isSelected: f,
      isIndeterminate: m,
      isGroupActivator: h,
      root: v,
      parent: g,
      openOnSelect: y,
      id: w
    } = xm(a, !1), E = wm(), A = p(() => {
      var K;
      return e.active !== !1 && (e.active || ((K = l.isActive) == null ? void 0 : K.value) || (v.activatable.value ? r.value : f.value));
    }), P = p(() => e.link !== !1 && l.isLink.value), C = p(() => !e.disabled && e.link !== !1 && (e.link || l.isClickable.value || !!E && (v.selectable.value || v.activatable.value || e.value != null))), x = p(() => e.rounded || e.nav), I = p(() => e.color ?? e.activeColor), N = p(() => ({
      color: A.value ? I.value ?? e.baseColor : e.baseColor,
      variant: e.variant
    }));
    ge(() => {
      var K;
      return (K = l.isActive) == null ? void 0 : K.value;
    }, (K) => {
      K && g.value != null && v.open(g.value, !0), K && y(K);
    }, {
      immediate: !0
    });
    const {
      themeClasses: T
    } = ct(e), {
      borderClasses: $
    } = Qn(e), {
      colorClasses: O,
      colorStyles: k,
      variantClasses: D
    } = Ho(N), {
      densityClasses: R
    } = tn(e), {
      dimensionStyles: G
    } = $n(e), {
      elevationClasses: re
    } = In(e), {
      roundedClasses: oe
    } = Ct(x), ee = p(() => e.lines ? `v-list-item--${e.lines}-line` : void 0), B = p(() => ({
      isActive: A.value,
      select: d,
      isOpen: c.value,
      isSelected: f.value,
      isIndeterminate: m.value
    }));
    function M(K) {
      var Ne;
      i("click", K), C.value && ((Ne = l.navigate) == null || Ne.call(l, K), !h && (v.activatable.value ? s(!r.value, K) : (v.selectable.value || e.value != null) && d(!f.value, K)));
    }
    function H(K) {
      (K.key === "Enter" || K.key === " ") && (K.preventDefault(), K.target.dispatchEvent(new MouseEvent("click", K)));
    }
    return Se(() => {
      const K = P.value ? "a" : e.tag, Ne = o.title || e.title != null, we = o.subtitle || e.subtitle != null, Ie = !!(e.appendAvatar || e.appendIcon), J = !!(Ie || o.append), ke = !!(e.prependAvatar || e.prependIcon), Pe = !!(ke || o.prepend);
      return E == null || E.updateHasPrepend(Pe), e.activeColor && sp("active-color", ["color", "base-color"]), lt(u(K, be({
        class: ["v-list-item", {
          "v-list-item--active": A.value,
          "v-list-item--disabled": e.disabled,
          "v-list-item--link": C.value,
          "v-list-item--nav": e.nav,
          "v-list-item--prepend": !Pe && (E == null ? void 0 : E.hasPrepend.value),
          "v-list-item--slim": e.slim,
          [`${e.activeClass}`]: e.activeClass && A.value
        }, T.value, $.value, O.value, R.value, re.value, ee.value, oe.value, D.value, e.class],
        style: [k.value, G.value, e.style],
        tabindex: C.value ? E ? -2 : 0 : void 0,
        "aria-selected": v.activatable.value ? r.value : f.value,
        onClick: M,
        onKeydown: C.value && !P.value && H
      }, l.linkProps), {
        default: () => {
          var Xe;
          return [Ro(C.value || A.value, "v-list-item"), Pe && u("div", {
            key: "prepend",
            class: "v-list-item__prepend"
          }, [o.prepend ? u(tt, {
            key: "prepend-defaults",
            disabled: !ke,
            defaults: {
              VAvatar: {
                density: e.density,
                image: e.prependAvatar
              },
              VIcon: {
                density: e.density,
                icon: e.prependIcon
              },
              VListItemAction: {
                start: !0
              }
            }
          }, {
            default: () => {
              var Me;
              return [(Me = o.prepend) == null ? void 0 : Me.call(o, B.value)];
            }
          }) : u(Ee, null, [e.prependAvatar && u(Ht, {
            key: "prepend-avatar",
            density: e.density,
            image: e.prependAvatar
          }, null), e.prependIcon && u(De, {
            key: "prepend-icon",
            density: e.density,
            icon: e.prependIcon
          }, null)]), u("div", {
            class: "v-list-item__spacer"
          }, null)]), u("div", {
            class: "v-list-item__content",
            "data-no-activator": ""
          }, [Ne && u(tl, {
            key: "title"
          }, {
            default: () => {
              var Me;
              return [((Me = o.title) == null ? void 0 : Me.call(o, {
                title: e.title
              })) ?? e.title];
            }
          }), we && u(_a, {
            key: "subtitle"
          }, {
            default: () => {
              var Me;
              return [((Me = o.subtitle) == null ? void 0 : Me.call(o, {
                subtitle: e.subtitle
              })) ?? e.subtitle];
            }
          }), (Xe = o.default) == null ? void 0 : Xe.call(o, B.value)]), J && u("div", {
            key: "append",
            class: "v-list-item__append"
          }, [o.append ? u(tt, {
            key: "append-defaults",
            disabled: !Ie,
            defaults: {
              VAvatar: {
                density: e.density,
                image: e.appendAvatar
              },
              VIcon: {
                density: e.density,
                icon: e.appendIcon
              },
              VListItemAction: {
                end: !0
              }
            }
          }, {
            default: () => {
              var Me;
              return [(Me = o.append) == null ? void 0 : Me.call(o, B.value)];
            }
          }) : u(Ee, null, [e.appendIcon && u(De, {
            key: "append-icon",
            density: e.density,
            icon: e.appendIcon
          }, null), e.appendAvatar && u(Ht, {
            key: "append-avatar",
            density: e.density,
            image: e.appendAvatar
          }, null)]), u("div", {
            class: "v-list-item__spacer"
          }, null)])];
        }
      }), [[Nn("ripple"), C.value && e.ripple]]);
    }), {
      activate: s,
      isActivated: r,
      isGroupActivator: h,
      isSelected: f,
      list: E,
      select: d,
      root: v,
      id: w
    };
  }
}), R_ = W({
  color: String,
  inset: Boolean,
  sticky: Boolean,
  title: String,
  ...Ae(),
  ...Ze()
}, "VListSubheader"), H_ = de()({
  name: "VListSubheader",
  props: R_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      textColorClasses: o,
      textColorStyles: i
    } = qt(se(e, "color"));
    return Se(() => {
      const l = !!(n.default || e.title);
      return u(e.tag, {
        class: ["v-list-subheader", {
          "v-list-subheader--inset": e.inset,
          "v-list-subheader--sticky": e.sticky
        }, o.value, e.class],
        style: [{
          textColorStyles: i
        }, e.style]
      }, {
        default: () => {
          var a;
          return [l && u("div", {
            class: "v-list-subheader__text"
          }, [((a = n.default) == null ? void 0 : a.call(n)) ?? e.title])];
        }
      });
    }), {};
  }
}), j_ = W({
  color: String,
  inset: Boolean,
  length: [Number, String],
  opacity: [Number, String],
  thickness: [Number, String],
  vertical: Boolean,
  ...Ae(),
  ...nt()
}, "VDivider"), Zt = de()({
  name: "VDivider",
  props: j_(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      themeClasses: i
    } = ct(e), {
      textColorClasses: l,
      textColorStyles: a
    } = qt(se(e, "color")), s = p(() => {
      const r = {};
      return e.length && (r[e.vertical ? "height" : "width"] = pe(e.length)), e.thickness && (r[e.vertical ? "borderRightWidth" : "borderTopWidth"] = pe(e.thickness)), r;
    });
    return Se(() => {
      const r = u("hr", {
        class: [{
          "v-divider": !0,
          "v-divider--inset": e.inset,
          "v-divider--vertical": e.vertical
        }, i.value, l.value, e.class],
        style: [s.value, a.value, {
          "--v-border-opacity": e.opacity
        }, e.style],
        "aria-orientation": !n.role || n.role === "separator" ? e.vertical ? "vertical" : "horizontal" : void 0,
        role: `${n.role || "separator"}`
      }, null);
      return o.default ? u("div", {
        class: ["v-divider__wrapper", {
          "v-divider__wrapper--vertical": e.vertical,
          "v-divider__wrapper--inset": e.inset
        }]
      }, [r, u("div", {
        class: "v-divider__content"
      }, [o.default()]), r]) : r;
    }), {};
  }
}), z_ = W({
  items: Array,
  returnObject: Boolean
}, "VListChildren"), Vm = de()({
  name: "VListChildren",
  props: z_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _m(), () => {
      var o, i;
      return ((o = n.default) == null ? void 0 : o.call(n)) ?? ((i = e.items) == null ? void 0 : i.map((l) => {
        var m, h;
        let {
          children: a,
          props: s,
          type: r,
          raw: d
        } = l;
        if (r === "divider")
          return ((m = n.divider) == null ? void 0 : m.call(n, {
            props: s
          })) ?? u(Zt, s, null);
        if (r === "subheader")
          return ((h = n.subheader) == null ? void 0 : h.call(n, {
            props: s
          })) ?? u(H_, s, null);
        const c = {
          subtitle: n.subtitle ? (v) => {
            var g;
            return (g = n.subtitle) == null ? void 0 : g.call(n, {
              ...v,
              item: d
            });
          } : void 0,
          prepend: n.prepend ? (v) => {
            var g;
            return (g = n.prepend) == null ? void 0 : g.call(n, {
              ...v,
              item: d
            });
          } : void 0,
          append: n.append ? (v) => {
            var g;
            return (g = n.append) == null ? void 0 : g.call(n, {
              ...v,
              item: d
            });
          } : void 0,
          title: n.title ? (v) => {
            var g;
            return (g = n.title) == null ? void 0 : g.call(n, {
              ...v,
              item: d
            });
          } : void 0
        }, f = Yl.filterProps(s);
        return a ? u(Yl, be({
          value: s == null ? void 0 : s.value
        }, f), {
          activator: (v) => {
            let {
              props: g
            } = v;
            const y = {
              ...s,
              ...g,
              value: e.returnObject ? d : s.value
            };
            return n.header ? n.header({
              props: y
            }) : u(He, y, c);
          },
          default: () => u(Vm, {
            items: a,
            returnObject: e.returnObject
          }, n)
        }) : n.item ? n.item({
          props: s
        }) : u(He, be(s, {
          value: e.returnObject ? d : s.value
        }), c);
      }));
    };
  }
}), Nm = W({
  items: {
    type: Array,
    default: () => []
  },
  itemTitle: {
    type: [String, Array, Function],
    default: "title"
  },
  itemValue: {
    type: [String, Array, Function],
    default: "value"
  },
  itemChildren: {
    type: [Boolean, String, Array, Function],
    default: "children"
  },
  itemProps: {
    type: [Boolean, String, Array, Function],
    default: "props"
  },
  returnObject: Boolean,
  valueComparator: {
    type: Function,
    default: ai
  }
}, "list-items");
function Es(e, t) {
  const n = zn(t, e.itemTitle, t), o = zn(t, e.itemValue, n), i = zn(t, e.itemChildren), l = e.itemProps === !0 ? typeof t == "object" && t != null && !Array.isArray(t) ? "children" in t ? Xn(t, ["children"]) : t : void 0 : zn(t, e.itemProps), a = {
    title: n,
    value: o,
    ...l
  };
  return {
    title: String(a.title ?? ""),
    value: a.value,
    props: a,
    children: Array.isArray(i) ? Tm(e, i) : void 0,
    raw: t
  };
}
function Tm(e, t) {
  const n = [];
  for (const o of t)
    n.push(Es(e, o));
  return n;
}
function U_(e) {
  const t = p(() => Tm(e, e.items)), n = p(() => t.value.some((l) => l.value === null));
  function o(l) {
    return n.value || (l = l.filter((a) => a !== null)), l.map((a) => e.returnObject && typeof a == "string" ? Es(e, a) : t.value.find((s) => e.valueComparator(a, s.value)) || Es(e, a));
  }
  function i(l) {
    return e.returnObject ? l.map((a) => {
      let {
        raw: s
      } = a;
      return s;
    }) : l.map((a) => {
      let {
        value: s
      } = a;
      return s;
    });
  }
  return {
    items: t,
    transformIn: o,
    transformOut: i
  };
}
function W_(e) {
  return typeof e == "string" || typeof e == "number" || typeof e == "boolean";
}
function q_(e, t) {
  const n = zn(t, e.itemType, "item"), o = W_(t) ? t : zn(t, e.itemTitle), i = zn(t, e.itemValue, void 0), l = zn(t, e.itemChildren), a = e.itemProps === !0 ? Xn(t, ["children"]) : zn(t, e.itemProps), s = {
    title: o,
    value: i,
    ...a
  };
  return {
    type: n,
    title: s.title,
    value: s.value,
    props: s,
    children: n === "item" && l ? Om(e, l) : void 0,
    raw: t
  };
}
function Om(e, t) {
  const n = [];
  for (const o of t)
    n.push(q_(e, o));
  return n;
}
function K_(e) {
  return {
    items: p(() => Om(e, e.items))
  };
}
const G_ = W({
  baseColor: String,
  /* @deprecated */
  activeColor: String,
  activeClass: String,
  bgColor: String,
  disabled: Boolean,
  expandIcon: String,
  collapseIcon: String,
  lines: {
    type: [Boolean, String],
    default: "one"
  },
  slim: Boolean,
  nav: Boolean,
  "onClick:open": Pt(),
  "onClick:select": Pt(),
  "onUpdate:opened": Pt(),
  ...P_({
    selectStrategy: "single-leaf",
    openStrategy: "list"
  }),
  ...Zn(),
  ...Ae(),
  ...Kt(),
  ...Dn(),
  ...An(),
  itemType: {
    type: String,
    default: "type"
  },
  ...Nm(),
  ...St(),
  ...Ze(),
  ...nt(),
  ...Pn({
    variant: "text"
  })
}, "VList"), dn = de()({
  name: "VList",
  props: G_(),
  emits: {
    "update:selected": (e) => !0,
    "update:activated": (e) => !0,
    "update:opened": (e) => !0,
    "click:open": (e) => !0,
    "click:activate": (e) => !0,
    "click:select": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      items: o
    } = K_(e), {
      themeClasses: i
    } = ct(e), {
      backgroundColorClasses: l,
      backgroundColorStyles: a
    } = Dt(se(e, "bgColor")), {
      borderClasses: s
    } = Qn(e), {
      densityClasses: r
    } = tn(e), {
      dimensionStyles: d
    } = $n(e), {
      elevationClasses: c
    } = In(e), {
      roundedClasses: f
    } = Ct(e), {
      children: m,
      open: h,
      parents: v,
      select: g,
      getPath: y
    } = D_(e), w = p(() => e.lines ? `v-list--${e.lines}-line` : void 0), E = se(e, "activeColor"), A = se(e, "baseColor"), P = se(e, "color");
    _m(), Jn({
      VListGroup: {
        activeColor: E,
        baseColor: A,
        color: P,
        expandIcon: se(e, "expandIcon"),
        collapseIcon: se(e, "collapseIcon")
      },
      VListItem: {
        activeClass: se(e, "activeClass"),
        activeColor: E,
        baseColor: A,
        color: P,
        density: se(e, "density"),
        disabled: se(e, "disabled"),
        lines: se(e, "lines"),
        nav: se(e, "nav"),
        slim: se(e, "slim"),
        variant: se(e, "variant")
      }
    });
    const C = he(!1), x = ie();
    function I(D) {
      C.value = !0;
    }
    function N(D) {
      C.value = !1;
    }
    function T(D) {
      var R;
      !C.value && !(D.relatedTarget && ((R = x.value) != null && R.contains(D.relatedTarget))) && k();
    }
    function $(D) {
      const R = D.target;
      if (!(!x.value || ["INPUT", "TEXTAREA"].includes(R.tagName))) {
        if (D.key === "ArrowDown")
          k("next");
        else if (D.key === "ArrowUp")
          k("prev");
        else if (D.key === "Home")
          k("first");
        else if (D.key === "End")
          k("last");
        else
          return;
        D.preventDefault();
      }
    }
    function O(D) {
      C.value = !0;
    }
    function k(D) {
      if (x.value)
        return Ei(x.value, D);
    }
    return Se(() => u(e.tag, {
      ref: x,
      class: ["v-list", {
        "v-list--disabled": e.disabled,
        "v-list--nav": e.nav,
        "v-list--slim": e.slim
      }, i.value, l.value, s.value, r.value, c.value, w.value, f.value, e.class],
      style: [a.value, d.value, e.style],
      tabindex: e.disabled || C.value ? -1 : 0,
      role: "listbox",
      "aria-activedescendant": void 0,
      onFocusin: I,
      onFocusout: N,
      onFocus: T,
      onKeydown: $,
      onMousedown: O
    }, {
      default: () => [u(Vm, {
        items: o.value,
        returnObject: e.returnObject
      }, n)]
    })), {
      open: h,
      select: g,
      focus: k,
      children: m,
      parents: v,
      getPath: y
    };
  }
}), Y_ = {
  name: "BookAnnotations",
  emits: ["locate", "open-settings"],
  props: {
    toolbarEnabled: { type: Boolean, default: !0 },
    selectionCfi: { type: String, default: "" },
    annotations: { type: Array, default: () => [] },
    loading: { type: Boolean, default: !1 },
    error: { type: String, default: "" }
  }
}, X_ = { class: "mt-2" }, J_ = {
  key: 0,
  class: "text-medium-emphasis mt-1"
}, Z_ = { class: "annotation-meta text-medium-emphasis" }, Q_ = {
  key: 1,
  class: "annotation-content mt-1"
}, e0 = {
  key: 1,
  class: "annotation-location-hint text-medium-emphasis"
};
function t0(e, t, n, o, i, l) {
  return Q(), me(bt, {
    class: "annotation-panel",
    rounded: "t-lg",
    "aria-busy": String(n.loading)
  }, {
    default: _(() => [
      n.loading ? (Q(), me(_r, {
        key: 0,
        "aria-label": "正在加载笔记",
        indeterminate: ""
      })) : n.error ? (Q(), me(Yo, {
        key: 1,
        class: "ma-3",
        type: "error",
        variant: "tonal",
        density: "compact"
      }, {
        default: _(() => [
          q(Oe(n.error) + "。请刷新笔记重试。", 1)
        ]),
        _: 1
      })) : n.annotations.length === 0 ? (Q(), me(Jt, {
        key: 2,
        class: "annotation-empty text-center"
      }, {
        default: _(() => [
          u(De, { size: "32" }, {
            default: _(() => t[1] || (t[1] = [
              q("mdi-notebook-outline")
            ])),
            _: 1
          }),
          ue("div", X_, Oe(n.selectionCfi ? "此处还没有笔记" : "还没有划线或笔记"), 1),
          n.toolbarEnabled && !n.selectionCfi ? (Q(), Re("div", J_, "在正文中选择文字即可开始。")) : !n.toolbarEnabled && !n.selectionCfi ? (Q(), Re(Ee, { key: 1 }, [
            t[3] || (t[3] = ue("div", { class: "text-medium-emphasis mt-1" }, "选区工具栏已关闭，开启后即可添加划线或笔记。", -1)),
            u(ce, {
              class: "mt-3",
              variant: "tonal",
              onClick: t[0] || (t[0] = (a) => e.$emit("open-settings"))
            }, {
              default: _(() => t[2] || (t[2] = [
                q("前往设置开启工具栏")
              ])),
              _: 1
            })
          ], 64)) : We("", !0)
        ]),
        _: 1
      })) : (Q(), me(dn, {
        key: 3,
        "aria-label": "本书笔记列表",
        lines: "three"
      }, {
        default: _(() => [
          (Q(!0), Re(Ee, null, jt(n.annotations, (a) => (Q(), me(He, {
            key: a.id || a.client_id,
            class: "annotation-item",
            link: !!a.cfi,
            onClick: (s) => a.cfi && e.$emit("locate", a)
          }, {
            prepend: _(() => [
              u(De, {
                color: a.annotation_type === "note" ? "blue" : "amber-darken-2"
              }, {
                default: _(() => [
                  q(Oe(a.annotation_type === "note" ? "mdi-note-text-outline" : "mdi-format-color-highlight"), 1)
                ]),
                _: 2
              }, 1032, ["color"])
            ]),
            append: _(() => [
              a.cfi ? (Q(), me(De, {
                key: 0,
                size: "small"
              }, {
                default: _(() => t[4] || (t[4] = [
                  q("mdi-chevron-right")
                ])),
                _: 1
              })) : (Q(), Re("span", e0, "仅章节定位"))
            ]),
            default: _(() => [
              u(tl, null, {
                default: _(() => [
                  q(Oe(a.chapter || "未命名章节"), 1)
                ]),
                _: 2
              }, 1024),
              ue("div", Z_, Oe(a.annotation_type === "highlight" ? "划线笔记" : "文字笔记") + " · " + Oe(a.is_private === !1 ? "公开" : "私密"), 1),
              a.quote_text ? (Q(), me(_a, {
                key: 0,
                class: "annotation-quote"
              }, {
                default: _(() => [
                  q(Oe(a.quote_text), 1)
                ]),
                _: 2
              }, 1024)) : We("", !0),
              a.content ? (Q(), Re("div", Q_, Oe(a.content), 1)) : We("", !0)
            ]),
            _: 2
          }, 1032, ["link", "onClick"]))), 128))
        ]),
        _: 1
      }))
    ]),
    _: 1
  }, 8, ["aria-busy"]);
}
const Am = /* @__PURE__ */ On(Y_, [["render", t0], ["__scopeId", "data-v-cd92ee1b"]]), Im = ma.reduce((e, t) => (e[t] = {
  type: [Boolean, String, Number],
  default: !1
}, e), {}), Pm = ma.reduce((e, t) => {
  const n = "offset" + Qt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), Dm = ma.reduce((e, t) => {
  const n = "order" + Qt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), Sc = {
  col: Object.keys(Im),
  offset: Object.keys(Pm),
  order: Object.keys(Dm)
};
function n0(e, t, n) {
  let o = e;
  if (!(n == null || n === !1)) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return e === "col" && (o = "v-" + o), e === "col" && (n === "" || n === !0) || (o += `-${n}`), o.toLowerCase();
  }
}
const o0 = ["auto", "start", "end", "center", "baseline", "stretch"], i0 = W({
  cols: {
    type: [Boolean, String, Number],
    default: !1
  },
  ...Im,
  offset: {
    type: [String, Number],
    default: null
  },
  ...Pm,
  order: {
    type: [String, Number],
    default: null
  },
  ...Dm,
  alignSelf: {
    type: String,
    default: null,
    validator: (e) => o0.includes(e)
  },
  ...Ae(),
  ...Ze()
}, "VCol"), Be = de()({
  name: "VCol",
  props: i0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = p(() => {
      const i = [];
      let l;
      for (l in Sc)
        Sc[l].forEach((s) => {
          const r = e[s], d = n0(l, s, r);
          d && i.push(d);
        });
      const a = i.some((s) => s.startsWith("v-col-"));
      return i.push({
        // Default to .v-col if no other col-{bp}-* classes generated nor `cols` specified.
        "v-col": !a || !e.cols,
        [`v-col-${e.cols}`]: e.cols,
        [`offset-${e.offset}`]: e.offset,
        [`order-${e.order}`]: e.order,
        [`align-self-${e.alignSelf}`]: e.alignSelf
      }), i;
    });
    return () => {
      var i;
      return co(e.tag, {
        class: [o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), Nr = ["start", "end", "center"], $m = ["space-between", "space-around", "space-evenly"];
function Tr(e, t) {
  return ma.reduce((n, o) => {
    const i = e + Qt(o);
    return n[i] = t(), n;
  }, {});
}
const l0 = [...Nr, "baseline", "stretch"], Mm = (e) => l0.includes(e), Bm = Tr("align", () => ({
  type: String,
  default: null,
  validator: Mm
})), a0 = [...Nr, ...$m], Fm = (e) => a0.includes(e), Lm = Tr("justify", () => ({
  type: String,
  default: null,
  validator: Fm
})), s0 = [...Nr, ...$m, "stretch"], Rm = (e) => s0.includes(e), Hm = Tr("alignContent", () => ({
  type: String,
  default: null,
  validator: Rm
})), Cc = {
  align: Object.keys(Bm),
  justify: Object.keys(Lm),
  alignContent: Object.keys(Hm)
}, r0 = {
  align: "align",
  justify: "justify",
  alignContent: "align-content"
};
function u0(e, t, n) {
  let o = r0[e];
  if (n != null) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return o += `-${n}`, o.toLowerCase();
  }
}
const c0 = W({
  dense: Boolean,
  noGutters: Boolean,
  align: {
    type: String,
    default: null,
    validator: Mm
  },
  ...Bm,
  justify: {
    type: String,
    default: null,
    validator: Fm
  },
  ...Lm,
  alignContent: {
    type: String,
    default: null,
    validator: Rm
  },
  ...Hm,
  ...Ae(),
  ...Ze()
}, "VRow"), Bt = de()({
  name: "VRow",
  props: c0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = p(() => {
      const i = [];
      let l;
      for (l in Cc)
        Cc[l].forEach((a) => {
          const s = e[a], r = u0(l, a, s);
          r && i.push(r);
        });
      return i.push({
        "v-row--no-gutters": e.noGutters,
        "v-row--dense": e.dense,
        [`align-${e.align}`]: e.align,
        [`justify-${e.justify}`]: e.justify,
        [`align-content-${e.alignContent}`]: e.alignContent
      }), i;
    });
    return () => {
      var i;
      return co(e.tag, {
        class: ["v-row", o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), Sl = da("v-spacer", "div", "VSpacer"), d0 = W({
  active: Boolean,
  disabled: Boolean,
  max: [Number, String],
  value: {
    type: [Number, String],
    default: 0
  },
  ...Ae(),
  ...di({
    transition: {
      component: ym
    }
  })
}, "VCounter"), jm = de()({
  name: "VCounter",
  functional: !0,
  props: d0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = p(() => e.max ? `${e.value} / ${e.max}` : String(e.value));
    return Se(() => u(Cn, {
      transition: e.transition
    }, {
      default: () => [lt(u("div", {
        class: ["v-counter", {
          "text-error": e.max && !e.disabled && parseFloat(e.value) > parseFloat(e.max)
        }, e.class],
        style: e.style
      }, [n.default ? n.default({
        counter: o.value,
        max: e.max,
        value: e.value
      }) : o.value]), [[hn, e.active]])]
    })), {};
  }
}), f0 = W({
  text: String,
  onClick: Pt(),
  ...Ae(),
  ...nt()
}, "VLabel"), Or = de()({
  name: "VLabel",
  props: f0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Se(() => {
      var o;
      return u("label", {
        class: ["v-label", {
          "v-label--clickable": !!e.onClick
        }, e.class],
        style: e.style,
        onClick: e.onClick
      }, [e.text, (o = n.default) == null ? void 0 : o.call(n)]);
    }), {};
  }
}), m0 = W({
  floating: Boolean,
  ...Ae()
}, "VFieldLabel"), fl = de()({
  name: "VFieldLabel",
  props: m0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Se(() => u(Or, {
      class: ["v-field-label", {
        "v-field-label--floating": e.floating
      }, e.class],
      style: e.style,
      "aria-hidden": e.floating || void 0
    }, n)), {};
  }
});
function zm(e) {
  const {
    t
  } = ri();
  function n(o) {
    let {
      name: i
    } = o;
    const l = {
      prepend: "prependAction",
      prependInner: "prependAction",
      append: "appendAction",
      appendInner: "appendAction",
      clear: "clear"
    }[i], a = e[`onClick:${i}`], s = a && l ? t(`$vuetify.input.${l}`, e.label ?? "") : void 0;
    return u(De, {
      icon: e[`${i}Icon`],
      "aria-label": s,
      onClick: a
    }, null);
  }
  return {
    InputIcon: n
  };
}
const Ar = W({
  focused: Boolean,
  "onUpdate:focused": Pt()
}, "focus");
function wa(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn();
  const n = Ye(e, "focused"), o = p(() => ({
    [`${t}--focused`]: n.value
  }));
  function i() {
    n.value = !0;
  }
  function l() {
    n.value = !1;
  }
  return {
    focusClasses: o,
    isFocused: n,
    focus: i,
    blur: l
  };
}
const v0 = ["underlined", "outlined", "filled", "solo", "solo-inverted", "solo-filled", "plain"], Ir = W({
  appendInnerIcon: ze,
  bgColor: String,
  clearable: Boolean,
  clearIcon: {
    type: ze,
    default: "$clear"
  },
  active: Boolean,
  centerAffix: {
    type: Boolean,
    default: void 0
  },
  color: String,
  baseColor: String,
  dirty: Boolean,
  disabled: {
    type: Boolean,
    default: null
  },
  error: Boolean,
  flat: Boolean,
  label: String,
  persistentClear: Boolean,
  prependInnerIcon: ze,
  reverse: Boolean,
  singleLine: Boolean,
  variant: {
    type: String,
    default: "filled",
    validator: (e) => v0.includes(e)
  },
  "onClick:clear": Pt(),
  "onClick:appendInner": Pt(),
  "onClick:prependInner": Pt(),
  ...Ae(),
  ...wr(),
  ...St(),
  ...nt()
}, "VField"), Pr = de()({
  name: "VField",
  inheritAttrs: !1,
  props: {
    id: String,
    ...Ar(),
    ...Ir()
  },
  emits: {
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      emit: o,
      slots: i
    } = t;
    const {
      themeClasses: l
    } = ct(e), {
      loaderClasses: a
    } = kr(e), {
      focusClasses: s,
      isFocused: r,
      focus: d,
      blur: c
    } = wa(e), {
      InputIcon: f
    } = zm(e), {
      roundedClasses: m
    } = Ct(e), {
      rtlClasses: h
    } = $t(), v = p(() => e.dirty || e.active), g = p(() => !e.singleLine && !!(e.label || i.label)), y = gn(), w = p(() => e.id || `input-${y}`), E = p(() => `${w.value}-messages`), A = ie(), P = ie(), C = ie(), x = p(() => ["plain", "underlined"].includes(e.variant)), {
      backgroundColorClasses: I,
      backgroundColorStyles: N
    } = Dt(se(e, "bgColor")), {
      textColorClasses: T,
      textColorStyles: $
    } = qt(p(() => e.error || e.disabled ? void 0 : v.value && r.value ? e.color : e.baseColor));
    ge(v, (R) => {
      if (g.value) {
        const G = A.value.$el, re = P.value.$el;
        requestAnimationFrame(() => {
          const oe = cr(G), ee = re.getBoundingClientRect(), B = ee.x - oe.x, M = ee.y - oe.y - (oe.height / 2 - ee.height / 2), H = ee.width / 0.75, K = Math.abs(H - oe.width) > 1 ? {
            maxWidth: pe(H)
          } : void 0, Ne = getComputedStyle(G), we = getComputedStyle(re), Ie = parseFloat(Ne.transitionDuration) * 1e3 || 150, J = parseFloat(we.getPropertyValue("--v-field-label-scale")), ke = we.getPropertyValue("color");
          G.style.visibility = "visible", re.style.visibility = "hidden", Co(G, {
            transform: `translate(${B}px, ${M}px) scale(${J})`,
            color: ke,
            ...K
          }, {
            duration: Ie,
            easing: $i,
            direction: R ? "normal" : "reverse"
          }).finished.then(() => {
            G.style.removeProperty("visibility"), re.style.removeProperty("visibility");
          });
        });
      }
    }, {
      flush: "post"
    });
    const O = p(() => ({
      isActive: v,
      isFocused: r,
      controlRef: C,
      blur: c,
      focus: d
    }));
    function k(R) {
      R.target !== document.activeElement && R.preventDefault();
    }
    function D(R) {
      var G;
      R.key !== "Enter" && R.key !== " " || (R.preventDefault(), R.stopPropagation(), (G = e["onClick:clear"]) == null || G.call(e, new MouseEvent("click")));
    }
    return Se(() => {
      var B, M, H;
      const R = e.variant === "outlined", G = !!(i["prepend-inner"] || e.prependInnerIcon), re = !!(e.clearable || i.clear), oe = !!(i["append-inner"] || e.appendInnerIcon || re), ee = () => i.label ? i.label({
        ...O.value,
        label: e.label,
        props: {
          for: w.value
        }
      }) : e.label;
      return u("div", be({
        class: ["v-field", {
          "v-field--active": v.value,
          "v-field--appended": oe,
          "v-field--center-affix": e.centerAffix ?? !x.value,
          "v-field--disabled": e.disabled,
          "v-field--dirty": e.dirty,
          "v-field--error": e.error,
          "v-field--flat": e.flat,
          "v-field--has-background": !!e.bgColor,
          "v-field--persistent-clear": e.persistentClear,
          "v-field--prepended": G,
          "v-field--reverse": e.reverse,
          "v-field--single-line": e.singleLine,
          "v-field--no-label": !ee(),
          [`v-field--variant-${e.variant}`]: !0
        }, l.value, I.value, s.value, a.value, m.value, h.value, e.class],
        style: [N.value, e.style],
        onClick: k
      }, n), [u("div", {
        class: "v-field__overlay"
      }, null), u(nm, {
        name: "v-field",
        active: !!e.loading,
        color: e.error ? "error" : typeof e.loading == "string" ? e.loading : e.color
      }, {
        default: i.loader
      }), G && u("div", {
        key: "prepend",
        class: "v-field__prepend-inner"
      }, [e.prependInnerIcon && u(f, {
        key: "prepend-icon",
        name: "prependInner"
      }, null), (B = i["prepend-inner"]) == null ? void 0 : B.call(i, O.value)]), u("div", {
        class: "v-field__field",
        "data-no-activator": ""
      }, [["filled", "solo", "solo-inverted", "solo-filled"].includes(e.variant) && g.value && u(fl, {
        key: "floating-label",
        ref: P,
        class: [T.value],
        floating: !0,
        for: w.value,
        style: $.value
      }, {
        default: () => [ee()]
      }), u(fl, {
        ref: A,
        for: w.value
      }, {
        default: () => [ee()]
      }), (M = i.default) == null ? void 0 : M.call(i, {
        ...O.value,
        props: {
          id: w.value,
          class: "v-field__input",
          "aria-describedby": E.value
        },
        focus: d,
        blur: c
      })]), re && u(bm, {
        key: "clear"
      }, {
        default: () => [lt(u("div", {
          class: "v-field__clearable",
          onMousedown: (K) => {
            K.preventDefault(), K.stopPropagation();
          }
        }, [u(tt, {
          defaults: {
            VIcon: {
              icon: e.clearIcon
            }
          }
        }, {
          default: () => [i.clear ? i.clear({
            ...O.value,
            props: {
              onKeydown: D,
              onFocus: d,
              onBlur: c,
              onClick: e["onClick:clear"]
            }
          }) : u(f, {
            name: "clear",
            onKeydown: D,
            onFocus: d,
            onBlur: c
          }, null)]
        })]), [[hn, e.dirty]])]
      }), oe && u("div", {
        key: "append",
        class: "v-field__append-inner"
      }, [(H = i["append-inner"]) == null ? void 0 : H.call(i, O.value), e.appendInnerIcon && u(f, {
        key: "append-icon",
        name: "appendInner"
      }, null)]), u("div", {
        class: ["v-field__outline", T.value],
        style: $.value
      }, [R && u(Ee, null, [u("div", {
        class: "v-field__outline__start"
      }, null), g.value && u("div", {
        class: "v-field__outline__notch"
      }, [u(fl, {
        ref: P,
        floating: !0,
        for: w.value
      }, {
        default: () => [ee()]
      })]), u("div", {
        class: "v-field__outline__end"
      }, null)]), x.value && g.value && u(fl, {
        ref: P,
        floating: !0,
        for: w.value
      }, {
        default: () => [ee()]
      })])]);
    }), {
      controlRef: C
    };
  }
});
function Um(e) {
  const t = Object.keys(Pr.props).filter((n) => !sr(n) && n !== "class" && n !== "style");
  return bf(e, t);
}
const h0 = W({
  active: Boolean,
  color: String,
  messages: {
    type: [Array, String],
    default: () => []
  },
  ...Ae(),
  ...di({
    transition: {
      component: ym,
      leaveAbsolute: !0,
      group: !0
    }
  })
}, "VMessages"), g0 = de()({
  name: "VMessages",
  props: h0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = p(() => cn(e.messages)), {
      textColorClasses: i,
      textColorStyles: l
    } = qt(p(() => e.color));
    return Se(() => u(Cn, {
      transition: e.transition,
      tag: "div",
      class: ["v-messages", i.value, e.class],
      style: [l.value, e.style],
      role: "alert",
      "aria-live": "polite"
    }, {
      default: () => [e.active && o.value.map((a, s) => u("div", {
        class: "v-messages__message",
        key: `${s}-${o.value}`
      }, [n.message ? n.message({
        message: a
      }) : a]))]
    })), {};
  }
}), Wm = Symbol.for("vuetify:form"), y0 = W({
  disabled: Boolean,
  fastFail: Boolean,
  readonly: Boolean,
  modelValue: {
    type: Boolean,
    default: null
  },
  validateOn: {
    type: String,
    default: "input"
  }
}, "form");
function p0(e) {
  const t = Ye(e, "modelValue"), n = p(() => e.disabled), o = p(() => e.readonly), i = he(!1), l = ie([]), a = ie([]);
  async function s() {
    const c = [];
    let f = !0;
    a.value = [], i.value = !0;
    for (const m of l.value) {
      const h = await m.validate();
      if (h.length > 0 && (f = !1, c.push({
        id: m.id,
        errorMessages: h
      })), !f && e.fastFail) break;
    }
    return a.value = c, i.value = !1, {
      valid: f,
      errors: a.value
    };
  }
  function r() {
    l.value.forEach((c) => c.reset());
  }
  function d() {
    l.value.forEach((c) => c.resetValidation());
  }
  return ge(l, () => {
    let c = 0, f = 0;
    const m = [];
    for (const h of l.value)
      h.isValid === !1 ? (f++, m.push({
        id: h.id,
        errorMessages: h.errorMessages
      })) : h.isValid === !0 && c++;
    a.value = m, t.value = f > 0 ? !1 : c === l.value.length ? !0 : null;
  }, {
    deep: !0,
    flush: "post"
  }), ht(Wm, {
    register: (c) => {
      let {
        id: f,
        vm: m,
        validate: h,
        reset: v,
        resetValidation: g
      } = c;
      l.value.some((y) => y.id === f) && xn(`Duplicate input name "${f}"`), l.value.push({
        id: f,
        validate: h,
        reset: v,
        resetValidation: g,
        vm: sd(m),
        isValid: null,
        errorMessages: []
      });
    },
    unregister: (c) => {
      l.value = l.value.filter((f) => f.id !== c);
    },
    update: (c, f, m) => {
      const h = l.value.find((v) => v.id === c);
      h && (h.isValid = f, h.errorMessages = m);
    },
    isDisabled: n,
    isReadonly: o,
    isValidating: i,
    isValid: t,
    items: l,
    validateOn: se(e, "validateOn")
  }), {
    errors: a,
    isDisabled: n,
    isReadonly: o,
    isValidating: i,
    isValid: t,
    items: l,
    validate: s,
    reset: r,
    resetValidation: d
  };
}
function qm() {
  return Ge(Wm, null);
}
const b0 = W({
  disabled: {
    type: Boolean,
    default: null
  },
  error: Boolean,
  errorMessages: {
    type: [Array, String],
    default: () => []
  },
  maxErrors: {
    type: [Number, String],
    default: 1
  },
  name: String,
  label: String,
  readonly: {
    type: Boolean,
    default: null
  },
  rules: {
    type: Array,
    default: () => []
  },
  modelValue: null,
  validateOn: String,
  validationValue: null,
  ...Ar()
}, "validation");
function _0(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Tn(), n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : gn();
  const o = Ye(e, "modelValue"), i = p(() => e.validationValue === void 0 ? o.value : e.validationValue), l = qm(), a = ie([]), s = he(!0), r = p(() => !!(cn(o.value === "" ? null : o.value).length || cn(i.value === "" ? null : i.value).length)), d = p(() => !!(e.disabled ?? (l == null ? void 0 : l.isDisabled.value))), c = p(() => !!(e.readonly ?? (l == null ? void 0 : l.isReadonly.value))), f = p(() => {
    var C;
    return (C = e.errorMessages) != null && C.length ? cn(e.errorMessages).concat(a.value).slice(0, Math.max(0, +e.maxErrors)) : a.value;
  }), m = p(() => {
    let C = (e.validateOn ?? (l == null ? void 0 : l.validateOn.value)) || "input";
    C === "lazy" && (C = "input lazy"), C === "eager" && (C = "input eager");
    const x = new Set((C == null ? void 0 : C.split(" ")) ?? []);
    return {
      input: x.has("input"),
      blur: x.has("blur") || x.has("input") || x.has("invalid-input"),
      invalidInput: x.has("invalid-input"),
      lazy: x.has("lazy"),
      eager: x.has("eager")
    };
  }), h = p(() => {
    var C;
    return e.error || (C = e.errorMessages) != null && C.length ? !1 : e.rules.length ? s.value ? a.value.length || m.value.lazy ? null : !0 : !a.value.length : !0;
  }), v = he(!1), g = p(() => ({
    [`${t}--error`]: h.value === !1,
    [`${t}--dirty`]: r.value,
    [`${t}--disabled`]: d.value,
    [`${t}--readonly`]: c.value
  })), y = at("validation"), w = p(() => e.name ?? an(n));
  Gs(() => {
    l == null || l.register({
      id: w.value,
      vm: y,
      validate: P,
      reset: E,
      resetValidation: A
    });
  }), pt(() => {
    l == null || l.unregister(w.value);
  }), vn(async () => {
    m.value.lazy || await P(!m.value.eager), l == null || l.update(w.value, h.value, f.value);
  }), Wn(() => m.value.input || m.value.invalidInput && h.value === !1, () => {
    ge(i, () => {
      if (i.value != null)
        P();
      else if (e.focused) {
        const C = ge(() => e.focused, (x) => {
          x || P(), C();
        });
      }
    });
  }), Wn(() => m.value.blur, () => {
    ge(() => e.focused, (C) => {
      C || P();
    });
  }), ge([h, f], () => {
    l == null || l.update(w.value, h.value, f.value);
  });
  async function E() {
    o.value = null, await ot(), await A();
  }
  async function A() {
    s.value = !0, m.value.lazy ? a.value = [] : await P(!m.value.eager);
  }
  async function P() {
    let C = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !1;
    const x = [];
    v.value = !0;
    for (const I of e.rules) {
      if (x.length >= +(e.maxErrors ?? 1))
        break;
      const T = await (typeof I == "function" ? I : () => I)(i.value);
      if (T !== !0) {
        if (T !== !1 && typeof T != "string") {
          console.warn(`${T} is not a valid value. Rule functions must return boolean true or a string.`);
          continue;
        }
        x.push(T || "");
      }
    }
    return a.value = x, v.value = !1, s.value = C, a.value;
  }
  return {
    errorMessages: f,
    isDirty: r,
    isDisabled: d,
    isReadonly: c,
    isPristine: s,
    isValid: h,
    isValidating: v,
    reset: E,
    resetValidation: A,
    validate: P,
    validationClasses: g
  };
}
const ka = W({
  id: String,
  appendIcon: ze,
  centerAffix: {
    type: Boolean,
    default: !0
  },
  prependIcon: ze,
  hideDetails: [Boolean, String],
  hideSpinButtons: Boolean,
  hint: String,
  persistentHint: Boolean,
  messages: {
    type: [Array, String],
    default: () => []
  },
  direction: {
    type: String,
    default: "horizontal",
    validator: (e) => ["horizontal", "vertical"].includes(e)
  },
  "onClick:prepend": Pt(),
  "onClick:append": Pt(),
  ...Ae(),
  ...Kt(),
  ...Wy(Dn(), ["maxWidth", "minWidth", "width"]),
  ...nt(),
  ...b0()
}, "VInput"), oi = de()({
  name: "VInput",
  props: {
    ...ka()
  },
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o,
      emit: i
    } = t;
    const {
      densityClasses: l
    } = tn(e), {
      dimensionStyles: a
    } = $n(e), {
      themeClasses: s
    } = ct(e), {
      rtlClasses: r
    } = $t(), {
      InputIcon: d
    } = zm(e), c = gn(), f = p(() => e.id || `input-${c}`), m = p(() => `${f.value}-messages`), {
      errorMessages: h,
      isDirty: v,
      isDisabled: g,
      isReadonly: y,
      isPristine: w,
      isValid: E,
      isValidating: A,
      reset: P,
      resetValidation: C,
      validate: x,
      validationClasses: I
    } = _0(e, "v-input", f), N = p(() => ({
      id: f,
      messagesId: m,
      isDirty: v,
      isDisabled: g,
      isReadonly: y,
      isPristine: w,
      isValid: E,
      isValidating: A,
      reset: P,
      resetValidation: C,
      validate: x
    })), T = p(() => {
      var $;
      return ($ = e.errorMessages) != null && $.length || !w.value && h.value.length ? h.value : e.hint && (e.persistentHint || e.focused) ? e.hint : e.messages;
    });
    return Se(() => {
      var R, G, re, oe;
      const $ = !!(o.prepend || e.prependIcon), O = !!(o.append || e.appendIcon), k = T.value.length > 0, D = !e.hideDetails || e.hideDetails === "auto" && (k || !!o.details);
      return u("div", {
        class: ["v-input", `v-input--${e.direction}`, {
          "v-input--center-affix": e.centerAffix,
          "v-input--hide-spin-buttons": e.hideSpinButtons
        }, l.value, s.value, r.value, I.value, e.class],
        style: [a.value, e.style]
      }, [$ && u("div", {
        key: "prepend",
        class: "v-input__prepend"
      }, [(R = o.prepend) == null ? void 0 : R.call(o, N.value), e.prependIcon && u(d, {
        key: "prepend-icon",
        name: "prepend"
      }, null)]), o.default && u("div", {
        class: "v-input__control"
      }, [(G = o.default) == null ? void 0 : G.call(o, N.value)]), O && u("div", {
        key: "append",
        class: "v-input__append"
      }, [e.appendIcon && u(d, {
        key: "append-icon",
        name: "append"
      }, null), (re = o.append) == null ? void 0 : re.call(o, N.value)]), D && u("div", {
        class: "v-input__details"
      }, [u(g0, {
        id: m.value,
        active: k,
        messages: T.value
      }, {
        message: o.message
      }), (oe = o.details) == null ? void 0 : oe.call(o, N.value)])]);
    }), {
      reset: P,
      resetValidation: C,
      validate: x,
      isValid: E,
      errorMessages: h
    };
  }
}), za = Symbol("Forwarded refs");
function Ua(e, t) {
  let n = e;
  for (; n; ) {
    const o = Reflect.getOwnPropertyDescriptor(n, t);
    if (o) return o;
    n = Object.getPrototypeOf(n);
  }
}
function fo(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), o = 1; o < t; o++)
    n[o - 1] = arguments[o];
  return e[za] = n, new Proxy(e, {
    get(i, l) {
      if (Reflect.has(i, l))
        return Reflect.get(i, l);
      if (!(typeof l == "symbol" || l.startsWith("$") || l.startsWith("__"))) {
        for (const a of n)
          if (a.value && Reflect.has(a.value, l)) {
            const s = Reflect.get(a.value, l);
            return typeof s == "function" ? s.bind(a.value) : s;
          }
      }
    },
    has(i, l) {
      if (Reflect.has(i, l))
        return !0;
      if (typeof l == "symbol" || l.startsWith("$") || l.startsWith("__")) return !1;
      for (const a of n)
        if (a.value && Reflect.has(a.value, l))
          return !0;
      return !1;
    },
    set(i, l, a) {
      if (Reflect.has(i, l))
        return Reflect.set(i, l, a);
      if (typeof l == "symbol" || l.startsWith("$") || l.startsWith("__")) return !1;
      for (const s of n)
        if (s.value && Reflect.has(s.value, l))
          return Reflect.set(s.value, l, a);
      return !1;
    },
    getOwnPropertyDescriptor(i, l) {
      var s;
      const a = Reflect.getOwnPropertyDescriptor(i, l);
      if (a) return a;
      if (!(typeof l == "symbol" || l.startsWith("$") || l.startsWith("__"))) {
        for (const r of n) {
          if (!r.value) continue;
          const d = Ua(r.value, l) ?? ("_" in r.value ? Ua((s = r.value._) == null ? void 0 : s.setupState, l) : void 0);
          if (d) return d;
        }
        for (const r of n) {
          const d = r.value && r.value[za];
          if (!d) continue;
          const c = d.slice();
          for (; c.length; ) {
            const f = c.shift(), m = Ua(f.value, l);
            if (m) return m;
            const h = f.value && f.value[za];
            h && c.push(...h);
          }
        }
      }
    }
  });
}
const w0 = ["color", "file", "time", "date", "datetime-local", "week", "month"], Km = W({
  autofocus: Boolean,
  counter: [Boolean, Number, String],
  counterValue: [Number, Function],
  prefix: String,
  placeholder: String,
  persistentPlaceholder: Boolean,
  persistentCounter: Boolean,
  suffix: String,
  role: String,
  type: {
    type: String,
    default: "text"
  },
  modelModifiers: Object,
  ...ka(),
  ...Ir()
}, "VTextField"), Lt = de()({
  name: "VTextField",
  directives: {
    Intersect: Sr
  },
  inheritAttrs: !1,
  props: Km(),
  emits: {
    "click:control": (e) => !0,
    "mousedown:control": (e) => !0,
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      emit: o,
      slots: i
    } = t;
    const l = Ye(e, "modelValue"), {
      isFocused: a,
      focus: s,
      blur: r
    } = wa(e), d = p(() => typeof e.counterValue == "function" ? e.counterValue(l.value) : typeof e.counterValue == "number" ? e.counterValue : (l.value ?? "").toString().length), c = p(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    }), f = p(() => ["plain", "underlined"].includes(e.variant));
    function m(x, I) {
      var N, T;
      !e.autofocus || !x || (T = (N = I[0].target) == null ? void 0 : N.focus) == null || T.call(N);
    }
    const h = ie(), v = ie(), g = ie(), y = p(() => w0.includes(e.type) || e.persistentPlaceholder || a.value || e.active);
    function w() {
      var x;
      g.value !== document.activeElement && ((x = g.value) == null || x.focus()), a.value || s();
    }
    function E(x) {
      o("mousedown:control", x), x.target !== g.value && (w(), x.preventDefault());
    }
    function A(x) {
      w(), o("click:control", x);
    }
    function P(x) {
      x.stopPropagation(), w(), ot(() => {
        l.value = null, Sf(e["onClick:clear"], x);
      });
    }
    function C(x) {
      var N;
      const I = x.target;
      if (l.value = I.value, (N = e.modelModifiers) != null && N.trim && ["text", "search", "password", "tel", "url"].includes(e.type)) {
        const T = [I.selectionStart, I.selectionEnd];
        ot(() => {
          I.selectionStart = T[0], I.selectionEnd = T[1];
        });
      }
    }
    return Se(() => {
      const x = !!(i.counter || e.counter !== !1 && e.counter != null), I = !!(x || i.details), [N, T] = rr(n), {
        modelValue: $,
        ...O
      } = oi.filterProps(e), k = Um(e);
      return u(oi, be({
        ref: h,
        modelValue: l.value,
        "onUpdate:modelValue": (D) => l.value = D,
        class: ["v-text-field", {
          "v-text-field--prefixed": e.prefix,
          "v-text-field--suffixed": e.suffix,
          "v-input--plain-underlined": f.value
        }, e.class],
        style: e.style
      }, N, O, {
        centerAffix: !f.value,
        focused: a.value
      }), {
        ...i,
        default: (D) => {
          let {
            id: R,
            isDisabled: G,
            isDirty: re,
            isReadonly: oe,
            isValid: ee
          } = D;
          return u(Pr, be({
            ref: v,
            onMousedown: E,
            onClick: A,
            "onClick:clear": P,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"],
            role: e.role
          }, k, {
            id: R.value,
            active: y.value || re.value,
            dirty: re.value || e.dirty,
            disabled: G.value,
            focused: a.value,
            error: ee.value === !1
          }), {
            ...i,
            default: (B) => {
              let {
                props: {
                  class: M,
                  ...H
                }
              } = B;
              const K = lt(u("input", be({
                ref: g,
                value: l.value,
                onInput: C,
                autofocus: e.autofocus,
                readonly: oe.value,
                disabled: G.value,
                name: e.name,
                placeholder: e.placeholder,
                size: 1,
                type: e.type,
                onFocus: w,
                onBlur: r
              }, H, T), null), [[Nn("intersect"), {
                handler: m
              }, null, {
                once: !0
              }]]);
              return u(Ee, null, [e.prefix && u("span", {
                class: "v-text-field__prefix"
              }, [u("span", {
                class: "v-text-field__prefix__text"
              }, [e.prefix])]), i.default ? u("div", {
                class: M,
                "data-no-activator": ""
              }, [i.default(), K]) : mn(K, {
                class: M
              }), e.suffix && u("span", {
                class: "v-text-field__suffix"
              }, [u("span", {
                class: "v-text-field__suffix__text"
              }, [e.suffix])])]);
            }
          });
        },
        details: I ? (D) => {
          var R;
          return u(Ee, null, [(R = i.details) == null ? void 0 : R.call(i, D), x && u(Ee, null, [u("span", null, null), u(jm, {
            active: e.persistentCounter || a.value,
            value: d.value,
            max: c.value,
            disabled: e.disabled
          }, i.counter)])]);
        } : void 0
      });
    }), fo({}, h, v, g);
  }
}), k0 = {
  name: "BookComments",
  computed: {},
  mounted: function() {
  },
  methods: {},
  props: ["login", "comments"],
  data: () => ({
    content: ""
  })
};
function S0(e, t, n, o, i, l) {
  return Q(), me(bt, null, {
    default: _(() => [
      u(Bt, null, {
        default: _(() => [
          u(Be, {
            offset: "2",
            cols: "8",
            class: "text-center"
          }, {
            default: _(() => t[4] || (t[4] = [
              ue("h4", { class: "mt-3" }, "评论列表", -1)
            ])),
            _: 1
          }),
          u(Be, { cols: "2" }, {
            default: _(() => [
              u(ce, {
                variant: "plain",
                icon: "mdi-close",
                onClick: t[0] || (t[0] = (a) => e.$emit("close")),
                title: "关闭评论面板"
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      u(Zt),
      n.comments.length == 0 ? (Q(), me(dn, {
        key: 0,
        density: "compact"
      }, {
        default: _(() => [
          u(He, { class: "my-4" }, {
            default: _(() => [
              u(tl, { class: "text-center" }, {
                default: _(() => t[5] || (t[5] = [
                  q("尚未有人发表评论")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : (Q(), me(dn, {
        key: 1,
        id: "book-comments",
        density: "compact"
      }, {
        default: _(() => [
          (Q(!0), Re(Ee, null, jt(n.comments, (a) => (Q(), me(He, {
            class: "pr-0 align-self-start mb-4",
            "prepend-avatar": a.avatar,
            "append-icon": "mdi-thumb-up",
            subtitle: a.nickName
          }, {
            prepend: _(() => [
              u(Ht, {
                variant: "outlined",
                size: "large",
                color: "grey",
                class: "text-center",
                icon: a.avatar
              }, null, 8, ["icon"])
            ]),
            append: _(() => [
              u(ce, {
                class: "px-0",
                size: "small",
                variant: "plain",
                stacked: "",
                "prepend-icon": "mdi-thumb-up",
                title: "点赞"
              }, {
                default: _(() => [
                  q(Oe(a.likeCount), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            default: _(() => [
              q(Oe(a.content) + " ", 1),
              u(_a, null, {
                default: _(() => [
                  q(Oe(a.level) + "楼 * " + Oe(a.createTime) + " * " + Oe(a.geo), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            _: 2
          }, 1032, ["prepend-avatar", "subtitle"]))), 256))
        ]),
        _: 1
      })),
      u(Jt, { class: "my-2 py-0 px-2" }, {
        default: _(() => [
          n.login ? (Q(), me(Bt, { key: 1 }, {
            default: _(() => [
              u(Be, { cols: "9" }, {
                default: _(() => [
                  u(Lt, {
                    modelValue: e.content,
                    "onUpdate:modelValue": t[2] || (t[2] = (a) => e.content = a),
                    density: "compact",
                    "single-line": "",
                    "hide-details": "",
                    placeholder: "爱书之人，维持良好的社区氛围"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              u(Be, { cols: "3" }, {
                default: _(() => [
                  u(ce, {
                    onClick: t[3] || (t[3] = (a) => e.$emit("add_review", this.content))
                  }, {
                    default: _(() => t[7] || (t[7] = [
                      q("发表")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (Q(), me(ce, {
            key: 0,
            onClick: t[1] || (t[1] = (a) => e.$emit("login")),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: _(() => t[6] || (t[6] = [
              q("点击登录，发表评论")
            ])),
            _: 1
          }))
        ]),
        _: 1
      })
    ]),
    _: 1
  });
}
const Gm = /* @__PURE__ */ On(k0, [["render", S0]]);
function Wa(e, t) {
  return {
    x: e.x + t.x,
    y: e.y + t.y
  };
}
function C0(e, t) {
  return {
    x: e.x - t.x,
    y: e.y - t.y
  };
}
function Ec(e, t) {
  if (e.side === "top" || e.side === "bottom") {
    const {
      side: n,
      align: o
    } = e, i = o === "left" ? 0 : o === "center" ? t.width / 2 : o === "right" ? t.width : o, l = n === "top" ? 0 : n === "bottom" ? t.height : n;
    return Wa({
      x: i,
      y: l
    }, t);
  } else if (e.side === "left" || e.side === "right") {
    const {
      side: n,
      align: o
    } = e, i = n === "left" ? 0 : n === "right" ? t.width : n, l = o === "top" ? 0 : o === "center" ? t.height / 2 : o === "bottom" ? t.height : o;
    return Wa({
      x: i,
      y: l
    }, t);
  }
  return Wa({
    x: t.width / 2,
    y: t.height / 2
  }, t);
}
const Ym = {
  static: V0,
  // specific viewport position, usually centered
  connected: T0
  // connected to a certain element
}, E0 = W({
  locationStrategy: {
    type: [String, Function],
    default: "static",
    validator: (e) => typeof e == "function" || e in Ym
  },
  location: {
    type: String,
    default: "bottom"
  },
  origin: {
    type: String,
    default: "auto"
  },
  offset: [Number, String, Array]
}, "VOverlay-location-strategies");
function x0(e, t) {
  const n = ie({}), o = ie();
  je && Wn(() => !!(t.isActive.value && e.locationStrategy), (l) => {
    var a, s;
    ge(() => e.locationStrategy, l), At(() => {
      window.removeEventListener("resize", i), o.value = void 0;
    }), window.addEventListener("resize", i, {
      passive: !0
    }), typeof e.locationStrategy == "function" ? o.value = (a = e.locationStrategy(t, e, n)) == null ? void 0 : a.updateLocation : o.value = (s = Ym[e.locationStrategy](t, e, n)) == null ? void 0 : s.updateLocation;
  });
  function i(l) {
    var a;
    (a = o.value) == null || a.call(o, l);
  }
  return {
    contentStyles: n,
    updateLocation: o
  };
}
function V0() {
}
function N0(e, t) {
  const n = cr(e);
  return t ? n.x += parseFloat(e.style.right || 0) : n.x -= parseFloat(e.style.left || 0), n.y -= parseFloat(e.style.top || 0), n;
}
function T0(e, t, n) {
  (Array.isArray(e.target.value) || Tp(e.target.value)) && Object.assign(n.value, {
    position: "fixed",
    top: 0,
    [e.isRtl.value ? "right" : "left"]: 0
  });
  const {
    preferredAnchor: i,
    preferredOrigin: l
  } = ur(() => {
    const v = ys(t.location, e.isRtl.value), g = t.origin === "overlap" ? v : t.origin === "auto" ? Fa(v) : ys(t.origin, e.isRtl.value);
    return v.side === g.side && v.align === La(g).align ? {
      preferredAnchor: zu(v),
      preferredOrigin: zu(g)
    } : {
      preferredAnchor: v,
      preferredOrigin: g
    };
  }), [a, s, r, d] = ["minWidth", "minHeight", "maxWidth", "maxHeight"].map((v) => p(() => {
    const g = parseFloat(t[v]);
    return isNaN(g) ? 1 / 0 : g;
  })), c = p(() => {
    if (Array.isArray(t.offset))
      return t.offset;
    if (typeof t.offset == "string") {
      const v = t.offset.split(" ").map(parseFloat);
      return v.length < 2 && v.push(0), v;
    }
    return typeof t.offset == "number" ? [t.offset, 0] : [0, 0];
  });
  let f = !1;
  const m = new ResizeObserver(() => {
    f && h();
  });
  ge([e.target, e.contentEl], (v, g) => {
    let [y, w] = v, [E, A] = g;
    E && !Array.isArray(E) && m.unobserve(E), y && !Array.isArray(y) && m.observe(y), A && m.unobserve(A), w && m.observe(w);
  }, {
    immediate: !0
  }), At(() => {
    m.disconnect();
  });
  function h() {
    if (f = !1, requestAnimationFrame(() => f = !0), !e.target.value || !e.contentEl.value) return;
    const v = Vf(e.target.value), g = N0(e.contentEl.value, e.isRtl.value), y = Wl(e.contentEl.value), w = 12;
    y.length || (y.push(document.documentElement), e.contentEl.value.style.top && e.contentEl.value.style.left || (g.x -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-x") || 0), g.y -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-y") || 0)));
    const E = y.reduce((O, k) => {
      const D = k.getBoundingClientRect(), R = new Io({
        x: k === document.documentElement ? 0 : D.x,
        y: k === document.documentElement ? 0 : D.y,
        width: k.clientWidth,
        height: k.clientHeight
      });
      return O ? new Io({
        x: Math.max(O.left, R.left),
        y: Math.max(O.top, R.top),
        width: Math.min(O.right, R.right) - Math.max(O.left, R.left),
        height: Math.min(O.bottom, R.bottom) - Math.max(O.top, R.top)
      }) : R;
    }, void 0);
    E.x += w, E.y += w, E.width -= w * 2, E.height -= w * 2;
    let A = {
      anchor: i.value,
      origin: l.value
    };
    function P(O) {
      const k = new Io(g), D = Ec(O.anchor, v), R = Ec(O.origin, k);
      let {
        x: G,
        y: re
      } = C0(D, R);
      switch (O.anchor.side) {
        case "top":
          re -= c.value[0];
          break;
        case "bottom":
          re += c.value[0];
          break;
        case "left":
          G -= c.value[0];
          break;
        case "right":
          G += c.value[0];
          break;
      }
      switch (O.anchor.align) {
        case "top":
          re -= c.value[1];
          break;
        case "bottom":
          re += c.value[1];
          break;
        case "left":
          G -= c.value[1];
          break;
        case "right":
          G += c.value[1];
          break;
      }
      return k.x += G, k.y += re, k.width = Math.min(k.width, r.value), k.height = Math.min(k.height, d.value), {
        overflows: Wu(k, E),
        x: G,
        y: re
      };
    }
    let C = 0, x = 0;
    const I = {
      x: 0,
      y: 0
    }, N = {
      x: !1,
      y: !1
    };
    let T = -1;
    for (; ; ) {
      if (T++ > 10) {
        zl("Infinite loop detected in connectedLocationStrategy");
        break;
      }
      const {
        x: O,
        y: k,
        overflows: D
      } = P(A);
      C += O, x += k, g.x += O, g.y += k;
      {
        const R = Uu(A.anchor), G = D.x.before || D.x.after, re = D.y.before || D.y.after;
        let oe = !1;
        if (["x", "y"].forEach((ee) => {
          if (ee === "x" && G && !N.x || ee === "y" && re && !N.y) {
            const B = {
              anchor: {
                ...A.anchor
              },
              origin: {
                ...A.origin
              }
            }, M = ee === "x" ? R === "y" ? La : Fa : R === "y" ? Fa : La;
            B.anchor = M(B.anchor), B.origin = M(B.origin);
            const {
              overflows: H
            } = P(B);
            (H[ee].before <= D[ee].before && H[ee].after <= D[ee].after || H[ee].before + H[ee].after < (D[ee].before + D[ee].after) / 2) && (A = B, oe = N[ee] = !0);
          }
        }), oe) continue;
      }
      D.x.before && (C += D.x.before, g.x += D.x.before), D.x.after && (C -= D.x.after, g.x -= D.x.after), D.y.before && (x += D.y.before, g.y += D.y.before), D.y.after && (x -= D.y.after, g.y -= D.y.after);
      {
        const R = Wu(g, E);
        I.x = E.width - R.x.before - R.x.after, I.y = E.height - R.y.before - R.y.after, C += R.x.before, g.x += R.x.before, x += R.y.before, g.y += R.y.before;
      }
      break;
    }
    const $ = Uu(A.anchor);
    return Object.assign(n.value, {
      "--v-overlay-anchor-origin": `${A.anchor.side} ${A.anchor.align}`,
      transformOrigin: `${A.origin.side} ${A.origin.align}`,
      // transform: `translate(${pixelRound(x)}px, ${pixelRound(y)}px)`,
      top: pe(qa(x)),
      left: e.isRtl.value ? void 0 : pe(qa(C)),
      right: e.isRtl.value ? pe(qa(-C)) : void 0,
      minWidth: pe($ === "y" ? Math.min(a.value, v.width) : a.value),
      maxWidth: pe(xc(zt(I.x, a.value === 1 / 0 ? 0 : a.value, r.value))),
      maxHeight: pe(xc(zt(I.y, s.value === 1 / 0 ? 0 : s.value, d.value)))
    }), {
      available: I,
      contentBox: g
    };
  }
  return ge(() => [i.value, l.value, t.offset, t.minWidth, t.minHeight, t.maxWidth, t.maxHeight], () => h()), ot(() => {
    const v = h();
    if (!v) return;
    const {
      available: g,
      contentBox: y
    } = v;
    y.height > g.y && requestAnimationFrame(() => {
      h(), requestAnimationFrame(() => {
        h();
      });
    });
  }), {
    updateLocation: h
  };
}
function qa(e) {
  return Math.round(e * devicePixelRatio) / devicePixelRatio;
}
function xc(e) {
  return Math.ceil(e * devicePixelRatio) / devicePixelRatio;
}
let xs = !0;
const Xl = [];
function O0(e) {
  !xs || Xl.length ? (Xl.push(e), Vs()) : (xs = !1, e(), Vs());
}
let Vc = -1;
function Vs() {
  cancelAnimationFrame(Vc), Vc = requestAnimationFrame(() => {
    const e = Xl.shift();
    e && e(), Xl.length ? Vs() : xs = !0;
  });
}
const Cl = {
  none: null,
  close: P0,
  block: D0,
  reposition: $0
}, A0 = W({
  scrollStrategy: {
    type: [String, Function],
    default: "block",
    validator: (e) => typeof e == "function" || e in Cl
  }
}, "VOverlay-scroll-strategies");
function I0(e, t) {
  if (!je) return;
  let n;
  Ut(async () => {
    n == null || n.stop(), t.isActive.value && e.scrollStrategy && (n = Bs(), await new Promise((o) => setTimeout(o)), n.active && n.run(() => {
      var o;
      typeof e.scrollStrategy == "function" ? e.scrollStrategy(t, e, n) : (o = Cl[e.scrollStrategy]) == null || o.call(Cl, t, e, n);
    }));
  }), At(() => {
    n == null || n.stop();
  });
}
function P0(e) {
  function t(n) {
    e.isActive.value = !1;
  }
  Xm(e.targetEl.value ?? e.contentEl.value, t);
}
function D0(e, t) {
  var a;
  const n = (a = e.root.value) == null ? void 0 : a.offsetParent, o = [.../* @__PURE__ */ new Set([...Wl(e.targetEl.value, t.contained ? n : void 0), ...Wl(e.contentEl.value, t.contained ? n : void 0)])].filter((s) => !s.classList.contains("v-overlay-scroll-blocked")), i = window.innerWidth - document.documentElement.offsetWidth, l = ((s) => mr(s) && s)(n || document.documentElement);
  l && e.root.value.classList.add("v-overlay--scroll-blocked"), o.forEach((s, r) => {
    s.style.setProperty("--v-body-scroll-x", pe(-s.scrollLeft)), s.style.setProperty("--v-body-scroll-y", pe(-s.scrollTop)), s !== document.documentElement && s.style.setProperty("--v-scrollbar-offset", pe(i)), s.classList.add("v-overlay-scroll-blocked");
  }), At(() => {
    o.forEach((s, r) => {
      const d = parseFloat(s.style.getPropertyValue("--v-body-scroll-x")), c = parseFloat(s.style.getPropertyValue("--v-body-scroll-y")), f = s.style.scrollBehavior;
      s.style.scrollBehavior = "auto", s.style.removeProperty("--v-body-scroll-x"), s.style.removeProperty("--v-body-scroll-y"), s.style.removeProperty("--v-scrollbar-offset"), s.classList.remove("v-overlay-scroll-blocked"), s.scrollLeft = -d, s.scrollTop = -c, s.style.scrollBehavior = f;
    }), l && e.root.value.classList.remove("v-overlay--scroll-blocked");
  });
}
function $0(e, t, n) {
  let o = !1, i = -1, l = -1;
  function a(s) {
    O0(() => {
      var c, f;
      const r = performance.now();
      (f = (c = e.updateLocation).value) == null || f.call(c, s), o = (performance.now() - r) / (1e3 / 60) > 2;
    });
  }
  l = (typeof requestIdleCallback > "u" ? (s) => s() : requestIdleCallback)(() => {
    n.run(() => {
      Xm(e.targetEl.value ?? e.contentEl.value, (s) => {
        o ? (cancelAnimationFrame(i), i = requestAnimationFrame(() => {
          i = requestAnimationFrame(() => {
            a(s);
          });
        })) : a(s);
      });
    });
  }), At(() => {
    typeof cancelIdleCallback < "u" && cancelIdleCallback(l), cancelAnimationFrame(i);
  });
}
function Xm(e, t) {
  const n = [document, ...Wl(e)];
  n.forEach((o) => {
    o.addEventListener("scroll", t, {
      passive: !0
    });
  }), At(() => {
    n.forEach((o) => {
      o.removeEventListener("scroll", t);
    });
  });
}
const Ns = Symbol.for("vuetify:v-menu"), M0 = W({
  closeDelay: [Number, String],
  openDelay: [Number, String]
}, "delay");
function B0(e, t) {
  let n = () => {
  };
  function o(a) {
    n == null || n();
    const s = Number(a ? e.openDelay : e.closeDelay);
    return new Promise((r) => {
      n = Yy(s, () => {
        t == null || t(a), r(a);
      });
    });
  }
  function i() {
    return o(!0);
  }
  function l() {
    return o(!1);
  }
  return {
    clearDelay: n,
    runOpenDelay: i,
    runCloseDelay: l
  };
}
const F0 = W({
  target: [String, Object],
  activator: [String, Object],
  activatorProps: {
    type: Object,
    default: () => ({})
  },
  openOnClick: {
    type: Boolean,
    default: void 0
  },
  openOnHover: Boolean,
  openOnFocus: {
    type: Boolean,
    default: void 0
  },
  closeOnContentClick: Boolean,
  ...M0()
}, "VOverlay-activator");
function L0(e, t) {
  let {
    isActive: n,
    isTop: o,
    contentEl: i
  } = t;
  const l = at("useActivator"), a = ie();
  let s = !1, r = !1, d = !0;
  const c = p(() => e.openOnFocus || e.openOnFocus == null && e.openOnHover), f = p(() => e.openOnClick || e.openOnClick == null && !e.openOnHover && !c.value), {
    runOpenDelay: m,
    runCloseDelay: h
  } = B0(e, (N) => {
    N === (e.openOnHover && s || c.value && r) && !(e.openOnHover && n.value && !o.value) && (n.value !== N && (d = !0), n.value = N);
  }), v = ie(), g = {
    onClick: (N) => {
      N.stopPropagation(), a.value = N.currentTarget || N.target, n.value || (v.value = [N.clientX, N.clientY]), n.value = !n.value;
    },
    onMouseenter: (N) => {
      var T;
      (T = N.sourceCapabilities) != null && T.firesTouchEvents || (s = !0, a.value = N.currentTarget || N.target, m());
    },
    onMouseleave: (N) => {
      s = !1, h();
    },
    onFocus: (N) => {
      jl(N.target, ":focus-visible") !== !1 && (r = !0, N.stopPropagation(), a.value = N.currentTarget || N.target, m());
    },
    onBlur: (N) => {
      r = !1, N.stopPropagation(), h();
    }
  }, y = p(() => {
    const N = {};
    return f.value && (N.onClick = g.onClick), e.openOnHover && (N.onMouseenter = g.onMouseenter, N.onMouseleave = g.onMouseleave), c.value && (N.onFocus = g.onFocus, N.onBlur = g.onBlur), N;
  }), w = p(() => {
    const N = {};
    if (e.openOnHover && (N.onMouseenter = () => {
      s = !0, m();
    }, N.onMouseleave = () => {
      s = !1, h();
    }), c.value && (N.onFocusin = () => {
      r = !0, m();
    }, N.onFocusout = () => {
      r = !1, h();
    }), e.closeOnContentClick) {
      const T = Ge(Ns, null);
      N.onClick = () => {
        n.value = !1, T == null || T.closeParents();
      };
    }
    return N;
  }), E = p(() => {
    const N = {};
    return e.openOnHover && (N.onMouseenter = () => {
      d && (s = !0, d = !1, m());
    }, N.onMouseleave = () => {
      s = !1, h();
    }), N;
  });
  ge(o, (N) => {
    var T;
    N && (e.openOnHover && !s && (!c.value || !r) || c.value && !r && (!e.openOnHover || !s)) && !((T = i.value) != null && T.contains(document.activeElement)) && (n.value = !1);
  }), ge(n, (N) => {
    N || setTimeout(() => {
      v.value = void 0;
    });
  }, {
    flush: "post"
  });
  const A = gs();
  Ut(() => {
    A.value && ot(() => {
      a.value = A.el;
    });
  });
  const P = gs(), C = p(() => e.target === "cursor" && v.value ? v.value : P.value ? P.el : Jm(e.target, l) || a.value), x = p(() => Array.isArray(C.value) ? void 0 : C.value);
  let I;
  return ge(() => !!e.activator, (N) => {
    N && je ? (I = Bs(), I.run(() => {
      R0(e, l, {
        activatorEl: a,
        activatorEvents: y
      });
    })) : I && I.stop();
  }, {
    flush: "post",
    immediate: !0
  }), At(() => {
    I == null || I.stop();
  }), {
    activatorEl: a,
    activatorRef: A,
    target: C,
    targetEl: x,
    targetRef: P,
    activatorEvents: y,
    contentEvents: w,
    scrimEvents: E
  };
}
function R0(e, t, n) {
  let {
    activatorEl: o,
    activatorEvents: i
  } = n;
  ge(() => e.activator, (r, d) => {
    if (d && r !== d) {
      const c = s(d);
      c && a(c);
    }
    r && ot(() => l());
  }, {
    immediate: !0
  }), ge(() => e.activatorProps, () => {
    l();
  }), At(() => {
    a();
  });
  function l() {
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : s(), d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    r && Zy(r, be(i.value, d));
  }
  function a() {
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : s(), d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    r && Qy(r, be(i.value, d));
  }
  function s() {
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : e.activator;
    const d = Jm(r, t);
    return o.value = (d == null ? void 0 : d.nodeType) === Node.ELEMENT_NODE ? d : void 0, o.value;
  }
}
function Jm(e, t) {
  var o, i;
  if (!e) return;
  let n;
  if (e === "parent") {
    let l = (i = (o = t == null ? void 0 : t.proxy) == null ? void 0 : o.$el) == null ? void 0 : i.parentNode;
    for (; l != null && l.hasAttribute("data-no-activator"); )
      l = l.parentNode;
    n = l;
  } else typeof e == "string" ? n = document.querySelector(e) : "$el" in e ? n = e.$el : n = e;
  return n;
}
function H0() {
  if (!je) return he(!1);
  const {
    ssr: e
  } = vr();
  if (e) {
    const t = he(!1);
    return vn(() => {
      t.value = !0;
    }), t;
  } else
    return he(!0);
}
const Zm = W({
  eager: Boolean
}, "lazy");
function Qm(e, t) {
  const n = he(!1), o = p(() => n.value || e.eager || t.value);
  ge(t, () => n.value = !0);
  function i() {
    e.eager || (n.value = !1);
  }
  return {
    isBooted: n,
    hasContent: o,
    onAfterLeave: i
  };
}
function nl() {
  const t = at("useScopeId").vnode.scopeId;
  return {
    scopeId: t ? {
      [t]: ""
    } : void 0
  };
}
const Nc = Symbol.for("vuetify:stack"), gi = gt([]);
function j0(e, t, n) {
  const o = at("useStack"), i = !n, l = Ge(Nc, void 0), a = gt({
    activeChildren: /* @__PURE__ */ new Set()
  });
  ht(Nc, a);
  const s = he(+t.value);
  Wn(e, () => {
    var f;
    const c = (f = gi.at(-1)) == null ? void 0 : f[1];
    s.value = c ? c + 10 : +t.value, i && gi.push([o.uid, s.value]), l == null || l.activeChildren.add(o.uid), At(() => {
      if (i) {
        const m = ve(gi).findIndex((h) => h[0] === o.uid);
        gi.splice(m, 1);
      }
      l == null || l.activeChildren.delete(o.uid);
    });
  });
  const r = he(!0);
  i && Ut(() => {
    var f;
    const c = ((f = gi.at(-1)) == null ? void 0 : f[0]) === o.uid;
    setTimeout(() => r.value = c);
  });
  const d = p(() => !a.activeChildren.size);
  return {
    globalTop: Wi(r),
    localTop: d,
    stackStyles: p(() => ({
      zIndex: s.value
    }))
  };
}
function z0(e) {
  return {
    teleportTarget: p(() => {
      const n = e();
      if (n === !0 || !je) return;
      const o = n === !1 ? document.body : typeof n == "string" ? document.querySelector(n) : n;
      if (o == null) {
        Ot(`Unable to locate target ${n}`);
        return;
      }
      let i = [...o.children].find((l) => l.matches(".v-overlay-container"));
      return i || (i = document.createElement("div"), i.className = "v-overlay-container", o.appendChild(i)), i;
    })
  };
}
function U0() {
  return !0;
}
function ev(e, t, n) {
  if (!e || tv(e, n) === !1) return !1;
  const o = Df(t);
  if (typeof ShadowRoot < "u" && o instanceof ShadowRoot && o.host === e.target) return !1;
  const i = (typeof n.value == "object" && n.value.include || (() => []))();
  return i.push(t), !i.some((l) => l == null ? void 0 : l.contains(e.target));
}
function tv(e, t) {
  return (typeof t.value == "object" && t.value.closeConditional || U0)(e);
}
function W0(e, t, n) {
  const o = typeof n.value == "function" ? n.value : n.value.handler;
  e.shadowTarget = e.target, t._clickOutside.lastMousedownWasOutside && ev(e, t, n) && setTimeout(() => {
    tv(e, n) && o && o(e);
  }, 0);
}
function Tc(e, t) {
  const n = Df(e);
  t(document), typeof ShadowRoot < "u" && n instanceof ShadowRoot && t(n);
}
const q0 = {
  // [data-app] may not be found
  // if using bind, inserted makes
  // sure that the root element is
  // available, iOS does not support
  // clicks on body
  mounted(e, t) {
    const n = (i) => W0(i, e, t), o = (i) => {
      e._clickOutside.lastMousedownWasOutside = ev(i, e, t);
    };
    Tc(e, (i) => {
      i.addEventListener("click", n, !0), i.addEventListener("mousedown", o, !0);
    }), e._clickOutside || (e._clickOutside = {
      lastMousedownWasOutside: !1
    }), e._clickOutside[t.instance.$.uid] = {
      onClick: n,
      onMousedown: o
    };
  },
  beforeUnmount(e, t) {
    e._clickOutside && (Tc(e, (n) => {
      var l;
      if (!n || !((l = e._clickOutside) != null && l[t.instance.$.uid])) return;
      const {
        onClick: o,
        onMousedown: i
      } = e._clickOutside[t.instance.$.uid];
      n.removeEventListener("click", o, !0), n.removeEventListener("mousedown", i, !0);
    }), delete e._clickOutside[t.instance.$.uid]);
  }
};
function K0(e) {
  const {
    modelValue: t,
    color: n,
    ...o
  } = e;
  return u(Bo, {
    name: "fade-transition",
    appear: !0
  }, {
    default: () => [e.modelValue && u("div", be({
      class: ["v-overlay__scrim", e.color.backgroundColorClasses.value],
      style: e.color.backgroundColorStyles.value
    }, o), null)]
  });
}
const Sa = W({
  absolute: Boolean,
  attach: [Boolean, String, Object],
  closeOnBack: {
    type: Boolean,
    default: !0
  },
  contained: Boolean,
  contentClass: null,
  contentProps: null,
  disabled: Boolean,
  opacity: [Number, String],
  noClickAnimation: Boolean,
  modelValue: Boolean,
  persistent: Boolean,
  scrim: {
    type: [Boolean, String],
    default: !0
  },
  zIndex: {
    type: [Number, String],
    default: 2e3
  },
  ...F0(),
  ...Ae(),
  ...Dn(),
  ...Zm(),
  ...E0(),
  ...A0(),
  ...nt(),
  ...di()
}, "VOverlay"), Fo = de()({
  name: "VOverlay",
  directives: {
    ClickOutside: q0
  },
  inheritAttrs: !1,
  props: {
    _disableGlobalStack: Boolean,
    ...Sa()
  },
  emits: {
    "click:outside": (e) => !0,
    "update:modelValue": (e) => !0,
    afterEnter: () => !0,
    afterLeave: () => !0
  },
  setup(e, t) {
    let {
      slots: n,
      attrs: o,
      emit: i
    } = t;
    const l = at("VOverlay"), a = ie(), s = ie(), r = ie(), d = Ye(e, "modelValue"), c = p({
      get: () => d.value,
      set: (J) => {
        J && e.disabled || (d.value = J);
      }
    }), {
      themeClasses: f
    } = ct(e), {
      rtlClasses: m,
      isRtl: h
    } = $t(), {
      hasContent: v,
      onAfterLeave: g
    } = Qm(e, c), y = Dt(p(() => typeof e.scrim == "string" ? e.scrim : null)), {
      globalTop: w,
      localTop: E,
      stackStyles: A
    } = j0(c, se(e, "zIndex"), e._disableGlobalStack), {
      activatorEl: P,
      activatorRef: C,
      target: x,
      targetEl: I,
      targetRef: N,
      activatorEvents: T,
      contentEvents: $,
      scrimEvents: O
    } = L0(e, {
      isActive: c,
      isTop: E,
      contentEl: r
    }), {
      teleportTarget: k
    } = z0(() => {
      var Pe, Xe, Me;
      const J = e.attach || e.contained;
      if (J) return J;
      const ke = ((Pe = P == null ? void 0 : P.value) == null ? void 0 : Pe.getRootNode()) || ((Me = (Xe = l.proxy) == null ? void 0 : Xe.$el) == null ? void 0 : Me.getRootNode());
      return ke instanceof ShadowRoot ? ke : !1;
    }), {
      dimensionStyles: D
    } = $n(e), R = H0(), {
      scopeId: G
    } = nl();
    ge(() => e.disabled, (J) => {
      J && (c.value = !1);
    });
    const {
      contentStyles: re,
      updateLocation: oe
    } = x0(e, {
      isRtl: h,
      contentEl: r,
      target: x,
      isActive: c
    });
    I0(e, {
      root: a,
      contentEl: r,
      targetEl: I,
      isActive: c,
      updateLocation: oe
    });
    function ee(J) {
      i("click:outside", J), e.persistent ? Ne() : c.value = !1;
    }
    function B(J) {
      return c.value && w.value && // If using scrim, only close if clicking on it rather than anything opened on top
      (!e.scrim || J.target === s.value || J instanceof MouseEvent && J.shadowTarget === s.value);
    }
    je && ge(c, (J) => {
      J ? window.addEventListener("keydown", M) : window.removeEventListener("keydown", M);
    }, {
      immediate: !0
    }), pt(() => {
      je && window.removeEventListener("keydown", M);
    });
    function M(J) {
      var ke, Pe;
      J.key === "Escape" && w.value && (e.persistent ? Ne() : (c.value = !1, (ke = r.value) != null && ke.contains(document.activeElement) && ((Pe = P.value) == null || Pe.focus())));
    }
    const H = i_();
    Wn(() => e.closeOnBack, () => {
      l_(H, (J) => {
        w.value && c.value ? (J(!1), e.persistent ? Ne() : c.value = !1) : J();
      });
    });
    const K = ie();
    ge(() => c.value && (e.absolute || e.contained) && k.value == null, (J) => {
      if (J) {
        const ke = $f(a.value);
        ke && ke !== document.scrollingElement && (K.value = ke.scrollTop);
      }
    });
    function Ne() {
      e.noClickAnimation || r.value && Co(r.value, [{
        transformOrigin: "center"
      }, {
        transform: "scale(1.03)"
      }, {
        transformOrigin: "center"
      }], {
        duration: 150,
        easing: $i
      });
    }
    function we() {
      i("afterEnter");
    }
    function Ie() {
      g(), i("afterLeave");
    }
    return Se(() => {
      var J;
      return u(Ee, null, [(J = n.activator) == null ? void 0 : J.call(n, {
        isActive: c.value,
        targetRef: N,
        props: be({
          ref: C
        }, T.value, e.activatorProps)
      }), R.value && v.value && u(jh, {
        disabled: !k.value,
        to: k.value
      }, {
        default: () => [u("div", be({
          class: ["v-overlay", {
            "v-overlay--absolute": e.absolute || e.contained,
            "v-overlay--active": c.value,
            "v-overlay--contained": e.contained
          }, f.value, m.value, e.class],
          style: [A.value, {
            "--v-overlay-opacity": e.opacity,
            top: pe(K.value)
          }, e.style],
          ref: a
        }, G, o), [u(K0, be({
          color: y,
          modelValue: c.value && !!e.scrim,
          ref: s
        }, O.value), null), u(Cn, {
          appear: !0,
          persisted: !0,
          transition: e.transition,
          target: x.value,
          onAfterEnter: we,
          onAfterLeave: Ie
        }, {
          default: () => {
            var ke;
            return [lt(u("div", be({
              ref: r,
              class: ["v-overlay__content", e.contentClass],
              style: [D.value, re.value]
            }, $.value, e.contentProps), [(ke = n.default) == null ? void 0 : ke.call(n, {
              isActive: c
            })]), [[hn, c.value], [Nn("click-outside"), {
              handler: ee,
              closeConditional: B,
              include: () => [P.value]
            }]])];
          }
        })])]
      })]);
    }), {
      activatorEl: P,
      scrimEl: s,
      target: x,
      animateClick: Ne,
      contentEl: r,
      globalTop: w,
      localTop: E,
      updateLocation: oe
    };
  }
}), nv = W({
  fullscreen: Boolean,
  retainFocus: {
    type: Boolean,
    default: !0
  },
  scrollable: Boolean,
  ...Sa({
    origin: "center center",
    scrollStrategy: "block",
    transition: {
      component: Er
    },
    zIndex: 2400
  })
}, "VDialog"), En = de()({
  name: "VDialog",
  props: nv(),
  emits: {
    "update:modelValue": (e) => !0,
    afterEnter: () => !0,
    afterLeave: () => !0
  },
  setup(e, t) {
    let {
      emit: n,
      slots: o
    } = t;
    const i = Ye(e, "modelValue"), {
      scopeId: l
    } = nl(), a = ie();
    function s(c) {
      var h, v;
      const f = c.relatedTarget, m = c.target;
      if (f !== m && ((h = a.value) != null && h.contentEl) && // We're the topmost dialog
      ((v = a.value) != null && v.globalTop) && // It isn't the document or the dialog body
      ![document, a.value.contentEl].includes(m) && // It isn't inside the dialog body
      !a.value.contentEl.contains(m)) {
        const g = Pi(a.value.contentEl);
        if (!g.length) return;
        const y = g[0], w = g[g.length - 1];
        f === y ? w.focus() : y.focus();
      }
    }
    pt(() => {
      document.removeEventListener("focusin", s);
    }), je && ge(() => i.value && e.retainFocus, (c) => {
      c ? document.addEventListener("focusin", s) : document.removeEventListener("focusin", s);
    }, {
      immediate: !0
    });
    function r() {
      var c;
      n("afterEnter"), (c = a.value) != null && c.contentEl && !a.value.contentEl.contains(document.activeElement) && a.value.contentEl.focus({
        preventScroll: !0
      });
    }
    function d() {
      n("afterLeave");
    }
    return ge(i, async (c) => {
      var f;
      c || (await ot(), (f = a.value.activatorEl) == null || f.focus({
        preventScroll: !0
      }));
    }), Se(() => {
      const c = Fo.filterProps(e), f = be({
        "aria-haspopup": "dialog"
      }, e.activatorProps), m = be({
        tabindex: -1
      }, e.contentProps);
      return u(Fo, be({
        ref: a,
        class: ["v-dialog", {
          "v-dialog--fullscreen": e.fullscreen,
          "v-dialog--scrollable": e.scrollable
        }, e.class],
        style: e.style
      }, c, {
        modelValue: i.value,
        "onUpdate:modelValue": (h) => i.value = h,
        "aria-modal": "true",
        activatorProps: f,
        contentProps: m,
        height: e.fullscreen ? void 0 : e.height,
        width: e.fullscreen ? void 0 : e.width,
        maxHeight: e.fullscreen ? void 0 : e.maxHeight,
        maxWidth: e.fullscreen ? void 0 : e.maxWidth,
        role: "dialog",
        onAfterEnter: r,
        onAfterLeave: d
      }, l), {
        activator: o.activator,
        default: function() {
          for (var h = arguments.length, v = new Array(h), g = 0; g < h; g++)
            v[g] = arguments[g];
          return u(tt, {
            root: "VDialog"
          }, {
            default: () => {
              var y;
              return [(y = o.default) == null ? void 0 : y.call(o, ...v)];
            }
          });
        }
      });
    }), fo({}, a);
  }
}), G0 = {
  name: "UserCenter",
  props: ["messages", "user"],
  data: () => ({
    editAvatar: !1,
    editNickname: !1,
    editPassword: !1,
    checkLogout: !1,
    alert: {
      msg: "",
      type: ""
    },
    newNickname: "",
    oldPassword: "",
    newPassword: "",
    examPassword: "",
    rules: {
      pass: (e) => 20 >= e.length && e.length >= 8 || "8 ~ 20 characters",
      nick: (e) => e.length >= 2 || "Min 2 characters",
      email: function(e) {
        var t = /^(([^<>()[\.,;:@"]+([^<>()[\.,;:@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return t.test(e) || "Invalid email format";
      }
    }
  }),
  watch: {
    // 监听修改昵称弹窗关闭事件，清空输入框内容
    editNickname(e) {
      e || (this.newNickname = "", this.alert.msg = "");
    },
    // 监听修改密码弹窗关闭事件，清空输入框内容
    editPassword(e) {
      e || (this.oldPassword = "", this.newPassword = "", this.examPassword = "", this.alert.msg = "");
    },
    // 监听退出登录弹窗关闭事件，清空错误信息
    checkLogout(e) {
      e || (this.alert.msg = "");
    }
  },
  methods: {
    thumb_or_content: function(e) {
      return Math.random() > 0.5 ? e.content : "赞了你的评论";
    },
    double_check_password: function(e) {
      return e.length < 8 ? "Min 8 characters" : e == this.newPassword || "Password are not same.";
    },
    alert_avatar: function() {
      alert("请前往 https://cavatar.cn 更改");
    },
    saveNickname: function() {
      this.alert.msg = "", this.update_user({
        nickname: this.newNickname
      }).then(() => {
        this.editNickname = !1;
      }).catch(() => {
        console.log("修改昵称失败");
      });
    },
    savePassword() {
      if (this.examPassword != this.newPassword) {
        this.alert.msg = "两次输入的密码不一致", this.alert.type = "error";
        return;
      }
      this.alert.msg = "", this.update_user({
        password0: this.oldPassword,
        password1: this.newPassword
      }).then(() => {
        this.editPassword = !1;
      }).catch(() => {
        console.log("修改密码失败");
      });
    },
    update_user: function(e) {
      return this.user.nickName = this.newNickname, this.$backend("/api/user/update", {
        method: "POST",
        body: JSON.stringify(e)
      }).then((t) => {
        if (t.err != "ok")
          throw this.alert.msg = t.msg, this.alert.type = "error", new Error(t.msg);
        this.$emit("update", t.data);
      });
    },
    do_logout: function() {
      return this.alert.msg = "", this.$backend("/api/user/sign_out").then((e) => {
        if (e.err != "ok")
          throw this.alert.msg = e.msg, this.alert.type = "error", new Error(e.msg);
        this.$emit("logout"), this.checkLogout = !1;
      }).catch(() => {
        console.log("退出登录失败");
      });
    }
  }
}, Y0 = { class: "px-4 py-2" }, X0 = { class: "px-4 py-2" }, J0 = { class: "my-2" };
function Z0(e, t, n, o, i, l) {
  return Q(), me(bt, null, {
    default: _(() => [
      u(ao, { class: "text-center" }, {
        default: _(() => t[14] || (t[14] = [
          q(" 消息 ")
        ])),
        _: 1
      }),
      ue("div", Y0, [
        u(bt, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "用户信息"
        }, {
          default: _(() => [
            u(dn, null, {
              default: _(() => [
                u(He, {
                  class: "text-right",
                  onClick: l.alert_avatar
                }, {
                  prepend: _(() => t[15] || (t[15] = [
                    ue("span", null, "头像", -1)
                  ])),
                  append: _(() => [
                    u(Ht, {
                      image: n.user.avatar
                    }, null, 8, ["image"])
                  ]),
                  _: 1
                }, 8, ["onClick"]),
                u(He, {
                  class: "text-right",
                  title: n.user.email
                }, {
                  prepend: _(() => t[16] || (t[16] = [
                    ue("span", null, "邮箱", -1)
                  ])),
                  _: 1
                }, 8, ["title"]),
                u(He, {
                  class: "text-right",
                  onClick: t[0] || (t[0] = (a) => e.editNickname = !0),
                  title: n.user.nickname
                }, {
                  prepend: _(() => t[17] || (t[17] = [
                    ue("span", null, "昵称", -1)
                  ])),
                  append: _(() => [
                    u(De, null, {
                      default: _(() => t[18] || (t[18] = [
                        q("mdi-chevron-right")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["title"]),
                u(He, {
                  class: "text-right",
                  onClick: t[1] || (t[1] = (a) => e.editPassword = !0),
                  title: "(点击更改)",
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: _(() => t[19] || (t[19] = [
                    ue("span", null, "密码", -1)
                  ])),
                  _: 1
                }),
                u(He, {
                  class: "text-right",
                  onClick: t[2] || (t[2] = (a) => e.checkLogout = !0),
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: _(() => t[20] || (t[20] = [
                    ue("span", null, "退出登录", -1)
                  ])),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      ue("div", X0, [
        u(bt, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "章评互动信息"
        }, {
          default: _(() => [
            n.messages.length === 0 ? (Q(), me(dn, {
              key: 0,
              density: "compact",
              class: "mr-4"
            }, {
              default: _(() => [
                u(He, { class: "my-4" }, {
                  default: _(() => [
                    u(tl, { class: "text-center" }, {
                      default: _(() => t[21] || (t[21] = [
                        q("无新的互动消息")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })) : We("", !0),
            u(dn, {
              id: "book-comments",
              density: "compact",
              class: "mr-4"
            }, {
              default: _(() => [
                (Q(!0), Re(Ee, null, jt(n.messages, (a) => (Q(), me(He, {
                  key: a.id,
                  class: "pr-0 align-self-start mb-4",
                  "prepend-avatar": a.avatar,
                  subtitle: a.nickName + " @《宿命之环》"
                }, {
                  default: _(() => [
                    ue("div", J0, Oe(l.thumb_or_content(a)), 1),
                    u(bt, {
                      variant: "tonal",
                      color: "surface-variant",
                      subtitle: "这一段写得真厉害哦"
                    })
                  ]),
                  _: 2
                }, 1032, ["prepend-avatar", "subtitle"]))), 128))
              ]),
              _: 1
            })
          ]),
          _: 1
        })
      ]),
      u(En, {
        modelValue: e.editAvatar,
        "onUpdate:modelValue": t[3] || (t[3] = (a) => e.editAvatar = a),
        persistent: ""
      }, {
        default: _(() => [
          u(Yo)
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(En, {
        modelValue: e.editNickname,
        "onUpdate:modelValue": t[6] || (t[6] = (a) => e.editNickname = a),
        persistent: ""
      }, {
        default: _(() => [
          u(bt, null, {
            default: _(() => [
              u(ao, { class: "text-center" }, {
                default: _(() => t[22] || (t[22] = [
                  q("修改昵称")
                ])),
                _: 1
              }),
              u(Jt, null, {
                default: _(() => [
                  u(Lt, {
                    modelValue: e.newNickname,
                    "onUpdate:modelValue": t[4] || (t[4] = (a) => e.newNickname = a),
                    label: "新昵称"
                  }, null, 8, ["modelValue"]),
                  e.alert.msg ? (Q(), me(Yo, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: _(() => [
                      q(Oe(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : We("", !0)
                ]),
                _: 1
              }),
              u(Po, null, {
                default: _(() => [
                  u(ce, {
                    text: "",
                    onClick: t[5] || (t[5] = (a) => e.editNickname = !1)
                  }, {
                    default: _(() => t[23] || (t[23] = [
                      q("取消")
                    ])),
                    _: 1
                  }),
                  u(ce, {
                    text: "",
                    onClick: l.saveNickname
                  }, {
                    default: _(() => t[24] || (t[24] = [
                      q("保存")
                    ])),
                    _: 1
                  }, 8, ["onClick"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(En, {
        modelValue: e.editPassword,
        "onUpdate:modelValue": t[11] || (t[11] = (a) => e.editPassword = a),
        persistent: "",
        "z-index": "2999"
      }, {
        default: _(() => [
          u(bt, null, {
            default: _(() => [
              u(ao, { class: "text-center" }, {
                default: _(() => t[25] || (t[25] = [
                  q("修改密码")
                ])),
                _: 1
              }),
              u(Jt, null, {
                default: _(() => [
                  u(Lt, {
                    modelValue: e.oldPassword,
                    "onUpdate:modelValue": t[7] || (t[7] = (a) => e.oldPassword = a),
                    label: "当前密码"
                  }, null, 8, ["modelValue"]),
                  u(Lt, {
                    modelValue: e.newPassword,
                    "onUpdate:modelValue": t[8] || (t[8] = (a) => e.newPassword = a),
                    label: "新密码",
                    rules: [e.rules.pass]
                  }, null, 8, ["modelValue", "rules"]),
                  u(Lt, {
                    modelValue: e.examPassword,
                    "onUpdate:modelValue": t[9] || (t[9] = (a) => e.examPassword = a),
                    label: "确认密码",
                    rules: [l.double_check_password]
                  }, null, 8, ["modelValue", "rules"]),
                  e.alert.msg ? (Q(), me(Yo, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: _(() => [
                      q(Oe(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : We("", !0)
                ]),
                _: 1
              }),
              u(Po, null, {
                default: _(() => [
                  u(ce, {
                    text: "",
                    onClick: t[10] || (t[10] = (a) => e.editPassword = !1)
                  }, {
                    default: _(() => t[26] || (t[26] = [
                      q("取消")
                    ])),
                    _: 1
                  }),
                  u(ce, {
                    text: "",
                    onClick: l.savePassword
                  }, {
                    default: _(() => t[27] || (t[27] = [
                      q("保存")
                    ])),
                    _: 1
                  }, 8, ["onClick"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(En, {
        modelValue: e.checkLogout,
        "onUpdate:modelValue": t[13] || (t[13] = (a) => e.checkLogout = a),
        persistent: ""
      }, {
        default: _(() => [
          u(bt, null, {
            default: _(() => [
              u(ao, { class: "text-center" }, {
                default: _(() => t[28] || (t[28] = [
                  q("请确认")
                ])),
                _: 1
              }),
              u(Jt, null, {
                default: _(() => [
                  t[29] || (t[29] = q(" 是否要退出登录？ ")),
                  e.alert.msg ? (Q(), me(Yo, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: _(() => [
                      q(Oe(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : We("", !0)
                ]),
                _: 1
              }),
              u(Po, null, {
                default: _(() => [
                  u(ce, {
                    text: "",
                    onClick: t[12] || (t[12] = (a) => e.checkLogout = !1)
                  }, {
                    default: _(() => t[30] || (t[30] = [
                      q("取消")
                    ])),
                    _: 1
                  }),
                  u(ce, {
                    text: "",
                    onClick: l.do_logout
                  }, {
                    default: _(() => t[31] || (t[31] = [
                      q("确认")
                    ])),
                    _: 1
                  }, 8, ["onClick"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue"])
    ]),
    _: 1
  });
}
const ov = /* @__PURE__ */ On(G0, [["render", Z0], ["__scopeId", "data-v-924d6d99"]]), Q0 = W({
  ...Ae(),
  ...y0()
}, "VForm"), Ka = de()({
  name: "VForm",
  props: Q0(),
  emits: {
    "update:modelValue": (e) => !0,
    submit: (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = p0(e), l = ie();
    function a(r) {
      r.preventDefault(), i.reset();
    }
    function s(r) {
      const d = r, c = i.validate();
      d.then = c.then.bind(c), d.catch = c.catch.bind(c), d.finally = c.finally.bind(c), o("submit", d), d.defaultPrevented || c.then((f) => {
        var h;
        let {
          valid: m
        } = f;
        m && ((h = l.value) == null || h.submit());
      }), d.preventDefault();
    }
    return Se(() => {
      var r;
      return u("form", {
        ref: l,
        class: ["v-form", e.class],
        style: e.style,
        novalidate: !0,
        onReset: a,
        onSubmit: s
      }, [(r = n.default) == null ? void 0 : r.call(n, i)]);
    }), fo(i, l);
  }
}), ew = {
  data: () => ({
    mode: "login",
    email: "",
    password: "",
    password2: "",
    nickname: "",
    failmsg: "",
    validmsg: "",
    rules: {
      nick: (e) => e.length >= 2 || "昵称需至少包含两个字符",
      email: function(e) {
        var t = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return t.test(e) || "无效的邮箱地址";
      }
    },
    alert: {
      type: "error",
      msg: ""
    }
  }),
  head: () => ({
    title: "登录"
  }),
  computed: {},
  methods: {
    do_login: function() {
      var e = new URLSearchParams();
      e.append("email", this.email), e.append("password", this.password), this.$backend("/api/user/sign_in", {
        method: "POST",
        body: e
      }).then((t) => {
        t.err != "ok" ? (this.alert.type = "error", this.alert.msg = t.msg) : this.$emit("login", t.data);
      });
    },
    do_reset: function() {
      var e = new URLSearchParams();
      e.append("email", this.email), this.$backend("/api/user/reset", {
        method: "POST",
        body: e
      }).then((t) => {
        t.err == "ok" ? (this.alert.type = "success", this.alert.msg = "重置成功！请查阅密码通知邮件。") : (this.alert.type = "error", this.alert.msg = t.msg);
      });
    },
    do_signup: function() {
      if (!this.$refs.form.validate())
        return !1;
      var e = new URLSearchParams();
      e.append("email", this.email), e.append("nickname", this.nickname), this.$backend("/api/user/sign_up", {
        method: "POST",
        body: e
      }).then((t) => {
        t.err != "ok" ? this.failmsg = t.msg : (this.alert.type = "success", this.alert.msg = "注册成功！请查阅密码通知邮件。", this.mode = "login");
      });
    }
  }
};
function tw(e, t, n, o, i, l) {
  return Q(), me(bt, { title: "登录到书评系统" }, {
    default: _(() => [
      u(Zt),
      u(vm, null, {
        default: _(() => [
          e.mode == "login" ? (Q(), me(Ka, {
            key: 0,
            onSubmit: _l(l.do_login, ["prevent"])
          }, {
            default: _(() => [
              u(Lt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[0] || (t[0] = (a) => e.email = a),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              u(Lt, {
                "prepend-icon": "mdi-lock",
                modelValue: e.password,
                "onUpdate:modelValue": t[1] || (t[1] = (a) => e.password = a),
                label: "密码",
                type: "password"
              }, null, 8, ["modelValue"]),
              u(ce, {
                type: "submit",
                color: "primary"
              }, {
                default: _(() => t[8] || (t[8] = [
                  q("登录")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "forget" ? (Q(), me(Ka, {
            key: 1,
            onSubmit: _l(l.do_reset, ["prevent"])
          }, {
            default: _(() => [
              u(Lt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[2] || (t[2] = (a) => e.email = a),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              u(ce, {
                type: "submit",
                color: "red"
              }, {
                default: _(() => t[9] || (t[9] = [
                  q("重置密码")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "signup" ? (Q(), me(Ka, {
            key: 2,
            ref: "form",
            onSubmit: _l(l.do_signup, ["prevent"])
          }, {
            default: _(() => [
              u(Lt, {
                required: "",
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[3] || (t[3] = (a) => e.email = a),
                label: "邮箱",
                type: "text",
                autocomplete: "new-email",
                rules: [e.rules.email]
              }, null, 8, ["modelValue", "rules"]),
              u(Lt, {
                required: "",
                "prepend-icon": "mdi-guy-fawkes-mask",
                modelValue: e.nickname,
                "onUpdate:modelValue": t[4] || (t[4] = (a) => e.nickname = a),
                label: "昵称",
                type: "text",
                autocomplete: "new-nickname",
                rules: [e.rules.nick]
              }, null, 8, ["modelValue", "rules"]),
              u(ce, {
                type: "submit",
                color: "green"
              }, {
                default: _(() => t[10] || (t[10] = [
                  q("注册")
                ])),
                _: 1
              }),
              t[11] || (t[11] = ue("p", { class: "text-small" }, " * 账号密码将随机生成，并发往邮箱", -1))
            ]),
            _: 1
          }, 8, ["onSubmit"])) : We("", !0)
        ]),
        _: 1
      }),
      e.alert.msg ? (Q(), me(Yo, {
        key: 0,
        type: e.alert.type
      }, {
        default: _(() => [
          q(Oe(e.alert.msg), 1)
        ]),
        _: 1
      }, 8, ["type"])) : We("", !0),
      u(Zt),
      u(Po, null, {
        default: _(() => [
          e.mode == "login" ? (Q(), me(ce, {
            key: 0,
            onClick: t[5] || (t[5] = (a) => e.mode = "forget"),
            text: "忘记密码?"
          })) : We("", !0),
          e.mode != "login" ? (Q(), me(ce, {
            key: 1,
            onClick: t[6] || (t[6] = (a) => e.mode = "login"),
            text: "登录账号"
          })) : We("", !0),
          u(Sl),
          u(ce, {
            onClick: t[7] || (t[7] = (a) => e.mode = "signup"),
            text: "快速注册"
          })
        ]),
        _: 1
      })
    ]),
    _: 1
  });
}
const iv = /* @__PURE__ */ On(ew, [["render", tw]]), Dr = Symbol.for("vuetify:v-tabs"), nw = W({
  fixed: Boolean,
  sliderColor: String,
  hideSlider: Boolean,
  direction: {
    type: String,
    default: "horizontal"
  },
  ...Xn(dm({
    selectedClass: "v-tab--selected",
    variant: "text"
  }), ["active", "block", "flat", "location", "position", "symbol"])
}, "VTab"), Ts = de()({
  name: "VTab",
  props: nw(),
  setup(e, t) {
    let {
      slots: n,
      attrs: o
    } = t;
    const {
      textColorClasses: i,
      textColorStyles: l
    } = qt(e, "sliderColor"), a = ie(), s = ie(), r = p(() => e.direction === "horizontal"), d = p(() => {
      var f, m;
      return ((m = (f = a.value) == null ? void 0 : f.group) == null ? void 0 : m.isSelected.value) ?? !1;
    });
    function c(f) {
      var h, v;
      let {
        value: m
      } = f;
      if (m) {
        const g = (v = (h = a.value) == null ? void 0 : h.$el.parentElement) == null ? void 0 : v.querySelector(".v-tab--selected .v-tab__slider"), y = s.value;
        if (!g || !y) return;
        const w = getComputedStyle(g).color, E = g.getBoundingClientRect(), A = y.getBoundingClientRect(), P = r.value ? "x" : "y", C = r.value ? "X" : "Y", x = r.value ? "right" : "bottom", I = r.value ? "width" : "height", N = E[P], T = A[P], $ = N > T ? E[x] - A[x] : E[P] - A[P], O = Math.sign($) > 0 ? r.value ? "right" : "bottom" : Math.sign($) < 0 ? r.value ? "left" : "top" : "center", D = (Math.abs($) + (Math.sign($) < 0 ? E[I] : A[I])) / Math.max(E[I], A[I]) || 0, R = E[I] / A[I] || 0, G = 1.5;
        Co(y, {
          backgroundColor: [w, "currentcolor"],
          transform: [`translate${C}(${$}px) scale${C}(${R})`, `translate${C}(${$ / G}px) scale${C}(${(D - 1) / G + 1})`, "none"],
          transformOrigin: Array(3).fill(O)
        }, {
          duration: 225,
          easing: $i
        });
      }
    }
    return Se(() => {
      const f = ce.filterProps(e);
      return u(ce, be({
        symbol: Dr,
        ref: a,
        class: ["v-tab", e.class],
        style: e.style,
        tabindex: d.value ? 0 : -1,
        role: "tab",
        "aria-selected": String(d.value),
        active: !1
      }, f, o, {
        block: e.fixed,
        maxWidth: e.fixed ? 300 : void 0,
        "onGroup:selected": c
      }), {
        ...n,
        default: () => {
          var m;
          return u(Ee, null, [((m = n.default) == null ? void 0 : m.call(n)) ?? e.text, !e.hideSlider && u("div", {
            ref: s,
            class: ["v-tab__slider", i.value],
            style: l.value
          }, null)]);
        }
      });
    }), fo({}, a);
  }
}), ow = (e) => {
  const {
    touchstartX: t,
    touchendX: n,
    touchstartY: o,
    touchendY: i
  } = e, l = 0.5, a = 16;
  e.offsetX = n - t, e.offsetY = i - o, Math.abs(e.offsetY) < l * Math.abs(e.offsetX) && (e.left && n < t - a && e.left(e), e.right && n > t + a && e.right(e)), Math.abs(e.offsetX) < l * Math.abs(e.offsetY) && (e.up && i < o - a && e.up(e), e.down && i > o + a && e.down(e));
};
function iw(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchstartX = n.clientX, t.touchstartY = n.clientY, (o = t.start) == null || o.call(t, {
    originalEvent: e,
    ...t
  });
}
function lw(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchendX = n.clientX, t.touchendY = n.clientY, (o = t.end) == null || o.call(t, {
    originalEvent: e,
    ...t
  }), ow(t);
}
function aw(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchmoveX = n.clientX, t.touchmoveY = n.clientY, (o = t.move) == null || o.call(t, {
    originalEvent: e,
    ...t
  });
}
function sw() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const t = {
    touchstartX: 0,
    touchstartY: 0,
    touchendX: 0,
    touchendY: 0,
    touchmoveX: 0,
    touchmoveY: 0,
    offsetX: 0,
    offsetY: 0,
    left: e.left,
    right: e.right,
    up: e.up,
    down: e.down,
    start: e.start,
    move: e.move,
    end: e.end
  };
  return {
    touchstart: (n) => iw(n, t),
    touchend: (n) => lw(n, t),
    touchmove: (n) => aw(n, t)
  };
}
function rw(e, t) {
  var s;
  const n = t.value, o = n != null && n.parent ? e.parentElement : e, i = (n == null ? void 0 : n.options) ?? {
    passive: !0
  }, l = (s = t.instance) == null ? void 0 : s.$.uid;
  if (!o || !l) return;
  const a = sw(t.value);
  o._touchHandlers = o._touchHandlers ?? /* @__PURE__ */ Object.create(null), o._touchHandlers[l] = a, pf(a).forEach((r) => {
    o.addEventListener(r, a[r], i);
  });
}
function uw(e, t) {
  var l, a;
  const n = (l = t.value) != null && l.parent ? e.parentElement : e, o = (a = t.instance) == null ? void 0 : a.$.uid;
  if (!(n != null && n._touchHandlers) || !o) return;
  const i = n._touchHandlers[o];
  pf(i).forEach((s) => {
    n.removeEventListener(s, i[s]);
  }), delete n._touchHandlers[o];
}
const lv = {
  mounted: rw,
  unmounted: uw
}, av = Symbol.for("vuetify:v-window"), sv = Symbol.for("vuetify:v-window-group"), rv = W({
  continuous: Boolean,
  nextIcon: {
    type: [Boolean, String, Function, Object],
    default: "$next"
  },
  prevIcon: {
    type: [Boolean, String, Function, Object],
    default: "$prev"
  },
  reverse: Boolean,
  showArrows: {
    type: [Boolean, String],
    validator: (e) => typeof e == "boolean" || e === "hover"
  },
  touch: {
    type: [Object, Boolean],
    default: void 0
  },
  direction: {
    type: String,
    default: "horizontal"
  },
  modelValue: null,
  disabled: Boolean,
  selectedClass: {
    type: String,
    default: "v-window-item--active"
  },
  // TODO: mandatory should probably not be exposed but do this for now
  mandatory: {
    type: [Boolean, String],
    default: "force"
  },
  ...Ae(),
  ...Ze(),
  ...nt()
}, "VWindow"), Oc = de()({
  name: "VWindow",
  directives: {
    Touch: lv
  },
  props: rv(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = ct(e), {
      isRtl: i
    } = $t(), {
      t: l
    } = ri(), a = Xi(e, sv), s = ie(), r = p(() => i.value ? !e.reverse : e.reverse), d = he(!1), c = p(() => {
      const P = e.direction === "vertical" ? "y" : "x", x = (r.value ? !d.value : d.value) ? "-reverse" : "";
      return `v-window-${P}${x}-transition`;
    }), f = he(0), m = ie(void 0), h = p(() => a.items.value.findIndex((P) => a.selected.value.includes(P.id)));
    ge(h, (P, C) => {
      const x = a.items.value.length, I = x - 1;
      x <= 2 ? d.value = P < C : P === I && C === 0 ? d.value = !0 : P === 0 && C === I ? d.value = !1 : d.value = P < C;
    }), ht(av, {
      transition: c,
      isReversed: d,
      transitionCount: f,
      transitionHeight: m,
      rootRef: s
    });
    const v = p(() => e.continuous || h.value !== 0), g = p(() => e.continuous || h.value !== a.items.value.length - 1);
    function y() {
      v.value && a.prev();
    }
    function w() {
      g.value && a.next();
    }
    const E = p(() => {
      const P = [], C = {
        icon: i.value ? e.nextIcon : e.prevIcon,
        class: `v-window__${r.value ? "right" : "left"}`,
        onClick: a.prev,
        "aria-label": l("$vuetify.carousel.prev")
      };
      P.push(v.value ? n.prev ? n.prev({
        props: C
      }) : u(ce, C, null) : u("div", null, null));
      const x = {
        icon: i.value ? e.prevIcon : e.nextIcon,
        class: `v-window__${r.value ? "left" : "right"}`,
        onClick: a.next,
        "aria-label": l("$vuetify.carousel.next")
      };
      return P.push(g.value ? n.next ? n.next({
        props: x
      }) : u(ce, x, null) : u("div", null, null)), P;
    }), A = p(() => e.touch === !1 ? e.touch : {
      ...{
        left: () => {
          r.value ? y() : w();
        },
        right: () => {
          r.value ? w() : y();
        },
        start: (C) => {
          let {
            originalEvent: x
          } = C;
          x.stopPropagation();
        }
      },
      ...e.touch === !0 ? {} : e.touch
    });
    return Se(() => lt(u(e.tag, {
      ref: s,
      class: ["v-window", {
        "v-window--show-arrows-on-hover": e.showArrows === "hover"
      }, o.value, e.class],
      style: e.style
    }, {
      default: () => {
        var P, C;
        return [u("div", {
          class: "v-window__container",
          style: {
            height: m.value
          }
        }, [(P = n.default) == null ? void 0 : P.call(n, {
          group: a
        }), e.showArrows !== !1 && u("div", {
          class: "v-window__controls"
        }, [E.value])]), (C = n.additional) == null ? void 0 : C.call(n, {
          group: a
        })];
      }
    }), [[Nn("touch"), A.value]])), {
      group: a
    };
  }
}), cw = W({
  ...Xn(rv(), ["continuous", "nextIcon", "prevIcon", "showArrows", "touch", "mandatory"])
}, "VTabsWindow"), dw = de()({
  name: "VTabsWindow",
  props: cw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ge(Dr, null), i = Ye(e, "modelValue"), l = p({
      get() {
        var a;
        return i.value != null || !o ? i.value : (a = o.items.value.find((s) => o.selected.value.includes(s.id))) == null ? void 0 : a.value;
      },
      set(a) {
        i.value = a;
      }
    });
    return Se(() => {
      const a = Oc.filterProps(e);
      return u(Oc, be({
        _as: "VTabsWindow"
      }, a, {
        modelValue: l.value,
        "onUpdate:modelValue": (s) => l.value = s,
        class: ["v-tabs-window", e.class],
        style: e.style,
        mandatory: !1,
        touch: !1
      }), n);
    }), {};
  }
}), uv = W({
  reverseTransition: {
    type: [Boolean, String],
    default: void 0
  },
  transition: {
    type: [Boolean, String],
    default: void 0
  },
  ...Ae(),
  ...yr(),
  ...Zm()
}, "VWindowItem"), Ac = de()({
  name: "VWindowItem",
  directives: {
    Touch: lv
  },
  props: uv(),
  emits: {
    "group:selected": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ge(av), i = pr(e, sv), {
      isBooted: l
    } = el();
    if (!o || !i) throw new Error("[Vuetify] VWindowItem must be used inside VWindow");
    const a = he(!1), s = p(() => l.value && (o.isReversed.value ? e.reverseTransition !== !1 : e.transition !== !1));
    function r() {
      !a.value || !o || (a.value = !1, o.transitionCount.value > 0 && (o.transitionCount.value -= 1, o.transitionCount.value === 0 && (o.transitionHeight.value = void 0)));
    }
    function d() {
      var v;
      a.value || !o || (a.value = !0, o.transitionCount.value === 0 && (o.transitionHeight.value = pe((v = o.rootRef.value) == null ? void 0 : v.clientHeight)), o.transitionCount.value += 1);
    }
    function c() {
      r();
    }
    function f(v) {
      a.value && ot(() => {
        !s.value || !a.value || !o || (o.transitionHeight.value = pe(v.clientHeight));
      });
    }
    const m = p(() => {
      const v = o.isReversed.value ? e.reverseTransition : e.transition;
      return s.value ? {
        name: typeof v != "string" ? o.transition.value : v,
        onBeforeEnter: d,
        onAfterEnter: r,
        onEnterCancelled: c,
        onBeforeLeave: d,
        onAfterLeave: r,
        onLeaveCancelled: c,
        onEnter: f
      } : !1;
    }), {
      hasContent: h
    } = Qm(e, i.isSelected);
    return Se(() => u(Cn, {
      transition: m.value,
      disabled: !l.value
    }, {
      default: () => {
        var v;
        return [lt(u("div", {
          class: ["v-window-item", i.selectedClass.value, e.class],
          style: e.style
        }, [h.value && ((v = n.default) == null ? void 0 : v.call(n))]), [[hn, i.isSelected.value]])];
      }
    })), {
      groupItem: i
    };
  }
}), fw = W({
  ...uv()
}, "VTabsWindowItem"), mw = de()({
  name: "VTabsWindowItem",
  props: fw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Se(() => {
      const o = Ac.filterProps(e);
      return u(Ac, be({
        _as: "VTabsWindowItem"
      }, o, {
        class: ["v-tabs-window-item", e.class],
        style: e.style
      }), n);
    }), {};
  }
});
function vw(e) {
  let {
    selectedElement: t,
    containerElement: n,
    isRtl: o,
    isHorizontal: i
  } = e;
  const l = Hi(i, n), a = cv(i, o, n), s = Hi(i, t), r = dv(i, t), d = s * 0.4;
  return a > r ? r - d : a + l < r + s ? r - l + s + d : a;
}
function hw(e) {
  let {
    selectedElement: t,
    containerElement: n,
    isHorizontal: o
  } = e;
  const i = Hi(o, n), l = dv(o, t), a = Hi(o, t);
  return l - i / 2 + a / 2;
}
function Ic(e, t) {
  const n = e ? "scrollWidth" : "scrollHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function gw(e, t) {
  const n = e ? "clientWidth" : "clientHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function cv(e, t, n) {
  if (!n)
    return 0;
  const {
    scrollLeft: o,
    offsetWidth: i,
    scrollWidth: l
  } = n;
  return e ? t ? l - i + o : o : n.scrollTop;
}
function Hi(e, t) {
  const n = e ? "offsetWidth" : "offsetHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function dv(e, t) {
  const n = e ? "offsetLeft" : "offsetTop";
  return (t == null ? void 0 : t[n]) || 0;
}
const yw = Symbol.for("vuetify:v-slide-group"), $r = W({
  centerActive: Boolean,
  direction: {
    type: String,
    default: "horizontal"
  },
  symbol: {
    type: null,
    default: yw
  },
  nextIcon: {
    type: ze,
    default: "$next"
  },
  prevIcon: {
    type: ze,
    default: "$prev"
  },
  showArrows: {
    type: [Boolean, String],
    validator: (e) => typeof e == "boolean" || ["always", "desktop", "mobile"].includes(e)
  },
  ...Ae(),
  ...Eb({
    mobile: null
  }),
  ...Ze(),
  ...ha({
    selectedClass: "v-slide-group-item--active"
  })
}, "VSlideGroup"), Jl = de()({
  name: "VSlideGroup",
  props: $r(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isRtl: o
    } = $t(), {
      displayClasses: i,
      mobile: l
    } = vr(e), a = Xi(e, e.symbol), s = he(!1), r = he(0), d = he(0), c = he(0), f = p(() => e.direction === "horizontal"), {
      resizeRef: m,
      contentRect: h
    } = ni(), {
      resizeRef: v,
      contentRect: g
    } = ni(), y = Nb(), w = p(() => ({
      container: m.el,
      duration: 200,
      easing: "easeOutQuart"
    })), E = p(() => a.selected.value.length ? a.items.value.findIndex((M) => M.id === a.selected.value[0]) : -1), A = p(() => a.selected.value.length ? a.items.value.findIndex((M) => M.id === a.selected.value[a.selected.value.length - 1]) : -1);
    if (je) {
      let M = -1;
      ge(() => [a.selected.value, h.value, g.value, f.value], () => {
        cancelAnimationFrame(M), M = requestAnimationFrame(() => {
          if (h.value && g.value) {
            const H = f.value ? "width" : "height";
            d.value = h.value[H], c.value = g.value[H], s.value = d.value + 1 < c.value;
          }
          if (E.value >= 0 && v.el) {
            const H = v.el.children[A.value];
            C(H, e.centerActive);
          }
        });
      });
    }
    const P = he(!1);
    function C(M, H) {
      let K = 0;
      H ? K = hw({
        containerElement: m.el,
        isHorizontal: f.value,
        selectedElement: M
      }) : K = vw({
        containerElement: m.el,
        isHorizontal: f.value,
        isRtl: o.value,
        selectedElement: M
      }), x(K);
    }
    function x(M) {
      if (!je || !m.el) return;
      const H = Hi(f.value, m.el), K = cv(f.value, o.value, m.el);
      if (!(Ic(f.value, m.el) <= H || // Prevent scrolling by only a couple of pixels, which doesn't look smooth
      Math.abs(M - K) < 16)) {
        if (f.value && o.value && m.el) {
          const {
            scrollWidth: we,
            offsetWidth: Ie
          } = m.el;
          M = we - Ie - M;
        }
        f.value ? y.horizontal(M, w.value) : y(M, w.value);
      }
    }
    function I(M) {
      const {
        scrollTop: H,
        scrollLeft: K
      } = M.target;
      r.value = f.value ? K : H;
    }
    function N(M) {
      if (P.value = !0, !(!s.value || !v.el)) {
        for (const H of M.composedPath())
          for (const K of v.el.children)
            if (K === H) {
              C(K);
              return;
            }
      }
    }
    function T(M) {
      P.value = !1;
    }
    let $ = !1;
    function O(M) {
      var H;
      !$ && !P.value && !(M.relatedTarget && ((H = v.el) != null && H.contains(M.relatedTarget))) && R(), $ = !1;
    }
    function k() {
      $ = !0;
    }
    function D(M) {
      if (!v.el) return;
      function H(K) {
        M.preventDefault(), R(K);
      }
      f.value ? M.key === "ArrowRight" ? H(o.value ? "prev" : "next") : M.key === "ArrowLeft" && H(o.value ? "next" : "prev") : M.key === "ArrowDown" ? H("next") : M.key === "ArrowUp" && H("prev"), M.key === "Home" ? H("first") : M.key === "End" && H("last");
    }
    function R(M) {
      var K, Ne;
      if (!v.el) return;
      let H;
      if (!M)
        H = Pi(v.el)[0];
      else if (M === "next") {
        if (H = (K = v.el.querySelector(":focus")) == null ? void 0 : K.nextElementSibling, !H) return R("first");
      } else if (M === "prev") {
        if (H = (Ne = v.el.querySelector(":focus")) == null ? void 0 : Ne.previousElementSibling, !H) return R("last");
      } else M === "first" ? H = v.el.firstElementChild : M === "last" && (H = v.el.lastElementChild);
      H && H.focus({
        preventScroll: !0
      });
    }
    function G(M) {
      const H = f.value && o.value ? -1 : 1, K = (M === "prev" ? -H : H) * d.value;
      let Ne = r.value + K;
      if (f.value && o.value && m.el) {
        const {
          scrollWidth: we,
          offsetWidth: Ie
        } = m.el;
        Ne += we - Ie;
      }
      x(Ne);
    }
    const re = p(() => ({
      next: a.next,
      prev: a.prev,
      select: a.select,
      isSelected: a.isSelected
    })), oe = p(() => {
      switch (e.showArrows) {
        case "always":
          return !0;
        case "desktop":
          return !l.value;
        case !0:
          return s.value || Math.abs(r.value) > 0;
        case "mobile":
          return l.value || s.value || Math.abs(r.value) > 0;
        default:
          return !l.value && (s.value || Math.abs(r.value) > 0);
      }
    }), ee = p(() => Math.abs(r.value) > 1), B = p(() => {
      if (!m.value) return !1;
      const M = Ic(f.value, m.el), H = gw(f.value, m.el);
      return M - H - Math.abs(r.value) > 1;
    });
    return Se(() => u(e.tag, {
      class: ["v-slide-group", {
        "v-slide-group--vertical": !f.value,
        "v-slide-group--has-affixes": oe.value,
        "v-slide-group--is-overflowing": s.value
      }, i.value, e.class],
      style: e.style,
      tabindex: P.value || a.selected.value.length ? -1 : 0,
      onFocus: O
    }, {
      default: () => {
        var M, H, K;
        return [oe.value && u("div", {
          key: "prev",
          class: ["v-slide-group__prev", {
            "v-slide-group__prev--disabled": !ee.value
          }],
          onMousedown: k,
          onClick: () => ee.value && G("prev")
        }, [((M = n.prev) == null ? void 0 : M.call(n, re.value)) ?? u(kc, null, {
          default: () => [u(De, {
            icon: o.value ? e.nextIcon : e.prevIcon
          }, null)]
        })]), u("div", {
          key: "container",
          ref: m,
          class: "v-slide-group__container",
          onScroll: I
        }, [u("div", {
          ref: v,
          class: "v-slide-group__content",
          onFocusin: N,
          onFocusout: T,
          onKeydown: D
        }, [(H = n.default) == null ? void 0 : H.call(n, re.value)])]), oe.value && u("div", {
          key: "next",
          class: ["v-slide-group__next", {
            "v-slide-group__next--disabled": !B.value
          }],
          onMousedown: k,
          onClick: () => B.value && G("next")
        }, [((K = n.next) == null ? void 0 : K.call(n, re.value)) ?? u(kc, null, {
          default: () => [u(De, {
            icon: o.value ? e.prevIcon : e.nextIcon
          }, null)]
        })])];
      }
    })), {
      selected: a.selected,
      scrollTo: G,
      scrollOffset: r,
      focus: R,
      hasPrev: ee,
      hasNext: B
    };
  }
});
function pw(e) {
  return e ? e.map((t) => yf(t) ? t : {
    text: t,
    value: t
  }) : [];
}
const bw = W({
  alignTabs: {
    type: String,
    default: "start"
  },
  color: String,
  fixedTabs: Boolean,
  items: {
    type: Array,
    default: () => []
  },
  stacked: Boolean,
  bgColor: String,
  grow: Boolean,
  height: {
    type: [Number, String],
    default: void 0
  },
  hideSlider: Boolean,
  sliderColor: String,
  ...$r({
    mandatory: "force",
    selectedClass: "v-tab-item--selected"
  }),
  ...Kt(),
  ...Ze()
}, "VTabs"), _w = de()({
  name: "VTabs",
  props: bw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = Ye(e, "modelValue"), l = p(() => pw(e.items)), {
      densityClasses: a
    } = tn(e), {
      backgroundColorClasses: s,
      backgroundColorStyles: r
    } = Dt(se(e, "bgColor")), {
      scopeId: d
    } = nl();
    return Jn({
      VTab: {
        color: se(e, "color"),
        direction: se(e, "direction"),
        stacked: se(e, "stacked"),
        fixed: se(e, "fixedTabs"),
        sliderColor: se(e, "sliderColor"),
        hideSlider: se(e, "hideSlider")
      }
    }), Se(() => {
      const c = Jl.filterProps(e), f = !!(o.window || e.items.length > 0);
      return u(Ee, null, [u(Jl, be(c, {
        modelValue: i.value,
        "onUpdate:modelValue": (m) => i.value = m,
        class: ["v-tabs", `v-tabs--${e.direction}`, `v-tabs--align-tabs-${e.alignTabs}`, {
          "v-tabs--fixed-tabs": e.fixedTabs,
          "v-tabs--grow": e.grow,
          "v-tabs--stacked": e.stacked
        }, a.value, s.value, e.class],
        style: [{
          "--v-tabs-height": pe(e.height)
        }, r.value, e.style],
        role: "tablist",
        symbol: Dr
      }, d, n), {
        default: () => {
          var m;
          return [((m = o.default) == null ? void 0 : m.call(o)) ?? l.value.map((h) => {
            var v;
            return ((v = o.tab) == null ? void 0 : v.call(o, {
              item: h
            })) ?? u(Ts, be(h, {
              key: h.text,
              value: h.value
            }), {
              default: o[`tab.${h.value}`] ? () => {
                var g;
                return (g = o[`tab.${h.value}`]) == null ? void 0 : g.call(o, {
                  item: h
                });
              } : void 0
            });
          })];
        }
      }), f && u(dw, be({
        modelValue: i.value,
        "onUpdate:modelValue": (m) => i.value = m,
        key: "tabs-window"
      }, d), {
        default: () => {
          var m;
          return [l.value.map((h) => {
            var v;
            return ((v = o.item) == null ? void 0 : v.call(o, {
              item: h
            })) ?? u(mw, {
              value: h.value
            }, {
              default: () => {
                var g;
                return (g = o[`item.${h.value}`]) == null ? void 0 : g.call(o, {
                  item: h
                });
              }
            });
          }), (m = o.window) == null ? void 0 : m.call(o)];
        }
      })]);
    }), {};
  }
}), ww = {
  name: "BookReview",
  props: ["login", "user", "comments", "sort"],
  data: () => ({
    content: ""
  }),
  methods: {
    submit: function() {
      const e = this.content.trim();
      e && (this.$emit("add", e), this.content = "");
    },
    // 无头像时按 user_id 稳定哈希，从调色板里取一个默认彩色头像
    avatar_color: function(e) {
      const t = ["#F2709C", "#FF9472", "#7B8FF7", "#42C2A8", "#FBC531", "#9B7EDE", "#4A9DEC", "#EE6C6C"], n = String(e || 0);
      let o = 0;
      for (let i = 0; i < n.length; i++)
        o = o * 31 + n.charCodeAt(i) >>> 0;
      return t[o % t.length];
    },
    avatar_text: function(e) {
      const t = (e || "").trim();
      return t ? t[0] : "书";
    }
  }
}, kw = { class: "text-white" }, Sw = { class: "br-list" }, Cw = ["onClick"], Ew = { class: "text-white text-caption" };
function xw(e, t, n, o, i, l) {
  return Q(), me(bt, { class: "book-review-card" }, {
    default: _(() => [
      u(Bt, {
        "no-gutters": "",
        class: "br-fixed align-center"
      }, {
        default: _(() => [
          u(Be, {
            offset: "2",
            cols: "8",
            class: "text-center"
          }, {
            default: _(() => t[5] || (t[5] = [
              ue("h4", { class: "mt-3" }, "本书评论", -1)
            ])),
            _: 1
          }),
          u(Be, {
            cols: "2",
            class: "text-right"
          }, {
            default: _(() => [
              u(ce, {
                variant: "plain",
                icon: "mdi-close",
                onClick: t[0] || (t[0] = (a) => e.$emit("close")),
                title: "关闭评论面板"
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      n.user ? (Q(), Re(Ee, { key: 0 }, [
        u(He, {
          class: "br-fixed",
          title: n.user.nickName || n.user.nickname,
          subtitle: n.user.email,
          onClick: t[1] || (t[1] = (a) => e.$emit("open-settings"))
        }, {
          prepend: _(() => [
            n.user.avatar ? (Q(), me(Ht, {
              key: 0,
              image: n.user.avatar
            }, null, 8, ["image"])) : (Q(), me(Ht, {
              key: 1,
              color: l.avatar_color(n.user.id)
            }, {
              default: _(() => [
                ue("span", kw, Oe(l.avatar_text(n.user.nickName || n.user.nickname)), 1)
              ]),
              _: 1
            }, 8, ["color"]))
          ]),
          append: _(() => [
            u(De, { title: "用户设置" }, {
              default: _(() => t[6] || (t[6] = [
                q("mdi-cog-outline")
              ])),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["title", "subtitle"]),
        u(Zt, { class: "br-fixed" })
      ], 64)) : We("", !0),
      u(_w, {
        class: "br-fixed",
        "model-value": n.sort,
        "onUpdate:modelValue": t[2] || (t[2] = (a) => e.$emit("update:sort", a)),
        density: "compact",
        grow: ""
      }, {
        default: _(() => [
          u(Ts, { value: "latest" }, {
            default: _(() => t[7] || (t[7] = [
              q("最新")
            ])),
            _: 1
          }),
          u(Ts, { value: "hot" }, {
            default: _(() => t[8] || (t[8] = [
              q("热门")
            ])),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["model-value"]),
      u(Zt, { class: "br-fixed" }),
      ue("div", Sw, [
        n.comments.length === 0 ? (Q(), me(dn, {
          key: 0,
          density: "compact"
        }, {
          default: _(() => [
            u(He, { class: "my-4" }, {
              default: _(() => [
                u(tl, { class: "text-center text-medium-emphasis" }, {
                  default: _(() => t[9] || (t[9] = [
                    q("尚未有人发表评论")
                  ])),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        })) : (Q(), me(dn, {
          key: 1,
          id: "book-review-list",
          density: "compact"
        }, {
          default: _(() => [
            (Q(!0), Re(Ee, null, jt(n.comments, (a) => (Q(), me(He, {
              key: a.reviewId,
              class: "pr-0 align-self-start mb-4",
              subtitle: a.nickName
            }, {
              prepend: _(() => [
                a.avatar ? (Q(), me(Ht, {
                  key: 0,
                  image: a.avatar,
                  size: "30"
                }, null, 8, ["image"])) : (Q(), me(Ht, {
                  key: 1,
                  size: "30",
                  color: l.avatar_color(a.userId)
                }, {
                  default: _(() => [
                    ue("span", Ew, Oe(l.avatar_text(a.nickName)), 1)
                  ]),
                  _: 2
                }, 1032, ["color"]))
              ]),
              append: _(() => [
                u(ce, {
                  class: "px-0",
                  size: "small",
                  variant: "plain",
                  stacked: "",
                  "prepend-icon": "mdi-thumb-up",
                  title: "点赞"
                }, {
                  default: _(() => [
                    q(Oe(a.likeCount), 1)
                  ]),
                  _: 2
                }, 1024)
              ]),
              default: _(() => [
                q(Oe(a.content) + " ", 1),
                a.referText ? (Q(), Re("div", {
                  key: 0,
                  class: rn(["br-refer text-caption text-medium-emphasis", { "br-refer--link": a.cfi }]),
                  onClick: _l((s) => a.cfi && e.$emit("jump", a.cfi), ["stop"])
                }, Oe(a.referText), 11, Cw)) : We("", !0),
                u(_a, null, {
                  default: _(() => [
                    q(Oe(a.level) + "楼 · " + Oe(a.createTime) + " · " + Oe(a.geo), 1)
                  ]),
                  _: 2
                }, 1024)
              ]),
              _: 2
            }, 1032, ["subtitle"]))), 128))
          ]),
          _: 1
        }))
      ]),
      u(Jt, { class: "br-fixed my-2 py-0 px-2" }, {
        default: _(() => [
          n.login ? (Q(), me(Bt, {
            key: 1,
            "no-gutters": "",
            class: "align-center"
          }, {
            default: _(() => [
              u(Be, { cols: "9" }, {
                default: _(() => [
                  u(Lt, {
                    modelValue: e.content,
                    "onUpdate:modelValue": t[4] || (t[4] = (a) => e.content = a),
                    density: "compact",
                    "single-line": "",
                    "hide-details": "",
                    placeholder: "爱书之人，维持良好的社区氛围"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              u(Be, {
                cols: "3",
                class: "text-right"
              }, {
                default: _(() => [
                  u(ce, { onClick: l.submit }, {
                    default: _(() => t[11] || (t[11] = [
                      q("发表")
                    ])),
                    _: 1
                  }, 8, ["onClick"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (Q(), me(ce, {
            key: 0,
            onClick: t[3] || (t[3] = (a) => e.$emit("login")),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: _(() => t[10] || (t[10] = [
              q("点击登录，发表评论")
            ])),
            _: 1
          }))
        ]),
        _: 1
      })
    ]),
    _: 1
  });
}
const fv = /* @__PURE__ */ On(ww, [["render", xw], ["__scopeId", "data-v-9af658bd"]]), Vw = {
  name: "BookToc",
  computed: {
    meta_items: function() {
      var e = [];
      for (var t in this.meta) {
        var n = this.meta[t];
        n == "" || n == null || e.push({ title: this.gettext(t), subtitle: n, lines: 3 });
      }
      return console.log(e), e;
    }
  },
  watch: {
    // 当目录项或当前章节变化时，滚动到当前章节
    toc_items: {
      handler() {
        this.$nextTick(() => {
          this.scrollToCurrentChapter();
        });
      },
      deep: !0
    },
    currentChapter: {
      handler() {
        this.$nextTick(() => {
          this.scrollToCurrentChapter();
        });
      }
    }
  },
  mounted: function() {
    this.$nextTick(() => {
      this.scrollToCurrentChapter();
    });
  },
  methods: {
    click_toc: function(e) {
      this.$emit("click:select", e);
    },
    has_data: function(e) {
      return console.log(e), e != "" && e != null && e != null;
    },
    gettext: function(e) {
      const t = {
        creator: "作者",
        description: "描述",
        direction: "方向",
        flow: "布局",
        identifier: "标识符",
        language: "语言",
        modified_date: "修订日期",
        orientation: "显示方向",
        pubdate: "出版日期",
        publisher: "出版社",
        rights: "版权",
        title: "书名"
      };
      return t[e] !== void 0 ? t[e] : e;
    },
    isCurrentChapter: function(e) {
      if (!this.currentChapter) return !1;
      const t = (i) => i ? i.split("#")[0] : "", n = t(this.currentChapter.href), o = t(e.href);
      return n === o;
    },
    scrollToCurrentChapter: function() {
      this.currentChapter && setTimeout(() => {
        const e = this.$el.querySelector(".current-chapter");
        e && e.scrollIntoView({
          behavior: "smooth",
          block: "start"
          // 滚动到顶部位置
        });
      }, 100);
    }
  },
  props: ["meta", "toc_items", "currentChapter"],
  data: () => ({})
};
function Nw(e, t, n, o, i, l) {
  return Q(), me(dn, {
    "onClick:select": l.click_toc,
    ref: "tocList"
  }, {
    default: _(() => [
      u(Yl, null, {
        activator: _(({ props: a }) => [
          u(He, be(a, { title: "书籍信息" }), null, 16)
        ]),
        default: _(() => [
          (Q(!0), Re(Ee, null, jt(l.meta_items, (a) => (Q(), me(He, {
            key: a.title,
            title: a.title,
            subtitle: a.subtitle,
            lines: "3"
          }, null, 8, ["title", "subtitle"]))), 128))
        ]),
        _: 1
      }),
      u(Zt),
      (Q(!0), Re(Ee, null, jt(n.toc_items, (a, s) => (Q(), Re(Ee, null, [
        a.subitems.length == 0 ? (Q(), me(He, {
          key: 0,
          "prepend-icon": "mdi-book-open-page-variant-outline",
          title: a.label,
          value: a.href,
          class: rn({ "current-chapter": l.isCurrentChapter(a) }),
          ref_for: !0,
          ref: "listItem"
        }, null, 8, ["title", "value", "class"])) : (Q(), me(Yl, {
          key: a.href
        }, {
          activator: _(({ props: r }) => [
            u(He, be({ ref_for: !0 }, r, {
              "prepend-icon": "mdi-book-open-page-variant-outline",
              title: a.label,
              value: a.href,
              class: { "current-chapter": l.isCurrentChapter(a) },
              ref_for: !0,
              ref: "listItem"
            }), null, 16, ["title", "value", "class"])
          ]),
          default: _(() => [
            (Q(!0), Re(Ee, null, jt(a.subitems, (r, d) => (Q(), me(He, {
              key: r.href,
              title: r.label,
              value: r.href,
              class: rn({ "current-chapter": l.isCurrentChapter(r) }),
              ref_for: !0,
              ref: "listItem"
            }, null, 8, ["title", "value", "class"]))), 128))
          ]),
          _: 2
        }, 1024))
      ], 64))), 256))
    ]),
    _: 1
  }, 8, ["onClick:select"]);
}
const mv = /* @__PURE__ */ On(Vw, [["render", Nw], ["__scopeId", "data-v-f081fe9b"]]), Mr = Symbol.for("vuetify:v-slider");
function Tw(e, t, n) {
  const o = n === "vertical", i = t.getBoundingClientRect(), l = "touches" in e ? e.touches[0] : e;
  return o ? l.clientY - (i.top + i.height / 2) : l.clientX - (i.left + i.width / 2);
}
function Ow(e, t) {
  return "touches" in e && e.touches.length ? e.touches[0][t] : "changedTouches" in e && e.changedTouches.length ? e.changedTouches[0][t] : e[t];
}
const Aw = W({
  disabled: {
    type: Boolean,
    default: null
  },
  error: Boolean,
  readonly: {
    type: Boolean,
    default: null
  },
  max: {
    type: [Number, String],
    default: 100
  },
  min: {
    type: [Number, String],
    default: 0
  },
  step: {
    type: [Number, String],
    default: 0
  },
  thumbColor: String,
  thumbLabel: {
    type: [Boolean, String],
    default: void 0,
    validator: (e) => typeof e == "boolean" || e === "always"
  },
  thumbSize: {
    type: [Number, String],
    default: 20
  },
  showTicks: {
    type: [Boolean, String],
    default: !1,
    validator: (e) => typeof e == "boolean" || e === "always"
  },
  ticks: {
    type: [Array, Object]
  },
  tickSize: {
    type: [Number, String],
    default: 2
  },
  color: String,
  trackColor: String,
  trackFillColor: String,
  trackSize: {
    type: [Number, String],
    default: 4
  },
  direction: {
    type: String,
    default: "horizontal",
    validator: (e) => ["vertical", "horizontal"].includes(e)
  },
  reverse: Boolean,
  ...St(),
  ...An({
    elevation: 2
  }),
  ripple: {
    type: Boolean,
    default: !0
  }
}, "Slider"), Iw = (e) => {
  const t = p(() => parseFloat(e.min)), n = p(() => parseFloat(e.max)), o = p(() => +e.step > 0 ? parseFloat(e.step) : 0), i = p(() => Math.max(Bu(o.value), Bu(t.value)));
  function l(a) {
    if (a = parseFloat(a), o.value <= 0) return a;
    const s = zt(a, t.value, n.value), r = t.value % o.value, d = Math.round((s - r) / o.value) * o.value + r;
    return parseFloat(Math.min(d, n.value).toFixed(i.value));
  }
  return {
    min: t,
    max: n,
    step: o,
    decimals: i,
    roundValue: l
  };
}, Pw = (e) => {
  let {
    props: t,
    steps: n,
    onSliderStart: o,
    onSliderMove: i,
    onSliderEnd: l,
    getActiveThumb: a
  } = e;
  const {
    isRtl: s
  } = $t(), r = se(t, "reverse"), d = p(() => t.direction === "vertical"), c = p(() => d.value !== r.value), {
    min: f,
    max: m,
    step: h,
    decimals: v,
    roundValue: g
  } = n, y = p(() => parseInt(t.thumbSize, 10)), w = p(() => parseInt(t.tickSize, 10)), E = p(() => parseInt(t.trackSize, 10)), A = p(() => (m.value - f.value) / h.value), P = se(t, "disabled"), C = p(() => t.error || t.disabled ? void 0 : t.thumbColor ?? t.color), x = p(() => t.error || t.disabled ? void 0 : t.trackColor ?? t.color), I = p(() => t.error || t.disabled ? void 0 : t.trackFillColor ?? t.color), N = he(!1), T = he(0), $ = ie(), O = ie();
  function k(J) {
    var S;
    const ke = t.direction === "vertical", Pe = ke ? "top" : "left", Xe = ke ? "height" : "width", Me = ke ? "clientY" : "clientX", {
      [Pe]: Et,
      [Xe]: nn
    } = (S = $.value) == null ? void 0 : S.$el.getBoundingClientRect(), yn = Ow(J, Me);
    let b = Math.min(Math.max((yn - Et - T.value) / nn, 0), 1) || 0;
    return (ke ? c.value : c.value !== s.value) && (b = 1 - b), g(f.value + b * (m.value - f.value));
  }
  const D = (J) => {
    l({
      value: k(J)
    }), N.value = !1, T.value = 0;
  }, R = (J) => {
    O.value = a(J), O.value && (O.value.focus(), N.value = !0, O.value.contains(J.target) ? T.value = Tw(J, O.value, t.direction) : (T.value = 0, i({
      value: k(J)
    })), o({
      value: k(J)
    }));
  }, G = {
    passive: !0,
    capture: !0
  };
  function re(J) {
    i({
      value: k(J)
    });
  }
  function oe(J) {
    J.stopPropagation(), J.preventDefault(), D(J), window.removeEventListener("mousemove", re, G), window.removeEventListener("mouseup", oe);
  }
  function ee(J) {
    var ke;
    D(J), window.removeEventListener("touchmove", re, G), (ke = J.target) == null || ke.removeEventListener("touchend", ee);
  }
  function B(J) {
    var ke;
    R(J), window.addEventListener("touchmove", re, G), (ke = J.target) == null || ke.addEventListener("touchend", ee, {
      passive: !1
    });
  }
  function M(J) {
    J.preventDefault(), R(J), window.addEventListener("mousemove", re, G), window.addEventListener("mouseup", oe, {
      passive: !1
    });
  }
  const H = (J) => {
    const ke = (J - f.value) / (m.value - f.value) * 100;
    return zt(isNaN(ke) ? 0 : ke, 0, 100);
  }, K = se(t, "showTicks"), Ne = p(() => K.value ? t.ticks ? Array.isArray(t.ticks) ? t.ticks.map((J) => ({
    value: J,
    position: H(J),
    label: J.toString()
  })) : Object.keys(t.ticks).map((J) => ({
    value: parseFloat(J),
    position: H(parseFloat(J)),
    label: t.ticks[J]
  })) : A.value !== 1 / 0 ? lr(A.value + 1).map((J) => {
    const ke = f.value + J * h.value;
    return {
      value: ke,
      position: H(ke)
    };
  }) : [] : []), we = p(() => Ne.value.some((J) => {
    let {
      label: ke
    } = J;
    return !!ke;
  })), Ie = {
    activeThumbRef: O,
    color: se(t, "color"),
    decimals: v,
    disabled: P,
    direction: se(t, "direction"),
    elevation: se(t, "elevation"),
    hasLabels: we,
    isReversed: r,
    indexFromEnd: c,
    min: f,
    max: m,
    mousePressed: N,
    numTicks: A,
    onSliderMousedown: M,
    onSliderTouchstart: B,
    parsedTicks: Ne,
    parseMouseMove: k,
    position: H,
    readonly: se(t, "readonly"),
    rounded: se(t, "rounded"),
    roundValue: g,
    showTicks: K,
    startOffset: T,
    step: h,
    thumbSize: y,
    thumbColor: C,
    thumbLabel: se(t, "thumbLabel"),
    ticks: se(t, "ticks"),
    tickSize: w,
    trackColor: x,
    trackContainerRef: $,
    trackFillColor: I,
    trackSize: E,
    vertical: d
  };
  return ht(Mr, Ie), Ie;
}, Dw = W({
  focused: Boolean,
  max: {
    type: Number,
    required: !0
  },
  min: {
    type: Number,
    required: !0
  },
  modelValue: {
    type: Number,
    required: !0
  },
  position: {
    type: Number,
    required: !0
  },
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  name: String,
  ...Ae()
}, "VSliderThumb"), $w = de()({
  name: "VSliderThumb",
  directives: {
    Ripple: ci
  },
  props: Dw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = Ge(Mr), {
      isRtl: l,
      rtlClasses: a
    } = $t();
    if (!i) throw new Error("[Vuetify] v-slider-thumb must be used inside v-slider or v-range-slider");
    const {
      thumbColor: s,
      step: r,
      disabled: d,
      thumbSize: c,
      thumbLabel: f,
      direction: m,
      isReversed: h,
      vertical: v,
      readonly: g,
      elevation: y,
      mousePressed: w,
      decimals: E,
      indexFromEnd: A
    } = i, P = p(() => d.value ? void 0 : y.value), {
      elevationClasses: C
    } = In(P), {
      textColorClasses: x,
      textColorStyles: I
    } = qt(s), {
      pageup: N,
      pagedown: T,
      end: $,
      home: O,
      left: k,
      right: D,
      down: R,
      up: G
    } = Uy, re = [N, T, $, O, k, D, R, G], oe = p(() => r.value ? [1, 2, 3] : [1, 5, 10]);
    function ee(M, H) {
      if (!re.includes(M.key)) return;
      M.preventDefault();
      const K = r.value || 0.1, Ne = (e.max - e.min) / K;
      if ([k, D, R, G].includes(M.key)) {
        const Ie = (v.value ? [l.value ? k : D, h.value ? R : G] : A.value !== l.value ? [k, G] : [D, G]).includes(M.key) ? 1 : -1, J = M.shiftKey ? 2 : M.ctrlKey ? 1 : 0;
        H = H + Ie * K * oe.value[J];
      } else if (M.key === O)
        H = e.min;
      else if (M.key === $)
        H = e.max;
      else {
        const we = M.key === T ? 1 : -1;
        H = H - we * K * (Ne > 100 ? Ne / 10 : 10);
      }
      return Math.max(e.min, Math.min(e.max, H));
    }
    function B(M) {
      const H = ee(M, e.modelValue);
      H != null && o("update:modelValue", H);
    }
    return Se(() => {
      const M = pe(A.value ? 100 - e.position : e.position, "%");
      return u("div", {
        class: ["v-slider-thumb", {
          "v-slider-thumb--focused": e.focused,
          "v-slider-thumb--pressed": e.focused && w.value
        }, e.class, a.value],
        style: [{
          "--v-slider-thumb-position": M,
          "--v-slider-thumb-size": pe(c.value)
        }, e.style],
        role: "slider",
        tabindex: d.value ? -1 : 0,
        "aria-label": e.name,
        "aria-valuemin": e.min,
        "aria-valuemax": e.max,
        "aria-valuenow": e.modelValue,
        "aria-readonly": !!g.value,
        "aria-orientation": m.value,
        onKeydown: g.value ? void 0 : B
      }, [u("div", {
        class: ["v-slider-thumb__surface", x.value, C.value],
        style: {
          ...I.value
        }
      }, null), lt(u("div", {
        class: ["v-slider-thumb__ripple", x.value],
        style: I.value
      }, null), [[Nn("ripple"), e.ripple, null, {
        circle: !0,
        center: !0
      }]]), u(E_, {
        origin: "bottom center"
      }, {
        default: () => {
          var H;
          return [lt(u("div", {
            class: "v-slider-thumb__label-container"
          }, [u("div", {
            class: ["v-slider-thumb__label"]
          }, [u("div", null, [((H = n["thumb-label"]) == null ? void 0 : H.call(n, {
            modelValue: e.modelValue
          })) ?? e.modelValue.toFixed(r.value ? E.value : 1)])])]), [[hn, f.value && e.focused || f.value === "always"]])];
        }
      })]);
    }), {};
  }
}), Mw = W({
  start: {
    type: Number,
    required: !0
  },
  stop: {
    type: Number,
    required: !0
  },
  ...Ae()
}, "VSliderTrack"), Bw = de()({
  name: "VSliderTrack",
  props: Mw(),
  emits: {},
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ge(Mr);
    if (!o) throw new Error("[Vuetify] v-slider-track must be inside v-slider or v-range-slider");
    const {
      color: i,
      parsedTicks: l,
      rounded: a,
      showTicks: s,
      tickSize: r,
      trackColor: d,
      trackFillColor: c,
      trackSize: f,
      vertical: m,
      min: h,
      max: v,
      indexFromEnd: g
    } = o, {
      roundedClasses: y
    } = Ct(a), {
      backgroundColorClasses: w,
      backgroundColorStyles: E
    } = Dt(c), {
      backgroundColorClasses: A,
      backgroundColorStyles: P
    } = Dt(d), C = p(() => `inset-${m.value ? "block" : "inline"}-${g.value ? "end" : "start"}`), x = p(() => m.value ? "height" : "width"), I = p(() => ({
      [C.value]: "0%",
      [x.value]: "100%"
    })), N = p(() => e.stop - e.start), T = p(() => ({
      [C.value]: pe(e.start, "%"),
      [x.value]: pe(N.value, "%")
    })), $ = p(() => s.value ? (m.value ? l.value.slice().reverse() : l.value).map((k, D) => {
      var G;
      const R = k.value !== h.value && k.value !== v.value ? pe(k.position, "%") : void 0;
      return u("div", {
        key: k.value,
        class: ["v-slider-track__tick", {
          "v-slider-track__tick--filled": k.position >= e.start && k.position <= e.stop,
          "v-slider-track__tick--first": k.value === h.value,
          "v-slider-track__tick--last": k.value === v.value
        }],
        style: {
          [C.value]: R
        }
      }, [(k.label || n["tick-label"]) && u("div", {
        class: "v-slider-track__tick-label"
      }, [((G = n["tick-label"]) == null ? void 0 : G.call(n, {
        tick: k,
        index: D
      })) ?? k.label])]);
    }) : []);
    return Se(() => u("div", {
      class: ["v-slider-track", y.value, e.class],
      style: [{
        "--v-slider-track-size": pe(f.value),
        "--v-slider-tick-size": pe(r.value)
      }, e.style]
    }, [u("div", {
      class: ["v-slider-track__background", A.value, {
        "v-slider-track__background--opacity": !!i.value || !c.value
      }],
      style: {
        ...I.value,
        ...P.value
      }
    }, null), u("div", {
      class: ["v-slider-track__fill", w.value],
      style: {
        ...T.value,
        ...E.value
      }
    }, null), s.value && u("div", {
      class: ["v-slider-track__ticks", {
        "v-slider-track__ticks--always-show": s.value === "always"
      }]
    }, [$.value])])), {};
  }
}), Fw = W({
  ...Ar(),
  ...Aw(),
  ...ka(),
  modelValue: {
    type: [Number, String],
    default: 0
  }
}, "VSlider"), Lw = de()({
  name: "VSlider",
  props: Fw(),
  emits: {
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0,
    start: (e) => !0,
    end: (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = ie(), {
      rtlClasses: l
    } = $t(), a = Iw(e), s = Ye(e, "modelValue", void 0, (x) => a.roundValue(x ?? a.min.value)), {
      min: r,
      max: d,
      mousePressed: c,
      roundValue: f,
      onSliderMousedown: m,
      onSliderTouchstart: h,
      trackContainerRef: v,
      position: g,
      hasLabels: y,
      readonly: w
    } = Pw({
      props: e,
      steps: a,
      onSliderStart: () => {
        o("start", s.value);
      },
      onSliderEnd: (x) => {
        let {
          value: I
        } = x;
        const N = f(I);
        s.value = N, o("end", N);
      },
      onSliderMove: (x) => {
        let {
          value: I
        } = x;
        return s.value = f(I);
      },
      getActiveThumb: () => {
        var x;
        return (x = i.value) == null ? void 0 : x.$el;
      }
    }), {
      isFocused: E,
      focus: A,
      blur: P
    } = wa(e), C = p(() => g(s.value));
    return Se(() => {
      const x = oi.filterProps(e), I = !!(e.label || n.label || n.prepend);
      return u(oi, be({
        class: ["v-slider", {
          "v-slider--has-labels": !!n["tick-label"] || y.value,
          "v-slider--focused": E.value,
          "v-slider--pressed": c.value,
          "v-slider--disabled": e.disabled
        }, l.value, e.class],
        style: e.style
      }, x, {
        focused: E.value
      }), {
        ...n,
        prepend: I ? (N) => {
          var T, $;
          return u(Ee, null, [((T = n.label) == null ? void 0 : T.call(n, N)) ?? (e.label ? u(Or, {
            id: N.id.value,
            class: "v-slider__label",
            text: e.label
          }, null) : void 0), ($ = n.prepend) == null ? void 0 : $.call(n, N)]);
        } : void 0,
        default: (N) => {
          let {
            id: T,
            messagesId: $
          } = N;
          return u("div", {
            class: "v-slider__container",
            onMousedown: w.value ? void 0 : m,
            onTouchstartPassive: w.value ? void 0 : h
          }, [u("input", {
            id: T.value,
            name: e.name || T.value,
            disabled: !!e.disabled,
            readonly: !!e.readonly,
            tabindex: "-1",
            value: s.value
          }, null), u(Bw, {
            ref: v,
            start: 0,
            stop: C.value
          }, {
            "tick-label": n["tick-label"]
          }), u($w, {
            ref: i,
            "aria-describedby": $.value,
            focused: E.value,
            min: r.value,
            max: d.value,
            modelValue: s.value,
            "onUpdate:modelValue": (O) => s.value = O,
            position: C.value,
            elevation: e.elevation,
            onFocus: A,
            onBlur: P,
            ripple: e.ripple,
            name: e.name
          }, {
            "thumb-label": n["thumb-label"]
          })]);
        }
      });
    }), {};
  }
}), Rw = {
  name: "ReaderSettings",
  emits: ["update", "open-themes"],
  computed: {
    // 设置面板里的 4 个快捷图标（纯色主题）
    quick_themes: function() {
      return this.themes.filter((e) => e.type === "solid");
    }
  },
  mounted: function() {
    var e, t, n, o, i, l, a, s, r, d, c, f;
    this.opt = {
      flow: ((e = this.settings) == null ? void 0 : e.flow) || this.opt.flow,
      theme: ((t = this.settings) == null ? void 0 : t.theme) || this.opt.theme,
      theme_mode: ((n = this.settings) == null ? void 0 : n.theme_mode) || this.opt.theme_mode,
      font_size: ((o = this.settings) == null ? void 0 : o.font_size) || this.opt.font_size,
      line_height: ((i = this.settings) == null ? void 0 : i.line_height) || this.opt.line_height,
      letter_spacing: ((l = this.settings) == null ? void 0 : l.letter_spacing) || this.opt.letter_spacing,
      brightness: ((a = this.settings) == null ? void 0 : a.brightness) || this.opt.brightness,
      show_comments: ((s = this.settings) == null ? void 0 : s.show_comments) ?? this.opt.show_comments,
      notes_enabled: ((r = this.settings) == null ? void 0 : r.notes_enabled) ?? this.opt.notes_enabled,
      show_selection_toolbar: ((d = this.settings) == null ? void 0 : d.show_selection_toolbar) ?? this.opt.show_selection_toolbar,
      paging_control: ((c = this.settings) == null ? void 0 : c.paging_control) || this.opt.paging_control,
      wheel_paging: ((f = this.settings) == null ? void 0 : f.wheel_paging) ?? this.opt.wheel_paging
    };
  },
  methods: {
    set_and_emit: function(e, t) {
      e === "font_size" ? t = Math.max(12, Math.min(48, t)) : e === "letter_spacing" ? t = Math.max(0, Math.min(20, t)) : e === "line_height" && (t = Math.max(1, Math.min(3, t))), this.opt = {
        ...this.opt,
        [e]: t
      }, this.$emit("update", { ...this.opt });
    },
    set_theme_and_emit: function(e, t) {
      this.opt = {
        ...this.opt,
        theme: e,
        theme_mode: t
      }, this.$emit("update", { ...this.opt });
    }
  },
  props: ["settings"],
  data: () => ({
    opt: {
      flow: "scrolled",
      theme: "eyecare",
      theme_mode: "day",
      font_size: 18,
      line_height: 1.5,
      letter_spacing: 0,
      brightness: 100,
      show_comments: !0,
      notes_enabled: !0,
      show_selection_toolbar: !0,
      paging_control: "mouse_and_keyboard",
      wheel_paging: !0
    },
    note_options: [
      { key: "notes_enabled", label: "笔记" },
      { key: "show_comments", label: "加载章节段落评论", child: !0 },
      { key: "show_selection_toolbar", label: "选中后出现工具栏", child: !0 }
    ],
    themes: ro
  })
}, Hw = { class: "d-inline-blockx text-center" }, jw = { class: "d-inline-blockx text-center" }, zw = { class: "d-inline-blockx text-center" }, Uw = { class: "note-settings" }, Ww = ["id"];
function qw(e, t, n, o, i, l) {
  return Q(), me(dn, { density: "compact" }, {
    default: _(() => [
      u(He, { class: "my-2" }, {
        default: _(() => [
          u(Bt, { class: "align-center" }, {
            default: _(() => [
              u(Be, { cols: "2" }, {
                default: _(() => t[18] || (t[18] = [
                  ue("span", null, "亮度", -1)
                ])),
                _: 1
              }),
              u(Be, { cols: "9" }, {
                default: _(() => [
                  u(Lw, {
                    "hide-details": "",
                    modelValue: e.opt.brightness,
                    "onUpdate:modelValue": [
                      t[0] || (t[0] = (a) => e.opt.brightness = a),
                      t[1] || (t[1] = (a) => e.$emit("update", e.opt))
                    ],
                    max: "100",
                    min: "1",
                    step: "1"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      u(He, { class: "my-2" }, {
        default: _(() => [
          u(Bt, { class: "align-center gx-3" }, {
            default: _(() => [
              u(Be, { cols: "2" }, {
                default: _(() => t[19] || (t[19] = [
                  ue("span", { class: "text-justify" }, "字体", -1)
                ])),
                _: 1
              }),
              u(Be, { cols: "2" }, {
                default: _(() => [
                  u(ce, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[2] || (t[2] = (a) => l.set_and_emit("font_size", e.opt.font_size - 2))
                  }, {
                    default: _(() => t[20] || (t[20] = [
                      q("A-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              u(Be, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: _(() => [
                  ue("span", Hw, Oe(e.opt.font_size), 1)
                ]),
                _: 1
              }),
              u(Be, { cols: "3" }, {
                default: _(() => [
                  u(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[3] || (t[3] = (a) => l.set_and_emit("font_size", e.opt.font_size + 2))
                  }, {
                    default: _(() => t[21] || (t[21] = [
                      q("A+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              u(Be, { cols: "3" }, {
                default: _(() => [
                  u(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[4] || (t[4] = (a) => l.set_and_emit("font_size", 18))
                  }, {
                    default: _(() => t[22] || (t[22] = [
                      q("默认")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      u(He, { class: "my-2" }, {
        default: _(() => [
          u(Bt, { class: "align-center" }, {
            default: _(() => [
              u(Be, { cols: "2" }, {
                default: _(() => t[23] || (t[23] = [
                  ue("span", null, "行距", -1)
                ])),
                _: 1
              }),
              u(Be, { cols: "2" }, {
                default: _(() => [
                  u(ce, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[5] || (t[5] = (a) => l.set_and_emit("line_height", e.opt.line_height - 0.1))
                  }, {
                    default: _(() => t[24] || (t[24] = [
                      q("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              u(Be, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: _(() => [
                  ue("span", jw, Oe(e.opt.line_height.toFixed(1)), 1)
                ]),
                _: 1
              }),
              u(Be, { cols: "3" }, {
                default: _(() => [
                  u(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[6] || (t[6] = (a) => l.set_and_emit("line_height", e.opt.line_height + 0.1))
                  }, {
                    default: _(() => t[25] || (t[25] = [
                      q("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              u(Be, { cols: "3" }, {
                default: _(() => [
                  u(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[7] || (t[7] = (a) => l.set_and_emit("line_height", 1.5))
                  }, {
                    default: _(() => t[26] || (t[26] = [
                      q("默认")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      u(He, { class: "my-2" }, {
        default: _(() => [
          u(Bt, { class: "align-center" }, {
            default: _(() => [
              u(Be, { cols: "2" }, {
                default: _(() => t[27] || (t[27] = [
                  ue("span", null, "间距", -1)
                ])),
                _: 1
              }),
              u(Be, { cols: "2" }, {
                default: _(() => [
                  u(ce, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[8] || (t[8] = (a) => l.set_and_emit("letter_spacing", e.opt.letter_spacing - 1))
                  }, {
                    default: _(() => t[28] || (t[28] = [
                      q("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              u(Be, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: _(() => [
                  ue("span", zw, Oe(e.opt.letter_spacing) + "px", 1)
                ]),
                _: 1
              }),
              u(Be, { cols: "3" }, {
                default: _(() => [
                  u(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[9] || (t[9] = (a) => l.set_and_emit("letter_spacing", e.opt.letter_spacing + 1))
                  }, {
                    default: _(() => t[29] || (t[29] = [
                      q("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              u(Be, { cols: "3" }, {
                default: _(() => [
                  u(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[10] || (t[10] = (a) => l.set_and_emit("letter_spacing", 0))
                  }, {
                    default: _(() => t[30] || (t[30] = [
                      q("默认")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      u(He, { class: "my-2" }, {
        default: _(() => [
          u(Bt, { class: "align-center" }, {
            default: _(() => [
              u(Be, { cols: "2" }, {
                default: _(() => t[31] || (t[31] = [
                  ue("span", null, "翻页", -1)
                ])),
                _: 1
              }),
              u(Be, { cols: "10" }, {
                default: _(() => [
                  u(Go, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: _(() => [
                      u(ce, {
                        active: e.opt.flow == "paginated",
                        onClick: t[11] || (t[11] = (a) => l.set_and_emit("flow", "paginated"))
                      }, {
                        default: _(() => t[32] || (t[32] = [
                          q("左右点击")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      u(ce, {
                        active: e.opt.flow == "scrolled",
                        onClick: t[12] || (t[12] = (a) => l.set_and_emit("flow", "scrolled"))
                      }, {
                        default: _(() => t[33] || (t[33] = [
                          q("上下滑动")
                        ])),
                        _: 1
                      }, 8, ["active"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      u(He, { class: "my-2" }, {
        default: _(() => [
          u(Bt, { class: "align-center" }, {
            default: _(() => [
              u(Be, { cols: "2" }, {
                default: _(() => t[34] || (t[34] = [
                  ue("span", null, "控制", -1)
                ])),
                _: 1
              }),
              u(Be, { cols: "10" }, {
                default: _(() => [
                  u(Go, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: _(() => [
                      u(ce, {
                        active: e.opt.paging_control == "mouse_and_keyboard",
                        onClick: t[13] || (t[13] = (a) => l.set_and_emit("paging_control", "mouse_and_keyboard"))
                      }, {
                        default: _(() => t[35] || (t[35] = [
                          q("鼠标+键盘")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      u(ce, {
                        active: e.opt.paging_control == "keyboard_only",
                        onClick: t[14] || (t[14] = (a) => l.set_and_emit("paging_control", "keyboard_only"))
                      }, {
                        default: _(() => t[36] || (t[36] = [
                          q("仅键盘")
                        ])),
                        _: 1
                      }, 8, ["active"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      u(He, { class: "my-2" }, {
        default: _(() => [
          u(Bt, { class: "align-center" }, {
            default: _(() => [
              u(Be, { cols: "2" }, {
                default: _(() => t[37] || (t[37] = [
                  ue("span", { density: "compact" }, "滚轮翻页", -1)
                ])),
                _: 1
              }),
              u(Be, { cols: "10" }, {
                default: _(() => [
                  u(Go, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: _(() => [
                      u(ce, {
                        active: e.opt.wheel_paging == !0,
                        onClick: t[15] || (t[15] = (a) => l.set_and_emit("wheel_paging", !0))
                      }, {
                        default: _(() => t[38] || (t[38] = [
                          q("开启")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      u(ce, {
                        active: e.opt.wheel_paging == !1,
                        onClick: t[16] || (t[16] = (a) => l.set_and_emit("wheel_paging", !1))
                      }, {
                        default: _(() => t[39] || (t[39] = [
                          q("关闭")
                        ])),
                        _: 1
                      }, 8, ["active"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      ue("fieldset", Uw, [
        t[42] || (t[42] = ue("legend", { class: "sr-only" }, "笔记设置", -1)),
        (Q(!0), Re(Ee, null, jt(e.note_options, (a) => (Q(), me(He, {
          key: a.key,
          class: "my-2",
          "data-setting": a.key
        }, {
          default: _(() => [
            u(Bt, {
              class: rn(["align-center", { "note-suboption": a.child, "note-suboption-disabled": a.child && !e.opt.notes_enabled }])
            }, {
              default: _(() => [
                u(Be, { cols: "5" }, {
                  default: _(() => [
                    ue("span", {
                      id: `setting-${a.key}`
                    }, Oe(a.label), 9, Ww)
                  ]),
                  _: 2
                }, 1024),
                u(Be, { cols: "7" }, {
                  default: _(() => [
                    u(Go, {
                      variant: "outlined",
                      divided: "",
                      density: "compact",
                      class: "note-setting-buttons",
                      role: "group",
                      "aria-labelledby": `setting-${a.key}`
                    }, {
                      default: _(() => [
                        u(ce, {
                          disabled: a.child && !e.opt.notes_enabled,
                          active: e.opt[a.key] === !0,
                          "aria-pressed": e.opt[a.key] === !0,
                          onClick: (s) => l.set_and_emit(a.key, !0)
                        }, {
                          default: _(() => t[40] || (t[40] = [
                            q("开启")
                          ])),
                          _: 2
                        }, 1032, ["disabled", "active", "aria-pressed", "onClick"]),
                        u(ce, {
                          disabled: a.child && !e.opt.notes_enabled,
                          active: e.opt[a.key] === !1,
                          "aria-pressed": e.opt[a.key] === !1,
                          onClick: (s) => l.set_and_emit(a.key, !1)
                        }, {
                          default: _(() => t[41] || (t[41] = [
                            q("关闭")
                          ])),
                          _: 2
                        }, 1032, ["disabled", "active", "aria-pressed", "onClick"])
                      ]),
                      _: 2
                    }, 1032, ["aria-labelledby"])
                  ]),
                  _: 2
                }, 1024)
              ]),
              _: 2
            }, 1032, ["class"])
          ]),
          _: 2
        }, 1032, ["data-setting"]))), 128))
      ]),
      u(He, { class: "my-2" }, {
        default: _(() => [
          u(Bt, {
            class: "align-center",
            "no-gutters": ""
          }, {
            default: _(() => [
              u(Be, { cols: "2" }, {
                default: _(() => t[43] || (t[43] = [
                  ue("span", { density: "compact" }, "皮肤", -1)
                ])),
                _: 1
              }),
              (Q(!0), Re(Ee, null, jt(l.quick_themes, (a) => (Q(), me(Be, {
                key: a.id,
                class: "text-center"
              }, {
                default: _(() => [
                  u(ce, {
                    active: e.opt.theme == a.id,
                    density: "compact",
                    icon: a.icon,
                    color: a.bg,
                    onClick: (s) => l.set_theme_and_emit(a.id, a.mode)
                  }, null, 8, ["active", "icon", "color", "onClick"])
                ]),
                _: 2
              }, 1024))), 128)),
              u(Be, {
                cols: "3",
                class: "text-right"
              }, {
                default: _(() => [
                  u(ce, {
                    variant: "text",
                    density: "compact",
                    size: "small",
                    "append-icon": "mdi-chevron-right",
                    onClick: t[17] || (t[17] = (a) => e.$emit("open-themes"))
                  }, {
                    default: _(() => t[44] || (t[44] = [
                      q("更多")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })
    ]),
    _: 1
  });
}
const vv = /* @__PURE__ */ On(Rw, [["render", qw], ["__scopeId", "data-v-d0dde8bb"]]), Os = "data-candle-audiobook-active", Br = "candle-audiobook", Fr = "candle-audiobook-active";
function ii(e) {
  return String(e || "").replace(/\s+/g, "").trim();
}
function Kw(e, t) {
  let n = 0, o = e.length - 1, i = -1;
  for (; n <= o; ) {
    const a = Math.floor((n + o) / 2);
    Number(e[a].start_ms) <= t ? (i = a, n = a + 1) : o = a - 1;
  }
  if (i < 0) return null;
  const l = e[i];
  return t < Number(l.end_ms) ? l : null;
}
function Pc(e) {
  return decodeURIComponent(String(e || "").split(/[?#]/)[0]).replace(/^\.\//, "").replace(/^\//, "");
}
function As(e, t) {
  const n = Pc(e), o = Pc(t);
  return !n || !o ? !1 : n === o || n.endsWith(`/${o}`) || o.endsWith(`/${n}`) || n.split("/").pop() === o.split("/").pop();
}
function hv(e) {
  var t, n, o, i;
  return ((t = e == null ? void 0 : e.section) == null ? void 0 : t.href) || ((n = e == null ? void 0 : e.section) == null ? void 0 : n.url) || ((i = (o = e == null ? void 0 : e.document) == null ? void 0 : o.location) == null ? void 0 : i.pathname) || "";
}
function Ga(e, t) {
  var l, a, s;
  const n = ((l = e == null ? void 0 : e.views) == null ? void 0 : l.call(e)) || [];
  let o = null;
  if ((a = n.forEach) == null || a.call(n, (r) => {
    var d, c;
    !o && As(((d = r == null ? void 0 : r.section) == null ? void 0 : d.href) || ((c = r == null ? void 0 : r.section) == null ? void 0 : c.url), t) && (o = r);
  }), o != null && o.contents) return o.contents;
  const i = ((s = e == null ? void 0 : e.getContents) == null ? void 0 : s.call(e)) || [];
  return t ? i.find((r) => As(hv(r), t)) || null : i[0] || null;
}
function Gw(e, t) {
  return Array.from((e == null ? void 0 : e.children) || []).filter((n) => {
    var o;
    return ((o = n.localName) == null ? void 0 : o.toLowerCase()) === t;
  });
}
function Yw(e, t) {
  const n = String(t || "").replace(/^\/+/, "").split("/").filter(Boolean);
  if (!n.length) return null;
  let o = e.documentElement;
  for (const i of n) {
    const l = i.match(/^([\w-]+)(?:\[(\d+)\])?$/);
    if (!l) return null;
    const a = l[1].toLowerCase(), s = Math.max(0, Number(l[2] || 1) - 1);
    if (a === "html") {
      o = e.documentElement;
      continue;
    }
    if (a === "body") {
      o = e.body;
      continue;
    }
    if (o = Gw(o, a)[s], !o) return null;
  }
  return o;
}
function Xw(e, t) {
  const n = ii(t);
  if (!n) return null;
  const o = e.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, div");
  return Array.from(o).find((i) => {
    const l = ii(i.textContent);
    return l === n || l.includes(n) || n.includes(l);
  }) || null;
}
function Jw(e, t) {
  const n = e == null ? void 0 : e.document, o = (t == null ? void 0 : t.locator) || {};
  if (!n) return null;
  let i = o.element_id ? n.getElementById(o.element_id) : null;
  return !i && o.dom_path && (i = Yw(n, o.dom_path)), i || (i = Xw(n, t.text)), i ? { document: n, element: i, locator: o } : null;
}
function Zw(e) {
  const t = [], n = e.ownerDocument.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  let o = n.nextNode();
  for (; o; )
    t.push(o), o = n.nextNode();
  return t;
}
function Dc(e, t) {
  let n = Math.max(0, t);
  for (const i of e) {
    if (n <= i.data.length) return { node: i, offset: n };
    n -= i.data.length;
  }
  const o = e[e.length - 1];
  return o ? { node: o, offset: o.data.length } : null;
}
function Qw(e, t, n) {
  const o = Zw(e);
  if (!o.length) return null;
  const i = o.reduce((f, m) => f + m.data.length, 0), l = Math.min(i, Math.max(0, Number(t) || 0)), a = Number(n), s = Math.min(i, Number.isFinite(a) && a > l ? a : i), r = Dc(o, l), d = Dc(o, s);
  if (!r || !d) return null;
  const c = e.ownerDocument.createRange();
  return c.setStart(r.node, r.offset), c.setEnd(d.node, d.offset), c;
}
function e1(e) {
  if (e.getElementById("candle-audiobook-highlight-style")) return;
  const t = e.createElement("style");
  t.id = "candle-audiobook-highlight-style", t.textContent = `
    ::highlight(${Br}) {
      background: rgba(245, 166, 35, .34);
      text-decoration: underline 2px rgba(180, 92, 0, .75);
      text-underline-offset: .18em;
    }
    .${Fr} {
      background: rgba(245, 166, 35, .2) !important;
      box-shadow: inset 3px 0 rgba(180, 92, 0, .72);
    }
  `, e.head.appendChild(t);
}
function gv(e) {
  var n;
  (((n = e == null ? void 0 : e.getContents) == null ? void 0 : n.call(e)) || []).forEach((o) => {
    var l, a, s;
    const i = o.document;
    i && ((s = (a = (l = i.defaultView) == null ? void 0 : l.CSS) == null ? void 0 : a.highlights) == null || s.delete(Br), i.querySelectorAll(`[${Os}]`).forEach((r) => {
      r.removeAttribute(Os), r.classList.remove(Fr);
    }));
  });
}
function t1(e, t, n) {
  var d, c;
  gv(e);
  const o = Jw(t, n);
  if (!o) return null;
  const { document: i, element: l, locator: a } = o;
  e1(i), l.setAttribute(Os, n.id || ""), l.classList.add(Fr);
  const s = Qw(l, a.start_char, a.end_char), r = i.defaultView;
  return s && ((d = r == null ? void 0 : r.CSS) != null && d.highlights) && r.Highlight && r.CSS.highlights.set(Br, new r.Highlight(s)), (c = l.scrollIntoView) == null || c.call(l, { block: "center", behavior: "smooth" }), { contents: t, document: i, element: l, range: s };
}
function n1(e, t) {
  return As(e == null ? void 0 : e.source_key, t);
}
function o1(e, t) {
  var i;
  if (!e || !t) return !1;
  if ((i = e.locator) != null && i.element_id && e.locator.element_id === t.id) return !0;
  const n = ii(e.text), o = ii(t.textContent);
  return !!(n && o && (o.includes(n) || n.includes(o)));
}
const i1 = {
  key: 0,
  class: "audiobook-player",
  "data-testid": "candle-audiobook-player",
  "aria-label": "边听边读播放器"
}, l1 = { class: "player-heading" }, a1 = {
  key: 0,
  class: "player-error",
  role: "alert"
}, s1 = { class: "player-controls" }, r1 = ["disabled"], u1 = ["aria-label", "disabled"], c1 = ["disabled"], d1 = { class: "time" }, f1 = ["max", "value"], m1 = { class: "time" }, v1 = { class: "rate-control" }, h1 = ["value"], g1 = 50, y1 = 100, p1 = 40, b1 = {
  __name: "AudiobookPlayer",
  props: {
    visible: { type: Boolean, default: !1 },
    editionId: { type: [Number, String], default: null },
    manifestUrl: { type: String, default: "" },
    rendition: { type: Object, default: null },
    request: { type: Function, required: !0 }
  },
  emits: ["close", "segment-change"],
  setup(e, { expose: t, emit: n }) {
    const o = e, i = n, l = ie(null), a = ie(null), s = ie(null), r = ie([]), d = ie(null), c = ie(!1), f = ie(!1), m = ie(""), h = ie(0), v = ie(0), g = ie(1), y = ie(!0), w = ie(""), E = ie(0), A = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];
    let P = null, C = null, x = null, I = "", N = 0, T = 0;
    const $ = p(() => {
      var F;
      return ((F = a.value) == null ? void 0 : F.chapters) || [];
    }), O = p(() => $.value.findIndex((F) => {
      var U;
      return F.id === ((U = s.value) == null ? void 0 : U.id);
    })), k = p(() => `candle:audiobook:${o.editionId || "manifest"}`);
    ge(
      () => [o.visible, o.editionId, o.manifestUrl],
      ([F]) => {
        F && R();
      },
      { immediate: !0 }
    ), ge(
      () => o.rendition,
      (F, U) => {
        var xe, Ce;
        (xe = U == null ? void 0 : U.off) == null || xe.call(U, "rendered", yn), (Ce = F == null ? void 0 : F.on) == null || Ce.call(F, "rendered", yn);
      },
      { immediate: !0 }
    );
    function D() {
      return o.manifestUrl || (o.editionId ? `/api/audiobooks/${o.editionId}/manifest` : "");
    }
    function R() {
      return a.value || !D() ? Promise.resolve() : x || (x = G().finally(() => {
        x = null;
      }), x);
    }
    async function G() {
      var F, U, xe, Ce;
      f.value = !0, m.value = "";
      try {
        const fe = await o.request(D());
        if (fe.err !== "ok" || !((U = (F = fe.manifest) == null ? void 0 : F.chapters) != null && U.length))
          throw new Error(fe.msg || "当前书籍没有可播放章节");
        a.value = fe.manifest, E.value = ((xe = fe.progress) == null ? void 0 : xe.version) || 0;
        const $e = X(), it = $.value.find((vt) => {
          var Yt;
          return vt.id === ((Yt = fe.progress) == null ? void 0 : Yt.chapter_id);
        }) || $.value.find((vt) => vt.number === $e.chapterNumber) || $.value[0], st = ((Ce = fe.progress) == null ? void 0 : Ce.position_ms) ?? $e.positionMs ?? 0;
        g.value = $e.rate || 1, await oe(it, { startMs: st, autoplay: !1, navigate: !1 });
      } catch (fe) {
        m.value = (fe == null ? void 0 : fe.message) || "有声书加载失败";
      } finally {
        f.value = !1;
      }
    }
    async function re(F) {
      var Ce;
      const U = F.timeline_url || `/api/audiobooks/${a.value.id}/chapters/${F.number}/timeline`, xe = await o.request(U);
      r.value = xe.err === "ok" ? ((Ce = xe.timeline) == null ? void 0 : Ce.segments) || [] : [];
    }
    async function oe(F, { startMs: U = 0, autoplay: xe = !1, navigate: Ce = !0 } = {}) {
      if (F) {
        f.value = !0, m.value = "", b();
        try {
          s.value = F, h.value = Math.max(0, Number(U) || 0), v.value = Number(F.duration_ms) || 0, await re(F), Ce && y.value && await ee(F), await ot();
          const fe = l.value;
          if (!fe) return;
          const $e = new URL(F.audio_url, window.location.href).href;
          fe.src !== $e && (fe.src = F.audio_url, fe.load()), await Ne(fe), fe.playbackRate = g.value, fe.currentTime = Math.min(h.value / 1e3, fe.duration || 1 / 0), Ve(), Et(!0), xe && await M();
        } catch (fe) {
          m.value = (fe == null ? void 0 : fe.message) || "章节音频加载失败";
        } finally {
          f.value = !1;
        }
      }
    }
    async function ee(F) {
      !o.rendition || !(F != null && F.source_key) || await o.rendition.display(F.source_key);
    }
    async function B() {
      if (w.value || !a.value) return;
      const F = await o.request(`/api/audiobooks/${a.value.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "candle", device_id: "candle-reader" })
      });
      F.err === "ok" && (w.value = F.session_id || "");
    }
    async function M() {
      const F = l.value;
      if (F) {
        await B(), F.playbackRate = g.value;
        try {
          await F.play();
        } catch (U) {
          m.value = (U == null ? void 0 : U.name) === "NotAllowedError" ? "请再次点击播放" : "无法播放章节音频";
        }
      }
    }
    async function H() {
      a.value || await R();
      const F = l.value;
      !F || !s.value || (F.paused ? await M() : F.pause());
    }
    function K() {
      const F = l.value;
      F && (v.value = Number.isFinite(F.duration) ? Math.round(F.duration * 1e3) : v.value);
    }
    function Ne(F) {
      return F.readyState >= HTMLMediaElement.HAVE_METADATA ? Promise.resolve() : new Promise((U, xe) => {
        const Ce = () => {
          $e(), U();
        }, fe = () => {
          $e(), xe(new Error("章节音频元数据加载失败"));
        }, $e = () => {
          F.removeEventListener("loadedmetadata", Ce), F.removeEventListener("error", fe);
        };
        F.addEventListener("loadedmetadata", Ce), F.addEventListener("error", fe);
      });
    }
    function we() {
      c.value = !0, T = Date.now(), Et(!0), Pe(), ae();
    }
    function Ie() {
      c.value = !1, Xe(), Me(), te(!0), Ve();
    }
    async function J() {
      c.value = !1, Xe(), await te(!0, O.value === $.value.length - 1), O.value < $.value.length - 1 && await oe($.value[O.value + 1], { autoplay: !0 });
    }
    function ke() {
      var F;
      (F = l.value) != null && F.src && (m.value = "章节音频加载失败", c.value = !1, Xe());
    }
    function Pe() {
      Xe(), P = window.setInterval(Me, 150), C = window.setInterval(() => void te(), 1e4);
    }
    function Xe() {
      P && window.clearInterval(P), C && window.clearInterval(C), P = null, C = null;
    }
    function Me() {
      const F = l.value;
      F && (h.value = Math.round(F.currentTime * 1e3), Et(), Ve());
    }
    function Et(F = !1) {
      const U = Kw(r.value, h.value), xe = (U == null ? void 0 : U.id) || "";
      if (!(!F && xe === I)) {
        if (I = xe, d.value = U, i("segment-change", U), !U || !y.value || !c.value) {
          b();
          return;
        }
        nn(U);
      }
    }
    async function nn(F) {
      var $e, it;
      const U = ++N, Ce = (F.locator || {}).href || (($e = s.value) == null ? void 0 : $e.source_key);
      let fe = Ga(o.rendition, Ce);
      !fe && o.rendition && y.value && await o.rendition.display(Ce);
      for (let st = 0; st < p1; st += 1) {
        if (U !== N || !y.value) return;
        if (fe = Ga(o.rendition, Ce), fe && t1(o.rendition, fe, F)) {
          if (await new Promise((ut) => window.setTimeout(ut, y1)), U !== N || !y.value) return;
          const vt = Ga(o.rendition, Ce), Yt = (it = vt == null ? void 0 : vt.document) == null ? void 0 : it.querySelector("[data-candle-audiobook-active]");
          if ((Yt == null ? void 0 : Yt.getAttribute("data-candle-audiobook-active")) === F.id) return;
        }
        await new Promise((vt) => window.setTimeout(vt, g1));
      }
      U === N && y.value && console.warn("[candle-audiobook] 无法定位时间轴片段", F.id);
    }
    function yn() {
      d.value && y.value && c.value && nn(d.value);
    }
    function b() {
      N += 1, gv(o.rendition);
    }
    function S() {
      !s.value || !d.value || (y.value = !1, b());
    }
    async function L() {
      y.value = !0, d.value && await nn(d.value);
    }
    function Y(F) {
      const U = l.value;
      h.value = Math.max(0, Math.min(v.value, F)), U && (U.currentTime = h.value / 1e3), Et(!0), Ve();
    }
    function j() {
      l.value && (l.value.playbackRate = g.value), Ve();
    }
    async function z() {
      O.value > 0 && await oe($.value[O.value - 1], { autoplay: c.value });
    }
    async function le() {
      O.value < $.value.length - 1 && await oe($.value[O.value + 1], { autoplay: c.value });
    }
    async function ne(F) {
      var Yt, ut, Mt, mo, Lr, ol, Rr, Hr, jr;
      if (a.value || await R(), !a.value || !F) return !1;
      y.value = !0;
      const U = ((Yt = F.toc) == null ? void 0 : Yt.href) || ((ut = F.toc) == null ? void 0 : ut.id) || hv(F.contents), xe = $.value.find((vo) => n1(vo, U)) || s.value || $.value[0];
      (xe == null ? void 0 : xe.id) !== ((Mt = s.value) == null ? void 0 : Mt.id) && await oe(xe, { navigate: !1 });
      const Ce = ((Lr = (mo = F.cfi) == null ? void 0 : mo.toString) == null ? void 0 : Lr.call(mo)) || F.cfi, fe = Ce && ((Rr = (ol = o.rendition) == null ? void 0 : ol.getRange) == null ? void 0 : Rr.call(ol, Ce)), $e = ((Hr = fe == null ? void 0 : fe.startContainer) == null ? void 0 : Hr.nodeType) === Node.TEXT_NODE ? fe.startContainer.parentElement : fe == null ? void 0 : fe.startContainer, it = ((jr = $e == null ? void 0 : $e.closest) == null ? void 0 : jr.call($e, "p, h1, h2, h3, h4, h5, h6, li, blockquote")) || null, st = ii(it == null ? void 0 : it.textContent), vt = st && r.value.find((vo) => ii(vo.text) === st) || it && r.value.find((vo) => o1(vo, it)) || r.value.find((vo) => Number(vo.index) === Number(F.segment_id));
      return vt ? (await oe(xe, { startMs: vt.start_ms, autoplay: !0, navigate: !0 }), !0) : !1;
    }
    async function te(F = !1, U = !1) {
      var $e;
      if (!w.value || !s.value) return;
      const xe = Date.now(), Ce = c.value && T ? Math.min(6e4, Math.max(0, xe - T)) : 0;
      if (!F && Ce < 9e3) return;
      T = xe;
      const fe = await o.request(`/api/audiobook-sessions/${w.value}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: s.value.id,
          position_ms: h.value,
          segment_id: (($e = d.value) == null ? void 0 : $e.id) || "",
          listened_delta_ms: Ce,
          completed: U,
          version: E.value
        })
      });
      (fe.err === "ok" || fe.err === "progress.conflict") && (E.value = fe.version || E.value);
    }
    function X() {
      try {
        return JSON.parse(localStorage.getItem(k.value) || "{}");
      } catch {
        return {};
      }
    }
    function Ve() {
      s.value && localStorage.setItem(k.value, JSON.stringify({
        chapterNumber: s.value.number,
        positionMs: h.value,
        rate: g.value
      }));
    }
    function ae() {
      !("mediaSession" in navigator) || !s.value || (navigator.mediaSession.metadata = new MediaMetadata({ title: s.value.title, album: "边听边读" }), navigator.mediaSession.setActionHandler("play", M), navigator.mediaSession.setActionHandler("pause", () => {
        var F;
        return (F = l.value) == null ? void 0 : F.pause();
      }), navigator.mediaSession.setActionHandler("previoustrack", z), navigator.mediaSession.setActionHandler("nexttrack", le));
    }
    function ye(F) {
      const U = Math.max(0, Math.floor((F || 0) / 1e3));
      return `${Math.floor(U / 60)}:${String(U % 60).padStart(2, "0")}`;
    }
    return pt(() => {
      var F, U;
      Xe(), (U = (F = o.rendition) == null ? void 0 : F.off) == null || U.call(F, "rendered", yn), b(), w.value && o.request(`/api/audiobook-sessions/${w.value}`, { method: "POST" });
    }), t({ loadManifest: R, playFromSelection: ne, returnToNarration: L, suspendFollow: S }), (F, U) => {
      var xe, Ce;
      return e.visible ? (Q(), Re("section", i1, [
        ue("header", l1, [
          ue("div", null, [
            U[3] || (U[3] = ue("span", { class: "player-kicker" }, "边听边读", -1)),
            ue("strong", null, Oe(((xe = s.value) == null ? void 0 : xe.title) || "正在载入有声书"), 1)
          ]),
          ue("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "关闭听书播放器",
            onClick: U[0] || (U[0] = (fe) => i("close"))
          }, [
            u(De, { size: "20" }, {
              default: _(() => U[4] || (U[4] = [
                q("mdi-close")
              ])),
              _: 1
            })
          ])
        ]),
        ue("p", {
          class: rn(["active-dialogue", { muted: !d.value }])
        }, Oe(((Ce = d.value) == null ? void 0 : Ce.text) || (f.value ? "正在加载章节时间轴…" : "片段间留白")), 3),
        m.value ? (Q(), Re("div", a1, Oe(m.value), 1)) : We("", !0),
        ue("div", s1, [
          ue("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "上一章",
            disabled: O.value <= 0,
            onClick: z
          }, [
            u(De, null, {
              default: _(() => U[5] || (U[5] = [
                q("mdi-skip-previous")
              ])),
              _: 1
            })
          ], 8, r1),
          ue("button", {
            type: "button",
            class: "play-button",
            "aria-label": c.value ? "暂停听书" : "播放听书",
            disabled: f.value || !s.value,
            onClick: H
          }, [
            u(De, null, {
              default: _(() => [
                q(Oe(c.value ? "mdi-pause" : "mdi-play"), 1)
              ]),
              _: 1
            })
          ], 8, u1),
          ue("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "下一章",
            disabled: O.value >= $.value.length - 1,
            onClick: le
          }, [
            u(De, null, {
              default: _(() => U[6] || (U[6] = [
                q("mdi-skip-next")
              ])),
              _: 1
            })
          ], 8, c1),
          ue("span", d1, Oe(ye(h.value)), 1),
          ue("input", {
            class: "timeline-slider",
            type: "range",
            min: "0",
            max: Math.max(v.value, 1),
            step: "100",
            value: h.value,
            "aria-label": "听书进度",
            onInput: U[1] || (U[1] = (fe) => Y(Number(fe.target.value)))
          }, null, 40, f1),
          ue("span", m1, Oe(ye(v.value)), 1),
          ue("label", v1, [
            U[7] || (U[7] = ue("span", { class: "sr-only" }, "播放速度", -1)),
            lt(ue("select", {
              "onUpdate:modelValue": U[2] || (U[2] = (fe) => g.value = fe),
              "aria-label": "播放速度",
              onChange: j
            }, [
              (Q(), Re(Ee, null, jt(A, (fe) => ue("option", {
                key: fe,
                value: fe
              }, "x" + Oe(fe), 9, h1)), 64))
            ], 544), [
              [
                Ay,
                g.value,
                void 0,
                { number: !0 }
              ]
            ])
          ])
        ]),
        y.value ? We("", !0) : (Q(), Re("button", {
          key: 1,
          type: "button",
          class: "return-button",
          "data-testid": "return-to-narration",
          onClick: L
        }, [
          u(De, { size: "18" }, {
            default: _(() => U[8] || (U[8] = [
              q("mdi-target")
            ])),
            _: 1
          }),
          U[9] || (U[9] = q(" 回到朗读位置 "))
        ])),
        ue("audio", {
          ref_key: "audioElement",
          ref: l,
          preload: "metadata",
          onLoadedmetadata: K,
          onPlay: we,
          onPause: Ie,
          onEnded: J,
          onError: ke
        }, null, 544)
      ])) : We("", !0);
    };
  }
}, yv = /* @__PURE__ */ On(b1, [["__scopeId", "data-v-f2028a04"]]);
function _1(e = {}) {
  const t = e.show_comments ?? !0, n = e.show_annotations ?? !0;
  return {
    notes_settings_version: 2,
    notes_enabled: e.notes_enabled ?? (t || n),
    show_comments: t,
    show_selection_toolbar: e.show_selection_toolbar ?? n
  };
}
const w1 = "candle-reader:annotations:v1:";
function $c(e) {
  return e.client_id || e.id;
}
function Is() {
  var e;
  return (e = window.crypto) != null && e.randomUUID ? window.crypto.randomUUID() : `candle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function k1(e) {
  const t = Array.isArray(e) ? e : e == null ? void 0 : e.annotations;
  if (!Array.isArray(t)) throw new Error("读取笔记的回调必须返回数组或 { annotations }");
  return t;
}
function S1(e) {
  const t = (e == null ? void 0 : e.annotation) || e;
  if (!t || typeof t != "object" || Array.isArray(t))
    throw new Error("写入笔记的回调必须返回笔记对象或 { annotation }");
  return t;
}
function C1(e, t) {
  return `${w1}${encodeURIComponent(String(e || t || "unknown-book"))}`;
}
function E1({ bookId: e, bookUrl: t, storage: n } = {}) {
  const o = C1(e, t);
  let i = n;
  if (i === void 0)
    try {
      i = window.localStorage;
    } catch {
      throw new Error("浏览器禁止访问本地存储，无法保存笔记");
    }
  if (!i) throw new Error("浏览器不支持本地存储，无法保存笔记");
  function l() {
    try {
      const a = JSON.parse(i.getItem(o) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (a) {
      return console.warn("Candle Reader 本地笔记损坏，已忽略：", a), [];
    }
  }
  return {
    async load({ chapter: a } = {}) {
      const s = l();
      return a ? s.filter((r) => r.chapter === a) : s;
    },
    async save(a) {
      const s = (/* @__PURE__ */ new Date()).toISOString(), r = l(), d = $c(a) || Is(), c = r.findIndex((h) => $c(h) === d), f = c >= 0 ? r[c] : null, m = {
        ...f,
        ...a,
        id: (f == null ? void 0 : f.id) || a.id || d,
        client_id: a.client_id || (f == null ? void 0 : f.client_id) || d,
        created_at: (f == null ? void 0 : f.created_at) || a.created_at || s,
        updated_at: s
      };
      return c >= 0 ? r.splice(c, 1, m) : r.push(m), i.setItem(o, JSON.stringify(r)), m;
    }
  };
}
function x1({ callbacks: e, bookId: t, bookUrl: n, storage: o } = {}) {
  const i = e != null;
  if (i && (typeof e.load != "function" || typeof e.save != "function"))
    throw new Error("annotation_callbacks 必须同时提供 load 和 save 函数");
  const l = i ? e : E1({ bookId: t, bookUrl: n, storage: o }), a = { book_id: t || null, book_url: n || "" };
  return {
    source: i ? "callback" : "localStorage",
    async load(s = {}) {
      return k1(await l.load({ ...a, ...s }));
    },
    async save(s) {
      return S1(await l.save({ ...s }, a));
    }
  };
}
const V1 = W({
  ...Ae(),
  ...Bb({
    fullHeight: !0
  }),
  ...nt()
}, "VApp"), N1 = de()({
  name: "VApp",
  props: V1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = ct(e), {
      layoutClasses: i,
      getLayoutItem: l,
      items: a,
      layoutRef: s
    } = Lb(e), {
      rtlClasses: r
    } = $t();
    return Se(() => {
      var d;
      return u("div", {
        ref: s,
        class: ["v-application", o.themeClasses.value, i.value, r.value, e.class],
        style: [e.style]
      }, [u("div", {
        class: "v-application__wrap"
      }, [(d = n.default) == null ? void 0 : d.call(n)])]);
    }), {
      getLayoutItem: l,
      items: a,
      theme: o
    };
  }
}), T1 = W({
  text: String,
  ...Ae(),
  ...Ze()
}, "VToolbarTitle"), pv = de()({
  name: "VToolbarTitle",
  props: T1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Se(() => {
      const o = !!(n.default || n.text || e.text);
      return u(e.tag, {
        class: ["v-toolbar-title", e.class],
        style: e.style
      }, {
        default: () => {
          var i;
          return [o && u("div", {
            class: "v-toolbar-title__placeholder"
          }, [n.text ? n.text() : e.text, (i = n.default) == null ? void 0 : i.call(n)])];
        }
      });
    }), {};
  }
}), O1 = [null, "prominent", "default", "comfortable", "compact"], bv = W({
  absolute: Boolean,
  collapse: Boolean,
  color: String,
  density: {
    type: String,
    default: "default",
    validator: (e) => O1.includes(e)
  },
  extended: Boolean,
  extensionHeight: {
    type: [Number, String],
    default: 48
  },
  flat: Boolean,
  floating: Boolean,
  height: {
    type: [Number, String],
    default: 64
  },
  image: String,
  title: String,
  ...Zn(),
  ...Ae(),
  ...An(),
  ...St(),
  ...Ze({
    tag: "header"
  }),
  ...nt()
}, "VToolbar"), Zl = de()({
  name: "VToolbar",
  props: bv(),
  setup(e, t) {
    var h;
    let {
      slots: n
    } = t;
    const {
      backgroundColorClasses: o,
      backgroundColorStyles: i
    } = Dt(se(e, "color")), {
      borderClasses: l
    } = Qn(e), {
      elevationClasses: a
    } = In(e), {
      roundedClasses: s
    } = Ct(e), {
      themeClasses: r
    } = ct(e), {
      rtlClasses: d
    } = $t(), c = he(!!(e.extended || (h = n.extension) != null && h.call(n))), f = p(() => parseInt(Number(e.height) + (e.density === "prominent" ? Number(e.height) : 0) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0), 10)), m = p(() => c.value ? parseInt(Number(e.extensionHeight) + (e.density === "prominent" ? Number(e.extensionHeight) : 0) - (e.density === "comfortable" ? 4 : 0) - (e.density === "compact" ? 8 : 0), 10) : 0);
    return Jn({
      VBtn: {
        variant: "text"
      }
    }), Se(() => {
      var w;
      const v = !!(e.title || n.title), g = !!(n.image || e.image), y = (w = n.extension) == null ? void 0 : w.call(n);
      return c.value = !!(e.extended || y), u(e.tag, {
        class: ["v-toolbar", {
          "v-toolbar--absolute": e.absolute,
          "v-toolbar--collapse": e.collapse,
          "v-toolbar--flat": e.flat,
          "v-toolbar--floating": e.floating,
          [`v-toolbar--density-${e.density}`]: !0
        }, o.value, l.value, a.value, s.value, r.value, d.value, e.class],
        style: [i.value, e.style]
      }, {
        default: () => [g && u("div", {
          key: "image",
          class: "v-toolbar__image"
        }, [n.image ? u(tt, {
          key: "image-defaults",
          disabled: !e.image,
          defaults: {
            VImg: {
              cover: !0,
              src: e.image
            }
          }
        }, n.image) : u(Cr, {
          key: "image-img",
          cover: !0,
          src: e.image
        }, null)]), u(tt, {
          defaults: {
            VTabs: {
              height: pe(f.value)
            }
          }
        }, {
          default: () => {
            var E, A, P;
            return [u("div", {
              class: "v-toolbar__content",
              style: {
                height: pe(f.value)
              }
            }, [n.prepend && u("div", {
              class: "v-toolbar__prepend"
            }, [(E = n.prepend) == null ? void 0 : E.call(n)]), v && u(pv, {
              key: "title",
              text: e.title
            }, {
              text: n.title
            }), (A = n.default) == null ? void 0 : A.call(n), n.append && u("div", {
              class: "v-toolbar__append"
            }, [(P = n.append) == null ? void 0 : P.call(n)])])];
          }
        }), u(tt, {
          defaults: {
            VTabs: {
              height: pe(m.value)
            }
          }
        }, {
          default: () => [u(pm, null, {
            default: () => [c.value && u("div", {
              class: "v-toolbar__extension",
              style: {
                height: pe(m.value)
              }
            }, [y])]
          })]
        })]
      });
    }), {
      contentHeight: f,
      extensionHeight: m
    };
  }
}), A1 = W({
  scrollTarget: {
    type: String
  },
  scrollThreshold: {
    type: [String, Number],
    default: 300
  }
}, "scroll");
function I1(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const {
    canScroll: n
  } = t;
  let o = 0, i = 0;
  const l = ie(null), a = he(0), s = he(0), r = he(0), d = he(!1), c = he(!1), f = p(() => Number(e.scrollThreshold)), m = p(() => zt((f.value - a.value) / f.value || 0)), h = () => {
    const v = l.value;
    if (!v || n && !n.value) return;
    o = a.value, a.value = "window" in v ? v.pageYOffset : v.scrollTop;
    const g = v instanceof Window ? document.documentElement.scrollHeight : v.scrollHeight;
    if (i !== g) {
      i = g;
      return;
    }
    c.value = a.value < o, r.value = Math.abs(a.value - f.value);
  };
  return ge(c, () => {
    s.value = s.value || a.value;
  }), ge(d, () => {
    s.value = 0;
  }), vn(() => {
    ge(() => e.scrollTarget, (v) => {
      var y;
      const g = v ? document.querySelector(v) : window;
      if (!g) {
        xn(`Unable to locate element with identifier ${v}`);
        return;
      }
      g !== l.value && ((y = l.value) == null || y.removeEventListener("scroll", h), l.value = g, l.value.addEventListener("scroll", h, {
        passive: !0
      }));
    }, {
      immediate: !0
    });
  }), pt(() => {
    var v;
    (v = l.value) == null || v.removeEventListener("scroll", h);
  }), n && ge(n, h, {
    immediate: !0
  }), {
    scrollThreshold: f,
    currentScroll: a,
    currentThreshold: r,
    isScrollActive: d,
    scrollRatio: m,
    // required only for testing
    // probably can be removed
    // later (2 chars chlng)
    isScrollingUp: c,
    savedScroll: s
  };
}
const P1 = W({
  scrollBehavior: String,
  modelValue: {
    type: Boolean,
    default: !0
  },
  location: {
    type: String,
    default: "top",
    validator: (e) => ["top", "bottom"].includes(e)
  },
  ...bv(),
  ...Gf(),
  ...A1(),
  height: {
    type: [Number, String],
    default: 64
  }
}, "VAppBar"), D1 = de()({
  name: "VAppBar",
  props: P1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = ie(), i = Ye(e, "modelValue"), l = p(() => {
      var A;
      const E = new Set(((A = e.scrollBehavior) == null ? void 0 : A.split(" ")) ?? []);
      return {
        hide: E.has("hide"),
        fullyHide: E.has("fully-hide"),
        inverted: E.has("inverted"),
        collapse: E.has("collapse"),
        elevate: E.has("elevate"),
        fadeImage: E.has("fade-image")
        // shrink: behavior.has('shrink'),
      };
    }), a = p(() => {
      const E = l.value;
      return E.hide || E.fullyHide || E.inverted || E.collapse || E.elevate || E.fadeImage || // behavior.shrink ||
      !i.value;
    }), {
      currentScroll: s,
      scrollThreshold: r,
      isScrollingUp: d,
      scrollRatio: c
    } = I1(e, {
      canScroll: a
    }), f = p(() => l.value.hide || l.value.fullyHide), m = p(() => e.collapse || l.value.collapse && (l.value.inverted ? c.value > 0 : c.value === 0)), h = p(() => e.flat || l.value.fullyHide && !i.value || l.value.elevate && (l.value.inverted ? s.value > 0 : s.value === 0)), v = p(() => l.value.fadeImage ? l.value.inverted ? 1 - c.value : c.value : void 0), g = p(() => {
      var P, C;
      if (l.value.hide && l.value.inverted) return 0;
      const E = ((P = o.value) == null ? void 0 : P.contentHeight) ?? 0, A = ((C = o.value) == null ? void 0 : C.extensionHeight) ?? 0;
      return f.value ? s.value < r.value || l.value.fullyHide ? E + A : E : E + A;
    });
    Wn(p(() => !!e.scrollBehavior), () => {
      Ut(() => {
        f.value ? l.value.inverted ? i.value = s.value > r.value : i.value = d.value || s.value < r.value : i.value = !0;
      });
    });
    const {
      ssrBootStyles: y
    } = el(), {
      layoutItemStyles: w
    } = Xf({
      id: e.name,
      order: p(() => parseInt(e.order, 10)),
      position: se(e, "location"),
      layoutSize: g,
      elementSize: he(void 0),
      active: i,
      absolute: se(e, "absolute")
    });
    return Se(() => {
      const E = Zl.filterProps(e);
      return u(Zl, be({
        ref: o,
        class: ["v-app-bar", {
          "v-app-bar--bottom": e.location === "bottom"
        }, e.class],
        style: [{
          ...w.value,
          "--v-toolbar-image-opacity": v.value,
          height: void 0,
          ...y.value
        }, e.style]
      }, E, {
        collapse: m.value,
        flat: h.value
      }), n);
    }), {};
  }
}), $1 = W({
  bordered: Boolean,
  color: String,
  content: [Number, String],
  dot: Boolean,
  floating: Boolean,
  icon: ze,
  inline: Boolean,
  label: {
    type: String,
    default: "$vuetify.badge"
  },
  max: [Number, String],
  modelValue: {
    type: Boolean,
    default: !0
  },
  offsetX: [Number, String],
  offsetY: [Number, String],
  textColor: String,
  ...Ae(),
  ...ui({
    location: "top end"
  }),
  ...St(),
  ...Ze(),
  ...nt(),
  ...di({
    transition: "scale-rotate-transition"
  })
}, "VBadge"), Mc = de()({
  name: "VBadge",
  inheritAttrs: !1,
  props: $1(),
  setup(e, t) {
    const {
      backgroundColorClasses: n,
      backgroundColorStyles: o
    } = Dt(se(e, "color")), {
      roundedClasses: i
    } = Ct(e), {
      t: l
    } = ri(), {
      textColorClasses: a,
      textColorStyles: s
    } = qt(se(e, "textColor")), {
      themeClasses: r
    } = qf(), {
      locationStyles: d
    } = Qi(e, !0, (c) => (e.floating ? e.dot ? 2 : 4 : e.dot ? 8 : 12) + (["top", "bottom"].includes(c) ? +(e.offsetY ?? 0) : ["left", "right"].includes(c) ? +(e.offsetX ?? 0) : 0));
    return Se(() => {
      const c = Number(e.content), f = !e.max || isNaN(c) ? e.content : c <= +e.max ? c : `${e.max}+`, [m, h] = hs(t.attrs, ["aria-atomic", "aria-label", "aria-live", "role", "title"]);
      return u(e.tag, be({
        class: ["v-badge", {
          "v-badge--bordered": e.bordered,
          "v-badge--dot": e.dot,
          "v-badge--floating": e.floating,
          "v-badge--inline": e.inline
        }, e.class]
      }, h, {
        style: e.style
      }), {
        default: () => {
          var v, g;
          return [u("div", {
            class: "v-badge__wrapper"
          }, [(g = (v = t.slots).default) == null ? void 0 : g.call(v), u(Cn, {
            transition: e.transition
          }, {
            default: () => {
              var y, w;
              return [lt(u("span", be({
                class: ["v-badge__badge", r.value, n.value, i.value, a.value],
                style: [o.value, s.value, e.inline ? {} : d.value],
                "aria-atomic": "true",
                "aria-label": l(e.label, c),
                "aria-live": "polite",
                role: "status"
              }, m), [e.dot ? void 0 : t.slots.badge ? (w = (y = t.slots).badge) == null ? void 0 : w.call(y) : e.icon ? u(De, {
                icon: e.icon
              }, null) : f]), [[hn, e.modelValue]])];
            }
          })])];
        }
      });
    }), {};
  }
}), M1 = W({
  baseColor: String,
  bgColor: String,
  color: String,
  grow: Boolean,
  mode: {
    type: String,
    validator: (e) => !e || ["horizontal", "shift"].includes(e)
  },
  height: {
    type: [Number, String],
    default: 56
  },
  active: {
    type: Boolean,
    default: !0
  },
  ...Zn(),
  ...Ae(),
  ...Kt(),
  ...An(),
  ...St(),
  ...Gf({
    name: "bottom-navigation"
  }),
  ...Ze({
    tag: "header"
  }),
  ...ha({
    selectedClass: "v-btn--selected"
  }),
  ...nt()
}, "VBottomNavigation"), B1 = de()({
  name: "VBottomNavigation",
  props: M1(),
  emits: {
    "update:active": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = qf(), {
      borderClasses: i
    } = Qn(e), {
      backgroundColorClasses: l,
      backgroundColorStyles: a
    } = Dt(se(e, "bgColor")), {
      densityClasses: s
    } = tn(e), {
      elevationClasses: r
    } = In(e), {
      roundedClasses: d
    } = Ct(e), {
      ssrBootStyles: c
    } = el(), f = p(() => Number(e.height) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0)), m = Ye(e, "active", e.active), {
      layoutItemStyles: h
    } = Xf({
      id: e.name,
      order: p(() => parseInt(e.order, 10)),
      position: p(() => "bottom"),
      layoutSize: p(() => m.value ? f.value : 0),
      elementSize: f,
      active: m,
      absolute: se(e, "absolute")
    });
    return Xi(e, br), Jn({
      VBtn: {
        baseColor: se(e, "baseColor"),
        color: se(e, "color"),
        density: se(e, "density"),
        stacked: p(() => e.mode !== "horizontal"),
        variant: "text"
      }
    }, {
      scoped: !0
    }), Se(() => u(e.tag, {
      class: ["v-bottom-navigation", {
        "v-bottom-navigation--active": m.value,
        "v-bottom-navigation--grow": e.grow,
        "v-bottom-navigation--shift": e.mode === "shift"
      }, o.value, l.value, i.value, s.value, r.value, d.value, e.class],
      style: [a.value, h.value, {
        height: pe(f.value)
      }, c.value, e.style]
    }, {
      default: () => [n.default && u("div", {
        class: "v-bottom-navigation__content"
      }, [n.default()])]
    })), {};
  }
}), F1 = W({
  inset: Boolean,
  ...nv({
    transition: "bottom-sheet-transition"
  })
}, "VBottomSheet"), bo = de()({
  name: "VBottomSheet",
  props: F1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ye(e, "modelValue");
    return Se(() => {
      const i = En.filterProps(e);
      return u(En, be(i, {
        contentClass: ["v-bottom-sheet__content", e.contentClass],
        modelValue: o.value,
        "onUpdate:modelValue": (l) => o.value = l,
        class: ["v-bottom-sheet", {
          "v-bottom-sheet--inset": e.inset
        }, e.class],
        style: e.style
      }), n);
    }), {};
  }
}), L1 = W({
  scrollable: Boolean,
  ...Ae(),
  ...Dn(),
  ...Ze({
    tag: "main"
  })
}, "VMain"), R1 = de()({
  name: "VMain",
  props: L1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      dimensionStyles: o
    } = $n(e), {
      mainStyles: i
    } = Yf(), {
      ssrBootStyles: l
    } = el();
    return Se(() => u(e.tag, {
      class: ["v-main", {
        "v-main--scrollable": e.scrollable
      }, e.class],
      style: [i.value, l.value, o.value, e.style]
    }, {
      default: () => {
        var a, s;
        return [e.scrollable ? u("div", {
          class: "v-main__scroller"
        }, [(a = n.default) == null ? void 0 : a.call(n)]) : (s = n.default) == null ? void 0 : s.call(n)];
      }
    })), {};
  }
}), _v = Symbol.for("vuetify:selection-control-group"), wv = W({
  color: String,
  disabled: {
    type: Boolean,
    default: null
  },
  defaultsTarget: String,
  error: Boolean,
  id: String,
  inline: Boolean,
  falseIcon: ze,
  trueIcon: ze,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  multiple: {
    type: Boolean,
    default: null
  },
  name: String,
  readonly: {
    type: Boolean,
    default: null
  },
  modelValue: null,
  type: String,
  valueComparator: {
    type: Function,
    default: ai
  },
  ...Ae(),
  ...Kt(),
  ...nt()
}, "SelectionControlGroup"), H1 = W({
  ...wv({
    defaultsTarget: "VSelectionControl"
  })
}, "VSelectionControlGroup");
de()({
  name: "VSelectionControlGroup",
  props: H1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ye(e, "modelValue"), i = gn(), l = p(() => e.id || `v-selection-control-group-${i}`), a = p(() => e.name || l.value), s = /* @__PURE__ */ new Set();
    return ht(_v, {
      modelValue: o,
      forceUpdate: () => {
        s.forEach((r) => r());
      },
      onForceUpdate: (r) => {
        s.add(r), At(() => {
          s.delete(r);
        });
      }
    }), Jn({
      [e.defaultsTarget]: {
        color: se(e, "color"),
        disabled: se(e, "disabled"),
        density: se(e, "density"),
        error: se(e, "error"),
        inline: se(e, "inline"),
        modelValue: o,
        multiple: p(() => !!e.multiple || e.multiple == null && Array.isArray(o.value)),
        name: a,
        falseIcon: se(e, "falseIcon"),
        trueIcon: se(e, "trueIcon"),
        readonly: se(e, "readonly"),
        ripple: se(e, "ripple"),
        type: se(e, "type"),
        valueComparator: se(e, "valueComparator")
      }
    }), Se(() => {
      var r;
      return u("div", {
        class: ["v-selection-control-group", {
          "v-selection-control-group--inline": e.inline
        }, e.class],
        style: e.style,
        role: e.type === "radio" ? "radiogroup" : void 0
      }, [(r = n.default) == null ? void 0 : r.call(n)]);
    }), {};
  }
});
const kv = W({
  label: String,
  baseColor: String,
  trueValue: null,
  falseValue: null,
  value: null,
  ...Ae(),
  ...wv()
}, "VSelectionControl");
function j1(e) {
  const t = Ge(_v, void 0), {
    densityClasses: n
  } = tn(e), o = Ye(e, "modelValue"), i = p(() => e.trueValue !== void 0 ? e.trueValue : e.value !== void 0 ? e.value : !0), l = p(() => e.falseValue !== void 0 ? e.falseValue : !1), a = p(() => !!e.multiple || e.multiple == null && Array.isArray(o.value)), s = p({
    get() {
      const h = t ? t.modelValue.value : o.value;
      return a.value ? cn(h).some((v) => e.valueComparator(v, i.value)) : e.valueComparator(h, i.value);
    },
    set(h) {
      if (e.readonly) return;
      const v = h ? i.value : l.value;
      let g = v;
      a.value && (g = h ? [...cn(o.value), v] : cn(o.value).filter((y) => !e.valueComparator(y, i.value))), t ? t.modelValue.value = g : o.value = g;
    }
  }), {
    textColorClasses: r,
    textColorStyles: d
  } = qt(p(() => {
    if (!(e.error || e.disabled))
      return s.value ? e.color : e.baseColor;
  })), {
    backgroundColorClasses: c,
    backgroundColorStyles: f
  } = Dt(p(() => s.value && !e.error && !e.disabled ? e.color : e.baseColor)), m = p(() => s.value ? e.trueIcon : e.falseIcon);
  return {
    group: t,
    densityClasses: n,
    trueValue: i,
    falseValue: l,
    model: s,
    textColorClasses: r,
    textColorStyles: d,
    backgroundColorClasses: c,
    backgroundColorStyles: f,
    icon: m
  };
}
const Bc = de()({
  name: "VSelectionControl",
  directives: {
    Ripple: ci
  },
  inheritAttrs: !1,
  props: kv(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      group: i,
      densityClasses: l,
      icon: a,
      model: s,
      textColorClasses: r,
      textColorStyles: d,
      backgroundColorClasses: c,
      backgroundColorStyles: f,
      trueValue: m
    } = j1(e), h = gn(), v = he(!1), g = he(!1), y = ie(), w = p(() => e.id || `input-${h}`), E = p(() => !e.disabled && !e.readonly);
    i == null || i.onForceUpdate(() => {
      y.value && (y.value.checked = s.value);
    });
    function A(I) {
      E.value && (v.value = !0, jl(I.target, ":focus-visible") !== !1 && (g.value = !0));
    }
    function P() {
      v.value = !1, g.value = !1;
    }
    function C(I) {
      I.stopPropagation();
    }
    function x(I) {
      if (!E.value) {
        y.value && (y.value.checked = s.value);
        return;
      }
      e.readonly && i && ot(() => i.forceUpdate()), s.value = I.target.checked;
    }
    return Se(() => {
      var O, k;
      const I = o.label ? o.label({
        label: e.label,
        props: {
          for: w.value
        }
      }) : e.label, [N, T] = rr(n), $ = u("input", be({
        ref: y,
        checked: s.value,
        disabled: !!e.disabled,
        id: w.value,
        onBlur: P,
        onFocus: A,
        onInput: x,
        "aria-disabled": !!e.disabled,
        "aria-label": e.label,
        type: e.type,
        value: m.value,
        name: e.name,
        "aria-checked": e.type === "checkbox" ? s.value : void 0
      }, T), null);
      return u("div", be({
        class: ["v-selection-control", {
          "v-selection-control--dirty": s.value,
          "v-selection-control--disabled": e.disabled,
          "v-selection-control--error": e.error,
          "v-selection-control--focused": v.value,
          "v-selection-control--focus-visible": g.value,
          "v-selection-control--inline": e.inline
        }, l.value, e.class]
      }, N, {
        style: e.style
      }), [u("div", {
        class: ["v-selection-control__wrapper", r.value],
        style: d.value
      }, [(O = o.default) == null ? void 0 : O.call(o, {
        backgroundColorClasses: c,
        backgroundColorStyles: f
      }), lt(u("div", {
        class: ["v-selection-control__input"]
      }, [((k = o.input) == null ? void 0 : k.call(o, {
        model: s,
        textColorClasses: r,
        textColorStyles: d,
        backgroundColorClasses: c,
        backgroundColorStyles: f,
        inputNode: $,
        icon: a.value,
        props: {
          onFocus: A,
          onBlur: P,
          id: w.value
        }
      })) ?? u(Ee, null, [a.value && u(De, {
        key: "icon",
        icon: a.value
      }, null), $])]), [[Nn("ripple"), e.ripple && [!e.disabled && !e.readonly, null, ["center", "circle"]]]])]), I && u(Or, {
        for: w.value,
        onClick: C
      }, {
        default: () => [I]
      })]);
    }), {
      isFocused: v,
      input: y
    };
  }
}), z1 = W({
  indeterminate: Boolean,
  indeterminateIcon: {
    type: ze,
    default: "$checkboxIndeterminate"
  },
  ...kv({
    falseIcon: "$checkboxOff",
    trueIcon: "$checkboxOn"
  })
}, "VCheckboxBtn"), U1 = de()({
  name: "VCheckboxBtn",
  props: z1(),
  emits: {
    "update:modelValue": (e) => !0,
    "update:indeterminate": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ye(e, "indeterminate"), i = Ye(e, "modelValue");
    function l(r) {
      o.value && (o.value = !1);
    }
    const a = p(() => o.value ? e.indeterminateIcon : e.falseIcon), s = p(() => o.value ? e.indeterminateIcon : e.trueIcon);
    return Se(() => {
      const r = Xn(Bc.filterProps(e), ["modelValue"]);
      return u(Bc, be(r, {
        modelValue: i.value,
        "onUpdate:modelValue": [(d) => i.value = d, l],
        class: ["v-checkbox-btn", e.class],
        style: e.style,
        type: "checkbox",
        falseIcon: a.value,
        trueIcon: s.value,
        "aria-checked": o.value ? "mixed" : void 0
      }), n);
    }), {};
  }
}), Sv = Symbol.for("vuetify:v-chip-group"), W1 = W({
  column: Boolean,
  filter: Boolean,
  valueComparator: {
    type: Function,
    default: ai
  },
  ...$r(),
  ...Ae(),
  ...ha({
    selectedClass: "v-chip--selected"
  }),
  ...Ze(),
  ...nt(),
  ...Pn({
    variant: "tonal"
  })
}, "VChipGroup");
de()({
  name: "VChipGroup",
  props: W1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = ct(e), {
      isSelected: i,
      select: l,
      next: a,
      prev: s,
      selected: r
    } = Xi(e, Sv);
    return Jn({
      VChip: {
        color: se(e, "color"),
        disabled: se(e, "disabled"),
        filter: se(e, "filter"),
        variant: se(e, "variant")
      }
    }), Se(() => {
      const d = Jl.filterProps(e);
      return u(Jl, be(d, {
        class: ["v-chip-group", {
          "v-chip-group--column": e.column
        }, o.value, e.class],
        style: e.style
      }), {
        default: () => {
          var c;
          return [(c = n.default) == null ? void 0 : c.call(n, {
            isSelected: i,
            select: l,
            next: a,
            prev: s,
            selected: r.value
          })];
        }
      });
    }), {};
  }
});
const q1 = W({
  activeClass: String,
  appendAvatar: String,
  appendIcon: ze,
  closable: Boolean,
  closeIcon: {
    type: ze,
    default: "$delete"
  },
  closeLabel: {
    type: String,
    default: "$vuetify.close"
  },
  draggable: Boolean,
  filter: Boolean,
  filterIcon: {
    type: String,
    default: "$complete"
  },
  label: Boolean,
  link: {
    type: Boolean,
    default: void 0
  },
  pill: Boolean,
  prependAvatar: String,
  prependIcon: ze,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  text: String,
  modelValue: {
    type: Boolean,
    default: !0
  },
  onClick: Pt(),
  onClickOnce: Pt(),
  ...Zn(),
  ...Ae(),
  ...Kt(),
  ...An(),
  ...yr(),
  ...St(),
  ...ba(),
  ...Ji(),
  ...Ze({
    tag: "span"
  }),
  ...nt(),
  ...Pn({
    variant: "tonal"
  })
}, "VChip"), K1 = de()({
  name: "VChip",
  directives: {
    Ripple: ci
  },
  props: q1(),
  emits: {
    "click:close": (e) => !0,
    "update:modelValue": (e) => !0,
    "group:selected": (e) => !0,
    click: (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      emit: o,
      slots: i
    } = t;
    const {
      t: l
    } = ri(), {
      borderClasses: a
    } = Qn(e), {
      colorClasses: s,
      colorStyles: r,
      variantClasses: d
    } = Ho(e), {
      densityClasses: c
    } = tn(e), {
      elevationClasses: f
    } = In(e), {
      roundedClasses: m
    } = Ct(e), {
      sizeClasses: h
    } = Zi(e), {
      themeClasses: v
    } = ct(e), g = Ye(e, "modelValue"), y = pr(e, Sv, !1), w = pa(e, n), E = p(() => e.link !== !1 && w.isLink.value), A = p(() => !e.disabled && e.link !== !1 && (!!y || e.link || w.isClickable.value)), P = p(() => ({
      "aria-label": l(e.closeLabel),
      onClick(I) {
        I.preventDefault(), I.stopPropagation(), g.value = !1, o("click:close", I);
      }
    }));
    function C(I) {
      var N;
      o("click", I), A.value && ((N = w.navigate) == null || N.call(w, I), y == null || y.toggle());
    }
    function x(I) {
      (I.key === "Enter" || I.key === " ") && (I.preventDefault(), C(I));
    }
    return () => {
      const I = w.isLink.value ? "a" : e.tag, N = !!(e.appendIcon || e.appendAvatar), T = !!(N || i.append), $ = !!(i.close || e.closable), O = !!(i.filter || e.filter) && y, k = !!(e.prependIcon || e.prependAvatar), D = !!(k || i.prepend), R = !y || y.isSelected.value;
      return g.value && lt(u(I, be({
        class: ["v-chip", {
          "v-chip--disabled": e.disabled,
          "v-chip--label": e.label,
          "v-chip--link": A.value,
          "v-chip--filter": O,
          "v-chip--pill": e.pill
        }, v.value, a.value, R ? s.value : void 0, c.value, f.value, m.value, h.value, d.value, y == null ? void 0 : y.selectedClass.value, e.class],
        style: [R ? r.value : void 0, e.style],
        disabled: e.disabled || void 0,
        draggable: e.draggable,
        tabindex: A.value ? 0 : void 0,
        onClick: C,
        onKeydown: A.value && !E.value && x
      }, w.linkProps), {
        default: () => {
          var G;
          return [Ro(A.value, "v-chip"), O && u(bm, {
            key: "filter"
          }, {
            default: () => [lt(u("div", {
              class: "v-chip__filter"
            }, [i.filter ? u(tt, {
              key: "filter-defaults",
              disabled: !e.filterIcon,
              defaults: {
                VIcon: {
                  icon: e.filterIcon
                }
              }
            }, i.filter) : u(De, {
              key: "filter-icon",
              icon: e.filterIcon
            }, null)]), [[hn, y.isSelected.value]])]
          }), D && u("div", {
            key: "prepend",
            class: "v-chip__prepend"
          }, [i.prepend ? u(tt, {
            key: "prepend-defaults",
            disabled: !k,
            defaults: {
              VAvatar: {
                image: e.prependAvatar,
                start: !0
              },
              VIcon: {
                icon: e.prependIcon,
                start: !0
              }
            }
          }, i.prepend) : u(Ee, null, [e.prependIcon && u(De, {
            key: "prepend-icon",
            icon: e.prependIcon,
            start: !0
          }, null), e.prependAvatar && u(Ht, {
            key: "prepend-avatar",
            image: e.prependAvatar,
            start: !0
          }, null)])]), u("div", {
            class: "v-chip__content",
            "data-no-activator": ""
          }, [((G = i.default) == null ? void 0 : G.call(i, {
            isSelected: y == null ? void 0 : y.isSelected.value,
            selectedClass: y == null ? void 0 : y.selectedClass.value,
            select: y == null ? void 0 : y.select,
            toggle: y == null ? void 0 : y.toggle,
            value: y == null ? void 0 : y.value.value,
            disabled: e.disabled
          })) ?? e.text]), T && u("div", {
            key: "append",
            class: "v-chip__append"
          }, [i.append ? u(tt, {
            key: "append-defaults",
            disabled: !N,
            defaults: {
              VAvatar: {
                end: !0,
                image: e.appendAvatar
              },
              VIcon: {
                end: !0,
                icon: e.appendIcon
              }
            }
          }, i.append) : u(Ee, null, [e.appendIcon && u(De, {
            key: "append-icon",
            end: !0,
            icon: e.appendIcon
          }, null), e.appendAvatar && u(Ht, {
            key: "append-avatar",
            end: !0,
            image: e.appendAvatar
          }, null)])]), $ && u("button", be({
            key: "close",
            class: "v-chip__close",
            type: "button",
            "data-testid": "close-chip"
          }, P.value), [i.close ? u(tt, {
            key: "close-defaults",
            defaults: {
              VIcon: {
                icon: e.closeIcon,
                size: "x-small"
              }
            }
          }, i.close) : u(De, {
            key: "close-icon",
            icon: e.closeIcon,
            size: "x-small"
          }, null)])];
        }
      }), [[Nn("ripple"), A.value && e.ripple, null]]);
    };
  }
}), G1 = W({
  // TODO
  // disableKeys: Boolean,
  id: String,
  submenu: Boolean,
  ...Xn(Sa({
    closeDelay: 250,
    closeOnContentClick: !0,
    locationStrategy: "connected",
    location: void 0,
    openDelay: 300,
    scrim: !1,
    scrollStrategy: "reposition",
    transition: {
      component: Er
    }
  }), ["absolute"])
}, "VMenu"), Y1 = de()({
  name: "VMenu",
  props: G1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ye(e, "modelValue"), {
      scopeId: i
    } = nl(), {
      isRtl: l
    } = $t(), a = gn(), s = p(() => e.id || `v-menu-${a}`), r = ie(), d = Ge(Ns, null), c = he(/* @__PURE__ */ new Set());
    ht(Ns, {
      register() {
        c.value.add(a);
      },
      unregister() {
        c.value.delete(a);
      },
      closeParents(y) {
        setTimeout(() => {
          var w;
          !c.value.size && !e.persistent && (y == null || (w = r.value) != null && w.contentEl && !Xy(y, r.value.contentEl)) && (o.value = !1, d == null || d.closeParents());
        }, 40);
      }
    }), pt(() => {
      d == null || d.unregister(), document.removeEventListener("focusin", f);
    }), Ks(() => o.value = !1);
    async function f(y) {
      var A, P, C;
      const w = y.relatedTarget, E = y.target;
      await ot(), o.value && w !== E && ((A = r.value) != null && A.contentEl) && // We're the topmost menu
      ((P = r.value) != null && P.globalTop) && // It isn't the document or the menu body
      ![document, r.value.contentEl].includes(E) && // It isn't inside the menu body
      !r.value.contentEl.contains(E) && ((C = Pi(r.value.contentEl)[0]) == null || C.focus());
    }
    ge(o, (y) => {
      y ? (d == null || d.register(), je && document.addEventListener("focusin", f, {
        once: !0
      })) : (d == null || d.unregister(), je && document.removeEventListener("focusin", f));
    }, {
      immediate: !0
    });
    function m(y) {
      d == null || d.closeParents(y);
    }
    function h(y) {
      var w, E, A, P, C;
      if (!e.disabled)
        if (y.key === "Tab" || y.key === "Enter" && !e.closeOnContentClick) {
          if (y.key === "Enter" && (y.target instanceof HTMLTextAreaElement || y.target instanceof HTMLInputElement && y.target.closest("form"))) return;
          y.key === "Enter" && y.preventDefault(), Cf(Pi((w = r.value) == null ? void 0 : w.contentEl, !1), y.shiftKey ? "prev" : "next", (I) => I.tabIndex >= 0) || (o.value = !1, (A = (E = r.value) == null ? void 0 : E.activatorEl) == null || A.focus());
        } else e.submenu && y.key === (l.value ? "ArrowRight" : "ArrowLeft") && (o.value = !1, (C = (P = r.value) == null ? void 0 : P.activatorEl) == null || C.focus());
    }
    function v(y) {
      var E;
      if (e.disabled) return;
      const w = (E = r.value) == null ? void 0 : E.contentEl;
      w && o.value ? y.key === "ArrowDown" ? (y.preventDefault(), y.stopImmediatePropagation(), Ei(w, "next")) : y.key === "ArrowUp" ? (y.preventDefault(), y.stopImmediatePropagation(), Ei(w, "prev")) : e.submenu && (y.key === (l.value ? "ArrowRight" : "ArrowLeft") ? o.value = !1 : y.key === (l.value ? "ArrowLeft" : "ArrowRight") && (y.preventDefault(), Ei(w, "first"))) : (e.submenu ? y.key === (l.value ? "ArrowLeft" : "ArrowRight") : ["ArrowDown", "ArrowUp"].includes(y.key)) && (o.value = !0, y.preventDefault(), setTimeout(() => setTimeout(() => v(y))));
    }
    const g = p(() => be({
      "aria-haspopup": "menu",
      "aria-expanded": String(o.value),
      "aria-owns": s.value,
      onKeydown: v
    }, e.activatorProps));
    return Se(() => {
      const y = Fo.filterProps(e);
      return u(Fo, be({
        ref: r,
        id: s.value,
        class: ["v-menu", e.class],
        style: e.style
      }, y, {
        modelValue: o.value,
        "onUpdate:modelValue": (w) => o.value = w,
        absolute: !0,
        activatorProps: g.value,
        location: e.location ?? (e.submenu ? "end" : "bottom"),
        "onClick:outside": m,
        onKeydown: h
      }, i), {
        activator: n.activator,
        default: function() {
          for (var w = arguments.length, E = new Array(w), A = 0; A < w; A++)
            E[A] = arguments[A];
          return u(tt, {
            root: "VMenu"
          }, {
            default: () => {
              var P;
              return [(P = n.default) == null ? void 0 : P.call(n, ...E)];
            }
          });
        }
      });
    }), fo({
      id: s,
      ΨopenChildren: c
    }, r);
  }
}), X1 = W({
  renderless: Boolean,
  ...Ae()
}, "VVirtualScrollItem"), J1 = de()({
  name: "VVirtualScrollItem",
  inheritAttrs: !1,
  props: X1(),
  emits: {
    "update:height": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      emit: o,
      slots: i
    } = t;
    const {
      resizeRef: l,
      contentRect: a
    } = ni(void 0, "border");
    ge(() => {
      var s;
      return (s = a.value) == null ? void 0 : s.height;
    }, (s) => {
      s != null && o("update:height", s);
    }), Se(() => {
      var s, r;
      return e.renderless ? u(Ee, null, [(s = i.default) == null ? void 0 : s.call(i, {
        itemRef: l
      })]) : u("div", be({
        ref: l,
        class: ["v-virtual-scroll__item", e.class],
        style: e.style
      }, n), [(r = i.default) == null ? void 0 : r.call(i)]);
    });
  }
}), Z1 = -1, Q1 = 1, Ya = 100, ek = W({
  itemHeight: {
    type: [Number, String],
    default: null
  },
  height: [Number, String]
}, "virtual");
function tk(e, t) {
  const n = vr(), o = he(0);
  Ut(() => {
    o.value = parseFloat(e.itemHeight || 0);
  });
  const i = he(0), l = he(Math.ceil(
    // Assume 16px items filling the entire screen height if
    // not provided. This is probably incorrect but it minimises
    // the chance of ending up with empty space at the bottom.
    // The default value is set here to avoid poisoning getSize()
    (parseInt(e.height) || n.height.value) / (o.value || 16)
  ) || 1), a = he(0), s = he(0), r = ie(), d = ie();
  let c = 0;
  const {
    resizeRef: f,
    contentRect: m
  } = ni();
  Ut(() => {
    f.value = r.value;
  });
  const h = p(() => {
    var B;
    return r.value === document.documentElement ? n.height.value : ((B = m.value) == null ? void 0 : B.height) || parseInt(e.height) || 0;
  }), v = p(() => !!(r.value && d.value && h.value && o.value));
  let g = Array.from({
    length: t.value.length
  }), y = Array.from({
    length: t.value.length
  });
  const w = he(0);
  let E = -1;
  function A(B) {
    return g[B] || o.value;
  }
  const P = Ky(() => {
    const B = performance.now();
    y[0] = 0;
    const M = t.value.length;
    for (let H = 1; H <= M - 1; H++)
      y[H] = (y[H - 1] || 0) + A(H - 1);
    w.value = Math.max(w.value, performance.now() - B);
  }, w), C = ge(v, (B) => {
    B && (C(), c = d.value.offsetTop, P.immediate(), G(), ~E && ot(() => {
      je && window.requestAnimationFrame(() => {
        oe(E), E = -1;
      });
    }));
  });
  At(() => {
    P.clear();
  });
  function x(B, M) {
    const H = g[B], K = o.value;
    o.value = K ? Math.min(o.value, M) : M, (H !== M || K !== o.value) && (g[B] = M, P());
  }
  function I(B) {
    return B = zt(B, 0, t.value.length - 1), y[B] || 0;
  }
  function N(B) {
    return nk(y, B);
  }
  let T = 0, $ = 0, O = 0;
  ge(h, (B, M) => {
    M && (G(), B < M && requestAnimationFrame(() => {
      $ = 0, G();
    }));
  });
  function k() {
    if (!r.value || !d.value) return;
    const B = r.value.scrollTop, M = performance.now();
    M - O > 500 ? ($ = Math.sign(B - T), c = d.value.offsetTop) : $ = B - T, T = B, O = M, G();
  }
  function D() {
    !r.value || !d.value || ($ = 0, O = 0, G());
  }
  let R = -1;
  function G() {
    cancelAnimationFrame(R), R = requestAnimationFrame(re);
  }
  function re() {
    if (!r.value || !h.value) return;
    const B = T - c, M = Math.sign($), H = Math.max(0, B - Ya), K = zt(N(H), 0, t.value.length), Ne = B + h.value + Ya, we = zt(N(Ne) + 1, K + 1, t.value.length);
    if (
      // Only update the side we're scrolling towards,
      // the other side will be updated incidentally
      (M !== Z1 || K < i.value) && (M !== Q1 || we > l.value)
    ) {
      const Ie = I(i.value) - I(K), J = I(we) - I(l.value);
      Math.max(Ie, J) > Ya ? (i.value = K, l.value = we) : (K <= 0 && (i.value = K), we >= t.value.length && (l.value = we));
    }
    a.value = I(i.value), s.value = I(t.value.length) - I(l.value);
  }
  function oe(B) {
    const M = I(B);
    !r.value || B && !M ? E = B : r.value.scrollTop = M;
  }
  const ee = p(() => t.value.slice(i.value, l.value).map((B, M) => ({
    raw: B,
    index: M + i.value
  })));
  return ge(t, () => {
    g = Array.from({
      length: t.value.length
    }), y = Array.from({
      length: t.value.length
    }), P.immediate(), G();
  }, {
    deep: !0
  }), {
    calculateVisibleItems: G,
    containerRef: r,
    markerRef: d,
    computedItems: ee,
    paddingTop: a,
    paddingBottom: s,
    scrollToIndex: oe,
    handleScroll: k,
    handleScrollend: D,
    handleItemResize: x
  };
}
function nk(e, t) {
  let n = e.length - 1, o = 0, i = 0, l = null, a = -1;
  if (e[n] < t)
    return n;
  for (; o <= n; )
    if (i = o + n >> 1, l = e[i], l > t)
      n = i - 1;
    else if (l < t)
      a = i, o = i + 1;
    else return l === t ? i : o;
  return a;
}
const ok = W({
  items: {
    type: Array,
    default: () => []
  },
  renderless: Boolean,
  ...ek(),
  ...Ae(),
  ...Dn()
}, "VVirtualScroll"), ik = de()({
  name: "VVirtualScroll",
  props: ok(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = at("VVirtualScroll"), {
      dimensionStyles: i
    } = $n(e), {
      calculateVisibleItems: l,
      containerRef: a,
      markerRef: s,
      handleScroll: r,
      handleScrollend: d,
      handleItemResize: c,
      scrollToIndex: f,
      paddingTop: m,
      paddingBottom: h,
      computedItems: v
    } = tk(e, se(e, "items"));
    return Wn(() => e.renderless, () => {
      function g() {
        var E, A;
        const w = (arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !1) ? "addEventListener" : "removeEventListener";
        a.value === document.documentElement ? (document[w]("scroll", r, {
          passive: !0
        }), document[w]("scrollend", d)) : ((E = a.value) == null || E[w]("scroll", r, {
          passive: !0
        }), (A = a.value) == null || A[w]("scrollend", d));
      }
      vn(() => {
        a.value = $f(o.vnode.el, !0), g(!0);
      }), At(g);
    }), Se(() => {
      const g = v.value.map((y) => u(J1, {
        key: y.index,
        renderless: e.renderless,
        "onUpdate:height": (w) => c(y.index, w)
      }, {
        default: (w) => {
          var E;
          return (E = n.default) == null ? void 0 : E.call(n, {
            item: y.raw,
            index: y.index,
            ...w
          });
        }
      }));
      return e.renderless ? u(Ee, null, [u("div", {
        ref: s,
        class: "v-virtual-scroll__spacer",
        style: {
          paddingTop: pe(m.value)
        }
      }, null), g, u("div", {
        class: "v-virtual-scroll__spacer",
        style: {
          paddingBottom: pe(h.value)
        }
      }, null)]) : u("div", {
        ref: a,
        class: ["v-virtual-scroll", e.class],
        onScrollPassive: r,
        onScrollend: d,
        style: [i.value, e.style]
      }, [u("div", {
        ref: s,
        class: "v-virtual-scroll__container",
        style: {
          paddingTop: pe(m.value),
          paddingBottom: pe(h.value)
        }
      }, [g])]);
    }), {
      calculateVisibleItems: l,
      scrollToIndex: f
    };
  }
});
function lk(e, t) {
  const n = he(!1);
  let o;
  function i(s) {
    cancelAnimationFrame(o), n.value = !0, o = requestAnimationFrame(() => {
      o = requestAnimationFrame(() => {
        n.value = !1;
      });
    });
  }
  async function l() {
    await new Promise((s) => requestAnimationFrame(s)), await new Promise((s) => requestAnimationFrame(s)), await new Promise((s) => requestAnimationFrame(s)), await new Promise((s) => {
      if (n.value) {
        const r = ge(n, () => {
          r(), s();
        });
      } else s();
    });
  }
  async function a(s) {
    var c, f;
    if (s.key === "Tab" && ((c = t.value) == null || c.focus()), !["PageDown", "PageUp", "Home", "End"].includes(s.key)) return;
    const r = (f = e.value) == null ? void 0 : f.$el;
    if (!r) return;
    (s.key === "Home" || s.key === "End") && r.scrollTo({
      top: s.key === "Home" ? 0 : r.scrollHeight,
      behavior: "smooth"
    }), await l();
    const d = r.querySelectorAll(":scope > :not(.v-virtual-scroll__spacer)");
    if (s.key === "PageDown" || s.key === "Home") {
      const m = r.getBoundingClientRect().top;
      for (const h of d)
        if (h.getBoundingClientRect().top >= m) {
          h.focus();
          break;
        }
    } else {
      const m = r.getBoundingClientRect().bottom;
      for (const h of [...d].reverse())
        if (h.getBoundingClientRect().bottom <= m) {
          h.focus();
          break;
        }
    }
  }
  return {
    onScrollPassive: i,
    onKeydown: a
  };
}
const ak = W({
  chips: Boolean,
  closableChips: Boolean,
  closeText: {
    type: String,
    default: "$vuetify.close"
  },
  openText: {
    type: String,
    default: "$vuetify.open"
  },
  eager: Boolean,
  hideNoData: Boolean,
  hideSelected: Boolean,
  listProps: {
    type: Object
  },
  menu: Boolean,
  menuIcon: {
    type: ze,
    default: "$dropdown"
  },
  menuProps: {
    type: Object
  },
  multiple: Boolean,
  noDataText: {
    type: String,
    default: "$vuetify.noDataText"
  },
  openOnClear: Boolean,
  itemColor: String,
  ...Nm({
    itemChildren: !1
  })
}, "Select"), sk = W({
  ...ak(),
  ...Xn(Km({
    modelValue: null,
    role: "combobox"
  }), ["validationValue", "dirty", "appendInnerIcon"]),
  ...di({
    transition: {
      component: Er
    }
  })
}, "VSelect"), rk = de()({
  name: "VSelect",
  props: sk(),
  emits: {
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0,
    "update:menu": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      t: o
    } = ri(), i = ie(), l = ie(), a = ie(), s = Ye(e, "menu"), r = p({
      get: () => s.value,
      set: (B) => {
        var M;
        s.value && !B && ((M = l.value) != null && M.ΨopenChildren.size) || (s.value = B);
      }
    }), {
      items: d,
      transformIn: c,
      transformOut: f
    } = U_(e), m = Ye(e, "modelValue", [], (B) => c(B === null ? [null] : cn(B)), (B) => {
      const M = f(B);
      return e.multiple ? M : M[0] ?? null;
    }), h = p(() => typeof e.counterValue == "function" ? e.counterValue(m.value) : typeof e.counterValue == "number" ? e.counterValue : m.value.length), v = qm(), g = p(() => m.value.map((B) => B.value)), y = he(!1), w = p(() => r.value ? e.closeText : e.openText);
    let E = "", A;
    const P = p(() => e.hideSelected ? d.value.filter((B) => !m.value.some((M) => e.valueComparator(M, B))) : d.value), C = p(() => e.hideNoData && !P.value.length || e.readonly || (v == null ? void 0 : v.isReadonly.value)), x = p(() => {
      var B;
      return {
        ...e.menuProps,
        activatorProps: {
          ...((B = e.menuProps) == null ? void 0 : B.activatorProps) || {},
          "aria-haspopup": "listbox"
          // Set aria-haspopup to 'listbox'
        }
      };
    }), I = ie(), N = lk(I, i);
    function T(B) {
      e.openOnClear && (r.value = !0);
    }
    function $() {
      C.value || (r.value = !r.value);
    }
    function O(B) {
      Hu(B) && k(B);
    }
    function k(B) {
      var Ne, we;
      if (!B.key || e.readonly || v != null && v.isReadonly.value) return;
      ["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(B.key) && B.preventDefault(), ["Enter", "ArrowDown", " "].includes(B.key) && (r.value = !0), ["Escape", "Tab"].includes(B.key) && (r.value = !1), B.key === "Home" ? (Ne = I.value) == null || Ne.focus("first") : B.key === "End" && ((we = I.value) == null || we.focus("last"));
      const M = 1e3;
      if (e.multiple || !Hu(B)) return;
      const H = performance.now();
      H - A > M && (E = ""), E += B.key.toLowerCase(), A = H;
      const K = d.value.find((Ie) => Ie.title.toLowerCase().startsWith(E));
      if (K !== void 0) {
        m.value = [K];
        const Ie = P.value.indexOf(K);
        je && window.requestAnimationFrame(() => {
          var J;
          Ie >= 0 && ((J = a.value) == null || J.scrollToIndex(Ie));
        });
      }
    }
    function D(B) {
      let M = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0;
      if (!B.props.disabled)
        if (e.multiple) {
          const H = m.value.findIndex((Ne) => e.valueComparator(Ne.value, B.value)), K = M ?? !~H;
          if (~H) {
            const Ne = K ? [...m.value, B] : [...m.value];
            Ne.splice(H, 1), m.value = Ne;
          } else K && (m.value = [...m.value, B]);
        } else {
          const H = M !== !1;
          m.value = H ? [B] : [], ot(() => {
            r.value = !1;
          });
        }
    }
    function R(B) {
      var M;
      (M = I.value) != null && M.$el.contains(B.relatedTarget) || (r.value = !1);
    }
    function G() {
      var B;
      e.eager && ((B = a.value) == null || B.calculateVisibleItems());
    }
    function re() {
      var B;
      y.value && ((B = i.value) == null || B.focus());
    }
    function oe(B) {
      y.value = !0;
    }
    function ee(B) {
      if (B == null) m.value = [];
      else if (jl(i.value, ":autofill") || jl(i.value, ":-webkit-autofill")) {
        const M = d.value.find((H) => H.title === B);
        M && D(M);
      } else i.value && (i.value.value = "");
    }
    return ge(r, () => {
      if (!e.hideSelected && r.value && m.value.length) {
        const B = P.value.findIndex((M) => m.value.some((H) => e.valueComparator(H.value, M.value)));
        je && window.requestAnimationFrame(() => {
          var M;
          B >= 0 && ((M = a.value) == null || M.scrollToIndex(B));
        });
      }
    }), ge(() => e.items, (B, M) => {
      r.value || y.value && !M.length && B.length && (r.value = !0);
    }), Se(() => {
      const B = !!(e.chips || n.chip), M = !!(!e.hideNoData || P.value.length || n["prepend-item"] || n["append-item"] || n["no-data"]), H = m.value.length > 0, K = Lt.filterProps(e), Ne = H || !y.value && e.label && !e.persistentPlaceholder ? void 0 : e.placeholder;
      return u(Lt, be({
        ref: i
      }, K, {
        modelValue: m.value.map((we) => we.props.value).join(", "),
        "onUpdate:modelValue": ee,
        focused: y.value,
        "onUpdate:focused": (we) => y.value = we,
        validationValue: m.externalValue,
        counterValue: h.value,
        dirty: H,
        class: ["v-select", {
          "v-select--active-menu": r.value,
          "v-select--chips": !!e.chips,
          [`v-select--${e.multiple ? "multiple" : "single"}`]: !0,
          "v-select--selected": m.value.length,
          "v-select--selection-slot": !!n.selection
        }, e.class],
        style: e.style,
        inputmode: "none",
        placeholder: Ne,
        "onClick:clear": T,
        "onMousedown:control": $,
        onBlur: R,
        onKeydown: k,
        "aria-label": o(w.value),
        title: o(w.value)
      }), {
        ...n,
        default: () => u(Ee, null, [u(Y1, be({
          ref: l,
          modelValue: r.value,
          "onUpdate:modelValue": (we) => r.value = we,
          activator: "parent",
          contentClass: "v-select__content",
          disabled: C.value,
          eager: e.eager,
          maxHeight: 310,
          openOnClick: !1,
          closeOnContentClick: !1,
          transition: e.transition,
          onAfterEnter: G,
          onAfterLeave: re
        }, x.value), {
          default: () => [M && u(dn, be({
            ref: I,
            selected: g.value,
            selectStrategy: e.multiple ? "independent" : "single-independent",
            onMousedown: (we) => we.preventDefault(),
            onKeydown: O,
            onFocusin: oe,
            tabindex: "-1",
            "aria-live": "polite",
            color: e.itemColor ?? e.color
          }, N, e.listProps), {
            default: () => {
              var we, Ie, J;
              return [(we = n["prepend-item"]) == null ? void 0 : we.call(n), !P.value.length && !e.hideNoData && (((Ie = n["no-data"]) == null ? void 0 : Ie.call(n)) ?? u(He, {
                title: o(e.noDataText)
              }, null)), u(ik, {
                ref: a,
                renderless: !0,
                items: P.value
              }, {
                default: (ke) => {
                  var nn;
                  let {
                    item: Pe,
                    index: Xe,
                    itemRef: Me
                  } = ke;
                  const Et = be(Pe.props, {
                    ref: Me,
                    key: Xe,
                    onClick: () => D(Pe, null)
                  });
                  return ((nn = n.item) == null ? void 0 : nn.call(n, {
                    item: Pe,
                    index: Xe,
                    props: Et
                  })) ?? u(He, be(Et, {
                    role: "option"
                  }), {
                    prepend: (yn) => {
                      let {
                        isSelected: b
                      } = yn;
                      return u(Ee, null, [e.multiple && !e.hideSelected ? u(U1, {
                        key: Pe.value,
                        modelValue: b,
                        ripple: !1,
                        tabindex: "-1"
                      }, null) : void 0, Pe.props.prependAvatar && u(Ht, {
                        image: Pe.props.prependAvatar
                      }, null), Pe.props.prependIcon && u(De, {
                        icon: Pe.props.prependIcon
                      }, null)]);
                    }
                  });
                }
              }), (J = n["append-item"]) == null ? void 0 : J.call(n)];
            }
          })]
        }), m.value.map((we, Ie) => {
          function J(Me) {
            Me.stopPropagation(), Me.preventDefault(), D(we, !1);
          }
          const ke = {
            "onClick:close": J,
            onKeydown(Me) {
              Me.key !== "Enter" && Me.key !== " " || (Me.preventDefault(), Me.stopPropagation(), J(Me));
            },
            onMousedown(Me) {
              Me.preventDefault(), Me.stopPropagation();
            },
            modelValue: !0,
            "onUpdate:modelValue": void 0
          }, Pe = B ? !!n.chip : !!n.selection, Xe = Pe ? Ef(B ? n.chip({
            item: we,
            index: Ie,
            props: ke
          }) : n.selection({
            item: we,
            index: Ie
          })) : void 0;
          if (!(Pe && !Xe))
            return u("div", {
              key: we.value,
              class: "v-select__selection"
            }, [B ? n.chip ? u(tt, {
              key: "chip-defaults",
              defaults: {
                VChip: {
                  closable: e.closableChips,
                  size: "small",
                  text: we.title
                }
              }
            }, {
              default: () => [Xe]
            }) : u(K1, be({
              key: "chip",
              closable: e.closableChips,
              size: "small",
              text: we.title,
              disabled: we.props.disabled
            }, ke), null) : Xe ?? u("span", {
              class: "v-select__selection-text"
            }, [we.title, e.multiple && Ie < m.value.length - 1 && u("span", {
              class: "v-select__selection-comma"
            }, [q(",")])])]);
        })]),
        "append-inner": function() {
          var ke;
          for (var we = arguments.length, Ie = new Array(we), J = 0; J < we; J++)
            Ie[J] = arguments[J];
          return u(Ee, null, [(ke = n["append-inner"]) == null ? void 0 : ke.call(n, ...Ie), e.menuIcon ? u(De, {
            class: "v-select__menu-icon",
            icon: e.menuIcon
          }, null) : void 0]);
        }
      });
    }), fo({
      isFocused: y,
      menu: r,
      select: D
    }, i);
  }
});
function uk(e) {
  const t = he(e());
  let n = -1;
  function o() {
    clearInterval(n);
  }
  function i() {
    o(), ot(() => t.value = e());
  }
  function l(a) {
    const s = a ? getComputedStyle(a) : {
      transitionDuration: 0.2
    }, r = parseFloat(s.transitionDuration) * 1e3 || 200;
    if (o(), t.value <= 0) return;
    const d = performance.now();
    n = window.setInterval(() => {
      const c = performance.now() - d + r;
      t.value = Math.max(e() - c, 0), t.value <= 0 && o();
    }, r);
  }
  return At(o), {
    clear: o,
    time: t,
    start: l,
    reset: i
  };
}
const ck = W({
  multiLine: Boolean,
  text: String,
  timer: [Boolean, String],
  timeout: {
    type: [Number, String],
    default: 5e3
  },
  vertical: Boolean,
  ...ui({
    location: "bottom"
  }),
  ...ga(),
  ...St(),
  ...Pn(),
  ...nt(),
  ...Xn(Sa({
    transition: "v-snackbar-transition"
  }), ["persistent", "noClickAnimation", "scrim", "scrollStrategy"])
}, "VSnackbar"), dk = de()({
  name: "VSnackbar",
  props: ck(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ye(e, "modelValue"), {
      positionClasses: i
    } = ya(e), {
      scopeId: l
    } = nl(), {
      themeClasses: a
    } = ct(e), {
      colorClasses: s,
      colorStyles: r,
      variantClasses: d
    } = Ho(e), {
      roundedClasses: c
    } = Ct(e), f = uk(() => Number(e.timeout)), m = ie(), h = ie(), v = he(!1), g = he(0), y = ie(), w = Ge(Bi, void 0);
    Wn(() => !!w, () => {
      const O = Yf();
      Ut(() => {
        y.value = O.mainStyles.value;
      });
    }), ge(o, A), ge(() => e.timeout, A), vn(() => {
      o.value && A();
    });
    let E = -1;
    function A() {
      f.reset(), window.clearTimeout(E);
      const O = Number(e.timeout);
      if (!o.value || O === -1) return;
      const k = ar(h.value);
      f.start(k), E = window.setTimeout(() => {
        o.value = !1;
      }, O);
    }
    function P() {
      f.reset(), window.clearTimeout(E);
    }
    function C() {
      v.value = !0, P();
    }
    function x() {
      v.value = !1, A();
    }
    function I(O) {
      g.value = O.touches[0].clientY;
    }
    function N(O) {
      Math.abs(g.value - O.changedTouches[0].clientY) > 50 && (o.value = !1);
    }
    function T() {
      v.value && x();
    }
    const $ = p(() => e.location.split(" ").reduce((O, k) => (O[`v-snackbar--${k}`] = !0, O), {}));
    return Se(() => {
      const O = Fo.filterProps(e), k = !!(n.default || n.text || e.text);
      return u(Fo, be({
        ref: m,
        class: ["v-snackbar", {
          "v-snackbar--active": o.value,
          "v-snackbar--multi-line": e.multiLine && !e.vertical,
          "v-snackbar--timer": !!e.timer,
          "v-snackbar--vertical": e.vertical
        }, $.value, i.value, e.class],
        style: [y.value, e.style]
      }, O, {
        modelValue: o.value,
        "onUpdate:modelValue": (D) => o.value = D,
        contentProps: be({
          class: ["v-snackbar__wrapper", a.value, s.value, c.value, d.value],
          style: [r.value],
          onPointerenter: C,
          onPointerleave: x
        }, O.contentProps),
        persistent: !0,
        noClickAnimation: !0,
        scrim: !1,
        scrollStrategy: "none",
        _disableGlobalStack: !0,
        onTouchstartPassive: I,
        onTouchend: N,
        onAfterLeave: T
      }, l), {
        default: () => {
          var D, R;
          return [Ro(!1, "v-snackbar"), e.timer && !v.value && u("div", {
            key: "timer",
            class: "v-snackbar__timer"
          }, [u(_r, {
            ref: h,
            color: typeof e.timer == "string" ? e.timer : "info",
            max: e.timeout,
            "model-value": f.time.value
          }, null)]), k && u("div", {
            key: "content",
            class: "v-snackbar__content",
            role: "status",
            "aria-live": "polite"
          }, [((D = n.text) == null ? void 0 : D.call(n)) ?? e.text, (R = n.default) == null ? void 0 : R.call(n)]), n.actions && u(tt, {
            defaults: {
              VBtn: {
                variant: "text",
                ripple: !1,
                slim: !0
              }
            }
          }, {
            default: () => [u("div", {
              class: "v-snackbar__actions"
            }, [n.actions({
              isActive: o
            })])]
          })];
        },
        activator: n.activator
      });
    }), fo({}, m);
  }
}), fk = W({
  autoGrow: Boolean,
  autofocus: Boolean,
  counter: [Boolean, Number, String],
  counterValue: Function,
  prefix: String,
  placeholder: String,
  persistentPlaceholder: Boolean,
  persistentCounter: Boolean,
  noResize: Boolean,
  rows: {
    type: [Number, String],
    default: 5,
    validator: (e) => !isNaN(parseFloat(e))
  },
  maxRows: {
    type: [Number, String],
    validator: (e) => !isNaN(parseFloat(e))
  },
  suffix: String,
  modelModifiers: Object,
  ...ka(),
  ...Ir()
}, "VTextarea"), mk = de()({
  name: "VTextarea",
  directives: {
    Intersect: Sr
  },
  inheritAttrs: !1,
  props: fk(),
  emits: {
    "click:control": (e) => !0,
    "mousedown:control": (e) => !0,
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      emit: o,
      slots: i
    } = t;
    const l = Ye(e, "modelValue"), {
      isFocused: a,
      focus: s,
      blur: r
    } = wa(e), d = p(() => typeof e.counterValue == "function" ? e.counterValue(l.value) : (l.value || "").toString().length), c = p(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    });
    function f(O, k) {
      var D, R;
      !e.autofocus || !O || (R = (D = k[0].target) == null ? void 0 : D.focus) == null || R.call(D);
    }
    const m = ie(), h = ie(), v = he(""), g = ie(), y = p(() => e.persistentPlaceholder || a.value || e.active);
    function w() {
      var O;
      g.value !== document.activeElement && ((O = g.value) == null || O.focus()), a.value || s();
    }
    function E(O) {
      w(), o("click:control", O);
    }
    function A(O) {
      o("mousedown:control", O);
    }
    function P(O) {
      O.stopPropagation(), w(), ot(() => {
        l.value = "", Sf(e["onClick:clear"], O);
      });
    }
    function C(O) {
      var D;
      const k = O.target;
      if (l.value = k.value, (D = e.modelModifiers) != null && D.trim) {
        const R = [k.selectionStart, k.selectionEnd];
        ot(() => {
          k.selectionStart = R[0], k.selectionEnd = R[1];
        });
      }
    }
    const x = ie(), I = ie(+e.rows), N = p(() => ["plain", "underlined"].includes(e.variant));
    Ut(() => {
      e.autoGrow || (I.value = +e.rows);
    });
    function T() {
      e.autoGrow && ot(() => {
        if (!x.value || !h.value) return;
        const O = getComputedStyle(x.value), k = getComputedStyle(h.value.$el), D = parseFloat(O.getPropertyValue("--v-field-padding-top")) + parseFloat(O.getPropertyValue("--v-input-padding-top")) + parseFloat(O.getPropertyValue("--v-field-padding-bottom")), R = x.value.scrollHeight, G = parseFloat(O.lineHeight), re = Math.max(parseFloat(e.rows) * G + D, parseFloat(k.getPropertyValue("--v-input-control-height"))), oe = parseFloat(e.maxRows) * G + D || 1 / 0, ee = zt(R ?? 0, re, oe);
        I.value = Math.floor((ee - D) / G), v.value = pe(ee);
      });
    }
    vn(T), ge(l, T), ge(() => e.rows, T), ge(() => e.maxRows, T), ge(() => e.density, T);
    let $;
    return ge(x, (O) => {
      O ? ($ = new ResizeObserver(T), $.observe(x.value)) : $ == null || $.disconnect();
    }), pt(() => {
      $ == null || $.disconnect();
    }), Se(() => {
      const O = !!(i.counter || e.counter || e.counterValue), k = !!(O || i.details), [D, R] = rr(n), {
        modelValue: G,
        ...re
      } = oi.filterProps(e), oe = Um(e);
      return u(oi, be({
        ref: m,
        modelValue: l.value,
        "onUpdate:modelValue": (ee) => l.value = ee,
        class: ["v-textarea v-text-field", {
          "v-textarea--prefixed": e.prefix,
          "v-textarea--suffixed": e.suffix,
          "v-text-field--prefixed": e.prefix,
          "v-text-field--suffixed": e.suffix,
          "v-textarea--auto-grow": e.autoGrow,
          "v-textarea--no-resize": e.noResize || e.autoGrow,
          "v-input--plain-underlined": N.value
        }, e.class],
        style: e.style
      }, D, re, {
        centerAffix: I.value === 1 && !N.value,
        focused: a.value
      }), {
        ...i,
        default: (ee) => {
          let {
            id: B,
            isDisabled: M,
            isDirty: H,
            isReadonly: K,
            isValid: Ne
          } = ee;
          return u(Pr, be({
            ref: h,
            style: {
              "--v-textarea-control-height": v.value
            },
            onClick: E,
            onMousedown: A,
            "onClick:clear": P,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"]
          }, oe, {
            id: B.value,
            active: y.value || H.value,
            centerAffix: I.value === 1 && !N.value,
            dirty: H.value || e.dirty,
            disabled: M.value,
            focused: a.value,
            error: Ne.value === !1
          }), {
            ...i,
            default: (we) => {
              let {
                props: {
                  class: Ie,
                  ...J
                }
              } = we;
              return u(Ee, null, [e.prefix && u("span", {
                class: "v-text-field__prefix"
              }, [e.prefix]), lt(u("textarea", be({
                ref: g,
                class: Ie,
                value: l.value,
                onInput: C,
                autofocus: e.autofocus,
                readonly: K.value,
                disabled: M.value,
                placeholder: e.placeholder,
                rows: e.rows,
                name: e.name,
                onFocus: w,
                onBlur: r
              }, J, R), null), [[Nn("intersect"), {
                handler: f
              }, null, {
                once: !0
              }]]), e.autoGrow && lt(u("textarea", {
                class: [Ie, "v-textarea__sizer"],
                id: `${J.id}-sizer`,
                "onUpdate:modelValue": (ke) => l.value = ke,
                ref: x,
                readonly: !0,
                "aria-hidden": "true"
              }, null), [[Oy, l.value]]), e.suffix && u("span", {
                class: "v-text-field__suffix"
              }, [e.suffix])]);
            }
          });
        },
        details: k ? (ee) => {
          var B;
          return u(Ee, null, [(B = i.details) == null ? void 0 : B.call(i, ee), O && u(Ee, null, [u("span", null, null), u(jm, {
            active: e.persistentCounter || a.value,
            value: d.value,
            max: c.value,
            disabled: e.disabled
          }, i.counter)])]);
        } : void 0
      });
    }), fo({}, m, h, g);
  }
}), vk = {
  name: "EpubReader",
  components: {
    Settings: vv,
    BookToc: mv,
    Guest: iv,
    UserCenter: ov,
    BookComments: Gm,
    BookReview: fv,
    BookAnnotations: Am,
    AudiobookPlayer: yv
  },
  props: {
    book_url: { type: String, required: !0 },
    display_url: { type: String, default: "" },
    debug: { type: Boolean, default: !1 },
    themes_css: { type: String, default: "theme.css" },
    initial_book_id: { type: [Number, String], default: null },
    annotation_callbacks: { type: Object, default: null },
    audiobook_edition_id: { type: [Number, String], default: null },
    audiobook_manifest_url: { type: String, default: "" }
  },
  computed: {
    comments_enabled: function() {
      return this.settings.notes_enabled && this.settings.show_comments;
    },
    visible_annotations: function() {
      return this.selection_annotation_cfi ? this.annotations.filter((e) => e.cfi === this.selection_annotation_cfi) : this.annotations;
    },
    has_audiobook: function() {
      return !!(this.audiobook_edition_id || this.audiobook_manifest_url);
    },
    switch_theme_icon: function() {
      return Bn(this.settings.theme).mode === "day" ? "mdi-weather-night" : "mdi-weather-sunny";
    },
    switch_theme_text: function() {
      return Bn(this.settings.theme).mode === "day" ? "夜晚" : "白天";
    },
    foot_color: function() {
      const e = Bn(this.settings.theme);
      return e.bgBottom || e.bg;
    },
    status_bar_style: function() {
      const e = Bn(this.settings.theme);
      return e.type !== "image" ? {} : { color: e.text, backgroundColor: "transparent" };
    },
    // 「更多主题」窗口按白天/夜晚分区
    theme_groups: function() {
      return [
        { mode: "day", label: "白天", items: ro.filter((e) => e.mode === "day") },
        { mode: "night", label: "夜晚", items: ro.filter((e) => e.mode === "night") }
      ];
    },
    totalChapters: function() {
      let e = 0;
      function t(n) {
        for (const o of n)
          e++, o.subitems && o.subitems.length > 0 && t(o.subitems);
      }
      return t(this.toc_items), e;
    },
    currentChapterIndex: function() {
      if (!this.current_toc) return 0;
      const e = [];
      function t(n) {
        for (const o of n)
          e.push(o), o.subitems && o.subitems.length > 0 && t(o.subitems);
      }
      t(this.toc_items);
      for (let n = 0; n < e.length; n++) {
        const o = e[n];
        if (o.id && this.current_toc.id && o.id === this.current_toc.id || o.href === this.current_toc.href && o.label === this.current_toc.label)
          return n + 1;
      }
      return 0;
    },
    readingProgress: function() {
      return this.totalChapters === 0 ? "0%" : `${Math.round(this.currentChapterIndex / this.totalChapters * 100)}%`;
    }
  },
  methods: {
    audiobook_request: async function(e, t = {}) {
      const n = await fetch(e, {
        mode: "cors",
        credentials: "include",
        ...t
      }), o = await n.json();
      if (!n.ok && !(o != null && o.err)) throw new Error(`有声书接口请求失败（${n.status}）`);
      return o;
    },
    open_audiobook: function() {
      this.set_menu("hide"), this.audiobook_open = !0, this.$nextTick(() => {
        var e;
        return (e = this.$refs.audiobookPlayer) == null ? void 0 : e.loadManifest();
      });
    },
    suspend_audiobook_follow: function() {
      var e;
      (e = this.$refs.audiobookPlayer) == null || e.suspendFollow();
    },
    on_click_toolbar_listen: function() {
      const e = this.selected_location;
      this.hide_toolbar(), this.audiobook_open = !0, this.$nextTick(() => {
        var t;
        return (t = this.$refs.audiobookPlayer) == null ? void 0 : t.playFromSelection(e);
      });
    },
    initialize_annotations: function() {
      try {
        this.annotation_repository = x1({
          callbacks: this.annotation_callbacks,
          bookId: this.initial_book_id,
          bookUrl: this.book_url
        });
      } catch (e) {
        this.annotations_error = e.message || "笔记功能初始化失败", console.error("Candle Reader annotations could not be initialized:", e);
      }
    },
    annotation_identity: function(e) {
      return String((e == null ? void 0 : e.id) || (e == null ? void 0 : e.client_id) || (e == null ? void 0 : e.cfi) || "");
    },
    annotation_color: function(e) {
      return { blue: "#4f8fb8", green: "#54a675", pink: "#d97a9d", yellow: "#e6b91e" }[e == null ? void 0 : e.color] || (e == null ? void 0 : e.color) || ((e == null ? void 0 : e.annotation_type) === "note" ? "#4f8fb8" : "#e6b91e");
    },
    render_annotation: function(e) {
      if (!this.settings.notes_enabled || !this.rendition || !(e != null && e.cfi)) return;
      const t = String(e.cfi);
      if (!(t && this.rendered_annotation_ids.has(t)))
        try {
          this.rendition.annotations.highlight(
            e.cfi,
            { annotationId: e.id || e.client_id },
            () => this.on_open_annotations(),
            "candle-reader-annotation",
            { fill: this.annotation_color(e), "fill-opacity": "0.38", "mix-blend-mode": "multiply" }
          ), t && this.rendered_annotation_ids.add(t), this.rendered_annotations.push(e);
        } catch (n) {
          console.warn("Candle Reader annotation could not be rendered:", t, n);
        }
    },
    clear_annotation_marks: function() {
      var e;
      (e = this.rendition) != null && e.annotations && this.rendered_annotations.forEach((t) => {
        try {
          this.rendition.annotations.remove(t.cfi, "highlight");
        } catch (n) {
          console.warn("Candle Reader annotation could not be removed:", n);
        }
      }), this.rendered_annotations = [], this.rendered_annotation_ids.clear();
    },
    load_annotations: async function() {
      if (!this.annotation_repository || !this.settings.notes_enabled) return;
      const e = ++this.annotation_list_request;
      this.annotations_loading = !0, this.annotations_error = "";
      try {
        const t = await this.annotation_repository.load();
        if (e !== this.annotation_list_request) return;
        this.annotations = t, t.forEach(this.render_annotation);
      } catch (t) {
        if (e !== this.annotation_list_request) return;
        this.annotations_error = t.message || "笔记加载失败，请稍后重试";
      } finally {
        e === this.annotation_list_request && (this.annotations_loading = !1);
      }
    },
    load_chapter_annotations: async function(e) {
      if (!e || !this.annotation_repository || !this.settings.notes_enabled) return;
      const t = ++this.annotation_chapter_request;
      this.chapter_annotation_count = 0;
      try {
        const n = await this.annotation_repository.load({ chapter: e });
        if (t !== this.annotation_chapter_request) return;
        this.chapter_annotation_count = n.length, n.forEach(this.render_annotation);
      } catch (n) {
        console.warn("Candle Reader chapter annotations could not be loaded:", n);
      }
    },
    on_open_annotations: function() {
      this.selection_annotation_cfi = "", this.set_menu("annotations"), this.menu.current_panel === "annotations" && this.load_annotations();
    },
    on_view_selection_notes: function() {
      var e;
      this.selection_annotation_cfi = ((e = this.selected_location) == null ? void 0 : e.cfi) || "", this.hide_toolbar(), this.set_menu("annotations"), this.menu.current_panel === "annotations" && this.load_annotations();
    },
    locate_annotation: async function(e) {
      if (!(!(e != null && e.cfi) || !this.rendition))
        try {
          await this.rendition.display(e.cfi), this.set_menu("hide");
        } catch {
          this.show_annotation_feedback("无法定位这条笔记", !0);
        }
    },
    show_annotation_feedback: function(e, t = !1) {
      this.annotation_feedback_message = e, this.annotation_feedback_error = t, this.annotation_feedback_visible = !0;
    },
    upsert_annotation: function(e) {
      const t = this.annotation_identity(e), n = this.annotations.findIndex((o) => this.annotation_identity(o) === t);
      n >= 0 ? this.annotations.splice(n, 1, e) : this.annotations.unshift(e);
    },
    save_annotation: async function(e, t, n) {
      var i, l, a, s, r;
      if (!this.settings.notes_enabled) return null;
      const o = this.selected_location;
      if (!(o != null && o.cfi) || !(o != null && o.quote_text) || !this.annotation_repository || this.annotation_saving) return null;
      this.annotation_saving = !0;
      try {
        const d = await this.annotation_repository.save({
          client_id: o.client_id || Is(),
          annotation_type: e,
          is_private: n,
          chapter: String(((i = o.toc) == null ? void 0 : i.label) || this.current_toc_title || "").trim(),
          cfi: String(o.cfi),
          quote_text: o.quote_text,
          content: t,
          color: e === "note" ? "blue" : "yellow"
        });
        this.upsert_annotation(d), this.render_annotation(d), this.load_chapter_annotations(String(((l = o.toc) == null ? void 0 : l.label) || this.current_toc_title || "").trim()), this.hide_toolbar();
        try {
          (r = (s = (a = o.contents) == null ? void 0 : a.window) == null ? void 0 : s.getSelection()) == null || r.removeAllRanges();
        } catch {
        }
        return this.selected_location === o && (this.selected_location = {}), e !== "highlight" && this.show_annotation_feedback("笔记已保存"), d;
      } catch (d) {
        return this.show_annotation_feedback(`保存失败：${d.message || "请稍后重试"}`, !0), null;
      } finally {
        this.annotation_saving = !1;
      }
    },
    save_highlight: function() {
      return this.save_annotation("highlight", "", !0);
    },
    open_note_editor: function() {
      var e;
      !this.settings.notes_enabled || !((e = this.selected_location) != null && e.quote_text) || (this.hide_toolbar(!0), this.annotation_editor_location = this.selected_location, this.annotation_editor_content = "", this.annotation_editor_error = "", this.annotation_editor_private = !1, this.annotation_editor_open = !0);
    },
    save_note: async function() {
      const e = this.annotation_editor_content.trim();
      if (!e) {
        this.annotation_editor_error = "请填写笔记内容", this.$nextTick(() => {
          var n;
          return (n = this.$refs.annotationEditorContent) == null ? void 0 : n.focus();
        });
        return;
      }
      await this.save_annotation("note", e, this.annotation_editor_private) && (this.annotation_editor_open = !1);
    },
    on_annotation_editor_closed: function() {
      var t, n, o, i;
      const e = this.annotation_editor_location;
      if (this.annotation_editor_location = null, this.selected_location === e) {
        this.clear_selection_preview();
        try {
          (o = (n = (t = e == null ? void 0 : e.contents) == null ? void 0 : t.window) == null ? void 0 : n.getSelection()) == null || o.removeAllRanges();
        } catch {
        }
        this.selected_location = {};
      }
      (i = this.selected_location) != null && i.cfi || this.restore_reader_focus();
    },
    restore_reader_focus: function() {
      var e;
      (e = document.querySelector("#reader iframe")) == null || e.focus();
    },
    copy_selection: async function() {
      var t;
      const e = (t = this.selected_location) == null ? void 0 : t.quote_text;
      if (e)
        try {
          await navigator.clipboard.writeText(e), this.hide_toolbar(), this.show_annotation_feedback("已复制选中文字");
        } catch {
          this.show_annotation_feedback("复制失败，请使用系统复制功能", !0);
        }
    },
    switch_theme: function() {
      const t = Bn(this.settings.theme).mode === "day" ? this.settings.theme_night || "grey" : this.settings.theme_day || "white";
      this.apply_theme(t), this.save_settings();
    },
    // 应用一套主题（按 id）。solid 走 themes.css 的 class；image 走外层背景图 + iframe 透明 + 文字色强制。
    apply_theme: function(e) {
      const t = Bn(e);
      this.settings.theme = t.id, this.settings.theme_mode = t.mode, this.settings["theme_" + t.mode] = t.id, this.apply_skin_background(t), this.apply_theme_color(t), this.rendition && (this.rendition.themes.select(t.id), this.apply_custom_style(t));
    },
    // 「更多主题」卡片预览样式：图片皮肤用缩略图，纯色用背景色
    theme_card_style: function(e) {
      return e.type === "image" ? {
        backgroundColor: e.bg,
        backgroundImage: `url(${e.thumb})`,
        backgroundSize: "cover",
        backgroundPosition: "center"
      } : { backgroundColor: e.bg };
    },
    // 打开「更多主题」窗口：先关掉设置面板，避免弹窗被 Vuetify 全局栈压在低层（设置面板 z-index 仅 234），
    // 关闭后弹窗成为唯一活动 overlay，获得默认高层级，从而盖过顶栏/底部导航。
    open_theme_dialog: function() {
      this.set_menu("hide"), this.$nextTick(() => {
        this.show_theme_dialog = !0;
      });
    },
    // 在「更多主题」窗口里选定主题：应用并关闭窗口
    pick_theme: function(e) {
      this.apply_theme(e.id), this.save_settings(), this.show_theme_dialog = !1;
    },
    // 让 iOS 顶/底安全区（刘海/灵动岛、home indicator）跟随主题色。
    // 关键：viewport-fit=cover 下安全区露出的是最底层 html/body 背景，且 iOS 只认
    // background-COLOR（不渲染 gradient/image），故必须用纯色。html/body 设 bgTop（顶部色）；
    // 底部若要不同色（图片皮肤 foot），由模板里的 #safe-bottom 固定填充条用纯色覆盖（见 foot_color）。
    // 纯色皮肤不设 bgTop/bgBottom，回退到 bg。meta 用顶部色。
    apply_theme_color: function(e) {
      e = e || Bn(this.settings.theme), document.documentElement.style.backgroundColor = e.bgTop || e.bg, document.body.style.backgroundColor = e.bgTop || e.bg;
      const t = document.querySelector('meta[name="theme-color"]');
      t && t.setAttribute("content", e.bgTop || e.bg);
    },
    // 背景图铺在 #main（v-main）上：覆盖上/下状态栏与正文区域，整屏一张图连续衔接。
    // image 皮肤按屏幕方向选竖版/横版大图（cover）；正文 iframe 与状态栏透明后透出。
    // （图放在主文档而非 iframe 内——iframe 在分栏模式下宽达数十万 px，背景会被拉伸失效。）
    apply_skin_background: function(e) {
      e = e || Bn(this.settings.theme);
      const t = document.getElementById("main");
      if (t)
        if (e.type === "image") {
          const n = window.innerWidth >= window.innerHeight ? e.landscape : e.portrait;
          t.style.backgroundColor = e.bg, t.style.backgroundImage = `linear-gradient(${e.mask}, ${e.mask}), url("${n}")`, t.style.backgroundSize = "cover", t.style.backgroundPosition = "center", t.style.backgroundRepeat = "no-repeat";
        } else
          t.style.backgroundColor = "", t.style.backgroundImage = "";
    },
    // 通过 themes.default() 注入正文样式：行距/字距 +（仅 image 皮肤）正文透明 + 强制文字色。
    // 纯色主题保持「弱覆盖」：不强制 color/background，由 themes.css 的同名 class 处理（沿用旧行为）。
    // 注意：epub.js 的 addStylesheetRules 是往同一 <style> 追加而非替换，多次切换会累积，
    // 故每次先移除已注入的 default 规则节点，确保 image 皮肤的 !important 规则不会残留到 solid 主题。
    apply_custom_style: function(e) {
      e = e || Bn(this.settings.theme), this.rendition.getContents().forEach((o) => {
        const i = o.document && o.document.getElementById("epubjs-inserted-css-default");
        i && i.parentNode && i.parentNode.removeChild(i);
      });
      const t = {
        "line-height": `${this.settings.line_height} !important`,
        "letter-spacing": `${this.settings.letter_spacing}px !important`
      }, n = { "body, body *": t };
      e.type === "image" && (n.html = {
        background: "transparent !important",
        "color-scheme": e.mode === "night" ? "dark" : "light"
      }, t["background-color"] = "transparent !important", t.color = `${e.text} !important`), this.rendition.themes.default(n);
    },
    on_panel_model_update: function(e, t) {
      !t && this.menu.current_panel === e && this.set_menu("hide");
    },
    on_panel_after_leave: function(e) {
      var i, l;
      if (e !== this.panel_closing || Object.values(this.menu.panels).some(Boolean) || this.show_login || this.show_user_center || this.show_theme_dialog || this.annotation_editor_open) return;
      const t = (a) => (a == null ? void 0 : a.isConnected) && !a.disabled && !a.closest("[inert], .v-overlay") && a.getClientRects().length, n = ((i = this.$refs[this.panel_entry_ref]) == null ? void 0 : i.$el) || ((l = this.$refs.panelEntryAnnotations) == null ? void 0 : l.$el), o = t(this.panel_trigger) ? this.panel_trigger : n;
      t(o) && o.focus({ preventScroll: !0 }), this.panel_closing = null, this.panel_trigger = null;
    },
    set_menu: function(e) {
      var o;
      var t = e;
      if (this.menu.current_panel == t && this.menu.panels[t] === !0 && (t = "hide"), t === "hide")
        this.menu.current_panel !== "hide" && (this.panel_closing = this.menu.current_panel);
      else {
        const i = document.activeElement, l = (i == null ? void 0 : i.matches("button, a[href], [tabindex]")) && !i.closest(".v-overlay");
        if (l || !this.panel_trigger) {
          const a = { settings: "panelEntrySettings", toc: "panelEntryToc", ai: "panelEntryAi" };
          this.panel_entry_ref = a[t] || "panelEntryAnnotations", this.panel_trigger = l ? i : (o = this.$refs[this.panel_entry_ref]) == null ? void 0 : o.$el;
        }
        this.panel_closing = null;
      }
      this.menu.value = t == "hide" ? void 0 : t, console.log("set menu = ", t, ", current menu.value=", this.menu.value), this.menu.current_panel = t, this.menu.show_navbar = !0;
      for (var n in this.menu.panels)
        this.menu.panels[n] = n == t;
      t === "toc" && setTimeout(() => {
        this.$refs.bookTocComponent && this.$refs.bookTocComponent.scrollToCurrentChapter();
      }, 300);
    },
    save_settings: function() {
      localStorage.setItem("readerSettings", JSON.stringify(this.settings));
    },
    update_settings: function(e) {
      const t = this.settings.notes_enabled, n = this.comments_enabled;
      e.flow != this.settings.flow && (this.rendition.flow(e.flow), this.set_menu("hide"));
      for (const o in e)
        this.settings[o] = e[o];
      if (this.apply_theme(this.settings.theme), t && !this.settings.notes_enabled ? (this.annotation_list_request++, this.annotation_chapter_request++, this.annotation_editor_open = !1, this.annotations_loading = !1, this.chapter_annotation_count = 0, this.menu.current_panel === "annotations" && this.set_menu("hide"), this.clear_annotation_marks()) : !t && this.settings.notes_enabled && (this.load_chapter_annotations(this.current_toc_title), this.load_unread_count()), (!this.settings.notes_enabled || !this.settings.show_selection_toolbar) && this.hide_toolbar(), n !== this.comments_enabled) {
        this.comments_request++, this.comments = [];
        for (const o of this.rendition.getContents())
          o.document.querySelectorAll(".comment-icon").forEach((i) => i.remove());
        if (this.comments_enabled && this.current_toc) {
          delete this.current_toc.load_time;
          const o = this.rendition.getContents().find((i) => i.document === this.current_toc.elem.ownerDocument);
          o && this.load_comments_summary(o, this.current_toc);
        }
        this.menu.current_panel === "comments" && this.set_menu("annotations");
      }
      if (t && !this.settings.notes_enabled && (this.book_review_request++, this.book_reviews = [], this.unread_count = 0, this.menu.current_panel === "more" && this.set_menu("annotations")), e.brightness !== void 0) {
        const o = e.brightness / 100;
        document.getElementById("main").style.filter = `brightness(${o})`;
      }
      e.font_size !== void 0 && this.rendition.themes.fontSize(e.font_size + "px"), this.save_settings();
    },
    on_click_toc: function(e) {
      console.log(e), this.set_menu("hide"), this.suspend_audiobook_follow(), this.rendition.display(e.id);
    },
    on_mousedown: function() {
      this.mouse_down_time = /* @__PURE__ */ new Date();
    },
    on_mouseup: function() {
      /* @__PURE__ */ new Date() - this.mouse_down_time > 600 ? this.check_if_selected_content = !0 : this.check_if_selected_content = !1;
    },
    on_click_content: function(e) {
      if (!this.check_if_selected_content)
        return this.smart_click(e);
      setTimeout(() => {
        this.is_handlering_selected_content ? this.is_handlering_selected_content = !1 : this.smart_click(e);
      }, 300);
    },
    smart_click: function(e) {
      const t = e.view.frameElement.getBoundingClientRect(), n = document.getElementById("reader"), o = n.offsetWidth, i = n.offsetHeight, l = (e.clientX + t.x) % n.offsetWidth, a = (e.clientY + t.y) % n.offsetHeight;
      if (this.debug_click(l, a, o, i), this.is_toolbar_visible()) {
        this.hide_toolbar();
        return;
      }
      const s = o < this.wide_screen, r = s ? 3 : 5, d = this.settings.paging_control === "keyboard_only";
      l < o / r || s && a < i / r ? d || (this.suspend_audiobook_follow(), this.rendition.prev()) : l > o * (r - 1) / r || s && a > i * (r - 1) / r ? d || (this.suspend_audiobook_follow(), this.rendition.next().then()) : (console.log("-- toggle menu"), this.menu.show_navbar = !this.menu.show_navbar);
    },
    bin_search: function(e, t, n) {
      for (var o = 0, i = e.length; o < i; ) {
        const a = Math.floor((o + i) / 2);
        if (a == o)
          break;
        const s = e[a];
        if (s.cfi === void 0) {
          if (s.href.indexOf("#") > 0) {
            const d = s.href.split("#")[1];
            s.elem = n.document.getElementById(d);
          } else
            s.elem = n.document.getElementsByTagName("p")[0];
          s.cfi = new ePub.CFI(s.elem, n.cfiBase), s.cfi = new ePub.CFI(s.cfi.toString());
        }
        const r = this.book.locations.epubcfi.compare(t, s.cfi);
        if (r == 0)
          return s;
        r < 0 && (i = a), r > 0 && (o = a);
      }
      const l = e[o];
      if (l.cfi === void 0) {
        if (l.href.indexOf("#") > 0) {
          const a = l.href.split("#")[1];
          l.elem = n.document.getElementById(a);
        } else
          l.elem = n.document.getElementsByTagName("p")[0];
        l.cfi = new ePub.CFI(l.elem, n.cfiBase);
      }
      return l;
    },
    find_same_href_in_toc_tree: function(e, t) {
      for (var n in e) {
        const o = e[n];
        if (o.href == t)
          return o;
        if (o.subitems !== void 0 && o.subitems.length > 0) {
          const i = this.find_same_href_in_toc_tree(o.subitems, t);
          if (i !== void 0)
            return i;
        }
      }
    },
    find_toc: function(e, t) {
      const n = new ePub.CFI(e.toString()), o = this.book.spine.get(t.sectionIndex), i = this.find_same_href_in_toc_tree(this.toc_items, o.href);
      if (console.log("got spine href in toc:", i), i === void 0) {
        if (t.annotationFallbackToc) return t.annotationFallbackToc;
        const a = t.document.body, s = a.querySelector("h1, h2, h3, h4, h5, h6");
        return t.annotationFallbackToc = {
          href: o.href,
          label: (s == null ? void 0 : s.textContent.trim()) || `正文 ${o.index + 1}`,
          elem: a,
          cfi: new ePub.CFI(a, t.cfiBase),
          subitems: [],
          is_fallback: !0
        }, t.annotationFallbackToc;
      }
      if (i.elem === void 0) {
        const a = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
        for (let r of a) {
          const d = t.document.getElementsByTagName(r);
          if (d.length > 0) {
            i.elem = d[0];
            break;
          }
        }
        const s = new ePub.CFI(i.elem, t.cfiBase);
        i.cfi = new ePub.CFI(s.toString());
      }
      var l = i;
      return i.subitems.length > 0 && (l = this.bin_search(i.subitems, n, t), this.book.locations.epubcfi.compare(n, l.cfi) < 0 && (l = i)), console.log("find_toc = ", l), l;
    },
    count_distinct_between: function(e, t) {
      for (var n = t; n.parentElement != e.parentNode; )
        n = n.parentElement;
      let o = 0, i = e;
      for (; i && i !== n; ) {
        const l = i.nodeName.toUpperCase();
        if ((l === "P" || l[0] === "H") && o++, i.firstChild)
          i = i.firstChild;
        else if (i.nextSibling)
          i = i.nextSibling;
        else {
          for (; !i.nextSibling && i.parentNode; )
            i = i.parentNode;
          i = i.nextSibling;
        }
      }
      return o;
    },
    clear_selection_preview: function() {
      this.selection_preview_rects = [];
    },
    update_selection_preview: function(e, t) {
      this.selection_preview_rects = Array.from(e.getClientRects()).filter((n) => n.width > 0 && n.height > 0).map((n) => ({
        left: `${t.left + n.left}px`,
        top: `${t.top + n.top}px`,
        width: `${n.width}px`,
        height: `${n.height}px`
      }));
    },
    hide_toolbar: function(e = !1) {
      this.toolbar_left = -999, e || this.clear_selection_preview();
    },
    show_toolbar: function(e, t) {
      if (!this.settings.notes_enabled || !this.settings.show_selection_toolbar) return;
      console.log("show toolbar at rect", e, " from iframe rect", t);
      const n = e.left + t.x, o = e.top + t.y, i = e.bottom + t.y;
      this.toolbar_left = 8, this.toolbar_top = i + 12, this.$nextTick(() => {
        var r;
        const l = this.$refs.selectionToolbar;
        if (!l || !this.settings.notes_enabled || !this.settings.show_selection_toolbar) return;
        const a = Math.max(8, window.innerWidth - l.offsetWidth - 8);
        this.toolbar_left = Math.max(8, Math.min(a, n));
        const s = this.menu.show_navbar ? 64 : 8;
        this.toolbar_top = o >= l.offsetHeight + 64 ? o - l.offsetHeight - 12 : Math.min(window.innerHeight - l.offsetHeight - s, i + 12), (r = l.querySelector("button")) == null || r.focus({ preventScroll: !0 });
      });
    },
    is_toolbar_visible: function() {
      return this.settings.notes_enabled && this.settings.show_selection_toolbar && this.toolbar_left > 0;
    },
    on_select_content: function(e, t) {
      console.log("on selectd", e, t), this.is_handlering_selected_content = !0;
      const n = this.rendition.getRange(e) || t.range(e), o = n.startContainer.nodeType === Node.TEXT_NODE ? n.startContainer.parentElement : n.startContainer, i = o.closest("p, h1, h2, h3, h4, h5, h6") || o;
      console.log("selected elem =", i);
      const l = new ePub.CFI(i, t.cfiBase), a = this.find_toc(l, t);
      console.log("cfi = ", l, "toc =", a);
      const s = a.is_fallback ? Math.max(0, Array.from(a.elem.querySelectorAll("p, h1, h2, h3, h4, h5, h6")).indexOf(i)) : this.count_distinct_between(a.elem, i);
      console.log("selected segment_id = ", s), this.selected_location = {
        client_id: Is(),
        toc: a,
        cfi: String(e),
        paragraph_cfi: l.toString(),
        quote_text: n.toString().trim(),
        contents: t,
        segment_id: s
      };
      const r = this.rendition.views()._views.filter((d) => d.index == t.sectionIndex)[0];
      this.update_selection_preview(n, r.iframe.getBoundingClientRect()), this.show_toolbar(i.getBoundingClientRect(), r.iframe.getBoundingClientRect());
    },
    on_click_toolbar_comments: function() {
      console.log("点击发表评论按钮", this.selected_location);
      const e = this.selected_location;
      this.hide_toolbar(), this.show_selected_comments(e.toc, e.segment_id, e.cfi);
    },
    on_keyup: function(e) {
      var o;
      if (e.key === "Escape" && this.is_toolbar_visible()) {
        this.hide_toolbar(), this.restore_reader_focus();
        return;
      }
      const t = e.target;
      if ((o = t == null ? void 0 : t.matches) != null && o.call(t, "input, textarea, select") || t != null && t.isContentEditable) return;
      const n = e.keyCode || e.which;
      (n == 37 || n == 38) && (this.suspend_audiobook_follow(), this.rendition.prev()), (n == 39 || n == 40) && (this.suspend_audiobook_follow(), this.rendition.next());
    },
    on_wheel: function(e) {
      if (!this.settings.wheel_paging || this.settings.flow !== "paginated" || !this.rendition || this.menu.current_panel !== "hide" || this.show_login || this.show_user_center || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      t && t.closest && (t.closest(".v-bottom-sheet") || t.closest(".v-overlay") || t.closest(".v-dialog") || t.closest(".v-menu")) || (this.wheel_acc = (this.wheel_acc || 0) + e.deltaY, !(Math.abs(this.wheel_acc) < 30) && (e.preventDefault(), this.suspend_audiobook_follow(), this.rendition[this.wheel_acc > 0 ? "next" : "prev"](), this.wheel_acc = 0));
    },
    debug_click: function(e, t, n, o) {
      if (console.log("click at", e, t, n, o), !this.is_debug_click) return;
      e = e - 10, t = t - 10;
      const i = document.createElement("div");
      i.classList.add("dot"), i.style.left = `${e}px`, i.style.top = `${t}px`, document.body.appendChild(i), setTimeout(() => {
        document.body.removeChild(i);
      }, 2e3);
    },
    debug_signals: function() {
      if (this.is_debug_signal) {
        var e = ["added", "attach", "attached", "axis", "changed", "detach", "displayed", "displayerror", "expand", "hidden", "layout", "linkClicked", "loaderror", "locationChanged", "markClicked", "openFailed", "orientationchange", "relocated", "removed", "rendered", "resize", "resized", "scroll", "scrolled", "selected", "selectedRange", "shown", "started", "updated", "writingMode", "mouseup", "mousedown", "mousemove", "click", "touchend", "touchstart", "touchmove"];
        e.forEach((t) => {
          this.rendition.on(t, (n) => {
            this.alert_msg = t, console.log("rendition signal:", t, n);
          });
        });
      }
    },
    init_listeners: function() {
      document.addEventListener("keyup", this.on_keyup), this.rendition.on("keyup", this.on_keyup), this.rendition.on("click", this.on_click_content), this.rendition.on("selected", this.on_select_content), this.rendition.on("locationChanged", this.on_location_changed), this.rendition.on("mousedown", this.on_mousedown), this.rendition.on("mouseup", this.on_mouseup), this.rendition.on("resized", this.on_resized), this.rendition.on("rendered", this.bind_iframe_wheel), document.addEventListener("fullscreenchange", this.on_fullscreen_change), document.addEventListener("webkitfullscreenchange", this.on_fullscreen_change), document.addEventListener("mozfullscreenchange", this.on_fullscreen_change), document.addEventListener("MSFullscreenChange", this.on_fullscreen_change), this.debug_signals();
    },
    bind_iframe_wheel: function() {
      document.querySelectorAll("#reader iframe").forEach((e) => {
        const t = e.contentDocument;
        !t || t.__candle_wheel_bound || (t.__candle_wheel_bound = !0, t.addEventListener("wheel", this.on_wheel, { passive: !1 }));
      });
    },
    init_themes: function() {
      console.log("load themes from:", this.themes_css), ro.forEach((e) => this.rendition.themes.register(e.id, this.themes_css)), this.apply_theme(this.settings.theme);
    },
    on_resized: function() {
      console.log("Reader resized"), this.apply_skin_background();
      try {
        if (this.rendition && this.book) {
          const e = this.rendition.currentLocation();
          e && e.start && e.start.cfi ? this.rendition.display(e.start.cfi) : this.rendition.display();
        }
      } catch (e) {
        console.error("Error during resize re-render:", e);
      }
    },
    on_fullscreen_change: function() {
      console.log("Fullscreen state changed");
      try {
        this.rendition && this.book && setTimeout(() => {
          const e = this.rendition.currentLocation();
          e && e.start && e.start.cfi ? this.rendition.display(e.start.cfi) : this.rendition.display();
        }, 200);
      } catch (e) {
        console.error("Error during fullscreen re-render:", e);
      }
    },
    on_add_review: function(e) {
      const t = this.comments_location, n = {
        book_id: this.book_id,
        chapter_name: t.toc.label.trim(),
        chapter_id: t.toc.chapter_id,
        segment_id: t.segment_id,
        cfi: t.cfi.toString(),
        content: e,
        type: 1
      };
      console.log("add review = ", n), this.$backend("/api/review/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(n)
      }).then((o) => {
        o.err == "ok" && (this.comments.push(o.data), alert("评论成功")), console.log("add review rsp = ", o);
      });
    },
    on_jump_review: function(e) {
      !e || !this.rendition || (this.rendition.display(e), this.set_menu("hide"));
    },
    open_chapter_comments: async function() {
      if (!this.comments_enabled || !this.current_toc) return;
      const e = this.current_toc, t = this.rendition.getContents().find((n) => n.document === e.elem.ownerDocument);
      await this.load_comments_summary(t, e), this.comments_enabled && this.show_selected_comments(e, 0, e.cfi.toString());
    },
    on_open_comments: function() {
      this.settings.notes_enabled && (this.set_menu("more"), this.load_book_reviews());
    },
    on_change_book_review_sort: function(e) {
      this.book_review_sort = e, this.load_book_reviews();
    },
    load_unread_count: function() {
      if (!this.settings.notes_enabled) return;
      const e = this.book_review_request;
      return this.$backend("/api/review/me?count=true").then((t) => {
        !this.settings.notes_enabled || e !== this.book_review_request || (t.err === "user.need_login" ? this.is_login = !1 : t.err === "ok" && (this.unread_count = t.data.count || 0));
      }).catch((t) => console.error("获取未读消息数失败:", t));
    },
    load_book_reviews: function() {
      if (!this.settings.notes_enabled || !this.book_id) return;
      const e = this.book_review_request, t = `/api/review/book/list?book_id=${this.book_id}&sort=${this.book_review_sort}`;
      this.$backend(t).then((n) => {
        !this.settings.notes_enabled || e !== this.book_review_request || n.err == "ok" && (this.book_reviews = n.data.list || []);
      });
    },
    on_book_login: function(e) {
      this.on_login_user(e), this.show_login = !1;
    },
    on_book_logout: function() {
      this.user = null, this.is_login = !1, this.show_user_center = !1;
    },
    on_add_book_review: function(e) {
      if (!this.settings.notes_enabled) return;
      const t = this.book_review_request, n = this.current_toc;
      if (!n) {
        alert("请先打开任意章节再发表评论");
        return;
      }
      const o = {
        book_id: this.book_id,
        chapter_name: n.label.trim(),
        chapter_id: n.chapter_id,
        segment_id: 0,
        // 0 表示整章级（非段评）
        cfi: n.cfi ? n.cfi.toString() : "",
        content: e,
        type: 1
      };
      console.log("add book review = ", o), this.$backend("/api/review/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(o)
      }).then((i) => {
        !this.settings.notes_enabled || t !== this.book_review_request || (i.err == "ok" && (this.book_reviews.push(i.data), alert("评论成功")), console.log("add book review rsp = ", i));
      });
    },
    on_location_changed_old: function(e) {
      const t = this.rendition.getContents();
      [e.start, e.end].forEach((n) => {
        console.log("handle location ", n);
        const o = this.book.spine.get(n), i = t.filter((s) => s.cfiBase == o.cfiBase)[0], l = new ePub.CFI(n), a = this.find_toc(l, i, o.href);
        this.load_comments_summary(i, a);
      });
    },
    on_location_changed: function(e) {
      try {
        const t = new ePub.CFI(e.start), o = this.rendition.getContents().find((l) => l.sectionIndex === e.index);
        if (!o)
          return;
        const i = this.find_toc(t, o);
        i && (this.current_toc_title = i.label, this.current_toc = i, this.last_toc_label !== i.label && (this.load_comments_summary(o, i), this.load_chapter_annotations(i.label.trim()), this.last_toc_label = i.label));
      } catch (t) {
        console.error("Error in on_location_changed:", t);
      }
    },
    load_comments_summary: function(e, t) {
      if (!this.comments_enabled) return;
      const n = this.comments_request;
      if (console.log("load_comments_summary at ", e, t), t === void 0) {
        console.log("!! 加载章评错误，章节信息为空");
        return;
      }
      if (t.load_time !== void 0 && /* @__PURE__ */ new Date() - t.load_time < this.comments_refresh_time)
        return;
      t.load_time = /* @__PURE__ */ new Date();
      const o = t.label.trim();
      var i = `/api/review/summary?book_id=${this.book_id}&chapter_name=${o}`;
      return this.$backend(i).then((l) => {
        !this.comments_enabled || n !== this.comments_request || (t.load_time = /* @__PURE__ */ new Date(), t.summary = {}, t.chapter_id = l.data.chapter_id, (l.data.list || []).forEach((a) => {
          t.summary[a.segmentId] = a, t.icons_rendered = !1;
        }));
      }).catch(function(l) {
        console.error("请求过程中出现错误：", l);
      }).finally(() => {
        this.comments_enabled && n === this.comments_request && this.add_comment_icons(e, t);
      });
    },
    add_comment_icons: function(e, t) {
      if (console.log("添加评论图标和计数器：", t.label.trim()), !!this.comments_enabled) {
        var n = 0;
        for (var o in t.summary)
          o > n && (n = o);
        for (var i = 0, l = t.elem; i <= n && l; ) {
          const a = l.nodeName.toUpperCase();
          if ((a === "P" || a[0] === "H") && (this.add_icon_into_paragraph(e, l, i, t), i++), l.firstChild)
            l = l.firstChild;
          else if (l.nextSibling)
            l = l.nextSibling;
          else {
            for (; !l.nextSibling && l.parentNode; )
              l = l.parentNode;
            l = l.nextSibling;
          }
        }
        t.icons_rendered = !0;
      }
    },
    add_icon_into_paragraph: function(e, t, n, o) {
      const i = o.summary[n];
      if (i === void 0 || (console.log("添加评论图标：", n, t, i), t.querySelector(".comment-icon")))
        return;
      const l = new ePub.CFI(t, e.cfiBase).toString(), a = i.reviewNum, s = i.is_hot ? "hot-comment" : "", r = e.document, d = r.createElement("div");
      d.className = `comment-icon ${s}`;
      const c = r.createElement("span");
      c.className = "comment-count", c.textContent = String(a), d.appendChild(c), t.appendChild(d), d.addEventListener("click", (f) => {
        f.stopPropagation(), console.log("点击评论按钮", o.chapter_id, n, l), this.show_selected_comments(o, n, l);
      });
    },
    show_selected_comments: function(e, t, n) {
      if (!this.comments_enabled) return;
      const o = this.comments_request;
      if (this.comments = [], this.comments_location = {
        toc: e,
        cfi: n,
        segment_id: t
      }, e.chapter_id === void 0) {
        this.set_menu("comments");
        return;
      }
      const i = `/api/review/list?book_id=${this.book_id}&chapter_id=${e.chapter_id}&segment_id=${t}&cfi=${n}`;
      this.$backend(i).then((l) => {
        !this.comments_enabled || o !== this.comments_request || (this.comments = l.data.list || [], this.set_menu("comments"));
      });
    },
    on_login_user: function(e) {
      this.user = e, this.is_login = !0;
    },
    retryLoad: function() {
      try {
        this.showTimeoutDialog = !1, setTimeout(() => {
          this.loading = !0;
        }, 50), clearTimeout(this.loadingTimeout), this.book = ePub(this.book_url), this.rendition = this.book.renderTo("reader", {
          manager: "continuous",
          flow: this.settings.flow,
          width: "100%",
          height: "100%"
        }), this.init_listeners(), this.init_themes(), this.loadingTimeout = setTimeout(() => {
          this.loading && (console.warn("电子书加载超时，显示提示框"), this.loading = !1, this.showTimeoutDialog = !0);
        }, 1e4);
        const e = `lastReadPosition_${this.book_url}`;
        this.book.ready.then(() => {
          const n = localStorage.getItem(e) || this.display_url;
          return n ? this.rendition.display(n) : this.rendition.display();
        }).then(() => {
          clearTimeout(this.loadingTimeout), this.loading = !1;
        }).catch((t) => {
          clearTimeout(this.loadingTimeout), console.error("加载电子书失败:", t), this.loading = !1, this.showTimeoutDialog = !0;
        }), this.rendition.on("relocated", (t) => {
          localStorage.setItem(e, t.start.cfi);
        });
      } catch (e) {
        console.error("重试加载过程中出现错误:", e), this.loading = !1, this.showTimeoutDialog = !0;
      }
    }
  },
  mounted: function() {
    this.initial_book_id && (this.book_id = Number(this.initial_book_id));
    const e = document.createElement("link");
    e.rel = "stylesheet", e.type = "text/css", e.href = this.themes_css, document.head.appendChild(e);
    const t = localStorage.getItem("readerSettings");
    if (t) {
      const o = this.$options.data().settings, i = JSON.parse(t);
      this.settings = Object.assign({}, o);
      for (const l in i)
        i[l] !== void 0 && (this.settings[l] = i[l]);
      Object.assign(this.settings, _1(i));
    }
    this.initialize_annotations(), this.is_debug_signal = this.debug, this.is_debug_click = this.debug, this.loadingTimeout = setTimeout(() => {
      this.loading && (console.warn("电子书加载超时，显示提示框"), this.loading = !1, this.showTimeoutDialog = !0);
    }, 1e4), this.loading = !0, this.load_unread_count(), this.$backend("/api/user/info").then((o) => {
      this.settings.notes_enabled || (this.is_login = o.err === "ok"), o.err == "ok" ? this.user = o.data : o.err === "network_error" ? console.log("网络错误，无法获取用户信息，保持当前状态") : this.user = null;
    }).catch((o) => {
      console.error("获取用户信息失败:", o);
    }), this.book = ePub(this.book_url), this.rendition = this.book.renderTo("reader", {
      manager: "continuous",
      flow: this.settings.flow,
      width: "100%",
      height: "100%"
      //snap: true
    }), this.book.loaded.metadata.then((o) => {
      console.log(o), this.book_meta = o, this.book_title = o.title;
      const i = `/api/review/book?title=${this.book_title}`;
      this.$backend(i).then((l) => {
        l.err == "ok" && (this.book_id = l.data.id);
      }).catch((l) => {
        console.error("获取书籍ID失败:", l);
      });
    }).catch((o) => {
      console.error("加载书籍元数据失败:", o);
    }), this.book.loaded.navigation.then((o) => {
      this.toc_items = o.toc;
    }).catch((o) => {
      console.error("加载目录失败:", o);
    }), this.init_listeners(), this.init_themes();
    const n = `lastReadPosition_${this.book_url}`;
    this.rendition.on("relocated", (o) => {
      localStorage.setItem(n, o.start.cfi);
    }), this.book.ready.then(() => {
      const i = localStorage.getItem(n) || this.display_url;
      return i ? this.rendition.display(i) : this.rendition.display();
    }).then(() => {
      clearTimeout(this.loadingTimeout), this.loading = !1;
      const o = this.settings.brightness / 100;
      document.getElementById("main").style.filter = `brightness(${o})`, this.rendition.themes.fontSize(this.settings.font_size + "px"), this.apply_theme(this.settings.theme);
    }).catch((o) => {
      clearTimeout(this.loadingTimeout), console.error("加载电子书失败:", o), this.loading = !1, this.showTimeoutDialog = !0;
    });
  },
  data: () => ({
    loading: !0,
    book: null,
    settings: {
      flow: "paginated",
      // flow: "scrolled",
      font_size: 18,
      line_height: 1.5,
      letter_spacing: 0,
      brightness: 100,
      theme: "white",
      theme_mode: "day",
      theme_day: "white",
      theme_night: "grey",
      show_comments: !0,
      notes_enabled: !0,
      show_selection_toolbar: !0,
      notes_settings_version: 2,
      paging_control: "mouse_and_keyboard",
      wheel_paging: !0
    },
    wide_screen: 1e3,
    // 宽屏尺寸
    comments_refresh_time: 10 * 60 * 100,
    // 10min
    user: null,
    is_login: !0,
    book_title: "",
    book_meta: null,
    book_id: 0,
    alert_msg: "秉烛夜读",
    rendition: null,
    auto_close: !1,
    menu: {
      show_navbar: !0,
      current_panel: "hide",
      value: "",
      panels: {
        toc: !1,
        more: !1,
        settings: !1,
        comments: !1,
        annotations: !1,
        ai: !1
      }
    },
    theme_mode: "day",
    toc_items: [],
    panel_trigger: null,
    panel_closing: null,
    panel_entry_ref: "panelEntryAnnotations",
    comments_request: 0,
    book_review_request: 0,
    comments: [],
    annotations: [],
    annotations_loading: !1,
    annotations_error: "",
    annotation_repository: null,
    annotation_list_request: 0,
    annotation_chapter_request: 0,
    chapter_annotation_count: 0,
    annotation_saving: !1,
    annotation_editor_open: !1,
    annotation_editor_location: null,
    annotation_editor_content: "",
    annotation_editor_error: "",
    annotation_editor_private: !1,
    selection_annotation_cfi: "",
    selection_preview_rects: [],
    annotation_feedback_visible: !1,
    annotation_feedback_message: "",
    annotation_feedback_error: !1,
    rendered_annotations: [],
    rendered_annotation_ids: /* @__PURE__ */ new Set(),
    book_reviews: [],
    // 本书评论 feed（来自 /api/review/book/list）
    book_review_sort: "latest",
    // 本书评论排序：latest | hot
    show_login: !1,
    // 登录对话框（评论面板「点击登录」）
    show_user_center: !1,
    // 用户设置弹层（评论面板 ⚙️）
    comments_location: {},
    // 评论内容的位置
    selected_location: {},
    // 选中内容的位置
    current_toc_title: "",
    current_toc: null,
    // 当前阅读的章节对象
    current_toc_progress: "",
    last_toc_label: "",
    // 上一次的章节标题，用于检测章节变化
    toolbar_left: -999,
    toolbar_top: 0,
    is_debug_signal: !1,
    is_debug_click: !1,
    unread_count: 0,
    is_handlering_selected_content: !1,
    check_if_selected_content: !1,
    showTimeoutDialog: !1,
    show_theme_dialog: !1,
    audiobook_open: !1
  })
}, hk = {
  key: 0,
  class: "d-flex align-center flex-wrap ga-2 px-4 py-3",
  role: "group",
  "aria-label": "笔记分类"
}, gk = { class: "text-body-1 font-weight-medium me-auto" }, yk = { key: 1 }, pk = { class: "annotation-editor-quote" }, bk = {
  key: 0,
  class: "text-caption mt-2 mb-0"
}, _k = {
  id: "status-bar-left",
  class: "align-start"
}, wk = {
  id: "status-bar-right",
  class: "align-end"
}, kk = { class: "progress-bar-container" }, Sk = { class: "theme-group-label" }, Ck = { class: "theme-grid" }, Ek = ["onClick"], xk = {
  key: 1,
  class: "theme-badge"
}, Vk = { class: "theme-name" };
function Nk(e, t, n, o, i, l) {
  const a = yv, s = vv, r = mv, d = fv, c = iv, f = ov, m = Gm, h = Am;
  return Q(), me(N1, {
    theme: e.settings.theme,
    "full-height": "",
    density: "compact"
  }, {
    default: _(() => [
      ue("div", {
        id: "safe-bottom",
        style: on({ backgroundColor: l.foot_color })
      }, null, 4),
      e.menu.show_navbar ? (Q(), me(D1, {
        key: 0,
        density: "compact"
      }, {
        prepend: _(() => [
          u(ce, {
            icon: "",
            title: e.is_debug_signal ? "返回首页" : "章评"
          }, {
            default: _(() => [
              u(De, null, {
                default: _(() => [
                  q(Oe(e.is_debug_signal ? "mdi-arrow-left" : "mdi-candle"), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["title"])
        ]),
        default: _(() => [
          q(" " + Oe(e.is_debug_signal ? e.alert_msg : e.book_title) + " ", 1),
          u(Sl),
          l.has_audiobook ? (Q(), me(ce, {
            key: 0,
            "min-height": "44",
            onClick: l.open_audiobook,
            title: "听书"
          }, {
            default: _(() => [
              u(De, null, {
                default: _(() => t[45] || (t[45] = [
                  q("mdi-headphones")
                ])),
                _: 1
              }),
              t[46] || (t[46] = ue("span", null, "听书", -1))
            ]),
            _: 1
          }, 8, ["onClick"])) : We("", !0),
          u(ce, {
            ref: "panelEntryAi",
            icon: "",
            title: "更多选项",
            onClick: t[0] || (t[0] = (v) => l.set_menu("ai"))
          }, {
            default: _(() => [
              u(De, null, {
                default: _(() => t[47] || (t[47] = [
                  q("mdi-dots-vertical")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 512)
        ]),
        _: 1
      })) : We("", !0),
      u(B1, {
        modelValue: e.menu.value,
        "onUpdate:modelValue": t[3] || (t[3] = (v) => e.menu.value = v),
        active: e.menu.show_navbar,
        "z-index": "2599"
      }, {
        default: _(() => [
          u(ce, {
            ref: "panelEntryToc",
            value: "toc",
            onClick: t[1] || (t[1] = (v) => l.set_menu("toc"))
          }, {
            default: _(() => [
              u(De, null, {
                default: _(() => t[48] || (t[48] = [
                  q("mdi-book-open-variant-outline")
                ])),
                _: 1
              }),
              t[49] || (t[49] = ue("span", null, "目录", -1))
            ]),
            _: 1
          }, 512),
          u(ce, { onClick: l.switch_theme }, {
            default: _(() => [
              u(De, null, {
                default: _(() => [
                  q(Oe(l.switch_theme_icon), 1)
                ]),
                _: 1
              }),
              ue("span", null, Oe(l.switch_theme_text), 1)
            ]),
            _: 1
          }, 8, ["onClick"]),
          u(ce, {
            ref: "panelEntryAnnotations",
            value: "annotations",
            "aria-label": e.chapter_annotation_count ? `笔记，本章 ${e.chapter_annotation_count} 条` : "笔记",
            onClick: l.on_open_annotations
          }, {
            default: _(() => [
              e.chapter_annotation_count ? (Q(), me(Mc, {
                key: 0,
                color: "primary",
                content: e.chapter_annotation_count
              }, {
                default: _(() => [
                  u(De, null, {
                    default: _(() => t[50] || (t[50] = [
                      q("mdi-notebook-outline")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["content"])) : (Q(), me(De, { key: 1 }, {
                default: _(() => t[51] || (t[51] = [
                  q("mdi-notebook-outline")
                ])),
                _: 1
              })),
              t[52] || (t[52] = ue("span", null, "笔记", -1))
            ]),
            _: 1
          }, 8, ["aria-label", "onClick"]),
          u(ce, {
            ref: "panelEntrySettings",
            value: "settings",
            onClick: t[2] || (t[2] = (v) => l.set_menu("settings"))
          }, {
            default: _(() => [
              u(De, null, {
                default: _(() => t[53] || (t[53] = [
                  q("mdi-cog")
                ])),
                _: 1
              }),
              t[54] || (t[54] = ue("span", null, "设置", -1))
            ]),
            _: 1
          }, 512)
        ]),
        _: 1
      }, 8, ["modelValue", "active"]),
      l.has_audiobook ? (Q(), me(a, {
        key: 1,
        ref: "audiobookPlayer",
        visible: e.audiobook_open,
        "edition-id": n.audiobook_edition_id,
        "manifest-url": n.audiobook_manifest_url,
        rendition: e.rendition,
        request: l.audiobook_request,
        onClose: t[4] || (t[4] = (v) => e.audiobook_open = !1)
      }, null, 8, ["visible", "edition-id", "manifest-url", "rendition", "request"])) : We("", !0),
      u(bo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.settings,
        "onUpdate:modelValue": [
          t[5] || (t[5] = (v) => e.menu.panels.settings = v),
          t[6] || (t[6] = (v) => l.on_panel_model_update("settings", v))
        ],
        onAfterLeave: t[7] || (t[7] = (v) => l.on_panel_after_leave("settings")),
        contained: "",
        "z-index": "234"
      }, {
        default: _(() => [
          u(s, {
            settings: e.settings,
            onUpdate: l.update_settings,
            onOpenThemes: l.open_theme_dialog
          }, null, 8, ["settings", "onUpdate", "onOpenThemes"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(bo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.toc,
        "onUpdate:modelValue": [
          t[8] || (t[8] = (v) => e.menu.panels.toc = v),
          t[9] || (t[9] = (v) => l.on_panel_model_update("toc", v))
        ],
        onAfterLeave: t[10] || (t[10] = (v) => l.on_panel_after_leave("toc")),
        contained: "",
        "close-on-content-click": "",
        "z-index": "234"
      }, {
        default: _(() => [
          u(r, {
            ref: "bookTocComponent",
            meta: e.book_meta,
            toc_items: e.toc_items,
            "current-chapter": e.current_toc,
            "onClick:select": l.on_click_toc
          }, null, 8, ["meta", "toc_items", "current-chapter", "onClick:select"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(bo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.more,
        "onUpdate:modelValue": [
          t[14] || (t[14] = (v) => e.menu.panels.more = v),
          t[15] || (t[15] = (v) => l.on_panel_model_update("more", v))
        ],
        onAfterLeave: t[16] || (t[16] = (v) => l.on_panel_after_leave("more")),
        contained: "",
        "z-index": "234"
      }, {
        default: _(() => [
          u(ce, {
            variant: "tonal",
            onClick: l.on_open_annotations
          }, {
            default: _(() => t[55] || (t[55] = [
              q("返回笔记")
            ])),
            _: 1
          }, 8, ["onClick"]),
          u(d, {
            user: e.user,
            login: e.is_login,
            comments: e.book_reviews,
            sort: e.book_review_sort,
            onClose: t[11] || (t[11] = (v) => l.set_menu("hide")),
            onLogin: t[12] || (t[12] = (v) => e.show_login = !0),
            "onUpdate:sort": l.on_change_book_review_sort,
            onOpenSettings: t[13] || (t[13] = (v) => e.show_user_center = !0),
            onAdd: l.on_add_book_review,
            onJump: l.on_jump_review
          }, null, 8, ["user", "login", "comments", "sort", "onUpdate:sort", "onAdd", "onJump"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(En, {
        modelValue: e.show_login,
        "onUpdate:modelValue": t[17] || (t[17] = (v) => e.show_login = v),
        "max-width": "500",
        "z-index": "2999"
      }, {
        default: _(() => [
          u(c, { onLogin: l.on_book_login }, null, 8, ["onLogin"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(bo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.show_user_center,
        "onUpdate:modelValue": t[18] || (t[18] = (v) => e.show_user_center = v),
        contained: "",
        "z-index": "234"
      }, {
        default: _(() => [
          u(f, {
            messages: e.comments,
            user: e.user,
            onUpdate: l.on_login_user,
            onLogout: l.on_book_logout
          }, null, 8, ["messages", "user", "onUpdate", "onLogout"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(bo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.comments,
        "onUpdate:modelValue": [
          t[21] || (t[21] = (v) => e.menu.panels.comments = v),
          t[22] || (t[22] = (v) => l.on_panel_model_update("comments", v))
        ],
        onAfterLeave: t[23] || (t[23] = (v) => l.on_panel_after_leave("comments")),
        contained: "",
        "z-index": "234"
      }, {
        default: _(() => [
          u(ce, {
            variant: "tonal",
            onClick: l.on_open_annotations
          }, {
            default: _(() => t[56] || (t[56] = [
              q("返回笔记")
            ])),
            _: 1
          }, 8, ["onClick"]),
          u(m, {
            login: e.is_login,
            comments: e.comments,
            onClose: t[19] || (t[19] = (v) => l.set_menu("hide")),
            onLogin: t[20] || (t[20] = (v) => l.set_menu("more")),
            onAdd_review: l.on_add_review
          }, null, 8, ["login", "comments", "onAdd_review"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(bo, {
        class: "fixed mb-14 annotation-bottom-sheet",
        "max-height": "90%",
        modelValue: e.menu.panels.annotations,
        "onUpdate:modelValue": [
          t[27] || (t[27] = (v) => e.menu.panels.annotations = v),
          t[28] || (t[28] = (v) => l.on_panel_model_update("annotations", v))
        ],
        onAfterLeave: t[29] || (t[29] = (v) => l.on_panel_after_leave("annotations")),
        contained: "",
        "z-index": "234",
        "aria-label": "阅读笔记"
      }, {
        default: _(() => [
          u(bt, null, {
            default: _(() => [
              u(Zl, { density: "compact" }, {
                append: _(() => [
                  e.settings.notes_enabled ? (Q(), me(ce, {
                    key: 0,
                    icon: "mdi-refresh",
                    title: "刷新笔记",
                    "aria-label": "刷新笔记",
                    loading: e.annotations_loading,
                    onClick: l.load_annotations
                  }, null, 8, ["loading", "onClick"])) : We("", !0),
                  u(ce, {
                    icon: "mdi-close",
                    title: "关闭笔记",
                    "aria-label": "关闭笔记",
                    onClick: t[24] || (t[24] = (v) => l.set_menu("hide"))
                  })
                ]),
                default: _(() => [
                  u(pv, null, {
                    default: _(() => t[57] || (t[57] = [
                      q("笔记")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              e.settings.notes_enabled ? (Q(), Re("div", hk, [
                ue("span", gk, Oe(e.selection_annotation_cfi ? "此处笔记" : "笔记"), 1),
                e.selection_annotation_cfi ? (Q(), me(ce, {
                  key: 0,
                  variant: "tonal",
                  onClick: l.on_open_annotations
                }, {
                  default: _(() => t[58] || (t[58] = [
                    q("查看全部")
                  ])),
                  _: 1
                }, 8, ["onClick"])) : We("", !0),
                u(ce, {
                  variant: "tonal",
                  disabled: !e.settings.show_comments || !e.current_toc,
                  onClick: l.open_chapter_comments
                }, {
                  default: _(() => t[59] || (t[59] = [
                    q("当前章评")
                  ])),
                  _: 1
                }, 8, ["disabled", "onClick"]),
                u(ce, {
                  variant: "tonal",
                  "aria-label": "本书评论",
                  onClick: l.on_open_comments
                }, {
                  default: _(() => [
                    e.unread_count ? (Q(), me(Mc, {
                      key: 0,
                      color: "error",
                      content: e.unread_count
                    }, {
                      default: _(() => t[60] || (t[60] = [
                        q("本书评论")
                      ])),
                      _: 1
                    }, 8, ["content"])) : (Q(), Re("span", yk, "本书评论"))
                  ]),
                  _: 1
                }, 8, ["onClick"])
              ])) : We("", !0),
              e.settings.notes_enabled ? e.settings.show_comments ? We("", !0) : (Q(), me(Jt, {
                key: 2,
                class: "py-0"
              }, {
                default: _(() => t[63] || (t[63] = [
                  q("章节段落评论已关闭，可在设置中开启。")
                ])),
                _: 1
              })) : (Q(), me(Jt, { key: 1 }, {
                default: _(() => [
                  t[62] || (t[62] = q("笔记已关闭，已有数据会保留。 ")),
                  u(ce, {
                    variant: "text",
                    onClick: t[25] || (t[25] = (v) => l.set_menu("settings"))
                  }, {
                    default: _(() => t[61] || (t[61] = [
                      q("前往设置")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })),
              e.settings.notes_enabled ? (Q(), me(h, {
                key: 3,
                annotations: l.visible_annotations,
                loading: e.annotations_loading,
                error: e.annotations_error,
                "toolbar-enabled": e.settings.show_selection_toolbar,
                "selection-cfi": e.selection_annotation_cfi,
                onOpenSettings: t[26] || (t[26] = (v) => l.set_menu("settings")),
                onLocate: l.locate_annotation
              }, null, 8, ["annotations", "loading", "error", "toolbar-enabled", "selection-cfi", "onLocate"])) : We("", !0)
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(bo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.ai,
        "onUpdate:modelValue": [
          t[30] || (t[30] = (v) => e.menu.panels.ai = v),
          t[31] || (t[31] = (v) => l.on_panel_model_update("ai", v))
        ],
        onAfterLeave: t[32] || (t[32] = (v) => l.on_panel_after_leave("ai")),
        contained: "",
        "z-index": "234"
      }, {
        default: _(() => [
          u(bt, { title: "开发中" })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      u(En, {
        modelValue: e.annotation_editor_open,
        "onUpdate:modelValue": t[37] || (t[37] = (v) => e.annotation_editor_open = v),
        class: "annotation-editor-dialog",
        "max-width": "520",
        "aria-labelledby": "annotation-editor-title",
        onAfterLeave: l.on_annotation_editor_closed
      }, {
        default: _(() => [
          u(bt, null, {
            default: _(() => [
              u(ao, { id: "annotation-editor-title" }, {
                default: _(() => t[64] || (t[64] = [
                  q("写想法")
                ])),
                _: 1
              }),
              u(Jt, null, {
                default: _(() => {
                  var v;
                  return [
                    ue("blockquote", pk, Oe(e.selected_location.quote_text), 1),
                    u(mk, {
                      ref: "annotationEditorContent",
                      modelValue: e.annotation_editor_content,
                      "onUpdate:modelValue": [
                        t[33] || (t[33] = (g) => e.annotation_editor_content = g),
                        t[34] || (t[34] = (g) => e.annotation_editor_error = "")
                      ],
                      class: "mt-4",
                      label: "笔记内容",
                      rows: "4",
                      autofocus: "",
                      "error-messages": e.annotation_editor_error
                    }, null, 8, ["modelValue", "error-messages"]),
                    u(rk, {
                      modelValue: e.annotation_editor_private,
                      "onUpdate:modelValue": t[35] || (t[35] = (g) => e.annotation_editor_private = g),
                      class: "annotation-visibility",
                      label: "公开范围",
                      "aria-label": "公开范围",
                      items: [{ title: "公开", value: !1 }, { title: "私密", value: !0 }],
                      "hide-details": ""
                    }, null, 8, ["modelValue"]),
                    ((v = e.annotation_repository) == null ? void 0 : v.source) === "localStorage" ? (Q(), Re("p", bk, "本地模式的笔记仅保存在当前浏览器。")) : We("", !0)
                  ];
                }),
                _: 1
              }),
              u(Po, null, {
                default: _(() => [
                  u(Sl),
                  u(ce, {
                    onClick: t[36] || (t[36] = (v) => e.annotation_editor_open = !1)
                  }, {
                    default: _(() => t[65] || (t[65] = [
                      q("取消")
                    ])),
                    _: 1
                  }),
                  u(ce, {
                    color: "primary",
                    loading: e.annotation_saving,
                    onClick: l.save_note
                  }, {
                    default: _(() => t[66] || (t[66] = [
                      q("保存")
                    ])),
                    _: 1
                  }, 8, ["loading", "onClick"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue", "onAfterLeave"]),
      u(dk, {
        modelValue: e.annotation_feedback_visible,
        "onUpdate:modelValue": t[39] || (t[39] = (v) => e.annotation_feedback_visible = v),
        class: "annotation-feedback",
        color: e.annotation_feedback_error ? "error" : "primary",
        timeout: e.annotation_feedback_error ? -1 : 5e3
      }, {
        actions: _(() => [
          u(ce, {
            variant: "text",
            onClick: t[38] || (t[38] = (v) => e.annotation_feedback_visible = !1)
          }, {
            default: _(() => t[67] || (t[67] = [
              q("关闭")
            ])),
            _: 1
          })
        ]),
        default: _(() => [
          q(Oe(e.annotation_feedback_message) + " ", 1)
        ]),
        _: 1
      }, 8, ["modelValue", "color", "timeout"]),
      (Q(!0), Re(Ee, null, jt(e.selection_preview_rects, (v, g) => (Q(), Re("div", {
        key: g,
        class: "selection-preview",
        style: on(v),
        "aria-hidden": "true"
      }, null, 4))), 128)),
      lt(ue("div", {
        id: "comments-toolbar",
        ref: "selectionToolbar",
        role: "group",
        "aria-label": "选中文字操作",
        style: on(`left: ${e.toolbar_left}px; top: ${e.toolbar_top}px;`)
      }, [
        u(Zl, {
          density: "compact",
          border: "",
          dense: "",
          floating: "",
          elevation: "10",
          rounded: ""
        }, {
          default: _(() => [
            u(ce, { onClick: l.copy_selection }, {
              default: _(() => t[68] || (t[68] = [
                q("复制")
              ])),
              _: 1
            }, 8, ["onClick"]),
            u(Zt, { vertical: "" }),
            e.settings.notes_enabled ? (Q(), Re(Ee, { key: 0 }, [
              u(ce, {
                loading: e.annotation_saving,
                onClick: l.save_highlight
              }, {
                default: _(() => t[69] || (t[69] = [
                  q("划线")
                ])),
                _: 1
              }, 8, ["loading", "onClick"]),
              u(Zt, { vertical: "" }),
              u(ce, {
                disabled: e.annotation_saving,
                onClick: l.open_note_editor
              }, {
                default: _(() => t[70] || (t[70] = [
                  q("写想法")
                ])),
                _: 1
              }, 8, ["disabled", "onClick"]),
              u(Zt, { vertical: "" }),
              u(ce, {
                disabled: e.annotation_saving,
                onClick: l.on_view_selection_notes
              }, {
                default: _(() => t[71] || (t[71] = [
                  q("看想法")
                ])),
                _: 1
              }, 8, ["disabled", "onClick"]),
              u(Zt, { vertical: "" })
            ], 64)) : We("", !0),
            l.has_audiobook ? (Q(), me(ce, {
              key: 1,
              onClick: l.on_click_toolbar_listen
            }, {
              default: _(() => t[72] || (t[72] = [
                q("从这里听")
              ])),
              _: 1
            }, 8, ["onClick"])) : We("", !0),
            l.has_audiobook ? (Q(), me(Zt, {
              key: 2,
              vertical: ""
            })) : We("", !0)
          ]),
          _: 1
        })
      ], 4), [
        [hn, l.is_toolbar_visible()]
      ]),
      u(R1, {
        id: "main",
        class: "pa-0"
      }, {
        default: _(() => [
          u(Fo, {
            modelValue: e.loading,
            "onUpdate:modelValue": t[40] || (t[40] = (v) => e.loading = v),
            "z-index": "auto",
            class: "align-center justify-center",
            persistent: ""
          }, {
            default: _(() => [
              u(tm, {
                indeterminate: "",
                size: "64",
                color: "primary"
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          u(En, {
            modelValue: e.showTimeoutDialog,
            "onUpdate:modelValue": t[42] || (t[42] = (v) => e.showTimeoutDialog = v),
            "max-width": "500px"
          }, {
            default: _(() => [
              u(bt, null, {
                default: _(() => [
                  u(ao, { class: "text-h5 text-center" }, {
                    default: _(() => t[73] || (t[73] = [
                      q("加载超时")
                    ])),
                    _: 1
                  }),
                  u(Jt, { class: "text-center" }, {
                    default: _(() => t[74] || (t[74] = [
                      q(" 电子书加载超时，可能是网络问题或文件格式不支持。 ")
                    ])),
                    _: 1
                  }),
                  u(Po, { class: "justify-center" }, {
                    default: _(() => [
                      u(ce, {
                        color: "primary",
                        variant: "text",
                        onClick: t[41] || (t[41] = (v) => e.showTimeoutDialog = !1)
                      }, {
                        default: _(() => t[75] || (t[75] = [
                          q(" 关闭 ")
                        ])),
                        _: 1
                      }),
                      u(ce, {
                        color: "primary",
                        variant: "flat",
                        onClick: l.retryLoad
                      }, {
                        default: _(() => t[76] || (t[76] = [
                          q(" 重试 ")
                        ])),
                        _: 1
                      }, 8, ["onClick"])
                    ]),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          ue("div", {
            id: "status-bar-top",
            class: rn(e.settings.theme),
            style: on(l.status_bar_style)
          }, [
            ue("div", _k, Oe(e.current_toc_title), 1),
            ue("div", wk, " (" + Oe(l.readingProgress) + ") ", 1)
          ], 6),
          t[77] || (t[77] = ue("div", { id: "reader" }, null, -1)),
          ue("div", {
            id: "status-bar-bottom",
            class: rn(e.settings.theme),
            style: on(l.status_bar_style)
          }, [
            ue("div", kk, [
              ue("div", {
                class: "progress-bar",
                style: on({ width: l.readingProgress })
              }, null, 4)
            ])
          ], 6)
        ]),
        _: 1
      }),
      u(En, {
        modelValue: e.show_theme_dialog,
        "onUpdate:modelValue": t[44] || (t[44] = (v) => e.show_theme_dialog = v),
        "max-width": "520",
        scrollable: "",
        fullscreen: e.$vuetify.display.smAndDown
      }, {
        default: _(() => [
          u(bt, null, {
            default: _(() => [
              u(ao, { class: "d-flex align-center" }, {
                default: _(() => [
                  t[78] || (t[78] = ue("span", null, "阅读皮肤", -1)),
                  u(Sl),
                  u(ce, {
                    icon: "mdi-close",
                    variant: "text",
                    density: "compact",
                    onClick: t[43] || (t[43] = (v) => e.show_theme_dialog = !1)
                  })
                ]),
                _: 1
              }),
              u(Jt, null, {
                default: _(() => [
                  (Q(!0), Re(Ee, null, jt(l.theme_groups, (v) => (Q(), Re(Ee, {
                    key: v.mode
                  }, [
                    ue("div", Sk, Oe(v.label), 1),
                    ue("div", Ck, [
                      (Q(!0), Re(Ee, null, jt(v.items, (g) => (Q(), Re("div", {
                        class: "theme-cell",
                        key: g.id
                      }, [
                        ue("div", {
                          class: rn(["theme-card", { active: e.settings.theme === g.id }]),
                          style: on(l.theme_card_style(g)),
                          onClick: (y) => l.pick_theme(g)
                        }, [
                          ue("span", {
                            class: "theme-sample",
                            style: on({ color: g.text })
                          }, Oe(g.sample), 5),
                          g.id === e.settings.theme_day || g.id === e.settings.theme_night ? (Q(), me(De, {
                            key: 0,
                            class: "theme-check",
                            size: "18",
                            title: g.mode === "day" ? "当前白天皮肤" : "当前夜晚皮肤"
                          }, {
                            default: _(() => t[79] || (t[79] = [
                              q("mdi-check-circle")
                            ])),
                            _: 2
                          }, 1032, ["title"])) : We("", !0),
                          e.settings.theme === g.id ? (Q(), Re("span", xk, "使用中")) : We("", !0)
                        ], 14, Ek),
                        ue("div", Vk, Oe(g.name), 1)
                      ]))), 128))
                    ])
                  ], 64))), 128))
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue", "fullscreen"])
    ]),
    _: 1
  }, 8, ["theme"]);
}
const Tk = /* @__PURE__ */ On(vk, [["render", Nk], ["__scopeId", "data-v-b6ee7ee9"]]), Ok = {
  name: "CandleReader",
  computed: {},
  mounted: function() {
  },
  props: {
    book_url: {
      type: String,
      required: !0
    },
    display_url: {
      type: String,
      required: !0
    },
    debug: {
      type: Boolean,
      default: !1
    },
    themes_css: {
      type: String,
      default: "theme.css"
    },
    book_id: {
      type: [Number, String],
      default: null
    },
    annotation_callbacks: {
      type: Object,
      default: null
    },
    audiobook_edition_id: {
      type: [Number, String],
      default: null
    },
    audiobook_manifest_url: {
      type: String,
      default: ""
    }
  },
  data: () => ({})
};
function Ak(e, t, n, o, i, l) {
  const a = Tk;
  return Q(), me(a, {
    book_url: n.book_url,
    display_url: n.display_url,
    debug: n.debug,
    themes_css: n.themes_css,
    initial_book_id: n.book_id,
    annotation_callbacks: n.annotation_callbacks,
    audiobook_edition_id: n.audiobook_edition_id,
    audiobook_manifest_url: n.audiobook_manifest_url
  }, null, 8, ["book_url", "display_url", "debug", "themes_css", "initial_book_id", "annotation_callbacks", "audiobook_edition_id", "audiobook_manifest_url"]);
}
const Ik = /* @__PURE__ */ On(Ok, [["render", Ak]]);
class Pk {
  constructor(t, n) {
    var o = "https://api.talebook.org";
    const i = My(Ik, n);
    Ub(i, {
      server: n.server || o
    }), i.mount(t);
  }
}
export {
  Pk as Reader
};
