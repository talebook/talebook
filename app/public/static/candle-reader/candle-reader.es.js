var sc = {};
/**
* @vue/shared v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function kn(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const Me = sc.NODE_ENV !== "production" ? Object.freeze({}) : {}, Po = sc.NODE_ENV !== "production" ? Object.freeze([]) : [], rt = () => {
}, Vm = () => !1, wi = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), tr = (e) => e.startsWith("onUpdate:"), ze = Object.assign, ra = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, Om = Object.prototype.hasOwnProperty, Ie = (e, t) => Om.call(e, t), ue = Array.isArray, uo = (e) => Si(e) === "[object Map]", Ar = (e) => Si(e) === "[object Set]", dl = (e) => Si(e) === "[object Date]", pe = (e) => typeof e == "function", He = (e) => typeof e == "string", Gt = (e) => typeof e == "symbol", Pe = (e) => e !== null && typeof e == "object", sa = (e) => (Pe(e) || pe(e)) && pe(e.then) && pe(e.catch), ac = Object.prototype.toString, Si = (e) => ac.call(e), aa = (e) => Si(e).slice(8, -1), lc = (e) => Si(e) === "[object Object]", la = (e) => He(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, ti = /* @__PURE__ */ kn(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), Tm = /* @__PURE__ */ kn(
  "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
), Dr = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, Am = /-(\w)/g, dt = Dr(
  (e) => e.replace(Am, (t, n) => n ? n.toUpperCase() : "")
), Dm = /\B([A-Z])/g, Rn = Dr(
  (e) => e.replace(Dm, "-$1").toLowerCase()
), Ht = Dr((e) => e.charAt(0).toUpperCase() + e.slice(1)), io = Dr(
  (e) => e ? `on${Ht(e)}` : ""
), Mn = (e, t) => !Object.is(e, t), Oo = (e, ...t) => {
  for (let n = 0; n < e.length; n++)
    e[n](...t);
}, nr = (e, t, n, o = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: o,
    value: n
  });
}, or = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
}, Im = (e) => {
  const t = He(e) ? Number(e) : NaN;
  return isNaN(t) ? e : t;
};
let fl;
const ki = () => fl || (fl = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Ut(e) {
  if (ue(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const o = e[n], i = He(o) ? Fm(o) : Ut(o);
      if (i)
        for (const r in i)
          t[r] = i[r];
    }
    return t;
  } else if (He(e) || Pe(e))
    return e;
}
const Pm = /;(?![^(]*\))/g, $m = /:([^]+)/, Mm = /\/\*[^]*?\*\//g;
function Fm(e) {
  const t = {};
  return e.replace(Mm, "").split(Pm).forEach((n) => {
    if (n) {
      const o = n.split($m);
      o.length > 1 && (t[o[0].trim()] = o[1].trim());
    }
  }), t;
}
function Lt(e) {
  let t = "";
  if (He(e))
    t = e;
  else if (ue(e))
    for (let n = 0; n < e.length; n++) {
      const o = Lt(e[n]);
      o && (t += o + " ");
    }
  else if (Pe(e))
    for (const n in e)
      e[n] && (t += n + " ");
  return t.trim();
}
const Lm = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot", Bm = "svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,text,textPath,title,tspan,unknown,use,view", Rm = "annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics", Hm = /* @__PURE__ */ kn(Lm), jm = /* @__PURE__ */ kn(Bm), zm = /* @__PURE__ */ kn(Rm), Um = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Wm = /* @__PURE__ */ kn(Um);
function uc(e) {
  return !!e || e === "";
}
function qm(e, t) {
  if (e.length !== t.length) return !1;
  let n = !0;
  for (let o = 0; n && o < e.length; o++)
    n = Ir(e[o], t[o]);
  return n;
}
function Ir(e, t) {
  if (e === t) return !0;
  let n = dl(e), o = dl(t);
  if (n || o)
    return n && o ? e.getTime() === t.getTime() : !1;
  if (n = Gt(e), o = Gt(t), n || o)
    return e === t;
  if (n = ue(e), o = ue(t), n || o)
    return n && o ? qm(e, t) : !1;
  if (n = Pe(e), o = Pe(t), n || o) {
    if (!n || !o)
      return !1;
    const i = Object.keys(e).length, r = Object.keys(t).length;
    if (i !== r)
      return !1;
    for (const s in e) {
      const a = e.hasOwnProperty(s), l = t.hasOwnProperty(s);
      if (a && !l || !a && l || !Ir(e[s], t[s]))
        return !1;
    }
  }
  return String(e) === String(t);
}
function Km(e, t) {
  return e.findIndex((n) => Ir(n, t));
}
const cc = (e) => !!(e && e.__v_isRef === !0), be = (e) => He(e) ? e : e == null ? "" : ue(e) || Pe(e) && (e.toString === ac || !pe(e.toString)) ? cc(e) ? be(e.value) : JSON.stringify(e, dc, 2) : String(e), dc = (e, t) => cc(t) ? dc(e, t.value) : uo(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (n, [o, i], r) => (n[ns(o, r) + " =>"] = i, n),
    {}
  )
} : Ar(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((n) => ns(n))
} : Gt(t) ? ns(t) : Pe(t) && !ue(t) && !lc(t) ? String(t) : t, ns = (e, t = "") => {
  var n;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    Gt(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e
  );
};
var Fe = {};
function jt(e, ...t) {
  console.warn(`[Vue warn] ${e}`, ...t);
}
let _t;
class fc {
  constructor(t = !1) {
    this.detached = t, this._active = !0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.parent = _t, !t && _t && (this.index = (_t.scopes || (_t.scopes = [])).push(
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
      const n = _t;
      try {
        return _t = this, t();
      } finally {
        _t = n;
      }
    } else Fe.NODE_ENV !== "production" && jt("cannot run an inactive effect scope.");
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    _t = this;
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    _t = this.parent;
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
function ua(e) {
  return new fc(e);
}
function Gm() {
  return _t;
}
function Dt(e, t = !1) {
  _t ? _t.cleanups.push(e) : Fe.NODE_ENV !== "production" && !t && jt(
    "onScopeDispose() is called when there is no active effect scope to be associated with."
  );
}
let $e;
const os = /* @__PURE__ */ new WeakSet();
class mc {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, _t && _t.active && _t.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, os.has(this) && (os.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || vc(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, ml(this), gc(this);
    const t = $e, n = Kt;
    $e = this, Kt = !0;
    try {
      return this.fn();
    } finally {
      Fe.NODE_ENV !== "production" && $e !== this && jt(
        "Active effect was not restored correctly - this is likely a Vue internal bug."
      ), pc(this), $e = t, Kt = n, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep)
        fa(t);
      this.deps = this.depsTail = void 0, ml(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? os.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    Ns(this) && this.run();
  }
  get dirty() {
    return Ns(this);
  }
}
let hc = 0, ni, oi;
function vc(e, t = !1) {
  if (e.flags |= 8, t) {
    e.next = oi, oi = e;
    return;
  }
  e.next = ni, ni = e;
}
function ca() {
  hc++;
}
function da() {
  if (--hc > 0)
    return;
  if (oi) {
    let t = oi;
    for (oi = void 0; t; ) {
      const n = t.next;
      t.next = void 0, t.flags &= -9, t = n;
    }
  }
  let e;
  for (; ni; ) {
    let t = ni;
    for (ni = void 0; t; ) {
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
function gc(e) {
  for (let t = e.deps; t; t = t.nextDep)
    t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function pc(e) {
  let t, n = e.depsTail, o = n;
  for (; o; ) {
    const i = o.prevDep;
    o.version === -1 ? (o === n && (n = i), fa(o), Ym(o)) : t = o, o.dep.activeLink = o.prevActiveLink, o.prevActiveLink = void 0, o = i;
  }
  e.deps = t, e.depsTail = n;
}
function Ns(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (t.dep.version !== t.version || t.dep.computed && (yc(t.dep.computed) || t.dep.version !== t.version))
      return !0;
  return !!e._dirty;
}
function yc(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === ai))
    return;
  e.globalVersion = ai;
  const t = e.dep;
  if (e.flags |= 2, t.version > 0 && !e.isSSR && e.deps && !Ns(e)) {
    e.flags &= -3;
    return;
  }
  const n = $e, o = Kt;
  $e = e, Kt = !0;
  try {
    gc(e);
    const i = e.fn(e._value);
    (t.version === 0 || Mn(i, e._value)) && (e._value = i, t.version++);
  } catch (i) {
    throw t.version++, i;
  } finally {
    $e = n, Kt = o, pc(e), e.flags &= -3;
  }
}
function fa(e, t = !1) {
  const { dep: n, prevSub: o, nextSub: i } = e;
  if (o && (o.nextSub = i, e.prevSub = void 0), i && (i.prevSub = o, e.nextSub = void 0), Fe.NODE_ENV !== "production" && n.subsHead === e && (n.subsHead = i), n.subs === e && (n.subs = o, !o && n.computed)) {
    n.computed.flags &= -5;
    for (let r = n.computed.deps; r; r = r.nextDep)
      fa(r, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function Ym(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let Kt = !0;
const bc = [];
function Cn() {
  bc.push(Kt), Kt = !1;
}
function En() {
  const e = bc.pop();
  Kt = e === void 0 ? !0 : e;
}
function ml(e) {
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
let ai = 0;
class Xm {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class ma {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, Fe.NODE_ENV !== "production" && (this.subsHead = void 0);
  }
  track(t) {
    if (!$e || !Kt || $e === this.computed)
      return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== $e)
      n = this.activeLink = new Xm($e, this), $e.deps ? (n.prevDep = $e.depsTail, $e.depsTail.nextDep = n, $e.depsTail = n) : $e.deps = $e.depsTail = n, _c(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const o = n.nextDep;
      o.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = o), n.prevDep = $e.depsTail, n.nextDep = void 0, $e.depsTail.nextDep = n, $e.depsTail = n, $e.deps === n && ($e.deps = o);
    }
    return Fe.NODE_ENV !== "production" && $e.onTrack && $e.onTrack(
      ze(
        {
          effect: $e
        },
        t
      )
    ), n;
  }
  trigger(t) {
    this.version++, ai++, this.notify(t);
  }
  notify(t) {
    ca();
    try {
      if (Fe.NODE_ENV !== "production")
        for (let n = this.subsHead; n; n = n.nextSub)
          n.sub.onTrigger && !(n.sub.flags & 8) && n.sub.onTrigger(
            ze(
              {
                effect: n.sub
              },
              t
            )
          );
      for (let n = this.subs; n; n = n.prevSub)
        n.sub.notify() && n.sub.dep.notify();
    } finally {
      da();
    }
  }
}
function _c(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let o = t.deps; o; o = o.nextDep)
        _c(o);
    }
    const n = e.dep.subs;
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), Fe.NODE_ENV !== "production" && e.dep.subsHead === void 0 && (e.dep.subsHead = e), e.dep.subs = e;
  }
}
const ir = /* @__PURE__ */ new WeakMap(), co = Symbol(
  Fe.NODE_ENV !== "production" ? "Object iterate" : ""
), Vs = Symbol(
  Fe.NODE_ENV !== "production" ? "Map keys iterate" : ""
), li = Symbol(
  Fe.NODE_ENV !== "production" ? "Array iterate" : ""
);
function it(e, t, n) {
  if (Kt && $e) {
    let o = ir.get(e);
    o || ir.set(e, o = /* @__PURE__ */ new Map());
    let i = o.get(n);
    i || (o.set(n, i = new ma()), i.map = o, i.key = n), Fe.NODE_ENV !== "production" ? i.track({
      target: e,
      type: t,
      key: n
    }) : i.track();
  }
}
function en(e, t, n, o, i, r) {
  const s = ir.get(e);
  if (!s) {
    ai++;
    return;
  }
  const a = (l) => {
    l && (Fe.NODE_ENV !== "production" ? l.trigger({
      target: e,
      type: t,
      key: n,
      newValue: o,
      oldValue: i,
      oldTarget: r
    }) : l.trigger());
  };
  if (ca(), t === "clear")
    s.forEach(a);
  else {
    const l = ue(e), c = l && la(n);
    if (l && n === "length") {
      const u = Number(o);
      s.forEach((d, m) => {
        (m === "length" || m === li || !Gt(m) && m >= u) && a(d);
      });
    } else
      switch ((n !== void 0 || s.has(void 0)) && a(s.get(n)), c && a(s.get(li)), t) {
        case "add":
          l ? c && a(s.get("length")) : (a(s.get(co)), uo(e) && a(s.get(Vs)));
          break;
        case "delete":
          l || (a(s.get(co)), uo(e) && a(s.get(Vs)));
          break;
        case "set":
          uo(e) && a(s.get(co));
          break;
      }
  }
  da();
}
function Jm(e, t) {
  const n = ir.get(e);
  return n && n.get(t);
}
function xo(e) {
  const t = ae(e);
  return t === e ? t : (it(t, "iterate", li), kt(e) ? t : t.map(ht));
}
function Pr(e) {
  return it(e = ae(e), "iterate", li), e;
}
const Zm = {
  __proto__: null,
  [Symbol.iterator]() {
    return is(this, Symbol.iterator, ht);
  },
  concat(...e) {
    return xo(this).concat(
      ...e.map((t) => ue(t) ? xo(t) : t)
    );
  },
  entries() {
    return is(this, "entries", (e) => (e[1] = ht(e[1]), e));
  },
  every(e, t) {
    return hn(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return hn(this, "filter", e, t, (n) => n.map(ht), arguments);
  },
  find(e, t) {
    return hn(this, "find", e, t, ht, arguments);
  },
  findIndex(e, t) {
    return hn(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return hn(this, "findLast", e, t, ht, arguments);
  },
  findLastIndex(e, t) {
    return hn(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return hn(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return rs(this, "includes", e);
  },
  indexOf(...e) {
    return rs(this, "indexOf", e);
  },
  join(e) {
    return xo(this).join(e);
  },
  // keys() iterator only reads `length`, no optimisation required
  lastIndexOf(...e) {
    return rs(this, "lastIndexOf", e);
  },
  map(e, t) {
    return hn(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return qo(this, "pop");
  },
  push(...e) {
    return qo(this, "push", e);
  },
  reduce(e, ...t) {
    return hl(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return hl(this, "reduceRight", e, t);
  },
  shift() {
    return qo(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return hn(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return qo(this, "splice", e);
  },
  toReversed() {
    return xo(this).toReversed();
  },
  toSorted(e) {
    return xo(this).toSorted(e);
  },
  toSpliced(...e) {
    return xo(this).toSpliced(...e);
  },
  unshift(...e) {
    return qo(this, "unshift", e);
  },
  values() {
    return is(this, "values", ht);
  }
};
function is(e, t, n) {
  const o = Pr(e), i = o[t]();
  return o !== e && !kt(e) && (i._next = i.next, i.next = () => {
    const r = i._next();
    return r.value && (r.value = n(r.value)), r;
  }), i;
}
const Qm = Array.prototype;
function hn(e, t, n, o, i, r) {
  const s = Pr(e), a = s !== e && !kt(e), l = s[t];
  if (l !== Qm[t]) {
    const d = l.apply(e, r);
    return a ? ht(d) : d;
  }
  let c = n;
  s !== e && (a ? c = function(d, m) {
    return n.call(this, ht(d), m, e);
  } : n.length > 2 && (c = function(d, m) {
    return n.call(this, d, m, e);
  }));
  const u = l.call(s, c, o);
  return a && i ? i(u) : u;
}
function hl(e, t, n, o) {
  const i = Pr(e);
  let r = n;
  return i !== e && (kt(e) ? n.length > 3 && (r = function(s, a, l) {
    return n.call(this, s, a, l, e);
  }) : r = function(s, a, l) {
    return n.call(this, s, ht(a), l, e);
  }), i[t](r, ...o);
}
function rs(e, t, n) {
  const o = ae(e);
  it(o, "iterate", li);
  const i = o[t](...n);
  return (i === -1 || i === !1) && ui(n[0]) ? (n[0] = ae(n[0]), o[t](...n)) : i;
}
function qo(e, t, n = []) {
  Cn(), ca();
  const o = ae(e)[t].apply(e, n);
  return da(), En(), o;
}
const eh = /* @__PURE__ */ kn("__proto__,__v_isRef,__isVue"), wc = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(Gt)
);
function th(e) {
  Gt(e) || (e = String(e));
  const t = ae(this);
  return it(t, "has", e), t.hasOwnProperty(e);
}
class Sc {
  constructor(t = !1, n = !1) {
    this._isReadonly = t, this._isShallow = n;
  }
  get(t, n, o) {
    const i = this._isReadonly, r = this._isShallow;
    if (n === "__v_isReactive")
      return !i;
    if (n === "__v_isReadonly")
      return i;
    if (n === "__v_isShallow")
      return r;
    if (n === "__v_raw")
      return o === (i ? r ? Vc : Nc : r ? xc : Ec).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(o) ? t : void 0;
    const s = ue(t);
    if (!i) {
      let l;
      if (s && (l = Zm[n]))
        return l;
      if (n === "hasOwnProperty")
        return th;
    }
    const a = Reflect.get(
      t,
      n,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      Be(t) ? t : o
    );
    return (Gt(n) ? wc.has(n) : eh(n)) || (i || it(t, "get", n), r) ? a : Be(a) ? s && la(n) ? a : a.value : Pe(a) ? i ? Ci(a) : ct(a) : a;
  }
}
class kc extends Sc {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, o, i) {
    let r = t[n];
    if (!this._isShallow) {
      const l = wn(r);
      if (!kt(o) && !wn(o) && (r = ae(r), o = ae(o)), !ue(t) && Be(r) && !Be(o))
        return l ? !1 : (r.value = o, !0);
    }
    const s = ue(t) && la(n) ? Number(n) < t.length : Ie(t, n), a = Reflect.set(
      t,
      n,
      o,
      Be(t) ? t : i
    );
    return t === ae(i) && (s ? Mn(o, r) && en(t, "set", n, o, r) : en(t, "add", n, o)), a;
  }
  deleteProperty(t, n) {
    const o = Ie(t, n), i = t[n], r = Reflect.deleteProperty(t, n);
    return r && o && en(t, "delete", n, void 0, i), r;
  }
  has(t, n) {
    const o = Reflect.has(t, n);
    return (!Gt(n) || !wc.has(n)) && it(t, "has", n), o;
  }
  ownKeys(t) {
    return it(
      t,
      "iterate",
      ue(t) ? "length" : co
    ), Reflect.ownKeys(t);
  }
}
class Cc extends Sc {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return Fe.NODE_ENV !== "production" && jt(
      `Set operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
  deleteProperty(t, n) {
    return Fe.NODE_ENV !== "production" && jt(
      `Delete operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
}
const nh = /* @__PURE__ */ new kc(), oh = /* @__PURE__ */ new Cc(), ih = /* @__PURE__ */ new kc(!0), rh = /* @__PURE__ */ new Cc(!0), Os = (e) => e, Pi = (e) => Reflect.getPrototypeOf(e);
function sh(e, t, n) {
  return function(...o) {
    const i = this.__v_raw, r = ae(i), s = uo(r), a = e === "entries" || e === Symbol.iterator && s, l = e === "keys" && s, c = i[e](...o), u = n ? Os : t ? Ts : ht;
    return !t && it(
      r,
      "iterate",
      l ? Vs : co
    ), {
      // iterator protocol
      next() {
        const { value: d, done: m } = c.next();
        return m ? { value: d, done: m } : {
          value: a ? [u(d[0]), u(d[1])] : u(d),
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
function $i(e) {
  return function(...t) {
    if (Fe.NODE_ENV !== "production") {
      const n = t[0] ? `on key "${t[0]}" ` : "";
      jt(
        `${Ht(e)} operation ${n}failed: target is readonly.`,
        ae(this)
      );
    }
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function ah(e, t) {
  const n = {
    get(i) {
      const r = this.__v_raw, s = ae(r), a = ae(i);
      e || (Mn(i, a) && it(s, "get", i), it(s, "get", a));
      const { has: l } = Pi(s), c = t ? Os : e ? Ts : ht;
      if (l.call(s, i))
        return c(r.get(i));
      if (l.call(s, a))
        return c(r.get(a));
      r !== s && r.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return !e && it(ae(i), "iterate", co), Reflect.get(i, "size", i);
    },
    has(i) {
      const r = this.__v_raw, s = ae(r), a = ae(i);
      return e || (Mn(i, a) && it(s, "has", i), it(s, "has", a)), i === a ? r.has(i) : r.has(i) || r.has(a);
    },
    forEach(i, r) {
      const s = this, a = s.__v_raw, l = ae(a), c = t ? Os : e ? Ts : ht;
      return !e && it(l, "iterate", co), a.forEach((u, d) => i.call(r, c(u), c(d), s));
    }
  };
  return ze(
    n,
    e ? {
      add: $i("add"),
      set: $i("set"),
      delete: $i("delete"),
      clear: $i("clear")
    } : {
      add(i) {
        !t && !kt(i) && !wn(i) && (i = ae(i));
        const r = ae(this);
        return Pi(r).has.call(r, i) || (r.add(i), en(r, "add", i, i)), this;
      },
      set(i, r) {
        !t && !kt(r) && !wn(r) && (r = ae(r));
        const s = ae(this), { has: a, get: l } = Pi(s);
        let c = a.call(s, i);
        c ? Fe.NODE_ENV !== "production" && vl(s, a, i) : (i = ae(i), c = a.call(s, i));
        const u = l.call(s, i);
        return s.set(i, r), c ? Mn(r, u) && en(s, "set", i, r, u) : en(s, "add", i, r), this;
      },
      delete(i) {
        const r = ae(this), { has: s, get: a } = Pi(r);
        let l = s.call(r, i);
        l ? Fe.NODE_ENV !== "production" && vl(r, s, i) : (i = ae(i), l = s.call(r, i));
        const c = a ? a.call(r, i) : void 0, u = r.delete(i);
        return l && en(r, "delete", i, void 0, c), u;
      },
      clear() {
        const i = ae(this), r = i.size !== 0, s = Fe.NODE_ENV !== "production" ? uo(i) ? new Map(i) : new Set(i) : void 0, a = i.clear();
        return r && en(
          i,
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
  ].forEach((i) => {
    n[i] = sh(i, e, t);
  }), n;
}
function $r(e, t) {
  const n = ah(e, t);
  return (o, i, r) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? o : Reflect.get(
    Ie(n, i) && i in o ? n : o,
    i,
    r
  );
}
const lh = {
  get: /* @__PURE__ */ $r(!1, !1)
}, uh = {
  get: /* @__PURE__ */ $r(!1, !0)
}, ch = {
  get: /* @__PURE__ */ $r(!0, !1)
}, dh = {
  get: /* @__PURE__ */ $r(!0, !0)
};
function vl(e, t, n) {
  const o = ae(n);
  if (o !== n && t.call(e, o)) {
    const i = aa(e);
    jt(
      `Reactive ${i} contains both the raw and reactive versions of the same object${i === "Map" ? " as keys" : ""}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`
    );
  }
}
const Ec = /* @__PURE__ */ new WeakMap(), xc = /* @__PURE__ */ new WeakMap(), Nc = /* @__PURE__ */ new WeakMap(), Vc = /* @__PURE__ */ new WeakMap();
function fh(e) {
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
function mh(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : fh(aa(e));
}
function ct(e) {
  return wn(e) ? e : Mr(
    e,
    !1,
    nh,
    lh,
    Ec
  );
}
function hh(e) {
  return Mr(
    e,
    !1,
    ih,
    uh,
    xc
  );
}
function Ci(e) {
  return Mr(
    e,
    !0,
    oh,
    ch,
    Nc
  );
}
function nn(e) {
  return Mr(
    e,
    !0,
    rh,
    dh,
    Vc
  );
}
function Mr(e, t, n, o, i) {
  if (!Pe(e))
    return Fe.NODE_ENV !== "production" && jt(
      `value cannot be made ${t ? "readonly" : "reactive"}: ${String(
        e
      )}`
    ), e;
  if (e.__v_raw && !(t && e.__v_isReactive))
    return e;
  const r = i.get(e);
  if (r)
    return r;
  const s = mh(e);
  if (s === 0)
    return e;
  const a = new Proxy(
    e,
    s === 2 ? o : n
  );
  return i.set(e, a), a;
}
function fo(e) {
  return wn(e) ? fo(e.__v_raw) : !!(e && e.__v_isReactive);
}
function wn(e) {
  return !!(e && e.__v_isReadonly);
}
function kt(e) {
  return !!(e && e.__v_isShallow);
}
function ui(e) {
  return e ? !!e.__v_raw : !1;
}
function ae(e) {
  const t = e && e.__v_raw;
  return t ? ae(t) : e;
}
function vh(e) {
  return !Ie(e, "__v_skip") && Object.isExtensible(e) && nr(e, "__v_skip", !0), e;
}
const ht = (e) => Pe(e) ? ct(e) : e, Ts = (e) => Pe(e) ? Ci(e) : e;
function Be(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function se(e) {
  return Oc(e, !1);
}
function ke(e) {
  return Oc(e, !0);
}
function Oc(e, t) {
  return Be(e) ? e : new gh(e, t);
}
class gh {
  constructor(t, n) {
    this.dep = new ma(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : ae(t), this._value = n ? t : ht(t), this.__v_isShallow = n;
  }
  get value() {
    return Fe.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, o = this.__v_isShallow || kt(t) || wn(t);
    t = o ? t : ae(t), Mn(t, n) && (this._rawValue = t, this._value = o ? t : ht(t), Fe.NODE_ENV !== "production" ? this.dep.trigger({
      target: this,
      type: "set",
      key: "value",
      newValue: t,
      oldValue: n
    }) : this.dep.trigger());
  }
}
function on(e) {
  return Be(e) ? e.value : e;
}
const ph = {
  get: (e, t, n) => t === "__v_raw" ? e : on(Reflect.get(e, t, n)),
  set: (e, t, n, o) => {
    const i = e[t];
    return Be(i) && !Be(n) ? (i.value = n, !0) : Reflect.set(e, t, n, o);
  }
};
function Tc(e) {
  return fo(e) ? e : new Proxy(e, ph);
}
function ha(e) {
  Fe.NODE_ENV !== "production" && !ui(e) && jt("toRefs() expects a reactive object but received a plain one.");
  const t = ue(e) ? new Array(e.length) : {};
  for (const n in e)
    t[n] = Ac(e, n);
  return t;
}
class yh {
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
    return Jm(ae(this._object), this._key);
  }
}
class bh {
  constructor(t) {
    this._getter = t, this.__v_isRef = !0, this.__v_isReadonly = !0, this._value = void 0;
  }
  get value() {
    return this._value = this._getter();
  }
}
function le(e, t, n) {
  return Be(e) ? e : pe(e) ? new bh(e) : Pe(e) && arguments.length > 1 ? Ac(e, t, n) : se(e);
}
function Ac(e, t, n) {
  const o = e[t];
  return Be(o) ? o : new yh(e, t, n);
}
class _h {
  constructor(t, n, o) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new ma(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = ai - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = o;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    $e !== this)
      return vc(this, !0), !0;
  }
  get value() {
    const t = Fe.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track();
    return yc(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter ? this.setter(t) : Fe.NODE_ENV !== "production" && jt("Write operation failed: computed value is readonly");
  }
}
function wh(e, t, n = !1) {
  let o, i;
  pe(e) ? o = e : (o = e.get, i = e.set);
  const r = new _h(o, i, n);
  return Fe.NODE_ENV !== "production" && t && !n && (r.onTrack = t.onTrack, r.onTrigger = t.onTrigger), r;
}
const Mi = {}, rr = /* @__PURE__ */ new WeakMap();
let ro;
function Sh(e, t = !1, n = ro) {
  if (n) {
    let o = rr.get(n);
    o || rr.set(n, o = []), o.push(e);
  } else Fe.NODE_ENV !== "production" && !t && jt(
    "onWatcherCleanup() was called when there was no active watcher to associate with."
  );
}
function kh(e, t, n = Me) {
  const { immediate: o, deep: i, once: r, scheduler: s, augmentJob: a, call: l } = n, c = (C) => {
    (n.onWarn || jt)(
      "Invalid watch source: ",
      C,
      "A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types."
    );
  }, u = (C) => i ? C : kt(C) || i === !1 || i === 0 ? _n(C, 1) : _n(C);
  let d, m, g, h, v = !1, b = !1;
  if (Be(e) ? (m = () => e.value, v = kt(e)) : fo(e) ? (m = () => u(e), v = !0) : ue(e) ? (b = !0, v = e.some((C) => fo(C) || kt(C)), m = () => e.map((C) => {
    if (Be(C))
      return C.value;
    if (fo(C))
      return u(C);
    if (pe(C))
      return l ? l(C, 2) : C();
    Fe.NODE_ENV !== "production" && c(C);
  })) : pe(e) ? t ? m = l ? () => l(e, 2) : e : m = () => {
    if (g) {
      Cn();
      try {
        g();
      } finally {
        En();
      }
    }
    const C = ro;
    ro = d;
    try {
      return l ? l(e, 3, [h]) : e(h);
    } finally {
      ro = C;
    }
  } : (m = rt, Fe.NODE_ENV !== "production" && c(e)), t && i) {
    const C = m, V = i === !0 ? 1 / 0 : i;
    m = () => _n(C(), V);
  }
  const k = Gm(), O = () => {
    d.stop(), k && ra(k.effects, d);
  };
  if (r && t) {
    const C = t;
    t = (...V) => {
      C(...V), O();
    };
  }
  let P = b ? new Array(e.length).fill(Mi) : Mi;
  const B = (C) => {
    if (!(!(d.flags & 1) || !d.dirty && !C))
      if (t) {
        const V = d.run();
        if (i || v || (b ? V.some((L, x) => Mn(L, P[x])) : Mn(V, P))) {
          g && g();
          const L = ro;
          ro = d;
          try {
            const x = [
              V,
              // pass undefined as the old value when it's changed for the first time
              P === Mi ? void 0 : b && P[0] === Mi ? [] : P,
              h
            ];
            l ? l(t, 3, x) : (
              // @ts-expect-error
              t(...x)
            ), P = V;
          } finally {
            ro = L;
          }
        }
      } else
        d.run();
  };
  return a && a(B), d = new mc(m), d.scheduler = s ? () => s(B, !1) : B, h = (C) => Sh(C, !1, d), g = d.onStop = () => {
    const C = rr.get(d);
    if (C) {
      if (l)
        l(C, 4);
      else
        for (const V of C) V();
      rr.delete(d);
    }
  }, Fe.NODE_ENV !== "production" && (d.onTrack = n.onTrack, d.onTrigger = n.onTrigger), t ? o ? B(!0) : P = d.run() : s ? s(B.bind(null, !0), !0) : d.run(), O.pause = d.pause.bind(d), O.resume = d.resume.bind(d), O.stop = O, O;
}
function _n(e, t = 1 / 0, n) {
  if (t <= 0 || !Pe(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e)))
    return e;
  if (n.add(e), t--, Be(e))
    _n(e.value, t, n);
  else if (ue(e))
    for (let o = 0; o < e.length; o++)
      _n(e[o], t, n);
  else if (Ar(e) || uo(e))
    e.forEach((o) => {
      _n(o, t, n);
    });
  else if (lc(e)) {
    for (const o in e)
      _n(e[o], t, n);
    for (const o of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, o) && _n(e[o], t, n);
  }
  return e;
}
var S = {};
const mo = [];
function Ui(e) {
  mo.push(e);
}
function Wi() {
  mo.pop();
}
let ss = !1;
function W(e, ...t) {
  if (ss) return;
  ss = !0, Cn();
  const n = mo.length ? mo[mo.length - 1].component : null, o = n && n.appContext.config.warnHandler, i = Ch();
  if (o)
    zo(
      o,
      n,
      11,
      [
        // eslint-disable-next-line no-restricted-syntax
        e + t.map((r) => {
          var s, a;
          return (a = (s = r.toString) == null ? void 0 : s.call(r)) != null ? a : JSON.stringify(r);
        }).join(""),
        n && n.proxy,
        i.map(
          ({ vnode: r }) => `at <${jr(n, r.type)}>`
        ).join(`
`),
        i
      ]
    );
  else {
    const r = [`[Vue warn]: ${e}`, ...t];
    i.length && r.push(`
`, ...Eh(i)), console.warn(...r);
  }
  En(), ss = !1;
}
function Ch() {
  let e = mo[mo.length - 1];
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
function Eh(e) {
  const t = [];
  return e.forEach((n, o) => {
    t.push(...o === 0 ? [] : [`
`], ...xh(n));
  }), t;
}
function xh({ vnode: e, recurseCount: t }) {
  const n = t > 0 ? `... (${t} recursive calls)` : "", o = e.component ? e.component.parent == null : !1, i = ` at <${jr(
    e.component,
    e.type,
    o
  )}`, r = ">" + n;
  return e.props ? [i, ...Nh(e.props), r] : [i + r];
}
function Nh(e) {
  const t = [], n = Object.keys(e);
  return n.slice(0, 3).forEach((o) => {
    t.push(...Dc(o, e[o]));
  }), n.length > 3 && t.push(" ..."), t;
}
function Dc(e, t, n) {
  return He(t) ? (t = JSON.stringify(t), n ? t : [`${e}=${t}`]) : typeof t == "number" || typeof t == "boolean" || t == null ? n ? t : [`${e}=${t}`] : Be(t) ? (t = Dc(e, ae(t.value), !0), n ? t : [`${e}=Ref<`, t, ">"]) : pe(t) ? [`${e}=fn${t.name ? `<${t.name}>` : ""}`] : (t = ae(t), n ? t : [`${e}=`, t]);
}
function Vh(e, t) {
  S.NODE_ENV !== "production" && e !== void 0 && (typeof e != "number" ? W(`${t} is not a valid number - got ${JSON.stringify(e)}.`) : isNaN(e) && W(`${t} is NaN - the duration expression might be incorrect.`));
}
const va = {
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
function zo(e, t, n, o) {
  try {
    return o ? e(...o) : e();
  } catch (i) {
    Ei(i, t, n);
  }
}
function Yt(e, t, n, o) {
  if (pe(e)) {
    const i = zo(e, t, n, o);
    return i && sa(i) && i.catch((r) => {
      Ei(r, t, n);
    }), i;
  }
  if (ue(e)) {
    const i = [];
    for (let r = 0; r < e.length; r++)
      i.push(Yt(e[r], t, n, o));
    return i;
  } else S.NODE_ENV !== "production" && W(
    `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof e}`
  );
}
function Ei(e, t, n, o = !0) {
  const i = t ? t.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: s } = t && t.appContext.config || Me;
  if (t) {
    let a = t.parent;
    const l = t.proxy, c = S.NODE_ENV !== "production" ? va[n] : `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; a; ) {
      const u = a.ec;
      if (u) {
        for (let d = 0; d < u.length; d++)
          if (u[d](e, l, c) === !1)
            return;
      }
      a = a.parent;
    }
    if (r) {
      Cn(), zo(r, null, 10, [
        e,
        l,
        c
      ]), En();
      return;
    }
  }
  Oh(e, n, i, o, s);
}
function Oh(e, t, n, o = !0, i = !1) {
  if (S.NODE_ENV !== "production") {
    const r = va[t];
    if (n && Ui(n), W(`Unhandled error${r ? ` during execution of ${r}` : ""}`), n && Wi(), o)
      throw e;
    console.error(e);
  } else {
    if (i)
      throw e;
    console.error(e);
  }
}
const St = [];
let Qt = -1;
const $o = [];
let An = null, To = 0;
const Ic = /* @__PURE__ */ Promise.resolve();
let sr = null;
const Th = 100;
function ft(e) {
  const t = sr || Ic;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function Ah(e) {
  let t = Qt + 1, n = St.length;
  for (; t < n; ) {
    const o = t + n >>> 1, i = St[o], r = ci(i);
    r < e || r === e && i.flags & 2 ? t = o + 1 : n = o;
  }
  return t;
}
function Fr(e) {
  if (!(e.flags & 1)) {
    const t = ci(e), n = St[St.length - 1];
    !n || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= ci(n) ? St.push(e) : St.splice(Ah(t), 0, e), e.flags |= 1, Pc();
  }
}
function Pc() {
  sr || (sr = Ic.then(Fc));
}
function $c(e) {
  ue(e) ? $o.push(...e) : An && e.id === -1 ? An.splice(To + 1, 0, e) : e.flags & 1 || ($o.push(e), e.flags |= 1), Pc();
}
function gl(e, t, n = Qt + 1) {
  for (S.NODE_ENV !== "production" && (t = t || /* @__PURE__ */ new Map()); n < St.length; n++) {
    const o = St[n];
    if (o && o.flags & 2) {
      if (e && o.id !== e.uid || S.NODE_ENV !== "production" && ga(t, o))
        continue;
      St.splice(n, 1), n--, o.flags & 4 && (o.flags &= -2), o(), o.flags & 4 || (o.flags &= -2);
    }
  }
}
function Mc(e) {
  if ($o.length) {
    const t = [...new Set($o)].sort(
      (n, o) => ci(n) - ci(o)
    );
    if ($o.length = 0, An) {
      An.push(...t);
      return;
    }
    for (An = t, S.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map()), To = 0; To < An.length; To++) {
      const n = An[To];
      S.NODE_ENV !== "production" && ga(e, n) || (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2);
    }
    An = null, To = 0;
  }
}
const ci = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function Fc(e) {
  S.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map());
  const t = S.NODE_ENV !== "production" ? (n) => ga(e, n) : rt;
  try {
    for (Qt = 0; Qt < St.length; Qt++) {
      const n = St[Qt];
      if (n && !(n.flags & 8)) {
        if (S.NODE_ENV !== "production" && t(n))
          continue;
        n.flags & 4 && (n.flags &= -2), zo(
          n,
          n.i,
          n.i ? 15 : 14
        ), n.flags & 4 || (n.flags &= -2);
      }
    }
  } finally {
    for (; Qt < St.length; Qt++) {
      const n = St[Qt];
      n && (n.flags &= -2);
    }
    Qt = -1, St.length = 0, Mc(e), sr = null, (St.length || $o.length) && Fc(e);
  }
}
function ga(e, t) {
  const n = e.get(t) || 0;
  if (n > Th) {
    const o = t.i, i = o && Na(o.type);
    return Ei(
      `Maximum recursive updates exceeded${i ? ` in component <${i}>` : ""}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`,
      null,
      10
    ), !0;
  }
  return e.set(t, n + 1), !1;
}
let qt = !1;
const qi = /* @__PURE__ */ new Map();
S.NODE_ENV !== "production" && (ki().__VUE_HMR_RUNTIME__ = {
  createRecord: as(Lc),
  rerender: as(Ph),
  reload: as($h)
});
const yo = /* @__PURE__ */ new Map();
function Dh(e) {
  const t = e.type.__hmrId;
  let n = yo.get(t);
  n || (Lc(t, e.type), n = yo.get(t)), n.instances.add(e);
}
function Ih(e) {
  yo.get(e.type.__hmrId).instances.delete(e);
}
function Lc(e, t) {
  return yo.has(e) ? !1 : (yo.set(e, {
    initialDef: ar(t),
    instances: /* @__PURE__ */ new Set()
  }), !0);
}
function ar(e) {
  return Vd(e) ? e.__vccOpts : e;
}
function Ph(e, t) {
  const n = yo.get(e);
  n && (n.initialDef.render = t, [...n.instances].forEach((o) => {
    t && (o.render = t, ar(o.type).render = t), o.renderCache = [], qt = !0, o.update(), qt = !1;
  }));
}
function $h(e, t) {
  const n = yo.get(e);
  if (!n) return;
  t = ar(t), pl(n.initialDef, t);
  const o = [...n.instances];
  for (let i = 0; i < o.length; i++) {
    const r = o[i], s = ar(r.type);
    let a = qi.get(s);
    a || (s !== n.initialDef && pl(s, t), qi.set(s, a = /* @__PURE__ */ new Set())), a.add(r), r.appContext.propsCache.delete(r.type), r.appContext.emitsCache.delete(r.type), r.appContext.optionsCache.delete(r.type), r.ceReload ? (a.add(r), r.ceReload(t.styles), a.delete(r)) : r.parent ? Fr(() => {
      qt = !0, r.parent.update(), qt = !1, a.delete(r);
    }) : r.appContext.reload ? r.appContext.reload() : typeof window < "u" ? window.location.reload() : console.warn(
      "[HMR] Root or manually mounted instance modified. Full reload required."
    ), r.root.ce && r !== r.root && r.root.ce._removeChildStyle(s);
  }
  $c(() => {
    qi.clear();
  });
}
function pl(e, t) {
  ze(e, t);
  for (const n in e)
    n !== "__file" && !(n in t) && delete e[n];
}
function as(e) {
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
let tn, Zo = [], As = !1;
function xi(e, ...t) {
  tn ? tn.emit(e, ...t) : As || Zo.push({ event: e, args: t });
}
function Bc(e, t) {
  var n, o;
  tn = e, tn ? (tn.enabled = !0, Zo.forEach(({ event: i, args: r }) => tn.emit(i, ...r)), Zo = []) : /* handle late devtools injection - only do this if we are in an actual */ /* browser environment to avoid the timer handle stalling test runner exit */ /* (#4815) */ typeof window < "u" && // some envs mock window but not fully
  window.HTMLElement && // also exclude jsdom
  // eslint-disable-next-line no-restricted-syntax
  !((o = (n = window.navigator) == null ? void 0 : n.userAgent) != null && o.includes("jsdom")) ? ((t.__VUE_DEVTOOLS_HOOK_REPLAY__ = t.__VUE_DEVTOOLS_HOOK_REPLAY__ || []).push((r) => {
    Bc(r, t);
  }), setTimeout(() => {
    tn || (t.__VUE_DEVTOOLS_HOOK_REPLAY__ = null, As = !0, Zo = []);
  }, 3e3)) : (As = !0, Zo = []);
}
function Mh(e, t) {
  xi("app:init", e, t, {
    Fragment: fe,
    Text: ko,
    Comment: Ze,
    Static: Gi
  });
}
function Fh(e) {
  xi("app:unmount", e);
}
const Lh = /* @__PURE__ */ pa(
  "component:added"
  /* COMPONENT_ADDED */
), Rc = /* @__PURE__ */ pa(
  "component:updated"
  /* COMPONENT_UPDATED */
), Bh = /* @__PURE__ */ pa(
  "component:removed"
  /* COMPONENT_REMOVED */
), Rh = (e) => {
  tn && typeof tn.cleanupBuffer == "function" && // remove the component if it wasn't buffered
  !tn.cleanupBuffer(e) && Bh(e);
};
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function pa(e) {
  return (t) => {
    xi(
      e,
      t.appContext.app,
      t.uid,
      t.parent ? t.parent.uid : void 0,
      t
    );
  };
}
const Hh = /* @__PURE__ */ Hc(
  "perf:start"
  /* PERFORMANCE_START */
), jh = /* @__PURE__ */ Hc(
  "perf:end"
  /* PERFORMANCE_END */
);
function Hc(e) {
  return (t, n, o) => {
    xi(e, t.appContext.app, t.uid, t, n, o);
  };
}
function zh(e, t, n) {
  xi(
    "component:emit",
    e.appContext.app,
    e,
    t,
    n
  );
}
let tt = null, jc = null;
function lr(e) {
  const t = tt;
  return tt = e, jc = e && e.type.__scopeId || null, t;
}
function T(e, t = tt, n) {
  if (!t || e._n)
    return e;
  const o = (...i) => {
    o._d && Dl(-1);
    const r = lr(t);
    let s;
    try {
      s = e(...i);
    } finally {
      lr(r), o._d && Dl(1);
    }
    return S.NODE_ENV !== "production" && Rc(t), s;
  };
  return o._n = !0, o._c = !0, o._d = !0, o;
}
function zc(e) {
  Tm(e) && W("Do not use built-in directive ids as custom directive id: " + e);
}
function vt(e, t) {
  if (tt === null)
    return S.NODE_ENV !== "production" && W("withDirectives can only be used inside render functions."), e;
  const n = Hr(tt), o = e.dirs || (e.dirs = []);
  for (let i = 0; i < t.length; i++) {
    let [r, s, a, l = Me] = t[i];
    r && (pe(r) && (r = {
      mounted: r,
      updated: r
    }), r.deep && _n(s), o.push({
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
function Qn(e, t, n, o) {
  const i = e.dirs, r = t && t.dirs;
  for (let s = 0; s < i.length; s++) {
    const a = i[s];
    r && (a.oldValue = r[s].value);
    let l = a.dir[o];
    l && (Cn(), Yt(l, n, 8, [
      e.el,
      a,
      e,
      t
    ]), En());
  }
}
const Uc = Symbol("_vte"), Wc = (e) => e.__isTeleport, ho = (e) => e && (e.disabled || e.disabled === ""), Uh = (e) => e && (e.defer || e.defer === ""), yl = (e) => typeof SVGElement < "u" && e instanceof SVGElement, bl = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement, Ds = (e, t) => {
  const n = e && e.to;
  if (He(n))
    if (t) {
      const o = t(n);
      return S.NODE_ENV !== "production" && !o && !ho(e) && W(
        `Failed to locate Teleport target with selector "${n}". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.`
      ), o;
    } else
      return S.NODE_ENV !== "production" && W(
        "Current renderer does not support string target for Teleports. (missing querySelector renderer option)"
      ), null;
  else
    return S.NODE_ENV !== "production" && !n && !ho(e) && W(`Invalid Teleport target: ${n}`), n;
}, Wh = {
  name: "Teleport",
  __isTeleport: !0,
  process(e, t, n, o, i, r, s, a, l, c) {
    const {
      mc: u,
      pc: d,
      pbc: m,
      o: { insert: g, querySelector: h, createText: v, createComment: b }
    } = c, k = ho(t.props);
    let { shapeFlag: O, children: P, dynamicChildren: B } = t;
    if (S.NODE_ENV !== "production" && qt && (l = !1, B = null), e == null) {
      const C = t.el = S.NODE_ENV !== "production" ? b("teleport start") : v(""), V = t.anchor = S.NODE_ENV !== "production" ? b("teleport end") : v("");
      g(C, n, o), g(V, n, o);
      const L = (N, $) => {
        O & 16 && (i && i.isCE && (i.ce._teleportTarget = N), u(
          P,
          N,
          $,
          i,
          r,
          s,
          a,
          l
        ));
      }, x = () => {
        const N = t.target = Ds(t.props, h), $ = qc(N, t, v, g);
        N ? (s !== "svg" && yl(N) ? s = "svg" : s !== "mathml" && bl(N) && (s = "mathml"), k || (L(N, $), Ki(t, !1))) : S.NODE_ENV !== "production" && !k && W(
          "Invalid Teleport target on mount:",
          N,
          `(${typeof N})`
        );
      };
      k && (L(n, V), Ki(t, !0)), Uh(t.props) ? xt(x, r) : x();
    } else {
      t.el = e.el, t.targetStart = e.targetStart;
      const C = t.anchor = e.anchor, V = t.target = e.target, L = t.targetAnchor = e.targetAnchor, x = ho(e.props), N = x ? n : V, $ = x ? C : L;
      if (s === "svg" || yl(V) ? s = "svg" : (s === "mathml" || bl(V)) && (s = "mathml"), B ? (m(
        e.dynamicChildren,
        B,
        N,
        i,
        r,
        s,
        a
      ), ii(e, t, !0)) : l || d(
        e,
        t,
        N,
        $,
        i,
        r,
        s,
        a,
        !1
      ), k)
        x ? t.props && e.props && t.props.to !== e.props.to && (t.props.to = e.props.to) : Fi(
          t,
          n,
          C,
          c,
          1
        );
      else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
        const E = t.target = Ds(
          t.props,
          h
        );
        E ? Fi(
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
      } else x && Fi(
        t,
        V,
        L,
        c,
        1
      );
      Ki(t, k);
    }
  },
  remove(e, t, n, { um: o, o: { remove: i } }, r) {
    const {
      shapeFlag: s,
      children: a,
      anchor: l,
      targetStart: c,
      targetAnchor: u,
      target: d,
      props: m
    } = e;
    if (d && (i(c), i(u)), r && i(l), s & 16) {
      const g = r || !ho(m);
      for (let h = 0; h < a.length; h++) {
        const v = a[h];
        o(
          v,
          t,
          n,
          g,
          !!v.dynamicChildren
        );
      }
    }
  },
  move: Fi,
  hydrate: qh
};
function Fi(e, t, n, { o: { insert: o }, m: i }, r = 2) {
  r === 0 && o(e.targetAnchor, t, n);
  const { el: s, anchor: a, shapeFlag: l, children: c, props: u } = e, d = r === 2;
  if (d && o(s, t, n), (!d || ho(u)) && l & 16)
    for (let m = 0; m < c.length; m++)
      i(
        c[m],
        t,
        n,
        2
      );
  d && o(a, t, n);
}
function qh(e, t, n, o, i, r, {
  o: { nextSibling: s, parentNode: a, querySelector: l, insert: c, createText: u }
}, d) {
  const m = t.target = Ds(
    t.props,
    l
  );
  if (m) {
    const g = ho(t.props), h = m._lpa || m.firstChild;
    if (t.shapeFlag & 16)
      if (g)
        t.anchor = d(
          s(e),
          t,
          a(e),
          n,
          o,
          i,
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
        t.targetAnchor || qc(m, t, u, c), d(
          h && s(h),
          t,
          m,
          n,
          o,
          i,
          r
        );
      }
    Ki(t, g);
  }
  return t.anchor && s(t.anchor);
}
const Kh = Wh;
function Ki(e, t) {
  const n = e.ctx;
  if (n && n.ut) {
    let o, i;
    for (t ? (o = e.el, i = e.anchor) : (o = e.targetStart, i = e.targetAnchor); o && o !== i; )
      o.nodeType === 1 && o.setAttribute("data-v-owner", n.uid), o = o.nextSibling;
    n.ut();
  }
}
function qc(e, t, n, o) {
  const i = t.targetStart = n(""), r = t.targetAnchor = n("");
  return i[Uc] = r, e && (o(i, e), o(r, e)), r;
}
const Dn = Symbol("_leaveCb"), Li = Symbol("_enterCb");
function Kc() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  return un(() => {
    e.isMounted = !0;
  }), gt(() => {
    e.isUnmounting = !0;
  }), e;
}
const Ft = [Function, Array], Gc = {
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
}, Yc = (e) => {
  const t = e.subTree;
  return t.component ? Yc(t.component) : t;
}, Gh = {
  name: "BaseTransition",
  props: Gc,
  setup(e, { slots: t }) {
    const n = Rr(), o = Kc();
    return () => {
      const i = t.default && ya(t.default(), !0);
      if (!i || !i.length)
        return;
      const r = Xc(i), s = ae(e), { mode: a } = s;
      if (S.NODE_ENV !== "production" && a && a !== "in-out" && a !== "out-in" && a !== "default" && W(`invalid <transition> mode: ${a}`), o.isLeaving)
        return ls(r);
      const l = _l(r);
      if (!l)
        return ls(r);
      let c = di(
        l,
        s,
        o,
        n,
        // #11061, ensure enterHooks is fresh after clone
        (m) => c = m
      );
      l.type !== Ze && bo(l, c);
      const u = n.subTree, d = u && _l(u);
      if (d && d.type !== Ze && !ao(l, d) && Yc(n).type !== Ze) {
        const m = di(
          d,
          s,
          o,
          n
        );
        if (bo(d, m), a === "out-in" && l.type !== Ze)
          return o.isLeaving = !0, m.afterLeave = () => {
            o.isLeaving = !1, n.job.flags & 8 || n.update(), delete m.afterLeave;
          }, ls(r);
        a === "in-out" && l.type !== Ze && (m.delayLeave = (g, h, v) => {
          const b = Jc(
            o,
            d
          );
          b[String(d.key)] = d, g[Dn] = () => {
            h(), g[Dn] = void 0, delete c.delayedLeave;
          }, c.delayedLeave = v;
        });
      }
      return r;
    };
  }
};
function Xc(e) {
  let t = e[0];
  if (e.length > 1) {
    let n = !1;
    for (const o of e)
      if (o.type !== Ze) {
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
const Yh = Gh;
function Jc(e, t) {
  const { leavingVNodes: n } = e;
  let o = n.get(t.type);
  return o || (o = /* @__PURE__ */ Object.create(null), n.set(t.type, o)), o;
}
function di(e, t, n, o, i) {
  const {
    appear: r,
    mode: s,
    persisted: a = !1,
    onBeforeEnter: l,
    onEnter: c,
    onAfterEnter: u,
    onEnterCancelled: d,
    onBeforeLeave: m,
    onLeave: g,
    onAfterLeave: h,
    onLeaveCancelled: v,
    onBeforeAppear: b,
    onAppear: k,
    onAfterAppear: O,
    onAppearCancelled: P
  } = t, B = String(e.key), C = Jc(n, e), V = (N, $) => {
    N && Yt(
      N,
      o,
      9,
      $
    );
  }, L = (N, $) => {
    const E = $[1];
    V(N, $), ue(N) ? N.every((w) => w.length <= 1) && E() : N.length <= 1 && E();
  }, x = {
    mode: s,
    persisted: a,
    beforeEnter(N) {
      let $ = l;
      if (!n.isMounted)
        if (r)
          $ = b || l;
        else
          return;
      N[Dn] && N[Dn](
        !0
        /* cancelled */
      );
      const E = C[B];
      E && ao(e, E) && E.el[Dn] && E.el[Dn](), V($, [N]);
    },
    enter(N) {
      let $ = c, E = u, w = d;
      if (!n.isMounted)
        if (r)
          $ = k || c, E = O || u, w = P || d;
        else
          return;
      let A = !1;
      const M = N[Li] = (ee) => {
        A || (A = !0, ee ? V(w, [N]) : V(E, [N]), x.delayedLeave && x.delayedLeave(), N[Li] = void 0);
      };
      $ ? L($, [N, M]) : M();
    },
    leave(N, $) {
      const E = String(e.key);
      if (N[Li] && N[Li](
        !0
        /* cancelled */
      ), n.isUnmounting)
        return $();
      V(m, [N]);
      let w = !1;
      const A = N[Dn] = (M) => {
        w || (w = !0, $(), M ? V(v, [N]) : V(h, [N]), N[Dn] = void 0, C[E] === e && delete C[E]);
      };
      C[E] = e, g ? L(g, [N, A]) : A();
    },
    clone(N) {
      const $ = di(
        N,
        t,
        n,
        o,
        i
      );
      return i && i($), $;
    }
  };
  return x;
}
function ls(e) {
  if (Ni(e))
    return e = an(e), e.children = null, e;
}
function _l(e) {
  if (!Ni(e))
    return Wc(e.type) && e.children ? Xc(e.children) : e;
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
function bo(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, bo(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function ya(e, t = !1, n) {
  let o = [], i = 0;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    const a = n == null ? s.key : String(n) + String(s.key != null ? s.key : r);
    s.type === fe ? (s.patchFlag & 128 && i++, o = o.concat(
      ya(s.children, t, a)
    )) : (t || s.type !== Ze) && o.push(a != null ? an(s, { key: a }) : s);
  }
  if (i > 1)
    for (let r = 0; r < o.length; r++)
      o[r].patchFlag = -2;
  return o;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Xh(e, t) {
  return pe(e) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    ze({ name: e.name }, t, { setup: e })
  ) : e;
}
function Zc(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
const Jh = /* @__PURE__ */ new WeakSet();
function Is(e, t, n, o, i = !1) {
  if (ue(e)) {
    e.forEach(
      (h, v) => Is(
        h,
        t && (ue(t) ? t[v] : t),
        n,
        o,
        i
      )
    );
    return;
  }
  if (Mo(o) && !i)
    return;
  const r = o.shapeFlag & 4 ? Hr(o.component) : o.el, s = i ? null : r, { i: a, r: l } = e;
  if (S.NODE_ENV !== "production" && !a) {
    W(
      "Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function."
    );
    return;
  }
  const c = t && t.r, u = a.refs === Me ? a.refs = {} : a.refs, d = a.setupState, m = ae(d), g = d === Me ? () => !1 : (h) => S.NODE_ENV !== "production" && (Ie(m, h) && !Be(m[h]) && W(
    `Template ref "${h}" used on a non-ref value. It will not work in the production build.`
  ), Jh.has(m[h])) ? !1 : Ie(m, h);
  if (c != null && c !== l && (He(c) ? (u[c] = null, g(c) && (d[c] = null)) : Be(c) && (c.value = null)), pe(l))
    zo(l, a, 12, [s, u]);
  else {
    const h = He(l), v = Be(l);
    if (h || v) {
      const b = () => {
        if (e.f) {
          const k = h ? g(l) ? d[l] : u[l] : l.value;
          i ? ue(k) && ra(k, r) : ue(k) ? k.includes(r) || k.push(r) : h ? (u[l] = [r], g(l) && (d[l] = u[l])) : (l.value = [r], e.k && (u[e.k] = l.value));
        } else h ? (u[l] = s, g(l) && (d[l] = s)) : v ? (l.value = s, e.k && (u[e.k] = s)) : S.NODE_ENV !== "production" && W("Invalid template ref type:", l, `(${typeof l})`);
      };
      s ? (b.id = -1, xt(b, n)) : b();
    } else S.NODE_ENV !== "production" && W("Invalid template ref type:", l, `(${typeof l})`);
  }
}
ki().requestIdleCallback;
ki().cancelIdleCallback;
const Mo = (e) => !!e.type.__asyncLoader, Ni = (e) => e.type.__isKeepAlive;
function Qc(e, t) {
  td(e, "a", t);
}
function ed(e, t) {
  td(e, "da", t);
}
function td(e, t, n = st) {
  const o = e.__wdc || (e.__wdc = () => {
    let i = n;
    for (; i; ) {
      if (i.isDeactivated)
        return;
      i = i.parent;
    }
    return e();
  });
  if (Lr(t, o, n), n) {
    let i = n.parent;
    for (; i && i.parent; )
      Ni(i.parent.vnode) && Zh(o, t, n, i), i = i.parent;
  }
}
function Zh(e, t, n, o) {
  const i = Lr(
    t,
    e,
    o,
    !0
    /* prepend */
  );
  nd(() => {
    ra(o[t], i);
  }, n);
}
function Lr(e, t, n = st, o = !1) {
  if (n) {
    const i = n[e] || (n[e] = []), r = t.__weh || (t.__weh = (...s) => {
      Cn();
      const a = Vi(n), l = Yt(t, n, e, s);
      return a(), En(), l;
    });
    return o ? i.unshift(r) : i.push(r), r;
  } else if (S.NODE_ENV !== "production") {
    const i = io(va[e].replace(/ hook$/, ""));
    W(
      `${i} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
    );
  }
}
const xn = (e) => (t, n = st) => {
  (!mi || e === "sp") && Lr(e, (...o) => t(...o), n);
}, ba = xn("bm"), un = xn("m"), Qh = xn(
  "bu"
), _a = xn("u"), gt = xn(
  "bum"
), nd = xn("um"), ev = xn(
  "sp"
), tv = xn("rtg"), nv = xn("rtc");
function ov(e, t = st) {
  Lr("ec", e, t);
}
const Ps = "components", iv = "directives", rv = Symbol.for("v-ndc");
function sv(e) {
  return He(e) && od(Ps, e, !1) || e;
}
function So(e) {
  return od(iv, e);
}
function od(e, t, n = !0, o = !1) {
  const i = tt || st;
  if (i) {
    const r = i.type;
    if (e === Ps) {
      const a = Na(
        r,
        !1
      );
      if (a && (a === t || a === dt(t) || a === Ht(dt(t))))
        return r;
    }
    const s = (
      // local registration
      // check instance[type] first which is resolved for options API
      wl(i[e] || r[e], t) || // global registration
      wl(i.appContext[e], t)
    );
    if (!s && o)
      return r;
    if (S.NODE_ENV !== "production" && n && !s) {
      const a = e === Ps ? `
If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.` : "";
      W(`Failed to resolve ${e.slice(0, -1)}: ${t}${a}`);
    }
    return s;
  } else S.NODE_ENV !== "production" && W(
    `resolve${Ht(e.slice(0, -1))} can only be used in render() or setup().`
  );
}
function wl(e, t) {
  return e && (e[t] || e[dt(t)] || e[Ht(dt(t))]);
}
function Tt(e, t, n, o) {
  let i;
  const r = n, s = ue(e);
  if (s || He(e)) {
    const a = s && fo(e);
    let l = !1;
    a && (l = !kt(e), e = Pr(e)), i = new Array(e.length);
    for (let c = 0, u = e.length; c < u; c++)
      i[c] = t(
        l ? ht(e[c]) : e[c],
        c,
        void 0,
        r
      );
  } else if (typeof e == "number") {
    S.NODE_ENV !== "production" && !Number.isInteger(e) && W(`The v-for range expect an integer value but got ${e}.`), i = new Array(e);
    for (let a = 0; a < e; a++)
      i[a] = t(a + 1, a, void 0, r);
  } else if (Pe(e))
    if (e[Symbol.iterator])
      i = Array.from(
        e,
        (a, l) => t(a, l, void 0, r)
      );
    else {
      const a = Object.keys(e);
      i = new Array(a.length);
      for (let l = 0, c = a.length; l < c; l++) {
        const u = a[l];
        i[l] = t(e[u], u, l, r);
      }
    }
  else
    i = [];
  return i;
}
function av(e, t, n = {}, o, i) {
  if (tt.ce || tt.parent && Mo(tt.parent) && tt.parent.ce)
    return n.name = t, Q(), Ye(
      fe,
      null,
      [f("slot", n, o)],
      64
    );
  let r = e[t];
  S.NODE_ENV !== "production" && r && r.length > 1 && (W(
    "SSR-optimized slot function detected in a non-SSR-optimized render function. You need to mark this component with $dynamic-slots in the parent template."
  ), r = () => []), r && r._c && (r._d = !1), Q();
  const s = r && id(r(n)), a = n.key || // slot content array of a dynamic conditional slot may have a branch
  // key attached in the `createSlots` helper, respect that
  s && s.key, l = Ye(
    fe,
    {
      key: (a && !Gt(a) ? a : `_${t}`) + // #7256 force differentiate fallback content from actual content
      (!s && o ? "_fb" : "")
    },
    s || [],
    s && e._ === 1 ? 64 : -2
  );
  return r && r._c && (r._d = !0), l;
}
function id(e) {
  return e.some((t) => _o(t) ? !(t.type === Ze || t.type === fe && !id(t.children)) : !0) ? e : null;
}
const $s = (e) => e ? xd(e) ? Hr(e) : $s(e.parent) : null, vo = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ ze(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => S.NODE_ENV !== "production" ? nn(e.props) : e.props,
    $attrs: (e) => S.NODE_ENV !== "production" ? nn(e.attrs) : e.attrs,
    $slots: (e) => S.NODE_ENV !== "production" ? nn(e.slots) : e.slots,
    $refs: (e) => S.NODE_ENV !== "production" ? nn(e.refs) : e.refs,
    $parent: (e) => $s(e.parent),
    $root: (e) => $s(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Sa(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Fr(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = ft.bind(e.proxy)),
    $watch: (e) => Bv.bind(e)
  })
), wa = (e) => e === "_" || e === "$", us = (e, t) => e !== Me && !e.__isScriptSetup && Ie(e, t), rd = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: n, setupState: o, data: i, props: r, accessCache: s, type: a, appContext: l } = e;
    if (S.NODE_ENV !== "production" && t === "__isVue")
      return !0;
    let c;
    if (t[0] !== "$") {
      const g = s[t];
      if (g !== void 0)
        switch (g) {
          case 1:
            return o[t];
          case 2:
            return i[t];
          case 4:
            return n[t];
          case 3:
            return r[t];
        }
      else {
        if (us(o, t))
          return s[t] = 1, o[t];
        if (i !== Me && Ie(i, t))
          return s[t] = 2, i[t];
        if (
          // only cache other properties when instance has declared (thus stable)
          // props
          (c = e.propsOptions[0]) && Ie(c, t)
        )
          return s[t] = 3, r[t];
        if (n !== Me && Ie(n, t))
          return s[t] = 4, n[t];
        Ms && (s[t] = 0);
      }
    }
    const u = vo[t];
    let d, m;
    if (u)
      return t === "$attrs" ? (it(e.attrs, "get", ""), S.NODE_ENV !== "production" && dr()) : S.NODE_ENV !== "production" && t === "$slots" && it(e, "get", t), u(e);
    if (
      // css module (injected by vue-loader)
      (d = a.__cssModules) && (d = d[t])
    )
      return d;
    if (n !== Me && Ie(n, t))
      return s[t] = 4, n[t];
    if (
      // global properties
      m = l.config.globalProperties, Ie(m, t)
    )
      return m[t];
    S.NODE_ENV !== "production" && tt && (!He(t) || // #1091 avoid internal isRef/isVNode checks on component instance leading
    // to infinite warning loop
    t.indexOf("__v") !== 0) && (i !== Me && wa(t[0]) && Ie(i, t) ? W(
      `Property ${JSON.stringify(
        t
      )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
    ) : e === tt && W(
      `Property ${JSON.stringify(t)} was accessed during render but is not defined on instance.`
    ));
  },
  set({ _: e }, t, n) {
    const { data: o, setupState: i, ctx: r } = e;
    return us(i, t) ? (i[t] = n, !0) : S.NODE_ENV !== "production" && i.__isScriptSetup && Ie(i, t) ? (W(`Cannot mutate <script setup> binding "${t}" from Options API.`), !1) : o !== Me && Ie(o, t) ? (o[t] = n, !0) : Ie(e.props, t) ? (S.NODE_ENV !== "production" && W(`Attempting to mutate prop "${t}". Props are readonly.`), !1) : t[0] === "$" && t.slice(1) in e ? (S.NODE_ENV !== "production" && W(
      `Attempting to mutate public property "${t}". Properties starting with $ are reserved and readonly.`
    ), !1) : (S.NODE_ENV !== "production" && t in e.appContext.config.globalProperties ? Object.defineProperty(r, t, {
      enumerable: !0,
      configurable: !0,
      value: n
    }) : r[t] = n, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: n, ctx: o, appContext: i, propsOptions: r }
  }, s) {
    let a;
    return !!n[s] || e !== Me && Ie(e, s) || us(t, s) || (a = r[0]) && Ie(a, s) || Ie(o, s) || Ie(vo, s) || Ie(i.config.globalProperties, s);
  },
  defineProperty(e, t, n) {
    return n.get != null ? e._.accessCache[t] = 0 : Ie(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
  }
};
S.NODE_ENV !== "production" && (rd.ownKeys = (e) => (W(
  "Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead."
), Reflect.ownKeys(e)));
function lv(e) {
  const t = {};
  return Object.defineProperty(t, "_", {
    configurable: !0,
    enumerable: !1,
    get: () => e
  }), Object.keys(vo).forEach((n) => {
    Object.defineProperty(t, n, {
      configurable: !0,
      enumerable: !1,
      get: () => vo[n](e),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: rt
    });
  }), t;
}
function uv(e) {
  const {
    ctx: t,
    propsOptions: [n]
  } = e;
  n && Object.keys(n).forEach((o) => {
    Object.defineProperty(t, o, {
      enumerable: !0,
      configurable: !0,
      get: () => e.props[o],
      set: rt
    });
  });
}
function cv(e) {
  const { ctx: t, setupState: n } = e;
  Object.keys(ae(n)).forEach((o) => {
    if (!n.__isScriptSetup) {
      if (wa(o[0])) {
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
        set: rt
      });
    }
  });
}
function Sl(e) {
  return ue(e) ? e.reduce(
    (t, n) => (t[n] = null, t),
    {}
  ) : e;
}
function dv() {
  const e = /* @__PURE__ */ Object.create(null);
  return (t, n) => {
    e[n] ? W(`${t} property "${n}" is already defined in ${e[n]}.`) : e[n] = t;
  };
}
let Ms = !0;
function fv(e) {
  const t = Sa(e), n = e.proxy, o = e.ctx;
  Ms = !1, t.beforeCreate && kl(t.beforeCreate, e, "bc");
  const {
    // state
    data: i,
    computed: r,
    methods: s,
    watch: a,
    provide: l,
    inject: c,
    // lifecycle
    created: u,
    beforeMount: d,
    mounted: m,
    beforeUpdate: g,
    updated: h,
    activated: v,
    deactivated: b,
    beforeDestroy: k,
    beforeUnmount: O,
    destroyed: P,
    unmounted: B,
    render: C,
    renderTracked: V,
    renderTriggered: L,
    errorCaptured: x,
    serverPrefetch: N,
    // public API
    expose: $,
    inheritAttrs: E,
    // assets
    components: w,
    directives: A,
    filters: M
  } = t, ee = S.NODE_ENV !== "production" ? dv() : null;
  if (S.NODE_ENV !== "production") {
    const [ne] = e.propsOptions;
    if (ne)
      for (const G in ne)
        ee("Props", G);
  }
  if (c && mv(c, o, ee), s)
    for (const ne in s) {
      const G = s[ne];
      pe(G) ? (S.NODE_ENV !== "production" ? Object.defineProperty(o, ne, {
        value: G.bind(n),
        configurable: !0,
        enumerable: !0,
        writable: !0
      }) : o[ne] = G.bind(n), S.NODE_ENV !== "production" && ee("Methods", ne)) : S.NODE_ENV !== "production" && W(
        `Method "${ne}" has type "${typeof G}" in the component definition. Did you reference the function correctly?`
      );
    }
  if (i) {
    S.NODE_ENV !== "production" && !pe(i) && W(
      "The data option must be a function. Plain object usage is no longer supported."
    );
    const ne = i.call(n, n);
    if (S.NODE_ENV !== "production" && sa(ne) && W(
      "data() returned a Promise - note data() cannot be async; If you intend to perform data fetching before component renders, use async setup() + <Suspense>."
    ), !Pe(ne))
      S.NODE_ENV !== "production" && W("data() should return an object.");
    else if (e.data = ct(ne), S.NODE_ENV !== "production")
      for (const G in ne)
        ee("Data", G), wa(G[0]) || Object.defineProperty(o, G, {
          configurable: !0,
          enumerable: !0,
          get: () => ne[G],
          set: rt
        });
  }
  if (Ms = !0, r)
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
      Object.defineProperty(o, ne, {
        enumerable: !0,
        configurable: !0,
        get: () => we.value,
        set: (ce) => we.value = ce
      }), S.NODE_ENV !== "production" && ee("Computed", ne);
    }
  if (a)
    for (const ne in a)
      sd(a[ne], o, n, ne);
  if (l) {
    const ne = pe(l) ? l.call(n) : l;
    Reflect.ownKeys(ne).forEach((G) => {
      Et(G, ne[G]);
    });
  }
  u && kl(u, e, "c");
  function ie(ne, G) {
    ue(G) ? G.forEach((Se) => ne(Se.bind(n))) : G && ne(G.bind(n));
  }
  if (ie(ba, d), ie(un, m), ie(Qh, g), ie(_a, h), ie(Qc, v), ie(ed, b), ie(ov, x), ie(nv, V), ie(tv, L), ie(gt, O), ie(nd, B), ie(ev, N), ue($))
    if ($.length) {
      const ne = e.exposed || (e.exposed = {});
      $.forEach((G) => {
        Object.defineProperty(ne, G, {
          get: () => n[G],
          set: (Se) => n[G] = Se
        });
      });
    } else e.exposed || (e.exposed = {});
  C && e.render === rt && (e.render = C), E != null && (e.inheritAttrs = E), w && (e.components = w), A && (e.directives = A), N && Zc(e);
}
function mv(e, t, n = rt) {
  ue(e) && (e = Fs(e));
  for (const o in e) {
    const i = e[o];
    let r;
    Pe(i) ? "default" in i ? r = Re(
      i.from || o,
      i.default,
      !0
    ) : r = Re(i.from || o) : r = Re(i), Be(r) ? Object.defineProperty(t, o, {
      enumerable: !0,
      configurable: !0,
      get: () => r.value,
      set: (s) => r.value = s
    }) : t[o] = r, S.NODE_ENV !== "production" && n("Inject", o);
  }
}
function kl(e, t, n) {
  Yt(
    ue(e) ? e.map((o) => o.bind(t.proxy)) : e.bind(t.proxy),
    t,
    n
  );
}
function sd(e, t, n, o) {
  let i = o.includes(".") ? yd(n, o) : () => n[o];
  if (He(e)) {
    const r = t[e];
    pe(r) ? _e(i, r) : S.NODE_ENV !== "production" && W(`Invalid watch handler specified by key "${e}"`, r);
  } else if (pe(e))
    _e(i, e.bind(n));
  else if (Pe(e))
    if (ue(e))
      e.forEach((r) => sd(r, t, n, o));
    else {
      const r = pe(e.handler) ? e.handler.bind(n) : t[e.handler];
      pe(r) ? _e(i, r, e) : S.NODE_ENV !== "production" && W(`Invalid watch handler specified by key "${e.handler}"`, r);
    }
  else S.NODE_ENV !== "production" && W(`Invalid watch option: "${o}"`, e);
}
function Sa(e) {
  const t = e.type, { mixins: n, extends: o } = t, {
    mixins: i,
    optionsCache: r,
    config: { optionMergeStrategies: s }
  } = e.appContext, a = r.get(t);
  let l;
  return a ? l = a : !i.length && !n && !o ? l = t : (l = {}, i.length && i.forEach(
    (c) => ur(l, c, s, !0)
  ), ur(l, t, s)), Pe(t) && r.set(t, l), l;
}
function ur(e, t, n, o = !1) {
  const { mixins: i, extends: r } = t;
  r && ur(e, r, n, !0), i && i.forEach(
    (s) => ur(e, s, n, !0)
  );
  for (const s in t)
    if (o && s === "expose")
      S.NODE_ENV !== "production" && W(
        '"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.'
      );
    else {
      const a = hv[s] || n && n[s];
      e[s] = a ? a(e[s], t[s]) : t[s];
    }
  return e;
}
const hv = {
  data: Cl,
  props: El,
  emits: El,
  // objects
  methods: Qo,
  computed: Qo,
  // lifecycle
  beforeCreate: bt,
  created: bt,
  beforeMount: bt,
  mounted: bt,
  beforeUpdate: bt,
  updated: bt,
  beforeDestroy: bt,
  beforeUnmount: bt,
  destroyed: bt,
  unmounted: bt,
  activated: bt,
  deactivated: bt,
  errorCaptured: bt,
  serverPrefetch: bt,
  // assets
  components: Qo,
  directives: Qo,
  // watch
  watch: gv,
  // provide / inject
  provide: Cl,
  inject: vv
};
function Cl(e, t) {
  return t ? e ? function() {
    return ze(
      pe(e) ? e.call(this, this) : e,
      pe(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function vv(e, t) {
  return Qo(Fs(e), Fs(t));
}
function Fs(e) {
  if (ue(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++)
      t[e[n]] = e[n];
    return t;
  }
  return e;
}
function bt(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function Qo(e, t) {
  return e ? ze(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function El(e, t) {
  return e ? ue(e) && ue(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : ze(
    /* @__PURE__ */ Object.create(null),
    Sl(e),
    Sl(t ?? {})
  ) : t;
}
function gv(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = ze(/* @__PURE__ */ Object.create(null), e);
  for (const o in t)
    n[o] = bt(e[o], t[o]);
  return n;
}
function ad() {
  return {
    app: null,
    config: {
      isNativeTag: Vm,
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
let pv = 0;
function yv(e, t) {
  return function(o, i = null) {
    pe(o) || (o = ze({}, o)), i != null && !Pe(i) && (S.NODE_ENV !== "production" && W("root props passed to app.mount() must be an object."), i = null);
    const r = ad(), s = /* @__PURE__ */ new WeakSet(), a = [];
    let l = !1;
    const c = r.app = {
      _uid: pv++,
      _component: o,
      _props: i,
      _container: null,
      _context: r,
      _instance: null,
      version: Ml,
      get config() {
        return r.config;
      },
      set config(u) {
        S.NODE_ENV !== "production" && W(
          "app.config cannot be replaced. Modify individual options instead."
        );
      },
      use(u, ...d) {
        return s.has(u) ? S.NODE_ENV !== "production" && W("Plugin has already been applied to target app.") : u && pe(u.install) ? (s.add(u), u.install(c, ...d)) : pe(u) ? (s.add(u), u(c, ...d)) : S.NODE_ENV !== "production" && W(
          'A plugin must either be a function or an object with an "install" function.'
        ), c;
      },
      mixin(u) {
        return r.mixins.includes(u) ? S.NODE_ENV !== "production" && W(
          "Mixin has already been applied to target app" + (u.name ? `: ${u.name}` : "")
        ) : r.mixins.push(u), c;
      },
      component(u, d) {
        return S.NODE_ENV !== "production" && js(u, r.config), d ? (S.NODE_ENV !== "production" && r.components[u] && W(`Component "${u}" has already been registered in target app.`), r.components[u] = d, c) : r.components[u];
      },
      directive(u, d) {
        return S.NODE_ENV !== "production" && zc(u), d ? (S.NODE_ENV !== "production" && r.directives[u] && W(`Directive "${u}" has already been registered in target app.`), r.directives[u] = d, c) : r.directives[u];
      },
      mount(u, d, m) {
        if (l)
          S.NODE_ENV !== "production" && W(
            "App has already been mounted.\nIf you want to remount the same app, move your app creation logic into a factory function and create fresh app instances for each mount - e.g. `const createMyApp = () => createApp(App)`"
          );
        else {
          S.NODE_ENV !== "production" && u.__vue_app__ && W(
            "There is already an app instance mounted on the host container.\n If you want to mount another app on the same host container, you need to unmount the previous app by calling `app.unmount()` first."
          );
          const g = c._ceVNode || f(o, i);
          return g.appContext = r, m === !0 ? m = "svg" : m === !1 && (m = void 0), S.NODE_ENV !== "production" && (r.reload = () => {
            e(
              an(g),
              u,
              m
            );
          }), d && t ? t(g, u) : e(g, u, m), l = !0, c._container = u, u.__vue_app__ = c, S.NODE_ENV !== "production" && (c._instance = g.component, Mh(c, Ml)), Hr(g.component);
        }
      },
      onUnmount(u) {
        S.NODE_ENV !== "production" && typeof u != "function" && W(
          `Expected function as first argument to app.onUnmount(), but got ${typeof u}`
        ), a.push(u);
      },
      unmount() {
        l ? (Yt(
          a,
          c._instance,
          16
        ), e(null, c._container), S.NODE_ENV !== "production" && (c._instance = null, Fh(c)), delete c._container.__vue_app__) : S.NODE_ENV !== "production" && W("Cannot unmount an app that is not mounted.");
      },
      provide(u, d) {
        return S.NODE_ENV !== "production" && u in r.provides && W(
          `App already provides property with key "${String(u)}". It will be overwritten with the new value.`
        ), r.provides[u] = d, c;
      },
      runWithContext(u) {
        const d = Fo;
        Fo = c;
        try {
          return u();
        } finally {
          Fo = d;
        }
      }
    };
    return c;
  };
}
let Fo = null;
function Et(e, t) {
  if (!st)
    S.NODE_ENV !== "production" && W("provide() can only be used inside setup().");
  else {
    let n = st.provides;
    const o = st.parent && st.parent.provides;
    o === n && (n = st.provides = Object.create(o)), n[e] = t;
  }
}
function Re(e, t, n = !1) {
  const o = st || tt;
  if (o || Fo) {
    const i = Fo ? Fo._context.provides : o ? o.parent == null ? o.vnode.appContext && o.vnode.appContext.provides : o.parent.provides : void 0;
    if (i && e in i)
      return i[e];
    if (arguments.length > 1)
      return n && pe(t) ? t.call(o && o.proxy) : t;
    S.NODE_ENV !== "production" && W(`injection "${String(e)}" not found.`);
  } else S.NODE_ENV !== "production" && W("inject() can only be used inside setup() or functional components.");
}
const ld = {}, ud = () => Object.create(ld), cd = (e) => Object.getPrototypeOf(e) === ld;
function bv(e, t, n, o = !1) {
  const i = {}, r = ud();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), dd(e, t, i, r);
  for (const s in e.propsOptions[0])
    s in i || (i[s] = void 0);
  S.NODE_ENV !== "production" && md(t || {}, i, e), n ? e.props = o ? i : hh(i) : e.type.props ? e.props = i : e.props = r, e.attrs = r;
}
function _v(e) {
  for (; e; ) {
    if (e.type.__hmrId) return !0;
    e = e.parent;
  }
}
function wv(e, t, n, o) {
  const {
    props: i,
    attrs: r,
    vnode: { patchFlag: s }
  } = e, a = ae(i), [l] = e.propsOptions;
  let c = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(S.NODE_ENV !== "production" && _v(e)) && (o || s > 0) && !(s & 16)
  ) {
    if (s & 8) {
      const u = e.vnode.dynamicProps;
      for (let d = 0; d < u.length; d++) {
        let m = u[d];
        if (Br(e.emitsOptions, m))
          continue;
        const g = t[m];
        if (l)
          if (Ie(r, m))
            g !== r[m] && (r[m] = g, c = !0);
          else {
            const h = dt(m);
            i[h] = Ls(
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
    dd(e, t, i, r) && (c = !0);
    let u;
    for (const d in a)
      (!t || // for camelCase
      !Ie(t, d) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((u = Rn(d)) === d || !Ie(t, u))) && (l ? n && // for camelCase
      (n[d] !== void 0 || // for kebab-case
      n[u] !== void 0) && (i[d] = Ls(
        l,
        a,
        d,
        void 0,
        e,
        !0
      )) : delete i[d]);
    if (r !== a)
      for (const d in r)
        (!t || !Ie(t, d)) && (delete r[d], c = !0);
  }
  c && en(e.attrs, "set", ""), S.NODE_ENV !== "production" && md(t || {}, i, e);
}
function dd(e, t, n, o) {
  const [i, r] = e.propsOptions;
  let s = !1, a;
  if (t)
    for (let l in t) {
      if (ti(l))
        continue;
      const c = t[l];
      let u;
      i && Ie(i, u = dt(l)) ? !r || !r.includes(u) ? n[u] = c : (a || (a = {}))[u] = c : Br(e.emitsOptions, l) || (!(l in o) || c !== o[l]) && (o[l] = c, s = !0);
    }
  if (r) {
    const l = ae(n), c = a || Me;
    for (let u = 0; u < r.length; u++) {
      const d = r[u];
      n[d] = Ls(
        i,
        l,
        d,
        c[d],
        e,
        !Ie(c, d)
      );
    }
  }
  return s;
}
function Ls(e, t, n, o, i, r) {
  const s = e[n];
  if (s != null) {
    const a = Ie(s, "default");
    if (a && o === void 0) {
      const l = s.default;
      if (s.type !== Function && !s.skipFactory && pe(l)) {
        const { propsDefaults: c } = i;
        if (n in c)
          o = c[n];
        else {
          const u = Vi(i);
          o = c[n] = l.call(
            null,
            t
          ), u();
        }
      } else
        o = l;
      i.ce && i.ce._setProp(n, o);
    }
    s[
      0
      /* shouldCast */
    ] && (r && !a ? o = !1 : s[
      1
      /* shouldCastTrue */
    ] && (o === "" || o === Rn(n)) && (o = !0));
  }
  return o;
}
const Sv = /* @__PURE__ */ new WeakMap();
function fd(e, t, n = !1) {
  const o = n ? Sv : t.propsCache, i = o.get(e);
  if (i)
    return i;
  const r = e.props, s = {}, a = [];
  let l = !1;
  if (!pe(e)) {
    const u = (d) => {
      l = !0;
      const [m, g] = fd(d, t, !0);
      ze(s, m), g && a.push(...g);
    };
    !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
  }
  if (!r && !l)
    return Pe(e) && o.set(e, Po), Po;
  if (ue(r))
    for (let u = 0; u < r.length; u++) {
      S.NODE_ENV !== "production" && !He(r[u]) && W("props must be strings when using array syntax.", r[u]);
      const d = dt(r[u]);
      xl(d) && (s[d] = Me);
    }
  else if (r) {
    S.NODE_ENV !== "production" && !Pe(r) && W("invalid props options", r);
    for (const u in r) {
      const d = dt(u);
      if (xl(d)) {
        const m = r[u], g = s[d] = ue(m) || pe(m) ? { type: m } : ze({}, m), h = g.type;
        let v = !1, b = !0;
        if (ue(h))
          for (let k = 0; k < h.length; ++k) {
            const O = h[k], P = pe(O) && O.name;
            if (P === "Boolean") {
              v = !0;
              break;
            } else P === "String" && (b = !1);
          }
        else
          v = pe(h) && h.name === "Boolean";
        g[
          0
          /* shouldCast */
        ] = v, g[
          1
          /* shouldCastTrue */
        ] = b, (v || Ie(g, "default")) && a.push(d);
      }
    }
  }
  const c = [s, a];
  return Pe(e) && o.set(e, c), c;
}
function xl(e) {
  return e[0] !== "$" && !ti(e) ? !0 : (S.NODE_ENV !== "production" && W(`Invalid prop name: "${e}" is a reserved property.`), !1);
}
function kv(e) {
  return e === null ? "null" : typeof e == "function" ? e.name || "" : typeof e == "object" && e.constructor && e.constructor.name || "";
}
function md(e, t, n) {
  const o = ae(t), i = n.propsOptions[0], r = Object.keys(e).map((s) => dt(s));
  for (const s in i) {
    let a = i[s];
    a != null && Cv(
      s,
      o[s],
      a,
      S.NODE_ENV !== "production" ? nn(o) : o,
      !r.includes(s)
    );
  }
}
function Cv(e, t, n, o, i) {
  const { type: r, required: s, validator: a, skipCheck: l } = n;
  if (s && i) {
    W('Missing required prop: "' + e + '"');
    return;
  }
  if (!(t == null && !s)) {
    if (r != null && r !== !0 && !l) {
      let c = !1;
      const u = ue(r) ? r : [r], d = [];
      for (let m = 0; m < u.length && !c; m++) {
        const { valid: g, expectedType: h } = xv(t, u[m]);
        d.push(h || ""), c = g;
      }
      if (!c) {
        W(Nv(e, t, d));
        return;
      }
    }
    a && !a(t, o) && W('Invalid prop: custom validator check failed for prop "' + e + '".');
  }
}
const Ev = /* @__PURE__ */ kn(
  "String,Number,Boolean,Function,Symbol,BigInt"
);
function xv(e, t) {
  let n;
  const o = kv(t);
  if (o === "null")
    n = e === null;
  else if (Ev(o)) {
    const i = typeof e;
    n = i === o.toLowerCase(), !n && i === "object" && (n = e instanceof t);
  } else o === "Object" ? n = Pe(e) : o === "Array" ? n = ue(e) : n = e instanceof t;
  return {
    valid: n,
    expectedType: o
  };
}
function Nv(e, t, n) {
  if (n.length === 0)
    return `Prop type [] for prop "${e}" won't match anything. Did you mean to use type Array instead?`;
  let o = `Invalid prop: type check failed for prop "${e}". Expected ${n.map(Ht).join(" | ")}`;
  const i = n[0], r = aa(t), s = Nl(t, i), a = Nl(t, r);
  return n.length === 1 && Vl(i) && !Vv(i, r) && (o += ` with value ${s}`), o += `, got ${r} `, Vl(r) && (o += `with value ${a}.`), o;
}
function Nl(e, t) {
  return t === "String" ? `"${e}"` : t === "Number" ? `${Number(e)}` : `${e}`;
}
function Vl(e) {
  return ["string", "number", "boolean"].some((n) => e.toLowerCase() === n);
}
function Vv(...e) {
  return e.some((t) => t.toLowerCase() === "boolean");
}
const hd = (e) => e[0] === "_" || e === "$stable", ka = (e) => ue(e) ? e.map(Wt) : [Wt(e)], Ov = (e, t, n) => {
  if (t._n)
    return t;
  const o = T((...i) => (S.NODE_ENV !== "production" && st && (!n || n.root === st.root) && W(
    `Slot "${e}" invoked outside of the render function: this will not track dependencies used in the slot. Invoke the slot function inside the render function instead.`
  ), ka(t(...i))), n);
  return o._c = !1, o;
}, vd = (e, t, n) => {
  const o = e._ctx;
  for (const i in e) {
    if (hd(i)) continue;
    const r = e[i];
    if (pe(r))
      t[i] = Ov(i, r, o);
    else if (r != null) {
      S.NODE_ENV !== "production" && W(
        `Non-function value encountered for slot "${i}". Prefer function slots for better performance.`
      );
      const s = ka(r);
      t[i] = () => s;
    }
  }
}, gd = (e, t) => {
  S.NODE_ENV !== "production" && !Ni(e.vnode) && W(
    "Non-function value encountered for default slot. Prefer function slots for better performance."
  );
  const n = ka(t);
  e.slots.default = () => n;
}, Bs = (e, t, n) => {
  for (const o in t)
    (n || o !== "_") && (e[o] = t[o]);
}, Tv = (e, t, n) => {
  const o = e.slots = ud();
  if (e.vnode.shapeFlag & 32) {
    const i = t._;
    i ? (Bs(o, t, n), n && nr(o, "_", i, !0)) : vd(t, o);
  } else t && gd(e, t);
}, Av = (e, t, n) => {
  const { vnode: o, slots: i } = e;
  let r = !0, s = Me;
  if (o.shapeFlag & 32) {
    const a = t._;
    a ? S.NODE_ENV !== "production" && qt ? (Bs(i, t, n), en(e, "set", "$slots")) : n && a === 1 ? r = !1 : Bs(i, t, n) : (r = !t.$stable, vd(t, i)), s = t;
  } else t && (gd(e, t), s = { default: 1 });
  if (r)
    for (const a in i)
      !hd(a) && s[a] == null && delete i[a];
};
let Ko, Pn;
function gn(e, t) {
  e.appContext.config.performance && cr() && Pn.mark(`vue-${t}-${e.uid}`), S.NODE_ENV !== "production" && Hh(e, t, cr() ? Pn.now() : Date.now());
}
function pn(e, t) {
  if (e.appContext.config.performance && cr()) {
    const n = `vue-${t}-${e.uid}`, o = n + ":end";
    Pn.mark(o), Pn.measure(
      `<${jr(e, e.type)}> ${t}`,
      n,
      o
    ), Pn.clearMarks(n), Pn.clearMarks(o);
  }
  S.NODE_ENV !== "production" && jh(e, t, cr() ? Pn.now() : Date.now());
}
function cr() {
  return Ko !== void 0 || (typeof window < "u" && window.performance ? (Ko = !0, Pn = window.performance) : Ko = !1), Ko;
}
function Dv() {
  const e = [];
  if (S.NODE_ENV !== "production" && e.length) {
    const t = e.length > 1;
    console.warn(
      `Feature flag${t ? "s" : ""} ${e.join(", ")} ${t ? "are" : "is"} not explicitly defined. You are running the esm-bundler build of Vue, which expects these compile-time feature flags to be globally injected via the bundler config in order to get better tree-shaking in the production bundle.

For more details, see https://link.vuejs.org/feature-flags.`
    );
  }
}
const xt = qv;
function Iv(e) {
  return Pv(e);
}
function Pv(e, t) {
  Dv();
  const n = ki();
  n.__VUE__ = !0, S.NODE_ENV !== "production" && Bc(n.__VUE_DEVTOOLS_GLOBAL_HOOK__, n);
  const {
    insert: o,
    remove: i,
    patchProp: r,
    createElement: s,
    createText: a,
    createComment: l,
    setText: c,
    setElementText: u,
    parentNode: d,
    nextSibling: m,
    setScopeId: g = rt,
    insertStaticContent: h
  } = e, v = (p, _, I, U = null, R = null, j = null, Y = void 0, q = null, K = S.NODE_ENV !== "production" && qt ? !1 : !!_.dynamicChildren) => {
    if (p === _)
      return;
    p && !ao(p, _) && (U = De(p), Te(p, R, j, !0), p = null), _.patchFlag === -2 && (K = !1, _.dynamicChildren = null);
    const { type: z, ref: ge, shapeFlag: Z } = _;
    switch (z) {
      case ko:
        b(p, _, I, U);
        break;
      case Ze:
        k(p, _, I, U);
        break;
      case Gi:
        p == null ? O(_, I, U, Y) : S.NODE_ENV !== "production" && P(p, _, I, Y);
        break;
      case fe:
        A(
          p,
          _,
          I,
          U,
          R,
          j,
          Y,
          q,
          K
        );
        break;
      default:
        Z & 1 ? V(
          p,
          _,
          I,
          U,
          R,
          j,
          Y,
          q,
          K
        ) : Z & 6 ? M(
          p,
          _,
          I,
          U,
          R,
          j,
          Y,
          q,
          K
        ) : Z & 64 || Z & 128 ? z.process(
          p,
          _,
          I,
          U,
          R,
          j,
          Y,
          q,
          K,
          zt
        ) : S.NODE_ENV !== "production" && W("Invalid VNode type:", z, `(${typeof z})`);
    }
    ge != null && R && Is(ge, p && p.ref, j, _ || p, !_);
  }, b = (p, _, I, U) => {
    if (p == null)
      o(
        _.el = a(_.children),
        I,
        U
      );
    else {
      const R = _.el = p.el;
      _.children !== p.children && c(R, _.children);
    }
  }, k = (p, _, I, U) => {
    p == null ? o(
      _.el = l(_.children || ""),
      I,
      U
    ) : _.el = p.el;
  }, O = (p, _, I, U) => {
    [p.el, p.anchor] = h(
      p.children,
      _,
      I,
      U,
      p.el,
      p.anchor
    );
  }, P = (p, _, I, U) => {
    if (_.children !== p.children) {
      const R = m(p.anchor);
      C(p), [_.el, _.anchor] = h(
        _.children,
        I,
        R,
        U
      );
    } else
      _.el = p.el, _.anchor = p.anchor;
  }, B = ({ el: p, anchor: _ }, I, U) => {
    let R;
    for (; p && p !== _; )
      R = m(p), o(p, I, U), p = R;
    o(_, I, U);
  }, C = ({ el: p, anchor: _ }) => {
    let I;
    for (; p && p !== _; )
      I = m(p), i(p), p = I;
    i(_);
  }, V = (p, _, I, U, R, j, Y, q, K) => {
    _.type === "svg" ? Y = "svg" : _.type === "math" && (Y = "mathml"), p == null ? L(
      _,
      I,
      U,
      R,
      j,
      Y,
      q,
      K
    ) : $(
      p,
      _,
      R,
      j,
      Y,
      q,
      K
    );
  }, L = (p, _, I, U, R, j, Y, q) => {
    let K, z;
    const { props: ge, shapeFlag: Z, transition: D, dirs: F } = p;
    if (K = p.el = s(
      p.type,
      j,
      ge && ge.is,
      ge
    ), Z & 8 ? u(K, p.children) : Z & 16 && N(
      p.children,
      K,
      null,
      U,
      R,
      cs(p, j),
      Y,
      q
    ), F && Qn(p, null, U, "created"), x(K, p, p.scopeId, Y, U), ge) {
      for (const me in ge)
        me !== "value" && !ti(me) && r(K, me, null, ge[me], j, U);
      "value" in ge && r(K, "value", null, ge.value, j), (z = ge.onVnodeBeforeMount) && Zt(z, U, p);
    }
    S.NODE_ENV !== "production" && (nr(K, "__vnode", p, !0), nr(K, "__vueParentComponent", U, !0)), F && Qn(p, null, U, "beforeMount");
    const re = $v(R, D);
    re && D.beforeEnter(K), o(K, _, I), ((z = ge && ge.onVnodeMounted) || re || F) && xt(() => {
      z && Zt(z, U, p), re && D.enter(K), F && Qn(p, null, U, "mounted");
    }, R);
  }, x = (p, _, I, U, R) => {
    if (I && g(p, I), U)
      for (let j = 0; j < U.length; j++)
        g(p, U[j]);
    if (R) {
      let j = R.subTree;
      if (S.NODE_ENV !== "production" && j.patchFlag > 0 && j.patchFlag & 2048 && (j = Ea(j.children) || j), _ === j || wd(j.type) && (j.ssContent === _ || j.ssFallback === _)) {
        const Y = R.vnode;
        x(
          p,
          Y,
          Y.scopeId,
          Y.slotScopeIds,
          R.parent
        );
      }
    }
  }, N = (p, _, I, U, R, j, Y, q, K = 0) => {
    for (let z = K; z < p.length; z++) {
      const ge = p[z] = q ? In(p[z]) : Wt(p[z]);
      v(
        null,
        ge,
        _,
        I,
        U,
        R,
        j,
        Y,
        q
      );
    }
  }, $ = (p, _, I, U, R, j, Y) => {
    const q = _.el = p.el;
    S.NODE_ENV !== "production" && (q.__vnode = _);
    let { patchFlag: K, dynamicChildren: z, dirs: ge } = _;
    K |= p.patchFlag & 16;
    const Z = p.props || Me, D = _.props || Me;
    let F;
    if (I && eo(I, !1), (F = D.onVnodeBeforeUpdate) && Zt(F, I, _, p), ge && Qn(_, p, I, "beforeUpdate"), I && eo(I, !0), S.NODE_ENV !== "production" && qt && (K = 0, Y = !1, z = null), (Z.innerHTML && D.innerHTML == null || Z.textContent && D.textContent == null) && u(q, ""), z ? (E(
      p.dynamicChildren,
      z,
      q,
      I,
      U,
      cs(_, R),
      j
    ), S.NODE_ENV !== "production" && ii(p, _)) : Y || Se(
      p,
      _,
      q,
      null,
      I,
      U,
      cs(_, R),
      j,
      !1
    ), K > 0) {
      if (K & 16)
        w(q, Z, D, I, R);
      else if (K & 2 && Z.class !== D.class && r(q, "class", null, D.class, R), K & 4 && r(q, "style", Z.style, D.style, R), K & 8) {
        const re = _.dynamicProps;
        for (let me = 0; me < re.length; me++) {
          const oe = re[me], Ae = Z[oe], Le = D[oe];
          (Le !== Ae || oe === "value") && r(q, oe, Ae, Le, R, I);
        }
      }
      K & 1 && p.children !== _.children && u(q, _.children);
    } else !Y && z == null && w(q, Z, D, I, R);
    ((F = D.onVnodeUpdated) || ge) && xt(() => {
      F && Zt(F, I, _, p), ge && Qn(_, p, I, "updated");
    }, U);
  }, E = (p, _, I, U, R, j, Y) => {
    for (let q = 0; q < _.length; q++) {
      const K = p[q], z = _[q], ge = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        K.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (K.type === fe || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !ao(K, z) || // - In the case of a component, it could contain anything.
        K.shapeFlag & 70) ? d(K.el) : (
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
        R,
        j,
        Y,
        !0
      );
    }
  }, w = (p, _, I, U, R) => {
    if (_ !== I) {
      if (_ !== Me)
        for (const j in _)
          !ti(j) && !(j in I) && r(
            p,
            j,
            _[j],
            null,
            R,
            U
          );
      for (const j in I) {
        if (ti(j)) continue;
        const Y = I[j], q = _[j];
        Y !== q && j !== "value" && r(p, j, q, Y, R, U);
      }
      "value" in I && r(p, "value", _.value, I.value, R);
    }
  }, A = (p, _, I, U, R, j, Y, q, K) => {
    const z = _.el = p ? p.el : a(""), ge = _.anchor = p ? p.anchor : a("");
    let { patchFlag: Z, dynamicChildren: D, slotScopeIds: F } = _;
    S.NODE_ENV !== "production" && // #5523 dev root fragment may inherit directives
    (qt || Z & 2048) && (Z = 0, K = !1, D = null), F && (q = q ? q.concat(F) : F), p == null ? (o(z, I, U), o(ge, I, U), N(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      _.children || [],
      I,
      ge,
      R,
      j,
      Y,
      q,
      K
    )) : Z > 0 && Z & 64 && D && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    p.dynamicChildren ? (E(
      p.dynamicChildren,
      D,
      I,
      R,
      j,
      Y,
      q
    ), S.NODE_ENV !== "production" ? ii(p, _) : (
      // #2080 if the stable fragment has a key, it's a <template v-for> that may
      //  get moved around. Make sure all root level vnodes inherit el.
      // #2134 or if it's a component root, it may also get moved around
      // as the component is being moved.
      (_.key != null || R && _ === R.subTree) && ii(
        p,
        _,
        !0
        /* shallow */
      )
    )) : Se(
      p,
      _,
      I,
      ge,
      R,
      j,
      Y,
      q,
      K
    );
  }, M = (p, _, I, U, R, j, Y, q, K) => {
    _.slotScopeIds = q, p == null ? _.shapeFlag & 512 ? R.ctx.activate(
      _,
      I,
      U,
      Y,
      K
    ) : ee(
      _,
      I,
      U,
      R,
      j,
      Y,
      K
    ) : ie(p, _, K);
  }, ee = (p, _, I, U, R, j, Y) => {
    const q = p.component = Zv(
      p,
      U,
      R
    );
    if (S.NODE_ENV !== "production" && q.type.__hmrId && Dh(q), S.NODE_ENV !== "production" && (Ui(p), gn(q, "mount")), Ni(p) && (q.ctx.renderer = zt), S.NODE_ENV !== "production" && gn(q, "init"), eg(q, !1, Y), S.NODE_ENV !== "production" && pn(q, "init"), q.asyncDep) {
      if (S.NODE_ENV !== "production" && qt && (p.el = null), R && R.registerDep(q, ne, Y), !p.el) {
        const K = q.subTree = f(Ze);
        k(null, K, _, I);
      }
    } else
      ne(
        q,
        p,
        _,
        I,
        R,
        j,
        Y
      );
    S.NODE_ENV !== "production" && (Wi(), pn(q, "mount"));
  }, ie = (p, _, I) => {
    const U = _.component = p.component;
    if (Uv(p, _, I))
      if (U.asyncDep && !U.asyncResolved) {
        S.NODE_ENV !== "production" && Ui(_), G(U, _, I), S.NODE_ENV !== "production" && Wi();
        return;
      } else
        U.next = _, U.update();
    else
      _.el = p.el, U.vnode = _;
  }, ne = (p, _, I, U, R, j, Y) => {
    const q = () => {
      if (p.isMounted) {
        let { next: Z, bu: D, u: F, parent: re, vnode: me } = p;
        {
          const Ge = pd(p);
          if (Ge) {
            Z && (Z.el = me.el, G(p, Z, Y)), Ge.asyncDep.then(() => {
              p.isUnmounted || q();
            });
            return;
          }
        }
        let oe = Z, Ae;
        S.NODE_ENV !== "production" && Ui(Z || p.vnode), eo(p, !1), Z ? (Z.el = me.el, G(p, Z, Y)) : Z = me, D && Oo(D), (Ae = Z.props && Z.props.onVnodeBeforeUpdate) && Zt(Ae, re, Z, me), eo(p, !0), S.NODE_ENV !== "production" && gn(p, "render");
        const Le = ds(p);
        S.NODE_ENV !== "production" && pn(p, "render");
        const et = p.subTree;
        p.subTree = Le, S.NODE_ENV !== "production" && gn(p, "patch"), v(
          et,
          Le,
          // parent may have changed if it's in a teleport
          d(et.el),
          // anchor may have changed if it's in a fragment
          De(et),
          p,
          R,
          j
        ), S.NODE_ENV !== "production" && pn(p, "patch"), Z.el = Le.el, oe === null && Wv(p, Le.el), F && xt(F, R), (Ae = Z.props && Z.props.onVnodeUpdated) && xt(
          () => Zt(Ae, re, Z, me),
          R
        ), S.NODE_ENV !== "production" && Rc(p), S.NODE_ENV !== "production" && Wi();
      } else {
        let Z;
        const { el: D, props: F } = _, { bm: re, m: me, parent: oe, root: Ae, type: Le } = p, et = Mo(_);
        if (eo(p, !1), re && Oo(re), !et && (Z = F && F.onVnodeBeforeMount) && Zt(Z, oe, _), eo(p, !0), D && mn) {
          const Ge = () => {
            S.NODE_ENV !== "production" && gn(p, "render"), p.subTree = ds(p), S.NODE_ENV !== "production" && pn(p, "render"), S.NODE_ENV !== "production" && gn(p, "hydrate"), mn(
              D,
              p.subTree,
              p,
              R,
              null
            ), S.NODE_ENV !== "production" && pn(p, "hydrate");
          };
          et && Le.__asyncHydrate ? Le.__asyncHydrate(
            D,
            p,
            Ge
          ) : Ge();
        } else {
          Ae.ce && Ae.ce._injectChildStyle(Le), S.NODE_ENV !== "production" && gn(p, "render");
          const Ge = p.subTree = ds(p);
          S.NODE_ENV !== "production" && pn(p, "render"), S.NODE_ENV !== "production" && gn(p, "patch"), v(
            null,
            Ge,
            I,
            U,
            p,
            R,
            j
          ), S.NODE_ENV !== "production" && pn(p, "patch"), _.el = Ge.el;
        }
        if (me && xt(me, R), !et && (Z = F && F.onVnodeMounted)) {
          const Ge = _;
          xt(
            () => Zt(Z, oe, Ge),
            R
          );
        }
        (_.shapeFlag & 256 || oe && Mo(oe.vnode) && oe.vnode.shapeFlag & 256) && p.a && xt(p.a, R), p.isMounted = !0, S.NODE_ENV !== "production" && Lh(p), _ = I = U = null;
      }
    };
    p.scope.on();
    const K = p.effect = new mc(q);
    p.scope.off();
    const z = p.update = K.run.bind(K), ge = p.job = K.runIfDirty.bind(K);
    ge.i = p, ge.id = p.uid, K.scheduler = () => Fr(ge), eo(p, !0), S.NODE_ENV !== "production" && (K.onTrack = p.rtc ? (Z) => Oo(p.rtc, Z) : void 0, K.onTrigger = p.rtg ? (Z) => Oo(p.rtg, Z) : void 0), z();
  }, G = (p, _, I) => {
    _.component = p;
    const U = p.vnode.props;
    p.vnode = _, p.next = null, wv(p, _.props, U, I), Av(p, _.children, I), Cn(), gl(p), En();
  }, Se = (p, _, I, U, R, j, Y, q, K = !1) => {
    const z = p && p.children, ge = p ? p.shapeFlag : 0, Z = _.children, { patchFlag: D, shapeFlag: F } = _;
    if (D > 0) {
      if (D & 128) {
        we(
          z,
          Z,
          I,
          U,
          R,
          j,
          Y,
          q,
          K
        );
        return;
      } else if (D & 256) {
        xe(
          z,
          Z,
          I,
          U,
          R,
          j,
          Y,
          q,
          K
        );
        return;
      }
    }
    F & 8 ? (ge & 16 && ye(z, R, j), Z !== z && u(I, Z)) : ge & 16 ? F & 16 ? we(
      z,
      Z,
      I,
      U,
      R,
      j,
      Y,
      q,
      K
    ) : ye(z, R, j, !0) : (ge & 8 && u(I, ""), F & 16 && N(
      Z,
      I,
      U,
      R,
      j,
      Y,
      q,
      K
    ));
  }, xe = (p, _, I, U, R, j, Y, q, K) => {
    p = p || Po, _ = _ || Po;
    const z = p.length, ge = _.length, Z = Math.min(z, ge);
    let D;
    for (D = 0; D < Z; D++) {
      const F = _[D] = K ? In(_[D]) : Wt(_[D]);
      v(
        p[D],
        F,
        I,
        null,
        R,
        j,
        Y,
        q,
        K
      );
    }
    z > ge ? ye(
      p,
      R,
      j,
      !0,
      !1,
      Z
    ) : N(
      _,
      I,
      U,
      R,
      j,
      Y,
      q,
      K,
      Z
    );
  }, we = (p, _, I, U, R, j, Y, q, K) => {
    let z = 0;
    const ge = _.length;
    let Z = p.length - 1, D = ge - 1;
    for (; z <= Z && z <= D; ) {
      const F = p[z], re = _[z] = K ? In(_[z]) : Wt(_[z]);
      if (ao(F, re))
        v(
          F,
          re,
          I,
          null,
          R,
          j,
          Y,
          q,
          K
        );
      else
        break;
      z++;
    }
    for (; z <= Z && z <= D; ) {
      const F = p[Z], re = _[D] = K ? In(_[D]) : Wt(_[D]);
      if (ao(F, re))
        v(
          F,
          re,
          I,
          null,
          R,
          j,
          Y,
          q,
          K
        );
      else
        break;
      Z--, D--;
    }
    if (z > Z) {
      if (z <= D) {
        const F = D + 1, re = F < ge ? _[F].el : U;
        for (; z <= D; )
          v(
            null,
            _[z] = K ? In(_[z]) : Wt(_[z]),
            I,
            re,
            R,
            j,
            Y,
            q,
            K
          ), z++;
      }
    } else if (z > D)
      for (; z <= Z; )
        Te(p[z], R, j, !0), z++;
    else {
      const F = z, re = z, me = /* @__PURE__ */ new Map();
      for (z = re; z <= D; z++) {
        const ut = _[z] = K ? In(_[z]) : Wt(_[z]);
        ut.key != null && (S.NODE_ENV !== "production" && me.has(ut.key) && W(
          "Duplicate keys found during update:",
          JSON.stringify(ut.key),
          "Make sure keys are unique."
        ), me.set(ut.key, z));
      }
      let oe, Ae = 0;
      const Le = D - re + 1;
      let et = !1, Ge = 0;
      const Mt = new Array(Le);
      for (z = 0; z < Le; z++) Mt[z] = 0;
      for (z = F; z <= Z; z++) {
        const ut = p[z];
        if (Ae >= Le) {
          Te(ut, R, j, !0);
          continue;
        }
        let yt;
        if (ut.key != null)
          yt = me.get(ut.key);
        else
          for (oe = re; oe <= D; oe++)
            if (Mt[oe - re] === 0 && ao(ut, _[oe])) {
              yt = oe;
              break;
            }
        yt === void 0 ? Te(ut, R, j, !0) : (Mt[yt - re] = z + 1, yt >= Ge ? Ge = yt : et = !0, v(
          ut,
          _[yt],
          I,
          null,
          R,
          j,
          Y,
          q,
          K
        ), Ae++);
      }
      const Jn = et ? Mv(Mt) : Po;
      for (oe = Jn.length - 1, z = Le - 1; z >= 0; z--) {
        const ut = re + z, yt = _[ut], Wo = ut + 1 < ge ? _[ut + 1].el : U;
        Mt[z] === 0 ? v(
          null,
          yt,
          I,
          Wo,
          R,
          j,
          Y,
          q,
          K
        ) : et && (oe < 0 || z !== Jn[oe] ? ce(yt, I, Wo, 2) : oe--);
      }
    }
  }, ce = (p, _, I, U, R = null) => {
    const { el: j, type: Y, transition: q, children: K, shapeFlag: z } = p;
    if (z & 6) {
      ce(p.component.subTree, _, I, U);
      return;
    }
    if (z & 128) {
      p.suspense.move(_, I, U);
      return;
    }
    if (z & 64) {
      Y.move(p, _, I, zt);
      return;
    }
    if (Y === fe) {
      o(j, _, I);
      for (let Z = 0; Z < K.length; Z++)
        ce(K[Z], _, I, U);
      o(p.anchor, _, I);
      return;
    }
    if (Y === Gi) {
      B(p, _, I);
      return;
    }
    if (U !== 2 && z & 1 && q)
      if (U === 0)
        q.beforeEnter(j), o(j, _, I), xt(() => q.enter(j), R);
      else {
        const { leave: Z, delayLeave: D, afterLeave: F } = q, re = () => o(j, _, I), me = () => {
          Z(j, () => {
            re(), F && F();
          });
        };
        D ? D(j, re, me) : me();
      }
    else
      o(j, _, I);
  }, Te = (p, _, I, U = !1, R = !1) => {
    const {
      type: j,
      props: Y,
      ref: q,
      children: K,
      dynamicChildren: z,
      shapeFlag: ge,
      patchFlag: Z,
      dirs: D,
      cacheIndex: F
    } = p;
    if (Z === -2 && (R = !1), q != null && Is(q, null, I, p, !0), F != null && (_.renderCache[F] = void 0), ge & 256) {
      _.ctx.deactivate(p);
      return;
    }
    const re = ge & 1 && D, me = !Mo(p);
    let oe;
    if (me && (oe = Y && Y.onVnodeBeforeUnmount) && Zt(oe, _, p), ge & 6)
      J(p.component, I, U);
    else {
      if (ge & 128) {
        p.suspense.unmount(I, U);
        return;
      }
      re && Qn(p, null, _, "beforeUnmount"), ge & 64 ? p.type.remove(
        p,
        _,
        I,
        zt,
        U
      ) : z && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !z.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (j !== fe || Z > 0 && Z & 64) ? ye(
        z,
        _,
        I,
        !1,
        !0
      ) : (j === fe && Z & 384 || !R && ge & 16) && ye(K, _, I), U && Je(p);
    }
    (me && (oe = Y && Y.onVnodeUnmounted) || re) && xt(() => {
      oe && Zt(oe, _, p), re && Qn(p, null, _, "unmounted");
    }, I);
  }, Je = (p) => {
    const { type: _, el: I, anchor: U, transition: R } = p;
    if (_ === fe) {
      S.NODE_ENV !== "production" && p.patchFlag > 0 && p.patchFlag & 2048 && R && !R.persisted ? p.children.forEach((Y) => {
        Y.type === Ze ? i(Y.el) : Je(Y);
      }) : Ke(I, U);
      return;
    }
    if (_ === Gi) {
      C(p);
      return;
    }
    const j = () => {
      i(I), R && !R.persisted && R.afterLeave && R.afterLeave();
    };
    if (p.shapeFlag & 1 && R && !R.persisted) {
      const { leave: Y, delayLeave: q } = R, K = () => Y(I, j);
      q ? q(p.el, j, K) : K();
    } else
      j();
  }, Ke = (p, _) => {
    let I;
    for (; p !== _; )
      I = m(p), i(p), p = I;
    i(_);
  }, J = (p, _, I) => {
    S.NODE_ENV !== "production" && p.type.__hmrId && Ih(p);
    const { bum: U, scope: R, job: j, subTree: Y, um: q, m: K, a: z } = p;
    Ol(K), Ol(z), U && Oo(U), R.stop(), j && (j.flags |= 8, Te(Y, p, _, I)), q && xt(q, _), xt(() => {
      p.isUnmounted = !0;
    }, _), _ && _.pendingBranch && !_.isUnmounted && p.asyncDep && !p.asyncResolved && p.suspenseId === _.pendingId && (_.deps--, _.deps === 0 && _.resolve()), S.NODE_ENV !== "production" && Rh(p);
  }, ye = (p, _, I, U = !1, R = !1, j = 0) => {
    for (let Y = j; Y < p.length; Y++)
      Te(p[Y], _, I, U, R);
  }, De = (p) => {
    if (p.shapeFlag & 6)
      return De(p.component.subTree);
    if (p.shapeFlag & 128)
      return p.suspense.next();
    const _ = m(p.anchor || p.el), I = _ && _[Uc];
    return I ? m(I) : _;
  };
  let lt = !1;
  const Ue = (p, _, I) => {
    p == null ? _._vnode && Te(_._vnode, null, null, !0) : v(
      _._vnode || null,
      p,
      _,
      null,
      null,
      null,
      I
    ), _._vnode = p, lt || (lt = !0, gl(), Mc(), lt = !1);
  }, zt = {
    p: v,
    um: Te,
    m: ce,
    r: Je,
    mt: ee,
    mc: N,
    pc: Se,
    pbc: E,
    n: De,
    o: e
  };
  let Vn, mn;
  return {
    render: Ue,
    hydrate: Vn,
    createApp: yv(Ue, Vn)
  };
}
function cs({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function eo({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function $v(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function ii(e, t, n = !1) {
  const o = e.children, i = t.children;
  if (ue(o) && ue(i))
    for (let r = 0; r < o.length; r++) {
      const s = o[r];
      let a = i[r];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[r] = In(i[r]), a.el = s.el), !n && a.patchFlag !== -2 && ii(s, a)), a.type === ko && (a.el = s.el), S.NODE_ENV !== "production" && a.type === Ze && !a.el && (a.el = s.el);
    }
}
function Mv(e) {
  const t = e.slice(), n = [0];
  let o, i, r, s, a;
  const l = e.length;
  for (o = 0; o < l; o++) {
    const c = e[o];
    if (c !== 0) {
      if (i = n[n.length - 1], e[i] < c) {
        t[o] = i, n.push(o);
        continue;
      }
      for (r = 0, s = n.length - 1; r < s; )
        a = r + s >> 1, e[n[a]] < c ? r = a + 1 : s = a;
      c < e[n[r]] && (r > 0 && (t[o] = n[r - 1]), n[r] = o);
    }
  }
  for (r = n.length, s = n[r - 1]; r-- > 0; )
    n[r] = s, s = t[s];
  return n;
}
function pd(e) {
  const t = e.subTree.component;
  if (t)
    return t.asyncDep && !t.asyncResolved ? t : pd(t);
}
function Ol(e) {
  if (e)
    for (let t = 0; t < e.length; t++)
      e[t].flags |= 8;
}
const Fv = Symbol.for("v-scx"), Lv = () => {
  {
    const e = Re(Fv);
    return e || S.NODE_ENV !== "production" && W(
      "Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build."
    ), e;
  }
};
function Xt(e, t) {
  return Ca(e, null, t);
}
function _e(e, t, n) {
  return S.NODE_ENV !== "production" && !pe(t) && W(
    "`watch(fn, options?)` signature has been moved to a separate API. Use `watchEffect(fn, options?)` instead. `watch` now only supports `watch(source, cb, options?) signature."
  ), Ca(e, t, n);
}
function Ca(e, t, n = Me) {
  const { immediate: o, deep: i, flush: r, once: s } = n;
  S.NODE_ENV !== "production" && !t && (o !== void 0 && W(
    'watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.'
  ), i !== void 0 && W(
    'watch() "deep" option is only respected when using the watch(source, callback, options?) signature.'
  ), s !== void 0 && W(
    'watch() "once" option is only respected when using the watch(source, callback, options?) signature.'
  ));
  const a = ze({}, n);
  S.NODE_ENV !== "production" && (a.onWarn = W);
  const l = t && o || !t && r !== "post";
  let c;
  if (mi) {
    if (r === "sync") {
      const g = Lv();
      c = g.__watcherHandles || (g.__watcherHandles = []);
    } else if (!l) {
      const g = () => {
      };
      return g.stop = rt, g.resume = rt, g.pause = rt, g;
    }
  }
  const u = st;
  a.call = (g, h, v) => Yt(g, u, h, v);
  let d = !1;
  r === "post" ? a.scheduler = (g) => {
    xt(g, u && u.suspense);
  } : r !== "sync" && (d = !0, a.scheduler = (g, h) => {
    h ? g() : Fr(g);
  }), a.augmentJob = (g) => {
    t && (g.flags |= 4), d && (g.flags |= 2, u && (g.id = u.uid, g.i = u));
  };
  const m = kh(e, t, a);
  return mi && (c ? c.push(m) : l && m()), m;
}
function Bv(e, t, n) {
  const o = this.proxy, i = He(e) ? e.includes(".") ? yd(o, e) : () => o[e] : e.bind(o, o);
  let r;
  pe(t) ? r = t : (r = t.handler, n = t);
  const s = Vi(this), a = Ca(i, r.bind(o), n);
  return s(), a;
}
function yd(e, t) {
  const n = t.split(".");
  return () => {
    let o = e;
    for (let i = 0; i < n.length && o; i++)
      o = o[n[i]];
    return o;
  };
}
const Rv = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${dt(t)}Modifiers`] || e[`${Rn(t)}Modifiers`];
function Hv(e, t, ...n) {
  if (e.isUnmounted) return;
  const o = e.vnode.props || Me;
  if (S.NODE_ENV !== "production") {
    const {
      emitsOptions: u,
      propsOptions: [d]
    } = e;
    if (u)
      if (!(t in u))
        (!d || !(io(dt(t)) in d)) && W(
          `Component emitted event "${t}" but it is neither declared in the emits option nor as an "${io(dt(t))}" prop.`
        );
      else {
        const m = u[t];
        pe(m) && (m(...n) || W(
          `Invalid event arguments: event validation failed for event "${t}".`
        ));
      }
  }
  let i = n;
  const r = t.startsWith("update:"), s = r && Rv(o, t.slice(7));
  if (s && (s.trim && (i = n.map((u) => He(u) ? u.trim() : u)), s.number && (i = n.map(or))), S.NODE_ENV !== "production" && zh(e, t, i), S.NODE_ENV !== "production") {
    const u = t.toLowerCase();
    u !== t && o[io(u)] && W(
      `Event "${u}" is emitted in component ${jr(
        e,
        e.type
      )} but the handler is registered for "${t}". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "${Rn(
        t
      )}" instead of "${t}".`
    );
  }
  let a, l = o[a = io(t)] || // also try camelCase event handler (#2249)
  o[a = io(dt(t))];
  !l && r && (l = o[a = io(Rn(t))]), l && Yt(
    l,
    e,
    6,
    i
  );
  const c = o[a + "Once"];
  if (c) {
    if (!e.emitted)
      e.emitted = {};
    else if (e.emitted[a])
      return;
    e.emitted[a] = !0, Yt(
      c,
      e,
      6,
      i
    );
  }
}
function bd(e, t, n = !1) {
  const o = t.emitsCache, i = o.get(e);
  if (i !== void 0)
    return i;
  const r = e.emits;
  let s = {}, a = !1;
  if (!pe(e)) {
    const l = (c) => {
      const u = bd(c, t, !0);
      u && (a = !0, ze(s, u));
    };
    !n && t.mixins.length && t.mixins.forEach(l), e.extends && l(e.extends), e.mixins && e.mixins.forEach(l);
  }
  return !r && !a ? (Pe(e) && o.set(e, null), null) : (ue(r) ? r.forEach((l) => s[l] = null) : ze(s, r), Pe(e) && o.set(e, s), s);
}
function Br(e, t) {
  return !e || !wi(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), Ie(e, t[0].toLowerCase() + t.slice(1)) || Ie(e, Rn(t)) || Ie(e, t));
}
let Rs = !1;
function dr() {
  Rs = !0;
}
function ds(e) {
  const {
    type: t,
    vnode: n,
    proxy: o,
    withProxy: i,
    propsOptions: [r],
    slots: s,
    attrs: a,
    emit: l,
    render: c,
    renderCache: u,
    props: d,
    data: m,
    setupState: g,
    ctx: h,
    inheritAttrs: v
  } = e, b = lr(e);
  let k, O;
  S.NODE_ENV !== "production" && (Rs = !1);
  try {
    if (n.shapeFlag & 4) {
      const C = i || o, V = S.NODE_ENV !== "production" && g.__isScriptSetup ? new Proxy(C, {
        get(L, x, N) {
          return W(
            `Property '${String(
              x
            )}' was accessed via 'this'. Avoid using 'this' in templates.`
          ), Reflect.get(L, x, N);
        }
      }) : C;
      k = Wt(
        c.call(
          V,
          C,
          u,
          S.NODE_ENV !== "production" ? nn(d) : d,
          g,
          m,
          h
        )
      ), O = a;
    } else {
      const C = t;
      S.NODE_ENV !== "production" && a === d && dr(), k = Wt(
        C.length > 1 ? C(
          S.NODE_ENV !== "production" ? nn(d) : d,
          S.NODE_ENV !== "production" ? {
            get attrs() {
              return dr(), nn(a);
            },
            slots: s,
            emit: l
          } : { attrs: a, slots: s, emit: l }
        ) : C(
          S.NODE_ENV !== "production" ? nn(d) : d,
          null
        )
      ), O = t.props ? a : jv(a);
    }
  } catch (C) {
    ri.length = 0, Ei(C, e, 1), k = f(Ze);
  }
  let P = k, B;
  if (S.NODE_ENV !== "production" && k.patchFlag > 0 && k.patchFlag & 2048 && ([P, B] = _d(k)), O && v !== !1) {
    const C = Object.keys(O), { shapeFlag: V } = P;
    if (C.length) {
      if (V & 7)
        r && C.some(tr) && (O = zv(
          O,
          r
        )), P = an(P, O, !1, !0);
      else if (S.NODE_ENV !== "production" && !Rs && P.type !== Ze) {
        const L = Object.keys(a), x = [], N = [];
        for (let $ = 0, E = L.length; $ < E; $++) {
          const w = L[$];
          wi(w) ? tr(w) || x.push(w[2].toLowerCase() + w.slice(3)) : N.push(w);
        }
        N.length && W(
          `Extraneous non-props attributes (${N.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes.`
        ), x.length && W(
          `Extraneous non-emits event listeners (${x.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.`
        );
      }
    }
  }
  return n.dirs && (S.NODE_ENV !== "production" && !Tl(P) && W(
    "Runtime directive used on component with non-element root node. The directives will not function as intended."
  ), P = an(P, null, !1, !0), P.dirs = P.dirs ? P.dirs.concat(n.dirs) : n.dirs), n.transition && (S.NODE_ENV !== "production" && !Tl(P) && W(
    "Component inside <Transition> renders non-element root node that cannot be animated."
  ), bo(P, n.transition)), S.NODE_ENV !== "production" && B ? B(P) : k = P, lr(b), k;
}
const _d = (e) => {
  const t = e.children, n = e.dynamicChildren, o = Ea(t, !1);
  if (o) {
    if (S.NODE_ENV !== "production" && o.patchFlag > 0 && o.patchFlag & 2048)
      return _d(o);
  } else return [e, void 0];
  const i = t.indexOf(o), r = n ? n.indexOf(o) : -1, s = (a) => {
    t[i] = a, n && (r > -1 ? n[r] = a : a.patchFlag > 0 && (e.dynamicChildren = [...n, a]));
  };
  return [Wt(o), s];
};
function Ea(e, t = !0) {
  let n;
  for (let o = 0; o < e.length; o++) {
    const i = e[o];
    if (_o(i)) {
      if (i.type !== Ze || i.children === "v-if") {
        if (n)
          return;
        if (n = i, S.NODE_ENV !== "production" && t && n.patchFlag > 0 && n.patchFlag & 2048)
          return Ea(n.children);
      }
    } else
      return;
  }
  return n;
}
const jv = (e) => {
  let t;
  for (const n in e)
    (n === "class" || n === "style" || wi(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, zv = (e, t) => {
  const n = {};
  for (const o in e)
    (!tr(o) || !(o.slice(9) in t)) && (n[o] = e[o]);
  return n;
}, Tl = (e) => e.shapeFlag & 7 || e.type === Ze;
function Uv(e, t, n) {
  const { props: o, children: i, component: r } = e, { props: s, children: a, patchFlag: l } = t, c = r.emitsOptions;
  if (S.NODE_ENV !== "production" && (i || a) && qt || t.dirs || t.transition)
    return !0;
  if (n && l >= 0) {
    if (l & 1024)
      return !0;
    if (l & 16)
      return o ? Al(o, s, c) : !!s;
    if (l & 8) {
      const u = t.dynamicProps;
      for (let d = 0; d < u.length; d++) {
        const m = u[d];
        if (s[m] !== o[m] && !Br(c, m))
          return !0;
      }
    }
  } else
    return (i || a) && (!a || !a.$stable) ? !0 : o === s ? !1 : o ? s ? Al(o, s, c) : !0 : !!s;
  return !1;
}
function Al(e, t, n) {
  const o = Object.keys(t);
  if (o.length !== Object.keys(e).length)
    return !0;
  for (let i = 0; i < o.length; i++) {
    const r = o[i];
    if (t[r] !== e[r] && !Br(n, r))
      return !0;
  }
  return !1;
}
function Wv({ vnode: e, parent: t }, n) {
  for (; t; ) {
    const o = t.subTree;
    if (o.suspense && o.suspense.activeBranch === e && (o.el = e.el), o === e)
      (e = t.vnode).el = n, t = t.parent;
    else
      break;
  }
}
const wd = (e) => e.__isSuspense;
function qv(e, t) {
  t && t.pendingBranch ? ue(e) ? t.effects.push(...e) : t.effects.push(e) : $c(e);
}
const fe = Symbol.for("v-fgt"), ko = Symbol.for("v-txt"), Ze = Symbol.for("v-cmt"), Gi = Symbol.for("v-stc"), ri = [];
let Vt = null;
function Q(e = !1) {
  ri.push(Vt = e ? null : []);
}
function Kv() {
  ri.pop(), Vt = ri[ri.length - 1] || null;
}
let fi = 1;
function Dl(e) {
  fi += e, e < 0 && Vt && (Vt.hasOnce = !0);
}
function Sd(e) {
  return e.dynamicChildren = fi > 0 ? Vt || Po : null, Kv(), fi > 0 && Vt && Vt.push(e), e;
}
function de(e, t, n, o, i, r) {
  return Sd(
    H(
      e,
      t,
      n,
      o,
      i,
      r,
      !0
    )
  );
}
function Ye(e, t, n, o, i) {
  return Sd(
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
function _o(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function ao(e, t) {
  if (S.NODE_ENV !== "production" && t.shapeFlag & 6 && e.component) {
    const n = qi.get(t.type);
    if (n && n.has(e.component))
      return e.shapeFlag &= -257, t.shapeFlag &= -513, !1;
  }
  return e.type === t.type && e.key === t.key;
}
const Gv = (...e) => Cd(
  ...e
), kd = ({ key: e }) => e ?? null, Yi = ({
  ref: e,
  ref_key: t,
  ref_for: n
}) => (typeof e == "number" && (e = "" + e), e != null ? He(e) || Be(e) || pe(e) ? { i: tt, r: e, k: t, f: !!n } : e : null);
function H(e, t = null, n = null, o = 0, i = null, r = e === fe ? 0 : 1, s = !1, a = !1) {
  const l = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && kd(t),
    ref: t && Yi(t),
    scopeId: jc,
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
    patchFlag: o,
    dynamicProps: i,
    dynamicChildren: null,
    appContext: null,
    ctx: tt
  };
  return a ? (xa(l, n), r & 128 && e.normalize(l)) : n && (l.shapeFlag |= He(n) ? 8 : 16), S.NODE_ENV !== "production" && l.key !== l.key && W("VNode created with invalid key (NaN). VNode type:", l.type), fi > 0 && // avoid a block node from tracking itself
  !s && // has current parent block
  Vt && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (l.patchFlag > 0 || r & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  l.patchFlag !== 32 && Vt.push(l), l;
}
const f = S.NODE_ENV !== "production" ? Gv : Cd;
function Cd(e, t = null, n = null, o = 0, i = null, r = !1) {
  if ((!e || e === rv) && (S.NODE_ENV !== "production" && !e && W(`Invalid vnode type when creating vnode: ${e}.`), e = Ze), _o(e)) {
    const a = an(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return n && xa(a, n), fi > 0 && !r && Vt && (a.shapeFlag & 6 ? Vt[Vt.indexOf(e)] = a : Vt.push(a)), a.patchFlag = -2, a;
  }
  if (Vd(e) && (e = e.__vccOpts), t) {
    t = Yv(t);
    let { class: a, style: l } = t;
    a && !He(a) && (t.class = Lt(a)), Pe(l) && (ui(l) && !ue(l) && (l = ze({}, l)), t.style = Ut(l));
  }
  const s = He(e) ? 1 : wd(e) ? 128 : Wc(e) ? 64 : Pe(e) ? 4 : pe(e) ? 2 : 0;
  return S.NODE_ENV !== "production" && s & 4 && ui(e) && (e = ae(e), W(
    "Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with `markRaw` or using `shallowRef` instead of `ref`.",
    `
Component that was made reactive: `,
    e
  )), H(
    e,
    t,
    n,
    o,
    i,
    s,
    r,
    !0
  );
}
function Yv(e) {
  return e ? ui(e) || cd(e) ? ze({}, e) : e : null;
}
function an(e, t, n = !1, o = !1) {
  const { props: i, ref: r, patchFlag: s, children: a, transition: l } = e, c = t ? Oe(i || {}, t) : i, u = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: c,
    key: c && kd(c),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      n && r ? ue(r) ? r.concat(Yi(t)) : [r, Yi(t)] : Yi(t)
    ) : r,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: S.NODE_ENV !== "production" && s === -1 && ue(a) ? a.map(Ed) : a,
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
    ssContent: e.ssContent && an(e.ssContent),
    ssFallback: e.ssFallback && an(e.ssFallback),
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return l && o && bo(
    u,
    l.clone(u)
  ), u;
}
function Ed(e) {
  const t = an(e);
  return ue(e.children) && (t.children = e.children.map(Ed)), t;
}
function te(e = " ", t = 0) {
  return f(ko, null, e, t);
}
function qe(e = "", t = !1) {
  return t ? (Q(), Ye(Ze, null, e)) : f(Ze, null, e);
}
function Wt(e) {
  return e == null || typeof e == "boolean" ? f(Ze) : ue(e) ? f(
    fe,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : _o(e) ? In(e) : f(ko, null, String(e));
}
function In(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : an(e);
}
function xa(e, t) {
  let n = 0;
  const { shapeFlag: o } = e;
  if (t == null)
    t = null;
  else if (ue(t))
    n = 16;
  else if (typeof t == "object")
    if (o & 65) {
      const i = t.default;
      i && (i._c && (i._d = !1), xa(e, i()), i._c && (i._d = !0));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !cd(t) ? t._ctx = tt : i === 3 && tt && (tt.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else pe(t) ? (t = { default: t, _ctx: tt }, n = 32) : (t = String(t), o & 64 ? (n = 16, t = [te(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function Oe(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    for (const i in o)
      if (i === "class")
        t.class !== o.class && (t.class = Lt([t.class, o.class]));
      else if (i === "style")
        t.style = Ut([t.style, o.style]);
      else if (wi(i)) {
        const r = t[i], s = o[i];
        s && r !== s && !(ue(r) && r.includes(s)) && (t[i] = r ? [].concat(r, s) : s);
      } else i !== "" && (t[i] = o[i]);
  }
  return t;
}
function Zt(e, t, n, o = null) {
  Yt(e, t, 7, [
    n,
    o
  ]);
}
const Xv = ad();
let Jv = 0;
function Zv(e, t, n) {
  const o = e.type, i = (t ? t.appContext : e.appContext) || Xv, r = {
    uid: Jv++,
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
    scope: new fc(
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
    propsOptions: fd(o, i),
    emitsOptions: bd(o, i),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: Me,
    // inheritAttrs
    inheritAttrs: o.inheritAttrs,
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
  return S.NODE_ENV !== "production" ? r.ctx = lv(r) : r.ctx = { _: r }, r.root = t ? t.root : r, r.emit = Hv.bind(null, r), e.ce && e.ce(r), r;
}
let st = null;
const Rr = () => st || tt;
let fr, Hs;
{
  const e = ki(), t = (n, o) => {
    let i;
    return (i = e[n]) || (i = e[n] = []), i.push(o), (r) => {
      i.length > 1 ? i.forEach((s) => s(r)) : i[0](r);
    };
  };
  fr = t(
    "__VUE_INSTANCE_SETTERS__",
    (n) => st = n
  ), Hs = t(
    "__VUE_SSR_SETTERS__",
    (n) => mi = n
  );
}
const Vi = (e) => {
  const t = st;
  return fr(e), e.scope.on(), () => {
    e.scope.off(), fr(t);
  };
}, Il = () => {
  st && st.scope.off(), fr(null);
}, Qv = /* @__PURE__ */ kn("slot,component");
function js(e, { isNativeTag: t }) {
  (Qv(e) || t(e)) && W(
    "Do not use built-in or reserved HTML elements as component id: " + e
  );
}
function xd(e) {
  return e.vnode.shapeFlag & 4;
}
let mi = !1;
function eg(e, t = !1, n = !1) {
  t && Hs(t);
  const { props: o, children: i } = e.vnode, r = xd(e);
  bv(e, o, r, t), Tv(e, i, n);
  const s = r ? tg(e, t) : void 0;
  return t && Hs(!1), s;
}
function tg(e, t) {
  var n;
  const o = e.type;
  if (S.NODE_ENV !== "production") {
    if (o.name && js(o.name, e.appContext.config), o.components) {
      const r = Object.keys(o.components);
      for (let s = 0; s < r.length; s++)
        js(r[s], e.appContext.config);
    }
    if (o.directives) {
      const r = Object.keys(o.directives);
      for (let s = 0; s < r.length; s++)
        zc(r[s]);
    }
    o.compilerOptions && ng() && W(
      '"compilerOptions" is only supported when using a build of Vue that includes the runtime compiler. Since you are using a runtime-only build, the options should be passed via your build tool config instead.'
    );
  }
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, rd), S.NODE_ENV !== "production" && uv(e);
  const { setup: i } = o;
  if (i) {
    Cn();
    const r = e.setupContext = i.length > 1 ? ig(e) : null, s = Vi(e), a = zo(
      i,
      e,
      0,
      [
        S.NODE_ENV !== "production" ? nn(e.props) : e.props,
        r
      ]
    ), l = sa(a);
    if (En(), s(), (l || e.sp) && !Mo(e) && Zc(e), l) {
      if (a.then(Il, Il), t)
        return a.then((c) => {
          Pl(e, c, t);
        }).catch((c) => {
          Ei(c, e, 0);
        });
      if (e.asyncDep = a, S.NODE_ENV !== "production" && !e.suspense) {
        const c = (n = o.name) != null ? n : "Anonymous";
        W(
          `Component <${c}>: setup function returned a promise, but no <Suspense> boundary was found in the parent component tree. A component with async setup() must be nested in a <Suspense> in order to be rendered.`
        );
      }
    } else
      Pl(e, a, t);
  } else
    Nd(e, t);
}
function Pl(e, t, n) {
  pe(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Pe(t) ? (S.NODE_ENV !== "production" && _o(t) && W(
    "setup() should not return VNodes directly - return a render function instead."
  ), S.NODE_ENV !== "production" && (e.devtoolsRawSetupState = t), e.setupState = Tc(t), S.NODE_ENV !== "production" && cv(e)) : S.NODE_ENV !== "production" && t !== void 0 && W(
    `setup() should return an object. Received: ${t === null ? "null" : typeof t}`
  ), Nd(e, n);
}
let zs;
const ng = () => !zs;
function Nd(e, t, n) {
  const o = e.type;
  if (!e.render) {
    if (!t && zs && !o.render) {
      const i = o.template || Sa(e).template;
      if (i) {
        S.NODE_ENV !== "production" && gn(e, "compile");
        const { isCustomElement: r, compilerOptions: s } = e.appContext.config, { delimiters: a, compilerOptions: l } = o, c = ze(
          ze(
            {
              isCustomElement: r,
              delimiters: a
            },
            s
          ),
          l
        );
        o.render = zs(i, c), S.NODE_ENV !== "production" && pn(e, "compile");
      }
    }
    e.render = o.render || rt;
  }
  {
    const i = Vi(e);
    Cn();
    try {
      fv(e);
    } finally {
      En(), i();
    }
  }
  S.NODE_ENV !== "production" && !o.render && e.render === rt && !t && (o.template ? W(
    'Component provided template option but runtime compilation is not supported in this build of Vue. Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".'
  ) : W("Component is missing template or render function: ", o));
}
const $l = S.NODE_ENV !== "production" ? {
  get(e, t) {
    return dr(), it(e, "get", ""), e[t];
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
function og(e) {
  return new Proxy(e.slots, {
    get(t, n) {
      return it(e, "get", "$slots"), t[n];
    }
  });
}
function ig(e) {
  const t = (n) => {
    if (S.NODE_ENV !== "production" && (e.exposed && W("expose() should be called only once per setup()."), n != null)) {
      let o = typeof n;
      o === "object" && (ue(n) ? o = "array" : Be(n) && (o = "ref")), o !== "object" && W(
        `expose() should be passed a plain object, received ${o}.`
      );
    }
    e.exposed = n || {};
  };
  if (S.NODE_ENV !== "production") {
    let n, o;
    return Object.freeze({
      get attrs() {
        return n || (n = new Proxy(e.attrs, $l));
      },
      get slots() {
        return o || (o = og(e));
      },
      get emit() {
        return (i, ...r) => e.emit(i, ...r);
      },
      expose: t
    });
  } else
    return {
      attrs: new Proxy(e.attrs, $l),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
}
function Hr(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Tc(vh(e.exposed)), {
    get(t, n) {
      if (n in t)
        return t[n];
      if (n in vo)
        return vo[n](e);
    },
    has(t, n) {
      return n in t || n in vo;
    }
  })) : e.proxy;
}
const rg = /(?:^|[-_])(\w)/g, sg = (e) => e.replace(rg, (t) => t.toUpperCase()).replace(/[-_]/g, "");
function Na(e, t = !0) {
  return pe(e) ? e.displayName || e.name : e.name || t && e.__name;
}
function jr(e, t, n = !1) {
  let o = Na(t);
  if (!o && t.__file) {
    const i = t.__file.match(/([^/\\]+)\.\w+$/);
    i && (o = i[1]);
  }
  if (!o && e && e.parent) {
    const i = (r) => {
      for (const s in r)
        if (r[s] === t)
          return s;
    };
    o = i(
      e.components || e.parent.type.components
    ) || i(e.appContext.components);
  }
  return o ? sg(o) : n ? "App" : "Anonymous";
}
function Vd(e) {
  return pe(e) && "__vccOpts" in e;
}
const y = (e, t) => {
  const n = wh(e, t, mi);
  if (S.NODE_ENV !== "production") {
    const o = Rr();
    o && o.appContext.config.warnRecursiveComputed && (n._warnRecursive = !0);
  }
  return n;
};
function jn(e, t, n) {
  const o = arguments.length;
  return o === 2 ? Pe(t) && !ue(t) ? _o(t) ? f(e, null, [t]) : f(e, t) : f(e, null, t) : (o > 3 ? n = Array.prototype.slice.call(arguments, 2) : o === 3 && _o(n) && (n = [n]), f(e, t, n));
}
function ag() {
  if (S.NODE_ENV === "production" || typeof window > "u")
    return;
  const e = { style: "color:#3ba776" }, t = { style: "color:#1677ff" }, n = { style: "color:#f5222d" }, o = { style: "color:#eb2f96" }, i = {
    __vue_custom_formatter: !0,
    header(d) {
      return Pe(d) ? d.__isVue ? ["div", e, "VueInstance"] : Be(d) ? [
        "div",
        {},
        ["span", e, u(d)],
        "<",
        // avoid debugger accessing value affecting behavior
        a("_value" in d ? d._value : d),
        ">"
      ] : fo(d) ? [
        "div",
        {},
        ["span", e, kt(d) ? "ShallowReactive" : "Reactive"],
        "<",
        a(d),
        `>${wn(d) ? " (readonly)" : ""}`
      ] : wn(d) ? [
        "div",
        {},
        ["span", e, kt(d) ? "ShallowReadonly" : "Readonly"],
        "<",
        a(d),
        ">"
      ] : null : null;
    },
    hasBody(d) {
      return d && d.__isVue;
    },
    body(d) {
      if (d && d.__isVue)
        return [
          "div",
          {},
          ...r(d.$)
        ];
    }
  };
  function r(d) {
    const m = [];
    d.type.props && d.props && m.push(s("props", ae(d.props))), d.setupState !== Me && m.push(s("setup", d.setupState)), d.data !== Me && m.push(s("data", ae(d.data)));
    const g = l(d, "computed");
    g && m.push(s("computed", g));
    const h = l(d, "inject");
    return h && m.push(s("injected", h)), m.push([
      "div",
      {},
      [
        "span",
        {
          style: o.style + ";opacity:0.66"
        },
        "$ (internal): "
      ],
      ["object", { object: d }]
    ]), m;
  }
  function s(d, m) {
    return m = ze({}, m), Object.keys(m).length ? [
      "div",
      { style: "line-height:1.25em;margin-bottom:0.6em" },
      [
        "div",
        {
          style: "color:#476582"
        },
        d
      ],
      [
        "div",
        {
          style: "padding-left:1.25em"
        },
        ...Object.keys(m).map((g) => [
          "div",
          {},
          ["span", o, g + ": "],
          a(m[g], !1)
        ])
      ]
    ] : ["span", {}];
  }
  function a(d, m = !0) {
    return typeof d == "number" ? ["span", t, d] : typeof d == "string" ? ["span", n, JSON.stringify(d)] : typeof d == "boolean" ? ["span", o, d] : Pe(d) ? ["object", { object: m ? ae(d) : d }] : ["span", n, String(d)];
  }
  function l(d, m) {
    const g = d.type;
    if (pe(g))
      return;
    const h = {};
    for (const v in d.ctx)
      c(g, v, m) && (h[v] = d.ctx[v]);
    return h;
  }
  function c(d, m, g) {
    const h = d[g];
    if (ue(h) && h.includes(m) || Pe(h) && m in h || d.extends && c(d.extends, m, g) || d.mixins && d.mixins.some((v) => c(v, m, g)))
      return !0;
  }
  function u(d) {
    return kt(d) ? "ShallowRef" : d.effect ? "ComputedRef" : "Ref";
  }
  window.devtoolsFormatters ? window.devtoolsFormatters.push(i) : window.devtoolsFormatters = [i];
}
const Ml = "3.5.12", Ct = S.NODE_ENV !== "production" ? W : rt;
var At = {};
let Us;
const Fl = typeof window < "u" && window.trustedTypes;
if (Fl)
  try {
    Us = /* @__PURE__ */ Fl.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch (e) {
    At.NODE_ENV !== "production" && Ct(`Error creating trusted types policy: ${e}`);
  }
const Od = Us ? (e) => Us.createHTML(e) : (e) => e, lg = "http://www.w3.org/2000/svg", ug = "http://www.w3.org/1998/Math/MathML", bn = typeof document < "u" ? document : null, Ll = bn && /* @__PURE__ */ bn.createElement("template"), cg = {
  insert: (e, t, n) => {
    t.insertBefore(e, n || null);
  },
  remove: (e) => {
    const t = e.parentNode;
    t && t.removeChild(e);
  },
  createElement: (e, t, n, o) => {
    const i = t === "svg" ? bn.createElementNS(lg, e) : t === "mathml" ? bn.createElementNS(ug, e) : n ? bn.createElement(e, { is: n }) : bn.createElement(e);
    return e === "select" && o && o.multiple != null && i.setAttribute("multiple", o.multiple), i;
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
  insertStaticContent(e, t, n, o, i, r) {
    const s = n ? n.previousSibling : t.lastChild;
    if (i && (i === r || i.nextSibling))
      for (; t.insertBefore(i.cloneNode(!0), n), !(i === r || !(i = i.nextSibling)); )
        ;
    else {
      Ll.innerHTML = Od(
        o === "svg" ? `<svg>${e}</svg>` : o === "mathml" ? `<math>${e}</math>` : e
      );
      const a = Ll.content;
      if (o === "svg" || o === "mathml") {
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
}, On = "transition", Go = "animation", Bo = Symbol("_vtc"), Td = {
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
}, Ad = /* @__PURE__ */ ze(
  {},
  Gc,
  Td
), dg = (e) => (e.displayName = "Transition", e.props = Ad, e), wo = /* @__PURE__ */ dg(
  (e, { slots: t }) => jn(Yh, Dd(e), t)
), to = (e, t = []) => {
  ue(e) ? e.forEach((n) => n(...t)) : e && e(...t);
}, Bl = (e) => e ? ue(e) ? e.some((t) => t.length > 1) : e.length > 1 : !1;
function Dd(e) {
  const t = {};
  for (const w in e)
    w in Td || (t[w] = e[w]);
  if (e.css === !1)
    return t;
  const {
    name: n = "v",
    type: o,
    duration: i,
    enterFromClass: r = `${n}-enter-from`,
    enterActiveClass: s = `${n}-enter-active`,
    enterToClass: a = `${n}-enter-to`,
    appearFromClass: l = r,
    appearActiveClass: c = s,
    appearToClass: u = a,
    leaveFromClass: d = `${n}-leave-from`,
    leaveActiveClass: m = `${n}-leave-active`,
    leaveToClass: g = `${n}-leave-to`
  } = e, h = fg(i), v = h && h[0], b = h && h[1], {
    onBeforeEnter: k,
    onEnter: O,
    onEnterCancelled: P,
    onLeave: B,
    onLeaveCancelled: C,
    onBeforeAppear: V = k,
    onAppear: L = O,
    onAppearCancelled: x = P
  } = t, N = (w, A, M) => {
    Tn(w, A ? u : a), Tn(w, A ? c : s), M && M();
  }, $ = (w, A) => {
    w._isLeaving = !1, Tn(w, d), Tn(w, g), Tn(w, m), A && A();
  }, E = (w) => (A, M) => {
    const ee = w ? L : O, ie = () => N(A, w, M);
    to(ee, [A, ie]), Rl(() => {
      Tn(A, w ? l : r), yn(A, w ? u : a), Bl(ee) || Hl(A, o, v, ie);
    });
  };
  return ze(t, {
    onBeforeEnter(w) {
      to(k, [w]), yn(w, r), yn(w, s);
    },
    onBeforeAppear(w) {
      to(V, [w]), yn(w, l), yn(w, c);
    },
    onEnter: E(!1),
    onAppear: E(!0),
    onLeave(w, A) {
      w._isLeaving = !0;
      const M = () => $(w, A);
      yn(w, d), yn(w, m), Pd(), Rl(() => {
        w._isLeaving && (Tn(w, d), yn(w, g), Bl(B) || Hl(w, o, b, M));
      }), to(B, [w, M]);
    },
    onEnterCancelled(w) {
      N(w, !1), to(P, [w]);
    },
    onAppearCancelled(w) {
      N(w, !0), to(x, [w]);
    },
    onLeaveCancelled(w) {
      $(w), to(C, [w]);
    }
  });
}
function fg(e) {
  if (e == null)
    return null;
  if (Pe(e))
    return [fs(e.enter), fs(e.leave)];
  {
    const t = fs(e);
    return [t, t];
  }
}
function fs(e) {
  const t = Im(e);
  return At.NODE_ENV !== "production" && Vh(t, "<transition> explicit duration"), t;
}
function yn(e, t) {
  t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Bo] || (e[Bo] = /* @__PURE__ */ new Set())).add(t);
}
function Tn(e, t) {
  t.split(/\s+/).forEach((o) => o && e.classList.remove(o));
  const n = e[Bo];
  n && (n.delete(t), n.size || (e[Bo] = void 0));
}
function Rl(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let mg = 0;
function Hl(e, t, n, o) {
  const i = e._endId = ++mg, r = () => {
    i === e._endId && o();
  };
  if (n != null)
    return setTimeout(r, n);
  const { type: s, timeout: a, propCount: l } = Id(e, t);
  if (!s)
    return o();
  const c = s + "end";
  let u = 0;
  const d = () => {
    e.removeEventListener(c, m), r();
  }, m = (g) => {
    g.target === e && ++u >= l && d();
  };
  setTimeout(() => {
    u < l && d();
  }, a + 1), e.addEventListener(c, m);
}
function Id(e, t) {
  const n = window.getComputedStyle(e), o = (h) => (n[h] || "").split(", "), i = o(`${On}Delay`), r = o(`${On}Duration`), s = jl(i, r), a = o(`${Go}Delay`), l = o(`${Go}Duration`), c = jl(a, l);
  let u = null, d = 0, m = 0;
  t === On ? s > 0 && (u = On, d = s, m = r.length) : t === Go ? c > 0 && (u = Go, d = c, m = l.length) : (d = Math.max(s, c), u = d > 0 ? s > c ? On : Go : null, m = u ? u === On ? r.length : l.length : 0);
  const g = u === On && /\b(transform|all)(,|$)/.test(
    o(`${On}Property`).toString()
  );
  return {
    type: u,
    timeout: d,
    propCount: m,
    hasTransform: g
  };
}
function jl(e, t) {
  for (; e.length < t.length; )
    e = e.concat(e);
  return Math.max(...t.map((n, o) => zl(n) + zl(e[o])));
}
function zl(e) {
  return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
}
function Pd() {
  return document.body.offsetHeight;
}
function hg(e, t, n) {
  const o = e[Bo];
  o && (t = (t ? [t, ...o] : [...o]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
const mr = Symbol("_vod"), $d = Symbol("_vsh"), zn = {
  beforeMount(e, { value: t }, { transition: n }) {
    e[mr] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : Yo(e, t);
  },
  mounted(e, { value: t }, { transition: n }) {
    n && t && n.enter(e);
  },
  updated(e, { value: t, oldValue: n }, { transition: o }) {
    !t != !n && (o ? t ? (o.beforeEnter(e), Yo(e, !0), o.enter(e)) : o.leave(e, () => {
      Yo(e, !1);
    }) : Yo(e, t));
  },
  beforeUnmount(e, { value: t }) {
    Yo(e, t);
  }
};
At.NODE_ENV !== "production" && (zn.name = "show");
function Yo(e, t) {
  e.style.display = t ? e[mr] : "none", e[$d] = !t;
}
const vg = Symbol(At.NODE_ENV !== "production" ? "CSS_VAR_TEXT" : ""), gg = /(^|;)\s*display\s*:/;
function pg(e, t, n) {
  const o = e.style, i = He(n);
  let r = !1;
  if (n && !i) {
    if (t)
      if (He(t))
        for (const s of t.split(";")) {
          const a = s.slice(0, s.indexOf(":")).trim();
          n[a] == null && Xi(o, a, "");
        }
      else
        for (const s in t)
          n[s] == null && Xi(o, s, "");
    for (const s in n)
      s === "display" && (r = !0), Xi(o, s, n[s]);
  } else if (i) {
    if (t !== n) {
      const s = o[vg];
      s && (n += ";" + s), o.cssText = n, r = gg.test(n);
    }
  } else t && e.removeAttribute("style");
  mr in e && (e[mr] = r ? o.display : "", e[$d] && (o.display = "none"));
}
const yg = /[^\\];\s*$/, Ul = /\s*!important$/;
function Xi(e, t, n) {
  if (ue(n))
    n.forEach((o) => Xi(e, t, o));
  else if (n == null && (n = ""), At.NODE_ENV !== "production" && yg.test(n) && Ct(
    `Unexpected semicolon at the end of '${t}' style value: '${n}'`
  ), t.startsWith("--"))
    e.setProperty(t, n);
  else {
    const o = bg(e, t);
    Ul.test(n) ? e.setProperty(
      Rn(o),
      n.replace(Ul, ""),
      "important"
    ) : e[o] = n;
  }
}
const Wl = ["Webkit", "Moz", "ms"], ms = {};
function bg(e, t) {
  const n = ms[t];
  if (n)
    return n;
  let o = dt(t);
  if (o !== "filter" && o in e)
    return ms[t] = o;
  o = Ht(o);
  for (let i = 0; i < Wl.length; i++) {
    const r = Wl[i] + o;
    if (r in e)
      return ms[t] = r;
  }
  return t;
}
const ql = "http://www.w3.org/1999/xlink";
function Kl(e, t, n, o, i, r = Wm(t)) {
  o && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(ql, t.slice(6, t.length)) : e.setAttributeNS(ql, t, n) : n == null || r && !uc(n) ? e.removeAttribute(t) : e.setAttribute(
    t,
    r ? "" : Gt(n) ? String(n) : n
  );
}
function Gl(e, t, n, o, i) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? Od(n) : n);
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
    a === "boolean" ? n = uc(n) : n == null && a === "string" ? (n = "", s = !0) : a === "number" && (n = 0, s = !0);
  }
  try {
    e[t] = n;
  } catch (a) {
    At.NODE_ENV !== "production" && !s && Ct(
      `Failed setting prop "${t}" on <${r.toLowerCase()}>: value ${n} is invalid.`,
      a
    );
  }
  s && e.removeAttribute(i || t);
}
function lo(e, t, n, o) {
  e.addEventListener(t, n, o);
}
function _g(e, t, n, o) {
  e.removeEventListener(t, n, o);
}
const Yl = Symbol("_vei");
function wg(e, t, n, o, i = null) {
  const r = e[Yl] || (e[Yl] = {}), s = r[t];
  if (o && s)
    s.value = At.NODE_ENV !== "production" ? Jl(o, t) : o;
  else {
    const [a, l] = Sg(t);
    if (o) {
      const c = r[t] = Eg(
        At.NODE_ENV !== "production" ? Jl(o, t) : o,
        i
      );
      lo(e, a, c, l);
    } else s && (_g(e, a, s, l), r[t] = void 0);
  }
}
const Xl = /(?:Once|Passive|Capture)$/;
function Sg(e) {
  let t;
  if (Xl.test(e)) {
    t = {};
    let o;
    for (; o = e.match(Xl); )
      e = e.slice(0, e.length - o[0].length), t[o[0].toLowerCase()] = !0;
  }
  return [e[2] === ":" ? e.slice(3) : Rn(e.slice(2)), t];
}
let hs = 0;
const kg = /* @__PURE__ */ Promise.resolve(), Cg = () => hs || (kg.then(() => hs = 0), hs = Date.now());
function Eg(e, t) {
  const n = (o) => {
    if (!o._vts)
      o._vts = Date.now();
    else if (o._vts <= n.attached)
      return;
    Yt(
      xg(o, n.value),
      t,
      5,
      [o]
    );
  };
  return n.value = e, n.attached = Cg(), n;
}
function Jl(e, t) {
  return pe(e) || ue(e) ? e : (Ct(
    `Wrong type passed as event handler to ${t} - did you forget @ or : in front of your prop?
Expected function or array of functions, received type ${typeof e}.`
  ), rt);
}
function xg(e, t) {
  if (ue(t)) {
    const n = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      n.call(e), e._stopped = !0;
    }, t.map(
      (o) => (i) => !i._stopped && o && o(i)
    );
  } else
    return t;
}
const Zl = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // lowercase letter
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Ng = (e, t, n, o, i, r) => {
  const s = i === "svg";
  t === "class" ? hg(e, o, s) : t === "style" ? pg(e, n, o) : wi(t) ? tr(t) || wg(e, t, n, o, r) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : Vg(e, t, o, s)) ? (Gl(e, t, o), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Kl(e, t, o, s, r, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && (/[A-Z]/.test(t) || !He(o)) ? Gl(e, dt(t), o, r, t) : (t === "true-value" ? e._trueValue = o : t === "false-value" && (e._falseValue = o), Kl(e, t, o, s));
};
function Vg(e, t, n, o) {
  if (o)
    return !!(t === "innerHTML" || t === "textContent" || t in e && Zl(t) && pe(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA")
    return !1;
  if (t === "width" || t === "height") {
    const i = e.tagName;
    if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE")
      return !1;
  }
  return Zl(t) && He(n) ? !1 : t in e;
}
const Md = /* @__PURE__ */ new WeakMap(), Fd = /* @__PURE__ */ new WeakMap(), hr = Symbol("_moveCb"), Ql = Symbol("_enterCb"), Og = (e) => (delete e.props.mode, e), Tg = /* @__PURE__ */ Og({
  name: "TransitionGroup",
  props: /* @__PURE__ */ ze({}, Ad, {
    tag: String,
    moveClass: String
  }),
  setup(e, { slots: t }) {
    const n = Rr(), o = Kc();
    let i, r;
    return _a(() => {
      if (!i.length)
        return;
      const s = e.moveClass || `${e.name || "v"}-move`;
      if (!Pg(
        i[0].el,
        n.vnode.el,
        s
      ))
        return;
      i.forEach(Ag), i.forEach(Dg);
      const a = i.filter(Ig);
      Pd(), a.forEach((l) => {
        const c = l.el, u = c.style;
        yn(c, s), u.transform = u.webkitTransform = u.transitionDuration = "";
        const d = c[hr] = (m) => {
          m && m.target !== c || (!m || /transform$/.test(m.propertyName)) && (c.removeEventListener("transitionend", d), c[hr] = null, Tn(c, s));
        };
        c.addEventListener("transitionend", d);
      });
    }), () => {
      const s = ae(e), a = Dd(s);
      let l = s.tag || fe;
      if (i = [], r)
        for (let c = 0; c < r.length; c++) {
          const u = r[c];
          u.el && u.el instanceof Element && (i.push(u), bo(
            u,
            di(
              u,
              a,
              o,
              n
            )
          ), Md.set(
            u,
            u.el.getBoundingClientRect()
          ));
        }
      r = t.default ? ya(t.default()) : [];
      for (let c = 0; c < r.length; c++) {
        const u = r[c];
        u.key != null ? bo(
          u,
          di(u, a, o, n)
        ) : At.NODE_ENV !== "production" && u.type !== ko && Ct("<TransitionGroup> children must be keyed.");
      }
      return f(l, null, r);
    };
  }
}), Va = Tg;
function Ag(e) {
  const t = e.el;
  t[hr] && t[hr](), t[Ql] && t[Ql]();
}
function Dg(e) {
  Fd.set(e, e.el.getBoundingClientRect());
}
function Ig(e) {
  const t = Md.get(e), n = Fd.get(e), o = t.left - n.left, i = t.top - n.top;
  if (o || i) {
    const r = e.el.style;
    return r.transform = r.webkitTransform = `translate(${o}px,${i}px)`, r.transitionDuration = "0s", e;
  }
}
function Pg(e, t, n) {
  const o = e.cloneNode(), i = e[Bo];
  i && i.forEach((a) => {
    a.split(/\s+/).forEach((l) => l && o.classList.remove(l));
  }), n.split(/\s+/).forEach((a) => a && o.classList.add(a)), o.style.display = "none";
  const r = t.nodeType === 1 ? t : t.parentNode;
  r.appendChild(o);
  const { hasTransform: s } = Id(o);
  return r.removeChild(o), s;
}
const vr = (e) => {
  const t = e.props["onUpdate:modelValue"] || !1;
  return ue(t) ? (n) => Oo(t, n) : t;
};
function $g(e) {
  e.target.composing = !0;
}
function eu(e) {
  const t = e.target;
  t.composing && (t.composing = !1, t.dispatchEvent(new Event("input")));
}
const Lo = Symbol("_assign"), Mg = {
  created(e, { modifiers: { lazy: t, trim: n, number: o } }, i) {
    e[Lo] = vr(i);
    const r = o || i.props && i.props.type === "number";
    lo(e, t ? "change" : "input", (s) => {
      if (s.target.composing) return;
      let a = e.value;
      n && (a = a.trim()), r && (a = or(a)), e[Lo](a);
    }), n && lo(e, "change", () => {
      e.value = e.value.trim();
    }), t || (lo(e, "compositionstart", $g), lo(e, "compositionend", eu), lo(e, "change", eu));
  },
  // set value on mounted so it's after min/max for type="range"
  mounted(e, { value: t }) {
    e.value = t ?? "";
  },
  beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: o, trim: i, number: r } }, s) {
    if (e[Lo] = vr(s), e.composing) return;
    const a = (r || e.type === "number") && !/^0\d/.test(e.value) ? or(e.value) : e.value, l = t ?? "";
    a !== l && (document.activeElement === e && e.type !== "range" && (o && t === n || i && e.value.trim() === l) || (e.value = l));
  }
}, Fg = {
  // <select multiple> value need to be deep traversed
  deep: !0,
  created(e, { value: t, modifiers: { number: n } }, o) {
    const i = Ar(t);
    lo(e, "change", () => {
      const r = Array.prototype.filter.call(e.options, (s) => s.selected).map(
        (s) => n ? or(gr(s)) : gr(s)
      );
      e[Lo](
        e.multiple ? i ? new Set(r) : r : r[0]
      ), e._assigning = !0, ft(() => {
        e._assigning = !1;
      });
    }), e[Lo] = vr(o);
  },
  // set value in mounted & updated because <select> relies on its children
  // <option>s.
  mounted(e, { value: t }) {
    tu(e, t);
  },
  beforeUpdate(e, t, n) {
    e[Lo] = vr(n);
  },
  updated(e, { value: t }) {
    e._assigning || tu(e, t);
  }
};
function tu(e, t) {
  const n = e.multiple, o = ue(t);
  if (n && !o && !Ar(t)) {
    At.NODE_ENV !== "production" && Ct(
      `<select multiple v-model> expects an Array or Set value for its binding, but got ${Object.prototype.toString.call(t).slice(8, -1)}.`
    );
    return;
  }
  for (let i = 0, r = e.options.length; i < r; i++) {
    const s = e.options[i], a = gr(s);
    if (n)
      if (o) {
        const l = typeof a;
        l === "string" || l === "number" ? s.selected = t.some((c) => String(c) === String(a)) : s.selected = Km(t, a) > -1;
      } else
        s.selected = t.has(a);
    else if (Ir(gr(s), t)) {
      e.selectedIndex !== i && (e.selectedIndex = i);
      return;
    }
  }
  !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
}
function gr(e) {
  return "_value" in e ? e._value : e.value;
}
const Lg = ["ctrl", "shift", "alt", "meta"], Bg = {
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
  exact: (e, t) => Lg.some((n) => e[`${n}Key`] && !t.includes(n))
}, so = (e, t) => {
  const n = e._withMods || (e._withMods = {}), o = t.join(".");
  return n[o] || (n[o] = (i, ...r) => {
    for (let s = 0; s < t.length; s++) {
      const a = Bg[t[s]];
      if (a && a(i, t)) return;
    }
    return e(i, ...r);
  });
}, Rg = /* @__PURE__ */ ze({ patchProp: Ng }, cg);
let nu;
function Hg() {
  return nu || (nu = Iv(Rg));
}
const jg = (...e) => {
  const t = Hg().createApp(...e);
  At.NODE_ENV !== "production" && (Ug(t), Wg(t));
  const { mount: n } = t;
  return t.mount = (o) => {
    const i = qg(o);
    if (!i) return;
    const r = t._component;
    !pe(r) && !r.render && !r.template && (r.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const s = n(i, !1, zg(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), s;
  }, t;
};
function zg(e) {
  if (e instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement)
    return "mathml";
}
function Ug(e) {
  Object.defineProperty(e.config, "isNativeTag", {
    value: (t) => Hm(t) || jm(t) || zm(t),
    writable: !1
  });
}
function Wg(e) {
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
function qg(e) {
  if (He(e)) {
    const t = document.querySelector(e);
    return At.NODE_ENV !== "production" && !t && Ct(
      `Failed to mount app: mount target selector "${e}" returned null.`
    ), t;
  }
  return At.NODE_ENV !== "production" && window.ShadowRoot && e instanceof window.ShadowRoot && e.mode === "closed" && Ct(
    'mounting on a ShadowRoot with `{mode: "closed"}` may lead to unpredictable bugs'
  ), e;
}
var Kg = {};
function Gg() {
  ag();
}
Kg.NODE_ENV !== "production" && Gg();
function Hn(e, t) {
  let n;
  function o() {
    n = ua(), n.run(() => t.length ? t(() => {
      n == null || n.stop(), o();
    }) : t());
  }
  _e(e, (i) => {
    i && !n ? o() : i || (n == null || n.stop(), n = void 0);
  }, {
    immediate: !0
  }), Dt(() => {
    n == null || n.stop();
  });
}
const je = typeof window < "u", Oa = je && "IntersectionObserver" in window, Yg = je && ("ontouchstart" in window || window.navigator.maxTouchPoints > 0);
function Ld(e, t, n) {
  const o = t.length - 1;
  if (o < 0) return e === void 0 ? n : e;
  for (let i = 0; i < o; i++) {
    if (e == null)
      return n;
    e = e[t[i]];
  }
  return e == null || e[t[o]] === void 0 ? n : e[t[o]];
}
function Oi(e, t) {
  if (e === t) return !0;
  if (e instanceof Date && t instanceof Date && e.getTime() !== t.getTime() || e !== Object(e) || t !== Object(t))
    return !1;
  const n = Object.keys(e);
  return n.length !== Object.keys(t).length ? !1 : n.every((o) => Oi(e[o], t[o]));
}
function Ws(e, t, n) {
  return e == null || !t || typeof t != "string" ? n : e[t] !== void 0 ? e[t] : (t = t.replace(/\[(\w+)\]/g, ".$1"), t = t.replace(/^\./, ""), Ld(e, t.split("."), n));
}
function Xo(e, t, n) {
  if (t === !0) return e === void 0 ? n : e;
  if (t == null || typeof t == "boolean") return n;
  if (e !== Object(e)) {
    if (typeof t != "function") return n;
    const i = t(e, n);
    return typeof i > "u" ? n : i;
  }
  if (typeof t == "string") return Ws(e, t, n);
  if (Array.isArray(t)) return Ld(e, t, n);
  if (typeof t != "function") return n;
  const o = t(e, n);
  return typeof o > "u" ? n : o;
}
function Ta(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
  return Array.from({
    length: e
  }, (n, o) => t + o);
}
function he(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "px";
  if (!(e == null || e === ""))
    return isNaN(+e) ? String(e) : isFinite(+e) ? `${Number(e)}${t}` : void 0;
}
function Xg(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function ou(e) {
  let t;
  return e !== null && typeof e == "object" && ((t = Object.getPrototypeOf(e)) === Object.prototype || t === null);
}
function Bd(e) {
  if (e && "$el" in e) {
    const t = e.$el;
    return (t == null ? void 0 : t.nodeType) === Node.TEXT_NODE ? t.nextElementSibling : t;
  }
  return e;
}
const iu = Object.freeze({
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
}), Jg = Object.freeze({
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
function vs(e, t) {
  return t.every((n) => e.hasOwnProperty(n));
}
function Rd(e, t) {
  const n = {}, o = new Set(Object.keys(e));
  for (const i of t)
    o.has(i) && (n[i] = e[i]);
  return n;
}
function ru(e, t, n) {
  const o = /* @__PURE__ */ Object.create(null), i = /* @__PURE__ */ Object.create(null);
  for (const r in e)
    t.some((s) => s instanceof RegExp ? s.test(r) : s === r) && !(n != null && n.some((s) => s === r)) ? o[r] = e[r] : i[r] = e[r];
  return [o, i];
}
function Aa(e, t) {
  const n = {
    ...e
  };
  return t.forEach((o) => delete n[o]), n;
}
function Zg(e, t) {
  const n = {};
  return t.forEach((o) => n[o] = e[o]), n;
}
const Hd = /^on[^a-z]/, Da = (e) => Hd.test(e), Qg = ["onAfterscriptexecute", "onAnimationcancel", "onAnimationend", "onAnimationiteration", "onAnimationstart", "onAuxclick", "onBeforeinput", "onBeforescriptexecute", "onChange", "onClick", "onCompositionend", "onCompositionstart", "onCompositionupdate", "onContextmenu", "onCopy", "onCut", "onDblclick", "onFocusin", "onFocusout", "onFullscreenchange", "onFullscreenerror", "onGesturechange", "onGestureend", "onGesturestart", "onGotpointercapture", "onInput", "onKeydown", "onKeypress", "onKeyup", "onLostpointercapture", "onMousedown", "onMousemove", "onMouseout", "onMouseover", "onMouseup", "onMousewheel", "onPaste", "onPointercancel", "onPointerdown", "onPointerenter", "onPointerleave", "onPointermove", "onPointerout", "onPointerover", "onPointerup", "onReset", "onSelect", "onSubmit", "onTouchcancel", "onTouchend", "onTouchmove", "onTouchstart", "onTransitioncancel", "onTransitionend", "onTransitionrun", "onTransitionstart", "onWheel"];
function Ia(e) {
  const [t, n] = ru(e, [Hd]), o = Aa(t, Qg), [i, r] = ru(n, ["class", "style", "id", /^data-/]);
  return Object.assign(i, t), Object.assign(r, o), [i, r];
}
function sn(e) {
  return e == null ? [] : Array.isArray(e) ? e : [e];
}
function Sn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
  return Math.max(t, Math.min(n, e));
}
function su(e) {
  const t = e.toString().trim();
  return t.includes(".") ? t.length - t.indexOf(".") - 1 : 0;
}
function au(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0";
  return e + n.repeat(Math.max(0, t - e.length));
}
function lu(e, t) {
  return (arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0").repeat(Math.max(0, t - e.length)) + e;
}
function ep(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1;
  const n = [];
  let o = 0;
  for (; o < e.length; )
    n.push(e.substr(o, t)), o += t;
  return n;
}
function Ot() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = arguments.length > 2 ? arguments[2] : void 0;
  const o = {};
  for (const i in e)
    o[i] = e[i];
  for (const i in t) {
    const r = e[i], s = t[i];
    if (ou(r) && ou(s)) {
      o[i] = Ot(r, s, n);
      continue;
    }
    if (n && Array.isArray(r) && Array.isArray(s)) {
      o[i] = n(r, s);
      continue;
    }
    o[i] = s;
  }
  return o;
}
function jd(e) {
  return e.map((t) => t.type === fe ? jd(t.children) : t).flat();
}
function go() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  if (go.cache.has(e)) return go.cache.get(e);
  const t = e.replace(/[^a-z]/gi, "-").replace(/\B([A-Z])/g, "-$1").toLowerCase();
  return go.cache.set(e, t), t;
}
go.cache = /* @__PURE__ */ new Map();
function Ao(e, t) {
  if (!t || typeof t != "object") return [];
  if (Array.isArray(t))
    return t.map((n) => Ao(e, n)).flat(1);
  if (t.suspense)
    return Ao(e, t.ssContent);
  if (Array.isArray(t.children))
    return t.children.map((n) => Ao(e, n)).flat(1);
  if (t.component) {
    if (Object.getOwnPropertySymbols(t.component.provides).includes(e))
      return [t.component];
    if (t.component.subTree)
      return Ao(e, t.component.subTree).flat(1);
  }
  return [];
}
function Pa(e) {
  const t = ct({}), n = y(e);
  return Xt(() => {
    for (const o in n.value)
      t[o] = n.value[o];
  }, {
    flush: "sync"
  }), ha(t);
}
function pr(e, t) {
  return e.includes(t);
}
function zd(e) {
  return e[2].toLowerCase() + e.slice(3);
}
const Bt = () => [Function, Array];
function uu(e, t) {
  return t = "on" + Ht(t), !!(e[t] || e[`${t}Once`] || e[`${t}Capture`] || e[`${t}OnceCapture`] || e[`${t}CaptureOnce`]);
}
function tp(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), o = 1; o < t; o++)
    n[o - 1] = arguments[o];
  if (Array.isArray(e))
    for (const i of e)
      i(...n);
  else typeof e == "function" && e(...n);
}
function Ud(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0;
  const n = ["button", "[href]", 'input:not([type="hidden"])', "select", "textarea", "[tabindex]"].map((o) => `${o}${t ? ':not([tabindex="-1"])' : ""}:not([disabled])`).join(", ");
  return [...e.querySelectorAll(n)];
}
function np(e, t, n) {
  let o, i = e.indexOf(document.activeElement);
  const r = t === "next" ? 1 : -1;
  do
    i += r, o = e[i];
  while ((!o || o.offsetParent == null) && i < e.length && i >= 0);
  return o;
}
function Wd(e, t) {
  var o, i, r, s;
  const n = Ud(e);
  if (!t)
    (e === document.activeElement || !e.contains(document.activeElement)) && ((o = n[0]) == null || o.focus());
  else if (t === "first")
    (i = n[0]) == null || i.focus();
  else if (t === "last")
    (r = n.at(-1)) == null || r.focus();
  else if (typeof t == "number")
    (s = n[t]) == null || s.focus();
  else {
    const a = np(n, t);
    a ? a.focus() : Wd(e, t === "next" ? "first" : "last");
  }
}
function qd(e, t) {
  if (!(je && typeof CSS < "u" && typeof CSS.supports < "u" && CSS.supports(`selector(${t})`))) return null;
  try {
    return !!e && e.matches(t);
  } catch {
    return null;
  }
}
function op(e, t) {
  if (!je || e === 0)
    return t(), () => {
    };
  const n = window.setTimeout(t, e);
  return () => window.clearTimeout(n);
}
function qs() {
  const e = ke(), t = (n) => {
    e.value = n;
  };
  return Object.defineProperty(t, "value", {
    enumerable: !0,
    get: () => e.value,
    set: (n) => e.value = n
  }), Object.defineProperty(t, "el", {
    enumerable: !0,
    get: () => Bd(e.value)
  }), t;
}
const Kd = ["top", "bottom"], ip = ["start", "end", "left", "right"];
function Ks(e, t) {
  let [n, o] = e.split(" ");
  return o || (o = pr(Kd, n) ? "start" : pr(ip, n) ? "top" : "center"), {
    side: cu(n, t),
    align: cu(o, t)
  };
}
function cu(e, t) {
  return e === "start" ? t ? "right" : "left" : e === "end" ? t ? "left" : "right" : e;
}
function gs(e) {
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
function ps(e) {
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
function du(e) {
  return {
    side: e.align,
    align: e.side
  };
}
function fu(e) {
  return pr(Kd, e.side) ? "y" : "x";
}
class po {
  constructor(t) {
    let {
      x: n,
      y: o,
      width: i,
      height: r
    } = t;
    this.x = n, this.y = o, this.width = i, this.height = r;
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
function mu(e, t) {
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
function Gd(e) {
  return Array.isArray(e) ? new po({
    x: e[0],
    y: e[1],
    width: 0,
    height: 0
  }) : e.getBoundingClientRect();
}
function $a(e) {
  const t = e.getBoundingClientRect(), n = getComputedStyle(e), o = n.transform;
  if (o) {
    let i, r, s, a, l;
    if (o.startsWith("matrix3d("))
      i = o.slice(9, -1).split(/, /), r = +i[0], s = +i[5], a = +i[12], l = +i[13];
    else if (o.startsWith("matrix("))
      i = o.slice(7, -1).split(/, /), r = +i[0], s = +i[3], a = +i[4], l = +i[5];
    else
      return new po(t);
    const c = n.transformOrigin, u = t.x - a - (1 - r) * parseFloat(c), d = t.y - l - (1 - s) * parseFloat(c.slice(c.indexOf(" ") + 1)), m = r ? t.width / r : e.offsetWidth + 1, g = s ? t.height / s : e.offsetHeight + 1;
    return new po({
      x: u,
      y: d,
      width: m,
      height: g
    });
  } else
    return new po(t);
}
function Do(e, t, n) {
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
const Ji = /* @__PURE__ */ new WeakMap();
function rp(e, t) {
  Object.keys(t).forEach((n) => {
    if (Da(n)) {
      const o = zd(n), i = Ji.get(e);
      if (t[n] == null)
        i == null || i.forEach((r) => {
          const [s, a] = r;
          s === o && (e.removeEventListener(o, a), i.delete(r));
        });
      else if (!i || ![...i].some((r) => r[0] === o && r[1] === t[n])) {
        e.addEventListener(o, t[n]);
        const r = i || /* @__PURE__ */ new Set();
        r.add([o, t[n]]), Ji.has(e) || Ji.set(e, r);
      }
    } else
      t[n] == null ? e.removeAttribute(n) : e.setAttribute(n, t[n]);
  });
}
function sp(e, t) {
  Object.keys(t).forEach((n) => {
    if (Da(n)) {
      const o = zd(n), i = Ji.get(e);
      i == null || i.forEach((r) => {
        const [s, a] = r;
        s === o && (e.removeEventListener(o, a), i.delete(r));
      });
    } else
      e.removeAttribute(n);
  });
}
const No = 2.4, hu = 0.2126729, vu = 0.7151522, gu = 0.072175, ap = 0.55, lp = 0.58, up = 0.57, cp = 0.62, Bi = 0.03, pu = 1.45, dp = 5e-4, fp = 1.25, mp = 1.25, yu = 0.078, bu = 12.82051282051282, Ri = 0.06, _u = 1e-3;
function wu(e, t) {
  const n = (e.r / 255) ** No, o = (e.g / 255) ** No, i = (e.b / 255) ** No, r = (t.r / 255) ** No, s = (t.g / 255) ** No, a = (t.b / 255) ** No;
  let l = n * hu + o * vu + i * gu, c = r * hu + s * vu + a * gu;
  if (l <= Bi && (l += (Bi - l) ** pu), c <= Bi && (c += (Bi - c) ** pu), Math.abs(c - l) < dp) return 0;
  let u;
  if (c > l) {
    const d = (c ** ap - l ** lp) * fp;
    u = d < _u ? 0 : d < yu ? d - d * bu * Ri : d - Ri;
  } else {
    const d = (c ** cp - l ** up) * mp;
    u = d > -_u ? 0 : d > -yu ? d - d * bu * Ri : d + Ri;
  }
  return u * 100;
}
function Fn(e) {
  Ct(`Vuetify: ${e}`);
}
function yr(e) {
  Ct(`Vuetify error: ${e}`);
}
function hp(e, t) {
  t = Array.isArray(t) ? t.slice(0, -1).map((n) => `'${n}'`).join(", ") + ` or '${t.at(-1)}'` : `'${t}'`, Ct(`[Vuetify UPGRADE] '${e}' is deprecated, use ${t} instead.`);
}
const br = 0.20689655172413793, vp = (e) => e > br ** 3 ? Math.cbrt(e) : e / (3 * br ** 2) + 4 / 29, gp = (e) => e > br ? e ** 3 : 3 * br ** 2 * (e - 4 / 29);
function Yd(e) {
  const t = vp, n = t(e[1]);
  return [116 * n - 16, 500 * (t(e[0] / 0.95047) - n), 200 * (n - t(e[2] / 1.08883))];
}
function Xd(e) {
  const t = gp, n = (e[0] + 16) / 116;
  return [t(n + e[1] / 500) * 0.95047, t(n), t(n - e[2] / 200) * 1.08883];
}
const pp = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]], yp = (e) => e <= 31308e-7 ? e * 12.92 : 1.055 * e ** (1 / 2.4) - 0.055, bp = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], _p = (e) => e <= 0.04045 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4;
function Jd(e) {
  const t = Array(3), n = yp, o = pp;
  for (let i = 0; i < 3; ++i)
    t[i] = Math.round(Sn(n(o[i][0] * e[0] + o[i][1] * e[1] + o[i][2] * e[2])) * 255);
  return {
    r: t[0],
    g: t[1],
    b: t[2]
  };
}
function Ma(e) {
  let {
    r: t,
    g: n,
    b: o
  } = e;
  const i = [0, 0, 0], r = _p, s = bp;
  t = r(t / 255), n = r(n / 255), o = r(o / 255);
  for (let a = 0; a < 3; ++a)
    i[a] = s[a][0] * t + s[a][1] * n + s[a][2] * o;
  return i;
}
function Gs(e) {
  return !!e && /^(#|var\(--|(rgb|hsl)a?\()/.test(e);
}
function wp(e) {
  return Gs(e) && !/^((rgb|hsl)a?\()?var\(--/.test(e);
}
const Su = /^(?<fn>(?:rgb|hsl)a?)\((?<values>.+)\)/, Sp = {
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
  hsl: (e, t, n, o) => ku({
    h: e,
    s: t,
    l: n,
    a: o
  }),
  hsla: (e, t, n, o) => ku({
    h: e,
    s: t,
    l: n,
    a: o
  }),
  hsv: (e, t, n, o) => hi({
    h: e,
    s: t,
    v: n,
    a: o
  }),
  hsva: (e, t, n, o) => hi({
    h: e,
    s: t,
    v: n,
    a: o
  })
};
function rn(e) {
  if (typeof e == "number")
    return (isNaN(e) || e < 0 || e > 16777215) && Fn(`'${e}' is not a valid hex color`), {
      r: (e & 16711680) >> 16,
      g: (e & 65280) >> 8,
      b: e & 255
    };
  if (typeof e == "string" && Su.test(e)) {
    const {
      groups: t
    } = e.match(Su), {
      fn: n,
      values: o
    } = t, i = o.split(/,\s*/).map((r) => r.endsWith("%") && ["hsl", "hsla", "hsv", "hsva"].includes(n) ? parseFloat(r) / 100 : parseFloat(r));
    return Sp[n](...i);
  } else if (typeof e == "string") {
    let t = e.startsWith("#") ? e.slice(1) : e;
    [3, 4].includes(t.length) ? t = t.split("").map((o) => o + o).join("") : [6, 8].includes(t.length) || Fn(`'${e}' is not a valid hex(a) color`);
    const n = parseInt(t, 16);
    return (isNaN(n) || n < 0 || n > 4294967295) && Fn(`'${e}' is not a valid hex(a) color`), Cp(t);
  } else if (typeof e == "object") {
    if (vs(e, ["r", "g", "b"]))
      return e;
    if (vs(e, ["h", "s", "l"]))
      return hi(Zd(e));
    if (vs(e, ["h", "s", "v"]))
      return hi(e);
  }
  throw new TypeError(`Invalid color: ${e == null ? e : String(e) || e.constructor.name}
Expected #hex, #hexa, rgb(), rgba(), hsl(), hsla(), object or number`);
}
function hi(e) {
  const {
    h: t,
    s: n,
    v: o,
    a: i
  } = e, r = (a) => {
    const l = (a + t / 60) % 6;
    return o - o * n * Math.max(Math.min(l, 4 - l, 1), 0);
  }, s = [r(5), r(3), r(1)].map((a) => Math.round(a * 255));
  return {
    r: s[0],
    g: s[1],
    b: s[2],
    a: i
  };
}
function ku(e) {
  return hi(Zd(e));
}
function Zd(e) {
  const {
    h: t,
    s: n,
    l: o,
    a: i
  } = e, r = o + n * Math.min(o, 1 - o), s = r === 0 ? 0 : 2 - 2 * o / r;
  return {
    h: t,
    s,
    v: r,
    a: i
  };
}
function Hi(e) {
  const t = Math.round(e).toString(16);
  return ("00".substr(0, 2 - t.length) + t).toUpperCase();
}
function kp(e) {
  let {
    r: t,
    g: n,
    b: o,
    a: i
  } = e;
  return `#${[Hi(t), Hi(n), Hi(o), i !== void 0 ? Hi(Math.round(i * 255)) : ""].join("")}`;
}
function Cp(e) {
  e = Ep(e);
  let [t, n, o, i] = ep(e, 2).map((r) => parseInt(r, 16));
  return i = i === void 0 ? i : i / 255, {
    r: t,
    g: n,
    b: o,
    a: i
  };
}
function Ep(e) {
  return e.startsWith("#") && (e = e.slice(1)), e = e.replace(/([^0-9a-f])/gi, "F"), (e.length === 3 || e.length === 4) && (e = e.split("").map((t) => t + t).join("")), e.length !== 6 && (e = au(au(e, 6), 8, "F")), e;
}
function xp(e, t) {
  const n = Yd(Ma(e));
  return n[0] = n[0] + t * 10, Jd(Xd(n));
}
function Np(e, t) {
  const n = Yd(Ma(e));
  return n[0] = n[0] - t * 10, Jd(Xd(n));
}
function Vp(e) {
  const t = rn(e);
  return Ma(t)[1];
}
function Qd(e) {
  const t = Math.abs(wu(rn(0), rn(e)));
  return Math.abs(wu(rn(16777215), rn(e))) > Math.min(t, 50) ? "#fff" : "#000";
}
function X(e, t) {
  return (n) => Object.keys(e).reduce((o, i) => {
    const s = typeof e[i] == "object" && e[i] != null && !Array.isArray(e[i]) ? e[i] : {
      type: e[i]
    };
    return n && i in n ? o[i] = {
      ...s,
      default: n[i]
    } : o[i] = s, t && !o[i].source && (o[i].source = t), o;
  }, {});
}
const Ne = X({
  class: [String, Array, Object],
  style: {
    type: [String, Array, Object],
    default: null
  }
}, "component");
function Qe(e, t) {
  const n = Rr();
  if (!n)
    throw new Error(`[Vuetify] ${e} must be called from inside a setup function`);
  return n;
}
function cn() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "composables";
  const t = Qe(e).type;
  return go((t == null ? void 0 : t.aliasName) || (t == null ? void 0 : t.name));
}
let ef = 0, Zi = /* @__PURE__ */ new WeakMap();
function Jt() {
  const e = Qe("getUid");
  if (Zi.has(e)) return Zi.get(e);
  {
    const t = ef++;
    return Zi.set(e, t), t;
  }
}
Jt.reset = () => {
  ef = 0, Zi = /* @__PURE__ */ new WeakMap();
};
function Op(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Qe("injectSelf");
  const {
    provides: n
  } = t;
  if (n && e in n)
    return n[e];
}
const Ro = Symbol.for("vuetify:defaults");
function Tp(e) {
  return se(e);
}
function Fa() {
  const e = Re(Ro);
  if (!e) throw new Error("[Vuetify] Could not find defaults instance");
  return e;
}
function Co(e, t) {
  const n = Fa(), o = se(e), i = y(() => {
    if (on(t == null ? void 0 : t.disabled)) return n.value;
    const s = on(t == null ? void 0 : t.scoped), a = on(t == null ? void 0 : t.reset), l = on(t == null ? void 0 : t.root);
    if (o.value == null && !(s || a || l)) return n.value;
    let c = Ot(o.value, {
      prev: n.value
    });
    if (s) return c;
    if (a || l) {
      const u = Number(a || 1 / 0);
      for (let d = 0; d <= u && !(!c || !("prev" in c)); d++)
        c = c.prev;
      return c && typeof l == "string" && l in c && (c = Ot(Ot(c, {
        prev: c
      }), c[l])), c;
    }
    return c.prev ? Ot(c.prev, c) : c;
  });
  return Et(Ro, i), i;
}
function Ap(e, t) {
  var n, o;
  return typeof ((n = e.props) == null ? void 0 : n[t]) < "u" || typeof ((o = e.props) == null ? void 0 : o[go(t)]) < "u";
}
function Dp() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Fa();
  const o = Qe("useDefaults");
  if (t = t ?? o.type.name ?? o.type.__name, !t)
    throw new Error("[Vuetify] Could not determine component name");
  const i = y(() => {
    var l;
    return (l = n.value) == null ? void 0 : l[e._as ?? t];
  }), r = new Proxy(e, {
    get(l, c) {
      var d, m, g, h, v, b, k;
      const u = Reflect.get(l, c);
      return c === "class" || c === "style" ? [(d = i.value) == null ? void 0 : d[c], u].filter((O) => O != null) : typeof c == "string" && !Ap(o.vnode, c) ? ((m = i.value) == null ? void 0 : m[c]) !== void 0 ? (g = i.value) == null ? void 0 : g[c] : ((v = (h = n.value) == null ? void 0 : h.global) == null ? void 0 : v[c]) !== void 0 ? (k = (b = n.value) == null ? void 0 : b.global) == null ? void 0 : k[c] : u : u;
    }
  }), s = ke();
  Xt(() => {
    if (i.value) {
      const l = Object.entries(i.value).filter((c) => {
        let [u] = c;
        return u.startsWith(u[0].toUpperCase());
      });
      s.value = l.length ? Object.fromEntries(l) : void 0;
    } else
      s.value = void 0;
  });
  function a() {
    const l = Op(Ro, o);
    Et(Ro, y(() => s.value ? Ot((l == null ? void 0 : l.value) ?? {}, s.value) : l == null ? void 0 : l.value));
  }
  return {
    props: r,
    provideSubDefaults: a
  };
}
function Uo(e) {
  if (e._setup = e._setup ?? e.setup, !e.name)
    return Fn("The component is missing an explicit name, unable to generate default prop value"), e;
  if (e._setup) {
    e.props = X(e.props ?? {}, e.name)();
    const t = Object.keys(e.props).filter((n) => n !== "class" && n !== "style");
    e.filterProps = function(o) {
      return Rd(o, t);
    }, e.props._as = String, e.setup = function(o, i) {
      const r = Fa();
      if (!r.value) return e._setup(o, i);
      const {
        props: s,
        provideSubDefaults: a
      } = Dp(o, o._as ?? e.name, r), l = e._setup(s, i);
      return a(), l;
    };
  }
  return e;
}
function ve() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !0;
  return (t) => (e ? Uo : Xh)(t);
}
function La(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "div", n = arguments.length > 2 ? arguments[2] : void 0;
  return ve()({
    name: n ?? Ht(dt(e.replace(/__/g, "-"))),
    props: {
      tag: {
        type: String,
        default: t
      },
      ...Ne()
    },
    setup(o, i) {
      let {
        slots: r
      } = i;
      return () => {
        var s;
        return jn(o.tag, {
          class: [e, o.class],
          style: o.style
        }, (s = r.default) == null ? void 0 : s.call(r));
      };
    }
  });
}
function tf(e) {
  if (typeof e.getRootNode != "function") {
    for (; e.parentNode; ) e = e.parentNode;
    return e !== document ? null : document;
  }
  const t = e.getRootNode();
  return t !== document && t.getRootNode({
    composed: !0
  }) !== document ? null : t;
}
const _r = "cubic-bezier(0.4, 0, 0.2, 1)", Ip = "cubic-bezier(0.0, 0, 0.2, 1)", Pp = "cubic-bezier(0.4, 0, 1, 1)";
function $p(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
  for (; e; ) {
    if (t ? Mp(e) : Ba(e)) return e;
    e = e.parentElement;
  }
  return document.scrollingElement;
}
function wr(e, t) {
  const n = [];
  if (t && e && !t.contains(e)) return n;
  for (; e && (Ba(e) && n.push(e), e !== t); )
    e = e.parentElement;
  return n;
}
function Ba(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return t.overflowY === "scroll" || t.overflowY === "auto" && e.scrollHeight > e.clientHeight;
}
function Mp(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return ["scroll", "auto"].includes(t.overflowY);
}
function Fp(e) {
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
  let o = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : (d) => d, i = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : (d) => d;
  const r = Qe("useProxiedModel"), s = se(e[t] !== void 0 ? e[t] : n), a = go(t), c = y(a !== t ? () => {
    var d, m, g, h;
    return e[t], !!(((d = r.vnode.props) != null && d.hasOwnProperty(t) || (m = r.vnode.props) != null && m.hasOwnProperty(a)) && ((g = r.vnode.props) != null && g.hasOwnProperty(`onUpdate:${t}`) || (h = r.vnode.props) != null && h.hasOwnProperty(`onUpdate:${a}`)));
  } : () => {
    var d, m;
    return e[t], !!((d = r.vnode.props) != null && d.hasOwnProperty(t) && ((m = r.vnode.props) != null && m.hasOwnProperty(`onUpdate:${t}`)));
  });
  Hn(() => !c.value, () => {
    _e(() => e[t], (d) => {
      s.value = d;
    });
  });
  const u = y({
    get() {
      const d = e[t];
      return o(c.value ? d : s.value);
    },
    set(d) {
      const m = i(d), g = ae(c.value ? e[t] : s.value);
      g === m || o(g) === d || (s.value = m, r == null || r.emit(`update:${t}`, m));
    }
  });
  return Object.defineProperty(u, "externalValue", {
    get: () => c.value ? e[t] : s.value
  }), u;
}
const Lp = {
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
}, Cu = "$vuetify.", Eu = (e, t) => e.replace(/\{(\d+)\}/g, (n, o) => String(t[+o])), nf = (e, t, n) => function(o) {
  for (var i = arguments.length, r = new Array(i > 1 ? i - 1 : 0), s = 1; s < i; s++)
    r[s - 1] = arguments[s];
  if (!o.startsWith(Cu))
    return Eu(o, r);
  const a = o.replace(Cu, ""), l = e.value && n.value[e.value], c = t.value && n.value[t.value];
  let u = Ws(l, a, null);
  return u || (Fn(`Translation key "${o}" not found in "${e.value}", trying fallback locale`), u = Ws(c, a, null)), u || (yr(`Translation key "${o}" not found in fallback`), u = o), typeof u != "string" && (yr(`Translation key "${o}" has a non-string value`), u = o), Eu(u, r);
};
function of(e, t) {
  return (n, o) => new Intl.NumberFormat([e.value, t.value], o).format(n);
}
function ys(e, t, n) {
  const o = nt(e, t, e[t] ?? n.value);
  return o.value = e[t] ?? n.value, _e(n, (i) => {
    e[t] == null && (o.value = n.value);
  }), o;
}
function rf(e) {
  return (t) => {
    const n = ys(t, "locale", e.current), o = ys(t, "fallback", e.fallback), i = ys(t, "messages", e.messages);
    return {
      name: "vuetify",
      current: n,
      fallback: o,
      messages: i,
      t: nf(n, o, i),
      n: of(n, o),
      provide: rf({
        current: n,
        fallback: o,
        messages: i
      })
    };
  };
}
function Bp(e) {
  const t = ke((e == null ? void 0 : e.locale) ?? "en"), n = ke((e == null ? void 0 : e.fallback) ?? "en"), o = se({
    en: Lp,
    ...e == null ? void 0 : e.messages
  });
  return {
    name: "vuetify",
    current: t,
    fallback: n,
    messages: o,
    t: nf(t, n, o),
    n: of(t, n),
    provide: rf({
      current: t,
      fallback: n,
      messages: o
    })
  };
}
const Sr = Symbol.for("vuetify:locale");
function Rp(e) {
  return e.name != null;
}
function Hp(e) {
  const t = e != null && e.adapter && Rp(e == null ? void 0 : e.adapter) ? e == null ? void 0 : e.adapter : Bp(e), n = Up(t, e);
  return {
    ...t,
    ...n
  };
}
function jp() {
  const e = Re(Sr);
  if (!e) throw new Error("[Vuetify] Could not find injected locale instance");
  return e;
}
function zp() {
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
function Up(e, t) {
  const n = se((t == null ? void 0 : t.rtl) ?? zp()), o = y(() => n.value[e.current.value] ?? !1);
  return {
    isRtl: o,
    rtl: n,
    rtlClasses: y(() => `v-locale--is-${o.value ? "rtl" : "ltr"}`)
  };
}
function dn() {
  const e = Re(Sr);
  if (!e) throw new Error("[Vuetify] Could not find injected rtl instance");
  return {
    isRtl: e.isRtl,
    rtlClasses: e.rtlClasses
  };
}
const zr = {
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
function Wp(e, t, n) {
  const o = [];
  let i = [];
  const r = sf(e), s = af(e), a = n ?? zr[t.slice(-2).toUpperCase()] ?? 0, l = (r.getDay() - a + 7) % 7, c = (s.getDay() - a + 7) % 7;
  for (let u = 0; u < l; u++) {
    const d = new Date(r);
    d.setDate(d.getDate() - (l - u)), i.push(d);
  }
  for (let u = 1; u <= s.getDate(); u++) {
    const d = new Date(e.getFullYear(), e.getMonth(), u);
    i.push(d), i.length === 7 && (o.push(i), i = []);
  }
  for (let u = 1; u < 7 - c; u++) {
    const d = new Date(s);
    d.setDate(d.getDate() + u), i.push(d);
  }
  return i.length > 0 && o.push(i), o;
}
function qp(e, t, n) {
  const o = n ?? zr[t.slice(-2).toUpperCase()] ?? 0, i = new Date(e);
  for (; i.getDay() !== o; )
    i.setDate(i.getDate() - 1);
  return i;
}
function Kp(e, t) {
  const n = new Date(e), o = ((zr[t.slice(-2).toUpperCase()] ?? 0) + 6) % 7;
  for (; n.getDay() !== o; )
    n.setDate(n.getDate() + 1);
  return n;
}
function sf(e) {
  return new Date(e.getFullYear(), e.getMonth(), 1);
}
function af(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 0);
}
function Gp(e) {
  const t = e.split("-").map(Number);
  return new Date(t[0], t[1] - 1, t[2]);
}
const Yp = /^([12]\d{3}-([1-9]|0[1-9]|1[0-2])-([1-9]|0[1-9]|[12]\d|3[01]))$/;
function lf(e) {
  if (e == null) return /* @__PURE__ */ new Date();
  if (e instanceof Date) return e;
  if (typeof e == "string") {
    let t;
    if (Yp.test(e))
      return Gp(e);
    if (t = Date.parse(e), !isNaN(t)) return new Date(t);
  }
  return null;
}
const xu = new Date(2e3, 0, 2);
function Xp(e, t) {
  const n = t ?? zr[e.slice(-2).toUpperCase()] ?? 0;
  return Ta(7).map((o) => {
    const i = new Date(xu);
    return i.setDate(xu.getDate() + n + o), new Intl.DateTimeFormat(e, {
      weekday: "narrow"
    }).format(i);
  });
}
function Jp(e, t, n, o) {
  const i = lf(e) ?? /* @__PURE__ */ new Date(), r = o == null ? void 0 : o[t];
  if (typeof r == "function")
    return r(i, t, n);
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
      const a = i.getDate(), l = new Intl.DateTimeFormat(n, {
        month: "long"
      }).format(i);
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
      return new Intl.NumberFormat(n).format(i.getDate());
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
  return new Intl.DateTimeFormat(n, s).format(i);
}
function Zp(e, t) {
  const n = e.toJsDate(t), o = n.getFullYear(), i = lu(String(n.getMonth() + 1), 2, "0"), r = lu(String(n.getDate()), 2, "0");
  return `${o}-${i}-${r}`;
}
function Qp(e) {
  const [t, n, o] = e.split("-").map(Number);
  return new Date(t, n - 1, o);
}
function ey(e, t) {
  const n = new Date(e);
  return n.setMinutes(n.getMinutes() + t), n;
}
function ty(e, t) {
  const n = new Date(e);
  return n.setHours(n.getHours() + t), n;
}
function ny(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}
function oy(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t * 7), n;
}
function iy(e, t) {
  const n = new Date(e);
  return n.setDate(1), n.setMonth(n.getMonth() + t), n;
}
function ry(e) {
  return e.getFullYear();
}
function sy(e) {
  return e.getMonth();
}
function ay(e) {
  return e.getDate();
}
function ly(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 1);
}
function uy(e) {
  return new Date(e.getFullYear(), e.getMonth() - 1, 1);
}
function cy(e) {
  return e.getHours();
}
function dy(e) {
  return e.getMinutes();
}
function fy(e) {
  return new Date(e.getFullYear(), 0, 1);
}
function my(e) {
  return new Date(e.getFullYear(), 11, 31);
}
function hy(e, t) {
  return kr(e, t[0]) && py(e, t[1]);
}
function vy(e) {
  const t = new Date(e);
  return t instanceof Date && !isNaN(t.getTime());
}
function kr(e, t) {
  return e.getTime() > t.getTime();
}
function gy(e, t) {
  return kr(Ys(e), Ys(t));
}
function py(e, t) {
  return e.getTime() < t.getTime();
}
function Nu(e, t) {
  return e.getTime() === t.getTime();
}
function yy(e, t) {
  return e.getDate() === t.getDate() && e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function by(e, t) {
  return e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function _y(e, t) {
  return e.getFullYear() === t.getFullYear();
}
function wy(e, t, n) {
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
function Sy(e, t) {
  const n = new Date(e);
  return n.setHours(t), n;
}
function ky(e, t) {
  const n = new Date(e);
  return n.setMinutes(t), n;
}
function Cy(e, t) {
  const n = new Date(e);
  return n.setMonth(t), n;
}
function Ey(e, t) {
  const n = new Date(e);
  return n.setDate(t), n;
}
function xy(e, t) {
  const n = new Date(e);
  return n.setFullYear(t), n;
}
function Ys(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
}
function Ny(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
}
class Vy {
  constructor(t) {
    this.locale = t.locale, this.formats = t.formats;
  }
  date(t) {
    return lf(t);
  }
  toJsDate(t) {
    return t;
  }
  toISO(t) {
    return Zp(this, t);
  }
  parseISO(t) {
    return Qp(t);
  }
  addMinutes(t, n) {
    return ey(t, n);
  }
  addHours(t, n) {
    return ty(t, n);
  }
  addDays(t, n) {
    return ny(t, n);
  }
  addWeeks(t, n) {
    return oy(t, n);
  }
  addMonths(t, n) {
    return iy(t, n);
  }
  getWeekArray(t, n) {
    return Wp(t, this.locale, n ? Number(n) : void 0);
  }
  startOfWeek(t, n) {
    return qp(t, this.locale, n ? Number(n) : void 0);
  }
  endOfWeek(t) {
    return Kp(t, this.locale);
  }
  startOfMonth(t) {
    return sf(t);
  }
  endOfMonth(t) {
    return af(t);
  }
  format(t, n) {
    return Jp(t, n, this.locale, this.formats);
  }
  isEqual(t, n) {
    return Nu(t, n);
  }
  isValid(t) {
    return vy(t);
  }
  isWithinRange(t, n) {
    return hy(t, n);
  }
  isAfter(t, n) {
    return kr(t, n);
  }
  isAfterDay(t, n) {
    return gy(t, n);
  }
  isBefore(t, n) {
    return !kr(t, n) && !Nu(t, n);
  }
  isSameDay(t, n) {
    return yy(t, n);
  }
  isSameMonth(t, n) {
    return by(t, n);
  }
  isSameYear(t, n) {
    return _y(t, n);
  }
  setMinutes(t, n) {
    return ky(t, n);
  }
  setHours(t, n) {
    return Sy(t, n);
  }
  setMonth(t, n) {
    return Cy(t, n);
  }
  setDate(t, n) {
    return Ey(t, n);
  }
  setYear(t, n) {
    return xy(t, n);
  }
  getDiff(t, n, o) {
    return wy(t, n, o);
  }
  getWeekdays(t) {
    return Xp(this.locale, t ? Number(t) : void 0);
  }
  getYear(t) {
    return ry(t);
  }
  getMonth(t) {
    return sy(t);
  }
  getDate(t) {
    return ay(t);
  }
  getNextMonth(t) {
    return ly(t);
  }
  getPreviousMonth(t) {
    return uy(t);
  }
  getHours(t) {
    return cy(t);
  }
  getMinutes(t) {
    return dy(t);
  }
  startOfDay(t) {
    return Ys(t);
  }
  endOfDay(t) {
    return Ny(t);
  }
  startOfYear(t) {
    return fy(t);
  }
  endOfYear(t) {
    return my(t);
  }
}
const Oy = Symbol.for("vuetify:date-options"), Vu = Symbol.for("vuetify:date-adapter");
function Ty(e, t) {
  const n = Ot({
    adapter: Vy,
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
    instance: Ay(n, t)
  };
}
function Ay(e, t) {
  const n = ct(typeof e.adapter == "function" ? new e.adapter({
    locale: e.locale[t.current.value] ?? t.current.value,
    formats: e.formats
  }) : e.adapter);
  return _e(t.current, (o) => {
    n.locale = e.locale[o] ?? o ?? n.locale;
  }), n;
}
const Ur = ["sm", "md", "lg", "xl", "xxl"], Xs = Symbol.for("vuetify:display"), Ou = {
  mobileBreakpoint: "lg",
  thresholds: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
    xxl: 2560
  }
}, Dy = function() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Ou;
  return Ot(Ou, e);
};
function Tu(e) {
  return je && !e ? window.innerWidth : typeof e == "object" && e.clientWidth || 0;
}
function Au(e) {
  return je && !e ? window.innerHeight : typeof e == "object" && e.clientHeight || 0;
}
function Du(e) {
  const t = je && !e ? window.navigator.userAgent : "ssr";
  function n(h) {
    return !!t.match(h);
  }
  const o = n(/android/i), i = n(/iphone|ipad|ipod/i), r = n(/cordova/i), s = n(/electron/i), a = n(/chrome/i), l = n(/edge/i), c = n(/firefox/i), u = n(/opera/i), d = n(/win/i), m = n(/mac/i), g = n(/linux/i);
  return {
    android: o,
    ios: i,
    cordova: r,
    electron: s,
    chrome: a,
    edge: l,
    firefox: c,
    opera: u,
    win: d,
    mac: m,
    linux: g,
    touch: Yg,
    ssr: t === "ssr"
  };
}
function Iy(e, t) {
  const {
    thresholds: n,
    mobileBreakpoint: o
  } = Dy(e), i = ke(Au(t)), r = ke(Du(t)), s = ct({}), a = ke(Tu(t));
  function l() {
    i.value = Au(), a.value = Tu();
  }
  function c() {
    l(), r.value = Du();
  }
  return Xt(() => {
    const u = a.value < n.sm, d = a.value < n.md && !u, m = a.value < n.lg && !(d || u), g = a.value < n.xl && !(m || d || u), h = a.value < n.xxl && !(g || m || d || u), v = a.value >= n.xxl, b = u ? "xs" : d ? "sm" : m ? "md" : g ? "lg" : h ? "xl" : "xxl", k = typeof o == "number" ? o : n[o], O = a.value < k;
    s.xs = u, s.sm = d, s.md = m, s.lg = g, s.xl = h, s.xxl = v, s.smAndUp = !u, s.mdAndUp = !(u || d), s.lgAndUp = !(u || d || m), s.xlAndUp = !(u || d || m || g), s.smAndDown = !(m || g || h || v), s.mdAndDown = !(g || h || v), s.lgAndDown = !(h || v), s.xlAndDown = !v, s.name = b, s.height = i.value, s.width = a.value, s.mobile = O, s.mobileBreakpoint = o, s.platform = r.value, s.thresholds = n;
  }), je && window.addEventListener("resize", l, {
    passive: !0
  }), {
    ...ha(s),
    update: c,
    ssr: !!t
  };
}
function Py() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn();
  const n = Re(Xs);
  if (!n) throw new Error("Could not find Vuetify display injection");
  const o = y(() => {
    if (e.mobile != null) return e.mobile;
    if (!e.mobileBreakpoint) return n.mobile.value;
    const r = typeof e.mobileBreakpoint == "number" ? e.mobileBreakpoint : n.thresholds.value[e.mobileBreakpoint];
    return n.width.value < r;
  }), i = y(() => t ? {
    [`${t}--mobile`]: o.value
  } : {});
  return {
    ...n,
    displayClasses: i,
    mobile: o
  };
}
const $y = Symbol.for("vuetify:goto");
function My() {
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
function Fy(e, t) {
  return {
    rtl: t.isRtl,
    options: Ot(My(), e)
  };
}
const Ly = {
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
}, By = {
  // Not using mergeProps here, functional components merge props by default (?)
  component: (e) => jn(cf, {
    ...e,
    class: "mdi"
  })
}, Xe = [String, Function, Object, Array], Js = Symbol.for("vuetify:icons"), Wr = X({
  icon: {
    type: Xe
  },
  // Could not remove this and use makeTagProps, types complained because it is not required
  tag: {
    type: String,
    required: !0
  }
}, "icon"), Iu = ve()({
  name: "VComponentIcon",
  props: Wr(),
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
}), uf = Uo({
  name: "VSvgIcon",
  inheritAttrs: !1,
  props: Wr(),
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
Uo({
  name: "VLigatureIcon",
  props: Wr(),
  setup(e) {
    return () => f(e.tag, null, {
      default: () => [e.icon]
    });
  }
});
const cf = Uo({
  name: "VClassIcon",
  props: Wr(),
  setup(e) {
    return () => f(e.tag, {
      class: e.icon
    }, null);
  }
});
function Ry() {
  return {
    svg: {
      component: uf
    },
    class: {
      component: cf
    }
  };
}
function Hy(e) {
  const t = Ry(), n = (e == null ? void 0 : e.defaultSet) ?? "mdi";
  return n === "mdi" && !t.mdi && (t.mdi = By), Ot({
    defaultSet: n,
    sets: t,
    aliases: {
      ...Ly,
      /* eslint-disable max-len */
      vuetify: ["M8.2241 14.2009L12 21L22 3H14.4459L8.2241 14.2009Z", ["M7.26303 12.4733L7.00113 12L2 3H12.5261C12.5261 3 12.5261 3 12.5261 3L7.26303 12.4733Z", 0.6]],
      "vuetify-outline": "svg:M7.26 12.47 12.53 3H2L7.26 12.47ZM14.45 3 8.22 14.2 12 21 22 3H14.45ZM18.6 5 12 16.88 10.51 14.2 15.62 5ZM7.26 8.35 5.4 5H9.13L7.26 8.35Z",
      "vuetify-play": ["m6.376 13.184-4.11-7.192C1.505 4.66 2.467 3 4.003 3h8.532l-.953 1.576-.006.01-.396.677c-.429.732-.214 1.507.194 2.015.404.503 1.092.878 1.869.806a3.72 3.72 0 0 1 1.005.022c.276.053.434.143.523.237.138.146.38.635-.25 2.09-.893 1.63-1.553 1.722-1.847 1.677-.213-.033-.468-.158-.756-.406a4.95 4.95 0 0 1-.8-.927c-.39-.564-1.04-.84-1.66-.846-.625-.006-1.316.27-1.693.921l-.478.826-.911 1.506Z", ["M9.093 11.552c.046-.079.144-.15.32-.148a.53.53 0 0 1 .43.207c.285.414.636.847 1.046 1.2.405.35.914.662 1.516.754 1.334.205 2.502-.698 3.48-2.495l.014-.028.013-.03c.687-1.574.774-2.852-.005-3.675-.37-.391-.861-.586-1.333-.676a5.243 5.243 0 0 0-1.447-.044c-.173.016-.393-.073-.54-.257-.145-.18-.127-.316-.082-.392l.393-.672L14.287 3h5.71c1.536 0 2.499 1.659 1.737 2.992l-7.997 13.996c-.768 1.344-2.706 1.344-3.473 0l-3.037-5.314 1.377-2.278.004-.006.004-.007.481-.831Z", 0.6]]
      /* eslint-enable max-len */
    }
  }, e);
}
const jy = (e) => {
  const t = Re(Js);
  if (!t) throw new Error("Missing Vuetify Icons provide!");
  return {
    iconData: y(() => {
      var l;
      const o = on(e);
      if (!o) return {
        component: Iu
      };
      let i = o;
      if (typeof i == "string" && (i = i.trim(), i.startsWith("$") && (i = (l = t.aliases) == null ? void 0 : l[i.slice(1)])), i || Fn(`Could not find aliased icon "${o}"`), Array.isArray(i))
        return {
          component: uf,
          icon: i
        };
      if (typeof i != "string")
        return {
          component: Iu,
          icon: i
        };
      const r = Object.keys(t.sets).find((c) => typeof i == "string" && i.startsWith(`${c}:`)), s = r ? i.slice(r.length + 1) : i;
      return {
        component: t.sets[r ?? t.defaultSet].component,
        icon: s
      };
    })
  };
}, vi = Symbol.for("vuetify:theme"), at = X({
  theme: String
}, "theme");
function Pu() {
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
function zy() {
  var o, i;
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Pu();
  const t = Pu();
  if (!e) return {
    ...t,
    isDisabled: !0
  };
  const n = {};
  for (const [r, s] of Object.entries(e.themes ?? {})) {
    const a = s.dark || r === "dark" ? (o = t.themes) == null ? void 0 : o.dark : (i = t.themes) == null ? void 0 : i.light;
    n[r] = Ot(a, s);
  }
  return Ot(t, {
    ...e,
    themes: n
  });
}
function Uy(e) {
  const t = zy(e), n = se(t.defaultTheme), o = se(t.themes), i = y(() => {
    const u = {};
    for (const [d, m] of Object.entries(o.value)) {
      const g = u[d] = {
        ...m,
        colors: {
          ...m.colors
        }
      };
      if (t.variations)
        for (const h of t.variations.colors) {
          const v = g.colors[h];
          if (v)
            for (const b of ["lighten", "darken"]) {
              const k = b === "lighten" ? xp : Np;
              for (const O of Ta(t.variations[b], 1))
                g.colors[`${h}-${b}-${O}`] = kp(k(rn(v), O));
            }
        }
      for (const h of Object.keys(g.colors)) {
        if (/^on-[a-z]/.test(h) || g.colors[`on-${h}`]) continue;
        const v = `on-${h}`, b = rn(g.colors[h]);
        g.colors[v] = Qd(b);
      }
    }
    return u;
  }), r = y(() => i.value[n.value]), s = y(() => {
    var h;
    const u = [];
    (h = r.value) != null && h.dark && no(u, ":root", ["color-scheme: dark"]), no(u, ":root", $u(r.value));
    for (const [v, b] of Object.entries(i.value))
      no(u, `.v-theme--${v}`, [`color-scheme: ${b.dark ? "dark" : "normal"}`, ...$u(b)]);
    const d = [], m = [], g = new Set(Object.values(i.value).flatMap((v) => Object.keys(v.colors)));
    for (const v of g)
      /^on-[a-z]/.test(v) ? no(m, `.${v}`, [`color: rgb(var(--v-theme-${v})) !important`]) : (no(d, `.bg-${v}`, [`--v-theme-overlay-multiplier: var(--v-theme-${v}-overlay-multiplier)`, `background-color: rgb(var(--v-theme-${v})) !important`, `color: rgb(var(--v-theme-on-${v})) !important`]), no(m, `.text-${v}`, [`color: rgb(var(--v-theme-${v})) !important`]), no(m, `.border-${v}`, [`--v-border-color: var(--v-theme-${v})`]));
    return u.push(...d, ...m), u.map((v, b) => b === 0 ? v : `    ${v}`).join("");
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
  function l(u) {
    if (t.isDisabled) return;
    const d = u._context.provides.usehead;
    if (d)
      if (d.push) {
        const m = d.push(a);
        je && _e(s, () => {
          m.patch(a);
        });
      } else
        je ? (d.addHeadObjs(y(a)), Xt(() => d.updateDOM())) : d.addHeadObjs(a());
    else {
      let g = function() {
        if (typeof document < "u" && !m) {
          const h = document.createElement("style");
          h.type = "text/css", h.id = "vuetify-theme-stylesheet", t.cspNonce && h.setAttribute("nonce", t.cspNonce), m = h, document.head.appendChild(m);
        }
        m && (m.innerHTML = s.value);
      }, m = je ? document.getElementById("vuetify-theme-stylesheet") : null;
      je ? _e(s, g, {
        immediate: !0
      }) : g();
    }
  }
  const c = y(() => t.isDisabled ? void 0 : `v-theme--${n.value}`);
  return {
    install: l,
    isDisabled: t.isDisabled,
    name: n,
    themes: o,
    current: r,
    computedThemes: i,
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
  const t = Re(vi, null);
  if (!t) throw new Error("Could not find Vuetify theme injection");
  const n = y(() => e.theme ?? t.name.value), o = y(() => t.themes.value[n.value]), i = y(() => t.isDisabled ? void 0 : `v-theme--${n.value}`), r = {
    ...t,
    name: n,
    current: o,
    themeClasses: i
  };
  return Et(vi, r), r;
}
function Wy() {
  Qe("useTheme");
  const e = Re(vi, null);
  if (!e) throw new Error("Could not find Vuetify theme injection");
  return e;
}
function no(e, t, n) {
  e.push(`${t} {
`, ...n.map((o) => `  ${o};
`), `}
`);
}
function $u(e) {
  const t = e.dark ? 2 : 1, n = e.dark ? 1 : 2, o = [];
  for (const [i, r] of Object.entries(e.colors)) {
    const s = rn(r);
    o.push(`--v-theme-${i}: ${s.r},${s.g},${s.b}`), i.startsWith("on-") || o.push(`--v-theme-${i}-overlay-multiplier: ${Vp(r) > 0.18 ? t : n}`);
  }
  for (const [i, r] of Object.entries(e.variables)) {
    const s = typeof r == "string" && r.startsWith("#") ? rn(r) : void 0, a = s ? `${s.r}, ${s.g}, ${s.b}` : void 0;
    o.push(`--v-${i}: ${a ?? r}`);
  }
  return o;
}
function df(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "content";
  const n = qs(), o = se();
  if (je) {
    const i = new ResizeObserver((r) => {
      r.length && (t === "content" ? o.value = r[0].contentRect : o.value = r[0].target.getBoundingClientRect());
    });
    gt(() => {
      i.disconnect();
    }), _e(() => n.el, (r, s) => {
      s && (i.unobserve(s), o.value = void 0), r && i.observe(r);
    }, {
      flush: "post"
    });
  }
  return {
    resizeRef: n,
    contentRect: Ci(o)
  };
}
const gi = Symbol.for("vuetify:layout"), ff = Symbol.for("vuetify:layout-item"), Mu = 1e3, qy = X({
  overlaps: {
    type: Array,
    default: () => []
  },
  fullHeight: Boolean
}, "layout"), mf = X({
  name: {
    type: String
  },
  order: {
    type: [Number, String],
    default: 0
  },
  absolute: Boolean
}, "layout-item");
function hf() {
  const e = Re(gi);
  if (!e) throw new Error("[Vuetify] Could not find injected layout");
  return {
    getLayoutItem: e.getLayoutItem,
    mainRect: e.mainRect,
    mainStyles: e.mainStyles
  };
}
function vf(e) {
  const t = Re(gi);
  if (!t) throw new Error("[Vuetify] Could not find injected layout");
  const n = e.id ?? `layout-item-${Jt()}`, o = Qe("useLayoutItem");
  Et(ff, {
    id: n
  });
  const i = ke(!1);
  ed(() => i.value = !0), Qc(() => i.value = !1);
  const {
    layoutItemStyles: r,
    layoutItemScrimStyles: s
  } = t.register(o, {
    ...e,
    active: y(() => i.value ? !1 : e.active.value),
    id: n
  });
  return gt(() => t.unregister(n)), {
    layoutItemStyles: r,
    layoutRect: t.layoutRect,
    layoutItemScrimStyles: s
  };
}
const Ky = (e, t, n, o) => {
  let i = {
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  };
  const r = [{
    id: "",
    layer: {
      ...i
    }
  }];
  for (const s of e) {
    const a = t.get(s), l = n.get(s), c = o.get(s);
    if (!a || !l || !c) continue;
    const u = {
      ...i,
      [a.value]: parseInt(i[a.value], 10) + (c.value ? parseInt(l.value, 10) : 0)
    };
    r.push({
      id: s,
      layer: u
    }), i = u;
  }
  return r;
};
function Gy(e) {
  const t = Re(gi, null), n = y(() => t ? t.rootZIndex.value - 100 : Mu), o = se([]), i = ct(/* @__PURE__ */ new Map()), r = ct(/* @__PURE__ */ new Map()), s = ct(/* @__PURE__ */ new Map()), a = ct(/* @__PURE__ */ new Map()), l = ct(/* @__PURE__ */ new Map()), {
    resizeRef: c,
    contentRect: u
  } = df(), d = y(() => {
    const V = /* @__PURE__ */ new Map(), L = e.overlaps ?? [];
    for (const x of L.filter((N) => N.includes(":"))) {
      const [N, $] = x.split(":");
      if (!o.value.includes(N) || !o.value.includes($)) continue;
      const E = i.get(N), w = i.get($), A = r.get(N), M = r.get($);
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
    const V = [...new Set([...s.values()].map((x) => x.value))].sort((x, N) => x - N), L = [];
    for (const x of V) {
      const N = o.value.filter(($) => {
        var E;
        return ((E = s.get($)) == null ? void 0 : E.value) === x;
      });
      L.push(...N);
    }
    return Ky(L, i, r, a);
  }), g = y(() => !Array.from(l.values()).some((V) => V.value)), h = y(() => m.value[m.value.length - 1].layer), v = y(() => ({
    "--v-layout-left": he(h.value.left),
    "--v-layout-right": he(h.value.right),
    "--v-layout-top": he(h.value.top),
    "--v-layout-bottom": he(h.value.bottom),
    ...g.value ? void 0 : {
      transition: "none"
    }
  })), b = y(() => m.value.slice(1).map((V, L) => {
    let {
      id: x
    } = V;
    const {
      layer: N
    } = m.value[L], $ = r.get(x), E = i.get(x);
    return {
      id: x,
      ...N,
      size: Number($.value),
      position: E.value
    };
  })), k = (V) => b.value.find((L) => L.id === V), O = Qe("createLayout"), P = ke(!1);
  un(() => {
    P.value = !0;
  }), Et(gi, {
    register: (V, L) => {
      let {
        id: x,
        order: N,
        position: $,
        layoutSize: E,
        elementSize: w,
        active: A,
        disableTransitions: M,
        absolute: ee
      } = L;
      s.set(x, N), i.set(x, $), r.set(x, E), a.set(x, A), M && l.set(x, M);
      const ne = Ao(ff, O == null ? void 0 : O.vnode).indexOf(V);
      ne > -1 ? o.value.splice(ne, 0, x) : o.value.push(x);
      const G = y(() => b.value.findIndex((ce) => ce.id === x)), Se = y(() => n.value + m.value.length * 2 - G.value * 2), xe = y(() => {
        const ce = $.value === "left" || $.value === "right", Te = $.value === "right", Je = $.value === "bottom", Ke = w.value ?? E.value, J = Ke === 0 ? "%" : "px", ye = {
          [$.value]: 0,
          zIndex: Se.value,
          transform: `translate${ce ? "X" : "Y"}(${(A.value ? 0 : -(Ke === 0 ? 100 : Ke)) * (Te || Je ? -1 : 1)}${J})`,
          position: ee.value || n.value !== Mu ? "absolute" : "fixed",
          ...g.value ? void 0 : {
            transition: "none"
          }
        };
        if (!P.value) return ye;
        const De = b.value[G.value];
        if (!De) throw new Error(`[Vuetify] Could not find layout item "${x}"`);
        const lt = d.value.get(x);
        return lt && (De[lt.position] += lt.amount), {
          ...ye,
          height: ce ? `calc(100% - ${De.top}px - ${De.bottom}px)` : w.value ? `${w.value}px` : void 0,
          left: Te ? void 0 : `${De.left}px`,
          right: Te ? `${De.right}px` : void 0,
          top: $.value !== "bottom" ? `${De.top}px` : void 0,
          bottom: $.value !== "top" ? `${De.bottom}px` : void 0,
          width: ce ? w.value ? `${w.value}px` : void 0 : `calc(100% - ${De.left}px - ${De.right}px)`
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
      s.delete(V), i.delete(V), r.delete(V), a.delete(V), l.delete(V), o.value = o.value.filter((L) => L !== V);
    },
    mainRect: h,
    mainStyles: v,
    getLayoutItem: k,
    items: b,
    layoutRect: u,
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
    items: b,
    layoutRect: u,
    layoutRef: c
  };
}
function gf() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const {
    blueprint: t,
    ...n
  } = e, o = Ot(t, n), {
    aliases: i = {},
    components: r = {},
    directives: s = {}
  } = o, a = Tp(o.defaults), l = Iy(o.display, o.ssr), c = Uy(o.theme), u = Hy(o.icons), d = Hp(o.locale), m = Ty(o.date, d), g = Fy(o.goTo, d);
  return {
    install: (v) => {
      for (const b in s)
        v.directive(b, s[b]);
      for (const b in r)
        v.component(b, r[b]);
      for (const b in i)
        v.component(b, Uo({
          ...i[b],
          name: b,
          aliasName: i[b].name
        }));
      if (c.install(v), v.provide(Ro, a), v.provide(Xs, l), v.provide(vi, c), v.provide(Js, u), v.provide(Sr, d), v.provide(Oy, m.options), v.provide(Vu, m.instance), v.provide($y, g), je && o.ssr)
        if (v.$nuxt)
          v.$nuxt.hook("app:suspense:resolve", () => {
            l.update();
          });
        else {
          const {
            mount: b
          } = v;
          v.mount = function() {
            const k = b(...arguments);
            return ft(() => l.update()), v.mount = b, k;
          };
        }
      Jt.reset(), v.mixin({
        computed: {
          $vuetify() {
            return ct({
              defaults: Vo.call(this, Ro),
              display: Vo.call(this, Xs),
              theme: Vo.call(this, vi),
              icons: Vo.call(this, Js),
              locale: Vo.call(this, Sr),
              date: Vo.call(this, Vu)
            });
          }
        }
      });
    },
    defaults: a,
    display: l,
    theme: c,
    icons: u,
    locale: d,
    date: m,
    goTo: g
  };
}
const Yy = "3.7.4";
gf.version = Yy;
function Vo(e) {
  var o, i;
  const t = this.$, n = ((o = t.parent) == null ? void 0 : o.provides) ?? ((i = t.vnode.appContext) == null ? void 0 : i.provides);
  if (n && e in n)
    return n[e];
}
const Ln = [
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
function vn(e) {
  const t = Ln.find((n) => n.id === e);
  return t || (console.error(`[themes] 未找到主题 id="${e}"，已回退到「${Ln[0].name}」`), Ln[0]);
}
const Xy = Object.fromEntries(
  Ln.map((e) => [e.id, { dark: e.mode === "night", colors: { background: e.bg, surface: e.surface } }])
), Jy = gf({
  theme: {
    defaultTheme: "white",
    themes: Xy
  }
});
function Zy(e) {
  e.use(Jy);
}
const Un = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [o, i] of t)
    n[o] = i;
  return n;
};
function Ra(e) {
  return Pa(() => {
    const t = [], n = {};
    if (e.value.background)
      if (Gs(e.value.background)) {
        if (n.backgroundColor = e.value.background, !e.value.text && wp(e.value.background)) {
          const o = rn(e.value.background);
          if (o.a == null || o.a === 1) {
            const i = Qd(o);
            n.color = i, n.caretColor = i;
          }
        }
      } else
        t.push(`bg-${e.value.background}`);
    return e.value.text && (Gs(e.value.text) ? (n.color = e.value.text, n.caretColor = e.value.text) : t.push(`text-${e.value.text}`)), {
      colorClasses: t,
      colorStyles: n
    };
  });
}
function ln(e, t) {
  const n = y(() => ({
    text: Be(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: o,
    colorStyles: i
  } = Ra(n);
  return {
    textColorClasses: o,
    textColorStyles: i
  };
}
function Rt(e, t) {
  const n = y(() => ({
    background: Be(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: o,
    colorStyles: i
  } = Ra(n);
  return {
    backgroundColorClasses: o,
    backgroundColorStyles: i
  };
}
const Qy = ["x-small", "small", "default", "large", "x-large"], qr = X({
  size: {
    type: [String, Number],
    default: "default"
  }
}, "size");
function Kr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn();
  return Pa(() => {
    let n, o;
    return pr(Qy, e.size) ? n = `${t}--size-${e.size}` : e.size && (o = {
      width: he(e.size),
      height: he(e.size)
    }), {
      sizeClasses: n,
      sizeStyles: o
    };
  });
}
const ot = X({
  tag: {
    type: String,
    default: "div"
  }
}, "tag"), eb = X({
  color: String,
  disabled: Boolean,
  start: Boolean,
  end: Boolean,
  icon: Xe,
  ...Ne(),
  ...qr(),
  ...ot({
    tag: "i"
  }),
  ...at()
}, "VIcon"), Ve = ve()({
  name: "VIcon",
  props: eb(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = se(), {
      themeClasses: r
    } = pt(e), {
      iconData: s
    } = jy(y(() => i.value || e.icon)), {
      sizeClasses: a
    } = Kr(e), {
      textColorClasses: l,
      textColorStyles: c
    } = ln(le(e, "color"));
    return Ee(() => {
      var m, g;
      const u = (m = o.default) == null ? void 0 : m.call(o);
      u && (i.value = (g = jd(u).filter((h) => h.type === ko && h.children && typeof h.children == "string")[0]) == null ? void 0 : g.children);
      const d = !!(n.onClick || n.onClickOnce);
      return f(s.value.component, {
        tag: e.tag,
        icon: s.value.icon,
        class: ["v-icon", "notranslate", r.value, a.value, l.value, {
          "v-icon--clickable": d,
          "v-icon--disabled": e.disabled,
          "v-icon--start": e.start,
          "v-icon--end": e.end
        }, e.class],
        style: [a.value ? void 0 : {
          fontSize: he(e.size),
          height: he(e.size),
          width: he(e.size)
        }, c.value, e.style],
        role: d ? "button" : void 0,
        "aria-hidden": !d,
        tabindex: d ? e.disabled ? -1 : 0 : void 0
      }, {
        default: () => [u]
      });
    }), {};
  }
}), tb = {
  name: "CommentItem",
  emits: ["open", "edit", "remove", "vote", "reply"],
  props: {
    record: { type: Object, required: !0 },
    // 列表中的主评论整条可点，进入评论详情页。
    clickable: { type: Boolean, default: !1 },
    // 「我的」与私密详情里显示类型和私密标签。
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
    editable: function() {
      return !this.readonly;
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
}, nb = ["data-comment", "data-mine"], ob = { class: "comment-meta" }, ib = { class: "comment-author" }, rb = {
  key: 0,
  class: "comment-tag"
}, sb = {
  key: 1,
  class: "comment-tag"
}, ab = {
  key: 2,
  class: "comment-tag"
}, lb = { class: "comment-time" }, ub = { class: "comment-content" }, cb = {
  key: 0,
  class: "comment-reply-to"
}, db = {
  key: 0,
  class: "comment-actions"
}, fb = ["aria-pressed", "aria-label"], mb = ["aria-pressed", "aria-label"], hb = {
  key: 1,
  class: "comment-actions"
};
function vb(e, t, n, o, i, r) {
  return Q(), de("article", {
    class: Lt(["comment-item", { "comment-item--link": n.clickable }]),
    "data-comment": n.record.id,
    "data-mine": String(!!n.record.is_mine),
    onClick: t[6] || (t[6] = (...s) => r.on_click && r.on_click(...s))
  }, [
    H("div", ob, [
      H("span", ib, be(n.record.author_name || "书友"), 1),
      n.tags && n.record.annotation_type === "highlight" ? (Q(), de("span", rb, "划线")) : qe("", !0),
      n.tags && n.record.annotation_type === "book_comment" ? (Q(), de("span", sb, "整书评论")) : qe("", !0),
      n.tags && r.is_private ? (Q(), de("span", ab, "私密")) : qe("", !0),
      H("time", lb, be(r.time_text), 1)
    ]),
    H("p", ub, [
      n.record.reply_to_name ? (Q(), de("span", cb, "回复 " + be(n.record.reply_to_name) + "：", 1)) : qe("", !0),
      te(be(n.record.content || n.record.quote_text) + " ", 1),
      n.record.is_mine && r.editable ? (Q(), de(fe, { key: 1 }, [
        n.record.annotation_type !== "highlight" ? (Q(), de("button", {
          key: 0,
          type: "button",
          class: "comment-inline",
          onClick: t[0] || (t[0] = so((s) => e.$emit("edit", n.record), ["stop"]))
        }, "修改")) : qe("", !0),
        H("button", {
          type: "button",
          class: "comment-inline",
          onClick: t[1] || (t[1] = so((s) => e.$emit("remove", n.record), ["stop"]))
        }, "删除")
      ], 64)) : qe("", !0)
    ]),
    r.interactive ? (Q(), de("div", db, [
      H("button", {
        type: "button",
        class: "comment-vote",
        "aria-pressed": String(n.record.user_vote === 1),
        "aria-label": `赞 ${n.record.like_count || 0}`,
        onClick: t[2] || (t[2] = so((s) => e.$emit("vote", n.record, 1), ["stop"]))
      }, [
        f(Ve, {
          size: "16",
          "aria-hidden": "true"
        }, {
          default: T(() => [
            te(be(n.record.user_vote === 1 ? "mdi-thumb-up" : "mdi-thumb-up-outline"), 1)
          ]),
          _: 1
        }),
        te(be(n.record.like_count || 0), 1)
      ], 8, fb),
      H("button", {
        type: "button",
        class: "comment-vote",
        "aria-pressed": String(n.record.user_vote === -1),
        "aria-label": `踩 ${n.record.dislike_count || 0}`,
        onClick: t[3] || (t[3] = so((s) => e.$emit("vote", n.record, -1), ["stop"]))
      }, [
        f(Ve, {
          size: "16",
          "aria-hidden": "true"
        }, {
          default: T(() => [
            te(be(n.record.user_vote === -1 ? "mdi-thumb-down" : "mdi-thumb-down-outline"), 1)
          ]),
          _: 1
        }),
        te(be(n.record.dislike_count || 0), 1)
      ], 8, mb),
      H("button", {
        type: "button",
        class: "comment-reply",
        onClick: t[4] || (t[4] = so((s) => e.$emit("reply", n.record), ["stop"]))
      }, be(r.reply_text), 1)
    ])) : r.private_replies ? (Q(), de("div", hb, [
      H("button", {
        type: "button",
        class: "comment-reply",
        onClick: t[5] || (t[5] = so((s) => e.$emit("reply", n.record), ["stop"]))
      }, be(n.record.reply_count) + " 条回复 · 仅你可见", 1)
    ])) : qe("", !0)
  ], 10, nb);
}
const Gr = /* @__PURE__ */ Un(tb, [["render", vb], ["__scopeId", "data-v-f95d3d1e"]]), Wn = X({
  border: [Boolean, Number, String]
}, "border");
function qn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn();
  return {
    borderClasses: y(() => {
      const o = Be(e) ? e.value : e.border, i = [];
      if (o === !0 || o === "")
        i.push(`${t}--border`);
      else if (typeof o == "string" || o === 0)
        for (const r of String(o).split(" "))
          i.push(`border-${r}`);
      return i;
    })
  };
}
const gb = [null, "default", "comfortable", "compact"], fn = X({
  density: {
    type: String,
    default: "default",
    validator: (e) => gb.includes(e)
  }
}, "density");
function Nn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn();
  return {
    densityClasses: y(() => `${t}--density-${e.density}`)
  };
}
const Kn = X({
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
function Gn(e) {
  return {
    elevationClasses: y(() => {
      const n = Be(e) ? e.value : e.elevation, o = [];
      return n == null || o.push(`elevation-${n}`), o;
    })
  };
}
const It = X({
  rounded: {
    type: [Boolean, Number, String],
    default: void 0
  },
  tile: Boolean
}, "rounded");
function Pt(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn();
  return {
    roundedClasses: y(() => {
      const o = Be(e) ? e.value : e.rounded, i = Be(e) ? e.value : e.tile, r = [];
      if (o === !0 || o === "")
        r.push(`${t}--rounded`);
      else if (typeof o == "string" || o === 0)
        for (const s of String(o).split(" "))
          r.push(`rounded-${s}`);
      else (i || o === !1) && r.push("rounded-0");
      return r;
    })
  };
}
const pb = ["elevated", "flat", "tonal", "outlined", "text", "plain"];
function Ti(e, t) {
  return f(fe, null, [e && f("span", {
    key: "overlay",
    class: `${t}__overlay`
  }, null), f("span", {
    key: "underlay",
    class: `${t}__underlay`
  }, null)]);
}
const Eo = X({
  color: String,
  variant: {
    type: String,
    default: "elevated",
    validator: (e) => pb.includes(e)
  }
}, "variant");
function Ai(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn();
  const n = y(() => {
    const {
      variant: r
    } = on(e);
    return `${t}--variant-${r}`;
  }), {
    colorClasses: o,
    colorStyles: i
  } = Ra(y(() => {
    const {
      variant: r,
      color: s
    } = on(e);
    return {
      [["elevated", "flat"].includes(r) ? "background" : "text"]: s
    };
  }));
  return {
    colorClasses: o,
    colorStyles: i,
    variantClasses: n
  };
}
const pf = X({
  baseColor: String,
  divided: Boolean,
  ...Wn(),
  ...Ne(),
  ...fn(),
  ...Kn(),
  ...It(),
  ...ot(),
  ...at(),
  ...Eo()
}, "VBtnGroup"), Cr = ve()({
  name: "VBtnGroup",
  props: pf(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = pt(e), {
      densityClasses: i
    } = Nn(e), {
      borderClasses: r
    } = qn(e), {
      elevationClasses: s
    } = Gn(e), {
      roundedClasses: a
    } = Pt(e);
    Co({
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
      }, o.value, r.value, i.value, s.value, a.value, e.class],
      style: e.style
    }, n));
  }
}), yf = X({
  modelValue: {
    type: null,
    default: void 0
  },
  multiple: Boolean,
  mandatory: [Boolean, String],
  max: Number,
  selectedClass: String,
  disabled: Boolean
}, "group"), yb = X({
  value: null,
  disabled: Boolean,
  selectedClass: String
}, "group-item");
function bb(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0;
  const o = Qe("useGroupItem");
  if (!o)
    throw new Error("[Vuetify] useGroupItem composable must be used inside a component setup function");
  const i = Jt();
  Et(Symbol.for(`${t.description}:id`), i);
  const r = Re(t, null);
  if (!r) {
    if (!n) return r;
    throw new Error(`[Vuetify] Could not find useGroup injection with symbol ${t.description}`);
  }
  const s = le(e, "value"), a = y(() => !!(r.disabled.value || e.disabled));
  r.register({
    id: i,
    value: s,
    disabled: a
  }, o), gt(() => {
    r.unregister(i);
  });
  const l = y(() => r.isSelected(i)), c = y(() => r.items.value[0].id === i), u = y(() => r.items.value[r.items.value.length - 1].id === i), d = y(() => l.value && [r.selectedClass.value, e.selectedClass]);
  return _e(l, (m) => {
    o.emit("group:selected", {
      value: m
    });
  }, {
    flush: "sync"
  }), {
    id: i,
    isSelected: l,
    isFirst: c,
    isLast: u,
    toggle: () => r.select(i, !l.value),
    select: (m) => r.select(i, m),
    selectedClass: d,
    value: s,
    disabled: a,
    group: r
  };
}
function bf(e, t) {
  let n = !1;
  const o = ct([]), i = nt(e, "modelValue", [], (m) => m == null ? [] : _f(o, sn(m)), (m) => {
    const g = wb(o, m);
    return e.multiple ? g : g[0];
  }), r = Qe("useGroup");
  function s(m, g) {
    const h = m, v = Symbol.for(`${t.description}:id`), k = Ao(v, r == null ? void 0 : r.vnode).indexOf(g);
    on(h.value) == null && (h.value = k, h.useIndexAsValue = !0), k > -1 ? o.splice(k, 0, h) : o.push(h);
  }
  function a(m) {
    if (n) return;
    l();
    const g = o.findIndex((h) => h.id === m);
    o.splice(g, 1);
  }
  function l() {
    const m = o.find((g) => !g.disabled);
    m && e.mandatory === "force" && !i.value.length && (i.value = [m.id]);
  }
  un(() => {
    l();
  }), gt(() => {
    n = !0;
  }), _a(() => {
    for (let m = 0; m < o.length; m++)
      o[m].useIndexAsValue && (o[m].value = m);
  });
  function c(m, g) {
    const h = o.find((v) => v.id === m);
    if (!(g && (h != null && h.disabled)))
      if (e.multiple) {
        const v = i.value.slice(), b = v.findIndex((O) => O === m), k = ~b;
        if (g = g ?? !k, k && e.mandatory && v.length <= 1 || !k && e.max != null && v.length + 1 > e.max) return;
        b < 0 && g ? v.push(m) : b >= 0 && !g && v.splice(b, 1), i.value = v;
      } else {
        const v = i.value.includes(m);
        if (e.mandatory && v) return;
        i.value = g ?? !v ? [m] : [];
      }
  }
  function u(m) {
    if (e.multiple && Fn('This method is not supported when using "multiple" prop'), i.value.length) {
      const g = i.value[0], h = o.findIndex((k) => k.id === g);
      let v = (h + m) % o.length, b = o[v];
      for (; b.disabled && v !== h; )
        v = (v + m) % o.length, b = o[v];
      if (b.disabled) return;
      i.value = [o[v].id];
    } else {
      const g = o.find((h) => !h.disabled);
      g && (i.value = [g.id]);
    }
  }
  const d = {
    register: s,
    unregister: a,
    selected: i,
    select: c,
    disabled: le(e, "disabled"),
    prev: () => u(o.length - 1),
    next: () => u(1),
    isSelected: (m) => i.value.includes(m),
    selectedClass: y(() => e.selectedClass),
    items: y(() => o),
    getItemIndex: (m) => _b(o, m)
  };
  return Et(t, d), d;
}
function _b(e, t) {
  const n = _f(e, [t]);
  return n.length ? e.findIndex((o) => o.id === n[0]) : -1;
}
function _f(e, t) {
  const n = [];
  return t.forEach((o) => {
    const i = e.find((s) => Oi(o, s.value)), r = e[o];
    (i == null ? void 0 : i.value) != null ? n.push(i.id) : r != null && n.push(r.id);
  }), n;
}
function wb(e, t) {
  const n = [];
  return t.forEach((o) => {
    const i = e.findIndex((r) => r.id === o);
    if (~i) {
      const r = e[i];
      n.push(r.value != null ? r.value : i);
    }
  }), n;
}
const Ha = Symbol.for("vuetify:v-btn-toggle"), Sb = X({
  ...pf(),
  ...yf()
}, "VBtnToggle");
ve()({
  name: "VBtnToggle",
  props: Sb(),
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
      prev: r,
      select: s,
      selected: a
    } = bf(e, Ha);
    return Ee(() => {
      const l = Cr.filterProps(e);
      return f(Cr, Oe({
        class: ["v-btn-toggle", e.class]
      }, l, {
        style: e.style
      }), {
        default: () => {
          var c;
          return [(c = n.default) == null ? void 0 : c.call(n, {
            isSelected: o,
            next: i,
            prev: r,
            select: s,
            selected: a
          })];
        }
      });
    }), {
      next: i,
      prev: r,
      select: s
    };
  }
});
const kb = X({
  defaults: Object,
  disabled: Boolean,
  reset: [Number, String],
  root: [Boolean, String],
  scoped: Boolean
}, "VDefaultsProvider"), mt = ve(!1)({
  name: "VDefaultsProvider",
  props: kb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      defaults: o,
      disabled: i,
      reset: r,
      root: s,
      scoped: a
    } = ha(e);
    return Co(o, {
      reset: r,
      root: s,
      scoped: a,
      disabled: i
    }), () => {
      var l;
      return (l = n.default) == null ? void 0 : l.call(n);
    };
  }
});
function wf(e, t) {
  const n = se(), o = ke(!1);
  if (Oa) {
    const i = new IntersectionObserver((r) => {
      o.value = !!r.find((s) => s.isIntersecting);
    }, t);
    gt(() => {
      i.disconnect();
    }), _e(n, (r, s) => {
      s && (i.unobserve(s), o.value = !1), r && i.observe(r);
    }, {
      flush: "post"
    });
  }
  return {
    intersectionRef: n,
    isIntersecting: o
  };
}
const Cb = X({
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
  ...qr(),
  ...ot({
    tag: "div"
  }),
  ...at()
}, "VProgressCircular"), Yr = ve()({
  name: "VProgressCircular",
  props: Cb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = 20, i = 2 * Math.PI * o, r = se(), {
      themeClasses: s
    } = pt(e), {
      sizeClasses: a,
      sizeStyles: l
    } = Kr(e), {
      textColorClasses: c,
      textColorStyles: u
    } = ln(le(e, "color")), {
      textColorClasses: d,
      textColorStyles: m
    } = ln(le(e, "bgColor")), {
      intersectionRef: g,
      isIntersecting: h
    } = wf(), {
      resizeRef: v,
      contentRect: b
    } = df(), k = y(() => Math.max(0, Math.min(100, parseFloat(e.modelValue)))), O = y(() => Number(e.width)), P = y(() => l.value ? Number(e.size) : b.value ? b.value.width : Math.max(O.value, 32)), B = y(() => o / (1 - O.value / P.value) * 2), C = y(() => O.value / P.value * B.value), V = y(() => he((100 - k.value) / 100 * i));
    return Xt(() => {
      g.value = r.value, v.value = r.value;
    }), Ee(() => f(e.tag, {
      ref: r,
      class: ["v-progress-circular", {
        "v-progress-circular--indeterminate": !!e.indeterminate,
        "v-progress-circular--visible": h.value,
        "v-progress-circular--disable-shrink": e.indeterminate === "disable-shrink"
      }, s.value, a.value, c.value, e.class],
      style: [l.value, u.value, e.style],
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
        class: ["v-progress-circular__underlay", d.value],
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
        "stroke-dashoffset": V.value
      }, null)]), n.default && f("div", {
        class: "v-progress-circular__content"
      }, [n.default({
        value: k.value
      })])]
    })), {};
  }
}), Yn = X({
  height: [Number, String],
  maxHeight: [Number, String],
  maxWidth: [Number, String],
  minHeight: [Number, String],
  minWidth: [Number, String],
  width: [Number, String]
}, "dimension");
function Xn(e) {
  return {
    dimensionStyles: y(() => {
      const n = {}, o = he(e.height), i = he(e.maxHeight), r = he(e.maxWidth), s = he(e.minHeight), a = he(e.minWidth), l = he(e.width);
      return o != null && (n.height = o), i != null && (n.maxHeight = i), r != null && (n.maxWidth = r), s != null && (n.minHeight = s), a != null && (n.minWidth = a), l != null && (n.width = l), n;
    })
  };
}
const Fu = {
  center: "center",
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
}, Xr = X({
  location: String
}, "location");
function ja(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, n = arguments.length > 2 ? arguments[2] : void 0;
  const {
    isRtl: o
  } = dn();
  return {
    locationStyles: y(() => {
      if (!e.location) return {};
      const {
        side: r,
        align: s
      } = Ks(e.location.split(" ").length > 1 ? e.location : `${e.location} center`, o.value);
      function a(c) {
        return n ? n(c) : 0;
      }
      const l = {};
      return r !== "center" && (t ? l[Fu[r]] = `calc(100% - ${a(r)}px)` : l[r] = 0), s !== "center" ? t ? l[Fu[s]] = `calc(100% - ${a(s)}px)` : l[s] = 0 : (r === "center" ? l.top = l.left = "50%" : l[{
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
const Eb = X({
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
  ...Xr({
    location: "top"
  }),
  ...It(),
  ...ot(),
  ...at()
}, "VProgressLinear"), Sf = ve()({
  name: "VProgressLinear",
  props: Eb(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    var E;
    let {
      slots: n
    } = t;
    const o = nt(e, "modelValue"), {
      isRtl: i,
      rtlClasses: r
    } = dn(), {
      themeClasses: s
    } = pt(e), {
      locationStyles: a
    } = ja(e), {
      textColorClasses: l,
      textColorStyles: c
    } = ln(e, "color"), {
      backgroundColorClasses: u,
      backgroundColorStyles: d
    } = Rt(y(() => e.bgColor || e.color)), {
      backgroundColorClasses: m,
      backgroundColorStyles: g
    } = Rt(y(() => e.bufferColor || e.bgColor || e.color)), {
      backgroundColorClasses: h,
      backgroundColorStyles: v
    } = Rt(e, "color"), {
      roundedClasses: b
    } = Pt(e), {
      intersectionRef: k,
      isIntersecting: O
    } = wf(), P = y(() => parseFloat(e.max)), B = y(() => parseFloat(e.height)), C = y(() => Sn(parseFloat(e.bufferValue) / P.value * 100, 0, 100)), V = y(() => Sn(parseFloat(o.value) / P.value * 100, 0, 100)), L = y(() => i.value !== e.reverse), x = y(() => e.indeterminate ? "fade-transition" : "slide-x-transition"), N = je && ((E = window.matchMedia) == null ? void 0 : E.call(window, "(forced-colors: active)").matches);
    function $(w) {
      if (!k.value) return;
      const {
        left: A,
        right: M,
        width: ee
      } = k.value.getBoundingClientRect(), ie = L.value ? ee - w.clientX + (M - ee) : w.clientX - A;
      o.value = Math.round(ie / ee * P.value);
    }
    return Ee(() => f(e.tag, {
      ref: k,
      class: ["v-progress-linear", {
        "v-progress-linear--absolute": e.absolute,
        "v-progress-linear--active": e.active && O.value,
        "v-progress-linear--reverse": L.value,
        "v-progress-linear--rounded": e.rounded,
        "v-progress-linear--rounded-bar": e.roundedBar,
        "v-progress-linear--striped": e.striped
      }, b.value, s.value, r.value, e.class],
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
          [L.value ? "left" : "right"]: he(-B.value),
          borderTop: `${he(B.value / 2)} dotted`,
          opacity: parseFloat(e.bufferOpacity),
          top: `calc(50% - ${he(B.value / 4)})`,
          width: he(100 - C.value, "%"),
          "--v-progress-linear-stream-to": he(B.value * (L.value ? 1 : -1))
        }
      }, null), f("div", {
        class: ["v-progress-linear__background", N ? void 0 : u.value],
        style: [d.value, {
          opacity: parseFloat(e.bgOpacity),
          width: e.stream ? 0 : void 0
        }]
      }, null), f("div", {
        class: ["v-progress-linear__buffer", N ? void 0 : m.value],
        style: [g.value, {
          opacity: parseFloat(e.bufferOpacity),
          width: he(C.value, "%")
        }]
      }, null), f(wo, {
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
}), za = X({
  loading: [Boolean, String]
}, "loader");
function Jr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn();
  return {
    loaderClasses: y(() => ({
      [`${t}--loading`]: e.loading
    }))
  };
}
function Ua(e, t) {
  var o;
  let {
    slots: n
  } = t;
  return f("div", {
    class: `${e.name}__loader`
  }, [((o = n.default) == null ? void 0 : o.call(n, {
    color: e.color,
    isActive: e.active
  })) || f(Sf, {
    absolute: e.absolute,
    active: e.active,
    color: e.color,
    height: "2",
    indeterminate: !0
  }, null)]);
}
const xb = ["static", "relative", "fixed", "absolute", "sticky"], Wa = X({
  position: {
    type: String,
    validator: (
      /* istanbul ignore next */
      (e) => xb.includes(e)
    )
  }
}, "position");
function qa(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn();
  return {
    positionClasses: y(() => e.position ? `${t}--${e.position}` : void 0)
  };
}
function Nb() {
  const e = Qe("useRoute");
  return y(() => {
    var t;
    return (t = e == null ? void 0 : e.proxy) == null ? void 0 : t.$route;
  });
}
function Vb() {
  var e, t;
  return (t = (e = Qe("useRouter")) == null ? void 0 : e.proxy) == null ? void 0 : t.$router;
}
function Ka(e, t) {
  var d, m;
  const n = sv("RouterLink"), o = y(() => !!(e.href || e.to)), i = y(() => (o == null ? void 0 : o.value) || uu(t, "click") || uu(e, "click"));
  if (typeof n == "string" || !("useLink" in n)) {
    const g = le(e, "href");
    return {
      isLink: o,
      isClickable: i,
      href: g,
      linkProps: ct({
        href: g
      })
    };
  }
  const r = y(() => ({
    ...e,
    to: le(() => e.to || "")
  })), s = n.useLink(r.value), a = y(() => e.to ? s : void 0), l = Nb(), c = y(() => {
    var g, h, v;
    return a.value ? e.exact ? l.value ? ((v = a.value.isExactActive) == null ? void 0 : v.value) && Oi(a.value.route.value.query, l.value.query) : ((h = a.value.isExactActive) == null ? void 0 : h.value) ?? !1 : ((g = a.value.isActive) == null ? void 0 : g.value) ?? !1 : !1;
  }), u = y(() => {
    var g;
    return e.to ? (g = a.value) == null ? void 0 : g.route.value.href : e.href;
  });
  return {
    isLink: o,
    isClickable: i,
    isActive: c,
    route: (d = a.value) == null ? void 0 : d.route,
    navigate: (m = a.value) == null ? void 0 : m.navigate,
    href: u,
    linkProps: ct({
      href: u,
      "aria-current": y(() => c.value ? "page" : void 0)
    })
  };
}
const Ga = X({
  href: String,
  replace: Boolean,
  to: [String, Object],
  exact: Boolean
}, "router");
let bs = !1;
function Ob(e, t) {
  let n = !1, o, i;
  je && (ft(() => {
    window.addEventListener("popstate", r), o = e == null ? void 0 : e.beforeEach((s, a, l) => {
      bs ? n ? t(l) : l() : setTimeout(() => n ? t(l) : l()), bs = !0;
    }), i = e == null ? void 0 : e.afterEach(() => {
      bs = !1;
    });
  }), Dt(() => {
    window.removeEventListener("popstate", r), o == null || o(), i == null || i();
  }));
  function r(s) {
    var a;
    (a = s.state) != null && a.replaced || (n = !0, setTimeout(() => n = !1));
  }
}
function Tb(e, t) {
  _e(() => {
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
const Zs = Symbol("rippleStop"), Ab = 80;
function Lu(e, t) {
  e.style.transform = t, e.style.webkitTransform = t;
}
function Qs(e) {
  return e.constructor.name === "TouchEvent";
}
function kf(e) {
  return e.constructor.name === "KeyboardEvent";
}
const Db = function(e, t) {
  var d;
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, o = 0, i = 0;
  if (!kf(e)) {
    const m = t.getBoundingClientRect(), g = Qs(e) ? e.touches[e.touches.length - 1] : e;
    o = g.clientX - m.left, i = g.clientY - m.top;
  }
  let r = 0, s = 0.3;
  (d = t._ripple) != null && d.circle ? (s = 0.15, r = t.clientWidth / 2, r = n.center ? r : r + Math.sqrt((o - r) ** 2 + (i - r) ** 2) / 4) : r = Math.sqrt(t.clientWidth ** 2 + t.clientHeight ** 2) / 2;
  const a = `${(t.clientWidth - r * 2) / 2}px`, l = `${(t.clientHeight - r * 2) / 2}px`, c = n.center ? a : `${o - r}px`, u = n.center ? l : `${i - r}px`;
  return {
    radius: r,
    scale: s,
    x: c,
    y: u,
    centerX: a,
    centerY: l
  };
}, Er = {
  /* eslint-disable max-statements */
  show(e, t) {
    var g;
    let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    if (!((g = t == null ? void 0 : t._ripple) != null && g.enabled))
      return;
    const o = document.createElement("span"), i = document.createElement("span");
    o.appendChild(i), o.className = "v-ripple__container", n.class && (o.className += ` ${n.class}`);
    const {
      radius: r,
      scale: s,
      x: a,
      y: l,
      centerX: c,
      centerY: u
    } = Db(e, t, n), d = `${r * 2}px`;
    i.className = "v-ripple__animation", i.style.width = d, i.style.height = d, t.appendChild(o);
    const m = window.getComputedStyle(t);
    m && m.position === "static" && (t.style.position = "relative", t.dataset.previousPosition = "static"), i.classList.add("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--visible"), Lu(i, `translate(${a}, ${l}) scale3d(${s},${s},${s})`), i.dataset.activated = String(performance.now()), setTimeout(() => {
      i.classList.remove("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--in"), Lu(i, `translate(${c}, ${u}) scale3d(1,1,1)`);
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
    const o = performance.now() - Number(n.dataset.activated), i = Math.max(250 - o, 0);
    setTimeout(() => {
      n.classList.remove("v-ripple__animation--in"), n.classList.add("v-ripple__animation--out"), setTimeout(() => {
        var a;
        e.getElementsByClassName("v-ripple__animation").length === 1 && e.dataset.previousPosition && (e.style.position = e.dataset.previousPosition, delete e.dataset.previousPosition), ((a = n.parentNode) == null ? void 0 : a.parentNode) === e && e.removeChild(n.parentNode);
      }, 300);
    }, i);
  }
};
function Cf(e) {
  return typeof e > "u" || !!e;
}
function pi(e) {
  const t = {}, n = e.currentTarget;
  if (!(!(n != null && n._ripple) || n._ripple.touched || e[Zs])) {
    if (e[Zs] = !0, Qs(e))
      n._ripple.touched = !0, n._ripple.isTouch = !0;
    else if (n._ripple.isTouch) return;
    if (t.center = n._ripple.centered || kf(e), n._ripple.class && (t.class = n._ripple.class), Qs(e)) {
      if (n._ripple.showTimerCommit) return;
      n._ripple.showTimerCommit = () => {
        Er.show(e, n, t);
      }, n._ripple.showTimer = window.setTimeout(() => {
        var o;
        (o = n == null ? void 0 : n._ripple) != null && o.showTimerCommit && (n._ripple.showTimerCommit(), n._ripple.showTimerCommit = null);
      }, Ab);
    } else
      Er.show(e, n, t);
  }
}
function Bu(e) {
  e[Zs] = !0;
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
    }), Er.hide(t);
  }
}
function Ef(e) {
  const t = e.currentTarget;
  t != null && t._ripple && (t._ripple.showTimerCommit && (t._ripple.showTimerCommit = null), window.clearTimeout(t._ripple.showTimer));
}
let yi = !1;
function xf(e) {
  !yi && (e.keyCode === iu.enter || e.keyCode === iu.space) && (yi = !0, pi(e));
}
function Nf(e) {
  yi = !1, Nt(e);
}
function Vf(e) {
  yi && (yi = !1, Nt(e));
}
function Of(e, t, n) {
  const {
    value: o,
    modifiers: i
  } = t, r = Cf(o);
  if (r || Er.hide(e), e._ripple = e._ripple ?? {}, e._ripple.enabled = r, e._ripple.centered = i.center, e._ripple.circle = i.circle, Xg(o) && o.class && (e._ripple.class = o.class), r && !n) {
    if (i.stop) {
      e.addEventListener("touchstart", Bu, {
        passive: !0
      }), e.addEventListener("mousedown", Bu);
      return;
    }
    e.addEventListener("touchstart", pi, {
      passive: !0
    }), e.addEventListener("touchend", Nt, {
      passive: !0
    }), e.addEventListener("touchmove", Ef, {
      passive: !0
    }), e.addEventListener("touchcancel", Nt), e.addEventListener("mousedown", pi), e.addEventListener("mouseup", Nt), e.addEventListener("mouseleave", Nt), e.addEventListener("keydown", xf), e.addEventListener("keyup", Nf), e.addEventListener("blur", Vf), e.addEventListener("dragstart", Nt, {
      passive: !0
    });
  } else !r && n && Tf(e);
}
function Tf(e) {
  e.removeEventListener("mousedown", pi), e.removeEventListener("touchstart", pi), e.removeEventListener("touchend", Nt), e.removeEventListener("touchmove", Ef), e.removeEventListener("touchcancel", Nt), e.removeEventListener("mouseup", Nt), e.removeEventListener("mouseleave", Nt), e.removeEventListener("keydown", xf), e.removeEventListener("keyup", Nf), e.removeEventListener("dragstart", Nt), e.removeEventListener("blur", Vf);
}
function Ib(e, t) {
  Of(e, t, !1);
}
function Pb(e) {
  delete e._ripple, Tf(e);
}
function $b(e, t) {
  if (t.value === t.oldValue)
    return;
  const n = Cf(t.oldValue);
  Of(e, t, n);
}
const Di = {
  mounted: Ib,
  unmounted: Pb,
  updated: $b
}, Mb = X({
  active: {
    type: Boolean,
    default: void 0
  },
  activeColor: String,
  baseColor: String,
  symbol: {
    type: null,
    default: Ha
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
  ...Wn(),
  ...Ne(),
  ...fn(),
  ...Yn(),
  ...Kn(),
  ...yb(),
  ...za(),
  ...Xr(),
  ...Wa(),
  ...It(),
  ...Ga(),
  ...qr(),
  ...ot({
    tag: "button"
  }),
  ...at(),
  ...Eo({
    variant: "elevated"
  })
}, "VBtn"), Ce = ve()({
  name: "VBtn",
  props: Mb(),
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
    } = pt(e), {
      borderClasses: r
    } = qn(e), {
      densityClasses: s
    } = Nn(e), {
      dimensionStyles: a
    } = Xn(e), {
      elevationClasses: l
    } = Gn(e), {
      loaderClasses: c
    } = Jr(e), {
      locationStyles: u
    } = ja(e), {
      positionClasses: d
    } = qa(e), {
      roundedClasses: m
    } = Pt(e), {
      sizeClasses: g,
      sizeStyles: h
    } = Kr(e), v = bb(e, e.symbol, !1), b = Ka(e, n), k = y(() => {
      var E;
      return e.active !== void 0 ? e.active : b.isLink.value ? (E = b.isActive) == null ? void 0 : E.value : v == null ? void 0 : v.isSelected.value;
    }), O = y(() => k.value ? e.activeColor ?? e.color : e.color), P = y(() => {
      var w, A;
      return {
        color: (v == null ? void 0 : v.isSelected.value) && (!b.isLink.value || ((w = b.isActive) == null ? void 0 : w.value)) || !v || ((A = b.isActive) == null ? void 0 : A.value) ? O.value ?? e.baseColor : e.baseColor,
        variant: e.variant
      };
    }), {
      colorClasses: B,
      colorStyles: C,
      variantClasses: V
    } = Ai(P), L = y(() => (v == null ? void 0 : v.disabled.value) || e.disabled), x = y(() => e.variant === "elevated" && !(e.disabled || e.flat || e.border)), N = y(() => {
      if (!(e.value === void 0 || typeof e.value == "symbol"))
        return Object(e.value) === e.value ? JSON.stringify(e.value, null, 0) : e.value;
    });
    function $(E) {
      var w;
      L.value || b.isLink.value && (E.metaKey || E.ctrlKey || E.shiftKey || E.button !== 0 || n.target === "_blank") || ((w = b.navigate) == null || w.call(b, E), v == null || v.toggle());
    }
    return Tb(b, v == null ? void 0 : v.select), Ee(() => {
      const E = b.isLink.value ? "a" : e.tag, w = !!(e.prependIcon || o.prepend), A = !!(e.appendIcon || o.append), M = !!(e.icon && e.icon !== !0);
      return vt(f(E, Oe({
        type: E === "a" ? void 0 : "button",
        class: ["v-btn", v == null ? void 0 : v.selectedClass.value, {
          "v-btn--active": k.value,
          "v-btn--block": e.block,
          "v-btn--disabled": L.value,
          "v-btn--elevated": x.value,
          "v-btn--flat": e.flat,
          "v-btn--icon": !!e.icon,
          "v-btn--loading": e.loading,
          "v-btn--readonly": e.readonly,
          "v-btn--slim": e.slim,
          "v-btn--stacked": e.stacked
        }, i.value, r.value, B.value, s.value, l.value, c.value, d.value, m.value, g.value, V.value, e.class],
        style: [C.value, a.value, u.value, h.value, e.style],
        "aria-busy": e.loading ? !0 : void 0,
        disabled: L.value || void 0,
        tabindex: e.loading || e.readonly ? -1 : void 0,
        onClick: $,
        value: N.value
      }, b.linkProps), {
        default: () => {
          var ee;
          return [Ti(!0, "v-btn"), !e.icon && w && f("span", {
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
          }, o.prepend) : f(Ve, {
            key: "prepend-icon",
            icon: e.prependIcon
          }, null)]), f("span", {
            class: "v-btn__content",
            "data-no-activator": ""
          }, [!o.default && M ? f(Ve, {
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
              var ie;
              return [((ie = o.default) == null ? void 0 : ie.call(o)) ?? e.text];
            }
          })]), !e.icon && A && f("span", {
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
          }, o.append) : f(Ve, {
            key: "append-icon",
            icon: e.appendIcon
          }, null)]), !!e.loading && f("span", {
            key: "loader",
            class: "v-btn__loader"
          }, [((ee = o.loader) == null ? void 0 : ee.call(o)) ?? f(Yr, {
            color: typeof e.loading == "boolean" ? void 0 : e.loading,
            indeterminate: !0,
            width: "2"
          }, null)])];
        }
      }), [[Di, !L.value && e.ripple, "", {
        center: !!e.icon
      }]]);
    }), {
      group: v
    };
  }
}), Fb = {
  name: "CommentList",
  components: { CommentItem: Gr },
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
}, Lb = ["aria-busy"], Bb = {
  key: 0,
  class: "comment-state"
}, Rb = {
  key: 1,
  class: "comment-state",
  role: "alert"
}, Hb = { class: "comment-state-hint" }, jb = {
  key: 2,
  class: "comment-state",
  role: "status"
}, zb = {
  key: 3,
  class: "comment-state"
}, Ub = {
  class: "comment-load-status",
  role: "status"
};
function Wb(e, t, n, o, i, r) {
  const s = Gr;
  return Q(), de("div", {
    ref: "scroller",
    class: "comment-list",
    "aria-busy": String(n.state.loading),
    onScrollPassive: t[7] || (t[7] = (...a) => r.maybe_load_more && r.maybe_load_more(...a))
  }, [
    n.state.need_login && !n.state.items.length ? (Q(), de("div", Bb, [
      f(Ve, { size: "30" }, {
        default: T(() => t[8] || (t[8] = [
          te("mdi-account-lock-outline")
        ])),
        _: 1
      }),
      t[10] || (t[10] = H("p", null, "登录后查看评论", -1)),
      f(Ce, {
        variant: "tonal",
        onClick: t[0] || (t[0] = (a) => e.$emit("login"))
      }, {
        default: T(() => t[9] || (t[9] = [
          te("去登录")
        ])),
        _: 1
      })
    ])) : n.state.error && !n.state.items.length ? (Q(), de("div", Rb, [
      f(Ve, { size: "30" }, {
        default: T(() => t[11] || (t[11] = [
          te("mdi-alert-circle-outline")
        ])),
        _: 1
      }),
      t[13] || (t[13] = H("p", null, "评论暂时没能加载", -1)),
      H("p", Hb, be(n.state.error), 1),
      f(Ce, {
        variant: "tonal",
        onClick: t[1] || (t[1] = (a) => e.$emit("retry"))
      }, {
        default: T(() => t[12] || (t[12] = [
          te("重新加载")
        ])),
        _: 1
      })
    ])) : n.state.loading && !n.state.items.length ? (Q(), de("div", jb, [
      f(Yr, {
        indeterminate: "",
        size: "28",
        color: "primary"
      }),
      t[14] || (t[14] = H("p", null, "正在加载评论…", -1))
    ])) : n.state.items.length ? (Q(), de(fe, { key: 4 }, [
      (Q(!0), de(fe, null, Tt(n.state.items, (a) => (Q(), Ye(s, {
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
      H("div", Ub, [
        n.state.error ? (Q(), de(fe, { key: 0 }, [
          t[16] || (t[16] = te("加载失败 ")),
          H("button", {
            type: "button",
            class: "comment-retry",
            onClick: t[6] || (t[6] = (a) => e.$emit("retry"))
          }, "重试")
        ], 64)) : n.state.loading ? (Q(), de(fe, { key: 1 }, [
          te("正在加载更多评论…")
        ], 64)) : n.state.has_more ? (Q(), de(fe, { key: 2 }, [
          te("继续下滑，加载更多评论")
        ], 64)) : (Q(), de(fe, { key: 3 }, [
          te("已显示全部评论")
        ], 64))
      ])
    ], 64)) : (Q(), de("div", zb, [
      f(Ve, { size: "30" }, {
        default: T(() => t[15] || (t[15] = [
          te("mdi-comment-text-outline")
        ])),
        _: 1
      }),
      H("p", null, be(n.empty), 1),
      av(e.$slots, "empty", {}, void 0)
    ]))
  ], 40, Lb);
}
const Af = /* @__PURE__ */ Un(Fb, [["render", Wb], ["__scopeId", "data-v-305808c0"]]), qb = "candle-reader:annotations:v1:", Kb = 20, _s = { id: "local", nickname: "我", avatar: "" }, Gb = ["load", "save"];
function Ru(e) {
  return e.client_id || e.id;
}
function Io() {
  var e;
  return (e = window.crypto) != null && e.randomUUID ? window.crypto.randomUUID() : `candle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function Yb(e) {
  const t = Array.isArray(e) ? e : e == null ? void 0 : e.annotations;
  if (!Array.isArray(t)) throw new Error("读取评论的回调必须返回数组或 { annotations }");
  return t;
}
function Hu(e) {
  const t = (e == null ? void 0 : e.annotation) || e;
  if (!t || typeof t != "object" || Array.isArray(t))
    throw new Error("写入评论的回调必须返回评论对象或 { annotation }");
  return t;
}
function ju(e) {
  const t = Array.isArray(e) ? e : e == null ? void 0 : e.items;
  if (!Array.isArray(t)) throw new Error("评论列表回调必须返回数组或 { items, next_cursor, has_more }");
  const n = Array.isArray(e) ? null : e.next_cursor ?? null;
  return { items: t, next_cursor: n, has_more: Array.isArray(e) ? !1 : !!(e.has_more ?? n) };
}
function Xb(e, t) {
  return `${qb}${encodeURIComponent(String(e || t || "unknown-book"))}`;
}
function zu(e, t, n) {
  const o = Number(t) || 0, i = Number(n) || Kb, r = o + i;
  return { items: e.slice(o, r), next_cursor: r < e.length ? String(r) : null, has_more: r < e.length };
}
function Jb({ bookId: e, bookUrl: t, storage: n } = {}) {
  const o = Xb(e, t);
  let i = n;
  if (i === void 0)
    try {
      i = window.localStorage;
    } catch {
      throw new Error("浏览器禁止访问本地存储，无法保存评论");
    }
  if (!i) throw new Error("浏览器不支持本地存储，无法保存评论");
  function r() {
    try {
      const c = JSON.parse(i.getItem(o) || "[]");
      return Array.isArray(c) ? c : [];
    } catch (c) {
      return console.warn("Candle Reader 本地评论损坏，已忽略：", c), [];
    }
  }
  function s(c) {
    i.setItem(o, JSON.stringify(c));
  }
  function a(c, u) {
    return {
      like_count: 0,
      dislike_count: 0,
      user_vote: 0,
      ...c,
      is_mine: !0,
      author_name: _s.nickname,
      reply_count: c.root_id ? 0 : u.filter((d) => d.root_id === c.id).length
    };
  }
  const l = (c, u) => String(u.created_at).localeCompare(String(c.created_at));
  return {
    async user() {
      return _s;
    },
    async load({ chapter: c } = {}) {
      const u = r().filter((d) => !d.root_id);
      return c ? u.filter((d) => d.chapter === c) : u;
    },
    async list({ scope: c = "chapter", chapter: u, paragraph_cfi: d, cursor: m, limit: g } = {}) {
      const h = r(), v = h.filter((k) => !k.root_id).filter((k) => c === "mine" ? !0 : k.is_private !== !1 ? !1 : c === "book" ? !0 : k.annotation_type === "book_comment" || k.chapter !== u ? !1 : c !== "paragraph" || k.cfi === d).sort(l), b = zu(v, m, g);
      return { ...b, items: b.items.map((k) => a(k, h)) };
    },
    async summary({ chapter: c } = {}) {
      const u = {};
      return r().forEach((d) => {
        d.root_id || d.is_private !== !1 || d.chapter !== c || d.annotation_type !== "note" || !d.cfi || (u[d.cfi] = (u[d.cfi] || 0) + 1);
      }), Object.entries(u).map(([d, m]) => ({ paragraph_cfi: d, count: m }));
    },
    async get({ id: c }) {
      const u = r(), d = u.find((m) => m.id === c);
      if (!d) throw new Error("这条评论已不存在");
      return a(d, u);
    },
    async replies({ root_id: c, cursor: u, limit: d } = {}) {
      const m = r(), g = m.filter((v) => v.root_id === c).sort((v, b) => l(b, v)), h = zu(g, u, d);
      return { ...h, items: h.items.map((v) => a(v, m)) };
    },
    async save(c) {
      const u = (/* @__PURE__ */ new Date()).toISOString(), d = r(), m = Ru(c) || Io(), g = d.findIndex((b) => Ru(b) === m), h = g >= 0 ? d[g] : null, v = {
        ...h,
        ...c,
        id: (h == null ? void 0 : h.id) || c.id || m,
        client_id: c.client_id || (h == null ? void 0 : h.client_id) || m,
        created_at: (h == null ? void 0 : h.created_at) || c.created_at || u,
        updated_at: u
      };
      if (v.root_id && !h) {
        const b = d.find((k) => k.id === v.reply_to_id && k.root_id === v.root_id);
        v.thread_id = b ? b.thread_id || b.id : null, v.reply_to_name = b ? _s.nickname : "";
      }
      return g >= 0 ? d.splice(g, 1, v) : d.push(v), s(d), a(v, d);
    },
    async remove({ id: c }) {
      return s(r().filter((u) => u.id !== c && u.root_id !== c && u.thread_id !== c)), { id: c };
    },
    async vote({ id: c, value: u }) {
      const d = r(), m = d.find((g) => g.id === c);
      if (!m) throw new Error("这条评论已不存在");
      return m.user_vote = u, m.like_count = u === 1 ? 1 : 0, m.dislike_count = u === -1 ? 1 : 0, s(d), { like_count: m.like_count, dislike_count: m.dislike_count, user_vote: u };
    }
  };
}
function Zb({ callbacks: e, bookId: t, bookUrl: n, storage: o } = {}) {
  const i = e != null;
  if (i && Gb.some((l) => typeof e[l] != "function"))
    throw new Error("annotation_callbacks 必须同时提供 load 和 save 函数");
  const r = i ? e : Jb({ bookId: t, bookUrl: n, storage: o }), s = { book_id: t || null, book_url: n || "" }, a = (l, c = {}) => {
    if (typeof r[l] != "function") throw new Error(`宿主未提供 ${l} 回调，无法完成该操作`);
    return r[l]({ ...s, ...c }, s);
  };
  return {
    source: i ? "callback" : "localStorage",
    async user() {
      return r.user && await a("user") || null;
    },
    async login() {
      r.login && await a("login");
    },
    async load(l = {}) {
      return Yb(await a("load", l));
    },
    async list(l = {}) {
      return ju(await a("list", l));
    },
    async summary(l = {}) {
      const c = await a("summary", l), u = Array.isArray(c) ? c : c == null ? void 0 : c.items;
      return Array.isArray(u) ? u : [];
    },
    async get(l) {
      return Hu(await a("get", l));
    },
    async replies(l = {}) {
      return ju(await a("replies", l));
    },
    async save(l) {
      return Hu(await r.save({ ...l }, s));
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
const xr = ve()({
  name: "VCardActions",
  props: Ne(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Co({
      VBtn: {
        slim: !0,
        variant: "text"
      }
    }), Ee(() => {
      var o;
      return f("div", {
        class: ["v-card-actions", e.class],
        style: e.style
      }, [(o = n.default) == null ? void 0 : o.call(n)]);
    }), {};
  }
}), Qb = X({
  opacity: [Number, String],
  ...Ne(),
  ...ot()
}, "VCardSubtitle"), e_ = ve()({
  name: "VCardSubtitle",
  props: Qb(),
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
}), Nr = La("v-card-title");
function t_(e) {
  return {
    aspectStyles: y(() => {
      const t = Number(e.aspectRatio);
      return t ? {
        paddingBottom: String(1 / t * 100) + "%"
      } : void 0;
    })
  };
}
const Df = X({
  aspectRatio: [String, Number],
  contentClass: null,
  inline: Boolean,
  ...Ne(),
  ...Yn()
}, "VResponsive"), Uu = ve()({
  name: "VResponsive",
  props: Df(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      aspectStyles: o
    } = t_(e), {
      dimensionStyles: i
    } = Xn(e);
    return Ee(() => {
      var r;
      return f("div", {
        class: ["v-responsive", {
          "v-responsive--inline": e.inline
        }, e.class],
        style: [i.value, e.style]
      }, [f("div", {
        class: "v-responsive__sizer",
        style: o.value
      }, null), (r = n.additional) == null ? void 0 : r.call(n), n.default && f("div", {
        class: ["v-responsive__content", e.contentClass]
      }, [n.default()])]);
    }), {};
  }
}), Zr = X({
  transition: {
    type: [Boolean, String, Object],
    default: "fade-transition",
    validator: (e) => e !== !0
  }
}, "transition"), $n = (e, t) => {
  let {
    slots: n
  } = t;
  const {
    transition: o,
    disabled: i,
    group: r,
    ...s
  } = e, {
    component: a = r ? Va : wo,
    ...l
  } = typeof o == "object" ? o : {};
  return jn(a, Oe(typeof o == "string" ? {
    name: i ? "" : o
  } : l, typeof o == "string" ? {} : Object.fromEntries(Object.entries({
    disabled: i,
    group: r
  }).filter((c) => {
    let [u, d] = c;
    return d !== void 0;
  })), s), n);
};
function n_(e, t) {
  if (!Oa) return;
  const n = t.modifiers || {}, o = t.value, {
    handler: i,
    options: r
  } = typeof o == "object" ? o : {
    handler: o,
    options: {}
  }, s = new IntersectionObserver(function() {
    var d;
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], l = arguments.length > 1 ? arguments[1] : void 0;
    const c = (d = e._observe) == null ? void 0 : d[t.instance.$.uid];
    if (!c) return;
    const u = a.some((m) => m.isIntersecting);
    i && (!n.quiet || c.init) && (!n.once || u || c.init) && i(u, a, l), u && n.once ? If(e, t) : c.init = !0;
  }, r);
  e._observe = Object(e._observe), e._observe[t.instance.$.uid] = {
    init: !1,
    observer: s
  }, s.observe(e);
}
function If(e, t) {
  var o;
  const n = (o = e._observe) == null ? void 0 : o[t.instance.$.uid];
  n && (n.observer.unobserve(e), delete e._observe[t.instance.$.uid]);
}
const Pf = {
  mounted: n_,
  unmounted: If
}, o_ = X({
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
  ...Df(),
  ...Ne(),
  ...It(),
  ...Zr()
}, "VImg"), Ya = ve()({
  name: "VImg",
  directives: {
    intersect: Pf
  },
  props: o_(),
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
      backgroundColorStyles: r
    } = Rt(le(e, "color")), {
      roundedClasses: s
    } = Pt(e), a = Qe("VImg"), l = ke(""), c = se(), u = ke(e.eager ? "loading" : "idle"), d = ke(), m = ke(), g = y(() => e.src && typeof e.src == "object" ? {
      src: e.src.src,
      srcset: e.srcset || e.src.srcset,
      lazySrc: e.lazySrc || e.src.lazySrc,
      aspect: Number(e.aspectRatio || e.src.aspect || 0)
    } : {
      src: e.src,
      srcset: e.srcset,
      lazySrc: e.lazySrc,
      aspect: Number(e.aspectRatio || 0)
    }), h = y(() => g.value.aspect || d.value / m.value || 0);
    _e(() => e.src, () => {
      v(u.value !== "idle");
    }), _e(h, (w, A) => {
      !w && A && c.value && B(c.value);
    }), ba(() => v());
    function v(w) {
      if (!(e.eager && w) && !(Oa && !w && !e.eager)) {
        if (u.value = "loading", g.value.lazySrc) {
          const A = new Image();
          A.src = g.value.lazySrc, B(A, null);
        }
        g.value.src && ft(() => {
          var A;
          n("loadstart", ((A = c.value) == null ? void 0 : A.currentSrc) || g.value.src), setTimeout(() => {
            var M;
            if (!a.isUnmounted)
              if ((M = c.value) != null && M.complete) {
                if (c.value.naturalWidth || k(), u.value === "error") return;
                h.value || B(c.value, null), u.value === "loading" && b();
              } else
                h.value || B(c.value), O();
          });
        });
      }
    }
    function b() {
      var w;
      a.isUnmounted || (O(), B(c.value), u.value = "loaded", n("load", ((w = c.value) == null ? void 0 : w.currentSrc) || g.value.src));
    }
    function k() {
      var w;
      a.isUnmounted || (u.value = "error", n("error", ((w = c.value) == null ? void 0 : w.currentSrc) || g.value.src));
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
          naturalWidth: ie
        } = w;
        ee || ie ? (d.value = ie, m.value = ee) : !w.complete && u.value === "loading" && A != null ? P = window.setTimeout(M, A) : (w.currentSrc.endsWith(".svg") || w.currentSrc.startsWith("data:image/svg+xml")) && (d.value = 1, m.value = 1);
      };
      M();
    }
    const C = y(() => ({
      "v-img__img--cover": e.cover,
      "v-img__img--contain": !e.cover
    })), V = () => {
      var M;
      if (!g.value.src || u.value === "idle") return null;
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
        onLoad: b,
        onError: k
      }, null), A = (M = o.sources) == null ? void 0 : M.call(o);
      return f($n, {
        transition: e.transition,
        appear: !0
      }, {
        default: () => [vt(A ? f("picture", {
          class: "v-img__picture"
        }, [A, w]) : w, [[zn, u.value === "loaded"]])]
      });
    }, L = () => f($n, {
      transition: e.transition
    }, {
      default: () => [g.value.lazySrc && u.value !== "loaded" && f("img", {
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
    }), x = () => o.placeholder ? f($n, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [(u.value === "loading" || u.value === "error" && !o.error) && f("div", {
        class: "v-img__placeholder"
      }, [o.placeholder()])]
    }) : null, N = () => o.error ? f($n, {
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
    }, null) : null, E = ke(!1);
    {
      const w = _e(h, (A) => {
        A && (requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            E.value = !0;
          });
        }), w());
      });
    }
    return Ee(() => {
      const w = Uu.filterProps(e);
      return vt(f(Uu, Oe({
        class: ["v-img", {
          "v-img--absolute": e.absolute,
          "v-img--booting": !E.value
        }, i.value, s.value, e.class],
        style: [{
          width: he(e.width === "auto" ? d.value : e.width)
        }, r.value, e.style]
      }, w, {
        aspectRatio: h.value,
        "aria-label": e.alt,
        role: e.alt ? "img" : void 0
      }), {
        additional: () => f(fe, null, [f(V, null, null), f(L, null, null), f($, null, null), f(x, null, null), f(N, null, null)]),
        default: o.default
      }), [[So("intersect"), {
        handler: v,
        options: e.options
      }, null, {
        once: !0
      }]]);
    }), {
      currentSrc: l,
      image: c,
      state: u,
      naturalWidth: d,
      naturalHeight: m
    };
  }
}), i_ = X({
  start: Boolean,
  end: Boolean,
  icon: Xe,
  image: String,
  text: String,
  ...Wn(),
  ...Ne(),
  ...fn(),
  ...It(),
  ...qr(),
  ...ot(),
  ...at(),
  ...Eo({
    variant: "flat"
  })
}, "VAvatar"), Vr = ve()({
  name: "VAvatar",
  props: i_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = pt(e), {
      borderClasses: i
    } = qn(e), {
      colorClasses: r,
      colorStyles: s,
      variantClasses: a
    } = Ai(e), {
      densityClasses: l
    } = Nn(e), {
      roundedClasses: c
    } = Pt(e), {
      sizeClasses: u,
      sizeStyles: d
    } = Kr(e);
    return Ee(() => f(e.tag, {
      class: ["v-avatar", {
        "v-avatar--start": e.start,
        "v-avatar--end": e.end
      }, o.value, i.value, r.value, l.value, c.value, u.value, a.value, e.class],
      style: [s.value, d.value, e.style]
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
      }) : e.image ? f(Ya, {
        key: "image",
        src: e.image,
        alt: "",
        cover: !0
      }, null) : e.icon ? f(Ve, {
        key: "icon",
        icon: e.icon
      }, null) : e.text, Ti(!1, "v-avatar")]
    })), {};
  }
}), r_ = X({
  appendAvatar: String,
  appendIcon: Xe,
  prependAvatar: String,
  prependIcon: Xe,
  subtitle: [String, Number],
  title: [String, Number],
  ...Ne(),
  ...fn()
}, "VCardItem"), s_ = ve()({
  name: "VCardItem",
  props: r_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => {
      var c;
      const o = !!(e.prependAvatar || e.prependIcon), i = !!(o || n.prepend), r = !!(e.appendAvatar || e.appendIcon), s = !!(r || n.append), a = !!(e.title != null || n.title), l = !!(e.subtitle != null || n.subtitle);
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
      }, n.prepend) : f(fe, null, [e.prependAvatar && f(Vr, {
        key: "prepend-avatar",
        density: e.density,
        image: e.prependAvatar
      }, null), e.prependIcon && f(Ve, {
        key: "prepend-icon",
        density: e.density,
        icon: e.prependIcon
      }, null)])]), f("div", {
        class: "v-card-item__content"
      }, [a && f(Nr, {
        key: "title"
      }, {
        default: () => {
          var u;
          return [((u = n.title) == null ? void 0 : u.call(n)) ?? e.title];
        }
      }), l && f(e_, {
        key: "subtitle"
      }, {
        default: () => {
          var u;
          return [((u = n.subtitle) == null ? void 0 : u.call(n)) ?? e.subtitle];
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
      }, null), e.appendAvatar && f(Vr, {
        key: "append-avatar",
        density: e.density,
        image: e.appendAvatar
      }, null)])])]);
    }), {};
  }
}), a_ = X({
  opacity: [Number, String],
  ...Ne(),
  ...ot()
}, "VCardText"), si = ve()({
  name: "VCardText",
  props: a_(),
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
}), l_ = X({
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
  ...Wn(),
  ...Ne(),
  ...fn(),
  ...Yn(),
  ...Kn(),
  ...za(),
  ...Xr(),
  ...Wa(),
  ...It(),
  ...Ga(),
  ...ot(),
  ...at(),
  ...Eo({
    variant: "elevated"
  })
}, "VCard"), ei = ve()({
  name: "VCard",
  directives: {
    Ripple: Di
  },
  props: l_(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      themeClasses: i
    } = pt(e), {
      borderClasses: r
    } = qn(e), {
      colorClasses: s,
      colorStyles: a,
      variantClasses: l
    } = Ai(e), {
      densityClasses: c
    } = Nn(e), {
      dimensionStyles: u
    } = Xn(e), {
      elevationClasses: d
    } = Gn(e), {
      loaderClasses: m
    } = Jr(e), {
      locationStyles: g
    } = ja(e), {
      positionClasses: h
    } = qa(e), {
      roundedClasses: v
    } = Pt(e), b = Ka(e, n), k = y(() => e.link !== !1 && b.isLink.value), O = y(() => !e.disabled && e.link !== !1 && (e.link || b.isClickable.value));
    return Ee(() => {
      const P = k.value ? "a" : e.tag, B = !!(o.title || e.title != null), C = !!(o.subtitle || e.subtitle != null), V = B || C, L = !!(o.append || e.appendAvatar || e.appendIcon), x = !!(o.prepend || e.prependAvatar || e.prependIcon), N = !!(o.image || e.image), $ = V || x || L, E = !!(o.text || e.text != null);
      return vt(f(P, Oe({
        class: ["v-card", {
          "v-card--disabled": e.disabled,
          "v-card--flat": e.flat,
          "v-card--hover": e.hover && !(e.disabled || e.flat),
          "v-card--link": O.value
        }, i.value, r.value, s.value, c.value, d.value, m.value, h.value, v.value, l.value, e.class],
        style: [a.value, u.value, g.value, e.style],
        onClick: O.value && b.navigate,
        tabindex: e.disabled ? -1 : void 0
      }, b.linkProps), {
        default: () => {
          var w;
          return [N && f("div", {
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
          }, o.image) : f(Ya, {
            key: "image-img",
            cover: !0,
            src: e.image
          }, null)]), f(Ua, {
            name: "v-card",
            active: !!e.loading,
            color: typeof e.loading == "boolean" ? void 0 : e.loading
          }, {
            default: o.loader
          }), $ && f(s_, {
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
          }), E && f(si, {
            key: "text"
          }, {
            default: () => {
              var A;
              return [((A = o.text) == null ? void 0 : A.call(o)) ?? e.text];
            }
          }), (w = o.default) == null ? void 0 : w.call(o), o.actions && f(xr, null, {
            default: o.actions
          }), Ti(O.value, "v-card")];
        }
      }), [[So("ripple"), O.value && e.ripple]]);
    }), {};
  }
}), u_ = X({
  disabled: Boolean,
  group: Boolean,
  hideOnLeave: Boolean,
  leaveAbsolute: Boolean,
  mode: String,
  origin: String
}, "transition");
function $t(e, t, n) {
  return ve()({
    name: e,
    props: u_({
      mode: n,
      origin: t
    }),
    setup(o, i) {
      let {
        slots: r
      } = i;
      const s = {
        onBeforeEnter(a) {
          o.origin && (a.style.transformOrigin = o.origin);
        },
        onLeave(a) {
          if (o.leaveAbsolute) {
            const {
              offsetTop: l,
              offsetLeft: c,
              offsetWidth: u,
              offsetHeight: d
            } = a;
            a._transitionInitialStyles = {
              position: a.style.position,
              top: a.style.top,
              left: a.style.left,
              width: a.style.width,
              height: a.style.height
            }, a.style.position = "absolute", a.style.top = `${l}px`, a.style.left = `${c}px`, a.style.width = `${u}px`, a.style.height = `${d}px`;
          }
          o.hideOnLeave && a.style.setProperty("display", "none", "important");
        },
        onAfterLeave(a) {
          if (o.leaveAbsolute && (a != null && a._transitionInitialStyles)) {
            const {
              position: l,
              top: c,
              left: u,
              width: d,
              height: m
            } = a._transitionInitialStyles;
            delete a._transitionInitialStyles, a.style.position = l || "", a.style.top = c || "", a.style.left = u || "", a.style.width = d || "", a.style.height = m || "";
          }
        }
      };
      return () => {
        const a = o.group ? Va : wo;
        return jn(a, {
          name: o.disabled ? "" : e,
          css: !o.disabled,
          ...o.group ? void 0 : {
            mode: o.mode
          },
          ...o.disabled ? {} : s
        }, r.default);
      };
    }
  });
}
function $f(e, t) {
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
        slots: r
      } = i;
      const s = o.group ? Va : wo;
      return () => jn(s, {
        name: o.disabled ? "" : e,
        css: !o.disabled,
        // mode: props.mode, // TODO: vuejs/vue-next#3104
        ...o.disabled ? {} : t
      }, r.default);
    }
  });
}
function Mf() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  const n = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1) ? "width" : "height", o = dt(`offset-${n}`);
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
      const l = `${s[o]}px`;
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
      }, s.style.overflow = "hidden", s.style[n] = `${s[o]}px`, s.offsetHeight, requestAnimationFrame(() => s.style[n] = "0");
    },
    onAfterLeave: i,
    onLeaveCancelled: i
  };
  function i(s) {
    e && s._parent && s._parent.classList.remove(e), r(s);
  }
  function r(s) {
    const a = s._initialStyle[n];
    s.style.overflow = s._initialStyle.overflow, a != null && (s.style[n] = a), delete s._initialStyle;
  }
}
const c_ = X({
  target: [Object, Array]
}, "v-dialog-transition"), d_ = ve()({
  name: "VDialogTransition",
  props: c_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = {
      onBeforeEnter(i) {
        i.style.pointerEvents = "none", i.style.visibility = "hidden";
      },
      async onEnter(i, r) {
        var m;
        await new Promise((g) => requestAnimationFrame(g)), await new Promise((g) => requestAnimationFrame(g)), i.style.visibility = "";
        const {
          x: s,
          y: a,
          sx: l,
          sy: c,
          speed: u
        } = qu(e.target, i), d = Do(i, [{
          transform: `translate(${s}px, ${a}px) scale(${l}, ${c})`,
          opacity: 0
        }, {}], {
          duration: 225 * u,
          easing: Ip
        });
        (m = Wu(i)) == null || m.forEach((g) => {
          Do(g, [{
            opacity: 0
          }, {
            opacity: 0,
            offset: 0.33
          }, {}], {
            duration: 225 * 2 * u,
            easing: _r
          });
        }), d.finished.then(() => r());
      },
      onAfterEnter(i) {
        i.style.removeProperty("pointer-events");
      },
      onBeforeLeave(i) {
        i.style.pointerEvents = "none";
      },
      async onLeave(i, r) {
        var m;
        await new Promise((g) => requestAnimationFrame(g));
        const {
          x: s,
          y: a,
          sx: l,
          sy: c,
          speed: u
        } = qu(e.target, i);
        Do(i, [{}, {
          transform: `translate(${s}px, ${a}px) scale(${l}, ${c})`,
          opacity: 0
        }], {
          duration: 125 * u,
          easing: Pp
        }).finished.then(() => r()), (m = Wu(i)) == null || m.forEach((g) => {
          Do(g, [{}, {
            opacity: 0,
            offset: 0.2
          }, {
            opacity: 0
          }], {
            duration: 125 * 2 * u,
            easing: _r
          });
        });
      },
      onAfterLeave(i) {
        i.style.removeProperty("pointer-events");
      }
    };
    return () => e.target ? f(wo, Oe({
      name: "dialog-transition"
    }, o, {
      css: !1
    }), n) : f(wo, {
      name: "dialog-transition"
    }, n);
  }
});
function Wu(e) {
  var n;
  const t = (n = e.querySelector(":scope > .v-card, :scope > .v-sheet, :scope > .v-list")) == null ? void 0 : n.children;
  return t && [...t];
}
function qu(e, t) {
  const n = Gd(e), o = $a(t), [i, r] = getComputedStyle(t).transformOrigin.split(" ").map((k) => parseFloat(k)), [s, a] = getComputedStyle(t).getPropertyValue("--v-overlay-anchor-origin").split(" ");
  let l = n.left + n.width / 2;
  s === "left" || a === "left" ? l -= n.width / 2 : (s === "right" || a === "right") && (l += n.width / 2);
  let c = n.top + n.height / 2;
  s === "top" || a === "top" ? c -= n.height / 2 : (s === "bottom" || a === "bottom") && (c += n.height / 2);
  const u = n.width / o.width, d = n.height / o.height, m = Math.max(1, u, d), g = u / m || 0, h = d / m || 0, v = o.width * o.height / (window.innerWidth * window.innerHeight), b = v > 0.12 ? Math.min(1.5, (v - 0.12) * 10 + 1) : 1;
  return {
    x: l - (i + o.left),
    y: c - (r + o.top),
    sx: g,
    sy: h,
    speed: b
  };
}
$t("fab-transition", "center center", "out-in");
$t("dialog-bottom-transition");
$t("dialog-top-transition");
$t("fade-transition");
const Ff = $t("scale-transition");
$t("scroll-x-transition");
$t("scroll-x-reverse-transition");
$t("scroll-y-transition");
$t("scroll-y-reverse-transition");
$t("slide-x-transition");
$t("slide-x-reverse-transition");
const Lf = $t("slide-y-transition");
$t("slide-y-reverse-transition");
const Bf = $f("expand-transition", Mf()), f_ = $f("expand-x-transition", Mf("", !0));
function ws(e, t) {
  return {
    x: e.x + t.x,
    y: e.y + t.y
  };
}
function m_(e, t) {
  return {
    x: e.x - t.x,
    y: e.y - t.y
  };
}
function Ku(e, t) {
  if (e.side === "top" || e.side === "bottom") {
    const {
      side: n,
      align: o
    } = e, i = o === "left" ? 0 : o === "center" ? t.width / 2 : o === "right" ? t.width : o, r = n === "top" ? 0 : n === "bottom" ? t.height : n;
    return ws({
      x: i,
      y: r
    }, t);
  } else if (e.side === "left" || e.side === "right") {
    const {
      side: n,
      align: o
    } = e, i = n === "left" ? 0 : n === "right" ? t.width : n, r = o === "top" ? 0 : o === "center" ? t.height / 2 : o === "bottom" ? t.height : o;
    return ws({
      x: i,
      y: r
    }, t);
  }
  return ws({
    x: t.width / 2,
    y: t.height / 2
  }, t);
}
const Rf = {
  static: g_,
  // specific viewport position, usually centered
  connected: y_
  // connected to a certain element
}, h_ = X({
  locationStrategy: {
    type: [String, Function],
    default: "static",
    validator: (e) => typeof e == "function" || e in Rf
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
function v_(e, t) {
  const n = se({}), o = se();
  je && Hn(() => !!(t.isActive.value && e.locationStrategy), (r) => {
    var s, a;
    _e(() => e.locationStrategy, r), Dt(() => {
      window.removeEventListener("resize", i), o.value = void 0;
    }), window.addEventListener("resize", i, {
      passive: !0
    }), typeof e.locationStrategy == "function" ? o.value = (s = e.locationStrategy(t, e, n)) == null ? void 0 : s.updateLocation : o.value = (a = Rf[e.locationStrategy](t, e, n)) == null ? void 0 : a.updateLocation;
  });
  function i(r) {
    var s;
    (s = o.value) == null || s.call(o, r);
  }
  return {
    contentStyles: n,
    updateLocation: o
  };
}
function g_() {
}
function p_(e, t) {
  const n = $a(e);
  return t ? n.x += parseFloat(e.style.right || 0) : n.x -= parseFloat(e.style.left || 0), n.y -= parseFloat(e.style.top || 0), n;
}
function y_(e, t, n) {
  (Array.isArray(e.target.value) || Fp(e.target.value)) && Object.assign(n.value, {
    position: "fixed",
    top: 0,
    [e.isRtl.value ? "right" : "left"]: 0
  });
  const {
    preferredAnchor: i,
    preferredOrigin: r
  } = Pa(() => {
    const h = Ks(t.location, e.isRtl.value), v = t.origin === "overlap" ? h : t.origin === "auto" ? gs(h) : Ks(t.origin, e.isRtl.value);
    return h.side === v.side && h.align === ps(v).align ? {
      preferredAnchor: du(h),
      preferredOrigin: du(v)
    } : {
      preferredAnchor: h,
      preferredOrigin: v
    };
  }), [s, a, l, c] = ["minWidth", "minHeight", "maxWidth", "maxHeight"].map((h) => y(() => {
    const v = parseFloat(t[h]);
    return isNaN(v) ? 1 / 0 : v;
  })), u = y(() => {
    if (Array.isArray(t.offset))
      return t.offset;
    if (typeof t.offset == "string") {
      const h = t.offset.split(" ").map(parseFloat);
      return h.length < 2 && h.push(0), h;
    }
    return typeof t.offset == "number" ? [t.offset, 0] : [0, 0];
  });
  let d = !1;
  const m = new ResizeObserver(() => {
    d && g();
  });
  _e([e.target, e.contentEl], (h, v) => {
    let [b, k] = h, [O, P] = v;
    O && !Array.isArray(O) && m.unobserve(O), b && !Array.isArray(b) && m.observe(b), P && m.unobserve(P), k && m.observe(k);
  }, {
    immediate: !0
  }), Dt(() => {
    m.disconnect();
  });
  function g() {
    if (d = !1, requestAnimationFrame(() => d = !0), !e.target.value || !e.contentEl.value) return;
    const h = Gd(e.target.value), v = p_(e.contentEl.value, e.isRtl.value), b = wr(e.contentEl.value), k = 12;
    b.length || (b.push(document.documentElement), e.contentEl.value.style.top && e.contentEl.value.style.left || (v.x -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-x") || 0), v.y -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-y") || 0)));
    const O = b.reduce((E, w) => {
      const A = w.getBoundingClientRect(), M = new po({
        x: w === document.documentElement ? 0 : A.x,
        y: w === document.documentElement ? 0 : A.y,
        width: w.clientWidth,
        height: w.clientHeight
      });
      return E ? new po({
        x: Math.max(E.left, M.left),
        y: Math.max(E.top, M.top),
        width: Math.min(E.right, M.right) - Math.max(E.left, M.left),
        height: Math.min(E.bottom, M.bottom) - Math.max(E.top, M.top)
      }) : M;
    }, void 0);
    O.x += k, O.y += k, O.width -= k * 2, O.height -= k * 2;
    let P = {
      anchor: i.value,
      origin: r.value
    };
    function B(E) {
      const w = new po(v), A = Ku(E.anchor, h), M = Ku(E.origin, w);
      let {
        x: ee,
        y: ie
      } = m_(A, M);
      switch (E.anchor.side) {
        case "top":
          ie -= u.value[0];
          break;
        case "bottom":
          ie += u.value[0];
          break;
        case "left":
          ee -= u.value[0];
          break;
        case "right":
          ee += u.value[0];
          break;
      }
      switch (E.anchor.align) {
        case "top":
          ie -= u.value[1];
          break;
        case "bottom":
          ie += u.value[1];
          break;
        case "left":
          ee -= u.value[1];
          break;
        case "right":
          ee += u.value[1];
          break;
      }
      return w.x += ee, w.y += ie, w.width = Math.min(w.width, l.value), w.height = Math.min(w.height, c.value), {
        overflows: mu(w, O),
        x: ee,
        y: ie
      };
    }
    let C = 0, V = 0;
    const L = {
      x: 0,
      y: 0
    }, x = {
      x: !1,
      y: !1
    };
    let N = -1;
    for (; ; ) {
      if (N++ > 10) {
        yr("Infinite loop detected in connectedLocationStrategy");
        break;
      }
      const {
        x: E,
        y: w,
        overflows: A
      } = B(P);
      C += E, V += w, v.x += E, v.y += w;
      {
        const M = fu(P.anchor), ee = A.x.before || A.x.after, ie = A.y.before || A.y.after;
        let ne = !1;
        if (["x", "y"].forEach((G) => {
          if (G === "x" && ee && !x.x || G === "y" && ie && !x.y) {
            const Se = {
              anchor: {
                ...P.anchor
              },
              origin: {
                ...P.origin
              }
            }, xe = G === "x" ? M === "y" ? ps : gs : M === "y" ? gs : ps;
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
        const M = mu(v, O);
        L.x = O.width - M.x.before - M.x.after, L.y = O.height - M.y.before - M.y.after, C += M.x.before, v.x += M.x.before, V += M.y.before, v.y += M.y.before;
      }
      break;
    }
    const $ = fu(P.anchor);
    return Object.assign(n.value, {
      "--v-overlay-anchor-origin": `${P.anchor.side} ${P.anchor.align}`,
      transformOrigin: `${P.origin.side} ${P.origin.align}`,
      // transform: `translate(${pixelRound(x)}px, ${pixelRound(y)}px)`,
      top: he(Ss(V)),
      left: e.isRtl.value ? void 0 : he(Ss(C)),
      right: e.isRtl.value ? he(Ss(-C)) : void 0,
      minWidth: he($ === "y" ? Math.min(s.value, h.width) : s.value),
      maxWidth: he(Gu(Sn(L.x, s.value === 1 / 0 ? 0 : s.value, l.value))),
      maxHeight: he(Gu(Sn(L.y, a.value === 1 / 0 ? 0 : a.value, c.value)))
    }), {
      available: L,
      contentBox: v
    };
  }
  return _e(() => [i.value, r.value, t.offset, t.minWidth, t.minHeight, t.maxWidth, t.maxHeight], () => g()), ft(() => {
    const h = g();
    if (!h) return;
    const {
      available: v,
      contentBox: b
    } = h;
    b.height > v.y && requestAnimationFrame(() => {
      g(), requestAnimationFrame(() => {
        g();
      });
    });
  }), {
    updateLocation: g
  };
}
function Ss(e) {
  return Math.round(e * devicePixelRatio) / devicePixelRatio;
}
function Gu(e) {
  return Math.ceil(e * devicePixelRatio) / devicePixelRatio;
}
let ea = !0;
const Or = [];
function b_(e) {
  !ea || Or.length ? (Or.push(e), ta()) : (ea = !1, e(), ta());
}
let Yu = -1;
function ta() {
  cancelAnimationFrame(Yu), Yu = requestAnimationFrame(() => {
    const e = Or.shift();
    e && e(), Or.length ? ta() : ea = !0;
  });
}
const Qi = {
  none: null,
  close: S_,
  block: k_,
  reposition: C_
}, __ = X({
  scrollStrategy: {
    type: [String, Function],
    default: "block",
    validator: (e) => typeof e == "function" || e in Qi
  }
}, "VOverlay-scroll-strategies");
function w_(e, t) {
  if (!je) return;
  let n;
  Xt(async () => {
    n == null || n.stop(), t.isActive.value && e.scrollStrategy && (n = ua(), await new Promise((o) => setTimeout(o)), n.active && n.run(() => {
      var o;
      typeof e.scrollStrategy == "function" ? e.scrollStrategy(t, e, n) : (o = Qi[e.scrollStrategy]) == null || o.call(Qi, t, e, n);
    }));
  }), Dt(() => {
    n == null || n.stop();
  });
}
function S_(e) {
  function t(n) {
    e.isActive.value = !1;
  }
  Hf(e.targetEl.value ?? e.contentEl.value, t);
}
function k_(e, t) {
  var s;
  const n = (s = e.root.value) == null ? void 0 : s.offsetParent, o = [.../* @__PURE__ */ new Set([...wr(e.targetEl.value, t.contained ? n : void 0), ...wr(e.contentEl.value, t.contained ? n : void 0)])].filter((a) => !a.classList.contains("v-overlay-scroll-blocked")), i = window.innerWidth - document.documentElement.offsetWidth, r = ((a) => Ba(a) && a)(n || document.documentElement);
  r && e.root.value.classList.add("v-overlay--scroll-blocked"), o.forEach((a, l) => {
    a.style.setProperty("--v-body-scroll-x", he(-a.scrollLeft)), a.style.setProperty("--v-body-scroll-y", he(-a.scrollTop)), a !== document.documentElement && a.style.setProperty("--v-scrollbar-offset", he(i)), a.classList.add("v-overlay-scroll-blocked");
  }), Dt(() => {
    o.forEach((a, l) => {
      const c = parseFloat(a.style.getPropertyValue("--v-body-scroll-x")), u = parseFloat(a.style.getPropertyValue("--v-body-scroll-y")), d = a.style.scrollBehavior;
      a.style.scrollBehavior = "auto", a.style.removeProperty("--v-body-scroll-x"), a.style.removeProperty("--v-body-scroll-y"), a.style.removeProperty("--v-scrollbar-offset"), a.classList.remove("v-overlay-scroll-blocked"), a.scrollLeft = -c, a.scrollTop = -u, a.style.scrollBehavior = d;
    }), r && e.root.value.classList.remove("v-overlay--scroll-blocked");
  });
}
function C_(e, t, n) {
  let o = !1, i = -1, r = -1;
  function s(a) {
    b_(() => {
      var u, d;
      const l = performance.now();
      (d = (u = e.updateLocation).value) == null || d.call(u, a), o = (performance.now() - l) / (1e3 / 60) > 2;
    });
  }
  r = (typeof requestIdleCallback > "u" ? (a) => a() : requestIdleCallback)(() => {
    n.run(() => {
      Hf(e.targetEl.value ?? e.contentEl.value, (a) => {
        o ? (cancelAnimationFrame(i), i = requestAnimationFrame(() => {
          i = requestAnimationFrame(() => {
            s(a);
          });
        })) : s(a);
      });
    });
  }), Dt(() => {
    typeof cancelIdleCallback < "u" && cancelIdleCallback(r), cancelAnimationFrame(i);
  });
}
function Hf(e, t) {
  const n = [document, ...wr(e)];
  n.forEach((o) => {
    o.addEventListener("scroll", t, {
      passive: !0
    });
  }), Dt(() => {
    n.forEach((o) => {
      o.removeEventListener("scroll", t);
    });
  });
}
const E_ = Symbol.for("vuetify:v-menu"), x_ = X({
  closeDelay: [Number, String],
  openDelay: [Number, String]
}, "delay");
function N_(e, t) {
  let n = () => {
  };
  function o(s) {
    n == null || n();
    const a = Number(s ? e.openDelay : e.closeDelay);
    return new Promise((l) => {
      n = op(a, () => {
        t == null || t(s), l(s);
      });
    });
  }
  function i() {
    return o(!0);
  }
  function r() {
    return o(!1);
  }
  return {
    clearDelay: n,
    runOpenDelay: i,
    runCloseDelay: r
  };
}
const V_ = X({
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
  ...x_()
}, "VOverlay-activator");
function O_(e, t) {
  let {
    isActive: n,
    isTop: o,
    contentEl: i
  } = t;
  const r = Qe("useActivator"), s = se();
  let a = !1, l = !1, c = !0;
  const u = y(() => e.openOnFocus || e.openOnFocus == null && e.openOnHover), d = y(() => e.openOnClick || e.openOnClick == null && !e.openOnHover && !u.value), {
    runOpenDelay: m,
    runCloseDelay: g
  } = N_(e, (x) => {
    x === (e.openOnHover && a || u.value && l) && !(e.openOnHover && n.value && !o.value) && (n.value !== x && (c = !0), n.value = x);
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
      qd(x.target, ":focus-visible") !== !1 && (l = !0, x.stopPropagation(), s.value = x.currentTarget || x.target, m());
    },
    onBlur: (x) => {
      l = !1, x.stopPropagation(), g();
    }
  }, b = y(() => {
    const x = {};
    return d.value && (x.onClick = v.onClick), e.openOnHover && (x.onMouseenter = v.onMouseenter, x.onMouseleave = v.onMouseleave), u.value && (x.onFocus = v.onFocus, x.onBlur = v.onBlur), x;
  }), k = y(() => {
    const x = {};
    if (e.openOnHover && (x.onMouseenter = () => {
      a = !0, m();
    }, x.onMouseleave = () => {
      a = !1, g();
    }), u.value && (x.onFocusin = () => {
      l = !0, m();
    }, x.onFocusout = () => {
      l = !1, g();
    }), e.closeOnContentClick) {
      const N = Re(E_, null);
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
  _e(o, (x) => {
    var N;
    x && (e.openOnHover && !a && (!u.value || !l) || u.value && !l && (!e.openOnHover || !a)) && !((N = i.value) != null && N.contains(document.activeElement)) && (n.value = !1);
  }), _e(n, (x) => {
    x || setTimeout(() => {
      h.value = void 0;
    });
  }, {
    flush: "post"
  });
  const P = qs();
  Xt(() => {
    P.value && ft(() => {
      s.value = P.el;
    });
  });
  const B = qs(), C = y(() => e.target === "cursor" && h.value ? h.value : B.value ? B.el : jf(e.target, r) || s.value), V = y(() => Array.isArray(C.value) ? void 0 : C.value);
  let L;
  return _e(() => !!e.activator, (x) => {
    x && je ? (L = ua(), L.run(() => {
      T_(e, r, {
        activatorEl: s,
        activatorEvents: b
      });
    })) : L && L.stop();
  }, {
    flush: "post",
    immediate: !0
  }), Dt(() => {
    L == null || L.stop();
  }), {
    activatorEl: s,
    activatorRef: P,
    target: C,
    targetEl: V,
    targetRef: B,
    activatorEvents: b,
    contentEvents: k,
    scrimEvents: O
  };
}
function T_(e, t, n) {
  let {
    activatorEl: o,
    activatorEvents: i
  } = n;
  _e(() => e.activator, (l, c) => {
    if (c && l !== c) {
      const u = a(c);
      u && s(u);
    }
    l && ft(() => r());
  }, {
    immediate: !0
  }), _e(() => e.activatorProps, () => {
    r();
  }), Dt(() => {
    s();
  });
  function r() {
    let l = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : a(), c = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    l && rp(l, Oe(i.value, c));
  }
  function s() {
    let l = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : a(), c = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    l && sp(l, Oe(i.value, c));
  }
  function a() {
    let l = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : e.activator;
    const c = jf(l, t);
    return o.value = (c == null ? void 0 : c.nodeType) === Node.ELEMENT_NODE ? c : void 0, o.value;
  }
}
function jf(e, t) {
  var o, i;
  if (!e) return;
  let n;
  if (e === "parent") {
    let r = (i = (o = t == null ? void 0 : t.proxy) == null ? void 0 : o.$el) == null ? void 0 : i.parentNode;
    for (; r != null && r.hasAttribute("data-no-activator"); )
      r = r.parentNode;
    n = r;
  } else typeof e == "string" ? n = document.querySelector(e) : "$el" in e ? n = e.$el : n = e;
  return n;
}
function A_() {
  if (!je) return ke(!1);
  const {
    ssr: e
  } = Py();
  if (e) {
    const t = ke(!1);
    return un(() => {
      t.value = !0;
    }), t;
  } else
    return ke(!0);
}
const D_ = X({
  eager: Boolean
}, "lazy");
function I_(e, t) {
  const n = ke(!1), o = y(() => n.value || e.eager || t.value);
  _e(t, () => n.value = !0);
  function i() {
    e.eager || (n.value = !1);
  }
  return {
    isBooted: n,
    hasContent: o,
    onAfterLeave: i
  };
}
function Xa() {
  const t = Qe("useScopeId").vnode.scopeId;
  return {
    scopeId: t ? {
      [t]: ""
    } : void 0
  };
}
const Xu = Symbol.for("vuetify:stack"), Jo = ct([]);
function P_(e, t, n) {
  const o = Qe("useStack"), i = !n, r = Re(Xu, void 0), s = ct({
    activeChildren: /* @__PURE__ */ new Set()
  });
  Et(Xu, s);
  const a = ke(+t.value);
  Hn(e, () => {
    var d;
    const u = (d = Jo.at(-1)) == null ? void 0 : d[1];
    a.value = u ? u + 10 : +t.value, i && Jo.push([o.uid, a.value]), r == null || r.activeChildren.add(o.uid), Dt(() => {
      if (i) {
        const m = ae(Jo).findIndex((g) => g[0] === o.uid);
        Jo.splice(m, 1);
      }
      r == null || r.activeChildren.delete(o.uid);
    });
  });
  const l = ke(!0);
  i && Xt(() => {
    var d;
    const u = ((d = Jo.at(-1)) == null ? void 0 : d[0]) === o.uid;
    setTimeout(() => l.value = u);
  });
  const c = y(() => !s.activeChildren.size);
  return {
    globalTop: Ci(l),
    localTop: c,
    stackStyles: y(() => ({
      zIndex: a.value
    }))
  };
}
function $_(e) {
  return {
    teleportTarget: y(() => {
      const n = e();
      if (n === !0 || !je) return;
      const o = n === !1 ? document.body : typeof n == "string" ? document.querySelector(n) : n;
      if (o == null) {
        Ct(`Unable to locate target ${n}`);
        return;
      }
      let i = [...o.children].find((r) => r.matches(".v-overlay-container"));
      return i || (i = document.createElement("div"), i.className = "v-overlay-container", o.appendChild(i)), i;
    })
  };
}
function M_() {
  return !0;
}
function zf(e, t, n) {
  if (!e || Uf(e, n) === !1) return !1;
  const o = tf(t);
  if (typeof ShadowRoot < "u" && o instanceof ShadowRoot && o.host === e.target) return !1;
  const i = (typeof n.value == "object" && n.value.include || (() => []))();
  return i.push(t), !i.some((r) => r == null ? void 0 : r.contains(e.target));
}
function Uf(e, t) {
  return (typeof t.value == "object" && t.value.closeConditional || M_)(e);
}
function F_(e, t, n) {
  const o = typeof n.value == "function" ? n.value : n.value.handler;
  e.shadowTarget = e.target, t._clickOutside.lastMousedownWasOutside && zf(e, t, n) && setTimeout(() => {
    Uf(e, n) && o && o(e);
  }, 0);
}
function Ju(e, t) {
  const n = tf(e);
  t(document), typeof ShadowRoot < "u" && n instanceof ShadowRoot && t(n);
}
const L_ = {
  // [data-app] may not be found
  // if using bind, inserted makes
  // sure that the root element is
  // available, iOS does not support
  // clicks on body
  mounted(e, t) {
    const n = (i) => F_(i, e, t), o = (i) => {
      e._clickOutside.lastMousedownWasOutside = zf(i, e, t);
    };
    Ju(e, (i) => {
      i.addEventListener("click", n, !0), i.addEventListener("mousedown", o, !0);
    }), e._clickOutside || (e._clickOutside = {
      lastMousedownWasOutside: !1
    }), e._clickOutside[t.instance.$.uid] = {
      onClick: n,
      onMousedown: o
    };
  },
  beforeUnmount(e, t) {
    e._clickOutside && (Ju(e, (n) => {
      var r;
      if (!n || !((r = e._clickOutside) != null && r[t.instance.$.uid])) return;
      const {
        onClick: o,
        onMousedown: i
      } = e._clickOutside[t.instance.$.uid];
      n.removeEventListener("click", o, !0), n.removeEventListener("mousedown", i, !0);
    }), delete e._clickOutside[t.instance.$.uid]);
  }
};
function B_(e) {
  const {
    modelValue: t,
    color: n,
    ...o
  } = e;
  return f(wo, {
    name: "fade-transition",
    appear: !0
  }, {
    default: () => [e.modelValue && f("div", Oe({
      class: ["v-overlay__scrim", e.color.backgroundColorClasses.value],
      style: e.color.backgroundColorStyles.value
    }, o), null)]
  });
}
const Ja = X({
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
  ...V_(),
  ...Ne(),
  ...Yn(),
  ...D_(),
  ...h_(),
  ...__(),
  ...at(),
  ...Zr()
}, "VOverlay"), bi = ve()({
  name: "VOverlay",
  directives: {
    ClickOutside: L_
  },
  inheritAttrs: !1,
  props: {
    _disableGlobalStack: Boolean,
    ...Ja()
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
    const r = Qe("VOverlay"), s = se(), a = se(), l = se(), c = nt(e, "modelValue"), u = y({
      get: () => c.value,
      set: (J) => {
        J && e.disabled || (c.value = J);
      }
    }), {
      themeClasses: d
    } = pt(e), {
      rtlClasses: m,
      isRtl: g
    } = dn(), {
      hasContent: h,
      onAfterLeave: v
    } = I_(e, u), b = Rt(y(() => typeof e.scrim == "string" ? e.scrim : null)), {
      globalTop: k,
      localTop: O,
      stackStyles: P
    } = P_(u, le(e, "zIndex"), e._disableGlobalStack), {
      activatorEl: B,
      activatorRef: C,
      target: V,
      targetEl: L,
      targetRef: x,
      activatorEvents: N,
      contentEvents: $,
      scrimEvents: E
    } = O_(e, {
      isActive: u,
      isTop: O,
      contentEl: l
    }), {
      teleportTarget: w
    } = $_(() => {
      var De, lt, Ue;
      const J = e.attach || e.contained;
      if (J) return J;
      const ye = ((De = B == null ? void 0 : B.value) == null ? void 0 : De.getRootNode()) || ((Ue = (lt = r.proxy) == null ? void 0 : lt.$el) == null ? void 0 : Ue.getRootNode());
      return ye instanceof ShadowRoot ? ye : !1;
    }), {
      dimensionStyles: A
    } = Xn(e), M = A_(), {
      scopeId: ee
    } = Xa();
    _e(() => e.disabled, (J) => {
      J && (u.value = !1);
    });
    const {
      contentStyles: ie,
      updateLocation: ne
    } = v_(e, {
      isRtl: g,
      contentEl: l,
      target: V,
      isActive: u
    });
    w_(e, {
      root: s,
      contentEl: l,
      targetEl: L,
      isActive: u,
      updateLocation: ne
    });
    function G(J) {
      i("click:outside", J), e.persistent ? Te() : u.value = !1;
    }
    function Se(J) {
      return u.value && k.value && // If using scrim, only close if clicking on it rather than anything opened on top
      (!e.scrim || J.target === a.value || J instanceof MouseEvent && J.shadowTarget === a.value);
    }
    je && _e(u, (J) => {
      J ? window.addEventListener("keydown", xe) : window.removeEventListener("keydown", xe);
    }, {
      immediate: !0
    }), gt(() => {
      je && window.removeEventListener("keydown", xe);
    });
    function xe(J) {
      var ye, De;
      J.key === "Escape" && k.value && (e.persistent ? Te() : (u.value = !1, (ye = l.value) != null && ye.contains(document.activeElement) && ((De = B.value) == null || De.focus())));
    }
    const we = Vb();
    Hn(() => e.closeOnBack, () => {
      Ob(we, (J) => {
        k.value && u.value ? (J(!1), e.persistent ? Te() : u.value = !1) : J();
      });
    });
    const ce = se();
    _e(() => u.value && (e.absolute || e.contained) && w.value == null, (J) => {
      if (J) {
        const ye = $p(s.value);
        ye && ye !== document.scrollingElement && (ce.value = ye.scrollTop);
      }
    });
    function Te() {
      e.noClickAnimation || l.value && Do(l.value, [{
        transformOrigin: "center"
      }, {
        transform: "scale(1.03)"
      }, {
        transformOrigin: "center"
      }], {
        duration: 150,
        easing: _r
      });
    }
    function Je() {
      i("afterEnter");
    }
    function Ke() {
      v(), i("afterLeave");
    }
    return Ee(() => {
      var J;
      return f(fe, null, [(J = n.activator) == null ? void 0 : J.call(n, {
        isActive: u.value,
        targetRef: x,
        props: Oe({
          ref: C
        }, N.value, e.activatorProps)
      }), M.value && h.value && f(Kh, {
        disabled: !w.value,
        to: w.value
      }, {
        default: () => [f("div", Oe({
          class: ["v-overlay", {
            "v-overlay--absolute": e.absolute || e.contained,
            "v-overlay--active": u.value,
            "v-overlay--contained": e.contained
          }, d.value, m.value, e.class],
          style: [P.value, {
            "--v-overlay-opacity": e.opacity,
            top: he(ce.value)
          }, e.style],
          ref: s
        }, ee, o), [f(B_, Oe({
          color: b,
          modelValue: u.value && !!e.scrim,
          ref: a
        }, E.value), null), f($n, {
          appear: !0,
          persisted: !0,
          transition: e.transition,
          target: V.value,
          onAfterEnter: Je,
          onAfterLeave: Ke
        }, {
          default: () => {
            var ye;
            return [vt(f("div", Oe({
              ref: l,
              class: ["v-overlay__content", e.contentClass],
              style: [A.value, ie.value]
            }, $.value, e.contentProps), [(ye = n.default) == null ? void 0 : ye.call(n, {
              isActive: u
            })]), [[zn, u.value], [So("click-outside"), {
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
}), ks = Symbol("Forwarded refs");
function Cs(e, t) {
  let n = e;
  for (; n; ) {
    const o = Reflect.getOwnPropertyDescriptor(n, t);
    if (o) return o;
    n = Object.getPrototypeOf(n);
  }
}
function Za(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), o = 1; o < t; o++)
    n[o - 1] = arguments[o];
  return e[ks] = n, new Proxy(e, {
    get(i, r) {
      if (Reflect.has(i, r))
        return Reflect.get(i, r);
      if (!(typeof r == "symbol" || r.startsWith("$") || r.startsWith("__"))) {
        for (const s of n)
          if (s.value && Reflect.has(s.value, r)) {
            const a = Reflect.get(s.value, r);
            return typeof a == "function" ? a.bind(s.value) : a;
          }
      }
    },
    has(i, r) {
      if (Reflect.has(i, r))
        return !0;
      if (typeof r == "symbol" || r.startsWith("$") || r.startsWith("__")) return !1;
      for (const s of n)
        if (s.value && Reflect.has(s.value, r))
          return !0;
      return !1;
    },
    set(i, r, s) {
      if (Reflect.has(i, r))
        return Reflect.set(i, r, s);
      if (typeof r == "symbol" || r.startsWith("$") || r.startsWith("__")) return !1;
      for (const a of n)
        if (a.value && Reflect.has(a.value, r))
          return Reflect.set(a.value, r, s);
      return !1;
    },
    getOwnPropertyDescriptor(i, r) {
      var a;
      const s = Reflect.getOwnPropertyDescriptor(i, r);
      if (s) return s;
      if (!(typeof r == "symbol" || r.startsWith("$") || r.startsWith("__"))) {
        for (const l of n) {
          if (!l.value) continue;
          const c = Cs(l.value, r) ?? ("_" in l.value ? Cs((a = l.value._) == null ? void 0 : a.setupState, r) : void 0);
          if (c) return c;
        }
        for (const l of n) {
          const c = l.value && l.value[ks];
          if (!c) continue;
          const u = c.slice();
          for (; u.length; ) {
            const d = u.shift(), m = Cs(d.value, r);
            if (m) return m;
            const g = d.value && d.value[ks];
            g && u.push(...g);
          }
        }
      }
    }
  });
}
const Wf = X({
  fullscreen: Boolean,
  retainFocus: {
    type: Boolean,
    default: !0
  },
  scrollable: Boolean,
  ...Ja({
    origin: "center center",
    scrollStrategy: "block",
    transition: {
      component: d_
    },
    zIndex: 2400
  })
}, "VDialog"), Bn = ve()({
  name: "VDialog",
  props: Wf(),
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
    const i = nt(e, "modelValue"), {
      scopeId: r
    } = Xa(), s = se();
    function a(u) {
      var g, h;
      const d = u.relatedTarget, m = u.target;
      if (d !== m && ((g = s.value) != null && g.contentEl) && // We're the topmost dialog
      ((h = s.value) != null && h.globalTop) && // It isn't the document or the dialog body
      ![document, s.value.contentEl].includes(m) && // It isn't inside the dialog body
      !s.value.contentEl.contains(m)) {
        const v = Ud(s.value.contentEl);
        if (!v.length) return;
        const b = v[0], k = v[v.length - 1];
        d === b ? k.focus() : b.focus();
      }
    }
    gt(() => {
      document.removeEventListener("focusin", a);
    }), je && _e(() => i.value && e.retainFocus, (u) => {
      u ? document.addEventListener("focusin", a) : document.removeEventListener("focusin", a);
    }, {
      immediate: !0
    });
    function l() {
      var u;
      n("afterEnter"), (u = s.value) != null && u.contentEl && !s.value.contentEl.contains(document.activeElement) && s.value.contentEl.focus({
        preventScroll: !0
      });
    }
    function c() {
      n("afterLeave");
    }
    return _e(i, async (u) => {
      var d;
      u || (await ft(), (d = s.value.activatorEl) == null || d.focus({
        preventScroll: !0
      }));
    }), Ee(() => {
      const u = bi.filterProps(e), d = Oe({
        "aria-haspopup": "dialog"
      }, e.activatorProps), m = Oe({
        tabindex: -1
      }, e.contentProps);
      return f(bi, Oe({
        ref: s,
        class: ["v-dialog", {
          "v-dialog--fullscreen": e.fullscreen,
          "v-dialog--scrollable": e.scrollable
        }, e.class],
        style: e.style
      }, u, {
        modelValue: i.value,
        "onUpdate:modelValue": (g) => i.value = g,
        "aria-modal": "true",
        activatorProps: d,
        contentProps: m,
        height: e.fullscreen ? void 0 : e.height,
        width: e.fullscreen ? void 0 : e.width,
        maxHeight: e.fullscreen ? void 0 : e.maxHeight,
        maxWidth: e.fullscreen ? void 0 : e.maxWidth,
        role: "dialog",
        onAfterEnter: l,
        onAfterLeave: c
      }, r), {
        activator: o.activator,
        default: function() {
          for (var g = arguments.length, h = new Array(g), v = 0; v < g; v++)
            h[v] = arguments[v];
          return f(mt, {
            root: "VDialog"
          }, {
            default: () => {
              var b;
              return [(b = o.default) == null ? void 0 : b.call(o, ...h)];
            }
          });
        }
      });
    }), Za({}, s);
  }
}), qf = Ur.reduce((e, t) => (e[t] = {
  type: [Boolean, String, Number],
  default: !1
}, e), {}), Kf = Ur.reduce((e, t) => {
  const n = "offset" + Ht(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), Gf = Ur.reduce((e, t) => {
  const n = "order" + Ht(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), Zu = {
  col: Object.keys(qf),
  offset: Object.keys(Kf),
  order: Object.keys(Gf)
};
function R_(e, t, n) {
  let o = e;
  if (!(n == null || n === !1)) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return e === "col" && (o = "v-" + o), e === "col" && (n === "" || n === !0) || (o += `-${n}`), o.toLowerCase();
  }
}
const H_ = ["auto", "start", "end", "center", "baseline", "stretch"], j_ = X({
  cols: {
    type: [Boolean, String, Number],
    default: !1
  },
  ...qf,
  offset: {
    type: [String, Number],
    default: null
  },
  ...Kf,
  order: {
    type: [String, Number],
    default: null
  },
  ...Gf,
  alignSelf: {
    type: String,
    default: null,
    validator: (e) => H_.includes(e)
  },
  ...Ne(),
  ...ot()
}, "VCol"), We = ve()({
  name: "VCol",
  props: j_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = y(() => {
      const i = [];
      let r;
      for (r in Zu)
        Zu[r].forEach((a) => {
          const l = e[a], c = R_(r, a, l);
          c && i.push(c);
        });
      const s = i.some((a) => a.startsWith("v-col-"));
      return i.push({
        // Default to .v-col if no other col-{bp}-* classes generated nor `cols` specified.
        "v-col": !s || !e.cols,
        [`v-col-${e.cols}`]: e.cols,
        [`offset-${e.offset}`]: e.offset,
        [`order-${e.order}`]: e.order,
        [`align-self-${e.alignSelf}`]: e.alignSelf
      }), i;
    });
    return () => {
      var i;
      return jn(e.tag, {
        class: [o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), Qa = ["start", "end", "center"], Yf = ["space-between", "space-around", "space-evenly"];
function el(e, t) {
  return Ur.reduce((n, o) => {
    const i = e + Ht(o);
    return n[i] = t(), n;
  }, {});
}
const z_ = [...Qa, "baseline", "stretch"], Xf = (e) => z_.includes(e), Jf = el("align", () => ({
  type: String,
  default: null,
  validator: Xf
})), U_ = [...Qa, ...Yf], Zf = (e) => U_.includes(e), Qf = el("justify", () => ({
  type: String,
  default: null,
  validator: Zf
})), W_ = [...Qa, ...Yf, "stretch"], em = (e) => W_.includes(e), tm = el("alignContent", () => ({
  type: String,
  default: null,
  validator: em
})), Qu = {
  align: Object.keys(Jf),
  justify: Object.keys(Qf),
  alignContent: Object.keys(tm)
}, q_ = {
  align: "align",
  justify: "justify",
  alignContent: "align-content"
};
function K_(e, t, n) {
  let o = q_[e];
  if (n != null) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return o += `-${n}`, o.toLowerCase();
  }
}
const G_ = X({
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
  ...Ne(),
  ...ot()
}, "VRow"), oo = ve()({
  name: "VRow",
  props: G_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = y(() => {
      const i = [];
      let r;
      for (r in Qu)
        Qu[r].forEach((s) => {
          const a = e[s], l = K_(r, s, a);
          l && i.push(l);
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
      return jn(e.tag, {
        class: ["v-row", o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), er = La("v-spacer", "div", "VSpacer"), Y_ = X({
  active: Boolean,
  disabled: Boolean,
  max: [Number, String],
  value: {
    type: [Number, String],
    default: 0
  },
  ...Ne(),
  ...Zr({
    transition: {
      component: Lf
    }
  })
}, "VCounter"), X_ = ve()({
  name: "VCounter",
  functional: !0,
  props: Y_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = y(() => e.max ? `${e.value} / ${e.max}` : String(e.value));
    return Ee(() => f($n, {
      transition: e.transition
    }, {
      default: () => [vt(f("div", {
        class: ["v-counter", {
          "text-error": e.max && !e.disabled && parseFloat(e.value) > parseFloat(e.max)
        }, e.class],
        style: e.style
      }, [n.default ? n.default({
        counter: o.value,
        max: e.max,
        value: e.value
      }) : o.value]), [[zn, e.active]])]
    })), {};
  }
}), J_ = X({
  text: String,
  onClick: Bt(),
  ...Ne(),
  ...at()
}, "VLabel"), tl = ve()({
  name: "VLabel",
  props: J_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => {
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
}), Z_ = X({
  floating: Boolean,
  ...Ne()
}, "VFieldLabel"), ji = ve()({
  name: "VFieldLabel",
  props: Z_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => f(tl, {
      class: ["v-field-label", {
        "v-field-label--floating": e.floating
      }, e.class],
      style: e.style,
      "aria-hidden": e.floating || void 0
    }, n)), {};
  }
});
function nm(e) {
  const {
    t
  } = jp();
  function n(o) {
    let {
      name: i
    } = o;
    const r = {
      prepend: "prependAction",
      prependInner: "prependAction",
      append: "appendAction",
      appendInner: "appendAction",
      clear: "clear"
    }[i], s = e[`onClick:${i}`], a = s && r ? t(`$vuetify.input.${r}`, e.label ?? "") : void 0;
    return f(Ve, {
      icon: e[`${i}Icon`],
      "aria-label": a,
      onClick: s
    }, null);
  }
  return {
    InputIcon: n
  };
}
const nl = X({
  focused: Boolean,
  "onUpdate:focused": Bt()
}, "focus");
function Qr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn();
  const n = nt(e, "focused"), o = y(() => ({
    [`${t}--focused`]: n.value
  }));
  function i() {
    n.value = !0;
  }
  function r() {
    n.value = !1;
  }
  return {
    focusClasses: o,
    isFocused: n,
    focus: i,
    blur: r
  };
}
const Q_ = ["underlined", "outlined", "filled", "solo", "solo-inverted", "solo-filled", "plain"], om = X({
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
    validator: (e) => Q_.includes(e)
  },
  "onClick:clear": Bt(),
  "onClick:appendInner": Bt(),
  "onClick:prependInner": Bt(),
  ...Ne(),
  ...za(),
  ...It(),
  ...at()
}, "VField"), im = ve()({
  name: "VField",
  inheritAttrs: !1,
  props: {
    id: String,
    ...nl(),
    ...om()
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
      themeClasses: r
    } = pt(e), {
      loaderClasses: s
    } = Jr(e), {
      focusClasses: a,
      isFocused: l,
      focus: c,
      blur: u
    } = Qr(e), {
      InputIcon: d
    } = nm(e), {
      roundedClasses: m
    } = Pt(e), {
      rtlClasses: g
    } = dn(), h = y(() => e.dirty || e.active), v = y(() => !e.singleLine && !!(e.label || i.label)), b = Jt(), k = y(() => e.id || `input-${b}`), O = y(() => `${k.value}-messages`), P = se(), B = se(), C = se(), V = y(() => ["plain", "underlined"].includes(e.variant)), {
      backgroundColorClasses: L,
      backgroundColorStyles: x
    } = Rt(le(e, "bgColor")), {
      textColorClasses: N,
      textColorStyles: $
    } = ln(y(() => e.error || e.disabled ? void 0 : h.value && l.value ? e.color : e.baseColor));
    _e(h, (M) => {
      if (v.value) {
        const ee = P.value.$el, ie = B.value.$el;
        requestAnimationFrame(() => {
          const ne = $a(ee), G = ie.getBoundingClientRect(), Se = G.x - ne.x, xe = G.y - ne.y - (ne.height / 2 - G.height / 2), we = G.width / 0.75, ce = Math.abs(we - ne.width) > 1 ? {
            maxWidth: he(we)
          } : void 0, Te = getComputedStyle(ee), Je = getComputedStyle(ie), Ke = parseFloat(Te.transitionDuration) * 1e3 || 150, J = parseFloat(Je.getPropertyValue("--v-field-label-scale")), ye = Je.getPropertyValue("color");
          ee.style.visibility = "visible", ie.style.visibility = "hidden", Do(ee, {
            transform: `translate(${Se}px, ${xe}px) scale(${J})`,
            color: ye,
            ...ce
          }, {
            duration: Ke,
            easing: _r,
            direction: M ? "normal" : "reverse"
          }).finished.then(() => {
            ee.style.removeProperty("visibility"), ie.style.removeProperty("visibility");
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
      blur: u,
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
      const M = e.variant === "outlined", ee = !!(i["prepend-inner"] || e.prependInnerIcon), ie = !!(e.clearable || i.clear), ne = !!(i["append-inner"] || e.appendInnerIcon || ie), G = () => i.label ? i.label({
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
        }, r.value, L.value, a.value, s.value, m.value, g.value, e.class],
        style: [x.value, e.style],
        onClick: w
      }, n), [f("div", {
        class: "v-field__overlay"
      }, null), f(Ua, {
        name: "v-field",
        active: !!e.loading,
        color: e.error ? "error" : typeof e.loading == "string" ? e.loading : e.color
      }, {
        default: i.loader
      }), ee && f("div", {
        key: "prepend",
        class: "v-field__prepend-inner"
      }, [e.prependInnerIcon && f(d, {
        key: "prepend-icon",
        name: "prependInner"
      }, null), (Se = i["prepend-inner"]) == null ? void 0 : Se.call(i, E.value)]), f("div", {
        class: "v-field__field",
        "data-no-activator": ""
      }, [["filled", "solo", "solo-inverted", "solo-filled"].includes(e.variant) && v.value && f(ji, {
        key: "floating-label",
        ref: B,
        class: [N.value],
        floating: !0,
        for: k.value,
        style: $.value
      }, {
        default: () => [G()]
      }), f(ji, {
        ref: P,
        for: k.value
      }, {
        default: () => [G()]
      }), (xe = i.default) == null ? void 0 : xe.call(i, {
        ...E.value,
        props: {
          id: k.value,
          class: "v-field__input",
          "aria-describedby": O.value
        },
        focus: c,
        blur: u
      })]), ie && f(f_, {
        key: "clear"
      }, {
        default: () => [vt(f("div", {
          class: "v-field__clearable",
          onMousedown: (ce) => {
            ce.preventDefault(), ce.stopPropagation();
          }
        }, [f(mt, {
          defaults: {
            VIcon: {
              icon: e.clearIcon
            }
          }
        }, {
          default: () => [i.clear ? i.clear({
            ...E.value,
            props: {
              onKeydown: A,
              onFocus: c,
              onBlur: u,
              onClick: e["onClick:clear"]
            }
          }) : f(d, {
            name: "clear",
            onKeydown: A,
            onFocus: c,
            onBlur: u
          }, null)]
        })]), [[zn, e.dirty]])]
      }), ne && f("div", {
        key: "append",
        class: "v-field__append-inner"
      }, [(we = i["append-inner"]) == null ? void 0 : we.call(i, E.value), e.appendInnerIcon && f(d, {
        key: "append-icon",
        name: "appendInner"
      }, null)]), f("div", {
        class: ["v-field__outline", N.value],
        style: $.value
      }, [M && f(fe, null, [f("div", {
        class: "v-field__outline__start"
      }, null), v.value && f("div", {
        class: "v-field__outline__notch"
      }, [f(ji, {
        ref: B,
        floating: !0,
        for: k.value
      }, {
        default: () => [G()]
      })]), f("div", {
        class: "v-field__outline__end"
      }, null)]), V.value && v.value && f(ji, {
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
function e0(e) {
  const t = Object.keys(im.props).filter((n) => !Da(n) && n !== "class" && n !== "style");
  return Rd(e, t);
}
const t0 = X({
  active: Boolean,
  color: String,
  messages: {
    type: [Array, String],
    default: () => []
  },
  ...Ne(),
  ...Zr({
    transition: {
      component: Lf,
      leaveAbsolute: !0,
      group: !0
    }
  })
}, "VMessages"), n0 = ve()({
  name: "VMessages",
  props: t0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = y(() => sn(e.messages)), {
      textColorClasses: i,
      textColorStyles: r
    } = ln(y(() => e.color));
    return Ee(() => f($n, {
      transition: e.transition,
      tag: "div",
      class: ["v-messages", i.value, e.class],
      style: [r.value, e.style],
      role: "alert",
      "aria-live": "polite"
    }, {
      default: () => [e.active && o.value.map((s, a) => f("div", {
        class: "v-messages__message",
        key: `${a}-${o.value}`
      }, [n.message ? n.message({
        message: s
      }) : s]))]
    })), {};
  }
}), o0 = Symbol.for("vuetify:form");
function i0() {
  return Re(o0, null);
}
const r0 = X({
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
  ...nl()
}, "validation");
function s0(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : cn(), n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Jt();
  const o = nt(e, "modelValue"), i = y(() => e.validationValue === void 0 ? o.value : e.validationValue), r = i0(), s = se([]), a = ke(!0), l = y(() => !!(sn(o.value === "" ? null : o.value).length || sn(i.value === "" ? null : i.value).length)), c = y(() => !!(e.disabled ?? (r == null ? void 0 : r.isDisabled.value))), u = y(() => !!(e.readonly ?? (r == null ? void 0 : r.isReadonly.value))), d = y(() => {
    var C;
    return (C = e.errorMessages) != null && C.length ? sn(e.errorMessages).concat(s.value).slice(0, Math.max(0, +e.maxErrors)) : s.value;
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
    [`${t}--readonly`]: u.value
  })), b = Qe("validation"), k = y(() => e.name ?? on(n));
  ba(() => {
    r == null || r.register({
      id: k.value,
      vm: b,
      validate: B,
      reset: O,
      resetValidation: P
    });
  }), gt(() => {
    r == null || r.unregister(k.value);
  }), un(async () => {
    m.value.lazy || await B(!m.value.eager), r == null || r.update(k.value, g.value, d.value);
  }), Hn(() => m.value.input || m.value.invalidInput && g.value === !1, () => {
    _e(i, () => {
      if (i.value != null)
        B();
      else if (e.focused) {
        const C = _e(() => e.focused, (V) => {
          V || B(), C();
        });
      }
    });
  }), Hn(() => m.value.blur, () => {
    _e(() => e.focused, (C) => {
      C || B();
    });
  }), _e([g, d], () => {
    r == null || r.update(k.value, g.value, d.value);
  });
  async function O() {
    o.value = null, await ft(), await P();
  }
  async function P() {
    a.value = !0, m.value.lazy ? s.value = [] : await B(!m.value.eager);
  }
  async function B() {
    let C = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !1;
    const V = [];
    h.value = !0;
    for (const L of e.rules) {
      if (V.length >= +(e.maxErrors ?? 1))
        break;
      const N = await (typeof L == "function" ? L : () => L)(i.value);
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
    errorMessages: d,
    isDirty: l,
    isDisabled: c,
    isReadonly: u,
    isPristine: a,
    isValid: g,
    isValidating: h,
    reset: O,
    resetValidation: P,
    validate: B,
    validationClasses: v
  };
}
const es = X({
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
  "onClick:prepend": Bt(),
  "onClick:append": Bt(),
  ...Ne(),
  ...fn(),
  ...Zg(Yn(), ["maxWidth", "minWidth", "width"]),
  ...at(),
  ...r0()
}, "VInput"), Ho = ve()({
  name: "VInput",
  props: {
    ...es()
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
      densityClasses: r
    } = Nn(e), {
      dimensionStyles: s
    } = Xn(e), {
      themeClasses: a
    } = pt(e), {
      rtlClasses: l
    } = dn(), {
      InputIcon: c
    } = nm(e), u = Jt(), d = y(() => e.id || `input-${u}`), m = y(() => `${d.value}-messages`), {
      errorMessages: g,
      isDirty: h,
      isDisabled: v,
      isReadonly: b,
      isPristine: k,
      isValid: O,
      isValidating: P,
      reset: B,
      resetValidation: C,
      validate: V,
      validationClasses: L
    } = s0(e, "v-input", d), x = y(() => ({
      id: d,
      messagesId: m,
      isDirty: h,
      isDisabled: v,
      isReadonly: b,
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
      var M, ee, ie, ne;
      const $ = !!(o.prepend || e.prependIcon), E = !!(o.append || e.appendIcon), w = N.value.length > 0, A = !e.hideDetails || e.hideDetails === "auto" && (w || !!o.details);
      return f("div", {
        class: ["v-input", `v-input--${e.direction}`, {
          "v-input--center-affix": e.centerAffix,
          "v-input--hide-spin-buttons": e.hideSpinButtons
        }, r.value, a.value, l.value, L.value, e.class],
        style: [s.value, e.style]
      }, [$ && f("div", {
        key: "prepend",
        class: "v-input__prepend"
      }, [(M = o.prepend) == null ? void 0 : M.call(o, x.value), e.prependIcon && f(c, {
        key: "prepend-icon",
        name: "prepend"
      }, null)]), o.default && f("div", {
        class: "v-input__control"
      }, [(ee = o.default) == null ? void 0 : ee.call(o, x.value)]), E && f("div", {
        key: "append",
        class: "v-input__append"
      }, [e.appendIcon && f(c, {
        key: "append-icon",
        name: "append"
      }, null), (ie = o.append) == null ? void 0 : ie.call(o, x.value)]), A && f("div", {
        class: "v-input__details"
      }, [f(n0, {
        id: m.value,
        active: w,
        messages: N.value
      }, {
        message: o.message
      }), (ne = o.details) == null ? void 0 : ne.call(o, x.value)])]);
    }), {
      reset: B,
      resetValidation: C,
      validate: V,
      isValid: O,
      errorMessages: g
    };
  }
}), a0 = X({
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
  ...es(),
  ...om()
}, "VTextarea"), rm = ve()({
  name: "VTextarea",
  directives: {
    Intersect: Pf
  },
  inheritAttrs: !1,
  props: a0(),
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
    const r = nt(e, "modelValue"), {
      isFocused: s,
      focus: a,
      blur: l
    } = Qr(e), c = y(() => typeof e.counterValue == "function" ? e.counterValue(r.value) : (r.value || "").toString().length), u = y(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    });
    function d(E, w) {
      var A, M;
      !e.autofocus || !E || (M = (A = w[0].target) == null ? void 0 : A.focus) == null || M.call(A);
    }
    const m = se(), g = se(), h = ke(""), v = se(), b = y(() => e.persistentPlaceholder || s.value || e.active);
    function k() {
      var E;
      v.value !== document.activeElement && ((E = v.value) == null || E.focus()), s.value || a();
    }
    function O(E) {
      k(), o("click:control", E);
    }
    function P(E) {
      o("mousedown:control", E);
    }
    function B(E) {
      E.stopPropagation(), k(), ft(() => {
        r.value = "", tp(e["onClick:clear"], E);
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
    const V = se(), L = se(+e.rows), x = y(() => ["plain", "underlined"].includes(e.variant));
    Xt(() => {
      e.autoGrow || (L.value = +e.rows);
    });
    function N() {
      e.autoGrow && ft(() => {
        if (!V.value || !g.value) return;
        const E = getComputedStyle(V.value), w = getComputedStyle(g.value.$el), A = parseFloat(E.getPropertyValue("--v-field-padding-top")) + parseFloat(E.getPropertyValue("--v-input-padding-top")) + parseFloat(E.getPropertyValue("--v-field-padding-bottom")), M = V.value.scrollHeight, ee = parseFloat(E.lineHeight), ie = Math.max(parseFloat(e.rows) * ee + A, parseFloat(w.getPropertyValue("--v-input-control-height"))), ne = parseFloat(e.maxRows) * ee + A || 1 / 0, G = Sn(M ?? 0, ie, ne);
        L.value = Math.floor((G - A) / ee), h.value = he(G);
      });
    }
    un(N), _e(r, N), _e(() => e.rows, N), _e(() => e.maxRows, N), _e(() => e.density, N);
    let $;
    return _e(V, (E) => {
      E ? ($ = new ResizeObserver(N), $.observe(V.value)) : $ == null || $.disconnect();
    }), gt(() => {
      $ == null || $.disconnect();
    }), Ee(() => {
      const E = !!(i.counter || e.counter || e.counterValue), w = !!(E || i.details), [A, M] = Ia(n), {
        modelValue: ee,
        ...ie
      } = Ho.filterProps(e), ne = e0(e);
      return f(Ho, Oe({
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
      }, A, ie, {
        centerAffix: L.value === 1 && !x.value,
        focused: s.value
      }), {
        ...i,
        default: (G) => {
          let {
            id: Se,
            isDisabled: xe,
            isDirty: we,
            isReadonly: ce,
            isValid: Te
          } = G;
          return f(im, Oe({
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
            active: b.value || we.value,
            centerAffix: L.value === 1 && !x.value,
            dirty: we.value || e.dirty,
            disabled: xe.value,
            focused: s.value,
            error: Te.value === !1
          }), {
            ...i,
            default: (Je) => {
              let {
                props: {
                  class: Ke,
                  ...J
                }
              } = Je;
              return f(fe, null, [e.prefix && f("span", {
                class: "v-text-field__prefix"
              }, [e.prefix]), vt(f("textarea", Oe({
                ref: v,
                class: Ke,
                value: r.value,
                onInput: C,
                autofocus: e.autofocus,
                readonly: ce.value,
                disabled: xe.value,
                placeholder: e.placeholder,
                rows: e.rows,
                name: e.name,
                onFocus: k,
                onBlur: l
              }, J, M), null), [[So("intersect"), {
                handler: d
              }, null, {
                once: !0
              }]]), e.autoGrow && vt(f("textarea", {
                class: [Ke, "v-textarea__sizer"],
                id: `${J.id}-sizer`,
                "onUpdate:modelValue": (ye) => r.value = ye,
                ref: V,
                readonly: !0,
                "aria-hidden": "true"
              }, null), [[Mg, r.value]]), e.suffix && f("span", {
                class: "v-text-field__suffix"
              }, [e.suffix])]);
            }
          });
        },
        details: w ? (G) => {
          var Se;
          return f(fe, null, [(Se = i.details) == null ? void 0 : Se.call(i, G), E && f(fe, null, [f("span", null, null), f(X_, {
            active: e.persistentCounter || s.value,
            value: c.value,
            max: u.value,
            disabled: e.disabled
          }, i.counter)])]);
        } : void 0
      });
    }), Za({}, m, g, v);
  }
}), ec = 20, Es = (e) => ({ scope: e, paragraph_cfi: "", items: [], cursor: null, has_more: !1, loading: !1, error: "", need_login: !1, request: 0 }), l0 = {
  name: "ReaderComments",
  components: { CommentItem: Gr, CommentList: Af },
  emits: ["write", "edit", "login", "changed", "feedback", "close"],
  props: {
    repository: { type: Object, default: null },
    user: { type: Object, default: null },
    chapter: { type: String, default: "" },
    // 抽屉是否展开；收起时不为章节切换发请求。
    active: { type: Boolean, default: !1 }
  },
  data: () => ({
    drawer: Es("chapter"),
    page: Es("chapter"),
    replies: Es("replies"),
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
      return e.filter((n) => !n.thread_id || !e.some((o) => o.id === n.thread_id)).map((n) => ({ first: n, children: e.filter((o) => o.thread_id === n.id) }));
    },
    remove_message: function() {
      const e = this.removing.record;
      if (!e) return "";
      const t = e.root_id ? this.replies.items.filter((o) => o.thread_id === e.id).length : e.reply_count || 0, n = e.root_id ? "回复" : "评论";
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
    show: function(e, t = "") {
      var n;
      return this.drawer.scope = e, this.drawer.paragraph_cfi = t, (n = this.$refs.drawerList) == null || n.scroll_to_top(), this.load(this.drawer, !0);
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
        const o = e === this.replies ? { root_id: this.detail.root.id, cursor: e.cursor, limit: ec } : { scope: e.scope, chapter: this.chapter, paragraph_cfi: e.paragraph_cfi, cursor: e.cursor, limit: ec }, i = await (e === this.replies ? this.repository.replies(o) : this.repository.list(o));
        if (n !== e.request) return;
        const r = new Set(e.items.map((s) => s.id));
        e.items.push(...i.items.filter((s) => !r.has(s.id))), e.cursor = i.next_cursor, e.has_more = i.has_more;
      } catch (o) {
        if (n !== e.request) return;
        e.need_login = (o == null ? void 0 : o.code) === "need_login", e.error = o.message || "请稍后重试";
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
          var o;
          return (o = Array.from(document.querySelectorAll(`.v-overlay--active [data-comment="${CSS.escape(String(n))}"] .comment-reply`)).pop()) == null ? void 0 : o.focus();
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
      var o;
      if (!this.user) return this.$emit("login");
      const e = this.detail.draft.trim(), t = this.detail.root;
      if (!e || this.detail.sending) return this.focus_composer();
      const n = this.detail.edit;
      this.detail.sending = !0;
      try {
        const i = await this.repository.save(n ? { id: n.id, client_id: n.client_id, root_id: t.id, content: e } : { client_id: Io(), root_id: t.id, reply_to_id: ((o = this.detail.to) == null ? void 0 : o.id) || null, content: e });
        if (this.detail.root !== t) return;
        n ? Object.assign(n, i) : (this.replies.items.push(i), this.patch(t.id, { reply_count: (t.reply_count || 0) + 1 })), this.reset_composer();
      } catch (i) {
        this.$emit("feedback", `回复失败：${i.message || "请稍后重试"}`, !0);
      } finally {
        this.detail.sending = !1;
      }
    },
    // ---- 赞踩：互斥，再点一次取消；失败恢复到操作前 ----
    vote: async function(e, t) {
      if (!this.user) return this.$emit("login");
      if (this.voting.has(e.id)) return;
      const n = { like_count: e.like_count || 0, dislike_count: e.dislike_count || 0, user_vote: e.user_vote || 0 }, o = n.user_vote === t ? 0 : t;
      this.voting.add(e.id), this.patch(e.id, {
        user_vote: o,
        like_count: n.like_count - (n.user_vote === 1) + (o === 1),
        dislike_count: n.dislike_count - (n.user_vote === -1) + (o === -1)
      });
      try {
        const i = await this.repository.vote({ id: e.id, value: o });
        this.patch(e.id, { like_count: i.like_count, dislike_count: i.dislike_count, user_vote: i.user_vote });
      } catch (i) {
        this.patch(e.id, n), this.$emit("feedback", `操作失败：${i.message || "请稍后重试"}`, !0);
      } finally {
        this.voting.delete(e.id);
      }
    },
    // ---- 删除：真删除，主评论连同全部回复，第一层回复连同其下回复 ----
    ask_remove: function(e) {
      Object.assign(this.removing, { open: !0, busy: !1, record: e });
    },
    confirm_remove: async function() {
      var t, n, o;
      const e = this.removing.record;
      this.removing.busy = !0;
      try {
        if (await this.repository.remove({ id: e.id }), e.root_id) {
          const i = this.replies.items.length;
          this.replies.items = this.replies.items.filter((s) => s.id !== e.id && s.thread_id !== e.id);
          const r = this.detail.root;
          r && this.patch(r.id, { reply_count: Math.max(0, (r.reply_count || 0) - (i - this.replies.items.length)) }), (((t = this.detail.to) == null ? void 0 : t.id) === e.id || ((n = this.detail.edit) == null ? void 0 : n.id) === e.id) && this.reset_composer();
        } else {
          for (const i of [this.drawer, this.page]) i.items = i.items.filter((r) => r.id !== e.id);
          ((o = this.detail.root) == null ? void 0 : o.id) === e.id && this.back(), this.$emit("changed", e);
        }
        this.removing.open = !1, this.$emit("feedback", "已删除");
      } catch (i) {
        this.$emit("feedback", `删除失败：${i.message || "请稍后重试"}`, !0);
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
}, u0 = {
  ref: "drawer",
  class: "reader-comments-drawer",
  "aria-label": "评论"
}, c0 = { class: "rc-head" }, d0 = { class: "rc-footer" }, f0 = { class: "rc-page" }, m0 = {
  class: "rc-tabs",
  "aria-label": "查看范围"
}, h0 = ["aria-pressed", "onClick"], v0 = { class: "rc-page-body" }, g0 = {
  key: 0,
  class: "rc-login"
}, p0 = { class: "rc-footer" }, y0 = {
  key: 0,
  class: "rc-page"
}, b0 = { class: "rc-detail-nav" }, _0 = { class: "rc-replies-title" }, w0 = {
  key: 0,
  class: "rc-replies-state",
  role: "alert"
}, S0 = {
  key: 1,
  class: "rc-replies-state"
}, k0 = {
  key: 0,
  class: "rc-thread-children"
}, C0 = {
  key: 2,
  class: "rc-replies-state",
  role: "status"
}, E0 = {
  key: 0,
  class: "rc-footer"
};
function x0(e, t, n, o, i, r) {
  const s = Af, a = Gr;
  return Q(), de(fe, null, [
    H("section", u0, [
      H("div", {
        class: "rc-grip",
        onPointerdown: t[1] || (t[1] = (...l) => r.on_drag_start && r.on_drag_start(...l)),
        onPointermove: t[2] || (t[2] = (...l) => r.on_drag_move && r.on_drag_move(...l)),
        onPointerup: t[3] || (t[3] = (...l) => r.on_drag_end && r.on_drag_end(...l)),
        onPointercancel: t[4] || (t[4] = (...l) => r.on_drag_cancel && r.on_drag_cancel(...l))
      }, [
        t[31] || (t[31] = H("div", {
          class: "rc-handle",
          "aria-hidden": "true"
        }, null, -1)),
        H("header", c0, [
          H("strong", null, be(e.drawer.scope === "paragraph" ? "本段评论" : "本章评论"), 1),
          H("button", {
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
      H("footer", d0, [
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
    f(Bn, {
      "model-value": r.page_open,
      class: "rc-standalone",
      fullscreen: "",
      scrim: !1,
      transition: "slide-x-reverse-transition",
      "aria-label": "完整评论页",
      "onUpdate:modelValue": t[17] || (t[17] = (l) => l || r.back())
    }, {
      default: T(() => [
        H("section", f0, [
          H("nav", m0, [
            H("button", {
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
            (Q(!0), de(fe, null, Tt(e.tabs, (l) => (Q(), de("button", {
              key: l.scope,
              type: "button",
              class: Lt(["rc-tab", { "rc-tab--active": e.page.scope === l.scope }]),
              "aria-pressed": String(e.page.scope === l.scope),
              onClick: (c) => r.set_page_scope(l.scope)
            }, be(l.label), 11, h0))), 128))
          ]),
          H("div", v0, [
            e.page.scope === "mine" && !n.user ? (Q(), de("div", g0, [
              t[35] || (t[35] = H("p", null, "登录后查看你的划线和评论", -1)),
              f(Ce, {
                variant: "tonal",
                onClick: t[11] || (t[11] = (l) => e.$emit("login"))
              }, {
                default: T(() => t[34] || (t[34] = [
                  te("去登录")
                ])),
                _: 1
              })
            ])) : (Q(), Ye(s, {
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
          H("footer", p0, [
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
    f(Bn, {
      "model-value": r.detail_open,
      class: "rc-standalone",
      fullscreen: "",
      scrim: !1,
      transition: "slide-x-reverse-transition",
      "aria-label": "评论详情",
      "onUpdate:modelValue": t[26] || (t[26] = (l) => l || r.back())
    }, {
      default: T(() => [
        e.detail.root ? (Q(), de("section", y0, [
          H("nav", b0, [
            H("button", {
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
            t[38] || (t[38] = H("strong", null, "评论详情", -1))
          ]),
          H("div", {
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
            H("div", _0, be(e.detail.root.reply_count || 0) + " 条回复" + be(r.root_private ? " · 仅你可见" : ""), 1),
            e.replies.error && !e.replies.items.length ? (Q(), de("div", w0, [
              t[39] || (t[39] = te(" 回复暂时没能加载 ")),
              H("button", {
                type: "button",
                class: "rc-text-button",
                onClick: t[21] || (t[21] = (l) => r.load_replies(!0))
              }, "重试")
            ])) : !e.replies.items.length && !e.replies.loading ? (Q(), de("div", S0, "还没有回复，来说点什么吧")) : qe("", !0),
            (Q(!0), de(fe, null, Tt(r.threads, (l) => (Q(), de("div", {
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
              l.children.length ? (Q(), de("div", k0, [
                (Q(!0), de(fe, null, Tt(l.children, (c) => (Q(), Ye(a, {
                  key: c.id,
                  record: c,
                  readonly: r.root_private,
                  onEdit: r.edit_reply,
                  onRemove: r.ask_remove,
                  onVote: r.vote,
                  onReply: r.reply_to
                }, null, 8, ["record", "readonly", "onEdit", "onRemove", "onVote", "onReply"]))), 128))
              ])) : qe("", !0)
            ]))), 128)),
            e.replies.items.length ? (Q(), de("div", C0, [
              e.replies.error ? (Q(), de(fe, { key: 0 }, [
                t[40] || (t[40] = te("加载失败 ")),
                H("button", {
                  type: "button",
                  class: "rc-text-button",
                  onClick: t[22] || (t[22] = (l) => r.load_replies())
                }, "重试")
              ], 64)) : e.replies.loading ? (Q(), de(fe, { key: 1 }, [
                te("正在加载回复…")
              ], 64)) : e.replies.has_more ? qe("", !0) : (Q(), de(fe, { key: 2 }, [
                te("已显示全部回复")
              ], 64))
            ])) : qe("", !0)
          ], 544),
          r.root_private ? qe("", !0) : (Q(), de("footer", E0, [
            H("form", {
              class: "rc-reply-box",
              onSubmit: t[25] || (t[25] = so((...l) => r.send_reply && r.send_reply(...l), ["prevent"]))
            }, [
              f(rm, {
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
              e.detail.to || e.detail.edit ? (Q(), Ye(Ce, {
                key: 0,
                variant: "text",
                disabled: e.detail.sending,
                onClick: r.reset_composer
              }, {
                default: T(() => t[41] || (t[41] = [
                  te("取消")
                ])),
                _: 1
              }, 8, ["disabled", "onClick"])) : qe("", !0),
              f(Ce, {
                type: "submit",
                color: "primary",
                variant: "flat",
                loading: e.detail.sending
              }, {
                default: T(() => [
                  te(be(e.detail.edit ? "保存" : "发送"), 1)
                ]),
                _: 1
              }, 8, ["loading"])
            ], 32)
          ]))
        ])) : qe("", !0)
      ]),
      _: 1
    }, 8, ["model-value"]),
    f(Bn, {
      modelValue: e.removing.open,
      "onUpdate:modelValue": t[28] || (t[28] = (l) => e.removing.open = l),
      class: "rc-above-standalone",
      "max-width": "360",
      persistent: e.removing.busy,
      "aria-labelledby": "rc-remove-title"
    }, {
      default: T(() => [
        f(ei, null, {
          default: T(() => [
            f(Nr, {
              id: "rc-remove-title",
              class: "text-subtitle-1"
            }, {
              default: T(() => t[42] || (t[42] = [
                te("删除后无法恢复")
              ])),
              _: 1
            }),
            f(si, null, {
              default: T(() => [
                te(be(r.remove_message), 1)
              ]),
              _: 1
            }),
            f(xr, null, {
              default: T(() => [
                f(er),
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
const sm = /* @__PURE__ */ Un(l0, [["render", x0], ["__scopeId", "data-v-103a914b"]]), N0 = X({
  color: String,
  inset: Boolean,
  length: [Number, String],
  opacity: [Number, String],
  thickness: [Number, String],
  vertical: Boolean,
  ...Ne(),
  ...at()
}, "VDivider"), am = ve()({
  name: "VDivider",
  props: N0(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      themeClasses: i
    } = pt(e), {
      textColorClasses: r,
      textColorStyles: s
    } = ln(le(e, "color")), a = y(() => {
      const l = {};
      return e.length && (l[e.vertical ? "height" : "width"] = he(e.length)), e.thickness && (l[e.vertical ? "borderRightWidth" : "borderTopWidth"] = he(e.thickness)), l;
    });
    return Ee(() => {
      const l = f("hr", {
        class: [{
          "v-divider": !0,
          "v-divider--inset": e.inset,
          "v-divider--vertical": e.vertical
        }, i.value, r.value, e.class],
        style: [a.value, s.value, {
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
      }, [l, f("div", {
        class: "v-divider__content"
      }, [o.default()]), l]) : l;
    }), {};
  }
}), na = Symbol.for("vuetify:list");
function lm() {
  const e = Re(na, {
    hasPrepend: ke(!1),
    updateHasPrepend: () => null
  }), t = {
    hasPrepend: ke(!1),
    updateHasPrepend: (n) => {
      n && (t.hasPrepend.value = n);
    }
  };
  return Et(na, t), e;
}
function um() {
  return Re(na, null);
}
const ol = (e) => {
  const t = {
    activate: (n) => {
      let {
        id: o,
        value: i,
        activated: r
      } = n;
      return o = ae(o), e && !i && r.size === 1 && r.has(o) || (i ? r.add(o) : r.delete(o)), r;
    },
    in: (n, o, i) => {
      let r = /* @__PURE__ */ new Set();
      if (n != null)
        for (const s of sn(n))
          r = t.activate({
            id: s,
            value: !0,
            activated: new Set(r),
            children: o,
            parents: i
          });
      return r;
    },
    out: (n) => Array.from(n)
  };
  return t;
}, cm = (e) => {
  const t = ol(e);
  return {
    activate: (o) => {
      let {
        activated: i,
        id: r,
        ...s
      } = o;
      r = ae(r);
      const a = i.has(r) ? /* @__PURE__ */ new Set([r]) : /* @__PURE__ */ new Set();
      return t.activate({
        ...s,
        id: r,
        activated: a
      });
    },
    in: (o, i, r) => {
      let s = /* @__PURE__ */ new Set();
      if (o != null) {
        const a = sn(o);
        a.length && (s = t.in(a.slice(0, 1), i, r));
      }
      return s;
    },
    out: (o, i, r) => t.out(o, i, r)
  };
}, V0 = (e) => {
  const t = ol(e);
  return {
    activate: (o) => {
      let {
        id: i,
        activated: r,
        children: s,
        ...a
      } = o;
      return i = ae(i), s.has(i) ? r : t.activate({
        id: i,
        activated: r,
        children: s,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, O0 = (e) => {
  const t = cm(e);
  return {
    activate: (o) => {
      let {
        id: i,
        activated: r,
        children: s,
        ...a
      } = o;
      return i = ae(i), s.has(i) ? r : t.activate({
        id: i,
        activated: r,
        children: s,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, T0 = {
  open: (e) => {
    let {
      id: t,
      value: n,
      opened: o,
      parents: i
    } = e;
    if (n) {
      const r = /* @__PURE__ */ new Set();
      r.add(t);
      let s = i.get(t);
      for (; s != null; )
        r.add(s), s = i.get(s);
      return r;
    } else
      return o.delete(t), o;
  },
  select: () => null
}, dm = {
  open: (e) => {
    let {
      id: t,
      value: n,
      opened: o,
      parents: i
    } = e;
    if (n) {
      let r = i.get(t);
      for (o.add(t); r != null && r !== t; )
        o.add(r), r = i.get(r);
      return o;
    } else
      o.delete(t);
    return o;
  },
  select: () => null
}, A0 = {
  open: dm.open,
  select: (e) => {
    let {
      id: t,
      value: n,
      opened: o,
      parents: i
    } = e;
    if (!n) return o;
    const r = [];
    let s = i.get(t);
    for (; s != null; )
      r.push(s), s = i.get(s);
    return new Set(r);
  }
}, il = (e) => {
  const t = {
    select: (n) => {
      let {
        id: o,
        value: i,
        selected: r
      } = n;
      if (o = ae(o), e && !i) {
        const s = Array.from(r.entries()).reduce((a, l) => {
          let [c, u] = l;
          return u === "on" && a.push(c), a;
        }, []);
        if (s.length === 1 && s[0] === o) return r;
      }
      return r.set(o, i ? "on" : "off"), r;
    },
    in: (n, o, i) => {
      let r = /* @__PURE__ */ new Map();
      for (const s of n || [])
        r = t.select({
          id: s,
          value: !0,
          selected: new Map(r),
          children: o,
          parents: i
        });
      return r;
    },
    out: (n) => {
      const o = [];
      for (const [i, r] of n.entries())
        r === "on" && o.push(i);
      return o;
    }
  };
  return t;
}, fm = (e) => {
  const t = il(e);
  return {
    select: (o) => {
      let {
        selected: i,
        id: r,
        ...s
      } = o;
      r = ae(r);
      const a = i.has(r) ? /* @__PURE__ */ new Map([[r, i.get(r)]]) : /* @__PURE__ */ new Map();
      return t.select({
        ...s,
        id: r,
        selected: a
      });
    },
    in: (o, i, r) => {
      let s = /* @__PURE__ */ new Map();
      return o != null && o.length && (s = t.in(o.slice(0, 1), i, r)), s;
    },
    out: (o, i, r) => t.out(o, i, r)
  };
}, D0 = (e) => {
  const t = il(e);
  return {
    select: (o) => {
      let {
        id: i,
        selected: r,
        children: s,
        ...a
      } = o;
      return i = ae(i), s.has(i) ? r : t.select({
        id: i,
        selected: r,
        children: s,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, I0 = (e) => {
  const t = fm(e);
  return {
    select: (o) => {
      let {
        id: i,
        selected: r,
        children: s,
        ...a
      } = o;
      return i = ae(i), s.has(i) ? r : t.select({
        id: i,
        selected: r,
        children: s,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, P0 = (e) => {
  const t = {
    select: (n) => {
      let {
        id: o,
        value: i,
        selected: r,
        children: s,
        parents: a
      } = n;
      o = ae(o);
      const l = new Map(r), c = [o];
      for (; c.length; ) {
        const d = c.shift();
        r.set(ae(d), i ? "on" : "off"), s.has(d) && c.push(...s.get(d));
      }
      let u = ae(a.get(o));
      for (; u; ) {
        const d = s.get(u), m = d.every((h) => r.get(ae(h)) === "on"), g = d.every((h) => !r.has(ae(h)) || r.get(ae(h)) === "off");
        r.set(u, m ? "on" : g ? "off" : "indeterminate"), u = ae(a.get(u));
      }
      return e && !i && Array.from(r.entries()).reduce((m, g) => {
        let [h, v] = g;
        return v === "on" && m.push(h), m;
      }, []).length === 0 ? l : r;
    },
    in: (n, o, i) => {
      let r = /* @__PURE__ */ new Map();
      for (const s of n || [])
        r = t.select({
          id: s,
          value: !0,
          selected: new Map(r),
          children: o,
          parents: i
        });
      return r;
    },
    out: (n, o) => {
      const i = [];
      for (const [r, s] of n.entries())
        s === "on" && !o.has(r) && i.push(r);
      return i;
    }
  };
  return t;
}, _i = Symbol.for("vuetify:nested"), mm = {
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
}, $0 = X({
  activatable: Boolean,
  selectable: Boolean,
  activeStrategy: [String, Function, Object],
  selectStrategy: [String, Function, Object],
  openStrategy: [String, Object],
  opened: null,
  activated: null,
  selected: null,
  mandatory: Boolean
}, "nested"), M0 = (e) => {
  let t = !1;
  const n = se(/* @__PURE__ */ new Map()), o = se(/* @__PURE__ */ new Map()), i = nt(e, "opened", e.opened, (h) => new Set(h), (h) => [...h.values()]), r = y(() => {
    if (typeof e.activeStrategy == "object") return e.activeStrategy;
    if (typeof e.activeStrategy == "function") return e.activeStrategy(e.mandatory);
    switch (e.activeStrategy) {
      case "leaf":
        return V0(e.mandatory);
      case "single-leaf":
        return O0(e.mandatory);
      case "independent":
        return ol(e.mandatory);
      case "single-independent":
      default:
        return cm(e.mandatory);
    }
  }), s = y(() => {
    if (typeof e.selectStrategy == "object") return e.selectStrategy;
    if (typeof e.selectStrategy == "function") return e.selectStrategy(e.mandatory);
    switch (e.selectStrategy) {
      case "single-leaf":
        return I0(e.mandatory);
      case "leaf":
        return D0(e.mandatory);
      case "independent":
        return il(e.mandatory);
      case "single-independent":
        return fm(e.mandatory);
      case "classic":
      default:
        return P0(e.mandatory);
    }
  }), a = y(() => {
    if (typeof e.openStrategy == "object") return e.openStrategy;
    switch (e.openStrategy) {
      case "list":
        return A0;
      case "single":
        return T0;
      case "multiple":
      default:
        return dm;
    }
  }), l = nt(e, "activated", e.activated, (h) => r.value.in(h, n.value, o.value), (h) => r.value.out(h, n.value, o.value)), c = nt(e, "selected", e.selected, (h) => s.value.in(h, n.value, o.value), (h) => s.value.out(h, n.value, o.value));
  gt(() => {
    t = !0;
  });
  function u(h) {
    const v = [];
    let b = h;
    for (; b != null; )
      v.unshift(b), b = o.value.get(b);
    return v;
  }
  const d = Qe("nested"), m = /* @__PURE__ */ new Set(), g = {
    id: ke(),
    root: {
      opened: i,
      activatable: le(e, "activatable"),
      selectable: le(e, "selectable"),
      activated: l,
      selected: c,
      selectedValues: y(() => {
        const h = [];
        for (const [v, b] of c.value.entries())
          b === "on" && h.push(v);
        return h;
      }),
      register: (h, v, b) => {
        if (m.has(h)) {
          const k = u(h).map(String).join(" -> "), O = u(v).concat(h).map(String).join(" -> ");
          yr(`Multiple nodes with the same ID
	${k}
	${O}`);
          return;
        } else
          m.add(h);
        v && h !== v && o.value.set(h, v), b && n.value.set(h, []), v != null && n.value.set(v, [...n.value.get(v) || [], h]);
      },
      unregister: (h) => {
        if (t) return;
        m.delete(h), n.value.delete(h);
        const v = o.value.get(h);
        if (v) {
          const b = n.value.get(v) ?? [];
          n.value.set(v, b.filter((k) => k !== h));
        }
        o.value.delete(h);
      },
      open: (h, v, b) => {
        d.emit("click:open", {
          id: h,
          value: v,
          path: u(h),
          event: b
        });
        const k = a.value.open({
          id: h,
          value: v,
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: b
        });
        k && (i.value = k);
      },
      openOnSelect: (h, v, b) => {
        const k = a.value.select({
          id: h,
          value: v,
          selected: new Map(c.value),
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: b
        });
        k && (i.value = k);
      },
      select: (h, v, b) => {
        d.emit("click:select", {
          id: h,
          value: v,
          path: u(h),
          event: b
        });
        const k = s.value.select({
          id: h,
          value: v,
          selected: new Map(c.value),
          children: n.value,
          parents: o.value,
          event: b
        });
        k && (c.value = k), g.root.openOnSelect(h, v, b);
      },
      activate: (h, v, b) => {
        if (!e.activatable)
          return g.root.select(h, !0, b);
        d.emit("click:activate", {
          id: h,
          value: v,
          path: u(h),
          event: b
        });
        const k = r.value.activate({
          id: h,
          value: v,
          activated: new Set(l.value),
          children: n.value,
          parents: o.value,
          event: b
        });
        k && (l.value = k);
      },
      children: n,
      parents: o,
      getPath: u
    }
  };
  return Et(_i, g), g.root;
}, hm = (e, t) => {
  const n = Re(_i, mm), o = Symbol(Jt()), i = y(() => e.value !== void 0 ? e.value : o), r = {
    ...n,
    id: i,
    open: (s, a) => n.root.open(i.value, s, a),
    openOnSelect: (s, a) => n.root.openOnSelect(i.value, s, a),
    isOpen: y(() => n.root.opened.value.has(i.value)),
    parent: y(() => n.root.parents.value.get(i.value)),
    activate: (s, a) => n.root.activate(i.value, s, a),
    isActivated: y(() => n.root.activated.value.has(ae(i.value))),
    select: (s, a) => n.root.select(i.value, s, a),
    isSelected: y(() => n.root.selected.value.get(ae(i.value)) === "on"),
    isIndeterminate: y(() => n.root.selected.value.get(i.value) === "indeterminate"),
    isLeaf: y(() => !n.root.children.value.get(i.value)),
    isGroupActivator: n.isGroupActivator
  };
  return !n.isGroupActivator && n.root.register(i.value, n.id.value, t), gt(() => {
    !n.isGroupActivator && n.root.unregister(i.value);
  }), t && Et(_i, r), r;
}, F0 = () => {
  const e = Re(_i, mm);
  Et(_i, {
    ...e,
    isGroupActivator: !0
  });
};
function ts() {
  const e = ke(!1);
  return un(() => {
    window.requestAnimationFrame(() => {
      e.value = !0;
    });
  }), {
    ssrBootStyles: y(() => e.value ? void 0 : {
      transition: "none !important"
    }),
    isBooted: Ci(e)
  };
}
const L0 = Uo({
  name: "VListGroupActivator",
  setup(e, t) {
    let {
      slots: n
    } = t;
    return F0(), () => {
      var o;
      return (o = n.default) == null ? void 0 : o.call(n);
    };
  }
}), B0 = X({
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
  ...ot()
}, "VListGroup"), Tr = ve()({
  name: "VListGroup",
  props: B0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isOpen: o,
      open: i,
      id: r
    } = hm(le(e, "value"), !0), s = y(() => `v-list-group--id-${String(r.value)}`), a = um(), {
      isBooted: l
    } = ts();
    function c(g) {
      g.stopPropagation(), i(!o.value, g);
    }
    const u = y(() => ({
      onClick: c,
      class: "v-list-group__header",
      id: s.value
    })), d = y(() => o.value ? e.collapseIcon : e.expandIcon), m = y(() => ({
      VListItem: {
        active: o.value,
        activeColor: e.activeColor,
        baseColor: e.baseColor,
        color: e.color,
        prependIcon: e.prependIcon || e.subgroup && d.value,
        appendIcon: e.appendIcon || !e.subgroup && d.value,
        title: e.title,
        value: e.value
      }
    }));
    return Ee(() => f(e.tag, {
      class: ["v-list-group", {
        "v-list-group--prepend": a == null ? void 0 : a.hasPrepend.value,
        "v-list-group--fluid": e.fluid,
        "v-list-group--subgroup": e.subgroup,
        "v-list-group--open": o.value
      }, e.class],
      style: e.style
    }, {
      default: () => [n.activator && f(mt, {
        defaults: m.value
      }, {
        default: () => [f(L0, null, {
          default: () => [n.activator({
            props: u.value,
            isOpen: o.value
          })]
        })]
      }), f($n, {
        transition: {
          component: Bf
        },
        disabled: !l.value
      }, {
        default: () => {
          var g;
          return [vt(f("div", {
            class: "v-list-group__items",
            role: "group",
            "aria-labelledby": s.value
          }, [(g = n.default) == null ? void 0 : g.call(n)]), [[zn, o.value]])];
        }
      })]
    })), {
      isOpen: o
    };
  }
}), R0 = X({
  opacity: [Number, String],
  ...Ne(),
  ...ot()
}, "VListItemSubtitle"), H0 = ve()({
  name: "VListItemSubtitle",
  props: R0(),
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
}), j0 = La("v-list-item-title"), z0 = X({
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
  onClick: Bt(),
  onClickOnce: Bt(),
  ...Wn(),
  ...Ne(),
  ...fn(),
  ...Yn(),
  ...Kn(),
  ...It(),
  ...Ga(),
  ...ot(),
  ...at(),
  ...Eo({
    variant: "text"
  })
}, "VListItem"), wt = ve()({
  name: "VListItem",
  directives: {
    Ripple: Di
  },
  props: z0(),
  emits: {
    click: (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o,
      emit: i
    } = t;
    const r = Ka(e, n), s = y(() => e.value === void 0 ? r.href.value : e.value), {
      activate: a,
      isActivated: l,
      select: c,
      isOpen: u,
      isSelected: d,
      isIndeterminate: m,
      isGroupActivator: g,
      root: h,
      parent: v,
      openOnSelect: b,
      id: k
    } = hm(s, !1), O = um(), P = y(() => {
      var ce;
      return e.active !== !1 && (e.active || ((ce = r.isActive) == null ? void 0 : ce.value) || (h.activatable.value ? l.value : d.value));
    }), B = y(() => e.link !== !1 && r.isLink.value), C = y(() => !e.disabled && e.link !== !1 && (e.link || r.isClickable.value || !!O && (h.selectable.value || h.activatable.value || e.value != null))), V = y(() => e.rounded || e.nav), L = y(() => e.color ?? e.activeColor), x = y(() => ({
      color: P.value ? L.value ?? e.baseColor : e.baseColor,
      variant: e.variant
    }));
    _e(() => {
      var ce;
      return (ce = r.isActive) == null ? void 0 : ce.value;
    }, (ce) => {
      ce && v.value != null && h.open(v.value, !0), ce && b(ce);
    }, {
      immediate: !0
    });
    const {
      themeClasses: N
    } = pt(e), {
      borderClasses: $
    } = qn(e), {
      colorClasses: E,
      colorStyles: w,
      variantClasses: A
    } = Ai(x), {
      densityClasses: M
    } = Nn(e), {
      dimensionStyles: ee
    } = Xn(e), {
      elevationClasses: ie
    } = Gn(e), {
      roundedClasses: ne
    } = Pt(V), G = y(() => e.lines ? `v-list-item--${e.lines}-line` : void 0), Se = y(() => ({
      isActive: P.value,
      select: c,
      isOpen: u.value,
      isSelected: d.value,
      isIndeterminate: m.value
    }));
    function xe(ce) {
      var Te;
      i("click", ce), C.value && ((Te = r.navigate) == null || Te.call(r, ce), !g && (h.activatable.value ? a(!l.value, ce) : (h.selectable.value || e.value != null) && c(!d.value, ce)));
    }
    function we(ce) {
      (ce.key === "Enter" || ce.key === " ") && (ce.preventDefault(), ce.target.dispatchEvent(new MouseEvent("click", ce)));
    }
    return Ee(() => {
      const ce = B.value ? "a" : e.tag, Te = o.title || e.title != null, Je = o.subtitle || e.subtitle != null, Ke = !!(e.appendAvatar || e.appendIcon), J = !!(Ke || o.append), ye = !!(e.prependAvatar || e.prependIcon), De = !!(ye || o.prepend);
      return O == null || O.updateHasPrepend(De), e.activeColor && hp("active-color", ["color", "base-color"]), vt(f(ce, Oe({
        class: ["v-list-item", {
          "v-list-item--active": P.value,
          "v-list-item--disabled": e.disabled,
          "v-list-item--link": C.value,
          "v-list-item--nav": e.nav,
          "v-list-item--prepend": !De && (O == null ? void 0 : O.hasPrepend.value),
          "v-list-item--slim": e.slim,
          [`${e.activeClass}`]: e.activeClass && P.value
        }, N.value, $.value, E.value, M.value, ie.value, G.value, ne.value, A.value, e.class],
        style: [w.value, ee.value, e.style],
        tabindex: C.value ? O ? -2 : 0 : void 0,
        "aria-selected": h.activatable.value ? l.value : d.value,
        onClick: xe,
        onKeydown: C.value && !B.value && we
      }, r.linkProps), {
        default: () => {
          var lt;
          return [Ti(C.value || P.value, "v-list-item"), De && f("div", {
            key: "prepend",
            class: "v-list-item__prepend"
          }, [o.prepend ? f(mt, {
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
              var Ue;
              return [(Ue = o.prepend) == null ? void 0 : Ue.call(o, Se.value)];
            }
          }) : f(fe, null, [e.prependAvatar && f(Vr, {
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
          }, [Te && f(j0, {
            key: "title"
          }, {
            default: () => {
              var Ue;
              return [((Ue = o.title) == null ? void 0 : Ue.call(o, {
                title: e.title
              })) ?? e.title];
            }
          }), Je && f(H0, {
            key: "subtitle"
          }, {
            default: () => {
              var Ue;
              return [((Ue = o.subtitle) == null ? void 0 : Ue.call(o, {
                subtitle: e.subtitle
              })) ?? e.subtitle];
            }
          }), (lt = o.default) == null ? void 0 : lt.call(o, Se.value)]), J && f("div", {
            key: "append",
            class: "v-list-item__append"
          }, [o.append ? f(mt, {
            key: "append-defaults",
            disabled: !Ke,
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
              var Ue;
              return [(Ue = o.append) == null ? void 0 : Ue.call(o, Se.value)];
            }
          }) : f(fe, null, [e.appendIcon && f(Ve, {
            key: "append-icon",
            density: e.density,
            icon: e.appendIcon
          }, null), e.appendAvatar && f(Vr, {
            key: "append-avatar",
            density: e.density,
            image: e.appendAvatar
          }, null)]), f("div", {
            class: "v-list-item__spacer"
          }, null)])];
        }
      }), [[So("ripple"), C.value && e.ripple]]);
    }), {
      activate: a,
      isActivated: l,
      isGroupActivator: g,
      isSelected: d,
      list: O,
      select: c,
      root: h,
      id: k
    };
  }
}), U0 = X({
  color: String,
  inset: Boolean,
  sticky: Boolean,
  title: String,
  ...Ne(),
  ...ot()
}, "VListSubheader"), W0 = ve()({
  name: "VListSubheader",
  props: U0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      textColorClasses: o,
      textColorStyles: i
    } = ln(le(e, "color"));
    return Ee(() => {
      const r = !!(n.default || e.title);
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
          var s;
          return [r && f("div", {
            class: "v-list-subheader__text"
          }, [((s = n.default) == null ? void 0 : s.call(n)) ?? e.title])];
        }
      });
    }), {};
  }
}), q0 = X({
  items: Array,
  returnObject: Boolean
}, "VListChildren"), vm = ve()({
  name: "VListChildren",
  props: q0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return lm(), () => {
      var o, i;
      return ((o = n.default) == null ? void 0 : o.call(n)) ?? ((i = e.items) == null ? void 0 : i.map((r) => {
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
          })) ?? f(am, a, null);
        if (l === "subheader")
          return ((g = n.subheader) == null ? void 0 : g.call(n, {
            props: a
          })) ?? f(W0, a, null);
        const u = {
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
        }, d = Tr.filterProps(a);
        return s ? f(Tr, Oe({
          value: a == null ? void 0 : a.value
        }, d), {
          activator: (h) => {
            let {
              props: v
            } = h;
            const b = {
              ...a,
              ...v,
              value: e.returnObject ? c : a.value
            };
            return n.header ? n.header({
              props: b
            }) : f(wt, b, u);
          },
          default: () => f(vm, {
            items: s,
            returnObject: e.returnObject
          }, n)
        }) : n.item ? n.item({
          props: a
        }) : f(wt, Oe(a, {
          value: e.returnObject ? c : a.value
        }), u);
      }));
    };
  }
}), K0 = X({
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
    default: Oi
  }
}, "list-items");
function G0(e) {
  return typeof e == "string" || typeof e == "number" || typeof e == "boolean";
}
function Y0(e, t) {
  const n = Xo(t, e.itemType, "item"), o = G0(t) ? t : Xo(t, e.itemTitle), i = Xo(t, e.itemValue, void 0), r = Xo(t, e.itemChildren), s = e.itemProps === !0 ? Aa(t, ["children"]) : Xo(t, e.itemProps), a = {
    title: o,
    value: i,
    ...s
  };
  return {
    type: n,
    title: a.title,
    value: a.value,
    props: a,
    children: n === "item" && r ? gm(e, r) : void 0,
    raw: t
  };
}
function gm(e, t) {
  const n = [];
  for (const o of t)
    n.push(Y0(e, o));
  return n;
}
function X0(e) {
  return {
    items: y(() => gm(e, e.items))
  };
}
const J0 = X({
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
  "onClick:open": Bt(),
  "onClick:select": Bt(),
  "onUpdate:opened": Bt(),
  ...$0({
    selectStrategy: "single-leaf",
    openStrategy: "list"
  }),
  ...Wn(),
  ...Ne(),
  ...fn(),
  ...Yn(),
  ...Kn(),
  itemType: {
    type: String,
    default: "type"
  },
  ...K0(),
  ...It(),
  ...ot(),
  ...at(),
  ...Eo({
    variant: "text"
  })
}, "VList"), pm = ve()({
  name: "VList",
  props: J0(),
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
    } = X0(e), {
      themeClasses: i
    } = pt(e), {
      backgroundColorClasses: r,
      backgroundColorStyles: s
    } = Rt(le(e, "bgColor")), {
      borderClasses: a
    } = qn(e), {
      densityClasses: l
    } = Nn(e), {
      dimensionStyles: c
    } = Xn(e), {
      elevationClasses: u
    } = Gn(e), {
      roundedClasses: d
    } = Pt(e), {
      children: m,
      open: g,
      parents: h,
      select: v,
      getPath: b
    } = M0(e), k = y(() => e.lines ? `v-list--${e.lines}-line` : void 0), O = le(e, "activeColor"), P = le(e, "baseColor"), B = le(e, "color");
    lm(), Co({
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
    function L(A) {
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
        return Wd(V.value, A);
    }
    return Ee(() => f(e.tag, {
      ref: V,
      class: ["v-list", {
        "v-list--disabled": e.disabled,
        "v-list--nav": e.nav,
        "v-list--slim": e.slim
      }, i.value, r.value, a.value, l.value, u.value, k.value, d.value, e.class],
      style: [s.value, c.value, e.style],
      tabindex: e.disabled || C.value ? -1 : 0,
      role: "listbox",
      "aria-activedescendant": void 0,
      onFocusin: L,
      onFocusout: x,
      onFocus: N,
      onKeydown: $,
      onMousedown: E
    }, {
      default: () => [f(vm, {
        items: o.value,
        returnObject: e.returnObject
      }, n)]
    })), {
      open: g,
      select: v,
      focus: w,
      children: m,
      parents: h,
      getPath: b
    };
  }
}), Z0 = {
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
function Q0(e, t, n, o, i, r) {
  return Q(), Ye(pm, {
    "onClick:select": r.click_toc,
    ref: "tocList"
  }, {
    default: T(() => [
      f(Tr, null, {
        activator: T(({ props: s }) => [
          f(wt, Oe(s, { title: "书籍信息" }), null, 16)
        ]),
        default: T(() => [
          (Q(!0), de(fe, null, Tt(r.meta_items, (s) => (Q(), Ye(wt, {
            key: s.title,
            title: s.title,
            subtitle: s.subtitle,
            lines: "3"
          }, null, 8, ["title", "subtitle"]))), 128))
        ]),
        _: 1
      }),
      f(am),
      (Q(!0), de(fe, null, Tt(n.toc_items, (s, a) => (Q(), de(fe, null, [
        s.subitems.length == 0 ? (Q(), Ye(wt, {
          key: 0,
          "prepend-icon": "mdi-book-open-page-variant-outline",
          title: s.label,
          value: s.href,
          class: Lt({ "current-chapter": r.isCurrentChapter(s) }),
          ref_for: !0,
          ref: "listItem"
        }, null, 8, ["title", "value", "class"])) : (Q(), Ye(Tr, {
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
            (Q(!0), de(fe, null, Tt(s.subitems, (l, c) => (Q(), Ye(wt, {
              key: l.href,
              title: l.label,
              value: l.href,
              class: Lt({ "current-chapter": r.isCurrentChapter(l) }),
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
const ym = /* @__PURE__ */ Un(Z0, [["render", Q0], ["__scopeId", "data-v-f081fe9b"]]), rl = Symbol.for("vuetify:v-slider");
function ew(e, t, n) {
  const o = n === "vertical", i = t.getBoundingClientRect(), r = "touches" in e ? e.touches[0] : e;
  return o ? r.clientY - (i.top + i.height / 2) : r.clientX - (i.left + i.width / 2);
}
function tw(e, t) {
  return "touches" in e && e.touches.length ? e.touches[0][t] : "changedTouches" in e && e.changedTouches.length ? e.changedTouches[0][t] : e[t];
}
const nw = X({
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
  ...It(),
  ...Kn({
    elevation: 2
  }),
  ripple: {
    type: Boolean,
    default: !0
  }
}, "Slider"), ow = (e) => {
  const t = y(() => parseFloat(e.min)), n = y(() => parseFloat(e.max)), o = y(() => +e.step > 0 ? parseFloat(e.step) : 0), i = y(() => Math.max(su(o.value), su(t.value)));
  function r(s) {
    if (s = parseFloat(s), o.value <= 0) return s;
    const a = Sn(s, t.value, n.value), l = t.value % o.value, c = Math.round((a - l) / o.value) * o.value + l;
    return parseFloat(Math.min(c, n.value).toFixed(i.value));
  }
  return {
    min: t,
    max: n,
    step: o,
    decimals: i,
    roundValue: r
  };
}, iw = (e) => {
  let {
    props: t,
    steps: n,
    onSliderStart: o,
    onSliderMove: i,
    onSliderEnd: r,
    getActiveThumb: s
  } = e;
  const {
    isRtl: a
  } = dn(), l = le(t, "reverse"), c = y(() => t.direction === "vertical"), u = y(() => c.value !== l.value), {
    min: d,
    max: m,
    step: g,
    decimals: h,
    roundValue: v
  } = n, b = y(() => parseInt(t.thumbSize, 10)), k = y(() => parseInt(t.tickSize, 10)), O = y(() => parseInt(t.trackSize, 10)), P = y(() => (m.value - d.value) / g.value), B = le(t, "disabled"), C = y(() => t.error || t.disabled ? void 0 : t.thumbColor ?? t.color), V = y(() => t.error || t.disabled ? void 0 : t.trackColor ?? t.color), L = y(() => t.error || t.disabled ? void 0 : t.trackFillColor ?? t.color), x = ke(!1), N = ke(0), $ = se(), E = se();
  function w(J) {
    var _;
    const ye = t.direction === "vertical", De = ye ? "top" : "left", lt = ye ? "height" : "width", Ue = ye ? "clientY" : "clientX", {
      [De]: zt,
      [lt]: Vn
    } = (_ = $.value) == null ? void 0 : _.$el.getBoundingClientRect(), mn = tw(J, Ue);
    let p = Math.min(Math.max((mn - zt - N.value) / Vn, 0), 1) || 0;
    return (ye ? u.value : u.value !== a.value) && (p = 1 - p), v(d.value + p * (m.value - d.value));
  }
  const A = (J) => {
    r({
      value: w(J)
    }), x.value = !1, N.value = 0;
  }, M = (J) => {
    E.value = s(J), E.value && (E.value.focus(), x.value = !0, E.value.contains(J.target) ? N.value = ew(J, E.value, t.direction) : (N.value = 0, i({
      value: w(J)
    })), o({
      value: w(J)
    }));
  }, ee = {
    passive: !0,
    capture: !0
  };
  function ie(J) {
    i({
      value: w(J)
    });
  }
  function ne(J) {
    J.stopPropagation(), J.preventDefault(), A(J), window.removeEventListener("mousemove", ie, ee), window.removeEventListener("mouseup", ne);
  }
  function G(J) {
    var ye;
    A(J), window.removeEventListener("touchmove", ie, ee), (ye = J.target) == null || ye.removeEventListener("touchend", G);
  }
  function Se(J) {
    var ye;
    M(J), window.addEventListener("touchmove", ie, ee), (ye = J.target) == null || ye.addEventListener("touchend", G, {
      passive: !1
    });
  }
  function xe(J) {
    J.preventDefault(), M(J), window.addEventListener("mousemove", ie, ee), window.addEventListener("mouseup", ne, {
      passive: !1
    });
  }
  const we = (J) => {
    const ye = (J - d.value) / (m.value - d.value) * 100;
    return Sn(isNaN(ye) ? 0 : ye, 0, 100);
  }, ce = le(t, "showTicks"), Te = y(() => ce.value ? t.ticks ? Array.isArray(t.ticks) ? t.ticks.map((J) => ({
    value: J,
    position: we(J),
    label: J.toString()
  })) : Object.keys(t.ticks).map((J) => ({
    value: parseFloat(J),
    position: we(parseFloat(J)),
    label: t.ticks[J]
  })) : P.value !== 1 / 0 ? Ta(P.value + 1).map((J) => {
    const ye = d.value + J * g.value;
    return {
      value: ye,
      position: we(ye)
    };
  }) : [] : []), Je = y(() => Te.value.some((J) => {
    let {
      label: ye
    } = J;
    return !!ye;
  })), Ke = {
    activeThumbRef: E,
    color: le(t, "color"),
    decimals: h,
    disabled: B,
    direction: le(t, "direction"),
    elevation: le(t, "elevation"),
    hasLabels: Je,
    isReversed: l,
    indexFromEnd: u,
    min: d,
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
    showTicks: ce,
    startOffset: N,
    step: g,
    thumbSize: b,
    thumbColor: C,
    thumbLabel: le(t, "thumbLabel"),
    ticks: le(t, "ticks"),
    tickSize: k,
    trackColor: V,
    trackContainerRef: $,
    trackFillColor: L,
    trackSize: O,
    vertical: c
  };
  return Et(rl, Ke), Ke;
}, rw = X({
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
}, "VSliderThumb"), sw = ve()({
  name: "VSliderThumb",
  directives: {
    Ripple: Di
  },
  props: rw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = Re(rl), {
      isRtl: r,
      rtlClasses: s
    } = dn();
    if (!i) throw new Error("[Vuetify] v-slider-thumb must be used inside v-slider or v-range-slider");
    const {
      thumbColor: a,
      step: l,
      disabled: c,
      thumbSize: u,
      thumbLabel: d,
      direction: m,
      isReversed: g,
      vertical: h,
      readonly: v,
      elevation: b,
      mousePressed: k,
      decimals: O,
      indexFromEnd: P
    } = i, B = y(() => c.value ? void 0 : b.value), {
      elevationClasses: C
    } = Gn(B), {
      textColorClasses: V,
      textColorStyles: L
    } = ln(a), {
      pageup: x,
      pagedown: N,
      end: $,
      home: E,
      left: w,
      right: A,
      down: M,
      up: ee
    } = Jg, ie = [x, N, $, E, w, A, M, ee], ne = y(() => l.value ? [1, 2, 3] : [1, 5, 10]);
    function G(xe, we) {
      if (!ie.includes(xe.key)) return;
      xe.preventDefault();
      const ce = l.value || 0.1, Te = (e.max - e.min) / ce;
      if ([w, A, M, ee].includes(xe.key)) {
        const Ke = (h.value ? [r.value ? w : A, g.value ? M : ee] : P.value !== r.value ? [w, ee] : [A, ee]).includes(xe.key) ? 1 : -1, J = xe.shiftKey ? 2 : xe.ctrlKey ? 1 : 0;
        we = we + Ke * ce * ne.value[J];
      } else if (xe.key === E)
        we = e.min;
      else if (xe.key === $)
        we = e.max;
      else {
        const Je = xe.key === N ? 1 : -1;
        we = we - Je * ce * (Te > 100 ? Te / 10 : 10);
      }
      return Math.max(e.min, Math.min(e.max, we));
    }
    function Se(xe) {
      const we = G(xe, e.modelValue);
      we != null && o("update:modelValue", we);
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
          "--v-slider-thumb-size": he(u.value)
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
          ...L.value
        }
      }, null), vt(f("div", {
        class: ["v-slider-thumb__ripple", V.value],
        style: L.value
      }, null), [[So("ripple"), e.ripple, null, {
        circle: !0,
        center: !0
      }]]), f(Ff, {
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
          })) ?? e.modelValue.toFixed(l.value ? O.value : 1)])])]), [[zn, d.value && e.focused || d.value === "always"]])];
        }
      })]);
    }), {};
  }
}), aw = X({
  start: {
    type: Number,
    required: !0
  },
  stop: {
    type: Number,
    required: !0
  },
  ...Ne()
}, "VSliderTrack"), lw = ve()({
  name: "VSliderTrack",
  props: aw(),
  emits: {},
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Re(rl);
    if (!o) throw new Error("[Vuetify] v-slider-track must be inside v-slider or v-range-slider");
    const {
      color: i,
      parsedTicks: r,
      rounded: s,
      showTicks: a,
      tickSize: l,
      trackColor: c,
      trackFillColor: u,
      trackSize: d,
      vertical: m,
      min: g,
      max: h,
      indexFromEnd: v
    } = o, {
      roundedClasses: b
    } = Pt(s), {
      backgroundColorClasses: k,
      backgroundColorStyles: O
    } = Rt(u), {
      backgroundColorClasses: P,
      backgroundColorStyles: B
    } = Rt(c), C = y(() => `inset-${m.value ? "block" : "inline"}-${v.value ? "end" : "start"}`), V = y(() => m.value ? "height" : "width"), L = y(() => ({
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
      class: ["v-slider-track", b.value, e.class],
      style: [{
        "--v-slider-track-size": he(d.value),
        "--v-slider-tick-size": he(l.value)
      }, e.style]
    }, [f("div", {
      class: ["v-slider-track__background", P.value, {
        "v-slider-track__background--opacity": !!i.value || !u.value
      }],
      style: {
        ...L.value,
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
}), uw = X({
  ...nl(),
  ...nw(),
  ...es(),
  modelValue: {
    type: [Number, String],
    default: 0
  }
}, "VSlider"), cw = ve()({
  name: "VSlider",
  props: uw(),
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
    const i = se(), {
      rtlClasses: r
    } = dn(), s = ow(e), a = nt(e, "modelValue", void 0, (V) => s.roundValue(V ?? s.min.value)), {
      min: l,
      max: c,
      mousePressed: u,
      roundValue: d,
      onSliderMousedown: m,
      onSliderTouchstart: g,
      trackContainerRef: h,
      position: v,
      hasLabels: b,
      readonly: k
    } = iw({
      props: e,
      steps: s,
      onSliderStart: () => {
        o("start", a.value);
      },
      onSliderEnd: (V) => {
        let {
          value: L
        } = V;
        const x = d(L);
        a.value = x, o("end", x);
      },
      onSliderMove: (V) => {
        let {
          value: L
        } = V;
        return a.value = d(L);
      },
      getActiveThumb: () => {
        var V;
        return (V = i.value) == null ? void 0 : V.$el;
      }
    }), {
      isFocused: O,
      focus: P,
      blur: B
    } = Qr(e), C = y(() => v(a.value));
    return Ee(() => {
      const V = Ho.filterProps(e), L = !!(e.label || n.label || n.prepend);
      return f(Ho, Oe({
        class: ["v-slider", {
          "v-slider--has-labels": !!n["tick-label"] || b.value,
          "v-slider--focused": O.value,
          "v-slider--pressed": u.value,
          "v-slider--disabled": e.disabled
        }, r.value, e.class],
        style: e.style
      }, V, {
        focused: O.value
      }), {
        ...n,
        prepend: L ? (x) => {
          var N, $;
          return f(fe, null, [((N = n.label) == null ? void 0 : N.call(n, x)) ?? (e.label ? f(tl, {
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
          }, null), f(lw, {
            ref: h,
            start: 0,
            stop: C.value
          }, {
            "tick-label": n["tick-label"]
          }), f(sw, {
            ref: i,
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
}), bm = Symbol.for("vuetify:selection-control-group"), _m = X({
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
    default: Oi
  },
  ...Ne(),
  ...fn(),
  ...at()
}, "SelectionControlGroup"), dw = X({
  ..._m({
    defaultsTarget: "VSelectionControl"
  })
}, "VSelectionControlGroup");
ve()({
  name: "VSelectionControlGroup",
  props: dw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = nt(e, "modelValue"), i = Jt(), r = y(() => e.id || `v-selection-control-group-${i}`), s = y(() => e.name || r.value), a = /* @__PURE__ */ new Set();
    return Et(bm, {
      modelValue: o,
      forceUpdate: () => {
        a.forEach((l) => l());
      },
      onForceUpdate: (l) => {
        a.add(l), Dt(() => {
          a.delete(l);
        });
      }
    }), Co({
      [e.defaultsTarget]: {
        color: le(e, "color"),
        disabled: le(e, "disabled"),
        density: le(e, "density"),
        error: le(e, "error"),
        inline: le(e, "inline"),
        modelValue: o,
        multiple: y(() => !!e.multiple || e.multiple == null && Array.isArray(o.value)),
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
const wm = X({
  label: String,
  baseColor: String,
  trueValue: null,
  falseValue: null,
  value: null,
  ...Ne(),
  ..._m()
}, "VSelectionControl");
function fw(e) {
  const t = Re(bm, void 0), {
    densityClasses: n
  } = Nn(e), o = nt(e, "modelValue"), i = y(() => e.trueValue !== void 0 ? e.trueValue : e.value !== void 0 ? e.value : !0), r = y(() => e.falseValue !== void 0 ? e.falseValue : !1), s = y(() => !!e.multiple || e.multiple == null && Array.isArray(o.value)), a = y({
    get() {
      const g = t ? t.modelValue.value : o.value;
      return s.value ? sn(g).some((h) => e.valueComparator(h, i.value)) : e.valueComparator(g, i.value);
    },
    set(g) {
      if (e.readonly) return;
      const h = g ? i.value : r.value;
      let v = h;
      s.value && (v = g ? [...sn(o.value), h] : sn(o.value).filter((b) => !e.valueComparator(b, i.value))), t ? t.modelValue.value = v : o.value = v;
    }
  }), {
    textColorClasses: l,
    textColorStyles: c
  } = ln(y(() => {
    if (!(e.error || e.disabled))
      return a.value ? e.color : e.baseColor;
  })), {
    backgroundColorClasses: u,
    backgroundColorStyles: d
  } = Rt(y(() => a.value && !e.error && !e.disabled ? e.color : e.baseColor)), m = y(() => a.value ? e.trueIcon : e.falseIcon);
  return {
    group: t,
    densityClasses: n,
    trueValue: i,
    falseValue: r,
    model: a,
    textColorClasses: l,
    textColorStyles: c,
    backgroundColorClasses: u,
    backgroundColorStyles: d,
    icon: m
  };
}
const tc = ve()({
  name: "VSelectionControl",
  directives: {
    Ripple: Di
  },
  inheritAttrs: !1,
  props: wm(),
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
      densityClasses: r,
      icon: s,
      model: a,
      textColorClasses: l,
      textColorStyles: c,
      backgroundColorClasses: u,
      backgroundColorStyles: d,
      trueValue: m
    } = fw(e), g = Jt(), h = ke(!1), v = ke(!1), b = se(), k = y(() => e.id || `input-${g}`), O = y(() => !e.disabled && !e.readonly);
    i == null || i.onForceUpdate(() => {
      b.value && (b.value.checked = a.value);
    });
    function P(L) {
      O.value && (h.value = !0, qd(L.target, ":focus-visible") !== !1 && (v.value = !0));
    }
    function B() {
      h.value = !1, v.value = !1;
    }
    function C(L) {
      L.stopPropagation();
    }
    function V(L) {
      if (!O.value) {
        b.value && (b.value.checked = a.value);
        return;
      }
      e.readonly && i && ft(() => i.forceUpdate()), a.value = L.target.checked;
    }
    return Ee(() => {
      var E, w;
      const L = o.label ? o.label({
        label: e.label,
        props: {
          for: k.value
        }
      }) : e.label, [x, N] = Ia(n), $ = f("input", Oe({
        ref: b,
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
      }, [(E = o.default) == null ? void 0 : E.call(o, {
        backgroundColorClasses: u,
        backgroundColorStyles: d
      }), vt(f("div", {
        class: ["v-selection-control__input"]
      }, [((w = o.input) == null ? void 0 : w.call(o, {
        model: a,
        textColorClasses: l,
        textColorStyles: c,
        backgroundColorClasses: u,
        backgroundColorStyles: d,
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
      }, null), $])]), [[So("ripple"), e.ripple && [!e.disabled && !e.readonly, null, ["center", "circle"]]]])]), L && f(tl, {
        for: k.value,
        onClick: C
      }, {
        default: () => [L]
      })]);
    }), {
      isFocused: h,
      input: b
    };
  }
}), mw = X({
  indeterminate: Boolean,
  inset: Boolean,
  flat: Boolean,
  loading: {
    type: [Boolean, String],
    default: !1
  },
  ...es(),
  ...wm()
}, "VSwitch"), Sm = ve()({
  name: "VSwitch",
  inheritAttrs: !1,
  props: mw(),
  emits: {
    "update:focused": (e) => !0,
    "update:modelValue": (e) => !0,
    "update:indeterminate": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = nt(e, "indeterminate"), r = nt(e, "modelValue"), {
      loaderClasses: s
    } = Jr(e), {
      isFocused: a,
      focus: l,
      blur: c
    } = Qr(e), u = se(), d = je && window.matchMedia("(forced-colors: active)").matches, m = y(() => typeof e.loading == "string" && e.loading !== "" ? e.loading : e.color), g = Jt(), h = y(() => e.id || `switch-${g}`);
    function v() {
      i.value && (i.value = !1);
    }
    function b(k) {
      var O, P;
      k.stopPropagation(), k.preventDefault(), (P = (O = u.value) == null ? void 0 : O.input) == null || P.click();
    }
    return Ee(() => {
      const [k, O] = Ia(n), P = Ho.filterProps(e), B = tc.filterProps(e);
      return f(Ho, Oe({
        class: ["v-switch", {
          "v-switch--flat": e.flat
        }, {
          "v-switch--inset": e.inset
        }, {
          "v-switch--indeterminate": i.value
        }, s.value, e.class]
      }, k, P, {
        modelValue: r.value,
        "onUpdate:modelValue": (C) => r.value = C,
        id: h.value,
        focused: a.value,
        style: e.style
      }), {
        ...o,
        default: (C) => {
          let {
            id: V,
            messagesId: L,
            isDisabled: x,
            isReadonly: N,
            isValid: $
          } = C;
          const E = {
            model: r,
            isValid: $
          };
          return f(tc, Oe({
            ref: u
          }, B, {
            modelValue: r.value,
            "onUpdate:modelValue": [(w) => r.value = w, v],
            id: V.value,
            "aria-describedby": L.value,
            type: "checkbox",
            "aria-checked": i.value ? "mixed" : void 0,
            disabled: x.value,
            readonly: N.value,
            onFocus: l,
            onBlur: c
          }, O), {
            ...o,
            default: (w) => {
              let {
                backgroundColorClasses: A,
                backgroundColorStyles: M
              } = w;
              return f("div", {
                class: ["v-switch__track", d ? void 0 : A.value],
                style: M.value,
                onClick: b
              }, [o["track-true"] && f("div", {
                key: "prepend",
                class: "v-switch__track-true"
              }, [o["track-true"](E)]), o["track-false"] && f("div", {
                key: "append",
                class: "v-switch__track-false"
              }, [o["track-false"](E)])]);
            },
            input: (w) => {
              let {
                inputNode: A,
                icon: M,
                backgroundColorClasses: ee,
                backgroundColorStyles: ie
              } = w;
              return f(fe, null, [A, f("div", {
                class: ["v-switch__thumb", {
                  "v-switch__thumb--filled": M || e.loading
                }, e.inset || d ? void 0 : ee.value],
                style: e.inset ? void 0 : ie.value
              }, [o.thumb ? f(mt, {
                defaults: {
                  VIcon: {
                    icon: M,
                    size: "x-small"
                  }
                }
              }, {
                default: () => [o.thumb({
                  ...E,
                  icon: M
                })]
              }) : f(Ff, null, {
                default: () => [e.loading ? f(Ua, {
                  name: "v-switch",
                  active: !0,
                  color: $.value === !1 ? void 0 : m.value
                }, {
                  default: (ne) => o.loader ? o.loader(ne) : f(Yr, {
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
}), hw = {
  name: "ReaderSettings",
  emits: ["update", "open-themes"],
  computed: {
    // 设置面板里的 4 个快捷图标（纯色主题）
    quick_themes: function() {
      return this.themes.filter((e) => e.type === "solid");
    }
  },
  mounted: function() {
    var e, t, n, o, i, r, s, a, l, c, u;
    this.opt = {
      flow: ((e = this.settings) == null ? void 0 : e.flow) || this.opt.flow,
      theme: ((t = this.settings) == null ? void 0 : t.theme) || this.opt.theme,
      theme_mode: ((n = this.settings) == null ? void 0 : n.theme_mode) || this.opt.theme_mode,
      font_size: ((o = this.settings) == null ? void 0 : o.font_size) || this.opt.font_size,
      line_height: ((i = this.settings) == null ? void 0 : i.line_height) || this.opt.line_height,
      letter_spacing: ((r = this.settings) == null ? void 0 : r.letter_spacing) || this.opt.letter_spacing,
      brightness: ((s = this.settings) == null ? void 0 : s.brightness) || this.opt.brightness,
      show_comments: ((a = this.settings) == null ? void 0 : a.show_comments) ?? this.opt.show_comments,
      show_selection_toolbar: ((l = this.settings) == null ? void 0 : l.show_selection_toolbar) ?? this.opt.show_selection_toolbar,
      paging_control: ((c = this.settings) == null ? void 0 : c.paging_control) || this.opt.paging_control,
      wheel_paging: ((u = this.settings) == null ? void 0 : u.wheel_paging) ?? this.opt.wheel_paging
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
    themes: Ln
  })
}, vw = { class: "d-inline-blockx text-center" }, gw = { class: "d-inline-blockx text-center" }, pw = { class: "d-inline-blockx text-center" }, yw = { class: "setting-switch-row" }, bw = ["id", "for"];
function _w(e, t, n, o, i, r) {
  return Q(), Ye(pm, {
    class: "reader-settings",
    density: "compact"
  }, {
    default: T(() => [
      f(wt, { class: "my-2" }, {
        default: T(() => [
          f(oo, { class: "align-center" }, {
            default: T(() => [
              f(We, { cols: "2" }, {
                default: T(() => t[16] || (t[16] = [
                  H("span", null, "亮度", -1)
                ])),
                _: 1
              }),
              f(We, { cols: "9" }, {
                default: T(() => [
                  f(cw, {
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
          f(oo, { class: "align-center gx-3" }, {
            default: T(() => [
              f(We, { cols: "2" }, {
                default: T(() => t[17] || (t[17] = [
                  H("span", { class: "text-justify" }, "字体", -1)
                ])),
                _: 1
              }),
              f(We, { cols: "2" }, {
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
              f(We, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: T(() => [
                  H("span", vw, be(e.opt.font_size), 1)
                ]),
                _: 1
              }),
              f(We, { cols: "3" }, {
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
              f(We, { cols: "3" }, {
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
          f(oo, { class: "align-center" }, {
            default: T(() => [
              f(We, { cols: "2" }, {
                default: T(() => t[21] || (t[21] = [
                  H("span", null, "行距", -1)
                ])),
                _: 1
              }),
              f(We, { cols: "2" }, {
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
              f(We, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: T(() => [
                  H("span", gw, be(e.opt.line_height.toFixed(1)), 1)
                ]),
                _: 1
              }),
              f(We, { cols: "3" }, {
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
              f(We, { cols: "3" }, {
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
          f(oo, { class: "align-center" }, {
            default: T(() => [
              f(We, { cols: "2" }, {
                default: T(() => t[25] || (t[25] = [
                  H("span", null, "间距", -1)
                ])),
                _: 1
              }),
              f(We, { cols: "2" }, {
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
              f(We, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: T(() => [
                  H("span", pw, be(e.opt.letter_spacing) + "px", 1)
                ]),
                _: 1
              }),
              f(We, { cols: "3" }, {
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
              f(We, { cols: "3" }, {
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
          f(oo, { class: "align-center" }, {
            default: T(() => [
              f(We, { cols: "2" }, {
                default: T(() => t[29] || (t[29] = [
                  H("span", null, "翻页", -1)
                ])),
                _: 1
              }),
              f(We, { cols: "10" }, {
                default: T(() => [
                  f(Cr, {
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
          f(oo, { class: "align-center" }, {
            default: T(() => [
              f(We, { cols: "2" }, {
                default: T(() => t[32] || (t[32] = [
                  H("span", null, "控制", -1)
                ])),
                _: 1
              }),
              f(We, { cols: "10" }, {
                default: T(() => [
                  f(Cr, {
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
      (Q(!0), de(fe, null, Tt(e.switch_options, (s) => (Q(), Ye(wt, {
        key: s.key,
        class: "my-2",
        "data-setting": s.key
      }, {
        default: T(() => [
          H("div", yw, [
            H("label", {
              class: "setting-switch-label",
              id: `setting-${s.key}`,
              for: `switch-${s.key}`
            }, be(s.label), 9, bw),
            f(Sm, {
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
          f(oo, {
            class: "align-center",
            "no-gutters": ""
          }, {
            default: T(() => [
              f(We, { cols: "2" }, {
                default: T(() => t[35] || (t[35] = [
                  H("span", { density: "compact" }, "皮肤", -1)
                ])),
                _: 1
              }),
              (Q(!0), de(fe, null, Tt(r.quick_themes, (s) => (Q(), Ye(We, {
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
              f(We, {
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
const km = /* @__PURE__ */ Un(hw, [["render", _w], ["__scopeId", "data-v-bcc696c5"]]), oa = "data-candle-audiobook-active", sl = "candle-audiobook", al = "candle-audiobook-active";
function jo(e) {
  return String(e || "").replace(/\s+/g, "").trim();
}
function ww(e, t) {
  let n = 0, o = e.length - 1, i = -1;
  for (; n <= o; ) {
    const s = Math.floor((n + o) / 2);
    Number(e[s].start_ms) <= t ? (i = s, n = s + 1) : o = s - 1;
  }
  if (i < 0) return null;
  const r = e[i];
  return t < Number(r.end_ms) ? r : null;
}
function nc(e) {
  return decodeURIComponent(String(e || "").split(/[?#]/)[0]).replace(/^\.\//, "").replace(/^\//, "");
}
function ia(e, t) {
  const n = nc(e), o = nc(t);
  return !n || !o ? !1 : n === o || n.endsWith(`/${o}`) || o.endsWith(`/${n}`) || n.split("/").pop() === o.split("/").pop();
}
function Cm(e) {
  var t, n, o, i;
  return ((t = e == null ? void 0 : e.section) == null ? void 0 : t.href) || ((n = e == null ? void 0 : e.section) == null ? void 0 : n.url) || ((i = (o = e == null ? void 0 : e.document) == null ? void 0 : o.location) == null ? void 0 : i.pathname) || "";
}
function xs(e, t) {
  var r, s, a;
  const n = ((r = e == null ? void 0 : e.views) == null ? void 0 : r.call(e)) || [];
  let o = null;
  if ((s = n.forEach) == null || s.call(n, (l) => {
    var c, u;
    !o && ia(((c = l == null ? void 0 : l.section) == null ? void 0 : c.href) || ((u = l == null ? void 0 : l.section) == null ? void 0 : u.url), t) && (o = l);
  }), o != null && o.contents) return o.contents;
  const i = ((a = e == null ? void 0 : e.getContents) == null ? void 0 : a.call(e)) || [];
  return t ? i.find((l) => ia(Cm(l), t)) || null : i[0] || null;
}
function Sw(e, t) {
  return Array.from((e == null ? void 0 : e.children) || []).filter((n) => {
    var o;
    return ((o = n.localName) == null ? void 0 : o.toLowerCase()) === t;
  });
}
function kw(e, t) {
  const n = String(t || "").replace(/^\/+/, "").split("/").filter(Boolean);
  if (!n.length) return null;
  let o = e.documentElement;
  for (const i of n) {
    const r = i.match(/^([\w-]+)(?:\[(\d+)\])?$/);
    if (!r) return null;
    const s = r[1].toLowerCase(), a = Math.max(0, Number(r[2] || 1) - 1);
    if (s === "html") {
      o = e.documentElement;
      continue;
    }
    if (s === "body") {
      o = e.body;
      continue;
    }
    if (o = Sw(o, s)[a], !o) return null;
  }
  return o;
}
function Cw(e, t) {
  const n = jo(t);
  if (!n) return null;
  const o = e.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, div");
  return Array.from(o).find((i) => {
    const r = jo(i.textContent);
    return r === n || r.includes(n) || n.includes(r);
  }) || null;
}
function Ew(e, t) {
  const n = e == null ? void 0 : e.document, o = (t == null ? void 0 : t.locator) || {};
  if (!n) return null;
  let i = o.element_id ? n.getElementById(o.element_id) : null;
  return !i && o.dom_path && (i = kw(n, o.dom_path)), i || (i = Cw(n, t.text)), i ? { document: n, element: i, locator: o } : null;
}
function xw(e) {
  const t = [], n = e.ownerDocument.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  let o = n.nextNode();
  for (; o; )
    t.push(o), o = n.nextNode();
  return t;
}
function oc(e, t) {
  let n = Math.max(0, t);
  for (const i of e) {
    if (n <= i.data.length) return { node: i, offset: n };
    n -= i.data.length;
  }
  const o = e[e.length - 1];
  return o ? { node: o, offset: o.data.length } : null;
}
function Nw(e, t, n) {
  const o = xw(e);
  if (!o.length) return null;
  const i = o.reduce((d, m) => d + m.data.length, 0), r = Math.min(i, Math.max(0, Number(t) || 0)), s = Number(n), a = Math.min(i, Number.isFinite(s) && s > r ? s : i), l = oc(o, r), c = oc(o, a);
  if (!l || !c) return null;
  const u = e.ownerDocument.createRange();
  return u.setStart(l.node, l.offset), u.setEnd(c.node, c.offset), u;
}
function Vw(e) {
  if (e.getElementById("candle-audiobook-highlight-style")) return;
  const t = e.createElement("style");
  t.id = "candle-audiobook-highlight-style", t.textContent = `
    ::highlight(${sl}) {
      background: rgba(245, 166, 35, .34);
      text-decoration: underline 2px rgba(180, 92, 0, .75);
      text-underline-offset: .18em;
    }
    .${al} {
      background: rgba(245, 166, 35, .2) !important;
      box-shadow: inset 3px 0 rgba(180, 92, 0, .72);
    }
  `, e.head.appendChild(t);
}
function Em(e) {
  var n;
  (((n = e == null ? void 0 : e.getContents) == null ? void 0 : n.call(e)) || []).forEach((o) => {
    var r, s, a;
    const i = o.document;
    i && ((a = (s = (r = i.defaultView) == null ? void 0 : r.CSS) == null ? void 0 : s.highlights) == null || a.delete(sl), i.querySelectorAll(`[${oa}]`).forEach((l) => {
      l.removeAttribute(oa), l.classList.remove(al);
    }));
  });
}
function Ow(e, t, n) {
  var c, u;
  Em(e);
  const o = Ew(t, n);
  if (!o) return null;
  const { document: i, element: r, locator: s } = o;
  Vw(i), r.setAttribute(oa, n.id || ""), r.classList.add(al);
  const a = Nw(r, s.start_char, s.end_char), l = i.defaultView;
  return a && ((c = l == null ? void 0 : l.CSS) != null && c.highlights) && l.Highlight && l.CSS.highlights.set(sl, new l.Highlight(a)), (u = r.scrollIntoView) == null || u.call(r, { block: "center", behavior: "smooth" }), { contents: t, document: i, element: r, range: a };
}
function Tw(e, t) {
  return ia(e == null ? void 0 : e.source_key, t);
}
function Aw(e, t) {
  var i;
  if (!e || !t) return !1;
  if ((i = e.locator) != null && i.element_id && e.locator.element_id === t.id) return !0;
  const n = jo(e.text), o = jo(t.textContent);
  return !!(n && o && (o.includes(n) || n.includes(o)));
}
const Dw = {
  key: 0,
  class: "audiobook-player",
  "data-testid": "candle-audiobook-player",
  "aria-label": "边听边读播放器"
}, Iw = { class: "player-heading" }, Pw = {
  key: 0,
  class: "player-error",
  role: "alert"
}, $w = { class: "player-controls" }, Mw = ["disabled"], Fw = ["aria-label", "disabled"], Lw = ["disabled"], Bw = { class: "time" }, Rw = ["max", "value"], Hw = { class: "time" }, jw = { class: "rate-control" }, zw = ["value"], Uw = 50, Ww = 100, qw = 40, Kw = {
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
    const o = e, i = n, r = se(null), s = se(null), a = se(null), l = se([]), c = se(null), u = se(!1), d = se(!1), m = se(""), g = se(0), h = se(0), v = se(1), b = se(!0), k = se(""), O = se(0), P = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];
    let B = null, C = null, V = null, L = "", x = 0, N = 0;
    const $ = y(() => {
      var D;
      return ((D = s.value) == null ? void 0 : D.chapters) || [];
    }), E = y(() => $.value.findIndex((D) => {
      var F;
      return D.id === ((F = a.value) == null ? void 0 : F.id);
    })), w = y(() => `candle:audiobook:${o.storageId || "manifest"}`);
    _e(
      () => [o.visible, o.repository],
      ([D]) => {
        D && A();
      },
      { immediate: !0 }
    ), _e(
      () => o.rendition,
      (D, F) => {
        var re, me;
        (re = F == null ? void 0 : F.off) == null || re.call(F, "rendered", Vn), (me = D == null ? void 0 : D.on) == null || me.call(D, "rendered", Vn);
      },
      { immediate: !0 }
    );
    function A() {
      return s.value || !o.repository ? Promise.resolve() : V || (V = M().finally(() => {
        V = null;
      }), V);
    }
    async function M() {
      var D, F;
      d.value = !0, m.value = "";
      try {
        const re = await o.repository.manifest();
        s.value = re.manifest, O.value = ((D = re.progress) == null ? void 0 : D.version) || 0;
        const me = K(), oe = $.value.find((Le) => {
          var et;
          return Le.id === ((et = re.progress) == null ? void 0 : et.chapter_id);
        }) || $.value.find((Le) => Le.number === me.chapterNumber) || $.value[0], Ae = ((F = re.progress) == null ? void 0 : F.position_ms) ?? me.positionMs ?? 0;
        v.value = me.rate || 1, await ie(oe, { startMs: Ae, autoplay: !1, navigate: !1 });
      } catch (re) {
        m.value = (re == null ? void 0 : re.message) || "有声书加载失败";
      } finally {
        d.value = !1;
      }
    }
    async function ee(D) {
      try {
        l.value = await o.repository.timeline({ manifest_id: s.value.id, chapter: D });
      } catch (F) {
        console.warn("有声书时间轴加载失败：", F), l.value = [];
      }
    }
    async function ie(D, { startMs: F = 0, autoplay: re = !1, navigate: me = !0 } = {}) {
      if (D) {
        d.value = !0, m.value = "", mn();
        try {
          a.value = D, g.value = Math.max(0, Number(F) || 0), h.value = Number(D.duration_ms) || 0, await ee(D), me && b.value && await ne(D), await ft();
          const oe = r.value;
          if (!oe) return;
          const Ae = new URL(D.audio_url, window.location.href).href;
          oe.src !== Ae && (oe.src = D.audio_url, oe.load()), await ce(oe), oe.playbackRate = v.value, oe.currentTime = Math.min(g.value / 1e3, oe.duration || 1 / 0), z(), Ue(!0), re && await Se();
        } catch (oe) {
          m.value = (oe == null ? void 0 : oe.message) || "章节音频加载失败";
        } finally {
          d.value = !1;
        }
      }
    }
    async function ne(D) {
      !o.rendition || !(D != null && D.source_key) || await o.rendition.display(D.source_key);
    }
    async function G() {
      if (!(k.value || !s.value))
        try {
          k.value = await o.repository.startSession({ manifest_id: s.value.id, source: "candle", device_id: "candle-reader" });
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
        } catch (F) {
          m.value = (F == null ? void 0 : F.name) === "NotAllowedError" ? "请再次点击播放" : "无法播放章节音频";
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
    function ce(D) {
      return D.readyState >= HTMLMediaElement.HAVE_METADATA ? Promise.resolve() : new Promise((F, re) => {
        const me = () => {
          Ae(), F();
        }, oe = () => {
          Ae(), re(new Error("章节音频元数据加载失败"));
        }, Ae = () => {
          D.removeEventListener("loadedmetadata", me), D.removeEventListener("error", oe);
        };
        D.addEventListener("loadedmetadata", me), D.addEventListener("error", oe);
      });
    }
    function Te() {
      u.value = !0, N = Date.now(), Ue(!0), ye(), ge();
    }
    function Je() {
      u.value = !1, De(), lt(), q(!0), z();
    }
    async function Ke() {
      u.value = !1, De(), await q(!0, E.value === $.value.length - 1), E.value < $.value.length - 1 && await ie($.value[E.value + 1], { autoplay: !0 });
    }
    function J() {
      var D;
      (D = r.value) != null && D.src && (m.value = "章节音频加载失败", u.value = !1, De());
    }
    function ye() {
      De(), B = window.setInterval(lt, 150), C = window.setInterval(() => void q(), 1e4);
    }
    function De() {
      B && window.clearInterval(B), C && window.clearInterval(C), B = null, C = null;
    }
    function lt() {
      const D = r.value;
      D && (g.value = Math.round(D.currentTime * 1e3), Ue(), z());
    }
    function Ue(D = !1) {
      const F = ww(l.value, g.value), re = (F == null ? void 0 : F.id) || "";
      if (!(!D && re === L)) {
        if (L = re, c.value = F, i("segment-change", F), !F || !b.value || !u.value) {
          mn();
          return;
        }
        zt(F);
      }
    }
    async function zt(D) {
      var Ae, Le;
      const F = ++x, me = (D.locator || {}).href || ((Ae = a.value) == null ? void 0 : Ae.source_key);
      let oe = xs(o.rendition, me);
      !oe && o.rendition && b.value && await o.rendition.display(me);
      for (let et = 0; et < qw; et += 1) {
        if (F !== x || !b.value) return;
        if (oe = xs(o.rendition, me), oe && Ow(o.rendition, oe, D)) {
          if (await new Promise((Jn) => window.setTimeout(Jn, Ww)), F !== x || !b.value) return;
          const Ge = xs(o.rendition, me), Mt = (Le = Ge == null ? void 0 : Ge.document) == null ? void 0 : Le.querySelector("[data-candle-audiobook-active]");
          if ((Mt == null ? void 0 : Mt.getAttribute("data-candle-audiobook-active")) === D.id) return;
        }
        await new Promise((Ge) => window.setTimeout(Ge, Uw));
      }
      F === x && b.value && console.warn("[candle-audiobook] 无法定位时间轴片段", D.id);
    }
    function Vn() {
      c.value && b.value && u.value && zt(c.value);
    }
    function mn() {
      x += 1, Em(o.rendition);
    }
    function p() {
      !a.value || !c.value || (b.value = !1, mn());
    }
    async function _() {
      b.value = !0, c.value && await zt(c.value);
    }
    function I(D) {
      const F = r.value;
      g.value = Math.max(0, Math.min(h.value, D)), F && (F.currentTime = g.value / 1e3), Ue(!0), z();
    }
    function U() {
      r.value && (r.value.playbackRate = v.value), z();
    }
    async function R() {
      E.value > 0 && await ie($.value[E.value - 1], { autoplay: u.value });
    }
    async function j() {
      E.value < $.value.length - 1 && await ie($.value[E.value + 1], { autoplay: u.value });
    }
    async function Y(D) {
      var Mt, Jn, ut, yt, Wo, Ii, ll, ul, cl;
      if (s.value || await A(), !s.value || !D) return !1;
      b.value = !0;
      const F = ((Mt = D.toc) == null ? void 0 : Mt.href) || ((Jn = D.toc) == null ? void 0 : Jn.id) || Cm(D.contents), re = $.value.find((Zn) => Tw(Zn, F)) || a.value || $.value[0];
      (re == null ? void 0 : re.id) !== ((ut = a.value) == null ? void 0 : ut.id) && await ie(re, { navigate: !1 });
      const me = ((Wo = (yt = D.cfi) == null ? void 0 : yt.toString) == null ? void 0 : Wo.call(yt)) || D.cfi, oe = me && ((ll = (Ii = o.rendition) == null ? void 0 : Ii.getRange) == null ? void 0 : ll.call(Ii, me)), Ae = ((ul = oe == null ? void 0 : oe.startContainer) == null ? void 0 : ul.nodeType) === Node.TEXT_NODE ? oe.startContainer.parentElement : oe == null ? void 0 : oe.startContainer, Le = ((cl = Ae == null ? void 0 : Ae.closest) == null ? void 0 : cl.call(Ae, "p, h1, h2, h3, h4, h5, h6, li, blockquote")) || null, et = jo(Le == null ? void 0 : Le.textContent), Ge = et && l.value.find((Zn) => jo(Zn.text) === et) || Le && l.value.find((Zn) => Aw(Zn, Le)) || l.value.find((Zn) => Number(Zn.index) === Number(D.segment_id));
      return Ge ? (await ie(re, { startMs: Ge.start_ms, autoplay: !0, navigate: !0 }), !0) : !1;
    }
    async function q(D = !1, F = !1) {
      var oe;
      if (!k.value || !a.value) return;
      const re = Date.now(), me = u.value && N ? Math.min(6e4, Math.max(0, re - N)) : 0;
      if (!(!D && me < 9e3)) {
        N = re;
        try {
          const Ae = await o.repository.reportProgress({
            session_id: k.value,
            chapter_id: a.value.id,
            position_ms: g.value,
            segment_id: ((oe = c.value) == null ? void 0 : oe.id) || "",
            listened_delta_ms: me,
            completed: F,
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
      }), navigator.mediaSession.setActionHandler("previoustrack", R), navigator.mediaSession.setActionHandler("nexttrack", j));
    }
    function Z(D) {
      const F = Math.max(0, Math.floor((D || 0) / 1e3));
      return `${Math.floor(F / 60)}:${String(F % 60).padStart(2, "0")}`;
    }
    return gt(() => {
      var D, F;
      De(), (F = (D = o.rendition) == null ? void 0 : D.off) == null || F.call(D, "rendered", Vn), mn(), k.value && o.repository.endSession({ session_id: k.value }).catch((re) => console.warn("有声书收听会话结束失败：", re));
    }), t({ loadManifest: A, playFromSelection: Y, returnToNarration: _, suspendFollow: p }), (D, F) => {
      var re, me;
      return e.visible ? (Q(), de("section", Dw, [
        H("header", Iw, [
          H("div", null, [
            F[3] || (F[3] = H("span", { class: "player-kicker" }, "边听边读", -1)),
            H("strong", null, be(((re = a.value) == null ? void 0 : re.title) || "正在载入有声书"), 1)
          ]),
          H("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "关闭听书播放器",
            onClick: F[0] || (F[0] = (oe) => i("close"))
          }, [
            f(Ve, { size: "20" }, {
              default: T(() => F[4] || (F[4] = [
                te("mdi-close")
              ])),
              _: 1
            })
          ])
        ]),
        H("p", {
          class: Lt(["active-dialogue", { muted: !c.value }])
        }, be(((me = c.value) == null ? void 0 : me.text) || (d.value ? "正在加载章节时间轴…" : "片段间留白")), 3),
        m.value ? (Q(), de("div", Pw, be(m.value), 1)) : qe("", !0),
        H("div", $w, [
          H("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "上一章",
            disabled: E.value <= 0,
            onClick: R
          }, [
            f(Ve, null, {
              default: T(() => F[5] || (F[5] = [
                te("mdi-skip-previous")
              ])),
              _: 1
            })
          ], 8, Mw),
          H("button", {
            type: "button",
            class: "play-button",
            "aria-label": u.value ? "暂停听书" : "播放听书",
            disabled: d.value || !a.value,
            onClick: xe
          }, [
            f(Ve, null, {
              default: T(() => [
                te(be(u.value ? "mdi-pause" : "mdi-play"), 1)
              ]),
              _: 1
            })
          ], 8, Fw),
          H("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "下一章",
            disabled: E.value >= $.value.length - 1,
            onClick: j
          }, [
            f(Ve, null, {
              default: T(() => F[6] || (F[6] = [
                te("mdi-skip-next")
              ])),
              _: 1
            })
          ], 8, Lw),
          H("span", Bw, be(Z(g.value)), 1),
          H("input", {
            class: "timeline-slider",
            type: "range",
            min: "0",
            max: Math.max(h.value, 1),
            step: "100",
            value: g.value,
            "aria-label": "听书进度",
            onInput: F[1] || (F[1] = (oe) => I(Number(oe.target.value)))
          }, null, 40, Rw),
          H("span", Hw, be(Z(h.value)), 1),
          H("label", jw, [
            F[7] || (F[7] = H("span", { class: "sr-only" }, "播放速度", -1)),
            vt(H("select", {
              "onUpdate:modelValue": F[2] || (F[2] = (oe) => v.value = oe),
              "aria-label": "播放速度",
              onChange: U
            }, [
              (Q(), de(fe, null, Tt(P, (oe) => H("option", {
                key: oe,
                value: oe
              }, "x" + be(oe), 9, zw)), 64))
            ], 544), [
              [
                Fg,
                v.value,
                void 0,
                { number: !0 }
              ]
            ])
          ])
        ]),
        b.value ? qe("", !0) : (Q(), de("button", {
          key: 1,
          type: "button",
          class: "return-button",
          "data-testid": "return-to-narration",
          onClick: _
        }, [
          f(Ve, { size: "18" }, {
            default: T(() => F[8] || (F[8] = [
              te("mdi-target")
            ])),
            _: 1
          }),
          F[9] || (F[9] = te(" 回到朗读位置 "))
        ])),
        H("audio", {
          ref_key: "audioElement",
          ref: r,
          preload: "metadata",
          onLoadedmetadata: we,
          onPlay: Te,
          onPause: Je,
          onEnded: Ke,
          onError: J
        }, null, 544)
      ])) : qe("", !0);
    };
  }
}, xm = /* @__PURE__ */ Un(Kw, [["__scopeId", "data-v-3a739039"]]);
function Gw(e = {}) {
  const t = e.show_comments ?? !0, n = e.show_annotations ?? !0, o = e.notes_enabled ?? !0;
  return {
    notes_settings_version: 3,
    show_comments: o && t,
    show_selection_toolbar: o && (e.show_selection_toolbar ?? n)
  };
}
const Yw = ["manifest", "timeline"];
function Xw({ callbacks: e, bookId: t, bookUrl: n } = {}) {
  if (!e) return null;
  if (Yw.some((s) => typeof e[s] != "function"))
    throw new Error("audiobook_callbacks 必须同时提供 manifest 和 timeline 函数");
  const o = { book_id: t || null, book_url: n || "" }, i = (s, a = {}) => e[s]({ ...o, ...a }), r = (s) => typeof e[s] == "function";
  return {
    // → { manifest: { id, chapters: [...] }, progress: { chapter_id, position_ms, version } | null }
    async manifest() {
      var l;
      const s = await i("manifest"), a = s == null ? void 0 : s.manifest;
      if (!((l = a == null ? void 0 : a.chapters) != null && l.length)) throw new Error("当前书籍没有可播放章节");
      return { manifest: a, progress: s.progress || null };
    },
    // → 时间轴片段数组；宿主可以返回数组、{ segments } 或 { timeline: { segments } }
    async timeline(s) {
      var c;
      const a = await i("timeline", s), l = Array.isArray(a) ? a : (a == null ? void 0 : a.segments) || ((c = a == null ? void 0 : a.timeline) == null ? void 0 : c.segments);
      return Array.isArray(l) ? l : [];
    },
    // 收听进度三个回调都是可选的；宿主不提供时只在本机记住位置。
    async startSession(s) {
      if (!r("start_session")) return "";
      const a = await i("start_session", s);
      return String((a == null ? void 0 : a.session_id) || "");
    },
    async reportProgress(s) {
      if (!r("report_progress")) return null;
      const a = await i("report_progress", s);
      return (a == null ? void 0 : a.version) ?? null;
    },
    async endSession(s) {
      r("end_session") && await i("end_session", s);
    }
  };
}
const Jw = X({
  ...Ne(),
  ...qy({
    fullHeight: !0
  }),
  ...at()
}, "VApp"), Zw = ve()({
  name: "VApp",
  props: Jw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = pt(e), {
      layoutClasses: i,
      getLayoutItem: r,
      items: s,
      layoutRef: a
    } = Gy(e), {
      rtlClasses: l
    } = dn();
    return Ee(() => {
      var c;
      return f("div", {
        ref: a,
        class: ["v-application", o.themeClasses.value, i.value, l.value, e.class],
        style: [e.style]
      }, [f("div", {
        class: "v-application__wrap"
      }, [(c = n.default) == null ? void 0 : c.call(n)])]);
    }), {
      getLayoutItem: r,
      items: s,
      theme: o
    };
  }
}), Qw = X({
  text: String,
  ...Ne(),
  ...ot()
}, "VToolbarTitle"), e1 = ve()({
  name: "VToolbarTitle",
  props: Qw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return Ee(() => {
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
}), t1 = [null, "prominent", "default", "comfortable", "compact"], Nm = X({
  absolute: Boolean,
  collapse: Boolean,
  color: String,
  density: {
    type: String,
    default: "default",
    validator: (e) => t1.includes(e)
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
  ...Wn(),
  ...Ne(),
  ...Kn(),
  ...It(),
  ...ot({
    tag: "header"
  }),
  ...at()
}, "VToolbar"), ic = ve()({
  name: "VToolbar",
  props: Nm(),
  setup(e, t) {
    var g;
    let {
      slots: n
    } = t;
    const {
      backgroundColorClasses: o,
      backgroundColorStyles: i
    } = Rt(le(e, "color")), {
      borderClasses: r
    } = qn(e), {
      elevationClasses: s
    } = Gn(e), {
      roundedClasses: a
    } = Pt(e), {
      themeClasses: l
    } = pt(e), {
      rtlClasses: c
    } = dn(), u = ke(!!(e.extended || (g = n.extension) != null && g.call(n))), d = y(() => parseInt(Number(e.height) + (e.density === "prominent" ? Number(e.height) : 0) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0), 10)), m = y(() => u.value ? parseInt(Number(e.extensionHeight) + (e.density === "prominent" ? Number(e.extensionHeight) : 0) - (e.density === "comfortable" ? 4 : 0) - (e.density === "compact" ? 8 : 0), 10) : 0);
    return Co({
      VBtn: {
        variant: "text"
      }
    }), Ee(() => {
      var k;
      const h = !!(e.title || n.title), v = !!(n.image || e.image), b = (k = n.extension) == null ? void 0 : k.call(n);
      return u.value = !!(e.extended || b), f(e.tag, {
        class: ["v-toolbar", {
          "v-toolbar--absolute": e.absolute,
          "v-toolbar--collapse": e.collapse,
          "v-toolbar--flat": e.flat,
          "v-toolbar--floating": e.floating,
          [`v-toolbar--density-${e.density}`]: !0
        }, o.value, r.value, s.value, a.value, l.value, c.value, e.class],
        style: [i.value, e.style]
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
        }, n.image) : f(Ya, {
          key: "image-img",
          cover: !0,
          src: e.image
        }, null)]), f(mt, {
          defaults: {
            VTabs: {
              height: he(d.value)
            }
          }
        }, {
          default: () => {
            var O, P, B;
            return [f("div", {
              class: "v-toolbar__content",
              style: {
                height: he(d.value)
              }
            }, [n.prepend && f("div", {
              class: "v-toolbar__prepend"
            }, [(O = n.prepend) == null ? void 0 : O.call(n)]), h && f(e1, {
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
          default: () => [f(Bf, null, {
            default: () => [u.value && f("div", {
              class: "v-toolbar__extension",
              style: {
                height: he(m.value)
              }
            }, [b])]
          })]
        })]
      });
    }), {
      contentHeight: d,
      extensionHeight: m
    };
  }
}), n1 = X({
  scrollTarget: {
    type: String
  },
  scrollThreshold: {
    type: [String, Number],
    default: 300
  }
}, "scroll");
function o1(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const {
    canScroll: n
  } = t;
  let o = 0, i = 0;
  const r = se(null), s = ke(0), a = ke(0), l = ke(0), c = ke(!1), u = ke(!1), d = y(() => Number(e.scrollThreshold)), m = y(() => Sn((d.value - s.value) / d.value || 0)), g = () => {
    const h = r.value;
    if (!h || n && !n.value) return;
    o = s.value, s.value = "window" in h ? h.pageYOffset : h.scrollTop;
    const v = h instanceof Window ? document.documentElement.scrollHeight : h.scrollHeight;
    if (i !== v) {
      i = v;
      return;
    }
    u.value = s.value < o, l.value = Math.abs(s.value - d.value);
  };
  return _e(u, () => {
    a.value = a.value || s.value;
  }), _e(c, () => {
    a.value = 0;
  }), un(() => {
    _e(() => e.scrollTarget, (h) => {
      var b;
      const v = h ? document.querySelector(h) : window;
      if (!v) {
        Fn(`Unable to locate element with identifier ${h}`);
        return;
      }
      v !== r.value && ((b = r.value) == null || b.removeEventListener("scroll", g), r.value = v, r.value.addEventListener("scroll", g, {
        passive: !0
      }));
    }, {
      immediate: !0
    });
  }), gt(() => {
    var h;
    (h = r.value) == null || h.removeEventListener("scroll", g);
  }), n && _e(n, g, {
    immediate: !0
  }), {
    scrollThreshold: d,
    currentScroll: s,
    currentThreshold: l,
    isScrollActive: c,
    scrollRatio: m,
    // required only for testing
    // probably can be removed
    // later (2 chars chlng)
    isScrollingUp: u,
    savedScroll: a
  };
}
const i1 = X({
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
  ...Nm(),
  ...mf(),
  ...n1(),
  height: {
    type: [Number, String],
    default: 64
  }
}, "VAppBar"), r1 = ve()({
  name: "VAppBar",
  props: i1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = se(), i = nt(e, "modelValue"), r = y(() => {
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
      !i.value;
    }), {
      currentScroll: a,
      scrollThreshold: l,
      isScrollingUp: c,
      scrollRatio: u
    } = o1(e, {
      canScroll: s
    }), d = y(() => r.value.hide || r.value.fullyHide), m = y(() => e.collapse || r.value.collapse && (r.value.inverted ? u.value > 0 : u.value === 0)), g = y(() => e.flat || r.value.fullyHide && !i.value || r.value.elevate && (r.value.inverted ? a.value > 0 : a.value === 0)), h = y(() => r.value.fadeImage ? r.value.inverted ? 1 - u.value : u.value : void 0), v = y(() => {
      var B, C;
      if (r.value.hide && r.value.inverted) return 0;
      const O = ((B = o.value) == null ? void 0 : B.contentHeight) ?? 0, P = ((C = o.value) == null ? void 0 : C.extensionHeight) ?? 0;
      return d.value ? a.value < l.value || r.value.fullyHide ? O + P : O : O + P;
    });
    Hn(y(() => !!e.scrollBehavior), () => {
      Xt(() => {
        d.value ? r.value.inverted ? i.value = a.value > l.value : i.value = c.value || a.value < l.value : i.value = !0;
      });
    });
    const {
      ssrBootStyles: b
    } = ts(), {
      layoutItemStyles: k
    } = vf({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: le(e, "location"),
      layoutSize: v,
      elementSize: ke(void 0),
      active: i,
      absolute: le(e, "absolute")
    });
    return Ee(() => {
      const O = ic.filterProps(e);
      return f(ic, Oe({
        ref: o,
        class: ["v-app-bar", {
          "v-app-bar--bottom": e.location === "bottom"
        }, e.class],
        style: [{
          ...k.value,
          "--v-toolbar-image-opacity": h.value,
          height: void 0,
          ...b.value
        }, e.style]
      }, O, {
        collapse: m.value,
        flat: g.value
      }), n);
    }), {};
  }
}), s1 = X({
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
  ...Wn(),
  ...Ne(),
  ...fn(),
  ...Kn(),
  ...It(),
  ...mf({
    name: "bottom-navigation"
  }),
  ...ot({
    tag: "header"
  }),
  ...yf({
    selectedClass: "v-btn--selected"
  }),
  ...at()
}, "VBottomNavigation"), a1 = ve()({
  name: "VBottomNavigation",
  props: s1(),
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
    } = Wy(), {
      borderClasses: i
    } = qn(e), {
      backgroundColorClasses: r,
      backgroundColorStyles: s
    } = Rt(le(e, "bgColor")), {
      densityClasses: a
    } = Nn(e), {
      elevationClasses: l
    } = Gn(e), {
      roundedClasses: c
    } = Pt(e), {
      ssrBootStyles: u
    } = ts(), d = y(() => Number(e.height) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0)), m = nt(e, "active", e.active), {
      layoutItemStyles: g
    } = vf({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: y(() => "bottom"),
      layoutSize: y(() => m.value ? d.value : 0),
      elementSize: d,
      active: m,
      absolute: le(e, "absolute")
    });
    return bf(e, Ha), Co({
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
      }, o.value, r.value, i.value, a.value, l.value, c.value, e.class],
      style: [s.value, g.value, {
        height: he(d.value)
      }, u.value, e.style]
    }, {
      default: () => [n.default && f("div", {
        class: "v-bottom-navigation__content"
      }, [n.default()])]
    })), {};
  }
}), l1 = X({
  inset: Boolean,
  ...Wf({
    transition: "bottom-sheet-transition"
  })
}, "VBottomSheet"), zi = ve()({
  name: "VBottomSheet",
  props: l1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = nt(e, "modelValue");
    return Ee(() => {
      const i = Bn.filterProps(e);
      return f(Bn, Oe(i, {
        contentClass: ["v-bottom-sheet__content", e.contentClass],
        modelValue: o.value,
        "onUpdate:modelValue": (r) => o.value = r,
        class: ["v-bottom-sheet", {
          "v-bottom-sheet--inset": e.inset
        }, e.class],
        style: e.style
      }), n);
    }), {};
  }
}), u1 = X({
  scrollable: Boolean,
  ...Ne(),
  ...Yn(),
  ...ot({
    tag: "main"
  })
}, "VMain"), c1 = ve()({
  name: "VMain",
  props: u1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      dimensionStyles: o
    } = Xn(e), {
      mainStyles: i
    } = hf(), {
      ssrBootStyles: r
    } = ts();
    return Ee(() => f(e.tag, {
      class: ["v-main", {
        "v-main--scrollable": e.scrollable
      }, e.class],
      style: [i.value, r.value, o.value, e.style]
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
function d1(e) {
  const t = ke(e());
  let n = -1;
  function o() {
    clearInterval(n);
  }
  function i() {
    o(), ft(() => t.value = e());
  }
  function r(s) {
    const a = s ? getComputedStyle(s) : {
      transitionDuration: 0.2
    }, l = parseFloat(a.transitionDuration) * 1e3 || 200;
    if (o(), t.value <= 0) return;
    const c = performance.now();
    n = window.setInterval(() => {
      const u = performance.now() - c + l;
      t.value = Math.max(e() - u, 0), t.value <= 0 && o();
    }, l);
  }
  return Dt(o), {
    clear: o,
    time: t,
    start: r,
    reset: i
  };
}
const f1 = X({
  multiLine: Boolean,
  text: String,
  timer: [Boolean, String],
  timeout: {
    type: [Number, String],
    default: 5e3
  },
  vertical: Boolean,
  ...Xr({
    location: "bottom"
  }),
  ...Wa(),
  ...It(),
  ...Eo(),
  ...at(),
  ...Aa(Ja({
    transition: "v-snackbar-transition"
  }), ["persistent", "noClickAnimation", "scrim", "scrollStrategy"])
}, "VSnackbar"), m1 = ve()({
  name: "VSnackbar",
  props: f1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = nt(e, "modelValue"), {
      positionClasses: i
    } = qa(e), {
      scopeId: r
    } = Xa(), {
      themeClasses: s
    } = pt(e), {
      colorClasses: a,
      colorStyles: l,
      variantClasses: c
    } = Ai(e), {
      roundedClasses: u
    } = Pt(e), d = d1(() => Number(e.timeout)), m = se(), g = se(), h = ke(!1), v = ke(0), b = se(), k = Re(gi, void 0);
    Hn(() => !!k, () => {
      const E = hf();
      Xt(() => {
        b.value = E.mainStyles.value;
      });
    }), _e(o, P), _e(() => e.timeout, P), un(() => {
      o.value && P();
    });
    let O = -1;
    function P() {
      d.reset(), window.clearTimeout(O);
      const E = Number(e.timeout);
      if (!o.value || E === -1) return;
      const w = Bd(g.value);
      d.start(w), O = window.setTimeout(() => {
        o.value = !1;
      }, E);
    }
    function B() {
      d.reset(), window.clearTimeout(O);
    }
    function C() {
      h.value = !0, B();
    }
    function V() {
      h.value = !1, P();
    }
    function L(E) {
      v.value = E.touches[0].clientY;
    }
    function x(E) {
      Math.abs(v.value - E.changedTouches[0].clientY) > 50 && (o.value = !1);
    }
    function N() {
      h.value && V();
    }
    const $ = y(() => e.location.split(" ").reduce((E, w) => (E[`v-snackbar--${w}`] = !0, E), {}));
    return Ee(() => {
      const E = bi.filterProps(e), w = !!(n.default || n.text || e.text);
      return f(bi, Oe({
        ref: m,
        class: ["v-snackbar", {
          "v-snackbar--active": o.value,
          "v-snackbar--multi-line": e.multiLine && !e.vertical,
          "v-snackbar--timer": !!e.timer,
          "v-snackbar--vertical": e.vertical
        }, $.value, i.value, e.class],
        style: [b.value, e.style]
      }, E, {
        modelValue: o.value,
        "onUpdate:modelValue": (A) => o.value = A,
        contentProps: Oe({
          class: ["v-snackbar__wrapper", s.value, a.value, u.value, c.value],
          style: [l.value],
          onPointerenter: C,
          onPointerleave: V
        }, E.contentProps),
        persistent: !0,
        noClickAnimation: !0,
        scrim: !1,
        scrollStrategy: "none",
        _disableGlobalStack: !0,
        onTouchstartPassive: L,
        onTouchend: x,
        onAfterLeave: N
      }, r), {
        default: () => {
          var A, M;
          return [Ti(!1, "v-snackbar"), e.timer && !h.value && f("div", {
            key: "timer",
            class: "v-snackbar__timer"
          }, [f(Sf, {
            ref: g,
            color: typeof e.timer == "string" ? e.timer : "info",
            max: e.timeout,
            "model-value": d.time.value
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
              isActive: o
            })])]
          })];
        },
        activator: n.activator
      });
    }), Za({}, m);
  }
}), rc = "candle-reader:comment-public", h1 = 6e4, v1 = {
  name: "EpubReader",
  components: {
    Settings: km,
    BookToc: ym,
    ReaderComments: sm,
    AudiobookPlayer: xm
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
      return vn(this.settings.theme).mode === "day" ? "mdi-weather-night" : "mdi-weather-sunny";
    },
    switch_theme_text: function() {
      return vn(this.settings.theme).mode === "day" ? "夜晚" : "白天";
    },
    foot_color: function() {
      const e = vn(this.settings.theme);
      return e.bgBottom || e.bg;
    },
    status_bar_style: function() {
      const e = vn(this.settings.theme);
      return e.type !== "image" ? {} : { color: e.text, backgroundColor: "transparent" };
    },
    // 「更多主题」窗口按白天/夜晚分区
    theme_groups: function() {
      return [
        { mode: "day", label: "白天", items: Ln.filter((e) => e.mode === "day") },
        { mode: "night", label: "夜晚", items: Ln.filter((e) => e.mode === "night") }
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
        this.annotation_repository = Zb({
          callbacks: this.annotation_callbacks,
          bookId: this.initial_book_id,
          bookUrl: this.book_url
        });
      } catch (e) {
        console.error("Candle Reader annotations could not be initialized:", e);
      }
      try {
        this.audiobook_repository = Xw({
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
            () => this.open_comments("chapter"),
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
    // 读取本章自己的划线与评论，用于在正文绘制标记。
    load_chapter_annotations: async function(e) {
      if (!e || !this.annotation_repository || !this.comments_enabled) return;
      const t = ++this.annotation_chapter_request;
      try {
        const n = await this.annotation_repository.load({ chapter: e });
        if (t !== this.annotation_chapter_request) return;
        n.forEach(this.render_annotation);
      } catch (n) {
        console.warn("Candle Reader chapter annotations could not be loaded:", n);
      }
    },
    open_comments: function(e, t = null) {
      var n;
      this.comment_paragraph = t, this.hide_toolbar(), this.menu.current_panel !== "annotations" && this.set_menu("annotations"), (n = this.$refs.comments) == null || n.show(e, (t == null ? void 0 : t.paragraph_cfi) || "");
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
      this.clear_annotation_marks(), this.load_chapter_annotations(this.comment_chapter), this.refresh_comment_icons();
    },
    read_public_preference: function() {
      try {
        return localStorage.getItem(rc) !== "false";
      } catch {
        return !0;
      }
    },
    save_annotation: async function(e, t, n) {
      var a, l, c, u;
      if (!this.user)
        return this.request_login(), null;
      const o = e === "highlight" ? this.selected_location : this.annotation_editor_location, i = e === "note", r = i ? o == null ? void 0 : o.paragraph_cfi : o == null ? void 0 : o.cfi, s = i && !(o != null && o.multi_paragraph) ? o == null ? void 0 : o.paragraph_quote_text : o == null ? void 0 : o.quote_text;
      if (!r || !s || !this.annotation_repository || this.annotation_saving) return null;
      this.annotation_saving = !0;
      try {
        const d = await this.annotation_repository.save({
          client_id: o.client_id || Io(),
          annotation_type: e,
          is_private: e === "highlight" ? !0 : n,
          chapter: String(((a = o.toc) == null ? void 0 : a.label) || this.current_toc_title || "").trim(),
          // 评论归属段落（跨段时为最后一段）与真实选区分开保存。
          cfi: String(r),
          range_cfi: String(o.cfi || r),
          quote_text: s,
          content: t,
          color: i ? "blue" : "yellow"
        });
        this.render_annotation(d), this.hide_toolbar();
        try {
          (u = (c = (l = o.contents) == null ? void 0 : l.window) == null ? void 0 : c.getSelection()) == null || u.removeAllRanges();
        } catch {
        }
        return this.selected_location === o && (this.selected_location = {}), d;
      } catch (d) {
        return this.show_annotation_feedback(`保存失败：${d.message || "请稍后重试"}`, !0), null;
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
      e === "paragraph" && ((t = this.comment_paragraph) != null && t.paragraph_cfi) ? this.open_editor({ location: { ...this.comment_paragraph, client_id: Io() } }) : this.open_editor({ type: "book_comment" });
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
      let o = null;
      if (n || this.annotation_editor_type === "book_comment") {
        if (this.annotation_saving) return;
        this.annotation_saving = !0;
        try {
          o = await this.annotation_repository.save(n ? { id: n.id, client_id: n.client_id, annotation_type: n.annotation_type, content: e, is_private: t } : {
            client_id: Io(),
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
        o = await this.save_annotation("note", e, t);
      if (!o) return;
      if (!n)
        try {
          localStorage.setItem(rc, String(!t));
        } catch {
        }
      this.annotation_editor_open = !1, (r = this.$refs.comments) == null || r.apply_saved(o), this.on_comments_changed();
      const i = o.annotation_type === "book_comment" ? "全书评论" : "";
      this.show_annotation_feedback(t ? "已保存为私密，可在「查看更多评论 › 我的」中查看" : i ? `评论已保存，可在「${i}」中查看` : "评论已保存");
    },
    on_annotation_editor_closed: function() {
      var t, n, o, i;
      const e = this.annotation_editor_location;
      if (this.annotation_editor_location = null, this.annotation_editor_record = null, e && this.selected_location === e) {
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
      const t = vn(this.settings.theme).mode === "day" ? this.settings.theme_night || "grey" : this.settings.theme_day || "white";
      this.apply_theme(t), this.save_settings();
    },
    // 应用一套主题（按 id）。solid 走 themes.css 的 class；image 走外层背景图 + iframe 透明 + 文字色强制。
    apply_theme: function(e) {
      const t = vn(e);
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
      e = e || vn(this.settings.theme), document.documentElement.style.backgroundColor = e.bgTop || e.bg, document.body.style.backgroundColor = e.bgTop || e.bg;
      const t = document.querySelector('meta[name="theme-color"]');
      t && t.setAttribute("content", e.bgTop || e.bg);
    },
    // 背景图铺在 #main（v-main）上：覆盖上/下状态栏与正文区域，整屏一张图连续衔接。
    // image 皮肤按屏幕方向选竖版/横版大图（cover）；正文 iframe 与状态栏透明后透出。
    // （图放在主文档而非 iframe 内——iframe 在分栏模式下宽达数十万 px，背景会被拉伸失效。）
    apply_skin_background: function(e) {
      e = e || vn(this.settings.theme);
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
      e = e || vn(this.settings.theme), this.rendition.getContents().forEach((o) => {
        const i = o.document && o.document.getElementById("epubjs-inserted-css-default");
        i && i.parentNode && i.parentNode.removeChild(i);
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
      var i, r;
      if (e !== this.panel_closing || Object.values(this.menu.panels).some(Boolean) || this.show_theme_dialog || this.annotation_editor_open) return;
      const t = (s) => (s == null ? void 0 : s.isConnected) && !s.disabled && !s.closest("[inert], .v-overlay") && s.getClientRects().length, n = ((i = this.$refs[this.panel_entry_ref]) == null ? void 0 : i.$el) || ((r = this.$refs.panelEntryAnnotations) == null ? void 0 : r.$el), o = t(this.panel_trigger) ? this.panel_trigger : n;
      t(o) && o.focus({ preventScroll: !0 }), this.panel_closing = null, this.panel_trigger = null;
    },
    set_menu: function(e) {
      var o, i;
      var t = e;
      if (this.menu.current_panel == t && this.menu.panels[t] === !0 && (t = "hide"), t !== "annotations" && ((o = this.$refs.comments) == null || o.close_pages()), t === "hide")
        this.menu.current_panel !== "hide" && (this.panel_closing = this.menu.current_panel);
      else {
        const r = document.activeElement, s = (r == null ? void 0 : r.matches("button, a[href], [tabindex]")) && !r.closest(".v-overlay");
        if (s || !this.panel_trigger) {
          const a = { settings: "panelEntrySettings", toc: "panelEntryToc", ai: "panelEntryAi" };
          this.panel_entry_ref = a[t] || "panelEntryAnnotations", this.panel_trigger = s ? r : (i = this.$refs[this.panel_entry_ref]) == null ? void 0 : i.$el;
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
      if (this.apply_theme(this.settings.theme), t && !this.comments_enabled ? (this.annotation_chapter_request++, this.clear_annotation_marks()) : !t && this.comments_enabled && this.load_chapter_annotations(this.comment_chapter), t !== this.comments_enabled && this.refresh_comment_icons(), this.settings.show_selection_toolbar || this.hide_toolbar(), e.brightness !== void 0) {
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
      const t = /* @__PURE__ */ new Date() - this.mouse_down_time, n = this.mouse_down_point, o = !!(n && e) && Math.hypot(e.clientX - n.x, e.clientY - n.y) > 8;
      this.check_if_selected_content = t > 600 || o;
    },
    on_click_content: function(e) {
      var t, n, o;
      if ((e == null ? void 0 : e.type) === "click" && ((o = (n = (t = e.view) == null ? void 0 : t.getSelection) == null ? void 0 : n.call(t)) == null ? void 0 : o.isCollapsed) === !1 && (e.detail >= 2 || this.mouse_down_point && Math.hypot(e.clientX - this.mouse_down_point.x, e.clientY - this.mouse_down_point.y) > 8)) {
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
      for (const o of ((t = this.rendition) == null ? void 0 : t.getContents()) || []) {
        const i = (n = o.window) == null ? void 0 : n.getSelection();
        i && !i.isCollapsed && (i.removeAllRanges(), e = !0);
      }
      return e && this.clear_selection_preview(), e;
    },
    smart_click: function(e) {
      const t = e.view.frameElement.getBoundingClientRect(), n = document.getElementById("reader"), o = n.offsetWidth, i = n.offsetHeight, r = (e.clientX + t.x) % n.offsetWidth, s = (e.clientY + t.y) % n.offsetHeight;
      if (this.debug_click(r, s, o, i), this.is_toolbar_visible()) {
        this.hide_toolbar();
        return;
      }
      const a = o < this.wide_screen, l = a ? 3 : 5, c = this.settings.paging_control === "keyboard_only";
      r < o / l || a && s < i / l ? c || (this.suspend_audiobook_follow(), this.rendition.prev()) : r > o * (l - 1) / l || a && s > i * (l - 1) / l ? c || (this.suspend_audiobook_follow(), this.rendition.next().then()) : (console.log("-- toggle menu"), this.menu.show_navbar = !this.menu.show_navbar);
    },
    bin_search: function(e, t, n) {
      for (var o = 0, i = e.length; o < i; ) {
        const s = Math.floor((o + i) / 2);
        if (s == o)
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
        l < 0 && (i = s), l > 0 && (o = s);
      }
      const r = e[o];
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
    find_toc_in_same_file: function(e, t, n) {
      var s;
      const o = [], i = (a) => a.forEach((l) => {
        var c;
        String(l.href || "").split("#")[0] === n && o.push(l), (c = l.subitems) != null && c.length && i(l.subitems);
      });
      i(this.toc_items);
      let r;
      for (const a of o) {
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
      const n = new ePub.CFI(e.toString()), o = this.book.spine.get(t.sectionIndex), i = this.find_same_href_in_toc_tree(this.toc_items, o.href);
      if (console.log("got spine href in toc:", i), i === void 0) {
        const s = this.find_toc_in_same_file(n, t, o.href);
        if (s) return s;
        if (t.annotationFallbackToc) return t.annotationFallbackToc;
        const a = t.document.body, l = a.querySelector("h1, h2, h3, h4, h5, h6");
        return t.annotationFallbackToc = {
          href: o.href,
          label: (l == null ? void 0 : l.textContent.trim()) || `正文 ${o.index + 1}`,
          elem: a,
          cfi: new ePub.CFI(a, t.cfiBase),
          subitems: [],
          is_fallback: !0
        }, t.annotationFallbackToc;
      }
      if (i.elem === void 0) {
        const s = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
        for (let l of s) {
          const c = t.document.getElementsByTagName(l);
          if (c.length > 0) {
            i.elem = c[0];
            break;
          }
        }
        const a = new ePub.CFI(i.elem, t.cfiBase);
        i.cfi = new ePub.CFI(a.toString());
      }
      var r = i;
      return i.subitems.length > 0 && (r = this.bin_search(i.subitems, n, t), this.book.locations.epubcfi.compare(n, r.cfi) < 0 && (r = i)), console.log("find_toc = ", r), r;
    },
    count_distinct_between: function(e, t) {
      for (var n = t; n && n.parentElement != e.parentNode; )
        n = n.parentElement;
      if (!n) {
        const r = Array.from(e.ownerDocument.querySelectorAll("p, h1, h2, h3, h4, h5, h6")), s = r.findIndex((a) => a === e || a.contains(e) || e.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING);
        return Math.max(0, r.indexOf(t) - s);
      }
      let o = 0, i = e;
      for (; i && i !== n; ) {
        const r = i.nodeName.toUpperCase();
        if ((r === "P" || r[0] === "H") && o++, i.firstChild)
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
      e || (this.selection_active = !1), this.toolbar_left = -999, e || this.clear_selection_preview();
    },
    show_toolbar: function(e, t) {
      if (!this.settings.show_selection_toolbar) return;
      console.log("show toolbar at rect", e, " from iframe rect", t);
      const n = e.left + t.x, o = e.top + t.y, i = e.bottom + t.y;
      this.toolbar_left = 8, this.toolbar_top = i + 12, this.$nextTick(() => {
        var g;
        const r = this.$refs.selectionToolbar;
        if (!r || !this.settings.show_selection_toolbar) return;
        const { width: s, height: a } = r.getBoundingClientRect(), l = Math.max(8, window.innerWidth - s - 8);
        this.toolbar_left = Math.max(8, Math.min(l, n));
        const c = this.menu.show_navbar ? 64 : 8, u = o >= a + 12 + 8, d = i + 12 + a <= window.innerHeight - c, m = ((g = window.matchMedia) == null ? void 0 : g.call(window, "(pointer: coarse)").matches) && d;
        this.toolbar_top = u && !m ? o - a - 12 : Math.min(window.innerHeight - a - c, i + 12);
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
      }), o = [];
      for (; n.nextNode(); ) o.push(n.currentNode);
      if (!o.length) return {};
      const i = t.document.createRange();
      return i.setStart(o[0], 0), i.setEnd(o[o.length - 1], o[o.length - 1].length), {
        paragraph_cfi: t.cfiFromRange(i),
        paragraph_quote_text: o.map((r) => r.textContent).join("").trim()
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
      const n = this.rendition.getRange(e) || t.range(e), o = n.startContainer.nodeType === Node.TEXT_NODE ? n.startContainer.parentElement : n.startContainer, i = o.closest("p, h1, h2, h3, h4, h5, h6") || o;
      console.log("selected elem =", i);
      const r = new ePub.CFI(i, t.cfiBase), s = this.find_toc(r, t);
      console.log("cfi = ", r, "toc =", s);
      let a = 0;
      try {
        a = s.is_fallback ? Math.max(0, Array.from(s.elem.querySelectorAll("p, h1, h2, h3, h4, h5, h6")).indexOf(i)) : this.count_distinct_between(s.elem, i);
      } catch (c) {
        console.warn("Candle Reader paragraph index could not be computed:", c);
      }
      this.selected_location = {
        client_id: Io(),
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
      if (!this.settings.wheel_paging || this.settings.flow !== "paginated" || !this.rendition || this.menu.current_panel !== "hide" || e.ctrlKey || e.metaKey || e.altKey) return;
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
      var t, n, o;
      this.settings.flow !== "paginated" || ((t = e.touches) == null ? void 0 : t.length) > 1 || (o = (n = e.target) == null ? void 0 : n.closest) != null && o.call(n, "#main, .v-app-bar, .v-bottom-navigation") && e.cancelable && e.preventDefault();
    },
    init_themes: function() {
      console.log("load themes from:", this.themes_css), Ln.forEach((e) => this.rendition.themes.register(e.id, this.themes_css)), this.apply_theme(this.settings.theme);
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
        const t = new ePub.CFI(e.start), o = this.rendition.getContents().find((r) => r.sectionIndex === e.index);
        if (!o)
          return;
        const i = this.find_toc(t, o);
        i && (this.current_toc_title = i.label, this.current_toc = i, this.last_toc_label !== i.label && (this.load_comments_summary(o, i), this.load_chapter_annotations(i.label.trim()), this.last_toc_label = i.label));
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
        return t.load_time = /* @__PURE__ */ new Date(), this.annotation_repository.summary({ chapter: t.label.trim() }).then((o) => {
          !this.comments_enabled || n !== this.comments_request || (t.summary = o, this.add_comment_icons(e, t));
        }).catch(function(o) {
          console.error("加载评论数量出现错误：", o);
        });
    },
    add_comment_icons: function(e, t) {
      !this.comments_enabled || !e || (t.summary || []).forEach((n) => {
        const o = String(n.paragraph_cfi || "");
        if (!(!n.count || !o.includes(e.cfiBase)))
          try {
            const i = e.range(o);
            i && this.add_icon_into_paragraph(e, this.paragraph_of(i.endContainer, e), n, t);
          } catch (i) {
            console.warn("Candle Reader comment bubble could not be placed:", o, i);
          }
      });
    },
    add_icon_into_paragraph: function(e, t, n, o) {
      if (t.querySelector(".comment-icon"))
        return;
      const i = e.document, r = i.createElement("div");
      r.className = "comment-icon";
      const s = i.createElement("span");
      s.className = "comment-count", s.textContent = String(n.count), r.appendChild(s);
      const a = i.createElement("span");
      a.className = "comment-anchor", a.appendChild(r), t.appendChild(a), this.fit_comment_icon(r, a, t), r.addEventListener("click", (l) => {
        l.stopPropagation(), this.open_comments("paragraph", { toc: o, contents: e, ...this.paragraph_location(t, e), paragraph_cfi: String(n.paragraph_cfi) });
      });
    },
    // 段落最后一个可见字的位置。段尾常有 <br> 或换行空白，锚点会落到下一行，气泡要以最后一个字为准。
    last_char_rect: function(e) {
      const t = e.ownerDocument, n = t.createTreeWalker(e, NodeFilter.SHOW_TEXT, {
        acceptNode: (a) => a.parentElement.closest(".comment-anchor, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
      });
      let o = null;
      for (; n.nextNode(); )
        /\S/.test(n.currentNode.textContent) && (o = n.currentNode);
      if (!o) return null;
      const i = o.textContent.search(/\s*$/), r = t.createRange();
      r.setStart(o, i - 1), r.setEnd(o, i);
      const s = Array.from(r.getClientRects()).filter((a) => a.width || a.height);
      return s[s.length - 1] || null;
    },
    // 气泡紧跟段落最后一个字，与末行垂直居中，不另起一行。
    // 末行写满时允许伸进页边距（body 的右内边距），再多就会被翻页窗口裁掉，此时把气泡向左收回页内。
    fit_comment_icon: function(e, t, n) {
      e.style.left = "", e.style.top = "";
      const o = n.ownerDocument, i = t.getBoundingClientRect(), r = this.last_char_rect(n);
      r && (e.style.left = `${r.right - i.left}px`, e.style.top = `${r.top + r.height / 2 - i.top}px`);
      const s = e.getBoundingClientRect(), a = s.top + s.height / 2, l = Array.from(n.getClientRects()).find((d) => s.left >= d.left - 1 && s.left <= d.right + 1 && a >= d.top - 1 && a <= d.bottom + 1) || n.getBoundingClientRect(), c = parseFloat(o.defaultView.getComputedStyle(o.body).paddingRight) || 0, u = s.right - (l.right + Math.max(c - 2, 0));
      u > 0 && (e.style.left = `${(parseFloat(e.style.left) || 0) - u}px`);
    },
    refit_comment_icons: function() {
      var e;
      for (const t of ((e = this.rendition) == null ? void 0 : e.getContents()) || [])
        t.document.querySelectorAll(".comment-anchor").forEach((n) => {
          const o = n.querySelector(".comment-icon");
          o && n.parentElement && this.fit_comment_icon(o, n, n.parentElement);
        });
    },
    refresh_comment_icons: function() {
      var e;
      if (this.comments_request++, !!this.rendition) {
        for (const t of this.rendition.getContents())
          t.document.querySelectorAll(".comment-anchor, .comment-icon").forEach((n) => n.remove());
        if (this.comments_enabled && ((e = this.current_toc) != null && e.elem)) {
          delete this.current_toc.load_time;
          const t = this.rendition.getContents().find((n) => n.document === this.current_toc.elem.ownerDocument);
          t && this.load_comments_summary(t, this.current_toc);
        }
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
          const i = localStorage.getItem(n) || this.display_url;
          return i ? this.rendition.display(i) : this.rendition.display();
        }).then(this.on_book_loaded).catch(this.on_book_load_failed), this.rendition.on("relocated", (o) => {
          localStorage.setItem(n, o.start.cfi);
        });
      } catch (n) {
        this.on_book_load_failed(n);
      }
    },
    // 超过 LOAD_TIMEOUT_MS 仍未显示正文时提示「加载较慢」，但不中断加载；加载完成后自动关闭提示。
    start_load_timer: function() {
      clearTimeout(this.loadingTimeout), this.load_failed = !1, this.loadingTimeout = setTimeout(() => {
        this.loading && (console.warn("电子书加载较慢，显示提示框"), this.showTimeoutDialog = !0);
      }, h1);
    },
    on_book_loaded: function() {
      clearTimeout(this.loadingTimeout), this.loading = !1, this.showTimeoutDialog = !1;
    },
    on_book_load_failed: function(e) {
      clearTimeout(this.loadingTimeout), console.error("加载电子书失败:", e), this.loading = !1, this.load_failed = !0, this.showTimeoutDialog = !0;
    }
  },
  mounted: function() {
    const e = document.createElement("link");
    e.rel = "stylesheet", e.type = "text/css", e.href = this.themes_css, document.head.appendChild(e);
    const t = localStorage.getItem("readerSettings");
    if (t) {
      const o = this.$options.data().settings, i = JSON.parse(t);
      this.settings = Object.assign({}, o);
      for (const r in i)
        i[r] !== void 0 && (this.settings[r] = i[r]);
      Object.assign(this.settings, Gw(i)), delete this.settings.notes_enabled, delete this.settings.show_annotations;
    }
    this.initialize_annotations(), this.load_user(), this.is_debug_signal = this.debug, this.is_debug_click = this.debug, this.start_load_timer(), this.loading = !0, this.book = ePub(this.book_url), this.rendition = this.book.renderTo("reader", {
      manager: "continuous",
      flow: this.settings.flow,
      width: "100%",
      height: "100%"
      //snap: true
    }), this.book.loaded.metadata.then((o) => {
      console.log(o), this.book_meta = o, this.book_title = o.title;
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
      this.on_book_loaded();
      const o = this.settings.brightness / 100;
      document.getElementById("main").style.filter = `brightness(${o})`, this.rendition.themes.fontSize(this.settings.font_size + "px"), this.apply_theme(this.settings.theme);
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
    // 上一次的章节标题，用于检测章节变化
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
}, g1 = { class: "annotation-sheet-body" }, p1 = { class: "annotation-editor-header" }, y1 = { id: "annotation-editor-title" }, b1 = {
  key: 0,
  class: "annotation-editor-reference",
  "aria-labelledby": "annotation-reference-title"
}, _1 = { class: "annotation-reference-heading" }, w1 = { class: "annotation-reference-chapter" }, S1 = {
  class: "annotation-editor-quote",
  tabindex: "0",
  "aria-label": "引用原文"
}, k1 = { class: "annotation-editor-hint" }, C1 = {
  key: 1,
  class: "annotation-editor-hint annotation-editor-book-hint"
}, E1 = { class: "annotation-editor-footer" }, x1 = { class: "annotation-visibility-row" }, N1 = {
  id: "annotation-visibility-hint",
  class: "annotation-editor-hint annotation-visibility-hint",
  "aria-live": "polite"
}, V1 = { class: "selection-toolbar-actions" }, O1 = {
  id: "status-bar-left",
  class: "align-start"
}, T1 = {
  id: "status-bar-right",
  class: "align-end"
}, A1 = { class: "progress-bar-container" }, D1 = { class: "theme-group-label" }, I1 = { class: "theme-grid" }, P1 = ["onClick"], $1 = {
  key: 1,
  class: "theme-badge"
}, M1 = { class: "theme-name" };
function F1(e, t, n, o, i, r) {
  const s = xm, a = km, l = ym, c = sm;
  return Q(), Ye(Zw, {
    theme: e.settings.theme,
    "full-height": "",
    density: "compact"
  }, {
    default: T(() => [
      H("div", {
        id: "safe-bottom",
        style: Ut({ backgroundColor: r.foot_color })
      }, null, 4),
      e.menu.show_navbar ? (Q(), Ye(r1, {
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
                  te(be(e.is_debug_signal ? "mdi-arrow-left" : "mdi-candle"), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["title"])
        ]),
        default: T(() => [
          te(" " + be(e.is_debug_signal ? e.alert_msg : e.book_title) + " ", 1),
          f(er),
          r.has_audiobook ? (Q(), Ye(Ce, {
            key: 0,
            "min-height": "44",
            onClick: r.open_audiobook,
            title: "听书"
          }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => t[31] || (t[31] = [
                  te("mdi-headphones")
                ])),
                _: 1
              }),
              t[32] || (t[32] = H("span", null, "听书", -1))
            ]),
            _: 1
          }, 8, ["onClick"])) : qe("", !0),
          f(Ce, {
            ref: "panelEntryAi",
            icon: "",
            title: "更多选项",
            onClick: t[0] || (t[0] = (u) => r.set_menu("ai"))
          }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => t[33] || (t[33] = [
                  te("mdi-dots-vertical")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 512)
        ]),
        _: 1
      })) : qe("", !0),
      f(a1, {
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
                default: T(() => t[34] || (t[34] = [
                  te("mdi-book-open-variant-outline")
                ])),
                _: 1
              }),
              t[35] || (t[35] = H("span", null, "目录", -1))
            ]),
            _: 1
          }, 512),
          f(Ce, { onClick: r.switch_theme }, {
            default: T(() => [
              f(Ve, null, {
                default: T(() => [
                  te(be(r.switch_theme_icon), 1)
                ]),
                _: 1
              }),
              H("span", null, be(r.switch_theme_text), 1)
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
                default: T(() => t[36] || (t[36] = [
                  te("mdi-comment-text-outline")
                ])),
                _: 1
              }),
              t[37] || (t[37] = H("span", null, "评论", -1))
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
                default: T(() => t[38] || (t[38] = [
                  te("mdi-cog")
                ])),
                _: 1
              }),
              t[39] || (t[39] = H("span", null, "设置", -1))
            ]),
            _: 1
          }, 512)
        ]),
        _: 1
      }, 8, ["modelValue", "active"]),
      r.has_audiobook ? (Q(), Ye(s, {
        key: 1,
        ref: "audiobookPlayer",
        visible: e.audiobook_open,
        repository: e.audiobook_repository,
        "storage-id": n.initial_book_id || n.book_url,
        rendition: e.rendition,
        onClose: t[4] || (t[4] = (u) => e.audiobook_open = !1)
      }, null, 8, ["visible", "repository", "storage-id", "rendition"])) : qe("", !0),
      f(zi, {
        class: "fixed mb-14 settings-bottom-sheet reader-side-right",
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
      }, 8, ["modelValue"]),
      f(zi, {
        class: "fixed mb-14 reader-side-left",
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
      }, 8, ["modelValue"]),
      f(zi, {
        class: "fixed mb-14 annotation-bottom-sheet reader-side-right",
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
          H("div", g1, [
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
      }, 8, ["modelValue"]),
      f(zi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.ai,
        "onUpdate:modelValue": [
          t[15] || (t[15] = (u) => e.menu.panels.ai = u),
          t[16] || (t[16] = (u) => r.on_panel_model_update("ai", u))
        ],
        onAfterLeave: t[17] || (t[17] = (u) => r.on_panel_after_leave("ai")),
        contained: "",
        "z-index": "234"
      }, {
        default: T(() => [
          f(ei, { title: "开发中" })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Bn, {
        modelValue: e.annotation_editor_open,
        "onUpdate:modelValue": t[23] || (t[23] = (u) => e.annotation_editor_open = u),
        class: "annotation-editor-dialog rc-above-standalone",
        "max-width": "560",
        persistent: e.annotation_saving,
        "aria-labelledby": "annotation-editor-title",
        onAfterLeave: r.on_annotation_editor_closed
      }, {
        default: T(() => [
          f(ei, {
            class: "annotation-editor-card",
            color: "surface"
          }, {
            default: T(() => {
              var u;
              return [
                H("header", p1, [
                  H("h2", y1, be(r.annotation_editor_title), 1),
                  f(Ce, {
                    icon: "mdi-close",
                    variant: "text",
                    size: "small",
                    "aria-label": "关闭评论编辑框",
                    "min-width": "44",
                    "min-height": "44",
                    disabled: e.annotation_saving,
                    onClick: t[18] || (t[18] = (d) => e.annotation_editor_open = !1)
                  }, null, 8, ["disabled"])
                ]),
                f(si, { class: "annotation-editor-body" }, {
                  default: T(() => {
                    var d, m, g, h;
                    return [
                      r.annotation_editor_quote ? (Q(), de("section", b1, [
                        H("div", _1, [
                          t[40] || (t[40] = H("span", { id: "annotation-reference-title" }, "引用原文", -1)),
                          H("span", w1, be(((m = (d = e.annotation_editor_location) == null ? void 0 : d.toc) == null ? void 0 : m.label) || ((g = e.annotation_editor_record) == null ? void 0 : g.chapter) || e.current_toc_title), 1)
                        ]),
                        H("blockquote", S1, be(r.annotation_editor_quote), 1),
                        H("p", k1, be((h = e.annotation_editor_location) != null && h.multi_paragraph ? "跨段选区 · 评论归属最后一段。" : "评论关联整个段落。"), 1)
                      ])) : (Q(), de("p", C1, "针对整本《" + be(e.book_title) + "》写下你的感受，发布后在「全书评论」中展示。", 1)),
                      f(rm, {
                        ref: "annotationEditorContent",
                        modelValue: e.annotation_editor_content,
                        "onUpdate:modelValue": [
                          t[19] || (t[19] = (v) => e.annotation_editor_content = v),
                          t[20] || (t[20] = (v) => e.annotation_editor_error = "")
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
                H("footer", E1, [
                  H("div", x1, [
                    f(Sm, {
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
                      "onUpdate:modelValue": t[21] || (t[21] = (d) => e.annotation_editor_private = !d)
                    }, null, 8, ["model-value", "disabled"]),
                    H("label", {
                      id: "annotation-public-label",
                      for: "annotation-public-switch",
                      class: Lt(["annotation-visibility-label", { "annotation-visibility-label-disabled": e.annotation_saving }])
                    }, "公开这条评论", 2)
                  ]),
                  H("p", N1, be(((u = e.annotation_repository) == null ? void 0 : u.source) === "localStorage" ? "仅保存在当前浏览器，公开范围暂不生效。" : e.annotation_editor_private ? "只有你能看到这条评论。" : "其他读者可以在对应评论范围看到这条评论。"), 1),
                  f(xr, { class: "annotation-editor-actions" }, {
                    default: T(() => [
                      f(er),
                      f(Ce, {
                        variant: "text",
                        disabled: e.annotation_saving,
                        onClick: t[22] || (t[22] = (d) => e.annotation_editor_open = !1)
                      }, {
                        default: T(() => t[41] || (t[41] = [
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
                        default: T(() => t[42] || (t[42] = [
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
      f(m1, {
        modelValue: e.annotation_feedback_visible,
        "onUpdate:modelValue": t[25] || (t[25] = (u) => e.annotation_feedback_visible = u),
        class: "annotation-feedback",
        color: e.annotation_feedback_error ? "error" : "primary",
        timeout: e.annotation_feedback_error ? -1 : 5e3
      }, {
        actions: T(() => [
          f(Ce, {
            variant: "text",
            onClick: t[24] || (t[24] = (u) => e.annotation_feedback_visible = !1)
          }, {
            default: T(() => t[43] || (t[43] = [
              te("关闭")
            ])),
            _: 1
          })
        ]),
        default: T(() => [
          te(be(e.annotation_feedback_message) + " ", 1)
        ]),
        _: 1
      }, 8, ["modelValue", "color", "timeout"]),
      (Q(!0), de(fe, null, Tt(e.selection_preview_rects, (u, d) => (Q(), de("div", {
        key: d,
        class: "selection-preview",
        style: Ut(u),
        "aria-hidden": "true"
      }, null, 4))), 128)),
      vt(H("div", {
        id: "comments-toolbar",
        ref: "selectionToolbar",
        role: "group",
        "aria-label": "选中文字操作",
        style: Ut(`left: ${e.toolbar_left}px; top: ${e.toolbar_top}px;`)
      }, [
        H("div", V1, [
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
                default: T(() => t[44] || (t[44] = [
                  te("mdi-content-copy")
                ])),
                _: 1
              }),
              t[45] || (t[45] = H("span", null, "复制", -1))
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
                default: T(() => t[46] || (t[46] = [
                  te("mdi-format-underline")
                ])),
                _: 1
              }),
              t[47] || (t[47] = H("span", null, "划线", -1))
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
                default: T(() => t[48] || (t[48] = [
                  te("mdi-square-edit-outline")
                ])),
                _: 1
              }),
              t[49] || (t[49] = H("span", null, "写评论", -1))
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
                default: T(() => t[50] || (t[50] = [
                  te("mdi-comment-text-outline")
                ])),
                _: 1
              }),
              t[51] || (t[51] = H("span", null, "看本段评论", -1))
            ]),
            _: 1
          }, 8, ["disabled", "onClick"]),
          r.has_audiobook ? (Q(), Ye(Ce, {
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
                default: T(() => t[52] || (t[52] = [
                  te("mdi-headphones")
                ])),
                _: 1
              }),
              t[53] || (t[53] = H("span", null, "从这里听", -1))
            ]),
            _: 1
          }, 8, ["onClick"])) : qe("", !0)
        ])
      ], 4), [
        [zn, r.is_toolbar_visible()]
      ]),
      f(c1, {
        id: "main",
        class: "pa-0"
      }, {
        default: T(() => [
          f(bi, {
            modelValue: e.loading,
            "onUpdate:modelValue": t[26] || (t[26] = (u) => e.loading = u),
            "z-index": "auto",
            class: "align-center justify-center",
            persistent: ""
          }, {
            default: T(() => [
              f(Yr, {
                indeterminate: "",
                size: "64",
                color: "primary"
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          f(Bn, {
            modelValue: e.showTimeoutDialog,
            "onUpdate:modelValue": t[28] || (t[28] = (u) => e.showTimeoutDialog = u),
            "max-width": "500px",
            "aria-labelledby": "load-dialog-title"
          }, {
            default: T(() => [
              f(ei, null, {
                default: T(() => [
                  f(Nr, {
                    id: "load-dialog-title",
                    class: "text-h5 text-center"
                  }, {
                    default: T(() => [
                      te(be(e.load_failed ? "加载失败" : "加载较慢"), 1)
                    ]),
                    _: 1
                  }),
                  f(si, { class: "text-center" }, {
                    default: T(() => [
                      te(be(e.load_failed ? "电子书加载失败，可能是网络问题或文件格式不支持。" : "电子书还在加载，可能是网络较慢。加载完成后此提示会自动关闭。"), 1)
                    ]),
                    _: 1
                  }),
                  f(xr, { class: "justify-center" }, {
                    default: T(() => [
                      f(Ce, {
                        color: "primary",
                        variant: "text",
                        onClick: t[27] || (t[27] = (u) => e.showTimeoutDialog = !1)
                      }, {
                        default: T(() => [
                          te(be(e.load_failed ? "关闭" : "继续等待"), 1)
                        ]),
                        _: 1
                      }),
                      f(Ce, {
                        color: "primary",
                        variant: "flat",
                        onClick: r.retryLoad
                      }, {
                        default: T(() => t[54] || (t[54] = [
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
          H("div", {
            id: "status-bar-top",
            class: Lt(e.settings.theme),
            style: Ut(r.status_bar_style)
          }, [
            H("div", O1, be(e.current_toc_title), 1),
            H("div", T1, " (" + be(r.readingProgress) + ") ", 1)
          ], 6),
          t[55] || (t[55] = H("div", { id: "reader" }, null, -1)),
          H("div", {
            id: "status-bar-bottom",
            class: Lt(e.settings.theme),
            style: Ut(r.status_bar_style)
          }, [
            H("div", A1, [
              H("div", {
                class: "progress-bar",
                style: Ut({ width: r.readingProgress })
              }, null, 4)
            ])
          ], 6)
        ]),
        _: 1
      }),
      f(Bn, {
        modelValue: e.show_theme_dialog,
        "onUpdate:modelValue": t[30] || (t[30] = (u) => e.show_theme_dialog = u),
        "max-width": "520",
        scrollable: "",
        fullscreen: e.$vuetify.display.smAndDown
      }, {
        default: T(() => [
          f(ei, null, {
            default: T(() => [
              f(Nr, { class: "d-flex align-center" }, {
                default: T(() => [
                  t[56] || (t[56] = H("span", null, "阅读皮肤", -1)),
                  f(er),
                  f(Ce, {
                    icon: "mdi-close",
                    variant: "text",
                    density: "compact",
                    onClick: t[29] || (t[29] = (u) => e.show_theme_dialog = !1)
                  })
                ]),
                _: 1
              }),
              f(si, null, {
                default: T(() => [
                  (Q(!0), de(fe, null, Tt(r.theme_groups, (u) => (Q(), de(fe, {
                    key: u.mode
                  }, [
                    H("div", D1, be(u.label), 1),
                    H("div", I1, [
                      (Q(!0), de(fe, null, Tt(u.items, (d) => (Q(), de("div", {
                        class: "theme-cell",
                        key: d.id
                      }, [
                        H("div", {
                          class: Lt(["theme-card", { active: e.settings.theme === d.id }]),
                          style: Ut(r.theme_card_style(d)),
                          onClick: (m) => r.pick_theme(d)
                        }, [
                          H("span", {
                            class: "theme-sample",
                            style: Ut({ color: d.text })
                          }, be(d.sample), 5),
                          d.id === e.settings.theme_day || d.id === e.settings.theme_night ? (Q(), Ye(Ve, {
                            key: 0,
                            class: "theme-check",
                            size: "18",
                            title: d.mode === "day" ? "当前白天皮肤" : "当前夜晚皮肤"
                          }, {
                            default: T(() => t[57] || (t[57] = [
                              te("mdi-check-circle")
                            ])),
                            _: 2
                          }, 1032, ["title"])) : qe("", !0),
                          e.settings.theme === d.id ? (Q(), de("span", $1, "使用中")) : qe("", !0)
                        ], 14, P1),
                        H("div", M1, be(d.name), 1)
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
const L1 = /* @__PURE__ */ Un(v1, [["render", F1], ["__scopeId", "data-v-f8107397"]]), B1 = {
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
function R1(e, t, n, o, i, r) {
  const s = L1;
  return Q(), Ye(s, {
    book_url: n.book_url,
    display_url: n.display_url,
    debug: n.debug,
    themes_css: n.themes_css,
    initial_book_id: n.book_id,
    annotation_callbacks: n.annotation_callbacks,
    audiobook_callbacks: n.audiobook_callbacks
  }, null, 8, ["book_url", "display_url", "debug", "themes_css", "initial_book_id", "annotation_callbacks", "audiobook_callbacks"]);
}
const H1 = /* @__PURE__ */ Un(B1, [["render", R1]]);
class j1 {
  constructor(t, n) {
    const o = jg(H1, n);
    Zy(o), o.mount(t);
  }
}
export {
  j1 as Reader
};
