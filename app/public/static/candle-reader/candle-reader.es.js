var dc = {};
/**
* @vue/shared v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Cn(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const Me = dc.NODE_ENV !== "production" ? Object.freeze({}) : {}, Pi = dc.NODE_ENV !== "production" ? Object.freeze([]) : [], rt = () => {
}, $m = () => !1, So = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), ir = (e) => e.startsWith("onUpdate:"), Ue = Object.assign, la = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, Mm = Object.prototype.hasOwnProperty, Ie = (e, t) => Mm.call(e, t), ue = Array.isArray, ci = (e) => ko(e) === "[object Map]", Ir = (e) => ko(e) === "[object Set]", hl = (e) => ko(e) === "[object Date]", pe = (e) => typeof e == "function", je = (e) => typeof e == "string", Yt = (e) => typeof e == "symbol", Pe = (e) => e !== null && typeof e == "object", ua = (e) => (Pe(e) || pe(e)) && pe(e.then) && pe(e.catch), fc = Object.prototype.toString, ko = (e) => fc.call(e), ca = (e) => ko(e).slice(8, -1), mc = (e) => ko(e) === "[object Object]", da = (e) => je(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, to = /* @__PURE__ */ Cn(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), Lm = /* @__PURE__ */ Cn(
  "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
), Pr = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, Fm = /-(\w)/g, dt = Pr(
  (e) => e.replace(Fm, (t, n) => n ? n.toUpperCase() : "")
), Bm = /\B([A-Z])/g, jn = Pr(
  (e) => e.replace(Bm, "-$1").toLowerCase()
), zt = Pr((e) => e.charAt(0).toUpperCase() + e.slice(1)), ri = Pr(
  (e) => e ? `on${zt(e)}` : ""
), Fn = (e, t) => !Object.is(e, t), Oi = (e, ...t) => {
  for (let n = 0; n < e.length; n++)
    e[n](...t);
}, or = (e, t, n, i = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: i,
    value: n
  });
}, rr = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
}, Rm = (e) => {
  const t = je(e) ? Number(e) : NaN;
  return isNaN(t) ? e : t;
};
let vl;
const Co = () => vl || (vl = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Rt(e) {
  if (ue(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const i = e[n], o = je(i) ? Um(i) : Rt(i);
      if (o)
        for (const r in o)
          t[r] = o[r];
    }
    return t;
  } else if (je(e) || Pe(e))
    return e;
}
const Hm = /;(?![^(]*\))/g, jm = /:([^]+)/, zm = /\/\*[^]*?\*\//g;
function Um(e) {
  const t = {};
  return e.replace(zm, "").split(Hm).forEach((n) => {
    if (n) {
      const i = n.split(jm);
      i.length > 1 && (t[i[0].trim()] = i[1].trim());
    }
  }), t;
}
function Vt(e) {
  let t = "";
  if (je(e))
    t = e;
  else if (ue(e))
    for (let n = 0; n < e.length; n++) {
      const i = Vt(e[n]);
      i && (t += i + " ");
    }
  else if (Pe(e))
    for (const n in e)
      e[n] && (t += n + " ");
  return t.trim();
}
const Wm = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot", qm = "svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,text,textPath,title,tspan,unknown,use,view", Km = "annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics", Gm = /* @__PURE__ */ Cn(Wm), Ym = /* @__PURE__ */ Cn(qm), Xm = /* @__PURE__ */ Cn(Km), Jm = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Zm = /* @__PURE__ */ Cn(Jm);
function hc(e) {
  return !!e || e === "";
}
function Qm(e, t) {
  if (e.length !== t.length) return !1;
  let n = !0;
  for (let i = 0; n && i < e.length; i++)
    n = $r(e[i], t[i]);
  return n;
}
function $r(e, t) {
  if (e === t) return !0;
  let n = hl(e), i = hl(t);
  if (n || i)
    return n && i ? e.getTime() === t.getTime() : !1;
  if (n = Yt(e), i = Yt(t), n || i)
    return e === t;
  if (n = ue(e), i = ue(t), n || i)
    return n && i ? Qm(e, t) : !1;
  if (n = Pe(e), i = Pe(t), n || i) {
    if (!n || !i)
      return !1;
    const o = Object.keys(e).length, r = Object.keys(t).length;
    if (o !== r)
      return !1;
    for (const s in e) {
      const a = e.hasOwnProperty(s), l = t.hasOwnProperty(s);
      if (a && !l || !a && l || !$r(e[s], t[s]))
        return !1;
    }
  }
  return String(e) === String(t);
}
function eh(e, t) {
  return e.findIndex((n) => $r(n, t));
}
const vc = (e) => !!(e && e.__v_isRef === !0), _e = (e) => je(e) ? e : e == null ? "" : ue(e) || Pe(e) && (e.toString === fc || !pe(e.toString)) ? vc(e) ? _e(e.value) : JSON.stringify(e, gc, 2) : String(e), gc = (e, t) => vc(t) ? gc(e, t.value) : ci(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (n, [i, o], r) => (n[os(i, r) + " =>"] = o, n),
    {}
  )
} : Ir(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((n) => os(n))
} : Yt(t) ? os(t) : Pe(t) && !ue(t) && !mc(t) ? String(t) : t, os = (e, t = "") => {
  var n;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    Yt(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e
  );
};
var Le = {};
function Ut(e, ...t) {
  console.warn(`[Vue warn] ${e}`, ...t);
}
let bt;
class pc {
  constructor(t = !1) {
    this.detached = t, this._active = !0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.parent = bt, !t && bt && (this.index = (bt.scopes || (bt.scopes = [])).push(
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
      const n = bt;
      try {
        return bt = this, t();
      } finally {
        bt = n;
      }
    } else Le.NODE_ENV !== "production" && Ut("cannot run an inactive effect scope.");
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    bt = this;
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    bt = this.parent;
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
function fa(e) {
  return new pc(e);
}
function th() {
  return bt;
}
function It(e, t = !1) {
  bt ? bt.cleanups.push(e) : Le.NODE_ENV !== "production" && !t && Ut(
    "onScopeDispose() is called when there is no active effect scope to be associated with."
  );
}
let $e;
const rs = /* @__PURE__ */ new WeakSet();
class yc {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, bt && bt.active && bt.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, rs.has(this) && (rs.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || bc(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, gl(this), wc(this);
    const t = $e, n = Gt;
    $e = this, Gt = !0;
    try {
      return this.fn();
    } finally {
      Le.NODE_ENV !== "production" && $e !== this && Ut(
        "Active effect was not restored correctly - this is likely a Vue internal bug."
      ), Sc(this), $e = t, Gt = n, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep)
        va(t);
      this.deps = this.depsTail = void 0, gl(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? rs.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    Ts(this) && this.run();
  }
  get dirty() {
    return Ts(this);
  }
}
let _c = 0, no, io;
function bc(e, t = !1) {
  if (e.flags |= 8, t) {
    e.next = io, io = e;
    return;
  }
  e.next = no, no = e;
}
function ma() {
  _c++;
}
function ha() {
  if (--_c > 0)
    return;
  if (io) {
    let t = io;
    for (io = void 0; t; ) {
      const n = t.next;
      t.next = void 0, t.flags &= -9, t = n;
    }
  }
  let e;
  for (; no; ) {
    let t = no;
    for (no = void 0; t; ) {
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
function wc(e) {
  for (let t = e.deps; t; t = t.nextDep)
    t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function Sc(e) {
  let t, n = e.depsTail, i = n;
  for (; i; ) {
    const o = i.prevDep;
    i.version === -1 ? (i === n && (n = o), va(i), nh(i)) : t = i, i.dep.activeLink = i.prevActiveLink, i.prevActiveLink = void 0, i = o;
  }
  e.deps = t, e.depsTail = n;
}
function Ts(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (t.dep.version !== t.version || t.dep.computed && (kc(t.dep.computed) || t.dep.version !== t.version))
      return !0;
  return !!e._dirty;
}
function kc(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === ao))
    return;
  e.globalVersion = ao;
  const t = e.dep;
  if (e.flags |= 2, t.version > 0 && !e.isSSR && e.deps && !Ts(e)) {
    e.flags &= -3;
    return;
  }
  const n = $e, i = Gt;
  $e = e, Gt = !0;
  try {
    wc(e);
    const o = e.fn(e._value);
    (t.version === 0 || Fn(o, e._value)) && (e._value = o, t.version++);
  } catch (o) {
    throw t.version++, o;
  } finally {
    $e = n, Gt = i, Sc(e), e.flags &= -3;
  }
}
function va(e, t = !1) {
  const { dep: n, prevSub: i, nextSub: o } = e;
  if (i && (i.nextSub = o, e.prevSub = void 0), o && (o.prevSub = i, e.nextSub = void 0), Le.NODE_ENV !== "production" && n.subsHead === e && (n.subsHead = o), n.subs === e && (n.subs = i, !i && n.computed)) {
    n.computed.flags &= -5;
    for (let r = n.computed.deps; r; r = r.nextDep)
      va(r, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function nh(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let Gt = !0;
const Cc = [];
function En() {
  Cc.push(Gt), Gt = !1;
}
function xn() {
  const e = Cc.pop();
  Gt = e === void 0 ? !0 : e;
}
function gl(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const n = $e;
    $e = void 0;
    try {
      t();
    } finally {
      $e = n;
    }
  }
}
let ao = 0;
class ih {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class ga {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, Le.NODE_ENV !== "production" && (this.subsHead = void 0);
  }
  track(t) {
    if (!$e || !Gt || $e === this.computed)
      return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== $e)
      n = this.activeLink = new ih($e, this), $e.deps ? (n.prevDep = $e.depsTail, $e.depsTail.nextDep = n, $e.depsTail = n) : $e.deps = $e.depsTail = n, Ec(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const i = n.nextDep;
      i.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = i), n.prevDep = $e.depsTail, n.nextDep = void 0, $e.depsTail.nextDep = n, $e.depsTail = n, $e.deps === n && ($e.deps = i);
    }
    return Le.NODE_ENV !== "production" && $e.onTrack && $e.onTrack(
      Ue(
        {
          effect: $e
        },
        t
      )
    ), n;
  }
  trigger(t) {
    this.version++, ao++, this.notify(t);
  }
  notify(t) {
    ma();
    try {
      if (Le.NODE_ENV !== "production")
        for (let n = this.subsHead; n; n = n.nextSub)
          n.sub.onTrigger && !(n.sub.flags & 8) && n.sub.onTrigger(
            Ue(
              {
                effect: n.sub
              },
              t
            )
          );
      for (let n = this.subs; n; n = n.prevSub)
        n.sub.notify() && n.sub.dep.notify();
    } finally {
      ha();
    }
  }
}
function Ec(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let i = t.deps; i; i = i.nextDep)
        Ec(i);
    }
    const n = e.dep.subs;
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), Le.NODE_ENV !== "production" && e.dep.subsHead === void 0 && (e.dep.subsHead = e), e.dep.subs = e;
  }
}
const sr = /* @__PURE__ */ new WeakMap(), di = Symbol(
  Le.NODE_ENV !== "production" ? "Object iterate" : ""
), As = Symbol(
  Le.NODE_ENV !== "production" ? "Map keys iterate" : ""
), lo = Symbol(
  Le.NODE_ENV !== "production" ? "Array iterate" : ""
);
function ot(e, t, n) {
  if (Gt && $e) {
    let i = sr.get(e);
    i || sr.set(e, i = /* @__PURE__ */ new Map());
    let o = i.get(n);
    o || (i.set(n, o = new ga()), o.map = i, o.key = n), Le.NODE_ENV !== "production" ? o.track({
      target: e,
      type: t,
      key: n
    }) : o.track();
  }
}
function tn(e, t, n, i, o, r) {
  const s = sr.get(e);
  if (!s) {
    ao++;
    return;
  }
  const a = (l) => {
    l && (Le.NODE_ENV !== "production" ? l.trigger({
      target: e,
      type: t,
      key: n,
      newValue: i,
      oldValue: o,
      oldTarget: r
    }) : l.trigger());
  };
  if (ma(), t === "clear")
    s.forEach(a);
  else {
    const l = ue(e), c = l && da(n);
    if (l && n === "length") {
      const d = Number(i);
      s.forEach((u, m) => {
        (m === "length" || m === lo || !Yt(m) && m >= d) && a(u);
      });
    } else
      switch ((n !== void 0 || s.has(void 0)) && a(s.get(n)), c && a(s.get(lo)), t) {
        case "add":
          l ? c && a(s.get("length")) : (a(s.get(di)), ci(e) && a(s.get(As)));
          break;
        case "delete":
          l || (a(s.get(di)), ci(e) && a(s.get(As)));
          break;
        case "set":
          ci(e) && a(s.get(di));
          break;
      }
  }
  ha();
}
function oh(e, t) {
  const n = sr.get(e);
  return n && n.get(t);
}
function xi(e) {
  const t = ae(e);
  return t === e ? t : (ot(t, "iterate", lo), kt(e) ? t : t.map(ht));
}
function Mr(e) {
  return ot(e = ae(e), "iterate", lo), e;
}
const rh = {
  __proto__: null,
  [Symbol.iterator]() {
    return ss(this, Symbol.iterator, ht);
  },
  concat(...e) {
    return xi(this).concat(
      ...e.map((t) => ue(t) ? xi(t) : t)
    );
  },
  entries() {
    return ss(this, "entries", (e) => (e[1] = ht(e[1]), e));
  },
  every(e, t) {
    return vn(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return vn(this, "filter", e, t, (n) => n.map(ht), arguments);
  },
  find(e, t) {
    return vn(this, "find", e, t, ht, arguments);
  },
  findIndex(e, t) {
    return vn(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return vn(this, "findLast", e, t, ht, arguments);
  },
  findLastIndex(e, t) {
    return vn(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return vn(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return as(this, "includes", e);
  },
  indexOf(...e) {
    return as(this, "indexOf", e);
  },
  join(e) {
    return xi(this).join(e);
  },
  // keys() iterator only reads `length`, no optimisation required
  lastIndexOf(...e) {
    return as(this, "lastIndexOf", e);
  },
  map(e, t) {
    return vn(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return qi(this, "pop");
  },
  push(...e) {
    return qi(this, "push", e);
  },
  reduce(e, ...t) {
    return pl(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return pl(this, "reduceRight", e, t);
  },
  shift() {
    return qi(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return vn(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return qi(this, "splice", e);
  },
  toReversed() {
    return xi(this).toReversed();
  },
  toSorted(e) {
    return xi(this).toSorted(e);
  },
  toSpliced(...e) {
    return xi(this).toSpliced(...e);
  },
  unshift(...e) {
    return qi(this, "unshift", e);
  },
  values() {
    return ss(this, "values", ht);
  }
};
function ss(e, t, n) {
  const i = Mr(e), o = i[t]();
  return i !== e && !kt(e) && (o._next = o.next, o.next = () => {
    const r = o._next();
    return r.value && (r.value = n(r.value)), r;
  }), o;
}
const sh = Array.prototype;
function vn(e, t, n, i, o, r) {
  const s = Mr(e), a = s !== e && !kt(e), l = s[t];
  if (l !== sh[t]) {
    const u = l.apply(e, r);
    return a ? ht(u) : u;
  }
  let c = n;
  s !== e && (a ? c = function(u, m) {
    return n.call(this, ht(u), m, e);
  } : n.length > 2 && (c = function(u, m) {
    return n.call(this, u, m, e);
  }));
  const d = l.call(s, c, i);
  return a && o ? o(d) : d;
}
function pl(e, t, n, i) {
  const o = Mr(e);
  let r = n;
  return o !== e && (kt(e) ? n.length > 3 && (r = function(s, a, l) {
    return n.call(this, s, a, l, e);
  }) : r = function(s, a, l) {
    return n.call(this, s, ht(a), l, e);
  }), o[t](r, ...i);
}
function as(e, t, n) {
  const i = ae(e);
  ot(i, "iterate", lo);
  const o = i[t](...n);
  return (o === -1 || o === !1) && uo(n[0]) ? (n[0] = ae(n[0]), i[t](...n)) : o;
}
function qi(e, t, n = []) {
  En(), ma();
  const i = ae(e)[t].apply(e, n);
  return ha(), xn(), i;
}
const ah = /* @__PURE__ */ Cn("__proto__,__v_isRef,__isVue"), xc = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(Yt)
);
function lh(e) {
  Yt(e) || (e = String(e));
  const t = ae(this);
  return ot(t, "has", e), t.hasOwnProperty(e);
}
class Nc {
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
      return i === (o ? r ? Ic : Dc : r ? Ac : Tc).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(i) ? t : void 0;
    const s = ue(t);
    if (!o) {
      let l;
      if (s && (l = rh[n]))
        return l;
      if (n === "hasOwnProperty")
        return lh;
    }
    const a = Reflect.get(
      t,
      n,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      Be(t) ? t : i
    );
    return (Yt(n) ? xc.has(n) : ah(n)) || (o || ot(t, "get", n), r) ? a : Be(a) ? s && da(n) ? a : a.value : Pe(a) ? o ? Eo(a) : ct(a) : a;
  }
}
class Vc extends Nc {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, i, o) {
    let r = t[n];
    if (!this._isShallow) {
      const l = Sn(r);
      if (!kt(i) && !Sn(i) && (r = ae(r), i = ae(i)), !ue(t) && Be(r) && !Be(i))
        return l ? !1 : (r.value = i, !0);
    }
    const s = ue(t) && da(n) ? Number(n) < t.length : Ie(t, n), a = Reflect.set(
      t,
      n,
      i,
      Be(t) ? t : o
    );
    return t === ae(o) && (s ? Fn(i, r) && tn(t, "set", n, i, r) : tn(t, "add", n, i)), a;
  }
  deleteProperty(t, n) {
    const i = Ie(t, n), o = t[n], r = Reflect.deleteProperty(t, n);
    return r && i && tn(t, "delete", n, void 0, o), r;
  }
  has(t, n) {
    const i = Reflect.has(t, n);
    return (!Yt(n) || !xc.has(n)) && ot(t, "has", n), i;
  }
  ownKeys(t) {
    return ot(
      t,
      "iterate",
      ue(t) ? "length" : di
    ), Reflect.ownKeys(t);
  }
}
class Oc extends Nc {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return Le.NODE_ENV !== "production" && Ut(
      `Set operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
  deleteProperty(t, n) {
    return Le.NODE_ENV !== "production" && Ut(
      `Delete operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
}
const uh = /* @__PURE__ */ new Vc(), ch = /* @__PURE__ */ new Oc(), dh = /* @__PURE__ */ new Vc(!0), fh = /* @__PURE__ */ new Oc(!0), Ds = (e) => e, $o = (e) => Reflect.getPrototypeOf(e);
function mh(e, t, n) {
  return function(...i) {
    const o = this.__v_raw, r = ae(o), s = ci(r), a = e === "entries" || e === Symbol.iterator && s, l = e === "keys" && s, c = o[e](...i), d = n ? Ds : t ? Is : ht;
    return !t && ot(
      r,
      "iterate",
      l ? As : di
    ), {
      // iterator protocol
      next() {
        const { value: u, done: m } = c.next();
        return m ? { value: u, done: m } : {
          value: a ? [d(u[0]), d(u[1])] : d(u),
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
function Mo(e) {
  return function(...t) {
    if (Le.NODE_ENV !== "production") {
      const n = t[0] ? `on key "${t[0]}" ` : "";
      Ut(
        `${zt(e)} operation ${n}failed: target is readonly.`,
        ae(this)
      );
    }
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function hh(e, t) {
  const n = {
    get(o) {
      const r = this.__v_raw, s = ae(r), a = ae(o);
      e || (Fn(o, a) && ot(s, "get", o), ot(s, "get", a));
      const { has: l } = $o(s), c = t ? Ds : e ? Is : ht;
      if (l.call(s, o))
        return c(r.get(o));
      if (l.call(s, a))
        return c(r.get(a));
      r !== s && r.get(o);
    },
    get size() {
      const o = this.__v_raw;
      return !e && ot(ae(o), "iterate", di), Reflect.get(o, "size", o);
    },
    has(o) {
      const r = this.__v_raw, s = ae(r), a = ae(o);
      return e || (Fn(o, a) && ot(s, "has", o), ot(s, "has", a)), o === a ? r.has(o) : r.has(o) || r.has(a);
    },
    forEach(o, r) {
      const s = this, a = s.__v_raw, l = ae(a), c = t ? Ds : e ? Is : ht;
      return !e && ot(l, "iterate", di), a.forEach((d, u) => o.call(r, c(d), c(u), s));
    }
  };
  return Ue(
    n,
    e ? {
      add: Mo("add"),
      set: Mo("set"),
      delete: Mo("delete"),
      clear: Mo("clear")
    } : {
      add(o) {
        !t && !kt(o) && !Sn(o) && (o = ae(o));
        const r = ae(this);
        return $o(r).has.call(r, o) || (r.add(o), tn(r, "add", o, o)), this;
      },
      set(o, r) {
        !t && !kt(r) && !Sn(r) && (r = ae(r));
        const s = ae(this), { has: a, get: l } = $o(s);
        let c = a.call(s, o);
        c ? Le.NODE_ENV !== "production" && yl(s, a, o) : (o = ae(o), c = a.call(s, o));
        const d = l.call(s, o);
        return s.set(o, r), c ? Fn(r, d) && tn(s, "set", o, r, d) : tn(s, "add", o, r), this;
      },
      delete(o) {
        const r = ae(this), { has: s, get: a } = $o(r);
        let l = s.call(r, o);
        l ? Le.NODE_ENV !== "production" && yl(r, s, o) : (o = ae(o), l = s.call(r, o));
        const c = a ? a.call(r, o) : void 0, d = r.delete(o);
        return l && tn(r, "delete", o, void 0, c), d;
      },
      clear() {
        const o = ae(this), r = o.size !== 0, s = Le.NODE_ENV !== "production" ? ci(o) ? new Map(o) : new Set(o) : void 0, a = o.clear();
        return r && tn(
          o,
          "clear",
          void 0,
          void 0,
          s
        ), a;
      }
    }
  ), [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ].forEach((o) => {
    n[o] = mh(o, e, t);
  }), n;
}
function Lr(e, t) {
  const n = hh(e, t);
  return (i, o, r) => o === "__v_isReactive" ? !e : o === "__v_isReadonly" ? e : o === "__v_raw" ? i : Reflect.get(
    Ie(n, o) && o in i ? n : i,
    o,
    r
  );
}
const vh = {
  get: /* @__PURE__ */ Lr(!1, !1)
}, gh = {
  get: /* @__PURE__ */ Lr(!1, !0)
}, ph = {
  get: /* @__PURE__ */ Lr(!0, !1)
}, yh = {
  get: /* @__PURE__ */ Lr(!0, !0)
};
function yl(e, t, n) {
  const i = ae(n);
  if (i !== n && t.call(e, i)) {
    const o = ca(e);
    Ut(
      `Reactive ${o} contains both the raw and reactive versions of the same object${o === "Map" ? " as keys" : ""}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`
    );
  }
}
const Tc = /* @__PURE__ */ new WeakMap(), Ac = /* @__PURE__ */ new WeakMap(), Dc = /* @__PURE__ */ new WeakMap(), Ic = /* @__PURE__ */ new WeakMap();
function _h(e) {
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
function bh(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : _h(ca(e));
}
function ct(e) {
  return Sn(e) ? e : Fr(
    e,
    !1,
    uh,
    vh,
    Tc
  );
}
function wh(e) {
  return Fr(
    e,
    !1,
    dh,
    gh,
    Ac
  );
}
function Eo(e) {
  return Fr(
    e,
    !0,
    ch,
    ph,
    Dc
  );
}
function on(e) {
  return Fr(
    e,
    !0,
    fh,
    yh,
    Ic
  );
}
function Fr(e, t, n, i, o) {
  if (!Pe(e))
    return Le.NODE_ENV !== "production" && Ut(
      `value cannot be made ${t ? "readonly" : "reactive"}: ${String(
        e
      )}`
    ), e;
  if (e.__v_raw && !(t && e.__v_isReactive))
    return e;
  const r = o.get(e);
  if (r)
    return r;
  const s = bh(e);
  if (s === 0)
    return e;
  const a = new Proxy(
    e,
    s === 2 ? i : n
  );
  return o.set(e, a), a;
}
function fi(e) {
  return Sn(e) ? fi(e.__v_raw) : !!(e && e.__v_isReactive);
}
function Sn(e) {
  return !!(e && e.__v_isReadonly);
}
function kt(e) {
  return !!(e && e.__v_isShallow);
}
function uo(e) {
  return e ? !!e.__v_raw : !1;
}
function ae(e) {
  const t = e && e.__v_raw;
  return t ? ae(t) : e;
}
function Pc(e) {
  return !Ie(e, "__v_skip") && Object.isExtensible(e) && or(e, "__v_skip", !0), e;
}
const ht = (e) => Pe(e) ? ct(e) : e, Is = (e) => Pe(e) ? Eo(e) : e;
function Be(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function se(e) {
  return $c(e, !1);
}
function ke(e) {
  return $c(e, !0);
}
function $c(e, t) {
  return Be(e) ? e : new Sh(e, t);
}
class Sh {
  constructor(t, n) {
    this.dep = new ga(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : ae(t), this._value = n ? t : ht(t), this.__v_isShallow = n;
  }
  get value() {
    return Le.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, i = this.__v_isShallow || kt(t) || Sn(t);
    t = i ? t : ae(t), Fn(t, n) && (this._rawValue = t, this._value = i ? t : ht(t), Le.NODE_ENV !== "production" ? this.dep.trigger({
      target: this,
      type: "set",
      key: "value",
      newValue: t,
      oldValue: n
    }) : this.dep.trigger());
  }
}
function rn(e) {
  return Be(e) ? e.value : e;
}
const kh = {
  get: (e, t, n) => t === "__v_raw" ? e : rn(Reflect.get(e, t, n)),
  set: (e, t, n, i) => {
    const o = e[t];
    return Be(o) && !Be(n) ? (o.value = n, !0) : Reflect.set(e, t, n, i);
  }
};
function Mc(e) {
  return fi(e) ? e : new Proxy(e, kh);
}
function pa(e) {
  Le.NODE_ENV !== "production" && !uo(e) && Ut("toRefs() expects a reactive object but received a plain one.");
  const t = ue(e) ? new Array(e.length) : {};
  for (const n in e)
    t[n] = Lc(e, n);
  return t;
}
class Ch {
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
    return oh(ae(this._object), this._key);
  }
}
class Eh {
  constructor(t) {
    this._getter = t, this.__v_isRef = !0, this.__v_isReadonly = !0, this._value = void 0;
  }
  get value() {
    return this._value = this._getter();
  }
}
function le(e, t, n) {
  return Be(e) ? e : pe(e) ? new Eh(e) : Pe(e) && arguments.length > 1 ? Lc(e, t, n) : se(e);
}
function Lc(e, t, n) {
  const i = e[t];
  return Be(i) ? i : new Ch(e, t, n);
}
class xh {
  constructor(t, n, i) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new ga(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = ao - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = i;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    $e !== this)
      return bc(this, !0), !0;
  }
  get value() {
    const t = Le.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track();
    return kc(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter ? this.setter(t) : Le.NODE_ENV !== "production" && Ut("Write operation failed: computed value is readonly");
  }
}
function Nh(e, t, n = !1) {
  let i, o;
  pe(e) ? i = e : (i = e.get, o = e.set);
  const r = new xh(i, o, n);
  return Le.NODE_ENV !== "production" && t && !n && (r.onTrack = t.onTrack, r.onTrigger = t.onTrigger), r;
}
const Lo = {}, ar = /* @__PURE__ */ new WeakMap();
let si;
function Vh(e, t = !1, n = si) {
  if (n) {
    let i = ar.get(n);
    i || ar.set(n, i = []), i.push(e);
  } else Le.NODE_ENV !== "production" && !t && Ut(
    "onWatcherCleanup() was called when there was no active watcher to associate with."
  );
}
function Oh(e, t, n = Me) {
  const { immediate: i, deep: o, once: r, scheduler: s, augmentJob: a, call: l } = n, c = (C) => {
    (n.onWarn || Ut)(
      "Invalid watch source: ",
      C,
      "A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types."
    );
  }, d = (C) => o ? C : kt(C) || o === !1 || o === 0 ? wn(C, 1) : wn(C);
  let u, m, g, h, v = !1, _ = !1;
  if (Be(e) ? (m = () => e.value, v = kt(e)) : fi(e) ? (m = () => d(e), v = !0) : ue(e) ? (_ = !0, v = e.some((C) => fi(C) || kt(C)), m = () => e.map((C) => {
    if (Be(C))
      return C.value;
    if (fi(C))
      return d(C);
    if (pe(C))
      return l ? l(C, 2) : C();
    Le.NODE_ENV !== "production" && c(C);
  })) : pe(e) ? t ? m = l ? () => l(e, 2) : e : m = () => {
    if (g) {
      En();
      try {
        g();
      } finally {
        xn();
      }
    }
    const C = si;
    si = u;
    try {
      return l ? l(e, 3, [h]) : e(h);
    } finally {
      si = C;
    }
  } : (m = rt, Le.NODE_ENV !== "production" && c(e)), t && o) {
    const C = m, V = o === !0 ? 1 / 0 : o;
    m = () => wn(C(), V);
  }
  const k = th(), O = () => {
    u.stop(), k && la(k.effects, u);
  };
  if (r && t) {
    const C = t;
    t = (...V) => {
      C(...V), O();
    };
  }
  let P = _ ? new Array(e.length).fill(Lo) : Lo;
  const B = (C) => {
    if (!(!(u.flags & 1) || !u.dirty && !C))
      if (t) {
        const V = u.run();
        if (o || v || (_ ? V.some((F, x) => Fn(F, P[x])) : Fn(V, P))) {
          g && g();
          const F = si;
          si = u;
          try {
            const x = [
              V,
              // pass undefined as the old value when it's changed for the first time
              P === Lo ? void 0 : _ && P[0] === Lo ? [] : P,
              h
            ];
            l ? l(t, 3, x) : (
              // @ts-expect-error
              t(...x)
            ), P = V;
          } finally {
            si = F;
          }
        }
      } else
        u.run();
  };
  return a && a(B), u = new yc(m), u.scheduler = s ? () => s(B, !1) : B, h = (C) => Vh(C, !1, u), g = u.onStop = () => {
    const C = ar.get(u);
    if (C) {
      if (l)
        l(C, 4);
      else
        for (const V of C) V();
      ar.delete(u);
    }
  }, Le.NODE_ENV !== "production" && (u.onTrack = n.onTrack, u.onTrigger = n.onTrigger), t ? i ? B(!0) : P = u.run() : s ? s(B.bind(null, !0), !0) : u.run(), O.pause = u.pause.bind(u), O.resume = u.resume.bind(u), O.stop = O, O;
}
function wn(e, t = 1 / 0, n) {
  if (t <= 0 || !Pe(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e)))
    return e;
  if (n.add(e), t--, Be(e))
    wn(e.value, t, n);
  else if (ue(e))
    for (let i = 0; i < e.length; i++)
      wn(e[i], t, n);
  else if (Ir(e) || ci(e))
    e.forEach((i) => {
      wn(i, t, n);
    });
  else if (mc(e)) {
    for (const i in e)
      wn(e[i], t, n);
    for (const i of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, i) && wn(e[i], t, n);
  }
  return e;
}
var S = {};
const mi = [];
function qo(e) {
  mi.push(e);
}
function Ko() {
  mi.pop();
}
let ls = !1;
function W(e, ...t) {
  if (ls) return;
  ls = !0, En();
  const n = mi.length ? mi[mi.length - 1].component : null, i = n && n.appContext.config.warnHandler, o = Th();
  if (i)
    zi(
      i,
      n,
      11,
      [
        // eslint-disable-next-line no-restricted-syntax
        e + t.map((r) => {
          var s, a;
          return (a = (s = r.toString) == null ? void 0 : s.call(r)) != null ? a : JSON.stringify(r);
        }).join(""),
        n && n.proxy,
        o.map(
          ({ vnode: r }) => `at <${Ur(n, r.type)}>`
        ).join(`
`),
        o
      ]
    );
  else {
    const r = [`[Vue warn]: ${e}`, ...t];
    o.length && r.push(`
`, ...Ah(o)), console.warn(...r);
  }
  xn(), ls = !1;
}
function Th() {
  let e = mi[mi.length - 1];
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
function Ah(e) {
  const t = [];
  return e.forEach((n, i) => {
    t.push(...i === 0 ? [] : [`
`], ...Dh(n));
  }), t;
}
function Dh({ vnode: e, recurseCount: t }) {
  const n = t > 0 ? `... (${t} recursive calls)` : "", i = e.component ? e.component.parent == null : !1, o = ` at <${Ur(
    e.component,
    e.type,
    i
  )}`, r = ">" + n;
  return e.props ? [o, ...Ih(e.props), r] : [o + r];
}
function Ih(e) {
  const t = [], n = Object.keys(e);
  return n.slice(0, 3).forEach((i) => {
    t.push(...Fc(i, e[i]));
  }), n.length > 3 && t.push(" ..."), t;
}
function Fc(e, t, n) {
  return je(t) ? (t = JSON.stringify(t), n ? t : [`${e}=${t}`]) : typeof t == "number" || typeof t == "boolean" || t == null ? n ? t : [`${e}=${t}`] : Be(t) ? (t = Fc(e, ae(t.value), !0), n ? t : [`${e}=Ref<`, t, ">"]) : pe(t) ? [`${e}=fn${t.name ? `<${t.name}>` : ""}`] : (t = ae(t), n ? t : [`${e}=`, t]);
}
function Ph(e, t) {
  S.NODE_ENV !== "production" && e !== void 0 && (typeof e != "number" ? W(`${t} is not a valid number - got ${JSON.stringify(e)}.`) : isNaN(e) && W(`${t} is NaN - the duration expression might be incorrect.`));
}
const ya = {
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
function zi(e, t, n, i) {
  try {
    return i ? e(...i) : e();
  } catch (o) {
    xo(o, t, n);
  }
}
function Xt(e, t, n, i) {
  if (pe(e)) {
    const o = zi(e, t, n, i);
    return o && ua(o) && o.catch((r) => {
      xo(r, t, n);
    }), o;
  }
  if (ue(e)) {
    const o = [];
    for (let r = 0; r < e.length; r++)
      o.push(Xt(e[r], t, n, i));
    return o;
  } else S.NODE_ENV !== "production" && W(
    `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof e}`
  );
}
function xo(e, t, n, i = !0) {
  const o = t ? t.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: s } = t && t.appContext.config || Me;
  if (t) {
    let a = t.parent;
    const l = t.proxy, c = S.NODE_ENV !== "production" ? ya[n] : `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; a; ) {
      const d = a.ec;
      if (d) {
        for (let u = 0; u < d.length; u++)
          if (d[u](e, l, c) === !1)
            return;
      }
      a = a.parent;
    }
    if (r) {
      En(), zi(r, null, 10, [
        e,
        l,
        c
      ]), xn();
      return;
    }
  }
  $h(e, n, o, i, s);
}
function $h(e, t, n, i = !0, o = !1) {
  if (S.NODE_ENV !== "production") {
    const r = ya[t];
    if (n && qo(n), W(`Unhandled error${r ? ` during execution of ${r}` : ""}`), n && Ko(), i)
      throw e;
    console.error(e);
  } else {
    if (o)
      throw e;
    console.error(e);
  }
}
const St = [];
let en = -1;
const $i = [];
let In = null, Ti = 0;
const Bc = /* @__PURE__ */ Promise.resolve();
let lr = null;
const Mh = 100;
function ft(e) {
  const t = lr || Bc;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function Lh(e) {
  let t = en + 1, n = St.length;
  for (; t < n; ) {
    const i = t + n >>> 1, o = St[i], r = co(o);
    r < e || r === e && o.flags & 2 ? t = i + 1 : n = i;
  }
  return t;
}
function Br(e) {
  if (!(e.flags & 1)) {
    const t = co(e), n = St[St.length - 1];
    !n || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= co(n) ? St.push(e) : St.splice(Lh(t), 0, e), e.flags |= 1, Rc();
  }
}
function Rc() {
  lr || (lr = Bc.then(zc));
}
function Hc(e) {
  ue(e) ? $i.push(...e) : In && e.id === -1 ? In.splice(Ti + 1, 0, e) : e.flags & 1 || ($i.push(e), e.flags |= 1), Rc();
}
function _l(e, t, n = en + 1) {
  for (S.NODE_ENV !== "production" && (t = t || /* @__PURE__ */ new Map()); n < St.length; n++) {
    const i = St[n];
    if (i && i.flags & 2) {
      if (e && i.id !== e.uid || S.NODE_ENV !== "production" && _a(t, i))
        continue;
      St.splice(n, 1), n--, i.flags & 4 && (i.flags &= -2), i(), i.flags & 4 || (i.flags &= -2);
    }
  }
}
function jc(e) {
  if ($i.length) {
    const t = [...new Set($i)].sort(
      (n, i) => co(n) - co(i)
    );
    if ($i.length = 0, In) {
      In.push(...t);
      return;
    }
    for (In = t, S.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map()), Ti = 0; Ti < In.length; Ti++) {
      const n = In[Ti];
      S.NODE_ENV !== "production" && _a(e, n) || (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2);
    }
    In = null, Ti = 0;
  }
}
const co = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function zc(e) {
  S.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map());
  const t = S.NODE_ENV !== "production" ? (n) => _a(e, n) : rt;
  try {
    for (en = 0; en < St.length; en++) {
      const n = St[en];
      if (n && !(n.flags & 8)) {
        if (S.NODE_ENV !== "production" && t(n))
          continue;
        n.flags & 4 && (n.flags &= -2), zi(
          n,
          n.i,
          n.i ? 15 : 14
        ), n.flags & 4 || (n.flags &= -2);
      }
    }
  } finally {
    for (; en < St.length; en++) {
      const n = St[en];
      n && (n.flags &= -2);
    }
    en = -1, St.length = 0, jc(e), lr = null, (St.length || $i.length) && zc(e);
  }
}
function _a(e, t) {
  const n = e.get(t) || 0;
  if (n > Mh) {
    const i = t.i, o = i && Ta(i.type);
    return xo(
      `Maximum recursive updates exceeded${o ? ` in component <${o}>` : ""}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`,
      null,
      10
    ), !0;
  }
  return e.set(t, n + 1), !1;
}
let Kt = !1;
const Go = /* @__PURE__ */ new Map();
S.NODE_ENV !== "production" && (Co().__VUE_HMR_RUNTIME__ = {
  createRecord: us(Uc),
  rerender: us(Rh),
  reload: us(Hh)
});
const yi = /* @__PURE__ */ new Map();
function Fh(e) {
  const t = e.type.__hmrId;
  let n = yi.get(t);
  n || (Uc(t, e.type), n = yi.get(t)), n.instances.add(e);
}
function Bh(e) {
  yi.get(e.type.__hmrId).instances.delete(e);
}
function Uc(e, t) {
  return yi.has(e) ? !1 : (yi.set(e, {
    initialDef: ur(t),
    instances: /* @__PURE__ */ new Set()
  }), !0);
}
function ur(e) {
  return Pd(e) ? e.__vccOpts : e;
}
function Rh(e, t) {
  const n = yi.get(e);
  n && (n.initialDef.render = t, [...n.instances].forEach((i) => {
    t && (i.render = t, ur(i.type).render = t), i.renderCache = [], Kt = !0, i.update(), Kt = !1;
  }));
}
function Hh(e, t) {
  const n = yi.get(e);
  if (!n) return;
  t = ur(t), bl(n.initialDef, t);
  const i = [...n.instances];
  for (let o = 0; o < i.length; o++) {
    const r = i[o], s = ur(r.type);
    let a = Go.get(s);
    a || (s !== n.initialDef && bl(s, t), Go.set(s, a = /* @__PURE__ */ new Set())), a.add(r), r.appContext.propsCache.delete(r.type), r.appContext.emitsCache.delete(r.type), r.appContext.optionsCache.delete(r.type), r.ceReload ? (a.add(r), r.ceReload(t.styles), a.delete(r)) : r.parent ? Br(() => {
      Kt = !0, r.parent.update(), Kt = !1, a.delete(r);
    }) : r.appContext.reload ? r.appContext.reload() : typeof window < "u" ? window.location.reload() : console.warn(
      "[HMR] Root or manually mounted instance modified. Full reload required."
    ), r.root.ce && r !== r.root && r.root.ce._removeChildStyle(s);
  }
  Hc(() => {
    Go.clear();
  });
}
function bl(e, t) {
  Ue(e, t);
  for (const n in e)
    n !== "__file" && !(n in t) && delete e[n];
}
function us(e) {
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
let nn, Zi = [], Ps = !1;
function No(e, ...t) {
  nn ? nn.emit(e, ...t) : Ps || Zi.push({ event: e, args: t });
}
function Wc(e, t) {
  var n, i;
  nn = e, nn ? (nn.enabled = !0, Zi.forEach(({ event: o, args: r }) => nn.emit(o, ...r)), Zi = []) : /* handle late devtools injection - only do this if we are in an actual */ /* browser environment to avoid the timer handle stalling test runner exit */ /* (#4815) */ typeof window < "u" && // some envs mock window but not fully
  window.HTMLElement && // also exclude jsdom
  // eslint-disable-next-line no-restricted-syntax
  !((i = (n = window.navigator) == null ? void 0 : n.userAgent) != null && i.includes("jsdom")) ? ((t.__VUE_DEVTOOLS_HOOK_REPLAY__ = t.__VUE_DEVTOOLS_HOOK_REPLAY__ || []).push((r) => {
    Wc(r, t);
  }), setTimeout(() => {
    nn || (t.__VUE_DEVTOOLS_HOOK_REPLAY__ = null, Ps = !0, Zi = []);
  }, 3e3)) : (Ps = !0, Zi = []);
}
function jh(e, t) {
  No("app:init", e, t, {
    Fragment: fe,
    Text: ki,
    Comment: Ze,
    Static: Xo
  });
}
function zh(e) {
  No("app:unmount", e);
}
const Uh = /* @__PURE__ */ ba(
  "component:added"
  /* COMPONENT_ADDED */
), qc = /* @__PURE__ */ ba(
  "component:updated"
  /* COMPONENT_UPDATED */
), Wh = /* @__PURE__ */ ba(
  "component:removed"
  /* COMPONENT_REMOVED */
), qh = (e) => {
  nn && typeof nn.cleanupBuffer == "function" && // remove the component if it wasn't buffered
  !nn.cleanupBuffer(e) && Wh(e);
};
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function ba(e) {
  return (t) => {
    No(
      e,
      t.appContext.app,
      t.uid,
      t.parent ? t.parent.uid : void 0,
      t
    );
  };
}
const Kh = /* @__PURE__ */ Kc(
  "perf:start"
  /* PERFORMANCE_START */
), Gh = /* @__PURE__ */ Kc(
  "perf:end"
  /* PERFORMANCE_END */
);
function Kc(e) {
  return (t, n, i) => {
    No(e, t.appContext.app, t.uid, t, n, i);
  };
}
function Yh(e, t, n) {
  No(
    "component:emit",
    e.appContext.app,
    e,
    t,
    n
  );
}
let tt = null, Gc = null;
function cr(e) {
  const t = tt;
  return tt = e, Gc = e && e.type.__scopeId || null, t;
}
function T(e, t = tt, n) {
  if (!t || e._n)
    return e;
  const i = (...o) => {
    i._d && $l(-1);
    const r = cr(t);
    let s;
    try {
      s = e(...o);
    } finally {
      cr(r), i._d && $l(1);
    }
    return S.NODE_ENV !== "production" && qc(t), s;
  };
  return i._n = !0, i._c = !0, i._d = !0, i;
}
function Yc(e) {
  Lm(e) && W("Do not use built-in directive ids as custom directive id: " + e);
}
function vt(e, t) {
  if (tt === null)
    return S.NODE_ENV !== "production" && W("withDirectives can only be used inside render functions."), e;
  const n = zr(tt), i = e.dirs || (e.dirs = []);
  for (let o = 0; o < t.length; o++) {
    let [r, s, a, l = Me] = t[o];
    r && (pe(r) && (r = {
      mounted: r,
      updated: r
    }), r.deep && wn(s), i.push({
      dir: r,
      instance: n,
      value: s,
      oldValue: void 0,
      arg: a,
      modifiers: l
    }));
  }
  return e;
}
function ei(e, t, n, i) {
  const o = e.dirs, r = t && t.dirs;
  for (let s = 0; s < o.length; s++) {
    const a = o[s];
    r && (a.oldValue = r[s].value);
    let l = a.dir[i];
    l && (En(), Xt(l, n, 8, [
      e.el,
      a,
      e,
      t
    ]), xn());
  }
}
const Xc = Symbol("_vte"), Jc = (e) => e.__isTeleport, hi = (e) => e && (e.disabled || e.disabled === ""), Xh = (e) => e && (e.defer || e.defer === ""), wl = (e) => typeof SVGElement < "u" && e instanceof SVGElement, Sl = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement, $s = (e, t) => {
  const n = e && e.to;
  if (je(n))
    if (t) {
      const i = t(n);
      return S.NODE_ENV !== "production" && !i && !hi(e) && W(
        `Failed to locate Teleport target with selector "${n}". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.`
      ), i;
    } else
      return S.NODE_ENV !== "production" && W(
        "Current renderer does not support string target for Teleports. (missing querySelector renderer option)"
      ), null;
  else
    return S.NODE_ENV !== "production" && !n && !hi(e) && W(`Invalid Teleport target: ${n}`), n;
}, Jh = {
  name: "Teleport",
  __isTeleport: !0,
  process(e, t, n, i, o, r, s, a, l, c) {
    const {
      mc: d,
      pc: u,
      pbc: m,
      o: { insert: g, querySelector: h, createText: v, createComment: _ }
    } = c, k = hi(t.props);
    let { shapeFlag: O, children: P, dynamicChildren: B } = t;
    if (S.NODE_ENV !== "production" && Kt && (l = !1, B = null), e == null) {
      const C = t.el = S.NODE_ENV !== "production" ? _("teleport start") : v(""), V = t.anchor = S.NODE_ENV !== "production" ? _("teleport end") : v("");
      g(C, n, i), g(V, n, i);
      const F = (N, $) => {
        O & 16 && (o && o.isCE && (o.ce._teleportTarget = N), d(
          P,
          N,
          $,
          o,
          r,
          s,
          a,
          l
        ));
      }, x = () => {
        const N = t.target = $s(t.props, h), $ = Zc(N, t, v, g);
        N ? (s !== "svg" && wl(N) ? s = "svg" : s !== "mathml" && Sl(N) && (s = "mathml"), k || (F(N, $), Yo(t, !1))) : S.NODE_ENV !== "production" && !k && W(
          "Invalid Teleport target on mount:",
          N,
          `(${typeof N})`
        );
      };
      k && (F(n, V), Yo(t, !0)), Xh(t.props) ? xt(x, r) : x();
    } else {
      t.el = e.el, t.targetStart = e.targetStart;
      const C = t.anchor = e.anchor, V = t.target = e.target, F = t.targetAnchor = e.targetAnchor, x = hi(e.props), N = x ? n : V, $ = x ? C : F;
      if (s === "svg" || wl(V) ? s = "svg" : (s === "mathml" || Sl(V)) && (s = "mathml"), B ? (m(
        e.dynamicChildren,
        B,
        N,
        o,
        r,
        s,
        a
      ), oo(e, t, !0)) : l || u(
        e,
        t,
        N,
        $,
        o,
        r,
        s,
        a,
        !1
      ), k)
        x ? t.props && e.props && t.props.to !== e.props.to && (t.props.to = e.props.to) : Fo(
          t,
          n,
          C,
          c,
          1
        );
      else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
        const E = t.target = $s(
          t.props,
          h
        );
        E ? Fo(
          t,
          E,
          null,
          c,
          0
        ) : S.NODE_ENV !== "production" && W(
          "Invalid Teleport target on update:",
          V,
          `(${typeof V})`
        );
      } else x && Fo(
        t,
        V,
        F,
        c,
        1
      );
      Yo(t, k);
    }
  },
  remove(e, t, n, { um: i, o: { remove: o } }, r) {
    const {
      shapeFlag: s,
      children: a,
      anchor: l,
      targetStart: c,
      targetAnchor: d,
      target: u,
      props: m
    } = e;
    if (u && (o(c), o(d)), r && o(l), s & 16) {
      const g = r || !hi(m);
      for (let h = 0; h < a.length; h++) {
        const v = a[h];
        i(
          v,
          t,
          n,
          g,
          !!v.dynamicChildren
        );
      }
    }
  },
  move: Fo,
  hydrate: Zh
};
function Fo(e, t, n, { o: { insert: i }, m: o }, r = 2) {
  r === 0 && i(e.targetAnchor, t, n);
  const { el: s, anchor: a, shapeFlag: l, children: c, props: d } = e, u = r === 2;
  if (u && i(s, t, n), (!u || hi(d)) && l & 16)
    for (let m = 0; m < c.length; m++)
      o(
        c[m],
        t,
        n,
        2
      );
  u && i(a, t, n);
}
function Zh(e, t, n, i, o, r, {
  o: { nextSibling: s, parentNode: a, querySelector: l, insert: c, createText: d }
}, u) {
  const m = t.target = $s(
    t.props,
    l
  );
  if (m) {
    const g = hi(t.props), h = m._lpa || m.firstChild;
    if (t.shapeFlag & 16)
      if (g)
        t.anchor = u(
          s(e),
          t,
          a(e),
          n,
          i,
          o,
          r
        ), t.targetStart = h, t.targetAnchor = h && s(h);
      else {
        t.anchor = s(e);
        let v = h;
        for (; v; ) {
          if (v && v.nodeType === 8) {
            if (v.data === "teleport start anchor")
              t.targetStart = v;
            else if (v.data === "teleport anchor") {
              t.targetAnchor = v, m._lpa = t.targetAnchor && s(t.targetAnchor);
              break;
            }
          }
          v = s(v);
        }
        t.targetAnchor || Zc(m, t, d, c), u(
          h && s(h),
          t,
          m,
          n,
          i,
          o,
          r
        );
      }
    Yo(t, g);
  }
  return t.anchor && s(t.anchor);
}
const Qh = Jh;
function Yo(e, t) {
  const n = e.ctx;
  if (n && n.ut) {
    let i, o;
    for (t ? (i = e.el, o = e.anchor) : (i = e.targetStart, o = e.targetAnchor); i && i !== o; )
      i.nodeType === 1 && i.setAttribute("data-v-owner", n.uid), i = i.nextSibling;
    n.ut();
  }
}
function Zc(e, t, n, i) {
  const o = t.targetStart = n(""), r = t.targetAnchor = n("");
  return o[Xc] = r, e && (i(o, e), i(r, e)), r;
}
const Pn = Symbol("_leaveCb"), Bo = Symbol("_enterCb");
function Qc() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  return cn(() => {
    e.isMounted = !0;
  }), gt(() => {
    e.isUnmounting = !0;
  }), e;
}
const Ft = [Function, Array], ed = {
  mode: String,
  appear: Boolean,
  persisted: Boolean,
  // enter
  onBeforeEnter: Ft,
  onEnter: Ft,
  onAfterEnter: Ft,
  onEnterCancelled: Ft,
  // leave
  onBeforeLeave: Ft,
  onLeave: Ft,
  onAfterLeave: Ft,
  onLeaveCancelled: Ft,
  // appear
  onBeforeAppear: Ft,
  onAppear: Ft,
  onAfterAppear: Ft,
  onAppearCancelled: Ft
}, td = (e) => {
  const t = e.subTree;
  return t.component ? td(t.component) : t;
}, ev = {
  name: "BaseTransition",
  props: ed,
  setup(e, { slots: t }) {
    const n = jr(), i = Qc();
    return () => {
      const o = t.default && wa(t.default(), !0);
      if (!o || !o.length)
        return;
      const r = nd(o), s = ae(e), { mode: a } = s;
      if (S.NODE_ENV !== "production" && a && a !== "in-out" && a !== "out-in" && a !== "default" && W(`invalid <transition> mode: ${a}`), i.isLeaving)
        return cs(r);
      const l = kl(r);
      if (!l)
        return cs(r);
      let c = fo(
        l,
        s,
        i,
        n,
        // #11061, ensure enterHooks is fresh after clone
        (m) => c = m
      );
      l.type !== Ze && _i(l, c);
      const d = n.subTree, u = d && kl(d);
      if (u && u.type !== Ze && !li(l, u) && td(n).type !== Ze) {
        const m = fo(
          u,
          s,
          i,
          n
        );
        if (_i(u, m), a === "out-in" && l.type !== Ze)
          return i.isLeaving = !0, m.afterLeave = () => {
            i.isLeaving = !1, n.job.flags & 8 || n.update(), delete m.afterLeave;
          }, cs(r);
        a === "in-out" && l.type !== Ze && (m.delayLeave = (g, h, v) => {
          const _ = id(
            i,
            u
          );
          _[String(u.key)] = u, g[Pn] = () => {
            h(), g[Pn] = void 0, delete c.delayedLeave;
          }, c.delayedLeave = v;
        });
      }
      return r;
    };
  }
};
function nd(e) {
  let t = e[0];
  if (e.length > 1) {
    let n = !1;
    for (const i of e)
      if (i.type !== Ze) {
        if (S.NODE_ENV !== "production" && n) {
          W(
            "<transition> can only be used on a single element or component. Use <transition-group> for lists."
          );
          break;
        }
        if (t = i, n = !0, S.NODE_ENV === "production") break;
      }
  }
  return t;
}
const tv = ev;
function id(e, t) {
  const { leavingVNodes: n } = e;
  let i = n.get(t.type);
  return i || (i = /* @__PURE__ */ Object.create(null), n.set(t.type, i)), i;
}
function fo(e, t, n, i, o) {
  const {
    appear: r,
    mode: s,
    persisted: a = !1,
    onBeforeEnter: l,
    onEnter: c,
    onAfterEnter: d,
    onEnterCancelled: u,
    onBeforeLeave: m,
    onLeave: g,
    onAfterLeave: h,
    onLeaveCancelled: v,
    onBeforeAppear: _,
    onAppear: k,
    onAfterAppear: O,
    onAppearCancelled: P
  } = t, B = String(e.key), C = id(n, e), V = (N, $) => {
    N && Xt(
      N,
      i,
      9,
      $
    );
  }, F = (N, $) => {
    const E = $[1];
    V(N, $), ue(N) ? N.every((w) => w.length <= 1) && E() : N.length <= 1 && E();
  }, x = {
    mode: s,
    persisted: a,
    beforeEnter(N) {
      let $ = l;
      if (!n.isMounted)
        if (r)
          $ = _ || l;
        else
          return;
      N[Pn] && N[Pn](
        !0
        /* cancelled */
      );
      const E = C[B];
      E && li(e, E) && E.el[Pn] && E.el[Pn](), V($, [N]);
    },
    enter(N) {
      let $ = c, E = d, w = u;
      if (!n.isMounted)
        if (r)
          $ = k || c, E = O || d, w = P || u;
        else
          return;
      let A = !1;
      const M = N[Bo] = (ee) => {
        A || (A = !0, ee ? V(w, [N]) : V(E, [N]), x.delayedLeave && x.delayedLeave(), N[Bo] = void 0);
      };
      $ ? F($, [N, M]) : M();
    },
    leave(N, $) {
      const E = String(e.key);
      if (N[Bo] && N[Bo](
        !0
        /* cancelled */
      ), n.isUnmounting)
        return $();
      V(m, [N]);
      let w = !1;
      const A = N[Pn] = (M) => {
        w || (w = !0, $(), M ? V(v, [N]) : V(h, [N]), N[Pn] = void 0, C[E] === e && delete C[E]);
      };
      C[E] = e, g ? F(g, [N, A]) : A();
    },
    clone(N) {
      const $ = fo(
        N,
        t,
        n,
        i,
        o
      );
      return o && o($), $;
    }
  };
  return x;
}
function cs(e) {
  if (Vo(e))
    return e = ln(e), e.children = null, e;
}
function kl(e) {
  if (!Vo(e))
    return Jc(e.type) && e.children ? nd(e.children) : e;
  if (S.NODE_ENV !== "production" && e.component)
    return e.component.subTree;
  const { shapeFlag: t, children: n } = e;
  if (n) {
    if (t & 16)
      return n[0];
    if (t & 32 && pe(n.default))
      return n.default();
  }
}
function _i(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, _i(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function wa(e, t = !1, n) {
  let i = [], o = 0;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    const a = n == null ? s.key : String(n) + String(s.key != null ? s.key : r);
    s.type === fe ? (s.patchFlag & 128 && o++, i = i.concat(
      wa(s.children, t, a)
    )) : (t || s.type !== Ze) && i.push(a != null ? ln(s, { key: a }) : s);
  }
  if (o > 1)
    for (let r = 0; r < i.length; r++)
      i[r].patchFlag = -2;
  return i;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function nv(e, t) {
  return pe(e) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    Ue({ name: e.name }, t, { setup: e })
  ) : e;
}
function od(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
const iv = /* @__PURE__ */ new WeakSet();
function Ms(e, t, n, i, o = !1) {
  if (ue(e)) {
    e.forEach(
      (h, v) => Ms(
        h,
        t && (ue(t) ? t[v] : t),
        n,
        i,
        o
      )
    );
    return;
  }
  if (Mi(i) && !o)
    return;
  const r = i.shapeFlag & 4 ? zr(i.component) : i.el, s = o ? null : r, { i: a, r: l } = e;
  if (S.NODE_ENV !== "production" && !a) {
    W(
      "Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function."
    );
    return;
  }
  const c = t && t.r, d = a.refs === Me ? a.refs = {} : a.refs, u = a.setupState, m = ae(u), g = u === Me ? () => !1 : (h) => S.NODE_ENV !== "production" && (Ie(m, h) && !Be(m[h]) && W(
    `Template ref "${h}" used on a non-ref value. It will not work in the production build.`
  ), iv.has(m[h])) ? !1 : Ie(m, h);
  if (c != null && c !== l && (je(c) ? (d[c] = null, g(c) && (u[c] = null)) : Be(c) && (c.value = null)), pe(l))
    zi(l, a, 12, [s, d]);
  else {
    const h = je(l), v = Be(l);
    if (h || v) {
      const _ = () => {
        if (e.f) {
          const k = h ? g(l) ? u[l] : d[l] : l.value;
          o ? ue(k) && la(k, r) : ue(k) ? k.includes(r) || k.push(r) : h ? (d[l] = [r], g(l) && (u[l] = d[l])) : (l.value = [r], e.k && (d[e.k] = l.value));
        } else h ? (d[l] = s, g(l) && (u[l] = s)) : v ? (l.value = s, e.k && (d[e.k] = s)) : S.NODE_ENV !== "production" && W("Invalid template ref type:", l, `(${typeof l})`);
      };
      s ? (_.id = -1, xt(_, n)) : _();
    } else S.NODE_ENV !== "production" && W("Invalid template ref type:", l, `(${typeof l})`);
  }
}
Co().requestIdleCallback;
Co().cancelIdleCallback;
const Mi = (e) => !!e.type.__asyncLoader, Vo = (e) => e.type.__isKeepAlive;
function rd(e, t) {
  ad(e, "a", t);
}
function sd(e, t) {
  ad(e, "da", t);
}
function ad(e, t, n = st) {
  const i = e.__wdc || (e.__wdc = () => {
    let o = n;
    for (; o; ) {
      if (o.isDeactivated)
        return;
      o = o.parent;
    }
    return e();
  });
  if (Rr(t, i, n), n) {
    let o = n.parent;
    for (; o && o.parent; )
      Vo(o.parent.vnode) && ov(i, t, n, o), o = o.parent;
  }
}
function ov(e, t, n, i) {
  const o = Rr(
    t,
    e,
    i,
    !0
    /* prepend */
  );
  ld(() => {
    la(i[t], o);
  }, n);
}
function Rr(e, t, n = st, i = !1) {
  if (n) {
    const o = n[e] || (n[e] = []), r = t.__weh || (t.__weh = (...s) => {
      En();
      const a = Oo(n), l = Xt(t, n, e, s);
      return a(), xn(), l;
    });
    return i ? o.unshift(r) : o.push(r), r;
  } else if (S.NODE_ENV !== "production") {
    const o = ri(ya[e].replace(/ hook$/, ""));
    W(
      `${o} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
    );
  }
}
const Nn = (e) => (t, n = st) => {
  (!ho || e === "sp") && Rr(e, (...i) => t(...i), n);
}, Sa = Nn("bm"), cn = Nn("m"), rv = Nn(
  "bu"
), ka = Nn("u"), gt = Nn(
  "bum"
), ld = Nn("um"), sv = Nn(
  "sp"
), av = Nn("rtg"), lv = Nn("rtc");
function uv(e, t = st) {
  Rr("ec", e, t);
}
const Ls = "components", cv = "directives", dv = Symbol.for("v-ndc");
function fv(e) {
  return je(e) && ud(Ls, e, !1) || e;
}
function Si(e) {
  return ud(cv, e);
}
function ud(e, t, n = !0, i = !1) {
  const o = tt || st;
  if (o) {
    const r = o.type;
    if (e === Ls) {
      const a = Ta(
        r,
        !1
      );
      if (a && (a === t || a === dt(t) || a === zt(dt(t))))
        return r;
    }
    const s = (
      // local registration
      // check instance[type] first which is resolved for options API
      Cl(o[e] || r[e], t) || // global registration
      Cl(o.appContext[e], t)
    );
    if (!s && i)
      return r;
    if (S.NODE_ENV !== "production" && n && !s) {
      const a = e === Ls ? `
If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.` : "";
      W(`Failed to resolve ${e.slice(0, -1)}: ${t}${a}`);
    }
    return s;
  } else S.NODE_ENV !== "production" && W(
    `resolve${zt(e.slice(0, -1))} can only be used in render() or setup().`
  );
}
function Cl(e, t) {
  return e && (e[t] || e[dt(t)] || e[zt(dt(t))]);
}
function At(e, t, n, i) {
  let o;
  const r = n, s = ue(e);
  if (s || je(e)) {
    const a = s && fi(e);
    let l = !1;
    a && (l = !kt(e), e = Mr(e)), o = new Array(e.length);
    for (let c = 0, d = e.length; c < d; c++)
      o[c] = t(
        l ? ht(e[c]) : e[c],
        c,
        void 0,
        r
      );
  } else if (typeof e == "number") {
    S.NODE_ENV !== "production" && !Number.isInteger(e) && W(`The v-for range expect an integer value but got ${e}.`), o = new Array(e);
    for (let a = 0; a < e; a++)
      o[a] = t(a + 1, a, void 0, r);
  } else if (Pe(e))
    if (e[Symbol.iterator])
      o = Array.from(
        e,
        (a, l) => t(a, l, void 0, r)
      );
    else {
      const a = Object.keys(e);
      o = new Array(a.length);
      for (let l = 0, c = a.length; l < c; l++) {
        const d = a[l];
        o[l] = t(e[d], d, l, r);
      }
    }
  else
    o = [];
  return o;
}
function mv(e, t, n = {}, i, o) {
  if (tt.ce || tt.parent && Mi(tt.parent) && tt.parent.ce)
    return n.name = t, X(), Ke(
      fe,
      null,
      [f("slot", n, i)],
      64
    );
  let r = e[t];
  S.NODE_ENV !== "production" && r && r.length > 1 && (W(
    "SSR-optimized slot function detected in a non-SSR-optimized render function. You need to mark this component with $dynamic-slots in the parent template."
  ), r = () => []), r && r._c && (r._d = !1), X();
  const s = r && cd(r(n)), a = n.key || // slot content array of a dynamic conditional slot may have a branch
  // key attached in the `createSlots` helper, respect that
  s && s.key, l = Ke(
    fe,
    {
      key: (a && !Yt(a) ? a : `_${t}`) + // #7256 force differentiate fallback content from actual content
      (!s && i ? "_fb" : "")
    },
    s || [],
    s && e._ === 1 ? 64 : -2
  );
  return r && r._c && (r._d = !0), l;
}
function cd(e) {
  return e.some((t) => bi(t) ? !(t.type === Ze || t.type === fe && !cd(t.children)) : !0) ? e : null;
}
const Fs = (e) => e ? Dd(e) ? zr(e) : Fs(e.parent) : null, vi = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ Ue(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => S.NODE_ENV !== "production" ? on(e.props) : e.props,
    $attrs: (e) => S.NODE_ENV !== "production" ? on(e.attrs) : e.attrs,
    $slots: (e) => S.NODE_ENV !== "production" ? on(e.slots) : e.slots,
    $refs: (e) => S.NODE_ENV !== "production" ? on(e.refs) : e.refs,
    $parent: (e) => Fs(e.parent),
    $root: (e) => Fs(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Ea(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Br(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = ft.bind(e.proxy)),
    $watch: (e) => Wv.bind(e)
  })
), Ca = (e) => e === "_" || e === "$", ds = (e, t) => e !== Me && !e.__isScriptSetup && Ie(e, t), dd = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: n, setupState: i, data: o, props: r, accessCache: s, type: a, appContext: l } = e;
    if (S.NODE_ENV !== "production" && t === "__isVue")
      return !0;
    let c;
    if (t[0] !== "$") {
      const g = s[t];
      if (g !== void 0)
        switch (g) {
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
        if (ds(i, t))
          return s[t] = 1, i[t];
        if (o !== Me && Ie(o, t))
          return s[t] = 2, o[t];
        if (
          // only cache other properties when instance has declared (thus stable)
          // props
          (c = e.propsOptions[0]) && Ie(c, t)
        )
          return s[t] = 3, r[t];
        if (n !== Me && Ie(n, t))
          return s[t] = 4, n[t];
        Bs && (s[t] = 0);
      }
    }
    const d = vi[t];
    let u, m;
    if (d)
      return t === "$attrs" ? (ot(e.attrs, "get", ""), S.NODE_ENV !== "production" && mr()) : S.NODE_ENV !== "production" && t === "$slots" && ot(e, "get", t), d(e);
    if (
      // css module (injected by vue-loader)
      (u = a.__cssModules) && (u = u[t])
    )
      return u;
    if (n !== Me && Ie(n, t))
      return s[t] = 4, n[t];
    if (
      // global properties
      m = l.config.globalProperties, Ie(m, t)
    )
      return m[t];
    S.NODE_ENV !== "production" && tt && (!je(t) || // #1091 avoid internal isRef/isVNode checks on component instance leading
    // to infinite warning loop
    t.indexOf("__v") !== 0) && (o !== Me && Ca(t[0]) && Ie(o, t) ? W(
      `Property ${JSON.stringify(
        t
      )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
    ) : e === tt && W(
      `Property ${JSON.stringify(t)} was accessed during render but is not defined on instance.`
    ));
  },
  set({ _: e }, t, n) {
    const { data: i, setupState: o, ctx: r } = e;
    return ds(o, t) ? (o[t] = n, !0) : S.NODE_ENV !== "production" && o.__isScriptSetup && Ie(o, t) ? (W(`Cannot mutate <script setup> binding "${t}" from Options API.`), !1) : i !== Me && Ie(i, t) ? (i[t] = n, !0) : Ie(e.props, t) ? (S.NODE_ENV !== "production" && W(`Attempting to mutate prop "${t}". Props are readonly.`), !1) : t[0] === "$" && t.slice(1) in e ? (S.NODE_ENV !== "production" && W(
      `Attempting to mutate public property "${t}". Properties starting with $ are reserved and readonly.`
    ), !1) : (S.NODE_ENV !== "production" && t in e.appContext.config.globalProperties ? Object.defineProperty(r, t, {
      enumerable: !0,
      configurable: !0,
      value: n
    }) : r[t] = n, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: n, ctx: i, appContext: o, propsOptions: r }
  }, s) {
    let a;
    return !!n[s] || e !== Me && Ie(e, s) || ds(t, s) || (a = r[0]) && Ie(a, s) || Ie(i, s) || Ie(vi, s) || Ie(o.config.globalProperties, s);
  },
  defineProperty(e, t, n) {
    return n.get != null ? e._.accessCache[t] = 0 : Ie(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
  }
};
S.NODE_ENV !== "production" && (dd.ownKeys = (e) => (W(
  "Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead."
), Reflect.ownKeys(e)));
function hv(e) {
  const t = {};
  return Object.defineProperty(t, "_", {
    configurable: !0,
    enumerable: !1,
    get: () => e
  }), Object.keys(vi).forEach((n) => {
    Object.defineProperty(t, n, {
      configurable: !0,
      enumerable: !1,
      get: () => vi[n](e),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: rt
    });
  }), t;
}
function vv(e) {
  const {
    ctx: t,
    propsOptions: [n]
  } = e;
  n && Object.keys(n).forEach((i) => {
    Object.defineProperty(t, i, {
      enumerable: !0,
      configurable: !0,
      get: () => e.props[i],
      set: rt
    });
  });
}
function gv(e) {
  const { ctx: t, setupState: n } = e;
  Object.keys(ae(n)).forEach((i) => {
    if (!n.__isScriptSetup) {
      if (Ca(i[0])) {
        W(
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
        set: rt
      });
    }
  });
}
function El(e) {
  return ue(e) ? e.reduce(
    (t, n) => (t[n] = null, t),
    {}
  ) : e;
}
function pv() {
  const e = /* @__PURE__ */ Object.create(null);
  return (t, n) => {
    e[n] ? W(`${t} property "${n}" is already defined in ${e[n]}.`) : e[n] = t;
  };
}
let Bs = !0;
function yv(e) {
  const t = Ea(e), n = e.proxy, i = e.ctx;
  Bs = !1, t.beforeCreate && xl(t.beforeCreate, e, "bc");
  const {
    // state
    data: o,
    computed: r,
    methods: s,
    watch: a,
    provide: l,
    inject: c,
    // lifecycle
    created: d,
    beforeMount: u,
    mounted: m,
    beforeUpdate: g,
    updated: h,
    activated: v,
    deactivated: _,
    beforeDestroy: k,
    beforeUnmount: O,
    destroyed: P,
    unmounted: B,
    render: C,
    renderTracked: V,
    renderTriggered: F,
    errorCaptured: x,
    serverPrefetch: N,
    // public API
    expose: $,
    inheritAttrs: E,
    // assets
    components: w,
    directives: A,
    filters: M
  } = t, ee = S.NODE_ENV !== "production" ? pv() : null;
  if (S.NODE_ENV !== "production") {
    const [ne] = e.propsOptions;
    if (ne)
      for (const G in ne)
        ee("Props", G);
  }
  if (c && _v(c, i, ee), s)
    for (const ne in s) {
      const G = s[ne];
      pe(G) ? (S.NODE_ENV !== "production" ? Object.defineProperty(i, ne, {
        value: G.bind(n),
        configurable: !0,
        enumerable: !0,
        writable: !0
      }) : i[ne] = G.bind(n), S.NODE_ENV !== "production" && ee("Methods", ne)) : S.NODE_ENV !== "production" && W(
        `Method "${ne}" has type "${typeof G}" in the component definition. Did you reference the function correctly?`
      );
    }
  if (o) {
    S.NODE_ENV !== "production" && !pe(o) && W(
      "The data option must be a function. Plain object usage is no longer supported."
    );
    const ne = o.call(n, n);
    if (S.NODE_ENV !== "production" && ua(ne) && W(
      "data() returned a Promise - note data() cannot be async; If you intend to perform data fetching before component renders, use async setup() + <Suspense>."
    ), !Pe(ne))
      S.NODE_ENV !== "production" && W("data() should return an object.");
    else if (e.data = ct(ne), S.NODE_ENV !== "production")
      for (const G in ne)
        ee("Data", G), Ca(G[0]) || Object.defineProperty(i, G, {
          configurable: !0,
          enumerable: !0,
          get: () => ne[G],
          set: rt
        });
  }
  if (Bs = !0, r)
    for (const ne in r) {
      const G = r[ne], Se = pe(G) ? G.bind(n, n) : pe(G.get) ? G.get.bind(n, n) : rt;
      S.NODE_ENV !== "production" && Se === rt && W(`Computed property "${ne}" has no getter.`);
      const xe = !pe(G) && pe(G.set) ? G.set.bind(n) : S.NODE_ENV !== "production" ? () => {
        W(
          `Write operation failed: computed property "${ne}" is readonly.`
        );
      } : rt, we = y({
        get: Se,
        set: xe
      });
      Object.defineProperty(i, ne, {
        enumerable: !0,
        configurable: !0,
        get: () => we.value,
        set: (de) => we.value = de
      }), S.NODE_ENV !== "production" && ee("Computed", ne);
    }
  if (a)
    for (const ne in a)
      fd(a[ne], i, n, ne);
  if (l) {
    const ne = pe(l) ? l.call(n) : l;
    Reflect.ownKeys(ne).forEach((G) => {
      Et(G, ne[G]);
    });
  }
  d && xl(d, e, "c");
  function oe(ne, G) {
    ue(G) ? G.forEach((Se) => ne(Se.bind(n))) : G && ne(G.bind(n));
  }
  if (oe(Sa, u), oe(cn, m), oe(rv, g), oe(ka, h), oe(rd, v), oe(sd, _), oe(uv, x), oe(lv, V), oe(av, F), oe(gt, O), oe(ld, B), oe(sv, N), ue($))
    if ($.length) {
      const ne = e.exposed || (e.exposed = {});
      $.forEach((G) => {
        Object.defineProperty(ne, G, {
          get: () => n[G],
          set: (Se) => n[G] = Se
        });
      });
    } else e.exposed || (e.exposed = {});
  C && e.render === rt && (e.render = C), E != null && (e.inheritAttrs = E), w && (e.components = w), A && (e.directives = A), N && od(e);
}
function _v(e, t, n = rt) {
  ue(e) && (e = Rs(e));
  for (const i in e) {
    const o = e[i];
    let r;
    Pe(o) ? "default" in o ? r = He(
      o.from || i,
      o.default,
      !0
    ) : r = He(o.from || i) : r = He(o), Be(r) ? Object.defineProperty(t, i, {
      enumerable: !0,
      configurable: !0,
      get: () => r.value,
      set: (s) => r.value = s
    }) : t[i] = r, S.NODE_ENV !== "production" && n("Inject", i);
  }
}
function xl(e, t, n) {
  Xt(
    ue(e) ? e.map((i) => i.bind(t.proxy)) : e.bind(t.proxy),
    t,
    n
  );
}
function fd(e, t, n, i) {
  let o = i.includes(".") ? Cd(n, i) : () => n[i];
  if (je(e)) {
    const r = t[e];
    pe(r) ? be(o, r) : S.NODE_ENV !== "production" && W(`Invalid watch handler specified by key "${e}"`, r);
  } else if (pe(e))
    be(o, e.bind(n));
  else if (Pe(e))
    if (ue(e))
      e.forEach((r) => fd(r, t, n, i));
    else {
      const r = pe(e.handler) ? e.handler.bind(n) : t[e.handler];
      pe(r) ? be(o, r, e) : S.NODE_ENV !== "production" && W(`Invalid watch handler specified by key "${e.handler}"`, r);
    }
  else S.NODE_ENV !== "production" && W(`Invalid watch option: "${i}"`, e);
}
function Ea(e) {
  const t = e.type, { mixins: n, extends: i } = t, {
    mixins: o,
    optionsCache: r,
    config: { optionMergeStrategies: s }
  } = e.appContext, a = r.get(t);
  let l;
  return a ? l = a : !o.length && !n && !i ? l = t : (l = {}, o.length && o.forEach(
    (c) => dr(l, c, s, !0)
  ), dr(l, t, s)), Pe(t) && r.set(t, l), l;
}
function dr(e, t, n, i = !1) {
  const { mixins: o, extends: r } = t;
  r && dr(e, r, n, !0), o && o.forEach(
    (s) => dr(e, s, n, !0)
  );
  for (const s in t)
    if (i && s === "expose")
      S.NODE_ENV !== "production" && W(
        '"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.'
      );
    else {
      const a = bv[s] || n && n[s];
      e[s] = a ? a(e[s], t[s]) : t[s];
    }
  return e;
}
const bv = {
  data: Nl,
  props: Vl,
  emits: Vl,
  // objects
  methods: Qi,
  computed: Qi,
  // lifecycle
  beforeCreate: _t,
  created: _t,
  beforeMount: _t,
  mounted: _t,
  beforeUpdate: _t,
  updated: _t,
  beforeDestroy: _t,
  beforeUnmount: _t,
  destroyed: _t,
  unmounted: _t,
  activated: _t,
  deactivated: _t,
  errorCaptured: _t,
  serverPrefetch: _t,
  // assets
  components: Qi,
  directives: Qi,
  // watch
  watch: Sv,
  // provide / inject
  provide: Nl,
  inject: wv
};
function Nl(e, t) {
  return t ? e ? function() {
    return Ue(
      pe(e) ? e.call(this, this) : e,
      pe(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function wv(e, t) {
  return Qi(Rs(e), Rs(t));
}
function Rs(e) {
  if (ue(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++)
      t[e[n]] = e[n];
    return t;
  }
  return e;
}
function _t(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function Qi(e, t) {
  return e ? Ue(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function Vl(e, t) {
  return e ? ue(e) && ue(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : Ue(
    /* @__PURE__ */ Object.create(null),
    El(e),
    El(t ?? {})
  ) : t;
}
function Sv(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = Ue(/* @__PURE__ */ Object.create(null), e);
  for (const i in t)
    n[i] = _t(e[i], t[i]);
  return n;
}
function md() {
  return {
    app: null,
    config: {
      isNativeTag: $m,
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
let kv = 0;
function Cv(e, t) {
  return function(i, o = null) {
    pe(i) || (i = Ue({}, i)), o != null && !Pe(o) && (S.NODE_ENV !== "production" && W("root props passed to app.mount() must be an object."), o = null);
    const r = md(), s = /* @__PURE__ */ new WeakSet(), a = [];
    let l = !1;
    const c = r.app = {
      _uid: kv++,
      _component: i,
      _props: o,
      _container: null,
      _context: r,
      _instance: null,
      version: Bl,
      get config() {
        return r.config;
      },
      set config(d) {
        S.NODE_ENV !== "production" && W(
          "app.config cannot be replaced. Modify individual options instead."
        );
      },
      use(d, ...u) {
        return s.has(d) ? S.NODE_ENV !== "production" && W("Plugin has already been applied to target app.") : d && pe(d.install) ? (s.add(d), d.install(c, ...u)) : pe(d) ? (s.add(d), d(c, ...u)) : S.NODE_ENV !== "production" && W(
          'A plugin must either be a function or an object with an "install" function.'
        ), c;
      },
      mixin(d) {
        return r.mixins.includes(d) ? S.NODE_ENV !== "production" && W(
          "Mixin has already been applied to target app" + (d.name ? `: ${d.name}` : "")
        ) : r.mixins.push(d), c;
      },
      component(d, u) {
        return S.NODE_ENV !== "production" && Ws(d, r.config), u ? (S.NODE_ENV !== "production" && r.components[d] && W(`Component "${d}" has already been registered in target app.`), r.components[d] = u, c) : r.components[d];
      },
      directive(d, u) {
        return S.NODE_ENV !== "production" && Yc(d), u ? (S.NODE_ENV !== "production" && r.directives[d] && W(`Directive "${d}" has already been registered in target app.`), r.directives[d] = u, c) : r.directives[d];
      },
      mount(d, u, m) {
        if (l)
          S.NODE_ENV !== "production" && W(
            "App has already been mounted.\nIf you want to remount the same app, move your app creation logic into a factory function and create fresh app instances for each mount - e.g. `const createMyApp = () => createApp(App)`"
          );
        else {
          S.NODE_ENV !== "production" && d.__vue_app__ && W(
            "There is already an app instance mounted on the host container.\n If you want to mount another app on the same host container, you need to unmount the previous app by calling `app.unmount()` first."
          );
          const g = c._ceVNode || f(i, o);
          return g.appContext = r, m === !0 ? m = "svg" : m === !1 && (m = void 0), S.NODE_ENV !== "production" && (r.reload = () => {
            e(
              ln(g),
              d,
              m
            );
          }), u && t ? t(g, d) : e(g, d, m), l = !0, c._container = d, d.__vue_app__ = c, S.NODE_ENV !== "production" && (c._instance = g.component, jh(c, Bl)), zr(g.component);
        }
      },
      onUnmount(d) {
        S.NODE_ENV !== "production" && typeof d != "function" && W(
          `Expected function as first argument to app.onUnmount(), but got ${typeof d}`
        ), a.push(d);
      },
      unmount() {
        l ? (Xt(
          a,
          c._instance,
          16
        ), e(null, c._container), S.NODE_ENV !== "production" && (c._instance = null, zh(c)), delete c._container.__vue_app__) : S.NODE_ENV !== "production" && W("Cannot unmount an app that is not mounted.");
      },
      provide(d, u) {
        return S.NODE_ENV !== "production" && d in r.provides && W(
          `App already provides property with key "${String(d)}". It will be overwritten with the new value.`
        ), r.provides[d] = u, c;
      },
      runWithContext(d) {
        const u = Li;
        Li = c;
        try {
          return d();
        } finally {
          Li = u;
        }
      }
    };
    return c;
  };
}
let Li = null;
function Et(e, t) {
  if (!st)
    S.NODE_ENV !== "production" && W("provide() can only be used inside setup().");
  else {
    let n = st.provides;
    const i = st.parent && st.parent.provides;
    i === n && (n = st.provides = Object.create(i)), n[e] = t;
  }
}
function He(e, t, n = !1) {
  const i = st || tt;
  if (i || Li) {
    const o = Li ? Li._context.provides : i ? i.parent == null ? i.vnode.appContext && i.vnode.appContext.provides : i.parent.provides : void 0;
    if (o && e in o)
      return o[e];
    if (arguments.length > 1)
      return n && pe(t) ? t.call(i && i.proxy) : t;
    S.NODE_ENV !== "production" && W(`injection "${String(e)}" not found.`);
  } else S.NODE_ENV !== "production" && W("inject() can only be used inside setup() or functional components.");
}
const hd = {}, vd = () => Object.create(hd), gd = (e) => Object.getPrototypeOf(e) === hd;
function Ev(e, t, n, i = !1) {
  const o = {}, r = vd();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), pd(e, t, o, r);
  for (const s in e.propsOptions[0])
    s in o || (o[s] = void 0);
  S.NODE_ENV !== "production" && _d(t || {}, o, e), n ? e.props = i ? o : wh(o) : e.type.props ? e.props = o : e.props = r, e.attrs = r;
}
function xv(e) {
  for (; e; ) {
    if (e.type.__hmrId) return !0;
    e = e.parent;
  }
}
function Nv(e, t, n, i) {
  const {
    props: o,
    attrs: r,
    vnode: { patchFlag: s }
  } = e, a = ae(o), [l] = e.propsOptions;
  let c = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(S.NODE_ENV !== "production" && xv(e)) && (i || s > 0) && !(s & 16)
  ) {
    if (s & 8) {
      const d = e.vnode.dynamicProps;
      for (let u = 0; u < d.length; u++) {
        let m = d[u];
        if (Hr(e.emitsOptions, m))
          continue;
        const g = t[m];
        if (l)
          if (Ie(r, m))
            g !== r[m] && (r[m] = g, c = !0);
          else {
            const h = dt(m);
            o[h] = Hs(
              l,
              a,
              h,
              g,
              e,
              !1
            );
          }
        else
          g !== r[m] && (r[m] = g, c = !0);
      }
    }
  } else {
    pd(e, t, o, r) && (c = !0);
    let d;
    for (const u in a)
      (!t || // for camelCase
      !Ie(t, u) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((d = jn(u)) === u || !Ie(t, d))) && (l ? n && // for camelCase
      (n[u] !== void 0 || // for kebab-case
      n[d] !== void 0) && (o[u] = Hs(
        l,
        a,
        u,
        void 0,
        e,
        !0
      )) : delete o[u]);
    if (r !== a)
      for (const u in r)
        (!t || !Ie(t, u)) && (delete r[u], c = !0);
  }
  c && tn(e.attrs, "set", ""), S.NODE_ENV !== "production" && _d(t || {}, o, e);
}
function pd(e, t, n, i) {
  const [o, r] = e.propsOptions;
  let s = !1, a;
  if (t)
    for (let l in t) {
      if (to(l))
        continue;
      const c = t[l];
      let d;
      o && Ie(o, d = dt(l)) ? !r || !r.includes(d) ? n[d] = c : (a || (a = {}))[d] = c : Hr(e.emitsOptions, l) || (!(l in i) || c !== i[l]) && (i[l] = c, s = !0);
    }
  if (r) {
    const l = ae(n), c = a || Me;
    for (let d = 0; d < r.length; d++) {
      const u = r[d];
      n[u] = Hs(
        o,
        l,
        u,
        c[u],
        e,
        !Ie(c, u)
      );
    }
  }
  return s;
}
function Hs(e, t, n, i, o, r) {
  const s = e[n];
  if (s != null) {
    const a = Ie(s, "default");
    if (a && i === void 0) {
      const l = s.default;
      if (s.type !== Function && !s.skipFactory && pe(l)) {
        const { propsDefaults: c } = o;
        if (n in c)
          i = c[n];
        else {
          const d = Oo(o);
          i = c[n] = l.call(
            null,
            t
          ), d();
        }
      } else
        i = l;
      o.ce && o.ce._setProp(n, i);
    }
    s[
      0
      /* shouldCast */
    ] && (r && !a ? i = !1 : s[
      1
      /* shouldCastTrue */
    ] && (i === "" || i === jn(n)) && (i = !0));
  }
  return i;
}
const Vv = /* @__PURE__ */ new WeakMap();
function yd(e, t, n = !1) {
  const i = n ? Vv : t.propsCache, o = i.get(e);
  if (o)
    return o;
  const r = e.props, s = {}, a = [];
  let l = !1;
  if (!pe(e)) {
    const d = (u) => {
      l = !0;
      const [m, g] = yd(u, t, !0);
      Ue(s, m), g && a.push(...g);
    };
    !n && t.mixins.length && t.mixins.forEach(d), e.extends && d(e.extends), e.mixins && e.mixins.forEach(d);
  }
  if (!r && !l)
    return Pe(e) && i.set(e, Pi), Pi;
  if (ue(r))
    for (let d = 0; d < r.length; d++) {
      S.NODE_ENV !== "production" && !je(r[d]) && W("props must be strings when using array syntax.", r[d]);
      const u = dt(r[d]);
      Ol(u) && (s[u] = Me);
    }
  else if (r) {
    S.NODE_ENV !== "production" && !Pe(r) && W("invalid props options", r);
    for (const d in r) {
      const u = dt(d);
      if (Ol(u)) {
        const m = r[d], g = s[u] = ue(m) || pe(m) ? { type: m } : Ue({}, m), h = g.type;
        let v = !1, _ = !0;
        if (ue(h))
          for (let k = 0; k < h.length; ++k) {
            const O = h[k], P = pe(O) && O.name;
            if (P === "Boolean") {
              v = !0;
              break;
            } else P === "String" && (_ = !1);
          }
        else
          v = pe(h) && h.name === "Boolean";
        g[
          0
          /* shouldCast */
        ] = v, g[
          1
          /* shouldCastTrue */
        ] = _, (v || Ie(g, "default")) && a.push(u);
      }
    }
  }
  const c = [s, a];
  return Pe(e) && i.set(e, c), c;
}
function Ol(e) {
  return e[0] !== "$" && !to(e) ? !0 : (S.NODE_ENV !== "production" && W(`Invalid prop name: "${e}" is a reserved property.`), !1);
}
function Ov(e) {
  return e === null ? "null" : typeof e == "function" ? e.name || "" : typeof e == "object" && e.constructor && e.constructor.name || "";
}
function _d(e, t, n) {
  const i = ae(t), o = n.propsOptions[0], r = Object.keys(e).map((s) => dt(s));
  for (const s in o) {
    let a = o[s];
    a != null && Tv(
      s,
      i[s],
      a,
      S.NODE_ENV !== "production" ? on(i) : i,
      !r.includes(s)
    );
  }
}
function Tv(e, t, n, i, o) {
  const { type: r, required: s, validator: a, skipCheck: l } = n;
  if (s && o) {
    W('Missing required prop: "' + e + '"');
    return;
  }
  if (!(t == null && !s)) {
    if (r != null && r !== !0 && !l) {
      let c = !1;
      const d = ue(r) ? r : [r], u = [];
      for (let m = 0; m < d.length && !c; m++) {
        const { valid: g, expectedType: h } = Dv(t, d[m]);
        u.push(h || ""), c = g;
      }
      if (!c) {
        W(Iv(e, t, u));
        return;
      }
    }
    a && !a(t, i) && W('Invalid prop: custom validator check failed for prop "' + e + '".');
  }
}
const Av = /* @__PURE__ */ Cn(
  "String,Number,Boolean,Function,Symbol,BigInt"
);
function Dv(e, t) {
  let n;
  const i = Ov(t);
  if (i === "null")
    n = e === null;
  else if (Av(i)) {
    const o = typeof e;
    n = o === i.toLowerCase(), !n && o === "object" && (n = e instanceof t);
  } else i === "Object" ? n = Pe(e) : i === "Array" ? n = ue(e) : n = e instanceof t;
  return {
    valid: n,
    expectedType: i
  };
}
function Iv(e, t, n) {
  if (n.length === 0)
    return `Prop type [] for prop "${e}" won't match anything. Did you mean to use type Array instead?`;
  let i = `Invalid prop: type check failed for prop "${e}". Expected ${n.map(zt).join(" | ")}`;
  const o = n[0], r = ca(t), s = Tl(t, o), a = Tl(t, r);
  return n.length === 1 && Al(o) && !Pv(o, r) && (i += ` with value ${s}`), i += `, got ${r} `, Al(r) && (i += `with value ${a}.`), i;
}
function Tl(e, t) {
  return t === "String" ? `"${e}"` : t === "Number" ? `${Number(e)}` : `${e}`;
}
function Al(e) {
  return ["string", "number", "boolean"].some((n) => e.toLowerCase() === n);
}
function Pv(...e) {
  return e.some((t) => t.toLowerCase() === "boolean");
}
const bd = (e) => e[0] === "_" || e === "$stable", xa = (e) => ue(e) ? e.map(qt) : [qt(e)], $v = (e, t, n) => {
  if (t._n)
    return t;
  const i = T((...o) => (S.NODE_ENV !== "production" && st && (!n || n.root === st.root) && W(
    `Slot "${e}" invoked outside of the render function: this will not track dependencies used in the slot. Invoke the slot function inside the render function instead.`
  ), xa(t(...o))), n);
  return i._c = !1, i;
}, wd = (e, t, n) => {
  const i = e._ctx;
  for (const o in e) {
    if (bd(o)) continue;
    const r = e[o];
    if (pe(r))
      t[o] = $v(o, r, i);
    else if (r != null) {
      S.NODE_ENV !== "production" && W(
        `Non-function value encountered for slot "${o}". Prefer function slots for better performance.`
      );
      const s = xa(r);
      t[o] = () => s;
    }
  }
}, Sd = (e, t) => {
  S.NODE_ENV !== "production" && !Vo(e.vnode) && W(
    "Non-function value encountered for default slot. Prefer function slots for better performance."
  );
  const n = xa(t);
  e.slots.default = () => n;
}, js = (e, t, n) => {
  for (const i in t)
    (n || i !== "_") && (e[i] = t[i]);
}, Mv = (e, t, n) => {
  const i = e.slots = vd();
  if (e.vnode.shapeFlag & 32) {
    const o = t._;
    o ? (js(i, t, n), n && or(i, "_", o, !0)) : wd(t, i);
  } else t && Sd(e, t);
}, Lv = (e, t, n) => {
  const { vnode: i, slots: o } = e;
  let r = !0, s = Me;
  if (i.shapeFlag & 32) {
    const a = t._;
    a ? S.NODE_ENV !== "production" && Kt ? (js(o, t, n), tn(e, "set", "$slots")) : n && a === 1 ? r = !1 : js(o, t, n) : (r = !t.$stable, wd(t, o)), s = t;
  } else t && (Sd(e, t), s = { default: 1 });
  if (r)
    for (const a in o)
      !bd(a) && s[a] == null && delete o[a];
};
let Ki, Mn;
function pn(e, t) {
  e.appContext.config.performance && fr() && Mn.mark(`vue-${t}-${e.uid}`), S.NODE_ENV !== "production" && Kh(e, t, fr() ? Mn.now() : Date.now());
}
function yn(e, t) {
  if (e.appContext.config.performance && fr()) {
    const n = `vue-${t}-${e.uid}`, i = n + ":end";
    Mn.mark(i), Mn.measure(
      `<${Ur(e, e.type)}> ${t}`,
      n,
      i
    ), Mn.clearMarks(n), Mn.clearMarks(i);
  }
  S.NODE_ENV !== "production" && Gh(e, t, fr() ? Mn.now() : Date.now());
}
function fr() {
  return Ki !== void 0 || (typeof window < "u" && window.performance ? (Ki = !0, Mn = window.performance) : Ki = !1), Ki;
}
function Fv() {
  const e = [];
  if (S.NODE_ENV !== "production" && e.length) {
    const t = e.length > 1;
    console.warn(
      `Feature flag${t ? "s" : ""} ${e.join(", ")} ${t ? "are" : "is"} not explicitly defined. You are running the esm-bundler build of Vue, which expects these compile-time feature flags to be globally injected via the bundler config in order to get better tree-shaking in the production bundle.

For more details, see https://link.vuejs.org/feature-flags.`
    );
  }
}
const xt = Zv;
function Bv(e) {
  return Rv(e);
}
function Rv(e, t) {
  Fv();
  const n = Co();
  n.__VUE__ = !0, S.NODE_ENV !== "production" && Wc(n.__VUE_DEVTOOLS_GLOBAL_HOOK__, n);
  const {
    insert: i,
    remove: o,
    patchProp: r,
    createElement: s,
    createText: a,
    createComment: l,
    setText: c,
    setElementText: d,
    parentNode: u,
    nextSibling: m,
    setScopeId: g = rt,
    insertStaticContent: h
  } = e, v = (p, b, I, U = null, H = null, j = null, Y = void 0, q = null, K = S.NODE_ENV !== "production" && Kt ? !1 : !!b.dynamicChildren) => {
    if (p === b)
      return;
    p && !li(p, b) && (U = De(p), Te(p, H, j, !0), p = null), b.patchFlag === -2 && (K = !1, b.dynamicChildren = null);
    const { type: z, ref: ge, shapeFlag: Q } = b;
    switch (z) {
      case ki:
        _(p, b, I, U);
        break;
      case Ze:
        k(p, b, I, U);
        break;
      case Xo:
        p == null ? O(b, I, U, Y) : S.NODE_ENV !== "production" && P(p, b, I, Y);
        break;
      case fe:
        A(
          p,
          b,
          I,
          U,
          H,
          j,
          Y,
          q,
          K
        );
        break;
      default:
        Q & 1 ? V(
          p,
          b,
          I,
          U,
          H,
          j,
          Y,
          q,
          K
        ) : Q & 6 ? M(
          p,
          b,
          I,
          U,
          H,
          j,
          Y,
          q,
          K
        ) : Q & 64 || Q & 128 ? z.process(
          p,
          b,
          I,
          U,
          H,
          j,
          Y,
          q,
          K,
          Wt
        ) : S.NODE_ENV !== "production" && W("Invalid VNode type:", z, `(${typeof z})`);
    }
    ge != null && H && Ms(ge, p && p.ref, j, b || p, !b);
  }, _ = (p, b, I, U) => {
    if (p == null)
      i(
        b.el = a(b.children),
        I,
        U
      );
    else {
      const H = b.el = p.el;
      b.children !== p.children && c(H, b.children);
    }
  }, k = (p, b, I, U) => {
    p == null ? i(
      b.el = l(b.children || ""),
      I,
      U
    ) : b.el = p.el;
  }, O = (p, b, I, U) => {
    [p.el, p.anchor] = h(
      p.children,
      b,
      I,
      U,
      p.el,
      p.anchor
    );
  }, P = (p, b, I, U) => {
    if (b.children !== p.children) {
      const H = m(p.anchor);
      C(p), [b.el, b.anchor] = h(
        b.children,
        I,
        H,
        U
      );
    } else
      b.el = p.el, b.anchor = p.anchor;
  }, B = ({ el: p, anchor: b }, I, U) => {
    let H;
    for (; p && p !== b; )
      H = m(p), i(p, I, U), p = H;
    i(b, I, U);
  }, C = ({ el: p, anchor: b }) => {
    let I;
    for (; p && p !== b; )
      I = m(p), o(p), p = I;
    o(b);
  }, V = (p, b, I, U, H, j, Y, q, K) => {
    b.type === "svg" ? Y = "svg" : b.type === "math" && (Y = "mathml"), p == null ? F(
      b,
      I,
      U,
      H,
      j,
      Y,
      q,
      K
    ) : $(
      p,
      b,
      H,
      j,
      Y,
      q,
      K
    );
  }, F = (p, b, I, U, H, j, Y, q) => {
    let K, z;
    const { props: ge, shapeFlag: Q, transition: D, dirs: L } = p;
    if (K = p.el = s(
      p.type,
      j,
      ge && ge.is,
      ge
    ), Q & 8 ? d(K, p.children) : Q & 16 && N(
      p.children,
      K,
      null,
      U,
      H,
      fs(p, j),
      Y,
      q
    ), L && ei(p, null, U, "created"), x(K, p, p.scopeId, Y, U), ge) {
      for (const me in ge)
        me !== "value" && !to(me) && r(K, me, null, ge[me], j, U);
      "value" in ge && r(K, "value", null, ge.value, j), (z = ge.onVnodeBeforeMount) && Qt(z, U, p);
    }
    S.NODE_ENV !== "production" && (or(K, "__vnode", p, !0), or(K, "__vueParentComponent", U, !0)), L && ei(p, null, U, "beforeMount");
    const re = Hv(H, D);
    re && D.beforeEnter(K), i(K, b, I), ((z = ge && ge.onVnodeMounted) || re || L) && xt(() => {
      z && Qt(z, U, p), re && D.enter(K), L && ei(p, null, U, "mounted");
    }, H);
  }, x = (p, b, I, U, H) => {
    if (I && g(p, I), U)
      for (let j = 0; j < U.length; j++)
        g(p, U[j]);
    if (H) {
      let j = H.subTree;
      if (S.NODE_ENV !== "production" && j.patchFlag > 0 && j.patchFlag & 2048 && (j = Va(j.children) || j), b === j || Nd(j.type) && (j.ssContent === b || j.ssFallback === b)) {
        const Y = H.vnode;
        x(
          p,
          Y,
          Y.scopeId,
          Y.slotScopeIds,
          H.parent
        );
      }
    }
  }, N = (p, b, I, U, H, j, Y, q, K = 0) => {
    for (let z = K; z < p.length; z++) {
      const ge = p[z] = q ? $n(p[z]) : qt(p[z]);
      v(
        null,
        ge,
        b,
        I,
        U,
        H,
        j,
        Y,
        q
      );
    }
  }, $ = (p, b, I, U, H, j, Y) => {
    const q = b.el = p.el;
    S.NODE_ENV !== "production" && (q.__vnode = b);
    let { patchFlag: K, dynamicChildren: z, dirs: ge } = b;
    K |= p.patchFlag & 16;
    const Q = p.props || Me, D = b.props || Me;
    let L;
    if (I && ti(I, !1), (L = D.onVnodeBeforeUpdate) && Qt(L, I, b, p), ge && ei(b, p, I, "beforeUpdate"), I && ti(I, !0), S.NODE_ENV !== "production" && Kt && (K = 0, Y = !1, z = null), (Q.innerHTML && D.innerHTML == null || Q.textContent && D.textContent == null) && d(q, ""), z ? (E(
      p.dynamicChildren,
      z,
      q,
      I,
      U,
      fs(b, H),
      j
    ), S.NODE_ENV !== "production" && oo(p, b)) : Y || Se(
      p,
      b,
      q,
      null,
      I,
      U,
      fs(b, H),
      j,
      !1
    ), K > 0) {
      if (K & 16)
        w(q, Q, D, I, H);
      else if (K & 2 && Q.class !== D.class && r(q, "class", null, D.class, H), K & 4 && r(q, "style", Q.style, D.style, H), K & 8) {
        const re = b.dynamicProps;
        for (let me = 0; me < re.length; me++) {
          const ie = re[me], Ae = Q[ie], Fe = D[ie];
          (Fe !== Ae || ie === "value") && r(q, ie, Ae, Fe, H, I);
        }
      }
      K & 1 && p.children !== b.children && d(q, b.children);
    } else !Y && z == null && w(q, Q, D, I, H);
    ((L = D.onVnodeUpdated) || ge) && xt(() => {
      L && Qt(L, I, b, p), ge && ei(b, p, I, "updated");
    }, U);
  }, E = (p, b, I, U, H, j, Y) => {
    for (let q = 0; q < b.length; q++) {
      const K = p[q], z = b[q], ge = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        K.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (K.type === fe || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !li(K, z) || // - In the case of a component, it could contain anything.
        K.shapeFlag & 70) ? u(K.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          I
        )
      );
      v(
        K,
        z,
        ge,
        null,
        U,
        H,
        j,
        Y,
        !0
      );
    }
  }, w = (p, b, I, U, H) => {
    if (b !== I) {
      if (b !== Me)
        for (const j in b)
          !to(j) && !(j in I) && r(
            p,
            j,
            b[j],
            null,
            H,
            U
          );
      for (const j in I) {
        if (to(j)) continue;
        const Y = I[j], q = b[j];
        Y !== q && j !== "value" && r(p, j, q, Y, H, U);
      }
      "value" in I && r(p, "value", b.value, I.value, H);
    }
  }, A = (p, b, I, U, H, j, Y, q, K) => {
    const z = b.el = p ? p.el : a(""), ge = b.anchor = p ? p.anchor : a("");
    let { patchFlag: Q, dynamicChildren: D, slotScopeIds: L } = b;
    S.NODE_ENV !== "production" && // #5523 dev root fragment may inherit directives
    (Kt || Q & 2048) && (Q = 0, K = !1, D = null), L && (q = q ? q.concat(L) : L), p == null ? (i(z, I, U), i(ge, I, U), N(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      b.children || [],
      I,
      ge,
      H,
      j,
      Y,
      q,
      K
    )) : Q > 0 && Q & 64 && D && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    p.dynamicChildren ? (E(
      p.dynamicChildren,
      D,
      I,
      H,
      j,
      Y,
      q
    ), S.NODE_ENV !== "production" ? oo(p, b) : (
      // #2080 if the stable fragment has a key, it's a <template v-for> that may
      //  get moved around. Make sure all root level vnodes inherit el.
      // #2134 or if it's a component root, it may also get moved around
      // as the component is being moved.
      (b.key != null || H && b === H.subTree) && oo(
        p,
        b,
        !0
        /* shallow */
      )
    )) : Se(
      p,
      b,
      I,
      ge,
      H,
      j,
      Y,
      q,
      K
    );
  }, M = (p, b, I, U, H, j, Y, q, K) => {
    b.slotScopeIds = q, p == null ? b.shapeFlag & 512 ? H.ctx.activate(
      b,
      I,
      U,
      Y,
      K
    ) : ee(
      b,
      I,
      U,
      H,
      j,
      Y,
      K
    ) : oe(p, b, K);
  }, ee = (p, b, I, U, H, j, Y) => {
    const q = p.component = og(
      p,
      U,
      H
    );
    if (S.NODE_ENV !== "production" && q.type.__hmrId && Fh(q), S.NODE_ENV !== "production" && (qo(p), pn(q, "mount")), Vo(p) && (q.ctx.renderer = Wt), S.NODE_ENV !== "production" && pn(q, "init"), sg(q, !1, Y), S.NODE_ENV !== "production" && yn(q, "init"), q.asyncDep) {
      if (S.NODE_ENV !== "production" && Kt && (p.el = null), H && H.registerDep(q, ne, Y), !p.el) {
        const K = q.subTree = f(Ze);
        k(null, K, b, I);
      }
    } else
      ne(
        q,
        p,
        b,
        I,
        H,
        j,
        Y
      );
    S.NODE_ENV !== "production" && (Ko(), yn(q, "mount"));
  }, oe = (p, b, I) => {
    const U = b.component = p.component;
    if (Xv(p, b, I))
      if (U.asyncDep && !U.asyncResolved) {
        S.NODE_ENV !== "production" && qo(b), G(U, b, I), S.NODE_ENV !== "production" && Ko();
        return;
      } else
        U.next = b, U.update();
    else
      b.el = p.el, U.vnode = b;
  }, ne = (p, b, I, U, H, j, Y) => {
    const q = () => {
      if (p.isMounted) {
        let { next: Q, bu: D, u: L, parent: re, vnode: me } = p;
        {
          const Ye = kd(p);
          if (Ye) {
            Q && (Q.el = me.el, G(p, Q, Y)), Ye.asyncDep.then(() => {
              p.isUnmounted || q();
            });
            return;
          }
        }
        let ie = Q, Ae;
        S.NODE_ENV !== "production" && qo(Q || p.vnode), ti(p, !1), Q ? (Q.el = me.el, G(p, Q, Y)) : Q = me, D && Oi(D), (Ae = Q.props && Q.props.onVnodeBeforeUpdate) && Qt(Ae, re, Q, me), ti(p, !0), S.NODE_ENV !== "production" && pn(p, "render");
        const Fe = ms(p);
        S.NODE_ENV !== "production" && yn(p, "render");
        const et = p.subTree;
        p.subTree = Fe, S.NODE_ENV !== "production" && pn(p, "patch"), v(
          et,
          Fe,
          // parent may have changed if it's in a teleport
          u(et.el),
          // anchor may have changed if it's in a fragment
          De(et),
          p,
          H,
          j
        ), S.NODE_ENV !== "production" && yn(p, "patch"), Q.el = Fe.el, ie === null && Jv(p, Fe.el), L && xt(L, H), (Ae = Q.props && Q.props.onVnodeUpdated) && xt(
          () => Qt(Ae, re, Q, me),
          H
        ), S.NODE_ENV !== "production" && qc(p), S.NODE_ENV !== "production" && Ko();
      } else {
        let Q;
        const { el: D, props: L } = b, { bm: re, m: me, parent: ie, root: Ae, type: Fe } = p, et = Mi(b);
        if (ti(p, !1), re && Oi(re), !et && (Q = L && L.onVnodeBeforeMount) && Qt(Q, ie, b), ti(p, !0), D && hn) {
          const Ye = () => {
            S.NODE_ENV !== "production" && pn(p, "render"), p.subTree = ms(p), S.NODE_ENV !== "production" && yn(p, "render"), S.NODE_ENV !== "production" && pn(p, "hydrate"), hn(
              D,
              p.subTree,
              p,
              H,
              null
            ), S.NODE_ENV !== "production" && yn(p, "hydrate");
          };
          et && Fe.__asyncHydrate ? Fe.__asyncHydrate(
            D,
            p,
            Ye
          ) : Ye();
        } else {
          Ae.ce && Ae.ce._injectChildStyle(Fe), S.NODE_ENV !== "production" && pn(p, "render");
          const Ye = p.subTree = ms(p);
          S.NODE_ENV !== "production" && yn(p, "render"), S.NODE_ENV !== "production" && pn(p, "patch"), v(
            null,
            Ye,
            I,
            U,
            p,
            H,
            j
          ), S.NODE_ENV !== "production" && yn(p, "patch"), b.el = Ye.el;
        }
        if (me && xt(me, H), !et && (Q = L && L.onVnodeMounted)) {
          const Ye = b;
          xt(
            () => Qt(Q, ie, Ye),
            H
          );
        }
        (b.shapeFlag & 256 || ie && Mi(ie.vnode) && ie.vnode.shapeFlag & 256) && p.a && xt(p.a, H), p.isMounted = !0, S.NODE_ENV !== "production" && Uh(p), b = I = U = null;
      }
    };
    p.scope.on();
    const K = p.effect = new yc(q);
    p.scope.off();
    const z = p.update = K.run.bind(K), ge = p.job = K.runIfDirty.bind(K);
    ge.i = p, ge.id = p.uid, K.scheduler = () => Br(ge), ti(p, !0), S.NODE_ENV !== "production" && (K.onTrack = p.rtc ? (Q) => Oi(p.rtc, Q) : void 0, K.onTrigger = p.rtg ? (Q) => Oi(p.rtg, Q) : void 0), z();
  }, G = (p, b, I) => {
    b.component = p;
    const U = p.vnode.props;
    p.vnode = b, p.next = null, Nv(p, b.props, U, I), Lv(p, b.children, I), En(), _l(p), xn();
  }, Se = (p, b, I, U, H, j, Y, q, K = !1) => {
    const z = p && p.children, ge = p ? p.shapeFlag : 0, Q = b.children, { patchFlag: D, shapeFlag: L } = b;
    if (D > 0) {
      if (D & 128) {
        we(
          z,
          Q,
          I,
          U,
          H,
          j,
          Y,
          q,
          K
        );
        return;
      } else if (D & 256) {
        xe(
          z,
          Q,
          I,
          U,
          H,
          j,
          Y,
          q,
          K
        );
        return;
      }
    }
    L & 8 ? (ge & 16 && ye(z, H, j), Q !== z && d(I, Q)) : ge & 16 ? L & 16 ? we(
      z,
      Q,
      I,
      U,
      H,
      j,
      Y,
      q,
      K
    ) : ye(z, H, j, !0) : (ge & 8 && d(I, ""), L & 16 && N(
      Q,
      I,
      U,
      H,
      j,
      Y,
      q,
      K
    ));
  }, xe = (p, b, I, U, H, j, Y, q, K) => {
    p = p || Pi, b = b || Pi;
    const z = p.length, ge = b.length, Q = Math.min(z, ge);
    let D;
    for (D = 0; D < Q; D++) {
      const L = b[D] = K ? $n(b[D]) : qt(b[D]);
      v(
        p[D],
        L,
        I,
        null,
        H,
        j,
        Y,
        q,
        K
      );
    }
    z > ge ? ye(
      p,
      H,
      j,
      !0,
      !1,
      Q
    ) : N(
      b,
      I,
      U,
      H,
      j,
      Y,
      q,
      K,
      Q
    );
  }, we = (p, b, I, U, H, j, Y, q, K) => {
    let z = 0;
    const ge = b.length;
    let Q = p.length - 1, D = ge - 1;
    for (; z <= Q && z <= D; ) {
      const L = p[z], re = b[z] = K ? $n(b[z]) : qt(b[z]);
      if (li(L, re))
        v(
          L,
          re,
          I,
          null,
          H,
          j,
          Y,
          q,
          K
        );
      else
        break;
      z++;
    }
    for (; z <= Q && z <= D; ) {
      const L = p[Q], re = b[D] = K ? $n(b[D]) : qt(b[D]);
      if (li(L, re))
        v(
          L,
          re,
          I,
          null,
          H,
          j,
          Y,
          q,
          K
        );
      else
        break;
      Q--, D--;
    }
    if (z > Q) {
      if (z <= D) {
        const L = D + 1, re = L < ge ? b[L].el : U;
        for (; z <= D; )
          v(
            null,
            b[z] = K ? $n(b[z]) : qt(b[z]),
            I,
            re,
            H,
            j,
            Y,
            q,
            K
          ), z++;
      }
    } else if (z > D)
      for (; z <= Q; )
        Te(p[z], H, j, !0), z++;
    else {
      const L = z, re = z, me = /* @__PURE__ */ new Map();
      for (z = re; z <= D; z++) {
        const ut = b[z] = K ? $n(b[z]) : qt(b[z]);
        ut.key != null && (S.NODE_ENV !== "production" && me.has(ut.key) && W(
          "Duplicate keys found during update:",
          JSON.stringify(ut.key),
          "Make sure keys are unique."
        ), me.set(ut.key, z));
      }
      let ie, Ae = 0;
      const Fe = D - re + 1;
      let et = !1, Ye = 0;
      const Lt = new Array(Fe);
      for (z = 0; z < Fe; z++) Lt[z] = 0;
      for (z = L; z <= Q; z++) {
        const ut = p[z];
        if (Ae >= Fe) {
          Te(ut, H, j, !0);
          continue;
        }
        let yt;
        if (ut.key != null)
          yt = me.get(ut.key);
        else
          for (ie = re; ie <= D; ie++)
            if (Lt[ie - re] === 0 && li(ut, b[ie])) {
              yt = ie;
              break;
            }
        yt === void 0 ? Te(ut, H, j, !0) : (Lt[yt - re] = z + 1, yt >= Ye ? Ye = yt : et = !0, v(
          ut,
          b[yt],
          I,
          null,
          H,
          j,
          Y,
          q,
          K
        ), Ae++);
      }
      const Zn = et ? jv(Lt) : Pi;
      for (ie = Zn.length - 1, z = Fe - 1; z >= 0; z--) {
        const ut = re + z, yt = b[ut], Wi = ut + 1 < ge ? b[ut + 1].el : U;
        Lt[z] === 0 ? v(
          null,
          yt,
          I,
          Wi,
          H,
          j,
          Y,
          q,
          K
        ) : et && (ie < 0 || z !== Zn[ie] ? de(yt, I, Wi, 2) : ie--);
      }
    }
  }, de = (p, b, I, U, H = null) => {
    const { el: j, type: Y, transition: q, children: K, shapeFlag: z } = p;
    if (z & 6) {
      de(p.component.subTree, b, I, U);
      return;
    }
    if (z & 128) {
      p.suspense.move(b, I, U);
      return;
    }
    if (z & 64) {
      Y.move(p, b, I, Wt);
      return;
    }
    if (Y === fe) {
      i(j, b, I);
      for (let Q = 0; Q < K.length; Q++)
        de(K[Q], b, I, U);
      i(p.anchor, b, I);
      return;
    }
    if (Y === Xo) {
      B(p, b, I);
      return;
    }
    if (U !== 2 && z & 1 && q)
      if (U === 0)
        q.beforeEnter(j), i(j, b, I), xt(() => q.enter(j), H);
      else {
        const { leave: Q, delayLeave: D, afterLeave: L } = q, re = () => i(j, b, I), me = () => {
          Q(j, () => {
            re(), L && L();
          });
        };
        D ? D(j, re, me) : me();
      }
    else
      i(j, b, I);
  }, Te = (p, b, I, U = !1, H = !1) => {
    const {
      type: j,
      props: Y,
      ref: q,
      children: K,
      dynamicChildren: z,
      shapeFlag: ge,
      patchFlag: Q,
      dirs: D,
      cacheIndex: L
    } = p;
    if (Q === -2 && (H = !1), q != null && Ms(q, null, I, p, !0), L != null && (b.renderCache[L] = void 0), ge & 256) {
      b.ctx.deactivate(p);
      return;
    }
    const re = ge & 1 && D, me = !Mi(p);
    let ie;
    if (me && (ie = Y && Y.onVnodeBeforeUnmount) && Qt(ie, b, p), ge & 6)
      Z(p.component, I, U);
    else {
      if (ge & 128) {
        p.suspense.unmount(I, U);
        return;
      }
      re && ei(p, null, b, "beforeUnmount"), ge & 64 ? p.type.remove(
        p,
        b,
        I,
        Wt,
        U
      ) : z && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !z.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (j !== fe || Q > 0 && Q & 64) ? ye(
        z,
        b,
        I,
        !1,
        !0
      ) : (j === fe && Q & 384 || !H && ge & 16) && ye(K, b, I), U && Je(p);
    }
    (me && (ie = Y && Y.onVnodeUnmounted) || re) && xt(() => {
      ie && Qt(ie, b, p), re && ei(p, null, b, "unmounted");
    }, I);
  }, Je = (p) => {
    const { type: b, el: I, anchor: U, transition: H } = p;
    if (b === fe) {
      S.NODE_ENV !== "production" && p.patchFlag > 0 && p.patchFlag & 2048 && H && !H.persisted ? p.children.forEach((Y) => {
        Y.type === Ze ? o(Y.el) : Je(Y);
      }) : Ge(I, U);
      return;
    }
    if (b === Xo) {
      C(p);
      return;
    }
    const j = () => {
      o(I), H && !H.persisted && H.afterLeave && H.afterLeave();
    };
    if (p.shapeFlag & 1 && H && !H.persisted) {
      const { leave: Y, delayLeave: q } = H, K = () => Y(I, j);
      q ? q(p.el, j, K) : K();
    } else
      j();
  }, Ge = (p, b) => {
    let I;
    for (; p !== b; )
      I = m(p), o(p), p = I;
    o(b);
  }, Z = (p, b, I) => {
    S.NODE_ENV !== "production" && p.type.__hmrId && Bh(p);
    const { bum: U, scope: H, job: j, subTree: Y, um: q, m: K, a: z } = p;
    Dl(K), Dl(z), U && Oi(U), H.stop(), j && (j.flags |= 8, Te(Y, p, b, I)), q && xt(q, b), xt(() => {
      p.isUnmounted = !0;
    }, b), b && b.pendingBranch && !b.isUnmounted && p.asyncDep && !p.asyncResolved && p.suspenseId === b.pendingId && (b.deps--, b.deps === 0 && b.resolve()), S.NODE_ENV !== "production" && qh(p);
  }, ye = (p, b, I, U = !1, H = !1, j = 0) => {
    for (let Y = j; Y < p.length; Y++)
      Te(p[Y], b, I, U, H);
  }, De = (p) => {
    if (p.shapeFlag & 6)
      return De(p.component.subTree);
    if (p.shapeFlag & 128)
      return p.suspense.next();
    const b = m(p.anchor || p.el), I = b && b[Xc];
    return I ? m(I) : b;
  };
  let lt = !1;
  const We = (p, b, I) => {
    p == null ? b._vnode && Te(b._vnode, null, null, !0) : v(
      b._vnode || null,
      p,
      b,
      null,
      null,
      null,
      I
    ), b._vnode = p, lt || (lt = !0, _l(), jc(), lt = !1);
  }, Wt = {
    p: v,
    um: Te,
    m: de,
    r: Je,
    mt: ee,
    mc: N,
    pc: Se,
    pbc: E,
    n: De,
    o: e
  };
  let Tn, hn;
  return {
    render: We,
    hydrate: Tn,
    createApp: Cv(We, Tn)
  };
}
function fs({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function ti({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Hv(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function oo(e, t, n = !1) {
  const i = e.children, o = t.children;
  if (ue(i) && ue(o))
    for (let r = 0; r < i.length; r++) {
      const s = i[r];
      let a = o[r];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = o[r] = $n(o[r]), a.el = s.el), !n && a.patchFlag !== -2 && oo(s, a)), a.type === ki && (a.el = s.el), S.NODE_ENV !== "production" && a.type === Ze && !a.el && (a.el = s.el);
    }
}
function jv(e) {
  const t = e.slice(), n = [0];
  let i, o, r, s, a;
  const l = e.length;
  for (i = 0; i < l; i++) {
    const c = e[i];
    if (c !== 0) {
      if (o = n[n.length - 1], e[o] < c) {
        t[i] = o, n.push(i);
        continue;
      }
      for (r = 0, s = n.length - 1; r < s; )
        a = r + s >> 1, e[n[a]] < c ? r = a + 1 : s = a;
      c < e[n[r]] && (r > 0 && (t[i] = n[r - 1]), n[r] = i);
    }
  }
  for (r = n.length, s = n[r - 1]; r-- > 0; )
    n[r] = s, s = t[s];
  return n;
}
function kd(e) {
  const t = e.subTree.component;
  if (t)
    return t.asyncDep && !t.asyncResolved ? t : kd(t);
}
function Dl(e) {
  if (e)
    for (let t = 0; t < e.length; t++)
      e[t].flags |= 8;
}
const zv = Symbol.for("v-scx"), Uv = () => {
  {
    const e = He(zv);
    return e || S.NODE_ENV !== "production" && W(
      "Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build."
    ), e;
  }
};
function Jt(e, t) {
  return Na(e, null, t);
}
function be(e, t, n) {
  return S.NODE_ENV !== "production" && !pe(t) && W(
    "`watch(fn, options?)` signature has been moved to a separate API. Use `watchEffect(fn, options?)` instead. `watch` now only supports `watch(source, cb, options?) signature."
  ), Na(e, t, n);
}
function Na(e, t, n = Me) {
  const { immediate: i, deep: o, flush: r, once: s } = n;
  S.NODE_ENV !== "production" && !t && (i !== void 0 && W(
    'watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.'
  ), o !== void 0 && W(
    'watch() "deep" option is only respected when using the watch(source, callback, options?) signature.'
  ), s !== void 0 && W(
    'watch() "once" option is only respected when using the watch(source, callback, options?) signature.'
  ));
  const a = Ue({}, n);
  S.NODE_ENV !== "production" && (a.onWarn = W);
  const l = t && i || !t && r !== "post";
  let c;
  if (ho) {
    if (r === "sync") {
      const g = Uv();
      c = g.__watcherHandles || (g.__watcherHandles = []);
    } else if (!l) {
      const g = () => {
      };
      return g.stop = rt, g.resume = rt, g.pause = rt, g;
    }
  }
  const d = st;
  a.call = (g, h, v) => Xt(g, d, h, v);
  let u = !1;
  r === "post" ? a.scheduler = (g) => {
    xt(g, d && d.suspense);
  } : r !== "sync" && (u = !0, a.scheduler = (g, h) => {
    h ? g() : Br(g);
  }), a.augmentJob = (g) => {
    t && (g.flags |= 4), u && (g.flags |= 2, d && (g.id = d.uid, g.i = d));
  };
  const m = Oh(e, t, a);
  return ho && (c ? c.push(m) : l && m()), m;
}
function Wv(e, t, n) {
  const i = this.proxy, o = je(e) ? e.includes(".") ? Cd(i, e) : () => i[e] : e.bind(i, i);
  let r;
  pe(t) ? r = t : (r = t.handler, n = t);
  const s = Oo(this), a = Na(o, r.bind(i), n);
  return s(), a;
}
function Cd(e, t) {
  const n = t.split(".");
  return () => {
    let i = e;
    for (let o = 0; o < n.length && i; o++)
      i = i[n[o]];
    return i;
  };
}
const qv = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${dt(t)}Modifiers`] || e[`${jn(t)}Modifiers`];
function Kv(e, t, ...n) {
  if (e.isUnmounted) return;
  const i = e.vnode.props || Me;
  if (S.NODE_ENV !== "production") {
    const {
      emitsOptions: d,
      propsOptions: [u]
    } = e;
    if (d)
      if (!(t in d))
        (!u || !(ri(dt(t)) in u)) && W(
          `Component emitted event "${t}" but it is neither declared in the emits option nor as an "${ri(dt(t))}" prop.`
        );
      else {
        const m = d[t];
        pe(m) && (m(...n) || W(
          `Invalid event arguments: event validation failed for event "${t}".`
        ));
      }
  }
  let o = n;
  const r = t.startsWith("update:"), s = r && qv(i, t.slice(7));
  if (s && (s.trim && (o = n.map((d) => je(d) ? d.trim() : d)), s.number && (o = n.map(rr))), S.NODE_ENV !== "production" && Yh(e, t, o), S.NODE_ENV !== "production") {
    const d = t.toLowerCase();
    d !== t && i[ri(d)] && W(
      `Event "${d}" is emitted in component ${Ur(
        e,
        e.type
      )} but the handler is registered for "${t}". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "${jn(
        t
      )}" instead of "${t}".`
    );
  }
  let a, l = i[a = ri(t)] || // also try camelCase event handler (#2249)
  i[a = ri(dt(t))];
  !l && r && (l = i[a = ri(jn(t))]), l && Xt(
    l,
    e,
    6,
    o
  );
  const c = i[a + "Once"];
  if (c) {
    if (!e.emitted)
      e.emitted = {};
    else if (e.emitted[a])
      return;
    e.emitted[a] = !0, Xt(
      c,
      e,
      6,
      o
    );
  }
}
function Ed(e, t, n = !1) {
  const i = t.emitsCache, o = i.get(e);
  if (o !== void 0)
    return o;
  const r = e.emits;
  let s = {}, a = !1;
  if (!pe(e)) {
    const l = (c) => {
      const d = Ed(c, t, !0);
      d && (a = !0, Ue(s, d));
    };
    !n && t.mixins.length && t.mixins.forEach(l), e.extends && l(e.extends), e.mixins && e.mixins.forEach(l);
  }
  return !r && !a ? (Pe(e) && i.set(e, null), null) : (ue(r) ? r.forEach((l) => s[l] = null) : Ue(s, r), Pe(e) && i.set(e, s), s);
}
function Hr(e, t) {
  return !e || !So(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), Ie(e, t[0].toLowerCase() + t.slice(1)) || Ie(e, jn(t)) || Ie(e, t));
}
let zs = !1;
function mr() {
  zs = !0;
}
function ms(e) {
  const {
    type: t,
    vnode: n,
    proxy: i,
    withProxy: o,
    propsOptions: [r],
    slots: s,
    attrs: a,
    emit: l,
    render: c,
    renderCache: d,
    props: u,
    data: m,
    setupState: g,
    ctx: h,
    inheritAttrs: v
  } = e, _ = cr(e);
  let k, O;
  S.NODE_ENV !== "production" && (zs = !1);
  try {
    if (n.shapeFlag & 4) {
      const C = o || i, V = S.NODE_ENV !== "production" && g.__isScriptSetup ? new Proxy(C, {
        get(F, x, N) {
          return W(
            `Property '${String(
              x
            )}' was accessed via 'this'. Avoid using 'this' in templates.`
          ), Reflect.get(F, x, N);
        }
      }) : C;
      k = qt(
        c.call(
          V,
          C,
          d,
          S.NODE_ENV !== "production" ? on(u) : u,
          g,
          m,
          h
        )
      ), O = a;
    } else {
      const C = t;
      S.NODE_ENV !== "production" && a === u && mr(), k = qt(
        C.length > 1 ? C(
          S.NODE_ENV !== "production" ? on(u) : u,
          S.NODE_ENV !== "production" ? {
            get attrs() {
              return mr(), on(a);
            },
            slots: s,
            emit: l
          } : { attrs: a, slots: s, emit: l }
        ) : C(
          S.NODE_ENV !== "production" ? on(u) : u,
          null
        )
      ), O = t.props ? a : Gv(a);
    }
  } catch (C) {
    ro.length = 0, xo(C, e, 1), k = f(Ze);
  }
  let P = k, B;
  if (S.NODE_ENV !== "production" && k.patchFlag > 0 && k.patchFlag & 2048 && ([P, B] = xd(k)), O && v !== !1) {
    const C = Object.keys(O), { shapeFlag: V } = P;
    if (C.length) {
      if (V & 7)
        r && C.some(ir) && (O = Yv(
          O,
          r
        )), P = ln(P, O, !1, !0);
      else if (S.NODE_ENV !== "production" && !zs && P.type !== Ze) {
        const F = Object.keys(a), x = [], N = [];
        for (let $ = 0, E = F.length; $ < E; $++) {
          const w = F[$];
          So(w) ? ir(w) || x.push(w[2].toLowerCase() + w.slice(3)) : N.push(w);
        }
        N.length && W(
          `Extraneous non-props attributes (${N.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes.`
        ), x.length && W(
          `Extraneous non-emits event listeners (${x.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.`
        );
      }
    }
  }
  return n.dirs && (S.NODE_ENV !== "production" && !Il(P) && W(
    "Runtime directive used on component with non-element root node. The directives will not function as intended."
  ), P = ln(P, null, !1, !0), P.dirs = P.dirs ? P.dirs.concat(n.dirs) : n.dirs), n.transition && (S.NODE_ENV !== "production" && !Il(P) && W(
    "Component inside <Transition> renders non-element root node that cannot be animated."
  ), _i(P, n.transition)), S.NODE_ENV !== "production" && B ? B(P) : k = P, cr(_), k;
}
const xd = (e) => {
  const t = e.children, n = e.dynamicChildren, i = Va(t, !1);
  if (i) {
    if (S.NODE_ENV !== "production" && i.patchFlag > 0 && i.patchFlag & 2048)
      return xd(i);
  } else return [e, void 0];
  const o = t.indexOf(i), r = n ? n.indexOf(i) : -1, s = (a) => {
    t[o] = a, n && (r > -1 ? n[r] = a : a.patchFlag > 0 && (e.dynamicChildren = [...n, a]));
  };
  return [qt(i), s];
};
function Va(e, t = !0) {
  let n;
  for (let i = 0; i < e.length; i++) {
    const o = e[i];
    if (bi(o)) {
      if (o.type !== Ze || o.children === "v-if") {
        if (n)
          return;
        if (n = o, S.NODE_ENV !== "production" && t && n.patchFlag > 0 && n.patchFlag & 2048)
          return Va(n.children);
      }
    } else
      return;
  }
  return n;
}
const Gv = (e) => {
  let t;
  for (const n in e)
    (n === "class" || n === "style" || So(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, Yv = (e, t) => {
  const n = {};
  for (const i in e)
    (!ir(i) || !(i.slice(9) in t)) && (n[i] = e[i]);
  return n;
}, Il = (e) => e.shapeFlag & 7 || e.type === Ze;
function Xv(e, t, n) {
  const { props: i, children: o, component: r } = e, { props: s, children: a, patchFlag: l } = t, c = r.emitsOptions;
  if (S.NODE_ENV !== "production" && (o || a) && Kt || t.dirs || t.transition)
    return !0;
  if (n && l >= 0) {
    if (l & 1024)
      return !0;
    if (l & 16)
      return i ? Pl(i, s, c) : !!s;
    if (l & 8) {
      const d = t.dynamicProps;
      for (let u = 0; u < d.length; u++) {
        const m = d[u];
        if (s[m] !== i[m] && !Hr(c, m))
          return !0;
      }
    }
  } else
    return (o || a) && (!a || !a.$stable) ? !0 : i === s ? !1 : i ? s ? Pl(i, s, c) : !0 : !!s;
  return !1;
}
function Pl(e, t, n) {
  const i = Object.keys(t);
  if (i.length !== Object.keys(e).length)
    return !0;
  for (let o = 0; o < i.length; o++) {
    const r = i[o];
    if (t[r] !== e[r] && !Hr(n, r))
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
const Nd = (e) => e.__isSuspense;
function Zv(e, t) {
  t && t.pendingBranch ? ue(e) ? t.effects.push(...e) : t.effects.push(e) : Hc(e);
}
const fe = Symbol.for("v-fgt"), ki = Symbol.for("v-txt"), Ze = Symbol.for("v-cmt"), Xo = Symbol.for("v-stc"), ro = [];
let Ot = null;
function X(e = !1) {
  ro.push(Ot = e ? null : []);
}
function Qv() {
  ro.pop(), Ot = ro[ro.length - 1] || null;
}
let mo = 1;
function $l(e) {
  mo += e, e < 0 && Ot && (Ot.hasOnce = !0);
}
function Vd(e) {
  return e.dynamicChildren = mo > 0 ? Ot || Pi : null, Qv(), mo > 0 && Ot && Ot.push(e), e;
}
function ce(e, t, n, i, o, r) {
  return Vd(
    R(
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
function Ke(e, t, n, i, o) {
  return Vd(
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
function bi(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function li(e, t) {
  if (S.NODE_ENV !== "production" && t.shapeFlag & 6 && e.component) {
    const n = Go.get(t.type);
    if (n && n.has(e.component))
      return e.shapeFlag &= -257, t.shapeFlag &= -513, !1;
  }
  return e.type === t.type && e.key === t.key;
}
const eg = (...e) => Td(
  ...e
), Od = ({ key: e }) => e ?? null, Jo = ({
  ref: e,
  ref_key: t,
  ref_for: n
}) => (typeof e == "number" && (e = "" + e), e != null ? je(e) || Be(e) || pe(e) ? { i: tt, r: e, k: t, f: !!n } : e : null);
function R(e, t = null, n = null, i = 0, o = null, r = e === fe ? 0 : 1, s = !1, a = !1) {
  const l = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && Od(t),
    ref: t && Jo(t),
    scopeId: Gc,
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
    ctx: tt
  };
  return a ? (Oa(l, n), r & 128 && e.normalize(l)) : n && (l.shapeFlag |= je(n) ? 8 : 16), S.NODE_ENV !== "production" && l.key !== l.key && W("VNode created with invalid key (NaN). VNode type:", l.type), mo > 0 && // avoid a block node from tracking itself
  !s && // has current parent block
  Ot && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (l.patchFlag > 0 || r & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  l.patchFlag !== 32 && Ot.push(l), l;
}
const f = S.NODE_ENV !== "production" ? eg : Td;
function Td(e, t = null, n = null, i = 0, o = null, r = !1) {
  if ((!e || e === dv) && (S.NODE_ENV !== "production" && !e && W(`Invalid vnode type when creating vnode: ${e}.`), e = Ze), bi(e)) {
    const a = ln(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return n && Oa(a, n), mo > 0 && !r && Ot && (a.shapeFlag & 6 ? Ot[Ot.indexOf(e)] = a : Ot.push(a)), a.patchFlag = -2, a;
  }
  if (Pd(e) && (e = e.__vccOpts), t) {
    t = tg(t);
    let { class: a, style: l } = t;
    a && !je(a) && (t.class = Vt(a)), Pe(l) && (uo(l) && !ue(l) && (l = Ue({}, l)), t.style = Rt(l));
  }
  const s = je(e) ? 1 : Nd(e) ? 128 : Jc(e) ? 64 : Pe(e) ? 4 : pe(e) ? 2 : 0;
  return S.NODE_ENV !== "production" && s & 4 && uo(e) && (e = ae(e), W(
    "Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with `markRaw` or using `shallowRef` instead of `ref`.",
    `
Component that was made reactive: `,
    e
  )), R(
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
function tg(e) {
  return e ? uo(e) || gd(e) ? Ue({}, e) : e : null;
}
function ln(e, t, n = !1, i = !1) {
  const { props: o, ref: r, patchFlag: s, children: a, transition: l } = e, c = t ? Oe(o || {}, t) : o, d = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: c,
    key: c && Od(c),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      n && r ? ue(r) ? r.concat(Jo(t)) : [r, Jo(t)] : Jo(t)
    ) : r,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: S.NODE_ENV !== "production" && s === -1 && ue(a) ? a.map(Ad) : a,
    target: e.target,
    targetStart: e.targetStart,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: t && e.type !== fe ? s === -1 ? 16 : s | 16 : s,
    dynamicProps: e.dynamicProps,
    dynamicChildren: e.dynamicChildren,
    appContext: e.appContext,
    dirs: e.dirs,
    transition: l,
    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: e.component,
    suspense: e.suspense,
    ssContent: e.ssContent && ln(e.ssContent),
    ssFallback: e.ssFallback && ln(e.ssFallback),
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return l && i && _i(
    d,
    l.clone(d)
  ), d;
}
function Ad(e) {
  const t = ln(e);
  return ue(e.children) && (t.children = e.children.map(Ad)), t;
}
function te(e = " ", t = 0) {
  return f(ki, null, e, t);
}
function Re(e = "", t = !1) {
  return t ? (X(), Ke(Ze, null, e)) : f(Ze, null, e);
}
function qt(e) {
  return e == null || typeof e == "boolean" ? f(Ze) : ue(e) ? f(
    fe,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : bi(e) ? $n(e) : f(ki, null, String(e));
}
function $n(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : ln(e);
}
function Oa(e, t) {
  let n = 0;
  const { shapeFlag: i } = e;
  if (t == null)
    t = null;
  else if (ue(t))
    n = 16;
  else if (typeof t == "object")
    if (i & 65) {
      const o = t.default;
      o && (o._c && (o._d = !1), Oa(e, o()), o._c && (o._d = !0));
      return;
    } else {
      n = 32;
      const o = t._;
      !o && !gd(t) ? t._ctx = tt : o === 3 && tt && (tt.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else pe(t) ? (t = { default: t, _ctx: tt }, n = 32) : (t = String(t), i & 64 ? (n = 16, t = [te(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function Oe(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const i = e[n];
    for (const o in i)
      if (o === "class")
        t.class !== i.class && (t.class = Vt([t.class, i.class]));
      else if (o === "style")
        t.style = Rt([t.style, i.style]);
      else if (So(o)) {
        const r = t[o], s = i[o];
        s && r !== s && !(ue(r) && r.includes(s)) && (t[o] = r ? [].concat(r, s) : s);
      } else o !== "" && (t[o] = i[o]);
  }
  return t;
}
function Qt(e, t, n, i = null) {
  Xt(e, t, 7, [
    n,
    i
  ]);
}
const ng = md();
let ig = 0;
function og(e, t, n) {
  const i = e.type, o = (t ? t.appContext : e.appContext) || ng, r = {
    uid: ig++,
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
    scope: new pc(
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
    propsOptions: yd(i, o),
    emitsOptions: Ed(i, o),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: Me,
    // inheritAttrs
    inheritAttrs: i.inheritAttrs,
    // state
    ctx: Me,
    data: Me,
    props: Me,
    attrs: Me,
    slots: Me,
    refs: Me,
    setupState: Me,
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
  return S.NODE_ENV !== "production" ? r.ctx = hv(r) : r.ctx = { _: r }, r.root = t ? t.root : r, r.emit = Kv.bind(null, r), e.ce && e.ce(r), r;
}
let st = null;
const jr = () => st || tt;
let hr, Us;
{
  const e = Co(), t = (n, i) => {
    let o;
    return (o = e[n]) || (o = e[n] = []), o.push(i), (r) => {
      o.length > 1 ? o.forEach((s) => s(r)) : o[0](r);
    };
  };
  hr = t(
    "__VUE_INSTANCE_SETTERS__",
    (n) => st = n
  ), Us = t(
    "__VUE_SSR_SETTERS__",
    (n) => ho = n
  );
}
const Oo = (e) => {
  const t = st;
  return hr(e), e.scope.on(), () => {
    e.scope.off(), hr(t);
  };
}, Ml = () => {
  st && st.scope.off(), hr(null);
}, rg = /* @__PURE__ */ Cn("slot,component");
function Ws(e, { isNativeTag: t }) {
  (rg(e) || t(e)) && W(
    "Do not use built-in or reserved HTML elements as component id: " + e
  );
}
function Dd(e) {
  return e.vnode.shapeFlag & 4;
}
let ho = !1;
function sg(e, t = !1, n = !1) {
  t && Us(t);
  const { props: i, children: o } = e.vnode, r = Dd(e);
  Ev(e, i, r, t), Mv(e, o, n);
  const s = r ? ag(e, t) : void 0;
  return t && Us(!1), s;
}
function ag(e, t) {
  var n;
  const i = e.type;
  if (S.NODE_ENV !== "production") {
    if (i.name && Ws(i.name, e.appContext.config), i.components) {
      const r = Object.keys(i.components);
      for (let s = 0; s < r.length; s++)
        Ws(r[s], e.appContext.config);
    }
    if (i.directives) {
      const r = Object.keys(i.directives);
      for (let s = 0; s < r.length; s++)
        Yc(r[s]);
    }
    i.compilerOptions && lg() && W(
      '"compilerOptions" is only supported when using a build of Vue that includes the runtime compiler. Since you are using a runtime-only build, the options should be passed via your build tool config instead.'
    );
  }
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, dd), S.NODE_ENV !== "production" && vv(e);
  const { setup: o } = i;
  if (o) {
    En();
    const r = e.setupContext = o.length > 1 ? cg(e) : null, s = Oo(e), a = zi(
      o,
      e,
      0,
      [
        S.NODE_ENV !== "production" ? on(e.props) : e.props,
        r
      ]
    ), l = ua(a);
    if (xn(), s(), (l || e.sp) && !Mi(e) && od(e), l) {
      if (a.then(Ml, Ml), t)
        return a.then((c) => {
          Ll(e, c, t);
        }).catch((c) => {
          xo(c, e, 0);
        });
      if (e.asyncDep = a, S.NODE_ENV !== "production" && !e.suspense) {
        const c = (n = i.name) != null ? n : "Anonymous";
        W(
          `Component <${c}>: setup function returned a promise, but no <Suspense> boundary was found in the parent component tree. A component with async setup() must be nested in a <Suspense> in order to be rendered.`
        );
      }
    } else
      Ll(e, a, t);
  } else
    Id(e, t);
}
function Ll(e, t, n) {
  pe(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Pe(t) ? (S.NODE_ENV !== "production" && bi(t) && W(
    "setup() should not return VNodes directly - return a render function instead."
  ), S.NODE_ENV !== "production" && (e.devtoolsRawSetupState = t), e.setupState = Mc(t), S.NODE_ENV !== "production" && gv(e)) : S.NODE_ENV !== "production" && t !== void 0 && W(
    `setup() should return an object. Received: ${t === null ? "null" : typeof t}`
  ), Id(e, n);
}
let qs;
const lg = () => !qs;
function Id(e, t, n) {
  const i = e.type;
  if (!e.render) {
    if (!t && qs && !i.render) {
      const o = i.template || Ea(e).template;
      if (o) {
        S.NODE_ENV !== "production" && pn(e, "compile");
        const { isCustomElement: r, compilerOptions: s } = e.appContext.config, { delimiters: a, compilerOptions: l } = i, c = Ue(
          Ue(
            {
              isCustomElement: r,
              delimiters: a
            },
            s
          ),
          l
        );
        i.render = qs(o, c), S.NODE_ENV !== "production" && yn(e, "compile");
      }
    }
    e.render = i.render || rt;
  }
  {
    const o = Oo(e);
    En();
    try {
      yv(e);
    } finally {
      xn(), o();
    }
  }
  S.NODE_ENV !== "production" && !i.render && e.render === rt && !t && (i.template ? W(
    'Component provided template option but runtime compilation is not supported in this build of Vue. Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".'
  ) : W("Component is missing template or render function: ", i));
}
const Fl = S.NODE_ENV !== "production" ? {
  get(e, t) {
    return mr(), ot(e, "get", ""), e[t];
  },
  set() {
    return W("setupContext.attrs is readonly."), !1;
  },
  deleteProperty() {
    return W("setupContext.attrs is readonly."), !1;
  }
} : {
  get(e, t) {
    return ot(e, "get", ""), e[t];
  }
};
function ug(e) {
  return new Proxy(e.slots, {
    get(t, n) {
      return ot(e, "get", "$slots"), t[n];
    }
  });
}
function cg(e) {
  const t = (n) => {
    if (S.NODE_ENV !== "production" && (e.exposed && W("expose() should be called only once per setup()."), n != null)) {
      let i = typeof n;
      i === "object" && (ue(n) ? i = "array" : Be(n) && (i = "ref")), i !== "object" && W(
        `expose() should be passed a plain object, received ${i}.`
      );
    }
    e.exposed = n || {};
  };
  if (S.NODE_ENV !== "production") {
    let n, i;
    return Object.freeze({
      get attrs() {
        return n || (n = new Proxy(e.attrs, Fl));
      },
      get slots() {
        return i || (i = ug(e));
      },
      get emit() {
        return (o, ...r) => e.emit(o, ...r);
      },
      expose: t
    });
  } else
    return {
      attrs: new Proxy(e.attrs, Fl),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
}
function zr(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Mc(Pc(e.exposed)), {
    get(t, n) {
      if (n in t)
        return t[n];
      if (n in vi)
        return vi[n](e);
    },
    has(t, n) {
      return n in t || n in vi;
    }
  })) : e.proxy;
}
const dg = /(?:^|[-_])(\w)/g, fg = (e) => e.replace(dg, (t) => t.toUpperCase()).replace(/[-_]/g, "");
function Ta(e, t = !0) {
  return pe(e) ? e.displayName || e.name : e.name || t && e.__name;
}
function Ur(e, t, n = !1) {
  let i = Ta(t);
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
  return i ? fg(i) : n ? "App" : "Anonymous";
}
function Pd(e) {
  return pe(e) && "__vccOpts" in e;
}
const y = (e, t) => {
  const n = Nh(e, t, ho);
  if (S.NODE_ENV !== "production") {
    const i = jr();
    i && i.appContext.config.warnRecursiveComputed && (n._warnRecursive = !0);
  }
  return n;
};
function Un(e, t, n) {
  const i = arguments.length;
  return i === 2 ? Pe(t) && !ue(t) ? bi(t) ? f(e, null, [t]) : f(e, t) : f(e, null, t) : (i > 3 ? n = Array.prototype.slice.call(arguments, 2) : i === 3 && bi(n) && (n = [n]), f(e, t, n));
}
function mg() {
  if (S.NODE_ENV === "production" || typeof window > "u")
    return;
  const e = { style: "color:#3ba776" }, t = { style: "color:#1677ff" }, n = { style: "color:#f5222d" }, i = { style: "color:#eb2f96" }, o = {
    __vue_custom_formatter: !0,
    header(u) {
      return Pe(u) ? u.__isVue ? ["div", e, "VueInstance"] : Be(u) ? [
        "div",
        {},
        ["span", e, d(u)],
        "<",
        // avoid debugger accessing value affecting behavior
        a("_value" in u ? u._value : u),
        ">"
      ] : fi(u) ? [
        "div",
        {},
        ["span", e, kt(u) ? "ShallowReactive" : "Reactive"],
        "<",
        a(u),
        `>${Sn(u) ? " (readonly)" : ""}`
      ] : Sn(u) ? [
        "div",
        {},
        ["span", e, kt(u) ? "ShallowReadonly" : "Readonly"],
        "<",
        a(u),
        ">"
      ] : null : null;
    },
    hasBody(u) {
      return u && u.__isVue;
    },
    body(u) {
      if (u && u.__isVue)
        return [
          "div",
          {},
          ...r(u.$)
        ];
    }
  };
  function r(u) {
    const m = [];
    u.type.props && u.props && m.push(s("props", ae(u.props))), u.setupState !== Me && m.push(s("setup", u.setupState)), u.data !== Me && m.push(s("data", ae(u.data)));
    const g = l(u, "computed");
    g && m.push(s("computed", g));
    const h = l(u, "inject");
    return h && m.push(s("injected", h)), m.push([
      "div",
      {},
      [
        "span",
        {
          style: i.style + ";opacity:0.66"
        },
        "$ (internal): "
      ],
      ["object", { object: u }]
    ]), m;
  }
  function s(u, m) {
    return m = Ue({}, m), Object.keys(m).length ? [
      "div",
      { style: "line-height:1.25em;margin-bottom:0.6em" },
      [
        "div",
        {
          style: "color:#476582"
        },
        u
      ],
      [
        "div",
        {
          style: "padding-left:1.25em"
        },
        ...Object.keys(m).map((g) => [
          "div",
          {},
          ["span", i, g + ": "],
          a(m[g], !1)
        ])
      ]
    ] : ["span", {}];
  }
  function a(u, m = !0) {
    return typeof u == "number" ? ["span", t, u] : typeof u == "string" ? ["span", n, JSON.stringify(u)] : typeof u == "boolean" ? ["span", i, u] : Pe(u) ? ["object", { object: m ? ae(u) : u }] : ["span", n, String(u)];
  }
  function l(u, m) {
    const g = u.type;
    if (pe(g))
      return;
    const h = {};
    for (const v in u.ctx)
      c(g, v, m) && (h[v] = u.ctx[v]);
    return h;
  }
  function c(u, m, g) {
    const h = u[g];
    if (ue(h) && h.includes(m) || Pe(h) && m in h || u.extends && c(u.extends, m, g) || u.mixins && u.mixins.some((v) => c(v, m, g)))
      return !0;
  }
  function d(u) {
    return kt(u) ? "ShallowRef" : u.effect ? "ComputedRef" : "Ref";
  }
  window.devtoolsFormatters ? window.devtoolsFormatters.push(o) : window.devtoolsFormatters = [o];
}
const Bl = "3.5.12", Ct = S.NODE_ENV !== "production" ? W : rt;
var Dt = {};
let Ks;
const Rl = typeof window < "u" && window.trustedTypes;
if (Rl)
  try {
    Ks = /* @__PURE__ */ Rl.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch (e) {
    Dt.NODE_ENV !== "production" && Ct(`Error creating trusted types policy: ${e}`);
  }
const $d = Ks ? (e) => Ks.createHTML(e) : (e) => e, hg = "http://www.w3.org/2000/svg", vg = "http://www.w3.org/1998/Math/MathML", bn = typeof document < "u" ? document : null, Hl = bn && /* @__PURE__ */ bn.createElement("template"), gg = {
  insert: (e, t, n) => {
    t.insertBefore(e, n || null);
  },
  remove: (e) => {
    const t = e.parentNode;
    t && t.removeChild(e);
  },
  createElement: (e, t, n, i) => {
    const o = t === "svg" ? bn.createElementNS(hg, e) : t === "mathml" ? bn.createElementNS(vg, e) : n ? bn.createElement(e, { is: n }) : bn.createElement(e);
    return e === "select" && i && i.multiple != null && o.setAttribute("multiple", i.multiple), o;
  },
  createText: (e) => bn.createTextNode(e),
  createComment: (e) => bn.createComment(e),
  setText: (e, t) => {
    e.nodeValue = t;
  },
  setElementText: (e, t) => {
    e.textContent = t;
  },
  parentNode: (e) => e.parentNode,
  nextSibling: (e) => e.nextSibling,
  querySelector: (e) => bn.querySelector(e),
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
      Hl.innerHTML = $d(
        i === "svg" ? `<svg>${e}</svg>` : i === "mathml" ? `<math>${e}</math>` : e
      );
      const a = Hl.content;
      if (i === "svg" || i === "mathml") {
        const l = a.firstChild;
        for (; l.firstChild; )
          a.appendChild(l.firstChild);
        a.removeChild(l);
      }
      t.insertBefore(a, n);
    }
    return [
      // first
      s ? s.nextSibling : t.firstChild,
      // last
      n ? n.previousSibling : t.lastChild
    ];
  }
}, An = "transition", Gi = "animation", Bi = Symbol("_vtc"), Md = {
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
}, Ld = /* @__PURE__ */ Ue(
  {},
  ed,
  Md
), pg = (e) => (e.displayName = "Transition", e.props = Ld, e), wi = /* @__PURE__ */ pg(
  (e, { slots: t }) => Un(tv, Fd(e), t)
), ni = (e, t = []) => {
  ue(e) ? e.forEach((n) => n(...t)) : e && e(...t);
}, jl = (e) => e ? ue(e) ? e.some((t) => t.length > 1) : e.length > 1 : !1;
function Fd(e) {
  const t = {};
  for (const w in e)
    w in Md || (t[w] = e[w]);
  if (e.css === !1)
    return t;
  const {
    name: n = "v",
    type: i,
    duration: o,
    enterFromClass: r = `${n}-enter-from`,
    enterActiveClass: s = `${n}-enter-active`,
    enterToClass: a = `${n}-enter-to`,
    appearFromClass: l = r,
    appearActiveClass: c = s,
    appearToClass: d = a,
    leaveFromClass: u = `${n}-leave-from`,
    leaveActiveClass: m = `${n}-leave-active`,
    leaveToClass: g = `${n}-leave-to`
  } = e, h = yg(o), v = h && h[0], _ = h && h[1], {
    onBeforeEnter: k,
    onEnter: O,
    onEnterCancelled: P,
    onLeave: B,
    onLeaveCancelled: C,
    onBeforeAppear: V = k,
    onAppear: F = O,
    onAppearCancelled: x = P
  } = t, N = (w, A, M) => {
    Dn(w, A ? d : a), Dn(w, A ? c : s), M && M();
  }, $ = (w, A) => {
    w._isLeaving = !1, Dn(w, u), Dn(w, g), Dn(w, m), A && A();
  }, E = (w) => (A, M) => {
    const ee = w ? F : O, oe = () => N(A, w, M);
    ni(ee, [A, oe]), zl(() => {
      Dn(A, w ? l : r), _n(A, w ? d : a), jl(ee) || Ul(A, i, v, oe);
    });
  };
  return Ue(t, {
    onBeforeEnter(w) {
      ni(k, [w]), _n(w, r), _n(w, s);
    },
    onBeforeAppear(w) {
      ni(V, [w]), _n(w, l), _n(w, c);
    },
    onEnter: E(!1),
    onAppear: E(!0),
    onLeave(w, A) {
      w._isLeaving = !0;
      const M = () => $(w, A);
      _n(w, u), _n(w, m), Rd(), zl(() => {
        w._isLeaving && (Dn(w, u), _n(w, g), jl(B) || Ul(w, i, _, M));
      }), ni(B, [w, M]);
    },
    onEnterCancelled(w) {
      N(w, !1), ni(P, [w]);
    },
    onAppearCancelled(w) {
      N(w, !0), ni(x, [w]);
    },
    onLeaveCancelled(w) {
      $(w), ni(C, [w]);
    }
  });
}
function yg(e) {
  if (e == null)
    return null;
  if (Pe(e))
    return [hs(e.enter), hs(e.leave)];
  {
    const t = hs(e);
    return [t, t];
  }
}
function hs(e) {
  const t = Rm(e);
  return Dt.NODE_ENV !== "production" && Ph(t, "<transition> explicit duration"), t;
}
function _n(e, t) {
  t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Bi] || (e[Bi] = /* @__PURE__ */ new Set())).add(t);
}
function Dn(e, t) {
  t.split(/\s+/).forEach((i) => i && e.classList.remove(i));
  const n = e[Bi];
  n && (n.delete(t), n.size || (e[Bi] = void 0));
}
function zl(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let _g = 0;
function Ul(e, t, n, i) {
  const o = e._endId = ++_g, r = () => {
    o === e._endId && i();
  };
  if (n != null)
    return setTimeout(r, n);
  const { type: s, timeout: a, propCount: l } = Bd(e, t);
  if (!s)
    return i();
  const c = s + "end";
  let d = 0;
  const u = () => {
    e.removeEventListener(c, m), r();
  }, m = (g) => {
    g.target === e && ++d >= l && u();
  };
  setTimeout(() => {
    d < l && u();
  }, a + 1), e.addEventListener(c, m);
}
function Bd(e, t) {
  const n = window.getComputedStyle(e), i = (h) => (n[h] || "").split(", "), o = i(`${An}Delay`), r = i(`${An}Duration`), s = Wl(o, r), a = i(`${Gi}Delay`), l = i(`${Gi}Duration`), c = Wl(a, l);
  let d = null, u = 0, m = 0;
  t === An ? s > 0 && (d = An, u = s, m = r.length) : t === Gi ? c > 0 && (d = Gi, u = c, m = l.length) : (u = Math.max(s, c), d = u > 0 ? s > c ? An : Gi : null, m = d ? d === An ? r.length : l.length : 0);
  const g = d === An && /\b(transform|all)(,|$)/.test(
    i(`${An}Property`).toString()
  );
  return {
    type: d,
    timeout: u,
    propCount: m,
    hasTransform: g
  };
}
function Wl(e, t) {
  for (; e.length < t.length; )
    e = e.concat(e);
  return Math.max(...t.map((n, i) => ql(n) + ql(e[i])));
}
function ql(e) {
  return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
}
function Rd() {
  return document.body.offsetHeight;
}
function bg(e, t, n) {
  const i = e[Bi];
  i && (t = (t ? [t, ...i] : [...i]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
const vr = Symbol("_vod"), Hd = Symbol("_vsh"), Wn = {
  beforeMount(e, { value: t }, { transition: n }) {
    e[vr] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : Yi(e, t);
  },
  mounted(e, { value: t }, { transition: n }) {
    n && t && n.enter(e);
  },
  updated(e, { value: t, oldValue: n }, { transition: i }) {
    !t != !n && (i ? t ? (i.beforeEnter(e), Yi(e, !0), i.enter(e)) : i.leave(e, () => {
      Yi(e, !1);
    }) : Yi(e, t));
  },
  beforeUnmount(e, { value: t }) {
    Yi(e, t);
  }
};
Dt.NODE_ENV !== "production" && (Wn.name = "show");
function Yi(e, t) {
  e.style.display = t ? e[vr] : "none", e[Hd] = !t;
}
const wg = Symbol(Dt.NODE_ENV !== "production" ? "CSS_VAR_TEXT" : ""), Sg = /(^|;)\s*display\s*:/;
function kg(e, t, n) {
  const i = e.style, o = je(n);
  let r = !1;
  if (n && !o) {
    if (t)
      if (je(t))
        for (const s of t.split(";")) {
          const a = s.slice(0, s.indexOf(":")).trim();
          n[a] == null && Zo(i, a, "");
        }
      else
        for (const s in t)
          n[s] == null && Zo(i, s, "");
    for (const s in n)
      s === "display" && (r = !0), Zo(i, s, n[s]);
  } else if (o) {
    if (t !== n) {
      const s = i[wg];
      s && (n += ";" + s), i.cssText = n, r = Sg.test(n);
    }
  } else t && e.removeAttribute("style");
  vr in e && (e[vr] = r ? i.display : "", e[Hd] && (i.display = "none"));
}
const Cg = /[^\\];\s*$/, Kl = /\s*!important$/;
function Zo(e, t, n) {
  if (ue(n))
    n.forEach((i) => Zo(e, t, i));
  else if (n == null && (n = ""), Dt.NODE_ENV !== "production" && Cg.test(n) && Ct(
    `Unexpected semicolon at the end of '${t}' style value: '${n}'`
  ), t.startsWith("--"))
    e.setProperty(t, n);
  else {
    const i = Eg(e, t);
    Kl.test(n) ? e.setProperty(
      jn(i),
      n.replace(Kl, ""),
      "important"
    ) : e[i] = n;
  }
}
const Gl = ["Webkit", "Moz", "ms"], vs = {};
function Eg(e, t) {
  const n = vs[t];
  if (n)
    return n;
  let i = dt(t);
  if (i !== "filter" && i in e)
    return vs[t] = i;
  i = zt(i);
  for (let o = 0; o < Gl.length; o++) {
    const r = Gl[o] + i;
    if (r in e)
      return vs[t] = r;
  }
  return t;
}
const Yl = "http://www.w3.org/1999/xlink";
function Xl(e, t, n, i, o, r = Zm(t)) {
  i && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Yl, t.slice(6, t.length)) : e.setAttributeNS(Yl, t, n) : n == null || r && !hc(n) ? e.removeAttribute(t) : e.setAttribute(
    t,
    r ? "" : Yt(n) ? String(n) : n
  );
}
function Jl(e, t, n, i, o) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? $d(n) : n);
    return;
  }
  const r = e.tagName;
  if (t === "value" && r !== "PROGRESS" && // custom elements may use _value internally
  !r.includes("-")) {
    const a = r === "OPTION" ? e.getAttribute("value") || "" : e.value, l = n == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      e.type === "checkbox" ? "on" : ""
    ) : String(n);
    (a !== l || !("_value" in e)) && (e.value = l), n == null && e.removeAttribute(t), e._value = n;
    return;
  }
  let s = !1;
  if (n === "" || n == null) {
    const a = typeof e[t];
    a === "boolean" ? n = hc(n) : n == null && a === "string" ? (n = "", s = !0) : a === "number" && (n = 0, s = !0);
  }
  try {
    e[t] = n;
  } catch (a) {
    Dt.NODE_ENV !== "production" && !s && Ct(
      `Failed setting prop "${t}" on <${r.toLowerCase()}>: value ${n} is invalid.`,
      a
    );
  }
  s && e.removeAttribute(o || t);
}
function ui(e, t, n, i) {
  e.addEventListener(t, n, i);
}
function xg(e, t, n, i) {
  e.removeEventListener(t, n, i);
}
const Zl = Symbol("_vei");
function Ng(e, t, n, i, o = null) {
  const r = e[Zl] || (e[Zl] = {}), s = r[t];
  if (i && s)
    s.value = Dt.NODE_ENV !== "production" ? eu(i, t) : i;
  else {
    const [a, l] = Vg(t);
    if (i) {
      const c = r[t] = Ag(
        Dt.NODE_ENV !== "production" ? eu(i, t) : i,
        o
      );
      ui(e, a, c, l);
    } else s && (xg(e, a, s, l), r[t] = void 0);
  }
}
const Ql = /(?:Once|Passive|Capture)$/;
function Vg(e) {
  let t;
  if (Ql.test(e)) {
    t = {};
    let i;
    for (; i = e.match(Ql); )
      e = e.slice(0, e.length - i[0].length), t[i[0].toLowerCase()] = !0;
  }
  return [e[2] === ":" ? e.slice(3) : jn(e.slice(2)), t];
}
let gs = 0;
const Og = /* @__PURE__ */ Promise.resolve(), Tg = () => gs || (Og.then(() => gs = 0), gs = Date.now());
function Ag(e, t) {
  const n = (i) => {
    if (!i._vts)
      i._vts = Date.now();
    else if (i._vts <= n.attached)
      return;
    Xt(
      Dg(i, n.value),
      t,
      5,
      [i]
    );
  };
  return n.value = e, n.attached = Tg(), n;
}
function eu(e, t) {
  return pe(e) || ue(e) ? e : (Ct(
    `Wrong type passed as event handler to ${t} - did you forget @ or : in front of your prop?
Expected function or array of functions, received type ${typeof e}.`
  ), rt);
}
function Dg(e, t) {
  if (ue(t)) {
    const n = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      n.call(e), e._stopped = !0;
    }, t.map(
      (i) => (o) => !o._stopped && i && i(o)
    );
  } else
    return t;
}
const tu = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // lowercase letter
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Ig = (e, t, n, i, o, r) => {
  const s = o === "svg";
  t === "class" ? bg(e, i, s) : t === "style" ? kg(e, n, i) : So(t) ? ir(t) || Ng(e, t, n, i, r) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : Pg(e, t, i, s)) ? (Jl(e, t, i), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Xl(e, t, i, s, r, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && (/[A-Z]/.test(t) || !je(i)) ? Jl(e, dt(t), i, r, t) : (t === "true-value" ? e._trueValue = i : t === "false-value" && (e._falseValue = i), Xl(e, t, i, s));
};
function Pg(e, t, n, i) {
  if (i)
    return !!(t === "innerHTML" || t === "textContent" || t in e && tu(t) && pe(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA")
    return !1;
  if (t === "width" || t === "height") {
    const o = e.tagName;
    if (o === "IMG" || o === "VIDEO" || o === "CANVAS" || o === "SOURCE")
      return !1;
  }
  return tu(t) && je(n) ? !1 : t in e;
}
const jd = /* @__PURE__ */ new WeakMap(), zd = /* @__PURE__ */ new WeakMap(), gr = Symbol("_moveCb"), nu = Symbol("_enterCb"), $g = (e) => (delete e.props.mode, e), Mg = /* @__PURE__ */ $g({
  name: "TransitionGroup",
  props: /* @__PURE__ */ Ue({}, Ld, {
    tag: String,
    moveClass: String
  }),
  setup(e, { slots: t }) {
    const n = jr(), i = Qc();
    let o, r;
    return ka(() => {
      if (!o.length)
        return;
      const s = e.moveClass || `${e.name || "v"}-move`;
      if (!Rg(
        o[0].el,
        n.vnode.el,
        s
      ))
        return;
      o.forEach(Lg), o.forEach(Fg);
      const a = o.filter(Bg);
      Rd(), a.forEach((l) => {
        const c = l.el, d = c.style;
        _n(c, s), d.transform = d.webkitTransform = d.transitionDuration = "";
        const u = c[gr] = (m) => {
          m && m.target !== c || (!m || /transform$/.test(m.propertyName)) && (c.removeEventListener("transitionend", u), c[gr] = null, Dn(c, s));
        };
        c.addEventListener("transitionend", u);
      });
    }), () => {
      const s = ae(e), a = Fd(s);
      let l = s.tag || fe;
      if (o = [], r)
        for (let c = 0; c < r.length; c++) {
          const d = r[c];
          d.el && d.el instanceof Element && (o.push(d), _i(
            d,
            fo(
              d,
              a,
              i,
              n
            )
          ), jd.set(
            d,
            d.el.getBoundingClientRect()
          ));
        }
      r = t.default ? wa(t.default()) : [];
      for (let c = 0; c < r.length; c++) {
        const d = r[c];
        d.key != null ? _i(
          d,
          fo(d, a, i, n)
        ) : Dt.NODE_ENV !== "production" && d.type !== ki && Ct("<TransitionGroup> children must be keyed.");
      }
      return f(l, null, r);
    };
  }
}), Aa = Mg;
function Lg(e) {
  const t = e.el;
  t[gr] && t[gr](), t[nu] && t[nu]();
}
function Fg(e) {
  zd.set(e, e.el.getBoundingClientRect());
}
function Bg(e) {
  const t = jd.get(e), n = zd.get(e), i = t.left - n.left, o = t.top - n.top;
  if (i || o) {
    const r = e.el.style;
    return r.transform = r.webkitTransform = `translate(${i}px,${o}px)`, r.transitionDuration = "0s", e;
  }
}
function Rg(e, t, n) {
  const i = e.cloneNode(), o = e[Bi];
  o && o.forEach((a) => {
    a.split(/\s+/).forEach((l) => l && i.classList.remove(l));
  }), n.split(/\s+/).forEach((a) => a && i.classList.add(a)), i.style.display = "none";
  const r = t.nodeType === 1 ? t : t.parentNode;
  r.appendChild(i);
  const { hasTransform: s } = Bd(i);
  return r.removeChild(i), s;
}
const pr = (e) => {
  const t = e.props["onUpdate:modelValue"] || !1;
  return ue(t) ? (n) => Oi(t, n) : t;
};
function Hg(e) {
  e.target.composing = !0;
}
function iu(e) {
  const t = e.target;
  t.composing && (t.composing = !1, t.dispatchEvent(new Event("input")));
}
const Fi = Symbol("_assign"), jg = {
  created(e, { modifiers: { lazy: t, trim: n, number: i } }, o) {
    e[Fi] = pr(o);
    const r = i || o.props && o.props.type === "number";
    ui(e, t ? "change" : "input", (s) => {
      if (s.target.composing) return;
      let a = e.value;
      n && (a = a.trim()), r && (a = rr(a)), e[Fi](a);
    }), n && ui(e, "change", () => {
      e.value = e.value.trim();
    }), t || (ui(e, "compositionstart", Hg), ui(e, "compositionend", iu), ui(e, "change", iu));
  },
  // set value on mounted so it's after min/max for type="range"
  mounted(e, { value: t }) {
    e.value = t ?? "";
  },
  beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: i, trim: o, number: r } }, s) {
    if (e[Fi] = pr(s), e.composing) return;
    const a = (r || e.type === "number") && !/^0\d/.test(e.value) ? rr(e.value) : e.value, l = t ?? "";
    a !== l && (document.activeElement === e && e.type !== "range" && (i && t === n || o && e.value.trim() === l) || (e.value = l));
  }
}, zg = {
  // <select multiple> value need to be deep traversed
  deep: !0,
  created(e, { value: t, modifiers: { number: n } }, i) {
    const o = Ir(t);
    ui(e, "change", () => {
      const r = Array.prototype.filter.call(e.options, (s) => s.selected).map(
        (s) => n ? rr(yr(s)) : yr(s)
      );
      e[Fi](
        e.multiple ? o ? new Set(r) : r : r[0]
      ), e._assigning = !0, ft(() => {
        e._assigning = !1;
      });
    }), e[Fi] = pr(i);
  },
  // set value in mounted & updated because <select> relies on its children
  // <option>s.
  mounted(e, { value: t }) {
    ou(e, t);
  },
  beforeUpdate(e, t, n) {
    e[Fi] = pr(n);
  },
  updated(e, { value: t }) {
    e._assigning || ou(e, t);
  }
};
function ou(e, t) {
  const n = e.multiple, i = ue(t);
  if (n && !i && !Ir(t)) {
    Dt.NODE_ENV !== "production" && Ct(
      `<select multiple v-model> expects an Array or Set value for its binding, but got ${Object.prototype.toString.call(t).slice(8, -1)}.`
    );
    return;
  }
  for (let o = 0, r = e.options.length; o < r; o++) {
    const s = e.options[o], a = yr(s);
    if (n)
      if (i) {
        const l = typeof a;
        l === "string" || l === "number" ? s.selected = t.some((c) => String(c) === String(a)) : s.selected = eh(t, a) > -1;
      } else
        s.selected = t.has(a);
    else if ($r(yr(s), t)) {
      e.selectedIndex !== o && (e.selectedIndex = o);
      return;
    }
  }
  !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
}
function yr(e) {
  return "_value" in e ? e._value : e.value;
}
const Ug = ["ctrl", "shift", "alt", "meta"], Wg = {
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
  exact: (e, t) => Ug.some((n) => e[`${n}Key`] && !t.includes(n))
}, ai = (e, t) => {
  const n = e._withMods || (e._withMods = {}), i = t.join(".");
  return n[i] || (n[i] = (o, ...r) => {
    for (let s = 0; s < t.length; s++) {
      const a = Wg[t[s]];
      if (a && a(o, t)) return;
    }
    return e(o, ...r);
  });
}, qg = /* @__PURE__ */ Ue({ patchProp: Ig }, gg);
let ru;
function Kg() {
  return ru || (ru = Bv(qg));
}
const Gg = (...e) => {
  const t = Kg().createApp(...e);
  Dt.NODE_ENV !== "production" && (Xg(t), Jg(t));
  const { mount: n } = t;
  return t.mount = (i) => {
    const o = Zg(i);
    if (!o) return;
    const r = t._component;
    !pe(r) && !r.render && !r.template && (r.template = o.innerHTML), o.nodeType === 1 && (o.textContent = "");
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
function Xg(e) {
  Object.defineProperty(e.config, "isNativeTag", {
    value: (t) => Gm(t) || Ym(t) || Xm(t),
    writable: !1
  });
}
function Jg(e) {
  {
    const t = e.config.isCustomElement;
    Object.defineProperty(e.config, "isCustomElement", {
      get() {
        return t;
      },
      set() {
        Ct(
          "The `isCustomElement` config option is deprecated. Use `compilerOptions.isCustomElement` instead."
        );
      }
    });
    const n = e.config.compilerOptions, i = 'The `compilerOptions` config option is only respected when using a build of Vue.js that includes the runtime compiler (aka "full build"). Since you are using the runtime-only build, `compilerOptions` must be passed to `@vue/compiler-dom` in the build setup instead.\n- For vue-loader: pass it via vue-loader\'s `compilerOptions` loader option.\n- For vue-cli: see https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-loader\n- For vite: pass it via @vitejs/plugin-vue options. See https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#example-for-passing-options-to-vuecompiler-sfc';
    Object.defineProperty(e.config, "compilerOptions", {
      get() {
        return Ct(i), n;
      },
      set() {
        Ct(i);
      }
    });
  }
}
function Zg(e) {
  if (je(e)) {
    const t = document.querySelector(e);
    return Dt.NODE_ENV !== "production" && !t && Ct(
      `Failed to mount app: mount target selector "${e}" returned null.`
    ), t;
  }
  return Dt.NODE_ENV !== "production" && window.ShadowRoot && e instanceof window.ShadowRoot && e.mode === "closed" && Ct(
    'mounting on a ShadowRoot with `{mode: "closed"}` may lead to unpredictable bugs'
  ), e;
}
var Qg = {};
function ep() {
  mg();
}
Qg.NODE_ENV !== "production" && ep();
function zn(e, t) {
  let n;
  function i() {
    n = fa(), n.run(() => t.length ? t(() => {
      n == null || n.stop(), i();
    }) : t());
  }
  be(e, (o) => {
    o && !n ? i() : o || (n == null || n.stop(), n = void 0);
  }, {
    immediate: !0
  }), It(() => {
    n == null || n.stop();
  });
}
const ze = typeof window < "u", Da = ze && "IntersectionObserver" in window, tp = ze && ("ontouchstart" in window || window.navigator.maxTouchPoints > 0);
function Ud(e, t, n) {
  const i = t.length - 1;
  if (i < 0) return e === void 0 ? n : e;
  for (let o = 0; o < i; o++) {
    if (e == null)
      return n;
    e = e[t[o]];
  }
  return e == null || e[t[i]] === void 0 ? n : e[t[i]];
}
function To(e, t) {
  if (e === t) return !0;
  if (e instanceof Date && t instanceof Date && e.getTime() !== t.getTime() || e !== Object(e) || t !== Object(t))
    return !1;
  const n = Object.keys(e);
  return n.length !== Object.keys(t).length ? !1 : n.every((i) => To(e[i], t[i]));
}
function Gs(e, t, n) {
  return e == null || !t || typeof t != "string" ? n : e[t] !== void 0 ? e[t] : (t = t.replace(/\[(\w+)\]/g, ".$1"), t = t.replace(/^\./, ""), Ud(e, t.split("."), n));
}
function Xi(e, t, n) {
  if (t === !0) return e === void 0 ? n : e;
  if (t == null || typeof t == "boolean") return n;
  if (e !== Object(e)) {
    if (typeof t != "function") return n;
    const o = t(e, n);
    return typeof o > "u" ? n : o;
  }
  if (typeof t == "string") return Gs(e, t, n);
  if (Array.isArray(t)) return Ud(e, t, n);
  if (typeof t != "function") return n;
  const i = t(e, n);
  return typeof i > "u" ? n : i;
}
function Ia(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
  return Array.from({
    length: e
  }, (n, i) => t + i);
}
function he(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "px";
  if (!(e == null || e === ""))
    return isNaN(+e) ? String(e) : isFinite(+e) ? `${Number(e)}${t}` : void 0;
}
function np(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function su(e) {
  let t;
  return e !== null && typeof e == "object" && ((t = Object.getPrototypeOf(e)) === Object.prototype || t === null);
}
function Wd(e) {
  if (e && "$el" in e) {
    const t = e.$el;
    return (t == null ? void 0 : t.nodeType) === Node.TEXT_NODE ? t.nextElementSibling : t;
  }
  return e;
}
const au = Object.freeze({
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
}), ip = Object.freeze({
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
function ps(e, t) {
  return t.every((n) => e.hasOwnProperty(n));
}
function qd(e, t) {
  const n = {}, i = new Set(Object.keys(e));
  for (const o of t)
    i.has(o) && (n[o] = e[o]);
  return n;
}
function lu(e, t, n) {
  const i = /* @__PURE__ */ Object.create(null), o = /* @__PURE__ */ Object.create(null);
  for (const r in e)
    t.some((s) => s instanceof RegExp ? s.test(r) : s === r) && !(n != null && n.some((s) => s === r)) ? i[r] = e[r] : o[r] = e[r];
  return [i, o];
}
function Pa(e, t) {
  const n = {
    ...e
  };
  return t.forEach((i) => delete n[i]), n;
}
function op(e, t) {
  const n = {};
  return t.forEach((i) => n[i] = e[i]), n;
}
const Kd = /^on[^a-z]/, $a = (e) => Kd.test(e), rp = ["onAfterscriptexecute", "onAnimationcancel", "onAnimationend", "onAnimationiteration", "onAnimationstart", "onAuxclick", "onBeforeinput", "onBeforescriptexecute", "onChange", "onClick", "onCompositionend", "onCompositionstart", "onCompositionupdate", "onContextmenu", "onCopy", "onCut", "onDblclick", "onFocusin", "onFocusout", "onFullscreenchange", "onFullscreenerror", "onGesturechange", "onGestureend", "onGesturestart", "onGotpointercapture", "onInput", "onKeydown", "onKeypress", "onKeyup", "onLostpointercapture", "onMousedown", "onMousemove", "onMouseout", "onMouseover", "onMouseup", "onMousewheel", "onPaste", "onPointercancel", "onPointerdown", "onPointerenter", "onPointerleave", "onPointermove", "onPointerout", "onPointerover", "onPointerup", "onReset", "onSelect", "onSubmit", "onTouchcancel", "onTouchend", "onTouchmove", "onTouchstart", "onTransitioncancel", "onTransitionend", "onTransitionrun", "onTransitionstart", "onWheel"];
function Ma(e) {
  const [t, n] = lu(e, [Kd]), i = Pa(t, rp), [o, r] = lu(n, ["class", "style", "id", /^data-/]);
  return Object.assign(o, t), Object.assign(r, i), [o, r];
}
function an(e) {
  return e == null ? [] : Array.isArray(e) ? e : [e];
}
function kn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
  return Math.max(t, Math.min(n, e));
}
function uu(e) {
  const t = e.toString().trim();
  return t.includes(".") ? t.length - t.indexOf(".") - 1 : 0;
}
function cu(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0";
  return e + n.repeat(Math.max(0, t - e.length));
}
function du(e, t) {
  return (arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0").repeat(Math.max(0, t - e.length)) + e;
}
function sp(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1;
  const n = [];
  let i = 0;
  for (; i < e.length; )
    n.push(e.substr(i, t)), i += t;
  return n;
}
function Tt() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = arguments.length > 2 ? arguments[2] : void 0;
  const i = {};
  for (const o in e)
    i[o] = e[o];
  for (const o in t) {
    const r = e[o], s = t[o];
    if (su(r) && su(s)) {
      i[o] = Tt(r, s, n);
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
function Gd(e) {
  return e.map((t) => t.type === fe ? Gd(t.children) : t).flat();
}
function gi() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  if (gi.cache.has(e)) return gi.cache.get(e);
  const t = e.replace(/[^a-z]/gi, "-").replace(/\B([A-Z])/g, "-$1").toLowerCase();
  return gi.cache.set(e, t), t;
}
gi.cache = /* @__PURE__ */ new Map();
function Ai(e, t) {
  if (!t || typeof t != "object") return [];
  if (Array.isArray(t))
    return t.map((n) => Ai(e, n)).flat(1);
  if (t.suspense)
    return Ai(e, t.ssContent);
  if (Array.isArray(t.children))
    return t.children.map((n) => Ai(e, n)).flat(1);
  if (t.component) {
    if (Object.getOwnPropertySymbols(t.component.provides).includes(e))
      return [t.component];
    if (t.component.subTree)
      return Ai(e, t.component.subTree).flat(1);
  }
  return [];
}
function La(e) {
  const t = ct({}), n = y(e);
  return Jt(() => {
    for (const i in n.value)
      t[i] = n.value[i];
  }, {
    flush: "sync"
  }), pa(t);
}
function _r(e, t) {
  return e.includes(t);
}
function Yd(e) {
  return e[2].toLowerCase() + e.slice(3);
}
const Ht = () => [Function, Array];
function fu(e, t) {
  return t = "on" + zt(t), !!(e[t] || e[`${t}Once`] || e[`${t}Capture`] || e[`${t}OnceCapture`] || e[`${t}CaptureOnce`]);
}
function ap(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
    n[i - 1] = arguments[i];
  if (Array.isArray(e))
    for (const o of e)
      o(...n);
  else typeof e == "function" && e(...n);
}
function Xd(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0;
  const n = ["button", "[href]", 'input:not([type="hidden"])', "select", "textarea", "[tabindex]"].map((i) => `${i}${t ? ':not([tabindex="-1"])' : ""}:not([disabled])`).join(", ");
  return [...e.querySelectorAll(n)];
}
function lp(e, t, n) {
  let i, o = e.indexOf(document.activeElement);
  const r = t === "next" ? 1 : -1;
  do
    o += r, i = e[o];
  while ((!i || i.offsetParent == null) && o < e.length && o >= 0);
  return i;
}
function Jd(e, t) {
  var i, o, r, s;
  const n = Xd(e);
  if (!t)
    (e === document.activeElement || !e.contains(document.activeElement)) && ((i = n[0]) == null || i.focus());
  else if (t === "first")
    (o = n[0]) == null || o.focus();
  else if (t === "last")
    (r = n.at(-1)) == null || r.focus();
  else if (typeof t == "number")
    (s = n[t]) == null || s.focus();
  else {
    const a = lp(n, t);
    a ? a.focus() : Jd(e, t === "next" ? "first" : "last");
  }
}
function Zd(e, t) {
  if (!(ze && typeof CSS < "u" && typeof CSS.supports < "u" && CSS.supports(`selector(${t})`))) return null;
  try {
    return !!e && e.matches(t);
  } catch {
    return null;
  }
}
function up(e, t) {
  if (!ze || e === 0)
    return t(), () => {
    };
  const n = window.setTimeout(t, e);
  return () => window.clearTimeout(n);
}
function Ys() {
  const e = ke(), t = (n) => {
    e.value = n;
  };
  return Object.defineProperty(t, "value", {
    enumerable: !0,
    get: () => e.value,
    set: (n) => e.value = n
  }), Object.defineProperty(t, "el", {
    enumerable: !0,
    get: () => Wd(e.value)
  }), t;
}
const Qd = ["top", "bottom"], cp = ["start", "end", "left", "right"];
function Xs(e, t) {
  let [n, i] = e.split(" ");
  return i || (i = _r(Qd, n) ? "start" : _r(cp, n) ? "top" : "center"), {
    side: mu(n, t),
    align: mu(i, t)
  };
}
function mu(e, t) {
  return e === "start" ? t ? "right" : "left" : e === "end" ? t ? "left" : "right" : e;
}
function ys(e) {
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
function _s(e) {
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
function hu(e) {
  return {
    side: e.align,
    align: e.side
  };
}
function vu(e) {
  return _r(Qd, e.side) ? "y" : "x";
}
class pi {
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
function gu(e, t) {
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
function ef(e) {
  return Array.isArray(e) ? new pi({
    x: e[0],
    y: e[1],
    width: 0,
    height: 0
  }) : e.getBoundingClientRect();
}
function Fa(e) {
  const t = e.getBoundingClientRect(), n = getComputedStyle(e), i = n.transform;
  if (i) {
    let o, r, s, a, l;
    if (i.startsWith("matrix3d("))
      o = i.slice(9, -1).split(/, /), r = +o[0], s = +o[5], a = +o[12], l = +o[13];
    else if (i.startsWith("matrix("))
      o = i.slice(7, -1).split(/, /), r = +o[0], s = +o[3], a = +o[4], l = +o[5];
    else
      return new pi(t);
    const c = n.transformOrigin, d = t.x - a - (1 - r) * parseFloat(c), u = t.y - l - (1 - s) * parseFloat(c.slice(c.indexOf(" ") + 1)), m = r ? t.width / r : e.offsetWidth + 1, g = s ? t.height / s : e.offsetHeight + 1;
    return new pi({
      x: d,
      y: u,
      width: m,
      height: g
    });
  } else
    return new pi(t);
}
function Di(e, t, n) {
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
const Qo = /* @__PURE__ */ new WeakMap();
function dp(e, t) {
  Object.keys(t).forEach((n) => {
    if ($a(n)) {
      const i = Yd(n), o = Qo.get(e);
      if (t[n] == null)
        o == null || o.forEach((r) => {
          const [s, a] = r;
          s === i && (e.removeEventListener(i, a), o.delete(r));
        });
      else if (!o || ![...o].some((r) => r[0] === i && r[1] === t[n])) {
        e.addEventListener(i, t[n]);
        const r = o || /* @__PURE__ */ new Set();
        r.add([i, t[n]]), Qo.has(e) || Qo.set(e, r);
      }
    } else
      t[n] == null ? e.removeAttribute(n) : e.setAttribute(n, t[n]);
  });
}
function fp(e, t) {
  Object.keys(t).forEach((n) => {
    if ($a(n)) {
      const i = Yd(n), o = Qo.get(e);
      o == null || o.forEach((r) => {
        const [s, a] = r;
        s === i && (e.removeEventListener(i, a), o.delete(r));
      });
    } else
      e.removeAttribute(n);
  });
}
const Ni = 2.4, pu = 0.2126729, yu = 0.7151522, _u = 0.072175, mp = 0.55, hp = 0.58, vp = 0.57, gp = 0.62, Ro = 0.03, bu = 1.45, pp = 5e-4, yp = 1.25, _p = 1.25, wu = 0.078, Su = 12.82051282051282, Ho = 0.06, ku = 1e-3;
function Cu(e, t) {
  const n = (e.r / 255) ** Ni, i = (e.g / 255) ** Ni, o = (e.b / 255) ** Ni, r = (t.r / 255) ** Ni, s = (t.g / 255) ** Ni, a = (t.b / 255) ** Ni;
  let l = n * pu + i * yu + o * _u, c = r * pu + s * yu + a * _u;
  if (l <= Ro && (l += (Ro - l) ** bu), c <= Ro && (c += (Ro - c) ** bu), Math.abs(c - l) < pp) return 0;
  let d;
  if (c > l) {
    const u = (c ** mp - l ** hp) * yp;
    d = u < ku ? 0 : u < wu ? u - u * Su * Ho : u - Ho;
  } else {
    const u = (c ** gp - l ** vp) * _p;
    d = u > -ku ? 0 : u > -wu ? u - u * Su * Ho : u + Ho;
  }
  return d * 100;
}
function Bn(e) {
  Ct(`Vuetify: ${e}`);
}
function br(e) {
  Ct(`Vuetify error: ${e}`);
}
function bp(e, t) {
  t = Array.isArray(t) ? t.slice(0, -1).map((n) => `'${n}'`).join(", ") + ` or '${t.at(-1)}'` : `'${t}'`, Ct(`[Vuetify UPGRADE] '${e}' is deprecated, use ${t} instead.`);
}
const wr = 0.20689655172413793, wp = (e) => e > wr ** 3 ? Math.cbrt(e) : e / (3 * wr ** 2) + 4 / 29, Sp = (e) => e > wr ? e ** 3 : 3 * wr ** 2 * (e - 4 / 29);
function tf(e) {
  const t = wp, n = t(e[1]);
  return [116 * n - 16, 500 * (t(e[0] / 0.95047) - n), 200 * (n - t(e[2] / 1.08883))];
}
function nf(e) {
  const t = Sp, n = (e[0] + 16) / 116;
  return [t(n + e[1] / 500) * 0.95047, t(n), t(n - e[2] / 200) * 1.08883];
}
const kp = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]], Cp = (e) => e <= 31308e-7 ? e * 12.92 : 1.055 * e ** (1 / 2.4) - 0.055, Ep = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], xp = (e) => e <= 0.04045 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4;
function of(e) {
  const t = Array(3), n = Cp, i = kp;
  for (let o = 0; o < 3; ++o)
    t[o] = Math.round(kn(n(i[o][0] * e[0] + i[o][1] * e[1] + i[o][2] * e[2])) * 255);
  return {
    r: t[0],
    g: t[1],
    b: t[2]
  };
}
function Ba(e) {
  let {
    r: t,
    g: n,
    b: i
  } = e;
  const o = [0, 0, 0], r = xp, s = Ep;
  t = r(t / 255), n = r(n / 255), i = r(i / 255);
  for (let a = 0; a < 3; ++a)
    o[a] = s[a][0] * t + s[a][1] * n + s[a][2] * i;
  return o;
}
function Js(e) {
  return !!e && /^(#|var\(--|(rgb|hsl)a?\()/.test(e);
}
function Np(e) {
  return Js(e) && !/^((rgb|hsl)a?\()?var\(--/.test(e);
}
const Eu = /^(?<fn>(?:rgb|hsl)a?)\((?<values>.+)\)/, Vp = {
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
  hsl: (e, t, n, i) => xu({
    h: e,
    s: t,
    l: n,
    a: i
  }),
  hsla: (e, t, n, i) => xu({
    h: e,
    s: t,
    l: n,
    a: i
  }),
  hsv: (e, t, n, i) => vo({
    h: e,
    s: t,
    v: n,
    a: i
  }),
  hsva: (e, t, n, i) => vo({
    h: e,
    s: t,
    v: n,
    a: i
  })
};
function sn(e) {
  if (typeof e == "number")
    return (isNaN(e) || e < 0 || e > 16777215) && Bn(`'${e}' is not a valid hex color`), {
      r: (e & 16711680) >> 16,
      g: (e & 65280) >> 8,
      b: e & 255
    };
  if (typeof e == "string" && Eu.test(e)) {
    const {
      groups: t
    } = e.match(Eu), {
      fn: n,
      values: i
    } = t, o = i.split(/,\s*/).map((r) => r.endsWith("%") && ["hsl", "hsla", "hsv", "hsva"].includes(n) ? parseFloat(r) / 100 : parseFloat(r));
    return Vp[n](...o);
  } else if (typeof e == "string") {
    let t = e.startsWith("#") ? e.slice(1) : e;
    [3, 4].includes(t.length) ? t = t.split("").map((i) => i + i).join("") : [6, 8].includes(t.length) || Bn(`'${e}' is not a valid hex(a) color`);
    const n = parseInt(t, 16);
    return (isNaN(n) || n < 0 || n > 4294967295) && Bn(`'${e}' is not a valid hex(a) color`), Tp(t);
  } else if (typeof e == "object") {
    if (ps(e, ["r", "g", "b"]))
      return e;
    if (ps(e, ["h", "s", "l"]))
      return vo(rf(e));
    if (ps(e, ["h", "s", "v"]))
      return vo(e);
  }
  throw new TypeError(`Invalid color: ${e == null ? e : String(e) || e.constructor.name}
Expected #hex, #hexa, rgb(), rgba(), hsl(), hsla(), object or number`);
}
function vo(e) {
  const {
    h: t,
    s: n,
    v: i,
    a: o
  } = e, r = (a) => {
    const l = (a + t / 60) % 6;
    return i - i * n * Math.max(Math.min(l, 4 - l, 1), 0);
  }, s = [r(5), r(3), r(1)].map((a) => Math.round(a * 255));
  return {
    r: s[0],
    g: s[1],
    b: s[2],
    a: o
  };
}
function xu(e) {
  return vo(rf(e));
}
function rf(e) {
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
function jo(e) {
  const t = Math.round(e).toString(16);
  return ("00".substr(0, 2 - t.length) + t).toUpperCase();
}
function Op(e) {
  let {
    r: t,
    g: n,
    b: i,
    a: o
  } = e;
  return `#${[jo(t), jo(n), jo(i), o !== void 0 ? jo(Math.round(o * 255)) : ""].join("")}`;
}
function Tp(e) {
  e = Ap(e);
  let [t, n, i, o] = sp(e, 2).map((r) => parseInt(r, 16));
  return o = o === void 0 ? o : o / 255, {
    r: t,
    g: n,
    b: i,
    a: o
  };
}
function Ap(e) {
  return e.startsWith("#") && (e = e.slice(1)), e = e.replace(/([^0-9a-f])/gi, "F"), (e.length === 3 || e.length === 4) && (e = e.split("").map((t) => t + t).join("")), e.length !== 6 && (e = cu(cu(e, 6), 8, "F")), e;
}
function Dp(e, t) {
  const n = tf(Ba(e));
  return n[0] = n[0] + t * 10, of(nf(n));
}
function Ip(e, t) {
  const n = tf(Ba(e));
  return n[0] = n[0] - t * 10, of(nf(n));
}
function Pp(e) {
  const t = sn(e);
  return Ba(t)[1];
}
function sf(e) {
  const t = Math.abs(Cu(sn(0), sn(e)));
  return Math.abs(Cu(sn(16777215), sn(e))) > Math.min(t, 50) ? "#fff" : "#000";
}
function J(e, t) {
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
const Ne = J({
  class: [String, Array, Object],
  style: {
    type: [String, Array, Object],
    default: null
  }
}, "component");
function Qe(e, t) {
  const n = jr();
  if (!n)
    throw new Error(`[Vuetify] ${e} must be called from inside a setup function`);
  return n;
}
function dn() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "composables";
  const t = Qe(e).type;
  return gi((t == null ? void 0 : t.aliasName) || (t == null ? void 0 : t.name));
}
let af = 0, er = /* @__PURE__ */ new WeakMap();
function Zt() {
  const e = Qe("getUid");
  if (er.has(e)) return er.get(e);
  {
    const t = af++;
    return er.set(e, t), t;
  }
}
Zt.reset = () => {
  af = 0, er = /* @__PURE__ */ new WeakMap();
};
function $p(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qe("injectSelf");
  const {
    provides: n
  } = t;
  if (n && e in n)
    return n[e];
}
const Ri = Symbol.for("vuetify:defaults");
function Mp(e) {
  return se(e);
}
function Ra() {
  const e = He(Ri);
  if (!e) throw new Error("[Vuetify] Could not find defaults instance");
  return e;
}
function Ci(e, t) {
  const n = Ra(), i = se(e), o = y(() => {
    if (rn(t == null ? void 0 : t.disabled)) return n.value;
    const s = rn(t == null ? void 0 : t.scoped), a = rn(t == null ? void 0 : t.reset), l = rn(t == null ? void 0 : t.root);
    if (i.value == null && !(s || a || l)) return n.value;
    let c = Tt(i.value, {
      prev: n.value
    });
    if (s) return c;
    if (a || l) {
      const d = Number(a || 1 / 0);
      for (let u = 0; u <= d && !(!c || !("prev" in c)); u++)
        c = c.prev;
      return c && typeof l == "string" && l in c && (c = Tt(Tt(c, {
        prev: c
      }), c[l])), c;
    }
    return c.prev ? Tt(c.prev, c) : c;
  });
  return Et(Ri, o), o;
}
function Lp(e, t) {
  var n, i;
  return typeof ((n = e.props) == null ? void 0 : n[t]) < "u" || typeof ((i = e.props) == null ? void 0 : i[gi(t)]) < "u";
}
function Fp() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Ra();
  const i = Qe("useDefaults");
  if (t = t ?? i.type.name ?? i.type.__name, !t)
    throw new Error("[Vuetify] Could not determine component name");
  const o = y(() => {
    var l;
    return (l = n.value) == null ? void 0 : l[e._as ?? t];
  }), r = new Proxy(e, {
    get(l, c) {
      var u, m, g, h, v, _, k;
      const d = Reflect.get(l, c);
      return c === "class" || c === "style" ? [(u = o.value) == null ? void 0 : u[c], d].filter((O) => O != null) : typeof c == "string" && !Lp(i.vnode, c) ? ((m = o.value) == null ? void 0 : m[c]) !== void 0 ? (g = o.value) == null ? void 0 : g[c] : ((v = (h = n.value) == null ? void 0 : h.global) == null ? void 0 : v[c]) !== void 0 ? (k = (_ = n.value) == null ? void 0 : _.global) == null ? void 0 : k[c] : d : d;
    }
  }), s = ke();
  Jt(() => {
    if (o.value) {
      const l = Object.entries(o.value).filter((c) => {
        let [d] = c;
        return d.startsWith(d[0].toUpperCase());
      });
      s.value = l.length ? Object.fromEntries(l) : void 0;
    } else
      s.value = void 0;
  });
  function a() {
    const l = $p(Ri, i);
    Et(Ri, y(() => s.value ? Tt((l == null ? void 0 : l.value) ?? {}, s.value) : l == null ? void 0 : l.value));
  }
  return {
    props: r,
    provideSubDefaults: a
  };
}
function Ui(e) {
  if (e._setup = e._setup ?? e.setup, !e.name)
    return Bn("The component is missing an explicit name, unable to generate default prop value"), e;
  if (e._setup) {
    e.props = J(e.props ?? {}, e.name)();
    const t = Object.keys(e.props).filter((n) => n !== "class" && n !== "style");
    e.filterProps = function(i) {
      return qd(i, t);
    }, e.props._as = String, e.setup = function(i, o) {
      const r = Ra();
      if (!r.value) return e._setup(i, o);
      const {
        props: s,
        provideSubDefaults: a
      } = Fp(i, i._as ?? e.name, r), l = e._setup(s, o);
      return a(), l;
    };
  }
  return e;
}
function ve() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !0;
  return (t) => (e ? Ui : nv)(t);
}
function Ha(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "div", n = arguments.length > 2 ? arguments[2] : void 0;
  return ve()({
    name: n ?? zt(dt(e.replace(/__/g, "-"))),
    props: {
      tag: {
        type: String,
        default: t
      },
      ...Ne()
    },
    setup(i, o) {
      let {
        slots: r
      } = o;
      return () => {
        var s;
        return Un(i.tag, {
          class: [e, i.class],
          style: i.style
        }, (s = r.default) == null ? void 0 : s.call(r));
      };
    }
  });
}
function lf(e) {
  if (typeof e.getRootNode != "function") {
    for (; e.parentNode; ) e = e.parentNode;
    return e !== document ? null : document;
  }
  const t = e.getRootNode();
  return t !== document && t.getRootNode({
    composed: !0
  }) !== document ? null : t;
}
const Sr = "cubic-bezier(0.4, 0, 0.2, 1)", Bp = "cubic-bezier(0.0, 0, 0.2, 1)", Rp = "cubic-bezier(0.4, 0, 1, 1)";
function Hp(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
  for (; e; ) {
    if (t ? jp(e) : ja(e)) return e;
    e = e.parentElement;
  }
  return document.scrollingElement;
}
function kr(e, t) {
  const n = [];
  if (t && e && !t.contains(e)) return n;
  for (; e && (ja(e) && n.push(e), e !== t); )
    e = e.parentElement;
  return n;
}
function ja(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return t.overflowY === "scroll" || t.overflowY === "auto" && e.scrollHeight > e.clientHeight;
}
function jp(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return ["scroll", "auto"].includes(t.overflowY);
}
function zp(e) {
  for (; e; ) {
    if (window.getComputedStyle(e).position === "fixed")
      return !0;
    e = e.offsetParent;
  }
  return !1;
}
function Ee(e) {
  const t = Qe("useRender");
  t.render = e;
}
function nt(e, t, n) {
  let i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : (u) => u, o = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : (u) => u;
  const r = Qe("useProxiedModel"), s = se(e[t] !== void 0 ? e[t] : n), a = gi(t), c = y(a !== t ? () => {
    var u, m, g, h;
    return e[t], !!(((u = r.vnode.props) != null && u.hasOwnProperty(t) || (m = r.vnode.props) != null && m.hasOwnProperty(a)) && ((g = r.vnode.props) != null && g.hasOwnProperty(`onUpdate:${t}`) || (h = r.vnode.props) != null && h.hasOwnProperty(`onUpdate:${a}`)));
  } : () => {
    var u, m;
    return e[t], !!((u = r.vnode.props) != null && u.hasOwnProperty(t) && ((m = r.vnode.props) != null && m.hasOwnProperty(`onUpdate:${t}`)));
  });
  zn(() => !c.value, () => {
    be(() => e[t], (u) => {
      s.value = u;
    });
  });
  const d = y({
    get() {
      const u = e[t];
      return i(c.value ? u : s.value);
    },
    set(u) {
      const m = o(u), g = ae(c.value ? e[t] : s.value);
      g === m || i(g) === u || (s.value = m, r == null || r.emit(`update:${t}`, m));
    }
  });
  return Object.defineProperty(d, "externalValue", {
    get: () => c.value ? e[t] : s.value
  }), d;
}
const Up = {
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
}, Nu = "$vuetify.", Vu = (e, t) => e.replace(/\{(\d+)\}/g, (n, i) => String(t[+i])), uf = (e, t, n) => function(i) {
  for (var o = arguments.length, r = new Array(o > 1 ? o - 1 : 0), s = 1; s < o; s++)
    r[s - 1] = arguments[s];
  if (!i.startsWith(Nu))
    return Vu(i, r);
  const a = i.replace(Nu, ""), l = e.value && n.value[e.value], c = t.value && n.value[t.value];
  let d = Gs(l, a, null);
  return d || (Bn(`Translation key "${i}" not found in "${e.value}", trying fallback locale`), d = Gs(c, a, null)), d || (br(`Translation key "${i}" not found in fallback`), d = i), typeof d != "string" && (br(`Translation key "${i}" has a non-string value`), d = i), Vu(d, r);
};
function cf(e, t) {
  return (n, i) => new Intl.NumberFormat([e.value, t.value], i).format(n);
}
function bs(e, t, n) {
  const i = nt(e, t, e[t] ?? n.value);
  return i.value = e[t] ?? n.value, be(n, (o) => {
    e[t] == null && (i.value = n.value);
  }), i;
}
function df(e) {
  return (t) => {
    const n = bs(t, "locale", e.current), i = bs(t, "fallback", e.fallback), o = bs(t, "messages", e.messages);
    return {
      name: "vuetify",
      current: n,
      fallback: i,
      messages: o,
      t: uf(n, i, o),
      n: cf(n, i),
      provide: df({
        current: n,
        fallback: i,
        messages: o
      })
    };
  };
}
function Wp(e) {
  const t = ke((e == null ? void 0 : e.locale) ?? "en"), n = ke((e == null ? void 0 : e.fallback) ?? "en"), i = se({
    en: Up,
    ...e == null ? void 0 : e.messages
  });
  return {
    name: "vuetify",
    current: t,
    fallback: n,
    messages: i,
    t: uf(t, n, i),
    n: cf(t, n),
    provide: df({
      current: t,
      fallback: n,
      messages: i
    })
  };
}
const Cr = Symbol.for("vuetify:locale");
function qp(e) {
  return e.name != null;
}
function Kp(e) {
  const t = e != null && e.adapter && qp(e == null ? void 0 : e.adapter) ? e == null ? void 0 : e.adapter : Wp(e), n = Xp(t, e);
  return {
    ...t,
    ...n
  };
}
function Gp() {
  const e = He(Cr);
  if (!e) throw new Error("[Vuetify] Could not find injected locale instance");
  return e;
}
function Yp() {
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
function Xp(e, t) {
  const n = se((t == null ? void 0 : t.rtl) ?? Yp()), i = y(() => n.value[e.current.value] ?? !1);
  return {
    isRtl: i,
    rtl: n,
    rtlClasses: y(() => `v-locale--is-${i.value ? "rtl" : "ltr"}`)
  };
}
function fn() {
  const e = He(Cr);
  if (!e) throw new Error("[Vuetify] Could not find injected rtl instance");
  return {
    isRtl: e.isRtl,
    rtlClasses: e.rtlClasses
  };
}
const Wr = {
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
function Jp(e, t, n) {
  const i = [];
  let o = [];
  const r = ff(e), s = mf(e), a = n ?? Wr[t.slice(-2).toUpperCase()] ?? 0, l = (r.getDay() - a + 7) % 7, c = (s.getDay() - a + 7) % 7;
  for (let d = 0; d < l; d++) {
    const u = new Date(r);
    u.setDate(u.getDate() - (l - d)), o.push(u);
  }
  for (let d = 1; d <= s.getDate(); d++) {
    const u = new Date(e.getFullYear(), e.getMonth(), d);
    o.push(u), o.length === 7 && (i.push(o), o = []);
  }
  for (let d = 1; d < 7 - c; d++) {
    const u = new Date(s);
    u.setDate(u.getDate() + d), o.push(u);
  }
  return o.length > 0 && i.push(o), i;
}
function Zp(e, t, n) {
  const i = n ?? Wr[t.slice(-2).toUpperCase()] ?? 0, o = new Date(e);
  for (; o.getDay() !== i; )
    o.setDate(o.getDate() - 1);
  return o;
}
function Qp(e, t) {
  const n = new Date(e), i = ((Wr[t.slice(-2).toUpperCase()] ?? 0) + 6) % 7;
  for (; n.getDay() !== i; )
    n.setDate(n.getDate() + 1);
  return n;
}
function ff(e) {
  return new Date(e.getFullYear(), e.getMonth(), 1);
}
function mf(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 0);
}
function ey(e) {
  const t = e.split("-").map(Number);
  return new Date(t[0], t[1] - 1, t[2]);
}
const ty = /^([12]\d{3}-([1-9]|0[1-9]|1[0-2])-([1-9]|0[1-9]|[12]\d|3[01]))$/;
function hf(e) {
  if (e == null) return /* @__PURE__ */ new Date();
  if (e instanceof Date) return e;
  if (typeof e == "string") {
    let t;
    if (ty.test(e))
      return ey(e);
    if (t = Date.parse(e), !isNaN(t)) return new Date(t);
  }
  return null;
}
const Ou = new Date(2e3, 0, 2);
function ny(e, t) {
  const n = t ?? Wr[e.slice(-2).toUpperCase()] ?? 0;
  return Ia(7).map((i) => {
    const o = new Date(Ou);
    return o.setDate(Ou.getDate() + n + i), new Intl.DateTimeFormat(e, {
      weekday: "narrow"
    }).format(o);
  });
}
function iy(e, t, n, i) {
  const o = hf(e) ?? /* @__PURE__ */ new Date(), r = i == null ? void 0 : i[t];
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
      const a = o.getDate(), l = new Intl.DateTimeFormat(n, {
        month: "long"
      }).format(o);
      return `${a} ${l}`;
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
function oy(e, t) {
  const n = e.toJsDate(t), i = n.getFullYear(), o = du(String(n.getMonth() + 1), 2, "0"), r = du(String(n.getDate()), 2, "0");
  return `${i}-${o}-${r}`;
}
function ry(e) {
  const [t, n, i] = e.split("-").map(Number);
  return new Date(t, n - 1, i);
}
function sy(e, t) {
  const n = new Date(e);
  return n.setMinutes(n.getMinutes() + t), n;
}
function ay(e, t) {
  const n = new Date(e);
  return n.setHours(n.getHours() + t), n;
}
function ly(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}
function uy(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t * 7), n;
}
function cy(e, t) {
  const n = new Date(e);
  return n.setDate(1), n.setMonth(n.getMonth() + t), n;
}
function dy(e) {
  return e.getFullYear();
}
function fy(e) {
  return e.getMonth();
}
function my(e) {
  return e.getDate();
}
function hy(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 1);
}
function vy(e) {
  return new Date(e.getFullYear(), e.getMonth() - 1, 1);
}
function gy(e) {
  return e.getHours();
}
function py(e) {
  return e.getMinutes();
}
function yy(e) {
  return new Date(e.getFullYear(), 0, 1);
}
function _y(e) {
  return new Date(e.getFullYear(), 11, 31);
}
function by(e, t) {
  return Er(e, t[0]) && ky(e, t[1]);
}
function wy(e) {
  const t = new Date(e);
  return t instanceof Date && !isNaN(t.getTime());
}
function Er(e, t) {
  return e.getTime() > t.getTime();
}
function Sy(e, t) {
  return Er(Zs(e), Zs(t));
}
function ky(e, t) {
  return e.getTime() < t.getTime();
}
function Tu(e, t) {
  return e.getTime() === t.getTime();
}
function Cy(e, t) {
  return e.getDate() === t.getDate() && e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function Ey(e, t) {
  return e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function xy(e, t) {
  return e.getFullYear() === t.getFullYear();
}
function Ny(e, t, n) {
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
function Vy(e, t) {
  const n = new Date(e);
  return n.setHours(t), n;
}
function Oy(e, t) {
  const n = new Date(e);
  return n.setMinutes(t), n;
}
function Ty(e, t) {
  const n = new Date(e);
  return n.setMonth(t), n;
}
function Ay(e, t) {
  const n = new Date(e);
  return n.setDate(t), n;
}
function Dy(e, t) {
  const n = new Date(e);
  return n.setFullYear(t), n;
}
function Zs(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
}
function Iy(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
}
class Py {
  constructor(t) {
    this.locale = t.locale, this.formats = t.formats;
  }
  date(t) {
    return hf(t);
  }
  toJsDate(t) {
    return t;
  }
  toISO(t) {
    return oy(this, t);
  }
  parseISO(t) {
    return ry(t);
  }
  addMinutes(t, n) {
    return sy(t, n);
  }
  addHours(t, n) {
    return ay(t, n);
  }
  addDays(t, n) {
    return ly(t, n);
  }
  addWeeks(t, n) {
    return uy(t, n);
  }
  addMonths(t, n) {
    return cy(t, n);
  }
  getWeekArray(t, n) {
    return Jp(t, this.locale, n ? Number(n) : void 0);
  }
  startOfWeek(t, n) {
    return Zp(t, this.locale, n ? Number(n) : void 0);
  }
  endOfWeek(t) {
    return Qp(t, this.locale);
  }
  startOfMonth(t) {
    return ff(t);
  }
  endOfMonth(t) {
    return mf(t);
  }
  format(t, n) {
    return iy(t, n, this.locale, this.formats);
  }
  isEqual(t, n) {
    return Tu(t, n);
  }
  isValid(t) {
    return wy(t);
  }
  isWithinRange(t, n) {
    return by(t, n);
  }
  isAfter(t, n) {
    return Er(t, n);
  }
  isAfterDay(t, n) {
    return Sy(t, n);
  }
  isBefore(t, n) {
    return !Er(t, n) && !Tu(t, n);
  }
  isSameDay(t, n) {
    return Cy(t, n);
  }
  isSameMonth(t, n) {
    return Ey(t, n);
  }
  isSameYear(t, n) {
    return xy(t, n);
  }
  setMinutes(t, n) {
    return Oy(t, n);
  }
  setHours(t, n) {
    return Vy(t, n);
  }
  setMonth(t, n) {
    return Ty(t, n);
  }
  setDate(t, n) {
    return Ay(t, n);
  }
  setYear(t, n) {
    return Dy(t, n);
  }
  getDiff(t, n, i) {
    return Ny(t, n, i);
  }
  getWeekdays(t) {
    return ny(this.locale, t ? Number(t) : void 0);
  }
  getYear(t) {
    return dy(t);
  }
  getMonth(t) {
    return fy(t);
  }
  getDate(t) {
    return my(t);
  }
  getNextMonth(t) {
    return hy(t);
  }
  getPreviousMonth(t) {
    return vy(t);
  }
  getHours(t) {
    return gy(t);
  }
  getMinutes(t) {
    return py(t);
  }
  startOfDay(t) {
    return Zs(t);
  }
  endOfDay(t) {
    return Iy(t);
  }
  startOfYear(t) {
    return yy(t);
  }
  endOfYear(t) {
    return _y(t);
  }
}
const $y = Symbol.for("vuetify:date-options"), Au = Symbol.for("vuetify:date-adapter");
function My(e, t) {
  const n = Tt({
    adapter: Py,
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
    instance: Ly(n, t)
  };
}
function Ly(e, t) {
  const n = ct(typeof e.adapter == "function" ? new e.adapter({
    locale: e.locale[t.current.value] ?? t.current.value,
    formats: e.formats
  }) : e.adapter);
  return be(t.current, (i) => {
    n.locale = e.locale[i] ?? i ?? n.locale;
  }), n;
}
const qr = ["sm", "md", "lg", "xl", "xxl"], Qs = Symbol.for("vuetify:display"), Du = {
  mobileBreakpoint: "lg",
  thresholds: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
    xxl: 2560
  }
}, Fy = function() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Du;
  return Tt(Du, e);
};
function Iu(e) {
  return ze && !e ? window.innerWidth : typeof e == "object" && e.clientWidth || 0;
}
function Pu(e) {
  return ze && !e ? window.innerHeight : typeof e == "object" && e.clientHeight || 0;
}
function $u(e) {
  const t = ze && !e ? window.navigator.userAgent : "ssr";
  function n(h) {
    return !!t.match(h);
  }
  const i = n(/android/i), o = n(/iphone|ipad|ipod/i), r = n(/cordova/i), s = n(/electron/i), a = n(/chrome/i), l = n(/edge/i), c = n(/firefox/i), d = n(/opera/i), u = n(/win/i), m = n(/mac/i), g = n(/linux/i);
  return {
    android: i,
    ios: o,
    cordova: r,
    electron: s,
    chrome: a,
    edge: l,
    firefox: c,
    opera: d,
    win: u,
    mac: m,
    linux: g,
    touch: tp,
    ssr: t === "ssr"
  };
}
function By(e, t) {
  const {
    thresholds: n,
    mobileBreakpoint: i
  } = Fy(e), o = ke(Pu(t)), r = ke($u(t)), s = ct({}), a = ke(Iu(t));
  function l() {
    o.value = Pu(), a.value = Iu();
  }
  function c() {
    l(), r.value = $u();
  }
  return Jt(() => {
    const d = a.value < n.sm, u = a.value < n.md && !d, m = a.value < n.lg && !(u || d), g = a.value < n.xl && !(m || u || d), h = a.value < n.xxl && !(g || m || u || d), v = a.value >= n.xxl, _ = d ? "xs" : u ? "sm" : m ? "md" : g ? "lg" : h ? "xl" : "xxl", k = typeof i == "number" ? i : n[i], O = a.value < k;
    s.xs = d, s.sm = u, s.md = m, s.lg = g, s.xl = h, s.xxl = v, s.smAndUp = !d, s.mdAndUp = !(d || u), s.lgAndUp = !(d || u || m), s.xlAndUp = !(d || u || m || g), s.smAndDown = !(m || g || h || v), s.mdAndDown = !(g || h || v), s.lgAndDown = !(h || v), s.xlAndDown = !v, s.name = _, s.height = o.value, s.width = a.value, s.mobile = O, s.mobileBreakpoint = i, s.platform = r.value, s.thresholds = n;
  }), ze && window.addEventListener("resize", l, {
    passive: !0
  }), {
    ...pa(s),
    update: c,
    ssr: !!t
  };
}
function Ry() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn();
  const n = He(Qs);
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
const Hy = Symbol.for("vuetify:goto");
function jy() {
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
function zy(e, t) {
  return {
    rtl: t.isRtl,
    options: Tt(jy(), e)
  };
}
const Uy = {
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
}, Wy = {
  // Not using mergeProps here, functional components merge props by default (?)
  component: (e) => Un(gf, {
    ...e,
    class: "mdi"
  })
}, Xe = [String, Function, Object, Array], ea = Symbol.for("vuetify:icons"), Kr = J({
  icon: {
    type: Xe
  },
  // Could not remove this and use makeTagProps, types complained because it is not required
  tag: {
    type: String,
    required: !0
  }
}, "icon"), Mu = ve()({
  name: "VComponentIcon",
  props: Kr(),
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
}), vf = Ui({
  name: "VSvgIcon",
  inheritAttrs: !1,
  props: Kr(),
  setup(e, t) {
    let {
      attrs: n
    } = t;
    return () => f(e.tag, Oe(n, {
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
Ui({
  name: "VLigatureIcon",
  props: Kr(),
  setup(e) {
    return () => f(e.tag, null, {
      default: () => [e.icon]
    });
  }
});
const gf = Ui({
  name: "VClassIcon",
  props: Kr(),
  setup(e) {
    return () => f(e.tag, {
      class: e.icon
    }, null);
  }
});
function qy() {
  return {
    svg: {
      component: vf
    },
    class: {
      component: gf
    }
  };
}
function Ky(e) {
  const t = qy(), n = (e == null ? void 0 : e.defaultSet) ?? "mdi";
  return n === "mdi" && !t.mdi && (t.mdi = Wy), Tt({
    defaultSet: n,
    sets: t,
    aliases: {
      ...Uy,
      /* eslint-disable max-len */
      vuetify: ["M8.2241 14.2009L12 21L22 3H14.4459L8.2241 14.2009Z", ["M7.26303 12.4733L7.00113 12L2 3H12.5261C12.5261 3 12.5261 3 12.5261 3L7.26303 12.4733Z", 0.6]],
      "vuetify-outline": "svg:M7.26 12.47 12.53 3H2L7.26 12.47ZM14.45 3 8.22 14.2 12 21 22 3H14.45ZM18.6 5 12 16.88 10.51 14.2 15.62 5ZM7.26 8.35 5.4 5H9.13L7.26 8.35Z",
      "vuetify-play": ["m6.376 13.184-4.11-7.192C1.505 4.66 2.467 3 4.003 3h8.532l-.953 1.576-.006.01-.396.677c-.429.732-.214 1.507.194 2.015.404.503 1.092.878 1.869.806a3.72 3.72 0 0 1 1.005.022c.276.053.434.143.523.237.138.146.38.635-.25 2.09-.893 1.63-1.553 1.722-1.847 1.677-.213-.033-.468-.158-.756-.406a4.95 4.95 0 0 1-.8-.927c-.39-.564-1.04-.84-1.66-.846-.625-.006-1.316.27-1.693.921l-.478.826-.911 1.506Z", ["M9.093 11.552c.046-.079.144-.15.32-.148a.53.53 0 0 1 .43.207c.285.414.636.847 1.046 1.2.405.35.914.662 1.516.754 1.334.205 2.502-.698 3.48-2.495l.014-.028.013-.03c.687-1.574.774-2.852-.005-3.675-.37-.391-.861-.586-1.333-.676a5.243 5.243 0 0 0-1.447-.044c-.173.016-.393-.073-.54-.257-.145-.18-.127-.316-.082-.392l.393-.672L14.287 3h5.71c1.536 0 2.499 1.659 1.737 2.992l-7.997 13.996c-.768 1.344-2.706 1.344-3.473 0l-3.037-5.314 1.377-2.278.004-.006.004-.007.481-.831Z", 0.6]]
      /* eslint-enable max-len */
    }
  }, e);
}
const Gy = (e) => {
  const t = He(ea);
  if (!t) throw new Error("Missing Vuetify Icons provide!");
  return {
    iconData: y(() => {
      var l;
      const i = rn(e);
      if (!i) return {
        component: Mu
      };
      let o = i;
      if (typeof o == "string" && (o = o.trim(), o.startsWith("$") && (o = (l = t.aliases) == null ? void 0 : l[o.slice(1)])), o || Bn(`Could not find aliased icon "${i}"`), Array.isArray(o))
        return {
          component: vf,
          icon: o
        };
      if (typeof o != "string")
        return {
          component: Mu,
          icon: o
        };
      const r = Object.keys(t.sets).find((c) => typeof o == "string" && o.startsWith(`${c}:`)), s = r ? o.slice(r.length + 1) : o;
      return {
        component: t.sets[r ?? t.defaultSet].component,
        icon: s
      };
    })
  };
}, go = Symbol.for("vuetify:theme"), at = J({
  theme: String
}, "theme");
function Lu() {
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
function Yy() {
  var i, o;
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Lu();
  const t = Lu();
  if (!e) return {
    ...t,
    isDisabled: !0
  };
  const n = {};
  for (const [r, s] of Object.entries(e.themes ?? {})) {
    const a = s.dark || r === "dark" ? (i = t.themes) == null ? void 0 : i.dark : (o = t.themes) == null ? void 0 : o.light;
    n[r] = Tt(a, s);
  }
  return Tt(t, {
    ...e,
    themes: n
  });
}
function Xy(e) {
  const t = Yy(e), n = se(t.defaultTheme), i = se(t.themes), o = y(() => {
    const d = {};
    for (const [u, m] of Object.entries(i.value)) {
      const g = d[u] = {
        ...m,
        colors: {
          ...m.colors
        }
      };
      if (t.variations)
        for (const h of t.variations.colors) {
          const v = g.colors[h];
          if (v)
            for (const _ of ["lighten", "darken"]) {
              const k = _ === "lighten" ? Dp : Ip;
              for (const O of Ia(t.variations[_], 1))
                g.colors[`${h}-${_}-${O}`] = Op(k(sn(v), O));
            }
        }
      for (const h of Object.keys(g.colors)) {
        if (/^on-[a-z]/.test(h) || g.colors[`on-${h}`]) continue;
        const v = `on-${h}`, _ = sn(g.colors[h]);
        g.colors[v] = sf(_);
      }
    }
    return d;
  }), r = y(() => o.value[n.value]), s = y(() => {
    var h;
    const d = [];
    (h = r.value) != null && h.dark && ii(d, ":root", ["color-scheme: dark"]), ii(d, ":root", Fu(r.value));
    for (const [v, _] of Object.entries(o.value))
      ii(d, `.v-theme--${v}`, [`color-scheme: ${_.dark ? "dark" : "normal"}`, ...Fu(_)]);
    const u = [], m = [], g = new Set(Object.values(o.value).flatMap((v) => Object.keys(v.colors)));
    for (const v of g)
      /^on-[a-z]/.test(v) ? ii(m, `.${v}`, [`color: rgb(var(--v-theme-${v})) !important`]) : (ii(u, `.bg-${v}`, [`--v-theme-overlay-multiplier: var(--v-theme-${v}-overlay-multiplier)`, `background-color: rgb(var(--v-theme-${v})) !important`, `color: rgb(var(--v-theme-on-${v})) !important`]), ii(m, `.text-${v}`, [`color: rgb(var(--v-theme-${v})) !important`]), ii(m, `.border-${v}`, [`--v-border-color: var(--v-theme-${v})`]));
    return d.push(...u, ...m), d.map((v, _) => _ === 0 ? v : `    ${v}`).join("");
  });
  function a() {
    return {
      style: [{
        children: s.value,
        id: "vuetify-theme-stylesheet",
        nonce: t.cspNonce || !1
      }]
    };
  }
  function l(d) {
    if (t.isDisabled) return;
    const u = d._context.provides.usehead;
    if (u)
      if (u.push) {
        const m = u.push(a);
        ze && be(s, () => {
          m.patch(a);
        });
      } else
        ze ? (u.addHeadObjs(y(a)), Jt(() => u.updateDOM())) : u.addHeadObjs(a());
    else {
      let g = function() {
        if (typeof document < "u" && !m) {
          const h = document.createElement("style");
          h.type = "text/css", h.id = "vuetify-theme-stylesheet", t.cspNonce && h.setAttribute("nonce", t.cspNonce), m = h, document.head.appendChild(m);
        }
        m && (m.innerHTML = s.value);
      }, m = ze ? document.getElementById("vuetify-theme-stylesheet") : null;
      ze ? be(s, g, {
        immediate: !0
      }) : g();
    }
  }
  const c = y(() => t.isDisabled ? void 0 : `v-theme--${n.value}`);
  return {
    install: l,
    isDisabled: t.isDisabled,
    name: n,
    themes: i,
    current: r,
    computedThemes: o,
    themeClasses: c,
    styles: s,
    global: {
      name: n,
      current: r
    }
  };
}
function pt(e) {
  Qe("provideTheme");
  const t = He(go, null);
  if (!t) throw new Error("Could not find Vuetify theme injection");
  const n = y(() => e.theme ?? t.name.value), i = y(() => t.themes.value[n.value]), o = y(() => t.isDisabled ? void 0 : `v-theme--${n.value}`), r = {
    ...t,
    name: n,
    current: i,
    themeClasses: o
  };
  return Et(go, r), r;
}
function Jy() {
  Qe("useTheme");
  const e = He(go, null);
  if (!e) throw new Error("Could not find Vuetify theme injection");
  return e;
}
function ii(e, t, n) {
  e.push(`${t} {
`, ...n.map((i) => `  ${i};
`), `}
`);
}
function Fu(e) {
  const t = e.dark ? 2 : 1, n = e.dark ? 1 : 2, i = [];
  for (const [o, r] of Object.entries(e.colors)) {
    const s = sn(r);
    i.push(`--v-theme-${o}: ${s.r},${s.g},${s.b}`), o.startsWith("on-") || i.push(`--v-theme-${o}-overlay-multiplier: ${Pp(r) > 0.18 ? t : n}`);
  }
  for (const [o, r] of Object.entries(e.variables)) {
    const s = typeof r == "string" && r.startsWith("#") ? sn(r) : void 0, a = s ? `${s.r}, ${s.g}, ${s.b}` : void 0;
    i.push(`--v-${o}: ${a ?? r}`);
  }
  return i;
}
function pf(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "content";
  const n = Ys(), i = se();
  if (ze) {
    const o = new ResizeObserver((r) => {
      r.length && (t === "content" ? i.value = r[0].contentRect : i.value = r[0].target.getBoundingClientRect());
    });
    gt(() => {
      o.disconnect();
    }), be(() => n.el, (r, s) => {
      s && (o.unobserve(s), i.value = void 0), r && o.observe(r);
    }, {
      flush: "post"
    });
  }
  return {
    resizeRef: n,
    contentRect: Eo(i)
  };
}
const po = Symbol.for("vuetify:layout"), yf = Symbol.for("vuetify:layout-item"), Bu = 1e3, Zy = J({
  overlaps: {
    type: Array,
    default: () => []
  },
  fullHeight: Boolean
}, "layout"), _f = J({
  name: {
    type: String
  },
  order: {
    type: [Number, String],
    default: 0
  },
  absolute: Boolean
}, "layout-item");
function bf() {
  const e = He(po);
  if (!e) throw new Error("[Vuetify] Could not find injected layout");
  return {
    getLayoutItem: e.getLayoutItem,
    mainRect: e.mainRect,
    mainStyles: e.mainStyles
  };
}
function wf(e) {
  const t = He(po);
  if (!t) throw new Error("[Vuetify] Could not find injected layout");
  const n = e.id ?? `layout-item-${Zt()}`, i = Qe("useLayoutItem");
  Et(yf, {
    id: n
  });
  const o = ke(!1);
  sd(() => o.value = !0), rd(() => o.value = !1);
  const {
    layoutItemStyles: r,
    layoutItemScrimStyles: s
  } = t.register(i, {
    ...e,
    active: y(() => o.value ? !1 : e.active.value),
    id: n
  });
  return gt(() => t.unregister(n)), {
    layoutItemStyles: r,
    layoutRect: t.layoutRect,
    layoutItemScrimStyles: s
  };
}
const Qy = (e, t, n, i) => {
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
    const a = t.get(s), l = n.get(s), c = i.get(s);
    if (!a || !l || !c) continue;
    const d = {
      ...o,
      [a.value]: parseInt(o[a.value], 10) + (c.value ? parseInt(l.value, 10) : 0)
    };
    r.push({
      id: s,
      layer: d
    }), o = d;
  }
  return r;
};
function e_(e) {
  const t = He(po, null), n = y(() => t ? t.rootZIndex.value - 100 : Bu), i = se([]), o = ct(/* @__PURE__ */ new Map()), r = ct(/* @__PURE__ */ new Map()), s = ct(/* @__PURE__ */ new Map()), a = ct(/* @__PURE__ */ new Map()), l = ct(/* @__PURE__ */ new Map()), {
    resizeRef: c,
    contentRect: d
  } = pf(), u = y(() => {
    const V = /* @__PURE__ */ new Map(), F = e.overlaps ?? [];
    for (const x of F.filter((N) => N.includes(":"))) {
      const [N, $] = x.split(":");
      if (!i.value.includes(N) || !i.value.includes($)) continue;
      const E = o.get(N), w = o.get($), A = r.get(N), M = r.get($);
      !E || !w || !A || !M || (V.set($, {
        position: E.value,
        amount: parseInt(A.value, 10)
      }), V.set(N, {
        position: w.value,
        amount: -parseInt(M.value, 10)
      }));
    }
    return V;
  }), m = y(() => {
    const V = [...new Set([...s.values()].map((x) => x.value))].sort((x, N) => x - N), F = [];
    for (const x of V) {
      const N = i.value.filter(($) => {
        var E;
        return ((E = s.get($)) == null ? void 0 : E.value) === x;
      });
      F.push(...N);
    }
    return Qy(F, o, r, a);
  }), g = y(() => !Array.from(l.values()).some((V) => V.value)), h = y(() => m.value[m.value.length - 1].layer), v = y(() => ({
    "--v-layout-left": he(h.value.left),
    "--v-layout-right": he(h.value.right),
    "--v-layout-top": he(h.value.top),
    "--v-layout-bottom": he(h.value.bottom),
    ...g.value ? void 0 : {
      transition: "none"
    }
  })), _ = y(() => m.value.slice(1).map((V, F) => {
    let {
      id: x
    } = V;
    const {
      layer: N
    } = m.value[F], $ = r.get(x), E = o.get(x);
    return {
      id: x,
      ...N,
      size: Number($.value),
      position: E.value
    };
  })), k = (V) => _.value.find((F) => F.id === V), O = Qe("createLayout"), P = ke(!1);
  cn(() => {
    P.value = !0;
  }), Et(po, {
    register: (V, F) => {
      let {
        id: x,
        order: N,
        position: $,
        layoutSize: E,
        elementSize: w,
        active: A,
        disableTransitions: M,
        absolute: ee
      } = F;
      s.set(x, N), o.set(x, $), r.set(x, E), a.set(x, A), M && l.set(x, M);
      const ne = Ai(yf, O == null ? void 0 : O.vnode).indexOf(V);
      ne > -1 ? i.value.splice(ne, 0, x) : i.value.push(x);
      const G = y(() => _.value.findIndex((de) => de.id === x)), Se = y(() => n.value + m.value.length * 2 - G.value * 2), xe = y(() => {
        const de = $.value === "left" || $.value === "right", Te = $.value === "right", Je = $.value === "bottom", Ge = w.value ?? E.value, Z = Ge === 0 ? "%" : "px", ye = {
          [$.value]: 0,
          zIndex: Se.value,
          transform: `translate${de ? "X" : "Y"}(${(A.value ? 0 : -(Ge === 0 ? 100 : Ge)) * (Te || Je ? -1 : 1)}${Z})`,
          position: ee.value || n.value !== Bu ? "absolute" : "fixed",
          ...g.value ? void 0 : {
            transition: "none"
          }
        };
        if (!P.value) return ye;
        const De = _.value[G.value];
        if (!De) throw new Error(`[Vuetify] Could not find layout item "${x}"`);
        const lt = u.value.get(x);
        return lt && (De[lt.position] += lt.amount), {
          ...ye,
          height: de ? `calc(100% - ${De.top}px - ${De.bottom}px)` : w.value ? `${w.value}px` : void 0,
          left: Te ? void 0 : `${De.left}px`,
          right: Te ? `${De.right}px` : void 0,
          top: $.value !== "bottom" ? `${De.top}px` : void 0,
          bottom: $.value !== "top" ? `${De.bottom}px` : void 0,
          width: de ? w.value ? `${w.value}px` : void 0 : `calc(100% - ${De.left}px - ${De.right}px)`
        };
      }), we = y(() => ({
        zIndex: Se.value - 1
      }));
      return {
        layoutItemStyles: xe,
        layoutItemScrimStyles: we,
        zIndex: Se
      };
    },
    unregister: (V) => {
      s.delete(V), o.delete(V), r.delete(V), a.delete(V), l.delete(V), i.value = i.value.filter((F) => F !== V);
    },
    mainRect: h,
    mainStyles: v,
    getLayoutItem: k,
    items: _,
    layoutRect: d,
    rootZIndex: n
  });
  const B = y(() => ["v-layout", {
    "v-layout--full-height": e.fullHeight
  }]), C = y(() => ({
    zIndex: t ? n.value : void 0,
    position: t ? "relative" : void 0,
    overflow: t ? "hidden" : void 0
  }));
  return {
    layoutClasses: B,
    layoutStyles: C,
    getLayoutItem: k,
    items: _,
    layoutRect: d,
    layoutRef: c
  };
}
function Sf() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const {
    blueprint: t,
    ...n
  } = e, i = Tt(t, n), {
    aliases: o = {},
    components: r = {},
    directives: s = {}
  } = i, a = Mp(i.defaults), l = By(i.display, i.ssr), c = Xy(i.theme), d = Ky(i.icons), u = Kp(i.locale), m = My(i.date, u), g = zy(i.goTo, u);
  return {
    install: (v) => {
      for (const _ in s)
        v.directive(_, s[_]);
      for (const _ in r)
        v.component(_, r[_]);
      for (const _ in o)
        v.component(_, Ui({
          ...o[_],
          name: _,
          aliasName: o[_].name
        }));
      if (c.install(v), v.provide(Ri, a), v.provide(Qs, l), v.provide(go, c), v.provide(ea, d), v.provide(Cr, u), v.provide($y, m.options), v.provide(Au, m.instance), v.provide(Hy, g), ze && i.ssr)
        if (v.$nuxt)
          v.$nuxt.hook("app:suspense:resolve", () => {
            l.update();
          });
        else {
          const {
            mount: _
          } = v;
          v.mount = function() {
            const k = _(...arguments);
            return ft(() => l.update()), v.mount = _, k;
          };
        }
      Zt.reset(), v.mixin({
        computed: {
          $vuetify() {
            return ct({
              defaults: Vi.call(this, Ri),
              display: Vi.call(this, Qs),
              theme: Vi.call(this, go),
              icons: Vi.call(this, ea),
              locale: Vi.call(this, Cr),
              date: Vi.call(this, Au)
            });
          }
        }
      });
    },
    defaults: a,
    display: l,
    theme: c,
    icons: d,
    locale: u,
    date: m,
    goTo: g
  };
}
const t_ = "3.7.4";
Sf.version = t_;
function Vi(e) {
  var i, o;
  const t = this.$, n = ((i = t.parent) == null ? void 0 : i.provides) ?? ((o = t.vnode.appContext) == null ? void 0 : o.provides);
  if (n && e in n)
    return n[e];
}
const n_ = import.meta.url.slice(0, import.meta.url.lastIndexOf("/") + 1) + "themes/skins/", Bt = (e) => n_ + e, Rn = [
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
    thumb: Bt("zhulin-thumb.svg"),
    portrait: Bt("zhulin-portrait.svg"),
    landscape: Bt("zhulin-landscape.svg"),
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
    thumb: Bt("parchment-thumb.svg"),
    portrait: Bt("parchment-portrait.svg"),
    landscape: Bt("parchment-landscape.svg"),
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
    thumb: Bt("huitu-thumb.svg"),
    portrait: Bt("huitu-portrait.svg"),
    landscape: Bt("huitu-landscape.svg"),
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
    thumb: Bt("xingye-thumb.svg"),
    portrait: Bt("xingye-portrait.svg"),
    landscape: Bt("xingye-landscape.svg"),
    sample: "万族之上，星河为劫"
  }
];
function gn(e) {
  const t = Rn.find((n) => n.id === e);
  return t || (console.error(`[themes] 未找到主题 id="${e}"，已回退到「${Rn[0].name}」`), Rn[0]);
}
const i_ = Object.fromEntries(
  Rn.map((e) => [e.id, { dark: e.mode === "night", colors: { background: e.bg, surface: e.surface } }])
), o_ = Sf({
  theme: {
    defaultTheme: "white",
    themes: i_
  }
});
function r_(e) {
  e.use(o_);
}
const Vn = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [i, o] of t)
    n[i] = o;
  return n;
}, Ru = 16, s_ = {
  name: "PanelResizer",
  props: {
    side: { type: String, default: "right" },
    // 面板所在的一侧：left 为目录，right 为评论和设置
    width: { type: Number, required: !0 },
    min: { type: Number, default: 260 },
    max: { type: Number, default: 720 },
    label: { type: String, default: "调整面板宽度" }
  },
  emits: ["update:width", "commit", "reset"],
  data: () => ({ dragging: !1, start_x: 0, start_width: 0 }),
  computed: {
    // 热区以面板边界为中心：左侧面板的边界在 width 处，右侧面板的边界在 100% - width 处；分隔线画在热区内 4px。
    edge_style: function() {
      return { left: this.side === "left" ? `calc(${this.width}px - 4px)` : `calc(100% - ${this.width}px - 4px)` };
    }
  },
  beforeUnmount: function() {
    this.stop();
  },
  methods: {
    clamp: function(e) {
      return Math.min(this.max, Math.max(this.min, Math.round(e)));
    },
    start: function(e) {
      if (e.button === 0) {
        e.preventDefault(), this.dragging = !0, this.start_x = e.clientX, this.start_width = this.width;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
        }
        this.$el.addEventListener("pointermove", this.move), this.$el.addEventListener("pointerup", this.end), this.$el.addEventListener("pointercancel", this.end), document.body.classList.add("resizing-pane");
      }
    },
    move: function(e) {
      if (!this.dragging) return;
      const t = this.side === "left" ? 1 : -1;
      this.$emit("update:width", this.clamp(this.start_width + t * (e.clientX - this.start_x)));
    },
    end: function() {
      this.dragging && (this.stop(), this.$emit("commit"));
    },
    stop: function() {
      var e, t, n, i, o, r;
      this.dragging = !1, (t = (e = this.$el) == null ? void 0 : e.removeEventListener) == null || t.call(e, "pointermove", this.move), (i = (n = this.$el) == null ? void 0 : n.removeEventListener) == null || i.call(n, "pointerup", this.end), (r = (o = this.$el) == null ? void 0 : o.removeEventListener) == null || r.call(o, "pointercancel", this.end), document.body.classList.remove("resizing-pane");
    },
    on_key: function(e) {
      let t = null;
      if (e.key === "ArrowLeft") t = this.width - Ru * (this.side === "left" ? 1 : -1);
      else if (e.key === "ArrowRight") t = this.width + Ru * (this.side === "left" ? 1 : -1);
      else if (e.key !== "Home") return;
      if (e.preventDefault(), e.stopPropagation(), t === null) return this.$emit("reset");
      this.$emit("update:width", this.clamp(t)), this.$emit("commit");
    }
  }
}, a_ = ["aria-label", "aria-valuenow", "aria-valuemin", "aria-valuemax"];
function l_(e, t, n, i, o, r) {
  return X(), ce("div", {
    class: Vt(["panel-resizer", { dragging: e.dragging }]),
    style: Rt(r.edge_style),
    role: "separator",
    "aria-orientation": "vertical",
    "aria-label": n.label,
    "aria-valuenow": Math.round(n.width),
    "aria-valuemin": n.min,
    "aria-valuemax": n.max,
    tabindex: "0",
    onPointerdown: t[0] || (t[0] = (...s) => r.start && r.start(...s)),
    onKeydown: t[1] || (t[1] = (...s) => r.on_key && r.on_key(...s)),
    onDblclick: t[2] || (t[2] = (s) => e.$emit("reset"))
  }, t[3] || (t[3] = [
    R("span", {
      class: "panel-resizer-knob",
      "aria-hidden": "true"
    }, null, -1)
  ]), 46, a_);
}
const kf = /* @__PURE__ */ Vn(s_, [["render", l_], ["__scopeId", "data-v-a8bdb411"]]);
function za(e) {
  return La(() => {
    const t = [], n = {};
    if (e.value.background)
      if (Js(e.value.background)) {
        if (n.backgroundColor = e.value.background, !e.value.text && Np(e.value.background)) {
          const i = sn(e.value.background);
          if (i.a == null || i.a === 1) {
            const o = sf(i);
            n.color = o, n.caretColor = o;
          }
        }
      } else
        t.push(`bg-${e.value.background}`);
    return e.value.text && (Js(e.value.text) ? (n.color = e.value.text, n.caretColor = e.value.text) : t.push(`text-${e.value.text}`)), {
      colorClasses: t,
      colorStyles: n
    };
  });
}
function un(e, t) {
  const n = y(() => ({
    text: Be(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: i,
    colorStyles: o
  } = za(n);
  return {
    textColorClasses: i,
    textColorStyles: o
  };
}
function jt(e, t) {
  const n = y(() => ({
    background: Be(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: i,
    colorStyles: o
  } = za(n);
  return {
    backgroundColorClasses: i,
    backgroundColorStyles: o
  };
}
const u_ = ["x-small", "small", "default", "large", "x-large"], Gr = J({
  size: {
    type: [String, Number],
    default: "default"
  }
}, "size");
function Yr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn();
  return La(() => {
    let n, i;
    return _r(u_, e.size) ? n = `${t}--size-${e.size}` : e.size && (i = {
      width: he(e.size),
      height: he(e.size)
    }), {
      sizeClasses: n,
      sizeStyles: i
    };
  });
}
const it = J({
  tag: {
    type: String,
    default: "div"
  }
}, "tag"), c_ = J({
  color: String,
  disabled: Boolean,
  start: Boolean,
  end: Boolean,
  icon: Xe,
  ...Ne(),
  ...Gr(),
  ...it({
    tag: "i"
  }),
  ...at()
}, "VIcon"), Ve = ve()({
  name: "VIcon",
  props: c_(),
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const o = se(), {
      themeClasses: r
    } = pt(e), {
      iconData: s
    } = Gy(y(() => o.value || e.icon)), {
      sizeClasses: a
    } = Yr(e), {
      textColorClasses: l,
      textColorStyles: c
    } = un(le(e, "color"));
    return Ee(() => {
      var m, g;
      const d = (m = i.default) == null ? void 0 : m.call(i);
      d && (o.value = (g = Gd(d).filter((h) => h.type === ki && h.children && typeof h.children == "string")[0]) == null ? void 0 : g.children);
      const u = !!(n.onClick || n.onClickOnce);
      return f(s.value.component, {
        tag: e.tag,
        icon: s.value.icon,
        class: ["v-icon", "notranslate", r.value, a.value, l.value, {
          "v-icon--clickable": u,
          "v-icon--disabled": e.disabled,
          "v-icon--start": e.start,
          "v-icon--end": e.end
        }, e.class],
        style: [a.value ? void 0 : {
          fontSize: he(e.size),
          height: he(e.size),
          width: he(e.size)
        }, c.value, e.style],
        role: u ? "button" : void 0,
        "aria-hidden": !u,
        tabindex: u ? e.disabled ? -1 : 0 : void 0
      }, {
        default: () => [d]
      });
    }), {};
  }
}), d_ = {
  name: "CommentItem",
  emits: ["open", "edit", "remove", "vote", "reply"],
  props: {
    record: { type: Object, required: !0 },
    // 列表中的主评论整条可点，进入评论详情页。
    clickable: { type: Boolean, default: !1 },
    // 「我的」与私密详情里显示类型标签（划线、整书评论）；私密标记不受此限，总在右下角显示。
    tags: { type: Boolean, default: !1 },
    // 主评论转为私密后，其下回复只读。
    readonly: { type: Boolean, default: !1 }
  },
  computed: {
    is_reply: function() {
      return !!this.record.root_id;
    },
    is_private: function() {
      return !this.is_reply && this.record.is_private !== !1;
    },
    interactive: function() {
      return !this.readonly && !this.is_private;
    },
    manageable: function() {
      return !!this.record.is_mine && !this.readonly;
    },
    private_replies: function() {
      return this.clickable && this.is_private && this.record.reply_count > 0;
    },
    reply_text: function() {
      return this.is_reply ? "回复" : `回复 ${this.record.reply_count || 0}`;
    },
    time_text: function() {
      const e = this.record.created_at, t = e ? new Date(e) : null;
      if (!t || Number.isNaN(t.getTime())) return e || "";
      const n = Math.floor((Date.now() - t.getTime()) / 6e4);
      return n < 1 ? "刚刚" : n < 60 ? `${n} 分钟前` : n < 60 * 24 ? `${Math.floor(n / 60)} 小时前` : n < 60 * 24 * 30 ? `${Math.floor(n / 60 / 24)} 天前` : `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    }
  },
  methods: {
    on_click: function() {
      this.clickable && !String(window.getSelection()) && this.$emit("open", this.record);
    }
  }
}, f_ = ["data-comment", "data-mine"], m_ = { class: "comment-meta" }, h_ = { class: "comment-author" }, v_ = {
  key: 0,
  class: "comment-tag"
}, g_ = {
  key: 1,
  class: "comment-tag"
}, p_ = { class: "comment-time" }, y_ = { class: "comment-content" }, __ = {
  key: 0,
  class: "comment-reply-to"
}, b_ = {
  key: 0,
  class: "comment-footer"
}, w_ = {
  key: 0,
  class: "comment-actions"
}, S_ = ["aria-pressed", "aria-label"], k_ = ["aria-pressed", "aria-label"], C_ = {
  key: 1,
  class: "comment-actions"
}, E_ = {
  key: 2,
  class: "comment-end"
}, x_ = {
  key: 0,
  class: "comment-private"
};
function N_(e, t, n, i, o, r) {
  return X(), ce("article", {
    class: Vt(["comment-item", { "comment-item--link": n.clickable }]),
    "data-comment": n.record.id,
    "data-mine": String(!!n.record.is_mine),
    onClick: t[6] || (t[6] = (...s) => r.on_click && r.on_click(...s))
  }, [
    R("div", m_, [
      R("span", h_, _e(n.record.author_name || "书友"), 1),
      n.tags && n.record.annotation_type === "highlight" ? (X(), ce("span", v_, "划线")) : Re("", !0),
      n.tags && n.record.annotation_type === "book_comment" ? (X(), ce("span", g_, "整书评论")) : Re("", !0),
      R("time", p_, _e(r.time_text), 1)
    ]),
    R("p", y_, [
      n.record.reply_to_name ? (X(), ce("span", __, "回复 " + _e(n.record.reply_to_name) + "：", 1)) : Re("", !0),
      te(_e(n.record.content || n.record.quote_text), 1)
    ]),
    r.interactive || r.private_replies || r.is_private || r.manageable ? (X(), ce("div", b_, [
      r.interactive ? (X(), ce("div", w_, [
        R("button", {
          type: "button",
          class: "comment-vote",
          "aria-pressed": String(n.record.user_vote === 1),
          "aria-label": `赞 ${n.record.like_count || 0}`,
          onClick: t[0] || (t[0] = ai((s) => e.$emit("vote", n.record, 1), ["stop"]))
        }, [
          f(Ve, {
            size: "16",
            "aria-hidden": "true"
          }, {
            default: T(() => [
              te(_e(n.record.user_vote === 1 ? "mdi-thumb-up" : "mdi-thumb-up-outline"), 1)
            ]),
            _: 1
          }),
          te(_e(n.record.like_count || 0), 1)
        ], 8, S_),
        R("button", {
          type: "button",
          class: "comment-vote",
          "aria-pressed": String(n.record.user_vote === -1),
          "aria-label": `踩 ${n.record.dislike_count || 0}`,
          onClick: t[1] || (t[1] = ai((s) => e.$emit("vote", n.record, -1), ["stop"]))
        }, [
          f(Ve, {
            size: "16",
            "aria-hidden": "true"
          }, {
            default: T(() => [
              te(_e(n.record.user_vote === -1 ? "mdi-thumb-down" : "mdi-thumb-down-outline"), 1)
            ]),
            _: 1
          }),
          te(_e(n.record.dislike_count || 0), 1)
        ], 8, k_),
        R("button", {
          type: "button",
          class: "comment-reply",
          onClick: t[2] || (t[2] = ai((s) => e.$emit("reply", n.record), ["stop"]))
        }, _e(r.reply_text), 1)
      ])) : r.private_replies ? (X(), ce("div", C_, [
        R("button", {
          type: "button",
          class: "comment-reply",
          onClick: t[3] || (t[3] = ai((s) => e.$emit("reply", n.record), ["stop"]))
        }, _e(n.record.reply_count) + " 条回复 · 仅你可见", 1)
      ])) : Re("", !0),
      r.is_private || r.manageable ? (X(), ce("div", E_, [
        r.is_private ? (X(), ce("span", x_, "私密")) : Re("", !0),
        r.manageable ? (X(), ce(fe, { key: 1 }, [
          n.record.annotation_type !== "highlight" ? (X(), ce("button", {
            key: 0,
            type: "button",
            class: "comment-manage",
            onClick: t[4] || (t[4] = ai((s) => e.$emit("edit", n.record), ["stop"]))
          }, "修改")) : Re("", !0),
          R("button", {
            type: "button",
            class: "comment-manage",
            onClick: t[5] || (t[5] = ai((s) => e.$emit("remove", n.record), ["stop"]))
          }, "删除")
        ], 64)) : Re("", !0)
      ])) : Re("", !0)
    ])) : Re("", !0)
  ], 10, f_);
}
const Xr = /* @__PURE__ */ Vn(d_, [["render", N_], ["__scopeId", "data-v-e3ae5149"]]), qn = J({
  border: [Boolean, Number, String]
}, "border");
function Kn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn();
  return {
    borderClasses: y(() => {
      const i = Be(e) ? e.value : e.border, o = [];
      if (i === !0 || i === "")
        o.push(`${t}--border`);
      else if (typeof i == "string" || i === 0)
        for (const r of String(i).split(" "))
          o.push(`border-${r}`);
      return o;
    })
  };
}
const V_ = [null, "default", "comfortable", "compact"], mn = J({
  density: {
    type: String,
    default: "default",
    validator: (e) => V_.includes(e)
  }
}, "density");
function On(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn();
  return {
    densityClasses: y(() => `${t}--density-${e.density}`)
  };
}
const Gn = J({
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
function Yn(e) {
  return {
    elevationClasses: y(() => {
      const n = Be(e) ? e.value : e.elevation, i = [];
      return n == null || i.push(`elevation-${n}`), i;
    })
  };
}
const Pt = J({
  rounded: {
    type: [Boolean, Number, String],
    default: void 0
  },
  tile: Boolean
}, "rounded");
function $t(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn();
  return {
    roundedClasses: y(() => {
      const i = Be(e) ? e.value : e.rounded, o = Be(e) ? e.value : e.tile, r = [];
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
const O_ = ["elevated", "flat", "tonal", "outlined", "text", "plain"];
function Ao(e, t) {
  return f(fe, null, [e && f("span", {
    key: "overlay",
    class: `${t}__overlay`
  }, null), f("span", {
    key: "underlay",
    class: `${t}__underlay`
  }, null)]);
}
const Ei = J({
  color: String,
  variant: {
    type: String,
    default: "elevated",
    validator: (e) => O_.includes(e)
  }
}, "variant");
function Do(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn();
  const n = y(() => {
    const {
      variant: r
    } = rn(e);
    return `${t}--variant-${r}`;
  }), {
    colorClasses: i,
    colorStyles: o
  } = za(y(() => {
    const {
      variant: r,
      color: s
    } = rn(e);
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
const Cf = J({
  baseColor: String,
  divided: Boolean,
  ...qn(),
  ...Ne(),
  ...mn(),
  ...Gn(),
  ...Pt(),
  ...it(),
  ...at(),
  ...Ei()
}, "VBtnGroup"), xr = ve()({
  name: "VBtnGroup",
  props: Cf(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: i
    } = pt(e), {
      densityClasses: o
    } = On(e), {
      borderClasses: r
    } = Kn(e), {
      elevationClasses: s
    } = Yn(e), {
      roundedClasses: a
    } = $t(e);
    Ci({
      VBtn: {
        height: "auto",
        baseColor: le(e, "baseColor"),
        color: le(e, "color"),
        density: le(e, "density"),
        flat: !0,
        variant: le(e, "variant")
      }
    }), Ee(() => f(e.tag, {
      class: ["v-btn-group", {
        "v-btn-group--divided": e.divided
      }, i.value, r.value, o.value, s.value, a.value, e.class],
      style: e.style
    }, n));
  }
}), Ef = J({
  modelValue: {
    type: null,
    default: void 0
  },
  multiple: Boolean,
  mandatory: [Boolean, String],
  max: Number,
  selectedClass: String,
  disabled: Boolean
}, "group"), T_ = J({
  value: null,
  disabled: Boolean,
  selectedClass: String
}, "group-item");
function A_(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0;
  const i = Qe("useGroupItem");
  if (!i)
    throw new Error("[Vuetify] useGroupItem composable must be used inside a component setup function");
  const o = Zt();
  Et(Symbol.for(`${t.description}:id`), o);
  const r = He(t, null);
  if (!r) {
    if (!n) return r;
    throw new Error(`[Vuetify] Could not find useGroup injection with symbol ${t.description}`);
  }
  const s = le(e, "value"), a = y(() => !!(r.disabled.value || e.disabled));
  r.register({
    id: o,
    value: s,
    disabled: a
  }, i), gt(() => {
    r.unregister(o);
  });
  const l = y(() => r.isSelected(o)), c = y(() => r.items.value[0].id === o), d = y(() => r.items.value[r.items.value.length - 1].id === o), u = y(() => l.value && [r.selectedClass.value, e.selectedClass]);
  return be(l, (m) => {
    i.emit("group:selected", {
      value: m
    });
  }, {
    flush: "sync"
  }), {
    id: o,
    isSelected: l,
    isFirst: c,
    isLast: d,
    toggle: () => r.select(o, !l.value),
    select: (m) => r.select(o, m),
    selectedClass: u,
    value: s,
    disabled: a,
    group: r
  };
}
function xf(e, t) {
  let n = !1;
  const i = ct([]), o = nt(e, "modelValue", [], (m) => m == null ? [] : Nf(i, an(m)), (m) => {
    const g = I_(i, m);
    return e.multiple ? g : g[0];
  }), r = Qe("useGroup");
  function s(m, g) {
    const h = m, v = Symbol.for(`${t.description}:id`), k = Ai(v, r == null ? void 0 : r.vnode).indexOf(g);
    rn(h.value) == null && (h.value = k, h.useIndexAsValue = !0), k > -1 ? i.splice(k, 0, h) : i.push(h);
  }
  function a(m) {
    if (n) return;
    l();
    const g = i.findIndex((h) => h.id === m);
    i.splice(g, 1);
  }
  function l() {
    const m = i.find((g) => !g.disabled);
    m && e.mandatory === "force" && !o.value.length && (o.value = [m.id]);
  }
  cn(() => {
    l();
  }), gt(() => {
    n = !0;
  }), ka(() => {
    for (let m = 0; m < i.length; m++)
      i[m].useIndexAsValue && (i[m].value = m);
  });
  function c(m, g) {
    const h = i.find((v) => v.id === m);
    if (!(g && (h != null && h.disabled)))
      if (e.multiple) {
        const v = o.value.slice(), _ = v.findIndex((O) => O === m), k = ~_;
        if (g = g ?? !k, k && e.mandatory && v.length <= 1 || !k && e.max != null && v.length + 1 > e.max) return;
        _ < 0 && g ? v.push(m) : _ >= 0 && !g && v.splice(_, 1), o.value = v;
      } else {
        const v = o.value.includes(m);
        if (e.mandatory && v) return;
        o.value = g ?? !v ? [m] : [];
      }
  }
  function d(m) {
    if (e.multiple && Bn('This method is not supported when using "multiple" prop'), o.value.length) {
      const g = o.value[0], h = i.findIndex((k) => k.id === g);
      let v = (h + m) % i.length, _ = i[v];
      for (; _.disabled && v !== h; )
        v = (v + m) % i.length, _ = i[v];
      if (_.disabled) return;
      o.value = [i[v].id];
    } else {
      const g = i.find((h) => !h.disabled);
      g && (o.value = [g.id]);
    }
  }
  const u = {
    register: s,
    unregister: a,
    selected: o,
    select: c,
    disabled: le(e, "disabled"),
    prev: () => d(i.length - 1),
    next: () => d(1),
    isSelected: (m) => o.value.includes(m),
    selectedClass: y(() => e.selectedClass),
    items: y(() => i),
    getItemIndex: (m) => D_(i, m)
  };
  return Et(t, u), u;
}
function D_(e, t) {
  const n = Nf(e, [t]);
  return n.length ? e.findIndex((i) => i.id === n[0]) : -1;
}
function Nf(e, t) {
  const n = [];
  return t.forEach((i) => {
    const o = e.find((s) => To(i, s.value)), r = e[i];
    (o == null ? void 0 : o.value) != null ? n.push(o.id) : r != null && n.push(r.id);
  }), n;
}
function I_(e, t) {
  const n = [];
  return t.forEach((i) => {
    const o = e.findIndex((r) => r.id === i);
    if (~o) {
      const r = e[o];
      n.push(r.value != null ? r.value : o);
    }
  }), n;
}
const Ua = Symbol.for("vuetify:v-btn-toggle"), P_ = J({
  ...Cf(),
  ...Ef()
}, "VBtnToggle");
ve()({
  name: "VBtnToggle",
  props: P_(),
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
      selected: a
    } = xf(e, Ua);
    return Ee(() => {
      const l = xr.filterProps(e);
      return f(xr, Oe({
        class: ["v-btn-toggle", e.class]
      }, l, {
        style: e.style
      }), {
        default: () => {
          var c;
          return [(c = n.default) == null ? void 0 : c.call(n, {
            isSelected: i,
            next: o,
            prev: r,
            select: s,
            selected: a
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
const $_ = J({
  defaults: Object,
  disabled: Boolean,
  reset: [Number, String],
  root: [Boolean, String],
  scoped: Boolean
}, "VDefaultsProvider"), mt = ve(!1)({
  name: "VDefaultsProvider",
  props: $_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      defaults: i,
      disabled: o,
      reset: r,
      root: s,
      scoped: a
    } = pa(e);
    return Ci(i, {
      reset: r,
      root: s,
      scoped: a,
      disabled: o
    }), () => {
      var l;
      return (l = n.default) == null ? void 0 : l.call(n);
    };
  }
});
function Vf(e, t) {
  const n = se(), i = ke(!1);
  if (Da) {
    const o = new IntersectionObserver((r) => {
      i.value = !!r.find((s) => s.isIntersecting);
    }, t);
    gt(() => {
      o.disconnect();
    }), be(n, (r, s) => {
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
const M_ = J({
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
  ...Ne(),
  ...Gr(),
  ...it({
    tag: "div"
  }),
  ...at()
}, "VProgressCircular"), Jr = ve()({
  name: "VProgressCircular",
  props: M_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = 20, o = 2 * Math.PI * i, r = se(), {
      themeClasses: s
    } = pt(e), {
      sizeClasses: a,
      sizeStyles: l
    } = Yr(e), {
      textColorClasses: c,
      textColorStyles: d
    } = un(le(e, "color")), {
      textColorClasses: u,
      textColorStyles: m
    } = un(le(e, "bgColor")), {
      intersectionRef: g,
      isIntersecting: h
    } = Vf(), {
      resizeRef: v,
      contentRect: _
    } = pf(), k = y(() => Math.max(0, Math.min(100, parseFloat(e.modelValue)))), O = y(() => Number(e.width)), P = y(() => l.value ? Number(e.size) : _.value ? _.value.width : Math.max(O.value, 32)), B = y(() => i / (1 - O.value / P.value) * 2), C = y(() => O.value / P.value * B.value), V = y(() => he((100 - k.value) / 100 * o));
    return Jt(() => {
      g.value = r.value, v.value = r.value;
    }), Ee(() => f(e.tag, {
      ref: r,
      class: ["v-progress-circular", {
        "v-progress-circular--indeterminate": !!e.indeterminate,
        "v-progress-circular--visible": h.value,
        "v-progress-circular--disable-shrink": e.indeterminate === "disable-shrink"
      }, s.value, a.value, c.value, e.class],
      style: [l.value, d.value, e.style],
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": e.indeterminate ? void 0 : k.value
    }, {
      default: () => [f("svg", {
        style: {
          transform: `rotate(calc(-90deg + ${Number(e.rotate)}deg))`
        },
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${B.value} ${B.value}`
      }, [f("circle", {
        class: ["v-progress-circular__underlay", u.value],
        style: m.value,
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: i,
        "stroke-width": C.value,
        "stroke-dasharray": o,
        "stroke-dashoffset": 0
      }, null), f("circle", {
        class: "v-progress-circular__overlay",
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: i,
        "stroke-width": C.value,
        "stroke-dasharray": o,
        "stroke-dashoffset": V.value
      }, null)]), n.default && f("div", {
        class: "v-progress-circular__content"
      }, [n.default({
        value: k.value
      })])]
    })), {};
  }
}), Xn = J({
  height: [Number, String],
  maxHeight: [Number, String],
  maxWidth: [Number, String],
  minHeight: [Number, String],
  minWidth: [Number, String],
  width: [Number, String]
}, "dimension");
function Jn(e) {
  return {
    dimensionStyles: y(() => {
      const n = {}, i = he(e.height), o = he(e.maxHeight), r = he(e.maxWidth), s = he(e.minHeight), a = he(e.minWidth), l = he(e.width);
      return i != null && (n.height = i), o != null && (n.maxHeight = o), r != null && (n.maxWidth = r), s != null && (n.minHeight = s), a != null && (n.minWidth = a), l != null && (n.width = l), n;
    })
  };
}
const Hu = {
  center: "center",
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
}, Zr = J({
  location: String
}, "location");
function Wa(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, n = arguments.length > 2 ? arguments[2] : void 0;
  const {
    isRtl: i
  } = fn();
  return {
    locationStyles: y(() => {
      if (!e.location) return {};
      const {
        side: r,
        align: s
      } = Xs(e.location.split(" ").length > 1 ? e.location : `${e.location} center`, i.value);
      function a(c) {
        return n ? n(c) : 0;
      }
      const l = {};
      return r !== "center" && (t ? l[Hu[r]] = `calc(100% - ${a(r)}px)` : l[r] = 0), s !== "center" ? t ? l[Hu[s]] = `calc(100% - ${a(s)}px)` : l[s] = 0 : (r === "center" ? l.top = l.left = "50%" : l[{
        top: "left",
        bottom: "left",
        left: "top",
        right: "top"
      }[r]] = "50%", l.transform = {
        top: "translateX(-50%)",
        bottom: "translateX(-50%)",
        left: "translateY(-50%)",
        right: "translateY(-50%)",
        center: "translate(-50%, -50%)"
      }[r]), l;
    })
  };
}
const L_ = J({
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
  ...Ne(),
  ...Zr({
    location: "top"
  }),
  ...Pt(),
  ...it(),
  ...at()
}, "VProgressLinear"), Of = ve()({
  name: "VProgressLinear",
  props: L_(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    var E;
    let {
      slots: n
    } = t;
    const i = nt(e, "modelValue"), {
      isRtl: o,
      rtlClasses: r
    } = fn(), {
      themeClasses: s
    } = pt(e), {
      locationStyles: a
    } = Wa(e), {
      textColorClasses: l,
      textColorStyles: c
    } = un(e, "color"), {
      backgroundColorClasses: d,
      backgroundColorStyles: u
    } = jt(y(() => e.bgColor || e.color)), {
      backgroundColorClasses: m,
      backgroundColorStyles: g
    } = jt(y(() => e.bufferColor || e.bgColor || e.color)), {
      backgroundColorClasses: h,
      backgroundColorStyles: v
    } = jt(e, "color"), {
      roundedClasses: _
    } = $t(e), {
      intersectionRef: k,
      isIntersecting: O
    } = Vf(), P = y(() => parseFloat(e.max)), B = y(() => parseFloat(e.height)), C = y(() => kn(parseFloat(e.bufferValue) / P.value * 100, 0, 100)), V = y(() => kn(parseFloat(i.value) / P.value * 100, 0, 100)), F = y(() => o.value !== e.reverse), x = y(() => e.indeterminate ? "fade-transition" : "slide-x-transition"), N = ze && ((E = window.matchMedia) == null ? void 0 : E.call(window, "(forced-colors: active)").matches);
    function $(w) {
      if (!k.value) return;
      const {
        left: A,
        right: M,
        width: ee
      } = k.value.getBoundingClientRect(), oe = F.value ? ee - w.clientX + (M - ee) : w.clientX - A;
      i.value = Math.round(oe / ee * P.value);
    }
    return Ee(() => f(e.tag, {
      ref: k,
      class: ["v-progress-linear", {
        "v-progress-linear--absolute": e.absolute,
        "v-progress-linear--active": e.active && O.value,
        "v-progress-linear--reverse": F.value,
        "v-progress-linear--rounded": e.rounded,
        "v-progress-linear--rounded-bar": e.roundedBar,
        "v-progress-linear--striped": e.striped
      }, _.value, s.value, r.value, e.class],
      style: [{
        bottom: e.location === "bottom" ? 0 : void 0,
        top: e.location === "top" ? 0 : void 0,
        height: e.active ? he(B.value) : 0,
        "--v-progress-linear-height": he(B.value),
        ...e.absolute ? a.value : {}
      }, e.style],
      role: "progressbar",
      "aria-hidden": e.active ? "false" : "true",
      "aria-valuemin": "0",
      "aria-valuemax": e.max,
      "aria-valuenow": e.indeterminate ? void 0 : V.value,
      onClick: e.clickable && $
    }, {
      default: () => [e.stream && f("div", {
        key: "stream",
        class: ["v-progress-linear__stream", l.value],
        style: {
          ...c.value,
          [F.value ? "left" : "right"]: he(-B.value),
          borderTop: `${he(B.value / 2)} dotted`,
          opacity: parseFloat(e.bufferOpacity),
          top: `calc(50% - ${he(B.value / 4)})`,
          width: he(100 - C.value, "%"),
          "--v-progress-linear-stream-to": he(B.value * (F.value ? 1 : -1))
        }
      }, null), f("div", {
        class: ["v-progress-linear__background", N ? void 0 : d.value],
        style: [u.value, {
          opacity: parseFloat(e.bgOpacity),
          width: e.stream ? 0 : void 0
        }]
      }, null), f("div", {
        class: ["v-progress-linear__buffer", N ? void 0 : m.value],
        style: [g.value, {
          opacity: parseFloat(e.bufferOpacity),
          width: he(C.value, "%")
        }]
      }, null), f(wi, {
        name: x.value
      }, {
        default: () => [e.indeterminate ? f("div", {
          class: "v-progress-linear__indeterminate"
        }, [["long", "short"].map((w) => f("div", {
          key: w,
          class: ["v-progress-linear__indeterminate", w, N ? void 0 : h.value],
          style: v.value
        }, null))]) : f("div", {
          class: ["v-progress-linear__determinate", N ? void 0 : h.value],
          style: [v.value, {
            width: he(V.value, "%")
          }]
        }, null)]
      }), n.default && f("div", {
        class: "v-progress-linear__content"
      }, [n.default({
        value: V.value,
        buffer: C.value
      })])]
    })), {};
  }
}), qa = J({
  loading: [Boolean, String]
}, "loader");
function Qr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn();
  return {
    loaderClasses: y(() => ({
      [`${t}--loading`]: e.loading
    }))
  };
}
function Ka(e, t) {
  var i;
  let {
    slots: n
  } = t;
  return f("div", {
    class: `${e.name}__loader`
  }, [((i = n.default) == null ? void 0 : i.call(n, {
    color: e.color,
    isActive: e.active
  })) || f(Of, {
    absolute: e.absolute,
    active: e.active,
    color: e.color,
    height: "2",
    indeterminate: !0
  }, null)]);
}
const F_ = ["static", "relative", "fixed", "absolute", "sticky"], Ga = J({
  position: {
    type: String,
    validator: (
      /* istanbul ignore next */
      (e) => F_.includes(e)
    )
  }
}, "position");
function Ya(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn();
  return {
    positionClasses: y(() => e.position ? `${t}--${e.position}` : void 0)
  };
}
function B_() {
  const e = Qe("useRoute");
  return y(() => {
    var t;
    return (t = e == null ? void 0 : e.proxy) == null ? void 0 : t.$route;
  });
}
function R_() {
  var e, t;
  return (t = (e = Qe("useRouter")) == null ? void 0 : e.proxy) == null ? void 0 : t.$router;
}
function Xa(e, t) {
  var u, m;
  const n = fv("RouterLink"), i = y(() => !!(e.href || e.to)), o = y(() => (i == null ? void 0 : i.value) || fu(t, "click") || fu(e, "click"));
  if (typeof n == "string" || !("useLink" in n)) {
    const g = le(e, "href");
    return {
      isLink: i,
      isClickable: o,
      href: g,
      linkProps: ct({
        href: g
      })
    };
  }
  const r = y(() => ({
    ...e,
    to: le(() => e.to || "")
  })), s = n.useLink(r.value), a = y(() => e.to ? s : void 0), l = B_(), c = y(() => {
    var g, h, v;
    return a.value ? e.exact ? l.value ? ((v = a.value.isExactActive) == null ? void 0 : v.value) && To(a.value.route.value.query, l.value.query) : ((h = a.value.isExactActive) == null ? void 0 : h.value) ?? !1 : ((g = a.value.isActive) == null ? void 0 : g.value) ?? !1 : !1;
  }), d = y(() => {
    var g;
    return e.to ? (g = a.value) == null ? void 0 : g.route.value.href : e.href;
  });
  return {
    isLink: i,
    isClickable: o,
    isActive: c,
    route: (u = a.value) == null ? void 0 : u.route,
    navigate: (m = a.value) == null ? void 0 : m.navigate,
    href: d,
    linkProps: ct({
      href: d,
      "aria-current": y(() => c.value ? "page" : void 0)
    })
  };
}
const Ja = J({
  href: String,
  replace: Boolean,
  to: [String, Object],
  exact: Boolean
}, "router");
let ws = !1;
function H_(e, t) {
  let n = !1, i, o;
  ze && (ft(() => {
    window.addEventListener("popstate", r), i = e == null ? void 0 : e.beforeEach((s, a, l) => {
      ws ? n ? t(l) : l() : setTimeout(() => n ? t(l) : l()), ws = !0;
    }), o = e == null ? void 0 : e.afterEach(() => {
      ws = !1;
    });
  }), It(() => {
    window.removeEventListener("popstate", r), i == null || i(), o == null || o();
  }));
  function r(s) {
    var a;
    (a = s.state) != null && a.replaced || (n = !0, setTimeout(() => n = !1));
  }
}
function j_(e, t) {
  be(() => {
    var n;
    return (n = e.isActive) == null ? void 0 : n.value;
  }, (n) => {
    e.isLink.value && n && t && ft(() => {
      t(!0);
    });
  }, {
    immediate: !0
  });
}
const ta = Symbol("rippleStop"), z_ = 80;
function ju(e, t) {
  e.style.transform = t, e.style.webkitTransform = t;
}
function na(e) {
  return e.constructor.name === "TouchEvent";
}
function Tf(e) {
  return e.constructor.name === "KeyboardEvent";
}
const U_ = function(e, t) {
  var u;
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, i = 0, o = 0;
  if (!Tf(e)) {
    const m = t.getBoundingClientRect(), g = na(e) ? e.touches[e.touches.length - 1] : e;
    i = g.clientX - m.left, o = g.clientY - m.top;
  }
  let r = 0, s = 0.3;
  (u = t._ripple) != null && u.circle ? (s = 0.15, r = t.clientWidth / 2, r = n.center ? r : r + Math.sqrt((i - r) ** 2 + (o - r) ** 2) / 4) : r = Math.sqrt(t.clientWidth ** 2 + t.clientHeight ** 2) / 2;
  const a = `${(t.clientWidth - r * 2) / 2}px`, l = `${(t.clientHeight - r * 2) / 2}px`, c = n.center ? a : `${i - r}px`, d = n.center ? l : `${o - r}px`;
  return {
    radius: r,
    scale: s,
    x: c,
    y: d,
    centerX: a,
    centerY: l
  };
}, Nr = {
  /* eslint-disable max-statements */
  show(e, t) {
    var g;
    let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    if (!((g = t == null ? void 0 : t._ripple) != null && g.enabled))
      return;
    const i = document.createElement("span"), o = document.createElement("span");
    i.appendChild(o), i.className = "v-ripple__container", n.class && (i.className += ` ${n.class}`);
    const {
      radius: r,
      scale: s,
      x: a,
      y: l,
      centerX: c,
      centerY: d
    } = U_(e, t, n), u = `${r * 2}px`;
    o.className = "v-ripple__animation", o.style.width = u, o.style.height = u, t.appendChild(i);
    const m = window.getComputedStyle(t);
    m && m.position === "static" && (t.style.position = "relative", t.dataset.previousPosition = "static"), o.classList.add("v-ripple__animation--enter"), o.classList.add("v-ripple__animation--visible"), ju(o, `translate(${a}, ${l}) scale3d(${s},${s},${s})`), o.dataset.activated = String(performance.now()), setTimeout(() => {
      o.classList.remove("v-ripple__animation--enter"), o.classList.add("v-ripple__animation--in"), ju(o, `translate(${c}, ${d}) scale3d(1,1,1)`);
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
        var a;
        e.getElementsByClassName("v-ripple__animation").length === 1 && e.dataset.previousPosition && (e.style.position = e.dataset.previousPosition, delete e.dataset.previousPosition), ((a = n.parentNode) == null ? void 0 : a.parentNode) === e && e.removeChild(n.parentNode);
      }, 300);
    }, o);
  }
};
function Af(e) {
  return typeof e > "u" || !!e;
}
function yo(e) {
  const t = {}, n = e.currentTarget;
  if (!(!(n != null && n._ripple) || n._ripple.touched || e[ta])) {
    if (e[ta] = !0, na(e))
      n._ripple.touched = !0, n._ripple.isTouch = !0;
    else if (n._ripple.isTouch) return;
    if (t.center = n._ripple.centered || Tf(e), n._ripple.class && (t.class = n._ripple.class), na(e)) {
      if (n._ripple.showTimerCommit) return;
      n._ripple.showTimerCommit = () => {
        Nr.show(e, n, t);
      }, n._ripple.showTimer = window.setTimeout(() => {
        var i;
        (i = n == null ? void 0 : n._ripple) != null && i.showTimerCommit && (n._ripple.showTimerCommit(), n._ripple.showTimerCommit = null);
      }, z_);
    } else
      Nr.show(e, n, t);
  }
}
function zu(e) {
  e[ta] = !0;
}
function Nt(e) {
  const t = e.currentTarget;
  if (t != null && t._ripple) {
    if (window.clearTimeout(t._ripple.showTimer), e.type === "touchend" && t._ripple.showTimerCommit) {
      t._ripple.showTimerCommit(), t._ripple.showTimerCommit = null, t._ripple.showTimer = window.setTimeout(() => {
        Nt(e);
      });
      return;
    }
    window.setTimeout(() => {
      t._ripple && (t._ripple.touched = !1);
    }), Nr.hide(t);
  }
}
function Df(e) {
  const t = e.currentTarget;
  t != null && t._ripple && (t._ripple.showTimerCommit && (t._ripple.showTimerCommit = null), window.clearTimeout(t._ripple.showTimer));
}
let _o = !1;
function If(e) {
  !_o && (e.keyCode === au.enter || e.keyCode === au.space) && (_o = !0, yo(e));
}
function Pf(e) {
  _o = !1, Nt(e);
}
function $f(e) {
  _o && (_o = !1, Nt(e));
}
function Mf(e, t, n) {
  const {
    value: i,
    modifiers: o
  } = t, r = Af(i);
  if (r || Nr.hide(e), e._ripple = e._ripple ?? {}, e._ripple.enabled = r, e._ripple.centered = o.center, e._ripple.circle = o.circle, np(i) && i.class && (e._ripple.class = i.class), r && !n) {
    if (o.stop) {
      e.addEventListener("touchstart", zu, {
        passive: !0
      }), e.addEventListener("mousedown", zu);
      return;
    }
    e.addEventListener("touchstart", yo, {
      passive: !0
    }), e.addEventListener("touchend", Nt, {
      passive: !0
    }), e.addEventListener("touchmove", Df, {
      passive: !0
    }), e.addEventListener("touchcancel", Nt), e.addEventListener("mousedown", yo), e.addEventListener("mouseup", Nt), e.addEventListener("mouseleave", Nt), e.addEventListener("keydown", If), e.addEventListener("keyup", Pf), e.addEventListener("blur", $f), e.addEventListener("dragstart", Nt, {
      passive: !0
    });
  } else !r && n && Lf(e);
}
function Lf(e) {
  e.removeEventListener("mousedown", yo), e.removeEventListener("touchstart", yo), e.removeEventListener("touchend", Nt), e.removeEventListener("touchmove", Df), e.removeEventListener("touchcancel", Nt), e.removeEventListener("mouseup", Nt), e.removeEventListener("mouseleave", Nt), e.removeEventListener("keydown", If), e.removeEventListener("keyup", Pf), e.removeEventListener("dragstart", Nt), e.removeEventListener("blur", $f);
}
function W_(e, t) {
  Mf(e, t, !1);
}
function q_(e) {
  delete e._ripple, Lf(e);
}
function K_(e, t) {
  if (t.value === t.oldValue)
    return;
  const n = Af(t.oldValue);
  Mf(e, t, n);
}
const Io = {
  mounted: W_,
  unmounted: q_,
  updated: K_
}, G_ = J({
  active: {
    type: Boolean,
    default: void 0
  },
  activeColor: String,
  baseColor: String,
  symbol: {
    type: null,
    default: Ua
  },
  flat: Boolean,
  icon: [Boolean, String, Function, Object],
  prependIcon: Xe,
  appendIcon: Xe,
  block: Boolean,
  readonly: Boolean,
  slim: Boolean,
  stacked: Boolean,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  text: String,
  ...qn(),
  ...Ne(),
  ...mn(),
  ...Xn(),
  ...Gn(),
  ...T_(),
  ...qa(),
  ...Zr(),
  ...Ga(),
  ...Pt(),
  ...Ja(),
  ...Gr(),
  ...it({
    tag: "button"
  }),
  ...at(),
  ...Ei({
    variant: "elevated"
  })
}, "VBtn"), Ce = ve()({
  name: "VBtn",
  props: G_(),
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
    } = pt(e), {
      borderClasses: r
    } = Kn(e), {
      densityClasses: s
    } = On(e), {
      dimensionStyles: a
    } = Jn(e), {
      elevationClasses: l
    } = Yn(e), {
      loaderClasses: c
    } = Qr(e), {
      locationStyles: d
    } = Wa(e), {
      positionClasses: u
    } = Ya(e), {
      roundedClasses: m
    } = $t(e), {
      sizeClasses: g,
      sizeStyles: h
    } = Yr(e), v = A_(e, e.symbol, !1), _ = Xa(e, n), k = y(() => {
      var E;
      return e.active !== void 0 ? e.active : _.isLink.value ? (E = _.isActive) == null ? void 0 : E.value : v == null ? void 0 : v.isSelected.value;
    }), O = y(() => k.value ? e.activeColor ?? e.color : e.color), P = y(() => {
      var w, A;
      return {
        color: (v == null ? void 0 : v.isSelected.value) && (!_.isLink.value || ((w = _.isActive) == null ? void 0 : w.value)) || !v || ((A = _.isActive) == null ? void 0 : A.value) ? O.value ?? e.baseColor : e.baseColor,
        variant: e.variant
      };
    }), {
      colorClasses: B,
      colorStyles: C,
      variantClasses: V
    } = Do(P), F = y(() => (v == null ? void 0 : v.disabled.value) || e.disabled), x = y(() => e.variant === "elevated" && !(e.disabled || e.flat || e.border)), N = y(() => {
      if (!(e.value === void 0 || typeof e.value == "symbol"))
        return Object(e.value) === e.value ? JSON.stringify(e.value, null, 0) : e.value;
    });
    function $(E) {
      var w;
      F.value || _.isLink.value && (E.metaKey || E.ctrlKey || E.shiftKey || E.button !== 0 || n.target === "_blank") || ((w = _.navigate) == null || w.call(_, E), v == null || v.toggle());
    }
    return j_(_, v == null ? void 0 : v.select), Ee(() => {
      const E = _.isLink.value ? "a" : e.tag, w = !!(e.prependIcon || i.prepend), A = !!(e.appendIcon || i.append), M = !!(e.icon && e.icon !== !0);
      return vt(f(E, Oe({
        type: E === "a" ? void 0 : "button",
        class: ["v-btn", v == null ? void 0 : v.selectedClass.value, {
          "v-btn--active": k.value,
          "v-btn--block": e.block,
          "v-btn--disabled": F.value,
          "v-btn--elevated": x.value,
          "v-btn--flat": e.flat,
          "v-btn--icon": !!e.icon,
          "v-btn--loading": e.loading,
          "v-btn--readonly": e.readonly,
          "v-btn--slim": e.slim,
          "v-btn--stacked": e.stacked
        }, o.value, r.value, B.value, s.value, l.value, c.value, u.value, m.value, g.value, V.value, e.class],
        style: [C.value, a.value, d.value, h.value, e.style],
        "aria-busy": e.loading ? !0 : void 0,
        disabled: F.value || void 0,
        tabindex: e.loading || e.readonly ? -1 : void 0,
        onClick: $,
        value: N.value
      }, _.linkProps), {
        default: () => {
          var ee;
          return [Ao(!0, "v-btn"), !e.icon && w && f("span", {
            key: "prepend",
            class: "v-btn__prepend"
          }, [i.prepend ? f(mt, {
            key: "prepend-defaults",
            disabled: !e.prependIcon,
            defaults: {
              VIcon: {
                icon: e.prependIcon
              }
            }
          }, i.prepend) : f(Ve, {
            key: "prepend-icon",
            icon: e.prependIcon
          }, null)]), f("span", {
            class: "v-btn__content",
            "data-no-activator": ""
          }, [!i.default && M ? f(Ve, {
            key: "content-icon",
            icon: e.icon
          }, null) : f(mt, {
            key: "content-defaults",
            disabled: !M,
            defaults: {
              VIcon: {
                icon: e.icon
              }
            }
          }, {
            default: () => {
              var oe;
              return [((oe = i.default) == null ? void 0 : oe.call(i)) ?? e.text];
            }
          })]), !e.icon && A && f("span", {
            key: "append",
            class: "v-btn__append"
          }, [i.append ? f(mt, {
            key: "append-defaults",
            disabled: !e.appendIcon,
            defaults: {
              VIcon: {
                icon: e.appendIcon
              }
            }
          }, i.append) : f(Ve, {
            key: "append-icon",
            icon: e.appendIcon
          }, null)]), !!e.loading && f("span", {
            key: "loader",
            class: "v-btn__loader"
          }, [((ee = i.loader) == null ? void 0 : ee.call(i)) ?? f(Jr, {
            color: typeof e.loading == "boolean" ? void 0 : e.loading,
            indeterminate: !0,
            width: "2"
          }, null)])];
        }
      }), [[Io, !F.value && e.ripple, "", {
        center: !!e.icon
      }]]);
    }), {
      group: v
    };
  }
}), Y_ = {
  name: "CommentList",
  components: { CommentItem: Xr },
  emits: ["more", "retry", "login", "open", "edit", "remove", "vote"],
  props: {
    // { items, has_more, loading, error }
    state: { type: Object, required: !0 },
    empty: { type: String, default: "这里还没有公开评论" },
    tags: { type: Boolean, default: !1 }
  },
  watch: {
    // 首屏不足一页高度时没有滚动事件，加载完成后主动补一次检查。
    "state.loading": function(e) {
      e || this.$nextTick(this.maybe_load_more);
    }
  },
  methods: {
    maybe_load_more: function() {
      const e = this.$refs.scroller;
      !e || !e.clientHeight || this.state.loading || this.state.error || !this.state.has_more || e.scrollHeight - e.scrollTop - e.clientHeight <= 48 && this.$emit("more");
    },
    scroll_to_top: function() {
      this.$refs.scroller && (this.$refs.scroller.scrollTop = 0);
    }
  }
}, X_ = ["aria-busy"], J_ = {
  key: 0,
  class: "comment-state"
}, Z_ = {
  key: 1,
  class: "comment-state",
  role: "alert"
}, Q_ = { class: "comment-state-hint" }, eb = {
  key: 2,
  class: "comment-state",
  role: "status"
}, tb = {
  key: 3,
  class: "comment-state"
}, nb = {
  class: "comment-load-status",
  role: "status"
};
function ib(e, t, n, i, o, r) {
  const s = Xr;
  return X(), ce("div", {
    ref: "scroller",
    class: "comment-list",
    "aria-busy": String(n.state.loading),
    onScrollPassive: t[7] || (t[7] = (...a) => r.maybe_load_more && r.maybe_load_more(...a))
  }, [
    n.state.need_login && !n.state.items.length ? (X(), ce("div", J_, [
      f(Ve, { size: "30" }, {
        default: T(() => t[8] || (t[8] = [
          te("mdi-account-lock-outline")
        ])),
        _: 1
      }),
      t[10] || (t[10] = R("p", null, "登录后查看评论", -1)),
      f(Ce, {
        variant: "tonal",
        onClick: t[0] || (t[0] = (a) => e.$emit("login"))
      }, {
        default: T(() => t[9] || (t[9] = [
          te("去登录")
        ])),
        _: 1
      })
    ])) : n.state.error && !n.state.items.length ? (X(), ce("div", Z_, [
      f(Ve, { size: "30" }, {
        default: T(() => t[11] || (t[11] = [
          te("mdi-alert-circle-outline")
        ])),
        _: 1
      }),
      t[13] || (t[13] = R("p", null, "评论暂时没能加载", -1)),
      R("p", Q_, _e(n.state.error), 1),
      f(Ce, {
        variant: "tonal",
        onClick: t[1] || (t[1] = (a) => e.$emit("retry"))
      }, {
        default: T(() => t[12] || (t[12] = [
          te("重新加载")
        ])),
        _: 1
      })
    ])) : n.state.loading && !n.state.items.length ? (X(), ce("div", eb, [
      f(Jr, {
        indeterminate: "",
        size: "28",
        color: "primary"
      }),
      t[14] || (t[14] = R("p", null, "正在加载评论…", -1))
    ])) : n.state.items.length ? (X(), ce(fe, { key: 4 }, [
      (X(!0), ce(fe, null, At(n.state.items, (a) => (X(), Ke(s, {
        key: a.id,
        class: "comment-list-item",
        record: a,
        clickable: "",
        tags: n.tags,
        onOpen: t[2] || (t[2] = (l) => e.$emit("open", l)),
        onReply: t[3] || (t[3] = (l) => e.$emit("open", l)),
        onEdit: t[4] || (t[4] = (l) => e.$emit("edit", l)),
        onRemove: t[5] || (t[5] = (l) => e.$emit("remove", l)),
        onVote: (l, c) => e.$emit("vote", l, c)
      }, null, 8, ["record", "tags", "onVote"]))), 128)),
      R("div", nb, [
        n.state.error ? (X(), ce(fe, { key: 0 }, [
          t[16] || (t[16] = te("加载失败 ")),
          R("button", {
            type: "button",
            class: "comment-retry",
            onClick: t[6] || (t[6] = (a) => e.$emit("retry"))
          }, "重试")
        ], 64)) : n.state.loading ? (X(), ce(fe, { key: 1 }, [
          te("正在加载更多评论…")
        ], 64)) : n.state.has_more ? (X(), ce(fe, { key: 2 }, [
          te("继续下滑，加载更多评论")
        ], 64)) : (X(), ce(fe, { key: 3 }, [
          te("已显示全部评论")
        ], 64))
      ])
    ], 64)) : (X(), ce("div", tb, [
      f(Ve, { size: "30" }, {
        default: T(() => t[15] || (t[15] = [
          te("mdi-comment-text-outline")
        ])),
        _: 1
      }),
      R("p", null, _e(n.empty), 1),
      mv(e.$slots, "empty", {}, void 0)
    ]))
  ], 40, X_);
}
const Ff = /* @__PURE__ */ Vn(Y_, [["render", ib], ["__scopeId", "data-v-7beb3f61"]]), ob = "candle-reader:annotations:v1:", rb = 20, Ss = { id: "local", nickname: "我", avatar: "" }, sb = ["load", "save"];
function Uu(e) {
  return e.client_id || e.id;
}
function Ii() {
  var e;
  return (e = window.crypto) != null && e.randomUUID ? window.crypto.randomUUID() : `candle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function ab(e) {
  const t = Array.isArray(e) ? e : e == null ? void 0 : e.annotations;
  if (!Array.isArray(t)) throw new Error("读取评论的回调必须返回数组或 { annotations }");
  return t;
}
function Wu(e) {
  const t = (e == null ? void 0 : e.annotation) || e;
  if (!t || typeof t != "object" || Array.isArray(t))
    throw new Error("写入评论的回调必须返回评论对象或 { annotation }");
  return t;
}
function qu(e) {
  const t = Array.isArray(e) ? e : e == null ? void 0 : e.items;
  if (!Array.isArray(t)) throw new Error("评论列表回调必须返回数组或 { items, next_cursor, has_more }");
  const n = Array.isArray(e) ? null : e.next_cursor ?? null;
  return { items: t, next_cursor: n, has_more: Array.isArray(e) ? !1 : !!(e.has_more ?? n) };
}
function lb(e, t) {
  return `${ob}${encodeURIComponent(String(e || t || "unknown-book"))}`;
}
function Ku(e, t, n) {
  const i = Number(t) || 0, o = Number(n) || rb, r = i + o;
  return { items: e.slice(i, r), next_cursor: r < e.length ? String(r) : null, has_more: r < e.length };
}
function ub({ bookId: e, bookUrl: t, storage: n } = {}) {
  const i = lb(e, t);
  let o = n;
  if (o === void 0)
    try {
      o = window.localStorage;
    } catch {
      throw new Error("浏览器禁止访问本地存储，无法保存评论");
    }
  if (!o) throw new Error("浏览器不支持本地存储，无法保存评论");
  function r() {
    try {
      const c = JSON.parse(o.getItem(i) || "[]");
      return Array.isArray(c) ? c : [];
    } catch (c) {
      return console.warn("Candle Reader 本地评论损坏，已忽略：", c), [];
    }
  }
  function s(c) {
    o.setItem(i, JSON.stringify(c));
  }
  function a(c, d) {
    return {
      like_count: 0,
      dislike_count: 0,
      user_vote: 0,
      ...c,
      is_mine: !0,
      author_name: Ss.nickname,
      reply_count: c.root_id ? 0 : d.filter((u) => u.root_id === c.id).length
    };
  }
  const l = (c, d) => String(d.created_at).localeCompare(String(c.created_at));
  return {
    async user() {
      return Ss;
    },
    async load({ chapter: c } = {}) {
      const d = r().filter((u) => !u.root_id);
      return c ? d.filter((u) => u.chapter === c) : d;
    },
    async list({ scope: c = "chapter", chapter: d, paragraph_cfi: u, cursor: m, limit: g } = {}) {
      const h = r(), v = h.filter((k) => !k.root_id).filter((k) => c === "mine" ? !0 : k.is_private !== !1 ? !1 : c === "book" ? !0 : k.annotation_type === "book_comment" || k.chapter !== d ? !1 : c !== "paragraph" || k.cfi === u).sort(l), _ = Ku(v, m, g);
      return { ..._, items: _.items.map((k) => a(k, h)) };
    },
    async summary({ chapter: c } = {}) {
      const d = {};
      return r().forEach((u) => {
        u.root_id || u.is_private !== !1 || u.chapter !== c || u.annotation_type !== "note" || !u.cfi || (d[u.cfi] = (d[u.cfi] || 0) + 1);
      }), Object.entries(d).map(([u, m]) => ({ paragraph_cfi: u, count: m }));
    },
    async get({ id: c }) {
      const d = r(), u = d.find((m) => m.id === c);
      if (!u) throw new Error("这条评论已不存在");
      return a(u, d);
    },
    async replies({ root_id: c, cursor: d, limit: u } = {}) {
      const m = r(), g = m.filter((v) => v.root_id === c).sort((v, _) => l(_, v)), h = Ku(g, d, u);
      return { ...h, items: h.items.map((v) => a(v, m)) };
    },
    async save(c) {
      const d = (/* @__PURE__ */ new Date()).toISOString(), u = r(), m = Uu(c) || Ii(), g = u.findIndex((_) => Uu(_) === m), h = g >= 0 ? u[g] : null, v = {
        ...h,
        ...c,
        id: (h == null ? void 0 : h.id) || c.id || m,
        client_id: c.client_id || (h == null ? void 0 : h.client_id) || m,
        created_at: (h == null ? void 0 : h.created_at) || c.created_at || d,
        updated_at: d
      };
      if (v.root_id && !h) {
        const _ = u.find((k) => k.id === v.reply_to_id && k.root_id === v.root_id);
        v.thread_id = _ ? _.thread_id || _.id : null, v.reply_to_name = _ ? Ss.nickname : "";
      }
      return g >= 0 ? u.splice(g, 1, v) : u.push(v), s(u), a(v, u);
    },
    async remove({ id: c }) {
      return s(r().filter((d) => d.id !== c && d.root_id !== c && d.thread_id !== c)), { id: c };
    },
    async vote({ id: c, value: d }) {
      const u = r(), m = u.find((g) => g.id === c);
      if (!m) throw new Error("这条评论已不存在");
      return m.user_vote = d, m.like_count = d === 1 ? 1 : 0, m.dislike_count = d === -1 ? 1 : 0, s(u), { like_count: m.like_count, dislike_count: m.dislike_count, user_vote: d };
    }
  };
}
function cb({ callbacks: e, bookId: t, bookUrl: n, storage: i } = {}) {
  const o = e != null;
  if (o && sb.some((l) => typeof e[l] != "function"))
    throw new Error("annotation_callbacks 必须同时提供 load 和 save 函数");
  const r = o ? e : ub({ bookId: t, bookUrl: n, storage: i }), s = { book_id: t || null, book_url: n || "" }, a = (l, c = {}) => {
    if (typeof r[l] != "function") throw new Error(`宿主未提供 ${l} 回调，无法完成该操作`);
    return r[l]({ ...s, ...c }, s);
  };
  return {
    source: o ? "callback" : "localStorage",
    async user() {
      return r.user && await a("user") || null;
    },
    async login() {
      r.login && await a("login");
    },
    async load(l = {}) {
      return ab(await a("load", l));
    },
    async list(l = {}) {
      return qu(await a("list", l));
    },
    async summary(l = {}) {
      const c = await a("summary", l), d = Array.isArray(c) ? c : c == null ? void 0 : c.items;
      return Array.isArray(d) ? d : [];
    },
    async get(l) {
      return Wu(await a("get", l));
    },
    async replies(l = {}) {
      return qu(await a("replies", l));
    },
    async save(l) {
      return Wu(await r.save({ ...l }, s));
    },
    async remove(l) {
      return a("remove", l);
    },
    async vote(l) {
      const c = await a("vote", l);
      if (!c || typeof c != "object") throw new Error("投票回调必须返回 { like_count, dislike_count, user_vote }");
      return c;
    }
  };
}
const Vr = ve()({
  name: "VCardActions",
  props: Ne(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ci({
      VBtn: {
        slim: !0,
        variant: "text"
      }
    }), Ee(() => {
      var i;
      return f("div", {
        class: ["v-card-actions", e.class],
        style: e.style
      }, [(i = n.default) == null ? void 0 : i.call(n)]);
    }), {};
  }
}), db = J({
  opacity: [Number, String],
  ...Ne(),
  ...it()
}, "VCardSubtitle"), fb = ve()({
  name: "VCardSubtitle",
  props: db(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => f(e.tag, {
      class: ["v-card-subtitle", e.class],
      style: [{
        "--v-card-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), Or = Ha("v-card-title");
function mb(e) {
  return {
    aspectStyles: y(() => {
      const t = Number(e.aspectRatio);
      return t ? {
        paddingBottom: String(1 / t * 100) + "%"
      } : void 0;
    })
  };
}
const Bf = J({
  aspectRatio: [String, Number],
  contentClass: null,
  inline: Boolean,
  ...Ne(),
  ...Xn()
}, "VResponsive"), Gu = ve()({
  name: "VResponsive",
  props: Bf(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      aspectStyles: i
    } = mb(e), {
      dimensionStyles: o
    } = Jn(e);
    return Ee(() => {
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
}), es = J({
  transition: {
    type: [Boolean, String, Object],
    default: "fade-transition",
    validator: (e) => e !== !0
  }
}, "transition"), Ln = (e, t) => {
  let {
    slots: n
  } = t;
  const {
    transition: i,
    disabled: o,
    group: r,
    ...s
  } = e, {
    component: a = r ? Aa : wi,
    ...l
  } = typeof i == "object" ? i : {};
  return Un(a, Oe(typeof i == "string" ? {
    name: o ? "" : i
  } : l, typeof i == "string" ? {} : Object.fromEntries(Object.entries({
    disabled: o,
    group: r
  }).filter((c) => {
    let [d, u] = c;
    return u !== void 0;
  })), s), n);
};
function hb(e, t) {
  if (!Da) return;
  const n = t.modifiers || {}, i = t.value, {
    handler: o,
    options: r
  } = typeof i == "object" ? i : {
    handler: i,
    options: {}
  }, s = new IntersectionObserver(function() {
    var u;
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], l = arguments.length > 1 ? arguments[1] : void 0;
    const c = (u = e._observe) == null ? void 0 : u[t.instance.$.uid];
    if (!c) return;
    const d = a.some((m) => m.isIntersecting);
    o && (!n.quiet || c.init) && (!n.once || d || c.init) && o(d, a, l), d && n.once ? Rf(e, t) : c.init = !0;
  }, r);
  e._observe = Object(e._observe), e._observe[t.instance.$.uid] = {
    init: !1,
    observer: s
  }, s.observe(e);
}
function Rf(e, t) {
  var i;
  const n = (i = e._observe) == null ? void 0 : i[t.instance.$.uid];
  n && (n.observer.unobserve(e), delete e._observe[t.instance.$.uid]);
}
const Hf = {
  mounted: hb,
  unmounted: Rf
}, vb = J({
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
  ...Bf(),
  ...Ne(),
  ...Pt(),
  ...es()
}, "VImg"), Za = ve()({
  name: "VImg",
  directives: {
    intersect: Hf
  },
  props: vb(),
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
    } = jt(le(e, "color")), {
      roundedClasses: s
    } = $t(e), a = Qe("VImg"), l = ke(""), c = se(), d = ke(e.eager ? "loading" : "idle"), u = ke(), m = ke(), g = y(() => e.src && typeof e.src == "object" ? {
      src: e.src.src,
      srcset: e.srcset || e.src.srcset,
      lazySrc: e.lazySrc || e.src.lazySrc,
      aspect: Number(e.aspectRatio || e.src.aspect || 0)
    } : {
      src: e.src,
      srcset: e.srcset,
      lazySrc: e.lazySrc,
      aspect: Number(e.aspectRatio || 0)
    }), h = y(() => g.value.aspect || u.value / m.value || 0);
    be(() => e.src, () => {
      v(d.value !== "idle");
    }), be(h, (w, A) => {
      !w && A && c.value && B(c.value);
    }), Sa(() => v());
    function v(w) {
      if (!(e.eager && w) && !(Da && !w && !e.eager)) {
        if (d.value = "loading", g.value.lazySrc) {
          const A = new Image();
          A.src = g.value.lazySrc, B(A, null);
        }
        g.value.src && ft(() => {
          var A;
          n("loadstart", ((A = c.value) == null ? void 0 : A.currentSrc) || g.value.src), setTimeout(() => {
            var M;
            if (!a.isUnmounted)
              if ((M = c.value) != null && M.complete) {
                if (c.value.naturalWidth || k(), d.value === "error") return;
                h.value || B(c.value, null), d.value === "loading" && _();
              } else
                h.value || B(c.value), O();
          });
        });
      }
    }
    function _() {
      var w;
      a.isUnmounted || (O(), B(c.value), d.value = "loaded", n("load", ((w = c.value) == null ? void 0 : w.currentSrc) || g.value.src));
    }
    function k() {
      var w;
      a.isUnmounted || (d.value = "error", n("error", ((w = c.value) == null ? void 0 : w.currentSrc) || g.value.src));
    }
    function O() {
      const w = c.value;
      w && (l.value = w.currentSrc || w.src);
    }
    let P = -1;
    gt(() => {
      clearTimeout(P);
    });
    function B(w) {
      let A = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 100;
      const M = () => {
        if (clearTimeout(P), a.isUnmounted) return;
        const {
          naturalHeight: ee,
          naturalWidth: oe
        } = w;
        ee || oe ? (u.value = oe, m.value = ee) : !w.complete && d.value === "loading" && A != null ? P = window.setTimeout(M, A) : (w.currentSrc.endsWith(".svg") || w.currentSrc.startsWith("data:image/svg+xml")) && (u.value = 1, m.value = 1);
      };
      M();
    }
    const C = y(() => ({
      "v-img__img--cover": e.cover,
      "v-img__img--contain": !e.cover
    })), V = () => {
      var M;
      if (!g.value.src || d.value === "idle") return null;
      const w = f("img", {
        class: ["v-img__img", C.value],
        style: {
          objectPosition: e.position
        },
        src: g.value.src,
        srcset: g.value.srcset,
        alt: e.alt,
        crossorigin: e.crossorigin,
        referrerpolicy: e.referrerpolicy,
        draggable: e.draggable,
        sizes: e.sizes,
        ref: c,
        onLoad: _,
        onError: k
      }, null), A = (M = i.sources) == null ? void 0 : M.call(i);
      return f(Ln, {
        transition: e.transition,
        appear: !0
      }, {
        default: () => [vt(A ? f("picture", {
          class: "v-img__picture"
        }, [A, w]) : w, [[Wn, d.value === "loaded"]])]
      });
    }, F = () => f(Ln, {
      transition: e.transition
    }, {
      default: () => [g.value.lazySrc && d.value !== "loaded" && f("img", {
        class: ["v-img__img", "v-img__img--preload", C.value],
        style: {
          objectPosition: e.position
        },
        src: g.value.lazySrc,
        alt: e.alt,
        crossorigin: e.crossorigin,
        referrerpolicy: e.referrerpolicy,
        draggable: e.draggable
      }, null)]
    }), x = () => i.placeholder ? f(Ln, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [(d.value === "loading" || d.value === "error" && !i.error) && f("div", {
        class: "v-img__placeholder"
      }, [i.placeholder()])]
    }) : null, N = () => i.error ? f(Ln, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [d.value === "error" && f("div", {
        class: "v-img__error"
      }, [i.error()])]
    }) : null, $ = () => e.gradient ? f("div", {
      class: "v-img__gradient",
      style: {
        backgroundImage: `linear-gradient(${e.gradient})`
      }
    }, null) : null, E = ke(!1);
    {
      const w = be(h, (A) => {
        A && (requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            E.value = !0;
          });
        }), w());
      });
    }
    return Ee(() => {
      const w = Gu.filterProps(e);
      return vt(f(Gu, Oe({
        class: ["v-img", {
          "v-img--absolute": e.absolute,
          "v-img--booting": !E.value
        }, o.value, s.value, e.class],
        style: [{
          width: he(e.width === "auto" ? u.value : e.width)
        }, r.value, e.style]
      }, w, {
        aspectRatio: h.value,
        "aria-label": e.alt,
        role: e.alt ? "img" : void 0
      }), {
        additional: () => f(fe, null, [f(V, null, null), f(F, null, null), f($, null, null), f(x, null, null), f(N, null, null)]),
        default: i.default
      }), [[Si("intersect"), {
        handler: v,
        options: e.options
      }, null, {
        once: !0
      }]]);
    }), {
      currentSrc: l,
      image: c,
      state: d,
      naturalWidth: u,
      naturalHeight: m
    };
  }
}), gb = J({
  start: Boolean,
  end: Boolean,
  icon: Xe,
  image: String,
  text: String,
  ...qn(),
  ...Ne(),
  ...mn(),
  ...Pt(),
  ...Gr(),
  ...it(),
  ...at(),
  ...Ei({
    variant: "flat"
  })
}, "VAvatar"), Tr = ve()({
  name: "VAvatar",
  props: gb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: i
    } = pt(e), {
      borderClasses: o
    } = Kn(e), {
      colorClasses: r,
      colorStyles: s,
      variantClasses: a
    } = Do(e), {
      densityClasses: l
    } = On(e), {
      roundedClasses: c
    } = $t(e), {
      sizeClasses: d,
      sizeStyles: u
    } = Yr(e);
    return Ee(() => f(e.tag, {
      class: ["v-avatar", {
        "v-avatar--start": e.start,
        "v-avatar--end": e.end
      }, i.value, o.value, r.value, l.value, c.value, d.value, a.value, e.class],
      style: [s.value, u.value, e.style]
    }, {
      default: () => [n.default ? f(mt, {
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
      }) : e.image ? f(Za, {
        key: "image",
        src: e.image,
        alt: "",
        cover: !0
      }, null) : e.icon ? f(Ve, {
        key: "icon",
        icon: e.icon
      }, null) : e.text, Ao(!1, "v-avatar")]
    })), {};
  }
}), pb = J({
  appendAvatar: String,
  appendIcon: Xe,
  prependAvatar: String,
  prependIcon: Xe,
  subtitle: [String, Number],
  title: [String, Number],
  ...Ne(),
  ...mn()
}, "VCardItem"), yb = ve()({
  name: "VCardItem",
  props: pb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => {
      var c;
      const i = !!(e.prependAvatar || e.prependIcon), o = !!(i || n.prepend), r = !!(e.appendAvatar || e.appendIcon), s = !!(r || n.append), a = !!(e.title != null || n.title), l = !!(e.subtitle != null || n.subtitle);
      return f("div", {
        class: ["v-card-item", e.class],
        style: e.style
      }, [o && f("div", {
        key: "prepend",
        class: "v-card-item__prepend"
      }, [n.prepend ? f(mt, {
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
      }, n.prepend) : f(fe, null, [e.prependAvatar && f(Tr, {
        key: "prepend-avatar",
        density: e.density,
        image: e.prependAvatar
      }, null), e.prependIcon && f(Ve, {
        key: "prepend-icon",
        density: e.density,
        icon: e.prependIcon
      }, null)])]), f("div", {
        class: "v-card-item__content"
      }, [a && f(Or, {
        key: "title"
      }, {
        default: () => {
          var d;
          return [((d = n.title) == null ? void 0 : d.call(n)) ?? e.title];
        }
      }), l && f(fb, {
        key: "subtitle"
      }, {
        default: () => {
          var d;
          return [((d = n.subtitle) == null ? void 0 : d.call(n)) ?? e.subtitle];
        }
      }), (c = n.default) == null ? void 0 : c.call(n)]), s && f("div", {
        key: "append",
        class: "v-card-item__append"
      }, [n.append ? f(mt, {
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
      }, n.append) : f(fe, null, [e.appendIcon && f(Ve, {
        key: "append-icon",
        density: e.density,
        icon: e.appendIcon
      }, null), e.appendAvatar && f(Tr, {
        key: "append-avatar",
        density: e.density,
        image: e.appendAvatar
      }, null)])])]);
    }), {};
  }
}), _b = J({
  opacity: [Number, String],
  ...Ne(),
  ...it()
}, "VCardText"), so = ve()({
  name: "VCardText",
  props: _b(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => f(e.tag, {
      class: ["v-card-text", e.class],
      style: [{
        "--v-card-text-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), bb = J({
  appendAvatar: String,
  appendIcon: Xe,
  disabled: Boolean,
  flat: Boolean,
  hover: Boolean,
  image: String,
  link: {
    type: Boolean,
    default: void 0
  },
  prependAvatar: String,
  prependIcon: Xe,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  subtitle: [String, Number],
  text: [String, Number],
  title: [String, Number],
  ...qn(),
  ...Ne(),
  ...mn(),
  ...Xn(),
  ...Gn(),
  ...qa(),
  ...Zr(),
  ...Ga(),
  ...Pt(),
  ...Ja(),
  ...it(),
  ...at(),
  ...Ei({
    variant: "elevated"
  })
}, "VCard"), eo = ve()({
  name: "VCard",
  directives: {
    Ripple: Io
  },
  props: bb(),
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const {
      themeClasses: o
    } = pt(e), {
      borderClasses: r
    } = Kn(e), {
      colorClasses: s,
      colorStyles: a,
      variantClasses: l
    } = Do(e), {
      densityClasses: c
    } = On(e), {
      dimensionStyles: d
    } = Jn(e), {
      elevationClasses: u
    } = Yn(e), {
      loaderClasses: m
    } = Qr(e), {
      locationStyles: g
    } = Wa(e), {
      positionClasses: h
    } = Ya(e), {
      roundedClasses: v
    } = $t(e), _ = Xa(e, n), k = y(() => e.link !== !1 && _.isLink.value), O = y(() => !e.disabled && e.link !== !1 && (e.link || _.isClickable.value));
    return Ee(() => {
      const P = k.value ? "a" : e.tag, B = !!(i.title || e.title != null), C = !!(i.subtitle || e.subtitle != null), V = B || C, F = !!(i.append || e.appendAvatar || e.appendIcon), x = !!(i.prepend || e.prependAvatar || e.prependIcon), N = !!(i.image || e.image), $ = V || x || F, E = !!(i.text || e.text != null);
      return vt(f(P, Oe({
        class: ["v-card", {
          "v-card--disabled": e.disabled,
          "v-card--flat": e.flat,
          "v-card--hover": e.hover && !(e.disabled || e.flat),
          "v-card--link": O.value
        }, o.value, r.value, s.value, c.value, u.value, m.value, h.value, v.value, l.value, e.class],
        style: [a.value, d.value, g.value, e.style],
        onClick: O.value && _.navigate,
        tabindex: e.disabled ? -1 : void 0
      }, _.linkProps), {
        default: () => {
          var w;
          return [N && f("div", {
            key: "image",
            class: "v-card__image"
          }, [i.image ? f(mt, {
            key: "image-defaults",
            disabled: !e.image,
            defaults: {
              VImg: {
                cover: !0,
                src: e.image
              }
            }
          }, i.image) : f(Za, {
            key: "image-img",
            cover: !0,
            src: e.image
          }, null)]), f(Ka, {
            name: "v-card",
            active: !!e.loading,
            color: typeof e.loading == "boolean" ? void 0 : e.loading
          }, {
            default: i.loader
          }), $ && f(yb, {
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
          }), E && f(so, {
            key: "text"
          }, {
            default: () => {
              var A;
              return [((A = i.text) == null ? void 0 : A.call(i)) ?? e.text];
            }
          }), (w = i.default) == null ? void 0 : w.call(i), i.actions && f(Vr, null, {
            default: i.actions
          }), Ao(O.value, "v-card")];
        }
      }), [[Si("ripple"), O.value && e.ripple]]);
    }), {};
  }
}), wb = J({
  disabled: Boolean,
  group: Boolean,
  hideOnLeave: Boolean,
  leaveAbsolute: Boolean,
  mode: String,
  origin: String
}, "transition");
function Mt(e, t, n) {
  return ve()({
    name: e,
    props: wb({
      mode: n,
      origin: t
    }),
    setup(i, o) {
      let {
        slots: r
      } = o;
      const s = {
        onBeforeEnter(a) {
          i.origin && (a.style.transformOrigin = i.origin);
        },
        onLeave(a) {
          if (i.leaveAbsolute) {
            const {
              offsetTop: l,
              offsetLeft: c,
              offsetWidth: d,
              offsetHeight: u
            } = a;
            a._transitionInitialStyles = {
              position: a.style.position,
              top: a.style.top,
              left: a.style.left,
              width: a.style.width,
              height: a.style.height
            }, a.style.position = "absolute", a.style.top = `${l}px`, a.style.left = `${c}px`, a.style.width = `${d}px`, a.style.height = `${u}px`;
          }
          i.hideOnLeave && a.style.setProperty("display", "none", "important");
        },
        onAfterLeave(a) {
          if (i.leaveAbsolute && (a != null && a._transitionInitialStyles)) {
            const {
              position: l,
              top: c,
              left: d,
              width: u,
              height: m
            } = a._transitionInitialStyles;
            delete a._transitionInitialStyles, a.style.position = l || "", a.style.top = c || "", a.style.left = d || "", a.style.width = u || "", a.style.height = m || "";
          }
        }
      };
      return () => {
        const a = i.group ? Aa : wi;
        return Un(a, {
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
function jf(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "in-out";
  return ve()({
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
      const s = i.group ? Aa : wi;
      return () => Un(s, {
        name: i.disabled ? "" : e,
        css: !i.disabled,
        // mode: props.mode, // TODO: vuejs/vue-next#3104
        ...i.disabled ? {} : t
      }, r.default);
    }
  });
}
function zf() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  const n = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1) ? "width" : "height", i = dt(`offset-${n}`);
  return {
    onBeforeEnter(s) {
      s._parent = s.parentNode, s._initialStyle = {
        transition: s.style.transition,
        overflow: s.style.overflow,
        [n]: s.style[n]
      };
    },
    onEnter(s) {
      const a = s._initialStyle;
      s.style.setProperty("transition", "none", "important"), s.style.overflow = "hidden";
      const l = `${s[i]}px`;
      s.style[n] = "0", s.offsetHeight, s.style.transition = a.transition, e && s._parent && s._parent.classList.add(e), requestAnimationFrame(() => {
        s.style[n] = l;
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
    const a = s._initialStyle[n];
    s.style.overflow = s._initialStyle.overflow, a != null && (s.style[n] = a), delete s._initialStyle;
  }
}
const Sb = J({
  target: [Object, Array]
}, "v-dialog-transition"), kb = ve()({
  name: "VDialogTransition",
  props: Sb(),
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
        await new Promise((g) => requestAnimationFrame(g)), await new Promise((g) => requestAnimationFrame(g)), o.style.visibility = "";
        const {
          x: s,
          y: a,
          sx: l,
          sy: c,
          speed: d
        } = Xu(e.target, o), u = Di(o, [{
          transform: `translate(${s}px, ${a}px) scale(${l}, ${c})`,
          opacity: 0
        }, {}], {
          duration: 225 * d,
          easing: Bp
        });
        (m = Yu(o)) == null || m.forEach((g) => {
          Di(g, [{
            opacity: 0
          }, {
            opacity: 0,
            offset: 0.33
          }, {}], {
            duration: 225 * 2 * d,
            easing: Sr
          });
        }), u.finished.then(() => r());
      },
      onAfterEnter(o) {
        o.style.removeProperty("pointer-events");
      },
      onBeforeLeave(o) {
        o.style.pointerEvents = "none";
      },
      async onLeave(o, r) {
        var m;
        await new Promise((g) => requestAnimationFrame(g));
        const {
          x: s,
          y: a,
          sx: l,
          sy: c,
          speed: d
        } = Xu(e.target, o);
        Di(o, [{}, {
          transform: `translate(${s}px, ${a}px) scale(${l}, ${c})`,
          opacity: 0
        }], {
          duration: 125 * d,
          easing: Rp
        }).finished.then(() => r()), (m = Yu(o)) == null || m.forEach((g) => {
          Di(g, [{}, {
            opacity: 0,
            offset: 0.2
          }, {
            opacity: 0
          }], {
            duration: 125 * 2 * d,
            easing: Sr
          });
        });
      },
      onAfterLeave(o) {
        o.style.removeProperty("pointer-events");
      }
    };
    return () => e.target ? f(wi, Oe({
      name: "dialog-transition"
    }, i, {
      css: !1
    }), n) : f(wi, {
      name: "dialog-transition"
    }, n);
  }
});
function Yu(e) {
  var n;
  const t = (n = e.querySelector(":scope > .v-card, :scope > .v-sheet, :scope > .v-list")) == null ? void 0 : n.children;
  return t && [...t];
}
function Xu(e, t) {
  const n = ef(e), i = Fa(t), [o, r] = getComputedStyle(t).transformOrigin.split(" ").map((k) => parseFloat(k)), [s, a] = getComputedStyle(t).getPropertyValue("--v-overlay-anchor-origin").split(" ");
  let l = n.left + n.width / 2;
  s === "left" || a === "left" ? l -= n.width / 2 : (s === "right" || a === "right") && (l += n.width / 2);
  let c = n.top + n.height / 2;
  s === "top" || a === "top" ? c -= n.height / 2 : (s === "bottom" || a === "bottom") && (c += n.height / 2);
  const d = n.width / i.width, u = n.height / i.height, m = Math.max(1, d, u), g = d / m || 0, h = u / m || 0, v = i.width * i.height / (window.innerWidth * window.innerHeight), _ = v > 0.12 ? Math.min(1.5, (v - 0.12) * 10 + 1) : 1;
  return {
    x: l - (o + i.left),
    y: c - (r + i.top),
    sx: g,
    sy: h,
    speed: _
  };
}
Mt("fab-transition", "center center", "out-in");
Mt("dialog-bottom-transition");
Mt("dialog-top-transition");
Mt("fade-transition");
const Uf = Mt("scale-transition");
Mt("scroll-x-transition");
Mt("scroll-x-reverse-transition");
Mt("scroll-y-transition");
Mt("scroll-y-reverse-transition");
Mt("slide-x-transition");
Mt("slide-x-reverse-transition");
const Wf = Mt("slide-y-transition");
Mt("slide-y-reverse-transition");
const qf = jf("expand-transition", zf()), Cb = jf("expand-x-transition", zf("", !0));
function ks(e, t) {
  return {
    x: e.x + t.x,
    y: e.y + t.y
  };
}
function Eb(e, t) {
  return {
    x: e.x - t.x,
    y: e.y - t.y
  };
}
function Ju(e, t) {
  if (e.side === "top" || e.side === "bottom") {
    const {
      side: n,
      align: i
    } = e, o = i === "left" ? 0 : i === "center" ? t.width / 2 : i === "right" ? t.width : i, r = n === "top" ? 0 : n === "bottom" ? t.height : n;
    return ks({
      x: o,
      y: r
    }, t);
  } else if (e.side === "left" || e.side === "right") {
    const {
      side: n,
      align: i
    } = e, o = n === "left" ? 0 : n === "right" ? t.width : n, r = i === "top" ? 0 : i === "center" ? t.height / 2 : i === "bottom" ? t.height : i;
    return ks({
      x: o,
      y: r
    }, t);
  }
  return ks({
    x: t.width / 2,
    y: t.height / 2
  }, t);
}
const Kf = {
  static: Vb,
  // specific viewport position, usually centered
  connected: Tb
  // connected to a certain element
}, xb = J({
  locationStrategy: {
    type: [String, Function],
    default: "static",
    validator: (e) => typeof e == "function" || e in Kf
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
function Nb(e, t) {
  const n = se({}), i = se();
  ze && zn(() => !!(t.isActive.value && e.locationStrategy), (r) => {
    var s, a;
    be(() => e.locationStrategy, r), It(() => {
      window.removeEventListener("resize", o), i.value = void 0;
    }), window.addEventListener("resize", o, {
      passive: !0
    }), typeof e.locationStrategy == "function" ? i.value = (s = e.locationStrategy(t, e, n)) == null ? void 0 : s.updateLocation : i.value = (a = Kf[e.locationStrategy](t, e, n)) == null ? void 0 : a.updateLocation;
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
function Vb() {
}
function Ob(e, t) {
  const n = Fa(e);
  return t ? n.x += parseFloat(e.style.right || 0) : n.x -= parseFloat(e.style.left || 0), n.y -= parseFloat(e.style.top || 0), n;
}
function Tb(e, t, n) {
  (Array.isArray(e.target.value) || zp(e.target.value)) && Object.assign(n.value, {
    position: "fixed",
    top: 0,
    [e.isRtl.value ? "right" : "left"]: 0
  });
  const {
    preferredAnchor: o,
    preferredOrigin: r
  } = La(() => {
    const h = Xs(t.location, e.isRtl.value), v = t.origin === "overlap" ? h : t.origin === "auto" ? ys(h) : Xs(t.origin, e.isRtl.value);
    return h.side === v.side && h.align === _s(v).align ? {
      preferredAnchor: hu(h),
      preferredOrigin: hu(v)
    } : {
      preferredAnchor: h,
      preferredOrigin: v
    };
  }), [s, a, l, c] = ["minWidth", "minHeight", "maxWidth", "maxHeight"].map((h) => y(() => {
    const v = parseFloat(t[h]);
    return isNaN(v) ? 1 / 0 : v;
  })), d = y(() => {
    if (Array.isArray(t.offset))
      return t.offset;
    if (typeof t.offset == "string") {
      const h = t.offset.split(" ").map(parseFloat);
      return h.length < 2 && h.push(0), h;
    }
    return typeof t.offset == "number" ? [t.offset, 0] : [0, 0];
  });
  let u = !1;
  const m = new ResizeObserver(() => {
    u && g();
  });
  be([e.target, e.contentEl], (h, v) => {
    let [_, k] = h, [O, P] = v;
    O && !Array.isArray(O) && m.unobserve(O), _ && !Array.isArray(_) && m.observe(_), P && m.unobserve(P), k && m.observe(k);
  }, {
    immediate: !0
  }), It(() => {
    m.disconnect();
  });
  function g() {
    if (u = !1, requestAnimationFrame(() => u = !0), !e.target.value || !e.contentEl.value) return;
    const h = ef(e.target.value), v = Ob(e.contentEl.value, e.isRtl.value), _ = kr(e.contentEl.value), k = 12;
    _.length || (_.push(document.documentElement), e.contentEl.value.style.top && e.contentEl.value.style.left || (v.x -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-x") || 0), v.y -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-y") || 0)));
    const O = _.reduce((E, w) => {
      const A = w.getBoundingClientRect(), M = new pi({
        x: w === document.documentElement ? 0 : A.x,
        y: w === document.documentElement ? 0 : A.y,
        width: w.clientWidth,
        height: w.clientHeight
      });
      return E ? new pi({
        x: Math.max(E.left, M.left),
        y: Math.max(E.top, M.top),
        width: Math.min(E.right, M.right) - Math.max(E.left, M.left),
        height: Math.min(E.bottom, M.bottom) - Math.max(E.top, M.top)
      }) : M;
    }, void 0);
    O.x += k, O.y += k, O.width -= k * 2, O.height -= k * 2;
    let P = {
      anchor: o.value,
      origin: r.value
    };
    function B(E) {
      const w = new pi(v), A = Ju(E.anchor, h), M = Ju(E.origin, w);
      let {
        x: ee,
        y: oe
      } = Eb(A, M);
      switch (E.anchor.side) {
        case "top":
          oe -= d.value[0];
          break;
        case "bottom":
          oe += d.value[0];
          break;
        case "left":
          ee -= d.value[0];
          break;
        case "right":
          ee += d.value[0];
          break;
      }
      switch (E.anchor.align) {
        case "top":
          oe -= d.value[1];
          break;
        case "bottom":
          oe += d.value[1];
          break;
        case "left":
          ee -= d.value[1];
          break;
        case "right":
          ee += d.value[1];
          break;
      }
      return w.x += ee, w.y += oe, w.width = Math.min(w.width, l.value), w.height = Math.min(w.height, c.value), {
        overflows: gu(w, O),
        x: ee,
        y: oe
      };
    }
    let C = 0, V = 0;
    const F = {
      x: 0,
      y: 0
    }, x = {
      x: !1,
      y: !1
    };
    let N = -1;
    for (; ; ) {
      if (N++ > 10) {
        br("Infinite loop detected in connectedLocationStrategy");
        break;
      }
      const {
        x: E,
        y: w,
        overflows: A
      } = B(P);
      C += E, V += w, v.x += E, v.y += w;
      {
        const M = vu(P.anchor), ee = A.x.before || A.x.after, oe = A.y.before || A.y.after;
        let ne = !1;
        if (["x", "y"].forEach((G) => {
          if (G === "x" && ee && !x.x || G === "y" && oe && !x.y) {
            const Se = {
              anchor: {
                ...P.anchor
              },
              origin: {
                ...P.origin
              }
            }, xe = G === "x" ? M === "y" ? _s : ys : M === "y" ? ys : _s;
            Se.anchor = xe(Se.anchor), Se.origin = xe(Se.origin);
            const {
              overflows: we
            } = B(Se);
            (we[G].before <= A[G].before && we[G].after <= A[G].after || we[G].before + we[G].after < (A[G].before + A[G].after) / 2) && (P = Se, ne = x[G] = !0);
          }
        }), ne) continue;
      }
      A.x.before && (C += A.x.before, v.x += A.x.before), A.x.after && (C -= A.x.after, v.x -= A.x.after), A.y.before && (V += A.y.before, v.y += A.y.before), A.y.after && (V -= A.y.after, v.y -= A.y.after);
      {
        const M = gu(v, O);
        F.x = O.width - M.x.before - M.x.after, F.y = O.height - M.y.before - M.y.after, C += M.x.before, v.x += M.x.before, V += M.y.before, v.y += M.y.before;
      }
      break;
    }
    const $ = vu(P.anchor);
    return Object.assign(n.value, {
      "--v-overlay-anchor-origin": `${P.anchor.side} ${P.anchor.align}`,
      transformOrigin: `${P.origin.side} ${P.origin.align}`,
      // transform: `translate(${pixelRound(x)}px, ${pixelRound(y)}px)`,
      top: he(Cs(V)),
      left: e.isRtl.value ? void 0 : he(Cs(C)),
      right: e.isRtl.value ? he(Cs(-C)) : void 0,
      minWidth: he($ === "y" ? Math.min(s.value, h.width) : s.value),
      maxWidth: he(Zu(kn(F.x, s.value === 1 / 0 ? 0 : s.value, l.value))),
      maxHeight: he(Zu(kn(F.y, a.value === 1 / 0 ? 0 : a.value, c.value)))
    }), {
      available: F,
      contentBox: v
    };
  }
  return be(() => [o.value, r.value, t.offset, t.minWidth, t.minHeight, t.maxWidth, t.maxHeight], () => g()), ft(() => {
    const h = g();
    if (!h) return;
    const {
      available: v,
      contentBox: _
    } = h;
    _.height > v.y && requestAnimationFrame(() => {
      g(), requestAnimationFrame(() => {
        g();
      });
    });
  }), {
    updateLocation: g
  };
}
function Cs(e) {
  return Math.round(e * devicePixelRatio) / devicePixelRatio;
}
function Zu(e) {
  return Math.ceil(e * devicePixelRatio) / devicePixelRatio;
}
let ia = !0;
const Ar = [];
function Ab(e) {
  !ia || Ar.length ? (Ar.push(e), oa()) : (ia = !1, e(), oa());
}
let Qu = -1;
function oa() {
  cancelAnimationFrame(Qu), Qu = requestAnimationFrame(() => {
    const e = Ar.shift();
    e && e(), Ar.length ? oa() : ia = !0;
  });
}
const tr = {
  none: null,
  close: Pb,
  block: $b,
  reposition: Mb
}, Db = J({
  scrollStrategy: {
    type: [String, Function],
    default: "block",
    validator: (e) => typeof e == "function" || e in tr
  }
}, "VOverlay-scroll-strategies");
function Ib(e, t) {
  if (!ze) return;
  let n;
  Jt(async () => {
    n == null || n.stop(), t.isActive.value && e.scrollStrategy && (n = fa(), await new Promise((i) => setTimeout(i)), n.active && n.run(() => {
      var i;
      typeof e.scrollStrategy == "function" ? e.scrollStrategy(t, e, n) : (i = tr[e.scrollStrategy]) == null || i.call(tr, t, e, n);
    }));
  }), It(() => {
    n == null || n.stop();
  });
}
function Pb(e) {
  function t(n) {
    e.isActive.value = !1;
  }
  Gf(e.targetEl.value ?? e.contentEl.value, t);
}
function $b(e, t) {
  var s;
  const n = (s = e.root.value) == null ? void 0 : s.offsetParent, i = [.../* @__PURE__ */ new Set([...kr(e.targetEl.value, t.contained ? n : void 0), ...kr(e.contentEl.value, t.contained ? n : void 0)])].filter((a) => !a.classList.contains("v-overlay-scroll-blocked")), o = window.innerWidth - document.documentElement.offsetWidth, r = ((a) => ja(a) && a)(n || document.documentElement);
  r && e.root.value.classList.add("v-overlay--scroll-blocked"), i.forEach((a, l) => {
    a.style.setProperty("--v-body-scroll-x", he(-a.scrollLeft)), a.style.setProperty("--v-body-scroll-y", he(-a.scrollTop)), a !== document.documentElement && a.style.setProperty("--v-scrollbar-offset", he(o)), a.classList.add("v-overlay-scroll-blocked");
  }), It(() => {
    i.forEach((a, l) => {
      const c = parseFloat(a.style.getPropertyValue("--v-body-scroll-x")), d = parseFloat(a.style.getPropertyValue("--v-body-scroll-y")), u = a.style.scrollBehavior;
      a.style.scrollBehavior = "auto", a.style.removeProperty("--v-body-scroll-x"), a.style.removeProperty("--v-body-scroll-y"), a.style.removeProperty("--v-scrollbar-offset"), a.classList.remove("v-overlay-scroll-blocked"), a.scrollLeft = -c, a.scrollTop = -d, a.style.scrollBehavior = u;
    }), r && e.root.value.classList.remove("v-overlay--scroll-blocked");
  });
}
function Mb(e, t, n) {
  let i = !1, o = -1, r = -1;
  function s(a) {
    Ab(() => {
      var d, u;
      const l = performance.now();
      (u = (d = e.updateLocation).value) == null || u.call(d, a), i = (performance.now() - l) / (1e3 / 60) > 2;
    });
  }
  r = (typeof requestIdleCallback > "u" ? (a) => a() : requestIdleCallback)(() => {
    n.run(() => {
      Gf(e.targetEl.value ?? e.contentEl.value, (a) => {
        i ? (cancelAnimationFrame(o), o = requestAnimationFrame(() => {
          o = requestAnimationFrame(() => {
            s(a);
          });
        })) : s(a);
      });
    });
  }), It(() => {
    typeof cancelIdleCallback < "u" && cancelIdleCallback(r), cancelAnimationFrame(o);
  });
}
function Gf(e, t) {
  const n = [document, ...kr(e)];
  n.forEach((i) => {
    i.addEventListener("scroll", t, {
      passive: !0
    });
  }), It(() => {
    n.forEach((i) => {
      i.removeEventListener("scroll", t);
    });
  });
}
const Lb = Symbol.for("vuetify:v-menu"), Fb = J({
  closeDelay: [Number, String],
  openDelay: [Number, String]
}, "delay");
function Bb(e, t) {
  let n = () => {
  };
  function i(s) {
    n == null || n();
    const a = Number(s ? e.openDelay : e.closeDelay);
    return new Promise((l) => {
      n = up(a, () => {
        t == null || t(s), l(s);
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
const Rb = J({
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
  ...Fb()
}, "VOverlay-activator");
function Hb(e, t) {
  let {
    isActive: n,
    isTop: i,
    contentEl: o
  } = t;
  const r = Qe("useActivator"), s = se();
  let a = !1, l = !1, c = !0;
  const d = y(() => e.openOnFocus || e.openOnFocus == null && e.openOnHover), u = y(() => e.openOnClick || e.openOnClick == null && !e.openOnHover && !d.value), {
    runOpenDelay: m,
    runCloseDelay: g
  } = Bb(e, (x) => {
    x === (e.openOnHover && a || d.value && l) && !(e.openOnHover && n.value && !i.value) && (n.value !== x && (c = !0), n.value = x);
  }), h = se(), v = {
    onClick: (x) => {
      x.stopPropagation(), s.value = x.currentTarget || x.target, n.value || (h.value = [x.clientX, x.clientY]), n.value = !n.value;
    },
    onMouseenter: (x) => {
      var N;
      (N = x.sourceCapabilities) != null && N.firesTouchEvents || (a = !0, s.value = x.currentTarget || x.target, m());
    },
    onMouseleave: (x) => {
      a = !1, g();
    },
    onFocus: (x) => {
      Zd(x.target, ":focus-visible") !== !1 && (l = !0, x.stopPropagation(), s.value = x.currentTarget || x.target, m());
    },
    onBlur: (x) => {
      l = !1, x.stopPropagation(), g();
    }
  }, _ = y(() => {
    const x = {};
    return u.value && (x.onClick = v.onClick), e.openOnHover && (x.onMouseenter = v.onMouseenter, x.onMouseleave = v.onMouseleave), d.value && (x.onFocus = v.onFocus, x.onBlur = v.onBlur), x;
  }), k = y(() => {
    const x = {};
    if (e.openOnHover && (x.onMouseenter = () => {
      a = !0, m();
    }, x.onMouseleave = () => {
      a = !1, g();
    }), d.value && (x.onFocusin = () => {
      l = !0, m();
    }, x.onFocusout = () => {
      l = !1, g();
    }), e.closeOnContentClick) {
      const N = He(Lb, null);
      x.onClick = () => {
        n.value = !1, N == null || N.closeParents();
      };
    }
    return x;
  }), O = y(() => {
    const x = {};
    return e.openOnHover && (x.onMouseenter = () => {
      c && (a = !0, c = !1, m());
    }, x.onMouseleave = () => {
      a = !1, g();
    }), x;
  });
  be(i, (x) => {
    var N;
    x && (e.openOnHover && !a && (!d.value || !l) || d.value && !l && (!e.openOnHover || !a)) && !((N = o.value) != null && N.contains(document.activeElement)) && (n.value = !1);
  }), be(n, (x) => {
    x || setTimeout(() => {
      h.value = void 0;
    });
  }, {
    flush: "post"
  });
  const P = Ys();
  Jt(() => {
    P.value && ft(() => {
      s.value = P.el;
    });
  });
  const B = Ys(), C = y(() => e.target === "cursor" && h.value ? h.value : B.value ? B.el : Yf(e.target, r) || s.value), V = y(() => Array.isArray(C.value) ? void 0 : C.value);
  let F;
  return be(() => !!e.activator, (x) => {
    x && ze ? (F = fa(), F.run(() => {
      jb(e, r, {
        activatorEl: s,
        activatorEvents: _
      });
    })) : F && F.stop();
  }, {
    flush: "post",
    immediate: !0
  }), It(() => {
    F == null || F.stop();
  }), {
    activatorEl: s,
    activatorRef: P,
    target: C,
    targetEl: V,
    targetRef: B,
    activatorEvents: _,
    contentEvents: k,
    scrimEvents: O
  };
}
function jb(e, t, n) {
  let {
    activatorEl: i,
    activatorEvents: o
  } = n;
  be(() => e.activator, (l, c) => {
    if (c && l !== c) {
      const d = a(c);
      d && s(d);
    }
    l && ft(() => r());
  }, {
    immediate: !0
  }), be(() => e.activatorProps, () => {
    r();
  }), It(() => {
    s();
  });
  function r() {
    let l = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : a(), c = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    l && dp(l, Oe(o.value, c));
  }
  function s() {
    let l = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : a(), c = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    l && fp(l, Oe(o.value, c));
  }
  function a() {
    let l = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : e.activator;
    const c = Yf(l, t);
    return i.value = (c == null ? void 0 : c.nodeType) === Node.ELEMENT_NODE ? c : void 0, i.value;
  }
}
function Yf(e, t) {
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
function zb() {
  if (!ze) return ke(!1);
  const {
    ssr: e
  } = Ry();
  if (e) {
    const t = ke(!1);
    return cn(() => {
      t.value = !0;
    }), t;
  } else
    return ke(!0);
}
const Ub = J({
  eager: Boolean
}, "lazy");
function Wb(e, t) {
  const n = ke(!1), i = y(() => n.value || e.eager || t.value);
  be(t, () => n.value = !0);
  function o() {
    e.eager || (n.value = !1);
  }
  return {
    isBooted: n,
    hasContent: i,
    onAfterLeave: o
  };
}
function Qa() {
  const t = Qe("useScopeId").vnode.scopeId;
  return {
    scopeId: t ? {
      [t]: ""
    } : void 0
  };
}
const ec = Symbol.for("vuetify:stack"), Ji = ct([]);
function qb(e, t, n) {
  const i = Qe("useStack"), o = !n, r = He(ec, void 0), s = ct({
    activeChildren: /* @__PURE__ */ new Set()
  });
  Et(ec, s);
  const a = ke(+t.value);
  zn(e, () => {
    var u;
    const d = (u = Ji.at(-1)) == null ? void 0 : u[1];
    a.value = d ? d + 10 : +t.value, o && Ji.push([i.uid, a.value]), r == null || r.activeChildren.add(i.uid), It(() => {
      if (o) {
        const m = ae(Ji).findIndex((g) => g[0] === i.uid);
        Ji.splice(m, 1);
      }
      r == null || r.activeChildren.delete(i.uid);
    });
  });
  const l = ke(!0);
  o && Jt(() => {
    var u;
    const d = ((u = Ji.at(-1)) == null ? void 0 : u[0]) === i.uid;
    setTimeout(() => l.value = d);
  });
  const c = y(() => !s.activeChildren.size);
  return {
    globalTop: Eo(l),
    localTop: c,
    stackStyles: y(() => ({
      zIndex: a.value
    }))
  };
}
function Kb(e) {
  return {
    teleportTarget: y(() => {
      const n = e();
      if (n === !0 || !ze) return;
      const i = n === !1 ? document.body : typeof n == "string" ? document.querySelector(n) : n;
      if (i == null) {
        Ct(`Unable to locate target ${n}`);
        return;
      }
      let o = [...i.children].find((r) => r.matches(".v-overlay-container"));
      return o || (o = document.createElement("div"), o.className = "v-overlay-container", i.appendChild(o)), o;
    })
  };
}
function Gb() {
  return !0;
}
function Xf(e, t, n) {
  if (!e || Jf(e, n) === !1) return !1;
  const i = lf(t);
  if (typeof ShadowRoot < "u" && i instanceof ShadowRoot && i.host === e.target) return !1;
  const o = (typeof n.value == "object" && n.value.include || (() => []))();
  return o.push(t), !o.some((r) => r == null ? void 0 : r.contains(e.target));
}
function Jf(e, t) {
  return (typeof t.value == "object" && t.value.closeConditional || Gb)(e);
}
function Yb(e, t, n) {
  const i = typeof n.value == "function" ? n.value : n.value.handler;
  e.shadowTarget = e.target, t._clickOutside.lastMousedownWasOutside && Xf(e, t, n) && setTimeout(() => {
    Jf(e, n) && i && i(e);
  }, 0);
}
function tc(e, t) {
  const n = lf(e);
  t(document), typeof ShadowRoot < "u" && n instanceof ShadowRoot && t(n);
}
const Xb = {
  // [data-app] may not be found
  // if using bind, inserted makes
  // sure that the root element is
  // available, iOS does not support
  // clicks on body
  mounted(e, t) {
    const n = (o) => Yb(o, e, t), i = (o) => {
      e._clickOutside.lastMousedownWasOutside = Xf(o, e, t);
    };
    tc(e, (o) => {
      o.addEventListener("click", n, !0), o.addEventListener("mousedown", i, !0);
    }), e._clickOutside || (e._clickOutside = {
      lastMousedownWasOutside: !1
    }), e._clickOutside[t.instance.$.uid] = {
      onClick: n,
      onMousedown: i
    };
  },
  beforeUnmount(e, t) {
    e._clickOutside && (tc(e, (n) => {
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
function Jb(e) {
  const {
    modelValue: t,
    color: n,
    ...i
  } = e;
  return f(wi, {
    name: "fade-transition",
    appear: !0
  }, {
    default: () => [e.modelValue && f("div", Oe({
      class: ["v-overlay__scrim", e.color.backgroundColorClasses.value],
      style: e.color.backgroundColorStyles.value
    }, i), null)]
  });
}
const el = J({
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
  ...Rb(),
  ...Ne(),
  ...Xn(),
  ...Ub(),
  ...xb(),
  ...Db(),
  ...at(),
  ...es()
}, "VOverlay"), bo = ve()({
  name: "VOverlay",
  directives: {
    ClickOutside: Xb
  },
  inheritAttrs: !1,
  props: {
    _disableGlobalStack: Boolean,
    ...el()
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
    const r = Qe("VOverlay"), s = se(), a = se(), l = se(), c = nt(e, "modelValue"), d = y({
      get: () => c.value,
      set: (Z) => {
        Z && e.disabled || (c.value = Z);
      }
    }), {
      themeClasses: u
    } = pt(e), {
      rtlClasses: m,
      isRtl: g
    } = fn(), {
      hasContent: h,
      onAfterLeave: v
    } = Wb(e, d), _ = jt(y(() => typeof e.scrim == "string" ? e.scrim : null)), {
      globalTop: k,
      localTop: O,
      stackStyles: P
    } = qb(d, le(e, "zIndex"), e._disableGlobalStack), {
      activatorEl: B,
      activatorRef: C,
      target: V,
      targetEl: F,
      targetRef: x,
      activatorEvents: N,
      contentEvents: $,
      scrimEvents: E
    } = Hb(e, {
      isActive: d,
      isTop: O,
      contentEl: l
    }), {
      teleportTarget: w
    } = Kb(() => {
      var De, lt, We;
      const Z = e.attach || e.contained;
      if (Z) return Z;
      const ye = ((De = B == null ? void 0 : B.value) == null ? void 0 : De.getRootNode()) || ((We = (lt = r.proxy) == null ? void 0 : lt.$el) == null ? void 0 : We.getRootNode());
      return ye instanceof ShadowRoot ? ye : !1;
    }), {
      dimensionStyles: A
    } = Jn(e), M = zb(), {
      scopeId: ee
    } = Qa();
    be(() => e.disabled, (Z) => {
      Z && (d.value = !1);
    });
    const {
      contentStyles: oe,
      updateLocation: ne
    } = Nb(e, {
      isRtl: g,
      contentEl: l,
      target: V,
      isActive: d
    });
    Ib(e, {
      root: s,
      contentEl: l,
      targetEl: F,
      isActive: d,
      updateLocation: ne
    });
    function G(Z) {
      o("click:outside", Z), e.persistent ? Te() : d.value = !1;
    }
    function Se(Z) {
      return d.value && k.value && // If using scrim, only close if clicking on it rather than anything opened on top
      (!e.scrim || Z.target === a.value || Z instanceof MouseEvent && Z.shadowTarget === a.value);
    }
    ze && be(d, (Z) => {
      Z ? window.addEventListener("keydown", xe) : window.removeEventListener("keydown", xe);
    }, {
      immediate: !0
    }), gt(() => {
      ze && window.removeEventListener("keydown", xe);
    });
    function xe(Z) {
      var ye, De;
      Z.key === "Escape" && k.value && (e.persistent ? Te() : (d.value = !1, (ye = l.value) != null && ye.contains(document.activeElement) && ((De = B.value) == null || De.focus())));
    }
    const we = R_();
    zn(() => e.closeOnBack, () => {
      H_(we, (Z) => {
        k.value && d.value ? (Z(!1), e.persistent ? Te() : d.value = !1) : Z();
      });
    });
    const de = se();
    be(() => d.value && (e.absolute || e.contained) && w.value == null, (Z) => {
      if (Z) {
        const ye = Hp(s.value);
        ye && ye !== document.scrollingElement && (de.value = ye.scrollTop);
      }
    });
    function Te() {
      e.noClickAnimation || l.value && Di(l.value, [{
        transformOrigin: "center"
      }, {
        transform: "scale(1.03)"
      }, {
        transformOrigin: "center"
      }], {
        duration: 150,
        easing: Sr
      });
    }
    function Je() {
      o("afterEnter");
    }
    function Ge() {
      v(), o("afterLeave");
    }
    return Ee(() => {
      var Z;
      return f(fe, null, [(Z = n.activator) == null ? void 0 : Z.call(n, {
        isActive: d.value,
        targetRef: x,
        props: Oe({
          ref: C
        }, N.value, e.activatorProps)
      }), M.value && h.value && f(Qh, {
        disabled: !w.value,
        to: w.value
      }, {
        default: () => [f("div", Oe({
          class: ["v-overlay", {
            "v-overlay--absolute": e.absolute || e.contained,
            "v-overlay--active": d.value,
            "v-overlay--contained": e.contained
          }, u.value, m.value, e.class],
          style: [P.value, {
            "--v-overlay-opacity": e.opacity,
            top: he(de.value)
          }, e.style],
          ref: s
        }, ee, i), [f(Jb, Oe({
          color: _,
          modelValue: d.value && !!e.scrim,
          ref: a
        }, E.value), null), f(Ln, {
          appear: !0,
          persisted: !0,
          transition: e.transition,
          target: V.value,
          onAfterEnter: Je,
          onAfterLeave: Ge
        }, {
          default: () => {
            var ye;
            return [vt(f("div", Oe({
              ref: l,
              class: ["v-overlay__content", e.contentClass],
              style: [A.value, oe.value]
            }, $.value, e.contentProps), [(ye = n.default) == null ? void 0 : ye.call(n, {
              isActive: d
            })]), [[Wn, d.value], [Si("click-outside"), {
              handler: G,
              closeConditional: Se,
              include: () => [B.value]
            }]])];
          }
        })])]
      })]);
    }), {
      activatorEl: B,
      scrimEl: a,
      target: V,
      animateClick: Te,
      contentEl: l,
      globalTop: k,
      localTop: O,
      updateLocation: ne
    };
  }
}), Es = Symbol("Forwarded refs");
function xs(e, t) {
  let n = e;
  for (; n; ) {
    const i = Reflect.getOwnPropertyDescriptor(n, t);
    if (i) return i;
    n = Object.getPrototypeOf(n);
  }
}
function tl(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
    n[i - 1] = arguments[i];
  return e[Es] = n, new Proxy(e, {
    get(o, r) {
      if (Reflect.has(o, r))
        return Reflect.get(o, r);
      if (!(typeof r == "symbol" || r.startsWith("$") || r.startsWith("__"))) {
        for (const s of n)
          if (s.value && Reflect.has(s.value, r)) {
            const a = Reflect.get(s.value, r);
            return typeof a == "function" ? a.bind(s.value) : a;
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
      for (const a of n)
        if (a.value && Reflect.has(a.value, r))
          return Reflect.set(a.value, r, s);
      return !1;
    },
    getOwnPropertyDescriptor(o, r) {
      var a;
      const s = Reflect.getOwnPropertyDescriptor(o, r);
      if (s) return s;
      if (!(typeof r == "symbol" || r.startsWith("$") || r.startsWith("__"))) {
        for (const l of n) {
          if (!l.value) continue;
          const c = xs(l.value, r) ?? ("_" in l.value ? xs((a = l.value._) == null ? void 0 : a.setupState, r) : void 0);
          if (c) return c;
        }
        for (const l of n) {
          const c = l.value && l.value[Es];
          if (!c) continue;
          const d = c.slice();
          for (; d.length; ) {
            const u = d.shift(), m = xs(u.value, r);
            if (m) return m;
            const g = u.value && u.value[Es];
            g && d.push(...g);
          }
        }
      }
    }
  });
}
const Zf = J({
  fullscreen: Boolean,
  retainFocus: {
    type: Boolean,
    default: !0
  },
  scrollable: Boolean,
  ...el({
    origin: "center center",
    scrollStrategy: "block",
    transition: {
      component: kb
    },
    zIndex: 2400
  })
}, "VDialog"), Hn = ve()({
  name: "VDialog",
  props: Zf(),
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
    } = Qa(), s = se();
    function a(d) {
      var g, h;
      const u = d.relatedTarget, m = d.target;
      if (u !== m && ((g = s.value) != null && g.contentEl) && // We're the topmost dialog
      ((h = s.value) != null && h.globalTop) && // It isn't the document or the dialog body
      ![document, s.value.contentEl].includes(m) && // It isn't inside the dialog body
      !s.value.contentEl.contains(m)) {
        const v = Xd(s.value.contentEl);
        if (!v.length) return;
        const _ = v[0], k = v[v.length - 1];
        u === _ ? k.focus() : _.focus();
      }
    }
    gt(() => {
      document.removeEventListener("focusin", a);
    }), ze && be(() => o.value && e.retainFocus, (d) => {
      d ? document.addEventListener("focusin", a) : document.removeEventListener("focusin", a);
    }, {
      immediate: !0
    });
    function l() {
      var d;
      n("afterEnter"), (d = s.value) != null && d.contentEl && !s.value.contentEl.contains(document.activeElement) && s.value.contentEl.focus({
        preventScroll: !0
      });
    }
    function c() {
      n("afterLeave");
    }
    return be(o, async (d) => {
      var u;
      d || (await ft(), (u = s.value.activatorEl) == null || u.focus({
        preventScroll: !0
      }));
    }), Ee(() => {
      const d = bo.filterProps(e), u = Oe({
        "aria-haspopup": "dialog"
      }, e.activatorProps), m = Oe({
        tabindex: -1
      }, e.contentProps);
      return f(bo, Oe({
        ref: s,
        class: ["v-dialog", {
          "v-dialog--fullscreen": e.fullscreen,
          "v-dialog--scrollable": e.scrollable
        }, e.class],
        style: e.style
      }, d, {
        modelValue: o.value,
        "onUpdate:modelValue": (g) => o.value = g,
        "aria-modal": "true",
        activatorProps: u,
        contentProps: m,
        height: e.fullscreen ? void 0 : e.height,
        width: e.fullscreen ? void 0 : e.width,
        maxHeight: e.fullscreen ? void 0 : e.maxHeight,
        maxWidth: e.fullscreen ? void 0 : e.maxWidth,
        role: "dialog",
        onAfterEnter: l,
        onAfterLeave: c
      }, r), {
        activator: i.activator,
        default: function() {
          for (var g = arguments.length, h = new Array(g), v = 0; v < g; v++)
            h[v] = arguments[v];
          return f(mt, {
            root: "VDialog"
          }, {
            default: () => {
              var _;
              return [(_ = i.default) == null ? void 0 : _.call(i, ...h)];
            }
          });
        }
      });
    }), tl({}, s);
  }
}), Qf = qr.reduce((e, t) => (e[t] = {
  type: [Boolean, String, Number],
  default: !1
}, e), {}), em = qr.reduce((e, t) => {
  const n = "offset" + zt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), tm = qr.reduce((e, t) => {
  const n = "order" + zt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), nc = {
  col: Object.keys(Qf),
  offset: Object.keys(em),
  order: Object.keys(tm)
};
function Zb(e, t, n) {
  let i = e;
  if (!(n == null || n === !1)) {
    if (t) {
      const o = t.replace(e, "");
      i += `-${o}`;
    }
    return e === "col" && (i = "v-" + i), e === "col" && (n === "" || n === !0) || (i += `-${n}`), i.toLowerCase();
  }
}
const Qb = ["auto", "start", "end", "center", "baseline", "stretch"], ew = J({
  cols: {
    type: [Boolean, String, Number],
    default: !1
  },
  ...Qf,
  offset: {
    type: [String, Number],
    default: null
  },
  ...em,
  order: {
    type: [String, Number],
    default: null
  },
  ...tm,
  alignSelf: {
    type: String,
    default: null,
    validator: (e) => Qb.includes(e)
  },
  ...Ne(),
  ...it()
}, "VCol"), qe = ve()({
  name: "VCol",
  props: ew(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => {
      const o = [];
      let r;
      for (r in nc)
        nc[r].forEach((a) => {
          const l = e[a], c = Zb(r, a, l);
          c && o.push(c);
        });
      const s = o.some((a) => a.startsWith("v-col-"));
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
      return Un(e.tag, {
        class: [i.value, e.class],
        style: e.style
      }, (o = n.default) == null ? void 0 : o.call(n));
    };
  }
}), nl = ["start", "end", "center"], nm = ["space-between", "space-around", "space-evenly"];
function il(e, t) {
  return qr.reduce((n, i) => {
    const o = e + zt(i);
    return n[o] = t(), n;
  }, {});
}
const tw = [...nl, "baseline", "stretch"], im = (e) => tw.includes(e), om = il("align", () => ({
  type: String,
  default: null,
  validator: im
})), nw = [...nl, ...nm], rm = (e) => nw.includes(e), sm = il("justify", () => ({
  type: String,
  default: null,
  validator: rm
})), iw = [...nl, ...nm, "stretch"], am = (e) => iw.includes(e), lm = il("alignContent", () => ({
  type: String,
  default: null,
  validator: am
})), ic = {
  align: Object.keys(om),
  justify: Object.keys(sm),
  alignContent: Object.keys(lm)
}, ow = {
  align: "align",
  justify: "justify",
  alignContent: "align-content"
};
function rw(e, t, n) {
  let i = ow[e];
  if (n != null) {
    if (t) {
      const o = t.replace(e, "");
      i += `-${o}`;
    }
    return i += `-${n}`, i.toLowerCase();
  }
}
const sw = J({
  dense: Boolean,
  noGutters: Boolean,
  align: {
    type: String,
    default: null,
    validator: im
  },
  ...om,
  justify: {
    type: String,
    default: null,
    validator: rm
  },
  ...sm,
  alignContent: {
    type: String,
    default: null,
    validator: am
  },
  ...lm,
  ...Ne(),
  ...it()
}, "VRow"), oi = ve()({
  name: "VRow",
  props: sw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => {
      const o = [];
      let r;
      for (r in ic)
        ic[r].forEach((s) => {
          const a = e[s], l = rw(r, s, a);
          l && o.push(l);
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
      return Un(e.tag, {
        class: ["v-row", i.value, e.class],
        style: e.style
      }, (o = n.default) == null ? void 0 : o.call(n));
    };
  }
}), nr = Ha("v-spacer", "div", "VSpacer"), aw = J({
  active: Boolean,
  disabled: Boolean,
  max: [Number, String],
  value: {
    type: [Number, String],
    default: 0
  },
  ...Ne(),
  ...es({
    transition: {
      component: Wf
    }
  })
}, "VCounter"), lw = ve()({
  name: "VCounter",
  functional: !0,
  props: aw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => e.max ? `${e.value} / ${e.max}` : String(e.value));
    return Ee(() => f(Ln, {
      transition: e.transition
    }, {
      default: () => [vt(f("div", {
        class: ["v-counter", {
          "text-error": e.max && !e.disabled && parseFloat(e.value) > parseFloat(e.max)
        }, e.class],
        style: e.style
      }, [n.default ? n.default({
        counter: i.value,
        max: e.max,
        value: e.value
      }) : i.value]), [[Wn, e.active]])]
    })), {};
  }
}), uw = J({
  text: String,
  onClick: Ht(),
  ...Ne(),
  ...at()
}, "VLabel"), ol = ve()({
  name: "VLabel",
  props: uw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => {
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
}), cw = J({
  floating: Boolean,
  ...Ne()
}, "VFieldLabel"), zo = ve()({
  name: "VFieldLabel",
  props: cw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => f(ol, {
      class: ["v-field-label", {
        "v-field-label--floating": e.floating
      }, e.class],
      style: e.style,
      "aria-hidden": e.floating || void 0
    }, n)), {};
  }
});
function um(e) {
  const {
    t
  } = Gp();
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
    }[o], s = e[`onClick:${o}`], a = s && r ? t(`$vuetify.input.${r}`, e.label ?? "") : void 0;
    return f(Ve, {
      icon: e[`${o}Icon`],
      "aria-label": a,
      onClick: s
    }, null);
  }
  return {
    InputIcon: n
  };
}
const rl = J({
  focused: Boolean,
  "onUpdate:focused": Ht()
}, "focus");
function ts(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn();
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
const dw = ["underlined", "outlined", "filled", "solo", "solo-inverted", "solo-filled", "plain"], cm = J({
  appendInnerIcon: Xe,
  bgColor: String,
  clearable: Boolean,
  clearIcon: {
    type: Xe,
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
  prependInnerIcon: Xe,
  reverse: Boolean,
  singleLine: Boolean,
  variant: {
    type: String,
    default: "filled",
    validator: (e) => dw.includes(e)
  },
  "onClick:clear": Ht(),
  "onClick:appendInner": Ht(),
  "onClick:prependInner": Ht(),
  ...Ne(),
  ...qa(),
  ...Pt(),
  ...at()
}, "VField"), dm = ve()({
  name: "VField",
  inheritAttrs: !1,
  props: {
    id: String,
    ...rl(),
    ...cm()
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
    } = pt(e), {
      loaderClasses: s
    } = Qr(e), {
      focusClasses: a,
      isFocused: l,
      focus: c,
      blur: d
    } = ts(e), {
      InputIcon: u
    } = um(e), {
      roundedClasses: m
    } = $t(e), {
      rtlClasses: g
    } = fn(), h = y(() => e.dirty || e.active), v = y(() => !e.singleLine && !!(e.label || o.label)), _ = Zt(), k = y(() => e.id || `input-${_}`), O = y(() => `${k.value}-messages`), P = se(), B = se(), C = se(), V = y(() => ["plain", "underlined"].includes(e.variant)), {
      backgroundColorClasses: F,
      backgroundColorStyles: x
    } = jt(le(e, "bgColor")), {
      textColorClasses: N,
      textColorStyles: $
    } = un(y(() => e.error || e.disabled ? void 0 : h.value && l.value ? e.color : e.baseColor));
    be(h, (M) => {
      if (v.value) {
        const ee = P.value.$el, oe = B.value.$el;
        requestAnimationFrame(() => {
          const ne = Fa(ee), G = oe.getBoundingClientRect(), Se = G.x - ne.x, xe = G.y - ne.y - (ne.height / 2 - G.height / 2), we = G.width / 0.75, de = Math.abs(we - ne.width) > 1 ? {
            maxWidth: he(we)
          } : void 0, Te = getComputedStyle(ee), Je = getComputedStyle(oe), Ge = parseFloat(Te.transitionDuration) * 1e3 || 150, Z = parseFloat(Je.getPropertyValue("--v-field-label-scale")), ye = Je.getPropertyValue("color");
          ee.style.visibility = "visible", oe.style.visibility = "hidden", Di(ee, {
            transform: `translate(${Se}px, ${xe}px) scale(${Z})`,
            color: ye,
            ...de
          }, {
            duration: Ge,
            easing: Sr,
            direction: M ? "normal" : "reverse"
          }).finished.then(() => {
            ee.style.removeProperty("visibility"), oe.style.removeProperty("visibility");
          });
        });
      }
    }, {
      flush: "post"
    });
    const E = y(() => ({
      isActive: h,
      isFocused: l,
      controlRef: C,
      blur: d,
      focus: c
    }));
    function w(M) {
      M.target !== document.activeElement && M.preventDefault();
    }
    function A(M) {
      var ee;
      M.key !== "Enter" && M.key !== " " || (M.preventDefault(), M.stopPropagation(), (ee = e["onClick:clear"]) == null || ee.call(e, new MouseEvent("click")));
    }
    return Ee(() => {
      var Se, xe, we;
      const M = e.variant === "outlined", ee = !!(o["prepend-inner"] || e.prependInnerIcon), oe = !!(e.clearable || o.clear), ne = !!(o["append-inner"] || e.appendInnerIcon || oe), G = () => o.label ? o.label({
        ...E.value,
        label: e.label,
        props: {
          for: k.value
        }
      }) : e.label;
      return f("div", Oe({
        class: ["v-field", {
          "v-field--active": h.value,
          "v-field--appended": ne,
          "v-field--center-affix": e.centerAffix ?? !V.value,
          "v-field--disabled": e.disabled,
          "v-field--dirty": e.dirty,
          "v-field--error": e.error,
          "v-field--flat": e.flat,
          "v-field--has-background": !!e.bgColor,
          "v-field--persistent-clear": e.persistentClear,
          "v-field--prepended": ee,
          "v-field--reverse": e.reverse,
          "v-field--single-line": e.singleLine,
          "v-field--no-label": !G(),
          [`v-field--variant-${e.variant}`]: !0
        }, r.value, F.value, a.value, s.value, m.value, g.value, e.class],
        style: [x.value, e.style],
        onClick: w
      }, n), [f("div", {
        class: "v-field__overlay"
      }, null), f(Ka, {
        name: "v-field",
        active: !!e.loading,
        color: e.error ? "error" : typeof e.loading == "string" ? e.loading : e.color
      }, {
        default: o.loader
      }), ee && f("div", {
        key: "prepend",
        class: "v-field__prepend-inner"
      }, [e.prependInnerIcon && f(u, {
        key: "prepend-icon",
        name: "prependInner"
      }, null), (Se = o["prepend-inner"]) == null ? void 0 : Se.call(o, E.value)]), f("div", {
        class: "v-field__field",
        "data-no-activator": ""
      }, [["filled", "solo", "solo-inverted", "solo-filled"].includes(e.variant) && v.value && f(zo, {
        key: "floating-label",
        ref: B,
        class: [N.value],
        floating: !0,
        for: k.value,
        style: $.value
      }, {
        default: () => [G()]
      }), f(zo, {
        ref: P,
        for: k.value
      }, {
        default: () => [G()]
      }), (xe = o.default) == null ? void 0 : xe.call(o, {
        ...E.value,
        props: {
          id: k.value,
          class: "v-field__input",
          "aria-describedby": O.value
        },
        focus: c,
        blur: d
      })]), oe && f(Cb, {
        key: "clear"
      }, {
        default: () => [vt(f("div", {
          class: "v-field__clearable",
          onMousedown: (de) => {
            de.preventDefault(), de.stopPropagation();
          }
        }, [f(mt, {
          defaults: {
            VIcon: {
              icon: e.clearIcon
            }
          }
        }, {
          default: () => [o.clear ? o.clear({
            ...E.value,
            props: {
              onKeydown: A,
              onFocus: c,
              onBlur: d,
              onClick: e["onClick:clear"]
            }
          }) : f(u, {
            name: "clear",
            onKeydown: A,
            onFocus: c,
            onBlur: d
          }, null)]
        })]), [[Wn, e.dirty]])]
      }), ne && f("div", {
        key: "append",
        class: "v-field__append-inner"
      }, [(we = o["append-inner"]) == null ? void 0 : we.call(o, E.value), e.appendInnerIcon && f(u, {
        key: "append-icon",
        name: "appendInner"
      }, null)]), f("div", {
        class: ["v-field__outline", N.value],
        style: $.value
      }, [M && f(fe, null, [f("div", {
        class: "v-field__outline__start"
      }, null), v.value && f("div", {
        class: "v-field__outline__notch"
      }, [f(zo, {
        ref: B,
        floating: !0,
        for: k.value
      }, {
        default: () => [G()]
      })]), f("div", {
        class: "v-field__outline__end"
      }, null)]), V.value && v.value && f(zo, {
        ref: B,
        floating: !0,
        for: k.value
      }, {
        default: () => [G()]
      })])]);
    }), {
      controlRef: C
    };
  }
});
function fw(e) {
  const t = Object.keys(dm.props).filter((n) => !$a(n) && n !== "class" && n !== "style");
  return qd(e, t);
}
const mw = J({
  active: Boolean,
  color: String,
  messages: {
    type: [Array, String],
    default: () => []
  },
  ...Ne(),
  ...es({
    transition: {
      component: Wf,
      leaveAbsolute: !0,
      group: !0
    }
  })
}, "VMessages"), hw = ve()({
  name: "VMessages",
  props: mw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => an(e.messages)), {
      textColorClasses: o,
      textColorStyles: r
    } = un(y(() => e.color));
    return Ee(() => f(Ln, {
      transition: e.transition,
      tag: "div",
      class: ["v-messages", o.value, e.class],
      style: [r.value, e.style],
      role: "alert",
      "aria-live": "polite"
    }, {
      default: () => [e.active && i.value.map((s, a) => f("div", {
        class: "v-messages__message",
        key: `${a}-${i.value}`
      }, [n.message ? n.message({
        message: s
      }) : s]))]
    })), {};
  }
}), vw = Symbol.for("vuetify:form");
function gw() {
  return He(vw, null);
}
const pw = J({
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
  ...rl()
}, "validation");
function yw(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : dn(), n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Zt();
  const i = nt(e, "modelValue"), o = y(() => e.validationValue === void 0 ? i.value : e.validationValue), r = gw(), s = se([]), a = ke(!0), l = y(() => !!(an(i.value === "" ? null : i.value).length || an(o.value === "" ? null : o.value).length)), c = y(() => !!(e.disabled ?? (r == null ? void 0 : r.isDisabled.value))), d = y(() => !!(e.readonly ?? (r == null ? void 0 : r.isReadonly.value))), u = y(() => {
    var C;
    return (C = e.errorMessages) != null && C.length ? an(e.errorMessages).concat(s.value).slice(0, Math.max(0, +e.maxErrors)) : s.value;
  }), m = y(() => {
    let C = (e.validateOn ?? (r == null ? void 0 : r.validateOn.value)) || "input";
    C === "lazy" && (C = "input lazy"), C === "eager" && (C = "input eager");
    const V = new Set((C == null ? void 0 : C.split(" ")) ?? []);
    return {
      input: V.has("input"),
      blur: V.has("blur") || V.has("input") || V.has("invalid-input"),
      invalidInput: V.has("invalid-input"),
      lazy: V.has("lazy"),
      eager: V.has("eager")
    };
  }), g = y(() => {
    var C;
    return e.error || (C = e.errorMessages) != null && C.length ? !1 : e.rules.length ? a.value ? s.value.length || m.value.lazy ? null : !0 : !s.value.length : !0;
  }), h = ke(!1), v = y(() => ({
    [`${t}--error`]: g.value === !1,
    [`${t}--dirty`]: l.value,
    [`${t}--disabled`]: c.value,
    [`${t}--readonly`]: d.value
  })), _ = Qe("validation"), k = y(() => e.name ?? rn(n));
  Sa(() => {
    r == null || r.register({
      id: k.value,
      vm: _,
      validate: B,
      reset: O,
      resetValidation: P
    });
  }), gt(() => {
    r == null || r.unregister(k.value);
  }), cn(async () => {
    m.value.lazy || await B(!m.value.eager), r == null || r.update(k.value, g.value, u.value);
  }), zn(() => m.value.input || m.value.invalidInput && g.value === !1, () => {
    be(o, () => {
      if (o.value != null)
        B();
      else if (e.focused) {
        const C = be(() => e.focused, (V) => {
          V || B(), C();
        });
      }
    });
  }), zn(() => m.value.blur, () => {
    be(() => e.focused, (C) => {
      C || B();
    });
  }), be([g, u], () => {
    r == null || r.update(k.value, g.value, u.value);
  });
  async function O() {
    i.value = null, await ft(), await P();
  }
  async function P() {
    a.value = !0, m.value.lazy ? s.value = [] : await B(!m.value.eager);
  }
  async function B() {
    let C = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !1;
    const V = [];
    h.value = !0;
    for (const F of e.rules) {
      if (V.length >= +(e.maxErrors ?? 1))
        break;
      const N = await (typeof F == "function" ? F : () => F)(o.value);
      if (N !== !0) {
        if (N !== !1 && typeof N != "string") {
          console.warn(`${N} is not a valid value. Rule functions must return boolean true or a string.`);
          continue;
        }
        V.push(N || "");
      }
    }
    return s.value = V, h.value = !1, a.value = C, s.value;
  }
  return {
    errorMessages: u,
    isDirty: l,
    isDisabled: c,
    isReadonly: d,
    isPristine: a,
    isValid: g,
    isValidating: h,
    reset: O,
    resetValidation: P,
    validate: B,
    validationClasses: v
  };
}
const ns = J({
  id: String,
  appendIcon: Xe,
  centerAffix: {
    type: Boolean,
    default: !0
  },
  prependIcon: Xe,
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
  "onClick:prepend": Ht(),
  "onClick:append": Ht(),
  ...Ne(),
  ...mn(),
  ...op(Xn(), ["maxWidth", "minWidth", "width"]),
  ...at(),
  ...pw()
}, "VInput"), Hi = ve()({
  name: "VInput",
  props: {
    ...ns()
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
    } = On(e), {
      dimensionStyles: s
    } = Jn(e), {
      themeClasses: a
    } = pt(e), {
      rtlClasses: l
    } = fn(), {
      InputIcon: c
    } = um(e), d = Zt(), u = y(() => e.id || `input-${d}`), m = y(() => `${u.value}-messages`), {
      errorMessages: g,
      isDirty: h,
      isDisabled: v,
      isReadonly: _,
      isPristine: k,
      isValid: O,
      isValidating: P,
      reset: B,
      resetValidation: C,
      validate: V,
      validationClasses: F
    } = yw(e, "v-input", u), x = y(() => ({
      id: u,
      messagesId: m,
      isDirty: h,
      isDisabled: v,
      isReadonly: _,
      isPristine: k,
      isValid: O,
      isValidating: P,
      reset: B,
      resetValidation: C,
      validate: V
    })), N = y(() => {
      var $;
      return ($ = e.errorMessages) != null && $.length || !k.value && g.value.length ? g.value : e.hint && (e.persistentHint || e.focused) ? e.hint : e.messages;
    });
    return Ee(() => {
      var M, ee, oe, ne;
      const $ = !!(i.prepend || e.prependIcon), E = !!(i.append || e.appendIcon), w = N.value.length > 0, A = !e.hideDetails || e.hideDetails === "auto" && (w || !!i.details);
      return f("div", {
        class: ["v-input", `v-input--${e.direction}`, {
          "v-input--center-affix": e.centerAffix,
          "v-input--hide-spin-buttons": e.hideSpinButtons
        }, r.value, a.value, l.value, F.value, e.class],
        style: [s.value, e.style]
      }, [$ && f("div", {
        key: "prepend",
        class: "v-input__prepend"
      }, [(M = i.prepend) == null ? void 0 : M.call(i, x.value), e.prependIcon && f(c, {
        key: "prepend-icon",
        name: "prepend"
      }, null)]), i.default && f("div", {
        class: "v-input__control"
      }, [(ee = i.default) == null ? void 0 : ee.call(i, x.value)]), E && f("div", {
        key: "append",
        class: "v-input__append"
      }, [e.appendIcon && f(c, {
        key: "append-icon",
        name: "append"
      }, null), (oe = i.append) == null ? void 0 : oe.call(i, x.value)]), A && f("div", {
        class: "v-input__details"
      }, [f(hw, {
        id: m.value,
        active: w,
        messages: N.value
      }, {
        message: i.message
      }), (ne = i.details) == null ? void 0 : ne.call(i, x.value)])]);
    }), {
      reset: B,
      resetValidation: C,
      validate: V,
      isValid: O,
      errorMessages: g
    };
  }
}), _w = J({
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
  ...ns(),
  ...cm()
}, "VTextarea"), fm = ve()({
  name: "VTextarea",
  directives: {
    Intersect: Hf
  },
  inheritAttrs: !1,
  props: _w(),
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
      focus: a,
      blur: l
    } = ts(e), c = y(() => typeof e.counterValue == "function" ? e.counterValue(r.value) : (r.value || "").toString().length), d = y(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    });
    function u(E, w) {
      var A, M;
      !e.autofocus || !E || (M = (A = w[0].target) == null ? void 0 : A.focus) == null || M.call(A);
    }
    const m = se(), g = se(), h = ke(""), v = se(), _ = y(() => e.persistentPlaceholder || s.value || e.active);
    function k() {
      var E;
      v.value !== document.activeElement && ((E = v.value) == null || E.focus()), s.value || a();
    }
    function O(E) {
      k(), i("click:control", E);
    }
    function P(E) {
      i("mousedown:control", E);
    }
    function B(E) {
      E.stopPropagation(), k(), ft(() => {
        r.value = "", ap(e["onClick:clear"], E);
      });
    }
    function C(E) {
      var A;
      const w = E.target;
      if (r.value = w.value, (A = e.modelModifiers) != null && A.trim) {
        const M = [w.selectionStart, w.selectionEnd];
        ft(() => {
          w.selectionStart = M[0], w.selectionEnd = M[1];
        });
      }
    }
    const V = se(), F = se(+e.rows), x = y(() => ["plain", "underlined"].includes(e.variant));
    Jt(() => {
      e.autoGrow || (F.value = +e.rows);
    });
    function N() {
      e.autoGrow && ft(() => {
        if (!V.value || !g.value) return;
        const E = getComputedStyle(V.value), w = getComputedStyle(g.value.$el), A = parseFloat(E.getPropertyValue("--v-field-padding-top")) + parseFloat(E.getPropertyValue("--v-input-padding-top")) + parseFloat(E.getPropertyValue("--v-field-padding-bottom")), M = V.value.scrollHeight, ee = parseFloat(E.lineHeight), oe = Math.max(parseFloat(e.rows) * ee + A, parseFloat(w.getPropertyValue("--v-input-control-height"))), ne = parseFloat(e.maxRows) * ee + A || 1 / 0, G = kn(M ?? 0, oe, ne);
        F.value = Math.floor((G - A) / ee), h.value = he(G);
      });
    }
    cn(N), be(r, N), be(() => e.rows, N), be(() => e.maxRows, N), be(() => e.density, N);
    let $;
    return be(V, (E) => {
      E ? ($ = new ResizeObserver(N), $.observe(V.value)) : $ == null || $.disconnect();
    }), gt(() => {
      $ == null || $.disconnect();
    }), Ee(() => {
      const E = !!(o.counter || e.counter || e.counterValue), w = !!(E || o.details), [A, M] = Ma(n), {
        modelValue: ee,
        ...oe
      } = Hi.filterProps(e), ne = fw(e);
      return f(Hi, Oe({
        ref: m,
        modelValue: r.value,
        "onUpdate:modelValue": (G) => r.value = G,
        class: ["v-textarea v-text-field", {
          "v-textarea--prefixed": e.prefix,
          "v-textarea--suffixed": e.suffix,
          "v-text-field--prefixed": e.prefix,
          "v-text-field--suffixed": e.suffix,
          "v-textarea--auto-grow": e.autoGrow,
          "v-textarea--no-resize": e.noResize || e.autoGrow,
          "v-input--plain-underlined": x.value
        }, e.class],
        style: e.style
      }, A, oe, {
        centerAffix: F.value === 1 && !x.value,
        focused: s.value
      }), {
        ...o,
        default: (G) => {
          let {
            id: Se,
            isDisabled: xe,
            isDirty: we,
            isReadonly: de,
            isValid: Te
          } = G;
          return f(dm, Oe({
            ref: g,
            style: {
              "--v-textarea-control-height": h.value
            },
            onClick: O,
            onMousedown: P,
            "onClick:clear": B,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"]
          }, ne, {
            id: Se.value,
            active: _.value || we.value,
            centerAffix: F.value === 1 && !x.value,
            dirty: we.value || e.dirty,
            disabled: xe.value,
            focused: s.value,
            error: Te.value === !1
          }), {
            ...o,
            default: (Je) => {
              let {
                props: {
                  class: Ge,
                  ...Z
                }
              } = Je;
              return f(fe, null, [e.prefix && f("span", {
                class: "v-text-field__prefix"
              }, [e.prefix]), vt(f("textarea", Oe({
                ref: v,
                class: Ge,
                value: r.value,
                onInput: C,
                autofocus: e.autofocus,
                readonly: de.value,
                disabled: xe.value,
                placeholder: e.placeholder,
                rows: e.rows,
                name: e.name,
                onFocus: k,
                onBlur: l
              }, Z, M), null), [[Si("intersect"), {
                handler: u
              }, null, {
                once: !0
              }]]), e.autoGrow && vt(f("textarea", {
                class: [Ge, "v-textarea__sizer"],
                id: `${Z.id}-sizer`,
                "onUpdate:modelValue": (ye) => r.value = ye,
                ref: V,
                readonly: !0,
                "aria-hidden": "true"
              }, null), [[jg, r.value]]), e.suffix && f("span", {
                class: "v-text-field__suffix"
              }, [e.suffix])]);
            }
          });
        },
        details: w ? (G) => {
          var Se;
          return f(fe, null, [(Se = o.details) == null ? void 0 : Se.call(o, G), E && f(fe, null, [f("span", null, null), f(lw, {
            active: e.persistentCounter || s.value,
            value: c.value,
            max: d.value,
            disabled: e.disabled
          }, o.counter)])]);
        } : void 0
      });
    }), tl({}, m, g, v);
  }
}), oc = 20, Ns = (e) => ({ scope: e, paragraph_cfi: "", paragraph_chapter: "", items: [], cursor: null, has_more: !1, loading: !1, error: "", need_login: !1, request: 0 }), bw = {
  name: "ReaderComments",
  components: { CommentItem: Xr, CommentList: Ff },
  emits: ["write", "edit", "login", "changed", "feedback", "close"],
  props: {
    repository: { type: Object, default: null },
    user: { type: Object, default: null },
    chapter: { type: String, default: "" },
    // 抽屉是否展开；收起时不为章节切换发请求。
    active: { type: Boolean, default: !1 }
  },
  data: () => ({
    drawer: Ns("chapter"),
    page: Ns("chapter"),
    replies: Ns("replies"),
    detail: { root: null, to: null, edit: null, draft: "", sending: !1 },
    // 已进入的独立页面栈（'page' / 'detail'），与浏览器历史一一对应。
    nav: [],
    removing: { open: !1, busy: !1, record: null },
    voting: /* @__PURE__ */ new Set(),
    drag: null,
    tabs: [
      { scope: "chapter", label: "本章评论" },
      { scope: "book", label: "全书评论" },
      { scope: "mine", label: "我的" }
    ]
  }),
  computed: {
    page_open: function() {
      return this.nav.includes("page");
    },
    detail_open: function() {
      return this.nav.includes("detail") && !!this.detail.root;
    },
    root_private: function() {
      var e;
      return ((e = this.detail.root) == null ? void 0 : e.is_private) !== !1;
    },
    reply_placeholder: function() {
      var e;
      return this.detail.edit ? "修改回复" : `回复 ${((e = this.detail.to || this.detail.root) == null ? void 0 : e.author_name) || "书友"}`;
    },
    threads: function() {
      const e = this.replies.items;
      return e.filter((n) => !n.thread_id || !e.some((i) => i.id === n.thread_id)).map((n) => ({ first: n, children: e.filter((i) => i.thread_id === n.id) }));
    },
    remove_message: function() {
      const e = this.removing.record;
      if (!e) return "";
      const t = e.root_id ? this.replies.items.filter((i) => i.thread_id === e.id).length : e.reply_count || 0, n = e.root_id ? "回复" : "评论";
      return t ? `这条${n}下的 ${t} 条回复也会一并删除。确定删除吗？` : `确定删除这条${n}吗？`;
    }
  },
  watch: {
    chapter: function() {
      this.active && this.drawer.scope === "chapter" && this.load(this.drawer, !0);
    },
    user: function() {
      this.drawer.need_login && this.load(this.drawer, !0), this.page_open && (this.page.scope === "mine" || this.page.need_login) && this.load(this.page, !0);
    }
  },
  mounted: function() {
    window.addEventListener("popstate", this.on_popstate);
  },
  beforeUnmount: function() {
    window.removeEventListener("popstate", this.on_popstate);
  },
  methods: {
    // ---- 列表 ----
    show: function(e, t = "", n = "") {
      var i;
      return this.drawer.scope = e, this.drawer.paragraph_cfi = t, this.drawer.paragraph_chapter = n, (i = this.$refs.drawerList) == null || i.scroll_to_top(), this.load(this.drawer, !0);
    },
    reload: function() {
      this.load(this.drawer, !0), this.page_open && this.load(this.page, !0);
    },
    retry: function(e) {
      return this.load(e, !e.items.length);
    },
    load: async function(e, t = !1) {
      if (!this.repository) return;
      if (t)
        e.request++, Object.assign(e, { items: [], cursor: null, has_more: !1, error: "", need_login: !1 });
      else if (e.loading || !e.has_more && !e.error) return;
      const n = e.request;
      e.loading = !0, e.error = "";
      try {
        const i = e === this.replies ? { root_id: this.detail.root.id, cursor: e.cursor, limit: oc } : { scope: e.scope, chapter: e.scope === "paragraph" && e.paragraph_chapter || this.chapter, paragraph_cfi: e.paragraph_cfi, cursor: e.cursor, limit: oc }, o = await (e === this.replies ? this.repository.replies(i) : this.repository.list(i));
        if (n !== e.request) return;
        const r = new Set(e.items.map((s) => s.id));
        e.items.push(...o.items.filter((s) => !r.has(s.id))), e.cursor = o.next_cursor, e.has_more = o.has_more;
      } catch (i) {
        if (n !== e.request) return;
        e.need_login = (i == null ? void 0 : i.code) === "need_login", e.error = i.message || "请稍后重试";
      } finally {
        n === e.request && (e.loading = !1);
      }
    },
    set_page_scope: function(e) {
      var t;
      this.page.scope !== e && (this.page.scope = e, (t = this.$refs.pageList) == null || t.scroll_to_top(), (e !== "mine" || this.user) && this.load(this.page, !0));
    },
    write: function(e) {
      if (!this.user) return this.$emit("login");
      this.$emit("write", { scope: e.scope, paragraph_cfi: e.paragraph_cfi });
    },
    copies: function(e) {
      const t = [...this.drawer.items, ...this.page.items, ...this.replies.items];
      return this.detail.root && t.push(this.detail.root), t.filter((n) => n.id === e);
    },
    patch: function(e, t) {
      this.copies(e).forEach((n) => Object.assign(n, t));
    },
    // 编辑框保存成功后由阅读器调用：就地更新已有记录，新记录则刷新列表。
    apply_saved: function(e) {
      this.copies(e.id).length && this.patch(e.id, e), this.reload();
    },
    // ---- 独立页面与浏览器返回 ----
    push: function(e) {
      this.nav.push(e), history.pushState({ ...history.state, candle_comments: this.nav.length }, "");
    },
    back: function() {
      this.nav.length && history.back();
    },
    on_popstate: function(e) {
      var n;
      const t = ((n = e.state) == null ? void 0 : n.candle_comments) || 0;
      for (; this.nav.length > t; ) this.leave(this.nav.pop());
    },
    leave: function(e) {
      var t;
      if (e === "detail") {
        this.replies.request++, this.reset_composer();
        const n = (t = this.detail.root) == null ? void 0 : t.id;
        this.detail.root = null, this.$nextTick(() => {
          var i;
          return (i = Array.from(document.querySelectorAll(`.v-overlay--active [data-comment="${CSS.escape(String(n))}"] .comment-reply`)).pop()) == null ? void 0 : i.focus();
        });
      } else
        this.$nextTick(() => {
          var n;
          return (n = this.$refs.moreEntry) == null ? void 0 : n.focus();
        });
    },
    // 抽屉被收起时一并退出独立页面，历史记录同步回退。
    close_pages: function() {
      this.nav.length && history.go(-this.nav.length);
    },
    open_page: function() {
      this.page.scope = "chapter", this.push("page"), this.load(this.page, !0);
    },
    open_detail: function(e) {
      this.detail.root = e, this.reset_composer(), this.push("detail"), this.load_replies(!0);
    },
    load_replies: function(e = !1) {
      return this.load(this.replies, e);
    },
    maybe_load_replies: function() {
      const e = this.$refs.detailBody;
      e && e.scrollHeight - e.scrollTop - e.clientHeight <= 48 && this.load_replies();
    },
    // ---- 回复 ----
    reset_composer: function() {
      Object.assign(this.detail, { to: null, edit: null, draft: "" });
    },
    focus_composer: function() {
      this.$nextTick(() => {
        var e;
        return (e = this.$refs.replyInput) == null ? void 0 : e.focus();
      });
    },
    reply_to: function(e) {
      if (!this.user) return this.$emit("login");
      Object.assign(this.detail, { to: e, edit: null, draft: this.detail.edit ? "" : this.detail.draft }), this.focus_composer();
    },
    edit_reply: function(e) {
      Object.assign(this.detail, { to: null, edit: e, draft: e.content }), this.focus_composer();
    },
    send_reply: async function() {
      var i;
      if (!this.user) return this.$emit("login");
      const e = this.detail.draft.trim(), t = this.detail.root;
      if (!e || this.detail.sending) return this.focus_composer();
      const n = this.detail.edit;
      this.detail.sending = !0;
      try {
        const o = await this.repository.save(n ? { id: n.id, client_id: n.client_id, root_id: t.id, content: e } : { client_id: Ii(), root_id: t.id, reply_to_id: ((i = this.detail.to) == null ? void 0 : i.id) || null, content: e });
        if (this.detail.root !== t) return;
        n ? Object.assign(n, o) : (this.replies.items.push(o), this.patch(t.id, { reply_count: (t.reply_count || 0) + 1 })), this.reset_composer();
      } catch (o) {
        this.$emit("feedback", `回复失败：${o.message || "请稍后重试"}`, !0);
      } finally {
        this.detail.sending = !1;
      }
    },
    // ---- 赞踩：互斥，再点一次取消；失败恢复到操作前 ----
    vote: async function(e, t) {
      if (!this.user) return this.$emit("login");
      if (this.voting.has(e.id)) return;
      const n = { like_count: e.like_count || 0, dislike_count: e.dislike_count || 0, user_vote: e.user_vote || 0 }, i = n.user_vote === t ? 0 : t;
      this.voting.add(e.id), this.patch(e.id, {
        user_vote: i,
        like_count: n.like_count - (n.user_vote === 1) + (i === 1),
        dislike_count: n.dislike_count - (n.user_vote === -1) + (i === -1)
      });
      try {
        const o = await this.repository.vote({ id: e.id, value: i });
        this.patch(e.id, { like_count: o.like_count, dislike_count: o.dislike_count, user_vote: o.user_vote });
      } catch (o) {
        this.patch(e.id, n), this.$emit("feedback", `操作失败：${o.message || "请稍后重试"}`, !0);
      } finally {
        this.voting.delete(e.id);
      }
    },
    // ---- 删除：真删除，主评论连同全部回复，第一层回复连同其下回复 ----
    ask_remove: function(e) {
      Object.assign(this.removing, { open: !0, busy: !1, record: e });
    },
    confirm_remove: async function() {
      var t, n, i;
      const e = this.removing.record;
      this.removing.busy = !0;
      try {
        if (await this.repository.remove({ id: e.id }), e.root_id) {
          const o = this.replies.items.length;
          this.replies.items = this.replies.items.filter((s) => s.id !== e.id && s.thread_id !== e.id);
          const r = this.detail.root;
          r && this.patch(r.id, { reply_count: Math.max(0, (r.reply_count || 0) - (o - this.replies.items.length)) }), (((t = this.detail.to) == null ? void 0 : t.id) === e.id || ((n = this.detail.edit) == null ? void 0 : n.id) === e.id) && this.reset_composer();
        } else {
          for (const o of [this.drawer, this.page]) o.items = o.items.filter((r) => r.id !== e.id);
          ((i = this.detail.root) == null ? void 0 : i.id) === e.id && this.back(), this.$emit("changed", e);
        }
        this.removing.open = !1, this.$emit("feedback", "已删除");
      } catch (o) {
        this.$emit("feedback", `删除失败：${o.message || "请稍后重试"}`, !0);
      } finally {
        this.removing.busy = !1;
      }
    },
    // ---- 移动端向下拖拽收起抽屉 ----
    sheet: function() {
      var e;
      return (e = this.$refs.drawer) == null ? void 0 : e.closest(".v-overlay__content");
    },
    on_drag_start: function(e) {
      e.button !== 0 || e.target.closest("button") || window.innerWidth >= 850 || (this.drag = { y: e.clientY, id: e.pointerId }, e.currentTarget.setPointerCapture(e.pointerId), this.sheet().style.transition = "none");
    },
    on_drag_move: function(e) {
      !this.drag || e.pointerId !== this.drag.id || (this.sheet().style.transform = `translateY(${Math.max(0, e.clientY - this.drag.y)}px)`);
    },
    on_drag_end: function(e) {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const t = e.clientY - this.drag.y;
      this.on_drag_cancel(), t >= 72 && this.$emit("close");
    },
    on_drag_cancel: function() {
      this.drag = null;
      const e = this.sheet();
      e && (e.style.transition = "", e.style.transform = "");
    }
  }
}, ww = {
  ref: "drawer",
  class: "reader-comments-drawer",
  "aria-label": "评论"
}, Sw = { class: "rc-head" }, kw = { class: "rc-footer" }, Cw = { class: "rc-page" }, Ew = {
  class: "rc-tabs",
  "aria-label": "查看范围"
}, xw = ["aria-pressed", "onClick"], Nw = { class: "rc-page-body" }, Vw = {
  key: 0,
  class: "rc-login"
}, Ow = { class: "rc-footer" }, Tw = {
  key: 0,
  class: "rc-page"
}, Aw = { class: "rc-detail-nav" }, Dw = { class: "rc-replies-title" }, Iw = {
  key: 0,
  class: "rc-replies-state",
  role: "alert"
}, Pw = {
  key: 1,
  class: "rc-replies-state"
}, $w = {
  key: 0,
  class: "rc-thread-children"
}, Mw = {
  key: 2,
  class: "rc-replies-state",
  role: "status"
}, Lw = {
  key: 0,
  class: "rc-footer"
};
function Fw(e, t, n, i, o, r) {
  const s = Ff, a = Xr;
  return X(), ce(fe, null, [
    R("section", ww, [
      R("div", {
        class: "rc-grip",
        onPointerdown: t[1] || (t[1] = (...l) => r.on_drag_start && r.on_drag_start(...l)),
        onPointermove: t[2] || (t[2] = (...l) => r.on_drag_move && r.on_drag_move(...l)),
        onPointerup: t[3] || (t[3] = (...l) => r.on_drag_end && r.on_drag_end(...l)),
        onPointercancel: t[4] || (t[4] = (...l) => r.on_drag_cancel && r.on_drag_cancel(...l))
      }, [
        t[31] || (t[31] = R("div", {
          class: "rc-handle",
          "aria-hidden": "true"
        }, null, -1)),
        R("header", Sw, [
          R("strong", null, _e(e.drawer.scope === "paragraph" ? "本段评论" : "本章评论"), 1),
          R("button", {
            ref: "moreEntry",
            type: "button",
            class: "rc-more",
            onClick: t[0] || (t[0] = (...l) => r.open_page && r.open_page(...l))
          }, [
            t[30] || (t[30] = te("查看更多评论 ")),
            f(Ve, {
              size: "20",
              "aria-hidden": "true"
            }, {
              default: T(() => t[29] || (t[29] = [
                te("mdi-chevron-right")
              ])),
              _: 1
            })
          ], 512)
        ])
      ], 32),
      f(s, {
        ref: "drawerList",
        state: e.drawer,
        onMore: t[5] || (t[5] = (l) => r.load(e.drawer)),
        onRetry: t[6] || (t[6] = (l) => r.retry(e.drawer)),
        onLogin: t[7] || (t[7] = (l) => e.$emit("login")),
        onOpen: r.open_detail,
        onEdit: t[8] || (t[8] = (l) => e.$emit("edit", l)),
        onRemove: r.ask_remove,
        onVote: r.vote
      }, null, 8, ["state", "onOpen", "onRemove", "onVote"]),
      R("footer", kw, [
        f(Ce, {
          block: "",
          color: "primary",
          variant: "flat",
          "prepend-icon": "mdi-plus",
          onClick: t[9] || (t[9] = (l) => r.write(e.drawer))
        }, {
          default: T(() => t[32] || (t[32] = [
            te("写评论")
          ])),
          _: 1
        })
      ])
    ], 512),
    f(Hn, {
      "model-value": r.page_open,
      class: "rc-standalone",
      fullscreen: "",
      scrim: !1,
      transition: "slide-x-reverse-transition",
      "aria-label": "完整评论页",
      "onUpdate:modelValue": t[17] || (t[17] = (l) => l || r.back())
    }, {
      default: T(() => [
        R("section", Cw, [
          R("nav", Ew, [
            R("button", {
              type: "button",
              class: "rc-back",
              "aria-label": "返回评论弹窗",
              onClick: t[10] || (t[10] = (...l) => r.back && r.back(...l))
            }, [
              f(Ve, { "aria-hidden": "true" }, {
                default: T(() => t[33] || (t[33] = [
                  te("mdi-chevron-left")
                ])),
                _: 1
              })
            ]),
            (X(!0), ce(fe, null, At(e.tabs, (l) => (X(), ce("button", {
              key: l.scope,
              type: "button",
              class: Vt(["rc-tab", { "rc-tab--active": e.page.scope === l.scope }]),
              "aria-pressed": String(e.page.scope === l.scope),
              onClick: (c) => r.set_page_scope(l.scope)
            }, _e(l.label), 11, xw))), 128))
          ]),
          R("div", Nw, [
            e.page.scope === "mine" && !n.user ? (X(), ce("div", Vw, [
              t[35] || (t[35] = R("p", null, "登录后查看你的划线和评论", -1)),
              f(Ce, {
                variant: "tonal",
                onClick: t[11] || (t[11] = (l) => e.$emit("login"))
              }, {
                default: T(() => t[34] || (t[34] = [
                  te("去登录")
                ])),
                _: 1
              })
            ])) : (X(), Ke(s, {
              key: 1,
              ref: "pageList",
              state: e.page,
              tags: e.page.scope === "mine",
              empty: e.page.scope === "mine" ? "这里还没有你的记录" : "这里还没有公开评论",
              onMore: t[12] || (t[12] = (l) => r.load(e.page)),
              onRetry: t[13] || (t[13] = (l) => r.retry(e.page)),
              onLogin: t[14] || (t[14] = (l) => e.$emit("login")),
              onOpen: r.open_detail,
              onEdit: t[15] || (t[15] = (l) => e.$emit("edit", l)),
              onRemove: r.ask_remove,
              onVote: r.vote
            }, null, 8, ["state", "tags", "empty", "onOpen", "onRemove", "onVote"]))
          ]),
          R("footer", Ow, [
            f(Ce, {
              block: "",
              color: "primary",
              variant: "flat",
              "prepend-icon": "mdi-plus",
              onClick: t[16] || (t[16] = (l) => r.write(e.page))
            }, {
              default: T(() => t[36] || (t[36] = [
                te("写评论")
              ])),
              _: 1
            })
          ])
        ])
      ]),
      _: 1
    }, 8, ["model-value"]),
    f(Hn, {
      "model-value": r.detail_open,
      class: "rc-standalone",
      fullscreen: "",
      scrim: !1,
      transition: "slide-x-reverse-transition",
      "aria-label": "评论详情",
      "onUpdate:modelValue": t[26] || (t[26] = (l) => l || r.back())
    }, {
      default: T(() => [
        e.detail.root ? (X(), ce("section", Tw, [
          R("nav", Aw, [
            R("button", {
              type: "button",
              class: "rc-back",
              "aria-label": "返回评论列表",
              onClick: t[18] || (t[18] = (...l) => r.back && r.back(...l))
            }, [
              f(Ve, { "aria-hidden": "true" }, {
                default: T(() => t[37] || (t[37] = [
                  te("mdi-chevron-left")
                ])),
                _: 1
              })
            ]),
            t[38] || (t[38] = R("strong", null, "评论详情", -1))
          ]),
          R("div", {
            ref: "detailBody",
            class: "rc-page-body rc-detail-body",
            onScrollPassive: t[23] || (t[23] = (...l) => r.maybe_load_replies && r.maybe_load_replies(...l))
          }, [
            f(a, {
              record: e.detail.root,
              tags: r.root_private,
              onEdit: t[19] || (t[19] = (l) => e.$emit("edit", l)),
              onRemove: r.ask_remove,
              onVote: r.vote,
              onReply: t[20] || (t[20] = (l) => r.reply_to(null))
            }, null, 8, ["record", "tags", "onRemove", "onVote"]),
            R("div", Dw, _e(e.detail.root.reply_count || 0) + " 条回复" + _e(r.root_private ? " · 仅你可见" : ""), 1),
            e.replies.error && !e.replies.items.length ? (X(), ce("div", Iw, [
              t[39] || (t[39] = te(" 回复暂时没能加载 ")),
              R("button", {
                type: "button",
                class: "rc-text-button",
                onClick: t[21] || (t[21] = (l) => r.load_replies(!0))
              }, "重试")
            ])) : !e.replies.items.length && !e.replies.loading ? (X(), ce("div", Pw, "还没有回复，来说点什么吧")) : Re("", !0),
            (X(!0), ce(fe, null, At(r.threads, (l) => (X(), ce("div", {
              key: l.first.id,
              class: "rc-thread"
            }, [
              f(a, {
                record: l.first,
                readonly: r.root_private,
                onEdit: r.edit_reply,
                onRemove: r.ask_remove,
                onVote: r.vote,
                onReply: r.reply_to
              }, null, 8, ["record", "readonly", "onEdit", "onRemove", "onVote", "onReply"]),
              l.children.length ? (X(), ce("div", $w, [
                (X(!0), ce(fe, null, At(l.children, (c) => (X(), Ke(a, {
                  key: c.id,
                  record: c,
                  readonly: r.root_private,
                  onEdit: r.edit_reply,
                  onRemove: r.ask_remove,
                  onVote: r.vote,
                  onReply: r.reply_to
                }, null, 8, ["record", "readonly", "onEdit", "onRemove", "onVote", "onReply"]))), 128))
              ])) : Re("", !0)
            ]))), 128)),
            e.replies.items.length ? (X(), ce("div", Mw, [
              e.replies.error ? (X(), ce(fe, { key: 0 }, [
                t[40] || (t[40] = te("加载失败 ")),
                R("button", {
                  type: "button",
                  class: "rc-text-button",
                  onClick: t[22] || (t[22] = (l) => r.load_replies())
                }, "重试")
              ], 64)) : e.replies.loading ? (X(), ce(fe, { key: 1 }, [
                te("正在加载回复…")
              ], 64)) : e.replies.has_more ? Re("", !0) : (X(), ce(fe, { key: 2 }, [
                te("已显示全部回复")
              ], 64))
            ])) : Re("", !0)
          ], 544),
          r.root_private ? Re("", !0) : (X(), ce("footer", Lw, [
            R("form", {
              class: "rc-reply-box",
              onSubmit: t[25] || (t[25] = ai((...l) => r.send_reply && r.send_reply(...l), ["prevent"]))
            }, [
              f(fm, {
                ref: "replyInput",
                modelValue: e.detail.draft,
                "onUpdate:modelValue": t[24] || (t[24] = (l) => e.detail.draft = l),
                class: "rc-reply-input",
                "aria-label": "回复内容",
                placeholder: r.reply_placeholder,
                variant: "outlined",
                density: "compact",
                rows: "1",
                "max-rows": "4",
                "auto-grow": "",
                "hide-details": "",
                readonly: e.detail.sending
              }, null, 8, ["modelValue", "placeholder", "readonly"]),
              e.detail.to || e.detail.edit ? (X(), Ke(Ce, {
                key: 0,
                variant: "text",
                disabled: e.detail.sending,
                onClick: r.reset_composer
              }, {
                default: T(() => t[41] || (t[41] = [
                  te("取消")
                ])),
                _: 1
              }, 8, ["disabled", "onClick"])) : Re("", !0),
              f(Ce, {
                type: "submit",
                color: "primary",
                variant: "flat",
                loading: e.detail.sending
              }, {
                default: T(() => [
                  te(_e(e.detail.edit ? "保存" : "发送"), 1)
                ]),
                _: 1
              }, 8, ["loading"])
            ], 32)
          ]))
        ])) : Re("", !0)
      ]),
      _: 1
    }, 8, ["model-value"]),
    f(Hn, {
      modelValue: e.removing.open,
      "onUpdate:modelValue": t[28] || (t[28] = (l) => e.removing.open = l),
      class: "rc-above-standalone",
      "max-width": "360",
      persistent: e.removing.busy,
      "aria-labelledby": "rc-remove-title"
    }, {
      default: T(() => [
        f(eo, null, {
          default: T(() => [
            f(Or, {
              id: "rc-remove-title",
              class: "text-subtitle-1"
            }, {
              default: T(() => t[42] || (t[42] = [
                te("删除后无法恢复")
              ])),
              _: 1
            }),
            f(so, null, {
              default: T(() => [
                te(_e(r.remove_message), 1)
              ]),
              _: 1
            }),
            f(Vr, null, {
              default: T(() => [
                f(nr),
                f(Ce, {
                  variant: "text",
                  disabled: e.removing.busy,
                  onClick: t[27] || (t[27] = (l) => e.removing.open = !1)
                }, {
                  default: T(() => t[43] || (t[43] = [
                    te("取消")
                  ])),
                  _: 1
                }, 8, ["disabled"]),
                f(Ce, {
                  color: "error",
                  variant: "flat",
                  loading: e.removing.busy,
                  onClick: r.confirm_remove
                }, {
                  default: T(() => t[44] || (t[44] = [
                    te("删除")
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
    }, 8, ["modelValue", "persistent"])
  ], 64);
}
const mm = /* @__PURE__ */ Vn(bw, [["render", Fw], ["__scopeId", "data-v-7000429e"]]), Bw = J({
  color: String,
  inset: Boolean,
  length: [Number, String],
  opacity: [Number, String],
  thickness: [Number, String],
  vertical: Boolean,
  ...Ne(),
  ...at()
}, "VDivider"), hm = ve()({
  name: "VDivider",
  props: Bw(),
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const {
      themeClasses: o
    } = pt(e), {
      textColorClasses: r,
      textColorStyles: s
    } = un(le(e, "color")), a = y(() => {
      const l = {};
      return e.length && (l[e.vertical ? "height" : "width"] = he(e.length)), e.thickness && (l[e.vertical ? "borderRightWidth" : "borderTopWidth"] = he(e.thickness)), l;
    });
    return Ee(() => {
      const l = f("hr", {
        class: [{
          "v-divider": !0,
          "v-divider--inset": e.inset,
          "v-divider--vertical": e.vertical
        }, o.value, r.value, e.class],
        style: [a.value, s.value, {
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
      }, [l, f("div", {
        class: "v-divider__content"
      }, [i.default()]), l]) : l;
    }), {};
  }
}), ra = Symbol.for("vuetify:list");
function vm() {
  const e = He(ra, {
    hasPrepend: ke(!1),
    updateHasPrepend: () => null
  }), t = {
    hasPrepend: ke(!1),
    updateHasPrepend: (n) => {
      n && (t.hasPrepend.value = n);
    }
  };
  return Et(ra, t), e;
}
function gm() {
  return He(ra, null);
}
const sl = (e) => {
  const t = {
    activate: (n) => {
      let {
        id: i,
        value: o,
        activated: r
      } = n;
      return i = ae(i), e && !o && r.size === 1 && r.has(i) || (o ? r.add(i) : r.delete(i)), r;
    },
    in: (n, i, o) => {
      let r = /* @__PURE__ */ new Set();
      if (n != null)
        for (const s of an(n))
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
}, pm = (e) => {
  const t = sl(e);
  return {
    activate: (i) => {
      let {
        activated: o,
        id: r,
        ...s
      } = i;
      r = ae(r);
      const a = o.has(r) ? /* @__PURE__ */ new Set([r]) : /* @__PURE__ */ new Set();
      return t.activate({
        ...s,
        id: r,
        activated: a
      });
    },
    in: (i, o, r) => {
      let s = /* @__PURE__ */ new Set();
      if (i != null) {
        const a = an(i);
        a.length && (s = t.in(a.slice(0, 1), o, r));
      }
      return s;
    },
    out: (i, o, r) => t.out(i, o, r)
  };
}, Rw = (e) => {
  const t = sl(e);
  return {
    activate: (i) => {
      let {
        id: o,
        activated: r,
        children: s,
        ...a
      } = i;
      return o = ae(o), s.has(o) ? r : t.activate({
        id: o,
        activated: r,
        children: s,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, Hw = (e) => {
  const t = pm(e);
  return {
    activate: (i) => {
      let {
        id: o,
        activated: r,
        children: s,
        ...a
      } = i;
      return o = ae(o), s.has(o) ? r : t.activate({
        id: o,
        activated: r,
        children: s,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, jw = {
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
}, ym = {
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
}, zw = {
  open: ym.open,
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
}, al = (e) => {
  const t = {
    select: (n) => {
      let {
        id: i,
        value: o,
        selected: r
      } = n;
      if (i = ae(i), e && !o) {
        const s = Array.from(r.entries()).reduce((a, l) => {
          let [c, d] = l;
          return d === "on" && a.push(c), a;
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
}, _m = (e) => {
  const t = al(e);
  return {
    select: (i) => {
      let {
        selected: o,
        id: r,
        ...s
      } = i;
      r = ae(r);
      const a = o.has(r) ? /* @__PURE__ */ new Map([[r, o.get(r)]]) : /* @__PURE__ */ new Map();
      return t.select({
        ...s,
        id: r,
        selected: a
      });
    },
    in: (i, o, r) => {
      let s = /* @__PURE__ */ new Map();
      return i != null && i.length && (s = t.in(i.slice(0, 1), o, r)), s;
    },
    out: (i, o, r) => t.out(i, o, r)
  };
}, Uw = (e) => {
  const t = al(e);
  return {
    select: (i) => {
      let {
        id: o,
        selected: r,
        children: s,
        ...a
      } = i;
      return o = ae(o), s.has(o) ? r : t.select({
        id: o,
        selected: r,
        children: s,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, Ww = (e) => {
  const t = _m(e);
  return {
    select: (i) => {
      let {
        id: o,
        selected: r,
        children: s,
        ...a
      } = i;
      return o = ae(o), s.has(o) ? r : t.select({
        id: o,
        selected: r,
        children: s,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, qw = (e) => {
  const t = {
    select: (n) => {
      let {
        id: i,
        value: o,
        selected: r,
        children: s,
        parents: a
      } = n;
      i = ae(i);
      const l = new Map(r), c = [i];
      for (; c.length; ) {
        const u = c.shift();
        r.set(ae(u), o ? "on" : "off"), s.has(u) && c.push(...s.get(u));
      }
      let d = ae(a.get(i));
      for (; d; ) {
        const u = s.get(d), m = u.every((h) => r.get(ae(h)) === "on"), g = u.every((h) => !r.has(ae(h)) || r.get(ae(h)) === "off");
        r.set(d, m ? "on" : g ? "off" : "indeterminate"), d = ae(a.get(d));
      }
      return e && !o && Array.from(r.entries()).reduce((m, g) => {
        let [h, v] = g;
        return v === "on" && m.push(h), m;
      }, []).length === 0 ? l : r;
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
}, wo = Symbol.for("vuetify:nested"), bm = {
  id: ke(),
  root: {
    register: () => null,
    unregister: () => null,
    parents: se(/* @__PURE__ */ new Map()),
    children: se(/* @__PURE__ */ new Map()),
    open: () => null,
    openOnSelect: () => null,
    activate: () => null,
    select: () => null,
    activatable: se(!1),
    selectable: se(!1),
    opened: se(/* @__PURE__ */ new Set()),
    activated: se(/* @__PURE__ */ new Set()),
    selected: se(/* @__PURE__ */ new Map()),
    selectedValues: se([]),
    getPath: () => []
  }
}, Kw = J({
  activatable: Boolean,
  selectable: Boolean,
  activeStrategy: [String, Function, Object],
  selectStrategy: [String, Function, Object],
  openStrategy: [String, Object],
  opened: null,
  activated: null,
  selected: null,
  mandatory: Boolean
}, "nested"), Gw = (e) => {
  let t = !1;
  const n = se(/* @__PURE__ */ new Map()), i = se(/* @__PURE__ */ new Map()), o = nt(e, "opened", e.opened, (h) => new Set(h), (h) => [...h.values()]), r = y(() => {
    if (typeof e.activeStrategy == "object") return e.activeStrategy;
    if (typeof e.activeStrategy == "function") return e.activeStrategy(e.mandatory);
    switch (e.activeStrategy) {
      case "leaf":
        return Rw(e.mandatory);
      case "single-leaf":
        return Hw(e.mandatory);
      case "independent":
        return sl(e.mandatory);
      case "single-independent":
      default:
        return pm(e.mandatory);
    }
  }), s = y(() => {
    if (typeof e.selectStrategy == "object") return e.selectStrategy;
    if (typeof e.selectStrategy == "function") return e.selectStrategy(e.mandatory);
    switch (e.selectStrategy) {
      case "single-leaf":
        return Ww(e.mandatory);
      case "leaf":
        return Uw(e.mandatory);
      case "independent":
        return al(e.mandatory);
      case "single-independent":
        return _m(e.mandatory);
      case "classic":
      default:
        return qw(e.mandatory);
    }
  }), a = y(() => {
    if (typeof e.openStrategy == "object") return e.openStrategy;
    switch (e.openStrategy) {
      case "list":
        return zw;
      case "single":
        return jw;
      case "multiple":
      default:
        return ym;
    }
  }), l = nt(e, "activated", e.activated, (h) => r.value.in(h, n.value, i.value), (h) => r.value.out(h, n.value, i.value)), c = nt(e, "selected", e.selected, (h) => s.value.in(h, n.value, i.value), (h) => s.value.out(h, n.value, i.value));
  gt(() => {
    t = !0;
  });
  function d(h) {
    const v = [];
    let _ = h;
    for (; _ != null; )
      v.unshift(_), _ = i.value.get(_);
    return v;
  }
  const u = Qe("nested"), m = /* @__PURE__ */ new Set(), g = {
    id: ke(),
    root: {
      opened: o,
      activatable: le(e, "activatable"),
      selectable: le(e, "selectable"),
      activated: l,
      selected: c,
      selectedValues: y(() => {
        const h = [];
        for (const [v, _] of c.value.entries())
          _ === "on" && h.push(v);
        return h;
      }),
      register: (h, v, _) => {
        if (m.has(h)) {
          const k = d(h).map(String).join(" -> "), O = d(v).concat(h).map(String).join(" -> ");
          br(`Multiple nodes with the same ID
	${k}
	${O}`);
          return;
        } else
          m.add(h);
        v && h !== v && i.value.set(h, v), _ && n.value.set(h, []), v != null && n.value.set(v, [...n.value.get(v) || [], h]);
      },
      unregister: (h) => {
        if (t) return;
        m.delete(h), n.value.delete(h);
        const v = i.value.get(h);
        if (v) {
          const _ = n.value.get(v) ?? [];
          n.value.set(v, _.filter((k) => k !== h));
        }
        i.value.delete(h);
      },
      open: (h, v, _) => {
        u.emit("click:open", {
          id: h,
          value: v,
          path: d(h),
          event: _
        });
        const k = a.value.open({
          id: h,
          value: v,
          opened: new Set(o.value),
          children: n.value,
          parents: i.value,
          event: _
        });
        k && (o.value = k);
      },
      openOnSelect: (h, v, _) => {
        const k = a.value.select({
          id: h,
          value: v,
          selected: new Map(c.value),
          opened: new Set(o.value),
          children: n.value,
          parents: i.value,
          event: _
        });
        k && (o.value = k);
      },
      select: (h, v, _) => {
        u.emit("click:select", {
          id: h,
          value: v,
          path: d(h),
          event: _
        });
        const k = s.value.select({
          id: h,
          value: v,
          selected: new Map(c.value),
          children: n.value,
          parents: i.value,
          event: _
        });
        k && (c.value = k), g.root.openOnSelect(h, v, _);
      },
      activate: (h, v, _) => {
        if (!e.activatable)
          return g.root.select(h, !0, _);
        u.emit("click:activate", {
          id: h,
          value: v,
          path: d(h),
          event: _
        });
        const k = r.value.activate({
          id: h,
          value: v,
          activated: new Set(l.value),
          children: n.value,
          parents: i.value,
          event: _
        });
        k && (l.value = k);
      },
      children: n,
      parents: i,
      getPath: d
    }
  };
  return Et(wo, g), g.root;
}, wm = (e, t) => {
  const n = He(wo, bm), i = Symbol(Zt()), o = y(() => e.value !== void 0 ? e.value : i), r = {
    ...n,
    id: o,
    open: (s, a) => n.root.open(o.value, s, a),
    openOnSelect: (s, a) => n.root.openOnSelect(o.value, s, a),
    isOpen: y(() => n.root.opened.value.has(o.value)),
    parent: y(() => n.root.parents.value.get(o.value)),
    activate: (s, a) => n.root.activate(o.value, s, a),
    isActivated: y(() => n.root.activated.value.has(ae(o.value))),
    select: (s, a) => n.root.select(o.value, s, a),
    isSelected: y(() => n.root.selected.value.get(ae(o.value)) === "on"),
    isIndeterminate: y(() => n.root.selected.value.get(o.value) === "indeterminate"),
    isLeaf: y(() => !n.root.children.value.get(o.value)),
    isGroupActivator: n.isGroupActivator
  };
  return !n.isGroupActivator && n.root.register(o.value, n.id.value, t), gt(() => {
    !n.isGroupActivator && n.root.unregister(o.value);
  }), t && Et(wo, r), r;
}, Yw = () => {
  const e = He(wo, bm);
  Et(wo, {
    ...e,
    isGroupActivator: !0
  });
};
function is() {
  const e = ke(!1);
  return cn(() => {
    window.requestAnimationFrame(() => {
      e.value = !0;
    });
  }), {
    ssrBootStyles: y(() => e.value ? void 0 : {
      transition: "none !important"
    }),
    isBooted: Eo(e)
  };
}
const Xw = Ui({
  name: "VListGroupActivator",
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Yw(), () => {
      var i;
      return (i = n.default) == null ? void 0 : i.call(n);
    };
  }
}), Jw = J({
  /* @deprecated */
  activeColor: String,
  baseColor: String,
  color: String,
  collapseIcon: {
    type: Xe,
    default: "$collapse"
  },
  expandIcon: {
    type: Xe,
    default: "$expand"
  },
  prependIcon: Xe,
  appendIcon: Xe,
  fluid: Boolean,
  subgroup: Boolean,
  title: String,
  value: null,
  ...Ne(),
  ...it()
}, "VListGroup"), Dr = ve()({
  name: "VListGroup",
  props: Jw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isOpen: i,
      open: o,
      id: r
    } = wm(le(e, "value"), !0), s = y(() => `v-list-group--id-${String(r.value)}`), a = gm(), {
      isBooted: l
    } = is();
    function c(g) {
      g.stopPropagation(), o(!i.value, g);
    }
    const d = y(() => ({
      onClick: c,
      class: "v-list-group__header",
      id: s.value
    })), u = y(() => i.value ? e.collapseIcon : e.expandIcon), m = y(() => ({
      VListItem: {
        active: i.value,
        activeColor: e.activeColor,
        baseColor: e.baseColor,
        color: e.color,
        prependIcon: e.prependIcon || e.subgroup && u.value,
        appendIcon: e.appendIcon || !e.subgroup && u.value,
        title: e.title,
        value: e.value
      }
    }));
    return Ee(() => f(e.tag, {
      class: ["v-list-group", {
        "v-list-group--prepend": a == null ? void 0 : a.hasPrepend.value,
        "v-list-group--fluid": e.fluid,
        "v-list-group--subgroup": e.subgroup,
        "v-list-group--open": i.value
      }, e.class],
      style: e.style
    }, {
      default: () => [n.activator && f(mt, {
        defaults: m.value
      }, {
        default: () => [f(Xw, null, {
          default: () => [n.activator({
            props: d.value,
            isOpen: i.value
          })]
        })]
      }), f(Ln, {
        transition: {
          component: qf
        },
        disabled: !l.value
      }, {
        default: () => {
          var g;
          return [vt(f("div", {
            class: "v-list-group__items",
            role: "group",
            "aria-labelledby": s.value
          }, [(g = n.default) == null ? void 0 : g.call(n)]), [[Wn, i.value]])];
        }
      })]
    })), {
      isOpen: i
    };
  }
}), Zw = J({
  opacity: [Number, String],
  ...Ne(),
  ...it()
}, "VListItemSubtitle"), Qw = ve()({
  name: "VListItemSubtitle",
  props: Zw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => f(e.tag, {
      class: ["v-list-item-subtitle", e.class],
      style: [{
        "--v-list-item-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), e0 = Ha("v-list-item-title"), t0 = J({
  active: {
    type: Boolean,
    default: void 0
  },
  activeClass: String,
  /* @deprecated */
  activeColor: String,
  appendAvatar: String,
  appendIcon: Xe,
  baseColor: String,
  disabled: Boolean,
  lines: [Boolean, String],
  link: {
    type: Boolean,
    default: void 0
  },
  nav: Boolean,
  prependAvatar: String,
  prependIcon: Xe,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  slim: Boolean,
  subtitle: [String, Number],
  title: [String, Number],
  value: null,
  onClick: Ht(),
  onClickOnce: Ht(),
  ...qn(),
  ...Ne(),
  ...mn(),
  ...Xn(),
  ...Gn(),
  ...Pt(),
  ...Ja(),
  ...it(),
  ...at(),
  ...Ei({
    variant: "text"
  })
}, "VListItem"), wt = ve()({
  name: "VListItem",
  directives: {
    Ripple: Io
  },
  props: t0(),
  emits: {
    click: (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: i,
      emit: o
    } = t;
    const r = Xa(e, n), s = y(() => e.value === void 0 ? r.href.value : e.value), {
      activate: a,
      isActivated: l,
      select: c,
      isOpen: d,
      isSelected: u,
      isIndeterminate: m,
      isGroupActivator: g,
      root: h,
      parent: v,
      openOnSelect: _,
      id: k
    } = wm(s, !1), O = gm(), P = y(() => {
      var de;
      return e.active !== !1 && (e.active || ((de = r.isActive) == null ? void 0 : de.value) || (h.activatable.value ? l.value : u.value));
    }), B = y(() => e.link !== !1 && r.isLink.value), C = y(() => !e.disabled && e.link !== !1 && (e.link || r.isClickable.value || !!O && (h.selectable.value || h.activatable.value || e.value != null))), V = y(() => e.rounded || e.nav), F = y(() => e.color ?? e.activeColor), x = y(() => ({
      color: P.value ? F.value ?? e.baseColor : e.baseColor,
      variant: e.variant
    }));
    be(() => {
      var de;
      return (de = r.isActive) == null ? void 0 : de.value;
    }, (de) => {
      de && v.value != null && h.open(v.value, !0), de && _(de);
    }, {
      immediate: !0
    });
    const {
      themeClasses: N
    } = pt(e), {
      borderClasses: $
    } = Kn(e), {
      colorClasses: E,
      colorStyles: w,
      variantClasses: A
    } = Do(x), {
      densityClasses: M
    } = On(e), {
      dimensionStyles: ee
    } = Jn(e), {
      elevationClasses: oe
    } = Yn(e), {
      roundedClasses: ne
    } = $t(V), G = y(() => e.lines ? `v-list-item--${e.lines}-line` : void 0), Se = y(() => ({
      isActive: P.value,
      select: c,
      isOpen: d.value,
      isSelected: u.value,
      isIndeterminate: m.value
    }));
    function xe(de) {
      var Te;
      o("click", de), C.value && ((Te = r.navigate) == null || Te.call(r, de), !g && (h.activatable.value ? a(!l.value, de) : (h.selectable.value || e.value != null) && c(!u.value, de)));
    }
    function we(de) {
      (de.key === "Enter" || de.key === " ") && (de.preventDefault(), de.target.dispatchEvent(new MouseEvent("click", de)));
    }
    return Ee(() => {
      const de = B.value ? "a" : e.tag, Te = i.title || e.title != null, Je = i.subtitle || e.subtitle != null, Ge = !!(e.appendAvatar || e.appendIcon), Z = !!(Ge || i.append), ye = !!(e.prependAvatar || e.prependIcon), De = !!(ye || i.prepend);
      return O == null || O.updateHasPrepend(De), e.activeColor && bp("active-color", ["color", "base-color"]), vt(f(de, Oe({
        class: ["v-list-item", {
          "v-list-item--active": P.value,
          "v-list-item--disabled": e.disabled,
          "v-list-item--link": C.value,
          "v-list-item--nav": e.nav,
          "v-list-item--prepend": !De && (O == null ? void 0 : O.hasPrepend.value),
          "v-list-item--slim": e.slim,
          [`${e.activeClass}`]: e.activeClass && P.value
        }, N.value, $.value, E.value, M.value, oe.value, G.value, ne.value, A.value, e.class],
        style: [w.value, ee.value, e.style],
        tabindex: C.value ? O ? -2 : 0 : void 0,
        "aria-selected": h.activatable.value ? l.value : u.value,
        onClick: xe,
        onKeydown: C.value && !B.value && we
      }, r.linkProps), {
        default: () => {
          var lt;
          return [Ao(C.value || P.value, "v-list-item"), De && f("div", {
            key: "prepend",
            class: "v-list-item__prepend"
          }, [i.prepend ? f(mt, {
            key: "prepend-defaults",
            disabled: !ye,
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
              var We;
              return [(We = i.prepend) == null ? void 0 : We.call(i, Se.value)];
            }
          }) : f(fe, null, [e.prependAvatar && f(Tr, {
            key: "prepend-avatar",
            density: e.density,
            image: e.prependAvatar
          }, null), e.prependIcon && f(Ve, {
            key: "prepend-icon",
            density: e.density,
            icon: e.prependIcon
          }, null)]), f("div", {
            class: "v-list-item__spacer"
          }, null)]), f("div", {
            class: "v-list-item__content",
            "data-no-activator": ""
          }, [Te && f(e0, {
            key: "title"
          }, {
            default: () => {
              var We;
              return [((We = i.title) == null ? void 0 : We.call(i, {
                title: e.title
              })) ?? e.title];
            }
          }), Je && f(Qw, {
            key: "subtitle"
          }, {
            default: () => {
              var We;
              return [((We = i.subtitle) == null ? void 0 : We.call(i, {
                subtitle: e.subtitle
              })) ?? e.subtitle];
            }
          }), (lt = i.default) == null ? void 0 : lt.call(i, Se.value)]), Z && f("div", {
            key: "append",
            class: "v-list-item__append"
          }, [i.append ? f(mt, {
            key: "append-defaults",
            disabled: !Ge,
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
              var We;
              return [(We = i.append) == null ? void 0 : We.call(i, Se.value)];
            }
          }) : f(fe, null, [e.appendIcon && f(Ve, {
            key: "append-icon",
            density: e.density,
            icon: e.appendIcon
          }, null), e.appendAvatar && f(Tr, {
            key: "append-avatar",
            density: e.density,
            image: e.appendAvatar
          }, null)]), f("div", {
            class: "v-list-item__spacer"
          }, null)])];
        }
      }), [[Si("ripple"), C.value && e.ripple]]);
    }), {
      activate: a,
      isActivated: l,
      isGroupActivator: g,
      isSelected: u,
      list: O,
      select: c,
      root: h,
      id: k
    };
  }
}), n0 = J({
  color: String,
  inset: Boolean,
  sticky: Boolean,
  title: String,
  ...Ne(),
  ...it()
}, "VListSubheader"), i0 = ve()({
  name: "VListSubheader",
  props: n0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      textColorClasses: i,
      textColorStyles: o
    } = un(le(e, "color"));
    return Ee(() => {
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
}), o0 = J({
  items: Array,
  returnObject: Boolean
}, "VListChildren"), Sm = ve()({
  name: "VListChildren",
  props: o0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return vm(), () => {
      var i, o;
      return ((i = n.default) == null ? void 0 : i.call(n)) ?? ((o = e.items) == null ? void 0 : o.map((r) => {
        var m, g;
        let {
          children: s,
          props: a,
          type: l,
          raw: c
        } = r;
        if (l === "divider")
          return ((m = n.divider) == null ? void 0 : m.call(n, {
            props: a
          })) ?? f(hm, a, null);
        if (l === "subheader")
          return ((g = n.subheader) == null ? void 0 : g.call(n, {
            props: a
          })) ?? f(i0, a, null);
        const d = {
          subtitle: n.subtitle ? (h) => {
            var v;
            return (v = n.subtitle) == null ? void 0 : v.call(n, {
              ...h,
              item: c
            });
          } : void 0,
          prepend: n.prepend ? (h) => {
            var v;
            return (v = n.prepend) == null ? void 0 : v.call(n, {
              ...h,
              item: c
            });
          } : void 0,
          append: n.append ? (h) => {
            var v;
            return (v = n.append) == null ? void 0 : v.call(n, {
              ...h,
              item: c
            });
          } : void 0,
          title: n.title ? (h) => {
            var v;
            return (v = n.title) == null ? void 0 : v.call(n, {
              ...h,
              item: c
            });
          } : void 0
        }, u = Dr.filterProps(a);
        return s ? f(Dr, Oe({
          value: a == null ? void 0 : a.value
        }, u), {
          activator: (h) => {
            let {
              props: v
            } = h;
            const _ = {
              ...a,
              ...v,
              value: e.returnObject ? c : a.value
            };
            return n.header ? n.header({
              props: _
            }) : f(wt, _, d);
          },
          default: () => f(Sm, {
            items: s,
            returnObject: e.returnObject
          }, n)
        }) : n.item ? n.item({
          props: a
        }) : f(wt, Oe(a, {
          value: e.returnObject ? c : a.value
        }), d);
      }));
    };
  }
}), r0 = J({
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
    default: To
  }
}, "list-items");
function s0(e) {
  return typeof e == "string" || typeof e == "number" || typeof e == "boolean";
}
function a0(e, t) {
  const n = Xi(t, e.itemType, "item"), i = s0(t) ? t : Xi(t, e.itemTitle), o = Xi(t, e.itemValue, void 0), r = Xi(t, e.itemChildren), s = e.itemProps === !0 ? Pa(t, ["children"]) : Xi(t, e.itemProps), a = {
    title: i,
    value: o,
    ...s
  };
  return {
    type: n,
    title: a.title,
    value: a.value,
    props: a,
    children: n === "item" && r ? km(e, r) : void 0,
    raw: t
  };
}
function km(e, t) {
  const n = [];
  for (const i of t)
    n.push(a0(e, i));
  return n;
}
function l0(e) {
  return {
    items: y(() => km(e, e.items))
  };
}
const u0 = J({
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
  "onClick:open": Ht(),
  "onClick:select": Ht(),
  "onUpdate:opened": Ht(),
  ...Kw({
    selectStrategy: "single-leaf",
    openStrategy: "list"
  }),
  ...qn(),
  ...Ne(),
  ...mn(),
  ...Xn(),
  ...Gn(),
  itemType: {
    type: String,
    default: "type"
  },
  ...r0(),
  ...Pt(),
  ...it(),
  ...at(),
  ...Ei({
    variant: "text"
  })
}, "VList"), Cm = ve()({
  name: "VList",
  props: u0(),
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
    } = l0(e), {
      themeClasses: o
    } = pt(e), {
      backgroundColorClasses: r,
      backgroundColorStyles: s
    } = jt(le(e, "bgColor")), {
      borderClasses: a
    } = Kn(e), {
      densityClasses: l
    } = On(e), {
      dimensionStyles: c
    } = Jn(e), {
      elevationClasses: d
    } = Yn(e), {
      roundedClasses: u
    } = $t(e), {
      children: m,
      open: g,
      parents: h,
      select: v,
      getPath: _
    } = Gw(e), k = y(() => e.lines ? `v-list--${e.lines}-line` : void 0), O = le(e, "activeColor"), P = le(e, "baseColor"), B = le(e, "color");
    vm(), Ci({
      VListGroup: {
        activeColor: O,
        baseColor: P,
        color: B,
        expandIcon: le(e, "expandIcon"),
        collapseIcon: le(e, "collapseIcon")
      },
      VListItem: {
        activeClass: le(e, "activeClass"),
        activeColor: O,
        baseColor: P,
        color: B,
        density: le(e, "density"),
        disabled: le(e, "disabled"),
        lines: le(e, "lines"),
        nav: le(e, "nav"),
        slim: le(e, "slim"),
        variant: le(e, "variant")
      }
    });
    const C = ke(!1), V = se();
    function F(A) {
      C.value = !0;
    }
    function x(A) {
      C.value = !1;
    }
    function N(A) {
      var M;
      !C.value && !(A.relatedTarget && ((M = V.value) != null && M.contains(A.relatedTarget))) && w();
    }
    function $(A) {
      const M = A.target;
      if (!(!V.value || ["INPUT", "TEXTAREA"].includes(M.tagName))) {
        if (A.key === "ArrowDown")
          w("next");
        else if (A.key === "ArrowUp")
          w("prev");
        else if (A.key === "Home")
          w("first");
        else if (A.key === "End")
          w("last");
        else
          return;
        A.preventDefault();
      }
    }
    function E(A) {
      C.value = !0;
    }
    function w(A) {
      if (V.value)
        return Jd(V.value, A);
    }
    return Ee(() => f(e.tag, {
      ref: V,
      class: ["v-list", {
        "v-list--disabled": e.disabled,
        "v-list--nav": e.nav,
        "v-list--slim": e.slim
      }, o.value, r.value, a.value, l.value, d.value, k.value, u.value, e.class],
      style: [s.value, c.value, e.style],
      tabindex: e.disabled || C.value ? -1 : 0,
      role: "listbox",
      "aria-activedescendant": void 0,
      onFocusin: F,
      onFocusout: x,
      onFocus: N,
      onKeydown: $,
      onMousedown: E
    }, {
      default: () => [f(Sm, {
        items: i.value,
        returnObject: e.returnObject
      }, n)]
    })), {
      open: g,
      select: v,
      focus: w,
      children: m,
      parents: h,
      getPath: _
    };
  }
}), c0 = {
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
      const t = (o) => o ? o.split("#")[0] : "", n = this.currentChapter.href || "", i = e.href || "";
      return n.includes("#") && i.includes("#") ? n === i : t(n) === t(i);
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
function d0(e, t, n, i, o, r) {
  return X(), Ke(Cm, {
    "onClick:select": r.click_toc,
    ref: "tocList"
  }, {
    default: T(() => [
      f(Dr, null, {
        activator: T(({ props: s }) => [
          f(wt, Oe(s, { title: "书籍信息" }), null, 16)
        ]),
        default: T(() => [
          (X(!0), ce(fe, null, At(r.meta_items, (s) => (X(), Ke(wt, {
            key: s.title,
            title: s.title,
            subtitle: s.subtitle,
            lines: "3"
          }, null, 8, ["title", "subtitle"]))), 128))
        ]),
        _: 1
      }),
      f(hm),
      (X(!0), ce(fe, null, At(n.toc_items, (s, a) => (X(), ce(fe, null, [
        s.subitems.length == 0 ? (X(), Ke(wt, {
          key: 0,
          "prepend-icon": "mdi-book-open-page-variant-outline",
          title: s.label,
          value: s.href,
          class: Vt({ "current-chapter": r.isCurrentChapter(s) }),
          ref_for: !0,
          ref: "listItem"
        }, null, 8, ["title", "value", "class"])) : (X(), Ke(Dr, {
          key: s.href
        }, {
          activator: T(({ props: l }) => [
            f(wt, Oe({ ref_for: !0 }, l, {
              "prepend-icon": "mdi-book-open-page-variant-outline",
              title: s.label,
              value: s.href,
              class: { "current-chapter": r.isCurrentChapter(s) },
              ref_for: !0,
              ref: "listItem"
            }), null, 16, ["title", "value", "class"])
          ]),
          default: T(() => [
            (X(!0), ce(fe, null, At(s.subitems, (l, c) => (X(), Ke(wt, {
              key: l.href,
              title: l.label,
              value: l.href,
              class: Vt({ "current-chapter": r.isCurrentChapter(l) }),
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
const Em = /* @__PURE__ */ Vn(c0, [["render", d0], ["__scopeId", "data-v-68670265"]]), ll = Symbol.for("vuetify:v-slider");
function f0(e, t, n) {
  const i = n === "vertical", o = t.getBoundingClientRect(), r = "touches" in e ? e.touches[0] : e;
  return i ? r.clientY - (o.top + o.height / 2) : r.clientX - (o.left + o.width / 2);
}
function m0(e, t) {
  return "touches" in e && e.touches.length ? e.touches[0][t] : "changedTouches" in e && e.changedTouches.length ? e.changedTouches[0][t] : e[t];
}
const h0 = J({
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
  ...Pt(),
  ...Gn({
    elevation: 2
  }),
  ripple: {
    type: Boolean,
    default: !0
  }
}, "Slider"), v0 = (e) => {
  const t = y(() => parseFloat(e.min)), n = y(() => parseFloat(e.max)), i = y(() => +e.step > 0 ? parseFloat(e.step) : 0), o = y(() => Math.max(uu(i.value), uu(t.value)));
  function r(s) {
    if (s = parseFloat(s), i.value <= 0) return s;
    const a = kn(s, t.value, n.value), l = t.value % i.value, c = Math.round((a - l) / i.value) * i.value + l;
    return parseFloat(Math.min(c, n.value).toFixed(o.value));
  }
  return {
    min: t,
    max: n,
    step: i,
    decimals: o,
    roundValue: r
  };
}, g0 = (e) => {
  let {
    props: t,
    steps: n,
    onSliderStart: i,
    onSliderMove: o,
    onSliderEnd: r,
    getActiveThumb: s
  } = e;
  const {
    isRtl: a
  } = fn(), l = le(t, "reverse"), c = y(() => t.direction === "vertical"), d = y(() => c.value !== l.value), {
    min: u,
    max: m,
    step: g,
    decimals: h,
    roundValue: v
  } = n, _ = y(() => parseInt(t.thumbSize, 10)), k = y(() => parseInt(t.tickSize, 10)), O = y(() => parseInt(t.trackSize, 10)), P = y(() => (m.value - u.value) / g.value), B = le(t, "disabled"), C = y(() => t.error || t.disabled ? void 0 : t.thumbColor ?? t.color), V = y(() => t.error || t.disabled ? void 0 : t.trackColor ?? t.color), F = y(() => t.error || t.disabled ? void 0 : t.trackFillColor ?? t.color), x = ke(!1), N = ke(0), $ = se(), E = se();
  function w(Z) {
    var b;
    const ye = t.direction === "vertical", De = ye ? "top" : "left", lt = ye ? "height" : "width", We = ye ? "clientY" : "clientX", {
      [De]: Wt,
      [lt]: Tn
    } = (b = $.value) == null ? void 0 : b.$el.getBoundingClientRect(), hn = m0(Z, We);
    let p = Math.min(Math.max((hn - Wt - N.value) / Tn, 0), 1) || 0;
    return (ye ? d.value : d.value !== a.value) && (p = 1 - p), v(u.value + p * (m.value - u.value));
  }
  const A = (Z) => {
    r({
      value: w(Z)
    }), x.value = !1, N.value = 0;
  }, M = (Z) => {
    E.value = s(Z), E.value && (E.value.focus(), x.value = !0, E.value.contains(Z.target) ? N.value = f0(Z, E.value, t.direction) : (N.value = 0, o({
      value: w(Z)
    })), i({
      value: w(Z)
    }));
  }, ee = {
    passive: !0,
    capture: !0
  };
  function oe(Z) {
    o({
      value: w(Z)
    });
  }
  function ne(Z) {
    Z.stopPropagation(), Z.preventDefault(), A(Z), window.removeEventListener("mousemove", oe, ee), window.removeEventListener("mouseup", ne);
  }
  function G(Z) {
    var ye;
    A(Z), window.removeEventListener("touchmove", oe, ee), (ye = Z.target) == null || ye.removeEventListener("touchend", G);
  }
  function Se(Z) {
    var ye;
    M(Z), window.addEventListener("touchmove", oe, ee), (ye = Z.target) == null || ye.addEventListener("touchend", G, {
      passive: !1
    });
  }
  function xe(Z) {
    Z.preventDefault(), M(Z), window.addEventListener("mousemove", oe, ee), window.addEventListener("mouseup", ne, {
      passive: !1
    });
  }
  const we = (Z) => {
    const ye = (Z - u.value) / (m.value - u.value) * 100;
    return kn(isNaN(ye) ? 0 : ye, 0, 100);
  }, de = le(t, "showTicks"), Te = y(() => de.value ? t.ticks ? Array.isArray(t.ticks) ? t.ticks.map((Z) => ({
    value: Z,
    position: we(Z),
    label: Z.toString()
  })) : Object.keys(t.ticks).map((Z) => ({
    value: parseFloat(Z),
    position: we(parseFloat(Z)),
    label: t.ticks[Z]
  })) : P.value !== 1 / 0 ? Ia(P.value + 1).map((Z) => {
    const ye = u.value + Z * g.value;
    return {
      value: ye,
      position: we(ye)
    };
  }) : [] : []), Je = y(() => Te.value.some((Z) => {
    let {
      label: ye
    } = Z;
    return !!ye;
  })), Ge = {
    activeThumbRef: E,
    color: le(t, "color"),
    decimals: h,
    disabled: B,
    direction: le(t, "direction"),
    elevation: le(t, "elevation"),
    hasLabels: Je,
    isReversed: l,
    indexFromEnd: d,
    min: u,
    max: m,
    mousePressed: x,
    numTicks: P,
    onSliderMousedown: xe,
    onSliderTouchstart: Se,
    parsedTicks: Te,
    parseMouseMove: w,
    position: we,
    readonly: le(t, "readonly"),
    rounded: le(t, "rounded"),
    roundValue: v,
    showTicks: de,
    startOffset: N,
    step: g,
    thumbSize: _,
    thumbColor: C,
    thumbLabel: le(t, "thumbLabel"),
    ticks: le(t, "ticks"),
    tickSize: k,
    trackColor: V,
    trackContainerRef: $,
    trackFillColor: F,
    trackSize: O,
    vertical: c
  };
  return Et(ll, Ge), Ge;
}, p0 = J({
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
  ...Ne()
}, "VSliderThumb"), y0 = ve()({
  name: "VSliderThumb",
  directives: {
    Ripple: Io
  },
  props: p0(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: i
    } = t;
    const o = He(ll), {
      isRtl: r,
      rtlClasses: s
    } = fn();
    if (!o) throw new Error("[Vuetify] v-slider-thumb must be used inside v-slider or v-range-slider");
    const {
      thumbColor: a,
      step: l,
      disabled: c,
      thumbSize: d,
      thumbLabel: u,
      direction: m,
      isReversed: g,
      vertical: h,
      readonly: v,
      elevation: _,
      mousePressed: k,
      decimals: O,
      indexFromEnd: P
    } = o, B = y(() => c.value ? void 0 : _.value), {
      elevationClasses: C
    } = Yn(B), {
      textColorClasses: V,
      textColorStyles: F
    } = un(a), {
      pageup: x,
      pagedown: N,
      end: $,
      home: E,
      left: w,
      right: A,
      down: M,
      up: ee
    } = ip, oe = [x, N, $, E, w, A, M, ee], ne = y(() => l.value ? [1, 2, 3] : [1, 5, 10]);
    function G(xe, we) {
      if (!oe.includes(xe.key)) return;
      xe.preventDefault();
      const de = l.value || 0.1, Te = (e.max - e.min) / de;
      if ([w, A, M, ee].includes(xe.key)) {
        const Ge = (h.value ? [r.value ? w : A, g.value ? M : ee] : P.value !== r.value ? [w, ee] : [A, ee]).includes(xe.key) ? 1 : -1, Z = xe.shiftKey ? 2 : xe.ctrlKey ? 1 : 0;
        we = we + Ge * de * ne.value[Z];
      } else if (xe.key === E)
        we = e.min;
      else if (xe.key === $)
        we = e.max;
      else {
        const Je = xe.key === N ? 1 : -1;
        we = we - Je * de * (Te > 100 ? Te / 10 : 10);
      }
      return Math.max(e.min, Math.min(e.max, we));
    }
    function Se(xe) {
      const we = G(xe, e.modelValue);
      we != null && i("update:modelValue", we);
    }
    return Ee(() => {
      const xe = he(P.value ? 100 - e.position : e.position, "%");
      return f("div", {
        class: ["v-slider-thumb", {
          "v-slider-thumb--focused": e.focused,
          "v-slider-thumb--pressed": e.focused && k.value
        }, e.class, s.value],
        style: [{
          "--v-slider-thumb-position": xe,
          "--v-slider-thumb-size": he(d.value)
        }, e.style],
        role: "slider",
        tabindex: c.value ? -1 : 0,
        "aria-label": e.name,
        "aria-valuemin": e.min,
        "aria-valuemax": e.max,
        "aria-valuenow": e.modelValue,
        "aria-readonly": !!v.value,
        "aria-orientation": m.value,
        onKeydown: v.value ? void 0 : Se
      }, [f("div", {
        class: ["v-slider-thumb__surface", V.value, C.value],
        style: {
          ...F.value
        }
      }, null), vt(f("div", {
        class: ["v-slider-thumb__ripple", V.value],
        style: F.value
      }, null), [[Si("ripple"), e.ripple, null, {
        circle: !0,
        center: !0
      }]]), f(Uf, {
        origin: "bottom center"
      }, {
        default: () => {
          var we;
          return [vt(f("div", {
            class: "v-slider-thumb__label-container"
          }, [f("div", {
            class: ["v-slider-thumb__label"]
          }, [f("div", null, [((we = n["thumb-label"]) == null ? void 0 : we.call(n, {
            modelValue: e.modelValue
          })) ?? e.modelValue.toFixed(l.value ? O.value : 1)])])]), [[Wn, u.value && e.focused || u.value === "always"]])];
        }
      })]);
    }), {};
  }
}), _0 = J({
  start: {
    type: Number,
    required: !0
  },
  stop: {
    type: Number,
    required: !0
  },
  ...Ne()
}, "VSliderTrack"), b0 = ve()({
  name: "VSliderTrack",
  props: _0(),
  emits: {},
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = He(ll);
    if (!i) throw new Error("[Vuetify] v-slider-track must be inside v-slider or v-range-slider");
    const {
      color: o,
      parsedTicks: r,
      rounded: s,
      showTicks: a,
      tickSize: l,
      trackColor: c,
      trackFillColor: d,
      trackSize: u,
      vertical: m,
      min: g,
      max: h,
      indexFromEnd: v
    } = i, {
      roundedClasses: _
    } = $t(s), {
      backgroundColorClasses: k,
      backgroundColorStyles: O
    } = jt(d), {
      backgroundColorClasses: P,
      backgroundColorStyles: B
    } = jt(c), C = y(() => `inset-${m.value ? "block" : "inline"}-${v.value ? "end" : "start"}`), V = y(() => m.value ? "height" : "width"), F = y(() => ({
      [C.value]: "0%",
      [V.value]: "100%"
    })), x = y(() => e.stop - e.start), N = y(() => ({
      [C.value]: he(e.start, "%"),
      [V.value]: he(x.value, "%")
    })), $ = y(() => a.value ? (m.value ? r.value.slice().reverse() : r.value).map((w, A) => {
      var ee;
      const M = w.value !== g.value && w.value !== h.value ? he(w.position, "%") : void 0;
      return f("div", {
        key: w.value,
        class: ["v-slider-track__tick", {
          "v-slider-track__tick--filled": w.position >= e.start && w.position <= e.stop,
          "v-slider-track__tick--first": w.value === g.value,
          "v-slider-track__tick--last": w.value === h.value
        }],
        style: {
          [C.value]: M
        }
      }, [(w.label || n["tick-label"]) && f("div", {
        class: "v-slider-track__tick-label"
      }, [((ee = n["tick-label"]) == null ? void 0 : ee.call(n, {
        tick: w,
        index: A
      })) ?? w.label])]);
    }) : []);
    return Ee(() => f("div", {
      class: ["v-slider-track", _.value, e.class],
      style: [{
        "--v-slider-track-size": he(u.value),
        "--v-slider-tick-size": he(l.value)
      }, e.style]
    }, [f("div", {
      class: ["v-slider-track__background", P.value, {
        "v-slider-track__background--opacity": !!o.value || !d.value
      }],
      style: {
        ...F.value,
        ...B.value
      }
    }, null), f("div", {
      class: ["v-slider-track__fill", k.value],
      style: {
        ...N.value,
        ...O.value
      }
    }, null), a.value && f("div", {
      class: ["v-slider-track__ticks", {
        "v-slider-track__ticks--always-show": a.value === "always"
      }]
    }, [$.value])])), {};
  }
}), w0 = J({
  ...rl(),
  ...h0(),
  ...ns(),
  modelValue: {
    type: [Number, String],
    default: 0
  }
}, "VSlider"), S0 = ve()({
  name: "VSlider",
  props: w0(),
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
    const o = se(), {
      rtlClasses: r
    } = fn(), s = v0(e), a = nt(e, "modelValue", void 0, (V) => s.roundValue(V ?? s.min.value)), {
      min: l,
      max: c,
      mousePressed: d,
      roundValue: u,
      onSliderMousedown: m,
      onSliderTouchstart: g,
      trackContainerRef: h,
      position: v,
      hasLabels: _,
      readonly: k
    } = g0({
      props: e,
      steps: s,
      onSliderStart: () => {
        i("start", a.value);
      },
      onSliderEnd: (V) => {
        let {
          value: F
        } = V;
        const x = u(F);
        a.value = x, i("end", x);
      },
      onSliderMove: (V) => {
        let {
          value: F
        } = V;
        return a.value = u(F);
      },
      getActiveThumb: () => {
        var V;
        return (V = o.value) == null ? void 0 : V.$el;
      }
    }), {
      isFocused: O,
      focus: P,
      blur: B
    } = ts(e), C = y(() => v(a.value));
    return Ee(() => {
      const V = Hi.filterProps(e), F = !!(e.label || n.label || n.prepend);
      return f(Hi, Oe({
        class: ["v-slider", {
          "v-slider--has-labels": !!n["tick-label"] || _.value,
          "v-slider--focused": O.value,
          "v-slider--pressed": d.value,
          "v-slider--disabled": e.disabled
        }, r.value, e.class],
        style: e.style
      }, V, {
        focused: O.value
      }), {
        ...n,
        prepend: F ? (x) => {
          var N, $;
          return f(fe, null, [((N = n.label) == null ? void 0 : N.call(n, x)) ?? (e.label ? f(ol, {
            id: x.id.value,
            class: "v-slider__label",
            text: e.label
          }, null) : void 0), ($ = n.prepend) == null ? void 0 : $.call(n, x)]);
        } : void 0,
        default: (x) => {
          let {
            id: N,
            messagesId: $
          } = x;
          return f("div", {
            class: "v-slider__container",
            onMousedown: k.value ? void 0 : m,
            onTouchstartPassive: k.value ? void 0 : g
          }, [f("input", {
            id: N.value,
            name: e.name || N.value,
            disabled: !!e.disabled,
            readonly: !!e.readonly,
            tabindex: "-1",
            value: a.value
          }, null), f(b0, {
            ref: h,
            start: 0,
            stop: C.value
          }, {
            "tick-label": n["tick-label"]
          }), f(y0, {
            ref: o,
            "aria-describedby": $.value,
            focused: O.value,
            min: l.value,
            max: c.value,
            modelValue: a.value,
            "onUpdate:modelValue": (E) => a.value = E,
            position: C.value,
            elevation: e.elevation,
            onFocus: P,
            onBlur: B,
            ripple: e.ripple,
            name: e.name
          }, {
            "thumb-label": n["thumb-label"]
          })]);
        }
      });
    }), {};
  }
}), xm = Symbol.for("vuetify:selection-control-group"), Nm = J({
  color: String,
  disabled: {
    type: Boolean,
    default: null
  },
  defaultsTarget: String,
  error: Boolean,
  id: String,
  inline: Boolean,
  falseIcon: Xe,
  trueIcon: Xe,
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
    default: To
  },
  ...Ne(),
  ...mn(),
  ...at()
}, "SelectionControlGroup"), k0 = J({
  ...Nm({
    defaultsTarget: "VSelectionControl"
  })
}, "VSelectionControlGroup");
ve()({
  name: "VSelectionControlGroup",
  props: k0(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = nt(e, "modelValue"), o = Zt(), r = y(() => e.id || `v-selection-control-group-${o}`), s = y(() => e.name || r.value), a = /* @__PURE__ */ new Set();
    return Et(xm, {
      modelValue: i,
      forceUpdate: () => {
        a.forEach((l) => l());
      },
      onForceUpdate: (l) => {
        a.add(l), It(() => {
          a.delete(l);
        });
      }
    }), Ci({
      [e.defaultsTarget]: {
        color: le(e, "color"),
        disabled: le(e, "disabled"),
        density: le(e, "density"),
        error: le(e, "error"),
        inline: le(e, "inline"),
        modelValue: i,
        multiple: y(() => !!e.multiple || e.multiple == null && Array.isArray(i.value)),
        name: s,
        falseIcon: le(e, "falseIcon"),
        trueIcon: le(e, "trueIcon"),
        readonly: le(e, "readonly"),
        ripple: le(e, "ripple"),
        type: le(e, "type"),
        valueComparator: le(e, "valueComparator")
      }
    }), Ee(() => {
      var l;
      return f("div", {
        class: ["v-selection-control-group", {
          "v-selection-control-group--inline": e.inline
        }, e.class],
        style: e.style,
        role: e.type === "radio" ? "radiogroup" : void 0
      }, [(l = n.default) == null ? void 0 : l.call(n)]);
    }), {};
  }
});
const Vm = J({
  label: String,
  baseColor: String,
  trueValue: null,
  falseValue: null,
  value: null,
  ...Ne(),
  ...Nm()
}, "VSelectionControl");
function C0(e) {
  const t = He(xm, void 0), {
    densityClasses: n
  } = On(e), i = nt(e, "modelValue"), o = y(() => e.trueValue !== void 0 ? e.trueValue : e.value !== void 0 ? e.value : !0), r = y(() => e.falseValue !== void 0 ? e.falseValue : !1), s = y(() => !!e.multiple || e.multiple == null && Array.isArray(i.value)), a = y({
    get() {
      const g = t ? t.modelValue.value : i.value;
      return s.value ? an(g).some((h) => e.valueComparator(h, o.value)) : e.valueComparator(g, o.value);
    },
    set(g) {
      if (e.readonly) return;
      const h = g ? o.value : r.value;
      let v = h;
      s.value && (v = g ? [...an(i.value), h] : an(i.value).filter((_) => !e.valueComparator(_, o.value))), t ? t.modelValue.value = v : i.value = v;
    }
  }), {
    textColorClasses: l,
    textColorStyles: c
  } = un(y(() => {
    if (!(e.error || e.disabled))
      return a.value ? e.color : e.baseColor;
  })), {
    backgroundColorClasses: d,
    backgroundColorStyles: u
  } = jt(y(() => a.value && !e.error && !e.disabled ? e.color : e.baseColor)), m = y(() => a.value ? e.trueIcon : e.falseIcon);
  return {
    group: t,
    densityClasses: n,
    trueValue: o,
    falseValue: r,
    model: a,
    textColorClasses: l,
    textColorStyles: c,
    backgroundColorClasses: d,
    backgroundColorStyles: u,
    icon: m
  };
}
const rc = ve()({
  name: "VSelectionControl",
  directives: {
    Ripple: Io
  },
  inheritAttrs: !1,
  props: Vm(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const {
      group: o,
      densityClasses: r,
      icon: s,
      model: a,
      textColorClasses: l,
      textColorStyles: c,
      backgroundColorClasses: d,
      backgroundColorStyles: u,
      trueValue: m
    } = C0(e), g = Zt(), h = ke(!1), v = ke(!1), _ = se(), k = y(() => e.id || `input-${g}`), O = y(() => !e.disabled && !e.readonly);
    o == null || o.onForceUpdate(() => {
      _.value && (_.value.checked = a.value);
    });
    function P(F) {
      O.value && (h.value = !0, Zd(F.target, ":focus-visible") !== !1 && (v.value = !0));
    }
    function B() {
      h.value = !1, v.value = !1;
    }
    function C(F) {
      F.stopPropagation();
    }
    function V(F) {
      if (!O.value) {
        _.value && (_.value.checked = a.value);
        return;
      }
      e.readonly && o && ft(() => o.forceUpdate()), a.value = F.target.checked;
    }
    return Ee(() => {
      var E, w;
      const F = i.label ? i.label({
        label: e.label,
        props: {
          for: k.value
        }
      }) : e.label, [x, N] = Ma(n), $ = f("input", Oe({
        ref: _,
        checked: a.value,
        disabled: !!e.disabled,
        id: k.value,
        onBlur: B,
        onFocus: P,
        onInput: V,
        "aria-disabled": !!e.disabled,
        "aria-label": e.label,
        type: e.type,
        value: m.value,
        name: e.name,
        "aria-checked": e.type === "checkbox" ? a.value : void 0
      }, N), null);
      return f("div", Oe({
        class: ["v-selection-control", {
          "v-selection-control--dirty": a.value,
          "v-selection-control--disabled": e.disabled,
          "v-selection-control--error": e.error,
          "v-selection-control--focused": h.value,
          "v-selection-control--focus-visible": v.value,
          "v-selection-control--inline": e.inline
        }, r.value, e.class]
      }, x, {
        style: e.style
      }), [f("div", {
        class: ["v-selection-control__wrapper", l.value],
        style: c.value
      }, [(E = i.default) == null ? void 0 : E.call(i, {
        backgroundColorClasses: d,
        backgroundColorStyles: u
      }), vt(f("div", {
        class: ["v-selection-control__input"]
      }, [((w = i.input) == null ? void 0 : w.call(i, {
        model: a,
        textColorClasses: l,
        textColorStyles: c,
        backgroundColorClasses: d,
        backgroundColorStyles: u,
        inputNode: $,
        icon: s.value,
        props: {
          onFocus: P,
          onBlur: B,
          id: k.value
        }
      })) ?? f(fe, null, [s.value && f(Ve, {
        key: "icon",
        icon: s.value
      }, null), $])]), [[Si("ripple"), e.ripple && [!e.disabled && !e.readonly, null, ["center", "circle"]]]])]), F && f(ol, {
        for: k.value,
        onClick: C
      }, {
        default: () => [F]
      })]);
    }), {
      isFocused: h,
      input: _
    };
  }
}), E0 = J({
  indeterminate: Boolean,
  inset: Boolean,
  flat: Boolean,
  loading: {
    type: [Boolean, String],
    default: !1
  },
  ...ns(),
  ...Vm()
}, "VSwitch"), Om = ve()({
  name: "VSwitch",
  inheritAttrs: !1,
  props: E0(),
  emits: {
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0,
    "update:indeterminate": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const o = nt(e, "indeterminate"), r = nt(e, "modelValue"), {
      loaderClasses: s
    } = Qr(e), {
      isFocused: a,
      focus: l,
      blur: c
    } = ts(e), d = se(), u = ze && window.matchMedia("(forced-colors: active)").matches, m = y(() => typeof e.loading == "string" && e.loading !== "" ? e.loading : e.color), g = Zt(), h = y(() => e.id || `switch-${g}`);
    function v() {
      o.value && (o.value = !1);
    }
    function _(k) {
      var O, P;
      k.stopPropagation(), k.preventDefault(), (P = (O = d.value) == null ? void 0 : O.input) == null || P.click();
    }
    return Ee(() => {
      const [k, O] = Ma(n), P = Hi.filterProps(e), B = rc.filterProps(e);
      return f(Hi, Oe({
        class: ["v-switch", {
          "v-switch--flat": e.flat
        }, {
          "v-switch--inset": e.inset
        }, {
          "v-switch--indeterminate": o.value
        }, s.value, e.class]
      }, k, P, {
        modelValue: r.value,
        "onUpdate:modelValue": (C) => r.value = C,
        id: h.value,
        focused: a.value,
        style: e.style
      }), {
        ...i,
        default: (C) => {
          let {
            id: V,
            messagesId: F,
            isDisabled: x,
            isReadonly: N,
            isValid: $
          } = C;
          const E = {
            model: r,
            isValid: $
          };
          return f(rc, Oe({
            ref: d
          }, B, {
            modelValue: r.value,
            "onUpdate:modelValue": [(w) => r.value = w, v],
            id: V.value,
            "aria-describedby": F.value,
            type: "checkbox",
            "aria-checked": o.value ? "mixed" : void 0,
            disabled: x.value,
            readonly: N.value,
            onFocus: l,
            onBlur: c
          }, O), {
            ...i,
            default: (w) => {
              let {
                backgroundColorClasses: A,
                backgroundColorStyles: M
              } = w;
              return f("div", {
                class: ["v-switch__track", u ? void 0 : A.value],
                style: M.value,
                onClick: _
              }, [i["track-true"] && f("div", {
                key: "prepend",
                class: "v-switch__track-true"
              }, [i["track-true"](E)]), i["track-false"] && f("div", {
                key: "append",
                class: "v-switch__track-false"
              }, [i["track-false"](E)])]);
            },
            input: (w) => {
              let {
                inputNode: A,
                icon: M,
                backgroundColorClasses: ee,
                backgroundColorStyles: oe
              } = w;
              return f(fe, null, [A, f("div", {
                class: ["v-switch__thumb", {
                  "v-switch__thumb--filled": M || e.loading
                }, e.inset || u ? void 0 : ee.value],
                style: e.inset ? void 0 : oe.value
              }, [i.thumb ? f(mt, {
                defaults: {
                  VIcon: {
                    icon: M,
                    size: "x-small"
                  }
                }
              }, {
                default: () => [i.thumb({
                  ...E,
                  icon: M
                })]
              }) : f(Uf, null, {
                default: () => [e.loading ? f(Ka, {
                  name: "v-switch",
                  active: !0,
                  color: $.value === !1 ? void 0 : m.value
                }, {
                  default: (ne) => i.loader ? i.loader(ne) : f(Jr, {
                    active: ne.isActive,
                    color: ne.color,
                    indeterminate: !0,
                    size: "16",
                    width: "2"
                  }, null)
                }) : M && f(Ve, {
                  key: String(M),
                  icon: M,
                  size: "x-small"
                }, null)]
              })])]);
            }
          });
        }
      });
    }), {};
  }
}), x0 = {
  name: "ReaderSettings",
  emits: ["update", "open-themes"],
  computed: {
    // 设置面板里的 4 个快捷图标（纯色主题）
    quick_themes: function() {
      return this.themes.filter((e) => e.type === "solid");
    }
  },
  mounted: function() {
    var e, t, n, i, o, r, s, a, l, c, d;
    this.opt = {
      flow: ((e = this.settings) == null ? void 0 : e.flow) || this.opt.flow,
      theme: ((t = this.settings) == null ? void 0 : t.theme) || this.opt.theme,
      theme_mode: ((n = this.settings) == null ? void 0 : n.theme_mode) || this.opt.theme_mode,
      font_size: ((i = this.settings) == null ? void 0 : i.font_size) || this.opt.font_size,
      line_height: ((o = this.settings) == null ? void 0 : o.line_height) || this.opt.line_height,
      letter_spacing: ((r = this.settings) == null ? void 0 : r.letter_spacing) || this.opt.letter_spacing,
      brightness: ((s = this.settings) == null ? void 0 : s.brightness) || this.opt.brightness,
      show_comments: ((a = this.settings) == null ? void 0 : a.show_comments) ?? this.opt.show_comments,
      show_selection_toolbar: ((l = this.settings) == null ? void 0 : l.show_selection_toolbar) ?? this.opt.show_selection_toolbar,
      paging_control: ((c = this.settings) == null ? void 0 : c.paging_control) || this.opt.paging_control,
      wheel_paging: ((d = this.settings) == null ? void 0 : d.wheel_paging) ?? this.opt.wheel_paging
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
      show_selection_toolbar: !0,
      paging_control: "mouse_and_keyboard",
      wheel_paging: !0
    },
    switch_options: [
      { key: "wheel_paging", label: "使用鼠标滚轮翻页" },
      { key: "show_comments", label: "显示全部划线和评论" },
      { key: "show_selection_toolbar", label: "选中文字后显示工具栏" }
    ],
    themes: Rn
  })
}, N0 = { class: "d-inline-blockx text-center" }, V0 = { class: "d-inline-blockx text-center" }, O0 = { class: "d-inline-blockx text-center" }, T0 = { class: "setting-switch-row" }, A0 = ["id", "for"];
function D0(e, t, n, i, o, r) {
  return X(), Ke(Cm, {
    class: "reader-settings",
    density: "compact"
  }, {
    default: T(() => [
      f(wt, { class: "my-2" }, {
        default: T(() => [
          f(oi, { class: "align-center" }, {
            default: T(() => [
              f(qe, { cols: "2" }, {
                default: T(() => t[16] || (t[16] = [
                  R("span", null, "亮度", -1)
                ])),
                _: 1
              }),
              f(qe, { cols: "9" }, {
                default: T(() => [
                  f(S0, {
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
      f(wt, { class: "my-2" }, {
        default: T(() => [
          f(oi, { class: "align-center gx-3" }, {
            default: T(() => [
              f(qe, { cols: "2" }, {
                default: T(() => t[17] || (t[17] = [
                  R("span", { class: "text-justify" }, "字体", -1)
                ])),
                _: 1
              }),
              f(qe, { cols: "2" }, {
                default: T(() => [
                  f(Ce, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[2] || (t[2] = (s) => r.set_and_emit("font_size", e.opt.font_size - 2))
                  }, {
                    default: T(() => t[18] || (t[18] = [
                      te("A-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(qe, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: T(() => [
                  R("span", N0, _e(e.opt.font_size), 1)
                ]),
                _: 1
              }),
              f(qe, { cols: "3" }, {
                default: T(() => [
                  f(Ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[3] || (t[3] = (s) => r.set_and_emit("font_size", e.opt.font_size + 2))
                  }, {
                    default: T(() => t[19] || (t[19] = [
                      te("A+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(qe, { cols: "3" }, {
                default: T(() => [
                  f(Ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[4] || (t[4] = (s) => r.set_and_emit("font_size", 18))
                  }, {
                    default: T(() => t[20] || (t[20] = [
                      te("默认")
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
      f(wt, { class: "my-2" }, {
        default: T(() => [
          f(oi, { class: "align-center" }, {
            default: T(() => [
              f(qe, { cols: "2" }, {
                default: T(() => t[21] || (t[21] = [
                  R("span", null, "行距", -1)
                ])),
                _: 1
              }),
              f(qe, { cols: "2" }, {
                default: T(() => [
                  f(Ce, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[5] || (t[5] = (s) => r.set_and_emit("line_height", e.opt.line_height - 0.1))
                  }, {
                    default: T(() => t[22] || (t[22] = [
                      te("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(qe, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: T(() => [
                  R("span", V0, _e(e.opt.line_height.toFixed(1)), 1)
                ]),
                _: 1
              }),
              f(qe, { cols: "3" }, {
                default: T(() => [
                  f(Ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[6] || (t[6] = (s) => r.set_and_emit("line_height", e.opt.line_height + 0.1))
                  }, {
                    default: T(() => t[23] || (t[23] = [
                      te("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(qe, { cols: "3" }, {
                default: T(() => [
                  f(Ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[7] || (t[7] = (s) => r.set_and_emit("line_height", 1.5))
                  }, {
                    default: T(() => t[24] || (t[24] = [
                      te("默认")
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
      f(wt, { class: "my-2" }, {
        default: T(() => [
          f(oi, { class: "align-center" }, {
            default: T(() => [
              f(qe, { cols: "2" }, {
                default: T(() => t[25] || (t[25] = [
                  R("span", null, "间距", -1)
                ])),
                _: 1
              }),
              f(qe, { cols: "2" }, {
                default: T(() => [
                  f(Ce, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[8] || (t[8] = (s) => r.set_and_emit("letter_spacing", e.opt.letter_spacing - 1))
                  }, {
                    default: T(() => t[26] || (t[26] = [
                      te("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(qe, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: T(() => [
                  R("span", O0, _e(e.opt.letter_spacing) + "px", 1)
                ]),
                _: 1
              }),
              f(qe, { cols: "3" }, {
                default: T(() => [
                  f(Ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[9] || (t[9] = (s) => r.set_and_emit("letter_spacing", e.opt.letter_spacing + 1))
                  }, {
                    default: T(() => t[27] || (t[27] = [
                      te("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(qe, { cols: "3" }, {
                default: T(() => [
                  f(Ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[10] || (t[10] = (s) => r.set_and_emit("letter_spacing", 0))
                  }, {
                    default: T(() => t[28] || (t[28] = [
                      te("默认")
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
      f(wt, { class: "my-2" }, {
        default: T(() => [
          f(oi, { class: "align-center" }, {
            default: T(() => [
              f(qe, { cols: "2" }, {
                default: T(() => t[29] || (t[29] = [
                  R("span", null, "翻页", -1)
                ])),
                _: 1
              }),
              f(qe, { cols: "10" }, {
                default: T(() => [
                  f(xr, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: T(() => [
                      f(Ce, {
                        active: e.opt.flow == "paginated",
                        onClick: t[11] || (t[11] = (s) => r.set_and_emit("flow", "paginated"))
                      }, {
                        default: T(() => t[30] || (t[30] = [
                          te("左右点击")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(Ce, {
                        active: e.opt.flow == "scrolled",
                        onClick: t[12] || (t[12] = (s) => r.set_and_emit("flow", "scrolled"))
                      }, {
                        default: T(() => t[31] || (t[31] = [
                          te("上下滑动")
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
      f(wt, { class: "my-2" }, {
        default: T(() => [
          f(oi, { class: "align-center" }, {
            default: T(() => [
              f(qe, { cols: "2" }, {
                default: T(() => t[32] || (t[32] = [
                  R("span", null, "控制", -1)
                ])),
                _: 1
              }),
              f(qe, { cols: "10" }, {
                default: T(() => [
                  f(xr, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: T(() => [
                      f(Ce, {
                        active: e.opt.paging_control == "mouse_and_keyboard",
                        onClick: t[13] || (t[13] = (s) => r.set_and_emit("paging_control", "mouse_and_keyboard"))
                      }, {
                        default: T(() => t[33] || (t[33] = [
                          te("鼠标+键盘")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(Ce, {
                        active: e.opt.paging_control == "keyboard_only",
                        onClick: t[14] || (t[14] = (s) => r.set_and_emit("paging_control", "keyboard_only"))
                      }, {
                        default: T(() => t[34] || (t[34] = [
                          te("仅键盘")
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
      (X(!0), ce(fe, null, At(e.switch_options, (s) => (X(), Ke(wt, {
        key: s.key,
        class: "my-2",
        "data-setting": s.key
      }, {
        default: T(() => [
          R("div", T0, [
            R("label", {
              class: "setting-switch-label",
              id: `setting-${s.key}`,
              for: `switch-${s.key}`
            }, _e(s.label), 9, A0),
            f(Om, {
              id: `switch-${s.key}`,
              class: "setting-switch",
              "model-value": e.opt[s.key],
              "aria-labelledby": `setting-${s.key}`,
              role: "switch",
              color: "primary",
              density: "comfortable",
              inset: "",
              "hide-details": "",
              "onUpdate:modelValue": (a) => r.set_and_emit(s.key, a)
            }, null, 8, ["id", "model-value", "aria-labelledby", "onUpdate:modelValue"])
          ])
        ]),
        _: 2
      }, 1032, ["data-setting"]))), 128)),
      f(wt, { class: "my-2" }, {
        default: T(() => [
          f(oi, {
            class: "align-center",
            "no-gutters": ""
          }, {
            default: T(() => [
              f(qe, { cols: "2" }, {
                default: T(() => t[35] || (t[35] = [
                  R("span", { density: "compact" }, "皮肤", -1)
                ])),
                _: 1
              }),
              (X(!0), ce(fe, null, At(r.quick_themes, (s) => (X(), Ke(qe, {
                key: s.id,
                class: "text-center"
              }, {
                default: T(() => [
                  f(Ce, {
                    active: e.opt.theme == s.id,
                    density: "compact",
                    icon: s.icon,
                    color: s.bg,
                    onClick: (a) => r.set_theme_and_emit(s.id, s.mode)
                  }, null, 8, ["active", "icon", "color", "onClick"])
                ]),
                _: 2
              }, 1024))), 128)),
              f(qe, {
                cols: "3",
                class: "text-right"
              }, {
                default: T(() => [
                  f(Ce, {
                    variant: "text",
                    density: "compact",
                    size: "small",
                    "append-icon": "mdi-chevron-right",
                    onClick: t[15] || (t[15] = (s) => e.$emit("open-themes"))
                  }, {
                    default: T(() => t[36] || (t[36] = [
                      te("更多")
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
const Tm = /* @__PURE__ */ Vn(x0, [["render", D0], ["__scopeId", "data-v-bcc696c5"]]), sa = "data-candle-audiobook-active", ul = "candle-audiobook", cl = "candle-audiobook-active";
function ji(e) {
  return String(e || "").replace(/\s+/g, "").trim();
}
function I0(e, t) {
  let n = 0, i = e.length - 1, o = -1;
  for (; n <= i; ) {
    const s = Math.floor((n + i) / 2);
    Number(e[s].start_ms) <= t ? (o = s, n = s + 1) : i = s - 1;
  }
  if (o < 0) return null;
  const r = e[o];
  return t < Number(r.end_ms) ? r : null;
}
function sc(e) {
  return decodeURIComponent(String(e || "").split(/[?#]/)[0]).replace(/^\.\//, "").replace(/^\//, "");
}
function aa(e, t) {
  const n = sc(e), i = sc(t);
  return !n || !i ? !1 : n === i || n.endsWith(`/${i}`) || i.endsWith(`/${n}`) || n.split("/").pop() === i.split("/").pop();
}
function Am(e) {
  var t, n, i, o;
  return ((t = e == null ? void 0 : e.section) == null ? void 0 : t.href) || ((n = e == null ? void 0 : e.section) == null ? void 0 : n.url) || ((o = (i = e == null ? void 0 : e.document) == null ? void 0 : i.location) == null ? void 0 : o.pathname) || "";
}
function Vs(e, t) {
  var r, s, a;
  const n = ((r = e == null ? void 0 : e.views) == null ? void 0 : r.call(e)) || [];
  let i = null;
  if ((s = n.forEach) == null || s.call(n, (l) => {
    var c, d;
    !i && aa(((c = l == null ? void 0 : l.section) == null ? void 0 : c.href) || ((d = l == null ? void 0 : l.section) == null ? void 0 : d.url), t) && (i = l);
  }), i != null && i.contents) return i.contents;
  const o = ((a = e == null ? void 0 : e.getContents) == null ? void 0 : a.call(e)) || [];
  return t ? o.find((l) => aa(Am(l), t)) || null : o[0] || null;
}
function P0(e, t) {
  return Array.from((e == null ? void 0 : e.children) || []).filter((n) => {
    var i;
    return ((i = n.localName) == null ? void 0 : i.toLowerCase()) === t;
  });
}
function $0(e, t) {
  const n = String(t || "").replace(/^\/+/, "").split("/").filter(Boolean);
  if (!n.length) return null;
  let i = e.documentElement;
  for (const o of n) {
    const r = o.match(/^([\w-]+)(?:\[(\d+)\])?$/);
    if (!r) return null;
    const s = r[1].toLowerCase(), a = Math.max(0, Number(r[2] || 1) - 1);
    if (s === "html") {
      i = e.documentElement;
      continue;
    }
    if (s === "body") {
      i = e.body;
      continue;
    }
    if (i = P0(i, s)[a], !i) return null;
  }
  return i;
}
function M0(e, t) {
  const n = ji(t);
  if (!n) return null;
  const i = e.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, div");
  return Array.from(i).find((o) => {
    const r = ji(o.textContent);
    return r === n || r.includes(n) || n.includes(r);
  }) || null;
}
function L0(e, t) {
  const n = e == null ? void 0 : e.document, i = (t == null ? void 0 : t.locator) || {};
  if (!n) return null;
  let o = i.element_id ? n.getElementById(i.element_id) : null;
  return !o && i.dom_path && (o = $0(n, i.dom_path)), o || (o = M0(n, t.text)), o ? { document: n, element: o, locator: i } : null;
}
function F0(e) {
  const t = [], n = e.ownerDocument.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  let i = n.nextNode();
  for (; i; )
    t.push(i), i = n.nextNode();
  return t;
}
function ac(e, t) {
  let n = Math.max(0, t);
  for (const o of e) {
    if (n <= o.data.length) return { node: o, offset: n };
    n -= o.data.length;
  }
  const i = e[e.length - 1];
  return i ? { node: i, offset: i.data.length } : null;
}
function B0(e, t, n) {
  const i = F0(e);
  if (!i.length) return null;
  const o = i.reduce((u, m) => u + m.data.length, 0), r = Math.min(o, Math.max(0, Number(t) || 0)), s = Number(n), a = Math.min(o, Number.isFinite(s) && s > r ? s : o), l = ac(i, r), c = ac(i, a);
  if (!l || !c) return null;
  const d = e.ownerDocument.createRange();
  return d.setStart(l.node, l.offset), d.setEnd(c.node, c.offset), d;
}
function R0(e) {
  if (e.getElementById("candle-audiobook-highlight-style")) return;
  const t = e.createElement("style");
  t.id = "candle-audiobook-highlight-style", t.textContent = `
    ::highlight(${ul}) {
      background: rgba(245, 166, 35, .34);
      text-decoration: underline 2px rgba(180, 92, 0, .75);
      text-underline-offset: .18em;
    }
    .${cl} {
      background: rgba(245, 166, 35, .2) !important;
      box-shadow: inset 3px 0 rgba(180, 92, 0, .72);
    }
  `, e.head.appendChild(t);
}
function Dm(e) {
  var n;
  (((n = e == null ? void 0 : e.getContents) == null ? void 0 : n.call(e)) || []).forEach((i) => {
    var r, s, a;
    const o = i.document;
    o && ((a = (s = (r = o.defaultView) == null ? void 0 : r.CSS) == null ? void 0 : s.highlights) == null || a.delete(ul), o.querySelectorAll(`[${sa}]`).forEach((l) => {
      l.removeAttribute(sa), l.classList.remove(cl);
    }));
  });
}
function H0(e, t, n) {
  var c, d;
  Dm(e);
  const i = L0(t, n);
  if (!i) return null;
  const { document: o, element: r, locator: s } = i;
  R0(o), r.setAttribute(sa, n.id || ""), r.classList.add(cl);
  const a = B0(r, s.start_char, s.end_char), l = o.defaultView;
  return a && ((c = l == null ? void 0 : l.CSS) != null && c.highlights) && l.Highlight && l.CSS.highlights.set(ul, new l.Highlight(a)), (d = r.scrollIntoView) == null || d.call(r, { block: "center", behavior: "smooth" }), { contents: t, document: o, element: r, range: a };
}
function j0(e, t) {
  return aa(e == null ? void 0 : e.source_key, t);
}
function z0(e, t) {
  var o;
  if (!e || !t) return !1;
  if ((o = e.locator) != null && o.element_id && e.locator.element_id === t.id) return !0;
  const n = ji(e.text), i = ji(t.textContent);
  return !!(n && i && (i.includes(n) || n.includes(i)));
}
const U0 = {
  key: 0,
  class: "audiobook-player",
  "data-testid": "candle-audiobook-player",
  "aria-label": "边听边读播放器"
}, W0 = { class: "player-heading" }, q0 = {
  key: 0,
  class: "player-error",
  role: "alert"
}, K0 = { class: "player-controls" }, G0 = ["disabled"], Y0 = ["aria-label", "disabled"], X0 = ["disabled"], J0 = { class: "time" }, Z0 = ["max", "value"], Q0 = { class: "time" }, e1 = { class: "rate-control" }, t1 = ["value"], n1 = 50, i1 = 100, o1 = 40, r1 = {
  __name: "AudiobookPlayer",
  props: {
    visible: { type: Boolean, default: !1 },
    // 宿主回调的包装（src/audiobook.js）
    repository: { type: Object, required: !0 },
    // 本机记住收听位置用的键，通常是书的 id
    storageId: { type: [Number, String], default: "" },
    rendition: { type: Object, default: null }
  },
  emits: ["close", "segment-change"],
  setup(e, { expose: t, emit: n }) {
    const i = e, o = n, r = se(null), s = se(null), a = se(null), l = se([]), c = se(null), d = se(!1), u = se(!1), m = se(""), g = se(0), h = se(0), v = se(1), _ = se(!0), k = se(""), O = se(0), P = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];
    let B = null, C = null, V = null, F = "", x = 0, N = 0;
    const $ = y(() => {
      var D;
      return ((D = s.value) == null ? void 0 : D.chapters) || [];
    }), E = y(() => $.value.findIndex((D) => {
      var L;
      return D.id === ((L = a.value) == null ? void 0 : L.id);
    })), w = y(() => `candle:audiobook:${i.storageId || "manifest"}`);
    be(
      () => [i.visible, i.repository],
      ([D]) => {
        D && A();
      },
      { immediate: !0 }
    ), be(
      () => i.rendition,
      (D, L) => {
        var re, me;
        (re = L == null ? void 0 : L.off) == null || re.call(L, "rendered", Tn), (me = D == null ? void 0 : D.on) == null || me.call(D, "rendered", Tn);
      },
      { immediate: !0 }
    );
    function A() {
      return s.value || !i.repository ? Promise.resolve() : V || (V = M().finally(() => {
        V = null;
      }), V);
    }
    async function M() {
      var D, L;
      u.value = !0, m.value = "";
      try {
        const re = await i.repository.manifest();
        s.value = re.manifest, O.value = ((D = re.progress) == null ? void 0 : D.version) || 0;
        const me = K(), ie = $.value.find((Fe) => {
          var et;
          return Fe.id === ((et = re.progress) == null ? void 0 : et.chapter_id);
        }) || $.value.find((Fe) => Fe.number === me.chapterNumber) || $.value[0], Ae = ((L = re.progress) == null ? void 0 : L.position_ms) ?? me.positionMs ?? 0;
        v.value = me.rate || 1, await oe(ie, { startMs: Ae, autoplay: !1, navigate: !1 });
      } catch (re) {
        m.value = (re == null ? void 0 : re.message) || "有声书加载失败";
      } finally {
        u.value = !1;
      }
    }
    async function ee(D) {
      try {
        l.value = await i.repository.timeline({ manifest_id: s.value.id, chapter: D });
      } catch (L) {
        console.warn("有声书时间轴加载失败：", L), l.value = [];
      }
    }
    async function oe(D, { startMs: L = 0, autoplay: re = !1, navigate: me = !0 } = {}) {
      if (D) {
        u.value = !0, m.value = "", hn();
        try {
          a.value = D, g.value = Math.max(0, Number(L) || 0), h.value = Number(D.duration_ms) || 0, await ee(D), me && _.value && await ne(D), await ft();
          const ie = r.value;
          if (!ie) return;
          const Ae = new URL(D.audio_url, window.location.href).href;
          ie.src !== Ae && (ie.src = D.audio_url, ie.load()), await de(ie), ie.playbackRate = v.value, ie.currentTime = Math.min(g.value / 1e3, ie.duration || 1 / 0), z(), We(!0), re && await Se();
        } catch (ie) {
          m.value = (ie == null ? void 0 : ie.message) || "章节音频加载失败";
        } finally {
          u.value = !1;
        }
      }
    }
    async function ne(D) {
      !i.rendition || !(D != null && D.source_key) || await i.rendition.display(D.source_key);
    }
    async function G() {
      if (!(k.value || !s.value))
        try {
          k.value = await i.repository.startSession({ manifest_id: s.value.id, source: "candle", device_id: "candle-reader" });
        } catch (D) {
          console.warn("有声书收听会话创建失败：", D);
        }
    }
    async function Se() {
      const D = r.value;
      if (D) {
        await G(), D.playbackRate = v.value;
        try {
          await D.play();
        } catch (L) {
          m.value = (L == null ? void 0 : L.name) === "NotAllowedError" ? "请再次点击播放" : "无法播放章节音频";
        }
      }
    }
    async function xe() {
      s.value || await A();
      const D = r.value;
      !D || !a.value || (D.paused ? await Se() : D.pause());
    }
    function we() {
      const D = r.value;
      D && (h.value = Number.isFinite(D.duration) ? Math.round(D.duration * 1e3) : h.value);
    }
    function de(D) {
      return D.readyState >= HTMLMediaElement.HAVE_METADATA ? Promise.resolve() : new Promise((L, re) => {
        const me = () => {
          Ae(), L();
        }, ie = () => {
          Ae(), re(new Error("章节音频元数据加载失败"));
        }, Ae = () => {
          D.removeEventListener("loadedmetadata", me), D.removeEventListener("error", ie);
        };
        D.addEventListener("loadedmetadata", me), D.addEventListener("error", ie);
      });
    }
    function Te() {
      d.value = !0, N = Date.now(), We(!0), ye(), ge();
    }
    function Je() {
      d.value = !1, De(), lt(), q(!0), z();
    }
    async function Ge() {
      d.value = !1, De(), await q(!0, E.value === $.value.length - 1), E.value < $.value.length - 1 && await oe($.value[E.value + 1], { autoplay: !0 });
    }
    function Z() {
      var D;
      (D = r.value) != null && D.src && (m.value = "章节音频加载失败", d.value = !1, De());
    }
    function ye() {
      De(), B = window.setInterval(lt, 150), C = window.setInterval(() => void q(), 1e4);
    }
    function De() {
      B && window.clearInterval(B), C && window.clearInterval(C), B = null, C = null;
    }
    function lt() {
      const D = r.value;
      D && (g.value = Math.round(D.currentTime * 1e3), We(), z());
    }
    function We(D = !1) {
      const L = I0(l.value, g.value), re = (L == null ? void 0 : L.id) || "";
      if (!(!D && re === F)) {
        if (F = re, c.value = L, o("segment-change", L), !L || !_.value || !d.value) {
          hn();
          return;
        }
        Wt(L);
      }
    }
    async function Wt(D) {
      var Ae, Fe;
      const L = ++x, me = (D.locator || {}).href || ((Ae = a.value) == null ? void 0 : Ae.source_key);
      let ie = Vs(i.rendition, me);
      !ie && i.rendition && _.value && await i.rendition.display(me);
      for (let et = 0; et < o1; et += 1) {
        if (L !== x || !_.value) return;
        if (ie = Vs(i.rendition, me), ie && H0(i.rendition, ie, D)) {
          if (await new Promise((Zn) => window.setTimeout(Zn, i1)), L !== x || !_.value) return;
          const Ye = Vs(i.rendition, me), Lt = (Fe = Ye == null ? void 0 : Ye.document) == null ? void 0 : Fe.querySelector("[data-candle-audiobook-active]");
          if ((Lt == null ? void 0 : Lt.getAttribute("data-candle-audiobook-active")) === D.id) return;
        }
        await new Promise((Ye) => window.setTimeout(Ye, n1));
      }
      L === x && _.value && console.warn("[candle-audiobook] 无法定位时间轴片段", D.id);
    }
    function Tn() {
      c.value && _.value && d.value && Wt(c.value);
    }
    function hn() {
      x += 1, Dm(i.rendition);
    }
    function p() {
      !a.value || !c.value || (_.value = !1, hn());
    }
    async function b() {
      _.value = !0, c.value && await Wt(c.value);
    }
    function I(D) {
      const L = r.value;
      g.value = Math.max(0, Math.min(h.value, D)), L && (L.currentTime = g.value / 1e3), We(!0), z();
    }
    function U() {
      r.value && (r.value.playbackRate = v.value), z();
    }
    async function H() {
      E.value > 0 && await oe($.value[E.value - 1], { autoplay: d.value });
    }
    async function j() {
      E.value < $.value.length - 1 && await oe($.value[E.value + 1], { autoplay: d.value });
    }
    async function Y(D) {
      var Lt, Zn, ut, yt, Wi, Po, dl, fl, ml;
      if (s.value || await A(), !s.value || !D) return !1;
      _.value = !0;
      const L = ((Lt = D.toc) == null ? void 0 : Lt.href) || ((Zn = D.toc) == null ? void 0 : Zn.id) || Am(D.contents), re = $.value.find((Qn) => j0(Qn, L)) || a.value || $.value[0];
      (re == null ? void 0 : re.id) !== ((ut = a.value) == null ? void 0 : ut.id) && await oe(re, { navigate: !1 });
      const me = ((Wi = (yt = D.cfi) == null ? void 0 : yt.toString) == null ? void 0 : Wi.call(yt)) || D.cfi, ie = me && ((dl = (Po = i.rendition) == null ? void 0 : Po.getRange) == null ? void 0 : dl.call(Po, me)), Ae = ((fl = ie == null ? void 0 : ie.startContainer) == null ? void 0 : fl.nodeType) === Node.TEXT_NODE ? ie.startContainer.parentElement : ie == null ? void 0 : ie.startContainer, Fe = ((ml = Ae == null ? void 0 : Ae.closest) == null ? void 0 : ml.call(Ae, "p, h1, h2, h3, h4, h5, h6, li, blockquote")) || null, et = ji(Fe == null ? void 0 : Fe.textContent), Ye = et && l.value.find((Qn) => ji(Qn.text) === et) || Fe && l.value.find((Qn) => z0(Qn, Fe)) || l.value.find((Qn) => Number(Qn.index) === Number(D.segment_id));
      return Ye ? (await oe(re, { startMs: Ye.start_ms, autoplay: !0, navigate: !0 }), !0) : !1;
    }
    async function q(D = !1, L = !1) {
      var ie;
      if (!k.value || !a.value) return;
      const re = Date.now(), me = d.value && N ? Math.min(6e4, Math.max(0, re - N)) : 0;
      if (!(!D && me < 9e3)) {
        N = re;
        try {
          const Ae = await i.repository.reportProgress({
            session_id: k.value,
            chapter_id: a.value.id,
            position_ms: g.value,
            segment_id: ((ie = c.value) == null ? void 0 : ie.id) || "",
            listened_delta_ms: me,
            completed: L,
            version: O.value
          });
          Ae && (O.value = Ae);
        } catch (Ae) {
          console.warn("有声书收听进度上报失败：", Ae);
        }
      }
    }
    function K() {
      try {
        return JSON.parse(localStorage.getItem(w.value) || "{}");
      } catch {
        return {};
      }
    }
    function z() {
      a.value && localStorage.setItem(w.value, JSON.stringify({
        chapterNumber: a.value.number,
        positionMs: g.value,
        rate: v.value
      }));
    }
    function ge() {
      !("mediaSession" in navigator) || !a.value || (navigator.mediaSession.metadata = new MediaMetadata({ title: a.value.title, album: "边听边读" }), navigator.mediaSession.setActionHandler("play", Se), navigator.mediaSession.setActionHandler("pause", () => {
        var D;
        return (D = r.value) == null ? void 0 : D.pause();
      }), navigator.mediaSession.setActionHandler("previoustrack", H), navigator.mediaSession.setActionHandler("nexttrack", j));
    }
    function Q(D) {
      const L = Math.max(0, Math.floor((D || 0) / 1e3));
      return `${Math.floor(L / 60)}:${String(L % 60).padStart(2, "0")}`;
    }
    return gt(() => {
      var D, L;
      De(), (L = (D = i.rendition) == null ? void 0 : D.off) == null || L.call(D, "rendered", Tn), hn(), k.value && i.repository.endSession({ session_id: k.value }).catch((re) => console.warn("有声书收听会话结束失败：", re));
    }), t({ loadManifest: A, playFromSelection: Y, returnToNarration: b, suspendFollow: p }), (D, L) => {
      var re, me;
      return e.visible ? (X(), ce("section", U0, [
        R("header", W0, [
          R("div", null, [
            L[3] || (L[3] = R("span", { class: "player-kicker" }, "边听边读", -1)),
            R("strong", null, _e(((re = a.value) == null ? void 0 : re.title) || "正在载入有声书"), 1)
          ]),
          R("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "关闭听书播放器",
            onClick: L[0] || (L[0] = (ie) => o("close"))
          }, [
            f(Ve, { size: "20" }, {
              default: T(() => L[4] || (L[4] = [
                te("mdi-close")
              ])),
              _: 1
            })
          ])
        ]),
        R("p", {
          class: Vt(["active-dialogue", { muted: !c.value }])
        }, _e(((me = c.value) == null ? void 0 : me.text) || (u.value ? "正在加载章节时间轴…" : "片段间留白")), 3),
        m.value ? (X(), ce("div", q0, _e(m.value), 1)) : Re("", !0),
        R("div", K0, [
          R("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "上一章",
            disabled: E.value <= 0,
            onClick: H
          }, [
            f(Ve, null, {
              default: T(() => L[5] || (L[5] = [
                te("mdi-skip-previous")
              ])),
              _: 1
            })
          ], 8, G0),
          R("button", {
            type: "button",
            class: "play-button",
            "aria-label": d.value ? "暂停听书" : "播放听书",
            disabled: u.value || !a.value,
            onClick: xe
          }, [
            f(Ve, null, {
              default: T(() => [
                te(_e(d.value ? "mdi-pause" : "mdi-play"), 1)
              ]),
              _: 1
            })
          ], 8, Y0),
          R("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "下一章",
            disabled: E.value >= $.value.length - 1,
            onClick: j
          }, [
            f(Ve, null, {
              default: T(() => L[6] || (L[6] = [
                te("mdi-skip-next")
              ])),
              _: 1
            })
          ], 8, X0),
          R("span", J0, _e(Q(g.value)), 1),
          R("input", {
            class: "timeline-slider",
            type: "range",
            min: "0",
            max: Math.max(h.value, 1),
            step: "100",
            value: g.value,
            "aria-label": "听书进度",
            onInput: L[1] || (L[1] = (ie) => I(Number(ie.target.value)))
          }, null, 40, Z0),
          R("span", Q0, _e(Q(h.value)), 1),
          R("label", e1, [
            L[7] || (L[7] = R("span", { class: "sr-only" }, "播放速度", -1)),
            vt(R("select", {
              "onUpdate:modelValue": L[2] || (L[2] = (ie) => v.value = ie),
              "aria-label": "播放速度",
              onChange: U
            }, [
              (X(), ce(fe, null, At(P, (ie) => R("option", {
                key: ie,
                value: ie
              }, "x" + _e(ie), 9, t1)), 64))
            ], 544), [
              [
                zg,
                v.value,
                void 0,
                { number: !0 }
              ]
            ])
          ])
        ]),
        _.value ? Re("", !0) : (X(), ce("button", {
          key: 1,
          type: "button",
          class: "return-button",
          "data-testid": "return-to-narration",
          onClick: b
        }, [
          f(Ve, { size: "18" }, {
            default: T(() => L[8] || (L[8] = [
              te("mdi-target")
            ])),
            _: 1
          }),
          L[9] || (L[9] = te(" 回到朗读位置 "))
        ])),
        R("audio", {
          ref_key: "audioElement",
          ref: r,
          preload: "metadata",
          onLoadedmetadata: we,
          onPlay: Te,
          onPause: Je,
          onEnded: Ge,
          onError: Z
        }, null, 544)
      ])) : Re("", !0);
    };
  }
}, Im = /* @__PURE__ */ Vn(r1, [["__scopeId", "data-v-3a739039"]]);
function s1(e = {}) {
  const t = e.show_comments ?? !0, n = e.show_annotations ?? !0, i = e.notes_enabled ?? !0;
  return {
    notes_settings_version: 3,
    show_comments: i && t,
    show_selection_toolbar: i && (e.show_selection_toolbar ?? n)
  };
}
const a1 = ["manifest", "timeline"];
function l1({ callbacks: e, bookId: t, bookUrl: n } = {}) {
  if (!e) return null;
  if (a1.some((s) => typeof e[s] != "function"))
    throw new Error("audiobook_callbacks 必须同时提供 manifest 和 timeline 函数");
  const i = { book_id: t || null, book_url: n || "" }, o = (s, a = {}) => e[s]({ ...i, ...a }), r = (s) => typeof e[s] == "function";
  return {
    // → { manifest: { id, chapters: [...] }, progress: { chapter_id, position_ms, version } | null }
    async manifest() {
      var l;
      const s = await o("manifest"), a = s == null ? void 0 : s.manifest;
      if (!((l = a == null ? void 0 : a.chapters) != null && l.length)) throw new Error("当前书籍没有可播放章节");
      return { manifest: a, progress: s.progress || null };
    },
    // → 时间轴片段数组；宿主可以返回数组、{ segments } 或 { timeline: { segments } }
    async timeline(s) {
      var c;
      const a = await o("timeline", s), l = Array.isArray(a) ? a : (a == null ? void 0 : a.segments) || ((c = a == null ? void 0 : a.timeline) == null ? void 0 : c.segments);
      return Array.isArray(l) ? l : [];
    },
    // 收听进度三个回调都是可选的；宿主不提供时只在本机记住位置。
    async startSession(s) {
      if (!r("start_session")) return "";
      const a = await o("start_session", s);
      return String((a == null ? void 0 : a.session_id) || "");
    },
    async reportProgress(s) {
      if (!r("report_progress")) return null;
      const a = await o("report_progress", s);
      return (a == null ? void 0 : a.version) ?? null;
    },
    async endSession(s) {
      r("end_session") && await o("end_session", s);
    }
  };
}
const u1 = J({
  ...Ne(),
  ...Zy({
    fullHeight: !0
  }),
  ...at()
}, "VApp"), c1 = ve()({
  name: "VApp",
  props: u1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = pt(e), {
      layoutClasses: o,
      getLayoutItem: r,
      items: s,
      layoutRef: a
    } = e_(e), {
      rtlClasses: l
    } = fn();
    return Ee(() => {
      var c;
      return f("div", {
        ref: a,
        class: ["v-application", i.themeClasses.value, o.value, l.value, e.class],
        style: [e.style]
      }, [f("div", {
        class: "v-application__wrap"
      }, [(c = n.default) == null ? void 0 : c.call(n)])]);
    }), {
      getLayoutItem: r,
      items: s,
      theme: i
    };
  }
}), d1 = J({
  text: String,
  ...Ne(),
  ...it()
}, "VToolbarTitle"), f1 = ve()({
  name: "VToolbarTitle",
  props: d1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => {
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
}), m1 = [null, "prominent", "default", "comfortable", "compact"], Pm = J({
  absolute: Boolean,
  collapse: Boolean,
  color: String,
  density: {
    type: String,
    default: "default",
    validator: (e) => m1.includes(e)
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
  ...qn(),
  ...Ne(),
  ...Gn(),
  ...Pt(),
  ...it({
    tag: "header"
  }),
  ...at()
}, "VToolbar"), lc = ve()({
  name: "VToolbar",
  props: Pm(),
  setup(e, t) {
    var g;
    let {
      slots: n
    } = t;
    const {
      backgroundColorClasses: i,
      backgroundColorStyles: o
    } = jt(le(e, "color")), {
      borderClasses: r
    } = Kn(e), {
      elevationClasses: s
    } = Yn(e), {
      roundedClasses: a
    } = $t(e), {
      themeClasses: l
    } = pt(e), {
      rtlClasses: c
    } = fn(), d = ke(!!(e.extended || (g = n.extension) != null && g.call(n))), u = y(() => parseInt(Number(e.height) + (e.density === "prominent" ? Number(e.height) : 0) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0), 10)), m = y(() => d.value ? parseInt(Number(e.extensionHeight) + (e.density === "prominent" ? Number(e.extensionHeight) : 0) - (e.density === "comfortable" ? 4 : 0) - (e.density === "compact" ? 8 : 0), 10) : 0);
    return Ci({
      VBtn: {
        variant: "text"
      }
    }), Ee(() => {
      var k;
      const h = !!(e.title || n.title), v = !!(n.image || e.image), _ = (k = n.extension) == null ? void 0 : k.call(n);
      return d.value = !!(e.extended || _), f(e.tag, {
        class: ["v-toolbar", {
          "v-toolbar--absolute": e.absolute,
          "v-toolbar--collapse": e.collapse,
          "v-toolbar--flat": e.flat,
          "v-toolbar--floating": e.floating,
          [`v-toolbar--density-${e.density}`]: !0
        }, i.value, r.value, s.value, a.value, l.value, c.value, e.class],
        style: [o.value, e.style]
      }, {
        default: () => [v && f("div", {
          key: "image",
          class: "v-toolbar__image"
        }, [n.image ? f(mt, {
          key: "image-defaults",
          disabled: !e.image,
          defaults: {
            VImg: {
              cover: !0,
              src: e.image
            }
          }
        }, n.image) : f(Za, {
          key: "image-img",
          cover: !0,
          src: e.image
        }, null)]), f(mt, {
          defaults: {
            VTabs: {
              height: he(u.value)
            }
          }
        }, {
          default: () => {
            var O, P, B;
            return [f("div", {
              class: "v-toolbar__content",
              style: {
                height: he(u.value)
              }
            }, [n.prepend && f("div", {
              class: "v-toolbar__prepend"
            }, [(O = n.prepend) == null ? void 0 : O.call(n)]), h && f(f1, {
              key: "title",
              text: e.title
            }, {
              text: n.title
            }), (P = n.default) == null ? void 0 : P.call(n), n.append && f("div", {
              class: "v-toolbar__append"
            }, [(B = n.append) == null ? void 0 : B.call(n)])])];
          }
        }), f(mt, {
          defaults: {
            VTabs: {
              height: he(m.value)
            }
          }
        }, {
          default: () => [f(qf, null, {
            default: () => [d.value && f("div", {
              class: "v-toolbar__extension",
              style: {
                height: he(m.value)
              }
            }, [_])]
          })]
        })]
      });
    }), {
      contentHeight: u,
      extensionHeight: m
    };
  }
}), h1 = J({
  scrollTarget: {
    type: String
  },
  scrollThreshold: {
    type: [String, Number],
    default: 300
  }
}, "scroll");
function v1(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const {
    canScroll: n
  } = t;
  let i = 0, o = 0;
  const r = se(null), s = ke(0), a = ke(0), l = ke(0), c = ke(!1), d = ke(!1), u = y(() => Number(e.scrollThreshold)), m = y(() => kn((u.value - s.value) / u.value || 0)), g = () => {
    const h = r.value;
    if (!h || n && !n.value) return;
    i = s.value, s.value = "window" in h ? h.pageYOffset : h.scrollTop;
    const v = h instanceof Window ? document.documentElement.scrollHeight : h.scrollHeight;
    if (o !== v) {
      o = v;
      return;
    }
    d.value = s.value < i, l.value = Math.abs(s.value - u.value);
  };
  return be(d, () => {
    a.value = a.value || s.value;
  }), be(c, () => {
    a.value = 0;
  }), cn(() => {
    be(() => e.scrollTarget, (h) => {
      var _;
      const v = h ? document.querySelector(h) : window;
      if (!v) {
        Bn(`Unable to locate element with identifier ${h}`);
        return;
      }
      v !== r.value && ((_ = r.value) == null || _.removeEventListener("scroll", g), r.value = v, r.value.addEventListener("scroll", g, {
        passive: !0
      }));
    }, {
      immediate: !0
    });
  }), gt(() => {
    var h;
    (h = r.value) == null || h.removeEventListener("scroll", g);
  }), n && be(n, g, {
    immediate: !0
  }), {
    scrollThreshold: u,
    currentScroll: s,
    currentThreshold: l,
    isScrollActive: c,
    scrollRatio: m,
    // required only for testing
    // probably can be removed
    // later (2 chars chlng)
    isScrollingUp: d,
    savedScroll: a
  };
}
const g1 = J({
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
  ...Pm(),
  ..._f(),
  ...h1(),
  height: {
    type: [Number, String],
    default: 64
  }
}, "VAppBar"), p1 = ve()({
  name: "VAppBar",
  props: g1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = se(), o = nt(e, "modelValue"), r = y(() => {
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
      currentScroll: a,
      scrollThreshold: l,
      isScrollingUp: c,
      scrollRatio: d
    } = v1(e, {
      canScroll: s
    }), u = y(() => r.value.hide || r.value.fullyHide), m = y(() => e.collapse || r.value.collapse && (r.value.inverted ? d.value > 0 : d.value === 0)), g = y(() => e.flat || r.value.fullyHide && !o.value || r.value.elevate && (r.value.inverted ? a.value > 0 : a.value === 0)), h = y(() => r.value.fadeImage ? r.value.inverted ? 1 - d.value : d.value : void 0), v = y(() => {
      var B, C;
      if (r.value.hide && r.value.inverted) return 0;
      const O = ((B = i.value) == null ? void 0 : B.contentHeight) ?? 0, P = ((C = i.value) == null ? void 0 : C.extensionHeight) ?? 0;
      return u.value ? a.value < l.value || r.value.fullyHide ? O + P : O : O + P;
    });
    zn(y(() => !!e.scrollBehavior), () => {
      Jt(() => {
        u.value ? r.value.inverted ? o.value = a.value > l.value : o.value = c.value || a.value < l.value : o.value = !0;
      });
    });
    const {
      ssrBootStyles: _
    } = is(), {
      layoutItemStyles: k
    } = wf({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: le(e, "location"),
      layoutSize: v,
      elementSize: ke(void 0),
      active: o,
      absolute: le(e, "absolute")
    });
    return Ee(() => {
      const O = lc.filterProps(e);
      return f(lc, Oe({
        ref: i,
        class: ["v-app-bar", {
          "v-app-bar--bottom": e.location === "bottom"
        }, e.class],
        style: [{
          ...k.value,
          "--v-toolbar-image-opacity": h.value,
          height: void 0,
          ..._.value
        }, e.style]
      }, O, {
        collapse: m.value,
        flat: g.value
      }), n);
    }), {};
  }
}), y1 = J({
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
  ...qn(),
  ...Ne(),
  ...mn(),
  ...Gn(),
  ...Pt(),
  ..._f({
    name: "bottom-navigation"
  }),
  ...it({
    tag: "header"
  }),
  ...Ef({
    selectedClass: "v-btn--selected"
  }),
  ...at()
}, "VBottomNavigation"), _1 = ve()({
  name: "VBottomNavigation",
  props: y1(),
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
    } = Jy(), {
      borderClasses: o
    } = Kn(e), {
      backgroundColorClasses: r,
      backgroundColorStyles: s
    } = jt(le(e, "bgColor")), {
      densityClasses: a
    } = On(e), {
      elevationClasses: l
    } = Yn(e), {
      roundedClasses: c
    } = $t(e), {
      ssrBootStyles: d
    } = is(), u = y(() => Number(e.height) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0)), m = nt(e, "active", e.active), {
      layoutItemStyles: g
    } = wf({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: y(() => "bottom"),
      layoutSize: y(() => m.value ? u.value : 0),
      elementSize: u,
      active: m,
      absolute: le(e, "absolute")
    });
    return xf(e, Ua), Ci({
      VBtn: {
        baseColor: le(e, "baseColor"),
        color: le(e, "color"),
        density: le(e, "density"),
        stacked: y(() => e.mode !== "horizontal"),
        variant: "text"
      }
    }, {
      scoped: !0
    }), Ee(() => f(e.tag, {
      class: ["v-bottom-navigation", {
        "v-bottom-navigation--active": m.value,
        "v-bottom-navigation--grow": e.grow,
        "v-bottom-navigation--shift": e.mode === "shift"
      }, i.value, r.value, o.value, a.value, l.value, c.value, e.class],
      style: [s.value, g.value, {
        height: he(u.value)
      }, d.value, e.style]
    }, {
      default: () => [n.default && f("div", {
        class: "v-bottom-navigation__content"
      }, [n.default()])]
    })), {};
  }
}), b1 = J({
  inset: Boolean,
  ...Zf({
    transition: "bottom-sheet-transition"
  })
}, "VBottomSheet"), Uo = ve()({
  name: "VBottomSheet",
  props: b1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = nt(e, "modelValue");
    return Ee(() => {
      const o = Hn.filterProps(e);
      return f(Hn, Oe(o, {
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
}), w1 = J({
  scrollable: Boolean,
  ...Ne(),
  ...Xn(),
  ...it({
    tag: "main"
  })
}, "VMain"), S1 = ve()({
  name: "VMain",
  props: w1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      dimensionStyles: i
    } = Jn(e), {
      mainStyles: o
    } = bf(), {
      ssrBootStyles: r
    } = is();
    return Ee(() => f(e.tag, {
      class: ["v-main", {
        "v-main--scrollable": e.scrollable
      }, e.class],
      style: [o.value, r.value, i.value, e.style]
    }, {
      default: () => {
        var s, a;
        return [e.scrollable ? f("div", {
          class: "v-main__scroller"
        }, [(s = n.default) == null ? void 0 : s.call(n)]) : (a = n.default) == null ? void 0 : a.call(n)];
      }
    })), {};
  }
});
function k1(e) {
  const t = ke(e());
  let n = -1;
  function i() {
    clearInterval(n);
  }
  function o() {
    i(), ft(() => t.value = e());
  }
  function r(s) {
    const a = s ? getComputedStyle(s) : {
      transitionDuration: 0.2
    }, l = parseFloat(a.transitionDuration) * 1e3 || 200;
    if (i(), t.value <= 0) return;
    const c = performance.now();
    n = window.setInterval(() => {
      const d = performance.now() - c + l;
      t.value = Math.max(e() - d, 0), t.value <= 0 && i();
    }, l);
  }
  return It(i), {
    clear: i,
    time: t,
    start: r,
    reset: o
  };
}
const C1 = J({
  multiLine: Boolean,
  text: String,
  timer: [Boolean, String],
  timeout: {
    type: [Number, String],
    default: 5e3
  },
  vertical: Boolean,
  ...Zr({
    location: "bottom"
  }),
  ...Ga(),
  ...Pt(),
  ...Ei(),
  ...at(),
  ...Pa(el({
    transition: "v-snackbar-transition"
  }), ["persistent", "noClickAnimation", "scrim", "scrollStrategy"])
}, "VSnackbar"), E1 = ve()({
  name: "VSnackbar",
  props: C1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = nt(e, "modelValue"), {
      positionClasses: o
    } = Ya(e), {
      scopeId: r
    } = Qa(), {
      themeClasses: s
    } = pt(e), {
      colorClasses: a,
      colorStyles: l,
      variantClasses: c
    } = Do(e), {
      roundedClasses: d
    } = $t(e), u = k1(() => Number(e.timeout)), m = se(), g = se(), h = ke(!1), v = ke(0), _ = se(), k = He(po, void 0);
    zn(() => !!k, () => {
      const E = bf();
      Jt(() => {
        _.value = E.mainStyles.value;
      });
    }), be(i, P), be(() => e.timeout, P), cn(() => {
      i.value && P();
    });
    let O = -1;
    function P() {
      u.reset(), window.clearTimeout(O);
      const E = Number(e.timeout);
      if (!i.value || E === -1) return;
      const w = Wd(g.value);
      u.start(w), O = window.setTimeout(() => {
        i.value = !1;
      }, E);
    }
    function B() {
      u.reset(), window.clearTimeout(O);
    }
    function C() {
      h.value = !0, B();
    }
    function V() {
      h.value = !1, P();
    }
    function F(E) {
      v.value = E.touches[0].clientY;
    }
    function x(E) {
      Math.abs(v.value - E.changedTouches[0].clientY) > 50 && (i.value = !1);
    }
    function N() {
      h.value && V();
    }
    const $ = y(() => e.location.split(" ").reduce((E, w) => (E[`v-snackbar--${w}`] = !0, E), {}));
    return Ee(() => {
      const E = bo.filterProps(e), w = !!(n.default || n.text || e.text);
      return f(bo, Oe({
        ref: m,
        class: ["v-snackbar", {
          "v-snackbar--active": i.value,
          "v-snackbar--multi-line": e.multiLine && !e.vertical,
          "v-snackbar--timer": !!e.timer,
          "v-snackbar--vertical": e.vertical
        }, $.value, o.value, e.class],
        style: [_.value, e.style]
      }, E, {
        modelValue: i.value,
        "onUpdate:modelValue": (A) => i.value = A,
        contentProps: Oe({
          class: ["v-snackbar__wrapper", s.value, a.value, d.value, c.value],
          style: [l.value],
          onPointerenter: C,
          onPointerleave: V
        }, E.contentProps),
        persistent: !0,
        noClickAnimation: !0,
        scrim: !1,
        scrollStrategy: "none",
        _disableGlobalStack: !0,
        onTouchstartPassive: F,
        onTouchend: x,
        onAfterLeave: N
      }, r), {
        default: () => {
          var A, M;
          return [Ao(!1, "v-snackbar"), e.timer && !h.value && f("div", {
            key: "timer",
            class: "v-snackbar__timer"
          }, [f(Of, {
            ref: g,
            color: typeof e.timer == "string" ? e.timer : "info",
            max: e.timeout,
            "model-value": u.time.value
          }, null)]), w && f("div", {
            key: "content",
            class: "v-snackbar__content",
            role: "status",
            "aria-live": "polite"
          }, [((A = n.text) == null ? void 0 : A.call(n)) ?? e.text, (M = n.default) == null ? void 0 : M.call(n)]), n.actions && f(mt, {
            defaults: {
              VBtn: {
                variant: "text",
                ripple: !1,
                slim: !0
              }
            }
          }, {
            default: () => [f("div", {
              class: "v-snackbar__actions"
            }, [n.actions({
              isActive: i
            })])]
          })];
        },
        activator: n.activator
      });
    }), tl({}, m);
  }
}), uc = "candle-reader:comment-public", cc = "candle-reader:panel-widths", Os = 260, Wo = {
  toc: { side: "left", width: 300, label: "目录" },
  annotations: { side: "right", width: 420, label: "评论" },
  settings: { side: "right", width: 380, label: "设置" }
}, x1 = 6e4, N1 = {
  name: "EpubReader",
  components: {
    PanelResizer: kf,
    Settings: Tm,
    BookToc: Em,
    ReaderComments: mm,
    AudiobookPlayer: Im
  },
  props: {
    book_url: { type: String, required: !0 },
    display_url: { type: String, default: "" },
    debug: { type: Boolean, default: !1 },
    themes_css: { type: String, default: "theme.css" },
    initial_book_id: { type: [Number, String], default: null },
    annotation_callbacks: { type: Object, default: null },
    audiobook_callbacks: { type: Object, default: null }
  },
  computed: {
    // 「显示全部划线和评论」：正文里的划线标记与段尾评论气泡。
    comments_enabled: function() {
      return this.settings.show_comments;
    },
    // 宽屏下正在显示的侧边栏；手机上的底部抽屉没有宽度可调。
    side_panel: function() {
      const e = Wo[this.menu.current_panel];
      return this.is_wide_screen && e && this.menu.panels[this.menu.current_panel] ? { name: this.menu.current_panel, ...e } : null;
    },
    // 侧边栏最宽不超过 720px，并给正文至少留出 360px。
    panel_max_width: function() {
      return Math.max(Os, Math.min(720, this.window_width - 360));
    },
    comment_chapter: function() {
      var e;
      return String(((e = this.current_toc) == null ? void 0 : e.label) || this.current_toc_title || "").trim();
    },
    annotation_editor_title: function() {
      return this.annotation_editor_record ? "编辑评论" : this.annotation_editor_type === "book_comment" ? "写整书评论" : "写评论";
    },
    annotation_editor_quote: function() {
      var t;
      const e = this.annotation_editor_location;
      return e ? e.multi_paragraph ? e.quote_text : e.paragraph_quote_text : ((t = this.annotation_editor_record) == null ? void 0 : t.quote_text) || "";
    },
    has_audiobook: function() {
      return !!this.audiobook_repository;
    },
    switch_theme_icon: function() {
      return gn(this.settings.theme).mode === "day" ? "mdi-weather-night" : "mdi-weather-sunny";
    },
    switch_theme_text: function() {
      return gn(this.settings.theme).mode === "day" ? "夜晚" : "白天";
    },
    foot_color: function() {
      const e = gn(this.settings.theme);
      return e.bgBottom || e.bg;
    },
    status_bar_style: function() {
      const e = gn(this.settings.theme);
      return e.type !== "image" ? {} : { color: e.text, backgroundColor: "transparent" };
    },
    // 「更多主题」窗口按白天/夜晚分区
    theme_groups: function() {
      return [
        { mode: "day", label: "白天", items: Rn.filter((e) => e.mode === "day") },
        { mode: "night", label: "夜晚", items: Rn.filter((e) => e.mode === "night") }
      ];
    },
    totalChapters: function() {
      let e = 0;
      function t(n) {
        for (const i of n)
          e++, i.subitems && i.subitems.length > 0 && t(i.subitems);
      }
      return t(this.toc_items), e;
    },
    currentChapterIndex: function() {
      if (!this.current_toc) return 0;
      const e = [];
      function t(n) {
        for (const i of n)
          e.push(i), i.subitems && i.subitems.length > 0 && t(i.subitems);
      }
      t(this.toc_items);
      for (let n = 0; n < e.length; n++) {
        const i = e[n];
        if (i.id && this.current_toc.id && i.id === this.current_toc.id || i.href === this.current_toc.href && i.label === this.current_toc.label)
          return n + 1;
      }
      return 0;
    },
    readingProgress: function() {
      return this.totalChapters === 0 ? "0%" : `${Math.round(this.currentChapterIndex / this.totalChapters * 100)}%`;
    }
  },
  methods: {
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
        this.annotation_repository = cb({
          callbacks: this.annotation_callbacks,
          bookId: this.initial_book_id,
          bookUrl: this.book_url
        });
      } catch (e) {
        console.error("Candle Reader annotations could not be initialized:", e);
      }
      try {
        this.audiobook_repository = l1({
          callbacks: this.audiobook_callbacks,
          bookId: this.initial_book_id,
          bookUrl: this.book_url
        });
      } catch (e) {
        console.error("Candle Reader audiobook could not be initialized:", e);
      }
    },
    annotation_color: function(e) {
      return { blue: "#4f8fb8", green: "#54a675", pink: "#d97a9d", yellow: "#e6b91e" }[e == null ? void 0 : e.color] || (e == null ? void 0 : e.color) || ((e == null ? void 0 : e.annotation_type) === "note" ? "#4f8fb8" : "#e6b91e");
    },
    render_annotation: function(e) {
      if (!this.comments_enabled || !this.rendition || !(e != null && e.cfi) || e.annotation_type !== "highlight") return;
      const t = String(e.cfi);
      if (!(t && this.rendered_annotation_ids.has(t)))
        try {
          this.rendition.annotations.highlight(
            e.cfi,
            { annotationId: e.id || e.client_id },
            () => this.open_annotation_paragraph(e),
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
    load_user: async function() {
      var e;
      try {
        this.user = await ((e = this.annotation_repository) == null ? void 0 : e.user()) || null;
      } catch (t) {
        console.warn("Candle Reader current user could not be loaded:", t);
      }
    },
    // 游客触发写评论、划线、赞踩、回复时引导登录；登录流程由宿主负责。
    request_login: async function() {
      var e;
      this.show_annotation_feedback("请先登录后再操作");
      try {
        await ((e = this.annotation_repository) == null ? void 0 : e.login()), await this.load_user();
      } catch (t) {
        console.warn("Candle Reader login callback failed:", t);
      }
    },
    // 读取这些章节里自己的划线与评论，用于在正文绘制标记。一页可能横跨两章，所以按章节列表读取。
    load_chapter_annotations: async function(e) {
      if (e = [].concat(e).filter(Boolean), !e.length || !this.annotation_repository || !this.comments_enabled) return;
      const t = ++this.annotation_chapter_request;
      try {
        const n = await Promise.all(e.map((i) => this.annotation_repository.load({ chapter: i })));
        if (t !== this.annotation_chapter_request) return;
        n.flat().forEach(this.render_annotation);
      } catch (n) {
        console.warn("Candle Reader chapter annotations could not be loaded:", n);
      }
    },
    open_comments: function(e, t = null) {
      var n, i;
      this.comment_paragraph = t, this.hide_toolbar(), this.menu.current_panel !== "annotations" && this.set_menu("annotations"), (i = this.$refs.comments) == null || i.show(e, (t == null ? void 0 : t.paragraph_cfi) || "", String(((n = t == null ? void 0 : t.toc) == null ? void 0 : n.label) || "").trim());
    },
    // 点正文里的划线：打开划线所在段落的评论，而不是整章评论。
    open_annotation_paragraph: function(e) {
      var a, l, c;
      const t = String((e == null ? void 0 : e.cfi) || ""), n = (a = this.rendition) == null ? void 0 : a.getContents().find((d) => t.includes(d.cfiBase));
      let i = null;
      try {
        i = n == null ? void 0 : n.range(t);
      } catch {
        i = null;
      }
      if (!i) return this.open_comments("chapter");
      const o = String(e.chapter || "").trim(), r = ((l = this.visible_tocs.find((d) => {
        var u;
        return d.contents === n && String(((u = d.toc) == null ? void 0 : u.label) || "").trim() === o;
      })) == null ? void 0 : l.toc) || ((c = this.visible_tocs.find((d) => d.contents === n)) == null ? void 0 : c.toc) || this.current_toc, s = this.paragraph_of(i.endContainer, n);
      this.open_comments("paragraph", { toc: r, contents: n, ...this.paragraph_location(s, n) });
    },
    on_open_annotations: function() {
      if (this.menu.current_panel === "annotations") return this.set_menu("hide");
      this.open_comments("chapter");
    },
    on_view_selection_notes: function() {
      var e;
      (e = this.selected_location) != null && e.paragraph_cfi && this.open_comments("paragraph", this.selected_location);
    },
    show_annotation_feedback: function(e, t = !1) {
      this.annotation_feedback_message = e, this.annotation_feedback_error = t, this.annotation_feedback_visible = !0;
    },
    // 评论增删或公开范围变化后，同步正文中的标记与段尾气泡。
    on_comments_changed: function() {
      this.clear_annotation_marks(), this.load_chapter_annotations(this.visible_chapters()), this.refresh_comment_icons();
    },
    read_public_preference: function() {
      try {
        return localStorage.getItem(uc) !== "false";
      } catch {
        return !0;
      }
    },
    save_annotation: async function(e, t, n) {
      var a, l, c, d;
      if (!this.user)
        return this.request_login(), null;
      const i = e === "highlight" ? this.selected_location : this.annotation_editor_location, o = e === "note", r = o ? i == null ? void 0 : i.paragraph_cfi : i == null ? void 0 : i.cfi, s = o && !(i != null && i.multi_paragraph) ? i == null ? void 0 : i.paragraph_quote_text : i == null ? void 0 : i.quote_text;
      if (!r || !s || !this.annotation_repository || this.annotation_saving) return null;
      this.annotation_saving = !0;
      try {
        const u = await this.annotation_repository.save({
          client_id: i.client_id || Ii(),
          annotation_type: e,
          is_private: e === "highlight" ? !0 : n,
          chapter: String(((a = i.toc) == null ? void 0 : a.label) || this.current_toc_title || "").trim(),
          // 评论归属段落（跨段时为最后一段）与真实选区分开保存。
          cfi: String(r),
          range_cfi: String(i.cfi || r),
          quote_text: s,
          content: t,
          color: o ? "blue" : "yellow"
        });
        this.render_annotation(u), this.hide_toolbar();
        try {
          (d = (c = (l = i.contents) == null ? void 0 : l.window) == null ? void 0 : c.getSelection()) == null || d.removeAllRanges();
        } catch {
        }
        return this.selected_location === i && (this.selected_location = {}), u;
      } catch (u) {
        return this.show_annotation_feedback(`保存失败：${u.message || "请稍后重试"}`, !0), null;
      } finally {
        this.annotation_saving = !1;
      }
    },
    save_highlight: function() {
      return this.save_annotation("highlight", "", !0);
    },
    open_editor: function({ location: e = null, record: t = null, type: n = "note" }) {
      this.annotation_editor_location = e, this.annotation_editor_record = t, this.annotation_editor_type = (t == null ? void 0 : t.annotation_type) || n, this.annotation_editor_content = (t == null ? void 0 : t.content) || "", this.annotation_editor_error = "", this.annotation_editor_private = t ? t.is_private !== !1 : !this.read_public_preference(), this.annotation_editor_open = !0;
    },
    open_note_editor: function() {
      var e;
      if ((e = this.selected_location) != null && e.paragraph_cfi) {
        if (!this.user) return this.request_login();
        this.hide_toolbar(!0), this.open_editor({ location: this.selected_location });
      }
    },
    // 抽屉与完整评论页底部的「写评论」：本段范围写段落评论，其余范围写整书评论。
    on_write_comment: function({ scope: e }) {
      var t;
      e === "paragraph" && ((t = this.comment_paragraph) != null && t.paragraph_cfi) ? this.open_editor({ location: { ...this.comment_paragraph, client_id: Ii() } }) : this.open_editor({ type: "book_comment" });
    },
    on_edit_comment: function(e) {
      this.open_editor({ record: e });
    },
    save_note: async function() {
      var r;
      const e = this.annotation_editor_content.trim();
      if (!e) {
        this.annotation_editor_error = "请填写评论内容", this.$nextTick(() => {
          var s;
          return (s = this.$refs.annotationEditorContent) == null ? void 0 : s.focus();
        });
        return;
      }
      const t = this.annotation_editor_private, n = this.annotation_editor_record;
      let i = null;
      if (n || this.annotation_editor_type === "book_comment") {
        if (this.annotation_saving) return;
        this.annotation_saving = !0;
        try {
          i = await this.annotation_repository.save(n ? { id: n.id, client_id: n.client_id, annotation_type: n.annotation_type, content: e, is_private: t } : {
            client_id: Ii(),
            annotation_type: "book_comment",
            is_private: t,
            chapter: "",
            // 整书评论关联到全书最开头。
            cfi: `epubcfi(${this.book.spine.first().cfiBase}!/4)`,
            quote_text: "",
            content: e
          });
        } catch (s) {
          this.show_annotation_feedback(`保存失败：${s.message || "请稍后重试"}`, !0);
        } finally {
          this.annotation_saving = !1;
        }
      } else
        i = await this.save_annotation("note", e, t);
      if (!i) return;
      if (!n)
        try {
          localStorage.setItem(uc, String(!t));
        } catch {
        }
      this.annotation_editor_open = !1, (r = this.$refs.comments) == null || r.apply_saved(i), this.on_comments_changed();
      const o = i.annotation_type === "book_comment" ? "全书评论" : "";
      this.show_annotation_feedback(t ? "已保存为私密，可在「查看更多评论 › 我的」中查看" : o ? `评论已保存，可在「${o}」中查看` : "评论已保存");
    },
    on_annotation_editor_closed: function() {
      var t, n, i, o;
      const e = this.annotation_editor_location;
      if (this.annotation_editor_location = null, this.annotation_editor_record = null, e && this.selected_location === e) {
        this.clear_selection_preview();
        try {
          (i = (n = (t = e == null ? void 0 : e.contents) == null ? void 0 : t.window) == null ? void 0 : n.getSelection()) == null || i.removeAllRanges();
        } catch {
        }
        this.selected_location = {};
      }
      (o = this.selected_location) != null && o.cfi || this.restore_reader_focus();
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
      const t = gn(this.settings.theme).mode === "day" ? this.settings.theme_night || "grey" : this.settings.theme_day || "white";
      this.apply_theme(t), this.save_settings();
    },
    // 应用一套主题（按 id）。solid 走 themes.css 的 class；image 走外层背景图 + iframe 透明 + 文字色强制。
    apply_theme: function(e) {
      const t = gn(e);
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
      e = e || gn(this.settings.theme), document.documentElement.style.backgroundColor = e.bgTop || e.bg, document.body.style.backgroundColor = e.bgTop || e.bg;
      const t = document.querySelector('meta[name="theme-color"]');
      t && t.setAttribute("content", e.bgTop || e.bg);
    },
    // 背景图铺在 #main（v-main）上：覆盖上/下状态栏与正文区域，整屏一张图连续衔接。
    // image 皮肤按屏幕方向选竖版/横版大图（cover）；正文 iframe 与状态栏透明后透出。
    // （图放在主文档而非 iframe 内——iframe 在分栏模式下宽达数十万 px，背景会被拉伸失效。）
    apply_skin_background: function(e) {
      e = e || gn(this.settings.theme);
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
      e = e || gn(this.settings.theme), this.rendition.getContents().forEach((i) => {
        const o = i.document && i.document.getElementById("epubjs-inserted-css-default");
        o && o.parentNode && o.parentNode.removeChild(o);
      });
      const t = {
        "line-height": `${this.settings.line_height} !important`,
        "letter-spacing": `${this.settings.letter_spacing}px !important`
      };
      this.settings.show_selection_toolbar && (t["-webkit-touch-callout"] = "none !important");
      const n = { "body, body *": t };
      e.type === "image" && (n.html = {
        background: "transparent !important",
        "color-scheme": e.mode === "night" ? "dark" : "light"
      }, t["background-color"] = "transparent !important", t.color = `${e.text} !important`), this.rendition.themes.default(n);
    },
    on_panel_model_update: function(e, t) {
      !t && this.menu.current_panel === e && this.set_menu("hide");
    },
    on_panel_after_leave: function(e) {
      var o, r;
      if (e !== this.panel_closing || Object.values(this.menu.panels).some(Boolean) || this.show_theme_dialog || this.annotation_editor_open) return;
      const t = (s) => (s == null ? void 0 : s.isConnected) && !s.disabled && !s.closest("[inert], .v-overlay") && s.getClientRects().length, n = ((o = this.$refs[this.panel_entry_ref]) == null ? void 0 : o.$el) || ((r = this.$refs.panelEntryAnnotations) == null ? void 0 : r.$el), i = t(this.panel_trigger) ? this.panel_trigger : n;
      t(i) && i.focus({ preventScroll: !0 }), this.panel_closing = null, this.panel_trigger = null;
    },
    set_menu: function(e) {
      var i, o;
      var t = e;
      if (this.menu.current_panel == t && this.menu.panels[t] === !0 && (t = "hide"), t !== "annotations" && ((i = this.$refs.comments) == null || i.close_pages()), t === "hide")
        this.menu.current_panel !== "hide" && (this.panel_closing = this.menu.current_panel);
      else {
        const r = document.activeElement, s = (r == null ? void 0 : r.matches("button, a[href], [tabindex]")) && !r.closest(".v-overlay");
        if (s || !this.panel_trigger) {
          const a = { settings: "panelEntrySettings", toc: "panelEntryToc", ai: "panelEntryAi" };
          this.panel_entry_ref = a[t] || "panelEntryAnnotations", this.panel_trigger = s ? r : (o = this.$refs[this.panel_entry_ref]) == null ? void 0 : o.$el;
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
      const t = this.comments_enabled;
      e.flow != this.settings.flow && (this.rendition.flow(e.flow), this.set_menu("hide"));
      for (const n in e)
        this.settings[n] = e[n];
      if (this.apply_theme(this.settings.theme), t && !this.comments_enabled ? (this.annotation_chapter_request++, this.clear_annotation_marks()) : !t && this.comments_enabled && this.load_chapter_annotations(this.visible_chapters()), t !== this.comments_enabled && this.refresh_comment_icons(), this.settings.show_selection_toolbar || this.hide_toolbar(), e.brightness !== void 0) {
        const n = e.brightness / 100;
        document.getElementById("main").style.filter = `brightness(${n})`;
      }
      e.font_size !== void 0 && this.rendition.themes.fontSize(e.font_size + "px"), requestAnimationFrame(() => this.refit_comment_icons()), this.save_settings();
    },
    on_click_toc: function(e) {
      console.log(e), this.set_menu("hide"), this.suspend_audiobook_follow(), this.rendition.display(e.id);
    },
    on_mousedown: function(e) {
      this.mouse_down_time = /* @__PURE__ */ new Date(), this.mouse_down_point = e ? { x: e.clientX, y: e.clientY } : null;
    },
    on_mouseup: function(e) {
      const t = /* @__PURE__ */ new Date() - this.mouse_down_time, n = this.mouse_down_point, i = !!(n && e) && Math.hypot(e.clientX - n.x, e.clientY - n.y) > 8;
      this.check_if_selected_content = t > 600 || i;
    },
    on_click_content: function(e) {
      var t, n, i;
      if ((e == null ? void 0 : e.type) === "click" && ((i = (n = (t = e.view) == null ? void 0 : t.getSelection) == null ? void 0 : n.call(t)) == null ? void 0 : i.isCollapsed) === !1 && (e.detail >= 2 || this.mouse_down_point && Math.hypot(e.clientX - this.mouse_down_point.x, e.clientY - this.mouse_down_point.y) > 8)) {
        this.is_handlering_selected_content = !1;
        return;
      }
      if (this.selection_active || this.clear_text_selection()) {
        this.clear_text_selection(), this.hide_toolbar();
        return;
      }
      if (!this.check_if_selected_content)
        return this.smart_click(e);
      setTimeout(() => {
        this.is_handlering_selected_content ? this.is_handlering_selected_content = !1 : this.smart_click(e);
      }, 300);
    },
    clear_text_selection: function() {
      var t, n;
      let e = !1;
      for (const i of ((t = this.rendition) == null ? void 0 : t.getContents()) || []) {
        const o = (n = i.window) == null ? void 0 : n.getSelection();
        o && !o.isCollapsed && (o.removeAllRanges(), e = !0);
      }
      return e && this.clear_selection_preview(), e;
    },
    smart_click: function(e) {
      const t = e.view.frameElement.getBoundingClientRect(), n = document.getElementById("reader"), i = n.offsetWidth, o = n.offsetHeight, r = (e.clientX + t.x) % n.offsetWidth, s = (e.clientY + t.y) % n.offsetHeight;
      if (this.debug_click(r, s, i, o), this.is_toolbar_visible()) {
        this.hide_toolbar();
        return;
      }
      const a = i < this.wide_screen, l = a ? 3 : 5, c = this.settings.paging_control === "keyboard_only";
      r < i / l || a && s < o / l ? c || (this.suspend_audiobook_follow(), this.rendition.prev()) : r > i * (l - 1) / l || a && s > o * (l - 1) / l ? c || (this.suspend_audiobook_follow(), this.rendition.next().then()) : (console.log("-- toggle menu"), this.menu.show_navbar = !this.menu.show_navbar);
    },
    bin_search: function(e, t, n) {
      for (var i = 0, o = e.length; i < o; ) {
        const s = Math.floor((i + o) / 2);
        if (s == i)
          break;
        const a = e[s];
        if (a.cfi === void 0) {
          if (a.href.indexOf("#") > 0) {
            const c = a.href.split("#")[1];
            a.elem = n.document.getElementById(c);
          } else
            a.elem = n.document.getElementsByTagName("p")[0];
          a.cfi = new ePub.CFI(a.elem, n.cfiBase), a.cfi = new ePub.CFI(a.cfi.toString());
        }
        const l = this.book.locations.epubcfi.compare(t, a.cfi);
        if (l == 0)
          return a;
        l < 0 && (o = s), l > 0 && (i = s);
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
        if (i.subitems !== void 0 && i.subitems.length > 0) {
          const o = this.find_same_href_in_toc_tree(i.subitems, t);
          if (o !== void 0)
            return o;
        }
      }
    },
    find_toc_in_same_file: function(e, t, n) {
      var s;
      const i = [], o = (a) => a.forEach((l) => {
        var c;
        String(l.href || "").split("#")[0] === n && i.push(l), (c = l.subitems) != null && c.length && o(l.subitems);
      });
      o(this.toc_items);
      let r;
      for (const a of i) {
        if (((s = a.elem) == null ? void 0 : s.ownerDocument) !== t.document) {
          const l = t.document.getElementById(a.href.split("#")[1] || "");
          if (!l) continue;
          a.elem = l, a.cfi = new ePub.CFI(new ePub.CFI(l, t.cfiBase).toString());
        }
        if (r && this.book.locations.epubcfi.compare(e, a.cfi) < 0) break;
        r = a;
      }
      return r;
    },
    find_toc: function(e, t) {
      const n = new ePub.CFI(e.toString()), i = this.book.spine.get(t.sectionIndex), o = this.find_same_href_in_toc_tree(this.toc_items, i.href);
      if (console.log("got spine href in toc:", o), o === void 0) {
        const s = this.find_toc_in_same_file(n, t, i.href);
        if (s) return s;
        if (t.annotationFallbackToc) return t.annotationFallbackToc;
        const a = t.document.body, l = a.querySelector("h1, h2, h3, h4, h5, h6");
        return t.annotationFallbackToc = {
          href: i.href,
          label: (l == null ? void 0 : l.textContent.trim()) || `正文 ${i.index + 1}`,
          elem: a,
          cfi: new ePub.CFI(a, t.cfiBase),
          subitems: [],
          is_fallback: !0
        }, t.annotationFallbackToc;
      }
      if (o.elem === void 0) {
        const s = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
        for (let l of s) {
          const c = t.document.getElementsByTagName(l);
          if (c.length > 0) {
            o.elem = c[0];
            break;
          }
        }
        const a = new ePub.CFI(o.elem, t.cfiBase);
        o.cfi = new ePub.CFI(a.toString());
      }
      var r = o;
      return o.subitems.length > 0 && (r = this.bin_search(o.subitems, n, t), this.book.locations.epubcfi.compare(n, r.cfi) < 0 && (r = o)), console.log("find_toc = ", r), r;
    },
    count_distinct_between: function(e, t) {
      for (var n = t; n && n.parentElement != e.parentNode; )
        n = n.parentElement;
      if (!n) {
        const r = Array.from(e.ownerDocument.querySelectorAll("p, h1, h2, h3, h4, h5, h6")), s = r.findIndex((a) => a === e || a.contains(e) || e.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
        return Math.max(0, r.indexOf(t) - s);
      }
      let i = 0, o = e;
      for (; o && o !== n; ) {
        const r = o.nodeName.toUpperCase();
        if ((r === "P" || r[0] === "H") && i++, o.firstChild)
          o = o.firstChild;
        else if (o.nextSibling)
          o = o.nextSibling;
        else {
          for (; !o.nextSibling && o.parentNode; )
            o = o.parentNode;
          o = o.nextSibling;
        }
      }
      return i;
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
      e || (this.selection_active = !1), this.toolbar_left = -999, e || this.clear_selection_preview();
    },
    show_toolbar: function(e, t) {
      if (!this.settings.show_selection_toolbar) return;
      console.log("show toolbar at rect", e, " from iframe rect", t);
      const n = e.left + t.x, i = e.top + t.y, o = e.bottom + t.y;
      this.toolbar_left = 8, this.toolbar_top = o + 12, this.$nextTick(() => {
        var g;
        const r = this.$refs.selectionToolbar;
        if (!r || !this.settings.show_selection_toolbar) return;
        const { width: s, height: a } = r.getBoundingClientRect(), l = Math.max(8, window.innerWidth - s - 8);
        this.toolbar_left = Math.max(8, Math.min(l, n));
        const c = this.menu.show_navbar ? 64 : 8, d = i >= a + 12 + 8, u = o + 12 + a <= window.innerHeight - c, m = ((g = window.matchMedia) == null ? void 0 : g.call(window, "(pointer: coarse)").matches) && u;
        this.toolbar_top = d && !m ? i - a - 12 : Math.min(window.innerHeight - a - c, o + 12);
      });
    },
    is_toolbar_visible: function() {
      return this.settings.show_selection_toolbar && this.toolbar_left > 0;
    },
    paragraph_of: function(e, t) {
      return (e.nodeType === Node.TEXT_NODE ? e.parentElement : e).closest("p, h1, h2, h3, h4, h5, h6, li, blockquote, div") || t.document.body;
    },
    // 整段的 CFI 与原文。按文字边界取范围，段尾评论气泡不会进入引用，也不会改变段落 CFI。
    paragraph_location: function(e, t) {
      const n = t.document.createTreeWalker(e, NodeFilter.SHOW_TEXT, {
        acceptNode: (r) => r.parentElement.closest(".comment-icon, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      }), i = [];
      for (; n.nextNode(); ) i.push(n.currentNode);
      if (!i.length) return {};
      const o = t.document.createRange();
      return o.setStart(i[0], 0), o.setEnd(i[i.length - 1], i[i.length - 1].length), {
        paragraph_cfi: t.cfiFromRange(o),
        paragraph_quote_text: i.map((r) => r.textContent).join("").trim()
      };
    },
    paragraph_for_range: function(e, t) {
      const n = this.paragraph_of(e.endContainer, t);
      return {
        ...this.paragraph_location(n, t),
        multi_paragraph: n !== this.paragraph_of(e.startContainer, t)
      };
    },
    on_select_content: function(e, t) {
      console.log("on selectd", e, t), this.is_handlering_selected_content = !0;
      const n = this.rendition.getRange(e) || t.range(e), i = n.startContainer.nodeType === Node.TEXT_NODE ? n.startContainer.parentElement : n.startContainer, o = i.closest("p, h1, h2, h3, h4, h5, h6") || i;
      console.log("selected elem =", o);
      const r = new ePub.CFI(o, t.cfiBase), s = this.find_toc(r, t);
      console.log("cfi = ", r, "toc =", s);
      let a = 0;
      try {
        a = s.is_fallback ? Math.max(0, Array.from(s.elem.querySelectorAll("p, h1, h2, h3, h4, h5, h6")).indexOf(o)) : this.count_distinct_between(s.elem, o);
      } catch (c) {
        console.warn("Candle Reader paragraph index could not be computed:", c);
      }
      this.selected_location = {
        client_id: Ii(),
        toc: s,
        cfi: String(e),
        ...this.paragraph_for_range(n, t),
        quote_text: n.toString().trim(),
        contents: t,
        segment_id: a
      }, this.selection_active = !0;
      const l = this.rendition.views()._views.filter((c) => c.index == t.sectionIndex)[0];
      this.settings.show_selection_toolbar && this.update_selection_preview(n, l.iframe.getBoundingClientRect()), this.show_toolbar(n.getBoundingClientRect(), l.iframe.getBoundingClientRect());
    },
    on_keyup: function(e) {
      var i;
      if (e.key === "Escape" && this.is_toolbar_visible()) {
        this.hide_toolbar(), this.restore_reader_focus();
        return;
      }
      const t = e.target;
      if ((i = t == null ? void 0 : t.matches) != null && i.call(t, "input, textarea, select") || t != null && t.isContentEditable) return;
      const n = e.keyCode || e.which;
      (n == 37 || n == 38) && (this.suspend_audiobook_follow(), this.rendition.prev()), (n == 39 || n == 40) && (this.suspend_audiobook_follow(), this.rendition.next());
    },
    on_wheel: function(e) {
      if (!this.settings.wheel_paging || this.settings.flow !== "paginated" || !this.rendition || this.menu.current_panel !== "hide" || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target;
      t && t.closest && (t.closest(".v-bottom-sheet") || t.closest(".v-overlay") || t.closest(".v-dialog") || t.closest(".v-menu")) || (this.wheel_acc = (this.wheel_acc || 0) + e.deltaY, !(Math.abs(this.wheel_acc) < 30) && (e.preventDefault(), this.suspend_audiobook_follow(), this.rendition[this.wheel_acc > 0 ? "next" : "prev"](), this.wheel_acc = 0));
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
        var e = ["added", "attach", "attached", "axis", "changed", "detach", "displayed", "displayerror", "expand", "hidden", "layout", "linkClicked", "loaderror", "locationChanged", "markClicked", "openFailed", "orientationchange", "relocated", "removed", "rendered", "resize", "resized", "scroll", "scrolled", "selected", "selectedRange", "shown", "started", "updated", "writingMode", "mouseup", "mousedown", "mousemove", "click", "touchend", "touchstart", "touchmove"];
        e.forEach((t) => {
          this.rendition.on(t, (n) => {
            this.alert_msg = t, console.log("rendition signal:", t, n);
          });
        });
      }
    },
    init_listeners: function() {
      document.addEventListener("keyup", this.on_keyup), document.addEventListener("touchmove", this.block_page_drag, { passive: !1 }), this.rendition.on("keyup", this.on_keyup), this.rendition.on("click", this.on_click_content), this.rendition.on("selected", this.on_select_content), this.rendition.on("locationChanged", this.on_location_changed), this.rendition.on("mousedown", this.on_mousedown), this.rendition.on("mouseup", this.on_mouseup), this.rendition.on("resized", this.on_resized), this.rendition.on("rendered", this.bind_iframe_wheel), document.addEventListener("fullscreenchange", this.on_fullscreen_change), document.addEventListener("webkitfullscreenchange", this.on_fullscreen_change), document.addEventListener("mozfullscreenchange", this.on_fullscreen_change), document.addEventListener("MSFullscreenChange", this.on_fullscreen_change), this.debug_signals();
    },
    bind_iframe_wheel: function() {
      document.querySelectorAll("#reader iframe").forEach((e) => {
        const t = e.contentDocument;
        !t || t.__candle_wheel_bound || (t.__candle_wheel_bound = !0, t.addEventListener("wheel", this.on_wheel, { passive: !1 }));
      });
    },
    // iOS Safari 上纵向拖动会带着整页回弹并收起/展开地址栏，可视高度一变正文就重新排版，看起来像在滚动加载。
    // 左右翻页模式下拦掉阅读区域外框（顶栏、底栏、正文四周）的原生拖动。正文 iframe 里不拦：
    // iOS 拖动选区两端的手柄靠的就是原生拖动；整页不动由 html/body 固定定位保证。
    block_page_drag: function(e) {
      var t, n, i;
      this.settings.flow !== "paginated" || ((t = e.touches) == null ? void 0 : t.length) > 1 || (i = (n = e.target) == null ? void 0 : n.closest) != null && i.call(n, "#main, .v-app-bar, .v-bottom-navigation") && e.cancelable && e.preventDefault();
    },
    init_themes: function() {
      console.log("load themes from:", this.themes_css), Rn.forEach((e) => this.rendition.themes.register(e.id, this.themes_css)), this.apply_theme(this.settings.theme);
    },
    on_resized: function() {
      console.log("Reader resized"), this.apply_skin_background(), requestAnimationFrame(() => this.refit_comment_icons());
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
    on_location_changed: function(e) {
      try {
        const t = new ePub.CFI(e.start), n = this.rendition.getContents(), i = n.find((r) => r.sectionIndex === e.index);
        if (!i)
          return;
        const o = this.find_toc(t, i);
        if (o) {
          this.current_toc_title = o.label, this.current_toc = o;
          const r = e.end && n.find((c) => String(e.end).includes(c.cfiBase)), s = r && this.find_toc(new ePub.CFI(e.end), r);
          this.visible_tocs = Pc(this.tocs_between({ contents: i, toc: o }, s && { contents: r, toc: s }, n));
          const a = this.visible_tocs, l = a.map((c) => c.toc.label).join(`
`);
          this.last_toc_label !== l && (a.forEach((c) => this.load_comments_summary(c.contents, c.toc)), this.load_chapter_annotations(this.visible_chapters()), this.last_toc_label = l);
        }
      } catch (t) {
        console.error("Error in on_location_changed:", t);
      }
    },
    // 段尾气泡：显示归属本段的公开评论数量，点击进入本段评论。
    load_comments_summary: function(e, t) {
      if (!this.comments_enabled || !this.annotation_repository) return;
      const n = this.comments_request;
      if (t === void 0) {
        console.log("!! 加载评论数量错误，章节信息为空");
        return;
      }
      if (!(t.load_time !== void 0 && /* @__PURE__ */ new Date() - t.load_time < this.comments_refresh_time))
        return t.load_time = /* @__PURE__ */ new Date(), this.annotation_repository.summary({ chapter: t.label.trim() }).then((i) => {
          !this.comments_enabled || n !== this.comments_request || (t.summary = i, this.add_comment_icons(e, t));
        }).catch(function(i) {
          console.error("加载评论数量出现错误：", i);
        });
    },
    add_comment_icons: function(e, t) {
      !this.comments_enabled || !e || (t.summary || []).forEach((n) => {
        const i = String(n.paragraph_cfi || "");
        if (!(!n.count || !i.includes(e.cfiBase)))
          try {
            const o = e.range(i);
            o && this.add_icon_into_paragraph(e, this.paragraph_of(o.endContainer, e), n, t);
          } catch (o) {
            console.warn("Candle Reader comment bubble could not be placed:", i, o);
          }
      });
    },
    add_icon_into_paragraph: function(e, t, n, i) {
      if (t.querySelector(".comment-icon"))
        return;
      const o = e.document, r = o.createElement("div");
      r.className = "comment-icon";
      const s = o.createElement("span");
      s.className = "comment-count", s.textContent = String(n.count), r.appendChild(s);
      const a = o.createElement("span");
      a.className = "comment-anchor", a.appendChild(r), t.appendChild(a), this.fit_comment_icon(r, a, t), r.addEventListener("click", (l) => {
        l.stopPropagation(), this.open_comments("paragraph", { toc: i, contents: e, ...this.paragraph_location(t, e), paragraph_cfi: String(n.paragraph_cfi) });
      });
    },
    // 段落最后一个可见字的位置。段尾常有 <br> 或换行空白，锚点会落到下一行，气泡要以最后一个字为准。
    last_char_rect: function(e) {
      const t = e.ownerDocument, n = t.createTreeWalker(e, NodeFilter.SHOW_TEXT, {
        acceptNode: (a) => a.parentElement.closest(".comment-anchor, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      });
      let i = null;
      for (; n.nextNode(); )
        /\S/.test(n.currentNode.textContent) && (i = n.currentNode);
      if (!i) return null;
      const o = i.textContent.search(/\s*$/), r = t.createRange();
      r.setStart(i, o - 1), r.setEnd(i, o);
      const s = Array.from(r.getClientRects()).filter((a) => a.width || a.height);
      return s[s.length - 1] || null;
    },
    // 气泡紧跟段落最后一个字，与末行垂直居中，不另起一行。
    // 末行写满时允许伸进页边距（body 的右内边距），再多就会被翻页窗口裁掉，此时把气泡向左收回页内。
    fit_comment_icon: function(e, t, n) {
      e.style.left = "", e.style.top = "";
      const i = n.ownerDocument, o = t.getBoundingClientRect(), r = this.last_char_rect(n);
      r && (e.style.left = `${r.right - o.left}px`, e.style.top = `${r.top + r.height / 2 - o.top}px`);
      const s = e.getBoundingClientRect(), a = s.top + s.height / 2, l = Array.from(n.getClientRects()).find((u) => s.left >= u.left - 1 && s.left <= u.right + 1 && a >= u.top - 1 && a <= u.bottom + 1) || n.getBoundingClientRect(), c = parseFloat(i.defaultView.getComputedStyle(i.body).paddingRight) || 0, d = s.right - (l.right + Math.max(c - 2, 0));
      d > 0 && (e.style.left = `${(parseFloat(e.style.left) || 0) - d}px`);
    },
    refit_comment_icons: function() {
      var e;
      for (const t of ((e = this.rendition) == null ? void 0 : e.getContents()) || [])
        t.document.querySelectorAll(".comment-anchor").forEach((n) => {
          const i = n.querySelector(".comment-icon");
          i && n.parentElement && this.fit_comment_icon(i, n, n.parentElement);
        });
    },
    // 目录中从页首章节到页尾章节（含两端）的每一章，配上它所在的正文文档；没有渲染出来的跳过。
    tocs_between: function(e, t, n) {
      const i = [e];
      if (!t || t.toc === e.toc) return i;
      const o = [], r = (l) => l.forEach((c) => {
        var d;
        o.push(c), (d = c.subitems) != null && d.length && r(c.subitems);
      });
      r(this.toc_items || []);
      const s = o.indexOf(e.toc), a = o.indexOf(t.toc);
      if (s >= 0 && a > s)
        for (const l of o.slice(s + 1, a)) {
          const c = String(l.href || "").split("#")[0], d = n.find((u) => {
            var m;
            return ((m = this.book.spine.get(u.sectionIndex)) == null ? void 0 : m.href) === c;
          });
          d && i.push({ contents: d, toc: l });
        }
      return i.push(t), i;
    },
    panel_width: function(e) {
      return Math.min(this.panel_max_width, Math.max(Os, this.panel_widths[e] || Wo[e].width));
    },
    set_panel_width: function(e, t) {
      this.panel_widths = { ...this.panel_widths, [e]: t };
    },
    reset_panel_width: function(e) {
      this.set_panel_width(e, Wo[e].width), this.save_panel_widths();
    },
    save_panel_widths: function() {
      try {
        localStorage.setItem(cc, JSON.stringify(this.panel_widths));
      } catch {
      }
    },
    // 侧边栏宽度以 CSS 变量交给样式表（面板浮层不在本组件的 DOM 树里）。
    apply_panel_widths: function() {
      for (const e of Object.keys(Wo))
        document.documentElement.style.setProperty(`--candle-panel-${e}-width`, `${this.panel_width(e)}px`);
    },
    on_window_resize: function() {
      this.window_width = window.innerWidth, this.is_wide_screen = window.innerWidth >= 850;
    },
    // 当前页上出现的章节。
    visible_chapters: function() {
      const t = (this.visible_tocs.length ? this.visible_tocs.map((n) => n.toc) : [this.current_toc]).map((n) => String((n == null ? void 0 : n.label) || "").trim()).filter(Boolean);
      return t.length ? [...new Set(t)] : [this.comment_chapter];
    },
    refresh_comment_icons: function() {
      if (this.comments_request++, !this.rendition) return;
      for (const n of this.rendition.getContents())
        n.document.querySelectorAll(".comment-anchor, .comment-icon").forEach((i) => i.remove());
      if (!this.comments_enabled) return;
      const e = this.visible_tocs.length ? this.visible_tocs : [{ toc: this.current_toc }], t = this.rendition.getContents();
      for (const n of e) {
        const i = n.toc;
        if (!i) continue;
        delete i.load_time;
        const o = t.includes(n.contents) ? n.contents : i.elem && t.find((r) => r.document === i.elem.ownerDocument);
        o && this.load_comments_summary(o, i);
      }
    },
    retryLoad: function() {
      var e, t;
      try {
        this.showTimeoutDialog = !1, setTimeout(() => {
          this.loading = !0;
        }, 50);
        try {
          (e = this.rendition) == null || e.destroy(), (t = this.book) == null || t.destroy();
        } catch {
        }
        this.book = ePub(this.book_url), this.rendition = this.book.renderTo("reader", {
          manager: "continuous",
          flow: this.settings.flow,
          width: "100%",
          height: "100%"
        }), this.init_listeners(), this.init_themes(), this.start_load_timer();
        const n = `lastReadPosition_${this.book_url}`;
        this.book.ready.then(() => {
          const o = localStorage.getItem(n) || this.display_url;
          return o ? this.rendition.display(o) : this.rendition.display();
        }).then(this.on_book_loaded).catch(this.on_book_load_failed), this.rendition.on("relocated", (i) => {
          localStorage.setItem(n, i.start.cfi);
        });
      } catch (n) {
        this.on_book_load_failed(n);
      }
    },
    // 超过 LOAD_TIMEOUT_MS 仍未显示正文时提示「加载较慢」，但不中断加载；加载完成后自动关闭提示。
    start_load_timer: function() {
      clearTimeout(this.loadingTimeout), this.load_failed = !1, this.loadingTimeout = setTimeout(() => {
        this.loading && (console.warn("电子书加载较慢，显示提示框"), this.showTimeoutDialog = !0);
      }, x1);
    },
    on_book_loaded: function() {
      clearTimeout(this.loadingTimeout), this.loading = !1, this.showTimeoutDialog = !1;
    },
    on_book_load_failed: function(e) {
      clearTimeout(this.loadingTimeout), console.error("加载电子书失败:", e), this.loading = !1, this.load_failed = !0, this.showTimeoutDialog = !0;
    }
  },
  watch: {
    panel_widths: function() {
      this.apply_panel_widths();
    },
    panel_max_width: function() {
      this.apply_panel_widths();
    }
  },
  beforeUnmount: function() {
    window.removeEventListener("resize", this.on_window_resize);
  },
  mounted: function() {
    try {
      this.panel_widths = JSON.parse(localStorage.getItem(cc) || "{}") || {};
    } catch {
      this.panel_widths = {};
    }
    this.apply_panel_widths(), window.addEventListener("resize", this.on_window_resize);
    const e = document.createElement("link");
    e.rel = "stylesheet", e.type = "text/css", e.href = this.themes_css, document.head.appendChild(e);
    const t = localStorage.getItem("readerSettings");
    if (t) {
      const i = this.$options.data().settings, o = JSON.parse(t);
      this.settings = Object.assign({}, i);
      for (const r in o)
        o[r] !== void 0 && (this.settings[r] = o[r]);
      Object.assign(this.settings, s1(o)), delete this.settings.notes_enabled, delete this.settings.show_annotations;
    }
    this.initialize_annotations(), this.load_user(), this.is_debug_signal = this.debug, this.is_debug_click = this.debug, this.start_load_timer(), this.loading = !0, this.book = ePub(this.book_url), this.rendition = this.book.renderTo("reader", {
      manager: "continuous",
      flow: this.settings.flow,
      width: "100%",
      height: "100%"
      //snap: true
    }), this.book.loaded.metadata.then((i) => {
      console.log(i), this.book_meta = i, this.book_title = i.title;
    }).catch((i) => {
      console.error("加载书籍元数据失败:", i);
    }), this.book.loaded.navigation.then((i) => {
      this.toc_items = i.toc;
    }).catch((i) => {
      console.error("加载目录失败:", i);
    }), this.init_listeners(), this.init_themes();
    const n = `lastReadPosition_${this.book_url}`;
    this.rendition.on("relocated", (i) => {
      localStorage.setItem(n, i.start.cfi);
    }), this.book.ready.then(() => {
      const o = localStorage.getItem(n) || this.display_url;
      return o ? this.rendition.display(o) : this.rendition.display();
    }).then(() => {
      this.on_book_loaded();
      const i = this.settings.brightness / 100;
      document.getElementById("main").style.filter = `brightness(${i})`, this.rendition.themes.fontSize(this.settings.font_size + "px"), this.apply_theme(this.settings.theme);
    }).catch(this.on_book_load_failed);
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
    // 当前读者，由宿主回调提供；游客为 null
    book_title: "",
    book_meta: null,
    alert_msg: "秉烛夜读",
    rendition: null,
    auto_close: !1,
    menu: {
      show_navbar: !0,
      current_panel: "hide",
      value: "",
      panels: {
        toc: !1,
        settings: !1,
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
    annotation_repository: null,
    annotation_chapter_request: 0,
    annotation_saving: !1,
    annotation_editor_open: !1,
    annotation_editor_location: null,
    annotation_editor_record: null,
    // 正在编辑的已有评论
    annotation_editor_type: "note",
    // note | book_comment
    annotation_editor_content: "",
    annotation_editor_error: "",
    annotation_editor_private: !1,
    comment_paragraph: null,
    // 「本段评论」当前所指的段落
    selection_preview_rects: [],
    annotation_feedback_visible: !1,
    annotation_feedback_message: "",
    annotation_feedback_error: !1,
    rendered_annotations: [],
    rendered_annotation_ids: /* @__PURE__ */ new Set(),
    selected_location: {},
    // 选中内容的位置
    current_toc_title: "",
    current_toc: null,
    // 当前阅读的章节对象
    current_toc_progress: "",
    last_toc_label: "",
    // 上一次的可见章节标题，用于检测章节变化
    visible_tocs: [],
    // 当前屏上出现的章节及其正文文档
    panel_widths: {},
    // 宽屏侧边栏的宽度（读者拖动调整，按面板记住）
    window_width: typeof window > "u" ? 1024 : window.innerWidth,
    is_wide_screen: typeof window < "u" && window.innerWidth >= 850,
    PANEL_MIN_WIDTH: Os,
    toolbar_left: -999,
    toolbar_top: 0,
    is_debug_signal: !1,
    is_debug_click: !1,
    is_handlering_selected_content: !1,
    mouse_down_point: null,
    selection_active: !1,
    // epub.js 报告选中文字后为 true，取消选中或收起工具栏后复位
    check_if_selected_content: !1,
    showTimeoutDialog: !1,
    load_failed: !1,
    // 区分「加载较慢」与「加载失败」
    show_theme_dialog: !1,
    audiobook_open: !1,
    audiobook_repository: null
  })
}, V1 = { class: "annotation-sheet-body" }, O1 = { class: "annotation-editor-header" }, T1 = { id: "annotation-editor-title" }, A1 = {
  key: 0,
  class: "annotation-editor-reference",
  "aria-labelledby": "annotation-reference-title"
}, D1 = { class: "annotation-reference-heading" }, I1 = { class: "annotation-reference-chapter" }, P1 = {
  class: "annotation-editor-quote",
  tabindex: "0",
  "aria-label": "引用原文"
}, $1 = { class: "annotation-editor-hint" }, M1 = {
  key: 1,
  class: "annotation-editor-hint annotation-editor-book-hint"
}, L1 = { class: "annotation-editor-footer" }, F1 = { class: "annotation-visibility-row" }, B1 = {
  id: "annotation-visibility-hint",
  class: "annotation-editor-hint annotation-visibility-hint",
  "aria-live": "polite"
}, R1 = { class: "selection-toolbar-actions" }, H1 = {
  id: "status-bar-left",
  class: "align-start"
}, j1 = {
  id: "status-bar-right",
  class: "align-end"
}, z1 = { class: "progress-bar-container" }, U1 = { class: "theme-group-label" }, W1 = { class: "theme-grid" }, q1 = ["onClick"], K1 = {
  key: 1,
  class: "theme-badge"
}, G1 = { class: "theme-name" };
function Y1(e, t, n, i, o, r) {
  const s = Im, a = Tm, l = Em, c = mm, d = kf;
  return X(), Ke(c1, {
    theme: e.settings.theme,
    "full-height": "",
    density: "compact"
  }, {
    default: T(() => [
      R("div", {
        id: "safe-bottom",
        style: Rt({ backgroundColor: r.foot_color })
      }, null, 4),
      e.menu.show_navbar ? (X(), Ke(p1, {
        key: 0,
        density: "compact"
      }, {
        prepend: T(() => [
          f(Ce, {
            icon: "",
            title: e.is_debug_signal ? "返回首页" : "章评"
          }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => [
                  te(_e(e.is_debug_signal ? "mdi-arrow-left" : "mdi-candle"), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["title"])
        ]),
        default: T(() => [
          te(" " + _e(e.is_debug_signal ? e.alert_msg : e.book_title) + " ", 1),
          f(nr),
          r.has_audiobook ? (X(), Ke(Ce, {
            key: 0,
            "min-height": "44",
            onClick: r.open_audiobook,
            title: "听书"
          }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => t[33] || (t[33] = [
                  te("mdi-headphones")
                ])),
                _: 1
              }),
              t[34] || (t[34] = R("span", null, "听书", -1))
            ]),
            _: 1
          }, 8, ["onClick"])) : Re("", !0),
          f(Ce, {
            ref: "panelEntryAi",
            icon: "",
            title: "更多选项",
            onClick: t[0] || (t[0] = (u) => r.set_menu("ai"))
          }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => t[35] || (t[35] = [
                  te("mdi-dots-vertical")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 512)
        ]),
        _: 1
      })) : Re("", !0),
      f(_1, {
        modelValue: e.menu.value,
        "onUpdate:modelValue": t[3] || (t[3] = (u) => e.menu.value = u),
        active: e.menu.show_navbar,
        "z-index": "2599"
      }, {
        default: T(() => [
          f(Ce, {
            ref: "panelEntryToc",
            value: "toc",
            onClick: t[1] || (t[1] = (u) => r.set_menu("toc"))
          }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => t[36] || (t[36] = [
                  te("mdi-book-open-variant-outline")
                ])),
                _: 1
              }),
              t[37] || (t[37] = R("span", null, "目录", -1))
            ]),
            _: 1
          }, 512),
          f(Ce, { onClick: r.switch_theme }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => [
                  te(_e(r.switch_theme_icon), 1)
                ]),
                _: 1
              }),
              R("span", null, _e(r.switch_theme_text), 1)
            ]),
            _: 1
          }, 8, ["onClick"]),
          f(Ce, {
            ref: "panelEntryAnnotations",
            value: "annotations",
            onClick: r.on_open_annotations
          }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => t[38] || (t[38] = [
                  te("mdi-comment-text-outline")
                ])),
                _: 1
              }),
              t[39] || (t[39] = R("span", null, "评论", -1))
            ]),
            _: 1
          }, 8, ["onClick"]),
          f(Ce, {
            ref: "panelEntrySettings",
            value: "settings",
            onClick: t[2] || (t[2] = (u) => r.set_menu("settings"))
          }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => t[40] || (t[40] = [
                  te("mdi-cog")
                ])),
                _: 1
              }),
              t[41] || (t[41] = R("span", null, "设置", -1))
            ]),
            _: 1
          }, 512)
        ]),
        _: 1
      }, 8, ["modelValue", "active"]),
      r.has_audiobook ? (X(), Ke(s, {
        key: 1,
        ref: "audiobookPlayer",
        visible: e.audiobook_open,
        repository: e.audiobook_repository,
        "storage-id": n.initial_book_id || n.book_url,
        rendition: e.rendition,
        onClose: t[4] || (t[4] = (u) => e.audiobook_open = !1)
      }, null, 8, ["visible", "repository", "storage-id", "rendition"])) : Re("", !0),
      f(Uo, {
        class: "fixed mb-14 settings-bottom-sheet reader-side-right",
        "retain-focus": !e.is_wide_screen,
        "max-height": "90%",
        modelValue: e.menu.panels.settings,
        "onUpdate:modelValue": [
          t[5] || (t[5] = (u) => e.menu.panels.settings = u),
          t[6] || (t[6] = (u) => r.on_panel_model_update("settings", u))
        ],
        onAfterLeave: t[7] || (t[7] = (u) => r.on_panel_after_leave("settings")),
        contained: "",
        "z-index": "234"
      }, {
        default: T(() => [
          f(a, {
            settings: e.settings,
            onUpdate: r.update_settings,
            onOpenThemes: r.open_theme_dialog
          }, null, 8, ["settings", "onUpdate", "onOpenThemes"])
        ]),
        _: 1
      }, 8, ["retain-focus", "modelValue"]),
      f(Uo, {
        class: "fixed mb-14 reader-side-left",
        "retain-focus": !e.is_wide_screen,
        "max-height": "90%",
        modelValue: e.menu.panels.toc,
        "onUpdate:modelValue": [
          t[8] || (t[8] = (u) => e.menu.panels.toc = u),
          t[9] || (t[9] = (u) => r.on_panel_model_update("toc", u))
        ],
        onAfterLeave: t[10] || (t[10] = (u) => r.on_panel_after_leave("toc")),
        contained: "",
        "close-on-content-click": "",
        "z-index": "234"
      }, {
        default: T(() => [
          f(l, {
            ref: "bookTocComponent",
            meta: e.book_meta,
            toc_items: e.toc_items,
            "current-chapter": e.current_toc,
            "onClick:select": r.on_click_toc
          }, null, 8, ["meta", "toc_items", "current-chapter", "onClick:select"])
        ]),
        _: 1
      }, 8, ["retain-focus", "modelValue"]),
      f(Uo, {
        class: "fixed mb-14 annotation-bottom-sheet reader-side-right",
        "retain-focus": !e.is_wide_screen,
        modelValue: e.menu.panels.annotations,
        "onUpdate:modelValue": [
          t[12] || (t[12] = (u) => e.menu.panels.annotations = u),
          t[13] || (t[13] = (u) => r.on_panel_model_update("annotations", u))
        ],
        onAfterLeave: t[14] || (t[14] = (u) => r.on_panel_after_leave("annotations")),
        contained: "",
        eager: "",
        "z-index": "234",
        "aria-label": "评论"
      }, {
        default: T(() => [
          R("div", V1, [
            f(c, {
              ref: "comments",
              repository: e.annotation_repository,
              user: e.user,
              chapter: r.comment_chapter,
              active: e.menu.panels.annotations,
              onWrite: r.on_write_comment,
              onEdit: r.on_edit_comment,
              onLogin: r.request_login,
              onChanged: r.on_comments_changed,
              onFeedback: r.show_annotation_feedback,
              onClose: t[11] || (t[11] = (u) => r.set_menu("hide"))
            }, null, 8, ["repository", "user", "chapter", "active", "onWrite", "onEdit", "onLogin", "onChanged", "onFeedback"])
          ])
        ]),
        _: 1
      }, 8, ["retain-focus", "modelValue"]),
      r.side_panel ? (X(), Ke(d, {
        key: r.side_panel.name,
        side: r.side_panel.side,
        label: `调整${r.side_panel.label}宽度`,
        width: r.panel_width(r.side_panel.name),
        min: e.PANEL_MIN_WIDTH,
        max: r.panel_max_width,
        "onUpdate:width": t[15] || (t[15] = (u) => r.set_panel_width(r.side_panel.name, u)),
        onCommit: r.save_panel_widths,
        onReset: t[16] || (t[16] = (u) => r.reset_panel_width(r.side_panel.name))
      }, null, 8, ["side", "label", "width", "min", "max", "onCommit"])) : Re("", !0),
      f(Uo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.ai,
        "onUpdate:modelValue": [
          t[17] || (t[17] = (u) => e.menu.panels.ai = u),
          t[18] || (t[18] = (u) => r.on_panel_model_update("ai", u))
        ],
        onAfterLeave: t[19] || (t[19] = (u) => r.on_panel_after_leave("ai")),
        contained: "",
        "z-index": "234"
      }, {
        default: T(() => [
          f(eo, { title: "开发中" })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Hn, {
        modelValue: e.annotation_editor_open,
        "onUpdate:modelValue": t[25] || (t[25] = (u) => e.annotation_editor_open = u),
        class: "annotation-editor-dialog rc-above-standalone",
        "max-width": "560",
        persistent: e.annotation_saving,
        "aria-labelledby": "annotation-editor-title",
        onAfterLeave: r.on_annotation_editor_closed
      }, {
        default: T(() => [
          f(eo, {
            class: "annotation-editor-card",
            color: "surface"
          }, {
            default: T(() => {
              var u;
              return [
                R("header", O1, [
                  R("h2", T1, _e(r.annotation_editor_title), 1),
                  f(Ce, {
                    icon: "mdi-close",
                    variant: "text",
                    size: "small",
                    "aria-label": "关闭评论编辑框",
                    "min-width": "44",
                    "min-height": "44",
                    disabled: e.annotation_saving,
                    onClick: t[20] || (t[20] = (m) => e.annotation_editor_open = !1)
                  }, null, 8, ["disabled"])
                ]),
                f(so, { class: "annotation-editor-body" }, {
                  default: T(() => {
                    var m, g, h, v;
                    return [
                      r.annotation_editor_quote ? (X(), ce("section", A1, [
                        R("div", D1, [
                          t[42] || (t[42] = R("span", { id: "annotation-reference-title" }, "引用原文", -1)),
                          R("span", I1, _e(((g = (m = e.annotation_editor_location) == null ? void 0 : m.toc) == null ? void 0 : g.label) || ((h = e.annotation_editor_record) == null ? void 0 : h.chapter) || e.current_toc_title), 1)
                        ]),
                        R("blockquote", P1, _e(r.annotation_editor_quote), 1),
                        R("p", $1, _e((v = e.annotation_editor_location) != null && v.multi_paragraph ? "跨段选区 · 评论归属最后一段。" : "评论关联整个段落。"), 1)
                      ])) : (X(), ce("p", M1, "针对整本《" + _e(e.book_title) + "》写下你的感受，发布后在「全书评论」中展示。", 1)),
                      f(fm, {
                        ref: "annotationEditorContent",
                        modelValue: e.annotation_editor_content,
                        "onUpdate:modelValue": [
                          t[21] || (t[21] = (_) => e.annotation_editor_content = _),
                          t[22] || (t[22] = (_) => e.annotation_editor_error = "")
                        ],
                        class: "annotation-editor-input",
                        label: "评论内容",
                        variant: "outlined",
                        density: "comfortable",
                        rows: "5",
                        autofocus: "",
                        "persistent-placeholder": "",
                        placeholder: "写下你的想法…",
                        readonly: e.annotation_saving,
                        "error-messages": e.annotation_editor_error
                      }, null, 8, ["modelValue", "readonly", "error-messages"])
                    ];
                  }),
                  _: 1
                }),
                R("footer", L1, [
                  R("div", F1, [
                    f(Om, {
                      id: "annotation-public-switch",
                      class: "annotation-visibility",
                      "model-value": !e.annotation_editor_private,
                      disabled: e.annotation_saving,
                      role: "switch",
                      color: "primary",
                      density: "comfortable",
                      inset: "",
                      "hide-details": "",
                      "aria-labelledby": "annotation-public-label",
                      "aria-describedby": "annotation-visibility-hint",
                      "onUpdate:modelValue": t[23] || (t[23] = (m) => e.annotation_editor_private = !m)
                    }, null, 8, ["model-value", "disabled"]),
                    R("label", {
                      id: "annotation-public-label",
                      for: "annotation-public-switch",
                      class: Vt(["annotation-visibility-label", { "annotation-visibility-label-disabled": e.annotation_saving }])
                    }, "公开这条评论", 2)
                  ]),
                  R("p", B1, _e(((u = e.annotation_repository) == null ? void 0 : u.source) === "localStorage" ? "仅保存在当前浏览器，公开范围暂不生效。" : e.annotation_editor_private ? "只有你能看到这条评论。" : "其他读者可以在对应评论范围看到这条评论。"), 1),
                  f(Vr, { class: "annotation-editor-actions" }, {
                    default: T(() => [
                      f(nr),
                      f(Ce, {
                        variant: "text",
                        disabled: e.annotation_saving,
                        onClick: t[24] || (t[24] = (m) => e.annotation_editor_open = !1)
                      }, {
                        default: T(() => t[43] || (t[43] = [
                          te("取消")
                        ])),
                        _: 1
                      }, 8, ["disabled"]),
                      f(Ce, {
                        variant: "flat",
                        color: "primary",
                        loading: e.annotation_saving,
                        onClick: r.save_note
                      }, {
                        default: T(() => t[44] || (t[44] = [
                          te("保存")
                        ])),
                        _: 1
                      }, 8, ["loading", "onClick"])
                    ]),
                    _: 1
                  })
                ])
              ];
            }),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue", "persistent", "onAfterLeave"]),
      f(E1, {
        modelValue: e.annotation_feedback_visible,
        "onUpdate:modelValue": t[27] || (t[27] = (u) => e.annotation_feedback_visible = u),
        class: "annotation-feedback",
        color: e.annotation_feedback_error ? "error" : "primary",
        timeout: e.annotation_feedback_error ? -1 : 5e3
      }, {
        actions: T(() => [
          f(Ce, {
            variant: "text",
            onClick: t[26] || (t[26] = (u) => e.annotation_feedback_visible = !1)
          }, {
            default: T(() => t[45] || (t[45] = [
              te("关闭")
            ])),
            _: 1
          })
        ]),
        default: T(() => [
          te(_e(e.annotation_feedback_message) + " ", 1)
        ]),
        _: 1
      }, 8, ["modelValue", "color", "timeout"]),
      (X(!0), ce(fe, null, At(e.selection_preview_rects, (u, m) => (X(), ce("div", {
        key: m,
        class: "selection-preview",
        style: Rt(u),
        "aria-hidden": "true"
      }, null, 4))), 128)),
      vt(R("div", {
        id: "comments-toolbar",
        ref: "selectionToolbar",
        role: "group",
        "aria-label": "选中文字操作",
        style: Rt(`left: ${e.toolbar_left}px; top: ${e.toolbar_top}px;`)
      }, [
        R("div", R1, [
          f(Ce, {
            class: "selection-toolbar-action",
            variant: "text",
            onClick: r.copy_selection
          }, {
            default: T(() => [
              f(Ve, {
                size: "18",
                "aria-hidden": "true"
              }, {
                default: T(() => t[46] || (t[46] = [
                  te("mdi-content-copy")
                ])),
                _: 1
              }),
              t[47] || (t[47] = R("span", null, "复制", -1))
            ]),
            _: 1
          }, 8, ["onClick"]),
          f(Ce, {
            class: "selection-toolbar-action",
            variant: "text",
            loading: e.annotation_saving,
            onClick: r.save_highlight
          }, {
            default: T(() => [
              f(Ve, {
                size: "18",
                "aria-hidden": "true"
              }, {
                default: T(() => t[48] || (t[48] = [
                  te("mdi-format-underline")
                ])),
                _: 1
              }),
              t[49] || (t[49] = R("span", null, "划线", -1))
            ]),
            _: 1
          }, 8, ["loading", "onClick"]),
          f(Ce, {
            class: "selection-toolbar-action",
            variant: "text",
            disabled: e.annotation_saving || !e.selected_location.paragraph_cfi,
            onClick: r.open_note_editor
          }, {
            default: T(() => [
              f(Ve, {
                size: "18",
                "aria-hidden": "true"
              }, {
                default: T(() => t[50] || (t[50] = [
                  te("mdi-square-edit-outline")
                ])),
                _: 1
              }),
              t[51] || (t[51] = R("span", null, "写评论", -1))
            ]),
            _: 1
          }, 8, ["disabled", "onClick"]),
          f(Ce, {
            class: "selection-toolbar-action",
            variant: "text",
            disabled: e.annotation_saving || !e.selected_location.paragraph_cfi,
            onClick: r.on_view_selection_notes
          }, {
            default: T(() => [
              f(Ve, {
                size: "18",
                "aria-hidden": "true"
              }, {
                default: T(() => t[52] || (t[52] = [
                  te("mdi-comment-text-outline")
                ])),
                _: 1
              }),
              t[53] || (t[53] = R("span", null, "看本段评论", -1))
            ]),
            _: 1
          }, 8, ["disabled", "onClick"]),
          r.has_audiobook ? (X(), Ke(Ce, {
            key: 0,
            class: "selection-toolbar-action",
            variant: "text",
            onClick: r.on_click_toolbar_listen
          }, {
            default: T(() => [
              f(Ve, {
                size: "18",
                "aria-hidden": "true"
              }, {
                default: T(() => t[54] || (t[54] = [
                  te("mdi-headphones")
                ])),
                _: 1
              }),
              t[55] || (t[55] = R("span", null, "从这里听", -1))
            ]),
            _: 1
          }, 8, ["onClick"])) : Re("", !0)
        ])
      ], 4), [
        [Wn, r.is_toolbar_visible()]
      ]),
      f(S1, {
        id: "main",
        class: "pa-0"
      }, {
        default: T(() => [
          f(bo, {
            modelValue: e.loading,
            "onUpdate:modelValue": t[28] || (t[28] = (u) => e.loading = u),
            "z-index": "auto",
            class: "align-center justify-center",
            persistent: ""
          }, {
            default: T(() => [
              f(Jr, {
                indeterminate: "",
                size: "64",
                color: "primary"
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          f(Hn, {
            modelValue: e.showTimeoutDialog,
            "onUpdate:modelValue": t[30] || (t[30] = (u) => e.showTimeoutDialog = u),
            "max-width": "500px",
            "aria-labelledby": "load-dialog-title"
          }, {
            default: T(() => [
              f(eo, null, {
                default: T(() => [
                  f(Or, {
                    id: "load-dialog-title",
                    class: "text-h5 text-center"
                  }, {
                    default: T(() => [
                      te(_e(e.load_failed ? "加载失败" : "加载较慢"), 1)
                    ]),
                    _: 1
                  }),
                  f(so, { class: "text-center" }, {
                    default: T(() => [
                      te(_e(e.load_failed ? "电子书加载失败，可能是网络问题或文件格式不支持。" : "电子书还在加载，可能是网络较慢。加载完成后此提示会自动关闭。"), 1)
                    ]),
                    _: 1
                  }),
                  f(Vr, { class: "justify-center" }, {
                    default: T(() => [
                      f(Ce, {
                        color: "primary",
                        variant: "text",
                        onClick: t[29] || (t[29] = (u) => e.showTimeoutDialog = !1)
                      }, {
                        default: T(() => [
                          te(_e(e.load_failed ? "关闭" : "继续等待"), 1)
                        ]),
                        _: 1
                      }),
                      f(Ce, {
                        color: "primary",
                        variant: "flat",
                        onClick: r.retryLoad
                      }, {
                        default: T(() => t[56] || (t[56] = [
                          te(" 重试 ")
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
          R("div", {
            id: "status-bar-top",
            class: Vt(e.settings.theme),
            style: Rt(r.status_bar_style)
          }, [
            R("div", H1, _e(e.current_toc_title), 1),
            R("div", j1, " (" + _e(r.readingProgress) + ") ", 1)
          ], 6),
          t[57] || (t[57] = R("div", { id: "reader" }, null, -1)),
          R("div", {
            id: "status-bar-bottom",
            class: Vt(e.settings.theme),
            style: Rt(r.status_bar_style)
          }, [
            R("div", z1, [
              R("div", {
                class: "progress-bar",
                style: Rt({ width: r.readingProgress })
              }, null, 4)
            ])
          ], 6)
        ]),
        _: 1
      }),
      f(Hn, {
        modelValue: e.show_theme_dialog,
        "onUpdate:modelValue": t[32] || (t[32] = (u) => e.show_theme_dialog = u),
        "max-width": "520",
        scrollable: "",
        fullscreen: e.$vuetify.display.smAndDown
      }, {
        default: T(() => [
          f(eo, null, {
            default: T(() => [
              f(Or, { class: "d-flex align-center" }, {
                default: T(() => [
                  t[58] || (t[58] = R("span", null, "阅读皮肤", -1)),
                  f(nr),
                  f(Ce, {
                    icon: "mdi-close",
                    variant: "text",
                    density: "compact",
                    onClick: t[31] || (t[31] = (u) => e.show_theme_dialog = !1)
                  })
                ]),
                _: 1
              }),
              f(so, null, {
                default: T(() => [
                  (X(!0), ce(fe, null, At(r.theme_groups, (u) => (X(), ce(fe, {
                    key: u.mode
                  }, [
                    R("div", U1, _e(u.label), 1),
                    R("div", W1, [
                      (X(!0), ce(fe, null, At(u.items, (m) => (X(), ce("div", {
                        class: "theme-cell",
                        key: m.id
                      }, [
                        R("div", {
                          class: Vt(["theme-card", { active: e.settings.theme === m.id }]),
                          style: Rt(r.theme_card_style(m)),
                          onClick: (g) => r.pick_theme(m)
                        }, [
                          R("span", {
                            class: "theme-sample",
                            style: Rt({ color: m.text })
                          }, _e(m.sample), 5),
                          m.id === e.settings.theme_day || m.id === e.settings.theme_night ? (X(), Ke(Ve, {
                            key: 0,
                            class: "theme-check",
                            size: "18",
                            title: m.mode === "day" ? "当前白天皮肤" : "当前夜晚皮肤"
                          }, {
                            default: T(() => t[59] || (t[59] = [
                              te("mdi-check-circle")
                            ])),
                            _: 2
                          }, 1032, ["title"])) : Re("", !0),
                          e.settings.theme === m.id ? (X(), ce("span", K1, "使用中")) : Re("", !0)
                        ], 14, q1),
                        R("div", G1, _e(m.name), 1)
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
const X1 = /* @__PURE__ */ Vn(N1, [["render", Y1], ["__scopeId", "data-v-8921c6df"]]), J1 = {
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
    audiobook_callbacks: {
      type: Object,
      default: null
    }
  },
  data: () => ({})
};
function Z1(e, t, n, i, o, r) {
  const s = X1;
  return X(), Ke(s, {
    book_url: n.book_url,
    display_url: n.display_url,
    debug: n.debug,
    themes_css: n.themes_css,
    initial_book_id: n.book_id,
    annotation_callbacks: n.annotation_callbacks,
    audiobook_callbacks: n.audiobook_callbacks
  }, null, 8, ["book_url", "display_url", "debug", "themes_css", "initial_book_id", "annotation_callbacks", "audiobook_callbacks"]);
}
const Q1 = /* @__PURE__ */ Vn(J1, [["render", Z1]]);
class eS {
  constructor(t, n) {
    const i = Gg(Q1, n);
    r_(i), i.mount(t);
  }
}
export {
  eS as Reader
};
