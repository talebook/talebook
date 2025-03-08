var Su = {};
/**
* @vue/shared v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function vn(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const De = Su.NODE_ENV !== "production" ? Object.freeze({}) : {}, wi = Su.NODE_ENV !== "production" ? Object.freeze([]) : [], qe = () => {
}, Lf = () => !1, fo = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Wo = (e) => e.startsWith("onUpdate:"), Fe = Object.assign, Hs = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, Bf = Object.prototype.hasOwnProperty, Se = (e, t) => Bf.call(e, t), te = Array.isArray, qn = (e) => hr(e) === "[object Map]", Eu = (e) => hr(e) === "[object Set]", re = (e) => typeof e == "function", Me = (e) => typeof e == "string", An = (e) => typeof e == "symbol", Ne = (e) => e !== null && typeof e == "object", js = (e) => (Ne(e) || re(e)) && re(e.then) && re(e.catch), Cu = Object.prototype.toString, hr = (e) => Cu.call(e), zs = (e) => hr(e).slice(8, -1), ku = (e) => hr(e) === "[object Object]", Us = (e) => Me(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Wi = /* @__PURE__ */ vn(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), Rf = /* @__PURE__ */ vn(
  "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
), pr = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, Hf = /-(\w)/g, tt = pr(
  (e) => e.replace(Hf, (t, n) => n ? n.toUpperCase() : "")
), jf = /\B([A-Z])/g, Tn = pr(
  (e) => e.replace(jf, "-$1").toLowerCase()
), Tt = pr((e) => e.charAt(0).toUpperCase() + e.slice(1)), Wn = pr(
  (e) => e ? `on${Tt(e)}` : ""
), Dn = (e, t) => !Object.is(e, t), Ii = (e, ...t) => {
  for (let n = 0; n < e.length; n++)
    e[n](...t);
}, Ko = (e, t, n, i = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: i,
    value: n
  });
}, zf = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
}, Uf = (e) => {
  const t = Me(e) ? Number(e) : NaN;
  return isNaN(t) ? e : t;
};
let Hl;
const mo = () => Hl || (Hl = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function yr(e) {
  if (te(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const i = e[n], o = Me(i) ? Yf(i) : yr(i);
      if (o)
        for (const r in o)
          t[r] = o[r];
    }
    return t;
  } else if (Me(e) || Ne(e))
    return e;
}
const Wf = /;(?![^(]*\))/g, Kf = /:([^]+)/, Gf = /\/\*[^]*?\*\//g;
function Yf(e) {
  const t = {};
  return e.replace(Gf, "").split(Wf).forEach((n) => {
    if (n) {
      const i = n.split(Kf);
      i.length > 1 && (t[i[0].trim()] = i[1].trim());
    }
  }), t;
}
function br(e) {
  let t = "";
  if (Me(e))
    t = e;
  else if (te(e))
    for (let n = 0; n < e.length; n++) {
      const i = br(e[n]);
      i && (t += i + " ");
    }
  else if (Ne(e))
    for (const n in e)
      e[n] && (t += n + " ");
  return t.trim();
}
const qf = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot", Zf = "svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,text,textPath,title,tspan,unknown,use,view", Xf = "annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics", Jf = /* @__PURE__ */ vn(qf), Qf = /* @__PURE__ */ vn(Zf), em = /* @__PURE__ */ vn(Xf), tm = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", nm = /* @__PURE__ */ vn(tm);
function Nu(e) {
  return !!e || e === "";
}
const xu = (e) => !!(e && e.__v_isRef === !0), ft = (e) => Me(e) ? e : e == null ? "" : te(e) || Ne(e) && (e.toString === Cu || !re(e.toString)) ? xu(e) ? ft(e.value) : JSON.stringify(e, Vu, 2) : String(e), Vu = (e, t) => xu(t) ? Vu(e, t.value) : qn(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (n, [i, o], r) => (n[Lr(i, r) + " =>"] = o, n),
    {}
  )
} : Eu(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((n) => Lr(n))
} : An(t) ? Lr(t) : Ne(t) && !te(t) && !ku(t) ? String(t) : t, Lr = (e, t = "") => {
  var n;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    An(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e
  );
};
var Te = {};
function Pt(e, ...t) {
  console.warn(`[Vue warn] ${e}`, ...t);
}
let dt;
class Ou {
  constructor(t = !1) {
    this.detached = t, this._active = !0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.parent = dt, !t && dt && (this.index = (dt.scopes || (dt.scopes = [])).push(
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
      const n = dt;
      try {
        return dt = this, t();
      } finally {
        dt = n;
      }
    } else Te.NODE_ENV !== "production" && Pt("cannot run an inactive effect scope.");
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    dt = this;
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    dt = this.parent;
  }
  stop(t) {
    if (this._active) {
      let n, i;
      for (n = 0, i = this.effects.length; n < i; n++)
        this.effects[n].stop();
      for (n = 0, i = this.cleanups.length; n < i; n++)
        this.cleanups[n]();
      if (this.scopes)
        for (n = 0, i = this.scopes.length; n < i; n++)
          this.scopes[n].stop(!0);
      if (!this.detached && this.parent && !t) {
        const o = this.parent.scopes.pop();
        o && o !== this && (this.parent.scopes[this.index] = o, o.index = this.index);
      }
      this.parent = void 0, this._active = !1;
    }
  }
}
function Ws(e) {
  return new Ou(e);
}
function im() {
  return dt;
}
function jt(e, t = !1) {
  dt ? dt.cleanups.push(e) : Te.NODE_ENV !== "production" && !t && Pt(
    "onScopeDispose() is called when there is no active effect scope to be associated with."
  );
}
let Ve;
const Br = /* @__PURE__ */ new WeakSet();
class Du {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, dt && dt.active && dt.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, Br.has(this) && (Br.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Pu(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, jl(this), Au(this);
    const t = Ve, n = Lt;
    Ve = this, Lt = !0;
    try {
      return this.fn();
    } finally {
      Te.NODE_ENV !== "production" && Ve !== this && Pt(
        "Active effect was not restored correctly - this is likely a Vue internal bug."
      ), Iu(this), Ve = t, Lt = n, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep)
        Ys(t);
      this.deps = this.depsTail = void 0, jl(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? Br.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    as(this) && this.run();
  }
  get dirty() {
    return as(this);
  }
}
let Tu = 0, Ki, Gi;
function Pu(e, t = !1) {
  if (e.flags |= 8, t) {
    e.next = Gi, Gi = e;
    return;
  }
  e.next = Ki, Ki = e;
}
function Ks() {
  Tu++;
}
function Gs() {
  if (--Tu > 0)
    return;
  if (Gi) {
    let t = Gi;
    for (Gi = void 0; t; ) {
      const n = t.next;
      t.next = void 0, t.flags &= -9, t = n;
    }
  }
  let e;
  for (; Ki; ) {
    let t = Ki;
    for (Ki = void 0; t; ) {
      const n = t.next;
      if (t.next = void 0, t.flags &= -9, t.flags & 1)
        try {
          t.trigger();
        } catch (i) {
          e || (e = i);
        }
      t = n;
    }
  }
  if (e) throw e;
}
function Au(e) {
  for (let t = e.deps; t; t = t.nextDep)
    t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function Iu(e) {
  let t, n = e.depsTail, i = n;
  for (; i; ) {
    const o = i.prevDep;
    i.version === -1 ? (i === n && (n = o), Ys(i), om(i)) : t = i, i.dep.activeLink = i.prevActiveLink, i.prevActiveLink = void 0, i = o;
  }
  e.deps = t, e.depsTail = n;
}
function as(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (t.dep.version !== t.version || t.dep.computed && ($u(t.dep.computed) || t.dep.version !== t.version))
      return !0;
  return !!e._dirty;
}
function $u(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Qi))
    return;
  e.globalVersion = Qi;
  const t = e.dep;
  if (e.flags |= 2, t.version > 0 && !e.isSSR && e.deps && !as(e)) {
    e.flags &= -3;
    return;
  }
  const n = Ve, i = Lt;
  Ve = e, Lt = !0;
  try {
    Au(e);
    const o = e.fn(e._value);
    (t.version === 0 || Dn(o, e._value)) && (e._value = o, t.version++);
  } catch (o) {
    throw t.version++, o;
  } finally {
    Ve = n, Lt = i, Iu(e), e.flags &= -3;
  }
}
function Ys(e, t = !1) {
  const { dep: n, prevSub: i, nextSub: o } = e;
  if (i && (i.nextSub = o, e.prevSub = void 0), o && (o.prevSub = i, e.nextSub = void 0), Te.NODE_ENV !== "production" && n.subsHead === e && (n.subsHead = o), n.subs === e && (n.subs = i, !i && n.computed)) {
    n.computed.flags &= -5;
    for (let r = n.computed.deps; r; r = r.nextDep)
      Ys(r, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function om(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let Lt = !0;
const Mu = [];
function gn() {
  Mu.push(Lt), Lt = !1;
}
function hn() {
  const e = Mu.pop();
  Lt = e === void 0 ? !0 : e;
}
function jl(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const n = Ve;
    Ve = void 0;
    try {
      t();
    } finally {
      Ve = n;
    }
  }
}
let Qi = 0;
class rm {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class qs {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, Te.NODE_ENV !== "production" && (this.subsHead = void 0);
  }
  track(t) {
    if (!Ve || !Lt || Ve === this.computed)
      return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== Ve)
      n = this.activeLink = new rm(Ve, this), Ve.deps ? (n.prevDep = Ve.depsTail, Ve.depsTail.nextDep = n, Ve.depsTail = n) : Ve.deps = Ve.depsTail = n, Fu(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const i = n.nextDep;
      i.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = i), n.prevDep = Ve.depsTail, n.nextDep = void 0, Ve.depsTail.nextDep = n, Ve.depsTail = n, Ve.deps === n && (Ve.deps = i);
    }
    return Te.NODE_ENV !== "production" && Ve.onTrack && Ve.onTrack(
      Fe(
        {
          effect: Ve
        },
        t
      )
    ), n;
  }
  trigger(t) {
    this.version++, Qi++, this.notify(t);
  }
  notify(t) {
    Ks();
    try {
      if (Te.NODE_ENV !== "production")
        for (let n = this.subsHead; n; n = n.nextSub)
          n.sub.onTrigger && !(n.sub.flags & 8) && n.sub.onTrigger(
            Fe(
              {
                effect: n.sub
              },
              t
            )
          );
      for (let n = this.subs; n; n = n.prevSub)
        n.sub.notify() && n.sub.dep.notify();
    } finally {
      Gs();
    }
  }
}
function Fu(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let i = t.deps; i; i = i.nextDep)
        Fu(i);
    }
    const n = e.dep.subs;
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), Te.NODE_ENV !== "production" && e.dep.subsHead === void 0 && (e.dep.subsHead = e), e.dep.subs = e;
  }
}
const Go = /* @__PURE__ */ new WeakMap(), Zn = Symbol(
  Te.NODE_ENV !== "production" ? "Object iterate" : ""
), us = Symbol(
  Te.NODE_ENV !== "production" ? "Map keys iterate" : ""
), eo = Symbol(
  Te.NODE_ENV !== "production" ? "Array iterate" : ""
);
function Ye(e, t, n) {
  if (Lt && Ve) {
    let i = Go.get(e);
    i || Go.set(e, i = /* @__PURE__ */ new Map());
    let o = i.get(n);
    o || (i.set(n, o = new qs()), o.map = i, o.key = n), Te.NODE_ENV !== "production" ? o.track({
      target: e,
      type: t,
      key: n
    }) : o.track();
  }
}
function Gt(e, t, n, i, o, r) {
  const s = Go.get(e);
  if (!s) {
    Qi++;
    return;
  }
  const l = (a) => {
    a && (Te.NODE_ENV !== "production" ? a.trigger({
      target: e,
      type: t,
      key: n,
      newValue: i,
      oldValue: o,
      oldTarget: r
    }) : a.trigger());
  };
  if (Ks(), t === "clear")
    s.forEach(l);
  else {
    const a = te(e), d = a && Us(n);
    if (a && n === "length") {
      const u = Number(i);
      s.forEach((c, m) => {
        (m === "length" || m === eo || !An(m) && m >= u) && l(c);
      });
    } else
      switch ((n !== void 0 || s.has(void 0)) && l(s.get(n)), d && l(s.get(eo)), t) {
        case "add":
          a ? d && l(s.get("length")) : (l(s.get(Zn)), qn(e) && l(s.get(us)));
          break;
        case "delete":
          a || (l(s.get(Zn)), qn(e) && l(s.get(us)));
          break;
        case "set":
          qn(e) && l(s.get(Zn));
          break;
      }
  }
  Gs();
}
function sm(e, t) {
  const n = Go.get(e);
  return n && n.get(t);
}
function fi(e) {
  const t = J(e);
  return t === e ? t : (Ye(t, "iterate", eo), vt(e) ? t : t.map(rt));
}
function _r(e) {
  return Ye(e = J(e), "iterate", eo), e;
}
const lm = {
  __proto__: null,
  [Symbol.iterator]() {
    return Rr(this, Symbol.iterator, rt);
  },
  concat(...e) {
    return fi(this).concat(
      ...e.map((t) => te(t) ? fi(t) : t)
    );
  },
  entries() {
    return Rr(this, "entries", (e) => (e[1] = rt(e[1]), e));
  },
  every(e, t) {
    return nn(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return nn(this, "filter", e, t, (n) => n.map(rt), arguments);
  },
  find(e, t) {
    return nn(this, "find", e, t, rt, arguments);
  },
  findIndex(e, t) {
    return nn(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return nn(this, "findLast", e, t, rt, arguments);
  },
  findLastIndex(e, t) {
    return nn(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return nn(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return Hr(this, "includes", e);
  },
  indexOf(...e) {
    return Hr(this, "indexOf", e);
  },
  join(e) {
    return fi(this).join(e);
  },
  // keys() iterator only reads `length`, no optimisation required
  lastIndexOf(...e) {
    return Hr(this, "lastIndexOf", e);
  },
  map(e, t) {
    return nn(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return $i(this, "pop");
  },
  push(...e) {
    return $i(this, "push", e);
  },
  reduce(e, ...t) {
    return zl(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return zl(this, "reduceRight", e, t);
  },
  shift() {
    return $i(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return nn(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return $i(this, "splice", e);
  },
  toReversed() {
    return fi(this).toReversed();
  },
  toSorted(e) {
    return fi(this).toSorted(e);
  },
  toSpliced(...e) {
    return fi(this).toSpliced(...e);
  },
  unshift(...e) {
    return $i(this, "unshift", e);
  },
  values() {
    return Rr(this, "values", rt);
  }
};
function Rr(e, t, n) {
  const i = _r(e), o = i[t]();
  return i !== e && !vt(e) && (o._next = o.next, o.next = () => {
    const r = o._next();
    return r.value && (r.value = n(r.value)), r;
  }), o;
}
const am = Array.prototype;
function nn(e, t, n, i, o, r) {
  const s = _r(e), l = s !== e && !vt(e), a = s[t];
  if (a !== am[t]) {
    const c = a.apply(e, r);
    return l ? rt(c) : c;
  }
  let d = n;
  s !== e && (l ? d = function(c, m) {
    return n.call(this, rt(c), m, e);
  } : n.length > 2 && (d = function(c, m) {
    return n.call(this, c, m, e);
  }));
  const u = a.call(s, d, i);
  return l && o ? o(u) : u;
}
function zl(e, t, n, i) {
  const o = _r(e);
  let r = n;
  return o !== e && (vt(e) ? n.length > 3 && (r = function(s, l, a) {
    return n.call(this, s, l, a, e);
  }) : r = function(s, l, a) {
    return n.call(this, s, rt(l), a, e);
  }), o[t](r, ...i);
}
function Hr(e, t, n) {
  const i = J(e);
  Ye(i, "iterate", eo);
  const o = i[t](...n);
  return (o === -1 || o === !1) && to(n[0]) ? (n[0] = J(n[0]), i[t](...n)) : o;
}
function $i(e, t, n = []) {
  gn(), Ks();
  const i = J(e)[t].apply(e, n);
  return Gs(), hn(), i;
}
const um = /* @__PURE__ */ vn("__proto__,__v_isRef,__isVue"), Lu = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(An)
);
function cm(e) {
  An(e) || (e = String(e));
  const t = J(this);
  return Ye(t, "has", e), t.hasOwnProperty(e);
}
class Bu {
  constructor(t = !1, n = !1) {
    this._isReadonly = t, this._isShallow = n;
  }
  get(t, n, i) {
    const o = this._isReadonly, r = this._isShallow;
    if (n === "__v_isReactive")
      return !o;
    if (n === "__v_isReadonly")
      return o;
    if (n === "__v_isShallow")
      return r;
    if (n === "__v_raw")
      return i === (o ? r ? Wu : Uu : r ? zu : ju).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(i) ? t : void 0;
    const s = te(t);
    if (!o) {
      let a;
      if (s && (a = lm[n]))
        return a;
      if (n === "hasOwnProperty")
        return cm;
    }
    const l = Reflect.get(
      t,
      n,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      Ae(t) ? t : i
    );
    return (An(n) ? Lu.has(n) : um(n)) || (o || Ye(t, "get", n), r) ? l : Ae(l) ? s && Us(n) ? l : l.value : Ne(l) ? o ? vo(l) : et(l) : l;
  }
}
class Ru extends Bu {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, i, o) {
    let r = t[n];
    if (!this._isShallow) {
      const a = mn(r);
      if (!vt(i) && !mn(i) && (r = J(r), i = J(i)), !te(t) && Ae(r) && !Ae(i))
        return a ? !1 : (r.value = i, !0);
    }
    const s = te(t) && Us(n) ? Number(n) < t.length : Se(t, n), l = Reflect.set(
      t,
      n,
      i,
      Ae(t) ? t : o
    );
    return t === J(o) && (s ? Dn(i, r) && Gt(t, "set", n, i, r) : Gt(t, "add", n, i)), l;
  }
  deleteProperty(t, n) {
    const i = Se(t, n), o = t[n], r = Reflect.deleteProperty(t, n);
    return r && i && Gt(t, "delete", n, void 0, o), r;
  }
  has(t, n) {
    const i = Reflect.has(t, n);
    return (!An(n) || !Lu.has(n)) && Ye(t, "has", n), i;
  }
  ownKeys(t) {
    return Ye(
      t,
      "iterate",
      te(t) ? "length" : Zn
    ), Reflect.ownKeys(t);
  }
}
class Hu extends Bu {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return Te.NODE_ENV !== "production" && Pt(
      `Set operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
  deleteProperty(t, n) {
    return Te.NODE_ENV !== "production" && Pt(
      `Delete operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
}
const dm = /* @__PURE__ */ new Ru(), fm = /* @__PURE__ */ new Hu(), mm = /* @__PURE__ */ new Ru(!0), vm = /* @__PURE__ */ new Hu(!0), cs = (e) => e, No = (e) => Reflect.getPrototypeOf(e);
function gm(e, t, n) {
  return function(...i) {
    const o = this.__v_raw, r = J(o), s = qn(r), l = e === "entries" || e === Symbol.iterator && s, a = e === "keys" && s, d = o[e](...i), u = n ? cs : t ? ds : rt;
    return !t && Ye(
      r,
      "iterate",
      a ? us : Zn
    ), {
      // iterator protocol
      next() {
        const { value: c, done: m } = d.next();
        return m ? { value: c, done: m } : {
          value: l ? [u(c[0]), u(c[1])] : u(c),
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
function xo(e) {
  return function(...t) {
    if (Te.NODE_ENV !== "production") {
      const n = t[0] ? `on key "${t[0]}" ` : "";
      Pt(
        `${Tt(e)} operation ${n}failed: target is readonly.`,
        J(this)
      );
    }
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function hm(e, t) {
  const n = {
    get(o) {
      const r = this.__v_raw, s = J(r), l = J(o);
      e || (Dn(o, l) && Ye(s, "get", o), Ye(s, "get", l));
      const { has: a } = No(s), d = t ? cs : e ? ds : rt;
      if (a.call(s, o))
        return d(r.get(o));
      if (a.call(s, l))
        return d(r.get(l));
      r !== s && r.get(o);
    },
    get size() {
      const o = this.__v_raw;
      return !e && Ye(J(o), "iterate", Zn), Reflect.get(o, "size", o);
    },
    has(o) {
      const r = this.__v_raw, s = J(r), l = J(o);
      return e || (Dn(o, l) && Ye(s, "has", o), Ye(s, "has", l)), o === l ? r.has(o) : r.has(o) || r.has(l);
    },
    forEach(o, r) {
      const s = this, l = s.__v_raw, a = J(l), d = t ? cs : e ? ds : rt;
      return !e && Ye(a, "iterate", Zn), l.forEach((u, c) => o.call(r, d(u), d(c), s));
    }
  };
  return Fe(
    n,
    e ? {
      add: xo("add"),
      set: xo("set"),
      delete: xo("delete"),
      clear: xo("clear")
    } : {
      add(o) {
        !t && !vt(o) && !mn(o) && (o = J(o));
        const r = J(this);
        return No(r).has.call(r, o) || (r.add(o), Gt(r, "add", o, o)), this;
      },
      set(o, r) {
        !t && !vt(r) && !mn(r) && (r = J(r));
        const s = J(this), { has: l, get: a } = No(s);
        let d = l.call(s, o);
        d ? Te.NODE_ENV !== "production" && Ul(s, l, o) : (o = J(o), d = l.call(s, o));
        const u = a.call(s, o);
        return s.set(o, r), d ? Dn(r, u) && Gt(s, "set", o, r, u) : Gt(s, "add", o, r), this;
      },
      delete(o) {
        const r = J(this), { has: s, get: l } = No(r);
        let a = s.call(r, o);
        a ? Te.NODE_ENV !== "production" && Ul(r, s, o) : (o = J(o), a = s.call(r, o));
        const d = l ? l.call(r, o) : void 0, u = r.delete(o);
        return a && Gt(r, "delete", o, void 0, d), u;
      },
      clear() {
        const o = J(this), r = o.size !== 0, s = Te.NODE_ENV !== "production" ? qn(o) ? new Map(o) : new Set(o) : void 0, l = o.clear();
        return r && Gt(
          o,
          "clear",
          void 0,
          void 0,
          s
        ), l;
      }
    }
  ), [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ].forEach((o) => {
    n[o] = gm(o, e, t);
  }), n;
}
function wr(e, t) {
  const n = hm(e, t);
  return (i, o, r) => o === "__v_isReactive" ? !e : o === "__v_isReadonly" ? e : o === "__v_raw" ? i : Reflect.get(
    Se(n, o) && o in i ? n : i,
    o,
    r
  );
}
const pm = {
  get: /* @__PURE__ */ wr(!1, !1)
}, ym = {
  get: /* @__PURE__ */ wr(!1, !0)
}, bm = {
  get: /* @__PURE__ */ wr(!0, !1)
}, _m = {
  get: /* @__PURE__ */ wr(!0, !0)
};
function Ul(e, t, n) {
  const i = J(n);
  if (i !== n && t.call(e, i)) {
    const o = zs(e);
    Pt(
      `Reactive ${o} contains both the raw and reactive versions of the same object${o === "Map" ? " as keys" : ""}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`
    );
  }
}
const ju = /* @__PURE__ */ new WeakMap(), zu = /* @__PURE__ */ new WeakMap(), Uu = /* @__PURE__ */ new WeakMap(), Wu = /* @__PURE__ */ new WeakMap();
function wm(e) {
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
function Sm(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : wm(zs(e));
}
function et(e) {
  return mn(e) ? e : Sr(
    e,
    !1,
    dm,
    pm,
    ju
  );
}
function Em(e) {
  return Sr(
    e,
    !1,
    mm,
    ym,
    zu
  );
}
function vo(e) {
  return Sr(
    e,
    !0,
    fm,
    bm,
    Uu
  );
}
function Zt(e) {
  return Sr(
    e,
    !0,
    vm,
    _m,
    Wu
  );
}
function Sr(e, t, n, i, o) {
  if (!Ne(e))
    return Te.NODE_ENV !== "production" && Pt(
      `value cannot be made ${t ? "readonly" : "reactive"}: ${String(
        e
      )}`
    ), e;
  if (e.__v_raw && !(t && e.__v_isReactive))
    return e;
  const r = o.get(e);
  if (r)
    return r;
  const s = Sm(e);
  if (s === 0)
    return e;
  const l = new Proxy(
    e,
    s === 2 ? i : n
  );
  return o.set(e, l), l;
}
function Xn(e) {
  return mn(e) ? Xn(e.__v_raw) : !!(e && e.__v_isReactive);
}
function mn(e) {
  return !!(e && e.__v_isReadonly);
}
function vt(e) {
  return !!(e && e.__v_isShallow);
}
function to(e) {
  return e ? !!e.__v_raw : !1;
}
function J(e) {
  const t = e && e.__v_raw;
  return t ? J(t) : e;
}
function Ku(e) {
  return !Se(e, "__v_skip") && Object.isExtensible(e) && Ko(e, "__v_skip", !0), e;
}
const rt = (e) => Ne(e) ? et(e) : e, ds = (e) => Ne(e) ? vo(e) : e;
function Ae(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function ue(e) {
  return Gu(e, !1);
}
function he(e) {
  return Gu(e, !0);
}
function Gu(e, t) {
  return Ae(e) ? e : new Cm(e, t);
}
class Cm {
  constructor(t, n) {
    this.dep = new qs(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : J(t), this._value = n ? t : rt(t), this.__v_isShallow = n;
  }
  get value() {
    return Te.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, i = this.__v_isShallow || vt(t) || mn(t);
    t = i ? t : J(t), Dn(t, n) && (this._rawValue = t, this._value = i ? t : rt(t), Te.NODE_ENV !== "production" ? this.dep.trigger({
      target: this,
      type: "set",
      key: "value",
      newValue: t,
      oldValue: n
    }) : this.dep.trigger());
  }
}
function Xt(e) {
  return Ae(e) ? e.value : e;
}
const km = {
  get: (e, t, n) => t === "__v_raw" ? e : Xt(Reflect.get(e, t, n)),
  set: (e, t, n, i) => {
    const o = e[t];
    return Ae(o) && !Ae(n) ? (o.value = n, !0) : Reflect.set(e, t, n, i);
  }
};
function Yu(e) {
  return Xn(e) ? e : new Proxy(e, km);
}
function Zs(e) {
  Te.NODE_ENV !== "production" && !to(e) && Pt("toRefs() expects a reactive object but received a plain one.");
  const t = te(e) ? new Array(e.length) : {};
  for (const n in e)
    t[n] = qu(e, n);
  return t;
}
class Nm {
  constructor(t, n, i) {
    this._object = t, this._key = n, this._defaultValue = i, this.__v_isRef = !0, this._value = void 0;
  }
  get value() {
    const t = this._object[this._key];
    return this._value = t === void 0 ? this._defaultValue : t;
  }
  set value(t) {
    this._object[this._key] = t;
  }
  get dep() {
    return sm(J(this._object), this._key);
  }
}
class xm {
  constructor(t) {
    this._getter = t, this.__v_isRef = !0, this.__v_isReadonly = !0, this._value = void 0;
  }
  get value() {
    return this._value = this._getter();
  }
}
function ie(e, t, n) {
  return Ae(e) ? e : re(e) ? new xm(e) : Ne(e) && arguments.length > 1 ? qu(e, t, n) : ue(e);
}
function qu(e, t, n) {
  const i = e[t];
  return Ae(i) ? i : new Nm(e, t, n);
}
class Vm {
  constructor(t, n, i) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new qs(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Qi - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = i;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    Ve !== this)
      return Pu(this, !0), !0;
  }
  get value() {
    const t = Te.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track();
    return $u(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter ? this.setter(t) : Te.NODE_ENV !== "production" && Pt("Write operation failed: computed value is readonly");
  }
}
function Om(e, t, n = !1) {
  let i, o;
  re(e) ? i = e : (i = e.get, o = e.set);
  const r = new Vm(i, o, n);
  return Te.NODE_ENV !== "production" && t && !n && (r.onTrack = t.onTrack, r.onTrigger = t.onTrigger), r;
}
const Vo = {}, Yo = /* @__PURE__ */ new WeakMap();
let Kn;
function Dm(e, t = !1, n = Kn) {
  if (n) {
    let i = Yo.get(n);
    i || Yo.set(n, i = []), i.push(e);
  } else Te.NODE_ENV !== "production" && !t && Pt(
    "onWatcherCleanup() was called when there was no active watcher to associate with."
  );
}
function Tm(e, t, n = De) {
  const { immediate: i, deep: o, once: r, scheduler: s, augmentJob: l, call: a } = n, d = (x) => {
    (n.onWarn || Pt)(
      "Invalid watch source: ",
      x,
      "A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types."
    );
  }, u = (x) => o ? x : vt(x) || o === !1 || o === 0 ? un(x, 1) : un(x);
  let c, m, v, g, h = !1, w = !1;
  if (Ae(e) ? (m = () => e.value, h = vt(e)) : Xn(e) ? (m = () => u(e), h = !0) : te(e) ? (w = !0, h = e.some((x) => Xn(x) || vt(x)), m = () => e.map((x) => {
    if (Ae(x))
      return x.value;
    if (Xn(x))
      return u(x);
    if (re(x))
      return a ? a(x, 2) : x();
    Te.NODE_ENV !== "production" && d(x);
  })) : re(e) ? t ? m = a ? () => a(e, 2) : e : m = () => {
    if (v) {
      gn();
      try {
        v();
      } finally {
        hn();
      }
    }
    const x = Kn;
    Kn = c;
    try {
      return a ? a(e, 3, [g]) : e(g);
    } finally {
      Kn = x;
    }
  } : (m = qe, Te.NODE_ENV !== "production" && d(e)), t && o) {
    const x = m, N = o === !0 ? 1 / 0 : o;
    m = () => un(x(), N);
  }
  const C = im(), O = () => {
    c.stop(), C && Hs(C.effects, c);
  };
  if (r && t) {
    const x = t;
    t = (...N) => {
      x(...N), O();
    };
  }
  let P = w ? new Array(e.length).fill(Vo) : Vo;
  const M = (x) => {
    if (!(!(c.flags & 1) || !c.dirty && !x))
      if (t) {
        const N = c.run();
        if (o || h || (w ? N.some(($, E) => Dn($, P[E])) : Dn(N, P))) {
          v && v();
          const $ = Kn;
          Kn = c;
          try {
            const E = [
              N,
              // pass undefined as the old value when it's changed for the first time
              P === Vo ? void 0 : w && P[0] === Vo ? [] : P,
              g
            ];
            a ? a(t, 3, E) : (
              // @ts-expect-error
              t(...E)
            ), P = N;
          } finally {
            Kn = $;
          }
        }
      } else
        c.run();
  };
  return l && l(M), c = new Du(m), c.scheduler = s ? () => s(M, !1) : M, g = (x) => Dm(x, !1, c), v = c.onStop = () => {
    const x = Yo.get(c);
    if (x) {
      if (a)
        a(x, 4);
      else
        for (const N of x) N();
      Yo.delete(c);
    }
  }, Te.NODE_ENV !== "production" && (c.onTrack = n.onTrack, c.onTrigger = n.onTrigger), t ? i ? M(!0) : P = c.run() : s ? s(M.bind(null, !0), !0) : c.run(), O.pause = c.pause.bind(c), O.resume = c.resume.bind(c), O.stop = O, O;
}
function un(e, t = 1 / 0, n) {
  if (t <= 0 || !Ne(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e)))
    return e;
  if (n.add(e), t--, Ae(e))
    un(e.value, t, n);
  else if (te(e))
    for (let i = 0; i < e.length; i++)
      un(e[i], t, n);
  else if (Eu(e) || qn(e))
    e.forEach((i) => {
      un(i, t, n);
    });
  else if (ku(e)) {
    for (const i in e)
      un(e[i], t, n);
    for (const i of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, i) && un(e[i], t, n);
  }
  return e;
}
var _ = {};
const Jn = [];
function $o(e) {
  Jn.push(e);
}
function Mo() {
  Jn.pop();
}
let jr = !1;
function j(e, ...t) {
  if (jr) return;
  jr = !0, gn();
  const n = Jn.length ? Jn[Jn.length - 1].component : null, i = n && n.appContext.config.warnHandler, o = Pm();
  if (i)
    Oi(
      i,
      n,
      11,
      [
        // eslint-disable-next-line no-restricted-syntax
        e + t.map((r) => {
          var s, l;
          return (l = (s = r.toString) == null ? void 0 : s.call(r)) != null ? l : JSON.stringify(r);
        }).join(""),
        n && n.proxy,
        o.map(
          ({ vnode: r }) => `at <${Vr(n, r.type)}>`
        ).join(`
`),
        o
      ]
    );
  else {
    const r = [`[Vue warn]: ${e}`, ...t];
    o.length && r.push(`
`, ...Am(o)), console.warn(...r);
  }
  hn(), jr = !1;
}
function Pm() {
  let e = Jn[Jn.length - 1];
  if (!e)
    return [];
  const t = [];
  for (; e; ) {
    const n = t[0];
    n && n.vnode === e ? n.recurseCount++ : t.push({
      vnode: e,
      recurseCount: 0
    });
    const i = e.component && e.component.parent;
    e = i && i.vnode;
  }
  return t;
}
function Am(e) {
  const t = [];
  return e.forEach((n, i) => {
    t.push(...i === 0 ? [] : [`
`], ...Im(n));
  }), t;
}
function Im({ vnode: e, recurseCount: t }) {
  const n = t > 0 ? `... (${t} recursive calls)` : "", i = e.component ? e.component.parent == null : !1, o = ` at <${Vr(
    e.component,
    e.type,
    i
  )}`, r = ">" + n;
  return e.props ? [o, ...$m(e.props), r] : [o + r];
}
function $m(e) {
  const t = [], n = Object.keys(e);
  return n.slice(0, 3).forEach((i) => {
    t.push(...Zu(i, e[i]));
  }), n.length > 3 && t.push(" ..."), t;
}
function Zu(e, t, n) {
  return Me(t) ? (t = JSON.stringify(t), n ? t : [`${e}=${t}`]) : typeof t == "number" || typeof t == "boolean" || t == null ? n ? t : [`${e}=${t}`] : Ae(t) ? (t = Zu(e, J(t.value), !0), n ? t : [`${e}=Ref<`, t, ">"]) : re(t) ? [`${e}=fn${t.name ? `<${t.name}>` : ""}`] : (t = J(t), n ? t : [`${e}=`, t]);
}
function Mm(e, t) {
  _.NODE_ENV !== "production" && e !== void 0 && (typeof e != "number" ? j(`${t} is not a valid number - got ${JSON.stringify(e)}.`) : isNaN(e) && j(`${t} is NaN - the duration expression might be incorrect.`));
}
const Xs = {
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
function Oi(e, t, n, i) {
  try {
    return i ? e(...i) : e();
  } catch (o) {
    go(o, t, n);
  }
}
function Bt(e, t, n, i) {
  if (re(e)) {
    const o = Oi(e, t, n, i);
    return o && js(o) && o.catch((r) => {
      go(r, t, n);
    }), o;
  }
  if (te(e)) {
    const o = [];
    for (let r = 0; r < e.length; r++)
      o.push(Bt(e[r], t, n, i));
    return o;
  } else _.NODE_ENV !== "production" && j(
    `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof e}`
  );
}
function go(e, t, n, i = !0) {
  const o = t ? t.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: s } = t && t.appContext.config || De;
  if (t) {
    let l = t.parent;
    const a = t.proxy, d = _.NODE_ENV !== "production" ? Xs[n] : `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; l; ) {
      const u = l.ec;
      if (u) {
        for (let c = 0; c < u.length; c++)
          if (u[c](e, a, d) === !1)
            return;
      }
      l = l.parent;
    }
    if (r) {
      gn(), Oi(r, null, 10, [
        e,
        a,
        d
      ]), hn();
      return;
    }
  }
  Fm(e, n, o, i, s);
}
function Fm(e, t, n, i = !0, o = !1) {
  if (_.NODE_ENV !== "production") {
    const r = Xs[t];
    if (n && $o(n), j(`Unhandled error${r ? ` during execution of ${r}` : ""}`), n && Mo(), i)
      throw e;
    console.error(e);
  } else {
    if (o)
      throw e;
    console.error(e);
  }
}
const mt = [];
let Wt = -1;
const Si = [];
let Nn = null, gi = 0;
const Xu = /* @__PURE__ */ Promise.resolve();
let qo = null;
const Lm = 100;
function At(e) {
  const t = qo || Xu;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function Bm(e) {
  let t = Wt + 1, n = mt.length;
  for (; t < n; ) {
    const i = t + n >>> 1, o = mt[i], r = no(o);
    r < e || r === e && o.flags & 2 ? t = i + 1 : n = i;
  }
  return t;
}
function Er(e) {
  if (!(e.flags & 1)) {
    const t = no(e), n = mt[mt.length - 1];
    !n || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= no(n) ? mt.push(e) : mt.splice(Bm(t), 0, e), e.flags |= 1, Ju();
  }
}
function Ju() {
  qo || (qo = Xu.then(tc));
}
function Qu(e) {
  te(e) ? Si.push(...e) : Nn && e.id === -1 ? Nn.splice(gi + 1, 0, e) : e.flags & 1 || (Si.push(e), e.flags |= 1), Ju();
}
function Wl(e, t, n = Wt + 1) {
  for (_.NODE_ENV !== "production" && (t = t || /* @__PURE__ */ new Map()); n < mt.length; n++) {
    const i = mt[n];
    if (i && i.flags & 2) {
      if (e && i.id !== e.uid || _.NODE_ENV !== "production" && Js(t, i))
        continue;
      mt.splice(n, 1), n--, i.flags & 4 && (i.flags &= -2), i(), i.flags & 4 || (i.flags &= -2);
    }
  }
}
function ec(e) {
  if (Si.length) {
    const t = [...new Set(Si)].sort(
      (n, i) => no(n) - no(i)
    );
    if (Si.length = 0, Nn) {
      Nn.push(...t);
      return;
    }
    for (Nn = t, _.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map()), gi = 0; gi < Nn.length; gi++) {
      const n = Nn[gi];
      _.NODE_ENV !== "production" && Js(e, n) || (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2);
    }
    Nn = null, gi = 0;
  }
}
const no = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function tc(e) {
  _.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map());
  const t = _.NODE_ENV !== "production" ? (n) => Js(e, n) : qe;
  try {
    for (Wt = 0; Wt < mt.length; Wt++) {
      const n = mt[Wt];
      if (n && !(n.flags & 8)) {
        if (_.NODE_ENV !== "production" && t(n))
          continue;
        n.flags & 4 && (n.flags &= -2), Oi(
          n,
          n.i,
          n.i ? 15 : 14
        ), n.flags & 4 || (n.flags &= -2);
      }
    }
  } finally {
    for (; Wt < mt.length; Wt++) {
      const n = mt[Wt];
      n && (n.flags &= -2);
    }
    Wt = -1, mt.length = 0, ec(e), qo = null, (mt.length || Si.length) && tc(e);
  }
}
function Js(e, t) {
  const n = e.get(t) || 0;
  if (n > Lm) {
    const i = t.i, o = i && ul(i.type);
    return go(
      `Maximum recursive updates exceeded${o ? ` in component <${o}>` : ""}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`,
      null,
      10
    ), !0;
  }
  return e.set(t, n + 1), !1;
}
let Ft = !1;
const Fo = /* @__PURE__ */ new Map();
_.NODE_ENV !== "production" && (mo().__VUE_HMR_RUNTIME__ = {
  createRecord: zr(nc),
  rerender: zr(jm),
  reload: zr(zm)
});
const ri = /* @__PURE__ */ new Map();
function Rm(e) {
  const t = e.type.__hmrId;
  let n = ri.get(t);
  n || (nc(t, e.type), n = ri.get(t)), n.instances.add(e);
}
function Hm(e) {
  ri.get(e.type.__hmrId).instances.delete(e);
}
function nc(e, t) {
  return ri.has(e) ? !1 : (ri.set(e, {
    initialDef: Zo(t),
    instances: /* @__PURE__ */ new Set()
  }), !0);
}
function Zo(e) {
  return Wc(e) ? e.__vccOpts : e;
}
function jm(e, t) {
  const n = ri.get(e);
  n && (n.initialDef.render = t, [...n.instances].forEach((i) => {
    t && (i.render = t, Zo(i.type).render = t), i.renderCache = [], Ft = !0, i.update(), Ft = !1;
  }));
}
function zm(e, t) {
  const n = ri.get(e);
  if (!n) return;
  t = Zo(t), Kl(n.initialDef, t);
  const i = [...n.instances];
  for (let o = 0; o < i.length; o++) {
    const r = i[o], s = Zo(r.type);
    let l = Fo.get(s);
    l || (s !== n.initialDef && Kl(s, t), Fo.set(s, l = /* @__PURE__ */ new Set())), l.add(r), r.appContext.propsCache.delete(r.type), r.appContext.emitsCache.delete(r.type), r.appContext.optionsCache.delete(r.type), r.ceReload ? (l.add(r), r.ceReload(t.styles), l.delete(r)) : r.parent ? Er(() => {
      Ft = !0, r.parent.update(), Ft = !1, l.delete(r);
    }) : r.appContext.reload ? r.appContext.reload() : typeof window < "u" ? window.location.reload() : console.warn(
      "[HMR] Root or manually mounted instance modified. Full reload required."
    ), r.root.ce && r !== r.root && r.root.ce._removeChildStyle(s);
  }
  Qu(() => {
    Fo.clear();
  });
}
function Kl(e, t) {
  Fe(e, t);
  for (const n in e)
    n !== "__file" && !(n in t) && delete e[n];
}
function zr(e) {
  return (t, n) => {
    try {
      return e(t, n);
    } catch (i) {
      console.error(i), console.warn(
        "[HMR] Something went wrong during Vue component hot-reload. Full reload required."
      );
    }
  };
}
let Yt, ji = [], fs = !1;
function ho(e, ...t) {
  Yt ? Yt.emit(e, ...t) : fs || ji.push({ event: e, args: t });
}
function ic(e, t) {
  var n, i;
  Yt = e, Yt ? (Yt.enabled = !0, ji.forEach(({ event: o, args: r }) => Yt.emit(o, ...r)), ji = []) : /* handle late devtools injection - only do this if we are in an actual */ /* browser environment to avoid the timer handle stalling test runner exit */ /* (#4815) */ typeof window < "u" && // some envs mock window but not fully
  window.HTMLElement && // also exclude jsdom
  // eslint-disable-next-line no-restricted-syntax
  !((i = (n = window.navigator) == null ? void 0 : n.userAgent) != null && i.includes("jsdom")) ? ((t.__VUE_DEVTOOLS_HOOK_REPLAY__ = t.__VUE_DEVTOOLS_HOOK_REPLAY__ || []).push((r) => {
    ic(r, t);
  }), setTimeout(() => {
    Yt || (t.__VUE_DEVTOOLS_HOOK_REPLAY__ = null, fs = !0, ji = []);
  }, 3e3)) : (fs = !0, ji = []);
}
function Um(e, t) {
  ho("app:init", e, t, {
    Fragment: Ce,
    Text: ui,
    Comment: Ke,
    Static: Bo
  });
}
function Wm(e) {
  ho("app:unmount", e);
}
const Km = /* @__PURE__ */ Qs(
  "component:added"
  /* COMPONENT_ADDED */
), oc = /* @__PURE__ */ Qs(
  "component:updated"
  /* COMPONENT_UPDATED */
), Gm = /* @__PURE__ */ Qs(
  "component:removed"
  /* COMPONENT_REMOVED */
), Ym = (e) => {
  Yt && typeof Yt.cleanupBuffer == "function" && // remove the component if it wasn't buffered
  !Yt.cleanupBuffer(e) && Gm(e);
};
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Qs(e) {
  return (t) => {
    ho(
      e,
      t.appContext.app,
      t.uid,
      t.parent ? t.parent.uid : void 0,
      t
    );
  };
}
const qm = /* @__PURE__ */ rc(
  "perf:start"
  /* PERFORMANCE_START */
), Zm = /* @__PURE__ */ rc(
  "perf:end"
  /* PERFORMANCE_END */
);
function rc(e) {
  return (t, n, i) => {
    ho(e, t.appContext.app, t.uid, t, n, i);
  };
}
function Xm(e, t, n) {
  ho(
    "component:emit",
    e.appContext.app,
    e,
    t,
    n
  );
}
let st = null, sc = null;
function Xo(e) {
  const t = st;
  return st = e, sc = e && e.type.__scopeId || null, t;
}
function k(e, t = st, n) {
  if (!t || e._n)
    return e;
  const i = (...o) => {
    i._d && la(-1);
    const r = Xo(t);
    let s;
    try {
      s = e(...o);
    } finally {
      Xo(r), i._d && la(1);
    }
    return _.NODE_ENV !== "production" && oc(t), s;
  };
  return i._n = !0, i._c = !0, i._d = !0, i;
}
function lc(e) {
  Rf(e) && j("Do not use built-in directive ids as custom directive id: " + e);
}
function Nt(e, t) {
  if (st === null)
    return _.NODE_ENV !== "production" && j("withDirectives can only be used inside render functions."), e;
  const n = xr(st), i = e.dirs || (e.dirs = []);
  for (let o = 0; o < t.length; o++) {
    let [r, s, l, a = De] = t[o];
    r && (re(r) && (r = {
      mounted: r,
      updated: r
    }), r.deep && un(s), i.push({
      dir: r,
      instance: n,
      value: s,
      oldValue: void 0,
      arg: l,
      modifiers: a
    }));
  }
  return e;
}
function Hn(e, t, n, i) {
  const o = e.dirs, r = t && t.dirs;
  for (let s = 0; s < o.length; s++) {
    const l = o[s];
    r && (l.oldValue = r[s].value);
    let a = l.dir[i];
    a && (gn(), Bt(a, n, 8, [
      e.el,
      l,
      e,
      t
    ]), hn());
  }
}
const ac = Symbol("_vte"), uc = (e) => e.__isTeleport, Qn = (e) => e && (e.disabled || e.disabled === ""), Jm = (e) => e && (e.defer || e.defer === ""), Gl = (e) => typeof SVGElement < "u" && e instanceof SVGElement, Yl = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement, ms = (e, t) => {
  const n = e && e.to;
  if (Me(n))
    if (t) {
      const i = t(n);
      return _.NODE_ENV !== "production" && !i && !Qn(e) && j(
        `Failed to locate Teleport target with selector "${n}". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.`
      ), i;
    } else
      return _.NODE_ENV !== "production" && j(
        "Current renderer does not support string target for Teleports. (missing querySelector renderer option)"
      ), null;
  else
    return _.NODE_ENV !== "production" && !n && !Qn(e) && j(`Invalid Teleport target: ${n}`), n;
}, Qm = {
  name: "Teleport",
  __isTeleport: !0,
  process(e, t, n, i, o, r, s, l, a, d) {
    const {
      mc: u,
      pc: c,
      pbc: m,
      o: { insert: v, querySelector: g, createText: h, createComment: w }
    } = d, C = Qn(t.props);
    let { shapeFlag: O, children: P, dynamicChildren: M } = t;
    if (_.NODE_ENV !== "production" && Ft && (a = !1, M = null), e == null) {
      const x = t.el = _.NODE_ENV !== "production" ? w("teleport start") : h(""), N = t.anchor = _.NODE_ENV !== "production" ? w("teleport end") : h("");
      v(x, n, i), v(N, n, i);
      const $ = (V, L) => {
        O & 16 && (o && o.isCE && (o.ce._teleportTarget = V), u(
          P,
          V,
          L,
          o,
          r,
          s,
          l,
          a
        ));
      }, E = () => {
        const V = t.target = ms(t.props, g), L = cc(V, t, h, v);
        V ? (s !== "svg" && Gl(V) ? s = "svg" : s !== "mathml" && Yl(V) && (s = "mathml"), C || ($(V, L), Lo(t, !1))) : _.NODE_ENV !== "production" && !C && j(
          "Invalid Teleport target on mount:",
          V,
          `(${typeof V})`
        );
      };
      C && ($(n, N), Lo(t, !0)), Jm(t.props) ? ht(E, r) : E();
    } else {
      t.el = e.el, t.targetStart = e.targetStart;
      const x = t.anchor = e.anchor, N = t.target = e.target, $ = t.targetAnchor = e.targetAnchor, E = Qn(e.props), V = E ? n : N, L = E ? x : $;
      if (s === "svg" || Gl(N) ? s = "svg" : (s === "mathml" || Yl(N)) && (s = "mathml"), M ? (m(
        e.dynamicChildren,
        M,
        V,
        o,
        r,
        s,
        l
      ), qi(e, t, !0)) : a || c(
        e,
        t,
        V,
        L,
        o,
        r,
        s,
        l,
        !1
      ), C)
        E ? t.props && e.props && t.props.to !== e.props.to && (t.props.to = e.props.to) : Oo(
          t,
          n,
          x,
          d,
          1
        );
      else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
        const A = t.target = ms(
          t.props,
          g
        );
        A ? Oo(
          t,
          A,
          null,
          d,
          0
        ) : _.NODE_ENV !== "production" && j(
          "Invalid Teleport target on update:",
          N,
          `(${typeof N})`
        );
      } else E && Oo(
        t,
        N,
        $,
        d,
        1
      );
      Lo(t, C);
    }
  },
  remove(e, t, n, { um: i, o: { remove: o } }, r) {
    const {
      shapeFlag: s,
      children: l,
      anchor: a,
      targetStart: d,
      targetAnchor: u,
      target: c,
      props: m
    } = e;
    if (c && (o(d), o(u)), r && o(a), s & 16) {
      const v = r || !Qn(m);
      for (let g = 0; g < l.length; g++) {
        const h = l[g];
        i(
          h,
          t,
          n,
          v,
          !!h.dynamicChildren
        );
      }
    }
  },
  move: Oo,
  hydrate: ev
};
function Oo(e, t, n, { o: { insert: i }, m: o }, r = 2) {
  r === 0 && i(e.targetAnchor, t, n);
  const { el: s, anchor: l, shapeFlag: a, children: d, props: u } = e, c = r === 2;
  if (c && i(s, t, n), (!c || Qn(u)) && a & 16)
    for (let m = 0; m < d.length; m++)
      o(
        d[m],
        t,
        n,
        2
      );
  c && i(l, t, n);
}
function ev(e, t, n, i, o, r, {
  o: { nextSibling: s, parentNode: l, querySelector: a, insert: d, createText: u }
}, c) {
  const m = t.target = ms(
    t.props,
    a
  );
  if (m) {
    const v = Qn(t.props), g = m._lpa || m.firstChild;
    if (t.shapeFlag & 16)
      if (v)
        t.anchor = c(
          s(e),
          t,
          l(e),
          n,
          i,
          o,
          r
        ), t.targetStart = g, t.targetAnchor = g && s(g);
      else {
        t.anchor = s(e);
        let h = g;
        for (; h; ) {
          if (h && h.nodeType === 8) {
            if (h.data === "teleport start anchor")
              t.targetStart = h;
            else if (h.data === "teleport anchor") {
              t.targetAnchor = h, m._lpa = t.targetAnchor && s(t.targetAnchor);
              break;
            }
          }
          h = s(h);
        }
        t.targetAnchor || cc(m, t, u, d), c(
          g && s(g),
          t,
          m,
          n,
          i,
          o,
          r
        );
      }
    Lo(t, v);
  }
  return t.anchor && s(t.anchor);
}
const tv = Qm;
function Lo(e, t) {
  const n = e.ctx;
  if (n && n.ut) {
    let i, o;
    for (t ? (i = e.el, o = e.anchor) : (i = e.targetStart, o = e.targetAnchor); i && i !== o; )
      i.nodeType === 1 && i.setAttribute("data-v-owner", n.uid), i = i.nextSibling;
    n.ut();
  }
}
function cc(e, t, n, i) {
  const o = t.targetStart = n(""), r = t.targetAnchor = n("");
  return o[ac] = r, e && (i(o, e), i(r, e)), r;
}
const xn = Symbol("_leaveCb"), Do = Symbol("_enterCb");
function dc() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  return In(() => {
    e.isMounted = !0;
  }), yt(() => {
    e.isUnmounting = !0;
  }), e;
}
const Vt = [Function, Array], fc = {
  mode: String,
  appear: Boolean,
  persisted: Boolean,
  // enter
  onBeforeEnter: Vt,
  onEnter: Vt,
  onAfterEnter: Vt,
  onEnterCancelled: Vt,
  // leave
  onBeforeLeave: Vt,
  onLeave: Vt,
  onAfterLeave: Vt,
  onLeaveCancelled: Vt,
  // appear
  onBeforeAppear: Vt,
  onAppear: Vt,
  onAfterAppear: Vt,
  onAppearCancelled: Vt
}, mc = (e) => {
  const t = e.subTree;
  return t.component ? mc(t.component) : t;
}, nv = {
  name: "BaseTransition",
  props: fc,
  setup(e, { slots: t }) {
    const n = Nr(), i = dc();
    return () => {
      const o = t.default && el(t.default(), !0);
      if (!o || !o.length)
        return;
      const r = vc(o), s = J(e), { mode: l } = s;
      if (_.NODE_ENV !== "production" && l && l !== "in-out" && l !== "out-in" && l !== "default" && j(`invalid <transition> mode: ${l}`), i.isLeaving)
        return Ur(r);
      const a = ql(r);
      if (!a)
        return Ur(r);
      let d = io(
        a,
        s,
        i,
        n,
        // #11061, ensure enterHooks is fresh after clone
        (m) => d = m
      );
      a.type !== Ke && si(a, d);
      const u = n.subTree, c = u && ql(u);
      if (c && c.type !== Ke && !Gn(a, c) && mc(n).type !== Ke) {
        const m = io(
          c,
          s,
          i,
          n
        );
        if (si(c, m), l === "out-in" && a.type !== Ke)
          return i.isLeaving = !0, m.afterLeave = () => {
            i.isLeaving = !1, n.job.flags & 8 || n.update(), delete m.afterLeave;
          }, Ur(r);
        l === "in-out" && a.type !== Ke && (m.delayLeave = (v, g, h) => {
          const w = gc(
            i,
            c
          );
          w[String(c.key)] = c, v[xn] = () => {
            g(), v[xn] = void 0, delete d.delayedLeave;
          }, d.delayedLeave = h;
        });
      }
      return r;
    };
  }
};
function vc(e) {
  let t = e[0];
  if (e.length > 1) {
    let n = !1;
    for (const i of e)
      if (i.type !== Ke) {
        if (_.NODE_ENV !== "production" && n) {
          j(
            "<transition> can only be used on a single element or component. Use <transition-group> for lists."
          );
          break;
        }
        if (t = i, n = !0, _.NODE_ENV === "production") break;
      }
  }
  return t;
}
const iv = nv;
function gc(e, t) {
  const { leavingVNodes: n } = e;
  let i = n.get(t.type);
  return i || (i = /* @__PURE__ */ Object.create(null), n.set(t.type, i)), i;
}
function io(e, t, n, i, o) {
  const {
    appear: r,
    mode: s,
    persisted: l = !1,
    onBeforeEnter: a,
    onEnter: d,
    onAfterEnter: u,
    onEnterCancelled: c,
    onBeforeLeave: m,
    onLeave: v,
    onAfterLeave: g,
    onLeaveCancelled: h,
    onBeforeAppear: w,
    onAppear: C,
    onAfterAppear: O,
    onAppearCancelled: P
  } = t, M = String(e.key), x = gc(n, e), N = (V, L) => {
    V && Bt(
      V,
      i,
      9,
      L
    );
  }, $ = (V, L) => {
    const A = L[1];
    N(V, L), te(V) ? V.every((S) => S.length <= 1) && A() : V.length <= 1 && A();
  }, E = {
    mode: s,
    persisted: l,
    beforeEnter(V) {
      let L = a;
      if (!n.isMounted)
        if (r)
          L = w || a;
        else
          return;
      V[xn] && V[xn](
        !0
        /* cancelled */
      );
      const A = x[M];
      A && Gn(e, A) && A.el[xn] && A.el[xn](), N(L, [V]);
    },
    enter(V) {
      let L = d, A = u, S = c;
      if (!n.isMounted)
        if (r)
          L = C || d, A = O || u, S = P || c;
        else
          return;
      let T = !1;
      const B = V[Do] = (Z) => {
        T || (T = !0, Z ? N(S, [V]) : N(A, [V]), E.delayedLeave && E.delayedLeave(), V[Do] = void 0);
      };
      L ? $(L, [V, B]) : B();
    },
    leave(V, L) {
      const A = String(e.key);
      if (V[Do] && V[Do](
        !0
        /* cancelled */
      ), n.isUnmounting)
        return L();
      N(m, [V]);
      let S = !1;
      const T = V[xn] = (B) => {
        S || (S = !0, L(), B ? N(h, [V]) : N(g, [V]), V[xn] = void 0, x[A] === e && delete x[A]);
      };
      x[A] = e, v ? $(v, [V, T]) : T();
    },
    clone(V) {
      const L = io(
        V,
        t,
        n,
        i,
        o
      );
      return o && o(L), L;
    }
  };
  return E;
}
function Ur(e) {
  if (po(e))
    return e = Rt(e), e.children = null, e;
}
function ql(e) {
  if (!po(e))
    return uc(e.type) && e.children ? vc(e.children) : e;
  if (_.NODE_ENV !== "production" && e.component)
    return e.component.subTree;
  const { shapeFlag: t, children: n } = e;
  if (n) {
    if (t & 16)
      return n[0];
    if (t & 32 && re(n.default))
      return n.default();
  }
}
function si(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, si(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function el(e, t = !1, n) {
  let i = [], o = 0;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    const l = n == null ? s.key : String(n) + String(s.key != null ? s.key : r);
    s.type === Ce ? (s.patchFlag & 128 && o++, i = i.concat(
      el(s.children, t, l)
    )) : (t || s.type !== Ke) && i.push(l != null ? Rt(s, { key: l }) : s);
  }
  if (o > 1)
    for (let r = 0; r < i.length; r++)
      i[r].patchFlag = -2;
  return i;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function ov(e, t) {
  return re(e) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    Fe({ name: e.name }, t, { setup: e })
  ) : e;
}
function hc(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
const rv = /* @__PURE__ */ new WeakSet();
function vs(e, t, n, i, o = !1) {
  if (te(e)) {
    e.forEach(
      (g, h) => vs(
        g,
        t && (te(t) ? t[h] : t),
        n,
        i,
        o
      )
    );
    return;
  }
  if (Yi(i) && !o)
    return;
  const r = i.shapeFlag & 4 ? xr(i.component) : i.el, s = o ? null : r, { i: l, r: a } = e;
  if (_.NODE_ENV !== "production" && !l) {
    j(
      "Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function."
    );
    return;
  }
  const d = t && t.r, u = l.refs === De ? l.refs = {} : l.refs, c = l.setupState, m = J(c), v = c === De ? () => !1 : (g) => _.NODE_ENV !== "production" && (Se(m, g) && !Ae(m[g]) && j(
    `Template ref "${g}" used on a non-ref value. It will not work in the production build.`
  ), rv.has(m[g])) ? !1 : Se(m, g);
  if (d != null && d !== a && (Me(d) ? (u[d] = null, v(d) && (c[d] = null)) : Ae(d) && (d.value = null)), re(a))
    Oi(a, l, 12, [s, u]);
  else {
    const g = Me(a), h = Ae(a);
    if (g || h) {
      const w = () => {
        if (e.f) {
          const C = g ? v(a) ? c[a] : u[a] : a.value;
          o ? te(C) && Hs(C, r) : te(C) ? C.includes(r) || C.push(r) : g ? (u[a] = [r], v(a) && (c[a] = u[a])) : (a.value = [r], e.k && (u[e.k] = a.value));
        } else g ? (u[a] = s, v(a) && (c[a] = s)) : h ? (a.value = s, e.k && (u[e.k] = s)) : _.NODE_ENV !== "production" && j("Invalid template ref type:", a, `(${typeof a})`);
      };
      s ? (w.id = -1, ht(w, n)) : w();
    } else _.NODE_ENV !== "production" && j("Invalid template ref type:", a, `(${typeof a})`);
  }
}
mo().requestIdleCallback;
mo().cancelIdleCallback;
const Yi = (e) => !!e.type.__asyncLoader, po = (e) => e.type.__isKeepAlive;
function pc(e, t) {
  bc(e, "a", t);
}
function yc(e, t) {
  bc(e, "da", t);
}
function bc(e, t, n = Ze) {
  const i = e.__wdc || (e.__wdc = () => {
    let o = n;
    for (; o; ) {
      if (o.isDeactivated)
        return;
      o = o.parent;
    }
    return e();
  });
  if (Cr(t, i, n), n) {
    let o = n.parent;
    for (; o && o.parent; )
      po(o.parent.vnode) && sv(i, t, n, o), o = o.parent;
  }
}
function sv(e, t, n, i) {
  const o = Cr(
    t,
    e,
    i,
    !0
    /* prepend */
  );
  _c(() => {
    Hs(i[t], o);
  }, n);
}
function Cr(e, t, n = Ze, i = !1) {
  if (n) {
    const o = n[e] || (n[e] = []), r = t.__weh || (t.__weh = (...s) => {
      gn();
      const l = yo(n), a = Bt(t, n, e, s);
      return l(), hn(), a;
    });
    return i ? o.unshift(r) : o.push(r), r;
  } else if (_.NODE_ENV !== "production") {
    const o = Wn(Xs[e].replace(/ hook$/, ""));
    j(
      `${o} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
    );
  }
}
const pn = (e) => (t, n = Ze) => {
  (!ro || e === "sp") && Cr(e, (...i) => t(...i), n);
}, tl = pn("bm"), In = pn("m"), lv = pn(
  "bu"
), nl = pn("u"), yt = pn(
  "bum"
), _c = pn("um"), av = pn(
  "sp"
), uv = pn("rtg"), cv = pn("rtc");
function dv(e, t = Ze) {
  Cr("ec", e, t);
}
const gs = "components", fv = "directives", mv = Symbol.for("v-ndc");
function vv(e) {
  return Me(e) && wc(gs, e, !1) || e;
}
function Di(e) {
  return wc(fv, e);
}
function wc(e, t, n = !0, i = !1) {
  const o = st || Ze;
  if (o) {
    const r = o.type;
    if (e === gs) {
      const l = ul(
        r,
        !1
      );
      if (l && (l === t || l === tt(t) || l === Tt(tt(t))))
        return r;
    }
    const s = (
      // local registration
      // check instance[type] first which is resolved for options API
      Zl(o[e] || r[e], t) || // global registration
      Zl(o.appContext[e], t)
    );
    if (!s && i)
      return r;
    if (_.NODE_ENV !== "production" && n && !s) {
      const l = e === gs ? `
If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.` : "";
      j(`Failed to resolve ${e.slice(0, -1)}: ${t}${l}`);
    }
    return s;
  } else _.NODE_ENV !== "production" && j(
    `resolve${Tt(e.slice(0, -1))} can only be used in render() or setup().`
  );
}
function Zl(e, t) {
  return e && (e[t] || e[tt(t)] || e[Tt(tt(t))]);
}
function Ei(e, t, n, i) {
  let o;
  const r = n, s = te(e);
  if (s || Me(e)) {
    const l = s && Xn(e);
    let a = !1;
    l && (a = !vt(e), e = _r(e)), o = new Array(e.length);
    for (let d = 0, u = e.length; d < u; d++)
      o[d] = t(
        a ? rt(e[d]) : e[d],
        d,
        void 0,
        r
      );
  } else if (typeof e == "number") {
    _.NODE_ENV !== "production" && !Number.isInteger(e) && j(`The v-for range expect an integer value but got ${e}.`), o = new Array(e);
    for (let l = 0; l < e; l++)
      o[l] = t(l + 1, l, void 0, r);
  } else if (Ne(e))
    if (e[Symbol.iterator])
      o = Array.from(
        e,
        (l, a) => t(l, a, void 0, r)
      );
    else {
      const l = Object.keys(e);
      o = new Array(l.length);
      for (let a = 0, d = l.length; a < d; a++) {
        const u = l[a];
        o[a] = t(e[u], u, a, r);
      }
    }
  else
    o = [];
  return o;
}
const hs = (e) => e ? zc(e) ? xr(e) : hs(e.parent) : null, ei = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ Fe(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => _.NODE_ENV !== "production" ? Zt(e.props) : e.props,
    $attrs: (e) => _.NODE_ENV !== "production" ? Zt(e.attrs) : e.attrs,
    $slots: (e) => _.NODE_ENV !== "production" ? Zt(e.slots) : e.slots,
    $refs: (e) => _.NODE_ENV !== "production" ? Zt(e.refs) : e.refs,
    $parent: (e) => hs(e.parent),
    $root: (e) => hs(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => ol(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Er(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = At.bind(e.proxy)),
    $watch: (e) => Kv.bind(e)
  })
), il = (e) => e === "_" || e === "$", Wr = (e, t) => e !== De && !e.__isScriptSetup && Se(e, t), Sc = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: n, setupState: i, data: o, props: r, accessCache: s, type: l, appContext: a } = e;
    if (_.NODE_ENV !== "production" && t === "__isVue")
      return !0;
    let d;
    if (t[0] !== "$") {
      const v = s[t];
      if (v !== void 0)
        switch (v) {
          case 1:
            return i[t];
          case 2:
            return o[t];
          case 4:
            return n[t];
          case 3:
            return r[t];
        }
      else {
        if (Wr(i, t))
          return s[t] = 1, i[t];
        if (o !== De && Se(o, t))
          return s[t] = 2, o[t];
        if (
          // only cache other properties when instance has declared (thus stable)
          // props
          (d = e.propsOptions[0]) && Se(d, t)
        )
          return s[t] = 3, r[t];
        if (n !== De && Se(n, t))
          return s[t] = 4, n[t];
        ps && (s[t] = 0);
      }
    }
    const u = ei[t];
    let c, m;
    if (u)
      return t === "$attrs" ? (Ye(e.attrs, "get", ""), _.NODE_ENV !== "production" && er()) : _.NODE_ENV !== "production" && t === "$slots" && Ye(e, "get", t), u(e);
    if (
      // css module (injected by vue-loader)
      (c = l.__cssModules) && (c = c[t])
    )
      return c;
    if (n !== De && Se(n, t))
      return s[t] = 4, n[t];
    if (
      // global properties
      m = a.config.globalProperties, Se(m, t)
    )
      return m[t];
    _.NODE_ENV !== "production" && st && (!Me(t) || // #1091 avoid internal isRef/isVNode checks on component instance leading
    // to infinite warning loop
    t.indexOf("__v") !== 0) && (o !== De && il(t[0]) && Se(o, t) ? j(
      `Property ${JSON.stringify(
        t
      )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
    ) : e === st && j(
      `Property ${JSON.stringify(t)} was accessed during render but is not defined on instance.`
    ));
  },
  set({ _: e }, t, n) {
    const { data: i, setupState: o, ctx: r } = e;
    return Wr(o, t) ? (o[t] = n, !0) : _.NODE_ENV !== "production" && o.__isScriptSetup && Se(o, t) ? (j(`Cannot mutate <script setup> binding "${t}" from Options API.`), !1) : i !== De && Se(i, t) ? (i[t] = n, !0) : Se(e.props, t) ? (_.NODE_ENV !== "production" && j(`Attempting to mutate prop "${t}". Props are readonly.`), !1) : t[0] === "$" && t.slice(1) in e ? (_.NODE_ENV !== "production" && j(
      `Attempting to mutate public property "${t}". Properties starting with $ are reserved and readonly.`
    ), !1) : (_.NODE_ENV !== "production" && t in e.appContext.config.globalProperties ? Object.defineProperty(r, t, {
      enumerable: !0,
      configurable: !0,
      value: n
    }) : r[t] = n, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: n, ctx: i, appContext: o, propsOptions: r }
  }, s) {
    let l;
    return !!n[s] || e !== De && Se(e, s) || Wr(t, s) || (l = r[0]) && Se(l, s) || Se(i, s) || Se(ei, s) || Se(o.config.globalProperties, s);
  },
  defineProperty(e, t, n) {
    return n.get != null ? e._.accessCache[t] = 0 : Se(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
  }
};
_.NODE_ENV !== "production" && (Sc.ownKeys = (e) => (j(
  "Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead."
), Reflect.ownKeys(e)));
function gv(e) {
  const t = {};
  return Object.defineProperty(t, "_", {
    configurable: !0,
    enumerable: !1,
    get: () => e
  }), Object.keys(ei).forEach((n) => {
    Object.defineProperty(t, n, {
      configurable: !0,
      enumerable: !1,
      get: () => ei[n](e),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: qe
    });
  }), t;
}
function hv(e) {
  const {
    ctx: t,
    propsOptions: [n]
  } = e;
  n && Object.keys(n).forEach((i) => {
    Object.defineProperty(t, i, {
      enumerable: !0,
      configurable: !0,
      get: () => e.props[i],
      set: qe
    });
  });
}
function pv(e) {
  const { ctx: t, setupState: n } = e;
  Object.keys(J(n)).forEach((i) => {
    if (!n.__isScriptSetup) {
      if (il(i[0])) {
        j(
          `setup() return property ${JSON.stringify(
            i
          )} should not start with "$" or "_" which are reserved prefixes for Vue internals.`
        );
        return;
      }
      Object.defineProperty(t, i, {
        enumerable: !0,
        configurable: !0,
        get: () => n[i],
        set: qe
      });
    }
  });
}
function Xl(e) {
  return te(e) ? e.reduce(
    (t, n) => (t[n] = null, t),
    {}
  ) : e;
}
function yv() {
  const e = /* @__PURE__ */ Object.create(null);
  return (t, n) => {
    e[n] ? j(`${t} property "${n}" is already defined in ${e[n]}.`) : e[n] = t;
  };
}
let ps = !0;
function bv(e) {
  const t = ol(e), n = e.proxy, i = e.ctx;
  ps = !1, t.beforeCreate && Jl(t.beforeCreate, e, "bc");
  const {
    // state
    data: o,
    computed: r,
    methods: s,
    watch: l,
    provide: a,
    inject: d,
    // lifecycle
    created: u,
    beforeMount: c,
    mounted: m,
    beforeUpdate: v,
    updated: g,
    activated: h,
    deactivated: w,
    beforeDestroy: C,
    beforeUnmount: O,
    destroyed: P,
    unmounted: M,
    render: x,
    renderTracked: N,
    renderTriggered: $,
    errorCaptured: E,
    serverPrefetch: V,
    // public API
    expose: L,
    inheritAttrs: A,
    // assets
    components: S,
    directives: T,
    filters: B
  } = t, Z = _.NODE_ENV !== "production" ? yv() : null;
  if (_.NODE_ENV !== "production") {
    const [X] = e.propsOptions;
    if (X)
      for (const q in X)
        Z("Props", q);
  }
  if (d && _v(d, i, Z), s)
    for (const X in s) {
      const q = s[X];
      re(q) ? (_.NODE_ENV !== "production" ? Object.defineProperty(i, X, {
        value: q.bind(n),
        configurable: !0,
        enumerable: !0,
        writable: !0
      }) : i[X] = q.bind(n), _.NODE_ENV !== "production" && Z("Methods", X)) : _.NODE_ENV !== "production" && j(
        `Method "${X}" has type "${typeof q}" in the component definition. Did you reference the function correctly?`
      );
    }
  if (o) {
    _.NODE_ENV !== "production" && !re(o) && j(
      "The data option must be a function. Plain object usage is no longer supported."
    );
    const X = o.call(n, n);
    if (_.NODE_ENV !== "production" && js(X) && j(
      "data() returned a Promise - note data() cannot be async; If you intend to perform data fetching before component renders, use async setup() + <Suspense>."
    ), !Ne(X))
      _.NODE_ENV !== "production" && j("data() should return an object.");
    else if (e.data = et(X), _.NODE_ENV !== "production")
      for (const q in X)
        Z("Data", q), il(q[0]) || Object.defineProperty(i, q, {
          configurable: !0,
          enumerable: !0,
          get: () => X[q],
          set: qe
        });
  }
  if (ps = !0, r)
    for (const X in r) {
      const q = r[X], ye = re(q) ? q.bind(n, n) : re(q.get) ? q.get.bind(n, n) : qe;
      _.NODE_ENV !== "production" && ye === qe && j(`Computed property "${X}" has no getter.`);
      const be = !re(q) && re(q.set) ? q.set.bind(n) : _.NODE_ENV !== "production" ? () => {
        j(
          `Write operation failed: computed property "${X}" is readonly.`
        );
      } : qe, fe = y({
        get: ye,
        set: be
      });
      Object.defineProperty(i, X, {
        enumerable: !0,
        configurable: !0,
        get: () => fe.value,
        set: (ne) => fe.value = ne
      }), _.NODE_ENV !== "production" && Z("Computed", X);
    }
  if (l)
    for (const X in l)
      Ec(l[X], i, n, X);
  if (a) {
    const X = re(a) ? a.call(n) : a;
    Reflect.ownKeys(X).forEach((q) => {
      gt(q, X[q]);
    });
  }
  u && Jl(u, e, "c");
  function Q(X, q) {
    te(q) ? q.forEach((ye) => X(ye.bind(n))) : q && X(q.bind(n));
  }
  if (Q(tl, c), Q(In, m), Q(lv, v), Q(nl, g), Q(pc, h), Q(yc, w), Q(dv, E), Q(cv, N), Q(uv, $), Q(yt, O), Q(_c, M), Q(av, V), te(L))
    if (L.length) {
      const X = e.exposed || (e.exposed = {});
      L.forEach((q) => {
        Object.defineProperty(X, q, {
          get: () => n[q],
          set: (ye) => n[q] = ye
        });
      });
    } else e.exposed || (e.exposed = {});
  x && e.render === qe && (e.render = x), A != null && (e.inheritAttrs = A), S && (e.components = S), T && (e.directives = T), V && hc(e);
}
function _v(e, t, n = qe) {
  te(e) && (e = ys(e));
  for (const i in e) {
    const o = e[i];
    let r;
    Ne(o) ? "default" in o ? r = Re(
      o.from || i,
      o.default,
      !0
    ) : r = Re(o.from || i) : r = Re(o), Ae(r) ? Object.defineProperty(t, i, {
      enumerable: !0,
      configurable: !0,
      get: () => r.value,
      set: (s) => r.value = s
    }) : t[i] = r, _.NODE_ENV !== "production" && n("Inject", i);
  }
}
function Jl(e, t, n) {
  Bt(
    te(e) ? e.map((i) => i.bind(t.proxy)) : e.bind(t.proxy),
    t,
    n
  );
}
function Ec(e, t, n, i) {
  let o = i.includes(".") ? $c(n, i) : () => n[i];
  if (Me(e)) {
    const r = t[e];
    re(r) ? ve(o, r) : _.NODE_ENV !== "production" && j(`Invalid watch handler specified by key "${e}"`, r);
  } else if (re(e))
    ve(o, e.bind(n));
  else if (Ne(e))
    if (te(e))
      e.forEach((r) => Ec(r, t, n, i));
    else {
      const r = re(e.handler) ? e.handler.bind(n) : t[e.handler];
      re(r) ? ve(o, r, e) : _.NODE_ENV !== "production" && j(`Invalid watch handler specified by key "${e.handler}"`, r);
    }
  else _.NODE_ENV !== "production" && j(`Invalid watch option: "${i}"`, e);
}
function ol(e) {
  const t = e.type, { mixins: n, extends: i } = t, {
    mixins: o,
    optionsCache: r,
    config: { optionMergeStrategies: s }
  } = e.appContext, l = r.get(t);
  let a;
  return l ? a = l : !o.length && !n && !i ? a = t : (a = {}, o.length && o.forEach(
    (d) => Jo(a, d, s, !0)
  ), Jo(a, t, s)), Ne(t) && r.set(t, a), a;
}
function Jo(e, t, n, i = !1) {
  const { mixins: o, extends: r } = t;
  r && Jo(e, r, n, !0), o && o.forEach(
    (s) => Jo(e, s, n, !0)
  );
  for (const s in t)
    if (i && s === "expose")
      _.NODE_ENV !== "production" && j(
        '"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.'
      );
    else {
      const l = wv[s] || n && n[s];
      e[s] = l ? l(e[s], t[s]) : t[s];
    }
  return e;
}
const wv = {
  data: Ql,
  props: ea,
  emits: ea,
  // objects
  methods: zi,
  computed: zi,
  // lifecycle
  beforeCreate: ct,
  created: ct,
  beforeMount: ct,
  mounted: ct,
  beforeUpdate: ct,
  updated: ct,
  beforeDestroy: ct,
  beforeUnmount: ct,
  destroyed: ct,
  unmounted: ct,
  activated: ct,
  deactivated: ct,
  errorCaptured: ct,
  serverPrefetch: ct,
  // assets
  components: zi,
  directives: zi,
  // watch
  watch: Ev,
  // provide / inject
  provide: Ql,
  inject: Sv
};
function Ql(e, t) {
  return t ? e ? function() {
    return Fe(
      re(e) ? e.call(this, this) : e,
      re(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function Sv(e, t) {
  return zi(ys(e), ys(t));
}
function ys(e) {
  if (te(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++)
      t[e[n]] = e[n];
    return t;
  }
  return e;
}
function ct(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function zi(e, t) {
  return e ? Fe(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function ea(e, t) {
  return e ? te(e) && te(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : Fe(
    /* @__PURE__ */ Object.create(null),
    Xl(e),
    Xl(t ?? {})
  ) : t;
}
function Ev(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = Fe(/* @__PURE__ */ Object.create(null), e);
  for (const i in t)
    n[i] = ct(e[i], t[i]);
  return n;
}
function Cc() {
  return {
    app: null,
    config: {
      isNativeTag: Lf,
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
let Cv = 0;
function kv(e, t) {
  return function(i, o = null) {
    re(i) || (i = Fe({}, i)), o != null && !Ne(o) && (_.NODE_ENV !== "production" && j("root props passed to app.mount() must be an object."), o = null);
    const r = Cc(), s = /* @__PURE__ */ new WeakSet(), l = [];
    let a = !1;
    const d = r.app = {
      _uid: Cv++,
      _component: i,
      _props: o,
      _container: null,
      _context: r,
      _instance: null,
      version: da,
      get config() {
        return r.config;
      },
      set config(u) {
        _.NODE_ENV !== "production" && j(
          "app.config cannot be replaced. Modify individual options instead."
        );
      },
      use(u, ...c) {
        return s.has(u) ? _.NODE_ENV !== "production" && j("Plugin has already been applied to target app.") : u && re(u.install) ? (s.add(u), u.install(d, ...c)) : re(u) ? (s.add(u), u(d, ...c)) : _.NODE_ENV !== "production" && j(
          'A plugin must either be a function or an object with an "install" function.'
        ), d;
      },
      mixin(u) {
        return r.mixins.includes(u) ? _.NODE_ENV !== "production" && j(
          "Mixin has already been applied to target app" + (u.name ? `: ${u.name}` : "")
        ) : r.mixins.push(u), d;
      },
      component(u, c) {
        return _.NODE_ENV !== "production" && Es(u, r.config), c ? (_.NODE_ENV !== "production" && r.components[u] && j(`Component "${u}" has already been registered in target app.`), r.components[u] = c, d) : r.components[u];
      },
      directive(u, c) {
        return _.NODE_ENV !== "production" && lc(u), c ? (_.NODE_ENV !== "production" && r.directives[u] && j(`Directive "${u}" has already been registered in target app.`), r.directives[u] = c, d) : r.directives[u];
      },
      mount(u, c, m) {
        if (a)
          _.NODE_ENV !== "production" && j(
            "App has already been mounted.\nIf you want to remount the same app, move your app creation logic into a factory function and create fresh app instances for each mount - e.g. `const createMyApp = () => createApp(App)`"
          );
        else {
          _.NODE_ENV !== "production" && u.__vue_app__ && j(
            "There is already an app instance mounted on the host container.\n If you want to mount another app on the same host container, you need to unmount the previous app by calling `app.unmount()` first."
          );
          const v = d._ceVNode || f(i, o);
          return v.appContext = r, m === !0 ? m = "svg" : m === !1 && (m = void 0), _.NODE_ENV !== "production" && (r.reload = () => {
            e(
              Rt(v),
              u,
              m
            );
          }), c && t ? t(v, u) : e(v, u, m), a = !0, d._container = u, u.__vue_app__ = d, _.NODE_ENV !== "production" && (d._instance = v.component, Um(d, da)), xr(v.component);
        }
      },
      onUnmount(u) {
        _.NODE_ENV !== "production" && typeof u != "function" && j(
          `Expected function as first argument to app.onUnmount(), but got ${typeof u}`
        ), l.push(u);
      },
      unmount() {
        a ? (Bt(
          l,
          d._instance,
          16
        ), e(null, d._container), _.NODE_ENV !== "production" && (d._instance = null, Wm(d)), delete d._container.__vue_app__) : _.NODE_ENV !== "production" && j("Cannot unmount an app that is not mounted.");
      },
      provide(u, c) {
        return _.NODE_ENV !== "production" && u in r.provides && j(
          `App already provides property with key "${String(u)}". It will be overwritten with the new value.`
        ), r.provides[u] = c, d;
      },
      runWithContext(u) {
        const c = Ci;
        Ci = d;
        try {
          return u();
        } finally {
          Ci = c;
        }
      }
    };
    return d;
  };
}
let Ci = null;
function gt(e, t) {
  if (!Ze)
    _.NODE_ENV !== "production" && j("provide() can only be used inside setup().");
  else {
    let n = Ze.provides;
    const i = Ze.parent && Ze.parent.provides;
    i === n && (n = Ze.provides = Object.create(i)), n[e] = t;
  }
}
function Re(e, t, n = !1) {
  const i = Ze || st;
  if (i || Ci) {
    const o = Ci ? Ci._context.provides : i ? i.parent == null ? i.vnode.appContext && i.vnode.appContext.provides : i.parent.provides : void 0;
    if (o && e in o)
      return o[e];
    if (arguments.length > 1)
      return n && re(t) ? t.call(i && i.proxy) : t;
    _.NODE_ENV !== "production" && j(`injection "${String(e)}" not found.`);
  } else _.NODE_ENV !== "production" && j("inject() can only be used inside setup() or functional components.");
}
const kc = {}, Nc = () => Object.create(kc), xc = (e) => Object.getPrototypeOf(e) === kc;
function Nv(e, t, n, i = !1) {
  const o = {}, r = Nc();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), Vc(e, t, o, r);
  for (const s in e.propsOptions[0])
    s in o || (o[s] = void 0);
  _.NODE_ENV !== "production" && Dc(t || {}, o, e), n ? e.props = i ? o : Em(o) : e.type.props ? e.props = o : e.props = r, e.attrs = r;
}
function xv(e) {
  for (; e; ) {
    if (e.type.__hmrId) return !0;
    e = e.parent;
  }
}
function Vv(e, t, n, i) {
  const {
    props: o,
    attrs: r,
    vnode: { patchFlag: s }
  } = e, l = J(o), [a] = e.propsOptions;
  let d = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(_.NODE_ENV !== "production" && xv(e)) && (i || s > 0) && !(s & 16)
  ) {
    if (s & 8) {
      const u = e.vnode.dynamicProps;
      for (let c = 0; c < u.length; c++) {
        let m = u[c];
        if (kr(e.emitsOptions, m))
          continue;
        const v = t[m];
        if (a)
          if (Se(r, m))
            v !== r[m] && (r[m] = v, d = !0);
          else {
            const g = tt(m);
            o[g] = bs(
              a,
              l,
              g,
              v,
              e,
              !1
            );
          }
        else
          v !== r[m] && (r[m] = v, d = !0);
      }
    }
  } else {
    Vc(e, t, o, r) && (d = !0);
    let u;
    for (const c in l)
      (!t || // for camelCase
      !Se(t, c) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((u = Tn(c)) === c || !Se(t, u))) && (a ? n && // for camelCase
      (n[c] !== void 0 || // for kebab-case
      n[u] !== void 0) && (o[c] = bs(
        a,
        l,
        c,
        void 0,
        e,
        !0
      )) : delete o[c]);
    if (r !== l)
      for (const c in r)
        (!t || !Se(t, c)) && (delete r[c], d = !0);
  }
  d && Gt(e.attrs, "set", ""), _.NODE_ENV !== "production" && Dc(t || {}, o, e);
}
function Vc(e, t, n, i) {
  const [o, r] = e.propsOptions;
  let s = !1, l;
  if (t)
    for (let a in t) {
      if (Wi(a))
        continue;
      const d = t[a];
      let u;
      o && Se(o, u = tt(a)) ? !r || !r.includes(u) ? n[u] = d : (l || (l = {}))[u] = d : kr(e.emitsOptions, a) || (!(a in i) || d !== i[a]) && (i[a] = d, s = !0);
    }
  if (r) {
    const a = J(n), d = l || De;
    for (let u = 0; u < r.length; u++) {
      const c = r[u];
      n[c] = bs(
        o,
        a,
        c,
        d[c],
        e,
        !Se(d, c)
      );
    }
  }
  return s;
}
function bs(e, t, n, i, o, r) {
  const s = e[n];
  if (s != null) {
    const l = Se(s, "default");
    if (l && i === void 0) {
      const a = s.default;
      if (s.type !== Function && !s.skipFactory && re(a)) {
        const { propsDefaults: d } = o;
        if (n in d)
          i = d[n];
        else {
          const u = yo(o);
          i = d[n] = a.call(
            null,
            t
          ), u();
        }
      } else
        i = a;
      o.ce && o.ce._setProp(n, i);
    }
    s[
      0
      /* shouldCast */
    ] && (r && !l ? i = !1 : s[
      1
      /* shouldCastTrue */
    ] && (i === "" || i === Tn(n)) && (i = !0));
  }
  return i;
}
const Ov = /* @__PURE__ */ new WeakMap();
function Oc(e, t, n = !1) {
  const i = n ? Ov : t.propsCache, o = i.get(e);
  if (o)
    return o;
  const r = e.props, s = {}, l = [];
  let a = !1;
  if (!re(e)) {
    const u = (c) => {
      a = !0;
      const [m, v] = Oc(c, t, !0);
      Fe(s, m), v && l.push(...v);
    };
    !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
  }
  if (!r && !a)
    return Ne(e) && i.set(e, wi), wi;
  if (te(r))
    for (let u = 0; u < r.length; u++) {
      _.NODE_ENV !== "production" && !Me(r[u]) && j("props must be strings when using array syntax.", r[u]);
      const c = tt(r[u]);
      ta(c) && (s[c] = De);
    }
  else if (r) {
    _.NODE_ENV !== "production" && !Ne(r) && j("invalid props options", r);
    for (const u in r) {
      const c = tt(u);
      if (ta(c)) {
        const m = r[u], v = s[c] = te(m) || re(m) ? { type: m } : Fe({}, m), g = v.type;
        let h = !1, w = !0;
        if (te(g))
          for (let C = 0; C < g.length; ++C) {
            const O = g[C], P = re(O) && O.name;
            if (P === "Boolean") {
              h = !0;
              break;
            } else P === "String" && (w = !1);
          }
        else
          h = re(g) && g.name === "Boolean";
        v[
          0
          /* shouldCast */
        ] = h, v[
          1
          /* shouldCastTrue */
        ] = w, (h || Se(v, "default")) && l.push(c);
      }
    }
  }
  const d = [s, l];
  return Ne(e) && i.set(e, d), d;
}
function ta(e) {
  return e[0] !== "$" && !Wi(e) ? !0 : (_.NODE_ENV !== "production" && j(`Invalid prop name: "${e}" is a reserved property.`), !1);
}
function Dv(e) {
  return e === null ? "null" : typeof e == "function" ? e.name || "" : typeof e == "object" && e.constructor && e.constructor.name || "";
}
function Dc(e, t, n) {
  const i = J(t), o = n.propsOptions[0], r = Object.keys(e).map((s) => tt(s));
  for (const s in o) {
    let l = o[s];
    l != null && Tv(
      s,
      i[s],
      l,
      _.NODE_ENV !== "production" ? Zt(i) : i,
      !r.includes(s)
    );
  }
}
function Tv(e, t, n, i, o) {
  const { type: r, required: s, validator: l, skipCheck: a } = n;
  if (s && o) {
    j('Missing required prop: "' + e + '"');
    return;
  }
  if (!(t == null && !s)) {
    if (r != null && r !== !0 && !a) {
      let d = !1;
      const u = te(r) ? r : [r], c = [];
      for (let m = 0; m < u.length && !d; m++) {
        const { valid: v, expectedType: g } = Av(t, u[m]);
        c.push(g || ""), d = v;
      }
      if (!d) {
        j(Iv(e, t, c));
        return;
      }
    }
    l && !l(t, i) && j('Invalid prop: custom validator check failed for prop "' + e + '".');
  }
}
const Pv = /* @__PURE__ */ vn(
  "String,Number,Boolean,Function,Symbol,BigInt"
);
function Av(e, t) {
  let n;
  const i = Dv(t);
  if (i === "null")
    n = e === null;
  else if (Pv(i)) {
    const o = typeof e;
    n = o === i.toLowerCase(), !n && o === "object" && (n = e instanceof t);
  } else i === "Object" ? n = Ne(e) : i === "Array" ? n = te(e) : n = e instanceof t;
  return {
    valid: n,
    expectedType: i
  };
}
function Iv(e, t, n) {
  if (n.length === 0)
    return `Prop type [] for prop "${e}" won't match anything. Did you mean to use type Array instead?`;
  let i = `Invalid prop: type check failed for prop "${e}". Expected ${n.map(Tt).join(" | ")}`;
  const o = n[0], r = zs(t), s = na(t, o), l = na(t, r);
  return n.length === 1 && ia(o) && !$v(o, r) && (i += ` with value ${s}`), i += `, got ${r} `, ia(r) && (i += `with value ${l}.`), i;
}
function na(e, t) {
  return t === "String" ? `"${e}"` : t === "Number" ? `${Number(e)}` : `${e}`;
}
function ia(e) {
  return ["string", "number", "boolean"].some((n) => e.toLowerCase() === n);
}
function $v(...e) {
  return e.some((t) => t.toLowerCase() === "boolean");
}
const Tc = (e) => e[0] === "_" || e === "$stable", rl = (e) => te(e) ? e.map(Mt) : [Mt(e)], Mv = (e, t, n) => {
  if (t._n)
    return t;
  const i = k((...o) => (_.NODE_ENV !== "production" && Ze && (!n || n.root === Ze.root) && j(
    `Slot "${e}" invoked outside of the render function: this will not track dependencies used in the slot. Invoke the slot function inside the render function instead.`
  ), rl(t(...o))), n);
  return i._c = !1, i;
}, Pc = (e, t, n) => {
  const i = e._ctx;
  for (const o in e) {
    if (Tc(o)) continue;
    const r = e[o];
    if (re(r))
      t[o] = Mv(o, r, i);
    else if (r != null) {
      _.NODE_ENV !== "production" && j(
        `Non-function value encountered for slot "${o}". Prefer function slots for better performance.`
      );
      const s = rl(r);
      t[o] = () => s;
    }
  }
}, Ac = (e, t) => {
  _.NODE_ENV !== "production" && !po(e.vnode) && j(
    "Non-function value encountered for default slot. Prefer function slots for better performance."
  );
  const n = rl(t);
  e.slots.default = () => n;
}, _s = (e, t, n) => {
  for (const i in t)
    (n || i !== "_") && (e[i] = t[i]);
}, Fv = (e, t, n) => {
  const i = e.slots = Nc();
  if (e.vnode.shapeFlag & 32) {
    const o = t._;
    o ? (_s(i, t, n), n && Ko(i, "_", o, !0)) : Pc(t, i);
  } else t && Ac(e, t);
}, Lv = (e, t, n) => {
  const { vnode: i, slots: o } = e;
  let r = !0, s = De;
  if (i.shapeFlag & 32) {
    const l = t._;
    l ? _.NODE_ENV !== "production" && Ft ? (_s(o, t, n), Gt(e, "set", "$slots")) : n && l === 1 ? r = !1 : _s(o, t, n) : (r = !t.$stable, Pc(t, o)), s = t;
  } else t && (Ac(e, t), s = { default: 1 });
  if (r)
    for (const l in o)
      !Tc(l) && s[l] == null && delete o[l];
};
let Mi, On;
function on(e, t) {
  e.appContext.config.performance && Qo() && On.mark(`vue-${t}-${e.uid}`), _.NODE_ENV !== "production" && qm(e, t, Qo() ? On.now() : Date.now());
}
function rn(e, t) {
  if (e.appContext.config.performance && Qo()) {
    const n = `vue-${t}-${e.uid}`, i = n + ":end";
    On.mark(i), On.measure(
      `<${Vr(e, e.type)}> ${t}`,
      n,
      i
    ), On.clearMarks(n), On.clearMarks(i);
  }
  _.NODE_ENV !== "production" && Zm(e, t, Qo() ? On.now() : Date.now());
}
function Qo() {
  return Mi !== void 0 || (typeof window < "u" && window.performance ? (Mi = !0, On = window.performance) : Mi = !1), Mi;
}
function Bv() {
  const e = [];
  if (_.NODE_ENV !== "production" && e.length) {
    const t = e.length > 1;
    console.warn(
      `Feature flag${t ? "s" : ""} ${e.join(", ")} ${t ? "are" : "is"} not explicitly defined. You are running the esm-bundler build of Vue, which expects these compile-time feature flags to be globally injected via the bundler config in order to get better tree-shaking in the production bundle.

For more details, see https://link.vuejs.org/feature-flags.`
    );
  }
}
const ht = Qv;
function Rv(e) {
  return Hv(e);
}
function Hv(e, t) {
  Bv();
  const n = mo();
  n.__VUE__ = !0, _.NODE_ENV !== "production" && ic(n.__VUE_DEVTOOLS_GLOBAL_HOOK__, n);
  const {
    insert: i,
    remove: o,
    patchProp: r,
    createElement: s,
    createText: l,
    createComment: a,
    setText: d,
    setElementText: u,
    parentNode: c,
    nextSibling: m,
    setScopeId: v = qe,
    insertStaticContent: g
  } = e, h = (p, b, D, R = null, I = null, F = null, K = void 0, U = null, z = _.NODE_ENV !== "production" && Ft ? !1 : !!b.dynamicChildren) => {
    if (p === b)
      return;
    p && !Gn(p, b) && (R = Ie(p), xe(p, I, F, !0), p = null), b.patchFlag === -2 && (z = !1, b.dynamicChildren = null);
    const { type: H, ref: le, shapeFlag: G } = b;
    switch (H) {
      case ui:
        w(p, b, D, R);
        break;
      case Ke:
        C(p, b, D, R);
        break;
      case Bo:
        p == null ? O(b, D, R, K) : _.NODE_ENV !== "production" && P(p, b, D, K);
        break;
      case Ce:
        T(
          p,
          b,
          D,
          R,
          I,
          F,
          K,
          U,
          z
        );
        break;
      default:
        G & 1 ? N(
          p,
          b,
          D,
          R,
          I,
          F,
          K,
          U,
          z
        ) : G & 6 ? B(
          p,
          b,
          D,
          R,
          I,
          F,
          K,
          U,
          z
        ) : G & 64 || G & 128 ? H.process(
          p,
          b,
          D,
          R,
          I,
          F,
          K,
          U,
          z,
          Rn
        ) : _.NODE_ENV !== "production" && j("Invalid VNode type:", H, `(${typeof H})`);
    }
    le != null && I && vs(le, p && p.ref, F, b || p, !b);
  }, w = (p, b, D, R) => {
    if (p == null)
      i(
        b.el = l(b.children),
        D,
        R
      );
    else {
      const I = b.el = p.el;
      b.children !== p.children && d(I, b.children);
    }
  }, C = (p, b, D, R) => {
    p == null ? i(
      b.el = a(b.children || ""),
      D,
      R
    ) : b.el = p.el;
  }, O = (p, b, D, R) => {
    [p.el, p.anchor] = g(
      p.children,
      b,
      D,
      R,
      p.el,
      p.anchor
    );
  }, P = (p, b, D, R) => {
    if (b.children !== p.children) {
      const I = m(p.anchor);
      x(p), [b.el, b.anchor] = g(
        b.children,
        D,
        I,
        R
      );
    } else
      b.el = p.el, b.anchor = p.anchor;
  }, M = ({ el: p, anchor: b }, D, R) => {
    let I;
    for (; p && p !== b; )
      I = m(p), i(p, D, R), p = I;
    i(b, D, R);
  }, x = ({ el: p, anchor: b }) => {
    let D;
    for (; p && p !== b; )
      D = m(p), o(p), p = D;
    o(b);
  }, N = (p, b, D, R, I, F, K, U, z) => {
    b.type === "svg" ? K = "svg" : b.type === "math" && (K = "mathml"), p == null ? $(
      b,
      D,
      R,
      I,
      F,
      K,
      U,
      z
    ) : L(
      p,
      b,
      I,
      F,
      K,
      U,
      z
    );
  }, $ = (p, b, D, R, I, F, K, U) => {
    let z, H;
    const { props: le, shapeFlag: G, transition: ee, dirs: de } = p;
    if (z = p.el = s(
      p.type,
      F,
      le && le.is,
      le
    ), G & 8 ? u(z, p.children) : G & 16 && V(
      p.children,
      z,
      null,
      R,
      I,
      Kr(p, F),
      K,
      U
    ), de && Hn(p, null, R, "created"), E(z, p, p.scopeId, K, R), le) {
      for (const $e in le)
        $e !== "value" && !Wi($e) && r(z, $e, null, le[$e], F, R);
      "value" in le && r(z, "value", null, le.value, F), (H = le.onVnodeBeforeMount) && Ut(H, R, p);
    }
    _.NODE_ENV !== "production" && (Ko(z, "__vnode", p, !0), Ko(z, "__vueParentComponent", R, !0)), de && Hn(p, null, R, "beforeMount");
    const we = jv(I, ee);
    we && ee.beforeEnter(z), i(z, b, D), ((H = le && le.onVnodeMounted) || we || de) && ht(() => {
      H && Ut(H, R, p), we && ee.enter(z), de && Hn(p, null, R, "mounted");
    }, I);
  }, E = (p, b, D, R, I) => {
    if (D && v(p, D), R)
      for (let F = 0; F < R.length; F++)
        v(p, R[F]);
    if (I) {
      let F = I.subTree;
      if (_.NODE_ENV !== "production" && F.patchFlag > 0 && F.patchFlag & 2048 && (F = ll(F.children) || F), b === F || Lc(F.type) && (F.ssContent === b || F.ssFallback === b)) {
        const K = I.vnode;
        E(
          p,
          K,
          K.scopeId,
          K.slotScopeIds,
          I.parent
        );
      }
    }
  }, V = (p, b, D, R, I, F, K, U, z = 0) => {
    for (let H = z; H < p.length; H++) {
      const le = p[H] = U ? Vn(p[H]) : Mt(p[H]);
      h(
        null,
        le,
        b,
        D,
        R,
        I,
        F,
        K,
        U
      );
    }
  }, L = (p, b, D, R, I, F, K) => {
    const U = b.el = p.el;
    _.NODE_ENV !== "production" && (U.__vnode = b);
    let { patchFlag: z, dynamicChildren: H, dirs: le } = b;
    z |= p.patchFlag & 16;
    const G = p.props || De, ee = b.props || De;
    let de;
    if (D && jn(D, !1), (de = ee.onVnodeBeforeUpdate) && Ut(de, D, b, p), le && Hn(b, p, D, "beforeUpdate"), D && jn(D, !0), _.NODE_ENV !== "production" && Ft && (z = 0, K = !1, H = null), (G.innerHTML && ee.innerHTML == null || G.textContent && ee.textContent == null) && u(U, ""), H ? (A(
      p.dynamicChildren,
      H,
      U,
      D,
      R,
      Kr(b, I),
      F
    ), _.NODE_ENV !== "production" && qi(p, b)) : K || ye(
      p,
      b,
      U,
      null,
      D,
      R,
      Kr(b, I),
      F,
      !1
    ), z > 0) {
      if (z & 16)
        S(U, G, ee, D, I);
      else if (z & 2 && G.class !== ee.class && r(U, "class", null, ee.class, I), z & 4 && r(U, "style", G.style, ee.style, I), z & 8) {
        const we = b.dynamicProps;
        for (let $e = 0; $e < we.length; $e++) {
          const Pe = we[$e], wt = G[Pe], ot = ee[Pe];
          (ot !== wt || Pe === "value") && r(U, Pe, wt, ot, I, D);
        }
      }
      z & 1 && p.children !== b.children && u(U, b.children);
    } else !K && H == null && S(U, G, ee, D, I);
    ((de = ee.onVnodeUpdated) || le) && ht(() => {
      de && Ut(de, D, b, p), le && Hn(b, p, D, "updated");
    }, R);
  }, A = (p, b, D, R, I, F, K) => {
    for (let U = 0; U < b.length; U++) {
      const z = p[U], H = b[U], le = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        z.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (z.type === Ce || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !Gn(z, H) || // - In the case of a component, it could contain anything.
        z.shapeFlag & 70) ? c(z.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          D
        )
      );
      h(
        z,
        H,
        le,
        null,
        R,
        I,
        F,
        K,
        !0
      );
    }
  }, S = (p, b, D, R, I) => {
    if (b !== D) {
      if (b !== De)
        for (const F in b)
          !Wi(F) && !(F in D) && r(
            p,
            F,
            b[F],
            null,
            I,
            R
          );
      for (const F in D) {
        if (Wi(F)) continue;
        const K = D[F], U = b[F];
        K !== U && F !== "value" && r(p, F, U, K, I, R);
      }
      "value" in D && r(p, "value", b.value, D.value, I);
    }
  }, T = (p, b, D, R, I, F, K, U, z) => {
    const H = b.el = p ? p.el : l(""), le = b.anchor = p ? p.anchor : l("");
    let { patchFlag: G, dynamicChildren: ee, slotScopeIds: de } = b;
    _.NODE_ENV !== "production" && // #5523 dev root fragment may inherit directives
    (Ft || G & 2048) && (G = 0, z = !1, ee = null), de && (U = U ? U.concat(de) : de), p == null ? (i(H, D, R), i(le, D, R), V(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      b.children || [],
      D,
      le,
      I,
      F,
      K,
      U,
      z
    )) : G > 0 && G & 64 && ee && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    p.dynamicChildren ? (A(
      p.dynamicChildren,
      ee,
      D,
      I,
      F,
      K,
      U
    ), _.NODE_ENV !== "production" ? qi(p, b) : (
      // #2080 if the stable fragment has a key, it's a <template v-for> that may
      //  get moved around. Make sure all root level vnodes inherit el.
      // #2134 or if it's a component root, it may also get moved around
      // as the component is being moved.
      (b.key != null || I && b === I.subTree) && qi(
        p,
        b,
        !0
        /* shallow */
      )
    )) : ye(
      p,
      b,
      D,
      le,
      I,
      F,
      K,
      U,
      z
    );
  }, B = (p, b, D, R, I, F, K, U, z) => {
    b.slotScopeIds = U, p == null ? b.shapeFlag & 512 ? I.ctx.activate(
      b,
      D,
      R,
      K,
      z
    ) : Z(
      b,
      D,
      R,
      I,
      F,
      K,
      z
    ) : Q(p, b, z);
  }, Z = (p, b, D, R, I, F, K) => {
    const U = p.component = rg(
      p,
      R,
      I
    );
    if (_.NODE_ENV !== "production" && U.type.__hmrId && Rm(U), _.NODE_ENV !== "production" && ($o(p), on(U, "mount")), po(p) && (U.ctx.renderer = Rn), _.NODE_ENV !== "production" && on(U, "init"), lg(U, !1, K), _.NODE_ENV !== "production" && rn(U, "init"), U.asyncDep) {
      if (_.NODE_ENV !== "production" && Ft && (p.el = null), I && I.registerDep(U, X, K), !p.el) {
        const z = U.subTree = f(Ke);
        C(null, z, b, D);
      }
    } else
      X(
        U,
        p,
        b,
        D,
        I,
        F,
        K
      );
    _.NODE_ENV !== "production" && (Mo(), rn(U, "mount"));
  }, Q = (p, b, D) => {
    const R = b.component = p.component;
    if (Xv(p, b, D))
      if (R.asyncDep && !R.asyncResolved) {
        _.NODE_ENV !== "production" && $o(b), q(R, b, D), _.NODE_ENV !== "production" && Mo();
        return;
      } else
        R.next = b, R.update();
    else
      b.el = p.el, R.vnode = b;
  }, X = (p, b, D, R, I, F, K) => {
    const U = () => {
      if (p.isMounted) {
        let { next: G, bu: ee, u: de, parent: we, vnode: $e } = p;
        {
          const St = Ic(p);
          if (St) {
            G && (G.el = $e.el, q(p, G, K)), St.asyncDep.then(() => {
              p.isUnmounted || U();
            });
            return;
          }
        }
        let Pe = G, wt;
        _.NODE_ENV !== "production" && $o(G || p.vnode), jn(p, !1), G ? (G.el = $e.el, q(p, G, K)) : G = $e, ee && Ii(ee), (wt = G.props && G.props.onVnodeBeforeUpdate) && Ut(wt, we, G, $e), jn(p, !0), _.NODE_ENV !== "production" && on(p, "render");
        const ot = Gr(p);
        _.NODE_ENV !== "production" && rn(p, "render");
        const $t = p.subTree;
        p.subTree = ot, _.NODE_ENV !== "production" && on(p, "patch"), h(
          $t,
          ot,
          // parent may have changed if it's in a teleport
          c($t.el),
          // anchor may have changed if it's in a fragment
          Ie($t),
          p,
          I,
          F
        ), _.NODE_ENV !== "production" && rn(p, "patch"), G.el = ot.el, Pe === null && Jv(p, ot.el), de && ht(de, I), (wt = G.props && G.props.onVnodeUpdated) && ht(
          () => Ut(wt, we, G, $e),
          I
        ), _.NODE_ENV !== "production" && oc(p), _.NODE_ENV !== "production" && Mo();
      } else {
        let G;
        const { el: ee, props: de } = b, { bm: we, m: $e, parent: Pe, root: wt, type: ot } = p, $t = Yi(b);
        if (jn(p, !1), we && Ii(we), !$t && (G = de && de.onVnodeBeforeMount) && Ut(G, Pe, b), jn(p, !0), ee && ko) {
          const St = () => {
            _.NODE_ENV !== "production" && on(p, "render"), p.subTree = Gr(p), _.NODE_ENV !== "production" && rn(p, "render"), _.NODE_ENV !== "production" && on(p, "hydrate"), ko(
              ee,
              p.subTree,
              p,
              I,
              null
            ), _.NODE_ENV !== "production" && rn(p, "hydrate");
          };
          $t && ot.__asyncHydrate ? ot.__asyncHydrate(
            ee,
            p,
            St
          ) : St();
        } else {
          wt.ce && wt.ce._injectChildStyle(ot), _.NODE_ENV !== "production" && on(p, "render");
          const St = p.subTree = Gr(p);
          _.NODE_ENV !== "production" && rn(p, "render"), _.NODE_ENV !== "production" && on(p, "patch"), h(
            null,
            St,
            D,
            R,
            p,
            I,
            F
          ), _.NODE_ENV !== "production" && rn(p, "patch"), b.el = St.el;
        }
        if ($e && ht($e, I), !$t && (G = de && de.onVnodeMounted)) {
          const St = b;
          ht(
            () => Ut(G, Pe, St),
            I
          );
        }
        (b.shapeFlag & 256 || Pe && Yi(Pe.vnode) && Pe.vnode.shapeFlag & 256) && p.a && ht(p.a, I), p.isMounted = !0, _.NODE_ENV !== "production" && Km(p), b = D = R = null;
      }
    };
    p.scope.on();
    const z = p.effect = new Du(U);
    p.scope.off();
    const H = p.update = z.run.bind(z), le = p.job = z.runIfDirty.bind(z);
    le.i = p, le.id = p.uid, z.scheduler = () => Er(le), jn(p, !0), _.NODE_ENV !== "production" && (z.onTrack = p.rtc ? (G) => Ii(p.rtc, G) : void 0, z.onTrigger = p.rtg ? (G) => Ii(p.rtg, G) : void 0), H();
  }, q = (p, b, D) => {
    b.component = p;
    const R = p.vnode.props;
    p.vnode = b, p.next = null, Vv(p, b.props, R, D), Lv(p, b.children, D), gn(), Wl(p), hn();
  }, ye = (p, b, D, R, I, F, K, U, z = !1) => {
    const H = p && p.children, le = p ? p.shapeFlag : 0, G = b.children, { patchFlag: ee, shapeFlag: de } = b;
    if (ee > 0) {
      if (ee & 128) {
        fe(
          H,
          G,
          D,
          R,
          I,
          F,
          K,
          U,
          z
        );
        return;
      } else if (ee & 256) {
        be(
          H,
          G,
          D,
          R,
          I,
          F,
          K,
          U,
          z
        );
        return;
      }
    }
    de & 8 ? (le & 16 && ce(H, I, F), G !== H && u(D, G)) : le & 16 ? de & 16 ? fe(
      H,
      G,
      D,
      R,
      I,
      F,
      K,
      U,
      z
    ) : ce(H, I, F, !0) : (le & 8 && u(D, ""), de & 16 && V(
      G,
      D,
      R,
      I,
      F,
      K,
      U,
      z
    ));
  }, be = (p, b, D, R, I, F, K, U, z) => {
    p = p || wi, b = b || wi;
    const H = p.length, le = b.length, G = Math.min(H, le);
    let ee;
    for (ee = 0; ee < G; ee++) {
      const de = b[ee] = z ? Vn(b[ee]) : Mt(b[ee]);
      h(
        p[ee],
        de,
        D,
        null,
        I,
        F,
        K,
        U,
        z
      );
    }
    H > le ? ce(
      p,
      I,
      F,
      !0,
      !1,
      G
    ) : V(
      b,
      D,
      R,
      I,
      F,
      K,
      U,
      z,
      G
    );
  }, fe = (p, b, D, R, I, F, K, U, z) => {
    let H = 0;
    const le = b.length;
    let G = p.length - 1, ee = le - 1;
    for (; H <= G && H <= ee; ) {
      const de = p[H], we = b[H] = z ? Vn(b[H]) : Mt(b[H]);
      if (Gn(de, we))
        h(
          de,
          we,
          D,
          null,
          I,
          F,
          K,
          U,
          z
        );
      else
        break;
      H++;
    }
    for (; H <= G && H <= ee; ) {
      const de = p[G], we = b[ee] = z ? Vn(b[ee]) : Mt(b[ee]);
      if (Gn(de, we))
        h(
          de,
          we,
          D,
          null,
          I,
          F,
          K,
          U,
          z
        );
      else
        break;
      G--, ee--;
    }
    if (H > G) {
      if (H <= ee) {
        const de = ee + 1, we = de < le ? b[de].el : R;
        for (; H <= ee; )
          h(
            null,
            b[H] = z ? Vn(b[H]) : Mt(b[H]),
            D,
            we,
            I,
            F,
            K,
            U,
            z
          ), H++;
      }
    } else if (H > ee)
      for (; H <= G; )
        xe(p[H], I, F, !0), H++;
    else {
      const de = H, we = H, $e = /* @__PURE__ */ new Map();
      for (H = we; H <= ee; H++) {
        const ut = b[H] = z ? Vn(b[H]) : Mt(b[H]);
        ut.key != null && (_.NODE_ENV !== "production" && $e.has(ut.key) && j(
          "Duplicate keys found during update:",
          JSON.stringify(ut.key),
          "Make sure keys are unique."
        ), $e.set(ut.key, H));
      }
      let Pe, wt = 0;
      const ot = ee - we + 1;
      let $t = !1, St = 0;
      const Ai = new Array(ot);
      for (H = 0; H < ot; H++) Ai[H] = 0;
      for (H = de; H <= G; H++) {
        const ut = p[H];
        if (wt >= ot) {
          xe(ut, I, F, !0);
          continue;
        }
        let zt;
        if (ut.key != null)
          zt = $e.get(ut.key);
        else
          for (Pe = we; Pe <= ee; Pe++)
            if (Ai[Pe - we] === 0 && Gn(ut, b[Pe])) {
              zt = Pe;
              break;
            }
        zt === void 0 ? xe(ut, I, F, !0) : (Ai[zt - we] = H + 1, zt >= St ? St = zt : $t = !0, h(
          ut,
          b[zt],
          D,
          null,
          I,
          F,
          K,
          U,
          z
        ), wt++);
      }
      const Bl = $t ? zv(Ai) : wi;
      for (Pe = Bl.length - 1, H = ot - 1; H >= 0; H--) {
        const ut = we + H, zt = b[ut], Rl = ut + 1 < le ? b[ut + 1].el : R;
        Ai[H] === 0 ? h(
          null,
          zt,
          D,
          Rl,
          I,
          F,
          K,
          U,
          z
        ) : $t && (Pe < 0 || H !== Bl[Pe] ? ne(zt, D, Rl, 2) : Pe--);
      }
    }
  }, ne = (p, b, D, R, I = null) => {
    const { el: F, type: K, transition: U, children: z, shapeFlag: H } = p;
    if (H & 6) {
      ne(p.component.subTree, b, D, R);
      return;
    }
    if (H & 128) {
      p.suspense.move(b, D, R);
      return;
    }
    if (H & 64) {
      K.move(p, b, D, Rn);
      return;
    }
    if (K === Ce) {
      i(F, b, D);
      for (let G = 0; G < z.length; G++)
        ne(z[G], b, D, R);
      i(p.anchor, b, D);
      return;
    }
    if (K === Bo) {
      M(p, b, D);
      return;
    }
    if (R !== 2 && H & 1 && U)
      if (R === 0)
        U.beforeEnter(F), i(F, b, D), ht(() => U.enter(F), I);
      else {
        const { leave: G, delayLeave: ee, afterLeave: de } = U, we = () => i(F, b, D), $e = () => {
          G(F, () => {
            we(), de && de();
          });
        };
        ee ? ee(F, we, $e) : $e();
      }
    else
      i(F, b, D);
  }, xe = (p, b, D, R = !1, I = !1) => {
    const {
      type: F,
      props: K,
      ref: U,
      children: z,
      dynamicChildren: H,
      shapeFlag: le,
      patchFlag: G,
      dirs: ee,
      cacheIndex: de
    } = p;
    if (G === -2 && (I = !1), U != null && vs(U, null, D, p, !0), de != null && (b.renderCache[de] = void 0), le & 256) {
      b.ctx.deactivate(p);
      return;
    }
    const we = le & 1 && ee, $e = !Yi(p);
    let Pe;
    if ($e && (Pe = K && K.onVnodeBeforeUnmount) && Ut(Pe, b, p), le & 6)
      Y(p.component, D, R);
    else {
      if (le & 128) {
        p.suspense.unmount(D, R);
        return;
      }
      we && Hn(p, null, b, "beforeUnmount"), le & 64 ? p.type.remove(
        p,
        b,
        D,
        Rn,
        R
      ) : H && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !H.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (F !== Ce || G > 0 && G & 64) ? ce(
        H,
        b,
        D,
        !1,
        !0
      ) : (F === Ce && G & 384 || !I && le & 16) && ce(z, b, D), R && Je(p);
    }
    ($e && (Pe = K && K.onVnodeUnmounted) || we) && ht(() => {
      Pe && Ut(Pe, b, p), we && Hn(p, null, b, "unmounted");
    }, D);
  }, Je = (p) => {
    const { type: b, el: D, anchor: R, transition: I } = p;
    if (b === Ce) {
      _.NODE_ENV !== "production" && p.patchFlag > 0 && p.patchFlag & 2048 && I && !I.persisted ? p.children.forEach((K) => {
        K.type === Ke ? o(K.el) : Je(K);
      }) : Qe(D, R);
      return;
    }
    if (b === Bo) {
      x(p);
      return;
    }
    const F = () => {
      o(D), I && !I.persisted && I.afterLeave && I.afterLeave();
    };
    if (p.shapeFlag & 1 && I && !I.persisted) {
      const { leave: K, delayLeave: U } = I, z = () => K(D, F);
      U ? U(p.el, F, z) : z();
    } else
      F();
  }, Qe = (p, b) => {
    let D;
    for (; p !== b; )
      D = m(p), o(p), p = D;
    o(b);
  }, Y = (p, b, D) => {
    _.NODE_ENV !== "production" && p.type.__hmrId && Hm(p);
    const { bum: R, scope: I, job: F, subTree: K, um: U, m: z, a: H } = p;
    oa(z), oa(H), R && Ii(R), I.stop(), F && (F.flags |= 8, xe(K, p, b, D)), U && ht(U, b), ht(() => {
      p.isUnmounted = !0;
    }, b), b && b.pendingBranch && !b.isUnmounted && p.asyncDep && !p.asyncResolved && p.suspenseId === b.pendingId && (b.deps--, b.deps === 0 && b.resolve()), _.NODE_ENV !== "production" && Ym(p);
  }, ce = (p, b, D, R = !1, I = !1, F = 0) => {
    for (let K = F; K < p.length; K++)
      xe(p[K], b, D, R, I);
  }, Ie = (p) => {
    if (p.shapeFlag & 6)
      return Ie(p.component.subTree);
    if (p.shapeFlag & 128)
      return p.suspense.next();
    const b = m(p.anchor || p.el), D = b && b[ac];
    return D ? m(D) : b;
  };
  let at = !1;
  const Ge = (p, b, D) => {
    p == null ? b._vnode && xe(b._vnode, null, null, !0) : h(
      b._vnode || null,
      p,
      b,
      null,
      null,
      null,
      D
    ), b._vnode = p, at || (at = !0, Wl(), ec(), at = !1);
  }, Rn = {
    p: h,
    um: xe,
    m: ne,
    r: Je,
    mt: Z,
    mc: V,
    pc: ye,
    pbc: A,
    n: Ie,
    o: e
  };
  let Co, ko;
  return {
    render: Ge,
    hydrate: Co,
    createApp: kv(Ge, Co)
  };
}
function Kr({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function jn({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function jv(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function qi(e, t, n = !1) {
  const i = e.children, o = t.children;
  if (te(i) && te(o))
    for (let r = 0; r < i.length; r++) {
      const s = i[r];
      let l = o[r];
      l.shapeFlag & 1 && !l.dynamicChildren && ((l.patchFlag <= 0 || l.patchFlag === 32) && (l = o[r] = Vn(o[r]), l.el = s.el), !n && l.patchFlag !== -2 && qi(s, l)), l.type === ui && (l.el = s.el), _.NODE_ENV !== "production" && l.type === Ke && !l.el && (l.el = s.el);
    }
}
function zv(e) {
  const t = e.slice(), n = [0];
  let i, o, r, s, l;
  const a = e.length;
  for (i = 0; i < a; i++) {
    const d = e[i];
    if (d !== 0) {
      if (o = n[n.length - 1], e[o] < d) {
        t[i] = o, n.push(i);
        continue;
      }
      for (r = 0, s = n.length - 1; r < s; )
        l = r + s >> 1, e[n[l]] < d ? r = l + 1 : s = l;
      d < e[n[r]] && (r > 0 && (t[i] = n[r - 1]), n[r] = i);
    }
  }
  for (r = n.length, s = n[r - 1]; r-- > 0; )
    n[r] = s, s = t[s];
  return n;
}
function Ic(e) {
  const t = e.subTree.component;
  if (t)
    return t.asyncDep && !t.asyncResolved ? t : Ic(t);
}
function oa(e) {
  if (e)
    for (let t = 0; t < e.length; t++)
      e[t].flags |= 8;
}
const Uv = Symbol.for("v-scx"), Wv = () => {
  {
    const e = Re(Uv);
    return e || _.NODE_ENV !== "production" && j(
      "Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build."
    ), e;
  }
};
function yn(e, t) {
  return sl(e, null, t);
}
function ve(e, t, n) {
  return _.NODE_ENV !== "production" && !re(t) && j(
    "`watch(fn, options?)` signature has been moved to a separate API. Use `watchEffect(fn, options?)` instead. `watch` now only supports `watch(source, cb, options?) signature."
  ), sl(e, t, n);
}
function sl(e, t, n = De) {
  const { immediate: i, deep: o, flush: r, once: s } = n;
  _.NODE_ENV !== "production" && !t && (i !== void 0 && j(
    'watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.'
  ), o !== void 0 && j(
    'watch() "deep" option is only respected when using the watch(source, callback, options?) signature.'
  ), s !== void 0 && j(
    'watch() "once" option is only respected when using the watch(source, callback, options?) signature.'
  ));
  const l = Fe({}, n);
  _.NODE_ENV !== "production" && (l.onWarn = j);
  const a = t && i || !t && r !== "post";
  let d;
  if (ro) {
    if (r === "sync") {
      const v = Wv();
      d = v.__watcherHandles || (v.__watcherHandles = []);
    } else if (!a) {
      const v = () => {
      };
      return v.stop = qe, v.resume = qe, v.pause = qe, v;
    }
  }
  const u = Ze;
  l.call = (v, g, h) => Bt(v, u, g, h);
  let c = !1;
  r === "post" ? l.scheduler = (v) => {
    ht(v, u && u.suspense);
  } : r !== "sync" && (c = !0, l.scheduler = (v, g) => {
    g ? v() : Er(v);
  }), l.augmentJob = (v) => {
    t && (v.flags |= 4), c && (v.flags |= 2, u && (v.id = u.uid, v.i = u));
  };
  const m = Tm(e, t, l);
  return ro && (d ? d.push(m) : a && m()), m;
}
function Kv(e, t, n) {
  const i = this.proxy, o = Me(e) ? e.includes(".") ? $c(i, e) : () => i[e] : e.bind(i, i);
  let r;
  re(t) ? r = t : (r = t.handler, n = t);
  const s = yo(this), l = sl(o, r.bind(i), n);
  return s(), l;
}
function $c(e, t) {
  const n = t.split(".");
  return () => {
    let i = e;
    for (let o = 0; o < n.length && i; o++)
      i = i[n[o]];
    return i;
  };
}
const Gv = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${tt(t)}Modifiers`] || e[`${Tn(t)}Modifiers`];
function Yv(e, t, ...n) {
  if (e.isUnmounted) return;
  const i = e.vnode.props || De;
  if (_.NODE_ENV !== "production") {
    const {
      emitsOptions: u,
      propsOptions: [c]
    } = e;
    if (u)
      if (!(t in u))
        (!c || !(Wn(tt(t)) in c)) && j(
          `Component emitted event "${t}" but it is neither declared in the emits option nor as an "${Wn(tt(t))}" prop.`
        );
      else {
        const m = u[t];
        re(m) && (m(...n) || j(
          `Invalid event arguments: event validation failed for event "${t}".`
        ));
      }
  }
  let o = n;
  const r = t.startsWith("update:"), s = r && Gv(i, t.slice(7));
  if (s && (s.trim && (o = n.map((u) => Me(u) ? u.trim() : u)), s.number && (o = n.map(zf))), _.NODE_ENV !== "production" && Xm(e, t, o), _.NODE_ENV !== "production") {
    const u = t.toLowerCase();
    u !== t && i[Wn(u)] && j(
      `Event "${u}" is emitted in component ${Vr(
        e,
        e.type
      )} but the handler is registered for "${t}". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "${Tn(
        t
      )}" instead of "${t}".`
    );
  }
  let l, a = i[l = Wn(t)] || // also try camelCase event handler (#2249)
  i[l = Wn(tt(t))];
  !a && r && (a = i[l = Wn(Tn(t))]), a && Bt(
    a,
    e,
    6,
    o
  );
  const d = i[l + "Once"];
  if (d) {
    if (!e.emitted)
      e.emitted = {};
    else if (e.emitted[l])
      return;
    e.emitted[l] = !0, Bt(
      d,
      e,
      6,
      o
    );
  }
}
function Mc(e, t, n = !1) {
  const i = t.emitsCache, o = i.get(e);
  if (o !== void 0)
    return o;
  const r = e.emits;
  let s = {}, l = !1;
  if (!re(e)) {
    const a = (d) => {
      const u = Mc(d, t, !0);
      u && (l = !0, Fe(s, u));
    };
    !n && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
  }
  return !r && !l ? (Ne(e) && i.set(e, null), null) : (te(r) ? r.forEach((a) => s[a] = null) : Fe(s, r), Ne(e) && i.set(e, s), s);
}
function kr(e, t) {
  return !e || !fo(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), Se(e, t[0].toLowerCase() + t.slice(1)) || Se(e, Tn(t)) || Se(e, t));
}
let ws = !1;
function er() {
  ws = !0;
}
function Gr(e) {
  const {
    type: t,
    vnode: n,
    proxy: i,
    withProxy: o,
    propsOptions: [r],
    slots: s,
    attrs: l,
    emit: a,
    render: d,
    renderCache: u,
    props: c,
    data: m,
    setupState: v,
    ctx: g,
    inheritAttrs: h
  } = e, w = Xo(e);
  let C, O;
  _.NODE_ENV !== "production" && (ws = !1);
  try {
    if (n.shapeFlag & 4) {
      const x = o || i, N = _.NODE_ENV !== "production" && v.__isScriptSetup ? new Proxy(x, {
        get($, E, V) {
          return j(
            `Property '${String(
              E
            )}' was accessed via 'this'. Avoid using 'this' in templates.`
          ), Reflect.get($, E, V);
        }
      }) : x;
      C = Mt(
        d.call(
          N,
          x,
          u,
          _.NODE_ENV !== "production" ? Zt(c) : c,
          v,
          m,
          g
        )
      ), O = l;
    } else {
      const x = t;
      _.NODE_ENV !== "production" && l === c && er(), C = Mt(
        x.length > 1 ? x(
          _.NODE_ENV !== "production" ? Zt(c) : c,
          _.NODE_ENV !== "production" ? {
            get attrs() {
              return er(), Zt(l);
            },
            slots: s,
            emit: a
          } : { attrs: l, slots: s, emit: a }
        ) : x(
          _.NODE_ENV !== "production" ? Zt(c) : c,
          null
        )
      ), O = t.props ? l : qv(l);
    }
  } catch (x) {
    Zi.length = 0, go(x, e, 1), C = f(Ke);
  }
  let P = C, M;
  if (_.NODE_ENV !== "production" && C.patchFlag > 0 && C.patchFlag & 2048 && ([P, M] = Fc(C)), O && h !== !1) {
    const x = Object.keys(O), { shapeFlag: N } = P;
    if (x.length) {
      if (N & 7)
        r && x.some(Wo) && (O = Zv(
          O,
          r
        )), P = Rt(P, O, !1, !0);
      else if (_.NODE_ENV !== "production" && !ws && P.type !== Ke) {
        const $ = Object.keys(l), E = [], V = [];
        for (let L = 0, A = $.length; L < A; L++) {
          const S = $[L];
          fo(S) ? Wo(S) || E.push(S[2].toLowerCase() + S.slice(3)) : V.push(S);
        }
        V.length && j(
          `Extraneous non-props attributes (${V.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes.`
        ), E.length && j(
          `Extraneous non-emits event listeners (${E.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.`
        );
      }
    }
  }
  return n.dirs && (_.NODE_ENV !== "production" && !ra(P) && j(
    "Runtime directive used on component with non-element root node. The directives will not function as intended."
  ), P = Rt(P, null, !1, !0), P.dirs = P.dirs ? P.dirs.concat(n.dirs) : n.dirs), n.transition && (_.NODE_ENV !== "production" && !ra(P) && j(
    "Component inside <Transition> renders non-element root node that cannot be animated."
  ), si(P, n.transition)), _.NODE_ENV !== "production" && M ? M(P) : C = P, Xo(w), C;
}
const Fc = (e) => {
  const t = e.children, n = e.dynamicChildren, i = ll(t, !1);
  if (i) {
    if (_.NODE_ENV !== "production" && i.patchFlag > 0 && i.patchFlag & 2048)
      return Fc(i);
  } else return [e, void 0];
  const o = t.indexOf(i), r = n ? n.indexOf(i) : -1, s = (l) => {
    t[o] = l, n && (r > -1 ? n[r] = l : l.patchFlag > 0 && (e.dynamicChildren = [...n, l]));
  };
  return [Mt(i), s];
};
function ll(e, t = !0) {
  let n;
  for (let i = 0; i < e.length; i++) {
    const o = e[i];
    if (ki(o)) {
      if (o.type !== Ke || o.children === "v-if") {
        if (n)
          return;
        if (n = o, _.NODE_ENV !== "production" && t && n.patchFlag > 0 && n.patchFlag & 2048)
          return ll(n.children);
      }
    } else
      return;
  }
  return n;
}
const qv = (e) => {
  let t;
  for (const n in e)
    (n === "class" || n === "style" || fo(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, Zv = (e, t) => {
  const n = {};
  for (const i in e)
    (!Wo(i) || !(i.slice(9) in t)) && (n[i] = e[i]);
  return n;
}, ra = (e) => e.shapeFlag & 7 || e.type === Ke;
function Xv(e, t, n) {
  const { props: i, children: o, component: r } = e, { props: s, children: l, patchFlag: a } = t, d = r.emitsOptions;
  if (_.NODE_ENV !== "production" && (o || l) && Ft || t.dirs || t.transition)
    return !0;
  if (n && a >= 0) {
    if (a & 1024)
      return !0;
    if (a & 16)
      return i ? sa(i, s, d) : !!s;
    if (a & 8) {
      const u = t.dynamicProps;
      for (let c = 0; c < u.length; c++) {
        const m = u[c];
        if (s[m] !== i[m] && !kr(d, m))
          return !0;
      }
    }
  } else
    return (o || l) && (!l || !l.$stable) ? !0 : i === s ? !1 : i ? s ? sa(i, s, d) : !0 : !!s;
  return !1;
}
function sa(e, t, n) {
  const i = Object.keys(t);
  if (i.length !== Object.keys(e).length)
    return !0;
  for (let o = 0; o < i.length; o++) {
    const r = i[o];
    if (t[r] !== e[r] && !kr(n, r))
      return !0;
  }
  return !1;
}
function Jv({ vnode: e, parent: t }, n) {
  for (; t; ) {
    const i = t.subTree;
    if (i.suspense && i.suspense.activeBranch === e && (i.el = e.el), i === e)
      (e = t.vnode).el = n, t = t.parent;
    else
      break;
  }
}
const Lc = (e) => e.__isSuspense;
function Qv(e, t) {
  t && t.pendingBranch ? te(e) ? t.effects.push(...e) : t.effects.push(e) : Qu(e);
}
const Ce = Symbol.for("v-fgt"), ui = Symbol.for("v-txt"), Ke = Symbol.for("v-cmt"), Bo = Symbol.for("v-stc"), Zi = [];
let Ct = null;
function _e(e = !1) {
  Zi.push(Ct = e ? null : []);
}
function eg() {
  Zi.pop(), Ct = Zi[Zi.length - 1] || null;
}
let oo = 1;
function la(e) {
  oo += e, e < 0 && Ct && (Ct.hasOnce = !0);
}
function Bc(e) {
  return e.dynamicChildren = oo > 0 ? Ct || wi : null, eg(), oo > 0 && Ct && Ct.push(e), e;
}
function Yn(e, t, n, i, o, r) {
  return Bc(
    Oe(
      e,
      t,
      n,
      i,
      o,
      r,
      !0
    )
  );
}
function ke(e, t, n, i, o) {
  return Bc(
    f(
      e,
      t,
      n,
      i,
      o,
      !0
    )
  );
}
function ki(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function Gn(e, t) {
  if (_.NODE_ENV !== "production" && t.shapeFlag & 6 && e.component) {
    const n = Fo.get(t.type);
    if (n && n.has(e.component))
      return e.shapeFlag &= -257, t.shapeFlag &= -513, !1;
  }
  return e.type === t.type && e.key === t.key;
}
const tg = (...e) => Hc(
  ...e
), Rc = ({ key: e }) => e ?? null, Ro = ({
  ref: e,
  ref_key: t,
  ref_for: n
}) => (typeof e == "number" && (e = "" + e), e != null ? Me(e) || Ae(e) || re(e) ? { i: st, r: e, k: t, f: !!n } : e : null);
function Oe(e, t = null, n = null, i = 0, o = null, r = e === Ce ? 0 : 1, s = !1, l = !1) {
  const a = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && Rc(t),
    ref: t && Ro(t),
    scopeId: sc,
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
    shapeFlag: r,
    patchFlag: i,
    dynamicProps: o,
    dynamicChildren: null,
    appContext: null,
    ctx: st
  };
  return l ? (al(a, n), r & 128 && e.normalize(a)) : n && (a.shapeFlag |= Me(n) ? 8 : 16), _.NODE_ENV !== "production" && a.key !== a.key && j("VNode created with invalid key (NaN). VNode type:", a.type), oo > 0 && // avoid a block node from tracking itself
  !s && // has current parent block
  Ct && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (a.patchFlag > 0 || r & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  a.patchFlag !== 32 && Ct.push(a), a;
}
const f = _.NODE_ENV !== "production" ? tg : Hc;
function Hc(e, t = null, n = null, i = 0, o = null, r = !1) {
  if ((!e || e === mv) && (_.NODE_ENV !== "production" && !e && j(`Invalid vnode type when creating vnode: ${e}.`), e = Ke), ki(e)) {
    const l = Rt(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return n && al(l, n), oo > 0 && !r && Ct && (l.shapeFlag & 6 ? Ct[Ct.indexOf(e)] = l : Ct.push(l)), l.patchFlag = -2, l;
  }
  if (Wc(e) && (e = e.__vccOpts), t) {
    t = ng(t);
    let { class: l, style: a } = t;
    l && !Me(l) && (t.class = br(l)), Ne(a) && (to(a) && !te(a) && (a = Fe({}, a)), t.style = yr(a));
  }
  const s = Me(e) ? 1 : Lc(e) ? 128 : uc(e) ? 64 : Ne(e) ? 4 : re(e) ? 2 : 0;
  return _.NODE_ENV !== "production" && s & 4 && to(e) && (e = J(e), j(
    "Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with `markRaw` or using `shallowRef` instead of `ref`.",
    `
Component that was made reactive: `,
    e
  )), Oe(
    e,
    t,
    n,
    i,
    o,
    s,
    r,
    !0
  );
}
function ng(e) {
  return e ? to(e) || xc(e) ? Fe({}, e) : e : null;
}
function Rt(e, t, n = !1, i = !1) {
  const { props: o, ref: r, patchFlag: s, children: l, transition: a } = e, d = t ? Ee(o || {}, t) : o, u = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: d,
    key: d && Rc(d),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      n && r ? te(r) ? r.concat(Ro(t)) : [r, Ro(t)] : Ro(t)
    ) : r,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: _.NODE_ENV !== "production" && s === -1 && te(l) ? l.map(jc) : l,
    target: e.target,
    targetStart: e.targetStart,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: t && e.type !== Ce ? s === -1 ? 16 : s | 16 : s,
    dynamicProps: e.dynamicProps,
    dynamicChildren: e.dynamicChildren,
    appContext: e.appContext,
    dirs: e.dirs,
    transition: a,
    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: e.component,
    suspense: e.suspense,
    ssContent: e.ssContent && Rt(e.ssContent),
    ssFallback: e.ssFallback && Rt(e.ssFallback),
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return a && i && si(
    u,
    a.clone(u)
  ), u;
}
function jc(e) {
  const t = Rt(e);
  return te(e.children) && (t.children = e.children.map(jc)), t;
}
function ae(e = " ", t = 0) {
  return f(ui, null, e, t);
}
function hi(e = "", t = !1) {
  return t ? (_e(), ke(Ke, null, e)) : f(Ke, null, e);
}
function Mt(e) {
  return e == null || typeof e == "boolean" ? f(Ke) : te(e) ? f(
    Ce,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : ki(e) ? Vn(e) : f(ui, null, String(e));
}
function Vn(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : Rt(e);
}
function al(e, t) {
  let n = 0;
  const { shapeFlag: i } = e;
  if (t == null)
    t = null;
  else if (te(t))
    n = 16;
  else if (typeof t == "object")
    if (i & 65) {
      const o = t.default;
      o && (o._c && (o._d = !1), al(e, o()), o._c && (o._d = !0));
      return;
    } else {
      n = 32;
      const o = t._;
      !o && !xc(t) ? t._ctx = st : o === 3 && st && (st.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else re(t) ? (t = { default: t, _ctx: st }, n = 32) : (t = String(t), i & 64 ? (n = 16, t = [ae(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function Ee(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const i = e[n];
    for (const o in i)
      if (o === "class")
        t.class !== i.class && (t.class = br([t.class, i.class]));
      else if (o === "style")
        t.style = yr([t.style, i.style]);
      else if (fo(o)) {
        const r = t[o], s = i[o];
        s && r !== s && !(te(r) && r.includes(s)) && (t[o] = r ? [].concat(r, s) : s);
      } else o !== "" && (t[o] = i[o]);
  }
  return t;
}
function Ut(e, t, n, i = null) {
  Bt(e, t, 7, [
    n,
    i
  ]);
}
const ig = Cc();
let og = 0;
function rg(e, t, n) {
  const i = e.type, o = (t ? t.appContext : e.appContext) || ig, r = {
    uid: og++,
    vnode: e,
    type: i,
    parent: t,
    appContext: o,
    root: null,
    // to be immediately set
    next: null,
    subTree: null,
    // will be set synchronously right after creation
    effect: null,
    update: null,
    // will be set synchronously right after creation
    job: null,
    scope: new Ou(
      !0
      /* detached */
    ),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: t ? t.provides : Object.create(o.provides),
    ids: t ? t.ids : ["", 0, 0],
    accessCache: null,
    renderCache: [],
    // local resolved assets
    components: null,
    directives: null,
    // resolved props and emits options
    propsOptions: Oc(i, o),
    emitsOptions: Mc(i, o),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: De,
    // inheritAttrs
    inheritAttrs: i.inheritAttrs,
    // state
    ctx: De,
    data: De,
    props: De,
    attrs: De,
    slots: De,
    refs: De,
    setupState: De,
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
  return _.NODE_ENV !== "production" ? r.ctx = gv(r) : r.ctx = { _: r }, r.root = t ? t.root : r, r.emit = Yv.bind(null, r), e.ce && e.ce(r), r;
}
let Ze = null;
const Nr = () => Ze || st;
let tr, Ss;
{
  const e = mo(), t = (n, i) => {
    let o;
    return (o = e[n]) || (o = e[n] = []), o.push(i), (r) => {
      o.length > 1 ? o.forEach((s) => s(r)) : o[0](r);
    };
  };
  tr = t(
    "__VUE_INSTANCE_SETTERS__",
    (n) => Ze = n
  ), Ss = t(
    "__VUE_SSR_SETTERS__",
    (n) => ro = n
  );
}
const yo = (e) => {
  const t = Ze;
  return tr(e), e.scope.on(), () => {
    e.scope.off(), tr(t);
  };
}, aa = () => {
  Ze && Ze.scope.off(), tr(null);
}, sg = /* @__PURE__ */ vn("slot,component");
function Es(e, { isNativeTag: t }) {
  (sg(e) || t(e)) && j(
    "Do not use built-in or reserved HTML elements as component id: " + e
  );
}
function zc(e) {
  return e.vnode.shapeFlag & 4;
}
let ro = !1;
function lg(e, t = !1, n = !1) {
  t && Ss(t);
  const { props: i, children: o } = e.vnode, r = zc(e);
  Nv(e, i, r, t), Fv(e, o, n);
  const s = r ? ag(e, t) : void 0;
  return t && Ss(!1), s;
}
function ag(e, t) {
  var n;
  const i = e.type;
  if (_.NODE_ENV !== "production") {
    if (i.name && Es(i.name, e.appContext.config), i.components) {
      const r = Object.keys(i.components);
      for (let s = 0; s < r.length; s++)
        Es(r[s], e.appContext.config);
    }
    if (i.directives) {
      const r = Object.keys(i.directives);
      for (let s = 0; s < r.length; s++)
        lc(r[s]);
    }
    i.compilerOptions && ug() && j(
      '"compilerOptions" is only supported when using a build of Vue that includes the runtime compiler. Since you are using a runtime-only build, the options should be passed via your build tool config instead.'
    );
  }
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Sc), _.NODE_ENV !== "production" && hv(e);
  const { setup: o } = i;
  if (o) {
    gn();
    const r = e.setupContext = o.length > 1 ? dg(e) : null, s = yo(e), l = Oi(
      o,
      e,
      0,
      [
        _.NODE_ENV !== "production" ? Zt(e.props) : e.props,
        r
      ]
    ), a = js(l);
    if (hn(), s(), (a || e.sp) && !Yi(e) && hc(e), a) {
      if (l.then(aa, aa), t)
        return l.then((d) => {
          ua(e, d, t);
        }).catch((d) => {
          go(d, e, 0);
        });
      if (e.asyncDep = l, _.NODE_ENV !== "production" && !e.suspense) {
        const d = (n = i.name) != null ? n : "Anonymous";
        j(
          `Component <${d}>: setup function returned a promise, but no <Suspense> boundary was found in the parent component tree. A component with async setup() must be nested in a <Suspense> in order to be rendered.`
        );
      }
    } else
      ua(e, l, t);
  } else
    Uc(e, t);
}
function ua(e, t, n) {
  re(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Ne(t) ? (_.NODE_ENV !== "production" && ki(t) && j(
    "setup() should not return VNodes directly - return a render function instead."
  ), _.NODE_ENV !== "production" && (e.devtoolsRawSetupState = t), e.setupState = Yu(t), _.NODE_ENV !== "production" && pv(e)) : _.NODE_ENV !== "production" && t !== void 0 && j(
    `setup() should return an object. Received: ${t === null ? "null" : typeof t}`
  ), Uc(e, n);
}
let Cs;
const ug = () => !Cs;
function Uc(e, t, n) {
  const i = e.type;
  if (!e.render) {
    if (!t && Cs && !i.render) {
      const o = i.template || ol(e).template;
      if (o) {
        _.NODE_ENV !== "production" && on(e, "compile");
        const { isCustomElement: r, compilerOptions: s } = e.appContext.config, { delimiters: l, compilerOptions: a } = i, d = Fe(
          Fe(
            {
              isCustomElement: r,
              delimiters: l
            },
            s
          ),
          a
        );
        i.render = Cs(o, d), _.NODE_ENV !== "production" && rn(e, "compile");
      }
    }
    e.render = i.render || qe;
  }
  {
    const o = yo(e);
    gn();
    try {
      bv(e);
    } finally {
      hn(), o();
    }
  }
  _.NODE_ENV !== "production" && !i.render && e.render === qe && !t && (i.template ? j(
    'Component provided template option but runtime compilation is not supported in this build of Vue. Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".'
  ) : j("Component is missing template or render function: ", i));
}
const ca = _.NODE_ENV !== "production" ? {
  get(e, t) {
    return er(), Ye(e, "get", ""), e[t];
  },
  set() {
    return j("setupContext.attrs is readonly."), !1;
  },
  deleteProperty() {
    return j("setupContext.attrs is readonly."), !1;
  }
} : {
  get(e, t) {
    return Ye(e, "get", ""), e[t];
  }
};
function cg(e) {
  return new Proxy(e.slots, {
    get(t, n) {
      return Ye(e, "get", "$slots"), t[n];
    }
  });
}
function dg(e) {
  const t = (n) => {
    if (_.NODE_ENV !== "production" && (e.exposed && j("expose() should be called only once per setup()."), n != null)) {
      let i = typeof n;
      i === "object" && (te(n) ? i = "array" : Ae(n) && (i = "ref")), i !== "object" && j(
        `expose() should be passed a plain object, received ${i}.`
      );
    }
    e.exposed = n || {};
  };
  if (_.NODE_ENV !== "production") {
    let n, i;
    return Object.freeze({
      get attrs() {
        return n || (n = new Proxy(e.attrs, ca));
      },
      get slots() {
        return i || (i = cg(e));
      },
      get emit() {
        return (o, ...r) => e.emit(o, ...r);
      },
      expose: t
    });
  } else
    return {
      attrs: new Proxy(e.attrs, ca),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
}
function xr(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Yu(Ku(e.exposed)), {
    get(t, n) {
      if (n in t)
        return t[n];
      if (n in ei)
        return ei[n](e);
    },
    has(t, n) {
      return n in t || n in ei;
    }
  })) : e.proxy;
}
const fg = /(?:^|[-_])(\w)/g, mg = (e) => e.replace(fg, (t) => t.toUpperCase()).replace(/[-_]/g, "");
function ul(e, t = !0) {
  return re(e) ? e.displayName || e.name : e.name || t && e.__name;
}
function Vr(e, t, n = !1) {
  let i = ul(t);
  if (!i && t.__file) {
    const o = t.__file.match(/([^/\\]+)\.\w+$/);
    o && (i = o[1]);
  }
  if (!i && e && e.parent) {
    const o = (r) => {
      for (const s in r)
        if (r[s] === t)
          return s;
    };
    i = o(
      e.components || e.parent.type.components
    ) || o(e.appContext.components);
  }
  return i ? mg(i) : n ? "App" : "Anonymous";
}
function Wc(e) {
  return re(e) && "__vccOpts" in e;
}
const y = (e, t) => {
  const n = Om(e, t, ro);
  if (_.NODE_ENV !== "production") {
    const i = Nr();
    i && i.appContext.config.warnRecursiveComputed && (n._warnRecursive = !0);
  }
  return n;
};
function $n(e, t, n) {
  const i = arguments.length;
  return i === 2 ? Ne(t) && !te(t) ? ki(t) ? f(e, null, [t]) : f(e, t) : f(e, null, t) : (i > 3 ? n = Array.prototype.slice.call(arguments, 2) : i === 3 && ki(n) && (n = [n]), f(e, t, n));
}
function vg() {
  if (_.NODE_ENV === "production" || typeof window > "u")
    return;
  const e = { style: "color:#3ba776" }, t = { style: "color:#1677ff" }, n = { style: "color:#f5222d" }, i = { style: "color:#eb2f96" }, o = {
    __vue_custom_formatter: !0,
    header(c) {
      return Ne(c) ? c.__isVue ? ["div", e, "VueInstance"] : Ae(c) ? [
        "div",
        {},
        ["span", e, u(c)],
        "<",
        // avoid debugger accessing value affecting behavior
        l("_value" in c ? c._value : c),
        ">"
      ] : Xn(c) ? [
        "div",
        {},
        ["span", e, vt(c) ? "ShallowReactive" : "Reactive"],
        "<",
        l(c),
        `>${mn(c) ? " (readonly)" : ""}`
      ] : mn(c) ? [
        "div",
        {},
        ["span", e, vt(c) ? "ShallowReadonly" : "Readonly"],
        "<",
        l(c),
        ">"
      ] : null : null;
    },
    hasBody(c) {
      return c && c.__isVue;
    },
    body(c) {
      if (c && c.__isVue)
        return [
          "div",
          {},
          ...r(c.$)
        ];
    }
  };
  function r(c) {
    const m = [];
    c.type.props && c.props && m.push(s("props", J(c.props))), c.setupState !== De && m.push(s("setup", c.setupState)), c.data !== De && m.push(s("data", J(c.data)));
    const v = a(c, "computed");
    v && m.push(s("computed", v));
    const g = a(c, "inject");
    return g && m.push(s("injected", g)), m.push([
      "div",
      {},
      [
        "span",
        {
          style: i.style + ";opacity:0.66"
        },
        "$ (internal): "
      ],
      ["object", { object: c }]
    ]), m;
  }
  function s(c, m) {
    return m = Fe({}, m), Object.keys(m).length ? [
      "div",
      { style: "line-height:1.25em;margin-bottom:0.6em" },
      [
        "div",
        {
          style: "color:#476582"
        },
        c
      ],
      [
        "div",
        {
          style: "padding-left:1.25em"
        },
        ...Object.keys(m).map((v) => [
          "div",
          {},
          ["span", i, v + ": "],
          l(m[v], !1)
        ])
      ]
    ] : ["span", {}];
  }
  function l(c, m = !0) {
    return typeof c == "number" ? ["span", t, c] : typeof c == "string" ? ["span", n, JSON.stringify(c)] : typeof c == "boolean" ? ["span", i, c] : Ne(c) ? ["object", { object: m ? J(c) : c }] : ["span", n, String(c)];
  }
  function a(c, m) {
    const v = c.type;
    if (re(v))
      return;
    const g = {};
    for (const h in c.ctx)
      d(v, h, m) && (g[h] = c.ctx[h]);
    return g;
  }
  function d(c, m, v) {
    const g = c[v];
    if (te(g) && g.includes(m) || Ne(g) && m in g || c.extends && d(c.extends, m, v) || c.mixins && c.mixins.some((h) => d(h, m, v)))
      return !0;
  }
  function u(c) {
    return vt(c) ? "ShallowRef" : c.effect ? "ComputedRef" : "Ref";
  }
  window.devtoolsFormatters ? window.devtoolsFormatters.push(o) : window.devtoolsFormatters = [o];
}
const da = "3.5.12", pt = _.NODE_ENV !== "production" ? j : qe;
var It = {};
let ks;
const fa = typeof window < "u" && window.trustedTypes;
if (fa)
  try {
    ks = /* @__PURE__ */ fa.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch (e) {
    It.NODE_ENV !== "production" && pt(`Error creating trusted types policy: ${e}`);
  }
const Kc = ks ? (e) => ks.createHTML(e) : (e) => e, gg = "http://www.w3.org/2000/svg", hg = "http://www.w3.org/1998/Math/MathML", ln = typeof document < "u" ? document : null, ma = ln && /* @__PURE__ */ ln.createElement("template"), pg = {
  insert: (e, t, n) => {
    t.insertBefore(e, n || null);
  },
  remove: (e) => {
    const t = e.parentNode;
    t && t.removeChild(e);
  },
  createElement: (e, t, n, i) => {
    const o = t === "svg" ? ln.createElementNS(gg, e) : t === "mathml" ? ln.createElementNS(hg, e) : n ? ln.createElement(e, { is: n }) : ln.createElement(e);
    return e === "select" && i && i.multiple != null && o.setAttribute("multiple", i.multiple), o;
  },
  createText: (e) => ln.createTextNode(e),
  createComment: (e) => ln.createComment(e),
  setText: (e, t) => {
    e.nodeValue = t;
  },
  setElementText: (e, t) => {
    e.textContent = t;
  },
  parentNode: (e) => e.parentNode,
  nextSibling: (e) => e.nextSibling,
  querySelector: (e) => ln.querySelector(e),
  setScopeId(e, t) {
    e.setAttribute(t, "");
  },
  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  insertStaticContent(e, t, n, i, o, r) {
    const s = n ? n.previousSibling : t.lastChild;
    if (o && (o === r || o.nextSibling))
      for (; t.insertBefore(o.cloneNode(!0), n), !(o === r || !(o = o.nextSibling)); )
        ;
    else {
      ma.innerHTML = Kc(
        i === "svg" ? `<svg>${e}</svg>` : i === "mathml" ? `<math>${e}</math>` : e
      );
      const l = ma.content;
      if (i === "svg" || i === "mathml") {
        const a = l.firstChild;
        for (; a.firstChild; )
          l.appendChild(a.firstChild);
        l.removeChild(a);
      }
      t.insertBefore(l, n);
    }
    return [
      // first
      s ? s.nextSibling : t.firstChild,
      // last
      n ? n.previousSibling : t.lastChild
    ];
  }
}, Cn = "transition", Fi = "animation", Ni = Symbol("_vtc"), Gc = {
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
}, Yc = /* @__PURE__ */ Fe(
  {},
  fc,
  Gc
), yg = (e) => (e.displayName = "Transition", e.props = Yc, e), li = /* @__PURE__ */ yg(
  (e, { slots: t }) => $n(iv, qc(e), t)
), zn = (e, t = []) => {
  te(e) ? e.forEach((n) => n(...t)) : e && e(...t);
}, va = (e) => e ? te(e) ? e.some((t) => t.length > 1) : e.length > 1 : !1;
function qc(e) {
  const t = {};
  for (const S in e)
    S in Gc || (t[S] = e[S]);
  if (e.css === !1)
    return t;
  const {
    name: n = "v",
    type: i,
    duration: o,
    enterFromClass: r = `${n}-enter-from`,
    enterActiveClass: s = `${n}-enter-active`,
    enterToClass: l = `${n}-enter-to`,
    appearFromClass: a = r,
    appearActiveClass: d = s,
    appearToClass: u = l,
    leaveFromClass: c = `${n}-leave-from`,
    leaveActiveClass: m = `${n}-leave-active`,
    leaveToClass: v = `${n}-leave-to`
  } = e, g = bg(o), h = g && g[0], w = g && g[1], {
    onBeforeEnter: C,
    onEnter: O,
    onEnterCancelled: P,
    onLeave: M,
    onLeaveCancelled: x,
    onBeforeAppear: N = C,
    onAppear: $ = O,
    onAppearCancelled: E = P
  } = t, V = (S, T, B) => {
    kn(S, T ? u : l), kn(S, T ? d : s), B && B();
  }, L = (S, T) => {
    S._isLeaving = !1, kn(S, c), kn(S, v), kn(S, m), T && T();
  }, A = (S) => (T, B) => {
    const Z = S ? $ : O, Q = () => V(T, S, B);
    zn(Z, [T, Q]), ga(() => {
      kn(T, S ? a : r), sn(T, S ? u : l), va(Z) || ha(T, i, h, Q);
    });
  };
  return Fe(t, {
    onBeforeEnter(S) {
      zn(C, [S]), sn(S, r), sn(S, s);
    },
    onBeforeAppear(S) {
      zn(N, [S]), sn(S, a), sn(S, d);
    },
    onEnter: A(!1),
    onAppear: A(!0),
    onLeave(S, T) {
      S._isLeaving = !0;
      const B = () => L(S, T);
      sn(S, c), sn(S, m), Xc(), ga(() => {
        S._isLeaving && (kn(S, c), sn(S, v), va(M) || ha(S, i, w, B));
      }), zn(M, [S, B]);
    },
    onEnterCancelled(S) {
      V(S, !1), zn(P, [S]);
    },
    onAppearCancelled(S) {
      V(S, !0), zn(E, [S]);
    },
    onLeaveCancelled(S) {
      L(S), zn(x, [S]);
    }
  });
}
function bg(e) {
  if (e == null)
    return null;
  if (Ne(e))
    return [Yr(e.enter), Yr(e.leave)];
  {
    const t = Yr(e);
    return [t, t];
  }
}
function Yr(e) {
  const t = Uf(e);
  return It.NODE_ENV !== "production" && Mm(t, "<transition> explicit duration"), t;
}
function sn(e, t) {
  t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Ni] || (e[Ni] = /* @__PURE__ */ new Set())).add(t);
}
function kn(e, t) {
  t.split(/\s+/).forEach((i) => i && e.classList.remove(i));
  const n = e[Ni];
  n && (n.delete(t), n.size || (e[Ni] = void 0));
}
function ga(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let _g = 0;
function ha(e, t, n, i) {
  const o = e._endId = ++_g, r = () => {
    o === e._endId && i();
  };
  if (n != null)
    return setTimeout(r, n);
  const { type: s, timeout: l, propCount: a } = Zc(e, t);
  if (!s)
    return i();
  const d = s + "end";
  let u = 0;
  const c = () => {
    e.removeEventListener(d, m), r();
  }, m = (v) => {
    v.target === e && ++u >= a && c();
  };
  setTimeout(() => {
    u < a && c();
  }, l + 1), e.addEventListener(d, m);
}
function Zc(e, t) {
  const n = window.getComputedStyle(e), i = (g) => (n[g] || "").split(", "), o = i(`${Cn}Delay`), r = i(`${Cn}Duration`), s = pa(o, r), l = i(`${Fi}Delay`), a = i(`${Fi}Duration`), d = pa(l, a);
  let u = null, c = 0, m = 0;
  t === Cn ? s > 0 && (u = Cn, c = s, m = r.length) : t === Fi ? d > 0 && (u = Fi, c = d, m = a.length) : (c = Math.max(s, d), u = c > 0 ? s > d ? Cn : Fi : null, m = u ? u === Cn ? r.length : a.length : 0);
  const v = u === Cn && /\b(transform|all)(,|$)/.test(
    i(`${Cn}Property`).toString()
  );
  return {
    type: u,
    timeout: c,
    propCount: m,
    hasTransform: v
  };
}
function pa(e, t) {
  for (; e.length < t.length; )
    e = e.concat(e);
  return Math.max(...t.map((n, i) => ya(n) + ya(e[i])));
}
function ya(e) {
  return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
}
function Xc() {
  return document.body.offsetHeight;
}
function wg(e, t, n) {
  const i = e[Ni];
  i && (t = (t ? [t, ...i] : [...i]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
const nr = Symbol("_vod"), Jc = Symbol("_vsh"), Mn = {
  beforeMount(e, { value: t }, { transition: n }) {
    e[nr] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : Li(e, t);
  },
  mounted(e, { value: t }, { transition: n }) {
    n && t && n.enter(e);
  },
  updated(e, { value: t, oldValue: n }, { transition: i }) {
    !t != !n && (i ? t ? (i.beforeEnter(e), Li(e, !0), i.enter(e)) : i.leave(e, () => {
      Li(e, !1);
    }) : Li(e, t));
  },
  beforeUnmount(e, { value: t }) {
    Li(e, t);
  }
};
It.NODE_ENV !== "production" && (Mn.name = "show");
function Li(e, t) {
  e.style.display = t ? e[nr] : "none", e[Jc] = !t;
}
const Sg = Symbol(It.NODE_ENV !== "production" ? "CSS_VAR_TEXT" : ""), Eg = /(^|;)\s*display\s*:/;
function Cg(e, t, n) {
  const i = e.style, o = Me(n);
  let r = !1;
  if (n && !o) {
    if (t)
      if (Me(t))
        for (const s of t.split(";")) {
          const l = s.slice(0, s.indexOf(":")).trim();
          n[l] == null && Ho(i, l, "");
        }
      else
        for (const s in t)
          n[s] == null && Ho(i, s, "");
    for (const s in n)
      s === "display" && (r = !0), Ho(i, s, n[s]);
  } else if (o) {
    if (t !== n) {
      const s = i[Sg];
      s && (n += ";" + s), i.cssText = n, r = Eg.test(n);
    }
  } else t && e.removeAttribute("style");
  nr in e && (e[nr] = r ? i.display : "", e[Jc] && (i.display = "none"));
}
const kg = /[^\\];\s*$/, ba = /\s*!important$/;
function Ho(e, t, n) {
  if (te(n))
    n.forEach((i) => Ho(e, t, i));
  else if (n == null && (n = ""), It.NODE_ENV !== "production" && kg.test(n) && pt(
    `Unexpected semicolon at the end of '${t}' style value: '${n}'`
  ), t.startsWith("--"))
    e.setProperty(t, n);
  else {
    const i = Ng(e, t);
    ba.test(n) ? e.setProperty(
      Tn(i),
      n.replace(ba, ""),
      "important"
    ) : e[i] = n;
  }
}
const _a = ["Webkit", "Moz", "ms"], qr = {};
function Ng(e, t) {
  const n = qr[t];
  if (n)
    return n;
  let i = tt(t);
  if (i !== "filter" && i in e)
    return qr[t] = i;
  i = Tt(i);
  for (let o = 0; o < _a.length; o++) {
    const r = _a[o] + i;
    if (r in e)
      return qr[t] = r;
  }
  return t;
}
const wa = "http://www.w3.org/1999/xlink";
function Sa(e, t, n, i, o, r = nm(t)) {
  i && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(wa, t.slice(6, t.length)) : e.setAttributeNS(wa, t, n) : n == null || r && !Nu(n) ? e.removeAttribute(t) : e.setAttribute(
    t,
    r ? "" : An(n) ? String(n) : n
  );
}
function Ea(e, t, n, i, o) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? Kc(n) : n);
    return;
  }
  const r = e.tagName;
  if (t === "value" && r !== "PROGRESS" && // custom elements may use _value internally
  !r.includes("-")) {
    const l = r === "OPTION" ? e.getAttribute("value") || "" : e.value, a = n == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      e.type === "checkbox" ? "on" : ""
    ) : String(n);
    (l !== a || !("_value" in e)) && (e.value = a), n == null && e.removeAttribute(t), e._value = n;
    return;
  }
  let s = !1;
  if (n === "" || n == null) {
    const l = typeof e[t];
    l === "boolean" ? n = Nu(n) : n == null && l === "string" ? (n = "", s = !0) : l === "number" && (n = 0, s = !0);
  }
  try {
    e[t] = n;
  } catch (l) {
    It.NODE_ENV !== "production" && !s && pt(
      `Failed setting prop "${t}" on <${r.toLowerCase()}>: value ${n} is invalid.`,
      l
    );
  }
  s && e.removeAttribute(o || t);
}
function xg(e, t, n, i) {
  e.addEventListener(t, n, i);
}
function Vg(e, t, n, i) {
  e.removeEventListener(t, n, i);
}
const Ca = Symbol("_vei");
function Og(e, t, n, i, o = null) {
  const r = e[Ca] || (e[Ca] = {}), s = r[t];
  if (i && s)
    s.value = It.NODE_ENV !== "production" ? Na(i, t) : i;
  else {
    const [l, a] = Dg(t);
    if (i) {
      const d = r[t] = Ag(
        It.NODE_ENV !== "production" ? Na(i, t) : i,
        o
      );
      xg(e, l, d, a);
    } else s && (Vg(e, l, s, a), r[t] = void 0);
  }
}
const ka = /(?:Once|Passive|Capture)$/;
function Dg(e) {
  let t;
  if (ka.test(e)) {
    t = {};
    let i;
    for (; i = e.match(ka); )
      e = e.slice(0, e.length - i[0].length), t[i[0].toLowerCase()] = !0;
  }
  return [e[2] === ":" ? e.slice(3) : Tn(e.slice(2)), t];
}
let Zr = 0;
const Tg = /* @__PURE__ */ Promise.resolve(), Pg = () => Zr || (Tg.then(() => Zr = 0), Zr = Date.now());
function Ag(e, t) {
  const n = (i) => {
    if (!i._vts)
      i._vts = Date.now();
    else if (i._vts <= n.attached)
      return;
    Bt(
      Ig(i, n.value),
      t,
      5,
      [i]
    );
  };
  return n.value = e, n.attached = Pg(), n;
}
function Na(e, t) {
  return re(e) || te(e) ? e : (pt(
    `Wrong type passed as event handler to ${t} - did you forget @ or : in front of your prop?
Expected function or array of functions, received type ${typeof e}.`
  ), qe);
}
function Ig(e, t) {
  if (te(t)) {
    const n = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      n.call(e), e._stopped = !0;
    }, t.map(
      (i) => (o) => !o._stopped && i && i(o)
    );
  } else
    return t;
}
const xa = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // lowercase letter
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, $g = (e, t, n, i, o, r) => {
  const s = o === "svg";
  t === "class" ? wg(e, i, s) : t === "style" ? Cg(e, n, i) : fo(t) ? Wo(t) || Og(e, t, n, i, r) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : Mg(e, t, i, s)) ? (Ea(e, t, i), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Sa(e, t, i, s, r, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && (/[A-Z]/.test(t) || !Me(i)) ? Ea(e, tt(t), i, r, t) : (t === "true-value" ? e._trueValue = i : t === "false-value" && (e._falseValue = i), Sa(e, t, i, s));
};
function Mg(e, t, n, i) {
  if (i)
    return !!(t === "innerHTML" || t === "textContent" || t in e && xa(t) && re(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA")
    return !1;
  if (t === "width" || t === "height") {
    const o = e.tagName;
    if (o === "IMG" || o === "VIDEO" || o === "CANVAS" || o === "SOURCE")
      return !1;
  }
  return xa(t) && Me(n) ? !1 : t in e;
}
const Qc = /* @__PURE__ */ new WeakMap(), ed = /* @__PURE__ */ new WeakMap(), ir = Symbol("_moveCb"), Va = Symbol("_enterCb"), Fg = (e) => (delete e.props.mode, e), Lg = /* @__PURE__ */ Fg({
  name: "TransitionGroup",
  props: /* @__PURE__ */ Fe({}, Yc, {
    tag: String,
    moveClass: String
  }),
  setup(e, { slots: t }) {
    const n = Nr(), i = dc();
    let o, r;
    return nl(() => {
      if (!o.length)
        return;
      const s = e.moveClass || `${e.name || "v"}-move`;
      if (!jg(
        o[0].el,
        n.vnode.el,
        s
      ))
        return;
      o.forEach(Bg), o.forEach(Rg);
      const l = o.filter(Hg);
      Xc(), l.forEach((a) => {
        const d = a.el, u = d.style;
        sn(d, s), u.transform = u.webkitTransform = u.transitionDuration = "";
        const c = d[ir] = (m) => {
          m && m.target !== d || (!m || /transform$/.test(m.propertyName)) && (d.removeEventListener("transitionend", c), d[ir] = null, kn(d, s));
        };
        d.addEventListener("transitionend", c);
      });
    }), () => {
      const s = J(e), l = qc(s);
      let a = s.tag || Ce;
      if (o = [], r)
        for (let d = 0; d < r.length; d++) {
          const u = r[d];
          u.el && u.el instanceof Element && (o.push(u), si(
            u,
            io(
              u,
              l,
              i,
              n
            )
          ), Qc.set(
            u,
            u.el.getBoundingClientRect()
          ));
        }
      r = t.default ? el(t.default()) : [];
      for (let d = 0; d < r.length; d++) {
        const u = r[d];
        u.key != null ? si(
          u,
          io(u, l, i, n)
        ) : It.NODE_ENV !== "production" && u.type !== ui && pt("<TransitionGroup> children must be keyed.");
      }
      return f(a, null, r);
    };
  }
}), cl = Lg;
function Bg(e) {
  const t = e.el;
  t[ir] && t[ir](), t[Va] && t[Va]();
}
function Rg(e) {
  ed.set(e, e.el.getBoundingClientRect());
}
function Hg(e) {
  const t = Qc.get(e), n = ed.get(e), i = t.left - n.left, o = t.top - n.top;
  if (i || o) {
    const r = e.el.style;
    return r.transform = r.webkitTransform = `translate(${i}px,${o}px)`, r.transitionDuration = "0s", e;
  }
}
function jg(e, t, n) {
  const i = e.cloneNode(), o = e[Ni];
  o && o.forEach((l) => {
    l.split(/\s+/).forEach((a) => a && i.classList.remove(a));
  }), n.split(/\s+/).forEach((l) => l && i.classList.add(l)), i.style.display = "none";
  const r = t.nodeType === 1 ? t : t.parentNode;
  r.appendChild(i);
  const { hasTransform: s } = Zc(i);
  return r.removeChild(i), s;
}
const zg = ["ctrl", "shift", "alt", "meta"], Ug = {
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
  exact: (e, t) => zg.some((n) => e[`${n}Key`] && !t.includes(n))
}, Xr = (e, t) => {
  const n = e._withMods || (e._withMods = {}), i = t.join(".");
  return n[i] || (n[i] = (o, ...r) => {
    for (let s = 0; s < t.length; s++) {
      const l = Ug[t[s]];
      if (l && l(o, t)) return;
    }
    return e(o, ...r);
  });
}, Wg = /* @__PURE__ */ Fe({ patchProp: $g }, pg);
let Oa;
function Kg() {
  return Oa || (Oa = Rv(Wg));
}
const Gg = (...e) => {
  const t = Kg().createApp(...e);
  It.NODE_ENV !== "production" && (qg(t), Zg(t));
  const { mount: n } = t;
  return t.mount = (i) => {
    const o = Xg(i);
    if (!o) return;
    const r = t._component;
    !re(r) && !r.render && !r.template && (r.template = o.innerHTML), o.nodeType === 1 && (o.textContent = "");
    const s = n(o, !1, Yg(o));
    return o instanceof Element && (o.removeAttribute("v-cloak"), o.setAttribute("data-v-app", "")), s;
  }, t;
};
function Yg(e) {
  if (e instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement)
    return "mathml";
}
function qg(e) {
  Object.defineProperty(e.config, "isNativeTag", {
    value: (t) => Jf(t) || Qf(t) || em(t),
    writable: !1
  });
}
function Zg(e) {
  {
    const t = e.config.isCustomElement;
    Object.defineProperty(e.config, "isCustomElement", {
      get() {
        return t;
      },
      set() {
        pt(
          "The `isCustomElement` config option is deprecated. Use `compilerOptions.isCustomElement` instead."
        );
      }
    });
    const n = e.config.compilerOptions, i = 'The `compilerOptions` config option is only respected when using a build of Vue.js that includes the runtime compiler (aka "full build"). Since you are using the runtime-only build, `compilerOptions` must be passed to `@vue/compiler-dom` in the build setup instead.\n- For vue-loader: pass it via vue-loader\'s `compilerOptions` loader option.\n- For vue-cli: see https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-loader\n- For vite: pass it via @vitejs/plugin-vue options. See https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#example-for-passing-options-to-vuecompiler-sfc';
    Object.defineProperty(e.config, "compilerOptions", {
      get() {
        return pt(i), n;
      },
      set() {
        pt(i);
      }
    });
  }
}
function Xg(e) {
  if (Me(e)) {
    const t = document.querySelector(e);
    return It.NODE_ENV !== "production" && !t && pt(
      `Failed to mount app: mount target selector "${e}" returned null.`
    ), t;
  }
  return It.NODE_ENV !== "production" && window.ShadowRoot && e instanceof window.ShadowRoot && e.mode === "closed" && pt(
    'mounting on a ShadowRoot with `{mode: "closed"}` may lead to unpredictable bugs'
  ), e;
}
var Jg = {};
function Qg() {
  vg();
}
Jg.NODE_ENV !== "production" && Qg();
function ai(e, t) {
  let n;
  function i() {
    n = Ws(), n.run(() => t.length ? t(() => {
      n == null || n.stop(), i();
    }) : t());
  }
  ve(e, (o) => {
    o && !n ? i() : o || (n == null || n.stop(), n = void 0);
  }, {
    immediate: !0
  }), jt(() => {
    n == null || n.stop();
  });
}
const Be = typeof window < "u", dl = Be && "IntersectionObserver" in window, eh = Be && ("ontouchstart" in window || window.navigator.maxTouchPoints > 0);
function td(e, t, n) {
  const i = t.length - 1;
  if (i < 0) return e === void 0 ? n : e;
  for (let o = 0; o < i; o++) {
    if (e == null)
      return n;
    e = e[t[o]];
  }
  return e == null || e[t[i]] === void 0 ? n : e[t[i]];
}
function Or(e, t) {
  if (e === t) return !0;
  if (e instanceof Date && t instanceof Date && e.getTime() !== t.getTime() || e !== Object(e) || t !== Object(t))
    return !1;
  const n = Object.keys(e);
  return n.length !== Object.keys(t).length ? !1 : n.every((i) => Or(e[i], t[i]));
}
function Ns(e, t, n) {
  return e == null || !t || typeof t != "string" ? n : e[t] !== void 0 ? e[t] : (t = t.replace(/\[(\w+)\]/g, ".$1"), t = t.replace(/^\./, ""), td(e, t.split("."), n));
}
function Bi(e, t, n) {
  if (t === !0) return e === void 0 ? n : e;
  if (t == null || typeof t == "boolean") return n;
  if (e !== Object(e)) {
    if (typeof t != "function") return n;
    const o = t(e, n);
    return typeof o > "u" ? n : o;
  }
  if (typeof t == "string") return Ns(e, t, n);
  if (Array.isArray(t)) return td(e, t, n);
  if (typeof t != "function") return n;
  const i = t(e, n);
  return typeof i > "u" ? n : i;
}
function fl(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
  return Array.from({
    length: e
  }, (n, i) => t + i);
}
function oe(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "px";
  if (!(e == null || e === ""))
    return isNaN(+e) ? String(e) : isFinite(+e) ? `${Number(e)}${t}` : void 0;
}
function th(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function Da(e) {
  let t;
  return e !== null && typeof e == "object" && ((t = Object.getPrototypeOf(e)) === Object.prototype || t === null);
}
function nh(e) {
  if (e && "$el" in e) {
    const t = e.$el;
    return (t == null ? void 0 : t.nodeType) === Node.TEXT_NODE ? t.nextElementSibling : t;
  }
  return e;
}
const Ta = Object.freeze({
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
}), ih = Object.freeze({
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
function Jr(e, t) {
  return t.every((n) => e.hasOwnProperty(n));
}
function nd(e, t) {
  const n = {}, i = new Set(Object.keys(e));
  for (const o of t)
    i.has(o) && (n[o] = e[o]);
  return n;
}
function xs(e, t, n) {
  const i = /* @__PURE__ */ Object.create(null), o = /* @__PURE__ */ Object.create(null);
  for (const r in e)
    t.some((s) => s instanceof RegExp ? s.test(r) : s === r) && !(n != null && n.some((s) => s === r)) ? i[r] = e[r] : o[r] = e[r];
  return [i, o];
}
function id(e, t) {
  const n = {
    ...e
  };
  return t.forEach((i) => delete n[i]), n;
}
function oh(e, t) {
  const n = {};
  return t.forEach((i) => n[i] = e[i]), n;
}
const od = /^on[^a-z]/, ml = (e) => od.test(e), rh = ["onAfterscriptexecute", "onAnimationcancel", "onAnimationend", "onAnimationiteration", "onAnimationstart", "onAuxclick", "onBeforeinput", "onBeforescriptexecute", "onChange", "onClick", "onCompositionend", "onCompositionstart", "onCompositionupdate", "onContextmenu", "onCopy", "onCut", "onDblclick", "onFocusin", "onFocusout", "onFullscreenchange", "onFullscreenerror", "onGesturechange", "onGestureend", "onGesturestart", "onGotpointercapture", "onInput", "onKeydown", "onKeypress", "onKeyup", "onLostpointercapture", "onMousedown", "onMousemove", "onMouseout", "onMouseover", "onMouseup", "onMousewheel", "onPaste", "onPointercancel", "onPointerdown", "onPointerenter", "onPointerleave", "onPointermove", "onPointerout", "onPointerover", "onPointerup", "onReset", "onSelect", "onSubmit", "onTouchcancel", "onTouchend", "onTouchmove", "onTouchstart", "onTransitioncancel", "onTransitionend", "onTransitionrun", "onTransitionstart", "onWheel"];
function sh(e) {
  const [t, n] = xs(e, [od]), i = id(t, rh), [o, r] = xs(n, ["class", "style", "id", /^data-/]);
  return Object.assign(o, t), Object.assign(r, i), [o, r];
}
function ti(e) {
  return e == null ? [] : Array.isArray(e) ? e : [e];
}
function Pn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
  return Math.max(t, Math.min(n, e));
}
function Pa(e) {
  const t = e.toString().trim();
  return t.includes(".") ? t.length - t.indexOf(".") - 1 : 0;
}
function Aa(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0";
  return e + n.repeat(Math.max(0, t - e.length));
}
function Ia(e, t) {
  return (arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0").repeat(Math.max(0, t - e.length)) + e;
}
function lh(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1;
  const n = [];
  let i = 0;
  for (; i < e.length; )
    n.push(e.substr(i, t)), i += t;
  return n;
}
function kt() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = arguments.length > 2 ? arguments[2] : void 0;
  const i = {};
  for (const o in e)
    i[o] = e[o];
  for (const o in t) {
    const r = e[o], s = t[o];
    if (Da(r) && Da(s)) {
      i[o] = kt(r, s, n);
      continue;
    }
    if (n && Array.isArray(r) && Array.isArray(s)) {
      i[o] = n(r, s);
      continue;
    }
    i[o] = s;
  }
  return i;
}
function rd(e) {
  return e.map((t) => t.type === Ce ? rd(t.children) : t).flat();
}
function ni() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  if (ni.cache.has(e)) return ni.cache.get(e);
  const t = e.replace(/[^a-z]/gi, "-").replace(/\B([A-Z])/g, "-$1").toLowerCase();
  return ni.cache.set(e, t), t;
}
ni.cache = /* @__PURE__ */ new Map();
function pi(e, t) {
  if (!t || typeof t != "object") return [];
  if (Array.isArray(t))
    return t.map((n) => pi(e, n)).flat(1);
  if (t.suspense)
    return pi(e, t.ssContent);
  if (Array.isArray(t.children))
    return t.children.map((n) => pi(e, n)).flat(1);
  if (t.component) {
    if (Object.getOwnPropertySymbols(t.component.provides).includes(e))
      return [t.component];
    if (t.component.subTree)
      return pi(e, t.component.subTree).flat(1);
  }
  return [];
}
function vl(e) {
  const t = et({}), n = y(e);
  return yn(() => {
    for (const i in n.value)
      t[i] = n.value[i];
  }, {
    flush: "sync"
  }), Zs(t);
}
function or(e, t) {
  return e.includes(t);
}
function sd(e) {
  return e[2].toLowerCase() + e.slice(3);
}
const Ot = () => [Function, Array];
function $a(e, t) {
  return t = "on" + Tt(t), !!(e[t] || e[`${t}Once`] || e[`${t}Capture`] || e[`${t}OnceCapture`] || e[`${t}CaptureOnce`]);
}
function ah(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
    n[i - 1] = arguments[i];
  if (Array.isArray(e))
    for (const o of e)
      o(...n);
  else typeof e == "function" && e(...n);
}
function ld(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0;
  const n = ["button", "[href]", 'input:not([type="hidden"])', "select", "textarea", "[tabindex]"].map((i) => `${i}${t ? ':not([tabindex="-1"])' : ""}:not([disabled])`).join(", ");
  return [...e.querySelectorAll(n)];
}
function uh(e, t, n) {
  let i, o = e.indexOf(document.activeElement);
  const r = t === "next" ? 1 : -1;
  do
    o += r, i = e[o];
  while ((!i || i.offsetParent == null) && o < e.length && o >= 0);
  return i;
}
function ad(e, t) {
  var i, o, r, s;
  const n = ld(e);
  if (!t)
    (e === document.activeElement || !e.contains(document.activeElement)) && ((i = n[0]) == null || i.focus());
  else if (t === "first")
    (o = n[0]) == null || o.focus();
  else if (t === "last")
    (r = n.at(-1)) == null || r.focus();
  else if (typeof t == "number")
    (s = n[t]) == null || s.focus();
  else {
    const l = uh(n, t);
    l ? l.focus() : ad(e, t === "next" ? "first" : "last");
  }
}
function ch(e, t) {
  if (!(Be && typeof CSS < "u" && typeof CSS.supports < "u" && CSS.supports(`selector(${t})`))) return null;
  try {
    return !!e && e.matches(t);
  } catch {
    return null;
  }
}
function dh(e, t) {
  if (!Be || e === 0)
    return t(), () => {
    };
  const n = window.setTimeout(t, e);
  return () => window.clearTimeout(n);
}
function Vs() {
  const e = he(), t = (n) => {
    e.value = n;
  };
  return Object.defineProperty(t, "value", {
    enumerable: !0,
    get: () => e.value,
    set: (n) => e.value = n
  }), Object.defineProperty(t, "el", {
    enumerable: !0,
    get: () => nh(e.value)
  }), t;
}
const ud = ["top", "bottom"], fh = ["start", "end", "left", "right"];
function Os(e, t) {
  let [n, i] = e.split(" ");
  return i || (i = or(ud, n) ? "start" : or(fh, n) ? "top" : "center"), {
    side: Ma(n, t),
    align: Ma(i, t)
  };
}
function Ma(e, t) {
  return e === "start" ? t ? "right" : "left" : e === "end" ? t ? "left" : "right" : e;
}
function Qr(e) {
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
function es(e) {
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
function Fa(e) {
  return {
    side: e.align,
    align: e.side
  };
}
function La(e) {
  return or(ud, e.side) ? "y" : "x";
}
class ii {
  constructor(t) {
    let {
      x: n,
      y: i,
      width: o,
      height: r
    } = t;
    this.x = n, this.y = i, this.width = o, this.height = r;
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
function Ba(e, t) {
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
function cd(e) {
  return Array.isArray(e) ? new ii({
    x: e[0],
    y: e[1],
    width: 0,
    height: 0
  }) : e.getBoundingClientRect();
}
function gl(e) {
  const t = e.getBoundingClientRect(), n = getComputedStyle(e), i = n.transform;
  if (i) {
    let o, r, s, l, a;
    if (i.startsWith("matrix3d("))
      o = i.slice(9, -1).split(/, /), r = +o[0], s = +o[5], l = +o[12], a = +o[13];
    else if (i.startsWith("matrix("))
      o = i.slice(7, -1).split(/, /), r = +o[0], s = +o[3], l = +o[4], a = +o[5];
    else
      return new ii(t);
    const d = n.transformOrigin, u = t.x - l - (1 - r) * parseFloat(d), c = t.y - a - (1 - s) * parseFloat(d.slice(d.indexOf(" ") + 1)), m = r ? t.width / r : e.offsetWidth + 1, v = s ? t.height / s : e.offsetHeight + 1;
    return new ii({
      x: u,
      y: c,
      width: m,
      height: v
    });
  } else
    return new ii(t);
}
function yi(e, t, n) {
  if (typeof e.animate > "u") return {
    finished: Promise.resolve()
  };
  let i;
  try {
    i = e.animate(t, n);
  } catch {
    return {
      finished: Promise.resolve()
    };
  }
  return typeof i.finished > "u" && (i.finished = new Promise((o) => {
    i.onfinish = () => {
      o(i);
    };
  })), i;
}
const jo = /* @__PURE__ */ new WeakMap();
function mh(e, t) {
  Object.keys(t).forEach((n) => {
    if (ml(n)) {
      const i = sd(n), o = jo.get(e);
      if (t[n] == null)
        o == null || o.forEach((r) => {
          const [s, l] = r;
          s === i && (e.removeEventListener(i, l), o.delete(r));
        });
      else if (!o || ![...o].some((r) => r[0] === i && r[1] === t[n])) {
        e.addEventListener(i, t[n]);
        const r = o || /* @__PURE__ */ new Set();
        r.add([i, t[n]]), jo.has(e) || jo.set(e, r);
      }
    } else
      t[n] == null ? e.removeAttribute(n) : e.setAttribute(n, t[n]);
  });
}
function vh(e, t) {
  Object.keys(t).forEach((n) => {
    if (ml(n)) {
      const i = sd(n), o = jo.get(e);
      o == null || o.forEach((r) => {
        const [s, l] = r;
        s === i && (e.removeEventListener(i, l), o.delete(r));
      });
    } else
      e.removeAttribute(n);
  });
}
const mi = 2.4, Ra = 0.2126729, Ha = 0.7151522, ja = 0.072175, gh = 0.55, hh = 0.58, ph = 0.57, yh = 0.62, To = 0.03, za = 1.45, bh = 5e-4, _h = 1.25, wh = 1.25, Ua = 0.078, Wa = 12.82051282051282, Po = 0.06, Ka = 1e-3;
function Ga(e, t) {
  const n = (e.r / 255) ** mi, i = (e.g / 255) ** mi, o = (e.b / 255) ** mi, r = (t.r / 255) ** mi, s = (t.g / 255) ** mi, l = (t.b / 255) ** mi;
  let a = n * Ra + i * Ha + o * ja, d = r * Ra + s * Ha + l * ja;
  if (a <= To && (a += (To - a) ** za), d <= To && (d += (To - d) ** za), Math.abs(d - a) < bh) return 0;
  let u;
  if (d > a) {
    const c = (d ** gh - a ** hh) * _h;
    u = c < Ka ? 0 : c < Ua ? c - c * Wa * Po : c - Po;
  } else {
    const c = (d ** yh - a ** ph) * wh;
    u = c > -Ka ? 0 : c > -Ua ? c - c * Wa * Po : c + Po;
  }
  return u * 100;
}
function dn(e) {
  pt(`Vuetify: ${e}`);
}
function rr(e) {
  pt(`Vuetify error: ${e}`);
}
function Sh(e, t) {
  t = Array.isArray(t) ? t.slice(0, -1).map((n) => `'${n}'`).join(", ") + ` or '${t.at(-1)}'` : `'${t}'`, pt(`[Vuetify UPGRADE] '${e}' is deprecated, use ${t} instead.`);
}
const sr = 0.20689655172413793, Eh = (e) => e > sr ** 3 ? Math.cbrt(e) : e / (3 * sr ** 2) + 4 / 29, Ch = (e) => e > sr ? e ** 3 : 3 * sr ** 2 * (e - 4 / 29);
function dd(e) {
  const t = Eh, n = t(e[1]);
  return [116 * n - 16, 500 * (t(e[0] / 0.95047) - n), 200 * (n - t(e[2] / 1.08883))];
}
function fd(e) {
  const t = Ch, n = (e[0] + 16) / 116;
  return [t(n + e[1] / 500) * 0.95047, t(n), t(n - e[2] / 200) * 1.08883];
}
const kh = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]], Nh = (e) => e <= 31308e-7 ? e * 12.92 : 1.055 * e ** (1 / 2.4) - 0.055, xh = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], Vh = (e) => e <= 0.04045 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4;
function md(e) {
  const t = Array(3), n = Nh, i = kh;
  for (let o = 0; o < 3; ++o)
    t[o] = Math.round(Pn(n(i[o][0] * e[0] + i[o][1] * e[1] + i[o][2] * e[2])) * 255);
  return {
    r: t[0],
    g: t[1],
    b: t[2]
  };
}
function hl(e) {
  let {
    r: t,
    g: n,
    b: i
  } = e;
  const o = [0, 0, 0], r = Vh, s = xh;
  t = r(t / 255), n = r(n / 255), i = r(i / 255);
  for (let l = 0; l < 3; ++l)
    o[l] = s[l][0] * t + s[l][1] * n + s[l][2] * i;
  return o;
}
function Ds(e) {
  return !!e && /^(#|var\(--|(rgb|hsl)a?\()/.test(e);
}
function Oh(e) {
  return Ds(e) && !/^((rgb|hsl)a?\()?var\(--/.test(e);
}
const Ya = /^(?<fn>(?:rgb|hsl)a?)\((?<values>.+)\)/, Dh = {
  rgb: (e, t, n, i) => ({
    r: e,
    g: t,
    b: n,
    a: i
  }),
  rgba: (e, t, n, i) => ({
    r: e,
    g: t,
    b: n,
    a: i
  }),
  hsl: (e, t, n, i) => qa({
    h: e,
    s: t,
    l: n,
    a: i
  }),
  hsla: (e, t, n, i) => qa({
    h: e,
    s: t,
    l: n,
    a: i
  }),
  hsv: (e, t, n, i) => so({
    h: e,
    s: t,
    v: n,
    a: i
  }),
  hsva: (e, t, n, i) => so({
    h: e,
    s: t,
    v: n,
    a: i
  })
};
function Jt(e) {
  if (typeof e == "number")
    return (isNaN(e) || e < 0 || e > 16777215) && dn(`'${e}' is not a valid hex color`), {
      r: (e & 16711680) >> 16,
      g: (e & 65280) >> 8,
      b: e & 255
    };
  if (typeof e == "string" && Ya.test(e)) {
    const {
      groups: t
    } = e.match(Ya), {
      fn: n,
      values: i
    } = t, o = i.split(/,\s*/).map((r) => r.endsWith("%") && ["hsl", "hsla", "hsv", "hsva"].includes(n) ? parseFloat(r) / 100 : parseFloat(r));
    return Dh[n](...o);
  } else if (typeof e == "string") {
    let t = e.startsWith("#") ? e.slice(1) : e;
    [3, 4].includes(t.length) ? t = t.split("").map((i) => i + i).join("") : [6, 8].includes(t.length) || dn(`'${e}' is not a valid hex(a) color`);
    const n = parseInt(t, 16);
    return (isNaN(n) || n < 0 || n > 4294967295) && dn(`'${e}' is not a valid hex(a) color`), Ph(t);
  } else if (typeof e == "object") {
    if (Jr(e, ["r", "g", "b"]))
      return e;
    if (Jr(e, ["h", "s", "l"]))
      return so(vd(e));
    if (Jr(e, ["h", "s", "v"]))
      return so(e);
  }
  throw new TypeError(`Invalid color: ${e == null ? e : String(e) || e.constructor.name}
Expected #hex, #hexa, rgb(), rgba(), hsl(), hsla(), object or number`);
}
function so(e) {
  const {
    h: t,
    s: n,
    v: i,
    a: o
  } = e, r = (l) => {
    const a = (l + t / 60) % 6;
    return i - i * n * Math.max(Math.min(a, 4 - a, 1), 0);
  }, s = [r(5), r(3), r(1)].map((l) => Math.round(l * 255));
  return {
    r: s[0],
    g: s[1],
    b: s[2],
    a: o
  };
}
function qa(e) {
  return so(vd(e));
}
function vd(e) {
  const {
    h: t,
    s: n,
    l: i,
    a: o
  } = e, r = i + n * Math.min(i, 1 - i), s = r === 0 ? 0 : 2 - 2 * i / r;
  return {
    h: t,
    s,
    v: r,
    a: o
  };
}
function Ao(e) {
  const t = Math.round(e).toString(16);
  return ("00".substr(0, 2 - t.length) + t).toUpperCase();
}
function Th(e) {
  let {
    r: t,
    g: n,
    b: i,
    a: o
  } = e;
  return `#${[Ao(t), Ao(n), Ao(i), o !== void 0 ? Ao(Math.round(o * 255)) : ""].join("")}`;
}
function Ph(e) {
  e = Ah(e);
  let [t, n, i, o] = lh(e, 2).map((r) => parseInt(r, 16));
  return o = o === void 0 ? o : o / 255, {
    r: t,
    g: n,
    b: i,
    a: o
  };
}
function Ah(e) {
  return e.startsWith("#") && (e = e.slice(1)), e = e.replace(/([^0-9a-f])/gi, "F"), (e.length === 3 || e.length === 4) && (e = e.split("").map((t) => t + t).join("")), e.length !== 6 && (e = Aa(Aa(e, 6), 8, "F")), e;
}
function Ih(e, t) {
  const n = dd(hl(e));
  return n[0] = n[0] + t * 10, md(fd(n));
}
function $h(e, t) {
  const n = dd(hl(e));
  return n[0] = n[0] - t * 10, md(fd(n));
}
function Mh(e) {
  const t = Jt(e);
  return hl(t)[1];
}
function gd(e) {
  const t = Math.abs(Ga(Jt(0), Jt(e)));
  return Math.abs(Ga(Jt(16777215), Jt(e))) > Math.min(t, 50) ? "#fff" : "#000";
}
function W(e, t) {
  return (n) => Object.keys(e).reduce((i, o) => {
    const s = typeof e[o] == "object" && e[o] != null && !Array.isArray(e[o]) ? e[o] : {
      type: e[o]
    };
    return n && o in n ? i[o] = {
      ...s,
      default: n[o]
    } : i[o] = s, t && !i[o].source && (i[o].source = t), i;
  }, {});
}
const pe = W({
  class: [String, Array, Object],
  style: {
    type: [String, Array, Object],
    default: null
  }
}, "component");
function ze(e, t) {
  const n = Nr();
  if (!n)
    throw new Error(`[Vuetify] ${e} must be called from inside a setup function`);
  return n;
}
function Qt() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "composables";
  const t = ze(e).type;
  return ni((t == null ? void 0 : t.aliasName) || (t == null ? void 0 : t.name));
}
let hd = 0, zo = /* @__PURE__ */ new WeakMap();
function Fn() {
  const e = ze("getUid");
  if (zo.has(e)) return zo.get(e);
  {
    const t = hd++;
    return zo.set(e, t), t;
  }
}
Fn.reset = () => {
  hd = 0, zo = /* @__PURE__ */ new WeakMap();
};
function Fh(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : ze("injectSelf");
  const {
    provides: n
  } = t;
  if (n && e in n)
    return n[e];
}
const xi = Symbol.for("vuetify:defaults");
function Lh(e) {
  return ue(e);
}
function pl() {
  const e = Re(xi);
  if (!e) throw new Error("[Vuetify] Could not find defaults instance");
  return e;
}
function Ti(e, t) {
  const n = pl(), i = ue(e), o = y(() => {
    if (Xt(t == null ? void 0 : t.disabled)) return n.value;
    const s = Xt(t == null ? void 0 : t.scoped), l = Xt(t == null ? void 0 : t.reset), a = Xt(t == null ? void 0 : t.root);
    if (i.value == null && !(s || l || a)) return n.value;
    let d = kt(i.value, {
      prev: n.value
    });
    if (s) return d;
    if (l || a) {
      const u = Number(l || 1 / 0);
      for (let c = 0; c <= u && !(!d || !("prev" in d)); c++)
        d = d.prev;
      return d && typeof a == "string" && a in d && (d = kt(kt(d, {
        prev: d
      }), d[a])), d;
    }
    return d.prev ? kt(d.prev, d) : d;
  });
  return gt(xi, o), o;
}
function Bh(e, t) {
  var n, i;
  return typeof ((n = e.props) == null ? void 0 : n[t]) < "u" || typeof ((i = e.props) == null ? void 0 : i[ni(t)]) < "u";
}
function Rh() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : pl();
  const i = ze("useDefaults");
  if (t = t ?? i.type.name ?? i.type.__name, !t)
    throw new Error("[Vuetify] Could not determine component name");
  const o = y(() => {
    var a;
    return (a = n.value) == null ? void 0 : a[e._as ?? t];
  }), r = new Proxy(e, {
    get(a, d) {
      var c, m, v, g, h, w, C;
      const u = Reflect.get(a, d);
      return d === "class" || d === "style" ? [(c = o.value) == null ? void 0 : c[d], u].filter((O) => O != null) : typeof d == "string" && !Bh(i.vnode, d) ? ((m = o.value) == null ? void 0 : m[d]) !== void 0 ? (v = o.value) == null ? void 0 : v[d] : ((h = (g = n.value) == null ? void 0 : g.global) == null ? void 0 : h[d]) !== void 0 ? (C = (w = n.value) == null ? void 0 : w.global) == null ? void 0 : C[d] : u : u;
    }
  }), s = he();
  yn(() => {
    if (o.value) {
      const a = Object.entries(o.value).filter((d) => {
        let [u] = d;
        return u.startsWith(u[0].toUpperCase());
      });
      s.value = a.length ? Object.fromEntries(a) : void 0;
    } else
      s.value = void 0;
  });
  function l() {
    const a = Fh(xi, i);
    gt(xi, y(() => s.value ? kt((a == null ? void 0 : a.value) ?? {}, s.value) : a == null ? void 0 : a.value));
  }
  return {
    props: r,
    provideSubDefaults: l
  };
}
function Pi(e) {
  if (e._setup = e._setup ?? e.setup, !e.name)
    return dn("The component is missing an explicit name, unable to generate default prop value"), e;
  if (e._setup) {
    e.props = W(e.props ?? {}, e.name)();
    const t = Object.keys(e.props).filter((n) => n !== "class" && n !== "style");
    e.filterProps = function(i) {
      return nd(i, t);
    }, e.props._as = String, e.setup = function(i, o) {
      const r = pl();
      if (!r.value) return e._setup(i, o);
      const {
        props: s,
        provideSubDefaults: l
      } = Rh(i, i._as ?? e.name, r), a = e._setup(s, o);
      return l(), a;
    };
  }
  return e;
}
function se() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !0;
  return (t) => (e ? Pi : ov)(t);
}
function Dr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "div", n = arguments.length > 2 ? arguments[2] : void 0;
  return se()({
    name: n ?? Tt(tt(e.replace(/__/g, "-"))),
    props: {
      tag: {
        type: String,
        default: t
      },
      ...pe()
    },
    setup(i, o) {
      let {
        slots: r
      } = o;
      return () => {
        var s;
        return $n(i.tag, {
          class: [e, i.class],
          style: i.style
        }, (s = r.default) == null ? void 0 : s.call(r));
      };
    }
  });
}
function pd(e) {
  if (typeof e.getRootNode != "function") {
    for (; e.parentNode; ) e = e.parentNode;
    return e !== document ? null : document;
  }
  const t = e.getRootNode();
  return t !== document && t.getRootNode({
    composed: !0
  }) !== document ? null : t;
}
const lr = "cubic-bezier(0.4, 0, 0.2, 1)", Hh = "cubic-bezier(0.0, 0, 0.2, 1)", jh = "cubic-bezier(0.4, 0, 1, 1)";
function zh(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
  for (; e; ) {
    if (t ? Uh(e) : yl(e)) return e;
    e = e.parentElement;
  }
  return document.scrollingElement;
}
function ar(e, t) {
  const n = [];
  if (t && e && !t.contains(e)) return n;
  for (; e && (yl(e) && n.push(e), e !== t); )
    e = e.parentElement;
  return n;
}
function yl(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return t.overflowY === "scroll" || t.overflowY === "auto" && e.scrollHeight > e.clientHeight;
}
function Uh(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return ["scroll", "auto"].includes(t.overflowY);
}
function Wh(e) {
  for (; e; ) {
    if (window.getComputedStyle(e).position === "fixed")
      return !0;
    e = e.offsetParent;
  }
  return !1;
}
function ge(e) {
  const t = ze("useRender");
  t.render = e;
}
function nt(e, t, n) {
  let i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : (c) => c, o = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : (c) => c;
  const r = ze("useProxiedModel"), s = ue(e[t] !== void 0 ? e[t] : n), l = ni(t), d = y(l !== t ? () => {
    var c, m, v, g;
    return e[t], !!(((c = r.vnode.props) != null && c.hasOwnProperty(t) || (m = r.vnode.props) != null && m.hasOwnProperty(l)) && ((v = r.vnode.props) != null && v.hasOwnProperty(`onUpdate:${t}`) || (g = r.vnode.props) != null && g.hasOwnProperty(`onUpdate:${l}`)));
  } : () => {
    var c, m;
    return e[t], !!((c = r.vnode.props) != null && c.hasOwnProperty(t) && ((m = r.vnode.props) != null && m.hasOwnProperty(`onUpdate:${t}`)));
  });
  ai(() => !d.value, () => {
    ve(() => e[t], (c) => {
      s.value = c;
    });
  });
  const u = y({
    get() {
      const c = e[t];
      return i(d.value ? c : s.value);
    },
    set(c) {
      const m = o(c), v = J(d.value ? e[t] : s.value);
      v === m || i(v) === c || (s.value = m, r == null || r.emit(`update:${t}`, m));
    }
  });
  return Object.defineProperty(u, "externalValue", {
    get: () => d.value ? e[t] : s.value
  }), u;
}
const Kh = {
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
}, Za = "$vuetify.", Xa = (e, t) => e.replace(/\{(\d+)\}/g, (n, i) => String(t[+i])), yd = (e, t, n) => function(i) {
  for (var o = arguments.length, r = new Array(o > 1 ? o - 1 : 0), s = 1; s < o; s++)
    r[s - 1] = arguments[s];
  if (!i.startsWith(Za))
    return Xa(i, r);
  const l = i.replace(Za, ""), a = e.value && n.value[e.value], d = t.value && n.value[t.value];
  let u = Ns(a, l, null);
  return u || (dn(`Translation key "${i}" not found in "${e.value}", trying fallback locale`), u = Ns(d, l, null)), u || (rr(`Translation key "${i}" not found in fallback`), u = i), typeof u != "string" && (rr(`Translation key "${i}" has a non-string value`), u = i), Xa(u, r);
};
function bd(e, t) {
  return (n, i) => new Intl.NumberFormat([e.value, t.value], i).format(n);
}
function ts(e, t, n) {
  const i = nt(e, t, e[t] ?? n.value);
  return i.value = e[t] ?? n.value, ve(n, (o) => {
    e[t] == null && (i.value = n.value);
  }), i;
}
function _d(e) {
  return (t) => {
    const n = ts(t, "locale", e.current), i = ts(t, "fallback", e.fallback), o = ts(t, "messages", e.messages);
    return {
      name: "vuetify",
      current: n,
      fallback: i,
      messages: o,
      t: yd(n, i, o),
      n: bd(n, i),
      provide: _d({
        current: n,
        fallback: i,
        messages: o
      })
    };
  };
}
function Gh(e) {
  const t = he((e == null ? void 0 : e.locale) ?? "en"), n = he((e == null ? void 0 : e.fallback) ?? "en"), i = ue({
    en: Kh,
    ...e == null ? void 0 : e.messages
  });
  return {
    name: "vuetify",
    current: t,
    fallback: n,
    messages: i,
    t: yd(t, n, i),
    n: bd(t, n),
    provide: _d({
      current: t,
      fallback: n,
      messages: i
    })
  };
}
const ur = Symbol.for("vuetify:locale");
function Yh(e) {
  return e.name != null;
}
function qh(e) {
  const t = e != null && e.adapter && Yh(e == null ? void 0 : e.adapter) ? e == null ? void 0 : e.adapter : Gh(e), n = Xh(t, e);
  return {
    ...t,
    ...n
  };
}
function bl() {
  const e = Re(ur);
  if (!e) throw new Error("[Vuetify] Could not find injected locale instance");
  return e;
}
function Zh() {
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
function Xh(e, t) {
  const n = ue((t == null ? void 0 : t.rtl) ?? Zh()), i = y(() => n.value[e.current.value] ?? !1);
  return {
    isRtl: i,
    rtl: n,
    rtlClasses: y(() => `v-locale--is-${i.value ? "rtl" : "ltr"}`)
  };
}
function en() {
  const e = Re(ur);
  if (!e) throw new Error("[Vuetify] Could not find injected rtl instance");
  return {
    isRtl: e.isRtl,
    rtlClasses: e.rtlClasses
  };
}
const Tr = {
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
function Jh(e, t, n) {
  const i = [];
  let o = [];
  const r = wd(e), s = Sd(e), l = n ?? Tr[t.slice(-2).toUpperCase()] ?? 0, a = (r.getDay() - l + 7) % 7, d = (s.getDay() - l + 7) % 7;
  for (let u = 0; u < a; u++) {
    const c = new Date(r);
    c.setDate(c.getDate() - (a - u)), o.push(c);
  }
  for (let u = 1; u <= s.getDate(); u++) {
    const c = new Date(e.getFullYear(), e.getMonth(), u);
    o.push(c), o.length === 7 && (i.push(o), o = []);
  }
  for (let u = 1; u < 7 - d; u++) {
    const c = new Date(s);
    c.setDate(c.getDate() + u), o.push(c);
  }
  return o.length > 0 && i.push(o), i;
}
function Qh(e, t, n) {
  const i = n ?? Tr[t.slice(-2).toUpperCase()] ?? 0, o = new Date(e);
  for (; o.getDay() !== i; )
    o.setDate(o.getDate() - 1);
  return o;
}
function ep(e, t) {
  const n = new Date(e), i = ((Tr[t.slice(-2).toUpperCase()] ?? 0) + 6) % 7;
  for (; n.getDay() !== i; )
    n.setDate(n.getDate() + 1);
  return n;
}
function wd(e) {
  return new Date(e.getFullYear(), e.getMonth(), 1);
}
function Sd(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 0);
}
function tp(e) {
  const t = e.split("-").map(Number);
  return new Date(t[0], t[1] - 1, t[2]);
}
const np = /^([12]\d{3}-([1-9]|0[1-9]|1[0-2])-([1-9]|0[1-9]|[12]\d|3[01]))$/;
function Ed(e) {
  if (e == null) return /* @__PURE__ */ new Date();
  if (e instanceof Date) return e;
  if (typeof e == "string") {
    let t;
    if (np.test(e))
      return tp(e);
    if (t = Date.parse(e), !isNaN(t)) return new Date(t);
  }
  return null;
}
const Ja = new Date(2e3, 0, 2);
function ip(e, t) {
  const n = t ?? Tr[e.slice(-2).toUpperCase()] ?? 0;
  return fl(7).map((i) => {
    const o = new Date(Ja);
    return o.setDate(Ja.getDate() + n + i), new Intl.DateTimeFormat(e, {
      weekday: "narrow"
    }).format(o);
  });
}
function op(e, t, n, i) {
  const o = Ed(e) ?? /* @__PURE__ */ new Date(), r = i == null ? void 0 : i[t];
  if (typeof r == "function")
    return r(o, t, n);
  let s = {};
  switch (t) {
    case "fullDate":
      s = {
        year: "numeric",
        month: "long",
        day: "numeric"
      };
      break;
    case "fullDateWithWeekday":
      s = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      };
      break;
    case "normalDate":
      const l = o.getDate(), a = new Intl.DateTimeFormat(n, {
        month: "long"
      }).format(o);
      return `${l} ${a}`;
    case "normalDateWithWeekday":
      s = {
        weekday: "short",
        day: "numeric",
        month: "short"
      };
      break;
    case "shortDate":
      s = {
        month: "short",
        day: "numeric"
      };
      break;
    case "year":
      s = {
        year: "numeric"
      };
      break;
    case "month":
      s = {
        month: "long"
      };
      break;
    case "monthShort":
      s = {
        month: "short"
      };
      break;
    case "monthAndYear":
      s = {
        month: "long",
        year: "numeric"
      };
      break;
    case "monthAndDate":
      s = {
        month: "long",
        day: "numeric"
      };
      break;
    case "weekday":
      s = {
        weekday: "long"
      };
      break;
    case "weekdayShort":
      s = {
        weekday: "short"
      };
      break;
    case "dayOfMonth":
      return new Intl.NumberFormat(n).format(o.getDate());
    case "hours12h":
      s = {
        hour: "numeric",
        hour12: !0
      };
      break;
    case "hours24h":
      s = {
        hour: "numeric",
        hour12: !1
      };
      break;
    case "minutes":
      s = {
        minute: "numeric"
      };
      break;
    case "seconds":
      s = {
        second: "numeric"
      };
      break;
    case "fullTime":
      s = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !0
      };
      break;
    case "fullTime12h":
      s = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !0
      };
      break;
    case "fullTime24h":
      s = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !1
      };
      break;
    case "fullDateTime":
      s = {
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
      s = {
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
      s = {
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
      s = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      };
      break;
    case "keyboardDateTime":
      s = {
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
      s = {
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
      s = {
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
      s = r ?? {
        timeZone: "UTC",
        timeZoneName: "short"
      };
  }
  return new Intl.DateTimeFormat(n, s).format(o);
}
function rp(e, t) {
  const n = e.toJsDate(t), i = n.getFullYear(), o = Ia(String(n.getMonth() + 1), 2, "0"), r = Ia(String(n.getDate()), 2, "0");
  return `${i}-${o}-${r}`;
}
function sp(e) {
  const [t, n, i] = e.split("-").map(Number);
  return new Date(t, n - 1, i);
}
function lp(e, t) {
  const n = new Date(e);
  return n.setMinutes(n.getMinutes() + t), n;
}
function ap(e, t) {
  const n = new Date(e);
  return n.setHours(n.getHours() + t), n;
}
function up(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}
function cp(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t * 7), n;
}
function dp(e, t) {
  const n = new Date(e);
  return n.setDate(1), n.setMonth(n.getMonth() + t), n;
}
function fp(e) {
  return e.getFullYear();
}
function mp(e) {
  return e.getMonth();
}
function vp(e) {
  return e.getDate();
}
function gp(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 1);
}
function hp(e) {
  return new Date(e.getFullYear(), e.getMonth() - 1, 1);
}
function pp(e) {
  return e.getHours();
}
function yp(e) {
  return e.getMinutes();
}
function bp(e) {
  return new Date(e.getFullYear(), 0, 1);
}
function _p(e) {
  return new Date(e.getFullYear(), 11, 31);
}
function wp(e, t) {
  return cr(e, t[0]) && Cp(e, t[1]);
}
function Sp(e) {
  const t = new Date(e);
  return t instanceof Date && !isNaN(t.getTime());
}
function cr(e, t) {
  return e.getTime() > t.getTime();
}
function Ep(e, t) {
  return cr(Ts(e), Ts(t));
}
function Cp(e, t) {
  return e.getTime() < t.getTime();
}
function Qa(e, t) {
  return e.getTime() === t.getTime();
}
function kp(e, t) {
  return e.getDate() === t.getDate() && e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function Np(e, t) {
  return e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function xp(e, t) {
  return e.getFullYear() === t.getFullYear();
}
function Vp(e, t, n) {
  const i = new Date(e), o = new Date(t);
  switch (n) {
    case "years":
      return i.getFullYear() - o.getFullYear();
    case "quarters":
      return Math.floor((i.getMonth() - o.getMonth() + (i.getFullYear() - o.getFullYear()) * 12) / 4);
    case "months":
      return i.getMonth() - o.getMonth() + (i.getFullYear() - o.getFullYear()) * 12;
    case "weeks":
      return Math.floor((i.getTime() - o.getTime()) / (1e3 * 60 * 60 * 24 * 7));
    case "days":
      return Math.floor((i.getTime() - o.getTime()) / (1e3 * 60 * 60 * 24));
    case "hours":
      return Math.floor((i.getTime() - o.getTime()) / (1e3 * 60 * 60));
    case "minutes":
      return Math.floor((i.getTime() - o.getTime()) / (1e3 * 60));
    case "seconds":
      return Math.floor((i.getTime() - o.getTime()) / 1e3);
    default:
      return i.getTime() - o.getTime();
  }
}
function Op(e, t) {
  const n = new Date(e);
  return n.setHours(t), n;
}
function Dp(e, t) {
  const n = new Date(e);
  return n.setMinutes(t), n;
}
function Tp(e, t) {
  const n = new Date(e);
  return n.setMonth(t), n;
}
function Pp(e, t) {
  const n = new Date(e);
  return n.setDate(t), n;
}
function Ap(e, t) {
  const n = new Date(e);
  return n.setFullYear(t), n;
}
function Ts(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
}
function Ip(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
}
class $p {
  constructor(t) {
    this.locale = t.locale, this.formats = t.formats;
  }
  date(t) {
    return Ed(t);
  }
  toJsDate(t) {
    return t;
  }
  toISO(t) {
    return rp(this, t);
  }
  parseISO(t) {
    return sp(t);
  }
  addMinutes(t, n) {
    return lp(t, n);
  }
  addHours(t, n) {
    return ap(t, n);
  }
  addDays(t, n) {
    return up(t, n);
  }
  addWeeks(t, n) {
    return cp(t, n);
  }
  addMonths(t, n) {
    return dp(t, n);
  }
  getWeekArray(t, n) {
    return Jh(t, this.locale, n ? Number(n) : void 0);
  }
  startOfWeek(t, n) {
    return Qh(t, this.locale, n ? Number(n) : void 0);
  }
  endOfWeek(t) {
    return ep(t, this.locale);
  }
  startOfMonth(t) {
    return wd(t);
  }
  endOfMonth(t) {
    return Sd(t);
  }
  format(t, n) {
    return op(t, n, this.locale, this.formats);
  }
  isEqual(t, n) {
    return Qa(t, n);
  }
  isValid(t) {
    return Sp(t);
  }
  isWithinRange(t, n) {
    return wp(t, n);
  }
  isAfter(t, n) {
    return cr(t, n);
  }
  isAfterDay(t, n) {
    return Ep(t, n);
  }
  isBefore(t, n) {
    return !cr(t, n) && !Qa(t, n);
  }
  isSameDay(t, n) {
    return kp(t, n);
  }
  isSameMonth(t, n) {
    return Np(t, n);
  }
  isSameYear(t, n) {
    return xp(t, n);
  }
  setMinutes(t, n) {
    return Dp(t, n);
  }
  setHours(t, n) {
    return Op(t, n);
  }
  setMonth(t, n) {
    return Tp(t, n);
  }
  setDate(t, n) {
    return Pp(t, n);
  }
  setYear(t, n) {
    return Ap(t, n);
  }
  getDiff(t, n, i) {
    return Vp(t, n, i);
  }
  getWeekdays(t) {
    return ip(this.locale, t ? Number(t) : void 0);
  }
  getYear(t) {
    return fp(t);
  }
  getMonth(t) {
    return mp(t);
  }
  getDate(t) {
    return vp(t);
  }
  getNextMonth(t) {
    return gp(t);
  }
  getPreviousMonth(t) {
    return hp(t);
  }
  getHours(t) {
    return pp(t);
  }
  getMinutes(t) {
    return yp(t);
  }
  startOfDay(t) {
    return Ts(t);
  }
  endOfDay(t) {
    return Ip(t);
  }
  startOfYear(t) {
    return bp(t);
  }
  endOfYear(t) {
    return _p(t);
  }
}
const Mp = Symbol.for("vuetify:date-options"), eu = Symbol.for("vuetify:date-adapter");
function Fp(e, t) {
  const n = kt({
    adapter: $p,
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
    instance: Lp(n, t)
  };
}
function Lp(e, t) {
  const n = et(typeof e.adapter == "function" ? new e.adapter({
    locale: e.locale[t.current.value] ?? t.current.value,
    formats: e.formats
  }) : e.adapter);
  return ve(t.current, (i) => {
    n.locale = e.locale[i] ?? i ?? n.locale;
  }), n;
}
const Pr = ["sm", "md", "lg", "xl", "xxl"], Ps = Symbol.for("vuetify:display"), tu = {
  mobileBreakpoint: "lg",
  thresholds: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
    xxl: 2560
  }
}, Bp = function() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : tu;
  return kt(tu, e);
};
function nu(e) {
  return Be && !e ? window.innerWidth : typeof e == "object" && e.clientWidth || 0;
}
function iu(e) {
  return Be && !e ? window.innerHeight : typeof e == "object" && e.clientHeight || 0;
}
function ou(e) {
  const t = Be && !e ? window.navigator.userAgent : "ssr";
  function n(g) {
    return !!t.match(g);
  }
  const i = n(/android/i), o = n(/iphone|ipad|ipod/i), r = n(/cordova/i), s = n(/electron/i), l = n(/chrome/i), a = n(/edge/i), d = n(/firefox/i), u = n(/opera/i), c = n(/win/i), m = n(/mac/i), v = n(/linux/i);
  return {
    android: i,
    ios: o,
    cordova: r,
    electron: s,
    chrome: l,
    edge: a,
    firefox: d,
    opera: u,
    win: c,
    mac: m,
    linux: v,
    touch: eh,
    ssr: t === "ssr"
  };
}
function Rp(e, t) {
  const {
    thresholds: n,
    mobileBreakpoint: i
  } = Bp(e), o = he(iu(t)), r = he(ou(t)), s = et({}), l = he(nu(t));
  function a() {
    o.value = iu(), l.value = nu();
  }
  function d() {
    a(), r.value = ou();
  }
  return yn(() => {
    const u = l.value < n.sm, c = l.value < n.md && !u, m = l.value < n.lg && !(c || u), v = l.value < n.xl && !(m || c || u), g = l.value < n.xxl && !(v || m || c || u), h = l.value >= n.xxl, w = u ? "xs" : c ? "sm" : m ? "md" : v ? "lg" : g ? "xl" : "xxl", C = typeof i == "number" ? i : n[i], O = l.value < C;
    s.xs = u, s.sm = c, s.md = m, s.lg = v, s.xl = g, s.xxl = h, s.smAndUp = !u, s.mdAndUp = !(u || c), s.lgAndUp = !(u || c || m), s.xlAndUp = !(u || c || m || v), s.smAndDown = !(m || v || g || h), s.mdAndDown = !(v || g || h), s.lgAndDown = !(g || h), s.xlAndDown = !h, s.name = w, s.height = o.value, s.width = l.value, s.mobile = O, s.mobileBreakpoint = i, s.platform = r.value, s.thresholds = n;
  }), Be && window.addEventListener("resize", a, {
    passive: !0
  }), {
    ...Zs(s),
    update: d,
    ssr: !!t
  };
}
function Hp() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt();
  const n = Re(Ps);
  if (!n) throw new Error("Could not find Vuetify display injection");
  const i = y(() => {
    if (e.mobile != null) return e.mobile;
    if (!e.mobileBreakpoint) return n.mobile.value;
    const r = typeof e.mobileBreakpoint == "number" ? e.mobileBreakpoint : n.thresholds.value[e.mobileBreakpoint];
    return n.width.value < r;
  }), o = y(() => t ? {
    [`${t}--mobile`]: i.value
  } : {});
  return {
    ...n,
    displayClasses: o,
    mobile: i
  };
}
const jp = Symbol.for("vuetify:goto");
function zp() {
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
function Up(e, t) {
  return {
    rtl: t.isRtl,
    options: kt(zp(), e)
  };
}
const Wp = {
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
}, Kp = {
  // Not using mergeProps here, functional components merge props by default (?)
  component: (e) => $n(kd, {
    ...e,
    class: "mdi"
  })
}, He = [String, Function, Object, Array], As = Symbol.for("vuetify:icons"), Ar = W({
  icon: {
    type: He
  },
  // Could not remove this and use makeTagProps, types complained because it is not required
  tag: {
    type: String,
    required: !0
  }
}, "icon"), ru = se()({
  name: "VComponentIcon",
  props: Ar(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return () => {
      const i = e.icon;
      return f(e.tag, null, {
        default: () => {
          var o;
          return [e.icon ? f(i, null, null) : (o = n.default) == null ? void 0 : o.call(n)];
        }
      });
    };
  }
}), Cd = Pi({
  name: "VSvgIcon",
  inheritAttrs: !1,
  props: Ar(),
  setup(e, t) {
    let {
      attrs: n
    } = t;
    return () => f(e.tag, Ee(n, {
      style: null
    }), {
      default: () => [f("svg", {
        class: "v-icon__svg",
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        role: "img",
        "aria-hidden": "true"
      }, [Array.isArray(e.icon) ? e.icon.map((i) => Array.isArray(i) ? f("path", {
        d: i[0],
        "fill-opacity": i[1]
      }, null) : f("path", {
        d: i
      }, null)) : f("path", {
        d: e.icon
      }, null)])]
    });
  }
});
Pi({
  name: "VLigatureIcon",
  props: Ar(),
  setup(e) {
    return () => f(e.tag, null, {
      default: () => [e.icon]
    });
  }
});
const kd = Pi({
  name: "VClassIcon",
  props: Ar(),
  setup(e) {
    return () => f(e.tag, {
      class: e.icon
    }, null);
  }
});
function Gp() {
  return {
    svg: {
      component: Cd
    },
    class: {
      component: kd
    }
  };
}
function Yp(e) {
  const t = Gp(), n = (e == null ? void 0 : e.defaultSet) ?? "mdi";
  return n === "mdi" && !t.mdi && (t.mdi = Kp), kt({
    defaultSet: n,
    sets: t,
    aliases: {
      ...Wp,
      /* eslint-disable max-len */
      vuetify: ["M8.2241 14.2009L12 21L22 3H14.4459L8.2241 14.2009Z", ["M7.26303 12.4733L7.00113 12L2 3H12.5261C12.5261 3 12.5261 3 12.5261 3L7.26303 12.4733Z", 0.6]],
      "vuetify-outline": "svg:M7.26 12.47 12.53 3H2L7.26 12.47ZM14.45 3 8.22 14.2 12 21 22 3H14.45ZM18.6 5 12 16.88 10.51 14.2 15.62 5ZM7.26 8.35 5.4 5H9.13L7.26 8.35Z",
      "vuetify-play": ["m6.376 13.184-4.11-7.192C1.505 4.66 2.467 3 4.003 3h8.532l-.953 1.576-.006.01-.396.677c-.429.732-.214 1.507.194 2.015.404.503 1.092.878 1.869.806a3.72 3.72 0 0 1 1.005.022c.276.053.434.143.523.237.138.146.38.635-.25 2.09-.893 1.63-1.553 1.722-1.847 1.677-.213-.033-.468-.158-.756-.406a4.95 4.95 0 0 1-.8-.927c-.39-.564-1.04-.84-1.66-.846-.625-.006-1.316.27-1.693.921l-.478.826-.911 1.506Z", ["M9.093 11.552c.046-.079.144-.15.32-.148a.53.53 0 0 1 .43.207c.285.414.636.847 1.046 1.2.405.35.914.662 1.516.754 1.334.205 2.502-.698 3.48-2.495l.014-.028.013-.03c.687-1.574.774-2.852-.005-3.675-.37-.391-.861-.586-1.333-.676a5.243 5.243 0 0 0-1.447-.044c-.173.016-.393-.073-.54-.257-.145-.18-.127-.316-.082-.392l.393-.672L14.287 3h5.71c1.536 0 2.499 1.659 1.737 2.992l-7.997 13.996c-.768 1.344-2.706 1.344-3.473 0l-3.037-5.314 1.377-2.278.004-.006.004-.007.481-.831Z", 0.6]]
      /* eslint-enable max-len */
    }
  }, e);
}
const qp = (e) => {
  const t = Re(As);
  if (!t) throw new Error("Missing Vuetify Icons provide!");
  return {
    iconData: y(() => {
      var a;
      const i = Xt(e);
      if (!i) return {
        component: ru
      };
      let o = i;
      if (typeof o == "string" && (o = o.trim(), o.startsWith("$") && (o = (a = t.aliases) == null ? void 0 : a[o.slice(1)])), o || dn(`Could not find aliased icon "${i}"`), Array.isArray(o))
        return {
          component: Cd,
          icon: o
        };
      if (typeof o != "string")
        return {
          component: ru,
          icon: o
        };
      const r = Object.keys(t.sets).find((d) => typeof o == "string" && o.startsWith(`${d}:`)), s = r ? o.slice(r.length + 1) : o;
      return {
        component: t.sets[r ?? t.defaultSet].component,
        icon: s
      };
    })
  };
}, lo = Symbol.for("vuetify:theme"), Xe = W({
  theme: String
}, "theme");
function su() {
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
function Zp() {
  var i, o;
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : su();
  const t = su();
  if (!e) return {
    ...t,
    isDisabled: !0
  };
  const n = {};
  for (const [r, s] of Object.entries(e.themes ?? {})) {
    const l = s.dark || r === "dark" ? (i = t.themes) == null ? void 0 : i.dark : (o = t.themes) == null ? void 0 : o.light;
    n[r] = kt(l, s);
  }
  return kt(t, {
    ...e,
    themes: n
  });
}
function Xp(e) {
  const t = Zp(e), n = ue(t.defaultTheme), i = ue(t.themes), o = y(() => {
    const u = {};
    for (const [c, m] of Object.entries(i.value)) {
      const v = u[c] = {
        ...m,
        colors: {
          ...m.colors
        }
      };
      if (t.variations)
        for (const g of t.variations.colors) {
          const h = v.colors[g];
          if (h)
            for (const w of ["lighten", "darken"]) {
              const C = w === "lighten" ? Ih : $h;
              for (const O of fl(t.variations[w], 1))
                v.colors[`${g}-${w}-${O}`] = Th(C(Jt(h), O));
            }
        }
      for (const g of Object.keys(v.colors)) {
        if (/^on-[a-z]/.test(g) || v.colors[`on-${g}`]) continue;
        const h = `on-${g}`, w = Jt(v.colors[g]);
        v.colors[h] = gd(w);
      }
    }
    return u;
  }), r = y(() => o.value[n.value]), s = y(() => {
    var g;
    const u = [];
    (g = r.value) != null && g.dark && Un(u, ":root", ["color-scheme: dark"]), Un(u, ":root", lu(r.value));
    for (const [h, w] of Object.entries(o.value))
      Un(u, `.v-theme--${h}`, [`color-scheme: ${w.dark ? "dark" : "normal"}`, ...lu(w)]);
    const c = [], m = [], v = new Set(Object.values(o.value).flatMap((h) => Object.keys(h.colors)));
    for (const h of v)
      /^on-[a-z]/.test(h) ? Un(m, `.${h}`, [`color: rgb(var(--v-theme-${h})) !important`]) : (Un(c, `.bg-${h}`, [`--v-theme-overlay-multiplier: var(--v-theme-${h}-overlay-multiplier)`, `background-color: rgb(var(--v-theme-${h})) !important`, `color: rgb(var(--v-theme-on-${h})) !important`]), Un(m, `.text-${h}`, [`color: rgb(var(--v-theme-${h})) !important`]), Un(m, `.border-${h}`, [`--v-border-color: var(--v-theme-${h})`]));
    return u.push(...c, ...m), u.map((h, w) => w === 0 ? h : `    ${h}`).join("");
  });
  function l() {
    return {
      style: [{
        children: s.value,
        id: "vuetify-theme-stylesheet",
        nonce: t.cspNonce || !1
      }]
    };
  }
  function a(u) {
    if (t.isDisabled) return;
    const c = u._context.provides.usehead;
    if (c)
      if (c.push) {
        const m = c.push(l);
        Be && ve(s, () => {
          m.patch(l);
        });
      } else
        Be ? (c.addHeadObjs(y(l)), yn(() => c.updateDOM())) : c.addHeadObjs(l());
    else {
      let v = function() {
        if (typeof document < "u" && !m) {
          const g = document.createElement("style");
          g.type = "text/css", g.id = "vuetify-theme-stylesheet", t.cspNonce && g.setAttribute("nonce", t.cspNonce), m = g, document.head.appendChild(m);
        }
        m && (m.innerHTML = s.value);
      }, m = Be ? document.getElementById("vuetify-theme-stylesheet") : null;
      Be ? ve(s, v, {
        immediate: !0
      }) : v();
    }
  }
  const d = y(() => t.isDisabled ? void 0 : `v-theme--${n.value}`);
  return {
    install: a,
    isDisabled: t.isDisabled,
    name: n,
    themes: i,
    current: r,
    computedThemes: o,
    themeClasses: d,
    styles: s,
    global: {
      name: n,
      current: r
    }
  };
}
function lt(e) {
  ze("provideTheme");
  const t = Re(lo, null);
  if (!t) throw new Error("Could not find Vuetify theme injection");
  const n = y(() => e.theme ?? t.name.value), i = y(() => t.themes.value[n.value]), o = y(() => t.isDisabled ? void 0 : `v-theme--${n.value}`), r = {
    ...t,
    name: n,
    current: i,
    themeClasses: o
  };
  return gt(lo, r), r;
}
function Nd() {
  ze("useTheme");
  const e = Re(lo, null);
  if (!e) throw new Error("Could not find Vuetify theme injection");
  return e;
}
function Un(e, t, n) {
  e.push(`${t} {
`, ...n.map((i) => `  ${i};
`), `}
`);
}
function lu(e) {
  const t = e.dark ? 2 : 1, n = e.dark ? 1 : 2, i = [];
  for (const [o, r] of Object.entries(e.colors)) {
    const s = Jt(r);
    i.push(`--v-theme-${o}: ${s.r},${s.g},${s.b}`), o.startsWith("on-") || i.push(`--v-theme-${o}-overlay-multiplier: ${Mh(r) > 0.18 ? t : n}`);
  }
  for (const [o, r] of Object.entries(e.variables)) {
    const s = typeof r == "string" && r.startsWith("#") ? Jt(r) : void 0, l = s ? `${s.r}, ${s.g}, ${s.b}` : void 0;
    i.push(`--v-${o}: ${l ?? r}`);
  }
  return i;
}
function xd(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "content";
  const n = Vs(), i = ue();
  if (Be) {
    const o = new ResizeObserver((r) => {
      r.length && (t === "content" ? i.value = r[0].contentRect : i.value = r[0].target.getBoundingClientRect());
    });
    yt(() => {
      o.disconnect();
    }), ve(() => n.el, (r, s) => {
      s && (o.unobserve(s), i.value = void 0), r && o.observe(r);
    }, {
      flush: "post"
    });
  }
  return {
    resizeRef: n,
    contentRect: vo(i)
  };
}
const dr = Symbol.for("vuetify:layout"), Vd = Symbol.for("vuetify:layout-item"), au = 1e3, Jp = W({
  overlaps: {
    type: Array,
    default: () => []
  },
  fullHeight: Boolean
}, "layout"), Od = W({
  name: {
    type: String
  },
  order: {
    type: [Number, String],
    default: 0
  },
  absolute: Boolean
}, "layout-item");
function Qp() {
  const e = Re(dr);
  if (!e) throw new Error("[Vuetify] Could not find injected layout");
  return {
    getLayoutItem: e.getLayoutItem,
    mainRect: e.mainRect,
    mainStyles: e.mainStyles
  };
}
function Dd(e) {
  const t = Re(dr);
  if (!t) throw new Error("[Vuetify] Could not find injected layout");
  const n = e.id ?? `layout-item-${Fn()}`, i = ze("useLayoutItem");
  gt(Vd, {
    id: n
  });
  const o = he(!1);
  yc(() => o.value = !0), pc(() => o.value = !1);
  const {
    layoutItemStyles: r,
    layoutItemScrimStyles: s
  } = t.register(i, {
    ...e,
    active: y(() => o.value ? !1 : e.active.value),
    id: n
  });
  return yt(() => t.unregister(n)), {
    layoutItemStyles: r,
    layoutRect: t.layoutRect,
    layoutItemScrimStyles: s
  };
}
const ey = (e, t, n, i) => {
  let o = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  };
  const r = [{
    id: "",
    layer: {
      ...o
    }
  }];
  for (const s of e) {
    const l = t.get(s), a = n.get(s), d = i.get(s);
    if (!l || !a || !d) continue;
    const u = {
      ...o,
      [l.value]: parseInt(o[l.value], 10) + (d.value ? parseInt(a.value, 10) : 0)
    };
    r.push({
      id: s,
      layer: u
    }), o = u;
  }
  return r;
};
function ty(e) {
  const t = Re(dr, null), n = y(() => t ? t.rootZIndex.value - 100 : au), i = ue([]), o = et(/* @__PURE__ */ new Map()), r = et(/* @__PURE__ */ new Map()), s = et(/* @__PURE__ */ new Map()), l = et(/* @__PURE__ */ new Map()), a = et(/* @__PURE__ */ new Map()), {
    resizeRef: d,
    contentRect: u
  } = xd(), c = y(() => {
    const N = /* @__PURE__ */ new Map(), $ = e.overlaps ?? [];
    for (const E of $.filter((V) => V.includes(":"))) {
      const [V, L] = E.split(":");
      if (!i.value.includes(V) || !i.value.includes(L)) continue;
      const A = o.get(V), S = o.get(L), T = r.get(V), B = r.get(L);
      !A || !S || !T || !B || (N.set(L, {
        position: A.value,
        amount: parseInt(T.value, 10)
      }), N.set(V, {
        position: S.value,
        amount: -parseInt(B.value, 10)
      }));
    }
    return N;
  }), m = y(() => {
    const N = [...new Set([...s.values()].map((E) => E.value))].sort((E, V) => E - V), $ = [];
    for (const E of N) {
      const V = i.value.filter((L) => {
        var A;
        return ((A = s.get(L)) == null ? void 0 : A.value) === E;
      });
      $.push(...V);
    }
    return ey($, o, r, l);
  }), v = y(() => !Array.from(a.values()).some((N) => N.value)), g = y(() => m.value[m.value.length - 1].layer), h = y(() => ({
    "--v-layout-left": oe(g.value.left),
    "--v-layout-right": oe(g.value.right),
    "--v-layout-top": oe(g.value.top),
    "--v-layout-bottom": oe(g.value.bottom),
    ...v.value ? void 0 : {
      transition: "none"
    }
  })), w = y(() => m.value.slice(1).map((N, $) => {
    let {
      id: E
    } = N;
    const {
      layer: V
    } = m.value[$], L = r.get(E), A = o.get(E);
    return {
      id: E,
      ...V,
      size: Number(L.value),
      position: A.value
    };
  })), C = (N) => w.value.find(($) => $.id === N), O = ze("createLayout"), P = he(!1);
  In(() => {
    P.value = !0;
  }), gt(dr, {
    register: (N, $) => {
      let {
        id: E,
        order: V,
        position: L,
        layoutSize: A,
        elementSize: S,
        active: T,
        disableTransitions: B,
        absolute: Z
      } = $;
      s.set(E, V), o.set(E, L), r.set(E, A), l.set(E, T), B && a.set(E, B);
      const X = pi(Vd, O == null ? void 0 : O.vnode).indexOf(N);
      X > -1 ? i.value.splice(X, 0, E) : i.value.push(E);
      const q = y(() => w.value.findIndex((ne) => ne.id === E)), ye = y(() => n.value + m.value.length * 2 - q.value * 2), be = y(() => {
        const ne = L.value === "left" || L.value === "right", xe = L.value === "right", Je = L.value === "bottom", Qe = S.value ?? A.value, Y = Qe === 0 ? "%" : "px", ce = {
          [L.value]: 0,
          zIndex: ye.value,
          transform: `translate${ne ? "X" : "Y"}(${(T.value ? 0 : -(Qe === 0 ? 100 : Qe)) * (xe || Je ? -1 : 1)}${Y})`,
          position: Z.value || n.value !== au ? "absolute" : "fixed",
          ...v.value ? void 0 : {
            transition: "none"
          }
        };
        if (!P.value) return ce;
        const Ie = w.value[q.value];
        if (!Ie) throw new Error(`[Vuetify] Could not find layout item "${E}"`);
        const at = c.value.get(E);
        return at && (Ie[at.position] += at.amount), {
          ...ce,
          height: ne ? `calc(100% - ${Ie.top}px - ${Ie.bottom}px)` : S.value ? `${S.value}px` : void 0,
          left: xe ? void 0 : `${Ie.left}px`,
          right: xe ? `${Ie.right}px` : void 0,
          top: L.value !== "bottom" ? `${Ie.top}px` : void 0,
          bottom: L.value !== "top" ? `${Ie.bottom}px` : void 0,
          width: ne ? S.value ? `${S.value}px` : void 0 : `calc(100% - ${Ie.left}px - ${Ie.right}px)`
        };
      }), fe = y(() => ({
        zIndex: ye.value - 1
      }));
      return {
        layoutItemStyles: be,
        layoutItemScrimStyles: fe,
        zIndex: ye
      };
    },
    unregister: (N) => {
      s.delete(N), o.delete(N), r.delete(N), l.delete(N), a.delete(N), i.value = i.value.filter(($) => $ !== N);
    },
    mainRect: g,
    mainStyles: h,
    getLayoutItem: C,
    items: w,
    layoutRect: u,
    rootZIndex: n
  });
  const M = y(() => ["v-layout", {
    "v-layout--full-height": e.fullHeight
  }]), x = y(() => ({
    zIndex: t ? n.value : void 0,
    position: t ? "relative" : void 0,
    overflow: t ? "hidden" : void 0
  }));
  return {
    layoutClasses: M,
    layoutStyles: x,
    getLayoutItem: C,
    items: w,
    layoutRect: u,
    layoutRef: d
  };
}
function Td() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const {
    blueprint: t,
    ...n
  } = e, i = kt(t, n), {
    aliases: o = {},
    components: r = {},
    directives: s = {}
  } = i, l = Lh(i.defaults), a = Rp(i.display, i.ssr), d = Xp(i.theme), u = Yp(i.icons), c = qh(i.locale), m = Fp(i.date, c), v = Up(i.goTo, c);
  return {
    install: (h) => {
      for (const w in s)
        h.directive(w, s[w]);
      for (const w in r)
        h.component(w, r[w]);
      for (const w in o)
        h.component(w, Pi({
          ...o[w],
          name: w,
          aliasName: o[w].name
        }));
      if (d.install(h), h.provide(xi, l), h.provide(Ps, a), h.provide(lo, d), h.provide(As, u), h.provide(ur, c), h.provide(Mp, m.options), h.provide(eu, m.instance), h.provide(jp, v), Be && i.ssr)
        if (h.$nuxt)
          h.$nuxt.hook("app:suspense:resolve", () => {
            a.update();
          });
        else {
          const {
            mount: w
          } = h;
          h.mount = function() {
            const C = w(...arguments);
            return At(() => a.update()), h.mount = w, C;
          };
        }
      Fn.reset(), h.mixin({
        computed: {
          $vuetify() {
            return et({
              defaults: vi.call(this, xi),
              display: vi.call(this, Ps),
              theme: vi.call(this, lo),
              icons: vi.call(this, As),
              locale: vi.call(this, ur),
              date: vi.call(this, eu)
            });
          }
        }
      });
    },
    defaults: l,
    display: a,
    theme: d,
    icons: u,
    locale: c,
    date: m,
    goTo: v
  };
}
const ny = "3.7.4";
Td.version = ny;
function vi(e) {
  var i, o;
  const t = this.$, n = ((i = t.parent) == null ? void 0 : i.provides) ?? ((o = t.vnode.appContext) == null ? void 0 : o.provides);
  if (n && e in n)
    return n[e];
}
const iy = Td({
  theme: {
    defaultTheme: "light"
  }
}), oy = {
  install: (e, t) => {
    const n = t.server;
    e.config.globalProperties.$alert = function(i, o, r) {
      e.$store.commit("alert", { type: i, msg: o, to: r }), i === "success" && setTimeout(() => {
        e.$store.commit("close_alert");
      }, 1300);
    }, e.config.globalProperties.$backend = async function(i, o) {
      if (i === void 0)
        throw "url is undefined ";
      var r = {
        mode: "cors",
        redirect: "follow",
        credentials: "include"
      }, s = n + i;
      return o !== void 0 && Object.assign(r, o), fetch(s, r).then((l) => {
        var a = "";
        if (l.status === 413)
          throw a = "服务器响应了413异常状态码。<br/>可能是上传的文件过大，超过了服务器设置的上传大小。", e.$alert("error", a), a;
        if (l.status === 502)
          throw a = "服务器正在启动中...", e.$alert("info", a), a;
        if (l.status !== 200)
          throw a = "服务器异常，状态码: " + l.status + "<br/>请查阅服务器日志:<br/>talebook.log", e.$alert("error", a), a;
        try {
          return l.json();
        } catch {
          throw a = "服务器异常，响应非JSON<br/>请查阅服务器日志:<br/>talebook.log", e.$alert("error", a), a;
        }
      }).then((l) => (l.err === "exception" && e.$store.commit("alert", { type: "error", msg: l.msg, to: null }), l));
    };
  }
};
function ry(e, t) {
  e.use(iy).use(oy, t);
}
const ci = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [i, o] of t)
    n[i] = o;
  return n;
}, sy = W({
  defaults: Object,
  disabled: Boolean,
  reset: [Number, String],
  root: [Boolean, String],
  scoped: Boolean
}, "VDefaultsProvider"), it = se(!1)({
  name: "VDefaultsProvider",
  props: sy(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      defaults: i,
      disabled: o,
      reset: r,
      root: s,
      scoped: l
    } = Zs(e);
    return Ti(i, {
      reset: r,
      root: s,
      scoped: l,
      disabled: o
    }), () => {
      var a;
      return (a = n.default) == null ? void 0 : a.call(n);
    };
  }
});
function _l(e) {
  return vl(() => {
    const t = [], n = {};
    if (e.value.background)
      if (Ds(e.value.background)) {
        if (n.backgroundColor = e.value.background, !e.value.text && Oh(e.value.background)) {
          const i = Jt(e.value.background);
          if (i.a == null || i.a === 1) {
            const o = gd(i);
            n.color = o, n.caretColor = o;
          }
        }
      } else
        t.push(`bg-${e.value.background}`);
    return e.value.text && (Ds(e.value.text) ? (n.color = e.value.text, n.caretColor = e.value.text) : t.push(`text-${e.value.text}`)), {
      colorClasses: t,
      colorStyles: n
    };
  });
}
function Ht(e, t) {
  const n = y(() => ({
    text: Ae(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: i,
    colorStyles: o
  } = _l(n);
  return {
    textColorClasses: i,
    textColorStyles: o
  };
}
function Dt(e, t) {
  const n = y(() => ({
    background: Ae(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: i,
    colorStyles: o
  } = _l(n);
  return {
    backgroundColorClasses: i,
    backgroundColorStyles: o
  };
}
const ly = ["x-small", "small", "default", "large", "x-large"], Ir = W({
  size: {
    type: [String, Number],
    default: "default"
  }
}, "size");
function $r(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt();
  return vl(() => {
    let n, i;
    return or(ly, e.size) ? n = `${t}--size-${e.size}` : e.size && (i = {
      width: oe(e.size),
      height: oe(e.size)
    }), {
      sizeClasses: n,
      sizeStyles: i
    };
  });
}
const je = W({
  tag: {
    type: String,
    default: "div"
  }
}, "tag"), ay = W({
  color: String,
  disabled: Boolean,
  start: Boolean,
  end: Boolean,
  icon: He,
  ...pe(),
  ...Ir(),
  ...je({
    tag: "i"
  }),
  ...Xe()
}, "VIcon"), We = se()({
  name: "VIcon",
  props: ay(),
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const o = ue(), {
      themeClasses: r
    } = lt(e), {
      iconData: s
    } = qp(y(() => o.value || e.icon)), {
      sizeClasses: l
    } = $r(e), {
      textColorClasses: a,
      textColorStyles: d
    } = Ht(ie(e, "color"));
    return ge(() => {
      var m, v;
      const u = (m = i.default) == null ? void 0 : m.call(i);
      u && (o.value = (v = rd(u).filter((g) => g.type === ui && g.children && typeof g.children == "string")[0]) == null ? void 0 : v.children);
      const c = !!(n.onClick || n.onClickOnce);
      return f(s.value.component, {
        tag: e.tag,
        icon: s.value.icon,
        class: ["v-icon", "notranslate", r.value, l.value, a.value, {
          "v-icon--clickable": c,
          "v-icon--disabled": e.disabled,
          "v-icon--start": e.start,
          "v-icon--end": e.end
        }, e.class],
        style: [l.value ? void 0 : {
          fontSize: oe(e.size),
          height: oe(e.size),
          width: oe(e.size)
        }, d.value, e.style],
        role: c ? "button" : void 0,
        "aria-hidden": !c,
        tabindex: c ? e.disabled ? -1 : 0 : void 0
      }, {
        default: () => [u]
      });
    }), {};
  }
}), bn = W({
  height: [Number, String],
  maxHeight: [Number, String],
  maxWidth: [Number, String],
  minHeight: [Number, String],
  minWidth: [Number, String],
  width: [Number, String]
}, "dimension");
function _n(e) {
  return {
    dimensionStyles: y(() => {
      const n = {}, i = oe(e.height), o = oe(e.maxHeight), r = oe(e.maxWidth), s = oe(e.minHeight), l = oe(e.minWidth), a = oe(e.width);
      return i != null && (n.height = i), o != null && (n.maxHeight = o), r != null && (n.maxWidth = r), s != null && (n.minHeight = s), l != null && (n.minWidth = l), a != null && (n.width = a), n;
    })
  };
}
function uy(e) {
  return {
    aspectStyles: y(() => {
      const t = Number(e.aspectRatio);
      return t ? {
        paddingBottom: String(1 / t * 100) + "%"
      } : void 0;
    })
  };
}
const Pd = W({
  aspectRatio: [String, Number],
  contentClass: null,
  inline: Boolean,
  ...pe(),
  ...bn()
}, "VResponsive"), uu = se()({
  name: "VResponsive",
  props: Pd(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      aspectStyles: i
    } = uy(e), {
      dimensionStyles: o
    } = _n(e);
    return ge(() => {
      var r;
      return f("div", {
        class: ["v-responsive", {
          "v-responsive--inline": e.inline
        }, e.class],
        style: [o.value, e.style]
      }, [f("div", {
        class: "v-responsive__sizer",
        style: i.value
      }, null), (r = n.additional) == null ? void 0 : r.call(n), n.default && f("div", {
        class: ["v-responsive__content", e.contentClass]
      }, [n.default()])]);
    }), {};
  }
}), bt = W({
  rounded: {
    type: [Boolean, Number, String],
    default: void 0
  },
  tile: Boolean
}, "rounded");
function _t(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt();
  return {
    roundedClasses: y(() => {
      const i = Ae(e) ? e.value : e.rounded, o = Ae(e) ? e.value : e.tile, r = [];
      if (i === !0 || i === "")
        r.push(`${t}--rounded`);
      else if (typeof i == "string" || i === 0)
        for (const s of String(i).split(" "))
          r.push(`rounded-${s}`);
      else (o || i === !1) && r.push("rounded-0");
      return r;
    })
  };
}
const bo = W({
  transition: {
    type: [Boolean, String, Object],
    default: "fade-transition",
    validator: (e) => e !== !0
  }
}, "transition"), cn = (e, t) => {
  let {
    slots: n
  } = t;
  const {
    transition: i,
    disabled: o,
    group: r,
    ...s
  } = e, {
    component: l = r ? cl : li,
    ...a
  } = typeof i == "object" ? i : {};
  return $n(l, Ee(typeof i == "string" ? {
    name: o ? "" : i
  } : a, typeof i == "string" ? {} : Object.fromEntries(Object.entries({
    disabled: o,
    group: r
  }).filter((d) => {
    let [u, c] = d;
    return c !== void 0;
  })), s), n);
};
function cy(e, t) {
  if (!dl) return;
  const n = t.modifiers || {}, i = t.value, {
    handler: o,
    options: r
  } = typeof i == "object" ? i : {
    handler: i,
    options: {}
  }, s = new IntersectionObserver(function() {
    var c;
    let l = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], a = arguments.length > 1 ? arguments[1] : void 0;
    const d = (c = e._observe) == null ? void 0 : c[t.instance.$.uid];
    if (!d) return;
    const u = l.some((m) => m.isIntersecting);
    o && (!n.quiet || d.init) && (!n.once || u || d.init) && o(u, l, a), u && n.once ? Ad(e, t) : d.init = !0;
  }, r);
  e._observe = Object(e._observe), e._observe[t.instance.$.uid] = {
    init: !1,
    observer: s
  }, s.observe(e);
}
function Ad(e, t) {
  var i;
  const n = (i = e._observe) == null ? void 0 : i[t.instance.$.uid];
  n && (n.observer.unobserve(e), delete e._observe[t.instance.$.uid]);
}
const Id = {
  mounted: cy,
  unmounted: Ad
}, dy = W({
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
  ...Pd(),
  ...pe(),
  ...bt(),
  ...bo()
}, "VImg"), wl = se()({
  name: "VImg",
  directives: {
    intersect: Id
  },
  props: dy(),
  emits: {
    loadstart: (e) => !0,
    load: (e) => !0,
    error: (e) => !0
  },
  setup(e, t) {
    let {
      emit: n,
      slots: i
    } = t;
    const {
      backgroundColorClasses: o,
      backgroundColorStyles: r
    } = Dt(ie(e, "color")), {
      roundedClasses: s
    } = _t(e), l = ze("VImg"), a = he(""), d = ue(), u = he(e.eager ? "loading" : "idle"), c = he(), m = he(), v = y(() => e.src && typeof e.src == "object" ? {
      src: e.src.src,
      srcset: e.srcset || e.src.srcset,
      lazySrc: e.lazySrc || e.src.lazySrc,
      aspect: Number(e.aspectRatio || e.src.aspect || 0)
    } : {
      src: e.src,
      srcset: e.srcset,
      lazySrc: e.lazySrc,
      aspect: Number(e.aspectRatio || 0)
    }), g = y(() => v.value.aspect || c.value / m.value || 0);
    ve(() => e.src, () => {
      h(u.value !== "idle");
    }), ve(g, (S, T) => {
      !S && T && d.value && M(d.value);
    }), tl(() => h());
    function h(S) {
      if (!(e.eager && S) && !(dl && !S && !e.eager)) {
        if (u.value = "loading", v.value.lazySrc) {
          const T = new Image();
          T.src = v.value.lazySrc, M(T, null);
        }
        v.value.src && At(() => {
          var T;
          n("loadstart", ((T = d.value) == null ? void 0 : T.currentSrc) || v.value.src), setTimeout(() => {
            var B;
            if (!l.isUnmounted)
              if ((B = d.value) != null && B.complete) {
                if (d.value.naturalWidth || C(), u.value === "error") return;
                g.value || M(d.value, null), u.value === "loading" && w();
              } else
                g.value || M(d.value), O();
          });
        });
      }
    }
    function w() {
      var S;
      l.isUnmounted || (O(), M(d.value), u.value = "loaded", n("load", ((S = d.value) == null ? void 0 : S.currentSrc) || v.value.src));
    }
    function C() {
      var S;
      l.isUnmounted || (u.value = "error", n("error", ((S = d.value) == null ? void 0 : S.currentSrc) || v.value.src));
    }
    function O() {
      const S = d.value;
      S && (a.value = S.currentSrc || S.src);
    }
    let P = -1;
    yt(() => {
      clearTimeout(P);
    });
    function M(S) {
      let T = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 100;
      const B = () => {
        if (clearTimeout(P), l.isUnmounted) return;
        const {
          naturalHeight: Z,
          naturalWidth: Q
        } = S;
        Z || Q ? (c.value = Q, m.value = Z) : !S.complete && u.value === "loading" && T != null ? P = window.setTimeout(B, T) : (S.currentSrc.endsWith(".svg") || S.currentSrc.startsWith("data:image/svg+xml")) && (c.value = 1, m.value = 1);
      };
      B();
    }
    const x = y(() => ({
      "v-img__img--cover": e.cover,
      "v-img__img--contain": !e.cover
    })), N = () => {
      var B;
      if (!v.value.src || u.value === "idle") return null;
      const S = f("img", {
        class: ["v-img__img", x.value],
        style: {
          objectPosition: e.position
        },
        src: v.value.src,
        srcset: v.value.srcset,
        alt: e.alt,
        crossorigin: e.crossorigin,
        referrerpolicy: e.referrerpolicy,
        draggable: e.draggable,
        sizes: e.sizes,
        ref: d,
        onLoad: w,
        onError: C
      }, null), T = (B = i.sources) == null ? void 0 : B.call(i);
      return f(cn, {
        transition: e.transition,
        appear: !0
      }, {
        default: () => [Nt(T ? f("picture", {
          class: "v-img__picture"
        }, [T, S]) : S, [[Mn, u.value === "loaded"]])]
      });
    }, $ = () => f(cn, {
      transition: e.transition
    }, {
      default: () => [v.value.lazySrc && u.value !== "loaded" && f("img", {
        class: ["v-img__img", "v-img__img--preload", x.value],
        style: {
          objectPosition: e.position
        },
        src: v.value.lazySrc,
        alt: e.alt,
        crossorigin: e.crossorigin,
        referrerpolicy: e.referrerpolicy,
        draggable: e.draggable
      }, null)]
    }), E = () => i.placeholder ? f(cn, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [(u.value === "loading" || u.value === "error" && !i.error) && f("div", {
        class: "v-img__placeholder"
      }, [i.placeholder()])]
    }) : null, V = () => i.error ? f(cn, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [u.value === "error" && f("div", {
        class: "v-img__error"
      }, [i.error()])]
    }) : null, L = () => e.gradient ? f("div", {
      class: "v-img__gradient",
      style: {
        backgroundImage: `linear-gradient(${e.gradient})`
      }
    }, null) : null, A = he(!1);
    {
      const S = ve(g, (T) => {
        T && (requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            A.value = !0;
          });
        }), S());
      });
    }
    return ge(() => {
      const S = uu.filterProps(e);
      return Nt(f(uu, Ee({
        class: ["v-img", {
          "v-img--absolute": e.absolute,
          "v-img--booting": !A.value
        }, o.value, s.value, e.class],
        style: [{
          width: oe(e.width === "auto" ? c.value : e.width)
        }, r.value, e.style]
      }, S, {
        aspectRatio: g.value,
        "aria-label": e.alt,
        role: e.alt ? "img" : void 0
      }), {
        additional: () => f(Ce, null, [f(N, null, null), f($, null, null), f(L, null, null), f(E, null, null), f(V, null, null)]),
        default: i.default
      }), [[Di("intersect"), {
        handler: h,
        options: e.options
      }, null, {
        once: !0
      }]]);
    }), {
      currentSrc: a,
      image: d,
      state: u,
      naturalWidth: c,
      naturalHeight: m
    };
  }
}), Ln = W({
  border: [Boolean, Number, String]
}, "border");
function Bn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt();
  return {
    borderClasses: y(() => {
      const i = Ae(e) ? e.value : e.border, o = [];
      if (i === !0 || i === "")
        o.push(`${t}--border`);
      else if (typeof i == "string" || i === 0)
        for (const r of String(i).split(" "))
          o.push(`border-${r}`);
      return o;
    })
  };
}
const fy = [null, "default", "comfortable", "compact"], tn = W({
  density: {
    type: String,
    default: "default",
    validator: (e) => fy.includes(e)
  }
}, "density");
function wn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt();
  return {
    densityClasses: y(() => `${t}--density-${e.density}`)
  };
}
const my = ["elevated", "flat", "tonal", "outlined", "text", "plain"];
function _o(e, t) {
  return f(Ce, null, [e && f("span", {
    key: "overlay",
    class: `${t}__overlay`
  }, null), f("span", {
    key: "underlay",
    class: `${t}__underlay`
  }, null)]);
}
const di = W({
  color: String,
  variant: {
    type: String,
    default: "elevated",
    validator: (e) => my.includes(e)
  }
}, "variant");
function wo(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt();
  const n = y(() => {
    const {
      variant: r
    } = Xt(e);
    return `${t}--variant-${r}`;
  }), {
    colorClasses: i,
    colorStyles: o
  } = _l(y(() => {
    const {
      variant: r,
      color: s
    } = Xt(e);
    return {
      [["elevated", "flat"].includes(r) ? "background" : "text"]: s
    };
  }));
  return {
    colorClasses: i,
    colorStyles: o,
    variantClasses: n
  };
}
const vy = W({
  start: Boolean,
  end: Boolean,
  icon: He,
  image: String,
  text: String,
  ...Ln(),
  ...pe(),
  ...tn(),
  ...bt(),
  ...Ir(),
  ...je(),
  ...Xe(),
  ...di({
    variant: "flat"
  })
}, "VAvatar"), Vi = se()({
  name: "VAvatar",
  props: vy(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: i
    } = lt(e), {
      borderClasses: o
    } = Bn(e), {
      colorClasses: r,
      colorStyles: s,
      variantClasses: l
    } = wo(e), {
      densityClasses: a
    } = wn(e), {
      roundedClasses: d
    } = _t(e), {
      sizeClasses: u,
      sizeStyles: c
    } = $r(e);
    return ge(() => f(e.tag, {
      class: ["v-avatar", {
        "v-avatar--start": e.start,
        "v-avatar--end": e.end
      }, i.value, o.value, r.value, a.value, d.value, u.value, l.value, e.class],
      style: [s.value, c.value, e.style]
    }, {
      default: () => [n.default ? f(it, {
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
      }) : e.image ? f(wl, {
        key: "image",
        src: e.image,
        alt: "",
        cover: !0
      }, null) : e.icon ? f(We, {
        key: "icon",
        icon: e.icon
      }, null) : e.text, _o(!1, "v-avatar")]
    })), {};
  }
}), Sn = W({
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
function En(e) {
  return {
    elevationClasses: y(() => {
      const n = Ae(e) ? e.value : e.elevation, i = [];
      return n == null || i.push(`elevation-${n}`), i;
    })
  };
}
const $d = W({
  baseColor: String,
  divided: Boolean,
  ...Ln(),
  ...pe(),
  ...tn(),
  ...Sn(),
  ...bt(),
  ...je(),
  ...Xe(),
  ...di()
}, "VBtnGroup"), bi = se()({
  name: "VBtnGroup",
  props: $d(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: i
    } = lt(e), {
      densityClasses: o
    } = wn(e), {
      borderClasses: r
    } = Bn(e), {
      elevationClasses: s
    } = En(e), {
      roundedClasses: l
    } = _t(e);
    Ti({
      VBtn: {
        height: "auto",
        baseColor: ie(e, "baseColor"),
        color: ie(e, "color"),
        density: ie(e, "density"),
        flat: !0,
        variant: ie(e, "variant")
      }
    }), ge(() => f(e.tag, {
      class: ["v-btn-group", {
        "v-btn-group--divided": e.divided
      }, i.value, r.value, o.value, s.value, l.value, e.class],
      style: e.style
    }, n));
  }
}), Md = W({
  modelValue: {
    type: null,
    default: void 0
  },
  multiple: Boolean,
  mandatory: [Boolean, String],
  max: Number,
  selectedClass: String,
  disabled: Boolean
}, "group"), gy = W({
  value: null,
  disabled: Boolean,
  selectedClass: String
}, "group-item");
function hy(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0;
  const i = ze("useGroupItem");
  if (!i)
    throw new Error("[Vuetify] useGroupItem composable must be used inside a component setup function");
  const o = Fn();
  gt(Symbol.for(`${t.description}:id`), o);
  const r = Re(t, null);
  if (!r) {
    if (!n) return r;
    throw new Error(`[Vuetify] Could not find useGroup injection with symbol ${t.description}`);
  }
  const s = ie(e, "value"), l = y(() => !!(r.disabled.value || e.disabled));
  r.register({
    id: o,
    value: s,
    disabled: l
  }, i), yt(() => {
    r.unregister(o);
  });
  const a = y(() => r.isSelected(o)), d = y(() => r.items.value[0].id === o), u = y(() => r.items.value[r.items.value.length - 1].id === o), c = y(() => a.value && [r.selectedClass.value, e.selectedClass]);
  return ve(a, (m) => {
    i.emit("group:selected", {
      value: m
    });
  }, {
    flush: "sync"
  }), {
    id: o,
    isSelected: a,
    isFirst: d,
    isLast: u,
    toggle: () => r.select(o, !a.value),
    select: (m) => r.select(o, m),
    selectedClass: c,
    value: s,
    disabled: l,
    group: r
  };
}
function Fd(e, t) {
  let n = !1;
  const i = et([]), o = nt(e, "modelValue", [], (m) => m == null ? [] : Ld(i, ti(m)), (m) => {
    const v = yy(i, m);
    return e.multiple ? v : v[0];
  }), r = ze("useGroup");
  function s(m, v) {
    const g = m, h = Symbol.for(`${t.description}:id`), C = pi(h, r == null ? void 0 : r.vnode).indexOf(v);
    Xt(g.value) == null && (g.value = C, g.useIndexAsValue = !0), C > -1 ? i.splice(C, 0, g) : i.push(g);
  }
  function l(m) {
    if (n) return;
    a();
    const v = i.findIndex((g) => g.id === m);
    i.splice(v, 1);
  }
  function a() {
    const m = i.find((v) => !v.disabled);
    m && e.mandatory === "force" && !o.value.length && (o.value = [m.id]);
  }
  In(() => {
    a();
  }), yt(() => {
    n = !0;
  }), nl(() => {
    for (let m = 0; m < i.length; m++)
      i[m].useIndexAsValue && (i[m].value = m);
  });
  function d(m, v) {
    const g = i.find((h) => h.id === m);
    if (!(v && (g != null && g.disabled)))
      if (e.multiple) {
        const h = o.value.slice(), w = h.findIndex((O) => O === m), C = ~w;
        if (v = v ?? !C, C && e.mandatory && h.length <= 1 || !C && e.max != null && h.length + 1 > e.max) return;
        w < 0 && v ? h.push(m) : w >= 0 && !v && h.splice(w, 1), o.value = h;
      } else {
        const h = o.value.includes(m);
        if (e.mandatory && h) return;
        o.value = v ?? !h ? [m] : [];
      }
  }
  function u(m) {
    if (e.multiple && dn('This method is not supported when using "multiple" prop'), o.value.length) {
      const v = o.value[0], g = i.findIndex((C) => C.id === v);
      let h = (g + m) % i.length, w = i[h];
      for (; w.disabled && h !== g; )
        h = (h + m) % i.length, w = i[h];
      if (w.disabled) return;
      o.value = [i[h].id];
    } else {
      const v = i.find((g) => !g.disabled);
      v && (o.value = [v.id]);
    }
  }
  const c = {
    register: s,
    unregister: l,
    selected: o,
    select: d,
    disabled: ie(e, "disabled"),
    prev: () => u(i.length - 1),
    next: () => u(1),
    isSelected: (m) => o.value.includes(m),
    selectedClass: y(() => e.selectedClass),
    items: y(() => i),
    getItemIndex: (m) => py(i, m)
  };
  return gt(t, c), c;
}
function py(e, t) {
  const n = Ld(e, [t]);
  return n.length ? e.findIndex((i) => i.id === n[0]) : -1;
}
function Ld(e, t) {
  const n = [];
  return t.forEach((i) => {
    const o = e.find((s) => Or(i, s.value)), r = e[i];
    (o == null ? void 0 : o.value) != null ? n.push(o.id) : r != null && n.push(r.id);
  }), n;
}
function yy(e, t) {
  const n = [];
  return t.forEach((i) => {
    const o = e.findIndex((r) => r.id === i);
    if (~o) {
      const r = e[o];
      n.push(r.value != null ? r.value : o);
    }
  }), n;
}
const Sl = Symbol.for("vuetify:v-btn-toggle"), by = W({
  ...$d(),
  ...Md()
}, "VBtnToggle");
se()({
  name: "VBtnToggle",
  props: by(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isSelected: i,
      next: o,
      prev: r,
      select: s,
      selected: l
    } = Fd(e, Sl);
    return ge(() => {
      const a = bi.filterProps(e);
      return f(bi, Ee({
        class: ["v-btn-toggle", e.class]
      }, a, {
        style: e.style
      }), {
        default: () => {
          var d;
          return [(d = n.default) == null ? void 0 : d.call(n, {
            isSelected: i,
            next: o,
            prev: r,
            select: s,
            selected: l
          })];
        }
      });
    }), {
      next: o,
      prev: r,
      select: s
    };
  }
});
function Bd(e, t) {
  const n = ue(), i = he(!1);
  if (dl) {
    const o = new IntersectionObserver((r) => {
      i.value = !!r.find((s) => s.isIntersecting);
    }, t);
    yt(() => {
      o.disconnect();
    }), ve(n, (r, s) => {
      s && (o.unobserve(s), i.value = !1), r && o.observe(r);
    }, {
      flush: "post"
    });
  }
  return {
    intersectionRef: n,
    isIntersecting: i
  };
}
const _y = W({
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
  ...pe(),
  ...Ir(),
  ...je({
    tag: "div"
  }),
  ...Xe()
}, "VProgressCircular"), Rd = se()({
  name: "VProgressCircular",
  props: _y(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = 20, o = 2 * Math.PI * i, r = ue(), {
      themeClasses: s
    } = lt(e), {
      sizeClasses: l,
      sizeStyles: a
    } = $r(e), {
      textColorClasses: d,
      textColorStyles: u
    } = Ht(ie(e, "color")), {
      textColorClasses: c,
      textColorStyles: m
    } = Ht(ie(e, "bgColor")), {
      intersectionRef: v,
      isIntersecting: g
    } = Bd(), {
      resizeRef: h,
      contentRect: w
    } = xd(), C = y(() => Math.max(0, Math.min(100, parseFloat(e.modelValue)))), O = y(() => Number(e.width)), P = y(() => a.value ? Number(e.size) : w.value ? w.value.width : Math.max(O.value, 32)), M = y(() => i / (1 - O.value / P.value) * 2), x = y(() => O.value / P.value * M.value), N = y(() => oe((100 - C.value) / 100 * o));
    return yn(() => {
      v.value = r.value, h.value = r.value;
    }), ge(() => f(e.tag, {
      ref: r,
      class: ["v-progress-circular", {
        "v-progress-circular--indeterminate": !!e.indeterminate,
        "v-progress-circular--visible": g.value,
        "v-progress-circular--disable-shrink": e.indeterminate === "disable-shrink"
      }, s.value, l.value, d.value, e.class],
      style: [a.value, u.value, e.style],
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": e.indeterminate ? void 0 : C.value
    }, {
      default: () => [f("svg", {
        style: {
          transform: `rotate(calc(-90deg + ${Number(e.rotate)}deg))`
        },
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${M.value} ${M.value}`
      }, [f("circle", {
        class: ["v-progress-circular__underlay", c.value],
        style: m.value,
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: i,
        "stroke-width": x.value,
        "stroke-dasharray": o,
        "stroke-dashoffset": 0
      }, null), f("circle", {
        class: "v-progress-circular__overlay",
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: i,
        "stroke-width": x.value,
        "stroke-dasharray": o,
        "stroke-dashoffset": N.value
      }, null)]), n.default && f("div", {
        class: "v-progress-circular__content"
      }, [n.default({
        value: C.value
      })])]
    })), {};
  }
}), cu = {
  center: "center",
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
}, So = W({
  location: String
}, "location");
function Eo(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, n = arguments.length > 2 ? arguments[2] : void 0;
  const {
    isRtl: i
  } = en();
  return {
    locationStyles: y(() => {
      if (!e.location) return {};
      const {
        side: r,
        align: s
      } = Os(e.location.split(" ").length > 1 ? e.location : `${e.location} center`, i.value);
      function l(d) {
        return n ? n(d) : 0;
      }
      const a = {};
      return r !== "center" && (t ? a[cu[r]] = `calc(100% - ${l(r)}px)` : a[r] = 0), s !== "center" ? t ? a[cu[s]] = `calc(100% - ${l(s)}px)` : a[s] = 0 : (r === "center" ? a.top = a.left = "50%" : a[{
        top: "left",
        bottom: "left",
        left: "top",
        right: "top"
      }[r]] = "50%", a.transform = {
        top: "translateX(-50%)",
        bottom: "translateX(-50%)",
        left: "translateY(-50%)",
        right: "translateY(-50%)",
        center: "translate(-50%, -50%)"
      }[r]), a;
    })
  };
}
const wy = W({
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
  ...pe(),
  ...So({
    location: "top"
  }),
  ...bt(),
  ...je(),
  ...Xe()
}, "VProgressLinear"), Sy = se()({
  name: "VProgressLinear",
  props: wy(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    var A;
    let {
      slots: n
    } = t;
    const i = nt(e, "modelValue"), {
      isRtl: o,
      rtlClasses: r
    } = en(), {
      themeClasses: s
    } = lt(e), {
      locationStyles: l
    } = Eo(e), {
      textColorClasses: a,
      textColorStyles: d
    } = Ht(e, "color"), {
      backgroundColorClasses: u,
      backgroundColorStyles: c
    } = Dt(y(() => e.bgColor || e.color)), {
      backgroundColorClasses: m,
      backgroundColorStyles: v
    } = Dt(y(() => e.bufferColor || e.bgColor || e.color)), {
      backgroundColorClasses: g,
      backgroundColorStyles: h
    } = Dt(e, "color"), {
      roundedClasses: w
    } = _t(e), {
      intersectionRef: C,
      isIntersecting: O
    } = Bd(), P = y(() => parseFloat(e.max)), M = y(() => parseFloat(e.height)), x = y(() => Pn(parseFloat(e.bufferValue) / P.value * 100, 0, 100)), N = y(() => Pn(parseFloat(i.value) / P.value * 100, 0, 100)), $ = y(() => o.value !== e.reverse), E = y(() => e.indeterminate ? "fade-transition" : "slide-x-transition"), V = Be && ((A = window.matchMedia) == null ? void 0 : A.call(window, "(forced-colors: active)").matches);
    function L(S) {
      if (!C.value) return;
      const {
        left: T,
        right: B,
        width: Z
      } = C.value.getBoundingClientRect(), Q = $.value ? Z - S.clientX + (B - Z) : S.clientX - T;
      i.value = Math.round(Q / Z * P.value);
    }
    return ge(() => f(e.tag, {
      ref: C,
      class: ["v-progress-linear", {
        "v-progress-linear--absolute": e.absolute,
        "v-progress-linear--active": e.active && O.value,
        "v-progress-linear--reverse": $.value,
        "v-progress-linear--rounded": e.rounded,
        "v-progress-linear--rounded-bar": e.roundedBar,
        "v-progress-linear--striped": e.striped
      }, w.value, s.value, r.value, e.class],
      style: [{
        bottom: e.location === "bottom" ? 0 : void 0,
        top: e.location === "top" ? 0 : void 0,
        height: e.active ? oe(M.value) : 0,
        "--v-progress-linear-height": oe(M.value),
        ...e.absolute ? l.value : {}
      }, e.style],
      role: "progressbar",
      "aria-hidden": e.active ? "false" : "true",
      "aria-valuemin": "0",
      "aria-valuemax": e.max,
      "aria-valuenow": e.indeterminate ? void 0 : N.value,
      onClick: e.clickable && L
    }, {
      default: () => [e.stream && f("div", {
        key: "stream",
        class: ["v-progress-linear__stream", a.value],
        style: {
          ...d.value,
          [$.value ? "left" : "right"]: oe(-M.value),
          borderTop: `${oe(M.value / 2)} dotted`,
          opacity: parseFloat(e.bufferOpacity),
          top: `calc(50% - ${oe(M.value / 4)})`,
          width: oe(100 - x.value, "%"),
          "--v-progress-linear-stream-to": oe(M.value * ($.value ? 1 : -1))
        }
      }, null), f("div", {
        class: ["v-progress-linear__background", V ? void 0 : u.value],
        style: [c.value, {
          opacity: parseFloat(e.bgOpacity),
          width: e.stream ? 0 : void 0
        }]
      }, null), f("div", {
        class: ["v-progress-linear__buffer", V ? void 0 : m.value],
        style: [v.value, {
          opacity: parseFloat(e.bufferOpacity),
          width: oe(x.value, "%")
        }]
      }, null), f(li, {
        name: E.value
      }, {
        default: () => [e.indeterminate ? f("div", {
          class: "v-progress-linear__indeterminate"
        }, [["long", "short"].map((S) => f("div", {
          key: S,
          class: ["v-progress-linear__indeterminate", S, V ? void 0 : g.value],
          style: h.value
        }, null))]) : f("div", {
          class: ["v-progress-linear__determinate", V ? void 0 : g.value],
          style: [h.value, {
            width: oe(N.value, "%")
          }]
        }, null)]
      }), n.default && f("div", {
        class: "v-progress-linear__content"
      }, [n.default({
        value: N.value,
        buffer: x.value
      })])]
    })), {};
  }
}), El = W({
  loading: [Boolean, String]
}, "loader");
function Cl(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt();
  return {
    loaderClasses: y(() => ({
      [`${t}--loading`]: e.loading
    }))
  };
}
function Hd(e, t) {
  var i;
  let {
    slots: n
  } = t;
  return f("div", {
    class: `${e.name}__loader`
  }, [((i = n.default) == null ? void 0 : i.call(n, {
    color: e.color,
    isActive: e.active
  })) || f(Sy, {
    absolute: e.absolute,
    active: e.active,
    color: e.color,
    height: "2",
    indeterminate: !0
  }, null)]);
}
const Ey = ["static", "relative", "fixed", "absolute", "sticky"], kl = W({
  position: {
    type: String,
    validator: (
      /* istanbul ignore next */
      (e) => Ey.includes(e)
    )
  }
}, "position");
function Nl(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt();
  return {
    positionClasses: y(() => e.position ? `${t}--${e.position}` : void 0)
  };
}
function Cy() {
  const e = ze("useRoute");
  return y(() => {
    var t;
    return (t = e == null ? void 0 : e.proxy) == null ? void 0 : t.$route;
  });
}
function ky() {
  var e, t;
  return (t = (e = ze("useRouter")) == null ? void 0 : e.proxy) == null ? void 0 : t.$router;
}
function xl(e, t) {
  var c, m;
  const n = vv("RouterLink"), i = y(() => !!(e.href || e.to)), o = y(() => (i == null ? void 0 : i.value) || $a(t, "click") || $a(e, "click"));
  if (typeof n == "string" || !("useLink" in n)) {
    const v = ie(e, "href");
    return {
      isLink: i,
      isClickable: o,
      href: v,
      linkProps: et({
        href: v
      })
    };
  }
  const r = y(() => ({
    ...e,
    to: ie(() => e.to || "")
  })), s = n.useLink(r.value), l = y(() => e.to ? s : void 0), a = Cy(), d = y(() => {
    var v, g, h;
    return l.value ? e.exact ? a.value ? ((h = l.value.isExactActive) == null ? void 0 : h.value) && Or(l.value.route.value.query, a.value.query) : ((g = l.value.isExactActive) == null ? void 0 : g.value) ?? !1 : ((v = l.value.isActive) == null ? void 0 : v.value) ?? !1 : !1;
  }), u = y(() => {
    var v;
    return e.to ? (v = l.value) == null ? void 0 : v.route.value.href : e.href;
  });
  return {
    isLink: i,
    isClickable: o,
    isActive: d,
    route: (c = l.value) == null ? void 0 : c.route,
    navigate: (m = l.value) == null ? void 0 : m.navigate,
    href: u,
    linkProps: et({
      href: u,
      "aria-current": y(() => d.value ? "page" : void 0)
    })
  };
}
const Vl = W({
  href: String,
  replace: Boolean,
  to: [String, Object],
  exact: Boolean
}, "router");
let ns = !1;
function Ny(e, t) {
  let n = !1, i, o;
  Be && (At(() => {
    window.addEventListener("popstate", r), i = e == null ? void 0 : e.beforeEach((s, l, a) => {
      ns ? n ? t(a) : a() : setTimeout(() => n ? t(a) : a()), ns = !0;
    }), o = e == null ? void 0 : e.afterEach(() => {
      ns = !1;
    });
  }), jt(() => {
    window.removeEventListener("popstate", r), i == null || i(), o == null || o();
  }));
  function r(s) {
    var l;
    (l = s.state) != null && l.replaced || (n = !0, setTimeout(() => n = !1));
  }
}
function xy(e, t) {
  ve(() => {
    var n;
    return (n = e.isActive) == null ? void 0 : n.value;
  }, (n) => {
    e.isLink.value && n && t && At(() => {
      t(!0);
    });
  }, {
    immediate: !0
  });
}
const Is = Symbol("rippleStop"), Vy = 80;
function du(e, t) {
  e.style.transform = t, e.style.webkitTransform = t;
}
function $s(e) {
  return e.constructor.name === "TouchEvent";
}
function jd(e) {
  return e.constructor.name === "KeyboardEvent";
}
const Oy = function(e, t) {
  var c;
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, i = 0, o = 0;
  if (!jd(e)) {
    const m = t.getBoundingClientRect(), v = $s(e) ? e.touches[e.touches.length - 1] : e;
    i = v.clientX - m.left, o = v.clientY - m.top;
  }
  let r = 0, s = 0.3;
  (c = t._ripple) != null && c.circle ? (s = 0.15, r = t.clientWidth / 2, r = n.center ? r : r + Math.sqrt((i - r) ** 2 + (o - r) ** 2) / 4) : r = Math.sqrt(t.clientWidth ** 2 + t.clientHeight ** 2) / 2;
  const l = `${(t.clientWidth - r * 2) / 2}px`, a = `${(t.clientHeight - r * 2) / 2}px`, d = n.center ? l : `${i - r}px`, u = n.center ? a : `${o - r}px`;
  return {
    radius: r,
    scale: s,
    x: d,
    y: u,
    centerX: l,
    centerY: a
  };
}, fr = {
  /* eslint-disable max-statements */
  show(e, t) {
    var v;
    let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    if (!((v = t == null ? void 0 : t._ripple) != null && v.enabled))
      return;
    const i = document.createElement("span"), o = document.createElement("span");
    i.appendChild(o), i.className = "v-ripple__container", n.class && (i.className += ` ${n.class}`);
    const {
      radius: r,
      scale: s,
      x: l,
      y: a,
      centerX: d,
      centerY: u
    } = Oy(e, t, n), c = `${r * 2}px`;
    o.className = "v-ripple__animation", o.style.width = c, o.style.height = c, t.appendChild(i);
    const m = window.getComputedStyle(t);
    m && m.position === "static" && (t.style.position = "relative", t.dataset.previousPosition = "static"), o.classList.add("v-ripple__animation--enter"), o.classList.add("v-ripple__animation--visible"), du(o, `translate(${l}, ${a}) scale3d(${s},${s},${s})`), o.dataset.activated = String(performance.now()), setTimeout(() => {
      o.classList.remove("v-ripple__animation--enter"), o.classList.add("v-ripple__animation--in"), du(o, `translate(${d}, ${u}) scale3d(1,1,1)`);
    }, 0);
  },
  hide(e) {
    var r;
    if (!((r = e == null ? void 0 : e._ripple) != null && r.enabled)) return;
    const t = e.getElementsByClassName("v-ripple__animation");
    if (t.length === 0) return;
    const n = t[t.length - 1];
    if (n.dataset.isHiding) return;
    n.dataset.isHiding = "true";
    const i = performance.now() - Number(n.dataset.activated), o = Math.max(250 - i, 0);
    setTimeout(() => {
      n.classList.remove("v-ripple__animation--in"), n.classList.add("v-ripple__animation--out"), setTimeout(() => {
        var l;
        e.getElementsByClassName("v-ripple__animation").length === 1 && e.dataset.previousPosition && (e.style.position = e.dataset.previousPosition, delete e.dataset.previousPosition), ((l = n.parentNode) == null ? void 0 : l.parentNode) === e && e.removeChild(n.parentNode);
      }, 300);
    }, o);
  }
};
function zd(e) {
  return typeof e > "u" || !!e;
}
function ao(e) {
  const t = {}, n = e.currentTarget;
  if (!(!(n != null && n._ripple) || n._ripple.touched || e[Is])) {
    if (e[Is] = !0, $s(e))
      n._ripple.touched = !0, n._ripple.isTouch = !0;
    else if (n._ripple.isTouch) return;
    if (t.center = n._ripple.centered || jd(e), n._ripple.class && (t.class = n._ripple.class), $s(e)) {
      if (n._ripple.showTimerCommit) return;
      n._ripple.showTimerCommit = () => {
        fr.show(e, n, t);
      }, n._ripple.showTimer = window.setTimeout(() => {
        var i;
        (i = n == null ? void 0 : n._ripple) != null && i.showTimerCommit && (n._ripple.showTimerCommit(), n._ripple.showTimerCommit = null);
      }, Vy);
    } else
      fr.show(e, n, t);
  }
}
function fu(e) {
  e[Is] = !0;
}
function Et(e) {
  const t = e.currentTarget;
  if (t != null && t._ripple) {
    if (window.clearTimeout(t._ripple.showTimer), e.type === "touchend" && t._ripple.showTimerCommit) {
      t._ripple.showTimerCommit(), t._ripple.showTimerCommit = null, t._ripple.showTimer = window.setTimeout(() => {
        Et(e);
      });
      return;
    }
    window.setTimeout(() => {
      t._ripple && (t._ripple.touched = !1);
    }), fr.hide(t);
  }
}
function Ud(e) {
  const t = e.currentTarget;
  t != null && t._ripple && (t._ripple.showTimerCommit && (t._ripple.showTimerCommit = null), window.clearTimeout(t._ripple.showTimer));
}
let uo = !1;
function Wd(e) {
  !uo && (e.keyCode === Ta.enter || e.keyCode === Ta.space) && (uo = !0, ao(e));
}
function Kd(e) {
  uo = !1, Et(e);
}
function Gd(e) {
  uo && (uo = !1, Et(e));
}
function Yd(e, t, n) {
  const {
    value: i,
    modifiers: o
  } = t, r = zd(i);
  if (r || fr.hide(e), e._ripple = e._ripple ?? {}, e._ripple.enabled = r, e._ripple.centered = o.center, e._ripple.circle = o.circle, th(i) && i.class && (e._ripple.class = i.class), r && !n) {
    if (o.stop) {
      e.addEventListener("touchstart", fu, {
        passive: !0
      }), e.addEventListener("mousedown", fu);
      return;
    }
    e.addEventListener("touchstart", ao, {
      passive: !0
    }), e.addEventListener("touchend", Et, {
      passive: !0
    }), e.addEventListener("touchmove", Ud, {
      passive: !0
    }), e.addEventListener("touchcancel", Et), e.addEventListener("mousedown", ao), e.addEventListener("mouseup", Et), e.addEventListener("mouseleave", Et), e.addEventListener("keydown", Wd), e.addEventListener("keyup", Kd), e.addEventListener("blur", Gd), e.addEventListener("dragstart", Et, {
      passive: !0
    });
  } else !r && n && qd(e);
}
function qd(e) {
  e.removeEventListener("mousedown", ao), e.removeEventListener("touchstart", ao), e.removeEventListener("touchend", Et), e.removeEventListener("touchmove", Ud), e.removeEventListener("touchcancel", Et), e.removeEventListener("mouseup", Et), e.removeEventListener("mouseleave", Et), e.removeEventListener("keydown", Wd), e.removeEventListener("keyup", Kd), e.removeEventListener("dragstart", Et), e.removeEventListener("blur", Gd);
}
function Dy(e, t) {
  Yd(e, t, !1);
}
function Ty(e) {
  delete e._ripple, qd(e);
}
function Py(e, t) {
  if (t.value === t.oldValue)
    return;
  const n = zd(t.oldValue);
  Yd(e, t, n);
}
const Mr = {
  mounted: Dy,
  unmounted: Ty,
  updated: Py
}, Ay = W({
  active: {
    type: Boolean,
    default: void 0
  },
  activeColor: String,
  baseColor: String,
  symbol: {
    type: null,
    default: Sl
  },
  flat: Boolean,
  icon: [Boolean, String, Function, Object],
  prependIcon: He,
  appendIcon: He,
  block: Boolean,
  readonly: Boolean,
  slim: Boolean,
  stacked: Boolean,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  text: String,
  ...Ln(),
  ...pe(),
  ...tn(),
  ...bn(),
  ...Sn(),
  ...gy(),
  ...El(),
  ...So(),
  ...kl(),
  ...bt(),
  ...Vl(),
  ...Ir(),
  ...je({
    tag: "button"
  }),
  ...Xe(),
  ...di({
    variant: "elevated"
  })
}, "VBtn"), me = se()({
  name: "VBtn",
  props: Ay(),
  emits: {
    "group:selected": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const {
      themeClasses: o
    } = lt(e), {
      borderClasses: r
    } = Bn(e), {
      densityClasses: s
    } = wn(e), {
      dimensionStyles: l
    } = _n(e), {
      elevationClasses: a
    } = En(e), {
      loaderClasses: d
    } = Cl(e), {
      locationStyles: u
    } = Eo(e), {
      positionClasses: c
    } = Nl(e), {
      roundedClasses: m
    } = _t(e), {
      sizeClasses: v,
      sizeStyles: g
    } = $r(e), h = hy(e, e.symbol, !1), w = xl(e, n), C = y(() => {
      var A;
      return e.active !== void 0 ? e.active : w.isLink.value ? (A = w.isActive) == null ? void 0 : A.value : h == null ? void 0 : h.isSelected.value;
    }), O = y(() => C.value ? e.activeColor ?? e.color : e.color), P = y(() => {
      var S, T;
      return {
        color: (h == null ? void 0 : h.isSelected.value) && (!w.isLink.value || ((S = w.isActive) == null ? void 0 : S.value)) || !h || ((T = w.isActive) == null ? void 0 : T.value) ? O.value ?? e.baseColor : e.baseColor,
        variant: e.variant
      };
    }), {
      colorClasses: M,
      colorStyles: x,
      variantClasses: N
    } = wo(P), $ = y(() => (h == null ? void 0 : h.disabled.value) || e.disabled), E = y(() => e.variant === "elevated" && !(e.disabled || e.flat || e.border)), V = y(() => {
      if (!(e.value === void 0 || typeof e.value == "symbol"))
        return Object(e.value) === e.value ? JSON.stringify(e.value, null, 0) : e.value;
    });
    function L(A) {
      var S;
      $.value || w.isLink.value && (A.metaKey || A.ctrlKey || A.shiftKey || A.button !== 0 || n.target === "_blank") || ((S = w.navigate) == null || S.call(w, A), h == null || h.toggle());
    }
    return xy(w, h == null ? void 0 : h.select), ge(() => {
      const A = w.isLink.value ? "a" : e.tag, S = !!(e.prependIcon || i.prepend), T = !!(e.appendIcon || i.append), B = !!(e.icon && e.icon !== !0);
      return Nt(f(A, Ee({
        type: A === "a" ? void 0 : "button",
        class: ["v-btn", h == null ? void 0 : h.selectedClass.value, {
          "v-btn--active": C.value,
          "v-btn--block": e.block,
          "v-btn--disabled": $.value,
          "v-btn--elevated": E.value,
          "v-btn--flat": e.flat,
          "v-btn--icon": !!e.icon,
          "v-btn--loading": e.loading,
          "v-btn--readonly": e.readonly,
          "v-btn--slim": e.slim,
          "v-btn--stacked": e.stacked
        }, o.value, r.value, M.value, s.value, a.value, d.value, c.value, m.value, v.value, N.value, e.class],
        style: [x.value, l.value, u.value, g.value, e.style],
        "aria-busy": e.loading ? !0 : void 0,
        disabled: $.value || void 0,
        tabindex: e.loading || e.readonly ? -1 : void 0,
        onClick: L,
        value: V.value
      }, w.linkProps), {
        default: () => {
          var Z;
          return [_o(!0, "v-btn"), !e.icon && S && f("span", {
            key: "prepend",
            class: "v-btn__prepend"
          }, [i.prepend ? f(it, {
            key: "prepend-defaults",
            disabled: !e.prependIcon,
            defaults: {
              VIcon: {
                icon: e.prependIcon
              }
            }
          }, i.prepend) : f(We, {
            key: "prepend-icon",
            icon: e.prependIcon
          }, null)]), f("span", {
            class: "v-btn__content",
            "data-no-activator": ""
          }, [!i.default && B ? f(We, {
            key: "content-icon",
            icon: e.icon
          }, null) : f(it, {
            key: "content-defaults",
            disabled: !B,
            defaults: {
              VIcon: {
                icon: e.icon
              }
            }
          }, {
            default: () => {
              var Q;
              return [((Q = i.default) == null ? void 0 : Q.call(i)) ?? e.text];
            }
          })]), !e.icon && T && f("span", {
            key: "append",
            class: "v-btn__append"
          }, [i.append ? f(it, {
            key: "append-defaults",
            disabled: !e.appendIcon,
            defaults: {
              VIcon: {
                icon: e.appendIcon
              }
            }
          }, i.append) : f(We, {
            key: "append-icon",
            icon: e.appendIcon
          }, null)]), !!e.loading && f("span", {
            key: "loader",
            class: "v-btn__loader"
          }, [((Z = i.loader) == null ? void 0 : Z.call(i)) ?? f(Rd, {
            color: typeof e.loading == "boolean" ? void 0 : e.loading,
            indeterminate: !0,
            width: "2"
          }, null)])];
        }
      }), [[Mr, !$.value && e.ripple, "", {
        center: !!e.icon
      }]]);
    }), {
      group: h
    };
  }
}), Xi = se()({
  name: "VCardActions",
  props: pe(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ti({
      VBtn: {
        slim: !0,
        variant: "text"
      }
    }), ge(() => {
      var i;
      return f("div", {
        class: ["v-card-actions", e.class],
        style: e.style
      }, [(i = n.default) == null ? void 0 : i.call(n)]);
    }), {};
  }
}), Iy = W({
  opacity: [Number, String],
  ...pe(),
  ...je()
}, "VCardSubtitle"), $y = se()({
  name: "VCardSubtitle",
  props: Iy(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return ge(() => f(e.tag, {
      class: ["v-card-subtitle", e.class],
      style: [{
        "--v-card-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), Ui = Dr("v-card-title"), My = W({
  appendAvatar: String,
  appendIcon: He,
  prependAvatar: String,
  prependIcon: He,
  subtitle: [String, Number],
  title: [String, Number],
  ...pe(),
  ...tn()
}, "VCardItem"), Zd = se()({
  name: "VCardItem",
  props: My(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return ge(() => {
      var d;
      const i = !!(e.prependAvatar || e.prependIcon), o = !!(i || n.prepend), r = !!(e.appendAvatar || e.appendIcon), s = !!(r || n.append), l = !!(e.title != null || n.title), a = !!(e.subtitle != null || n.subtitle);
      return f("div", {
        class: ["v-card-item", e.class],
        style: e.style
      }, [o && f("div", {
        key: "prepend",
        class: "v-card-item__prepend"
      }, [n.prepend ? f(it, {
        key: "prepend-defaults",
        disabled: !i,
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
      }, n.prepend) : f(Ce, null, [e.prependAvatar && f(Vi, {
        key: "prepend-avatar",
        density: e.density,
        image: e.prependAvatar
      }, null), e.prependIcon && f(We, {
        key: "prepend-icon",
        density: e.density,
        icon: e.prependIcon
      }, null)])]), f("div", {
        class: "v-card-item__content"
      }, [l && f(Ui, {
        key: "title"
      }, {
        default: () => {
          var u;
          return [((u = n.title) == null ? void 0 : u.call(n)) ?? e.title];
        }
      }), a && f($y, {
        key: "subtitle"
      }, {
        default: () => {
          var u;
          return [((u = n.subtitle) == null ? void 0 : u.call(n)) ?? e.subtitle];
        }
      }), (d = n.default) == null ? void 0 : d.call(n)]), s && f("div", {
        key: "append",
        class: "v-card-item__append"
      }, [n.append ? f(it, {
        key: "append-defaults",
        disabled: !r,
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
      }, n.append) : f(Ce, null, [e.appendIcon && f(We, {
        key: "append-icon",
        density: e.density,
        icon: e.appendIcon
      }, null), e.appendAvatar && f(Vi, {
        key: "append-avatar",
        density: e.density,
        image: e.appendAvatar
      }, null)])])]);
    }), {};
  }
}), Fy = W({
  opacity: [Number, String],
  ...pe(),
  ...je()
}, "VCardText"), Ji = se()({
  name: "VCardText",
  props: Fy(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return ge(() => f(e.tag, {
      class: ["v-card-text", e.class],
      style: [{
        "--v-card-text-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), Ly = W({
  appendAvatar: String,
  appendIcon: He,
  disabled: Boolean,
  flat: Boolean,
  hover: Boolean,
  image: String,
  link: {
    type: Boolean,
    default: void 0
  },
  prependAvatar: String,
  prependIcon: He,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  subtitle: [String, Number],
  text: [String, Number],
  title: [String, Number],
  ...Ln(),
  ...pe(),
  ...tn(),
  ...bn(),
  ...Sn(),
  ...El(),
  ...So(),
  ...kl(),
  ...bt(),
  ...Vl(),
  ...je(),
  ...Xe(),
  ...di({
    variant: "elevated"
  })
}, "VCard"), Kt = se()({
  name: "VCard",
  directives: {
    Ripple: Mr
  },
  props: Ly(),
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const {
      themeClasses: o
    } = lt(e), {
      borderClasses: r
    } = Bn(e), {
      colorClasses: s,
      colorStyles: l,
      variantClasses: a
    } = wo(e), {
      densityClasses: d
    } = wn(e), {
      dimensionStyles: u
    } = _n(e), {
      elevationClasses: c
    } = En(e), {
      loaderClasses: m
    } = Cl(e), {
      locationStyles: v
    } = Eo(e), {
      positionClasses: g
    } = Nl(e), {
      roundedClasses: h
    } = _t(e), w = xl(e, n), C = y(() => e.link !== !1 && w.isLink.value), O = y(() => !e.disabled && e.link !== !1 && (e.link || w.isClickable.value));
    return ge(() => {
      const P = C.value ? "a" : e.tag, M = !!(i.title || e.title != null), x = !!(i.subtitle || e.subtitle != null), N = M || x, $ = !!(i.append || e.appendAvatar || e.appendIcon), E = !!(i.prepend || e.prependAvatar || e.prependIcon), V = !!(i.image || e.image), L = N || E || $, A = !!(i.text || e.text != null);
      return Nt(f(P, Ee({
        class: ["v-card", {
          "v-card--disabled": e.disabled,
          "v-card--flat": e.flat,
          "v-card--hover": e.hover && !(e.disabled || e.flat),
          "v-card--link": O.value
        }, o.value, r.value, s.value, d.value, c.value, m.value, g.value, h.value, a.value, e.class],
        style: [l.value, u.value, v.value, e.style],
        onClick: O.value && w.navigate,
        tabindex: e.disabled ? -1 : void 0
      }, w.linkProps), {
        default: () => {
          var S;
          return [V && f("div", {
            key: "image",
            class: "v-card__image"
          }, [i.image ? f(it, {
            key: "image-defaults",
            disabled: !e.image,
            defaults: {
              VImg: {
                cover: !0,
                src: e.image
              }
            }
          }, i.image) : f(wl, {
            key: "image-img",
            cover: !0,
            src: e.image
          }, null)]), f(Hd, {
            name: "v-card",
            active: !!e.loading,
            color: typeof e.loading == "boolean" ? void 0 : e.loading
          }, {
            default: i.loader
          }), L && f(Zd, {
            key: "item",
            prependAvatar: e.prependAvatar,
            prependIcon: e.prependIcon,
            title: e.title,
            subtitle: e.subtitle,
            appendAvatar: e.appendAvatar,
            appendIcon: e.appendIcon
          }, {
            default: i.item,
            prepend: i.prepend,
            title: i.title,
            subtitle: i.subtitle,
            append: i.append
          }), A && f(Ji, {
            key: "text"
          }, {
            default: () => {
              var T;
              return [((T = i.text) == null ? void 0 : T.call(i)) ?? e.text];
            }
          }), (S = i.default) == null ? void 0 : S.call(i), i.actions && f(Xi, null, {
            default: i.actions
          }), _o(O.value, "v-card")];
        }
      }), [[Di("ripple"), O.value && e.ripple]]);
    }), {};
  }
}), By = W({
  color: String,
  inset: Boolean,
  length: [Number, String],
  opacity: [Number, String],
  thickness: [Number, String],
  vertical: Boolean,
  ...pe(),
  ...Xe()
}, "VDivider"), fn = se()({
  name: "VDivider",
  props: By(),
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const {
      themeClasses: o
    } = lt(e), {
      textColorClasses: r,
      textColorStyles: s
    } = Ht(ie(e, "color")), l = y(() => {
      const a = {};
      return e.length && (a[e.vertical ? "height" : "width"] = oe(e.length)), e.thickness && (a[e.vertical ? "borderRightWidth" : "borderTopWidth"] = oe(e.thickness)), a;
    });
    return ge(() => {
      const a = f("hr", {
        class: [{
          "v-divider": !0,
          "v-divider--inset": e.inset,
          "v-divider--vertical": e.vertical
        }, o.value, r.value, e.class],
        style: [l.value, s.value, {
          "--v-border-opacity": e.opacity
        }, e.style],
        "aria-orientation": !n.role || n.role === "separator" ? e.vertical ? "vertical" : "horizontal" : void 0,
        role: `${n.role || "separator"}`
      }, null);
      return i.default ? f("div", {
        class: ["v-divider__wrapper", {
          "v-divider__wrapper--vertical": e.vertical,
          "v-divider__wrapper--inset": e.inset
        }]
      }, [a, f("div", {
        class: "v-divider__content"
      }, [i.default()]), a]) : a;
    }), {};
  }
}), Xd = Pr.reduce((e, t) => (e[t] = {
  type: [Boolean, String, Number],
  default: !1
}, e), {}), Jd = Pr.reduce((e, t) => {
  const n = "offset" + Tt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), Qd = Pr.reduce((e, t) => {
  const n = "order" + Tt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), mu = {
  col: Object.keys(Xd),
  offset: Object.keys(Jd),
  order: Object.keys(Qd)
};
function Ry(e, t, n) {
  let i = e;
  if (!(n == null || n === !1)) {
    if (t) {
      const o = t.replace(e, "");
      i += `-${o}`;
    }
    return e === "col" && (i = "v-" + i), e === "col" && (n === "" || n === !0) || (i += `-${n}`), i.toLowerCase();
  }
}
const Hy = ["auto", "start", "end", "center", "baseline", "stretch"], jy = W({
  cols: {
    type: [Boolean, String, Number],
    default: !1
  },
  ...Xd,
  offset: {
    type: [String, Number],
    default: null
  },
  ...Jd,
  order: {
    type: [String, Number],
    default: null
  },
  ...Qd,
  alignSelf: {
    type: String,
    default: null,
    validator: (e) => Hy.includes(e)
  },
  ...pe(),
  ...je()
}, "VCol"), Ue = se()({
  name: "VCol",
  props: jy(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => {
      const o = [];
      let r;
      for (r in mu)
        mu[r].forEach((l) => {
          const a = e[l], d = Ry(r, l, a);
          d && o.push(d);
        });
      const s = o.some((l) => l.startsWith("v-col-"));
      return o.push({
        // Default to .v-col if no other col-{bp}-* classes generated nor `cols` specified.
        "v-col": !s || !e.cols,
        [`v-col-${e.cols}`]: e.cols,
        [`offset-${e.offset}`]: e.offset,
        [`order-${e.order}`]: e.order,
        [`align-self-${e.alignSelf}`]: e.alignSelf
      }), o;
    });
    return () => {
      var o;
      return $n(e.tag, {
        class: [i.value, e.class],
        style: e.style
      }, (o = n.default) == null ? void 0 : o.call(n));
    };
  }
}), Ol = ["start", "end", "center"], ef = ["space-between", "space-around", "space-evenly"];
function Dl(e, t) {
  return Pr.reduce((n, i) => {
    const o = e + Tt(i);
    return n[o] = t(), n;
  }, {});
}
const zy = [...Ol, "baseline", "stretch"], tf = (e) => zy.includes(e), nf = Dl("align", () => ({
  type: String,
  default: null,
  validator: tf
})), Uy = [...Ol, ...ef], of = (e) => Uy.includes(e), rf = Dl("justify", () => ({
  type: String,
  default: null,
  validator: of
})), Wy = [...Ol, ...ef, "stretch"], sf = (e) => Wy.includes(e), lf = Dl("alignContent", () => ({
  type: String,
  default: null,
  validator: sf
})), vu = {
  align: Object.keys(nf),
  justify: Object.keys(rf),
  alignContent: Object.keys(lf)
}, Ky = {
  align: "align",
  justify: "justify",
  alignContent: "align-content"
};
function Gy(e, t, n) {
  let i = Ky[e];
  if (n != null) {
    if (t) {
      const o = t.replace(e, "");
      i += `-${o}`;
    }
    return i += `-${n}`, i.toLowerCase();
  }
}
const Yy = W({
  dense: Boolean,
  noGutters: Boolean,
  align: {
    type: String,
    default: null,
    validator: tf
  },
  ...nf,
  justify: {
    type: String,
    default: null,
    validator: of
  },
  ...rf,
  alignContent: {
    type: String,
    default: null,
    validator: sf
  },
  ...lf,
  ...pe(),
  ...je()
}, "VRow"), an = se()({
  name: "VRow",
  props: Yy(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => {
      const o = [];
      let r;
      for (r in vu)
        vu[r].forEach((s) => {
          const l = e[s], a = Gy(r, s, l);
          a && o.push(a);
        });
      return o.push({
        "v-row--no-gutters": e.noGutters,
        "v-row--dense": e.dense,
        [`align-${e.align}`]: e.align,
        [`justify-${e.justify}`]: e.justify,
        [`align-content-${e.alignContent}`]: e.alignContent
      }), o;
    });
    return () => {
      var o;
      return $n(e.tag, {
        class: ["v-row", i.value, e.class],
        style: e.style
      }, (o = n.default) == null ? void 0 : o.call(n));
    };
  }
}), af = Dr("v-spacer", "div", "VSpacer"), qy = W({
  disabled: Boolean,
  group: Boolean,
  hideOnLeave: Boolean,
  leaveAbsolute: Boolean,
  mode: String,
  origin: String
}, "transition");
function xt(e, t, n) {
  return se()({
    name: e,
    props: qy({
      mode: n,
      origin: t
    }),
    setup(i, o) {
      let {
        slots: r
      } = o;
      const s = {
        onBeforeEnter(l) {
          i.origin && (l.style.transformOrigin = i.origin);
        },
        onLeave(l) {
          if (i.leaveAbsolute) {
            const {
              offsetTop: a,
              offsetLeft: d,
              offsetWidth: u,
              offsetHeight: c
            } = l;
            l._transitionInitialStyles = {
              position: l.style.position,
              top: l.style.top,
              left: l.style.left,
              width: l.style.width,
              height: l.style.height
            }, l.style.position = "absolute", l.style.top = `${a}px`, l.style.left = `${d}px`, l.style.width = `${u}px`, l.style.height = `${c}px`;
          }
          i.hideOnLeave && l.style.setProperty("display", "none", "important");
        },
        onAfterLeave(l) {
          if (i.leaveAbsolute && (l != null && l._transitionInitialStyles)) {
            const {
              position: a,
              top: d,
              left: u,
              width: c,
              height: m
            } = l._transitionInitialStyles;
            delete l._transitionInitialStyles, l.style.position = a || "", l.style.top = d || "", l.style.left = u || "", l.style.width = c || "", l.style.height = m || "";
          }
        }
      };
      return () => {
        const l = i.group ? cl : li;
        return $n(l, {
          name: i.disabled ? "" : e,
          css: !i.disabled,
          ...i.group ? void 0 : {
            mode: i.mode
          },
          ...i.disabled ? {} : s
        }, r.default);
      };
    }
  });
}
function uf(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "in-out";
  return se()({
    name: e,
    props: {
      mode: {
        type: String,
        default: n
      },
      disabled: Boolean,
      group: Boolean
    },
    setup(i, o) {
      let {
        slots: r
      } = o;
      const s = i.group ? cl : li;
      return () => $n(s, {
        name: i.disabled ? "" : e,
        css: !i.disabled,
        // mode: props.mode, // TODO: vuejs/vue-next#3104
        ...i.disabled ? {} : t
      }, r.default);
    }
  });
}
function cf() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  const n = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1) ? "width" : "height", i = tt(`offset-${n}`);
  return {
    onBeforeEnter(s) {
      s._parent = s.parentNode, s._initialStyle = {
        transition: s.style.transition,
        overflow: s.style.overflow,
        [n]: s.style[n]
      };
    },
    onEnter(s) {
      const l = s._initialStyle;
      s.style.setProperty("transition", "none", "important"), s.style.overflow = "hidden";
      const a = `${s[i]}px`;
      s.style[n] = "0", s.offsetHeight, s.style.transition = l.transition, e && s._parent && s._parent.classList.add(e), requestAnimationFrame(() => {
        s.style[n] = a;
      });
    },
    onAfterEnter: r,
    onEnterCancelled: r,
    onLeave(s) {
      s._initialStyle = {
        transition: "",
        overflow: s.style.overflow,
        [n]: s.style[n]
      }, s.style.overflow = "hidden", s.style[n] = `${s[i]}px`, s.offsetHeight, requestAnimationFrame(() => s.style[n] = "0");
    },
    onAfterLeave: o,
    onLeaveCancelled: o
  };
  function o(s) {
    e && s._parent && s._parent.classList.remove(e), r(s);
  }
  function r(s) {
    const l = s._initialStyle[n];
    s.style.overflow = s._initialStyle.overflow, l != null && (s.style[n] = l), delete s._initialStyle;
  }
}
const Zy = W({
  target: [Object, Array]
}, "v-dialog-transition"), Xy = se()({
  name: "VDialogTransition",
  props: Zy(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = {
      onBeforeEnter(o) {
        o.style.pointerEvents = "none", o.style.visibility = "hidden";
      },
      async onEnter(o, r) {
        var m;
        await new Promise((v) => requestAnimationFrame(v)), await new Promise((v) => requestAnimationFrame(v)), o.style.visibility = "";
        const {
          x: s,
          y: l,
          sx: a,
          sy: d,
          speed: u
        } = hu(e.target, o), c = yi(o, [{
          transform: `translate(${s}px, ${l}px) scale(${a}, ${d})`,
          opacity: 0
        }, {}], {
          duration: 225 * u,
          easing: Hh
        });
        (m = gu(o)) == null || m.forEach((v) => {
          yi(v, [{
            opacity: 0
          }, {
            opacity: 0,
            offset: 0.33
          }, {}], {
            duration: 225 * 2 * u,
            easing: lr
          });
        }), c.finished.then(() => r());
      },
      onAfterEnter(o) {
        o.style.removeProperty("pointer-events");
      },
      onBeforeLeave(o) {
        o.style.pointerEvents = "none";
      },
      async onLeave(o, r) {
        var m;
        await new Promise((v) => requestAnimationFrame(v));
        const {
          x: s,
          y: l,
          sx: a,
          sy: d,
          speed: u
        } = hu(e.target, o);
        yi(o, [{}, {
          transform: `translate(${s}px, ${l}px) scale(${a}, ${d})`,
          opacity: 0
        }], {
          duration: 125 * u,
          easing: jh
        }).finished.then(() => r()), (m = gu(o)) == null || m.forEach((v) => {
          yi(v, [{}, {
            opacity: 0,
            offset: 0.2
          }, {
            opacity: 0
          }], {
            duration: 125 * 2 * u,
            easing: lr
          });
        });
      },
      onAfterLeave(o) {
        o.style.removeProperty("pointer-events");
      }
    };
    return () => e.target ? f(li, Ee({
      name: "dialog-transition"
    }, i, {
      css: !1
    }), n) : f(li, {
      name: "dialog-transition"
    }, n);
  }
});
function gu(e) {
  var n;
  const t = (n = e.querySelector(":scope > .v-card, :scope > .v-sheet, :scope > .v-list")) == null ? void 0 : n.children;
  return t && [...t];
}
function hu(e, t) {
  const n = cd(e), i = gl(t), [o, r] = getComputedStyle(t).transformOrigin.split(" ").map((C) => parseFloat(C)), [s, l] = getComputedStyle(t).getPropertyValue("--v-overlay-anchor-origin").split(" ");
  let a = n.left + n.width / 2;
  s === "left" || l === "left" ? a -= n.width / 2 : (s === "right" || l === "right") && (a += n.width / 2);
  let d = n.top + n.height / 2;
  s === "top" || l === "top" ? d -= n.height / 2 : (s === "bottom" || l === "bottom") && (d += n.height / 2);
  const u = n.width / i.width, c = n.height / i.height, m = Math.max(1, u, c), v = u / m || 0, g = c / m || 0, h = i.width * i.height / (window.innerWidth * window.innerHeight), w = h > 0.12 ? Math.min(1.5, (h - 0.12) * 10 + 1) : 1;
  return {
    x: a - (o + i.left),
    y: d - (r + i.top),
    sx: v,
    sy: g,
    speed: w
  };
}
xt("fab-transition", "center center", "out-in");
xt("dialog-bottom-transition");
xt("dialog-top-transition");
xt("fade-transition");
const Jy = xt("scale-transition");
xt("scroll-x-transition");
xt("scroll-x-reverse-transition");
xt("scroll-y-transition");
xt("scroll-y-reverse-transition");
xt("slide-x-transition");
xt("slide-x-reverse-transition");
const df = xt("slide-y-transition");
xt("slide-y-reverse-transition");
const ff = uf("expand-transition", cf()), Qy = uf("expand-x-transition", cf("", !0)), Ms = Symbol.for("vuetify:list");
function mf() {
  const e = Re(Ms, {
    hasPrepend: he(!1),
    updateHasPrepend: () => null
  }), t = {
    hasPrepend: he(!1),
    updateHasPrepend: (n) => {
      n && (t.hasPrepend.value = n);
    }
  };
  return gt(Ms, t), e;
}
function vf() {
  return Re(Ms, null);
}
const Tl = (e) => {
  const t = {
    activate: (n) => {
      let {
        id: i,
        value: o,
        activated: r
      } = n;
      return i = J(i), e && !o && r.size === 1 && r.has(i) || (o ? r.add(i) : r.delete(i)), r;
    },
    in: (n, i, o) => {
      let r = /* @__PURE__ */ new Set();
      if (n != null)
        for (const s of ti(n))
          r = t.activate({
            id: s,
            value: !0,
            activated: new Set(r),
            children: i,
            parents: o
          });
      return r;
    },
    out: (n) => Array.from(n)
  };
  return t;
}, gf = (e) => {
  const t = Tl(e);
  return {
    activate: (i) => {
      let {
        activated: o,
        id: r,
        ...s
      } = i;
      r = J(r);
      const l = o.has(r) ? /* @__PURE__ */ new Set([r]) : /* @__PURE__ */ new Set();
      return t.activate({
        ...s,
        id: r,
        activated: l
      });
    },
    in: (i, o, r) => {
      let s = /* @__PURE__ */ new Set();
      if (i != null) {
        const l = ti(i);
        l.length && (s = t.in(l.slice(0, 1), o, r));
      }
      return s;
    },
    out: (i, o, r) => t.out(i, o, r)
  };
}, eb = (e) => {
  const t = Tl(e);
  return {
    activate: (i) => {
      let {
        id: o,
        activated: r,
        children: s,
        ...l
      } = i;
      return o = J(o), s.has(o) ? r : t.activate({
        id: o,
        activated: r,
        children: s,
        ...l
      });
    },
    in: t.in,
    out: t.out
  };
}, tb = (e) => {
  const t = gf(e);
  return {
    activate: (i) => {
      let {
        id: o,
        activated: r,
        children: s,
        ...l
      } = i;
      return o = J(o), s.has(o) ? r : t.activate({
        id: o,
        activated: r,
        children: s,
        ...l
      });
    },
    in: t.in,
    out: t.out
  };
}, nb = {
  open: (e) => {
    let {
      id: t,
      value: n,
      opened: i,
      parents: o
    } = e;
    if (n) {
      const r = /* @__PURE__ */ new Set();
      r.add(t);
      let s = o.get(t);
      for (; s != null; )
        r.add(s), s = o.get(s);
      return r;
    } else
      return i.delete(t), i;
  },
  select: () => null
}, hf = {
  open: (e) => {
    let {
      id: t,
      value: n,
      opened: i,
      parents: o
    } = e;
    if (n) {
      let r = o.get(t);
      for (i.add(t); r != null && r !== t; )
        i.add(r), r = o.get(r);
      return i;
    } else
      i.delete(t);
    return i;
  },
  select: () => null
}, ib = {
  open: hf.open,
  select: (e) => {
    let {
      id: t,
      value: n,
      opened: i,
      parents: o
    } = e;
    if (!n) return i;
    const r = [];
    let s = o.get(t);
    for (; s != null; )
      r.push(s), s = o.get(s);
    return new Set(r);
  }
}, Pl = (e) => {
  const t = {
    select: (n) => {
      let {
        id: i,
        value: o,
        selected: r
      } = n;
      if (i = J(i), e && !o) {
        const s = Array.from(r.entries()).reduce((l, a) => {
          let [d, u] = a;
          return u === "on" && l.push(d), l;
        }, []);
        if (s.length === 1 && s[0] === i) return r;
      }
      return r.set(i, o ? "on" : "off"), r;
    },
    in: (n, i, o) => {
      let r = /* @__PURE__ */ new Map();
      for (const s of n || [])
        r = t.select({
          id: s,
          value: !0,
          selected: new Map(r),
          children: i,
          parents: o
        });
      return r;
    },
    out: (n) => {
      const i = [];
      for (const [o, r] of n.entries())
        r === "on" && i.push(o);
      return i;
    }
  };
  return t;
}, pf = (e) => {
  const t = Pl(e);
  return {
    select: (i) => {
      let {
        selected: o,
        id: r,
        ...s
      } = i;
      r = J(r);
      const l = o.has(r) ? /* @__PURE__ */ new Map([[r, o.get(r)]]) : /* @__PURE__ */ new Map();
      return t.select({
        ...s,
        id: r,
        selected: l
      });
    },
    in: (i, o, r) => {
      let s = /* @__PURE__ */ new Map();
      return i != null && i.length && (s = t.in(i.slice(0, 1), o, r)), s;
    },
    out: (i, o, r) => t.out(i, o, r)
  };
}, ob = (e) => {
  const t = Pl(e);
  return {
    select: (i) => {
      let {
        id: o,
        selected: r,
        children: s,
        ...l
      } = i;
      return o = J(o), s.has(o) ? r : t.select({
        id: o,
        selected: r,
        children: s,
        ...l
      });
    },
    in: t.in,
    out: t.out
  };
}, rb = (e) => {
  const t = pf(e);
  return {
    select: (i) => {
      let {
        id: o,
        selected: r,
        children: s,
        ...l
      } = i;
      return o = J(o), s.has(o) ? r : t.select({
        id: o,
        selected: r,
        children: s,
        ...l
      });
    },
    in: t.in,
    out: t.out
  };
}, sb = (e) => {
  const t = {
    select: (n) => {
      let {
        id: i,
        value: o,
        selected: r,
        children: s,
        parents: l
      } = n;
      i = J(i);
      const a = new Map(r), d = [i];
      for (; d.length; ) {
        const c = d.shift();
        r.set(J(c), o ? "on" : "off"), s.has(c) && d.push(...s.get(c));
      }
      let u = J(l.get(i));
      for (; u; ) {
        const c = s.get(u), m = c.every((g) => r.get(J(g)) === "on"), v = c.every((g) => !r.has(J(g)) || r.get(J(g)) === "off");
        r.set(u, m ? "on" : v ? "off" : "indeterminate"), u = J(l.get(u));
      }
      return e && !o && Array.from(r.entries()).reduce((m, v) => {
        let [g, h] = v;
        return h === "on" && m.push(g), m;
      }, []).length === 0 ? a : r;
    },
    in: (n, i, o) => {
      let r = /* @__PURE__ */ new Map();
      for (const s of n || [])
        r = t.select({
          id: s,
          value: !0,
          selected: new Map(r),
          children: i,
          parents: o
        });
      return r;
    },
    out: (n, i) => {
      const o = [];
      for (const [r, s] of n.entries())
        s === "on" && !i.has(r) && o.push(r);
      return o;
    }
  };
  return t;
}, co = Symbol.for("vuetify:nested"), yf = {
  id: he(),
  root: {
    register: () => null,
    unregister: () => null,
    parents: ue(/* @__PURE__ */ new Map()),
    children: ue(/* @__PURE__ */ new Map()),
    open: () => null,
    openOnSelect: () => null,
    activate: () => null,
    select: () => null,
    activatable: ue(!1),
    selectable: ue(!1),
    opened: ue(/* @__PURE__ */ new Set()),
    activated: ue(/* @__PURE__ */ new Set()),
    selected: ue(/* @__PURE__ */ new Map()),
    selectedValues: ue([]),
    getPath: () => []
  }
}, lb = W({
  activatable: Boolean,
  selectable: Boolean,
  activeStrategy: [String, Function, Object],
  selectStrategy: [String, Function, Object],
  openStrategy: [String, Object],
  opened: null,
  activated: null,
  selected: null,
  mandatory: Boolean
}, "nested"), ab = (e) => {
  let t = !1;
  const n = ue(/* @__PURE__ */ new Map()), i = ue(/* @__PURE__ */ new Map()), o = nt(e, "opened", e.opened, (g) => new Set(g), (g) => [...g.values()]), r = y(() => {
    if (typeof e.activeStrategy == "object") return e.activeStrategy;
    if (typeof e.activeStrategy == "function") return e.activeStrategy(e.mandatory);
    switch (e.activeStrategy) {
      case "leaf":
        return eb(e.mandatory);
      case "single-leaf":
        return tb(e.mandatory);
      case "independent":
        return Tl(e.mandatory);
      case "single-independent":
      default:
        return gf(e.mandatory);
    }
  }), s = y(() => {
    if (typeof e.selectStrategy == "object") return e.selectStrategy;
    if (typeof e.selectStrategy == "function") return e.selectStrategy(e.mandatory);
    switch (e.selectStrategy) {
      case "single-leaf":
        return rb(e.mandatory);
      case "leaf":
        return ob(e.mandatory);
      case "independent":
        return Pl(e.mandatory);
      case "single-independent":
        return pf(e.mandatory);
      case "classic":
      default:
        return sb(e.mandatory);
    }
  }), l = y(() => {
    if (typeof e.openStrategy == "object") return e.openStrategy;
    switch (e.openStrategy) {
      case "list":
        return ib;
      case "single":
        return nb;
      case "multiple":
      default:
        return hf;
    }
  }), a = nt(e, "activated", e.activated, (g) => r.value.in(g, n.value, i.value), (g) => r.value.out(g, n.value, i.value)), d = nt(e, "selected", e.selected, (g) => s.value.in(g, n.value, i.value), (g) => s.value.out(g, n.value, i.value));
  yt(() => {
    t = !0;
  });
  function u(g) {
    const h = [];
    let w = g;
    for (; w != null; )
      h.unshift(w), w = i.value.get(w);
    return h;
  }
  const c = ze("nested"), m = /* @__PURE__ */ new Set(), v = {
    id: he(),
    root: {
      opened: o,
      activatable: ie(e, "activatable"),
      selectable: ie(e, "selectable"),
      activated: a,
      selected: d,
      selectedValues: y(() => {
        const g = [];
        for (const [h, w] of d.value.entries())
          w === "on" && g.push(h);
        return g;
      }),
      register: (g, h, w) => {
        if (m.has(g)) {
          const C = u(g).map(String).join(" -> "), O = u(h).concat(g).map(String).join(" -> ");
          rr(`Multiple nodes with the same ID
	${C}
	${O}`);
          return;
        } else
          m.add(g);
        h && g !== h && i.value.set(g, h), w && n.value.set(g, []), h != null && n.value.set(h, [...n.value.get(h) || [], g]);
      },
      unregister: (g) => {
        if (t) return;
        m.delete(g), n.value.delete(g);
        const h = i.value.get(g);
        if (h) {
          const w = n.value.get(h) ?? [];
          n.value.set(h, w.filter((C) => C !== g));
        }
        i.value.delete(g);
      },
      open: (g, h, w) => {
        c.emit("click:open", {
          id: g,
          value: h,
          path: u(g),
          event: w
        });
        const C = l.value.open({
          id: g,
          value: h,
          opened: new Set(o.value),
          children: n.value,
          parents: i.value,
          event: w
        });
        C && (o.value = C);
      },
      openOnSelect: (g, h, w) => {
        const C = l.value.select({
          id: g,
          value: h,
          selected: new Map(d.value),
          opened: new Set(o.value),
          children: n.value,
          parents: i.value,
          event: w
        });
        C && (o.value = C);
      },
      select: (g, h, w) => {
        c.emit("click:select", {
          id: g,
          value: h,
          path: u(g),
          event: w
        });
        const C = s.value.select({
          id: g,
          value: h,
          selected: new Map(d.value),
          children: n.value,
          parents: i.value,
          event: w
        });
        C && (d.value = C), v.root.openOnSelect(g, h, w);
      },
      activate: (g, h, w) => {
        if (!e.activatable)
          return v.root.select(g, !0, w);
        c.emit("click:activate", {
          id: g,
          value: h,
          path: u(g),
          event: w
        });
        const C = r.value.activate({
          id: g,
          value: h,
          activated: new Set(a.value),
          children: n.value,
          parents: i.value,
          event: w
        });
        C && (a.value = C);
      },
      children: n,
      parents: i,
      getPath: u
    }
  };
  return gt(co, v), v.root;
}, bf = (e, t) => {
  const n = Re(co, yf), i = Symbol(Fn()), o = y(() => e.value !== void 0 ? e.value : i), r = {
    ...n,
    id: o,
    open: (s, l) => n.root.open(o.value, s, l),
    openOnSelect: (s, l) => n.root.openOnSelect(o.value, s, l),
    isOpen: y(() => n.root.opened.value.has(o.value)),
    parent: y(() => n.root.parents.value.get(o.value)),
    activate: (s, l) => n.root.activate(o.value, s, l),
    isActivated: y(() => n.root.activated.value.has(J(o.value))),
    select: (s, l) => n.root.select(o.value, s, l),
    isSelected: y(() => n.root.selected.value.get(J(o.value)) === "on"),
    isIndeterminate: y(() => n.root.selected.value.get(o.value) === "indeterminate"),
    isLeaf: y(() => !n.root.children.value.get(o.value)),
    isGroupActivator: n.isGroupActivator
  };
  return !n.isGroupActivator && n.root.register(o.value, n.id.value, t), yt(() => {
    !n.isGroupActivator && n.root.unregister(o.value);
  }), t && gt(co, r), r;
}, ub = () => {
  const e = Re(co, yf);
  gt(co, {
    ...e,
    isGroupActivator: !0
  });
};
function Fr() {
  const e = he(!1);
  return In(() => {
    window.requestAnimationFrame(() => {
      e.value = !0;
    });
  }), {
    ssrBootStyles: y(() => e.value ? void 0 : {
      transition: "none !important"
    }),
    isBooted: vo(e)
  };
}
const cb = Pi({
  name: "VListGroupActivator",
  setup(e, t) {
    let {
      slots: n
    } = t;
    return ub(), () => {
      var i;
      return (i = n.default) == null ? void 0 : i.call(n);
    };
  }
}), db = W({
  /* @deprecated */
  activeColor: String,
  baseColor: String,
  color: String,
  collapseIcon: {
    type: He,
    default: "$collapse"
  },
  expandIcon: {
    type: He,
    default: "$expand"
  },
  prependIcon: He,
  appendIcon: He,
  fluid: Boolean,
  subgroup: Boolean,
  title: String,
  value: null,
  ...pe(),
  ...je()
}, "VListGroup"), mr = se()({
  name: "VListGroup",
  props: db(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isOpen: i,
      open: o,
      id: r
    } = bf(ie(e, "value"), !0), s = y(() => `v-list-group--id-${String(r.value)}`), l = vf(), {
      isBooted: a
    } = Fr();
    function d(v) {
      v.stopPropagation(), o(!i.value, v);
    }
    const u = y(() => ({
      onClick: d,
      class: "v-list-group__header",
      id: s.value
    })), c = y(() => i.value ? e.collapseIcon : e.expandIcon), m = y(() => ({
      VListItem: {
        active: i.value,
        activeColor: e.activeColor,
        baseColor: e.baseColor,
        color: e.color,
        prependIcon: e.prependIcon || e.subgroup && c.value,
        appendIcon: e.appendIcon || !e.subgroup && c.value,
        title: e.title,
        value: e.value
      }
    }));
    return ge(() => f(e.tag, {
      class: ["v-list-group", {
        "v-list-group--prepend": l == null ? void 0 : l.hasPrepend.value,
        "v-list-group--fluid": e.fluid,
        "v-list-group--subgroup": e.subgroup,
        "v-list-group--open": i.value
      }, e.class],
      style: e.style
    }, {
      default: () => [n.activator && f(it, {
        defaults: m.value
      }, {
        default: () => [f(cb, null, {
          default: () => [n.activator({
            props: u.value,
            isOpen: i.value
          })]
        })]
      }), f(cn, {
        transition: {
          component: ff
        },
        disabled: !a.value
      }, {
        default: () => {
          var v;
          return [Nt(f("div", {
            class: "v-list-group__items",
            role: "group",
            "aria-labelledby": s.value
          }, [(v = n.default) == null ? void 0 : v.call(n)]), [[Mn, i.value]])];
        }
      })]
    })), {
      isOpen: i
    };
  }
}), fb = W({
  opacity: [Number, String],
  ...pe(),
  ...je()
}, "VListItemSubtitle"), _f = se()({
  name: "VListItemSubtitle",
  props: fb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return ge(() => f(e.tag, {
      class: ["v-list-item-subtitle", e.class],
      style: [{
        "--v-list-item-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), Al = Dr("v-list-item-title"), mb = W({
  active: {
    type: Boolean,
    default: void 0
  },
  activeClass: String,
  /* @deprecated */
  activeColor: String,
  appendAvatar: String,
  appendIcon: He,
  baseColor: String,
  disabled: Boolean,
  lines: [Boolean, String],
  link: {
    type: Boolean,
    default: void 0
  },
  nav: Boolean,
  prependAvatar: String,
  prependIcon: He,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  slim: Boolean,
  subtitle: [String, Number],
  title: [String, Number],
  value: null,
  onClick: Ot(),
  onClickOnce: Ot(),
  ...Ln(),
  ...pe(),
  ...tn(),
  ...bn(),
  ...Sn(),
  ...bt(),
  ...Vl(),
  ...je(),
  ...Xe(),
  ...di({
    variant: "text"
  })
}, "VListItem"), Le = se()({
  name: "VListItem",
  directives: {
    Ripple: Mr
  },
  props: mb(),
  emits: {
    click: (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: i,
      emit: o
    } = t;
    const r = xl(e, n), s = y(() => e.value === void 0 ? r.href.value : e.value), {
      activate: l,
      isActivated: a,
      select: d,
      isOpen: u,
      isSelected: c,
      isIndeterminate: m,
      isGroupActivator: v,
      root: g,
      parent: h,
      openOnSelect: w,
      id: C
    } = bf(s, !1), O = vf(), P = y(() => {
      var ne;
      return e.active !== !1 && (e.active || ((ne = r.isActive) == null ? void 0 : ne.value) || (g.activatable.value ? a.value : c.value));
    }), M = y(() => e.link !== !1 && r.isLink.value), x = y(() => !e.disabled && e.link !== !1 && (e.link || r.isClickable.value || !!O && (g.selectable.value || g.activatable.value || e.value != null))), N = y(() => e.rounded || e.nav), $ = y(() => e.color ?? e.activeColor), E = y(() => ({
      color: P.value ? $.value ?? e.baseColor : e.baseColor,
      variant: e.variant
    }));
    ve(() => {
      var ne;
      return (ne = r.isActive) == null ? void 0 : ne.value;
    }, (ne) => {
      ne && h.value != null && g.open(h.value, !0), ne && w(ne);
    }, {
      immediate: !0
    });
    const {
      themeClasses: V
    } = lt(e), {
      borderClasses: L
    } = Bn(e), {
      colorClasses: A,
      colorStyles: S,
      variantClasses: T
    } = wo(E), {
      densityClasses: B
    } = wn(e), {
      dimensionStyles: Z
    } = _n(e), {
      elevationClasses: Q
    } = En(e), {
      roundedClasses: X
    } = _t(N), q = y(() => e.lines ? `v-list-item--${e.lines}-line` : void 0), ye = y(() => ({
      isActive: P.value,
      select: d,
      isOpen: u.value,
      isSelected: c.value,
      isIndeterminate: m.value
    }));
    function be(ne) {
      var xe;
      o("click", ne), x.value && ((xe = r.navigate) == null || xe.call(r, ne), !v && (g.activatable.value ? l(!a.value, ne) : (g.selectable.value || e.value != null) && d(!c.value, ne)));
    }
    function fe(ne) {
      (ne.key === "Enter" || ne.key === " ") && (ne.preventDefault(), ne.target.dispatchEvent(new MouseEvent("click", ne)));
    }
    return ge(() => {
      const ne = M.value ? "a" : e.tag, xe = i.title || e.title != null, Je = i.subtitle || e.subtitle != null, Qe = !!(e.appendAvatar || e.appendIcon), Y = !!(Qe || i.append), ce = !!(e.prependAvatar || e.prependIcon), Ie = !!(ce || i.prepend);
      return O == null || O.updateHasPrepend(Ie), e.activeColor && Sh("active-color", ["color", "base-color"]), Nt(f(ne, Ee({
        class: ["v-list-item", {
          "v-list-item--active": P.value,
          "v-list-item--disabled": e.disabled,
          "v-list-item--link": x.value,
          "v-list-item--nav": e.nav,
          "v-list-item--prepend": !Ie && (O == null ? void 0 : O.hasPrepend.value),
          "v-list-item--slim": e.slim,
          [`${e.activeClass}`]: e.activeClass && P.value
        }, V.value, L.value, A.value, B.value, Q.value, q.value, X.value, T.value, e.class],
        style: [S.value, Z.value, e.style],
        tabindex: x.value ? O ? -2 : 0 : void 0,
        "aria-selected": g.activatable.value ? a.value : c.value,
        onClick: be,
        onKeydown: x.value && !M.value && fe
      }, r.linkProps), {
        default: () => {
          var at;
          return [_o(x.value || P.value, "v-list-item"), Ie && f("div", {
            key: "prepend",
            class: "v-list-item__prepend"
          }, [i.prepend ? f(it, {
            key: "prepend-defaults",
            disabled: !ce,
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
              var Ge;
              return [(Ge = i.prepend) == null ? void 0 : Ge.call(i, ye.value)];
            }
          }) : f(Ce, null, [e.prependAvatar && f(Vi, {
            key: "prepend-avatar",
            density: e.density,
            image: e.prependAvatar
          }, null), e.prependIcon && f(We, {
            key: "prepend-icon",
            density: e.density,
            icon: e.prependIcon
          }, null)]), f("div", {
            class: "v-list-item__spacer"
          }, null)]), f("div", {
            class: "v-list-item__content",
            "data-no-activator": ""
          }, [xe && f(Al, {
            key: "title"
          }, {
            default: () => {
              var Ge;
              return [((Ge = i.title) == null ? void 0 : Ge.call(i, {
                title: e.title
              })) ?? e.title];
            }
          }), Je && f(_f, {
            key: "subtitle"
          }, {
            default: () => {
              var Ge;
              return [((Ge = i.subtitle) == null ? void 0 : Ge.call(i, {
                subtitle: e.subtitle
              })) ?? e.subtitle];
            }
          }), (at = i.default) == null ? void 0 : at.call(i, ye.value)]), Y && f("div", {
            key: "append",
            class: "v-list-item__append"
          }, [i.append ? f(it, {
            key: "append-defaults",
            disabled: !Qe,
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
              var Ge;
              return [(Ge = i.append) == null ? void 0 : Ge.call(i, ye.value)];
            }
          }) : f(Ce, null, [e.appendIcon && f(We, {
            key: "append-icon",
            density: e.density,
            icon: e.appendIcon
          }, null), e.appendAvatar && f(Vi, {
            key: "append-avatar",
            density: e.density,
            image: e.appendAvatar
          }, null)]), f("div", {
            class: "v-list-item__spacer"
          }, null)])];
        }
      }), [[Di("ripple"), x.value && e.ripple]]);
    }), {
      activate: l,
      isActivated: a,
      isGroupActivator: v,
      isSelected: c,
      list: O,
      select: d,
      root: g,
      id: C
    };
  }
}), vb = W({
  color: String,
  inset: Boolean,
  sticky: Boolean,
  title: String,
  ...pe(),
  ...je()
}, "VListSubheader"), gb = se()({
  name: "VListSubheader",
  props: vb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      textColorClasses: i,
      textColorStyles: o
    } = Ht(ie(e, "color"));
    return ge(() => {
      const r = !!(n.default || e.title);
      return f(e.tag, {
        class: ["v-list-subheader", {
          "v-list-subheader--inset": e.inset,
          "v-list-subheader--sticky": e.sticky
        }, i.value, e.class],
        style: [{
          textColorStyles: o
        }, e.style]
      }, {
        default: () => {
          var s;
          return [r && f("div", {
            class: "v-list-subheader__text"
          }, [((s = n.default) == null ? void 0 : s.call(n)) ?? e.title])];
        }
      });
    }), {};
  }
}), hb = W({
  items: Array,
  returnObject: Boolean
}, "VListChildren"), wf = se()({
  name: "VListChildren",
  props: hb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return mf(), () => {
      var i, o;
      return ((i = n.default) == null ? void 0 : i.call(n)) ?? ((o = e.items) == null ? void 0 : o.map((r) => {
        var m, v;
        let {
          children: s,
          props: l,
          type: a,
          raw: d
        } = r;
        if (a === "divider")
          return ((m = n.divider) == null ? void 0 : m.call(n, {
            props: l
          })) ?? f(fn, l, null);
        if (a === "subheader")
          return ((v = n.subheader) == null ? void 0 : v.call(n, {
            props: l
          })) ?? f(gb, l, null);
        const u = {
          subtitle: n.subtitle ? (g) => {
            var h;
            return (h = n.subtitle) == null ? void 0 : h.call(n, {
              ...g,
              item: d
            });
          } : void 0,
          prepend: n.prepend ? (g) => {
            var h;
            return (h = n.prepend) == null ? void 0 : h.call(n, {
              ...g,
              item: d
            });
          } : void 0,
          append: n.append ? (g) => {
            var h;
            return (h = n.append) == null ? void 0 : h.call(n, {
              ...g,
              item: d
            });
          } : void 0,
          title: n.title ? (g) => {
            var h;
            return (h = n.title) == null ? void 0 : h.call(n, {
              ...g,
              item: d
            });
          } : void 0
        }, c = mr.filterProps(l);
        return s ? f(mr, Ee({
          value: l == null ? void 0 : l.value
        }, c), {
          activator: (g) => {
            let {
              props: h
            } = g;
            const w = {
              ...l,
              ...h,
              value: e.returnObject ? d : l.value
            };
            return n.header ? n.header({
              props: w
            }) : f(Le, w, u);
          },
          default: () => f(wf, {
            items: s,
            returnObject: e.returnObject
          }, n)
        }) : n.item ? n.item({
          props: l
        }) : f(Le, Ee(l, {
          value: e.returnObject ? d : l.value
        }), u);
      }));
    };
  }
}), pb = W({
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
    default: Or
  }
}, "list-items");
function yb(e) {
  return typeof e == "string" || typeof e == "number" || typeof e == "boolean";
}
function bb(e, t) {
  const n = Bi(t, e.itemType, "item"), i = yb(t) ? t : Bi(t, e.itemTitle), o = Bi(t, e.itemValue, void 0), r = Bi(t, e.itemChildren), s = e.itemProps === !0 ? id(t, ["children"]) : Bi(t, e.itemProps), l = {
    title: i,
    value: o,
    ...s
  };
  return {
    type: n,
    title: l.title,
    value: l.value,
    props: l,
    children: n === "item" && r ? Sf(e, r) : void 0,
    raw: t
  };
}
function Sf(e, t) {
  const n = [];
  for (const i of t)
    n.push(bb(e, i));
  return n;
}
function _b(e) {
  return {
    items: y(() => Sf(e, e.items))
  };
}
const wb = W({
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
  "onClick:open": Ot(),
  "onClick:select": Ot(),
  "onUpdate:opened": Ot(),
  ...lb({
    selectStrategy: "single-leaf",
    openStrategy: "list"
  }),
  ...Ln(),
  ...pe(),
  ...tn(),
  ...bn(),
  ...Sn(),
  itemType: {
    type: String,
    default: "type"
  },
  ...pb(),
  ...bt(),
  ...je(),
  ...Xe(),
  ...di({
    variant: "text"
  })
}, "VList"), oi = se()({
  name: "VList",
  props: wb(),
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
      items: i
    } = _b(e), {
      themeClasses: o
    } = lt(e), {
      backgroundColorClasses: r,
      backgroundColorStyles: s
    } = Dt(ie(e, "bgColor")), {
      borderClasses: l
    } = Bn(e), {
      densityClasses: a
    } = wn(e), {
      dimensionStyles: d
    } = _n(e), {
      elevationClasses: u
    } = En(e), {
      roundedClasses: c
    } = _t(e), {
      children: m,
      open: v,
      parents: g,
      select: h,
      getPath: w
    } = ab(e), C = y(() => e.lines ? `v-list--${e.lines}-line` : void 0), O = ie(e, "activeColor"), P = ie(e, "baseColor"), M = ie(e, "color");
    mf(), Ti({
      VListGroup: {
        activeColor: O,
        baseColor: P,
        color: M,
        expandIcon: ie(e, "expandIcon"),
        collapseIcon: ie(e, "collapseIcon")
      },
      VListItem: {
        activeClass: ie(e, "activeClass"),
        activeColor: O,
        baseColor: P,
        color: M,
        density: ie(e, "density"),
        disabled: ie(e, "disabled"),
        lines: ie(e, "lines"),
        nav: ie(e, "nav"),
        slim: ie(e, "slim"),
        variant: ie(e, "variant")
      }
    });
    const x = he(!1), N = ue();
    function $(T) {
      x.value = !0;
    }
    function E(T) {
      x.value = !1;
    }
    function V(T) {
      var B;
      !x.value && !(T.relatedTarget && ((B = N.value) != null && B.contains(T.relatedTarget))) && S();
    }
    function L(T) {
      const B = T.target;
      if (!(!N.value || ["INPUT", "TEXTAREA"].includes(B.tagName))) {
        if (T.key === "ArrowDown")
          S("next");
        else if (T.key === "ArrowUp")
          S("prev");
        else if (T.key === "Home")
          S("first");
        else if (T.key === "End")
          S("last");
        else
          return;
        T.preventDefault();
      }
    }
    function A(T) {
      x.value = !0;
    }
    function S(T) {
      if (N.value)
        return ad(N.value, T);
    }
    return ge(() => f(e.tag, {
      ref: N,
      class: ["v-list", {
        "v-list--disabled": e.disabled,
        "v-list--nav": e.nav,
        "v-list--slim": e.slim
      }, o.value, r.value, l.value, a.value, u.value, C.value, c.value, e.class],
      style: [s.value, d.value, e.style],
      tabindex: e.disabled || x.value ? -1 : 0,
      role: "listbox",
      "aria-activedescendant": void 0,
      onFocusin: $,
      onFocusout: E,
      onFocus: V,
      onKeydown: L,
      onMousedown: A
    }, {
      default: () => [f(wf, {
        items: i.value,
        returnObject: e.returnObject
      }, n)]
    })), {
      open: v,
      select: h,
      focus: S,
      children: m,
      parents: g,
      getPath: w
    };
  }
}), Sb = W({
  active: Boolean,
  disabled: Boolean,
  max: [Number, String],
  value: {
    type: [Number, String],
    default: 0
  },
  ...pe(),
  ...bo({
    transition: {
      component: df
    }
  })
}, "VCounter"), Eb = se()({
  name: "VCounter",
  functional: !0,
  props: Sb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => e.max ? `${e.value} / ${e.max}` : String(e.value));
    return ge(() => f(cn, {
      transition: e.transition
    }, {
      default: () => [Nt(f("div", {
        class: ["v-counter", {
          "text-error": e.max && !e.disabled && parseFloat(e.value) > parseFloat(e.max)
        }, e.class],
        style: e.style
      }, [n.default ? n.default({
        counter: i.value,
        max: e.max,
        value: e.value
      }) : i.value]), [[Mn, e.active]])]
    })), {};
  }
}), Cb = W({
  text: String,
  onClick: Ot(),
  ...pe(),
  ...Xe()
}, "VLabel"), Ef = se()({
  name: "VLabel",
  props: Cb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return ge(() => {
      var i;
      return f("label", {
        class: ["v-label", {
          "v-label--clickable": !!e.onClick
        }, e.class],
        style: e.style,
        onClick: e.onClick
      }, [e.text, (i = n.default) == null ? void 0 : i.call(n)]);
    }), {};
  }
}), kb = W({
  floating: Boolean,
  ...pe()
}, "VFieldLabel"), Io = se()({
  name: "VFieldLabel",
  props: kb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return ge(() => f(Ef, {
      class: ["v-field-label", {
        "v-field-label--floating": e.floating
      }, e.class],
      style: e.style,
      "aria-hidden": e.floating || void 0
    }, n)), {};
  }
});
function Cf(e) {
  const {
    t
  } = bl();
  function n(i) {
    let {
      name: o
    } = i;
    const r = {
      prepend: "prependAction",
      prependInner: "prependAction",
      append: "appendAction",
      appendInner: "appendAction",
      clear: "clear"
    }[o], s = e[`onClick:${o}`], l = s && r ? t(`$vuetify.input.${r}`, e.label ?? "") : void 0;
    return f(We, {
      icon: e[`${o}Icon`],
      "aria-label": l,
      onClick: s
    }, null);
  }
  return {
    InputIcon: n
  };
}
const Il = W({
  focused: Boolean,
  "onUpdate:focused": Ot()
}, "focus");
function $l(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt();
  const n = nt(e, "focused"), i = y(() => ({
    [`${t}--focused`]: n.value
  }));
  function o() {
    n.value = !0;
  }
  function r() {
    n.value = !1;
  }
  return {
    focusClasses: i,
    isFocused: n,
    focus: o,
    blur: r
  };
}
const Nb = ["underlined", "outlined", "filled", "solo", "solo-inverted", "solo-filled", "plain"], kf = W({
  appendInnerIcon: He,
  bgColor: String,
  clearable: Boolean,
  clearIcon: {
    type: He,
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
  prependInnerIcon: He,
  reverse: Boolean,
  singleLine: Boolean,
  variant: {
    type: String,
    default: "filled",
    validator: (e) => Nb.includes(e)
  },
  "onClick:clear": Ot(),
  "onClick:appendInner": Ot(),
  "onClick:prependInner": Ot(),
  ...pe(),
  ...El(),
  ...bt(),
  ...Xe()
}, "VField"), Nf = se()({
  name: "VField",
  inheritAttrs: !1,
  props: {
    id: String,
    ...Il(),
    ...kf()
  },
  emits: {
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      emit: i,
      slots: o
    } = t;
    const {
      themeClasses: r
    } = lt(e), {
      loaderClasses: s
    } = Cl(e), {
      focusClasses: l,
      isFocused: a,
      focus: d,
      blur: u
    } = $l(e), {
      InputIcon: c
    } = Cf(e), {
      roundedClasses: m
    } = _t(e), {
      rtlClasses: v
    } = en(), g = y(() => e.dirty || e.active), h = y(() => !e.singleLine && !!(e.label || o.label)), w = Fn(), C = y(() => e.id || `input-${w}`), O = y(() => `${C.value}-messages`), P = ue(), M = ue(), x = ue(), N = y(() => ["plain", "underlined"].includes(e.variant)), {
      backgroundColorClasses: $,
      backgroundColorStyles: E
    } = Dt(ie(e, "bgColor")), {
      textColorClasses: V,
      textColorStyles: L
    } = Ht(y(() => e.error || e.disabled ? void 0 : g.value && a.value ? e.color : e.baseColor));
    ve(g, (B) => {
      if (h.value) {
        const Z = P.value.$el, Q = M.value.$el;
        requestAnimationFrame(() => {
          const X = gl(Z), q = Q.getBoundingClientRect(), ye = q.x - X.x, be = q.y - X.y - (X.height / 2 - q.height / 2), fe = q.width / 0.75, ne = Math.abs(fe - X.width) > 1 ? {
            maxWidth: oe(fe)
          } : void 0, xe = getComputedStyle(Z), Je = getComputedStyle(Q), Qe = parseFloat(xe.transitionDuration) * 1e3 || 150, Y = parseFloat(Je.getPropertyValue("--v-field-label-scale")), ce = Je.getPropertyValue("color");
          Z.style.visibility = "visible", Q.style.visibility = "hidden", yi(Z, {
            transform: `translate(${ye}px, ${be}px) scale(${Y})`,
            color: ce,
            ...ne
          }, {
            duration: Qe,
            easing: lr,
            direction: B ? "normal" : "reverse"
          }).finished.then(() => {
            Z.style.removeProperty("visibility"), Q.style.removeProperty("visibility");
          });
        });
      }
    }, {
      flush: "post"
    });
    const A = y(() => ({
      isActive: g,
      isFocused: a,
      controlRef: x,
      blur: u,
      focus: d
    }));
    function S(B) {
      B.target !== document.activeElement && B.preventDefault();
    }
    function T(B) {
      var Z;
      B.key !== "Enter" && B.key !== " " || (B.preventDefault(), B.stopPropagation(), (Z = e["onClick:clear"]) == null || Z.call(e, new MouseEvent("click")));
    }
    return ge(() => {
      var ye, be, fe;
      const B = e.variant === "outlined", Z = !!(o["prepend-inner"] || e.prependInnerIcon), Q = !!(e.clearable || o.clear), X = !!(o["append-inner"] || e.appendInnerIcon || Q), q = () => o.label ? o.label({
        ...A.value,
        label: e.label,
        props: {
          for: C.value
        }
      }) : e.label;
      return f("div", Ee({
        class: ["v-field", {
          "v-field--active": g.value,
          "v-field--appended": X,
          "v-field--center-affix": e.centerAffix ?? !N.value,
          "v-field--disabled": e.disabled,
          "v-field--dirty": e.dirty,
          "v-field--error": e.error,
          "v-field--flat": e.flat,
          "v-field--has-background": !!e.bgColor,
          "v-field--persistent-clear": e.persistentClear,
          "v-field--prepended": Z,
          "v-field--reverse": e.reverse,
          "v-field--single-line": e.singleLine,
          "v-field--no-label": !q(),
          [`v-field--variant-${e.variant}`]: !0
        }, r.value, $.value, l.value, s.value, m.value, v.value, e.class],
        style: [E.value, e.style],
        onClick: S
      }, n), [f("div", {
        class: "v-field__overlay"
      }, null), f(Hd, {
        name: "v-field",
        active: !!e.loading,
        color: e.error ? "error" : typeof e.loading == "string" ? e.loading : e.color
      }, {
        default: o.loader
      }), Z && f("div", {
        key: "prepend",
        class: "v-field__prepend-inner"
      }, [e.prependInnerIcon && f(c, {
        key: "prepend-icon",
        name: "prependInner"
      }, null), (ye = o["prepend-inner"]) == null ? void 0 : ye.call(o, A.value)]), f("div", {
        class: "v-field__field",
        "data-no-activator": ""
      }, [["filled", "solo", "solo-inverted", "solo-filled"].includes(e.variant) && h.value && f(Io, {
        key: "floating-label",
        ref: M,
        class: [V.value],
        floating: !0,
        for: C.value,
        style: L.value
      }, {
        default: () => [q()]
      }), f(Io, {
        ref: P,
        for: C.value
      }, {
        default: () => [q()]
      }), (be = o.default) == null ? void 0 : be.call(o, {
        ...A.value,
        props: {
          id: C.value,
          class: "v-field__input",
          "aria-describedby": O.value
        },
        focus: d,
        blur: u
      })]), Q && f(Qy, {
        key: "clear"
      }, {
        default: () => [Nt(f("div", {
          class: "v-field__clearable",
          onMousedown: (ne) => {
            ne.preventDefault(), ne.stopPropagation();
          }
        }, [f(it, {
          defaults: {
            VIcon: {
              icon: e.clearIcon
            }
          }
        }, {
          default: () => [o.clear ? o.clear({
            ...A.value,
            props: {
              onKeydown: T,
              onFocus: d,
              onBlur: u,
              onClick: e["onClick:clear"]
            }
          }) : f(c, {
            name: "clear",
            onKeydown: T,
            onFocus: d,
            onBlur: u
          }, null)]
        })]), [[Mn, e.dirty]])]
      }), X && f("div", {
        key: "append",
        class: "v-field__append-inner"
      }, [(fe = o["append-inner"]) == null ? void 0 : fe.call(o, A.value), e.appendInnerIcon && f(c, {
        key: "append-icon",
        name: "appendInner"
      }, null)]), f("div", {
        class: ["v-field__outline", V.value],
        style: L.value
      }, [B && f(Ce, null, [f("div", {
        class: "v-field__outline__start"
      }, null), h.value && f("div", {
        class: "v-field__outline__notch"
      }, [f(Io, {
        ref: M,
        floating: !0,
        for: C.value
      }, {
        default: () => [q()]
      })]), f("div", {
        class: "v-field__outline__end"
      }, null)]), N.value && h.value && f(Io, {
        ref: M,
        floating: !0,
        for: C.value
      }, {
        default: () => [q()]
      })])]);
    }), {
      controlRef: x
    };
  }
});
function xb(e) {
  const t = Object.keys(Nf.props).filter((n) => !ml(n) && n !== "class" && n !== "style");
  return nd(e, t);
}
const Vb = W({
  active: Boolean,
  color: String,
  messages: {
    type: [Array, String],
    default: () => []
  },
  ...pe(),
  ...bo({
    transition: {
      component: df,
      leaveAbsolute: !0,
      group: !0
    }
  })
}, "VMessages"), Ob = se()({
  name: "VMessages",
  props: Vb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => ti(e.messages)), {
      textColorClasses: o,
      textColorStyles: r
    } = Ht(y(() => e.color));
    return ge(() => f(cn, {
      transition: e.transition,
      tag: "div",
      class: ["v-messages", o.value, e.class],
      style: [r.value, e.style],
      role: "alert",
      "aria-live": "polite"
    }, {
      default: () => [e.active && i.value.map((s, l) => f("div", {
        class: "v-messages__message",
        key: `${l}-${i.value}`
      }, [n.message ? n.message({
        message: s
      }) : s]))]
    })), {};
  }
}), xf = Symbol.for("vuetify:form"), Db = W({
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
function Tb(e) {
  const t = nt(e, "modelValue"), n = y(() => e.disabled), i = y(() => e.readonly), o = he(!1), r = ue([]), s = ue([]);
  async function l() {
    const u = [];
    let c = !0;
    s.value = [], o.value = !0;
    for (const m of r.value) {
      const v = await m.validate();
      if (v.length > 0 && (c = !1, u.push({
        id: m.id,
        errorMessages: v
      })), !c && e.fastFail) break;
    }
    return s.value = u, o.value = !1, {
      valid: c,
      errors: s.value
    };
  }
  function a() {
    r.value.forEach((u) => u.reset());
  }
  function d() {
    r.value.forEach((u) => u.resetValidation());
  }
  return ve(r, () => {
    let u = 0, c = 0;
    const m = [];
    for (const v of r.value)
      v.isValid === !1 ? (c++, m.push({
        id: v.id,
        errorMessages: v.errorMessages
      })) : v.isValid === !0 && u++;
    s.value = m, t.value = c > 0 ? !1 : u === r.value.length ? !0 : null;
  }, {
    deep: !0,
    flush: "post"
  }), gt(xf, {
    register: (u) => {
      let {
        id: c,
        vm: m,
        validate: v,
        reset: g,
        resetValidation: h
      } = u;
      r.value.some((w) => w.id === c) && dn(`Duplicate input name "${c}"`), r.value.push({
        id: c,
        validate: v,
        reset: g,
        resetValidation: h,
        vm: Ku(m),
        isValid: null,
        errorMessages: []
      });
    },
    unregister: (u) => {
      r.value = r.value.filter((c) => c.id !== u);
    },
    update: (u, c, m) => {
      const v = r.value.find((g) => g.id === u);
      v && (v.isValid = c, v.errorMessages = m);
    },
    isDisabled: n,
    isReadonly: i,
    isValidating: o,
    isValid: t,
    items: r,
    validateOn: ie(e, "validateOn")
  }), {
    errors: s,
    isDisabled: n,
    isReadonly: i,
    isValidating: o,
    isValid: t,
    items: r,
    validate: l,
    reset: a,
    resetValidation: d
  };
}
function Pb() {
  return Re(xf, null);
}
const Ab = W({
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
  ...Il()
}, "validation");
function Ib(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qt(), n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Fn();
  const i = nt(e, "modelValue"), o = y(() => e.validationValue === void 0 ? i.value : e.validationValue), r = Pb(), s = ue([]), l = he(!0), a = y(() => !!(ti(i.value === "" ? null : i.value).length || ti(o.value === "" ? null : o.value).length)), d = y(() => !!(e.disabled ?? (r == null ? void 0 : r.isDisabled.value))), u = y(() => !!(e.readonly ?? (r == null ? void 0 : r.isReadonly.value))), c = y(() => {
    var x;
    return (x = e.errorMessages) != null && x.length ? ti(e.errorMessages).concat(s.value).slice(0, Math.max(0, +e.maxErrors)) : s.value;
  }), m = y(() => {
    let x = (e.validateOn ?? (r == null ? void 0 : r.validateOn.value)) || "input";
    x === "lazy" && (x = "input lazy"), x === "eager" && (x = "input eager");
    const N = new Set((x == null ? void 0 : x.split(" ")) ?? []);
    return {
      input: N.has("input"),
      blur: N.has("blur") || N.has("input") || N.has("invalid-input"),
      invalidInput: N.has("invalid-input"),
      lazy: N.has("lazy"),
      eager: N.has("eager")
    };
  }), v = y(() => {
    var x;
    return e.error || (x = e.errorMessages) != null && x.length ? !1 : e.rules.length ? l.value ? s.value.length || m.value.lazy ? null : !0 : !s.value.length : !0;
  }), g = he(!1), h = y(() => ({
    [`${t}--error`]: v.value === !1,
    [`${t}--dirty`]: a.value,
    [`${t}--disabled`]: d.value,
    [`${t}--readonly`]: u.value
  })), w = ze("validation"), C = y(() => e.name ?? Xt(n));
  tl(() => {
    r == null || r.register({
      id: C.value,
      vm: w,
      validate: M,
      reset: O,
      resetValidation: P
    });
  }), yt(() => {
    r == null || r.unregister(C.value);
  }), In(async () => {
    m.value.lazy || await M(!m.value.eager), r == null || r.update(C.value, v.value, c.value);
  }), ai(() => m.value.input || m.value.invalidInput && v.value === !1, () => {
    ve(o, () => {
      if (o.value != null)
        M();
      else if (e.focused) {
        const x = ve(() => e.focused, (N) => {
          N || M(), x();
        });
      }
    });
  }), ai(() => m.value.blur, () => {
    ve(() => e.focused, (x) => {
      x || M();
    });
  }), ve([v, c], () => {
    r == null || r.update(C.value, v.value, c.value);
  });
  async function O() {
    i.value = null, await At(), await P();
  }
  async function P() {
    l.value = !0, m.value.lazy ? s.value = [] : await M(!m.value.eager);
  }
  async function M() {
    let x = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !1;
    const N = [];
    g.value = !0;
    for (const $ of e.rules) {
      if (N.length >= +(e.maxErrors ?? 1))
        break;
      const V = await (typeof $ == "function" ? $ : () => $)(o.value);
      if (V !== !0) {
        if (V !== !1 && typeof V != "string") {
          console.warn(`${V} is not a valid value. Rule functions must return boolean true or a string.`);
          continue;
        }
        N.push(V || "");
      }
    }
    return s.value = N, g.value = !1, l.value = x, s.value;
  }
  return {
    errorMessages: c,
    isDirty: a,
    isDisabled: d,
    isReadonly: u,
    isPristine: l,
    isValid: v,
    isValidating: g,
    reset: O,
    resetValidation: P,
    validate: M,
    validationClasses: h
  };
}
const Ml = W({
  id: String,
  appendIcon: He,
  centerAffix: {
    type: Boolean,
    default: !0
  },
  prependIcon: He,
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
  "onClick:prepend": Ot(),
  "onClick:append": Ot(),
  ...pe(),
  ...tn(),
  ...oh(bn(), ["maxWidth", "minWidth", "width"]),
  ...Xe(),
  ...Ab()
}, "VInput"), vr = se()({
  name: "VInput",
  props: {
    ...Ml()
  },
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: i,
      emit: o
    } = t;
    const {
      densityClasses: r
    } = wn(e), {
      dimensionStyles: s
    } = _n(e), {
      themeClasses: l
    } = lt(e), {
      rtlClasses: a
    } = en(), {
      InputIcon: d
    } = Cf(e), u = Fn(), c = y(() => e.id || `input-${u}`), m = y(() => `${c.value}-messages`), {
      errorMessages: v,
      isDirty: g,
      isDisabled: h,
      isReadonly: w,
      isPristine: C,
      isValid: O,
      isValidating: P,
      reset: M,
      resetValidation: x,
      validate: N,
      validationClasses: $
    } = Ib(e, "v-input", c), E = y(() => ({
      id: c,
      messagesId: m,
      isDirty: g,
      isDisabled: h,
      isReadonly: w,
      isPristine: C,
      isValid: O,
      isValidating: P,
      reset: M,
      resetValidation: x,
      validate: N
    })), V = y(() => {
      var L;
      return (L = e.errorMessages) != null && L.length || !C.value && v.value.length ? v.value : e.hint && (e.persistentHint || e.focused) ? e.hint : e.messages;
    });
    return ge(() => {
      var B, Z, Q, X;
      const L = !!(i.prepend || e.prependIcon), A = !!(i.append || e.appendIcon), S = V.value.length > 0, T = !e.hideDetails || e.hideDetails === "auto" && (S || !!i.details);
      return f("div", {
        class: ["v-input", `v-input--${e.direction}`, {
          "v-input--center-affix": e.centerAffix,
          "v-input--hide-spin-buttons": e.hideSpinButtons
        }, r.value, l.value, a.value, $.value, e.class],
        style: [s.value, e.style]
      }, [L && f("div", {
        key: "prepend",
        class: "v-input__prepend"
      }, [(B = i.prepend) == null ? void 0 : B.call(i, E.value), e.prependIcon && f(d, {
        key: "prepend-icon",
        name: "prepend"
      }, null)]), i.default && f("div", {
        class: "v-input__control"
      }, [(Z = i.default) == null ? void 0 : Z.call(i, E.value)]), A && f("div", {
        key: "append",
        class: "v-input__append"
      }, [e.appendIcon && f(d, {
        key: "append-icon",
        name: "append"
      }, null), (Q = i.append) == null ? void 0 : Q.call(i, E.value)]), T && f("div", {
        class: "v-input__details"
      }, [f(Ob, {
        id: m.value,
        active: S,
        messages: V.value
      }, {
        message: i.message
      }), (X = i.details) == null ? void 0 : X.call(i, E.value)])]);
    }), {
      reset: M,
      resetValidation: x,
      validate: N,
      isValid: O,
      errorMessages: v
    };
  }
}), is = Symbol("Forwarded refs");
function os(e, t) {
  let n = e;
  for (; n; ) {
    const i = Reflect.getOwnPropertyDescriptor(n, t);
    if (i) return i;
    n = Object.getPrototypeOf(n);
  }
}
function Fl(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
    n[i - 1] = arguments[i];
  return e[is] = n, new Proxy(e, {
    get(o, r) {
      if (Reflect.has(o, r))
        return Reflect.get(o, r);
      if (!(typeof r == "symbol" || r.startsWith("$") || r.startsWith("__"))) {
        for (const s of n)
          if (s.value && Reflect.has(s.value, r)) {
            const l = Reflect.get(s.value, r);
            return typeof l == "function" ? l.bind(s.value) : l;
          }
      }
    },
    has(o, r) {
      if (Reflect.has(o, r))
        return !0;
      if (typeof r == "symbol" || r.startsWith("$") || r.startsWith("__")) return !1;
      for (const s of n)
        if (s.value && Reflect.has(s.value, r))
          return !0;
      return !1;
    },
    set(o, r, s) {
      if (Reflect.has(o, r))
        return Reflect.set(o, r, s);
      if (typeof r == "symbol" || r.startsWith("$") || r.startsWith("__")) return !1;
      for (const l of n)
        if (l.value && Reflect.has(l.value, r))
          return Reflect.set(l.value, r, s);
      return !1;
    },
    getOwnPropertyDescriptor(o, r) {
      var l;
      const s = Reflect.getOwnPropertyDescriptor(o, r);
      if (s) return s;
      if (!(typeof r == "symbol" || r.startsWith("$") || r.startsWith("__"))) {
        for (const a of n) {
          if (!a.value) continue;
          const d = os(a.value, r) ?? ("_" in a.value ? os((l = a.value._) == null ? void 0 : l.setupState, r) : void 0);
          if (d) return d;
        }
        for (const a of n) {
          const d = a.value && a.value[is];
          if (!d) continue;
          const u = d.slice();
          for (; u.length; ) {
            const c = u.shift(), m = os(c.value, r);
            if (m) return m;
            const v = c.value && c.value[is];
            v && u.push(...v);
          }
        }
      }
    }
  });
}
const $b = ["color", "file", "time", "date", "datetime-local", "week", "month"], Mb = W({
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
  ...Ml(),
  ...kf()
}, "VTextField"), qt = se()({
  name: "VTextField",
  directives: {
    Intersect: Id
  },
  inheritAttrs: !1,
  props: Mb(),
  emits: {
    "click:control": (e) => !0,
    "mousedown:control": (e) => !0,
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      emit: i,
      slots: o
    } = t;
    const r = nt(e, "modelValue"), {
      isFocused: s,
      focus: l,
      blur: a
    } = $l(e), d = y(() => typeof e.counterValue == "function" ? e.counterValue(r.value) : typeof e.counterValue == "number" ? e.counterValue : (r.value ?? "").toString().length), u = y(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    }), c = y(() => ["plain", "underlined"].includes(e.variant));
    function m(N, $) {
      var E, V;
      !e.autofocus || !N || (V = (E = $[0].target) == null ? void 0 : E.focus) == null || V.call(E);
    }
    const v = ue(), g = ue(), h = ue(), w = y(() => $b.includes(e.type) || e.persistentPlaceholder || s.value || e.active);
    function C() {
      var N;
      h.value !== document.activeElement && ((N = h.value) == null || N.focus()), s.value || l();
    }
    function O(N) {
      i("mousedown:control", N), N.target !== h.value && (C(), N.preventDefault());
    }
    function P(N) {
      C(), i("click:control", N);
    }
    function M(N) {
      N.stopPropagation(), C(), At(() => {
        r.value = null, ah(e["onClick:clear"], N);
      });
    }
    function x(N) {
      var E;
      const $ = N.target;
      if (r.value = $.value, (E = e.modelModifiers) != null && E.trim && ["text", "search", "password", "tel", "url"].includes(e.type)) {
        const V = [$.selectionStart, $.selectionEnd];
        At(() => {
          $.selectionStart = V[0], $.selectionEnd = V[1];
        });
      }
    }
    return ge(() => {
      const N = !!(o.counter || e.counter !== !1 && e.counter != null), $ = !!(N || o.details), [E, V] = sh(n), {
        modelValue: L,
        ...A
      } = vr.filterProps(e), S = xb(e);
      return f(vr, Ee({
        ref: v,
        modelValue: r.value,
        "onUpdate:modelValue": (T) => r.value = T,
        class: ["v-text-field", {
          "v-text-field--prefixed": e.prefix,
          "v-text-field--suffixed": e.suffix,
          "v-input--plain-underlined": c.value
        }, e.class],
        style: e.style
      }, E, A, {
        centerAffix: !c.value,
        focused: s.value
      }), {
        ...o,
        default: (T) => {
          let {
            id: B,
            isDisabled: Z,
            isDirty: Q,
            isReadonly: X,
            isValid: q
          } = T;
          return f(Nf, Ee({
            ref: g,
            onMousedown: O,
            onClick: P,
            "onClick:clear": M,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"],
            role: e.role
          }, S, {
            id: B.value,
            active: w.value || Q.value,
            dirty: Q.value || e.dirty,
            disabled: Z.value,
            focused: s.value,
            error: q.value === !1
          }), {
            ...o,
            default: (ye) => {
              let {
                props: {
                  class: be,
                  ...fe
                }
              } = ye;
              const ne = Nt(f("input", Ee({
                ref: h,
                value: r.value,
                onInput: x,
                autofocus: e.autofocus,
                readonly: X.value,
                disabled: Z.value,
                name: e.name,
                placeholder: e.placeholder,
                size: 1,
                type: e.type,
                onFocus: C,
                onBlur: a
              }, fe, V), null), [[Di("intersect"), {
                handler: m
              }, null, {
                once: !0
              }]]);
              return f(Ce, null, [e.prefix && f("span", {
                class: "v-text-field__prefix"
              }, [f("span", {
                class: "v-text-field__prefix__text"
              }, [e.prefix])]), o.default ? f("div", {
                class: be,
                "data-no-activator": ""
              }, [o.default(), ne]) : Rt(ne, {
                class: be
              }), e.suffix && f("span", {
                class: "v-text-field__suffix"
              }, [f("span", {
                class: "v-text-field__suffix__text"
              }, [e.suffix])])]);
            }
          });
        },
        details: $ ? (T) => {
          var B;
          return f(Ce, null, [(B = o.details) == null ? void 0 : B.call(o, T), N && f(Ce, null, [f("span", null, null), f(Eb, {
            active: e.persistentCounter || s.value,
            value: d.value,
            max: u.value,
            disabled: e.disabled
          }, o.counter)])]);
        } : void 0
      });
    }), Fl({}, v, g, h);
  }
}), Fb = {
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
function Lb(e, t, n, i, o, r) {
  return _e(), ke(Kt, null, {
    default: k(() => [
      f(an, null, {
        default: k(() => [
          f(Ue, {
            offset: "2",
            cols: "8",
            class: "text-center"
          }, {
            default: k(() => t[4] || (t[4] = [
              Oe("h4", { class: "mt-3" }, "评论列表", -1)
            ])),
            _: 1
          }),
          f(Ue, { cols: "2" }, {
            default: k(() => [
              f(me, {
                variant: "plain",
                icon: "mdi-close",
                onClick: t[0] || (t[0] = (s) => e.$emit("close"))
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      f(fn),
      n.comments.length == 0 ? (_e(), ke(oi, {
        key: 0,
        density: "compact"
      }, {
        default: k(() => [
          f(Le, { class: "my-4" }, {
            default: k(() => [
              f(Al, { class: "text-center" }, {
                default: k(() => t[5] || (t[5] = [
                  ae("尚未有人发表评论")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : (_e(), ke(oi, {
        key: 1,
        id: "book-comments",
        density: "compact"
      }, {
        default: k(() => [
          (_e(!0), Yn(Ce, null, Ei(n.comments, (s) => (_e(), ke(Le, {
            class: "pr-0 align-self-start mb-4",
            "prepend-avatar": s.avatar,
            "append-icon": "mdi-thumb-up",
            subtitle: s.nickName
          }, {
            prepend: k(() => [
              f(Vi, {
                variant: "outlined",
                size: "large",
                color: "grey",
                class: "text-center",
                icon: s.avatar
              }, null, 8, ["icon"])
            ]),
            append: k(() => [
              f(me, {
                class: "px-0",
                size: "small",
                variant: "plain",
                stacked: "",
                "prepend-icon": "mdi-thumb-up"
              }, {
                default: k(() => [
                  ae(ft(s.likeCount), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            default: k(() => [
              ae(ft(s.content) + " ", 1),
              f(_f, null, {
                default: k(() => [
                  ae(ft(s.level) + "楼 * " + ft(s.createTime) + " * " + ft(s.geo), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            _: 2
          }, 1032, ["prepend-avatar", "subtitle"]))), 256))
        ]),
        _: 1
      })),
      f(Ji, { class: "my-2 py-0 px-2" }, {
        default: k(() => [
          n.login ? (_e(), ke(an, { key: 1 }, {
            default: k(() => [
              f(Ue, { cols: "9" }, {
                default: k(() => [
                  f(qt, {
                    modelValue: e.content,
                    "onUpdate:modelValue": t[2] || (t[2] = (s) => e.content = s),
                    density: "compact",
                    "single-line": "",
                    "hide-details": "",
                    placeholder: "爱书之人，维持良好的社区氛围"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              f(Ue, { cols: "3" }, {
                default: k(() => [
                  f(me, {
                    onClick: t[3] || (t[3] = (s) => e.$emit("add_review", this.content))
                  }, {
                    default: k(() => t[7] || (t[7] = [
                      ae("发表")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (_e(), ke(me, {
            key: 0,
            onClick: t[1] || (t[1] = (s) => n.login = !n.login),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: k(() => t[6] || (t[6] = [
              ae("点击登录，发表评论")
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
const Bb = /* @__PURE__ */ ci(Fb, [["render", Lb]]), Rb = Dr("v-alert-title"), Hb = ["success", "info", "warning", "error"], jb = W({
  border: {
    type: [Boolean, String],
    validator: (e) => typeof e == "boolean" || ["top", "end", "bottom", "start"].includes(e)
  },
  borderColor: String,
  closable: Boolean,
  closeIcon: {
    type: He,
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
    validator: (e) => Hb.includes(e)
  },
  ...pe(),
  ...tn(),
  ...bn(),
  ...Sn(),
  ...So(),
  ...kl(),
  ...bt(),
  ...je(),
  ...Xe(),
  ...di({
    variant: "flat"
  })
}, "VAlert"), Vf = se()({
  name: "VAlert",
  props: jb(),
  emits: {
    "click:close": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      emit: n,
      slots: i
    } = t;
    const o = nt(e, "modelValue"), r = y(() => {
      if (e.icon !== !1)
        return e.type ? e.icon ?? `$${e.type}` : e.icon;
    }), s = y(() => ({
      color: e.color ?? e.type,
      variant: e.variant
    })), {
      themeClasses: l
    } = lt(e), {
      colorClasses: a,
      colorStyles: d,
      variantClasses: u
    } = wo(s), {
      densityClasses: c
    } = wn(e), {
      dimensionStyles: m
    } = _n(e), {
      elevationClasses: v
    } = En(e), {
      locationStyles: g
    } = Eo(e), {
      positionClasses: h
    } = Nl(e), {
      roundedClasses: w
    } = _t(e), {
      textColorClasses: C,
      textColorStyles: O
    } = Ht(ie(e, "borderColor")), {
      t: P
    } = bl(), M = y(() => ({
      "aria-label": P(e.closeLabel),
      onClick(x) {
        o.value = !1, n("click:close", x);
      }
    }));
    return () => {
      const x = !!(i.prepend || r.value), N = !!(i.title || e.title), $ = !!(i.close || e.closable);
      return o.value && f(e.tag, {
        class: ["v-alert", e.border && {
          "v-alert--border": !!e.border,
          [`v-alert--border-${e.border === !0 ? "start" : e.border}`]: !0
        }, {
          "v-alert--prominent": e.prominent
        }, l.value, a.value, c.value, v.value, h.value, w.value, u.value, e.class],
        style: [d.value, m.value, g.value, e.style],
        role: "alert"
      }, {
        default: () => {
          var E, V;
          return [_o(!1, "v-alert"), e.border && f("div", {
            key: "border",
            class: ["v-alert__border", C.value],
            style: O.value
          }, null), x && f("div", {
            key: "prepend",
            class: "v-alert__prepend"
          }, [i.prepend ? f(it, {
            key: "prepend-defaults",
            disabled: !r.value,
            defaults: {
              VIcon: {
                density: e.density,
                icon: r.value,
                size: e.prominent ? 44 : 28
              }
            }
          }, i.prepend) : f(We, {
            key: "prepend-icon",
            density: e.density,
            icon: r.value,
            size: e.prominent ? 44 : 28
          }, null)]), f("div", {
            class: "v-alert__content"
          }, [N && f(Rb, {
            key: "title"
          }, {
            default: () => {
              var L;
              return [((L = i.title) == null ? void 0 : L.call(i)) ?? e.title];
            }
          }), ((E = i.text) == null ? void 0 : E.call(i)) ?? e.text, (V = i.default) == null ? void 0 : V.call(i)]), i.append && f("div", {
            key: "append",
            class: "v-alert__append"
          }, [i.append()]), $ && f("div", {
            key: "close",
            class: "v-alert__close"
          }, [i.close ? f(it, {
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
              var L;
              return [(L = i.close) == null ? void 0 : L.call(i, {
                props: M.value
              })];
            }
          }) : f(me, Ee({
            key: "close-btn",
            icon: e.closeIcon,
            size: "x-small",
            variant: "text"
          }, M.value), null)])];
        }
      });
    };
  }
});
function rs(e, t) {
  return {
    x: e.x + t.x,
    y: e.y + t.y
  };
}
function zb(e, t) {
  return {
    x: e.x - t.x,
    y: e.y - t.y
  };
}
function pu(e, t) {
  if (e.side === "top" || e.side === "bottom") {
    const {
      side: n,
      align: i
    } = e, o = i === "left" ? 0 : i === "center" ? t.width / 2 : i === "right" ? t.width : i, r = n === "top" ? 0 : n === "bottom" ? t.height : n;
    return rs({
      x: o,
      y: r
    }, t);
  } else if (e.side === "left" || e.side === "right") {
    const {
      side: n,
      align: i
    } = e, o = n === "left" ? 0 : n === "right" ? t.width : n, r = i === "top" ? 0 : i === "center" ? t.height / 2 : i === "bottom" ? t.height : i;
    return rs({
      x: o,
      y: r
    }, t);
  }
  return rs({
    x: t.width / 2,
    y: t.height / 2
  }, t);
}
const Of = {
  static: Kb,
  // specific viewport position, usually centered
  connected: Yb
  // connected to a certain element
}, Ub = W({
  locationStrategy: {
    type: [String, Function],
    default: "static",
    validator: (e) => typeof e == "function" || e in Of
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
function Wb(e, t) {
  const n = ue({}), i = ue();
  Be && ai(() => !!(t.isActive.value && e.locationStrategy), (r) => {
    var s, l;
    ve(() => e.locationStrategy, r), jt(() => {
      window.removeEventListener("resize", o), i.value = void 0;
    }), window.addEventListener("resize", o, {
      passive: !0
    }), typeof e.locationStrategy == "function" ? i.value = (s = e.locationStrategy(t, e, n)) == null ? void 0 : s.updateLocation : i.value = (l = Of[e.locationStrategy](t, e, n)) == null ? void 0 : l.updateLocation;
  });
  function o(r) {
    var s;
    (s = i.value) == null || s.call(i, r);
  }
  return {
    contentStyles: n,
    updateLocation: i
  };
}
function Kb() {
}
function Gb(e, t) {
  const n = gl(e);
  return t ? n.x += parseFloat(e.style.right || 0) : n.x -= parseFloat(e.style.left || 0), n.y -= parseFloat(e.style.top || 0), n;
}
function Yb(e, t, n) {
  (Array.isArray(e.target.value) || Wh(e.target.value)) && Object.assign(n.value, {
    position: "fixed",
    top: 0,
    [e.isRtl.value ? "right" : "left"]: 0
  });
  const {
    preferredAnchor: o,
    preferredOrigin: r
  } = vl(() => {
    const g = Os(t.location, e.isRtl.value), h = t.origin === "overlap" ? g : t.origin === "auto" ? Qr(g) : Os(t.origin, e.isRtl.value);
    return g.side === h.side && g.align === es(h).align ? {
      preferredAnchor: Fa(g),
      preferredOrigin: Fa(h)
    } : {
      preferredAnchor: g,
      preferredOrigin: h
    };
  }), [s, l, a, d] = ["minWidth", "minHeight", "maxWidth", "maxHeight"].map((g) => y(() => {
    const h = parseFloat(t[g]);
    return isNaN(h) ? 1 / 0 : h;
  })), u = y(() => {
    if (Array.isArray(t.offset))
      return t.offset;
    if (typeof t.offset == "string") {
      const g = t.offset.split(" ").map(parseFloat);
      return g.length < 2 && g.push(0), g;
    }
    return typeof t.offset == "number" ? [t.offset, 0] : [0, 0];
  });
  let c = !1;
  const m = new ResizeObserver(() => {
    c && v();
  });
  ve([e.target, e.contentEl], (g, h) => {
    let [w, C] = g, [O, P] = h;
    O && !Array.isArray(O) && m.unobserve(O), w && !Array.isArray(w) && m.observe(w), P && m.unobserve(P), C && m.observe(C);
  }, {
    immediate: !0
  }), jt(() => {
    m.disconnect();
  });
  function v() {
    if (c = !1, requestAnimationFrame(() => c = !0), !e.target.value || !e.contentEl.value) return;
    const g = cd(e.target.value), h = Gb(e.contentEl.value, e.isRtl.value), w = ar(e.contentEl.value), C = 12;
    w.length || (w.push(document.documentElement), e.contentEl.value.style.top && e.contentEl.value.style.left || (h.x -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-x") || 0), h.y -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-y") || 0)));
    const O = w.reduce((A, S) => {
      const T = S.getBoundingClientRect(), B = new ii({
        x: S === document.documentElement ? 0 : T.x,
        y: S === document.documentElement ? 0 : T.y,
        width: S.clientWidth,
        height: S.clientHeight
      });
      return A ? new ii({
        x: Math.max(A.left, B.left),
        y: Math.max(A.top, B.top),
        width: Math.min(A.right, B.right) - Math.max(A.left, B.left),
        height: Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top)
      }) : B;
    }, void 0);
    O.x += C, O.y += C, O.width -= C * 2, O.height -= C * 2;
    let P = {
      anchor: o.value,
      origin: r.value
    };
    function M(A) {
      const S = new ii(h), T = pu(A.anchor, g), B = pu(A.origin, S);
      let {
        x: Z,
        y: Q
      } = zb(T, B);
      switch (A.anchor.side) {
        case "top":
          Q -= u.value[0];
          break;
        case "bottom":
          Q += u.value[0];
          break;
        case "left":
          Z -= u.value[0];
          break;
        case "right":
          Z += u.value[0];
          break;
      }
      switch (A.anchor.align) {
        case "top":
          Q -= u.value[1];
          break;
        case "bottom":
          Q += u.value[1];
          break;
        case "left":
          Z -= u.value[1];
          break;
        case "right":
          Z += u.value[1];
          break;
      }
      return S.x += Z, S.y += Q, S.width = Math.min(S.width, a.value), S.height = Math.min(S.height, d.value), {
        overflows: Ba(S, O),
        x: Z,
        y: Q
      };
    }
    let x = 0, N = 0;
    const $ = {
      x: 0,
      y: 0
    }, E = {
      x: !1,
      y: !1
    };
    let V = -1;
    for (; ; ) {
      if (V++ > 10) {
        rr("Infinite loop detected in connectedLocationStrategy");
        break;
      }
      const {
        x: A,
        y: S,
        overflows: T
      } = M(P);
      x += A, N += S, h.x += A, h.y += S;
      {
        const B = La(P.anchor), Z = T.x.before || T.x.after, Q = T.y.before || T.y.after;
        let X = !1;
        if (["x", "y"].forEach((q) => {
          if (q === "x" && Z && !E.x || q === "y" && Q && !E.y) {
            const ye = {
              anchor: {
                ...P.anchor
              },
              origin: {
                ...P.origin
              }
            }, be = q === "x" ? B === "y" ? es : Qr : B === "y" ? Qr : es;
            ye.anchor = be(ye.anchor), ye.origin = be(ye.origin);
            const {
              overflows: fe
            } = M(ye);
            (fe[q].before <= T[q].before && fe[q].after <= T[q].after || fe[q].before + fe[q].after < (T[q].before + T[q].after) / 2) && (P = ye, X = E[q] = !0);
          }
        }), X) continue;
      }
      T.x.before && (x += T.x.before, h.x += T.x.before), T.x.after && (x -= T.x.after, h.x -= T.x.after), T.y.before && (N += T.y.before, h.y += T.y.before), T.y.after && (N -= T.y.after, h.y -= T.y.after);
      {
        const B = Ba(h, O);
        $.x = O.width - B.x.before - B.x.after, $.y = O.height - B.y.before - B.y.after, x += B.x.before, h.x += B.x.before, N += B.y.before, h.y += B.y.before;
      }
      break;
    }
    const L = La(P.anchor);
    return Object.assign(n.value, {
      "--v-overlay-anchor-origin": `${P.anchor.side} ${P.anchor.align}`,
      transformOrigin: `${P.origin.side} ${P.origin.align}`,
      // transform: `translate(${pixelRound(x)}px, ${pixelRound(y)}px)`,
      top: oe(ss(N)),
      left: e.isRtl.value ? void 0 : oe(ss(x)),
      right: e.isRtl.value ? oe(ss(-x)) : void 0,
      minWidth: oe(L === "y" ? Math.min(s.value, g.width) : s.value),
      maxWidth: oe(yu(Pn($.x, s.value === 1 / 0 ? 0 : s.value, a.value))),
      maxHeight: oe(yu(Pn($.y, l.value === 1 / 0 ? 0 : l.value, d.value)))
    }), {
      available: $,
      contentBox: h
    };
  }
  return ve(() => [o.value, r.value, t.offset, t.minWidth, t.minHeight, t.maxWidth, t.maxHeight], () => v()), At(() => {
    const g = v();
    if (!g) return;
    const {
      available: h,
      contentBox: w
    } = g;
    w.height > h.y && requestAnimationFrame(() => {
      v(), requestAnimationFrame(() => {
        v();
      });
    });
  }), {
    updateLocation: v
  };
}
function ss(e) {
  return Math.round(e * devicePixelRatio) / devicePixelRatio;
}
function yu(e) {
  return Math.ceil(e * devicePixelRatio) / devicePixelRatio;
}
let Fs = !0;
const gr = [];
function qb(e) {
  !Fs || gr.length ? (gr.push(e), Ls()) : (Fs = !1, e(), Ls());
}
let bu = -1;
function Ls() {
  cancelAnimationFrame(bu), bu = requestAnimationFrame(() => {
    const e = gr.shift();
    e && e(), gr.length ? Ls() : Fs = !0;
  });
}
const Uo = {
  none: null,
  close: Jb,
  block: Qb,
  reposition: e_
}, Zb = W({
  scrollStrategy: {
    type: [String, Function],
    default: "block",
    validator: (e) => typeof e == "function" || e in Uo
  }
}, "VOverlay-scroll-strategies");
function Xb(e, t) {
  if (!Be) return;
  let n;
  yn(async () => {
    n == null || n.stop(), t.isActive.value && e.scrollStrategy && (n = Ws(), await new Promise((i) => setTimeout(i)), n.active && n.run(() => {
      var i;
      typeof e.scrollStrategy == "function" ? e.scrollStrategy(t, e, n) : (i = Uo[e.scrollStrategy]) == null || i.call(Uo, t, e, n);
    }));
  }), jt(() => {
    n == null || n.stop();
  });
}
function Jb(e) {
  function t(n) {
    e.isActive.value = !1;
  }
  Df(e.targetEl.value ?? e.contentEl.value, t);
}
function Qb(e, t) {
  var s;
  const n = (s = e.root.value) == null ? void 0 : s.offsetParent, i = [.../* @__PURE__ */ new Set([...ar(e.targetEl.value, t.contained ? n : void 0), ...ar(e.contentEl.value, t.contained ? n : void 0)])].filter((l) => !l.classList.contains("v-overlay-scroll-blocked")), o = window.innerWidth - document.documentElement.offsetWidth, r = ((l) => yl(l) && l)(n || document.documentElement);
  r && e.root.value.classList.add("v-overlay--scroll-blocked"), i.forEach((l, a) => {
    l.style.setProperty("--v-body-scroll-x", oe(-l.scrollLeft)), l.style.setProperty("--v-body-scroll-y", oe(-l.scrollTop)), l !== document.documentElement && l.style.setProperty("--v-scrollbar-offset", oe(o)), l.classList.add("v-overlay-scroll-blocked");
  }), jt(() => {
    i.forEach((l, a) => {
      const d = parseFloat(l.style.getPropertyValue("--v-body-scroll-x")), u = parseFloat(l.style.getPropertyValue("--v-body-scroll-y")), c = l.style.scrollBehavior;
      l.style.scrollBehavior = "auto", l.style.removeProperty("--v-body-scroll-x"), l.style.removeProperty("--v-body-scroll-y"), l.style.removeProperty("--v-scrollbar-offset"), l.classList.remove("v-overlay-scroll-blocked"), l.scrollLeft = -d, l.scrollTop = -u, l.style.scrollBehavior = c;
    }), r && e.root.value.classList.remove("v-overlay--scroll-blocked");
  });
}
function e_(e, t, n) {
  let i = !1, o = -1, r = -1;
  function s(l) {
    qb(() => {
      var u, c;
      const a = performance.now();
      (c = (u = e.updateLocation).value) == null || c.call(u, l), i = (performance.now() - a) / (1e3 / 60) > 2;
    });
  }
  r = (typeof requestIdleCallback > "u" ? (l) => l() : requestIdleCallback)(() => {
    n.run(() => {
      Df(e.targetEl.value ?? e.contentEl.value, (l) => {
        i ? (cancelAnimationFrame(o), o = requestAnimationFrame(() => {
          o = requestAnimationFrame(() => {
            s(l);
          });
        })) : s(l);
      });
    });
  }), jt(() => {
    typeof cancelIdleCallback < "u" && cancelIdleCallback(r), cancelAnimationFrame(o);
  });
}
function Df(e, t) {
  const n = [document, ...ar(e)];
  n.forEach((i) => {
    i.addEventListener("scroll", t, {
      passive: !0
    });
  }), jt(() => {
    n.forEach((i) => {
      i.removeEventListener("scroll", t);
    });
  });
}
const t_ = Symbol.for("vuetify:v-menu"), n_ = W({
  closeDelay: [Number, String],
  openDelay: [Number, String]
}, "delay");
function i_(e, t) {
  let n = () => {
  };
  function i(s) {
    n == null || n();
    const l = Number(s ? e.openDelay : e.closeDelay);
    return new Promise((a) => {
      n = dh(l, () => {
        t == null || t(s), a(s);
      });
    });
  }
  function o() {
    return i(!0);
  }
  function r() {
    return i(!1);
  }
  return {
    clearDelay: n,
    runOpenDelay: o,
    runCloseDelay: r
  };
}
const o_ = W({
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
  ...n_()
}, "VOverlay-activator");
function r_(e, t) {
  let {
    isActive: n,
    isTop: i,
    contentEl: o
  } = t;
  const r = ze("useActivator"), s = ue();
  let l = !1, a = !1, d = !0;
  const u = y(() => e.openOnFocus || e.openOnFocus == null && e.openOnHover), c = y(() => e.openOnClick || e.openOnClick == null && !e.openOnHover && !u.value), {
    runOpenDelay: m,
    runCloseDelay: v
  } = i_(e, (E) => {
    E === (e.openOnHover && l || u.value && a) && !(e.openOnHover && n.value && !i.value) && (n.value !== E && (d = !0), n.value = E);
  }), g = ue(), h = {
    onClick: (E) => {
      E.stopPropagation(), s.value = E.currentTarget || E.target, n.value || (g.value = [E.clientX, E.clientY]), n.value = !n.value;
    },
    onMouseenter: (E) => {
      var V;
      (V = E.sourceCapabilities) != null && V.firesTouchEvents || (l = !0, s.value = E.currentTarget || E.target, m());
    },
    onMouseleave: (E) => {
      l = !1, v();
    },
    onFocus: (E) => {
      ch(E.target, ":focus-visible") !== !1 && (a = !0, E.stopPropagation(), s.value = E.currentTarget || E.target, m());
    },
    onBlur: (E) => {
      a = !1, E.stopPropagation(), v();
    }
  }, w = y(() => {
    const E = {};
    return c.value && (E.onClick = h.onClick), e.openOnHover && (E.onMouseenter = h.onMouseenter, E.onMouseleave = h.onMouseleave), u.value && (E.onFocus = h.onFocus, E.onBlur = h.onBlur), E;
  }), C = y(() => {
    const E = {};
    if (e.openOnHover && (E.onMouseenter = () => {
      l = !0, m();
    }, E.onMouseleave = () => {
      l = !1, v();
    }), u.value && (E.onFocusin = () => {
      a = !0, m();
    }, E.onFocusout = () => {
      a = !1, v();
    }), e.closeOnContentClick) {
      const V = Re(t_, null);
      E.onClick = () => {
        n.value = !1, V == null || V.closeParents();
      };
    }
    return E;
  }), O = y(() => {
    const E = {};
    return e.openOnHover && (E.onMouseenter = () => {
      d && (l = !0, d = !1, m());
    }, E.onMouseleave = () => {
      l = !1, v();
    }), E;
  });
  ve(i, (E) => {
    var V;
    E && (e.openOnHover && !l && (!u.value || !a) || u.value && !a && (!e.openOnHover || !l)) && !((V = o.value) != null && V.contains(document.activeElement)) && (n.value = !1);
  }), ve(n, (E) => {
    E || setTimeout(() => {
      g.value = void 0;
    });
  }, {
    flush: "post"
  });
  const P = Vs();
  yn(() => {
    P.value && At(() => {
      s.value = P.el;
    });
  });
  const M = Vs(), x = y(() => e.target === "cursor" && g.value ? g.value : M.value ? M.el : Tf(e.target, r) || s.value), N = y(() => Array.isArray(x.value) ? void 0 : x.value);
  let $;
  return ve(() => !!e.activator, (E) => {
    E && Be ? ($ = Ws(), $.run(() => {
      s_(e, r, {
        activatorEl: s,
        activatorEvents: w
      });
    })) : $ && $.stop();
  }, {
    flush: "post",
    immediate: !0
  }), jt(() => {
    $ == null || $.stop();
  }), {
    activatorEl: s,
    activatorRef: P,
    target: x,
    targetEl: N,
    targetRef: M,
    activatorEvents: w,
    contentEvents: C,
    scrimEvents: O
  };
}
function s_(e, t, n) {
  let {
    activatorEl: i,
    activatorEvents: o
  } = n;
  ve(() => e.activator, (a, d) => {
    if (d && a !== d) {
      const u = l(d);
      u && s(u);
    }
    a && At(() => r());
  }, {
    immediate: !0
  }), ve(() => e.activatorProps, () => {
    r();
  }), jt(() => {
    s();
  });
  function r() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : l(), d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    a && mh(a, Ee(o.value, d));
  }
  function s() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : l(), d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    a && vh(a, Ee(o.value, d));
  }
  function l() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : e.activator;
    const d = Tf(a, t);
    return i.value = (d == null ? void 0 : d.nodeType) === Node.ELEMENT_NODE ? d : void 0, i.value;
  }
}
function Tf(e, t) {
  var i, o;
  if (!e) return;
  let n;
  if (e === "parent") {
    let r = (o = (i = t == null ? void 0 : t.proxy) == null ? void 0 : i.$el) == null ? void 0 : o.parentNode;
    for (; r != null && r.hasAttribute("data-no-activator"); )
      r = r.parentNode;
    n = r;
  } else typeof e == "string" ? n = document.querySelector(e) : "$el" in e ? n = e.$el : n = e;
  return n;
}
function l_() {
  if (!Be) return he(!1);
  const {
    ssr: e
  } = Hp();
  if (e) {
    const t = he(!1);
    return In(() => {
      t.value = !0;
    }), t;
  } else
    return he(!0);
}
const a_ = W({
  eager: Boolean
}, "lazy");
function u_(e, t) {
  const n = he(!1), i = y(() => n.value || e.eager || t.value);
  ve(t, () => n.value = !0);
  function o() {
    e.eager || (n.value = !1);
  }
  return {
    isBooted: n,
    hasContent: i,
    onAfterLeave: o
  };
}
function Pf() {
  const t = ze("useScopeId").vnode.scopeId;
  return {
    scopeId: t ? {
      [t]: ""
    } : void 0
  };
}
const _u = Symbol.for("vuetify:stack"), Ri = et([]);
function c_(e, t, n) {
  const i = ze("useStack"), o = !n, r = Re(_u, void 0), s = et({
    activeChildren: /* @__PURE__ */ new Set()
  });
  gt(_u, s);
  const l = he(+t.value);
  ai(e, () => {
    var c;
    const u = (c = Ri.at(-1)) == null ? void 0 : c[1];
    l.value = u ? u + 10 : +t.value, o && Ri.push([i.uid, l.value]), r == null || r.activeChildren.add(i.uid), jt(() => {
      if (o) {
        const m = J(Ri).findIndex((v) => v[0] === i.uid);
        Ri.splice(m, 1);
      }
      r == null || r.activeChildren.delete(i.uid);
    });
  });
  const a = he(!0);
  o && yn(() => {
    var c;
    const u = ((c = Ri.at(-1)) == null ? void 0 : c[0]) === i.uid;
    setTimeout(() => a.value = u);
  });
  const d = y(() => !s.activeChildren.size);
  return {
    globalTop: vo(a),
    localTop: d,
    stackStyles: y(() => ({
      zIndex: l.value
    }))
  };
}
function d_(e) {
  return {
    teleportTarget: y(() => {
      const n = e();
      if (n === !0 || !Be) return;
      const i = n === !1 ? document.body : typeof n == "string" ? document.querySelector(n) : n;
      if (i == null) {
        pt(`Unable to locate target ${n}`);
        return;
      }
      let o = [...i.children].find((r) => r.matches(".v-overlay-container"));
      return o || (o = document.createElement("div"), o.className = "v-overlay-container", i.appendChild(o)), o;
    })
  };
}
function f_() {
  return !0;
}
function Af(e, t, n) {
  if (!e || If(e, n) === !1) return !1;
  const i = pd(t);
  if (typeof ShadowRoot < "u" && i instanceof ShadowRoot && i.host === e.target) return !1;
  const o = (typeof n.value == "object" && n.value.include || (() => []))();
  return o.push(t), !o.some((r) => r == null ? void 0 : r.contains(e.target));
}
function If(e, t) {
  return (typeof t.value == "object" && t.value.closeConditional || f_)(e);
}
function m_(e, t, n) {
  const i = typeof n.value == "function" ? n.value : n.value.handler;
  e.shadowTarget = e.target, t._clickOutside.lastMousedownWasOutside && Af(e, t, n) && setTimeout(() => {
    If(e, n) && i && i(e);
  }, 0);
}
function wu(e, t) {
  const n = pd(e);
  t(document), typeof ShadowRoot < "u" && n instanceof ShadowRoot && t(n);
}
const v_ = {
  // [data-app] may not be found
  // if using bind, inserted makes
  // sure that the root element is
  // available, iOS does not support
  // clicks on body
  mounted(e, t) {
    const n = (o) => m_(o, e, t), i = (o) => {
      e._clickOutside.lastMousedownWasOutside = Af(o, e, t);
    };
    wu(e, (o) => {
      o.addEventListener("click", n, !0), o.addEventListener("mousedown", i, !0);
    }), e._clickOutside || (e._clickOutside = {
      lastMousedownWasOutside: !1
    }), e._clickOutside[t.instance.$.uid] = {
      onClick: n,
      onMousedown: i
    };
  },
  beforeUnmount(e, t) {
    e._clickOutside && (wu(e, (n) => {
      var r;
      if (!n || !((r = e._clickOutside) != null && r[t.instance.$.uid])) return;
      const {
        onClick: i,
        onMousedown: o
      } = e._clickOutside[t.instance.$.uid];
      n.removeEventListener("click", i, !0), n.removeEventListener("mousedown", o, !0);
    }), delete e._clickOutside[t.instance.$.uid]);
  }
};
function g_(e) {
  const {
    modelValue: t,
    color: n,
    ...i
  } = e;
  return f(li, {
    name: "fade-transition",
    appear: !0
  }, {
    default: () => [e.modelValue && f("div", Ee({
      class: ["v-overlay__scrim", e.color.backgroundColorClasses.value],
      style: e.color.backgroundColorStyles.value
    }, i), null)]
  });
}
const $f = W({
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
  ...o_(),
  ...pe(),
  ...bn(),
  ...a_(),
  ...Ub(),
  ...Zb(),
  ...Xe(),
  ...bo()
}, "VOverlay"), Bs = se()({
  name: "VOverlay",
  directives: {
    ClickOutside: v_
  },
  inheritAttrs: !1,
  props: {
    _disableGlobalStack: Boolean,
    ...$f()
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
      attrs: i,
      emit: o
    } = t;
    const r = ze("VOverlay"), s = ue(), l = ue(), a = ue(), d = nt(e, "modelValue"), u = y({
      get: () => d.value,
      set: (Y) => {
        Y && e.disabled || (d.value = Y);
      }
    }), {
      themeClasses: c
    } = lt(e), {
      rtlClasses: m,
      isRtl: v
    } = en(), {
      hasContent: g,
      onAfterLeave: h
    } = u_(e, u), w = Dt(y(() => typeof e.scrim == "string" ? e.scrim : null)), {
      globalTop: C,
      localTop: O,
      stackStyles: P
    } = c_(u, ie(e, "zIndex"), e._disableGlobalStack), {
      activatorEl: M,
      activatorRef: x,
      target: N,
      targetEl: $,
      targetRef: E,
      activatorEvents: V,
      contentEvents: L,
      scrimEvents: A
    } = r_(e, {
      isActive: u,
      isTop: O,
      contentEl: a
    }), {
      teleportTarget: S
    } = d_(() => {
      var Ie, at, Ge;
      const Y = e.attach || e.contained;
      if (Y) return Y;
      const ce = ((Ie = M == null ? void 0 : M.value) == null ? void 0 : Ie.getRootNode()) || ((Ge = (at = r.proxy) == null ? void 0 : at.$el) == null ? void 0 : Ge.getRootNode());
      return ce instanceof ShadowRoot ? ce : !1;
    }), {
      dimensionStyles: T
    } = _n(e), B = l_(), {
      scopeId: Z
    } = Pf();
    ve(() => e.disabled, (Y) => {
      Y && (u.value = !1);
    });
    const {
      contentStyles: Q,
      updateLocation: X
    } = Wb(e, {
      isRtl: v,
      contentEl: a,
      target: N,
      isActive: u
    });
    Xb(e, {
      root: s,
      contentEl: a,
      targetEl: $,
      isActive: u,
      updateLocation: X
    });
    function q(Y) {
      o("click:outside", Y), e.persistent ? xe() : u.value = !1;
    }
    function ye(Y) {
      return u.value && C.value && // If using scrim, only close if clicking on it rather than anything opened on top
      (!e.scrim || Y.target === l.value || Y instanceof MouseEvent && Y.shadowTarget === l.value);
    }
    Be && ve(u, (Y) => {
      Y ? window.addEventListener("keydown", be) : window.removeEventListener("keydown", be);
    }, {
      immediate: !0
    }), yt(() => {
      Be && window.removeEventListener("keydown", be);
    });
    function be(Y) {
      var ce, Ie;
      Y.key === "Escape" && C.value && (e.persistent ? xe() : (u.value = !1, (ce = a.value) != null && ce.contains(document.activeElement) && ((Ie = M.value) == null || Ie.focus())));
    }
    const fe = ky();
    ai(() => e.closeOnBack, () => {
      Ny(fe, (Y) => {
        C.value && u.value ? (Y(!1), e.persistent ? xe() : u.value = !1) : Y();
      });
    });
    const ne = ue();
    ve(() => u.value && (e.absolute || e.contained) && S.value == null, (Y) => {
      if (Y) {
        const ce = zh(s.value);
        ce && ce !== document.scrollingElement && (ne.value = ce.scrollTop);
      }
    });
    function xe() {
      e.noClickAnimation || a.value && yi(a.value, [{
        transformOrigin: "center"
      }, {
        transform: "scale(1.03)"
      }, {
        transformOrigin: "center"
      }], {
        duration: 150,
        easing: lr
      });
    }
    function Je() {
      o("afterEnter");
    }
    function Qe() {
      h(), o("afterLeave");
    }
    return ge(() => {
      var Y;
      return f(Ce, null, [(Y = n.activator) == null ? void 0 : Y.call(n, {
        isActive: u.value,
        targetRef: E,
        props: Ee({
          ref: x
        }, V.value, e.activatorProps)
      }), B.value && g.value && f(tv, {
        disabled: !S.value,
        to: S.value
      }, {
        default: () => [f("div", Ee({
          class: ["v-overlay", {
            "v-overlay--absolute": e.absolute || e.contained,
            "v-overlay--active": u.value,
            "v-overlay--contained": e.contained
          }, c.value, m.value, e.class],
          style: [P.value, {
            "--v-overlay-opacity": e.opacity,
            top: oe(ne.value)
          }, e.style],
          ref: s
        }, Z, i), [f(g_, Ee({
          color: w,
          modelValue: u.value && !!e.scrim,
          ref: l
        }, A.value), null), f(cn, {
          appear: !0,
          persisted: !0,
          transition: e.transition,
          target: N.value,
          onAfterEnter: Je,
          onAfterLeave: Qe
        }, {
          default: () => {
            var ce;
            return [Nt(f("div", Ee({
              ref: a,
              class: ["v-overlay__content", e.contentClass],
              style: [T.value, Q.value]
            }, L.value, e.contentProps), [(ce = n.default) == null ? void 0 : ce.call(n, {
              isActive: u
            })]), [[Mn, u.value], [Di("click-outside"), {
              handler: q,
              closeConditional: ye,
              include: () => [M.value]
            }]])];
          }
        })])]
      })]);
    }), {
      activatorEl: M,
      scrimEl: l,
      target: N,
      animateClick: xe,
      contentEl: a,
      globalTop: C,
      localTop: O,
      updateLocation: X
    };
  }
}), Mf = W({
  fullscreen: Boolean,
  retainFocus: {
    type: Boolean,
    default: !0
  },
  scrollable: Boolean,
  ...$f({
    origin: "center center",
    scrollStrategy: "block",
    transition: {
      component: Xy
    },
    zIndex: 2400
  })
}, "VDialog"), _i = se()({
  name: "VDialog",
  props: Mf(),
  emits: {
    "update:modelValue": (e) => !0,
    afterEnter: () => !0,
    afterLeave: () => !0
  },
  setup(e, t) {
    let {
      emit: n,
      slots: i
    } = t;
    const o = nt(e, "modelValue"), {
      scopeId: r
    } = Pf(), s = ue();
    function l(u) {
      var v, g;
      const c = u.relatedTarget, m = u.target;
      if (c !== m && ((v = s.value) != null && v.contentEl) && // We're the topmost dialog
      ((g = s.value) != null && g.globalTop) && // It isn't the document or the dialog body
      ![document, s.value.contentEl].includes(m) && // It isn't inside the dialog body
      !s.value.contentEl.contains(m)) {
        const h = ld(s.value.contentEl);
        if (!h.length) return;
        const w = h[0], C = h[h.length - 1];
        c === w ? C.focus() : w.focus();
      }
    }
    yt(() => {
      document.removeEventListener("focusin", l);
    }), Be && ve(() => o.value && e.retainFocus, (u) => {
      u ? document.addEventListener("focusin", l) : document.removeEventListener("focusin", l);
    }, {
      immediate: !0
    });
    function a() {
      var u;
      n("afterEnter"), (u = s.value) != null && u.contentEl && !s.value.contentEl.contains(document.activeElement) && s.value.contentEl.focus({
        preventScroll: !0
      });
    }
    function d() {
      n("afterLeave");
    }
    return ve(o, async (u) => {
      var c;
      u || (await At(), (c = s.value.activatorEl) == null || c.focus({
        preventScroll: !0
      }));
    }), ge(() => {
      const u = Bs.filterProps(e), c = Ee({
        "aria-haspopup": "dialog"
      }, e.activatorProps), m = Ee({
        tabindex: -1
      }, e.contentProps);
      return f(Bs, Ee({
        ref: s,
        class: ["v-dialog", {
          "v-dialog--fullscreen": e.fullscreen,
          "v-dialog--scrollable": e.scrollable
        }, e.class],
        style: e.style
      }, u, {
        modelValue: o.value,
        "onUpdate:modelValue": (v) => o.value = v,
        "aria-modal": "true",
        activatorProps: c,
        contentProps: m,
        height: e.fullscreen ? void 0 : e.height,
        width: e.fullscreen ? void 0 : e.width,
        maxHeight: e.fullscreen ? void 0 : e.maxHeight,
        maxWidth: e.fullscreen ? void 0 : e.maxWidth,
        role: "dialog",
        onAfterEnter: a,
        onAfterLeave: d
      }, r), {
        activator: i.activator,
        default: function() {
          for (var v = arguments.length, g = new Array(v), h = 0; h < v; h++)
            g[h] = arguments[h];
          return f(it, {
            root: "VDialog"
          }, {
            default: () => {
              var w;
              return [(w = i.default) == null ? void 0 : w.call(i, ...g)];
            }
          });
        }
      });
    }), Fl({}, s);
  }
}), h_ = {
  name: "UserCenter",
  props: ["messages", "user"],
  data: () => ({
    editAvatar: !1,
    editNickname: !1,
    editPassword: !1,
    checkLogout: !1,
    newNickname: "",
    oldPassword: "",
    newPassword: "",
    examPassword: "",
    rules: {
      pass: (e) => 20 >= e.length && e.length >= 8 || "8 ~ 20 characters",
      nick: (e) => e.length >= 2 || "Min 2 characters",
      email: function(e) {
        var t = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return t.test(e) || "Invalid email format";
      }
    }
  }),
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
      this.update_user({
        nickname: this.newNickname
      }).then(() => {
        this.editNickname = !1;
      });
    },
    savePassword() {
      this.examPassword != this.newPassword, this.update_user({
        password0: this.oldPassword,
        password1: this.newPassword
      }).then(() => {
        this.editPassword = !1;
      });
    },
    update_user: function(e) {
      return this.user.nickName = this.newNickname, this.$backend("/api/user/update", {
        method: "POST",
        body: JSON.stringify(e)
      }).then((t) => {
        if (t.err != "ok") {
          this.alert.msg = t.msg, this.alert.type = "error";
          return;
        }
        this.$emit("update", t.data);
      });
    },
    do_logout: function() {
      return this.user.nickName = this.newNickname, this.$backend("/api/user/sign_out").then((e) => {
        if (e.err != "ok") {
          this.alert.msg = e.msg, this.alert.type = "error";
          return;
        }
        this.$emit("logout");
      });
    }
  }
}, p_ = { class: "px-4 py-2" }, y_ = { class: "px-4 py-2" }, b_ = { class: "my-2" };
function __(e, t, n, i, o, r) {
  return _e(), ke(Kt, null, {
    default: k(() => [
      f(Ui, { class: "text-center" }, {
        default: k(() => t[14] || (t[14] = [
          ae(" 消息 ")
        ])),
        _: 1
      }),
      Oe("div", p_, [
        f(Kt, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "用户信息"
        }, {
          default: k(() => [
            f(oi, null, {
              default: k(() => [
                f(Le, {
                  class: "text-right",
                  onClick: r.alert_avatar
                }, {
                  prepend: k(() => t[15] || (t[15] = [
                    Oe("span", null, "头像", -1)
                  ])),
                  append: k(() => [
                    f(Vi, {
                      image: n.user.avatar
                    }, null, 8, ["image"])
                  ]),
                  _: 1
                }, 8, ["onClick"]),
                f(Le, {
                  class: "text-right",
                  title: n.user.email
                }, {
                  prepend: k(() => t[16] || (t[16] = [
                    Oe("span", null, "邮箱", -1)
                  ])),
                  _: 1
                }, 8, ["title"]),
                f(Le, {
                  class: "text-right",
                  onClick: t[0] || (t[0] = (s) => e.editNickname = !0),
                  title: n.user.nickname
                }, {
                  prepend: k(() => t[17] || (t[17] = [
                    Oe("span", null, "昵称", -1)
                  ])),
                  append: k(() => [
                    f(We, null, {
                      default: k(() => t[18] || (t[18] = [
                        ae("mdi-chevron-right")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["title"]),
                f(Le, {
                  class: "text-right",
                  onClick: t[1] || (t[1] = (s) => e.editPassword = !0),
                  title: "(点击更改)",
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: k(() => t[19] || (t[19] = [
                    Oe("span", null, "密码", -1)
                  ])),
                  _: 1
                }),
                f(Le, {
                  class: "text-right",
                  onClick: t[2] || (t[2] = (s) => e.checkLogout = !0),
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: k(() => t[20] || (t[20] = [
                    Oe("span", null, "退出登录", -1)
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
      Oe("div", y_, [
        f(Kt, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "章评互动信息"
        }, {
          default: k(() => [
            n.messages.length === 0 ? (_e(), ke(oi, {
              key: 0,
              density: "compact",
              class: "mr-4"
            }, {
              default: k(() => [
                f(Le, { class: "my-4" }, {
                  default: k(() => [
                    f(Al, { class: "text-center" }, {
                      default: k(() => t[21] || (t[21] = [
                        ae("无新的互动消息")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })) : hi("", !0),
            f(oi, {
              id: "book-comments",
              density: "compact",
              class: "mr-4"
            }, {
              default: k(() => [
                (_e(!0), Yn(Ce, null, Ei(n.messages, (s) => (_e(), ke(Le, {
                  key: s.id,
                  class: "pr-0 align-self-start mb-4",
                  "prepend-avatar": s.avatar,
                  subtitle: s.nickName + " @《宿命之环》"
                }, {
                  default: k(() => [
                    Oe("div", b_, ft(r.thumb_or_content(s)), 1),
                    f(Kt, {
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
      f(_i, {
        modelValue: e.editAvatar,
        "onUpdate:modelValue": t[3] || (t[3] = (s) => e.editAvatar = s),
        persistent: ""
      }, {
        default: k(() => [
          f(Vf)
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(_i, {
        modelValue: e.editNickname,
        "onUpdate:modelValue": t[6] || (t[6] = (s) => e.editNickname = s),
        persistent: ""
      }, {
        default: k(() => [
          f(Kt, null, {
            default: k(() => [
              f(Ui, { class: "text-center" }, {
                default: k(() => t[22] || (t[22] = [
                  ae("修改昵称")
                ])),
                _: 1
              }),
              f(Ji, null, {
                default: k(() => [
                  f(qt, {
                    modelValue: e.newNickname,
                    "onUpdate:modelValue": t[4] || (t[4] = (s) => e.newNickname = s),
                    label: "新昵称"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              f(Xi, null, {
                default: k(() => [
                  f(me, {
                    text: "",
                    onClick: t[5] || (t[5] = (s) => e.editNickname = !1)
                  }, {
                    default: k(() => t[23] || (t[23] = [
                      ae("取消")
                    ])),
                    _: 1
                  }),
                  f(me, {
                    text: "",
                    onClick: r.saveNickname
                  }, {
                    default: k(() => t[24] || (t[24] = [
                      ae("保存")
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
      f(_i, {
        modelValue: e.editPassword,
        "onUpdate:modelValue": t[11] || (t[11] = (s) => e.editPassword = s),
        persistent: "",
        "z-index": "2999"
      }, {
        default: k(() => [
          f(Kt, null, {
            default: k(() => [
              f(Ui, { class: "text-center" }, {
                default: k(() => t[25] || (t[25] = [
                  ae("修改密码")
                ])),
                _: 1
              }),
              f(Ji, null, {
                default: k(() => [
                  f(qt, {
                    modelValue: e.oldPassword,
                    "onUpdate:modelValue": t[7] || (t[7] = (s) => e.oldPassword = s),
                    label: "当前密码"
                  }, null, 8, ["modelValue"]),
                  f(qt, {
                    modelValue: e.newPassword,
                    "onUpdate:modelValue": t[8] || (t[8] = (s) => e.newPassword = s),
                    label: "新密码",
                    rules: [e.rules.pass]
                  }, null, 8, ["modelValue", "rules"]),
                  f(qt, {
                    modelValue: e.examPassword,
                    "onUpdate:modelValue": t[9] || (t[9] = (s) => e.examPassword = s),
                    label: "确认密码",
                    rules: [r.double_check_password]
                  }, null, 8, ["modelValue", "rules"])
                ]),
                _: 1
              }),
              f(Xi, null, {
                default: k(() => [
                  f(me, {
                    text: "",
                    onClick: t[10] || (t[10] = (s) => e.editPassword = !1)
                  }, {
                    default: k(() => t[26] || (t[26] = [
                      ae("取消")
                    ])),
                    _: 1
                  }),
                  f(me, {
                    text: "",
                    onClick: r.savePassword
                  }, {
                    default: k(() => t[27] || (t[27] = [
                      ae("保存")
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
      f(_i, {
        modelValue: e.checkLogout,
        "onUpdate:modelValue": t[13] || (t[13] = (s) => e.checkLogout = s),
        persistent: ""
      }, {
        default: k(() => [
          f(Kt, null, {
            default: k(() => [
              f(Ui, { class: "text-center" }, {
                default: k(() => t[28] || (t[28] = [
                  ae("请确认")
                ])),
                _: 1
              }),
              f(Ji, null, {
                default: k(() => t[29] || (t[29] = [
                  ae(" 是否要退出登录？ ")
                ])),
                _: 1
              }),
              f(Xi, null, {
                default: k(() => [
                  f(me, {
                    text: "",
                    onClick: t[12] || (t[12] = (s) => e.checkLogout = !1)
                  }, {
                    default: k(() => t[30] || (t[30] = [
                      ae("取消")
                    ])),
                    _: 1
                  }),
                  f(me, {
                    text: "",
                    onClick: r.do_logout
                  }, {
                    default: k(() => t[31] || (t[31] = [
                      ae("确认")
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
const w_ = /* @__PURE__ */ ci(h_, [["render", __], ["__scopeId", "data-v-cacf4611"]]), S_ = W({
  ...pe(),
  ...Db()
}, "VForm"), ls = se()({
  name: "VForm",
  props: S_(),
  emits: {
    "update:modelValue": (e) => !0,
    submit: (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: i
    } = t;
    const o = Tb(e), r = ue();
    function s(a) {
      a.preventDefault(), o.reset();
    }
    function l(a) {
      const d = a, u = o.validate();
      d.then = u.then.bind(u), d.catch = u.catch.bind(u), d.finally = u.finally.bind(u), i("submit", d), d.defaultPrevented || u.then((c) => {
        var v;
        let {
          valid: m
        } = c;
        m && ((v = r.value) == null || v.submit());
      }), d.preventDefault();
    }
    return ge(() => {
      var a;
      return f("form", {
        ref: r,
        class: ["v-form", e.class],
        style: e.style,
        novalidate: !0,
        onReset: s,
        onSubmit: l
      }, [(a = n.default) == null ? void 0 : a.call(n, o)]);
    }), Fl(o, r);
  }
}), E_ = {
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
function C_(e, t, n, i, o, r) {
  return _e(), ke(Kt, { title: "登录到书评系统" }, {
    default: k(() => [
      f(fn),
      f(Zd, null, {
        default: k(() => [
          e.mode == "login" ? (_e(), ke(ls, {
            key: 0,
            onSubmit: Xr(r.do_login, ["prevent"])
          }, {
            default: k(() => [
              f(qt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[0] || (t[0] = (s) => e.email = s),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              f(qt, {
                "prepend-icon": "mdi-lock",
                modelValue: e.password,
                "onUpdate:modelValue": t[1] || (t[1] = (s) => e.password = s),
                label: "密码",
                type: "password"
              }, null, 8, ["modelValue"]),
              f(me, {
                type: "submit",
                color: "primary"
              }, {
                default: k(() => t[8] || (t[8] = [
                  ae("登录")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "forget" ? (_e(), ke(ls, {
            key: 1,
            onSubmit: Xr(r.do_reset, ["prevent"])
          }, {
            default: k(() => [
              f(qt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[2] || (t[2] = (s) => e.email = s),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              f(me, {
                type: "submit",
                color: "red"
              }, {
                default: k(() => t[9] || (t[9] = [
                  ae("重置密码")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "signup" ? (_e(), ke(ls, {
            key: 2,
            ref: "form",
            onSubmit: Xr(r.do_signup, ["prevent"])
          }, {
            default: k(() => [
              f(qt, {
                required: "",
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[3] || (t[3] = (s) => e.email = s),
                label: "邮箱",
                type: "text",
                autocomplete: "new-email",
                rules: [e.rules.email]
              }, null, 8, ["modelValue", "rules"]),
              f(qt, {
                required: "",
                "prepend-icon": "mdi-guy-fawkes-mask",
                modelValue: e.nickname,
                "onUpdate:modelValue": t[4] || (t[4] = (s) => e.nickname = s),
                label: "昵称",
                type: "text",
                autocomplete: "new-nickname",
                rules: [e.rules.nick]
              }, null, 8, ["modelValue", "rules"]),
              f(me, {
                type: "submit",
                color: "green"
              }, {
                default: k(() => t[10] || (t[10] = [
                  ae("注册")
                ])),
                _: 1
              }),
              t[11] || (t[11] = Oe("p", { class: "text-small" }, " * 账号密码将随机生成，并发往邮箱", -1))
            ]),
            _: 1
          }, 8, ["onSubmit"])) : hi("", !0)
        ]),
        _: 1
      }),
      e.alert.msg ? (_e(), ke(Vf, {
        key: 0,
        type: e.alert.type
      }, {
        default: k(() => [
          ae(ft(e.alert.msg), 1)
        ]),
        _: 1
      }, 8, ["type"])) : hi("", !0),
      f(fn),
      f(Xi, null, {
        default: k(() => [
          e.mode == "login" ? (_e(), ke(me, {
            key: 0,
            onClick: t[5] || (t[5] = (s) => e.mode = "forget"),
            text: "忘记密码?"
          })) : hi("", !0),
          e.mode != "login" ? (_e(), ke(me, {
            key: 1,
            onClick: t[6] || (t[6] = (s) => e.mode = "login"),
            text: "登录账号"
          })) : hi("", !0),
          f(af),
          f(me, {
            onClick: t[7] || (t[7] = (s) => e.mode = "signup"),
            text: "快速注册"
          })
        ]),
        _: 1
      })
    ]),
    _: 1
  });
}
const k_ = /* @__PURE__ */ ci(E_, [["render", C_]]), N_ = {
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
  mounted: function() {
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
    }
  },
  props: ["meta", "toc_items"],
  data: () => ({})
};
function x_(e, t, n, i, o, r) {
  return _e(), ke(oi, { "onClick:select": r.click_toc }, {
    default: k(() => [
      f(mr, null, {
        activator: k(({ props: s }) => [
          f(Le, Ee(s, { title: "书籍信息" }), null, 16)
        ]),
        default: k(() => [
          (_e(!0), Yn(Ce, null, Ei(r.meta_items, (s) => (_e(), ke(Le, {
            key: s.title,
            title: s.title,
            subtitle: s.subtitle,
            lines: "3"
          }, null, 8, ["title", "subtitle"]))), 128))
        ]),
        _: 1
      }),
      f(fn),
      (_e(!0), Yn(Ce, null, Ei(n.toc_items, (s, l) => (_e(), Yn(Ce, null, [
        s.subitems.length == 0 ? (_e(), ke(Le, {
          key: 0,
          "prepend-icon": "mdi-book-open-page-variant-outline",
          title: s.label,
          value: s.href
        }, null, 8, ["title", "value"])) : (_e(), ke(mr, {
          key: s.href
        }, {
          activator: k(({ props: a }) => [
            f(Le, Ee({ ref_for: !0 }, a, {
              "prepend-icon": "mdi-book-open-page-variant-outline",
              title: s.label,
              value: s.href
            }), null, 16, ["title", "value"])
          ]),
          default: k(() => [
            (_e(!0), Yn(Ce, null, Ei(s.subitems, (a, d) => (_e(), ke(Le, {
              key: s.href,
              title: a.label,
              value: a.href
            }, null, 8, ["title", "value"]))), 128))
          ]),
          _: 2
        }, 1024))
      ], 64))), 256))
    ]),
    _: 1
  }, 8, ["onClick:select"]);
}
const V_ = /* @__PURE__ */ ci(N_, [["render", x_]]), Ll = Symbol.for("vuetify:v-slider");
function O_(e, t, n) {
  const i = n === "vertical", o = t.getBoundingClientRect(), r = "touches" in e ? e.touches[0] : e;
  return i ? r.clientY - (o.top + o.height / 2) : r.clientX - (o.left + o.width / 2);
}
function D_(e, t) {
  return "touches" in e && e.touches.length ? e.touches[0][t] : "changedTouches" in e && e.changedTouches.length ? e.changedTouches[0][t] : e[t];
}
const T_ = W({
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
  ...bt(),
  ...Sn({
    elevation: 2
  }),
  ripple: {
    type: Boolean,
    default: !0
  }
}, "Slider"), P_ = (e) => {
  const t = y(() => parseFloat(e.min)), n = y(() => parseFloat(e.max)), i = y(() => +e.step > 0 ? parseFloat(e.step) : 0), o = y(() => Math.max(Pa(i.value), Pa(t.value)));
  function r(s) {
    if (s = parseFloat(s), i.value <= 0) return s;
    const l = Pn(s, t.value, n.value), a = t.value % i.value, d = Math.round((l - a) / i.value) * i.value + a;
    return parseFloat(Math.min(d, n.value).toFixed(o.value));
  }
  return {
    min: t,
    max: n,
    step: i,
    decimals: o,
    roundValue: r
  };
}, A_ = (e) => {
  let {
    props: t,
    steps: n,
    onSliderStart: i,
    onSliderMove: o,
    onSliderEnd: r,
    getActiveThumb: s
  } = e;
  const {
    isRtl: l
  } = en(), a = ie(t, "reverse"), d = y(() => t.direction === "vertical"), u = y(() => d.value !== a.value), {
    min: c,
    max: m,
    step: v,
    decimals: g,
    roundValue: h
  } = n, w = y(() => parseInt(t.thumbSize, 10)), C = y(() => parseInt(t.tickSize, 10)), O = y(() => parseInt(t.trackSize, 10)), P = y(() => (m.value - c.value) / v.value), M = ie(t, "disabled"), x = y(() => t.error || t.disabled ? void 0 : t.thumbColor ?? t.color), N = y(() => t.error || t.disabled ? void 0 : t.trackColor ?? t.color), $ = y(() => t.error || t.disabled ? void 0 : t.trackFillColor ?? t.color), E = he(!1), V = he(0), L = ue(), A = ue();
  function S(Y) {
    var b;
    const ce = t.direction === "vertical", Ie = ce ? "top" : "left", at = ce ? "height" : "width", Ge = ce ? "clientY" : "clientX", {
      [Ie]: Rn,
      [at]: Co
    } = (b = L.value) == null ? void 0 : b.$el.getBoundingClientRect(), ko = D_(Y, Ge);
    let p = Math.min(Math.max((ko - Rn - V.value) / Co, 0), 1) || 0;
    return (ce ? u.value : u.value !== l.value) && (p = 1 - p), h(c.value + p * (m.value - c.value));
  }
  const T = (Y) => {
    r({
      value: S(Y)
    }), E.value = !1, V.value = 0;
  }, B = (Y) => {
    A.value = s(Y), A.value && (A.value.focus(), E.value = !0, A.value.contains(Y.target) ? V.value = O_(Y, A.value, t.direction) : (V.value = 0, o({
      value: S(Y)
    })), i({
      value: S(Y)
    }));
  }, Z = {
    passive: !0,
    capture: !0
  };
  function Q(Y) {
    o({
      value: S(Y)
    });
  }
  function X(Y) {
    Y.stopPropagation(), Y.preventDefault(), T(Y), window.removeEventListener("mousemove", Q, Z), window.removeEventListener("mouseup", X);
  }
  function q(Y) {
    var ce;
    T(Y), window.removeEventListener("touchmove", Q, Z), (ce = Y.target) == null || ce.removeEventListener("touchend", q);
  }
  function ye(Y) {
    var ce;
    B(Y), window.addEventListener("touchmove", Q, Z), (ce = Y.target) == null || ce.addEventListener("touchend", q, {
      passive: !1
    });
  }
  function be(Y) {
    Y.preventDefault(), B(Y), window.addEventListener("mousemove", Q, Z), window.addEventListener("mouseup", X, {
      passive: !1
    });
  }
  const fe = (Y) => {
    const ce = (Y - c.value) / (m.value - c.value) * 100;
    return Pn(isNaN(ce) ? 0 : ce, 0, 100);
  }, ne = ie(t, "showTicks"), xe = y(() => ne.value ? t.ticks ? Array.isArray(t.ticks) ? t.ticks.map((Y) => ({
    value: Y,
    position: fe(Y),
    label: Y.toString()
  })) : Object.keys(t.ticks).map((Y) => ({
    value: parseFloat(Y),
    position: fe(parseFloat(Y)),
    label: t.ticks[Y]
  })) : P.value !== 1 / 0 ? fl(P.value + 1).map((Y) => {
    const ce = c.value + Y * v.value;
    return {
      value: ce,
      position: fe(ce)
    };
  }) : [] : []), Je = y(() => xe.value.some((Y) => {
    let {
      label: ce
    } = Y;
    return !!ce;
  })), Qe = {
    activeThumbRef: A,
    color: ie(t, "color"),
    decimals: g,
    disabled: M,
    direction: ie(t, "direction"),
    elevation: ie(t, "elevation"),
    hasLabels: Je,
    isReversed: a,
    indexFromEnd: u,
    min: c,
    max: m,
    mousePressed: E,
    numTicks: P,
    onSliderMousedown: be,
    onSliderTouchstart: ye,
    parsedTicks: xe,
    parseMouseMove: S,
    position: fe,
    readonly: ie(t, "readonly"),
    rounded: ie(t, "rounded"),
    roundValue: h,
    showTicks: ne,
    startOffset: V,
    step: v,
    thumbSize: w,
    thumbColor: x,
    thumbLabel: ie(t, "thumbLabel"),
    ticks: ie(t, "ticks"),
    tickSize: C,
    trackColor: N,
    trackContainerRef: L,
    trackFillColor: $,
    trackSize: O,
    vertical: d
  };
  return gt(Ll, Qe), Qe;
}, I_ = W({
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
  ...pe()
}, "VSliderThumb"), $_ = se()({
  name: "VSliderThumb",
  directives: {
    Ripple: Mr
  },
  props: I_(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: i
    } = t;
    const o = Re(Ll), {
      isRtl: r,
      rtlClasses: s
    } = en();
    if (!o) throw new Error("[Vuetify] v-slider-thumb must be used inside v-slider or v-range-slider");
    const {
      thumbColor: l,
      step: a,
      disabled: d,
      thumbSize: u,
      thumbLabel: c,
      direction: m,
      isReversed: v,
      vertical: g,
      readonly: h,
      elevation: w,
      mousePressed: C,
      decimals: O,
      indexFromEnd: P
    } = o, M = y(() => d.value ? void 0 : w.value), {
      elevationClasses: x
    } = En(M), {
      textColorClasses: N,
      textColorStyles: $
    } = Ht(l), {
      pageup: E,
      pagedown: V,
      end: L,
      home: A,
      left: S,
      right: T,
      down: B,
      up: Z
    } = ih, Q = [E, V, L, A, S, T, B, Z], X = y(() => a.value ? [1, 2, 3] : [1, 5, 10]);
    function q(be, fe) {
      if (!Q.includes(be.key)) return;
      be.preventDefault();
      const ne = a.value || 0.1, xe = (e.max - e.min) / ne;
      if ([S, T, B, Z].includes(be.key)) {
        const Qe = (g.value ? [r.value ? S : T, v.value ? B : Z] : P.value !== r.value ? [S, Z] : [T, Z]).includes(be.key) ? 1 : -1, Y = be.shiftKey ? 2 : be.ctrlKey ? 1 : 0;
        fe = fe + Qe * ne * X.value[Y];
      } else if (be.key === A)
        fe = e.min;
      else if (be.key === L)
        fe = e.max;
      else {
        const Je = be.key === V ? 1 : -1;
        fe = fe - Je * ne * (xe > 100 ? xe / 10 : 10);
      }
      return Math.max(e.min, Math.min(e.max, fe));
    }
    function ye(be) {
      const fe = q(be, e.modelValue);
      fe != null && i("update:modelValue", fe);
    }
    return ge(() => {
      const be = oe(P.value ? 100 - e.position : e.position, "%");
      return f("div", {
        class: ["v-slider-thumb", {
          "v-slider-thumb--focused": e.focused,
          "v-slider-thumb--pressed": e.focused && C.value
        }, e.class, s.value],
        style: [{
          "--v-slider-thumb-position": be,
          "--v-slider-thumb-size": oe(u.value)
        }, e.style],
        role: "slider",
        tabindex: d.value ? -1 : 0,
        "aria-label": e.name,
        "aria-valuemin": e.min,
        "aria-valuemax": e.max,
        "aria-valuenow": e.modelValue,
        "aria-readonly": !!h.value,
        "aria-orientation": m.value,
        onKeydown: h.value ? void 0 : ye
      }, [f("div", {
        class: ["v-slider-thumb__surface", N.value, x.value],
        style: {
          ...$.value
        }
      }, null), Nt(f("div", {
        class: ["v-slider-thumb__ripple", N.value],
        style: $.value
      }, null), [[Di("ripple"), e.ripple, null, {
        circle: !0,
        center: !0
      }]]), f(Jy, {
        origin: "bottom center"
      }, {
        default: () => {
          var fe;
          return [Nt(f("div", {
            class: "v-slider-thumb__label-container"
          }, [f("div", {
            class: ["v-slider-thumb__label"]
          }, [f("div", null, [((fe = n["thumb-label"]) == null ? void 0 : fe.call(n, {
            modelValue: e.modelValue
          })) ?? e.modelValue.toFixed(a.value ? O.value : 1)])])]), [[Mn, c.value && e.focused || c.value === "always"]])];
        }
      })]);
    }), {};
  }
}), M_ = W({
  start: {
    type: Number,
    required: !0
  },
  stop: {
    type: Number,
    required: !0
  },
  ...pe()
}, "VSliderTrack"), F_ = se()({
  name: "VSliderTrack",
  props: M_(),
  emits: {},
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = Re(Ll);
    if (!i) throw new Error("[Vuetify] v-slider-track must be inside v-slider or v-range-slider");
    const {
      color: o,
      parsedTicks: r,
      rounded: s,
      showTicks: l,
      tickSize: a,
      trackColor: d,
      trackFillColor: u,
      trackSize: c,
      vertical: m,
      min: v,
      max: g,
      indexFromEnd: h
    } = i, {
      roundedClasses: w
    } = _t(s), {
      backgroundColorClasses: C,
      backgroundColorStyles: O
    } = Dt(u), {
      backgroundColorClasses: P,
      backgroundColorStyles: M
    } = Dt(d), x = y(() => `inset-${m.value ? "block" : "inline"}-${h.value ? "end" : "start"}`), N = y(() => m.value ? "height" : "width"), $ = y(() => ({
      [x.value]: "0%",
      [N.value]: "100%"
    })), E = y(() => e.stop - e.start), V = y(() => ({
      [x.value]: oe(e.start, "%"),
      [N.value]: oe(E.value, "%")
    })), L = y(() => l.value ? (m.value ? r.value.slice().reverse() : r.value).map((S, T) => {
      var Z;
      const B = S.value !== v.value && S.value !== g.value ? oe(S.position, "%") : void 0;
      return f("div", {
        key: S.value,
        class: ["v-slider-track__tick", {
          "v-slider-track__tick--filled": S.position >= e.start && S.position <= e.stop,
          "v-slider-track__tick--first": S.value === v.value,
          "v-slider-track__tick--last": S.value === g.value
        }],
        style: {
          [x.value]: B
        }
      }, [(S.label || n["tick-label"]) && f("div", {
        class: "v-slider-track__tick-label"
      }, [((Z = n["tick-label"]) == null ? void 0 : Z.call(n, {
        tick: S,
        index: T
      })) ?? S.label])]);
    }) : []);
    return ge(() => f("div", {
      class: ["v-slider-track", w.value, e.class],
      style: [{
        "--v-slider-track-size": oe(c.value),
        "--v-slider-tick-size": oe(a.value)
      }, e.style]
    }, [f("div", {
      class: ["v-slider-track__background", P.value, {
        "v-slider-track__background--opacity": !!o.value || !u.value
      }],
      style: {
        ...$.value,
        ...M.value
      }
    }, null), f("div", {
      class: ["v-slider-track__fill", C.value],
      style: {
        ...V.value,
        ...O.value
      }
    }, null), l.value && f("div", {
      class: ["v-slider-track__ticks", {
        "v-slider-track__ticks--always-show": l.value === "always"
      }]
    }, [L.value])])), {};
  }
}), L_ = W({
  ...Il(),
  ...T_(),
  ...Ml(),
  modelValue: {
    type: [Number, String],
    default: 0
  }
}, "VSlider"), B_ = se()({
  name: "VSlider",
  props: L_(),
  emits: {
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0,
    start: (e) => !0,
    end: (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: i
    } = t;
    const o = ue(), {
      rtlClasses: r
    } = en(), s = P_(e), l = nt(e, "modelValue", void 0, (N) => s.roundValue(N ?? s.min.value)), {
      min: a,
      max: d,
      mousePressed: u,
      roundValue: c,
      onSliderMousedown: m,
      onSliderTouchstart: v,
      trackContainerRef: g,
      position: h,
      hasLabels: w,
      readonly: C
    } = A_({
      props: e,
      steps: s,
      onSliderStart: () => {
        i("start", l.value);
      },
      onSliderEnd: (N) => {
        let {
          value: $
        } = N;
        const E = c($);
        l.value = E, i("end", E);
      },
      onSliderMove: (N) => {
        let {
          value: $
        } = N;
        return l.value = c($);
      },
      getActiveThumb: () => {
        var N;
        return (N = o.value) == null ? void 0 : N.$el;
      }
    }), {
      isFocused: O,
      focus: P,
      blur: M
    } = $l(e), x = y(() => h(l.value));
    return ge(() => {
      const N = vr.filterProps(e), $ = !!(e.label || n.label || n.prepend);
      return f(vr, Ee({
        class: ["v-slider", {
          "v-slider--has-labels": !!n["tick-label"] || w.value,
          "v-slider--focused": O.value,
          "v-slider--pressed": u.value,
          "v-slider--disabled": e.disabled
        }, r.value, e.class],
        style: e.style
      }, N, {
        focused: O.value
      }), {
        ...n,
        prepend: $ ? (E) => {
          var V, L;
          return f(Ce, null, [((V = n.label) == null ? void 0 : V.call(n, E)) ?? (e.label ? f(Ef, {
            id: E.id.value,
            class: "v-slider__label",
            text: e.label
          }, null) : void 0), (L = n.prepend) == null ? void 0 : L.call(n, E)]);
        } : void 0,
        default: (E) => {
          let {
            id: V,
            messagesId: L
          } = E;
          return f("div", {
            class: "v-slider__container",
            onMousedown: C.value ? void 0 : m,
            onTouchstartPassive: C.value ? void 0 : v
          }, [f("input", {
            id: V.value,
            name: e.name || V.value,
            disabled: !!e.disabled,
            readonly: !!e.readonly,
            tabindex: "-1",
            value: l.value
          }, null), f(F_, {
            ref: g,
            start: 0,
            stop: x.value
          }, {
            "tick-label": n["tick-label"]
          }), f($_, {
            ref: o,
            "aria-describedby": L.value,
            focused: O.value,
            min: a.value,
            max: d.value,
            modelValue: l.value,
            "onUpdate:modelValue": (A) => l.value = A,
            position: x.value,
            elevation: e.elevation,
            onFocus: P,
            onBlur: M,
            ripple: e.ripple,
            name: e.name
          }, {
            "thumb-label": n["thumb-label"]
          })]);
        }
      });
    }), {};
  }
}), R_ = {
  name: "Settings",
  computed: {},
  mounted: function() {
    this.opt = {
      flow: this.settings.flow,
      theme: this.settings.flow,
      theme_mode: this.settings.theme_mode,
      font_size: this.settings.font_size,
      brightness: this.settings.brightness,
      show_comments: this.settings.show_comments
    };
  },
  methods: {
    set_and_emit: function(e, t) {
      this.opt[e] = t, this.$emit("update", this.opt);
    },
    set_theme_and_emit: function(e, t) {
      this.opt.theme = e, this.opt.theme_mode = t, this.$emit("update", this.opt);
    }
  },
  props: ["settings"],
  data: () => ({
    opt: {
      flow: "scrolled",
      theme: "eyecare",
      theme_mode: "day",
      font_size: 18,
      brightness: 100
    },
    themes: [{
      name: "white",
      mode: "day",
      color: "#F6F6F6",
      icon: "mdi-weather-sunny"
    }, {
      name: "eyecare",
      mode: "day",
      color: "#D3E3D3",
      icon: "mdi-eye"
    }, {
      name: "grey",
      mode: "night",
      color: "#4B4B4B",
      icon: "mdi-weather-night"
    }, {
      name: "dark",
      mode: "night",
      color: "#1A1A1A",
      icon: "mdi-candle"
    }]
  })
}, H_ = { class: "d-inline-blockx text-center d-flex" };
function j_(e, t, n, i, o, r) {
  return _e(), ke(oi, { density: "compact" }, {
    default: k(() => [
      f(Le, { class: "my-2" }, {
        default: k(() => [
          f(an, { class: "align-center" }, {
            default: k(() => [
              f(Ue, { cols: "2" }, {
                default: k(() => t[8] || (t[8] = [
                  Oe("span", null, "亮度*", -1)
                ])),
                _: 1
              }),
              f(Ue, { cols: "9" }, {
                default: k(() => [
                  f(B_, {
                    "hide-details": "",
                    modelValue: e.opt.brightness,
                    "onUpdate:modelValue": [
                      t[0] || (t[0] = (s) => e.opt.brightness = s),
                      t[1] || (t[1] = (s) => e.$emit("update", e.opt))
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
      f(Le, { class: "my-2" }, {
        default: k(() => [
          f(an, { class: "align-center" }, {
            default: k(() => [
              f(Ue, { cols: "2" }, {
                default: k(() => t[9] || (t[9] = [
                  Oe("span", { class: "text-justify" }, "字体*", -1)
                ])),
                _: 1
              }),
              f(Ue, {
                cols: "3",
                height: "48"
              }, {
                default: k(() => [
                  f(me, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[2] || (t[2] = (s) => r.set_and_emit("font_size", e.opt.font_size - 2))
                  }, {
                    default: k(() => t[10] || (t[10] = [
                      ae("A-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(Ue, { cols: "2" }, {
                default: k(() => [
                  Oe("span", H_, ft(e.opt.font_size), 1)
                ]),
                _: 1
              }),
              f(Ue, { cols: "3" }, {
                default: k(() => [
                  f(me, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[3] || (t[3] = (s) => r.set_and_emit("font_size", e.opt.font_size + 2))
                  }, {
                    default: k(() => t[11] || (t[11] = [
                      ae("A+")
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
      f(Le, { class: "my-2" }, {
        default: k(() => [
          f(an, { class: "align-center" }, {
            default: k(() => [
              f(Ue, { cols: "2" }, {
                default: k(() => t[12] || (t[12] = [
                  Oe("span", null, "翻页", -1)
                ])),
                _: 1
              }),
              f(Ue, { cols: "10" }, {
                default: k(() => [
                  f(bi, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: k(() => [
                      f(me, {
                        active: e.opt.flow == "paginated",
                        onClick: t[4] || (t[4] = (s) => r.set_and_emit("flow", "paginated"))
                      }, {
                        default: k(() => t[13] || (t[13] = [
                          ae("左右点击")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(me, {
                        active: e.opt.flow == "scrolled",
                        onClick: t[5] || (t[5] = (s) => r.set_and_emit("flow", "scrolled"))
                      }, {
                        default: k(() => t[14] || (t[14] = [
                          ae("上下滑动")
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
      f(Le, { class: "my-2" }, {
        default: k(() => [
          f(an, { class: "align-center" }, {
            default: k(() => [
              f(Ue, { cols: "2" }, {
                default: k(() => t[15] || (t[15] = [
                  Oe("span", null, "动画*", -1)
                ])),
                _: 1
              }),
              f(Ue, { cols: "10" }, {
                default: k(() => [
                  f(bi, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: k(() => [
                      f(me, {
                        active: e.opt.animation == "none"
                      }, {
                        default: k(() => t[16] || (t[16] = [
                          ae("无动画")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(me, {
                        active: e.opt.animation == "swap"
                      }, {
                        default: k(() => t[17] || (t[17] = [
                          ae("平移")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(me, {
                        active: e.opt.animation == "paper"
                      }, {
                        default: k(() => t[18] || (t[18] = [
                          ae("仿真")
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
      f(Le, { class: "my-2" }, {
        default: k(() => [
          f(an, { class: "align-center" }, {
            default: k(() => [
              f(Ue, { cols: "2" }, {
                default: k(() => t[19] || (t[19] = [
                  Oe("span", null, "背景*", -1)
                ])),
                _: 1
              }),
              f(Ue, { cols: "10" }, {
                default: k(() => [
                  f(bi, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: k(() => [
                      f(me, {
                        active: e.opt.background == "p0"
                      }, {
                        default: k(() => t[20] || (t[20] = [
                          ae("主题图0")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(me, {
                        active: e.opt.background == "p1"
                      }, {
                        default: k(() => t[21] || (t[21] = [
                          ae("主题图1")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(me, {
                        active: e.opt.background == "p2"
                      }, {
                        default: k(() => t[22] || (t[22] = [
                          ae("主题图2")
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
      f(Le, { class: "my-2" }, {
        default: k(() => [
          f(an, { style: { "margin-bottom": "1px" } }, {
            default: k(() => [
              f(Ue, { cols: "2" }, {
                default: k(() => t[23] || (t[23] = [
                  Oe("span", { density: "compact" }, "章评*", -1)
                ])),
                _: 1
              }),
              f(Ue, { cols: "10" }, {
                default: k(() => [
                  f(bi, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: k(() => [
                      f(me, {
                        active: e.opt.show_comments == !0,
                        onClick: t[6] || (t[6] = (s) => r.set_and_emit("show_comments", !0))
                      }, {
                        default: k(() => t[24] || (t[24] = [
                          ae("开启")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(me, {
                        active: e.opt.show_comments == !1,
                        onClick: t[7] || (t[7] = (s) => r.set_and_emit("show_comments", !1))
                      }, {
                        default: k(() => t[25] || (t[25] = [
                          ae("关闭")
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
      f(Le, { class: "my-2" }, {
        default: k(() => [
          f(an, { style: { "margin-bottom": "1px" } }, {
            default: k(() => [
              f(Ue, { cols: "2" }, {
                default: k(() => t[26] || (t[26] = [
                  Oe("span", { density: "compact" }, "主题", -1)
                ])),
                _: 1
              }),
              (_e(!0), Yn(Ce, null, Ei(e.themes, (s) => (_e(), ke(Ue, { cols: "2" }, {
                default: k(() => [
                  f(me, {
                    active: e.opt.theme == s.name,
                    density: "compact",
                    icon: s.icon,
                    color: s.color,
                    onClick: (l) => r.set_theme_and_emit(s.name, s.mode)
                  }, null, 8, ["active", "icon", "color", "onClick"])
                ]),
                _: 2
              }, 1024))), 256))
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      f(fn),
      f(Le, {
        class: "my-2",
        title: "带 * 号功能都在开发中"
      })
    ]),
    _: 1
  });
}
const z_ = /* @__PURE__ */ ci(R_, [["render", j_]]), U_ = W({
  ...pe(),
  ...Jp({
    fullHeight: !0
  }),
  ...Xe()
}, "VApp"), W_ = se()({
  name: "VApp",
  props: U_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = lt(e), {
      layoutClasses: o,
      getLayoutItem: r,
      items: s,
      layoutRef: l
    } = ty(e), {
      rtlClasses: a
    } = en();
    return ge(() => {
      var d;
      return f("div", {
        ref: l,
        class: ["v-application", i.themeClasses.value, o.value, a.value, e.class],
        style: [e.style]
      }, [f("div", {
        class: "v-application__wrap"
      }, [(d = n.default) == null ? void 0 : d.call(n)])]);
    }), {
      getLayoutItem: r,
      items: s,
      theme: i
    };
  }
}), K_ = W({
  text: String,
  ...pe(),
  ...je()
}, "VToolbarTitle"), G_ = se()({
  name: "VToolbarTitle",
  props: K_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return ge(() => {
      const i = !!(n.default || n.text || e.text);
      return f(e.tag, {
        class: ["v-toolbar-title", e.class],
        style: e.style
      }, {
        default: () => {
          var o;
          return [i && f("div", {
            class: "v-toolbar-title__placeholder"
          }, [n.text ? n.text() : e.text, (o = n.default) == null ? void 0 : o.call(n)])];
        }
      });
    }), {};
  }
}), Y_ = [null, "prominent", "default", "comfortable", "compact"], Ff = W({
  absolute: Boolean,
  collapse: Boolean,
  color: String,
  density: {
    type: String,
    default: "default",
    validator: (e) => Y_.includes(e)
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
  ...Ln(),
  ...pe(),
  ...Sn(),
  ...bt(),
  ...je({
    tag: "header"
  }),
  ...Xe()
}, "VToolbar"), Rs = se()({
  name: "VToolbar",
  props: Ff(),
  setup(e, t) {
    var v;
    let {
      slots: n
    } = t;
    const {
      backgroundColorClasses: i,
      backgroundColorStyles: o
    } = Dt(ie(e, "color")), {
      borderClasses: r
    } = Bn(e), {
      elevationClasses: s
    } = En(e), {
      roundedClasses: l
    } = _t(e), {
      themeClasses: a
    } = lt(e), {
      rtlClasses: d
    } = en(), u = he(!!(e.extended || (v = n.extension) != null && v.call(n))), c = y(() => parseInt(Number(e.height) + (e.density === "prominent" ? Number(e.height) : 0) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0), 10)), m = y(() => u.value ? parseInt(Number(e.extensionHeight) + (e.density === "prominent" ? Number(e.extensionHeight) : 0) - (e.density === "comfortable" ? 4 : 0) - (e.density === "compact" ? 8 : 0), 10) : 0);
    return Ti({
      VBtn: {
        variant: "text"
      }
    }), ge(() => {
      var C;
      const g = !!(e.title || n.title), h = !!(n.image || e.image), w = (C = n.extension) == null ? void 0 : C.call(n);
      return u.value = !!(e.extended || w), f(e.tag, {
        class: ["v-toolbar", {
          "v-toolbar--absolute": e.absolute,
          "v-toolbar--collapse": e.collapse,
          "v-toolbar--flat": e.flat,
          "v-toolbar--floating": e.floating,
          [`v-toolbar--density-${e.density}`]: !0
        }, i.value, r.value, s.value, l.value, a.value, d.value, e.class],
        style: [o.value, e.style]
      }, {
        default: () => [h && f("div", {
          key: "image",
          class: "v-toolbar__image"
        }, [n.image ? f(it, {
          key: "image-defaults",
          disabled: !e.image,
          defaults: {
            VImg: {
              cover: !0,
              src: e.image
            }
          }
        }, n.image) : f(wl, {
          key: "image-img",
          cover: !0,
          src: e.image
        }, null)]), f(it, {
          defaults: {
            VTabs: {
              height: oe(c.value)
            }
          }
        }, {
          default: () => {
            var O, P, M;
            return [f("div", {
              class: "v-toolbar__content",
              style: {
                height: oe(c.value)
              }
            }, [n.prepend && f("div", {
              class: "v-toolbar__prepend"
            }, [(O = n.prepend) == null ? void 0 : O.call(n)]), g && f(G_, {
              key: "title",
              text: e.title
            }, {
              text: n.title
            }), (P = n.default) == null ? void 0 : P.call(n), n.append && f("div", {
              class: "v-toolbar__append"
            }, [(M = n.append) == null ? void 0 : M.call(n)])])];
          }
        }), f(it, {
          defaults: {
            VTabs: {
              height: oe(m.value)
            }
          }
        }, {
          default: () => [f(ff, null, {
            default: () => [u.value && f("div", {
              class: "v-toolbar__extension",
              style: {
                height: oe(m.value)
              }
            }, [w])]
          })]
        })]
      });
    }), {
      contentHeight: c,
      extensionHeight: m
    };
  }
}), q_ = W({
  scrollTarget: {
    type: String
  },
  scrollThreshold: {
    type: [String, Number],
    default: 300
  }
}, "scroll");
function Z_(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const {
    canScroll: n
  } = t;
  let i = 0, o = 0;
  const r = ue(null), s = he(0), l = he(0), a = he(0), d = he(!1), u = he(!1), c = y(() => Number(e.scrollThreshold)), m = y(() => Pn((c.value - s.value) / c.value || 0)), v = () => {
    const g = r.value;
    if (!g || n && !n.value) return;
    i = s.value, s.value = "window" in g ? g.pageYOffset : g.scrollTop;
    const h = g instanceof Window ? document.documentElement.scrollHeight : g.scrollHeight;
    if (o !== h) {
      o = h;
      return;
    }
    u.value = s.value < i, a.value = Math.abs(s.value - c.value);
  };
  return ve(u, () => {
    l.value = l.value || s.value;
  }), ve(d, () => {
    l.value = 0;
  }), In(() => {
    ve(() => e.scrollTarget, (g) => {
      var w;
      const h = g ? document.querySelector(g) : window;
      if (!h) {
        dn(`Unable to locate element with identifier ${g}`);
        return;
      }
      h !== r.value && ((w = r.value) == null || w.removeEventListener("scroll", v), r.value = h, r.value.addEventListener("scroll", v, {
        passive: !0
      }));
    }, {
      immediate: !0
    });
  }), yt(() => {
    var g;
    (g = r.value) == null || g.removeEventListener("scroll", v);
  }), n && ve(n, v, {
    immediate: !0
  }), {
    scrollThreshold: c,
    currentScroll: s,
    currentThreshold: a,
    isScrollActive: d,
    scrollRatio: m,
    // required only for testing
    // probably can be removed
    // later (2 chars chlng)
    isScrollingUp: u,
    savedScroll: l
  };
}
const X_ = W({
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
  ...Ff(),
  ...Od(),
  ...q_(),
  height: {
    type: [Number, String],
    default: 64
  }
}, "VAppBar"), J_ = se()({
  name: "VAppBar",
  props: X_(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = ue(), o = nt(e, "modelValue"), r = y(() => {
      var P;
      const O = new Set(((P = e.scrollBehavior) == null ? void 0 : P.split(" ")) ?? []);
      return {
        hide: O.has("hide"),
        fullyHide: O.has("fully-hide"),
        inverted: O.has("inverted"),
        collapse: O.has("collapse"),
        elevate: O.has("elevate"),
        fadeImage: O.has("fade-image")
        // shrink: behavior.has('shrink'),
      };
    }), s = y(() => {
      const O = r.value;
      return O.hide || O.fullyHide || O.inverted || O.collapse || O.elevate || O.fadeImage || // behavior.shrink ||
      !o.value;
    }), {
      currentScroll: l,
      scrollThreshold: a,
      isScrollingUp: d,
      scrollRatio: u
    } = Z_(e, {
      canScroll: s
    }), c = y(() => r.value.hide || r.value.fullyHide), m = y(() => e.collapse || r.value.collapse && (r.value.inverted ? u.value > 0 : u.value === 0)), v = y(() => e.flat || r.value.fullyHide && !o.value || r.value.elevate && (r.value.inverted ? l.value > 0 : l.value === 0)), g = y(() => r.value.fadeImage ? r.value.inverted ? 1 - u.value : u.value : void 0), h = y(() => {
      var M, x;
      if (r.value.hide && r.value.inverted) return 0;
      const O = ((M = i.value) == null ? void 0 : M.contentHeight) ?? 0, P = ((x = i.value) == null ? void 0 : x.extensionHeight) ?? 0;
      return c.value ? l.value < a.value || r.value.fullyHide ? O + P : O : O + P;
    });
    ai(y(() => !!e.scrollBehavior), () => {
      yn(() => {
        c.value ? r.value.inverted ? o.value = l.value > a.value : o.value = d.value || l.value < a.value : o.value = !0;
      });
    });
    const {
      ssrBootStyles: w
    } = Fr(), {
      layoutItemStyles: C
    } = Dd({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: ie(e, "location"),
      layoutSize: h,
      elementSize: he(void 0),
      active: o,
      absolute: ie(e, "absolute")
    });
    return ge(() => {
      const O = Rs.filterProps(e);
      return f(Rs, Ee({
        ref: i,
        class: ["v-app-bar", {
          "v-app-bar--bottom": e.location === "bottom"
        }, e.class],
        style: [{
          ...C.value,
          "--v-toolbar-image-opacity": g.value,
          height: void 0,
          ...w.value
        }, e.style]
      }, O, {
        collapse: m.value,
        flat: v.value
      }), n);
    }), {};
  }
}), Q_ = W({
  bordered: Boolean,
  color: String,
  content: [Number, String],
  dot: Boolean,
  floating: Boolean,
  icon: He,
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
  ...pe(),
  ...So({
    location: "top end"
  }),
  ...bt(),
  ...je(),
  ...Xe(),
  ...bo({
    transition: "scale-rotate-transition"
  })
}, "VBadge"), e0 = se()({
  name: "VBadge",
  inheritAttrs: !1,
  props: Q_(),
  setup(e, t) {
    const {
      backgroundColorClasses: n,
      backgroundColorStyles: i
    } = Dt(ie(e, "color")), {
      roundedClasses: o
    } = _t(e), {
      t: r
    } = bl(), {
      textColorClasses: s,
      textColorStyles: l
    } = Ht(ie(e, "textColor")), {
      themeClasses: a
    } = Nd(), {
      locationStyles: d
    } = Eo(e, !0, (u) => (e.floating ? e.dot ? 2 : 4 : e.dot ? 8 : 12) + (["top", "bottom"].includes(u) ? +(e.offsetY ?? 0) : ["left", "right"].includes(u) ? +(e.offsetX ?? 0) : 0));
    return ge(() => {
      const u = Number(e.content), c = !e.max || isNaN(u) ? e.content : u <= +e.max ? u : `${e.max}+`, [m, v] = xs(t.attrs, ["aria-atomic", "aria-label", "aria-live", "role", "title"]);
      return f(e.tag, Ee({
        class: ["v-badge", {
          "v-badge--bordered": e.bordered,
          "v-badge--dot": e.dot,
          "v-badge--floating": e.floating,
          "v-badge--inline": e.inline
        }, e.class]
      }, v, {
        style: e.style
      }), {
        default: () => {
          var g, h;
          return [f("div", {
            class: "v-badge__wrapper"
          }, [(h = (g = t.slots).default) == null ? void 0 : h.call(g), f(cn, {
            transition: e.transition
          }, {
            default: () => {
              var w, C;
              return [Nt(f("span", Ee({
                class: ["v-badge__badge", a.value, n.value, o.value, s.value],
                style: [i.value, l.value, e.inline ? {} : d.value],
                "aria-atomic": "true",
                "aria-label": r(e.label, u),
                "aria-live": "polite",
                role: "status"
              }, m), [e.dot ? void 0 : t.slots.badge ? (C = (w = t.slots).badge) == null ? void 0 : C.call(w) : e.icon ? f(We, {
                icon: e.icon
              }, null) : c]), [[Mn, e.modelValue]])];
            }
          })])];
        }
      });
    }), {};
  }
}), t0 = W({
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
  ...Ln(),
  ...pe(),
  ...tn(),
  ...Sn(),
  ...bt(),
  ...Od({
    name: "bottom-navigation"
  }),
  ...je({
    tag: "header"
  }),
  ...Md({
    selectedClass: "v-btn--selected"
  }),
  ...Xe()
}, "VBottomNavigation"), n0 = se()({
  name: "VBottomNavigation",
  props: t0(),
  emits: {
    "update:active": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: i
    } = Nd(), {
      borderClasses: o
    } = Bn(e), {
      backgroundColorClasses: r,
      backgroundColorStyles: s
    } = Dt(ie(e, "bgColor")), {
      densityClasses: l
    } = wn(e), {
      elevationClasses: a
    } = En(e), {
      roundedClasses: d
    } = _t(e), {
      ssrBootStyles: u
    } = Fr(), c = y(() => Number(e.height) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0)), m = nt(e, "active", e.active), {
      layoutItemStyles: v
    } = Dd({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: y(() => "bottom"),
      layoutSize: y(() => m.value ? c.value : 0),
      elementSize: c,
      active: m,
      absolute: ie(e, "absolute")
    });
    return Fd(e, Sl), Ti({
      VBtn: {
        baseColor: ie(e, "baseColor"),
        color: ie(e, "color"),
        density: ie(e, "density"),
        stacked: y(() => e.mode !== "horizontal"),
        variant: "text"
      }
    }, {
      scoped: !0
    }), ge(() => f(e.tag, {
      class: ["v-bottom-navigation", {
        "v-bottom-navigation--active": m.value,
        "v-bottom-navigation--grow": e.grow,
        "v-bottom-navigation--shift": e.mode === "shift"
      }, i.value, r.value, o.value, l.value, a.value, d.value, e.class],
      style: [s.value, v.value, {
        height: oe(c.value)
      }, u.value, e.style]
    }, {
      default: () => [n.default && f("div", {
        class: "v-bottom-navigation__content"
      }, [n.default()])]
    })), {};
  }
}), i0 = W({
  inset: Boolean,
  ...Mf({
    transition: "bottom-sheet-transition"
  })
}, "VBottomSheet"), Hi = se()({
  name: "VBottomSheet",
  props: i0(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = nt(e, "modelValue");
    return ge(() => {
      const o = _i.filterProps(e);
      return f(_i, Ee(o, {
        contentClass: ["v-bottom-sheet__content", e.contentClass],
        modelValue: i.value,
        "onUpdate:modelValue": (r) => i.value = r,
        class: ["v-bottom-sheet", {
          "v-bottom-sheet--inset": e.inset
        }, e.class],
        style: e.style
      }), n);
    }), {};
  }
}), o0 = W({
  scrollable: Boolean,
  ...pe(),
  ...bn(),
  ...je({
    tag: "main"
  })
}, "VMain"), r0 = se()({
  name: "VMain",
  props: o0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      dimensionStyles: i
    } = _n(e), {
      mainStyles: o
    } = Qp(), {
      ssrBootStyles: r
    } = Fr();
    return ge(() => f(e.tag, {
      class: ["v-main", {
        "v-main--scrollable": e.scrollable
      }, e.class],
      style: [o.value, r.value, i.value, e.style]
    }, {
      default: () => {
        var s, l;
        return [e.scrollable ? f("div", {
          class: "v-main__scroller"
        }, [(s = n.default) == null ? void 0 : s.call(n)]) : (l = n.default) == null ? void 0 : l.call(n)];
      }
    })), {};
  }
}), s0 = {
  name: "EpubReader",
  components: {},
  props: ["book_url", "display_url", "debug", "themes_css"],
  computed: {
    switch_theme_icon: function() {
      return this.settings.theme_mode == "day" ? "mdi-weather-night" : "mdi-weather-sunny";
    },
    switch_theme_text: function() {
      return this.settings.theme_mode == "day" ? "夜晚" : "白天";
    }
  },
  methods: {
    switch_theme: function() {
      this.settings.theme_mode == "day" ? (this.settings.app_theme = "dark", this.settings.theme_mode = "night", this.settings.theme = this.settings.theme_night) : (this.settings.app_theme = "light", this.settings.theme_mode = "day", this.settings.theme = this.settings.theme_day), this.rendition.themes.select(this.settings.theme), this.save_settings();
    },
    set_menu: function(e) {
      var t = e;
      this.menu.current_panel == t && this.menu.panels[t] === !0 && (t = "hide"), this.menu.value = t == "hide" ? void 0 : t, console.log("set menu = ", t, ", current menu.value=", this.menu.value), this.menu.current_panel = t, this.menu.show_navbar = !0;
      for (var n in this.menu.panels)
        this.menu.panels[n] = n == t;
    },
    save_settings: function() {
      localStorage.setItem("readerSettings", JSON.stringify(this.settings));
    },
    update_settings: function(e) {
      e.flow != this.settings.flow && (this.rendition.flow(e.flow), this.set_menu("hide"));
      for (const i in e)
        this.settings[i] = e[i];
      const t = e.theme_mode, n = "theme_" + t;
      this.settings[n] = this.settings.theme, this.rendition.themes.select(this.settings.theme), this.settings.app_theme = t == "day" ? "light" : "dark", this.save_settings();
    },
    on_click_toc: function(e) {
      console.log(e), this.set_menu("hide"), this.rendition.display(e.id);
    },
    on_mousedown: function(e) {
      this.mouse_down_time = /* @__PURE__ */ new Date();
    },
    on_mouseup: function(e) {
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
      const t = e.view.frameElement.getBoundingClientRect(), n = document.getElementById("reader"), i = n.offsetWidth, o = n.offsetHeight, r = (e.clientX + t.x) % n.offsetWidth, s = (e.clientY + t.y) % n.offsetHeight;
      if (this.debug_click(r, s, i, o), this.is_toolbar_visible()) {
        this.hide_toolbar();
        return;
      }
      const l = i < this.wide_screen, a = l ? 3 : 5;
      r < i / a || l && s < o / a ? (console.log("<- prev page"), this.rendition.prev()) : r > i * (a - 1) / a || l && s > o * (a - 1) / a ? (console.log("-> next page"), this.rendition.next().then()) : (console.log("-- toggle menu"), this.menu.show_navbar = !this.menu.show_navbar);
    },
    bin_search: function(e, t, n) {
      for (var i = 0, o = e.length; i < o; ) {
        const s = Math.floor((i + o) / 2);
        if (s == i)
          break;
        const l = e[s];
        if (l.cfi === void 0) {
          if (l.href.indexOf("#") > 0) {
            const d = l.href.split("#")[1];
            l.elem = n.document.getElementById(d);
          } else
            l.elem = n.document.getElementsByTagName("p")[0];
          l.cfi = new ePub.CFI(l.elem, n.cfiBase), l.cfi = new ePub.CFI(l.cfi.toString());
        }
        const a = this.book.locations.epubcfi.compare(t, l.cfi);
        if (a == 0)
          return l;
        a < 0 && (o = s), a > 0 && (i = s);
      }
      const r = e[i];
      if (r.cfi === void 0) {
        if (r.href.indexOf("#") > 0) {
          const s = r.href.split("#")[1];
          r.elem = n.document.getElementById(s);
        } else
          r.elem = n.document.getElementsByTagName("p")[0];
        r.cfi = new ePub.CFI(r.elem, n.cfiBase);
      }
      return r;
    },
    find_same_href_in_toc_tree: function(e, t) {
      for (var n in e) {
        const i = e[n];
        if (i.href == t)
          return i;
        if (i.subitems.length > 0) {
          const o = this.find_same_href_in_toc_tree(i.subitems, t);
          if (o !== void 0)
            return o;
        }
      }
    },
    find_toc: function(e, t) {
      const n = new ePub.CFI(e.toString()), i = this.book.spine.get(t.sectionIndex), o = this.find_same_href_in_toc_tree(this.toc_items, i.href);
      if (console.log("got spine href in toc:", o), o !== void 0) {
        if (o.elem === void 0) {
          const s = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
          for (let a of s) {
            const d = t.document.getElementsByTagName(a);
            if (d.length > 0) {
              o.elem = d[0];
              break;
            }
          }
          const l = new ePub.CFI(o.elem, t.cfiBase);
          o.cfi = new ePub.CFI(l.toString());
        }
        var r = o;
        return o.subitems.length > 0 && (r = this.bin_search(o.subitems, n, t), this.book.locations.epubcfi.compare(n, r.cfi) < 0 && (r = o)), console.log("find_toc = ", r), r;
      }
    },
    count_distinct_between: function(e, t) {
      for (var n = t; n.parentElement != e.parentNode; )
        n = n.parentElement;
      let i = 0, o = e;
      for (; o && o !== n; )
        o.nodeName.toUpperCase() === "P" && i++, o = o.nextSibling;
      return i;
    },
    hide_toolbar: function() {
      this.toolbar_left = -999;
    },
    show_toolbar: function(e, t) {
      console.log("show toolbar at rect", e, " from iframe rect", t);
      const n = document.getElementById("comments-toolbar");
      this.toolbar_left = e.left + t.x;
      const i = e.top + t.y, o = e.bottom + t.y;
      i >= n.offsetHeight + 64 ? this.toolbar_top = i - n.offsetHeight - 12 : this.toolbar_top = o + 12;
    },
    is_toolbar_visible: function() {
      return this.toolbar_left > 0;
    },
    on_select_content: function(e, t) {
      console.log("on selectd", e, t), this.is_handlering_selected_content = !0;
      const n = this.rendition.getRange(e);
      for (var i = n.startContainer.nodeType === Node.TEXT_NODE ? n.startContainer.parentElement : n.startContainer; i.nodeName.toUpperCase() != "P" && i.nodeName.toUpperCase()[0] != "H"; )
        i = i.parentElement;
      console.log("elem =", i);
      const o = new ePub.CFI(i, t.cfiBase), r = this.find_toc(o, t);
      console.log("cfi = ", o, "toc =", r);
      const s = o.path.steps[1].index - r.cfi.path.steps[1].index;
      console.log("segment_id = ", s), this.selected_location = {
        toc: r,
        cfi: o,
        contents: t,
        segment_id: s
      };
      const l = this.rendition.views()._views.filter((a) => a.index == t.sectionIndex)[0];
      this.show_toolbar(i.getBoundingClientRect(), l.iframe.getBoundingClientRect());
    },
    on_click_toolbar_comments: function() {
      console.log("点击发表评论按钮", this.selected_location);
      const e = this.selected_location;
      this.hide_toolbar(), this.show_selected_comments(e.toc, e.segment_id, e.cfi);
    },
    on_keyup: function(e) {
      const t = e.keyCode || e.which;
      (t == 37 || t == 38) && this.rendition.prev(), (t == 39 || t == 40) && this.rendition.next();
    },
    debug_click: function(e, t, n, i) {
      if (console.log("click at", e, t, n, i), !this.is_debug_click) return;
      e = e - 10, t = t - 10;
      const o = document.createElement("div");
      o.classList.add("dot"), o.style.left = `${e}px`, o.style.top = `${t}px`, document.body.appendChild(o), setTimeout(() => {
        document.body.removeChild(o);
      }, 2e3);
    },
    debug_signals: function() {
      if (this.is_debug_signal) {
        var e = ["click", "selected", "touchstart", "touchend", "touchmove"], e = ["added", "attach", "attached", "axis", "changed", "detach", "displayed", "displayerror", "expand", "hidden", "layout", "linkClicked", "loaderror", "locationChanged", "markClicked", "openFailed", "orientationchange", "relocated", "removed", "rendered", "resize", "resized", "scroll", "scrolled", "selected", "selectedRange", "shown", "started", "updated", "writingMode", "mouseup", "mousedown", "mousemove", "click", "touchend", "touchstart", "touchmove"];
        e.forEach((t) => {
          this.rendition.on(t, (n) => {
            this.alert_msg = t, console.log("rendition signal:", t, n);
          });
        });
      }
    },
    init_listeners: function() {
      document.addEventListener("keyup", this.on_keyup), this.rendition.on("keyup", this.on_keyup), this.rendition.on("click", this.on_click_content), this.rendition.on("selected", this.on_select_content), this.rendition.on("locationChanged", this.on_location_changed), this.rendition.on("mousedown", this.on_mousedown), this.rendition.on("mouseup", this.on_mouseup), this.debug_signals();
    },
    init_themes: function() {
      console.log("load themes from:", this.themes_css), this.rendition.themes.register("white", this.themes_css), this.rendition.themes.register("dark", this.themes_css), this.rendition.themes.register("grey", this.themes_css), this.rendition.themes.register("brown", this.themes_css), this.rendition.themes.register("eyecare", this.themes_css), this.rendition.themes.select(this.settings.theme);
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
      }).then((i) => {
        i.err == "ok" && (this.comments.push(i.data), alert("评论成功")), console.log("add review rsp = ", i);
      });
    },
    on_location_changed_old: function(e) {
      const t = this.rendition.getContents();
      [e.start, e.end].forEach((n) => {
        console.log("handle location ", n);
        const i = this.book.spine.get(n), o = t.filter((l) => l.cfiBase == i.cfiBase)[0], r = new ePub.CFI(n), s = this.find_toc(r, o, i.href);
        this.load_comments_summary(o, s);
      });
    },
    on_location_changed: function(e) {
      this.rendition.currentLocation(), this.current_toc_progress = "";
      const t = new ePub.CFI(e.start), n = new ePub.CFI(e.end), i = this.rendition.getContents();
      for (var o = t.spinePos; o <= n.spinePos; o++) {
        const r = this.book.spine.get(o), s = i.filter((c) => c.cfiBase == r.cfiBase);
        if (s === void 0)
          continue;
        const l = s[0], a = l.document.getElementsByTagName("p")[0], d = new ePub.CFI(a, r.cfiBase), u = this.find_toc(d, l, r.href);
        this.current_toc_title = u ? u.label : "", this.load_comments_summary(l, u);
      }
    },
    load_comments_summary: function(e, t) {
      if (console.log("load_comments_summary at ", e, t), t === void 0) {
        console.log("!! 加载章评错误，章节信息为空");
        return;
      }
      if (t.load_time !== void 0 && /* @__PURE__ */ new Date() - t.load_time < this.comments_refresh_time)
        return;
      t.load_time = /* @__PURE__ */ new Date();
      const n = t.label.trim();
      var i = `/api/review/summary?book_id=${this.book_id}&chapter_name=${n}`;
      this.$backend(i).then((o) => {
        t.load_time = /* @__PURE__ */ new Date(), t.summary = {}, t.chapter_id = o.data.chapter_id, o.data.list.forEach((r) => {
          t.summary[r.segmentId] = r, t.icons_rendered = !1;
        });
      }).catch(function(o) {
        console.error("请求过程中出现错误：", o);
      }).finally(() => {
        this.add_comment_icons(e, t);
      });
    },
    add_comment_icons: function(e, t) {
      console.log("添加评论图标和计数器：", t.label.trim());
      var n = 0;
      for (var i in t.summary)
        i > n && (n = i);
      for (var o = 0, r = t.elem; o <= n && r; ) {
        const s = r.nodeName.toUpperCase();
        (s === "P" || s[0] === "H") && (this.add_icon_into_paragraph(e, r, o, t), o++), r = r.nextSibling;
      }
    },
    add_icon_into_paragraph: function(e, t, n, i) {
      const o = i.summary[n];
      if (o === void 0)
        return;
      const r = new ePub.CFI(t, e.cfiBase).toString(), s = o.reviewNum, l = o.is_hot ? "hot-comment" : "", a = e.document, d = a.createElement("span");
      d.textContent = s > 0 ? s : "", d.className = `comment-count ${l}`;
      const u = a.createElement("div");
      u.className = `comment-icon ${l}`, u.appendChild(d), t.appendChild(u), u.addEventListener("click", (c) => {
        c.stopPropagation(), console.log("点击评论按钮", i.chapter_id, n, r), this.show_selected_comments(i, n, r);
      });
    },
    show_selected_comments: function(e, t, n) {
      if (this.comments = [], this.comments_location = {
        toc: e,
        cfi: n,
        segment_id: t
      }, e.chapter_id === void 0) {
        this.set_menu("comments");
        return;
      }
      const i = `/api/review/list?book_id=${this.book_id}&chapter_id=${e.chapter_id}&segment_id=${t}&cfi=${n}`;
      this.$backend(i).then((o) => {
        this.comments = o.data.list, this.set_menu("comments");
      });
    },
    on_login_user: function(e) {
      this.user = e;
    }
  },
  mounted: function() {
    const e = document.createElement("link");
    e.rel = "stylesheet", e.type = "text/css", e.href = this.themes_css, document.head.appendChild(e);
    const t = localStorage.getItem("readerSettings");
    t && (this.settings = JSON.parse(t), console.log("加载设置：", t)), this.is_debug_signal = this.debug, this.is_debug_click = this.debug, this.loading = !0, this.$backend("/api/review/me?count=true").then((i) => {
      i.err == "user.need_login" ? this.is_login = !1 : i.err == "ok" && (this.unread_count = i.data.count);
    }), this.$backend("/api/user/info").then((i) => {
      i.err == "ok" && (this.user = i.data);
    }), this.book = ePub(this.book_url), this.rendition = this.book.renderTo("reader", {
      manager: "continuous",
      flow: this.settings.flow,
      width: "100%",
      height: "100%"
      //snap: true
    }), this.book.loaded.metadata.then((i) => {
      console.log(i), this.book_meta = i, this.book_title = i.title;
      const o = `/api/review/book?title=${this.book_title}`;
      this.$backend(o).then((r) => {
        this.book_id = r.data.id;
      });
    }), this.book.loaded.navigation.then((i) => {
      this.toc_items = i.toc;
    }), this.init_listeners(), this.init_themes(), this.book.ready.then(() => {
      const i = localStorage.getItem("lastReadPosition");
      this.rendition.display(i || this.display_url).then(() => {
        this.loading = !1, this.rendition.on("relocated", (o) => {
          localStorage.setItem("lastReadPosition", o.start.cfi);
        });
      });
    });
  },
  data: () => ({
    loading: !0,
    book: null,
    settings: {
      flow: "paginated",
      // flow: "scrolled",
      font_size: 18,
      brightness: 100,
      theme: "white",
      theme_mode: "day",
      theme_day: "white",
      theme_night: "grey",
      show_comments: !0,
      app_theme: "light"
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
        ai: !1
      }
    },
    theme_mode: "day",
    toc_items: [],
    comments: [],
    comments_location: {},
    // 评论内容的位置
    selected_location: {},
    // 选中内容的位置
    current_toc_title: "",
    current_toc_progress: "",
    toolbar_left: -999,
    toolbar_top: 0,
    is_debug_signal: !0,
    is_debug_click: !0,
    unread_count: 0,
    is_handlering_selected_content: !1,
    check_if_selected_content: !1
  })
}, l0 = {
  id: "status-bar-left",
  class: "align-start"
}, a0 = {
  id: "status-bar-right",
  class: "align-end"
};
function u0(e, t, n, i, o, r) {
  const s = z_, l = V_, a = k_, d = w_, u = Bb;
  return _e(), ke(W_, {
    theme: e.settings.app_theme,
    "full-height": "",
    density: "compact"
  }, {
    default: k(() => [
      e.menu.show_navbar ? (_e(), ke(J_, {
        key: 0,
        density: "compact"
      }, {
        prepend: k(() => [
          f(me, { icon: "" }, {
            default: k(() => [
              f(We, null, {
                default: k(() => [
                  ae(ft(e.is_debug_signal ? "mdi-arrow-left" : "mdi-candle"), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        default: k(() => [
          ae(" " + ft(e.is_debug_signal ? e.alert_msg : e.book_title) + " ", 1),
          f(af),
          f(me, { icon: "" }, {
            default: k(() => [
              f(We, null, {
                default: k(() => t[13] || (t[13] = [
                  ae("mdi-dots-vertical")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : hi("", !0),
      f(n0, {
        modelValue: e.menu.value,
        "onUpdate:modelValue": t[4] || (t[4] = (c) => e.menu.value = c),
        active: e.menu.show_navbar,
        "z-index": "2599"
      }, {
        default: k(() => [
          f(me, {
            value: "toc",
            onClick: t[0] || (t[0] = (c) => r.set_menu("toc"))
          }, {
            default: k(() => [
              f(We, null, {
                default: k(() => t[14] || (t[14] = [
                  ae("mdi-book-open-variant-outline")
                ])),
                _: 1
              }),
              t[15] || (t[15] = Oe("span", null, "目录", -1))
            ]),
            _: 1
          }),
          f(me, { onClick: r.switch_theme }, {
            default: k(() => [
              f(We, null, {
                default: k(() => [
                  ae(ft(r.switch_theme_icon), 1)
                ]),
                _: 1
              }),
              Oe("span", null, ft(r.switch_theme_text), 1)
            ]),
            _: 1
          }, 8, ["onClick"]),
          f(me, {
            value: "settings",
            onClick: t[1] || (t[1] = (c) => r.set_menu("settings"))
          }, {
            default: k(() => [
              f(We, null, {
                default: k(() => t[16] || (t[16] = [
                  ae("mdi-cog")
                ])),
                _: 1
              }),
              t[17] || (t[17] = Oe("span", null, "设置", -1))
            ]),
            _: 1
          }),
          f(me, {
            value: "more",
            onClick: t[2] || (t[2] = (c) => r.set_menu("more"))
          }, {
            default: k(() => [
              e.unread_count ? (_e(), ke(e0, {
                key: 0,
                color: "error",
                content: e.unread_count
              }, {
                default: k(() => [
                  f(We, null, {
                    default: k(() => t[18] || (t[18] = [
                      ae("mdi-account-circle-outline")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["content"])) : (_e(), ke(We, { key: 1 }, {
                default: k(() => t[19] || (t[19] = [
                  ae("mdi-account-circle-outline")
                ])),
                _: 1
              })),
              t[20] || (t[20] = Oe("span", null, "用户", -1))
            ]),
            _: 1
          }),
          f(me, {
            value: "ai",
            onClick: t[3] || (t[3] = (c) => r.set_menu("ai"))
          }, {
            default: k(() => [
              f(We, null, {
                default: k(() => t[21] || (t[21] = [
                  ae("mdi-face-man-shimmer")
                ])),
                _: 1
              }),
              t[22] || (t[22] = Oe("span", null, "AI", -1))
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue", "active"]),
      f(Hi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.settings,
        "onUpdate:modelValue": t[5] || (t[5] = (c) => e.menu.panels.settings = c),
        contained: "",
        persistent: "",
        "z-index": "234"
      }, {
        default: k(() => [
          f(s, {
            settings: e.settings,
            onUpdate: r.update_settings
          }, null, 8, ["settings", "onUpdate"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Hi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.toc,
        "onUpdate:modelValue": t[6] || (t[6] = (c) => e.menu.panels.toc = c),
        contained: "",
        "close-on-content-click": "",
        "z-index": "234"
      }, {
        default: k(() => [
          f(l, {
            meta: e.book_meta,
            toc_items: e.toc_items,
            "onClick:select": r.on_click_toc
          }, null, 8, ["meta", "toc_items", "onClick:select"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Hi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.more,
        "onUpdate:modelValue": t[8] || (t[8] = (c) => e.menu.panels.more = c),
        contained: "",
        "z-index": "234"
      }, {
        default: k(() => [
          e.user ? (_e(), ke(d, {
            key: 1,
            messages: e.comments,
            user: e.user,
            onUpdate: r.on_login_user,
            onLogout: t[7] || (t[7] = (c) => e.user = null)
          }, null, 8, ["messages", "user", "onUpdate"])) : (_e(), ke(a, {
            key: 0,
            onLogin: r.on_login_user
          }, null, 8, ["onLogin"]))
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Hi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.comments,
        "onUpdate:modelValue": t[10] || (t[10] = (c) => e.menu.panels.comments = c),
        contained: "",
        "z-index": "234"
      }, {
        default: k(() => [
          f(u, {
            login: e.is_login,
            comments: e.comments,
            onClose: t[9] || (t[9] = (c) => r.set_menu("hide")),
            onAdd_review: r.on_add_review
          }, null, 8, ["login", "comments", "onAdd_review"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Hi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.ai,
        "onUpdate:modelValue": t[11] || (t[11] = (c) => e.menu.panels.ai = c),
        contained: "",
        "z-index": "234"
      }, {
        default: k(() => [
          f(Kt, { title: "开发中" })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      Oe("div", {
        id: "comments-toolbar",
        style: yr(`left: ${e.toolbar_left}px; top: ${e.toolbar_top}px;`)
      }, [
        f(Rs, {
          density: "compact",
          border: "",
          dense: "",
          floating: "",
          elevation: "10",
          rounded: ""
        }, {
          default: k(() => [
            f(me, { onClick: r.on_click_toolbar_comments }, {
              default: k(() => t[23] || (t[23] = [
                ae("发段评")
              ])),
              _: 1
            }, 8, ["onClick"]),
            f(fn, { vertical: "" }),
            f(me, null, {
              default: k(() => t[24] || (t[24] = [
                ae("从这里听")
              ])),
              _: 1
            }),
            f(fn, { vertical: "" }),
            f(me, null, {
              default: k(() => t[25] || (t[25] = [
                ae("复制")
              ])),
              _: 1
            }),
            f(fn, { vertical: "" }),
            f(me, null, {
              default: k(() => t[26] || (t[26] = [
                ae("反馈")
              ])),
              _: 1
            })
          ]),
          _: 1
        })
      ], 4),
      f(r0, {
        id: "main",
        class: "pa-0"
      }, {
        default: k(() => [
          f(Bs, {
            modelValue: e.loading,
            "onUpdate:modelValue": t[12] || (t[12] = (c) => e.loading = c),
            "z-index": "auto",
            class: "align-center justify-center",
            persistent: ""
          }, {
            default: k(() => [
              f(Rd, {
                indeterminate: "",
                size: "64",
                color: "primary"
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          Oe("div", {
            id: "status-bar",
            class: br(e.settings.theme)
          }, [
            Oe("div", l0, ft(e.current_toc_title), 1),
            Oe("div", a0, ft(e.current_toc_progress), 1)
          ], 2),
          t[27] || (t[27] = Oe("div", { id: "reader" }, null, -1))
        ]),
        _: 1
      })
    ]),
    _: 1
  }, 8, ["theme"]);
}
const c0 = /* @__PURE__ */ ci(s0, [["render", u0]]), d0 = {
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
    }
  },
  data: () => ({})
};
function f0(e, t, n, i, o, r) {
  const s = c0;
  return _e(), ke(s, {
    book_url: n.book_url,
    display_url: n.display_url,
    debug: n.debug,
    themes_css: n.themes_css
  }, null, 8, ["book_url", "display_url", "debug", "themes_css"]);
}
const m0 = /* @__PURE__ */ ci(d0, [["render", f0]]);
class v0 {
  constructor(t, n) {
    var i = "https://api.talebook.org";
    const o = Gg(m0, n);
    ry(o, {
      server: n.server || i
    }), o.mount(t);
  }
}
export {
  v0 as Reader
};
