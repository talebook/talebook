var dc = {};
/**
* @vue/shared v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function On(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const Fe = dc.NODE_ENV !== "production" ? Object.freeze({}) : {}, Ro = dc.NODE_ENV !== "production" ? Object.freeze([]) : [], st = () => {
}, Gm = () => !1, Ei = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), ls = (e) => e.startsWith("onUpdate:"), Ue = Object.assign, fr = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, Ym = Object.prototype.hasOwnProperty, Ae = (e, t) => Ym.call(e, t), me = Array.isArray, ho = (e) => xi(e) === "[object Map]", Ps = (e) => xi(e) === "[object Set]", ba = (e) => xi(e) === "[object Date]", be = (e) => typeof e == "function", We = (e) => typeof e == "string", hn = (e) => typeof e == "symbol", Ie = (e) => e !== null && typeof e == "object", mr = (e) => (Ie(e) || be(e)) && be(e.then) && be(e.catch), fc = Object.prototype.toString, xi = (e) => fc.call(e), vr = (e) => xi(e).slice(8, -1), mc = (e) => xi(e) === "[object Object]", hr = (e) => We(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, si = /* @__PURE__ */ On(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), qm = /* @__PURE__ */ On(
  "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
), As = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, Xm = /-(\w)/g, ft = As(
  (e) => e.replace(Xm, (t, n) => n ? n.toUpperCase() : "")
), Jm = /\B([A-Z])/g, Jn = As(
  (e) => e.replace(Jm, "-$1").toLowerCase()
), zt = As((e) => e.charAt(0).toUpperCase() + e.slice(1)), uo = As(
  (e) => e ? `on${zt(e)}` : ""
), Yn = (e, t) => !Object.is(e, t), Mo = (e, ...t) => {
  for (let n = 0; n < e.length; n++)
    e[n](...t);
}, rs = (e, t, n, o = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: o,
    value: n
  });
}, vc = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
}, Zm = (e) => {
  const t = We(e) ? Number(e) : NaN;
  return isNaN(t) ? e : t;
};
let _a;
const Ni = () => _a || (_a = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function nn(e) {
  if (me(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const o = e[n], i = We(o) ? nv(o) : nn(o);
      if (i)
        for (const s in i)
          t[s] = i[s];
    }
    return t;
  } else if (We(e) || Ie(e))
    return e;
}
const Qm = /;(?![^(]*\))/g, ev = /:([^]+)/, tv = /\/\*[^]*?\*\//g;
function nv(e) {
  const t = {};
  return e.replace(tv, "").split(Qm).forEach((n) => {
    if (n) {
      const o = n.split(ev);
      o.length > 1 && (t[o[0].trim()] = o[1].trim());
    }
  }), t;
}
function dn(e) {
  let t = "";
  if (We(e))
    t = e;
  else if (me(e))
    for (let n = 0; n < e.length; n++) {
      const o = dn(e[n]);
      o && (t += o + " ");
    }
  else if (Ie(e))
    for (const n in e)
      e[n] && (t += n + " ");
  return t.trim();
}
const ov = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot", iv = "svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,text,textPath,title,tspan,unknown,use,view", sv = "annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics", lv = /* @__PURE__ */ On(ov), rv = /* @__PURE__ */ On(iv), av = /* @__PURE__ */ On(sv), uv = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", cv = /* @__PURE__ */ On(uv);
function hc(e) {
  return !!e || e === "";
}
function dv(e, t) {
  if (e.length !== t.length) return !1;
  let n = !0;
  for (let o = 0; n && o < e.length; o++)
    n = Is(e[o], t[o]);
  return n;
}
function Is(e, t) {
  if (e === t) return !0;
  let n = ba(e), o = ba(t);
  if (n || o)
    return n && o ? e.getTime() === t.getTime() : !1;
  if (n = hn(e), o = hn(t), n || o)
    return e === t;
  if (n = me(e), o = me(t), n || o)
    return n && o ? dv(e, t) : !1;
  if (n = Ie(e), o = Ie(t), n || o) {
    if (!n || !o)
      return !1;
    const i = Object.keys(e).length, s = Object.keys(t).length;
    if (i !== s)
      return !1;
    for (const l in e) {
      const r = e.hasOwnProperty(l), a = t.hasOwnProperty(l);
      if (r && !a || !r && a || !Is(e[l], t[l]))
        return !1;
    }
  }
  return String(e) === String(t);
}
function fv(e, t) {
  return e.findIndex((n) => Is(n, t));
}
const gc = (e) => !!(e && e.__v_isRef === !0), Te = (e) => We(e) ? e : e == null ? "" : me(e) || Ie(e) && (e.toString === fc || !be(e.toString)) ? gc(e) ? Te(e.value) : JSON.stringify(e, pc, 2) : String(e), pc = (e, t) => gc(t) ? pc(e, t.value) : ho(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (n, [o, i], s) => (n[ol(o, s) + " =>"] = i, n),
    {}
  )
} : Ps(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((n) => ol(n))
} : hn(t) ? ol(t) : Ie(t) && !me(t) && !mc(t) ? String(t) : t, ol = (e, t = "") => {
  var n;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    hn(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e
  );
};
var Le = {};
function Wt(e, ...t) {
  console.warn(`[Vue warn] ${e}`, ...t);
}
let wt;
class yc {
  constructor(t = !1) {
    this.detached = t, this._active = !0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.parent = wt, !t && wt && (this.index = (wt.scopes || (wt.scopes = [])).push(
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
      const n = wt;
      try {
        return wt = this, t();
      } finally {
        wt = n;
      }
    } else Le.NODE_ENV !== "production" && Wt("cannot run an inactive effect scope.");
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    wt = this;
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    wt = this.parent;
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
function gr(e) {
  return new yc(e);
}
function mv() {
  return wt;
}
function Zt(e, t = !1) {
  wt ? wt.cleanups.push(e) : Le.NODE_ENV !== "production" && !t && Wt(
    "onScopeDispose() is called when there is no active effect scope to be associated with."
  );
}
let $e;
const il = /* @__PURE__ */ new WeakSet();
class bc {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, wt && wt.active && wt.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, il.has(this) && (il.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || wc(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, wa(this), Sc(this);
    const t = $e, n = qt;
    $e = this, qt = !0;
    try {
      return this.fn();
    } finally {
      Le.NODE_ENV !== "production" && $e !== this && Wt(
        "Active effect was not restored correctly - this is likely a Vue internal bug."
      ), kc(this), $e = t, qt = n, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep)
        br(t);
      this.deps = this.depsTail = void 0, wa(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? il.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    Ol(this) && this.run();
  }
  get dirty() {
    return Ol(this);
  }
}
let _c = 0, li, ri;
function wc(e, t = !1) {
  if (e.flags |= 8, t) {
    e.next = ri, ri = e;
    return;
  }
  e.next = li, li = e;
}
function pr() {
  _c++;
}
function yr() {
  if (--_c > 0)
    return;
  if (ri) {
    let t = ri;
    for (ri = void 0; t; ) {
      const n = t.next;
      t.next = void 0, t.flags &= -9, t = n;
    }
  }
  let e;
  for (; li; ) {
    let t = li;
    for (li = void 0; t; ) {
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
function Sc(e) {
  for (let t = e.deps; t; t = t.nextDep)
    t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function kc(e) {
  let t, n = e.depsTail, o = n;
  for (; o; ) {
    const i = o.prevDep;
    o.version === -1 ? (o === n && (n = i), br(o), vv(o)) : t = o, o.dep.activeLink = o.prevActiveLink, o.prevActiveLink = void 0, o = i;
  }
  e.deps = t, e.depsTail = n;
}
function Ol(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (t.dep.version !== t.version || t.dep.computed && (Cc(t.dep.computed) || t.dep.version !== t.version))
      return !0;
  return !!e._dirty;
}
function Cc(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === di))
    return;
  e.globalVersion = di;
  const t = e.dep;
  if (e.flags |= 2, t.version > 0 && !e.isSSR && e.deps && !Ol(e)) {
    e.flags &= -3;
    return;
  }
  const n = $e, o = qt;
  $e = e, qt = !0;
  try {
    Sc(e);
    const i = e.fn(e._value);
    (t.version === 0 || Yn(i, e._value)) && (e._value = i, t.version++);
  } catch (i) {
    throw t.version++, i;
  } finally {
    $e = n, qt = o, kc(e), e.flags &= -3;
  }
}
function br(e, t = !1) {
  const { dep: n, prevSub: o, nextSub: i } = e;
  if (o && (o.nextSub = i, e.prevSub = void 0), i && (i.prevSub = o, e.nextSub = void 0), Le.NODE_ENV !== "production" && n.subsHead === e && (n.subsHead = i), n.subs === e && (n.subs = o, !o && n.computed)) {
    n.computed.flags &= -5;
    for (let s = n.computed.deps; s; s = s.nextDep)
      br(s, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function vv(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let qt = !0;
const Ec = [];
function Tn() {
  Ec.push(qt), qt = !1;
}
function Dn() {
  const e = Ec.pop();
  qt = e === void 0 ? !0 : e;
}
function wa(e) {
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
let di = 0;
class hv {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class _r {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, Le.NODE_ENV !== "production" && (this.subsHead = void 0);
  }
  track(t) {
    if (!$e || !qt || $e === this.computed)
      return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== $e)
      n = this.activeLink = new hv($e, this), $e.deps ? (n.prevDep = $e.depsTail, $e.depsTail.nextDep = n, $e.depsTail = n) : $e.deps = $e.depsTail = n, xc(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const o = n.nextDep;
      o.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = o), n.prevDep = $e.depsTail, n.nextDep = void 0, $e.depsTail.nextDep = n, $e.depsTail = n, $e.deps === n && ($e.deps = o);
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
    this.version++, di++, this.notify(t);
  }
  notify(t) {
    pr();
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
      yr();
    }
  }
}
function xc(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let o = t.deps; o; o = o.nextDep)
        xc(o);
    }
    const n = e.dep.subs;
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), Le.NODE_ENV !== "production" && e.dep.subsHead === void 0 && (e.dep.subsHead = e), e.dep.subs = e;
  }
}
const as = /* @__PURE__ */ new WeakMap(), go = Symbol(
  Le.NODE_ENV !== "production" ? "Object iterate" : ""
), Tl = Symbol(
  Le.NODE_ENV !== "production" ? "Map keys iterate" : ""
), fi = Symbol(
  Le.NODE_ENV !== "production" ? "Array iterate" : ""
);
function it(e, t, n) {
  if (qt && $e) {
    let o = as.get(e);
    o || as.set(e, o = /* @__PURE__ */ new Map());
    let i = o.get(n);
    i || (o.set(n, i = new _r()), i.map = o, i.key = n), Le.NODE_ENV !== "production" ? i.track({
      target: e,
      type: t,
      key: n
    }) : i.track();
  }
}
function on(e, t, n, o, i, s) {
  const l = as.get(e);
  if (!l) {
    di++;
    return;
  }
  const r = (a) => {
    a && (Le.NODE_ENV !== "production" ? a.trigger({
      target: e,
      type: t,
      key: n,
      newValue: o,
      oldValue: i,
      oldTarget: s
    }) : a.trigger());
  };
  if (pr(), t === "clear")
    l.forEach(r);
  else {
    const a = me(e), d = a && hr(n);
    if (a && n === "length") {
      const u = Number(o);
      l.forEach((c, m) => {
        (m === "length" || m === fi || !hn(m) && m >= u) && r(c);
      });
    } else
      switch ((n !== void 0 || l.has(void 0)) && r(l.get(n)), d && r(l.get(fi)), t) {
        case "add":
          a ? d && r(l.get("length")) : (r(l.get(go)), ho(e) && r(l.get(Tl)));
          break;
        case "delete":
          a || (r(l.get(go)), ho(e) && r(l.get(Tl)));
          break;
        case "set":
          ho(e) && r(l.get(go));
          break;
      }
  }
  yr();
}
function gv(e, t) {
  const n = as.get(e);
  return n && n.get(t);
}
function Po(e) {
  const t = ue(e);
  return t === e ? t : (it(t, "iterate", fi), kt(e) ? t : t.map(ht));
}
function $s(e) {
  return it(e = ue(e), "iterate", fi), e;
}
const pv = {
  __proto__: null,
  [Symbol.iterator]() {
    return sl(this, Symbol.iterator, ht);
  },
  concat(...e) {
    return Po(this).concat(
      ...e.map((t) => me(t) ? Po(t) : t)
    );
  },
  entries() {
    return sl(this, "entries", (e) => (e[1] = ht(e[1]), e));
  },
  every(e, t) {
    return yn(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return yn(this, "filter", e, t, (n) => n.map(ht), arguments);
  },
  find(e, t) {
    return yn(this, "find", e, t, ht, arguments);
  },
  findIndex(e, t) {
    return yn(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return yn(this, "findLast", e, t, ht, arguments);
  },
  findLastIndex(e, t) {
    return yn(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return yn(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return ll(this, "includes", e);
  },
  indexOf(...e) {
    return ll(this, "indexOf", e);
  },
  join(e) {
    return Po(this).join(e);
  },
  // keys() iterator only reads `length`, no optimisation required
  lastIndexOf(...e) {
    return ll(this, "lastIndexOf", e);
  },
  map(e, t) {
    return yn(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return Xo(this, "pop");
  },
  push(...e) {
    return Xo(this, "push", e);
  },
  reduce(e, ...t) {
    return Sa(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return Sa(this, "reduceRight", e, t);
  },
  shift() {
    return Xo(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return yn(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return Xo(this, "splice", e);
  },
  toReversed() {
    return Po(this).toReversed();
  },
  toSorted(e) {
    return Po(this).toSorted(e);
  },
  toSpliced(...e) {
    return Po(this).toSpliced(...e);
  },
  unshift(...e) {
    return Xo(this, "unshift", e);
  },
  values() {
    return sl(this, "values", ht);
  }
};
function sl(e, t, n) {
  const o = $s(e), i = o[t]();
  return o !== e && !kt(e) && (i._next = i.next, i.next = () => {
    const s = i._next();
    return s.value && (s.value = n(s.value)), s;
  }), i;
}
const yv = Array.prototype;
function yn(e, t, n, o, i, s) {
  const l = $s(e), r = l !== e && !kt(e), a = l[t];
  if (a !== yv[t]) {
    const c = a.apply(e, s);
    return r ? ht(c) : c;
  }
  let d = n;
  l !== e && (r ? d = function(c, m) {
    return n.call(this, ht(c), m, e);
  } : n.length > 2 && (d = function(c, m) {
    return n.call(this, c, m, e);
  }));
  const u = a.call(l, d, o);
  return r && i ? i(u) : u;
}
function Sa(e, t, n, o) {
  const i = $s(e);
  let s = n;
  return i !== e && (kt(e) ? n.length > 3 && (s = function(l, r, a) {
    return n.call(this, l, r, a, e);
  }) : s = function(l, r, a) {
    return n.call(this, l, ht(r), a, e);
  }), i[t](s, ...o);
}
function ll(e, t, n) {
  const o = ue(e);
  it(o, "iterate", fi);
  const i = o[t](...n);
  return (i === -1 || i === !1) && mi(n[0]) ? (n[0] = ue(n[0]), o[t](...n)) : i;
}
function Xo(e, t, n = []) {
  Tn(), pr();
  const o = ue(e)[t].apply(e, n);
  return yr(), Dn(), o;
}
const bv = /* @__PURE__ */ On("__proto__,__v_isRef,__isVue"), Nc = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(hn)
);
function _v(e) {
  hn(e) || (e = String(e));
  const t = ue(this);
  return it(t, "has", e), t.hasOwnProperty(e);
}
class Vc {
  constructor(t = !1, n = !1) {
    this._isReadonly = t, this._isShallow = n;
  }
  get(t, n, o) {
    const i = this._isReadonly, s = this._isShallow;
    if (n === "__v_isReactive")
      return !i;
    if (n === "__v_isReadonly")
      return i;
    if (n === "__v_isShallow")
      return s;
    if (n === "__v_raw")
      return o === (i ? s ? Ic : Ac : s ? Pc : Dc).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(o) ? t : void 0;
    const l = me(t);
    if (!i) {
      let a;
      if (l && (a = pv[n]))
        return a;
      if (n === "hasOwnProperty")
        return _v;
    }
    const r = Reflect.get(
      t,
      n,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      He(t) ? t : o
    );
    return (hn(n) ? Nc.has(n) : bv(n)) || (i || it(t, "get", n), s) ? r : He(r) ? l && hr(n) ? r : r.value : Ie(r) ? i ? Vi(r) : dt(r) : r;
  }
}
class Oc extends Vc {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, o, i) {
    let s = t[n];
    if (!this._isShallow) {
      const a = Nn(s);
      if (!kt(o) && !Nn(o) && (s = ue(s), o = ue(o)), !me(t) && He(s) && !He(o))
        return a ? !1 : (s.value = o, !0);
    }
    const l = me(t) && hr(n) ? Number(n) < t.length : Ae(t, n), r = Reflect.set(
      t,
      n,
      o,
      He(t) ? t : i
    );
    return t === ue(i) && (l ? Yn(o, s) && on(t, "set", n, o, s) : on(t, "add", n, o)), r;
  }
  deleteProperty(t, n) {
    const o = Ae(t, n), i = t[n], s = Reflect.deleteProperty(t, n);
    return s && o && on(t, "delete", n, void 0, i), s;
  }
  has(t, n) {
    const o = Reflect.has(t, n);
    return (!hn(n) || !Nc.has(n)) && it(t, "has", n), o;
  }
  ownKeys(t) {
    return it(
      t,
      "iterate",
      me(t) ? "length" : go
    ), Reflect.ownKeys(t);
  }
}
class Tc extends Vc {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return Le.NODE_ENV !== "production" && Wt(
      `Set operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
  deleteProperty(t, n) {
    return Le.NODE_ENV !== "production" && Wt(
      `Delete operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
}
const wv = /* @__PURE__ */ new Oc(), Sv = /* @__PURE__ */ new Tc(), kv = /* @__PURE__ */ new Oc(!0), Cv = /* @__PURE__ */ new Tc(!0), Dl = (e) => e, Ri = (e) => Reflect.getPrototypeOf(e);
function Ev(e, t, n) {
  return function(...o) {
    const i = this.__v_raw, s = ue(i), l = ho(s), r = e === "entries" || e === Symbol.iterator && l, a = e === "keys" && l, d = i[e](...o), u = n ? Dl : t ? Pl : ht;
    return !t && it(
      s,
      "iterate",
      a ? Tl : go
    ), {
      // iterator protocol
      next() {
        const { value: c, done: m } = d.next();
        return m ? { value: c, done: m } : {
          value: r ? [u(c[0]), u(c[1])] : u(c),
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
function Hi(e) {
  return function(...t) {
    if (Le.NODE_ENV !== "production") {
      const n = t[0] ? `on key "${t[0]}" ` : "";
      Wt(
        `${zt(e)} operation ${n}failed: target is readonly.`,
        ue(this)
      );
    }
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function xv(e, t) {
  const n = {
    get(i) {
      const s = this.__v_raw, l = ue(s), r = ue(i);
      e || (Yn(i, r) && it(l, "get", i), it(l, "get", r));
      const { has: a } = Ri(l), d = t ? Dl : e ? Pl : ht;
      if (a.call(l, i))
        return d(s.get(i));
      if (a.call(l, r))
        return d(s.get(r));
      s !== l && s.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return !e && it(ue(i), "iterate", go), Reflect.get(i, "size", i);
    },
    has(i) {
      const s = this.__v_raw, l = ue(s), r = ue(i);
      return e || (Yn(i, r) && it(l, "has", i), it(l, "has", r)), i === r ? s.has(i) : s.has(i) || s.has(r);
    },
    forEach(i, s) {
      const l = this, r = l.__v_raw, a = ue(r), d = t ? Dl : e ? Pl : ht;
      return !e && it(a, "iterate", go), r.forEach((u, c) => i.call(s, d(u), d(c), l));
    }
  };
  return Ue(
    n,
    e ? {
      add: Hi("add"),
      set: Hi("set"),
      delete: Hi("delete"),
      clear: Hi("clear")
    } : {
      add(i) {
        !t && !kt(i) && !Nn(i) && (i = ue(i));
        const s = ue(this);
        return Ri(s).has.call(s, i) || (s.add(i), on(s, "add", i, i)), this;
      },
      set(i, s) {
        !t && !kt(s) && !Nn(s) && (s = ue(s));
        const l = ue(this), { has: r, get: a } = Ri(l);
        let d = r.call(l, i);
        d ? Le.NODE_ENV !== "production" && ka(l, r, i) : (i = ue(i), d = r.call(l, i));
        const u = a.call(l, i);
        return l.set(i, s), d ? Yn(s, u) && on(l, "set", i, s, u) : on(l, "add", i, s), this;
      },
      delete(i) {
        const s = ue(this), { has: l, get: r } = Ri(s);
        let a = l.call(s, i);
        a ? Le.NODE_ENV !== "production" && ka(s, l, i) : (i = ue(i), a = l.call(s, i));
        const d = r ? r.call(s, i) : void 0, u = s.delete(i);
        return a && on(s, "delete", i, void 0, d), u;
      },
      clear() {
        const i = ue(this), s = i.size !== 0, l = Le.NODE_ENV !== "production" ? ho(i) ? new Map(i) : new Set(i) : void 0, r = i.clear();
        return s && on(
          i,
          "clear",
          void 0,
          void 0,
          l
        ), r;
      }
    }
  ), [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ].forEach((i) => {
    n[i] = Ev(i, e, t);
  }), n;
}
function Ms(e, t) {
  const n = xv(e, t);
  return (o, i, s) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? o : Reflect.get(
    Ae(n, i) && i in o ? n : o,
    i,
    s
  );
}
const Nv = {
  get: /* @__PURE__ */ Ms(!1, !1)
}, Vv = {
  get: /* @__PURE__ */ Ms(!1, !0)
}, Ov = {
  get: /* @__PURE__ */ Ms(!0, !1)
}, Tv = {
  get: /* @__PURE__ */ Ms(!0, !0)
};
function ka(e, t, n) {
  const o = ue(n);
  if (o !== n && t.call(e, o)) {
    const i = vr(e);
    Wt(
      `Reactive ${i} contains both the raw and reactive versions of the same object${i === "Map" ? " as keys" : ""}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`
    );
  }
}
const Dc = /* @__PURE__ */ new WeakMap(), Pc = /* @__PURE__ */ new WeakMap(), Ac = /* @__PURE__ */ new WeakMap(), Ic = /* @__PURE__ */ new WeakMap();
function Dv(e) {
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
function Pv(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : Dv(vr(e));
}
function dt(e) {
  return Nn(e) ? e : Fs(
    e,
    !1,
    wv,
    Nv,
    Dc
  );
}
function Av(e) {
  return Fs(
    e,
    !1,
    kv,
    Vv,
    Pc
  );
}
function Vi(e) {
  return Fs(
    e,
    !0,
    Sv,
    Ov,
    Ac
  );
}
function ln(e) {
  return Fs(
    e,
    !0,
    Cv,
    Tv,
    Ic
  );
}
function Fs(e, t, n, o, i) {
  if (!Ie(e))
    return Le.NODE_ENV !== "production" && Wt(
      `value cannot be made ${t ? "readonly" : "reactive"}: ${String(
        e
      )}`
    ), e;
  if (e.__v_raw && !(t && e.__v_isReactive))
    return e;
  const s = i.get(e);
  if (s)
    return s;
  const l = Pv(e);
  if (l === 0)
    return e;
  const r = new Proxy(
    e,
    l === 2 ? o : n
  );
  return i.set(e, r), r;
}
function po(e) {
  return Nn(e) ? po(e.__v_raw) : !!(e && e.__v_isReactive);
}
function Nn(e) {
  return !!(e && e.__v_isReadonly);
}
function kt(e) {
  return !!(e && e.__v_isShallow);
}
function mi(e) {
  return e ? !!e.__v_raw : !1;
}
function ue(e) {
  const t = e && e.__v_raw;
  return t ? ue(t) : e;
}
function $c(e) {
  return !Ae(e, "__v_skip") && Object.isExtensible(e) && rs(e, "__v_skip", !0), e;
}
const ht = (e) => Ie(e) ? dt(e) : e, Pl = (e) => Ie(e) ? Vi(e) : e;
function He(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function le(e) {
  return Mc(e, !1);
}
function Se(e) {
  return Mc(e, !0);
}
function Mc(e, t) {
  return He(e) ? e : new Iv(e, t);
}
class Iv {
  constructor(t, n) {
    this.dep = new _r(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : ue(t), this._value = n ? t : ht(t), this.__v_isShallow = n;
  }
  get value() {
    return Le.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, o = this.__v_isShallow || kt(t) || Nn(t);
    t = o ? t : ue(t), Yn(t, n) && (this._rawValue = t, this._value = o ? t : ht(t), Le.NODE_ENV !== "production" ? this.dep.trigger({
      target: this,
      type: "set",
      key: "value",
      newValue: t,
      oldValue: n
    }) : this.dep.trigger());
  }
}
function rn(e) {
  return He(e) ? e.value : e;
}
const $v = {
  get: (e, t, n) => t === "__v_raw" ? e : rn(Reflect.get(e, t, n)),
  set: (e, t, n, o) => {
    const i = e[t];
    return He(i) && !He(n) ? (i.value = n, !0) : Reflect.set(e, t, n, o);
  }
};
function Fc(e) {
  return po(e) ? e : new Proxy(e, $v);
}
function wr(e) {
  Le.NODE_ENV !== "production" && !mi(e) && Wt("toRefs() expects a reactive object but received a plain one.");
  const t = me(e) ? new Array(e.length) : {};
  for (const n in e)
    t[n] = Lc(e, n);
  return t;
}
class Mv {
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
    return gv(ue(this._object), this._key);
  }
}
class Fv {
  constructor(t) {
    this._getter = t, this.__v_isRef = !0, this.__v_isReadonly = !0, this._value = void 0;
  }
  get value() {
    return this._value = this._getter();
  }
}
function ce(e, t, n) {
  return He(e) ? e : be(e) ? new Fv(e) : Ie(e) && arguments.length > 1 ? Lc(e, t, n) : le(e);
}
function Lc(e, t, n) {
  const o = e[t];
  return He(o) ? o : new Mv(e, t, n);
}
class Lv {
  constructor(t, n, o) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new _r(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = di - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = o;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    $e !== this)
      return wc(this, !0), !0;
  }
  get value() {
    const t = Le.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track();
    return Cc(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter ? this.setter(t) : Le.NODE_ENV !== "production" && Wt("Write operation failed: computed value is readonly");
  }
}
function Bv(e, t, n = !1) {
  let o, i;
  be(e) ? o = e : (o = e.get, i = e.set);
  const s = new Lv(o, i, n);
  return Le.NODE_ENV !== "production" && t && !n && (s.onTrack = t.onTrack, s.onTrigger = t.onTrigger), s;
}
const ji = {}, us = /* @__PURE__ */ new WeakMap();
let co;
function Rv(e, t = !1, n = co) {
  if (n) {
    let o = us.get(n);
    o || us.set(n, o = []), o.push(e);
  } else Le.NODE_ENV !== "production" && !t && Wt(
    "onWatcherCleanup() was called when there was no active watcher to associate with."
  );
}
function Hv(e, t, n = Fe) {
  const { immediate: o, deep: i, once: s, scheduler: l, augmentJob: r, call: a } = n, d = (C) => {
    (n.onWarn || Wt)(
      "Invalid watch source: ",
      C,
      "A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types."
    );
  }, u = (C) => i ? C : kt(C) || i === !1 || i === 0 ? Cn(C, 1) : Cn(C);
  let c, m, v, h, g = !1, _ = !1;
  if (He(e) ? (m = () => e.value, g = kt(e)) : po(e) ? (m = () => u(e), g = !0) : me(e) ? (_ = !0, g = e.some((C) => po(C) || kt(C)), m = () => e.map((C) => {
    if (He(C))
      return C.value;
    if (po(C))
      return u(C);
    if (be(C))
      return a ? a(C, 2) : C();
    Le.NODE_ENV !== "production" && d(C);
  })) : be(e) ? t ? m = a ? () => a(e, 2) : e : m = () => {
    if (v) {
      Tn();
      try {
        v();
      } finally {
        Dn();
      }
    }
    const C = co;
    co = c;
    try {
      return a ? a(e, 3, [h]) : e(h);
    } finally {
      co = C;
    }
  } : (m = st, Le.NODE_ENV !== "production" && d(e)), t && i) {
    const C = m, E = i === !0 ? 1 / 0 : i;
    m = () => Cn(C(), E);
  }
  const x = mv(), V = () => {
    c.stop(), x && fr(x.effects, c);
  };
  if (s && t) {
    const C = t;
    t = (...E) => {
      C(...E), V();
    };
  }
  let A = _ ? new Array(e.length).fill(ji) : ji;
  const D = (C) => {
    if (!(!(c.flags & 1) || !c.dirty && !C))
      if (t) {
        const E = c.run();
        if (i || g || (_ ? E.some((F, N) => Yn(F, A[N])) : Yn(E, A))) {
          v && v();
          const F = co;
          co = c;
          try {
            const N = [
              E,
              // pass undefined as the old value when it's changed for the first time
              A === ji ? void 0 : _ && A[0] === ji ? [] : A,
              h
            ];
            a ? a(t, 3, N) : (
              // @ts-expect-error
              t(...N)
            ), A = E;
          } finally {
            co = F;
          }
        }
      } else
        c.run();
  };
  return r && r(D), c = new bc(m), c.scheduler = l ? () => l(D, !1) : D, h = (C) => Rv(C, !1, c), v = c.onStop = () => {
    const C = us.get(c);
    if (C) {
      if (a)
        a(C, 4);
      else
        for (const E of C) E();
      us.delete(c);
    }
  }, Le.NODE_ENV !== "production" && (c.onTrack = n.onTrack, c.onTrigger = n.onTrigger), t ? o ? D(!0) : A = c.run() : l ? l(D.bind(null, !0), !0) : c.run(), V.pause = c.pause.bind(c), V.resume = c.resume.bind(c), V.stop = V, V;
}
function Cn(e, t = 1 / 0, n) {
  if (t <= 0 || !Ie(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e)))
    return e;
  if (n.add(e), t--, He(e))
    Cn(e.value, t, n);
  else if (me(e))
    for (let o = 0; o < e.length; o++)
      Cn(e[o], t, n);
  else if (Ps(e) || ho(e))
    e.forEach((o) => {
      Cn(o, t, n);
    });
  else if (mc(e)) {
    for (const o in e)
      Cn(e[o], t, n);
    for (const o of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, o) && Cn(e[o], t, n);
  }
  return e;
}
var S = {};
const yo = [];
function qi(e) {
  yo.push(e);
}
function Xi() {
  yo.pop();
}
let rl = !1;
function W(e, ...t) {
  if (rl) return;
  rl = !0, Tn();
  const n = yo.length ? yo[yo.length - 1].component : null, o = n && n.appContext.config.warnHandler, i = jv();
  if (o)
    Yo(
      o,
      n,
      11,
      [
        // eslint-disable-next-line no-restricted-syntax
        e + t.map((s) => {
          var l, r;
          return (r = (l = s.toString) == null ? void 0 : l.call(s)) != null ? r : JSON.stringify(s);
        }).join(""),
        n && n.proxy,
        i.map(
          ({ vnode: s }) => `at <${zs(n, s.type)}>`
        ).join(`
`),
        i
      ]
    );
  else {
    const s = [`[Vue warn]: ${e}`, ...t];
    i.length && s.push(`
`, ...zv(i)), console.warn(...s);
  }
  Dn(), rl = !1;
}
function jv() {
  let e = yo[yo.length - 1];
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
function zv(e) {
  const t = [];
  return e.forEach((n, o) => {
    t.push(...o === 0 ? [] : [`
`], ...Wv(n));
  }), t;
}
function Wv({ vnode: e, recurseCount: t }) {
  const n = t > 0 ? `... (${t} recursive calls)` : "", o = e.component ? e.component.parent == null : !1, i = ` at <${zs(
    e.component,
    e.type,
    o
  )}`, s = ">" + n;
  return e.props ? [i, ...Uv(e.props), s] : [i + s];
}
function Uv(e) {
  const t = [], n = Object.keys(e);
  return n.slice(0, 3).forEach((o) => {
    t.push(...Bc(o, e[o]));
  }), n.length > 3 && t.push(" ..."), t;
}
function Bc(e, t, n) {
  return We(t) ? (t = JSON.stringify(t), n ? t : [`${e}=${t}`]) : typeof t == "number" || typeof t == "boolean" || t == null ? n ? t : [`${e}=${t}`] : He(t) ? (t = Bc(e, ue(t.value), !0), n ? t : [`${e}=Ref<`, t, ">"]) : be(t) ? [`${e}=fn${t.name ? `<${t.name}>` : ""}`] : (t = ue(t), n ? t : [`${e}=`, t]);
}
function Kv(e, t) {
  S.NODE_ENV !== "production" && e !== void 0 && (typeof e != "number" ? W(`${t} is not a valid number - got ${JSON.stringify(e)}.`) : isNaN(e) && W(`${t} is NaN - the duration expression might be incorrect.`));
}
const Sr = {
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
function Yo(e, t, n, o) {
  try {
    return o ? e(...o) : e();
  } catch (i) {
    Oi(i, t, n);
  }
}
function Xt(e, t, n, o) {
  if (be(e)) {
    const i = Yo(e, t, n, o);
    return i && mr(i) && i.catch((s) => {
      Oi(s, t, n);
    }), i;
  }
  if (me(e)) {
    const i = [];
    for (let s = 0; s < e.length; s++)
      i.push(Xt(e[s], t, n, o));
    return i;
  } else S.NODE_ENV !== "production" && W(
    `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof e}`
  );
}
function Oi(e, t, n, o = !0) {
  const i = t ? t.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: l } = t && t.appContext.config || Fe;
  if (t) {
    let r = t.parent;
    const a = t.proxy, d = S.NODE_ENV !== "production" ? Sr[n] : `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; r; ) {
      const u = r.ec;
      if (u) {
        for (let c = 0; c < u.length; c++)
          if (u[c](e, a, d) === !1)
            return;
      }
      r = r.parent;
    }
    if (s) {
      Tn(), Yo(s, null, 10, [
        e,
        a,
        d
      ]), Dn();
      return;
    }
  }
  Gv(e, n, i, o, l);
}
function Gv(e, t, n, o = !0, i = !1) {
  if (S.NODE_ENV !== "production") {
    const s = Sr[t];
    if (n && qi(n), W(`Unhandled error${s ? ` during execution of ${s}` : ""}`), n && Xi(), o)
      throw e;
    console.error(e);
  } else {
    if (i)
      throw e;
    console.error(e);
  }
}
const St = [];
let tn = -1;
const Ho = [];
let Wn = null, Fo = 0;
const Rc = /* @__PURE__ */ Promise.resolve();
let cs = null;
const Yv = 100;
function Et(e) {
  const t = cs || Rc;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function qv(e) {
  let t = tn + 1, n = St.length;
  for (; t < n; ) {
    const o = t + n >>> 1, i = St[o], s = vi(i);
    s < e || s === e && i.flags & 2 ? t = o + 1 : n = o;
  }
  return t;
}
function Ls(e) {
  if (!(e.flags & 1)) {
    const t = vi(e), n = St[St.length - 1];
    !n || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= vi(n) ? St.push(e) : St.splice(qv(t), 0, e), e.flags |= 1, Hc();
  }
}
function Hc() {
  cs || (cs = Rc.then(Wc));
}
function jc(e) {
  me(e) ? Ho.push(...e) : Wn && e.id === -1 ? Wn.splice(Fo + 1, 0, e) : e.flags & 1 || (Ho.push(e), e.flags |= 1), Hc();
}
function Ca(e, t, n = tn + 1) {
  for (S.NODE_ENV !== "production" && (t = t || /* @__PURE__ */ new Map()); n < St.length; n++) {
    const o = St[n];
    if (o && o.flags & 2) {
      if (e && o.id !== e.uid || S.NODE_ENV !== "production" && kr(t, o))
        continue;
      St.splice(n, 1), n--, o.flags & 4 && (o.flags &= -2), o(), o.flags & 4 || (o.flags &= -2);
    }
  }
}
function zc(e) {
  if (Ho.length) {
    const t = [...new Set(Ho)].sort(
      (n, o) => vi(n) - vi(o)
    );
    if (Ho.length = 0, Wn) {
      Wn.push(...t);
      return;
    }
    for (Wn = t, S.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map()), Fo = 0; Fo < Wn.length; Fo++) {
      const n = Wn[Fo];
      S.NODE_ENV !== "production" && kr(e, n) || (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2);
    }
    Wn = null, Fo = 0;
  }
}
const vi = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function Wc(e) {
  S.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map());
  const t = S.NODE_ENV !== "production" ? (n) => kr(e, n) : st;
  try {
    for (tn = 0; tn < St.length; tn++) {
      const n = St[tn];
      if (n && !(n.flags & 8)) {
        if (S.NODE_ENV !== "production" && t(n))
          continue;
        n.flags & 4 && (n.flags &= -2), Yo(
          n,
          n.i,
          n.i ? 15 : 14
        ), n.flags & 4 || (n.flags &= -2);
      }
    }
  } finally {
    for (; tn < St.length; tn++) {
      const n = St[tn];
      n && (n.flags &= -2);
    }
    tn = -1, St.length = 0, zc(e), cs = null, (St.length || Ho.length) && Wc(e);
  }
}
function kr(e, t) {
  const n = e.get(t) || 0;
  if (n > Yv) {
    const o = t.i, i = o && Ir(o.type);
    return Oi(
      `Maximum recursive updates exceeded${i ? ` in component <${i}>` : ""}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`,
      null,
      10
    ), !0;
  }
  return e.set(t, n + 1), !1;
}
let Yt = !1;
const Ji = /* @__PURE__ */ new Map();
S.NODE_ENV !== "production" && (Ni().__VUE_HMR_RUNTIME__ = {
  createRecord: al(Uc),
  rerender: al(Zv),
  reload: al(Qv)
});
const Co = /* @__PURE__ */ new Map();
function Xv(e) {
  const t = e.type.__hmrId;
  let n = Co.get(t);
  n || (Uc(t, e.type), n = Co.get(t)), n.instances.add(e);
}
function Jv(e) {
  Co.get(e.type.__hmrId).instances.delete(e);
}
function Uc(e, t) {
  return Co.has(e) ? !1 : (Co.set(e, {
    initialDef: ds(t),
    instances: /* @__PURE__ */ new Set()
  }), !0);
}
function ds(e) {
  return Id(e) ? e.__vccOpts : e;
}
function Zv(e, t) {
  const n = Co.get(e);
  n && (n.initialDef.render = t, [...n.instances].forEach((o) => {
    t && (o.render = t, ds(o.type).render = t), o.renderCache = [], Yt = !0, o.update(), Yt = !1;
  }));
}
function Qv(e, t) {
  const n = Co.get(e);
  if (!n) return;
  t = ds(t), Ea(n.initialDef, t);
  const o = [...n.instances];
  for (let i = 0; i < o.length; i++) {
    const s = o[i], l = ds(s.type);
    let r = Ji.get(l);
    r || (l !== n.initialDef && Ea(l, t), Ji.set(l, r = /* @__PURE__ */ new Set())), r.add(s), s.appContext.propsCache.delete(s.type), s.appContext.emitsCache.delete(s.type), s.appContext.optionsCache.delete(s.type), s.ceReload ? (r.add(s), s.ceReload(t.styles), r.delete(s)) : s.parent ? Ls(() => {
      Yt = !0, s.parent.update(), Yt = !1, r.delete(s);
    }) : s.appContext.reload ? s.appContext.reload() : typeof window < "u" ? window.location.reload() : console.warn(
      "[HMR] Root or manually mounted instance modified. Full reload required."
    ), s.root.ce && s !== s.root && s.root.ce._removeChildStyle(l);
  }
  jc(() => {
    Ji.clear();
  });
}
function Ea(e, t) {
  Ue(e, t);
  for (const n in e)
    n !== "__file" && !(n in t) && delete e[n];
}
function al(e) {
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
let sn, ni = [], Al = !1;
function Ti(e, ...t) {
  sn ? sn.emit(e, ...t) : Al || ni.push({ event: e, args: t });
}
function Kc(e, t) {
  var n, o;
  sn = e, sn ? (sn.enabled = !0, ni.forEach(({ event: i, args: s }) => sn.emit(i, ...s)), ni = []) : /* handle late devtools injection - only do this if we are in an actual */ /* browser environment to avoid the timer handle stalling test runner exit */ /* (#4815) */ typeof window < "u" && // some envs mock window but not fully
  window.HTMLElement && // also exclude jsdom
  // eslint-disable-next-line no-restricted-syntax
  !((o = (n = window.navigator) == null ? void 0 : n.userAgent) != null && o.includes("jsdom")) ? ((t.__VUE_DEVTOOLS_HOOK_REPLAY__ = t.__VUE_DEVTOOLS_HOOK_REPLAY__ || []).push((s) => {
    Kc(s, t);
  }), setTimeout(() => {
    sn || (t.__VUE_DEVTOOLS_HOOK_REPLAY__ = null, Al = !0, ni = []);
  }, 3e3)) : (Al = !0, ni = []);
}
function eh(e, t) {
  Ti("app:init", e, t, {
    Fragment: Ne,
    Text: Oo,
    Comment: nt,
    Static: Qi
  });
}
function th(e) {
  Ti("app:unmount", e);
}
const nh = /* @__PURE__ */ Cr(
  "component:added"
  /* COMPONENT_ADDED */
), Gc = /* @__PURE__ */ Cr(
  "component:updated"
  /* COMPONENT_UPDATED */
), oh = /* @__PURE__ */ Cr(
  "component:removed"
  /* COMPONENT_REMOVED */
), ih = (e) => {
  sn && typeof sn.cleanupBuffer == "function" && // remove the component if it wasn't buffered
  !sn.cleanupBuffer(e) && oh(e);
};
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Cr(e) {
  return (t) => {
    Ti(
      e,
      t.appContext.app,
      t.uid,
      t.parent ? t.parent.uid : void 0,
      t
    );
  };
}
const sh = /* @__PURE__ */ Yc(
  "perf:start"
  /* PERFORMANCE_START */
), lh = /* @__PURE__ */ Yc(
  "perf:end"
  /* PERFORMANCE_END */
);
function Yc(e) {
  return (t, n, o) => {
    Ti(e, t.appContext.app, t.uid, t, n, o);
  };
}
function rh(e, t, n) {
  Ti(
    "component:emit",
    e.appContext.app,
    e,
    t,
    n
  );
}
let gt = null, qc = null;
function fs(e) {
  const t = gt;
  return gt = e, qc = e && e.type.__scopeId || null, t;
}
function b(e, t = gt, n) {
  if (!t || e._n)
    return e;
  const o = (...i) => {
    o._d && Ra(-1);
    const s = fs(t);
    let l;
    try {
      l = e(...i);
    } finally {
      fs(s), o._d && Ra(1);
    }
    return S.NODE_ENV !== "production" && Gc(t), l;
  };
  return o._n = !0, o._c = !0, o._d = !0, o;
}
function Xc(e) {
  qm(e) && W("Do not use built-in directive ids as custom directive id: " + e);
}
function yt(e, t) {
  if (gt === null)
    return S.NODE_ENV !== "production" && W("withDirectives can only be used inside render functions."), e;
  const n = js(gt), o = e.dirs || (e.dirs = []);
  for (let i = 0; i < t.length; i++) {
    let [s, l, r, a = Fe] = t[i];
    s && (be(s) && (s = {
      mounted: s,
      updated: s
    }), s.deep && Cn(l), o.push({
      dir: s,
      instance: n,
      value: l,
      oldValue: void 0,
      arg: r,
      modifiers: a
    }));
  }
  return e;
}
function so(e, t, n, o) {
  const i = e.dirs, s = t && t.dirs;
  for (let l = 0; l < i.length; l++) {
    const r = i[l];
    s && (r.oldValue = s[l].value);
    let a = r.dir[o];
    a && (Tn(), Xt(a, n, 8, [
      e.el,
      r,
      e,
      t
    ]), Dn());
  }
}
const Jc = Symbol("_vte"), Zc = (e) => e.__isTeleport, bo = (e) => e && (e.disabled || e.disabled === ""), ah = (e) => e && (e.defer || e.defer === ""), xa = (e) => typeof SVGElement < "u" && e instanceof SVGElement, Na = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement, Il = (e, t) => {
  const n = e && e.to;
  if (We(n))
    if (t) {
      const o = t(n);
      return S.NODE_ENV !== "production" && !o && !bo(e) && W(
        `Failed to locate Teleport target with selector "${n}". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.`
      ), o;
    } else
      return S.NODE_ENV !== "production" && W(
        "Current renderer does not support string target for Teleports. (missing querySelector renderer option)"
      ), null;
  else
    return S.NODE_ENV !== "production" && !n && !bo(e) && W(`Invalid Teleport target: ${n}`), n;
}, uh = {
  name: "Teleport",
  __isTeleport: !0,
  process(e, t, n, o, i, s, l, r, a, d) {
    const {
      mc: u,
      pc: c,
      pbc: m,
      o: { insert: v, querySelector: h, createText: g, createComment: _ }
    } = d, x = bo(t.props);
    let { shapeFlag: V, children: A, dynamicChildren: D } = t;
    if (S.NODE_ENV !== "production" && Yt && (a = !1, D = null), e == null) {
      const C = t.el = S.NODE_ENV !== "production" ? _("teleport start") : g(""), E = t.anchor = S.NODE_ENV !== "production" ? _("teleport end") : g("");
      v(C, n, o), v(E, n, o);
      const F = (O, $) => {
        V & 16 && (i && i.isCE && (i.ce._teleportTarget = O), u(
          A,
          O,
          $,
          i,
          s,
          l,
          r,
          a
        ));
      }, N = () => {
        const O = t.target = Il(t.props, h), $ = Qc(O, t, g, v);
        O ? (l !== "svg" && xa(O) ? l = "svg" : l !== "mathml" && Na(O) && (l = "mathml"), x || (F(O, $), Zi(t, !1))) : S.NODE_ENV !== "production" && !x && W(
          "Invalid Teleport target on mount:",
          O,
          `(${typeof O})`
        );
      };
      x && (F(n, E), Zi(t, !0)), ah(t.props) ? Nt(N, s) : N();
    } else {
      t.el = e.el, t.targetStart = e.targetStart;
      const C = t.anchor = e.anchor, E = t.target = e.target, F = t.targetAnchor = e.targetAnchor, N = bo(e.props), O = N ? n : E, $ = N ? C : F;
      if (l === "svg" || xa(E) ? l = "svg" : (l === "mathml" || Na(E)) && (l = "mathml"), D ? (m(
        e.dynamicChildren,
        D,
        O,
        i,
        s,
        l,
        r
      ), ui(e, t, !0)) : a || c(
        e,
        t,
        O,
        $,
        i,
        s,
        l,
        r,
        !1
      ), x)
        N ? t.props && e.props && t.props.to !== e.props.to && (t.props.to = e.props.to) : zi(
          t,
          n,
          C,
          d,
          1
        );
      else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
        const M = t.target = Il(
          t.props,
          h
        );
        M ? zi(
          t,
          M,
          null,
          d,
          0
        ) : S.NODE_ENV !== "production" && W(
          "Invalid Teleport target on update:",
          E,
          `(${typeof E})`
        );
      } else N && zi(
        t,
        E,
        F,
        d,
        1
      );
      Zi(t, x);
    }
  },
  remove(e, t, n, { um: o, o: { remove: i } }, s) {
    const {
      shapeFlag: l,
      children: r,
      anchor: a,
      targetStart: d,
      targetAnchor: u,
      target: c,
      props: m
    } = e;
    if (c && (i(d), i(u)), s && i(a), l & 16) {
      const v = s || !bo(m);
      for (let h = 0; h < r.length; h++) {
        const g = r[h];
        o(
          g,
          t,
          n,
          v,
          !!g.dynamicChildren
        );
      }
    }
  },
  move: zi,
  hydrate: ch
};
function zi(e, t, n, { o: { insert: o }, m: i }, s = 2) {
  s === 0 && o(e.targetAnchor, t, n);
  const { el: l, anchor: r, shapeFlag: a, children: d, props: u } = e, c = s === 2;
  if (c && o(l, t, n), (!c || bo(u)) && a & 16)
    for (let m = 0; m < d.length; m++)
      i(
        d[m],
        t,
        n,
        2
      );
  c && o(r, t, n);
}
function ch(e, t, n, o, i, s, {
  o: { nextSibling: l, parentNode: r, querySelector: a, insert: d, createText: u }
}, c) {
  const m = t.target = Il(
    t.props,
    a
  );
  if (m) {
    const v = bo(t.props), h = m._lpa || m.firstChild;
    if (t.shapeFlag & 16)
      if (v)
        t.anchor = c(
          l(e),
          t,
          r(e),
          n,
          o,
          i,
          s
        ), t.targetStart = h, t.targetAnchor = h && l(h);
      else {
        t.anchor = l(e);
        let g = h;
        for (; g; ) {
          if (g && g.nodeType === 8) {
            if (g.data === "teleport start anchor")
              t.targetStart = g;
            else if (g.data === "teleport anchor") {
              t.targetAnchor = g, m._lpa = t.targetAnchor && l(t.targetAnchor);
              break;
            }
          }
          g = l(g);
        }
        t.targetAnchor || Qc(m, t, u, d), c(
          h && l(h),
          t,
          m,
          n,
          o,
          i,
          s
        );
      }
    Zi(t, v);
  }
  return t.anchor && l(t.anchor);
}
const dh = uh;
function Zi(e, t) {
  const n = e.ctx;
  if (n && n.ut) {
    let o, i;
    for (t ? (o = e.el, i = e.anchor) : (o = e.targetStart, i = e.targetAnchor); o && o !== i; )
      o.nodeType === 1 && o.setAttribute("data-v-owner", n.uid), o = o.nextSibling;
    n.ut();
  }
}
function Qc(e, t, n, o) {
  const i = t.targetStart = n(""), s = t.targetAnchor = n("");
  return i[Jc] = s, e && (o(i, e), o(s, e)), s;
}
const Un = Symbol("_leaveCb"), Wi = Symbol("_enterCb");
function ed() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  return Zn(() => {
    e.isMounted = !0;
  }), xt(() => {
    e.isUnmounting = !0;
  }), e;
}
const Ht = [Function, Array], td = {
  mode: String,
  appear: Boolean,
  persisted: Boolean,
  // enter
  onBeforeEnter: Ht,
  onEnter: Ht,
  onAfterEnter: Ht,
  onEnterCancelled: Ht,
  // leave
  onBeforeLeave: Ht,
  onLeave: Ht,
  onAfterLeave: Ht,
  onLeaveCancelled: Ht,
  // appear
  onBeforeAppear: Ht,
  onAppear: Ht,
  onAfterAppear: Ht,
  onAppearCancelled: Ht
}, nd = (e) => {
  const t = e.subTree;
  return t.component ? nd(t.component) : t;
}, fh = {
  name: "BaseTransition",
  props: td,
  setup(e, { slots: t }) {
    const n = Hs(), o = ed();
    return () => {
      const i = t.default && Er(t.default(), !0);
      if (!i || !i.length)
        return;
      const s = od(i), l = ue(e), { mode: r } = l;
      if (S.NODE_ENV !== "production" && r && r !== "in-out" && r !== "out-in" && r !== "default" && W(`invalid <transition> mode: ${r}`), o.isLeaving)
        return ul(s);
      const a = Va(s);
      if (!a)
        return ul(s);
      let d = hi(
        a,
        l,
        o,
        n,
        // #11061, ensure enterHooks is fresh after clone
        (m) => d = m
      );
      a.type !== nt && Eo(a, d);
      const u = n.subTree, c = u && Va(u);
      if (c && c.type !== nt && !fo(a, c) && nd(n).type !== nt) {
        const m = hi(
          c,
          l,
          o,
          n
        );
        if (Eo(c, m), r === "out-in" && a.type !== nt)
          return o.isLeaving = !0, m.afterLeave = () => {
            o.isLeaving = !1, n.job.flags & 8 || n.update(), delete m.afterLeave;
          }, ul(s);
        r === "in-out" && a.type !== nt && (m.delayLeave = (v, h, g) => {
          const _ = id(
            o,
            c
          );
          _[String(c.key)] = c, v[Un] = () => {
            h(), v[Un] = void 0, delete d.delayedLeave;
          }, d.delayedLeave = g;
        });
      }
      return s;
    };
  }
};
function od(e) {
  let t = e[0];
  if (e.length > 1) {
    let n = !1;
    for (const o of e)
      if (o.type !== nt) {
        if (S.NODE_ENV !== "production" && n) {
          W(
            "<transition> can only be used on a single element or component. Use <transition-group> for lists."
          );
          break;
        }
        if (t = o, n = !0, S.NODE_ENV === "production") break;
      }
  }
  return t;
}
const mh = fh;
function id(e, t) {
  const { leavingVNodes: n } = e;
  let o = n.get(t.type);
  return o || (o = /* @__PURE__ */ Object.create(null), n.set(t.type, o)), o;
}
function hi(e, t, n, o, i) {
  const {
    appear: s,
    mode: l,
    persisted: r = !1,
    onBeforeEnter: a,
    onEnter: d,
    onAfterEnter: u,
    onEnterCancelled: c,
    onBeforeLeave: m,
    onLeave: v,
    onAfterLeave: h,
    onLeaveCancelled: g,
    onBeforeAppear: _,
    onAppear: x,
    onAfterAppear: V,
    onAppearCancelled: A
  } = t, D = String(e.key), C = id(n, e), E = (O, $) => {
    O && Xt(
      O,
      o,
      9,
      $
    );
  }, F = (O, $) => {
    const M = $[1];
    E(O, $), me(O) ? O.every((k) => k.length <= 1) && M() : O.length <= 1 && M();
  }, N = {
    mode: l,
    persisted: r,
    beforeEnter(O) {
      let $ = a;
      if (!n.isMounted)
        if (s)
          $ = _ || a;
        else
          return;
      O[Un] && O[Un](
        !0
        /* cancelled */
      );
      const M = C[D];
      M && fo(e, M) && M.el[Un] && M.el[Un](), E($, [O]);
    },
    enter(O) {
      let $ = d, M = u, k = c;
      if (!n.isMounted)
        if (s)
          $ = x || d, M = V || u, k = A || c;
        else
          return;
      let I = !1;
      const L = O[Wi] = (J) => {
        I || (I = !0, J ? E(k, [O]) : E(M, [O]), N.delayedLeave && N.delayedLeave(), O[Wi] = void 0);
      };
      $ ? F($, [O, L]) : L();
    },
    leave(O, $) {
      const M = String(e.key);
      if (O[Wi] && O[Wi](
        !0
        /* cancelled */
      ), n.isUnmounting)
        return $();
      E(m, [O]);
      let k = !1;
      const I = O[Un] = (L) => {
        k || (k = !0, $(), L ? E(g, [O]) : E(h, [O]), O[Un] = void 0, C[M] === e && delete C[M]);
      };
      C[M] = e, v ? F(v, [O, I]) : I();
    },
    clone(O) {
      const $ = hi(
        O,
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
function ul(e) {
  if (Di(e))
    return e = Jt(e), e.children = null, e;
}
function Va(e) {
  if (!Di(e))
    return Zc(e.type) && e.children ? od(e.children) : e;
  if (S.NODE_ENV !== "production" && e.component)
    return e.component.subTree;
  const { shapeFlag: t, children: n } = e;
  if (n) {
    if (t & 16)
      return n[0];
    if (t & 32 && be(n.default))
      return n.default();
  }
}
function Eo(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, Eo(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function Er(e, t = !1, n) {
  let o = [], i = 0;
  for (let s = 0; s < e.length; s++) {
    let l = e[s];
    const r = n == null ? l.key : String(n) + String(l.key != null ? l.key : s);
    l.type === Ne ? (l.patchFlag & 128 && i++, o = o.concat(
      Er(l.children, t, r)
    )) : (t || l.type !== nt) && o.push(r != null ? Jt(l, { key: r }) : l);
  }
  if (i > 1)
    for (let s = 0; s < o.length; s++)
      o[s].patchFlag = -2;
  return o;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function vh(e, t) {
  return be(e) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    Ue({ name: e.name }, t, { setup: e })
  ) : e;
}
function sd(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
const hh = /* @__PURE__ */ new WeakSet();
function $l(e, t, n, o, i = !1) {
  if (me(e)) {
    e.forEach(
      (h, g) => $l(
        h,
        t && (me(t) ? t[g] : t),
        n,
        o,
        i
      )
    );
    return;
  }
  if (ai(o) && !i)
    return;
  const s = o.shapeFlag & 4 ? js(o.component) : o.el, l = i ? null : s, { i: r, r: a } = e;
  if (S.NODE_ENV !== "production" && !r) {
    W(
      "Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function."
    );
    return;
  }
  const d = t && t.r, u = r.refs === Fe ? r.refs = {} : r.refs, c = r.setupState, m = ue(c), v = c === Fe ? () => !1 : (h) => S.NODE_ENV !== "production" && (Ae(m, h) && !He(m[h]) && W(
    `Template ref "${h}" used on a non-ref value. It will not work in the production build.`
  ), hh.has(m[h])) ? !1 : Ae(m, h);
  if (d != null && d !== a && (We(d) ? (u[d] = null, v(d) && (c[d] = null)) : He(d) && (d.value = null)), be(a))
    Yo(a, r, 12, [l, u]);
  else {
    const h = We(a), g = He(a);
    if (h || g) {
      const _ = () => {
        if (e.f) {
          const x = h ? v(a) ? c[a] : u[a] : a.value;
          i ? me(x) && fr(x, s) : me(x) ? x.includes(s) || x.push(s) : h ? (u[a] = [s], v(a) && (c[a] = u[a])) : (a.value = [s], e.k && (u[e.k] = a.value));
        } else h ? (u[a] = l, v(a) && (c[a] = l)) : g ? (a.value = l, e.k && (u[e.k] = l)) : S.NODE_ENV !== "production" && W("Invalid template ref type:", a, `(${typeof a})`);
      };
      l ? (_.id = -1, Nt(_, n)) : _();
    } else S.NODE_ENV !== "production" && W("Invalid template ref type:", a, `(${typeof a})`);
  }
}
Ni().requestIdleCallback;
Ni().cancelIdleCallback;
const ai = (e) => !!e.type.__asyncLoader, Di = (e) => e.type.__isKeepAlive;
function ld(e, t) {
  ad(e, "a", t);
}
function rd(e, t) {
  ad(e, "da", t);
}
function ad(e, t, n = rt) {
  const o = e.__wdc || (e.__wdc = () => {
    let i = n;
    for (; i; ) {
      if (i.isDeactivated)
        return;
      i = i.parent;
    }
    return e();
  });
  if (Bs(t, o, n), n) {
    let i = n.parent;
    for (; i && i.parent; )
      Di(i.parent.vnode) && gh(o, t, n, i), i = i.parent;
  }
}
function gh(e, t, n, o) {
  const i = Bs(
    t,
    e,
    o,
    !0
    /* prepend */
  );
  ud(() => {
    fr(o[t], i);
  }, n);
}
function Bs(e, t, n = rt, o = !1) {
  if (n) {
    const i = n[e] || (n[e] = []), s = t.__weh || (t.__weh = (...l) => {
      Tn();
      const r = Pi(n), a = Xt(t, n, e, l);
      return r(), Dn(), a;
    });
    return o ? i.unshift(s) : i.push(s), s;
  } else if (S.NODE_ENV !== "production") {
    const i = uo(Sr[e].replace(/ hook$/, ""));
    W(
      `${i} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
    );
  }
}
const Pn = (e) => (t, n = rt) => {
  (!pi || e === "sp") && Bs(e, (...o) => t(...o), n);
}, xr = Pn("bm"), Zn = Pn("m"), ph = Pn(
  "bu"
), Nr = Pn("u"), xt = Pn(
  "bum"
), ud = Pn("um"), yh = Pn(
  "sp"
), bh = Pn("rtg"), _h = Pn("rtc");
function wh(e, t = rt) {
  Bs("ec", e, t);
}
const Ml = "components", Sh = "directives", kh = Symbol.for("v-ndc");
function Ch(e) {
  return We(e) && cd(Ml, e, !1) || e;
}
function Vo(e) {
  return cd(Sh, e);
}
function cd(e, t, n = !0, o = !1) {
  const i = gt || rt;
  if (i) {
    const s = i.type;
    if (e === Ml) {
      const r = Ir(
        s,
        !1
      );
      if (r && (r === t || r === ft(t) || r === zt(ft(t))))
        return s;
    }
    const l = (
      // local registration
      // check instance[type] first which is resolved for options API
      Oa(i[e] || s[e], t) || // global registration
      Oa(i.appContext[e], t)
    );
    if (!l && o)
      return s;
    if (S.NODE_ENV !== "production" && n && !l) {
      const r = e === Ml ? `
If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.` : "";
      W(`Failed to resolve ${e.slice(0, -1)}: ${t}${r}`);
    }
    return l;
  } else S.NODE_ENV !== "production" && W(
    `resolve${zt(e.slice(0, -1))} can only be used in render() or setup().`
  );
}
function Oa(e, t) {
  return e && (e[t] || e[ft(t)] || e[zt(ft(t))]);
}
function fn(e, t, n, o) {
  let i;
  const s = n, l = me(e);
  if (l || We(e)) {
    const r = l && po(e);
    let a = !1;
    r && (a = !kt(e), e = $s(e)), i = new Array(e.length);
    for (let d = 0, u = e.length; d < u; d++)
      i[d] = t(
        a ? ht(e[d]) : e[d],
        d,
        void 0,
        s
      );
  } else if (typeof e == "number") {
    S.NODE_ENV !== "production" && !Number.isInteger(e) && W(`The v-for range expect an integer value but got ${e}.`), i = new Array(e);
    for (let r = 0; r < e; r++)
      i[r] = t(r + 1, r, void 0, s);
  } else if (Ie(e))
    if (e[Symbol.iterator])
      i = Array.from(
        e,
        (r, a) => t(r, a, void 0, s)
      );
    else {
      const r = Object.keys(e);
      i = new Array(r.length);
      for (let a = 0, d = r.length; a < d; a++) {
        const u = r[a];
        i[a] = t(e[u], u, a, s);
      }
    }
  else
    i = [];
  return i;
}
const Fl = (e) => e ? Pd(e) ? js(e) : Fl(e.parent) : null, _o = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ Ue(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => S.NODE_ENV !== "production" ? ln(e.props) : e.props,
    $attrs: (e) => S.NODE_ENV !== "production" ? ln(e.attrs) : e.attrs,
    $slots: (e) => S.NODE_ENV !== "production" ? ln(e.slots) : e.slots,
    $refs: (e) => S.NODE_ENV !== "production" ? ln(e.refs) : e.refs,
    $parent: (e) => Fl(e.parent),
    $root: (e) => Fl(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Or(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Ls(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Et.bind(e.proxy)),
    $watch: (e) => ng.bind(e)
  })
), Vr = (e) => e === "_" || e === "$", cl = (e, t) => e !== Fe && !e.__isScriptSetup && Ae(e, t), dd = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: n, setupState: o, data: i, props: s, accessCache: l, type: r, appContext: a } = e;
    if (S.NODE_ENV !== "production" && t === "__isVue")
      return !0;
    let d;
    if (t[0] !== "$") {
      const v = l[t];
      if (v !== void 0)
        switch (v) {
          case 1:
            return o[t];
          case 2:
            return i[t];
          case 4:
            return n[t];
          case 3:
            return s[t];
        }
      else {
        if (cl(o, t))
          return l[t] = 1, o[t];
        if (i !== Fe && Ae(i, t))
          return l[t] = 2, i[t];
        if (
          // only cache other properties when instance has declared (thus stable)
          // props
          (d = e.propsOptions[0]) && Ae(d, t)
        )
          return l[t] = 3, s[t];
        if (n !== Fe && Ae(n, t))
          return l[t] = 4, n[t];
        Ll && (l[t] = 0);
      }
    }
    const u = _o[t];
    let c, m;
    if (u)
      return t === "$attrs" ? (it(e.attrs, "get", ""), S.NODE_ENV !== "production" && hs()) : S.NODE_ENV !== "production" && t === "$slots" && it(e, "get", t), u(e);
    if (
      // css module (injected by vue-loader)
      (c = r.__cssModules) && (c = c[t])
    )
      return c;
    if (n !== Fe && Ae(n, t))
      return l[t] = 4, n[t];
    if (
      // global properties
      m = a.config.globalProperties, Ae(m, t)
    )
      return m[t];
    S.NODE_ENV !== "production" && gt && (!We(t) || // #1091 avoid internal isRef/isVNode checks on component instance leading
    // to infinite warning loop
    t.indexOf("__v") !== 0) && (i !== Fe && Vr(t[0]) && Ae(i, t) ? W(
      `Property ${JSON.stringify(
        t
      )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
    ) : e === gt && W(
      `Property ${JSON.stringify(t)} was accessed during render but is not defined on instance.`
    ));
  },
  set({ _: e }, t, n) {
    const { data: o, setupState: i, ctx: s } = e;
    return cl(i, t) ? (i[t] = n, !0) : S.NODE_ENV !== "production" && i.__isScriptSetup && Ae(i, t) ? (W(`Cannot mutate <script setup> binding "${t}" from Options API.`), !1) : o !== Fe && Ae(o, t) ? (o[t] = n, !0) : Ae(e.props, t) ? (S.NODE_ENV !== "production" && W(`Attempting to mutate prop "${t}". Props are readonly.`), !1) : t[0] === "$" && t.slice(1) in e ? (S.NODE_ENV !== "production" && W(
      `Attempting to mutate public property "${t}". Properties starting with $ are reserved and readonly.`
    ), !1) : (S.NODE_ENV !== "production" && t in e.appContext.config.globalProperties ? Object.defineProperty(s, t, {
      enumerable: !0,
      configurable: !0,
      value: n
    }) : s[t] = n, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: n, ctx: o, appContext: i, propsOptions: s }
  }, l) {
    let r;
    return !!n[l] || e !== Fe && Ae(e, l) || cl(t, l) || (r = s[0]) && Ae(r, l) || Ae(o, l) || Ae(_o, l) || Ae(i.config.globalProperties, l);
  },
  defineProperty(e, t, n) {
    return n.get != null ? e._.accessCache[t] = 0 : Ae(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
  }
};
S.NODE_ENV !== "production" && (dd.ownKeys = (e) => (W(
  "Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead."
), Reflect.ownKeys(e)));
function Eh(e) {
  const t = {};
  return Object.defineProperty(t, "_", {
    configurable: !0,
    enumerable: !1,
    get: () => e
  }), Object.keys(_o).forEach((n) => {
    Object.defineProperty(t, n, {
      configurable: !0,
      enumerable: !1,
      get: () => _o[n](e),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: st
    });
  }), t;
}
function xh(e) {
  const {
    ctx: t,
    propsOptions: [n]
  } = e;
  n && Object.keys(n).forEach((o) => {
    Object.defineProperty(t, o, {
      enumerable: !0,
      configurable: !0,
      get: () => e.props[o],
      set: st
    });
  });
}
function Nh(e) {
  const { ctx: t, setupState: n } = e;
  Object.keys(ue(n)).forEach((o) => {
    if (!n.__isScriptSetup) {
      if (Vr(o[0])) {
        W(
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
        set: st
      });
    }
  });
}
function Ta(e) {
  return me(e) ? e.reduce(
    (t, n) => (t[n] = null, t),
    {}
  ) : e;
}
function Vh() {
  const e = /* @__PURE__ */ Object.create(null);
  return (t, n) => {
    e[n] ? W(`${t} property "${n}" is already defined in ${e[n]}.`) : e[n] = t;
  };
}
let Ll = !0;
function Oh(e) {
  const t = Or(e), n = e.proxy, o = e.ctx;
  Ll = !1, t.beforeCreate && Da(t.beforeCreate, e, "bc");
  const {
    // state
    data: i,
    computed: s,
    methods: l,
    watch: r,
    provide: a,
    inject: d,
    // lifecycle
    created: u,
    beforeMount: c,
    mounted: m,
    beforeUpdate: v,
    updated: h,
    activated: g,
    deactivated: _,
    beforeDestroy: x,
    beforeUnmount: V,
    destroyed: A,
    unmounted: D,
    render: C,
    renderTracked: E,
    renderTriggered: F,
    errorCaptured: N,
    serverPrefetch: O,
    // public API
    expose: $,
    inheritAttrs: M,
    // assets
    components: k,
    directives: I,
    filters: L
  } = t, J = S.NODE_ENV !== "production" ? Vh() : null;
  if (S.NODE_ENV !== "production") {
    const [oe] = e.propsOptions;
    if (oe)
      for (const Z in oe)
        J("Props", Z);
  }
  if (d && Th(d, o, J), l)
    for (const oe in l) {
      const Z = l[oe];
      be(Z) ? (S.NODE_ENV !== "production" ? Object.defineProperty(o, oe, {
        value: Z.bind(n),
        configurable: !0,
        enumerable: !0,
        writable: !0
      }) : o[oe] = Z.bind(n), S.NODE_ENV !== "production" && J("Methods", oe)) : S.NODE_ENV !== "production" && W(
        `Method "${oe}" has type "${typeof Z}" in the component definition. Did you reference the function correctly?`
      );
    }
  if (i) {
    S.NODE_ENV !== "production" && !be(i) && W(
      "The data option must be a function. Plain object usage is no longer supported."
    );
    const oe = i.call(n, n);
    if (S.NODE_ENV !== "production" && mr(oe) && W(
      "data() returned a Promise - note data() cannot be async; If you intend to perform data fetching before component renders, use async setup() + <Suspense>."
    ), !Ie(oe))
      S.NODE_ENV !== "production" && W("data() should return an object.");
    else if (e.data = dt(oe), S.NODE_ENV !== "production")
      for (const Z in oe)
        J("Data", Z), Vr(Z[0]) || Object.defineProperty(o, Z, {
          configurable: !0,
          enumerable: !0,
          get: () => oe[Z],
          set: st
        });
  }
  if (Ll = !0, s)
    for (const oe in s) {
      const Z = s[oe], Ee = be(Z) ? Z.bind(n, n) : be(Z.get) ? Z.get.bind(n, n) : st;
      S.NODE_ENV !== "production" && Ee === st && W(`Computed property "${oe}" has no getter.`);
      const G = !be(Z) && be(Z.set) ? Z.set.bind(n) : S.NODE_ENV !== "production" ? () => {
        W(
          `Write operation failed: computed property "${oe}" is readonly.`
        );
      } : st, q = y({
        get: Ee,
        set: G
      });
      Object.defineProperty(o, oe, {
        enumerable: !0,
        configurable: !0,
        get: () => q.value,
        set: (ee) => q.value = ee
      }), S.NODE_ENV !== "production" && J("Computed", oe);
    }
  if (r)
    for (const oe in r)
      fd(r[oe], o, n, oe);
  if (a) {
    const oe = be(a) ? a.call(n) : a;
    Reflect.ownKeys(oe).forEach((Z) => {
      bt(Z, oe[Z]);
    });
  }
  u && Da(u, e, "c");
  function re(oe, Z) {
    me(Z) ? Z.forEach((Ee) => oe(Ee.bind(n))) : Z && oe(Z.bind(n));
  }
  if (re(xr, c), re(Zn, m), re(ph, v), re(Nr, h), re(ld, g), re(rd, _), re(wh, N), re(_h, E), re(bh, F), re(xt, V), re(ud, D), re(yh, O), me($))
    if ($.length) {
      const oe = e.exposed || (e.exposed = {});
      $.forEach((Z) => {
        Object.defineProperty(oe, Z, {
          get: () => n[Z],
          set: (Ee) => n[Z] = Ee
        });
      });
    } else e.exposed || (e.exposed = {});
  C && e.render === st && (e.render = C), M != null && (e.inheritAttrs = M), k && (e.components = k), I && (e.directives = I), O && sd(e);
}
function Th(e, t, n = st) {
  me(e) && (e = Bl(e));
  for (const o in e) {
    const i = e[o];
    let s;
    Ie(i) ? "default" in i ? s = je(
      i.from || o,
      i.default,
      !0
    ) : s = je(i.from || o) : s = je(i), He(s) ? Object.defineProperty(t, o, {
      enumerable: !0,
      configurable: !0,
      get: () => s.value,
      set: (l) => s.value = l
    }) : t[o] = s, S.NODE_ENV !== "production" && n("Inject", o);
  }
}
function Da(e, t, n) {
  Xt(
    me(e) ? e.map((o) => o.bind(t.proxy)) : e.bind(t.proxy),
    t,
    n
  );
}
function fd(e, t, n, o) {
  let i = o.includes(".") ? Cd(n, o) : () => n[o];
  if (We(e)) {
    const s = t[e];
    be(s) ? Ce(i, s) : S.NODE_ENV !== "production" && W(`Invalid watch handler specified by key "${e}"`, s);
  } else if (be(e))
    Ce(i, e.bind(n));
  else if (Ie(e))
    if (me(e))
      e.forEach((s) => fd(s, t, n, o));
    else {
      const s = be(e.handler) ? e.handler.bind(n) : t[e.handler];
      be(s) ? Ce(i, s, e) : S.NODE_ENV !== "production" && W(`Invalid watch handler specified by key "${e.handler}"`, s);
    }
  else S.NODE_ENV !== "production" && W(`Invalid watch option: "${o}"`, e);
}
function Or(e) {
  const t = e.type, { mixins: n, extends: o } = t, {
    mixins: i,
    optionsCache: s,
    config: { optionMergeStrategies: l }
  } = e.appContext, r = s.get(t);
  let a;
  return r ? a = r : !i.length && !n && !o ? a = t : (a = {}, i.length && i.forEach(
    (d) => ms(a, d, l, !0)
  ), ms(a, t, l)), Ie(t) && s.set(t, a), a;
}
function ms(e, t, n, o = !1) {
  const { mixins: i, extends: s } = t;
  s && ms(e, s, n, !0), i && i.forEach(
    (l) => ms(e, l, n, !0)
  );
  for (const l in t)
    if (o && l === "expose")
      S.NODE_ENV !== "production" && W(
        '"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.'
      );
    else {
      const r = Dh[l] || n && n[l];
      e[l] = r ? r(e[l], t[l]) : t[l];
    }
  return e;
}
const Dh = {
  data: Pa,
  props: Aa,
  emits: Aa,
  // objects
  methods: oi,
  computed: oi,
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
  components: oi,
  directives: oi,
  // watch
  watch: Ah,
  // provide / inject
  provide: Pa,
  inject: Ph
};
function Pa(e, t) {
  return t ? e ? function() {
    return Ue(
      be(e) ? e.call(this, this) : e,
      be(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function Ph(e, t) {
  return oi(Bl(e), Bl(t));
}
function Bl(e) {
  if (me(e)) {
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
function oi(e, t) {
  return e ? Ue(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function Aa(e, t) {
  return e ? me(e) && me(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : Ue(
    /* @__PURE__ */ Object.create(null),
    Ta(e),
    Ta(t ?? {})
  ) : t;
}
function Ah(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = Ue(/* @__PURE__ */ Object.create(null), e);
  for (const o in t)
    n[o] = _t(e[o], t[o]);
  return n;
}
function md() {
  return {
    app: null,
    config: {
      isNativeTag: Gm,
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
let Ih = 0;
function $h(e, t) {
  return function(o, i = null) {
    be(o) || (o = Ue({}, o)), i != null && !Ie(i) && (S.NODE_ENV !== "production" && W("root props passed to app.mount() must be an object."), i = null);
    const s = md(), l = /* @__PURE__ */ new WeakSet(), r = [];
    let a = !1;
    const d = s.app = {
      _uid: Ih++,
      _component: o,
      _props: i,
      _container: null,
      _context: s,
      _instance: null,
      version: Wa,
      get config() {
        return s.config;
      },
      set config(u) {
        S.NODE_ENV !== "production" && W(
          "app.config cannot be replaced. Modify individual options instead."
        );
      },
      use(u, ...c) {
        return l.has(u) ? S.NODE_ENV !== "production" && W("Plugin has already been applied to target app.") : u && be(u.install) ? (l.add(u), u.install(d, ...c)) : be(u) ? (l.add(u), u(d, ...c)) : S.NODE_ENV !== "production" && W(
          'A plugin must either be a function or an object with an "install" function.'
        ), d;
      },
      mixin(u) {
        return s.mixins.includes(u) ? S.NODE_ENV !== "production" && W(
          "Mixin has already been applied to target app" + (u.name ? `: ${u.name}` : "")
        ) : s.mixins.push(u), d;
      },
      component(u, c) {
        return S.NODE_ENV !== "production" && Wl(u, s.config), c ? (S.NODE_ENV !== "production" && s.components[u] && W(`Component "${u}" has already been registered in target app.`), s.components[u] = c, d) : s.components[u];
      },
      directive(u, c) {
        return S.NODE_ENV !== "production" && Xc(u), c ? (S.NODE_ENV !== "production" && s.directives[u] && W(`Directive "${u}" has already been registered in target app.`), s.directives[u] = c, d) : s.directives[u];
      },
      mount(u, c, m) {
        if (a)
          S.NODE_ENV !== "production" && W(
            "App has already been mounted.\nIf you want to remount the same app, move your app creation logic into a factory function and create fresh app instances for each mount - e.g. `const createMyApp = () => createApp(App)`"
          );
        else {
          S.NODE_ENV !== "production" && u.__vue_app__ && W(
            "There is already an app instance mounted on the host container.\n If you want to mount another app on the same host container, you need to unmount the previous app by calling `app.unmount()` first."
          );
          const v = d._ceVNode || f(o, i);
          return v.appContext = s, m === !0 ? m = "svg" : m === !1 && (m = void 0), S.NODE_ENV !== "production" && (s.reload = () => {
            e(
              Jt(v),
              u,
              m
            );
          }), c && t ? t(v, u) : e(v, u, m), a = !0, d._container = u, u.__vue_app__ = d, S.NODE_ENV !== "production" && (d._instance = v.component, eh(d, Wa)), js(v.component);
        }
      },
      onUnmount(u) {
        S.NODE_ENV !== "production" && typeof u != "function" && W(
          `Expected function as first argument to app.onUnmount(), but got ${typeof u}`
        ), r.push(u);
      },
      unmount() {
        a ? (Xt(
          r,
          d._instance,
          16
        ), e(null, d._container), S.NODE_ENV !== "production" && (d._instance = null, th(d)), delete d._container.__vue_app__) : S.NODE_ENV !== "production" && W("Cannot unmount an app that is not mounted.");
      },
      provide(u, c) {
        return S.NODE_ENV !== "production" && u in s.provides && W(
          `App already provides property with key "${String(u)}". It will be overwritten with the new value.`
        ), s.provides[u] = c, d;
      },
      runWithContext(u) {
        const c = jo;
        jo = d;
        try {
          return u();
        } finally {
          jo = c;
        }
      }
    };
    return d;
  };
}
let jo = null;
function bt(e, t) {
  if (!rt)
    S.NODE_ENV !== "production" && W("provide() can only be used inside setup().");
  else {
    let n = rt.provides;
    const o = rt.parent && rt.parent.provides;
    o === n && (n = rt.provides = Object.create(o)), n[e] = t;
  }
}
function je(e, t, n = !1) {
  const o = rt || gt;
  if (o || jo) {
    const i = jo ? jo._context.provides : o ? o.parent == null ? o.vnode.appContext && o.vnode.appContext.provides : o.parent.provides : void 0;
    if (i && e in i)
      return i[e];
    if (arguments.length > 1)
      return n && be(t) ? t.call(o && o.proxy) : t;
    S.NODE_ENV !== "production" && W(`injection "${String(e)}" not found.`);
  } else S.NODE_ENV !== "production" && W("inject() can only be used inside setup() or functional components.");
}
const vd = {}, hd = () => Object.create(vd), gd = (e) => Object.getPrototypeOf(e) === vd;
function Mh(e, t, n, o = !1) {
  const i = {}, s = hd();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), pd(e, t, i, s);
  for (const l in e.propsOptions[0])
    l in i || (i[l] = void 0);
  S.NODE_ENV !== "production" && bd(t || {}, i, e), n ? e.props = o ? i : Av(i) : e.type.props ? e.props = i : e.props = s, e.attrs = s;
}
function Fh(e) {
  for (; e; ) {
    if (e.type.__hmrId) return !0;
    e = e.parent;
  }
}
function Lh(e, t, n, o) {
  const {
    props: i,
    attrs: s,
    vnode: { patchFlag: l }
  } = e, r = ue(i), [a] = e.propsOptions;
  let d = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(S.NODE_ENV !== "production" && Fh(e)) && (o || l > 0) && !(l & 16)
  ) {
    if (l & 8) {
      const u = e.vnode.dynamicProps;
      for (let c = 0; c < u.length; c++) {
        let m = u[c];
        if (Rs(e.emitsOptions, m))
          continue;
        const v = t[m];
        if (a)
          if (Ae(s, m))
            v !== s[m] && (s[m] = v, d = !0);
          else {
            const h = ft(m);
            i[h] = Rl(
              a,
              r,
              h,
              v,
              e,
              !1
            );
          }
        else
          v !== s[m] && (s[m] = v, d = !0);
      }
    }
  } else {
    pd(e, t, i, s) && (d = !0);
    let u;
    for (const c in r)
      (!t || // for camelCase
      !Ae(t, c) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((u = Jn(c)) === c || !Ae(t, u))) && (a ? n && // for camelCase
      (n[c] !== void 0 || // for kebab-case
      n[u] !== void 0) && (i[c] = Rl(
        a,
        r,
        c,
        void 0,
        e,
        !0
      )) : delete i[c]);
    if (s !== r)
      for (const c in s)
        (!t || !Ae(t, c)) && (delete s[c], d = !0);
  }
  d && on(e.attrs, "set", ""), S.NODE_ENV !== "production" && bd(t || {}, i, e);
}
function pd(e, t, n, o) {
  const [i, s] = e.propsOptions;
  let l = !1, r;
  if (t)
    for (let a in t) {
      if (si(a))
        continue;
      const d = t[a];
      let u;
      i && Ae(i, u = ft(a)) ? !s || !s.includes(u) ? n[u] = d : (r || (r = {}))[u] = d : Rs(e.emitsOptions, a) || (!(a in o) || d !== o[a]) && (o[a] = d, l = !0);
    }
  if (s) {
    const a = ue(n), d = r || Fe;
    for (let u = 0; u < s.length; u++) {
      const c = s[u];
      n[c] = Rl(
        i,
        a,
        c,
        d[c],
        e,
        !Ae(d, c)
      );
    }
  }
  return l;
}
function Rl(e, t, n, o, i, s) {
  const l = e[n];
  if (l != null) {
    const r = Ae(l, "default");
    if (r && o === void 0) {
      const a = l.default;
      if (l.type !== Function && !l.skipFactory && be(a)) {
        const { propsDefaults: d } = i;
        if (n in d)
          o = d[n];
        else {
          const u = Pi(i);
          o = d[n] = a.call(
            null,
            t
          ), u();
        }
      } else
        o = a;
      i.ce && i.ce._setProp(n, o);
    }
    l[
      0
      /* shouldCast */
    ] && (s && !r ? o = !1 : l[
      1
      /* shouldCastTrue */
    ] && (o === "" || o === Jn(n)) && (o = !0));
  }
  return o;
}
const Bh = /* @__PURE__ */ new WeakMap();
function yd(e, t, n = !1) {
  const o = n ? Bh : t.propsCache, i = o.get(e);
  if (i)
    return i;
  const s = e.props, l = {}, r = [];
  let a = !1;
  if (!be(e)) {
    const u = (c) => {
      a = !0;
      const [m, v] = yd(c, t, !0);
      Ue(l, m), v && r.push(...v);
    };
    !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
  }
  if (!s && !a)
    return Ie(e) && o.set(e, Ro), Ro;
  if (me(s))
    for (let u = 0; u < s.length; u++) {
      S.NODE_ENV !== "production" && !We(s[u]) && W("props must be strings when using array syntax.", s[u]);
      const c = ft(s[u]);
      Ia(c) && (l[c] = Fe);
    }
  else if (s) {
    S.NODE_ENV !== "production" && !Ie(s) && W("invalid props options", s);
    for (const u in s) {
      const c = ft(u);
      if (Ia(c)) {
        const m = s[u], v = l[c] = me(m) || be(m) ? { type: m } : Ue({}, m), h = v.type;
        let g = !1, _ = !0;
        if (me(h))
          for (let x = 0; x < h.length; ++x) {
            const V = h[x], A = be(V) && V.name;
            if (A === "Boolean") {
              g = !0;
              break;
            } else A === "String" && (_ = !1);
          }
        else
          g = be(h) && h.name === "Boolean";
        v[
          0
          /* shouldCast */
        ] = g, v[
          1
          /* shouldCastTrue */
        ] = _, (g || Ae(v, "default")) && r.push(c);
      }
    }
  }
  const d = [l, r];
  return Ie(e) && o.set(e, d), d;
}
function Ia(e) {
  return e[0] !== "$" && !si(e) ? !0 : (S.NODE_ENV !== "production" && W(`Invalid prop name: "${e}" is a reserved property.`), !1);
}
function Rh(e) {
  return e === null ? "null" : typeof e == "function" ? e.name || "" : typeof e == "object" && e.constructor && e.constructor.name || "";
}
function bd(e, t, n) {
  const o = ue(t), i = n.propsOptions[0], s = Object.keys(e).map((l) => ft(l));
  for (const l in i) {
    let r = i[l];
    r != null && Hh(
      l,
      o[l],
      r,
      S.NODE_ENV !== "production" ? ln(o) : o,
      !s.includes(l)
    );
  }
}
function Hh(e, t, n, o, i) {
  const { type: s, required: l, validator: r, skipCheck: a } = n;
  if (l && i) {
    W('Missing required prop: "' + e + '"');
    return;
  }
  if (!(t == null && !l)) {
    if (s != null && s !== !0 && !a) {
      let d = !1;
      const u = me(s) ? s : [s], c = [];
      for (let m = 0; m < u.length && !d; m++) {
        const { valid: v, expectedType: h } = zh(t, u[m]);
        c.push(h || ""), d = v;
      }
      if (!d) {
        W(Wh(e, t, c));
        return;
      }
    }
    r && !r(t, o) && W('Invalid prop: custom validator check failed for prop "' + e + '".');
  }
}
const jh = /* @__PURE__ */ On(
  "String,Number,Boolean,Function,Symbol,BigInt"
);
function zh(e, t) {
  let n;
  const o = Rh(t);
  if (o === "null")
    n = e === null;
  else if (jh(o)) {
    const i = typeof e;
    n = i === o.toLowerCase(), !n && i === "object" && (n = e instanceof t);
  } else o === "Object" ? n = Ie(e) : o === "Array" ? n = me(e) : n = e instanceof t;
  return {
    valid: n,
    expectedType: o
  };
}
function Wh(e, t, n) {
  if (n.length === 0)
    return `Prop type [] for prop "${e}" won't match anything. Did you mean to use type Array instead?`;
  let o = `Invalid prop: type check failed for prop "${e}". Expected ${n.map(zt).join(" | ")}`;
  const i = n[0], s = vr(t), l = $a(t, i), r = $a(t, s);
  return n.length === 1 && Ma(i) && !Uh(i, s) && (o += ` with value ${l}`), o += `, got ${s} `, Ma(s) && (o += `with value ${r}.`), o;
}
function $a(e, t) {
  return t === "String" ? `"${e}"` : t === "Number" ? `${Number(e)}` : `${e}`;
}
function Ma(e) {
  return ["string", "number", "boolean"].some((n) => e.toLowerCase() === n);
}
function Uh(...e) {
  return e.some((t) => t.toLowerCase() === "boolean");
}
const _d = (e) => e[0] === "_" || e === "$stable", Tr = (e) => me(e) ? e.map(Kt) : [Kt(e)], Kh = (e, t, n) => {
  if (t._n)
    return t;
  const o = b((...i) => (S.NODE_ENV !== "production" && rt && (!n || n.root === rt.root) && W(
    `Slot "${e}" invoked outside of the render function: this will not track dependencies used in the slot. Invoke the slot function inside the render function instead.`
  ), Tr(t(...i))), n);
  return o._c = !1, o;
}, wd = (e, t, n) => {
  const o = e._ctx;
  for (const i in e) {
    if (_d(i)) continue;
    const s = e[i];
    if (be(s))
      t[i] = Kh(i, s, o);
    else if (s != null) {
      S.NODE_ENV !== "production" && W(
        `Non-function value encountered for slot "${i}". Prefer function slots for better performance.`
      );
      const l = Tr(s);
      t[i] = () => l;
    }
  }
}, Sd = (e, t) => {
  S.NODE_ENV !== "production" && !Di(e.vnode) && W(
    "Non-function value encountered for default slot. Prefer function slots for better performance."
  );
  const n = Tr(t);
  e.slots.default = () => n;
}, Hl = (e, t, n) => {
  for (const o in t)
    (n || o !== "_") && (e[o] = t[o]);
}, Gh = (e, t, n) => {
  const o = e.slots = hd();
  if (e.vnode.shapeFlag & 32) {
    const i = t._;
    i ? (Hl(o, t, n), n && rs(o, "_", i, !0)) : wd(t, o);
  } else t && Sd(e, t);
}, Yh = (e, t, n) => {
  const { vnode: o, slots: i } = e;
  let s = !0, l = Fe;
  if (o.shapeFlag & 32) {
    const r = t._;
    r ? S.NODE_ENV !== "production" && Yt ? (Hl(i, t, n), on(e, "set", "$slots")) : n && r === 1 ? s = !1 : Hl(i, t, n) : (s = !t.$stable, wd(t, i)), l = t;
  } else t && (Sd(e, t), l = { default: 1 });
  if (s)
    for (const r in i)
      !_d(r) && l[r] == null && delete i[r];
};
let Jo, Gn;
function _n(e, t) {
  e.appContext.config.performance && vs() && Gn.mark(`vue-${t}-${e.uid}`), S.NODE_ENV !== "production" && sh(e, t, vs() ? Gn.now() : Date.now());
}
function wn(e, t) {
  if (e.appContext.config.performance && vs()) {
    const n = `vue-${t}-${e.uid}`, o = n + ":end";
    Gn.mark(o), Gn.measure(
      `<${zs(e, e.type)}> ${t}`,
      n,
      o
    ), Gn.clearMarks(n), Gn.clearMarks(o);
  }
  S.NODE_ENV !== "production" && lh(e, t, vs() ? Gn.now() : Date.now());
}
function vs() {
  return Jo !== void 0 || (typeof window < "u" && window.performance ? (Jo = !0, Gn = window.performance) : Jo = !1), Jo;
}
function qh() {
  const e = [];
  if (S.NODE_ENV !== "production" && e.length) {
    const t = e.length > 1;
    console.warn(
      `Feature flag${t ? "s" : ""} ${e.join(", ")} ${t ? "are" : "is"} not explicitly defined. You are running the esm-bundler build of Vue, which expects these compile-time feature flags to be globally injected via the bundler config in order to get better tree-shaking in the production bundle.

For more details, see https://link.vuejs.org/feature-flags.`
    );
  }
}
const Nt = ug;
function Xh(e) {
  return Jh(e);
}
function Jh(e, t) {
  qh();
  const n = Ni();
  n.__VUE__ = !0, S.NODE_ENV !== "production" && Kc(n.__VUE_DEVTOOLS_GLOBAL_HOOK__, n);
  const {
    insert: o,
    remove: i,
    patchProp: s,
    createElement: l,
    createText: r,
    createComment: a,
    setText: d,
    setElementText: u,
    parentNode: c,
    nextSibling: m,
    setScopeId: v = st,
    insertStaticContent: h
  } = e, g = (p, w, P, j = null, B = null, R = null, X = void 0, Y = null, U = S.NODE_ENV !== "production" && Yt ? !1 : !!w.dynamicChildren) => {
    if (p === w)
      return;
    p && !fo(p, w) && (j = Be(p), Ve(p, B, R, !0), p = null), w.patchFlag === -2 && (U = !1, w.dynamicChildren = null);
    const { type: z, ref: pe, shapeFlag: te } = w;
    switch (z) {
      case Oo:
        _(p, w, P, j);
        break;
      case nt:
        x(p, w, P, j);
        break;
      case Qi:
        p == null ? V(w, P, j, X) : S.NODE_ENV !== "production" && A(p, w, P, X);
        break;
      case Ne:
        I(
          p,
          w,
          P,
          j,
          B,
          R,
          X,
          Y,
          U
        );
        break;
      default:
        te & 1 ? E(
          p,
          w,
          P,
          j,
          B,
          R,
          X,
          Y,
          U
        ) : te & 6 ? L(
          p,
          w,
          P,
          j,
          B,
          R,
          X,
          Y,
          U
        ) : te & 64 || te & 128 ? z.process(
          p,
          w,
          P,
          j,
          B,
          R,
          X,
          Y,
          U,
          Bt
        ) : S.NODE_ENV !== "production" && W("Invalid VNode type:", z, `(${typeof z})`);
    }
    pe != null && B && $l(pe, p && p.ref, R, w || p, !w);
  }, _ = (p, w, P, j) => {
    if (p == null)
      o(
        w.el = r(w.children),
        P,
        j
      );
    else {
      const B = w.el = p.el;
      w.children !== p.children && d(B, w.children);
    }
  }, x = (p, w, P, j) => {
    p == null ? o(
      w.el = a(w.children || ""),
      P,
      j
    ) : w.el = p.el;
  }, V = (p, w, P, j) => {
    [p.el, p.anchor] = h(
      p.children,
      w,
      P,
      j,
      p.el,
      p.anchor
    );
  }, A = (p, w, P, j) => {
    if (w.children !== p.children) {
      const B = m(p.anchor);
      C(p), [w.el, w.anchor] = h(
        w.children,
        P,
        B,
        j
      );
    } else
      w.el = p.el, w.anchor = p.anchor;
  }, D = ({ el: p, anchor: w }, P, j) => {
    let B;
    for (; p && p !== w; )
      B = m(p), o(p, P, j), p = B;
    o(w, P, j);
  }, C = ({ el: p, anchor: w }) => {
    let P;
    for (; p && p !== w; )
      P = m(p), i(p), p = P;
    i(w);
  }, E = (p, w, P, j, B, R, X, Y, U) => {
    w.type === "svg" ? X = "svg" : w.type === "math" && (X = "mathml"), p == null ? F(
      w,
      P,
      j,
      B,
      R,
      X,
      Y,
      U
    ) : $(
      p,
      w,
      B,
      R,
      X,
      Y,
      U
    );
  }, F = (p, w, P, j, B, R, X, Y) => {
    let U, z;
    const { props: pe, shapeFlag: te, transition: de, dirs: T } = p;
    if (U = p.el = l(
      p.type,
      R,
      pe && pe.is,
      pe
    ), te & 8 ? u(U, p.children) : te & 16 && O(
      p.children,
      U,
      null,
      j,
      B,
      dl(p, R),
      X,
      Y
    ), T && so(p, null, j, "created"), N(U, p, p.scopeId, X, j), pe) {
      for (const ge in pe)
        ge !== "value" && !si(ge) && s(U, ge, null, pe[ge], R, j);
      "value" in pe && s(U, "value", null, pe.value, R), (z = pe.onVnodeBeforeMount) && en(z, j, p);
    }
    S.NODE_ENV !== "production" && (rs(U, "__vnode", p, !0), rs(U, "__vueParentComponent", j, !0)), T && so(p, null, j, "beforeMount");
    const H = Zh(B, de);
    H && de.beforeEnter(U), o(U, w, P), ((z = pe && pe.onVnodeMounted) || H || T) && Nt(() => {
      z && en(z, j, p), H && de.enter(U), T && so(p, null, j, "mounted");
    }, B);
  }, N = (p, w, P, j, B) => {
    if (P && v(p, P), j)
      for (let R = 0; R < j.length; R++)
        v(p, j[R]);
    if (B) {
      let R = B.subTree;
      if (S.NODE_ENV !== "production" && R.patchFlag > 0 && R.patchFlag & 2048 && (R = Pr(R.children) || R), w === R || Nd(R.type) && (R.ssContent === w || R.ssFallback === w)) {
        const X = B.vnode;
        N(
          p,
          X,
          X.scopeId,
          X.slotScopeIds,
          B.parent
        );
      }
    }
  }, O = (p, w, P, j, B, R, X, Y, U = 0) => {
    for (let z = U; z < p.length; z++) {
      const pe = p[z] = Y ? Kn(p[z]) : Kt(p[z]);
      g(
        null,
        pe,
        w,
        P,
        j,
        B,
        R,
        X,
        Y
      );
    }
  }, $ = (p, w, P, j, B, R, X) => {
    const Y = w.el = p.el;
    S.NODE_ENV !== "production" && (Y.__vnode = w);
    let { patchFlag: U, dynamicChildren: z, dirs: pe } = w;
    U |= p.patchFlag & 16;
    const te = p.props || Fe, de = w.props || Fe;
    let T;
    if (P && lo(P, !1), (T = de.onVnodeBeforeUpdate) && en(T, P, w, p), pe && so(w, p, P, "beforeUpdate"), P && lo(P, !0), S.NODE_ENV !== "production" && Yt && (U = 0, X = !1, z = null), (te.innerHTML && de.innerHTML == null || te.textContent && de.textContent == null) && u(Y, ""), z ? (M(
      p.dynamicChildren,
      z,
      Y,
      P,
      j,
      dl(w, B),
      R
    ), S.NODE_ENV !== "production" && ui(p, w)) : X || Ee(
      p,
      w,
      Y,
      null,
      P,
      j,
      dl(w, B),
      R,
      !1
    ), U > 0) {
      if (U & 16)
        k(Y, te, de, P, B);
      else if (U & 2 && te.class !== de.class && s(Y, "class", null, de.class, B), U & 4 && s(Y, "style", te.style, de.style, B), U & 8) {
        const H = w.dynamicProps;
        for (let ge = 0; ge < H.length; ge++) {
          const he = H[ge], ie = te[he], De = de[he];
          (De !== ie || he === "value") && s(Y, he, ie, De, B, P);
        }
      }
      U & 1 && p.children !== w.children && u(Y, w.children);
    } else !X && z == null && k(Y, te, de, P, B);
    ((T = de.onVnodeUpdated) || pe) && Nt(() => {
      T && en(T, P, w, p), pe && so(w, p, P, "updated");
    }, j);
  }, M = (p, w, P, j, B, R, X) => {
    for (let Y = 0; Y < w.length; Y++) {
      const U = p[Y], z = w[Y], pe = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        U.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (U.type === Ne || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !fo(U, z) || // - In the case of a component, it could contain anything.
        U.shapeFlag & 70) ? c(U.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          P
        )
      );
      g(
        U,
        z,
        pe,
        null,
        j,
        B,
        R,
        X,
        !0
      );
    }
  }, k = (p, w, P, j, B) => {
    if (w !== P) {
      if (w !== Fe)
        for (const R in w)
          !si(R) && !(R in P) && s(
            p,
            R,
            w[R],
            null,
            B,
            j
          );
      for (const R in P) {
        if (si(R)) continue;
        const X = P[R], Y = w[R];
        X !== Y && R !== "value" && s(p, R, Y, X, B, j);
      }
      "value" in P && s(p, "value", w.value, P.value, B);
    }
  }, I = (p, w, P, j, B, R, X, Y, U) => {
    const z = w.el = p ? p.el : r(""), pe = w.anchor = p ? p.anchor : r("");
    let { patchFlag: te, dynamicChildren: de, slotScopeIds: T } = w;
    S.NODE_ENV !== "production" && // #5523 dev root fragment may inherit directives
    (Yt || te & 2048) && (te = 0, U = !1, de = null), T && (Y = Y ? Y.concat(T) : T), p == null ? (o(z, P, j), o(pe, P, j), O(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      w.children || [],
      P,
      pe,
      B,
      R,
      X,
      Y,
      U
    )) : te > 0 && te & 64 && de && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    p.dynamicChildren ? (M(
      p.dynamicChildren,
      de,
      P,
      B,
      R,
      X,
      Y
    ), S.NODE_ENV !== "production" ? ui(p, w) : (
      // #2080 if the stable fragment has a key, it's a <template v-for> that may
      //  get moved around. Make sure all root level vnodes inherit el.
      // #2134 or if it's a component root, it may also get moved around
      // as the component is being moved.
      (w.key != null || B && w === B.subTree) && ui(
        p,
        w,
        !0
        /* shallow */
      )
    )) : Ee(
      p,
      w,
      P,
      pe,
      B,
      R,
      X,
      Y,
      U
    );
  }, L = (p, w, P, j, B, R, X, Y, U) => {
    w.slotScopeIds = Y, p == null ? w.shapeFlag & 512 ? B.ctx.activate(
      w,
      P,
      j,
      X,
      U
    ) : J(
      w,
      P,
      j,
      B,
      R,
      X,
      U
    ) : re(p, w, U);
  }, J = (p, w, P, j, B, R, X) => {
    const Y = p.component = hg(
      p,
      j,
      B
    );
    if (S.NODE_ENV !== "production" && Y.type.__hmrId && Xv(Y), S.NODE_ENV !== "production" && (qi(p), _n(Y, "mount")), Di(p) && (Y.ctx.renderer = Bt), S.NODE_ENV !== "production" && _n(Y, "init"), pg(Y, !1, X), S.NODE_ENV !== "production" && wn(Y, "init"), Y.asyncDep) {
      if (S.NODE_ENV !== "production" && Yt && (p.el = null), B && B.registerDep(Y, oe, X), !p.el) {
        const U = Y.subTree = f(nt);
        x(null, U, w, P);
      }
    } else
      oe(
        Y,
        p,
        w,
        P,
        B,
        R,
        X
      );
    S.NODE_ENV !== "production" && (Xi(), wn(Y, "mount"));
  }, re = (p, w, P) => {
    const j = w.component = p.component;
    if (rg(p, w, P))
      if (j.asyncDep && !j.asyncResolved) {
        S.NODE_ENV !== "production" && qi(w), Z(j, w, P), S.NODE_ENV !== "production" && Xi();
        return;
      } else
        j.next = w, j.update();
    else
      w.el = p.el, j.vnode = w;
  }, oe = (p, w, P, j, B, R, X) => {
    const Y = () => {
      if (p.isMounted) {
        let { next: te, bu: de, u: T, parent: H, vnode: ge } = p;
        {
          const Qe = kd(p);
          if (Qe) {
            te && (te.el = ge.el, Z(p, te, X)), Qe.asyncDep.then(() => {
              p.isUnmounted || Y();
            });
            return;
          }
        }
        let he = te, ie;
        S.NODE_ENV !== "production" && qi(te || p.vnode), lo(p, !1), te ? (te.el = ge.el, Z(p, te, X)) : te = ge, de && Mo(de), (ie = te.props && te.props.onVnodeBeforeUpdate) && en(ie, H, te, ge), lo(p, !0), S.NODE_ENV !== "production" && _n(p, "render");
        const De = fl(p);
        S.NODE_ENV !== "production" && wn(p, "render");
        const Je = p.subTree;
        p.subTree = De, S.NODE_ENV !== "production" && _n(p, "patch"), g(
          Je,
          De,
          // parent may have changed if it's in a teleport
          c(Je.el),
          // anchor may have changed if it's in a fragment
          Be(Je),
          p,
          B,
          R
        ), S.NODE_ENV !== "production" && wn(p, "patch"), te.el = De.el, he === null && ag(p, De.el), T && Nt(T, B), (ie = te.props && te.props.onVnodeUpdated) && Nt(
          () => en(ie, H, te, ge),
          B
        ), S.NODE_ENV !== "production" && Gc(p), S.NODE_ENV !== "production" && Xi();
      } else {
        let te;
        const { el: de, props: T } = w, { bm: H, m: ge, parent: he, root: ie, type: De } = p, Je = ai(w);
        if (lo(p, !1), H && Mo(H), !Je && (te = T && T.onVnodeBeforeMount) && en(te, he, w), lo(p, !0), de && Hn) {
          const Qe = () => {
            S.NODE_ENV !== "production" && _n(p, "render"), p.subTree = fl(p), S.NODE_ENV !== "production" && wn(p, "render"), S.NODE_ENV !== "production" && _n(p, "hydrate"), Hn(
              de,
              p.subTree,
              p,
              B,
              null
            ), S.NODE_ENV !== "production" && wn(p, "hydrate");
          };
          Je && De.__asyncHydrate ? De.__asyncHydrate(
            de,
            p,
            Qe
          ) : Qe();
        } else {
          ie.ce && ie.ce._injectChildStyle(De), S.NODE_ENV !== "production" && _n(p, "render");
          const Qe = p.subTree = fl(p);
          S.NODE_ENV !== "production" && wn(p, "render"), S.NODE_ENV !== "production" && _n(p, "patch"), g(
            null,
            Qe,
            P,
            j,
            p,
            B,
            R
          ), S.NODE_ENV !== "production" && wn(p, "patch"), w.el = Qe.el;
        }
        if (ge && Nt(ge, B), !Je && (te = T && T.onVnodeMounted)) {
          const Qe = w;
          Nt(
            () => en(te, he, Qe),
            B
          );
        }
        (w.shapeFlag & 256 || he && ai(he.vnode) && he.vnode.shapeFlag & 256) && p.a && Nt(p.a, B), p.isMounted = !0, S.NODE_ENV !== "production" && nh(p), w = P = j = null;
      }
    };
    p.scope.on();
    const U = p.effect = new bc(Y);
    p.scope.off();
    const z = p.update = U.run.bind(U), pe = p.job = U.runIfDirty.bind(U);
    pe.i = p, pe.id = p.uid, U.scheduler = () => Ls(pe), lo(p, !0), S.NODE_ENV !== "production" && (U.onTrack = p.rtc ? (te) => Mo(p.rtc, te) : void 0, U.onTrigger = p.rtg ? (te) => Mo(p.rtg, te) : void 0), z();
  }, Z = (p, w, P) => {
    w.component = p;
    const j = p.vnode.props;
    p.vnode = w, p.next = null, Lh(p, w.props, j, P), Yh(p, w.children, P), Tn(), Ca(p), Dn();
  }, Ee = (p, w, P, j, B, R, X, Y, U = !1) => {
    const z = p && p.children, pe = p ? p.shapeFlag : 0, te = w.children, { patchFlag: de, shapeFlag: T } = w;
    if (de > 0) {
      if (de & 128) {
        q(
          z,
          te,
          P,
          j,
          B,
          R,
          X,
          Y,
          U
        );
        return;
      } else if (de & 256) {
        G(
          z,
          te,
          P,
          j,
          B,
          R,
          X,
          Y,
          U
        );
        return;
      }
    }
    T & 8 ? (pe & 16 && we(z, B, R), te !== z && u(P, te)) : pe & 16 ? T & 16 ? q(
      z,
      te,
      P,
      j,
      B,
      R,
      X,
      Y,
      U
    ) : we(z, B, R, !0) : (pe & 8 && u(P, ""), T & 16 && O(
      te,
      P,
      j,
      B,
      R,
      X,
      Y,
      U
    ));
  }, G = (p, w, P, j, B, R, X, Y, U) => {
    p = p || Ro, w = w || Ro;
    const z = p.length, pe = w.length, te = Math.min(z, pe);
    let de;
    for (de = 0; de < te; de++) {
      const T = w[de] = U ? Kn(w[de]) : Kt(w[de]);
      g(
        p[de],
        T,
        P,
        null,
        B,
        R,
        X,
        Y,
        U
      );
    }
    z > pe ? we(
      p,
      B,
      R,
      !0,
      !1,
      te
    ) : O(
      w,
      P,
      j,
      B,
      R,
      X,
      Y,
      U,
      te
    );
  }, q = (p, w, P, j, B, R, X, Y, U) => {
    let z = 0;
    const pe = w.length;
    let te = p.length - 1, de = pe - 1;
    for (; z <= te && z <= de; ) {
      const T = p[z], H = w[z] = U ? Kn(w[z]) : Kt(w[z]);
      if (fo(T, H))
        g(
          T,
          H,
          P,
          null,
          B,
          R,
          X,
          Y,
          U
        );
      else
        break;
      z++;
    }
    for (; z <= te && z <= de; ) {
      const T = p[te], H = w[de] = U ? Kn(w[de]) : Kt(w[de]);
      if (fo(T, H))
        g(
          T,
          H,
          P,
          null,
          B,
          R,
          X,
          Y,
          U
        );
      else
        break;
      te--, de--;
    }
    if (z > te) {
      if (z <= de) {
        const T = de + 1, H = T < pe ? w[T].el : j;
        for (; z <= de; )
          g(
            null,
            w[z] = U ? Kn(w[z]) : Kt(w[z]),
            P,
            H,
            B,
            R,
            X,
            Y,
            U
          ), z++;
      }
    } else if (z > de)
      for (; z <= te; )
        Ve(p[z], B, R, !0), z++;
    else {
      const T = z, H = z, ge = /* @__PURE__ */ new Map();
      for (z = H; z <= de; z++) {
        const tt = w[z] = U ? Kn(w[z]) : Kt(w[z]);
        tt.key != null && (S.NODE_ENV !== "production" && ge.has(tt.key) && W(
          "Duplicate keys found during update:",
          JSON.stringify(tt.key),
          "Make sure keys are unique."
        ), ge.set(tt.key, z));
      }
      let he, ie = 0;
      const De = de - H + 1;
      let Je = !1, Qe = 0;
      const ut = new Array(De);
      for (z = 0; z < De; z++) ut[z] = 0;
      for (z = T; z <= te; z++) {
        const tt = p[z];
        if (ie >= De) {
          Ve(tt, B, R, !0);
          continue;
        }
        let Tt;
        if (tt.key != null)
          Tt = ge.get(tt.key);
        else
          for (he = H; he <= de; he++)
            if (ut[he - H] === 0 && fo(tt, w[he])) {
              Tt = he;
              break;
            }
        Tt === void 0 ? Ve(tt, B, R, !0) : (ut[Tt - H] = z + 1, Tt >= Qe ? Qe = Tt : Je = !0, g(
          tt,
          w[Tt],
          P,
          null,
          B,
          R,
          X,
          Y,
          U
        ), ie++);
      }
      const Rt = Je ? Qh(ut) : Ro;
      for (he = Rt.length - 1, z = De - 1; z >= 0; z--) {
        const tt = H + z, Tt = w[tt], oo = tt + 1 < pe ? w[tt + 1].el : j;
        ut[z] === 0 ? g(
          null,
          Tt,
          P,
          oo,
          B,
          R,
          X,
          Y,
          U
        ) : Je && (he < 0 || z !== Rt[he] ? ee(Tt, P, oo, 2) : he--);
      }
    }
  }, ee = (p, w, P, j, B = null) => {
    const { el: R, type: X, transition: Y, children: U, shapeFlag: z } = p;
    if (z & 6) {
      ee(p.component.subTree, w, P, j);
      return;
    }
    if (z & 128) {
      p.suspense.move(w, P, j);
      return;
    }
    if (z & 64) {
      X.move(p, w, P, Bt);
      return;
    }
    if (X === Ne) {
      o(R, w, P);
      for (let te = 0; te < U.length; te++)
        ee(U[te], w, P, j);
      o(p.anchor, w, P);
      return;
    }
    if (X === Qi) {
      D(p, w, P);
      return;
    }
    if (j !== 2 && z & 1 && Y)
      if (j === 0)
        Y.beforeEnter(R), o(R, w, P), Nt(() => Y.enter(R), B);
      else {
        const { leave: te, delayLeave: de, afterLeave: T } = Y, H = () => o(R, w, P), ge = () => {
          te(R, () => {
            H(), T && T();
          });
        };
        de ? de(R, H, ge) : ge();
      }
    else
      o(R, w, P);
  }, Ve = (p, w, P, j = !1, B = !1) => {
    const {
      type: R,
      props: X,
      ref: Y,
      children: U,
      dynamicChildren: z,
      shapeFlag: pe,
      patchFlag: te,
      dirs: de,
      cacheIndex: T
    } = p;
    if (te === -2 && (B = !1), Y != null && $l(Y, null, P, p, !0), T != null && (w.renderCache[T] = void 0), pe & 256) {
      w.ctx.deactivate(p);
      return;
    }
    const H = pe & 1 && de, ge = !ai(p);
    let he;
    if (ge && (he = X && X.onVnodeBeforeUnmount) && en(he, w, p), pe & 6)
      ne(p.component, P, j);
    else {
      if (pe & 128) {
        p.suspense.unmount(P, j);
        return;
      }
      H && so(p, null, w, "beforeUnmount"), pe & 64 ? p.type.remove(
        p,
        w,
        P,
        Bt,
        j
      ) : z && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !z.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (R !== Ne || te > 0 && te & 64) ? we(
        z,
        w,
        P,
        !1,
        !0
      ) : (R === Ne && te & 384 || !B && pe & 16) && we(U, w, P), j && Ge(p);
    }
    (ge && (he = X && X.onVnodeUnmounted) || H) && Nt(() => {
      he && en(he, w, p), H && so(p, null, w, "unmounted");
    }, P);
  }, Ge = (p) => {
    const { type: w, el: P, anchor: j, transition: B } = p;
    if (w === Ne) {
      S.NODE_ENV !== "production" && p.patchFlag > 0 && p.patchFlag & 2048 && B && !B.persisted ? p.children.forEach((X) => {
        X.type === nt ? i(X.el) : Ge(X);
      }) : qe(P, j);
      return;
    }
    if (w === Qi) {
      C(p);
      return;
    }
    const R = () => {
      i(P), B && !B.persisted && B.afterLeave && B.afterLeave();
    };
    if (p.shapeFlag & 1 && B && !B.persisted) {
      const { leave: X, delayLeave: Y } = B, U = () => X(P, R);
      Y ? Y(p.el, R, U) : U();
    } else
      R();
  }, qe = (p, w) => {
    let P;
    for (; p !== w; )
      P = m(p), i(p), p = P;
    i(w);
  }, ne = (p, w, P) => {
    S.NODE_ENV !== "production" && p.type.__hmrId && Jv(p);
    const { bum: j, scope: B, job: R, subTree: X, um: Y, m: U, a: z } = p;
    Fa(U), Fa(z), j && Mo(j), B.stop(), R && (R.flags |= 8, Ve(X, p, w, P)), Y && Nt(Y, w), Nt(() => {
      p.isUnmounted = !0;
    }, w), w && w.pendingBranch && !w.isUnmounted && p.asyncDep && !p.asyncResolved && p.suspenseId === w.pendingId && (w.deps--, w.deps === 0 && w.resolve()), S.NODE_ENV !== "production" && ih(p);
  }, we = (p, w, P, j = !1, B = !1, R = 0) => {
    for (let X = R; X < p.length; X++)
      Ve(p[X], w, P, j, B);
  }, Be = (p) => {
    if (p.shapeFlag & 6)
      return Be(p.component.subTree);
    if (p.shapeFlag & 128)
      return p.suspense.next();
    const w = m(p.anchor || p.el), P = w && w[Jc];
    return P ? m(P) : w;
  };
  let Ze = !1;
  const Xe = (p, w, P) => {
    p == null ? w._vnode && Ve(w._vnode, null, null, !0) : g(
      w._vnode || null,
      p,
      w,
      null,
      null,
      null,
      P
    ), w._vnode = p, Ze || (Ze = !0, Ca(), zc(), Ze = !1);
  }, Bt = {
    p: g,
    um: Ve,
    m: ee,
    r: Ge,
    mt: J,
    mc: O,
    pc: Ee,
    pbc: M,
    n: Be,
    o: e
  };
  let Rn, Hn;
  return {
    render: Xe,
    hydrate: Rn,
    createApp: $h(Xe, Rn)
  };
}
function dl({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function lo({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Zh(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function ui(e, t, n = !1) {
  const o = e.children, i = t.children;
  if (me(o) && me(i))
    for (let s = 0; s < o.length; s++) {
      const l = o[s];
      let r = i[s];
      r.shapeFlag & 1 && !r.dynamicChildren && ((r.patchFlag <= 0 || r.patchFlag === 32) && (r = i[s] = Kn(i[s]), r.el = l.el), !n && r.patchFlag !== -2 && ui(l, r)), r.type === Oo && (r.el = l.el), S.NODE_ENV !== "production" && r.type === nt && !r.el && (r.el = l.el);
    }
}
function Qh(e) {
  const t = e.slice(), n = [0];
  let o, i, s, l, r;
  const a = e.length;
  for (o = 0; o < a; o++) {
    const d = e[o];
    if (d !== 0) {
      if (i = n[n.length - 1], e[i] < d) {
        t[o] = i, n.push(o);
        continue;
      }
      for (s = 0, l = n.length - 1; s < l; )
        r = s + l >> 1, e[n[r]] < d ? s = r + 1 : l = r;
      d < e[n[s]] && (s > 0 && (t[o] = n[s - 1]), n[s] = o);
    }
  }
  for (s = n.length, l = n[s - 1]; s-- > 0; )
    n[s] = l, l = t[l];
  return n;
}
function kd(e) {
  const t = e.subTree.component;
  if (t)
    return t.asyncDep && !t.asyncResolved ? t : kd(t);
}
function Fa(e) {
  if (e)
    for (let t = 0; t < e.length; t++)
      e[t].flags |= 8;
}
const eg = Symbol.for("v-scx"), tg = () => {
  {
    const e = je(eg);
    return e || S.NODE_ENV !== "production" && W(
      "Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build."
    ), e;
  }
};
function An(e, t) {
  return Dr(e, null, t);
}
function Ce(e, t, n) {
  return S.NODE_ENV !== "production" && !be(t) && W(
    "`watch(fn, options?)` signature has been moved to a separate API. Use `watchEffect(fn, options?)` instead. `watch` now only supports `watch(source, cb, options?) signature."
  ), Dr(e, t, n);
}
function Dr(e, t, n = Fe) {
  const { immediate: o, deep: i, flush: s, once: l } = n;
  S.NODE_ENV !== "production" && !t && (o !== void 0 && W(
    'watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.'
  ), i !== void 0 && W(
    'watch() "deep" option is only respected when using the watch(source, callback, options?) signature.'
  ), l !== void 0 && W(
    'watch() "once" option is only respected when using the watch(source, callback, options?) signature.'
  ));
  const r = Ue({}, n);
  S.NODE_ENV !== "production" && (r.onWarn = W);
  const a = t && o || !t && s !== "post";
  let d;
  if (pi) {
    if (s === "sync") {
      const v = tg();
      d = v.__watcherHandles || (v.__watcherHandles = []);
    } else if (!a) {
      const v = () => {
      };
      return v.stop = st, v.resume = st, v.pause = st, v;
    }
  }
  const u = rt;
  r.call = (v, h, g) => Xt(v, u, h, g);
  let c = !1;
  s === "post" ? r.scheduler = (v) => {
    Nt(v, u && u.suspense);
  } : s !== "sync" && (c = !0, r.scheduler = (v, h) => {
    h ? v() : Ls(v);
  }), r.augmentJob = (v) => {
    t && (v.flags |= 4), c && (v.flags |= 2, u && (v.id = u.uid, v.i = u));
  };
  const m = Hv(e, t, r);
  return pi && (d ? d.push(m) : a && m()), m;
}
function ng(e, t, n) {
  const o = this.proxy, i = We(e) ? e.includes(".") ? Cd(o, e) : () => o[e] : e.bind(o, o);
  let s;
  be(t) ? s = t : (s = t.handler, n = t);
  const l = Pi(this), r = Dr(i, s.bind(o), n);
  return l(), r;
}
function Cd(e, t) {
  const n = t.split(".");
  return () => {
    let o = e;
    for (let i = 0; i < n.length && o; i++)
      o = o[n[i]];
    return o;
  };
}
const og = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${ft(t)}Modifiers`] || e[`${Jn(t)}Modifiers`];
function ig(e, t, ...n) {
  if (e.isUnmounted) return;
  const o = e.vnode.props || Fe;
  if (S.NODE_ENV !== "production") {
    const {
      emitsOptions: u,
      propsOptions: [c]
    } = e;
    if (u)
      if (!(t in u))
        (!c || !(uo(ft(t)) in c)) && W(
          `Component emitted event "${t}" but it is neither declared in the emits option nor as an "${uo(ft(t))}" prop.`
        );
      else {
        const m = u[t];
        be(m) && (m(...n) || W(
          `Invalid event arguments: event validation failed for event "${t}".`
        ));
      }
  }
  let i = n;
  const s = t.startsWith("update:"), l = s && og(o, t.slice(7));
  if (l && (l.trim && (i = n.map((u) => We(u) ? u.trim() : u)), l.number && (i = n.map(vc))), S.NODE_ENV !== "production" && rh(e, t, i), S.NODE_ENV !== "production") {
    const u = t.toLowerCase();
    u !== t && o[uo(u)] && W(
      `Event "${u}" is emitted in component ${zs(
        e,
        e.type
      )} but the handler is registered for "${t}". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "${Jn(
        t
      )}" instead of "${t}".`
    );
  }
  let r, a = o[r = uo(t)] || // also try camelCase event handler (#2249)
  o[r = uo(ft(t))];
  !a && s && (a = o[r = uo(Jn(t))]), a && Xt(
    a,
    e,
    6,
    i
  );
  const d = o[r + "Once"];
  if (d) {
    if (!e.emitted)
      e.emitted = {};
    else if (e.emitted[r])
      return;
    e.emitted[r] = !0, Xt(
      d,
      e,
      6,
      i
    );
  }
}
function Ed(e, t, n = !1) {
  const o = t.emitsCache, i = o.get(e);
  if (i !== void 0)
    return i;
  const s = e.emits;
  let l = {}, r = !1;
  if (!be(e)) {
    const a = (d) => {
      const u = Ed(d, t, !0);
      u && (r = !0, Ue(l, u));
    };
    !n && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
  }
  return !s && !r ? (Ie(e) && o.set(e, null), null) : (me(s) ? s.forEach((a) => l[a] = null) : Ue(l, s), Ie(e) && o.set(e, l), l);
}
function Rs(e, t) {
  return !e || !Ei(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), Ae(e, t[0].toLowerCase() + t.slice(1)) || Ae(e, Jn(t)) || Ae(e, t));
}
let jl = !1;
function hs() {
  jl = !0;
}
function fl(e) {
  const {
    type: t,
    vnode: n,
    proxy: o,
    withProxy: i,
    propsOptions: [s],
    slots: l,
    attrs: r,
    emit: a,
    render: d,
    renderCache: u,
    props: c,
    data: m,
    setupState: v,
    ctx: h,
    inheritAttrs: g
  } = e, _ = fs(e);
  let x, V;
  S.NODE_ENV !== "production" && (jl = !1);
  try {
    if (n.shapeFlag & 4) {
      const C = i || o, E = S.NODE_ENV !== "production" && v.__isScriptSetup ? new Proxy(C, {
        get(F, N, O) {
          return W(
            `Property '${String(
              N
            )}' was accessed via 'this'. Avoid using 'this' in templates.`
          ), Reflect.get(F, N, O);
        }
      }) : C;
      x = Kt(
        d.call(
          E,
          C,
          u,
          S.NODE_ENV !== "production" ? ln(c) : c,
          v,
          m,
          h
        )
      ), V = r;
    } else {
      const C = t;
      S.NODE_ENV !== "production" && r === c && hs(), x = Kt(
        C.length > 1 ? C(
          S.NODE_ENV !== "production" ? ln(c) : c,
          S.NODE_ENV !== "production" ? {
            get attrs() {
              return hs(), ln(r);
            },
            slots: l,
            emit: a
          } : { attrs: r, slots: l, emit: a }
        ) : C(
          S.NODE_ENV !== "production" ? ln(c) : c,
          null
        )
      ), V = t.props ? r : sg(r);
    }
  } catch (C) {
    ci.length = 0, Oi(C, e, 1), x = f(nt);
  }
  let A = x, D;
  if (S.NODE_ENV !== "production" && x.patchFlag > 0 && x.patchFlag & 2048 && ([A, D] = xd(x)), V && g !== !1) {
    const C = Object.keys(V), { shapeFlag: E } = A;
    if (C.length) {
      if (E & 7)
        s && C.some(ls) && (V = lg(
          V,
          s
        )), A = Jt(A, V, !1, !0);
      else if (S.NODE_ENV !== "production" && !jl && A.type !== nt) {
        const F = Object.keys(r), N = [], O = [];
        for (let $ = 0, M = F.length; $ < M; $++) {
          const k = F[$];
          Ei(k) ? ls(k) || N.push(k[2].toLowerCase() + k.slice(3)) : O.push(k);
        }
        O.length && W(
          `Extraneous non-props attributes (${O.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes.`
        ), N.length && W(
          `Extraneous non-emits event listeners (${N.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.`
        );
      }
    }
  }
  return n.dirs && (S.NODE_ENV !== "production" && !La(A) && W(
    "Runtime directive used on component with non-element root node. The directives will not function as intended."
  ), A = Jt(A, null, !1, !0), A.dirs = A.dirs ? A.dirs.concat(n.dirs) : n.dirs), n.transition && (S.NODE_ENV !== "production" && !La(A) && W(
    "Component inside <Transition> renders non-element root node that cannot be animated."
  ), Eo(A, n.transition)), S.NODE_ENV !== "production" && D ? D(A) : x = A, fs(_), x;
}
const xd = (e) => {
  const t = e.children, n = e.dynamicChildren, o = Pr(t, !1);
  if (o) {
    if (S.NODE_ENV !== "production" && o.patchFlag > 0 && o.patchFlag & 2048)
      return xd(o);
  } else return [e, void 0];
  const i = t.indexOf(o), s = n ? n.indexOf(o) : -1, l = (r) => {
    t[i] = r, n && (s > -1 ? n[s] = r : r.patchFlag > 0 && (e.dynamicChildren = [...n, r]));
  };
  return [Kt(o), l];
};
function Pr(e, t = !0) {
  let n;
  for (let o = 0; o < e.length; o++) {
    const i = e[o];
    if (Wo(i)) {
      if (i.type !== nt || i.children === "v-if") {
        if (n)
          return;
        if (n = i, S.NODE_ENV !== "production" && t && n.patchFlag > 0 && n.patchFlag & 2048)
          return Pr(n.children);
      }
    } else
      return;
  }
  return n;
}
const sg = (e) => {
  let t;
  for (const n in e)
    (n === "class" || n === "style" || Ei(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, lg = (e, t) => {
  const n = {};
  for (const o in e)
    (!ls(o) || !(o.slice(9) in t)) && (n[o] = e[o]);
  return n;
}, La = (e) => e.shapeFlag & 7 || e.type === nt;
function rg(e, t, n) {
  const { props: o, children: i, component: s } = e, { props: l, children: r, patchFlag: a } = t, d = s.emitsOptions;
  if (S.NODE_ENV !== "production" && (i || r) && Yt || t.dirs || t.transition)
    return !0;
  if (n && a >= 0) {
    if (a & 1024)
      return !0;
    if (a & 16)
      return o ? Ba(o, l, d) : !!l;
    if (a & 8) {
      const u = t.dynamicProps;
      for (let c = 0; c < u.length; c++) {
        const m = u[c];
        if (l[m] !== o[m] && !Rs(d, m))
          return !0;
      }
    }
  } else
    return (i || r) && (!r || !r.$stable) ? !0 : o === l ? !1 : o ? l ? Ba(o, l, d) : !0 : !!l;
  return !1;
}
function Ba(e, t, n) {
  const o = Object.keys(t);
  if (o.length !== Object.keys(e).length)
    return !0;
  for (let i = 0; i < o.length; i++) {
    const s = o[i];
    if (t[s] !== e[s] && !Rs(n, s))
      return !0;
  }
  return !1;
}
function ag({ vnode: e, parent: t }, n) {
  for (; t; ) {
    const o = t.subTree;
    if (o.suspense && o.suspense.activeBranch === e && (o.el = e.el), o === e)
      (e = t.vnode).el = n, t = t.parent;
    else
      break;
  }
}
const Nd = (e) => e.__isSuspense;
function ug(e, t) {
  t && t.pendingBranch ? me(e) ? t.effects.push(...e) : t.effects.push(e) : jc(e);
}
const Ne = Symbol.for("v-fgt"), Oo = Symbol.for("v-txt"), nt = Symbol.for("v-cmt"), Qi = Symbol.for("v-stc"), ci = [];
let It = null;
function ae(e = !1) {
  ci.push(It = e ? null : []);
}
function cg() {
  ci.pop(), It = ci[ci.length - 1] || null;
}
let gi = 1;
function Ra(e) {
  gi += e, e < 0 && It && (It.hasOnce = !0);
}
function Vd(e) {
  return e.dynamicChildren = gi > 0 ? It || Ro : null, cg(), gi > 0 && It && It.push(e), e;
}
function lt(e, t, n, o, i, s) {
  return Vd(
    se(
      e,
      t,
      n,
      o,
      i,
      s,
      !0
    )
  );
}
function ke(e, t, n, o, i) {
  return Vd(
    f(
      e,
      t,
      n,
      o,
      i,
      !0
    )
  );
}
function Wo(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function fo(e, t) {
  if (S.NODE_ENV !== "production" && t.shapeFlag & 6 && e.component) {
    const n = Ji.get(t.type);
    if (n && n.has(e.component))
      return e.shapeFlag &= -257, t.shapeFlag &= -513, !1;
  }
  return e.type === t.type && e.key === t.key;
}
const dg = (...e) => Td(
  ...e
), Od = ({ key: e }) => e ?? null, es = ({
  ref: e,
  ref_key: t,
  ref_for: n
}) => (typeof e == "number" && (e = "" + e), e != null ? We(e) || He(e) || be(e) ? { i: gt, r: e, k: t, f: !!n } : e : null);
function se(e, t = null, n = null, o = 0, i = null, s = e === Ne ? 0 : 1, l = !1, r = !1) {
  const a = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && Od(t),
    ref: t && es(t),
    scopeId: qc,
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
    shapeFlag: s,
    patchFlag: o,
    dynamicProps: i,
    dynamicChildren: null,
    appContext: null,
    ctx: gt
  };
  return r ? (Ar(a, n), s & 128 && e.normalize(a)) : n && (a.shapeFlag |= We(n) ? 8 : 16), S.NODE_ENV !== "production" && a.key !== a.key && W("VNode created with invalid key (NaN). VNode type:", a.type), gi > 0 && // avoid a block node from tracking itself
  !l && // has current parent block
  It && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (a.patchFlag > 0 || s & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  a.patchFlag !== 32 && It.push(a), a;
}
const f = S.NODE_ENV !== "production" ? dg : Td;
function Td(e, t = null, n = null, o = 0, i = null, s = !1) {
  if ((!e || e === kh) && (S.NODE_ENV !== "production" && !e && W(`Invalid vnode type when creating vnode: ${e}.`), e = nt), Wo(e)) {
    const r = Jt(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return n && Ar(r, n), gi > 0 && !s && It && (r.shapeFlag & 6 ? It[It.indexOf(e)] = r : It.push(r)), r.patchFlag = -2, r;
  }
  if (Id(e) && (e = e.__vccOpts), t) {
    t = fg(t);
    let { class: r, style: a } = t;
    r && !We(r) && (t.class = dn(r)), Ie(a) && (mi(a) && !me(a) && (a = Ue({}, a)), t.style = nn(a));
  }
  const l = We(e) ? 1 : Nd(e) ? 128 : Zc(e) ? 64 : Ie(e) ? 4 : be(e) ? 2 : 0;
  return S.NODE_ENV !== "production" && l & 4 && mi(e) && (e = ue(e), W(
    "Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with `markRaw` or using `shallowRef` instead of `ref`.",
    `
Component that was made reactive: `,
    e
  )), se(
    e,
    t,
    n,
    o,
    i,
    l,
    s,
    !0
  );
}
function fg(e) {
  return e ? mi(e) || gd(e) ? Ue({}, e) : e : null;
}
function Jt(e, t, n = !1, o = !1) {
  const { props: i, ref: s, patchFlag: l, children: r, transition: a } = e, d = t ? Oe(i || {}, t) : i, u = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: d,
    key: d && Od(d),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      n && s ? me(s) ? s.concat(es(t)) : [s, es(t)] : es(t)
    ) : s,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: S.NODE_ENV !== "production" && l === -1 && me(r) ? r.map(Dd) : r,
    target: e.target,
    targetStart: e.targetStart,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: t && e.type !== Ne ? l === -1 ? 16 : l | 16 : l,
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
    ssContent: e.ssContent && Jt(e.ssContent),
    ssFallback: e.ssFallback && Jt(e.ssFallback),
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return a && o && Eo(
    u,
    a.clone(u)
  ), u;
}
function Dd(e) {
  const t = Jt(e);
  return me(e.children) && (t.children = e.children.map(Dd)), t;
}
function Q(e = " ", t = 0) {
  return f(Oo, null, e, t);
}
function ct(e = "", t = !1) {
  return t ? (ae(), ke(nt, null, e)) : f(nt, null, e);
}
function Kt(e) {
  return e == null || typeof e == "boolean" ? f(nt) : me(e) ? f(
    Ne,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : Wo(e) ? Kn(e) : f(Oo, null, String(e));
}
function Kn(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : Jt(e);
}
function Ar(e, t) {
  let n = 0;
  const { shapeFlag: o } = e;
  if (t == null)
    t = null;
  else if (me(t))
    n = 16;
  else if (typeof t == "object")
    if (o & 65) {
      const i = t.default;
      i && (i._c && (i._d = !1), Ar(e, i()), i._c && (i._d = !0));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !gd(t) ? t._ctx = gt : i === 3 && gt && (gt.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else be(t) ? (t = { default: t, _ctx: gt }, n = 32) : (t = String(t), o & 64 ? (n = 16, t = [Q(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function Oe(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    for (const i in o)
      if (i === "class")
        t.class !== o.class && (t.class = dn([t.class, o.class]));
      else if (i === "style")
        t.style = nn([t.style, o.style]);
      else if (Ei(i)) {
        const s = t[i], l = o[i];
        l && s !== l && !(me(s) && s.includes(l)) && (t[i] = s ? [].concat(s, l) : l);
      } else i !== "" && (t[i] = o[i]);
  }
  return t;
}
function en(e, t, n, o = null) {
  Xt(e, t, 7, [
    n,
    o
  ]);
}
const mg = md();
let vg = 0;
function hg(e, t, n) {
  const o = e.type, i = (t ? t.appContext : e.appContext) || mg, s = {
    uid: vg++,
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
    scope: new yc(
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
    propsOptions: yd(o, i),
    emitsOptions: Ed(o, i),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: Fe,
    // inheritAttrs
    inheritAttrs: o.inheritAttrs,
    // state
    ctx: Fe,
    data: Fe,
    props: Fe,
    attrs: Fe,
    slots: Fe,
    refs: Fe,
    setupState: Fe,
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
  return S.NODE_ENV !== "production" ? s.ctx = Eh(s) : s.ctx = { _: s }, s.root = t ? t.root : s, s.emit = ig.bind(null, s), e.ce && e.ce(s), s;
}
let rt = null;
const Hs = () => rt || gt;
let gs, zl;
{
  const e = Ni(), t = (n, o) => {
    let i;
    return (i = e[n]) || (i = e[n] = []), i.push(o), (s) => {
      i.length > 1 ? i.forEach((l) => l(s)) : i[0](s);
    };
  };
  gs = t(
    "__VUE_INSTANCE_SETTERS__",
    (n) => rt = n
  ), zl = t(
    "__VUE_SSR_SETTERS__",
    (n) => pi = n
  );
}
const Pi = (e) => {
  const t = rt;
  return gs(e), e.scope.on(), () => {
    e.scope.off(), gs(t);
  };
}, Ha = () => {
  rt && rt.scope.off(), gs(null);
}, gg = /* @__PURE__ */ On("slot,component");
function Wl(e, { isNativeTag: t }) {
  (gg(e) || t(e)) && W(
    "Do not use built-in or reserved HTML elements as component id: " + e
  );
}
function Pd(e) {
  return e.vnode.shapeFlag & 4;
}
let pi = !1;
function pg(e, t = !1, n = !1) {
  t && zl(t);
  const { props: o, children: i } = e.vnode, s = Pd(e);
  Mh(e, o, s, t), Gh(e, i, n);
  const l = s ? yg(e, t) : void 0;
  return t && zl(!1), l;
}
function yg(e, t) {
  var n;
  const o = e.type;
  if (S.NODE_ENV !== "production") {
    if (o.name && Wl(o.name, e.appContext.config), o.components) {
      const s = Object.keys(o.components);
      for (let l = 0; l < s.length; l++)
        Wl(s[l], e.appContext.config);
    }
    if (o.directives) {
      const s = Object.keys(o.directives);
      for (let l = 0; l < s.length; l++)
        Xc(s[l]);
    }
    o.compilerOptions && bg() && W(
      '"compilerOptions" is only supported when using a build of Vue that includes the runtime compiler. Since you are using a runtime-only build, the options should be passed via your build tool config instead.'
    );
  }
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, dd), S.NODE_ENV !== "production" && xh(e);
  const { setup: i } = o;
  if (i) {
    Tn();
    const s = e.setupContext = i.length > 1 ? wg(e) : null, l = Pi(e), r = Yo(
      i,
      e,
      0,
      [
        S.NODE_ENV !== "production" ? ln(e.props) : e.props,
        s
      ]
    ), a = mr(r);
    if (Dn(), l(), (a || e.sp) && !ai(e) && sd(e), a) {
      if (r.then(Ha, Ha), t)
        return r.then((d) => {
          ja(e, d, t);
        }).catch((d) => {
          Oi(d, e, 0);
        });
      if (e.asyncDep = r, S.NODE_ENV !== "production" && !e.suspense) {
        const d = (n = o.name) != null ? n : "Anonymous";
        W(
          `Component <${d}>: setup function returned a promise, but no <Suspense> boundary was found in the parent component tree. A component with async setup() must be nested in a <Suspense> in order to be rendered.`
        );
      }
    } else
      ja(e, r, t);
  } else
    Ad(e, t);
}
function ja(e, t, n) {
  be(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Ie(t) ? (S.NODE_ENV !== "production" && Wo(t) && W(
    "setup() should not return VNodes directly - return a render function instead."
  ), S.NODE_ENV !== "production" && (e.devtoolsRawSetupState = t), e.setupState = Fc(t), S.NODE_ENV !== "production" && Nh(e)) : S.NODE_ENV !== "production" && t !== void 0 && W(
    `setup() should return an object. Received: ${t === null ? "null" : typeof t}`
  ), Ad(e, n);
}
let Ul;
const bg = () => !Ul;
function Ad(e, t, n) {
  const o = e.type;
  if (!e.render) {
    if (!t && Ul && !o.render) {
      const i = o.template || Or(e).template;
      if (i) {
        S.NODE_ENV !== "production" && _n(e, "compile");
        const { isCustomElement: s, compilerOptions: l } = e.appContext.config, { delimiters: r, compilerOptions: a } = o, d = Ue(
          Ue(
            {
              isCustomElement: s,
              delimiters: r
            },
            l
          ),
          a
        );
        o.render = Ul(i, d), S.NODE_ENV !== "production" && wn(e, "compile");
      }
    }
    e.render = o.render || st;
  }
  {
    const i = Pi(e);
    Tn();
    try {
      Oh(e);
    } finally {
      Dn(), i();
    }
  }
  S.NODE_ENV !== "production" && !o.render && e.render === st && !t && (o.template ? W(
    'Component provided template option but runtime compilation is not supported in this build of Vue. Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".'
  ) : W("Component is missing template or render function: ", o));
}
const za = S.NODE_ENV !== "production" ? {
  get(e, t) {
    return hs(), it(e, "get", ""), e[t];
  },
  set() {
    return W("setupContext.attrs is readonly."), !1;
  },
  deleteProperty() {
    return W("setupContext.attrs is readonly."), !1;
  }
} : {
  get(e, t) {
    return it(e, "get", ""), e[t];
  }
};
function _g(e) {
  return new Proxy(e.slots, {
    get(t, n) {
      return it(e, "get", "$slots"), t[n];
    }
  });
}
function wg(e) {
  const t = (n) => {
    if (S.NODE_ENV !== "production" && (e.exposed && W("expose() should be called only once per setup()."), n != null)) {
      let o = typeof n;
      o === "object" && (me(n) ? o = "array" : He(n) && (o = "ref")), o !== "object" && W(
        `expose() should be passed a plain object, received ${o}.`
      );
    }
    e.exposed = n || {};
  };
  if (S.NODE_ENV !== "production") {
    let n, o;
    return Object.freeze({
      get attrs() {
        return n || (n = new Proxy(e.attrs, za));
      },
      get slots() {
        return o || (o = _g(e));
      },
      get emit() {
        return (i, ...s) => e.emit(i, ...s);
      },
      expose: t
    });
  } else
    return {
      attrs: new Proxy(e.attrs, za),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
}
function js(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Fc($c(e.exposed)), {
    get(t, n) {
      if (n in t)
        return t[n];
      if (n in _o)
        return _o[n](e);
    },
    has(t, n) {
      return n in t || n in _o;
    }
  })) : e.proxy;
}
const Sg = /(?:^|[-_])(\w)/g, kg = (e) => e.replace(Sg, (t) => t.toUpperCase()).replace(/[-_]/g, "");
function Ir(e, t = !0) {
  return be(e) ? e.displayName || e.name : e.name || t && e.__name;
}
function zs(e, t, n = !1) {
  let o = Ir(t);
  if (!o && t.__file) {
    const i = t.__file.match(/([^/\\]+)\.\w+$/);
    i && (o = i[1]);
  }
  if (!o && e && e.parent) {
    const i = (s) => {
      for (const l in s)
        if (s[l] === t)
          return l;
    };
    o = i(
      e.components || e.parent.type.components
    ) || i(e.appContext.components);
  }
  return o ? kg(o) : n ? "App" : "Anonymous";
}
function Id(e) {
  return be(e) && "__vccOpts" in e;
}
const y = (e, t) => {
  const n = Bv(e, t, pi);
  if (S.NODE_ENV !== "production") {
    const o = Hs();
    o && o.appContext.config.warnRecursiveComputed && (n._warnRecursive = !0);
  }
  return n;
};
function Qn(e, t, n) {
  const o = arguments.length;
  return o === 2 ? Ie(t) && !me(t) ? Wo(t) ? f(e, null, [t]) : f(e, t) : f(e, null, t) : (o > 3 ? n = Array.prototype.slice.call(arguments, 2) : o === 3 && Wo(n) && (n = [n]), f(e, t, n));
}
function Cg() {
  if (S.NODE_ENV === "production" || typeof window > "u")
    return;
  const e = { style: "color:#3ba776" }, t = { style: "color:#1677ff" }, n = { style: "color:#f5222d" }, o = { style: "color:#eb2f96" }, i = {
    __vue_custom_formatter: !0,
    header(c) {
      return Ie(c) ? c.__isVue ? ["div", e, "VueInstance"] : He(c) ? [
        "div",
        {},
        ["span", e, u(c)],
        "<",
        // avoid debugger accessing value affecting behavior
        r("_value" in c ? c._value : c),
        ">"
      ] : po(c) ? [
        "div",
        {},
        ["span", e, kt(c) ? "ShallowReactive" : "Reactive"],
        "<",
        r(c),
        `>${Nn(c) ? " (readonly)" : ""}`
      ] : Nn(c) ? [
        "div",
        {},
        ["span", e, kt(c) ? "ShallowReadonly" : "Readonly"],
        "<",
        r(c),
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
          ...s(c.$)
        ];
    }
  };
  function s(c) {
    const m = [];
    c.type.props && c.props && m.push(l("props", ue(c.props))), c.setupState !== Fe && m.push(l("setup", c.setupState)), c.data !== Fe && m.push(l("data", ue(c.data)));
    const v = a(c, "computed");
    v && m.push(l("computed", v));
    const h = a(c, "inject");
    return h && m.push(l("injected", h)), m.push([
      "div",
      {},
      [
        "span",
        {
          style: o.style + ";opacity:0.66"
        },
        "$ (internal): "
      ],
      ["object", { object: c }]
    ]), m;
  }
  function l(c, m) {
    return m = Ue({}, m), Object.keys(m).length ? [
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
          ["span", o, v + ": "],
          r(m[v], !1)
        ])
      ]
    ] : ["span", {}];
  }
  function r(c, m = !0) {
    return typeof c == "number" ? ["span", t, c] : typeof c == "string" ? ["span", n, JSON.stringify(c)] : typeof c == "boolean" ? ["span", o, c] : Ie(c) ? ["object", { object: m ? ue(c) : c }] : ["span", n, String(c)];
  }
  function a(c, m) {
    const v = c.type;
    if (be(v))
      return;
    const h = {};
    for (const g in c.ctx)
      d(v, g, m) && (h[g] = c.ctx[g]);
    return h;
  }
  function d(c, m, v) {
    const h = c[v];
    if (me(h) && h.includes(m) || Ie(h) && m in h || c.extends && d(c.extends, m, v) || c.mixins && c.mixins.some((g) => d(g, m, v)))
      return !0;
  }
  function u(c) {
    return kt(c) ? "ShallowRef" : c.effect ? "ComputedRef" : "Ref";
  }
  window.devtoolsFormatters ? window.devtoolsFormatters.push(i) : window.devtoolsFormatters = [i];
}
const Wa = "3.5.12", Ct = S.NODE_ENV !== "production" ? W : st;
var Mt = {};
let Kl;
const Ua = typeof window < "u" && window.trustedTypes;
if (Ua)
  try {
    Kl = /* @__PURE__ */ Ua.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch (e) {
    Mt.NODE_ENV !== "production" && Ct(`Error creating trusted types policy: ${e}`);
  }
const $d = Kl ? (e) => Kl.createHTML(e) : (e) => e, Eg = "http://www.w3.org/2000/svg", xg = "http://www.w3.org/1998/Math/MathML", kn = typeof document < "u" ? document : null, Ka = kn && /* @__PURE__ */ kn.createElement("template"), Ng = {
  insert: (e, t, n) => {
    t.insertBefore(e, n || null);
  },
  remove: (e) => {
    const t = e.parentNode;
    t && t.removeChild(e);
  },
  createElement: (e, t, n, o) => {
    const i = t === "svg" ? kn.createElementNS(Eg, e) : t === "mathml" ? kn.createElementNS(xg, e) : n ? kn.createElement(e, { is: n }) : kn.createElement(e);
    return e === "select" && o && o.multiple != null && i.setAttribute("multiple", o.multiple), i;
  },
  createText: (e) => kn.createTextNode(e),
  createComment: (e) => kn.createComment(e),
  setText: (e, t) => {
    e.nodeValue = t;
  },
  setElementText: (e, t) => {
    e.textContent = t;
  },
  parentNode: (e) => e.parentNode,
  nextSibling: (e) => e.nextSibling,
  querySelector: (e) => kn.querySelector(e),
  setScopeId(e, t) {
    e.setAttribute(t, "");
  },
  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  insertStaticContent(e, t, n, o, i, s) {
    const l = n ? n.previousSibling : t.lastChild;
    if (i && (i === s || i.nextSibling))
      for (; t.insertBefore(i.cloneNode(!0), n), !(i === s || !(i = i.nextSibling)); )
        ;
    else {
      Ka.innerHTML = $d(
        o === "svg" ? `<svg>${e}</svg>` : o === "mathml" ? `<math>${e}</math>` : e
      );
      const r = Ka.content;
      if (o === "svg" || o === "mathml") {
        const a = r.firstChild;
        for (; a.firstChild; )
          r.appendChild(a.firstChild);
        r.removeChild(a);
      }
      t.insertBefore(r, n);
    }
    return [
      // first
      l ? l.nextSibling : t.firstChild,
      // last
      n ? n.previousSibling : t.lastChild
    ];
  }
}, jn = "transition", Zo = "animation", Uo = Symbol("_vtc"), Md = {
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
}, Fd = /* @__PURE__ */ Ue(
  {},
  td,
  Md
), Vg = (e) => (e.displayName = "Transition", e.props = Fd, e), xo = /* @__PURE__ */ Vg(
  (e, { slots: t }) => Qn(mh, Ld(e), t)
), ro = (e, t = []) => {
  me(e) ? e.forEach((n) => n(...t)) : e && e(...t);
}, Ga = (e) => e ? me(e) ? e.some((t) => t.length > 1) : e.length > 1 : !1;
function Ld(e) {
  const t = {};
  for (const k in e)
    k in Md || (t[k] = e[k]);
  if (e.css === !1)
    return t;
  const {
    name: n = "v",
    type: o,
    duration: i,
    enterFromClass: s = `${n}-enter-from`,
    enterActiveClass: l = `${n}-enter-active`,
    enterToClass: r = `${n}-enter-to`,
    appearFromClass: a = s,
    appearActiveClass: d = l,
    appearToClass: u = r,
    leaveFromClass: c = `${n}-leave-from`,
    leaveActiveClass: m = `${n}-leave-active`,
    leaveToClass: v = `${n}-leave-to`
  } = e, h = Og(i), g = h && h[0], _ = h && h[1], {
    onBeforeEnter: x,
    onEnter: V,
    onEnterCancelled: A,
    onLeave: D,
    onLeaveCancelled: C,
    onBeforeAppear: E = x,
    onAppear: F = V,
    onAppearCancelled: N = A
  } = t, O = (k, I, L) => {
    zn(k, I ? u : r), zn(k, I ? d : l), L && L();
  }, $ = (k, I) => {
    k._isLeaving = !1, zn(k, c), zn(k, v), zn(k, m), I && I();
  }, M = (k) => (I, L) => {
    const J = k ? F : V, re = () => O(I, k, L);
    ro(J, [I, re]), Ya(() => {
      zn(I, k ? a : s), Sn(I, k ? u : r), Ga(J) || qa(I, o, g, re);
    });
  };
  return Ue(t, {
    onBeforeEnter(k) {
      ro(x, [k]), Sn(k, s), Sn(k, l);
    },
    onBeforeAppear(k) {
      ro(E, [k]), Sn(k, a), Sn(k, d);
    },
    onEnter: M(!1),
    onAppear: M(!0),
    onLeave(k, I) {
      k._isLeaving = !0;
      const L = () => $(k, I);
      Sn(k, c), Sn(k, m), Rd(), Ya(() => {
        k._isLeaving && (zn(k, c), Sn(k, v), Ga(D) || qa(k, o, _, L));
      }), ro(D, [k, L]);
    },
    onEnterCancelled(k) {
      O(k, !1), ro(A, [k]);
    },
    onAppearCancelled(k) {
      O(k, !0), ro(N, [k]);
    },
    onLeaveCancelled(k) {
      $(k), ro(C, [k]);
    }
  });
}
function Og(e) {
  if (e == null)
    return null;
  if (Ie(e))
    return [ml(e.enter), ml(e.leave)];
  {
    const t = ml(e);
    return [t, t];
  }
}
function ml(e) {
  const t = Zm(e);
  return Mt.NODE_ENV !== "production" && Kv(t, "<transition> explicit duration"), t;
}
function Sn(e, t) {
  t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Uo] || (e[Uo] = /* @__PURE__ */ new Set())).add(t);
}
function zn(e, t) {
  t.split(/\s+/).forEach((o) => o && e.classList.remove(o));
  const n = e[Uo];
  n && (n.delete(t), n.size || (e[Uo] = void 0));
}
function Ya(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let Tg = 0;
function qa(e, t, n, o) {
  const i = e._endId = ++Tg, s = () => {
    i === e._endId && o();
  };
  if (n != null)
    return setTimeout(s, n);
  const { type: l, timeout: r, propCount: a } = Bd(e, t);
  if (!l)
    return o();
  const d = l + "end";
  let u = 0;
  const c = () => {
    e.removeEventListener(d, m), s();
  }, m = (v) => {
    v.target === e && ++u >= a && c();
  };
  setTimeout(() => {
    u < a && c();
  }, r + 1), e.addEventListener(d, m);
}
function Bd(e, t) {
  const n = window.getComputedStyle(e), o = (h) => (n[h] || "").split(", "), i = o(`${jn}Delay`), s = o(`${jn}Duration`), l = Xa(i, s), r = o(`${Zo}Delay`), a = o(`${Zo}Duration`), d = Xa(r, a);
  let u = null, c = 0, m = 0;
  t === jn ? l > 0 && (u = jn, c = l, m = s.length) : t === Zo ? d > 0 && (u = Zo, c = d, m = a.length) : (c = Math.max(l, d), u = c > 0 ? l > d ? jn : Zo : null, m = u ? u === jn ? s.length : a.length : 0);
  const v = u === jn && /\b(transform|all)(,|$)/.test(
    o(`${jn}Property`).toString()
  );
  return {
    type: u,
    timeout: c,
    propCount: m,
    hasTransform: v
  };
}
function Xa(e, t) {
  for (; e.length < t.length; )
    e = e.concat(e);
  return Math.max(...t.map((n, o) => Ja(n) + Ja(e[o])));
}
function Ja(e) {
  return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
}
function Rd() {
  return document.body.offsetHeight;
}
function Dg(e, t, n) {
  const o = e[Uo];
  o && (t = (t ? [t, ...o] : [...o]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
const ps = Symbol("_vod"), Hd = Symbol("_vsh"), In = {
  beforeMount(e, { value: t }, { transition: n }) {
    e[ps] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : Qo(e, t);
  },
  mounted(e, { value: t }, { transition: n }) {
    n && t && n.enter(e);
  },
  updated(e, { value: t, oldValue: n }, { transition: o }) {
    !t != !n && (o ? t ? (o.beforeEnter(e), Qo(e, !0), o.enter(e)) : o.leave(e, () => {
      Qo(e, !1);
    }) : Qo(e, t));
  },
  beforeUnmount(e, { value: t }) {
    Qo(e, t);
  }
};
Mt.NODE_ENV !== "production" && (In.name = "show");
function Qo(e, t) {
  e.style.display = t ? e[ps] : "none", e[Hd] = !t;
}
const Pg = Symbol(Mt.NODE_ENV !== "production" ? "CSS_VAR_TEXT" : ""), Ag = /(^|;)\s*display\s*:/;
function Ig(e, t, n) {
  const o = e.style, i = We(n);
  let s = !1;
  if (n && !i) {
    if (t)
      if (We(t))
        for (const l of t.split(";")) {
          const r = l.slice(0, l.indexOf(":")).trim();
          n[r] == null && ts(o, r, "");
        }
      else
        for (const l in t)
          n[l] == null && ts(o, l, "");
    for (const l in n)
      l === "display" && (s = !0), ts(o, l, n[l]);
  } else if (i) {
    if (t !== n) {
      const l = o[Pg];
      l && (n += ";" + l), o.cssText = n, s = Ag.test(n);
    }
  } else t && e.removeAttribute("style");
  ps in e && (e[ps] = s ? o.display : "", e[Hd] && (o.display = "none"));
}
const $g = /[^\\];\s*$/, Za = /\s*!important$/;
function ts(e, t, n) {
  if (me(n))
    n.forEach((o) => ts(e, t, o));
  else if (n == null && (n = ""), Mt.NODE_ENV !== "production" && $g.test(n) && Ct(
    `Unexpected semicolon at the end of '${t}' style value: '${n}'`
  ), t.startsWith("--"))
    e.setProperty(t, n);
  else {
    const o = Mg(e, t);
    Za.test(n) ? e.setProperty(
      Jn(o),
      n.replace(Za, ""),
      "important"
    ) : e[o] = n;
  }
}
const Qa = ["Webkit", "Moz", "ms"], vl = {};
function Mg(e, t) {
  const n = vl[t];
  if (n)
    return n;
  let o = ft(t);
  if (o !== "filter" && o in e)
    return vl[t] = o;
  o = zt(o);
  for (let i = 0; i < Qa.length; i++) {
    const s = Qa[i] + o;
    if (s in e)
      return vl[t] = s;
  }
  return t;
}
const eu = "http://www.w3.org/1999/xlink";
function tu(e, t, n, o, i, s = cv(t)) {
  o && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(eu, t.slice(6, t.length)) : e.setAttributeNS(eu, t, n) : n == null || s && !hc(n) ? e.removeAttribute(t) : e.setAttribute(
    t,
    s ? "" : hn(n) ? String(n) : n
  );
}
function nu(e, t, n, o, i) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? $d(n) : n);
    return;
  }
  const s = e.tagName;
  if (t === "value" && s !== "PROGRESS" && // custom elements may use _value internally
  !s.includes("-")) {
    const r = s === "OPTION" ? e.getAttribute("value") || "" : e.value, a = n == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      e.type === "checkbox" ? "on" : ""
    ) : String(n);
    (r !== a || !("_value" in e)) && (e.value = a), n == null && e.removeAttribute(t), e._value = n;
    return;
  }
  let l = !1;
  if (n === "" || n == null) {
    const r = typeof e[t];
    r === "boolean" ? n = hc(n) : n == null && r === "string" ? (n = "", l = !0) : r === "number" && (n = 0, l = !0);
  }
  try {
    e[t] = n;
  } catch (r) {
    Mt.NODE_ENV !== "production" && !l && Ct(
      `Failed setting prop "${t}" on <${s.toLowerCase()}>: value ${n} is invalid.`,
      r
    );
  }
  l && e.removeAttribute(i || t);
}
function jd(e, t, n, o) {
  e.addEventListener(t, n, o);
}
function Fg(e, t, n, o) {
  e.removeEventListener(t, n, o);
}
const ou = Symbol("_vei");
function Lg(e, t, n, o, i = null) {
  const s = e[ou] || (e[ou] = {}), l = s[t];
  if (o && l)
    l.value = Mt.NODE_ENV !== "production" ? su(o, t) : o;
  else {
    const [r, a] = Bg(t);
    if (o) {
      const d = s[t] = jg(
        Mt.NODE_ENV !== "production" ? su(o, t) : o,
        i
      );
      jd(e, r, d, a);
    } else l && (Fg(e, r, l, a), s[t] = void 0);
  }
}
const iu = /(?:Once|Passive|Capture)$/;
function Bg(e) {
  let t;
  if (iu.test(e)) {
    t = {};
    let o;
    for (; o = e.match(iu); )
      e = e.slice(0, e.length - o[0].length), t[o[0].toLowerCase()] = !0;
  }
  return [e[2] === ":" ? e.slice(3) : Jn(e.slice(2)), t];
}
let hl = 0;
const Rg = /* @__PURE__ */ Promise.resolve(), Hg = () => hl || (Rg.then(() => hl = 0), hl = Date.now());
function jg(e, t) {
  const n = (o) => {
    if (!o._vts)
      o._vts = Date.now();
    else if (o._vts <= n.attached)
      return;
    Xt(
      zg(o, n.value),
      t,
      5,
      [o]
    );
  };
  return n.value = e, n.attached = Hg(), n;
}
function su(e, t) {
  return be(e) || me(e) ? e : (Ct(
    `Wrong type passed as event handler to ${t} - did you forget @ or : in front of your prop?
Expected function or array of functions, received type ${typeof e}.`
  ), st);
}
function zg(e, t) {
  if (me(t)) {
    const n = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      n.call(e), e._stopped = !0;
    }, t.map(
      (o) => (i) => !i._stopped && o && o(i)
    );
  } else
    return t;
}
const lu = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // lowercase letter
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Wg = (e, t, n, o, i, s) => {
  const l = i === "svg";
  t === "class" ? Dg(e, o, l) : t === "style" ? Ig(e, n, o) : Ei(t) ? ls(t) || Lg(e, t, n, o, s) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : Ug(e, t, o, l)) ? (nu(e, t, o), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && tu(e, t, o, l, s, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && (/[A-Z]/.test(t) || !We(o)) ? nu(e, ft(t), o, s, t) : (t === "true-value" ? e._trueValue = o : t === "false-value" && (e._falseValue = o), tu(e, t, o, l));
};
function Ug(e, t, n, o) {
  if (o)
    return !!(t === "innerHTML" || t === "textContent" || t in e && lu(t) && be(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA")
    return !1;
  if (t === "width" || t === "height") {
    const i = e.tagName;
    if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE")
      return !1;
  }
  return lu(t) && We(n) ? !1 : t in e;
}
const zd = /* @__PURE__ */ new WeakMap(), Wd = /* @__PURE__ */ new WeakMap(), ys = Symbol("_moveCb"), ru = Symbol("_enterCb"), Kg = (e) => (delete e.props.mode, e), Gg = /* @__PURE__ */ Kg({
  name: "TransitionGroup",
  props: /* @__PURE__ */ Ue({}, Fd, {
    tag: String,
    moveClass: String
  }),
  setup(e, { slots: t }) {
    const n = Hs(), o = ed();
    let i, s;
    return Nr(() => {
      if (!i.length)
        return;
      const l = e.moveClass || `${e.name || "v"}-move`;
      if (!Jg(
        i[0].el,
        n.vnode.el,
        l
      ))
        return;
      i.forEach(Yg), i.forEach(qg);
      const r = i.filter(Xg);
      Rd(), r.forEach((a) => {
        const d = a.el, u = d.style;
        Sn(d, l), u.transform = u.webkitTransform = u.transitionDuration = "";
        const c = d[ys] = (m) => {
          m && m.target !== d || (!m || /transform$/.test(m.propertyName)) && (d.removeEventListener("transitionend", c), d[ys] = null, zn(d, l));
        };
        d.addEventListener("transitionend", c);
      });
    }), () => {
      const l = ue(e), r = Ld(l);
      let a = l.tag || Ne;
      if (i = [], s)
        for (let d = 0; d < s.length; d++) {
          const u = s[d];
          u.el && u.el instanceof Element && (i.push(u), Eo(
            u,
            hi(
              u,
              r,
              o,
              n
            )
          ), zd.set(
            u,
            u.el.getBoundingClientRect()
          ));
        }
      s = t.default ? Er(t.default()) : [];
      for (let d = 0; d < s.length; d++) {
        const u = s[d];
        u.key != null ? Eo(
          u,
          hi(u, r, o, n)
        ) : Mt.NODE_ENV !== "production" && u.type !== Oo && Ct("<TransitionGroup> children must be keyed.");
      }
      return f(a, null, s);
    };
  }
}), $r = Gg;
function Yg(e) {
  const t = e.el;
  t[ys] && t[ys](), t[ru] && t[ru]();
}
function qg(e) {
  Wd.set(e, e.el.getBoundingClientRect());
}
function Xg(e) {
  const t = zd.get(e), n = Wd.get(e), o = t.left - n.left, i = t.top - n.top;
  if (o || i) {
    const s = e.el.style;
    return s.transform = s.webkitTransform = `translate(${o}px,${i}px)`, s.transitionDuration = "0s", e;
  }
}
function Jg(e, t, n) {
  const o = e.cloneNode(), i = e[Uo];
  i && i.forEach((r) => {
    r.split(/\s+/).forEach((a) => a && o.classList.remove(a));
  }), n.split(/\s+/).forEach((r) => r && o.classList.add(r)), o.style.display = "none";
  const s = t.nodeType === 1 ? t : t.parentNode;
  s.appendChild(o);
  const { hasTransform: l } = Bd(o);
  return s.removeChild(o), l;
}
const au = (e) => {
  const t = e.props["onUpdate:modelValue"] || !1;
  return me(t) ? (n) => Mo(t, n) : t;
}, gl = Symbol("_assign"), Zg = {
  // <select multiple> value need to be deep traversed
  deep: !0,
  created(e, { value: t, modifiers: { number: n } }, o) {
    const i = Ps(t);
    jd(e, "change", () => {
      const s = Array.prototype.filter.call(e.options, (l) => l.selected).map(
        (l) => n ? vc(bs(l)) : bs(l)
      );
      e[gl](
        e.multiple ? i ? new Set(s) : s : s[0]
      ), e._assigning = !0, Et(() => {
        e._assigning = !1;
      });
    }), e[gl] = au(o);
  },
  // set value in mounted & updated because <select> relies on its children
  // <option>s.
  mounted(e, { value: t }) {
    uu(e, t);
  },
  beforeUpdate(e, t, n) {
    e[gl] = au(n);
  },
  updated(e, { value: t }) {
    e._assigning || uu(e, t);
  }
};
function uu(e, t) {
  const n = e.multiple, o = me(t);
  if (n && !o && !Ps(t)) {
    Mt.NODE_ENV !== "production" && Ct(
      `<select multiple v-model> expects an Array or Set value for its binding, but got ${Object.prototype.toString.call(t).slice(8, -1)}.`
    );
    return;
  }
  for (let i = 0, s = e.options.length; i < s; i++) {
    const l = e.options[i], r = bs(l);
    if (n)
      if (o) {
        const a = typeof r;
        a === "string" || a === "number" ? l.selected = t.some((d) => String(d) === String(r)) : l.selected = fv(t, r) > -1;
      } else
        l.selected = t.has(r);
    else if (Is(bs(l), t)) {
      e.selectedIndex !== i && (e.selectedIndex = i);
      return;
    }
  }
  !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
}
function bs(e) {
  return "_value" in e ? e._value : e.value;
}
const Qg = ["ctrl", "shift", "alt", "meta"], ep = {
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
  exact: (e, t) => Qg.some((n) => e[`${n}Key`] && !t.includes(n))
}, ns = (e, t) => {
  const n = e._withMods || (e._withMods = {}), o = t.join(".");
  return n[o] || (n[o] = (i, ...s) => {
    for (let l = 0; l < t.length; l++) {
      const r = ep[t[l]];
      if (r && r(i, t)) return;
    }
    return e(i, ...s);
  });
}, tp = /* @__PURE__ */ Ue({ patchProp: Wg }, Ng);
let cu;
function np() {
  return cu || (cu = Xh(tp));
}
const op = (...e) => {
  const t = np().createApp(...e);
  Mt.NODE_ENV !== "production" && (sp(t), lp(t));
  const { mount: n } = t;
  return t.mount = (o) => {
    const i = rp(o);
    if (!i) return;
    const s = t._component;
    !be(s) && !s.render && !s.template && (s.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const l = n(i, !1, ip(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), l;
  }, t;
};
function ip(e) {
  if (e instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement)
    return "mathml";
}
function sp(e) {
  Object.defineProperty(e.config, "isNativeTag", {
    value: (t) => lv(t) || rv(t) || av(t),
    writable: !1
  });
}
function lp(e) {
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
    const n = e.config.compilerOptions, o = 'The `compilerOptions` config option is only respected when using a build of Vue.js that includes the runtime compiler (aka "full build"). Since you are using the runtime-only build, `compilerOptions` must be passed to `@vue/compiler-dom` in the build setup instead.\n- For vue-loader: pass it via vue-loader\'s `compilerOptions` loader option.\n- For vue-cli: see https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-loader\n- For vite: pass it via @vitejs/plugin-vue options. See https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#example-for-passing-options-to-vuecompiler-sfc';
    Object.defineProperty(e.config, "compilerOptions", {
      get() {
        return Ct(o), n;
      },
      set() {
        Ct(o);
      }
    });
  }
}
function rp(e) {
  if (We(e)) {
    const t = document.querySelector(e);
    return Mt.NODE_ENV !== "production" && !t && Ct(
      `Failed to mount app: mount target selector "${e}" returned null.`
    ), t;
  }
  return Mt.NODE_ENV !== "production" && window.ShadowRoot && e instanceof window.ShadowRoot && e.mode === "closed" && Ct(
    'mounting on a ShadowRoot with `{mode: "closed"}` may lead to unpredictable bugs'
  ), e;
}
var ap = {};
function up() {
  Cg();
}
ap.NODE_ENV !== "production" && up();
function No(e, t) {
  let n;
  function o() {
    n = gr(), n.run(() => t.length ? t(() => {
      n == null || n.stop(), o();
    }) : t());
  }
  Ce(e, (i) => {
    i && !n ? o() : i || (n == null || n.stop(), n = void 0);
  }, {
    immediate: !0
  }), Zt(() => {
    n == null || n.stop();
  });
}
const ze = typeof window < "u", Mr = ze && "IntersectionObserver" in window, cp = ze && ("ontouchstart" in window || window.navigator.maxTouchPoints > 0);
function Ud(e, t, n) {
  const o = t.length - 1;
  if (o < 0) return e === void 0 ? n : e;
  for (let i = 0; i < o; i++) {
    if (e == null)
      return n;
    e = e[t[i]];
  }
  return e == null || e[t[o]] === void 0 ? n : e[t[o]];
}
function Ws(e, t) {
  if (e === t) return !0;
  if (e instanceof Date && t instanceof Date && e.getTime() !== t.getTime() || e !== Object(e) || t !== Object(t))
    return !1;
  const n = Object.keys(e);
  return n.length !== Object.keys(t).length ? !1 : n.every((o) => Ws(e[o], t[o]));
}
function Gl(e, t, n) {
  return e == null || !t || typeof t != "string" ? n : e[t] !== void 0 ? e[t] : (t = t.replace(/\[(\w+)\]/g, ".$1"), t = t.replace(/^\./, ""), Ud(e, t.split("."), n));
}
function ei(e, t, n) {
  if (t === !0) return e === void 0 ? n : e;
  if (t == null || typeof t == "boolean") return n;
  if (e !== Object(e)) {
    if (typeof t != "function") return n;
    const i = t(e, n);
    return typeof i > "u" ? n : i;
  }
  if (typeof t == "string") return Gl(e, t, n);
  if (Array.isArray(t)) return Ud(e, t, n);
  if (typeof t != "function") return n;
  const o = t(e, n);
  return typeof o > "u" ? n : o;
}
function Fr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
  return Array.from({
    length: e
  }, (n, o) => t + o);
}
function ye(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "px";
  if (!(e == null || e === ""))
    return isNaN(+e) ? String(e) : isFinite(+e) ? `${Number(e)}${t}` : void 0;
}
function Kd(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function du(e) {
  let t;
  return e !== null && typeof e == "object" && ((t = Object.getPrototypeOf(e)) === Object.prototype || t === null);
}
function Gd(e) {
  if (e && "$el" in e) {
    const t = e.$el;
    return (t == null ? void 0 : t.nodeType) === Node.TEXT_NODE ? t.nextElementSibling : t;
  }
  return e;
}
const fu = Object.freeze({
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
}), dp = Object.freeze({
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
function Yd(e) {
  return Object.keys(e);
}
function pl(e, t) {
  return t.every((n) => e.hasOwnProperty(n));
}
function qd(e, t) {
  const n = {}, o = new Set(Object.keys(e));
  for (const i of t)
    o.has(i) && (n[i] = e[i]);
  return n;
}
function Yl(e, t, n) {
  const o = /* @__PURE__ */ Object.create(null), i = /* @__PURE__ */ Object.create(null);
  for (const s in e)
    t.some((l) => l instanceof RegExp ? l.test(s) : l === s) && !(n != null && n.some((l) => l === s)) ? o[s] = e[s] : i[s] = e[s];
  return [o, i];
}
function Us(e, t) {
  const n = {
    ...e
  };
  return t.forEach((o) => delete n[o]), n;
}
function fp(e, t) {
  const n = {};
  return t.forEach((o) => n[o] = e[o]), n;
}
const Xd = /^on[^a-z]/, Lr = (e) => Xd.test(e), mp = ["onAfterscriptexecute", "onAnimationcancel", "onAnimationend", "onAnimationiteration", "onAnimationstart", "onAuxclick", "onBeforeinput", "onBeforescriptexecute", "onChange", "onClick", "onCompositionend", "onCompositionstart", "onCompositionupdate", "onContextmenu", "onCopy", "onCut", "onDblclick", "onFocusin", "onFocusout", "onFullscreenchange", "onFullscreenerror", "onGesturechange", "onGestureend", "onGesturestart", "onGotpointercapture", "onInput", "onKeydown", "onKeypress", "onKeyup", "onLostpointercapture", "onMousedown", "onMousemove", "onMouseout", "onMouseover", "onMouseup", "onMousewheel", "onPaste", "onPointercancel", "onPointerdown", "onPointerenter", "onPointerleave", "onPointermove", "onPointerout", "onPointerover", "onPointerup", "onReset", "onSelect", "onSubmit", "onTouchcancel", "onTouchend", "onTouchmove", "onTouchstart", "onTransitioncancel", "onTransitionend", "onTransitionrun", "onTransitionstart", "onWheel"];
function vp(e) {
  const [t, n] = Yl(e, [Xd]), o = Us(t, mp), [i, s] = Yl(n, ["class", "style", "id", /^data-/]);
  return Object.assign(i, t), Object.assign(s, o), [i, s];
}
function wo(e) {
  return e == null ? [] : Array.isArray(e) ? e : [e];
}
function Vn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
  return Math.max(t, Math.min(n, e));
}
function mu(e) {
  const t = e.toString().trim();
  return t.includes(".") ? t.length - t.indexOf(".") - 1 : 0;
}
function vu(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0";
  return e + n.repeat(Math.max(0, t - e.length));
}
function hu(e, t) {
  return (arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0").repeat(Math.max(0, t - e.length)) + e;
}
function hp(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1;
  const n = [];
  let o = 0;
  for (; o < e.length; )
    n.push(e.substr(o, t)), o += t;
  return n;
}
function pt() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = arguments.length > 2 ? arguments[2] : void 0;
  const o = {};
  for (const i in e)
    o[i] = e[i];
  for (const i in t) {
    const s = e[i], l = t[i];
    if (du(s) && du(l)) {
      o[i] = pt(s, l, n);
      continue;
    }
    if (n && Array.isArray(s) && Array.isArray(l)) {
      o[i] = n(s, l);
      continue;
    }
    o[i] = l;
  }
  return o;
}
function Jd(e) {
  return e.map((t) => t.type === Ne ? Jd(t.children) : t).flat();
}
function So() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  if (So.cache.has(e)) return So.cache.get(e);
  const t = e.replace(/[^a-z]/gi, "-").replace(/\B([A-Z])/g, "-$1").toLowerCase();
  return So.cache.set(e, t), t;
}
So.cache = /* @__PURE__ */ new Map();
function Lo(e, t) {
  if (!t || typeof t != "object") return [];
  if (Array.isArray(t))
    return t.map((n) => Lo(e, n)).flat(1);
  if (t.suspense)
    return Lo(e, t.ssContent);
  if (Array.isArray(t.children))
    return t.children.map((n) => Lo(e, n)).flat(1);
  if (t.component) {
    if (Object.getOwnPropertySymbols(t.component.provides).includes(e))
      return [t.component];
    if (t.component.subTree)
      return Lo(e, t.component.subTree).flat(1);
  }
  return [];
}
function Br(e) {
  const t = dt({}), n = y(e);
  return An(() => {
    for (const o in n.value)
      t[o] = n.value[o];
  }, {
    flush: "sync"
  }), wr(t);
}
function _s(e, t) {
  return e.includes(t);
}
function Zd(e) {
  return e[2].toLowerCase() + e.slice(3);
}
const jt = () => [Function, Array];
function gu(e, t) {
  return t = "on" + zt(t), !!(e[t] || e[`${t}Once`] || e[`${t}Capture`] || e[`${t}OnceCapture`] || e[`${t}CaptureOnce`]);
}
function gp(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), o = 1; o < t; o++)
    n[o - 1] = arguments[o];
  if (Array.isArray(e))
    for (const i of e)
      i(...n);
  else typeof e == "function" && e(...n);
}
function Rr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0;
  const n = ["button", "[href]", 'input:not([type="hidden"])', "select", "textarea", "[tabindex]"].map((o) => `${o}${t ? ':not([tabindex="-1"])' : ""}:not([disabled])`).join(", ");
  return [...e.querySelectorAll(n)];
}
function pp(e, t, n) {
  let o, i = e.indexOf(document.activeElement);
  const s = t === "next" ? 1 : -1;
  do
    i += s, o = e[i];
  while ((!o || o.offsetParent == null) && i < e.length && i >= 0);
  return o;
}
function Qd(e, t) {
  var o, i, s, l;
  const n = Rr(e);
  if (!t)
    (e === document.activeElement || !e.contains(document.activeElement)) && ((o = n[0]) == null || o.focus());
  else if (t === "first")
    (i = n[0]) == null || i.focus();
  else if (t === "last")
    (s = n.at(-1)) == null || s.focus();
  else if (typeof t == "number")
    (l = n[t]) == null || l.focus();
  else {
    const r = pp(n, t);
    r ? r.focus() : Qd(e, t === "next" ? "first" : "last");
  }
}
function yp(e, t) {
  if (!(ze && typeof CSS < "u" && typeof CSS.supports < "u" && CSS.supports(`selector(${t})`))) return null;
  try {
    return !!e && e.matches(t);
  } catch {
    return null;
  }
}
function bp(e, t) {
  if (!ze || e === 0)
    return t(), () => {
    };
  const n = window.setTimeout(t, e);
  return () => window.clearTimeout(n);
}
function ql() {
  const e = Se(), t = (n) => {
    e.value = n;
  };
  return Object.defineProperty(t, "value", {
    enumerable: !0,
    get: () => e.value,
    set: (n) => e.value = n
  }), Object.defineProperty(t, "el", {
    enumerable: !0,
    get: () => Gd(e.value)
  }), t;
}
const ef = ["top", "bottom"], _p = ["start", "end", "left", "right"];
function Xl(e, t) {
  let [n, o] = e.split(" ");
  return o || (o = _s(ef, n) ? "start" : _s(_p, n) ? "top" : "center"), {
    side: pu(n, t),
    align: pu(o, t)
  };
}
function pu(e, t) {
  return e === "start" ? t ? "right" : "left" : e === "end" ? t ? "left" : "right" : e;
}
function yl(e) {
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
function bl(e) {
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
function yu(e) {
  return {
    side: e.align,
    align: e.side
  };
}
function bu(e) {
  return _s(ef, e.side) ? "y" : "x";
}
class ko {
  constructor(t) {
    let {
      x: n,
      y: o,
      width: i,
      height: s
    } = t;
    this.x = n, this.y = o, this.width = i, this.height = s;
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
function _u(e, t) {
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
function tf(e) {
  return Array.isArray(e) ? new ko({
    x: e[0],
    y: e[1],
    width: 0,
    height: 0
  }) : e.getBoundingClientRect();
}
function Hr(e) {
  const t = e.getBoundingClientRect(), n = getComputedStyle(e), o = n.transform;
  if (o) {
    let i, s, l, r, a;
    if (o.startsWith("matrix3d("))
      i = o.slice(9, -1).split(/, /), s = +i[0], l = +i[5], r = +i[12], a = +i[13];
    else if (o.startsWith("matrix("))
      i = o.slice(7, -1).split(/, /), s = +i[0], l = +i[3], r = +i[4], a = +i[5];
    else
      return new ko(t);
    const d = n.transformOrigin, u = t.x - r - (1 - s) * parseFloat(d), c = t.y - a - (1 - l) * parseFloat(d.slice(d.indexOf(" ") + 1)), m = s ? t.width / s : e.offsetWidth + 1, v = l ? t.height / l : e.offsetHeight + 1;
    return new ko({
      x: u,
      y: c,
      width: m,
      height: v
    });
  } else
    return new ko(t);
}
function mo(e, t, n) {
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
const os = /* @__PURE__ */ new WeakMap();
function wp(e, t) {
  Object.keys(t).forEach((n) => {
    if (Lr(n)) {
      const o = Zd(n), i = os.get(e);
      if (t[n] == null)
        i == null || i.forEach((s) => {
          const [l, r] = s;
          l === o && (e.removeEventListener(o, r), i.delete(s));
        });
      else if (!i || ![...i].some((s) => s[0] === o && s[1] === t[n])) {
        e.addEventListener(o, t[n]);
        const s = i || /* @__PURE__ */ new Set();
        s.add([o, t[n]]), os.has(e) || os.set(e, s);
      }
    } else
      t[n] == null ? e.removeAttribute(n) : e.setAttribute(n, t[n]);
  });
}
function Sp(e, t) {
  Object.keys(t).forEach((n) => {
    if (Lr(n)) {
      const o = Zd(n), i = os.get(e);
      i == null || i.forEach((s) => {
        const [l, r] = s;
        l === o && (e.removeEventListener(o, r), i.delete(s));
      });
    } else
      e.removeAttribute(n);
  });
}
const Ao = 2.4, wu = 0.2126729, Su = 0.7151522, ku = 0.072175, kp = 0.55, Cp = 0.58, Ep = 0.57, xp = 0.62, Ui = 0.03, Cu = 1.45, Np = 5e-4, Vp = 1.25, Op = 1.25, Eu = 0.078, xu = 12.82051282051282, Ki = 0.06, Nu = 1e-3;
function Vu(e, t) {
  const n = (e.r / 255) ** Ao, o = (e.g / 255) ** Ao, i = (e.b / 255) ** Ao, s = (t.r / 255) ** Ao, l = (t.g / 255) ** Ao, r = (t.b / 255) ** Ao;
  let a = n * wu + o * Su + i * ku, d = s * wu + l * Su + r * ku;
  if (a <= Ui && (a += (Ui - a) ** Cu), d <= Ui && (d += (Ui - d) ** Cu), Math.abs(d - a) < Np) return 0;
  let u;
  if (d > a) {
    const c = (d ** kp - a ** Cp) * Vp;
    u = c < Nu ? 0 : c < Eu ? c - c * xu * Ki : c - Ki;
  } else {
    const c = (d ** xp - a ** Ep) * Op;
    u = c > -Nu ? 0 : c > -Eu ? c - c * xu * Ki : c + Ki;
  }
  return u * 100;
}
function mn(e) {
  Ct(`Vuetify: ${e}`);
}
function ws(e) {
  Ct(`Vuetify error: ${e}`);
}
function Tp(e, t) {
  t = Array.isArray(t) ? t.slice(0, -1).map((n) => `'${n}'`).join(", ") + ` or '${t.at(-1)}'` : `'${t}'`, Ct(`[Vuetify UPGRADE] '${e}' is deprecated, use ${t} instead.`);
}
const Ss = 0.20689655172413793, Dp = (e) => e > Ss ** 3 ? Math.cbrt(e) : e / (3 * Ss ** 2) + 4 / 29, Pp = (e) => e > Ss ? e ** 3 : 3 * Ss ** 2 * (e - 4 / 29);
function nf(e) {
  const t = Dp, n = t(e[1]);
  return [116 * n - 16, 500 * (t(e[0] / 0.95047) - n), 200 * (n - t(e[2] / 1.08883))];
}
function of(e) {
  const t = Pp, n = (e[0] + 16) / 116;
  return [t(n + e[1] / 500) * 0.95047, t(n), t(n - e[2] / 200) * 1.08883];
}
const Ap = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]], Ip = (e) => e <= 31308e-7 ? e * 12.92 : 1.055 * e ** (1 / 2.4) - 0.055, $p = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], Mp = (e) => e <= 0.04045 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4;
function sf(e) {
  const t = Array(3), n = Ip, o = Ap;
  for (let i = 0; i < 3; ++i)
    t[i] = Math.round(Vn(n(o[i][0] * e[0] + o[i][1] * e[1] + o[i][2] * e[2])) * 255);
  return {
    r: t[0],
    g: t[1],
    b: t[2]
  };
}
function jr(e) {
  let {
    r: t,
    g: n,
    b: o
  } = e;
  const i = [0, 0, 0], s = Mp, l = $p;
  t = s(t / 255), n = s(n / 255), o = s(o / 255);
  for (let r = 0; r < 3; ++r)
    i[r] = l[r][0] * t + l[r][1] * n + l[r][2] * o;
  return i;
}
function Jl(e) {
  return !!e && /^(#|var\(--|(rgb|hsl)a?\()/.test(e);
}
function Fp(e) {
  return Jl(e) && !/^((rgb|hsl)a?\()?var\(--/.test(e);
}
const Ou = /^(?<fn>(?:rgb|hsl)a?)\((?<values>.+)\)/, Lp = {
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
  hsl: (e, t, n, o) => Tu({
    h: e,
    s: t,
    l: n,
    a: o
  }),
  hsla: (e, t, n, o) => Tu({
    h: e,
    s: t,
    l: n,
    a: o
  }),
  hsv: (e, t, n, o) => yi({
    h: e,
    s: t,
    v: n,
    a: o
  }),
  hsva: (e, t, n, o) => yi({
    h: e,
    s: t,
    v: n,
    a: o
  })
};
function an(e) {
  if (typeof e == "number")
    return (isNaN(e) || e < 0 || e > 16777215) && mn(`'${e}' is not a valid hex color`), {
      r: (e & 16711680) >> 16,
      g: (e & 65280) >> 8,
      b: e & 255
    };
  if (typeof e == "string" && Ou.test(e)) {
    const {
      groups: t
    } = e.match(Ou), {
      fn: n,
      values: o
    } = t, i = o.split(/,\s*/).map((s) => s.endsWith("%") && ["hsl", "hsla", "hsv", "hsva"].includes(n) ? parseFloat(s) / 100 : parseFloat(s));
    return Lp[n](...i);
  } else if (typeof e == "string") {
    let t = e.startsWith("#") ? e.slice(1) : e;
    [3, 4].includes(t.length) ? t = t.split("").map((o) => o + o).join("") : [6, 8].includes(t.length) || mn(`'${e}' is not a valid hex(a) color`);
    const n = parseInt(t, 16);
    return (isNaN(n) || n < 0 || n > 4294967295) && mn(`'${e}' is not a valid hex(a) color`), Rp(t);
  } else if (typeof e == "object") {
    if (pl(e, ["r", "g", "b"]))
      return e;
    if (pl(e, ["h", "s", "l"]))
      return yi(lf(e));
    if (pl(e, ["h", "s", "v"]))
      return yi(e);
  }
  throw new TypeError(`Invalid color: ${e == null ? e : String(e) || e.constructor.name}
Expected #hex, #hexa, rgb(), rgba(), hsl(), hsla(), object or number`);
}
function yi(e) {
  const {
    h: t,
    s: n,
    v: o,
    a: i
  } = e, s = (r) => {
    const a = (r + t / 60) % 6;
    return o - o * n * Math.max(Math.min(a, 4 - a, 1), 0);
  }, l = [s(5), s(3), s(1)].map((r) => Math.round(r * 255));
  return {
    r: l[0],
    g: l[1],
    b: l[2],
    a: i
  };
}
function Tu(e) {
  return yi(lf(e));
}
function lf(e) {
  const {
    h: t,
    s: n,
    l: o,
    a: i
  } = e, s = o + n * Math.min(o, 1 - o), l = s === 0 ? 0 : 2 - 2 * o / s;
  return {
    h: t,
    s: l,
    v: s,
    a: i
  };
}
function Gi(e) {
  const t = Math.round(e).toString(16);
  return ("00".substr(0, 2 - t.length) + t).toUpperCase();
}
function Bp(e) {
  let {
    r: t,
    g: n,
    b: o,
    a: i
  } = e;
  return `#${[Gi(t), Gi(n), Gi(o), i !== void 0 ? Gi(Math.round(i * 255)) : ""].join("")}`;
}
function Rp(e) {
  e = Hp(e);
  let [t, n, o, i] = hp(e, 2).map((s) => parseInt(s, 16));
  return i = i === void 0 ? i : i / 255, {
    r: t,
    g: n,
    b: o,
    a: i
  };
}
function Hp(e) {
  return e.startsWith("#") && (e = e.slice(1)), e = e.replace(/([^0-9a-f])/gi, "F"), (e.length === 3 || e.length === 4) && (e = e.split("").map((t) => t + t).join("")), e.length !== 6 && (e = vu(vu(e, 6), 8, "F")), e;
}
function jp(e, t) {
  const n = nf(jr(e));
  return n[0] = n[0] + t * 10, sf(of(n));
}
function zp(e, t) {
  const n = nf(jr(e));
  return n[0] = n[0] - t * 10, sf(of(n));
}
function Wp(e) {
  const t = an(e);
  return jr(t)[1];
}
function rf(e) {
  const t = Math.abs(Vu(an(0), an(e)));
  return Math.abs(Vu(an(16777215), an(e))) > Math.min(t, 50) ? "#fff" : "#000";
}
function K(e, t) {
  return (n) => Object.keys(e).reduce((o, i) => {
    const l = typeof e[i] == "object" && e[i] != null && !Array.isArray(e[i]) ? e[i] : {
      type: e[i]
    };
    return n && i in n ? o[i] = {
      ...l,
      default: n[i]
    } : o[i] = l, t && !o[i].source && (o[i].source = t), o;
  }, {});
}
const xe = K({
  class: [String, Array, Object],
  style: {
    type: [String, Array, Object],
    default: null
  }
}, "component");
function et(e, t) {
  const n = Hs();
  if (!n)
    throw new Error(`[Vuetify] ${e} must be called from inside a setup function`);
  return n;
}
function gn() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "composables";
  const t = et(e).type;
  return So((t == null ? void 0 : t.aliasName) || (t == null ? void 0 : t.name));
}
let af = 0, is = /* @__PURE__ */ new WeakMap();
function eo() {
  const e = et("getUid");
  if (is.has(e)) return is.get(e);
  {
    const t = af++;
    return is.set(e, t), t;
  }
}
eo.reset = () => {
  af = 0, is = /* @__PURE__ */ new WeakMap();
};
function Up(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : et("injectSelf");
  const {
    provides: n
  } = t;
  if (n && e in n)
    return n[e];
}
const Ko = Symbol.for("vuetify:defaults");
function Kp(e) {
  return le(e);
}
function zr() {
  const e = je(Ko);
  if (!e) throw new Error("[Vuetify] Could not find defaults instance");
  return e;
}
function To(e, t) {
  const n = zr(), o = le(e), i = y(() => {
    if (rn(t == null ? void 0 : t.disabled)) return n.value;
    const l = rn(t == null ? void 0 : t.scoped), r = rn(t == null ? void 0 : t.reset), a = rn(t == null ? void 0 : t.root);
    if (o.value == null && !(l || r || a)) return n.value;
    let d = pt(o.value, {
      prev: n.value
    });
    if (l) return d;
    if (r || a) {
      const u = Number(r || 1 / 0);
      for (let c = 0; c <= u && !(!d || !("prev" in d)); c++)
        d = d.prev;
      return d && typeof a == "string" && a in d && (d = pt(pt(d, {
        prev: d
      }), d[a])), d;
    }
    return d.prev ? pt(d.prev, d) : d;
  });
  return bt(Ko, i), i;
}
function Gp(e, t) {
  var n, o;
  return typeof ((n = e.props) == null ? void 0 : n[t]) < "u" || typeof ((o = e.props) == null ? void 0 : o[So(t)]) < "u";
}
function Yp() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : zr();
  const o = et("useDefaults");
  if (t = t ?? o.type.name ?? o.type.__name, !t)
    throw new Error("[Vuetify] Could not determine component name");
  const i = y(() => {
    var a;
    return (a = n.value) == null ? void 0 : a[e._as ?? t];
  }), s = new Proxy(e, {
    get(a, d) {
      var c, m, v, h, g, _, x;
      const u = Reflect.get(a, d);
      return d === "class" || d === "style" ? [(c = i.value) == null ? void 0 : c[d], u].filter((V) => V != null) : typeof d == "string" && !Gp(o.vnode, d) ? ((m = i.value) == null ? void 0 : m[d]) !== void 0 ? (v = i.value) == null ? void 0 : v[d] : ((g = (h = n.value) == null ? void 0 : h.global) == null ? void 0 : g[d]) !== void 0 ? (x = (_ = n.value) == null ? void 0 : _.global) == null ? void 0 : x[d] : u : u;
    }
  }), l = Se();
  An(() => {
    if (i.value) {
      const a = Object.entries(i.value).filter((d) => {
        let [u] = d;
        return u.startsWith(u[0].toUpperCase());
      });
      l.value = a.length ? Object.fromEntries(a) : void 0;
    } else
      l.value = void 0;
  });
  function r() {
    const a = Up(Ko, o);
    bt(Ko, y(() => l.value ? pt((a == null ? void 0 : a.value) ?? {}, l.value) : a == null ? void 0 : a.value));
  }
  return {
    props: s,
    provideSubDefaults: r
  };
}
function qo(e) {
  if (e._setup = e._setup ?? e.setup, !e.name)
    return mn("The component is missing an explicit name, unable to generate default prop value"), e;
  if (e._setup) {
    e.props = K(e.props ?? {}, e.name)();
    const t = Object.keys(e.props).filter((n) => n !== "class" && n !== "style");
    e.filterProps = function(o) {
      return qd(o, t);
    }, e.props._as = String, e.setup = function(o, i) {
      const s = zr();
      if (!s.value) return e._setup(o, i);
      const {
        props: l,
        provideSubDefaults: r
      } = Yp(o, o._as ?? e.name, s), a = e._setup(l, i);
      return r(), a;
    };
  }
  return e;
}
function ve() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !0;
  return (t) => (e ? qo : vh)(t);
}
function Ks(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "div", n = arguments.length > 2 ? arguments[2] : void 0;
  return ve()({
    name: n ?? zt(ft(e.replace(/__/g, "-"))),
    props: {
      tag: {
        type: String,
        default: t
      },
      ...xe()
    },
    setup(o, i) {
      let {
        slots: s
      } = i;
      return () => {
        var l;
        return Qn(o.tag, {
          class: [e, o.class],
          style: o.style
        }, (l = s.default) == null ? void 0 : l.call(s));
      };
    }
  });
}
function uf(e) {
  if (typeof e.getRootNode != "function") {
    for (; e.parentNode; ) e = e.parentNode;
    return e !== document ? null : document;
  }
  const t = e.getRootNode();
  return t !== document && t.getRootNode({
    composed: !0
  }) !== document ? null : t;
}
const bi = "cubic-bezier(0.4, 0, 0.2, 1)", qp = "cubic-bezier(0.0, 0, 0.2, 1)", Xp = "cubic-bezier(0.4, 0, 1, 1)";
function Jp(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
  for (; e; ) {
    if (t ? Zp(e) : Wr(e)) return e;
    e = e.parentElement;
  }
  return document.scrollingElement;
}
function ks(e, t) {
  const n = [];
  if (t && e && !t.contains(e)) return n;
  for (; e && (Wr(e) && n.push(e), e !== t); )
    e = e.parentElement;
  return n;
}
function Wr(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return t.overflowY === "scroll" || t.overflowY === "auto" && e.scrollHeight > e.clientHeight;
}
function Zp(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return ["scroll", "auto"].includes(t.overflowY);
}
function Qp(e) {
  for (; e; ) {
    if (window.getComputedStyle(e).position === "fixed")
      return !0;
    e = e.offsetParent;
  }
  return !1;
}
function _e(e) {
  const t = et("useRender");
  t.render = e;
}
function at(e, t, n) {
  let o = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : (c) => c, i = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : (c) => c;
  const s = et("useProxiedModel"), l = le(e[t] !== void 0 ? e[t] : n), r = So(t), d = y(r !== t ? () => {
    var c, m, v, h;
    return e[t], !!(((c = s.vnode.props) != null && c.hasOwnProperty(t) || (m = s.vnode.props) != null && m.hasOwnProperty(r)) && ((v = s.vnode.props) != null && v.hasOwnProperty(`onUpdate:${t}`) || (h = s.vnode.props) != null && h.hasOwnProperty(`onUpdate:${r}`)));
  } : () => {
    var c, m;
    return e[t], !!((c = s.vnode.props) != null && c.hasOwnProperty(t) && ((m = s.vnode.props) != null && m.hasOwnProperty(`onUpdate:${t}`)));
  });
  No(() => !d.value, () => {
    Ce(() => e[t], (c) => {
      l.value = c;
    });
  });
  const u = y({
    get() {
      const c = e[t];
      return o(d.value ? c : l.value);
    },
    set(c) {
      const m = i(c), v = ue(d.value ? e[t] : l.value);
      v === m || o(v) === c || (l.value = m, s == null || s.emit(`update:${t}`, m));
    }
  });
  return Object.defineProperty(u, "externalValue", {
    get: () => d.value ? e[t] : l.value
  }), u;
}
const ey = {
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
}, Du = "$vuetify.", Pu = (e, t) => e.replace(/\{(\d+)\}/g, (n, o) => String(t[+o])), cf = (e, t, n) => function(o) {
  for (var i = arguments.length, s = new Array(i > 1 ? i - 1 : 0), l = 1; l < i; l++)
    s[l - 1] = arguments[l];
  if (!o.startsWith(Du))
    return Pu(o, s);
  const r = o.replace(Du, ""), a = e.value && n.value[e.value], d = t.value && n.value[t.value];
  let u = Gl(a, r, null);
  return u || (mn(`Translation key "${o}" not found in "${e.value}", trying fallback locale`), u = Gl(d, r, null)), u || (ws(`Translation key "${o}" not found in fallback`), u = o), typeof u != "string" && (ws(`Translation key "${o}" has a non-string value`), u = o), Pu(u, s);
};
function df(e, t) {
  return (n, o) => new Intl.NumberFormat([e.value, t.value], o).format(n);
}
function _l(e, t, n) {
  const o = at(e, t, e[t] ?? n.value);
  return o.value = e[t] ?? n.value, Ce(n, (i) => {
    e[t] == null && (o.value = n.value);
  }), o;
}
function ff(e) {
  return (t) => {
    const n = _l(t, "locale", e.current), o = _l(t, "fallback", e.fallback), i = _l(t, "messages", e.messages);
    return {
      name: "vuetify",
      current: n,
      fallback: o,
      messages: i,
      t: cf(n, o, i),
      n: df(n, o),
      provide: ff({
        current: n,
        fallback: o,
        messages: i
      })
    };
  };
}
function ty(e) {
  const t = Se((e == null ? void 0 : e.locale) ?? "en"), n = Se((e == null ? void 0 : e.fallback) ?? "en"), o = le({
    en: ey,
    ...e == null ? void 0 : e.messages
  });
  return {
    name: "vuetify",
    current: t,
    fallback: n,
    messages: o,
    t: cf(t, n, o),
    n: df(t, n),
    provide: ff({
      current: t,
      fallback: n,
      messages: o
    })
  };
}
const Cs = Symbol.for("vuetify:locale");
function ny(e) {
  return e.name != null;
}
function oy(e) {
  const t = e != null && e.adapter && ny(e == null ? void 0 : e.adapter) ? e == null ? void 0 : e.adapter : ty(e), n = sy(t, e);
  return {
    ...t,
    ...n
  };
}
function Gs() {
  const e = je(Cs);
  if (!e) throw new Error("[Vuetify] Could not find injected locale instance");
  return e;
}
function iy() {
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
function sy(e, t) {
  const n = le((t == null ? void 0 : t.rtl) ?? iy()), o = y(() => n.value[e.current.value] ?? !1);
  return {
    isRtl: o,
    rtl: n,
    rtlClasses: y(() => `v-locale--is-${o.value ? "rtl" : "ltr"}`)
  };
}
function Ft() {
  const e = je(Cs);
  if (!e) throw new Error("[Vuetify] Could not find injected rtl instance");
  return {
    isRtl: e.isRtl,
    rtlClasses: e.rtlClasses
  };
}
const Ys = {
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
function ly(e, t, n) {
  const o = [];
  let i = [];
  const s = mf(e), l = vf(e), r = n ?? Ys[t.slice(-2).toUpperCase()] ?? 0, a = (s.getDay() - r + 7) % 7, d = (l.getDay() - r + 7) % 7;
  for (let u = 0; u < a; u++) {
    const c = new Date(s);
    c.setDate(c.getDate() - (a - u)), i.push(c);
  }
  for (let u = 1; u <= l.getDate(); u++) {
    const c = new Date(e.getFullYear(), e.getMonth(), u);
    i.push(c), i.length === 7 && (o.push(i), i = []);
  }
  for (let u = 1; u < 7 - d; u++) {
    const c = new Date(l);
    c.setDate(c.getDate() + u), i.push(c);
  }
  return i.length > 0 && o.push(i), o;
}
function ry(e, t, n) {
  const o = n ?? Ys[t.slice(-2).toUpperCase()] ?? 0, i = new Date(e);
  for (; i.getDay() !== o; )
    i.setDate(i.getDate() - 1);
  return i;
}
function ay(e, t) {
  const n = new Date(e), o = ((Ys[t.slice(-2).toUpperCase()] ?? 0) + 6) % 7;
  for (; n.getDay() !== o; )
    n.setDate(n.getDate() + 1);
  return n;
}
function mf(e) {
  return new Date(e.getFullYear(), e.getMonth(), 1);
}
function vf(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 0);
}
function uy(e) {
  const t = e.split("-").map(Number);
  return new Date(t[0], t[1] - 1, t[2]);
}
const cy = /^([12]\d{3}-([1-9]|0[1-9]|1[0-2])-([1-9]|0[1-9]|[12]\d|3[01]))$/;
function hf(e) {
  if (e == null) return /* @__PURE__ */ new Date();
  if (e instanceof Date) return e;
  if (typeof e == "string") {
    let t;
    if (cy.test(e))
      return uy(e);
    if (t = Date.parse(e), !isNaN(t)) return new Date(t);
  }
  return null;
}
const Au = new Date(2e3, 0, 2);
function dy(e, t) {
  const n = t ?? Ys[e.slice(-2).toUpperCase()] ?? 0;
  return Fr(7).map((o) => {
    const i = new Date(Au);
    return i.setDate(Au.getDate() + n + o), new Intl.DateTimeFormat(e, {
      weekday: "narrow"
    }).format(i);
  });
}
function fy(e, t, n, o) {
  const i = hf(e) ?? /* @__PURE__ */ new Date(), s = o == null ? void 0 : o[t];
  if (typeof s == "function")
    return s(i, t, n);
  let l = {};
  switch (t) {
    case "fullDate":
      l = {
        year: "numeric",
        month: "long",
        day: "numeric"
      };
      break;
    case "fullDateWithWeekday":
      l = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      };
      break;
    case "normalDate":
      const r = i.getDate(), a = new Intl.DateTimeFormat(n, {
        month: "long"
      }).format(i);
      return `${r} ${a}`;
    case "normalDateWithWeekday":
      l = {
        weekday: "short",
        day: "numeric",
        month: "short"
      };
      break;
    case "shortDate":
      l = {
        month: "short",
        day: "numeric"
      };
      break;
    case "year":
      l = {
        year: "numeric"
      };
      break;
    case "month":
      l = {
        month: "long"
      };
      break;
    case "monthShort":
      l = {
        month: "short"
      };
      break;
    case "monthAndYear":
      l = {
        month: "long",
        year: "numeric"
      };
      break;
    case "monthAndDate":
      l = {
        month: "long",
        day: "numeric"
      };
      break;
    case "weekday":
      l = {
        weekday: "long"
      };
      break;
    case "weekdayShort":
      l = {
        weekday: "short"
      };
      break;
    case "dayOfMonth":
      return new Intl.NumberFormat(n).format(i.getDate());
    case "hours12h":
      l = {
        hour: "numeric",
        hour12: !0
      };
      break;
    case "hours24h":
      l = {
        hour: "numeric",
        hour12: !1
      };
      break;
    case "minutes":
      l = {
        minute: "numeric"
      };
      break;
    case "seconds":
      l = {
        second: "numeric"
      };
      break;
    case "fullTime":
      l = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !0
      };
      break;
    case "fullTime12h":
      l = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !0
      };
      break;
    case "fullTime24h":
      l = {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: !1
      };
      break;
    case "fullDateTime":
      l = {
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
      l = {
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
      l = {
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
      l = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      };
      break;
    case "keyboardDateTime":
      l = {
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
      l = {
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
      l = {
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
      l = s ?? {
        timeZone: "UTC",
        timeZoneName: "short"
      };
  }
  return new Intl.DateTimeFormat(n, l).format(i);
}
function my(e, t) {
  const n = e.toJsDate(t), o = n.getFullYear(), i = hu(String(n.getMonth() + 1), 2, "0"), s = hu(String(n.getDate()), 2, "0");
  return `${o}-${i}-${s}`;
}
function vy(e) {
  const [t, n, o] = e.split("-").map(Number);
  return new Date(t, n - 1, o);
}
function hy(e, t) {
  const n = new Date(e);
  return n.setMinutes(n.getMinutes() + t), n;
}
function gy(e, t) {
  const n = new Date(e);
  return n.setHours(n.getHours() + t), n;
}
function py(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}
function yy(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t * 7), n;
}
function by(e, t) {
  const n = new Date(e);
  return n.setDate(1), n.setMonth(n.getMonth() + t), n;
}
function _y(e) {
  return e.getFullYear();
}
function wy(e) {
  return e.getMonth();
}
function Sy(e) {
  return e.getDate();
}
function ky(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 1);
}
function Cy(e) {
  return new Date(e.getFullYear(), e.getMonth() - 1, 1);
}
function Ey(e) {
  return e.getHours();
}
function xy(e) {
  return e.getMinutes();
}
function Ny(e) {
  return new Date(e.getFullYear(), 0, 1);
}
function Vy(e) {
  return new Date(e.getFullYear(), 11, 31);
}
function Oy(e, t) {
  return Es(e, t[0]) && Py(e, t[1]);
}
function Ty(e) {
  const t = new Date(e);
  return t instanceof Date && !isNaN(t.getTime());
}
function Es(e, t) {
  return e.getTime() > t.getTime();
}
function Dy(e, t) {
  return Es(Zl(e), Zl(t));
}
function Py(e, t) {
  return e.getTime() < t.getTime();
}
function Iu(e, t) {
  return e.getTime() === t.getTime();
}
function Ay(e, t) {
  return e.getDate() === t.getDate() && e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function Iy(e, t) {
  return e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function $y(e, t) {
  return e.getFullYear() === t.getFullYear();
}
function My(e, t, n) {
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
function Fy(e, t) {
  const n = new Date(e);
  return n.setHours(t), n;
}
function Ly(e, t) {
  const n = new Date(e);
  return n.setMinutes(t), n;
}
function By(e, t) {
  const n = new Date(e);
  return n.setMonth(t), n;
}
function Ry(e, t) {
  const n = new Date(e);
  return n.setDate(t), n;
}
function Hy(e, t) {
  const n = new Date(e);
  return n.setFullYear(t), n;
}
function Zl(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
}
function jy(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
}
class zy {
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
    return my(this, t);
  }
  parseISO(t) {
    return vy(t);
  }
  addMinutes(t, n) {
    return hy(t, n);
  }
  addHours(t, n) {
    return gy(t, n);
  }
  addDays(t, n) {
    return py(t, n);
  }
  addWeeks(t, n) {
    return yy(t, n);
  }
  addMonths(t, n) {
    return by(t, n);
  }
  getWeekArray(t, n) {
    return ly(t, this.locale, n ? Number(n) : void 0);
  }
  startOfWeek(t, n) {
    return ry(t, this.locale, n ? Number(n) : void 0);
  }
  endOfWeek(t) {
    return ay(t, this.locale);
  }
  startOfMonth(t) {
    return mf(t);
  }
  endOfMonth(t) {
    return vf(t);
  }
  format(t, n) {
    return fy(t, n, this.locale, this.formats);
  }
  isEqual(t, n) {
    return Iu(t, n);
  }
  isValid(t) {
    return Ty(t);
  }
  isWithinRange(t, n) {
    return Oy(t, n);
  }
  isAfter(t, n) {
    return Es(t, n);
  }
  isAfterDay(t, n) {
    return Dy(t, n);
  }
  isBefore(t, n) {
    return !Es(t, n) && !Iu(t, n);
  }
  isSameDay(t, n) {
    return Ay(t, n);
  }
  isSameMonth(t, n) {
    return Iy(t, n);
  }
  isSameYear(t, n) {
    return $y(t, n);
  }
  setMinutes(t, n) {
    return Ly(t, n);
  }
  setHours(t, n) {
    return Fy(t, n);
  }
  setMonth(t, n) {
    return By(t, n);
  }
  setDate(t, n) {
    return Ry(t, n);
  }
  setYear(t, n) {
    return Hy(t, n);
  }
  getDiff(t, n, o) {
    return My(t, n, o);
  }
  getWeekdays(t) {
    return dy(this.locale, t ? Number(t) : void 0);
  }
  getYear(t) {
    return _y(t);
  }
  getMonth(t) {
    return wy(t);
  }
  getDate(t) {
    return Sy(t);
  }
  getNextMonth(t) {
    return ky(t);
  }
  getPreviousMonth(t) {
    return Cy(t);
  }
  getHours(t) {
    return Ey(t);
  }
  getMinutes(t) {
    return xy(t);
  }
  startOfDay(t) {
    return Zl(t);
  }
  endOfDay(t) {
    return jy(t);
  }
  startOfYear(t) {
    return Ny(t);
  }
  endOfYear(t) {
    return Vy(t);
  }
}
const Wy = Symbol.for("vuetify:date-options"), $u = Symbol.for("vuetify:date-adapter");
function Uy(e, t) {
  const n = pt({
    adapter: zy,
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
    instance: Ky(n, t)
  };
}
function Ky(e, t) {
  const n = dt(typeof e.adapter == "function" ? new e.adapter({
    locale: e.locale[t.current.value] ?? t.current.value,
    formats: e.formats
  }) : e.adapter);
  return Ce(t.current, (o) => {
    n.locale = e.locale[o] ?? o ?? n.locale;
  }), n;
}
const qs = ["sm", "md", "lg", "xl", "xxl"], Ql = Symbol.for("vuetify:display"), Mu = {
  mobileBreakpoint: "lg",
  thresholds: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
    xxl: 2560
  }
}, Gy = function() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Mu;
  return pt(Mu, e);
};
function Fu(e) {
  return ze && !e ? window.innerWidth : typeof e == "object" && e.clientWidth || 0;
}
function Lu(e) {
  return ze && !e ? window.innerHeight : typeof e == "object" && e.clientHeight || 0;
}
function Bu(e) {
  const t = ze && !e ? window.navigator.userAgent : "ssr";
  function n(h) {
    return !!t.match(h);
  }
  const o = n(/android/i), i = n(/iphone|ipad|ipod/i), s = n(/cordova/i), l = n(/electron/i), r = n(/chrome/i), a = n(/edge/i), d = n(/firefox/i), u = n(/opera/i), c = n(/win/i), m = n(/mac/i), v = n(/linux/i);
  return {
    android: o,
    ios: i,
    cordova: s,
    electron: l,
    chrome: r,
    edge: a,
    firefox: d,
    opera: u,
    win: c,
    mac: m,
    linux: v,
    touch: cp,
    ssr: t === "ssr"
  };
}
function Yy(e, t) {
  const {
    thresholds: n,
    mobileBreakpoint: o
  } = Gy(e), i = Se(Lu(t)), s = Se(Bu(t)), l = dt({}), r = Se(Fu(t));
  function a() {
    i.value = Lu(), r.value = Fu();
  }
  function d() {
    a(), s.value = Bu();
  }
  return An(() => {
    const u = r.value < n.sm, c = r.value < n.md && !u, m = r.value < n.lg && !(c || u), v = r.value < n.xl && !(m || c || u), h = r.value < n.xxl && !(v || m || c || u), g = r.value >= n.xxl, _ = u ? "xs" : c ? "sm" : m ? "md" : v ? "lg" : h ? "xl" : "xxl", x = typeof o == "number" ? o : n[o], V = r.value < x;
    l.xs = u, l.sm = c, l.md = m, l.lg = v, l.xl = h, l.xxl = g, l.smAndUp = !u, l.mdAndUp = !(u || c), l.lgAndUp = !(u || c || m), l.xlAndUp = !(u || c || m || v), l.smAndDown = !(m || v || h || g), l.mdAndDown = !(v || h || g), l.lgAndDown = !(h || g), l.xlAndDown = !g, l.name = _, l.height = i.value, l.width = r.value, l.mobile = V, l.mobileBreakpoint = o, l.platform = s.value, l.thresholds = n;
  }), ze && window.addEventListener("resize", a, {
    passive: !0
  }), {
    ...wr(l),
    update: d,
    ssr: !!t
  };
}
const qy = K({
  mobile: {
    type: Boolean,
    default: !1
  },
  mobileBreakpoint: [Number, String]
}, "display");
function gf() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn();
  const n = je(Ql);
  if (!n) throw new Error("Could not find Vuetify display injection");
  const o = y(() => {
    if (e.mobile != null) return e.mobile;
    if (!e.mobileBreakpoint) return n.mobile.value;
    const s = typeof e.mobileBreakpoint == "number" ? e.mobileBreakpoint : n.thresholds.value[e.mobileBreakpoint];
    return n.width.value < s;
  }), i = y(() => t ? {
    [`${t}--mobile`]: o.value
  } : {});
  return {
    ...n,
    displayClasses: i,
    mobile: o
  };
}
const pf = Symbol.for("vuetify:goto");
function yf() {
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
function Xy(e) {
  return Ur(e) ?? (document.scrollingElement || document.body);
}
function Ur(e) {
  return typeof e == "string" ? document.querySelector(e) : Gd(e);
}
function wl(e, t, n) {
  if (typeof e == "number") return t && n ? -e : e;
  let o = Ur(e), i = 0;
  for (; o; )
    i += t ? o.offsetLeft : o.offsetTop, o = o.offsetParent;
  return i;
}
function Jy(e, t) {
  return {
    rtl: t.isRtl,
    options: pt(yf(), e)
  };
}
async function Ru(e, t, n, o) {
  const i = n ? "scrollLeft" : "scrollTop", s = pt((o == null ? void 0 : o.options) ?? yf(), t), l = o == null ? void 0 : o.rtl.value, r = (typeof e == "number" ? e : Ur(e)) ?? 0, a = s.container === "parent" && r instanceof HTMLElement ? r.parentElement : Xy(s.container), d = typeof s.easing == "function" ? s.easing : s.patterns[s.easing];
  if (!d) throw new TypeError(`Easing function "${s.easing}" not found.`);
  let u;
  if (typeof r == "number")
    u = wl(r, n, l);
  else if (u = wl(r, n, l) - wl(a, n, l), s.layout) {
    const h = window.getComputedStyle(r).getPropertyValue("--v-layout-top");
    h && (u -= parseInt(h, 10));
  }
  u += s.offset, u = Qy(a, u, !!l, !!n);
  const c = a[i] ?? 0;
  if (u === c) return Promise.resolve(u);
  const m = performance.now();
  return new Promise((v) => requestAnimationFrame(function h(g) {
    const x = (g - m) / s.duration, V = Math.floor(c + (u - c) * d(Vn(x, 0, 1)));
    if (a[i] = V, x >= 1 && Math.abs(V - a[i]) < 10)
      return v(u);
    if (x > 2)
      return mn("Scroll target is not reachable"), v(a[i]);
    requestAnimationFrame(h);
  }));
}
function Zy() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const t = je(pf), {
    isRtl: n
  } = Ft();
  if (!t) throw new Error("[Vuetify] Could not find injected goto instance");
  const o = {
    ...t,
    // can be set via VLocaleProvider
    rtl: y(() => t.rtl.value || n.value)
  };
  async function i(s, l) {
    return Ru(s, pt(e, l), !1, o);
  }
  return i.horizontal = async (s, l) => Ru(s, pt(e, l), !0, o), i;
}
function Qy(e, t, n, o) {
  const {
    scrollWidth: i,
    scrollHeight: s
  } = e, [l, r] = e === document.scrollingElement ? [window.innerWidth, window.innerHeight] : [e.offsetWidth, e.offsetHeight];
  let a, d;
  return o ? n ? (a = -(i - l), d = 0) : (a = 0, d = i - l) : (a = 0, d = s + -r), Math.max(Math.min(t, d), a);
}
const eb = {
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
}, tb = {
  // Not using mergeProps here, functional components merge props by default (?)
  component: (e) => Qn(_f, {
    ...e,
    class: "mdi"
  })
}, Ye = [String, Function, Object, Array], er = Symbol.for("vuetify:icons"), Xs = K({
  icon: {
    type: Ye
  },
  // Could not remove this and use makeTagProps, types complained because it is not required
  tag: {
    type: String,
    required: !0
  }
}, "icon"), Hu = ve()({
  name: "VComponentIcon",
  props: Xs(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return () => {
      const o = e.icon;
      return f(e.tag, null, {
        default: () => {
          var i;
          return [e.icon ? f(o, null, null) : (i = n.default) == null ? void 0 : i.call(n)];
        }
      });
    };
  }
}), bf = qo({
  name: "VSvgIcon",
  inheritAttrs: !1,
  props: Xs(),
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
      }, [Array.isArray(e.icon) ? e.icon.map((o) => Array.isArray(o) ? f("path", {
        d: o[0],
        "fill-opacity": o[1]
      }, null) : f("path", {
        d: o
      }, null)) : f("path", {
        d: e.icon
      }, null)])]
    });
  }
});
qo({
  name: "VLigatureIcon",
  props: Xs(),
  setup(e) {
    return () => f(e.tag, null, {
      default: () => [e.icon]
    });
  }
});
const _f = qo({
  name: "VClassIcon",
  props: Xs(),
  setup(e) {
    return () => f(e.tag, {
      class: e.icon
    }, null);
  }
});
function nb() {
  return {
    svg: {
      component: bf
    },
    class: {
      component: _f
    }
  };
}
function ob(e) {
  const t = nb(), n = (e == null ? void 0 : e.defaultSet) ?? "mdi";
  return n === "mdi" && !t.mdi && (t.mdi = tb), pt({
    defaultSet: n,
    sets: t,
    aliases: {
      ...eb,
      /* eslint-disable max-len */
      vuetify: ["M8.2241 14.2009L12 21L22 3H14.4459L8.2241 14.2009Z", ["M7.26303 12.4733L7.00113 12L2 3H12.5261C12.5261 3 12.5261 3 12.5261 3L7.26303 12.4733Z", 0.6]],
      "vuetify-outline": "svg:M7.26 12.47 12.53 3H2L7.26 12.47ZM14.45 3 8.22 14.2 12 21 22 3H14.45ZM18.6 5 12 16.88 10.51 14.2 15.62 5ZM7.26 8.35 5.4 5H9.13L7.26 8.35Z",
      "vuetify-play": ["m6.376 13.184-4.11-7.192C1.505 4.66 2.467 3 4.003 3h8.532l-.953 1.576-.006.01-.396.677c-.429.732-.214 1.507.194 2.015.404.503 1.092.878 1.869.806a3.72 3.72 0 0 1 1.005.022c.276.053.434.143.523.237.138.146.38.635-.25 2.09-.893 1.63-1.553 1.722-1.847 1.677-.213-.033-.468-.158-.756-.406a4.95 4.95 0 0 1-.8-.927c-.39-.564-1.04-.84-1.66-.846-.625-.006-1.316.27-1.693.921l-.478.826-.911 1.506Z", ["M9.093 11.552c.046-.079.144-.15.32-.148a.53.53 0 0 1 .43.207c.285.414.636.847 1.046 1.2.405.35.914.662 1.516.754 1.334.205 2.502-.698 3.48-2.495l.014-.028.013-.03c.687-1.574.774-2.852-.005-3.675-.37-.391-.861-.586-1.333-.676a5.243 5.243 0 0 0-1.447-.044c-.173.016-.393-.073-.54-.257-.145-.18-.127-.316-.082-.392l.393-.672L14.287 3h5.71c1.536 0 2.499 1.659 1.737 2.992l-7.997 13.996c-.768 1.344-2.706 1.344-3.473 0l-3.037-5.314 1.377-2.278.004-.006.004-.007.481-.831Z", 0.6]]
      /* eslint-enable max-len */
    }
  }, e);
}
const ib = (e) => {
  const t = je(er);
  if (!t) throw new Error("Missing Vuetify Icons provide!");
  return {
    iconData: y(() => {
      var a;
      const o = rn(e);
      if (!o) return {
        component: Hu
      };
      let i = o;
      if (typeof i == "string" && (i = i.trim(), i.startsWith("$") && (i = (a = t.aliases) == null ? void 0 : a[i.slice(1)])), i || mn(`Could not find aliased icon "${o}"`), Array.isArray(i))
        return {
          component: bf,
          icon: i
        };
      if (typeof i != "string")
        return {
          component: Hu,
          icon: i
        };
      const s = Object.keys(t.sets).find((d) => typeof i == "string" && i.startsWith(`${d}:`)), l = s ? i.slice(s.length + 1) : i;
      return {
        component: t.sets[s ?? t.defaultSet].component,
        icon: l
      };
    })
  };
}, _i = Symbol.for("vuetify:theme"), ot = K({
  theme: String
}, "theme");
function ju() {
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
function sb() {
  var o, i;
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : ju();
  const t = ju();
  if (!e) return {
    ...t,
    isDisabled: !0
  };
  const n = {};
  for (const [s, l] of Object.entries(e.themes ?? {})) {
    const r = l.dark || s === "dark" ? (o = t.themes) == null ? void 0 : o.dark : (i = t.themes) == null ? void 0 : i.light;
    n[s] = pt(r, l);
  }
  return pt(t, {
    ...e,
    themes: n
  });
}
function lb(e) {
  const t = sb(e), n = le(t.defaultTheme), o = le(t.themes), i = y(() => {
    const u = {};
    for (const [c, m] of Object.entries(o.value)) {
      const v = u[c] = {
        ...m,
        colors: {
          ...m.colors
        }
      };
      if (t.variations)
        for (const h of t.variations.colors) {
          const g = v.colors[h];
          if (g)
            for (const _ of ["lighten", "darken"]) {
              const x = _ === "lighten" ? jp : zp;
              for (const V of Fr(t.variations[_], 1))
                v.colors[`${h}-${_}-${V}`] = Bp(x(an(g), V));
            }
        }
      for (const h of Object.keys(v.colors)) {
        if (/^on-[a-z]/.test(h) || v.colors[`on-${h}`]) continue;
        const g = `on-${h}`, _ = an(v.colors[h]);
        v.colors[g] = rf(_);
      }
    }
    return u;
  }), s = y(() => i.value[n.value]), l = y(() => {
    var h;
    const u = [];
    (h = s.value) != null && h.dark && ao(u, ":root", ["color-scheme: dark"]), ao(u, ":root", zu(s.value));
    for (const [g, _] of Object.entries(i.value))
      ao(u, `.v-theme--${g}`, [`color-scheme: ${_.dark ? "dark" : "normal"}`, ...zu(_)]);
    const c = [], m = [], v = new Set(Object.values(i.value).flatMap((g) => Object.keys(g.colors)));
    for (const g of v)
      /^on-[a-z]/.test(g) ? ao(m, `.${g}`, [`color: rgb(var(--v-theme-${g})) !important`]) : (ao(c, `.bg-${g}`, [`--v-theme-overlay-multiplier: var(--v-theme-${g}-overlay-multiplier)`, `background-color: rgb(var(--v-theme-${g})) !important`, `color: rgb(var(--v-theme-on-${g})) !important`]), ao(m, `.text-${g}`, [`color: rgb(var(--v-theme-${g})) !important`]), ao(m, `.border-${g}`, [`--v-border-color: var(--v-theme-${g})`]));
    return u.push(...c, ...m), u.map((g, _) => _ === 0 ? g : `    ${g}`).join("");
  });
  function r() {
    return {
      style: [{
        children: l.value,
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
        const m = c.push(r);
        ze && Ce(l, () => {
          m.patch(r);
        });
      } else
        ze ? (c.addHeadObjs(y(r)), An(() => c.updateDOM())) : c.addHeadObjs(r());
    else {
      let v = function() {
        if (typeof document < "u" && !m) {
          const h = document.createElement("style");
          h.type = "text/css", h.id = "vuetify-theme-stylesheet", t.cspNonce && h.setAttribute("nonce", t.cspNonce), m = h, document.head.appendChild(m);
        }
        m && (m.innerHTML = l.value);
      }, m = ze ? document.getElementById("vuetify-theme-stylesheet") : null;
      ze ? Ce(l, v, {
        immediate: !0
      }) : v();
    }
  }
  const d = y(() => t.isDisabled ? void 0 : `v-theme--${n.value}`);
  return {
    install: a,
    isDisabled: t.isDisabled,
    name: n,
    themes: o,
    current: s,
    computedThemes: i,
    themeClasses: d,
    styles: l,
    global: {
      name: n,
      current: s
    }
  };
}
function vt(e) {
  et("provideTheme");
  const t = je(_i, null);
  if (!t) throw new Error("Could not find Vuetify theme injection");
  const n = y(() => e.theme ?? t.name.value), o = y(() => t.themes.value[n.value]), i = y(() => t.isDisabled ? void 0 : `v-theme--${n.value}`), s = {
    ...t,
    name: n,
    current: o,
    themeClasses: i
  };
  return bt(_i, s), s;
}
function wf() {
  et("useTheme");
  const e = je(_i, null);
  if (!e) throw new Error("Could not find Vuetify theme injection");
  return e;
}
function ao(e, t, n) {
  e.push(`${t} {
`, ...n.map((o) => `  ${o};
`), `}
`);
}
function zu(e) {
  const t = e.dark ? 2 : 1, n = e.dark ? 1 : 2, o = [];
  for (const [i, s] of Object.entries(e.colors)) {
    const l = an(s);
    o.push(`--v-theme-${i}: ${l.r},${l.g},${l.b}`), i.startsWith("on-") || o.push(`--v-theme-${i}-overlay-multiplier: ${Wp(s) > 0.18 ? t : n}`);
  }
  for (const [i, s] of Object.entries(e.variables)) {
    const l = typeof s == "string" && s.startsWith("#") ? an(s) : void 0, r = l ? `${l.r}, ${l.g}, ${l.b}` : void 0;
    o.push(`--v-${i}: ${r ?? s}`);
  }
  return o;
}
function xs(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "content";
  const n = ql(), o = le();
  if (ze) {
    const i = new ResizeObserver((s) => {
      s.length && (t === "content" ? o.value = s[0].contentRect : o.value = s[0].target.getBoundingClientRect());
    });
    xt(() => {
      i.disconnect();
    }), Ce(() => n.el, (s, l) => {
      l && (i.unobserve(l), o.value = void 0), s && i.observe(s);
    }, {
      flush: "post"
    });
  }
  return {
    resizeRef: n,
    contentRect: Vi(o)
  };
}
const Ns = Symbol.for("vuetify:layout"), Sf = Symbol.for("vuetify:layout-item"), Wu = 1e3, rb = K({
  overlaps: {
    type: Array,
    default: () => []
  },
  fullHeight: Boolean
}, "layout"), kf = K({
  name: {
    type: String
  },
  order: {
    type: [Number, String],
    default: 0
  },
  absolute: Boolean
}, "layout-item");
function ab() {
  const e = je(Ns);
  if (!e) throw new Error("[Vuetify] Could not find injected layout");
  return {
    getLayoutItem: e.getLayoutItem,
    mainRect: e.mainRect,
    mainStyles: e.mainStyles
  };
}
function Cf(e) {
  const t = je(Ns);
  if (!t) throw new Error("[Vuetify] Could not find injected layout");
  const n = e.id ?? `layout-item-${eo()}`, o = et("useLayoutItem");
  bt(Sf, {
    id: n
  });
  const i = Se(!1);
  rd(() => i.value = !0), ld(() => i.value = !1);
  const {
    layoutItemStyles: s,
    layoutItemScrimStyles: l
  } = t.register(o, {
    ...e,
    active: y(() => i.value ? !1 : e.active.value),
    id: n
  });
  return xt(() => t.unregister(n)), {
    layoutItemStyles: s,
    layoutRect: t.layoutRect,
    layoutItemScrimStyles: l
  };
}
const ub = (e, t, n, o) => {
  let i = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  };
  const s = [{
    id: "",
    layer: {
      ...i
    }
  }];
  for (const l of e) {
    const r = t.get(l), a = n.get(l), d = o.get(l);
    if (!r || !a || !d) continue;
    const u = {
      ...i,
      [r.value]: parseInt(i[r.value], 10) + (d.value ? parseInt(a.value, 10) : 0)
    };
    s.push({
      id: l,
      layer: u
    }), i = u;
  }
  return s;
};
function cb(e) {
  const t = je(Ns, null), n = y(() => t ? t.rootZIndex.value - 100 : Wu), o = le([]), i = dt(/* @__PURE__ */ new Map()), s = dt(/* @__PURE__ */ new Map()), l = dt(/* @__PURE__ */ new Map()), r = dt(/* @__PURE__ */ new Map()), a = dt(/* @__PURE__ */ new Map()), {
    resizeRef: d,
    contentRect: u
  } = xs(), c = y(() => {
    const E = /* @__PURE__ */ new Map(), F = e.overlaps ?? [];
    for (const N of F.filter((O) => O.includes(":"))) {
      const [O, $] = N.split(":");
      if (!o.value.includes(O) || !o.value.includes($)) continue;
      const M = i.get(O), k = i.get($), I = s.get(O), L = s.get($);
      !M || !k || !I || !L || (E.set($, {
        position: M.value,
        amount: parseInt(I.value, 10)
      }), E.set(O, {
        position: k.value,
        amount: -parseInt(L.value, 10)
      }));
    }
    return E;
  }), m = y(() => {
    const E = [...new Set([...l.values()].map((N) => N.value))].sort((N, O) => N - O), F = [];
    for (const N of E) {
      const O = o.value.filter(($) => {
        var M;
        return ((M = l.get($)) == null ? void 0 : M.value) === N;
      });
      F.push(...O);
    }
    return ub(F, i, s, r);
  }), v = y(() => !Array.from(a.values()).some((E) => E.value)), h = y(() => m.value[m.value.length - 1].layer), g = y(() => ({
    "--v-layout-left": ye(h.value.left),
    "--v-layout-right": ye(h.value.right),
    "--v-layout-top": ye(h.value.top),
    "--v-layout-bottom": ye(h.value.bottom),
    ...v.value ? void 0 : {
      transition: "none"
    }
  })), _ = y(() => m.value.slice(1).map((E, F) => {
    let {
      id: N
    } = E;
    const {
      layer: O
    } = m.value[F], $ = s.get(N), M = i.get(N);
    return {
      id: N,
      ...O,
      size: Number($.value),
      position: M.value
    };
  })), x = (E) => _.value.find((F) => F.id === E), V = et("createLayout"), A = Se(!1);
  Zn(() => {
    A.value = !0;
  }), bt(Ns, {
    register: (E, F) => {
      let {
        id: N,
        order: O,
        position: $,
        layoutSize: M,
        elementSize: k,
        active: I,
        disableTransitions: L,
        absolute: J
      } = F;
      l.set(N, O), i.set(N, $), s.set(N, M), r.set(N, I), L && a.set(N, L);
      const oe = Lo(Sf, V == null ? void 0 : V.vnode).indexOf(E);
      oe > -1 ? o.value.splice(oe, 0, N) : o.value.push(N);
      const Z = y(() => _.value.findIndex((ee) => ee.id === N)), Ee = y(() => n.value + m.value.length * 2 - Z.value * 2), G = y(() => {
        const ee = $.value === "left" || $.value === "right", Ve = $.value === "right", Ge = $.value === "bottom", qe = k.value ?? M.value, ne = qe === 0 ? "%" : "px", we = {
          [$.value]: 0,
          zIndex: Ee.value,
          transform: `translate${ee ? "X" : "Y"}(${(I.value ? 0 : -(qe === 0 ? 100 : qe)) * (Ve || Ge ? -1 : 1)}${ne})`,
          position: J.value || n.value !== Wu ? "absolute" : "fixed",
          ...v.value ? void 0 : {
            transition: "none"
          }
        };
        if (!A.value) return we;
        const Be = _.value[Z.value];
        if (!Be) throw new Error(`[Vuetify] Could not find layout item "${N}"`);
        const Ze = c.value.get(N);
        return Ze && (Be[Ze.position] += Ze.amount), {
          ...we,
          height: ee ? `calc(100% - ${Be.top}px - ${Be.bottom}px)` : k.value ? `${k.value}px` : void 0,
          left: Ve ? void 0 : `${Be.left}px`,
          right: Ve ? `${Be.right}px` : void 0,
          top: $.value !== "bottom" ? `${Be.top}px` : void 0,
          bottom: $.value !== "top" ? `${Be.bottom}px` : void 0,
          width: ee ? k.value ? `${k.value}px` : void 0 : `calc(100% - ${Be.left}px - ${Be.right}px)`
        };
      }), q = y(() => ({
        zIndex: Ee.value - 1
      }));
      return {
        layoutItemStyles: G,
        layoutItemScrimStyles: q,
        zIndex: Ee
      };
    },
    unregister: (E) => {
      l.delete(E), i.delete(E), s.delete(E), r.delete(E), a.delete(E), o.value = o.value.filter((F) => F !== E);
    },
    mainRect: h,
    mainStyles: g,
    getLayoutItem: x,
    items: _,
    layoutRect: u,
    rootZIndex: n
  });
  const D = y(() => ["v-layout", {
    "v-layout--full-height": e.fullHeight
  }]), C = y(() => ({
    zIndex: t ? n.value : void 0,
    position: t ? "relative" : void 0,
    overflow: t ? "hidden" : void 0
  }));
  return {
    layoutClasses: D,
    layoutStyles: C,
    getLayoutItem: x,
    items: _,
    layoutRect: u,
    layoutRef: d
  };
}
function Ef() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const {
    blueprint: t,
    ...n
  } = e, o = pt(t, n), {
    aliases: i = {},
    components: s = {},
    directives: l = {}
  } = o, r = Kp(o.defaults), a = Yy(o.display, o.ssr), d = lb(o.theme), u = ob(o.icons), c = oy(o.locale), m = Uy(o.date, c), v = Jy(o.goTo, c);
  return {
    install: (g) => {
      for (const _ in l)
        g.directive(_, l[_]);
      for (const _ in s)
        g.component(_, s[_]);
      for (const _ in i)
        g.component(_, qo({
          ...i[_],
          name: _,
          aliasName: i[_].name
        }));
      if (d.install(g), g.provide(Ko, r), g.provide(Ql, a), g.provide(_i, d), g.provide(er, u), g.provide(Cs, c), g.provide(Wy, m.options), g.provide($u, m.instance), g.provide(pf, v), ze && o.ssr)
        if (g.$nuxt)
          g.$nuxt.hook("app:suspense:resolve", () => {
            a.update();
          });
        else {
          const {
            mount: _
          } = g;
          g.mount = function() {
            const x = _(...arguments);
            return Et(() => a.update()), g.mount = _, x;
          };
        }
      eo.reset(), g.mixin({
        computed: {
          $vuetify() {
            return dt({
              defaults: Io.call(this, Ko),
              display: Io.call(this, Ql),
              theme: Io.call(this, _i),
              icons: Io.call(this, er),
              locale: Io.call(this, Cs),
              date: Io.call(this, $u)
            });
          }
        }
      });
    },
    defaults: r,
    display: a,
    theme: d,
    icons: u,
    locale: c,
    date: m,
    goTo: v
  };
}
const db = "3.7.4";
Ef.version = db;
function Io(e) {
  var o, i;
  const t = this.$, n = ((o = t.parent) == null ? void 0 : o.provides) ?? ((i = t.vnode.appContext) == null ? void 0 : i.provides);
  if (n && e in n)
    return n[e];
}
const qn = [
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
function bn(e) {
  const t = qn.find((n) => n.id === e);
  return t || (console.error(`[themes] 未找到主题 id="${e}"，已回退到「${qn[0].name}」`), qn[0]);
}
const fb = Object.fromEntries(
  qn.map((e) => [e.id, { dark: e.mode === "night", colors: { background: e.bg, surface: e.surface } }])
), mb = Ef({
  theme: {
    defaultTheme: "white",
    themes: fb
  }
}), vb = {
  install: (e, t) => {
    const n = t.server;
    e.config.globalProperties.$alert = function(o, i, s) {
      e.$store.commit("alert", { type: o, msg: i, to: s }), o === "success" && setTimeout(() => {
        e.$store.commit("close_alert");
      }, 1300);
    }, e.config.globalProperties.$backend = async function(o, i) {
      if (o === void 0)
        throw "url is undefined ";
      var s = {
        mode: "cors",
        redirect: "follow",
        credentials: "include",
        timeout: 1e4
        // 添加超时设置
      }, l = n + o;
      i !== void 0 && Object.assign(s, i);
      const r = new AbortController(), a = setTimeout(() => r.abort(), s.timeout || 1e4);
      return fetch(l, {
        ...s,
        signal: r.signal
      }).then((d) => {
        clearTimeout(a);
        var u = "";
        if (d.status === 413)
          throw u = "服务器响应了413异常状态码。<br/>可能是上传的文件过大，超过了服务器设置的上传大小。", e.$alert("error", u), u;
        if (d.status === 502)
          throw u = "服务器正在启动中...", e.$alert("info", u), u;
        try {
          return d.json().then((c) => (d.status !== 200, c));
        } catch {
          throw d.status !== 200 ? (u = "服务器异常，状态码: " + d.status + "<br/>请查阅服务器日志:<br/>talebook.log", e.$alert("error", u), u) : (u = "服务器异常，响应非JSON<br/>请查阅服务器日志:<br/>talebook.log", e.$alert("error", u), u);
        }
      }).then((d) => (d.err === "exception" && (e.$store ? e.$store.commit("alert", { type: "error", msg: d.msg, to: null }) : console.error("API 异常:", d.msg)), d)).catch((d) => {
        clearTimeout(a);
        var u = "";
        return d.name === "AbortError" ? u = "请求超时，请检查网络连接或服务器状态" : navigator.onLine ? u = "请求失败: " + (d.message || "未知错误") : u = "网络连接已断开，请检查网络设置", console.error("API请求失败:", d), { err: "network_error", msg: u, data: {} };
      });
    };
  }
};
function hb(e, t) {
  e.use(mb).use(vb, t);
}
const $n = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [o, i] of t)
    n[o] = i;
  return n;
}, gb = K({
  defaults: Object,
  disabled: Boolean,
  reset: [Number, String],
  root: [Boolean, String],
  scoped: Boolean
}, "VDefaultsProvider"), mt = ve(!1)({
  name: "VDefaultsProvider",
  props: gb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      defaults: o,
      disabled: i,
      reset: s,
      root: l,
      scoped: r
    } = wr(e);
    return To(o, {
      reset: s,
      root: l,
      scoped: r,
      disabled: i
    }), () => {
      var a;
      return (a = n.default) == null ? void 0 : a.call(n);
    };
  }
});
function Kr(e) {
  return Br(() => {
    const t = [], n = {};
    if (e.value.background)
      if (Jl(e.value.background)) {
        if (n.backgroundColor = e.value.background, !e.value.text && Fp(e.value.background)) {
          const o = an(e.value.background);
          if (o.a == null || o.a === 1) {
            const i = rf(o);
            n.color = i, n.caretColor = i;
          }
        }
      } else
        t.push(`bg-${e.value.background}`);
    return e.value.text && (Jl(e.value.text) ? (n.color = e.value.text, n.caretColor = e.value.text) : t.push(`text-${e.value.text}`)), {
      colorClasses: t,
      colorStyles: n
    };
  });
}
function Ut(e, t) {
  const n = y(() => ({
    text: He(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: o,
    colorStyles: i
  } = Kr(n);
  return {
    textColorClasses: o,
    textColorStyles: i
  };
}
function $t(e, t) {
  const n = y(() => ({
    background: He(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: o,
    colorStyles: i
  } = Kr(n);
  return {
    backgroundColorClasses: o,
    backgroundColorStyles: i
  };
}
const pb = ["x-small", "small", "default", "large", "x-large"], Js = K({
  size: {
    type: [String, Number],
    default: "default"
  }
}, "size");
function Zs(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn();
  return Br(() => {
    let n, o;
    return _s(pb, e.size) ? n = `${t}--size-${e.size}` : e.size && (o = {
      width: ye(e.size),
      height: ye(e.size)
    }), {
      sizeClasses: n,
      sizeStyles: o
    };
  });
}
const Ke = K({
  tag: {
    type: String,
    default: "div"
  }
}, "tag"), yb = K({
  color: String,
  disabled: Boolean,
  start: Boolean,
  end: Boolean,
  icon: Ye,
  ...xe(),
  ...Js(),
  ...Ke({
    tag: "i"
  }),
  ...ot()
}, "VIcon"), Me = ve()({
  name: "VIcon",
  props: yb(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = le(), {
      themeClasses: s
    } = vt(e), {
      iconData: l
    } = ib(y(() => i.value || e.icon)), {
      sizeClasses: r
    } = Zs(e), {
      textColorClasses: a,
      textColorStyles: d
    } = Ut(ce(e, "color"));
    return _e(() => {
      var m, v;
      const u = (m = o.default) == null ? void 0 : m.call(o);
      u && (i.value = (v = Jd(u).filter((h) => h.type === Oo && h.children && typeof h.children == "string")[0]) == null ? void 0 : v.children);
      const c = !!(n.onClick || n.onClickOnce);
      return f(l.value.component, {
        tag: e.tag,
        icon: l.value.icon,
        class: ["v-icon", "notranslate", s.value, r.value, a.value, {
          "v-icon--clickable": c,
          "v-icon--disabled": e.disabled,
          "v-icon--start": e.start,
          "v-icon--end": e.end
        }, e.class],
        style: [r.value ? void 0 : {
          fontSize: ye(e.size),
          height: ye(e.size),
          width: ye(e.size)
        }, d.value, e.style],
        role: c ? "button" : void 0,
        "aria-hidden": !c,
        tabindex: c ? e.disabled ? -1 : 0 : void 0
      }, {
        default: () => [u]
      });
    }), {};
  }
}), Mn = K({
  height: [Number, String],
  maxHeight: [Number, String],
  maxWidth: [Number, String],
  minHeight: [Number, String],
  minWidth: [Number, String],
  width: [Number, String]
}, "dimension");
function Fn(e) {
  return {
    dimensionStyles: y(() => {
      const n = {}, o = ye(e.height), i = ye(e.maxHeight), s = ye(e.maxWidth), l = ye(e.minHeight), r = ye(e.minWidth), a = ye(e.width);
      return o != null && (n.height = o), i != null && (n.maxHeight = i), s != null && (n.maxWidth = s), l != null && (n.minHeight = l), r != null && (n.minWidth = r), a != null && (n.width = a), n;
    })
  };
}
function bb(e) {
  return {
    aspectStyles: y(() => {
      const t = Number(e.aspectRatio);
      return t ? {
        paddingBottom: String(1 / t * 100) + "%"
      } : void 0;
    })
  };
}
const xf = K({
  aspectRatio: [String, Number],
  contentClass: null,
  inline: Boolean,
  ...xe(),
  ...Mn()
}, "VResponsive"), Uu = ve()({
  name: "VResponsive",
  props: xf(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      aspectStyles: o
    } = bb(e), {
      dimensionStyles: i
    } = Fn(e);
    return _e(() => {
      var s;
      return f("div", {
        class: ["v-responsive", {
          "v-responsive--inline": e.inline
        }, e.class],
        style: [i.value, e.style]
      }, [f("div", {
        class: "v-responsive__sizer",
        style: o.value
      }, null), (s = n.additional) == null ? void 0 : s.call(n), n.default && f("div", {
        class: ["v-responsive__content", e.contentClass]
      }, [n.default()])]);
    }), {};
  }
}), Vt = K({
  rounded: {
    type: [Boolean, Number, String],
    default: void 0
  },
  tile: Boolean
}, "rounded");
function Ot(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn();
  return {
    roundedClasses: y(() => {
      const o = He(e) ? e.value : e.rounded, i = He(e) ? e.value : e.tile, s = [];
      if (o === !0 || o === "")
        s.push(`${t}--rounded`);
      else if (typeof o == "string" || o === 0)
        for (const l of String(o).split(" "))
          s.push(`rounded-${l}`);
      else (i || o === !1) && s.push("rounded-0");
      return s;
    })
  };
}
const Ai = K({
  transition: {
    type: [Boolean, String, Object],
    default: "fade-transition",
    validator: (e) => e !== !0
  }
}, "transition"), un = (e, t) => {
  let {
    slots: n
  } = t;
  const {
    transition: o,
    disabled: i,
    group: s,
    ...l
  } = e, {
    component: r = s ? $r : xo,
    ...a
  } = typeof o == "object" ? o : {};
  return Qn(r, Oe(typeof o == "string" ? {
    name: i ? "" : o
  } : a, typeof o == "string" ? {} : Object.fromEntries(Object.entries({
    disabled: i,
    group: s
  }).filter((d) => {
    let [u, c] = d;
    return c !== void 0;
  })), l), n);
};
function _b(e, t) {
  if (!Mr) return;
  const n = t.modifiers || {}, o = t.value, {
    handler: i,
    options: s
  } = typeof o == "object" ? o : {
    handler: o,
    options: {}
  }, l = new IntersectionObserver(function() {
    var c;
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], a = arguments.length > 1 ? arguments[1] : void 0;
    const d = (c = e._observe) == null ? void 0 : c[t.instance.$.uid];
    if (!d) return;
    const u = r.some((m) => m.isIntersecting);
    i && (!n.quiet || d.init) && (!n.once || u || d.init) && i(u, r, a), u && n.once ? Nf(e, t) : d.init = !0;
  }, s);
  e._observe = Object(e._observe), e._observe[t.instance.$.uid] = {
    init: !1,
    observer: l
  }, l.observe(e);
}
function Nf(e, t) {
  var o;
  const n = (o = e._observe) == null ? void 0 : o[t.instance.$.uid];
  n && (n.observer.unobserve(e), delete e._observe[t.instance.$.uid]);
}
const Vf = {
  mounted: _b,
  unmounted: Nf
}, wb = K({
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
  ...xf(),
  ...xe(),
  ...Vt(),
  ...Ai()
}, "VImg"), Gr = ve()({
  name: "VImg",
  directives: {
    intersect: Vf
  },
  props: wb(),
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
      backgroundColorStyles: s
    } = $t(ce(e, "color")), {
      roundedClasses: l
    } = Ot(e), r = et("VImg"), a = Se(""), d = le(), u = Se(e.eager ? "loading" : "idle"), c = Se(), m = Se(), v = y(() => e.src && typeof e.src == "object" ? {
      src: e.src.src,
      srcset: e.srcset || e.src.srcset,
      lazySrc: e.lazySrc || e.src.lazySrc,
      aspect: Number(e.aspectRatio || e.src.aspect || 0)
    } : {
      src: e.src,
      srcset: e.srcset,
      lazySrc: e.lazySrc,
      aspect: Number(e.aspectRatio || 0)
    }), h = y(() => v.value.aspect || c.value / m.value || 0);
    Ce(() => e.src, () => {
      g(u.value !== "idle");
    }), Ce(h, (k, I) => {
      !k && I && d.value && D(d.value);
    }), xr(() => g());
    function g(k) {
      if (!(e.eager && k) && !(Mr && !k && !e.eager)) {
        if (u.value = "loading", v.value.lazySrc) {
          const I = new Image();
          I.src = v.value.lazySrc, D(I, null);
        }
        v.value.src && Et(() => {
          var I;
          n("loadstart", ((I = d.value) == null ? void 0 : I.currentSrc) || v.value.src), setTimeout(() => {
            var L;
            if (!r.isUnmounted)
              if ((L = d.value) != null && L.complete) {
                if (d.value.naturalWidth || x(), u.value === "error") return;
                h.value || D(d.value, null), u.value === "loading" && _();
              } else
                h.value || D(d.value), V();
          });
        });
      }
    }
    function _() {
      var k;
      r.isUnmounted || (V(), D(d.value), u.value = "loaded", n("load", ((k = d.value) == null ? void 0 : k.currentSrc) || v.value.src));
    }
    function x() {
      var k;
      r.isUnmounted || (u.value = "error", n("error", ((k = d.value) == null ? void 0 : k.currentSrc) || v.value.src));
    }
    function V() {
      const k = d.value;
      k && (a.value = k.currentSrc || k.src);
    }
    let A = -1;
    xt(() => {
      clearTimeout(A);
    });
    function D(k) {
      let I = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 100;
      const L = () => {
        if (clearTimeout(A), r.isUnmounted) return;
        const {
          naturalHeight: J,
          naturalWidth: re
        } = k;
        J || re ? (c.value = re, m.value = J) : !k.complete && u.value === "loading" && I != null ? A = window.setTimeout(L, I) : (k.currentSrc.endsWith(".svg") || k.currentSrc.startsWith("data:image/svg+xml")) && (c.value = 1, m.value = 1);
      };
      L();
    }
    const C = y(() => ({
      "v-img__img--cover": e.cover,
      "v-img__img--contain": !e.cover
    })), E = () => {
      var L;
      if (!v.value.src || u.value === "idle") return null;
      const k = f("img", {
        class: ["v-img__img", C.value],
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
        onLoad: _,
        onError: x
      }, null), I = (L = o.sources) == null ? void 0 : L.call(o);
      return f(un, {
        transition: e.transition,
        appear: !0
      }, {
        default: () => [yt(I ? f("picture", {
          class: "v-img__picture"
        }, [I, k]) : k, [[In, u.value === "loaded"]])]
      });
    }, F = () => f(un, {
      transition: e.transition
    }, {
      default: () => [v.value.lazySrc && u.value !== "loaded" && f("img", {
        class: ["v-img__img", "v-img__img--preload", C.value],
        style: {
          objectPosition: e.position
        },
        src: v.value.lazySrc,
        alt: e.alt,
        crossorigin: e.crossorigin,
        referrerpolicy: e.referrerpolicy,
        draggable: e.draggable
      }, null)]
    }), N = () => o.placeholder ? f(un, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [(u.value === "loading" || u.value === "error" && !o.error) && f("div", {
        class: "v-img__placeholder"
      }, [o.placeholder()])]
    }) : null, O = () => o.error ? f(un, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [u.value === "error" && f("div", {
        class: "v-img__error"
      }, [o.error()])]
    }) : null, $ = () => e.gradient ? f("div", {
      class: "v-img__gradient",
      style: {
        backgroundImage: `linear-gradient(${e.gradient})`
      }
    }, null) : null, M = Se(!1);
    {
      const k = Ce(h, (I) => {
        I && (requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            M.value = !0;
          });
        }), k());
      });
    }
    return _e(() => {
      const k = Uu.filterProps(e);
      return yt(f(Uu, Oe({
        class: ["v-img", {
          "v-img--absolute": e.absolute,
          "v-img--booting": !M.value
        }, i.value, l.value, e.class],
        style: [{
          width: ye(e.width === "auto" ? c.value : e.width)
        }, s.value, e.style]
      }, k, {
        aspectRatio: h.value,
        "aria-label": e.alt,
        role: e.alt ? "img" : void 0
      }), {
        additional: () => f(Ne, null, [f(E, null, null), f(F, null, null), f($, null, null), f(N, null, null), f(O, null, null)]),
        default: o.default
      }), [[Vo("intersect"), {
        handler: g,
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
}), to = K({
  border: [Boolean, Number, String]
}, "border");
function no(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn();
  return {
    borderClasses: y(() => {
      const o = He(e) ? e.value : e.border, i = [];
      if (o === !0 || o === "")
        i.push(`${t}--border`);
      else if (typeof o == "string" || o === 0)
        for (const s of String(o).split(" "))
          i.push(`border-${s}`);
      return i;
    })
  };
}
const Sb = [null, "default", "comfortable", "compact"], Qt = K({
  density: {
    type: String,
    default: "default",
    validator: (e) => Sb.includes(e)
  }
}, "density");
function pn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn();
  return {
    densityClasses: y(() => `${t}--density-${e.density}`)
  };
}
const kb = ["elevated", "flat", "tonal", "outlined", "text", "plain"];
function Ii(e, t) {
  return f(Ne, null, [e && f("span", {
    key: "overlay",
    class: `${t}__overlay`
  }, null), f("span", {
    key: "underlay",
    class: `${t}__underlay`
  }, null)]);
}
const Do = K({
  color: String,
  variant: {
    type: String,
    default: "elevated",
    validator: (e) => kb.includes(e)
  }
}, "variant");
function $i(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn();
  const n = y(() => {
    const {
      variant: s
    } = rn(e);
    return `${t}--variant-${s}`;
  }), {
    colorClasses: o,
    colorStyles: i
  } = Kr(y(() => {
    const {
      variant: s,
      color: l
    } = rn(e);
    return {
      [["elevated", "flat"].includes(s) ? "background" : "text"]: l
    };
  }));
  return {
    colorClasses: o,
    colorStyles: i,
    variantClasses: n
  };
}
const Cb = K({
  start: Boolean,
  end: Boolean,
  icon: Ye,
  image: String,
  text: String,
  ...to(),
  ...xe(),
  ...Qt(),
  ...Vt(),
  ...Js(),
  ...Ke(),
  ...ot(),
  ...Do({
    variant: "flat"
  })
}, "VAvatar"), cn = ve()({
  name: "VAvatar",
  props: Cb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = vt(e), {
      borderClasses: i
    } = no(e), {
      colorClasses: s,
      colorStyles: l,
      variantClasses: r
    } = $i(e), {
      densityClasses: a
    } = pn(e), {
      roundedClasses: d
    } = Ot(e), {
      sizeClasses: u,
      sizeStyles: c
    } = Zs(e);
    return _e(() => f(e.tag, {
      class: ["v-avatar", {
        "v-avatar--start": e.start,
        "v-avatar--end": e.end
      }, o.value, i.value, s.value, a.value, d.value, u.value, r.value, e.class],
      style: [l.value, c.value, e.style]
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
      }) : e.image ? f(Gr, {
        key: "image",
        src: e.image,
        alt: "",
        cover: !0
      }, null) : e.icon ? f(Me, {
        key: "icon",
        icon: e.icon
      }, null) : e.text, Ii(!1, "v-avatar")]
    })), {};
  }
}), Ln = K({
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
function Bn(e) {
  return {
    elevationClasses: y(() => {
      const n = He(e) ? e.value : e.elevation, o = [];
      return n == null || o.push(`elevation-${n}`), o;
    })
  };
}
const Of = K({
  baseColor: String,
  divided: Boolean,
  ...to(),
  ...xe(),
  ...Qt(),
  ...Ln(),
  ...Vt(),
  ...Ke(),
  ...ot(),
  ...Do()
}, "VBtnGroup"), Bo = ve()({
  name: "VBtnGroup",
  props: Of(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = vt(e), {
      densityClasses: i
    } = pn(e), {
      borderClasses: s
    } = no(e), {
      elevationClasses: l
    } = Bn(e), {
      roundedClasses: r
    } = Ot(e);
    To({
      VBtn: {
        height: "auto",
        baseColor: ce(e, "baseColor"),
        color: ce(e, "color"),
        density: ce(e, "density"),
        flat: !0,
        variant: ce(e, "variant")
      }
    }), _e(() => f(e.tag, {
      class: ["v-btn-group", {
        "v-btn-group--divided": e.divided
      }, o.value, s.value, i.value, l.value, r.value, e.class],
      style: e.style
    }, n));
  }
}), Yr = K({
  modelValue: {
    type: null,
    default: void 0
  },
  multiple: Boolean,
  mandatory: [Boolean, String],
  max: Number,
  selectedClass: String,
  disabled: Boolean
}, "group"), Tf = K({
  value: null,
  disabled: Boolean,
  selectedClass: String
}, "group-item");
function Df(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0;
  const o = et("useGroupItem");
  if (!o)
    throw new Error("[Vuetify] useGroupItem composable must be used inside a component setup function");
  const i = eo();
  bt(Symbol.for(`${t.description}:id`), i);
  const s = je(t, null);
  if (!s) {
    if (!n) return s;
    throw new Error(`[Vuetify] Could not find useGroup injection with symbol ${t.description}`);
  }
  const l = ce(e, "value"), r = y(() => !!(s.disabled.value || e.disabled));
  s.register({
    id: i,
    value: l,
    disabled: r
  }, o), xt(() => {
    s.unregister(i);
  });
  const a = y(() => s.isSelected(i)), d = y(() => s.items.value[0].id === i), u = y(() => s.items.value[s.items.value.length - 1].id === i), c = y(() => a.value && [s.selectedClass.value, e.selectedClass]);
  return Ce(a, (m) => {
    o.emit("group:selected", {
      value: m
    });
  }, {
    flush: "sync"
  }), {
    id: i,
    isSelected: a,
    isFirst: d,
    isLast: u,
    toggle: () => s.select(i, !a.value),
    select: (m) => s.select(i, m),
    selectedClass: c,
    value: l,
    disabled: r,
    group: s
  };
}
function Qs(e, t) {
  let n = !1;
  const o = dt([]), i = at(e, "modelValue", [], (m) => m == null ? [] : Pf(o, wo(m)), (m) => {
    const v = xb(o, m);
    return e.multiple ? v : v[0];
  }), s = et("useGroup");
  function l(m, v) {
    const h = m, g = Symbol.for(`${t.description}:id`), x = Lo(g, s == null ? void 0 : s.vnode).indexOf(v);
    rn(h.value) == null && (h.value = x, h.useIndexAsValue = !0), x > -1 ? o.splice(x, 0, h) : o.push(h);
  }
  function r(m) {
    if (n) return;
    a();
    const v = o.findIndex((h) => h.id === m);
    o.splice(v, 1);
  }
  function a() {
    const m = o.find((v) => !v.disabled);
    m && e.mandatory === "force" && !i.value.length && (i.value = [m.id]);
  }
  Zn(() => {
    a();
  }), xt(() => {
    n = !0;
  }), Nr(() => {
    for (let m = 0; m < o.length; m++)
      o[m].useIndexAsValue && (o[m].value = m);
  });
  function d(m, v) {
    const h = o.find((g) => g.id === m);
    if (!(v && (h != null && h.disabled)))
      if (e.multiple) {
        const g = i.value.slice(), _ = g.findIndex((V) => V === m), x = ~_;
        if (v = v ?? !x, x && e.mandatory && g.length <= 1 || !x && e.max != null && g.length + 1 > e.max) return;
        _ < 0 && v ? g.push(m) : _ >= 0 && !v && g.splice(_, 1), i.value = g;
      } else {
        const g = i.value.includes(m);
        if (e.mandatory && g) return;
        i.value = v ?? !g ? [m] : [];
      }
  }
  function u(m) {
    if (e.multiple && mn('This method is not supported when using "multiple" prop'), i.value.length) {
      const v = i.value[0], h = o.findIndex((x) => x.id === v);
      let g = (h + m) % o.length, _ = o[g];
      for (; _.disabled && g !== h; )
        g = (g + m) % o.length, _ = o[g];
      if (_.disabled) return;
      i.value = [o[g].id];
    } else {
      const v = o.find((h) => !h.disabled);
      v && (i.value = [v.id]);
    }
  }
  const c = {
    register: l,
    unregister: r,
    selected: i,
    select: d,
    disabled: ce(e, "disabled"),
    prev: () => u(o.length - 1),
    next: () => u(1),
    isSelected: (m) => i.value.includes(m),
    selectedClass: y(() => e.selectedClass),
    items: y(() => o),
    getItemIndex: (m) => Eb(o, m)
  };
  return bt(t, c), c;
}
function Eb(e, t) {
  const n = Pf(e, [t]);
  return n.length ? e.findIndex((o) => o.id === n[0]) : -1;
}
function Pf(e, t) {
  const n = [];
  return t.forEach((o) => {
    const i = e.find((l) => Ws(o, l.value)), s = e[o];
    (i == null ? void 0 : i.value) != null ? n.push(i.id) : s != null && n.push(s.id);
  }), n;
}
function xb(e, t) {
  const n = [];
  return t.forEach((o) => {
    const i = e.findIndex((s) => s.id === o);
    if (~i) {
      const s = e[i];
      n.push(s.value != null ? s.value : i);
    }
  }), n;
}
const qr = Symbol.for("vuetify:v-btn-toggle"), Nb = K({
  ...Of(),
  ...Yr()
}, "VBtnToggle");
ve()({
  name: "VBtnToggle",
  props: Nb(),
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
      prev: s,
      select: l,
      selected: r
    } = Qs(e, qr);
    return _e(() => {
      const a = Bo.filterProps(e);
      return f(Bo, Oe({
        class: ["v-btn-toggle", e.class]
      }, a, {
        style: e.style
      }), {
        default: () => {
          var d;
          return [(d = n.default) == null ? void 0 : d.call(n, {
            isSelected: o,
            next: i,
            prev: s,
            select: l,
            selected: r
          })];
        }
      });
    }), {
      next: i,
      prev: s,
      select: l
    };
  }
});
function Af(e, t) {
  const n = le(), o = Se(!1);
  if (Mr) {
    const i = new IntersectionObserver((s) => {
      o.value = !!s.find((l) => l.isIntersecting);
    }, t);
    xt(() => {
      i.disconnect();
    }), Ce(n, (s, l) => {
      l && (i.unobserve(l), o.value = !1), s && i.observe(s);
    }, {
      flush: "post"
    });
  }
  return {
    intersectionRef: n,
    isIntersecting: o
  };
}
const Vb = K({
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
  ...xe(),
  ...Js(),
  ...Ke({
    tag: "div"
  }),
  ...ot()
}, "VProgressCircular"), If = ve()({
  name: "VProgressCircular",
  props: Vb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = 20, i = 2 * Math.PI * o, s = le(), {
      themeClasses: l
    } = vt(e), {
      sizeClasses: r,
      sizeStyles: a
    } = Zs(e), {
      textColorClasses: d,
      textColorStyles: u
    } = Ut(ce(e, "color")), {
      textColorClasses: c,
      textColorStyles: m
    } = Ut(ce(e, "bgColor")), {
      intersectionRef: v,
      isIntersecting: h
    } = Af(), {
      resizeRef: g,
      contentRect: _
    } = xs(), x = y(() => Math.max(0, Math.min(100, parseFloat(e.modelValue)))), V = y(() => Number(e.width)), A = y(() => a.value ? Number(e.size) : _.value ? _.value.width : Math.max(V.value, 32)), D = y(() => o / (1 - V.value / A.value) * 2), C = y(() => V.value / A.value * D.value), E = y(() => ye((100 - x.value) / 100 * i));
    return An(() => {
      v.value = s.value, g.value = s.value;
    }), _e(() => f(e.tag, {
      ref: s,
      class: ["v-progress-circular", {
        "v-progress-circular--indeterminate": !!e.indeterminate,
        "v-progress-circular--visible": h.value,
        "v-progress-circular--disable-shrink": e.indeterminate === "disable-shrink"
      }, l.value, r.value, d.value, e.class],
      style: [a.value, u.value, e.style],
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": e.indeterminate ? void 0 : x.value
    }, {
      default: () => [f("svg", {
        style: {
          transform: `rotate(calc(-90deg + ${Number(e.rotate)}deg))`
        },
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${D.value} ${D.value}`
      }, [f("circle", {
        class: ["v-progress-circular__underlay", c.value],
        style: m.value,
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: o,
        "stroke-width": C.value,
        "stroke-dasharray": i,
        "stroke-dashoffset": 0
      }, null), f("circle", {
        class: "v-progress-circular__overlay",
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: o,
        "stroke-width": C.value,
        "stroke-dasharray": i,
        "stroke-dashoffset": E.value
      }, null)]), n.default && f("div", {
        class: "v-progress-circular__content"
      }, [n.default({
        value: x.value
      })])]
    })), {};
  }
}), Ku = {
  center: "center",
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
}, Mi = K({
  location: String
}, "location");
function Fi(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, n = arguments.length > 2 ? arguments[2] : void 0;
  const {
    isRtl: o
  } = Ft();
  return {
    locationStyles: y(() => {
      if (!e.location) return {};
      const {
        side: s,
        align: l
      } = Xl(e.location.split(" ").length > 1 ? e.location : `${e.location} center`, o.value);
      function r(d) {
        return n ? n(d) : 0;
      }
      const a = {};
      return s !== "center" && (t ? a[Ku[s]] = `calc(100% - ${r(s)}px)` : a[s] = 0), l !== "center" ? t ? a[Ku[l]] = `calc(100% - ${r(l)}px)` : a[l] = 0 : (s === "center" ? a.top = a.left = "50%" : a[{
        top: "left",
        bottom: "left",
        left: "top",
        right: "top"
      }[s]] = "50%", a.transform = {
        top: "translateX(-50%)",
        bottom: "translateX(-50%)",
        left: "translateY(-50%)",
        right: "translateY(-50%)",
        center: "translate(-50%, -50%)"
      }[s]), a;
    })
  };
}
const Ob = K({
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
  ...xe(),
  ...Mi({
    location: "top"
  }),
  ...Vt(),
  ...Ke(),
  ...ot()
}, "VProgressLinear"), Tb = ve()({
  name: "VProgressLinear",
  props: Ob(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    var M;
    let {
      slots: n
    } = t;
    const o = at(e, "modelValue"), {
      isRtl: i,
      rtlClasses: s
    } = Ft(), {
      themeClasses: l
    } = vt(e), {
      locationStyles: r
    } = Fi(e), {
      textColorClasses: a,
      textColorStyles: d
    } = Ut(e, "color"), {
      backgroundColorClasses: u,
      backgroundColorStyles: c
    } = $t(y(() => e.bgColor || e.color)), {
      backgroundColorClasses: m,
      backgroundColorStyles: v
    } = $t(y(() => e.bufferColor || e.bgColor || e.color)), {
      backgroundColorClasses: h,
      backgroundColorStyles: g
    } = $t(e, "color"), {
      roundedClasses: _
    } = Ot(e), {
      intersectionRef: x,
      isIntersecting: V
    } = Af(), A = y(() => parseFloat(e.max)), D = y(() => parseFloat(e.height)), C = y(() => Vn(parseFloat(e.bufferValue) / A.value * 100, 0, 100)), E = y(() => Vn(parseFloat(o.value) / A.value * 100, 0, 100)), F = y(() => i.value !== e.reverse), N = y(() => e.indeterminate ? "fade-transition" : "slide-x-transition"), O = ze && ((M = window.matchMedia) == null ? void 0 : M.call(window, "(forced-colors: active)").matches);
    function $(k) {
      if (!x.value) return;
      const {
        left: I,
        right: L,
        width: J
      } = x.value.getBoundingClientRect(), re = F.value ? J - k.clientX + (L - J) : k.clientX - I;
      o.value = Math.round(re / J * A.value);
    }
    return _e(() => f(e.tag, {
      ref: x,
      class: ["v-progress-linear", {
        "v-progress-linear--absolute": e.absolute,
        "v-progress-linear--active": e.active && V.value,
        "v-progress-linear--reverse": F.value,
        "v-progress-linear--rounded": e.rounded,
        "v-progress-linear--rounded-bar": e.roundedBar,
        "v-progress-linear--striped": e.striped
      }, _.value, l.value, s.value, e.class],
      style: [{
        bottom: e.location === "bottom" ? 0 : void 0,
        top: e.location === "top" ? 0 : void 0,
        height: e.active ? ye(D.value) : 0,
        "--v-progress-linear-height": ye(D.value),
        ...e.absolute ? r.value : {}
      }, e.style],
      role: "progressbar",
      "aria-hidden": e.active ? "false" : "true",
      "aria-valuemin": "0",
      "aria-valuemax": e.max,
      "aria-valuenow": e.indeterminate ? void 0 : E.value,
      onClick: e.clickable && $
    }, {
      default: () => [e.stream && f("div", {
        key: "stream",
        class: ["v-progress-linear__stream", a.value],
        style: {
          ...d.value,
          [F.value ? "left" : "right"]: ye(-D.value),
          borderTop: `${ye(D.value / 2)} dotted`,
          opacity: parseFloat(e.bufferOpacity),
          top: `calc(50% - ${ye(D.value / 4)})`,
          width: ye(100 - C.value, "%"),
          "--v-progress-linear-stream-to": ye(D.value * (F.value ? 1 : -1))
        }
      }, null), f("div", {
        class: ["v-progress-linear__background", O ? void 0 : u.value],
        style: [c.value, {
          opacity: parseFloat(e.bgOpacity),
          width: e.stream ? 0 : void 0
        }]
      }, null), f("div", {
        class: ["v-progress-linear__buffer", O ? void 0 : m.value],
        style: [v.value, {
          opacity: parseFloat(e.bufferOpacity),
          width: ye(C.value, "%")
        }]
      }, null), f(xo, {
        name: N.value
      }, {
        default: () => [e.indeterminate ? f("div", {
          class: "v-progress-linear__indeterminate"
        }, [["long", "short"].map((k) => f("div", {
          key: k,
          class: ["v-progress-linear__indeterminate", k, O ? void 0 : h.value],
          style: g.value
        }, null))]) : f("div", {
          class: ["v-progress-linear__determinate", O ? void 0 : h.value],
          style: [g.value, {
            width: ye(E.value, "%")
          }]
        }, null)]
      }), n.default && f("div", {
        class: "v-progress-linear__content"
      }, [n.default({
        value: E.value,
        buffer: C.value
      })])]
    })), {};
  }
}), Xr = K({
  loading: [Boolean, String]
}, "loader");
function Jr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn();
  return {
    loaderClasses: y(() => ({
      [`${t}--loading`]: e.loading
    }))
  };
}
function $f(e, t) {
  var o;
  let {
    slots: n
  } = t;
  return f("div", {
    class: `${e.name}__loader`
  }, [((o = n.default) == null ? void 0 : o.call(n, {
    color: e.color,
    isActive: e.active
  })) || f(Tb, {
    absolute: e.absolute,
    active: e.active,
    color: e.color,
    height: "2",
    indeterminate: !0
  }, null)]);
}
const Db = ["static", "relative", "fixed", "absolute", "sticky"], Zr = K({
  position: {
    type: String,
    validator: (
      /* istanbul ignore next */
      (e) => Db.includes(e)
    )
  }
}, "position");
function Qr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn();
  return {
    positionClasses: y(() => e.position ? `${t}--${e.position}` : void 0)
  };
}
function Pb() {
  const e = et("useRoute");
  return y(() => {
    var t;
    return (t = e == null ? void 0 : e.proxy) == null ? void 0 : t.$route;
  });
}
function Ab() {
  var e, t;
  return (t = (e = et("useRouter")) == null ? void 0 : e.proxy) == null ? void 0 : t.$router;
}
function ea(e, t) {
  var c, m;
  const n = Ch("RouterLink"), o = y(() => !!(e.href || e.to)), i = y(() => (o == null ? void 0 : o.value) || gu(t, "click") || gu(e, "click"));
  if (typeof n == "string" || !("useLink" in n)) {
    const v = ce(e, "href");
    return {
      isLink: o,
      isClickable: i,
      href: v,
      linkProps: dt({
        href: v
      })
    };
  }
  const s = y(() => ({
    ...e,
    to: ce(() => e.to || "")
  })), l = n.useLink(s.value), r = y(() => e.to ? l : void 0), a = Pb(), d = y(() => {
    var v, h, g;
    return r.value ? e.exact ? a.value ? ((g = r.value.isExactActive) == null ? void 0 : g.value) && Ws(r.value.route.value.query, a.value.query) : ((h = r.value.isExactActive) == null ? void 0 : h.value) ?? !1 : ((v = r.value.isActive) == null ? void 0 : v.value) ?? !1 : !1;
  }), u = y(() => {
    var v;
    return e.to ? (v = r.value) == null ? void 0 : v.route.value.href : e.href;
  });
  return {
    isLink: o,
    isClickable: i,
    isActive: d,
    route: (c = r.value) == null ? void 0 : c.route,
    navigate: (m = r.value) == null ? void 0 : m.navigate,
    href: u,
    linkProps: dt({
      href: u,
      "aria-current": y(() => d.value ? "page" : void 0)
    })
  };
}
const ta = K({
  href: String,
  replace: Boolean,
  to: [String, Object],
  exact: Boolean
}, "router");
let Sl = !1;
function Ib(e, t) {
  let n = !1, o, i;
  ze && (Et(() => {
    window.addEventListener("popstate", s), o = e == null ? void 0 : e.beforeEach((l, r, a) => {
      Sl ? n ? t(a) : a() : setTimeout(() => n ? t(a) : a()), Sl = !0;
    }), i = e == null ? void 0 : e.afterEach(() => {
      Sl = !1;
    });
  }), Zt(() => {
    window.removeEventListener("popstate", s), o == null || o(), i == null || i();
  }));
  function s(l) {
    var r;
    (r = l.state) != null && r.replaced || (n = !0, setTimeout(() => n = !1));
  }
}
function $b(e, t) {
  Ce(() => {
    var n;
    return (n = e.isActive) == null ? void 0 : n.value;
  }, (n) => {
    e.isLink.value && n && t && Et(() => {
      t(!0);
    });
  }, {
    immediate: !0
  });
}
const tr = Symbol("rippleStop"), Mb = 80;
function Gu(e, t) {
  e.style.transform = t, e.style.webkitTransform = t;
}
function nr(e) {
  return e.constructor.name === "TouchEvent";
}
function Mf(e) {
  return e.constructor.name === "KeyboardEvent";
}
const Fb = function(e, t) {
  var c;
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, o = 0, i = 0;
  if (!Mf(e)) {
    const m = t.getBoundingClientRect(), v = nr(e) ? e.touches[e.touches.length - 1] : e;
    o = v.clientX - m.left, i = v.clientY - m.top;
  }
  let s = 0, l = 0.3;
  (c = t._ripple) != null && c.circle ? (l = 0.15, s = t.clientWidth / 2, s = n.center ? s : s + Math.sqrt((o - s) ** 2 + (i - s) ** 2) / 4) : s = Math.sqrt(t.clientWidth ** 2 + t.clientHeight ** 2) / 2;
  const r = `${(t.clientWidth - s * 2) / 2}px`, a = `${(t.clientHeight - s * 2) / 2}px`, d = n.center ? r : `${o - s}px`, u = n.center ? a : `${i - s}px`;
  return {
    radius: s,
    scale: l,
    x: d,
    y: u,
    centerX: r,
    centerY: a
  };
}, Vs = {
  /* eslint-disable max-statements */
  show(e, t) {
    var v;
    let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    if (!((v = t == null ? void 0 : t._ripple) != null && v.enabled))
      return;
    const o = document.createElement("span"), i = document.createElement("span");
    o.appendChild(i), o.className = "v-ripple__container", n.class && (o.className += ` ${n.class}`);
    const {
      radius: s,
      scale: l,
      x: r,
      y: a,
      centerX: d,
      centerY: u
    } = Fb(e, t, n), c = `${s * 2}px`;
    i.className = "v-ripple__animation", i.style.width = c, i.style.height = c, t.appendChild(o);
    const m = window.getComputedStyle(t);
    m && m.position === "static" && (t.style.position = "relative", t.dataset.previousPosition = "static"), i.classList.add("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--visible"), Gu(i, `translate(${r}, ${a}) scale3d(${l},${l},${l})`), i.dataset.activated = String(performance.now()), setTimeout(() => {
      i.classList.remove("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--in"), Gu(i, `translate(${d}, ${u}) scale3d(1,1,1)`);
    }, 0);
  },
  hide(e) {
    var s;
    if (!((s = e == null ? void 0 : e._ripple) != null && s.enabled)) return;
    const t = e.getElementsByClassName("v-ripple__animation");
    if (t.length === 0) return;
    const n = t[t.length - 1];
    if (n.dataset.isHiding) return;
    n.dataset.isHiding = "true";
    const o = performance.now() - Number(n.dataset.activated), i = Math.max(250 - o, 0);
    setTimeout(() => {
      n.classList.remove("v-ripple__animation--in"), n.classList.add("v-ripple__animation--out"), setTimeout(() => {
        var r;
        e.getElementsByClassName("v-ripple__animation").length === 1 && e.dataset.previousPosition && (e.style.position = e.dataset.previousPosition, delete e.dataset.previousPosition), ((r = n.parentNode) == null ? void 0 : r.parentNode) === e && e.removeChild(n.parentNode);
      }, 300);
    }, i);
  }
};
function Ff(e) {
  return typeof e > "u" || !!e;
}
function wi(e) {
  const t = {}, n = e.currentTarget;
  if (!(!(n != null && n._ripple) || n._ripple.touched || e[tr])) {
    if (e[tr] = !0, nr(e))
      n._ripple.touched = !0, n._ripple.isTouch = !0;
    else if (n._ripple.isTouch) return;
    if (t.center = n._ripple.centered || Mf(e), n._ripple.class && (t.class = n._ripple.class), nr(e)) {
      if (n._ripple.showTimerCommit) return;
      n._ripple.showTimerCommit = () => {
        Vs.show(e, n, t);
      }, n._ripple.showTimer = window.setTimeout(() => {
        var o;
        (o = n == null ? void 0 : n._ripple) != null && o.showTimerCommit && (n._ripple.showTimerCommit(), n._ripple.showTimerCommit = null);
      }, Mb);
    } else
      Vs.show(e, n, t);
  }
}
function Yu(e) {
  e[tr] = !0;
}
function At(e) {
  const t = e.currentTarget;
  if (t != null && t._ripple) {
    if (window.clearTimeout(t._ripple.showTimer), e.type === "touchend" && t._ripple.showTimerCommit) {
      t._ripple.showTimerCommit(), t._ripple.showTimerCommit = null, t._ripple.showTimer = window.setTimeout(() => {
        At(e);
      });
      return;
    }
    window.setTimeout(() => {
      t._ripple && (t._ripple.touched = !1);
    }), Vs.hide(t);
  }
}
function Lf(e) {
  const t = e.currentTarget;
  t != null && t._ripple && (t._ripple.showTimerCommit && (t._ripple.showTimerCommit = null), window.clearTimeout(t._ripple.showTimer));
}
let Si = !1;
function Bf(e) {
  !Si && (e.keyCode === fu.enter || e.keyCode === fu.space) && (Si = !0, wi(e));
}
function Rf(e) {
  Si = !1, At(e);
}
function Hf(e) {
  Si && (Si = !1, At(e));
}
function jf(e, t, n) {
  const {
    value: o,
    modifiers: i
  } = t, s = Ff(o);
  if (s || Vs.hide(e), e._ripple = e._ripple ?? {}, e._ripple.enabled = s, e._ripple.centered = i.center, e._ripple.circle = i.circle, Kd(o) && o.class && (e._ripple.class = o.class), s && !n) {
    if (i.stop) {
      e.addEventListener("touchstart", Yu, {
        passive: !0
      }), e.addEventListener("mousedown", Yu);
      return;
    }
    e.addEventListener("touchstart", wi, {
      passive: !0
    }), e.addEventListener("touchend", At, {
      passive: !0
    }), e.addEventListener("touchmove", Lf, {
      passive: !0
    }), e.addEventListener("touchcancel", At), e.addEventListener("mousedown", wi), e.addEventListener("mouseup", At), e.addEventListener("mouseleave", At), e.addEventListener("keydown", Bf), e.addEventListener("keyup", Rf), e.addEventListener("blur", Hf), e.addEventListener("dragstart", At, {
      passive: !0
    });
  } else !s && n && zf(e);
}
function zf(e) {
  e.removeEventListener("mousedown", wi), e.removeEventListener("touchstart", wi), e.removeEventListener("touchend", At), e.removeEventListener("touchmove", Lf), e.removeEventListener("touchcancel", At), e.removeEventListener("mouseup", At), e.removeEventListener("mouseleave", At), e.removeEventListener("keydown", Bf), e.removeEventListener("keyup", Rf), e.removeEventListener("dragstart", At), e.removeEventListener("blur", Hf);
}
function Lb(e, t) {
  jf(e, t, !1);
}
function Bb(e) {
  delete e._ripple, zf(e);
}
function Rb(e, t) {
  if (t.value === t.oldValue)
    return;
  const n = Ff(t.oldValue);
  jf(e, t, n);
}
const el = {
  mounted: Lb,
  unmounted: Bb,
  updated: Rb
}, Wf = K({
  active: {
    type: Boolean,
    default: void 0
  },
  activeColor: String,
  baseColor: String,
  symbol: {
    type: null,
    default: qr
  },
  flat: Boolean,
  icon: [Boolean, String, Function, Object],
  prependIcon: Ye,
  appendIcon: Ye,
  block: Boolean,
  readonly: Boolean,
  slim: Boolean,
  stacked: Boolean,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  text: String,
  ...to(),
  ...xe(),
  ...Qt(),
  ...Mn(),
  ...Ln(),
  ...Tf(),
  ...Xr(),
  ...Mi(),
  ...Zr(),
  ...Vt(),
  ...ta(),
  ...Js(),
  ...Ke({
    tag: "button"
  }),
  ...ot(),
  ...Do({
    variant: "elevated"
  })
}, "VBtn"), fe = ve()({
  name: "VBtn",
  props: Wf(),
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
    } = vt(e), {
      borderClasses: s
    } = no(e), {
      densityClasses: l
    } = pn(e), {
      dimensionStyles: r
    } = Fn(e), {
      elevationClasses: a
    } = Bn(e), {
      loaderClasses: d
    } = Jr(e), {
      locationStyles: u
    } = Fi(e), {
      positionClasses: c
    } = Qr(e), {
      roundedClasses: m
    } = Ot(e), {
      sizeClasses: v,
      sizeStyles: h
    } = Zs(e), g = Df(e, e.symbol, !1), _ = ea(e, n), x = y(() => {
      var M;
      return e.active !== void 0 ? e.active : _.isLink.value ? (M = _.isActive) == null ? void 0 : M.value : g == null ? void 0 : g.isSelected.value;
    }), V = y(() => x.value ? e.activeColor ?? e.color : e.color), A = y(() => {
      var k, I;
      return {
        color: (g == null ? void 0 : g.isSelected.value) && (!_.isLink.value || ((k = _.isActive) == null ? void 0 : k.value)) || !g || ((I = _.isActive) == null ? void 0 : I.value) ? V.value ?? e.baseColor : e.baseColor,
        variant: e.variant
      };
    }), {
      colorClasses: D,
      colorStyles: C,
      variantClasses: E
    } = $i(A), F = y(() => (g == null ? void 0 : g.disabled.value) || e.disabled), N = y(() => e.variant === "elevated" && !(e.disabled || e.flat || e.border)), O = y(() => {
      if (!(e.value === void 0 || typeof e.value == "symbol"))
        return Object(e.value) === e.value ? JSON.stringify(e.value, null, 0) : e.value;
    });
    function $(M) {
      var k;
      F.value || _.isLink.value && (M.metaKey || M.ctrlKey || M.shiftKey || M.button !== 0 || n.target === "_blank") || ((k = _.navigate) == null || k.call(_, M), g == null || g.toggle());
    }
    return $b(_, g == null ? void 0 : g.select), _e(() => {
      const M = _.isLink.value ? "a" : e.tag, k = !!(e.prependIcon || o.prepend), I = !!(e.appendIcon || o.append), L = !!(e.icon && e.icon !== !0);
      return yt(f(M, Oe({
        type: M === "a" ? void 0 : "button",
        class: ["v-btn", g == null ? void 0 : g.selectedClass.value, {
          "v-btn--active": x.value,
          "v-btn--block": e.block,
          "v-btn--disabled": F.value,
          "v-btn--elevated": N.value,
          "v-btn--flat": e.flat,
          "v-btn--icon": !!e.icon,
          "v-btn--loading": e.loading,
          "v-btn--readonly": e.readonly,
          "v-btn--slim": e.slim,
          "v-btn--stacked": e.stacked
        }, i.value, s.value, D.value, l.value, a.value, d.value, c.value, m.value, v.value, E.value, e.class],
        style: [C.value, r.value, u.value, h.value, e.style],
        "aria-busy": e.loading ? !0 : void 0,
        disabled: F.value || void 0,
        tabindex: e.loading || e.readonly ? -1 : void 0,
        onClick: $,
        value: O.value
      }, _.linkProps), {
        default: () => {
          var J;
          return [Ii(!0, "v-btn"), !e.icon && k && f("span", {
            key: "prepend",
            class: "v-btn__prepend"
          }, [o.prepend ? f(mt, {
            key: "prepend-defaults",
            disabled: !e.prependIcon,
            defaults: {
              VIcon: {
                icon: e.prependIcon
              }
            }
          }, o.prepend) : f(Me, {
            key: "prepend-icon",
            icon: e.prependIcon
          }, null)]), f("span", {
            class: "v-btn__content",
            "data-no-activator": ""
          }, [!o.default && L ? f(Me, {
            key: "content-icon",
            icon: e.icon
          }, null) : f(mt, {
            key: "content-defaults",
            disabled: !L,
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
          })]), !e.icon && I && f("span", {
            key: "append",
            class: "v-btn__append"
          }, [o.append ? f(mt, {
            key: "append-defaults",
            disabled: !e.appendIcon,
            defaults: {
              VIcon: {
                icon: e.appendIcon
              }
            }
          }, o.append) : f(Me, {
            key: "append-icon",
            icon: e.appendIcon
          }, null)]), !!e.loading && f("span", {
            key: "loader",
            class: "v-btn__loader"
          }, [((J = o.loader) == null ? void 0 : J.call(o)) ?? f(If, {
            color: typeof e.loading == "boolean" ? void 0 : e.loading,
            indeterminate: !0,
            width: "2"
          }, null)])];
        }
      }), [[el, !F.value && e.ripple, "", {
        center: !!e.icon
      }]]);
    }), {
      group: g
    };
  }
}), zo = ve()({
  name: "VCardActions",
  props: xe(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return To({
      VBtn: {
        slim: !0,
        variant: "text"
      }
    }), _e(() => {
      var o;
      return f("div", {
        class: ["v-card-actions", e.class],
        style: e.style
      }, [(o = n.default) == null ? void 0 : o.call(n)]);
    }), {};
  }
}), Hb = K({
  opacity: [Number, String],
  ...xe(),
  ...Ke()
}, "VCardSubtitle"), jb = ve()({
  name: "VCardSubtitle",
  props: Hb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => f(e.tag, {
      class: ["v-card-subtitle", e.class],
      style: [{
        "--v-card-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), vo = Ks("v-card-title"), zb = K({
  appendAvatar: String,
  appendIcon: Ye,
  prependAvatar: String,
  prependIcon: Ye,
  subtitle: [String, Number],
  title: [String, Number],
  ...xe(),
  ...Qt()
}, "VCardItem"), Uf = ve()({
  name: "VCardItem",
  props: zb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => {
      var d;
      const o = !!(e.prependAvatar || e.prependIcon), i = !!(o || n.prepend), s = !!(e.appendAvatar || e.appendIcon), l = !!(s || n.append), r = !!(e.title != null || n.title), a = !!(e.subtitle != null || n.subtitle);
      return f("div", {
        class: ["v-card-item", e.class],
        style: e.style
      }, [i && f("div", {
        key: "prepend",
        class: "v-card-item__prepend"
      }, [n.prepend ? f(mt, {
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
      }, n.prepend) : f(Ne, null, [e.prependAvatar && f(cn, {
        key: "prepend-avatar",
        density: e.density,
        image: e.prependAvatar
      }, null), e.prependIcon && f(Me, {
        key: "prepend-icon",
        density: e.density,
        icon: e.prependIcon
      }, null)])]), f("div", {
        class: "v-card-item__content"
      }, [r && f(vo, {
        key: "title"
      }, {
        default: () => {
          var u;
          return [((u = n.title) == null ? void 0 : u.call(n)) ?? e.title];
        }
      }), a && f(jb, {
        key: "subtitle"
      }, {
        default: () => {
          var u;
          return [((u = n.subtitle) == null ? void 0 : u.call(n)) ?? e.subtitle];
        }
      }), (d = n.default) == null ? void 0 : d.call(n)]), l && f("div", {
        key: "append",
        class: "v-card-item__append"
      }, [n.append ? f(mt, {
        key: "append-defaults",
        disabled: !s,
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
      }, n.append) : f(Ne, null, [e.appendIcon && f(Me, {
        key: "append-icon",
        density: e.density,
        icon: e.appendIcon
      }, null), e.appendAvatar && f(cn, {
        key: "append-avatar",
        density: e.density,
        image: e.appendAvatar
      }, null)])])]);
    }), {};
  }
}), Wb = K({
  opacity: [Number, String],
  ...xe(),
  ...Ke()
}, "VCardText"), Xn = ve()({
  name: "VCardText",
  props: Wb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => f(e.tag, {
      class: ["v-card-text", e.class],
      style: [{
        "--v-card-text-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), Ub = K({
  appendAvatar: String,
  appendIcon: Ye,
  disabled: Boolean,
  flat: Boolean,
  hover: Boolean,
  image: String,
  link: {
    type: Boolean,
    default: void 0
  },
  prependAvatar: String,
  prependIcon: Ye,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  subtitle: [String, Number],
  text: [String, Number],
  title: [String, Number],
  ...to(),
  ...xe(),
  ...Qt(),
  ...Mn(),
  ...Ln(),
  ...Xr(),
  ...Mi(),
  ...Zr(),
  ...Vt(),
  ...ta(),
  ...Ke(),
  ...ot(),
  ...Do({
    variant: "elevated"
  })
}, "VCard"), Pt = ve()({
  name: "VCard",
  directives: {
    Ripple: el
  },
  props: Ub(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      themeClasses: i
    } = vt(e), {
      borderClasses: s
    } = no(e), {
      colorClasses: l,
      colorStyles: r,
      variantClasses: a
    } = $i(e), {
      densityClasses: d
    } = pn(e), {
      dimensionStyles: u
    } = Fn(e), {
      elevationClasses: c
    } = Bn(e), {
      loaderClasses: m
    } = Jr(e), {
      locationStyles: v
    } = Fi(e), {
      positionClasses: h
    } = Qr(e), {
      roundedClasses: g
    } = Ot(e), _ = ea(e, n), x = y(() => e.link !== !1 && _.isLink.value), V = y(() => !e.disabled && e.link !== !1 && (e.link || _.isClickable.value));
    return _e(() => {
      const A = x.value ? "a" : e.tag, D = !!(o.title || e.title != null), C = !!(o.subtitle || e.subtitle != null), E = D || C, F = !!(o.append || e.appendAvatar || e.appendIcon), N = !!(o.prepend || e.prependAvatar || e.prependIcon), O = !!(o.image || e.image), $ = E || N || F, M = !!(o.text || e.text != null);
      return yt(f(A, Oe({
        class: ["v-card", {
          "v-card--disabled": e.disabled,
          "v-card--flat": e.flat,
          "v-card--hover": e.hover && !(e.disabled || e.flat),
          "v-card--link": V.value
        }, i.value, s.value, l.value, d.value, c.value, m.value, h.value, g.value, a.value, e.class],
        style: [r.value, u.value, v.value, e.style],
        onClick: V.value && _.navigate,
        tabindex: e.disabled ? -1 : void 0
      }, _.linkProps), {
        default: () => {
          var k;
          return [O && f("div", {
            key: "image",
            class: "v-card__image"
          }, [o.image ? f(mt, {
            key: "image-defaults",
            disabled: !e.image,
            defaults: {
              VImg: {
                cover: !0,
                src: e.image
              }
            }
          }, o.image) : f(Gr, {
            key: "image-img",
            cover: !0,
            src: e.image
          }, null)]), f($f, {
            name: "v-card",
            active: !!e.loading,
            color: typeof e.loading == "boolean" ? void 0 : e.loading
          }, {
            default: o.loader
          }), $ && f(Uf, {
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
          }), M && f(Xn, {
            key: "text"
          }, {
            default: () => {
              var I;
              return [((I = o.text) == null ? void 0 : I.call(o)) ?? e.text];
            }
          }), (k = o.default) == null ? void 0 : k.call(o), o.actions && f(zo, null, {
            default: o.actions
          }), Ii(V.value, "v-card")];
        }
      }), [[Vo("ripple"), V.value && e.ripple]]);
    }), {};
  }
}), Kb = K({
  color: String,
  inset: Boolean,
  length: [Number, String],
  opacity: [Number, String],
  thickness: [Number, String],
  vertical: Boolean,
  ...xe(),
  ...ot()
}, "VDivider"), vn = ve()({
  name: "VDivider",
  props: Kb(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      themeClasses: i
    } = vt(e), {
      textColorClasses: s,
      textColorStyles: l
    } = Ut(ce(e, "color")), r = y(() => {
      const a = {};
      return e.length && (a[e.vertical ? "height" : "width"] = ye(e.length)), e.thickness && (a[e.vertical ? "borderRightWidth" : "borderTopWidth"] = ye(e.thickness)), a;
    });
    return _e(() => {
      const a = f("hr", {
        class: [{
          "v-divider": !0,
          "v-divider--inset": e.inset,
          "v-divider--vertical": e.vertical
        }, i.value, s.value, e.class],
        style: [r.value, l.value, {
          "--v-border-opacity": e.opacity
        }, e.style],
        "aria-orientation": !n.role || n.role === "separator" ? e.vertical ? "vertical" : "horizontal" : void 0,
        role: `${n.role || "separator"}`
      }, null);
      return o.default ? f("div", {
        class: ["v-divider__wrapper", {
          "v-divider__wrapper--vertical": e.vertical,
          "v-divider__wrapper--inset": e.inset
        }]
      }, [a, f("div", {
        class: "v-divider__content"
      }, [o.default()]), a]) : a;
    }), {};
  }
}), Kf = qs.reduce((e, t) => (e[t] = {
  type: [Boolean, String, Number],
  default: !1
}, e), {}), Gf = qs.reduce((e, t) => {
  const n = "offset" + zt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), Yf = qs.reduce((e, t) => {
  const n = "order" + zt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), qu = {
  col: Object.keys(Kf),
  offset: Object.keys(Gf),
  order: Object.keys(Yf)
};
function Gb(e, t, n) {
  let o = e;
  if (!(n == null || n === !1)) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return e === "col" && (o = "v-" + o), e === "col" && (n === "" || n === !0) || (o += `-${n}`), o.toLowerCase();
  }
}
const Yb = ["auto", "start", "end", "center", "baseline", "stretch"], qb = K({
  cols: {
    type: [Boolean, String, Number],
    default: !1
  },
  ...Kf,
  offset: {
    type: [String, Number],
    default: null
  },
  ...Gf,
  order: {
    type: [String, Number],
    default: null
  },
  ...Yf,
  alignSelf: {
    type: String,
    default: null,
    validator: (e) => Yb.includes(e)
  },
  ...xe(),
  ...Ke()
}, "VCol"), Pe = ve()({
  name: "VCol",
  props: qb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = y(() => {
      const i = [];
      let s;
      for (s in qu)
        qu[s].forEach((r) => {
          const a = e[r], d = Gb(s, r, a);
          d && i.push(d);
        });
      const l = i.some((r) => r.startsWith("v-col-"));
      return i.push({
        // Default to .v-col if no other col-{bp}-* classes generated nor `cols` specified.
        "v-col": !l || !e.cols,
        [`v-col-${e.cols}`]: e.cols,
        [`offset-${e.offset}`]: e.offset,
        [`order-${e.order}`]: e.order,
        [`align-self-${e.alignSelf}`]: e.alignSelf
      }), i;
    });
    return () => {
      var i;
      return Qn(e.tag, {
        class: [o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), na = ["start", "end", "center"], qf = ["space-between", "space-around", "space-evenly"];
function oa(e, t) {
  return qs.reduce((n, o) => {
    const i = e + zt(o);
    return n[i] = t(), n;
  }, {});
}
const Xb = [...na, "baseline", "stretch"], Xf = (e) => Xb.includes(e), Jf = oa("align", () => ({
  type: String,
  default: null,
  validator: Xf
})), Jb = [...na, ...qf], Zf = (e) => Jb.includes(e), Qf = oa("justify", () => ({
  type: String,
  default: null,
  validator: Zf
})), Zb = [...na, ...qf, "stretch"], em = (e) => Zb.includes(e), tm = oa("alignContent", () => ({
  type: String,
  default: null,
  validator: em
})), Xu = {
  align: Object.keys(Jf),
  justify: Object.keys(Qf),
  alignContent: Object.keys(tm)
}, Qb = {
  align: "align",
  justify: "justify",
  alignContent: "align-content"
};
function e_(e, t, n) {
  let o = Qb[e];
  if (n != null) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return o += `-${n}`, o.toLowerCase();
  }
}
const t_ = K({
  dense: Boolean,
  noGutters: Boolean,
  align: {
    type: String,
    default: null,
    validator: Xf
  },
  ...Jf,
  justify: {
    type: String,
    default: null,
    validator: Zf
  },
  ...Qf,
  alignContent: {
    type: String,
    default: null,
    validator: em
  },
  ...tm,
  ...xe(),
  ...Ke()
}, "VRow"), Dt = ve()({
  name: "VRow",
  props: t_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = y(() => {
      const i = [];
      let s;
      for (s in Xu)
        Xu[s].forEach((l) => {
          const r = e[l], a = e_(s, l, r);
          a && i.push(a);
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
      return Qn(e.tag, {
        class: ["v-row", o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), or = Ks("v-spacer", "div", "VSpacer"), n_ = K({
  disabled: Boolean,
  group: Boolean,
  hideOnLeave: Boolean,
  leaveAbsolute: Boolean,
  mode: String,
  origin: String
}, "transition");
function Lt(e, t, n) {
  return ve()({
    name: e,
    props: n_({
      mode: n,
      origin: t
    }),
    setup(o, i) {
      let {
        slots: s
      } = i;
      const l = {
        onBeforeEnter(r) {
          o.origin && (r.style.transformOrigin = o.origin);
        },
        onLeave(r) {
          if (o.leaveAbsolute) {
            const {
              offsetTop: a,
              offsetLeft: d,
              offsetWidth: u,
              offsetHeight: c
            } = r;
            r._transitionInitialStyles = {
              position: r.style.position,
              top: r.style.top,
              left: r.style.left,
              width: r.style.width,
              height: r.style.height
            }, r.style.position = "absolute", r.style.top = `${a}px`, r.style.left = `${d}px`, r.style.width = `${u}px`, r.style.height = `${c}px`;
          }
          o.hideOnLeave && r.style.setProperty("display", "none", "important");
        },
        onAfterLeave(r) {
          if (o.leaveAbsolute && (r != null && r._transitionInitialStyles)) {
            const {
              position: a,
              top: d,
              left: u,
              width: c,
              height: m
            } = r._transitionInitialStyles;
            delete r._transitionInitialStyles, r.style.position = a || "", r.style.top = d || "", r.style.left = u || "", r.style.width = c || "", r.style.height = m || "";
          }
        }
      };
      return () => {
        const r = o.group ? $r : xo;
        return Qn(r, {
          name: o.disabled ? "" : e,
          css: !o.disabled,
          ...o.group ? void 0 : {
            mode: o.mode
          },
          ...o.disabled ? {} : l
        }, s.default);
      };
    }
  });
}
function nm(e, t) {
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
    setup(o, i) {
      let {
        slots: s
      } = i;
      const l = o.group ? $r : xo;
      return () => Qn(l, {
        name: o.disabled ? "" : e,
        css: !o.disabled,
        // mode: props.mode, // TODO: vuejs/vue-next#3104
        ...o.disabled ? {} : t
      }, s.default);
    }
  });
}
function om() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  const n = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1) ? "width" : "height", o = ft(`offset-${n}`);
  return {
    onBeforeEnter(l) {
      l._parent = l.parentNode, l._initialStyle = {
        transition: l.style.transition,
        overflow: l.style.overflow,
        [n]: l.style[n]
      };
    },
    onEnter(l) {
      const r = l._initialStyle;
      l.style.setProperty("transition", "none", "important"), l.style.overflow = "hidden";
      const a = `${l[o]}px`;
      l.style[n] = "0", l.offsetHeight, l.style.transition = r.transition, e && l._parent && l._parent.classList.add(e), requestAnimationFrame(() => {
        l.style[n] = a;
      });
    },
    onAfterEnter: s,
    onEnterCancelled: s,
    onLeave(l) {
      l._initialStyle = {
        transition: "",
        overflow: l.style.overflow,
        [n]: l.style[n]
      }, l.style.overflow = "hidden", l.style[n] = `${l[o]}px`, l.offsetHeight, requestAnimationFrame(() => l.style[n] = "0");
    },
    onAfterLeave: i,
    onLeaveCancelled: i
  };
  function i(l) {
    e && l._parent && l._parent.classList.remove(e), s(l);
  }
  function s(l) {
    const r = l._initialStyle[n];
    l.style.overflow = l._initialStyle.overflow, r != null && (l.style[n] = r), delete l._initialStyle;
  }
}
const o_ = K({
  target: [Object, Array]
}, "v-dialog-transition"), i_ = ve()({
  name: "VDialogTransition",
  props: o_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = {
      onBeforeEnter(i) {
        i.style.pointerEvents = "none", i.style.visibility = "hidden";
      },
      async onEnter(i, s) {
        var m;
        await new Promise((v) => requestAnimationFrame(v)), await new Promise((v) => requestAnimationFrame(v)), i.style.visibility = "";
        const {
          x: l,
          y: r,
          sx: a,
          sy: d,
          speed: u
        } = Zu(e.target, i), c = mo(i, [{
          transform: `translate(${l}px, ${r}px) scale(${a}, ${d})`,
          opacity: 0
        }, {}], {
          duration: 225 * u,
          easing: qp
        });
        (m = Ju(i)) == null || m.forEach((v) => {
          mo(v, [{
            opacity: 0
          }, {
            opacity: 0,
            offset: 0.33
          }, {}], {
            duration: 225 * 2 * u,
            easing: bi
          });
        }), c.finished.then(() => s());
      },
      onAfterEnter(i) {
        i.style.removeProperty("pointer-events");
      },
      onBeforeLeave(i) {
        i.style.pointerEvents = "none";
      },
      async onLeave(i, s) {
        var m;
        await new Promise((v) => requestAnimationFrame(v));
        const {
          x: l,
          y: r,
          sx: a,
          sy: d,
          speed: u
        } = Zu(e.target, i);
        mo(i, [{}, {
          transform: `translate(${l}px, ${r}px) scale(${a}, ${d})`,
          opacity: 0
        }], {
          duration: 125 * u,
          easing: Xp
        }).finished.then(() => s()), (m = Ju(i)) == null || m.forEach((v) => {
          mo(v, [{}, {
            opacity: 0,
            offset: 0.2
          }, {
            opacity: 0
          }], {
            duration: 125 * 2 * u,
            easing: bi
          });
        });
      },
      onAfterLeave(i) {
        i.style.removeProperty("pointer-events");
      }
    };
    return () => e.target ? f(xo, Oe({
      name: "dialog-transition"
    }, o, {
      css: !1
    }), n) : f(xo, {
      name: "dialog-transition"
    }, n);
  }
});
function Ju(e) {
  var n;
  const t = (n = e.querySelector(":scope > .v-card, :scope > .v-sheet, :scope > .v-list")) == null ? void 0 : n.children;
  return t && [...t];
}
function Zu(e, t) {
  const n = tf(e), o = Hr(t), [i, s] = getComputedStyle(t).transformOrigin.split(" ").map((x) => parseFloat(x)), [l, r] = getComputedStyle(t).getPropertyValue("--v-overlay-anchor-origin").split(" ");
  let a = n.left + n.width / 2;
  l === "left" || r === "left" ? a -= n.width / 2 : (l === "right" || r === "right") && (a += n.width / 2);
  let d = n.top + n.height / 2;
  l === "top" || r === "top" ? d -= n.height / 2 : (l === "bottom" || r === "bottom") && (d += n.height / 2);
  const u = n.width / o.width, c = n.height / o.height, m = Math.max(1, u, c), v = u / m || 0, h = c / m || 0, g = o.width * o.height / (window.innerWidth * window.innerHeight), _ = g > 0.12 ? Math.min(1.5, (g - 0.12) * 10 + 1) : 1;
  return {
    x: a - (i + o.left),
    y: d - (s + o.top),
    sx: v,
    sy: h,
    speed: _
  };
}
Lt("fab-transition", "center center", "out-in");
Lt("dialog-bottom-transition");
Lt("dialog-top-transition");
const Qu = Lt("fade-transition"), s_ = Lt("scale-transition");
Lt("scroll-x-transition");
Lt("scroll-x-reverse-transition");
Lt("scroll-y-transition");
Lt("scroll-y-reverse-transition");
Lt("slide-x-transition");
Lt("slide-x-reverse-transition");
const im = Lt("slide-y-transition");
Lt("slide-y-reverse-transition");
const sm = nm("expand-transition", om()), l_ = nm("expand-x-transition", om("", !0)), ir = Symbol.for("vuetify:list");
function lm() {
  const e = je(ir, {
    hasPrepend: Se(!1),
    updateHasPrepend: () => null
  }), t = {
    hasPrepend: Se(!1),
    updateHasPrepend: (n) => {
      n && (t.hasPrepend.value = n);
    }
  };
  return bt(ir, t), e;
}
function rm() {
  return je(ir, null);
}
const ia = (e) => {
  const t = {
    activate: (n) => {
      let {
        id: o,
        value: i,
        activated: s
      } = n;
      return o = ue(o), e && !i && s.size === 1 && s.has(o) || (i ? s.add(o) : s.delete(o)), s;
    },
    in: (n, o, i) => {
      let s = /* @__PURE__ */ new Set();
      if (n != null)
        for (const l of wo(n))
          s = t.activate({
            id: l,
            value: !0,
            activated: new Set(s),
            children: o,
            parents: i
          });
      return s;
    },
    out: (n) => Array.from(n)
  };
  return t;
}, am = (e) => {
  const t = ia(e);
  return {
    activate: (o) => {
      let {
        activated: i,
        id: s,
        ...l
      } = o;
      s = ue(s);
      const r = i.has(s) ? /* @__PURE__ */ new Set([s]) : /* @__PURE__ */ new Set();
      return t.activate({
        ...l,
        id: s,
        activated: r
      });
    },
    in: (o, i, s) => {
      let l = /* @__PURE__ */ new Set();
      if (o != null) {
        const r = wo(o);
        r.length && (l = t.in(r.slice(0, 1), i, s));
      }
      return l;
    },
    out: (o, i, s) => t.out(o, i, s)
  };
}, r_ = (e) => {
  const t = ia(e);
  return {
    activate: (o) => {
      let {
        id: i,
        activated: s,
        children: l,
        ...r
      } = o;
      return i = ue(i), l.has(i) ? s : t.activate({
        id: i,
        activated: s,
        children: l,
        ...r
      });
    },
    in: t.in,
    out: t.out
  };
}, a_ = (e) => {
  const t = am(e);
  return {
    activate: (o) => {
      let {
        id: i,
        activated: s,
        children: l,
        ...r
      } = o;
      return i = ue(i), l.has(i) ? s : t.activate({
        id: i,
        activated: s,
        children: l,
        ...r
      });
    },
    in: t.in,
    out: t.out
  };
}, u_ = {
  open: (e) => {
    let {
      id: t,
      value: n,
      opened: o,
      parents: i
    } = e;
    if (n) {
      const s = /* @__PURE__ */ new Set();
      s.add(t);
      let l = i.get(t);
      for (; l != null; )
        s.add(l), l = i.get(l);
      return s;
    } else
      return o.delete(t), o;
  },
  select: () => null
}, um = {
  open: (e) => {
    let {
      id: t,
      value: n,
      opened: o,
      parents: i
    } = e;
    if (n) {
      let s = i.get(t);
      for (o.add(t); s != null && s !== t; )
        o.add(s), s = i.get(s);
      return o;
    } else
      o.delete(t);
    return o;
  },
  select: () => null
}, c_ = {
  open: um.open,
  select: (e) => {
    let {
      id: t,
      value: n,
      opened: o,
      parents: i
    } = e;
    if (!n) return o;
    const s = [];
    let l = i.get(t);
    for (; l != null; )
      s.push(l), l = i.get(l);
    return new Set(s);
  }
}, sa = (e) => {
  const t = {
    select: (n) => {
      let {
        id: o,
        value: i,
        selected: s
      } = n;
      if (o = ue(o), e && !i) {
        const l = Array.from(s.entries()).reduce((r, a) => {
          let [d, u] = a;
          return u === "on" && r.push(d), r;
        }, []);
        if (l.length === 1 && l[0] === o) return s;
      }
      return s.set(o, i ? "on" : "off"), s;
    },
    in: (n, o, i) => {
      let s = /* @__PURE__ */ new Map();
      for (const l of n || [])
        s = t.select({
          id: l,
          value: !0,
          selected: new Map(s),
          children: o,
          parents: i
        });
      return s;
    },
    out: (n) => {
      const o = [];
      for (const [i, s] of n.entries())
        s === "on" && o.push(i);
      return o;
    }
  };
  return t;
}, cm = (e) => {
  const t = sa(e);
  return {
    select: (o) => {
      let {
        selected: i,
        id: s,
        ...l
      } = o;
      s = ue(s);
      const r = i.has(s) ? /* @__PURE__ */ new Map([[s, i.get(s)]]) : /* @__PURE__ */ new Map();
      return t.select({
        ...l,
        id: s,
        selected: r
      });
    },
    in: (o, i, s) => {
      let l = /* @__PURE__ */ new Map();
      return o != null && o.length && (l = t.in(o.slice(0, 1), i, s)), l;
    },
    out: (o, i, s) => t.out(o, i, s)
  };
}, d_ = (e) => {
  const t = sa(e);
  return {
    select: (o) => {
      let {
        id: i,
        selected: s,
        children: l,
        ...r
      } = o;
      return i = ue(i), l.has(i) ? s : t.select({
        id: i,
        selected: s,
        children: l,
        ...r
      });
    },
    in: t.in,
    out: t.out
  };
}, f_ = (e) => {
  const t = cm(e);
  return {
    select: (o) => {
      let {
        id: i,
        selected: s,
        children: l,
        ...r
      } = o;
      return i = ue(i), l.has(i) ? s : t.select({
        id: i,
        selected: s,
        children: l,
        ...r
      });
    },
    in: t.in,
    out: t.out
  };
}, m_ = (e) => {
  const t = {
    select: (n) => {
      let {
        id: o,
        value: i,
        selected: s,
        children: l,
        parents: r
      } = n;
      o = ue(o);
      const a = new Map(s), d = [o];
      for (; d.length; ) {
        const c = d.shift();
        s.set(ue(c), i ? "on" : "off"), l.has(c) && d.push(...l.get(c));
      }
      let u = ue(r.get(o));
      for (; u; ) {
        const c = l.get(u), m = c.every((h) => s.get(ue(h)) === "on"), v = c.every((h) => !s.has(ue(h)) || s.get(ue(h)) === "off");
        s.set(u, m ? "on" : v ? "off" : "indeterminate"), u = ue(r.get(u));
      }
      return e && !i && Array.from(s.entries()).reduce((m, v) => {
        let [h, g] = v;
        return g === "on" && m.push(h), m;
      }, []).length === 0 ? a : s;
    },
    in: (n, o, i) => {
      let s = /* @__PURE__ */ new Map();
      for (const l of n || [])
        s = t.select({
          id: l,
          value: !0,
          selected: new Map(s),
          children: o,
          parents: i
        });
      return s;
    },
    out: (n, o) => {
      const i = [];
      for (const [s, l] of n.entries())
        l === "on" && !o.has(s) && i.push(s);
      return i;
    }
  };
  return t;
}, ki = Symbol.for("vuetify:nested"), dm = {
  id: Se(),
  root: {
    register: () => null,
    unregister: () => null,
    parents: le(/* @__PURE__ */ new Map()),
    children: le(/* @__PURE__ */ new Map()),
    open: () => null,
    openOnSelect: () => null,
    activate: () => null,
    select: () => null,
    activatable: le(!1),
    selectable: le(!1),
    opened: le(/* @__PURE__ */ new Set()),
    activated: le(/* @__PURE__ */ new Set()),
    selected: le(/* @__PURE__ */ new Map()),
    selectedValues: le([]),
    getPath: () => []
  }
}, v_ = K({
  activatable: Boolean,
  selectable: Boolean,
  activeStrategy: [String, Function, Object],
  selectStrategy: [String, Function, Object],
  openStrategy: [String, Object],
  opened: null,
  activated: null,
  selected: null,
  mandatory: Boolean
}, "nested"), h_ = (e) => {
  let t = !1;
  const n = le(/* @__PURE__ */ new Map()), o = le(/* @__PURE__ */ new Map()), i = at(e, "opened", e.opened, (h) => new Set(h), (h) => [...h.values()]), s = y(() => {
    if (typeof e.activeStrategy == "object") return e.activeStrategy;
    if (typeof e.activeStrategy == "function") return e.activeStrategy(e.mandatory);
    switch (e.activeStrategy) {
      case "leaf":
        return r_(e.mandatory);
      case "single-leaf":
        return a_(e.mandatory);
      case "independent":
        return ia(e.mandatory);
      case "single-independent":
      default:
        return am(e.mandatory);
    }
  }), l = y(() => {
    if (typeof e.selectStrategy == "object") return e.selectStrategy;
    if (typeof e.selectStrategy == "function") return e.selectStrategy(e.mandatory);
    switch (e.selectStrategy) {
      case "single-leaf":
        return f_(e.mandatory);
      case "leaf":
        return d_(e.mandatory);
      case "independent":
        return sa(e.mandatory);
      case "single-independent":
        return cm(e.mandatory);
      case "classic":
      default:
        return m_(e.mandatory);
    }
  }), r = y(() => {
    if (typeof e.openStrategy == "object") return e.openStrategy;
    switch (e.openStrategy) {
      case "list":
        return c_;
      case "single":
        return u_;
      case "multiple":
      default:
        return um;
    }
  }), a = at(e, "activated", e.activated, (h) => s.value.in(h, n.value, o.value), (h) => s.value.out(h, n.value, o.value)), d = at(e, "selected", e.selected, (h) => l.value.in(h, n.value, o.value), (h) => l.value.out(h, n.value, o.value));
  xt(() => {
    t = !0;
  });
  function u(h) {
    const g = [];
    let _ = h;
    for (; _ != null; )
      g.unshift(_), _ = o.value.get(_);
    return g;
  }
  const c = et("nested"), m = /* @__PURE__ */ new Set(), v = {
    id: Se(),
    root: {
      opened: i,
      activatable: ce(e, "activatable"),
      selectable: ce(e, "selectable"),
      activated: a,
      selected: d,
      selectedValues: y(() => {
        const h = [];
        for (const [g, _] of d.value.entries())
          _ === "on" && h.push(g);
        return h;
      }),
      register: (h, g, _) => {
        if (m.has(h)) {
          const x = u(h).map(String).join(" -> "), V = u(g).concat(h).map(String).join(" -> ");
          ws(`Multiple nodes with the same ID
	${x}
	${V}`);
          return;
        } else
          m.add(h);
        g && h !== g && o.value.set(h, g), _ && n.value.set(h, []), g != null && n.value.set(g, [...n.value.get(g) || [], h]);
      },
      unregister: (h) => {
        if (t) return;
        m.delete(h), n.value.delete(h);
        const g = o.value.get(h);
        if (g) {
          const _ = n.value.get(g) ?? [];
          n.value.set(g, _.filter((x) => x !== h));
        }
        o.value.delete(h);
      },
      open: (h, g, _) => {
        c.emit("click:open", {
          id: h,
          value: g,
          path: u(h),
          event: _
        });
        const x = r.value.open({
          id: h,
          value: g,
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        x && (i.value = x);
      },
      openOnSelect: (h, g, _) => {
        const x = r.value.select({
          id: h,
          value: g,
          selected: new Map(d.value),
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        x && (i.value = x);
      },
      select: (h, g, _) => {
        c.emit("click:select", {
          id: h,
          value: g,
          path: u(h),
          event: _
        });
        const x = l.value.select({
          id: h,
          value: g,
          selected: new Map(d.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        x && (d.value = x), v.root.openOnSelect(h, g, _);
      },
      activate: (h, g, _) => {
        if (!e.activatable)
          return v.root.select(h, !0, _);
        c.emit("click:activate", {
          id: h,
          value: g,
          path: u(h),
          event: _
        });
        const x = s.value.activate({
          id: h,
          value: g,
          activated: new Set(a.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        x && (a.value = x);
      },
      children: n,
      parents: o,
      getPath: u
    }
  };
  return bt(ki, v), v.root;
}, fm = (e, t) => {
  const n = je(ki, dm), o = Symbol(eo()), i = y(() => e.value !== void 0 ? e.value : o), s = {
    ...n,
    id: i,
    open: (l, r) => n.root.open(i.value, l, r),
    openOnSelect: (l, r) => n.root.openOnSelect(i.value, l, r),
    isOpen: y(() => n.root.opened.value.has(i.value)),
    parent: y(() => n.root.parents.value.get(i.value)),
    activate: (l, r) => n.root.activate(i.value, l, r),
    isActivated: y(() => n.root.activated.value.has(ue(i.value))),
    select: (l, r) => n.root.select(i.value, l, r),
    isSelected: y(() => n.root.selected.value.get(ue(i.value)) === "on"),
    isIndeterminate: y(() => n.root.selected.value.get(i.value) === "indeterminate"),
    isLeaf: y(() => !n.root.children.value.get(i.value)),
    isGroupActivator: n.isGroupActivator
  };
  return !n.isGroupActivator && n.root.register(i.value, n.id.value, t), xt(() => {
    !n.isGroupActivator && n.root.unregister(i.value);
  }), t && bt(ki, s), s;
}, g_ = () => {
  const e = je(ki, dm);
  bt(ki, {
    ...e,
    isGroupActivator: !0
  });
};
function Li() {
  const e = Se(!1);
  return Zn(() => {
    window.requestAnimationFrame(() => {
      e.value = !0;
    });
  }), {
    ssrBootStyles: y(() => e.value ? void 0 : {
      transition: "none !important"
    }),
    isBooted: Vi(e)
  };
}
const p_ = qo({
  name: "VListGroupActivator",
  setup(e, t) {
    let {
      slots: n
    } = t;
    return g_(), () => {
      var o;
      return (o = n.default) == null ? void 0 : o.call(n);
    };
  }
}), y_ = K({
  /* @deprecated */
  activeColor: String,
  baseColor: String,
  color: String,
  collapseIcon: {
    type: Ye,
    default: "$collapse"
  },
  expandIcon: {
    type: Ye,
    default: "$expand"
  },
  prependIcon: Ye,
  appendIcon: Ye,
  fluid: Boolean,
  subgroup: Boolean,
  title: String,
  value: null,
  ...xe(),
  ...Ke()
}, "VListGroup"), Os = ve()({
  name: "VListGroup",
  props: y_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isOpen: o,
      open: i,
      id: s
    } = fm(ce(e, "value"), !0), l = y(() => `v-list-group--id-${String(s.value)}`), r = rm(), {
      isBooted: a
    } = Li();
    function d(v) {
      v.stopPropagation(), i(!o.value, v);
    }
    const u = y(() => ({
      onClick: d,
      class: "v-list-group__header",
      id: l.value
    })), c = y(() => o.value ? e.collapseIcon : e.expandIcon), m = y(() => ({
      VListItem: {
        active: o.value,
        activeColor: e.activeColor,
        baseColor: e.baseColor,
        color: e.color,
        prependIcon: e.prependIcon || e.subgroup && c.value,
        appendIcon: e.appendIcon || !e.subgroup && c.value,
        title: e.title,
        value: e.value
      }
    }));
    return _e(() => f(e.tag, {
      class: ["v-list-group", {
        "v-list-group--prepend": r == null ? void 0 : r.hasPrepend.value,
        "v-list-group--fluid": e.fluid,
        "v-list-group--subgroup": e.subgroup,
        "v-list-group--open": o.value
      }, e.class],
      style: e.style
    }, {
      default: () => [n.activator && f(mt, {
        defaults: m.value
      }, {
        default: () => [f(p_, null, {
          default: () => [n.activator({
            props: u.value,
            isOpen: o.value
          })]
        })]
      }), f(un, {
        transition: {
          component: sm
        },
        disabled: !a.value
      }, {
        default: () => {
          var v;
          return [yt(f("div", {
            class: "v-list-group__items",
            role: "group",
            "aria-labelledby": l.value
          }, [(v = n.default) == null ? void 0 : v.call(n)]), [[In, o.value]])];
        }
      })]
    })), {
      isOpen: o
    };
  }
}), b_ = K({
  opacity: [Number, String],
  ...xe(),
  ...Ke()
}, "VListItemSubtitle"), la = ve()({
  name: "VListItemSubtitle",
  props: b_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => f(e.tag, {
      class: ["v-list-item-subtitle", e.class],
      style: [{
        "--v-list-item-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), tl = Ks("v-list-item-title"), __ = K({
  active: {
    type: Boolean,
    default: void 0
  },
  activeClass: String,
  /* @deprecated */
  activeColor: String,
  appendAvatar: String,
  appendIcon: Ye,
  baseColor: String,
  disabled: Boolean,
  lines: [Boolean, String],
  link: {
    type: Boolean,
    default: void 0
  },
  nav: Boolean,
  prependAvatar: String,
  prependIcon: Ye,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  slim: Boolean,
  subtitle: [String, Number],
  title: [String, Number],
  value: null,
  onClick: jt(),
  onClickOnce: jt(),
  ...to(),
  ...xe(),
  ...Qt(),
  ...Mn(),
  ...Ln(),
  ...Vt(),
  ...ta(),
  ...Ke(),
  ...ot(),
  ...Do({
    variant: "text"
  })
}, "VListItem"), Re = ve()({
  name: "VListItem",
  directives: {
    Ripple: el
  },
  props: __(),
  emits: {
    click: (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o,
      emit: i
    } = t;
    const s = ea(e, n), l = y(() => e.value === void 0 ? s.href.value : e.value), {
      activate: r,
      isActivated: a,
      select: d,
      isOpen: u,
      isSelected: c,
      isIndeterminate: m,
      isGroupActivator: v,
      root: h,
      parent: g,
      openOnSelect: _,
      id: x
    } = fm(l, !1), V = rm(), A = y(() => {
      var ee;
      return e.active !== !1 && (e.active || ((ee = s.isActive) == null ? void 0 : ee.value) || (h.activatable.value ? a.value : c.value));
    }), D = y(() => e.link !== !1 && s.isLink.value), C = y(() => !e.disabled && e.link !== !1 && (e.link || s.isClickable.value || !!V && (h.selectable.value || h.activatable.value || e.value != null))), E = y(() => e.rounded || e.nav), F = y(() => e.color ?? e.activeColor), N = y(() => ({
      color: A.value ? F.value ?? e.baseColor : e.baseColor,
      variant: e.variant
    }));
    Ce(() => {
      var ee;
      return (ee = s.isActive) == null ? void 0 : ee.value;
    }, (ee) => {
      ee && g.value != null && h.open(g.value, !0), ee && _(ee);
    }, {
      immediate: !0
    });
    const {
      themeClasses: O
    } = vt(e), {
      borderClasses: $
    } = no(e), {
      colorClasses: M,
      colorStyles: k,
      variantClasses: I
    } = $i(N), {
      densityClasses: L
    } = pn(e), {
      dimensionStyles: J
    } = Fn(e), {
      elevationClasses: re
    } = Bn(e), {
      roundedClasses: oe
    } = Ot(E), Z = y(() => e.lines ? `v-list-item--${e.lines}-line` : void 0), Ee = y(() => ({
      isActive: A.value,
      select: d,
      isOpen: u.value,
      isSelected: c.value,
      isIndeterminate: m.value
    }));
    function G(ee) {
      var Ve;
      i("click", ee), C.value && ((Ve = s.navigate) == null || Ve.call(s, ee), !v && (h.activatable.value ? r(!a.value, ee) : (h.selectable.value || e.value != null) && d(!c.value, ee)));
    }
    function q(ee) {
      (ee.key === "Enter" || ee.key === " ") && (ee.preventDefault(), ee.target.dispatchEvent(new MouseEvent("click", ee)));
    }
    return _e(() => {
      const ee = D.value ? "a" : e.tag, Ve = o.title || e.title != null, Ge = o.subtitle || e.subtitle != null, qe = !!(e.appendAvatar || e.appendIcon), ne = !!(qe || o.append), we = !!(e.prependAvatar || e.prependIcon), Be = !!(we || o.prepend);
      return V == null || V.updateHasPrepend(Be), e.activeColor && Tp("active-color", ["color", "base-color"]), yt(f(ee, Oe({
        class: ["v-list-item", {
          "v-list-item--active": A.value,
          "v-list-item--disabled": e.disabled,
          "v-list-item--link": C.value,
          "v-list-item--nav": e.nav,
          "v-list-item--prepend": !Be && (V == null ? void 0 : V.hasPrepend.value),
          "v-list-item--slim": e.slim,
          [`${e.activeClass}`]: e.activeClass && A.value
        }, O.value, $.value, M.value, L.value, re.value, Z.value, oe.value, I.value, e.class],
        style: [k.value, J.value, e.style],
        tabindex: C.value ? V ? -2 : 0 : void 0,
        "aria-selected": h.activatable.value ? a.value : c.value,
        onClick: G,
        onKeydown: C.value && !D.value && q
      }, s.linkProps), {
        default: () => {
          var Ze;
          return [Ii(C.value || A.value, "v-list-item"), Be && f("div", {
            key: "prepend",
            class: "v-list-item__prepend"
          }, [o.prepend ? f(mt, {
            key: "prepend-defaults",
            disabled: !we,
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
              var Xe;
              return [(Xe = o.prepend) == null ? void 0 : Xe.call(o, Ee.value)];
            }
          }) : f(Ne, null, [e.prependAvatar && f(cn, {
            key: "prepend-avatar",
            density: e.density,
            image: e.prependAvatar
          }, null), e.prependIcon && f(Me, {
            key: "prepend-icon",
            density: e.density,
            icon: e.prependIcon
          }, null)]), f("div", {
            class: "v-list-item__spacer"
          }, null)]), f("div", {
            class: "v-list-item__content",
            "data-no-activator": ""
          }, [Ve && f(tl, {
            key: "title"
          }, {
            default: () => {
              var Xe;
              return [((Xe = o.title) == null ? void 0 : Xe.call(o, {
                title: e.title
              })) ?? e.title];
            }
          }), Ge && f(la, {
            key: "subtitle"
          }, {
            default: () => {
              var Xe;
              return [((Xe = o.subtitle) == null ? void 0 : Xe.call(o, {
                subtitle: e.subtitle
              })) ?? e.subtitle];
            }
          }), (Ze = o.default) == null ? void 0 : Ze.call(o, Ee.value)]), ne && f("div", {
            key: "append",
            class: "v-list-item__append"
          }, [o.append ? f(mt, {
            key: "append-defaults",
            disabled: !qe,
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
              var Xe;
              return [(Xe = o.append) == null ? void 0 : Xe.call(o, Ee.value)];
            }
          }) : f(Ne, null, [e.appendIcon && f(Me, {
            key: "append-icon",
            density: e.density,
            icon: e.appendIcon
          }, null), e.appendAvatar && f(cn, {
            key: "append-avatar",
            density: e.density,
            image: e.appendAvatar
          }, null)]), f("div", {
            class: "v-list-item__spacer"
          }, null)])];
        }
      }), [[Vo("ripple"), C.value && e.ripple]]);
    }), {
      activate: r,
      isActivated: a,
      isGroupActivator: v,
      isSelected: c,
      list: V,
      select: d,
      root: h,
      id: x
    };
  }
}), w_ = K({
  color: String,
  inset: Boolean,
  sticky: Boolean,
  title: String,
  ...xe(),
  ...Ke()
}, "VListSubheader"), S_ = ve()({
  name: "VListSubheader",
  props: w_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      textColorClasses: o,
      textColorStyles: i
    } = Ut(ce(e, "color"));
    return _e(() => {
      const s = !!(n.default || e.title);
      return f(e.tag, {
        class: ["v-list-subheader", {
          "v-list-subheader--inset": e.inset,
          "v-list-subheader--sticky": e.sticky
        }, o.value, e.class],
        style: [{
          textColorStyles: i
        }, e.style]
      }, {
        default: () => {
          var l;
          return [s && f("div", {
            class: "v-list-subheader__text"
          }, [((l = n.default) == null ? void 0 : l.call(n)) ?? e.title])];
        }
      });
    }), {};
  }
}), k_ = K({
  items: Array,
  returnObject: Boolean
}, "VListChildren"), mm = ve()({
  name: "VListChildren",
  props: k_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return lm(), () => {
      var o, i;
      return ((o = n.default) == null ? void 0 : o.call(n)) ?? ((i = e.items) == null ? void 0 : i.map((s) => {
        var m, v;
        let {
          children: l,
          props: r,
          type: a,
          raw: d
        } = s;
        if (a === "divider")
          return ((m = n.divider) == null ? void 0 : m.call(n, {
            props: r
          })) ?? f(vn, r, null);
        if (a === "subheader")
          return ((v = n.subheader) == null ? void 0 : v.call(n, {
            props: r
          })) ?? f(S_, r, null);
        const u = {
          subtitle: n.subtitle ? (h) => {
            var g;
            return (g = n.subtitle) == null ? void 0 : g.call(n, {
              ...h,
              item: d
            });
          } : void 0,
          prepend: n.prepend ? (h) => {
            var g;
            return (g = n.prepend) == null ? void 0 : g.call(n, {
              ...h,
              item: d
            });
          } : void 0,
          append: n.append ? (h) => {
            var g;
            return (g = n.append) == null ? void 0 : g.call(n, {
              ...h,
              item: d
            });
          } : void 0,
          title: n.title ? (h) => {
            var g;
            return (g = n.title) == null ? void 0 : g.call(n, {
              ...h,
              item: d
            });
          } : void 0
        }, c = Os.filterProps(r);
        return l ? f(Os, Oe({
          value: r == null ? void 0 : r.value
        }, c), {
          activator: (h) => {
            let {
              props: g
            } = h;
            const _ = {
              ...r,
              ...g,
              value: e.returnObject ? d : r.value
            };
            return n.header ? n.header({
              props: _
            }) : f(Re, _, u);
          },
          default: () => f(mm, {
            items: l,
            returnObject: e.returnObject
          }, n)
        }) : n.item ? n.item({
          props: r
        }) : f(Re, Oe(r, {
          value: e.returnObject ? d : r.value
        }), u);
      }));
    };
  }
}), C_ = K({
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
    default: Ws
  }
}, "list-items");
function E_(e) {
  return typeof e == "string" || typeof e == "number" || typeof e == "boolean";
}
function x_(e, t) {
  const n = ei(t, e.itemType, "item"), o = E_(t) ? t : ei(t, e.itemTitle), i = ei(t, e.itemValue, void 0), s = ei(t, e.itemChildren), l = e.itemProps === !0 ? Us(t, ["children"]) : ei(t, e.itemProps), r = {
    title: o,
    value: i,
    ...l
  };
  return {
    type: n,
    title: r.title,
    value: r.value,
    props: r,
    children: n === "item" && s ? vm(e, s) : void 0,
    raw: t
  };
}
function vm(e, t) {
  const n = [];
  for (const o of t)
    n.push(x_(e, o));
  return n;
}
function N_(e) {
  return {
    items: y(() => vm(e, e.items))
  };
}
const V_ = K({
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
  "onClick:open": jt(),
  "onClick:select": jt(),
  "onUpdate:opened": jt(),
  ...v_({
    selectStrategy: "single-leaf",
    openStrategy: "list"
  }),
  ...to(),
  ...xe(),
  ...Qt(),
  ...Mn(),
  ...Ln(),
  itemType: {
    type: String,
    default: "type"
  },
  ...C_(),
  ...Vt(),
  ...Ke(),
  ...ot(),
  ...Do({
    variant: "text"
  })
}, "VList"), xn = ve()({
  name: "VList",
  props: V_(),
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
    } = N_(e), {
      themeClasses: i
    } = vt(e), {
      backgroundColorClasses: s,
      backgroundColorStyles: l
    } = $t(ce(e, "bgColor")), {
      borderClasses: r
    } = no(e), {
      densityClasses: a
    } = pn(e), {
      dimensionStyles: d
    } = Fn(e), {
      elevationClasses: u
    } = Bn(e), {
      roundedClasses: c
    } = Ot(e), {
      children: m,
      open: v,
      parents: h,
      select: g,
      getPath: _
    } = h_(e), x = y(() => e.lines ? `v-list--${e.lines}-line` : void 0), V = ce(e, "activeColor"), A = ce(e, "baseColor"), D = ce(e, "color");
    lm(), To({
      VListGroup: {
        activeColor: V,
        baseColor: A,
        color: D,
        expandIcon: ce(e, "expandIcon"),
        collapseIcon: ce(e, "collapseIcon")
      },
      VListItem: {
        activeClass: ce(e, "activeClass"),
        activeColor: V,
        baseColor: A,
        color: D,
        density: ce(e, "density"),
        disabled: ce(e, "disabled"),
        lines: ce(e, "lines"),
        nav: ce(e, "nav"),
        slim: ce(e, "slim"),
        variant: ce(e, "variant")
      }
    });
    const C = Se(!1), E = le();
    function F(I) {
      C.value = !0;
    }
    function N(I) {
      C.value = !1;
    }
    function O(I) {
      var L;
      !C.value && !(I.relatedTarget && ((L = E.value) != null && L.contains(I.relatedTarget))) && k();
    }
    function $(I) {
      const L = I.target;
      if (!(!E.value || ["INPUT", "TEXTAREA"].includes(L.tagName))) {
        if (I.key === "ArrowDown")
          k("next");
        else if (I.key === "ArrowUp")
          k("prev");
        else if (I.key === "Home")
          k("first");
        else if (I.key === "End")
          k("last");
        else
          return;
        I.preventDefault();
      }
    }
    function M(I) {
      C.value = !0;
    }
    function k(I) {
      if (E.value)
        return Qd(E.value, I);
    }
    return _e(() => f(e.tag, {
      ref: E,
      class: ["v-list", {
        "v-list--disabled": e.disabled,
        "v-list--nav": e.nav,
        "v-list--slim": e.slim
      }, i.value, s.value, r.value, a.value, u.value, x.value, c.value, e.class],
      style: [l.value, d.value, e.style],
      tabindex: e.disabled || C.value ? -1 : 0,
      role: "listbox",
      "aria-activedescendant": void 0,
      onFocusin: F,
      onFocusout: N,
      onFocus: O,
      onKeydown: $,
      onMousedown: M
    }, {
      default: () => [f(mm, {
        items: o.value,
        returnObject: e.returnObject
      }, n)]
    })), {
      open: v,
      select: g,
      focus: k,
      children: m,
      parents: h,
      getPath: _
    };
  }
}), O_ = K({
  active: Boolean,
  disabled: Boolean,
  max: [Number, String],
  value: {
    type: [Number, String],
    default: 0
  },
  ...xe(),
  ...Ai({
    transition: {
      component: im
    }
  })
}, "VCounter"), T_ = ve()({
  name: "VCounter",
  functional: !0,
  props: O_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = y(() => e.max ? `${e.value} / ${e.max}` : String(e.value));
    return _e(() => f(un, {
      transition: e.transition
    }, {
      default: () => [yt(f("div", {
        class: ["v-counter", {
          "text-error": e.max && !e.disabled && parseFloat(e.value) > parseFloat(e.max)
        }, e.class],
        style: e.style
      }, [n.default ? n.default({
        counter: o.value,
        max: e.max,
        value: e.value
      }) : o.value]), [[In, e.active]])]
    })), {};
  }
}), D_ = K({
  text: String,
  onClick: jt(),
  ...xe(),
  ...ot()
}, "VLabel"), hm = ve()({
  name: "VLabel",
  props: D_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => {
      var o;
      return f("label", {
        class: ["v-label", {
          "v-label--clickable": !!e.onClick
        }, e.class],
        style: e.style,
        onClick: e.onClick
      }, [e.text, (o = n.default) == null ? void 0 : o.call(n)]);
    }), {};
  }
}), P_ = K({
  floating: Boolean,
  ...xe()
}, "VFieldLabel"), Yi = ve()({
  name: "VFieldLabel",
  props: P_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => f(hm, {
      class: ["v-field-label", {
        "v-field-label--floating": e.floating
      }, e.class],
      style: e.style,
      "aria-hidden": e.floating || void 0
    }, n)), {};
  }
});
function gm(e) {
  const {
    t
  } = Gs();
  function n(o) {
    let {
      name: i
    } = o;
    const s = {
      prepend: "prependAction",
      prependInner: "prependAction",
      append: "appendAction",
      appendInner: "appendAction",
      clear: "clear"
    }[i], l = e[`onClick:${i}`], r = l && s ? t(`$vuetify.input.${s}`, e.label ?? "") : void 0;
    return f(Me, {
      icon: e[`${i}Icon`],
      "aria-label": r,
      onClick: l
    }, null);
  }
  return {
    InputIcon: n
  };
}
const ra = K({
  focused: Boolean,
  "onUpdate:focused": jt()
}, "focus");
function aa(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn();
  const n = at(e, "focused"), o = y(() => ({
    [`${t}--focused`]: n.value
  }));
  function i() {
    n.value = !0;
  }
  function s() {
    n.value = !1;
  }
  return {
    focusClasses: o,
    isFocused: n,
    focus: i,
    blur: s
  };
}
const A_ = ["underlined", "outlined", "filled", "solo", "solo-inverted", "solo-filled", "plain"], pm = K({
  appendInnerIcon: Ye,
  bgColor: String,
  clearable: Boolean,
  clearIcon: {
    type: Ye,
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
  prependInnerIcon: Ye,
  reverse: Boolean,
  singleLine: Boolean,
  variant: {
    type: String,
    default: "filled",
    validator: (e) => A_.includes(e)
  },
  "onClick:clear": jt(),
  "onClick:appendInner": jt(),
  "onClick:prependInner": jt(),
  ...xe(),
  ...Xr(),
  ...Vt(),
  ...ot()
}, "VField"), ym = ve()({
  name: "VField",
  inheritAttrs: !1,
  props: {
    id: String,
    ...ra(),
    ...pm()
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
      themeClasses: s
    } = vt(e), {
      loaderClasses: l
    } = Jr(e), {
      focusClasses: r,
      isFocused: a,
      focus: d,
      blur: u
    } = aa(e), {
      InputIcon: c
    } = gm(e), {
      roundedClasses: m
    } = Ot(e), {
      rtlClasses: v
    } = Ft(), h = y(() => e.dirty || e.active), g = y(() => !e.singleLine && !!(e.label || i.label)), _ = eo(), x = y(() => e.id || `input-${_}`), V = y(() => `${x.value}-messages`), A = le(), D = le(), C = le(), E = y(() => ["plain", "underlined"].includes(e.variant)), {
      backgroundColorClasses: F,
      backgroundColorStyles: N
    } = $t(ce(e, "bgColor")), {
      textColorClasses: O,
      textColorStyles: $
    } = Ut(y(() => e.error || e.disabled ? void 0 : h.value && a.value ? e.color : e.baseColor));
    Ce(h, (L) => {
      if (g.value) {
        const J = A.value.$el, re = D.value.$el;
        requestAnimationFrame(() => {
          const oe = Hr(J), Z = re.getBoundingClientRect(), Ee = Z.x - oe.x, G = Z.y - oe.y - (oe.height / 2 - Z.height / 2), q = Z.width / 0.75, ee = Math.abs(q - oe.width) > 1 ? {
            maxWidth: ye(q)
          } : void 0, Ve = getComputedStyle(J), Ge = getComputedStyle(re), qe = parseFloat(Ve.transitionDuration) * 1e3 || 150, ne = parseFloat(Ge.getPropertyValue("--v-field-label-scale")), we = Ge.getPropertyValue("color");
          J.style.visibility = "visible", re.style.visibility = "hidden", mo(J, {
            transform: `translate(${Ee}px, ${G}px) scale(${ne})`,
            color: we,
            ...ee
          }, {
            duration: qe,
            easing: bi,
            direction: L ? "normal" : "reverse"
          }).finished.then(() => {
            J.style.removeProperty("visibility"), re.style.removeProperty("visibility");
          });
        });
      }
    }, {
      flush: "post"
    });
    const M = y(() => ({
      isActive: h,
      isFocused: a,
      controlRef: C,
      blur: u,
      focus: d
    }));
    function k(L) {
      L.target !== document.activeElement && L.preventDefault();
    }
    function I(L) {
      var J;
      L.key !== "Enter" && L.key !== " " || (L.preventDefault(), L.stopPropagation(), (J = e["onClick:clear"]) == null || J.call(e, new MouseEvent("click")));
    }
    return _e(() => {
      var Ee, G, q;
      const L = e.variant === "outlined", J = !!(i["prepend-inner"] || e.prependInnerIcon), re = !!(e.clearable || i.clear), oe = !!(i["append-inner"] || e.appendInnerIcon || re), Z = () => i.label ? i.label({
        ...M.value,
        label: e.label,
        props: {
          for: x.value
        }
      }) : e.label;
      return f("div", Oe({
        class: ["v-field", {
          "v-field--active": h.value,
          "v-field--appended": oe,
          "v-field--center-affix": e.centerAffix ?? !E.value,
          "v-field--disabled": e.disabled,
          "v-field--dirty": e.dirty,
          "v-field--error": e.error,
          "v-field--flat": e.flat,
          "v-field--has-background": !!e.bgColor,
          "v-field--persistent-clear": e.persistentClear,
          "v-field--prepended": J,
          "v-field--reverse": e.reverse,
          "v-field--single-line": e.singleLine,
          "v-field--no-label": !Z(),
          [`v-field--variant-${e.variant}`]: !0
        }, s.value, F.value, r.value, l.value, m.value, v.value, e.class],
        style: [N.value, e.style],
        onClick: k
      }, n), [f("div", {
        class: "v-field__overlay"
      }, null), f($f, {
        name: "v-field",
        active: !!e.loading,
        color: e.error ? "error" : typeof e.loading == "string" ? e.loading : e.color
      }, {
        default: i.loader
      }), J && f("div", {
        key: "prepend",
        class: "v-field__prepend-inner"
      }, [e.prependInnerIcon && f(c, {
        key: "prepend-icon",
        name: "prependInner"
      }, null), (Ee = i["prepend-inner"]) == null ? void 0 : Ee.call(i, M.value)]), f("div", {
        class: "v-field__field",
        "data-no-activator": ""
      }, [["filled", "solo", "solo-inverted", "solo-filled"].includes(e.variant) && g.value && f(Yi, {
        key: "floating-label",
        ref: D,
        class: [O.value],
        floating: !0,
        for: x.value,
        style: $.value
      }, {
        default: () => [Z()]
      }), f(Yi, {
        ref: A,
        for: x.value
      }, {
        default: () => [Z()]
      }), (G = i.default) == null ? void 0 : G.call(i, {
        ...M.value,
        props: {
          id: x.value,
          class: "v-field__input",
          "aria-describedby": V.value
        },
        focus: d,
        blur: u
      })]), re && f(l_, {
        key: "clear"
      }, {
        default: () => [yt(f("div", {
          class: "v-field__clearable",
          onMousedown: (ee) => {
            ee.preventDefault(), ee.stopPropagation();
          }
        }, [f(mt, {
          defaults: {
            VIcon: {
              icon: e.clearIcon
            }
          }
        }, {
          default: () => [i.clear ? i.clear({
            ...M.value,
            props: {
              onKeydown: I,
              onFocus: d,
              onBlur: u,
              onClick: e["onClick:clear"]
            }
          }) : f(c, {
            name: "clear",
            onKeydown: I,
            onFocus: d,
            onBlur: u
          }, null)]
        })]), [[In, e.dirty]])]
      }), oe && f("div", {
        key: "append",
        class: "v-field__append-inner"
      }, [(q = i["append-inner"]) == null ? void 0 : q.call(i, M.value), e.appendInnerIcon && f(c, {
        key: "append-icon",
        name: "appendInner"
      }, null)]), f("div", {
        class: ["v-field__outline", O.value],
        style: $.value
      }, [L && f(Ne, null, [f("div", {
        class: "v-field__outline__start"
      }, null), g.value && f("div", {
        class: "v-field__outline__notch"
      }, [f(Yi, {
        ref: D,
        floating: !0,
        for: x.value
      }, {
        default: () => [Z()]
      })]), f("div", {
        class: "v-field__outline__end"
      }, null)]), E.value && g.value && f(Yi, {
        ref: D,
        floating: !0,
        for: x.value
      }, {
        default: () => [Z()]
      })])]);
    }), {
      controlRef: C
    };
  }
});
function I_(e) {
  const t = Object.keys(ym.props).filter((n) => !Lr(n) && n !== "class" && n !== "style");
  return qd(e, t);
}
const $_ = K({
  active: Boolean,
  color: String,
  messages: {
    type: [Array, String],
    default: () => []
  },
  ...xe(),
  ...Ai({
    transition: {
      component: im,
      leaveAbsolute: !0,
      group: !0
    }
  })
}, "VMessages"), M_ = ve()({
  name: "VMessages",
  props: $_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = y(() => wo(e.messages)), {
      textColorClasses: i,
      textColorStyles: s
    } = Ut(y(() => e.color));
    return _e(() => f(un, {
      transition: e.transition,
      tag: "div",
      class: ["v-messages", i.value, e.class],
      style: [s.value, e.style],
      role: "alert",
      "aria-live": "polite"
    }, {
      default: () => [e.active && o.value.map((l, r) => f("div", {
        class: "v-messages__message",
        key: `${r}-${o.value}`
      }, [n.message ? n.message({
        message: l
      }) : l]))]
    })), {};
  }
}), bm = Symbol.for("vuetify:form"), F_ = K({
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
function L_(e) {
  const t = at(e, "modelValue"), n = y(() => e.disabled), o = y(() => e.readonly), i = Se(!1), s = le([]), l = le([]);
  async function r() {
    const u = [];
    let c = !0;
    l.value = [], i.value = !0;
    for (const m of s.value) {
      const v = await m.validate();
      if (v.length > 0 && (c = !1, u.push({
        id: m.id,
        errorMessages: v
      })), !c && e.fastFail) break;
    }
    return l.value = u, i.value = !1, {
      valid: c,
      errors: l.value
    };
  }
  function a() {
    s.value.forEach((u) => u.reset());
  }
  function d() {
    s.value.forEach((u) => u.resetValidation());
  }
  return Ce(s, () => {
    let u = 0, c = 0;
    const m = [];
    for (const v of s.value)
      v.isValid === !1 ? (c++, m.push({
        id: v.id,
        errorMessages: v.errorMessages
      })) : v.isValid === !0 && u++;
    l.value = m, t.value = c > 0 ? !1 : u === s.value.length ? !0 : null;
  }, {
    deep: !0,
    flush: "post"
  }), bt(bm, {
    register: (u) => {
      let {
        id: c,
        vm: m,
        validate: v,
        reset: h,
        resetValidation: g
      } = u;
      s.value.some((_) => _.id === c) && mn(`Duplicate input name "${c}"`), s.value.push({
        id: c,
        validate: v,
        reset: h,
        resetValidation: g,
        vm: $c(m),
        isValid: null,
        errorMessages: []
      });
    },
    unregister: (u) => {
      s.value = s.value.filter((c) => c.id !== u);
    },
    update: (u, c, m) => {
      const v = s.value.find((h) => h.id === u);
      v && (v.isValid = c, v.errorMessages = m);
    },
    isDisabled: n,
    isReadonly: o,
    isValidating: i,
    isValid: t,
    items: s,
    validateOn: ce(e, "validateOn")
  }), {
    errors: l,
    isDisabled: n,
    isReadonly: o,
    isValidating: i,
    isValid: t,
    items: s,
    validate: r,
    reset: a,
    resetValidation: d
  };
}
function B_() {
  return je(bm, null);
}
const R_ = K({
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
  ...ra()
}, "validation");
function H_(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : gn(), n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : eo();
  const o = at(e, "modelValue"), i = y(() => e.validationValue === void 0 ? o.value : e.validationValue), s = B_(), l = le([]), r = Se(!0), a = y(() => !!(wo(o.value === "" ? null : o.value).length || wo(i.value === "" ? null : i.value).length)), d = y(() => !!(e.disabled ?? (s == null ? void 0 : s.isDisabled.value))), u = y(() => !!(e.readonly ?? (s == null ? void 0 : s.isReadonly.value))), c = y(() => {
    var C;
    return (C = e.errorMessages) != null && C.length ? wo(e.errorMessages).concat(l.value).slice(0, Math.max(0, +e.maxErrors)) : l.value;
  }), m = y(() => {
    let C = (e.validateOn ?? (s == null ? void 0 : s.validateOn.value)) || "input";
    C === "lazy" && (C = "input lazy"), C === "eager" && (C = "input eager");
    const E = new Set((C == null ? void 0 : C.split(" ")) ?? []);
    return {
      input: E.has("input"),
      blur: E.has("blur") || E.has("input") || E.has("invalid-input"),
      invalidInput: E.has("invalid-input"),
      lazy: E.has("lazy"),
      eager: E.has("eager")
    };
  }), v = y(() => {
    var C;
    return e.error || (C = e.errorMessages) != null && C.length ? !1 : e.rules.length ? r.value ? l.value.length || m.value.lazy ? null : !0 : !l.value.length : !0;
  }), h = Se(!1), g = y(() => ({
    [`${t}--error`]: v.value === !1,
    [`${t}--dirty`]: a.value,
    [`${t}--disabled`]: d.value,
    [`${t}--readonly`]: u.value
  })), _ = et("validation"), x = y(() => e.name ?? rn(n));
  xr(() => {
    s == null || s.register({
      id: x.value,
      vm: _,
      validate: D,
      reset: V,
      resetValidation: A
    });
  }), xt(() => {
    s == null || s.unregister(x.value);
  }), Zn(async () => {
    m.value.lazy || await D(!m.value.eager), s == null || s.update(x.value, v.value, c.value);
  }), No(() => m.value.input || m.value.invalidInput && v.value === !1, () => {
    Ce(i, () => {
      if (i.value != null)
        D();
      else if (e.focused) {
        const C = Ce(() => e.focused, (E) => {
          E || D(), C();
        });
      }
    });
  }), No(() => m.value.blur, () => {
    Ce(() => e.focused, (C) => {
      C || D();
    });
  }), Ce([v, c], () => {
    s == null || s.update(x.value, v.value, c.value);
  });
  async function V() {
    o.value = null, await Et(), await A();
  }
  async function A() {
    r.value = !0, m.value.lazy ? l.value = [] : await D(!m.value.eager);
  }
  async function D() {
    let C = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !1;
    const E = [];
    h.value = !0;
    for (const F of e.rules) {
      if (E.length >= +(e.maxErrors ?? 1))
        break;
      const O = await (typeof F == "function" ? F : () => F)(i.value);
      if (O !== !0) {
        if (O !== !1 && typeof O != "string") {
          console.warn(`${O} is not a valid value. Rule functions must return boolean true or a string.`);
          continue;
        }
        E.push(O || "");
      }
    }
    return l.value = E, h.value = !1, r.value = C, l.value;
  }
  return {
    errorMessages: c,
    isDirty: a,
    isDisabled: d,
    isReadonly: u,
    isPristine: r,
    isValid: v,
    isValidating: h,
    reset: V,
    resetValidation: A,
    validate: D,
    validationClasses: g
  };
}
const ua = K({
  id: String,
  appendIcon: Ye,
  centerAffix: {
    type: Boolean,
    default: !0
  },
  prependIcon: Ye,
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
  "onClick:prepend": jt(),
  "onClick:append": jt(),
  ...xe(),
  ...Qt(),
  ...fp(Mn(), ["maxWidth", "minWidth", "width"]),
  ...ot(),
  ...R_()
}, "VInput"), Ts = ve()({
  name: "VInput",
  props: {
    ...ua()
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
      densityClasses: s
    } = pn(e), {
      dimensionStyles: l
    } = Fn(e), {
      themeClasses: r
    } = vt(e), {
      rtlClasses: a
    } = Ft(), {
      InputIcon: d
    } = gm(e), u = eo(), c = y(() => e.id || `input-${u}`), m = y(() => `${c.value}-messages`), {
      errorMessages: v,
      isDirty: h,
      isDisabled: g,
      isReadonly: _,
      isPristine: x,
      isValid: V,
      isValidating: A,
      reset: D,
      resetValidation: C,
      validate: E,
      validationClasses: F
    } = H_(e, "v-input", c), N = y(() => ({
      id: c,
      messagesId: m,
      isDirty: h,
      isDisabled: g,
      isReadonly: _,
      isPristine: x,
      isValid: V,
      isValidating: A,
      reset: D,
      resetValidation: C,
      validate: E
    })), O = y(() => {
      var $;
      return ($ = e.errorMessages) != null && $.length || !x.value && v.value.length ? v.value : e.hint && (e.persistentHint || e.focused) ? e.hint : e.messages;
    });
    return _e(() => {
      var L, J, re, oe;
      const $ = !!(o.prepend || e.prependIcon), M = !!(o.append || e.appendIcon), k = O.value.length > 0, I = !e.hideDetails || e.hideDetails === "auto" && (k || !!o.details);
      return f("div", {
        class: ["v-input", `v-input--${e.direction}`, {
          "v-input--center-affix": e.centerAffix,
          "v-input--hide-spin-buttons": e.hideSpinButtons
        }, s.value, r.value, a.value, F.value, e.class],
        style: [l.value, e.style]
      }, [$ && f("div", {
        key: "prepend",
        class: "v-input__prepend"
      }, [(L = o.prepend) == null ? void 0 : L.call(o, N.value), e.prependIcon && f(d, {
        key: "prepend-icon",
        name: "prepend"
      }, null)]), o.default && f("div", {
        class: "v-input__control"
      }, [(J = o.default) == null ? void 0 : J.call(o, N.value)]), M && f("div", {
        key: "append",
        class: "v-input__append"
      }, [e.appendIcon && f(d, {
        key: "append-icon",
        name: "append"
      }, null), (re = o.append) == null ? void 0 : re.call(o, N.value)]), I && f("div", {
        class: "v-input__details"
      }, [f(M_, {
        id: m.value,
        active: k,
        messages: O.value
      }, {
        message: o.message
      }), (oe = o.details) == null ? void 0 : oe.call(o, N.value)])]);
    }), {
      reset: D,
      resetValidation: C,
      validate: E,
      isValid: V,
      errorMessages: v
    };
  }
}), kl = Symbol("Forwarded refs");
function Cl(e, t) {
  let n = e;
  for (; n; ) {
    const o = Reflect.getOwnPropertyDescriptor(n, t);
    if (o) return o;
    n = Object.getPrototypeOf(n);
  }
}
function nl(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), o = 1; o < t; o++)
    n[o - 1] = arguments[o];
  return e[kl] = n, new Proxy(e, {
    get(i, s) {
      if (Reflect.has(i, s))
        return Reflect.get(i, s);
      if (!(typeof s == "symbol" || s.startsWith("$") || s.startsWith("__"))) {
        for (const l of n)
          if (l.value && Reflect.has(l.value, s)) {
            const r = Reflect.get(l.value, s);
            return typeof r == "function" ? r.bind(l.value) : r;
          }
      }
    },
    has(i, s) {
      if (Reflect.has(i, s))
        return !0;
      if (typeof s == "symbol" || s.startsWith("$") || s.startsWith("__")) return !1;
      for (const l of n)
        if (l.value && Reflect.has(l.value, s))
          return !0;
      return !1;
    },
    set(i, s, l) {
      if (Reflect.has(i, s))
        return Reflect.set(i, s, l);
      if (typeof s == "symbol" || s.startsWith("$") || s.startsWith("__")) return !1;
      for (const r of n)
        if (r.value && Reflect.has(r.value, s))
          return Reflect.set(r.value, s, l);
      return !1;
    },
    getOwnPropertyDescriptor(i, s) {
      var r;
      const l = Reflect.getOwnPropertyDescriptor(i, s);
      if (l) return l;
      if (!(typeof s == "symbol" || s.startsWith("$") || s.startsWith("__"))) {
        for (const a of n) {
          if (!a.value) continue;
          const d = Cl(a.value, s) ?? ("_" in a.value ? Cl((r = a.value._) == null ? void 0 : r.setupState, s) : void 0);
          if (d) return d;
        }
        for (const a of n) {
          const d = a.value && a.value[kl];
          if (!d) continue;
          const u = d.slice();
          for (; u.length; ) {
            const c = u.shift(), m = Cl(c.value, s);
            if (m) return m;
            const v = c.value && c.value[kl];
            v && u.push(...v);
          }
        }
      }
    }
  });
}
const j_ = ["color", "file", "time", "date", "datetime-local", "week", "month"], z_ = K({
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
  ...ua(),
  ...pm()
}, "VTextField"), Gt = ve()({
  name: "VTextField",
  directives: {
    Intersect: Vf
  },
  inheritAttrs: !1,
  props: z_(),
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
    const s = at(e, "modelValue"), {
      isFocused: l,
      focus: r,
      blur: a
    } = aa(e), d = y(() => typeof e.counterValue == "function" ? e.counterValue(s.value) : typeof e.counterValue == "number" ? e.counterValue : (s.value ?? "").toString().length), u = y(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    }), c = y(() => ["plain", "underlined"].includes(e.variant));
    function m(E, F) {
      var N, O;
      !e.autofocus || !E || (O = (N = F[0].target) == null ? void 0 : N.focus) == null || O.call(N);
    }
    const v = le(), h = le(), g = le(), _ = y(() => j_.includes(e.type) || e.persistentPlaceholder || l.value || e.active);
    function x() {
      var E;
      g.value !== document.activeElement && ((E = g.value) == null || E.focus()), l.value || r();
    }
    function V(E) {
      o("mousedown:control", E), E.target !== g.value && (x(), E.preventDefault());
    }
    function A(E) {
      x(), o("click:control", E);
    }
    function D(E) {
      E.stopPropagation(), x(), Et(() => {
        s.value = null, gp(e["onClick:clear"], E);
      });
    }
    function C(E) {
      var N;
      const F = E.target;
      if (s.value = F.value, (N = e.modelModifiers) != null && N.trim && ["text", "search", "password", "tel", "url"].includes(e.type)) {
        const O = [F.selectionStart, F.selectionEnd];
        Et(() => {
          F.selectionStart = O[0], F.selectionEnd = O[1];
        });
      }
    }
    return _e(() => {
      const E = !!(i.counter || e.counter !== !1 && e.counter != null), F = !!(E || i.details), [N, O] = vp(n), {
        modelValue: $,
        ...M
      } = Ts.filterProps(e), k = I_(e);
      return f(Ts, Oe({
        ref: v,
        modelValue: s.value,
        "onUpdate:modelValue": (I) => s.value = I,
        class: ["v-text-field", {
          "v-text-field--prefixed": e.prefix,
          "v-text-field--suffixed": e.suffix,
          "v-input--plain-underlined": c.value
        }, e.class],
        style: e.style
      }, N, M, {
        centerAffix: !c.value,
        focused: l.value
      }), {
        ...i,
        default: (I) => {
          let {
            id: L,
            isDisabled: J,
            isDirty: re,
            isReadonly: oe,
            isValid: Z
          } = I;
          return f(ym, Oe({
            ref: h,
            onMousedown: V,
            onClick: A,
            "onClick:clear": D,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"],
            role: e.role
          }, k, {
            id: L.value,
            active: _.value || re.value,
            dirty: re.value || e.dirty,
            disabled: J.value,
            focused: l.value,
            error: Z.value === !1
          }), {
            ...i,
            default: (Ee) => {
              let {
                props: {
                  class: G,
                  ...q
                }
              } = Ee;
              const ee = yt(f("input", Oe({
                ref: g,
                value: s.value,
                onInput: C,
                autofocus: e.autofocus,
                readonly: oe.value,
                disabled: J.value,
                name: e.name,
                placeholder: e.placeholder,
                size: 1,
                type: e.type,
                onFocus: x,
                onBlur: a
              }, q, O), null), [[Vo("intersect"), {
                handler: m
              }, null, {
                once: !0
              }]]);
              return f(Ne, null, [e.prefix && f("span", {
                class: "v-text-field__prefix"
              }, [f("span", {
                class: "v-text-field__prefix__text"
              }, [e.prefix])]), i.default ? f("div", {
                class: G,
                "data-no-activator": ""
              }, [i.default(), ee]) : Jt(ee, {
                class: G
              }), e.suffix && f("span", {
                class: "v-text-field__suffix"
              }, [f("span", {
                class: "v-text-field__suffix__text"
              }, [e.suffix])])]);
            }
          });
        },
        details: F ? (I) => {
          var L;
          return f(Ne, null, [(L = i.details) == null ? void 0 : L.call(i, I), E && f(Ne, null, [f("span", null, null), f(T_, {
            active: e.persistentCounter || l.value,
            value: d.value,
            max: u.value,
            disabled: e.disabled
          }, i.counter)])]);
        } : void 0
      });
    }), nl({}, v, h, g);
  }
}), W_ = {
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
function U_(e, t, n, o, i, s) {
  return ae(), ke(Pt, null, {
    default: b(() => [
      f(Dt, null, {
        default: b(() => [
          f(Pe, {
            offset: "2",
            cols: "8",
            class: "text-center"
          }, {
            default: b(() => t[4] || (t[4] = [
              se("h4", { class: "mt-3" }, "评论列表", -1)
            ])),
            _: 1
          }),
          f(Pe, { cols: "2" }, {
            default: b(() => [
              f(fe, {
                variant: "plain",
                icon: "mdi-close",
                onClick: t[0] || (t[0] = (l) => e.$emit("close")),
                title: "关闭评论面板"
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      f(vn),
      n.comments.length == 0 ? (ae(), ke(xn, {
        key: 0,
        density: "compact"
      }, {
        default: b(() => [
          f(Re, { class: "my-4" }, {
            default: b(() => [
              f(tl, { class: "text-center" }, {
                default: b(() => t[5] || (t[5] = [
                  Q("尚未有人发表评论")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : (ae(), ke(xn, {
        key: 1,
        id: "book-comments",
        density: "compact"
      }, {
        default: b(() => [
          (ae(!0), lt(Ne, null, fn(n.comments, (l) => (ae(), ke(Re, {
            class: "pr-0 align-self-start mb-4",
            "prepend-avatar": l.avatar,
            "append-icon": "mdi-thumb-up",
            subtitle: l.nickName
          }, {
            prepend: b(() => [
              f(cn, {
                variant: "outlined",
                size: "large",
                color: "grey",
                class: "text-center",
                icon: l.avatar
              }, null, 8, ["icon"])
            ]),
            append: b(() => [
              f(fe, {
                class: "px-0",
                size: "small",
                variant: "plain",
                stacked: "",
                "prepend-icon": "mdi-thumb-up",
                title: "点赞"
              }, {
                default: b(() => [
                  Q(Te(l.likeCount), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            default: b(() => [
              Q(Te(l.content) + " ", 1),
              f(la, null, {
                default: b(() => [
                  Q(Te(l.level) + "楼 * " + Te(l.createTime) + " * " + Te(l.geo), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            _: 2
          }, 1032, ["prepend-avatar", "subtitle"]))), 256))
        ]),
        _: 1
      })),
      f(Xn, { class: "my-2 py-0 px-2" }, {
        default: b(() => [
          n.login ? (ae(), ke(Dt, { key: 1 }, {
            default: b(() => [
              f(Pe, { cols: "9" }, {
                default: b(() => [
                  f(Gt, {
                    modelValue: e.content,
                    "onUpdate:modelValue": t[2] || (t[2] = (l) => e.content = l),
                    density: "compact",
                    "single-line": "",
                    "hide-details": "",
                    placeholder: "爱书之人，维持良好的社区氛围"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              f(Pe, { cols: "3" }, {
                default: b(() => [
                  f(fe, {
                    onClick: t[3] || (t[3] = (l) => e.$emit("add_review", this.content))
                  }, {
                    default: b(() => t[7] || (t[7] = [
                      Q("发表")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (ae(), ke(fe, {
            key: 0,
            onClick: t[1] || (t[1] = (l) => e.$emit("login")),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: b(() => t[6] || (t[6] = [
              Q("点击登录，发表评论")
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
const _m = /* @__PURE__ */ $n(W_, [["render", U_]]), K_ = Ks("v-alert-title"), G_ = ["success", "info", "warning", "error"], Y_ = K({
  border: {
    type: [Boolean, String],
    validator: (e) => typeof e == "boolean" || ["top", "end", "bottom", "start"].includes(e)
  },
  borderColor: String,
  closable: Boolean,
  closeIcon: {
    type: Ye,
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
    validator: (e) => G_.includes(e)
  },
  ...xe(),
  ...Qt(),
  ...Mn(),
  ...Ln(),
  ...Mi(),
  ...Zr(),
  ...Vt(),
  ...Ke(),
  ...ot(),
  ...Do({
    variant: "flat"
  })
}, "VAlert"), ii = ve()({
  name: "VAlert",
  props: Y_(),
  emits: {
    "click:close": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      emit: n,
      slots: o
    } = t;
    const i = at(e, "modelValue"), s = y(() => {
      if (e.icon !== !1)
        return e.type ? e.icon ?? `$${e.type}` : e.icon;
    }), l = y(() => ({
      color: e.color ?? e.type,
      variant: e.variant
    })), {
      themeClasses: r
    } = vt(e), {
      colorClasses: a,
      colorStyles: d,
      variantClasses: u
    } = $i(l), {
      densityClasses: c
    } = pn(e), {
      dimensionStyles: m
    } = Fn(e), {
      elevationClasses: v
    } = Bn(e), {
      locationStyles: h
    } = Fi(e), {
      positionClasses: g
    } = Qr(e), {
      roundedClasses: _
    } = Ot(e), {
      textColorClasses: x,
      textColorStyles: V
    } = Ut(ce(e, "borderColor")), {
      t: A
    } = Gs(), D = y(() => ({
      "aria-label": A(e.closeLabel),
      onClick(C) {
        i.value = !1, n("click:close", C);
      }
    }));
    return () => {
      const C = !!(o.prepend || s.value), E = !!(o.title || e.title), F = !!(o.close || e.closable);
      return i.value && f(e.tag, {
        class: ["v-alert", e.border && {
          "v-alert--border": !!e.border,
          [`v-alert--border-${e.border === !0 ? "start" : e.border}`]: !0
        }, {
          "v-alert--prominent": e.prominent
        }, r.value, a.value, c.value, v.value, g.value, _.value, u.value, e.class],
        style: [d.value, m.value, h.value, e.style],
        role: "alert"
      }, {
        default: () => {
          var N, O;
          return [Ii(!1, "v-alert"), e.border && f("div", {
            key: "border",
            class: ["v-alert__border", x.value],
            style: V.value
          }, null), C && f("div", {
            key: "prepend",
            class: "v-alert__prepend"
          }, [o.prepend ? f(mt, {
            key: "prepend-defaults",
            disabled: !s.value,
            defaults: {
              VIcon: {
                density: e.density,
                icon: s.value,
                size: e.prominent ? 44 : 28
              }
            }
          }, o.prepend) : f(Me, {
            key: "prepend-icon",
            density: e.density,
            icon: s.value,
            size: e.prominent ? 44 : 28
          }, null)]), f("div", {
            class: "v-alert__content"
          }, [E && f(K_, {
            key: "title"
          }, {
            default: () => {
              var $;
              return [(($ = o.title) == null ? void 0 : $.call(o)) ?? e.title];
            }
          }), ((N = o.text) == null ? void 0 : N.call(o)) ?? e.text, (O = o.default) == null ? void 0 : O.call(o)]), o.append && f("div", {
            key: "append",
            class: "v-alert__append"
          }, [o.append()]), F && f("div", {
            key: "close",
            class: "v-alert__close"
          }, [o.close ? f(mt, {
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
                props: D.value
              })];
            }
          }) : f(fe, Oe({
            key: "close-btn",
            icon: e.closeIcon,
            size: "x-small",
            variant: "text"
          }, D.value), null)])];
        }
      });
    };
  }
});
function El(e, t) {
  return {
    x: e.x + t.x,
    y: e.y + t.y
  };
}
function q_(e, t) {
  return {
    x: e.x - t.x,
    y: e.y - t.y
  };
}
function ec(e, t) {
  if (e.side === "top" || e.side === "bottom") {
    const {
      side: n,
      align: o
    } = e, i = o === "left" ? 0 : o === "center" ? t.width / 2 : o === "right" ? t.width : o, s = n === "top" ? 0 : n === "bottom" ? t.height : n;
    return El({
      x: i,
      y: s
    }, t);
  } else if (e.side === "left" || e.side === "right") {
    const {
      side: n,
      align: o
    } = e, i = n === "left" ? 0 : n === "right" ? t.width : n, s = o === "top" ? 0 : o === "center" ? t.height / 2 : o === "bottom" ? t.height : o;
    return El({
      x: i,
      y: s
    }, t);
  }
  return El({
    x: t.width / 2,
    y: t.height / 2
  }, t);
}
const wm = {
  static: Z_,
  // specific viewport position, usually centered
  connected: e0
  // connected to a certain element
}, X_ = K({
  locationStrategy: {
    type: [String, Function],
    default: "static",
    validator: (e) => typeof e == "function" || e in wm
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
function J_(e, t) {
  const n = le({}), o = le();
  ze && No(() => !!(t.isActive.value && e.locationStrategy), (s) => {
    var l, r;
    Ce(() => e.locationStrategy, s), Zt(() => {
      window.removeEventListener("resize", i), o.value = void 0;
    }), window.addEventListener("resize", i, {
      passive: !0
    }), typeof e.locationStrategy == "function" ? o.value = (l = e.locationStrategy(t, e, n)) == null ? void 0 : l.updateLocation : o.value = (r = wm[e.locationStrategy](t, e, n)) == null ? void 0 : r.updateLocation;
  });
  function i(s) {
    var l;
    (l = o.value) == null || l.call(o, s);
  }
  return {
    contentStyles: n,
    updateLocation: o
  };
}
function Z_() {
}
function Q_(e, t) {
  const n = Hr(e);
  return t ? n.x += parseFloat(e.style.right || 0) : n.x -= parseFloat(e.style.left || 0), n.y -= parseFloat(e.style.top || 0), n;
}
function e0(e, t, n) {
  (Array.isArray(e.target.value) || Qp(e.target.value)) && Object.assign(n.value, {
    position: "fixed",
    top: 0,
    [e.isRtl.value ? "right" : "left"]: 0
  });
  const {
    preferredAnchor: i,
    preferredOrigin: s
  } = Br(() => {
    const h = Xl(t.location, e.isRtl.value), g = t.origin === "overlap" ? h : t.origin === "auto" ? yl(h) : Xl(t.origin, e.isRtl.value);
    return h.side === g.side && h.align === bl(g).align ? {
      preferredAnchor: yu(h),
      preferredOrigin: yu(g)
    } : {
      preferredAnchor: h,
      preferredOrigin: g
    };
  }), [l, r, a, d] = ["minWidth", "minHeight", "maxWidth", "maxHeight"].map((h) => y(() => {
    const g = parseFloat(t[h]);
    return isNaN(g) ? 1 / 0 : g;
  })), u = y(() => {
    if (Array.isArray(t.offset))
      return t.offset;
    if (typeof t.offset == "string") {
      const h = t.offset.split(" ").map(parseFloat);
      return h.length < 2 && h.push(0), h;
    }
    return typeof t.offset == "number" ? [t.offset, 0] : [0, 0];
  });
  let c = !1;
  const m = new ResizeObserver(() => {
    c && v();
  });
  Ce([e.target, e.contentEl], (h, g) => {
    let [_, x] = h, [V, A] = g;
    V && !Array.isArray(V) && m.unobserve(V), _ && !Array.isArray(_) && m.observe(_), A && m.unobserve(A), x && m.observe(x);
  }, {
    immediate: !0
  }), Zt(() => {
    m.disconnect();
  });
  function v() {
    if (c = !1, requestAnimationFrame(() => c = !0), !e.target.value || !e.contentEl.value) return;
    const h = tf(e.target.value), g = Q_(e.contentEl.value, e.isRtl.value), _ = ks(e.contentEl.value), x = 12;
    _.length || (_.push(document.documentElement), e.contentEl.value.style.top && e.contentEl.value.style.left || (g.x -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-x") || 0), g.y -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-y") || 0)));
    const V = _.reduce((M, k) => {
      const I = k.getBoundingClientRect(), L = new ko({
        x: k === document.documentElement ? 0 : I.x,
        y: k === document.documentElement ? 0 : I.y,
        width: k.clientWidth,
        height: k.clientHeight
      });
      return M ? new ko({
        x: Math.max(M.left, L.left),
        y: Math.max(M.top, L.top),
        width: Math.min(M.right, L.right) - Math.max(M.left, L.left),
        height: Math.min(M.bottom, L.bottom) - Math.max(M.top, L.top)
      }) : L;
    }, void 0);
    V.x += x, V.y += x, V.width -= x * 2, V.height -= x * 2;
    let A = {
      anchor: i.value,
      origin: s.value
    };
    function D(M) {
      const k = new ko(g), I = ec(M.anchor, h), L = ec(M.origin, k);
      let {
        x: J,
        y: re
      } = q_(I, L);
      switch (M.anchor.side) {
        case "top":
          re -= u.value[0];
          break;
        case "bottom":
          re += u.value[0];
          break;
        case "left":
          J -= u.value[0];
          break;
        case "right":
          J += u.value[0];
          break;
      }
      switch (M.anchor.align) {
        case "top":
          re -= u.value[1];
          break;
        case "bottom":
          re += u.value[1];
          break;
        case "left":
          J -= u.value[1];
          break;
        case "right":
          J += u.value[1];
          break;
      }
      return k.x += J, k.y += re, k.width = Math.min(k.width, a.value), k.height = Math.min(k.height, d.value), {
        overflows: _u(k, V),
        x: J,
        y: re
      };
    }
    let C = 0, E = 0;
    const F = {
      x: 0,
      y: 0
    }, N = {
      x: !1,
      y: !1
    };
    let O = -1;
    for (; ; ) {
      if (O++ > 10) {
        ws("Infinite loop detected in connectedLocationStrategy");
        break;
      }
      const {
        x: M,
        y: k,
        overflows: I
      } = D(A);
      C += M, E += k, g.x += M, g.y += k;
      {
        const L = bu(A.anchor), J = I.x.before || I.x.after, re = I.y.before || I.y.after;
        let oe = !1;
        if (["x", "y"].forEach((Z) => {
          if (Z === "x" && J && !N.x || Z === "y" && re && !N.y) {
            const Ee = {
              anchor: {
                ...A.anchor
              },
              origin: {
                ...A.origin
              }
            }, G = Z === "x" ? L === "y" ? bl : yl : L === "y" ? yl : bl;
            Ee.anchor = G(Ee.anchor), Ee.origin = G(Ee.origin);
            const {
              overflows: q
            } = D(Ee);
            (q[Z].before <= I[Z].before && q[Z].after <= I[Z].after || q[Z].before + q[Z].after < (I[Z].before + I[Z].after) / 2) && (A = Ee, oe = N[Z] = !0);
          }
        }), oe) continue;
      }
      I.x.before && (C += I.x.before, g.x += I.x.before), I.x.after && (C -= I.x.after, g.x -= I.x.after), I.y.before && (E += I.y.before, g.y += I.y.before), I.y.after && (E -= I.y.after, g.y -= I.y.after);
      {
        const L = _u(g, V);
        F.x = V.width - L.x.before - L.x.after, F.y = V.height - L.y.before - L.y.after, C += L.x.before, g.x += L.x.before, E += L.y.before, g.y += L.y.before;
      }
      break;
    }
    const $ = bu(A.anchor);
    return Object.assign(n.value, {
      "--v-overlay-anchor-origin": `${A.anchor.side} ${A.anchor.align}`,
      transformOrigin: `${A.origin.side} ${A.origin.align}`,
      // transform: `translate(${pixelRound(x)}px, ${pixelRound(y)}px)`,
      top: ye(xl(E)),
      left: e.isRtl.value ? void 0 : ye(xl(C)),
      right: e.isRtl.value ? ye(xl(-C)) : void 0,
      minWidth: ye($ === "y" ? Math.min(l.value, h.width) : l.value),
      maxWidth: ye(tc(Vn(F.x, l.value === 1 / 0 ? 0 : l.value, a.value))),
      maxHeight: ye(tc(Vn(F.y, r.value === 1 / 0 ? 0 : r.value, d.value)))
    }), {
      available: F,
      contentBox: g
    };
  }
  return Ce(() => [i.value, s.value, t.offset, t.minWidth, t.minHeight, t.maxWidth, t.maxHeight], () => v()), Et(() => {
    const h = v();
    if (!h) return;
    const {
      available: g,
      contentBox: _
    } = h;
    _.height > g.y && requestAnimationFrame(() => {
      v(), requestAnimationFrame(() => {
        v();
      });
    });
  }), {
    updateLocation: v
  };
}
function xl(e) {
  return Math.round(e * devicePixelRatio) / devicePixelRatio;
}
function tc(e) {
  return Math.ceil(e * devicePixelRatio) / devicePixelRatio;
}
let sr = !0;
const Ds = [];
function t0(e) {
  !sr || Ds.length ? (Ds.push(e), lr()) : (sr = !1, e(), lr());
}
let nc = -1;
function lr() {
  cancelAnimationFrame(nc), nc = requestAnimationFrame(() => {
    const e = Ds.shift();
    e && e(), Ds.length ? lr() : sr = !0;
  });
}
const ss = {
  none: null,
  close: i0,
  block: s0,
  reposition: l0
}, n0 = K({
  scrollStrategy: {
    type: [String, Function],
    default: "block",
    validator: (e) => typeof e == "function" || e in ss
  }
}, "VOverlay-scroll-strategies");
function o0(e, t) {
  if (!ze) return;
  let n;
  An(async () => {
    n == null || n.stop(), t.isActive.value && e.scrollStrategy && (n = gr(), await new Promise((o) => setTimeout(o)), n.active && n.run(() => {
      var o;
      typeof e.scrollStrategy == "function" ? e.scrollStrategy(t, e, n) : (o = ss[e.scrollStrategy]) == null || o.call(ss, t, e, n);
    }));
  }), Zt(() => {
    n == null || n.stop();
  });
}
function i0(e) {
  function t(n) {
    e.isActive.value = !1;
  }
  Sm(e.targetEl.value ?? e.contentEl.value, t);
}
function s0(e, t) {
  var l;
  const n = (l = e.root.value) == null ? void 0 : l.offsetParent, o = [.../* @__PURE__ */ new Set([...ks(e.targetEl.value, t.contained ? n : void 0), ...ks(e.contentEl.value, t.contained ? n : void 0)])].filter((r) => !r.classList.contains("v-overlay-scroll-blocked")), i = window.innerWidth - document.documentElement.offsetWidth, s = ((r) => Wr(r) && r)(n || document.documentElement);
  s && e.root.value.classList.add("v-overlay--scroll-blocked"), o.forEach((r, a) => {
    r.style.setProperty("--v-body-scroll-x", ye(-r.scrollLeft)), r.style.setProperty("--v-body-scroll-y", ye(-r.scrollTop)), r !== document.documentElement && r.style.setProperty("--v-scrollbar-offset", ye(i)), r.classList.add("v-overlay-scroll-blocked");
  }), Zt(() => {
    o.forEach((r, a) => {
      const d = parseFloat(r.style.getPropertyValue("--v-body-scroll-x")), u = parseFloat(r.style.getPropertyValue("--v-body-scroll-y")), c = r.style.scrollBehavior;
      r.style.scrollBehavior = "auto", r.style.removeProperty("--v-body-scroll-x"), r.style.removeProperty("--v-body-scroll-y"), r.style.removeProperty("--v-scrollbar-offset"), r.classList.remove("v-overlay-scroll-blocked"), r.scrollLeft = -d, r.scrollTop = -u, r.style.scrollBehavior = c;
    }), s && e.root.value.classList.remove("v-overlay--scroll-blocked");
  });
}
function l0(e, t, n) {
  let o = !1, i = -1, s = -1;
  function l(r) {
    t0(() => {
      var u, c;
      const a = performance.now();
      (c = (u = e.updateLocation).value) == null || c.call(u, r), o = (performance.now() - a) / (1e3 / 60) > 2;
    });
  }
  s = (typeof requestIdleCallback > "u" ? (r) => r() : requestIdleCallback)(() => {
    n.run(() => {
      Sm(e.targetEl.value ?? e.contentEl.value, (r) => {
        o ? (cancelAnimationFrame(i), i = requestAnimationFrame(() => {
          i = requestAnimationFrame(() => {
            l(r);
          });
        })) : l(r);
      });
    });
  }), Zt(() => {
    typeof cancelIdleCallback < "u" && cancelIdleCallback(s), cancelAnimationFrame(i);
  });
}
function Sm(e, t) {
  const n = [document, ...ks(e)];
  n.forEach((o) => {
    o.addEventListener("scroll", t, {
      passive: !0
    });
  }), Zt(() => {
    n.forEach((o) => {
      o.removeEventListener("scroll", t);
    });
  });
}
const r0 = Symbol.for("vuetify:v-menu"), a0 = K({
  closeDelay: [Number, String],
  openDelay: [Number, String]
}, "delay");
function u0(e, t) {
  let n = () => {
  };
  function o(l) {
    n == null || n();
    const r = Number(l ? e.openDelay : e.closeDelay);
    return new Promise((a) => {
      n = bp(r, () => {
        t == null || t(l), a(l);
      });
    });
  }
  function i() {
    return o(!0);
  }
  function s() {
    return o(!1);
  }
  return {
    clearDelay: n,
    runOpenDelay: i,
    runCloseDelay: s
  };
}
const c0 = K({
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
  ...a0()
}, "VOverlay-activator");
function d0(e, t) {
  let {
    isActive: n,
    isTop: o,
    contentEl: i
  } = t;
  const s = et("useActivator"), l = le();
  let r = !1, a = !1, d = !0;
  const u = y(() => e.openOnFocus || e.openOnFocus == null && e.openOnHover), c = y(() => e.openOnClick || e.openOnClick == null && !e.openOnHover && !u.value), {
    runOpenDelay: m,
    runCloseDelay: v
  } = u0(e, (N) => {
    N === (e.openOnHover && r || u.value && a) && !(e.openOnHover && n.value && !o.value) && (n.value !== N && (d = !0), n.value = N);
  }), h = le(), g = {
    onClick: (N) => {
      N.stopPropagation(), l.value = N.currentTarget || N.target, n.value || (h.value = [N.clientX, N.clientY]), n.value = !n.value;
    },
    onMouseenter: (N) => {
      var O;
      (O = N.sourceCapabilities) != null && O.firesTouchEvents || (r = !0, l.value = N.currentTarget || N.target, m());
    },
    onMouseleave: (N) => {
      r = !1, v();
    },
    onFocus: (N) => {
      yp(N.target, ":focus-visible") !== !1 && (a = !0, N.stopPropagation(), l.value = N.currentTarget || N.target, m());
    },
    onBlur: (N) => {
      a = !1, N.stopPropagation(), v();
    }
  }, _ = y(() => {
    const N = {};
    return c.value && (N.onClick = g.onClick), e.openOnHover && (N.onMouseenter = g.onMouseenter, N.onMouseleave = g.onMouseleave), u.value && (N.onFocus = g.onFocus, N.onBlur = g.onBlur), N;
  }), x = y(() => {
    const N = {};
    if (e.openOnHover && (N.onMouseenter = () => {
      r = !0, m();
    }, N.onMouseleave = () => {
      r = !1, v();
    }), u.value && (N.onFocusin = () => {
      a = !0, m();
    }, N.onFocusout = () => {
      a = !1, v();
    }), e.closeOnContentClick) {
      const O = je(r0, null);
      N.onClick = () => {
        n.value = !1, O == null || O.closeParents();
      };
    }
    return N;
  }), V = y(() => {
    const N = {};
    return e.openOnHover && (N.onMouseenter = () => {
      d && (r = !0, d = !1, m());
    }, N.onMouseleave = () => {
      r = !1, v();
    }), N;
  });
  Ce(o, (N) => {
    var O;
    N && (e.openOnHover && !r && (!u.value || !a) || u.value && !a && (!e.openOnHover || !r)) && !((O = i.value) != null && O.contains(document.activeElement)) && (n.value = !1);
  }), Ce(n, (N) => {
    N || setTimeout(() => {
      h.value = void 0;
    });
  }, {
    flush: "post"
  });
  const A = ql();
  An(() => {
    A.value && Et(() => {
      l.value = A.el;
    });
  });
  const D = ql(), C = y(() => e.target === "cursor" && h.value ? h.value : D.value ? D.el : km(e.target, s) || l.value), E = y(() => Array.isArray(C.value) ? void 0 : C.value);
  let F;
  return Ce(() => !!e.activator, (N) => {
    N && ze ? (F = gr(), F.run(() => {
      f0(e, s, {
        activatorEl: l,
        activatorEvents: _
      });
    })) : F && F.stop();
  }, {
    flush: "post",
    immediate: !0
  }), Zt(() => {
    F == null || F.stop();
  }), {
    activatorEl: l,
    activatorRef: A,
    target: C,
    targetEl: E,
    targetRef: D,
    activatorEvents: _,
    contentEvents: x,
    scrimEvents: V
  };
}
function f0(e, t, n) {
  let {
    activatorEl: o,
    activatorEvents: i
  } = n;
  Ce(() => e.activator, (a, d) => {
    if (d && a !== d) {
      const u = r(d);
      u && l(u);
    }
    a && Et(() => s());
  }, {
    immediate: !0
  }), Ce(() => e.activatorProps, () => {
    s();
  }), Zt(() => {
    l();
  });
  function s() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : r(), d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    a && wp(a, Oe(i.value, d));
  }
  function l() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : r(), d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    a && Sp(a, Oe(i.value, d));
  }
  function r() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : e.activator;
    const d = km(a, t);
    return o.value = (d == null ? void 0 : d.nodeType) === Node.ELEMENT_NODE ? d : void 0, o.value;
  }
}
function km(e, t) {
  var o, i;
  if (!e) return;
  let n;
  if (e === "parent") {
    let s = (i = (o = t == null ? void 0 : t.proxy) == null ? void 0 : o.$el) == null ? void 0 : i.parentNode;
    for (; s != null && s.hasAttribute("data-no-activator"); )
      s = s.parentNode;
    n = s;
  } else typeof e == "string" ? n = document.querySelector(e) : "$el" in e ? n = e.$el : n = e;
  return n;
}
function m0() {
  if (!ze) return Se(!1);
  const {
    ssr: e
  } = gf();
  if (e) {
    const t = Se(!1);
    return Zn(() => {
      t.value = !0;
    }), t;
  } else
    return Se(!0);
}
const Cm = K({
  eager: Boolean
}, "lazy");
function Em(e, t) {
  const n = Se(!1), o = y(() => n.value || e.eager || t.value);
  Ce(t, () => n.value = !0);
  function i() {
    e.eager || (n.value = !1);
  }
  return {
    isBooted: n,
    hasContent: o,
    onAfterLeave: i
  };
}
function ca() {
  const t = et("useScopeId").vnode.scopeId;
  return {
    scopeId: t ? {
      [t]: ""
    } : void 0
  };
}
const oc = Symbol.for("vuetify:stack"), ti = dt([]);
function v0(e, t, n) {
  const o = et("useStack"), i = !n, s = je(oc, void 0), l = dt({
    activeChildren: /* @__PURE__ */ new Set()
  });
  bt(oc, l);
  const r = Se(+t.value);
  No(e, () => {
    var c;
    const u = (c = ti.at(-1)) == null ? void 0 : c[1];
    r.value = u ? u + 10 : +t.value, i && ti.push([o.uid, r.value]), s == null || s.activeChildren.add(o.uid), Zt(() => {
      if (i) {
        const m = ue(ti).findIndex((v) => v[0] === o.uid);
        ti.splice(m, 1);
      }
      s == null || s.activeChildren.delete(o.uid);
    });
  });
  const a = Se(!0);
  i && An(() => {
    var c;
    const u = ((c = ti.at(-1)) == null ? void 0 : c[0]) === o.uid;
    setTimeout(() => a.value = u);
  });
  const d = y(() => !l.activeChildren.size);
  return {
    globalTop: Vi(a),
    localTop: d,
    stackStyles: y(() => ({
      zIndex: r.value
    }))
  };
}
function h0(e) {
  return {
    teleportTarget: y(() => {
      const n = e();
      if (n === !0 || !ze) return;
      const o = n === !1 ? document.body : typeof n == "string" ? document.querySelector(n) : n;
      if (o == null) {
        Ct(`Unable to locate target ${n}`);
        return;
      }
      let i = [...o.children].find((s) => s.matches(".v-overlay-container"));
      return i || (i = document.createElement("div"), i.className = "v-overlay-container", o.appendChild(i)), i;
    })
  };
}
function g0() {
  return !0;
}
function xm(e, t, n) {
  if (!e || Nm(e, n) === !1) return !1;
  const o = uf(t);
  if (typeof ShadowRoot < "u" && o instanceof ShadowRoot && o.host === e.target) return !1;
  const i = (typeof n.value == "object" && n.value.include || (() => []))();
  return i.push(t), !i.some((s) => s == null ? void 0 : s.contains(e.target));
}
function Nm(e, t) {
  return (typeof t.value == "object" && t.value.closeConditional || g0)(e);
}
function p0(e, t, n) {
  const o = typeof n.value == "function" ? n.value : n.value.handler;
  e.shadowTarget = e.target, t._clickOutside.lastMousedownWasOutside && xm(e, t, n) && setTimeout(() => {
    Nm(e, n) && o && o(e);
  }, 0);
}
function ic(e, t) {
  const n = uf(e);
  t(document), typeof ShadowRoot < "u" && n instanceof ShadowRoot && t(n);
}
const y0 = {
  // [data-app] may not be found
  // if using bind, inserted makes
  // sure that the root element is
  // available, iOS does not support
  // clicks on body
  mounted(e, t) {
    const n = (i) => p0(i, e, t), o = (i) => {
      e._clickOutside.lastMousedownWasOutside = xm(i, e, t);
    };
    ic(e, (i) => {
      i.addEventListener("click", n, !0), i.addEventListener("mousedown", o, !0);
    }), e._clickOutside || (e._clickOutside = {
      lastMousedownWasOutside: !1
    }), e._clickOutside[t.instance.$.uid] = {
      onClick: n,
      onMousedown: o
    };
  },
  beforeUnmount(e, t) {
    e._clickOutside && (ic(e, (n) => {
      var s;
      if (!n || !((s = e._clickOutside) != null && s[t.instance.$.uid])) return;
      const {
        onClick: o,
        onMousedown: i
      } = e._clickOutside[t.instance.$.uid];
      n.removeEventListener("click", o, !0), n.removeEventListener("mousedown", i, !0);
    }), delete e._clickOutside[t.instance.$.uid]);
  }
};
function b0(e) {
  const {
    modelValue: t,
    color: n,
    ...o
  } = e;
  return f(xo, {
    name: "fade-transition",
    appear: !0
  }, {
    default: () => [e.modelValue && f("div", Oe({
      class: ["v-overlay__scrim", e.color.backgroundColorClasses.value],
      style: e.color.backgroundColorStyles.value
    }, o), null)]
  });
}
const Vm = K({
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
  ...c0(),
  ...xe(),
  ...Mn(),
  ...Cm(),
  ...X_(),
  ...n0(),
  ...ot(),
  ...Ai()
}, "VOverlay"), rr = ve()({
  name: "VOverlay",
  directives: {
    ClickOutside: y0
  },
  inheritAttrs: !1,
  props: {
    _disableGlobalStack: Boolean,
    ...Vm()
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
    const s = et("VOverlay"), l = le(), r = le(), a = le(), d = at(e, "modelValue"), u = y({
      get: () => d.value,
      set: (ne) => {
        ne && e.disabled || (d.value = ne);
      }
    }), {
      themeClasses: c
    } = vt(e), {
      rtlClasses: m,
      isRtl: v
    } = Ft(), {
      hasContent: h,
      onAfterLeave: g
    } = Em(e, u), _ = $t(y(() => typeof e.scrim == "string" ? e.scrim : null)), {
      globalTop: x,
      localTop: V,
      stackStyles: A
    } = v0(u, ce(e, "zIndex"), e._disableGlobalStack), {
      activatorEl: D,
      activatorRef: C,
      target: E,
      targetEl: F,
      targetRef: N,
      activatorEvents: O,
      contentEvents: $,
      scrimEvents: M
    } = d0(e, {
      isActive: u,
      isTop: V,
      contentEl: a
    }), {
      teleportTarget: k
    } = h0(() => {
      var Be, Ze, Xe;
      const ne = e.attach || e.contained;
      if (ne) return ne;
      const we = ((Be = D == null ? void 0 : D.value) == null ? void 0 : Be.getRootNode()) || ((Xe = (Ze = s.proxy) == null ? void 0 : Ze.$el) == null ? void 0 : Xe.getRootNode());
      return we instanceof ShadowRoot ? we : !1;
    }), {
      dimensionStyles: I
    } = Fn(e), L = m0(), {
      scopeId: J
    } = ca();
    Ce(() => e.disabled, (ne) => {
      ne && (u.value = !1);
    });
    const {
      contentStyles: re,
      updateLocation: oe
    } = J_(e, {
      isRtl: v,
      contentEl: a,
      target: E,
      isActive: u
    });
    o0(e, {
      root: l,
      contentEl: a,
      targetEl: F,
      isActive: u,
      updateLocation: oe
    });
    function Z(ne) {
      i("click:outside", ne), e.persistent ? Ve() : u.value = !1;
    }
    function Ee(ne) {
      return u.value && x.value && // If using scrim, only close if clicking on it rather than anything opened on top
      (!e.scrim || ne.target === r.value || ne instanceof MouseEvent && ne.shadowTarget === r.value);
    }
    ze && Ce(u, (ne) => {
      ne ? window.addEventListener("keydown", G) : window.removeEventListener("keydown", G);
    }, {
      immediate: !0
    }), xt(() => {
      ze && window.removeEventListener("keydown", G);
    });
    function G(ne) {
      var we, Be;
      ne.key === "Escape" && x.value && (e.persistent ? Ve() : (u.value = !1, (we = a.value) != null && we.contains(document.activeElement) && ((Be = D.value) == null || Be.focus())));
    }
    const q = Ab();
    No(() => e.closeOnBack, () => {
      Ib(q, (ne) => {
        x.value && u.value ? (ne(!1), e.persistent ? Ve() : u.value = !1) : ne();
      });
    });
    const ee = le();
    Ce(() => u.value && (e.absolute || e.contained) && k.value == null, (ne) => {
      if (ne) {
        const we = Jp(l.value);
        we && we !== document.scrollingElement && (ee.value = we.scrollTop);
      }
    });
    function Ve() {
      e.noClickAnimation || a.value && mo(a.value, [{
        transformOrigin: "center"
      }, {
        transform: "scale(1.03)"
      }, {
        transformOrigin: "center"
      }], {
        duration: 150,
        easing: bi
      });
    }
    function Ge() {
      i("afterEnter");
    }
    function qe() {
      g(), i("afterLeave");
    }
    return _e(() => {
      var ne;
      return f(Ne, null, [(ne = n.activator) == null ? void 0 : ne.call(n, {
        isActive: u.value,
        targetRef: N,
        props: Oe({
          ref: C
        }, O.value, e.activatorProps)
      }), L.value && h.value && f(dh, {
        disabled: !k.value,
        to: k.value
      }, {
        default: () => [f("div", Oe({
          class: ["v-overlay", {
            "v-overlay--absolute": e.absolute || e.contained,
            "v-overlay--active": u.value,
            "v-overlay--contained": e.contained
          }, c.value, m.value, e.class],
          style: [A.value, {
            "--v-overlay-opacity": e.opacity,
            top: ye(ee.value)
          }, e.style],
          ref: l
        }, J, o), [f(b0, Oe({
          color: _,
          modelValue: u.value && !!e.scrim,
          ref: r
        }, M.value), null), f(un, {
          appear: !0,
          persisted: !0,
          transition: e.transition,
          target: E.value,
          onAfterEnter: Ge,
          onAfterLeave: qe
        }, {
          default: () => {
            var we;
            return [yt(f("div", Oe({
              ref: a,
              class: ["v-overlay__content", e.contentClass],
              style: [I.value, re.value]
            }, $.value, e.contentProps), [(we = n.default) == null ? void 0 : we.call(n, {
              isActive: u
            })]), [[In, u.value], [Vo("click-outside"), {
              handler: Z,
              closeConditional: Ee,
              include: () => [D.value]
            }]])];
          }
        })])]
      })]);
    }), {
      activatorEl: D,
      scrimEl: r,
      target: E,
      animateClick: Ve,
      contentEl: a,
      globalTop: x,
      localTop: V,
      updateLocation: oe
    };
  }
}), Om = K({
  fullscreen: Boolean,
  retainFocus: {
    type: Boolean,
    default: !0
  },
  scrollable: Boolean,
  ...Vm({
    origin: "center center",
    scrollStrategy: "block",
    transition: {
      component: i_
    },
    zIndex: 2400
  })
}, "VDialog"), En = ve()({
  name: "VDialog",
  props: Om(),
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
    const i = at(e, "modelValue"), {
      scopeId: s
    } = ca(), l = le();
    function r(u) {
      var v, h;
      const c = u.relatedTarget, m = u.target;
      if (c !== m && ((v = l.value) != null && v.contentEl) && // We're the topmost dialog
      ((h = l.value) != null && h.globalTop) && // It isn't the document or the dialog body
      ![document, l.value.contentEl].includes(m) && // It isn't inside the dialog body
      !l.value.contentEl.contains(m)) {
        const g = Rr(l.value.contentEl);
        if (!g.length) return;
        const _ = g[0], x = g[g.length - 1];
        c === _ ? x.focus() : _.focus();
      }
    }
    xt(() => {
      document.removeEventListener("focusin", r);
    }), ze && Ce(() => i.value && e.retainFocus, (u) => {
      u ? document.addEventListener("focusin", r) : document.removeEventListener("focusin", r);
    }, {
      immediate: !0
    });
    function a() {
      var u;
      n("afterEnter"), (u = l.value) != null && u.contentEl && !l.value.contentEl.contains(document.activeElement) && l.value.contentEl.focus({
        preventScroll: !0
      });
    }
    function d() {
      n("afterLeave");
    }
    return Ce(i, async (u) => {
      var c;
      u || (await Et(), (c = l.value.activatorEl) == null || c.focus({
        preventScroll: !0
      }));
    }), _e(() => {
      const u = rr.filterProps(e), c = Oe({
        "aria-haspopup": "dialog"
      }, e.activatorProps), m = Oe({
        tabindex: -1
      }, e.contentProps);
      return f(rr, Oe({
        ref: l,
        class: ["v-dialog", {
          "v-dialog--fullscreen": e.fullscreen,
          "v-dialog--scrollable": e.scrollable
        }, e.class],
        style: e.style
      }, u, {
        modelValue: i.value,
        "onUpdate:modelValue": (v) => i.value = v,
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
      }, s), {
        activator: o.activator,
        default: function() {
          for (var v = arguments.length, h = new Array(v), g = 0; g < v; g++)
            h[g] = arguments[g];
          return f(mt, {
            root: "VDialog"
          }, {
            default: () => {
              var _;
              return [(_ = o.default) == null ? void 0 : _.call(o, ...h)];
            }
          });
        }
      });
    }), nl({}, l);
  }
}), _0 = {
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
}, w0 = { class: "px-4 py-2" }, S0 = { class: "px-4 py-2" }, k0 = { class: "my-2" };
function C0(e, t, n, o, i, s) {
  return ae(), ke(Pt, null, {
    default: b(() => [
      f(vo, { class: "text-center" }, {
        default: b(() => t[14] || (t[14] = [
          Q(" 消息 ")
        ])),
        _: 1
      }),
      se("div", w0, [
        f(Pt, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "用户信息"
        }, {
          default: b(() => [
            f(xn, null, {
              default: b(() => [
                f(Re, {
                  class: "text-right",
                  onClick: s.alert_avatar
                }, {
                  prepend: b(() => t[15] || (t[15] = [
                    se("span", null, "头像", -1)
                  ])),
                  append: b(() => [
                    f(cn, {
                      image: n.user.avatar
                    }, null, 8, ["image"])
                  ]),
                  _: 1
                }, 8, ["onClick"]),
                f(Re, {
                  class: "text-right",
                  title: n.user.email
                }, {
                  prepend: b(() => t[16] || (t[16] = [
                    se("span", null, "邮箱", -1)
                  ])),
                  _: 1
                }, 8, ["title"]),
                f(Re, {
                  class: "text-right",
                  onClick: t[0] || (t[0] = (l) => e.editNickname = !0),
                  title: n.user.nickname
                }, {
                  prepend: b(() => t[17] || (t[17] = [
                    se("span", null, "昵称", -1)
                  ])),
                  append: b(() => [
                    f(Me, null, {
                      default: b(() => t[18] || (t[18] = [
                        Q("mdi-chevron-right")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["title"]),
                f(Re, {
                  class: "text-right",
                  onClick: t[1] || (t[1] = (l) => e.editPassword = !0),
                  title: "(点击更改)",
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: b(() => t[19] || (t[19] = [
                    se("span", null, "密码", -1)
                  ])),
                  _: 1
                }),
                f(Re, {
                  class: "text-right",
                  onClick: t[2] || (t[2] = (l) => e.checkLogout = !0),
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: b(() => t[20] || (t[20] = [
                    se("span", null, "退出登录", -1)
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
      se("div", S0, [
        f(Pt, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "章评互动信息"
        }, {
          default: b(() => [
            n.messages.length === 0 ? (ae(), ke(xn, {
              key: 0,
              density: "compact",
              class: "mr-4"
            }, {
              default: b(() => [
                f(Re, { class: "my-4" }, {
                  default: b(() => [
                    f(tl, { class: "text-center" }, {
                      default: b(() => t[21] || (t[21] = [
                        Q("无新的互动消息")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })) : ct("", !0),
            f(xn, {
              id: "book-comments",
              density: "compact",
              class: "mr-4"
            }, {
              default: b(() => [
                (ae(!0), lt(Ne, null, fn(n.messages, (l) => (ae(), ke(Re, {
                  key: l.id,
                  class: "pr-0 align-self-start mb-4",
                  "prepend-avatar": l.avatar,
                  subtitle: l.nickName + " @《宿命之环》"
                }, {
                  default: b(() => [
                    se("div", k0, Te(s.thumb_or_content(l)), 1),
                    f(Pt, {
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
      f(En, {
        modelValue: e.editAvatar,
        "onUpdate:modelValue": t[3] || (t[3] = (l) => e.editAvatar = l),
        persistent: ""
      }, {
        default: b(() => [
          f(ii)
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(En, {
        modelValue: e.editNickname,
        "onUpdate:modelValue": t[6] || (t[6] = (l) => e.editNickname = l),
        persistent: ""
      }, {
        default: b(() => [
          f(Pt, null, {
            default: b(() => [
              f(vo, { class: "text-center" }, {
                default: b(() => t[22] || (t[22] = [
                  Q("修改昵称")
                ])),
                _: 1
              }),
              f(Xn, null, {
                default: b(() => [
                  f(Gt, {
                    modelValue: e.newNickname,
                    "onUpdate:modelValue": t[4] || (t[4] = (l) => e.newNickname = l),
                    label: "新昵称"
                  }, null, 8, ["modelValue"]),
                  e.alert.msg ? (ae(), ke(ii, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: b(() => [
                      Q(Te(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : ct("", !0)
                ]),
                _: 1
              }),
              f(zo, null, {
                default: b(() => [
                  f(fe, {
                    text: "",
                    onClick: t[5] || (t[5] = (l) => e.editNickname = !1)
                  }, {
                    default: b(() => t[23] || (t[23] = [
                      Q("取消")
                    ])),
                    _: 1
                  }),
                  f(fe, {
                    text: "",
                    onClick: s.saveNickname
                  }, {
                    default: b(() => t[24] || (t[24] = [
                      Q("保存")
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
      f(En, {
        modelValue: e.editPassword,
        "onUpdate:modelValue": t[11] || (t[11] = (l) => e.editPassword = l),
        persistent: "",
        "z-index": "2999"
      }, {
        default: b(() => [
          f(Pt, null, {
            default: b(() => [
              f(vo, { class: "text-center" }, {
                default: b(() => t[25] || (t[25] = [
                  Q("修改密码")
                ])),
                _: 1
              }),
              f(Xn, null, {
                default: b(() => [
                  f(Gt, {
                    modelValue: e.oldPassword,
                    "onUpdate:modelValue": t[7] || (t[7] = (l) => e.oldPassword = l),
                    label: "当前密码"
                  }, null, 8, ["modelValue"]),
                  f(Gt, {
                    modelValue: e.newPassword,
                    "onUpdate:modelValue": t[8] || (t[8] = (l) => e.newPassword = l),
                    label: "新密码",
                    rules: [e.rules.pass]
                  }, null, 8, ["modelValue", "rules"]),
                  f(Gt, {
                    modelValue: e.examPassword,
                    "onUpdate:modelValue": t[9] || (t[9] = (l) => e.examPassword = l),
                    label: "确认密码",
                    rules: [s.double_check_password]
                  }, null, 8, ["modelValue", "rules"]),
                  e.alert.msg ? (ae(), ke(ii, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: b(() => [
                      Q(Te(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : ct("", !0)
                ]),
                _: 1
              }),
              f(zo, null, {
                default: b(() => [
                  f(fe, {
                    text: "",
                    onClick: t[10] || (t[10] = (l) => e.editPassword = !1)
                  }, {
                    default: b(() => t[26] || (t[26] = [
                      Q("取消")
                    ])),
                    _: 1
                  }),
                  f(fe, {
                    text: "",
                    onClick: s.savePassword
                  }, {
                    default: b(() => t[27] || (t[27] = [
                      Q("保存")
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
      f(En, {
        modelValue: e.checkLogout,
        "onUpdate:modelValue": t[13] || (t[13] = (l) => e.checkLogout = l),
        persistent: ""
      }, {
        default: b(() => [
          f(Pt, null, {
            default: b(() => [
              f(vo, { class: "text-center" }, {
                default: b(() => t[28] || (t[28] = [
                  Q("请确认")
                ])),
                _: 1
              }),
              f(Xn, null, {
                default: b(() => [
                  t[29] || (t[29] = Q(" 是否要退出登录？ ")),
                  e.alert.msg ? (ae(), ke(ii, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: b(() => [
                      Q(Te(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : ct("", !0)
                ]),
                _: 1
              }),
              f(zo, null, {
                default: b(() => [
                  f(fe, {
                    text: "",
                    onClick: t[12] || (t[12] = (l) => e.checkLogout = !1)
                  }, {
                    default: b(() => t[30] || (t[30] = [
                      Q("取消")
                    ])),
                    _: 1
                  }),
                  f(fe, {
                    text: "",
                    onClick: s.do_logout
                  }, {
                    default: b(() => t[31] || (t[31] = [
                      Q("确认")
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
const Tm = /* @__PURE__ */ $n(_0, [["render", C0], ["__scopeId", "data-v-924d6d99"]]), E0 = K({
  ...xe(),
  ...F_()
}, "VForm"), Nl = ve()({
  name: "VForm",
  props: E0(),
  emits: {
    "update:modelValue": (e) => !0,
    submit: (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = L_(e), s = le();
    function l(a) {
      a.preventDefault(), i.reset();
    }
    function r(a) {
      const d = a, u = i.validate();
      d.then = u.then.bind(u), d.catch = u.catch.bind(u), d.finally = u.finally.bind(u), o("submit", d), d.defaultPrevented || u.then((c) => {
        var v;
        let {
          valid: m
        } = c;
        m && ((v = s.value) == null || v.submit());
      }), d.preventDefault();
    }
    return _e(() => {
      var a;
      return f("form", {
        ref: s,
        class: ["v-form", e.class],
        style: e.style,
        novalidate: !0,
        onReset: l,
        onSubmit: r
      }, [(a = n.default) == null ? void 0 : a.call(n, i)]);
    }), nl(i, s);
  }
}), x0 = {
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
function N0(e, t, n, o, i, s) {
  return ae(), ke(Pt, { title: "登录到书评系统" }, {
    default: b(() => [
      f(vn),
      f(Uf, null, {
        default: b(() => [
          e.mode == "login" ? (ae(), ke(Nl, {
            key: 0,
            onSubmit: ns(s.do_login, ["prevent"])
          }, {
            default: b(() => [
              f(Gt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[0] || (t[0] = (l) => e.email = l),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              f(Gt, {
                "prepend-icon": "mdi-lock",
                modelValue: e.password,
                "onUpdate:modelValue": t[1] || (t[1] = (l) => e.password = l),
                label: "密码",
                type: "password"
              }, null, 8, ["modelValue"]),
              f(fe, {
                type: "submit",
                color: "primary"
              }, {
                default: b(() => t[8] || (t[8] = [
                  Q("登录")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "forget" ? (ae(), ke(Nl, {
            key: 1,
            onSubmit: ns(s.do_reset, ["prevent"])
          }, {
            default: b(() => [
              f(Gt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[2] || (t[2] = (l) => e.email = l),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              f(fe, {
                type: "submit",
                color: "red"
              }, {
                default: b(() => t[9] || (t[9] = [
                  Q("重置密码")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "signup" ? (ae(), ke(Nl, {
            key: 2,
            ref: "form",
            onSubmit: ns(s.do_signup, ["prevent"])
          }, {
            default: b(() => [
              f(Gt, {
                required: "",
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[3] || (t[3] = (l) => e.email = l),
                label: "邮箱",
                type: "text",
                autocomplete: "new-email",
                rules: [e.rules.email]
              }, null, 8, ["modelValue", "rules"]),
              f(Gt, {
                required: "",
                "prepend-icon": "mdi-guy-fawkes-mask",
                modelValue: e.nickname,
                "onUpdate:modelValue": t[4] || (t[4] = (l) => e.nickname = l),
                label: "昵称",
                type: "text",
                autocomplete: "new-nickname",
                rules: [e.rules.nick]
              }, null, 8, ["modelValue", "rules"]),
              f(fe, {
                type: "submit",
                color: "green"
              }, {
                default: b(() => t[10] || (t[10] = [
                  Q("注册")
                ])),
                _: 1
              }),
              t[11] || (t[11] = se("p", { class: "text-small" }, " * 账号密码将随机生成，并发往邮箱", -1))
            ]),
            _: 1
          }, 8, ["onSubmit"])) : ct("", !0)
        ]),
        _: 1
      }),
      e.alert.msg ? (ae(), ke(ii, {
        key: 0,
        type: e.alert.type
      }, {
        default: b(() => [
          Q(Te(e.alert.msg), 1)
        ]),
        _: 1
      }, 8, ["type"])) : ct("", !0),
      f(vn),
      f(zo, null, {
        default: b(() => [
          e.mode == "login" ? (ae(), ke(fe, {
            key: 0,
            onClick: t[5] || (t[5] = (l) => e.mode = "forget"),
            text: "忘记密码?"
          })) : ct("", !0),
          e.mode != "login" ? (ae(), ke(fe, {
            key: 1,
            onClick: t[6] || (t[6] = (l) => e.mode = "login"),
            text: "登录账号"
          })) : ct("", !0),
          f(or),
          f(fe, {
            onClick: t[7] || (t[7] = (l) => e.mode = "signup"),
            text: "快速注册"
          })
        ]),
        _: 1
      })
    ]),
    _: 1
  });
}
const Dm = /* @__PURE__ */ $n(x0, [["render", N0]]), da = Symbol.for("vuetify:v-tabs"), V0 = K({
  fixed: Boolean,
  sliderColor: String,
  hideSlider: Boolean,
  direction: {
    type: String,
    default: "horizontal"
  },
  ...Us(Wf({
    selectedClass: "v-tab--selected",
    variant: "text"
  }), ["active", "block", "flat", "location", "position", "symbol"])
}, "VTab"), ar = ve()({
  name: "VTab",
  props: V0(),
  setup(e, t) {
    let {
      slots: n,
      attrs: o
    } = t;
    const {
      textColorClasses: i,
      textColorStyles: s
    } = Ut(e, "sliderColor"), l = le(), r = le(), a = y(() => e.direction === "horizontal"), d = y(() => {
      var c, m;
      return ((m = (c = l.value) == null ? void 0 : c.group) == null ? void 0 : m.isSelected.value) ?? !1;
    });
    function u(c) {
      var v, h;
      let {
        value: m
      } = c;
      if (m) {
        const g = (h = (v = l.value) == null ? void 0 : v.$el.parentElement) == null ? void 0 : h.querySelector(".v-tab--selected .v-tab__slider"), _ = r.value;
        if (!g || !_) return;
        const x = getComputedStyle(g).color, V = g.getBoundingClientRect(), A = _.getBoundingClientRect(), D = a.value ? "x" : "y", C = a.value ? "X" : "Y", E = a.value ? "right" : "bottom", F = a.value ? "width" : "height", N = V[D], O = A[D], $ = N > O ? V[E] - A[E] : V[D] - A[D], M = Math.sign($) > 0 ? a.value ? "right" : "bottom" : Math.sign($) < 0 ? a.value ? "left" : "top" : "center", I = (Math.abs($) + (Math.sign($) < 0 ? V[F] : A[F])) / Math.max(V[F], A[F]) || 0, L = V[F] / A[F] || 0, J = 1.5;
        mo(_, {
          backgroundColor: [x, "currentcolor"],
          transform: [`translate${C}(${$}px) scale${C}(${L})`, `translate${C}(${$ / J}px) scale${C}(${(I - 1) / J + 1})`, "none"],
          transformOrigin: Array(3).fill(M)
        }, {
          duration: 225,
          easing: bi
        });
      }
    }
    return _e(() => {
      const c = fe.filterProps(e);
      return f(fe, Oe({
        symbol: da,
        ref: l,
        class: ["v-tab", e.class],
        style: e.style,
        tabindex: d.value ? 0 : -1,
        role: "tab",
        "aria-selected": String(d.value),
        active: !1
      }, c, o, {
        block: e.fixed,
        maxWidth: e.fixed ? 300 : void 0,
        "onGroup:selected": u
      }), {
        ...n,
        default: () => {
          var m;
          return f(Ne, null, [((m = n.default) == null ? void 0 : m.call(n)) ?? e.text, !e.hideSlider && f("div", {
            ref: r,
            class: ["v-tab__slider", i.value],
            style: s.value
          }, null)]);
        }
      });
    }), nl({}, l);
  }
}), O0 = (e) => {
  const {
    touchstartX: t,
    touchendX: n,
    touchstartY: o,
    touchendY: i
  } = e, s = 0.5, l = 16;
  e.offsetX = n - t, e.offsetY = i - o, Math.abs(e.offsetY) < s * Math.abs(e.offsetX) && (e.left && n < t - l && e.left(e), e.right && n > t + l && e.right(e)), Math.abs(e.offsetX) < s * Math.abs(e.offsetY) && (e.up && i < o - l && e.up(e), e.down && i > o + l && e.down(e));
};
function T0(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchstartX = n.clientX, t.touchstartY = n.clientY, (o = t.start) == null || o.call(t, {
    originalEvent: e,
    ...t
  });
}
function D0(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchendX = n.clientX, t.touchendY = n.clientY, (o = t.end) == null || o.call(t, {
    originalEvent: e,
    ...t
  }), O0(t);
}
function P0(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchmoveX = n.clientX, t.touchmoveY = n.clientY, (o = t.move) == null || o.call(t, {
    originalEvent: e,
    ...t
  });
}
function A0() {
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
    touchstart: (n) => T0(n, t),
    touchend: (n) => D0(n, t),
    touchmove: (n) => P0(n, t)
  };
}
function I0(e, t) {
  var r;
  const n = t.value, o = n != null && n.parent ? e.parentElement : e, i = (n == null ? void 0 : n.options) ?? {
    passive: !0
  }, s = (r = t.instance) == null ? void 0 : r.$.uid;
  if (!o || !s) return;
  const l = A0(t.value);
  o._touchHandlers = o._touchHandlers ?? /* @__PURE__ */ Object.create(null), o._touchHandlers[s] = l, Yd(l).forEach((a) => {
    o.addEventListener(a, l[a], i);
  });
}
function $0(e, t) {
  var s, l;
  const n = (s = t.value) != null && s.parent ? e.parentElement : e, o = (l = t.instance) == null ? void 0 : l.$.uid;
  if (!(n != null && n._touchHandlers) || !o) return;
  const i = n._touchHandlers[o];
  Yd(i).forEach((r) => {
    n.removeEventListener(r, i[r]);
  }), delete n._touchHandlers[o];
}
const Pm = {
  mounted: I0,
  unmounted: $0
}, Am = Symbol.for("vuetify:v-window"), Im = Symbol.for("vuetify:v-window-group"), $m = K({
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
  ...xe(),
  ...Ke(),
  ...ot()
}, "VWindow"), sc = ve()({
  name: "VWindow",
  directives: {
    Touch: Pm
  },
  props: $m(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = vt(e), {
      isRtl: i
    } = Ft(), {
      t: s
    } = Gs(), l = Qs(e, Im), r = le(), a = y(() => i.value ? !e.reverse : e.reverse), d = Se(!1), u = y(() => {
      const D = e.direction === "vertical" ? "y" : "x", E = (a.value ? !d.value : d.value) ? "-reverse" : "";
      return `v-window-${D}${E}-transition`;
    }), c = Se(0), m = le(void 0), v = y(() => l.items.value.findIndex((D) => l.selected.value.includes(D.id)));
    Ce(v, (D, C) => {
      const E = l.items.value.length, F = E - 1;
      E <= 2 ? d.value = D < C : D === F && C === 0 ? d.value = !0 : D === 0 && C === F ? d.value = !1 : d.value = D < C;
    }), bt(Am, {
      transition: u,
      isReversed: d,
      transitionCount: c,
      transitionHeight: m,
      rootRef: r
    });
    const h = y(() => e.continuous || v.value !== 0), g = y(() => e.continuous || v.value !== l.items.value.length - 1);
    function _() {
      h.value && l.prev();
    }
    function x() {
      g.value && l.next();
    }
    const V = y(() => {
      const D = [], C = {
        icon: i.value ? e.nextIcon : e.prevIcon,
        class: `v-window__${a.value ? "right" : "left"}`,
        onClick: l.prev,
        "aria-label": s("$vuetify.carousel.prev")
      };
      D.push(h.value ? n.prev ? n.prev({
        props: C
      }) : f(fe, C, null) : f("div", null, null));
      const E = {
        icon: i.value ? e.prevIcon : e.nextIcon,
        class: `v-window__${a.value ? "left" : "right"}`,
        onClick: l.next,
        "aria-label": s("$vuetify.carousel.next")
      };
      return D.push(g.value ? n.next ? n.next({
        props: E
      }) : f(fe, E, null) : f("div", null, null)), D;
    }), A = y(() => e.touch === !1 ? e.touch : {
      ...{
        left: () => {
          a.value ? _() : x();
        },
        right: () => {
          a.value ? x() : _();
        },
        start: (C) => {
          let {
            originalEvent: E
          } = C;
          E.stopPropagation();
        }
      },
      ...e.touch === !0 ? {} : e.touch
    });
    return _e(() => yt(f(e.tag, {
      ref: r,
      class: ["v-window", {
        "v-window--show-arrows-on-hover": e.showArrows === "hover"
      }, o.value, e.class],
      style: e.style
    }, {
      default: () => {
        var D, C;
        return [f("div", {
          class: "v-window__container",
          style: {
            height: m.value
          }
        }, [(D = n.default) == null ? void 0 : D.call(n, {
          group: l
        }), e.showArrows !== !1 && f("div", {
          class: "v-window__controls"
        }, [V.value])]), (C = n.additional) == null ? void 0 : C.call(n, {
          group: l
        })];
      }
    }), [[Vo("touch"), A.value]])), {
      group: l
    };
  }
}), M0 = K({
  ...Us($m(), ["continuous", "nextIcon", "prevIcon", "showArrows", "touch", "mandatory"])
}, "VTabsWindow"), F0 = ve()({
  name: "VTabsWindow",
  props: M0(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = je(da, null), i = at(e, "modelValue"), s = y({
      get() {
        var l;
        return i.value != null || !o ? i.value : (l = o.items.value.find((r) => o.selected.value.includes(r.id))) == null ? void 0 : l.value;
      },
      set(l) {
        i.value = l;
      }
    });
    return _e(() => {
      const l = sc.filterProps(e);
      return f(sc, Oe({
        _as: "VTabsWindow"
      }, l, {
        modelValue: s.value,
        "onUpdate:modelValue": (r) => s.value = r,
        class: ["v-tabs-window", e.class],
        style: e.style,
        mandatory: !1,
        touch: !1
      }), n);
    }), {};
  }
}), Mm = K({
  reverseTransition: {
    type: [Boolean, String],
    default: void 0
  },
  transition: {
    type: [Boolean, String],
    default: void 0
  },
  ...xe(),
  ...Tf(),
  ...Cm()
}, "VWindowItem"), lc = ve()({
  name: "VWindowItem",
  directives: {
    Touch: Pm
  },
  props: Mm(),
  emits: {
    "group:selected": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = je(Am), i = Df(e, Im), {
      isBooted: s
    } = Li();
    if (!o || !i) throw new Error("[Vuetify] VWindowItem must be used inside VWindow");
    const l = Se(!1), r = y(() => s.value && (o.isReversed.value ? e.reverseTransition !== !1 : e.transition !== !1));
    function a() {
      !l.value || !o || (l.value = !1, o.transitionCount.value > 0 && (o.transitionCount.value -= 1, o.transitionCount.value === 0 && (o.transitionHeight.value = void 0)));
    }
    function d() {
      var h;
      l.value || !o || (l.value = !0, o.transitionCount.value === 0 && (o.transitionHeight.value = ye((h = o.rootRef.value) == null ? void 0 : h.clientHeight)), o.transitionCount.value += 1);
    }
    function u() {
      a();
    }
    function c(h) {
      l.value && Et(() => {
        !r.value || !l.value || !o || (o.transitionHeight.value = ye(h.clientHeight));
      });
    }
    const m = y(() => {
      const h = o.isReversed.value ? e.reverseTransition : e.transition;
      return r.value ? {
        name: typeof h != "string" ? o.transition.value : h,
        onBeforeEnter: d,
        onAfterEnter: a,
        onEnterCancelled: u,
        onBeforeLeave: d,
        onAfterLeave: a,
        onLeaveCancelled: u,
        onEnter: c
      } : !1;
    }), {
      hasContent: v
    } = Em(e, i.isSelected);
    return _e(() => f(un, {
      transition: m.value,
      disabled: !s.value
    }, {
      default: () => {
        var h;
        return [yt(f("div", {
          class: ["v-window-item", i.selectedClass.value, e.class],
          style: e.style
        }, [v.value && ((h = n.default) == null ? void 0 : h.call(n))]), [[In, i.isSelected.value]])];
      }
    })), {
      groupItem: i
    };
  }
}), L0 = K({
  ...Mm()
}, "VTabsWindowItem"), B0 = ve()({
  name: "VTabsWindowItem",
  props: L0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => {
      const o = lc.filterProps(e);
      return f(lc, Oe({
        _as: "VTabsWindowItem"
      }, o, {
        class: ["v-tabs-window-item", e.class],
        style: e.style
      }), n);
    }), {};
  }
});
function R0(e) {
  let {
    selectedElement: t,
    containerElement: n,
    isRtl: o,
    isHorizontal: i
  } = e;
  const s = Ci(i, n), l = Fm(i, o, n), r = Ci(i, t), a = Lm(i, t), d = r * 0.4;
  return l > a ? a - d : l + s < a + r ? a - s + r + d : l;
}
function H0(e) {
  let {
    selectedElement: t,
    containerElement: n,
    isHorizontal: o
  } = e;
  const i = Ci(o, n), s = Lm(o, t), l = Ci(o, t);
  return s - i / 2 + l / 2;
}
function rc(e, t) {
  const n = e ? "scrollWidth" : "scrollHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function j0(e, t) {
  const n = e ? "clientWidth" : "clientHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function Fm(e, t, n) {
  if (!n)
    return 0;
  const {
    scrollLeft: o,
    offsetWidth: i,
    scrollWidth: s
  } = n;
  return e ? t ? s - i + o : o : n.scrollTop;
}
function Ci(e, t) {
  const n = e ? "offsetWidth" : "offsetHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function Lm(e, t) {
  const n = e ? "offsetLeft" : "offsetTop";
  return (t == null ? void 0 : t[n]) || 0;
}
const z0 = Symbol.for("vuetify:v-slide-group"), Bm = K({
  centerActive: Boolean,
  direction: {
    type: String,
    default: "horizontal"
  },
  symbol: {
    type: null,
    default: z0
  },
  nextIcon: {
    type: Ye,
    default: "$next"
  },
  prevIcon: {
    type: Ye,
    default: "$prev"
  },
  showArrows: {
    type: [Boolean, String],
    validator: (e) => typeof e == "boolean" || ["always", "desktop", "mobile"].includes(e)
  },
  ...xe(),
  ...qy({
    mobile: null
  }),
  ...Ke(),
  ...Yr({
    selectedClass: "v-slide-group-item--active"
  })
}, "VSlideGroup"), ac = ve()({
  name: "VSlideGroup",
  props: Bm(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isRtl: o
    } = Ft(), {
      displayClasses: i,
      mobile: s
    } = gf(e), l = Qs(e, e.symbol), r = Se(!1), a = Se(0), d = Se(0), u = Se(0), c = y(() => e.direction === "horizontal"), {
      resizeRef: m,
      contentRect: v
    } = xs(), {
      resizeRef: h,
      contentRect: g
    } = xs(), _ = Zy(), x = y(() => ({
      container: m.el,
      duration: 200,
      easing: "easeOutQuart"
    })), V = y(() => l.selected.value.length ? l.items.value.findIndex((G) => G.id === l.selected.value[0]) : -1), A = y(() => l.selected.value.length ? l.items.value.findIndex((G) => G.id === l.selected.value[l.selected.value.length - 1]) : -1);
    if (ze) {
      let G = -1;
      Ce(() => [l.selected.value, v.value, g.value, c.value], () => {
        cancelAnimationFrame(G), G = requestAnimationFrame(() => {
          if (v.value && g.value) {
            const q = c.value ? "width" : "height";
            d.value = v.value[q], u.value = g.value[q], r.value = d.value + 1 < u.value;
          }
          if (V.value >= 0 && h.el) {
            const q = h.el.children[A.value];
            C(q, e.centerActive);
          }
        });
      });
    }
    const D = Se(!1);
    function C(G, q) {
      let ee = 0;
      q ? ee = H0({
        containerElement: m.el,
        isHorizontal: c.value,
        selectedElement: G
      }) : ee = R0({
        containerElement: m.el,
        isHorizontal: c.value,
        isRtl: o.value,
        selectedElement: G
      }), E(ee);
    }
    function E(G) {
      if (!ze || !m.el) return;
      const q = Ci(c.value, m.el), ee = Fm(c.value, o.value, m.el);
      if (!(rc(c.value, m.el) <= q || // Prevent scrolling by only a couple of pixels, which doesn't look smooth
      Math.abs(G - ee) < 16)) {
        if (c.value && o.value && m.el) {
          const {
            scrollWidth: Ge,
            offsetWidth: qe
          } = m.el;
          G = Ge - qe - G;
        }
        c.value ? _.horizontal(G, x.value) : _(G, x.value);
      }
    }
    function F(G) {
      const {
        scrollTop: q,
        scrollLeft: ee
      } = G.target;
      a.value = c.value ? ee : q;
    }
    function N(G) {
      if (D.value = !0, !(!r.value || !h.el)) {
        for (const q of G.composedPath())
          for (const ee of h.el.children)
            if (ee === q) {
              C(ee);
              return;
            }
      }
    }
    function O(G) {
      D.value = !1;
    }
    let $ = !1;
    function M(G) {
      var q;
      !$ && !D.value && !(G.relatedTarget && ((q = h.el) != null && q.contains(G.relatedTarget))) && L(), $ = !1;
    }
    function k() {
      $ = !0;
    }
    function I(G) {
      if (!h.el) return;
      function q(ee) {
        G.preventDefault(), L(ee);
      }
      c.value ? G.key === "ArrowRight" ? q(o.value ? "prev" : "next") : G.key === "ArrowLeft" && q(o.value ? "next" : "prev") : G.key === "ArrowDown" ? q("next") : G.key === "ArrowUp" && q("prev"), G.key === "Home" ? q("first") : G.key === "End" && q("last");
    }
    function L(G) {
      var ee, Ve;
      if (!h.el) return;
      let q;
      if (!G)
        q = Rr(h.el)[0];
      else if (G === "next") {
        if (q = (ee = h.el.querySelector(":focus")) == null ? void 0 : ee.nextElementSibling, !q) return L("first");
      } else if (G === "prev") {
        if (q = (Ve = h.el.querySelector(":focus")) == null ? void 0 : Ve.previousElementSibling, !q) return L("last");
      } else G === "first" ? q = h.el.firstElementChild : G === "last" && (q = h.el.lastElementChild);
      q && q.focus({
        preventScroll: !0
      });
    }
    function J(G) {
      const q = c.value && o.value ? -1 : 1, ee = (G === "prev" ? -q : q) * d.value;
      let Ve = a.value + ee;
      if (c.value && o.value && m.el) {
        const {
          scrollWidth: Ge,
          offsetWidth: qe
        } = m.el;
        Ve += Ge - qe;
      }
      E(Ve);
    }
    const re = y(() => ({
      next: l.next,
      prev: l.prev,
      select: l.select,
      isSelected: l.isSelected
    })), oe = y(() => {
      switch (e.showArrows) {
        case "always":
          return !0;
        case "desktop":
          return !s.value;
        case !0:
          return r.value || Math.abs(a.value) > 0;
        case "mobile":
          return s.value || r.value || Math.abs(a.value) > 0;
        default:
          return !s.value && (r.value || Math.abs(a.value) > 0);
      }
    }), Z = y(() => Math.abs(a.value) > 1), Ee = y(() => {
      if (!m.value) return !1;
      const G = rc(c.value, m.el), q = j0(c.value, m.el);
      return G - q - Math.abs(a.value) > 1;
    });
    return _e(() => f(e.tag, {
      class: ["v-slide-group", {
        "v-slide-group--vertical": !c.value,
        "v-slide-group--has-affixes": oe.value,
        "v-slide-group--is-overflowing": r.value
      }, i.value, e.class],
      style: e.style,
      tabindex: D.value || l.selected.value.length ? -1 : 0,
      onFocus: M
    }, {
      default: () => {
        var G, q, ee;
        return [oe.value && f("div", {
          key: "prev",
          class: ["v-slide-group__prev", {
            "v-slide-group__prev--disabled": !Z.value
          }],
          onMousedown: k,
          onClick: () => Z.value && J("prev")
        }, [((G = n.prev) == null ? void 0 : G.call(n, re.value)) ?? f(Qu, null, {
          default: () => [f(Me, {
            icon: o.value ? e.nextIcon : e.prevIcon
          }, null)]
        })]), f("div", {
          key: "container",
          ref: m,
          class: "v-slide-group__container",
          onScroll: F
        }, [f("div", {
          ref: h,
          class: "v-slide-group__content",
          onFocusin: N,
          onFocusout: O,
          onKeydown: I
        }, [(q = n.default) == null ? void 0 : q.call(n, re.value)])]), oe.value && f("div", {
          key: "next",
          class: ["v-slide-group__next", {
            "v-slide-group__next--disabled": !Ee.value
          }],
          onMousedown: k,
          onClick: () => Ee.value && J("next")
        }, [((ee = n.next) == null ? void 0 : ee.call(n, re.value)) ?? f(Qu, null, {
          default: () => [f(Me, {
            icon: o.value ? e.prevIcon : e.nextIcon
          }, null)]
        })])];
      }
    })), {
      selected: l.selected,
      scrollTo: J,
      scrollOffset: a,
      focus: L,
      hasPrev: Z,
      hasNext: Ee
    };
  }
});
function W0(e) {
  return e ? e.map((t) => Kd(t) ? t : {
    text: t,
    value: t
  }) : [];
}
const U0 = K({
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
  ...Bm({
    mandatory: "force",
    selectedClass: "v-tab-item--selected"
  }),
  ...Qt(),
  ...Ke()
}, "VTabs"), K0 = ve()({
  name: "VTabs",
  props: U0(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = at(e, "modelValue"), s = y(() => W0(e.items)), {
      densityClasses: l
    } = pn(e), {
      backgroundColorClasses: r,
      backgroundColorStyles: a
    } = $t(ce(e, "bgColor")), {
      scopeId: d
    } = ca();
    return To({
      VTab: {
        color: ce(e, "color"),
        direction: ce(e, "direction"),
        stacked: ce(e, "stacked"),
        fixed: ce(e, "fixedTabs"),
        sliderColor: ce(e, "sliderColor"),
        hideSlider: ce(e, "hideSlider")
      }
    }), _e(() => {
      const u = ac.filterProps(e), c = !!(o.window || e.items.length > 0);
      return f(Ne, null, [f(ac, Oe(u, {
        modelValue: i.value,
        "onUpdate:modelValue": (m) => i.value = m,
        class: ["v-tabs", `v-tabs--${e.direction}`, `v-tabs--align-tabs-${e.alignTabs}`, {
          "v-tabs--fixed-tabs": e.fixedTabs,
          "v-tabs--grow": e.grow,
          "v-tabs--stacked": e.stacked
        }, l.value, r.value, e.class],
        style: [{
          "--v-tabs-height": ye(e.height)
        }, a.value, e.style],
        role: "tablist",
        symbol: da
      }, d, n), {
        default: () => {
          var m;
          return [((m = o.default) == null ? void 0 : m.call(o)) ?? s.value.map((v) => {
            var h;
            return ((h = o.tab) == null ? void 0 : h.call(o, {
              item: v
            })) ?? f(ar, Oe(v, {
              key: v.text,
              value: v.value
            }), {
              default: o[`tab.${v.value}`] ? () => {
                var g;
                return (g = o[`tab.${v.value}`]) == null ? void 0 : g.call(o, {
                  item: v
                });
              } : void 0
            });
          })];
        }
      }), c && f(F0, Oe({
        modelValue: i.value,
        "onUpdate:modelValue": (m) => i.value = m,
        key: "tabs-window"
      }, d), {
        default: () => {
          var m;
          return [s.value.map((v) => {
            var h;
            return ((h = o.item) == null ? void 0 : h.call(o, {
              item: v
            })) ?? f(B0, {
              value: v.value
            }, {
              default: () => {
                var g;
                return (g = o[`item.${v.value}`]) == null ? void 0 : g.call(o, {
                  item: v
                });
              }
            });
          }), (m = o.window) == null ? void 0 : m.call(o)];
        }
      })]);
    }), {};
  }
}), G0 = {
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
}, Y0 = { class: "text-white" }, q0 = { class: "br-list" }, X0 = ["onClick"], J0 = { class: "text-white text-caption" };
function Z0(e, t, n, o, i, s) {
  return ae(), ke(Pt, { class: "book-review-card" }, {
    default: b(() => [
      f(Dt, {
        "no-gutters": "",
        class: "br-fixed align-center"
      }, {
        default: b(() => [
          f(Pe, {
            offset: "2",
            cols: "8",
            class: "text-center"
          }, {
            default: b(() => t[5] || (t[5] = [
              se("h4", { class: "mt-3" }, "本书评论", -1)
            ])),
            _: 1
          }),
          f(Pe, {
            cols: "2",
            class: "text-right"
          }, {
            default: b(() => [
              f(fe, {
                variant: "plain",
                icon: "mdi-close",
                onClick: t[0] || (t[0] = (l) => e.$emit("close")),
                title: "关闭评论面板"
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      n.user ? (ae(), lt(Ne, { key: 0 }, [
        f(Re, {
          class: "br-fixed",
          title: n.user.nickName || n.user.nickname,
          subtitle: n.user.email,
          onClick: t[1] || (t[1] = (l) => e.$emit("open-settings"))
        }, {
          prepend: b(() => [
            n.user.avatar ? (ae(), ke(cn, {
              key: 0,
              image: n.user.avatar
            }, null, 8, ["image"])) : (ae(), ke(cn, {
              key: 1,
              color: s.avatar_color(n.user.id)
            }, {
              default: b(() => [
                se("span", Y0, Te(s.avatar_text(n.user.nickName || n.user.nickname)), 1)
              ]),
              _: 1
            }, 8, ["color"]))
          ]),
          append: b(() => [
            f(Me, { title: "用户设置" }, {
              default: b(() => t[6] || (t[6] = [
                Q("mdi-cog-outline")
              ])),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["title", "subtitle"]),
        f(vn, { class: "br-fixed" })
      ], 64)) : ct("", !0),
      f(K0, {
        class: "br-fixed",
        "model-value": n.sort,
        "onUpdate:modelValue": t[2] || (t[2] = (l) => e.$emit("update:sort", l)),
        density: "compact",
        grow: ""
      }, {
        default: b(() => [
          f(ar, { value: "latest" }, {
            default: b(() => t[7] || (t[7] = [
              Q("最新")
            ])),
            _: 1
          }),
          f(ar, { value: "hot" }, {
            default: b(() => t[8] || (t[8] = [
              Q("热门")
            ])),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["model-value"]),
      f(vn, { class: "br-fixed" }),
      se("div", q0, [
        n.comments.length === 0 ? (ae(), ke(xn, {
          key: 0,
          density: "compact"
        }, {
          default: b(() => [
            f(Re, { class: "my-4" }, {
              default: b(() => [
                f(tl, { class: "text-center text-medium-emphasis" }, {
                  default: b(() => t[9] || (t[9] = [
                    Q("尚未有人发表评论")
                  ])),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        })) : (ae(), ke(xn, {
          key: 1,
          id: "book-review-list",
          density: "compact"
        }, {
          default: b(() => [
            (ae(!0), lt(Ne, null, fn(n.comments, (l) => (ae(), ke(Re, {
              key: l.reviewId,
              class: "pr-0 align-self-start mb-4",
              subtitle: l.nickName
            }, {
              prepend: b(() => [
                l.avatar ? (ae(), ke(cn, {
                  key: 0,
                  image: l.avatar,
                  size: "30"
                }, null, 8, ["image"])) : (ae(), ke(cn, {
                  key: 1,
                  size: "30",
                  color: s.avatar_color(l.userId)
                }, {
                  default: b(() => [
                    se("span", J0, Te(s.avatar_text(l.nickName)), 1)
                  ]),
                  _: 2
                }, 1032, ["color"]))
              ]),
              append: b(() => [
                f(fe, {
                  class: "px-0",
                  size: "small",
                  variant: "plain",
                  stacked: "",
                  "prepend-icon": "mdi-thumb-up",
                  title: "点赞"
                }, {
                  default: b(() => [
                    Q(Te(l.likeCount), 1)
                  ]),
                  _: 2
                }, 1024)
              ]),
              default: b(() => [
                Q(Te(l.content) + " ", 1),
                l.referText ? (ae(), lt("div", {
                  key: 0,
                  class: dn(["br-refer text-caption text-medium-emphasis", { "br-refer--link": l.cfi }]),
                  onClick: ns((r) => l.cfi && e.$emit("jump", l.cfi), ["stop"])
                }, Te(l.referText), 11, X0)) : ct("", !0),
                f(la, null, {
                  default: b(() => [
                    Q(Te(l.level) + "楼 · " + Te(l.createTime) + " · " + Te(l.geo), 1)
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
      f(Xn, { class: "br-fixed my-2 py-0 px-2" }, {
        default: b(() => [
          n.login ? (ae(), ke(Dt, {
            key: 1,
            "no-gutters": "",
            class: "align-center"
          }, {
            default: b(() => [
              f(Pe, { cols: "9" }, {
                default: b(() => [
                  f(Gt, {
                    modelValue: e.content,
                    "onUpdate:modelValue": t[4] || (t[4] = (l) => e.content = l),
                    density: "compact",
                    "single-line": "",
                    "hide-details": "",
                    placeholder: "爱书之人，维持良好的社区氛围"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              f(Pe, {
                cols: "3",
                class: "text-right"
              }, {
                default: b(() => [
                  f(fe, { onClick: s.submit }, {
                    default: b(() => t[11] || (t[11] = [
                      Q("发表")
                    ])),
                    _: 1
                  }, 8, ["onClick"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (ae(), ke(fe, {
            key: 0,
            onClick: t[3] || (t[3] = (l) => e.$emit("login")),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: b(() => t[10] || (t[10] = [
              Q("点击登录，发表评论")
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
const Rm = /* @__PURE__ */ $n(G0, [["render", Z0], ["__scopeId", "data-v-9af658bd"]]), Q0 = {
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
function e1(e, t, n, o, i, s) {
  return ae(), ke(xn, {
    "onClick:select": s.click_toc,
    ref: "tocList"
  }, {
    default: b(() => [
      f(Os, null, {
        activator: b(({ props: l }) => [
          f(Re, Oe(l, { title: "书籍信息" }), null, 16)
        ]),
        default: b(() => [
          (ae(!0), lt(Ne, null, fn(s.meta_items, (l) => (ae(), ke(Re, {
            key: l.title,
            title: l.title,
            subtitle: l.subtitle,
            lines: "3"
          }, null, 8, ["title", "subtitle"]))), 128))
        ]),
        _: 1
      }),
      f(vn),
      (ae(!0), lt(Ne, null, fn(n.toc_items, (l, r) => (ae(), lt(Ne, null, [
        l.subitems.length == 0 ? (ae(), ke(Re, {
          key: 0,
          "prepend-icon": "mdi-book-open-page-variant-outline",
          title: l.label,
          value: l.href,
          class: dn({ "current-chapter": s.isCurrentChapter(l) }),
          ref_for: !0,
          ref: "listItem"
        }, null, 8, ["title", "value", "class"])) : (ae(), ke(Os, {
          key: l.href
        }, {
          activator: b(({ props: a }) => [
            f(Re, Oe({ ref_for: !0 }, a, {
              "prepend-icon": "mdi-book-open-page-variant-outline",
              title: l.label,
              value: l.href,
              class: { "current-chapter": s.isCurrentChapter(l) },
              ref_for: !0,
              ref: "listItem"
            }), null, 16, ["title", "value", "class"])
          ]),
          default: b(() => [
            (ae(!0), lt(Ne, null, fn(l.subitems, (a, d) => (ae(), ke(Re, {
              key: a.href,
              title: a.label,
              value: a.href,
              class: dn({ "current-chapter": s.isCurrentChapter(a) }),
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
const Hm = /* @__PURE__ */ $n(Q0, [["render", e1], ["__scopeId", "data-v-f081fe9b"]]), fa = Symbol.for("vuetify:v-slider");
function t1(e, t, n) {
  const o = n === "vertical", i = t.getBoundingClientRect(), s = "touches" in e ? e.touches[0] : e;
  return o ? s.clientY - (i.top + i.height / 2) : s.clientX - (i.left + i.width / 2);
}
function n1(e, t) {
  return "touches" in e && e.touches.length ? e.touches[0][t] : "changedTouches" in e && e.changedTouches.length ? e.changedTouches[0][t] : e[t];
}
const o1 = K({
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
  ...Vt(),
  ...Ln({
    elevation: 2
  }),
  ripple: {
    type: Boolean,
    default: !0
  }
}, "Slider"), i1 = (e) => {
  const t = y(() => parseFloat(e.min)), n = y(() => parseFloat(e.max)), o = y(() => +e.step > 0 ? parseFloat(e.step) : 0), i = y(() => Math.max(mu(o.value), mu(t.value)));
  function s(l) {
    if (l = parseFloat(l), o.value <= 0) return l;
    const r = Vn(l, t.value, n.value), a = t.value % o.value, d = Math.round((r - a) / o.value) * o.value + a;
    return parseFloat(Math.min(d, n.value).toFixed(i.value));
  }
  return {
    min: t,
    max: n,
    step: o,
    decimals: i,
    roundValue: s
  };
}, s1 = (e) => {
  let {
    props: t,
    steps: n,
    onSliderStart: o,
    onSliderMove: i,
    onSliderEnd: s,
    getActiveThumb: l
  } = e;
  const {
    isRtl: r
  } = Ft(), a = ce(t, "reverse"), d = y(() => t.direction === "vertical"), u = y(() => d.value !== a.value), {
    min: c,
    max: m,
    step: v,
    decimals: h,
    roundValue: g
  } = n, _ = y(() => parseInt(t.thumbSize, 10)), x = y(() => parseInt(t.tickSize, 10)), V = y(() => parseInt(t.trackSize, 10)), A = y(() => (m.value - c.value) / v.value), D = ce(t, "disabled"), C = y(() => t.error || t.disabled ? void 0 : t.thumbColor ?? t.color), E = y(() => t.error || t.disabled ? void 0 : t.trackColor ?? t.color), F = y(() => t.error || t.disabled ? void 0 : t.trackFillColor ?? t.color), N = Se(!1), O = Se(0), $ = le(), M = le();
  function k(ne) {
    var w;
    const we = t.direction === "vertical", Be = we ? "top" : "left", Ze = we ? "height" : "width", Xe = we ? "clientY" : "clientX", {
      [Be]: Bt,
      [Ze]: Rn
    } = (w = $.value) == null ? void 0 : w.$el.getBoundingClientRect(), Hn = n1(ne, Xe);
    let p = Math.min(Math.max((Hn - Bt - O.value) / Rn, 0), 1) || 0;
    return (we ? u.value : u.value !== r.value) && (p = 1 - p), g(c.value + p * (m.value - c.value));
  }
  const I = (ne) => {
    s({
      value: k(ne)
    }), N.value = !1, O.value = 0;
  }, L = (ne) => {
    M.value = l(ne), M.value && (M.value.focus(), N.value = !0, M.value.contains(ne.target) ? O.value = t1(ne, M.value, t.direction) : (O.value = 0, i({
      value: k(ne)
    })), o({
      value: k(ne)
    }));
  }, J = {
    passive: !0,
    capture: !0
  };
  function re(ne) {
    i({
      value: k(ne)
    });
  }
  function oe(ne) {
    ne.stopPropagation(), ne.preventDefault(), I(ne), window.removeEventListener("mousemove", re, J), window.removeEventListener("mouseup", oe);
  }
  function Z(ne) {
    var we;
    I(ne), window.removeEventListener("touchmove", re, J), (we = ne.target) == null || we.removeEventListener("touchend", Z);
  }
  function Ee(ne) {
    var we;
    L(ne), window.addEventListener("touchmove", re, J), (we = ne.target) == null || we.addEventListener("touchend", Z, {
      passive: !1
    });
  }
  function G(ne) {
    ne.preventDefault(), L(ne), window.addEventListener("mousemove", re, J), window.addEventListener("mouseup", oe, {
      passive: !1
    });
  }
  const q = (ne) => {
    const we = (ne - c.value) / (m.value - c.value) * 100;
    return Vn(isNaN(we) ? 0 : we, 0, 100);
  }, ee = ce(t, "showTicks"), Ve = y(() => ee.value ? t.ticks ? Array.isArray(t.ticks) ? t.ticks.map((ne) => ({
    value: ne,
    position: q(ne),
    label: ne.toString()
  })) : Object.keys(t.ticks).map((ne) => ({
    value: parseFloat(ne),
    position: q(parseFloat(ne)),
    label: t.ticks[ne]
  })) : A.value !== 1 / 0 ? Fr(A.value + 1).map((ne) => {
    const we = c.value + ne * v.value;
    return {
      value: we,
      position: q(we)
    };
  }) : [] : []), Ge = y(() => Ve.value.some((ne) => {
    let {
      label: we
    } = ne;
    return !!we;
  })), qe = {
    activeThumbRef: M,
    color: ce(t, "color"),
    decimals: h,
    disabled: D,
    direction: ce(t, "direction"),
    elevation: ce(t, "elevation"),
    hasLabels: Ge,
    isReversed: a,
    indexFromEnd: u,
    min: c,
    max: m,
    mousePressed: N,
    numTicks: A,
    onSliderMousedown: G,
    onSliderTouchstart: Ee,
    parsedTicks: Ve,
    parseMouseMove: k,
    position: q,
    readonly: ce(t, "readonly"),
    rounded: ce(t, "rounded"),
    roundValue: g,
    showTicks: ee,
    startOffset: O,
    step: v,
    thumbSize: _,
    thumbColor: C,
    thumbLabel: ce(t, "thumbLabel"),
    ticks: ce(t, "ticks"),
    tickSize: x,
    trackColor: E,
    trackContainerRef: $,
    trackFillColor: F,
    trackSize: V,
    vertical: d
  };
  return bt(fa, qe), qe;
}, l1 = K({
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
  ...xe()
}, "VSliderThumb"), r1 = ve()({
  name: "VSliderThumb",
  directives: {
    Ripple: el
  },
  props: l1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = je(fa), {
      isRtl: s,
      rtlClasses: l
    } = Ft();
    if (!i) throw new Error("[Vuetify] v-slider-thumb must be used inside v-slider or v-range-slider");
    const {
      thumbColor: r,
      step: a,
      disabled: d,
      thumbSize: u,
      thumbLabel: c,
      direction: m,
      isReversed: v,
      vertical: h,
      readonly: g,
      elevation: _,
      mousePressed: x,
      decimals: V,
      indexFromEnd: A
    } = i, D = y(() => d.value ? void 0 : _.value), {
      elevationClasses: C
    } = Bn(D), {
      textColorClasses: E,
      textColorStyles: F
    } = Ut(r), {
      pageup: N,
      pagedown: O,
      end: $,
      home: M,
      left: k,
      right: I,
      down: L,
      up: J
    } = dp, re = [N, O, $, M, k, I, L, J], oe = y(() => a.value ? [1, 2, 3] : [1, 5, 10]);
    function Z(G, q) {
      if (!re.includes(G.key)) return;
      G.preventDefault();
      const ee = a.value || 0.1, Ve = (e.max - e.min) / ee;
      if ([k, I, L, J].includes(G.key)) {
        const qe = (h.value ? [s.value ? k : I, v.value ? L : J] : A.value !== s.value ? [k, J] : [I, J]).includes(G.key) ? 1 : -1, ne = G.shiftKey ? 2 : G.ctrlKey ? 1 : 0;
        q = q + qe * ee * oe.value[ne];
      } else if (G.key === M)
        q = e.min;
      else if (G.key === $)
        q = e.max;
      else {
        const Ge = G.key === O ? 1 : -1;
        q = q - Ge * ee * (Ve > 100 ? Ve / 10 : 10);
      }
      return Math.max(e.min, Math.min(e.max, q));
    }
    function Ee(G) {
      const q = Z(G, e.modelValue);
      q != null && o("update:modelValue", q);
    }
    return _e(() => {
      const G = ye(A.value ? 100 - e.position : e.position, "%");
      return f("div", {
        class: ["v-slider-thumb", {
          "v-slider-thumb--focused": e.focused,
          "v-slider-thumb--pressed": e.focused && x.value
        }, e.class, l.value],
        style: [{
          "--v-slider-thumb-position": G,
          "--v-slider-thumb-size": ye(u.value)
        }, e.style],
        role: "slider",
        tabindex: d.value ? -1 : 0,
        "aria-label": e.name,
        "aria-valuemin": e.min,
        "aria-valuemax": e.max,
        "aria-valuenow": e.modelValue,
        "aria-readonly": !!g.value,
        "aria-orientation": m.value,
        onKeydown: g.value ? void 0 : Ee
      }, [f("div", {
        class: ["v-slider-thumb__surface", E.value, C.value],
        style: {
          ...F.value
        }
      }, null), yt(f("div", {
        class: ["v-slider-thumb__ripple", E.value],
        style: F.value
      }, null), [[Vo("ripple"), e.ripple, null, {
        circle: !0,
        center: !0
      }]]), f(s_, {
        origin: "bottom center"
      }, {
        default: () => {
          var q;
          return [yt(f("div", {
            class: "v-slider-thumb__label-container"
          }, [f("div", {
            class: ["v-slider-thumb__label"]
          }, [f("div", null, [((q = n["thumb-label"]) == null ? void 0 : q.call(n, {
            modelValue: e.modelValue
          })) ?? e.modelValue.toFixed(a.value ? V.value : 1)])])]), [[In, c.value && e.focused || c.value === "always"]])];
        }
      })]);
    }), {};
  }
}), a1 = K({
  start: {
    type: Number,
    required: !0
  },
  stop: {
    type: Number,
    required: !0
  },
  ...xe()
}, "VSliderTrack"), u1 = ve()({
  name: "VSliderTrack",
  props: a1(),
  emits: {},
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = je(fa);
    if (!o) throw new Error("[Vuetify] v-slider-track must be inside v-slider or v-range-slider");
    const {
      color: i,
      parsedTicks: s,
      rounded: l,
      showTicks: r,
      tickSize: a,
      trackColor: d,
      trackFillColor: u,
      trackSize: c,
      vertical: m,
      min: v,
      max: h,
      indexFromEnd: g
    } = o, {
      roundedClasses: _
    } = Ot(l), {
      backgroundColorClasses: x,
      backgroundColorStyles: V
    } = $t(u), {
      backgroundColorClasses: A,
      backgroundColorStyles: D
    } = $t(d), C = y(() => `inset-${m.value ? "block" : "inline"}-${g.value ? "end" : "start"}`), E = y(() => m.value ? "height" : "width"), F = y(() => ({
      [C.value]: "0%",
      [E.value]: "100%"
    })), N = y(() => e.stop - e.start), O = y(() => ({
      [C.value]: ye(e.start, "%"),
      [E.value]: ye(N.value, "%")
    })), $ = y(() => r.value ? (m.value ? s.value.slice().reverse() : s.value).map((k, I) => {
      var J;
      const L = k.value !== v.value && k.value !== h.value ? ye(k.position, "%") : void 0;
      return f("div", {
        key: k.value,
        class: ["v-slider-track__tick", {
          "v-slider-track__tick--filled": k.position >= e.start && k.position <= e.stop,
          "v-slider-track__tick--first": k.value === v.value,
          "v-slider-track__tick--last": k.value === h.value
        }],
        style: {
          [C.value]: L
        }
      }, [(k.label || n["tick-label"]) && f("div", {
        class: "v-slider-track__tick-label"
      }, [((J = n["tick-label"]) == null ? void 0 : J.call(n, {
        tick: k,
        index: I
      })) ?? k.label])]);
    }) : []);
    return _e(() => f("div", {
      class: ["v-slider-track", _.value, e.class],
      style: [{
        "--v-slider-track-size": ye(c.value),
        "--v-slider-tick-size": ye(a.value)
      }, e.style]
    }, [f("div", {
      class: ["v-slider-track__background", A.value, {
        "v-slider-track__background--opacity": !!i.value || !u.value
      }],
      style: {
        ...F.value,
        ...D.value
      }
    }, null), f("div", {
      class: ["v-slider-track__fill", x.value],
      style: {
        ...O.value,
        ...V.value
      }
    }, null), r.value && f("div", {
      class: ["v-slider-track__ticks", {
        "v-slider-track__ticks--always-show": r.value === "always"
      }]
    }, [$.value])])), {};
  }
}), c1 = K({
  ...ra(),
  ...o1(),
  ...ua(),
  modelValue: {
    type: [Number, String],
    default: 0
  }
}, "VSlider"), d1 = ve()({
  name: "VSlider",
  props: c1(),
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
    const i = le(), {
      rtlClasses: s
    } = Ft(), l = i1(e), r = at(e, "modelValue", void 0, (E) => l.roundValue(E ?? l.min.value)), {
      min: a,
      max: d,
      mousePressed: u,
      roundValue: c,
      onSliderMousedown: m,
      onSliderTouchstart: v,
      trackContainerRef: h,
      position: g,
      hasLabels: _,
      readonly: x
    } = s1({
      props: e,
      steps: l,
      onSliderStart: () => {
        o("start", r.value);
      },
      onSliderEnd: (E) => {
        let {
          value: F
        } = E;
        const N = c(F);
        r.value = N, o("end", N);
      },
      onSliderMove: (E) => {
        let {
          value: F
        } = E;
        return r.value = c(F);
      },
      getActiveThumb: () => {
        var E;
        return (E = i.value) == null ? void 0 : E.$el;
      }
    }), {
      isFocused: V,
      focus: A,
      blur: D
    } = aa(e), C = y(() => g(r.value));
    return _e(() => {
      const E = Ts.filterProps(e), F = !!(e.label || n.label || n.prepend);
      return f(Ts, Oe({
        class: ["v-slider", {
          "v-slider--has-labels": !!n["tick-label"] || _.value,
          "v-slider--focused": V.value,
          "v-slider--pressed": u.value,
          "v-slider--disabled": e.disabled
        }, s.value, e.class],
        style: e.style
      }, E, {
        focused: V.value
      }), {
        ...n,
        prepend: F ? (N) => {
          var O, $;
          return f(Ne, null, [((O = n.label) == null ? void 0 : O.call(n, N)) ?? (e.label ? f(hm, {
            id: N.id.value,
            class: "v-slider__label",
            text: e.label
          }, null) : void 0), ($ = n.prepend) == null ? void 0 : $.call(n, N)]);
        } : void 0,
        default: (N) => {
          let {
            id: O,
            messagesId: $
          } = N;
          return f("div", {
            class: "v-slider__container",
            onMousedown: x.value ? void 0 : m,
            onTouchstartPassive: x.value ? void 0 : v
          }, [f("input", {
            id: O.value,
            name: e.name || O.value,
            disabled: !!e.disabled,
            readonly: !!e.readonly,
            tabindex: "-1",
            value: r.value
          }, null), f(u1, {
            ref: h,
            start: 0,
            stop: C.value
          }, {
            "tick-label": n["tick-label"]
          }), f(r1, {
            ref: i,
            "aria-describedby": $.value,
            focused: V.value,
            min: a.value,
            max: d.value,
            modelValue: r.value,
            "onUpdate:modelValue": (M) => r.value = M,
            position: C.value,
            elevation: e.elevation,
            onFocus: A,
            onBlur: D,
            ripple: e.ripple,
            name: e.name
          }, {
            "thumb-label": n["thumb-label"]
          })]);
        }
      });
    }), {};
  }
}), f1 = {
  name: "Settings",
  emits: ["update", "open-themes"],
  computed: {
    // 设置面板里的 4 个快捷图标（纯色主题）
    quick_themes: function() {
      return this.themes.filter((e) => e.type === "solid");
    }
  },
  mounted: function() {
    var e, t, n, o, i, s, l, r, a, d;
    this.opt = {
      flow: ((e = this.settings) == null ? void 0 : e.flow) || this.opt.flow,
      theme: ((t = this.settings) == null ? void 0 : t.theme) || this.opt.theme,
      theme_mode: ((n = this.settings) == null ? void 0 : n.theme_mode) || this.opt.theme_mode,
      font_size: ((o = this.settings) == null ? void 0 : o.font_size) || this.opt.font_size,
      line_height: ((i = this.settings) == null ? void 0 : i.line_height) || this.opt.line_height,
      letter_spacing: ((s = this.settings) == null ? void 0 : s.letter_spacing) || this.opt.letter_spacing,
      brightness: ((l = this.settings) == null ? void 0 : l.brightness) || this.opt.brightness,
      show_comments: ((r = this.settings) == null ? void 0 : r.show_comments) ?? this.opt.show_comments,
      paging_control: ((a = this.settings) == null ? void 0 : a.paging_control) || this.opt.paging_control,
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
      paging_control: "mouse_and_keyboard",
      wheel_paging: !0
    },
    themes: qn
  })
}, m1 = { class: "d-inline-blockx text-center" }, v1 = { class: "d-inline-blockx text-center" }, h1 = { class: "d-inline-blockx text-center" };
function g1(e, t, n, o, i, s) {
  return ae(), ke(xn, { density: "compact" }, {
    default: b(() => [
      f(Re, { class: "my-2" }, {
        default: b(() => [
          f(Dt, { class: "align-center" }, {
            default: b(() => [
              f(Pe, { cols: "2" }, {
                default: b(() => t[20] || (t[20] = [
                  se("span", null, "亮度", -1)
                ])),
                _: 1
              }),
              f(Pe, { cols: "9" }, {
                default: b(() => [
                  f(d1, {
                    "hide-details": "",
                    modelValue: e.opt.brightness,
                    "onUpdate:modelValue": [
                      t[0] || (t[0] = (l) => e.opt.brightness = l),
                      t[1] || (t[1] = (l) => e.$emit("update", e.opt))
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
      f(Re, { class: "my-2" }, {
        default: b(() => [
          f(Dt, { class: "align-center gx-3" }, {
            default: b(() => [
              f(Pe, { cols: "2" }, {
                default: b(() => t[21] || (t[21] = [
                  se("span", { class: "text-justify" }, "字体", -1)
                ])),
                _: 1
              }),
              f(Pe, { cols: "2" }, {
                default: b(() => [
                  f(fe, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[2] || (t[2] = (l) => s.set_and_emit("font_size", e.opt.font_size - 2))
                  }, {
                    default: b(() => t[22] || (t[22] = [
                      Q("A-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(Pe, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: b(() => [
                  se("span", m1, Te(e.opt.font_size), 1)
                ]),
                _: 1
              }),
              f(Pe, { cols: "3" }, {
                default: b(() => [
                  f(fe, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[3] || (t[3] = (l) => s.set_and_emit("font_size", e.opt.font_size + 2))
                  }, {
                    default: b(() => t[23] || (t[23] = [
                      Q("A+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(Pe, { cols: "3" }, {
                default: b(() => [
                  f(fe, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[4] || (t[4] = (l) => s.set_and_emit("font_size", 18))
                  }, {
                    default: b(() => t[24] || (t[24] = [
                      Q("默认")
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
      f(Re, { class: "my-2" }, {
        default: b(() => [
          f(Dt, { class: "align-center" }, {
            default: b(() => [
              f(Pe, { cols: "2" }, {
                default: b(() => t[25] || (t[25] = [
                  se("span", null, "行距", -1)
                ])),
                _: 1
              }),
              f(Pe, { cols: "2" }, {
                default: b(() => [
                  f(fe, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[5] || (t[5] = (l) => s.set_and_emit("line_height", e.opt.line_height - 0.1))
                  }, {
                    default: b(() => t[26] || (t[26] = [
                      Q("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(Pe, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: b(() => [
                  se("span", v1, Te(e.opt.line_height.toFixed(1)), 1)
                ]),
                _: 1
              }),
              f(Pe, { cols: "3" }, {
                default: b(() => [
                  f(fe, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[6] || (t[6] = (l) => s.set_and_emit("line_height", e.opt.line_height + 0.1))
                  }, {
                    default: b(() => t[27] || (t[27] = [
                      Q("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(Pe, { cols: "3" }, {
                default: b(() => [
                  f(fe, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[7] || (t[7] = (l) => s.set_and_emit("line_height", 1.5))
                  }, {
                    default: b(() => t[28] || (t[28] = [
                      Q("默认")
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
      f(Re, { class: "my-2" }, {
        default: b(() => [
          f(Dt, { class: "align-center" }, {
            default: b(() => [
              f(Pe, { cols: "2" }, {
                default: b(() => t[29] || (t[29] = [
                  se("span", null, "间距", -1)
                ])),
                _: 1
              }),
              f(Pe, { cols: "2" }, {
                default: b(() => [
                  f(fe, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[8] || (t[8] = (l) => s.set_and_emit("letter_spacing", e.opt.letter_spacing - 1))
                  }, {
                    default: b(() => t[30] || (t[30] = [
                      Q("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(Pe, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: b(() => [
                  se("span", h1, Te(e.opt.letter_spacing) + "px", 1)
                ]),
                _: 1
              }),
              f(Pe, { cols: "3" }, {
                default: b(() => [
                  f(fe, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[9] || (t[9] = (l) => s.set_and_emit("letter_spacing", e.opt.letter_spacing + 1))
                  }, {
                    default: b(() => t[31] || (t[31] = [
                      Q("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(Pe, { cols: "3" }, {
                default: b(() => [
                  f(fe, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[10] || (t[10] = (l) => s.set_and_emit("letter_spacing", 0))
                  }, {
                    default: b(() => t[32] || (t[32] = [
                      Q("默认")
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
      f(Re, { class: "my-2" }, {
        default: b(() => [
          f(Dt, { class: "align-center" }, {
            default: b(() => [
              f(Pe, { cols: "2" }, {
                default: b(() => t[33] || (t[33] = [
                  se("span", null, "翻页", -1)
                ])),
                _: 1
              }),
              f(Pe, { cols: "10" }, {
                default: b(() => [
                  f(Bo, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: b(() => [
                      f(fe, {
                        active: e.opt.flow == "paginated",
                        onClick: t[11] || (t[11] = (l) => s.set_and_emit("flow", "paginated"))
                      }, {
                        default: b(() => t[34] || (t[34] = [
                          Q("左右点击")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(fe, {
                        active: e.opt.flow == "scrolled",
                        onClick: t[12] || (t[12] = (l) => s.set_and_emit("flow", "scrolled"))
                      }, {
                        default: b(() => t[35] || (t[35] = [
                          Q("上下滑动")
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
      f(Re, { class: "my-2" }, {
        default: b(() => [
          f(Dt, { class: "align-center" }, {
            default: b(() => [
              f(Pe, { cols: "2" }, {
                default: b(() => t[36] || (t[36] = [
                  se("span", null, "控制", -1)
                ])),
                _: 1
              }),
              f(Pe, { cols: "10" }, {
                default: b(() => [
                  f(Bo, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: b(() => [
                      f(fe, {
                        active: e.opt.paging_control == "mouse_and_keyboard",
                        onClick: t[13] || (t[13] = (l) => s.set_and_emit("paging_control", "mouse_and_keyboard"))
                      }, {
                        default: b(() => t[37] || (t[37] = [
                          Q("鼠标+键盘")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(fe, {
                        active: e.opt.paging_control == "keyboard_only",
                        onClick: t[14] || (t[14] = (l) => s.set_and_emit("paging_control", "keyboard_only"))
                      }, {
                        default: b(() => t[38] || (t[38] = [
                          Q("仅键盘")
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
      f(Re, { class: "my-2" }, {
        default: b(() => [
          f(Dt, { class: "align-center" }, {
            default: b(() => [
              f(Pe, { cols: "2" }, {
                default: b(() => t[39] || (t[39] = [
                  se("span", { density: "compact" }, "滚轮翻页", -1)
                ])),
                _: 1
              }),
              f(Pe, { cols: "10" }, {
                default: b(() => [
                  f(Bo, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: b(() => [
                      f(fe, {
                        active: e.opt.wheel_paging == !0,
                        onClick: t[15] || (t[15] = (l) => s.set_and_emit("wheel_paging", !0))
                      }, {
                        default: b(() => t[40] || (t[40] = [
                          Q("开启")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(fe, {
                        active: e.opt.wheel_paging == !1,
                        onClick: t[16] || (t[16] = (l) => s.set_and_emit("wheel_paging", !1))
                      }, {
                        default: b(() => t[41] || (t[41] = [
                          Q("关闭")
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
      f(Re, { class: "my-2" }, {
        default: b(() => [
          f(Dt, { class: "align-center" }, {
            default: b(() => [
              f(Pe, { cols: "2" }, {
                default: b(() => t[42] || (t[42] = [
                  se("span", { density: "compact" }, "章评*", -1)
                ])),
                _: 1
              }),
              f(Pe, { cols: "10" }, {
                default: b(() => [
                  f(Bo, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: b(() => [
                      f(fe, {
                        active: e.opt.show_comments == !0,
                        onClick: t[17] || (t[17] = (l) => s.set_and_emit("show_comments", !0))
                      }, {
                        default: b(() => t[43] || (t[43] = [
                          Q("开启")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(fe, {
                        active: e.opt.show_comments == !1,
                        onClick: t[18] || (t[18] = (l) => s.set_and_emit("show_comments", !1))
                      }, {
                        default: b(() => t[44] || (t[44] = [
                          Q("关闭")
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
      f(Re, { class: "my-2" }, {
        default: b(() => [
          f(Dt, {
            class: "align-center",
            "no-gutters": ""
          }, {
            default: b(() => [
              f(Pe, { cols: "2" }, {
                default: b(() => t[45] || (t[45] = [
                  se("span", { density: "compact" }, "皮肤", -1)
                ])),
                _: 1
              }),
              (ae(!0), lt(Ne, null, fn(s.quick_themes, (l) => (ae(), ke(Pe, {
                key: l.id,
                class: "text-center"
              }, {
                default: b(() => [
                  f(fe, {
                    active: e.opt.theme == l.id,
                    density: "compact",
                    icon: l.icon,
                    color: l.bg,
                    onClick: (r) => s.set_theme_and_emit(l.id, l.mode)
                  }, null, 8, ["active", "icon", "color", "onClick"])
                ]),
                _: 2
              }, 1024))), 128)),
              f(Pe, {
                cols: "3",
                class: "text-right"
              }, {
                default: b(() => [
                  f(fe, {
                    variant: "text",
                    density: "compact",
                    size: "small",
                    "append-icon": "mdi-chevron-right",
                    onClick: t[19] || (t[19] = (l) => e.$emit("open-themes"))
                  }, {
                    default: b(() => t[46] || (t[46] = [
                      Q("更多")
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
const jm = /* @__PURE__ */ $n(f1, [["render", g1]]), ur = "data-candle-audiobook-active", ma = "candle-audiobook", va = "candle-audiobook-active";
function Go(e) {
  return String(e || "").replace(/\s+/g, "").trim();
}
function p1(e, t) {
  let n = 0, o = e.length - 1, i = -1;
  for (; n <= o; ) {
    const l = Math.floor((n + o) / 2);
    Number(e[l].start_ms) <= t ? (i = l, n = l + 1) : o = l - 1;
  }
  if (i < 0) return null;
  const s = e[i];
  return t < Number(s.end_ms) ? s : null;
}
function uc(e) {
  return decodeURIComponent(String(e || "").split(/[?#]/)[0]).replace(/^\.\//, "").replace(/^\//, "");
}
function cr(e, t) {
  const n = uc(e), o = uc(t);
  return !n || !o ? !1 : n === o || n.endsWith(`/${o}`) || o.endsWith(`/${n}`) || n.split("/").pop() === o.split("/").pop();
}
function zm(e) {
  var t, n, o, i;
  return ((t = e == null ? void 0 : e.section) == null ? void 0 : t.href) || ((n = e == null ? void 0 : e.section) == null ? void 0 : n.url) || ((i = (o = e == null ? void 0 : e.document) == null ? void 0 : o.location) == null ? void 0 : i.pathname) || "";
}
function Vl(e, t) {
  var s, l, r;
  const n = ((s = e == null ? void 0 : e.views) == null ? void 0 : s.call(e)) || [];
  let o = null;
  if ((l = n.forEach) == null || l.call(n, (a) => {
    var d, u;
    !o && cr(((d = a == null ? void 0 : a.section) == null ? void 0 : d.href) || ((u = a == null ? void 0 : a.section) == null ? void 0 : u.url), t) && (o = a);
  }), o != null && o.contents) return o.contents;
  const i = ((r = e == null ? void 0 : e.getContents) == null ? void 0 : r.call(e)) || [];
  return t ? i.find((a) => cr(zm(a), t)) || null : i[0] || null;
}
function y1(e, t) {
  return Array.from((e == null ? void 0 : e.children) || []).filter((n) => {
    var o;
    return ((o = n.localName) == null ? void 0 : o.toLowerCase()) === t;
  });
}
function b1(e, t) {
  const n = String(t || "").replace(/^\/+/, "").split("/").filter(Boolean);
  if (!n.length) return null;
  let o = e.documentElement;
  for (const i of n) {
    const s = i.match(/^([\w-]+)(?:\[(\d+)\])?$/);
    if (!s) return null;
    const l = s[1].toLowerCase(), r = Math.max(0, Number(s[2] || 1) - 1);
    if (l === "html") {
      o = e.documentElement;
      continue;
    }
    if (l === "body") {
      o = e.body;
      continue;
    }
    if (o = y1(o, l)[r], !o) return null;
  }
  return o;
}
function _1(e, t) {
  const n = Go(t);
  if (!n) return null;
  const o = e.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, div");
  return Array.from(o).find((i) => {
    const s = Go(i.textContent);
    return s === n || s.includes(n) || n.includes(s);
  }) || null;
}
function w1(e, t) {
  const n = e == null ? void 0 : e.document, o = (t == null ? void 0 : t.locator) || {};
  if (!n) return null;
  let i = o.element_id ? n.getElementById(o.element_id) : null;
  return !i && o.dom_path && (i = b1(n, o.dom_path)), i || (i = _1(n, t.text)), i ? { document: n, element: i, locator: o } : null;
}
function S1(e) {
  const t = [], n = e.ownerDocument.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  let o = n.nextNode();
  for (; o; )
    t.push(o), o = n.nextNode();
  return t;
}
function cc(e, t) {
  let n = Math.max(0, t);
  for (const i of e) {
    if (n <= i.data.length) return { node: i, offset: n };
    n -= i.data.length;
  }
  const o = e[e.length - 1];
  return o ? { node: o, offset: o.data.length } : null;
}
function k1(e, t, n) {
  const o = S1(e);
  if (!o.length) return null;
  const i = o.reduce((c, m) => c + m.data.length, 0), s = Math.min(i, Math.max(0, Number(t) || 0)), l = Number(n), r = Math.min(i, Number.isFinite(l) && l > s ? l : i), a = cc(o, s), d = cc(o, r);
  if (!a || !d) return null;
  const u = e.ownerDocument.createRange();
  return u.setStart(a.node, a.offset), u.setEnd(d.node, d.offset), u;
}
function C1(e) {
  if (e.getElementById("candle-audiobook-highlight-style")) return;
  const t = e.createElement("style");
  t.id = "candle-audiobook-highlight-style", t.textContent = `
    ::highlight(${ma}) {
      background: rgba(245, 166, 35, .34);
      text-decoration: underline 2px rgba(180, 92, 0, .75);
      text-underline-offset: .18em;
    }
    .${va} {
      background: rgba(245, 166, 35, .2) !important;
      box-shadow: inset 3px 0 rgba(180, 92, 0, .72);
    }
  `, e.head.appendChild(t);
}
function Wm(e) {
  var n;
  (((n = e == null ? void 0 : e.getContents) == null ? void 0 : n.call(e)) || []).forEach((o) => {
    var s, l, r;
    const i = o.document;
    i && ((r = (l = (s = i.defaultView) == null ? void 0 : s.CSS) == null ? void 0 : l.highlights) == null || r.delete(ma), i.querySelectorAll(`[${ur}]`).forEach((a) => {
      a.removeAttribute(ur), a.classList.remove(va);
    }));
  });
}
function E1(e, t, n) {
  var d, u;
  Wm(e);
  const o = w1(t, n);
  if (!o) return null;
  const { document: i, element: s, locator: l } = o;
  C1(i), s.setAttribute(ur, n.id || ""), s.classList.add(va);
  const r = k1(s, l.start_char, l.end_char), a = i.defaultView;
  return r && ((d = a == null ? void 0 : a.CSS) != null && d.highlights) && a.Highlight && a.CSS.highlights.set(ma, new a.Highlight(r)), (u = s.scrollIntoView) == null || u.call(s, { block: "center", behavior: "smooth" }), { contents: t, document: i, element: s, range: r };
}
function x1(e, t) {
  return cr(e == null ? void 0 : e.source_key, t);
}
function N1(e, t) {
  var i;
  if (!e || !t) return !1;
  if ((i = e.locator) != null && i.element_id && e.locator.element_id === t.id) return !0;
  const n = Go(e.text), o = Go(t.textContent);
  return !!(n && o && (o.includes(n) || n.includes(o)));
}
const V1 = {
  key: 0,
  class: "audiobook-player",
  "data-testid": "candle-audiobook-player",
  "aria-label": "边听边读播放器"
}, O1 = { class: "player-heading" }, T1 = {
  key: 0,
  class: "player-error",
  role: "alert"
}, D1 = { class: "player-controls" }, P1 = ["disabled"], A1 = ["aria-label", "disabled"], I1 = ["disabled"], $1 = { class: "time" }, M1 = ["max", "value"], F1 = { class: "time" }, L1 = { class: "rate-control" }, B1 = ["value"], R1 = 50, H1 = 100, j1 = 40, z1 = {
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
    const o = e, i = n, s = le(null), l = le(null), r = le(null), a = le([]), d = le(null), u = le(!1), c = le(!1), m = le(""), v = le(0), h = le(0), g = le(1), _ = le(!0), x = le(""), V = le(0), A = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];
    let D = null, C = null, E = null, F = "", N = 0, O = 0;
    const $ = y(() => {
      var T;
      return ((T = l.value) == null ? void 0 : T.chapters) || [];
    }), M = y(() => $.value.findIndex((T) => {
      var H;
      return T.id === ((H = r.value) == null ? void 0 : H.id);
    })), k = y(() => `candle:audiobook:${o.editionId || "manifest"}`);
    Ce(
      () => [o.visible, o.editionId, o.manifestUrl],
      ([T]) => {
        T && L();
      },
      { immediate: !0 }
    ), Ce(
      () => o.rendition,
      (T, H) => {
        var ge, he;
        (ge = H == null ? void 0 : H.off) == null || ge.call(H, "rendered", Hn), (he = T == null ? void 0 : T.on) == null || he.call(T, "rendered", Hn);
      },
      { immediate: !0 }
    );
    function I() {
      return o.manifestUrl || (o.editionId ? `/api/audiobooks/${o.editionId}/manifest` : "");
    }
    function L() {
      return l.value || !I() ? Promise.resolve() : E || (E = J().finally(() => {
        E = null;
      }), E);
    }
    async function J() {
      var T, H, ge, he;
      c.value = !0, m.value = "";
      try {
        const ie = await o.request(I());
        if (ie.err !== "ok" || !((H = (T = ie.manifest) == null ? void 0 : T.chapters) != null && H.length))
          throw new Error(ie.msg || "当前书籍没有可播放章节");
        l.value = ie.manifest, V.value = ((ge = ie.progress) == null ? void 0 : ge.version) || 0;
        const De = z(), Je = $.value.find((ut) => {
          var Rt;
          return ut.id === ((Rt = ie.progress) == null ? void 0 : Rt.chapter_id);
        }) || $.value.find((ut) => ut.number === De.chapterNumber) || $.value[0], Qe = ((he = ie.progress) == null ? void 0 : he.position_ms) ?? De.positionMs ?? 0;
        g.value = De.rate || 1, await oe(Je, { startMs: Qe, autoplay: !1, navigate: !1 });
      } catch (ie) {
        m.value = (ie == null ? void 0 : ie.message) || "有声书加载失败";
      } finally {
        c.value = !1;
      }
    }
    async function re(T) {
      var he;
      const H = T.timeline_url || `/api/audiobooks/${l.value.id}/chapters/${T.number}/timeline`, ge = await o.request(H);
      a.value = ge.err === "ok" ? ((he = ge.timeline) == null ? void 0 : he.segments) || [] : [];
    }
    async function oe(T, { startMs: H = 0, autoplay: ge = !1, navigate: he = !0 } = {}) {
      if (T) {
        c.value = !0, m.value = "", p();
        try {
          r.value = T, v.value = Math.max(0, Number(H) || 0), h.value = Number(T.duration_ms) || 0, await re(T), he && _.value && await Z(T), await Et();
          const ie = s.value;
          if (!ie) return;
          const De = new URL(T.audio_url, window.location.href).href;
          ie.src !== De && (ie.src = T.audio_url, ie.load()), await Ve(ie), ie.playbackRate = g.value, ie.currentTime = Math.min(v.value / 1e3, ie.duration || 1 / 0), pe(), Bt(!0), ge && await G();
        } catch (ie) {
          m.value = (ie == null ? void 0 : ie.message) || "章节音频加载失败";
        } finally {
          c.value = !1;
        }
      }
    }
    async function Z(T) {
      !o.rendition || !(T != null && T.source_key) || await o.rendition.display(T.source_key);
    }
    async function Ee() {
      if (x.value || !l.value) return;
      const T = await o.request(`/api/audiobooks/${l.value.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "candle", device_id: "candle-reader" })
      });
      T.err === "ok" && (x.value = T.session_id || "");
    }
    async function G() {
      const T = s.value;
      if (T) {
        await Ee(), T.playbackRate = g.value;
        try {
          await T.play();
        } catch (H) {
          m.value = (H == null ? void 0 : H.name) === "NotAllowedError" ? "请再次点击播放" : "无法播放章节音频";
        }
      }
    }
    async function q() {
      l.value || await L();
      const T = s.value;
      !T || !r.value || (T.paused ? await G() : T.pause());
    }
    function ee() {
      const T = s.value;
      T && (h.value = Number.isFinite(T.duration) ? Math.round(T.duration * 1e3) : h.value);
    }
    function Ve(T) {
      return T.readyState >= HTMLMediaElement.HAVE_METADATA ? Promise.resolve() : new Promise((H, ge) => {
        const he = () => {
          De(), H();
        }, ie = () => {
          De(), ge(new Error("章节音频元数据加载失败"));
        }, De = () => {
          T.removeEventListener("loadedmetadata", he), T.removeEventListener("error", ie);
        };
        T.addEventListener("loadedmetadata", he), T.addEventListener("error", ie);
      });
    }
    function Ge() {
      u.value = !0, O = Date.now(), Bt(!0), Be(), te();
    }
    function qe() {
      u.value = !1, Ze(), Xe(), U(!0), pe();
    }
    async function ne() {
      u.value = !1, Ze(), await U(!0, M.value === $.value.length - 1), M.value < $.value.length - 1 && await oe($.value[M.value + 1], { autoplay: !0 });
    }
    function we() {
      var T;
      (T = s.value) != null && T.src && (m.value = "章节音频加载失败", u.value = !1, Ze());
    }
    function Be() {
      Ze(), D = window.setInterval(Xe, 150), C = window.setInterval(() => void U(), 1e4);
    }
    function Ze() {
      D && window.clearInterval(D), C && window.clearInterval(C), D = null, C = null;
    }
    function Xe() {
      const T = s.value;
      T && (v.value = Math.round(T.currentTime * 1e3), Bt(), pe());
    }
    function Bt(T = !1) {
      const H = p1(a.value, v.value), ge = (H == null ? void 0 : H.id) || "";
      if (!(!T && ge === F)) {
        if (F = ge, d.value = H, i("segment-change", H), !H || !_.value || !u.value) {
          p();
          return;
        }
        Rn(H);
      }
    }
    async function Rn(T) {
      var De, Je;
      const H = ++N, he = (T.locator || {}).href || ((De = r.value) == null ? void 0 : De.source_key);
      let ie = Vl(o.rendition, he);
      !ie && o.rendition && _.value && await o.rendition.display(he);
      for (let Qe = 0; Qe < j1; Qe += 1) {
        if (H !== N || !_.value) return;
        if (ie = Vl(o.rendition, he), ie && E1(o.rendition, ie, T)) {
          if (await new Promise((tt) => window.setTimeout(tt, H1)), H !== N || !_.value) return;
          const ut = Vl(o.rendition, he), Rt = (Je = ut == null ? void 0 : ut.document) == null ? void 0 : Je.querySelector("[data-candle-audiobook-active]");
          if ((Rt == null ? void 0 : Rt.getAttribute("data-candle-audiobook-active")) === T.id) return;
        }
        await new Promise((ut) => window.setTimeout(ut, R1));
      }
      H === N && _.value && console.warn("[candle-audiobook] 无法定位时间轴片段", T.id);
    }
    function Hn() {
      d.value && _.value && u.value && Rn(d.value);
    }
    function p() {
      N += 1, Wm(o.rendition);
    }
    function w() {
      !r.value || !d.value || (_.value = !1, p());
    }
    async function P() {
      _.value = !0, d.value && await Rn(d.value);
    }
    function j(T) {
      const H = s.value;
      v.value = Math.max(0, Math.min(h.value, T)), H && (H.currentTime = v.value / 1e3), Bt(!0), pe();
    }
    function B() {
      s.value && (s.value.playbackRate = g.value), pe();
    }
    async function R() {
      M.value > 0 && await oe($.value[M.value - 1], { autoplay: u.value });
    }
    async function X() {
      M.value < $.value.length - 1 && await oe($.value[M.value + 1], { autoplay: u.value });
    }
    async function Y(T) {
      var Rt, tt, Tt, oo, ha, Bi, ga, pa, ya;
      if (l.value || await L(), !l.value || !T) return !1;
      _.value = !0;
      const H = ((Rt = T.toc) == null ? void 0 : Rt.href) || ((tt = T.toc) == null ? void 0 : tt.id) || zm(T.contents), ge = $.value.find((io) => x1(io, H)) || r.value || $.value[0];
      (ge == null ? void 0 : ge.id) !== ((Tt = r.value) == null ? void 0 : Tt.id) && await oe(ge, { navigate: !1 });
      const he = ((ha = (oo = T.cfi) == null ? void 0 : oo.toString) == null ? void 0 : ha.call(oo)) || T.cfi, ie = he && ((ga = (Bi = o.rendition) == null ? void 0 : Bi.getRange) == null ? void 0 : ga.call(Bi, he)), De = ((pa = ie == null ? void 0 : ie.startContainer) == null ? void 0 : pa.nodeType) === Node.TEXT_NODE ? ie.startContainer.parentElement : ie == null ? void 0 : ie.startContainer, Je = ((ya = De == null ? void 0 : De.closest) == null ? void 0 : ya.call(De, "p, h1, h2, h3, h4, h5, h6, li, blockquote")) || null, Qe = Go(Je == null ? void 0 : Je.textContent), ut = Qe && a.value.find((io) => Go(io.text) === Qe) || Je && a.value.find((io) => N1(io, Je)) || a.value.find((io) => Number(io.index) === Number(T.segment_id));
      return ut ? (await oe(ge, { startMs: ut.start_ms, autoplay: !0, navigate: !0 }), !0) : !1;
    }
    async function U(T = !1, H = !1) {
      var De;
      if (!x.value || !r.value) return;
      const ge = Date.now(), he = u.value && O ? Math.min(6e4, Math.max(0, ge - O)) : 0;
      if (!T && he < 9e3) return;
      O = ge;
      const ie = await o.request(`/api/audiobook-sessions/${x.value}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: r.value.id,
          position_ms: v.value,
          segment_id: ((De = d.value) == null ? void 0 : De.id) || "",
          listened_delta_ms: he,
          completed: H,
          version: V.value
        })
      });
      (ie.err === "ok" || ie.err === "progress.conflict") && (V.value = ie.version || V.value);
    }
    function z() {
      try {
        return JSON.parse(localStorage.getItem(k.value) || "{}");
      } catch {
        return {};
      }
    }
    function pe() {
      r.value && localStorage.setItem(k.value, JSON.stringify({
        chapterNumber: r.value.number,
        positionMs: v.value,
        rate: g.value
      }));
    }
    function te() {
      !("mediaSession" in navigator) || !r.value || (navigator.mediaSession.metadata = new MediaMetadata({ title: r.value.title, album: "边听边读" }), navigator.mediaSession.setActionHandler("play", G), navigator.mediaSession.setActionHandler("pause", () => {
        var T;
        return (T = s.value) == null ? void 0 : T.pause();
      }), navigator.mediaSession.setActionHandler("previoustrack", R), navigator.mediaSession.setActionHandler("nexttrack", X));
    }
    function de(T) {
      const H = Math.max(0, Math.floor((T || 0) / 1e3));
      return `${Math.floor(H / 60)}:${String(H % 60).padStart(2, "0")}`;
    }
    return xt(() => {
      var T, H;
      Ze(), (H = (T = o.rendition) == null ? void 0 : T.off) == null || H.call(T, "rendered", Hn), p(), x.value && o.request(`/api/audiobook-sessions/${x.value}`, { method: "POST" });
    }), t({ loadManifest: L, playFromSelection: Y, returnToNarration: P, suspendFollow: w }), (T, H) => {
      var ge, he;
      return e.visible ? (ae(), lt("section", V1, [
        se("header", O1, [
          se("div", null, [
            H[3] || (H[3] = se("span", { class: "player-kicker" }, "边听边读", -1)),
            se("strong", null, Te(((ge = r.value) == null ? void 0 : ge.title) || "正在载入有声书"), 1)
          ]),
          se("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "关闭听书播放器",
            onClick: H[0] || (H[0] = (ie) => i("close"))
          }, [
            f(Me, { size: "20" }, {
              default: b(() => H[4] || (H[4] = [
                Q("mdi-close")
              ])),
              _: 1
            })
          ])
        ]),
        se("p", {
          class: dn(["active-dialogue", { muted: !d.value }])
        }, Te(((he = d.value) == null ? void 0 : he.text) || (c.value ? "正在加载章节时间轴…" : "片段间留白")), 3),
        m.value ? (ae(), lt("div", T1, Te(m.value), 1)) : ct("", !0),
        se("div", D1, [
          se("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "上一章",
            disabled: M.value <= 0,
            onClick: R
          }, [
            f(Me, null, {
              default: b(() => H[5] || (H[5] = [
                Q("mdi-skip-previous")
              ])),
              _: 1
            })
          ], 8, P1),
          se("button", {
            type: "button",
            class: "play-button",
            "aria-label": u.value ? "暂停听书" : "播放听书",
            disabled: c.value || !r.value,
            onClick: q
          }, [
            f(Me, null, {
              default: b(() => [
                Q(Te(u.value ? "mdi-pause" : "mdi-play"), 1)
              ]),
              _: 1
            })
          ], 8, A1),
          se("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "下一章",
            disabled: M.value >= $.value.length - 1,
            onClick: X
          }, [
            f(Me, null, {
              default: b(() => H[6] || (H[6] = [
                Q("mdi-skip-next")
              ])),
              _: 1
            })
          ], 8, I1),
          se("span", $1, Te(de(v.value)), 1),
          se("input", {
            class: "timeline-slider",
            type: "range",
            min: "0",
            max: Math.max(h.value, 1),
            step: "100",
            value: v.value,
            "aria-label": "听书进度",
            onInput: H[1] || (H[1] = (ie) => j(Number(ie.target.value)))
          }, null, 40, M1),
          se("span", F1, Te(de(h.value)), 1),
          se("label", L1, [
            H[7] || (H[7] = se("span", { class: "sr-only" }, "播放速度", -1)),
            yt(se("select", {
              "onUpdate:modelValue": H[2] || (H[2] = (ie) => g.value = ie),
              "aria-label": "播放速度",
              onChange: B
            }, [
              (ae(), lt(Ne, null, fn(A, (ie) => se("option", {
                key: ie,
                value: ie
              }, "x" + Te(ie), 9, B1)), 64))
            ], 544), [
              [
                Zg,
                g.value,
                void 0,
                { number: !0 }
              ]
            ])
          ])
        ]),
        _.value ? ct("", !0) : (ae(), lt("button", {
          key: 1,
          type: "button",
          class: "return-button",
          "data-testid": "return-to-narration",
          onClick: P
        }, [
          f(Me, { size: "18" }, {
            default: b(() => H[8] || (H[8] = [
              Q("mdi-target")
            ])),
            _: 1
          }),
          H[9] || (H[9] = Q(" 回到朗读位置 "))
        ])),
        se("audio", {
          ref_key: "audioElement",
          ref: s,
          preload: "metadata",
          onLoadedmetadata: ee,
          onPlay: Ge,
          onPause: qe,
          onEnded: ne,
          onError: we
        }, null, 544)
      ])) : ct("", !0);
    };
  }
}, Um = /* @__PURE__ */ $n(z1, [["__scopeId", "data-v-f2028a04"]]), W1 = K({
  ...xe(),
  ...rb({
    fullHeight: !0
  }),
  ...ot()
}, "VApp"), U1 = ve()({
  name: "VApp",
  props: W1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = vt(e), {
      layoutClasses: i,
      getLayoutItem: s,
      items: l,
      layoutRef: r
    } = cb(e), {
      rtlClasses: a
    } = Ft();
    return _e(() => {
      var d;
      return f("div", {
        ref: r,
        class: ["v-application", o.themeClasses.value, i.value, a.value, e.class],
        style: [e.style]
      }, [f("div", {
        class: "v-application__wrap"
      }, [(d = n.default) == null ? void 0 : d.call(n)])]);
    }), {
      getLayoutItem: s,
      items: l,
      theme: o
    };
  }
}), K1 = K({
  text: String,
  ...xe(),
  ...Ke()
}, "VToolbarTitle"), G1 = ve()({
  name: "VToolbarTitle",
  props: K1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => {
      const o = !!(n.default || n.text || e.text);
      return f(e.tag, {
        class: ["v-toolbar-title", e.class],
        style: e.style
      }, {
        default: () => {
          var i;
          return [o && f("div", {
            class: "v-toolbar-title__placeholder"
          }, [n.text ? n.text() : e.text, (i = n.default) == null ? void 0 : i.call(n)])];
        }
      });
    }), {};
  }
}), Y1 = [null, "prominent", "default", "comfortable", "compact"], Km = K({
  absolute: Boolean,
  collapse: Boolean,
  color: String,
  density: {
    type: String,
    default: "default",
    validator: (e) => Y1.includes(e)
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
  ...to(),
  ...xe(),
  ...Ln(),
  ...Vt(),
  ...Ke({
    tag: "header"
  }),
  ...ot()
}, "VToolbar"), dr = ve()({
  name: "VToolbar",
  props: Km(),
  setup(e, t) {
    var v;
    let {
      slots: n
    } = t;
    const {
      backgroundColorClasses: o,
      backgroundColorStyles: i
    } = $t(ce(e, "color")), {
      borderClasses: s
    } = no(e), {
      elevationClasses: l
    } = Bn(e), {
      roundedClasses: r
    } = Ot(e), {
      themeClasses: a
    } = vt(e), {
      rtlClasses: d
    } = Ft(), u = Se(!!(e.extended || (v = n.extension) != null && v.call(n))), c = y(() => parseInt(Number(e.height) + (e.density === "prominent" ? Number(e.height) : 0) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0), 10)), m = y(() => u.value ? parseInt(Number(e.extensionHeight) + (e.density === "prominent" ? Number(e.extensionHeight) : 0) - (e.density === "comfortable" ? 4 : 0) - (e.density === "compact" ? 8 : 0), 10) : 0);
    return To({
      VBtn: {
        variant: "text"
      }
    }), _e(() => {
      var x;
      const h = !!(e.title || n.title), g = !!(n.image || e.image), _ = (x = n.extension) == null ? void 0 : x.call(n);
      return u.value = !!(e.extended || _), f(e.tag, {
        class: ["v-toolbar", {
          "v-toolbar--absolute": e.absolute,
          "v-toolbar--collapse": e.collapse,
          "v-toolbar--flat": e.flat,
          "v-toolbar--floating": e.floating,
          [`v-toolbar--density-${e.density}`]: !0
        }, o.value, s.value, l.value, r.value, a.value, d.value, e.class],
        style: [i.value, e.style]
      }, {
        default: () => [g && f("div", {
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
        }, n.image) : f(Gr, {
          key: "image-img",
          cover: !0,
          src: e.image
        }, null)]), f(mt, {
          defaults: {
            VTabs: {
              height: ye(c.value)
            }
          }
        }, {
          default: () => {
            var V, A, D;
            return [f("div", {
              class: "v-toolbar__content",
              style: {
                height: ye(c.value)
              }
            }, [n.prepend && f("div", {
              class: "v-toolbar__prepend"
            }, [(V = n.prepend) == null ? void 0 : V.call(n)]), h && f(G1, {
              key: "title",
              text: e.title
            }, {
              text: n.title
            }), (A = n.default) == null ? void 0 : A.call(n), n.append && f("div", {
              class: "v-toolbar__append"
            }, [(D = n.append) == null ? void 0 : D.call(n)])])];
          }
        }), f(mt, {
          defaults: {
            VTabs: {
              height: ye(m.value)
            }
          }
        }, {
          default: () => [f(sm, null, {
            default: () => [u.value && f("div", {
              class: "v-toolbar__extension",
              style: {
                height: ye(m.value)
              }
            }, [_])]
          })]
        })]
      });
    }), {
      contentHeight: c,
      extensionHeight: m
    };
  }
}), q1 = K({
  scrollTarget: {
    type: String
  },
  scrollThreshold: {
    type: [String, Number],
    default: 300
  }
}, "scroll");
function X1(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const {
    canScroll: n
  } = t;
  let o = 0, i = 0;
  const s = le(null), l = Se(0), r = Se(0), a = Se(0), d = Se(!1), u = Se(!1), c = y(() => Number(e.scrollThreshold)), m = y(() => Vn((c.value - l.value) / c.value || 0)), v = () => {
    const h = s.value;
    if (!h || n && !n.value) return;
    o = l.value, l.value = "window" in h ? h.pageYOffset : h.scrollTop;
    const g = h instanceof Window ? document.documentElement.scrollHeight : h.scrollHeight;
    if (i !== g) {
      i = g;
      return;
    }
    u.value = l.value < o, a.value = Math.abs(l.value - c.value);
  };
  return Ce(u, () => {
    r.value = r.value || l.value;
  }), Ce(d, () => {
    r.value = 0;
  }), Zn(() => {
    Ce(() => e.scrollTarget, (h) => {
      var _;
      const g = h ? document.querySelector(h) : window;
      if (!g) {
        mn(`Unable to locate element with identifier ${h}`);
        return;
      }
      g !== s.value && ((_ = s.value) == null || _.removeEventListener("scroll", v), s.value = g, s.value.addEventListener("scroll", v, {
        passive: !0
      }));
    }, {
      immediate: !0
    });
  }), xt(() => {
    var h;
    (h = s.value) == null || h.removeEventListener("scroll", v);
  }), n && Ce(n, v, {
    immediate: !0
  }), {
    scrollThreshold: c,
    currentScroll: l,
    currentThreshold: a,
    isScrollActive: d,
    scrollRatio: m,
    // required only for testing
    // probably can be removed
    // later (2 chars chlng)
    isScrollingUp: u,
    savedScroll: r
  };
}
const J1 = K({
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
  ...Km(),
  ...kf(),
  ...q1(),
  height: {
    type: [Number, String],
    default: 64
  }
}, "VAppBar"), Z1 = ve()({
  name: "VAppBar",
  props: J1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = le(), i = at(e, "modelValue"), s = y(() => {
      var A;
      const V = new Set(((A = e.scrollBehavior) == null ? void 0 : A.split(" ")) ?? []);
      return {
        hide: V.has("hide"),
        fullyHide: V.has("fully-hide"),
        inverted: V.has("inverted"),
        collapse: V.has("collapse"),
        elevate: V.has("elevate"),
        fadeImage: V.has("fade-image")
        // shrink: behavior.has('shrink'),
      };
    }), l = y(() => {
      const V = s.value;
      return V.hide || V.fullyHide || V.inverted || V.collapse || V.elevate || V.fadeImage || // behavior.shrink ||
      !i.value;
    }), {
      currentScroll: r,
      scrollThreshold: a,
      isScrollingUp: d,
      scrollRatio: u
    } = X1(e, {
      canScroll: l
    }), c = y(() => s.value.hide || s.value.fullyHide), m = y(() => e.collapse || s.value.collapse && (s.value.inverted ? u.value > 0 : u.value === 0)), v = y(() => e.flat || s.value.fullyHide && !i.value || s.value.elevate && (s.value.inverted ? r.value > 0 : r.value === 0)), h = y(() => s.value.fadeImage ? s.value.inverted ? 1 - u.value : u.value : void 0), g = y(() => {
      var D, C;
      if (s.value.hide && s.value.inverted) return 0;
      const V = ((D = o.value) == null ? void 0 : D.contentHeight) ?? 0, A = ((C = o.value) == null ? void 0 : C.extensionHeight) ?? 0;
      return c.value ? r.value < a.value || s.value.fullyHide ? V + A : V : V + A;
    });
    No(y(() => !!e.scrollBehavior), () => {
      An(() => {
        c.value ? s.value.inverted ? i.value = r.value > a.value : i.value = d.value || r.value < a.value : i.value = !0;
      });
    });
    const {
      ssrBootStyles: _
    } = Li(), {
      layoutItemStyles: x
    } = Cf({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: ce(e, "location"),
      layoutSize: g,
      elementSize: Se(void 0),
      active: i,
      absolute: ce(e, "absolute")
    });
    return _e(() => {
      const V = dr.filterProps(e);
      return f(dr, Oe({
        ref: o,
        class: ["v-app-bar", {
          "v-app-bar--bottom": e.location === "bottom"
        }, e.class],
        style: [{
          ...x.value,
          "--v-toolbar-image-opacity": h.value,
          height: void 0,
          ..._.value
        }, e.style]
      }, V, {
        collapse: m.value,
        flat: v.value
      }), n);
    }), {};
  }
}), Q1 = K({
  bordered: Boolean,
  color: String,
  content: [Number, String],
  dot: Boolean,
  floating: Boolean,
  icon: Ye,
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
  ...xe(),
  ...Mi({
    location: "top end"
  }),
  ...Vt(),
  ...Ke(),
  ...ot(),
  ...Ai({
    transition: "scale-rotate-transition"
  })
}, "VBadge"), ew = ve()({
  name: "VBadge",
  inheritAttrs: !1,
  props: Q1(),
  setup(e, t) {
    const {
      backgroundColorClasses: n,
      backgroundColorStyles: o
    } = $t(ce(e, "color")), {
      roundedClasses: i
    } = Ot(e), {
      t: s
    } = Gs(), {
      textColorClasses: l,
      textColorStyles: r
    } = Ut(ce(e, "textColor")), {
      themeClasses: a
    } = wf(), {
      locationStyles: d
    } = Fi(e, !0, (u) => (e.floating ? e.dot ? 2 : 4 : e.dot ? 8 : 12) + (["top", "bottom"].includes(u) ? +(e.offsetY ?? 0) : ["left", "right"].includes(u) ? +(e.offsetX ?? 0) : 0));
    return _e(() => {
      const u = Number(e.content), c = !e.max || isNaN(u) ? e.content : u <= +e.max ? u : `${e.max}+`, [m, v] = Yl(t.attrs, ["aria-atomic", "aria-label", "aria-live", "role", "title"]);
      return f(e.tag, Oe({
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
          var h, g;
          return [f("div", {
            class: "v-badge__wrapper"
          }, [(g = (h = t.slots).default) == null ? void 0 : g.call(h), f(un, {
            transition: e.transition
          }, {
            default: () => {
              var _, x;
              return [yt(f("span", Oe({
                class: ["v-badge__badge", a.value, n.value, i.value, l.value],
                style: [o.value, r.value, e.inline ? {} : d.value],
                "aria-atomic": "true",
                "aria-label": s(e.label, u),
                "aria-live": "polite",
                role: "status"
              }, m), [e.dot ? void 0 : t.slots.badge ? (x = (_ = t.slots).badge) == null ? void 0 : x.call(_) : e.icon ? f(Me, {
                icon: e.icon
              }, null) : c]), [[In, e.modelValue]])];
            }
          })])];
        }
      });
    }), {};
  }
}), tw = K({
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
  ...to(),
  ...xe(),
  ...Qt(),
  ...Ln(),
  ...Vt(),
  ...kf({
    name: "bottom-navigation"
  }),
  ...Ke({
    tag: "header"
  }),
  ...Yr({
    selectedClass: "v-btn--selected"
  }),
  ...ot()
}, "VBottomNavigation"), nw = ve()({
  name: "VBottomNavigation",
  props: tw(),
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
    } = wf(), {
      borderClasses: i
    } = no(e), {
      backgroundColorClasses: s,
      backgroundColorStyles: l
    } = $t(ce(e, "bgColor")), {
      densityClasses: r
    } = pn(e), {
      elevationClasses: a
    } = Bn(e), {
      roundedClasses: d
    } = Ot(e), {
      ssrBootStyles: u
    } = Li(), c = y(() => Number(e.height) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0)), m = at(e, "active", e.active), {
      layoutItemStyles: v
    } = Cf({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: y(() => "bottom"),
      layoutSize: y(() => m.value ? c.value : 0),
      elementSize: c,
      active: m,
      absolute: ce(e, "absolute")
    });
    return Qs(e, qr), To({
      VBtn: {
        baseColor: ce(e, "baseColor"),
        color: ce(e, "color"),
        density: ce(e, "density"),
        stacked: y(() => e.mode !== "horizontal"),
        variant: "text"
      }
    }, {
      scoped: !0
    }), _e(() => f(e.tag, {
      class: ["v-bottom-navigation", {
        "v-bottom-navigation--active": m.value,
        "v-bottom-navigation--grow": e.grow,
        "v-bottom-navigation--shift": e.mode === "shift"
      }, o.value, s.value, i.value, r.value, a.value, d.value, e.class],
      style: [l.value, v.value, {
        height: ye(c.value)
      }, u.value, e.style]
    }, {
      default: () => [n.default && f("div", {
        class: "v-bottom-navigation__content"
      }, [n.default()])]
    })), {};
  }
}), ow = K({
  inset: Boolean,
  ...Om({
    transition: "bottom-sheet-transition"
  })
}, "VBottomSheet"), $o = ve()({
  name: "VBottomSheet",
  props: ow(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = at(e, "modelValue");
    return _e(() => {
      const i = En.filterProps(e);
      return f(En, Oe(i, {
        contentClass: ["v-bottom-sheet__content", e.contentClass],
        modelValue: o.value,
        "onUpdate:modelValue": (s) => o.value = s,
        class: ["v-bottom-sheet", {
          "v-bottom-sheet--inset": e.inset
        }, e.class],
        style: e.style
      }), n);
    }), {};
  }
}), iw = K({
  scrollable: Boolean,
  ...xe(),
  ...Mn(),
  ...Ke({
    tag: "main"
  })
}, "VMain"), sw = ve()({
  name: "VMain",
  props: iw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      dimensionStyles: o
    } = Fn(e), {
      mainStyles: i
    } = ab(), {
      ssrBootStyles: s
    } = Li();
    return _e(() => f(e.tag, {
      class: ["v-main", {
        "v-main--scrollable": e.scrollable
      }, e.class],
      style: [i.value, s.value, o.value, e.style]
    }, {
      default: () => {
        var l, r;
        return [e.scrollable ? f("div", {
          class: "v-main__scroller"
        }, [(l = n.default) == null ? void 0 : l.call(n)]) : (r = n.default) == null ? void 0 : r.call(n)];
      }
    })), {};
  }
}), lw = {
  name: "EpubReader",
  components: {
    Settings: jm,
    BookToc: Hm,
    Guest: Dm,
    UserCenter: Tm,
    BookComments: _m,
    BookReview: Rm,
    AudiobookPlayer: Um
  },
  props: {
    book_url: { type: String, required: !0 },
    display_url: { type: String, default: "" },
    debug: { type: Boolean, default: !1 },
    themes_css: { type: String, default: "theme.css" },
    initial_book_id: { type: [Number, String], default: null },
    audiobook_edition_id: { type: [Number, String], default: null },
    audiobook_manifest_url: { type: String, default: "" }
  },
  computed: {
    has_audiobook: function() {
      return !!(this.audiobook_edition_id || this.audiobook_manifest_url);
    },
    switch_theme_icon: function() {
      return bn(this.settings.theme).mode === "day" ? "mdi-weather-night" : "mdi-weather-sunny";
    },
    switch_theme_text: function() {
      return bn(this.settings.theme).mode === "day" ? "夜晚" : "白天";
    },
    foot_color: function() {
      const e = bn(this.settings.theme);
      return e.bgBottom || e.bg;
    },
    status_bar_style: function() {
      const e = bn(this.settings.theme);
      return e.type !== "image" ? {} : { color: e.text, backgroundColor: "transparent" };
    },
    // 「更多主题」窗口按白天/夜晚分区
    theme_groups: function() {
      return [
        { mode: "day", label: "白天", items: qn.filter((e) => e.mode === "day") },
        { mode: "night", label: "夜晚", items: qn.filter((e) => e.mode === "night") }
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
    switch_theme: function() {
      const t = bn(this.settings.theme).mode === "day" ? this.settings.theme_night || "grey" : this.settings.theme_day || "white";
      this.apply_theme(t), this.save_settings();
    },
    // 应用一套主题（按 id）。solid 走 themes.css 的 class；image 走外层背景图 + iframe 透明 + 文字色强制。
    apply_theme: function(e) {
      const t = bn(e);
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
      e = e || bn(this.settings.theme), document.documentElement.style.backgroundColor = e.bgTop || e.bg, document.body.style.backgroundColor = e.bgTop || e.bg;
      const t = document.querySelector('meta[name="theme-color"]');
      t && t.setAttribute("content", e.bgTop || e.bg);
    },
    // 背景图铺在 #main（v-main）上：覆盖上/下状态栏与正文区域，整屏一张图连续衔接。
    // image 皮肤按屏幕方向选竖版/横版大图（cover）；正文 iframe 与状态栏透明后透出。
    // （图放在主文档而非 iframe 内——iframe 在分栏模式下宽达数十万 px，背景会被拉伸失效。）
    apply_skin_background: function(e) {
      e = e || bn(this.settings.theme);
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
      e = e || bn(this.settings.theme), this.rendition.getContents().forEach((o) => {
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
    set_menu: function(e) {
      var t = e;
      this.menu.current_panel == t && this.menu.panels[t] === !0 && (t = "hide"), this.menu.value = t == "hide" ? void 0 : t, console.log("set menu = ", t, ", current menu.value=", this.menu.value), this.menu.current_panel = t, this.menu.show_navbar = !0;
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
      e.flow != this.settings.flow && (this.rendition.flow(e.flow), this.set_menu("hide"));
      for (const t in e)
        this.settings[t] = e[t];
      if (this.apply_theme(this.settings.theme), e.brightness !== void 0) {
        const t = e.brightness / 100;
        document.getElementById("main").style.filter = `brightness(${t})`;
      }
      e.font_size !== void 0 && this.rendition.themes.fontSize(e.font_size + "px"), this.save_settings();
    },
    on_click_toc: function(e) {
      console.log(e), this.set_menu("hide"), this.suspend_audiobook_follow(), this.rendition.display(e.id);
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
      const t = e.view.frameElement.getBoundingClientRect(), n = document.getElementById("reader"), o = n.offsetWidth, i = n.offsetHeight, s = (e.clientX + t.x) % n.offsetWidth, l = (e.clientY + t.y) % n.offsetHeight;
      if (this.debug_click(s, l, o, i), this.is_toolbar_visible()) {
        this.hide_toolbar();
        return;
      }
      const r = o < this.wide_screen, a = r ? 3 : 5, d = this.settings.paging_control === "keyboard_only";
      s < o / a || r && l < i / a ? d || (this.suspend_audiobook_follow(), this.rendition.prev()) : s > o * (a - 1) / a || r && l > i * (a - 1) / a ? d || (this.suspend_audiobook_follow(), this.rendition.next().then()) : (console.log("-- toggle menu"), this.menu.show_navbar = !this.menu.show_navbar);
    },
    bin_search: function(e, t, n) {
      for (var o = 0, i = e.length; o < i; ) {
        const l = Math.floor((o + i) / 2);
        if (l == o)
          break;
        const r = e[l];
        if (r.cfi === void 0) {
          if (r.href.indexOf("#") > 0) {
            const d = r.href.split("#")[1];
            r.elem = n.document.getElementById(d);
          } else
            r.elem = n.document.getElementsByTagName("p")[0];
          r.cfi = new ePub.CFI(r.elem, n.cfiBase), r.cfi = new ePub.CFI(r.cfi.toString());
        }
        const a = this.book.locations.epubcfi.compare(t, r.cfi);
        if (a == 0)
          return r;
        a < 0 && (i = l), a > 0 && (o = l);
      }
      const s = e[o];
      if (s.cfi === void 0) {
        if (s.href.indexOf("#") > 0) {
          const l = s.href.split("#")[1];
          s.elem = n.document.getElementById(l);
        } else
          s.elem = n.document.getElementsByTagName("p")[0];
        s.cfi = new ePub.CFI(s.elem, n.cfiBase);
      }
      return s;
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
      if (console.log("got spine href in toc:", i), i !== void 0) {
        if (i.elem === void 0) {
          const l = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
          for (let a of l) {
            const d = t.document.getElementsByTagName(a);
            if (d.length > 0) {
              i.elem = d[0];
              break;
            }
          }
          const r = new ePub.CFI(i.elem, t.cfiBase);
          i.cfi = new ePub.CFI(r.toString());
        }
        var s = i;
        return i.subitems.length > 0 && (s = this.bin_search(i.subitems, n, t), this.book.locations.epubcfi.compare(n, s.cfi) < 0 && (s = i)), console.log("find_toc = ", s), s;
      }
    },
    count_distinct_between: function(e, t) {
      for (var n = t; n.parentElement != e.parentNode; )
        n = n.parentElement;
      let o = 0, i = e;
      for (; i && i !== n; ) {
        const s = i.nodeName.toUpperCase();
        if ((s === "P" || s[0] === "H") && o++, i.firstChild)
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
    hide_toolbar: function() {
      this.toolbar_left = -999;
    },
    show_toolbar: function(e, t) {
      console.log("show toolbar at rect", e, " from iframe rect", t);
      const n = document.getElementById("comments-toolbar");
      this.toolbar_left = e.left + t.x;
      const o = e.top + t.y, i = e.bottom + t.y;
      o >= n.offsetHeight + 64 ? this.toolbar_top = o - n.offsetHeight - 12 : this.toolbar_top = i + 12;
    },
    is_toolbar_visible: function() {
      return this.toolbar_left > 0;
    },
    on_select_content: function(e, t) {
      console.log("on selectd", e, t), this.is_handlering_selected_content = !0;
      const n = this.rendition.getRange(e);
      for (var o = n.startContainer.nodeType === Node.TEXT_NODE ? n.startContainer.parentElement : n.startContainer; o.nodeName.toUpperCase() != "P" && o.nodeName.toUpperCase()[0] != "H"; )
        o = o.parentElement;
      console.log("selected elem =", o);
      const i = new ePub.CFI(o, t.cfiBase), s = this.find_toc(i, t);
      console.log("cfi = ", i, "toc =", s);
      const l = this.count_distinct_between(s.elem, o);
      console.log("selected segment_id = ", l), this.selected_location = {
        toc: s,
        cfi: i,
        contents: t,
        segment_id: l
      };
      const r = this.rendition.views()._views.filter((a) => a.index == t.sectionIndex)[0];
      this.show_toolbar(o.getBoundingClientRect(), r.iframe.getBoundingClientRect());
    },
    on_click_toolbar_comments: function() {
      console.log("点击发表评论按钮", this.selected_location);
      const e = this.selected_location;
      this.hide_toolbar(), this.show_selected_comments(e.toc, e.segment_id, e.cfi);
    },
    on_keyup: function(e) {
      const t = e.keyCode || e.which;
      (t == 37 || t == 38) && (this.suspend_audiobook_follow(), this.rendition.prev()), (t == 39 || t == 40) && (this.suspend_audiobook_follow(), this.rendition.next());
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
        var e = ["click", "selected", "touchstart", "touchend", "touchmove"], e = ["added", "attach", "attached", "axis", "changed", "detach", "displayed", "displayerror", "expand", "hidden", "layout", "linkClicked", "loaderror", "locationChanged", "markClicked", "openFailed", "orientationchange", "relocated", "removed", "rendered", "resize", "resized", "scroll", "scrolled", "selected", "selectedRange", "shown", "started", "updated", "writingMode", "mouseup", "mousedown", "mousemove", "click", "touchend", "touchstart", "touchmove"];
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
      console.log("load themes from:", this.themes_css), qn.forEach((e) => this.rendition.themes.register(e.id, this.themes_css)), this.apply_theme(this.settings.theme);
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
    on_open_comments: function() {
      this.set_menu("more"), this.load_book_reviews();
    },
    on_change_book_review_sort: function(e) {
      this.book_review_sort = e, this.load_book_reviews();
    },
    load_book_reviews: function() {
      if (!this.book_id) return;
      const e = `/api/review/book/list?book_id=${this.book_id}&sort=${this.book_review_sort}`;
      this.$backend(e).then((t) => {
        t.err == "ok" && (this.book_reviews = t.data.list || []);
      });
    },
    on_book_login: function(e) {
      this.on_login_user(e), this.show_login = !1;
    },
    on_book_logout: function() {
      this.user = null, this.is_login = !1, this.show_user_center = !1;
    },
    on_add_book_review: function(e) {
      const t = this.current_toc;
      if (!t) {
        alert("请先打开任意章节再发表评论");
        return;
      }
      const n = {
        book_id: this.book_id,
        chapter_name: t.label.trim(),
        chapter_id: t.chapter_id,
        segment_id: 0,
        // 0 表示整章级（非段评）
        cfi: t.cfi ? t.cfi.toString() : "",
        content: e,
        type: 1
      };
      console.log("add book review = ", n), this.$backend("/api/review/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(n)
      }).then((o) => {
        o.err == "ok" && (this.book_reviews.push(o.data), alert("评论成功")), console.log("add book review rsp = ", o);
      });
    },
    on_location_changed_old: function(e) {
      const t = this.rendition.getContents();
      [e.start, e.end].forEach((n) => {
        console.log("handle location ", n);
        const o = this.book.spine.get(n), i = t.filter((r) => r.cfiBase == o.cfiBase)[0], s = new ePub.CFI(n), l = this.find_toc(s, i, o.href);
        this.load_comments_summary(i, l);
      });
    },
    on_location_changed: function(e) {
      try {
        const t = new ePub.CFI(e.start), o = this.rendition.getContents().find((s) => s.sectionIndex === e.index);
        if (!o)
          return;
        const i = this.find_toc(t, o);
        i && (this.current_toc_title = i.label, this.current_toc = i, this.last_toc_label !== i.label && (this.load_comments_summary(o, i), this.last_toc_label = i.label));
      } catch (t) {
        console.error("Error in on_location_changed:", t);
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
      var o = `/api/review/summary?book_id=${this.book_id}&chapter_name=${n}`;
      this.$backend(o).then((i) => {
        t.load_time = /* @__PURE__ */ new Date(), t.summary = {}, t.chapter_id = i.data.chapter_id, i.data.list.forEach((s) => {
          t.summary[s.segmentId] = s, t.icons_rendered = !1;
        });
      }).catch(function(i) {
        console.error("请求过程中出现错误：", i);
      }).finally(() => {
        this.add_comment_icons(e, t);
      });
    },
    add_comment_icons: function(e, t) {
      if (console.log("添加评论图标和计数器：", t.label.trim()), !!this.settings.show_comments) {
        var n = 0;
        for (var o in t.summary)
          o > n && (n = o);
        for (var i = 0, s = t.elem; i <= n && s; ) {
          const l = s.nodeName.toUpperCase();
          if ((l === "P" || l[0] === "H") && (this.add_icon_into_paragraph(e, s, i, t), i++), s.firstChild)
            s = s.firstChild;
          else if (s.nextSibling)
            s = s.nextSibling;
          else {
            for (; !s.nextSibling && s.parentNode; )
              s = s.parentNode;
            s = s.nextSibling;
          }
        }
        t.icons_rendered = !0;
      }
    },
    add_icon_into_paragraph: function(e, t, n, o) {
      const i = o.summary[n];
      if (i === void 0 || (console.log("添加评论图标：", n, t, i), t.querySelector(".comment-icon")))
        return;
      const s = new ePub.CFI(t, e.cfiBase).toString(), l = i.reviewNum, r = i.is_hot ? "hot-comment" : "", d = e.document.createElement("div");
      d.className = `comment-icon ${r}`, d.innerHTML = `<span class="comment-count">${l}</span>`, t.appendChild(d), d.addEventListener("click", (u) => {
        u.stopPropagation(), console.log("点击评论按钮", o.chapter_id, n, s), this.show_selected_comments(o, n, s);
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
      const o = `/api/review/list?book_id=${this.book_id}&chapter_id=${e.chapter_id}&segment_id=${t}&cfi=${n}`;
      this.$backend(o).then((i) => {
        this.comments = i.data.list, this.set_menu("comments");
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
      const i = this.$options.data().settings, s = JSON.parse(t);
      this.settings = Object.assign({}, i);
      for (const l in s)
        s[l] !== void 0 && (this.settings[l] = s[l]);
      console.log("加载设置：", t);
    }
    this.is_debug_signal = this.debug, this.is_debug_click = this.debug, this.loadingTimeout = setTimeout(() => {
      this.loading && (console.warn("电子书加载超时，显示提示框"), this.loading = !1, this.showTimeoutDialog = !0);
    }, 1e4), this.loading = !0, this.$backend("/api/review/me?count=true").then((i) => {
      i.err == "user.need_login" ? this.is_login = !1 : i.err == "ok" ? this.unread_count = i.data.count : i.err === "network_error" && console.log("网络错误，无法获取未读消息数，保持当前登录状态");
    }).catch((i) => {
      console.error("获取未读消息数失败:", i);
    }), this.$backend("/api/user/info").then((i) => {
      i.err == "ok" ? this.user = i.data : i.err === "network_error" ? console.log("网络错误，无法获取用户信息，保持当前状态") : this.user = null;
    }).catch((i) => {
      console.error("获取用户信息失败:", i);
    }), this.book = ePub(this.book_url), this.rendition = this.book.renderTo("reader", {
      manager: "continuous",
      flow: this.settings.flow,
      width: "100%",
      height: "100%"
      //snap: true
    }), this.book.loaded.metadata.then((i) => {
      console.log(i), this.book_meta = i, this.book_title = i.title;
      const s = `/api/review/book?title=${this.book_title}`;
      this.$backend(s).then((l) => {
        l.err == "ok" && (this.book_id = l.data.id);
      }).catch((l) => {
        console.error("获取书籍ID失败:", l);
      });
    }).catch((i) => {
      console.error("加载书籍元数据失败:", i);
    }), this.book.loaded.navigation.then((i) => {
      this.toc_items = i.toc;
    }).catch((i) => {
      console.error("加载目录失败:", i);
    }), this.init_listeners(), this.init_themes();
    const o = `lastReadPosition_${this.book_url}`;
    this.rendition.on("relocated", (i) => {
      localStorage.setItem(o, i.start.cfi);
    }), this.book.ready.then(() => {
      const s = localStorage.getItem(o) || this.display_url;
      return s ? this.rendition.display(s) : this.rendition.display();
    }).then(() => {
      clearTimeout(this.loadingTimeout), this.loading = !1;
      const i = this.settings.brightness / 100;
      document.getElementById("main").style.filter = `brightness(${i})`, this.rendition.themes.fontSize(this.settings.font_size + "px"), this.apply_theme(this.settings.theme);
    }).catch((i) => {
      clearTimeout(this.loadingTimeout), console.error("加载电子书失败:", i), this.loading = !1, this.showTimeoutDialog = !0;
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
        ai: !1
      }
    },
    theme_mode: "day",
    toc_items: [],
    comments: [],
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
}, rw = {
  id: "status-bar-left",
  class: "align-start"
}, aw = {
  id: "status-bar-right",
  class: "align-end"
}, uw = { class: "progress-bar-container" }, cw = { class: "theme-group-label" }, dw = { class: "theme-grid" }, fw = ["onClick"], mw = {
  key: 1,
  class: "theme-badge"
}, vw = { class: "theme-name" };
function hw(e, t, n, o, i, s) {
  const l = Um, r = jm, a = Hm, d = Rm, u = Dm, c = Tm, m = _m;
  return ae(), ke(U1, {
    theme: e.settings.theme,
    "full-height": "",
    density: "compact"
  }, {
    default: b(() => [
      se("div", {
        id: "safe-bottom",
        style: nn({ backgroundColor: s.foot_color })
      }, null, 4),
      e.menu.show_navbar ? (ae(), ke(Z1, {
        key: 0,
        density: "compact"
      }, {
        prepend: b(() => [
          f(fe, {
            icon: "",
            title: e.is_debug_signal ? "返回首页" : "章评"
          }, {
            default: b(() => [
              f(Me, null, {
                default: b(() => [
                  Q(Te(e.is_debug_signal ? "mdi-arrow-left" : "mdi-candle"), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["title"])
        ]),
        default: b(() => [
          Q(" " + Te(e.is_debug_signal ? e.alert_msg : e.book_title) + " ", 1),
          f(or),
          f(fe, {
            icon: "",
            title: "更多选项"
          }, {
            default: b(() => [
              f(Me, null, {
                default: b(() => t[22] || (t[22] = [
                  Q("mdi-dots-vertical")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : ct("", !0),
      f(nw, {
        modelValue: e.menu.value,
        "onUpdate:modelValue": t[3] || (t[3] = (v) => e.menu.value = v),
        active: e.menu.show_navbar,
        "z-index": "2599"
      }, {
        default: b(() => [
          f(fe, {
            value: "toc",
            onClick: t[0] || (t[0] = (v) => s.set_menu("toc"))
          }, {
            default: b(() => [
              f(Me, null, {
                default: b(() => t[23] || (t[23] = [
                  Q("mdi-book-open-variant-outline")
                ])),
                _: 1
              }),
              t[24] || (t[24] = se("span", null, "目录", -1))
            ]),
            _: 1
          }),
          f(fe, { onClick: s.switch_theme }, {
            default: b(() => [
              f(Me, null, {
                default: b(() => [
                  Q(Te(s.switch_theme_icon), 1)
                ]),
                _: 1
              }),
              se("span", null, Te(s.switch_theme_text), 1)
            ]),
            _: 1
          }, 8, ["onClick"]),
          s.has_audiobook ? (ae(), ke(fe, {
            key: 0,
            onClick: s.open_audiobook
          }, {
            default: b(() => [
              f(Me, null, {
                default: b(() => t[25] || (t[25] = [
                  Q("mdi-headphones")
                ])),
                _: 1
              }),
              t[26] || (t[26] = se("span", null, "听书", -1))
            ]),
            _: 1
          }, 8, ["onClick"])) : ct("", !0),
          f(fe, {
            value: "settings",
            onClick: t[1] || (t[1] = (v) => s.set_menu("settings"))
          }, {
            default: b(() => [
              f(Me, null, {
                default: b(() => t[27] || (t[27] = [
                  Q("mdi-cog")
                ])),
                _: 1
              }),
              t[28] || (t[28] = se("span", null, "设置", -1))
            ]),
            _: 1
          }),
          f(fe, {
            value: "more",
            onClick: s.on_open_comments
          }, {
            default: b(() => [
              e.unread_count ? (ae(), ke(ew, {
                key: 0,
                color: "error",
                content: e.unread_count
              }, {
                default: b(() => [
                  f(Me, null, {
                    default: b(() => t[29] || (t[29] = [
                      Q("mdi-comment-text-multiple-outline")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["content"])) : (ae(), ke(Me, { key: 1 }, {
                default: b(() => t[30] || (t[30] = [
                  Q("mdi-comment-text-multiple-outline")
                ])),
                _: 1
              })),
              t[31] || (t[31] = se("span", null, "评论", -1))
            ]),
            _: 1
          }, 8, ["onClick"]),
          f(fe, {
            value: "ai",
            onClick: t[2] || (t[2] = (v) => s.set_menu("ai"))
          }, {
            default: b(() => [
              f(Me, null, {
                default: b(() => t[32] || (t[32] = [
                  Q("mdi-face-man-shimmer")
                ])),
                _: 1
              }),
              t[33] || (t[33] = se("span", null, "AI", -1))
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue", "active"]),
      s.has_audiobook ? (ae(), ke(l, {
        key: 1,
        ref: "audiobookPlayer",
        visible: e.audiobook_open,
        "edition-id": n.audiobook_edition_id,
        "manifest-url": n.audiobook_manifest_url,
        rendition: e.rendition,
        request: s.audiobook_request,
        onClose: t[4] || (t[4] = (v) => e.audiobook_open = !1)
      }, null, 8, ["visible", "edition-id", "manifest-url", "rendition", "request"])) : ct("", !0),
      f($o, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.settings,
        "onUpdate:modelValue": t[5] || (t[5] = (v) => e.menu.panels.settings = v),
        contained: "",
        persistent: "",
        "z-index": "234"
      }, {
        default: b(() => [
          f(r, {
            settings: e.settings,
            onUpdate: s.update_settings,
            onOpenThemes: s.open_theme_dialog
          }, null, 8, ["settings", "onUpdate", "onOpenThemes"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f($o, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.toc,
        "onUpdate:modelValue": t[6] || (t[6] = (v) => e.menu.panels.toc = v),
        contained: "",
        "close-on-content-click": "",
        "z-index": "234"
      }, {
        default: b(() => [
          f(a, {
            ref: "bookTocComponent",
            meta: e.book_meta,
            toc_items: e.toc_items,
            "current-chapter": e.current_toc,
            "onClick:select": s.on_click_toc
          }, null, 8, ["meta", "toc_items", "current-chapter", "onClick:select"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f($o, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.more,
        "onUpdate:modelValue": t[10] || (t[10] = (v) => e.menu.panels.more = v),
        contained: "",
        "z-index": "234"
      }, {
        default: b(() => [
          f(d, {
            user: e.user,
            login: e.is_login,
            comments: e.book_reviews,
            sort: e.book_review_sort,
            onClose: t[7] || (t[7] = (v) => s.set_menu("hide")),
            onLogin: t[8] || (t[8] = (v) => e.show_login = !0),
            "onUpdate:sort": s.on_change_book_review_sort,
            onOpenSettings: t[9] || (t[9] = (v) => e.show_user_center = !0),
            onAdd: s.on_add_book_review,
            onJump: s.on_jump_review
          }, null, 8, ["user", "login", "comments", "sort", "onUpdate:sort", "onAdd", "onJump"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(En, {
        modelValue: e.show_login,
        "onUpdate:modelValue": t[11] || (t[11] = (v) => e.show_login = v),
        "max-width": "500",
        "z-index": "2999"
      }, {
        default: b(() => [
          f(u, { onLogin: s.on_book_login }, null, 8, ["onLogin"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f($o, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.show_user_center,
        "onUpdate:modelValue": t[12] || (t[12] = (v) => e.show_user_center = v),
        contained: "",
        "z-index": "234"
      }, {
        default: b(() => [
          f(c, {
            messages: e.comments,
            user: e.user,
            onUpdate: s.on_login_user,
            onLogout: s.on_book_logout
          }, null, 8, ["messages", "user", "onUpdate", "onLogout"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f($o, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.comments,
        "onUpdate:modelValue": t[15] || (t[15] = (v) => e.menu.panels.comments = v),
        contained: "",
        "z-index": "234"
      }, {
        default: b(() => [
          f(m, {
            login: e.is_login,
            comments: e.comments,
            onClose: t[13] || (t[13] = (v) => s.set_menu("hide")),
            onLogin: t[14] || (t[14] = (v) => s.set_menu("more")),
            onAdd_review: s.on_add_review
          }, null, 8, ["login", "comments", "onAdd_review"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f($o, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.ai,
        "onUpdate:modelValue": t[16] || (t[16] = (v) => e.menu.panels.ai = v),
        contained: "",
        "z-index": "234"
      }, {
        default: b(() => [
          f(Pt, { title: "开发中" })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      se("div", {
        id: "comments-toolbar",
        style: nn(`left: ${e.toolbar_left}px; top: ${e.toolbar_top}px;`)
      }, [
        f(dr, {
          density: "compact",
          border: "",
          dense: "",
          floating: "",
          elevation: "10",
          rounded: ""
        }, {
          default: b(() => [
            f(fe, { onClick: s.on_click_toolbar_comments }, {
              default: b(() => t[34] || (t[34] = [
                Q("发段评")
              ])),
              _: 1
            }, 8, ["onClick"]),
            f(vn, { vertical: "" }),
            f(fe, { onClick: s.on_click_toolbar_listen }, {
              default: b(() => t[35] || (t[35] = [
                Q("从这里听")
              ])),
              _: 1
            }, 8, ["onClick"]),
            f(vn, { vertical: "" }),
            f(fe, null, {
              default: b(() => t[36] || (t[36] = [
                Q("复制")
              ])),
              _: 1
            }),
            f(vn, { vertical: "" }),
            f(fe, null, {
              default: b(() => t[37] || (t[37] = [
                Q("反馈")
              ])),
              _: 1
            })
          ]),
          _: 1
        })
      ], 4),
      f(sw, {
        id: "main",
        class: "pa-0"
      }, {
        default: b(() => [
          f(rr, {
            modelValue: e.loading,
            "onUpdate:modelValue": t[17] || (t[17] = (v) => e.loading = v),
            "z-index": "auto",
            class: "align-center justify-center",
            persistent: ""
          }, {
            default: b(() => [
              f(If, {
                indeterminate: "",
                size: "64",
                color: "primary"
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          f(En, {
            modelValue: e.showTimeoutDialog,
            "onUpdate:modelValue": t[19] || (t[19] = (v) => e.showTimeoutDialog = v),
            "max-width": "500px"
          }, {
            default: b(() => [
              f(Pt, null, {
                default: b(() => [
                  f(vo, { class: "text-h5 text-center" }, {
                    default: b(() => t[38] || (t[38] = [
                      Q("加载超时")
                    ])),
                    _: 1
                  }),
                  f(Xn, { class: "text-center" }, {
                    default: b(() => t[39] || (t[39] = [
                      Q(" 电子书加载超时，可能是网络问题或文件格式不支持。 ")
                    ])),
                    _: 1
                  }),
                  f(zo, { class: "justify-center" }, {
                    default: b(() => [
                      f(fe, {
                        color: "primary",
                        variant: "text",
                        onClick: t[18] || (t[18] = (v) => e.showTimeoutDialog = !1)
                      }, {
                        default: b(() => t[40] || (t[40] = [
                          Q(" 关闭 ")
                        ])),
                        _: 1
                      }),
                      f(fe, {
                        color: "primary",
                        variant: "flat",
                        onClick: s.retryLoad
                      }, {
                        default: b(() => t[41] || (t[41] = [
                          Q(" 重试 ")
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
          se("div", {
            id: "status-bar-top",
            class: dn(e.settings.theme),
            style: nn(s.status_bar_style)
          }, [
            se("div", rw, Te(e.current_toc_title), 1),
            se("div", aw, " (" + Te(s.readingProgress) + ") ", 1)
          ], 6),
          t[42] || (t[42] = se("div", { id: "reader" }, null, -1)),
          se("div", {
            id: "status-bar-bottom",
            class: dn(e.settings.theme),
            style: nn(s.status_bar_style)
          }, [
            se("div", uw, [
              se("div", {
                class: "progress-bar",
                style: nn({ width: s.readingProgress })
              }, null, 4)
            ])
          ], 6)
        ]),
        _: 1
      }),
      f(En, {
        modelValue: e.show_theme_dialog,
        "onUpdate:modelValue": t[21] || (t[21] = (v) => e.show_theme_dialog = v),
        "max-width": "520",
        scrollable: "",
        fullscreen: e.$vuetify.display.smAndDown
      }, {
        default: b(() => [
          f(Pt, null, {
            default: b(() => [
              f(vo, { class: "d-flex align-center" }, {
                default: b(() => [
                  t[43] || (t[43] = se("span", null, "阅读皮肤", -1)),
                  f(or),
                  f(fe, {
                    icon: "mdi-close",
                    variant: "text",
                    density: "compact",
                    onClick: t[20] || (t[20] = (v) => e.show_theme_dialog = !1)
                  })
                ]),
                _: 1
              }),
              f(Xn, null, {
                default: b(() => [
                  (ae(!0), lt(Ne, null, fn(s.theme_groups, (v) => (ae(), lt(Ne, {
                    key: v.mode
                  }, [
                    se("div", cw, Te(v.label), 1),
                    se("div", dw, [
                      (ae(!0), lt(Ne, null, fn(v.items, (h) => (ae(), lt("div", {
                        class: "theme-cell",
                        key: h.id
                      }, [
                        se("div", {
                          class: dn(["theme-card", { active: e.settings.theme === h.id }]),
                          style: nn(s.theme_card_style(h)),
                          onClick: (g) => s.pick_theme(h)
                        }, [
                          se("span", {
                            class: "theme-sample",
                            style: nn({ color: h.text })
                          }, Te(h.sample), 5),
                          h.id === e.settings.theme_day || h.id === e.settings.theme_night ? (ae(), ke(Me, {
                            key: 0,
                            class: "theme-check",
                            size: "18",
                            title: h.mode === "day" ? "当前白天皮肤" : "当前夜晚皮肤"
                          }, {
                            default: b(() => t[44] || (t[44] = [
                              Q("mdi-check-circle")
                            ])),
                            _: 2
                          }, 1032, ["title"])) : ct("", !0),
                          e.settings.theme === h.id ? (ae(), lt("span", mw, "使用中")) : ct("", !0)
                        ], 14, fw),
                        se("div", vw, Te(h.name), 1)
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
const gw = /* @__PURE__ */ $n(lw, [["render", hw], ["__scopeId", "data-v-6e95e036"]]), pw = {
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
function yw(e, t, n, o, i, s) {
  const l = gw;
  return ae(), ke(l, {
    book_url: n.book_url,
    display_url: n.display_url,
    debug: n.debug,
    themes_css: n.themes_css,
    initial_book_id: n.book_id,
    audiobook_edition_id: n.audiobook_edition_id,
    audiobook_manifest_url: n.audiobook_manifest_url
  }, null, 8, ["book_url", "display_url", "debug", "themes_css", "initial_book_id", "audiobook_edition_id", "audiobook_manifest_url"]);
}
const bw = /* @__PURE__ */ $n(pw, [["render", yw]]);
class _w {
  constructor(t, n) {
    var o = "https://api.talebook.org";
    const i = op(bw, n);
    hb(i, {
      server: n.server || o
    }), i.mount(t);
  }
}
export {
  _w as Reader
};
