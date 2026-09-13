var Vc = {};
/**
* @vue/shared v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Mn(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const Fe = Vc.NODE_ENV !== "production" ? Object.freeze({}) : {}, Wo = Vc.NODE_ENV !== "production" ? Object.freeze([]) : [], ct = () => {
}, fv = () => !1, $i = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), bs = (e) => e.startsWith("onUpdate:"), Je = Object.assign, Sa = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, mv = Object.prototype.hasOwnProperty, Pe = (e, t) => mv.call(e, t), he = Array.isArray, So = (e) => Mi(e) === "[object Map]", qs = (e) => Mi(e) === "[object Set]", Ar = (e) => Mi(e) === "[object Date]", Se = (e) => typeof e == "function", Xe = (e) => typeof e == "string", kn = (e) => typeof e == "symbol", $e = (e) => e !== null && typeof e == "object", Ca = (e) => ($e(e) || Se(e)) && Se(e.then) && Se(e.catch), Nc = Object.prototype.toString, Mi = (e) => Nc.call(e), Ea = (e) => Mi(e).slice(8, -1), Tc = (e) => Mi(e) === "[object Object]", xa = (e) => Xe(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, mi = /* @__PURE__ */ Mn(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), vv = /* @__PURE__ */ Mn(
  "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
), Gs = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, hv = /-(\w)/g, gt = Gs(
  (e) => e.replace(hv, (t, n) => n ? n.toUpperCase() : "")
), gv = /\B([A-Z])/g, no = Gs(
  (e) => e.replace(gv, "-$1").toLowerCase()
), Kt = Gs((e) => e.charAt(0).toUpperCase() + e.slice(1)), po = Gs(
  (e) => e ? `on${Kt(e)}` : ""
), eo = (e, t) => !Object.is(e, t), Ro = (e, ...t) => {
  for (let n = 0; n < e.length; n++)
    e[n](...t);
}, _s = (e, t, n, o = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: o,
    value: n
  });
}, ws = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
}, yv = (e) => {
  const t = Xe(e) ? Number(e) : NaN;
  return isNaN(t) ? e : t;
};
let Ir;
const Fi = () => Ir || (Ir = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function cn(e) {
  if (he(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const o = e[n], i = Xe(o) ? wv(o) : cn(o);
      if (i)
        for (const s in i)
          t[s] = i[s];
    }
    return t;
  } else if (Xe(e) || $e(e))
    return e;
}
const pv = /;(?![^(]*\))/g, bv = /:([^]+)/, _v = /\/\*[^]*?\*\//g;
function wv(e) {
  const t = {};
  return e.replace(_v, "").split(pv).forEach((n) => {
    if (n) {
      const o = n.split(bv);
      o.length > 1 && (t[o[0].trim()] = o[1].trim());
    }
  }), t;
}
function Wt(e) {
  let t = "";
  if (Xe(e))
    t = e;
  else if (he(e))
    for (let n = 0; n < e.length; n++) {
      const o = Wt(e[n]);
      o && (t += o + " ");
    }
  else if ($e(e))
    for (const n in e)
      e[n] && (t += n + " ");
  return t.trim();
}
const kv = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot", Sv = "svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,text,textPath,title,tspan,unknown,use,view", Cv = "annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics", Ev = /* @__PURE__ */ Mn(kv), xv = /* @__PURE__ */ Mn(Sv), Vv = /* @__PURE__ */ Mn(Cv), Nv = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Tv = /* @__PURE__ */ Mn(Nv);
function Oc(e) {
  return !!e || e === "";
}
function Ov(e, t) {
  if (e.length !== t.length) return !1;
  let n = !0;
  for (let o = 0; n && o < e.length; o++)
    n = Ks(e[o], t[o]);
  return n;
}
function Ks(e, t) {
  if (e === t) return !0;
  let n = Ar(e), o = Ar(t);
  if (n || o)
    return n && o ? e.getTime() === t.getTime() : !1;
  if (n = kn(e), o = kn(t), n || o)
    return e === t;
  if (n = he(e), o = he(t), n || o)
    return n && o ? Ov(e, t) : !1;
  if (n = $e(e), o = $e(t), n || o) {
    if (!n || !o)
      return !1;
    const i = Object.keys(e).length, s = Object.keys(t).length;
    if (i !== s)
      return !1;
    for (const l in e) {
      const a = e.hasOwnProperty(l), r = t.hasOwnProperty(l);
      if (a && !r || !a && r || !Ks(e[l], t[l]))
        return !1;
    }
  }
  return String(e) === String(t);
}
function Av(e, t) {
  return e.findIndex((n) => Ks(n, t));
}
const Ac = (e) => !!(e && e.__v_isRef === !0), Ne = (e) => Xe(e) ? e : e == null ? "" : he(e) || $e(e) && (e.toString === Nc || !Se(e.toString)) ? Ac(e) ? Ne(e.value) : JSON.stringify(e, Ic, 2) : String(e), Ic = (e, t) => Ac(t) ? Ic(e, t.value) : So(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (n, [o, i], s) => (n[yl(o, s) + " =>"] = i, n),
    {}
  )
} : qs(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((n) => yl(n))
} : kn(t) ? yl(t) : $e(t) && !he(t) && !Tc(t) ? String(t) : t, yl = (e, t = "") => {
  var n;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    kn(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e
  );
};
var Be = {};
function Yt(e, ...t) {
  console.warn(`[Vue warn] ${e}`, ...t);
}
let Ct;
class Pc {
  constructor(t = !1) {
    this.detached = t, this._active = !0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.parent = Ct, !t && Ct && (this.index = (Ct.scopes || (Ct.scopes = [])).push(
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
      const n = Ct;
      try {
        return Ct = this, t();
      } finally {
        Ct = n;
      }
    } else Be.NODE_ENV !== "production" && Yt("cannot run an inactive effect scope.");
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    Ct = this;
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    Ct = this.parent;
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
function Va(e) {
  return new Pc(e);
}
function Iv() {
  return Ct;
}
function Ft(e, t = !1) {
  Ct ? Ct.cleanups.push(e) : Be.NODE_ENV !== "production" && !t && Yt(
    "onScopeDispose() is called when there is no active effect scope to be associated with."
  );
}
let Me;
const pl = /* @__PURE__ */ new WeakSet();
class Dc {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, Ct && Ct.active && Ct.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, pl.has(this) && (pl.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Mc(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, Pr(this), Fc(this);
    const t = Me, n = tn;
    Me = this, tn = !0;
    try {
      return this.fn();
    } finally {
      Be.NODE_ENV !== "production" && Me !== this && Yt(
        "Active effect was not restored correctly - this is likely a Vue internal bug."
      ), Bc(this), Me = t, tn = n, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep)
        Oa(t);
      this.deps = this.depsTail = void 0, Pr(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? pl.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    jl(this) && this.run();
  }
  get dirty() {
    return jl(this);
  }
}
let $c = 0, vi, hi;
function Mc(e, t = !1) {
  if (e.flags |= 8, t) {
    e.next = hi, hi = e;
    return;
  }
  e.next = vi, vi = e;
}
function Na() {
  $c++;
}
function Ta() {
  if (--$c > 0)
    return;
  if (hi) {
    let t = hi;
    for (hi = void 0; t; ) {
      const n = t.next;
      t.next = void 0, t.flags &= -9, t = n;
    }
  }
  let e;
  for (; vi; ) {
    let t = vi;
    for (vi = void 0; t; ) {
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
function Fc(e) {
  for (let t = e.deps; t; t = t.nextDep)
    t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function Bc(e) {
  let t, n = e.depsTail, o = n;
  for (; o; ) {
    const i = o.prevDep;
    o.version === -1 ? (o === n && (n = i), Oa(o), Pv(o)) : t = o, o.dep.activeLink = o.prevActiveLink, o.prevActiveLink = void 0, o = i;
  }
  e.deps = t, e.depsTail = n;
}
function jl(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (t.dep.version !== t.version || t.dep.computed && (Lc(t.dep.computed) || t.dep.version !== t.version))
      return !0;
  return !!e._dirty;
}
function Lc(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === bi))
    return;
  e.globalVersion = bi;
  const t = e.dep;
  if (e.flags |= 2, t.version > 0 && !e.isSSR && e.deps && !jl(e)) {
    e.flags &= -3;
    return;
  }
  const n = Me, o = tn;
  Me = e, tn = !0;
  try {
    Fc(e);
    const i = e.fn(e._value);
    (t.version === 0 || eo(i, e._value)) && (e._value = i, t.version++);
  } catch (i) {
    throw t.version++, i;
  } finally {
    Me = n, tn = o, Bc(e), e.flags &= -3;
  }
}
function Oa(e, t = !1) {
  const { dep: n, prevSub: o, nextSub: i } = e;
  if (o && (o.nextSub = i, e.prevSub = void 0), i && (i.prevSub = o, e.nextSub = void 0), Be.NODE_ENV !== "production" && n.subsHead === e && (n.subsHead = i), n.subs === e && (n.subs = o, !o && n.computed)) {
    n.computed.flags &= -5;
    for (let s = n.computed.deps; s; s = s.nextDep)
      Oa(s, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function Pv(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let tn = !0;
const Rc = [];
function Fn() {
  Rc.push(tn), tn = !1;
}
function Bn() {
  const e = Rc.pop();
  tn = e === void 0 ? !0 : e;
}
function Pr(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const n = Me;
    Me = void 0;
    try {
      t();
    } finally {
      Me = n;
    }
  }
}
let bi = 0;
class Dv {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class Aa {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, Be.NODE_ENV !== "production" && (this.subsHead = void 0);
  }
  track(t) {
    if (!Me || !tn || Me === this.computed)
      return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== Me)
      n = this.activeLink = new Dv(Me, this), Me.deps ? (n.prevDep = Me.depsTail, Me.depsTail.nextDep = n, Me.depsTail = n) : Me.deps = Me.depsTail = n, Hc(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const o = n.nextDep;
      o.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = o), n.prevDep = Me.depsTail, n.nextDep = void 0, Me.depsTail.nextDep = n, Me.depsTail = n, Me.deps === n && (Me.deps = o);
    }
    return Be.NODE_ENV !== "production" && Me.onTrack && Me.onTrack(
      Je(
        {
          effect: Me
        },
        t
      )
    ), n;
  }
  trigger(t) {
    this.version++, bi++, this.notify(t);
  }
  notify(t) {
    Na();
    try {
      if (Be.NODE_ENV !== "production")
        for (let n = this.subsHead; n; n = n.nextSub)
          n.sub.onTrigger && !(n.sub.flags & 8) && n.sub.onTrigger(
            Je(
              {
                effect: n.sub
              },
              t
            )
          );
      for (let n = this.subs; n; n = n.prevSub)
        n.sub.notify() && n.sub.dep.notify();
    } finally {
      Ta();
    }
  }
}
function Hc(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let o = t.deps; o; o = o.nextDep)
        Hc(o);
    }
    const n = e.dep.subs;
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), Be.NODE_ENV !== "production" && e.dep.subsHead === void 0 && (e.dep.subsHead = e), e.dep.subs = e;
  }
}
const ks = /* @__PURE__ */ new WeakMap(), Co = Symbol(
  Be.NODE_ENV !== "production" ? "Object iterate" : ""
), zl = Symbol(
  Be.NODE_ENV !== "production" ? "Map keys iterate" : ""
), _i = Symbol(
  Be.NODE_ENV !== "production" ? "Array iterate" : ""
);
function ut(e, t, n) {
  if (tn && Me) {
    let o = ks.get(e);
    o || ks.set(e, o = /* @__PURE__ */ new Map());
    let i = o.get(n);
    i || (o.set(n, i = new Aa()), i.map = o, i.key = n), Be.NODE_ENV !== "production" ? i.track({
      target: e,
      type: t,
      key: n
    }) : i.track();
  }
}
function dn(e, t, n, o, i, s) {
  const l = ks.get(e);
  if (!l) {
    bi++;
    return;
  }
  const a = (r) => {
    r && (Be.NODE_ENV !== "production" ? r.trigger({
      target: e,
      type: t,
      key: n,
      newValue: o,
      oldValue: i,
      oldTarget: s
    }) : r.trigger());
  };
  if (Na(), t === "clear")
    l.forEach(a);
  else {
    const r = he(e), f = r && xa(n);
    if (r && n === "length") {
      const u = Number(o);
      l.forEach((d, v) => {
        (v === "length" || v === _i || !kn(v) && v >= u) && a(d);
      });
    } else
      switch ((n !== void 0 || l.has(void 0)) && a(l.get(n)), f && a(l.get(_i)), t) {
        case "add":
          r ? f && a(l.get("length")) : (a(l.get(Co)), So(e) && a(l.get(zl)));
          break;
        case "delete":
          r || (a(l.get(Co)), So(e) && a(l.get(zl)));
          break;
        case "set":
          So(e) && a(l.get(Co));
          break;
      }
  }
  Ta();
}
function $v(e, t) {
  const n = ks.get(e);
  return n && n.get(t);
}
function Fo(e) {
  const t = me(e);
  return t === e ? t : (ut(t, "iterate", _i), xt(e) ? t : t.map(bt));
}
function Ys(e) {
  return ut(e = me(e), "iterate", _i), e;
}
const Mv = {
  __proto__: null,
  [Symbol.iterator]() {
    return bl(this, Symbol.iterator, bt);
  },
  concat(...e) {
    return Fo(this).concat(
      ...e.map((t) => he(t) ? Fo(t) : t)
    );
  },
  entries() {
    return bl(this, "entries", (e) => (e[1] = bt(e[1]), e));
  },
  every(e, t) {
    return Nn(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return Nn(this, "filter", e, t, (n) => n.map(bt), arguments);
  },
  find(e, t) {
    return Nn(this, "find", e, t, bt, arguments);
  },
  findIndex(e, t) {
    return Nn(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return Nn(this, "findLast", e, t, bt, arguments);
  },
  findLastIndex(e, t) {
    return Nn(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return Nn(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return _l(this, "includes", e);
  },
  indexOf(...e) {
    return _l(this, "indexOf", e);
  },
  join(e) {
    return Fo(this).join(e);
  },
  // keys() iterator only reads `length`, no optimisation required
  lastIndexOf(...e) {
    return _l(this, "lastIndexOf", e);
  },
  map(e, t) {
    return Nn(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return si(this, "pop");
  },
  push(...e) {
    return si(this, "push", e);
  },
  reduce(e, ...t) {
    return Dr(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return Dr(this, "reduceRight", e, t);
  },
  shift() {
    return si(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return Nn(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return si(this, "splice", e);
  },
  toReversed() {
    return Fo(this).toReversed();
  },
  toSorted(e) {
    return Fo(this).toSorted(e);
  },
  toSpliced(...e) {
    return Fo(this).toSpliced(...e);
  },
  unshift(...e) {
    return si(this, "unshift", e);
  },
  values() {
    return bl(this, "values", bt);
  }
};
function bl(e, t, n) {
  const o = Ys(e), i = o[t]();
  return o !== e && !xt(e) && (i._next = i.next, i.next = () => {
    const s = i._next();
    return s.value && (s.value = n(s.value)), s;
  }), i;
}
const Fv = Array.prototype;
function Nn(e, t, n, o, i, s) {
  const l = Ys(e), a = l !== e && !xt(e), r = l[t];
  if (r !== Fv[t]) {
    const d = r.apply(e, s);
    return a ? bt(d) : d;
  }
  let f = n;
  l !== e && (a ? f = function(d, v) {
    return n.call(this, bt(d), v, e);
  } : n.length > 2 && (f = function(d, v) {
    return n.call(this, d, v, e);
  }));
  const u = r.call(l, f, o);
  return a && i ? i(u) : u;
}
function Dr(e, t, n, o) {
  const i = Ys(e);
  let s = n;
  return i !== e && (xt(e) ? n.length > 3 && (s = function(l, a, r) {
    return n.call(this, l, a, r, e);
  }) : s = function(l, a, r) {
    return n.call(this, l, bt(a), r, e);
  }), i[t](s, ...o);
}
function _l(e, t, n) {
  const o = me(e);
  ut(o, "iterate", _i);
  const i = o[t](...n);
  return (i === -1 || i === !1) && wi(n[0]) ? (n[0] = me(n[0]), o[t](...n)) : i;
}
function si(e, t, n = []) {
  Fn(), Na();
  const o = me(e)[t].apply(e, n);
  return Ta(), Bn(), o;
}
const Bv = /* @__PURE__ */ Mn("__proto__,__v_isRef,__isVue"), jc = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(kn)
);
function Lv(e) {
  kn(e) || (e = String(e));
  const t = me(this);
  return ut(t, "has", e), t.hasOwnProperty(e);
}
class zc {
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
      return o === (i ? s ? Yc : Kc : s ? Gc : qc).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(o) ? t : void 0;
    const l = he(t);
    if (!i) {
      let r;
      if (l && (r = Mv[n]))
        return r;
      if (n === "hasOwnProperty")
        return Lv;
    }
    const a = Reflect.get(
      t,
      n,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      Ue(t) ? t : o
    );
    return (kn(n) ? jc.has(n) : Bv(n)) || (i || ut(t, "get", n), s) ? a : Ue(a) ? l && xa(n) ? a : a.value : $e(a) ? i ? Bi(a) : ht(a) : a;
  }
}
class Uc extends zc {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, o, i) {
    let s = t[n];
    if (!this._isShallow) {
      const r = $n(s);
      if (!xt(o) && !$n(o) && (s = me(s), o = me(o)), !he(t) && Ue(s) && !Ue(o))
        return r ? !1 : (s.value = o, !0);
    }
    const l = he(t) && xa(n) ? Number(n) < t.length : Pe(t, n), a = Reflect.set(
      t,
      n,
      o,
      Ue(t) ? t : i
    );
    return t === me(i) && (l ? eo(o, s) && dn(t, "set", n, o, s) : dn(t, "add", n, o)), a;
  }
  deleteProperty(t, n) {
    const o = Pe(t, n), i = t[n], s = Reflect.deleteProperty(t, n);
    return s && o && dn(t, "delete", n, void 0, i), s;
  }
  has(t, n) {
    const o = Reflect.has(t, n);
    return (!kn(n) || !jc.has(n)) && ut(t, "has", n), o;
  }
  ownKeys(t) {
    return ut(
      t,
      "iterate",
      he(t) ? "length" : Co
    ), Reflect.ownKeys(t);
  }
}
class Wc extends zc {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return Be.NODE_ENV !== "production" && Yt(
      `Set operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
  deleteProperty(t, n) {
    return Be.NODE_ENV !== "production" && Yt(
      `Delete operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
}
const Rv = /* @__PURE__ */ new Uc(), Hv = /* @__PURE__ */ new Wc(), jv = /* @__PURE__ */ new Uc(!0), zv = /* @__PURE__ */ new Wc(!0), Ul = (e) => e, Zi = (e) => Reflect.getPrototypeOf(e);
function Uv(e, t, n) {
  return function(...o) {
    const i = this.__v_raw, s = me(i), l = So(s), a = e === "entries" || e === Symbol.iterator && l, r = e === "keys" && l, f = i[e](...o), u = n ? Ul : t ? Wl : bt;
    return !t && ut(
      s,
      "iterate",
      r ? zl : Co
    ), {
      // iterator protocol
      next() {
        const { value: d, done: v } = f.next();
        return v ? { value: d, done: v } : {
          value: a ? [u(d[0]), u(d[1])] : u(d),
          done: v
        };
      },
      // iterable protocol
      [Symbol.iterator]() {
        return this;
      }
    };
  };
}
function Qi(e) {
  return function(...t) {
    if (Be.NODE_ENV !== "production") {
      const n = t[0] ? `on key "${t[0]}" ` : "";
      Yt(
        `${Kt(e)} operation ${n}failed: target is readonly.`,
        me(this)
      );
    }
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function Wv(e, t) {
  const n = {
    get(i) {
      const s = this.__v_raw, l = me(s), a = me(i);
      e || (eo(i, a) && ut(l, "get", i), ut(l, "get", a));
      const { has: r } = Zi(l), f = t ? Ul : e ? Wl : bt;
      if (r.call(l, i))
        return f(s.get(i));
      if (r.call(l, a))
        return f(s.get(a));
      s !== l && s.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return !e && ut(me(i), "iterate", Co), Reflect.get(i, "size", i);
    },
    has(i) {
      const s = this.__v_raw, l = me(s), a = me(i);
      return e || (eo(i, a) && ut(l, "has", i), ut(l, "has", a)), i === a ? s.has(i) : s.has(i) || s.has(a);
    },
    forEach(i, s) {
      const l = this, a = l.__v_raw, r = me(a), f = t ? Ul : e ? Wl : bt;
      return !e && ut(r, "iterate", Co), a.forEach((u, d) => i.call(s, f(u), f(d), l));
    }
  };
  return Je(
    n,
    e ? {
      add: Qi("add"),
      set: Qi("set"),
      delete: Qi("delete"),
      clear: Qi("clear")
    } : {
      add(i) {
        !t && !xt(i) && !$n(i) && (i = me(i));
        const s = me(this);
        return Zi(s).has.call(s, i) || (s.add(i), dn(s, "add", i, i)), this;
      },
      set(i, s) {
        !t && !xt(s) && !$n(s) && (s = me(s));
        const l = me(this), { has: a, get: r } = Zi(l);
        let f = a.call(l, i);
        f ? Be.NODE_ENV !== "production" && $r(l, a, i) : (i = me(i), f = a.call(l, i));
        const u = r.call(l, i);
        return l.set(i, s), f ? eo(s, u) && dn(l, "set", i, s, u) : dn(l, "add", i, s), this;
      },
      delete(i) {
        const s = me(this), { has: l, get: a } = Zi(s);
        let r = l.call(s, i);
        r ? Be.NODE_ENV !== "production" && $r(s, l, i) : (i = me(i), r = l.call(s, i));
        const f = a ? a.call(s, i) : void 0, u = s.delete(i);
        return r && dn(s, "delete", i, void 0, f), u;
      },
      clear() {
        const i = me(this), s = i.size !== 0, l = Be.NODE_ENV !== "production" ? So(i) ? new Map(i) : new Set(i) : void 0, a = i.clear();
        return s && dn(
          i,
          "clear",
          void 0,
          void 0,
          l
        ), a;
      }
    }
  ), [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ].forEach((i) => {
    n[i] = Uv(i, e, t);
  }), n;
}
function Xs(e, t) {
  const n = Wv(e, t);
  return (o, i, s) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? o : Reflect.get(
    Pe(n, i) && i in o ? n : o,
    i,
    s
  );
}
const qv = {
  get: /* @__PURE__ */ Xs(!1, !1)
}, Gv = {
  get: /* @__PURE__ */ Xs(!1, !0)
}, Kv = {
  get: /* @__PURE__ */ Xs(!0, !1)
}, Yv = {
  get: /* @__PURE__ */ Xs(!0, !0)
};
function $r(e, t, n) {
  const o = me(n);
  if (o !== n && t.call(e, o)) {
    const i = Ea(e);
    Yt(
      `Reactive ${i} contains both the raw and reactive versions of the same object${i === "Map" ? " as keys" : ""}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`
    );
  }
}
const qc = /* @__PURE__ */ new WeakMap(), Gc = /* @__PURE__ */ new WeakMap(), Kc = /* @__PURE__ */ new WeakMap(), Yc = /* @__PURE__ */ new WeakMap();
function Xv(e) {
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
function Jv(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : Xv(Ea(e));
}
function ht(e) {
  return $n(e) ? e : Js(
    e,
    !1,
    Rv,
    qv,
    qc
  );
}
function Zv(e) {
  return Js(
    e,
    !1,
    jv,
    Gv,
    Gc
  );
}
function Bi(e) {
  return Js(
    e,
    !0,
    Hv,
    Kv,
    Kc
  );
}
function mn(e) {
  return Js(
    e,
    !0,
    zv,
    Yv,
    Yc
  );
}
function Js(e, t, n, o, i) {
  if (!$e(e))
    return Be.NODE_ENV !== "production" && Yt(
      `value cannot be made ${t ? "readonly" : "reactive"}: ${String(
        e
      )}`
    ), e;
  if (e.__v_raw && !(t && e.__v_isReactive))
    return e;
  const s = i.get(e);
  if (s)
    return s;
  const l = Jv(e);
  if (l === 0)
    return e;
  const a = new Proxy(
    e,
    l === 2 ? o : n
  );
  return i.set(e, a), a;
}
function Eo(e) {
  return $n(e) ? Eo(e.__v_raw) : !!(e && e.__v_isReactive);
}
function $n(e) {
  return !!(e && e.__v_isReadonly);
}
function xt(e) {
  return !!(e && e.__v_isShallow);
}
function wi(e) {
  return e ? !!e.__v_raw : !1;
}
function me(e) {
  const t = e && e.__v_raw;
  return t ? me(t) : e;
}
function Xc(e) {
  return !Pe(e, "__v_skip") && Object.isExtensible(e) && _s(e, "__v_skip", !0), e;
}
const bt = (e) => $e(e) ? ht(e) : e, Wl = (e) => $e(e) ? Bi(e) : e;
function Ue(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function se(e) {
  return Jc(e, !1);
}
function we(e) {
  return Jc(e, !0);
}
function Jc(e, t) {
  return Ue(e) ? e : new Qv(e, t);
}
class Qv {
  constructor(t, n) {
    this.dep = new Aa(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : me(t), this._value = n ? t : bt(t), this.__v_isShallow = n;
  }
  get value() {
    return Be.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, o = this.__v_isShallow || xt(t) || $n(t);
    t = o ? t : me(t), eo(t, n) && (this._rawValue = t, this._value = o ? t : bt(t), Be.NODE_ENV !== "production" ? this.dep.trigger({
      target: this,
      type: "set",
      key: "value",
      newValue: t,
      oldValue: n
    }) : this.dep.trigger());
  }
}
function vn(e) {
  return Ue(e) ? e.value : e;
}
const eh = {
  get: (e, t, n) => t === "__v_raw" ? e : vn(Reflect.get(e, t, n)),
  set: (e, t, n, o) => {
    const i = e[t];
    return Ue(i) && !Ue(n) ? (i.value = n, !0) : Reflect.set(e, t, n, o);
  }
};
function Zc(e) {
  return Eo(e) ? e : new Proxy(e, eh);
}
function Ia(e) {
  Be.NODE_ENV !== "production" && !wi(e) && Yt("toRefs() expects a reactive object but received a plain one.");
  const t = he(e) ? new Array(e.length) : {};
  for (const n in e)
    t[n] = Qc(e, n);
  return t;
}
class th {
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
    return $v(me(this._object), this._key);
  }
}
class nh {
  constructor(t) {
    this._getter = t, this.__v_isRef = !0, this.__v_isReadonly = !0, this._value = void 0;
  }
  get value() {
    return this._value = this._getter();
  }
}
function ae(e, t, n) {
  return Ue(e) ? e : Se(e) ? new nh(e) : $e(e) && arguments.length > 1 ? Qc(e, t, n) : se(e);
}
function Qc(e, t, n) {
  const o = e[t];
  return Ue(o) ? o : new th(e, t, n);
}
class oh {
  constructor(t, n, o) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new Aa(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = bi - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = o;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    Me !== this)
      return Mc(this, !0), !0;
  }
  get value() {
    const t = Be.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track();
    return Lc(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter ? this.setter(t) : Be.NODE_ENV !== "production" && Yt("Write operation failed: computed value is readonly");
  }
}
function ih(e, t, n = !1) {
  let o, i;
  Se(e) ? o = e : (o = e.get, i = e.set);
  const s = new oh(o, i, n);
  return Be.NODE_ENV !== "production" && t && !n && (s.onTrack = t.onTrack, s.onTrigger = t.onTrigger), s;
}
const es = {}, Ss = /* @__PURE__ */ new WeakMap();
let bo;
function sh(e, t = !1, n = bo) {
  if (n) {
    let o = Ss.get(n);
    o || Ss.set(n, o = []), o.push(e);
  } else Be.NODE_ENV !== "production" && !t && Yt(
    "onWatcherCleanup() was called when there was no active watcher to associate with."
  );
}
function lh(e, t, n = Fe) {
  const { immediate: o, deep: i, once: s, scheduler: l, augmentJob: a, call: r } = n, f = (x) => {
    (n.onWarn || Yt)(
      "Invalid watch source: ",
      x,
      "A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types."
    );
  }, u = (x) => i ? x : xt(x) || i === !1 || i === 0 ? Dn(x, 1) : Dn(x);
  let d, v, h, m, g = !1, _ = !1;
  if (Ue(e) ? (v = () => e.value, g = xt(e)) : Eo(e) ? (v = () => u(e), g = !0) : he(e) ? (_ = !0, g = e.some((x) => Eo(x) || xt(x)), v = () => e.map((x) => {
    if (Ue(x))
      return x.value;
    if (Eo(x))
      return u(x);
    if (Se(x))
      return r ? r(x, 2) : x();
    Be.NODE_ENV !== "production" && f(x);
  })) : Se(e) ? t ? v = r ? () => r(e, 2) : e : v = () => {
    if (h) {
      Fn();
      try {
        h();
      } finally {
        Bn();
      }
    }
    const x = bo;
    bo = d;
    try {
      return r ? r(e, 3, [m]) : e(m);
    } finally {
      bo = x;
    }
  } : (v = ct, Be.NODE_ENV !== "production" && f(e)), t && i) {
    const x = v, C = i === !0 ? 1 / 0 : i;
    v = () => Dn(x(), C);
  }
  const S = Iv(), N = () => {
    d.stop(), S && Sa(S.effects, d);
  };
  if (s && t) {
    const x = t;
    t = (...C) => {
      x(...C), N();
    };
  }
  let I = _ ? new Array(e.length).fill(es) : es;
  const P = (x) => {
    if (!(!(d.flags & 1) || !d.dirty && !x))
      if (t) {
        const C = d.run();
        if (i || g || (_ ? C.some(($, V) => eo($, I[V])) : eo(C, I))) {
          h && h();
          const $ = bo;
          bo = d;
          try {
            const V = [
              C,
              // pass undefined as the old value when it's changed for the first time
              I === es ? void 0 : _ && I[0] === es ? [] : I,
              m
            ];
            r ? r(t, 3, V) : (
              // @ts-expect-error
              t(...V)
            ), I = C;
          } finally {
            bo = $;
          }
        }
      } else
        d.run();
  };
  return a && a(P), d = new Dc(v), d.scheduler = l ? () => l(P, !1) : P, m = (x) => sh(x, !1, d), h = d.onStop = () => {
    const x = Ss.get(d);
    if (x) {
      if (r)
        r(x, 4);
      else
        for (const C of x) C();
      Ss.delete(d);
    }
  }, Be.NODE_ENV !== "production" && (d.onTrack = n.onTrack, d.onTrigger = n.onTrigger), t ? o ? P(!0) : I = d.run() : l ? l(P.bind(null, !0), !0) : d.run(), N.pause = d.pause.bind(d), N.resume = d.resume.bind(d), N.stop = N, N;
}
function Dn(e, t = 1 / 0, n) {
  if (t <= 0 || !$e(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e)))
    return e;
  if (n.add(e), t--, Ue(e))
    Dn(e.value, t, n);
  else if (he(e))
    for (let o = 0; o < e.length; o++)
      Dn(e[o], t, n);
  else if (qs(e) || So(e))
    e.forEach((o) => {
      Dn(o, t, n);
    });
  else if (Tc(e)) {
    for (const o in e)
      Dn(e[o], t, n);
    for (const o of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, o) && Dn(e[o], t, n);
  }
  return e;
}
var E = {};
const xo = [];
function as(e) {
  xo.push(e);
}
function rs() {
  xo.pop();
}
let wl = !1;
function q(e, ...t) {
  if (wl) return;
  wl = !0, Fn();
  const n = xo.length ? xo[xo.length - 1].component : null, o = n && n.appContext.config.warnHandler, i = ah();
  if (o)
    Qo(
      o,
      n,
      11,
      [
        // eslint-disable-next-line no-restricted-syntax
        e + t.map((s) => {
          var l, a;
          return (a = (l = s.toString) == null ? void 0 : l.call(s)) != null ? a : JSON.stringify(s);
        }).join(""),
        n && n.proxy,
        i.map(
          ({ vnode: s }) => `at <${ol(n, s.type)}>`
        ).join(`
`),
        i
      ]
    );
  else {
    const s = [`[Vue warn]: ${e}`, ...t];
    i.length && s.push(`
`, ...rh(i)), console.warn(...s);
  }
  Bn(), wl = !1;
}
function ah() {
  let e = xo[xo.length - 1];
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
function rh(e) {
  const t = [];
  return e.forEach((n, o) => {
    t.push(...o === 0 ? [] : [`
`], ...uh(n));
  }), t;
}
function uh({ vnode: e, recurseCount: t }) {
  const n = t > 0 ? `... (${t} recursive calls)` : "", o = e.component ? e.component.parent == null : !1, i = ` at <${ol(
    e.component,
    e.type,
    o
  )}`, s = ">" + n;
  return e.props ? [i, ...ch(e.props), s] : [i + s];
}
function ch(e) {
  const t = [], n = Object.keys(e);
  return n.slice(0, 3).forEach((o) => {
    t.push(...ed(o, e[o]));
  }), n.length > 3 && t.push(" ..."), t;
}
function ed(e, t, n) {
  return Xe(t) ? (t = JSON.stringify(t), n ? t : [`${e}=${t}`]) : typeof t == "number" || typeof t == "boolean" || t == null ? n ? t : [`${e}=${t}`] : Ue(t) ? (t = ed(e, me(t.value), !0), n ? t : [`${e}=Ref<`, t, ">"]) : Se(t) ? [`${e}=fn${t.name ? `<${t.name}>` : ""}`] : (t = me(t), n ? t : [`${e}=`, t]);
}
function dh(e, t) {
  E.NODE_ENV !== "production" && e !== void 0 && (typeof e != "number" ? q(`${t} is not a valid number - got ${JSON.stringify(e)}.`) : isNaN(e) && q(`${t} is NaN - the duration expression might be incorrect.`));
}
const Pa = {
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
function Qo(e, t, n, o) {
  try {
    return o ? e(...o) : e();
  } catch (i) {
    Li(i, t, n);
  }
}
function nn(e, t, n, o) {
  if (Se(e)) {
    const i = Qo(e, t, n, o);
    return i && Ca(i) && i.catch((s) => {
      Li(s, t, n);
    }), i;
  }
  if (he(e)) {
    const i = [];
    for (let s = 0; s < e.length; s++)
      i.push(nn(e[s], t, n, o));
    return i;
  } else E.NODE_ENV !== "production" && q(
    `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof e}`
  );
}
function Li(e, t, n, o = !0) {
  const i = t ? t.vnode : null, { errorHandler: s, throwUnhandledErrorInProduction: l } = t && t.appContext.config || Fe;
  if (t) {
    let a = t.parent;
    const r = t.proxy, f = E.NODE_ENV !== "production" ? Pa[n] : `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; a; ) {
      const u = a.ec;
      if (u) {
        for (let d = 0; d < u.length; d++)
          if (u[d](e, r, f) === !1)
            return;
      }
      a = a.parent;
    }
    if (s) {
      Fn(), Qo(s, null, 10, [
        e,
        r,
        f
      ]), Bn();
      return;
    }
  }
  fh(e, n, i, o, l);
}
function fh(e, t, n, o = !0, i = !1) {
  if (E.NODE_ENV !== "production") {
    const s = Pa[t];
    if (n && as(n), q(`Unhandled error${s ? ` during execution of ${s}` : ""}`), n && rs(), o)
      throw e;
    console.error(e);
  } else {
    if (i)
      throw e;
    console.error(e);
  }
}
const Et = [];
let un = -1;
const qo = [];
let Yn = null, Ho = 0;
const td = /* @__PURE__ */ Promise.resolve();
let Cs = null;
const mh = 100;
function at(e) {
  const t = Cs || td;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function vh(e) {
  let t = un + 1, n = Et.length;
  for (; t < n; ) {
    const o = t + n >>> 1, i = Et[o], s = ki(i);
    s < e || s === e && i.flags & 2 ? t = o + 1 : n = o;
  }
  return t;
}
function Zs(e) {
  if (!(e.flags & 1)) {
    const t = ki(e), n = Et[Et.length - 1];
    !n || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= ki(n) ? Et.push(e) : Et.splice(vh(t), 0, e), e.flags |= 1, nd();
  }
}
function nd() {
  Cs || (Cs = td.then(sd));
}
function od(e) {
  he(e) ? qo.push(...e) : Yn && e.id === -1 ? Yn.splice(Ho + 1, 0, e) : e.flags & 1 || (qo.push(e), e.flags |= 1), nd();
}
function Mr(e, t, n = un + 1) {
  for (E.NODE_ENV !== "production" && (t = t || /* @__PURE__ */ new Map()); n < Et.length; n++) {
    const o = Et[n];
    if (o && o.flags & 2) {
      if (e && o.id !== e.uid || E.NODE_ENV !== "production" && Da(t, o))
        continue;
      Et.splice(n, 1), n--, o.flags & 4 && (o.flags &= -2), o(), o.flags & 4 || (o.flags &= -2);
    }
  }
}
function id(e) {
  if (qo.length) {
    const t = [...new Set(qo)].sort(
      (n, o) => ki(n) - ki(o)
    );
    if (qo.length = 0, Yn) {
      Yn.push(...t);
      return;
    }
    for (Yn = t, E.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map()), Ho = 0; Ho < Yn.length; Ho++) {
      const n = Yn[Ho];
      E.NODE_ENV !== "production" && Da(e, n) || (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2);
    }
    Yn = null, Ho = 0;
  }
}
const ki = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function sd(e) {
  E.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map());
  const t = E.NODE_ENV !== "production" ? (n) => Da(e, n) : ct;
  try {
    for (un = 0; un < Et.length; un++) {
      const n = Et[un];
      if (n && !(n.flags & 8)) {
        if (E.NODE_ENV !== "production" && t(n))
          continue;
        n.flags & 4 && (n.flags &= -2), Qo(
          n,
          n.i,
          n.i ? 15 : 14
        ), n.flags & 4 || (n.flags &= -2);
      }
    }
  } finally {
    for (; un < Et.length; un++) {
      const n = Et[un];
      n && (n.flags &= -2);
    }
    un = -1, Et.length = 0, id(e), Cs = null, (Et.length || qo.length) && sd(e);
  }
}
function Da(e, t) {
  const n = e.get(t) || 0;
  if (n > mh) {
    const o = t.i, i = o && Wa(o.type);
    return Li(
      `Maximum recursive updates exceeded${i ? ` in component <${i}>` : ""}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`,
      null,
      10
    ), !0;
  }
  return e.set(t, n + 1), !1;
}
let Qt = !1;
const us = /* @__PURE__ */ new Map();
E.NODE_ENV !== "production" && (Fi().__VUE_HMR_RUNTIME__ = {
  createRecord: kl(ld),
  rerender: kl(yh),
  reload: kl(ph)
});
const Io = /* @__PURE__ */ new Map();
function hh(e) {
  const t = e.type.__hmrId;
  let n = Io.get(t);
  n || (ld(t, e.type), n = Io.get(t)), n.instances.add(e);
}
function gh(e) {
  Io.get(e.type.__hmrId).instances.delete(e);
}
function ld(e, t) {
  return Io.has(e) ? !1 : (Io.set(e, {
    initialDef: Es(t),
    instances: /* @__PURE__ */ new Set()
  }), !0);
}
function Es(e) {
  return Yd(e) ? e.__vccOpts : e;
}
function yh(e, t) {
  const n = Io.get(e);
  n && (n.initialDef.render = t, [...n.instances].forEach((o) => {
    t && (o.render = t, Es(o.type).render = t), o.renderCache = [], Qt = !0, o.update(), Qt = !1;
  }));
}
function ph(e, t) {
  const n = Io.get(e);
  if (!n) return;
  t = Es(t), Fr(n.initialDef, t);
  const o = [...n.instances];
  for (let i = 0; i < o.length; i++) {
    const s = o[i], l = Es(s.type);
    let a = us.get(l);
    a || (l !== n.initialDef && Fr(l, t), us.set(l, a = /* @__PURE__ */ new Set())), a.add(s), s.appContext.propsCache.delete(s.type), s.appContext.emitsCache.delete(s.type), s.appContext.optionsCache.delete(s.type), s.ceReload ? (a.add(s), s.ceReload(t.styles), a.delete(s)) : s.parent ? Zs(() => {
      Qt = !0, s.parent.update(), Qt = !1, a.delete(s);
    }) : s.appContext.reload ? s.appContext.reload() : typeof window < "u" ? window.location.reload() : console.warn(
      "[HMR] Root or manually mounted instance modified. Full reload required."
    ), s.root.ce && s !== s.root && s.root.ce._removeChildStyle(l);
  }
  od(() => {
    us.clear();
  });
}
function Fr(e, t) {
  Je(e, t);
  for (const n in e)
    n !== "__file" && !(n in t) && delete e[n];
}
function kl(e) {
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
let fn, di = [], ql = !1;
function Ri(e, ...t) {
  fn ? fn.emit(e, ...t) : ql || di.push({ event: e, args: t });
}
function ad(e, t) {
  var n, o;
  fn = e, fn ? (fn.enabled = !0, di.forEach(({ event: i, args: s }) => fn.emit(i, ...s)), di = []) : /* handle late devtools injection - only do this if we are in an actual */ /* browser environment to avoid the timer handle stalling test runner exit */ /* (#4815) */ typeof window < "u" && // some envs mock window but not fully
  window.HTMLElement && // also exclude jsdom
  // eslint-disable-next-line no-restricted-syntax
  !((o = (n = window.navigator) == null ? void 0 : n.userAgent) != null && o.includes("jsdom")) ? ((t.__VUE_DEVTOOLS_HOOK_REPLAY__ = t.__VUE_DEVTOOLS_HOOK_REPLAY__ || []).push((s) => {
    ad(s, t);
  }), setTimeout(() => {
    fn || (t.__VUE_DEVTOOLS_HOOK_REPLAY__ = null, ql = !0, di = []);
  }, 3e3)) : (ql = !0, di = []);
}
function bh(e, t) {
  Ri("app:init", e, t, {
    Fragment: Ve,
    Text: $o,
    Comment: lt,
    Static: ds
  });
}
function _h(e) {
  Ri("app:unmount", e);
}
const wh = /* @__PURE__ */ $a(
  "component:added"
  /* COMPONENT_ADDED */
), rd = /* @__PURE__ */ $a(
  "component:updated"
  /* COMPONENT_UPDATED */
), kh = /* @__PURE__ */ $a(
  "component:removed"
  /* COMPONENT_REMOVED */
), Sh = (e) => {
  fn && typeof fn.cleanupBuffer == "function" && // remove the component if it wasn't buffered
  !fn.cleanupBuffer(e) && kh(e);
};
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function $a(e) {
  return (t) => {
    Ri(
      e,
      t.appContext.app,
      t.uid,
      t.parent ? t.parent.uid : void 0,
      t
    );
  };
}
const Ch = /* @__PURE__ */ ud(
  "perf:start"
  /* PERFORMANCE_START */
), Eh = /* @__PURE__ */ ud(
  "perf:end"
  /* PERFORMANCE_END */
);
function ud(e) {
  return (t, n, o) => {
    Ri(e, t.appContext.app, t.uid, t, n, o);
  };
}
function xh(e, t, n) {
  Ri(
    "component:emit",
    e.appContext.app,
    e,
    t,
    n
  );
}
let _t = null, cd = null;
function xs(e) {
  const t = _t;
  return _t = e, cd = e && e.type.__scopeId || null, t;
}
function p(e, t = _t, n) {
  if (!t || e._n)
    return e;
  const o = (...i) => {
    o._d && Zr(-1);
    const s = xs(t);
    let l;
    try {
      l = e(...i);
    } finally {
      xs(s), o._d && Zr(1);
    }
    return E.NODE_ENV !== "production" && rd(t), l;
  };
  return o._n = !0, o._c = !0, o._d = !0, o;
}
function dd(e) {
  vv(e) && q("Do not use built-in directive ids as custom directive id: " + e);
}
function rt(e, t) {
  if (_t === null)
    return E.NODE_ENV !== "production" && q("withDirectives can only be used inside render functions."), e;
  const n = nl(_t), o = e.dirs || (e.dirs = []);
  for (let i = 0; i < t.length; i++) {
    let [s, l, a, r = Fe] = t[i];
    s && (Se(s) && (s = {
      mounted: s,
      updated: s
    }), s.deep && Dn(l), o.push({
      dir: s,
      instance: n,
      value: l,
      oldValue: void 0,
      arg: a,
      modifiers: r
    }));
  }
  return e;
}
function mo(e, t, n, o) {
  const i = e.dirs, s = t && t.dirs;
  for (let l = 0; l < i.length; l++) {
    const a = i[l];
    s && (a.oldValue = s[l].value);
    let r = a.dir[o];
    r && (Fn(), nn(r, n, 8, [
      e.el,
      a,
      e,
      t
    ]), Bn());
  }
}
const fd = Symbol("_vte"), md = (e) => e.__isTeleport, Vo = (e) => e && (e.disabled || e.disabled === ""), Vh = (e) => e && (e.defer || e.defer === ""), Br = (e) => typeof SVGElement < "u" && e instanceof SVGElement, Lr = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement, Gl = (e, t) => {
  const n = e && e.to;
  if (Xe(n))
    if (t) {
      const o = t(n);
      return E.NODE_ENV !== "production" && !o && !Vo(e) && q(
        `Failed to locate Teleport target with selector "${n}". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.`
      ), o;
    } else
      return E.NODE_ENV !== "production" && q(
        "Current renderer does not support string target for Teleports. (missing querySelector renderer option)"
      ), null;
  else
    return E.NODE_ENV !== "production" && !n && !Vo(e) && q(`Invalid Teleport target: ${n}`), n;
}, Nh = {
  name: "Teleport",
  __isTeleport: !0,
  process(e, t, n, o, i, s, l, a, r, f) {
    const {
      mc: u,
      pc: d,
      pbc: v,
      o: { insert: h, querySelector: m, createText: g, createComment: _ }
    } = f, S = Vo(t.props);
    let { shapeFlag: N, children: I, dynamicChildren: P } = t;
    if (E.NODE_ENV !== "production" && Qt && (r = !1, P = null), e == null) {
      const x = t.el = E.NODE_ENV !== "production" ? _("teleport start") : g(""), C = t.anchor = E.NODE_ENV !== "production" ? _("teleport end") : g("");
      h(x, n, o), h(C, n, o);
      const $ = (T, D) => {
        N & 16 && (i && i.isCE && (i.ce._teleportTarget = T), u(
          I,
          T,
          D,
          i,
          s,
          l,
          a,
          r
        ));
      }, V = () => {
        const T = t.target = Gl(t.props, m), D = vd(T, t, g, h);
        T ? (l !== "svg" && Br(T) ? l = "svg" : l !== "mathml" && Lr(T) && (l = "mathml"), S || ($(T, D), cs(t, !1))) : E.NODE_ENV !== "production" && !S && q(
          "Invalid Teleport target on mount:",
          T,
          `(${typeof T})`
        );
      };
      S && ($(n, C), cs(t, !0)), Vh(t.props) ? Ot(V, s) : V();
    } else {
      t.el = e.el, t.targetStart = e.targetStart;
      const x = t.anchor = e.anchor, C = t.target = e.target, $ = t.targetAnchor = e.targetAnchor, V = Vo(e.props), T = V ? n : C, D = V ? x : $;
      if (l === "svg" || Br(C) ? l = "svg" : (l === "mathml" || Lr(C)) && (l = "mathml"), P ? (v(
        e.dynamicChildren,
        P,
        T,
        i,
        s,
        l,
        a
      ), yi(e, t, !0)) : r || d(
        e,
        t,
        T,
        D,
        i,
        s,
        l,
        a,
        !1
      ), S)
        V ? t.props && e.props && t.props.to !== e.props.to && (t.props.to = e.props.to) : ts(
          t,
          n,
          x,
          f,
          1
        );
      else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
        const O = t.target = Gl(
          t.props,
          m
        );
        O ? ts(
          t,
          O,
          null,
          f,
          0
        ) : E.NODE_ENV !== "production" && q(
          "Invalid Teleport target on update:",
          C,
          `(${typeof C})`
        );
      } else V && ts(
        t,
        C,
        $,
        f,
        1
      );
      cs(t, S);
    }
  },
  remove(e, t, n, { um: o, o: { remove: i } }, s) {
    const {
      shapeFlag: l,
      children: a,
      anchor: r,
      targetStart: f,
      targetAnchor: u,
      target: d,
      props: v
    } = e;
    if (d && (i(f), i(u)), s && i(r), l & 16) {
      const h = s || !Vo(v);
      for (let m = 0; m < a.length; m++) {
        const g = a[m];
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
  move: ts,
  hydrate: Th
};
function ts(e, t, n, { o: { insert: o }, m: i }, s = 2) {
  s === 0 && o(e.targetAnchor, t, n);
  const { el: l, anchor: a, shapeFlag: r, children: f, props: u } = e, d = s === 2;
  if (d && o(l, t, n), (!d || Vo(u)) && r & 16)
    for (let v = 0; v < f.length; v++)
      i(
        f[v],
        t,
        n,
        2
      );
  d && o(a, t, n);
}
function Th(e, t, n, o, i, s, {
  o: { nextSibling: l, parentNode: a, querySelector: r, insert: f, createText: u }
}, d) {
  const v = t.target = Gl(
    t.props,
    r
  );
  if (v) {
    const h = Vo(t.props), m = v._lpa || v.firstChild;
    if (t.shapeFlag & 16)
      if (h)
        t.anchor = d(
          l(e),
          t,
          a(e),
          n,
          o,
          i,
          s
        ), t.targetStart = m, t.targetAnchor = m && l(m);
      else {
        t.anchor = l(e);
        let g = m;
        for (; g; ) {
          if (g && g.nodeType === 8) {
            if (g.data === "teleport start anchor")
              t.targetStart = g;
            else if (g.data === "teleport anchor") {
              t.targetAnchor = g, v._lpa = t.targetAnchor && l(t.targetAnchor);
              break;
            }
          }
          g = l(g);
        }
        t.targetAnchor || vd(v, t, u, f), d(
          m && l(m),
          t,
          v,
          n,
          o,
          i,
          s
        );
      }
    cs(t, h);
  }
  return t.anchor && l(t.anchor);
}
const Oh = Nh;
function cs(e, t) {
  const n = e.ctx;
  if (n && n.ut) {
    let o, i;
    for (t ? (o = e.el, i = e.anchor) : (o = e.targetStart, i = e.targetAnchor); o && o !== i; )
      o.nodeType === 1 && o.setAttribute("data-v-owner", n.uid), o = o.nextSibling;
    n.ut();
  }
}
function vd(e, t, n, o) {
  const i = t.targetStart = n(""), s = t.targetAnchor = n("");
  return i[fd] = s, e && (o(i, e), o(s, e)), s;
}
const Xn = Symbol("_leaveCb"), ns = Symbol("_enterCb");
function hd() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  return Cn(() => {
    e.isMounted = !0;
  }), kt(() => {
    e.isUnmounting = !0;
  }), e;
}
const jt = [Function, Array], gd = {
  mode: String,
  appear: Boolean,
  persisted: Boolean,
  // enter
  onBeforeEnter: jt,
  onEnter: jt,
  onAfterEnter: jt,
  onEnterCancelled: jt,
  // leave
  onBeforeLeave: jt,
  onLeave: jt,
  onAfterLeave: jt,
  onLeaveCancelled: jt,
  // appear
  onBeforeAppear: jt,
  onAppear: jt,
  onAfterAppear: jt,
  onAppearCancelled: jt
}, yd = (e) => {
  const t = e.subTree;
  return t.component ? yd(t.component) : t;
}, Ah = {
  name: "BaseTransition",
  props: gd,
  setup(e, { slots: t }) {
    const n = tl(), o = hd();
    return () => {
      const i = t.default && Ma(t.default(), !0);
      if (!i || !i.length)
        return;
      const s = pd(i), l = me(e), { mode: a } = l;
      if (E.NODE_ENV !== "production" && a && a !== "in-out" && a !== "out-in" && a !== "default" && q(`invalid <transition> mode: ${a}`), o.isLeaving)
        return Sl(s);
      const r = Rr(s);
      if (!r)
        return Sl(s);
      let f = Si(
        r,
        l,
        o,
        n,
        // #11061, ensure enterHooks is fresh after clone
        (v) => f = v
      );
      r.type !== lt && Po(r, f);
      const u = n.subTree, d = u && Rr(u);
      if (d && d.type !== lt && !_o(r, d) && yd(n).type !== lt) {
        const v = Si(
          d,
          l,
          o,
          n
        );
        if (Po(d, v), a === "out-in" && r.type !== lt)
          return o.isLeaving = !0, v.afterLeave = () => {
            o.isLeaving = !1, n.job.flags & 8 || n.update(), delete v.afterLeave;
          }, Sl(s);
        a === "in-out" && r.type !== lt && (v.delayLeave = (h, m, g) => {
          const _ = bd(
            o,
            d
          );
          _[String(d.key)] = d, h[Xn] = () => {
            m(), h[Xn] = void 0, delete f.delayedLeave;
          }, f.delayedLeave = g;
        });
      }
      return s;
    };
  }
};
function pd(e) {
  let t = e[0];
  if (e.length > 1) {
    let n = !1;
    for (const o of e)
      if (o.type !== lt) {
        if (E.NODE_ENV !== "production" && n) {
          q(
            "<transition> can only be used on a single element or component. Use <transition-group> for lists."
          );
          break;
        }
        if (t = o, n = !0, E.NODE_ENV === "production") break;
      }
  }
  return t;
}
const Ih = Ah;
function bd(e, t) {
  const { leavingVNodes: n } = e;
  let o = n.get(t.type);
  return o || (o = /* @__PURE__ */ Object.create(null), n.set(t.type, o)), o;
}
function Si(e, t, n, o, i) {
  const {
    appear: s,
    mode: l,
    persisted: a = !1,
    onBeforeEnter: r,
    onEnter: f,
    onAfterEnter: u,
    onEnterCancelled: d,
    onBeforeLeave: v,
    onLeave: h,
    onAfterLeave: m,
    onLeaveCancelled: g,
    onBeforeAppear: _,
    onAppear: S,
    onAfterAppear: N,
    onAppearCancelled: I
  } = t, P = String(e.key), x = bd(n, e), C = (T, D) => {
    T && nn(
      T,
      o,
      9,
      D
    );
  }, $ = (T, D) => {
    const O = D[1];
    C(T, D), he(T) ? T.every((k) => k.length <= 1) && O() : T.length <= 1 && O();
  }, V = {
    mode: l,
    persisted: a,
    beforeEnter(T) {
      let D = r;
      if (!n.isMounted)
        if (s)
          D = _ || r;
        else
          return;
      T[Xn] && T[Xn](
        !0
        /* cancelled */
      );
      const O = x[P];
      O && _o(e, O) && O.el[Xn] && O.el[Xn](), C(D, [T]);
    },
    enter(T) {
      let D = f, O = u, k = d;
      if (!n.isMounted)
        if (s)
          D = S || f, O = N || u, k = I || d;
        else
          return;
      let A = !1;
      const B = T[ns] = (Q) => {
        A || (A = !0, Q ? C(k, [T]) : C(O, [T]), V.delayedLeave && V.delayedLeave(), T[ns] = void 0);
      };
      D ? $(D, [T, B]) : B();
    },
    leave(T, D) {
      const O = String(e.key);
      if (T[ns] && T[ns](
        !0
        /* cancelled */
      ), n.isUnmounting)
        return D();
      C(v, [T]);
      let k = !1;
      const A = T[Xn] = (B) => {
        k || (k = !0, D(), B ? C(g, [T]) : C(m, [T]), T[Xn] = void 0, x[O] === e && delete x[O]);
      };
      x[O] = e, h ? $(h, [T, A]) : A();
    },
    clone(T) {
      const D = Si(
        T,
        t,
        n,
        o,
        i
      );
      return i && i(D), D;
    }
  };
  return V;
}
function Sl(e) {
  if (Hi(e))
    return e = on(e), e.children = null, e;
}
function Rr(e) {
  if (!Hi(e))
    return md(e.type) && e.children ? pd(e.children) : e;
  if (E.NODE_ENV !== "production" && e.component)
    return e.component.subTree;
  const { shapeFlag: t, children: n } = e;
  if (n) {
    if (t & 16)
      return n[0];
    if (t & 32 && Se(n.default))
      return n.default();
  }
}
function Po(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, Po(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function Ma(e, t = !1, n) {
  let o = [], i = 0;
  for (let s = 0; s < e.length; s++) {
    let l = e[s];
    const a = n == null ? l.key : String(n) + String(l.key != null ? l.key : s);
    l.type === Ve ? (l.patchFlag & 128 && i++, o = o.concat(
      Ma(l.children, t, a)
    )) : (t || l.type !== lt) && o.push(a != null ? on(l, { key: a }) : l);
  }
  if (i > 1)
    for (let s = 0; s < o.length; s++)
      o[s].patchFlag = -2;
  return o;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Ph(e, t) {
  return Se(e) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    Je({ name: e.name }, t, { setup: e })
  ) : e;
}
function _d(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
const Dh = /* @__PURE__ */ new WeakSet();
function Kl(e, t, n, o, i = !1) {
  if (he(e)) {
    e.forEach(
      (m, g) => Kl(
        m,
        t && (he(t) ? t[g] : t),
        n,
        o,
        i
      )
    );
    return;
  }
  if (gi(o) && !i)
    return;
  const s = o.shapeFlag & 4 ? nl(o.component) : o.el, l = i ? null : s, { i: a, r } = e;
  if (E.NODE_ENV !== "production" && !a) {
    q(
      "Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function."
    );
    return;
  }
  const f = t && t.r, u = a.refs === Fe ? a.refs = {} : a.refs, d = a.setupState, v = me(d), h = d === Fe ? () => !1 : (m) => E.NODE_ENV !== "production" && (Pe(v, m) && !Ue(v[m]) && q(
    `Template ref "${m}" used on a non-ref value. It will not work in the production build.`
  ), Dh.has(v[m])) ? !1 : Pe(v, m);
  if (f != null && f !== r && (Xe(f) ? (u[f] = null, h(f) && (d[f] = null)) : Ue(f) && (f.value = null)), Se(r))
    Qo(r, a, 12, [l, u]);
  else {
    const m = Xe(r), g = Ue(r);
    if (m || g) {
      const _ = () => {
        if (e.f) {
          const S = m ? h(r) ? d[r] : u[r] : r.value;
          i ? he(S) && Sa(S, s) : he(S) ? S.includes(s) || S.push(s) : m ? (u[r] = [s], h(r) && (d[r] = u[r])) : (r.value = [s], e.k && (u[e.k] = r.value));
        } else m ? (u[r] = l, h(r) && (d[r] = l)) : g ? (r.value = l, e.k && (u[e.k] = l)) : E.NODE_ENV !== "production" && q("Invalid template ref type:", r, `(${typeof r})`);
      };
      l ? (_.id = -1, Ot(_, n)) : _();
    } else E.NODE_ENV !== "production" && q("Invalid template ref type:", r, `(${typeof r})`);
  }
}
Fi().requestIdleCallback;
Fi().cancelIdleCallback;
const gi = (e) => !!e.type.__asyncLoader, Hi = (e) => e.type.__isKeepAlive;
function wd(e, t) {
  Sd(e, "a", t);
}
function kd(e, t) {
  Sd(e, "da", t);
}
function Sd(e, t, n = dt) {
  const o = e.__wdc || (e.__wdc = () => {
    let i = n;
    for (; i; ) {
      if (i.isDeactivated)
        return;
      i = i.parent;
    }
    return e();
  });
  if (Qs(t, o, n), n) {
    let i = n.parent;
    for (; i && i.parent; )
      Hi(i.parent.vnode) && $h(o, t, n, i), i = i.parent;
  }
}
function $h(e, t, n, o) {
  const i = Qs(
    t,
    e,
    o,
    !0
    /* prepend */
  );
  Cd(() => {
    Sa(o[t], i);
  }, n);
}
function Qs(e, t, n = dt, o = !1) {
  if (n) {
    const i = n[e] || (n[e] = []), s = t.__weh || (t.__weh = (...l) => {
      Fn();
      const a = ji(n), r = nn(t, n, e, l);
      return a(), Bn(), r;
    });
    return o ? i.unshift(s) : i.push(s), s;
  } else if (E.NODE_ENV !== "production") {
    const i = po(Pa[e].replace(/ hook$/, ""));
    q(
      `${i} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
    );
  }
}
const Ln = (e) => (t, n = dt) => {
  (!Ei || e === "sp") && Qs(e, (...o) => t(...o), n);
}, Fa = Ln("bm"), Cn = Ln("m"), Mh = Ln(
  "bu"
), Ba = Ln("u"), kt = Ln(
  "bum"
), Cd = Ln("um"), Fh = Ln(
  "sp"
), Bh = Ln("rtg"), Lh = Ln("rtc");
function Rh(e, t = dt) {
  Qs("ec", e, t);
}
const Yl = "components", Hh = "directives", jh = Symbol.for("v-ndc");
function zh(e) {
  return Xe(e) && Ed(Yl, e, !1) || e;
}
function Rn(e) {
  return Ed(Hh, e);
}
function Ed(e, t, n = !0, o = !1) {
  const i = _t || dt;
  if (i) {
    const s = i.type;
    if (e === Yl) {
      const a = Wa(
        s,
        !1
      );
      if (a && (a === t || a === gt(t) || a === Kt(gt(t))))
        return s;
    }
    const l = (
      // local registration
      // check instance[type] first which is resolved for options API
      Hr(i[e] || s[e], t) || // global registration
      Hr(i.appContext[e], t)
    );
    if (!l && o)
      return s;
    if (E.NODE_ENV !== "production" && n && !l) {
      const a = e === Yl ? `
If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.` : "";
      q(`Failed to resolve ${e.slice(0, -1)}: ${t}${a}`);
    }
    return l;
  } else E.NODE_ENV !== "production" && q(
    `resolve${Kt(e.slice(0, -1))} can only be used in render() or setup().`
  );
}
function Hr(e, t) {
  return e && (e[t] || e[gt(t)] || e[Kt(gt(t))]);
}
function qt(e, t, n, o) {
  let i;
  const s = n, l = he(e);
  if (l || Xe(e)) {
    const a = l && Eo(e);
    let r = !1;
    a && (r = !xt(e), e = Ys(e)), i = new Array(e.length);
    for (let f = 0, u = e.length; f < u; f++)
      i[f] = t(
        r ? bt(e[f]) : e[f],
        f,
        void 0,
        s
      );
  } else if (typeof e == "number") {
    E.NODE_ENV !== "production" && !Number.isInteger(e) && q(`The v-for range expect an integer value but got ${e}.`), i = new Array(e);
    for (let a = 0; a < e; a++)
      i[a] = t(a + 1, a, void 0, s);
  } else if ($e(e))
    if (e[Symbol.iterator])
      i = Array.from(
        e,
        (a, r) => t(a, r, void 0, s)
      );
    else {
      const a = Object.keys(e);
      i = new Array(a.length);
      for (let r = 0, f = a.length; r < f; r++) {
        const u = a[r];
        i[r] = t(e[u], u, r, s);
      }
    }
  else
    i = [];
  return i;
}
const Xl = (e) => e ? Gd(e) ? nl(e) : Xl(e.parent) : null, No = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ Je(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => E.NODE_ENV !== "production" ? mn(e.props) : e.props,
    $attrs: (e) => E.NODE_ENV !== "production" ? mn(e.attrs) : e.attrs,
    $slots: (e) => E.NODE_ENV !== "production" ? mn(e.slots) : e.slots,
    $refs: (e) => E.NODE_ENV !== "production" ? mn(e.refs) : e.refs,
    $parent: (e) => Xl(e.parent),
    $root: (e) => Xl(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Ra(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Zs(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = at.bind(e.proxy)),
    $watch: (e) => wg.bind(e)
  })
), La = (e) => e === "_" || e === "$", Cl = (e, t) => e !== Fe && !e.__isScriptSetup && Pe(e, t), xd = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: n, setupState: o, data: i, props: s, accessCache: l, type: a, appContext: r } = e;
    if (E.NODE_ENV !== "production" && t === "__isVue")
      return !0;
    let f;
    if (t[0] !== "$") {
      const h = l[t];
      if (h !== void 0)
        switch (h) {
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
        if (Cl(o, t))
          return l[t] = 1, o[t];
        if (i !== Fe && Pe(i, t))
          return l[t] = 2, i[t];
        if (
          // only cache other properties when instance has declared (thus stable)
          // props
          (f = e.propsOptions[0]) && Pe(f, t)
        )
          return l[t] = 3, s[t];
        if (n !== Fe && Pe(n, t))
          return l[t] = 4, n[t];
        Jl && (l[t] = 0);
      }
    }
    const u = No[t];
    let d, v;
    if (u)
      return t === "$attrs" ? (ut(e.attrs, "get", ""), E.NODE_ENV !== "production" && Ts()) : E.NODE_ENV !== "production" && t === "$slots" && ut(e, "get", t), u(e);
    if (
      // css module (injected by vue-loader)
      (d = a.__cssModules) && (d = d[t])
    )
      return d;
    if (n !== Fe && Pe(n, t))
      return l[t] = 4, n[t];
    if (
      // global properties
      v = r.config.globalProperties, Pe(v, t)
    )
      return v[t];
    E.NODE_ENV !== "production" && _t && (!Xe(t) || // #1091 avoid internal isRef/isVNode checks on component instance leading
    // to infinite warning loop
    t.indexOf("__v") !== 0) && (i !== Fe && La(t[0]) && Pe(i, t) ? q(
      `Property ${JSON.stringify(
        t
      )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
    ) : e === _t && q(
      `Property ${JSON.stringify(t)} was accessed during render but is not defined on instance.`
    ));
  },
  set({ _: e }, t, n) {
    const { data: o, setupState: i, ctx: s } = e;
    return Cl(i, t) ? (i[t] = n, !0) : E.NODE_ENV !== "production" && i.__isScriptSetup && Pe(i, t) ? (q(`Cannot mutate <script setup> binding "${t}" from Options API.`), !1) : o !== Fe && Pe(o, t) ? (o[t] = n, !0) : Pe(e.props, t) ? (E.NODE_ENV !== "production" && q(`Attempting to mutate prop "${t}". Props are readonly.`), !1) : t[0] === "$" && t.slice(1) in e ? (E.NODE_ENV !== "production" && q(
      `Attempting to mutate public property "${t}". Properties starting with $ are reserved and readonly.`
    ), !1) : (E.NODE_ENV !== "production" && t in e.appContext.config.globalProperties ? Object.defineProperty(s, t, {
      enumerable: !0,
      configurable: !0,
      value: n
    }) : s[t] = n, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: n, ctx: o, appContext: i, propsOptions: s }
  }, l) {
    let a;
    return !!n[l] || e !== Fe && Pe(e, l) || Cl(t, l) || (a = s[0]) && Pe(a, l) || Pe(o, l) || Pe(No, l) || Pe(i.config.globalProperties, l);
  },
  defineProperty(e, t, n) {
    return n.get != null ? e._.accessCache[t] = 0 : Pe(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
  }
};
E.NODE_ENV !== "production" && (xd.ownKeys = (e) => (q(
  "Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead."
), Reflect.ownKeys(e)));
function Uh(e) {
  const t = {};
  return Object.defineProperty(t, "_", {
    configurable: !0,
    enumerable: !1,
    get: () => e
  }), Object.keys(No).forEach((n) => {
    Object.defineProperty(t, n, {
      configurable: !0,
      enumerable: !1,
      get: () => No[n](e),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: ct
    });
  }), t;
}
function Wh(e) {
  const {
    ctx: t,
    propsOptions: [n]
  } = e;
  n && Object.keys(n).forEach((o) => {
    Object.defineProperty(t, o, {
      enumerable: !0,
      configurable: !0,
      get: () => e.props[o],
      set: ct
    });
  });
}
function qh(e) {
  const { ctx: t, setupState: n } = e;
  Object.keys(me(n)).forEach((o) => {
    if (!n.__isScriptSetup) {
      if (La(o[0])) {
        q(
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
        set: ct
      });
    }
  });
}
function jr(e) {
  return he(e) ? e.reduce(
    (t, n) => (t[n] = null, t),
    {}
  ) : e;
}
function Gh() {
  const e = /* @__PURE__ */ Object.create(null);
  return (t, n) => {
    e[n] ? q(`${t} property "${n}" is already defined in ${e[n]}.`) : e[n] = t;
  };
}
let Jl = !0;
function Kh(e) {
  const t = Ra(e), n = e.proxy, o = e.ctx;
  Jl = !1, t.beforeCreate && zr(t.beforeCreate, e, "bc");
  const {
    // state
    data: i,
    computed: s,
    methods: l,
    watch: a,
    provide: r,
    inject: f,
    // lifecycle
    created: u,
    beforeMount: d,
    mounted: v,
    beforeUpdate: h,
    updated: m,
    activated: g,
    deactivated: _,
    beforeDestroy: S,
    beforeUnmount: N,
    destroyed: I,
    unmounted: P,
    render: x,
    renderTracked: C,
    renderTriggered: $,
    errorCaptured: V,
    serverPrefetch: T,
    // public API
    expose: D,
    inheritAttrs: O,
    // assets
    components: k,
    directives: A,
    filters: B
  } = t, Q = E.NODE_ENV !== "production" ? Gh() : null;
  if (E.NODE_ENV !== "production") {
    const [ne] = e.propsOptions;
    if (ne)
      for (const J in ne)
        Q("Props", J);
  }
  if (f && Yh(f, o, Q), l)
    for (const ne in l) {
      const J = l[ne];
      Se(J) ? (E.NODE_ENV !== "production" ? Object.defineProperty(o, ne, {
        value: J.bind(n),
        configurable: !0,
        enumerable: !0,
        writable: !0
      }) : o[ne] = J.bind(n), E.NODE_ENV !== "production" && Q("Methods", ne)) : E.NODE_ENV !== "production" && q(
        `Method "${ne}" has type "${typeof J}" in the component definition. Did you reference the function correctly?`
      );
    }
  if (i) {
    E.NODE_ENV !== "production" && !Se(i) && q(
      "The data option must be a function. Plain object usage is no longer supported."
    );
    const ne = i.call(n, n);
    if (E.NODE_ENV !== "production" && Ca(ne) && q(
      "data() returned a Promise - note data() cannot be async; If you intend to perform data fetching before component renders, use async setup() + <Suspense>."
    ), !$e(ne))
      E.NODE_ENV !== "production" && q("data() should return an object.");
    else if (e.data = ht(ne), E.NODE_ENV !== "production")
      for (const J in ne)
        Q("Data", J), La(J[0]) || Object.defineProperty(o, J, {
          configurable: !0,
          enumerable: !0,
          get: () => ne[J],
          set: ct
        });
  }
  if (Jl = !0, s)
    for (const ne in s) {
      const J = s[ne], Ce = Se(J) ? J.bind(n, n) : Se(J.get) ? J.get.bind(n, n) : ct;
      E.NODE_ENV !== "production" && Ce === ct && q(`Computed property "${ne}" has no getter.`);
      const K = !Se(J) && Se(J.set) ? J.set.bind(n) : E.NODE_ENV !== "production" ? () => {
        q(
          `Write operation failed: computed property "${ne}" is readonly.`
        );
      } : ct, X = b({
        get: Ce,
        set: K
      });
      Object.defineProperty(o, ne, {
        enumerable: !0,
        configurable: !0,
        get: () => X.value,
        set: (te) => X.value = te
      }), E.NODE_ENV !== "production" && Q("Computed", ne);
    }
  if (a)
    for (const ne in a)
      Vd(a[ne], o, n, ne);
  if (r) {
    const ne = Se(r) ? r.call(n) : r;
    Reflect.ownKeys(ne).forEach((J) => {
      yt(J, ne[J]);
    });
  }
  u && zr(u, e, "c");
  function re(ne, J) {
    he(J) ? J.forEach((Ce) => ne(Ce.bind(n))) : J && ne(J.bind(n));
  }
  if (re(Fa, d), re(Cn, v), re(Mh, h), re(Ba, m), re(wd, g), re(kd, _), re(Rh, V), re(Lh, C), re(Bh, $), re(kt, N), re(Cd, P), re(Fh, T), he(D))
    if (D.length) {
      const ne = e.exposed || (e.exposed = {});
      D.forEach((J) => {
        Object.defineProperty(ne, J, {
          get: () => n[J],
          set: (Ce) => n[J] = Ce
        });
      });
    } else e.exposed || (e.exposed = {});
  x && e.render === ct && (e.render = x), O != null && (e.inheritAttrs = O), k && (e.components = k), A && (e.directives = A), T && _d(e);
}
function Yh(e, t, n = ct) {
  he(e) && (e = Zl(e));
  for (const o in e) {
    const i = e[o];
    let s;
    $e(i) ? "default" in i ? s = je(
      i.from || o,
      i.default,
      !0
    ) : s = je(i.from || o) : s = je(i), Ue(s) ? Object.defineProperty(t, o, {
      enumerable: !0,
      configurable: !0,
      get: () => s.value,
      set: (l) => s.value = l
    }) : t[o] = s, E.NODE_ENV !== "production" && n("Inject", o);
  }
}
function zr(e, t, n) {
  nn(
    he(e) ? e.map((o) => o.bind(t.proxy)) : e.bind(t.proxy),
    t,
    n
  );
}
function Vd(e, t, n, o) {
  let i = o.includes(".") ? Ld(n, o) : () => n[o];
  if (Xe(e)) {
    const s = t[e];
    Se(s) ? ke(i, s) : E.NODE_ENV !== "production" && q(`Invalid watch handler specified by key "${e}"`, s);
  } else if (Se(e))
    ke(i, e.bind(n));
  else if ($e(e))
    if (he(e))
      e.forEach((s) => Vd(s, t, n, o));
    else {
      const s = Se(e.handler) ? e.handler.bind(n) : t[e.handler];
      Se(s) ? ke(i, s, e) : E.NODE_ENV !== "production" && q(`Invalid watch handler specified by key "${e.handler}"`, s);
    }
  else E.NODE_ENV !== "production" && q(`Invalid watch option: "${o}"`, e);
}
function Ra(e) {
  const t = e.type, { mixins: n, extends: o } = t, {
    mixins: i,
    optionsCache: s,
    config: { optionMergeStrategies: l }
  } = e.appContext, a = s.get(t);
  let r;
  return a ? r = a : !i.length && !n && !o ? r = t : (r = {}, i.length && i.forEach(
    (f) => Vs(r, f, l, !0)
  ), Vs(r, t, l)), $e(t) && s.set(t, r), r;
}
function Vs(e, t, n, o = !1) {
  const { mixins: i, extends: s } = t;
  s && Vs(e, s, n, !0), i && i.forEach(
    (l) => Vs(e, l, n, !0)
  );
  for (const l in t)
    if (o && l === "expose")
      E.NODE_ENV !== "production" && q(
        '"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.'
      );
    else {
      const a = Xh[l] || n && n[l];
      e[l] = a ? a(e[l], t[l]) : t[l];
    }
  return e;
}
const Xh = {
  data: Ur,
  props: Wr,
  emits: Wr,
  // objects
  methods: fi,
  computed: fi,
  // lifecycle
  beforeCreate: St,
  created: St,
  beforeMount: St,
  mounted: St,
  beforeUpdate: St,
  updated: St,
  beforeDestroy: St,
  beforeUnmount: St,
  destroyed: St,
  unmounted: St,
  activated: St,
  deactivated: St,
  errorCaptured: St,
  serverPrefetch: St,
  // assets
  components: fi,
  directives: fi,
  // watch
  watch: Zh,
  // provide / inject
  provide: Ur,
  inject: Jh
};
function Ur(e, t) {
  return t ? e ? function() {
    return Je(
      Se(e) ? e.call(this, this) : e,
      Se(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function Jh(e, t) {
  return fi(Zl(e), Zl(t));
}
function Zl(e) {
  if (he(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++)
      t[e[n]] = e[n];
    return t;
  }
  return e;
}
function St(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function fi(e, t) {
  return e ? Je(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function Wr(e, t) {
  return e ? he(e) && he(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : Je(
    /* @__PURE__ */ Object.create(null),
    jr(e),
    jr(t ?? {})
  ) : t;
}
function Zh(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = Je(/* @__PURE__ */ Object.create(null), e);
  for (const o in t)
    n[o] = St(e[o], t[o]);
  return n;
}
function Nd() {
  return {
    app: null,
    config: {
      isNativeTag: fv,
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
let Qh = 0;
function eg(e, t) {
  return function(o, i = null) {
    Se(o) || (o = Je({}, o)), i != null && !$e(i) && (E.NODE_ENV !== "production" && q("root props passed to app.mount() must be an object."), i = null);
    const s = Nd(), l = /* @__PURE__ */ new WeakSet(), a = [];
    let r = !1;
    const f = s.app = {
      _uid: Qh++,
      _component: o,
      _props: i,
      _container: null,
      _context: s,
      _instance: null,
      version: nu,
      get config() {
        return s.config;
      },
      set config(u) {
        E.NODE_ENV !== "production" && q(
          "app.config cannot be replaced. Modify individual options instead."
        );
      },
      use(u, ...d) {
        return l.has(u) ? E.NODE_ENV !== "production" && q("Plugin has already been applied to target app.") : u && Se(u.install) ? (l.add(u), u.install(f, ...d)) : Se(u) ? (l.add(u), u(f, ...d)) : E.NODE_ENV !== "production" && q(
          'A plugin must either be a function or an object with an "install" function.'
        ), f;
      },
      mixin(u) {
        return s.mixins.includes(u) ? E.NODE_ENV !== "production" && q(
          "Mixin has already been applied to target app" + (u.name ? `: ${u.name}` : "")
        ) : s.mixins.push(u), f;
      },
      component(u, d) {
        return E.NODE_ENV !== "production" && oa(u, s.config), d ? (E.NODE_ENV !== "production" && s.components[u] && q(`Component "${u}" has already been registered in target app.`), s.components[u] = d, f) : s.components[u];
      },
      directive(u, d) {
        return E.NODE_ENV !== "production" && dd(u), d ? (E.NODE_ENV !== "production" && s.directives[u] && q(`Directive "${u}" has already been registered in target app.`), s.directives[u] = d, f) : s.directives[u];
      },
      mount(u, d, v) {
        if (r)
          E.NODE_ENV !== "production" && q(
            "App has already been mounted.\nIf you want to remount the same app, move your app creation logic into a factory function and create fresh app instances for each mount - e.g. `const createMyApp = () => createApp(App)`"
          );
        else {
          E.NODE_ENV !== "production" && u.__vue_app__ && q(
            "There is already an app instance mounted on the host container.\n If you want to mount another app on the same host container, you need to unmount the previous app by calling `app.unmount()` first."
          );
          const h = f._ceVNode || c(o, i);
          return h.appContext = s, v === !0 ? v = "svg" : v === !1 && (v = void 0), E.NODE_ENV !== "production" && (s.reload = () => {
            e(
              on(h),
              u,
              v
            );
          }), d && t ? t(h, u) : e(h, u, v), r = !0, f._container = u, u.__vue_app__ = f, E.NODE_ENV !== "production" && (f._instance = h.component, bh(f, nu)), nl(h.component);
        }
      },
      onUnmount(u) {
        E.NODE_ENV !== "production" && typeof u != "function" && q(
          `Expected function as first argument to app.onUnmount(), but got ${typeof u}`
        ), a.push(u);
      },
      unmount() {
        r ? (nn(
          a,
          f._instance,
          16
        ), e(null, f._container), E.NODE_ENV !== "production" && (f._instance = null, _h(f)), delete f._container.__vue_app__) : E.NODE_ENV !== "production" && q("Cannot unmount an app that is not mounted.");
      },
      provide(u, d) {
        return E.NODE_ENV !== "production" && u in s.provides && q(
          `App already provides property with key "${String(u)}". It will be overwritten with the new value.`
        ), s.provides[u] = d, f;
      },
      runWithContext(u) {
        const d = Go;
        Go = f;
        try {
          return u();
        } finally {
          Go = d;
        }
      }
    };
    return f;
  };
}
let Go = null;
function yt(e, t) {
  if (!dt)
    E.NODE_ENV !== "production" && q("provide() can only be used inside setup().");
  else {
    let n = dt.provides;
    const o = dt.parent && dt.parent.provides;
    o === n && (n = dt.provides = Object.create(o)), n[e] = t;
  }
}
function je(e, t, n = !1) {
  const o = dt || _t;
  if (o || Go) {
    const i = Go ? Go._context.provides : o ? o.parent == null ? o.vnode.appContext && o.vnode.appContext.provides : o.parent.provides : void 0;
    if (i && e in i)
      return i[e];
    if (arguments.length > 1)
      return n && Se(t) ? t.call(o && o.proxy) : t;
    E.NODE_ENV !== "production" && q(`injection "${String(e)}" not found.`);
  } else E.NODE_ENV !== "production" && q("inject() can only be used inside setup() or functional components.");
}
const Td = {}, Od = () => Object.create(Td), Ad = (e) => Object.getPrototypeOf(e) === Td;
function tg(e, t, n, o = !1) {
  const i = {}, s = Od();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), Id(e, t, i, s);
  for (const l in e.propsOptions[0])
    l in i || (i[l] = void 0);
  E.NODE_ENV !== "production" && Dd(t || {}, i, e), n ? e.props = o ? i : Zv(i) : e.type.props ? e.props = i : e.props = s, e.attrs = s;
}
function ng(e) {
  for (; e; ) {
    if (e.type.__hmrId) return !0;
    e = e.parent;
  }
}
function og(e, t, n, o) {
  const {
    props: i,
    attrs: s,
    vnode: { patchFlag: l }
  } = e, a = me(i), [r] = e.propsOptions;
  let f = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(E.NODE_ENV !== "production" && ng(e)) && (o || l > 0) && !(l & 16)
  ) {
    if (l & 8) {
      const u = e.vnode.dynamicProps;
      for (let d = 0; d < u.length; d++) {
        let v = u[d];
        if (el(e.emitsOptions, v))
          continue;
        const h = t[v];
        if (r)
          if (Pe(s, v))
            h !== s[v] && (s[v] = h, f = !0);
          else {
            const m = gt(v);
            i[m] = Ql(
              r,
              a,
              m,
              h,
              e,
              !1
            );
          }
        else
          h !== s[v] && (s[v] = h, f = !0);
      }
    }
  } else {
    Id(e, t, i, s) && (f = !0);
    let u;
    for (const d in a)
      (!t || // for camelCase
      !Pe(t, d) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((u = no(d)) === d || !Pe(t, u))) && (r ? n && // for camelCase
      (n[d] !== void 0 || // for kebab-case
      n[u] !== void 0) && (i[d] = Ql(
        r,
        a,
        d,
        void 0,
        e,
        !0
      )) : delete i[d]);
    if (s !== a)
      for (const d in s)
        (!t || !Pe(t, d)) && (delete s[d], f = !0);
  }
  f && dn(e.attrs, "set", ""), E.NODE_ENV !== "production" && Dd(t || {}, i, e);
}
function Id(e, t, n, o) {
  const [i, s] = e.propsOptions;
  let l = !1, a;
  if (t)
    for (let r in t) {
      if (mi(r))
        continue;
      const f = t[r];
      let u;
      i && Pe(i, u = gt(r)) ? !s || !s.includes(u) ? n[u] = f : (a || (a = {}))[u] = f : el(e.emitsOptions, r) || (!(r in o) || f !== o[r]) && (o[r] = f, l = !0);
    }
  if (s) {
    const r = me(n), f = a || Fe;
    for (let u = 0; u < s.length; u++) {
      const d = s[u];
      n[d] = Ql(
        i,
        r,
        d,
        f[d],
        e,
        !Pe(f, d)
      );
    }
  }
  return l;
}
function Ql(e, t, n, o, i, s) {
  const l = e[n];
  if (l != null) {
    const a = Pe(l, "default");
    if (a && o === void 0) {
      const r = l.default;
      if (l.type !== Function && !l.skipFactory && Se(r)) {
        const { propsDefaults: f } = i;
        if (n in f)
          o = f[n];
        else {
          const u = ji(i);
          o = f[n] = r.call(
            null,
            t
          ), u();
        }
      } else
        o = r;
      i.ce && i.ce._setProp(n, o);
    }
    l[
      0
      /* shouldCast */
    ] && (s && !a ? o = !1 : l[
      1
      /* shouldCastTrue */
    ] && (o === "" || o === no(n)) && (o = !0));
  }
  return o;
}
const ig = /* @__PURE__ */ new WeakMap();
function Pd(e, t, n = !1) {
  const o = n ? ig : t.propsCache, i = o.get(e);
  if (i)
    return i;
  const s = e.props, l = {}, a = [];
  let r = !1;
  if (!Se(e)) {
    const u = (d) => {
      r = !0;
      const [v, h] = Pd(d, t, !0);
      Je(l, v), h && a.push(...h);
    };
    !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
  }
  if (!s && !r)
    return $e(e) && o.set(e, Wo), Wo;
  if (he(s))
    for (let u = 0; u < s.length; u++) {
      E.NODE_ENV !== "production" && !Xe(s[u]) && q("props must be strings when using array syntax.", s[u]);
      const d = gt(s[u]);
      qr(d) && (l[d] = Fe);
    }
  else if (s) {
    E.NODE_ENV !== "production" && !$e(s) && q("invalid props options", s);
    for (const u in s) {
      const d = gt(u);
      if (qr(d)) {
        const v = s[u], h = l[d] = he(v) || Se(v) ? { type: v } : Je({}, v), m = h.type;
        let g = !1, _ = !0;
        if (he(m))
          for (let S = 0; S < m.length; ++S) {
            const N = m[S], I = Se(N) && N.name;
            if (I === "Boolean") {
              g = !0;
              break;
            } else I === "String" && (_ = !1);
          }
        else
          g = Se(m) && m.name === "Boolean";
        h[
          0
          /* shouldCast */
        ] = g, h[
          1
          /* shouldCastTrue */
        ] = _, (g || Pe(h, "default")) && a.push(d);
      }
    }
  }
  const f = [l, a];
  return $e(e) && o.set(e, f), f;
}
function qr(e) {
  return e[0] !== "$" && !mi(e) ? !0 : (E.NODE_ENV !== "production" && q(`Invalid prop name: "${e}" is a reserved property.`), !1);
}
function sg(e) {
  return e === null ? "null" : typeof e == "function" ? e.name || "" : typeof e == "object" && e.constructor && e.constructor.name || "";
}
function Dd(e, t, n) {
  const o = me(t), i = n.propsOptions[0], s = Object.keys(e).map((l) => gt(l));
  for (const l in i) {
    let a = i[l];
    a != null && lg(
      l,
      o[l],
      a,
      E.NODE_ENV !== "production" ? mn(o) : o,
      !s.includes(l)
    );
  }
}
function lg(e, t, n, o, i) {
  const { type: s, required: l, validator: a, skipCheck: r } = n;
  if (l && i) {
    q('Missing required prop: "' + e + '"');
    return;
  }
  if (!(t == null && !l)) {
    if (s != null && s !== !0 && !r) {
      let f = !1;
      const u = he(s) ? s : [s], d = [];
      for (let v = 0; v < u.length && !f; v++) {
        const { valid: h, expectedType: m } = rg(t, u[v]);
        d.push(m || ""), f = h;
      }
      if (!f) {
        q(ug(e, t, d));
        return;
      }
    }
    a && !a(t, o) && q('Invalid prop: custom validator check failed for prop "' + e + '".');
  }
}
const ag = /* @__PURE__ */ Mn(
  "String,Number,Boolean,Function,Symbol,BigInt"
);
function rg(e, t) {
  let n;
  const o = sg(t);
  if (o === "null")
    n = e === null;
  else if (ag(o)) {
    const i = typeof e;
    n = i === o.toLowerCase(), !n && i === "object" && (n = e instanceof t);
  } else o === "Object" ? n = $e(e) : o === "Array" ? n = he(e) : n = e instanceof t;
  return {
    valid: n,
    expectedType: o
  };
}
function ug(e, t, n) {
  if (n.length === 0)
    return `Prop type [] for prop "${e}" won't match anything. Did you mean to use type Array instead?`;
  let o = `Invalid prop: type check failed for prop "${e}". Expected ${n.map(Kt).join(" | ")}`;
  const i = n[0], s = Ea(t), l = Gr(t, i), a = Gr(t, s);
  return n.length === 1 && Kr(i) && !cg(i, s) && (o += ` with value ${l}`), o += `, got ${s} `, Kr(s) && (o += `with value ${a}.`), o;
}
function Gr(e, t) {
  return t === "String" ? `"${e}"` : t === "Number" ? `${Number(e)}` : `${e}`;
}
function Kr(e) {
  return ["string", "number", "boolean"].some((n) => e.toLowerCase() === n);
}
function cg(...e) {
  return e.some((t) => t.toLowerCase() === "boolean");
}
const $d = (e) => e[0] === "_" || e === "$stable", Ha = (e) => he(e) ? e.map(Jt) : [Jt(e)], dg = (e, t, n) => {
  if (t._n)
    return t;
  const o = p((...i) => (E.NODE_ENV !== "production" && dt && (!n || n.root === dt.root) && q(
    `Slot "${e}" invoked outside of the render function: this will not track dependencies used in the slot. Invoke the slot function inside the render function instead.`
  ), Ha(t(...i))), n);
  return o._c = !1, o;
}, Md = (e, t, n) => {
  const o = e._ctx;
  for (const i in e) {
    if ($d(i)) continue;
    const s = e[i];
    if (Se(s))
      t[i] = dg(i, s, o);
    else if (s != null) {
      E.NODE_ENV !== "production" && q(
        `Non-function value encountered for slot "${i}". Prefer function slots for better performance.`
      );
      const l = Ha(s);
      t[i] = () => l;
    }
  }
}, Fd = (e, t) => {
  E.NODE_ENV !== "production" && !Hi(e.vnode) && q(
    "Non-function value encountered for default slot. Prefer function slots for better performance."
  );
  const n = Ha(t);
  e.slots.default = () => n;
}, ea = (e, t, n) => {
  for (const o in t)
    (n || o !== "_") && (e[o] = t[o]);
}, fg = (e, t, n) => {
  const o = e.slots = Od();
  if (e.vnode.shapeFlag & 32) {
    const i = t._;
    i ? (ea(o, t, n), n && _s(o, "_", i, !0)) : Md(t, o);
  } else t && Fd(e, t);
}, mg = (e, t, n) => {
  const { vnode: o, slots: i } = e;
  let s = !0, l = Fe;
  if (o.shapeFlag & 32) {
    const a = t._;
    a ? E.NODE_ENV !== "production" && Qt ? (ea(i, t, n), dn(e, "set", "$slots")) : n && a === 1 ? s = !1 : ea(i, t, n) : (s = !t.$stable, Md(t, i)), l = t;
  } else t && (Fd(e, t), l = { default: 1 });
  if (s)
    for (const a in i)
      !$d(a) && l[a] == null && delete i[a];
};
let li, Zn;
function On(e, t) {
  e.appContext.config.performance && Ns() && Zn.mark(`vue-${t}-${e.uid}`), E.NODE_ENV !== "production" && Ch(e, t, Ns() ? Zn.now() : Date.now());
}
function An(e, t) {
  if (e.appContext.config.performance && Ns()) {
    const n = `vue-${t}-${e.uid}`, o = n + ":end";
    Zn.mark(o), Zn.measure(
      `<${ol(e, e.type)}> ${t}`,
      n,
      o
    ), Zn.clearMarks(n), Zn.clearMarks(o);
  }
  E.NODE_ENV !== "production" && Eh(e, t, Ns() ? Zn.now() : Date.now());
}
function Ns() {
  return li !== void 0 || (typeof window < "u" && window.performance ? (li = !0, Zn = window.performance) : li = !1), li;
}
function vg() {
  const e = [];
  if (E.NODE_ENV !== "production" && e.length) {
    const t = e.length > 1;
    console.warn(
      `Feature flag${t ? "s" : ""} ${e.join(", ")} ${t ? "are" : "is"} not explicitly defined. You are running the esm-bundler build of Vue, which expects these compile-time feature flags to be globally injected via the bundler config in order to get better tree-shaking in the production bundle.

For more details, see https://link.vuejs.org/feature-flags.`
    );
  }
}
const Ot = Ng;
function hg(e) {
  return gg(e);
}
function gg(e, t) {
  vg();
  const n = Fi();
  n.__VUE__ = !0, E.NODE_ENV !== "production" && ad(n.__VUE_DEVTOOLS_GLOBAL_HOOK__, n);
  const {
    insert: o,
    remove: i,
    patchProp: s,
    createElement: l,
    createText: a,
    createComment: r,
    setText: f,
    setElementText: u,
    parentNode: d,
    nextSibling: v,
    setScopeId: h = ct,
    insertStaticContent: m
  } = e, g = (y, w, F, z = null, L = null, R = null, ee = void 0, Z = null, Y = E.NODE_ENV !== "production" && Qt ? !1 : !!w.dynamicChildren) => {
    if (y === w)
      return;
    y && !_o(y, w) && (z = Le(y), Oe(y, L, R, !0), y = null), w.patchFlag === -2 && (Y = !1, w.dynamicChildren = null);
    const { type: U, ref: pe, shapeFlag: ie } = w;
    switch (U) {
      case $o:
        _(y, w, F, z);
        break;
      case lt:
        S(y, w, F, z);
        break;
      case ds:
        y == null ? N(w, F, z, ee) : E.NODE_ENV !== "production" && I(y, w, F, ee);
        break;
      case Ve:
        A(
          y,
          w,
          F,
          z,
          L,
          R,
          ee,
          Z,
          Y
        );
        break;
      default:
        ie & 1 ? C(
          y,
          w,
          F,
          z,
          L,
          R,
          ee,
          Z,
          Y
        ) : ie & 6 ? B(
          y,
          w,
          F,
          z,
          L,
          R,
          ee,
          Z,
          Y
        ) : ie & 64 || ie & 128 ? U.process(
          y,
          w,
          F,
          z,
          L,
          R,
          ee,
          Z,
          Y,
          Rt
        ) : E.NODE_ENV !== "production" && q("Invalid VNode type:", U, `(${typeof U})`);
    }
    pe != null && L && Kl(pe, y && y.ref, R, w || y, !w);
  }, _ = (y, w, F, z) => {
    if (y == null)
      o(
        w.el = a(w.children),
        F,
        z
      );
    else {
      const L = w.el = y.el;
      w.children !== y.children && f(L, w.children);
    }
  }, S = (y, w, F, z) => {
    y == null ? o(
      w.el = r(w.children || ""),
      F,
      z
    ) : w.el = y.el;
  }, N = (y, w, F, z) => {
    [y.el, y.anchor] = m(
      y.children,
      w,
      F,
      z,
      y.el,
      y.anchor
    );
  }, I = (y, w, F, z) => {
    if (w.children !== y.children) {
      const L = v(y.anchor);
      x(y), [w.el, w.anchor] = m(
        w.children,
        F,
        L,
        z
      );
    } else
      w.el = y.el, w.anchor = y.anchor;
  }, P = ({ el: y, anchor: w }, F, z) => {
    let L;
    for (; y && y !== w; )
      L = v(y), o(y, F, z), y = L;
    o(w, F, z);
  }, x = ({ el: y, anchor: w }) => {
    let F;
    for (; y && y !== w; )
      F = v(y), i(y), y = F;
    i(w);
  }, C = (y, w, F, z, L, R, ee, Z, Y) => {
    w.type === "svg" ? ee = "svg" : w.type === "math" && (ee = "mathml"), y == null ? $(
      w,
      F,
      z,
      L,
      R,
      ee,
      Z,
      Y
    ) : D(
      y,
      w,
      L,
      R,
      ee,
      Z,
      Y
    );
  }, $ = (y, w, F, z, L, R, ee, Z) => {
    let Y, U;
    const { props: pe, shapeFlag: ie, transition: ve, dirs: M } = y;
    if (Y = y.el = l(
      y.type,
      R,
      pe && pe.is,
      pe
    ), ie & 8 ? u(Y, y.children) : ie & 16 && T(
      y.children,
      Y,
      null,
      z,
      L,
      El(y, R),
      ee,
      Z
    ), M && mo(y, null, z, "created"), V(Y, y, y.scopeId, ee, z), pe) {
      for (const ye in pe)
        ye !== "value" && !mi(ye) && s(Y, ye, null, pe[ye], R, z);
      "value" in pe && s(Y, "value", null, pe.value, R), (U = pe.onVnodeBeforeMount) && rn(U, z, y);
    }
    E.NODE_ENV !== "production" && (_s(Y, "__vnode", y, !0), _s(Y, "__vueParentComponent", z, !0)), M && mo(y, null, z, "beforeMount");
    const H = yg(L, ve);
    H && ve.beforeEnter(Y), o(Y, w, F), ((U = pe && pe.onVnodeMounted) || H || M) && Ot(() => {
      U && rn(U, z, y), H && ve.enter(Y), M && mo(y, null, z, "mounted");
    }, L);
  }, V = (y, w, F, z, L) => {
    if (F && h(y, F), z)
      for (let R = 0; R < z.length; R++)
        h(y, z[R]);
    if (L) {
      let R = L.subTree;
      if (E.NODE_ENV !== "production" && R.patchFlag > 0 && R.patchFlag & 2048 && (R = za(R.children) || R), w === R || jd(R.type) && (R.ssContent === w || R.ssFallback === w)) {
        const ee = L.vnode;
        V(
          y,
          ee,
          ee.scopeId,
          ee.slotScopeIds,
          L.parent
        );
      }
    }
  }, T = (y, w, F, z, L, R, ee, Z, Y = 0) => {
    for (let U = Y; U < y.length; U++) {
      const pe = y[U] = Z ? Jn(y[U]) : Jt(y[U]);
      g(
        null,
        pe,
        w,
        F,
        z,
        L,
        R,
        ee,
        Z
      );
    }
  }, D = (y, w, F, z, L, R, ee) => {
    const Z = w.el = y.el;
    E.NODE_ENV !== "production" && (Z.__vnode = w);
    let { patchFlag: Y, dynamicChildren: U, dirs: pe } = w;
    Y |= y.patchFlag & 16;
    const ie = y.props || Fe, ve = w.props || Fe;
    let M;
    if (F && vo(F, !1), (M = ve.onVnodeBeforeUpdate) && rn(M, F, w, y), pe && mo(w, y, F, "beforeUpdate"), F && vo(F, !0), E.NODE_ENV !== "production" && Qt && (Y = 0, ee = !1, U = null), (ie.innerHTML && ve.innerHTML == null || ie.textContent && ve.textContent == null) && u(Z, ""), U ? (O(
      y.dynamicChildren,
      U,
      Z,
      F,
      z,
      El(w, L),
      R
    ), E.NODE_ENV !== "production" && yi(y, w)) : ee || Ce(
      y,
      w,
      Z,
      null,
      F,
      z,
      El(w, L),
      R,
      !1
    ), Y > 0) {
      if (Y & 16)
        k(Z, ie, ve, F, L);
      else if (Y & 2 && ie.class !== ve.class && s(Z, "class", null, ve.class, L), Y & 4 && s(Z, "style", ie.style, ve.style, L), Y & 8) {
        const H = w.dynamicProps;
        for (let ye = 0; ye < H.length; ye++) {
          const ge = H[ye], ce = ie[ge], Ae = ve[ge];
          (Ae !== ce || ge === "value") && s(Z, ge, ce, Ae, L, F);
        }
      }
      Y & 1 && y.children !== w.children && u(Z, w.children);
    } else !ee && U == null && k(Z, ie, ve, F, L);
    ((M = ve.onVnodeUpdated) || pe) && Ot(() => {
      M && rn(M, F, w, y), pe && mo(w, y, F, "updated");
    }, z);
  }, O = (y, w, F, z, L, R, ee) => {
    for (let Z = 0; Z < w.length; Z++) {
      const Y = y[Z], U = w[Z], pe = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        Y.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (Y.type === Ve || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !_o(Y, U) || // - In the case of a component, it could contain anything.
        Y.shapeFlag & 70) ? d(Y.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          F
        )
      );
      g(
        Y,
        U,
        pe,
        null,
        z,
        L,
        R,
        ee,
        !0
      );
    }
  }, k = (y, w, F, z, L) => {
    if (w !== F) {
      if (w !== Fe)
        for (const R in w)
          !mi(R) && !(R in F) && s(
            y,
            R,
            w[R],
            null,
            L,
            z
          );
      for (const R in F) {
        if (mi(R)) continue;
        const ee = F[R], Z = w[R];
        ee !== Z && R !== "value" && s(y, R, Z, ee, L, z);
      }
      "value" in F && s(y, "value", w.value, F.value, L);
    }
  }, A = (y, w, F, z, L, R, ee, Z, Y) => {
    const U = w.el = y ? y.el : a(""), pe = w.anchor = y ? y.anchor : a("");
    let { patchFlag: ie, dynamicChildren: ve, slotScopeIds: M } = w;
    E.NODE_ENV !== "production" && // #5523 dev root fragment may inherit directives
    (Qt || ie & 2048) && (ie = 0, Y = !1, ve = null), M && (Z = Z ? Z.concat(M) : M), y == null ? (o(U, F, z), o(pe, F, z), T(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      w.children || [],
      F,
      pe,
      L,
      R,
      ee,
      Z,
      Y
    )) : ie > 0 && ie & 64 && ve && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    y.dynamicChildren ? (O(
      y.dynamicChildren,
      ve,
      F,
      L,
      R,
      ee,
      Z
    ), E.NODE_ENV !== "production" ? yi(y, w) : (
      // #2080 if the stable fragment has a key, it's a <template v-for> that may
      //  get moved around. Make sure all root level vnodes inherit el.
      // #2134 or if it's a component root, it may also get moved around
      // as the component is being moved.
      (w.key != null || L && w === L.subTree) && yi(
        y,
        w,
        !0
        /* shallow */
      )
    )) : Ce(
      y,
      w,
      F,
      pe,
      L,
      R,
      ee,
      Z,
      Y
    );
  }, B = (y, w, F, z, L, R, ee, Z, Y) => {
    w.slotScopeIds = Z, y == null ? w.shapeFlag & 512 ? L.ctx.activate(
      w,
      F,
      z,
      ee,
      Y
    ) : Q(
      w,
      F,
      z,
      L,
      R,
      ee,
      Y
    ) : re(y, w, Y);
  }, Q = (y, w, F, z, L, R, ee) => {
    const Z = y.component = Dg(
      y,
      z,
      L
    );
    if (E.NODE_ENV !== "production" && Z.type.__hmrId && hh(Z), E.NODE_ENV !== "production" && (as(y), On(Z, "mount")), Hi(y) && (Z.ctx.renderer = Rt), E.NODE_ENV !== "production" && On(Z, "init"), Mg(Z, !1, ee), E.NODE_ENV !== "production" && An(Z, "init"), Z.asyncDep) {
      if (E.NODE_ENV !== "production" && Qt && (y.el = null), L && L.registerDep(Z, ne, ee), !y.el) {
        const Y = Z.subTree = c(lt);
        S(null, Y, w, F);
      }
    } else
      ne(
        Z,
        y,
        w,
        F,
        L,
        R,
        ee
      );
    E.NODE_ENV !== "production" && (rs(), An(Z, "mount"));
  }, re = (y, w, F) => {
    const z = w.component = y.component;
    if (xg(y, w, F))
      if (z.asyncDep && !z.asyncResolved) {
        E.NODE_ENV !== "production" && as(w), J(z, w, F), E.NODE_ENV !== "production" && rs();
        return;
      } else
        z.next = w, z.update();
    else
      w.el = y.el, z.vnode = w;
  }, ne = (y, w, F, z, L, R, ee) => {
    const Z = () => {
      if (y.isMounted) {
        let { next: ie, bu: ve, u: M, parent: H, vnode: ye } = y;
        {
          const ot = Bd(y);
          if (ot) {
            ie && (ie.el = ye.el, J(y, ie, ee)), ot.asyncDep.then(() => {
              y.isUnmounted || Z();
            });
            return;
          }
        }
        let ge = ie, ce;
        E.NODE_ENV !== "production" && as(ie || y.vnode), vo(y, !1), ie ? (ie.el = ye.el, J(y, ie, ee)) : ie = ye, ve && Ro(ve), (ce = ie.props && ie.props.onVnodeBeforeUpdate) && rn(ce, H, ie, ye), vo(y, !0), E.NODE_ENV !== "production" && On(y, "render");
        const Ae = xl(y);
        E.NODE_ENV !== "production" && An(y, "render");
        const et = y.subTree;
        y.subTree = Ae, E.NODE_ENV !== "production" && On(y, "patch"), g(
          et,
          Ae,
          // parent may have changed if it's in a teleport
          d(et.el),
          // anchor may have changed if it's in a fragment
          Le(et),
          y,
          L,
          R
        ), E.NODE_ENV !== "production" && An(y, "patch"), ie.el = Ae.el, ge === null && Vg(y, Ae.el), M && Ot(M, L), (ce = ie.props && ie.props.onVnodeUpdated) && Ot(
          () => rn(ce, H, ie, ye),
          L
        ), E.NODE_ENV !== "production" && rd(y), E.NODE_ENV !== "production" && rs();
      } else {
        let ie;
        const { el: ve, props: M } = w, { bm: H, m: ye, parent: ge, root: ce, type: Ae } = y, et = gi(w);
        if (vo(y, !1), H && Ro(H), !et && (ie = M && M.onVnodeBeforeMount) && rn(ie, ge, w), vo(y, !0), ve && qn) {
          const ot = () => {
            E.NODE_ENV !== "production" && On(y, "render"), y.subTree = xl(y), E.NODE_ENV !== "production" && An(y, "render"), E.NODE_ENV !== "production" && On(y, "hydrate"), qn(
              ve,
              y.subTree,
              y,
              L,
              null
            ), E.NODE_ENV !== "production" && An(y, "hydrate");
          };
          et && Ae.__asyncHydrate ? Ae.__asyncHydrate(
            ve,
            y,
            ot
          ) : ot();
        } else {
          ce.ce && ce.ce._injectChildStyle(Ae), E.NODE_ENV !== "production" && On(y, "render");
          const ot = y.subTree = xl(y);
          E.NODE_ENV !== "production" && An(y, "render"), E.NODE_ENV !== "production" && On(y, "patch"), g(
            null,
            ot,
            F,
            z,
            y,
            L,
            R
          ), E.NODE_ENV !== "production" && An(y, "patch"), w.el = ot.el;
        }
        if (ye && Ot(ye, L), !et && (ie = M && M.onVnodeMounted)) {
          const ot = w;
          Ot(
            () => rn(ie, ge, ot),
            L
          );
        }
        (w.shapeFlag & 256 || ge && gi(ge.vnode) && ge.vnode.shapeFlag & 256) && y.a && Ot(y.a, L), y.isMounted = !0, E.NODE_ENV !== "production" && wh(y), w = F = z = null;
      }
    };
    y.scope.on();
    const Y = y.effect = new Dc(Z);
    y.scope.off();
    const U = y.update = Y.run.bind(Y), pe = y.job = Y.runIfDirty.bind(Y);
    pe.i = y, pe.id = y.uid, Y.scheduler = () => Zs(pe), vo(y, !0), E.NODE_ENV !== "production" && (Y.onTrack = y.rtc ? (ie) => Ro(y.rtc, ie) : void 0, Y.onTrigger = y.rtg ? (ie) => Ro(y.rtg, ie) : void 0), U();
  }, J = (y, w, F) => {
    w.component = y;
    const z = y.vnode.props;
    y.vnode = w, y.next = null, og(y, w.props, z, F), mg(y, w.children, F), Fn(), Mr(y), Bn();
  }, Ce = (y, w, F, z, L, R, ee, Z, Y = !1) => {
    const U = y && y.children, pe = y ? y.shapeFlag : 0, ie = w.children, { patchFlag: ve, shapeFlag: M } = w;
    if (ve > 0) {
      if (ve & 128) {
        X(
          U,
          ie,
          F,
          z,
          L,
          R,
          ee,
          Z,
          Y
        );
        return;
      } else if (ve & 256) {
        K(
          U,
          ie,
          F,
          z,
          L,
          R,
          ee,
          Z,
          Y
        );
        return;
      }
    }
    M & 8 ? (pe & 16 && Ee(U, L, R), ie !== U && u(F, ie)) : pe & 16 ? M & 16 ? X(
      U,
      ie,
      F,
      z,
      L,
      R,
      ee,
      Z,
      Y
    ) : Ee(U, L, R, !0) : (pe & 8 && u(F, ""), M & 16 && T(
      ie,
      F,
      z,
      L,
      R,
      ee,
      Z,
      Y
    ));
  }, K = (y, w, F, z, L, R, ee, Z, Y) => {
    y = y || Wo, w = w || Wo;
    const U = y.length, pe = w.length, ie = Math.min(U, pe);
    let ve;
    for (ve = 0; ve < ie; ve++) {
      const M = w[ve] = Y ? Jn(w[ve]) : Jt(w[ve]);
      g(
        y[ve],
        M,
        F,
        null,
        L,
        R,
        ee,
        Z,
        Y
      );
    }
    U > pe ? Ee(
      y,
      L,
      R,
      !0,
      !1,
      ie
    ) : T(
      w,
      F,
      z,
      L,
      R,
      ee,
      Z,
      Y,
      ie
    );
  }, X = (y, w, F, z, L, R, ee, Z, Y) => {
    let U = 0;
    const pe = w.length;
    let ie = y.length - 1, ve = pe - 1;
    for (; U <= ie && U <= ve; ) {
      const M = y[U], H = w[U] = Y ? Jn(w[U]) : Jt(w[U]);
      if (_o(M, H))
        g(
          M,
          H,
          F,
          null,
          L,
          R,
          ee,
          Z,
          Y
        );
      else
        break;
      U++;
    }
    for (; U <= ie && U <= ve; ) {
      const M = y[ie], H = w[ve] = Y ? Jn(w[ve]) : Jt(w[ve]);
      if (_o(M, H))
        g(
          M,
          H,
          F,
          null,
          L,
          R,
          ee,
          Z,
          Y
        );
      else
        break;
      ie--, ve--;
    }
    if (U > ie) {
      if (U <= ve) {
        const M = ve + 1, H = M < pe ? w[M].el : z;
        for (; U <= ve; )
          g(
            null,
            w[U] = Y ? Jn(w[U]) : Jt(w[U]),
            F,
            H,
            L,
            R,
            ee,
            Z,
            Y
          ), U++;
      }
    } else if (U > ve)
      for (; U <= ie; )
        Oe(y[U], L, R, !0), U++;
    else {
      const M = U, H = U, ye = /* @__PURE__ */ new Map();
      for (U = H; U <= ve; U++) {
        const st = w[U] = Y ? Jn(w[U]) : Jt(w[U]);
        st.key != null && (E.NODE_ENV !== "production" && ye.has(st.key) && q(
          "Duplicate keys found during update:",
          JSON.stringify(st.key),
          "Make sure keys are unique."
        ), ye.set(st.key, U));
      }
      let ge, ce = 0;
      const Ae = ve - H + 1;
      let et = !1, ot = 0;
      const ft = new Array(Ae);
      for (U = 0; U < Ae; U++) ft[U] = 0;
      for (U = M; U <= ie; U++) {
        const st = y[U];
        if (ce >= Ae) {
          Oe(st, L, R, !0);
          continue;
        }
        let It;
        if (st.key != null)
          It = ye.get(st.key);
        else
          for (ge = H; ge <= ve; ge++)
            if (ft[ge - H] === 0 && _o(st, w[ge])) {
              It = ge;
              break;
            }
        It === void 0 ? Oe(st, L, R, !0) : (ft[It - H] = U + 1, It >= ot ? ot = It : et = !0, g(
          st,
          w[It],
          F,
          null,
          L,
          R,
          ee,
          Z,
          Y
        ), ce++);
      }
      const Ht = et ? pg(ft) : Wo;
      for (ge = Ht.length - 1, U = Ae - 1; U >= 0; U--) {
        const st = H + U, It = w[st], co = st + 1 < pe ? w[st + 1].el : z;
        ft[U] === 0 ? g(
          null,
          It,
          F,
          co,
          L,
          R,
          ee,
          Z,
          Y
        ) : et && (ge < 0 || U !== Ht[ge] ? te(It, F, co, 2) : ge--);
      }
    }
  }, te = (y, w, F, z, L = null) => {
    const { el: R, type: ee, transition: Z, children: Y, shapeFlag: U } = y;
    if (U & 6) {
      te(y.component.subTree, w, F, z);
      return;
    }
    if (U & 128) {
      y.suspense.move(w, F, z);
      return;
    }
    if (U & 64) {
      ee.move(y, w, F, Rt);
      return;
    }
    if (ee === Ve) {
      o(R, w, F);
      for (let ie = 0; ie < Y.length; ie++)
        te(Y[ie], w, F, z);
      o(y.anchor, w, F);
      return;
    }
    if (ee === ds) {
      P(y, w, F);
      return;
    }
    if (z !== 2 && U & 1 && Z)
      if (z === 0)
        Z.beforeEnter(R), o(R, w, F), Ot(() => Z.enter(R), L);
      else {
        const { leave: ie, delayLeave: ve, afterLeave: M } = Z, H = () => o(R, w, F), ye = () => {
          ie(R, () => {
            H(), M && M();
          });
        };
        ve ? ve(R, H, ye) : ye();
      }
    else
      o(R, w, F);
  }, Oe = (y, w, F, z = !1, L = !1) => {
    const {
      type: R,
      props: ee,
      ref: Z,
      children: Y,
      dynamicChildren: U,
      shapeFlag: pe,
      patchFlag: ie,
      dirs: ve,
      cacheIndex: M
    } = y;
    if (ie === -2 && (L = !1), Z != null && Kl(Z, null, F, y, !0), M != null && (w.renderCache[M] = void 0), pe & 256) {
      w.ctx.deactivate(y);
      return;
    }
    const H = pe & 1 && ve, ye = !gi(y);
    let ge;
    if (ye && (ge = ee && ee.onVnodeBeforeUnmount) && rn(ge, w, y), pe & 6)
      oe(y.component, F, z);
    else {
      if (pe & 128) {
        y.suspense.unmount(F, z);
        return;
      }
      H && mo(y, null, w, "beforeUnmount"), pe & 64 ? y.type.remove(
        y,
        w,
        F,
        Rt,
        z
      ) : U && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !U.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (R !== Ve || ie > 0 && ie & 64) ? Ee(
        U,
        w,
        F,
        !1,
        !0
      ) : (R === Ve && ie & 384 || !L && pe & 16) && Ee(Y, w, F), z && qe(y);
    }
    (ye && (ge = ee && ee.onVnodeUnmounted) || H) && Ot(() => {
      ge && rn(ge, w, y), H && mo(y, null, w, "unmounted");
    }, F);
  }, qe = (y) => {
    const { type: w, el: F, anchor: z, transition: L } = y;
    if (w === Ve) {
      E.NODE_ENV !== "production" && y.patchFlag > 0 && y.patchFlag & 2048 && L && !L.persisted ? y.children.forEach((ee) => {
        ee.type === lt ? i(ee.el) : qe(ee);
      }) : Ge(F, z);
      return;
    }
    if (w === ds) {
      x(y);
      return;
    }
    const R = () => {
      i(F), L && !L.persisted && L.afterLeave && L.afterLeave();
    };
    if (y.shapeFlag & 1 && L && !L.persisted) {
      const { leave: ee, delayLeave: Z } = L, Y = () => ee(F, R);
      Z ? Z(y.el, R, Y) : Y();
    } else
      R();
  }, Ge = (y, w) => {
    let F;
    for (; y !== w; )
      F = v(y), i(y), y = F;
    i(w);
  }, oe = (y, w, F) => {
    E.NODE_ENV !== "production" && y.type.__hmrId && gh(y);
    const { bum: z, scope: L, job: R, subTree: ee, um: Z, m: Y, a: U } = y;
    Yr(Y), Yr(U), z && Ro(z), L.stop(), R && (R.flags |= 8, Oe(ee, y, w, F)), Z && Ot(Z, w), Ot(() => {
      y.isUnmounted = !0;
    }, w), w && w.pendingBranch && !w.isUnmounted && y.asyncDep && !y.asyncResolved && y.suspenseId === w.pendingId && (w.deps--, w.deps === 0 && w.resolve()), E.NODE_ENV !== "production" && Sh(y);
  }, Ee = (y, w, F, z = !1, L = !1, R = 0) => {
    for (let ee = R; ee < y.length; ee++)
      Oe(y[ee], w, F, z, L);
  }, Le = (y) => {
    if (y.shapeFlag & 6)
      return Le(y.component.subTree);
    if (y.shapeFlag & 128)
      return y.suspense.next();
    const w = v(y.anchor || y.el), F = w && w[fd];
    return F ? v(F) : w;
  };
  let nt = !1;
  const Qe = (y, w, F) => {
    y == null ? w._vnode && Oe(w._vnode, null, null, !0) : g(
      w._vnode || null,
      y,
      w,
      null,
      null,
      null,
      F
    ), w._vnode = y, nt || (nt = !0, Mr(), id(), nt = !1);
  }, Rt = {
    p: g,
    um: Oe,
    m: te,
    r: qe,
    mt: Q,
    mc: T,
    pc: Ce,
    pbc: O,
    n: Le,
    o: e
  };
  let Wn, qn;
  return {
    render: Qe,
    hydrate: Wn,
    createApp: eg(Qe, Wn)
  };
}
function El({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function vo({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function yg(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function yi(e, t, n = !1) {
  const o = e.children, i = t.children;
  if (he(o) && he(i))
    for (let s = 0; s < o.length; s++) {
      const l = o[s];
      let a = i[s];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[s] = Jn(i[s]), a.el = l.el), !n && a.patchFlag !== -2 && yi(l, a)), a.type === $o && (a.el = l.el), E.NODE_ENV !== "production" && a.type === lt && !a.el && (a.el = l.el);
    }
}
function pg(e) {
  const t = e.slice(), n = [0];
  let o, i, s, l, a;
  const r = e.length;
  for (o = 0; o < r; o++) {
    const f = e[o];
    if (f !== 0) {
      if (i = n[n.length - 1], e[i] < f) {
        t[o] = i, n.push(o);
        continue;
      }
      for (s = 0, l = n.length - 1; s < l; )
        a = s + l >> 1, e[n[a]] < f ? s = a + 1 : l = a;
      f < e[n[s]] && (s > 0 && (t[o] = n[s - 1]), n[s] = o);
    }
  }
  for (s = n.length, l = n[s - 1]; s-- > 0; )
    n[s] = l, l = t[l];
  return n;
}
function Bd(e) {
  const t = e.subTree.component;
  if (t)
    return t.asyncDep && !t.asyncResolved ? t : Bd(t);
}
function Yr(e) {
  if (e)
    for (let t = 0; t < e.length; t++)
      e[t].flags |= 8;
}
const bg = Symbol.for("v-scx"), _g = () => {
  {
    const e = je(bg);
    return e || E.NODE_ENV !== "production" && q(
      "Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build."
    ), e;
  }
};
function sn(e, t) {
  return ja(e, null, t);
}
function ke(e, t, n) {
  return E.NODE_ENV !== "production" && !Se(t) && q(
    "`watch(fn, options?)` signature has been moved to a separate API. Use `watchEffect(fn, options?)` instead. `watch` now only supports `watch(source, cb, options?) signature."
  ), ja(e, t, n);
}
function ja(e, t, n = Fe) {
  const { immediate: o, deep: i, flush: s, once: l } = n;
  E.NODE_ENV !== "production" && !t && (o !== void 0 && q(
    'watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.'
  ), i !== void 0 && q(
    'watch() "deep" option is only respected when using the watch(source, callback, options?) signature.'
  ), l !== void 0 && q(
    'watch() "once" option is only respected when using the watch(source, callback, options?) signature.'
  ));
  const a = Je({}, n);
  E.NODE_ENV !== "production" && (a.onWarn = q);
  const r = t && o || !t && s !== "post";
  let f;
  if (Ei) {
    if (s === "sync") {
      const h = _g();
      f = h.__watcherHandles || (h.__watcherHandles = []);
    } else if (!r) {
      const h = () => {
      };
      return h.stop = ct, h.resume = ct, h.pause = ct, h;
    }
  }
  const u = dt;
  a.call = (h, m, g) => nn(h, u, m, g);
  let d = !1;
  s === "post" ? a.scheduler = (h) => {
    Ot(h, u && u.suspense);
  } : s !== "sync" && (d = !0, a.scheduler = (h, m) => {
    m ? h() : Zs(h);
  }), a.augmentJob = (h) => {
    t && (h.flags |= 4), d && (h.flags |= 2, u && (h.id = u.uid, h.i = u));
  };
  const v = lh(e, t, a);
  return Ei && (f ? f.push(v) : r && v()), v;
}
function wg(e, t, n) {
  const o = this.proxy, i = Xe(e) ? e.includes(".") ? Ld(o, e) : () => o[e] : e.bind(o, o);
  let s;
  Se(t) ? s = t : (s = t.handler, n = t);
  const l = ji(this), a = ja(i, s.bind(o), n);
  return l(), a;
}
function Ld(e, t) {
  const n = t.split(".");
  return () => {
    let o = e;
    for (let i = 0; i < n.length && o; i++)
      o = o[n[i]];
    return o;
  };
}
const kg = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${gt(t)}Modifiers`] || e[`${no(t)}Modifiers`];
function Sg(e, t, ...n) {
  if (e.isUnmounted) return;
  const o = e.vnode.props || Fe;
  if (E.NODE_ENV !== "production") {
    const {
      emitsOptions: u,
      propsOptions: [d]
    } = e;
    if (u)
      if (!(t in u))
        (!d || !(po(gt(t)) in d)) && q(
          `Component emitted event "${t}" but it is neither declared in the emits option nor as an "${po(gt(t))}" prop.`
        );
      else {
        const v = u[t];
        Se(v) && (v(...n) || q(
          `Invalid event arguments: event validation failed for event "${t}".`
        ));
      }
  }
  let i = n;
  const s = t.startsWith("update:"), l = s && kg(o, t.slice(7));
  if (l && (l.trim && (i = n.map((u) => Xe(u) ? u.trim() : u)), l.number && (i = n.map(ws))), E.NODE_ENV !== "production" && xh(e, t, i), E.NODE_ENV !== "production") {
    const u = t.toLowerCase();
    u !== t && o[po(u)] && q(
      `Event "${u}" is emitted in component ${ol(
        e,
        e.type
      )} but the handler is registered for "${t}". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "${no(
        t
      )}" instead of "${t}".`
    );
  }
  let a, r = o[a = po(t)] || // also try camelCase event handler (#2249)
  o[a = po(gt(t))];
  !r && s && (r = o[a = po(no(t))]), r && nn(
    r,
    e,
    6,
    i
  );
  const f = o[a + "Once"];
  if (f) {
    if (!e.emitted)
      e.emitted = {};
    else if (e.emitted[a])
      return;
    e.emitted[a] = !0, nn(
      f,
      e,
      6,
      i
    );
  }
}
function Rd(e, t, n = !1) {
  const o = t.emitsCache, i = o.get(e);
  if (i !== void 0)
    return i;
  const s = e.emits;
  let l = {}, a = !1;
  if (!Se(e)) {
    const r = (f) => {
      const u = Rd(f, t, !0);
      u && (a = !0, Je(l, u));
    };
    !n && t.mixins.length && t.mixins.forEach(r), e.extends && r(e.extends), e.mixins && e.mixins.forEach(r);
  }
  return !s && !a ? ($e(e) && o.set(e, null), null) : (he(s) ? s.forEach((r) => l[r] = null) : Je(l, s), $e(e) && o.set(e, l), l);
}
function el(e, t) {
  return !e || !$i(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), Pe(e, t[0].toLowerCase() + t.slice(1)) || Pe(e, no(t)) || Pe(e, t));
}
let ta = !1;
function Ts() {
  ta = !0;
}
function xl(e) {
  const {
    type: t,
    vnode: n,
    proxy: o,
    withProxy: i,
    propsOptions: [s],
    slots: l,
    attrs: a,
    emit: r,
    render: f,
    renderCache: u,
    props: d,
    data: v,
    setupState: h,
    ctx: m,
    inheritAttrs: g
  } = e, _ = xs(e);
  let S, N;
  E.NODE_ENV !== "production" && (ta = !1);
  try {
    if (n.shapeFlag & 4) {
      const x = i || o, C = E.NODE_ENV !== "production" && h.__isScriptSetup ? new Proxy(x, {
        get($, V, T) {
          return q(
            `Property '${String(
              V
            )}' was accessed via 'this'. Avoid using 'this' in templates.`
          ), Reflect.get($, V, T);
        }
      }) : x;
      S = Jt(
        f.call(
          C,
          x,
          u,
          E.NODE_ENV !== "production" ? mn(d) : d,
          h,
          v,
          m
        )
      ), N = a;
    } else {
      const x = t;
      E.NODE_ENV !== "production" && a === d && Ts(), S = Jt(
        x.length > 1 ? x(
          E.NODE_ENV !== "production" ? mn(d) : d,
          E.NODE_ENV !== "production" ? {
            get attrs() {
              return Ts(), mn(a);
            },
            slots: l,
            emit: r
          } : { attrs: a, slots: l, emit: r }
        ) : x(
          E.NODE_ENV !== "production" ? mn(d) : d,
          null
        )
      ), N = t.props ? a : Cg(a);
    }
  } catch (x) {
    pi.length = 0, Li(x, e, 1), S = c(lt);
  }
  let I = S, P;
  if (E.NODE_ENV !== "production" && S.patchFlag > 0 && S.patchFlag & 2048 && ([I, P] = Hd(S)), N && g !== !1) {
    const x = Object.keys(N), { shapeFlag: C } = I;
    if (x.length) {
      if (C & 7)
        s && x.some(bs) && (N = Eg(
          N,
          s
        )), I = on(I, N, !1, !0);
      else if (E.NODE_ENV !== "production" && !ta && I.type !== lt) {
        const $ = Object.keys(a), V = [], T = [];
        for (let D = 0, O = $.length; D < O; D++) {
          const k = $[D];
          $i(k) ? bs(k) || V.push(k[2].toLowerCase() + k.slice(3)) : T.push(k);
        }
        T.length && q(
          `Extraneous non-props attributes (${T.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes.`
        ), V.length && q(
          `Extraneous non-emits event listeners (${V.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.`
        );
      }
    }
  }
  return n.dirs && (E.NODE_ENV !== "production" && !Xr(I) && q(
    "Runtime directive used on component with non-element root node. The directives will not function as intended."
  ), I = on(I, null, !1, !0), I.dirs = I.dirs ? I.dirs.concat(n.dirs) : n.dirs), n.transition && (E.NODE_ENV !== "production" && !Xr(I) && q(
    "Component inside <Transition> renders non-element root node that cannot be animated."
  ), Po(I, n.transition)), E.NODE_ENV !== "production" && P ? P(I) : S = I, xs(_), S;
}
const Hd = (e) => {
  const t = e.children, n = e.dynamicChildren, o = za(t, !1);
  if (o) {
    if (E.NODE_ENV !== "production" && o.patchFlag > 0 && o.patchFlag & 2048)
      return Hd(o);
  } else return [e, void 0];
  const i = t.indexOf(o), s = n ? n.indexOf(o) : -1, l = (a) => {
    t[i] = a, n && (s > -1 ? n[s] = a : a.patchFlag > 0 && (e.dynamicChildren = [...n, a]));
  };
  return [Jt(o), l];
};
function za(e, t = !0) {
  let n;
  for (let o = 0; o < e.length; o++) {
    const i = e[o];
    if (Yo(i)) {
      if (i.type !== lt || i.children === "v-if") {
        if (n)
          return;
        if (n = i, E.NODE_ENV !== "production" && t && n.patchFlag > 0 && n.patchFlag & 2048)
          return za(n.children);
      }
    } else
      return;
  }
  return n;
}
const Cg = (e) => {
  let t;
  for (const n in e)
    (n === "class" || n === "style" || $i(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, Eg = (e, t) => {
  const n = {};
  for (const o in e)
    (!bs(o) || !(o.slice(9) in t)) && (n[o] = e[o]);
  return n;
}, Xr = (e) => e.shapeFlag & 7 || e.type === lt;
function xg(e, t, n) {
  const { props: o, children: i, component: s } = e, { props: l, children: a, patchFlag: r } = t, f = s.emitsOptions;
  if (E.NODE_ENV !== "production" && (i || a) && Qt || t.dirs || t.transition)
    return !0;
  if (n && r >= 0) {
    if (r & 1024)
      return !0;
    if (r & 16)
      return o ? Jr(o, l, f) : !!l;
    if (r & 8) {
      const u = t.dynamicProps;
      for (let d = 0; d < u.length; d++) {
        const v = u[d];
        if (l[v] !== o[v] && !el(f, v))
          return !0;
      }
    }
  } else
    return (i || a) && (!a || !a.$stable) ? !0 : o === l ? !1 : o ? l ? Jr(o, l, f) : !0 : !!l;
  return !1;
}
function Jr(e, t, n) {
  const o = Object.keys(t);
  if (o.length !== Object.keys(e).length)
    return !0;
  for (let i = 0; i < o.length; i++) {
    const s = o[i];
    if (t[s] !== e[s] && !el(n, s))
      return !0;
  }
  return !1;
}
function Vg({ vnode: e, parent: t }, n) {
  for (; t; ) {
    const o = t.subTree;
    if (o.suspense && o.suspense.activeBranch === e && (o.el = e.el), o === e)
      (e = t.vnode).el = n, t = t.parent;
    else
      break;
  }
}
const jd = (e) => e.__isSuspense;
function Ng(e, t) {
  t && t.pendingBranch ? he(e) ? t.effects.push(...e) : t.effects.push(e) : od(e);
}
const Ve = Symbol.for("v-fgt"), $o = Symbol.for("v-txt"), lt = Symbol.for("v-cmt"), ds = Symbol.for("v-stc"), pi = [];
let Dt = null;
function G(e = !1) {
  pi.push(Dt = e ? null : []);
}
function Tg() {
  pi.pop(), Dt = pi[pi.length - 1] || null;
}
let Ci = 1;
function Zr(e) {
  Ci += e, e < 0 && Dt && (Dt.hasOnce = !0);
}
function zd(e) {
  return e.dynamicChildren = Ci > 0 ? Dt || Wo : null, Tg(), Ci > 0 && Dt && Dt.push(e), e;
}
function ze(e, t, n, o, i, s) {
  return zd(
    le(
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
function fe(e, t, n, o, i) {
  return zd(
    c(
      e,
      t,
      n,
      o,
      i,
      !0
    )
  );
}
function Yo(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function _o(e, t) {
  if (E.NODE_ENV !== "production" && t.shapeFlag & 6 && e.component) {
    const n = us.get(t.type);
    if (n && n.has(e.component))
      return e.shapeFlag &= -257, t.shapeFlag &= -513, !1;
  }
  return e.type === t.type && e.key === t.key;
}
const Og = (...e) => Wd(
  ...e
), Ud = ({ key: e }) => e ?? null, fs = ({
  ref: e,
  ref_key: t,
  ref_for: n
}) => (typeof e == "number" && (e = "" + e), e != null ? Xe(e) || Ue(e) || Se(e) ? { i: _t, r: e, k: t, f: !!n } : e : null);
function le(e, t = null, n = null, o = 0, i = null, s = e === Ve ? 0 : 1, l = !1, a = !1) {
  const r = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && Ud(t),
    ref: t && fs(t),
    scopeId: cd,
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
    ctx: _t
  };
  return a ? (Ua(r, n), s & 128 && e.normalize(r)) : n && (r.shapeFlag |= Xe(n) ? 8 : 16), E.NODE_ENV !== "production" && r.key !== r.key && q("VNode created with invalid key (NaN). VNode type:", r.type), Ci > 0 && // avoid a block node from tracking itself
  !l && // has current parent block
  Dt && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (r.patchFlag > 0 || s & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  r.patchFlag !== 32 && Dt.push(r), r;
}
const c = E.NODE_ENV !== "production" ? Og : Wd;
function Wd(e, t = null, n = null, o = 0, i = null, s = !1) {
  if ((!e || e === jh) && (E.NODE_ENV !== "production" && !e && q(`Invalid vnode type when creating vnode: ${e}.`), e = lt), Yo(e)) {
    const a = on(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return n && Ua(a, n), Ci > 0 && !s && Dt && (a.shapeFlag & 6 ? Dt[Dt.indexOf(e)] = a : Dt.push(a)), a.patchFlag = -2, a;
  }
  if (Yd(e) && (e = e.__vccOpts), t) {
    t = Ag(t);
    let { class: a, style: r } = t;
    a && !Xe(a) && (t.class = Wt(a)), $e(r) && (wi(r) && !he(r) && (r = Je({}, r)), t.style = cn(r));
  }
  const l = Xe(e) ? 1 : jd(e) ? 128 : md(e) ? 64 : $e(e) ? 4 : Se(e) ? 2 : 0;
  return E.NODE_ENV !== "production" && l & 4 && wi(e) && (e = me(e), q(
    "Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with `markRaw` or using `shallowRef` instead of `ref`.",
    `
Component that was made reactive: `,
    e
  )), le(
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
function Ag(e) {
  return e ? wi(e) || Ad(e) ? Je({}, e) : e : null;
}
function on(e, t, n = !1, o = !1) {
  const { props: i, ref: s, patchFlag: l, children: a, transition: r } = e, f = t ? xe(i || {}, t) : i, u = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: f,
    key: f && Ud(f),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      n && s ? he(s) ? s.concat(fs(t)) : [s, fs(t)] : fs(t)
    ) : s,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: E.NODE_ENV !== "production" && l === -1 && he(a) ? a.map(qd) : a,
    target: e.target,
    targetStart: e.targetStart,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: t && e.type !== Ve ? l === -1 ? 16 : l | 16 : l,
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
    ssContent: e.ssContent && on(e.ssContent),
    ssFallback: e.ssFallback && on(e.ssFallback),
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return r && o && Po(
    u,
    r.clone(u)
  ), u;
}
function qd(e) {
  const t = on(e);
  return he(e.children) && (t.children = e.children.map(qd)), t;
}
function j(e = " ", t = 0) {
  return c($o, null, e, t);
}
function Re(e = "", t = !1) {
  return t ? (G(), fe(lt, null, e)) : c(lt, null, e);
}
function Jt(e) {
  return e == null || typeof e == "boolean" ? c(lt) : he(e) ? c(
    Ve,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : Yo(e) ? Jn(e) : c($o, null, String(e));
}
function Jn(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : on(e);
}
function Ua(e, t) {
  let n = 0;
  const { shapeFlag: o } = e;
  if (t == null)
    t = null;
  else if (he(t))
    n = 16;
  else if (typeof t == "object")
    if (o & 65) {
      const i = t.default;
      i && (i._c && (i._d = !1), Ua(e, i()), i._c && (i._d = !0));
      return;
    } else {
      n = 32;
      const i = t._;
      !i && !Ad(t) ? t._ctx = _t : i === 3 && _t && (_t.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else Se(t) ? (t = { default: t, _ctx: _t }, n = 32) : (t = String(t), o & 64 ? (n = 16, t = [j(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function xe(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    for (const i in o)
      if (i === "class")
        t.class !== o.class && (t.class = Wt([t.class, o.class]));
      else if (i === "style")
        t.style = cn([t.style, o.style]);
      else if ($i(i)) {
        const s = t[i], l = o[i];
        l && s !== l && !(he(s) && s.includes(l)) && (t[i] = s ? [].concat(s, l) : l);
      } else i !== "" && (t[i] = o[i]);
  }
  return t;
}
function rn(e, t, n, o = null) {
  nn(e, t, 7, [
    n,
    o
  ]);
}
const Ig = Nd();
let Pg = 0;
function Dg(e, t, n) {
  const o = e.type, i = (t ? t.appContext : e.appContext) || Ig, s = {
    uid: Pg++,
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
    scope: new Pc(
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
    propsOptions: Pd(o, i),
    emitsOptions: Rd(o, i),
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
  return E.NODE_ENV !== "production" ? s.ctx = Uh(s) : s.ctx = { _: s }, s.root = t ? t.root : s, s.emit = Sg.bind(null, s), e.ce && e.ce(s), s;
}
let dt = null;
const tl = () => dt || _t;
let Os, na;
{
  const e = Fi(), t = (n, o) => {
    let i;
    return (i = e[n]) || (i = e[n] = []), i.push(o), (s) => {
      i.length > 1 ? i.forEach((l) => l(s)) : i[0](s);
    };
  };
  Os = t(
    "__VUE_INSTANCE_SETTERS__",
    (n) => dt = n
  ), na = t(
    "__VUE_SSR_SETTERS__",
    (n) => Ei = n
  );
}
const ji = (e) => {
  const t = dt;
  return Os(e), e.scope.on(), () => {
    e.scope.off(), Os(t);
  };
}, Qr = () => {
  dt && dt.scope.off(), Os(null);
}, $g = /* @__PURE__ */ Mn("slot,component");
function oa(e, { isNativeTag: t }) {
  ($g(e) || t(e)) && q(
    "Do not use built-in or reserved HTML elements as component id: " + e
  );
}
function Gd(e) {
  return e.vnode.shapeFlag & 4;
}
let Ei = !1;
function Mg(e, t = !1, n = !1) {
  t && na(t);
  const { props: o, children: i } = e.vnode, s = Gd(e);
  tg(e, o, s, t), fg(e, i, n);
  const l = s ? Fg(e, t) : void 0;
  return t && na(!1), l;
}
function Fg(e, t) {
  var n;
  const o = e.type;
  if (E.NODE_ENV !== "production") {
    if (o.name && oa(o.name, e.appContext.config), o.components) {
      const s = Object.keys(o.components);
      for (let l = 0; l < s.length; l++)
        oa(s[l], e.appContext.config);
    }
    if (o.directives) {
      const s = Object.keys(o.directives);
      for (let l = 0; l < s.length; l++)
        dd(s[l]);
    }
    o.compilerOptions && Bg() && q(
      '"compilerOptions" is only supported when using a build of Vue that includes the runtime compiler. Since you are using a runtime-only build, the options should be passed via your build tool config instead.'
    );
  }
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, xd), E.NODE_ENV !== "production" && Wh(e);
  const { setup: i } = o;
  if (i) {
    Fn();
    const s = e.setupContext = i.length > 1 ? Rg(e) : null, l = ji(e), a = Qo(
      i,
      e,
      0,
      [
        E.NODE_ENV !== "production" ? mn(e.props) : e.props,
        s
      ]
    ), r = Ca(a);
    if (Bn(), l(), (r || e.sp) && !gi(e) && _d(e), r) {
      if (a.then(Qr, Qr), t)
        return a.then((f) => {
          eu(e, f, t);
        }).catch((f) => {
          Li(f, e, 0);
        });
      if (e.asyncDep = a, E.NODE_ENV !== "production" && !e.suspense) {
        const f = (n = o.name) != null ? n : "Anonymous";
        q(
          `Component <${f}>: setup function returned a promise, but no <Suspense> boundary was found in the parent component tree. A component with async setup() must be nested in a <Suspense> in order to be rendered.`
        );
      }
    } else
      eu(e, a, t);
  } else
    Kd(e, t);
}
function eu(e, t, n) {
  Se(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : $e(t) ? (E.NODE_ENV !== "production" && Yo(t) && q(
    "setup() should not return VNodes directly - return a render function instead."
  ), E.NODE_ENV !== "production" && (e.devtoolsRawSetupState = t), e.setupState = Zc(t), E.NODE_ENV !== "production" && qh(e)) : E.NODE_ENV !== "production" && t !== void 0 && q(
    `setup() should return an object. Received: ${t === null ? "null" : typeof t}`
  ), Kd(e, n);
}
let ia;
const Bg = () => !ia;
function Kd(e, t, n) {
  const o = e.type;
  if (!e.render) {
    if (!t && ia && !o.render) {
      const i = o.template || Ra(e).template;
      if (i) {
        E.NODE_ENV !== "production" && On(e, "compile");
        const { isCustomElement: s, compilerOptions: l } = e.appContext.config, { delimiters: a, compilerOptions: r } = o, f = Je(
          Je(
            {
              isCustomElement: s,
              delimiters: a
            },
            l
          ),
          r
        );
        o.render = ia(i, f), E.NODE_ENV !== "production" && An(e, "compile");
      }
    }
    e.render = o.render || ct;
  }
  {
    const i = ji(e);
    Fn();
    try {
      Kh(e);
    } finally {
      Bn(), i();
    }
  }
  E.NODE_ENV !== "production" && !o.render && e.render === ct && !t && (o.template ? q(
    'Component provided template option but runtime compilation is not supported in this build of Vue. Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".'
  ) : q("Component is missing template or render function: ", o));
}
const tu = E.NODE_ENV !== "production" ? {
  get(e, t) {
    return Ts(), ut(e, "get", ""), e[t];
  },
  set() {
    return q("setupContext.attrs is readonly."), !1;
  },
  deleteProperty() {
    return q("setupContext.attrs is readonly."), !1;
  }
} : {
  get(e, t) {
    return ut(e, "get", ""), e[t];
  }
};
function Lg(e) {
  return new Proxy(e.slots, {
    get(t, n) {
      return ut(e, "get", "$slots"), t[n];
    }
  });
}
function Rg(e) {
  const t = (n) => {
    if (E.NODE_ENV !== "production" && (e.exposed && q("expose() should be called only once per setup()."), n != null)) {
      let o = typeof n;
      o === "object" && (he(n) ? o = "array" : Ue(n) && (o = "ref")), o !== "object" && q(
        `expose() should be passed a plain object, received ${o}.`
      );
    }
    e.exposed = n || {};
  };
  if (E.NODE_ENV !== "production") {
    let n, o;
    return Object.freeze({
      get attrs() {
        return n || (n = new Proxy(e.attrs, tu));
      },
      get slots() {
        return o || (o = Lg(e));
      },
      get emit() {
        return (i, ...s) => e.emit(i, ...s);
      },
      expose: t
    });
  } else
    return {
      attrs: new Proxy(e.attrs, tu),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
}
function nl(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Zc(Xc(e.exposed)), {
    get(t, n) {
      if (n in t)
        return t[n];
      if (n in No)
        return No[n](e);
    },
    has(t, n) {
      return n in t || n in No;
    }
  })) : e.proxy;
}
const Hg = /(?:^|[-_])(\w)/g, jg = (e) => e.replace(Hg, (t) => t.toUpperCase()).replace(/[-_]/g, "");
function Wa(e, t = !0) {
  return Se(e) ? e.displayName || e.name : e.name || t && e.__name;
}
function ol(e, t, n = !1) {
  let o = Wa(t);
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
  return o ? jg(o) : n ? "App" : "Anonymous";
}
function Yd(e) {
  return Se(e) && "__vccOpts" in e;
}
const b = (e, t) => {
  const n = ih(e, t, Ei);
  if (E.NODE_ENV !== "production") {
    const o = tl();
    o && o.appContext.config.warnRecursiveComputed && (n._warnRecursive = !0);
  }
  return n;
};
function so(e, t, n) {
  const o = arguments.length;
  return o === 2 ? $e(t) && !he(t) ? Yo(t) ? c(e, null, [t]) : c(e, t) : c(e, null, t) : (o > 3 ? n = Array.prototype.slice.call(arguments, 2) : o === 3 && Yo(n) && (n = [n]), c(e, t, n));
}
function zg() {
  if (E.NODE_ENV === "production" || typeof window > "u")
    return;
  const e = { style: "color:#3ba776" }, t = { style: "color:#1677ff" }, n = { style: "color:#f5222d" }, o = { style: "color:#eb2f96" }, i = {
    __vue_custom_formatter: !0,
    header(d) {
      return $e(d) ? d.__isVue ? ["div", e, "VueInstance"] : Ue(d) ? [
        "div",
        {},
        ["span", e, u(d)],
        "<",
        // avoid debugger accessing value affecting behavior
        a("_value" in d ? d._value : d),
        ">"
      ] : Eo(d) ? [
        "div",
        {},
        ["span", e, xt(d) ? "ShallowReactive" : "Reactive"],
        "<",
        a(d),
        `>${$n(d) ? " (readonly)" : ""}`
      ] : $n(d) ? [
        "div",
        {},
        ["span", e, xt(d) ? "ShallowReadonly" : "Readonly"],
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
          ...s(d.$)
        ];
    }
  };
  function s(d) {
    const v = [];
    d.type.props && d.props && v.push(l("props", me(d.props))), d.setupState !== Fe && v.push(l("setup", d.setupState)), d.data !== Fe && v.push(l("data", me(d.data)));
    const h = r(d, "computed");
    h && v.push(l("computed", h));
    const m = r(d, "inject");
    return m && v.push(l("injected", m)), v.push([
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
    ]), v;
  }
  function l(d, v) {
    return v = Je({}, v), Object.keys(v).length ? [
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
        ...Object.keys(v).map((h) => [
          "div",
          {},
          ["span", o, h + ": "],
          a(v[h], !1)
        ])
      ]
    ] : ["span", {}];
  }
  function a(d, v = !0) {
    return typeof d == "number" ? ["span", t, d] : typeof d == "string" ? ["span", n, JSON.stringify(d)] : typeof d == "boolean" ? ["span", o, d] : $e(d) ? ["object", { object: v ? me(d) : d }] : ["span", n, String(d)];
  }
  function r(d, v) {
    const h = d.type;
    if (Se(h))
      return;
    const m = {};
    for (const g in d.ctx)
      f(h, g, v) && (m[g] = d.ctx[g]);
    return m;
  }
  function f(d, v, h) {
    const m = d[h];
    if (he(m) && m.includes(v) || $e(m) && v in m || d.extends && f(d.extends, v, h) || d.mixins && d.mixins.some((g) => f(g, v, h)))
      return !0;
  }
  function u(d) {
    return xt(d) ? "ShallowRef" : d.effect ? "ComputedRef" : "Ref";
  }
  window.devtoolsFormatters ? window.devtoolsFormatters.push(i) : window.devtoolsFormatters = [i];
}
const nu = "3.5.12", Vt = E.NODE_ENV !== "production" ? q : ct;
var $t = {};
let sa;
const ou = typeof window < "u" && window.trustedTypes;
if (ou)
  try {
    sa = /* @__PURE__ */ ou.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch (e) {
    $t.NODE_ENV !== "production" && Vt(`Error creating trusted types policy: ${e}`);
  }
const Xd = sa ? (e) => sa.createHTML(e) : (e) => e, Ug = "http://www.w3.org/2000/svg", Wg = "http://www.w3.org/1998/Math/MathML", Pn = typeof document < "u" ? document : null, iu = Pn && /* @__PURE__ */ Pn.createElement("template"), qg = {
  insert: (e, t, n) => {
    t.insertBefore(e, n || null);
  },
  remove: (e) => {
    const t = e.parentNode;
    t && t.removeChild(e);
  },
  createElement: (e, t, n, o) => {
    const i = t === "svg" ? Pn.createElementNS(Ug, e) : t === "mathml" ? Pn.createElementNS(Wg, e) : n ? Pn.createElement(e, { is: n }) : Pn.createElement(e);
    return e === "select" && o && o.multiple != null && i.setAttribute("multiple", o.multiple), i;
  },
  createText: (e) => Pn.createTextNode(e),
  createComment: (e) => Pn.createComment(e),
  setText: (e, t) => {
    e.nodeValue = t;
  },
  setElementText: (e, t) => {
    e.textContent = t;
  },
  parentNode: (e) => e.parentNode,
  nextSibling: (e) => e.nextSibling,
  querySelector: (e) => Pn.querySelector(e),
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
      iu.innerHTML = Xd(
        o === "svg" ? `<svg>${e}</svg>` : o === "mathml" ? `<math>${e}</math>` : e
      );
      const a = iu.content;
      if (o === "svg" || o === "mathml") {
        const r = a.firstChild;
        for (; r.firstChild; )
          a.appendChild(r.firstChild);
        a.removeChild(r);
      }
      t.insertBefore(a, n);
    }
    return [
      // first
      l ? l.nextSibling : t.firstChild,
      // last
      n ? n.previousSibling : t.lastChild
    ];
  }
}, Gn = "transition", ai = "animation", Xo = Symbol("_vtc"), Jd = {
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
}, Zd = /* @__PURE__ */ Je(
  {},
  gd,
  Jd
), Gg = (e) => (e.displayName = "Transition", e.props = Zd, e), Do = /* @__PURE__ */ Gg(
  (e, { slots: t }) => so(Ih, Qd(e), t)
), ho = (e, t = []) => {
  he(e) ? e.forEach((n) => n(...t)) : e && e(...t);
}, su = (e) => e ? he(e) ? e.some((t) => t.length > 1) : e.length > 1 : !1;
function Qd(e) {
  const t = {};
  for (const k in e)
    k in Jd || (t[k] = e[k]);
  if (e.css === !1)
    return t;
  const {
    name: n = "v",
    type: o,
    duration: i,
    enterFromClass: s = `${n}-enter-from`,
    enterActiveClass: l = `${n}-enter-active`,
    enterToClass: a = `${n}-enter-to`,
    appearFromClass: r = s,
    appearActiveClass: f = l,
    appearToClass: u = a,
    leaveFromClass: d = `${n}-leave-from`,
    leaveActiveClass: v = `${n}-leave-active`,
    leaveToClass: h = `${n}-leave-to`
  } = e, m = Kg(i), g = m && m[0], _ = m && m[1], {
    onBeforeEnter: S,
    onEnter: N,
    onEnterCancelled: I,
    onLeave: P,
    onLeaveCancelled: x,
    onBeforeAppear: C = S,
    onAppear: $ = N,
    onAppearCancelled: V = I
  } = t, T = (k, A, B) => {
    Kn(k, A ? u : a), Kn(k, A ? f : l), B && B();
  }, D = (k, A) => {
    k._isLeaving = !1, Kn(k, d), Kn(k, h), Kn(k, v), A && A();
  }, O = (k) => (A, B) => {
    const Q = k ? $ : N, re = () => T(A, k, B);
    ho(Q, [A, re]), lu(() => {
      Kn(A, k ? r : s), In(A, k ? u : a), su(Q) || au(A, o, g, re);
    });
  };
  return Je(t, {
    onBeforeEnter(k) {
      ho(S, [k]), In(k, s), In(k, l);
    },
    onBeforeAppear(k) {
      ho(C, [k]), In(k, r), In(k, f);
    },
    onEnter: O(!1),
    onAppear: O(!0),
    onLeave(k, A) {
      k._isLeaving = !0;
      const B = () => D(k, A);
      In(k, d), In(k, v), tf(), lu(() => {
        k._isLeaving && (Kn(k, d), In(k, h), su(P) || au(k, o, _, B));
      }), ho(P, [k, B]);
    },
    onEnterCancelled(k) {
      T(k, !1), ho(I, [k]);
    },
    onAppearCancelled(k) {
      T(k, !0), ho(V, [k]);
    },
    onLeaveCancelled(k) {
      D(k), ho(x, [k]);
    }
  });
}
function Kg(e) {
  if (e == null)
    return null;
  if ($e(e))
    return [Vl(e.enter), Vl(e.leave)];
  {
    const t = Vl(e);
    return [t, t];
  }
}
function Vl(e) {
  const t = yv(e);
  return $t.NODE_ENV !== "production" && dh(t, "<transition> explicit duration"), t;
}
function In(e, t) {
  t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Xo] || (e[Xo] = /* @__PURE__ */ new Set())).add(t);
}
function Kn(e, t) {
  t.split(/\s+/).forEach((o) => o && e.classList.remove(o));
  const n = e[Xo];
  n && (n.delete(t), n.size || (e[Xo] = void 0));
}
function lu(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let Yg = 0;
function au(e, t, n, o) {
  const i = e._endId = ++Yg, s = () => {
    i === e._endId && o();
  };
  if (n != null)
    return setTimeout(s, n);
  const { type: l, timeout: a, propCount: r } = ef(e, t);
  if (!l)
    return o();
  const f = l + "end";
  let u = 0;
  const d = () => {
    e.removeEventListener(f, v), s();
  }, v = (h) => {
    h.target === e && ++u >= r && d();
  };
  setTimeout(() => {
    u < r && d();
  }, a + 1), e.addEventListener(f, v);
}
function ef(e, t) {
  const n = window.getComputedStyle(e), o = (m) => (n[m] || "").split(", "), i = o(`${Gn}Delay`), s = o(`${Gn}Duration`), l = ru(i, s), a = o(`${ai}Delay`), r = o(`${ai}Duration`), f = ru(a, r);
  let u = null, d = 0, v = 0;
  t === Gn ? l > 0 && (u = Gn, d = l, v = s.length) : t === ai ? f > 0 && (u = ai, d = f, v = r.length) : (d = Math.max(l, f), u = d > 0 ? l > f ? Gn : ai : null, v = u ? u === Gn ? s.length : r.length : 0);
  const h = u === Gn && /\b(transform|all)(,|$)/.test(
    o(`${Gn}Property`).toString()
  );
  return {
    type: u,
    timeout: d,
    propCount: v,
    hasTransform: h
  };
}
function ru(e, t) {
  for (; e.length < t.length; )
    e = e.concat(e);
  return Math.max(...t.map((n, o) => uu(n) + uu(e[o])));
}
function uu(e) {
  return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
}
function tf() {
  return document.body.offsetHeight;
}
function Xg(e, t, n) {
  const o = e[Xo];
  o && (t = (t ? [t, ...o] : [...o]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
const As = Symbol("_vod"), nf = Symbol("_vsh"), En = {
  beforeMount(e, { value: t }, { transition: n }) {
    e[As] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : ri(e, t);
  },
  mounted(e, { value: t }, { transition: n }) {
    n && t && n.enter(e);
  },
  updated(e, { value: t, oldValue: n }, { transition: o }) {
    !t != !n && (o ? t ? (o.beforeEnter(e), ri(e, !0), o.enter(e)) : o.leave(e, () => {
      ri(e, !1);
    }) : ri(e, t));
  },
  beforeUnmount(e, { value: t }) {
    ri(e, t);
  }
};
$t.NODE_ENV !== "production" && (En.name = "show");
function ri(e, t) {
  e.style.display = t ? e[As] : "none", e[nf] = !t;
}
const Jg = Symbol($t.NODE_ENV !== "production" ? "CSS_VAR_TEXT" : ""), Zg = /(^|;)\s*display\s*:/;
function Qg(e, t, n) {
  const o = e.style, i = Xe(n);
  let s = !1;
  if (n && !i) {
    if (t)
      if (Xe(t))
        for (const l of t.split(";")) {
          const a = l.slice(0, l.indexOf(":")).trim();
          n[a] == null && ms(o, a, "");
        }
      else
        for (const l in t)
          n[l] == null && ms(o, l, "");
    for (const l in n)
      l === "display" && (s = !0), ms(o, l, n[l]);
  } else if (i) {
    if (t !== n) {
      const l = o[Jg];
      l && (n += ";" + l), o.cssText = n, s = Zg.test(n);
    }
  } else t && e.removeAttribute("style");
  As in e && (e[As] = s ? o.display : "", e[nf] && (o.display = "none"));
}
const ey = /[^\\];\s*$/, cu = /\s*!important$/;
function ms(e, t, n) {
  if (he(n))
    n.forEach((o) => ms(e, t, o));
  else if (n == null && (n = ""), $t.NODE_ENV !== "production" && ey.test(n) && Vt(
    `Unexpected semicolon at the end of '${t}' style value: '${n}'`
  ), t.startsWith("--"))
    e.setProperty(t, n);
  else {
    const o = ty(e, t);
    cu.test(n) ? e.setProperty(
      no(o),
      n.replace(cu, ""),
      "important"
    ) : e[o] = n;
  }
}
const du = ["Webkit", "Moz", "ms"], Nl = {};
function ty(e, t) {
  const n = Nl[t];
  if (n)
    return n;
  let o = gt(t);
  if (o !== "filter" && o in e)
    return Nl[t] = o;
  o = Kt(o);
  for (let i = 0; i < du.length; i++) {
    const s = du[i] + o;
    if (s in e)
      return Nl[t] = s;
  }
  return t;
}
const fu = "http://www.w3.org/1999/xlink";
function mu(e, t, n, o, i, s = Tv(t)) {
  o && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(fu, t.slice(6, t.length)) : e.setAttributeNS(fu, t, n) : n == null || s && !Oc(n) ? e.removeAttribute(t) : e.setAttribute(
    t,
    s ? "" : kn(n) ? String(n) : n
  );
}
function vu(e, t, n, o, i) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? Xd(n) : n);
    return;
  }
  const s = e.tagName;
  if (t === "value" && s !== "PROGRESS" && // custom elements may use _value internally
  !s.includes("-")) {
    const a = s === "OPTION" ? e.getAttribute("value") || "" : e.value, r = n == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      e.type === "checkbox" ? "on" : ""
    ) : String(n);
    (a !== r || !("_value" in e)) && (e.value = r), n == null && e.removeAttribute(t), e._value = n;
    return;
  }
  let l = !1;
  if (n === "" || n == null) {
    const a = typeof e[t];
    a === "boolean" ? n = Oc(n) : n == null && a === "string" ? (n = "", l = !0) : a === "number" && (n = 0, l = !0);
  }
  try {
    e[t] = n;
  } catch (a) {
    $t.NODE_ENV !== "production" && !l && Vt(
      `Failed setting prop "${t}" on <${s.toLowerCase()}>: value ${n} is invalid.`,
      a
    );
  }
  l && e.removeAttribute(i || t);
}
function wo(e, t, n, o) {
  e.addEventListener(t, n, o);
}
function ny(e, t, n, o) {
  e.removeEventListener(t, n, o);
}
const hu = Symbol("_vei");
function oy(e, t, n, o, i = null) {
  const s = e[hu] || (e[hu] = {}), l = s[t];
  if (o && l)
    l.value = $t.NODE_ENV !== "production" ? yu(o, t) : o;
  else {
    const [a, r] = iy(t);
    if (o) {
      const f = s[t] = ay(
        $t.NODE_ENV !== "production" ? yu(o, t) : o,
        i
      );
      wo(e, a, f, r);
    } else l && (ny(e, a, l, r), s[t] = void 0);
  }
}
const gu = /(?:Once|Passive|Capture)$/;
function iy(e) {
  let t;
  if (gu.test(e)) {
    t = {};
    let o;
    for (; o = e.match(gu); )
      e = e.slice(0, e.length - o[0].length), t[o[0].toLowerCase()] = !0;
  }
  return [e[2] === ":" ? e.slice(3) : no(e.slice(2)), t];
}
let Tl = 0;
const sy = /* @__PURE__ */ Promise.resolve(), ly = () => Tl || (sy.then(() => Tl = 0), Tl = Date.now());
function ay(e, t) {
  const n = (o) => {
    if (!o._vts)
      o._vts = Date.now();
    else if (o._vts <= n.attached)
      return;
    nn(
      ry(o, n.value),
      t,
      5,
      [o]
    );
  };
  return n.value = e, n.attached = ly(), n;
}
function yu(e, t) {
  return Se(e) || he(e) ? e : (Vt(
    `Wrong type passed as event handler to ${t} - did you forget @ or : in front of your prop?
Expected function or array of functions, received type ${typeof e}.`
  ), ct);
}
function ry(e, t) {
  if (he(t)) {
    const n = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      n.call(e), e._stopped = !0;
    }, t.map(
      (o) => (i) => !i._stopped && o && o(i)
    );
  } else
    return t;
}
const pu = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // lowercase letter
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, uy = (e, t, n, o, i, s) => {
  const l = i === "svg";
  t === "class" ? Xg(e, o, l) : t === "style" ? Qg(e, n, o) : $i(t) ? bs(t) || oy(e, t, n, o, s) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : cy(e, t, o, l)) ? (vu(e, t, o), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && mu(e, t, o, l, s, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && (/[A-Z]/.test(t) || !Xe(o)) ? vu(e, gt(t), o, s, t) : (t === "true-value" ? e._trueValue = o : t === "false-value" && (e._falseValue = o), mu(e, t, o, l));
};
function cy(e, t, n, o) {
  if (o)
    return !!(t === "innerHTML" || t === "textContent" || t in e && pu(t) && Se(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA")
    return !1;
  if (t === "width" || t === "height") {
    const i = e.tagName;
    if (i === "IMG" || i === "VIDEO" || i === "CANVAS" || i === "SOURCE")
      return !1;
  }
  return pu(t) && Xe(n) ? !1 : t in e;
}
const of = /* @__PURE__ */ new WeakMap(), sf = /* @__PURE__ */ new WeakMap(), Is = Symbol("_moveCb"), bu = Symbol("_enterCb"), dy = (e) => (delete e.props.mode, e), fy = /* @__PURE__ */ dy({
  name: "TransitionGroup",
  props: /* @__PURE__ */ Je({}, Zd, {
    tag: String,
    moveClass: String
  }),
  setup(e, { slots: t }) {
    const n = tl(), o = hd();
    let i, s;
    return Ba(() => {
      if (!i.length)
        return;
      const l = e.moveClass || `${e.name || "v"}-move`;
      if (!gy(
        i[0].el,
        n.vnode.el,
        l
      ))
        return;
      i.forEach(my), i.forEach(vy);
      const a = i.filter(hy);
      tf(), a.forEach((r) => {
        const f = r.el, u = f.style;
        In(f, l), u.transform = u.webkitTransform = u.transitionDuration = "";
        const d = f[Is] = (v) => {
          v && v.target !== f || (!v || /transform$/.test(v.propertyName)) && (f.removeEventListener("transitionend", d), f[Is] = null, Kn(f, l));
        };
        f.addEventListener("transitionend", d);
      });
    }), () => {
      const l = me(e), a = Qd(l);
      let r = l.tag || Ve;
      if (i = [], s)
        for (let f = 0; f < s.length; f++) {
          const u = s[f];
          u.el && u.el instanceof Element && (i.push(u), Po(
            u,
            Si(
              u,
              a,
              o,
              n
            )
          ), of.set(
            u,
            u.el.getBoundingClientRect()
          ));
        }
      s = t.default ? Ma(t.default()) : [];
      for (let f = 0; f < s.length; f++) {
        const u = s[f];
        u.key != null ? Po(
          u,
          Si(u, a, o, n)
        ) : $t.NODE_ENV !== "production" && u.type !== $o && Vt("<TransitionGroup> children must be keyed.");
      }
      return c(r, null, s);
    };
  }
}), qa = fy;
function my(e) {
  const t = e.el;
  t[Is] && t[Is](), t[bu] && t[bu]();
}
function vy(e) {
  sf.set(e, e.el.getBoundingClientRect());
}
function hy(e) {
  const t = of.get(e), n = sf.get(e), o = t.left - n.left, i = t.top - n.top;
  if (o || i) {
    const s = e.el.style;
    return s.transform = s.webkitTransform = `translate(${o}px,${i}px)`, s.transitionDuration = "0s", e;
  }
}
function gy(e, t, n) {
  const o = e.cloneNode(), i = e[Xo];
  i && i.forEach((a) => {
    a.split(/\s+/).forEach((r) => r && o.classList.remove(r));
  }), n.split(/\s+/).forEach((a) => a && o.classList.add(a)), o.style.display = "none";
  const s = t.nodeType === 1 ? t : t.parentNode;
  s.appendChild(o);
  const { hasTransform: l } = ef(o);
  return s.removeChild(o), l;
}
const Ps = (e) => {
  const t = e.props["onUpdate:modelValue"] || !1;
  return he(t) ? (n) => Ro(t, n) : t;
};
function yy(e) {
  e.target.composing = !0;
}
function _u(e) {
  const t = e.target;
  t.composing && (t.composing = !1, t.dispatchEvent(new Event("input")));
}
const Ko = Symbol("_assign"), py = {
  created(e, { modifiers: { lazy: t, trim: n, number: o } }, i) {
    e[Ko] = Ps(i);
    const s = o || i.props && i.props.type === "number";
    wo(e, t ? "change" : "input", (l) => {
      if (l.target.composing) return;
      let a = e.value;
      n && (a = a.trim()), s && (a = ws(a)), e[Ko](a);
    }), n && wo(e, "change", () => {
      e.value = e.value.trim();
    }), t || (wo(e, "compositionstart", yy), wo(e, "compositionend", _u), wo(e, "change", _u));
  },
  // set value on mounted so it's after min/max for type="range"
  mounted(e, { value: t }) {
    e.value = t ?? "";
  },
  beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: o, trim: i, number: s } }, l) {
    if (e[Ko] = Ps(l), e.composing) return;
    const a = (s || e.type === "number") && !/^0\d/.test(e.value) ? ws(e.value) : e.value, r = t ?? "";
    a !== r && (document.activeElement === e && e.type !== "range" && (o && t === n || i && e.value.trim() === r) || (e.value = r));
  }
}, by = {
  // <select multiple> value need to be deep traversed
  deep: !0,
  created(e, { value: t, modifiers: { number: n } }, o) {
    const i = qs(t);
    wo(e, "change", () => {
      const s = Array.prototype.filter.call(e.options, (l) => l.selected).map(
        (l) => n ? ws(Ds(l)) : Ds(l)
      );
      e[Ko](
        e.multiple ? i ? new Set(s) : s : s[0]
      ), e._assigning = !0, at(() => {
        e._assigning = !1;
      });
    }), e[Ko] = Ps(o);
  },
  // set value in mounted & updated because <select> relies on its children
  // <option>s.
  mounted(e, { value: t }) {
    wu(e, t);
  },
  beforeUpdate(e, t, n) {
    e[Ko] = Ps(n);
  },
  updated(e, { value: t }) {
    e._assigning || wu(e, t);
  }
};
function wu(e, t) {
  const n = e.multiple, o = he(t);
  if (n && !o && !qs(t)) {
    $t.NODE_ENV !== "production" && Vt(
      `<select multiple v-model> expects an Array or Set value for its binding, but got ${Object.prototype.toString.call(t).slice(8, -1)}.`
    );
    return;
  }
  for (let i = 0, s = e.options.length; i < s; i++) {
    const l = e.options[i], a = Ds(l);
    if (n)
      if (o) {
        const r = typeof a;
        r === "string" || r === "number" ? l.selected = t.some((f) => String(f) === String(a)) : l.selected = Av(t, a) > -1;
      } else
        l.selected = t.has(a);
    else if (Ks(Ds(l), t)) {
      e.selectedIndex !== i && (e.selectedIndex = i);
      return;
    }
  }
  !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
}
function Ds(e) {
  return "_value" in e ? e._value : e.value;
}
const _y = ["ctrl", "shift", "alt", "meta"], wy = {
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
  exact: (e, t) => _y.some((n) => e[`${n}Key`] && !t.includes(n))
}, vs = (e, t) => {
  const n = e._withMods || (e._withMods = {}), o = t.join(".");
  return n[o] || (n[o] = (i, ...s) => {
    for (let l = 0; l < t.length; l++) {
      const a = wy[t[l]];
      if (a && a(i, t)) return;
    }
    return e(i, ...s);
  });
}, ky = /* @__PURE__ */ Je({ patchProp: uy }, qg);
let ku;
function Sy() {
  return ku || (ku = hg(ky));
}
const Cy = (...e) => {
  const t = Sy().createApp(...e);
  $t.NODE_ENV !== "production" && (xy(t), Vy(t));
  const { mount: n } = t;
  return t.mount = (o) => {
    const i = Ny(o);
    if (!i) return;
    const s = t._component;
    !Se(s) && !s.render && !s.template && (s.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const l = n(i, !1, Ey(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), l;
  }, t;
};
function Ey(e) {
  if (e instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement)
    return "mathml";
}
function xy(e) {
  Object.defineProperty(e.config, "isNativeTag", {
    value: (t) => Ev(t) || xv(t) || Vv(t),
    writable: !1
  });
}
function Vy(e) {
  {
    const t = e.config.isCustomElement;
    Object.defineProperty(e.config, "isCustomElement", {
      get() {
        return t;
      },
      set() {
        Vt(
          "The `isCustomElement` config option is deprecated. Use `compilerOptions.isCustomElement` instead."
        );
      }
    });
    const n = e.config.compilerOptions, o = 'The `compilerOptions` config option is only respected when using a build of Vue.js that includes the runtime compiler (aka "full build"). Since you are using the runtime-only build, `compilerOptions` must be passed to `@vue/compiler-dom` in the build setup instead.\n- For vue-loader: pass it via vue-loader\'s `compilerOptions` loader option.\n- For vue-cli: see https://cli.vuejs.org/guide/webpack.html#modifying-options-of-a-loader\n- For vite: pass it via @vitejs/plugin-vue options. See https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue#example-for-passing-options-to-vuecompiler-sfc';
    Object.defineProperty(e.config, "compilerOptions", {
      get() {
        return Vt(o), n;
      },
      set() {
        Vt(o);
      }
    });
  }
}
function Ny(e) {
  if (Xe(e)) {
    const t = document.querySelector(e);
    return $t.NODE_ENV !== "production" && !t && Vt(
      `Failed to mount app: mount target selector "${e}" returned null.`
    ), t;
  }
  return $t.NODE_ENV !== "production" && window.ShadowRoot && e instanceof window.ShadowRoot && e.mode === "closed" && Vt(
    'mounting on a ShadowRoot with `{mode: "closed"}` may lead to unpredictable bugs'
  ), e;
}
var Ty = {};
function Oy() {
  zg();
}
Ty.NODE_ENV !== "production" && Oy();
function oo(e, t) {
  let n;
  function o() {
    n = Va(), n.run(() => t.length ? t(() => {
      n == null || n.stop(), o();
    }) : t());
  }
  ke(e, (i) => {
    i && !n ? o() : i || (n == null || n.stop(), n = void 0);
  }, {
    immediate: !0
  }), Ft(() => {
    n == null || n.stop();
  });
}
const Ke = typeof window < "u", Ga = Ke && "IntersectionObserver" in window, Ay = Ke && ("ontouchstart" in window || window.navigator.maxTouchPoints > 0);
function lf(e, t, n) {
  const o = t.length - 1;
  if (o < 0) return e === void 0 ? n : e;
  for (let i = 0; i < o; i++) {
    if (e == null)
      return n;
    e = e[t[i]];
  }
  return e == null || e[t[o]] === void 0 ? n : e[t[o]];
}
function zi(e, t) {
  if (e === t) return !0;
  if (e instanceof Date && t instanceof Date && e.getTime() !== t.getTime() || e !== Object(e) || t !== Object(t))
    return !1;
  const n = Object.keys(e);
  return n.length !== Object.keys(t).length ? !1 : n.every((o) => zi(e[o], t[o]));
}
function la(e, t, n) {
  return e == null || !t || typeof t != "string" ? n : e[t] !== void 0 ? e[t] : (t = t.replace(/\[(\w+)\]/g, ".$1"), t = t.replace(/^\./, ""), lf(e, t.split("."), n));
}
function ui(e, t, n) {
  if (t === !0) return e === void 0 ? n : e;
  if (t == null || typeof t == "boolean") return n;
  if (e !== Object(e)) {
    if (typeof t != "function") return n;
    const i = t(e, n);
    return typeof i > "u" ? n : i;
  }
  if (typeof t == "string") return la(e, t, n);
  if (Array.isArray(t)) return lf(e, t, n);
  if (typeof t != "function") return n;
  const o = t(e, n);
  return typeof o > "u" ? n : o;
}
function Ka(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
  return Array.from({
    length: e
  }, (n, o) => t + o);
}
function be(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "px";
  if (!(e == null || e === ""))
    return isNaN(+e) ? String(e) : isFinite(+e) ? `${Number(e)}${t}` : void 0;
}
function af(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function Su(e) {
  let t;
  return e !== null && typeof e == "object" && ((t = Object.getPrototypeOf(e)) === Object.prototype || t === null);
}
function Ya(e) {
  if (e && "$el" in e) {
    const t = e.$el;
    return (t == null ? void 0 : t.nodeType) === Node.TEXT_NODE ? t.nextElementSibling : t;
  }
  return e;
}
const Cu = Object.freeze({
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
}), Iy = Object.freeze({
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
function rf(e) {
  return Object.keys(e);
}
function Ol(e, t) {
  return t.every((n) => e.hasOwnProperty(n));
}
function uf(e, t) {
  const n = {}, o = new Set(Object.keys(e));
  for (const i of t)
    o.has(i) && (n[i] = e[i]);
  return n;
}
function aa(e, t, n) {
  const o = /* @__PURE__ */ Object.create(null), i = /* @__PURE__ */ Object.create(null);
  for (const s in e)
    t.some((l) => l instanceof RegExp ? l.test(s) : l === s) && !(n != null && n.some((l) => l === s)) ? o[s] = e[s] : i[s] = e[s];
  return [o, i];
}
function Mo(e, t) {
  const n = {
    ...e
  };
  return t.forEach((o) => delete n[o]), n;
}
function Py(e, t) {
  const n = {};
  return t.forEach((o) => n[o] = e[o]), n;
}
const cf = /^on[^a-z]/, Xa = (e) => cf.test(e), Dy = ["onAfterscriptexecute", "onAnimationcancel", "onAnimationend", "onAnimationiteration", "onAnimationstart", "onAuxclick", "onBeforeinput", "onBeforescriptexecute", "onChange", "onClick", "onCompositionend", "onCompositionstart", "onCompositionupdate", "onContextmenu", "onCopy", "onCut", "onDblclick", "onFocusin", "onFocusout", "onFullscreenchange", "onFullscreenerror", "onGesturechange", "onGestureend", "onGesturestart", "onGotpointercapture", "onInput", "onKeydown", "onKeypress", "onKeyup", "onLostpointercapture", "onMousedown", "onMousemove", "onMouseout", "onMouseover", "onMouseup", "onMousewheel", "onPaste", "onPointercancel", "onPointerdown", "onPointerenter", "onPointerleave", "onPointermove", "onPointerout", "onPointerover", "onPointerup", "onReset", "onSelect", "onSubmit", "onTouchcancel", "onTouchend", "onTouchmove", "onTouchstart", "onTransitioncancel", "onTransitionend", "onTransitionrun", "onTransitionstart", "onWheel"];
function il(e) {
  const [t, n] = aa(e, [cf]), o = Mo(t, Dy), [i, s] = aa(n, ["class", "style", "id", /^data-/]);
  return Object.assign(i, t), Object.assign(s, o), [i, s];
}
function bn(e) {
  return e == null ? [] : Array.isArray(e) ? e : [e];
}
function Sn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
  return Math.max(t, Math.min(n, e));
}
function Eu(e) {
  const t = e.toString().trim();
  return t.includes(".") ? t.length - t.indexOf(".") - 1 : 0;
}
function xu(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0";
  return e + n.repeat(Math.max(0, t - e.length));
}
function Vu(e, t) {
  return (arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0").repeat(Math.max(0, t - e.length)) + e;
}
function $y(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1;
  const n = [];
  let o = 0;
  for (; o < e.length; )
    n.push(e.substr(o, t)), o += t;
  return n;
}
function wt() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = arguments.length > 2 ? arguments[2] : void 0;
  const o = {};
  for (const i in e)
    o[i] = e[i];
  for (const i in t) {
    const s = e[i], l = t[i];
    if (Su(s) && Su(l)) {
      o[i] = wt(s, l, n);
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
function df(e) {
  return e.map((t) => t.type === Ve ? df(t.children) : t).flat();
}
function To() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  if (To.cache.has(e)) return To.cache.get(e);
  const t = e.replace(/[^a-z]/gi, "-").replace(/\B([A-Z])/g, "-$1").toLowerCase();
  return To.cache.set(e, t), t;
}
To.cache = /* @__PURE__ */ new Map();
function jo(e, t) {
  if (!t || typeof t != "object") return [];
  if (Array.isArray(t))
    return t.map((n) => jo(e, n)).flat(1);
  if (t.suspense)
    return jo(e, t.ssContent);
  if (Array.isArray(t.children))
    return t.children.map((n) => jo(e, n)).flat(1);
  if (t.component) {
    if (Object.getOwnPropertySymbols(t.component.provides).includes(e))
      return [t.component];
    if (t.component.subTree)
      return jo(e, t.component.subTree).flat(1);
  }
  return [];
}
function Ja(e) {
  const t = ht({}), n = b(e);
  return sn(() => {
    for (const o in n.value)
      t[o] = n.value[o];
  }, {
    flush: "sync"
  }), Ia(t);
}
function $s(e, t) {
  return e.includes(t);
}
function ff(e) {
  return e[2].toLowerCase() + e.slice(3);
}
const Gt = () => [Function, Array];
function Nu(e, t) {
  return t = "on" + Kt(t), !!(e[t] || e[`${t}Once`] || e[`${t}Capture`] || e[`${t}OnceCapture`] || e[`${t}CaptureOnce`]);
}
function mf(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), o = 1; o < t; o++)
    n[o - 1] = arguments[o];
  if (Array.isArray(e))
    for (const i of e)
      i(...n);
  else typeof e == "function" && e(...n);
}
function Za(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0;
  const n = ["button", "[href]", 'input:not([type="hidden"])', "select", "textarea", "[tabindex]"].map((o) => `${o}${t ? ':not([tabindex="-1"])' : ""}:not([disabled])`).join(", ");
  return [...e.querySelectorAll(n)];
}
function My(e, t, n) {
  let o, i = e.indexOf(document.activeElement);
  const s = t === "next" ? 1 : -1;
  do
    i += s, o = e[i];
  while ((!o || o.offsetParent == null) && i < e.length && i >= 0);
  return o;
}
function vf(e, t) {
  var o, i, s, l;
  const n = Za(e);
  if (!t)
    (e === document.activeElement || !e.contains(document.activeElement)) && ((o = n[0]) == null || o.focus());
  else if (t === "first")
    (i = n[0]) == null || i.focus();
  else if (t === "last")
    (s = n.at(-1)) == null || s.focus();
  else if (typeof t == "number")
    (l = n[t]) == null || l.focus();
  else {
    const a = My(n, t);
    a ? a.focus() : vf(e, t === "next" ? "first" : "last");
  }
}
function hf(e, t) {
  if (!(Ke && typeof CSS < "u" && typeof CSS.supports < "u" && CSS.supports(`selector(${t})`))) return null;
  try {
    return !!e && e.matches(t);
  } catch {
    return null;
  }
}
function Fy(e, t) {
  if (!Ke || e === 0)
    return t(), () => {
    };
  const n = window.setTimeout(t, e);
  return () => window.clearTimeout(n);
}
function ra() {
  const e = we(), t = (n) => {
    e.value = n;
  };
  return Object.defineProperty(t, "value", {
    enumerable: !0,
    get: () => e.value,
    set: (n) => e.value = n
  }), Object.defineProperty(t, "el", {
    enumerable: !0,
    get: () => Ya(e.value)
  }), t;
}
const gf = ["top", "bottom"], By = ["start", "end", "left", "right"];
function ua(e, t) {
  let [n, o] = e.split(" ");
  return o || (o = $s(gf, n) ? "start" : $s(By, n) ? "top" : "center"), {
    side: Tu(n, t),
    align: Tu(o, t)
  };
}
function Tu(e, t) {
  return e === "start" ? t ? "right" : "left" : e === "end" ? t ? "left" : "right" : e;
}
function Al(e) {
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
function Il(e) {
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
function Ou(e) {
  return {
    side: e.align,
    align: e.side
  };
}
function Au(e) {
  return $s(gf, e.side) ? "y" : "x";
}
class Oo {
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
function Iu(e, t) {
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
function yf(e) {
  return Array.isArray(e) ? new Oo({
    x: e[0],
    y: e[1],
    width: 0,
    height: 0
  }) : e.getBoundingClientRect();
}
function Qa(e) {
  const t = e.getBoundingClientRect(), n = getComputedStyle(e), o = n.transform;
  if (o) {
    let i, s, l, a, r;
    if (o.startsWith("matrix3d("))
      i = o.slice(9, -1).split(/, /), s = +i[0], l = +i[5], a = +i[12], r = +i[13];
    else if (o.startsWith("matrix("))
      i = o.slice(7, -1).split(/, /), s = +i[0], l = +i[3], a = +i[4], r = +i[5];
    else
      return new Oo(t);
    const f = n.transformOrigin, u = t.x - a - (1 - s) * parseFloat(f), d = t.y - r - (1 - l) * parseFloat(f.slice(f.indexOf(" ") + 1)), v = s ? t.width / s : e.offsetWidth + 1, h = l ? t.height / l : e.offsetHeight + 1;
    return new Oo({
      x: u,
      y: d,
      width: v,
      height: h
    });
  } else
    return new Oo(t);
}
function ko(e, t, n) {
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
const hs = /* @__PURE__ */ new WeakMap();
function Ly(e, t) {
  Object.keys(t).forEach((n) => {
    if (Xa(n)) {
      const o = ff(n), i = hs.get(e);
      if (t[n] == null)
        i == null || i.forEach((s) => {
          const [l, a] = s;
          l === o && (e.removeEventListener(o, a), i.delete(s));
        });
      else if (!i || ![...i].some((s) => s[0] === o && s[1] === t[n])) {
        e.addEventListener(o, t[n]);
        const s = i || /* @__PURE__ */ new Set();
        s.add([o, t[n]]), hs.has(e) || hs.set(e, s);
      }
    } else
      t[n] == null ? e.removeAttribute(n) : e.setAttribute(n, t[n]);
  });
}
function Ry(e, t) {
  Object.keys(t).forEach((n) => {
    if (Xa(n)) {
      const o = ff(n), i = hs.get(e);
      i == null || i.forEach((s) => {
        const [l, a] = s;
        l === o && (e.removeEventListener(o, a), i.delete(s));
      });
    } else
      e.removeAttribute(n);
  });
}
const Bo = 2.4, Pu = 0.2126729, Du = 0.7151522, $u = 0.072175, Hy = 0.55, jy = 0.58, zy = 0.57, Uy = 0.62, os = 0.03, Mu = 1.45, Wy = 5e-4, qy = 1.25, Gy = 1.25, Fu = 0.078, Bu = 12.82051282051282, is = 0.06, Lu = 1e-3;
function Ru(e, t) {
  const n = (e.r / 255) ** Bo, o = (e.g / 255) ** Bo, i = (e.b / 255) ** Bo, s = (t.r / 255) ** Bo, l = (t.g / 255) ** Bo, a = (t.b / 255) ** Bo;
  let r = n * Pu + o * Du + i * $u, f = s * Pu + l * Du + a * $u;
  if (r <= os && (r += (os - r) ** Mu), f <= os && (f += (os - f) ** Mu), Math.abs(f - r) < Wy) return 0;
  let u;
  if (f > r) {
    const d = (f ** Hy - r ** jy) * qy;
    u = d < Lu ? 0 : d < Fu ? d - d * Bu * is : d - is;
  } else {
    const d = (f ** Uy - r ** zy) * Gy;
    u = d > -Lu ? 0 : d > -Fu ? d - d * Bu * is : d + is;
  }
  return u * 100;
}
function _n(e) {
  Vt(`Vuetify: ${e}`);
}
function Ms(e) {
  Vt(`Vuetify error: ${e}`);
}
function Ky(e, t) {
  t = Array.isArray(t) ? t.slice(0, -1).map((n) => `'${n}'`).join(", ") + ` or '${t.at(-1)}'` : `'${t}'`, Vt(`[Vuetify UPGRADE] '${e}' is deprecated, use ${t} instead.`);
}
const Fs = 0.20689655172413793, Yy = (e) => e > Fs ** 3 ? Math.cbrt(e) : e / (3 * Fs ** 2) + 4 / 29, Xy = (e) => e > Fs ? e ** 3 : 3 * Fs ** 2 * (e - 4 / 29);
function pf(e) {
  const t = Yy, n = t(e[1]);
  return [116 * n - 16, 500 * (t(e[0] / 0.95047) - n), 200 * (n - t(e[2] / 1.08883))];
}
function bf(e) {
  const t = Xy, n = (e[0] + 16) / 116;
  return [t(n + e[1] / 500) * 0.95047, t(n), t(n - e[2] / 200) * 1.08883];
}
const Jy = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]], Zy = (e) => e <= 31308e-7 ? e * 12.92 : 1.055 * e ** (1 / 2.4) - 0.055, Qy = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], ep = (e) => e <= 0.04045 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4;
function _f(e) {
  const t = Array(3), n = Zy, o = Jy;
  for (let i = 0; i < 3; ++i)
    t[i] = Math.round(Sn(n(o[i][0] * e[0] + o[i][1] * e[1] + o[i][2] * e[2])) * 255);
  return {
    r: t[0],
    g: t[1],
    b: t[2]
  };
}
function er(e) {
  let {
    r: t,
    g: n,
    b: o
  } = e;
  const i = [0, 0, 0], s = ep, l = Qy;
  t = s(t / 255), n = s(n / 255), o = s(o / 255);
  for (let a = 0; a < 3; ++a)
    i[a] = l[a][0] * t + l[a][1] * n + l[a][2] * o;
  return i;
}
function ca(e) {
  return !!e && /^(#|var\(--|(rgb|hsl)a?\()/.test(e);
}
function tp(e) {
  return ca(e) && !/^((rgb|hsl)a?\()?var\(--/.test(e);
}
const Hu = /^(?<fn>(?:rgb|hsl)a?)\((?<values>.+)\)/, np = {
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
  hsl: (e, t, n, o) => ju({
    h: e,
    s: t,
    l: n,
    a: o
  }),
  hsla: (e, t, n, o) => ju({
    h: e,
    s: t,
    l: n,
    a: o
  }),
  hsv: (e, t, n, o) => xi({
    h: e,
    s: t,
    v: n,
    a: o
  }),
  hsva: (e, t, n, o) => xi({
    h: e,
    s: t,
    v: n,
    a: o
  })
};
function hn(e) {
  if (typeof e == "number")
    return (isNaN(e) || e < 0 || e > 16777215) && _n(`'${e}' is not a valid hex color`), {
      r: (e & 16711680) >> 16,
      g: (e & 65280) >> 8,
      b: e & 255
    };
  if (typeof e == "string" && Hu.test(e)) {
    const {
      groups: t
    } = e.match(Hu), {
      fn: n,
      values: o
    } = t, i = o.split(/,\s*/).map((s) => s.endsWith("%") && ["hsl", "hsla", "hsv", "hsva"].includes(n) ? parseFloat(s) / 100 : parseFloat(s));
    return np[n](...i);
  } else if (typeof e == "string") {
    let t = e.startsWith("#") ? e.slice(1) : e;
    [3, 4].includes(t.length) ? t = t.split("").map((o) => o + o).join("") : [6, 8].includes(t.length) || _n(`'${e}' is not a valid hex(a) color`);
    const n = parseInt(t, 16);
    return (isNaN(n) || n < 0 || n > 4294967295) && _n(`'${e}' is not a valid hex(a) color`), ip(t);
  } else if (typeof e == "object") {
    if (Ol(e, ["r", "g", "b"]))
      return e;
    if (Ol(e, ["h", "s", "l"]))
      return xi(wf(e));
    if (Ol(e, ["h", "s", "v"]))
      return xi(e);
  }
  throw new TypeError(`Invalid color: ${e == null ? e : String(e) || e.constructor.name}
Expected #hex, #hexa, rgb(), rgba(), hsl(), hsla(), object or number`);
}
function xi(e) {
  const {
    h: t,
    s: n,
    v: o,
    a: i
  } = e, s = (a) => {
    const r = (a + t / 60) % 6;
    return o - o * n * Math.max(Math.min(r, 4 - r, 1), 0);
  }, l = [s(5), s(3), s(1)].map((a) => Math.round(a * 255));
  return {
    r: l[0],
    g: l[1],
    b: l[2],
    a: i
  };
}
function ju(e) {
  return xi(wf(e));
}
function wf(e) {
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
function ss(e) {
  const t = Math.round(e).toString(16);
  return ("00".substr(0, 2 - t.length) + t).toUpperCase();
}
function op(e) {
  let {
    r: t,
    g: n,
    b: o,
    a: i
  } = e;
  return `#${[ss(t), ss(n), ss(o), i !== void 0 ? ss(Math.round(i * 255)) : ""].join("")}`;
}
function ip(e) {
  e = sp(e);
  let [t, n, o, i] = $y(e, 2).map((s) => parseInt(s, 16));
  return i = i === void 0 ? i : i / 255, {
    r: t,
    g: n,
    b: o,
    a: i
  };
}
function sp(e) {
  return e.startsWith("#") && (e = e.slice(1)), e = e.replace(/([^0-9a-f])/gi, "F"), (e.length === 3 || e.length === 4) && (e = e.split("").map((t) => t + t).join("")), e.length !== 6 && (e = xu(xu(e, 6), 8, "F")), e;
}
function lp(e, t) {
  const n = pf(er(e));
  return n[0] = n[0] + t * 10, _f(bf(n));
}
function ap(e, t) {
  const n = pf(er(e));
  return n[0] = n[0] - t * 10, _f(bf(n));
}
function rp(e) {
  const t = hn(e);
  return er(t)[1];
}
function kf(e) {
  const t = Math.abs(Ru(hn(0), hn(e)));
  return Math.abs(Ru(hn(16777215), hn(e))) > Math.min(t, 50) ? "#fff" : "#000";
}
function W(e, t) {
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
const Te = W({
  class: [String, Array, Object],
  style: {
    type: [String, Array, Object],
    default: null
  }
}, "component");
function it(e, t) {
  const n = tl();
  if (!n)
    throw new Error(`[Vuetify] ${e} must be called from inside a setup function`);
  return n;
}
function xn() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "composables";
  const t = it(e).type;
  return To((t == null ? void 0 : t.aliasName) || (t == null ? void 0 : t.name));
}
let Sf = 0, gs = /* @__PURE__ */ new WeakMap();
function ln() {
  const e = it("getUid");
  if (gs.has(e)) return gs.get(e);
  {
    const t = Sf++;
    return gs.set(e, t), t;
  }
}
ln.reset = () => {
  Sf = 0, gs = /* @__PURE__ */ new WeakMap();
};
function up(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : it("injectSelf");
  const {
    provides: n
  } = t;
  if (n && e in n)
    return n[e];
}
const Jo = Symbol.for("vuetify:defaults");
function cp(e) {
  return se(e);
}
function tr() {
  const e = je(Jo);
  if (!e) throw new Error("[Vuetify] Could not find defaults instance");
  return e;
}
function lo(e, t) {
  const n = tr(), o = se(e), i = b(() => {
    if (vn(t == null ? void 0 : t.disabled)) return n.value;
    const l = vn(t == null ? void 0 : t.scoped), a = vn(t == null ? void 0 : t.reset), r = vn(t == null ? void 0 : t.root);
    if (o.value == null && !(l || a || r)) return n.value;
    let f = wt(o.value, {
      prev: n.value
    });
    if (l) return f;
    if (a || r) {
      const u = Number(a || 1 / 0);
      for (let d = 0; d <= u && !(!f || !("prev" in f)); d++)
        f = f.prev;
      return f && typeof r == "string" && r in f && (f = wt(wt(f, {
        prev: f
      }), f[r])), f;
    }
    return f.prev ? wt(f.prev, f) : f;
  });
  return yt(Jo, i), i;
}
function dp(e, t) {
  var n, o;
  return typeof ((n = e.props) == null ? void 0 : n[t]) < "u" || typeof ((o = e.props) == null ? void 0 : o[To(t)]) < "u";
}
function fp() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : tr();
  const o = it("useDefaults");
  if (t = t ?? o.type.name ?? o.type.__name, !t)
    throw new Error("[Vuetify] Could not determine component name");
  const i = b(() => {
    var r;
    return (r = n.value) == null ? void 0 : r[e._as ?? t];
  }), s = new Proxy(e, {
    get(r, f) {
      var d, v, h, m, g, _, S;
      const u = Reflect.get(r, f);
      return f === "class" || f === "style" ? [(d = i.value) == null ? void 0 : d[f], u].filter((N) => N != null) : typeof f == "string" && !dp(o.vnode, f) ? ((v = i.value) == null ? void 0 : v[f]) !== void 0 ? (h = i.value) == null ? void 0 : h[f] : ((g = (m = n.value) == null ? void 0 : m.global) == null ? void 0 : g[f]) !== void 0 ? (S = (_ = n.value) == null ? void 0 : _.global) == null ? void 0 : S[f] : u : u;
    }
  }), l = we();
  sn(() => {
    if (i.value) {
      const r = Object.entries(i.value).filter((f) => {
        let [u] = f;
        return u.startsWith(u[0].toUpperCase());
      });
      l.value = r.length ? Object.fromEntries(r) : void 0;
    } else
      l.value = void 0;
  });
  function a() {
    const r = up(Jo, o);
    yt(Jo, b(() => l.value ? wt((r == null ? void 0 : r.value) ?? {}, l.value) : r == null ? void 0 : r.value));
  }
  return {
    props: s,
    provideSubDefaults: a
  };
}
function ei(e) {
  if (e._setup = e._setup ?? e.setup, !e.name)
    return _n("The component is missing an explicit name, unable to generate default prop value"), e;
  if (e._setup) {
    e.props = W(e.props ?? {}, e.name)();
    const t = Object.keys(e.props).filter((n) => n !== "class" && n !== "style");
    e.filterProps = function(o) {
      return uf(o, t);
    }, e.props._as = String, e.setup = function(o, i) {
      const s = tr();
      if (!s.value) return e._setup(o, i);
      const {
        props: l,
        provideSubDefaults: a
      } = fp(o, o._as ?? e.name, s), r = e._setup(l, i);
      return a(), r;
    };
  }
  return e;
}
function de() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !0;
  return (t) => (e ? ei : Ph)(t);
}
function sl(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "div", n = arguments.length > 2 ? arguments[2] : void 0;
  return de()({
    name: n ?? Kt(gt(e.replace(/__/g, "-"))),
    props: {
      tag: {
        type: String,
        default: t
      },
      ...Te()
    },
    setup(o, i) {
      let {
        slots: s
      } = i;
      return () => {
        var l;
        return so(o.tag, {
          class: [e, o.class],
          style: o.style
        }, (l = s.default) == null ? void 0 : l.call(s));
      };
    }
  });
}
function Cf(e) {
  if (typeof e.getRootNode != "function") {
    for (; e.parentNode; ) e = e.parentNode;
    return e !== document ? null : document;
  }
  const t = e.getRootNode();
  return t !== document && t.getRootNode({
    composed: !0
  }) !== document ? null : t;
}
const Vi = "cubic-bezier(0.4, 0, 0.2, 1)", mp = "cubic-bezier(0.0, 0, 0.2, 1)", vp = "cubic-bezier(0.4, 0, 1, 1)";
function hp(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
  for (; e; ) {
    if (t ? gp(e) : nr(e)) return e;
    e = e.parentElement;
  }
  return document.scrollingElement;
}
function Bs(e, t) {
  const n = [];
  if (t && e && !t.contains(e)) return n;
  for (; e && (nr(e) && n.push(e), e !== t); )
    e = e.parentElement;
  return n;
}
function nr(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return t.overflowY === "scroll" || t.overflowY === "auto" && e.scrollHeight > e.clientHeight;
}
function gp(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return ["scroll", "auto"].includes(t.overflowY);
}
function yp(e) {
  for (; e; ) {
    if (window.getComputedStyle(e).position === "fixed")
      return !0;
    e = e.offsetParent;
  }
  return !1;
}
function _e(e) {
  const t = it("useRender");
  t.render = e;
}
function Ye(e, t, n) {
  let o = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : (d) => d, i = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : (d) => d;
  const s = it("useProxiedModel"), l = se(e[t] !== void 0 ? e[t] : n), a = To(t), f = b(a !== t ? () => {
    var d, v, h, m;
    return e[t], !!(((d = s.vnode.props) != null && d.hasOwnProperty(t) || (v = s.vnode.props) != null && v.hasOwnProperty(a)) && ((h = s.vnode.props) != null && h.hasOwnProperty(`onUpdate:${t}`) || (m = s.vnode.props) != null && m.hasOwnProperty(`onUpdate:${a}`)));
  } : () => {
    var d, v;
    return e[t], !!((d = s.vnode.props) != null && d.hasOwnProperty(t) && ((v = s.vnode.props) != null && v.hasOwnProperty(`onUpdate:${t}`)));
  });
  oo(() => !f.value, () => {
    ke(() => e[t], (d) => {
      l.value = d;
    });
  });
  const u = b({
    get() {
      const d = e[t];
      return o(f.value ? d : l.value);
    },
    set(d) {
      const v = i(d), h = me(f.value ? e[t] : l.value);
      h === v || o(h) === d || (l.value = v, s == null || s.emit(`update:${t}`, v));
    }
  });
  return Object.defineProperty(u, "externalValue", {
    get: () => f.value ? e[t] : l.value
  }), u;
}
const pp = {
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
}, zu = "$vuetify.", Uu = (e, t) => e.replace(/\{(\d+)\}/g, (n, o) => String(t[+o])), Ef = (e, t, n) => function(o) {
  for (var i = arguments.length, s = new Array(i > 1 ? i - 1 : 0), l = 1; l < i; l++)
    s[l - 1] = arguments[l];
  if (!o.startsWith(zu))
    return Uu(o, s);
  const a = o.replace(zu, ""), r = e.value && n.value[e.value], f = t.value && n.value[t.value];
  let u = la(r, a, null);
  return u || (_n(`Translation key "${o}" not found in "${e.value}", trying fallback locale`), u = la(f, a, null)), u || (Ms(`Translation key "${o}" not found in fallback`), u = o), typeof u != "string" && (Ms(`Translation key "${o}" has a non-string value`), u = o), Uu(u, s);
};
function xf(e, t) {
  return (n, o) => new Intl.NumberFormat([e.value, t.value], o).format(n);
}
function Pl(e, t, n) {
  const o = Ye(e, t, e[t] ?? n.value);
  return o.value = e[t] ?? n.value, ke(n, (i) => {
    e[t] == null && (o.value = n.value);
  }), o;
}
function Vf(e) {
  return (t) => {
    const n = Pl(t, "locale", e.current), o = Pl(t, "fallback", e.fallback), i = Pl(t, "messages", e.messages);
    return {
      name: "vuetify",
      current: n,
      fallback: o,
      messages: i,
      t: Ef(n, o, i),
      n: xf(n, o),
      provide: Vf({
        current: n,
        fallback: o,
        messages: i
      })
    };
  };
}
function bp(e) {
  const t = we((e == null ? void 0 : e.locale) ?? "en"), n = we((e == null ? void 0 : e.fallback) ?? "en"), o = se({
    en: pp,
    ...e == null ? void 0 : e.messages
  });
  return {
    name: "vuetify",
    current: t,
    fallback: n,
    messages: o,
    t: Ef(t, n, o),
    n: xf(t, n),
    provide: Vf({
      current: t,
      fallback: n,
      messages: o
    })
  };
}
const Ls = Symbol.for("vuetify:locale");
function _p(e) {
  return e.name != null;
}
function wp(e) {
  const t = e != null && e.adapter && _p(e == null ? void 0 : e.adapter) ? e == null ? void 0 : e.adapter : bp(e), n = Sp(t, e);
  return {
    ...t,
    ...n
  };
}
function ll() {
  const e = je(Ls);
  if (!e) throw new Error("[Vuetify] Could not find injected locale instance");
  return e;
}
function kp() {
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
function Sp(e, t) {
  const n = se((t == null ? void 0 : t.rtl) ?? kp()), o = b(() => n.value[e.current.value] ?? !1);
  return {
    isRtl: o,
    rtl: n,
    rtlClasses: b(() => `v-locale--is-${o.value ? "rtl" : "ltr"}`)
  };
}
function Bt() {
  const e = je(Ls);
  if (!e) throw new Error("[Vuetify] Could not find injected rtl instance");
  return {
    isRtl: e.isRtl,
    rtlClasses: e.rtlClasses
  };
}
const al = {
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
function Cp(e, t, n) {
  const o = [];
  let i = [];
  const s = Nf(e), l = Tf(e), a = n ?? al[t.slice(-2).toUpperCase()] ?? 0, r = (s.getDay() - a + 7) % 7, f = (l.getDay() - a + 7) % 7;
  for (let u = 0; u < r; u++) {
    const d = new Date(s);
    d.setDate(d.getDate() - (r - u)), i.push(d);
  }
  for (let u = 1; u <= l.getDate(); u++) {
    const d = new Date(e.getFullYear(), e.getMonth(), u);
    i.push(d), i.length === 7 && (o.push(i), i = []);
  }
  for (let u = 1; u < 7 - f; u++) {
    const d = new Date(l);
    d.setDate(d.getDate() + u), i.push(d);
  }
  return i.length > 0 && o.push(i), o;
}
function Ep(e, t, n) {
  const o = n ?? al[t.slice(-2).toUpperCase()] ?? 0, i = new Date(e);
  for (; i.getDay() !== o; )
    i.setDate(i.getDate() - 1);
  return i;
}
function xp(e, t) {
  const n = new Date(e), o = ((al[t.slice(-2).toUpperCase()] ?? 0) + 6) % 7;
  for (; n.getDay() !== o; )
    n.setDate(n.getDate() + 1);
  return n;
}
function Nf(e) {
  return new Date(e.getFullYear(), e.getMonth(), 1);
}
function Tf(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 0);
}
function Vp(e) {
  const t = e.split("-").map(Number);
  return new Date(t[0], t[1] - 1, t[2]);
}
const Np = /^([12]\d{3}-([1-9]|0[1-9]|1[0-2])-([1-9]|0[1-9]|[12]\d|3[01]))$/;
function Of(e) {
  if (e == null) return /* @__PURE__ */ new Date();
  if (e instanceof Date) return e;
  if (typeof e == "string") {
    let t;
    if (Np.test(e))
      return Vp(e);
    if (t = Date.parse(e), !isNaN(t)) return new Date(t);
  }
  return null;
}
const Wu = new Date(2e3, 0, 2);
function Tp(e, t) {
  const n = t ?? al[e.slice(-2).toUpperCase()] ?? 0;
  return Ka(7).map((o) => {
    const i = new Date(Wu);
    return i.setDate(Wu.getDate() + n + o), new Intl.DateTimeFormat(e, {
      weekday: "narrow"
    }).format(i);
  });
}
function Op(e, t, n, o) {
  const i = Of(e) ?? /* @__PURE__ */ new Date(), s = o == null ? void 0 : o[t];
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
      const a = i.getDate(), r = new Intl.DateTimeFormat(n, {
        month: "long"
      }).format(i);
      return `${a} ${r}`;
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
function Ap(e, t) {
  const n = e.toJsDate(t), o = n.getFullYear(), i = Vu(String(n.getMonth() + 1), 2, "0"), s = Vu(String(n.getDate()), 2, "0");
  return `${o}-${i}-${s}`;
}
function Ip(e) {
  const [t, n, o] = e.split("-").map(Number);
  return new Date(t, n - 1, o);
}
function Pp(e, t) {
  const n = new Date(e);
  return n.setMinutes(n.getMinutes() + t), n;
}
function Dp(e, t) {
  const n = new Date(e);
  return n.setHours(n.getHours() + t), n;
}
function $p(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}
function Mp(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t * 7), n;
}
function Fp(e, t) {
  const n = new Date(e);
  return n.setDate(1), n.setMonth(n.getMonth() + t), n;
}
function Bp(e) {
  return e.getFullYear();
}
function Lp(e) {
  return e.getMonth();
}
function Rp(e) {
  return e.getDate();
}
function Hp(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 1);
}
function jp(e) {
  return new Date(e.getFullYear(), e.getMonth() - 1, 1);
}
function zp(e) {
  return e.getHours();
}
function Up(e) {
  return e.getMinutes();
}
function Wp(e) {
  return new Date(e.getFullYear(), 0, 1);
}
function qp(e) {
  return new Date(e.getFullYear(), 11, 31);
}
function Gp(e, t) {
  return Rs(e, t[0]) && Xp(e, t[1]);
}
function Kp(e) {
  const t = new Date(e);
  return t instanceof Date && !isNaN(t.getTime());
}
function Rs(e, t) {
  return e.getTime() > t.getTime();
}
function Yp(e, t) {
  return Rs(da(e), da(t));
}
function Xp(e, t) {
  return e.getTime() < t.getTime();
}
function qu(e, t) {
  return e.getTime() === t.getTime();
}
function Jp(e, t) {
  return e.getDate() === t.getDate() && e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function Zp(e, t) {
  return e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function Qp(e, t) {
  return e.getFullYear() === t.getFullYear();
}
function eb(e, t, n) {
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
function tb(e, t) {
  const n = new Date(e);
  return n.setHours(t), n;
}
function nb(e, t) {
  const n = new Date(e);
  return n.setMinutes(t), n;
}
function ob(e, t) {
  const n = new Date(e);
  return n.setMonth(t), n;
}
function ib(e, t) {
  const n = new Date(e);
  return n.setDate(t), n;
}
function sb(e, t) {
  const n = new Date(e);
  return n.setFullYear(t), n;
}
function da(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
}
function lb(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
}
class ab {
  constructor(t) {
    this.locale = t.locale, this.formats = t.formats;
  }
  date(t) {
    return Of(t);
  }
  toJsDate(t) {
    return t;
  }
  toISO(t) {
    return Ap(this, t);
  }
  parseISO(t) {
    return Ip(t);
  }
  addMinutes(t, n) {
    return Pp(t, n);
  }
  addHours(t, n) {
    return Dp(t, n);
  }
  addDays(t, n) {
    return $p(t, n);
  }
  addWeeks(t, n) {
    return Mp(t, n);
  }
  addMonths(t, n) {
    return Fp(t, n);
  }
  getWeekArray(t, n) {
    return Cp(t, this.locale, n ? Number(n) : void 0);
  }
  startOfWeek(t, n) {
    return Ep(t, this.locale, n ? Number(n) : void 0);
  }
  endOfWeek(t) {
    return xp(t, this.locale);
  }
  startOfMonth(t) {
    return Nf(t);
  }
  endOfMonth(t) {
    return Tf(t);
  }
  format(t, n) {
    return Op(t, n, this.locale, this.formats);
  }
  isEqual(t, n) {
    return qu(t, n);
  }
  isValid(t) {
    return Kp(t);
  }
  isWithinRange(t, n) {
    return Gp(t, n);
  }
  isAfter(t, n) {
    return Rs(t, n);
  }
  isAfterDay(t, n) {
    return Yp(t, n);
  }
  isBefore(t, n) {
    return !Rs(t, n) && !qu(t, n);
  }
  isSameDay(t, n) {
    return Jp(t, n);
  }
  isSameMonth(t, n) {
    return Zp(t, n);
  }
  isSameYear(t, n) {
    return Qp(t, n);
  }
  setMinutes(t, n) {
    return nb(t, n);
  }
  setHours(t, n) {
    return tb(t, n);
  }
  setMonth(t, n) {
    return ob(t, n);
  }
  setDate(t, n) {
    return ib(t, n);
  }
  setYear(t, n) {
    return sb(t, n);
  }
  getDiff(t, n, o) {
    return eb(t, n, o);
  }
  getWeekdays(t) {
    return Tp(this.locale, t ? Number(t) : void 0);
  }
  getYear(t) {
    return Bp(t);
  }
  getMonth(t) {
    return Lp(t);
  }
  getDate(t) {
    return Rp(t);
  }
  getNextMonth(t) {
    return Hp(t);
  }
  getPreviousMonth(t) {
    return jp(t);
  }
  getHours(t) {
    return zp(t);
  }
  getMinutes(t) {
    return Up(t);
  }
  startOfDay(t) {
    return da(t);
  }
  endOfDay(t) {
    return lb(t);
  }
  startOfYear(t) {
    return Wp(t);
  }
  endOfYear(t) {
    return qp(t);
  }
}
const rb = Symbol.for("vuetify:date-options"), Gu = Symbol.for("vuetify:date-adapter");
function ub(e, t) {
  const n = wt({
    adapter: ab,
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
    instance: cb(n, t)
  };
}
function cb(e, t) {
  const n = ht(typeof e.adapter == "function" ? new e.adapter({
    locale: e.locale[t.current.value] ?? t.current.value,
    formats: e.formats
  }) : e.adapter);
  return ke(t.current, (o) => {
    n.locale = e.locale[o] ?? o ?? n.locale;
  }), n;
}
const rl = ["sm", "md", "lg", "xl", "xxl"], fa = Symbol.for("vuetify:display"), Ku = {
  mobileBreakpoint: "lg",
  thresholds: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
    xxl: 2560
  }
}, db = function() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : Ku;
  return wt(Ku, e);
};
function Yu(e) {
  return Ke && !e ? window.innerWidth : typeof e == "object" && e.clientWidth || 0;
}
function Xu(e) {
  return Ke && !e ? window.innerHeight : typeof e == "object" && e.clientHeight || 0;
}
function Ju(e) {
  const t = Ke && !e ? window.navigator.userAgent : "ssr";
  function n(m) {
    return !!t.match(m);
  }
  const o = n(/android/i), i = n(/iphone|ipad|ipod/i), s = n(/cordova/i), l = n(/electron/i), a = n(/chrome/i), r = n(/edge/i), f = n(/firefox/i), u = n(/opera/i), d = n(/win/i), v = n(/mac/i), h = n(/linux/i);
  return {
    android: o,
    ios: i,
    cordova: s,
    electron: l,
    chrome: a,
    edge: r,
    firefox: f,
    opera: u,
    win: d,
    mac: v,
    linux: h,
    touch: Ay,
    ssr: t === "ssr"
  };
}
function fb(e, t) {
  const {
    thresholds: n,
    mobileBreakpoint: o
  } = db(e), i = we(Xu(t)), s = we(Ju(t)), l = ht({}), a = we(Yu(t));
  function r() {
    i.value = Xu(), a.value = Yu();
  }
  function f() {
    r(), s.value = Ju();
  }
  return sn(() => {
    const u = a.value < n.sm, d = a.value < n.md && !u, v = a.value < n.lg && !(d || u), h = a.value < n.xl && !(v || d || u), m = a.value < n.xxl && !(h || v || d || u), g = a.value >= n.xxl, _ = u ? "xs" : d ? "sm" : v ? "md" : h ? "lg" : m ? "xl" : "xxl", S = typeof o == "number" ? o : n[o], N = a.value < S;
    l.xs = u, l.sm = d, l.md = v, l.lg = h, l.xl = m, l.xxl = g, l.smAndUp = !u, l.mdAndUp = !(u || d), l.lgAndUp = !(u || d || v), l.xlAndUp = !(u || d || v || h), l.smAndDown = !(v || h || m || g), l.mdAndDown = !(h || m || g), l.lgAndDown = !(m || g), l.xlAndDown = !g, l.name = _, l.height = i.value, l.width = a.value, l.mobile = N, l.mobileBreakpoint = o, l.platform = s.value, l.thresholds = n;
  }), Ke && window.addEventListener("resize", r, {
    passive: !0
  }), {
    ...Ia(l),
    update: f,
    ssr: !!t
  };
}
const mb = W({
  mobile: {
    type: Boolean,
    default: !1
  },
  mobileBreakpoint: [Number, String]
}, "display");
function Af() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  const n = je(fa);
  if (!n) throw new Error("Could not find Vuetify display injection");
  const o = b(() => {
    if (e.mobile != null) return e.mobile;
    if (!e.mobileBreakpoint) return n.mobile.value;
    const s = typeof e.mobileBreakpoint == "number" ? e.mobileBreakpoint : n.thresholds.value[e.mobileBreakpoint];
    return n.width.value < s;
  }), i = b(() => t ? {
    [`${t}--mobile`]: o.value
  } : {});
  return {
    ...n,
    displayClasses: i,
    mobile: o
  };
}
const If = Symbol.for("vuetify:goto");
function Pf() {
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
function vb(e) {
  return or(e) ?? (document.scrollingElement || document.body);
}
function or(e) {
  return typeof e == "string" ? document.querySelector(e) : Ya(e);
}
function Dl(e, t, n) {
  if (typeof e == "number") return t && n ? -e : e;
  let o = or(e), i = 0;
  for (; o; )
    i += t ? o.offsetLeft : o.offsetTop, o = o.offsetParent;
  return i;
}
function hb(e, t) {
  return {
    rtl: t.isRtl,
    options: wt(Pf(), e)
  };
}
async function Zu(e, t, n, o) {
  const i = n ? "scrollLeft" : "scrollTop", s = wt((o == null ? void 0 : o.options) ?? Pf(), t), l = o == null ? void 0 : o.rtl.value, a = (typeof e == "number" ? e : or(e)) ?? 0, r = s.container === "parent" && a instanceof HTMLElement ? a.parentElement : vb(s.container), f = typeof s.easing == "function" ? s.easing : s.patterns[s.easing];
  if (!f) throw new TypeError(`Easing function "${s.easing}" not found.`);
  let u;
  if (typeof a == "number")
    u = Dl(a, n, l);
  else if (u = Dl(a, n, l) - Dl(r, n, l), s.layout) {
    const m = window.getComputedStyle(a).getPropertyValue("--v-layout-top");
    m && (u -= parseInt(m, 10));
  }
  u += s.offset, u = yb(r, u, !!l, !!n);
  const d = r[i] ?? 0;
  if (u === d) return Promise.resolve(u);
  const v = performance.now();
  return new Promise((h) => requestAnimationFrame(function m(g) {
    const S = (g - v) / s.duration, N = Math.floor(d + (u - d) * f(Sn(S, 0, 1)));
    if (r[i] = N, S >= 1 && Math.abs(N - r[i]) < 10)
      return h(u);
    if (S > 2)
      return _n("Scroll target is not reachable"), h(r[i]);
    requestAnimationFrame(m);
  }));
}
function gb() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const t = je(If), {
    isRtl: n
  } = Bt();
  if (!t) throw new Error("[Vuetify] Could not find injected goto instance");
  const o = {
    ...t,
    // can be set via VLocaleProvider
    rtl: b(() => t.rtl.value || n.value)
  };
  async function i(s, l) {
    return Zu(s, wt(e, l), !1, o);
  }
  return i.horizontal = async (s, l) => Zu(s, wt(e, l), !0, o), i;
}
function yb(e, t, n, o) {
  const {
    scrollWidth: i,
    scrollHeight: s
  } = e, [l, a] = e === document.scrollingElement ? [window.innerWidth, window.innerHeight] : [e.offsetWidth, e.offsetHeight];
  let r, f;
  return o ? n ? (r = -(i - l), f = 0) : (r = 0, f = i - l) : (r = 0, f = s + -a), Math.max(Math.min(t, f), r);
}
const pb = {
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
}, bb = {
  // Not using mergeProps here, functional components merge props by default (?)
  component: (e) => so($f, {
    ...e,
    class: "mdi"
  })
}, We = [String, Function, Object, Array], ma = Symbol.for("vuetify:icons"), ul = W({
  icon: {
    type: We
  },
  // Could not remove this and use makeTagProps, types complained because it is not required
  tag: {
    type: String,
    required: !0
  }
}, "icon"), Qu = de()({
  name: "VComponentIcon",
  props: ul(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return () => {
      const o = e.icon;
      return c(e.tag, null, {
        default: () => {
          var i;
          return [e.icon ? c(o, null, null) : (i = n.default) == null ? void 0 : i.call(n)];
        }
      });
    };
  }
}), Df = ei({
  name: "VSvgIcon",
  inheritAttrs: !1,
  props: ul(),
  setup(e, t) {
    let {
      attrs: n
    } = t;
    return () => c(e.tag, xe(n, {
      style: null
    }), {
      default: () => [c("svg", {
        class: "v-icon__svg",
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        role: "img",
        "aria-hidden": "true"
      }, [Array.isArray(e.icon) ? e.icon.map((o) => Array.isArray(o) ? c("path", {
        d: o[0],
        "fill-opacity": o[1]
      }, null) : c("path", {
        d: o
      }, null)) : c("path", {
        d: e.icon
      }, null)])]
    });
  }
});
ei({
  name: "VLigatureIcon",
  props: ul(),
  setup(e) {
    return () => c(e.tag, null, {
      default: () => [e.icon]
    });
  }
});
const $f = ei({
  name: "VClassIcon",
  props: ul(),
  setup(e) {
    return () => c(e.tag, {
      class: e.icon
    }, null);
  }
});
function _b() {
  return {
    svg: {
      component: Df
    },
    class: {
      component: $f
    }
  };
}
function wb(e) {
  const t = _b(), n = (e == null ? void 0 : e.defaultSet) ?? "mdi";
  return n === "mdi" && !t.mdi && (t.mdi = bb), wt({
    defaultSet: n,
    sets: t,
    aliases: {
      ...pb,
      /* eslint-disable max-len */
      vuetify: ["M8.2241 14.2009L12 21L22 3H14.4459L8.2241 14.2009Z", ["M7.26303 12.4733L7.00113 12L2 3H12.5261C12.5261 3 12.5261 3 12.5261 3L7.26303 12.4733Z", 0.6]],
      "vuetify-outline": "svg:M7.26 12.47 12.53 3H2L7.26 12.47ZM14.45 3 8.22 14.2 12 21 22 3H14.45ZM18.6 5 12 16.88 10.51 14.2 15.62 5ZM7.26 8.35 5.4 5H9.13L7.26 8.35Z",
      "vuetify-play": ["m6.376 13.184-4.11-7.192C1.505 4.66 2.467 3 4.003 3h8.532l-.953 1.576-.006.01-.396.677c-.429.732-.214 1.507.194 2.015.404.503 1.092.878 1.869.806a3.72 3.72 0 0 1 1.005.022c.276.053.434.143.523.237.138.146.38.635-.25 2.09-.893 1.63-1.553 1.722-1.847 1.677-.213-.033-.468-.158-.756-.406a4.95 4.95 0 0 1-.8-.927c-.39-.564-1.04-.84-1.66-.846-.625-.006-1.316.27-1.693.921l-.478.826-.911 1.506Z", ["M9.093 11.552c.046-.079.144-.15.32-.148a.53.53 0 0 1 .43.207c.285.414.636.847 1.046 1.2.405.35.914.662 1.516.754 1.334.205 2.502-.698 3.48-2.495l.014-.028.013-.03c.687-1.574.774-2.852-.005-3.675-.37-.391-.861-.586-1.333-.676a5.243 5.243 0 0 0-1.447-.044c-.173.016-.393-.073-.54-.257-.145-.18-.127-.316-.082-.392l.393-.672L14.287 3h5.71c1.536 0 2.499 1.659 1.737 2.992l-7.997 13.996c-.768 1.344-2.706 1.344-3.473 0l-3.037-5.314 1.377-2.278.004-.006.004-.007.481-.831Z", 0.6]]
      /* eslint-enable max-len */
    }
  }, e);
}
const kb = (e) => {
  const t = je(ma);
  if (!t) throw new Error("Missing Vuetify Icons provide!");
  return {
    iconData: b(() => {
      var r;
      const o = vn(e);
      if (!o) return {
        component: Qu
      };
      let i = o;
      if (typeof i == "string" && (i = i.trim(), i.startsWith("$") && (i = (r = t.aliases) == null ? void 0 : r[i.slice(1)])), i || _n(`Could not find aliased icon "${o}"`), Array.isArray(i))
        return {
          component: Df,
          icon: i
        };
      if (typeof i != "string")
        return {
          component: Qu,
          icon: i
        };
      const s = Object.keys(t.sets).find((f) => typeof i == "string" && i.startsWith(`${f}:`)), l = s ? i.slice(s.length + 1) : i;
      return {
        component: t.sets[s ?? t.defaultSet].component,
        icon: l
      };
    })
  };
}, Ni = Symbol.for("vuetify:theme"), tt = W({
  theme: String
}, "theme");
function ec() {
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
function Sb() {
  var o, i;
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : ec();
  const t = ec();
  if (!e) return {
    ...t,
    isDisabled: !0
  };
  const n = {};
  for (const [s, l] of Object.entries(e.themes ?? {})) {
    const a = l.dark || s === "dark" ? (o = t.themes) == null ? void 0 : o.dark : (i = t.themes) == null ? void 0 : i.light;
    n[s] = wt(a, l);
  }
  return wt(t, {
    ...e,
    themes: n
  });
}
function Cb(e) {
  const t = Sb(e), n = se(t.defaultTheme), o = se(t.themes), i = b(() => {
    const u = {};
    for (const [d, v] of Object.entries(o.value)) {
      const h = u[d] = {
        ...v,
        colors: {
          ...v.colors
        }
      };
      if (t.variations)
        for (const m of t.variations.colors) {
          const g = h.colors[m];
          if (g)
            for (const _ of ["lighten", "darken"]) {
              const S = _ === "lighten" ? lp : ap;
              for (const N of Ka(t.variations[_], 1))
                h.colors[`${m}-${_}-${N}`] = op(S(hn(g), N));
            }
        }
      for (const m of Object.keys(h.colors)) {
        if (/^on-[a-z]/.test(m) || h.colors[`on-${m}`]) continue;
        const g = `on-${m}`, _ = hn(h.colors[m]);
        h.colors[g] = kf(_);
      }
    }
    return u;
  }), s = b(() => i.value[n.value]), l = b(() => {
    var m;
    const u = [];
    (m = s.value) != null && m.dark && go(u, ":root", ["color-scheme: dark"]), go(u, ":root", tc(s.value));
    for (const [g, _] of Object.entries(i.value))
      go(u, `.v-theme--${g}`, [`color-scheme: ${_.dark ? "dark" : "normal"}`, ...tc(_)]);
    const d = [], v = [], h = new Set(Object.values(i.value).flatMap((g) => Object.keys(g.colors)));
    for (const g of h)
      /^on-[a-z]/.test(g) ? go(v, `.${g}`, [`color: rgb(var(--v-theme-${g})) !important`]) : (go(d, `.bg-${g}`, [`--v-theme-overlay-multiplier: var(--v-theme-${g}-overlay-multiplier)`, `background-color: rgb(var(--v-theme-${g})) !important`, `color: rgb(var(--v-theme-on-${g})) !important`]), go(v, `.text-${g}`, [`color: rgb(var(--v-theme-${g})) !important`]), go(v, `.border-${g}`, [`--v-border-color: var(--v-theme-${g})`]));
    return u.push(...d, ...v), u.map((g, _) => _ === 0 ? g : `    ${g}`).join("");
  });
  function a() {
    return {
      style: [{
        children: l.value,
        id: "vuetify-theme-stylesheet",
        nonce: t.cspNonce || !1
      }]
    };
  }
  function r(u) {
    if (t.isDisabled) return;
    const d = u._context.provides.usehead;
    if (d)
      if (d.push) {
        const v = d.push(a);
        Ke && ke(l, () => {
          v.patch(a);
        });
      } else
        Ke ? (d.addHeadObjs(b(a)), sn(() => d.updateDOM())) : d.addHeadObjs(a());
    else {
      let h = function() {
        if (typeof document < "u" && !v) {
          const m = document.createElement("style");
          m.type = "text/css", m.id = "vuetify-theme-stylesheet", t.cspNonce && m.setAttribute("nonce", t.cspNonce), v = m, document.head.appendChild(v);
        }
        v && (v.innerHTML = l.value);
      }, v = Ke ? document.getElementById("vuetify-theme-stylesheet") : null;
      Ke ? ke(l, h, {
        immediate: !0
      }) : h();
    }
  }
  const f = b(() => t.isDisabled ? void 0 : `v-theme--${n.value}`);
  return {
    install: r,
    isDisabled: t.isDisabled,
    name: n,
    themes: o,
    current: s,
    computedThemes: i,
    themeClasses: f,
    styles: l,
    global: {
      name: n,
      current: s
    }
  };
}
function vt(e) {
  it("provideTheme");
  const t = je(Ni, null);
  if (!t) throw new Error("Could not find Vuetify theme injection");
  const n = b(() => e.theme ?? t.name.value), o = b(() => t.themes.value[n.value]), i = b(() => t.isDisabled ? void 0 : `v-theme--${n.value}`), s = {
    ...t,
    name: n,
    current: o,
    themeClasses: i
  };
  return yt(Ni, s), s;
}
function Mf() {
  it("useTheme");
  const e = je(Ni, null);
  if (!e) throw new Error("Could not find Vuetify theme injection");
  return e;
}
function go(e, t, n) {
  e.push(`${t} {
`, ...n.map((o) => `  ${o};
`), `}
`);
}
function tc(e) {
  const t = e.dark ? 2 : 1, n = e.dark ? 1 : 2, o = [];
  for (const [i, s] of Object.entries(e.colors)) {
    const l = hn(s);
    o.push(`--v-theme-${i}: ${l.r},${l.g},${l.b}`), i.startsWith("on-") || o.push(`--v-theme-${i}-overlay-multiplier: ${rp(s) > 0.18 ? t : n}`);
  }
  for (const [i, s] of Object.entries(e.variables)) {
    const l = typeof s == "string" && s.startsWith("#") ? hn(s) : void 0, a = l ? `${l.r}, ${l.g}, ${l.b}` : void 0;
    o.push(`--v-${i}: ${a ?? s}`);
  }
  return o;
}
function Hs(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "content";
  const n = ra(), o = se();
  if (Ke) {
    const i = new ResizeObserver((s) => {
      s.length && (t === "content" ? o.value = s[0].contentRect : o.value = s[0].target.getBoundingClientRect());
    });
    kt(() => {
      i.disconnect();
    }), ke(() => n.el, (s, l) => {
      l && (i.unobserve(l), o.value = void 0), s && i.observe(s);
    }, {
      flush: "post"
    });
  }
  return {
    resizeRef: n,
    contentRect: Bi(o)
  };
}
const Ti = Symbol.for("vuetify:layout"), Ff = Symbol.for("vuetify:layout-item"), nc = 1e3, Eb = W({
  overlaps: {
    type: Array,
    default: () => []
  },
  fullHeight: Boolean
}, "layout"), Bf = W({
  name: {
    type: String
  },
  order: {
    type: [Number, String],
    default: 0
  },
  absolute: Boolean
}, "layout-item");
function Lf() {
  const e = je(Ti);
  if (!e) throw new Error("[Vuetify] Could not find injected layout");
  return {
    getLayoutItem: e.getLayoutItem,
    mainRect: e.mainRect,
    mainStyles: e.mainStyles
  };
}
function Rf(e) {
  const t = je(Ti);
  if (!t) throw new Error("[Vuetify] Could not find injected layout");
  const n = e.id ?? `layout-item-${ln()}`, o = it("useLayoutItem");
  yt(Ff, {
    id: n
  });
  const i = we(!1);
  kd(() => i.value = !0), wd(() => i.value = !1);
  const {
    layoutItemStyles: s,
    layoutItemScrimStyles: l
  } = t.register(o, {
    ...e,
    active: b(() => i.value ? !1 : e.active.value),
    id: n
  });
  return kt(() => t.unregister(n)), {
    layoutItemStyles: s,
    layoutRect: t.layoutRect,
    layoutItemScrimStyles: l
  };
}
const xb = (e, t, n, o) => {
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
    const a = t.get(l), r = n.get(l), f = o.get(l);
    if (!a || !r || !f) continue;
    const u = {
      ...i,
      [a.value]: parseInt(i[a.value], 10) + (f.value ? parseInt(r.value, 10) : 0)
    };
    s.push({
      id: l,
      layer: u
    }), i = u;
  }
  return s;
};
function Vb(e) {
  const t = je(Ti, null), n = b(() => t ? t.rootZIndex.value - 100 : nc), o = se([]), i = ht(/* @__PURE__ */ new Map()), s = ht(/* @__PURE__ */ new Map()), l = ht(/* @__PURE__ */ new Map()), a = ht(/* @__PURE__ */ new Map()), r = ht(/* @__PURE__ */ new Map()), {
    resizeRef: f,
    contentRect: u
  } = Hs(), d = b(() => {
    const C = /* @__PURE__ */ new Map(), $ = e.overlaps ?? [];
    for (const V of $.filter((T) => T.includes(":"))) {
      const [T, D] = V.split(":");
      if (!o.value.includes(T) || !o.value.includes(D)) continue;
      const O = i.get(T), k = i.get(D), A = s.get(T), B = s.get(D);
      !O || !k || !A || !B || (C.set(D, {
        position: O.value,
        amount: parseInt(A.value, 10)
      }), C.set(T, {
        position: k.value,
        amount: -parseInt(B.value, 10)
      }));
    }
    return C;
  }), v = b(() => {
    const C = [...new Set([...l.values()].map((V) => V.value))].sort((V, T) => V - T), $ = [];
    for (const V of C) {
      const T = o.value.filter((D) => {
        var O;
        return ((O = l.get(D)) == null ? void 0 : O.value) === V;
      });
      $.push(...T);
    }
    return xb($, i, s, a);
  }), h = b(() => !Array.from(r.values()).some((C) => C.value)), m = b(() => v.value[v.value.length - 1].layer), g = b(() => ({
    "--v-layout-left": be(m.value.left),
    "--v-layout-right": be(m.value.right),
    "--v-layout-top": be(m.value.top),
    "--v-layout-bottom": be(m.value.bottom),
    ...h.value ? void 0 : {
      transition: "none"
    }
  })), _ = b(() => v.value.slice(1).map((C, $) => {
    let {
      id: V
    } = C;
    const {
      layer: T
    } = v.value[$], D = s.get(V), O = i.get(V);
    return {
      id: V,
      ...T,
      size: Number(D.value),
      position: O.value
    };
  })), S = (C) => _.value.find(($) => $.id === C), N = it("createLayout"), I = we(!1);
  Cn(() => {
    I.value = !0;
  }), yt(Ti, {
    register: (C, $) => {
      let {
        id: V,
        order: T,
        position: D,
        layoutSize: O,
        elementSize: k,
        active: A,
        disableTransitions: B,
        absolute: Q
      } = $;
      l.set(V, T), i.set(V, D), s.set(V, O), a.set(V, A), B && r.set(V, B);
      const ne = jo(Ff, N == null ? void 0 : N.vnode).indexOf(C);
      ne > -1 ? o.value.splice(ne, 0, V) : o.value.push(V);
      const J = b(() => _.value.findIndex((te) => te.id === V)), Ce = b(() => n.value + v.value.length * 2 - J.value * 2), K = b(() => {
        const te = D.value === "left" || D.value === "right", Oe = D.value === "right", qe = D.value === "bottom", Ge = k.value ?? O.value, oe = Ge === 0 ? "%" : "px", Ee = {
          [D.value]: 0,
          zIndex: Ce.value,
          transform: `translate${te ? "X" : "Y"}(${(A.value ? 0 : -(Ge === 0 ? 100 : Ge)) * (Oe || qe ? -1 : 1)}${oe})`,
          position: Q.value || n.value !== nc ? "absolute" : "fixed",
          ...h.value ? void 0 : {
            transition: "none"
          }
        };
        if (!I.value) return Ee;
        const Le = _.value[J.value];
        if (!Le) throw new Error(`[Vuetify] Could not find layout item "${V}"`);
        const nt = d.value.get(V);
        return nt && (Le[nt.position] += nt.amount), {
          ...Ee,
          height: te ? `calc(100% - ${Le.top}px - ${Le.bottom}px)` : k.value ? `${k.value}px` : void 0,
          left: Oe ? void 0 : `${Le.left}px`,
          right: Oe ? `${Le.right}px` : void 0,
          top: D.value !== "bottom" ? `${Le.top}px` : void 0,
          bottom: D.value !== "top" ? `${Le.bottom}px` : void 0,
          width: te ? k.value ? `${k.value}px` : void 0 : `calc(100% - ${Le.left}px - ${Le.right}px)`
        };
      }), X = b(() => ({
        zIndex: Ce.value - 1
      }));
      return {
        layoutItemStyles: K,
        layoutItemScrimStyles: X,
        zIndex: Ce
      };
    },
    unregister: (C) => {
      l.delete(C), i.delete(C), s.delete(C), a.delete(C), r.delete(C), o.value = o.value.filter(($) => $ !== C);
    },
    mainRect: m,
    mainStyles: g,
    getLayoutItem: S,
    items: _,
    layoutRect: u,
    rootZIndex: n
  });
  const P = b(() => ["v-layout", {
    "v-layout--full-height": e.fullHeight
  }]), x = b(() => ({
    zIndex: t ? n.value : void 0,
    position: t ? "relative" : void 0,
    overflow: t ? "hidden" : void 0
  }));
  return {
    layoutClasses: P,
    layoutStyles: x,
    getLayoutItem: S,
    items: _,
    layoutRect: u,
    layoutRef: f
  };
}
function Hf() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const {
    blueprint: t,
    ...n
  } = e, o = wt(t, n), {
    aliases: i = {},
    components: s = {},
    directives: l = {}
  } = o, a = cp(o.defaults), r = fb(o.display, o.ssr), f = Cb(o.theme), u = wb(o.icons), d = wp(o.locale), v = ub(o.date, d), h = hb(o.goTo, d);
  return {
    install: (g) => {
      for (const _ in l)
        g.directive(_, l[_]);
      for (const _ in s)
        g.component(_, s[_]);
      for (const _ in i)
        g.component(_, ei({
          ...i[_],
          name: _,
          aliasName: i[_].name
        }));
      if (f.install(g), g.provide(Jo, a), g.provide(fa, r), g.provide(Ni, f), g.provide(ma, u), g.provide(Ls, d), g.provide(rb, v.options), g.provide(Gu, v.instance), g.provide(If, h), Ke && o.ssr)
        if (g.$nuxt)
          g.$nuxt.hook("app:suspense:resolve", () => {
            r.update();
          });
        else {
          const {
            mount: _
          } = g;
          g.mount = function() {
            const S = _(...arguments);
            return at(() => r.update()), g.mount = _, S;
          };
        }
      ln.reset(), g.mixin({
        computed: {
          $vuetify() {
            return ht({
              defaults: Lo.call(this, Jo),
              display: Lo.call(this, fa),
              theme: Lo.call(this, Ni),
              icons: Lo.call(this, ma),
              locale: Lo.call(this, Ls),
              date: Lo.call(this, Gu)
            });
          }
        }
      });
    },
    defaults: a,
    display: r,
    theme: f,
    icons: u,
    locale: d,
    date: v,
    goTo: h
  };
}
const Nb = "3.7.4";
Hf.version = Nb;
function Lo(e) {
  var o, i;
  const t = this.$, n = ((o = t.parent) == null ? void 0 : o.provides) ?? ((i = t.vnode.appContext) == null ? void 0 : i.provides);
  if (n && e in n)
    return n[e];
}
const to = [
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
function Tn(e) {
  const t = to.find((n) => n.id === e);
  return t || (console.error(`[themes] 未找到主题 id="${e}"，已回退到「${to[0].name}」`), to[0]);
}
const Tb = Object.fromEntries(
  to.map((e) => [e.id, { dark: e.mode === "night", colors: { background: e.bg, surface: e.surface } }])
), Ob = Hf({
  theme: {
    defaultTheme: "white",
    themes: Tb
  }
}), Ab = {
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
      const a = new AbortController(), r = setTimeout(() => a.abort(), s.timeout || 1e4);
      return fetch(l, {
        ...s,
        signal: a.signal
      }).then((f) => {
        clearTimeout(r);
        var u = "";
        if (f.status === 413)
          throw u = "服务器响应了413异常状态码。<br/>可能是上传的文件过大，超过了服务器设置的上传大小。", e.$alert("error", u), u;
        if (f.status === 502)
          throw u = "服务器正在启动中...", e.$alert("info", u), u;
        try {
          return f.json().then((d) => (f.status !== 200, d));
        } catch {
          throw f.status !== 200 ? (u = "服务器异常，状态码: " + f.status + "<br/>请查阅服务器日志:<br/>talebook.log", e.$alert("error", u), u) : (u = "服务器异常，响应非JSON<br/>请查阅服务器日志:<br/>talebook.log", e.$alert("error", u), u);
        }
      }).then((f) => (f.err === "exception" && (e.$store ? e.$store.commit("alert", { type: "error", msg: f.msg, to: null }) : console.error("API 异常:", f.msg)), f)).catch((f) => {
        clearTimeout(r);
        var u = "";
        return f.name === "AbortError" ? u = "请求超时，请检查网络连接或服务器状态" : navigator.onLine ? u = "请求失败: " + (f.message || "未知错误") : u = "网络连接已断开，请检查网络设置", console.error("API请求失败:", f), { err: "network_error", msg: u, data: {} };
      });
    };
  }
};
function Ib(e, t) {
  e.use(Ob).use(Ab, t);
}
const Vn = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [o, i] of t)
    n[o] = i;
  return n;
}, Pb = sl("v-alert-title"), ao = W({
  border: [Boolean, Number, String]
}, "border");
function ro(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  return {
    borderClasses: b(() => {
      const o = Ue(e) ? e.value : e.border, i = [];
      if (o === !0 || o === "")
        i.push(`${t}--border`);
      else if (typeof o == "string" || o === 0)
        for (const s of String(o).split(" "))
          i.push(`border-${s}`);
      return i;
    })
  };
}
const Db = [null, "default", "comfortable", "compact"], Xt = W({
  density: {
    type: String,
    default: "default",
    validator: (e) => Db.includes(e)
  }
}, "density");
function an(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  return {
    densityClasses: b(() => `${t}--density-${e.density}`)
  };
}
const Hn = W({
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
function jn(e) {
  return {
    elevationClasses: b(() => {
      const n = Ue(e) ? e.value : e.elevation, o = [];
      return n == null || o.push(`elevation-${n}`), o;
    })
  };
}
const Nt = W({
  rounded: {
    type: [Boolean, Number, String],
    default: void 0
  },
  tile: Boolean
}, "rounded");
function Tt(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  return {
    roundedClasses: b(() => {
      const o = Ue(e) ? e.value : e.rounded, i = Ue(e) ? e.value : e.tile, s = [];
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
const Ze = W({
  tag: {
    type: String,
    default: "div"
  }
}, "tag");
function ir(e) {
  return Ja(() => {
    const t = [], n = {};
    if (e.value.background)
      if (ca(e.value.background)) {
        if (n.backgroundColor = e.value.background, !e.value.text && tp(e.value.background)) {
          const o = hn(e.value.background);
          if (o.a == null || o.a === 1) {
            const i = kf(o);
            n.color = i, n.caretColor = i;
          }
        }
      } else
        t.push(`bg-${e.value.background}`);
    return e.value.text && (ca(e.value.text) ? (n.color = e.value.text, n.caretColor = e.value.text) : t.push(`text-${e.value.text}`)), {
      colorClasses: t,
      colorStyles: n
    };
  });
}
function Mt(e, t) {
  const n = b(() => ({
    text: Ue(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: o,
    colorStyles: i
  } = ir(n);
  return {
    textColorClasses: o,
    textColorStyles: i
  };
}
function At(e, t) {
  const n = b(() => ({
    background: Ue(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: o,
    colorStyles: i
  } = ir(n);
  return {
    backgroundColorClasses: o,
    backgroundColorStyles: i
  };
}
const $b = ["elevated", "flat", "tonal", "outlined", "text", "plain"];
function ti(e, t) {
  return c(Ve, null, [e && c("span", {
    key: "overlay",
    class: `${t}__overlay`
  }, null), c("span", {
    key: "underlay",
    class: `${t}__underlay`
  }, null)]);
}
const uo = W({
  color: String,
  variant: {
    type: String,
    default: "elevated",
    validator: (e) => $b.includes(e)
  }
}, "variant");
function ni(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  const n = b(() => {
    const {
      variant: s
    } = vn(e);
    return `${t}--variant-${s}`;
  }), {
    colorClasses: o,
    colorStyles: i
  } = ir(b(() => {
    const {
      variant: s,
      color: l
    } = vn(e);
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
const jf = W({
  baseColor: String,
  divided: Boolean,
  ...ao(),
  ...Te(),
  ...Xt(),
  ...Hn(),
  ...Nt(),
  ...Ze(),
  ...tt(),
  ...uo()
}, "VBtnGroup"), zo = de()({
  name: "VBtnGroup",
  props: jf(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = vt(e), {
      densityClasses: i
    } = an(e), {
      borderClasses: s
    } = ro(e), {
      elevationClasses: l
    } = jn(e), {
      roundedClasses: a
    } = Tt(e);
    lo({
      VBtn: {
        height: "auto",
        baseColor: ae(e, "baseColor"),
        color: ae(e, "color"),
        density: ae(e, "density"),
        flat: !0,
        variant: ae(e, "variant")
      }
    }), _e(() => c(e.tag, {
      class: ["v-btn-group", {
        "v-btn-group--divided": e.divided
      }, o.value, s.value, i.value, l.value, a.value, e.class],
      style: e.style
    }, n));
  }
}), sr = W({
  modelValue: {
    type: null,
    default: void 0
  },
  multiple: Boolean,
  mandatory: [Boolean, String],
  max: Number,
  selectedClass: String,
  disabled: Boolean
}, "group"), zf = W({
  value: null,
  disabled: Boolean,
  selectedClass: String
}, "group-item");
function Uf(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0;
  const o = it("useGroupItem");
  if (!o)
    throw new Error("[Vuetify] useGroupItem composable must be used inside a component setup function");
  const i = ln();
  yt(Symbol.for(`${t.description}:id`), i);
  const s = je(t, null);
  if (!s) {
    if (!n) return s;
    throw new Error(`[Vuetify] Could not find useGroup injection with symbol ${t.description}`);
  }
  const l = ae(e, "value"), a = b(() => !!(s.disabled.value || e.disabled));
  s.register({
    id: i,
    value: l,
    disabled: a
  }, o), kt(() => {
    s.unregister(i);
  });
  const r = b(() => s.isSelected(i)), f = b(() => s.items.value[0].id === i), u = b(() => s.items.value[s.items.value.length - 1].id === i), d = b(() => r.value && [s.selectedClass.value, e.selectedClass]);
  return ke(r, (v) => {
    o.emit("group:selected", {
      value: v
    });
  }, {
    flush: "sync"
  }), {
    id: i,
    isSelected: r,
    isFirst: f,
    isLast: u,
    toggle: () => s.select(i, !r.value),
    select: (v) => s.select(i, v),
    selectedClass: d,
    value: l,
    disabled: a,
    group: s
  };
}
function cl(e, t) {
  let n = !1;
  const o = ht([]), i = Ye(e, "modelValue", [], (v) => v == null ? [] : Wf(o, bn(v)), (v) => {
    const h = Fb(o, v);
    return e.multiple ? h : h[0];
  }), s = it("useGroup");
  function l(v, h) {
    const m = v, g = Symbol.for(`${t.description}:id`), S = jo(g, s == null ? void 0 : s.vnode).indexOf(h);
    vn(m.value) == null && (m.value = S, m.useIndexAsValue = !0), S > -1 ? o.splice(S, 0, m) : o.push(m);
  }
  function a(v) {
    if (n) return;
    r();
    const h = o.findIndex((m) => m.id === v);
    o.splice(h, 1);
  }
  function r() {
    const v = o.find((h) => !h.disabled);
    v && e.mandatory === "force" && !i.value.length && (i.value = [v.id]);
  }
  Cn(() => {
    r();
  }), kt(() => {
    n = !0;
  }), Ba(() => {
    for (let v = 0; v < o.length; v++)
      o[v].useIndexAsValue && (o[v].value = v);
  });
  function f(v, h) {
    const m = o.find((g) => g.id === v);
    if (!(h && (m != null && m.disabled)))
      if (e.multiple) {
        const g = i.value.slice(), _ = g.findIndex((N) => N === v), S = ~_;
        if (h = h ?? !S, S && e.mandatory && g.length <= 1 || !S && e.max != null && g.length + 1 > e.max) return;
        _ < 0 && h ? g.push(v) : _ >= 0 && !h && g.splice(_, 1), i.value = g;
      } else {
        const g = i.value.includes(v);
        if (e.mandatory && g) return;
        i.value = h ?? !g ? [v] : [];
      }
  }
  function u(v) {
    if (e.multiple && _n('This method is not supported when using "multiple" prop'), i.value.length) {
      const h = i.value[0], m = o.findIndex((S) => S.id === h);
      let g = (m + v) % o.length, _ = o[g];
      for (; _.disabled && g !== m; )
        g = (g + v) % o.length, _ = o[g];
      if (_.disabled) return;
      i.value = [o[g].id];
    } else {
      const h = o.find((m) => !m.disabled);
      h && (i.value = [h.id]);
    }
  }
  const d = {
    register: l,
    unregister: a,
    selected: i,
    select: f,
    disabled: ae(e, "disabled"),
    prev: () => u(o.length - 1),
    next: () => u(1),
    isSelected: (v) => i.value.includes(v),
    selectedClass: b(() => e.selectedClass),
    items: b(() => o),
    getItemIndex: (v) => Mb(o, v)
  };
  return yt(t, d), d;
}
function Mb(e, t) {
  const n = Wf(e, [t]);
  return n.length ? e.findIndex((o) => o.id === n[0]) : -1;
}
function Wf(e, t) {
  const n = [];
  return t.forEach((o) => {
    const i = e.find((l) => zi(o, l.value)), s = e[o];
    (i == null ? void 0 : i.value) != null ? n.push(i.id) : s != null && n.push(s.id);
  }), n;
}
function Fb(e, t) {
  const n = [];
  return t.forEach((o) => {
    const i = e.findIndex((s) => s.id === o);
    if (~i) {
      const s = e[i];
      n.push(s.value != null ? s.value : i);
    }
  }), n;
}
const lr = Symbol.for("vuetify:v-btn-toggle"), Bb = W({
  ...jf(),
  ...sr()
}, "VBtnToggle");
de()({
  name: "VBtnToggle",
  props: Bb(),
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
      selected: a
    } = cl(e, lr);
    return _e(() => {
      const r = zo.filterProps(e);
      return c(zo, xe({
        class: ["v-btn-toggle", e.class]
      }, r, {
        style: e.style
      }), {
        default: () => {
          var f;
          return [(f = n.default) == null ? void 0 : f.call(n, {
            isSelected: o,
            next: i,
            prev: s,
            select: l,
            selected: a
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
const Lb = W({
  defaults: Object,
  disabled: Boolean,
  reset: [Number, String],
  root: [Boolean, String],
  scoped: Boolean
}, "VDefaultsProvider"), mt = de(!1)({
  name: "VDefaultsProvider",
  props: Lb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      defaults: o,
      disabled: i,
      reset: s,
      root: l,
      scoped: a
    } = Ia(e);
    return lo(o, {
      reset: s,
      root: l,
      scoped: a,
      disabled: i
    }), () => {
      var r;
      return (r = n.default) == null ? void 0 : r.call(n);
    };
  }
}), Rb = ["x-small", "small", "default", "large", "x-large"], dl = W({
  size: {
    type: [String, Number],
    default: "default"
  }
}, "size");
function fl(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  return Ja(() => {
    let n, o;
    return $s(Rb, e.size) ? n = `${t}--size-${e.size}` : e.size && (o = {
      width: be(e.size),
      height: be(e.size)
    }), {
      sizeClasses: n,
      sizeStyles: o
    };
  });
}
const Hb = W({
  color: String,
  disabled: Boolean,
  start: Boolean,
  end: Boolean,
  icon: We,
  ...Te(),
  ...dl(),
  ...Ze({
    tag: "i"
  }),
  ...tt()
}, "VIcon"), De = de()({
  name: "VIcon",
  props: Hb(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = se(), {
      themeClasses: s
    } = vt(e), {
      iconData: l
    } = kb(b(() => i.value || e.icon)), {
      sizeClasses: a
    } = fl(e), {
      textColorClasses: r,
      textColorStyles: f
    } = Mt(ae(e, "color"));
    return _e(() => {
      var v, h;
      const u = (v = o.default) == null ? void 0 : v.call(o);
      u && (i.value = (h = df(u).filter((m) => m.type === $o && m.children && typeof m.children == "string")[0]) == null ? void 0 : h.children);
      const d = !!(n.onClick || n.onClickOnce);
      return c(l.value.component, {
        tag: e.tag,
        icon: l.value.icon,
        class: ["v-icon", "notranslate", s.value, a.value, r.value, {
          "v-icon--clickable": d,
          "v-icon--disabled": e.disabled,
          "v-icon--start": e.start,
          "v-icon--end": e.end
        }, e.class],
        style: [a.value ? void 0 : {
          fontSize: be(e.size),
          height: be(e.size),
          width: be(e.size)
        }, f.value, e.style],
        role: d ? "button" : void 0,
        "aria-hidden": !d,
        tabindex: d ? e.disabled ? -1 : 0 : void 0
      }, {
        default: () => [u]
      });
    }), {};
  }
});
function qf(e, t) {
  const n = se(), o = we(!1);
  if (Ga) {
    const i = new IntersectionObserver((s) => {
      o.value = !!s.find((l) => l.isIntersecting);
    }, t);
    kt(() => {
      i.disconnect();
    }), ke(n, (s, l) => {
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
const jb = W({
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
  ...Te(),
  ...dl(),
  ...Ze({
    tag: "div"
  }),
  ...tt()
}, "VProgressCircular"), Gf = de()({
  name: "VProgressCircular",
  props: jb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = 20, i = 2 * Math.PI * o, s = se(), {
      themeClasses: l
    } = vt(e), {
      sizeClasses: a,
      sizeStyles: r
    } = fl(e), {
      textColorClasses: f,
      textColorStyles: u
    } = Mt(ae(e, "color")), {
      textColorClasses: d,
      textColorStyles: v
    } = Mt(ae(e, "bgColor")), {
      intersectionRef: h,
      isIntersecting: m
    } = qf(), {
      resizeRef: g,
      contentRect: _
    } = Hs(), S = b(() => Math.max(0, Math.min(100, parseFloat(e.modelValue)))), N = b(() => Number(e.width)), I = b(() => r.value ? Number(e.size) : _.value ? _.value.width : Math.max(N.value, 32)), P = b(() => o / (1 - N.value / I.value) * 2), x = b(() => N.value / I.value * P.value), C = b(() => be((100 - S.value) / 100 * i));
    return sn(() => {
      h.value = s.value, g.value = s.value;
    }), _e(() => c(e.tag, {
      ref: s,
      class: ["v-progress-circular", {
        "v-progress-circular--indeterminate": !!e.indeterminate,
        "v-progress-circular--visible": m.value,
        "v-progress-circular--disable-shrink": e.indeterminate === "disable-shrink"
      }, l.value, a.value, f.value, e.class],
      style: [r.value, u.value, e.style],
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": e.indeterminate ? void 0 : S.value
    }, {
      default: () => [c("svg", {
        style: {
          transform: `rotate(calc(-90deg + ${Number(e.rotate)}deg))`
        },
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: `0 0 ${P.value} ${P.value}`
      }, [c("circle", {
        class: ["v-progress-circular__underlay", d.value],
        style: v.value,
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: o,
        "stroke-width": x.value,
        "stroke-dasharray": i,
        "stroke-dashoffset": 0
      }, null), c("circle", {
        class: "v-progress-circular__overlay",
        fill: "transparent",
        cx: "50%",
        cy: "50%",
        r: o,
        "stroke-width": x.value,
        "stroke-dasharray": i,
        "stroke-dashoffset": C.value
      }, null)]), n.default && c("div", {
        class: "v-progress-circular__content"
      }, [n.default({
        value: S.value
      })])]
    })), {};
  }
}), zn = W({
  height: [Number, String],
  maxHeight: [Number, String],
  maxWidth: [Number, String],
  minHeight: [Number, String],
  minWidth: [Number, String],
  width: [Number, String]
}, "dimension");
function Un(e) {
  return {
    dimensionStyles: b(() => {
      const n = {}, o = be(e.height), i = be(e.maxHeight), s = be(e.maxWidth), l = be(e.minHeight), a = be(e.minWidth), r = be(e.width);
      return o != null && (n.height = o), i != null && (n.maxHeight = i), s != null && (n.maxWidth = s), l != null && (n.minHeight = l), a != null && (n.minWidth = a), r != null && (n.width = r), n;
    })
  };
}
const oc = {
  center: "center",
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
}, oi = W({
  location: String
}, "location");
function Ui(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, n = arguments.length > 2 ? arguments[2] : void 0;
  const {
    isRtl: o
  } = Bt();
  return {
    locationStyles: b(() => {
      if (!e.location) return {};
      const {
        side: s,
        align: l
      } = ua(e.location.split(" ").length > 1 ? e.location : `${e.location} center`, o.value);
      function a(f) {
        return n ? n(f) : 0;
      }
      const r = {};
      return s !== "center" && (t ? r[oc[s]] = `calc(100% - ${a(s)}px)` : r[s] = 0), l !== "center" ? t ? r[oc[l]] = `calc(100% - ${a(l)}px)` : r[l] = 0 : (s === "center" ? r.top = r.left = "50%" : r[{
        top: "left",
        bottom: "left",
        left: "top",
        right: "top"
      }[s]] = "50%", r.transform = {
        top: "translateX(-50%)",
        bottom: "translateX(-50%)",
        left: "translateY(-50%)",
        right: "translateY(-50%)",
        center: "translate(-50%, -50%)"
      }[s]), r;
    })
  };
}
const zb = W({
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
  ...Te(),
  ...oi({
    location: "top"
  }),
  ...Nt(),
  ...Ze(),
  ...tt()
}, "VProgressLinear"), ar = de()({
  name: "VProgressLinear",
  props: zb(),
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
      rtlClasses: s
    } = Bt(), {
      themeClasses: l
    } = vt(e), {
      locationStyles: a
    } = Ui(e), {
      textColorClasses: r,
      textColorStyles: f
    } = Mt(e, "color"), {
      backgroundColorClasses: u,
      backgroundColorStyles: d
    } = At(b(() => e.bgColor || e.color)), {
      backgroundColorClasses: v,
      backgroundColorStyles: h
    } = At(b(() => e.bufferColor || e.bgColor || e.color)), {
      backgroundColorClasses: m,
      backgroundColorStyles: g
    } = At(e, "color"), {
      roundedClasses: _
    } = Tt(e), {
      intersectionRef: S,
      isIntersecting: N
    } = qf(), I = b(() => parseFloat(e.max)), P = b(() => parseFloat(e.height)), x = b(() => Sn(parseFloat(e.bufferValue) / I.value * 100, 0, 100)), C = b(() => Sn(parseFloat(o.value) / I.value * 100, 0, 100)), $ = b(() => i.value !== e.reverse), V = b(() => e.indeterminate ? "fade-transition" : "slide-x-transition"), T = Ke && ((O = window.matchMedia) == null ? void 0 : O.call(window, "(forced-colors: active)").matches);
    function D(k) {
      if (!S.value) return;
      const {
        left: A,
        right: B,
        width: Q
      } = S.value.getBoundingClientRect(), re = $.value ? Q - k.clientX + (B - Q) : k.clientX - A;
      o.value = Math.round(re / Q * I.value);
    }
    return _e(() => c(e.tag, {
      ref: S,
      class: ["v-progress-linear", {
        "v-progress-linear--absolute": e.absolute,
        "v-progress-linear--active": e.active && N.value,
        "v-progress-linear--reverse": $.value,
        "v-progress-linear--rounded": e.rounded,
        "v-progress-linear--rounded-bar": e.roundedBar,
        "v-progress-linear--striped": e.striped
      }, _.value, l.value, s.value, e.class],
      style: [{
        bottom: e.location === "bottom" ? 0 : void 0,
        top: e.location === "top" ? 0 : void 0,
        height: e.active ? be(P.value) : 0,
        "--v-progress-linear-height": be(P.value),
        ...e.absolute ? a.value : {}
      }, e.style],
      role: "progressbar",
      "aria-hidden": e.active ? "false" : "true",
      "aria-valuemin": "0",
      "aria-valuemax": e.max,
      "aria-valuenow": e.indeterminate ? void 0 : C.value,
      onClick: e.clickable && D
    }, {
      default: () => [e.stream && c("div", {
        key: "stream",
        class: ["v-progress-linear__stream", r.value],
        style: {
          ...f.value,
          [$.value ? "left" : "right"]: be(-P.value),
          borderTop: `${be(P.value / 2)} dotted`,
          opacity: parseFloat(e.bufferOpacity),
          top: `calc(50% - ${be(P.value / 4)})`,
          width: be(100 - x.value, "%"),
          "--v-progress-linear-stream-to": be(P.value * ($.value ? 1 : -1))
        }
      }, null), c("div", {
        class: ["v-progress-linear__background", T ? void 0 : u.value],
        style: [d.value, {
          opacity: parseFloat(e.bgOpacity),
          width: e.stream ? 0 : void 0
        }]
      }, null), c("div", {
        class: ["v-progress-linear__buffer", T ? void 0 : v.value],
        style: [h.value, {
          opacity: parseFloat(e.bufferOpacity),
          width: be(x.value, "%")
        }]
      }, null), c(Do, {
        name: V.value
      }, {
        default: () => [e.indeterminate ? c("div", {
          class: "v-progress-linear__indeterminate"
        }, [["long", "short"].map((k) => c("div", {
          key: k,
          class: ["v-progress-linear__indeterminate", k, T ? void 0 : m.value],
          style: g.value
        }, null))]) : c("div", {
          class: ["v-progress-linear__determinate", T ? void 0 : m.value],
          style: [g.value, {
            width: be(C.value, "%")
          }]
        }, null)]
      }), n.default && c("div", {
        class: "v-progress-linear__content"
      }, [n.default({
        value: C.value,
        buffer: x.value
      })])]
    })), {};
  }
}), rr = W({
  loading: [Boolean, String]
}, "loader");
function ur(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  return {
    loaderClasses: b(() => ({
      [`${t}--loading`]: e.loading
    }))
  };
}
function Kf(e, t) {
  var o;
  let {
    slots: n
  } = t;
  return c("div", {
    class: `${e.name}__loader`
  }, [((o = n.default) == null ? void 0 : o.call(n, {
    color: e.color,
    isActive: e.active
  })) || c(ar, {
    absolute: e.absolute,
    active: e.active,
    color: e.color,
    height: "2",
    indeterminate: !0
  }, null)]);
}
const Ub = ["static", "relative", "fixed", "absolute", "sticky"], ml = W({
  position: {
    type: String,
    validator: (
      /* istanbul ignore next */
      (e) => Ub.includes(e)
    )
  }
}, "position");
function vl(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  return {
    positionClasses: b(() => e.position ? `${t}--${e.position}` : void 0)
  };
}
function Wb() {
  const e = it("useRoute");
  return b(() => {
    var t;
    return (t = e == null ? void 0 : e.proxy) == null ? void 0 : t.$route;
  });
}
function qb() {
  var e, t;
  return (t = (e = it("useRouter")) == null ? void 0 : e.proxy) == null ? void 0 : t.$router;
}
function cr(e, t) {
  var d, v;
  const n = zh("RouterLink"), o = b(() => !!(e.href || e.to)), i = b(() => (o == null ? void 0 : o.value) || Nu(t, "click") || Nu(e, "click"));
  if (typeof n == "string" || !("useLink" in n)) {
    const h = ae(e, "href");
    return {
      isLink: o,
      isClickable: i,
      href: h,
      linkProps: ht({
        href: h
      })
    };
  }
  const s = b(() => ({
    ...e,
    to: ae(() => e.to || "")
  })), l = n.useLink(s.value), a = b(() => e.to ? l : void 0), r = Wb(), f = b(() => {
    var h, m, g;
    return a.value ? e.exact ? r.value ? ((g = a.value.isExactActive) == null ? void 0 : g.value) && zi(a.value.route.value.query, r.value.query) : ((m = a.value.isExactActive) == null ? void 0 : m.value) ?? !1 : ((h = a.value.isActive) == null ? void 0 : h.value) ?? !1 : !1;
  }), u = b(() => {
    var h;
    return e.to ? (h = a.value) == null ? void 0 : h.route.value.href : e.href;
  });
  return {
    isLink: o,
    isClickable: i,
    isActive: f,
    route: (d = a.value) == null ? void 0 : d.route,
    navigate: (v = a.value) == null ? void 0 : v.navigate,
    href: u,
    linkProps: ht({
      href: u,
      "aria-current": b(() => f.value ? "page" : void 0)
    })
  };
}
const dr = W({
  href: String,
  replace: Boolean,
  to: [String, Object],
  exact: Boolean
}, "router");
let $l = !1;
function Gb(e, t) {
  let n = !1, o, i;
  Ke && (at(() => {
    window.addEventListener("popstate", s), o = e == null ? void 0 : e.beforeEach((l, a, r) => {
      $l ? n ? t(r) : r() : setTimeout(() => n ? t(r) : r()), $l = !0;
    }), i = e == null ? void 0 : e.afterEach(() => {
      $l = !1;
    });
  }), Ft(() => {
    window.removeEventListener("popstate", s), o == null || o(), i == null || i();
  }));
  function s(l) {
    var a;
    (a = l.state) != null && a.replaced || (n = !0, setTimeout(() => n = !1));
  }
}
function Kb(e, t) {
  ke(() => {
    var n;
    return (n = e.isActive) == null ? void 0 : n.value;
  }, (n) => {
    e.isLink.value && n && t && at(() => {
      t(!0);
    });
  }, {
    immediate: !0
  });
}
const va = Symbol("rippleStop"), Yb = 80;
function ic(e, t) {
  e.style.transform = t, e.style.webkitTransform = t;
}
function ha(e) {
  return e.constructor.name === "TouchEvent";
}
function Yf(e) {
  return e.constructor.name === "KeyboardEvent";
}
const Xb = function(e, t) {
  var d;
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, o = 0, i = 0;
  if (!Yf(e)) {
    const v = t.getBoundingClientRect(), h = ha(e) ? e.touches[e.touches.length - 1] : e;
    o = h.clientX - v.left, i = h.clientY - v.top;
  }
  let s = 0, l = 0.3;
  (d = t._ripple) != null && d.circle ? (l = 0.15, s = t.clientWidth / 2, s = n.center ? s : s + Math.sqrt((o - s) ** 2 + (i - s) ** 2) / 4) : s = Math.sqrt(t.clientWidth ** 2 + t.clientHeight ** 2) / 2;
  const a = `${(t.clientWidth - s * 2) / 2}px`, r = `${(t.clientHeight - s * 2) / 2}px`, f = n.center ? a : `${o - s}px`, u = n.center ? r : `${i - s}px`;
  return {
    radius: s,
    scale: l,
    x: f,
    y: u,
    centerX: a,
    centerY: r
  };
}, js = {
  /* eslint-disable max-statements */
  show(e, t) {
    var h;
    let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    if (!((h = t == null ? void 0 : t._ripple) != null && h.enabled))
      return;
    const o = document.createElement("span"), i = document.createElement("span");
    o.appendChild(i), o.className = "v-ripple__container", n.class && (o.className += ` ${n.class}`);
    const {
      radius: s,
      scale: l,
      x: a,
      y: r,
      centerX: f,
      centerY: u
    } = Xb(e, t, n), d = `${s * 2}px`;
    i.className = "v-ripple__animation", i.style.width = d, i.style.height = d, t.appendChild(o);
    const v = window.getComputedStyle(t);
    v && v.position === "static" && (t.style.position = "relative", t.dataset.previousPosition = "static"), i.classList.add("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--visible"), ic(i, `translate(${a}, ${r}) scale3d(${l},${l},${l})`), i.dataset.activated = String(performance.now()), setTimeout(() => {
      i.classList.remove("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--in"), ic(i, `translate(${f}, ${u}) scale3d(1,1,1)`);
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
        var a;
        e.getElementsByClassName("v-ripple__animation").length === 1 && e.dataset.previousPosition && (e.style.position = e.dataset.previousPosition, delete e.dataset.previousPosition), ((a = n.parentNode) == null ? void 0 : a.parentNode) === e && e.removeChild(n.parentNode);
      }, 300);
    }, i);
  }
};
function Xf(e) {
  return typeof e > "u" || !!e;
}
function Oi(e) {
  const t = {}, n = e.currentTarget;
  if (!(!(n != null && n._ripple) || n._ripple.touched || e[va])) {
    if (e[va] = !0, ha(e))
      n._ripple.touched = !0, n._ripple.isTouch = !0;
    else if (n._ripple.isTouch) return;
    if (t.center = n._ripple.centered || Yf(e), n._ripple.class && (t.class = n._ripple.class), ha(e)) {
      if (n._ripple.showTimerCommit) return;
      n._ripple.showTimerCommit = () => {
        js.show(e, n, t);
      }, n._ripple.showTimer = window.setTimeout(() => {
        var o;
        (o = n == null ? void 0 : n._ripple) != null && o.showTimerCommit && (n._ripple.showTimerCommit(), n._ripple.showTimerCommit = null);
      }, Yb);
    } else
      js.show(e, n, t);
  }
}
function sc(e) {
  e[va] = !0;
}
function Pt(e) {
  const t = e.currentTarget;
  if (t != null && t._ripple) {
    if (window.clearTimeout(t._ripple.showTimer), e.type === "touchend" && t._ripple.showTimerCommit) {
      t._ripple.showTimerCommit(), t._ripple.showTimerCommit = null, t._ripple.showTimer = window.setTimeout(() => {
        Pt(e);
      });
      return;
    }
    window.setTimeout(() => {
      t._ripple && (t._ripple.touched = !1);
    }), js.hide(t);
  }
}
function Jf(e) {
  const t = e.currentTarget;
  t != null && t._ripple && (t._ripple.showTimerCommit && (t._ripple.showTimerCommit = null), window.clearTimeout(t._ripple.showTimer));
}
let Ai = !1;
function Zf(e) {
  !Ai && (e.keyCode === Cu.enter || e.keyCode === Cu.space) && (Ai = !0, Oi(e));
}
function Qf(e) {
  Ai = !1, Pt(e);
}
function em(e) {
  Ai && (Ai = !1, Pt(e));
}
function tm(e, t, n) {
  const {
    value: o,
    modifiers: i
  } = t, s = Xf(o);
  if (s || js.hide(e), e._ripple = e._ripple ?? {}, e._ripple.enabled = s, e._ripple.centered = i.center, e._ripple.circle = i.circle, af(o) && o.class && (e._ripple.class = o.class), s && !n) {
    if (i.stop) {
      e.addEventListener("touchstart", sc, {
        passive: !0
      }), e.addEventListener("mousedown", sc);
      return;
    }
    e.addEventListener("touchstart", Oi, {
      passive: !0
    }), e.addEventListener("touchend", Pt, {
      passive: !0
    }), e.addEventListener("touchmove", Jf, {
      passive: !0
    }), e.addEventListener("touchcancel", Pt), e.addEventListener("mousedown", Oi), e.addEventListener("mouseup", Pt), e.addEventListener("mouseleave", Pt), e.addEventListener("keydown", Zf), e.addEventListener("keyup", Qf), e.addEventListener("blur", em), e.addEventListener("dragstart", Pt, {
      passive: !0
    });
  } else !s && n && nm(e);
}
function nm(e) {
  e.removeEventListener("mousedown", Oi), e.removeEventListener("touchstart", Oi), e.removeEventListener("touchend", Pt), e.removeEventListener("touchmove", Jf), e.removeEventListener("touchcancel", Pt), e.removeEventListener("mouseup", Pt), e.removeEventListener("mouseleave", Pt), e.removeEventListener("keydown", Zf), e.removeEventListener("keyup", Qf), e.removeEventListener("dragstart", Pt), e.removeEventListener("blur", em);
}
function Jb(e, t) {
  tm(e, t, !1);
}
function Zb(e) {
  delete e._ripple, nm(e);
}
function Qb(e, t) {
  if (t.value === t.oldValue)
    return;
  const n = Xf(t.oldValue);
  tm(e, t, n);
}
const Wi = {
  mounted: Jb,
  unmounted: Zb,
  updated: Qb
}, om = W({
  active: {
    type: Boolean,
    default: void 0
  },
  activeColor: String,
  baseColor: String,
  symbol: {
    type: null,
    default: lr
  },
  flat: Boolean,
  icon: [Boolean, String, Function, Object],
  prependIcon: We,
  appendIcon: We,
  block: Boolean,
  readonly: Boolean,
  slim: Boolean,
  stacked: Boolean,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  text: String,
  ...ao(),
  ...Te(),
  ...Xt(),
  ...zn(),
  ...Hn(),
  ...zf(),
  ...rr(),
  ...oi(),
  ...ml(),
  ...Nt(),
  ...dr(),
  ...dl(),
  ...Ze({
    tag: "button"
  }),
  ...tt(),
  ...uo({
    variant: "elevated"
  })
}, "VBtn"), ue = de()({
  name: "VBtn",
  props: om(),
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
    } = ro(e), {
      densityClasses: l
    } = an(e), {
      dimensionStyles: a
    } = Un(e), {
      elevationClasses: r
    } = jn(e), {
      loaderClasses: f
    } = ur(e), {
      locationStyles: u
    } = Ui(e), {
      positionClasses: d
    } = vl(e), {
      roundedClasses: v
    } = Tt(e), {
      sizeClasses: h,
      sizeStyles: m
    } = fl(e), g = Uf(e, e.symbol, !1), _ = cr(e, n), S = b(() => {
      var O;
      return e.active !== void 0 ? e.active : _.isLink.value ? (O = _.isActive) == null ? void 0 : O.value : g == null ? void 0 : g.isSelected.value;
    }), N = b(() => S.value ? e.activeColor ?? e.color : e.color), I = b(() => {
      var k, A;
      return {
        color: (g == null ? void 0 : g.isSelected.value) && (!_.isLink.value || ((k = _.isActive) == null ? void 0 : k.value)) || !g || ((A = _.isActive) == null ? void 0 : A.value) ? N.value ?? e.baseColor : e.baseColor,
        variant: e.variant
      };
    }), {
      colorClasses: P,
      colorStyles: x,
      variantClasses: C
    } = ni(I), $ = b(() => (g == null ? void 0 : g.disabled.value) || e.disabled), V = b(() => e.variant === "elevated" && !(e.disabled || e.flat || e.border)), T = b(() => {
      if (!(e.value === void 0 || typeof e.value == "symbol"))
        return Object(e.value) === e.value ? JSON.stringify(e.value, null, 0) : e.value;
    });
    function D(O) {
      var k;
      $.value || _.isLink.value && (O.metaKey || O.ctrlKey || O.shiftKey || O.button !== 0 || n.target === "_blank") || ((k = _.navigate) == null || k.call(_, O), g == null || g.toggle());
    }
    return Kb(_, g == null ? void 0 : g.select), _e(() => {
      const O = _.isLink.value ? "a" : e.tag, k = !!(e.prependIcon || o.prepend), A = !!(e.appendIcon || o.append), B = !!(e.icon && e.icon !== !0);
      return rt(c(O, xe({
        type: O === "a" ? void 0 : "button",
        class: ["v-btn", g == null ? void 0 : g.selectedClass.value, {
          "v-btn--active": S.value,
          "v-btn--block": e.block,
          "v-btn--disabled": $.value,
          "v-btn--elevated": V.value,
          "v-btn--flat": e.flat,
          "v-btn--icon": !!e.icon,
          "v-btn--loading": e.loading,
          "v-btn--readonly": e.readonly,
          "v-btn--slim": e.slim,
          "v-btn--stacked": e.stacked
        }, i.value, s.value, P.value, l.value, r.value, f.value, d.value, v.value, h.value, C.value, e.class],
        style: [x.value, a.value, u.value, m.value, e.style],
        "aria-busy": e.loading ? !0 : void 0,
        disabled: $.value || void 0,
        tabindex: e.loading || e.readonly ? -1 : void 0,
        onClick: D,
        value: T.value
      }, _.linkProps), {
        default: () => {
          var Q;
          return [ti(!0, "v-btn"), !e.icon && k && c("span", {
            key: "prepend",
            class: "v-btn__prepend"
          }, [o.prepend ? c(mt, {
            key: "prepend-defaults",
            disabled: !e.prependIcon,
            defaults: {
              VIcon: {
                icon: e.prependIcon
              }
            }
          }, o.prepend) : c(De, {
            key: "prepend-icon",
            icon: e.prependIcon
          }, null)]), c("span", {
            class: "v-btn__content",
            "data-no-activator": ""
          }, [!o.default && B ? c(De, {
            key: "content-icon",
            icon: e.icon
          }, null) : c(mt, {
            key: "content-defaults",
            disabled: !B,
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
          })]), !e.icon && A && c("span", {
            key: "append",
            class: "v-btn__append"
          }, [o.append ? c(mt, {
            key: "append-defaults",
            disabled: !e.appendIcon,
            defaults: {
              VIcon: {
                icon: e.appendIcon
              }
            }
          }, o.append) : c(De, {
            key: "append-icon",
            icon: e.appendIcon
          }, null)]), !!e.loading && c("span", {
            key: "loader",
            class: "v-btn__loader"
          }, [((Q = o.loader) == null ? void 0 : Q.call(o)) ?? c(Gf, {
            color: typeof e.loading == "boolean" ? void 0 : e.loading,
            indeterminate: !0,
            width: "2"
          }, null)])];
        }
      }), [[Wi, !$.value && e.ripple, "", {
        center: !!e.icon
      }]]);
    }), {
      group: g
    };
  }
}), e_ = ["success", "info", "warning", "error"], t_ = W({
  border: {
    type: [Boolean, String],
    validator: (e) => typeof e == "boolean" || ["top", "end", "bottom", "start"].includes(e)
  },
  borderColor: String,
  closable: Boolean,
  closeIcon: {
    type: We,
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
    validator: (e) => e_.includes(e)
  },
  ...Te(),
  ...Xt(),
  ...zn(),
  ...Hn(),
  ...oi(),
  ...ml(),
  ...Nt(),
  ...Ze(),
  ...tt(),
  ...uo({
    variant: "flat"
  })
}, "VAlert"), Uo = de()({
  name: "VAlert",
  props: t_(),
  emits: {
    "click:close": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      emit: n,
      slots: o
    } = t;
    const i = Ye(e, "modelValue"), s = b(() => {
      if (e.icon !== !1)
        return e.type ? e.icon ?? `$${e.type}` : e.icon;
    }), l = b(() => ({
      color: e.color ?? e.type,
      variant: e.variant
    })), {
      themeClasses: a
    } = vt(e), {
      colorClasses: r,
      colorStyles: f,
      variantClasses: u
    } = ni(l), {
      densityClasses: d
    } = an(e), {
      dimensionStyles: v
    } = Un(e), {
      elevationClasses: h
    } = jn(e), {
      locationStyles: m
    } = Ui(e), {
      positionClasses: g
    } = vl(e), {
      roundedClasses: _
    } = Tt(e), {
      textColorClasses: S,
      textColorStyles: N
    } = Mt(ae(e, "borderColor")), {
      t: I
    } = ll(), P = b(() => ({
      "aria-label": I(e.closeLabel),
      onClick(x) {
        i.value = !1, n("click:close", x);
      }
    }));
    return () => {
      const x = !!(o.prepend || s.value), C = !!(o.title || e.title), $ = !!(o.close || e.closable);
      return i.value && c(e.tag, {
        class: ["v-alert", e.border && {
          "v-alert--border": !!e.border,
          [`v-alert--border-${e.border === !0 ? "start" : e.border}`]: !0
        }, {
          "v-alert--prominent": e.prominent
        }, a.value, r.value, d.value, h.value, g.value, _.value, u.value, e.class],
        style: [f.value, v.value, m.value, e.style],
        role: "alert"
      }, {
        default: () => {
          var V, T;
          return [ti(!1, "v-alert"), e.border && c("div", {
            key: "border",
            class: ["v-alert__border", S.value],
            style: N.value
          }, null), x && c("div", {
            key: "prepend",
            class: "v-alert__prepend"
          }, [o.prepend ? c(mt, {
            key: "prepend-defaults",
            disabled: !s.value,
            defaults: {
              VIcon: {
                density: e.density,
                icon: s.value,
                size: e.prominent ? 44 : 28
              }
            }
          }, o.prepend) : c(De, {
            key: "prepend-icon",
            density: e.density,
            icon: s.value,
            size: e.prominent ? 44 : 28
          }, null)]), c("div", {
            class: "v-alert__content"
          }, [C && c(Pb, {
            key: "title"
          }, {
            default: () => {
              var D;
              return [((D = o.title) == null ? void 0 : D.call(o)) ?? e.title];
            }
          }), ((V = o.text) == null ? void 0 : V.call(o)) ?? e.text, (T = o.default) == null ? void 0 : T.call(o)]), o.append && c("div", {
            key: "append",
            class: "v-alert__append"
          }, [o.append()]), $ && c("div", {
            key: "close",
            class: "v-alert__close"
          }, [o.close ? c(mt, {
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
              var D;
              return [(D = o.close) == null ? void 0 : D.call(o, {
                props: P.value
              })];
            }
          }) : c(ue, xe({
            key: "close-btn",
            icon: e.closeIcon,
            size: "x-small",
            variant: "text"
          }, P.value), null)])];
        }
      });
    };
  }
}), Ao = de()({
  name: "VCardActions",
  props: Te(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return lo({
      VBtn: {
        slim: !0,
        variant: "text"
      }
    }), _e(() => {
      var o;
      return c("div", {
        class: ["v-card-actions", e.class],
        style: e.style
      }, [(o = n.default) == null ? void 0 : o.call(n)]);
    }), {};
  }
}), n_ = W({
  opacity: [Number, String],
  ...Te(),
  ...Ze()
}, "VCardSubtitle"), o_ = de()({
  name: "VCardSubtitle",
  props: n_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => c(e.tag, {
      class: ["v-card-subtitle", e.class],
      style: [{
        "--v-card-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), Qn = sl("v-card-title");
function i_(e) {
  return {
    aspectStyles: b(() => {
      const t = Number(e.aspectRatio);
      return t ? {
        paddingBottom: String(1 / t * 100) + "%"
      } : void 0;
    })
  };
}
const im = W({
  aspectRatio: [String, Number],
  contentClass: null,
  inline: Boolean,
  ...Te(),
  ...zn()
}, "VResponsive"), lc = de()({
  name: "VResponsive",
  props: im(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      aspectStyles: o
    } = i_(e), {
      dimensionStyles: i
    } = Un(e);
    return _e(() => {
      var s;
      return c("div", {
        class: ["v-responsive", {
          "v-responsive--inline": e.inline
        }, e.class],
        style: [i.value, e.style]
      }, [c("div", {
        class: "v-responsive__sizer",
        style: o.value
      }, null), (s = n.additional) == null ? void 0 : s.call(n), n.default && c("div", {
        class: ["v-responsive__content", e.contentClass]
      }, [n.default()])]);
    }), {};
  }
}), qi = W({
  transition: {
    type: [Boolean, String, Object],
    default: "fade-transition",
    validator: (e) => e !== !0
  }
}, "transition"), gn = (e, t) => {
  let {
    slots: n
  } = t;
  const {
    transition: o,
    disabled: i,
    group: s,
    ...l
  } = e, {
    component: a = s ? qa : Do,
    ...r
  } = typeof o == "object" ? o : {};
  return so(a, xe(typeof o == "string" ? {
    name: i ? "" : o
  } : r, typeof o == "string" ? {} : Object.fromEntries(Object.entries({
    disabled: i,
    group: s
  }).filter((f) => {
    let [u, d] = f;
    return d !== void 0;
  })), l), n);
};
function s_(e, t) {
  if (!Ga) return;
  const n = t.modifiers || {}, o = t.value, {
    handler: i,
    options: s
  } = typeof o == "object" ? o : {
    handler: o,
    options: {}
  }, l = new IntersectionObserver(function() {
    var d;
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], r = arguments.length > 1 ? arguments[1] : void 0;
    const f = (d = e._observe) == null ? void 0 : d[t.instance.$.uid];
    if (!f) return;
    const u = a.some((v) => v.isIntersecting);
    i && (!n.quiet || f.init) && (!n.once || u || f.init) && i(u, a, r), u && n.once ? sm(e, t) : f.init = !0;
  }, s);
  e._observe = Object(e._observe), e._observe[t.instance.$.uid] = {
    init: !1,
    observer: l
  }, l.observe(e);
}
function sm(e, t) {
  var o;
  const n = (o = e._observe) == null ? void 0 : o[t.instance.$.uid];
  n && (n.observer.unobserve(e), delete e._observe[t.instance.$.uid]);
}
const fr = {
  mounted: s_,
  unmounted: sm
}, l_ = W({
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
  ...im(),
  ...Te(),
  ...Nt(),
  ...qi()
}, "VImg"), mr = de()({
  name: "VImg",
  directives: {
    intersect: fr
  },
  props: l_(),
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
    } = At(ae(e, "color")), {
      roundedClasses: l
    } = Tt(e), a = it("VImg"), r = we(""), f = se(), u = we(e.eager ? "loading" : "idle"), d = we(), v = we(), h = b(() => e.src && typeof e.src == "object" ? {
      src: e.src.src,
      srcset: e.srcset || e.src.srcset,
      lazySrc: e.lazySrc || e.src.lazySrc,
      aspect: Number(e.aspectRatio || e.src.aspect || 0)
    } : {
      src: e.src,
      srcset: e.srcset,
      lazySrc: e.lazySrc,
      aspect: Number(e.aspectRatio || 0)
    }), m = b(() => h.value.aspect || d.value / v.value || 0);
    ke(() => e.src, () => {
      g(u.value !== "idle");
    }), ke(m, (k, A) => {
      !k && A && f.value && P(f.value);
    }), Fa(() => g());
    function g(k) {
      if (!(e.eager && k) && !(Ga && !k && !e.eager)) {
        if (u.value = "loading", h.value.lazySrc) {
          const A = new Image();
          A.src = h.value.lazySrc, P(A, null);
        }
        h.value.src && at(() => {
          var A;
          n("loadstart", ((A = f.value) == null ? void 0 : A.currentSrc) || h.value.src), setTimeout(() => {
            var B;
            if (!a.isUnmounted)
              if ((B = f.value) != null && B.complete) {
                if (f.value.naturalWidth || S(), u.value === "error") return;
                m.value || P(f.value, null), u.value === "loading" && _();
              } else
                m.value || P(f.value), N();
          });
        });
      }
    }
    function _() {
      var k;
      a.isUnmounted || (N(), P(f.value), u.value = "loaded", n("load", ((k = f.value) == null ? void 0 : k.currentSrc) || h.value.src));
    }
    function S() {
      var k;
      a.isUnmounted || (u.value = "error", n("error", ((k = f.value) == null ? void 0 : k.currentSrc) || h.value.src));
    }
    function N() {
      const k = f.value;
      k && (r.value = k.currentSrc || k.src);
    }
    let I = -1;
    kt(() => {
      clearTimeout(I);
    });
    function P(k) {
      let A = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 100;
      const B = () => {
        if (clearTimeout(I), a.isUnmounted) return;
        const {
          naturalHeight: Q,
          naturalWidth: re
        } = k;
        Q || re ? (d.value = re, v.value = Q) : !k.complete && u.value === "loading" && A != null ? I = window.setTimeout(B, A) : (k.currentSrc.endsWith(".svg") || k.currentSrc.startsWith("data:image/svg+xml")) && (d.value = 1, v.value = 1);
      };
      B();
    }
    const x = b(() => ({
      "v-img__img--cover": e.cover,
      "v-img__img--contain": !e.cover
    })), C = () => {
      var B;
      if (!h.value.src || u.value === "idle") return null;
      const k = c("img", {
        class: ["v-img__img", x.value],
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
        ref: f,
        onLoad: _,
        onError: S
      }, null), A = (B = o.sources) == null ? void 0 : B.call(o);
      return c(gn, {
        transition: e.transition,
        appear: !0
      }, {
        default: () => [rt(A ? c("picture", {
          class: "v-img__picture"
        }, [A, k]) : k, [[En, u.value === "loaded"]])]
      });
    }, $ = () => c(gn, {
      transition: e.transition
    }, {
      default: () => [h.value.lazySrc && u.value !== "loaded" && c("img", {
        class: ["v-img__img", "v-img__img--preload", x.value],
        style: {
          objectPosition: e.position
        },
        src: h.value.lazySrc,
        alt: e.alt,
        crossorigin: e.crossorigin,
        referrerpolicy: e.referrerpolicy,
        draggable: e.draggable
      }, null)]
    }), V = () => o.placeholder ? c(gn, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [(u.value === "loading" || u.value === "error" && !o.error) && c("div", {
        class: "v-img__placeholder"
      }, [o.placeholder()])]
    }) : null, T = () => o.error ? c(gn, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [u.value === "error" && c("div", {
        class: "v-img__error"
      }, [o.error()])]
    }) : null, D = () => e.gradient ? c("div", {
      class: "v-img__gradient",
      style: {
        backgroundImage: `linear-gradient(${e.gradient})`
      }
    }, null) : null, O = we(!1);
    {
      const k = ke(m, (A) => {
        A && (requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            O.value = !0;
          });
        }), k());
      });
    }
    return _e(() => {
      const k = lc.filterProps(e);
      return rt(c(lc, xe({
        class: ["v-img", {
          "v-img--absolute": e.absolute,
          "v-img--booting": !O.value
        }, i.value, l.value, e.class],
        style: [{
          width: be(e.width === "auto" ? d.value : e.width)
        }, s.value, e.style]
      }, k, {
        aspectRatio: m.value,
        "aria-label": e.alt,
        role: e.alt ? "img" : void 0
      }), {
        additional: () => c(Ve, null, [c(C, null, null), c($, null, null), c(D, null, null), c(V, null, null), c(T, null, null)]),
        default: o.default
      }), [[Rn("intersect"), {
        handler: g,
        options: e.options
      }, null, {
        once: !0
      }]]);
    }), {
      currentSrc: r,
      image: f,
      state: u,
      naturalWidth: d,
      naturalHeight: v
    };
  }
}), a_ = W({
  start: Boolean,
  end: Boolean,
  icon: We,
  image: String,
  text: String,
  ...ao(),
  ...Te(),
  ...Xt(),
  ...Nt(),
  ...dl(),
  ...Ze(),
  ...tt(),
  ...uo({
    variant: "flat"
  })
}, "VAvatar"), yn = de()({
  name: "VAvatar",
  props: a_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: o
    } = vt(e), {
      borderClasses: i
    } = ro(e), {
      colorClasses: s,
      colorStyles: l,
      variantClasses: a
    } = ni(e), {
      densityClasses: r
    } = an(e), {
      roundedClasses: f
    } = Tt(e), {
      sizeClasses: u,
      sizeStyles: d
    } = fl(e);
    return _e(() => c(e.tag, {
      class: ["v-avatar", {
        "v-avatar--start": e.start,
        "v-avatar--end": e.end
      }, o.value, i.value, s.value, r.value, f.value, u.value, a.value, e.class],
      style: [l.value, d.value, e.style]
    }, {
      default: () => [n.default ? c(mt, {
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
      }) : e.image ? c(mr, {
        key: "image",
        src: e.image,
        alt: "",
        cover: !0
      }, null) : e.icon ? c(De, {
        key: "icon",
        icon: e.icon
      }, null) : e.text, ti(!1, "v-avatar")]
    })), {};
  }
}), r_ = W({
  appendAvatar: String,
  appendIcon: We,
  prependAvatar: String,
  prependIcon: We,
  subtitle: [String, Number],
  title: [String, Number],
  ...Te(),
  ...Xt()
}, "VCardItem"), lm = de()({
  name: "VCardItem",
  props: r_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => {
      var f;
      const o = !!(e.prependAvatar || e.prependIcon), i = !!(o || n.prepend), s = !!(e.appendAvatar || e.appendIcon), l = !!(s || n.append), a = !!(e.title != null || n.title), r = !!(e.subtitle != null || n.subtitle);
      return c("div", {
        class: ["v-card-item", e.class],
        style: e.style
      }, [i && c("div", {
        key: "prepend",
        class: "v-card-item__prepend"
      }, [n.prepend ? c(mt, {
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
      }, n.prepend) : c(Ve, null, [e.prependAvatar && c(yn, {
        key: "prepend-avatar",
        density: e.density,
        image: e.prependAvatar
      }, null), e.prependIcon && c(De, {
        key: "prepend-icon",
        density: e.density,
        icon: e.prependIcon
      }, null)])]), c("div", {
        class: "v-card-item__content"
      }, [a && c(Qn, {
        key: "title"
      }, {
        default: () => {
          var u;
          return [((u = n.title) == null ? void 0 : u.call(n)) ?? e.title];
        }
      }), r && c(o_, {
        key: "subtitle"
      }, {
        default: () => {
          var u;
          return [((u = n.subtitle) == null ? void 0 : u.call(n)) ?? e.subtitle];
        }
      }), (f = n.default) == null ? void 0 : f.call(n)]), l && c("div", {
        key: "append",
        class: "v-card-item__append"
      }, [n.append ? c(mt, {
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
      }, n.append) : c(Ve, null, [e.appendIcon && c(De, {
        key: "append-icon",
        density: e.density,
        icon: e.appendIcon
      }, null), e.appendAvatar && c(yn, {
        key: "append-avatar",
        density: e.density,
        image: e.appendAvatar
      }, null)])])]);
    }), {};
  }
}), u_ = W({
  opacity: [Number, String],
  ...Te(),
  ...Ze()
}, "VCardText"), Ut = de()({
  name: "VCardText",
  props: u_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => c(e.tag, {
      class: ["v-card-text", e.class],
      style: [{
        "--v-card-text-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), c_ = W({
  appendAvatar: String,
  appendIcon: We,
  disabled: Boolean,
  flat: Boolean,
  hover: Boolean,
  image: String,
  link: {
    type: Boolean,
    default: void 0
  },
  prependAvatar: String,
  prependIcon: We,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  subtitle: [String, Number],
  text: [String, Number],
  title: [String, Number],
  ...ao(),
  ...Te(),
  ...Xt(),
  ...zn(),
  ...Hn(),
  ...rr(),
  ...oi(),
  ...ml(),
  ...Nt(),
  ...dr(),
  ...Ze(),
  ...tt(),
  ...uo({
    variant: "elevated"
  })
}, "VCard"), pt = de()({
  name: "VCard",
  directives: {
    Ripple: Wi
  },
  props: c_(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      themeClasses: i
    } = vt(e), {
      borderClasses: s
    } = ro(e), {
      colorClasses: l,
      colorStyles: a,
      variantClasses: r
    } = ni(e), {
      densityClasses: f
    } = an(e), {
      dimensionStyles: u
    } = Un(e), {
      elevationClasses: d
    } = jn(e), {
      loaderClasses: v
    } = ur(e), {
      locationStyles: h
    } = Ui(e), {
      positionClasses: m
    } = vl(e), {
      roundedClasses: g
    } = Tt(e), _ = cr(e, n), S = b(() => e.link !== !1 && _.isLink.value), N = b(() => !e.disabled && e.link !== !1 && (e.link || _.isClickable.value));
    return _e(() => {
      const I = S.value ? "a" : e.tag, P = !!(o.title || e.title != null), x = !!(o.subtitle || e.subtitle != null), C = P || x, $ = !!(o.append || e.appendAvatar || e.appendIcon), V = !!(o.prepend || e.prependAvatar || e.prependIcon), T = !!(o.image || e.image), D = C || V || $, O = !!(o.text || e.text != null);
      return rt(c(I, xe({
        class: ["v-card", {
          "v-card--disabled": e.disabled,
          "v-card--flat": e.flat,
          "v-card--hover": e.hover && !(e.disabled || e.flat),
          "v-card--link": N.value
        }, i.value, s.value, l.value, f.value, d.value, v.value, m.value, g.value, r.value, e.class],
        style: [a.value, u.value, h.value, e.style],
        onClick: N.value && _.navigate,
        tabindex: e.disabled ? -1 : void 0
      }, _.linkProps), {
        default: () => {
          var k;
          return [T && c("div", {
            key: "image",
            class: "v-card__image"
          }, [o.image ? c(mt, {
            key: "image-defaults",
            disabled: !e.image,
            defaults: {
              VImg: {
                cover: !0,
                src: e.image
              }
            }
          }, o.image) : c(mr, {
            key: "image-img",
            cover: !0,
            src: e.image
          }, null)]), c(Kf, {
            name: "v-card",
            active: !!e.loading,
            color: typeof e.loading == "boolean" ? void 0 : e.loading
          }, {
            default: o.loader
          }), D && c(lm, {
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
          }), O && c(Ut, {
            key: "text"
          }, {
            default: () => {
              var A;
              return [((A = o.text) == null ? void 0 : A.call(o)) ?? e.text];
            }
          }), (k = o.default) == null ? void 0 : k.call(o), o.actions && c(Ao, null, {
            default: o.actions
          }), ti(N.value, "v-card")];
        }
      }), [[Rn("ripple"), N.value && e.ripple]]);
    }), {};
  }
}), d_ = W({
  disabled: Boolean,
  group: Boolean,
  hideOnLeave: Boolean,
  leaveAbsolute: Boolean,
  mode: String,
  origin: String
}, "transition");
function Lt(e, t, n) {
  return de()({
    name: e,
    props: d_({
      mode: n,
      origin: t
    }),
    setup(o, i) {
      let {
        slots: s
      } = i;
      const l = {
        onBeforeEnter(a) {
          o.origin && (a.style.transformOrigin = o.origin);
        },
        onLeave(a) {
          if (o.leaveAbsolute) {
            const {
              offsetTop: r,
              offsetLeft: f,
              offsetWidth: u,
              offsetHeight: d
            } = a;
            a._transitionInitialStyles = {
              position: a.style.position,
              top: a.style.top,
              left: a.style.left,
              width: a.style.width,
              height: a.style.height
            }, a.style.position = "absolute", a.style.top = `${r}px`, a.style.left = `${f}px`, a.style.width = `${u}px`, a.style.height = `${d}px`;
          }
          o.hideOnLeave && a.style.setProperty("display", "none", "important");
        },
        onAfterLeave(a) {
          if (o.leaveAbsolute && (a != null && a._transitionInitialStyles)) {
            const {
              position: r,
              top: f,
              left: u,
              width: d,
              height: v
            } = a._transitionInitialStyles;
            delete a._transitionInitialStyles, a.style.position = r || "", a.style.top = f || "", a.style.left = u || "", a.style.width = d || "", a.style.height = v || "";
          }
        }
      };
      return () => {
        const a = o.group ? qa : Do;
        return so(a, {
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
function am(e, t) {
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
        slots: s
      } = i;
      const l = o.group ? qa : Do;
      return () => so(l, {
        name: o.disabled ? "" : e,
        css: !o.disabled,
        // mode: props.mode, // TODO: vuejs/vue-next#3104
        ...o.disabled ? {} : t
      }, s.default);
    }
  });
}
function rm() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  const n = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1) ? "width" : "height", o = gt(`offset-${n}`);
  return {
    onBeforeEnter(l) {
      l._parent = l.parentNode, l._initialStyle = {
        transition: l.style.transition,
        overflow: l.style.overflow,
        [n]: l.style[n]
      };
    },
    onEnter(l) {
      const a = l._initialStyle;
      l.style.setProperty("transition", "none", "important"), l.style.overflow = "hidden";
      const r = `${l[o]}px`;
      l.style[n] = "0", l.offsetHeight, l.style.transition = a.transition, e && l._parent && l._parent.classList.add(e), requestAnimationFrame(() => {
        l.style[n] = r;
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
    const a = l._initialStyle[n];
    l.style.overflow = l._initialStyle.overflow, a != null && (l.style[n] = a), delete l._initialStyle;
  }
}
const f_ = W({
  target: [Object, Array]
}, "v-dialog-transition"), m_ = de()({
  name: "VDialogTransition",
  props: f_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = {
      onBeforeEnter(i) {
        i.style.pointerEvents = "none", i.style.visibility = "hidden";
      },
      async onEnter(i, s) {
        var v;
        await new Promise((h) => requestAnimationFrame(h)), await new Promise((h) => requestAnimationFrame(h)), i.style.visibility = "";
        const {
          x: l,
          y: a,
          sx: r,
          sy: f,
          speed: u
        } = rc(e.target, i), d = ko(i, [{
          transform: `translate(${l}px, ${a}px) scale(${r}, ${f})`,
          opacity: 0
        }, {}], {
          duration: 225 * u,
          easing: mp
        });
        (v = ac(i)) == null || v.forEach((h) => {
          ko(h, [{
            opacity: 0
          }, {
            opacity: 0,
            offset: 0.33
          }, {}], {
            duration: 225 * 2 * u,
            easing: Vi
          });
        }), d.finished.then(() => s());
      },
      onAfterEnter(i) {
        i.style.removeProperty("pointer-events");
      },
      onBeforeLeave(i) {
        i.style.pointerEvents = "none";
      },
      async onLeave(i, s) {
        var v;
        await new Promise((h) => requestAnimationFrame(h));
        const {
          x: l,
          y: a,
          sx: r,
          sy: f,
          speed: u
        } = rc(e.target, i);
        ko(i, [{}, {
          transform: `translate(${l}px, ${a}px) scale(${r}, ${f})`,
          opacity: 0
        }], {
          duration: 125 * u,
          easing: vp
        }).finished.then(() => s()), (v = ac(i)) == null || v.forEach((h) => {
          ko(h, [{}, {
            opacity: 0,
            offset: 0.2
          }, {
            opacity: 0
          }], {
            duration: 125 * 2 * u,
            easing: Vi
          });
        });
      },
      onAfterLeave(i) {
        i.style.removeProperty("pointer-events");
      }
    };
    return () => e.target ? c(Do, xe({
      name: "dialog-transition"
    }, o, {
      css: !1
    }), n) : c(Do, {
      name: "dialog-transition"
    }, n);
  }
});
function ac(e) {
  var n;
  const t = (n = e.querySelector(":scope > .v-card, :scope > .v-sheet, :scope > .v-list")) == null ? void 0 : n.children;
  return t && [...t];
}
function rc(e, t) {
  const n = yf(e), o = Qa(t), [i, s] = getComputedStyle(t).transformOrigin.split(" ").map((S) => parseFloat(S)), [l, a] = getComputedStyle(t).getPropertyValue("--v-overlay-anchor-origin").split(" ");
  let r = n.left + n.width / 2;
  l === "left" || a === "left" ? r -= n.width / 2 : (l === "right" || a === "right") && (r += n.width / 2);
  let f = n.top + n.height / 2;
  l === "top" || a === "top" ? f -= n.height / 2 : (l === "bottom" || a === "bottom") && (f += n.height / 2);
  const u = n.width / o.width, d = n.height / o.height, v = Math.max(1, u, d), h = u / v || 0, m = d / v || 0, g = o.width * o.height / (window.innerWidth * window.innerHeight), _ = g > 0.12 ? Math.min(1.5, (g - 0.12) * 10 + 1) : 1;
  return {
    x: r - (i + o.left),
    y: f - (s + o.top),
    sx: h,
    sy: m,
    speed: _
  };
}
Lt("fab-transition", "center center", "out-in");
Lt("dialog-bottom-transition");
Lt("dialog-top-transition");
const uc = Lt("fade-transition"), v_ = Lt("scale-transition");
Lt("scroll-x-transition");
Lt("scroll-x-reverse-transition");
Lt("scroll-y-transition");
Lt("scroll-y-reverse-transition");
Lt("slide-x-transition");
Lt("slide-x-reverse-transition");
const um = Lt("slide-y-transition");
Lt("slide-y-reverse-transition");
const cm = am("expand-transition", rm()), h_ = am("expand-x-transition", rm("", !0)), ga = Symbol.for("vuetify:list");
function dm() {
  const e = je(ga, {
    hasPrepend: we(!1),
    updateHasPrepend: () => null
  }), t = {
    hasPrepend: we(!1),
    updateHasPrepend: (n) => {
      n && (t.hasPrepend.value = n);
    }
  };
  return yt(ga, t), e;
}
function fm() {
  return je(ga, null);
}
const vr = (e) => {
  const t = {
    activate: (n) => {
      let {
        id: o,
        value: i,
        activated: s
      } = n;
      return o = me(o), e && !i && s.size === 1 && s.has(o) || (i ? s.add(o) : s.delete(o)), s;
    },
    in: (n, o, i) => {
      let s = /* @__PURE__ */ new Set();
      if (n != null)
        for (const l of bn(n))
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
}, mm = (e) => {
  const t = vr(e);
  return {
    activate: (o) => {
      let {
        activated: i,
        id: s,
        ...l
      } = o;
      s = me(s);
      const a = i.has(s) ? /* @__PURE__ */ new Set([s]) : /* @__PURE__ */ new Set();
      return t.activate({
        ...l,
        id: s,
        activated: a
      });
    },
    in: (o, i, s) => {
      let l = /* @__PURE__ */ new Set();
      if (o != null) {
        const a = bn(o);
        a.length && (l = t.in(a.slice(0, 1), i, s));
      }
      return l;
    },
    out: (o, i, s) => t.out(o, i, s)
  };
}, g_ = (e) => {
  const t = vr(e);
  return {
    activate: (o) => {
      let {
        id: i,
        activated: s,
        children: l,
        ...a
      } = o;
      return i = me(i), l.has(i) ? s : t.activate({
        id: i,
        activated: s,
        children: l,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, y_ = (e) => {
  const t = mm(e);
  return {
    activate: (o) => {
      let {
        id: i,
        activated: s,
        children: l,
        ...a
      } = o;
      return i = me(i), l.has(i) ? s : t.activate({
        id: i,
        activated: s,
        children: l,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, p_ = {
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
}, vm = {
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
}, b_ = {
  open: vm.open,
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
}, hr = (e) => {
  const t = {
    select: (n) => {
      let {
        id: o,
        value: i,
        selected: s
      } = n;
      if (o = me(o), e && !i) {
        const l = Array.from(s.entries()).reduce((a, r) => {
          let [f, u] = r;
          return u === "on" && a.push(f), a;
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
}, hm = (e) => {
  const t = hr(e);
  return {
    select: (o) => {
      let {
        selected: i,
        id: s,
        ...l
      } = o;
      s = me(s);
      const a = i.has(s) ? /* @__PURE__ */ new Map([[s, i.get(s)]]) : /* @__PURE__ */ new Map();
      return t.select({
        ...l,
        id: s,
        selected: a
      });
    },
    in: (o, i, s) => {
      let l = /* @__PURE__ */ new Map();
      return o != null && o.length && (l = t.in(o.slice(0, 1), i, s)), l;
    },
    out: (o, i, s) => t.out(o, i, s)
  };
}, __ = (e) => {
  const t = hr(e);
  return {
    select: (o) => {
      let {
        id: i,
        selected: s,
        children: l,
        ...a
      } = o;
      return i = me(i), l.has(i) ? s : t.select({
        id: i,
        selected: s,
        children: l,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, w_ = (e) => {
  const t = hm(e);
  return {
    select: (o) => {
      let {
        id: i,
        selected: s,
        children: l,
        ...a
      } = o;
      return i = me(i), l.has(i) ? s : t.select({
        id: i,
        selected: s,
        children: l,
        ...a
      });
    },
    in: t.in,
    out: t.out
  };
}, k_ = (e) => {
  const t = {
    select: (n) => {
      let {
        id: o,
        value: i,
        selected: s,
        children: l,
        parents: a
      } = n;
      o = me(o);
      const r = new Map(s), f = [o];
      for (; f.length; ) {
        const d = f.shift();
        s.set(me(d), i ? "on" : "off"), l.has(d) && f.push(...l.get(d));
      }
      let u = me(a.get(o));
      for (; u; ) {
        const d = l.get(u), v = d.every((m) => s.get(me(m)) === "on"), h = d.every((m) => !s.has(me(m)) || s.get(me(m)) === "off");
        s.set(u, v ? "on" : h ? "off" : "indeterminate"), u = me(a.get(u));
      }
      return e && !i && Array.from(s.entries()).reduce((v, h) => {
        let [m, g] = h;
        return g === "on" && v.push(m), v;
      }, []).length === 0 ? r : s;
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
}, Ii = Symbol.for("vuetify:nested"), gm = {
  id: we(),
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
}, S_ = W({
  activatable: Boolean,
  selectable: Boolean,
  activeStrategy: [String, Function, Object],
  selectStrategy: [String, Function, Object],
  openStrategy: [String, Object],
  opened: null,
  activated: null,
  selected: null,
  mandatory: Boolean
}, "nested"), C_ = (e) => {
  let t = !1;
  const n = se(/* @__PURE__ */ new Map()), o = se(/* @__PURE__ */ new Map()), i = Ye(e, "opened", e.opened, (m) => new Set(m), (m) => [...m.values()]), s = b(() => {
    if (typeof e.activeStrategy == "object") return e.activeStrategy;
    if (typeof e.activeStrategy == "function") return e.activeStrategy(e.mandatory);
    switch (e.activeStrategy) {
      case "leaf":
        return g_(e.mandatory);
      case "single-leaf":
        return y_(e.mandatory);
      case "independent":
        return vr(e.mandatory);
      case "single-independent":
      default:
        return mm(e.mandatory);
    }
  }), l = b(() => {
    if (typeof e.selectStrategy == "object") return e.selectStrategy;
    if (typeof e.selectStrategy == "function") return e.selectStrategy(e.mandatory);
    switch (e.selectStrategy) {
      case "single-leaf":
        return w_(e.mandatory);
      case "leaf":
        return __(e.mandatory);
      case "independent":
        return hr(e.mandatory);
      case "single-independent":
        return hm(e.mandatory);
      case "classic":
      default:
        return k_(e.mandatory);
    }
  }), a = b(() => {
    if (typeof e.openStrategy == "object") return e.openStrategy;
    switch (e.openStrategy) {
      case "list":
        return b_;
      case "single":
        return p_;
      case "multiple":
      default:
        return vm;
    }
  }), r = Ye(e, "activated", e.activated, (m) => s.value.in(m, n.value, o.value), (m) => s.value.out(m, n.value, o.value)), f = Ye(e, "selected", e.selected, (m) => l.value.in(m, n.value, o.value), (m) => l.value.out(m, n.value, o.value));
  kt(() => {
    t = !0;
  });
  function u(m) {
    const g = [];
    let _ = m;
    for (; _ != null; )
      g.unshift(_), _ = o.value.get(_);
    return g;
  }
  const d = it("nested"), v = /* @__PURE__ */ new Set(), h = {
    id: we(),
    root: {
      opened: i,
      activatable: ae(e, "activatable"),
      selectable: ae(e, "selectable"),
      activated: r,
      selected: f,
      selectedValues: b(() => {
        const m = [];
        for (const [g, _] of f.value.entries())
          _ === "on" && m.push(g);
        return m;
      }),
      register: (m, g, _) => {
        if (v.has(m)) {
          const S = u(m).map(String).join(" -> "), N = u(g).concat(m).map(String).join(" -> ");
          Ms(`Multiple nodes with the same ID
	${S}
	${N}`);
          return;
        } else
          v.add(m);
        g && m !== g && o.value.set(m, g), _ && n.value.set(m, []), g != null && n.value.set(g, [...n.value.get(g) || [], m]);
      },
      unregister: (m) => {
        if (t) return;
        v.delete(m), n.value.delete(m);
        const g = o.value.get(m);
        if (g) {
          const _ = n.value.get(g) ?? [];
          n.value.set(g, _.filter((S) => S !== m));
        }
        o.value.delete(m);
      },
      open: (m, g, _) => {
        d.emit("click:open", {
          id: m,
          value: g,
          path: u(m),
          event: _
        });
        const S = a.value.open({
          id: m,
          value: g,
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        S && (i.value = S);
      },
      openOnSelect: (m, g, _) => {
        const S = a.value.select({
          id: m,
          value: g,
          selected: new Map(f.value),
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        S && (i.value = S);
      },
      select: (m, g, _) => {
        d.emit("click:select", {
          id: m,
          value: g,
          path: u(m),
          event: _
        });
        const S = l.value.select({
          id: m,
          value: g,
          selected: new Map(f.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        S && (f.value = S), h.root.openOnSelect(m, g, _);
      },
      activate: (m, g, _) => {
        if (!e.activatable)
          return h.root.select(m, !0, _);
        d.emit("click:activate", {
          id: m,
          value: g,
          path: u(m),
          event: _
        });
        const S = s.value.activate({
          id: m,
          value: g,
          activated: new Set(r.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        S && (r.value = S);
      },
      children: n,
      parents: o,
      getPath: u
    }
  };
  return yt(Ii, h), h.root;
}, ym = (e, t) => {
  const n = je(Ii, gm), o = Symbol(ln()), i = b(() => e.value !== void 0 ? e.value : o), s = {
    ...n,
    id: i,
    open: (l, a) => n.root.open(i.value, l, a),
    openOnSelect: (l, a) => n.root.openOnSelect(i.value, l, a),
    isOpen: b(() => n.root.opened.value.has(i.value)),
    parent: b(() => n.root.parents.value.get(i.value)),
    activate: (l, a) => n.root.activate(i.value, l, a),
    isActivated: b(() => n.root.activated.value.has(me(i.value))),
    select: (l, a) => n.root.select(i.value, l, a),
    isSelected: b(() => n.root.selected.value.get(me(i.value)) === "on"),
    isIndeterminate: b(() => n.root.selected.value.get(i.value) === "indeterminate"),
    isLeaf: b(() => !n.root.children.value.get(i.value)),
    isGroupActivator: n.isGroupActivator
  };
  return !n.isGroupActivator && n.root.register(i.value, n.id.value, t), kt(() => {
    !n.isGroupActivator && n.root.unregister(i.value);
  }), t && yt(Ii, s), s;
}, E_ = () => {
  const e = je(Ii, gm);
  yt(Ii, {
    ...e,
    isGroupActivator: !0
  });
};
function Gi() {
  const e = we(!1);
  return Cn(() => {
    window.requestAnimationFrame(() => {
      e.value = !0;
    });
  }), {
    ssrBootStyles: b(() => e.value ? void 0 : {
      transition: "none !important"
    }),
    isBooted: Bi(e)
  };
}
const x_ = ei({
  name: "VListGroupActivator",
  setup(e, t) {
    let {
      slots: n
    } = t;
    return E_(), () => {
      var o;
      return (o = n.default) == null ? void 0 : o.call(n);
    };
  }
}), V_ = W({
  /* @deprecated */
  activeColor: String,
  baseColor: String,
  color: String,
  collapseIcon: {
    type: We,
    default: "$collapse"
  },
  expandIcon: {
    type: We,
    default: "$expand"
  },
  prependIcon: We,
  appendIcon: We,
  fluid: Boolean,
  subgroup: Boolean,
  title: String,
  value: null,
  ...Te(),
  ...Ze()
}, "VListGroup"), zs = de()({
  name: "VListGroup",
  props: V_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isOpen: o,
      open: i,
      id: s
    } = ym(ae(e, "value"), !0), l = b(() => `v-list-group--id-${String(s.value)}`), a = fm(), {
      isBooted: r
    } = Gi();
    function f(h) {
      h.stopPropagation(), i(!o.value, h);
    }
    const u = b(() => ({
      onClick: f,
      class: "v-list-group__header",
      id: l.value
    })), d = b(() => o.value ? e.collapseIcon : e.expandIcon), v = b(() => ({
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
    return _e(() => c(e.tag, {
      class: ["v-list-group", {
        "v-list-group--prepend": a == null ? void 0 : a.hasPrepend.value,
        "v-list-group--fluid": e.fluid,
        "v-list-group--subgroup": e.subgroup,
        "v-list-group--open": o.value
      }, e.class],
      style: e.style
    }, {
      default: () => [n.activator && c(mt, {
        defaults: v.value
      }, {
        default: () => [c(x_, null, {
          default: () => [n.activator({
            props: u.value,
            isOpen: o.value
          })]
        })]
      }), c(gn, {
        transition: {
          component: cm
        },
        disabled: !r.value
      }, {
        default: () => {
          var h;
          return [rt(c("div", {
            class: "v-list-group__items",
            role: "group",
            "aria-labelledby": l.value
          }, [(h = n.default) == null ? void 0 : h.call(n)]), [[En, o.value]])];
        }
      })]
    })), {
      isOpen: o
    };
  }
}), N_ = W({
  opacity: [Number, String],
  ...Te(),
  ...Ze()
}, "VListItemSubtitle"), hl = de()({
  name: "VListItemSubtitle",
  props: N_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => c(e.tag, {
      class: ["v-list-item-subtitle", e.class],
      style: [{
        "--v-list-item-subtitle-opacity": e.opacity
      }, e.style]
    }, n)), {};
  }
}), Ki = sl("v-list-item-title"), T_ = W({
  active: {
    type: Boolean,
    default: void 0
  },
  activeClass: String,
  /* @deprecated */
  activeColor: String,
  appendAvatar: String,
  appendIcon: We,
  baseColor: String,
  disabled: Boolean,
  lines: [Boolean, String],
  link: {
    type: Boolean,
    default: void 0
  },
  nav: Boolean,
  prependAvatar: String,
  prependIcon: We,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  slim: Boolean,
  subtitle: [String, Number],
  title: [String, Number],
  value: null,
  onClick: Gt(),
  onClickOnce: Gt(),
  ...ao(),
  ...Te(),
  ...Xt(),
  ...zn(),
  ...Hn(),
  ...Nt(),
  ...dr(),
  ...Ze(),
  ...tt(),
  ...uo({
    variant: "text"
  })
}, "VListItem"), He = de()({
  name: "VListItem",
  directives: {
    Ripple: Wi
  },
  props: T_(),
  emits: {
    click: (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o,
      emit: i
    } = t;
    const s = cr(e, n), l = b(() => e.value === void 0 ? s.href.value : e.value), {
      activate: a,
      isActivated: r,
      select: f,
      isOpen: u,
      isSelected: d,
      isIndeterminate: v,
      isGroupActivator: h,
      root: m,
      parent: g,
      openOnSelect: _,
      id: S
    } = ym(l, !1), N = fm(), I = b(() => {
      var te;
      return e.active !== !1 && (e.active || ((te = s.isActive) == null ? void 0 : te.value) || (m.activatable.value ? r.value : d.value));
    }), P = b(() => e.link !== !1 && s.isLink.value), x = b(() => !e.disabled && e.link !== !1 && (e.link || s.isClickable.value || !!N && (m.selectable.value || m.activatable.value || e.value != null))), C = b(() => e.rounded || e.nav), $ = b(() => e.color ?? e.activeColor), V = b(() => ({
      color: I.value ? $.value ?? e.baseColor : e.baseColor,
      variant: e.variant
    }));
    ke(() => {
      var te;
      return (te = s.isActive) == null ? void 0 : te.value;
    }, (te) => {
      te && g.value != null && m.open(g.value, !0), te && _(te);
    }, {
      immediate: !0
    });
    const {
      themeClasses: T
    } = vt(e), {
      borderClasses: D
    } = ro(e), {
      colorClasses: O,
      colorStyles: k,
      variantClasses: A
    } = ni(V), {
      densityClasses: B
    } = an(e), {
      dimensionStyles: Q
    } = Un(e), {
      elevationClasses: re
    } = jn(e), {
      roundedClasses: ne
    } = Tt(C), J = b(() => e.lines ? `v-list-item--${e.lines}-line` : void 0), Ce = b(() => ({
      isActive: I.value,
      select: f,
      isOpen: u.value,
      isSelected: d.value,
      isIndeterminate: v.value
    }));
    function K(te) {
      var Oe;
      i("click", te), x.value && ((Oe = s.navigate) == null || Oe.call(s, te), !h && (m.activatable.value ? a(!r.value, te) : (m.selectable.value || e.value != null) && f(!d.value, te)));
    }
    function X(te) {
      (te.key === "Enter" || te.key === " ") && (te.preventDefault(), te.target.dispatchEvent(new MouseEvent("click", te)));
    }
    return _e(() => {
      const te = P.value ? "a" : e.tag, Oe = o.title || e.title != null, qe = o.subtitle || e.subtitle != null, Ge = !!(e.appendAvatar || e.appendIcon), oe = !!(Ge || o.append), Ee = !!(e.prependAvatar || e.prependIcon), Le = !!(Ee || o.prepend);
      return N == null || N.updateHasPrepend(Le), e.activeColor && Ky("active-color", ["color", "base-color"]), rt(c(te, xe({
        class: ["v-list-item", {
          "v-list-item--active": I.value,
          "v-list-item--disabled": e.disabled,
          "v-list-item--link": x.value,
          "v-list-item--nav": e.nav,
          "v-list-item--prepend": !Le && (N == null ? void 0 : N.hasPrepend.value),
          "v-list-item--slim": e.slim,
          [`${e.activeClass}`]: e.activeClass && I.value
        }, T.value, D.value, O.value, B.value, re.value, J.value, ne.value, A.value, e.class],
        style: [k.value, Q.value, e.style],
        tabindex: x.value ? N ? -2 : 0 : void 0,
        "aria-selected": m.activatable.value ? r.value : d.value,
        onClick: K,
        onKeydown: x.value && !P.value && X
      }, s.linkProps), {
        default: () => {
          var nt;
          return [ti(x.value || I.value, "v-list-item"), Le && c("div", {
            key: "prepend",
            class: "v-list-item__prepend"
          }, [o.prepend ? c(mt, {
            key: "prepend-defaults",
            disabled: !Ee,
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
              var Qe;
              return [(Qe = o.prepend) == null ? void 0 : Qe.call(o, Ce.value)];
            }
          }) : c(Ve, null, [e.prependAvatar && c(yn, {
            key: "prepend-avatar",
            density: e.density,
            image: e.prependAvatar
          }, null), e.prependIcon && c(De, {
            key: "prepend-icon",
            density: e.density,
            icon: e.prependIcon
          }, null)]), c("div", {
            class: "v-list-item__spacer"
          }, null)]), c("div", {
            class: "v-list-item__content",
            "data-no-activator": ""
          }, [Oe && c(Ki, {
            key: "title"
          }, {
            default: () => {
              var Qe;
              return [((Qe = o.title) == null ? void 0 : Qe.call(o, {
                title: e.title
              })) ?? e.title];
            }
          }), qe && c(hl, {
            key: "subtitle"
          }, {
            default: () => {
              var Qe;
              return [((Qe = o.subtitle) == null ? void 0 : Qe.call(o, {
                subtitle: e.subtitle
              })) ?? e.subtitle];
            }
          }), (nt = o.default) == null ? void 0 : nt.call(o, Ce.value)]), oe && c("div", {
            key: "append",
            class: "v-list-item__append"
          }, [o.append ? c(mt, {
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
              var Qe;
              return [(Qe = o.append) == null ? void 0 : Qe.call(o, Ce.value)];
            }
          }) : c(Ve, null, [e.appendIcon && c(De, {
            key: "append-icon",
            density: e.density,
            icon: e.appendIcon
          }, null), e.appendAvatar && c(yn, {
            key: "append-avatar",
            density: e.density,
            image: e.appendAvatar
          }, null)]), c("div", {
            class: "v-list-item__spacer"
          }, null)])];
        }
      }), [[Rn("ripple"), x.value && e.ripple]]);
    }), {
      activate: a,
      isActivated: r,
      isGroupActivator: h,
      isSelected: d,
      list: N,
      select: f,
      root: m,
      id: S
    };
  }
}), O_ = W({
  color: String,
  inset: Boolean,
  sticky: Boolean,
  title: String,
  ...Te(),
  ...Ze()
}, "VListSubheader"), A_ = de()({
  name: "VListSubheader",
  props: O_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      textColorClasses: o,
      textColorStyles: i
    } = Mt(ae(e, "color"));
    return _e(() => {
      const s = !!(n.default || e.title);
      return c(e.tag, {
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
          return [s && c("div", {
            class: "v-list-subheader__text"
          }, [((l = n.default) == null ? void 0 : l.call(n)) ?? e.title])];
        }
      });
    }), {};
  }
}), I_ = W({
  color: String,
  inset: Boolean,
  length: [Number, String],
  opacity: [Number, String],
  thickness: [Number, String],
  vertical: Boolean,
  ...Te(),
  ...tt()
}, "VDivider"), en = de()({
  name: "VDivider",
  props: I_(),
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
    } = Mt(ae(e, "color")), a = b(() => {
      const r = {};
      return e.length && (r[e.vertical ? "height" : "width"] = be(e.length)), e.thickness && (r[e.vertical ? "borderRightWidth" : "borderTopWidth"] = be(e.thickness)), r;
    });
    return _e(() => {
      const r = c("hr", {
        class: [{
          "v-divider": !0,
          "v-divider--inset": e.inset,
          "v-divider--vertical": e.vertical
        }, i.value, s.value, e.class],
        style: [a.value, l.value, {
          "--v-border-opacity": e.opacity
        }, e.style],
        "aria-orientation": !n.role || n.role === "separator" ? e.vertical ? "vertical" : "horizontal" : void 0,
        role: `${n.role || "separator"}`
      }, null);
      return o.default ? c("div", {
        class: ["v-divider__wrapper", {
          "v-divider__wrapper--vertical": e.vertical,
          "v-divider__wrapper--inset": e.inset
        }]
      }, [r, c("div", {
        class: "v-divider__content"
      }, [o.default()]), r]) : r;
    }), {};
  }
}), P_ = W({
  items: Array,
  returnObject: Boolean
}, "VListChildren"), pm = de()({
  name: "VListChildren",
  props: P_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return dm(), () => {
      var o, i;
      return ((o = n.default) == null ? void 0 : o.call(n)) ?? ((i = e.items) == null ? void 0 : i.map((s) => {
        var v, h;
        let {
          children: l,
          props: a,
          type: r,
          raw: f
        } = s;
        if (r === "divider")
          return ((v = n.divider) == null ? void 0 : v.call(n, {
            props: a
          })) ?? c(en, a, null);
        if (r === "subheader")
          return ((h = n.subheader) == null ? void 0 : h.call(n, {
            props: a
          })) ?? c(A_, a, null);
        const u = {
          subtitle: n.subtitle ? (m) => {
            var g;
            return (g = n.subtitle) == null ? void 0 : g.call(n, {
              ...m,
              item: f
            });
          } : void 0,
          prepend: n.prepend ? (m) => {
            var g;
            return (g = n.prepend) == null ? void 0 : g.call(n, {
              ...m,
              item: f
            });
          } : void 0,
          append: n.append ? (m) => {
            var g;
            return (g = n.append) == null ? void 0 : g.call(n, {
              ...m,
              item: f
            });
          } : void 0,
          title: n.title ? (m) => {
            var g;
            return (g = n.title) == null ? void 0 : g.call(n, {
              ...m,
              item: f
            });
          } : void 0
        }, d = zs.filterProps(a);
        return l ? c(zs, xe({
          value: a == null ? void 0 : a.value
        }, d), {
          activator: (m) => {
            let {
              props: g
            } = m;
            const _ = {
              ...a,
              ...g,
              value: e.returnObject ? f : a.value
            };
            return n.header ? n.header({
              props: _
            }) : c(He, _, u);
          },
          default: () => c(pm, {
            items: l,
            returnObject: e.returnObject
          }, n)
        }) : n.item ? n.item({
          props: a
        }) : c(He, xe(a, {
          value: e.returnObject ? f : a.value
        }), u);
      }));
    };
  }
}), D_ = W({
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
    default: zi
  }
}, "list-items");
function $_(e) {
  return typeof e == "string" || typeof e == "number" || typeof e == "boolean";
}
function M_(e, t) {
  const n = ui(t, e.itemType, "item"), o = $_(t) ? t : ui(t, e.itemTitle), i = ui(t, e.itemValue, void 0), s = ui(t, e.itemChildren), l = e.itemProps === !0 ? Mo(t, ["children"]) : ui(t, e.itemProps), a = {
    title: o,
    value: i,
    ...l
  };
  return {
    type: n,
    title: a.title,
    value: a.value,
    props: a,
    children: n === "item" && s ? bm(e, s) : void 0,
    raw: t
  };
}
function bm(e, t) {
  const n = [];
  for (const o of t)
    n.push(M_(e, o));
  return n;
}
function F_(e) {
  return {
    items: b(() => bm(e, e.items))
  };
}
const B_ = W({
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
  "onClick:open": Gt(),
  "onClick:select": Gt(),
  "onUpdate:opened": Gt(),
  ...S_({
    selectStrategy: "single-leaf",
    openStrategy: "list"
  }),
  ...ao(),
  ...Te(),
  ...Xt(),
  ...zn(),
  ...Hn(),
  itemType: {
    type: String,
    default: "type"
  },
  ...D_(),
  ...Nt(),
  ...Ze(),
  ...tt(),
  ...uo({
    variant: "text"
  })
}, "VList"), wn = de()({
  name: "VList",
  props: B_(),
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
    } = F_(e), {
      themeClasses: i
    } = vt(e), {
      backgroundColorClasses: s,
      backgroundColorStyles: l
    } = At(ae(e, "bgColor")), {
      borderClasses: a
    } = ro(e), {
      densityClasses: r
    } = an(e), {
      dimensionStyles: f
    } = Un(e), {
      elevationClasses: u
    } = jn(e), {
      roundedClasses: d
    } = Tt(e), {
      children: v,
      open: h,
      parents: m,
      select: g,
      getPath: _
    } = C_(e), S = b(() => e.lines ? `v-list--${e.lines}-line` : void 0), N = ae(e, "activeColor"), I = ae(e, "baseColor"), P = ae(e, "color");
    dm(), lo({
      VListGroup: {
        activeColor: N,
        baseColor: I,
        color: P,
        expandIcon: ae(e, "expandIcon"),
        collapseIcon: ae(e, "collapseIcon")
      },
      VListItem: {
        activeClass: ae(e, "activeClass"),
        activeColor: N,
        baseColor: I,
        color: P,
        density: ae(e, "density"),
        disabled: ae(e, "disabled"),
        lines: ae(e, "lines"),
        nav: ae(e, "nav"),
        slim: ae(e, "slim"),
        variant: ae(e, "variant")
      }
    });
    const x = we(!1), C = se();
    function $(A) {
      x.value = !0;
    }
    function V(A) {
      x.value = !1;
    }
    function T(A) {
      var B;
      !x.value && !(A.relatedTarget && ((B = C.value) != null && B.contains(A.relatedTarget))) && k();
    }
    function D(A) {
      const B = A.target;
      if (!(!C.value || ["INPUT", "TEXTAREA"].includes(B.tagName))) {
        if (A.key === "ArrowDown")
          k("next");
        else if (A.key === "ArrowUp")
          k("prev");
        else if (A.key === "Home")
          k("first");
        else if (A.key === "End")
          k("last");
        else
          return;
        A.preventDefault();
      }
    }
    function O(A) {
      x.value = !0;
    }
    function k(A) {
      if (C.value)
        return vf(C.value, A);
    }
    return _e(() => c(e.tag, {
      ref: C,
      class: ["v-list", {
        "v-list--disabled": e.disabled,
        "v-list--nav": e.nav,
        "v-list--slim": e.slim
      }, i.value, s.value, a.value, r.value, u.value, S.value, d.value, e.class],
      style: [l.value, f.value, e.style],
      tabindex: e.disabled || x.value ? -1 : 0,
      role: "listbox",
      "aria-activedescendant": void 0,
      onFocusin: $,
      onFocusout: V,
      onFocus: T,
      onKeydown: D,
      onMousedown: O
    }, {
      default: () => [c(pm, {
        items: o.value,
        returnObject: e.returnObject
      }, n)]
    })), {
      open: h,
      select: g,
      focus: k,
      children: v,
      parents: m,
      getPath: _
    };
  }
}), L_ = {
  name: "BookAnnotations",
  emits: ["locate", "open-settings"],
  props: {
    toolbarEnabled: { type: Boolean, default: !0 },
    annotations: { type: Array, default: () => [] },
    loading: { type: Boolean, default: !1 },
    error: { type: String, default: "" }
  }
}, R_ = {
  key: 0,
  class: "text-medium-emphasis mt-1"
}, H_ = {
  key: 1,
  class: "annotation-content mt-1"
}, j_ = {
  key: 1,
  class: "annotation-location-hint text-medium-emphasis"
};
function z_(e, t, n, o, i, s) {
  return G(), fe(pt, {
    class: "annotation-panel",
    rounded: "t-lg",
    "aria-busy": String(n.loading)
  }, {
    default: p(() => [
      n.loading ? (G(), fe(ar, {
        key: 0,
        "aria-label": "正在加载笔记",
        indeterminate: ""
      })) : n.error ? (G(), fe(Uo, {
        key: 1,
        class: "ma-3",
        type: "error",
        variant: "tonal",
        density: "compact"
      }, {
        default: p(() => [
          j(Ne(n.error) + "。请刷新笔记重试。", 1)
        ]),
        _: 1
      })) : n.annotations.length === 0 ? (G(), fe(Ut, {
        key: 2,
        class: "annotation-empty text-center"
      }, {
        default: p(() => [
          c(De, { size: "32" }, {
            default: p(() => t[1] || (t[1] = [
              j("mdi-notebook-outline")
            ])),
            _: 1
          }),
          t[4] || (t[4] = le("div", { class: "mt-2" }, "还没有划线或笔记", -1)),
          n.toolbarEnabled ? (G(), ze("div", R_, "在正文中选择文字即可开始。")) : (G(), ze(Ve, { key: 1 }, [
            t[3] || (t[3] = le("div", { class: "text-medium-emphasis mt-1" }, "选区工具栏已关闭，开启后即可添加划线或笔记。", -1)),
            c(ue, {
              class: "mt-3",
              variant: "tonal",
              onClick: t[0] || (t[0] = (l) => e.$emit("open-settings"))
            }, {
              default: p(() => t[2] || (t[2] = [
                j("前往设置开启工具栏")
              ])),
              _: 1
            })
          ], 64))
        ]),
        _: 1
      })) : (G(), fe(wn, {
        key: 3,
        "aria-label": "本书笔记列表",
        lines: "three"
      }, {
        default: p(() => [
          (G(!0), ze(Ve, null, qt(n.annotations, (l) => (G(), fe(He, {
            key: l.id || l.client_id,
            class: "annotation-item",
            link: !!l.cfi,
            onClick: (a) => l.cfi && e.$emit("locate", l)
          }, {
            prepend: p(() => [
              c(De, {
                color: l.annotation_type === "note" ? "blue" : "amber-darken-2"
              }, {
                default: p(() => [
                  j(Ne(l.annotation_type === "note" ? "mdi-note-text-outline" : "mdi-format-color-highlight"), 1)
                ]),
                _: 2
              }, 1032, ["color"])
            ]),
            append: p(() => [
              l.cfi ? (G(), fe(De, {
                key: 0,
                size: "small"
              }, {
                default: p(() => t[5] || (t[5] = [
                  j("mdi-chevron-right")
                ])),
                _: 1
              })) : (G(), ze("span", j_, "仅章节定位"))
            ]),
            default: p(() => [
              c(Ki, null, {
                default: p(() => [
                  j(Ne(l.chapter || "未命名章节"), 1)
                ]),
                _: 2
              }, 1024),
              l.quote_text ? (G(), fe(hl, {
                key: 0,
                class: "annotation-quote"
              }, {
                default: p(() => [
                  j(Ne(l.quote_text), 1)
                ]),
                _: 2
              }, 1024)) : Re("", !0),
              l.content ? (G(), ze("div", H_, Ne(l.content), 1)) : Re("", !0)
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
const _m = /* @__PURE__ */ Vn(L_, [["render", z_], ["__scopeId", "data-v-f7854b71"]]), wm = rl.reduce((e, t) => (e[t] = {
  type: [Boolean, String, Number],
  default: !1
}, e), {}), km = rl.reduce((e, t) => {
  const n = "offset" + Kt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), Sm = rl.reduce((e, t) => {
  const n = "order" + Kt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), cc = {
  col: Object.keys(wm),
  offset: Object.keys(km),
  order: Object.keys(Sm)
};
function U_(e, t, n) {
  let o = e;
  if (!(n == null || n === !1)) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return e === "col" && (o = "v-" + o), e === "col" && (n === "" || n === !0) || (o += `-${n}`), o.toLowerCase();
  }
}
const W_ = ["auto", "start", "end", "center", "baseline", "stretch"], q_ = W({
  cols: {
    type: [Boolean, String, Number],
    default: !1
  },
  ...wm,
  offset: {
    type: [String, Number],
    default: null
  },
  ...km,
  order: {
    type: [String, Number],
    default: null
  },
  ...Sm,
  alignSelf: {
    type: String,
    default: null,
    validator: (e) => W_.includes(e)
  },
  ...Te(),
  ...Ze()
}, "VCol"), Ie = de()({
  name: "VCol",
  props: q_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = b(() => {
      const i = [];
      let s;
      for (s in cc)
        cc[s].forEach((a) => {
          const r = e[a], f = U_(s, a, r);
          f && i.push(f);
        });
      const l = i.some((a) => a.startsWith("v-col-"));
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
      return so(e.tag, {
        class: [o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), gr = ["start", "end", "center"], Cm = ["space-between", "space-around", "space-evenly"];
function yr(e, t) {
  return rl.reduce((n, o) => {
    const i = e + Kt(o);
    return n[i] = t(), n;
  }, {});
}
const G_ = [...gr, "baseline", "stretch"], Em = (e) => G_.includes(e), xm = yr("align", () => ({
  type: String,
  default: null,
  validator: Em
})), K_ = [...gr, ...Cm], Vm = (e) => K_.includes(e), Nm = yr("justify", () => ({
  type: String,
  default: null,
  validator: Vm
})), Y_ = [...gr, ...Cm, "stretch"], Tm = (e) => Y_.includes(e), Om = yr("alignContent", () => ({
  type: String,
  default: null,
  validator: Tm
})), dc = {
  align: Object.keys(xm),
  justify: Object.keys(Nm),
  alignContent: Object.keys(Om)
}, X_ = {
  align: "align",
  justify: "justify",
  alignContent: "align-content"
};
function J_(e, t, n) {
  let o = X_[e];
  if (n != null) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return o += `-${n}`, o.toLowerCase();
  }
}
const Z_ = W({
  dense: Boolean,
  noGutters: Boolean,
  align: {
    type: String,
    default: null,
    validator: Em
  },
  ...xm,
  justify: {
    type: String,
    default: null,
    validator: Vm
  },
  ...Nm,
  alignContent: {
    type: String,
    default: null,
    validator: Tm
  },
  ...Om,
  ...Te(),
  ...Ze()
}, "VRow"), zt = de()({
  name: "VRow",
  props: Z_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = b(() => {
      const i = [];
      let s;
      for (s in dc)
        dc[s].forEach((l) => {
          const a = e[l], r = J_(s, l, a);
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
      return so(e.tag, {
        class: ["v-row", o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), ys = sl("v-spacer", "div", "VSpacer"), Q_ = W({
  active: Boolean,
  disabled: Boolean,
  max: [Number, String],
  value: {
    type: [Number, String],
    default: 0
  },
  ...Te(),
  ...qi({
    transition: {
      component: um
    }
  })
}, "VCounter"), Am = de()({
  name: "VCounter",
  functional: !0,
  props: Q_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = b(() => e.max ? `${e.value} / ${e.max}` : String(e.value));
    return _e(() => c(gn, {
      transition: e.transition
    }, {
      default: () => [rt(c("div", {
        class: ["v-counter", {
          "text-error": e.max && !e.disabled && parseFloat(e.value) > parseFloat(e.max)
        }, e.class],
        style: e.style
      }, [n.default ? n.default({
        counter: o.value,
        max: e.max,
        value: e.value
      }) : o.value]), [[En, e.active]])]
    })), {};
  }
}), e0 = W({
  text: String,
  onClick: Gt(),
  ...Te(),
  ...tt()
}, "VLabel"), pr = de()({
  name: "VLabel",
  props: e0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => {
      var o;
      return c("label", {
        class: ["v-label", {
          "v-label--clickable": !!e.onClick
        }, e.class],
        style: e.style,
        onClick: e.onClick
      }, [e.text, (o = n.default) == null ? void 0 : o.call(n)]);
    }), {};
  }
}), t0 = W({
  floating: Boolean,
  ...Te()
}, "VFieldLabel"), ls = de()({
  name: "VFieldLabel",
  props: t0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => c(pr, {
      class: ["v-field-label", {
        "v-field-label--floating": e.floating
      }, e.class],
      style: e.style,
      "aria-hidden": e.floating || void 0
    }, n)), {};
  }
});
function Im(e) {
  const {
    t
  } = ll();
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
    }[i], l = e[`onClick:${i}`], a = l && s ? t(`$vuetify.input.${s}`, e.label ?? "") : void 0;
    return c(De, {
      icon: e[`${i}Icon`],
      "aria-label": a,
      onClick: l
    }, null);
  }
  return {
    InputIcon: n
  };
}
const br = W({
  focused: Boolean,
  "onUpdate:focused": Gt()
}, "focus");
function Yi(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  const n = Ye(e, "focused"), o = b(() => ({
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
const n0 = ["underlined", "outlined", "filled", "solo", "solo-inverted", "solo-filled", "plain"], _r = W({
  appendInnerIcon: We,
  bgColor: String,
  clearable: Boolean,
  clearIcon: {
    type: We,
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
  prependInnerIcon: We,
  reverse: Boolean,
  singleLine: Boolean,
  variant: {
    type: String,
    default: "filled",
    validator: (e) => n0.includes(e)
  },
  "onClick:clear": Gt(),
  "onClick:appendInner": Gt(),
  "onClick:prependInner": Gt(),
  ...Te(),
  ...rr(),
  ...Nt(),
  ...tt()
}, "VField"), wr = de()({
  name: "VField",
  inheritAttrs: !1,
  props: {
    id: String,
    ...br(),
    ..._r()
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
    } = ur(e), {
      focusClasses: a,
      isFocused: r,
      focus: f,
      blur: u
    } = Yi(e), {
      InputIcon: d
    } = Im(e), {
      roundedClasses: v
    } = Tt(e), {
      rtlClasses: h
    } = Bt(), m = b(() => e.dirty || e.active), g = b(() => !e.singleLine && !!(e.label || i.label)), _ = ln(), S = b(() => e.id || `input-${_}`), N = b(() => `${S.value}-messages`), I = se(), P = se(), x = se(), C = b(() => ["plain", "underlined"].includes(e.variant)), {
      backgroundColorClasses: $,
      backgroundColorStyles: V
    } = At(ae(e, "bgColor")), {
      textColorClasses: T,
      textColorStyles: D
    } = Mt(b(() => e.error || e.disabled ? void 0 : m.value && r.value ? e.color : e.baseColor));
    ke(m, (B) => {
      if (g.value) {
        const Q = I.value.$el, re = P.value.$el;
        requestAnimationFrame(() => {
          const ne = Qa(Q), J = re.getBoundingClientRect(), Ce = J.x - ne.x, K = J.y - ne.y - (ne.height / 2 - J.height / 2), X = J.width / 0.75, te = Math.abs(X - ne.width) > 1 ? {
            maxWidth: be(X)
          } : void 0, Oe = getComputedStyle(Q), qe = getComputedStyle(re), Ge = parseFloat(Oe.transitionDuration) * 1e3 || 150, oe = parseFloat(qe.getPropertyValue("--v-field-label-scale")), Ee = qe.getPropertyValue("color");
          Q.style.visibility = "visible", re.style.visibility = "hidden", ko(Q, {
            transform: `translate(${Ce}px, ${K}px) scale(${oe})`,
            color: Ee,
            ...te
          }, {
            duration: Ge,
            easing: Vi,
            direction: B ? "normal" : "reverse"
          }).finished.then(() => {
            Q.style.removeProperty("visibility"), re.style.removeProperty("visibility");
          });
        });
      }
    }, {
      flush: "post"
    });
    const O = b(() => ({
      isActive: m,
      isFocused: r,
      controlRef: x,
      blur: u,
      focus: f
    }));
    function k(B) {
      B.target !== document.activeElement && B.preventDefault();
    }
    function A(B) {
      var Q;
      B.key !== "Enter" && B.key !== " " || (B.preventDefault(), B.stopPropagation(), (Q = e["onClick:clear"]) == null || Q.call(e, new MouseEvent("click")));
    }
    return _e(() => {
      var Ce, K, X;
      const B = e.variant === "outlined", Q = !!(i["prepend-inner"] || e.prependInnerIcon), re = !!(e.clearable || i.clear), ne = !!(i["append-inner"] || e.appendInnerIcon || re), J = () => i.label ? i.label({
        ...O.value,
        label: e.label,
        props: {
          for: S.value
        }
      }) : e.label;
      return c("div", xe({
        class: ["v-field", {
          "v-field--active": m.value,
          "v-field--appended": ne,
          "v-field--center-affix": e.centerAffix ?? !C.value,
          "v-field--disabled": e.disabled,
          "v-field--dirty": e.dirty,
          "v-field--error": e.error,
          "v-field--flat": e.flat,
          "v-field--has-background": !!e.bgColor,
          "v-field--persistent-clear": e.persistentClear,
          "v-field--prepended": Q,
          "v-field--reverse": e.reverse,
          "v-field--single-line": e.singleLine,
          "v-field--no-label": !J(),
          [`v-field--variant-${e.variant}`]: !0
        }, s.value, $.value, a.value, l.value, v.value, h.value, e.class],
        style: [V.value, e.style],
        onClick: k
      }, n), [c("div", {
        class: "v-field__overlay"
      }, null), c(Kf, {
        name: "v-field",
        active: !!e.loading,
        color: e.error ? "error" : typeof e.loading == "string" ? e.loading : e.color
      }, {
        default: i.loader
      }), Q && c("div", {
        key: "prepend",
        class: "v-field__prepend-inner"
      }, [e.prependInnerIcon && c(d, {
        key: "prepend-icon",
        name: "prependInner"
      }, null), (Ce = i["prepend-inner"]) == null ? void 0 : Ce.call(i, O.value)]), c("div", {
        class: "v-field__field",
        "data-no-activator": ""
      }, [["filled", "solo", "solo-inverted", "solo-filled"].includes(e.variant) && g.value && c(ls, {
        key: "floating-label",
        ref: P,
        class: [T.value],
        floating: !0,
        for: S.value,
        style: D.value
      }, {
        default: () => [J()]
      }), c(ls, {
        ref: I,
        for: S.value
      }, {
        default: () => [J()]
      }), (K = i.default) == null ? void 0 : K.call(i, {
        ...O.value,
        props: {
          id: S.value,
          class: "v-field__input",
          "aria-describedby": N.value
        },
        focus: f,
        blur: u
      })]), re && c(h_, {
        key: "clear"
      }, {
        default: () => [rt(c("div", {
          class: "v-field__clearable",
          onMousedown: (te) => {
            te.preventDefault(), te.stopPropagation();
          }
        }, [c(mt, {
          defaults: {
            VIcon: {
              icon: e.clearIcon
            }
          }
        }, {
          default: () => [i.clear ? i.clear({
            ...O.value,
            props: {
              onKeydown: A,
              onFocus: f,
              onBlur: u,
              onClick: e["onClick:clear"]
            }
          }) : c(d, {
            name: "clear",
            onKeydown: A,
            onFocus: f,
            onBlur: u
          }, null)]
        })]), [[En, e.dirty]])]
      }), ne && c("div", {
        key: "append",
        class: "v-field__append-inner"
      }, [(X = i["append-inner"]) == null ? void 0 : X.call(i, O.value), e.appendInnerIcon && c(d, {
        key: "append-icon",
        name: "appendInner"
      }, null)]), c("div", {
        class: ["v-field__outline", T.value],
        style: D.value
      }, [B && c(Ve, null, [c("div", {
        class: "v-field__outline__start"
      }, null), g.value && c("div", {
        class: "v-field__outline__notch"
      }, [c(ls, {
        ref: P,
        floating: !0,
        for: S.value
      }, {
        default: () => [J()]
      })]), c("div", {
        class: "v-field__outline__end"
      }, null)]), C.value && g.value && c(ls, {
        ref: P,
        floating: !0,
        for: S.value
      }, {
        default: () => [J()]
      })])]);
    }), {
      controlRef: x
    };
  }
});
function Pm(e) {
  const t = Object.keys(wr.props).filter((n) => !Xa(n) && n !== "class" && n !== "style");
  return uf(e, t);
}
const o0 = W({
  active: Boolean,
  color: String,
  messages: {
    type: [Array, String],
    default: () => []
  },
  ...Te(),
  ...qi({
    transition: {
      component: um,
      leaveAbsolute: !0,
      group: !0
    }
  })
}, "VMessages"), i0 = de()({
  name: "VMessages",
  props: o0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = b(() => bn(e.messages)), {
      textColorClasses: i,
      textColorStyles: s
    } = Mt(b(() => e.color));
    return _e(() => c(gn, {
      transition: e.transition,
      tag: "div",
      class: ["v-messages", i.value, e.class],
      style: [s.value, e.style],
      role: "alert",
      "aria-live": "polite"
    }, {
      default: () => [e.active && o.value.map((l, a) => c("div", {
        class: "v-messages__message",
        key: `${a}-${o.value}`
      }, [n.message ? n.message({
        message: l
      }) : l]))]
    })), {};
  }
}), Dm = Symbol.for("vuetify:form"), s0 = W({
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
function l0(e) {
  const t = Ye(e, "modelValue"), n = b(() => e.disabled), o = b(() => e.readonly), i = we(!1), s = se([]), l = se([]);
  async function a() {
    const u = [];
    let d = !0;
    l.value = [], i.value = !0;
    for (const v of s.value) {
      const h = await v.validate();
      if (h.length > 0 && (d = !1, u.push({
        id: v.id,
        errorMessages: h
      })), !d && e.fastFail) break;
    }
    return l.value = u, i.value = !1, {
      valid: d,
      errors: l.value
    };
  }
  function r() {
    s.value.forEach((u) => u.reset());
  }
  function f() {
    s.value.forEach((u) => u.resetValidation());
  }
  return ke(s, () => {
    let u = 0, d = 0;
    const v = [];
    for (const h of s.value)
      h.isValid === !1 ? (d++, v.push({
        id: h.id,
        errorMessages: h.errorMessages
      })) : h.isValid === !0 && u++;
    l.value = v, t.value = d > 0 ? !1 : u === s.value.length ? !0 : null;
  }, {
    deep: !0,
    flush: "post"
  }), yt(Dm, {
    register: (u) => {
      let {
        id: d,
        vm: v,
        validate: h,
        reset: m,
        resetValidation: g
      } = u;
      s.value.some((_) => _.id === d) && _n(`Duplicate input name "${d}"`), s.value.push({
        id: d,
        validate: h,
        reset: m,
        resetValidation: g,
        vm: Xc(v),
        isValid: null,
        errorMessages: []
      });
    },
    unregister: (u) => {
      s.value = s.value.filter((d) => d.id !== u);
    },
    update: (u, d, v) => {
      const h = s.value.find((m) => m.id === u);
      h && (h.isValid = d, h.errorMessages = v);
    },
    isDisabled: n,
    isReadonly: o,
    isValidating: i,
    isValid: t,
    items: s,
    validateOn: ae(e, "validateOn")
  }), {
    errors: l,
    isDisabled: n,
    isReadonly: o,
    isValidating: i,
    isValid: t,
    items: s,
    validate: a,
    reset: r,
    resetValidation: f
  };
}
function a0() {
  return je(Dm, null);
}
const r0 = W({
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
  ...br()
}, "validation");
function u0(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn(), n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : ln();
  const o = Ye(e, "modelValue"), i = b(() => e.validationValue === void 0 ? o.value : e.validationValue), s = a0(), l = se([]), a = we(!0), r = b(() => !!(bn(o.value === "" ? null : o.value).length || bn(i.value === "" ? null : i.value).length)), f = b(() => !!(e.disabled ?? (s == null ? void 0 : s.isDisabled.value))), u = b(() => !!(e.readonly ?? (s == null ? void 0 : s.isReadonly.value))), d = b(() => {
    var x;
    return (x = e.errorMessages) != null && x.length ? bn(e.errorMessages).concat(l.value).slice(0, Math.max(0, +e.maxErrors)) : l.value;
  }), v = b(() => {
    let x = (e.validateOn ?? (s == null ? void 0 : s.validateOn.value)) || "input";
    x === "lazy" && (x = "input lazy"), x === "eager" && (x = "input eager");
    const C = new Set((x == null ? void 0 : x.split(" ")) ?? []);
    return {
      input: C.has("input"),
      blur: C.has("blur") || C.has("input") || C.has("invalid-input"),
      invalidInput: C.has("invalid-input"),
      lazy: C.has("lazy"),
      eager: C.has("eager")
    };
  }), h = b(() => {
    var x;
    return e.error || (x = e.errorMessages) != null && x.length ? !1 : e.rules.length ? a.value ? l.value.length || v.value.lazy ? null : !0 : !l.value.length : !0;
  }), m = we(!1), g = b(() => ({
    [`${t}--error`]: h.value === !1,
    [`${t}--dirty`]: r.value,
    [`${t}--disabled`]: f.value,
    [`${t}--readonly`]: u.value
  })), _ = it("validation"), S = b(() => e.name ?? vn(n));
  Fa(() => {
    s == null || s.register({
      id: S.value,
      vm: _,
      validate: P,
      reset: N,
      resetValidation: I
    });
  }), kt(() => {
    s == null || s.unregister(S.value);
  }), Cn(async () => {
    v.value.lazy || await P(!v.value.eager), s == null || s.update(S.value, h.value, d.value);
  }), oo(() => v.value.input || v.value.invalidInput && h.value === !1, () => {
    ke(i, () => {
      if (i.value != null)
        P();
      else if (e.focused) {
        const x = ke(() => e.focused, (C) => {
          C || P(), x();
        });
      }
    });
  }), oo(() => v.value.blur, () => {
    ke(() => e.focused, (x) => {
      x || P();
    });
  }), ke([h, d], () => {
    s == null || s.update(S.value, h.value, d.value);
  });
  async function N() {
    o.value = null, await at(), await I();
  }
  async function I() {
    a.value = !0, v.value.lazy ? l.value = [] : await P(!v.value.eager);
  }
  async function P() {
    let x = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !1;
    const C = [];
    m.value = !0;
    for (const $ of e.rules) {
      if (C.length >= +(e.maxErrors ?? 1))
        break;
      const T = await (typeof $ == "function" ? $ : () => $)(i.value);
      if (T !== !0) {
        if (T !== !1 && typeof T != "string") {
          console.warn(`${T} is not a valid value. Rule functions must return boolean true or a string.`);
          continue;
        }
        C.push(T || "");
      }
    }
    return l.value = C, m.value = !1, a.value = x, l.value;
  }
  return {
    errorMessages: d,
    isDirty: r,
    isDisabled: f,
    isReadonly: u,
    isPristine: a,
    isValid: h,
    isValidating: m,
    reset: N,
    resetValidation: I,
    validate: P,
    validationClasses: g
  };
}
const Xi = W({
  id: String,
  appendIcon: We,
  centerAffix: {
    type: Boolean,
    default: !0
  },
  prependIcon: We,
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
  "onClick:prepend": Gt(),
  "onClick:append": Gt(),
  ...Te(),
  ...Xt(),
  ...Py(zn(), ["maxWidth", "minWidth", "width"]),
  ...tt(),
  ...r0()
}, "VInput"), io = de()({
  name: "VInput",
  props: {
    ...Xi()
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
    } = an(e), {
      dimensionStyles: l
    } = Un(e), {
      themeClasses: a
    } = vt(e), {
      rtlClasses: r
    } = Bt(), {
      InputIcon: f
    } = Im(e), u = ln(), d = b(() => e.id || `input-${u}`), v = b(() => `${d.value}-messages`), {
      errorMessages: h,
      isDirty: m,
      isDisabled: g,
      isReadonly: _,
      isPristine: S,
      isValid: N,
      isValidating: I,
      reset: P,
      resetValidation: x,
      validate: C,
      validationClasses: $
    } = u0(e, "v-input", d), V = b(() => ({
      id: d,
      messagesId: v,
      isDirty: m,
      isDisabled: g,
      isReadonly: _,
      isPristine: S,
      isValid: N,
      isValidating: I,
      reset: P,
      resetValidation: x,
      validate: C
    })), T = b(() => {
      var D;
      return (D = e.errorMessages) != null && D.length || !S.value && h.value.length ? h.value : e.hint && (e.persistentHint || e.focused) ? e.hint : e.messages;
    });
    return _e(() => {
      var B, Q, re, ne;
      const D = !!(o.prepend || e.prependIcon), O = !!(o.append || e.appendIcon), k = T.value.length > 0, A = !e.hideDetails || e.hideDetails === "auto" && (k || !!o.details);
      return c("div", {
        class: ["v-input", `v-input--${e.direction}`, {
          "v-input--center-affix": e.centerAffix,
          "v-input--hide-spin-buttons": e.hideSpinButtons
        }, s.value, a.value, r.value, $.value, e.class],
        style: [l.value, e.style]
      }, [D && c("div", {
        key: "prepend",
        class: "v-input__prepend"
      }, [(B = o.prepend) == null ? void 0 : B.call(o, V.value), e.prependIcon && c(f, {
        key: "prepend-icon",
        name: "prepend"
      }, null)]), o.default && c("div", {
        class: "v-input__control"
      }, [(Q = o.default) == null ? void 0 : Q.call(o, V.value)]), O && c("div", {
        key: "append",
        class: "v-input__append"
      }, [e.appendIcon && c(f, {
        key: "append-icon",
        name: "append"
      }, null), (re = o.append) == null ? void 0 : re.call(o, V.value)]), A && c("div", {
        class: "v-input__details"
      }, [c(i0, {
        id: v.value,
        active: k,
        messages: T.value
      }, {
        message: o.message
      }), (ne = o.details) == null ? void 0 : ne.call(o, V.value)])]);
    }), {
      reset: P,
      resetValidation: x,
      validate: C,
      isValid: N,
      errorMessages: h
    };
  }
}), Ml = Symbol("Forwarded refs");
function Fl(e, t) {
  let n = e;
  for (; n; ) {
    const o = Reflect.getOwnPropertyDescriptor(n, t);
    if (o) return o;
    n = Object.getPrototypeOf(n);
  }
}
function ii(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), o = 1; o < t; o++)
    n[o - 1] = arguments[o];
  return e[Ml] = n, new Proxy(e, {
    get(i, s) {
      if (Reflect.has(i, s))
        return Reflect.get(i, s);
      if (!(typeof s == "symbol" || s.startsWith("$") || s.startsWith("__"))) {
        for (const l of n)
          if (l.value && Reflect.has(l.value, s)) {
            const a = Reflect.get(l.value, s);
            return typeof a == "function" ? a.bind(l.value) : a;
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
      for (const a of n)
        if (a.value && Reflect.has(a.value, s))
          return Reflect.set(a.value, s, l);
      return !1;
    },
    getOwnPropertyDescriptor(i, s) {
      var a;
      const l = Reflect.getOwnPropertyDescriptor(i, s);
      if (l) return l;
      if (!(typeof s == "symbol" || s.startsWith("$") || s.startsWith("__"))) {
        for (const r of n) {
          if (!r.value) continue;
          const f = Fl(r.value, s) ?? ("_" in r.value ? Fl((a = r.value._) == null ? void 0 : a.setupState, s) : void 0);
          if (f) return f;
        }
        for (const r of n) {
          const f = r.value && r.value[Ml];
          if (!f) continue;
          const u = f.slice();
          for (; u.length; ) {
            const d = u.shift(), v = Fl(d.value, s);
            if (v) return v;
            const h = d.value && d.value[Ml];
            h && u.push(...h);
          }
        }
      }
    }
  });
}
const c0 = ["color", "file", "time", "date", "datetime-local", "week", "month"], d0 = W({
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
  ...Xi(),
  ..._r()
}, "VTextField"), Zt = de()({
  name: "VTextField",
  directives: {
    Intersect: fr
  },
  inheritAttrs: !1,
  props: d0(),
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
    const s = Ye(e, "modelValue"), {
      isFocused: l,
      focus: a,
      blur: r
    } = Yi(e), f = b(() => typeof e.counterValue == "function" ? e.counterValue(s.value) : typeof e.counterValue == "number" ? e.counterValue : (s.value ?? "").toString().length), u = b(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    }), d = b(() => ["plain", "underlined"].includes(e.variant));
    function v(C, $) {
      var V, T;
      !e.autofocus || !C || (T = (V = $[0].target) == null ? void 0 : V.focus) == null || T.call(V);
    }
    const h = se(), m = se(), g = se(), _ = b(() => c0.includes(e.type) || e.persistentPlaceholder || l.value || e.active);
    function S() {
      var C;
      g.value !== document.activeElement && ((C = g.value) == null || C.focus()), l.value || a();
    }
    function N(C) {
      o("mousedown:control", C), C.target !== g.value && (S(), C.preventDefault());
    }
    function I(C) {
      S(), o("click:control", C);
    }
    function P(C) {
      C.stopPropagation(), S(), at(() => {
        s.value = null, mf(e["onClick:clear"], C);
      });
    }
    function x(C) {
      var V;
      const $ = C.target;
      if (s.value = $.value, (V = e.modelModifiers) != null && V.trim && ["text", "search", "password", "tel", "url"].includes(e.type)) {
        const T = [$.selectionStart, $.selectionEnd];
        at(() => {
          $.selectionStart = T[0], $.selectionEnd = T[1];
        });
      }
    }
    return _e(() => {
      const C = !!(i.counter || e.counter !== !1 && e.counter != null), $ = !!(C || i.details), [V, T] = il(n), {
        modelValue: D,
        ...O
      } = io.filterProps(e), k = Pm(e);
      return c(io, xe({
        ref: h,
        modelValue: s.value,
        "onUpdate:modelValue": (A) => s.value = A,
        class: ["v-text-field", {
          "v-text-field--prefixed": e.prefix,
          "v-text-field--suffixed": e.suffix,
          "v-input--plain-underlined": d.value
        }, e.class],
        style: e.style
      }, V, O, {
        centerAffix: !d.value,
        focused: l.value
      }), {
        ...i,
        default: (A) => {
          let {
            id: B,
            isDisabled: Q,
            isDirty: re,
            isReadonly: ne,
            isValid: J
          } = A;
          return c(wr, xe({
            ref: m,
            onMousedown: N,
            onClick: I,
            "onClick:clear": P,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"],
            role: e.role
          }, k, {
            id: B.value,
            active: _.value || re.value,
            dirty: re.value || e.dirty,
            disabled: Q.value,
            focused: l.value,
            error: J.value === !1
          }), {
            ...i,
            default: (Ce) => {
              let {
                props: {
                  class: K,
                  ...X
                }
              } = Ce;
              const te = rt(c("input", xe({
                ref: g,
                value: s.value,
                onInput: x,
                autofocus: e.autofocus,
                readonly: ne.value,
                disabled: Q.value,
                name: e.name,
                placeholder: e.placeholder,
                size: 1,
                type: e.type,
                onFocus: S,
                onBlur: r
              }, X, T), null), [[Rn("intersect"), {
                handler: v
              }, null, {
                once: !0
              }]]);
              return c(Ve, null, [e.prefix && c("span", {
                class: "v-text-field__prefix"
              }, [c("span", {
                class: "v-text-field__prefix__text"
              }, [e.prefix])]), i.default ? c("div", {
                class: K,
                "data-no-activator": ""
              }, [i.default(), te]) : on(te, {
                class: K
              }), e.suffix && c("span", {
                class: "v-text-field__suffix"
              }, [c("span", {
                class: "v-text-field__suffix__text"
              }, [e.suffix])])]);
            }
          });
        },
        details: $ ? (A) => {
          var B;
          return c(Ve, null, [(B = i.details) == null ? void 0 : B.call(i, A), C && c(Ve, null, [c("span", null, null), c(Am, {
            active: e.persistentCounter || l.value,
            value: f.value,
            max: u.value,
            disabled: e.disabled
          }, i.counter)])]);
        } : void 0
      });
    }), ii({}, h, m, g);
  }
}), f0 = {
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
function m0(e, t, n, o, i, s) {
  return G(), fe(pt, null, {
    default: p(() => [
      c(zt, null, {
        default: p(() => [
          c(Ie, {
            offset: "2",
            cols: "8",
            class: "text-center"
          }, {
            default: p(() => t[4] || (t[4] = [
              le("h4", { class: "mt-3" }, "评论列表", -1)
            ])),
            _: 1
          }),
          c(Ie, { cols: "2" }, {
            default: p(() => [
              c(ue, {
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
      c(en),
      n.comments.length == 0 ? (G(), fe(wn, {
        key: 0,
        density: "compact"
      }, {
        default: p(() => [
          c(He, { class: "my-4" }, {
            default: p(() => [
              c(Ki, { class: "text-center" }, {
                default: p(() => t[5] || (t[5] = [
                  j("尚未有人发表评论")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : (G(), fe(wn, {
        key: 1,
        id: "book-comments",
        density: "compact"
      }, {
        default: p(() => [
          (G(!0), ze(Ve, null, qt(n.comments, (l) => (G(), fe(He, {
            class: "pr-0 align-self-start mb-4",
            "prepend-avatar": l.avatar,
            "append-icon": "mdi-thumb-up",
            subtitle: l.nickName
          }, {
            prepend: p(() => [
              c(yn, {
                variant: "outlined",
                size: "large",
                color: "grey",
                class: "text-center",
                icon: l.avatar
              }, null, 8, ["icon"])
            ]),
            append: p(() => [
              c(ue, {
                class: "px-0",
                size: "small",
                variant: "plain",
                stacked: "",
                "prepend-icon": "mdi-thumb-up",
                title: "点赞"
              }, {
                default: p(() => [
                  j(Ne(l.likeCount), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            default: p(() => [
              j(Ne(l.content) + " ", 1),
              c(hl, null, {
                default: p(() => [
                  j(Ne(l.level) + "楼 * " + Ne(l.createTime) + " * " + Ne(l.geo), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            _: 2
          }, 1032, ["prepend-avatar", "subtitle"]))), 256))
        ]),
        _: 1
      })),
      c(Ut, { class: "my-2 py-0 px-2" }, {
        default: p(() => [
          n.login ? (G(), fe(zt, { key: 1 }, {
            default: p(() => [
              c(Ie, { cols: "9" }, {
                default: p(() => [
                  c(Zt, {
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
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ue, {
                    onClick: t[3] || (t[3] = (l) => e.$emit("add_review", this.content))
                  }, {
                    default: p(() => t[7] || (t[7] = [
                      j("发表")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (G(), fe(ue, {
            key: 0,
            onClick: t[1] || (t[1] = (l) => e.$emit("login")),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: p(() => t[6] || (t[6] = [
              j("点击登录，发表评论")
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
const $m = /* @__PURE__ */ Vn(f0, [["render", m0]]);
function Bl(e, t) {
  return {
    x: e.x + t.x,
    y: e.y + t.y
  };
}
function v0(e, t) {
  return {
    x: e.x - t.x,
    y: e.y - t.y
  };
}
function fc(e, t) {
  if (e.side === "top" || e.side === "bottom") {
    const {
      side: n,
      align: o
    } = e, i = o === "left" ? 0 : o === "center" ? t.width / 2 : o === "right" ? t.width : o, s = n === "top" ? 0 : n === "bottom" ? t.height : n;
    return Bl({
      x: i,
      y: s
    }, t);
  } else if (e.side === "left" || e.side === "right") {
    const {
      side: n,
      align: o
    } = e, i = n === "left" ? 0 : n === "right" ? t.width : n, s = o === "top" ? 0 : o === "center" ? t.height / 2 : o === "bottom" ? t.height : o;
    return Bl({
      x: i,
      y: s
    }, t);
  }
  return Bl({
    x: t.width / 2,
    y: t.height / 2
  }, t);
}
const Mm = {
  static: y0,
  // specific viewport position, usually centered
  connected: b0
  // connected to a certain element
}, h0 = W({
  locationStrategy: {
    type: [String, Function],
    default: "static",
    validator: (e) => typeof e == "function" || e in Mm
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
function g0(e, t) {
  const n = se({}), o = se();
  Ke && oo(() => !!(t.isActive.value && e.locationStrategy), (s) => {
    var l, a;
    ke(() => e.locationStrategy, s), Ft(() => {
      window.removeEventListener("resize", i), o.value = void 0;
    }), window.addEventListener("resize", i, {
      passive: !0
    }), typeof e.locationStrategy == "function" ? o.value = (l = e.locationStrategy(t, e, n)) == null ? void 0 : l.updateLocation : o.value = (a = Mm[e.locationStrategy](t, e, n)) == null ? void 0 : a.updateLocation;
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
function y0() {
}
function p0(e, t) {
  const n = Qa(e);
  return t ? n.x += parseFloat(e.style.right || 0) : n.x -= parseFloat(e.style.left || 0), n.y -= parseFloat(e.style.top || 0), n;
}
function b0(e, t, n) {
  (Array.isArray(e.target.value) || yp(e.target.value)) && Object.assign(n.value, {
    position: "fixed",
    top: 0,
    [e.isRtl.value ? "right" : "left"]: 0
  });
  const {
    preferredAnchor: i,
    preferredOrigin: s
  } = Ja(() => {
    const m = ua(t.location, e.isRtl.value), g = t.origin === "overlap" ? m : t.origin === "auto" ? Al(m) : ua(t.origin, e.isRtl.value);
    return m.side === g.side && m.align === Il(g).align ? {
      preferredAnchor: Ou(m),
      preferredOrigin: Ou(g)
    } : {
      preferredAnchor: m,
      preferredOrigin: g
    };
  }), [l, a, r, f] = ["minWidth", "minHeight", "maxWidth", "maxHeight"].map((m) => b(() => {
    const g = parseFloat(t[m]);
    return isNaN(g) ? 1 / 0 : g;
  })), u = b(() => {
    if (Array.isArray(t.offset))
      return t.offset;
    if (typeof t.offset == "string") {
      const m = t.offset.split(" ").map(parseFloat);
      return m.length < 2 && m.push(0), m;
    }
    return typeof t.offset == "number" ? [t.offset, 0] : [0, 0];
  });
  let d = !1;
  const v = new ResizeObserver(() => {
    d && h();
  });
  ke([e.target, e.contentEl], (m, g) => {
    let [_, S] = m, [N, I] = g;
    N && !Array.isArray(N) && v.unobserve(N), _ && !Array.isArray(_) && v.observe(_), I && v.unobserve(I), S && v.observe(S);
  }, {
    immediate: !0
  }), Ft(() => {
    v.disconnect();
  });
  function h() {
    if (d = !1, requestAnimationFrame(() => d = !0), !e.target.value || !e.contentEl.value) return;
    const m = yf(e.target.value), g = p0(e.contentEl.value, e.isRtl.value), _ = Bs(e.contentEl.value), S = 12;
    _.length || (_.push(document.documentElement), e.contentEl.value.style.top && e.contentEl.value.style.left || (g.x -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-x") || 0), g.y -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-y") || 0)));
    const N = _.reduce((O, k) => {
      const A = k.getBoundingClientRect(), B = new Oo({
        x: k === document.documentElement ? 0 : A.x,
        y: k === document.documentElement ? 0 : A.y,
        width: k.clientWidth,
        height: k.clientHeight
      });
      return O ? new Oo({
        x: Math.max(O.left, B.left),
        y: Math.max(O.top, B.top),
        width: Math.min(O.right, B.right) - Math.max(O.left, B.left),
        height: Math.min(O.bottom, B.bottom) - Math.max(O.top, B.top)
      }) : B;
    }, void 0);
    N.x += S, N.y += S, N.width -= S * 2, N.height -= S * 2;
    let I = {
      anchor: i.value,
      origin: s.value
    };
    function P(O) {
      const k = new Oo(g), A = fc(O.anchor, m), B = fc(O.origin, k);
      let {
        x: Q,
        y: re
      } = v0(A, B);
      switch (O.anchor.side) {
        case "top":
          re -= u.value[0];
          break;
        case "bottom":
          re += u.value[0];
          break;
        case "left":
          Q -= u.value[0];
          break;
        case "right":
          Q += u.value[0];
          break;
      }
      switch (O.anchor.align) {
        case "top":
          re -= u.value[1];
          break;
        case "bottom":
          re += u.value[1];
          break;
        case "left":
          Q -= u.value[1];
          break;
        case "right":
          Q += u.value[1];
          break;
      }
      return k.x += Q, k.y += re, k.width = Math.min(k.width, r.value), k.height = Math.min(k.height, f.value), {
        overflows: Iu(k, N),
        x: Q,
        y: re
      };
    }
    let x = 0, C = 0;
    const $ = {
      x: 0,
      y: 0
    }, V = {
      x: !1,
      y: !1
    };
    let T = -1;
    for (; ; ) {
      if (T++ > 10) {
        Ms("Infinite loop detected in connectedLocationStrategy");
        break;
      }
      const {
        x: O,
        y: k,
        overflows: A
      } = P(I);
      x += O, C += k, g.x += O, g.y += k;
      {
        const B = Au(I.anchor), Q = A.x.before || A.x.after, re = A.y.before || A.y.after;
        let ne = !1;
        if (["x", "y"].forEach((J) => {
          if (J === "x" && Q && !V.x || J === "y" && re && !V.y) {
            const Ce = {
              anchor: {
                ...I.anchor
              },
              origin: {
                ...I.origin
              }
            }, K = J === "x" ? B === "y" ? Il : Al : B === "y" ? Al : Il;
            Ce.anchor = K(Ce.anchor), Ce.origin = K(Ce.origin);
            const {
              overflows: X
            } = P(Ce);
            (X[J].before <= A[J].before && X[J].after <= A[J].after || X[J].before + X[J].after < (A[J].before + A[J].after) / 2) && (I = Ce, ne = V[J] = !0);
          }
        }), ne) continue;
      }
      A.x.before && (x += A.x.before, g.x += A.x.before), A.x.after && (x -= A.x.after, g.x -= A.x.after), A.y.before && (C += A.y.before, g.y += A.y.before), A.y.after && (C -= A.y.after, g.y -= A.y.after);
      {
        const B = Iu(g, N);
        $.x = N.width - B.x.before - B.x.after, $.y = N.height - B.y.before - B.y.after, x += B.x.before, g.x += B.x.before, C += B.y.before, g.y += B.y.before;
      }
      break;
    }
    const D = Au(I.anchor);
    return Object.assign(n.value, {
      "--v-overlay-anchor-origin": `${I.anchor.side} ${I.anchor.align}`,
      transformOrigin: `${I.origin.side} ${I.origin.align}`,
      // transform: `translate(${pixelRound(x)}px, ${pixelRound(y)}px)`,
      top: be(Ll(C)),
      left: e.isRtl.value ? void 0 : be(Ll(x)),
      right: e.isRtl.value ? be(Ll(-x)) : void 0,
      minWidth: be(D === "y" ? Math.min(l.value, m.width) : l.value),
      maxWidth: be(mc(Sn($.x, l.value === 1 / 0 ? 0 : l.value, r.value))),
      maxHeight: be(mc(Sn($.y, a.value === 1 / 0 ? 0 : a.value, f.value)))
    }), {
      available: $,
      contentBox: g
    };
  }
  return ke(() => [i.value, s.value, t.offset, t.minWidth, t.minHeight, t.maxWidth, t.maxHeight], () => h()), at(() => {
    const m = h();
    if (!m) return;
    const {
      available: g,
      contentBox: _
    } = m;
    _.height > g.y && requestAnimationFrame(() => {
      h(), requestAnimationFrame(() => {
        h();
      });
    });
  }), {
    updateLocation: h
  };
}
function Ll(e) {
  return Math.round(e * devicePixelRatio) / devicePixelRatio;
}
function mc(e) {
  return Math.ceil(e * devicePixelRatio) / devicePixelRatio;
}
let ya = !0;
const Us = [];
function _0(e) {
  !ya || Us.length ? (Us.push(e), pa()) : (ya = !1, e(), pa());
}
let vc = -1;
function pa() {
  cancelAnimationFrame(vc), vc = requestAnimationFrame(() => {
    const e = Us.shift();
    e && e(), Us.length ? pa() : ya = !0;
  });
}
const ps = {
  none: null,
  close: S0,
  block: C0,
  reposition: E0
}, w0 = W({
  scrollStrategy: {
    type: [String, Function],
    default: "block",
    validator: (e) => typeof e == "function" || e in ps
  }
}, "VOverlay-scroll-strategies");
function k0(e, t) {
  if (!Ke) return;
  let n;
  sn(async () => {
    n == null || n.stop(), t.isActive.value && e.scrollStrategy && (n = Va(), await new Promise((o) => setTimeout(o)), n.active && n.run(() => {
      var o;
      typeof e.scrollStrategy == "function" ? e.scrollStrategy(t, e, n) : (o = ps[e.scrollStrategy]) == null || o.call(ps, t, e, n);
    }));
  }), Ft(() => {
    n == null || n.stop();
  });
}
function S0(e) {
  function t(n) {
    e.isActive.value = !1;
  }
  Fm(e.targetEl.value ?? e.contentEl.value, t);
}
function C0(e, t) {
  var l;
  const n = (l = e.root.value) == null ? void 0 : l.offsetParent, o = [.../* @__PURE__ */ new Set([...Bs(e.targetEl.value, t.contained ? n : void 0), ...Bs(e.contentEl.value, t.contained ? n : void 0)])].filter((a) => !a.classList.contains("v-overlay-scroll-blocked")), i = window.innerWidth - document.documentElement.offsetWidth, s = ((a) => nr(a) && a)(n || document.documentElement);
  s && e.root.value.classList.add("v-overlay--scroll-blocked"), o.forEach((a, r) => {
    a.style.setProperty("--v-body-scroll-x", be(-a.scrollLeft)), a.style.setProperty("--v-body-scroll-y", be(-a.scrollTop)), a !== document.documentElement && a.style.setProperty("--v-scrollbar-offset", be(i)), a.classList.add("v-overlay-scroll-blocked");
  }), Ft(() => {
    o.forEach((a, r) => {
      const f = parseFloat(a.style.getPropertyValue("--v-body-scroll-x")), u = parseFloat(a.style.getPropertyValue("--v-body-scroll-y")), d = a.style.scrollBehavior;
      a.style.scrollBehavior = "auto", a.style.removeProperty("--v-body-scroll-x"), a.style.removeProperty("--v-body-scroll-y"), a.style.removeProperty("--v-scrollbar-offset"), a.classList.remove("v-overlay-scroll-blocked"), a.scrollLeft = -f, a.scrollTop = -u, a.style.scrollBehavior = d;
    }), s && e.root.value.classList.remove("v-overlay--scroll-blocked");
  });
}
function E0(e, t, n) {
  let o = !1, i = -1, s = -1;
  function l(a) {
    _0(() => {
      var u, d;
      const r = performance.now();
      (d = (u = e.updateLocation).value) == null || d.call(u, a), o = (performance.now() - r) / (1e3 / 60) > 2;
    });
  }
  s = (typeof requestIdleCallback > "u" ? (a) => a() : requestIdleCallback)(() => {
    n.run(() => {
      Fm(e.targetEl.value ?? e.contentEl.value, (a) => {
        o ? (cancelAnimationFrame(i), i = requestAnimationFrame(() => {
          i = requestAnimationFrame(() => {
            l(a);
          });
        })) : l(a);
      });
    });
  }), Ft(() => {
    typeof cancelIdleCallback < "u" && cancelIdleCallback(s), cancelAnimationFrame(i);
  });
}
function Fm(e, t) {
  const n = [document, ...Bs(e)];
  n.forEach((o) => {
    o.addEventListener("scroll", t, {
      passive: !0
    });
  }), Ft(() => {
    n.forEach((o) => {
      o.removeEventListener("scroll", t);
    });
  });
}
const x0 = Symbol.for("vuetify:v-menu"), V0 = W({
  closeDelay: [Number, String],
  openDelay: [Number, String]
}, "delay");
function N0(e, t) {
  let n = () => {
  };
  function o(l) {
    n == null || n();
    const a = Number(l ? e.openDelay : e.closeDelay);
    return new Promise((r) => {
      n = Fy(a, () => {
        t == null || t(l), r(l);
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
const T0 = W({
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
  ...V0()
}, "VOverlay-activator");
function O0(e, t) {
  let {
    isActive: n,
    isTop: o,
    contentEl: i
  } = t;
  const s = it("useActivator"), l = se();
  let a = !1, r = !1, f = !0;
  const u = b(() => e.openOnFocus || e.openOnFocus == null && e.openOnHover), d = b(() => e.openOnClick || e.openOnClick == null && !e.openOnHover && !u.value), {
    runOpenDelay: v,
    runCloseDelay: h
  } = N0(e, (V) => {
    V === (e.openOnHover && a || u.value && r) && !(e.openOnHover && n.value && !o.value) && (n.value !== V && (f = !0), n.value = V);
  }), m = se(), g = {
    onClick: (V) => {
      V.stopPropagation(), l.value = V.currentTarget || V.target, n.value || (m.value = [V.clientX, V.clientY]), n.value = !n.value;
    },
    onMouseenter: (V) => {
      var T;
      (T = V.sourceCapabilities) != null && T.firesTouchEvents || (a = !0, l.value = V.currentTarget || V.target, v());
    },
    onMouseleave: (V) => {
      a = !1, h();
    },
    onFocus: (V) => {
      hf(V.target, ":focus-visible") !== !1 && (r = !0, V.stopPropagation(), l.value = V.currentTarget || V.target, v());
    },
    onBlur: (V) => {
      r = !1, V.stopPropagation(), h();
    }
  }, _ = b(() => {
    const V = {};
    return d.value && (V.onClick = g.onClick), e.openOnHover && (V.onMouseenter = g.onMouseenter, V.onMouseleave = g.onMouseleave), u.value && (V.onFocus = g.onFocus, V.onBlur = g.onBlur), V;
  }), S = b(() => {
    const V = {};
    if (e.openOnHover && (V.onMouseenter = () => {
      a = !0, v();
    }, V.onMouseleave = () => {
      a = !1, h();
    }), u.value && (V.onFocusin = () => {
      r = !0, v();
    }, V.onFocusout = () => {
      r = !1, h();
    }), e.closeOnContentClick) {
      const T = je(x0, null);
      V.onClick = () => {
        n.value = !1, T == null || T.closeParents();
      };
    }
    return V;
  }), N = b(() => {
    const V = {};
    return e.openOnHover && (V.onMouseenter = () => {
      f && (a = !0, f = !1, v());
    }, V.onMouseleave = () => {
      a = !1, h();
    }), V;
  });
  ke(o, (V) => {
    var T;
    V && (e.openOnHover && !a && (!u.value || !r) || u.value && !r && (!e.openOnHover || !a)) && !((T = i.value) != null && T.contains(document.activeElement)) && (n.value = !1);
  }), ke(n, (V) => {
    V || setTimeout(() => {
      m.value = void 0;
    });
  }, {
    flush: "post"
  });
  const I = ra();
  sn(() => {
    I.value && at(() => {
      l.value = I.el;
    });
  });
  const P = ra(), x = b(() => e.target === "cursor" && m.value ? m.value : P.value ? P.el : Bm(e.target, s) || l.value), C = b(() => Array.isArray(x.value) ? void 0 : x.value);
  let $;
  return ke(() => !!e.activator, (V) => {
    V && Ke ? ($ = Va(), $.run(() => {
      A0(e, s, {
        activatorEl: l,
        activatorEvents: _
      });
    })) : $ && $.stop();
  }, {
    flush: "post",
    immediate: !0
  }), Ft(() => {
    $ == null || $.stop();
  }), {
    activatorEl: l,
    activatorRef: I,
    target: x,
    targetEl: C,
    targetRef: P,
    activatorEvents: _,
    contentEvents: S,
    scrimEvents: N
  };
}
function A0(e, t, n) {
  let {
    activatorEl: o,
    activatorEvents: i
  } = n;
  ke(() => e.activator, (r, f) => {
    if (f && r !== f) {
      const u = a(f);
      u && l(u);
    }
    r && at(() => s());
  }, {
    immediate: !0
  }), ke(() => e.activatorProps, () => {
    s();
  }), Ft(() => {
    l();
  });
  function s() {
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : a(), f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    r && Ly(r, xe(i.value, f));
  }
  function l() {
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : a(), f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    r && Ry(r, xe(i.value, f));
  }
  function a() {
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : e.activator;
    const f = Bm(r, t);
    return o.value = (f == null ? void 0 : f.nodeType) === Node.ELEMENT_NODE ? f : void 0, o.value;
  }
}
function Bm(e, t) {
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
function I0() {
  if (!Ke) return we(!1);
  const {
    ssr: e
  } = Af();
  if (e) {
    const t = we(!1);
    return Cn(() => {
      t.value = !0;
    }), t;
  } else
    return we(!0);
}
const Lm = W({
  eager: Boolean
}, "lazy");
function Rm(e, t) {
  const n = we(!1), o = b(() => n.value || e.eager || t.value);
  ke(t, () => n.value = !0);
  function i() {
    e.eager || (n.value = !1);
  }
  return {
    isBooted: n,
    hasContent: o,
    onAfterLeave: i
  };
}
function gl() {
  const t = it("useScopeId").vnode.scopeId;
  return {
    scopeId: t ? {
      [t]: ""
    } : void 0
  };
}
const hc = Symbol.for("vuetify:stack"), ci = ht([]);
function P0(e, t, n) {
  const o = it("useStack"), i = !n, s = je(hc, void 0), l = ht({
    activeChildren: /* @__PURE__ */ new Set()
  });
  yt(hc, l);
  const a = we(+t.value);
  oo(e, () => {
    var d;
    const u = (d = ci.at(-1)) == null ? void 0 : d[1];
    a.value = u ? u + 10 : +t.value, i && ci.push([o.uid, a.value]), s == null || s.activeChildren.add(o.uid), Ft(() => {
      if (i) {
        const v = me(ci).findIndex((h) => h[0] === o.uid);
        ci.splice(v, 1);
      }
      s == null || s.activeChildren.delete(o.uid);
    });
  });
  const r = we(!0);
  i && sn(() => {
    var d;
    const u = ((d = ci.at(-1)) == null ? void 0 : d[0]) === o.uid;
    setTimeout(() => r.value = u);
  });
  const f = b(() => !l.activeChildren.size);
  return {
    globalTop: Bi(r),
    localTop: f,
    stackStyles: b(() => ({
      zIndex: a.value
    }))
  };
}
function D0(e) {
  return {
    teleportTarget: b(() => {
      const n = e();
      if (n === !0 || !Ke) return;
      const o = n === !1 ? document.body : typeof n == "string" ? document.querySelector(n) : n;
      if (o == null) {
        Vt(`Unable to locate target ${n}`);
        return;
      }
      let i = [...o.children].find((s) => s.matches(".v-overlay-container"));
      return i || (i = document.createElement("div"), i.className = "v-overlay-container", o.appendChild(i)), i;
    })
  };
}
function $0() {
  return !0;
}
function Hm(e, t, n) {
  if (!e || jm(e, n) === !1) return !1;
  const o = Cf(t);
  if (typeof ShadowRoot < "u" && o instanceof ShadowRoot && o.host === e.target) return !1;
  const i = (typeof n.value == "object" && n.value.include || (() => []))();
  return i.push(t), !i.some((s) => s == null ? void 0 : s.contains(e.target));
}
function jm(e, t) {
  return (typeof t.value == "object" && t.value.closeConditional || $0)(e);
}
function M0(e, t, n) {
  const o = typeof n.value == "function" ? n.value : n.value.handler;
  e.shadowTarget = e.target, t._clickOutside.lastMousedownWasOutside && Hm(e, t, n) && setTimeout(() => {
    jm(e, n) && o && o(e);
  }, 0);
}
function gc(e, t) {
  const n = Cf(e);
  t(document), typeof ShadowRoot < "u" && n instanceof ShadowRoot && t(n);
}
const F0 = {
  // [data-app] may not be found
  // if using bind, inserted makes
  // sure that the root element is
  // available, iOS does not support
  // clicks on body
  mounted(e, t) {
    const n = (i) => M0(i, e, t), o = (i) => {
      e._clickOutside.lastMousedownWasOutside = Hm(i, e, t);
    };
    gc(e, (i) => {
      i.addEventListener("click", n, !0), i.addEventListener("mousedown", o, !0);
    }), e._clickOutside || (e._clickOutside = {
      lastMousedownWasOutside: !1
    }), e._clickOutside[t.instance.$.uid] = {
      onClick: n,
      onMousedown: o
    };
  },
  beforeUnmount(e, t) {
    e._clickOutside && (gc(e, (n) => {
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
function B0(e) {
  const {
    modelValue: t,
    color: n,
    ...o
  } = e;
  return c(Do, {
    name: "fade-transition",
    appear: !0
  }, {
    default: () => [e.modelValue && c("div", xe({
      class: ["v-overlay__scrim", e.color.backgroundColorClasses.value],
      style: e.color.backgroundColorStyles.value
    }, o), null)]
  });
}
const kr = W({
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
  ...T0(),
  ...Te(),
  ...zn(),
  ...Lm(),
  ...h0(),
  ...w0(),
  ...tt(),
  ...qi()
}, "VOverlay"), Pi = de()({
  name: "VOverlay",
  directives: {
    ClickOutside: F0
  },
  inheritAttrs: !1,
  props: {
    _disableGlobalStack: Boolean,
    ...kr()
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
    const s = it("VOverlay"), l = se(), a = se(), r = se(), f = Ye(e, "modelValue"), u = b({
      get: () => f.value,
      set: (oe) => {
        oe && e.disabled || (f.value = oe);
      }
    }), {
      themeClasses: d
    } = vt(e), {
      rtlClasses: v,
      isRtl: h
    } = Bt(), {
      hasContent: m,
      onAfterLeave: g
    } = Rm(e, u), _ = At(b(() => typeof e.scrim == "string" ? e.scrim : null)), {
      globalTop: S,
      localTop: N,
      stackStyles: I
    } = P0(u, ae(e, "zIndex"), e._disableGlobalStack), {
      activatorEl: P,
      activatorRef: x,
      target: C,
      targetEl: $,
      targetRef: V,
      activatorEvents: T,
      contentEvents: D,
      scrimEvents: O
    } = O0(e, {
      isActive: u,
      isTop: N,
      contentEl: r
    }), {
      teleportTarget: k
    } = D0(() => {
      var Le, nt, Qe;
      const oe = e.attach || e.contained;
      if (oe) return oe;
      const Ee = ((Le = P == null ? void 0 : P.value) == null ? void 0 : Le.getRootNode()) || ((Qe = (nt = s.proxy) == null ? void 0 : nt.$el) == null ? void 0 : Qe.getRootNode());
      return Ee instanceof ShadowRoot ? Ee : !1;
    }), {
      dimensionStyles: A
    } = Un(e), B = I0(), {
      scopeId: Q
    } = gl();
    ke(() => e.disabled, (oe) => {
      oe && (u.value = !1);
    });
    const {
      contentStyles: re,
      updateLocation: ne
    } = g0(e, {
      isRtl: h,
      contentEl: r,
      target: C,
      isActive: u
    });
    k0(e, {
      root: l,
      contentEl: r,
      targetEl: $,
      isActive: u,
      updateLocation: ne
    });
    function J(oe) {
      i("click:outside", oe), e.persistent ? Oe() : u.value = !1;
    }
    function Ce(oe) {
      return u.value && S.value && // If using scrim, only close if clicking on it rather than anything opened on top
      (!e.scrim || oe.target === a.value || oe instanceof MouseEvent && oe.shadowTarget === a.value);
    }
    Ke && ke(u, (oe) => {
      oe ? window.addEventListener("keydown", K) : window.removeEventListener("keydown", K);
    }, {
      immediate: !0
    }), kt(() => {
      Ke && window.removeEventListener("keydown", K);
    });
    function K(oe) {
      var Ee, Le;
      oe.key === "Escape" && S.value && (e.persistent ? Oe() : (u.value = !1, (Ee = r.value) != null && Ee.contains(document.activeElement) && ((Le = P.value) == null || Le.focus())));
    }
    const X = qb();
    oo(() => e.closeOnBack, () => {
      Gb(X, (oe) => {
        S.value && u.value ? (oe(!1), e.persistent ? Oe() : u.value = !1) : oe();
      });
    });
    const te = se();
    ke(() => u.value && (e.absolute || e.contained) && k.value == null, (oe) => {
      if (oe) {
        const Ee = hp(l.value);
        Ee && Ee !== document.scrollingElement && (te.value = Ee.scrollTop);
      }
    });
    function Oe() {
      e.noClickAnimation || r.value && ko(r.value, [{
        transformOrigin: "center"
      }, {
        transform: "scale(1.03)"
      }, {
        transformOrigin: "center"
      }], {
        duration: 150,
        easing: Vi
      });
    }
    function qe() {
      i("afterEnter");
    }
    function Ge() {
      g(), i("afterLeave");
    }
    return _e(() => {
      var oe;
      return c(Ve, null, [(oe = n.activator) == null ? void 0 : oe.call(n, {
        isActive: u.value,
        targetRef: V,
        props: xe({
          ref: x
        }, T.value, e.activatorProps)
      }), B.value && m.value && c(Oh, {
        disabled: !k.value,
        to: k.value
      }, {
        default: () => [c("div", xe({
          class: ["v-overlay", {
            "v-overlay--absolute": e.absolute || e.contained,
            "v-overlay--active": u.value,
            "v-overlay--contained": e.contained
          }, d.value, v.value, e.class],
          style: [I.value, {
            "--v-overlay-opacity": e.opacity,
            top: be(te.value)
          }, e.style],
          ref: l
        }, Q, o), [c(B0, xe({
          color: _,
          modelValue: u.value && !!e.scrim,
          ref: a
        }, O.value), null), c(gn, {
          appear: !0,
          persisted: !0,
          transition: e.transition,
          target: C.value,
          onAfterEnter: qe,
          onAfterLeave: Ge
        }, {
          default: () => {
            var Ee;
            return [rt(c("div", xe({
              ref: r,
              class: ["v-overlay__content", e.contentClass],
              style: [A.value, re.value]
            }, D.value, e.contentProps), [(Ee = n.default) == null ? void 0 : Ee.call(n, {
              isActive: u
            })]), [[En, u.value], [Rn("click-outside"), {
              handler: J,
              closeConditional: Ce,
              include: () => [P.value]
            }]])];
          }
        })])]
      })]);
    }), {
      activatorEl: P,
      scrimEl: a,
      target: C,
      animateClick: Oe,
      contentEl: r,
      globalTop: S,
      localTop: N,
      updateLocation: ne
    };
  }
}), zm = W({
  fullscreen: Boolean,
  retainFocus: {
    type: Boolean,
    default: !0
  },
  scrollable: Boolean,
  ...kr({
    origin: "center center",
    scrollStrategy: "block",
    transition: {
      component: m_
    },
    zIndex: 2400
  })
}, "VDialog"), pn = de()({
  name: "VDialog",
  props: zm(),
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
      scopeId: s
    } = gl(), l = se();
    function a(u) {
      var h, m;
      const d = u.relatedTarget, v = u.target;
      if (d !== v && ((h = l.value) != null && h.contentEl) && // We're the topmost dialog
      ((m = l.value) != null && m.globalTop) && // It isn't the document or the dialog body
      ![document, l.value.contentEl].includes(v) && // It isn't inside the dialog body
      !l.value.contentEl.contains(v)) {
        const g = Za(l.value.contentEl);
        if (!g.length) return;
        const _ = g[0], S = g[g.length - 1];
        d === _ ? S.focus() : _.focus();
      }
    }
    kt(() => {
      document.removeEventListener("focusin", a);
    }), Ke && ke(() => i.value && e.retainFocus, (u) => {
      u ? document.addEventListener("focusin", a) : document.removeEventListener("focusin", a);
    }, {
      immediate: !0
    });
    function r() {
      var u;
      n("afterEnter"), (u = l.value) != null && u.contentEl && !l.value.contentEl.contains(document.activeElement) && l.value.contentEl.focus({
        preventScroll: !0
      });
    }
    function f() {
      n("afterLeave");
    }
    return ke(i, async (u) => {
      var d;
      u || (await at(), (d = l.value.activatorEl) == null || d.focus({
        preventScroll: !0
      }));
    }), _e(() => {
      const u = Pi.filterProps(e), d = xe({
        "aria-haspopup": "dialog"
      }, e.activatorProps), v = xe({
        tabindex: -1
      }, e.contentProps);
      return c(Pi, xe({
        ref: l,
        class: ["v-dialog", {
          "v-dialog--fullscreen": e.fullscreen,
          "v-dialog--scrollable": e.scrollable
        }, e.class],
        style: e.style
      }, u, {
        modelValue: i.value,
        "onUpdate:modelValue": (h) => i.value = h,
        "aria-modal": "true",
        activatorProps: d,
        contentProps: v,
        height: e.fullscreen ? void 0 : e.height,
        width: e.fullscreen ? void 0 : e.width,
        maxHeight: e.fullscreen ? void 0 : e.maxHeight,
        maxWidth: e.fullscreen ? void 0 : e.maxWidth,
        role: "dialog",
        onAfterEnter: r,
        onAfterLeave: f
      }, s), {
        activator: o.activator,
        default: function() {
          for (var h = arguments.length, m = new Array(h), g = 0; g < h; g++)
            m[g] = arguments[g];
          return c(mt, {
            root: "VDialog"
          }, {
            default: () => {
              var _;
              return [(_ = o.default) == null ? void 0 : _.call(o, ...m)];
            }
          });
        }
      });
    }), ii({}, l);
  }
}), L0 = {
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
}, R0 = { class: "px-4 py-2" }, H0 = { class: "px-4 py-2" }, j0 = { class: "my-2" };
function z0(e, t, n, o, i, s) {
  return G(), fe(pt, null, {
    default: p(() => [
      c(Qn, { class: "text-center" }, {
        default: p(() => t[14] || (t[14] = [
          j(" 消息 ")
        ])),
        _: 1
      }),
      le("div", R0, [
        c(pt, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "用户信息"
        }, {
          default: p(() => [
            c(wn, null, {
              default: p(() => [
                c(He, {
                  class: "text-right",
                  onClick: s.alert_avatar
                }, {
                  prepend: p(() => t[15] || (t[15] = [
                    le("span", null, "头像", -1)
                  ])),
                  append: p(() => [
                    c(yn, {
                      image: n.user.avatar
                    }, null, 8, ["image"])
                  ]),
                  _: 1
                }, 8, ["onClick"]),
                c(He, {
                  class: "text-right",
                  title: n.user.email
                }, {
                  prepend: p(() => t[16] || (t[16] = [
                    le("span", null, "邮箱", -1)
                  ])),
                  _: 1
                }, 8, ["title"]),
                c(He, {
                  class: "text-right",
                  onClick: t[0] || (t[0] = (l) => e.editNickname = !0),
                  title: n.user.nickname
                }, {
                  prepend: p(() => t[17] || (t[17] = [
                    le("span", null, "昵称", -1)
                  ])),
                  append: p(() => [
                    c(De, null, {
                      default: p(() => t[18] || (t[18] = [
                        j("mdi-chevron-right")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["title"]),
                c(He, {
                  class: "text-right",
                  onClick: t[1] || (t[1] = (l) => e.editPassword = !0),
                  title: "(点击更改)",
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: p(() => t[19] || (t[19] = [
                    le("span", null, "密码", -1)
                  ])),
                  _: 1
                }),
                c(He, {
                  class: "text-right",
                  onClick: t[2] || (t[2] = (l) => e.checkLogout = !0),
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: p(() => t[20] || (t[20] = [
                    le("span", null, "退出登录", -1)
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
      le("div", H0, [
        c(pt, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "章评互动信息"
        }, {
          default: p(() => [
            n.messages.length === 0 ? (G(), fe(wn, {
              key: 0,
              density: "compact",
              class: "mr-4"
            }, {
              default: p(() => [
                c(He, { class: "my-4" }, {
                  default: p(() => [
                    c(Ki, { class: "text-center" }, {
                      default: p(() => t[21] || (t[21] = [
                        j("无新的互动消息")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })) : Re("", !0),
            c(wn, {
              id: "book-comments",
              density: "compact",
              class: "mr-4"
            }, {
              default: p(() => [
                (G(!0), ze(Ve, null, qt(n.messages, (l) => (G(), fe(He, {
                  key: l.id,
                  class: "pr-0 align-self-start mb-4",
                  "prepend-avatar": l.avatar,
                  subtitle: l.nickName + " @《宿命之环》"
                }, {
                  default: p(() => [
                    le("div", j0, Ne(s.thumb_or_content(l)), 1),
                    c(pt, {
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
      c(pn, {
        modelValue: e.editAvatar,
        "onUpdate:modelValue": t[3] || (t[3] = (l) => e.editAvatar = l),
        persistent: ""
      }, {
        default: p(() => [
          c(Uo)
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(pn, {
        modelValue: e.editNickname,
        "onUpdate:modelValue": t[6] || (t[6] = (l) => e.editNickname = l),
        persistent: ""
      }, {
        default: p(() => [
          c(pt, null, {
            default: p(() => [
              c(Qn, { class: "text-center" }, {
                default: p(() => t[22] || (t[22] = [
                  j("修改昵称")
                ])),
                _: 1
              }),
              c(Ut, null, {
                default: p(() => [
                  c(Zt, {
                    modelValue: e.newNickname,
                    "onUpdate:modelValue": t[4] || (t[4] = (l) => e.newNickname = l),
                    label: "新昵称"
                  }, null, 8, ["modelValue"]),
                  e.alert.msg ? (G(), fe(Uo, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: p(() => [
                      j(Ne(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : Re("", !0)
                ]),
                _: 1
              }),
              c(Ao, null, {
                default: p(() => [
                  c(ue, {
                    text: "",
                    onClick: t[5] || (t[5] = (l) => e.editNickname = !1)
                  }, {
                    default: p(() => t[23] || (t[23] = [
                      j("取消")
                    ])),
                    _: 1
                  }),
                  c(ue, {
                    text: "",
                    onClick: s.saveNickname
                  }, {
                    default: p(() => t[24] || (t[24] = [
                      j("保存")
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
      c(pn, {
        modelValue: e.editPassword,
        "onUpdate:modelValue": t[11] || (t[11] = (l) => e.editPassword = l),
        persistent: "",
        "z-index": "2999"
      }, {
        default: p(() => [
          c(pt, null, {
            default: p(() => [
              c(Qn, { class: "text-center" }, {
                default: p(() => t[25] || (t[25] = [
                  j("修改密码")
                ])),
                _: 1
              }),
              c(Ut, null, {
                default: p(() => [
                  c(Zt, {
                    modelValue: e.oldPassword,
                    "onUpdate:modelValue": t[7] || (t[7] = (l) => e.oldPassword = l),
                    label: "当前密码"
                  }, null, 8, ["modelValue"]),
                  c(Zt, {
                    modelValue: e.newPassword,
                    "onUpdate:modelValue": t[8] || (t[8] = (l) => e.newPassword = l),
                    label: "新密码",
                    rules: [e.rules.pass]
                  }, null, 8, ["modelValue", "rules"]),
                  c(Zt, {
                    modelValue: e.examPassword,
                    "onUpdate:modelValue": t[9] || (t[9] = (l) => e.examPassword = l),
                    label: "确认密码",
                    rules: [s.double_check_password]
                  }, null, 8, ["modelValue", "rules"]),
                  e.alert.msg ? (G(), fe(Uo, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: p(() => [
                      j(Ne(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : Re("", !0)
                ]),
                _: 1
              }),
              c(Ao, null, {
                default: p(() => [
                  c(ue, {
                    text: "",
                    onClick: t[10] || (t[10] = (l) => e.editPassword = !1)
                  }, {
                    default: p(() => t[26] || (t[26] = [
                      j("取消")
                    ])),
                    _: 1
                  }),
                  c(ue, {
                    text: "",
                    onClick: s.savePassword
                  }, {
                    default: p(() => t[27] || (t[27] = [
                      j("保存")
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
      c(pn, {
        modelValue: e.checkLogout,
        "onUpdate:modelValue": t[13] || (t[13] = (l) => e.checkLogout = l),
        persistent: ""
      }, {
        default: p(() => [
          c(pt, null, {
            default: p(() => [
              c(Qn, { class: "text-center" }, {
                default: p(() => t[28] || (t[28] = [
                  j("请确认")
                ])),
                _: 1
              }),
              c(Ut, null, {
                default: p(() => [
                  t[29] || (t[29] = j(" 是否要退出登录？ ")),
                  e.alert.msg ? (G(), fe(Uo, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: p(() => [
                      j(Ne(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : Re("", !0)
                ]),
                _: 1
              }),
              c(Ao, null, {
                default: p(() => [
                  c(ue, {
                    text: "",
                    onClick: t[12] || (t[12] = (l) => e.checkLogout = !1)
                  }, {
                    default: p(() => t[30] || (t[30] = [
                      j("取消")
                    ])),
                    _: 1
                  }),
                  c(ue, {
                    text: "",
                    onClick: s.do_logout
                  }, {
                    default: p(() => t[31] || (t[31] = [
                      j("确认")
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
const Um = /* @__PURE__ */ Vn(L0, [["render", z0], ["__scopeId", "data-v-924d6d99"]]), U0 = W({
  ...Te(),
  ...s0()
}, "VForm"), Rl = de()({
  name: "VForm",
  props: U0(),
  emits: {
    "update:modelValue": (e) => !0,
    submit: (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = l0(e), s = se();
    function l(r) {
      r.preventDefault(), i.reset();
    }
    function a(r) {
      const f = r, u = i.validate();
      f.then = u.then.bind(u), f.catch = u.catch.bind(u), f.finally = u.finally.bind(u), o("submit", f), f.defaultPrevented || u.then((d) => {
        var h;
        let {
          valid: v
        } = d;
        v && ((h = s.value) == null || h.submit());
      }), f.preventDefault();
    }
    return _e(() => {
      var r;
      return c("form", {
        ref: s,
        class: ["v-form", e.class],
        style: e.style,
        novalidate: !0,
        onReset: l,
        onSubmit: a
      }, [(r = n.default) == null ? void 0 : r.call(n, i)]);
    }), ii(i, s);
  }
}), W0 = {
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
function q0(e, t, n, o, i, s) {
  return G(), fe(pt, { title: "登录到书评系统" }, {
    default: p(() => [
      c(en),
      c(lm, null, {
        default: p(() => [
          e.mode == "login" ? (G(), fe(Rl, {
            key: 0,
            onSubmit: vs(s.do_login, ["prevent"])
          }, {
            default: p(() => [
              c(Zt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[0] || (t[0] = (l) => e.email = l),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              c(Zt, {
                "prepend-icon": "mdi-lock",
                modelValue: e.password,
                "onUpdate:modelValue": t[1] || (t[1] = (l) => e.password = l),
                label: "密码",
                type: "password"
              }, null, 8, ["modelValue"]),
              c(ue, {
                type: "submit",
                color: "primary"
              }, {
                default: p(() => t[8] || (t[8] = [
                  j("登录")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "forget" ? (G(), fe(Rl, {
            key: 1,
            onSubmit: vs(s.do_reset, ["prevent"])
          }, {
            default: p(() => [
              c(Zt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[2] || (t[2] = (l) => e.email = l),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              c(ue, {
                type: "submit",
                color: "red"
              }, {
                default: p(() => t[9] || (t[9] = [
                  j("重置密码")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "signup" ? (G(), fe(Rl, {
            key: 2,
            ref: "form",
            onSubmit: vs(s.do_signup, ["prevent"])
          }, {
            default: p(() => [
              c(Zt, {
                required: "",
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[3] || (t[3] = (l) => e.email = l),
                label: "邮箱",
                type: "text",
                autocomplete: "new-email",
                rules: [e.rules.email]
              }, null, 8, ["modelValue", "rules"]),
              c(Zt, {
                required: "",
                "prepend-icon": "mdi-guy-fawkes-mask",
                modelValue: e.nickname,
                "onUpdate:modelValue": t[4] || (t[4] = (l) => e.nickname = l),
                label: "昵称",
                type: "text",
                autocomplete: "new-nickname",
                rules: [e.rules.nick]
              }, null, 8, ["modelValue", "rules"]),
              c(ue, {
                type: "submit",
                color: "green"
              }, {
                default: p(() => t[10] || (t[10] = [
                  j("注册")
                ])),
                _: 1
              }),
              t[11] || (t[11] = le("p", { class: "text-small" }, " * 账号密码将随机生成，并发往邮箱", -1))
            ]),
            _: 1
          }, 8, ["onSubmit"])) : Re("", !0)
        ]),
        _: 1
      }),
      e.alert.msg ? (G(), fe(Uo, {
        key: 0,
        type: e.alert.type
      }, {
        default: p(() => [
          j(Ne(e.alert.msg), 1)
        ]),
        _: 1
      }, 8, ["type"])) : Re("", !0),
      c(en),
      c(Ao, null, {
        default: p(() => [
          e.mode == "login" ? (G(), fe(ue, {
            key: 0,
            onClick: t[5] || (t[5] = (l) => e.mode = "forget"),
            text: "忘记密码?"
          })) : Re("", !0),
          e.mode != "login" ? (G(), fe(ue, {
            key: 1,
            onClick: t[6] || (t[6] = (l) => e.mode = "login"),
            text: "登录账号"
          })) : Re("", !0),
          c(ys),
          c(ue, {
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
const Wm = /* @__PURE__ */ Vn(W0, [["render", q0]]), Sr = Symbol.for("vuetify:v-tabs"), G0 = W({
  fixed: Boolean,
  sliderColor: String,
  hideSlider: Boolean,
  direction: {
    type: String,
    default: "horizontal"
  },
  ...Mo(om({
    selectedClass: "v-tab--selected",
    variant: "text"
  }), ["active", "block", "flat", "location", "position", "symbol"])
}, "VTab"), ba = de()({
  name: "VTab",
  props: G0(),
  setup(e, t) {
    let {
      slots: n,
      attrs: o
    } = t;
    const {
      textColorClasses: i,
      textColorStyles: s
    } = Mt(e, "sliderColor"), l = se(), a = se(), r = b(() => e.direction === "horizontal"), f = b(() => {
      var d, v;
      return ((v = (d = l.value) == null ? void 0 : d.group) == null ? void 0 : v.isSelected.value) ?? !1;
    });
    function u(d) {
      var h, m;
      let {
        value: v
      } = d;
      if (v) {
        const g = (m = (h = l.value) == null ? void 0 : h.$el.parentElement) == null ? void 0 : m.querySelector(".v-tab--selected .v-tab__slider"), _ = a.value;
        if (!g || !_) return;
        const S = getComputedStyle(g).color, N = g.getBoundingClientRect(), I = _.getBoundingClientRect(), P = r.value ? "x" : "y", x = r.value ? "X" : "Y", C = r.value ? "right" : "bottom", $ = r.value ? "width" : "height", V = N[P], T = I[P], D = V > T ? N[C] - I[C] : N[P] - I[P], O = Math.sign(D) > 0 ? r.value ? "right" : "bottom" : Math.sign(D) < 0 ? r.value ? "left" : "top" : "center", A = (Math.abs(D) + (Math.sign(D) < 0 ? N[$] : I[$])) / Math.max(N[$], I[$]) || 0, B = N[$] / I[$] || 0, Q = 1.5;
        ko(_, {
          backgroundColor: [S, "currentcolor"],
          transform: [`translate${x}(${D}px) scale${x}(${B})`, `translate${x}(${D / Q}px) scale${x}(${(A - 1) / Q + 1})`, "none"],
          transformOrigin: Array(3).fill(O)
        }, {
          duration: 225,
          easing: Vi
        });
      }
    }
    return _e(() => {
      const d = ue.filterProps(e);
      return c(ue, xe({
        symbol: Sr,
        ref: l,
        class: ["v-tab", e.class],
        style: e.style,
        tabindex: f.value ? 0 : -1,
        role: "tab",
        "aria-selected": String(f.value),
        active: !1
      }, d, o, {
        block: e.fixed,
        maxWidth: e.fixed ? 300 : void 0,
        "onGroup:selected": u
      }), {
        ...n,
        default: () => {
          var v;
          return c(Ve, null, [((v = n.default) == null ? void 0 : v.call(n)) ?? e.text, !e.hideSlider && c("div", {
            ref: a,
            class: ["v-tab__slider", i.value],
            style: s.value
          }, null)]);
        }
      });
    }), ii({}, l);
  }
}), K0 = (e) => {
  const {
    touchstartX: t,
    touchendX: n,
    touchstartY: o,
    touchendY: i
  } = e, s = 0.5, l = 16;
  e.offsetX = n - t, e.offsetY = i - o, Math.abs(e.offsetY) < s * Math.abs(e.offsetX) && (e.left && n < t - l && e.left(e), e.right && n > t + l && e.right(e)), Math.abs(e.offsetX) < s * Math.abs(e.offsetY) && (e.up && i < o - l && e.up(e), e.down && i > o + l && e.down(e));
};
function Y0(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchstartX = n.clientX, t.touchstartY = n.clientY, (o = t.start) == null || o.call(t, {
    originalEvent: e,
    ...t
  });
}
function X0(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchendX = n.clientX, t.touchendY = n.clientY, (o = t.end) == null || o.call(t, {
    originalEvent: e,
    ...t
  }), K0(t);
}
function J0(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchmoveX = n.clientX, t.touchmoveY = n.clientY, (o = t.move) == null || o.call(t, {
    originalEvent: e,
    ...t
  });
}
function Z0() {
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
    touchstart: (n) => Y0(n, t),
    touchend: (n) => X0(n, t),
    touchmove: (n) => J0(n, t)
  };
}
function Q0(e, t) {
  var a;
  const n = t.value, o = n != null && n.parent ? e.parentElement : e, i = (n == null ? void 0 : n.options) ?? {
    passive: !0
  }, s = (a = t.instance) == null ? void 0 : a.$.uid;
  if (!o || !s) return;
  const l = Z0(t.value);
  o._touchHandlers = o._touchHandlers ?? /* @__PURE__ */ Object.create(null), o._touchHandlers[s] = l, rf(l).forEach((r) => {
    o.addEventListener(r, l[r], i);
  });
}
function e1(e, t) {
  var s, l;
  const n = (s = t.value) != null && s.parent ? e.parentElement : e, o = (l = t.instance) == null ? void 0 : l.$.uid;
  if (!(n != null && n._touchHandlers) || !o) return;
  const i = n._touchHandlers[o];
  rf(i).forEach((a) => {
    n.removeEventListener(a, i[a]);
  }), delete n._touchHandlers[o];
}
const qm = {
  mounted: Q0,
  unmounted: e1
}, Gm = Symbol.for("vuetify:v-window"), Km = Symbol.for("vuetify:v-window-group"), Ym = W({
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
  ...Te(),
  ...Ze(),
  ...tt()
}, "VWindow"), yc = de()({
  name: "VWindow",
  directives: {
    Touch: qm
  },
  props: Ym(),
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
    } = Bt(), {
      t: s
    } = ll(), l = cl(e, Km), a = se(), r = b(() => i.value ? !e.reverse : e.reverse), f = we(!1), u = b(() => {
      const P = e.direction === "vertical" ? "y" : "x", C = (r.value ? !f.value : f.value) ? "-reverse" : "";
      return `v-window-${P}${C}-transition`;
    }), d = we(0), v = se(void 0), h = b(() => l.items.value.findIndex((P) => l.selected.value.includes(P.id)));
    ke(h, (P, x) => {
      const C = l.items.value.length, $ = C - 1;
      C <= 2 ? f.value = P < x : P === $ && x === 0 ? f.value = !0 : P === 0 && x === $ ? f.value = !1 : f.value = P < x;
    }), yt(Gm, {
      transition: u,
      isReversed: f,
      transitionCount: d,
      transitionHeight: v,
      rootRef: a
    });
    const m = b(() => e.continuous || h.value !== 0), g = b(() => e.continuous || h.value !== l.items.value.length - 1);
    function _() {
      m.value && l.prev();
    }
    function S() {
      g.value && l.next();
    }
    const N = b(() => {
      const P = [], x = {
        icon: i.value ? e.nextIcon : e.prevIcon,
        class: `v-window__${r.value ? "right" : "left"}`,
        onClick: l.prev,
        "aria-label": s("$vuetify.carousel.prev")
      };
      P.push(m.value ? n.prev ? n.prev({
        props: x
      }) : c(ue, x, null) : c("div", null, null));
      const C = {
        icon: i.value ? e.prevIcon : e.nextIcon,
        class: `v-window__${r.value ? "left" : "right"}`,
        onClick: l.next,
        "aria-label": s("$vuetify.carousel.next")
      };
      return P.push(g.value ? n.next ? n.next({
        props: C
      }) : c(ue, C, null) : c("div", null, null)), P;
    }), I = b(() => e.touch === !1 ? e.touch : {
      ...{
        left: () => {
          r.value ? _() : S();
        },
        right: () => {
          r.value ? S() : _();
        },
        start: (x) => {
          let {
            originalEvent: C
          } = x;
          C.stopPropagation();
        }
      },
      ...e.touch === !0 ? {} : e.touch
    });
    return _e(() => rt(c(e.tag, {
      ref: a,
      class: ["v-window", {
        "v-window--show-arrows-on-hover": e.showArrows === "hover"
      }, o.value, e.class],
      style: e.style
    }, {
      default: () => {
        var P, x;
        return [c("div", {
          class: "v-window__container",
          style: {
            height: v.value
          }
        }, [(P = n.default) == null ? void 0 : P.call(n, {
          group: l
        }), e.showArrows !== !1 && c("div", {
          class: "v-window__controls"
        }, [N.value])]), (x = n.additional) == null ? void 0 : x.call(n, {
          group: l
        })];
      }
    }), [[Rn("touch"), I.value]])), {
      group: l
    };
  }
}), t1 = W({
  ...Mo(Ym(), ["continuous", "nextIcon", "prevIcon", "showArrows", "touch", "mandatory"])
}, "VTabsWindow"), n1 = de()({
  name: "VTabsWindow",
  props: t1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = je(Sr, null), i = Ye(e, "modelValue"), s = b({
      get() {
        var l;
        return i.value != null || !o ? i.value : (l = o.items.value.find((a) => o.selected.value.includes(a.id))) == null ? void 0 : l.value;
      },
      set(l) {
        i.value = l;
      }
    });
    return _e(() => {
      const l = yc.filterProps(e);
      return c(yc, xe({
        _as: "VTabsWindow"
      }, l, {
        modelValue: s.value,
        "onUpdate:modelValue": (a) => s.value = a,
        class: ["v-tabs-window", e.class],
        style: e.style,
        mandatory: !1,
        touch: !1
      }), n);
    }), {};
  }
}), Xm = W({
  reverseTransition: {
    type: [Boolean, String],
    default: void 0
  },
  transition: {
    type: [Boolean, String],
    default: void 0
  },
  ...Te(),
  ...zf(),
  ...Lm()
}, "VWindowItem"), pc = de()({
  name: "VWindowItem",
  directives: {
    Touch: qm
  },
  props: Xm(),
  emits: {
    "group:selected": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = je(Gm), i = Uf(e, Km), {
      isBooted: s
    } = Gi();
    if (!o || !i) throw new Error("[Vuetify] VWindowItem must be used inside VWindow");
    const l = we(!1), a = b(() => s.value && (o.isReversed.value ? e.reverseTransition !== !1 : e.transition !== !1));
    function r() {
      !l.value || !o || (l.value = !1, o.transitionCount.value > 0 && (o.transitionCount.value -= 1, o.transitionCount.value === 0 && (o.transitionHeight.value = void 0)));
    }
    function f() {
      var m;
      l.value || !o || (l.value = !0, o.transitionCount.value === 0 && (o.transitionHeight.value = be((m = o.rootRef.value) == null ? void 0 : m.clientHeight)), o.transitionCount.value += 1);
    }
    function u() {
      r();
    }
    function d(m) {
      l.value && at(() => {
        !a.value || !l.value || !o || (o.transitionHeight.value = be(m.clientHeight));
      });
    }
    const v = b(() => {
      const m = o.isReversed.value ? e.reverseTransition : e.transition;
      return a.value ? {
        name: typeof m != "string" ? o.transition.value : m,
        onBeforeEnter: f,
        onAfterEnter: r,
        onEnterCancelled: u,
        onBeforeLeave: f,
        onAfterLeave: r,
        onLeaveCancelled: u,
        onEnter: d
      } : !1;
    }), {
      hasContent: h
    } = Rm(e, i.isSelected);
    return _e(() => c(gn, {
      transition: v.value,
      disabled: !s.value
    }, {
      default: () => {
        var m;
        return [rt(c("div", {
          class: ["v-window-item", i.selectedClass.value, e.class],
          style: e.style
        }, [h.value && ((m = n.default) == null ? void 0 : m.call(n))]), [[En, i.isSelected.value]])];
      }
    })), {
      groupItem: i
    };
  }
}), o1 = W({
  ...Xm()
}, "VTabsWindowItem"), i1 = de()({
  name: "VTabsWindowItem",
  props: o1(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => {
      const o = pc.filterProps(e);
      return c(pc, xe({
        _as: "VTabsWindowItem"
      }, o, {
        class: ["v-tabs-window-item", e.class],
        style: e.style
      }), n);
    }), {};
  }
});
function s1(e) {
  let {
    selectedElement: t,
    containerElement: n,
    isRtl: o,
    isHorizontal: i
  } = e;
  const s = Di(i, n), l = Jm(i, o, n), a = Di(i, t), r = Zm(i, t), f = a * 0.4;
  return l > r ? r - f : l + s < r + a ? r - s + a + f : l;
}
function l1(e) {
  let {
    selectedElement: t,
    containerElement: n,
    isHorizontal: o
  } = e;
  const i = Di(o, n), s = Zm(o, t), l = Di(o, t);
  return s - i / 2 + l / 2;
}
function bc(e, t) {
  const n = e ? "scrollWidth" : "scrollHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function a1(e, t) {
  const n = e ? "clientWidth" : "clientHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function Jm(e, t, n) {
  if (!n)
    return 0;
  const {
    scrollLeft: o,
    offsetWidth: i,
    scrollWidth: s
  } = n;
  return e ? t ? s - i + o : o : n.scrollTop;
}
function Di(e, t) {
  const n = e ? "offsetWidth" : "offsetHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function Zm(e, t) {
  const n = e ? "offsetLeft" : "offsetTop";
  return (t == null ? void 0 : t[n]) || 0;
}
const r1 = Symbol.for("vuetify:v-slide-group"), Qm = W({
  centerActive: Boolean,
  direction: {
    type: String,
    default: "horizontal"
  },
  symbol: {
    type: null,
    default: r1
  },
  nextIcon: {
    type: We,
    default: "$next"
  },
  prevIcon: {
    type: We,
    default: "$prev"
  },
  showArrows: {
    type: [Boolean, String],
    validator: (e) => typeof e == "boolean" || ["always", "desktop", "mobile"].includes(e)
  },
  ...Te(),
  ...mb({
    mobile: null
  }),
  ...Ze(),
  ...sr({
    selectedClass: "v-slide-group-item--active"
  })
}, "VSlideGroup"), _c = de()({
  name: "VSlideGroup",
  props: Qm(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isRtl: o
    } = Bt(), {
      displayClasses: i,
      mobile: s
    } = Af(e), l = cl(e, e.symbol), a = we(!1), r = we(0), f = we(0), u = we(0), d = b(() => e.direction === "horizontal"), {
      resizeRef: v,
      contentRect: h
    } = Hs(), {
      resizeRef: m,
      contentRect: g
    } = Hs(), _ = gb(), S = b(() => ({
      container: v.el,
      duration: 200,
      easing: "easeOutQuart"
    })), N = b(() => l.selected.value.length ? l.items.value.findIndex((K) => K.id === l.selected.value[0]) : -1), I = b(() => l.selected.value.length ? l.items.value.findIndex((K) => K.id === l.selected.value[l.selected.value.length - 1]) : -1);
    if (Ke) {
      let K = -1;
      ke(() => [l.selected.value, h.value, g.value, d.value], () => {
        cancelAnimationFrame(K), K = requestAnimationFrame(() => {
          if (h.value && g.value) {
            const X = d.value ? "width" : "height";
            f.value = h.value[X], u.value = g.value[X], a.value = f.value + 1 < u.value;
          }
          if (N.value >= 0 && m.el) {
            const X = m.el.children[I.value];
            x(X, e.centerActive);
          }
        });
      });
    }
    const P = we(!1);
    function x(K, X) {
      let te = 0;
      X ? te = l1({
        containerElement: v.el,
        isHorizontal: d.value,
        selectedElement: K
      }) : te = s1({
        containerElement: v.el,
        isHorizontal: d.value,
        isRtl: o.value,
        selectedElement: K
      }), C(te);
    }
    function C(K) {
      if (!Ke || !v.el) return;
      const X = Di(d.value, v.el), te = Jm(d.value, o.value, v.el);
      if (!(bc(d.value, v.el) <= X || // Prevent scrolling by only a couple of pixels, which doesn't look smooth
      Math.abs(K - te) < 16)) {
        if (d.value && o.value && v.el) {
          const {
            scrollWidth: qe,
            offsetWidth: Ge
          } = v.el;
          K = qe - Ge - K;
        }
        d.value ? _.horizontal(K, S.value) : _(K, S.value);
      }
    }
    function $(K) {
      const {
        scrollTop: X,
        scrollLeft: te
      } = K.target;
      r.value = d.value ? te : X;
    }
    function V(K) {
      if (P.value = !0, !(!a.value || !m.el)) {
        for (const X of K.composedPath())
          for (const te of m.el.children)
            if (te === X) {
              x(te);
              return;
            }
      }
    }
    function T(K) {
      P.value = !1;
    }
    let D = !1;
    function O(K) {
      var X;
      !D && !P.value && !(K.relatedTarget && ((X = m.el) != null && X.contains(K.relatedTarget))) && B(), D = !1;
    }
    function k() {
      D = !0;
    }
    function A(K) {
      if (!m.el) return;
      function X(te) {
        K.preventDefault(), B(te);
      }
      d.value ? K.key === "ArrowRight" ? X(o.value ? "prev" : "next") : K.key === "ArrowLeft" && X(o.value ? "next" : "prev") : K.key === "ArrowDown" ? X("next") : K.key === "ArrowUp" && X("prev"), K.key === "Home" ? X("first") : K.key === "End" && X("last");
    }
    function B(K) {
      var te, Oe;
      if (!m.el) return;
      let X;
      if (!K)
        X = Za(m.el)[0];
      else if (K === "next") {
        if (X = (te = m.el.querySelector(":focus")) == null ? void 0 : te.nextElementSibling, !X) return B("first");
      } else if (K === "prev") {
        if (X = (Oe = m.el.querySelector(":focus")) == null ? void 0 : Oe.previousElementSibling, !X) return B("last");
      } else K === "first" ? X = m.el.firstElementChild : K === "last" && (X = m.el.lastElementChild);
      X && X.focus({
        preventScroll: !0
      });
    }
    function Q(K) {
      const X = d.value && o.value ? -1 : 1, te = (K === "prev" ? -X : X) * f.value;
      let Oe = r.value + te;
      if (d.value && o.value && v.el) {
        const {
          scrollWidth: qe,
          offsetWidth: Ge
        } = v.el;
        Oe += qe - Ge;
      }
      C(Oe);
    }
    const re = b(() => ({
      next: l.next,
      prev: l.prev,
      select: l.select,
      isSelected: l.isSelected
    })), ne = b(() => {
      switch (e.showArrows) {
        case "always":
          return !0;
        case "desktop":
          return !s.value;
        case !0:
          return a.value || Math.abs(r.value) > 0;
        case "mobile":
          return s.value || a.value || Math.abs(r.value) > 0;
        default:
          return !s.value && (a.value || Math.abs(r.value) > 0);
      }
    }), J = b(() => Math.abs(r.value) > 1), Ce = b(() => {
      if (!v.value) return !1;
      const K = bc(d.value, v.el), X = a1(d.value, v.el);
      return K - X - Math.abs(r.value) > 1;
    });
    return _e(() => c(e.tag, {
      class: ["v-slide-group", {
        "v-slide-group--vertical": !d.value,
        "v-slide-group--has-affixes": ne.value,
        "v-slide-group--is-overflowing": a.value
      }, i.value, e.class],
      style: e.style,
      tabindex: P.value || l.selected.value.length ? -1 : 0,
      onFocus: O
    }, {
      default: () => {
        var K, X, te;
        return [ne.value && c("div", {
          key: "prev",
          class: ["v-slide-group__prev", {
            "v-slide-group__prev--disabled": !J.value
          }],
          onMousedown: k,
          onClick: () => J.value && Q("prev")
        }, [((K = n.prev) == null ? void 0 : K.call(n, re.value)) ?? c(uc, null, {
          default: () => [c(De, {
            icon: o.value ? e.nextIcon : e.prevIcon
          }, null)]
        })]), c("div", {
          key: "container",
          ref: v,
          class: "v-slide-group__container",
          onScroll: $
        }, [c("div", {
          ref: m,
          class: "v-slide-group__content",
          onFocusin: V,
          onFocusout: T,
          onKeydown: A
        }, [(X = n.default) == null ? void 0 : X.call(n, re.value)])]), ne.value && c("div", {
          key: "next",
          class: ["v-slide-group__next", {
            "v-slide-group__next--disabled": !Ce.value
          }],
          onMousedown: k,
          onClick: () => Ce.value && Q("next")
        }, [((te = n.next) == null ? void 0 : te.call(n, re.value)) ?? c(uc, null, {
          default: () => [c(De, {
            icon: o.value ? e.prevIcon : e.nextIcon
          }, null)]
        })])];
      }
    })), {
      selected: l.selected,
      scrollTo: Q,
      scrollOffset: r,
      focus: B,
      hasPrev: J,
      hasNext: Ce
    };
  }
});
function u1(e) {
  return e ? e.map((t) => af(t) ? t : {
    text: t,
    value: t
  }) : [];
}
const c1 = W({
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
  ...Qm({
    mandatory: "force",
    selectedClass: "v-tab-item--selected"
  }),
  ...Xt(),
  ...Ze()
}, "VTabs"), d1 = de()({
  name: "VTabs",
  props: c1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = Ye(e, "modelValue"), s = b(() => u1(e.items)), {
      densityClasses: l
    } = an(e), {
      backgroundColorClasses: a,
      backgroundColorStyles: r
    } = At(ae(e, "bgColor")), {
      scopeId: f
    } = gl();
    return lo({
      VTab: {
        color: ae(e, "color"),
        direction: ae(e, "direction"),
        stacked: ae(e, "stacked"),
        fixed: ae(e, "fixedTabs"),
        sliderColor: ae(e, "sliderColor"),
        hideSlider: ae(e, "hideSlider")
      }
    }), _e(() => {
      const u = _c.filterProps(e), d = !!(o.window || e.items.length > 0);
      return c(Ve, null, [c(_c, xe(u, {
        modelValue: i.value,
        "onUpdate:modelValue": (v) => i.value = v,
        class: ["v-tabs", `v-tabs--${e.direction}`, `v-tabs--align-tabs-${e.alignTabs}`, {
          "v-tabs--fixed-tabs": e.fixedTabs,
          "v-tabs--grow": e.grow,
          "v-tabs--stacked": e.stacked
        }, l.value, a.value, e.class],
        style: [{
          "--v-tabs-height": be(e.height)
        }, r.value, e.style],
        role: "tablist",
        symbol: Sr
      }, f, n), {
        default: () => {
          var v;
          return [((v = o.default) == null ? void 0 : v.call(o)) ?? s.value.map((h) => {
            var m;
            return ((m = o.tab) == null ? void 0 : m.call(o, {
              item: h
            })) ?? c(ba, xe(h, {
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
      }), d && c(n1, xe({
        modelValue: i.value,
        "onUpdate:modelValue": (v) => i.value = v,
        key: "tabs-window"
      }, f), {
        default: () => {
          var v;
          return [s.value.map((h) => {
            var m;
            return ((m = o.item) == null ? void 0 : m.call(o, {
              item: h
            })) ?? c(i1, {
              value: h.value
            }, {
              default: () => {
                var g;
                return (g = o[`item.${h.value}`]) == null ? void 0 : g.call(o, {
                  item: h
                });
              }
            });
          }), (v = o.window) == null ? void 0 : v.call(o)];
        }
      })]);
    }), {};
  }
}), f1 = {
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
}, m1 = { class: "text-white" }, v1 = { class: "br-list" }, h1 = ["onClick"], g1 = { class: "text-white text-caption" };
function y1(e, t, n, o, i, s) {
  return G(), fe(pt, { class: "book-review-card" }, {
    default: p(() => [
      c(zt, {
        "no-gutters": "",
        class: "br-fixed align-center"
      }, {
        default: p(() => [
          c(Ie, {
            offset: "2",
            cols: "8",
            class: "text-center"
          }, {
            default: p(() => t[5] || (t[5] = [
              le("h4", { class: "mt-3" }, "本书评论", -1)
            ])),
            _: 1
          }),
          c(Ie, {
            cols: "2",
            class: "text-right"
          }, {
            default: p(() => [
              c(ue, {
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
      n.user ? (G(), ze(Ve, { key: 0 }, [
        c(He, {
          class: "br-fixed",
          title: n.user.nickName || n.user.nickname,
          subtitle: n.user.email,
          onClick: t[1] || (t[1] = (l) => e.$emit("open-settings"))
        }, {
          prepend: p(() => [
            n.user.avatar ? (G(), fe(yn, {
              key: 0,
              image: n.user.avatar
            }, null, 8, ["image"])) : (G(), fe(yn, {
              key: 1,
              color: s.avatar_color(n.user.id)
            }, {
              default: p(() => [
                le("span", m1, Ne(s.avatar_text(n.user.nickName || n.user.nickname)), 1)
              ]),
              _: 1
            }, 8, ["color"]))
          ]),
          append: p(() => [
            c(De, { title: "用户设置" }, {
              default: p(() => t[6] || (t[6] = [
                j("mdi-cog-outline")
              ])),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["title", "subtitle"]),
        c(en, { class: "br-fixed" })
      ], 64)) : Re("", !0),
      c(d1, {
        class: "br-fixed",
        "model-value": n.sort,
        "onUpdate:modelValue": t[2] || (t[2] = (l) => e.$emit("update:sort", l)),
        density: "compact",
        grow: ""
      }, {
        default: p(() => [
          c(ba, { value: "latest" }, {
            default: p(() => t[7] || (t[7] = [
              j("最新")
            ])),
            _: 1
          }),
          c(ba, { value: "hot" }, {
            default: p(() => t[8] || (t[8] = [
              j("热门")
            ])),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["model-value"]),
      c(en, { class: "br-fixed" }),
      le("div", v1, [
        n.comments.length === 0 ? (G(), fe(wn, {
          key: 0,
          density: "compact"
        }, {
          default: p(() => [
            c(He, { class: "my-4" }, {
              default: p(() => [
                c(Ki, { class: "text-center text-medium-emphasis" }, {
                  default: p(() => t[9] || (t[9] = [
                    j("尚未有人发表评论")
                  ])),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        })) : (G(), fe(wn, {
          key: 1,
          id: "book-review-list",
          density: "compact"
        }, {
          default: p(() => [
            (G(!0), ze(Ve, null, qt(n.comments, (l) => (G(), fe(He, {
              key: l.reviewId,
              class: "pr-0 align-self-start mb-4",
              subtitle: l.nickName
            }, {
              prepend: p(() => [
                l.avatar ? (G(), fe(yn, {
                  key: 0,
                  image: l.avatar,
                  size: "30"
                }, null, 8, ["image"])) : (G(), fe(yn, {
                  key: 1,
                  size: "30",
                  color: s.avatar_color(l.userId)
                }, {
                  default: p(() => [
                    le("span", g1, Ne(s.avatar_text(l.nickName)), 1)
                  ]),
                  _: 2
                }, 1032, ["color"]))
              ]),
              append: p(() => [
                c(ue, {
                  class: "px-0",
                  size: "small",
                  variant: "plain",
                  stacked: "",
                  "prepend-icon": "mdi-thumb-up",
                  title: "点赞"
                }, {
                  default: p(() => [
                    j(Ne(l.likeCount), 1)
                  ]),
                  _: 2
                }, 1024)
              ]),
              default: p(() => [
                j(Ne(l.content) + " ", 1),
                l.referText ? (G(), ze("div", {
                  key: 0,
                  class: Wt(["br-refer text-caption text-medium-emphasis", { "br-refer--link": l.cfi }]),
                  onClick: vs((a) => l.cfi && e.$emit("jump", l.cfi), ["stop"])
                }, Ne(l.referText), 11, h1)) : Re("", !0),
                c(hl, null, {
                  default: p(() => [
                    j(Ne(l.level) + "楼 · " + Ne(l.createTime) + " · " + Ne(l.geo), 1)
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
      c(Ut, { class: "br-fixed my-2 py-0 px-2" }, {
        default: p(() => [
          n.login ? (G(), fe(zt, {
            key: 1,
            "no-gutters": "",
            class: "align-center"
          }, {
            default: p(() => [
              c(Ie, { cols: "9" }, {
                default: p(() => [
                  c(Zt, {
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
              c(Ie, {
                cols: "3",
                class: "text-right"
              }, {
                default: p(() => [
                  c(ue, { onClick: s.submit }, {
                    default: p(() => t[11] || (t[11] = [
                      j("发表")
                    ])),
                    _: 1
                  }, 8, ["onClick"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (G(), fe(ue, {
            key: 0,
            onClick: t[3] || (t[3] = (l) => e.$emit("login")),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: p(() => t[10] || (t[10] = [
              j("点击登录，发表评论")
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
const ev = /* @__PURE__ */ Vn(f1, [["render", y1], ["__scopeId", "data-v-9af658bd"]]), p1 = {
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
function b1(e, t, n, o, i, s) {
  return G(), fe(wn, {
    "onClick:select": s.click_toc,
    ref: "tocList"
  }, {
    default: p(() => [
      c(zs, null, {
        activator: p(({ props: l }) => [
          c(He, xe(l, { title: "书籍信息" }), null, 16)
        ]),
        default: p(() => [
          (G(!0), ze(Ve, null, qt(s.meta_items, (l) => (G(), fe(He, {
            key: l.title,
            title: l.title,
            subtitle: l.subtitle,
            lines: "3"
          }, null, 8, ["title", "subtitle"]))), 128))
        ]),
        _: 1
      }),
      c(en),
      (G(!0), ze(Ve, null, qt(n.toc_items, (l, a) => (G(), ze(Ve, null, [
        l.subitems.length == 0 ? (G(), fe(He, {
          key: 0,
          "prepend-icon": "mdi-book-open-page-variant-outline",
          title: l.label,
          value: l.href,
          class: Wt({ "current-chapter": s.isCurrentChapter(l) }),
          ref_for: !0,
          ref: "listItem"
        }, null, 8, ["title", "value", "class"])) : (G(), fe(zs, {
          key: l.href
        }, {
          activator: p(({ props: r }) => [
            c(He, xe({ ref_for: !0 }, r, {
              "prepend-icon": "mdi-book-open-page-variant-outline",
              title: l.label,
              value: l.href,
              class: { "current-chapter": s.isCurrentChapter(l) },
              ref_for: !0,
              ref: "listItem"
            }), null, 16, ["title", "value", "class"])
          ]),
          default: p(() => [
            (G(!0), ze(Ve, null, qt(l.subitems, (r, f) => (G(), fe(He, {
              key: r.href,
              title: r.label,
              value: r.href,
              class: Wt({ "current-chapter": s.isCurrentChapter(r) }),
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
const tv = /* @__PURE__ */ Vn(p1, [["render", b1], ["__scopeId", "data-v-f081fe9b"]]), Cr = Symbol.for("vuetify:v-slider");
function _1(e, t, n) {
  const o = n === "vertical", i = t.getBoundingClientRect(), s = "touches" in e ? e.touches[0] : e;
  return o ? s.clientY - (i.top + i.height / 2) : s.clientX - (i.left + i.width / 2);
}
function w1(e, t) {
  return "touches" in e && e.touches.length ? e.touches[0][t] : "changedTouches" in e && e.changedTouches.length ? e.changedTouches[0][t] : e[t];
}
const k1 = W({
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
  ...Nt(),
  ...Hn({
    elevation: 2
  }),
  ripple: {
    type: Boolean,
    default: !0
  }
}, "Slider"), S1 = (e) => {
  const t = b(() => parseFloat(e.min)), n = b(() => parseFloat(e.max)), o = b(() => +e.step > 0 ? parseFloat(e.step) : 0), i = b(() => Math.max(Eu(o.value), Eu(t.value)));
  function s(l) {
    if (l = parseFloat(l), o.value <= 0) return l;
    const a = Sn(l, t.value, n.value), r = t.value % o.value, f = Math.round((a - r) / o.value) * o.value + r;
    return parseFloat(Math.min(f, n.value).toFixed(i.value));
  }
  return {
    min: t,
    max: n,
    step: o,
    decimals: i,
    roundValue: s
  };
}, C1 = (e) => {
  let {
    props: t,
    steps: n,
    onSliderStart: o,
    onSliderMove: i,
    onSliderEnd: s,
    getActiveThumb: l
  } = e;
  const {
    isRtl: a
  } = Bt(), r = ae(t, "reverse"), f = b(() => t.direction === "vertical"), u = b(() => f.value !== r.value), {
    min: d,
    max: v,
    step: h,
    decimals: m,
    roundValue: g
  } = n, _ = b(() => parseInt(t.thumbSize, 10)), S = b(() => parseInt(t.tickSize, 10)), N = b(() => parseInt(t.trackSize, 10)), I = b(() => (v.value - d.value) / h.value), P = ae(t, "disabled"), x = b(() => t.error || t.disabled ? void 0 : t.thumbColor ?? t.color), C = b(() => t.error || t.disabled ? void 0 : t.trackColor ?? t.color), $ = b(() => t.error || t.disabled ? void 0 : t.trackFillColor ?? t.color), V = we(!1), T = we(0), D = se(), O = se();
  function k(oe) {
    var w;
    const Ee = t.direction === "vertical", Le = Ee ? "top" : "left", nt = Ee ? "height" : "width", Qe = Ee ? "clientY" : "clientX", {
      [Le]: Rt,
      [nt]: Wn
    } = (w = D.value) == null ? void 0 : w.$el.getBoundingClientRect(), qn = w1(oe, Qe);
    let y = Math.min(Math.max((qn - Rt - T.value) / Wn, 0), 1) || 0;
    return (Ee ? u.value : u.value !== a.value) && (y = 1 - y), g(d.value + y * (v.value - d.value));
  }
  const A = (oe) => {
    s({
      value: k(oe)
    }), V.value = !1, T.value = 0;
  }, B = (oe) => {
    O.value = l(oe), O.value && (O.value.focus(), V.value = !0, O.value.contains(oe.target) ? T.value = _1(oe, O.value, t.direction) : (T.value = 0, i({
      value: k(oe)
    })), o({
      value: k(oe)
    }));
  }, Q = {
    passive: !0,
    capture: !0
  };
  function re(oe) {
    i({
      value: k(oe)
    });
  }
  function ne(oe) {
    oe.stopPropagation(), oe.preventDefault(), A(oe), window.removeEventListener("mousemove", re, Q), window.removeEventListener("mouseup", ne);
  }
  function J(oe) {
    var Ee;
    A(oe), window.removeEventListener("touchmove", re, Q), (Ee = oe.target) == null || Ee.removeEventListener("touchend", J);
  }
  function Ce(oe) {
    var Ee;
    B(oe), window.addEventListener("touchmove", re, Q), (Ee = oe.target) == null || Ee.addEventListener("touchend", J, {
      passive: !1
    });
  }
  function K(oe) {
    oe.preventDefault(), B(oe), window.addEventListener("mousemove", re, Q), window.addEventListener("mouseup", ne, {
      passive: !1
    });
  }
  const X = (oe) => {
    const Ee = (oe - d.value) / (v.value - d.value) * 100;
    return Sn(isNaN(Ee) ? 0 : Ee, 0, 100);
  }, te = ae(t, "showTicks"), Oe = b(() => te.value ? t.ticks ? Array.isArray(t.ticks) ? t.ticks.map((oe) => ({
    value: oe,
    position: X(oe),
    label: oe.toString()
  })) : Object.keys(t.ticks).map((oe) => ({
    value: parseFloat(oe),
    position: X(parseFloat(oe)),
    label: t.ticks[oe]
  })) : I.value !== 1 / 0 ? Ka(I.value + 1).map((oe) => {
    const Ee = d.value + oe * h.value;
    return {
      value: Ee,
      position: X(Ee)
    };
  }) : [] : []), qe = b(() => Oe.value.some((oe) => {
    let {
      label: Ee
    } = oe;
    return !!Ee;
  })), Ge = {
    activeThumbRef: O,
    color: ae(t, "color"),
    decimals: m,
    disabled: P,
    direction: ae(t, "direction"),
    elevation: ae(t, "elevation"),
    hasLabels: qe,
    isReversed: r,
    indexFromEnd: u,
    min: d,
    max: v,
    mousePressed: V,
    numTicks: I,
    onSliderMousedown: K,
    onSliderTouchstart: Ce,
    parsedTicks: Oe,
    parseMouseMove: k,
    position: X,
    readonly: ae(t, "readonly"),
    rounded: ae(t, "rounded"),
    roundValue: g,
    showTicks: te,
    startOffset: T,
    step: h,
    thumbSize: _,
    thumbColor: x,
    thumbLabel: ae(t, "thumbLabel"),
    ticks: ae(t, "ticks"),
    tickSize: S,
    trackColor: C,
    trackContainerRef: D,
    trackFillColor: $,
    trackSize: N,
    vertical: f
  };
  return yt(Cr, Ge), Ge;
}, E1 = W({
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
  ...Te()
}, "VSliderThumb"), x1 = de()({
  name: "VSliderThumb",
  directives: {
    Ripple: Wi
  },
  props: E1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = je(Cr), {
      isRtl: s,
      rtlClasses: l
    } = Bt();
    if (!i) throw new Error("[Vuetify] v-slider-thumb must be used inside v-slider or v-range-slider");
    const {
      thumbColor: a,
      step: r,
      disabled: f,
      thumbSize: u,
      thumbLabel: d,
      direction: v,
      isReversed: h,
      vertical: m,
      readonly: g,
      elevation: _,
      mousePressed: S,
      decimals: N,
      indexFromEnd: I
    } = i, P = b(() => f.value ? void 0 : _.value), {
      elevationClasses: x
    } = jn(P), {
      textColorClasses: C,
      textColorStyles: $
    } = Mt(a), {
      pageup: V,
      pagedown: T,
      end: D,
      home: O,
      left: k,
      right: A,
      down: B,
      up: Q
    } = Iy, re = [V, T, D, O, k, A, B, Q], ne = b(() => r.value ? [1, 2, 3] : [1, 5, 10]);
    function J(K, X) {
      if (!re.includes(K.key)) return;
      K.preventDefault();
      const te = r.value || 0.1, Oe = (e.max - e.min) / te;
      if ([k, A, B, Q].includes(K.key)) {
        const Ge = (m.value ? [s.value ? k : A, h.value ? B : Q] : I.value !== s.value ? [k, Q] : [A, Q]).includes(K.key) ? 1 : -1, oe = K.shiftKey ? 2 : K.ctrlKey ? 1 : 0;
        X = X + Ge * te * ne.value[oe];
      } else if (K.key === O)
        X = e.min;
      else if (K.key === D)
        X = e.max;
      else {
        const qe = K.key === T ? 1 : -1;
        X = X - qe * te * (Oe > 100 ? Oe / 10 : 10);
      }
      return Math.max(e.min, Math.min(e.max, X));
    }
    function Ce(K) {
      const X = J(K, e.modelValue);
      X != null && o("update:modelValue", X);
    }
    return _e(() => {
      const K = be(I.value ? 100 - e.position : e.position, "%");
      return c("div", {
        class: ["v-slider-thumb", {
          "v-slider-thumb--focused": e.focused,
          "v-slider-thumb--pressed": e.focused && S.value
        }, e.class, l.value],
        style: [{
          "--v-slider-thumb-position": K,
          "--v-slider-thumb-size": be(u.value)
        }, e.style],
        role: "slider",
        tabindex: f.value ? -1 : 0,
        "aria-label": e.name,
        "aria-valuemin": e.min,
        "aria-valuemax": e.max,
        "aria-valuenow": e.modelValue,
        "aria-readonly": !!g.value,
        "aria-orientation": v.value,
        onKeydown: g.value ? void 0 : Ce
      }, [c("div", {
        class: ["v-slider-thumb__surface", C.value, x.value],
        style: {
          ...$.value
        }
      }, null), rt(c("div", {
        class: ["v-slider-thumb__ripple", C.value],
        style: $.value
      }, null), [[Rn("ripple"), e.ripple, null, {
        circle: !0,
        center: !0
      }]]), c(v_, {
        origin: "bottom center"
      }, {
        default: () => {
          var X;
          return [rt(c("div", {
            class: "v-slider-thumb__label-container"
          }, [c("div", {
            class: ["v-slider-thumb__label"]
          }, [c("div", null, [((X = n["thumb-label"]) == null ? void 0 : X.call(n, {
            modelValue: e.modelValue
          })) ?? e.modelValue.toFixed(r.value ? N.value : 1)])])]), [[En, d.value && e.focused || d.value === "always"]])];
        }
      })]);
    }), {};
  }
}), V1 = W({
  start: {
    type: Number,
    required: !0
  },
  stop: {
    type: Number,
    required: !0
  },
  ...Te()
}, "VSliderTrack"), N1 = de()({
  name: "VSliderTrack",
  props: V1(),
  emits: {},
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = je(Cr);
    if (!o) throw new Error("[Vuetify] v-slider-track must be inside v-slider or v-range-slider");
    const {
      color: i,
      parsedTicks: s,
      rounded: l,
      showTicks: a,
      tickSize: r,
      trackColor: f,
      trackFillColor: u,
      trackSize: d,
      vertical: v,
      min: h,
      max: m,
      indexFromEnd: g
    } = o, {
      roundedClasses: _
    } = Tt(l), {
      backgroundColorClasses: S,
      backgroundColorStyles: N
    } = At(u), {
      backgroundColorClasses: I,
      backgroundColorStyles: P
    } = At(f), x = b(() => `inset-${v.value ? "block" : "inline"}-${g.value ? "end" : "start"}`), C = b(() => v.value ? "height" : "width"), $ = b(() => ({
      [x.value]: "0%",
      [C.value]: "100%"
    })), V = b(() => e.stop - e.start), T = b(() => ({
      [x.value]: be(e.start, "%"),
      [C.value]: be(V.value, "%")
    })), D = b(() => a.value ? (v.value ? s.value.slice().reverse() : s.value).map((k, A) => {
      var Q;
      const B = k.value !== h.value && k.value !== m.value ? be(k.position, "%") : void 0;
      return c("div", {
        key: k.value,
        class: ["v-slider-track__tick", {
          "v-slider-track__tick--filled": k.position >= e.start && k.position <= e.stop,
          "v-slider-track__tick--first": k.value === h.value,
          "v-slider-track__tick--last": k.value === m.value
        }],
        style: {
          [x.value]: B
        }
      }, [(k.label || n["tick-label"]) && c("div", {
        class: "v-slider-track__tick-label"
      }, [((Q = n["tick-label"]) == null ? void 0 : Q.call(n, {
        tick: k,
        index: A
      })) ?? k.label])]);
    }) : []);
    return _e(() => c("div", {
      class: ["v-slider-track", _.value, e.class],
      style: [{
        "--v-slider-track-size": be(d.value),
        "--v-slider-tick-size": be(r.value)
      }, e.style]
    }, [c("div", {
      class: ["v-slider-track__background", I.value, {
        "v-slider-track__background--opacity": !!i.value || !u.value
      }],
      style: {
        ...$.value,
        ...P.value
      }
    }, null), c("div", {
      class: ["v-slider-track__fill", S.value],
      style: {
        ...T.value,
        ...N.value
      }
    }, null), a.value && c("div", {
      class: ["v-slider-track__ticks", {
        "v-slider-track__ticks--always-show": a.value === "always"
      }]
    }, [D.value])])), {};
  }
}), T1 = W({
  ...br(),
  ...k1(),
  ...Xi(),
  modelValue: {
    type: [Number, String],
    default: 0
  }
}, "VSlider"), O1 = de()({
  name: "VSlider",
  props: T1(),
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
      rtlClasses: s
    } = Bt(), l = S1(e), a = Ye(e, "modelValue", void 0, (C) => l.roundValue(C ?? l.min.value)), {
      min: r,
      max: f,
      mousePressed: u,
      roundValue: d,
      onSliderMousedown: v,
      onSliderTouchstart: h,
      trackContainerRef: m,
      position: g,
      hasLabels: _,
      readonly: S
    } = C1({
      props: e,
      steps: l,
      onSliderStart: () => {
        o("start", a.value);
      },
      onSliderEnd: (C) => {
        let {
          value: $
        } = C;
        const V = d($);
        a.value = V, o("end", V);
      },
      onSliderMove: (C) => {
        let {
          value: $
        } = C;
        return a.value = d($);
      },
      getActiveThumb: () => {
        var C;
        return (C = i.value) == null ? void 0 : C.$el;
      }
    }), {
      isFocused: N,
      focus: I,
      blur: P
    } = Yi(e), x = b(() => g(a.value));
    return _e(() => {
      const C = io.filterProps(e), $ = !!(e.label || n.label || n.prepend);
      return c(io, xe({
        class: ["v-slider", {
          "v-slider--has-labels": !!n["tick-label"] || _.value,
          "v-slider--focused": N.value,
          "v-slider--pressed": u.value,
          "v-slider--disabled": e.disabled
        }, s.value, e.class],
        style: e.style
      }, C, {
        focused: N.value
      }), {
        ...n,
        prepend: $ ? (V) => {
          var T, D;
          return c(Ve, null, [((T = n.label) == null ? void 0 : T.call(n, V)) ?? (e.label ? c(pr, {
            id: V.id.value,
            class: "v-slider__label",
            text: e.label
          }, null) : void 0), (D = n.prepend) == null ? void 0 : D.call(n, V)]);
        } : void 0,
        default: (V) => {
          let {
            id: T,
            messagesId: D
          } = V;
          return c("div", {
            class: "v-slider__container",
            onMousedown: S.value ? void 0 : v,
            onTouchstartPassive: S.value ? void 0 : h
          }, [c("input", {
            id: T.value,
            name: e.name || T.value,
            disabled: !!e.disabled,
            readonly: !!e.readonly,
            tabindex: "-1",
            value: a.value
          }, null), c(N1, {
            ref: m,
            start: 0,
            stop: x.value
          }, {
            "tick-label": n["tick-label"]
          }), c(x1, {
            ref: i,
            "aria-describedby": D.value,
            focused: N.value,
            min: r.value,
            max: f.value,
            modelValue: a.value,
            "onUpdate:modelValue": (O) => a.value = O,
            position: x.value,
            elevation: e.elevation,
            onFocus: I,
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
}), A1 = {
  name: "Settings",
  emits: ["update", "open-themes"],
  computed: {
    // 设置面板里的 4 个快捷图标（纯色主题）
    quick_themes: function() {
      return this.themes.filter((e) => e.type === "solid");
    }
  },
  mounted: function() {
    var e, t, n, o, i, s, l, a, r, f, u, d;
    this.opt = {
      flow: ((e = this.settings) == null ? void 0 : e.flow) || this.opt.flow,
      theme: ((t = this.settings) == null ? void 0 : t.theme) || this.opt.theme,
      theme_mode: ((n = this.settings) == null ? void 0 : n.theme_mode) || this.opt.theme_mode,
      font_size: ((o = this.settings) == null ? void 0 : o.font_size) || this.opt.font_size,
      line_height: ((i = this.settings) == null ? void 0 : i.line_height) || this.opt.line_height,
      letter_spacing: ((s = this.settings) == null ? void 0 : s.letter_spacing) || this.opt.letter_spacing,
      brightness: ((l = this.settings) == null ? void 0 : l.brightness) || this.opt.brightness,
      show_comments: ((a = this.settings) == null ? void 0 : a.show_comments) ?? this.opt.show_comments,
      notes_enabled: ((r = this.settings) == null ? void 0 : r.notes_enabled) ?? this.opt.notes_enabled,
      show_selection_toolbar: ((f = this.settings) == null ? void 0 : f.show_selection_toolbar) ?? this.opt.show_selection_toolbar,
      paging_control: ((u = this.settings) == null ? void 0 : u.paging_control) || this.opt.paging_control,
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
    themes: to
  })
}, I1 = { class: "d-inline-blockx text-center" }, P1 = { class: "d-inline-blockx text-center" }, D1 = { class: "d-inline-blockx text-center" }, $1 = { class: "note-settings" }, M1 = ["id"];
function F1(e, t, n, o, i, s) {
  return G(), fe(wn, { density: "compact" }, {
    default: p(() => [
      c(He, { class: "my-2" }, {
        default: p(() => [
          c(zt, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[18] || (t[18] = [
                  le("span", null, "亮度", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "9" }, {
                default: p(() => [
                  c(O1, {
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
      c(He, { class: "my-2" }, {
        default: p(() => [
          c(zt, { class: "align-center gx-3" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[19] || (t[19] = [
                  le("span", { class: "text-justify" }, "字体", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "2" }, {
                default: p(() => [
                  c(ue, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[2] || (t[2] = (l) => s.set_and_emit("font_size", e.opt.font_size - 2))
                  }, {
                    default: p(() => t[20] || (t[20] = [
                      j("A-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              c(Ie, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: p(() => [
                  le("span", I1, Ne(e.opt.font_size), 1)
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ue, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[3] || (t[3] = (l) => s.set_and_emit("font_size", e.opt.font_size + 2))
                  }, {
                    default: p(() => t[21] || (t[21] = [
                      j("A+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ue, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[4] || (t[4] = (l) => s.set_and_emit("font_size", 18))
                  }, {
                    default: p(() => t[22] || (t[22] = [
                      j("默认")
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
      c(He, { class: "my-2" }, {
        default: p(() => [
          c(zt, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[23] || (t[23] = [
                  le("span", null, "行距", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "2" }, {
                default: p(() => [
                  c(ue, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[5] || (t[5] = (l) => s.set_and_emit("line_height", e.opt.line_height - 0.1))
                  }, {
                    default: p(() => t[24] || (t[24] = [
                      j("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              c(Ie, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: p(() => [
                  le("span", P1, Ne(e.opt.line_height.toFixed(1)), 1)
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ue, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[6] || (t[6] = (l) => s.set_and_emit("line_height", e.opt.line_height + 0.1))
                  }, {
                    default: p(() => t[25] || (t[25] = [
                      j("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ue, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[7] || (t[7] = (l) => s.set_and_emit("line_height", 1.5))
                  }, {
                    default: p(() => t[26] || (t[26] = [
                      j("默认")
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
      c(He, { class: "my-2" }, {
        default: p(() => [
          c(zt, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[27] || (t[27] = [
                  le("span", null, "间距", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "2" }, {
                default: p(() => [
                  c(ue, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[8] || (t[8] = (l) => s.set_and_emit("letter_spacing", e.opt.letter_spacing - 1))
                  }, {
                    default: p(() => t[28] || (t[28] = [
                      j("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              c(Ie, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: p(() => [
                  le("span", D1, Ne(e.opt.letter_spacing) + "px", 1)
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ue, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[9] || (t[9] = (l) => s.set_and_emit("letter_spacing", e.opt.letter_spacing + 1))
                  }, {
                    default: p(() => t[29] || (t[29] = [
                      j("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ue, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[10] || (t[10] = (l) => s.set_and_emit("letter_spacing", 0))
                  }, {
                    default: p(() => t[30] || (t[30] = [
                      j("默认")
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
      c(He, { class: "my-2" }, {
        default: p(() => [
          c(zt, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[31] || (t[31] = [
                  le("span", null, "翻页", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "10" }, {
                default: p(() => [
                  c(zo, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: p(() => [
                      c(ue, {
                        active: e.opt.flow == "paginated",
                        onClick: t[11] || (t[11] = (l) => s.set_and_emit("flow", "paginated"))
                      }, {
                        default: p(() => t[32] || (t[32] = [
                          j("左右点击")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      c(ue, {
                        active: e.opt.flow == "scrolled",
                        onClick: t[12] || (t[12] = (l) => s.set_and_emit("flow", "scrolled"))
                      }, {
                        default: p(() => t[33] || (t[33] = [
                          j("上下滑动")
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
      c(He, { class: "my-2" }, {
        default: p(() => [
          c(zt, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[34] || (t[34] = [
                  le("span", null, "控制", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "10" }, {
                default: p(() => [
                  c(zo, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: p(() => [
                      c(ue, {
                        active: e.opt.paging_control == "mouse_and_keyboard",
                        onClick: t[13] || (t[13] = (l) => s.set_and_emit("paging_control", "mouse_and_keyboard"))
                      }, {
                        default: p(() => t[35] || (t[35] = [
                          j("鼠标+键盘")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      c(ue, {
                        active: e.opt.paging_control == "keyboard_only",
                        onClick: t[14] || (t[14] = (l) => s.set_and_emit("paging_control", "keyboard_only"))
                      }, {
                        default: p(() => t[36] || (t[36] = [
                          j("仅键盘")
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
      c(He, { class: "my-2" }, {
        default: p(() => [
          c(zt, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[37] || (t[37] = [
                  le("span", { density: "compact" }, "滚轮翻页", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "10" }, {
                default: p(() => [
                  c(zo, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: p(() => [
                      c(ue, {
                        active: e.opt.wheel_paging == !0,
                        onClick: t[15] || (t[15] = (l) => s.set_and_emit("wheel_paging", !0))
                      }, {
                        default: p(() => t[38] || (t[38] = [
                          j("开启")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      c(ue, {
                        active: e.opt.wheel_paging == !1,
                        onClick: t[16] || (t[16] = (l) => s.set_and_emit("wheel_paging", !1))
                      }, {
                        default: p(() => t[39] || (t[39] = [
                          j("关闭")
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
      le("fieldset", $1, [
        t[42] || (t[42] = le("legend", { class: "sr-only" }, "笔记设置", -1)),
        (G(!0), ze(Ve, null, qt(e.note_options, (l) => (G(), fe(He, {
          key: l.key,
          class: "my-2",
          "data-setting": l.key
        }, {
          default: p(() => [
            le("div", {
              class: Wt(["d-flex align-center justify-space-between flex-wrap ga-2", { "note-suboption": l.child, "note-suboption-disabled": l.child && !e.opt.notes_enabled }])
            }, [
              le("span", {
                id: `setting-${l.key}`,
                class: Wt({ "font-weight-medium": !l.child })
              }, Ne(l.label), 11, M1),
              c(zo, {
                variant: "outlined",
                divided: "",
                density: "default",
                class: "note-setting-buttons",
                role: "group",
                "aria-labelledby": `setting-${l.key}`
              }, {
                default: p(() => [
                  c(ue, {
                    disabled: l.child && !e.opt.notes_enabled,
                    active: e.opt[l.key] === !0,
                    "aria-pressed": e.opt[l.key] === !0,
                    onClick: (a) => s.set_and_emit(l.key, !0)
                  }, {
                    default: p(() => t[40] || (t[40] = [
                      j("开启")
                    ])),
                    _: 2
                  }, 1032, ["disabled", "active", "aria-pressed", "onClick"]),
                  c(ue, {
                    disabled: l.child && !e.opt.notes_enabled,
                    active: e.opt[l.key] === !1,
                    "aria-pressed": e.opt[l.key] === !1,
                    onClick: (a) => s.set_and_emit(l.key, !1)
                  }, {
                    default: p(() => t[41] || (t[41] = [
                      j("关闭")
                    ])),
                    _: 2
                  }, 1032, ["disabled", "active", "aria-pressed", "onClick"])
                ]),
                _: 2
              }, 1032, ["aria-labelledby"])
            ], 2)
          ]),
          _: 2
        }, 1032, ["data-setting"]))), 128))
      ]),
      c(He, { class: "my-2" }, {
        default: p(() => [
          c(zt, {
            class: "align-center",
            "no-gutters": ""
          }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[43] || (t[43] = [
                  le("span", { density: "compact" }, "皮肤", -1)
                ])),
                _: 1
              }),
              (G(!0), ze(Ve, null, qt(s.quick_themes, (l) => (G(), fe(Ie, {
                key: l.id,
                class: "text-center"
              }, {
                default: p(() => [
                  c(ue, {
                    active: e.opt.theme == l.id,
                    density: "compact",
                    icon: l.icon,
                    color: l.bg,
                    onClick: (a) => s.set_theme_and_emit(l.id, l.mode)
                  }, null, 8, ["active", "icon", "color", "onClick"])
                ]),
                _: 2
              }, 1024))), 128)),
              c(Ie, {
                cols: "3",
                class: "text-right"
              }, {
                default: p(() => [
                  c(ue, {
                    variant: "text",
                    density: "compact",
                    size: "small",
                    "append-icon": "mdi-chevron-right",
                    onClick: t[17] || (t[17] = (l) => e.$emit("open-themes"))
                  }, {
                    default: p(() => t[44] || (t[44] = [
                      j("更多")
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
const nv = /* @__PURE__ */ Vn(A1, [["render", F1], ["__scopeId", "data-v-21b0dea8"]]), _a = "data-candle-audiobook-active", Er = "candle-audiobook", xr = "candle-audiobook-active";
function Zo(e) {
  return String(e || "").replace(/\s+/g, "").trim();
}
function B1(e, t) {
  let n = 0, o = e.length - 1, i = -1;
  for (; n <= o; ) {
    const l = Math.floor((n + o) / 2);
    Number(e[l].start_ms) <= t ? (i = l, n = l + 1) : o = l - 1;
  }
  if (i < 0) return null;
  const s = e[i];
  return t < Number(s.end_ms) ? s : null;
}
function wc(e) {
  return decodeURIComponent(String(e || "").split(/[?#]/)[0]).replace(/^\.\//, "").replace(/^\//, "");
}
function wa(e, t) {
  const n = wc(e), o = wc(t);
  return !n || !o ? !1 : n === o || n.endsWith(`/${o}`) || o.endsWith(`/${n}`) || n.split("/").pop() === o.split("/").pop();
}
function ov(e) {
  var t, n, o, i;
  return ((t = e == null ? void 0 : e.section) == null ? void 0 : t.href) || ((n = e == null ? void 0 : e.section) == null ? void 0 : n.url) || ((i = (o = e == null ? void 0 : e.document) == null ? void 0 : o.location) == null ? void 0 : i.pathname) || "";
}
function Hl(e, t) {
  var s, l, a;
  const n = ((s = e == null ? void 0 : e.views) == null ? void 0 : s.call(e)) || [];
  let o = null;
  if ((l = n.forEach) == null || l.call(n, (r) => {
    var f, u;
    !o && wa(((f = r == null ? void 0 : r.section) == null ? void 0 : f.href) || ((u = r == null ? void 0 : r.section) == null ? void 0 : u.url), t) && (o = r);
  }), o != null && o.contents) return o.contents;
  const i = ((a = e == null ? void 0 : e.getContents) == null ? void 0 : a.call(e)) || [];
  return t ? i.find((r) => wa(ov(r), t)) || null : i[0] || null;
}
function L1(e, t) {
  return Array.from((e == null ? void 0 : e.children) || []).filter((n) => {
    var o;
    return ((o = n.localName) == null ? void 0 : o.toLowerCase()) === t;
  });
}
function R1(e, t) {
  const n = String(t || "").replace(/^\/+/, "").split("/").filter(Boolean);
  if (!n.length) return null;
  let o = e.documentElement;
  for (const i of n) {
    const s = i.match(/^([\w-]+)(?:\[(\d+)\])?$/);
    if (!s) return null;
    const l = s[1].toLowerCase(), a = Math.max(0, Number(s[2] || 1) - 1);
    if (l === "html") {
      o = e.documentElement;
      continue;
    }
    if (l === "body") {
      o = e.body;
      continue;
    }
    if (o = L1(o, l)[a], !o) return null;
  }
  return o;
}
function H1(e, t) {
  const n = Zo(t);
  if (!n) return null;
  const o = e.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, div");
  return Array.from(o).find((i) => {
    const s = Zo(i.textContent);
    return s === n || s.includes(n) || n.includes(s);
  }) || null;
}
function j1(e, t) {
  const n = e == null ? void 0 : e.document, o = (t == null ? void 0 : t.locator) || {};
  if (!n) return null;
  let i = o.element_id ? n.getElementById(o.element_id) : null;
  return !i && o.dom_path && (i = R1(n, o.dom_path)), i || (i = H1(n, t.text)), i ? { document: n, element: i, locator: o } : null;
}
function z1(e) {
  const t = [], n = e.ownerDocument.createTreeWalker(e, NodeFilter.SHOW_TEXT);
  let o = n.nextNode();
  for (; o; )
    t.push(o), o = n.nextNode();
  return t;
}
function kc(e, t) {
  let n = Math.max(0, t);
  for (const i of e) {
    if (n <= i.data.length) return { node: i, offset: n };
    n -= i.data.length;
  }
  const o = e[e.length - 1];
  return o ? { node: o, offset: o.data.length } : null;
}
function U1(e, t, n) {
  const o = z1(e);
  if (!o.length) return null;
  const i = o.reduce((d, v) => d + v.data.length, 0), s = Math.min(i, Math.max(0, Number(t) || 0)), l = Number(n), a = Math.min(i, Number.isFinite(l) && l > s ? l : i), r = kc(o, s), f = kc(o, a);
  if (!r || !f) return null;
  const u = e.ownerDocument.createRange();
  return u.setStart(r.node, r.offset), u.setEnd(f.node, f.offset), u;
}
function W1(e) {
  if (e.getElementById("candle-audiobook-highlight-style")) return;
  const t = e.createElement("style");
  t.id = "candle-audiobook-highlight-style", t.textContent = `
    ::highlight(${Er}) {
      background: rgba(245, 166, 35, .34);
      text-decoration: underline 2px rgba(180, 92, 0, .75);
      text-underline-offset: .18em;
    }
    .${xr} {
      background: rgba(245, 166, 35, .2) !important;
      box-shadow: inset 3px 0 rgba(180, 92, 0, .72);
    }
  `, e.head.appendChild(t);
}
function iv(e) {
  var n;
  (((n = e == null ? void 0 : e.getContents) == null ? void 0 : n.call(e)) || []).forEach((o) => {
    var s, l, a;
    const i = o.document;
    i && ((a = (l = (s = i.defaultView) == null ? void 0 : s.CSS) == null ? void 0 : l.highlights) == null || a.delete(Er), i.querySelectorAll(`[${_a}]`).forEach((r) => {
      r.removeAttribute(_a), r.classList.remove(xr);
    }));
  });
}
function q1(e, t, n) {
  var f, u;
  iv(e);
  const o = j1(t, n);
  if (!o) return null;
  const { document: i, element: s, locator: l } = o;
  W1(i), s.setAttribute(_a, n.id || ""), s.classList.add(xr);
  const a = U1(s, l.start_char, l.end_char), r = i.defaultView;
  return a && ((f = r == null ? void 0 : r.CSS) != null && f.highlights) && r.Highlight && r.CSS.highlights.set(Er, new r.Highlight(a)), (u = s.scrollIntoView) == null || u.call(s, { block: "center", behavior: "smooth" }), { contents: t, document: i, element: s, range: a };
}
function G1(e, t) {
  return wa(e == null ? void 0 : e.source_key, t);
}
function K1(e, t) {
  var i;
  if (!e || !t) return !1;
  if ((i = e.locator) != null && i.element_id && e.locator.element_id === t.id) return !0;
  const n = Zo(e.text), o = Zo(t.textContent);
  return !!(n && o && (o.includes(n) || n.includes(o)));
}
const Y1 = {
  key: 0,
  class: "audiobook-player",
  "data-testid": "candle-audiobook-player",
  "aria-label": "边听边读播放器"
}, X1 = { class: "player-heading" }, J1 = {
  key: 0,
  class: "player-error",
  role: "alert"
}, Z1 = { class: "player-controls" }, Q1 = ["disabled"], ew = ["aria-label", "disabled"], tw = ["disabled"], nw = { class: "time" }, ow = ["max", "value"], iw = { class: "time" }, sw = { class: "rate-control" }, lw = ["value"], aw = 50, rw = 100, uw = 40, cw = {
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
    const o = e, i = n, s = se(null), l = se(null), a = se(null), r = se([]), f = se(null), u = se(!1), d = se(!1), v = se(""), h = se(0), m = se(0), g = se(1), _ = se(!0), S = se(""), N = se(0), I = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];
    let P = null, x = null, C = null, $ = "", V = 0, T = 0;
    const D = b(() => {
      var M;
      return ((M = l.value) == null ? void 0 : M.chapters) || [];
    }), O = b(() => D.value.findIndex((M) => {
      var H;
      return M.id === ((H = a.value) == null ? void 0 : H.id);
    })), k = b(() => `candle:audiobook:${o.editionId || "manifest"}`);
    ke(
      () => [o.visible, o.editionId, o.manifestUrl],
      ([M]) => {
        M && B();
      },
      { immediate: !0 }
    ), ke(
      () => o.rendition,
      (M, H) => {
        var ye, ge;
        (ye = H == null ? void 0 : H.off) == null || ye.call(H, "rendered", qn), (ge = M == null ? void 0 : M.on) == null || ge.call(M, "rendered", qn);
      },
      { immediate: !0 }
    );
    function A() {
      return o.manifestUrl || (o.editionId ? `/api/audiobooks/${o.editionId}/manifest` : "");
    }
    function B() {
      return l.value || !A() ? Promise.resolve() : C || (C = Q().finally(() => {
        C = null;
      }), C);
    }
    async function Q() {
      var M, H, ye, ge;
      d.value = !0, v.value = "";
      try {
        const ce = await o.request(A());
        if (ce.err !== "ok" || !((H = (M = ce.manifest) == null ? void 0 : M.chapters) != null && H.length))
          throw new Error(ce.msg || "当前书籍没有可播放章节");
        l.value = ce.manifest, N.value = ((ye = ce.progress) == null ? void 0 : ye.version) || 0;
        const Ae = U(), et = D.value.find((ft) => {
          var Ht;
          return ft.id === ((Ht = ce.progress) == null ? void 0 : Ht.chapter_id);
        }) || D.value.find((ft) => ft.number === Ae.chapterNumber) || D.value[0], ot = ((ge = ce.progress) == null ? void 0 : ge.position_ms) ?? Ae.positionMs ?? 0;
        g.value = Ae.rate || 1, await ne(et, { startMs: ot, autoplay: !1, navigate: !1 });
      } catch (ce) {
        v.value = (ce == null ? void 0 : ce.message) || "有声书加载失败";
      } finally {
        d.value = !1;
      }
    }
    async function re(M) {
      var ge;
      const H = M.timeline_url || `/api/audiobooks/${l.value.id}/chapters/${M.number}/timeline`, ye = await o.request(H);
      r.value = ye.err === "ok" ? ((ge = ye.timeline) == null ? void 0 : ge.segments) || [] : [];
    }
    async function ne(M, { startMs: H = 0, autoplay: ye = !1, navigate: ge = !0 } = {}) {
      if (M) {
        d.value = !0, v.value = "", y();
        try {
          a.value = M, h.value = Math.max(0, Number(H) || 0), m.value = Number(M.duration_ms) || 0, await re(M), ge && _.value && await J(M), await at();
          const ce = s.value;
          if (!ce) return;
          const Ae = new URL(M.audio_url, window.location.href).href;
          ce.src !== Ae && (ce.src = M.audio_url, ce.load()), await Oe(ce), ce.playbackRate = g.value, ce.currentTime = Math.min(h.value / 1e3, ce.duration || 1 / 0), pe(), Rt(!0), ye && await K();
        } catch (ce) {
          v.value = (ce == null ? void 0 : ce.message) || "章节音频加载失败";
        } finally {
          d.value = !1;
        }
      }
    }
    async function J(M) {
      !o.rendition || !(M != null && M.source_key) || await o.rendition.display(M.source_key);
    }
    async function Ce() {
      if (S.value || !l.value) return;
      const M = await o.request(`/api/audiobooks/${l.value.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "candle", device_id: "candle-reader" })
      });
      M.err === "ok" && (S.value = M.session_id || "");
    }
    async function K() {
      const M = s.value;
      if (M) {
        await Ce(), M.playbackRate = g.value;
        try {
          await M.play();
        } catch (H) {
          v.value = (H == null ? void 0 : H.name) === "NotAllowedError" ? "请再次点击播放" : "无法播放章节音频";
        }
      }
    }
    async function X() {
      l.value || await B();
      const M = s.value;
      !M || !a.value || (M.paused ? await K() : M.pause());
    }
    function te() {
      const M = s.value;
      M && (m.value = Number.isFinite(M.duration) ? Math.round(M.duration * 1e3) : m.value);
    }
    function Oe(M) {
      return M.readyState >= HTMLMediaElement.HAVE_METADATA ? Promise.resolve() : new Promise((H, ye) => {
        const ge = () => {
          Ae(), H();
        }, ce = () => {
          Ae(), ye(new Error("章节音频元数据加载失败"));
        }, Ae = () => {
          M.removeEventListener("loadedmetadata", ge), M.removeEventListener("error", ce);
        };
        M.addEventListener("loadedmetadata", ge), M.addEventListener("error", ce);
      });
    }
    function qe() {
      u.value = !0, T = Date.now(), Rt(!0), Le(), ie();
    }
    function Ge() {
      u.value = !1, nt(), Qe(), Y(!0), pe();
    }
    async function oe() {
      u.value = !1, nt(), await Y(!0, O.value === D.value.length - 1), O.value < D.value.length - 1 && await ne(D.value[O.value + 1], { autoplay: !0 });
    }
    function Ee() {
      var M;
      (M = s.value) != null && M.src && (v.value = "章节音频加载失败", u.value = !1, nt());
    }
    function Le() {
      nt(), P = window.setInterval(Qe, 150), x = window.setInterval(() => void Y(), 1e4);
    }
    function nt() {
      P && window.clearInterval(P), x && window.clearInterval(x), P = null, x = null;
    }
    function Qe() {
      const M = s.value;
      M && (h.value = Math.round(M.currentTime * 1e3), Rt(), pe());
    }
    function Rt(M = !1) {
      const H = B1(r.value, h.value), ye = (H == null ? void 0 : H.id) || "";
      if (!(!M && ye === $)) {
        if ($ = ye, f.value = H, i("segment-change", H), !H || !_.value || !u.value) {
          y();
          return;
        }
        Wn(H);
      }
    }
    async function Wn(M) {
      var Ae, et;
      const H = ++V, ge = (M.locator || {}).href || ((Ae = a.value) == null ? void 0 : Ae.source_key);
      let ce = Hl(o.rendition, ge);
      !ce && o.rendition && _.value && await o.rendition.display(ge);
      for (let ot = 0; ot < uw; ot += 1) {
        if (H !== V || !_.value) return;
        if (ce = Hl(o.rendition, ge), ce && q1(o.rendition, ce, M)) {
          if (await new Promise((st) => window.setTimeout(st, rw)), H !== V || !_.value) return;
          const ft = Hl(o.rendition, ge), Ht = (et = ft == null ? void 0 : ft.document) == null ? void 0 : et.querySelector("[data-candle-audiobook-active]");
          if ((Ht == null ? void 0 : Ht.getAttribute("data-candle-audiobook-active")) === M.id) return;
        }
        await new Promise((ft) => window.setTimeout(ft, aw));
      }
      H === V && _.value && console.warn("[candle-audiobook] 无法定位时间轴片段", M.id);
    }
    function qn() {
      f.value && _.value && u.value && Wn(f.value);
    }
    function y() {
      V += 1, iv(o.rendition);
    }
    function w() {
      !a.value || !f.value || (_.value = !1, y());
    }
    async function F() {
      _.value = !0, f.value && await Wn(f.value);
    }
    function z(M) {
      const H = s.value;
      h.value = Math.max(0, Math.min(m.value, M)), H && (H.currentTime = h.value / 1e3), Rt(!0), pe();
    }
    function L() {
      s.value && (s.value.playbackRate = g.value), pe();
    }
    async function R() {
      O.value > 0 && await ne(D.value[O.value - 1], { autoplay: u.value });
    }
    async function ee() {
      O.value < D.value.length - 1 && await ne(D.value[O.value + 1], { autoplay: u.value });
    }
    async function Z(M) {
      var Ht, st, It, co, Vr, Ji, Nr, Tr, Or;
      if (l.value || await B(), !l.value || !M) return !1;
      _.value = !0;
      const H = ((Ht = M.toc) == null ? void 0 : Ht.href) || ((st = M.toc) == null ? void 0 : st.id) || ov(M.contents), ye = D.value.find((fo) => G1(fo, H)) || a.value || D.value[0];
      (ye == null ? void 0 : ye.id) !== ((It = a.value) == null ? void 0 : It.id) && await ne(ye, { navigate: !1 });
      const ge = ((Vr = (co = M.cfi) == null ? void 0 : co.toString) == null ? void 0 : Vr.call(co)) || M.cfi, ce = ge && ((Nr = (Ji = o.rendition) == null ? void 0 : Ji.getRange) == null ? void 0 : Nr.call(Ji, ge)), Ae = ((Tr = ce == null ? void 0 : ce.startContainer) == null ? void 0 : Tr.nodeType) === Node.TEXT_NODE ? ce.startContainer.parentElement : ce == null ? void 0 : ce.startContainer, et = ((Or = Ae == null ? void 0 : Ae.closest) == null ? void 0 : Or.call(Ae, "p, h1, h2, h3, h4, h5, h6, li, blockquote")) || null, ot = Zo(et == null ? void 0 : et.textContent), ft = ot && r.value.find((fo) => Zo(fo.text) === ot) || et && r.value.find((fo) => K1(fo, et)) || r.value.find((fo) => Number(fo.index) === Number(M.segment_id));
      return ft ? (await ne(ye, { startMs: ft.start_ms, autoplay: !0, navigate: !0 }), !0) : !1;
    }
    async function Y(M = !1, H = !1) {
      var Ae;
      if (!S.value || !a.value) return;
      const ye = Date.now(), ge = u.value && T ? Math.min(6e4, Math.max(0, ye - T)) : 0;
      if (!M && ge < 9e3) return;
      T = ye;
      const ce = await o.request(`/api/audiobook-sessions/${S.value}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: a.value.id,
          position_ms: h.value,
          segment_id: ((Ae = f.value) == null ? void 0 : Ae.id) || "",
          listened_delta_ms: ge,
          completed: H,
          version: N.value
        })
      });
      (ce.err === "ok" || ce.err === "progress.conflict") && (N.value = ce.version || N.value);
    }
    function U() {
      try {
        return JSON.parse(localStorage.getItem(k.value) || "{}");
      } catch {
        return {};
      }
    }
    function pe() {
      a.value && localStorage.setItem(k.value, JSON.stringify({
        chapterNumber: a.value.number,
        positionMs: h.value,
        rate: g.value
      }));
    }
    function ie() {
      !("mediaSession" in navigator) || !a.value || (navigator.mediaSession.metadata = new MediaMetadata({ title: a.value.title, album: "边听边读" }), navigator.mediaSession.setActionHandler("play", K), navigator.mediaSession.setActionHandler("pause", () => {
        var M;
        return (M = s.value) == null ? void 0 : M.pause();
      }), navigator.mediaSession.setActionHandler("previoustrack", R), navigator.mediaSession.setActionHandler("nexttrack", ee));
    }
    function ve(M) {
      const H = Math.max(0, Math.floor((M || 0) / 1e3));
      return `${Math.floor(H / 60)}:${String(H % 60).padStart(2, "0")}`;
    }
    return kt(() => {
      var M, H;
      nt(), (H = (M = o.rendition) == null ? void 0 : M.off) == null || H.call(M, "rendered", qn), y(), S.value && o.request(`/api/audiobook-sessions/${S.value}`, { method: "POST" });
    }), t({ loadManifest: B, playFromSelection: Z, returnToNarration: F, suspendFollow: w }), (M, H) => {
      var ye, ge;
      return e.visible ? (G(), ze("section", Y1, [
        le("header", X1, [
          le("div", null, [
            H[3] || (H[3] = le("span", { class: "player-kicker" }, "边听边读", -1)),
            le("strong", null, Ne(((ye = a.value) == null ? void 0 : ye.title) || "正在载入有声书"), 1)
          ]),
          le("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "关闭听书播放器",
            onClick: H[0] || (H[0] = (ce) => i("close"))
          }, [
            c(De, { size: "20" }, {
              default: p(() => H[4] || (H[4] = [
                j("mdi-close")
              ])),
              _: 1
            })
          ])
        ]),
        le("p", {
          class: Wt(["active-dialogue", { muted: !f.value }])
        }, Ne(((ge = f.value) == null ? void 0 : ge.text) || (d.value ? "正在加载章节时间轴…" : "片段间留白")), 3),
        v.value ? (G(), ze("div", J1, Ne(v.value), 1)) : Re("", !0),
        le("div", Z1, [
          le("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "上一章",
            disabled: O.value <= 0,
            onClick: R
          }, [
            c(De, null, {
              default: p(() => H[5] || (H[5] = [
                j("mdi-skip-previous")
              ])),
              _: 1
            })
          ], 8, Q1),
          le("button", {
            type: "button",
            class: "play-button",
            "aria-label": u.value ? "暂停听书" : "播放听书",
            disabled: d.value || !a.value,
            onClick: X
          }, [
            c(De, null, {
              default: p(() => [
                j(Ne(u.value ? "mdi-pause" : "mdi-play"), 1)
              ]),
              _: 1
            })
          ], 8, ew),
          le("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "下一章",
            disabled: O.value >= D.value.length - 1,
            onClick: ee
          }, [
            c(De, null, {
              default: p(() => H[6] || (H[6] = [
                j("mdi-skip-next")
              ])),
              _: 1
            })
          ], 8, tw),
          le("span", nw, Ne(ve(h.value)), 1),
          le("input", {
            class: "timeline-slider",
            type: "range",
            min: "0",
            max: Math.max(m.value, 1),
            step: "100",
            value: h.value,
            "aria-label": "听书进度",
            onInput: H[1] || (H[1] = (ce) => z(Number(ce.target.value)))
          }, null, 40, ow),
          le("span", iw, Ne(ve(m.value)), 1),
          le("label", sw, [
            H[7] || (H[7] = le("span", { class: "sr-only" }, "播放速度", -1)),
            rt(le("select", {
              "onUpdate:modelValue": H[2] || (H[2] = (ce) => g.value = ce),
              "aria-label": "播放速度",
              onChange: L
            }, [
              (G(), ze(Ve, null, qt(I, (ce) => le("option", {
                key: ce,
                value: ce
              }, "x" + Ne(ce), 9, lw)), 64))
            ], 544), [
              [
                by,
                g.value,
                void 0,
                { number: !0 }
              ]
            ])
          ])
        ]),
        _.value ? Re("", !0) : (G(), ze("button", {
          key: 1,
          type: "button",
          class: "return-button",
          "data-testid": "return-to-narration",
          onClick: F
        }, [
          c(De, { size: "18" }, {
            default: p(() => H[8] || (H[8] = [
              j("mdi-target")
            ])),
            _: 1
          }),
          H[9] || (H[9] = j(" 回到朗读位置 "))
        ])),
        le("audio", {
          ref_key: "audioElement",
          ref: s,
          preload: "metadata",
          onLoadedmetadata: te,
          onPlay: qe,
          onPause: Ge,
          onEnded: oe,
          onError: Ee
        }, null, 544)
      ])) : Re("", !0);
    };
  }
}, sv = /* @__PURE__ */ Vn(cw, [["__scopeId", "data-v-f2028a04"]]);
function dw(e = {}) {
  const t = e.show_comments ?? !0, n = e.show_annotations ?? !0;
  return {
    notes_settings_version: 2,
    notes_enabled: e.notes_enabled ?? (t || n),
    show_comments: t,
    show_selection_toolbar: e.show_selection_toolbar ?? n
  };
}
const fw = "candle-reader:annotations:v1:";
function Sc(e) {
  return e.client_id || e.id;
}
function ka() {
  var e;
  return (e = window.crypto) != null && e.randomUUID ? window.crypto.randomUUID() : `candle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function mw(e) {
  const t = Array.isArray(e) ? e : e == null ? void 0 : e.annotations;
  if (!Array.isArray(t)) throw new Error("读取笔记的回调必须返回数组或 { annotations }");
  return t;
}
function vw(e) {
  const t = (e == null ? void 0 : e.annotation) || e;
  if (!t || typeof t != "object" || Array.isArray(t))
    throw new Error("写入笔记的回调必须返回笔记对象或 { annotation }");
  return t;
}
function hw(e, t) {
  return `${fw}${encodeURIComponent(String(e || t || "unknown-book"))}`;
}
function gw({ bookId: e, bookUrl: t, storage: n } = {}) {
  const o = hw(e, t);
  let i = n;
  if (i === void 0)
    try {
      i = window.localStorage;
    } catch {
      throw new Error("浏览器禁止访问本地存储，无法保存笔记");
    }
  if (!i) throw new Error("浏览器不支持本地存储，无法保存笔记");
  function s() {
    try {
      const l = JSON.parse(i.getItem(o) || "[]");
      return Array.isArray(l) ? l : [];
    } catch (l) {
      return console.warn("Candle Reader 本地笔记损坏，已忽略：", l), [];
    }
  }
  return {
    async load({ chapter: l } = {}) {
      const a = s();
      return l ? a.filter((r) => r.chapter === l) : a;
    },
    async save(l) {
      const a = (/* @__PURE__ */ new Date()).toISOString(), r = s(), f = Sc(l) || ka(), u = r.findIndex((h) => Sc(h) === f), d = u >= 0 ? r[u] : null, v = {
        ...d,
        ...l,
        id: (d == null ? void 0 : d.id) || l.id || f,
        client_id: l.client_id || (d == null ? void 0 : d.client_id) || f,
        created_at: (d == null ? void 0 : d.created_at) || l.created_at || a,
        updated_at: a
      };
      return u >= 0 ? r.splice(u, 1, v) : r.push(v), i.setItem(o, JSON.stringify(r)), v;
    }
  };
}
function yw({ callbacks: e, bookId: t, bookUrl: n, storage: o } = {}) {
  const i = e != null;
  if (i && (typeof e.load != "function" || typeof e.save != "function"))
    throw new Error("annotation_callbacks 必须同时提供 load 和 save 函数");
  const s = i ? e : gw({ bookId: t, bookUrl: n, storage: o }), l = { book_id: t || null, book_url: n || "" };
  return {
    source: i ? "callback" : "localStorage",
    async load(a = {}) {
      return mw(await s.load({ ...l, ...a }));
    },
    async save(a) {
      return vw(await s.save({ ...a }, l));
    }
  };
}
const pw = W({
  ...Te(),
  ...Eb({
    fullHeight: !0
  }),
  ...tt()
}, "VApp"), bw = de()({
  name: "VApp",
  props: pw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = vt(e), {
      layoutClasses: i,
      getLayoutItem: s,
      items: l,
      layoutRef: a
    } = Vb(e), {
      rtlClasses: r
    } = Bt();
    return _e(() => {
      var f;
      return c("div", {
        ref: a,
        class: ["v-application", o.themeClasses.value, i.value, r.value, e.class],
        style: [e.style]
      }, [c("div", {
        class: "v-application__wrap"
      }, [(f = n.default) == null ? void 0 : f.call(n)])]);
    }), {
      getLayoutItem: s,
      items: l,
      theme: o
    };
  }
}), _w = W({
  text: String,
  ...Te(),
  ...Ze()
}, "VToolbarTitle"), lv = de()({
  name: "VToolbarTitle",
  props: _w(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => {
      const o = !!(n.default || n.text || e.text);
      return c(e.tag, {
        class: ["v-toolbar-title", e.class],
        style: e.style
      }, {
        default: () => {
          var i;
          return [o && c("div", {
            class: "v-toolbar-title__placeholder"
          }, [n.text ? n.text() : e.text, (i = n.default) == null ? void 0 : i.call(n)])];
        }
      });
    }), {};
  }
}), ww = [null, "prominent", "default", "comfortable", "compact"], av = W({
  absolute: Boolean,
  collapse: Boolean,
  color: String,
  density: {
    type: String,
    default: "default",
    validator: (e) => ww.includes(e)
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
  ...ao(),
  ...Te(),
  ...Hn(),
  ...Nt(),
  ...Ze({
    tag: "header"
  }),
  ...tt()
}, "VToolbar"), Ws = de()({
  name: "VToolbar",
  props: av(),
  setup(e, t) {
    var h;
    let {
      slots: n
    } = t;
    const {
      backgroundColorClasses: o,
      backgroundColorStyles: i
    } = At(ae(e, "color")), {
      borderClasses: s
    } = ro(e), {
      elevationClasses: l
    } = jn(e), {
      roundedClasses: a
    } = Tt(e), {
      themeClasses: r
    } = vt(e), {
      rtlClasses: f
    } = Bt(), u = we(!!(e.extended || (h = n.extension) != null && h.call(n))), d = b(() => parseInt(Number(e.height) + (e.density === "prominent" ? Number(e.height) : 0) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0), 10)), v = b(() => u.value ? parseInt(Number(e.extensionHeight) + (e.density === "prominent" ? Number(e.extensionHeight) : 0) - (e.density === "comfortable" ? 4 : 0) - (e.density === "compact" ? 8 : 0), 10) : 0);
    return lo({
      VBtn: {
        variant: "text"
      }
    }), _e(() => {
      var S;
      const m = !!(e.title || n.title), g = !!(n.image || e.image), _ = (S = n.extension) == null ? void 0 : S.call(n);
      return u.value = !!(e.extended || _), c(e.tag, {
        class: ["v-toolbar", {
          "v-toolbar--absolute": e.absolute,
          "v-toolbar--collapse": e.collapse,
          "v-toolbar--flat": e.flat,
          "v-toolbar--floating": e.floating,
          [`v-toolbar--density-${e.density}`]: !0
        }, o.value, s.value, l.value, a.value, r.value, f.value, e.class],
        style: [i.value, e.style]
      }, {
        default: () => [g && c("div", {
          key: "image",
          class: "v-toolbar__image"
        }, [n.image ? c(mt, {
          key: "image-defaults",
          disabled: !e.image,
          defaults: {
            VImg: {
              cover: !0,
              src: e.image
            }
          }
        }, n.image) : c(mr, {
          key: "image-img",
          cover: !0,
          src: e.image
        }, null)]), c(mt, {
          defaults: {
            VTabs: {
              height: be(d.value)
            }
          }
        }, {
          default: () => {
            var N, I, P;
            return [c("div", {
              class: "v-toolbar__content",
              style: {
                height: be(d.value)
              }
            }, [n.prepend && c("div", {
              class: "v-toolbar__prepend"
            }, [(N = n.prepend) == null ? void 0 : N.call(n)]), m && c(lv, {
              key: "title",
              text: e.title
            }, {
              text: n.title
            }), (I = n.default) == null ? void 0 : I.call(n), n.append && c("div", {
              class: "v-toolbar__append"
            }, [(P = n.append) == null ? void 0 : P.call(n)])])];
          }
        }), c(mt, {
          defaults: {
            VTabs: {
              height: be(v.value)
            }
          }
        }, {
          default: () => [c(cm, null, {
            default: () => [u.value && c("div", {
              class: "v-toolbar__extension",
              style: {
                height: be(v.value)
              }
            }, [_])]
          })]
        })]
      });
    }), {
      contentHeight: d,
      extensionHeight: v
    };
  }
}), kw = W({
  scrollTarget: {
    type: String
  },
  scrollThreshold: {
    type: [String, Number],
    default: 300
  }
}, "scroll");
function Sw(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const {
    canScroll: n
  } = t;
  let o = 0, i = 0;
  const s = se(null), l = we(0), a = we(0), r = we(0), f = we(!1), u = we(!1), d = b(() => Number(e.scrollThreshold)), v = b(() => Sn((d.value - l.value) / d.value || 0)), h = () => {
    const m = s.value;
    if (!m || n && !n.value) return;
    o = l.value, l.value = "window" in m ? m.pageYOffset : m.scrollTop;
    const g = m instanceof Window ? document.documentElement.scrollHeight : m.scrollHeight;
    if (i !== g) {
      i = g;
      return;
    }
    u.value = l.value < o, r.value = Math.abs(l.value - d.value);
  };
  return ke(u, () => {
    a.value = a.value || l.value;
  }), ke(f, () => {
    a.value = 0;
  }), Cn(() => {
    ke(() => e.scrollTarget, (m) => {
      var _;
      const g = m ? document.querySelector(m) : window;
      if (!g) {
        _n(`Unable to locate element with identifier ${m}`);
        return;
      }
      g !== s.value && ((_ = s.value) == null || _.removeEventListener("scroll", h), s.value = g, s.value.addEventListener("scroll", h, {
        passive: !0
      }));
    }, {
      immediate: !0
    });
  }), kt(() => {
    var m;
    (m = s.value) == null || m.removeEventListener("scroll", h);
  }), n && ke(n, h, {
    immediate: !0
  }), {
    scrollThreshold: d,
    currentScroll: l,
    currentThreshold: r,
    isScrollActive: f,
    scrollRatio: v,
    // required only for testing
    // probably can be removed
    // later (2 chars chlng)
    isScrollingUp: u,
    savedScroll: a
  };
}
const Cw = W({
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
  ...av(),
  ...Bf(),
  ...kw(),
  height: {
    type: [Number, String],
    default: 64
  }
}, "VAppBar"), Ew = de()({
  name: "VAppBar",
  props: Cw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = se(), i = Ye(e, "modelValue"), s = b(() => {
      var I;
      const N = new Set(((I = e.scrollBehavior) == null ? void 0 : I.split(" ")) ?? []);
      return {
        hide: N.has("hide"),
        fullyHide: N.has("fully-hide"),
        inverted: N.has("inverted"),
        collapse: N.has("collapse"),
        elevate: N.has("elevate"),
        fadeImage: N.has("fade-image")
        // shrink: behavior.has('shrink'),
      };
    }), l = b(() => {
      const N = s.value;
      return N.hide || N.fullyHide || N.inverted || N.collapse || N.elevate || N.fadeImage || // behavior.shrink ||
      !i.value;
    }), {
      currentScroll: a,
      scrollThreshold: r,
      isScrollingUp: f,
      scrollRatio: u
    } = Sw(e, {
      canScroll: l
    }), d = b(() => s.value.hide || s.value.fullyHide), v = b(() => e.collapse || s.value.collapse && (s.value.inverted ? u.value > 0 : u.value === 0)), h = b(() => e.flat || s.value.fullyHide && !i.value || s.value.elevate && (s.value.inverted ? a.value > 0 : a.value === 0)), m = b(() => s.value.fadeImage ? s.value.inverted ? 1 - u.value : u.value : void 0), g = b(() => {
      var P, x;
      if (s.value.hide && s.value.inverted) return 0;
      const N = ((P = o.value) == null ? void 0 : P.contentHeight) ?? 0, I = ((x = o.value) == null ? void 0 : x.extensionHeight) ?? 0;
      return d.value ? a.value < r.value || s.value.fullyHide ? N + I : N : N + I;
    });
    oo(b(() => !!e.scrollBehavior), () => {
      sn(() => {
        d.value ? s.value.inverted ? i.value = a.value > r.value : i.value = f.value || a.value < r.value : i.value = !0;
      });
    });
    const {
      ssrBootStyles: _
    } = Gi(), {
      layoutItemStyles: S
    } = Rf({
      id: e.name,
      order: b(() => parseInt(e.order, 10)),
      position: ae(e, "location"),
      layoutSize: g,
      elementSize: we(void 0),
      active: i,
      absolute: ae(e, "absolute")
    });
    return _e(() => {
      const N = Ws.filterProps(e);
      return c(Ws, xe({
        ref: o,
        class: ["v-app-bar", {
          "v-app-bar--bottom": e.location === "bottom"
        }, e.class],
        style: [{
          ...S.value,
          "--v-toolbar-image-opacity": m.value,
          height: void 0,
          ..._.value
        }, e.style]
      }, N, {
        collapse: v.value,
        flat: h.value
      }), n);
    }), {};
  }
}), xw = W({
  bordered: Boolean,
  color: String,
  content: [Number, String],
  dot: Boolean,
  floating: Boolean,
  icon: We,
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
  ...Te(),
  ...oi({
    location: "top end"
  }),
  ...Nt(),
  ...Ze(),
  ...tt(),
  ...qi({
    transition: "scale-rotate-transition"
  })
}, "VBadge"), Cc = de()({
  name: "VBadge",
  inheritAttrs: !1,
  props: xw(),
  setup(e, t) {
    const {
      backgroundColorClasses: n,
      backgroundColorStyles: o
    } = At(ae(e, "color")), {
      roundedClasses: i
    } = Tt(e), {
      t: s
    } = ll(), {
      textColorClasses: l,
      textColorStyles: a
    } = Mt(ae(e, "textColor")), {
      themeClasses: r
    } = Mf(), {
      locationStyles: f
    } = Ui(e, !0, (u) => (e.floating ? e.dot ? 2 : 4 : e.dot ? 8 : 12) + (["top", "bottom"].includes(u) ? +(e.offsetY ?? 0) : ["left", "right"].includes(u) ? +(e.offsetX ?? 0) : 0));
    return _e(() => {
      const u = Number(e.content), d = !e.max || isNaN(u) ? e.content : u <= +e.max ? u : `${e.max}+`, [v, h] = aa(t.attrs, ["aria-atomic", "aria-label", "aria-live", "role", "title"]);
      return c(e.tag, xe({
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
          var m, g;
          return [c("div", {
            class: "v-badge__wrapper"
          }, [(g = (m = t.slots).default) == null ? void 0 : g.call(m), c(gn, {
            transition: e.transition
          }, {
            default: () => {
              var _, S;
              return [rt(c("span", xe({
                class: ["v-badge__badge", r.value, n.value, i.value, l.value],
                style: [o.value, a.value, e.inline ? {} : f.value],
                "aria-atomic": "true",
                "aria-label": s(e.label, u),
                "aria-live": "polite",
                role: "status"
              }, v), [e.dot ? void 0 : t.slots.badge ? (S = (_ = t.slots).badge) == null ? void 0 : S.call(_) : e.icon ? c(De, {
                icon: e.icon
              }, null) : d]), [[En, e.modelValue]])];
            }
          })])];
        }
      });
    }), {};
  }
}), Vw = W({
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
  ...ao(),
  ...Te(),
  ...Xt(),
  ...Hn(),
  ...Nt(),
  ...Bf({
    name: "bottom-navigation"
  }),
  ...Ze({
    tag: "header"
  }),
  ...sr({
    selectedClass: "v-btn--selected"
  }),
  ...tt()
}, "VBottomNavigation"), Nw = de()({
  name: "VBottomNavigation",
  props: Vw(),
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
    } = Mf(), {
      borderClasses: i
    } = ro(e), {
      backgroundColorClasses: s,
      backgroundColorStyles: l
    } = At(ae(e, "bgColor")), {
      densityClasses: a
    } = an(e), {
      elevationClasses: r
    } = jn(e), {
      roundedClasses: f
    } = Tt(e), {
      ssrBootStyles: u
    } = Gi(), d = b(() => Number(e.height) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0)), v = Ye(e, "active", e.active), {
      layoutItemStyles: h
    } = Rf({
      id: e.name,
      order: b(() => parseInt(e.order, 10)),
      position: b(() => "bottom"),
      layoutSize: b(() => v.value ? d.value : 0),
      elementSize: d,
      active: v,
      absolute: ae(e, "absolute")
    });
    return cl(e, lr), lo({
      VBtn: {
        baseColor: ae(e, "baseColor"),
        color: ae(e, "color"),
        density: ae(e, "density"),
        stacked: b(() => e.mode !== "horizontal"),
        variant: "text"
      }
    }, {
      scoped: !0
    }), _e(() => c(e.tag, {
      class: ["v-bottom-navigation", {
        "v-bottom-navigation--active": v.value,
        "v-bottom-navigation--grow": e.grow,
        "v-bottom-navigation--shift": e.mode === "shift"
      }, o.value, s.value, i.value, a.value, r.value, f.value, e.class],
      style: [l.value, h.value, {
        height: be(d.value)
      }, u.value, e.style]
    }, {
      default: () => [n.default && c("div", {
        class: "v-bottom-navigation__content"
      }, [n.default()])]
    })), {};
  }
}), Tw = W({
  inset: Boolean,
  ...zm({
    transition: "bottom-sheet-transition"
  })
}, "VBottomSheet"), yo = de()({
  name: "VBottomSheet",
  props: Tw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ye(e, "modelValue");
    return _e(() => {
      const i = pn.filterProps(e);
      return c(pn, xe(i, {
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
}), rv = Symbol.for("vuetify:selection-control-group"), uv = W({
  color: String,
  disabled: {
    type: Boolean,
    default: null
  },
  defaultsTarget: String,
  error: Boolean,
  id: String,
  inline: Boolean,
  falseIcon: We,
  trueIcon: We,
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
    default: zi
  },
  ...Te(),
  ...Xt(),
  ...tt()
}, "SelectionControlGroup"), Ow = W({
  ...uv({
    defaultsTarget: "VSelectionControl"
  })
}, "VSelectionControlGroup");
de()({
  name: "VSelectionControlGroup",
  props: Ow(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ye(e, "modelValue"), i = ln(), s = b(() => e.id || `v-selection-control-group-${i}`), l = b(() => e.name || s.value), a = /* @__PURE__ */ new Set();
    return yt(rv, {
      modelValue: o,
      forceUpdate: () => {
        a.forEach((r) => r());
      },
      onForceUpdate: (r) => {
        a.add(r), Ft(() => {
          a.delete(r);
        });
      }
    }), lo({
      [e.defaultsTarget]: {
        color: ae(e, "color"),
        disabled: ae(e, "disabled"),
        density: ae(e, "density"),
        error: ae(e, "error"),
        inline: ae(e, "inline"),
        modelValue: o,
        multiple: b(() => !!e.multiple || e.multiple == null && Array.isArray(o.value)),
        name: l,
        falseIcon: ae(e, "falseIcon"),
        trueIcon: ae(e, "trueIcon"),
        readonly: ae(e, "readonly"),
        ripple: ae(e, "ripple"),
        type: ae(e, "type"),
        valueComparator: ae(e, "valueComparator")
      }
    }), _e(() => {
      var r;
      return c("div", {
        class: ["v-selection-control-group", {
          "v-selection-control-group--inline": e.inline
        }, e.class],
        style: e.style,
        role: e.type === "radio" ? "radiogroup" : void 0
      }, [(r = n.default) == null ? void 0 : r.call(n)]);
    }), {};
  }
});
const cv = W({
  label: String,
  baseColor: String,
  trueValue: null,
  falseValue: null,
  value: null,
  ...Te(),
  ...uv()
}, "VSelectionControl");
function Aw(e) {
  const t = je(rv, void 0), {
    densityClasses: n
  } = an(e), o = Ye(e, "modelValue"), i = b(() => e.trueValue !== void 0 ? e.trueValue : e.value !== void 0 ? e.value : !0), s = b(() => e.falseValue !== void 0 ? e.falseValue : !1), l = b(() => !!e.multiple || e.multiple == null && Array.isArray(o.value)), a = b({
    get() {
      const h = t ? t.modelValue.value : o.value;
      return l.value ? bn(h).some((m) => e.valueComparator(m, i.value)) : e.valueComparator(h, i.value);
    },
    set(h) {
      if (e.readonly) return;
      const m = h ? i.value : s.value;
      let g = m;
      l.value && (g = h ? [...bn(o.value), m] : bn(o.value).filter((_) => !e.valueComparator(_, i.value))), t ? t.modelValue.value = g : o.value = g;
    }
  }), {
    textColorClasses: r,
    textColorStyles: f
  } = Mt(b(() => {
    if (!(e.error || e.disabled))
      return a.value ? e.color : e.baseColor;
  })), {
    backgroundColorClasses: u,
    backgroundColorStyles: d
  } = At(b(() => a.value && !e.error && !e.disabled ? e.color : e.baseColor)), v = b(() => a.value ? e.trueIcon : e.falseIcon);
  return {
    group: t,
    densityClasses: n,
    trueValue: i,
    falseValue: s,
    model: a,
    textColorClasses: r,
    textColorStyles: f,
    backgroundColorClasses: u,
    backgroundColorStyles: d,
    icon: v
  };
}
const Ec = de()({
  name: "VSelectionControl",
  directives: {
    Ripple: Wi
  },
  inheritAttrs: !1,
  props: cv(),
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
      densityClasses: s,
      icon: l,
      model: a,
      textColorClasses: r,
      textColorStyles: f,
      backgroundColorClasses: u,
      backgroundColorStyles: d,
      trueValue: v
    } = Aw(e), h = ln(), m = we(!1), g = we(!1), _ = se(), S = b(() => e.id || `input-${h}`), N = b(() => !e.disabled && !e.readonly);
    i == null || i.onForceUpdate(() => {
      _.value && (_.value.checked = a.value);
    });
    function I($) {
      N.value && (m.value = !0, hf($.target, ":focus-visible") !== !1 && (g.value = !0));
    }
    function P() {
      m.value = !1, g.value = !1;
    }
    function x($) {
      $.stopPropagation();
    }
    function C($) {
      if (!N.value) {
        _.value && (_.value.checked = a.value);
        return;
      }
      e.readonly && i && at(() => i.forceUpdate()), a.value = $.target.checked;
    }
    return _e(() => {
      var O, k;
      const $ = o.label ? o.label({
        label: e.label,
        props: {
          for: S.value
        }
      }) : e.label, [V, T] = il(n), D = c("input", xe({
        ref: _,
        checked: a.value,
        disabled: !!e.disabled,
        id: S.value,
        onBlur: P,
        onFocus: I,
        onInput: C,
        "aria-disabled": !!e.disabled,
        "aria-label": e.label,
        type: e.type,
        value: v.value,
        name: e.name,
        "aria-checked": e.type === "checkbox" ? a.value : void 0
      }, T), null);
      return c("div", xe({
        class: ["v-selection-control", {
          "v-selection-control--dirty": a.value,
          "v-selection-control--disabled": e.disabled,
          "v-selection-control--error": e.error,
          "v-selection-control--focused": m.value,
          "v-selection-control--focus-visible": g.value,
          "v-selection-control--inline": e.inline
        }, s.value, e.class]
      }, V, {
        style: e.style
      }), [c("div", {
        class: ["v-selection-control__wrapper", r.value],
        style: f.value
      }, [(O = o.default) == null ? void 0 : O.call(o, {
        backgroundColorClasses: u,
        backgroundColorStyles: d
      }), rt(c("div", {
        class: ["v-selection-control__input"]
      }, [((k = o.input) == null ? void 0 : k.call(o, {
        model: a,
        textColorClasses: r,
        textColorStyles: f,
        backgroundColorClasses: u,
        backgroundColorStyles: d,
        inputNode: D,
        icon: l.value,
        props: {
          onFocus: I,
          onBlur: P,
          id: S.value
        }
      })) ?? c(Ve, null, [l.value && c(De, {
        key: "icon",
        icon: l.value
      }, null), D])]), [[Rn("ripple"), e.ripple && [!e.disabled && !e.readonly, null, ["center", "circle"]]]])]), $ && c(pr, {
        for: S.value,
        onClick: x
      }, {
        default: () => [$]
      })]);
    }), {
      isFocused: m,
      input: _
    };
  }
}), dv = W({
  indeterminate: Boolean,
  indeterminateIcon: {
    type: We,
    default: "$checkboxIndeterminate"
  },
  ...cv({
    falseIcon: "$checkboxOff",
    trueIcon: "$checkboxOn"
  })
}, "VCheckboxBtn"), xc = de()({
  name: "VCheckboxBtn",
  props: dv(),
  emits: {
    "update:modelValue": (e) => !0,
    "update:indeterminate": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ye(e, "indeterminate"), i = Ye(e, "modelValue");
    function s(r) {
      o.value && (o.value = !1);
    }
    const l = b(() => o.value ? e.indeterminateIcon : e.falseIcon), a = b(() => o.value ? e.indeterminateIcon : e.trueIcon);
    return _e(() => {
      const r = Mo(Ec.filterProps(e), ["modelValue"]);
      return c(Ec, xe(r, {
        modelValue: i.value,
        "onUpdate:modelValue": [(f) => i.value = f, s],
        class: ["v-checkbox-btn", e.class],
        style: e.style,
        type: "checkbox",
        falseIcon: l.value,
        trueIcon: a.value,
        "aria-checked": o.value ? "mixed" : void 0
      }), n);
    }), {};
  }
}), Iw = W({
  ...Xi(),
  ...Mo(dv(), ["inline"])
}, "VCheckbox"), Pw = de()({
  name: "VCheckbox",
  inheritAttrs: !1,
  props: Iw(),
  emits: {
    "update:modelValue": (e) => !0,
    "update:focused": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = Ye(e, "modelValue"), {
      isFocused: s,
      focus: l,
      blur: a
    } = Yi(e), r = ln(), f = b(() => e.id || `checkbox-${r}`);
    return _e(() => {
      const [u, d] = il(n), v = io.filterProps(e), h = xc.filterProps(e);
      return c(io, xe({
        class: ["v-checkbox", e.class]
      }, u, v, {
        modelValue: i.value,
        "onUpdate:modelValue": (m) => i.value = m,
        id: f.value,
        focused: s.value,
        style: e.style
      }), {
        ...o,
        default: (m) => {
          let {
            id: g,
            messagesId: _,
            isDisabled: S,
            isReadonly: N,
            isValid: I
          } = m;
          return c(xc, xe(h, {
            id: g.value,
            "aria-describedby": _.value,
            disabled: S.value,
            readonly: N.value
          }, d, {
            error: I.value === !1,
            modelValue: i.value,
            "onUpdate:modelValue": (P) => i.value = P,
            onFocus: l,
            onBlur: a
          }), o);
        }
      });
    }), {};
  }
}), Dw = W({
  scrollable: Boolean,
  ...Te(),
  ...zn(),
  ...Ze({
    tag: "main"
  })
}, "VMain"), $w = de()({
  name: "VMain",
  props: Dw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      dimensionStyles: o
    } = Un(e), {
      mainStyles: i
    } = Lf(), {
      ssrBootStyles: s
    } = Gi();
    return _e(() => c(e.tag, {
      class: ["v-main", {
        "v-main--scrollable": e.scrollable
      }, e.class],
      style: [i.value, s.value, o.value, e.style]
    }, {
      default: () => {
        var l, a;
        return [e.scrollable ? c("div", {
          class: "v-main__scroller"
        }, [(l = n.default) == null ? void 0 : l.call(n)]) : (a = n.default) == null ? void 0 : a.call(n)];
      }
    })), {};
  }
});
function Mw(e) {
  const t = we(e());
  let n = -1;
  function o() {
    clearInterval(n);
  }
  function i() {
    o(), at(() => t.value = e());
  }
  function s(l) {
    const a = l ? getComputedStyle(l) : {
      transitionDuration: 0.2
    }, r = parseFloat(a.transitionDuration) * 1e3 || 200;
    if (o(), t.value <= 0) return;
    const f = performance.now();
    n = window.setInterval(() => {
      const u = performance.now() - f + r;
      t.value = Math.max(e() - u, 0), t.value <= 0 && o();
    }, r);
  }
  return Ft(o), {
    clear: o,
    time: t,
    start: s,
    reset: i
  };
}
const Fw = W({
  multiLine: Boolean,
  text: String,
  timer: [Boolean, String],
  timeout: {
    type: [Number, String],
    default: 5e3
  },
  vertical: Boolean,
  ...oi({
    location: "bottom"
  }),
  ...ml(),
  ...Nt(),
  ...uo(),
  ...tt(),
  ...Mo(kr({
    transition: "v-snackbar-transition"
  }), ["persistent", "noClickAnimation", "scrim", "scrollStrategy"])
}, "VSnackbar"), Bw = de()({
  name: "VSnackbar",
  props: Fw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ye(e, "modelValue"), {
      positionClasses: i
    } = vl(e), {
      scopeId: s
    } = gl(), {
      themeClasses: l
    } = vt(e), {
      colorClasses: a,
      colorStyles: r,
      variantClasses: f
    } = ni(e), {
      roundedClasses: u
    } = Tt(e), d = Mw(() => Number(e.timeout)), v = se(), h = se(), m = we(!1), g = we(0), _ = se(), S = je(Ti, void 0);
    oo(() => !!S, () => {
      const O = Lf();
      sn(() => {
        _.value = O.mainStyles.value;
      });
    }), ke(o, I), ke(() => e.timeout, I), Cn(() => {
      o.value && I();
    });
    let N = -1;
    function I() {
      d.reset(), window.clearTimeout(N);
      const O = Number(e.timeout);
      if (!o.value || O === -1) return;
      const k = Ya(h.value);
      d.start(k), N = window.setTimeout(() => {
        o.value = !1;
      }, O);
    }
    function P() {
      d.reset(), window.clearTimeout(N);
    }
    function x() {
      m.value = !0, P();
    }
    function C() {
      m.value = !1, I();
    }
    function $(O) {
      g.value = O.touches[0].clientY;
    }
    function V(O) {
      Math.abs(g.value - O.changedTouches[0].clientY) > 50 && (o.value = !1);
    }
    function T() {
      m.value && C();
    }
    const D = b(() => e.location.split(" ").reduce((O, k) => (O[`v-snackbar--${k}`] = !0, O), {}));
    return _e(() => {
      const O = Pi.filterProps(e), k = !!(n.default || n.text || e.text);
      return c(Pi, xe({
        ref: v,
        class: ["v-snackbar", {
          "v-snackbar--active": o.value,
          "v-snackbar--multi-line": e.multiLine && !e.vertical,
          "v-snackbar--timer": !!e.timer,
          "v-snackbar--vertical": e.vertical
        }, D.value, i.value, e.class],
        style: [_.value, e.style]
      }, O, {
        modelValue: o.value,
        "onUpdate:modelValue": (A) => o.value = A,
        contentProps: xe({
          class: ["v-snackbar__wrapper", l.value, a.value, u.value, f.value],
          style: [r.value],
          onPointerenter: x,
          onPointerleave: C
        }, O.contentProps),
        persistent: !0,
        noClickAnimation: !0,
        scrim: !1,
        scrollStrategy: "none",
        _disableGlobalStack: !0,
        onTouchstartPassive: $,
        onTouchend: V,
        onAfterLeave: T
      }, s), {
        default: () => {
          var A, B;
          return [ti(!1, "v-snackbar"), e.timer && !m.value && c("div", {
            key: "timer",
            class: "v-snackbar__timer"
          }, [c(ar, {
            ref: h,
            color: typeof e.timer == "string" ? e.timer : "info",
            max: e.timeout,
            "model-value": d.time.value
          }, null)]), k && c("div", {
            key: "content",
            class: "v-snackbar__content",
            role: "status",
            "aria-live": "polite"
          }, [((A = n.text) == null ? void 0 : A.call(n)) ?? e.text, (B = n.default) == null ? void 0 : B.call(n)]), n.actions && c(mt, {
            defaults: {
              VBtn: {
                variant: "text",
                ripple: !1,
                slim: !0
              }
            }
          }, {
            default: () => [c("div", {
              class: "v-snackbar__actions"
            }, [n.actions({
              isActive: o
            })])]
          })];
        },
        activator: n.activator
      });
    }), ii({}, v);
  }
}), Lw = W({
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
  ...Xi(),
  ..._r()
}, "VTextarea"), Rw = de()({
  name: "VTextarea",
  directives: {
    Intersect: fr
  },
  inheritAttrs: !1,
  props: Lw(),
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
    const s = Ye(e, "modelValue"), {
      isFocused: l,
      focus: a,
      blur: r
    } = Yi(e), f = b(() => typeof e.counterValue == "function" ? e.counterValue(s.value) : (s.value || "").toString().length), u = b(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    });
    function d(O, k) {
      var A, B;
      !e.autofocus || !O || (B = (A = k[0].target) == null ? void 0 : A.focus) == null || B.call(A);
    }
    const v = se(), h = se(), m = we(""), g = se(), _ = b(() => e.persistentPlaceholder || l.value || e.active);
    function S() {
      var O;
      g.value !== document.activeElement && ((O = g.value) == null || O.focus()), l.value || a();
    }
    function N(O) {
      S(), o("click:control", O);
    }
    function I(O) {
      o("mousedown:control", O);
    }
    function P(O) {
      O.stopPropagation(), S(), at(() => {
        s.value = "", mf(e["onClick:clear"], O);
      });
    }
    function x(O) {
      var A;
      const k = O.target;
      if (s.value = k.value, (A = e.modelModifiers) != null && A.trim) {
        const B = [k.selectionStart, k.selectionEnd];
        at(() => {
          k.selectionStart = B[0], k.selectionEnd = B[1];
        });
      }
    }
    const C = se(), $ = se(+e.rows), V = b(() => ["plain", "underlined"].includes(e.variant));
    sn(() => {
      e.autoGrow || ($.value = +e.rows);
    });
    function T() {
      e.autoGrow && at(() => {
        if (!C.value || !h.value) return;
        const O = getComputedStyle(C.value), k = getComputedStyle(h.value.$el), A = parseFloat(O.getPropertyValue("--v-field-padding-top")) + parseFloat(O.getPropertyValue("--v-input-padding-top")) + parseFloat(O.getPropertyValue("--v-field-padding-bottom")), B = C.value.scrollHeight, Q = parseFloat(O.lineHeight), re = Math.max(parseFloat(e.rows) * Q + A, parseFloat(k.getPropertyValue("--v-input-control-height"))), ne = parseFloat(e.maxRows) * Q + A || 1 / 0, J = Sn(B ?? 0, re, ne);
        $.value = Math.floor((J - A) / Q), m.value = be(J);
      });
    }
    Cn(T), ke(s, T), ke(() => e.rows, T), ke(() => e.maxRows, T), ke(() => e.density, T);
    let D;
    return ke(C, (O) => {
      O ? (D = new ResizeObserver(T), D.observe(C.value)) : D == null || D.disconnect();
    }), kt(() => {
      D == null || D.disconnect();
    }), _e(() => {
      const O = !!(i.counter || e.counter || e.counterValue), k = !!(O || i.details), [A, B] = il(n), {
        modelValue: Q,
        ...re
      } = io.filterProps(e), ne = Pm(e);
      return c(io, xe({
        ref: v,
        modelValue: s.value,
        "onUpdate:modelValue": (J) => s.value = J,
        class: ["v-textarea v-text-field", {
          "v-textarea--prefixed": e.prefix,
          "v-textarea--suffixed": e.suffix,
          "v-text-field--prefixed": e.prefix,
          "v-text-field--suffixed": e.suffix,
          "v-textarea--auto-grow": e.autoGrow,
          "v-textarea--no-resize": e.noResize || e.autoGrow,
          "v-input--plain-underlined": V.value
        }, e.class],
        style: e.style
      }, A, re, {
        centerAffix: $.value === 1 && !V.value,
        focused: l.value
      }), {
        ...i,
        default: (J) => {
          let {
            id: Ce,
            isDisabled: K,
            isDirty: X,
            isReadonly: te,
            isValid: Oe
          } = J;
          return c(wr, xe({
            ref: h,
            style: {
              "--v-textarea-control-height": m.value
            },
            onClick: N,
            onMousedown: I,
            "onClick:clear": P,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"]
          }, ne, {
            id: Ce.value,
            active: _.value || X.value,
            centerAffix: $.value === 1 && !V.value,
            dirty: X.value || e.dirty,
            disabled: K.value,
            focused: l.value,
            error: Oe.value === !1
          }), {
            ...i,
            default: (qe) => {
              let {
                props: {
                  class: Ge,
                  ...oe
                }
              } = qe;
              return c(Ve, null, [e.prefix && c("span", {
                class: "v-text-field__prefix"
              }, [e.prefix]), rt(c("textarea", xe({
                ref: g,
                class: Ge,
                value: s.value,
                onInput: x,
                autofocus: e.autofocus,
                readonly: te.value,
                disabled: K.value,
                placeholder: e.placeholder,
                rows: e.rows,
                name: e.name,
                onFocus: S,
                onBlur: r
              }, oe, B), null), [[Rn("intersect"), {
                handler: d
              }, null, {
                once: !0
              }]]), e.autoGrow && rt(c("textarea", {
                class: [Ge, "v-textarea__sizer"],
                id: `${oe.id}-sizer`,
                "onUpdate:modelValue": (Ee) => s.value = Ee,
                ref: C,
                readonly: !0,
                "aria-hidden": "true"
              }, null), [[py, s.value]]), e.suffix && c("span", {
                class: "v-text-field__suffix"
              }, [e.suffix])]);
            }
          });
        },
        details: k ? (J) => {
          var Ce;
          return c(Ve, null, [(Ce = i.details) == null ? void 0 : Ce.call(i, J), O && c(Ve, null, [c("span", null, null), c(Am, {
            active: e.persistentCounter || l.value,
            value: f.value,
            max: u.value,
            disabled: e.disabled
          }, i.counter)])]);
        } : void 0
      });
    }), ii({}, v, h, g);
  }
}), Hw = {
  name: "EpubReader",
  components: {
    Settings: nv,
    BookToc: tv,
    Guest: Wm,
    UserCenter: Um,
    BookComments: $m,
    BookReview: ev,
    BookAnnotations: _m,
    AudiobookPlayer: sv
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
    has_audiobook: function() {
      return !!(this.audiobook_edition_id || this.audiobook_manifest_url);
    },
    switch_theme_icon: function() {
      return Tn(this.settings.theme).mode === "day" ? "mdi-weather-night" : "mdi-weather-sunny";
    },
    switch_theme_text: function() {
      return Tn(this.settings.theme).mode === "day" ? "夜晚" : "白天";
    },
    foot_color: function() {
      const e = Tn(this.settings.theme);
      return e.bgBottom || e.bg;
    },
    status_bar_style: function() {
      const e = Tn(this.settings.theme);
      return e.type !== "image" ? {} : { color: e.text, backgroundColor: "transparent" };
    },
    // 「更多主题」窗口按白天/夜晚分区
    theme_groups: function() {
      return [
        { mode: "day", label: "白天", items: to.filter((e) => e.mode === "day") },
        { mode: "night", label: "夜晚", items: to.filter((e) => e.mode === "night") }
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
        this.annotation_repository = yw({
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
      this.set_menu("annotations"), this.menu.current_panel === "annotations" && this.load_annotations();
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
      var i, s, l, a, r;
      if (!this.settings.notes_enabled) return null;
      const o = this.selected_location;
      if (!(o != null && o.cfi) || !(o != null && o.quote_text) || !this.annotation_repository || this.annotation_saving) return null;
      this.annotation_saving = !0;
      try {
        const f = await this.annotation_repository.save({
          client_id: o.client_id || ka(),
          annotation_type: e,
          is_private: n,
          chapter: String(((i = o.toc) == null ? void 0 : i.label) || this.current_toc_title || "").trim(),
          cfi: String(o.cfi),
          quote_text: o.quote_text,
          content: t,
          color: e === "note" ? "blue" : "yellow"
        });
        this.upsert_annotation(f), this.render_annotation(f), this.load_chapter_annotations(String(((s = o.toc) == null ? void 0 : s.label) || this.current_toc_title || "").trim()), this.hide_toolbar();
        try {
          (r = (a = (l = o.contents) == null ? void 0 : l.window) == null ? void 0 : a.getSelection()) == null || r.removeAllRanges();
        } catch {
        }
        return this.selected_location === o && (this.selected_location = {}), this.show_annotation_feedback(e === "highlight" ? "划线已保存" : "笔记已保存"), f;
      } catch (f) {
        return this.show_annotation_feedback(`保存失败：${f.message || "请稍后重试"}`, !0), null;
      } finally {
        this.annotation_saving = !1;
      }
    },
    save_highlight: function() {
      return this.save_annotation("highlight", "", !0);
    },
    open_note_editor: function() {
      var e;
      !this.settings.notes_enabled || !((e = this.selected_location) != null && e.quote_text) || (this.hide_toolbar(), this.annotation_editor_content = "", this.annotation_editor_error = "", this.annotation_editor_public = !1, this.annotation_editor_open = !0);
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
      await this.save_annotation("note", e, !this.annotation_editor_public) && (this.annotation_editor_open = !1);
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
      const t = Tn(this.settings.theme).mode === "day" ? this.settings.theme_night || "grey" : this.settings.theme_day || "white";
      this.apply_theme(t), this.save_settings();
    },
    // 应用一套主题（按 id）。solid 走 themes.css 的 class；image 走外层背景图 + iframe 透明 + 文字色强制。
    apply_theme: function(e) {
      const t = Tn(e);
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
      e = e || Tn(this.settings.theme), document.documentElement.style.backgroundColor = e.bgTop || e.bg, document.body.style.backgroundColor = e.bgTop || e.bg;
      const t = document.querySelector('meta[name="theme-color"]');
      t && t.setAttribute("content", e.bgTop || e.bg);
    },
    // 背景图铺在 #main（v-main）上：覆盖上/下状态栏与正文区域，整屏一张图连续衔接。
    // image 皮肤按屏幕方向选竖版/横版大图（cover）；正文 iframe 与状态栏透明后透出。
    // （图放在主文档而非 iframe 内——iframe 在分栏模式下宽达数十万 px，背景会被拉伸失效。）
    apply_skin_background: function(e) {
      e = e || Tn(this.settings.theme);
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
      e = e || Tn(this.settings.theme), this.rendition.getContents().forEach((o) => {
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
      var i, s;
      if (e !== this.panel_closing || Object.values(this.menu.panels).some(Boolean) || this.show_login || this.show_user_center || this.show_theme_dialog || this.annotation_editor_open) return;
      const t = (l) => (l == null ? void 0 : l.isConnected) && !l.disabled && !l.closest("[inert], .v-overlay") && l.getClientRects().length, n = ((i = this.$refs[this.panel_entry_ref]) == null ? void 0 : i.$el) || ((s = this.$refs.panelEntryAnnotations) == null ? void 0 : s.$el), o = t(this.panel_trigger) ? this.panel_trigger : n;
      t(o) && o.focus({ preventScroll: !0 }), this.panel_closing = null, this.panel_trigger = null;
    },
    set_menu: function(e) {
      var o;
      var t = e;
      if (this.menu.current_panel == t && this.menu.panels[t] === !0 && (t = "hide"), t === "hide")
        this.menu.current_panel !== "hide" && (this.panel_closing = this.menu.current_panel);
      else {
        const i = document.activeElement, s = (i == null ? void 0 : i.matches("button, a[href], [tabindex]")) && !i.closest(".v-overlay");
        if (s || !this.panel_trigger) {
          const l = { settings: "panelEntrySettings", toc: "panelEntryToc", ai: "panelEntryAi" };
          this.panel_entry_ref = l[t] || "panelEntryAnnotations", this.panel_trigger = s ? i : (o = this.$refs[this.panel_entry_ref]) == null ? void 0 : o.$el;
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
      const a = o < this.wide_screen, r = a ? 3 : 5, f = this.settings.paging_control === "keyboard_only";
      s < o / r || a && l < i / r ? f || (this.suspend_audiobook_follow(), this.rendition.prev()) : s > o * (r - 1) / r || a && l > i * (r - 1) / r ? f || (this.suspend_audiobook_follow(), this.rendition.next().then()) : (console.log("-- toggle menu"), this.menu.show_navbar = !this.menu.show_navbar);
    },
    bin_search: function(e, t, n) {
      for (var o = 0, i = e.length; o < i; ) {
        const l = Math.floor((o + i) / 2);
        if (l == o)
          break;
        const a = e[l];
        if (a.cfi === void 0) {
          if (a.href.indexOf("#") > 0) {
            const f = a.href.split("#")[1];
            a.elem = n.document.getElementById(f);
          } else
            a.elem = n.document.getElementsByTagName("p")[0];
          a.cfi = new ePub.CFI(a.elem, n.cfiBase), a.cfi = new ePub.CFI(a.cfi.toString());
        }
        const r = this.book.locations.epubcfi.compare(t, a.cfi);
        if (r == 0)
          return a;
        r < 0 && (i = l), r > 0 && (o = l);
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
      if (console.log("got spine href in toc:", i), i === void 0) {
        if (t.annotationFallbackToc) return t.annotationFallbackToc;
        const l = t.document.body, a = l.querySelector("h1, h2, h3, h4, h5, h6");
        return t.annotationFallbackToc = {
          href: o.href,
          label: (a == null ? void 0 : a.textContent.trim()) || `正文 ${o.index + 1}`,
          elem: l,
          cfi: new ePub.CFI(l, t.cfiBase),
          subitems: [],
          is_fallback: !0
        }, t.annotationFallbackToc;
      }
      if (i.elem === void 0) {
        const l = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
        for (let r of l) {
          const f = t.document.getElementsByTagName(r);
          if (f.length > 0) {
            i.elem = f[0];
            break;
          }
        }
        const a = new ePub.CFI(i.elem, t.cfiBase);
        i.cfi = new ePub.CFI(a.toString());
      }
      var s = i;
      return i.subitems.length > 0 && (s = this.bin_search(i.subitems, n, t), this.book.locations.epubcfi.compare(n, s.cfi) < 0 && (s = i)), console.log("find_toc = ", s), s;
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
      if (!this.settings.notes_enabled || !this.settings.show_selection_toolbar) return;
      console.log("show toolbar at rect", e, " from iframe rect", t);
      const n = e.left + t.x, o = e.top + t.y, i = e.bottom + t.y;
      this.toolbar_left = 8, this.toolbar_top = i + 12, this.$nextTick(() => {
        var r;
        const s = this.$refs.selectionToolbar;
        if (!s || !this.settings.notes_enabled || !this.settings.show_selection_toolbar) return;
        const l = Math.max(8, window.innerWidth - s.offsetWidth - 8);
        this.toolbar_left = Math.max(8, Math.min(l, n));
        const a = this.menu.show_navbar ? 64 : 8;
        this.toolbar_top = o >= s.offsetHeight + 64 ? o - s.offsetHeight - 12 : Math.min(window.innerHeight - s.offsetHeight - a, i + 12), (r = s.querySelector("button")) == null || r.focus({ preventScroll: !0 });
      });
    },
    is_toolbar_visible: function() {
      return this.settings.notes_enabled && this.settings.show_selection_toolbar && this.toolbar_left > 0;
    },
    on_select_content: function(e, t) {
      console.log("on selectd", e, t), this.is_handlering_selected_content = !0;
      const n = this.rendition.getRange(e) || t.range(e), o = n.startContainer.nodeType === Node.TEXT_NODE ? n.startContainer.parentElement : n.startContainer, i = o.closest("p, h1, h2, h3, h4, h5, h6") || o;
      console.log("selected elem =", i);
      const s = new ePub.CFI(i, t.cfiBase), l = this.find_toc(s, t);
      console.log("cfi = ", s, "toc =", l);
      const a = l.is_fallback ? Math.max(0, Array.from(l.elem.querySelectorAll("p, h1, h2, h3, h4, h5, h6")).indexOf(i)) : this.count_distinct_between(l.elem, i);
      console.log("selected segment_id = ", a), this.selected_location = {
        client_id: ka(),
        toc: l,
        cfi: String(e),
        paragraph_cfi: s.toString(),
        quote_text: n.toString().trim(),
        contents: t,
        segment_id: a
      };
      const r = this.rendition.views()._views.filter((f) => f.index == t.sectionIndex)[0];
      this.show_toolbar(i.getBoundingClientRect(), r.iframe.getBoundingClientRect());
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
      console.log("load themes from:", this.themes_css), to.forEach((e) => this.rendition.themes.register(e.id, this.themes_css)), this.apply_theme(this.settings.theme);
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
        const o = this.book.spine.get(n), i = t.filter((a) => a.cfiBase == o.cfiBase)[0], s = new ePub.CFI(n), l = this.find_toc(s, i, o.href);
        this.load_comments_summary(i, l);
      });
    },
    on_location_changed: function(e) {
      try {
        const t = new ePub.CFI(e.start), o = this.rendition.getContents().find((s) => s.sectionIndex === e.index);
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
      return this.$backend(i).then((s) => {
        !this.comments_enabled || n !== this.comments_request || (t.load_time = /* @__PURE__ */ new Date(), t.summary = {}, t.chapter_id = s.data.chapter_id, (s.data.list || []).forEach((l) => {
          t.summary[l.segmentId] = l, t.icons_rendered = !1;
        }));
      }).catch(function(s) {
        console.error("请求过程中出现错误：", s);
      }).finally(() => {
        this.comments_enabled && n === this.comments_request && this.add_comment_icons(e, t);
      });
    },
    add_comment_icons: function(e, t) {
      if (console.log("添加评论图标和计数器：", t.label.trim()), !!this.comments_enabled) {
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
      const s = new ePub.CFI(t, e.cfiBase).toString(), l = i.reviewNum, a = i.is_hot ? "hot-comment" : "", r = e.document, f = r.createElement("div");
      f.className = `comment-icon ${a}`;
      const u = r.createElement("span");
      u.className = "comment-count", u.textContent = String(l), f.appendChild(u), t.appendChild(f), f.addEventListener("click", (d) => {
        d.stopPropagation(), console.log("点击评论按钮", o.chapter_id, n, s), this.show_selected_comments(o, n, s);
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
      this.$backend(i).then((s) => {
        !this.comments_enabled || o !== this.comments_request || (this.comments = s.data.list || [], this.set_menu("comments"));
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
      for (const s in i)
        i[s] !== void 0 && (this.settings[s] = i[s]);
      Object.assign(this.settings, dw(i));
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
      this.$backend(i).then((s) => {
        s.err == "ok" && (this.book_id = s.data.id);
      }).catch((s) => {
        console.error("获取书籍ID失败:", s);
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
    annotation_editor_content: "",
    annotation_editor_error: "",
    annotation_editor_public: !1,
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
}, jw = {
  key: 0,
  class: "d-flex align-center flex-wrap ga-2 px-4 py-3",
  role: "group",
  "aria-label": "笔记分类"
}, zw = { key: 1 }, Uw = { class: "annotation-editor-quote" }, Ww = {
  id: "status-bar-left",
  class: "align-start"
}, qw = {
  id: "status-bar-right",
  class: "align-end"
}, Gw = { class: "progress-bar-container" }, Kw = { class: "theme-group-label" }, Yw = { class: "theme-grid" }, Xw = ["onClick"], Jw = {
  key: 1,
  class: "theme-badge"
}, Zw = { class: "theme-name" };
function Qw(e, t, n, o, i, s) {
  const l = sv, a = nv, r = tv, f = ev, u = Wm, d = Um, v = $m, h = _m;
  return G(), fe(bw, {
    theme: e.settings.theme,
    "full-height": "",
    density: "compact"
  }, {
    default: p(() => [
      le("div", {
        id: "safe-bottom",
        style: cn({ backgroundColor: s.foot_color })
      }, null, 4),
      e.menu.show_navbar ? (G(), fe(Ew, {
        key: 0,
        density: "compact"
      }, {
        prepend: p(() => [
          c(ue, {
            icon: "",
            title: e.is_debug_signal ? "返回首页" : "章评"
          }, {
            default: p(() => [
              c(De, null, {
                default: p(() => [
                  j(Ne(e.is_debug_signal ? "mdi-arrow-left" : "mdi-candle"), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["title"])
        ]),
        default: p(() => [
          j(" " + Ne(e.is_debug_signal ? e.alert_msg : e.book_title) + " ", 1),
          c(ys),
          s.has_audiobook ? (G(), fe(ue, {
            key: 0,
            "min-height": "44",
            onClick: s.open_audiobook,
            title: "听书"
          }, {
            default: p(() => [
              c(De, null, {
                default: p(() => t[45] || (t[45] = [
                  j("mdi-headphones")
                ])),
                _: 1
              }),
              t[46] || (t[46] = le("span", null, "听书", -1))
            ]),
            _: 1
          }, 8, ["onClick"])) : Re("", !0),
          c(ue, {
            ref: "panelEntryAi",
            icon: "",
            title: "更多选项",
            onClick: t[0] || (t[0] = (m) => s.set_menu("ai"))
          }, {
            default: p(() => [
              c(De, null, {
                default: p(() => t[47] || (t[47] = [
                  j("mdi-dots-vertical")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 512)
        ]),
        _: 1
      })) : Re("", !0),
      c(Nw, {
        modelValue: e.menu.value,
        "onUpdate:modelValue": t[3] || (t[3] = (m) => e.menu.value = m),
        active: e.menu.show_navbar,
        "z-index": "2599"
      }, {
        default: p(() => [
          c(ue, {
            ref: "panelEntryToc",
            value: "toc",
            onClick: t[1] || (t[1] = (m) => s.set_menu("toc"))
          }, {
            default: p(() => [
              c(De, null, {
                default: p(() => t[48] || (t[48] = [
                  j("mdi-book-open-variant-outline")
                ])),
                _: 1
              }),
              t[49] || (t[49] = le("span", null, "目录", -1))
            ]),
            _: 1
          }, 512),
          c(ue, { onClick: s.switch_theme }, {
            default: p(() => [
              c(De, null, {
                default: p(() => [
                  j(Ne(s.switch_theme_icon), 1)
                ]),
                _: 1
              }),
              le("span", null, Ne(s.switch_theme_text), 1)
            ]),
            _: 1
          }, 8, ["onClick"]),
          c(ue, {
            ref: "panelEntryAnnotations",
            value: "annotations",
            "aria-label": e.chapter_annotation_count ? `笔记，本章 ${e.chapter_annotation_count} 条` : "笔记",
            onClick: s.on_open_annotations
          }, {
            default: p(() => [
              e.chapter_annotation_count ? (G(), fe(Cc, {
                key: 0,
                color: "primary",
                content: e.chapter_annotation_count
              }, {
                default: p(() => [
                  c(De, null, {
                    default: p(() => t[50] || (t[50] = [
                      j("mdi-notebook-outline")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["content"])) : (G(), fe(De, { key: 1 }, {
                default: p(() => t[51] || (t[51] = [
                  j("mdi-notebook-outline")
                ])),
                _: 1
              })),
              t[52] || (t[52] = le("span", null, "笔记", -1))
            ]),
            _: 1
          }, 8, ["aria-label", "onClick"]),
          c(ue, {
            ref: "panelEntrySettings",
            value: "settings",
            onClick: t[2] || (t[2] = (m) => s.set_menu("settings"))
          }, {
            default: p(() => [
              c(De, null, {
                default: p(() => t[53] || (t[53] = [
                  j("mdi-cog")
                ])),
                _: 1
              }),
              t[54] || (t[54] = le("span", null, "设置", -1))
            ]),
            _: 1
          }, 512)
        ]),
        _: 1
      }, 8, ["modelValue", "active"]),
      s.has_audiobook ? (G(), fe(l, {
        key: 1,
        ref: "audiobookPlayer",
        visible: e.audiobook_open,
        "edition-id": n.audiobook_edition_id,
        "manifest-url": n.audiobook_manifest_url,
        rendition: e.rendition,
        request: s.audiobook_request,
        onClose: t[4] || (t[4] = (m) => e.audiobook_open = !1)
      }, null, 8, ["visible", "edition-id", "manifest-url", "rendition", "request"])) : Re("", !0),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.settings,
        "onUpdate:modelValue": [
          t[5] || (t[5] = (m) => e.menu.panels.settings = m),
          t[6] || (t[6] = (m) => s.on_panel_model_update("settings", m))
        ],
        onAfterLeave: t[7] || (t[7] = (m) => s.on_panel_after_leave("settings")),
        contained: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(a, {
            settings: e.settings,
            onUpdate: s.update_settings,
            onOpenThemes: s.open_theme_dialog
          }, null, 8, ["settings", "onUpdate", "onOpenThemes"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.toc,
        "onUpdate:modelValue": [
          t[8] || (t[8] = (m) => e.menu.panels.toc = m),
          t[9] || (t[9] = (m) => s.on_panel_model_update("toc", m))
        ],
        onAfterLeave: t[10] || (t[10] = (m) => s.on_panel_after_leave("toc")),
        contained: "",
        "close-on-content-click": "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(r, {
            ref: "bookTocComponent",
            meta: e.book_meta,
            toc_items: e.toc_items,
            "current-chapter": e.current_toc,
            "onClick:select": s.on_click_toc
          }, null, 8, ["meta", "toc_items", "current-chapter", "onClick:select"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.more,
        "onUpdate:modelValue": [
          t[14] || (t[14] = (m) => e.menu.panels.more = m),
          t[15] || (t[15] = (m) => s.on_panel_model_update("more", m))
        ],
        onAfterLeave: t[16] || (t[16] = (m) => s.on_panel_after_leave("more")),
        contained: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(ue, {
            variant: "tonal",
            onClick: s.on_open_annotations
          }, {
            default: p(() => t[55] || (t[55] = [
              j("返回笔记")
            ])),
            _: 1
          }, 8, ["onClick"]),
          c(f, {
            user: e.user,
            login: e.is_login,
            comments: e.book_reviews,
            sort: e.book_review_sort,
            onClose: t[11] || (t[11] = (m) => s.set_menu("hide")),
            onLogin: t[12] || (t[12] = (m) => e.show_login = !0),
            "onUpdate:sort": s.on_change_book_review_sort,
            onOpenSettings: t[13] || (t[13] = (m) => e.show_user_center = !0),
            onAdd: s.on_add_book_review,
            onJump: s.on_jump_review
          }, null, 8, ["user", "login", "comments", "sort", "onUpdate:sort", "onAdd", "onJump"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(pn, {
        modelValue: e.show_login,
        "onUpdate:modelValue": t[17] || (t[17] = (m) => e.show_login = m),
        "max-width": "500",
        "z-index": "2999"
      }, {
        default: p(() => [
          c(u, { onLogin: s.on_book_login }, null, 8, ["onLogin"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.show_user_center,
        "onUpdate:modelValue": t[18] || (t[18] = (m) => e.show_user_center = m),
        contained: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(d, {
            messages: e.comments,
            user: e.user,
            onUpdate: s.on_login_user,
            onLogout: s.on_book_logout
          }, null, 8, ["messages", "user", "onUpdate", "onLogout"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.comments,
        "onUpdate:modelValue": [
          t[21] || (t[21] = (m) => e.menu.panels.comments = m),
          t[22] || (t[22] = (m) => s.on_panel_model_update("comments", m))
        ],
        onAfterLeave: t[23] || (t[23] = (m) => s.on_panel_after_leave("comments")),
        contained: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(ue, {
            variant: "tonal",
            onClick: s.on_open_annotations
          }, {
            default: p(() => t[56] || (t[56] = [
              j("返回笔记")
            ])),
            _: 1
          }, 8, ["onClick"]),
          c(v, {
            login: e.is_login,
            comments: e.comments,
            onClose: t[19] || (t[19] = (m) => s.set_menu("hide")),
            onLogin: t[20] || (t[20] = (m) => s.set_menu("more")),
            onAdd_review: s.on_add_review
          }, null, 8, ["login", "comments", "onAdd_review"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14 annotation-bottom-sheet",
        "max-height": "90%",
        modelValue: e.menu.panels.annotations,
        "onUpdate:modelValue": [
          t[27] || (t[27] = (m) => e.menu.panels.annotations = m),
          t[28] || (t[28] = (m) => s.on_panel_model_update("annotations", m))
        ],
        onAfterLeave: t[29] || (t[29] = (m) => s.on_panel_after_leave("annotations")),
        contained: "",
        "z-index": "234",
        "aria-label": "阅读笔记"
      }, {
        default: p(() => [
          c(pt, null, {
            default: p(() => [
              c(Ws, { density: "compact" }, {
                append: p(() => [
                  e.settings.notes_enabled ? (G(), fe(ue, {
                    key: 0,
                    icon: "mdi-refresh",
                    title: "刷新笔记",
                    "aria-label": "刷新笔记",
                    loading: e.annotations_loading,
                    onClick: s.load_annotations
                  }, null, 8, ["loading", "onClick"])) : Re("", !0),
                  c(ue, {
                    icon: "mdi-close",
                    title: "关闭笔记",
                    "aria-label": "关闭笔记",
                    onClick: t[24] || (t[24] = (m) => s.set_menu("hide"))
                  })
                ]),
                default: p(() => [
                  c(lv, null, {
                    default: p(() => t[57] || (t[57] = [
                      j("笔记")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              e.settings.notes_enabled ? (G(), ze("div", jw, [
                t[60] || (t[60] = le("span", { class: "text-body-1 font-weight-medium me-auto" }, "划线笔记", -1)),
                c(ue, {
                  variant: "tonal",
                  disabled: !e.settings.show_comments || !e.current_toc,
                  onClick: s.open_chapter_comments
                }, {
                  default: p(() => t[58] || (t[58] = [
                    j("当前章评")
                  ])),
                  _: 1
                }, 8, ["disabled", "onClick"]),
                c(ue, {
                  variant: "tonal",
                  "aria-label": "本书评论",
                  onClick: s.on_open_comments
                }, {
                  default: p(() => [
                    e.unread_count ? (G(), fe(Cc, {
                      key: 0,
                      color: "error",
                      content: e.unread_count
                    }, {
                      default: p(() => t[59] || (t[59] = [
                        j("本书评论")
                      ])),
                      _: 1
                    }, 8, ["content"])) : (G(), ze("span", zw, "本书评论"))
                  ]),
                  _: 1
                }, 8, ["onClick"])
              ])) : Re("", !0),
              e.settings.notes_enabled ? e.settings.show_comments ? Re("", !0) : (G(), fe(Ut, {
                key: 2,
                class: "py-0"
              }, {
                default: p(() => t[63] || (t[63] = [
                  j("章节段落评论已关闭，可在设置中开启。")
                ])),
                _: 1
              })) : (G(), fe(Ut, { key: 1 }, {
                default: p(() => [
                  t[62] || (t[62] = j("笔记已关闭，已有数据会保留。 ")),
                  c(ue, {
                    variant: "text",
                    onClick: t[25] || (t[25] = (m) => s.set_menu("settings"))
                  }, {
                    default: p(() => t[61] || (t[61] = [
                      j("前往设置")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })),
              e.settings.notes_enabled ? (G(), fe(h, {
                key: 3,
                annotations: e.annotations,
                loading: e.annotations_loading,
                error: e.annotations_error,
                "toolbar-enabled": e.settings.show_selection_toolbar,
                onOpenSettings: t[26] || (t[26] = (m) => s.set_menu("settings")),
                onLocate: s.locate_annotation
              }, null, 8, ["annotations", "loading", "error", "toolbar-enabled", "onLocate"])) : Re("", !0)
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.ai,
        "onUpdate:modelValue": [
          t[30] || (t[30] = (m) => e.menu.panels.ai = m),
          t[31] || (t[31] = (m) => s.on_panel_model_update("ai", m))
        ],
        onAfterLeave: t[32] || (t[32] = (m) => s.on_panel_after_leave("ai")),
        contained: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(pt, { title: "开发中" })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(pn, {
        modelValue: e.annotation_editor_open,
        "onUpdate:modelValue": t[37] || (t[37] = (m) => e.annotation_editor_open = m),
        class: "annotation-editor-dialog",
        "max-width": "520",
        "aria-labelledby": "annotation-editor-title",
        onAfterLeave: s.restore_reader_focus
      }, {
        default: p(() => [
          c(pt, null, {
            default: p(() => [
              c(Qn, { id: "annotation-editor-title" }, {
                default: p(() => t[64] || (t[64] = [
                  j("添加笔记")
                ])),
                _: 1
              }),
              c(Ut, null, {
                default: p(() => {
                  var m;
                  return [
                    le("blockquote", Uw, Ne(e.selected_location.quote_text), 1),
                    c(Rw, {
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
                    ((m = e.annotation_repository) == null ? void 0 : m.source) === "callback" ? (G(), fe(Pw, {
                      key: 0,
                      modelValue: e.annotation_editor_public,
                      "onUpdate:modelValue": t[35] || (t[35] = (g) => e.annotation_editor_public = g),
                      label: "公开给其他用户",
                      "hide-details": ""
                    }, null, 8, ["modelValue"])) : Re("", !0)
                  ];
                }),
                _: 1
              }),
              c(Ao, null, {
                default: p(() => [
                  c(ys),
                  c(ue, {
                    onClick: t[36] || (t[36] = (m) => e.annotation_editor_open = !1)
                  }, {
                    default: p(() => t[65] || (t[65] = [
                      j("取消")
                    ])),
                    _: 1
                  }),
                  c(ue, {
                    color: "primary",
                    loading: e.annotation_saving,
                    onClick: s.save_note
                  }, {
                    default: p(() => t[66] || (t[66] = [
                      j("保存笔记")
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
      c(Bw, {
        modelValue: e.annotation_feedback_visible,
        "onUpdate:modelValue": t[39] || (t[39] = (m) => e.annotation_feedback_visible = m),
        class: "annotation-feedback",
        color: e.annotation_feedback_error ? "error" : "primary",
        timeout: e.annotation_feedback_error ? -1 : 5e3
      }, {
        actions: p(() => [
          c(ue, {
            variant: "text",
            onClick: t[38] || (t[38] = (m) => e.annotation_feedback_visible = !1)
          }, {
            default: p(() => t[67] || (t[67] = [
              j("关闭")
            ])),
            _: 1
          })
        ]),
        default: p(() => [
          j(Ne(e.annotation_feedback_message) + " ", 1)
        ]),
        _: 1
      }, 8, ["modelValue", "color", "timeout"]),
      rt(le("div", {
        id: "comments-toolbar",
        ref: "selectionToolbar",
        role: "group",
        "aria-label": "选中文字操作",
        style: cn(`left: ${e.toolbar_left}px; top: ${e.toolbar_top}px;`)
      }, [
        c(Ws, {
          density: "compact",
          border: "",
          dense: "",
          floating: "",
          elevation: "10",
          rounded: ""
        }, {
          default: p(() => [
            e.settings.notes_enabled ? (G(), ze(Ve, { key: 0 }, [
              c(ue, {
                loading: e.annotation_saving,
                onClick: s.save_highlight
              }, {
                default: p(() => t[68] || (t[68] = [
                  j("划线")
                ])),
                _: 1
              }, 8, ["loading", "onClick"]),
              c(en, { vertical: "" }),
              c(ue, {
                disabled: e.annotation_saving,
                onClick: s.open_note_editor
              }, {
                default: p(() => t[69] || (t[69] = [
                  j("笔记")
                ])),
                _: 1
              }, 8, ["disabled", "onClick"]),
              c(en, { vertical: "" })
            ], 64)) : Re("", !0),
            s.comments_enabled ? (G(), fe(ue, {
              key: 1,
              onClick: s.on_click_toolbar_comments
            }, {
              default: p(() => t[70] || (t[70] = [
                j("发段评")
              ])),
              _: 1
            }, 8, ["onClick"])) : Re("", !0),
            c(en, { vertical: "" }),
            s.has_audiobook ? (G(), fe(ue, {
              key: 2,
              onClick: s.on_click_toolbar_listen
            }, {
              default: p(() => t[71] || (t[71] = [
                j("从这里听")
              ])),
              _: 1
            }, 8, ["onClick"])) : Re("", !0),
            s.has_audiobook ? (G(), fe(en, {
              key: 3,
              vertical: ""
            })) : Re("", !0),
            c(ue, { onClick: s.copy_selection }, {
              default: p(() => t[72] || (t[72] = [
                j("复制")
              ])),
              _: 1
            }, 8, ["onClick"])
          ]),
          _: 1
        })
      ], 4), [
        [En, s.is_toolbar_visible()]
      ]),
      c($w, {
        id: "main",
        class: "pa-0"
      }, {
        default: p(() => [
          c(Pi, {
            modelValue: e.loading,
            "onUpdate:modelValue": t[40] || (t[40] = (m) => e.loading = m),
            "z-index": "auto",
            class: "align-center justify-center",
            persistent: ""
          }, {
            default: p(() => [
              c(Gf, {
                indeterminate: "",
                size: "64",
                color: "primary"
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          c(pn, {
            modelValue: e.showTimeoutDialog,
            "onUpdate:modelValue": t[42] || (t[42] = (m) => e.showTimeoutDialog = m),
            "max-width": "500px"
          }, {
            default: p(() => [
              c(pt, null, {
                default: p(() => [
                  c(Qn, { class: "text-h5 text-center" }, {
                    default: p(() => t[73] || (t[73] = [
                      j("加载超时")
                    ])),
                    _: 1
                  }),
                  c(Ut, { class: "text-center" }, {
                    default: p(() => t[74] || (t[74] = [
                      j(" 电子书加载超时，可能是网络问题或文件格式不支持。 ")
                    ])),
                    _: 1
                  }),
                  c(Ao, { class: "justify-center" }, {
                    default: p(() => [
                      c(ue, {
                        color: "primary",
                        variant: "text",
                        onClick: t[41] || (t[41] = (m) => e.showTimeoutDialog = !1)
                      }, {
                        default: p(() => t[75] || (t[75] = [
                          j(" 关闭 ")
                        ])),
                        _: 1
                      }),
                      c(ue, {
                        color: "primary",
                        variant: "flat",
                        onClick: s.retryLoad
                      }, {
                        default: p(() => t[76] || (t[76] = [
                          j(" 重试 ")
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
          le("div", {
            id: "status-bar-top",
            class: Wt(e.settings.theme),
            style: cn(s.status_bar_style)
          }, [
            le("div", Ww, Ne(e.current_toc_title), 1),
            le("div", qw, " (" + Ne(s.readingProgress) + ") ", 1)
          ], 6),
          t[77] || (t[77] = le("div", { id: "reader" }, null, -1)),
          le("div", {
            id: "status-bar-bottom",
            class: Wt(e.settings.theme),
            style: cn(s.status_bar_style)
          }, [
            le("div", Gw, [
              le("div", {
                class: "progress-bar",
                style: cn({ width: s.readingProgress })
              }, null, 4)
            ])
          ], 6)
        ]),
        _: 1
      }),
      c(pn, {
        modelValue: e.show_theme_dialog,
        "onUpdate:modelValue": t[44] || (t[44] = (m) => e.show_theme_dialog = m),
        "max-width": "520",
        scrollable: "",
        fullscreen: e.$vuetify.display.smAndDown
      }, {
        default: p(() => [
          c(pt, null, {
            default: p(() => [
              c(Qn, { class: "d-flex align-center" }, {
                default: p(() => [
                  t[78] || (t[78] = le("span", null, "阅读皮肤", -1)),
                  c(ys),
                  c(ue, {
                    icon: "mdi-close",
                    variant: "text",
                    density: "compact",
                    onClick: t[43] || (t[43] = (m) => e.show_theme_dialog = !1)
                  })
                ]),
                _: 1
              }),
              c(Ut, null, {
                default: p(() => [
                  (G(!0), ze(Ve, null, qt(s.theme_groups, (m) => (G(), ze(Ve, {
                    key: m.mode
                  }, [
                    le("div", Kw, Ne(m.label), 1),
                    le("div", Yw, [
                      (G(!0), ze(Ve, null, qt(m.items, (g) => (G(), ze("div", {
                        class: "theme-cell",
                        key: g.id
                      }, [
                        le("div", {
                          class: Wt(["theme-card", { active: e.settings.theme === g.id }]),
                          style: cn(s.theme_card_style(g)),
                          onClick: (_) => s.pick_theme(g)
                        }, [
                          le("span", {
                            class: "theme-sample",
                            style: cn({ color: g.text })
                          }, Ne(g.sample), 5),
                          g.id === e.settings.theme_day || g.id === e.settings.theme_night ? (G(), fe(De, {
                            key: 0,
                            class: "theme-check",
                            size: "18",
                            title: g.mode === "day" ? "当前白天皮肤" : "当前夜晚皮肤"
                          }, {
                            default: p(() => t[79] || (t[79] = [
                              j("mdi-check-circle")
                            ])),
                            _: 2
                          }, 1032, ["title"])) : Re("", !0),
                          e.settings.theme === g.id ? (G(), ze("span", Jw, "使用中")) : Re("", !0)
                        ], 14, Xw),
                        le("div", Zw, Ne(g.name), 1)
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
const ek = /* @__PURE__ */ Vn(Hw, [["render", Qw], ["__scopeId", "data-v-319ac961"]]), tk = {
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
function nk(e, t, n, o, i, s) {
  const l = ek;
  return G(), fe(l, {
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
const ok = /* @__PURE__ */ Vn(tk, [["render", nk]]);
class ik {
  constructor(t, n) {
    var o = "https://api.talebook.org";
    const i = Cy(ok, n);
    Ib(i, {
      server: n.server || o
    }), i.mount(t);
  }
}
export {
  ik as Reader
};
