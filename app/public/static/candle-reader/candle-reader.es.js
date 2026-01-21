var Eu = {};
/**
* @vue/shared v3.5.12
* (c) 2018-present Yuxi (Evan) You and Vue contributors
* @license MIT
**/
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function hn(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const De = Eu.NODE_ENV !== "production" ? Object.freeze({}) : {}, Ei = Eu.NODE_ENV !== "production" ? Object.freeze([]) : [], Ze = () => {
}, zf = () => !1, ho = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Yo = (e) => e.startsWith("onUpdate:"), Be = Object.assign, js = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, Uf = Object.prototype.hasOwnProperty, Ce = (e, t) => Uf.call(e, t), ne = Array.isArray, Xn = (e) => br(e) === "[object Map]", Cu = (e) => br(e) === "[object Set]", se = (e) => typeof e == "function", Le = (e) => typeof e == "string", In = (e) => typeof e == "symbol", Ve = (e) => e !== null && typeof e == "object", zs = (e) => (Ve(e) || se(e)) && se(e.then) && se(e.catch), ku = Object.prototype.toString, br = (e) => ku.call(e), Us = (e) => br(e).slice(8, -1), Nu = (e) => br(e) === "[object Object]", Ws = (e) => Le(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, qi = /* @__PURE__ */ hn(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), Wf = /* @__PURE__ */ hn(
  "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
), _r = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, Kf = /-(\w)/g, nt = _r(
  (e) => e.replace(Kf, (t, n) => n ? n.toUpperCase() : "")
), Gf = /\B([A-Z])/g, Pn = _r(
  (e) => e.replace(Gf, "-$1").toLowerCase()
), Dt = _r((e) => e.charAt(0).toUpperCase() + e.slice(1)), Kn = _r(
  (e) => e ? `on${Dt(e)}` : ""
), Dn = (e, t) => !Object.is(e, t), Li = (e, ...t) => {
  for (let n = 0; n < e.length; n++)
    e[n](...t);
}, qo = (e, t, n, i = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: i,
    value: n
  });
}, Yf = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
}, qf = (e) => {
  const t = Le(e) ? Number(e) : NaN;
  return isNaN(t) ? e : t;
};
let jl;
const go = () => jl || (jl = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function to(e) {
  if (ne(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const i = e[n], o = Le(i) ? Qf(i) : to(i);
      if (o)
        for (const r in o)
          t[r] = o[r];
    }
    return t;
  } else if (Le(e) || Ve(e))
    return e;
}
const Zf = /;(?![^(]*\))/g, Xf = /:([^]+)/, Jf = /\/\*[^]*?\*\//g;
function Qf(e) {
  const t = {};
  return e.replace(Jf, "").split(Zf).forEach((n) => {
    if (n) {
      const i = n.split(Xf);
      i.length > 1 && (t[i[0].trim()] = i[1].trim());
    }
  }), t;
}
function li(e) {
  let t = "";
  if (Le(e))
    t = e;
  else if (ne(e))
    for (let n = 0; n < e.length; n++) {
      const i = li(e[n]);
      i && (t += i + " ");
    }
  else if (Ve(e))
    for (const n in e)
      e[n] && (t += n + " ");
  return t.trim();
}
const em = "html,body,base,head,link,meta,style,title,address,article,aside,footer,header,hgroup,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,option,output,progress,select,textarea,details,dialog,menu,summary,template,blockquote,iframe,tfoot", tm = "svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,feDistantLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,text,textPath,title,tspan,unknown,use,view", nm = "annotation,annotation-xml,maction,maligngroup,malignmark,math,menclose,merror,mfenced,mfrac,mfraction,mglyph,mi,mlabeledtr,mlongdiv,mmultiscripts,mn,mo,mover,mpadded,mphantom,mprescripts,mroot,mrow,ms,mscarries,mscarry,msgroup,msline,mspace,msqrt,msrow,mstack,mstyle,msub,msubsup,msup,mtable,mtd,mtext,mtr,munder,munderover,none,semantics", im = /* @__PURE__ */ hn(em), om = /* @__PURE__ */ hn(tm), rm = /* @__PURE__ */ hn(nm), sm = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", lm = /* @__PURE__ */ hn(sm);
function xu(e) {
  return !!e || e === "";
}
const Vu = (e) => !!(e && e.__v_isRef === !0), Ke = (e) => Le(e) ? e : e == null ? "" : ne(e) || Ve(e) && (e.toString === ku || !se(e.toString)) ? Vu(e) ? Ke(e.value) : JSON.stringify(e, Ou, 2) : String(e), Ou = (e, t) => Vu(t) ? Ou(e, t.value) : Xn(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (n, [i, o], r) => (n[Br(i, r) + " =>"] = o, n),
    {}
  )
} : Cu(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((n) => Br(n))
} : In(t) ? Br(t) : Ve(t) && !ne(t) && !Nu(t) ? String(t) : t, Br = (e, t = "") => {
  var n;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    In(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e
  );
};
var Pe = {};
function Pt(e, ...t) {
  console.warn(`[Vue warn] ${e}`, ...t);
}
let ft;
class Tu {
  constructor(t = !1) {
    this.detached = t, this._active = !0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.parent = ft, !t && ft && (this.index = (ft.scopes || (ft.scopes = [])).push(
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
      const n = ft;
      try {
        return ft = this, t();
      } finally {
        ft = n;
      }
    } else Pe.NODE_ENV !== "production" && Pt("cannot run an inactive effect scope.");
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    ft = this;
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    ft = this.parent;
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
function Ks(e) {
  return new Tu(e);
}
function am() {
  return ft;
}
function Ut(e, t = !1) {
  ft ? ft.cleanups.push(e) : Pe.NODE_ENV !== "production" && !t && Pt(
    "onScopeDispose() is called when there is no active effect scope to be associated with."
  );
}
let Te;
const Rr = /* @__PURE__ */ new WeakSet();
class Du {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, ft && ft.active && ft.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, Rr.has(this) && (Rr.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Au(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, zl(this), Iu(this);
    const t = Te, n = Rt;
    Te = this, Rt = !0;
    try {
      return this.fn();
    } finally {
      Pe.NODE_ENV !== "production" && Te !== this && Pt(
        "Active effect was not restored correctly - this is likely a Vue internal bug."
      ), $u(this), Te = t, Rt = n, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep)
        qs(t);
      this.deps = this.depsTail = void 0, zl(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? Rr.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    us(this) && this.run();
  }
  get dirty() {
    return us(this);
  }
}
let Pu = 0, Zi, Xi;
function Au(e, t = !1) {
  if (e.flags |= 8, t) {
    e.next = Xi, Xi = e;
    return;
  }
  e.next = Zi, Zi = e;
}
function Gs() {
  Pu++;
}
function Ys() {
  if (--Pu > 0)
    return;
  if (Xi) {
    let t = Xi;
    for (Xi = void 0; t; ) {
      const n = t.next;
      t.next = void 0, t.flags &= -9, t = n;
    }
  }
  let e;
  for (; Zi; ) {
    let t = Zi;
    for (Zi = void 0; t; ) {
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
function Iu(e) {
  for (let t = e.deps; t; t = t.nextDep)
    t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function $u(e) {
  let t, n = e.depsTail, i = n;
  for (; i; ) {
    const o = i.prevDep;
    i.version === -1 ? (i === n && (n = o), qs(i), um(i)) : t = i, i.dep.activeLink = i.prevActiveLink, i.prevActiveLink = void 0, i = o;
  }
  e.deps = t, e.depsTail = n;
}
function us(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (t.dep.version !== t.version || t.dep.computed && (Mu(t.dep.computed) || t.dep.version !== t.version))
      return !0;
  return !!e._dirty;
}
function Mu(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === no))
    return;
  e.globalVersion = no;
  const t = e.dep;
  if (e.flags |= 2, t.version > 0 && !e.isSSR && e.deps && !us(e)) {
    e.flags &= -3;
    return;
  }
  const n = Te, i = Rt;
  Te = e, Rt = !0;
  try {
    Iu(e);
    const o = e.fn(e._value);
    (t.version === 0 || Dn(o, e._value)) && (e._value = o, t.version++);
  } catch (o) {
    throw t.version++, o;
  } finally {
    Te = n, Rt = i, $u(e), e.flags &= -3;
  }
}
function qs(e, t = !1) {
  const { dep: n, prevSub: i, nextSub: o } = e;
  if (i && (i.nextSub = o, e.prevSub = void 0), o && (o.prevSub = i, e.nextSub = void 0), Pe.NODE_ENV !== "production" && n.subsHead === e && (n.subsHead = o), n.subs === e && (n.subs = i, !i && n.computed)) {
    n.computed.flags &= -5;
    for (let r = n.computed.deps; r; r = r.nextDep)
      qs(r, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function um(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let Rt = !0;
const Fu = [];
function gn() {
  Fu.push(Rt), Rt = !1;
}
function pn() {
  const e = Fu.pop();
  Rt = e === void 0 ? !0 : e;
}
function zl(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const n = Te;
    Te = void 0;
    try {
      t();
    } finally {
      Te = n;
    }
  }
}
let no = 0;
class cm {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class Zs {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, Pe.NODE_ENV !== "production" && (this.subsHead = void 0);
  }
  track(t) {
    if (!Te || !Rt || Te === this.computed)
      return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== Te)
      n = this.activeLink = new cm(Te, this), Te.deps ? (n.prevDep = Te.depsTail, Te.depsTail.nextDep = n, Te.depsTail = n) : Te.deps = Te.depsTail = n, Lu(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const i = n.nextDep;
      i.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = i), n.prevDep = Te.depsTail, n.nextDep = void 0, Te.depsTail.nextDep = n, Te.depsTail = n, Te.deps === n && (Te.deps = i);
    }
    return Pe.NODE_ENV !== "production" && Te.onTrack && Te.onTrack(
      Be(
        {
          effect: Te
        },
        t
      )
    ), n;
  }
  trigger(t) {
    this.version++, no++, this.notify(t);
  }
  notify(t) {
    Gs();
    try {
      if (Pe.NODE_ENV !== "production")
        for (let n = this.subsHead; n; n = n.nextSub)
          n.sub.onTrigger && !(n.sub.flags & 8) && n.sub.onTrigger(
            Be(
              {
                effect: n.sub
              },
              t
            )
          );
      for (let n = this.subs; n; n = n.prevSub)
        n.sub.notify() && n.sub.dep.notify();
    } finally {
      Ys();
    }
  }
}
function Lu(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let i = t.deps; i; i = i.nextDep)
        Lu(i);
    }
    const n = e.dep.subs;
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), Pe.NODE_ENV !== "production" && e.dep.subsHead === void 0 && (e.dep.subsHead = e), e.dep.subs = e;
  }
}
const Zo = /* @__PURE__ */ new WeakMap(), Jn = Symbol(
  Pe.NODE_ENV !== "production" ? "Object iterate" : ""
), cs = Symbol(
  Pe.NODE_ENV !== "production" ? "Map keys iterate" : ""
), io = Symbol(
  Pe.NODE_ENV !== "production" ? "Array iterate" : ""
);
function qe(e, t, n) {
  if (Rt && Te) {
    let i = Zo.get(e);
    i || Zo.set(e, i = /* @__PURE__ */ new Map());
    let o = i.get(n);
    o || (i.set(n, o = new Zs()), o.map = i, o.key = n), Pe.NODE_ENV !== "production" ? o.track({
      target: e,
      type: t,
      key: n
    }) : o.track();
  }
}
function Yt(e, t, n, i, o, r) {
  const s = Zo.get(e);
  if (!s) {
    no++;
    return;
  }
  const l = (a) => {
    a && (Pe.NODE_ENV !== "production" ? a.trigger({
      target: e,
      type: t,
      key: n,
      newValue: i,
      oldValue: o,
      oldTarget: r
    }) : a.trigger());
  };
  if (Gs(), t === "clear")
    s.forEach(l);
  else {
    const a = ne(e), d = a && Ws(n);
    if (a && n === "length") {
      const u = Number(i);
      s.forEach((c, m) => {
        (m === "length" || m === io || !In(m) && m >= u) && l(c);
      });
    } else
      switch ((n !== void 0 || s.has(void 0)) && l(s.get(n)), d && l(s.get(io)), t) {
        case "add":
          a ? d && l(s.get("length")) : (l(s.get(Jn)), Xn(e) && l(s.get(cs)));
          break;
        case "delete":
          a || (l(s.get(Jn)), Xn(e) && l(s.get(cs)));
          break;
        case "set":
          Xn(e) && l(s.get(Jn));
          break;
      }
  }
  Ys();
}
function dm(e, t) {
  const n = Zo.get(e);
  return n && n.get(t);
}
function hi(e) {
  const t = Q(e);
  return t === e ? t : (qe(t, "iterate", io), vt(e) ? t : t.map(st));
}
function wr(e) {
  return qe(e = Q(e), "iterate", io), e;
}
const fm = {
  __proto__: null,
  [Symbol.iterator]() {
    return Hr(this, Symbol.iterator, st);
  },
  concat(...e) {
    return hi(this).concat(
      ...e.map((t) => ne(t) ? hi(t) : t)
    );
  },
  entries() {
    return Hr(this, "entries", (e) => (e[1] = st(e[1]), e));
  },
  every(e, t) {
    return on(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return on(this, "filter", e, t, (n) => n.map(st), arguments);
  },
  find(e, t) {
    return on(this, "find", e, t, st, arguments);
  },
  findIndex(e, t) {
    return on(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return on(this, "findLast", e, t, st, arguments);
  },
  findLastIndex(e, t) {
    return on(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return on(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return jr(this, "includes", e);
  },
  indexOf(...e) {
    return jr(this, "indexOf", e);
  },
  join(e) {
    return hi(this).join(e);
  },
  // keys() iterator only reads `length`, no optimisation required
  lastIndexOf(...e) {
    return jr(this, "lastIndexOf", e);
  },
  map(e, t) {
    return on(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return Bi(this, "pop");
  },
  push(...e) {
    return Bi(this, "push", e);
  },
  reduce(e, ...t) {
    return Ul(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return Ul(this, "reduceRight", e, t);
  },
  shift() {
    return Bi(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return on(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return Bi(this, "splice", e);
  },
  toReversed() {
    return hi(this).toReversed();
  },
  toSorted(e) {
    return hi(this).toSorted(e);
  },
  toSpliced(...e) {
    return hi(this).toSpliced(...e);
  },
  unshift(...e) {
    return Bi(this, "unshift", e);
  },
  values() {
    return Hr(this, "values", st);
  }
};
function Hr(e, t, n) {
  const i = wr(e), o = i[t]();
  return i !== e && !vt(e) && (o._next = o.next, o.next = () => {
    const r = o._next();
    return r.value && (r.value = n(r.value)), r;
  }), o;
}
const mm = Array.prototype;
function on(e, t, n, i, o, r) {
  const s = wr(e), l = s !== e && !vt(e), a = s[t];
  if (a !== mm[t]) {
    const c = a.apply(e, r);
    return l ? st(c) : c;
  }
  let d = n;
  s !== e && (l ? d = function(c, m) {
    return n.call(this, st(c), m, e);
  } : n.length > 2 && (d = function(c, m) {
    return n.call(this, c, m, e);
  }));
  const u = a.call(s, d, i);
  return l && o ? o(u) : u;
}
function Ul(e, t, n, i) {
  const o = wr(e);
  let r = n;
  return o !== e && (vt(e) ? n.length > 3 && (r = function(s, l, a) {
    return n.call(this, s, l, a, e);
  }) : r = function(s, l, a) {
    return n.call(this, s, st(l), a, e);
  }), o[t](r, ...i);
}
function jr(e, t, n) {
  const i = Q(e);
  qe(i, "iterate", io);
  const o = i[t](...n);
  return (o === -1 || o === !1) && oo(n[0]) ? (n[0] = Q(n[0]), i[t](...n)) : o;
}
function Bi(e, t, n = []) {
  gn(), Gs();
  const i = Q(e)[t].apply(e, n);
  return Ys(), pn(), i;
}
const vm = /* @__PURE__ */ hn("__proto__,__v_isRef,__isVue"), Bu = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(In)
);
function hm(e) {
  In(e) || (e = String(e));
  const t = Q(this);
  return qe(t, "has", e), t.hasOwnProperty(e);
}
class Ru {
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
      return i === (o ? r ? Ku : Wu : r ? Uu : zu).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(i) ? t : void 0;
    const s = ne(t);
    if (!o) {
      let a;
      if (s && (a = fm[n]))
        return a;
      if (n === "hasOwnProperty")
        return hm;
    }
    const l = Reflect.get(
      t,
      n,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      Ie(t) ? t : i
    );
    return (In(n) ? Bu.has(n) : vm(n)) || (o || qe(t, "get", n), r) ? l : Ie(l) ? s && Ws(n) ? l : l.value : Ve(l) ? o ? po(l) : tt(l) : l;
  }
}
class Hu extends Ru {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, i, o) {
    let r = t[n];
    if (!this._isShallow) {
      const a = vn(r);
      if (!vt(i) && !vn(i) && (r = Q(r), i = Q(i)), !ne(t) && Ie(r) && !Ie(i))
        return a ? !1 : (r.value = i, !0);
    }
    const s = ne(t) && Ws(n) ? Number(n) < t.length : Ce(t, n), l = Reflect.set(
      t,
      n,
      i,
      Ie(t) ? t : o
    );
    return t === Q(o) && (s ? Dn(i, r) && Yt(t, "set", n, i, r) : Yt(t, "add", n, i)), l;
  }
  deleteProperty(t, n) {
    const i = Ce(t, n), o = t[n], r = Reflect.deleteProperty(t, n);
    return r && i && Yt(t, "delete", n, void 0, o), r;
  }
  has(t, n) {
    const i = Reflect.has(t, n);
    return (!In(n) || !Bu.has(n)) && qe(t, "has", n), i;
  }
  ownKeys(t) {
    return qe(
      t,
      "iterate",
      ne(t) ? "length" : Jn
    ), Reflect.ownKeys(t);
  }
}
class ju extends Ru {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return Pe.NODE_ENV !== "production" && Pt(
      `Set operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
  deleteProperty(t, n) {
    return Pe.NODE_ENV !== "production" && Pt(
      `Delete operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
}
const gm = /* @__PURE__ */ new Hu(), pm = /* @__PURE__ */ new ju(), ym = /* @__PURE__ */ new Hu(!0), bm = /* @__PURE__ */ new ju(!0), ds = (e) => e, Oo = (e) => Reflect.getPrototypeOf(e);
function _m(e, t, n) {
  return function(...i) {
    const o = this.__v_raw, r = Q(o), s = Xn(r), l = e === "entries" || e === Symbol.iterator && s, a = e === "keys" && s, d = o[e](...i), u = n ? ds : t ? fs : st;
    return !t && qe(
      r,
      "iterate",
      a ? cs : Jn
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
function To(e) {
  return function(...t) {
    if (Pe.NODE_ENV !== "production") {
      const n = t[0] ? `on key "${t[0]}" ` : "";
      Pt(
        `${Dt(e)} operation ${n}failed: target is readonly.`,
        Q(this)
      );
    }
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function wm(e, t) {
  const n = {
    get(o) {
      const r = this.__v_raw, s = Q(r), l = Q(o);
      e || (Dn(o, l) && qe(s, "get", o), qe(s, "get", l));
      const { has: a } = Oo(s), d = t ? ds : e ? fs : st;
      if (a.call(s, o))
        return d(r.get(o));
      if (a.call(s, l))
        return d(r.get(l));
      r !== s && r.get(o);
    },
    get size() {
      const o = this.__v_raw;
      return !e && qe(Q(o), "iterate", Jn), Reflect.get(o, "size", o);
    },
    has(o) {
      const r = this.__v_raw, s = Q(r), l = Q(o);
      return e || (Dn(o, l) && qe(s, "has", o), qe(s, "has", l)), o === l ? r.has(o) : r.has(o) || r.has(l);
    },
    forEach(o, r) {
      const s = this, l = s.__v_raw, a = Q(l), d = t ? ds : e ? fs : st;
      return !e && qe(a, "iterate", Jn), l.forEach((u, c) => o.call(r, d(u), d(c), s));
    }
  };
  return Be(
    n,
    e ? {
      add: To("add"),
      set: To("set"),
      delete: To("delete"),
      clear: To("clear")
    } : {
      add(o) {
        !t && !vt(o) && !vn(o) && (o = Q(o));
        const r = Q(this);
        return Oo(r).has.call(r, o) || (r.add(o), Yt(r, "add", o, o)), this;
      },
      set(o, r) {
        !t && !vt(r) && !vn(r) && (r = Q(r));
        const s = Q(this), { has: l, get: a } = Oo(s);
        let d = l.call(s, o);
        d ? Pe.NODE_ENV !== "production" && Wl(s, l, o) : (o = Q(o), d = l.call(s, o));
        const u = a.call(s, o);
        return s.set(o, r), d ? Dn(r, u) && Yt(s, "set", o, r, u) : Yt(s, "add", o, r), this;
      },
      delete(o) {
        const r = Q(this), { has: s, get: l } = Oo(r);
        let a = s.call(r, o);
        a ? Pe.NODE_ENV !== "production" && Wl(r, s, o) : (o = Q(o), a = s.call(r, o));
        const d = l ? l.call(r, o) : void 0, u = r.delete(o);
        return a && Yt(r, "delete", o, void 0, d), u;
      },
      clear() {
        const o = Q(this), r = o.size !== 0, s = Pe.NODE_ENV !== "production" ? Xn(o) ? new Map(o) : new Set(o) : void 0, l = o.clear();
        return r && Yt(
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
    n[o] = _m(o, e, t);
  }), n;
}
function Sr(e, t) {
  const n = wm(e, t);
  return (i, o, r) => o === "__v_isReactive" ? !e : o === "__v_isReadonly" ? e : o === "__v_raw" ? i : Reflect.get(
    Ce(n, o) && o in i ? n : i,
    o,
    r
  );
}
const Sm = {
  get: /* @__PURE__ */ Sr(!1, !1)
}, Em = {
  get: /* @__PURE__ */ Sr(!1, !0)
}, Cm = {
  get: /* @__PURE__ */ Sr(!0, !1)
}, km = {
  get: /* @__PURE__ */ Sr(!0, !0)
};
function Wl(e, t, n) {
  const i = Q(n);
  if (i !== n && t.call(e, i)) {
    const o = Us(e);
    Pt(
      `Reactive ${o} contains both the raw and reactive versions of the same object${o === "Map" ? " as keys" : ""}, which can lead to inconsistencies. Avoid differentiating between the raw and reactive versions of an object and only use the reactive version if possible.`
    );
  }
}
const zu = /* @__PURE__ */ new WeakMap(), Uu = /* @__PURE__ */ new WeakMap(), Wu = /* @__PURE__ */ new WeakMap(), Ku = /* @__PURE__ */ new WeakMap();
function Nm(e) {
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
function xm(e) {
  return e.__v_skip || !Object.isExtensible(e) ? 0 : Nm(Us(e));
}
function tt(e) {
  return vn(e) ? e : Er(
    e,
    !1,
    gm,
    Sm,
    zu
  );
}
function Vm(e) {
  return Er(
    e,
    !1,
    ym,
    Em,
    Uu
  );
}
function po(e) {
  return Er(
    e,
    !0,
    pm,
    Cm,
    Wu
  );
}
function Xt(e) {
  return Er(
    e,
    !0,
    bm,
    km,
    Ku
  );
}
function Er(e, t, n, i, o) {
  if (!Ve(e))
    return Pe.NODE_ENV !== "production" && Pt(
      `value cannot be made ${t ? "readonly" : "reactive"}: ${String(
        e
      )}`
    ), e;
  if (e.__v_raw && !(t && e.__v_isReactive))
    return e;
  const r = o.get(e);
  if (r)
    return r;
  const s = xm(e);
  if (s === 0)
    return e;
  const l = new Proxy(
    e,
    s === 2 ? i : n
  );
  return o.set(e, l), l;
}
function Qn(e) {
  return vn(e) ? Qn(e.__v_raw) : !!(e && e.__v_isReactive);
}
function vn(e) {
  return !!(e && e.__v_isReadonly);
}
function vt(e) {
  return !!(e && e.__v_isShallow);
}
function oo(e) {
  return e ? !!e.__v_raw : !1;
}
function Q(e) {
  const t = e && e.__v_raw;
  return t ? Q(t) : e;
}
function Gu(e) {
  return !Ce(e, "__v_skip") && Object.isExtensible(e) && qo(e, "__v_skip", !0), e;
}
const st = (e) => Ve(e) ? tt(e) : e, fs = (e) => Ve(e) ? po(e) : e;
function Ie(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function ce(e) {
  return Yu(e, !1);
}
function pe(e) {
  return Yu(e, !0);
}
function Yu(e, t) {
  return Ie(e) ? e : new Om(e, t);
}
class Om {
  constructor(t, n) {
    this.dep = new Zs(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : Q(t), this._value = n ? t : st(t), this.__v_isShallow = n;
  }
  get value() {
    return Pe.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, i = this.__v_isShallow || vt(t) || vn(t);
    t = i ? t : Q(t), Dn(t, n) && (this._rawValue = t, this._value = i ? t : st(t), Pe.NODE_ENV !== "production" ? this.dep.trigger({
      target: this,
      type: "set",
      key: "value",
      newValue: t,
      oldValue: n
    }) : this.dep.trigger());
  }
}
function Jt(e) {
  return Ie(e) ? e.value : e;
}
const Tm = {
  get: (e, t, n) => t === "__v_raw" ? e : Jt(Reflect.get(e, t, n)),
  set: (e, t, n, i) => {
    const o = e[t];
    return Ie(o) && !Ie(n) ? (o.value = n, !0) : Reflect.set(e, t, n, i);
  }
};
function qu(e) {
  return Qn(e) ? e : new Proxy(e, Tm);
}
function Xs(e) {
  Pe.NODE_ENV !== "production" && !oo(e) && Pt("toRefs() expects a reactive object but received a plain one.");
  const t = ne(e) ? new Array(e.length) : {};
  for (const n in e)
    t[n] = Zu(e, n);
  return t;
}
class Dm {
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
    return dm(Q(this._object), this._key);
  }
}
class Pm {
  constructor(t) {
    this._getter = t, this.__v_isRef = !0, this.__v_isReadonly = !0, this._value = void 0;
  }
  get value() {
    return this._value = this._getter();
  }
}
function oe(e, t, n) {
  return Ie(e) ? e : se(e) ? new Pm(e) : Ve(e) && arguments.length > 1 ? Zu(e, t, n) : ce(e);
}
function Zu(e, t, n) {
  const i = e[t];
  return Ie(i) ? i : new Dm(e, t, n);
}
class Am {
  constructor(t, n, i) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new Zs(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = no - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = i;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    Te !== this)
      return Au(this, !0), !0;
  }
  get value() {
    const t = Pe.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track();
    return Mu(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter ? this.setter(t) : Pe.NODE_ENV !== "production" && Pt("Write operation failed: computed value is readonly");
  }
}
function Im(e, t, n = !1) {
  let i, o;
  se(e) ? i = e : (i = e.get, o = e.set);
  const r = new Am(i, o, n);
  return Pe.NODE_ENV !== "production" && t && !n && (r.onTrack = t.onTrack, r.onTrigger = t.onTrigger), r;
}
const Do = {}, Xo = /* @__PURE__ */ new WeakMap();
let Gn;
function $m(e, t = !1, n = Gn) {
  if (n) {
    let i = Xo.get(n);
    i || Xo.set(n, i = []), i.push(e);
  } else Pe.NODE_ENV !== "production" && !t && Pt(
    "onWatcherCleanup() was called when there was no active watcher to associate with."
  );
}
function Mm(e, t, n = De) {
  const { immediate: i, deep: o, once: r, scheduler: s, augmentJob: l, call: a } = n, d = (x) => {
    (n.onWarn || Pt)(
      "Invalid watch source: ",
      x,
      "A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types."
    );
  }, u = (x) => o ? x : vt(x) || o === !1 || o === 0 ? un(x, 1) : un(x);
  let c, m, v, h, g = !1, S = !1;
  if (Ie(e) ? (m = () => e.value, g = vt(e)) : Qn(e) ? (m = () => u(e), g = !0) : ne(e) ? (S = !0, g = e.some((x) => Qn(x) || vt(x)), m = () => e.map((x) => {
    if (Ie(x))
      return x.value;
    if (Qn(x))
      return u(x);
    if (se(x))
      return a ? a(x, 2) : x();
    Pe.NODE_ENV !== "production" && d(x);
  })) : se(e) ? t ? m = a ? () => a(e, 2) : e : m = () => {
    if (v) {
      gn();
      try {
        v();
      } finally {
        pn();
      }
    }
    const x = Gn;
    Gn = c;
    try {
      return a ? a(e, 3, [h]) : e(h);
    } finally {
      Gn = x;
    }
  } : (m = Ze, Pe.NODE_ENV !== "production" && d(e)), t && o) {
    const x = m, N = o === !0 ? 1 / 0 : o;
    m = () => un(x(), N);
  }
  const k = am(), O = () => {
    c.stop(), k && js(k.effects, c);
  };
  if (r && t) {
    const x = t;
    t = (...N) => {
      x(...N), O();
    };
  }
  let P = S ? new Array(e.length).fill(Do) : Do;
  const M = (x) => {
    if (!(!(c.flags & 1) || !c.dirty && !x))
      if (t) {
        const N = c.run();
        if (o || g || (S ? N.some(($, C) => Dn($, P[C])) : Dn(N, P))) {
          v && v();
          const $ = Gn;
          Gn = c;
          try {
            const C = [
              N,
              // pass undefined as the old value when it's changed for the first time
              P === Do ? void 0 : S && P[0] === Do ? [] : P,
              h
            ];
            a ? a(t, 3, C) : (
              // @ts-expect-error
              t(...C)
            ), P = N;
          } finally {
            Gn = $;
          }
        }
      } else
        c.run();
  };
  return l && l(M), c = new Du(m), c.scheduler = s ? () => s(M, !1) : M, h = (x) => $m(x, !1, c), v = c.onStop = () => {
    const x = Xo.get(c);
    if (x) {
      if (a)
        a(x, 4);
      else
        for (const N of x) N();
      Xo.delete(c);
    }
  }, Pe.NODE_ENV !== "production" && (c.onTrack = n.onTrack, c.onTrigger = n.onTrigger), t ? i ? M(!0) : P = c.run() : s ? s(M.bind(null, !0), !0) : c.run(), O.pause = c.pause.bind(c), O.resume = c.resume.bind(c), O.stop = O, O;
}
function un(e, t = 1 / 0, n) {
  if (t <= 0 || !Ve(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e)))
    return e;
  if (n.add(e), t--, Ie(e))
    un(e.value, t, n);
  else if (ne(e))
    for (let i = 0; i < e.length; i++)
      un(e[i], t, n);
  else if (Cu(e) || Xn(e))
    e.forEach((i) => {
      un(i, t, n);
    });
  else if (Nu(e)) {
    for (const i in e)
      un(e[i], t, n);
    for (const i of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, i) && un(e[i], t, n);
  }
  return e;
}
var w = {};
const ei = [];
function Lo(e) {
  ei.push(e);
}
function Bo() {
  ei.pop();
}
let zr = !1;
function j(e, ...t) {
  if (zr) return;
  zr = !0, gn();
  const n = ei.length ? ei[ei.length - 1].component : null, i = n && n.appContext.config.warnHandler, o = Fm();
  if (i)
    Ai(
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
          ({ vnode: r }) => `at <${Or(n, r.type)}>`
        ).join(`
`),
        o
      ]
    );
  else {
    const r = [`[Vue warn]: ${e}`, ...t];
    o.length && r.push(`
`, ...Lm(o)), console.warn(...r);
  }
  pn(), zr = !1;
}
function Fm() {
  let e = ei[ei.length - 1];
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
function Lm(e) {
  const t = [];
  return e.forEach((n, i) => {
    t.push(...i === 0 ? [] : [`
`], ...Bm(n));
  }), t;
}
function Bm({ vnode: e, recurseCount: t }) {
  const n = t > 0 ? `... (${t} recursive calls)` : "", i = e.component ? e.component.parent == null : !1, o = ` at <${Or(
    e.component,
    e.type,
    i
  )}`, r = ">" + n;
  return e.props ? [o, ...Rm(e.props), r] : [o + r];
}
function Rm(e) {
  const t = [], n = Object.keys(e);
  return n.slice(0, 3).forEach((i) => {
    t.push(...Xu(i, e[i]));
  }), n.length > 3 && t.push(" ..."), t;
}
function Xu(e, t, n) {
  return Le(t) ? (t = JSON.stringify(t), n ? t : [`${e}=${t}`]) : typeof t == "number" || typeof t == "boolean" || t == null ? n ? t : [`${e}=${t}`] : Ie(t) ? (t = Xu(e, Q(t.value), !0), n ? t : [`${e}=Ref<`, t, ">"]) : se(t) ? [`${e}=fn${t.name ? `<${t.name}>` : ""}`] : (t = Q(t), n ? t : [`${e}=`, t]);
}
function Hm(e, t) {
  w.NODE_ENV !== "production" && e !== void 0 && (typeof e != "number" ? j(`${t} is not a valid number - got ${JSON.stringify(e)}.`) : isNaN(e) && j(`${t} is NaN - the duration expression might be incorrect.`));
}
const Js = {
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
function Ai(e, t, n, i) {
  try {
    return i ? e(...i) : e();
  } catch (o) {
    yo(o, t, n);
  }
}
function Ht(e, t, n, i) {
  if (se(e)) {
    const o = Ai(e, t, n, i);
    return o && zs(o) && o.catch((r) => {
      yo(r, t, n);
    }), o;
  }
  if (ne(e)) {
    const o = [];
    for (let r = 0; r < e.length; r++)
      o.push(Ht(e[r], t, n, i));
    return o;
  } else w.NODE_ENV !== "production" && j(
    `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof e}`
  );
}
function yo(e, t, n, i = !0) {
  const o = t ? t.vnode : null, { errorHandler: r, throwUnhandledErrorInProduction: s } = t && t.appContext.config || De;
  if (t) {
    let l = t.parent;
    const a = t.proxy, d = w.NODE_ENV !== "production" ? Js[n] : `https://vuejs.org/error-reference/#runtime-${n}`;
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
      gn(), Ai(r, null, 10, [
        e,
        a,
        d
      ]), pn();
      return;
    }
  }
  jm(e, n, o, i, s);
}
function jm(e, t, n, i = !0, o = !1) {
  if (w.NODE_ENV !== "production") {
    const r = Js[t];
    if (n && Lo(n), j(`Unhandled error${r ? ` during execution of ${r}` : ""}`), n && Bo(), i)
      throw e;
    console.error(e);
  } else {
    if (o)
      throw e;
    console.error(e);
  }
}
const mt = [];
let Gt = -1;
const Ci = [];
let xn = null, yi = 0;
const Ju = /* @__PURE__ */ Promise.resolve();
let Jo = null;
const zm = 100;
function At(e) {
  const t = Jo || Ju;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function Um(e) {
  let t = Gt + 1, n = mt.length;
  for (; t < n; ) {
    const i = t + n >>> 1, o = mt[i], r = ro(o);
    r < e || r === e && o.flags & 2 ? t = i + 1 : n = i;
  }
  return t;
}
function Cr(e) {
  if (!(e.flags & 1)) {
    const t = ro(e), n = mt[mt.length - 1];
    !n || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= ro(n) ? mt.push(e) : mt.splice(Um(t), 0, e), e.flags |= 1, Qu();
  }
}
function Qu() {
  Jo || (Jo = Ju.then(nc));
}
function ec(e) {
  ne(e) ? Ci.push(...e) : xn && e.id === -1 ? xn.splice(yi + 1, 0, e) : e.flags & 1 || (Ci.push(e), e.flags |= 1), Qu();
}
function Kl(e, t, n = Gt + 1) {
  for (w.NODE_ENV !== "production" && (t = t || /* @__PURE__ */ new Map()); n < mt.length; n++) {
    const i = mt[n];
    if (i && i.flags & 2) {
      if (e && i.id !== e.uid || w.NODE_ENV !== "production" && Qs(t, i))
        continue;
      mt.splice(n, 1), n--, i.flags & 4 && (i.flags &= -2), i(), i.flags & 4 || (i.flags &= -2);
    }
  }
}
function tc(e) {
  if (Ci.length) {
    const t = [...new Set(Ci)].sort(
      (n, i) => ro(n) - ro(i)
    );
    if (Ci.length = 0, xn) {
      xn.push(...t);
      return;
    }
    for (xn = t, w.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map()), yi = 0; yi < xn.length; yi++) {
      const n = xn[yi];
      w.NODE_ENV !== "production" && Qs(e, n) || (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2);
    }
    xn = null, yi = 0;
  }
}
const ro = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function nc(e) {
  w.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map());
  const t = w.NODE_ENV !== "production" ? (n) => Qs(e, n) : Ze;
  try {
    for (Gt = 0; Gt < mt.length; Gt++) {
      const n = mt[Gt];
      if (n && !(n.flags & 8)) {
        if (w.NODE_ENV !== "production" && t(n))
          continue;
        n.flags & 4 && (n.flags &= -2), Ai(
          n,
          n.i,
          n.i ? 15 : 14
        ), n.flags & 4 || (n.flags &= -2);
      }
    }
  } finally {
    for (; Gt < mt.length; Gt++) {
      const n = mt[Gt];
      n && (n.flags &= -2);
    }
    Gt = -1, mt.length = 0, tc(e), Jo = null, (mt.length || Ci.length) && nc(e);
  }
}
function Qs(e, t) {
  const n = e.get(t) || 0;
  if (n > zm) {
    const i = t.i, o = i && cl(i.type);
    return yo(
      `Maximum recursive updates exceeded${o ? ` in component <${o}>` : ""}. This means you have a reactive effect that is mutating its own dependencies and thus recursively triggering itself. Possible sources include component template, render function, updated hook or watcher source function.`,
      null,
      10
    ), !0;
  }
  return e.set(t, n + 1), !1;
}
let Bt = !1;
const Ro = /* @__PURE__ */ new Map();
w.NODE_ENV !== "production" && (go().__VUE_HMR_RUNTIME__ = {
  createRecord: Ur(ic),
  rerender: Ur(Gm),
  reload: Ur(Ym)
});
const ai = /* @__PURE__ */ new Map();
function Wm(e) {
  const t = e.type.__hmrId;
  let n = ai.get(t);
  n || (ic(t, e.type), n = ai.get(t)), n.instances.add(e);
}
function Km(e) {
  ai.get(e.type.__hmrId).instances.delete(e);
}
function ic(e, t) {
  return ai.has(e) ? !1 : (ai.set(e, {
    initialDef: Qo(t),
    instances: /* @__PURE__ */ new Set()
  }), !0);
}
function Qo(e) {
  return Kc(e) ? e.__vccOpts : e;
}
function Gm(e, t) {
  const n = ai.get(e);
  n && (n.initialDef.render = t, [...n.instances].forEach((i) => {
    t && (i.render = t, Qo(i.type).render = t), i.renderCache = [], Bt = !0, i.update(), Bt = !1;
  }));
}
function Ym(e, t) {
  const n = ai.get(e);
  if (!n) return;
  t = Qo(t), Gl(n.initialDef, t);
  const i = [...n.instances];
  for (let o = 0; o < i.length; o++) {
    const r = i[o], s = Qo(r.type);
    let l = Ro.get(s);
    l || (s !== n.initialDef && Gl(s, t), Ro.set(s, l = /* @__PURE__ */ new Set())), l.add(r), r.appContext.propsCache.delete(r.type), r.appContext.emitsCache.delete(r.type), r.appContext.optionsCache.delete(r.type), r.ceReload ? (l.add(r), r.ceReload(t.styles), l.delete(r)) : r.parent ? Cr(() => {
      Bt = !0, r.parent.update(), Bt = !1, l.delete(r);
    }) : r.appContext.reload ? r.appContext.reload() : typeof window < "u" ? window.location.reload() : console.warn(
      "[HMR] Root or manually mounted instance modified. Full reload required."
    ), r.root.ce && r !== r.root && r.root.ce._removeChildStyle(s);
  }
  ec(() => {
    Ro.clear();
  });
}
function Gl(e, t) {
  Be(e, t);
  for (const n in e)
    n !== "__file" && !(n in t) && delete e[n];
}
function Ur(e) {
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
let qt, Ki = [], ms = !1;
function bo(e, ...t) {
  qt ? qt.emit(e, ...t) : ms || Ki.push({ event: e, args: t });
}
function oc(e, t) {
  var n, i;
  qt = e, qt ? (qt.enabled = !0, Ki.forEach(({ event: o, args: r }) => qt.emit(o, ...r)), Ki = []) : /* handle late devtools injection - only do this if we are in an actual */ /* browser environment to avoid the timer handle stalling test runner exit */ /* (#4815) */ typeof window < "u" && // some envs mock window but not fully
  window.HTMLElement && // also exclude jsdom
  // eslint-disable-next-line no-restricted-syntax
  !((i = (n = window.navigator) == null ? void 0 : n.userAgent) != null && i.includes("jsdom")) ? ((t.__VUE_DEVTOOLS_HOOK_REPLAY__ = t.__VUE_DEVTOOLS_HOOK_REPLAY__ || []).push((r) => {
    oc(r, t);
  }), setTimeout(() => {
    qt || (t.__VUE_DEVTOOLS_HOOK_REPLAY__ = null, ms = !0, Ki = []);
  }, 3e3)) : (ms = !0, Ki = []);
}
function qm(e, t) {
  bo("app:init", e, t, {
    Fragment: Ne,
    Text: fi,
    Comment: Ge,
    Static: jo
  });
}
function Zm(e) {
  bo("app:unmount", e);
}
const Xm = /* @__PURE__ */ el(
  "component:added"
  /* COMPONENT_ADDED */
), rc = /* @__PURE__ */ el(
  "component:updated"
  /* COMPONENT_UPDATED */
), Jm = /* @__PURE__ */ el(
  "component:removed"
  /* COMPONENT_REMOVED */
), Qm = (e) => {
  qt && typeof qt.cleanupBuffer == "function" && // remove the component if it wasn't buffered
  !qt.cleanupBuffer(e) && Jm(e);
};
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function el(e) {
  return (t) => {
    bo(
      e,
      t.appContext.app,
      t.uid,
      t.parent ? t.parent.uid : void 0,
      t
    );
  };
}
const ev = /* @__PURE__ */ sc(
  "perf:start"
  /* PERFORMANCE_START */
), tv = /* @__PURE__ */ sc(
  "perf:end"
  /* PERFORMANCE_END */
);
function sc(e) {
  return (t, n, i) => {
    bo(e, t.appContext.app, t.uid, t, n, i);
  };
}
function nv(e, t, n) {
  bo(
    "component:emit",
    e.appContext.app,
    e,
    t,
    n
  );
}
let lt = null, lc = null;
function er(e) {
  const t = lt;
  return lt = e, lc = e && e.type.__scopeId || null, t;
}
function _(e, t = lt, n) {
  if (!t || e._n)
    return e;
  const i = (...o) => {
    i._d && aa(-1);
    const r = er(t);
    let s;
    try {
      s = e(...o);
    } finally {
      er(r), i._d && aa(1);
    }
    return w.NODE_ENV !== "production" && rc(t), s;
  };
  return i._n = !0, i._c = !0, i._d = !0, i;
}
function ac(e) {
  Wf(e) && j("Do not use built-in directive ids as custom directive id: " + e);
}
function Nt(e, t) {
  if (lt === null)
    return w.NODE_ENV !== "production" && j("withDirectives can only be used inside render functions."), e;
  const n = Vr(lt), i = e.dirs || (e.dirs = []);
  for (let o = 0; o < t.length; o++) {
    let [r, s, l, a = De] = t[o];
    r && (se(r) && (r = {
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
function jn(e, t, n, i) {
  const o = e.dirs, r = t && t.dirs;
  for (let s = 0; s < o.length; s++) {
    const l = o[s];
    r && (l.oldValue = r[s].value);
    let a = l.dir[i];
    a && (gn(), Ht(a, n, 8, [
      e.el,
      l,
      e,
      t
    ]), pn());
  }
}
const uc = Symbol("_vte"), cc = (e) => e.__isTeleport, ti = (e) => e && (e.disabled || e.disabled === ""), iv = (e) => e && (e.defer || e.defer === ""), Yl = (e) => typeof SVGElement < "u" && e instanceof SVGElement, ql = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement, vs = (e, t) => {
  const n = e && e.to;
  if (Le(n))
    if (t) {
      const i = t(n);
      return w.NODE_ENV !== "production" && !i && !ti(e) && j(
        `Failed to locate Teleport target with selector "${n}". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.`
      ), i;
    } else
      return w.NODE_ENV !== "production" && j(
        "Current renderer does not support string target for Teleports. (missing querySelector renderer option)"
      ), null;
  else
    return w.NODE_ENV !== "production" && !n && !ti(e) && j(`Invalid Teleport target: ${n}`), n;
}, ov = {
  name: "Teleport",
  __isTeleport: !0,
  process(e, t, n, i, o, r, s, l, a, d) {
    const {
      mc: u,
      pc: c,
      pbc: m,
      o: { insert: v, querySelector: h, createText: g, createComment: S }
    } = d, k = ti(t.props);
    let { shapeFlag: O, children: P, dynamicChildren: M } = t;
    if (w.NODE_ENV !== "production" && Bt && (a = !1, M = null), e == null) {
      const x = t.el = w.NODE_ENV !== "production" ? S("teleport start") : g(""), N = t.anchor = w.NODE_ENV !== "production" ? S("teleport end") : g("");
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
      }, C = () => {
        const V = t.target = vs(t.props, h), L = dc(V, t, g, v);
        V ? (s !== "svg" && Yl(V) ? s = "svg" : s !== "mathml" && ql(V) && (s = "mathml"), k || ($(V, L), Ho(t, !1))) : w.NODE_ENV !== "production" && !k && j(
          "Invalid Teleport target on mount:",
          V,
          `(${typeof V})`
        );
      };
      k && ($(n, N), Ho(t, !0)), iv(t.props) ? gt(C, r) : C();
    } else {
      t.el = e.el, t.targetStart = e.targetStart;
      const x = t.anchor = e.anchor, N = t.target = e.target, $ = t.targetAnchor = e.targetAnchor, C = ti(e.props), V = C ? n : N, L = C ? x : $;
      if (s === "svg" || Yl(N) ? s = "svg" : (s === "mathml" || ql(N)) && (s = "mathml"), M ? (m(
        e.dynamicChildren,
        M,
        V,
        o,
        r,
        s,
        l
      ), Qi(e, t, !0)) : a || c(
        e,
        t,
        V,
        L,
        o,
        r,
        s,
        l,
        !1
      ), k)
        C ? t.props && e.props && t.props.to !== e.props.to && (t.props.to = e.props.to) : Po(
          t,
          n,
          x,
          d,
          1
        );
      else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
        const A = t.target = vs(
          t.props,
          h
        );
        A ? Po(
          t,
          A,
          null,
          d,
          0
        ) : w.NODE_ENV !== "production" && j(
          "Invalid Teleport target on update:",
          N,
          `(${typeof N})`
        );
      } else C && Po(
        t,
        N,
        $,
        d,
        1
      );
      Ho(t, k);
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
      const v = r || !ti(m);
      for (let h = 0; h < l.length; h++) {
        const g = l[h];
        i(
          g,
          t,
          n,
          v,
          !!g.dynamicChildren
        );
      }
    }
  },
  move: Po,
  hydrate: rv
};
function Po(e, t, n, { o: { insert: i }, m: o }, r = 2) {
  r === 0 && i(e.targetAnchor, t, n);
  const { el: s, anchor: l, shapeFlag: a, children: d, props: u } = e, c = r === 2;
  if (c && i(s, t, n), (!c || ti(u)) && a & 16)
    for (let m = 0; m < d.length; m++)
      o(
        d[m],
        t,
        n,
        2
      );
  c && i(l, t, n);
}
function rv(e, t, n, i, o, r, {
  o: { nextSibling: s, parentNode: l, querySelector: a, insert: d, createText: u }
}, c) {
  const m = t.target = vs(
    t.props,
    a
  );
  if (m) {
    const v = ti(t.props), h = m._lpa || m.firstChild;
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
        ), t.targetStart = h, t.targetAnchor = h && s(h);
      else {
        t.anchor = s(e);
        let g = h;
        for (; g; ) {
          if (g && g.nodeType === 8) {
            if (g.data === "teleport start anchor")
              t.targetStart = g;
            else if (g.data === "teleport anchor") {
              t.targetAnchor = g, m._lpa = t.targetAnchor && s(t.targetAnchor);
              break;
            }
          }
          g = s(g);
        }
        t.targetAnchor || dc(m, t, u, d), c(
          h && s(h),
          t,
          m,
          n,
          i,
          o,
          r
        );
      }
    Ho(t, v);
  }
  return t.anchor && s(t.anchor);
}
const sv = ov;
function Ho(e, t) {
  const n = e.ctx;
  if (n && n.ut) {
    let i, o;
    for (t ? (i = e.el, o = e.anchor) : (i = e.targetStart, o = e.targetAnchor); i && i !== o; )
      i.nodeType === 1 && i.setAttribute("data-v-owner", n.uid), i = i.nextSibling;
    n.ut();
  }
}
function dc(e, t, n, i) {
  const o = t.targetStart = n(""), r = t.targetAnchor = n("");
  return o[uc] = r, e && (i(o, e), i(r, e)), r;
}
const Vn = Symbol("_leaveCb"), Ao = Symbol("_enterCb");
function fc() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  return $n(() => {
    e.isMounted = !0;
  }), yt(() => {
    e.isUnmounting = !0;
  }), e;
}
const Vt = [Function, Array], mc = {
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
}, vc = (e) => {
  const t = e.subTree;
  return t.component ? vc(t.component) : t;
}, lv = {
  name: "BaseTransition",
  props: mc,
  setup(e, { slots: t }) {
    const n = xr(), i = fc();
    return () => {
      const o = t.default && tl(t.default(), !0);
      if (!o || !o.length)
        return;
      const r = hc(o), s = Q(e), { mode: l } = s;
      if (w.NODE_ENV !== "production" && l && l !== "in-out" && l !== "out-in" && l !== "default" && j(`invalid <transition> mode: ${l}`), i.isLeaving)
        return Wr(r);
      const a = Zl(r);
      if (!a)
        return Wr(r);
      let d = so(
        a,
        s,
        i,
        n,
        // #11061, ensure enterHooks is fresh after clone
        (m) => d = m
      );
      a.type !== Ge && ui(a, d);
      const u = n.subTree, c = u && Zl(u);
      if (c && c.type !== Ge && !Yn(a, c) && vc(n).type !== Ge) {
        const m = so(
          c,
          s,
          i,
          n
        );
        if (ui(c, m), l === "out-in" && a.type !== Ge)
          return i.isLeaving = !0, m.afterLeave = () => {
            i.isLeaving = !1, n.job.flags & 8 || n.update(), delete m.afterLeave;
          }, Wr(r);
        l === "in-out" && a.type !== Ge && (m.delayLeave = (v, h, g) => {
          const S = gc(
            i,
            c
          );
          S[String(c.key)] = c, v[Vn] = () => {
            h(), v[Vn] = void 0, delete d.delayedLeave;
          }, d.delayedLeave = g;
        });
      }
      return r;
    };
  }
};
function hc(e) {
  let t = e[0];
  if (e.length > 1) {
    let n = !1;
    for (const i of e)
      if (i.type !== Ge) {
        if (w.NODE_ENV !== "production" && n) {
          j(
            "<transition> can only be used on a single element or component. Use <transition-group> for lists."
          );
          break;
        }
        if (t = i, n = !0, w.NODE_ENV === "production") break;
      }
  }
  return t;
}
const av = lv;
function gc(e, t) {
  const { leavingVNodes: n } = e;
  let i = n.get(t.type);
  return i || (i = /* @__PURE__ */ Object.create(null), n.set(t.type, i)), i;
}
function so(e, t, n, i, o) {
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
    onAfterLeave: h,
    onLeaveCancelled: g,
    onBeforeAppear: S,
    onAppear: k,
    onAfterAppear: O,
    onAppearCancelled: P
  } = t, M = String(e.key), x = gc(n, e), N = (V, L) => {
    V && Ht(
      V,
      i,
      9,
      L
    );
  }, $ = (V, L) => {
    const A = L[1];
    N(V, L), ne(V) ? V.every((E) => E.length <= 1) && A() : V.length <= 1 && A();
  }, C = {
    mode: s,
    persisted: l,
    beforeEnter(V) {
      let L = a;
      if (!n.isMounted)
        if (r)
          L = S || a;
        else
          return;
      V[Vn] && V[Vn](
        !0
        /* cancelled */
      );
      const A = x[M];
      A && Yn(e, A) && A.el[Vn] && A.el[Vn](), N(L, [V]);
    },
    enter(V) {
      let L = d, A = u, E = c;
      if (!n.isMounted)
        if (r)
          L = k || d, A = O || u, E = P || c;
        else
          return;
      let D = !1;
      const B = V[Ao] = (Z) => {
        D || (D = !0, Z ? N(E, [V]) : N(A, [V]), C.delayedLeave && C.delayedLeave(), V[Ao] = void 0);
      };
      L ? $(L, [V, B]) : B();
    },
    leave(V, L) {
      const A = String(e.key);
      if (V[Ao] && V[Ao](
        !0
        /* cancelled */
      ), n.isUnmounting)
        return L();
      N(m, [V]);
      let E = !1;
      const D = V[Vn] = (B) => {
        E || (E = !0, L(), B ? N(g, [V]) : N(h, [V]), V[Vn] = void 0, x[A] === e && delete x[A]);
      };
      x[A] = e, v ? $(v, [V, D]) : D();
    },
    clone(V) {
      const L = so(
        V,
        t,
        n,
        i,
        o
      );
      return o && o(L), L;
    }
  };
  return C;
}
function Wr(e) {
  if (_o(e))
    return e = jt(e), e.children = null, e;
}
function Zl(e) {
  if (!_o(e))
    return cc(e.type) && e.children ? hc(e.children) : e;
  if (w.NODE_ENV !== "production" && e.component)
    return e.component.subTree;
  const { shapeFlag: t, children: n } = e;
  if (n) {
    if (t & 16)
      return n[0];
    if (t & 32 && se(n.default))
      return n.default();
  }
}
function ui(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, ui(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function tl(e, t = !1, n) {
  let i = [], o = 0;
  for (let r = 0; r < e.length; r++) {
    let s = e[r];
    const l = n == null ? s.key : String(n) + String(s.key != null ? s.key : r);
    s.type === Ne ? (s.patchFlag & 128 && o++, i = i.concat(
      tl(s.children, t, l)
    )) : (t || s.type !== Ge) && i.push(l != null ? jt(s, { key: l }) : s);
  }
  if (o > 1)
    for (let r = 0; r < i.length; r++)
      i[r].patchFlag = -2;
  return i;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function uv(e, t) {
  return se(e) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    Be({ name: e.name }, t, { setup: e })
  ) : e;
}
function pc(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
const cv = /* @__PURE__ */ new WeakSet();
function hs(e, t, n, i, o = !1) {
  if (ne(e)) {
    e.forEach(
      (h, g) => hs(
        h,
        t && (ne(t) ? t[g] : t),
        n,
        i,
        o
      )
    );
    return;
  }
  if (Ji(i) && !o)
    return;
  const r = i.shapeFlag & 4 ? Vr(i.component) : i.el, s = o ? null : r, { i: l, r: a } = e;
  if (w.NODE_ENV !== "production" && !l) {
    j(
      "Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function."
    );
    return;
  }
  const d = t && t.r, u = l.refs === De ? l.refs = {} : l.refs, c = l.setupState, m = Q(c), v = c === De ? () => !1 : (h) => w.NODE_ENV !== "production" && (Ce(m, h) && !Ie(m[h]) && j(
    `Template ref "${h}" used on a non-ref value. It will not work in the production build.`
  ), cv.has(m[h])) ? !1 : Ce(m, h);
  if (d != null && d !== a && (Le(d) ? (u[d] = null, v(d) && (c[d] = null)) : Ie(d) && (d.value = null)), se(a))
    Ai(a, l, 12, [s, u]);
  else {
    const h = Le(a), g = Ie(a);
    if (h || g) {
      const S = () => {
        if (e.f) {
          const k = h ? v(a) ? c[a] : u[a] : a.value;
          o ? ne(k) && js(k, r) : ne(k) ? k.includes(r) || k.push(r) : h ? (u[a] = [r], v(a) && (c[a] = u[a])) : (a.value = [r], e.k && (u[e.k] = a.value));
        } else h ? (u[a] = s, v(a) && (c[a] = s)) : g ? (a.value = s, e.k && (u[e.k] = s)) : w.NODE_ENV !== "production" && j("Invalid template ref type:", a, `(${typeof a})`);
      };
      s ? (S.id = -1, gt(S, n)) : S();
    } else w.NODE_ENV !== "production" && j("Invalid template ref type:", a, `(${typeof a})`);
  }
}
go().requestIdleCallback;
go().cancelIdleCallback;
const Ji = (e) => !!e.type.__asyncLoader, _o = (e) => e.type.__isKeepAlive;
function yc(e, t) {
  _c(e, "a", t);
}
function bc(e, t) {
  _c(e, "da", t);
}
function _c(e, t, n = Xe) {
  const i = e.__wdc || (e.__wdc = () => {
    let o = n;
    for (; o; ) {
      if (o.isDeactivated)
        return;
      o = o.parent;
    }
    return e();
  });
  if (kr(t, i, n), n) {
    let o = n.parent;
    for (; o && o.parent; )
      _o(o.parent.vnode) && dv(i, t, n, o), o = o.parent;
  }
}
function dv(e, t, n, i) {
  const o = kr(
    t,
    e,
    i,
    !0
    /* prepend */
  );
  wc(() => {
    js(i[t], o);
  }, n);
}
function kr(e, t, n = Xe, i = !1) {
  if (n) {
    const o = n[e] || (n[e] = []), r = t.__weh || (t.__weh = (...s) => {
      gn();
      const l = wo(n), a = Ht(t, n, e, s);
      return l(), pn(), a;
    });
    return i ? o.unshift(r) : o.push(r), r;
  } else if (w.NODE_ENV !== "production") {
    const o = Kn(Js[e].replace(/ hook$/, ""));
    j(
      `${o} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
    );
  }
}
const yn = (e) => (t, n = Xe) => {
  (!ao || e === "sp") && kr(e, (...i) => t(...i), n);
}, nl = yn("bm"), $n = yn("m"), fv = yn(
  "bu"
), il = yn("u"), yt = yn(
  "bum"
), wc = yn("um"), mv = yn(
  "sp"
), vv = yn("rtg"), hv = yn("rtc");
function gv(e, t = Xe) {
  kr("ec", e, t);
}
const gs = "components", pv = "directives", yv = Symbol.for("v-ndc");
function bv(e) {
  return Le(e) && Sc(gs, e, !1) || e;
}
function Ii(e) {
  return Sc(pv, e);
}
function Sc(e, t, n = !0, i = !1) {
  const o = lt || Xe;
  if (o) {
    const r = o.type;
    if (e === gs) {
      const l = cl(
        r,
        !1
      );
      if (l && (l === t || l === nt(t) || l === Dt(nt(t))))
        return r;
    }
    const s = (
      // local registration
      // check instance[type] first which is resolved for options API
      Xl(o[e] || r[e], t) || // global registration
      Xl(o.appContext[e], t)
    );
    if (!s && i)
      return r;
    if (w.NODE_ENV !== "production" && n && !s) {
      const l = e === gs ? `
If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.` : "";
      j(`Failed to resolve ${e.slice(0, -1)}: ${t}${l}`);
    }
    return s;
  } else w.NODE_ENV !== "production" && j(
    `resolve${Dt(e.slice(0, -1))} can only be used in render() or setup().`
  );
}
function Xl(e, t) {
  return e && (e[t] || e[nt(t)] || e[Dt(nt(t))]);
}
function ki(e, t, n, i) {
  let o;
  const r = n, s = ne(e);
  if (s || Le(e)) {
    const l = s && Qn(e);
    let a = !1;
    l && (a = !vt(e), e = wr(e)), o = new Array(e.length);
    for (let d = 0, u = e.length; d < u; d++)
      o[d] = t(
        a ? st(e[d]) : e[d],
        d,
        void 0,
        r
      );
  } else if (typeof e == "number") {
    w.NODE_ENV !== "production" && !Number.isInteger(e) && j(`The v-for range expect an integer value but got ${e}.`), o = new Array(e);
    for (let l = 0; l < e; l++)
      o[l] = t(l + 1, l, void 0, r);
  } else if (Ve(e))
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
const ps = (e) => e ? Uc(e) ? Vr(e) : ps(e.parent) : null, ni = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ Be(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => w.NODE_ENV !== "production" ? Xt(e.props) : e.props,
    $attrs: (e) => w.NODE_ENV !== "production" ? Xt(e.attrs) : e.attrs,
    $slots: (e) => w.NODE_ENV !== "production" ? Xt(e.slots) : e.slots,
    $refs: (e) => w.NODE_ENV !== "production" ? Xt(e.refs) : e.refs,
    $parent: (e) => ps(e.parent),
    $root: (e) => ps(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => rl(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Cr(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = At.bind(e.proxy)),
    $watch: (e) => Xv.bind(e)
  })
), ol = (e) => e === "_" || e === "$", Kr = (e, t) => e !== De && !e.__isScriptSetup && Ce(e, t), Ec = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: n, setupState: i, data: o, props: r, accessCache: s, type: l, appContext: a } = e;
    if (w.NODE_ENV !== "production" && t === "__isVue")
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
        if (Kr(i, t))
          return s[t] = 1, i[t];
        if (o !== De && Ce(o, t))
          return s[t] = 2, o[t];
        if (
          // only cache other properties when instance has declared (thus stable)
          // props
          (d = e.propsOptions[0]) && Ce(d, t)
        )
          return s[t] = 3, r[t];
        if (n !== De && Ce(n, t))
          return s[t] = 4, n[t];
        ys && (s[t] = 0);
      }
    }
    const u = ni[t];
    let c, m;
    if (u)
      return t === "$attrs" ? (qe(e.attrs, "get", ""), w.NODE_ENV !== "production" && ir()) : w.NODE_ENV !== "production" && t === "$slots" && qe(e, "get", t), u(e);
    if (
      // css module (injected by vue-loader)
      (c = l.__cssModules) && (c = c[t])
    )
      return c;
    if (n !== De && Ce(n, t))
      return s[t] = 4, n[t];
    if (
      // global properties
      m = a.config.globalProperties, Ce(m, t)
    )
      return m[t];
    w.NODE_ENV !== "production" && lt && (!Le(t) || // #1091 avoid internal isRef/isVNode checks on component instance leading
    // to infinite warning loop
    t.indexOf("__v") !== 0) && (o !== De && ol(t[0]) && Ce(o, t) ? j(
      `Property ${JSON.stringify(
        t
      )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
    ) : e === lt && j(
      `Property ${JSON.stringify(t)} was accessed during render but is not defined on instance.`
    ));
  },
  set({ _: e }, t, n) {
    const { data: i, setupState: o, ctx: r } = e;
    return Kr(o, t) ? (o[t] = n, !0) : w.NODE_ENV !== "production" && o.__isScriptSetup && Ce(o, t) ? (j(`Cannot mutate <script setup> binding "${t}" from Options API.`), !1) : i !== De && Ce(i, t) ? (i[t] = n, !0) : Ce(e.props, t) ? (w.NODE_ENV !== "production" && j(`Attempting to mutate prop "${t}". Props are readonly.`), !1) : t[0] === "$" && t.slice(1) in e ? (w.NODE_ENV !== "production" && j(
      `Attempting to mutate public property "${t}". Properties starting with $ are reserved and readonly.`
    ), !1) : (w.NODE_ENV !== "production" && t in e.appContext.config.globalProperties ? Object.defineProperty(r, t, {
      enumerable: !0,
      configurable: !0,
      value: n
    }) : r[t] = n, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: n, ctx: i, appContext: o, propsOptions: r }
  }, s) {
    let l;
    return !!n[s] || e !== De && Ce(e, s) || Kr(t, s) || (l = r[0]) && Ce(l, s) || Ce(i, s) || Ce(ni, s) || Ce(o.config.globalProperties, s);
  },
  defineProperty(e, t, n) {
    return n.get != null ? e._.accessCache[t] = 0 : Ce(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
  }
};
w.NODE_ENV !== "production" && (Ec.ownKeys = (e) => (j(
  "Avoid app logic that relies on enumerating keys on a component instance. The keys will be empty in production mode to avoid performance overhead."
), Reflect.ownKeys(e)));
function _v(e) {
  const t = {};
  return Object.defineProperty(t, "_", {
    configurable: !0,
    enumerable: !1,
    get: () => e
  }), Object.keys(ni).forEach((n) => {
    Object.defineProperty(t, n, {
      configurable: !0,
      enumerable: !1,
      get: () => ni[n](e),
      // intercepted by the proxy so no need for implementation,
      // but needed to prevent set errors
      set: Ze
    });
  }), t;
}
function wv(e) {
  const {
    ctx: t,
    propsOptions: [n]
  } = e;
  n && Object.keys(n).forEach((i) => {
    Object.defineProperty(t, i, {
      enumerable: !0,
      configurable: !0,
      get: () => e.props[i],
      set: Ze
    });
  });
}
function Sv(e) {
  const { ctx: t, setupState: n } = e;
  Object.keys(Q(n)).forEach((i) => {
    if (!n.__isScriptSetup) {
      if (ol(i[0])) {
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
        set: Ze
      });
    }
  });
}
function Jl(e) {
  return ne(e) ? e.reduce(
    (t, n) => (t[n] = null, t),
    {}
  ) : e;
}
function Ev() {
  const e = /* @__PURE__ */ Object.create(null);
  return (t, n) => {
    e[n] ? j(`${t} property "${n}" is already defined in ${e[n]}.`) : e[n] = t;
  };
}
let ys = !0;
function Cv(e) {
  const t = rl(e), n = e.proxy, i = e.ctx;
  ys = !1, t.beforeCreate && Ql(t.beforeCreate, e, "bc");
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
    updated: h,
    activated: g,
    deactivated: S,
    beforeDestroy: k,
    beforeUnmount: O,
    destroyed: P,
    unmounted: M,
    render: x,
    renderTracked: N,
    renderTriggered: $,
    errorCaptured: C,
    serverPrefetch: V,
    // public API
    expose: L,
    inheritAttrs: A,
    // assets
    components: E,
    directives: D,
    filters: B
  } = t, Z = w.NODE_ENV !== "production" ? Ev() : null;
  if (w.NODE_ENV !== "production") {
    const [X] = e.propsOptions;
    if (X)
      for (const q in X)
        Z("Props", q);
  }
  if (d && kv(d, i, Z), s)
    for (const X in s) {
      const q = s[X];
      se(q) ? (w.NODE_ENV !== "production" ? Object.defineProperty(i, X, {
        value: q.bind(n),
        configurable: !0,
        enumerable: !0,
        writable: !0
      }) : i[X] = q.bind(n), w.NODE_ENV !== "production" && Z("Methods", X)) : w.NODE_ENV !== "production" && j(
        `Method "${X}" has type "${typeof q}" in the component definition. Did you reference the function correctly?`
      );
    }
  if (o) {
    w.NODE_ENV !== "production" && !se(o) && j(
      "The data option must be a function. Plain object usage is no longer supported."
    );
    const X = o.call(n, n);
    if (w.NODE_ENV !== "production" && zs(X) && j(
      "data() returned a Promise - note data() cannot be async; If you intend to perform data fetching before component renders, use async setup() + <Suspense>."
    ), !Ve(X))
      w.NODE_ENV !== "production" && j("data() should return an object.");
    else if (e.data = tt(X), w.NODE_ENV !== "production")
      for (const q in X)
        Z("Data", q), ol(q[0]) || Object.defineProperty(i, q, {
          configurable: !0,
          enumerable: !0,
          get: () => X[q],
          set: Ze
        });
  }
  if (ys = !0, r)
    for (const X in r) {
      const q = r[X], be = se(q) ? q.bind(n, n) : se(q.get) ? q.get.bind(n, n) : Ze;
      w.NODE_ENV !== "production" && be === Ze && j(`Computed property "${X}" has no getter.`);
      const _e = !se(q) && se(q.set) ? q.set.bind(n) : w.NODE_ENV !== "production" ? () => {
        j(
          `Write operation failed: computed property "${X}" is readonly.`
        );
      } : Ze, me = y({
        get: be,
        set: _e
      });
      Object.defineProperty(i, X, {
        enumerable: !0,
        configurable: !0,
        get: () => me.value,
        set: (ie) => me.value = ie
      }), w.NODE_ENV !== "production" && Z("Computed", X);
    }
  if (l)
    for (const X in l)
      Cc(l[X], i, n, X);
  if (a) {
    const X = se(a) ? a.call(n) : a;
    Reflect.ownKeys(X).forEach((q) => {
      ht(q, X[q]);
    });
  }
  u && Ql(u, e, "c");
  function ee(X, q) {
    ne(q) ? q.forEach((be) => X(be.bind(n))) : q && X(q.bind(n));
  }
  if (ee(nl, c), ee($n, m), ee(fv, v), ee(il, h), ee(yc, g), ee(bc, S), ee(gv, C), ee(hv, N), ee(vv, $), ee(yt, O), ee(wc, M), ee(mv, V), ne(L))
    if (L.length) {
      const X = e.exposed || (e.exposed = {});
      L.forEach((q) => {
        Object.defineProperty(X, q, {
          get: () => n[q],
          set: (be) => n[q] = be
        });
      });
    } else e.exposed || (e.exposed = {});
  x && e.render === Ze && (e.render = x), A != null && (e.inheritAttrs = A), E && (e.components = E), D && (e.directives = D), V && pc(e);
}
function kv(e, t, n = Ze) {
  ne(e) && (e = bs(e));
  for (const i in e) {
    const o = e[i];
    let r;
    Ve(o) ? "default" in o ? r = He(
      o.from || i,
      o.default,
      !0
    ) : r = He(o.from || i) : r = He(o), Ie(r) ? Object.defineProperty(t, i, {
      enumerable: !0,
      configurable: !0,
      get: () => r.value,
      set: (s) => r.value = s
    }) : t[i] = r, w.NODE_ENV !== "production" && n("Inject", i);
  }
}
function Ql(e, t, n) {
  Ht(
    ne(e) ? e.map((i) => i.bind(t.proxy)) : e.bind(t.proxy),
    t,
    n
  );
}
function Cc(e, t, n, i) {
  let o = i.includes(".") ? Mc(n, i) : () => n[i];
  if (Le(e)) {
    const r = t[e];
    se(r) ? he(o, r) : w.NODE_ENV !== "production" && j(`Invalid watch handler specified by key "${e}"`, r);
  } else if (se(e))
    he(o, e.bind(n));
  else if (Ve(e))
    if (ne(e))
      e.forEach((r) => Cc(r, t, n, i));
    else {
      const r = se(e.handler) ? e.handler.bind(n) : t[e.handler];
      se(r) ? he(o, r, e) : w.NODE_ENV !== "production" && j(`Invalid watch handler specified by key "${e.handler}"`, r);
    }
  else w.NODE_ENV !== "production" && j(`Invalid watch option: "${i}"`, e);
}
function rl(e) {
  const t = e.type, { mixins: n, extends: i } = t, {
    mixins: o,
    optionsCache: r,
    config: { optionMergeStrategies: s }
  } = e.appContext, l = r.get(t);
  let a;
  return l ? a = l : !o.length && !n && !i ? a = t : (a = {}, o.length && o.forEach(
    (d) => tr(a, d, s, !0)
  ), tr(a, t, s)), Ve(t) && r.set(t, a), a;
}
function tr(e, t, n, i = !1) {
  const { mixins: o, extends: r } = t;
  r && tr(e, r, n, !0), o && o.forEach(
    (s) => tr(e, s, n, !0)
  );
  for (const s in t)
    if (i && s === "expose")
      w.NODE_ENV !== "production" && j(
        '"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.'
      );
    else {
      const l = Nv[s] || n && n[s];
      e[s] = l ? l(e[s], t[s]) : t[s];
    }
  return e;
}
const Nv = {
  data: ea,
  props: ta,
  emits: ta,
  // objects
  methods: Gi,
  computed: Gi,
  // lifecycle
  beforeCreate: dt,
  created: dt,
  beforeMount: dt,
  mounted: dt,
  beforeUpdate: dt,
  updated: dt,
  beforeDestroy: dt,
  beforeUnmount: dt,
  destroyed: dt,
  unmounted: dt,
  activated: dt,
  deactivated: dt,
  errorCaptured: dt,
  serverPrefetch: dt,
  // assets
  components: Gi,
  directives: Gi,
  // watch
  watch: Vv,
  // provide / inject
  provide: ea,
  inject: xv
};
function ea(e, t) {
  return t ? e ? function() {
    return Be(
      se(e) ? e.call(this, this) : e,
      se(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function xv(e, t) {
  return Gi(bs(e), bs(t));
}
function bs(e) {
  if (ne(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++)
      t[e[n]] = e[n];
    return t;
  }
  return e;
}
function dt(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function Gi(e, t) {
  return e ? Be(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function ta(e, t) {
  return e ? ne(e) && ne(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : Be(
    /* @__PURE__ */ Object.create(null),
    Jl(e),
    Jl(t ?? {})
  ) : t;
}
function Vv(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = Be(/* @__PURE__ */ Object.create(null), e);
  for (const i in t)
    n[i] = dt(e[i], t[i]);
  return n;
}
function kc() {
  return {
    app: null,
    config: {
      isNativeTag: zf,
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
let Ov = 0;
function Tv(e, t) {
  return function(i, o = null) {
    se(i) || (i = Be({}, i)), o != null && !Ve(o) && (w.NODE_ENV !== "production" && j("root props passed to app.mount() must be an object."), o = null);
    const r = kc(), s = /* @__PURE__ */ new WeakSet(), l = [];
    let a = !1;
    const d = r.app = {
      _uid: Ov++,
      _component: i,
      _props: o,
      _container: null,
      _context: r,
      _instance: null,
      version: fa,
      get config() {
        return r.config;
      },
      set config(u) {
        w.NODE_ENV !== "production" && j(
          "app.config cannot be replaced. Modify individual options instead."
        );
      },
      use(u, ...c) {
        return s.has(u) ? w.NODE_ENV !== "production" && j("Plugin has already been applied to target app.") : u && se(u.install) ? (s.add(u), u.install(d, ...c)) : se(u) ? (s.add(u), u(d, ...c)) : w.NODE_ENV !== "production" && j(
          'A plugin must either be a function or an object with an "install" function.'
        ), d;
      },
      mixin(u) {
        return r.mixins.includes(u) ? w.NODE_ENV !== "production" && j(
          "Mixin has already been applied to target app" + (u.name ? `: ${u.name}` : "")
        ) : r.mixins.push(u), d;
      },
      component(u, c) {
        return w.NODE_ENV !== "production" && Cs(u, r.config), c ? (w.NODE_ENV !== "production" && r.components[u] && j(`Component "${u}" has already been registered in target app.`), r.components[u] = c, d) : r.components[u];
      },
      directive(u, c) {
        return w.NODE_ENV !== "production" && ac(u), c ? (w.NODE_ENV !== "production" && r.directives[u] && j(`Directive "${u}" has already been registered in target app.`), r.directives[u] = c, d) : r.directives[u];
      },
      mount(u, c, m) {
        if (a)
          w.NODE_ENV !== "production" && j(
            "App has already been mounted.\nIf you want to remount the same app, move your app creation logic into a factory function and create fresh app instances for each mount - e.g. `const createMyApp = () => createApp(App)`"
          );
        else {
          w.NODE_ENV !== "production" && u.__vue_app__ && j(
            "There is already an app instance mounted on the host container.\n If you want to mount another app on the same host container, you need to unmount the previous app by calling `app.unmount()` first."
          );
          const v = d._ceVNode || f(i, o);
          return v.appContext = r, m === !0 ? m = "svg" : m === !1 && (m = void 0), w.NODE_ENV !== "production" && (r.reload = () => {
            e(
              jt(v),
              u,
              m
            );
          }), c && t ? t(v, u) : e(v, u, m), a = !0, d._container = u, u.__vue_app__ = d, w.NODE_ENV !== "production" && (d._instance = v.component, qm(d, fa)), Vr(v.component);
        }
      },
      onUnmount(u) {
        w.NODE_ENV !== "production" && typeof u != "function" && j(
          `Expected function as first argument to app.onUnmount(), but got ${typeof u}`
        ), l.push(u);
      },
      unmount() {
        a ? (Ht(
          l,
          d._instance,
          16
        ), e(null, d._container), w.NODE_ENV !== "production" && (d._instance = null, Zm(d)), delete d._container.__vue_app__) : w.NODE_ENV !== "production" && j("Cannot unmount an app that is not mounted.");
      },
      provide(u, c) {
        return w.NODE_ENV !== "production" && u in r.provides && j(
          `App already provides property with key "${String(u)}". It will be overwritten with the new value.`
        ), r.provides[u] = c, d;
      },
      runWithContext(u) {
        const c = Ni;
        Ni = d;
        try {
          return u();
        } finally {
          Ni = c;
        }
      }
    };
    return d;
  };
}
let Ni = null;
function ht(e, t) {
  if (!Xe)
    w.NODE_ENV !== "production" && j("provide() can only be used inside setup().");
  else {
    let n = Xe.provides;
    const i = Xe.parent && Xe.parent.provides;
    i === n && (n = Xe.provides = Object.create(i)), n[e] = t;
  }
}
function He(e, t, n = !1) {
  const i = Xe || lt;
  if (i || Ni) {
    const o = Ni ? Ni._context.provides : i ? i.parent == null ? i.vnode.appContext && i.vnode.appContext.provides : i.parent.provides : void 0;
    if (o && e in o)
      return o[e];
    if (arguments.length > 1)
      return n && se(t) ? t.call(i && i.proxy) : t;
    w.NODE_ENV !== "production" && j(`injection "${String(e)}" not found.`);
  } else w.NODE_ENV !== "production" && j("inject() can only be used inside setup() or functional components.");
}
const Nc = {}, xc = () => Object.create(Nc), Vc = (e) => Object.getPrototypeOf(e) === Nc;
function Dv(e, t, n, i = !1) {
  const o = {}, r = xc();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), Oc(e, t, o, r);
  for (const s in e.propsOptions[0])
    s in o || (o[s] = void 0);
  w.NODE_ENV !== "production" && Dc(t || {}, o, e), n ? e.props = i ? o : Vm(o) : e.type.props ? e.props = o : e.props = r, e.attrs = r;
}
function Pv(e) {
  for (; e; ) {
    if (e.type.__hmrId) return !0;
    e = e.parent;
  }
}
function Av(e, t, n, i) {
  const {
    props: o,
    attrs: r,
    vnode: { patchFlag: s }
  } = e, l = Q(o), [a] = e.propsOptions;
  let d = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(w.NODE_ENV !== "production" && Pv(e)) && (i || s > 0) && !(s & 16)
  ) {
    if (s & 8) {
      const u = e.vnode.dynamicProps;
      for (let c = 0; c < u.length; c++) {
        let m = u[c];
        if (Nr(e.emitsOptions, m))
          continue;
        const v = t[m];
        if (a)
          if (Ce(r, m))
            v !== r[m] && (r[m] = v, d = !0);
          else {
            const h = nt(m);
            o[h] = _s(
              a,
              l,
              h,
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
    Oc(e, t, o, r) && (d = !0);
    let u;
    for (const c in l)
      (!t || // for camelCase
      !Ce(t, c) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((u = Pn(c)) === c || !Ce(t, u))) && (a ? n && // for camelCase
      (n[c] !== void 0 || // for kebab-case
      n[u] !== void 0) && (o[c] = _s(
        a,
        l,
        c,
        void 0,
        e,
        !0
      )) : delete o[c]);
    if (r !== l)
      for (const c in r)
        (!t || !Ce(t, c)) && (delete r[c], d = !0);
  }
  d && Yt(e.attrs, "set", ""), w.NODE_ENV !== "production" && Dc(t || {}, o, e);
}
function Oc(e, t, n, i) {
  const [o, r] = e.propsOptions;
  let s = !1, l;
  if (t)
    for (let a in t) {
      if (qi(a))
        continue;
      const d = t[a];
      let u;
      o && Ce(o, u = nt(a)) ? !r || !r.includes(u) ? n[u] = d : (l || (l = {}))[u] = d : Nr(e.emitsOptions, a) || (!(a in i) || d !== i[a]) && (i[a] = d, s = !0);
    }
  if (r) {
    const a = Q(n), d = l || De;
    for (let u = 0; u < r.length; u++) {
      const c = r[u];
      n[c] = _s(
        o,
        a,
        c,
        d[c],
        e,
        !Ce(d, c)
      );
    }
  }
  return s;
}
function _s(e, t, n, i, o, r) {
  const s = e[n];
  if (s != null) {
    const l = Ce(s, "default");
    if (l && i === void 0) {
      const a = s.default;
      if (s.type !== Function && !s.skipFactory && se(a)) {
        const { propsDefaults: d } = o;
        if (n in d)
          i = d[n];
        else {
          const u = wo(o);
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
    ] && (i === "" || i === Pn(n)) && (i = !0));
  }
  return i;
}
const Iv = /* @__PURE__ */ new WeakMap();
function Tc(e, t, n = !1) {
  const i = n ? Iv : t.propsCache, o = i.get(e);
  if (o)
    return o;
  const r = e.props, s = {}, l = [];
  let a = !1;
  if (!se(e)) {
    const u = (c) => {
      a = !0;
      const [m, v] = Tc(c, t, !0);
      Be(s, m), v && l.push(...v);
    };
    !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
  }
  if (!r && !a)
    return Ve(e) && i.set(e, Ei), Ei;
  if (ne(r))
    for (let u = 0; u < r.length; u++) {
      w.NODE_ENV !== "production" && !Le(r[u]) && j("props must be strings when using array syntax.", r[u]);
      const c = nt(r[u]);
      na(c) && (s[c] = De);
    }
  else if (r) {
    w.NODE_ENV !== "production" && !Ve(r) && j("invalid props options", r);
    for (const u in r) {
      const c = nt(u);
      if (na(c)) {
        const m = r[u], v = s[c] = ne(m) || se(m) ? { type: m } : Be({}, m), h = v.type;
        let g = !1, S = !0;
        if (ne(h))
          for (let k = 0; k < h.length; ++k) {
            const O = h[k], P = se(O) && O.name;
            if (P === "Boolean") {
              g = !0;
              break;
            } else P === "String" && (S = !1);
          }
        else
          g = se(h) && h.name === "Boolean";
        v[
          0
          /* shouldCast */
        ] = g, v[
          1
          /* shouldCastTrue */
        ] = S, (g || Ce(v, "default")) && l.push(c);
      }
    }
  }
  const d = [s, l];
  return Ve(e) && i.set(e, d), d;
}
function na(e) {
  return e[0] !== "$" && !qi(e) ? !0 : (w.NODE_ENV !== "production" && j(`Invalid prop name: "${e}" is a reserved property.`), !1);
}
function $v(e) {
  return e === null ? "null" : typeof e == "function" ? e.name || "" : typeof e == "object" && e.constructor && e.constructor.name || "";
}
function Dc(e, t, n) {
  const i = Q(t), o = n.propsOptions[0], r = Object.keys(e).map((s) => nt(s));
  for (const s in o) {
    let l = o[s];
    l != null && Mv(
      s,
      i[s],
      l,
      w.NODE_ENV !== "production" ? Xt(i) : i,
      !r.includes(s)
    );
  }
}
function Mv(e, t, n, i, o) {
  const { type: r, required: s, validator: l, skipCheck: a } = n;
  if (s && o) {
    j('Missing required prop: "' + e + '"');
    return;
  }
  if (!(t == null && !s)) {
    if (r != null && r !== !0 && !a) {
      let d = !1;
      const u = ne(r) ? r : [r], c = [];
      for (let m = 0; m < u.length && !d; m++) {
        const { valid: v, expectedType: h } = Lv(t, u[m]);
        c.push(h || ""), d = v;
      }
      if (!d) {
        j(Bv(e, t, c));
        return;
      }
    }
    l && !l(t, i) && j('Invalid prop: custom validator check failed for prop "' + e + '".');
  }
}
const Fv = /* @__PURE__ */ hn(
  "String,Number,Boolean,Function,Symbol,BigInt"
);
function Lv(e, t) {
  let n;
  const i = $v(t);
  if (i === "null")
    n = e === null;
  else if (Fv(i)) {
    const o = typeof e;
    n = o === i.toLowerCase(), !n && o === "object" && (n = e instanceof t);
  } else i === "Object" ? n = Ve(e) : i === "Array" ? n = ne(e) : n = e instanceof t;
  return {
    valid: n,
    expectedType: i
  };
}
function Bv(e, t, n) {
  if (n.length === 0)
    return `Prop type [] for prop "${e}" won't match anything. Did you mean to use type Array instead?`;
  let i = `Invalid prop: type check failed for prop "${e}". Expected ${n.map(Dt).join(" | ")}`;
  const o = n[0], r = Us(t), s = ia(t, o), l = ia(t, r);
  return n.length === 1 && oa(o) && !Rv(o, r) && (i += ` with value ${s}`), i += `, got ${r} `, oa(r) && (i += `with value ${l}.`), i;
}
function ia(e, t) {
  return t === "String" ? `"${e}"` : t === "Number" ? `${Number(e)}` : `${e}`;
}
function oa(e) {
  return ["string", "number", "boolean"].some((n) => e.toLowerCase() === n);
}
function Rv(...e) {
  return e.some((t) => t.toLowerCase() === "boolean");
}
const Pc = (e) => e[0] === "_" || e === "$stable", sl = (e) => ne(e) ? e.map(Lt) : [Lt(e)], Hv = (e, t, n) => {
  if (t._n)
    return t;
  const i = _((...o) => (w.NODE_ENV !== "production" && Xe && (!n || n.root === Xe.root) && j(
    `Slot "${e}" invoked outside of the render function: this will not track dependencies used in the slot. Invoke the slot function inside the render function instead.`
  ), sl(t(...o))), n);
  return i._c = !1, i;
}, Ac = (e, t, n) => {
  const i = e._ctx;
  for (const o in e) {
    if (Pc(o)) continue;
    const r = e[o];
    if (se(r))
      t[o] = Hv(o, r, i);
    else if (r != null) {
      w.NODE_ENV !== "production" && j(
        `Non-function value encountered for slot "${o}". Prefer function slots for better performance.`
      );
      const s = sl(r);
      t[o] = () => s;
    }
  }
}, Ic = (e, t) => {
  w.NODE_ENV !== "production" && !_o(e.vnode) && j(
    "Non-function value encountered for default slot. Prefer function slots for better performance."
  );
  const n = sl(t);
  e.slots.default = () => n;
}, ws = (e, t, n) => {
  for (const i in t)
    (n || i !== "_") && (e[i] = t[i]);
}, jv = (e, t, n) => {
  const i = e.slots = xc();
  if (e.vnode.shapeFlag & 32) {
    const o = t._;
    o ? (ws(i, t, n), n && qo(i, "_", o, !0)) : Ac(t, i);
  } else t && Ic(e, t);
}, zv = (e, t, n) => {
  const { vnode: i, slots: o } = e;
  let r = !0, s = De;
  if (i.shapeFlag & 32) {
    const l = t._;
    l ? w.NODE_ENV !== "production" && Bt ? (ws(o, t, n), Yt(e, "set", "$slots")) : n && l === 1 ? r = !1 : ws(o, t, n) : (r = !t.$stable, Ac(t, o)), s = t;
  } else t && (Ic(e, t), s = { default: 1 });
  if (r)
    for (const l in o)
      !Pc(l) && s[l] == null && delete o[l];
};
let Ri, Tn;
function rn(e, t) {
  e.appContext.config.performance && nr() && Tn.mark(`vue-${t}-${e.uid}`), w.NODE_ENV !== "production" && ev(e, t, nr() ? Tn.now() : Date.now());
}
function sn(e, t) {
  if (e.appContext.config.performance && nr()) {
    const n = `vue-${t}-${e.uid}`, i = n + ":end";
    Tn.mark(i), Tn.measure(
      `<${Or(e, e.type)}> ${t}`,
      n,
      i
    ), Tn.clearMarks(n), Tn.clearMarks(i);
  }
  w.NODE_ENV !== "production" && tv(e, t, nr() ? Tn.now() : Date.now());
}
function nr() {
  return Ri !== void 0 || (typeof window < "u" && window.performance ? (Ri = !0, Tn = window.performance) : Ri = !1), Ri;
}
function Uv() {
  const e = [];
  if (w.NODE_ENV !== "production" && e.length) {
    const t = e.length > 1;
    console.warn(
      `Feature flag${t ? "s" : ""} ${e.join(", ")} ${t ? "are" : "is"} not explicitly defined. You are running the esm-bundler build of Vue, which expects these compile-time feature flags to be globally injected via the bundler config in order to get better tree-shaking in the production bundle.

For more details, see https://link.vuejs.org/feature-flags.`
    );
  }
}
const gt = oh;
function Wv(e) {
  return Kv(e);
}
function Kv(e, t) {
  Uv();
  const n = go();
  n.__VUE__ = !0, w.NODE_ENV !== "production" && oc(n.__VUE_DEVTOOLS_GLOBAL_HOOK__, n);
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
    setScopeId: v = Ze,
    insertStaticContent: h
  } = e, g = (p, b, T, R = null, I = null, F = null, K = void 0, U = null, z = w.NODE_ENV !== "production" && Bt ? !1 : !!b.dynamicChildren) => {
    if (p === b)
      return;
    p && !Yn(p, b) && (R = $e(p), Oe(p, I, F, !0), p = null), b.patchFlag === -2 && (z = !1, b.dynamicChildren = null);
    const { type: H, ref: ue, shapeFlag: G } = b;
    switch (H) {
      case fi:
        S(p, b, T, R);
        break;
      case Ge:
        k(p, b, T, R);
        break;
      case jo:
        p == null ? O(b, T, R, K) : w.NODE_ENV !== "production" && P(p, b, T, K);
        break;
      case Ne:
        D(
          p,
          b,
          T,
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
          T,
          R,
          I,
          F,
          K,
          U,
          z
        ) : G & 6 ? B(
          p,
          b,
          T,
          R,
          I,
          F,
          K,
          U,
          z
        ) : G & 64 || G & 128 ? H.process(
          p,
          b,
          T,
          R,
          I,
          F,
          K,
          U,
          z,
          Hn
        ) : w.NODE_ENV !== "production" && j("Invalid VNode type:", H, `(${typeof H})`);
    }
    ue != null && I && hs(ue, p && p.ref, F, b || p, !b);
  }, S = (p, b, T, R) => {
    if (p == null)
      i(
        b.el = l(b.children),
        T,
        R
      );
    else {
      const I = b.el = p.el;
      b.children !== p.children && d(I, b.children);
    }
  }, k = (p, b, T, R) => {
    p == null ? i(
      b.el = a(b.children || ""),
      T,
      R
    ) : b.el = p.el;
  }, O = (p, b, T, R) => {
    [p.el, p.anchor] = h(
      p.children,
      b,
      T,
      R,
      p.el,
      p.anchor
    );
  }, P = (p, b, T, R) => {
    if (b.children !== p.children) {
      const I = m(p.anchor);
      x(p), [b.el, b.anchor] = h(
        b.children,
        T,
        I,
        R
      );
    } else
      b.el = p.el, b.anchor = p.anchor;
  }, M = ({ el: p, anchor: b }, T, R) => {
    let I;
    for (; p && p !== b; )
      I = m(p), i(p, T, R), p = I;
    i(b, T, R);
  }, x = ({ el: p, anchor: b }) => {
    let T;
    for (; p && p !== b; )
      T = m(p), o(p), p = T;
    o(b);
  }, N = (p, b, T, R, I, F, K, U, z) => {
    b.type === "svg" ? K = "svg" : b.type === "math" && (K = "mathml"), p == null ? $(
      b,
      T,
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
  }, $ = (p, b, T, R, I, F, K, U) => {
    let z, H;
    const { props: ue, shapeFlag: G, transition: te, dirs: fe } = p;
    if (z = p.el = s(
      p.type,
      F,
      ue && ue.is,
      ue
    ), G & 8 ? u(z, p.children) : G & 16 && V(
      p.children,
      z,
      null,
      R,
      I,
      Gr(p, F),
      K,
      U
    ), fe && jn(p, null, R, "created"), C(z, p, p.scopeId, K, R), ue) {
      for (const Me in ue)
        Me !== "value" && !qi(Me) && r(z, Me, null, ue[Me], F, R);
      "value" in ue && r(z, "value", null, ue.value, F), (H = ue.onVnodeBeforeMount) && Kt(H, R, p);
    }
    w.NODE_ENV !== "production" && (qo(z, "__vnode", p, !0), qo(z, "__vueParentComponent", R, !0)), fe && jn(p, null, R, "beforeMount");
    const Se = Gv(I, te);
    Se && te.beforeEnter(z), i(z, b, T), ((H = ue && ue.onVnodeMounted) || Se || fe) && gt(() => {
      H && Kt(H, R, p), Se && te.enter(z), fe && jn(p, null, R, "mounted");
    }, I);
  }, C = (p, b, T, R, I) => {
    if (T && v(p, T), R)
      for (let F = 0; F < R.length; F++)
        v(p, R[F]);
    if (I) {
      let F = I.subTree;
      if (w.NODE_ENV !== "production" && F.patchFlag > 0 && F.patchFlag & 2048 && (F = al(F.children) || F), b === F || Bc(F.type) && (F.ssContent === b || F.ssFallback === b)) {
        const K = I.vnode;
        C(
          p,
          K,
          K.scopeId,
          K.slotScopeIds,
          I.parent
        );
      }
    }
  }, V = (p, b, T, R, I, F, K, U, z = 0) => {
    for (let H = z; H < p.length; H++) {
      const ue = p[H] = U ? On(p[H]) : Lt(p[H]);
      g(
        null,
        ue,
        b,
        T,
        R,
        I,
        F,
        K,
        U
      );
    }
  }, L = (p, b, T, R, I, F, K) => {
    const U = b.el = p.el;
    w.NODE_ENV !== "production" && (U.__vnode = b);
    let { patchFlag: z, dynamicChildren: H, dirs: ue } = b;
    z |= p.patchFlag & 16;
    const G = p.props || De, te = b.props || De;
    let fe;
    if (T && zn(T, !1), (fe = te.onVnodeBeforeUpdate) && Kt(fe, T, b, p), ue && jn(b, p, T, "beforeUpdate"), T && zn(T, !0), w.NODE_ENV !== "production" && Bt && (z = 0, K = !1, H = null), (G.innerHTML && te.innerHTML == null || G.textContent && te.textContent == null) && u(U, ""), H ? (A(
      p.dynamicChildren,
      H,
      U,
      T,
      R,
      Gr(b, I),
      F
    ), w.NODE_ENV !== "production" && Qi(p, b)) : K || be(
      p,
      b,
      U,
      null,
      T,
      R,
      Gr(b, I),
      F,
      !1
    ), z > 0) {
      if (z & 16)
        E(U, G, te, T, I);
      else if (z & 2 && G.class !== te.class && r(U, "class", null, te.class, I), z & 4 && r(U, "style", G.style, te.style, I), z & 8) {
        const Se = b.dynamicProps;
        for (let Me = 0; Me < Se.length; Me++) {
          const Ae = Se[Me], wt = G[Ae], rt = te[Ae];
          (rt !== wt || Ae === "value") && r(U, Ae, wt, rt, I, T);
        }
      }
      z & 1 && p.children !== b.children && u(U, b.children);
    } else !K && H == null && E(U, G, te, T, I);
    ((fe = te.onVnodeUpdated) || ue) && gt(() => {
      fe && Kt(fe, T, b, p), ue && jn(b, p, T, "updated");
    }, R);
  }, A = (p, b, T, R, I, F, K) => {
    for (let U = 0; U < b.length; U++) {
      const z = p[U], H = b[U], ue = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        z.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (z.type === Ne || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !Yn(z, H) || // - In the case of a component, it could contain anything.
        z.shapeFlag & 70) ? c(z.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          T
        )
      );
      g(
        z,
        H,
        ue,
        null,
        R,
        I,
        F,
        K,
        !0
      );
    }
  }, E = (p, b, T, R, I) => {
    if (b !== T) {
      if (b !== De)
        for (const F in b)
          !qi(F) && !(F in T) && r(
            p,
            F,
            b[F],
            null,
            I,
            R
          );
      for (const F in T) {
        if (qi(F)) continue;
        const K = T[F], U = b[F];
        K !== U && F !== "value" && r(p, F, U, K, I, R);
      }
      "value" in T && r(p, "value", b.value, T.value, I);
    }
  }, D = (p, b, T, R, I, F, K, U, z) => {
    const H = b.el = p ? p.el : l(""), ue = b.anchor = p ? p.anchor : l("");
    let { patchFlag: G, dynamicChildren: te, slotScopeIds: fe } = b;
    w.NODE_ENV !== "production" && // #5523 dev root fragment may inherit directives
    (Bt || G & 2048) && (G = 0, z = !1, te = null), fe && (U = U ? U.concat(fe) : fe), p == null ? (i(H, T, R), i(ue, T, R), V(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      b.children || [],
      T,
      ue,
      I,
      F,
      K,
      U,
      z
    )) : G > 0 && G & 64 && te && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    p.dynamicChildren ? (A(
      p.dynamicChildren,
      te,
      T,
      I,
      F,
      K,
      U
    ), w.NODE_ENV !== "production" ? Qi(p, b) : (
      // #2080 if the stable fragment has a key, it's a <template v-for> that may
      //  get moved around. Make sure all root level vnodes inherit el.
      // #2134 or if it's a component root, it may also get moved around
      // as the component is being moved.
      (b.key != null || I && b === I.subTree) && Qi(
        p,
        b,
        !0
        /* shallow */
      )
    )) : be(
      p,
      b,
      T,
      ue,
      I,
      F,
      K,
      U,
      z
    );
  }, B = (p, b, T, R, I, F, K, U, z) => {
    b.slotScopeIds = U, p == null ? b.shapeFlag & 512 ? I.ctx.activate(
      b,
      T,
      R,
      K,
      z
    ) : Z(
      b,
      T,
      R,
      I,
      F,
      K,
      z
    ) : ee(p, b, z);
  }, Z = (p, b, T, R, I, F, K) => {
    const U = p.component = ch(
      p,
      R,
      I
    );
    if (w.NODE_ENV !== "production" && U.type.__hmrId && Wm(U), w.NODE_ENV !== "production" && (Lo(p), rn(U, "mount")), _o(p) && (U.ctx.renderer = Hn), w.NODE_ENV !== "production" && rn(U, "init"), fh(U, !1, K), w.NODE_ENV !== "production" && sn(U, "init"), U.asyncDep) {
      if (w.NODE_ENV !== "production" && Bt && (p.el = null), I && I.registerDep(U, X, K), !p.el) {
        const z = U.subTree = f(Ge);
        k(null, z, b, T);
      }
    } else
      X(
        U,
        p,
        b,
        T,
        I,
        F,
        K
      );
    w.NODE_ENV !== "production" && (Bo(), sn(U, "mount"));
  }, ee = (p, b, T) => {
    const R = b.component = p.component;
    if (nh(p, b, T))
      if (R.asyncDep && !R.asyncResolved) {
        w.NODE_ENV !== "production" && Lo(b), q(R, b, T), w.NODE_ENV !== "production" && Bo();
        return;
      } else
        R.next = b, R.update();
    else
      b.el = p.el, R.vnode = b;
  }, X = (p, b, T, R, I, F, K) => {
    const U = () => {
      if (p.isMounted) {
        let { next: G, bu: te, u: fe, parent: Se, vnode: Me } = p;
        {
          const St = $c(p);
          if (St) {
            G && (G.el = Me.el, q(p, G, K)), St.asyncDep.then(() => {
              p.isUnmounted || U();
            });
            return;
          }
        }
        let Ae = G, wt;
        w.NODE_ENV !== "production" && Lo(G || p.vnode), zn(p, !1), G ? (G.el = Me.el, q(p, G, K)) : G = Me, te && Li(te), (wt = G.props && G.props.onVnodeBeforeUpdate) && Kt(wt, Se, G, Me), zn(p, !0), w.NODE_ENV !== "production" && rn(p, "render");
        const rt = Yr(p);
        w.NODE_ENV !== "production" && sn(p, "render");
        const $t = p.subTree;
        p.subTree = rt, w.NODE_ENV !== "production" && rn(p, "patch"), g(
          $t,
          rt,
          // parent may have changed if it's in a teleport
          c($t.el),
          // anchor may have changed if it's in a fragment
          $e($t),
          p,
          I,
          F
        ), w.NODE_ENV !== "production" && sn(p, "patch"), G.el = rt.el, Ae === null && ih(p, rt.el), fe && gt(fe, I), (wt = G.props && G.props.onVnodeUpdated) && gt(
          () => Kt(wt, Se, G, Me),
          I
        ), w.NODE_ENV !== "production" && rc(p), w.NODE_ENV !== "production" && Bo();
      } else {
        let G;
        const { el: te, props: fe } = b, { bm: Se, m: Me, parent: Ae, root: wt, type: rt } = p, $t = Ji(b);
        if (zn(p, !1), Se && Li(Se), !$t && (G = fe && fe.onVnodeBeforeMount) && Kt(G, Ae, b), zn(p, !0), te && Vo) {
          const St = () => {
            w.NODE_ENV !== "production" && rn(p, "render"), p.subTree = Yr(p), w.NODE_ENV !== "production" && sn(p, "render"), w.NODE_ENV !== "production" && rn(p, "hydrate"), Vo(
              te,
              p.subTree,
              p,
              I,
              null
            ), w.NODE_ENV !== "production" && sn(p, "hydrate");
          };
          $t && rt.__asyncHydrate ? rt.__asyncHydrate(
            te,
            p,
            St
          ) : St();
        } else {
          wt.ce && wt.ce._injectChildStyle(rt), w.NODE_ENV !== "production" && rn(p, "render");
          const St = p.subTree = Yr(p);
          w.NODE_ENV !== "production" && sn(p, "render"), w.NODE_ENV !== "production" && rn(p, "patch"), g(
            null,
            St,
            T,
            R,
            p,
            I,
            F
          ), w.NODE_ENV !== "production" && sn(p, "patch"), b.el = St.el;
        }
        if (Me && gt(Me, I), !$t && (G = fe && fe.onVnodeMounted)) {
          const St = b;
          gt(
            () => Kt(G, Ae, St),
            I
          );
        }
        (b.shapeFlag & 256 || Ae && Ji(Ae.vnode) && Ae.vnode.shapeFlag & 256) && p.a && gt(p.a, I), p.isMounted = !0, w.NODE_ENV !== "production" && Xm(p), b = T = R = null;
      }
    };
    p.scope.on();
    const z = p.effect = new Du(U);
    p.scope.off();
    const H = p.update = z.run.bind(z), ue = p.job = z.runIfDirty.bind(z);
    ue.i = p, ue.id = p.uid, z.scheduler = () => Cr(ue), zn(p, !0), w.NODE_ENV !== "production" && (z.onTrack = p.rtc ? (G) => Li(p.rtc, G) : void 0, z.onTrigger = p.rtg ? (G) => Li(p.rtg, G) : void 0), H();
  }, q = (p, b, T) => {
    b.component = p;
    const R = p.vnode.props;
    p.vnode = b, p.next = null, Av(p, b.props, R, T), zv(p, b.children, T), gn(), Kl(p), pn();
  }, be = (p, b, T, R, I, F, K, U, z = !1) => {
    const H = p && p.children, ue = p ? p.shapeFlag : 0, G = b.children, { patchFlag: te, shapeFlag: fe } = b;
    if (te > 0) {
      if (te & 128) {
        me(
          H,
          G,
          T,
          R,
          I,
          F,
          K,
          U,
          z
        );
        return;
      } else if (te & 256) {
        _e(
          H,
          G,
          T,
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
    fe & 8 ? (ue & 16 && de(H, I, F), G !== H && u(T, G)) : ue & 16 ? fe & 16 ? me(
      H,
      G,
      T,
      R,
      I,
      F,
      K,
      U,
      z
    ) : de(H, I, F, !0) : (ue & 8 && u(T, ""), fe & 16 && V(
      G,
      T,
      R,
      I,
      F,
      K,
      U,
      z
    ));
  }, _e = (p, b, T, R, I, F, K, U, z) => {
    p = p || Ei, b = b || Ei;
    const H = p.length, ue = b.length, G = Math.min(H, ue);
    let te;
    for (te = 0; te < G; te++) {
      const fe = b[te] = z ? On(b[te]) : Lt(b[te]);
      g(
        p[te],
        fe,
        T,
        null,
        I,
        F,
        K,
        U,
        z
      );
    }
    H > ue ? de(
      p,
      I,
      F,
      !0,
      !1,
      G
    ) : V(
      b,
      T,
      R,
      I,
      F,
      K,
      U,
      z,
      G
    );
  }, me = (p, b, T, R, I, F, K, U, z) => {
    let H = 0;
    const ue = b.length;
    let G = p.length - 1, te = ue - 1;
    for (; H <= G && H <= te; ) {
      const fe = p[H], Se = b[H] = z ? On(b[H]) : Lt(b[H]);
      if (Yn(fe, Se))
        g(
          fe,
          Se,
          T,
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
    for (; H <= G && H <= te; ) {
      const fe = p[G], Se = b[te] = z ? On(b[te]) : Lt(b[te]);
      if (Yn(fe, Se))
        g(
          fe,
          Se,
          T,
          null,
          I,
          F,
          K,
          U,
          z
        );
      else
        break;
      G--, te--;
    }
    if (H > G) {
      if (H <= te) {
        const fe = te + 1, Se = fe < ue ? b[fe].el : R;
        for (; H <= te; )
          g(
            null,
            b[H] = z ? On(b[H]) : Lt(b[H]),
            T,
            Se,
            I,
            F,
            K,
            U,
            z
          ), H++;
      }
    } else if (H > te)
      for (; H <= G; )
        Oe(p[H], I, F, !0), H++;
    else {
      const fe = H, Se = H, Me = /* @__PURE__ */ new Map();
      for (H = Se; H <= te; H++) {
        const ct = b[H] = z ? On(b[H]) : Lt(b[H]);
        ct.key != null && (w.NODE_ENV !== "production" && Me.has(ct.key) && j(
          "Duplicate keys found during update:",
          JSON.stringify(ct.key),
          "Make sure keys are unique."
        ), Me.set(ct.key, H));
      }
      let Ae, wt = 0;
      const rt = te - Se + 1;
      let $t = !1, St = 0;
      const Fi = new Array(rt);
      for (H = 0; H < rt; H++) Fi[H] = 0;
      for (H = fe; H <= G; H++) {
        const ct = p[H];
        if (wt >= rt) {
          Oe(ct, I, F, !0);
          continue;
        }
        let Wt;
        if (ct.key != null)
          Wt = Me.get(ct.key);
        else
          for (Ae = Se; Ae <= te; Ae++)
            if (Fi[Ae - Se] === 0 && Yn(ct, b[Ae])) {
              Wt = Ae;
              break;
            }
        Wt === void 0 ? Oe(ct, I, F, !0) : (Fi[Wt - Se] = H + 1, Wt >= St ? St = Wt : $t = !0, g(
          ct,
          b[Wt],
          T,
          null,
          I,
          F,
          K,
          U,
          z
        ), wt++);
      }
      const Rl = $t ? Yv(Fi) : Ei;
      for (Ae = Rl.length - 1, H = rt - 1; H >= 0; H--) {
        const ct = Se + H, Wt = b[ct], Hl = ct + 1 < ue ? b[ct + 1].el : R;
        Fi[H] === 0 ? g(
          null,
          Wt,
          T,
          Hl,
          I,
          F,
          K,
          U,
          z
        ) : $t && (Ae < 0 || H !== Rl[Ae] ? ie(Wt, T, Hl, 2) : Ae--);
      }
    }
  }, ie = (p, b, T, R, I = null) => {
    const { el: F, type: K, transition: U, children: z, shapeFlag: H } = p;
    if (H & 6) {
      ie(p.component.subTree, b, T, R);
      return;
    }
    if (H & 128) {
      p.suspense.move(b, T, R);
      return;
    }
    if (H & 64) {
      K.move(p, b, T, Hn);
      return;
    }
    if (K === Ne) {
      i(F, b, T);
      for (let G = 0; G < z.length; G++)
        ie(z[G], b, T, R);
      i(p.anchor, b, T);
      return;
    }
    if (K === jo) {
      M(p, b, T);
      return;
    }
    if (R !== 2 && H & 1 && U)
      if (R === 0)
        U.beforeEnter(F), i(F, b, T), gt(() => U.enter(F), I);
      else {
        const { leave: G, delayLeave: te, afterLeave: fe } = U, Se = () => i(F, b, T), Me = () => {
          G(F, () => {
            Se(), fe && fe();
          });
        };
        te ? te(F, Se, Me) : Me();
      }
    else
      i(F, b, T);
  }, Oe = (p, b, T, R = !1, I = !1) => {
    const {
      type: F,
      props: K,
      ref: U,
      children: z,
      dynamicChildren: H,
      shapeFlag: ue,
      patchFlag: G,
      dirs: te,
      cacheIndex: fe
    } = p;
    if (G === -2 && (I = !1), U != null && hs(U, null, T, p, !0), fe != null && (b.renderCache[fe] = void 0), ue & 256) {
      b.ctx.deactivate(p);
      return;
    }
    const Se = ue & 1 && te, Me = !Ji(p);
    let Ae;
    if (Me && (Ae = K && K.onVnodeBeforeUnmount) && Kt(Ae, b, p), ue & 6)
      Y(p.component, T, R);
    else {
      if (ue & 128) {
        p.suspense.unmount(T, R);
        return;
      }
      Se && jn(p, null, b, "beforeUnmount"), ue & 64 ? p.type.remove(
        p,
        b,
        T,
        Hn,
        R
      ) : H && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !H.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (F !== Ne || G > 0 && G & 64) ? de(
        H,
        b,
        T,
        !1,
        !0
      ) : (F === Ne && G & 384 || !I && ue & 16) && de(z, b, T), R && Qe(p);
    }
    (Me && (Ae = K && K.onVnodeUnmounted) || Se) && gt(() => {
      Ae && Kt(Ae, b, p), Se && jn(p, null, b, "unmounted");
    }, T);
  }, Qe = (p) => {
    const { type: b, el: T, anchor: R, transition: I } = p;
    if (b === Ne) {
      w.NODE_ENV !== "production" && p.patchFlag > 0 && p.patchFlag & 2048 && I && !I.persisted ? p.children.forEach((K) => {
        K.type === Ge ? o(K.el) : Qe(K);
      }) : et(T, R);
      return;
    }
    if (b === jo) {
      x(p);
      return;
    }
    const F = () => {
      o(T), I && !I.persisted && I.afterLeave && I.afterLeave();
    };
    if (p.shapeFlag & 1 && I && !I.persisted) {
      const { leave: K, delayLeave: U } = I, z = () => K(T, F);
      U ? U(p.el, F, z) : z();
    } else
      F();
  }, et = (p, b) => {
    let T;
    for (; p !== b; )
      T = m(p), o(p), p = T;
    o(b);
  }, Y = (p, b, T) => {
    w.NODE_ENV !== "production" && p.type.__hmrId && Km(p);
    const { bum: R, scope: I, job: F, subTree: K, um: U, m: z, a: H } = p;
    ra(z), ra(H), R && Li(R), I.stop(), F && (F.flags |= 8, Oe(K, p, b, T)), U && gt(U, b), gt(() => {
      p.isUnmounted = !0;
    }, b), b && b.pendingBranch && !b.isUnmounted && p.asyncDep && !p.asyncResolved && p.suspenseId === b.pendingId && (b.deps--, b.deps === 0 && b.resolve()), w.NODE_ENV !== "production" && Qm(p);
  }, de = (p, b, T, R = !1, I = !1, F = 0) => {
    for (let K = F; K < p.length; K++)
      Oe(p[K], b, T, R, I);
  }, $e = (p) => {
    if (p.shapeFlag & 6)
      return $e(p.component.subTree);
    if (p.shapeFlag & 128)
      return p.suspense.next();
    const b = m(p.anchor || p.el), T = b && b[uc];
    return T ? m(T) : b;
  };
  let ut = !1;
  const Ye = (p, b, T) => {
    p == null ? b._vnode && Oe(b._vnode, null, null, !0) : g(
      b._vnode || null,
      p,
      b,
      null,
      null,
      null,
      T
    ), b._vnode = p, ut || (ut = !0, Kl(), tc(), ut = !1);
  }, Hn = {
    p: g,
    um: Oe,
    m: ie,
    r: Qe,
    mt: Z,
    mc: V,
    pc: be,
    pbc: A,
    n: $e,
    o: e
  };
  let xo, Vo;
  return {
    render: Ye,
    hydrate: xo,
    createApp: Tv(Ye, xo)
  };
}
function Gr({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function zn({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function Gv(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function Qi(e, t, n = !1) {
  const i = e.children, o = t.children;
  if (ne(i) && ne(o))
    for (let r = 0; r < i.length; r++) {
      const s = i[r];
      let l = o[r];
      l.shapeFlag & 1 && !l.dynamicChildren && ((l.patchFlag <= 0 || l.patchFlag === 32) && (l = o[r] = On(o[r]), l.el = s.el), !n && l.patchFlag !== -2 && Qi(s, l)), l.type === fi && (l.el = s.el), w.NODE_ENV !== "production" && l.type === Ge && !l.el && (l.el = s.el);
    }
}
function Yv(e) {
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
function $c(e) {
  const t = e.subTree.component;
  if (t)
    return t.asyncDep && !t.asyncResolved ? t : $c(t);
}
function ra(e) {
  if (e)
    for (let t = 0; t < e.length; t++)
      e[t].flags |= 8;
}
const qv = Symbol.for("v-scx"), Zv = () => {
  {
    const e = He(qv);
    return e || w.NODE_ENV !== "production" && j(
      "Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build."
    ), e;
  }
};
function bn(e, t) {
  return ll(e, null, t);
}
function he(e, t, n) {
  return w.NODE_ENV !== "production" && !se(t) && j(
    "`watch(fn, options?)` signature has been moved to a separate API. Use `watchEffect(fn, options?)` instead. `watch` now only supports `watch(source, cb, options?) signature."
  ), ll(e, t, n);
}
function ll(e, t, n = De) {
  const { immediate: i, deep: o, flush: r, once: s } = n;
  w.NODE_ENV !== "production" && !t && (i !== void 0 && j(
    'watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.'
  ), o !== void 0 && j(
    'watch() "deep" option is only respected when using the watch(source, callback, options?) signature.'
  ), s !== void 0 && j(
    'watch() "once" option is only respected when using the watch(source, callback, options?) signature.'
  ));
  const l = Be({}, n);
  w.NODE_ENV !== "production" && (l.onWarn = j);
  const a = t && i || !t && r !== "post";
  let d;
  if (ao) {
    if (r === "sync") {
      const v = Zv();
      d = v.__watcherHandles || (v.__watcherHandles = []);
    } else if (!a) {
      const v = () => {
      };
      return v.stop = Ze, v.resume = Ze, v.pause = Ze, v;
    }
  }
  const u = Xe;
  l.call = (v, h, g) => Ht(v, u, h, g);
  let c = !1;
  r === "post" ? l.scheduler = (v) => {
    gt(v, u && u.suspense);
  } : r !== "sync" && (c = !0, l.scheduler = (v, h) => {
    h ? v() : Cr(v);
  }), l.augmentJob = (v) => {
    t && (v.flags |= 4), c && (v.flags |= 2, u && (v.id = u.uid, v.i = u));
  };
  const m = Mm(e, t, l);
  return ao && (d ? d.push(m) : a && m()), m;
}
function Xv(e, t, n) {
  const i = this.proxy, o = Le(e) ? e.includes(".") ? Mc(i, e) : () => i[e] : e.bind(i, i);
  let r;
  se(t) ? r = t : (r = t.handler, n = t);
  const s = wo(this), l = ll(o, r.bind(i), n);
  return s(), l;
}
function Mc(e, t) {
  const n = t.split(".");
  return () => {
    let i = e;
    for (let o = 0; o < n.length && i; o++)
      i = i[n[o]];
    return i;
  };
}
const Jv = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${nt(t)}Modifiers`] || e[`${Pn(t)}Modifiers`];
function Qv(e, t, ...n) {
  if (e.isUnmounted) return;
  const i = e.vnode.props || De;
  if (w.NODE_ENV !== "production") {
    const {
      emitsOptions: u,
      propsOptions: [c]
    } = e;
    if (u)
      if (!(t in u))
        (!c || !(Kn(nt(t)) in c)) && j(
          `Component emitted event "${t}" but it is neither declared in the emits option nor as an "${Kn(nt(t))}" prop.`
        );
      else {
        const m = u[t];
        se(m) && (m(...n) || j(
          `Invalid event arguments: event validation failed for event "${t}".`
        ));
      }
  }
  let o = n;
  const r = t.startsWith("update:"), s = r && Jv(i, t.slice(7));
  if (s && (s.trim && (o = n.map((u) => Le(u) ? u.trim() : u)), s.number && (o = n.map(Yf))), w.NODE_ENV !== "production" && nv(e, t, o), w.NODE_ENV !== "production") {
    const u = t.toLowerCase();
    u !== t && i[Kn(u)] && j(
      `Event "${u}" is emitted in component ${Or(
        e,
        e.type
      )} but the handler is registered for "${t}". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "${Pn(
        t
      )}" instead of "${t}".`
    );
  }
  let l, a = i[l = Kn(t)] || // also try camelCase event handler (#2249)
  i[l = Kn(nt(t))];
  !a && r && (a = i[l = Kn(Pn(t))]), a && Ht(
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
    e.emitted[l] = !0, Ht(
      d,
      e,
      6,
      o
    );
  }
}
function Fc(e, t, n = !1) {
  const i = t.emitsCache, o = i.get(e);
  if (o !== void 0)
    return o;
  const r = e.emits;
  let s = {}, l = !1;
  if (!se(e)) {
    const a = (d) => {
      const u = Fc(d, t, !0);
      u && (l = !0, Be(s, u));
    };
    !n && t.mixins.length && t.mixins.forEach(a), e.extends && a(e.extends), e.mixins && e.mixins.forEach(a);
  }
  return !r && !l ? (Ve(e) && i.set(e, null), null) : (ne(r) ? r.forEach((a) => s[a] = null) : Be(s, r), Ve(e) && i.set(e, s), s);
}
function Nr(e, t) {
  return !e || !ho(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), Ce(e, t[0].toLowerCase() + t.slice(1)) || Ce(e, Pn(t)) || Ce(e, t));
}
let Ss = !1;
function ir() {
  Ss = !0;
}
function Yr(e) {
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
    ctx: h,
    inheritAttrs: g
  } = e, S = er(e);
  let k, O;
  w.NODE_ENV !== "production" && (Ss = !1);
  try {
    if (n.shapeFlag & 4) {
      const x = o || i, N = w.NODE_ENV !== "production" && v.__isScriptSetup ? new Proxy(x, {
        get($, C, V) {
          return j(
            `Property '${String(
              C
            )}' was accessed via 'this'. Avoid using 'this' in templates.`
          ), Reflect.get($, C, V);
        }
      }) : x;
      k = Lt(
        d.call(
          N,
          x,
          u,
          w.NODE_ENV !== "production" ? Xt(c) : c,
          v,
          m,
          h
        )
      ), O = l;
    } else {
      const x = t;
      w.NODE_ENV !== "production" && l === c && ir(), k = Lt(
        x.length > 1 ? x(
          w.NODE_ENV !== "production" ? Xt(c) : c,
          w.NODE_ENV !== "production" ? {
            get attrs() {
              return ir(), Xt(l);
            },
            slots: s,
            emit: a
          } : { attrs: l, slots: s, emit: a }
        ) : x(
          w.NODE_ENV !== "production" ? Xt(c) : c,
          null
        )
      ), O = t.props ? l : eh(l);
    }
  } catch (x) {
    eo.length = 0, yo(x, e, 1), k = f(Ge);
  }
  let P = k, M;
  if (w.NODE_ENV !== "production" && k.patchFlag > 0 && k.patchFlag & 2048 && ([P, M] = Lc(k)), O && g !== !1) {
    const x = Object.keys(O), { shapeFlag: N } = P;
    if (x.length) {
      if (N & 7)
        r && x.some(Yo) && (O = th(
          O,
          r
        )), P = jt(P, O, !1, !0);
      else if (w.NODE_ENV !== "production" && !Ss && P.type !== Ge) {
        const $ = Object.keys(l), C = [], V = [];
        for (let L = 0, A = $.length; L < A; L++) {
          const E = $[L];
          ho(E) ? Yo(E) || C.push(E[2].toLowerCase() + E.slice(3)) : V.push(E);
        }
        V.length && j(
          `Extraneous non-props attributes (${V.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes.`
        ), C.length && j(
          `Extraneous non-emits event listeners (${C.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.`
        );
      }
    }
  }
  return n.dirs && (w.NODE_ENV !== "production" && !sa(P) && j(
    "Runtime directive used on component with non-element root node. The directives will not function as intended."
  ), P = jt(P, null, !1, !0), P.dirs = P.dirs ? P.dirs.concat(n.dirs) : n.dirs), n.transition && (w.NODE_ENV !== "production" && !sa(P) && j(
    "Component inside <Transition> renders non-element root node that cannot be animated."
  ), ui(P, n.transition)), w.NODE_ENV !== "production" && M ? M(P) : k = P, er(S), k;
}
const Lc = (e) => {
  const t = e.children, n = e.dynamicChildren, i = al(t, !1);
  if (i) {
    if (w.NODE_ENV !== "production" && i.patchFlag > 0 && i.patchFlag & 2048)
      return Lc(i);
  } else return [e, void 0];
  const o = t.indexOf(i), r = n ? n.indexOf(i) : -1, s = (l) => {
    t[o] = l, n && (r > -1 ? n[r] = l : l.patchFlag > 0 && (e.dynamicChildren = [...n, l]));
  };
  return [Lt(i), s];
};
function al(e, t = !0) {
  let n;
  for (let i = 0; i < e.length; i++) {
    const o = e[i];
    if (Oi(o)) {
      if (o.type !== Ge || o.children === "v-if") {
        if (n)
          return;
        if (n = o, w.NODE_ENV !== "production" && t && n.patchFlag > 0 && n.patchFlag & 2048)
          return al(n.children);
      }
    } else
      return;
  }
  return n;
}
const eh = (e) => {
  let t;
  for (const n in e)
    (n === "class" || n === "style" || ho(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, th = (e, t) => {
  const n = {};
  for (const i in e)
    (!Yo(i) || !(i.slice(9) in t)) && (n[i] = e[i]);
  return n;
}, sa = (e) => e.shapeFlag & 7 || e.type === Ge;
function nh(e, t, n) {
  const { props: i, children: o, component: r } = e, { props: s, children: l, patchFlag: a } = t, d = r.emitsOptions;
  if (w.NODE_ENV !== "production" && (o || l) && Bt || t.dirs || t.transition)
    return !0;
  if (n && a >= 0) {
    if (a & 1024)
      return !0;
    if (a & 16)
      return i ? la(i, s, d) : !!s;
    if (a & 8) {
      const u = t.dynamicProps;
      for (let c = 0; c < u.length; c++) {
        const m = u[c];
        if (s[m] !== i[m] && !Nr(d, m))
          return !0;
      }
    }
  } else
    return (o || l) && (!l || !l.$stable) ? !0 : i === s ? !1 : i ? s ? la(i, s, d) : !0 : !!s;
  return !1;
}
function la(e, t, n) {
  const i = Object.keys(t);
  if (i.length !== Object.keys(e).length)
    return !0;
  for (let o = 0; o < i.length; o++) {
    const r = i[o];
    if (t[r] !== e[r] && !Nr(n, r))
      return !0;
  }
  return !1;
}
function ih({ vnode: e, parent: t }, n) {
  for (; t; ) {
    const i = t.subTree;
    if (i.suspense && i.suspense.activeBranch === e && (i.el = e.el), i === e)
      (e = t.vnode).el = n, t = t.parent;
    else
      break;
  }
}
const Bc = (e) => e.__isSuspense;
function oh(e, t) {
  t && t.pendingBranch ? ne(e) ? t.effects.push(...e) : t.effects.push(e) : ec(e);
}
const Ne = Symbol.for("v-fgt"), fi = Symbol.for("v-txt"), Ge = Symbol.for("v-cmt"), jo = Symbol.for("v-stc"), eo = [];
let Ct = null;
function ve(e = !1) {
  eo.push(Ct = e ? null : []);
}
function rh() {
  eo.pop(), Ct = eo[eo.length - 1] || null;
}
let lo = 1;
function aa(e) {
  lo += e, e < 0 && Ct && (Ct.hasOnce = !0);
}
function Rc(e) {
  return e.dynamicChildren = lo > 0 ? Ct || Ei : null, rh(), lo > 0 && Ct && Ct.push(e), e;
}
function qn(e, t, n, i, o, r) {
  return Rc(
    we(
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
function Ee(e, t, n, i, o) {
  return Rc(
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
function Oi(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function Yn(e, t) {
  if (w.NODE_ENV !== "production" && t.shapeFlag & 6 && e.component) {
    const n = Ro.get(t.type);
    if (n && n.has(e.component))
      return e.shapeFlag &= -257, t.shapeFlag &= -513, !1;
  }
  return e.type === t.type && e.key === t.key;
}
const sh = (...e) => jc(
  ...e
), Hc = ({ key: e }) => e ?? null, zo = ({
  ref: e,
  ref_key: t,
  ref_for: n
}) => (typeof e == "number" && (e = "" + e), e != null ? Le(e) || Ie(e) || se(e) ? { i: lt, r: e, k: t, f: !!n } : e : null);
function we(e, t = null, n = null, i = 0, o = null, r = e === Ne ? 0 : 1, s = !1, l = !1) {
  const a = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && Hc(t),
    ref: t && zo(t),
    scopeId: lc,
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
    ctx: lt
  };
  return l ? (ul(a, n), r & 128 && e.normalize(a)) : n && (a.shapeFlag |= Le(n) ? 8 : 16), w.NODE_ENV !== "production" && a.key !== a.key && j("VNode created with invalid key (NaN). VNode type:", a.type), lo > 0 && // avoid a block node from tracking itself
  !s && // has current parent block
  Ct && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (a.patchFlag > 0 || r & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  a.patchFlag !== 32 && Ct.push(a), a;
}
const f = w.NODE_ENV !== "production" ? sh : jc;
function jc(e, t = null, n = null, i = 0, o = null, r = !1) {
  if ((!e || e === yv) && (w.NODE_ENV !== "production" && !e && j(`Invalid vnode type when creating vnode: ${e}.`), e = Ge), Oi(e)) {
    const l = jt(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return n && ul(l, n), lo > 0 && !r && Ct && (l.shapeFlag & 6 ? Ct[Ct.indexOf(e)] = l : Ct.push(l)), l.patchFlag = -2, l;
  }
  if (Kc(e) && (e = e.__vccOpts), t) {
    t = lh(t);
    let { class: l, style: a } = t;
    l && !Le(l) && (t.class = li(l)), Ve(a) && (oo(a) && !ne(a) && (a = Be({}, a)), t.style = to(a));
  }
  const s = Le(e) ? 1 : Bc(e) ? 128 : cc(e) ? 64 : Ve(e) ? 4 : se(e) ? 2 : 0;
  return w.NODE_ENV !== "production" && s & 4 && oo(e) && (e = Q(e), j(
    "Vue received a Component that was made a reactive object. This can lead to unnecessary performance overhead and should be avoided by marking the component with `markRaw` or using `shallowRef` instead of `ref`.",
    `
Component that was made reactive: `,
    e
  )), we(
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
function lh(e) {
  return e ? oo(e) || Vc(e) ? Be({}, e) : e : null;
}
function jt(e, t, n = !1, i = !1) {
  const { props: o, ref: r, patchFlag: s, children: l, transition: a } = e, d = t ? ke(o || {}, t) : o, u = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: d,
    key: d && Hc(d),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      n && r ? ne(r) ? r.concat(zo(t)) : [r, zo(t)] : zo(t)
    ) : r,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: w.NODE_ENV !== "production" && s === -1 && ne(l) ? l.map(zc) : l,
    target: e.target,
    targetStart: e.targetStart,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: t && e.type !== Ne ? s === -1 ? 16 : s | 16 : s,
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
    ssContent: e.ssContent && jt(e.ssContent),
    ssFallback: e.ssFallback && jt(e.ssFallback),
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return a && i && ui(
    u,
    a.clone(u)
  ), u;
}
function zc(e) {
  const t = jt(e);
  return ne(e.children) && (t.children = e.children.map(zc)), t;
}
function J(e = " ", t = 0) {
  return f(fi, null, e, t);
}
function cn(e = "", t = !1) {
  return t ? (ve(), Ee(Ge, null, e)) : f(Ge, null, e);
}
function Lt(e) {
  return e == null || typeof e == "boolean" ? f(Ge) : ne(e) ? f(
    Ne,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : Oi(e) ? On(e) : f(fi, null, String(e));
}
function On(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : jt(e);
}
function ul(e, t) {
  let n = 0;
  const { shapeFlag: i } = e;
  if (t == null)
    t = null;
  else if (ne(t))
    n = 16;
  else if (typeof t == "object")
    if (i & 65) {
      const o = t.default;
      o && (o._c && (o._d = !1), ul(e, o()), o._c && (o._d = !0));
      return;
    } else {
      n = 32;
      const o = t._;
      !o && !Vc(t) ? t._ctx = lt : o === 3 && lt && (lt.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else se(t) ? (t = { default: t, _ctx: lt }, n = 32) : (t = String(t), i & 64 ? (n = 16, t = [J(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function ke(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const i = e[n];
    for (const o in i)
      if (o === "class")
        t.class !== i.class && (t.class = li([t.class, i.class]));
      else if (o === "style")
        t.style = to([t.style, i.style]);
      else if (ho(o)) {
        const r = t[o], s = i[o];
        s && r !== s && !(ne(r) && r.includes(s)) && (t[o] = r ? [].concat(r, s) : s);
      } else o !== "" && (t[o] = i[o]);
  }
  return t;
}
function Kt(e, t, n, i = null) {
  Ht(e, t, 7, [
    n,
    i
  ]);
}
const ah = kc();
let uh = 0;
function ch(e, t, n) {
  const i = e.type, o = (t ? t.appContext : e.appContext) || ah, r = {
    uid: uh++,
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
    scope: new Tu(
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
    propsOptions: Tc(i, o),
    emitsOptions: Fc(i, o),
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
  return w.NODE_ENV !== "production" ? r.ctx = _v(r) : r.ctx = { _: r }, r.root = t ? t.root : r, r.emit = Qv.bind(null, r), e.ce && e.ce(r), r;
}
let Xe = null;
const xr = () => Xe || lt;
let or, Es;
{
  const e = go(), t = (n, i) => {
    let o;
    return (o = e[n]) || (o = e[n] = []), o.push(i), (r) => {
      o.length > 1 ? o.forEach((s) => s(r)) : o[0](r);
    };
  };
  or = t(
    "__VUE_INSTANCE_SETTERS__",
    (n) => Xe = n
  ), Es = t(
    "__VUE_SSR_SETTERS__",
    (n) => ao = n
  );
}
const wo = (e) => {
  const t = Xe;
  return or(e), e.scope.on(), () => {
    e.scope.off(), or(t);
  };
}, ua = () => {
  Xe && Xe.scope.off(), or(null);
}, dh = /* @__PURE__ */ hn("slot,component");
function Cs(e, { isNativeTag: t }) {
  (dh(e) || t(e)) && j(
    "Do not use built-in or reserved HTML elements as component id: " + e
  );
}
function Uc(e) {
  return e.vnode.shapeFlag & 4;
}
let ao = !1;
function fh(e, t = !1, n = !1) {
  t && Es(t);
  const { props: i, children: o } = e.vnode, r = Uc(e);
  Dv(e, i, r, t), jv(e, o, n);
  const s = r ? mh(e, t) : void 0;
  return t && Es(!1), s;
}
function mh(e, t) {
  var n;
  const i = e.type;
  if (w.NODE_ENV !== "production") {
    if (i.name && Cs(i.name, e.appContext.config), i.components) {
      const r = Object.keys(i.components);
      for (let s = 0; s < r.length; s++)
        Cs(r[s], e.appContext.config);
    }
    if (i.directives) {
      const r = Object.keys(i.directives);
      for (let s = 0; s < r.length; s++)
        ac(r[s]);
    }
    i.compilerOptions && vh() && j(
      '"compilerOptions" is only supported when using a build of Vue that includes the runtime compiler. Since you are using a runtime-only build, the options should be passed via your build tool config instead.'
    );
  }
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Ec), w.NODE_ENV !== "production" && wv(e);
  const { setup: o } = i;
  if (o) {
    gn();
    const r = e.setupContext = o.length > 1 ? gh(e) : null, s = wo(e), l = Ai(
      o,
      e,
      0,
      [
        w.NODE_ENV !== "production" ? Xt(e.props) : e.props,
        r
      ]
    ), a = zs(l);
    if (pn(), s(), (a || e.sp) && !Ji(e) && pc(e), a) {
      if (l.then(ua, ua), t)
        return l.then((d) => {
          ca(e, d, t);
        }).catch((d) => {
          yo(d, e, 0);
        });
      if (e.asyncDep = l, w.NODE_ENV !== "production" && !e.suspense) {
        const d = (n = i.name) != null ? n : "Anonymous";
        j(
          `Component <${d}>: setup function returned a promise, but no <Suspense> boundary was found in the parent component tree. A component with async setup() must be nested in a <Suspense> in order to be rendered.`
        );
      }
    } else
      ca(e, l, t);
  } else
    Wc(e, t);
}
function ca(e, t, n) {
  se(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : Ve(t) ? (w.NODE_ENV !== "production" && Oi(t) && j(
    "setup() should not return VNodes directly - return a render function instead."
  ), w.NODE_ENV !== "production" && (e.devtoolsRawSetupState = t), e.setupState = qu(t), w.NODE_ENV !== "production" && Sv(e)) : w.NODE_ENV !== "production" && t !== void 0 && j(
    `setup() should return an object. Received: ${t === null ? "null" : typeof t}`
  ), Wc(e, n);
}
let ks;
const vh = () => !ks;
function Wc(e, t, n) {
  const i = e.type;
  if (!e.render) {
    if (!t && ks && !i.render) {
      const o = i.template || rl(e).template;
      if (o) {
        w.NODE_ENV !== "production" && rn(e, "compile");
        const { isCustomElement: r, compilerOptions: s } = e.appContext.config, { delimiters: l, compilerOptions: a } = i, d = Be(
          Be(
            {
              isCustomElement: r,
              delimiters: l
            },
            s
          ),
          a
        );
        i.render = ks(o, d), w.NODE_ENV !== "production" && sn(e, "compile");
      }
    }
    e.render = i.render || Ze;
  }
  {
    const o = wo(e);
    gn();
    try {
      Cv(e);
    } finally {
      pn(), o();
    }
  }
  w.NODE_ENV !== "production" && !i.render && e.render === Ze && !t && (i.template ? j(
    'Component provided template option but runtime compilation is not supported in this build of Vue. Configure your bundler to alias "vue" to "vue/dist/vue.esm-bundler.js".'
  ) : j("Component is missing template or render function: ", i));
}
const da = w.NODE_ENV !== "production" ? {
  get(e, t) {
    return ir(), qe(e, "get", ""), e[t];
  },
  set() {
    return j("setupContext.attrs is readonly."), !1;
  },
  deleteProperty() {
    return j("setupContext.attrs is readonly."), !1;
  }
} : {
  get(e, t) {
    return qe(e, "get", ""), e[t];
  }
};
function hh(e) {
  return new Proxy(e.slots, {
    get(t, n) {
      return qe(e, "get", "$slots"), t[n];
    }
  });
}
function gh(e) {
  const t = (n) => {
    if (w.NODE_ENV !== "production" && (e.exposed && j("expose() should be called only once per setup()."), n != null)) {
      let i = typeof n;
      i === "object" && (ne(n) ? i = "array" : Ie(n) && (i = "ref")), i !== "object" && j(
        `expose() should be passed a plain object, received ${i}.`
      );
    }
    e.exposed = n || {};
  };
  if (w.NODE_ENV !== "production") {
    let n, i;
    return Object.freeze({
      get attrs() {
        return n || (n = new Proxy(e.attrs, da));
      },
      get slots() {
        return i || (i = hh(e));
      },
      get emit() {
        return (o, ...r) => e.emit(o, ...r);
      },
      expose: t
    });
  } else
    return {
      attrs: new Proxy(e.attrs, da),
      slots: e.slots,
      emit: e.emit,
      expose: t
    };
}
function Vr(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(qu(Gu(e.exposed)), {
    get(t, n) {
      if (n in t)
        return t[n];
      if (n in ni)
        return ni[n](e);
    },
    has(t, n) {
      return n in t || n in ni;
    }
  })) : e.proxy;
}
const ph = /(?:^|[-_])(\w)/g, yh = (e) => e.replace(ph, (t) => t.toUpperCase()).replace(/[-_]/g, "");
function cl(e, t = !0) {
  return se(e) ? e.displayName || e.name : e.name || t && e.__name;
}
function Or(e, t, n = !1) {
  let i = cl(t);
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
  return i ? yh(i) : n ? "App" : "Anonymous";
}
function Kc(e) {
  return se(e) && "__vccOpts" in e;
}
const y = (e, t) => {
  const n = Im(e, t, ao);
  if (w.NODE_ENV !== "production") {
    const i = xr();
    i && i.appContext.config.warnRecursiveComputed && (n._warnRecursive = !0);
  }
  return n;
};
function Mn(e, t, n) {
  const i = arguments.length;
  return i === 2 ? Ve(t) && !ne(t) ? Oi(t) ? f(e, null, [t]) : f(e, t) : f(e, null, t) : (i > 3 ? n = Array.prototype.slice.call(arguments, 2) : i === 3 && Oi(n) && (n = [n]), f(e, t, n));
}
function bh() {
  if (w.NODE_ENV === "production" || typeof window > "u")
    return;
  const e = { style: "color:#3ba776" }, t = { style: "color:#1677ff" }, n = { style: "color:#f5222d" }, i = { style: "color:#eb2f96" }, o = {
    __vue_custom_formatter: !0,
    header(c) {
      return Ve(c) ? c.__isVue ? ["div", e, "VueInstance"] : Ie(c) ? [
        "div",
        {},
        ["span", e, u(c)],
        "<",
        // avoid debugger accessing value affecting behavior
        l("_value" in c ? c._value : c),
        ">"
      ] : Qn(c) ? [
        "div",
        {},
        ["span", e, vt(c) ? "ShallowReactive" : "Reactive"],
        "<",
        l(c),
        `>${vn(c) ? " (readonly)" : ""}`
      ] : vn(c) ? [
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
    c.type.props && c.props && m.push(s("props", Q(c.props))), c.setupState !== De && m.push(s("setup", c.setupState)), c.data !== De && m.push(s("data", Q(c.data)));
    const v = a(c, "computed");
    v && m.push(s("computed", v));
    const h = a(c, "inject");
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
      ["object", { object: c }]
    ]), m;
  }
  function s(c, m) {
    return m = Be({}, m), Object.keys(m).length ? [
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
    return typeof c == "number" ? ["span", t, c] : typeof c == "string" ? ["span", n, JSON.stringify(c)] : typeof c == "boolean" ? ["span", i, c] : Ve(c) ? ["object", { object: m ? Q(c) : c }] : ["span", n, String(c)];
  }
  function a(c, m) {
    const v = c.type;
    if (se(v))
      return;
    const h = {};
    for (const g in c.ctx)
      d(v, g, m) && (h[g] = c.ctx[g]);
    return h;
  }
  function d(c, m, v) {
    const h = c[v];
    if (ne(h) && h.includes(m) || Ve(h) && m in h || c.extends && d(c.extends, m, v) || c.mixins && c.mixins.some((g) => d(g, m, v)))
      return !0;
  }
  function u(c) {
    return vt(c) ? "ShallowRef" : c.effect ? "ComputedRef" : "Ref";
  }
  window.devtoolsFormatters ? window.devtoolsFormatters.push(o) : window.devtoolsFormatters = [o];
}
const fa = "3.5.12", pt = w.NODE_ENV !== "production" ? j : Ze;
var It = {};
let Ns;
const ma = typeof window < "u" && window.trustedTypes;
if (ma)
  try {
    Ns = /* @__PURE__ */ ma.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch (e) {
    It.NODE_ENV !== "production" && pt(`Error creating trusted types policy: ${e}`);
  }
const Gc = Ns ? (e) => Ns.createHTML(e) : (e) => e, _h = "http://www.w3.org/2000/svg", wh = "http://www.w3.org/1998/Math/MathML", an = typeof document < "u" ? document : null, va = an && /* @__PURE__ */ an.createElement("template"), Sh = {
  insert: (e, t, n) => {
    t.insertBefore(e, n || null);
  },
  remove: (e) => {
    const t = e.parentNode;
    t && t.removeChild(e);
  },
  createElement: (e, t, n, i) => {
    const o = t === "svg" ? an.createElementNS(_h, e) : t === "mathml" ? an.createElementNS(wh, e) : n ? an.createElement(e, { is: n }) : an.createElement(e);
    return e === "select" && i && i.multiple != null && o.setAttribute("multiple", i.multiple), o;
  },
  createText: (e) => an.createTextNode(e),
  createComment: (e) => an.createComment(e),
  setText: (e, t) => {
    e.nodeValue = t;
  },
  setElementText: (e, t) => {
    e.textContent = t;
  },
  parentNode: (e) => e.parentNode,
  nextSibling: (e) => e.nextSibling,
  querySelector: (e) => an.querySelector(e),
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
      va.innerHTML = Gc(
        i === "svg" ? `<svg>${e}</svg>` : i === "mathml" ? `<math>${e}</math>` : e
      );
      const l = va.content;
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
}, kn = "transition", Hi = "animation", Ti = Symbol("_vtc"), Yc = {
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
}, qc = /* @__PURE__ */ Be(
  {},
  mc,
  Yc
), Eh = (e) => (e.displayName = "Transition", e.props = qc, e), ci = /* @__PURE__ */ Eh(
  (e, { slots: t }) => Mn(av, Zc(e), t)
), Un = (e, t = []) => {
  ne(e) ? e.forEach((n) => n(...t)) : e && e(...t);
}, ha = (e) => e ? ne(e) ? e.some((t) => t.length > 1) : e.length > 1 : !1;
function Zc(e) {
  const t = {};
  for (const E in e)
    E in Yc || (t[E] = e[E]);
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
  } = e, h = Ch(o), g = h && h[0], S = h && h[1], {
    onBeforeEnter: k,
    onEnter: O,
    onEnterCancelled: P,
    onLeave: M,
    onLeaveCancelled: x,
    onBeforeAppear: N = k,
    onAppear: $ = O,
    onAppearCancelled: C = P
  } = t, V = (E, D, B) => {
    Nn(E, D ? u : l), Nn(E, D ? d : s), B && B();
  }, L = (E, D) => {
    E._isLeaving = !1, Nn(E, c), Nn(E, v), Nn(E, m), D && D();
  }, A = (E) => (D, B) => {
    const Z = E ? $ : O, ee = () => V(D, E, B);
    Un(Z, [D, ee]), ga(() => {
      Nn(D, E ? a : r), ln(D, E ? u : l), ha(Z) || pa(D, i, g, ee);
    });
  };
  return Be(t, {
    onBeforeEnter(E) {
      Un(k, [E]), ln(E, r), ln(E, s);
    },
    onBeforeAppear(E) {
      Un(N, [E]), ln(E, a), ln(E, d);
    },
    onEnter: A(!1),
    onAppear: A(!0),
    onLeave(E, D) {
      E._isLeaving = !0;
      const B = () => L(E, D);
      ln(E, c), ln(E, m), Jc(), ga(() => {
        E._isLeaving && (Nn(E, c), ln(E, v), ha(M) || pa(E, i, S, B));
      }), Un(M, [E, B]);
    },
    onEnterCancelled(E) {
      V(E, !1), Un(P, [E]);
    },
    onAppearCancelled(E) {
      V(E, !0), Un(C, [E]);
    },
    onLeaveCancelled(E) {
      L(E), Un(x, [E]);
    }
  });
}
function Ch(e) {
  if (e == null)
    return null;
  if (Ve(e))
    return [qr(e.enter), qr(e.leave)];
  {
    const t = qr(e);
    return [t, t];
  }
}
function qr(e) {
  const t = qf(e);
  return It.NODE_ENV !== "production" && Hm(t, "<transition> explicit duration"), t;
}
function ln(e, t) {
  t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Ti] || (e[Ti] = /* @__PURE__ */ new Set())).add(t);
}
function Nn(e, t) {
  t.split(/\s+/).forEach((i) => i && e.classList.remove(i));
  const n = e[Ti];
  n && (n.delete(t), n.size || (e[Ti] = void 0));
}
function ga(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let kh = 0;
function pa(e, t, n, i) {
  const o = e._endId = ++kh, r = () => {
    o === e._endId && i();
  };
  if (n != null)
    return setTimeout(r, n);
  const { type: s, timeout: l, propCount: a } = Xc(e, t);
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
function Xc(e, t) {
  const n = window.getComputedStyle(e), i = (h) => (n[h] || "").split(", "), o = i(`${kn}Delay`), r = i(`${kn}Duration`), s = ya(o, r), l = i(`${Hi}Delay`), a = i(`${Hi}Duration`), d = ya(l, a);
  let u = null, c = 0, m = 0;
  t === kn ? s > 0 && (u = kn, c = s, m = r.length) : t === Hi ? d > 0 && (u = Hi, c = d, m = a.length) : (c = Math.max(s, d), u = c > 0 ? s > d ? kn : Hi : null, m = u ? u === kn ? r.length : a.length : 0);
  const v = u === kn && /\b(transform|all)(,|$)/.test(
    i(`${kn}Property`).toString()
  );
  return {
    type: u,
    timeout: c,
    propCount: m,
    hasTransform: v
  };
}
function ya(e, t) {
  for (; e.length < t.length; )
    e = e.concat(e);
  return Math.max(...t.map((n, i) => ba(n) + ba(e[i])));
}
function ba(e) {
  return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
}
function Jc() {
  return document.body.offsetHeight;
}
function Nh(e, t, n) {
  const i = e[Ti];
  i && (t = (t ? [t, ...i] : [...i]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
const rr = Symbol("_vod"), Qc = Symbol("_vsh"), Fn = {
  beforeMount(e, { value: t }, { transition: n }) {
    e[rr] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : ji(e, t);
  },
  mounted(e, { value: t }, { transition: n }) {
    n && t && n.enter(e);
  },
  updated(e, { value: t, oldValue: n }, { transition: i }) {
    !t != !n && (i ? t ? (i.beforeEnter(e), ji(e, !0), i.enter(e)) : i.leave(e, () => {
      ji(e, !1);
    }) : ji(e, t));
  },
  beforeUnmount(e, { value: t }) {
    ji(e, t);
  }
};
It.NODE_ENV !== "production" && (Fn.name = "show");
function ji(e, t) {
  e.style.display = t ? e[rr] : "none", e[Qc] = !t;
}
const xh = Symbol(It.NODE_ENV !== "production" ? "CSS_VAR_TEXT" : ""), Vh = /(^|;)\s*display\s*:/;
function Oh(e, t, n) {
  const i = e.style, o = Le(n);
  let r = !1;
  if (n && !o) {
    if (t)
      if (Le(t))
        for (const s of t.split(";")) {
          const l = s.slice(0, s.indexOf(":")).trim();
          n[l] == null && Uo(i, l, "");
        }
      else
        for (const s in t)
          n[s] == null && Uo(i, s, "");
    for (const s in n)
      s === "display" && (r = !0), Uo(i, s, n[s]);
  } else if (o) {
    if (t !== n) {
      const s = i[xh];
      s && (n += ";" + s), i.cssText = n, r = Vh.test(n);
    }
  } else t && e.removeAttribute("style");
  rr in e && (e[rr] = r ? i.display : "", e[Qc] && (i.display = "none"));
}
const Th = /[^\\];\s*$/, _a = /\s*!important$/;
function Uo(e, t, n) {
  if (ne(n))
    n.forEach((i) => Uo(e, t, i));
  else if (n == null && (n = ""), It.NODE_ENV !== "production" && Th.test(n) && pt(
    `Unexpected semicolon at the end of '${t}' style value: '${n}'`
  ), t.startsWith("--"))
    e.setProperty(t, n);
  else {
    const i = Dh(e, t);
    _a.test(n) ? e.setProperty(
      Pn(i),
      n.replace(_a, ""),
      "important"
    ) : e[i] = n;
  }
}
const wa = ["Webkit", "Moz", "ms"], Zr = {};
function Dh(e, t) {
  const n = Zr[t];
  if (n)
    return n;
  let i = nt(t);
  if (i !== "filter" && i in e)
    return Zr[t] = i;
  i = Dt(i);
  for (let o = 0; o < wa.length; o++) {
    const r = wa[o] + i;
    if (r in e)
      return Zr[t] = r;
  }
  return t;
}
const Sa = "http://www.w3.org/1999/xlink";
function Ea(e, t, n, i, o, r = lm(t)) {
  i && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(Sa, t.slice(6, t.length)) : e.setAttributeNS(Sa, t, n) : n == null || r && !xu(n) ? e.removeAttribute(t) : e.setAttribute(
    t,
    r ? "" : In(n) ? String(n) : n
  );
}
function Ca(e, t, n, i, o) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? Gc(n) : n);
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
    l === "boolean" ? n = xu(n) : n == null && l === "string" ? (n = "", s = !0) : l === "number" && (n = 0, s = !0);
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
function Ph(e, t, n, i) {
  e.addEventListener(t, n, i);
}
function Ah(e, t, n, i) {
  e.removeEventListener(t, n, i);
}
const ka = Symbol("_vei");
function Ih(e, t, n, i, o = null) {
  const r = e[ka] || (e[ka] = {}), s = r[t];
  if (i && s)
    s.value = It.NODE_ENV !== "production" ? xa(i, t) : i;
  else {
    const [l, a] = $h(t);
    if (i) {
      const d = r[t] = Lh(
        It.NODE_ENV !== "production" ? xa(i, t) : i,
        o
      );
      Ph(e, l, d, a);
    } else s && (Ah(e, l, s, a), r[t] = void 0);
  }
}
const Na = /(?:Once|Passive|Capture)$/;
function $h(e) {
  let t;
  if (Na.test(e)) {
    t = {};
    let i;
    for (; i = e.match(Na); )
      e = e.slice(0, e.length - i[0].length), t[i[0].toLowerCase()] = !0;
  }
  return [e[2] === ":" ? e.slice(3) : Pn(e.slice(2)), t];
}
let Xr = 0;
const Mh = /* @__PURE__ */ Promise.resolve(), Fh = () => Xr || (Mh.then(() => Xr = 0), Xr = Date.now());
function Lh(e, t) {
  const n = (i) => {
    if (!i._vts)
      i._vts = Date.now();
    else if (i._vts <= n.attached)
      return;
    Ht(
      Bh(i, n.value),
      t,
      5,
      [i]
    );
  };
  return n.value = e, n.attached = Fh(), n;
}
function xa(e, t) {
  return se(e) || ne(e) ? e : (pt(
    `Wrong type passed as event handler to ${t} - did you forget @ or : in front of your prop?
Expected function or array of functions, received type ${typeof e}.`
  ), Ze);
}
function Bh(e, t) {
  if (ne(t)) {
    const n = e.stopImmediatePropagation;
    return e.stopImmediatePropagation = () => {
      n.call(e), e._stopped = !0;
    }, t.map(
      (i) => (o) => !o._stopped && i && i(o)
    );
  } else
    return t;
}
const Va = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // lowercase letter
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Rh = (e, t, n, i, o, r) => {
  const s = o === "svg";
  t === "class" ? Nh(e, i, s) : t === "style" ? Oh(e, n, i) : ho(t) ? Yo(t) || Ih(e, t, n, i, r) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : Hh(e, t, i, s)) ? (Ca(e, t, i), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && Ea(e, t, i, s, r, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && (/[A-Z]/.test(t) || !Le(i)) ? Ca(e, nt(t), i, r, t) : (t === "true-value" ? e._trueValue = i : t === "false-value" && (e._falseValue = i), Ea(e, t, i, s));
};
function Hh(e, t, n, i) {
  if (i)
    return !!(t === "innerHTML" || t === "textContent" || t in e && Va(t) && se(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA")
    return !1;
  if (t === "width" || t === "height") {
    const o = e.tagName;
    if (o === "IMG" || o === "VIDEO" || o === "CANVAS" || o === "SOURCE")
      return !1;
  }
  return Va(t) && Le(n) ? !1 : t in e;
}
const ed = /* @__PURE__ */ new WeakMap(), td = /* @__PURE__ */ new WeakMap(), sr = Symbol("_moveCb"), Oa = Symbol("_enterCb"), jh = (e) => (delete e.props.mode, e), zh = /* @__PURE__ */ jh({
  name: "TransitionGroup",
  props: /* @__PURE__ */ Be({}, qc, {
    tag: String,
    moveClass: String
  }),
  setup(e, { slots: t }) {
    const n = xr(), i = fc();
    let o, r;
    return il(() => {
      if (!o.length)
        return;
      const s = e.moveClass || `${e.name || "v"}-move`;
      if (!Gh(
        o[0].el,
        n.vnode.el,
        s
      ))
        return;
      o.forEach(Uh), o.forEach(Wh);
      const l = o.filter(Kh);
      Jc(), l.forEach((a) => {
        const d = a.el, u = d.style;
        ln(d, s), u.transform = u.webkitTransform = u.transitionDuration = "";
        const c = d[sr] = (m) => {
          m && m.target !== d || (!m || /transform$/.test(m.propertyName)) && (d.removeEventListener("transitionend", c), d[sr] = null, Nn(d, s));
        };
        d.addEventListener("transitionend", c);
      });
    }), () => {
      const s = Q(e), l = Zc(s);
      let a = s.tag || Ne;
      if (o = [], r)
        for (let d = 0; d < r.length; d++) {
          const u = r[d];
          u.el && u.el instanceof Element && (o.push(u), ui(
            u,
            so(
              u,
              l,
              i,
              n
            )
          ), ed.set(
            u,
            u.el.getBoundingClientRect()
          ));
        }
      r = t.default ? tl(t.default()) : [];
      for (let d = 0; d < r.length; d++) {
        const u = r[d];
        u.key != null ? ui(
          u,
          so(u, l, i, n)
        ) : It.NODE_ENV !== "production" && u.type !== fi && pt("<TransitionGroup> children must be keyed.");
      }
      return f(a, null, r);
    };
  }
}), dl = zh;
function Uh(e) {
  const t = e.el;
  t[sr] && t[sr](), t[Oa] && t[Oa]();
}
function Wh(e) {
  td.set(e, e.el.getBoundingClientRect());
}
function Kh(e) {
  const t = ed.get(e), n = td.get(e), i = t.left - n.left, o = t.top - n.top;
  if (i || o) {
    const r = e.el.style;
    return r.transform = r.webkitTransform = `translate(${i}px,${o}px)`, r.transitionDuration = "0s", e;
  }
}
function Gh(e, t, n) {
  const i = e.cloneNode(), o = e[Ti];
  o && o.forEach((l) => {
    l.split(/\s+/).forEach((a) => a && i.classList.remove(a));
  }), n.split(/\s+/).forEach((l) => l && i.classList.add(l)), i.style.display = "none";
  const r = t.nodeType === 1 ? t : t.parentNode;
  r.appendChild(i);
  const { hasTransform: s } = Xc(i);
  return r.removeChild(i), s;
}
const Yh = ["ctrl", "shift", "alt", "meta"], qh = {
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
  exact: (e, t) => Yh.some((n) => e[`${n}Key`] && !t.includes(n))
}, Jr = (e, t) => {
  const n = e._withMods || (e._withMods = {}), i = t.join(".");
  return n[i] || (n[i] = (o, ...r) => {
    for (let s = 0; s < t.length; s++) {
      const l = qh[t[s]];
      if (l && l(o, t)) return;
    }
    return e(o, ...r);
  });
}, Zh = /* @__PURE__ */ Be({ patchProp: Rh }, Sh);
let Ta;
function Xh() {
  return Ta || (Ta = Wv(Zh));
}
const Jh = (...e) => {
  const t = Xh().createApp(...e);
  It.NODE_ENV !== "production" && (eg(t), tg(t));
  const { mount: n } = t;
  return t.mount = (i) => {
    const o = ng(i);
    if (!o) return;
    const r = t._component;
    !se(r) && !r.render && !r.template && (r.template = o.innerHTML), o.nodeType === 1 && (o.textContent = "");
    const s = n(o, !1, Qh(o));
    return o instanceof Element && (o.removeAttribute("v-cloak"), o.setAttribute("data-v-app", "")), s;
  }, t;
};
function Qh(e) {
  if (e instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement)
    return "mathml";
}
function eg(e) {
  Object.defineProperty(e.config, "isNativeTag", {
    value: (t) => im(t) || om(t) || rm(t),
    writable: !1
  });
}
function tg(e) {
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
function ng(e) {
  if (Le(e)) {
    const t = document.querySelector(e);
    return It.NODE_ENV !== "production" && !t && pt(
      `Failed to mount app: mount target selector "${e}" returned null.`
    ), t;
  }
  return It.NODE_ENV !== "production" && window.ShadowRoot && e instanceof window.ShadowRoot && e.mode === "closed" && pt(
    'mounting on a ShadowRoot with `{mode: "closed"}` may lead to unpredictable bugs'
  ), e;
}
var ig = {};
function og() {
  bh();
}
ig.NODE_ENV !== "production" && og();
function di(e, t) {
  let n;
  function i() {
    n = Ks(), n.run(() => t.length ? t(() => {
      n == null || n.stop(), i();
    }) : t());
  }
  he(e, (o) => {
    o && !n ? i() : o || (n == null || n.stop(), n = void 0);
  }, {
    immediate: !0
  }), Ut(() => {
    n == null || n.stop();
  });
}
const Re = typeof window < "u", fl = Re && "IntersectionObserver" in window, rg = Re && ("ontouchstart" in window || window.navigator.maxTouchPoints > 0);
function nd(e, t, n) {
  const i = t.length - 1;
  if (i < 0) return e === void 0 ? n : e;
  for (let o = 0; o < i; o++) {
    if (e == null)
      return n;
    e = e[t[o]];
  }
  return e == null || e[t[i]] === void 0 ? n : e[t[i]];
}
function Tr(e, t) {
  if (e === t) return !0;
  if (e instanceof Date && t instanceof Date && e.getTime() !== t.getTime() || e !== Object(e) || t !== Object(t))
    return !1;
  const n = Object.keys(e);
  return n.length !== Object.keys(t).length ? !1 : n.every((i) => Tr(e[i], t[i]));
}
function xs(e, t, n) {
  return e == null || !t || typeof t != "string" ? n : e[t] !== void 0 ? e[t] : (t = t.replace(/\[(\w+)\]/g, ".$1"), t = t.replace(/^\./, ""), nd(e, t.split("."), n));
}
function zi(e, t, n) {
  if (t === !0) return e === void 0 ? n : e;
  if (t == null || typeof t == "boolean") return n;
  if (e !== Object(e)) {
    if (typeof t != "function") return n;
    const o = t(e, n);
    return typeof o > "u" ? n : o;
  }
  if (typeof t == "string") return xs(e, t, n);
  if (Array.isArray(t)) return nd(e, t, n);
  if (typeof t != "function") return n;
  const i = t(e, n);
  return typeof i > "u" ? n : i;
}
function ml(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0;
  return Array.from({
    length: e
  }, (n, i) => t + i);
}
function re(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "px";
  if (!(e == null || e === ""))
    return isNaN(+e) ? String(e) : isFinite(+e) ? `${Number(e)}${t}` : void 0;
}
function sg(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function Da(e) {
  let t;
  return e !== null && typeof e == "object" && ((t = Object.getPrototypeOf(e)) === Object.prototype || t === null);
}
function lg(e) {
  if (e && "$el" in e) {
    const t = e.$el;
    return (t == null ? void 0 : t.nodeType) === Node.TEXT_NODE ? t.nextElementSibling : t;
  }
  return e;
}
const Pa = Object.freeze({
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
}), ag = Object.freeze({
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
function Qr(e, t) {
  return t.every((n) => e.hasOwnProperty(n));
}
function id(e, t) {
  const n = {}, i = new Set(Object.keys(e));
  for (const o of t)
    i.has(o) && (n[o] = e[o]);
  return n;
}
function Vs(e, t, n) {
  const i = /* @__PURE__ */ Object.create(null), o = /* @__PURE__ */ Object.create(null);
  for (const r in e)
    t.some((s) => s instanceof RegExp ? s.test(r) : s === r) && !(n != null && n.some((s) => s === r)) ? i[r] = e[r] : o[r] = e[r];
  return [i, o];
}
function od(e, t) {
  const n = {
    ...e
  };
  return t.forEach((i) => delete n[i]), n;
}
function ug(e, t) {
  const n = {};
  return t.forEach((i) => n[i] = e[i]), n;
}
const rd = /^on[^a-z]/, vl = (e) => rd.test(e), cg = ["onAfterscriptexecute", "onAnimationcancel", "onAnimationend", "onAnimationiteration", "onAnimationstart", "onAuxclick", "onBeforeinput", "onBeforescriptexecute", "onChange", "onClick", "onCompositionend", "onCompositionstart", "onCompositionupdate", "onContextmenu", "onCopy", "onCut", "onDblclick", "onFocusin", "onFocusout", "onFullscreenchange", "onFullscreenerror", "onGesturechange", "onGestureend", "onGesturestart", "onGotpointercapture", "onInput", "onKeydown", "onKeypress", "onKeyup", "onLostpointercapture", "onMousedown", "onMousemove", "onMouseout", "onMouseover", "onMouseup", "onMousewheel", "onPaste", "onPointercancel", "onPointerdown", "onPointerenter", "onPointerleave", "onPointermove", "onPointerout", "onPointerover", "onPointerup", "onReset", "onSelect", "onSubmit", "onTouchcancel", "onTouchend", "onTouchmove", "onTouchstart", "onTransitioncancel", "onTransitionend", "onTransitionrun", "onTransitionstart", "onWheel"];
function dg(e) {
  const [t, n] = Vs(e, [rd]), i = od(t, cg), [o, r] = Vs(n, ["class", "style", "id", /^data-/]);
  return Object.assign(o, t), Object.assign(r, i), [o, r];
}
function ii(e) {
  return e == null ? [] : Array.isArray(e) ? e : [e];
}
function An(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 1;
  return Math.max(t, Math.min(n, e));
}
function Aa(e) {
  const t = e.toString().trim();
  return t.includes(".") ? t.length - t.indexOf(".") - 1 : 0;
}
function Ia(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0";
  return e + n.repeat(Math.max(0, t - e.length));
}
function $a(e, t) {
  return (arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "0").repeat(Math.max(0, t - e.length)) + e;
}
function fg(e) {
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
function sd(e) {
  return e.map((t) => t.type === Ne ? sd(t.children) : t).flat();
}
function oi() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  if (oi.cache.has(e)) return oi.cache.get(e);
  const t = e.replace(/[^a-z]/gi, "-").replace(/\B([A-Z])/g, "-$1").toLowerCase();
  return oi.cache.set(e, t), t;
}
oi.cache = /* @__PURE__ */ new Map();
function bi(e, t) {
  if (!t || typeof t != "object") return [];
  if (Array.isArray(t))
    return t.map((n) => bi(e, n)).flat(1);
  if (t.suspense)
    return bi(e, t.ssContent);
  if (Array.isArray(t.children))
    return t.children.map((n) => bi(e, n)).flat(1);
  if (t.component) {
    if (Object.getOwnPropertySymbols(t.component.provides).includes(e))
      return [t.component];
    if (t.component.subTree)
      return bi(e, t.component.subTree).flat(1);
  }
  return [];
}
function hl(e) {
  const t = tt({}), n = y(e);
  return bn(() => {
    for (const i in n.value)
      t[i] = n.value[i];
  }, {
    flush: "sync"
  }), Xs(t);
}
function lr(e, t) {
  return e.includes(t);
}
function ld(e) {
  return e[2].toLowerCase() + e.slice(3);
}
const Ot = () => [Function, Array];
function Ma(e, t) {
  return t = "on" + Dt(t), !!(e[t] || e[`${t}Once`] || e[`${t}Capture`] || e[`${t}OnceCapture`] || e[`${t}CaptureOnce`]);
}
function mg(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
    n[i - 1] = arguments[i];
  if (Array.isArray(e))
    for (const o of e)
      o(...n);
  else typeof e == "function" && e(...n);
}
function ad(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !0;
  const n = ["button", "[href]", 'input:not([type="hidden"])', "select", "textarea", "[tabindex]"].map((i) => `${i}${t ? ':not([tabindex="-1"])' : ""}:not([disabled])`).join(", ");
  return [...e.querySelectorAll(n)];
}
function vg(e, t, n) {
  let i, o = e.indexOf(document.activeElement);
  const r = t === "next" ? 1 : -1;
  do
    o += r, i = e[o];
  while ((!i || i.offsetParent == null) && o < e.length && o >= 0);
  return i;
}
function ud(e, t) {
  var i, o, r, s;
  const n = ad(e);
  if (!t)
    (e === document.activeElement || !e.contains(document.activeElement)) && ((i = n[0]) == null || i.focus());
  else if (t === "first")
    (o = n[0]) == null || o.focus();
  else if (t === "last")
    (r = n.at(-1)) == null || r.focus();
  else if (typeof t == "number")
    (s = n[t]) == null || s.focus();
  else {
    const l = vg(n, t);
    l ? l.focus() : ud(e, t === "next" ? "first" : "last");
  }
}
function hg(e, t) {
  if (!(Re && typeof CSS < "u" && typeof CSS.supports < "u" && CSS.supports(`selector(${t})`))) return null;
  try {
    return !!e && e.matches(t);
  } catch {
    return null;
  }
}
function gg(e, t) {
  if (!Re || e === 0)
    return t(), () => {
    };
  const n = window.setTimeout(t, e);
  return () => window.clearTimeout(n);
}
function Os() {
  const e = pe(), t = (n) => {
    e.value = n;
  };
  return Object.defineProperty(t, "value", {
    enumerable: !0,
    get: () => e.value,
    set: (n) => e.value = n
  }), Object.defineProperty(t, "el", {
    enumerable: !0,
    get: () => lg(e.value)
  }), t;
}
const cd = ["top", "bottom"], pg = ["start", "end", "left", "right"];
function Ts(e, t) {
  let [n, i] = e.split(" ");
  return i || (i = lr(cd, n) ? "start" : lr(pg, n) ? "top" : "center"), {
    side: Fa(n, t),
    align: Fa(i, t)
  };
}
function Fa(e, t) {
  return e === "start" ? t ? "right" : "left" : e === "end" ? t ? "left" : "right" : e;
}
function es(e) {
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
function ts(e) {
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
function La(e) {
  return {
    side: e.align,
    align: e.side
  };
}
function Ba(e) {
  return lr(cd, e.side) ? "y" : "x";
}
class ri {
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
function Ra(e, t) {
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
function dd(e) {
  return Array.isArray(e) ? new ri({
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
      return new ri(t);
    const d = n.transformOrigin, u = t.x - l - (1 - r) * parseFloat(d), c = t.y - a - (1 - s) * parseFloat(d.slice(d.indexOf(" ") + 1)), m = r ? t.width / r : e.offsetWidth + 1, v = s ? t.height / s : e.offsetHeight + 1;
    return new ri({
      x: u,
      y: c,
      width: m,
      height: v
    });
  } else
    return new ri(t);
}
function _i(e, t, n) {
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
const Wo = /* @__PURE__ */ new WeakMap();
function yg(e, t) {
  Object.keys(t).forEach((n) => {
    if (vl(n)) {
      const i = ld(n), o = Wo.get(e);
      if (t[n] == null)
        o == null || o.forEach((r) => {
          const [s, l] = r;
          s === i && (e.removeEventListener(i, l), o.delete(r));
        });
      else if (!o || ![...o].some((r) => r[0] === i && r[1] === t[n])) {
        e.addEventListener(i, t[n]);
        const r = o || /* @__PURE__ */ new Set();
        r.add([i, t[n]]), Wo.has(e) || Wo.set(e, r);
      }
    } else
      t[n] == null ? e.removeAttribute(n) : e.setAttribute(n, t[n]);
  });
}
function bg(e, t) {
  Object.keys(t).forEach((n) => {
    if (vl(n)) {
      const i = ld(n), o = Wo.get(e);
      o == null || o.forEach((r) => {
        const [s, l] = r;
        s === i && (e.removeEventListener(i, l), o.delete(r));
      });
    } else
      e.removeAttribute(n);
  });
}
const gi = 2.4, Ha = 0.2126729, ja = 0.7151522, za = 0.072175, _g = 0.55, wg = 0.58, Sg = 0.57, Eg = 0.62, Io = 0.03, Ua = 1.45, Cg = 5e-4, kg = 1.25, Ng = 1.25, Wa = 0.078, Ka = 12.82051282051282, $o = 0.06, Ga = 1e-3;
function Ya(e, t) {
  const n = (e.r / 255) ** gi, i = (e.g / 255) ** gi, o = (e.b / 255) ** gi, r = (t.r / 255) ** gi, s = (t.g / 255) ** gi, l = (t.b / 255) ** gi;
  let a = n * Ha + i * ja + o * za, d = r * Ha + s * ja + l * za;
  if (a <= Io && (a += (Io - a) ** Ua), d <= Io && (d += (Io - d) ** Ua), Math.abs(d - a) < Cg) return 0;
  let u;
  if (d > a) {
    const c = (d ** _g - a ** wg) * kg;
    u = c < Ga ? 0 : c < Wa ? c - c * Ka * $o : c - $o;
  } else {
    const c = (d ** Eg - a ** Sg) * Ng;
    u = c > -Ga ? 0 : c > -Wa ? c - c * Ka * $o : c + $o;
  }
  return u * 100;
}
function fn(e) {
  pt(`Vuetify: ${e}`);
}
function ar(e) {
  pt(`Vuetify error: ${e}`);
}
function xg(e, t) {
  t = Array.isArray(t) ? t.slice(0, -1).map((n) => `'${n}'`).join(", ") + ` or '${t.at(-1)}'` : `'${t}'`, pt(`[Vuetify UPGRADE] '${e}' is deprecated, use ${t} instead.`);
}
const ur = 0.20689655172413793, Vg = (e) => e > ur ** 3 ? Math.cbrt(e) : e / (3 * ur ** 2) + 4 / 29, Og = (e) => e > ur ? e ** 3 : 3 * ur ** 2 * (e - 4 / 29);
function fd(e) {
  const t = Vg, n = t(e[1]);
  return [116 * n - 16, 500 * (t(e[0] / 0.95047) - n), 200 * (n - t(e[2] / 1.08883))];
}
function md(e) {
  const t = Og, n = (e[0] + 16) / 116;
  return [t(n + e[1] / 500) * 0.95047, t(n), t(n - e[2] / 200) * 1.08883];
}
const Tg = [[3.2406, -1.5372, -0.4986], [-0.9689, 1.8758, 0.0415], [0.0557, -0.204, 1.057]], Dg = (e) => e <= 31308e-7 ? e * 12.92 : 1.055 * e ** (1 / 2.4) - 0.055, Pg = [[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]], Ag = (e) => e <= 0.04045 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4;
function vd(e) {
  const t = Array(3), n = Dg, i = Tg;
  for (let o = 0; o < 3; ++o)
    t[o] = Math.round(An(n(i[o][0] * e[0] + i[o][1] * e[1] + i[o][2] * e[2])) * 255);
  return {
    r: t[0],
    g: t[1],
    b: t[2]
  };
}
function pl(e) {
  let {
    r: t,
    g: n,
    b: i
  } = e;
  const o = [0, 0, 0], r = Ag, s = Pg;
  t = r(t / 255), n = r(n / 255), i = r(i / 255);
  for (let l = 0; l < 3; ++l)
    o[l] = s[l][0] * t + s[l][1] * n + s[l][2] * i;
  return o;
}
function Ds(e) {
  return !!e && /^(#|var\(--|(rgb|hsl)a?\()/.test(e);
}
function Ig(e) {
  return Ds(e) && !/^((rgb|hsl)a?\()?var\(--/.test(e);
}
const qa = /^(?<fn>(?:rgb|hsl)a?)\((?<values>.+)\)/, $g = {
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
  hsl: (e, t, n, i) => Za({
    h: e,
    s: t,
    l: n,
    a: i
  }),
  hsla: (e, t, n, i) => Za({
    h: e,
    s: t,
    l: n,
    a: i
  }),
  hsv: (e, t, n, i) => uo({
    h: e,
    s: t,
    v: n,
    a: i
  }),
  hsva: (e, t, n, i) => uo({
    h: e,
    s: t,
    v: n,
    a: i
  })
};
function Qt(e) {
  if (typeof e == "number")
    return (isNaN(e) || e < 0 || e > 16777215) && fn(`'${e}' is not a valid hex color`), {
      r: (e & 16711680) >> 16,
      g: (e & 65280) >> 8,
      b: e & 255
    };
  if (typeof e == "string" && qa.test(e)) {
    const {
      groups: t
    } = e.match(qa), {
      fn: n,
      values: i
    } = t, o = i.split(/,\s*/).map((r) => r.endsWith("%") && ["hsl", "hsla", "hsv", "hsva"].includes(n) ? parseFloat(r) / 100 : parseFloat(r));
    return $g[n](...o);
  } else if (typeof e == "string") {
    let t = e.startsWith("#") ? e.slice(1) : e;
    [3, 4].includes(t.length) ? t = t.split("").map((i) => i + i).join("") : [6, 8].includes(t.length) || fn(`'${e}' is not a valid hex(a) color`);
    const n = parseInt(t, 16);
    return (isNaN(n) || n < 0 || n > 4294967295) && fn(`'${e}' is not a valid hex(a) color`), Fg(t);
  } else if (typeof e == "object") {
    if (Qr(e, ["r", "g", "b"]))
      return e;
    if (Qr(e, ["h", "s", "l"]))
      return uo(hd(e));
    if (Qr(e, ["h", "s", "v"]))
      return uo(e);
  }
  throw new TypeError(`Invalid color: ${e == null ? e : String(e) || e.constructor.name}
Expected #hex, #hexa, rgb(), rgba(), hsl(), hsla(), object or number`);
}
function uo(e) {
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
function Za(e) {
  return uo(hd(e));
}
function hd(e) {
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
function Mo(e) {
  const t = Math.round(e).toString(16);
  return ("00".substr(0, 2 - t.length) + t).toUpperCase();
}
function Mg(e) {
  let {
    r: t,
    g: n,
    b: i,
    a: o
  } = e;
  return `#${[Mo(t), Mo(n), Mo(i), o !== void 0 ? Mo(Math.round(o * 255)) : ""].join("")}`;
}
function Fg(e) {
  e = Lg(e);
  let [t, n, i, o] = fg(e, 2).map((r) => parseInt(r, 16));
  return o = o === void 0 ? o : o / 255, {
    r: t,
    g: n,
    b: i,
    a: o
  };
}
function Lg(e) {
  return e.startsWith("#") && (e = e.slice(1)), e = e.replace(/([^0-9a-f])/gi, "F"), (e.length === 3 || e.length === 4) && (e = e.split("").map((t) => t + t).join("")), e.length !== 6 && (e = Ia(Ia(e, 6), 8, "F")), e;
}
function Bg(e, t) {
  const n = fd(pl(e));
  return n[0] = n[0] + t * 10, vd(md(n));
}
function Rg(e, t) {
  const n = fd(pl(e));
  return n[0] = n[0] - t * 10, vd(md(n));
}
function Hg(e) {
  const t = Qt(e);
  return pl(t)[1];
}
function gd(e) {
  const t = Math.abs(Ya(Qt(0), Qt(e)));
  return Math.abs(Ya(Qt(16777215), Qt(e))) > Math.min(t, 50) ? "#fff" : "#000";
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
const ye = W({
  class: [String, Array, Object],
  style: {
    type: [String, Array, Object],
    default: null
  }
}, "component");
function Ue(e, t) {
  const n = xr();
  if (!n)
    throw new Error(`[Vuetify] ${e} must be called from inside a setup function`);
  return n;
}
function en() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "composables";
  const t = Ue(e).type;
  return oi((t == null ? void 0 : t.aliasName) || (t == null ? void 0 : t.name));
}
let pd = 0, Ko = /* @__PURE__ */ new WeakMap();
function Ln() {
  const e = Ue("getUid");
  if (Ko.has(e)) return Ko.get(e);
  {
    const t = pd++;
    return Ko.set(e, t), t;
  }
}
Ln.reset = () => {
  pd = 0, Ko = /* @__PURE__ */ new WeakMap();
};
function jg(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Ue("injectSelf");
  const {
    provides: n
  } = t;
  if (n && e in n)
    return n[e];
}
const Di = Symbol.for("vuetify:defaults");
function zg(e) {
  return ce(e);
}
function yl() {
  const e = He(Di);
  if (!e) throw new Error("[Vuetify] Could not find defaults instance");
  return e;
}
function $i(e, t) {
  const n = yl(), i = ce(e), o = y(() => {
    if (Jt(t == null ? void 0 : t.disabled)) return n.value;
    const s = Jt(t == null ? void 0 : t.scoped), l = Jt(t == null ? void 0 : t.reset), a = Jt(t == null ? void 0 : t.root);
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
  return ht(Di, o), o;
}
function Ug(e, t) {
  var n, i;
  return typeof ((n = e.props) == null ? void 0 : n[t]) < "u" || typeof ((i = e.props) == null ? void 0 : i[oi(t)]) < "u";
}
function Wg() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : yl();
  const i = Ue("useDefaults");
  if (t = t ?? i.type.name ?? i.type.__name, !t)
    throw new Error("[Vuetify] Could not determine component name");
  const o = y(() => {
    var a;
    return (a = n.value) == null ? void 0 : a[e._as ?? t];
  }), r = new Proxy(e, {
    get(a, d) {
      var c, m, v, h, g, S, k;
      const u = Reflect.get(a, d);
      return d === "class" || d === "style" ? [(c = o.value) == null ? void 0 : c[d], u].filter((O) => O != null) : typeof d == "string" && !Ug(i.vnode, d) ? ((m = o.value) == null ? void 0 : m[d]) !== void 0 ? (v = o.value) == null ? void 0 : v[d] : ((g = (h = n.value) == null ? void 0 : h.global) == null ? void 0 : g[d]) !== void 0 ? (k = (S = n.value) == null ? void 0 : S.global) == null ? void 0 : k[d] : u : u;
    }
  }), s = pe();
  bn(() => {
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
    const a = jg(Di, i);
    ht(Di, y(() => s.value ? kt((a == null ? void 0 : a.value) ?? {}, s.value) : a == null ? void 0 : a.value));
  }
  return {
    props: r,
    provideSubDefaults: l
  };
}
function Mi(e) {
  if (e._setup = e._setup ?? e.setup, !e.name)
    return fn("The component is missing an explicit name, unable to generate default prop value"), e;
  if (e._setup) {
    e.props = W(e.props ?? {}, e.name)();
    const t = Object.keys(e.props).filter((n) => n !== "class" && n !== "style");
    e.filterProps = function(i) {
      return id(i, t);
    }, e.props._as = String, e.setup = function(i, o) {
      const r = yl();
      if (!r.value) return e._setup(i, o);
      const {
        props: s,
        provideSubDefaults: l
      } = Wg(i, i._as ?? e.name, r), a = e._setup(s, o);
      return l(), a;
    };
  }
  return e;
}
function le() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !0;
  return (t) => (e ? Mi : uv)(t);
}
function Dr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "div", n = arguments.length > 2 ? arguments[2] : void 0;
  return le()({
    name: n ?? Dt(nt(e.replace(/__/g, "-"))),
    props: {
      tag: {
        type: String,
        default: t
      },
      ...ye()
    },
    setup(i, o) {
      let {
        slots: r
      } = o;
      return () => {
        var s;
        return Mn(i.tag, {
          class: [e, i.class],
          style: i.style
        }, (s = r.default) == null ? void 0 : s.call(r));
      };
    }
  });
}
function yd(e) {
  if (typeof e.getRootNode != "function") {
    for (; e.parentNode; ) e = e.parentNode;
    return e !== document ? null : document;
  }
  const t = e.getRootNode();
  return t !== document && t.getRootNode({
    composed: !0
  }) !== document ? null : t;
}
const cr = "cubic-bezier(0.4, 0, 0.2, 1)", Kg = "cubic-bezier(0.0, 0, 0.2, 1)", Gg = "cubic-bezier(0.4, 0, 1, 1)";
function Yg(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1;
  for (; e; ) {
    if (t ? qg(e) : bl(e)) return e;
    e = e.parentElement;
  }
  return document.scrollingElement;
}
function dr(e, t) {
  const n = [];
  if (t && e && !t.contains(e)) return n;
  for (; e && (bl(e) && n.push(e), e !== t); )
    e = e.parentElement;
  return n;
}
function bl(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return t.overflowY === "scroll" || t.overflowY === "auto" && e.scrollHeight > e.clientHeight;
}
function qg(e) {
  if (!e || e.nodeType !== Node.ELEMENT_NODE) return !1;
  const t = window.getComputedStyle(e);
  return ["scroll", "auto"].includes(t.overflowY);
}
function Zg(e) {
  for (; e; ) {
    if (window.getComputedStyle(e).position === "fixed")
      return !0;
    e = e.offsetParent;
  }
  return !1;
}
function ge(e) {
  const t = Ue("useRender");
  t.render = e;
}
function it(e, t, n) {
  let i = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : (c) => c, o = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : (c) => c;
  const r = Ue("useProxiedModel"), s = ce(e[t] !== void 0 ? e[t] : n), l = oi(t), d = y(l !== t ? () => {
    var c, m, v, h;
    return e[t], !!(((c = r.vnode.props) != null && c.hasOwnProperty(t) || (m = r.vnode.props) != null && m.hasOwnProperty(l)) && ((v = r.vnode.props) != null && v.hasOwnProperty(`onUpdate:${t}`) || (h = r.vnode.props) != null && h.hasOwnProperty(`onUpdate:${l}`)));
  } : () => {
    var c, m;
    return e[t], !!((c = r.vnode.props) != null && c.hasOwnProperty(t) && ((m = r.vnode.props) != null && m.hasOwnProperty(`onUpdate:${t}`)));
  });
  di(() => !d.value, () => {
    he(() => e[t], (c) => {
      s.value = c;
    });
  });
  const u = y({
    get() {
      const c = e[t];
      return i(d.value ? c : s.value);
    },
    set(c) {
      const m = o(c), v = Q(d.value ? e[t] : s.value);
      v === m || i(v) === c || (s.value = m, r == null || r.emit(`update:${t}`, m));
    }
  });
  return Object.defineProperty(u, "externalValue", {
    get: () => d.value ? e[t] : s.value
  }), u;
}
const Xg = {
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
}, Xa = "$vuetify.", Ja = (e, t) => e.replace(/\{(\d+)\}/g, (n, i) => String(t[+i])), bd = (e, t, n) => function(i) {
  for (var o = arguments.length, r = new Array(o > 1 ? o - 1 : 0), s = 1; s < o; s++)
    r[s - 1] = arguments[s];
  if (!i.startsWith(Xa))
    return Ja(i, r);
  const l = i.replace(Xa, ""), a = e.value && n.value[e.value], d = t.value && n.value[t.value];
  let u = xs(a, l, null);
  return u || (fn(`Translation key "${i}" not found in "${e.value}", trying fallback locale`), u = xs(d, l, null)), u || (ar(`Translation key "${i}" not found in fallback`), u = i), typeof u != "string" && (ar(`Translation key "${i}" has a non-string value`), u = i), Ja(u, r);
};
function _d(e, t) {
  return (n, i) => new Intl.NumberFormat([e.value, t.value], i).format(n);
}
function ns(e, t, n) {
  const i = it(e, t, e[t] ?? n.value);
  return i.value = e[t] ?? n.value, he(n, (o) => {
    e[t] == null && (i.value = n.value);
  }), i;
}
function wd(e) {
  return (t) => {
    const n = ns(t, "locale", e.current), i = ns(t, "fallback", e.fallback), o = ns(t, "messages", e.messages);
    return {
      name: "vuetify",
      current: n,
      fallback: i,
      messages: o,
      t: bd(n, i, o),
      n: _d(n, i),
      provide: wd({
        current: n,
        fallback: i,
        messages: o
      })
    };
  };
}
function Jg(e) {
  const t = pe((e == null ? void 0 : e.locale) ?? "en"), n = pe((e == null ? void 0 : e.fallback) ?? "en"), i = ce({
    en: Xg,
    ...e == null ? void 0 : e.messages
  });
  return {
    name: "vuetify",
    current: t,
    fallback: n,
    messages: i,
    t: bd(t, n, i),
    n: _d(t, n),
    provide: wd({
      current: t,
      fallback: n,
      messages: i
    })
  };
}
const fr = Symbol.for("vuetify:locale");
function Qg(e) {
  return e.name != null;
}
function ep(e) {
  const t = e != null && e.adapter && Qg(e == null ? void 0 : e.adapter) ? e == null ? void 0 : e.adapter : Jg(e), n = np(t, e);
  return {
    ...t,
    ...n
  };
}
function _l() {
  const e = He(fr);
  if (!e) throw new Error("[Vuetify] Could not find injected locale instance");
  return e;
}
function tp() {
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
function np(e, t) {
  const n = ce((t == null ? void 0 : t.rtl) ?? tp()), i = y(() => n.value[e.current.value] ?? !1);
  return {
    isRtl: i,
    rtl: n,
    rtlClasses: y(() => `v-locale--is-${i.value ? "rtl" : "ltr"}`)
  };
}
function tn() {
  const e = He(fr);
  if (!e) throw new Error("[Vuetify] Could not find injected rtl instance");
  return {
    isRtl: e.isRtl,
    rtlClasses: e.rtlClasses
  };
}
const Pr = {
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
function ip(e, t, n) {
  const i = [];
  let o = [];
  const r = Sd(e), s = Ed(e), l = n ?? Pr[t.slice(-2).toUpperCase()] ?? 0, a = (r.getDay() - l + 7) % 7, d = (s.getDay() - l + 7) % 7;
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
function op(e, t, n) {
  const i = n ?? Pr[t.slice(-2).toUpperCase()] ?? 0, o = new Date(e);
  for (; o.getDay() !== i; )
    o.setDate(o.getDate() - 1);
  return o;
}
function rp(e, t) {
  const n = new Date(e), i = ((Pr[t.slice(-2).toUpperCase()] ?? 0) + 6) % 7;
  for (; n.getDay() !== i; )
    n.setDate(n.getDate() + 1);
  return n;
}
function Sd(e) {
  return new Date(e.getFullYear(), e.getMonth(), 1);
}
function Ed(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 0);
}
function sp(e) {
  const t = e.split("-").map(Number);
  return new Date(t[0], t[1] - 1, t[2]);
}
const lp = /^([12]\d{3}-([1-9]|0[1-9]|1[0-2])-([1-9]|0[1-9]|[12]\d|3[01]))$/;
function Cd(e) {
  if (e == null) return /* @__PURE__ */ new Date();
  if (e instanceof Date) return e;
  if (typeof e == "string") {
    let t;
    if (lp.test(e))
      return sp(e);
    if (t = Date.parse(e), !isNaN(t)) return new Date(t);
  }
  return null;
}
const Qa = new Date(2e3, 0, 2);
function ap(e, t) {
  const n = t ?? Pr[e.slice(-2).toUpperCase()] ?? 0;
  return ml(7).map((i) => {
    const o = new Date(Qa);
    return o.setDate(Qa.getDate() + n + i), new Intl.DateTimeFormat(e, {
      weekday: "narrow"
    }).format(o);
  });
}
function up(e, t, n, i) {
  const o = Cd(e) ?? /* @__PURE__ */ new Date(), r = i == null ? void 0 : i[t];
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
function cp(e, t) {
  const n = e.toJsDate(t), i = n.getFullYear(), o = $a(String(n.getMonth() + 1), 2, "0"), r = $a(String(n.getDate()), 2, "0");
  return `${i}-${o}-${r}`;
}
function dp(e) {
  const [t, n, i] = e.split("-").map(Number);
  return new Date(t, n - 1, i);
}
function fp(e, t) {
  const n = new Date(e);
  return n.setMinutes(n.getMinutes() + t), n;
}
function mp(e, t) {
  const n = new Date(e);
  return n.setHours(n.getHours() + t), n;
}
function vp(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t), n;
}
function hp(e, t) {
  const n = new Date(e);
  return n.setDate(n.getDate() + t * 7), n;
}
function gp(e, t) {
  const n = new Date(e);
  return n.setDate(1), n.setMonth(n.getMonth() + t), n;
}
function pp(e) {
  return e.getFullYear();
}
function yp(e) {
  return e.getMonth();
}
function bp(e) {
  return e.getDate();
}
function _p(e) {
  return new Date(e.getFullYear(), e.getMonth() + 1, 1);
}
function wp(e) {
  return new Date(e.getFullYear(), e.getMonth() - 1, 1);
}
function Sp(e) {
  return e.getHours();
}
function Ep(e) {
  return e.getMinutes();
}
function Cp(e) {
  return new Date(e.getFullYear(), 0, 1);
}
function kp(e) {
  return new Date(e.getFullYear(), 11, 31);
}
function Np(e, t) {
  return mr(e, t[0]) && Op(e, t[1]);
}
function xp(e) {
  const t = new Date(e);
  return t instanceof Date && !isNaN(t.getTime());
}
function mr(e, t) {
  return e.getTime() > t.getTime();
}
function Vp(e, t) {
  return mr(Ps(e), Ps(t));
}
function Op(e, t) {
  return e.getTime() < t.getTime();
}
function eu(e, t) {
  return e.getTime() === t.getTime();
}
function Tp(e, t) {
  return e.getDate() === t.getDate() && e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function Dp(e, t) {
  return e.getMonth() === t.getMonth() && e.getFullYear() === t.getFullYear();
}
function Pp(e, t) {
  return e.getFullYear() === t.getFullYear();
}
function Ap(e, t, n) {
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
function Ip(e, t) {
  const n = new Date(e);
  return n.setHours(t), n;
}
function $p(e, t) {
  const n = new Date(e);
  return n.setMinutes(t), n;
}
function Mp(e, t) {
  const n = new Date(e);
  return n.setMonth(t), n;
}
function Fp(e, t) {
  const n = new Date(e);
  return n.setDate(t), n;
}
function Lp(e, t) {
  const n = new Date(e);
  return n.setFullYear(t), n;
}
function Ps(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
}
function Bp(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
}
class Rp {
  constructor(t) {
    this.locale = t.locale, this.formats = t.formats;
  }
  date(t) {
    return Cd(t);
  }
  toJsDate(t) {
    return t;
  }
  toISO(t) {
    return cp(this, t);
  }
  parseISO(t) {
    return dp(t);
  }
  addMinutes(t, n) {
    return fp(t, n);
  }
  addHours(t, n) {
    return mp(t, n);
  }
  addDays(t, n) {
    return vp(t, n);
  }
  addWeeks(t, n) {
    return hp(t, n);
  }
  addMonths(t, n) {
    return gp(t, n);
  }
  getWeekArray(t, n) {
    return ip(t, this.locale, n ? Number(n) : void 0);
  }
  startOfWeek(t, n) {
    return op(t, this.locale, n ? Number(n) : void 0);
  }
  endOfWeek(t) {
    return rp(t, this.locale);
  }
  startOfMonth(t) {
    return Sd(t);
  }
  endOfMonth(t) {
    return Ed(t);
  }
  format(t, n) {
    return up(t, n, this.locale, this.formats);
  }
  isEqual(t, n) {
    return eu(t, n);
  }
  isValid(t) {
    return xp(t);
  }
  isWithinRange(t, n) {
    return Np(t, n);
  }
  isAfter(t, n) {
    return mr(t, n);
  }
  isAfterDay(t, n) {
    return Vp(t, n);
  }
  isBefore(t, n) {
    return !mr(t, n) && !eu(t, n);
  }
  isSameDay(t, n) {
    return Tp(t, n);
  }
  isSameMonth(t, n) {
    return Dp(t, n);
  }
  isSameYear(t, n) {
    return Pp(t, n);
  }
  setMinutes(t, n) {
    return $p(t, n);
  }
  setHours(t, n) {
    return Ip(t, n);
  }
  setMonth(t, n) {
    return Mp(t, n);
  }
  setDate(t, n) {
    return Fp(t, n);
  }
  setYear(t, n) {
    return Lp(t, n);
  }
  getDiff(t, n, i) {
    return Ap(t, n, i);
  }
  getWeekdays(t) {
    return ap(this.locale, t ? Number(t) : void 0);
  }
  getYear(t) {
    return pp(t);
  }
  getMonth(t) {
    return yp(t);
  }
  getDate(t) {
    return bp(t);
  }
  getNextMonth(t) {
    return _p(t);
  }
  getPreviousMonth(t) {
    return wp(t);
  }
  getHours(t) {
    return Sp(t);
  }
  getMinutes(t) {
    return Ep(t);
  }
  startOfDay(t) {
    return Ps(t);
  }
  endOfDay(t) {
    return Bp(t);
  }
  startOfYear(t) {
    return Cp(t);
  }
  endOfYear(t) {
    return kp(t);
  }
}
const Hp = Symbol.for("vuetify:date-options"), tu = Symbol.for("vuetify:date-adapter");
function jp(e, t) {
  const n = kt({
    adapter: Rp,
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
    instance: zp(n, t)
  };
}
function zp(e, t) {
  const n = tt(typeof e.adapter == "function" ? new e.adapter({
    locale: e.locale[t.current.value] ?? t.current.value,
    formats: e.formats
  }) : e.adapter);
  return he(t.current, (i) => {
    n.locale = e.locale[i] ?? i ?? n.locale;
  }), n;
}
const Ar = ["sm", "md", "lg", "xl", "xxl"], As = Symbol.for("vuetify:display"), nu = {
  mobileBreakpoint: "lg",
  thresholds: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
    xxl: 2560
  }
}, Up = function() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : nu;
  return kt(nu, e);
};
function iu(e) {
  return Re && !e ? window.innerWidth : typeof e == "object" && e.clientWidth || 0;
}
function ou(e) {
  return Re && !e ? window.innerHeight : typeof e == "object" && e.clientHeight || 0;
}
function ru(e) {
  const t = Re && !e ? window.navigator.userAgent : "ssr";
  function n(h) {
    return !!t.match(h);
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
    touch: rg,
    ssr: t === "ssr"
  };
}
function Wp(e, t) {
  const {
    thresholds: n,
    mobileBreakpoint: i
  } = Up(e), o = pe(ou(t)), r = pe(ru(t)), s = tt({}), l = pe(iu(t));
  function a() {
    o.value = ou(), l.value = iu();
  }
  function d() {
    a(), r.value = ru();
  }
  return bn(() => {
    const u = l.value < n.sm, c = l.value < n.md && !u, m = l.value < n.lg && !(c || u), v = l.value < n.xl && !(m || c || u), h = l.value < n.xxl && !(v || m || c || u), g = l.value >= n.xxl, S = u ? "xs" : c ? "sm" : m ? "md" : v ? "lg" : h ? "xl" : "xxl", k = typeof i == "number" ? i : n[i], O = l.value < k;
    s.xs = u, s.sm = c, s.md = m, s.lg = v, s.xl = h, s.xxl = g, s.smAndUp = !u, s.mdAndUp = !(u || c), s.lgAndUp = !(u || c || m), s.xlAndUp = !(u || c || m || v), s.smAndDown = !(m || v || h || g), s.mdAndDown = !(v || h || g), s.lgAndDown = !(h || g), s.xlAndDown = !g, s.name = S, s.height = o.value, s.width = l.value, s.mobile = O, s.mobileBreakpoint = i, s.platform = r.value, s.thresholds = n;
  }), Re && window.addEventListener("resize", a, {
    passive: !0
  }), {
    ...Xs(s),
    update: d,
    ssr: !!t
  };
}
function Kp() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en();
  const n = He(As);
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
const Gp = Symbol.for("vuetify:goto");
function Yp() {
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
function qp(e, t) {
  return {
    rtl: t.isRtl,
    options: kt(Yp(), e)
  };
}
const Zp = {
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
}, Xp = {
  // Not using mergeProps here, functional components merge props by default (?)
  component: (e) => Mn(Nd, {
    ...e,
    class: "mdi"
  })
}, je = [String, Function, Object, Array], Is = Symbol.for("vuetify:icons"), Ir = W({
  icon: {
    type: je
  },
  // Could not remove this and use makeTagProps, types complained because it is not required
  tag: {
    type: String,
    required: !0
  }
}, "icon"), su = le()({
  name: "VComponentIcon",
  props: Ir(),
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
}), kd = Mi({
  name: "VSvgIcon",
  inheritAttrs: !1,
  props: Ir(),
  setup(e, t) {
    let {
      attrs: n
    } = t;
    return () => f(e.tag, ke(n, {
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
Mi({
  name: "VLigatureIcon",
  props: Ir(),
  setup(e) {
    return () => f(e.tag, null, {
      default: () => [e.icon]
    });
  }
});
const Nd = Mi({
  name: "VClassIcon",
  props: Ir(),
  setup(e) {
    return () => f(e.tag, {
      class: e.icon
    }, null);
  }
});
function Jp() {
  return {
    svg: {
      component: kd
    },
    class: {
      component: Nd
    }
  };
}
function Qp(e) {
  const t = Jp(), n = (e == null ? void 0 : e.defaultSet) ?? "mdi";
  return n === "mdi" && !t.mdi && (t.mdi = Xp), kt({
    defaultSet: n,
    sets: t,
    aliases: {
      ...Zp,
      /* eslint-disable max-len */
      vuetify: ["M8.2241 14.2009L12 21L22 3H14.4459L8.2241 14.2009Z", ["M7.26303 12.4733L7.00113 12L2 3H12.5261C12.5261 3 12.5261 3 12.5261 3L7.26303 12.4733Z", 0.6]],
      "vuetify-outline": "svg:M7.26 12.47 12.53 3H2L7.26 12.47ZM14.45 3 8.22 14.2 12 21 22 3H14.45ZM18.6 5 12 16.88 10.51 14.2 15.62 5ZM7.26 8.35 5.4 5H9.13L7.26 8.35Z",
      "vuetify-play": ["m6.376 13.184-4.11-7.192C1.505 4.66 2.467 3 4.003 3h8.532l-.953 1.576-.006.01-.396.677c-.429.732-.214 1.507.194 2.015.404.503 1.092.878 1.869.806a3.72 3.72 0 0 1 1.005.022c.276.053.434.143.523.237.138.146.38.635-.25 2.09-.893 1.63-1.553 1.722-1.847 1.677-.213-.033-.468-.158-.756-.406a4.95 4.95 0 0 1-.8-.927c-.39-.564-1.04-.84-1.66-.846-.625-.006-1.316.27-1.693.921l-.478.826-.911 1.506Z", ["M9.093 11.552c.046-.079.144-.15.32-.148a.53.53 0 0 1 .43.207c.285.414.636.847 1.046 1.2.405.35.914.662 1.516.754 1.334.205 2.502-.698 3.48-2.495l.014-.028.013-.03c.687-1.574.774-2.852-.005-3.675-.37-.391-.861-.586-1.333-.676a5.243 5.243 0 0 0-1.447-.044c-.173.016-.393-.073-.54-.257-.145-.18-.127-.316-.082-.392l.393-.672L14.287 3h5.71c1.536 0 2.499 1.659 1.737 2.992l-7.997 13.996c-.768 1.344-2.706 1.344-3.473 0l-3.037-5.314 1.377-2.278.004-.006.004-.007.481-.831Z", 0.6]]
      /* eslint-enable max-len */
    }
  }, e);
}
const ey = (e) => {
  const t = He(Is);
  if (!t) throw new Error("Missing Vuetify Icons provide!");
  return {
    iconData: y(() => {
      var a;
      const i = Jt(e);
      if (!i) return {
        component: su
      };
      let o = i;
      if (typeof o == "string" && (o = o.trim(), o.startsWith("$") && (o = (a = t.aliases) == null ? void 0 : a[o.slice(1)])), o || fn(`Could not find aliased icon "${i}"`), Array.isArray(o))
        return {
          component: kd,
          icon: o
        };
      if (typeof o != "string")
        return {
          component: su,
          icon: o
        };
      const r = Object.keys(t.sets).find((d) => typeof o == "string" && o.startsWith(`${d}:`)), s = r ? o.slice(r.length + 1) : o;
      return {
        component: t.sets[r ?? t.defaultSet].component,
        icon: s
      };
    })
  };
}, co = Symbol.for("vuetify:theme"), Je = W({
  theme: String
}, "theme");
function lu() {
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
function ty() {
  var i, o;
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : lu();
  const t = lu();
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
function ny(e) {
  const t = ty(e), n = ce(t.defaultTheme), i = ce(t.themes), o = y(() => {
    const u = {};
    for (const [c, m] of Object.entries(i.value)) {
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
            for (const S of ["lighten", "darken"]) {
              const k = S === "lighten" ? Bg : Rg;
              for (const O of ml(t.variations[S], 1))
                v.colors[`${h}-${S}-${O}`] = Mg(k(Qt(g), O));
            }
        }
      for (const h of Object.keys(v.colors)) {
        if (/^on-[a-z]/.test(h) || v.colors[`on-${h}`]) continue;
        const g = `on-${h}`, S = Qt(v.colors[h]);
        v.colors[g] = gd(S);
      }
    }
    return u;
  }), r = y(() => o.value[n.value]), s = y(() => {
    var h;
    const u = [];
    (h = r.value) != null && h.dark && Wn(u, ":root", ["color-scheme: dark"]), Wn(u, ":root", au(r.value));
    for (const [g, S] of Object.entries(o.value))
      Wn(u, `.v-theme--${g}`, [`color-scheme: ${S.dark ? "dark" : "normal"}`, ...au(S)]);
    const c = [], m = [], v = new Set(Object.values(o.value).flatMap((g) => Object.keys(g.colors)));
    for (const g of v)
      /^on-[a-z]/.test(g) ? Wn(m, `.${g}`, [`color: rgb(var(--v-theme-${g})) !important`]) : (Wn(c, `.bg-${g}`, [`--v-theme-overlay-multiplier: var(--v-theme-${g}-overlay-multiplier)`, `background-color: rgb(var(--v-theme-${g})) !important`, `color: rgb(var(--v-theme-on-${g})) !important`]), Wn(m, `.text-${g}`, [`color: rgb(var(--v-theme-${g})) !important`]), Wn(m, `.border-${g}`, [`--v-border-color: var(--v-theme-${g})`]));
    return u.push(...c, ...m), u.map((g, S) => S === 0 ? g : `    ${g}`).join("");
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
        Re && he(s, () => {
          m.patch(l);
        });
      } else
        Re ? (c.addHeadObjs(y(l)), bn(() => c.updateDOM())) : c.addHeadObjs(l());
    else {
      let v = function() {
        if (typeof document < "u" && !m) {
          const h = document.createElement("style");
          h.type = "text/css", h.id = "vuetify-theme-stylesheet", t.cspNonce && h.setAttribute("nonce", t.cspNonce), m = h, document.head.appendChild(m);
        }
        m && (m.innerHTML = s.value);
      }, m = Re ? document.getElementById("vuetify-theme-stylesheet") : null;
      Re ? he(s, v, {
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
function at(e) {
  Ue("provideTheme");
  const t = He(co, null);
  if (!t) throw new Error("Could not find Vuetify theme injection");
  const n = y(() => e.theme ?? t.name.value), i = y(() => t.themes.value[n.value]), o = y(() => t.isDisabled ? void 0 : `v-theme--${n.value}`), r = {
    ...t,
    name: n,
    current: i,
    themeClasses: o
  };
  return ht(co, r), r;
}
function xd() {
  Ue("useTheme");
  const e = He(co, null);
  if (!e) throw new Error("Could not find Vuetify theme injection");
  return e;
}
function Wn(e, t, n) {
  e.push(`${t} {
`, ...n.map((i) => `  ${i};
`), `}
`);
}
function au(e) {
  const t = e.dark ? 2 : 1, n = e.dark ? 1 : 2, i = [];
  for (const [o, r] of Object.entries(e.colors)) {
    const s = Qt(r);
    i.push(`--v-theme-${o}: ${s.r},${s.g},${s.b}`), o.startsWith("on-") || i.push(`--v-theme-${o}-overlay-multiplier: ${Hg(r) > 0.18 ? t : n}`);
  }
  for (const [o, r] of Object.entries(e.variables)) {
    const s = typeof r == "string" && r.startsWith("#") ? Qt(r) : void 0, l = s ? `${s.r}, ${s.g}, ${s.b}` : void 0;
    i.push(`--v-${o}: ${l ?? r}`);
  }
  return i;
}
function Vd(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "content";
  const n = Os(), i = ce();
  if (Re) {
    const o = new ResizeObserver((r) => {
      r.length && (t === "content" ? i.value = r[0].contentRect : i.value = r[0].target.getBoundingClientRect());
    });
    yt(() => {
      o.disconnect();
    }), he(() => n.el, (r, s) => {
      s && (o.unobserve(s), i.value = void 0), r && o.observe(r);
    }, {
      flush: "post"
    });
  }
  return {
    resizeRef: n,
    contentRect: po(i)
  };
}
const vr = Symbol.for("vuetify:layout"), Od = Symbol.for("vuetify:layout-item"), uu = 1e3, iy = W({
  overlaps: {
    type: Array,
    default: () => []
  },
  fullHeight: Boolean
}, "layout"), Td = W({
  name: {
    type: String
  },
  order: {
    type: [Number, String],
    default: 0
  },
  absolute: Boolean
}, "layout-item");
function oy() {
  const e = He(vr);
  if (!e) throw new Error("[Vuetify] Could not find injected layout");
  return {
    getLayoutItem: e.getLayoutItem,
    mainRect: e.mainRect,
    mainStyles: e.mainStyles
  };
}
function Dd(e) {
  const t = He(vr);
  if (!t) throw new Error("[Vuetify] Could not find injected layout");
  const n = e.id ?? `layout-item-${Ln()}`, i = Ue("useLayoutItem");
  ht(Od, {
    id: n
  });
  const o = pe(!1);
  bc(() => o.value = !0), yc(() => o.value = !1);
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
const ry = (e, t, n, i) => {
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
function sy(e) {
  const t = He(vr, null), n = y(() => t ? t.rootZIndex.value - 100 : uu), i = ce([]), o = tt(/* @__PURE__ */ new Map()), r = tt(/* @__PURE__ */ new Map()), s = tt(/* @__PURE__ */ new Map()), l = tt(/* @__PURE__ */ new Map()), a = tt(/* @__PURE__ */ new Map()), {
    resizeRef: d,
    contentRect: u
  } = Vd(), c = y(() => {
    const N = /* @__PURE__ */ new Map(), $ = e.overlaps ?? [];
    for (const C of $.filter((V) => V.includes(":"))) {
      const [V, L] = C.split(":");
      if (!i.value.includes(V) || !i.value.includes(L)) continue;
      const A = o.get(V), E = o.get(L), D = r.get(V), B = r.get(L);
      !A || !E || !D || !B || (N.set(L, {
        position: A.value,
        amount: parseInt(D.value, 10)
      }), N.set(V, {
        position: E.value,
        amount: -parseInt(B.value, 10)
      }));
    }
    return N;
  }), m = y(() => {
    const N = [...new Set([...s.values()].map((C) => C.value))].sort((C, V) => C - V), $ = [];
    for (const C of N) {
      const V = i.value.filter((L) => {
        var A;
        return ((A = s.get(L)) == null ? void 0 : A.value) === C;
      });
      $.push(...V);
    }
    return ry($, o, r, l);
  }), v = y(() => !Array.from(a.values()).some((N) => N.value)), h = y(() => m.value[m.value.length - 1].layer), g = y(() => ({
    "--v-layout-left": re(h.value.left),
    "--v-layout-right": re(h.value.right),
    "--v-layout-top": re(h.value.top),
    "--v-layout-bottom": re(h.value.bottom),
    ...v.value ? void 0 : {
      transition: "none"
    }
  })), S = y(() => m.value.slice(1).map((N, $) => {
    let {
      id: C
    } = N;
    const {
      layer: V
    } = m.value[$], L = r.get(C), A = o.get(C);
    return {
      id: C,
      ...V,
      size: Number(L.value),
      position: A.value
    };
  })), k = (N) => S.value.find(($) => $.id === N), O = Ue("createLayout"), P = pe(!1);
  $n(() => {
    P.value = !0;
  }), ht(vr, {
    register: (N, $) => {
      let {
        id: C,
        order: V,
        position: L,
        layoutSize: A,
        elementSize: E,
        active: D,
        disableTransitions: B,
        absolute: Z
      } = $;
      s.set(C, V), o.set(C, L), r.set(C, A), l.set(C, D), B && a.set(C, B);
      const X = bi(Od, O == null ? void 0 : O.vnode).indexOf(N);
      X > -1 ? i.value.splice(X, 0, C) : i.value.push(C);
      const q = y(() => S.value.findIndex((ie) => ie.id === C)), be = y(() => n.value + m.value.length * 2 - q.value * 2), _e = y(() => {
        const ie = L.value === "left" || L.value === "right", Oe = L.value === "right", Qe = L.value === "bottom", et = E.value ?? A.value, Y = et === 0 ? "%" : "px", de = {
          [L.value]: 0,
          zIndex: be.value,
          transform: `translate${ie ? "X" : "Y"}(${(D.value ? 0 : -(et === 0 ? 100 : et)) * (Oe || Qe ? -1 : 1)}${Y})`,
          position: Z.value || n.value !== uu ? "absolute" : "fixed",
          ...v.value ? void 0 : {
            transition: "none"
          }
        };
        if (!P.value) return de;
        const $e = S.value[q.value];
        if (!$e) throw new Error(`[Vuetify] Could not find layout item "${C}"`);
        const ut = c.value.get(C);
        return ut && ($e[ut.position] += ut.amount), {
          ...de,
          height: ie ? `calc(100% - ${$e.top}px - ${$e.bottom}px)` : E.value ? `${E.value}px` : void 0,
          left: Oe ? void 0 : `${$e.left}px`,
          right: Oe ? `${$e.right}px` : void 0,
          top: L.value !== "bottom" ? `${$e.top}px` : void 0,
          bottom: L.value !== "top" ? `${$e.bottom}px` : void 0,
          width: ie ? E.value ? `${E.value}px` : void 0 : `calc(100% - ${$e.left}px - ${$e.right}px)`
        };
      }), me = y(() => ({
        zIndex: be.value - 1
      }));
      return {
        layoutItemStyles: _e,
        layoutItemScrimStyles: me,
        zIndex: be
      };
    },
    unregister: (N) => {
      s.delete(N), o.delete(N), r.delete(N), l.delete(N), a.delete(N), i.value = i.value.filter(($) => $ !== N);
    },
    mainRect: h,
    mainStyles: g,
    getLayoutItem: k,
    items: S,
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
    getLayoutItem: k,
    items: S,
    layoutRect: u,
    layoutRef: d
  };
}
function Pd() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const {
    blueprint: t,
    ...n
  } = e, i = kt(t, n), {
    aliases: o = {},
    components: r = {},
    directives: s = {}
  } = i, l = zg(i.defaults), a = Wp(i.display, i.ssr), d = ny(i.theme), u = Qp(i.icons), c = ep(i.locale), m = jp(i.date, c), v = qp(i.goTo, c);
  return {
    install: (g) => {
      for (const S in s)
        g.directive(S, s[S]);
      for (const S in r)
        g.component(S, r[S]);
      for (const S in o)
        g.component(S, Mi({
          ...o[S],
          name: S,
          aliasName: o[S].name
        }));
      if (d.install(g), g.provide(Di, l), g.provide(As, a), g.provide(co, d), g.provide(Is, u), g.provide(fr, c), g.provide(Hp, m.options), g.provide(tu, m.instance), g.provide(Gp, v), Re && i.ssr)
        if (g.$nuxt)
          g.$nuxt.hook("app:suspense:resolve", () => {
            a.update();
          });
        else {
          const {
            mount: S
          } = g;
          g.mount = function() {
            const k = S(...arguments);
            return At(() => a.update()), g.mount = S, k;
          };
        }
      Ln.reset(), g.mixin({
        computed: {
          $vuetify() {
            return tt({
              defaults: pi.call(this, Di),
              display: pi.call(this, As),
              theme: pi.call(this, co),
              icons: pi.call(this, Is),
              locale: pi.call(this, fr),
              date: pi.call(this, tu)
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
const ly = "3.7.4";
Pd.version = ly;
function pi(e) {
  var i, o;
  const t = this.$, n = ((i = t.parent) == null ? void 0 : i.provides) ?? ((o = t.vnode.appContext) == null ? void 0 : o.provides);
  if (n && e in n)
    return n[e];
}
const ay = Pd({
  theme: {
    defaultTheme: "light"
  }
}), uy = {
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
        credentials: "include",
        timeout: 1e4
        // 添加超时设置
      }, s = n + i;
      o !== void 0 && Object.assign(r, o);
      const l = new AbortController(), a = setTimeout(() => l.abort(), r.timeout || 1e4);
      return fetch(s, {
        ...r,
        signal: l.signal
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
function cy(e, t) {
  e.use(ay).use(uy, t);
}
const mi = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [i, o] of t)
    n[i] = o;
  return n;
}, dy = W({
  defaults: Object,
  disabled: Boolean,
  reset: [Number, String],
  root: [Boolean, String],
  scoped: Boolean
}, "VDefaultsProvider"), ot = le(!1)({
  name: "VDefaultsProvider",
  props: dy(),
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
    } = Xs(e);
    return $i(i, {
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
function wl(e) {
  return hl(() => {
    const t = [], n = {};
    if (e.value.background)
      if (Ds(e.value.background)) {
        if (n.backgroundColor = e.value.background, !e.value.text && Ig(e.value.background)) {
          const i = Qt(e.value.background);
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
function zt(e, t) {
  const n = y(() => ({
    text: Ie(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: i,
    colorStyles: o
  } = wl(n);
  return {
    textColorClasses: i,
    textColorStyles: o
  };
}
function Tt(e, t) {
  const n = y(() => ({
    background: Ie(e) ? e.value : t ? e[t] : null
  })), {
    colorClasses: i,
    colorStyles: o
  } = wl(n);
  return {
    backgroundColorClasses: i,
    backgroundColorStyles: o
  };
}
const fy = ["x-small", "small", "default", "large", "x-large"], $r = W({
  size: {
    type: [String, Number],
    default: "default"
  }
}, "size");
function Mr(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en();
  return hl(() => {
    let n, i;
    return lr(fy, e.size) ? n = `${t}--size-${e.size}` : e.size && (i = {
      width: re(e.size),
      height: re(e.size)
    }), {
      sizeClasses: n,
      sizeStyles: i
    };
  });
}
const ze = W({
  tag: {
    type: String,
    default: "div"
  }
}, "tag"), my = W({
  color: String,
  disabled: Boolean,
  start: Boolean,
  end: Boolean,
  icon: je,
  ...ye(),
  ...$r(),
  ...ze({
    tag: "i"
  }),
  ...Je()
}, "VIcon"), We = le()({
  name: "VIcon",
  props: my(),
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const o = ce(), {
      themeClasses: r
    } = at(e), {
      iconData: s
    } = ey(y(() => o.value || e.icon)), {
      sizeClasses: l
    } = Mr(e), {
      textColorClasses: a,
      textColorStyles: d
    } = zt(oe(e, "color"));
    return ge(() => {
      var m, v;
      const u = (m = i.default) == null ? void 0 : m.call(i);
      u && (o.value = (v = sd(u).filter((h) => h.type === fi && h.children && typeof h.children == "string")[0]) == null ? void 0 : v.children);
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
          fontSize: re(e.size),
          height: re(e.size),
          width: re(e.size)
        }, d.value, e.style],
        role: c ? "button" : void 0,
        "aria-hidden": !c,
        tabindex: c ? e.disabled ? -1 : 0 : void 0
      }, {
        default: () => [u]
      });
    }), {};
  }
}), _n = W({
  height: [Number, String],
  maxHeight: [Number, String],
  maxWidth: [Number, String],
  minHeight: [Number, String],
  minWidth: [Number, String],
  width: [Number, String]
}, "dimension");
function wn(e) {
  return {
    dimensionStyles: y(() => {
      const n = {}, i = re(e.height), o = re(e.maxHeight), r = re(e.maxWidth), s = re(e.minHeight), l = re(e.minWidth), a = re(e.width);
      return i != null && (n.height = i), o != null && (n.maxHeight = o), r != null && (n.maxWidth = r), s != null && (n.minHeight = s), l != null && (n.minWidth = l), a != null && (n.width = a), n;
    })
  };
}
function vy(e) {
  return {
    aspectStyles: y(() => {
      const t = Number(e.aspectRatio);
      return t ? {
        paddingBottom: String(1 / t * 100) + "%"
      } : void 0;
    })
  };
}
const Ad = W({
  aspectRatio: [String, Number],
  contentClass: null,
  inline: Boolean,
  ...ye(),
  ..._n()
}, "VResponsive"), cu = le()({
  name: "VResponsive",
  props: Ad(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      aspectStyles: i
    } = vy(e), {
      dimensionStyles: o
    } = wn(e);
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
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en();
  return {
    roundedClasses: y(() => {
      const i = Ie(e) ? e.value : e.rounded, o = Ie(e) ? e.value : e.tile, r = [];
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
const So = W({
  transition: {
    type: [Boolean, String, Object],
    default: "fade-transition",
    validator: (e) => e !== !0
  }
}, "transition"), dn = (e, t) => {
  let {
    slots: n
  } = t;
  const {
    transition: i,
    disabled: o,
    group: r,
    ...s
  } = e, {
    component: l = r ? dl : ci,
    ...a
  } = typeof i == "object" ? i : {};
  return Mn(l, ke(typeof i == "string" ? {
    name: o ? "" : i
  } : a, typeof i == "string" ? {} : Object.fromEntries(Object.entries({
    disabled: o,
    group: r
  }).filter((d) => {
    let [u, c] = d;
    return c !== void 0;
  })), s), n);
};
function hy(e, t) {
  if (!fl) return;
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
    o && (!n.quiet || d.init) && (!n.once || u || d.init) && o(u, l, a), u && n.once ? Id(e, t) : d.init = !0;
  }, r);
  e._observe = Object(e._observe), e._observe[t.instance.$.uid] = {
    init: !1,
    observer: s
  }, s.observe(e);
}
function Id(e, t) {
  var i;
  const n = (i = e._observe) == null ? void 0 : i[t.instance.$.uid];
  n && (n.observer.unobserve(e), delete e._observe[t.instance.$.uid]);
}
const $d = {
  mounted: hy,
  unmounted: Id
}, gy = W({
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
  ...Ad(),
  ...ye(),
  ...bt(),
  ...So()
}, "VImg"), Sl = le()({
  name: "VImg",
  directives: {
    intersect: $d
  },
  props: gy(),
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
    } = Tt(oe(e, "color")), {
      roundedClasses: s
    } = _t(e), l = Ue("VImg"), a = pe(""), d = ce(), u = pe(e.eager ? "loading" : "idle"), c = pe(), m = pe(), v = y(() => e.src && typeof e.src == "object" ? {
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
    he(() => e.src, () => {
      g(u.value !== "idle");
    }), he(h, (E, D) => {
      !E && D && d.value && M(d.value);
    }), nl(() => g());
    function g(E) {
      if (!(e.eager && E) && !(fl && !E && !e.eager)) {
        if (u.value = "loading", v.value.lazySrc) {
          const D = new Image();
          D.src = v.value.lazySrc, M(D, null);
        }
        v.value.src && At(() => {
          var D;
          n("loadstart", ((D = d.value) == null ? void 0 : D.currentSrc) || v.value.src), setTimeout(() => {
            var B;
            if (!l.isUnmounted)
              if ((B = d.value) != null && B.complete) {
                if (d.value.naturalWidth || k(), u.value === "error") return;
                h.value || M(d.value, null), u.value === "loading" && S();
              } else
                h.value || M(d.value), O();
          });
        });
      }
    }
    function S() {
      var E;
      l.isUnmounted || (O(), M(d.value), u.value = "loaded", n("load", ((E = d.value) == null ? void 0 : E.currentSrc) || v.value.src));
    }
    function k() {
      var E;
      l.isUnmounted || (u.value = "error", n("error", ((E = d.value) == null ? void 0 : E.currentSrc) || v.value.src));
    }
    function O() {
      const E = d.value;
      E && (a.value = E.currentSrc || E.src);
    }
    let P = -1;
    yt(() => {
      clearTimeout(P);
    });
    function M(E) {
      let D = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 100;
      const B = () => {
        if (clearTimeout(P), l.isUnmounted) return;
        const {
          naturalHeight: Z,
          naturalWidth: ee
        } = E;
        Z || ee ? (c.value = ee, m.value = Z) : !E.complete && u.value === "loading" && D != null ? P = window.setTimeout(B, D) : (E.currentSrc.endsWith(".svg") || E.currentSrc.startsWith("data:image/svg+xml")) && (c.value = 1, m.value = 1);
      };
      B();
    }
    const x = y(() => ({
      "v-img__img--cover": e.cover,
      "v-img__img--contain": !e.cover
    })), N = () => {
      var B;
      if (!v.value.src || u.value === "idle") return null;
      const E = f("img", {
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
        onLoad: S,
        onError: k
      }, null), D = (B = i.sources) == null ? void 0 : B.call(i);
      return f(dn, {
        transition: e.transition,
        appear: !0
      }, {
        default: () => [Nt(D ? f("picture", {
          class: "v-img__picture"
        }, [D, E]) : E, [[Fn, u.value === "loaded"]])]
      });
    }, $ = () => f(dn, {
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
    }), C = () => i.placeholder ? f(dn, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [(u.value === "loading" || u.value === "error" && !i.error) && f("div", {
        class: "v-img__placeholder"
      }, [i.placeholder()])]
    }) : null, V = () => i.error ? f(dn, {
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
    }, null) : null, A = pe(!1);
    {
      const E = he(h, (D) => {
        D && (requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            A.value = !0;
          });
        }), E());
      });
    }
    return ge(() => {
      const E = cu.filterProps(e);
      return Nt(f(cu, ke({
        class: ["v-img", {
          "v-img--absolute": e.absolute,
          "v-img--booting": !A.value
        }, o.value, s.value, e.class],
        style: [{
          width: re(e.width === "auto" ? c.value : e.width)
        }, r.value, e.style]
      }, E, {
        aspectRatio: h.value,
        "aria-label": e.alt,
        role: e.alt ? "img" : void 0
      }), {
        additional: () => f(Ne, null, [f(N, null, null), f($, null, null), f(L, null, null), f(C, null, null), f(V, null, null)]),
        default: i.default
      }), [[Ii("intersect"), {
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
}), Bn = W({
  border: [Boolean, Number, String]
}, "border");
function Rn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en();
  return {
    borderClasses: y(() => {
      const i = Ie(e) ? e.value : e.border, o = [];
      if (i === !0 || i === "")
        o.push(`${t}--border`);
      else if (typeof i == "string" || i === 0)
        for (const r of String(i).split(" "))
          o.push(`border-${r}`);
      return o;
    })
  };
}
const py = [null, "default", "comfortable", "compact"], nn = W({
  density: {
    type: String,
    default: "default",
    validator: (e) => py.includes(e)
  }
}, "density");
function Sn(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en();
  return {
    densityClasses: y(() => `${t}--density-${e.density}`)
  };
}
const yy = ["elevated", "flat", "tonal", "outlined", "text", "plain"];
function Eo(e, t) {
  return f(Ne, null, [e && f("span", {
    key: "overlay",
    class: `${t}__overlay`
  }, null), f("span", {
    key: "underlay",
    class: `${t}__underlay`
  }, null)]);
}
const vi = W({
  color: String,
  variant: {
    type: String,
    default: "elevated",
    validator: (e) => yy.includes(e)
  }
}, "variant");
function Co(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en();
  const n = y(() => {
    const {
      variant: r
    } = Jt(e);
    return `${t}--variant-${r}`;
  }), {
    colorClasses: i,
    colorStyles: o
  } = wl(y(() => {
    const {
      variant: r,
      color: s
    } = Jt(e);
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
const by = W({
  start: Boolean,
  end: Boolean,
  icon: je,
  image: String,
  text: String,
  ...Bn(),
  ...ye(),
  ...nn(),
  ...bt(),
  ...$r(),
  ...ze(),
  ...Je(),
  ...vi({
    variant: "flat"
  })
}, "VAvatar"), Pi = le()({
  name: "VAvatar",
  props: by(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: i
    } = at(e), {
      borderClasses: o
    } = Rn(e), {
      colorClasses: r,
      colorStyles: s,
      variantClasses: l
    } = Co(e), {
      densityClasses: a
    } = Sn(e), {
      roundedClasses: d
    } = _t(e), {
      sizeClasses: u,
      sizeStyles: c
    } = Mr(e);
    return ge(() => f(e.tag, {
      class: ["v-avatar", {
        "v-avatar--start": e.start,
        "v-avatar--end": e.end
      }, i.value, o.value, r.value, a.value, d.value, u.value, l.value, e.class],
      style: [s.value, c.value, e.style]
    }, {
      default: () => [n.default ? f(ot, {
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
      }) : e.image ? f(Sl, {
        key: "image",
        src: e.image,
        alt: "",
        cover: !0
      }, null) : e.icon ? f(We, {
        key: "icon",
        icon: e.icon
      }, null) : e.text, Eo(!1, "v-avatar")]
    })), {};
  }
}), En = W({
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
function Cn(e) {
  return {
    elevationClasses: y(() => {
      const n = Ie(e) ? e.value : e.elevation, i = [];
      return n == null || i.push(`elevation-${n}`), i;
    })
  };
}
const Md = W({
  baseColor: String,
  divided: Boolean,
  ...Bn(),
  ...ye(),
  ...nn(),
  ...En(),
  ...bt(),
  ...ze(),
  ...Je(),
  ...vi()
}, "VBtnGroup"), wi = le()({
  name: "VBtnGroup",
  props: Md(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      themeClasses: i
    } = at(e), {
      densityClasses: o
    } = Sn(e), {
      borderClasses: r
    } = Rn(e), {
      elevationClasses: s
    } = Cn(e), {
      roundedClasses: l
    } = _t(e);
    $i({
      VBtn: {
        height: "auto",
        baseColor: oe(e, "baseColor"),
        color: oe(e, "color"),
        density: oe(e, "density"),
        flat: !0,
        variant: oe(e, "variant")
      }
    }), ge(() => f(e.tag, {
      class: ["v-btn-group", {
        "v-btn-group--divided": e.divided
      }, i.value, r.value, o.value, s.value, l.value, e.class],
      style: e.style
    }, n));
  }
}), Fd = W({
  modelValue: {
    type: null,
    default: void 0
  },
  multiple: Boolean,
  mandatory: [Boolean, String],
  max: Number,
  selectedClass: String,
  disabled: Boolean
}, "group"), _y = W({
  value: null,
  disabled: Boolean,
  selectedClass: String
}, "group-item");
function wy(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !0;
  const i = Ue("useGroupItem");
  if (!i)
    throw new Error("[Vuetify] useGroupItem composable must be used inside a component setup function");
  const o = Ln();
  ht(Symbol.for(`${t.description}:id`), o);
  const r = He(t, null);
  if (!r) {
    if (!n) return r;
    throw new Error(`[Vuetify] Could not find useGroup injection with symbol ${t.description}`);
  }
  const s = oe(e, "value"), l = y(() => !!(r.disabled.value || e.disabled));
  r.register({
    id: o,
    value: s,
    disabled: l
  }, i), yt(() => {
    r.unregister(o);
  });
  const a = y(() => r.isSelected(o)), d = y(() => r.items.value[0].id === o), u = y(() => r.items.value[r.items.value.length - 1].id === o), c = y(() => a.value && [r.selectedClass.value, e.selectedClass]);
  return he(a, (m) => {
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
function Ld(e, t) {
  let n = !1;
  const i = tt([]), o = it(e, "modelValue", [], (m) => m == null ? [] : Bd(i, ii(m)), (m) => {
    const v = Ey(i, m);
    return e.multiple ? v : v[0];
  }), r = Ue("useGroup");
  function s(m, v) {
    const h = m, g = Symbol.for(`${t.description}:id`), k = bi(g, r == null ? void 0 : r.vnode).indexOf(v);
    Jt(h.value) == null && (h.value = k, h.useIndexAsValue = !0), k > -1 ? i.splice(k, 0, h) : i.push(h);
  }
  function l(m) {
    if (n) return;
    a();
    const v = i.findIndex((h) => h.id === m);
    i.splice(v, 1);
  }
  function a() {
    const m = i.find((v) => !v.disabled);
    m && e.mandatory === "force" && !o.value.length && (o.value = [m.id]);
  }
  $n(() => {
    a();
  }), yt(() => {
    n = !0;
  }), il(() => {
    for (let m = 0; m < i.length; m++)
      i[m].useIndexAsValue && (i[m].value = m);
  });
  function d(m, v) {
    const h = i.find((g) => g.id === m);
    if (!(v && (h != null && h.disabled)))
      if (e.multiple) {
        const g = o.value.slice(), S = g.findIndex((O) => O === m), k = ~S;
        if (v = v ?? !k, k && e.mandatory && g.length <= 1 || !k && e.max != null && g.length + 1 > e.max) return;
        S < 0 && v ? g.push(m) : S >= 0 && !v && g.splice(S, 1), o.value = g;
      } else {
        const g = o.value.includes(m);
        if (e.mandatory && g) return;
        o.value = v ?? !g ? [m] : [];
      }
  }
  function u(m) {
    if (e.multiple && fn('This method is not supported when using "multiple" prop'), o.value.length) {
      const v = o.value[0], h = i.findIndex((k) => k.id === v);
      let g = (h + m) % i.length, S = i[g];
      for (; S.disabled && g !== h; )
        g = (g + m) % i.length, S = i[g];
      if (S.disabled) return;
      o.value = [i[g].id];
    } else {
      const v = i.find((h) => !h.disabled);
      v && (o.value = [v.id]);
    }
  }
  const c = {
    register: s,
    unregister: l,
    selected: o,
    select: d,
    disabled: oe(e, "disabled"),
    prev: () => u(i.length - 1),
    next: () => u(1),
    isSelected: (m) => o.value.includes(m),
    selectedClass: y(() => e.selectedClass),
    items: y(() => i),
    getItemIndex: (m) => Sy(i, m)
  };
  return ht(t, c), c;
}
function Sy(e, t) {
  const n = Bd(e, [t]);
  return n.length ? e.findIndex((i) => i.id === n[0]) : -1;
}
function Bd(e, t) {
  const n = [];
  return t.forEach((i) => {
    const o = e.find((s) => Tr(i, s.value)), r = e[i];
    (o == null ? void 0 : o.value) != null ? n.push(o.id) : r != null && n.push(r.id);
  }), n;
}
function Ey(e, t) {
  const n = [];
  return t.forEach((i) => {
    const o = e.findIndex((r) => r.id === i);
    if (~o) {
      const r = e[o];
      n.push(r.value != null ? r.value : o);
    }
  }), n;
}
const El = Symbol.for("vuetify:v-btn-toggle"), Cy = W({
  ...Md(),
  ...Fd()
}, "VBtnToggle");
le()({
  name: "VBtnToggle",
  props: Cy(),
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
    } = Ld(e, El);
    return ge(() => {
      const a = wi.filterProps(e);
      return f(wi, ke({
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
function Rd(e, t) {
  const n = ce(), i = pe(!1);
  if (fl) {
    const o = new IntersectionObserver((r) => {
      i.value = !!r.find((s) => s.isIntersecting);
    }, t);
    yt(() => {
      o.disconnect();
    }), he(n, (r, s) => {
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
const ky = W({
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
  ...ye(),
  ...$r(),
  ...ze({
    tag: "div"
  }),
  ...Je()
}, "VProgressCircular"), Hd = le()({
  name: "VProgressCircular",
  props: ky(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = 20, o = 2 * Math.PI * i, r = ce(), {
      themeClasses: s
    } = at(e), {
      sizeClasses: l,
      sizeStyles: a
    } = Mr(e), {
      textColorClasses: d,
      textColorStyles: u
    } = zt(oe(e, "color")), {
      textColorClasses: c,
      textColorStyles: m
    } = zt(oe(e, "bgColor")), {
      intersectionRef: v,
      isIntersecting: h
    } = Rd(), {
      resizeRef: g,
      contentRect: S
    } = Vd(), k = y(() => Math.max(0, Math.min(100, parseFloat(e.modelValue)))), O = y(() => Number(e.width)), P = y(() => a.value ? Number(e.size) : S.value ? S.value.width : Math.max(O.value, 32)), M = y(() => i / (1 - O.value / P.value) * 2), x = y(() => O.value / P.value * M.value), N = y(() => re((100 - k.value) / 100 * o));
    return bn(() => {
      v.value = r.value, g.value = r.value;
    }), ge(() => f(e.tag, {
      ref: r,
      class: ["v-progress-circular", {
        "v-progress-circular--indeterminate": !!e.indeterminate,
        "v-progress-circular--visible": h.value,
        "v-progress-circular--disable-shrink": e.indeterminate === "disable-shrink"
      }, s.value, l.value, d.value, e.class],
      style: [a.value, u.value, e.style],
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
        value: k.value
      })])]
    })), {};
  }
}), du = {
  center: "center",
  top: "bottom",
  bottom: "top",
  left: "right",
  right: "left"
}, ko = W({
  location: String
}, "location");
function No(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, n = arguments.length > 2 ? arguments[2] : void 0;
  const {
    isRtl: i
  } = tn();
  return {
    locationStyles: y(() => {
      if (!e.location) return {};
      const {
        side: r,
        align: s
      } = Ts(e.location.split(" ").length > 1 ? e.location : `${e.location} center`, i.value);
      function l(d) {
        return n ? n(d) : 0;
      }
      const a = {};
      return r !== "center" && (t ? a[du[r]] = `calc(100% - ${l(r)}px)` : a[r] = 0), s !== "center" ? t ? a[du[s]] = `calc(100% - ${l(s)}px)` : a[s] = 0 : (r === "center" ? a.top = a.left = "50%" : a[{
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
const Ny = W({
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
  ...ye(),
  ...ko({
    location: "top"
  }),
  ...bt(),
  ...ze(),
  ...Je()
}, "VProgressLinear"), xy = le()({
  name: "VProgressLinear",
  props: Ny(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    var A;
    let {
      slots: n
    } = t;
    const i = it(e, "modelValue"), {
      isRtl: o,
      rtlClasses: r
    } = tn(), {
      themeClasses: s
    } = at(e), {
      locationStyles: l
    } = No(e), {
      textColorClasses: a,
      textColorStyles: d
    } = zt(e, "color"), {
      backgroundColorClasses: u,
      backgroundColorStyles: c
    } = Tt(y(() => e.bgColor || e.color)), {
      backgroundColorClasses: m,
      backgroundColorStyles: v
    } = Tt(y(() => e.bufferColor || e.bgColor || e.color)), {
      backgroundColorClasses: h,
      backgroundColorStyles: g
    } = Tt(e, "color"), {
      roundedClasses: S
    } = _t(e), {
      intersectionRef: k,
      isIntersecting: O
    } = Rd(), P = y(() => parseFloat(e.max)), M = y(() => parseFloat(e.height)), x = y(() => An(parseFloat(e.bufferValue) / P.value * 100, 0, 100)), N = y(() => An(parseFloat(i.value) / P.value * 100, 0, 100)), $ = y(() => o.value !== e.reverse), C = y(() => e.indeterminate ? "fade-transition" : "slide-x-transition"), V = Re && ((A = window.matchMedia) == null ? void 0 : A.call(window, "(forced-colors: active)").matches);
    function L(E) {
      if (!k.value) return;
      const {
        left: D,
        right: B,
        width: Z
      } = k.value.getBoundingClientRect(), ee = $.value ? Z - E.clientX + (B - Z) : E.clientX - D;
      i.value = Math.round(ee / Z * P.value);
    }
    return ge(() => f(e.tag, {
      ref: k,
      class: ["v-progress-linear", {
        "v-progress-linear--absolute": e.absolute,
        "v-progress-linear--active": e.active && O.value,
        "v-progress-linear--reverse": $.value,
        "v-progress-linear--rounded": e.rounded,
        "v-progress-linear--rounded-bar": e.roundedBar,
        "v-progress-linear--striped": e.striped
      }, S.value, s.value, r.value, e.class],
      style: [{
        bottom: e.location === "bottom" ? 0 : void 0,
        top: e.location === "top" ? 0 : void 0,
        height: e.active ? re(M.value) : 0,
        "--v-progress-linear-height": re(M.value),
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
          [$.value ? "left" : "right"]: re(-M.value),
          borderTop: `${re(M.value / 2)} dotted`,
          opacity: parseFloat(e.bufferOpacity),
          top: `calc(50% - ${re(M.value / 4)})`,
          width: re(100 - x.value, "%"),
          "--v-progress-linear-stream-to": re(M.value * ($.value ? 1 : -1))
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
          width: re(x.value, "%")
        }]
      }, null), f(ci, {
        name: C.value
      }, {
        default: () => [e.indeterminate ? f("div", {
          class: "v-progress-linear__indeterminate"
        }, [["long", "short"].map((E) => f("div", {
          key: E,
          class: ["v-progress-linear__indeterminate", E, V ? void 0 : h.value],
          style: g.value
        }, null))]) : f("div", {
          class: ["v-progress-linear__determinate", V ? void 0 : h.value],
          style: [g.value, {
            width: re(N.value, "%")
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
}), Cl = W({
  loading: [Boolean, String]
}, "loader");
function kl(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en();
  return {
    loaderClasses: y(() => ({
      [`${t}--loading`]: e.loading
    }))
  };
}
function jd(e, t) {
  var i;
  let {
    slots: n
  } = t;
  return f("div", {
    class: `${e.name}__loader`
  }, [((i = n.default) == null ? void 0 : i.call(n, {
    color: e.color,
    isActive: e.active
  })) || f(xy, {
    absolute: e.absolute,
    active: e.active,
    color: e.color,
    height: "2",
    indeterminate: !0
  }, null)]);
}
const Vy = ["static", "relative", "fixed", "absolute", "sticky"], Nl = W({
  position: {
    type: String,
    validator: (
      /* istanbul ignore next */
      (e) => Vy.includes(e)
    )
  }
}, "position");
function xl(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en();
  return {
    positionClasses: y(() => e.position ? `${t}--${e.position}` : void 0)
  };
}
function Oy() {
  const e = Ue("useRoute");
  return y(() => {
    var t;
    return (t = e == null ? void 0 : e.proxy) == null ? void 0 : t.$route;
  });
}
function Ty() {
  var e, t;
  return (t = (e = Ue("useRouter")) == null ? void 0 : e.proxy) == null ? void 0 : t.$router;
}
function Vl(e, t) {
  var c, m;
  const n = bv("RouterLink"), i = y(() => !!(e.href || e.to)), o = y(() => (i == null ? void 0 : i.value) || Ma(t, "click") || Ma(e, "click"));
  if (typeof n == "string" || !("useLink" in n)) {
    const v = oe(e, "href");
    return {
      isLink: i,
      isClickable: o,
      href: v,
      linkProps: tt({
        href: v
      })
    };
  }
  const r = y(() => ({
    ...e,
    to: oe(() => e.to || "")
  })), s = n.useLink(r.value), l = y(() => e.to ? s : void 0), a = Oy(), d = y(() => {
    var v, h, g;
    return l.value ? e.exact ? a.value ? ((g = l.value.isExactActive) == null ? void 0 : g.value) && Tr(l.value.route.value.query, a.value.query) : ((h = l.value.isExactActive) == null ? void 0 : h.value) ?? !1 : ((v = l.value.isActive) == null ? void 0 : v.value) ?? !1 : !1;
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
    linkProps: tt({
      href: u,
      "aria-current": y(() => d.value ? "page" : void 0)
    })
  };
}
const Ol = W({
  href: String,
  replace: Boolean,
  to: [String, Object],
  exact: Boolean
}, "router");
let is = !1;
function Dy(e, t) {
  let n = !1, i, o;
  Re && (At(() => {
    window.addEventListener("popstate", r), i = e == null ? void 0 : e.beforeEach((s, l, a) => {
      is ? n ? t(a) : a() : setTimeout(() => n ? t(a) : a()), is = !0;
    }), o = e == null ? void 0 : e.afterEach(() => {
      is = !1;
    });
  }), Ut(() => {
    window.removeEventListener("popstate", r), i == null || i(), o == null || o();
  }));
  function r(s) {
    var l;
    (l = s.state) != null && l.replaced || (n = !0, setTimeout(() => n = !1));
  }
}
function Py(e, t) {
  he(() => {
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
const $s = Symbol("rippleStop"), Ay = 80;
function fu(e, t) {
  e.style.transform = t, e.style.webkitTransform = t;
}
function Ms(e) {
  return e.constructor.name === "TouchEvent";
}
function zd(e) {
  return e.constructor.name === "KeyboardEvent";
}
const Iy = function(e, t) {
  var c;
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}, i = 0, o = 0;
  if (!zd(e)) {
    const m = t.getBoundingClientRect(), v = Ms(e) ? e.touches[e.touches.length - 1] : e;
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
}, hr = {
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
    } = Iy(e, t, n), c = `${r * 2}px`;
    o.className = "v-ripple__animation", o.style.width = c, o.style.height = c, t.appendChild(i);
    const m = window.getComputedStyle(t);
    m && m.position === "static" && (t.style.position = "relative", t.dataset.previousPosition = "static"), o.classList.add("v-ripple__animation--enter"), o.classList.add("v-ripple__animation--visible"), fu(o, `translate(${l}, ${a}) scale3d(${s},${s},${s})`), o.dataset.activated = String(performance.now()), setTimeout(() => {
      o.classList.remove("v-ripple__animation--enter"), o.classList.add("v-ripple__animation--in"), fu(o, `translate(${d}, ${u}) scale3d(1,1,1)`);
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
function Ud(e) {
  return typeof e > "u" || !!e;
}
function fo(e) {
  const t = {}, n = e.currentTarget;
  if (!(!(n != null && n._ripple) || n._ripple.touched || e[$s])) {
    if (e[$s] = !0, Ms(e))
      n._ripple.touched = !0, n._ripple.isTouch = !0;
    else if (n._ripple.isTouch) return;
    if (t.center = n._ripple.centered || zd(e), n._ripple.class && (t.class = n._ripple.class), Ms(e)) {
      if (n._ripple.showTimerCommit) return;
      n._ripple.showTimerCommit = () => {
        hr.show(e, n, t);
      }, n._ripple.showTimer = window.setTimeout(() => {
        var i;
        (i = n == null ? void 0 : n._ripple) != null && i.showTimerCommit && (n._ripple.showTimerCommit(), n._ripple.showTimerCommit = null);
      }, Ay);
    } else
      hr.show(e, n, t);
  }
}
function mu(e) {
  e[$s] = !0;
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
    }), hr.hide(t);
  }
}
function Wd(e) {
  const t = e.currentTarget;
  t != null && t._ripple && (t._ripple.showTimerCommit && (t._ripple.showTimerCommit = null), window.clearTimeout(t._ripple.showTimer));
}
let mo = !1;
function Kd(e) {
  !mo && (e.keyCode === Pa.enter || e.keyCode === Pa.space) && (mo = !0, fo(e));
}
function Gd(e) {
  mo = !1, Et(e);
}
function Yd(e) {
  mo && (mo = !1, Et(e));
}
function qd(e, t, n) {
  const {
    value: i,
    modifiers: o
  } = t, r = Ud(i);
  if (r || hr.hide(e), e._ripple = e._ripple ?? {}, e._ripple.enabled = r, e._ripple.centered = o.center, e._ripple.circle = o.circle, sg(i) && i.class && (e._ripple.class = i.class), r && !n) {
    if (o.stop) {
      e.addEventListener("touchstart", mu, {
        passive: !0
      }), e.addEventListener("mousedown", mu);
      return;
    }
    e.addEventListener("touchstart", fo, {
      passive: !0
    }), e.addEventListener("touchend", Et, {
      passive: !0
    }), e.addEventListener("touchmove", Wd, {
      passive: !0
    }), e.addEventListener("touchcancel", Et), e.addEventListener("mousedown", fo), e.addEventListener("mouseup", Et), e.addEventListener("mouseleave", Et), e.addEventListener("keydown", Kd), e.addEventListener("keyup", Gd), e.addEventListener("blur", Yd), e.addEventListener("dragstart", Et, {
      passive: !0
    });
  } else !r && n && Zd(e);
}
function Zd(e) {
  e.removeEventListener("mousedown", fo), e.removeEventListener("touchstart", fo), e.removeEventListener("touchend", Et), e.removeEventListener("touchmove", Wd), e.removeEventListener("touchcancel", Et), e.removeEventListener("mouseup", Et), e.removeEventListener("mouseleave", Et), e.removeEventListener("keydown", Kd), e.removeEventListener("keyup", Gd), e.removeEventListener("dragstart", Et), e.removeEventListener("blur", Yd);
}
function $y(e, t) {
  qd(e, t, !1);
}
function My(e) {
  delete e._ripple, Zd(e);
}
function Fy(e, t) {
  if (t.value === t.oldValue)
    return;
  const n = Ud(t.oldValue);
  qd(e, t, n);
}
const Fr = {
  mounted: $y,
  unmounted: My,
  updated: Fy
}, Ly = W({
  active: {
    type: Boolean,
    default: void 0
  },
  activeColor: String,
  baseColor: String,
  symbol: {
    type: null,
    default: El
  },
  flat: Boolean,
  icon: [Boolean, String, Function, Object],
  prependIcon: je,
  appendIcon: je,
  block: Boolean,
  readonly: Boolean,
  slim: Boolean,
  stacked: Boolean,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  text: String,
  ...Bn(),
  ...ye(),
  ...nn(),
  ..._n(),
  ...En(),
  ..._y(),
  ...Cl(),
  ...ko(),
  ...Nl(),
  ...bt(),
  ...Ol(),
  ...$r(),
  ...ze({
    tag: "button"
  }),
  ...Je(),
  ...vi({
    variant: "elevated"
  })
}, "VBtn"), ae = le()({
  name: "VBtn",
  props: Ly(),
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
    } = at(e), {
      borderClasses: r
    } = Rn(e), {
      densityClasses: s
    } = Sn(e), {
      dimensionStyles: l
    } = wn(e), {
      elevationClasses: a
    } = Cn(e), {
      loaderClasses: d
    } = kl(e), {
      locationStyles: u
    } = No(e), {
      positionClasses: c
    } = xl(e), {
      roundedClasses: m
    } = _t(e), {
      sizeClasses: v,
      sizeStyles: h
    } = Mr(e), g = wy(e, e.symbol, !1), S = Vl(e, n), k = y(() => {
      var A;
      return e.active !== void 0 ? e.active : S.isLink.value ? (A = S.isActive) == null ? void 0 : A.value : g == null ? void 0 : g.isSelected.value;
    }), O = y(() => k.value ? e.activeColor ?? e.color : e.color), P = y(() => {
      var E, D;
      return {
        color: (g == null ? void 0 : g.isSelected.value) && (!S.isLink.value || ((E = S.isActive) == null ? void 0 : E.value)) || !g || ((D = S.isActive) == null ? void 0 : D.value) ? O.value ?? e.baseColor : e.baseColor,
        variant: e.variant
      };
    }), {
      colorClasses: M,
      colorStyles: x,
      variantClasses: N
    } = Co(P), $ = y(() => (g == null ? void 0 : g.disabled.value) || e.disabled), C = y(() => e.variant === "elevated" && !(e.disabled || e.flat || e.border)), V = y(() => {
      if (!(e.value === void 0 || typeof e.value == "symbol"))
        return Object(e.value) === e.value ? JSON.stringify(e.value, null, 0) : e.value;
    });
    function L(A) {
      var E;
      $.value || S.isLink.value && (A.metaKey || A.ctrlKey || A.shiftKey || A.button !== 0 || n.target === "_blank") || ((E = S.navigate) == null || E.call(S, A), g == null || g.toggle());
    }
    return Py(S, g == null ? void 0 : g.select), ge(() => {
      const A = S.isLink.value ? "a" : e.tag, E = !!(e.prependIcon || i.prepend), D = !!(e.appendIcon || i.append), B = !!(e.icon && e.icon !== !0);
      return Nt(f(A, ke({
        type: A === "a" ? void 0 : "button",
        class: ["v-btn", g == null ? void 0 : g.selectedClass.value, {
          "v-btn--active": k.value,
          "v-btn--block": e.block,
          "v-btn--disabled": $.value,
          "v-btn--elevated": C.value,
          "v-btn--flat": e.flat,
          "v-btn--icon": !!e.icon,
          "v-btn--loading": e.loading,
          "v-btn--readonly": e.readonly,
          "v-btn--slim": e.slim,
          "v-btn--stacked": e.stacked
        }, o.value, r.value, M.value, s.value, a.value, d.value, c.value, m.value, v.value, N.value, e.class],
        style: [x.value, l.value, u.value, h.value, e.style],
        "aria-busy": e.loading ? !0 : void 0,
        disabled: $.value || void 0,
        tabindex: e.loading || e.readonly ? -1 : void 0,
        onClick: L,
        value: V.value
      }, S.linkProps), {
        default: () => {
          var Z;
          return [Eo(!0, "v-btn"), !e.icon && E && f("span", {
            key: "prepend",
            class: "v-btn__prepend"
          }, [i.prepend ? f(ot, {
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
          }, null) : f(ot, {
            key: "content-defaults",
            disabled: !B,
            defaults: {
              VIcon: {
                icon: e.icon
              }
            }
          }, {
            default: () => {
              var ee;
              return [((ee = i.default) == null ? void 0 : ee.call(i)) ?? e.text];
            }
          })]), !e.icon && D && f("span", {
            key: "append",
            class: "v-btn__append"
          }, [i.append ? f(ot, {
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
          }, [((Z = i.loader) == null ? void 0 : Z.call(i)) ?? f(Hd, {
            color: typeof e.loading == "boolean" ? void 0 : e.loading,
            indeterminate: !0,
            width: "2"
          }, null)])];
        }
      }), [[Fr, !$.value && e.ripple, "", {
        center: !!e.icon
      }]]);
    }), {
      group: g
    };
  }
}), xi = le()({
  name: "VCardActions",
  props: ye(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return $i({
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
}), By = W({
  opacity: [Number, String],
  ...ye(),
  ...ze()
}, "VCardSubtitle"), Ry = le()({
  name: "VCardSubtitle",
  props: By(),
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
}), Si = Dr("v-card-title"), Hy = W({
  appendAvatar: String,
  appendIcon: je,
  prependAvatar: String,
  prependIcon: je,
  subtitle: [String, Number],
  title: [String, Number],
  ...ye(),
  ...nn()
}, "VCardItem"), Xd = le()({
  name: "VCardItem",
  props: Hy(),
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
      }, [n.prepend ? f(ot, {
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
      }, n.prepend) : f(Ne, null, [e.prependAvatar && f(Pi, {
        key: "prepend-avatar",
        density: e.density,
        image: e.prependAvatar
      }, null), e.prependIcon && f(We, {
        key: "prepend-icon",
        density: e.density,
        icon: e.prependIcon
      }, null)])]), f("div", {
        class: "v-card-item__content"
      }, [l && f(Si, {
        key: "title"
      }, {
        default: () => {
          var u;
          return [((u = n.title) == null ? void 0 : u.call(n)) ?? e.title];
        }
      }), a && f(Ry, {
        key: "subtitle"
      }, {
        default: () => {
          var u;
          return [((u = n.subtitle) == null ? void 0 : u.call(n)) ?? e.subtitle];
        }
      }), (d = n.default) == null ? void 0 : d.call(n)]), s && f("div", {
        key: "append",
        class: "v-card-item__append"
      }, [n.append ? f(ot, {
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
      }, n.append) : f(Ne, null, [e.appendIcon && f(We, {
        key: "append-icon",
        density: e.density,
        icon: e.appendIcon
      }, null), e.appendAvatar && f(Pi, {
        key: "append-avatar",
        density: e.density,
        image: e.appendAvatar
      }, null)])])]);
    }), {};
  }
}), jy = W({
  opacity: [Number, String],
  ...ye(),
  ...ze()
}, "VCardText"), Vi = le()({
  name: "VCardText",
  props: jy(),
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
}), zy = W({
  appendAvatar: String,
  appendIcon: je,
  disabled: Boolean,
  flat: Boolean,
  hover: Boolean,
  image: String,
  link: {
    type: Boolean,
    default: void 0
  },
  prependAvatar: String,
  prependIcon: je,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  subtitle: [String, Number],
  text: [String, Number],
  title: [String, Number],
  ...Bn(),
  ...ye(),
  ...nn(),
  ..._n(),
  ...En(),
  ...Cl(),
  ...ko(),
  ...Nl(),
  ...bt(),
  ...Ol(),
  ...ze(),
  ...Je(),
  ...vi({
    variant: "elevated"
  })
}, "VCard"), Ft = le()({
  name: "VCard",
  directives: {
    Ripple: Fr
  },
  props: zy(),
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const {
      themeClasses: o
    } = at(e), {
      borderClasses: r
    } = Rn(e), {
      colorClasses: s,
      colorStyles: l,
      variantClasses: a
    } = Co(e), {
      densityClasses: d
    } = Sn(e), {
      dimensionStyles: u
    } = wn(e), {
      elevationClasses: c
    } = Cn(e), {
      loaderClasses: m
    } = kl(e), {
      locationStyles: v
    } = No(e), {
      positionClasses: h
    } = xl(e), {
      roundedClasses: g
    } = _t(e), S = Vl(e, n), k = y(() => e.link !== !1 && S.isLink.value), O = y(() => !e.disabled && e.link !== !1 && (e.link || S.isClickable.value));
    return ge(() => {
      const P = k.value ? "a" : e.tag, M = !!(i.title || e.title != null), x = !!(i.subtitle || e.subtitle != null), N = M || x, $ = !!(i.append || e.appendAvatar || e.appendIcon), C = !!(i.prepend || e.prependAvatar || e.prependIcon), V = !!(i.image || e.image), L = N || C || $, A = !!(i.text || e.text != null);
      return Nt(f(P, ke({
        class: ["v-card", {
          "v-card--disabled": e.disabled,
          "v-card--flat": e.flat,
          "v-card--hover": e.hover && !(e.disabled || e.flat),
          "v-card--link": O.value
        }, o.value, r.value, s.value, d.value, c.value, m.value, h.value, g.value, a.value, e.class],
        style: [l.value, u.value, v.value, e.style],
        onClick: O.value && S.navigate,
        tabindex: e.disabled ? -1 : void 0
      }, S.linkProps), {
        default: () => {
          var E;
          return [V && f("div", {
            key: "image",
            class: "v-card__image"
          }, [i.image ? f(ot, {
            key: "image-defaults",
            disabled: !e.image,
            defaults: {
              VImg: {
                cover: !0,
                src: e.image
              }
            }
          }, i.image) : f(Sl, {
            key: "image-img",
            cover: !0,
            src: e.image
          }, null)]), f(jd, {
            name: "v-card",
            active: !!e.loading,
            color: typeof e.loading == "boolean" ? void 0 : e.loading
          }, {
            default: i.loader
          }), L && f(Xd, {
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
          }), A && f(Vi, {
            key: "text"
          }, {
            default: () => {
              var D;
              return [((D = i.text) == null ? void 0 : D.call(i)) ?? e.text];
            }
          }), (E = i.default) == null ? void 0 : E.call(i), i.actions && f(xi, null, {
            default: i.actions
          }), Eo(O.value, "v-card")];
        }
      }), [[Ii("ripple"), O.value && e.ripple]]);
    }), {};
  }
}), Uy = W({
  color: String,
  inset: Boolean,
  length: [Number, String],
  opacity: [Number, String],
  thickness: [Number, String],
  vertical: Boolean,
  ...ye(),
  ...Je()
}, "VDivider"), mn = le()({
  name: "VDivider",
  props: Uy(),
  setup(e, t) {
    let {
      attrs: n,
      slots: i
    } = t;
    const {
      themeClasses: o
    } = at(e), {
      textColorClasses: r,
      textColorStyles: s
    } = zt(oe(e, "color")), l = y(() => {
      const a = {};
      return e.length && (a[e.vertical ? "height" : "width"] = re(e.length)), e.thickness && (a[e.vertical ? "borderRightWidth" : "borderTopWidth"] = re(e.thickness)), a;
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
}), Jd = Ar.reduce((e, t) => (e[t] = {
  type: [Boolean, String, Number],
  default: !1
}, e), {}), Qd = Ar.reduce((e, t) => {
  const n = "offset" + Dt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), ef = Ar.reduce((e, t) => {
  const n = "order" + Dt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), vu = {
  col: Object.keys(Jd),
  offset: Object.keys(Qd),
  order: Object.keys(ef)
};
function Wy(e, t, n) {
  let i = e;
  if (!(n == null || n === !1)) {
    if (t) {
      const o = t.replace(e, "");
      i += `-${o}`;
    }
    return e === "col" && (i = "v-" + i), e === "col" && (n === "" || n === !0) || (i += `-${n}`), i.toLowerCase();
  }
}
const Ky = ["auto", "start", "end", "center", "baseline", "stretch"], Gy = W({
  cols: {
    type: [Boolean, String, Number],
    default: !1
  },
  ...Jd,
  offset: {
    type: [String, Number],
    default: null
  },
  ...Qd,
  order: {
    type: [String, Number],
    default: null
  },
  ...ef,
  alignSelf: {
    type: String,
    default: null,
    validator: (e) => Ky.includes(e)
  },
  ...ye(),
  ...ze()
}, "VCol"), xe = le()({
  name: "VCol",
  props: Gy(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => {
      const o = [];
      let r;
      for (r in vu)
        vu[r].forEach((l) => {
          const a = e[l], d = Wy(r, l, a);
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
      return Mn(e.tag, {
        class: [i.value, e.class],
        style: e.style
      }, (o = n.default) == null ? void 0 : o.call(n));
    };
  }
}), Tl = ["start", "end", "center"], tf = ["space-between", "space-around", "space-evenly"];
function Dl(e, t) {
  return Ar.reduce((n, i) => {
    const o = e + Dt(i);
    return n[o] = t(), n;
  }, {});
}
const Yy = [...Tl, "baseline", "stretch"], nf = (e) => Yy.includes(e), of = Dl("align", () => ({
  type: String,
  default: null,
  validator: nf
})), qy = [...Tl, ...tf], rf = (e) => qy.includes(e), sf = Dl("justify", () => ({
  type: String,
  default: null,
  validator: rf
})), Zy = [...Tl, ...tf, "stretch"], lf = (e) => Zy.includes(e), af = Dl("alignContent", () => ({
  type: String,
  default: null,
  validator: lf
})), hu = {
  align: Object.keys(of),
  justify: Object.keys(sf),
  alignContent: Object.keys(af)
}, Xy = {
  align: "align",
  justify: "justify",
  alignContent: "align-content"
};
function Jy(e, t, n) {
  let i = Xy[e];
  if (n != null) {
    if (t) {
      const o = t.replace(e, "");
      i += `-${o}`;
    }
    return i += `-${n}`, i.toLowerCase();
  }
}
const Qy = W({
  dense: Boolean,
  noGutters: Boolean,
  align: {
    type: String,
    default: null,
    validator: nf
  },
  ...of,
  justify: {
    type: String,
    default: null,
    validator: rf
  },
  ...sf,
  alignContent: {
    type: String,
    default: null,
    validator: lf
  },
  ...af,
  ...ye(),
  ...ze()
}, "VRow"), Mt = le()({
  name: "VRow",
  props: Qy(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => {
      const o = [];
      let r;
      for (r in hu)
        hu[r].forEach((s) => {
          const l = e[s], a = Jy(r, s, l);
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
      return Mn(e.tag, {
        class: ["v-row", i.value, e.class],
        style: e.style
      }, (o = n.default) == null ? void 0 : o.call(n));
    };
  }
}), uf = Dr("v-spacer", "div", "VSpacer"), eb = W({
  disabled: Boolean,
  group: Boolean,
  hideOnLeave: Boolean,
  leaveAbsolute: Boolean,
  mode: String,
  origin: String
}, "transition");
function xt(e, t, n) {
  return le()({
    name: e,
    props: eb({
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
        const l = i.group ? dl : ci;
        return Mn(l, {
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
function cf(e, t) {
  let n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : "in-out";
  return le()({
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
      const s = i.group ? dl : ci;
      return () => Mn(s, {
        name: i.disabled ? "" : e,
        css: !i.disabled,
        // mode: props.mode, // TODO: vuejs/vue-next#3104
        ...i.disabled ? {} : t
      }, r.default);
    }
  });
}
function df() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  const n = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1) ? "width" : "height", i = nt(`offset-${n}`);
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
const tb = W({
  target: [Object, Array]
}, "v-dialog-transition"), nb = le()({
  name: "VDialogTransition",
  props: tb(),
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
        } = pu(e.target, o), c = _i(o, [{
          transform: `translate(${s}px, ${l}px) scale(${a}, ${d})`,
          opacity: 0
        }, {}], {
          duration: 225 * u,
          easing: Kg
        });
        (m = gu(o)) == null || m.forEach((v) => {
          _i(v, [{
            opacity: 0
          }, {
            opacity: 0,
            offset: 0.33
          }, {}], {
            duration: 225 * 2 * u,
            easing: cr
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
        } = pu(e.target, o);
        _i(o, [{}, {
          transform: `translate(${s}px, ${l}px) scale(${a}, ${d})`,
          opacity: 0
        }], {
          duration: 125 * u,
          easing: Gg
        }).finished.then(() => r()), (m = gu(o)) == null || m.forEach((v) => {
          _i(v, [{}, {
            opacity: 0,
            offset: 0.2
          }, {
            opacity: 0
          }], {
            duration: 125 * 2 * u,
            easing: cr
          });
        });
      },
      onAfterLeave(o) {
        o.style.removeProperty("pointer-events");
      }
    };
    return () => e.target ? f(ci, ke({
      name: "dialog-transition"
    }, i, {
      css: !1
    }), n) : f(ci, {
      name: "dialog-transition"
    }, n);
  }
});
function gu(e) {
  var n;
  const t = (n = e.querySelector(":scope > .v-card, :scope > .v-sheet, :scope > .v-list")) == null ? void 0 : n.children;
  return t && [...t];
}
function pu(e, t) {
  const n = dd(e), i = gl(t), [o, r] = getComputedStyle(t).transformOrigin.split(" ").map((k) => parseFloat(k)), [s, l] = getComputedStyle(t).getPropertyValue("--v-overlay-anchor-origin").split(" ");
  let a = n.left + n.width / 2;
  s === "left" || l === "left" ? a -= n.width / 2 : (s === "right" || l === "right") && (a += n.width / 2);
  let d = n.top + n.height / 2;
  s === "top" || l === "top" ? d -= n.height / 2 : (s === "bottom" || l === "bottom") && (d += n.height / 2);
  const u = n.width / i.width, c = n.height / i.height, m = Math.max(1, u, c), v = u / m || 0, h = c / m || 0, g = i.width * i.height / (window.innerWidth * window.innerHeight), S = g > 0.12 ? Math.min(1.5, (g - 0.12) * 10 + 1) : 1;
  return {
    x: a - (o + i.left),
    y: d - (r + i.top),
    sx: v,
    sy: h,
    speed: S
  };
}
xt("fab-transition", "center center", "out-in");
xt("dialog-bottom-transition");
xt("dialog-top-transition");
xt("fade-transition");
const ib = xt("scale-transition");
xt("scroll-x-transition");
xt("scroll-x-reverse-transition");
xt("scroll-y-transition");
xt("scroll-y-reverse-transition");
xt("slide-x-transition");
xt("slide-x-reverse-transition");
const ff = xt("slide-y-transition");
xt("slide-y-reverse-transition");
const mf = cf("expand-transition", df()), ob = cf("expand-x-transition", df("", !0)), Fs = Symbol.for("vuetify:list");
function vf() {
  const e = He(Fs, {
    hasPrepend: pe(!1),
    updateHasPrepend: () => null
  }), t = {
    hasPrepend: pe(!1),
    updateHasPrepend: (n) => {
      n && (t.hasPrepend.value = n);
    }
  };
  return ht(Fs, t), e;
}
function hf() {
  return He(Fs, null);
}
const Pl = (e) => {
  const t = {
    activate: (n) => {
      let {
        id: i,
        value: o,
        activated: r
      } = n;
      return i = Q(i), e && !o && r.size === 1 && r.has(i) || (o ? r.add(i) : r.delete(i)), r;
    },
    in: (n, i, o) => {
      let r = /* @__PURE__ */ new Set();
      if (n != null)
        for (const s of ii(n))
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
  const t = Pl(e);
  return {
    activate: (i) => {
      let {
        activated: o,
        id: r,
        ...s
      } = i;
      r = Q(r);
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
        const l = ii(i);
        l.length && (s = t.in(l.slice(0, 1), o, r));
      }
      return s;
    },
    out: (i, o, r) => t.out(i, o, r)
  };
}, rb = (e) => {
  const t = Pl(e);
  return {
    activate: (i) => {
      let {
        id: o,
        activated: r,
        children: s,
        ...l
      } = i;
      return o = Q(o), s.has(o) ? r : t.activate({
        id: o,
        activated: r,
        children: s,
        ...l
      });
    },
    in: t.in,
    out: t.out
  };
}, sb = (e) => {
  const t = gf(e);
  return {
    activate: (i) => {
      let {
        id: o,
        activated: r,
        children: s,
        ...l
      } = i;
      return o = Q(o), s.has(o) ? r : t.activate({
        id: o,
        activated: r,
        children: s,
        ...l
      });
    },
    in: t.in,
    out: t.out
  };
}, lb = {
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
}, pf = {
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
}, ab = {
  open: pf.open,
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
}, Al = (e) => {
  const t = {
    select: (n) => {
      let {
        id: i,
        value: o,
        selected: r
      } = n;
      if (i = Q(i), e && !o) {
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
}, yf = (e) => {
  const t = Al(e);
  return {
    select: (i) => {
      let {
        selected: o,
        id: r,
        ...s
      } = i;
      r = Q(r);
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
}, ub = (e) => {
  const t = Al(e);
  return {
    select: (i) => {
      let {
        id: o,
        selected: r,
        children: s,
        ...l
      } = i;
      return o = Q(o), s.has(o) ? r : t.select({
        id: o,
        selected: r,
        children: s,
        ...l
      });
    },
    in: t.in,
    out: t.out
  };
}, cb = (e) => {
  const t = yf(e);
  return {
    select: (i) => {
      let {
        id: o,
        selected: r,
        children: s,
        ...l
      } = i;
      return o = Q(o), s.has(o) ? r : t.select({
        id: o,
        selected: r,
        children: s,
        ...l
      });
    },
    in: t.in,
    out: t.out
  };
}, db = (e) => {
  const t = {
    select: (n) => {
      let {
        id: i,
        value: o,
        selected: r,
        children: s,
        parents: l
      } = n;
      i = Q(i);
      const a = new Map(r), d = [i];
      for (; d.length; ) {
        const c = d.shift();
        r.set(Q(c), o ? "on" : "off"), s.has(c) && d.push(...s.get(c));
      }
      let u = Q(l.get(i));
      for (; u; ) {
        const c = s.get(u), m = c.every((h) => r.get(Q(h)) === "on"), v = c.every((h) => !r.has(Q(h)) || r.get(Q(h)) === "off");
        r.set(u, m ? "on" : v ? "off" : "indeterminate"), u = Q(l.get(u));
      }
      return e && !o && Array.from(r.entries()).reduce((m, v) => {
        let [h, g] = v;
        return g === "on" && m.push(h), m;
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
}, vo = Symbol.for("vuetify:nested"), bf = {
  id: pe(),
  root: {
    register: () => null,
    unregister: () => null,
    parents: ce(/* @__PURE__ */ new Map()),
    children: ce(/* @__PURE__ */ new Map()),
    open: () => null,
    openOnSelect: () => null,
    activate: () => null,
    select: () => null,
    activatable: ce(!1),
    selectable: ce(!1),
    opened: ce(/* @__PURE__ */ new Set()),
    activated: ce(/* @__PURE__ */ new Set()),
    selected: ce(/* @__PURE__ */ new Map()),
    selectedValues: ce([]),
    getPath: () => []
  }
}, fb = W({
  activatable: Boolean,
  selectable: Boolean,
  activeStrategy: [String, Function, Object],
  selectStrategy: [String, Function, Object],
  openStrategy: [String, Object],
  opened: null,
  activated: null,
  selected: null,
  mandatory: Boolean
}, "nested"), mb = (e) => {
  let t = !1;
  const n = ce(/* @__PURE__ */ new Map()), i = ce(/* @__PURE__ */ new Map()), o = it(e, "opened", e.opened, (h) => new Set(h), (h) => [...h.values()]), r = y(() => {
    if (typeof e.activeStrategy == "object") return e.activeStrategy;
    if (typeof e.activeStrategy == "function") return e.activeStrategy(e.mandatory);
    switch (e.activeStrategy) {
      case "leaf":
        return rb(e.mandatory);
      case "single-leaf":
        return sb(e.mandatory);
      case "independent":
        return Pl(e.mandatory);
      case "single-independent":
      default:
        return gf(e.mandatory);
    }
  }), s = y(() => {
    if (typeof e.selectStrategy == "object") return e.selectStrategy;
    if (typeof e.selectStrategy == "function") return e.selectStrategy(e.mandatory);
    switch (e.selectStrategy) {
      case "single-leaf":
        return cb(e.mandatory);
      case "leaf":
        return ub(e.mandatory);
      case "independent":
        return Al(e.mandatory);
      case "single-independent":
        return yf(e.mandatory);
      case "classic":
      default:
        return db(e.mandatory);
    }
  }), l = y(() => {
    if (typeof e.openStrategy == "object") return e.openStrategy;
    switch (e.openStrategy) {
      case "list":
        return ab;
      case "single":
        return lb;
      case "multiple":
      default:
        return pf;
    }
  }), a = it(e, "activated", e.activated, (h) => r.value.in(h, n.value, i.value), (h) => r.value.out(h, n.value, i.value)), d = it(e, "selected", e.selected, (h) => s.value.in(h, n.value, i.value), (h) => s.value.out(h, n.value, i.value));
  yt(() => {
    t = !0;
  });
  function u(h) {
    const g = [];
    let S = h;
    for (; S != null; )
      g.unshift(S), S = i.value.get(S);
    return g;
  }
  const c = Ue("nested"), m = /* @__PURE__ */ new Set(), v = {
    id: pe(),
    root: {
      opened: o,
      activatable: oe(e, "activatable"),
      selectable: oe(e, "selectable"),
      activated: a,
      selected: d,
      selectedValues: y(() => {
        const h = [];
        for (const [g, S] of d.value.entries())
          S === "on" && h.push(g);
        return h;
      }),
      register: (h, g, S) => {
        if (m.has(h)) {
          const k = u(h).map(String).join(" -> "), O = u(g).concat(h).map(String).join(" -> ");
          ar(`Multiple nodes with the same ID
	${k}
	${O}`);
          return;
        } else
          m.add(h);
        g && h !== g && i.value.set(h, g), S && n.value.set(h, []), g != null && n.value.set(g, [...n.value.get(g) || [], h]);
      },
      unregister: (h) => {
        if (t) return;
        m.delete(h), n.value.delete(h);
        const g = i.value.get(h);
        if (g) {
          const S = n.value.get(g) ?? [];
          n.value.set(g, S.filter((k) => k !== h));
        }
        i.value.delete(h);
      },
      open: (h, g, S) => {
        c.emit("click:open", {
          id: h,
          value: g,
          path: u(h),
          event: S
        });
        const k = l.value.open({
          id: h,
          value: g,
          opened: new Set(o.value),
          children: n.value,
          parents: i.value,
          event: S
        });
        k && (o.value = k);
      },
      openOnSelect: (h, g, S) => {
        const k = l.value.select({
          id: h,
          value: g,
          selected: new Map(d.value),
          opened: new Set(o.value),
          children: n.value,
          parents: i.value,
          event: S
        });
        k && (o.value = k);
      },
      select: (h, g, S) => {
        c.emit("click:select", {
          id: h,
          value: g,
          path: u(h),
          event: S
        });
        const k = s.value.select({
          id: h,
          value: g,
          selected: new Map(d.value),
          children: n.value,
          parents: i.value,
          event: S
        });
        k && (d.value = k), v.root.openOnSelect(h, g, S);
      },
      activate: (h, g, S) => {
        if (!e.activatable)
          return v.root.select(h, !0, S);
        c.emit("click:activate", {
          id: h,
          value: g,
          path: u(h),
          event: S
        });
        const k = r.value.activate({
          id: h,
          value: g,
          activated: new Set(a.value),
          children: n.value,
          parents: i.value,
          event: S
        });
        k && (a.value = k);
      },
      children: n,
      parents: i,
      getPath: u
    }
  };
  return ht(vo, v), v.root;
}, _f = (e, t) => {
  const n = He(vo, bf), i = Symbol(Ln()), o = y(() => e.value !== void 0 ? e.value : i), r = {
    ...n,
    id: o,
    open: (s, l) => n.root.open(o.value, s, l),
    openOnSelect: (s, l) => n.root.openOnSelect(o.value, s, l),
    isOpen: y(() => n.root.opened.value.has(o.value)),
    parent: y(() => n.root.parents.value.get(o.value)),
    activate: (s, l) => n.root.activate(o.value, s, l),
    isActivated: y(() => n.root.activated.value.has(Q(o.value))),
    select: (s, l) => n.root.select(o.value, s, l),
    isSelected: y(() => n.root.selected.value.get(Q(o.value)) === "on"),
    isIndeterminate: y(() => n.root.selected.value.get(o.value) === "indeterminate"),
    isLeaf: y(() => !n.root.children.value.get(o.value)),
    isGroupActivator: n.isGroupActivator
  };
  return !n.isGroupActivator && n.root.register(o.value, n.id.value, t), yt(() => {
    !n.isGroupActivator && n.root.unregister(o.value);
  }), t && ht(vo, r), r;
}, vb = () => {
  const e = He(vo, bf);
  ht(vo, {
    ...e,
    isGroupActivator: !0
  });
};
function Lr() {
  const e = pe(!1);
  return $n(() => {
    window.requestAnimationFrame(() => {
      e.value = !0;
    });
  }), {
    ssrBootStyles: y(() => e.value ? void 0 : {
      transition: "none !important"
    }),
    isBooted: po(e)
  };
}
const hb = Mi({
  name: "VListGroupActivator",
  setup(e, t) {
    let {
      slots: n
    } = t;
    return vb(), () => {
      var i;
      return (i = n.default) == null ? void 0 : i.call(n);
    };
  }
}), gb = W({
  /* @deprecated */
  activeColor: String,
  baseColor: String,
  color: String,
  collapseIcon: {
    type: je,
    default: "$collapse"
  },
  expandIcon: {
    type: je,
    default: "$expand"
  },
  prependIcon: je,
  appendIcon: je,
  fluid: Boolean,
  subgroup: Boolean,
  title: String,
  value: null,
  ...ye(),
  ...ze()
}, "VListGroup"), gr = le()({
  name: "VListGroup",
  props: gb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isOpen: i,
      open: o,
      id: r
    } = _f(oe(e, "value"), !0), s = y(() => `v-list-group--id-${String(r.value)}`), l = hf(), {
      isBooted: a
    } = Lr();
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
      default: () => [n.activator && f(ot, {
        defaults: m.value
      }, {
        default: () => [f(hb, null, {
          default: () => [n.activator({
            props: u.value,
            isOpen: i.value
          })]
        })]
      }), f(dn, {
        transition: {
          component: mf
        },
        disabled: !a.value
      }, {
        default: () => {
          var v;
          return [Nt(f("div", {
            class: "v-list-group__items",
            role: "group",
            "aria-labelledby": s.value
          }, [(v = n.default) == null ? void 0 : v.call(n)]), [[Fn, i.value]])];
        }
      })]
    })), {
      isOpen: i
    };
  }
}), pb = W({
  opacity: [Number, String],
  ...ye(),
  ...ze()
}, "VListItemSubtitle"), wf = le()({
  name: "VListItemSubtitle",
  props: pb(),
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
}), Il = Dr("v-list-item-title"), yb = W({
  active: {
    type: Boolean,
    default: void 0
  },
  activeClass: String,
  /* @deprecated */
  activeColor: String,
  appendAvatar: String,
  appendIcon: je,
  baseColor: String,
  disabled: Boolean,
  lines: [Boolean, String],
  link: {
    type: Boolean,
    default: void 0
  },
  nav: Boolean,
  prependAvatar: String,
  prependIcon: je,
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
  ...Bn(),
  ...ye(),
  ...nn(),
  ..._n(),
  ...En(),
  ...bt(),
  ...Ol(),
  ...ze(),
  ...Je(),
  ...vi({
    variant: "text"
  })
}, "VListItem"), Fe = le()({
  name: "VListItem",
  directives: {
    Ripple: Fr
  },
  props: yb(),
  emits: {
    click: (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: i,
      emit: o
    } = t;
    const r = Vl(e, n), s = y(() => e.value === void 0 ? r.href.value : e.value), {
      activate: l,
      isActivated: a,
      select: d,
      isOpen: u,
      isSelected: c,
      isIndeterminate: m,
      isGroupActivator: v,
      root: h,
      parent: g,
      openOnSelect: S,
      id: k
    } = _f(s, !1), O = hf(), P = y(() => {
      var ie;
      return e.active !== !1 && (e.active || ((ie = r.isActive) == null ? void 0 : ie.value) || (h.activatable.value ? a.value : c.value));
    }), M = y(() => e.link !== !1 && r.isLink.value), x = y(() => !e.disabled && e.link !== !1 && (e.link || r.isClickable.value || !!O && (h.selectable.value || h.activatable.value || e.value != null))), N = y(() => e.rounded || e.nav), $ = y(() => e.color ?? e.activeColor), C = y(() => ({
      color: P.value ? $.value ?? e.baseColor : e.baseColor,
      variant: e.variant
    }));
    he(() => {
      var ie;
      return (ie = r.isActive) == null ? void 0 : ie.value;
    }, (ie) => {
      ie && g.value != null && h.open(g.value, !0), ie && S(ie);
    }, {
      immediate: !0
    });
    const {
      themeClasses: V
    } = at(e), {
      borderClasses: L
    } = Rn(e), {
      colorClasses: A,
      colorStyles: E,
      variantClasses: D
    } = Co(C), {
      densityClasses: B
    } = Sn(e), {
      dimensionStyles: Z
    } = wn(e), {
      elevationClasses: ee
    } = Cn(e), {
      roundedClasses: X
    } = _t(N), q = y(() => e.lines ? `v-list-item--${e.lines}-line` : void 0), be = y(() => ({
      isActive: P.value,
      select: d,
      isOpen: u.value,
      isSelected: c.value,
      isIndeterminate: m.value
    }));
    function _e(ie) {
      var Oe;
      o("click", ie), x.value && ((Oe = r.navigate) == null || Oe.call(r, ie), !v && (h.activatable.value ? l(!a.value, ie) : (h.selectable.value || e.value != null) && d(!c.value, ie)));
    }
    function me(ie) {
      (ie.key === "Enter" || ie.key === " ") && (ie.preventDefault(), ie.target.dispatchEvent(new MouseEvent("click", ie)));
    }
    return ge(() => {
      const ie = M.value ? "a" : e.tag, Oe = i.title || e.title != null, Qe = i.subtitle || e.subtitle != null, et = !!(e.appendAvatar || e.appendIcon), Y = !!(et || i.append), de = !!(e.prependAvatar || e.prependIcon), $e = !!(de || i.prepend);
      return O == null || O.updateHasPrepend($e), e.activeColor && xg("active-color", ["color", "base-color"]), Nt(f(ie, ke({
        class: ["v-list-item", {
          "v-list-item--active": P.value,
          "v-list-item--disabled": e.disabled,
          "v-list-item--link": x.value,
          "v-list-item--nav": e.nav,
          "v-list-item--prepend": !$e && (O == null ? void 0 : O.hasPrepend.value),
          "v-list-item--slim": e.slim,
          [`${e.activeClass}`]: e.activeClass && P.value
        }, V.value, L.value, A.value, B.value, ee.value, q.value, X.value, D.value, e.class],
        style: [E.value, Z.value, e.style],
        tabindex: x.value ? O ? -2 : 0 : void 0,
        "aria-selected": h.activatable.value ? a.value : c.value,
        onClick: _e,
        onKeydown: x.value && !M.value && me
      }, r.linkProps), {
        default: () => {
          var ut;
          return [Eo(x.value || P.value, "v-list-item"), $e && f("div", {
            key: "prepend",
            class: "v-list-item__prepend"
          }, [i.prepend ? f(ot, {
            key: "prepend-defaults",
            disabled: !de,
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
              var Ye;
              return [(Ye = i.prepend) == null ? void 0 : Ye.call(i, be.value)];
            }
          }) : f(Ne, null, [e.prependAvatar && f(Pi, {
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
          }, [Oe && f(Il, {
            key: "title"
          }, {
            default: () => {
              var Ye;
              return [((Ye = i.title) == null ? void 0 : Ye.call(i, {
                title: e.title
              })) ?? e.title];
            }
          }), Qe && f(wf, {
            key: "subtitle"
          }, {
            default: () => {
              var Ye;
              return [((Ye = i.subtitle) == null ? void 0 : Ye.call(i, {
                subtitle: e.subtitle
              })) ?? e.subtitle];
            }
          }), (ut = i.default) == null ? void 0 : ut.call(i, be.value)]), Y && f("div", {
            key: "append",
            class: "v-list-item__append"
          }, [i.append ? f(ot, {
            key: "append-defaults",
            disabled: !et,
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
              var Ye;
              return [(Ye = i.append) == null ? void 0 : Ye.call(i, be.value)];
            }
          }) : f(Ne, null, [e.appendIcon && f(We, {
            key: "append-icon",
            density: e.density,
            icon: e.appendIcon
          }, null), e.appendAvatar && f(Pi, {
            key: "append-avatar",
            density: e.density,
            image: e.appendAvatar
          }, null)]), f("div", {
            class: "v-list-item__spacer"
          }, null)])];
        }
      }), [[Ii("ripple"), x.value && e.ripple]]);
    }), {
      activate: l,
      isActivated: a,
      isGroupActivator: v,
      isSelected: c,
      list: O,
      select: d,
      root: h,
      id: k
    };
  }
}), bb = W({
  color: String,
  inset: Boolean,
  sticky: Boolean,
  title: String,
  ...ye(),
  ...ze()
}, "VListSubheader"), _b = le()({
  name: "VListSubheader",
  props: bb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      textColorClasses: i,
      textColorStyles: o
    } = zt(oe(e, "color"));
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
}), wb = W({
  items: Array,
  returnObject: Boolean
}, "VListChildren"), Sf = le()({
  name: "VListChildren",
  props: wb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return vf(), () => {
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
          })) ?? f(mn, l, null);
        if (a === "subheader")
          return ((v = n.subheader) == null ? void 0 : v.call(n, {
            props: l
          })) ?? f(_b, l, null);
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
        }, c = gr.filterProps(l);
        return s ? f(gr, ke({
          value: l == null ? void 0 : l.value
        }, c), {
          activator: (h) => {
            let {
              props: g
            } = h;
            const S = {
              ...l,
              ...g,
              value: e.returnObject ? d : l.value
            };
            return n.header ? n.header({
              props: S
            }) : f(Fe, S, u);
          },
          default: () => f(Sf, {
            items: s,
            returnObject: e.returnObject
          }, n)
        }) : n.item ? n.item({
          props: l
        }) : f(Fe, ke(l, {
          value: e.returnObject ? d : l.value
        }), u);
      }));
    };
  }
}), Sb = W({
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
    default: Tr
  }
}, "list-items");
function Eb(e) {
  return typeof e == "string" || typeof e == "number" || typeof e == "boolean";
}
function Cb(e, t) {
  const n = zi(t, e.itemType, "item"), i = Eb(t) ? t : zi(t, e.itemTitle), o = zi(t, e.itemValue, void 0), r = zi(t, e.itemChildren), s = e.itemProps === !0 ? od(t, ["children"]) : zi(t, e.itemProps), l = {
    title: i,
    value: o,
    ...s
  };
  return {
    type: n,
    title: l.title,
    value: l.value,
    props: l,
    children: n === "item" && r ? Ef(e, r) : void 0,
    raw: t
  };
}
function Ef(e, t) {
  const n = [];
  for (const i of t)
    n.push(Cb(e, i));
  return n;
}
function kb(e) {
  return {
    items: y(() => Ef(e, e.items))
  };
}
const Nb = W({
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
  ...fb({
    selectStrategy: "single-leaf",
    openStrategy: "list"
  }),
  ...Bn(),
  ...ye(),
  ...nn(),
  ..._n(),
  ...En(),
  itemType: {
    type: String,
    default: "type"
  },
  ...Sb(),
  ...bt(),
  ...ze(),
  ...Je(),
  ...vi({
    variant: "text"
  })
}, "VList"), si = le()({
  name: "VList",
  props: Nb(),
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
    } = kb(e), {
      themeClasses: o
    } = at(e), {
      backgroundColorClasses: r,
      backgroundColorStyles: s
    } = Tt(oe(e, "bgColor")), {
      borderClasses: l
    } = Rn(e), {
      densityClasses: a
    } = Sn(e), {
      dimensionStyles: d
    } = wn(e), {
      elevationClasses: u
    } = Cn(e), {
      roundedClasses: c
    } = _t(e), {
      children: m,
      open: v,
      parents: h,
      select: g,
      getPath: S
    } = mb(e), k = y(() => e.lines ? `v-list--${e.lines}-line` : void 0), O = oe(e, "activeColor"), P = oe(e, "baseColor"), M = oe(e, "color");
    vf(), $i({
      VListGroup: {
        activeColor: O,
        baseColor: P,
        color: M,
        expandIcon: oe(e, "expandIcon"),
        collapseIcon: oe(e, "collapseIcon")
      },
      VListItem: {
        activeClass: oe(e, "activeClass"),
        activeColor: O,
        baseColor: P,
        color: M,
        density: oe(e, "density"),
        disabled: oe(e, "disabled"),
        lines: oe(e, "lines"),
        nav: oe(e, "nav"),
        slim: oe(e, "slim"),
        variant: oe(e, "variant")
      }
    });
    const x = pe(!1), N = ce();
    function $(D) {
      x.value = !0;
    }
    function C(D) {
      x.value = !1;
    }
    function V(D) {
      var B;
      !x.value && !(D.relatedTarget && ((B = N.value) != null && B.contains(D.relatedTarget))) && E();
    }
    function L(D) {
      const B = D.target;
      if (!(!N.value || ["INPUT", "TEXTAREA"].includes(B.tagName))) {
        if (D.key === "ArrowDown")
          E("next");
        else if (D.key === "ArrowUp")
          E("prev");
        else if (D.key === "Home")
          E("first");
        else if (D.key === "End")
          E("last");
        else
          return;
        D.preventDefault();
      }
    }
    function A(D) {
      x.value = !0;
    }
    function E(D) {
      if (N.value)
        return ud(N.value, D);
    }
    return ge(() => f(e.tag, {
      ref: N,
      class: ["v-list", {
        "v-list--disabled": e.disabled,
        "v-list--nav": e.nav,
        "v-list--slim": e.slim
      }, o.value, r.value, l.value, a.value, u.value, k.value, c.value, e.class],
      style: [s.value, d.value, e.style],
      tabindex: e.disabled || x.value ? -1 : 0,
      role: "listbox",
      "aria-activedescendant": void 0,
      onFocusin: $,
      onFocusout: C,
      onFocus: V,
      onKeydown: L,
      onMousedown: A
    }, {
      default: () => [f(Sf, {
        items: i.value,
        returnObject: e.returnObject
      }, n)]
    })), {
      open: v,
      select: g,
      focus: E,
      children: m,
      parents: h,
      getPath: S
    };
  }
}), xb = W({
  active: Boolean,
  disabled: Boolean,
  max: [Number, String],
  value: {
    type: [Number, String],
    default: 0
  },
  ...ye(),
  ...So({
    transition: {
      component: ff
    }
  })
}, "VCounter"), Vb = le()({
  name: "VCounter",
  functional: !0,
  props: xb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => e.max ? `${e.value} / ${e.max}` : String(e.value));
    return ge(() => f(dn, {
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
      }) : i.value]), [[Fn, e.active]])]
    })), {};
  }
}), Ob = W({
  text: String,
  onClick: Ot(),
  ...ye(),
  ...Je()
}, "VLabel"), Cf = le()({
  name: "VLabel",
  props: Ob(),
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
}), Tb = W({
  floating: Boolean,
  ...ye()
}, "VFieldLabel"), Fo = le()({
  name: "VFieldLabel",
  props: Tb(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return ge(() => f(Cf, {
      class: ["v-field-label", {
        "v-field-label--floating": e.floating
      }, e.class],
      style: e.style,
      "aria-hidden": e.floating || void 0
    }, n)), {};
  }
});
function kf(e) {
  const {
    t
  } = _l();
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
const $l = W({
  focused: Boolean,
  "onUpdate:focused": Ot()
}, "focus");
function Ml(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en();
  const n = it(e, "focused"), i = y(() => ({
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
const Db = ["underlined", "outlined", "filled", "solo", "solo-inverted", "solo-filled", "plain"], Nf = W({
  appendInnerIcon: je,
  bgColor: String,
  clearable: Boolean,
  clearIcon: {
    type: je,
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
  prependInnerIcon: je,
  reverse: Boolean,
  singleLine: Boolean,
  variant: {
    type: String,
    default: "filled",
    validator: (e) => Db.includes(e)
  },
  "onClick:clear": Ot(),
  "onClick:appendInner": Ot(),
  "onClick:prependInner": Ot(),
  ...ye(),
  ...Cl(),
  ...bt(),
  ...Je()
}, "VField"), xf = le()({
  name: "VField",
  inheritAttrs: !1,
  props: {
    id: String,
    ...$l(),
    ...Nf()
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
    } = at(e), {
      loaderClasses: s
    } = kl(e), {
      focusClasses: l,
      isFocused: a,
      focus: d,
      blur: u
    } = Ml(e), {
      InputIcon: c
    } = kf(e), {
      roundedClasses: m
    } = _t(e), {
      rtlClasses: v
    } = tn(), h = y(() => e.dirty || e.active), g = y(() => !e.singleLine && !!(e.label || o.label)), S = Ln(), k = y(() => e.id || `input-${S}`), O = y(() => `${k.value}-messages`), P = ce(), M = ce(), x = ce(), N = y(() => ["plain", "underlined"].includes(e.variant)), {
      backgroundColorClasses: $,
      backgroundColorStyles: C
    } = Tt(oe(e, "bgColor")), {
      textColorClasses: V,
      textColorStyles: L
    } = zt(y(() => e.error || e.disabled ? void 0 : h.value && a.value ? e.color : e.baseColor));
    he(h, (B) => {
      if (g.value) {
        const Z = P.value.$el, ee = M.value.$el;
        requestAnimationFrame(() => {
          const X = gl(Z), q = ee.getBoundingClientRect(), be = q.x - X.x, _e = q.y - X.y - (X.height / 2 - q.height / 2), me = q.width / 0.75, ie = Math.abs(me - X.width) > 1 ? {
            maxWidth: re(me)
          } : void 0, Oe = getComputedStyle(Z), Qe = getComputedStyle(ee), et = parseFloat(Oe.transitionDuration) * 1e3 || 150, Y = parseFloat(Qe.getPropertyValue("--v-field-label-scale")), de = Qe.getPropertyValue("color");
          Z.style.visibility = "visible", ee.style.visibility = "hidden", _i(Z, {
            transform: `translate(${be}px, ${_e}px) scale(${Y})`,
            color: de,
            ...ie
          }, {
            duration: et,
            easing: cr,
            direction: B ? "normal" : "reverse"
          }).finished.then(() => {
            Z.style.removeProperty("visibility"), ee.style.removeProperty("visibility");
          });
        });
      }
    }, {
      flush: "post"
    });
    const A = y(() => ({
      isActive: h,
      isFocused: a,
      controlRef: x,
      blur: u,
      focus: d
    }));
    function E(B) {
      B.target !== document.activeElement && B.preventDefault();
    }
    function D(B) {
      var Z;
      B.key !== "Enter" && B.key !== " " || (B.preventDefault(), B.stopPropagation(), (Z = e["onClick:clear"]) == null || Z.call(e, new MouseEvent("click")));
    }
    return ge(() => {
      var be, _e, me;
      const B = e.variant === "outlined", Z = !!(o["prepend-inner"] || e.prependInnerIcon), ee = !!(e.clearable || o.clear), X = !!(o["append-inner"] || e.appendInnerIcon || ee), q = () => o.label ? o.label({
        ...A.value,
        label: e.label,
        props: {
          for: k.value
        }
      }) : e.label;
      return f("div", ke({
        class: ["v-field", {
          "v-field--active": h.value,
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
        style: [C.value, e.style],
        onClick: E
      }, n), [f("div", {
        class: "v-field__overlay"
      }, null), f(jd, {
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
      }, null), (be = o["prepend-inner"]) == null ? void 0 : be.call(o, A.value)]), f("div", {
        class: "v-field__field",
        "data-no-activator": ""
      }, [["filled", "solo", "solo-inverted", "solo-filled"].includes(e.variant) && g.value && f(Fo, {
        key: "floating-label",
        ref: M,
        class: [V.value],
        floating: !0,
        for: k.value,
        style: L.value
      }, {
        default: () => [q()]
      }), f(Fo, {
        ref: P,
        for: k.value
      }, {
        default: () => [q()]
      }), (_e = o.default) == null ? void 0 : _e.call(o, {
        ...A.value,
        props: {
          id: k.value,
          class: "v-field__input",
          "aria-describedby": O.value
        },
        focus: d,
        blur: u
      })]), ee && f(ob, {
        key: "clear"
      }, {
        default: () => [Nt(f("div", {
          class: "v-field__clearable",
          onMousedown: (ie) => {
            ie.preventDefault(), ie.stopPropagation();
          }
        }, [f(ot, {
          defaults: {
            VIcon: {
              icon: e.clearIcon
            }
          }
        }, {
          default: () => [o.clear ? o.clear({
            ...A.value,
            props: {
              onKeydown: D,
              onFocus: d,
              onBlur: u,
              onClick: e["onClick:clear"]
            }
          }) : f(c, {
            name: "clear",
            onKeydown: D,
            onFocus: d,
            onBlur: u
          }, null)]
        })]), [[Fn, e.dirty]])]
      }), X && f("div", {
        key: "append",
        class: "v-field__append-inner"
      }, [(me = o["append-inner"]) == null ? void 0 : me.call(o, A.value), e.appendInnerIcon && f(c, {
        key: "append-icon",
        name: "appendInner"
      }, null)]), f("div", {
        class: ["v-field__outline", V.value],
        style: L.value
      }, [B && f(Ne, null, [f("div", {
        class: "v-field__outline__start"
      }, null), g.value && f("div", {
        class: "v-field__outline__notch"
      }, [f(Fo, {
        ref: M,
        floating: !0,
        for: k.value
      }, {
        default: () => [q()]
      })]), f("div", {
        class: "v-field__outline__end"
      }, null)]), N.value && g.value && f(Fo, {
        ref: M,
        floating: !0,
        for: k.value
      }, {
        default: () => [q()]
      })])]);
    }), {
      controlRef: x
    };
  }
});
function Pb(e) {
  const t = Object.keys(xf.props).filter((n) => !vl(n) && n !== "class" && n !== "style");
  return id(e, t);
}
const Ab = W({
  active: Boolean,
  color: String,
  messages: {
    type: [Array, String],
    default: () => []
  },
  ...ye(),
  ...So({
    transition: {
      component: ff,
      leaveAbsolute: !0,
      group: !0
    }
  })
}, "VMessages"), Ib = le()({
  name: "VMessages",
  props: Ab(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = y(() => ii(e.messages)), {
      textColorClasses: o,
      textColorStyles: r
    } = zt(y(() => e.color));
    return ge(() => f(dn, {
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
}), Vf = Symbol.for("vuetify:form"), $b = W({
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
function Mb(e) {
  const t = it(e, "modelValue"), n = y(() => e.disabled), i = y(() => e.readonly), o = pe(!1), r = ce([]), s = ce([]);
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
  return he(r, () => {
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
  }), ht(Vf, {
    register: (u) => {
      let {
        id: c,
        vm: m,
        validate: v,
        reset: h,
        resetValidation: g
      } = u;
      r.value.some((S) => S.id === c) && fn(`Duplicate input name "${c}"`), r.value.push({
        id: c,
        validate: v,
        reset: h,
        resetValidation: g,
        vm: Gu(m),
        isValid: null,
        errorMessages: []
      });
    },
    unregister: (u) => {
      r.value = r.value.filter((c) => c.id !== u);
    },
    update: (u, c, m) => {
      const v = r.value.find((h) => h.id === u);
      v && (v.isValid = c, v.errorMessages = m);
    },
    isDisabled: n,
    isReadonly: i,
    isValidating: o,
    isValid: t,
    items: r,
    validateOn: oe(e, "validateOn")
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
function Fb() {
  return He(Vf, null);
}
const Lb = W({
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
  ...$l()
}, "validation");
function Bb(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : en(), n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : Ln();
  const i = it(e, "modelValue"), o = y(() => e.validationValue === void 0 ? i.value : e.validationValue), r = Fb(), s = ce([]), l = pe(!0), a = y(() => !!(ii(i.value === "" ? null : i.value).length || ii(o.value === "" ? null : o.value).length)), d = y(() => !!(e.disabled ?? (r == null ? void 0 : r.isDisabled.value))), u = y(() => !!(e.readonly ?? (r == null ? void 0 : r.isReadonly.value))), c = y(() => {
    var x;
    return (x = e.errorMessages) != null && x.length ? ii(e.errorMessages).concat(s.value).slice(0, Math.max(0, +e.maxErrors)) : s.value;
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
  }), h = pe(!1), g = y(() => ({
    [`${t}--error`]: v.value === !1,
    [`${t}--dirty`]: a.value,
    [`${t}--disabled`]: d.value,
    [`${t}--readonly`]: u.value
  })), S = Ue("validation"), k = y(() => e.name ?? Jt(n));
  nl(() => {
    r == null || r.register({
      id: k.value,
      vm: S,
      validate: M,
      reset: O,
      resetValidation: P
    });
  }), yt(() => {
    r == null || r.unregister(k.value);
  }), $n(async () => {
    m.value.lazy || await M(!m.value.eager), r == null || r.update(k.value, v.value, c.value);
  }), di(() => m.value.input || m.value.invalidInput && v.value === !1, () => {
    he(o, () => {
      if (o.value != null)
        M();
      else if (e.focused) {
        const x = he(() => e.focused, (N) => {
          N || M(), x();
        });
      }
    });
  }), di(() => m.value.blur, () => {
    he(() => e.focused, (x) => {
      x || M();
    });
  }), he([v, c], () => {
    r == null || r.update(k.value, v.value, c.value);
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
    h.value = !0;
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
    return s.value = N, h.value = !1, l.value = x, s.value;
  }
  return {
    errorMessages: c,
    isDirty: a,
    isDisabled: d,
    isReadonly: u,
    isPristine: l,
    isValid: v,
    isValidating: h,
    reset: O,
    resetValidation: P,
    validate: M,
    validationClasses: g
  };
}
const Fl = W({
  id: String,
  appendIcon: je,
  centerAffix: {
    type: Boolean,
    default: !0
  },
  prependIcon: je,
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
  ...ye(),
  ...nn(),
  ...ug(_n(), ["maxWidth", "minWidth", "width"]),
  ...Je(),
  ...Lb()
}, "VInput"), pr = le()({
  name: "VInput",
  props: {
    ...Fl()
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
    } = Sn(e), {
      dimensionStyles: s
    } = wn(e), {
      themeClasses: l
    } = at(e), {
      rtlClasses: a
    } = tn(), {
      InputIcon: d
    } = kf(e), u = Ln(), c = y(() => e.id || `input-${u}`), m = y(() => `${c.value}-messages`), {
      errorMessages: v,
      isDirty: h,
      isDisabled: g,
      isReadonly: S,
      isPristine: k,
      isValid: O,
      isValidating: P,
      reset: M,
      resetValidation: x,
      validate: N,
      validationClasses: $
    } = Bb(e, "v-input", c), C = y(() => ({
      id: c,
      messagesId: m,
      isDirty: h,
      isDisabled: g,
      isReadonly: S,
      isPristine: k,
      isValid: O,
      isValidating: P,
      reset: M,
      resetValidation: x,
      validate: N
    })), V = y(() => {
      var L;
      return (L = e.errorMessages) != null && L.length || !k.value && v.value.length ? v.value : e.hint && (e.persistentHint || e.focused) ? e.hint : e.messages;
    });
    return ge(() => {
      var B, Z, ee, X;
      const L = !!(i.prepend || e.prependIcon), A = !!(i.append || e.appendIcon), E = V.value.length > 0, D = !e.hideDetails || e.hideDetails === "auto" && (E || !!i.details);
      return f("div", {
        class: ["v-input", `v-input--${e.direction}`, {
          "v-input--center-affix": e.centerAffix,
          "v-input--hide-spin-buttons": e.hideSpinButtons
        }, r.value, l.value, a.value, $.value, e.class],
        style: [s.value, e.style]
      }, [L && f("div", {
        key: "prepend",
        class: "v-input__prepend"
      }, [(B = i.prepend) == null ? void 0 : B.call(i, C.value), e.prependIcon && f(d, {
        key: "prepend-icon",
        name: "prepend"
      }, null)]), i.default && f("div", {
        class: "v-input__control"
      }, [(Z = i.default) == null ? void 0 : Z.call(i, C.value)]), A && f("div", {
        key: "append",
        class: "v-input__append"
      }, [e.appendIcon && f(d, {
        key: "append-icon",
        name: "append"
      }, null), (ee = i.append) == null ? void 0 : ee.call(i, C.value)]), D && f("div", {
        class: "v-input__details"
      }, [f(Ib, {
        id: m.value,
        active: E,
        messages: V.value
      }, {
        message: i.message
      }), (X = i.details) == null ? void 0 : X.call(i, C.value)])]);
    }), {
      reset: M,
      resetValidation: x,
      validate: N,
      isValid: O,
      errorMessages: v
    };
  }
}), os = Symbol("Forwarded refs");
function rs(e, t) {
  let n = e;
  for (; n; ) {
    const i = Reflect.getOwnPropertyDescriptor(n, t);
    if (i) return i;
    n = Object.getPrototypeOf(n);
  }
}
function Ll(e) {
  for (var t = arguments.length, n = new Array(t > 1 ? t - 1 : 0), i = 1; i < t; i++)
    n[i - 1] = arguments[i];
  return e[os] = n, new Proxy(e, {
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
          const d = rs(a.value, r) ?? ("_" in a.value ? rs((l = a.value._) == null ? void 0 : l.setupState, r) : void 0);
          if (d) return d;
        }
        for (const a of n) {
          const d = a.value && a.value[os];
          if (!d) continue;
          const u = d.slice();
          for (; u.length; ) {
            const c = u.shift(), m = rs(c.value, r);
            if (m) return m;
            const v = c.value && c.value[os];
            v && u.push(...v);
          }
        }
      }
    }
  });
}
const Rb = ["color", "file", "time", "date", "datetime-local", "week", "month"], Hb = W({
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
  ...Fl(),
  ...Nf()
}, "VTextField"), Zt = le()({
  name: "VTextField",
  directives: {
    Intersect: $d
  },
  inheritAttrs: !1,
  props: Hb(),
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
    const r = it(e, "modelValue"), {
      isFocused: s,
      focus: l,
      blur: a
    } = Ml(e), d = y(() => typeof e.counterValue == "function" ? e.counterValue(r.value) : typeof e.counterValue == "number" ? e.counterValue : (r.value ?? "").toString().length), u = y(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    }), c = y(() => ["plain", "underlined"].includes(e.variant));
    function m(N, $) {
      var C, V;
      !e.autofocus || !N || (V = (C = $[0].target) == null ? void 0 : C.focus) == null || V.call(C);
    }
    const v = ce(), h = ce(), g = ce(), S = y(() => Rb.includes(e.type) || e.persistentPlaceholder || s.value || e.active);
    function k() {
      var N;
      g.value !== document.activeElement && ((N = g.value) == null || N.focus()), s.value || l();
    }
    function O(N) {
      i("mousedown:control", N), N.target !== g.value && (k(), N.preventDefault());
    }
    function P(N) {
      k(), i("click:control", N);
    }
    function M(N) {
      N.stopPropagation(), k(), At(() => {
        r.value = null, mg(e["onClick:clear"], N);
      });
    }
    function x(N) {
      var C;
      const $ = N.target;
      if (r.value = $.value, (C = e.modelModifiers) != null && C.trim && ["text", "search", "password", "tel", "url"].includes(e.type)) {
        const V = [$.selectionStart, $.selectionEnd];
        At(() => {
          $.selectionStart = V[0], $.selectionEnd = V[1];
        });
      }
    }
    return ge(() => {
      const N = !!(o.counter || e.counter !== !1 && e.counter != null), $ = !!(N || o.details), [C, V] = dg(n), {
        modelValue: L,
        ...A
      } = pr.filterProps(e), E = Pb(e);
      return f(pr, ke({
        ref: v,
        modelValue: r.value,
        "onUpdate:modelValue": (D) => r.value = D,
        class: ["v-text-field", {
          "v-text-field--prefixed": e.prefix,
          "v-text-field--suffixed": e.suffix,
          "v-input--plain-underlined": c.value
        }, e.class],
        style: e.style
      }, C, A, {
        centerAffix: !c.value,
        focused: s.value
      }), {
        ...o,
        default: (D) => {
          let {
            id: B,
            isDisabled: Z,
            isDirty: ee,
            isReadonly: X,
            isValid: q
          } = D;
          return f(xf, ke({
            ref: h,
            onMousedown: O,
            onClick: P,
            "onClick:clear": M,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"],
            role: e.role
          }, E, {
            id: B.value,
            active: S.value || ee.value,
            dirty: ee.value || e.dirty,
            disabled: Z.value,
            focused: s.value,
            error: q.value === !1
          }), {
            ...o,
            default: (be) => {
              let {
                props: {
                  class: _e,
                  ...me
                }
              } = be;
              const ie = Nt(f("input", ke({
                ref: g,
                value: r.value,
                onInput: x,
                autofocus: e.autofocus,
                readonly: X.value,
                disabled: Z.value,
                name: e.name,
                placeholder: e.placeholder,
                size: 1,
                type: e.type,
                onFocus: k,
                onBlur: a
              }, me, V), null), [[Ii("intersect"), {
                handler: m
              }, null, {
                once: !0
              }]]);
              return f(Ne, null, [e.prefix && f("span", {
                class: "v-text-field__prefix"
              }, [f("span", {
                class: "v-text-field__prefix__text"
              }, [e.prefix])]), o.default ? f("div", {
                class: _e,
                "data-no-activator": ""
              }, [o.default(), ie]) : jt(ie, {
                class: _e
              }), e.suffix && f("span", {
                class: "v-text-field__suffix"
              }, [f("span", {
                class: "v-text-field__suffix__text"
              }, [e.suffix])])]);
            }
          });
        },
        details: $ ? (D) => {
          var B;
          return f(Ne, null, [(B = o.details) == null ? void 0 : B.call(o, D), N && f(Ne, null, [f("span", null, null), f(Vb, {
            active: e.persistentCounter || s.value,
            value: d.value,
            max: u.value,
            disabled: e.disabled
          }, o.counter)])]);
        } : void 0
      });
    }), Ll({}, v, h, g);
  }
}), jb = {
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
function zb(e, t, n, i, o, r) {
  return ve(), Ee(Ft, null, {
    default: _(() => [
      f(Mt, null, {
        default: _(() => [
          f(xe, {
            offset: "2",
            cols: "8",
            class: "text-center"
          }, {
            default: _(() => t[4] || (t[4] = [
              we("h4", { class: "mt-3" }, "评论列表", -1)
            ])),
            _: 1
          }),
          f(xe, { cols: "2" }, {
            default: _(() => [
              f(ae, {
                variant: "plain",
                icon: "mdi-close",
                onClick: t[0] || (t[0] = (s) => e.$emit("close")),
                title: "关闭评论面板"
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      }),
      f(mn),
      n.comments.length == 0 ? (ve(), Ee(si, {
        key: 0,
        density: "compact"
      }, {
        default: _(() => [
          f(Fe, { class: "my-4" }, {
            default: _(() => [
              f(Il, { class: "text-center" }, {
                default: _(() => t[5] || (t[5] = [
                  J("尚未有人发表评论")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : (ve(), Ee(si, {
        key: 1,
        id: "book-comments",
        density: "compact"
      }, {
        default: _(() => [
          (ve(!0), qn(Ne, null, ki(n.comments, (s) => (ve(), Ee(Fe, {
            class: "pr-0 align-self-start mb-4",
            "prepend-avatar": s.avatar,
            "append-icon": "mdi-thumb-up",
            subtitle: s.nickName
          }, {
            prepend: _(() => [
              f(Pi, {
                variant: "outlined",
                size: "large",
                color: "grey",
                class: "text-center",
                icon: s.avatar
              }, null, 8, ["icon"])
            ]),
            append: _(() => [
              f(ae, {
                class: "px-0",
                size: "small",
                variant: "plain",
                stacked: "",
                "prepend-icon": "mdi-thumb-up",
                title: "点赞"
              }, {
                default: _(() => [
                  J(Ke(s.likeCount), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            default: _(() => [
              J(Ke(s.content) + " ", 1),
              f(wf, null, {
                default: _(() => [
                  J(Ke(s.level) + "楼 * " + Ke(s.createTime) + " * " + Ke(s.geo), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            _: 2
          }, 1032, ["prepend-avatar", "subtitle"]))), 256))
        ]),
        _: 1
      })),
      f(Vi, { class: "my-2 py-0 px-2" }, {
        default: _(() => [
          n.login ? (ve(), Ee(Mt, { key: 1 }, {
            default: _(() => [
              f(xe, { cols: "9" }, {
                default: _(() => [
                  f(Zt, {
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
              f(xe, { cols: "3" }, {
                default: _(() => [
                  f(ae, {
                    onClick: t[3] || (t[3] = (s) => e.$emit("add_review", this.content))
                  }, {
                    default: _(() => t[7] || (t[7] = [
                      J("发表")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (ve(), Ee(ae, {
            key: 0,
            onClick: t[1] || (t[1] = (s) => n.login = !n.login),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: _(() => t[6] || (t[6] = [
              J("点击登录，发表评论")
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
const Of = /* @__PURE__ */ mi(jb, [["render", zb]]), Ub = Dr("v-alert-title"), Wb = ["success", "info", "warning", "error"], Kb = W({
  border: {
    type: [Boolean, String],
    validator: (e) => typeof e == "boolean" || ["top", "end", "bottom", "start"].includes(e)
  },
  borderColor: String,
  closable: Boolean,
  closeIcon: {
    type: je,
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
    validator: (e) => Wb.includes(e)
  },
  ...ye(),
  ...nn(),
  ..._n(),
  ...En(),
  ...ko(),
  ...Nl(),
  ...bt(),
  ...ze(),
  ...Je(),
  ...vi({
    variant: "flat"
  })
}, "VAlert"), Yi = le()({
  name: "VAlert",
  props: Kb(),
  emits: {
    "click:close": (e) => !0,
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      emit: n,
      slots: i
    } = t;
    const o = it(e, "modelValue"), r = y(() => {
      if (e.icon !== !1)
        return e.type ? e.icon ?? `$${e.type}` : e.icon;
    }), s = y(() => ({
      color: e.color ?? e.type,
      variant: e.variant
    })), {
      themeClasses: l
    } = at(e), {
      colorClasses: a,
      colorStyles: d,
      variantClasses: u
    } = Co(s), {
      densityClasses: c
    } = Sn(e), {
      dimensionStyles: m
    } = wn(e), {
      elevationClasses: v
    } = Cn(e), {
      locationStyles: h
    } = No(e), {
      positionClasses: g
    } = xl(e), {
      roundedClasses: S
    } = _t(e), {
      textColorClasses: k,
      textColorStyles: O
    } = zt(oe(e, "borderColor")), {
      t: P
    } = _l(), M = y(() => ({
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
        }, l.value, a.value, c.value, v.value, g.value, S.value, u.value, e.class],
        style: [d.value, m.value, h.value, e.style],
        role: "alert"
      }, {
        default: () => {
          var C, V;
          return [Eo(!1, "v-alert"), e.border && f("div", {
            key: "border",
            class: ["v-alert__border", k.value],
            style: O.value
          }, null), x && f("div", {
            key: "prepend",
            class: "v-alert__prepend"
          }, [i.prepend ? f(ot, {
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
          }, [N && f(Ub, {
            key: "title"
          }, {
            default: () => {
              var L;
              return [((L = i.title) == null ? void 0 : L.call(i)) ?? e.title];
            }
          }), ((C = i.text) == null ? void 0 : C.call(i)) ?? e.text, (V = i.default) == null ? void 0 : V.call(i)]), i.append && f("div", {
            key: "append",
            class: "v-alert__append"
          }, [i.append()]), $ && f("div", {
            key: "close",
            class: "v-alert__close"
          }, [i.close ? f(ot, {
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
          }) : f(ae, ke({
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
function ss(e, t) {
  return {
    x: e.x + t.x,
    y: e.y + t.y
  };
}
function Gb(e, t) {
  return {
    x: e.x - t.x,
    y: e.y - t.y
  };
}
function yu(e, t) {
  if (e.side === "top" || e.side === "bottom") {
    const {
      side: n,
      align: i
    } = e, o = i === "left" ? 0 : i === "center" ? t.width / 2 : i === "right" ? t.width : i, r = n === "top" ? 0 : n === "bottom" ? t.height : n;
    return ss({
      x: o,
      y: r
    }, t);
  } else if (e.side === "left" || e.side === "right") {
    const {
      side: n,
      align: i
    } = e, o = n === "left" ? 0 : n === "right" ? t.width : n, r = i === "top" ? 0 : i === "center" ? t.height / 2 : i === "bottom" ? t.height : i;
    return ss({
      x: o,
      y: r
    }, t);
  }
  return ss({
    x: t.width / 2,
    y: t.height / 2
  }, t);
}
const Tf = {
  static: Zb,
  // specific viewport position, usually centered
  connected: Jb
  // connected to a certain element
}, Yb = W({
  locationStrategy: {
    type: [String, Function],
    default: "static",
    validator: (e) => typeof e == "function" || e in Tf
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
function qb(e, t) {
  const n = ce({}), i = ce();
  Re && di(() => !!(t.isActive.value && e.locationStrategy), (r) => {
    var s, l;
    he(() => e.locationStrategy, r), Ut(() => {
      window.removeEventListener("resize", o), i.value = void 0;
    }), window.addEventListener("resize", o, {
      passive: !0
    }), typeof e.locationStrategy == "function" ? i.value = (s = e.locationStrategy(t, e, n)) == null ? void 0 : s.updateLocation : i.value = (l = Tf[e.locationStrategy](t, e, n)) == null ? void 0 : l.updateLocation;
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
function Zb() {
}
function Xb(e, t) {
  const n = gl(e);
  return t ? n.x += parseFloat(e.style.right || 0) : n.x -= parseFloat(e.style.left || 0), n.y -= parseFloat(e.style.top || 0), n;
}
function Jb(e, t, n) {
  (Array.isArray(e.target.value) || Zg(e.target.value)) && Object.assign(n.value, {
    position: "fixed",
    top: 0,
    [e.isRtl.value ? "right" : "left"]: 0
  });
  const {
    preferredAnchor: o,
    preferredOrigin: r
  } = hl(() => {
    const h = Ts(t.location, e.isRtl.value), g = t.origin === "overlap" ? h : t.origin === "auto" ? es(h) : Ts(t.origin, e.isRtl.value);
    return h.side === g.side && h.align === ts(g).align ? {
      preferredAnchor: La(h),
      preferredOrigin: La(g)
    } : {
      preferredAnchor: h,
      preferredOrigin: g
    };
  }), [s, l, a, d] = ["minWidth", "minHeight", "maxWidth", "maxHeight"].map((h) => y(() => {
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
  he([e.target, e.contentEl], (h, g) => {
    let [S, k] = h, [O, P] = g;
    O && !Array.isArray(O) && m.unobserve(O), S && !Array.isArray(S) && m.observe(S), P && m.unobserve(P), k && m.observe(k);
  }, {
    immediate: !0
  }), Ut(() => {
    m.disconnect();
  });
  function v() {
    if (c = !1, requestAnimationFrame(() => c = !0), !e.target.value || !e.contentEl.value) return;
    const h = dd(e.target.value), g = Xb(e.contentEl.value, e.isRtl.value), S = dr(e.contentEl.value), k = 12;
    S.length || (S.push(document.documentElement), e.contentEl.value.style.top && e.contentEl.value.style.left || (g.x -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-x") || 0), g.y -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-y") || 0)));
    const O = S.reduce((A, E) => {
      const D = E.getBoundingClientRect(), B = new ri({
        x: E === document.documentElement ? 0 : D.x,
        y: E === document.documentElement ? 0 : D.y,
        width: E.clientWidth,
        height: E.clientHeight
      });
      return A ? new ri({
        x: Math.max(A.left, B.left),
        y: Math.max(A.top, B.top),
        width: Math.min(A.right, B.right) - Math.max(A.left, B.left),
        height: Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top)
      }) : B;
    }, void 0);
    O.x += k, O.y += k, O.width -= k * 2, O.height -= k * 2;
    let P = {
      anchor: o.value,
      origin: r.value
    };
    function M(A) {
      const E = new ri(g), D = yu(A.anchor, h), B = yu(A.origin, E);
      let {
        x: Z,
        y: ee
      } = Gb(D, B);
      switch (A.anchor.side) {
        case "top":
          ee -= u.value[0];
          break;
        case "bottom":
          ee += u.value[0];
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
          ee -= u.value[1];
          break;
        case "bottom":
          ee += u.value[1];
          break;
        case "left":
          Z -= u.value[1];
          break;
        case "right":
          Z += u.value[1];
          break;
      }
      return E.x += Z, E.y += ee, E.width = Math.min(E.width, a.value), E.height = Math.min(E.height, d.value), {
        overflows: Ra(E, O),
        x: Z,
        y: ee
      };
    }
    let x = 0, N = 0;
    const $ = {
      x: 0,
      y: 0
    }, C = {
      x: !1,
      y: !1
    };
    let V = -1;
    for (; ; ) {
      if (V++ > 10) {
        ar("Infinite loop detected in connectedLocationStrategy");
        break;
      }
      const {
        x: A,
        y: E,
        overflows: D
      } = M(P);
      x += A, N += E, g.x += A, g.y += E;
      {
        const B = Ba(P.anchor), Z = D.x.before || D.x.after, ee = D.y.before || D.y.after;
        let X = !1;
        if (["x", "y"].forEach((q) => {
          if (q === "x" && Z && !C.x || q === "y" && ee && !C.y) {
            const be = {
              anchor: {
                ...P.anchor
              },
              origin: {
                ...P.origin
              }
            }, _e = q === "x" ? B === "y" ? ts : es : B === "y" ? es : ts;
            be.anchor = _e(be.anchor), be.origin = _e(be.origin);
            const {
              overflows: me
            } = M(be);
            (me[q].before <= D[q].before && me[q].after <= D[q].after || me[q].before + me[q].after < (D[q].before + D[q].after) / 2) && (P = be, X = C[q] = !0);
          }
        }), X) continue;
      }
      D.x.before && (x += D.x.before, g.x += D.x.before), D.x.after && (x -= D.x.after, g.x -= D.x.after), D.y.before && (N += D.y.before, g.y += D.y.before), D.y.after && (N -= D.y.after, g.y -= D.y.after);
      {
        const B = Ra(g, O);
        $.x = O.width - B.x.before - B.x.after, $.y = O.height - B.y.before - B.y.after, x += B.x.before, g.x += B.x.before, N += B.y.before, g.y += B.y.before;
      }
      break;
    }
    const L = Ba(P.anchor);
    return Object.assign(n.value, {
      "--v-overlay-anchor-origin": `${P.anchor.side} ${P.anchor.align}`,
      transformOrigin: `${P.origin.side} ${P.origin.align}`,
      // transform: `translate(${pixelRound(x)}px, ${pixelRound(y)}px)`,
      top: re(ls(N)),
      left: e.isRtl.value ? void 0 : re(ls(x)),
      right: e.isRtl.value ? re(ls(-x)) : void 0,
      minWidth: re(L === "y" ? Math.min(s.value, h.width) : s.value),
      maxWidth: re(bu(An($.x, s.value === 1 / 0 ? 0 : s.value, a.value))),
      maxHeight: re(bu(An($.y, l.value === 1 / 0 ? 0 : l.value, d.value)))
    }), {
      available: $,
      contentBox: g
    };
  }
  return he(() => [o.value, r.value, t.offset, t.minWidth, t.minHeight, t.maxWidth, t.maxHeight], () => v()), At(() => {
    const h = v();
    if (!h) return;
    const {
      available: g,
      contentBox: S
    } = h;
    S.height > g.y && requestAnimationFrame(() => {
      v(), requestAnimationFrame(() => {
        v();
      });
    });
  }), {
    updateLocation: v
  };
}
function ls(e) {
  return Math.round(e * devicePixelRatio) / devicePixelRatio;
}
function bu(e) {
  return Math.ceil(e * devicePixelRatio) / devicePixelRatio;
}
let Ls = !0;
const yr = [];
function Qb(e) {
  !Ls || yr.length ? (yr.push(e), Bs()) : (Ls = !1, e(), Bs());
}
let _u = -1;
function Bs() {
  cancelAnimationFrame(_u), _u = requestAnimationFrame(() => {
    const e = yr.shift();
    e && e(), yr.length ? Bs() : Ls = !0;
  });
}
const Go = {
  none: null,
  close: n_,
  block: i_,
  reposition: o_
}, e_ = W({
  scrollStrategy: {
    type: [String, Function],
    default: "block",
    validator: (e) => typeof e == "function" || e in Go
  }
}, "VOverlay-scroll-strategies");
function t_(e, t) {
  if (!Re) return;
  let n;
  bn(async () => {
    n == null || n.stop(), t.isActive.value && e.scrollStrategy && (n = Ks(), await new Promise((i) => setTimeout(i)), n.active && n.run(() => {
      var i;
      typeof e.scrollStrategy == "function" ? e.scrollStrategy(t, e, n) : (i = Go[e.scrollStrategy]) == null || i.call(Go, t, e, n);
    }));
  }), Ut(() => {
    n == null || n.stop();
  });
}
function n_(e) {
  function t(n) {
    e.isActive.value = !1;
  }
  Df(e.targetEl.value ?? e.contentEl.value, t);
}
function i_(e, t) {
  var s;
  const n = (s = e.root.value) == null ? void 0 : s.offsetParent, i = [.../* @__PURE__ */ new Set([...dr(e.targetEl.value, t.contained ? n : void 0), ...dr(e.contentEl.value, t.contained ? n : void 0)])].filter((l) => !l.classList.contains("v-overlay-scroll-blocked")), o = window.innerWidth - document.documentElement.offsetWidth, r = ((l) => bl(l) && l)(n || document.documentElement);
  r && e.root.value.classList.add("v-overlay--scroll-blocked"), i.forEach((l, a) => {
    l.style.setProperty("--v-body-scroll-x", re(-l.scrollLeft)), l.style.setProperty("--v-body-scroll-y", re(-l.scrollTop)), l !== document.documentElement && l.style.setProperty("--v-scrollbar-offset", re(o)), l.classList.add("v-overlay-scroll-blocked");
  }), Ut(() => {
    i.forEach((l, a) => {
      const d = parseFloat(l.style.getPropertyValue("--v-body-scroll-x")), u = parseFloat(l.style.getPropertyValue("--v-body-scroll-y")), c = l.style.scrollBehavior;
      l.style.scrollBehavior = "auto", l.style.removeProperty("--v-body-scroll-x"), l.style.removeProperty("--v-body-scroll-y"), l.style.removeProperty("--v-scrollbar-offset"), l.classList.remove("v-overlay-scroll-blocked"), l.scrollLeft = -d, l.scrollTop = -u, l.style.scrollBehavior = c;
    }), r && e.root.value.classList.remove("v-overlay--scroll-blocked");
  });
}
function o_(e, t, n) {
  let i = !1, o = -1, r = -1;
  function s(l) {
    Qb(() => {
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
  }), Ut(() => {
    typeof cancelIdleCallback < "u" && cancelIdleCallback(r), cancelAnimationFrame(o);
  });
}
function Df(e, t) {
  const n = [document, ...dr(e)];
  n.forEach((i) => {
    i.addEventListener("scroll", t, {
      passive: !0
    });
  }), Ut(() => {
    n.forEach((i) => {
      i.removeEventListener("scroll", t);
    });
  });
}
const r_ = Symbol.for("vuetify:v-menu"), s_ = W({
  closeDelay: [Number, String],
  openDelay: [Number, String]
}, "delay");
function l_(e, t) {
  let n = () => {
  };
  function i(s) {
    n == null || n();
    const l = Number(s ? e.openDelay : e.closeDelay);
    return new Promise((a) => {
      n = gg(l, () => {
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
const a_ = W({
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
  ...s_()
}, "VOverlay-activator");
function u_(e, t) {
  let {
    isActive: n,
    isTop: i,
    contentEl: o
  } = t;
  const r = Ue("useActivator"), s = ce();
  let l = !1, a = !1, d = !0;
  const u = y(() => e.openOnFocus || e.openOnFocus == null && e.openOnHover), c = y(() => e.openOnClick || e.openOnClick == null && !e.openOnHover && !u.value), {
    runOpenDelay: m,
    runCloseDelay: v
  } = l_(e, (C) => {
    C === (e.openOnHover && l || u.value && a) && !(e.openOnHover && n.value && !i.value) && (n.value !== C && (d = !0), n.value = C);
  }), h = ce(), g = {
    onClick: (C) => {
      C.stopPropagation(), s.value = C.currentTarget || C.target, n.value || (h.value = [C.clientX, C.clientY]), n.value = !n.value;
    },
    onMouseenter: (C) => {
      var V;
      (V = C.sourceCapabilities) != null && V.firesTouchEvents || (l = !0, s.value = C.currentTarget || C.target, m());
    },
    onMouseleave: (C) => {
      l = !1, v();
    },
    onFocus: (C) => {
      hg(C.target, ":focus-visible") !== !1 && (a = !0, C.stopPropagation(), s.value = C.currentTarget || C.target, m());
    },
    onBlur: (C) => {
      a = !1, C.stopPropagation(), v();
    }
  }, S = y(() => {
    const C = {};
    return c.value && (C.onClick = g.onClick), e.openOnHover && (C.onMouseenter = g.onMouseenter, C.onMouseleave = g.onMouseleave), u.value && (C.onFocus = g.onFocus, C.onBlur = g.onBlur), C;
  }), k = y(() => {
    const C = {};
    if (e.openOnHover && (C.onMouseenter = () => {
      l = !0, m();
    }, C.onMouseleave = () => {
      l = !1, v();
    }), u.value && (C.onFocusin = () => {
      a = !0, m();
    }, C.onFocusout = () => {
      a = !1, v();
    }), e.closeOnContentClick) {
      const V = He(r_, null);
      C.onClick = () => {
        n.value = !1, V == null || V.closeParents();
      };
    }
    return C;
  }), O = y(() => {
    const C = {};
    return e.openOnHover && (C.onMouseenter = () => {
      d && (l = !0, d = !1, m());
    }, C.onMouseleave = () => {
      l = !1, v();
    }), C;
  });
  he(i, (C) => {
    var V;
    C && (e.openOnHover && !l && (!u.value || !a) || u.value && !a && (!e.openOnHover || !l)) && !((V = o.value) != null && V.contains(document.activeElement)) && (n.value = !1);
  }), he(n, (C) => {
    C || setTimeout(() => {
      h.value = void 0;
    });
  }, {
    flush: "post"
  });
  const P = Os();
  bn(() => {
    P.value && At(() => {
      s.value = P.el;
    });
  });
  const M = Os(), x = y(() => e.target === "cursor" && h.value ? h.value : M.value ? M.el : Pf(e.target, r) || s.value), N = y(() => Array.isArray(x.value) ? void 0 : x.value);
  let $;
  return he(() => !!e.activator, (C) => {
    C && Re ? ($ = Ks(), $.run(() => {
      c_(e, r, {
        activatorEl: s,
        activatorEvents: S
      });
    })) : $ && $.stop();
  }, {
    flush: "post",
    immediate: !0
  }), Ut(() => {
    $ == null || $.stop();
  }), {
    activatorEl: s,
    activatorRef: P,
    target: x,
    targetEl: N,
    targetRef: M,
    activatorEvents: S,
    contentEvents: k,
    scrimEvents: O
  };
}
function c_(e, t, n) {
  let {
    activatorEl: i,
    activatorEvents: o
  } = n;
  he(() => e.activator, (a, d) => {
    if (d && a !== d) {
      const u = l(d);
      u && s(u);
    }
    a && At(() => r());
  }, {
    immediate: !0
  }), he(() => e.activatorProps, () => {
    r();
  }), Ut(() => {
    s();
  });
  function r() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : l(), d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    a && yg(a, ke(o.value, d));
  }
  function s() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : l(), d = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    a && bg(a, ke(o.value, d));
  }
  function l() {
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : e.activator;
    const d = Pf(a, t);
    return i.value = (d == null ? void 0 : d.nodeType) === Node.ELEMENT_NODE ? d : void 0, i.value;
  }
}
function Pf(e, t) {
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
function d_() {
  if (!Re) return pe(!1);
  const {
    ssr: e
  } = Kp();
  if (e) {
    const t = pe(!1);
    return $n(() => {
      t.value = !0;
    }), t;
  } else
    return pe(!0);
}
const f_ = W({
  eager: Boolean
}, "lazy");
function m_(e, t) {
  const n = pe(!1), i = y(() => n.value || e.eager || t.value);
  he(t, () => n.value = !0);
  function o() {
    e.eager || (n.value = !1);
  }
  return {
    isBooted: n,
    hasContent: i,
    onAfterLeave: o
  };
}
function Af() {
  const t = Ue("useScopeId").vnode.scopeId;
  return {
    scopeId: t ? {
      [t]: ""
    } : void 0
  };
}
const wu = Symbol.for("vuetify:stack"), Ui = tt([]);
function v_(e, t, n) {
  const i = Ue("useStack"), o = !n, r = He(wu, void 0), s = tt({
    activeChildren: /* @__PURE__ */ new Set()
  });
  ht(wu, s);
  const l = pe(+t.value);
  di(e, () => {
    var c;
    const u = (c = Ui.at(-1)) == null ? void 0 : c[1];
    l.value = u ? u + 10 : +t.value, o && Ui.push([i.uid, l.value]), r == null || r.activeChildren.add(i.uid), Ut(() => {
      if (o) {
        const m = Q(Ui).findIndex((v) => v[0] === i.uid);
        Ui.splice(m, 1);
      }
      r == null || r.activeChildren.delete(i.uid);
    });
  });
  const a = pe(!0);
  o && bn(() => {
    var c;
    const u = ((c = Ui.at(-1)) == null ? void 0 : c[0]) === i.uid;
    setTimeout(() => a.value = u);
  });
  const d = y(() => !s.activeChildren.size);
  return {
    globalTop: po(a),
    localTop: d,
    stackStyles: y(() => ({
      zIndex: l.value
    }))
  };
}
function h_(e) {
  return {
    teleportTarget: y(() => {
      const n = e();
      if (n === !0 || !Re) return;
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
function g_() {
  return !0;
}
function If(e, t, n) {
  if (!e || $f(e, n) === !1) return !1;
  const i = yd(t);
  if (typeof ShadowRoot < "u" && i instanceof ShadowRoot && i.host === e.target) return !1;
  const o = (typeof n.value == "object" && n.value.include || (() => []))();
  return o.push(t), !o.some((r) => r == null ? void 0 : r.contains(e.target));
}
function $f(e, t) {
  return (typeof t.value == "object" && t.value.closeConditional || g_)(e);
}
function p_(e, t, n) {
  const i = typeof n.value == "function" ? n.value : n.value.handler;
  e.shadowTarget = e.target, t._clickOutside.lastMousedownWasOutside && If(e, t, n) && setTimeout(() => {
    $f(e, n) && i && i(e);
  }, 0);
}
function Su(e, t) {
  const n = yd(e);
  t(document), typeof ShadowRoot < "u" && n instanceof ShadowRoot && t(n);
}
const y_ = {
  // [data-app] may not be found
  // if using bind, inserted makes
  // sure that the root element is
  // available, iOS does not support
  // clicks on body
  mounted(e, t) {
    const n = (o) => p_(o, e, t), i = (o) => {
      e._clickOutside.lastMousedownWasOutside = If(o, e, t);
    };
    Su(e, (o) => {
      o.addEventListener("click", n, !0), o.addEventListener("mousedown", i, !0);
    }), e._clickOutside || (e._clickOutside = {
      lastMousedownWasOutside: !1
    }), e._clickOutside[t.instance.$.uid] = {
      onClick: n,
      onMousedown: i
    };
  },
  beforeUnmount(e, t) {
    e._clickOutside && (Su(e, (n) => {
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
function b_(e) {
  const {
    modelValue: t,
    color: n,
    ...i
  } = e;
  return f(ci, {
    name: "fade-transition",
    appear: !0
  }, {
    default: () => [e.modelValue && f("div", ke({
      class: ["v-overlay__scrim", e.color.backgroundColorClasses.value],
      style: e.color.backgroundColorStyles.value
    }, i), null)]
  });
}
const Mf = W({
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
  ...a_(),
  ...ye(),
  ..._n(),
  ...f_(),
  ...Yb(),
  ...e_(),
  ...Je(),
  ...So()
}, "VOverlay"), Rs = le()({
  name: "VOverlay",
  directives: {
    ClickOutside: y_
  },
  inheritAttrs: !1,
  props: {
    _disableGlobalStack: Boolean,
    ...Mf()
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
    const r = Ue("VOverlay"), s = ce(), l = ce(), a = ce(), d = it(e, "modelValue"), u = y({
      get: () => d.value,
      set: (Y) => {
        Y && e.disabled || (d.value = Y);
      }
    }), {
      themeClasses: c
    } = at(e), {
      rtlClasses: m,
      isRtl: v
    } = tn(), {
      hasContent: h,
      onAfterLeave: g
    } = m_(e, u), S = Tt(y(() => typeof e.scrim == "string" ? e.scrim : null)), {
      globalTop: k,
      localTop: O,
      stackStyles: P
    } = v_(u, oe(e, "zIndex"), e._disableGlobalStack), {
      activatorEl: M,
      activatorRef: x,
      target: N,
      targetEl: $,
      targetRef: C,
      activatorEvents: V,
      contentEvents: L,
      scrimEvents: A
    } = u_(e, {
      isActive: u,
      isTop: O,
      contentEl: a
    }), {
      teleportTarget: E
    } = h_(() => {
      var $e, ut, Ye;
      const Y = e.attach || e.contained;
      if (Y) return Y;
      const de = (($e = M == null ? void 0 : M.value) == null ? void 0 : $e.getRootNode()) || ((Ye = (ut = r.proxy) == null ? void 0 : ut.$el) == null ? void 0 : Ye.getRootNode());
      return de instanceof ShadowRoot ? de : !1;
    }), {
      dimensionStyles: D
    } = wn(e), B = d_(), {
      scopeId: Z
    } = Af();
    he(() => e.disabled, (Y) => {
      Y && (u.value = !1);
    });
    const {
      contentStyles: ee,
      updateLocation: X
    } = qb(e, {
      isRtl: v,
      contentEl: a,
      target: N,
      isActive: u
    });
    t_(e, {
      root: s,
      contentEl: a,
      targetEl: $,
      isActive: u,
      updateLocation: X
    });
    function q(Y) {
      o("click:outside", Y), e.persistent ? Oe() : u.value = !1;
    }
    function be(Y) {
      return u.value && k.value && // If using scrim, only close if clicking on it rather than anything opened on top
      (!e.scrim || Y.target === l.value || Y instanceof MouseEvent && Y.shadowTarget === l.value);
    }
    Re && he(u, (Y) => {
      Y ? window.addEventListener("keydown", _e) : window.removeEventListener("keydown", _e);
    }, {
      immediate: !0
    }), yt(() => {
      Re && window.removeEventListener("keydown", _e);
    });
    function _e(Y) {
      var de, $e;
      Y.key === "Escape" && k.value && (e.persistent ? Oe() : (u.value = !1, (de = a.value) != null && de.contains(document.activeElement) && (($e = M.value) == null || $e.focus())));
    }
    const me = Ty();
    di(() => e.closeOnBack, () => {
      Dy(me, (Y) => {
        k.value && u.value ? (Y(!1), e.persistent ? Oe() : u.value = !1) : Y();
      });
    });
    const ie = ce();
    he(() => u.value && (e.absolute || e.contained) && E.value == null, (Y) => {
      if (Y) {
        const de = Yg(s.value);
        de && de !== document.scrollingElement && (ie.value = de.scrollTop);
      }
    });
    function Oe() {
      e.noClickAnimation || a.value && _i(a.value, [{
        transformOrigin: "center"
      }, {
        transform: "scale(1.03)"
      }, {
        transformOrigin: "center"
      }], {
        duration: 150,
        easing: cr
      });
    }
    function Qe() {
      o("afterEnter");
    }
    function et() {
      g(), o("afterLeave");
    }
    return ge(() => {
      var Y;
      return f(Ne, null, [(Y = n.activator) == null ? void 0 : Y.call(n, {
        isActive: u.value,
        targetRef: C,
        props: ke({
          ref: x
        }, V.value, e.activatorProps)
      }), B.value && h.value && f(sv, {
        disabled: !E.value,
        to: E.value
      }, {
        default: () => [f("div", ke({
          class: ["v-overlay", {
            "v-overlay--absolute": e.absolute || e.contained,
            "v-overlay--active": u.value,
            "v-overlay--contained": e.contained
          }, c.value, m.value, e.class],
          style: [P.value, {
            "--v-overlay-opacity": e.opacity,
            top: re(ie.value)
          }, e.style],
          ref: s
        }, Z, i), [f(b_, ke({
          color: S,
          modelValue: u.value && !!e.scrim,
          ref: l
        }, A.value), null), f(dn, {
          appear: !0,
          persisted: !0,
          transition: e.transition,
          target: N.value,
          onAfterEnter: Qe,
          onAfterLeave: et
        }, {
          default: () => {
            var de;
            return [Nt(f("div", ke({
              ref: a,
              class: ["v-overlay__content", e.contentClass],
              style: [D.value, ee.value]
            }, L.value, e.contentProps), [(de = n.default) == null ? void 0 : de.call(n, {
              isActive: u
            })]), [[Fn, u.value], [Ii("click-outside"), {
              handler: q,
              closeConditional: be,
              include: () => [M.value]
            }]])];
          }
        })])]
      })]);
    }), {
      activatorEl: M,
      scrimEl: l,
      target: N,
      animateClick: Oe,
      contentEl: a,
      globalTop: k,
      localTop: O,
      updateLocation: X
    };
  }
}), Ff = W({
  fullscreen: Boolean,
  retainFocus: {
    type: Boolean,
    default: !0
  },
  scrollable: Boolean,
  ...Mf({
    origin: "center center",
    scrollStrategy: "block",
    transition: {
      component: nb
    },
    zIndex: 2400
  })
}, "VDialog"), Zn = le()({
  name: "VDialog",
  props: Ff(),
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
    const o = it(e, "modelValue"), {
      scopeId: r
    } = Af(), s = ce();
    function l(u) {
      var v, h;
      const c = u.relatedTarget, m = u.target;
      if (c !== m && ((v = s.value) != null && v.contentEl) && // We're the topmost dialog
      ((h = s.value) != null && h.globalTop) && // It isn't the document or the dialog body
      ![document, s.value.contentEl].includes(m) && // It isn't inside the dialog body
      !s.value.contentEl.contains(m)) {
        const g = ad(s.value.contentEl);
        if (!g.length) return;
        const S = g[0], k = g[g.length - 1];
        c === S ? k.focus() : S.focus();
      }
    }
    yt(() => {
      document.removeEventListener("focusin", l);
    }), Re && he(() => o.value && e.retainFocus, (u) => {
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
    return he(o, async (u) => {
      var c;
      u || (await At(), (c = s.value.activatorEl) == null || c.focus({
        preventScroll: !0
      }));
    }), ge(() => {
      const u = Rs.filterProps(e), c = ke({
        "aria-haspopup": "dialog"
      }, e.activatorProps), m = ke({
        tabindex: -1
      }, e.contentProps);
      return f(Rs, ke({
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
          for (var v = arguments.length, h = new Array(v), g = 0; g < v; g++)
            h[g] = arguments[g];
          return f(ot, {
            root: "VDialog"
          }, {
            default: () => {
              var S;
              return [(S = i.default) == null ? void 0 : S.call(i, ...h)];
            }
          });
        }
      });
    }), Ll({}, s);
  }
}), __ = {
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
}, w_ = { class: "px-4 py-2" }, S_ = { class: "px-4 py-2" }, E_ = { class: "my-2" };
function C_(e, t, n, i, o, r) {
  return ve(), Ee(Ft, null, {
    default: _(() => [
      f(Si, { class: "text-center" }, {
        default: _(() => t[14] || (t[14] = [
          J(" 消息 ")
        ])),
        _: 1
      }),
      we("div", w_, [
        f(Ft, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "用户信息"
        }, {
          default: _(() => [
            f(si, null, {
              default: _(() => [
                f(Fe, {
                  class: "text-right",
                  onClick: r.alert_avatar
                }, {
                  prepend: _(() => t[15] || (t[15] = [
                    we("span", null, "头像", -1)
                  ])),
                  append: _(() => [
                    f(Pi, {
                      image: n.user.avatar
                    }, null, 8, ["image"])
                  ]),
                  _: 1
                }, 8, ["onClick"]),
                f(Fe, {
                  class: "text-right",
                  title: n.user.email
                }, {
                  prepend: _(() => t[16] || (t[16] = [
                    we("span", null, "邮箱", -1)
                  ])),
                  _: 1
                }, 8, ["title"]),
                f(Fe, {
                  class: "text-right",
                  onClick: t[0] || (t[0] = (s) => e.editNickname = !0),
                  title: n.user.nickname
                }, {
                  prepend: _(() => t[17] || (t[17] = [
                    we("span", null, "昵称", -1)
                  ])),
                  append: _(() => [
                    f(We, null, {
                      default: _(() => t[18] || (t[18] = [
                        J("mdi-chevron-right")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["title"]),
                f(Fe, {
                  class: "text-right",
                  onClick: t[1] || (t[1] = (s) => e.editPassword = !0),
                  title: "(点击更改)",
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: _(() => t[19] || (t[19] = [
                    we("span", null, "密码", -1)
                  ])),
                  _: 1
                }),
                f(Fe, {
                  class: "text-right",
                  onClick: t[2] || (t[2] = (s) => e.checkLogout = !0),
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: _(() => t[20] || (t[20] = [
                    we("span", null, "退出登录", -1)
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
      we("div", S_, [
        f(Ft, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "章评互动信息"
        }, {
          default: _(() => [
            n.messages.length === 0 ? (ve(), Ee(si, {
              key: 0,
              density: "compact",
              class: "mr-4"
            }, {
              default: _(() => [
                f(Fe, { class: "my-4" }, {
                  default: _(() => [
                    f(Il, { class: "text-center" }, {
                      default: _(() => t[21] || (t[21] = [
                        J("无新的互动消息")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })) : cn("", !0),
            f(si, {
              id: "book-comments",
              density: "compact",
              class: "mr-4"
            }, {
              default: _(() => [
                (ve(!0), qn(Ne, null, ki(n.messages, (s) => (ve(), Ee(Fe, {
                  key: s.id,
                  class: "pr-0 align-self-start mb-4",
                  "prepend-avatar": s.avatar,
                  subtitle: s.nickName + " @《宿命之环》"
                }, {
                  default: _(() => [
                    we("div", E_, Ke(r.thumb_or_content(s)), 1),
                    f(Ft, {
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
      f(Zn, {
        modelValue: e.editAvatar,
        "onUpdate:modelValue": t[3] || (t[3] = (s) => e.editAvatar = s),
        persistent: ""
      }, {
        default: _(() => [
          f(Yi)
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Zn, {
        modelValue: e.editNickname,
        "onUpdate:modelValue": t[6] || (t[6] = (s) => e.editNickname = s),
        persistent: ""
      }, {
        default: _(() => [
          f(Ft, null, {
            default: _(() => [
              f(Si, { class: "text-center" }, {
                default: _(() => t[22] || (t[22] = [
                  J("修改昵称")
                ])),
                _: 1
              }),
              f(Vi, null, {
                default: _(() => [
                  f(Zt, {
                    modelValue: e.newNickname,
                    "onUpdate:modelValue": t[4] || (t[4] = (s) => e.newNickname = s),
                    label: "新昵称"
                  }, null, 8, ["modelValue"]),
                  e.alert.msg ? (ve(), Ee(Yi, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: _(() => [
                      J(Ke(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : cn("", !0)
                ]),
                _: 1
              }),
              f(xi, null, {
                default: _(() => [
                  f(ae, {
                    text: "",
                    onClick: t[5] || (t[5] = (s) => e.editNickname = !1)
                  }, {
                    default: _(() => t[23] || (t[23] = [
                      J("取消")
                    ])),
                    _: 1
                  }),
                  f(ae, {
                    text: "",
                    onClick: r.saveNickname
                  }, {
                    default: _(() => t[24] || (t[24] = [
                      J("保存")
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
      f(Zn, {
        modelValue: e.editPassword,
        "onUpdate:modelValue": t[11] || (t[11] = (s) => e.editPassword = s),
        persistent: "",
        "z-index": "2999"
      }, {
        default: _(() => [
          f(Ft, null, {
            default: _(() => [
              f(Si, { class: "text-center" }, {
                default: _(() => t[25] || (t[25] = [
                  J("修改密码")
                ])),
                _: 1
              }),
              f(Vi, null, {
                default: _(() => [
                  f(Zt, {
                    modelValue: e.oldPassword,
                    "onUpdate:modelValue": t[7] || (t[7] = (s) => e.oldPassword = s),
                    label: "当前密码"
                  }, null, 8, ["modelValue"]),
                  f(Zt, {
                    modelValue: e.newPassword,
                    "onUpdate:modelValue": t[8] || (t[8] = (s) => e.newPassword = s),
                    label: "新密码",
                    rules: [e.rules.pass]
                  }, null, 8, ["modelValue", "rules"]),
                  f(Zt, {
                    modelValue: e.examPassword,
                    "onUpdate:modelValue": t[9] || (t[9] = (s) => e.examPassword = s),
                    label: "确认密码",
                    rules: [r.double_check_password]
                  }, null, 8, ["modelValue", "rules"]),
                  e.alert.msg ? (ve(), Ee(Yi, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: _(() => [
                      J(Ke(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : cn("", !0)
                ]),
                _: 1
              }),
              f(xi, null, {
                default: _(() => [
                  f(ae, {
                    text: "",
                    onClick: t[10] || (t[10] = (s) => e.editPassword = !1)
                  }, {
                    default: _(() => t[26] || (t[26] = [
                      J("取消")
                    ])),
                    _: 1
                  }),
                  f(ae, {
                    text: "",
                    onClick: r.savePassword
                  }, {
                    default: _(() => t[27] || (t[27] = [
                      J("保存")
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
      f(Zn, {
        modelValue: e.checkLogout,
        "onUpdate:modelValue": t[13] || (t[13] = (s) => e.checkLogout = s),
        persistent: ""
      }, {
        default: _(() => [
          f(Ft, null, {
            default: _(() => [
              f(Si, { class: "text-center" }, {
                default: _(() => t[28] || (t[28] = [
                  J("请确认")
                ])),
                _: 1
              }),
              f(Vi, null, {
                default: _(() => [
                  t[29] || (t[29] = J(" 是否要退出登录？ ")),
                  e.alert.msg ? (ve(), Ee(Yi, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: _(() => [
                      J(Ke(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : cn("", !0)
                ]),
                _: 1
              }),
              f(xi, null, {
                default: _(() => [
                  f(ae, {
                    text: "",
                    onClick: t[12] || (t[12] = (s) => e.checkLogout = !1)
                  }, {
                    default: _(() => t[30] || (t[30] = [
                      J("取消")
                    ])),
                    _: 1
                  }),
                  f(ae, {
                    text: "",
                    onClick: r.do_logout
                  }, {
                    default: _(() => t[31] || (t[31] = [
                      J("确认")
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
const Lf = /* @__PURE__ */ mi(__, [["render", C_], ["__scopeId", "data-v-924d6d99"]]), k_ = W({
  ...ye(),
  ...$b()
}, "VForm"), as = le()({
  name: "VForm",
  props: k_(),
  emits: {
    "update:modelValue": (e) => !0,
    submit: (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: i
    } = t;
    const o = Mb(e), r = ce();
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
    }), Ll(o, r);
  }
}), N_ = {
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
function x_(e, t, n, i, o, r) {
  return ve(), Ee(Ft, { title: "登录到书评系统" }, {
    default: _(() => [
      f(mn),
      f(Xd, null, {
        default: _(() => [
          e.mode == "login" ? (ve(), Ee(as, {
            key: 0,
            onSubmit: Jr(r.do_login, ["prevent"])
          }, {
            default: _(() => [
              f(Zt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[0] || (t[0] = (s) => e.email = s),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              f(Zt, {
                "prepend-icon": "mdi-lock",
                modelValue: e.password,
                "onUpdate:modelValue": t[1] || (t[1] = (s) => e.password = s),
                label: "密码",
                type: "password"
              }, null, 8, ["modelValue"]),
              f(ae, {
                type: "submit",
                color: "primary"
              }, {
                default: _(() => t[8] || (t[8] = [
                  J("登录")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "forget" ? (ve(), Ee(as, {
            key: 1,
            onSubmit: Jr(r.do_reset, ["prevent"])
          }, {
            default: _(() => [
              f(Zt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[2] || (t[2] = (s) => e.email = s),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              f(ae, {
                type: "submit",
                color: "red"
              }, {
                default: _(() => t[9] || (t[9] = [
                  J("重置密码")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "signup" ? (ve(), Ee(as, {
            key: 2,
            ref: "form",
            onSubmit: Jr(r.do_signup, ["prevent"])
          }, {
            default: _(() => [
              f(Zt, {
                required: "",
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[3] || (t[3] = (s) => e.email = s),
                label: "邮箱",
                type: "text",
                autocomplete: "new-email",
                rules: [e.rules.email]
              }, null, 8, ["modelValue", "rules"]),
              f(Zt, {
                required: "",
                "prepend-icon": "mdi-guy-fawkes-mask",
                modelValue: e.nickname,
                "onUpdate:modelValue": t[4] || (t[4] = (s) => e.nickname = s),
                label: "昵称",
                type: "text",
                autocomplete: "new-nickname",
                rules: [e.rules.nick]
              }, null, 8, ["modelValue", "rules"]),
              f(ae, {
                type: "submit",
                color: "green"
              }, {
                default: _(() => t[10] || (t[10] = [
                  J("注册")
                ])),
                _: 1
              }),
              t[11] || (t[11] = we("p", { class: "text-small" }, " * 账号密码将随机生成，并发往邮箱", -1))
            ]),
            _: 1
          }, 8, ["onSubmit"])) : cn("", !0)
        ]),
        _: 1
      }),
      e.alert.msg ? (ve(), Ee(Yi, {
        key: 0,
        type: e.alert.type
      }, {
        default: _(() => [
          J(Ke(e.alert.msg), 1)
        ]),
        _: 1
      }, 8, ["type"])) : cn("", !0),
      f(mn),
      f(xi, null, {
        default: _(() => [
          e.mode == "login" ? (ve(), Ee(ae, {
            key: 0,
            onClick: t[5] || (t[5] = (s) => e.mode = "forget"),
            text: "忘记密码?"
          })) : cn("", !0),
          e.mode != "login" ? (ve(), Ee(ae, {
            key: 1,
            onClick: t[6] || (t[6] = (s) => e.mode = "login"),
            text: "登录账号"
          })) : cn("", !0),
          f(uf),
          f(ae, {
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
const Bf = /* @__PURE__ */ mi(N_, [["render", x_]]), V_ = {
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
      const t = (o) => o ? o.split("#")[0] : "", n = t(this.currentChapter.href), i = t(e.href);
      return n === i;
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
function O_(e, t, n, i, o, r) {
  return ve(), Ee(si, {
    "onClick:select": r.click_toc,
    ref: "tocList"
  }, {
    default: _(() => [
      f(gr, null, {
        activator: _(({ props: s }) => [
          f(Fe, ke(s, { title: "书籍信息" }), null, 16)
        ]),
        default: _(() => [
          (ve(!0), qn(Ne, null, ki(r.meta_items, (s) => (ve(), Ee(Fe, {
            key: s.title,
            title: s.title,
            subtitle: s.subtitle,
            lines: "3"
          }, null, 8, ["title", "subtitle"]))), 128))
        ]),
        _: 1
      }),
      f(mn),
      (ve(!0), qn(Ne, null, ki(n.toc_items, (s, l) => (ve(), qn(Ne, null, [
        s.subitems.length == 0 ? (ve(), Ee(Fe, {
          key: 0,
          "prepend-icon": "mdi-book-open-page-variant-outline",
          title: s.label,
          value: s.href,
          class: li({ "current-chapter": r.isCurrentChapter(s) }),
          ref_for: !0,
          ref: "listItem"
        }, null, 8, ["title", "value", "class"])) : (ve(), Ee(gr, {
          key: s.href
        }, {
          activator: _(({ props: a }) => [
            f(Fe, ke({ ref_for: !0 }, a, {
              "prepend-icon": "mdi-book-open-page-variant-outline",
              title: s.label,
              value: s.href,
              class: { "current-chapter": r.isCurrentChapter(s) },
              ref_for: !0,
              ref: "listItem"
            }), null, 16, ["title", "value", "class"])
          ]),
          default: _(() => [
            (ve(!0), qn(Ne, null, ki(s.subitems, (a, d) => (ve(), Ee(Fe, {
              key: a.href,
              title: a.label,
              value: a.href,
              class: li({ "current-chapter": r.isCurrentChapter(a) }),
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
const Rf = /* @__PURE__ */ mi(V_, [["render", O_], ["__scopeId", "data-v-f081fe9b"]]), Bl = Symbol.for("vuetify:v-slider");
function T_(e, t, n) {
  const i = n === "vertical", o = t.getBoundingClientRect(), r = "touches" in e ? e.touches[0] : e;
  return i ? r.clientY - (o.top + o.height / 2) : r.clientX - (o.left + o.width / 2);
}
function D_(e, t) {
  return "touches" in e && e.touches.length ? e.touches[0][t] : "changedTouches" in e && e.changedTouches.length ? e.changedTouches[0][t] : e[t];
}
const P_ = W({
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
  ...En({
    elevation: 2
  }),
  ripple: {
    type: Boolean,
    default: !0
  }
}, "Slider"), A_ = (e) => {
  const t = y(() => parseFloat(e.min)), n = y(() => parseFloat(e.max)), i = y(() => +e.step > 0 ? parseFloat(e.step) : 0), o = y(() => Math.max(Aa(i.value), Aa(t.value)));
  function r(s) {
    if (s = parseFloat(s), i.value <= 0) return s;
    const l = An(s, t.value, n.value), a = t.value % i.value, d = Math.round((l - a) / i.value) * i.value + a;
    return parseFloat(Math.min(d, n.value).toFixed(o.value));
  }
  return {
    min: t,
    max: n,
    step: i,
    decimals: o,
    roundValue: r
  };
}, I_ = (e) => {
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
  } = tn(), a = oe(t, "reverse"), d = y(() => t.direction === "vertical"), u = y(() => d.value !== a.value), {
    min: c,
    max: m,
    step: v,
    decimals: h,
    roundValue: g
  } = n, S = y(() => parseInt(t.thumbSize, 10)), k = y(() => parseInt(t.tickSize, 10)), O = y(() => parseInt(t.trackSize, 10)), P = y(() => (m.value - c.value) / v.value), M = oe(t, "disabled"), x = y(() => t.error || t.disabled ? void 0 : t.thumbColor ?? t.color), N = y(() => t.error || t.disabled ? void 0 : t.trackColor ?? t.color), $ = y(() => t.error || t.disabled ? void 0 : t.trackFillColor ?? t.color), C = pe(!1), V = pe(0), L = ce(), A = ce();
  function E(Y) {
    var b;
    const de = t.direction === "vertical", $e = de ? "top" : "left", ut = de ? "height" : "width", Ye = de ? "clientY" : "clientX", {
      [$e]: Hn,
      [ut]: xo
    } = (b = L.value) == null ? void 0 : b.$el.getBoundingClientRect(), Vo = D_(Y, Ye);
    let p = Math.min(Math.max((Vo - Hn - V.value) / xo, 0), 1) || 0;
    return (de ? u.value : u.value !== l.value) && (p = 1 - p), g(c.value + p * (m.value - c.value));
  }
  const D = (Y) => {
    r({
      value: E(Y)
    }), C.value = !1, V.value = 0;
  }, B = (Y) => {
    A.value = s(Y), A.value && (A.value.focus(), C.value = !0, A.value.contains(Y.target) ? V.value = T_(Y, A.value, t.direction) : (V.value = 0, o({
      value: E(Y)
    })), i({
      value: E(Y)
    }));
  }, Z = {
    passive: !0,
    capture: !0
  };
  function ee(Y) {
    o({
      value: E(Y)
    });
  }
  function X(Y) {
    Y.stopPropagation(), Y.preventDefault(), D(Y), window.removeEventListener("mousemove", ee, Z), window.removeEventListener("mouseup", X);
  }
  function q(Y) {
    var de;
    D(Y), window.removeEventListener("touchmove", ee, Z), (de = Y.target) == null || de.removeEventListener("touchend", q);
  }
  function be(Y) {
    var de;
    B(Y), window.addEventListener("touchmove", ee, Z), (de = Y.target) == null || de.addEventListener("touchend", q, {
      passive: !1
    });
  }
  function _e(Y) {
    Y.preventDefault(), B(Y), window.addEventListener("mousemove", ee, Z), window.addEventListener("mouseup", X, {
      passive: !1
    });
  }
  const me = (Y) => {
    const de = (Y - c.value) / (m.value - c.value) * 100;
    return An(isNaN(de) ? 0 : de, 0, 100);
  }, ie = oe(t, "showTicks"), Oe = y(() => ie.value ? t.ticks ? Array.isArray(t.ticks) ? t.ticks.map((Y) => ({
    value: Y,
    position: me(Y),
    label: Y.toString()
  })) : Object.keys(t.ticks).map((Y) => ({
    value: parseFloat(Y),
    position: me(parseFloat(Y)),
    label: t.ticks[Y]
  })) : P.value !== 1 / 0 ? ml(P.value + 1).map((Y) => {
    const de = c.value + Y * v.value;
    return {
      value: de,
      position: me(de)
    };
  }) : [] : []), Qe = y(() => Oe.value.some((Y) => {
    let {
      label: de
    } = Y;
    return !!de;
  })), et = {
    activeThumbRef: A,
    color: oe(t, "color"),
    decimals: h,
    disabled: M,
    direction: oe(t, "direction"),
    elevation: oe(t, "elevation"),
    hasLabels: Qe,
    isReversed: a,
    indexFromEnd: u,
    min: c,
    max: m,
    mousePressed: C,
    numTicks: P,
    onSliderMousedown: _e,
    onSliderTouchstart: be,
    parsedTicks: Oe,
    parseMouseMove: E,
    position: me,
    readonly: oe(t, "readonly"),
    rounded: oe(t, "rounded"),
    roundValue: g,
    showTicks: ie,
    startOffset: V,
    step: v,
    thumbSize: S,
    thumbColor: x,
    thumbLabel: oe(t, "thumbLabel"),
    ticks: oe(t, "ticks"),
    tickSize: k,
    trackColor: N,
    trackContainerRef: L,
    trackFillColor: $,
    trackSize: O,
    vertical: d
  };
  return ht(Bl, et), et;
}, $_ = W({
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
  ...ye()
}, "VSliderThumb"), M_ = le()({
  name: "VSliderThumb",
  directives: {
    Ripple: Fr
  },
  props: $_(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: i
    } = t;
    const o = He(Bl), {
      isRtl: r,
      rtlClasses: s
    } = tn();
    if (!o) throw new Error("[Vuetify] v-slider-thumb must be used inside v-slider or v-range-slider");
    const {
      thumbColor: l,
      step: a,
      disabled: d,
      thumbSize: u,
      thumbLabel: c,
      direction: m,
      isReversed: v,
      vertical: h,
      readonly: g,
      elevation: S,
      mousePressed: k,
      decimals: O,
      indexFromEnd: P
    } = o, M = y(() => d.value ? void 0 : S.value), {
      elevationClasses: x
    } = Cn(M), {
      textColorClasses: N,
      textColorStyles: $
    } = zt(l), {
      pageup: C,
      pagedown: V,
      end: L,
      home: A,
      left: E,
      right: D,
      down: B,
      up: Z
    } = ag, ee = [C, V, L, A, E, D, B, Z], X = y(() => a.value ? [1, 2, 3] : [1, 5, 10]);
    function q(_e, me) {
      if (!ee.includes(_e.key)) return;
      _e.preventDefault();
      const ie = a.value || 0.1, Oe = (e.max - e.min) / ie;
      if ([E, D, B, Z].includes(_e.key)) {
        const et = (h.value ? [r.value ? E : D, v.value ? B : Z] : P.value !== r.value ? [E, Z] : [D, Z]).includes(_e.key) ? 1 : -1, Y = _e.shiftKey ? 2 : _e.ctrlKey ? 1 : 0;
        me = me + et * ie * X.value[Y];
      } else if (_e.key === A)
        me = e.min;
      else if (_e.key === L)
        me = e.max;
      else {
        const Qe = _e.key === V ? 1 : -1;
        me = me - Qe * ie * (Oe > 100 ? Oe / 10 : 10);
      }
      return Math.max(e.min, Math.min(e.max, me));
    }
    function be(_e) {
      const me = q(_e, e.modelValue);
      me != null && i("update:modelValue", me);
    }
    return ge(() => {
      const _e = re(P.value ? 100 - e.position : e.position, "%");
      return f("div", {
        class: ["v-slider-thumb", {
          "v-slider-thumb--focused": e.focused,
          "v-slider-thumb--pressed": e.focused && k.value
        }, e.class, s.value],
        style: [{
          "--v-slider-thumb-position": _e,
          "--v-slider-thumb-size": re(u.value)
        }, e.style],
        role: "slider",
        tabindex: d.value ? -1 : 0,
        "aria-label": e.name,
        "aria-valuemin": e.min,
        "aria-valuemax": e.max,
        "aria-valuenow": e.modelValue,
        "aria-readonly": !!g.value,
        "aria-orientation": m.value,
        onKeydown: g.value ? void 0 : be
      }, [f("div", {
        class: ["v-slider-thumb__surface", N.value, x.value],
        style: {
          ...$.value
        }
      }, null), Nt(f("div", {
        class: ["v-slider-thumb__ripple", N.value],
        style: $.value
      }, null), [[Ii("ripple"), e.ripple, null, {
        circle: !0,
        center: !0
      }]]), f(ib, {
        origin: "bottom center"
      }, {
        default: () => {
          var me;
          return [Nt(f("div", {
            class: "v-slider-thumb__label-container"
          }, [f("div", {
            class: ["v-slider-thumb__label"]
          }, [f("div", null, [((me = n["thumb-label"]) == null ? void 0 : me.call(n, {
            modelValue: e.modelValue
          })) ?? e.modelValue.toFixed(a.value ? O.value : 1)])])]), [[Fn, c.value && e.focused || c.value === "always"]])];
        }
      })]);
    }), {};
  }
}), F_ = W({
  start: {
    type: Number,
    required: !0
  },
  stop: {
    type: Number,
    required: !0
  },
  ...ye()
}, "VSliderTrack"), L_ = le()({
  name: "VSliderTrack",
  props: F_(),
  emits: {},
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = He(Bl);
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
      max: h,
      indexFromEnd: g
    } = i, {
      roundedClasses: S
    } = _t(s), {
      backgroundColorClasses: k,
      backgroundColorStyles: O
    } = Tt(u), {
      backgroundColorClasses: P,
      backgroundColorStyles: M
    } = Tt(d), x = y(() => `inset-${m.value ? "block" : "inline"}-${g.value ? "end" : "start"}`), N = y(() => m.value ? "height" : "width"), $ = y(() => ({
      [x.value]: "0%",
      [N.value]: "100%"
    })), C = y(() => e.stop - e.start), V = y(() => ({
      [x.value]: re(e.start, "%"),
      [N.value]: re(C.value, "%")
    })), L = y(() => l.value ? (m.value ? r.value.slice().reverse() : r.value).map((E, D) => {
      var Z;
      const B = E.value !== v.value && E.value !== h.value ? re(E.position, "%") : void 0;
      return f("div", {
        key: E.value,
        class: ["v-slider-track__tick", {
          "v-slider-track__tick--filled": E.position >= e.start && E.position <= e.stop,
          "v-slider-track__tick--first": E.value === v.value,
          "v-slider-track__tick--last": E.value === h.value
        }],
        style: {
          [x.value]: B
        }
      }, [(E.label || n["tick-label"]) && f("div", {
        class: "v-slider-track__tick-label"
      }, [((Z = n["tick-label"]) == null ? void 0 : Z.call(n, {
        tick: E,
        index: D
      })) ?? E.label])]);
    }) : []);
    return ge(() => f("div", {
      class: ["v-slider-track", S.value, e.class],
      style: [{
        "--v-slider-track-size": re(c.value),
        "--v-slider-tick-size": re(a.value)
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
      class: ["v-slider-track__fill", k.value],
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
}), B_ = W({
  ...$l(),
  ...P_(),
  ...Fl(),
  modelValue: {
    type: [Number, String],
    default: 0
  }
}, "VSlider"), R_ = le()({
  name: "VSlider",
  props: B_(),
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
    const o = ce(), {
      rtlClasses: r
    } = tn(), s = A_(e), l = it(e, "modelValue", void 0, (N) => s.roundValue(N ?? s.min.value)), {
      min: a,
      max: d,
      mousePressed: u,
      roundValue: c,
      onSliderMousedown: m,
      onSliderTouchstart: v,
      trackContainerRef: h,
      position: g,
      hasLabels: S,
      readonly: k
    } = I_({
      props: e,
      steps: s,
      onSliderStart: () => {
        i("start", l.value);
      },
      onSliderEnd: (N) => {
        let {
          value: $
        } = N;
        const C = c($);
        l.value = C, i("end", C);
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
    } = Ml(e), x = y(() => g(l.value));
    return ge(() => {
      const N = pr.filterProps(e), $ = !!(e.label || n.label || n.prepend);
      return f(pr, ke({
        class: ["v-slider", {
          "v-slider--has-labels": !!n["tick-label"] || S.value,
          "v-slider--focused": O.value,
          "v-slider--pressed": u.value,
          "v-slider--disabled": e.disabled
        }, r.value, e.class],
        style: e.style
      }, N, {
        focused: O.value
      }), {
        ...n,
        prepend: $ ? (C) => {
          var V, L;
          return f(Ne, null, [((V = n.label) == null ? void 0 : V.call(n, C)) ?? (e.label ? f(Cf, {
            id: C.id.value,
            class: "v-slider__label",
            text: e.label
          }, null) : void 0), (L = n.prepend) == null ? void 0 : L.call(n, C)]);
        } : void 0,
        default: (C) => {
          let {
            id: V,
            messagesId: L
          } = C;
          return f("div", {
            class: "v-slider__container",
            onMousedown: k.value ? void 0 : m,
            onTouchstartPassive: k.value ? void 0 : v
          }, [f("input", {
            id: V.value,
            name: e.name || V.value,
            disabled: !!e.disabled,
            readonly: !!e.readonly,
            tabindex: "-1",
            value: l.value
          }, null), f(L_, {
            ref: h,
            start: 0,
            stop: x.value
          }, {
            "tick-label": n["tick-label"]
          }), f(M_, {
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
}), H_ = {
  name: "Settings",
  computed: {},
  mounted: function() {
    var e, t, n, i, o, r, s, l;
    this.opt = {
      flow: ((e = this.settings) == null ? void 0 : e.flow) || this.opt.flow,
      theme: ((t = this.settings) == null ? void 0 : t.theme) || this.opt.theme,
      theme_mode: ((n = this.settings) == null ? void 0 : n.theme_mode) || this.opt.theme_mode,
      font_size: ((i = this.settings) == null ? void 0 : i.font_size) || this.opt.font_size,
      line_height: ((o = this.settings) == null ? void 0 : o.line_height) || this.opt.line_height,
      letter_spacing: ((r = this.settings) == null ? void 0 : r.letter_spacing) || this.opt.letter_spacing,
      brightness: ((s = this.settings) == null ? void 0 : s.brightness) || this.opt.brightness,
      show_comments: ((l = this.settings) == null ? void 0 : l.show_comments) ?? this.opt.show_comments
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
}, j_ = { class: "d-inline-blockx text-center" }, z_ = { class: "d-inline-blockx text-center" }, U_ = { class: "d-inline-blockx text-center" };
function W_(e, t, n, i, o, r) {
  return ve(), Ee(si, { density: "compact" }, {
    default: _(() => [
      f(Fe, { class: "my-2" }, {
        default: _(() => [
          f(Mt, { class: "align-center" }, {
            default: _(() => [
              f(xe, { cols: "2" }, {
                default: _(() => t[15] || (t[15] = [
                  we("span", null, "亮度", -1)
                ])),
                _: 1
              }),
              f(xe, { cols: "9" }, {
                default: _(() => [
                  f(R_, {
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
      f(Fe, { class: "my-2" }, {
        default: _(() => [
          f(Mt, { class: "align-center gx-3" }, {
            default: _(() => [
              f(xe, { cols: "2" }, {
                default: _(() => t[16] || (t[16] = [
                  we("span", { class: "text-justify" }, "字体", -1)
                ])),
                _: 1
              }),
              f(xe, { cols: "2" }, {
                default: _(() => [
                  f(ae, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[2] || (t[2] = (s) => r.set_and_emit("font_size", e.opt.font_size - 2))
                  }, {
                    default: _(() => t[17] || (t[17] = [
                      J("A-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(xe, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: _(() => [
                  we("span", j_, Ke(e.opt.font_size), 1)
                ]),
                _: 1
              }),
              f(xe, { cols: "3" }, {
                default: _(() => [
                  f(ae, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[3] || (t[3] = (s) => r.set_and_emit("font_size", e.opt.font_size + 2))
                  }, {
                    default: _(() => t[18] || (t[18] = [
                      J("A+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(xe, { cols: "3" }, {
                default: _(() => [
                  f(ae, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[4] || (t[4] = (s) => r.set_and_emit("font_size", 18))
                  }, {
                    default: _(() => t[19] || (t[19] = [
                      J("默认")
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
      f(Fe, { class: "my-2" }, {
        default: _(() => [
          f(Mt, { class: "align-center" }, {
            default: _(() => [
              f(xe, { cols: "2" }, {
                default: _(() => t[20] || (t[20] = [
                  we("span", null, "行距", -1)
                ])),
                _: 1
              }),
              f(xe, { cols: "2" }, {
                default: _(() => [
                  f(ae, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[5] || (t[5] = (s) => r.set_and_emit("line_height", e.opt.line_height - 0.1))
                  }, {
                    default: _(() => t[21] || (t[21] = [
                      J("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(xe, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: _(() => [
                  we("span", z_, Ke(e.opt.line_height.toFixed(1)), 1)
                ]),
                _: 1
              }),
              f(xe, { cols: "3" }, {
                default: _(() => [
                  f(ae, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[6] || (t[6] = (s) => r.set_and_emit("line_height", e.opt.line_height + 0.1))
                  }, {
                    default: _(() => t[22] || (t[22] = [
                      J("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(xe, { cols: "3" }, {
                default: _(() => [
                  f(ae, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[7] || (t[7] = (s) => r.set_and_emit("line_height", 1.5))
                  }, {
                    default: _(() => t[23] || (t[23] = [
                      J("默认")
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
      f(Fe, { class: "my-2" }, {
        default: _(() => [
          f(Mt, { class: "align-center" }, {
            default: _(() => [
              f(xe, { cols: "2" }, {
                default: _(() => t[24] || (t[24] = [
                  we("span", null, "字间距", -1)
                ])),
                _: 1
              }),
              f(xe, { cols: "2" }, {
                default: _(() => [
                  f(ae, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[8] || (t[8] = (s) => r.set_and_emit("letter_spacing", e.opt.letter_spacing - 1))
                  }, {
                    default: _(() => t[25] || (t[25] = [
                      J("-")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(xe, {
                cols: "2",
                class: "d-flex align-center justify-center"
              }, {
                default: _(() => [
                  we("span", U_, Ke(e.opt.letter_spacing) + "px", 1)
                ]),
                _: 1
              }),
              f(xe, { cols: "3" }, {
                default: _(() => [
                  f(ae, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[9] || (t[9] = (s) => r.set_and_emit("letter_spacing", e.opt.letter_spacing + 1))
                  }, {
                    default: _(() => t[26] || (t[26] = [
                      J("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              f(xe, { cols: "3" }, {
                default: _(() => [
                  f(ae, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[10] || (t[10] = (s) => r.set_and_emit("letter_spacing", 0))
                  }, {
                    default: _(() => t[27] || (t[27] = [
                      J("默认")
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
      f(Fe, { class: "my-2" }, {
        default: _(() => [
          f(Mt, { class: "align-center" }, {
            default: _(() => [
              f(xe, { cols: "2" }, {
                default: _(() => t[28] || (t[28] = [
                  we("span", null, "翻页", -1)
                ])),
                _: 1
              }),
              f(xe, { cols: "10" }, {
                default: _(() => [
                  f(wi, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: _(() => [
                      f(ae, {
                        active: e.opt.flow == "paginated",
                        onClick: t[11] || (t[11] = (s) => r.set_and_emit("flow", "paginated"))
                      }, {
                        default: _(() => t[29] || (t[29] = [
                          J("左右点击")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(ae, {
                        active: e.opt.flow == "scrolled",
                        onClick: t[12] || (t[12] = (s) => r.set_and_emit("flow", "scrolled"))
                      }, {
                        default: _(() => t[30] || (t[30] = [
                          J("上下滑动")
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
      f(Fe, { class: "my-2" }, {
        default: _(() => [
          f(Mt, { class: "align-center" }, {
            default: _(() => [
              f(xe, { cols: "2" }, {
                default: _(() => t[31] || (t[31] = [
                  we("span", null, "动画*", -1)
                ])),
                _: 1
              }),
              f(xe, { cols: "10" }, {
                default: _(() => [
                  f(wi, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: _(() => [
                      f(ae, {
                        active: e.opt.animation == "none"
                      }, {
                        default: _(() => t[32] || (t[32] = [
                          J("无动画")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(ae, {
                        active: e.opt.animation == "swap"
                      }, {
                        default: _(() => t[33] || (t[33] = [
                          J("平移")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(ae, {
                        active: e.opt.animation == "paper"
                      }, {
                        default: _(() => t[34] || (t[34] = [
                          J("仿真")
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
      f(Fe, { class: "my-2" }, {
        default: _(() => [
          f(Mt, { class: "align-center" }, {
            default: _(() => [
              f(xe, { cols: "2" }, {
                default: _(() => t[35] || (t[35] = [
                  we("span", null, "背景*", -1)
                ])),
                _: 1
              }),
              f(xe, { cols: "10" }, {
                default: _(() => [
                  f(wi, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: _(() => [
                      f(ae, {
                        active: e.opt.background == "p0"
                      }, {
                        default: _(() => t[36] || (t[36] = [
                          J("主题图0")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(ae, {
                        active: e.opt.background == "p1"
                      }, {
                        default: _(() => t[37] || (t[37] = [
                          J("主题图1")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(ae, {
                        active: e.opt.background == "p2"
                      }, {
                        default: _(() => t[38] || (t[38] = [
                          J("主题图2")
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
      f(Fe, { class: "my-2" }, {
        default: _(() => [
          f(Mt, { style: { "margin-bottom": "1px" } }, {
            default: _(() => [
              f(xe, { cols: "2" }, {
                default: _(() => t[39] || (t[39] = [
                  we("span", { density: "compact" }, "章评*", -1)
                ])),
                _: 1
              }),
              f(xe, { cols: "10" }, {
                default: _(() => [
                  f(wi, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: _(() => [
                      f(ae, {
                        active: e.opt.show_comments == !0,
                        onClick: t[13] || (t[13] = (s) => r.set_and_emit("show_comments", !0))
                      }, {
                        default: _(() => t[40] || (t[40] = [
                          J("开启")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      f(ae, {
                        active: e.opt.show_comments == !1,
                        onClick: t[14] || (t[14] = (s) => r.set_and_emit("show_comments", !1))
                      }, {
                        default: _(() => t[41] || (t[41] = [
                          J("关闭")
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
      f(Fe, { class: "my-2" }, {
        default: _(() => [
          f(Mt, { style: { "margin-bottom": "1px" } }, {
            default: _(() => [
              f(xe, { cols: "2" }, {
                default: _(() => t[42] || (t[42] = [
                  we("span", { density: "compact" }, "主题", -1)
                ])),
                _: 1
              }),
              (ve(!0), qn(Ne, null, ki(e.themes, (s) => (ve(), Ee(xe, { cols: "2" }, {
                default: _(() => [
                  f(ae, {
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
      f(mn),
      f(Fe, {
        class: "my-2",
        title: "带 * 号功能都在开发中"
      })
    ]),
    _: 1
  });
}
const Hf = /* @__PURE__ */ mi(H_, [["render", W_]]), K_ = W({
  ...ye(),
  ...iy({
    fullHeight: !0
  }),
  ...Je()
}, "VApp"), G_ = le()({
  name: "VApp",
  props: K_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = at(e), {
      layoutClasses: o,
      getLayoutItem: r,
      items: s,
      layoutRef: l
    } = sy(e), {
      rtlClasses: a
    } = tn();
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
}), Y_ = W({
  text: String,
  ...ye(),
  ...ze()
}, "VToolbarTitle"), q_ = le()({
  name: "VToolbarTitle",
  props: Y_(),
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
}), Z_ = [null, "prominent", "default", "comfortable", "compact"], jf = W({
  absolute: Boolean,
  collapse: Boolean,
  color: String,
  density: {
    type: String,
    default: "default",
    validator: (e) => Z_.includes(e)
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
  ...Bn(),
  ...ye(),
  ...En(),
  ...bt(),
  ...ze({
    tag: "header"
  }),
  ...Je()
}, "VToolbar"), Hs = le()({
  name: "VToolbar",
  props: jf(),
  setup(e, t) {
    var v;
    let {
      slots: n
    } = t;
    const {
      backgroundColorClasses: i,
      backgroundColorStyles: o
    } = Tt(oe(e, "color")), {
      borderClasses: r
    } = Rn(e), {
      elevationClasses: s
    } = Cn(e), {
      roundedClasses: l
    } = _t(e), {
      themeClasses: a
    } = at(e), {
      rtlClasses: d
    } = tn(), u = pe(!!(e.extended || (v = n.extension) != null && v.call(n))), c = y(() => parseInt(Number(e.height) + (e.density === "prominent" ? Number(e.height) : 0) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0), 10)), m = y(() => u.value ? parseInt(Number(e.extensionHeight) + (e.density === "prominent" ? Number(e.extensionHeight) : 0) - (e.density === "comfortable" ? 4 : 0) - (e.density === "compact" ? 8 : 0), 10) : 0);
    return $i({
      VBtn: {
        variant: "text"
      }
    }), ge(() => {
      var k;
      const h = !!(e.title || n.title), g = !!(n.image || e.image), S = (k = n.extension) == null ? void 0 : k.call(n);
      return u.value = !!(e.extended || S), f(e.tag, {
        class: ["v-toolbar", {
          "v-toolbar--absolute": e.absolute,
          "v-toolbar--collapse": e.collapse,
          "v-toolbar--flat": e.flat,
          "v-toolbar--floating": e.floating,
          [`v-toolbar--density-${e.density}`]: !0
        }, i.value, r.value, s.value, l.value, a.value, d.value, e.class],
        style: [o.value, e.style]
      }, {
        default: () => [g && f("div", {
          key: "image",
          class: "v-toolbar__image"
        }, [n.image ? f(ot, {
          key: "image-defaults",
          disabled: !e.image,
          defaults: {
            VImg: {
              cover: !0,
              src: e.image
            }
          }
        }, n.image) : f(Sl, {
          key: "image-img",
          cover: !0,
          src: e.image
        }, null)]), f(ot, {
          defaults: {
            VTabs: {
              height: re(c.value)
            }
          }
        }, {
          default: () => {
            var O, P, M;
            return [f("div", {
              class: "v-toolbar__content",
              style: {
                height: re(c.value)
              }
            }, [n.prepend && f("div", {
              class: "v-toolbar__prepend"
            }, [(O = n.prepend) == null ? void 0 : O.call(n)]), h && f(q_, {
              key: "title",
              text: e.title
            }, {
              text: n.title
            }), (P = n.default) == null ? void 0 : P.call(n), n.append && f("div", {
              class: "v-toolbar__append"
            }, [(M = n.append) == null ? void 0 : M.call(n)])])];
          }
        }), f(ot, {
          defaults: {
            VTabs: {
              height: re(m.value)
            }
          }
        }, {
          default: () => [f(mf, null, {
            default: () => [u.value && f("div", {
              class: "v-toolbar__extension",
              style: {
                height: re(m.value)
              }
            }, [S])]
          })]
        })]
      });
    }), {
      contentHeight: c,
      extensionHeight: m
    };
  }
}), X_ = W({
  scrollTarget: {
    type: String
  },
  scrollThreshold: {
    type: [String, Number],
    default: 300
  }
}, "scroll");
function J_(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const {
    canScroll: n
  } = t;
  let i = 0, o = 0;
  const r = ce(null), s = pe(0), l = pe(0), a = pe(0), d = pe(!1), u = pe(!1), c = y(() => Number(e.scrollThreshold)), m = y(() => An((c.value - s.value) / c.value || 0)), v = () => {
    const h = r.value;
    if (!h || n && !n.value) return;
    i = s.value, s.value = "window" in h ? h.pageYOffset : h.scrollTop;
    const g = h instanceof Window ? document.documentElement.scrollHeight : h.scrollHeight;
    if (o !== g) {
      o = g;
      return;
    }
    u.value = s.value < i, a.value = Math.abs(s.value - c.value);
  };
  return he(u, () => {
    l.value = l.value || s.value;
  }), he(d, () => {
    l.value = 0;
  }), $n(() => {
    he(() => e.scrollTarget, (h) => {
      var S;
      const g = h ? document.querySelector(h) : window;
      if (!g) {
        fn(`Unable to locate element with identifier ${h}`);
        return;
      }
      g !== r.value && ((S = r.value) == null || S.removeEventListener("scroll", v), r.value = g, r.value.addEventListener("scroll", v, {
        passive: !0
      }));
    }, {
      immediate: !0
    });
  }), yt(() => {
    var h;
    (h = r.value) == null || h.removeEventListener("scroll", v);
  }), n && he(n, v, {
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
const Q_ = W({
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
  ...jf(),
  ...Td(),
  ...X_(),
  height: {
    type: [Number, String],
    default: 64
  }
}, "VAppBar"), e0 = le()({
  name: "VAppBar",
  props: Q_(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = ce(), o = it(e, "modelValue"), r = y(() => {
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
    } = J_(e, {
      canScroll: s
    }), c = y(() => r.value.hide || r.value.fullyHide), m = y(() => e.collapse || r.value.collapse && (r.value.inverted ? u.value > 0 : u.value === 0)), v = y(() => e.flat || r.value.fullyHide && !o.value || r.value.elevate && (r.value.inverted ? l.value > 0 : l.value === 0)), h = y(() => r.value.fadeImage ? r.value.inverted ? 1 - u.value : u.value : void 0), g = y(() => {
      var M, x;
      if (r.value.hide && r.value.inverted) return 0;
      const O = ((M = i.value) == null ? void 0 : M.contentHeight) ?? 0, P = ((x = i.value) == null ? void 0 : x.extensionHeight) ?? 0;
      return c.value ? l.value < a.value || r.value.fullyHide ? O + P : O : O + P;
    });
    di(y(() => !!e.scrollBehavior), () => {
      bn(() => {
        c.value ? r.value.inverted ? o.value = l.value > a.value : o.value = d.value || l.value < a.value : o.value = !0;
      });
    });
    const {
      ssrBootStyles: S
    } = Lr(), {
      layoutItemStyles: k
    } = Dd({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: oe(e, "location"),
      layoutSize: g,
      elementSize: pe(void 0),
      active: o,
      absolute: oe(e, "absolute")
    });
    return ge(() => {
      const O = Hs.filterProps(e);
      return f(Hs, ke({
        ref: i,
        class: ["v-app-bar", {
          "v-app-bar--bottom": e.location === "bottom"
        }, e.class],
        style: [{
          ...k.value,
          "--v-toolbar-image-opacity": h.value,
          height: void 0,
          ...S.value
        }, e.style]
      }, O, {
        collapse: m.value,
        flat: v.value
      }), n);
    }), {};
  }
}), t0 = W({
  bordered: Boolean,
  color: String,
  content: [Number, String],
  dot: Boolean,
  floating: Boolean,
  icon: je,
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
  ...ye(),
  ...ko({
    location: "top end"
  }),
  ...bt(),
  ...ze(),
  ...Je(),
  ...So({
    transition: "scale-rotate-transition"
  })
}, "VBadge"), n0 = le()({
  name: "VBadge",
  inheritAttrs: !1,
  props: t0(),
  setup(e, t) {
    const {
      backgroundColorClasses: n,
      backgroundColorStyles: i
    } = Tt(oe(e, "color")), {
      roundedClasses: o
    } = _t(e), {
      t: r
    } = _l(), {
      textColorClasses: s,
      textColorStyles: l
    } = zt(oe(e, "textColor")), {
      themeClasses: a
    } = xd(), {
      locationStyles: d
    } = No(e, !0, (u) => (e.floating ? e.dot ? 2 : 4 : e.dot ? 8 : 12) + (["top", "bottom"].includes(u) ? +(e.offsetY ?? 0) : ["left", "right"].includes(u) ? +(e.offsetX ?? 0) : 0));
    return ge(() => {
      const u = Number(e.content), c = !e.max || isNaN(u) ? e.content : u <= +e.max ? u : `${e.max}+`, [m, v] = Vs(t.attrs, ["aria-atomic", "aria-label", "aria-live", "role", "title"]);
      return f(e.tag, ke({
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
          }, [(g = (h = t.slots).default) == null ? void 0 : g.call(h), f(dn, {
            transition: e.transition
          }, {
            default: () => {
              var S, k;
              return [Nt(f("span", ke({
                class: ["v-badge__badge", a.value, n.value, o.value, s.value],
                style: [i.value, l.value, e.inline ? {} : d.value],
                "aria-atomic": "true",
                "aria-label": r(e.label, u),
                "aria-live": "polite",
                role: "status"
              }, m), [e.dot ? void 0 : t.slots.badge ? (k = (S = t.slots).badge) == null ? void 0 : k.call(S) : e.icon ? f(We, {
                icon: e.icon
              }, null) : c]), [[Fn, e.modelValue]])];
            }
          })])];
        }
      });
    }), {};
  }
}), i0 = W({
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
  ...Bn(),
  ...ye(),
  ...nn(),
  ...En(),
  ...bt(),
  ...Td({
    name: "bottom-navigation"
  }),
  ...ze({
    tag: "header"
  }),
  ...Fd({
    selectedClass: "v-btn--selected"
  }),
  ...Je()
}, "VBottomNavigation"), o0 = le()({
  name: "VBottomNavigation",
  props: i0(),
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
    } = xd(), {
      borderClasses: o
    } = Rn(e), {
      backgroundColorClasses: r,
      backgroundColorStyles: s
    } = Tt(oe(e, "bgColor")), {
      densityClasses: l
    } = Sn(e), {
      elevationClasses: a
    } = Cn(e), {
      roundedClasses: d
    } = _t(e), {
      ssrBootStyles: u
    } = Lr(), c = y(() => Number(e.height) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0)), m = it(e, "active", e.active), {
      layoutItemStyles: v
    } = Dd({
      id: e.name,
      order: y(() => parseInt(e.order, 10)),
      position: y(() => "bottom"),
      layoutSize: y(() => m.value ? c.value : 0),
      elementSize: c,
      active: m,
      absolute: oe(e, "absolute")
    });
    return Ld(e, El), $i({
      VBtn: {
        baseColor: oe(e, "baseColor"),
        color: oe(e, "color"),
        density: oe(e, "density"),
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
        height: re(c.value)
      }, u.value, e.style]
    }, {
      default: () => [n.default && f("div", {
        class: "v-bottom-navigation__content"
      }, [n.default()])]
    })), {};
  }
}), r0 = W({
  inset: Boolean,
  ...Ff({
    transition: "bottom-sheet-transition"
  })
}, "VBottomSheet"), Wi = le()({
  name: "VBottomSheet",
  props: r0(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const i = it(e, "modelValue");
    return ge(() => {
      const o = Zn.filterProps(e);
      return f(Zn, ke(o, {
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
}), s0 = W({
  scrollable: Boolean,
  ...ye(),
  ..._n(),
  ...ze({
    tag: "main"
  })
}, "VMain"), l0 = le()({
  name: "VMain",
  props: s0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      dimensionStyles: i
    } = wn(e), {
      mainStyles: o
    } = oy(), {
      ssrBootStyles: r
    } = Lr();
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
}), a0 = {
  name: "EpubReader",
  components: {
    Settings: Hf,
    BookToc: Rf,
    Guest: Bf,
    UserCenter: Lf,
    BookComments: Of
  },
  props: ["book_url", "display_url", "debug", "themes_css"],
  computed: {
    switch_theme_icon: function() {
      return ["white", "eyecare"].includes(this.settings.theme) ? "mdi-weather-night" : "mdi-weather-sunny";
    },
    switch_theme_text: function() {
      return ["white", "eyecare"].includes(this.settings.theme) ? "夜晚" : "白天";
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
    switch_theme: function() {
      ["white", "eyecare"].includes(this.settings.theme) ? (this.settings.app_theme = "dark", this.settings.theme_mode = "night", this.settings.theme = this.settings.theme_night || "grey") : (this.settings.app_theme = "light", this.settings.theme_mode = "day", this.settings.theme = this.settings.theme_day || "white"), this.rendition.themes.select(this.settings.theme), this.save_settings();
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
      for (const i in e)
        this.settings[i] = e[i];
      const t = e.theme_mode, n = "theme_" + t;
      if (this.settings[n] = this.settings.theme, this.rendition.themes.select(this.settings.theme), this.settings.app_theme = t == "day" ? "light" : "dark", e.brightness !== void 0) {
        const i = e.brightness / 100;
        document.getElementById("reader").style.filter = `brightness(${i})`;
      }
      if (e.font_size !== void 0 && this.rendition.themes.fontSize(e.font_size + "px"), e.line_height !== void 0 || e.letter_spacing !== void 0) {
        const i = e.line_height !== void 0 ? e.line_height : this.settings.line_height, o = e.letter_spacing !== void 0 ? e.letter_spacing : this.settings.letter_spacing;
        this.rendition.themes.default({
          "body, body *": {
            "line-height": `${i} !important`,
            "letter-spacing": `${o}px !important`
          }
        });
      }
      this.save_settings();
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
        if (i.subitems !== void 0 && i.subitems.length > 0) {
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
      console.log("selected elem =", i);
      const o = new ePub.CFI(i, t.cfiBase), r = this.find_toc(o, t);
      console.log("cfi = ", o, "toc =", r);
      const s = this.count_distinct_between(r.elem, i);
      console.log("selected segment_id = ", s), this.selected_location = {
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
      document.addEventListener("keyup", this.on_keyup), this.rendition.on("keyup", this.on_keyup), this.rendition.on("click", this.on_click_content), this.rendition.on("selected", this.on_select_content), this.rendition.on("locationChanged", this.on_location_changed), this.rendition.on("mousedown", this.on_mousedown), this.rendition.on("mouseup", this.on_mouseup), this.rendition.on("resized", this.on_resized), document.addEventListener("fullscreenchange", this.on_fullscreen_change), document.addEventListener("webkitfullscreenchange", this.on_fullscreen_change), document.addEventListener("mozfullscreenchange", this.on_fullscreen_change), document.addEventListener("MSFullscreenChange", this.on_fullscreen_change), this.debug_signals();
    },
    init_themes: function() {
      console.log("load themes from:", this.themes_css), this.rendition.themes.register("white", this.themes_css), this.rendition.themes.register("dark", this.themes_css), this.rendition.themes.register("grey", this.themes_css), this.rendition.themes.register("brown", this.themes_css), this.rendition.themes.register("eyecare", this.themes_css), this.rendition.themes.select(this.settings.theme);
    },
    on_resized: function() {
      console.log("Reader resized");
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
      try {
        const t = new ePub.CFI(e.start), n = this.rendition.getContents();
        for (const i of n)
          try {
            const o = this.find_toc(t, i);
            if (o) {
              this.current_toc_title = o.label, this.current_toc = o, this.last_toc_label !== o.label && (this.load_comments_summary(i, o), this.last_toc_label = o.label);
              break;
            }
          } catch (o) {
            console.error("Error processing contents:", o);
          }
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
      if (console.log("添加评论图标和计数器：", t.label.trim()), !!this.settings.show_comments) {
        var n = 0;
        for (var i in t.summary)
          i > n && (n = i);
        for (var o = 0, r = t.elem; o <= n && r; ) {
          const s = r.nodeName.toUpperCase();
          if ((s === "P" || s[0] === "H") && (this.add_icon_into_paragraph(e, r, o, t), o++), r.firstChild)
            r = r.firstChild;
          else if (r.nextSibling)
            r = r.nextSibling;
          else {
            for (; !r.nextSibling && r.parentNode; )
              r = r.parentNode;
            r = r.nextSibling;
          }
        }
        t.icons_rendered = !0;
      }
    },
    add_icon_into_paragraph: function(e, t, n, i) {
      const o = i.summary[n];
      if (o === void 0 || (console.log("添加评论图标：", n, t, o), t.querySelector(".comment-icon")))
        return;
      const r = new ePub.CFI(t, e.cfiBase).toString(), s = o.reviewNum, l = o.is_hot ? "hot-comment" : "", d = e.document.createElement("div");
      d.className = `comment-icon ${l}`, d.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        ${s > 0 ? `<span class="comment-count">${s}</span>` : ""}
      `, (t.style.position === "" || t.style.position === "static") && (t.style.position = "relative"), t.appendChild(d), d.addEventListener("click", (u) => {
        u.stopPropagation(), console.log("点击评论按钮", i.chapter_id, n, r), this.show_selected_comments(i, n, r);
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
          const t = localStorage.getItem(e);
          return this.rendition.display(t || this.display_url);
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
    const e = document.createElement("link");
    e.rel = "stylesheet", e.type = "text/css", e.href = this.themes_css, document.head.appendChild(e);
    const t = localStorage.getItem("readerSettings");
    t && (this.settings = JSON.parse(t), console.log("加载设置：", t)), this.is_debug_signal = this.debug, this.is_debug_click = this.debug, this.loadingTimeout = setTimeout(() => {
      this.loading && (console.warn("电子书加载超时，显示提示框"), this.loading = !1, this.showTimeoutDialog = !0);
    }, 1e4), this.loading = !0, this.$backend("/api/review/me?count=true").then((o) => {
      o.err == "user.need_login" ? this.is_login = !1 : o.err == "ok" ? this.unread_count = o.data.count : o.err === "network_error" && console.log("网络错误，无法获取未读消息数，保持当前登录状态");
    }).catch((o) => {
      console.error("获取未读消息数失败:", o);
    }), this.$backend("/api/user/info").then((o) => {
      o.err == "ok" ? this.user = o.data : o.err === "network_error" ? console.log("网络错误，无法获取用户信息，保持当前状态") : this.user = null;
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
      const r = `/api/review/book?title=${this.book_title}`;
      this.$backend(r).then((s) => {
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
    const i = `lastReadPosition_${this.book_url}`;
    this.rendition.on("relocated", (o) => {
      localStorage.setItem(i, o.start.cfi);
    }), this.book.ready.then(() => {
      const o = localStorage.getItem(i);
      return this.rendition.display(o || this.display_url);
    }).then(() => {
      clearTimeout(this.loadingTimeout), this.loading = !1;
      const o = this.settings.brightness / 100;
      document.getElementById("reader").style.filter = `brightness(${o})`, this.rendition.themes.fontSize(this.settings.font_size + "px"), this.rendition.themes.default({
        "body, body *": {
          "line-height": `${this.settings.line_height} !important`,
          "letter-spacing": `${this.settings.letter_spacing}px !important`
        }
      });
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
    showTimeoutDialog: !1
  })
}, u0 = {
  id: "status-bar-left",
  class: "align-start"
}, c0 = {
  id: "status-bar-right",
  class: "align-end"
}, d0 = { class: "progress-bar-container" };
function f0(e, t, n, i, o, r) {
  const s = Hf, l = Rf, a = Bf, d = Lf, u = Of;
  return ve(), Ee(G_, {
    theme: e.settings.app_theme,
    "full-height": "",
    density: "compact"
  }, {
    default: _(() => [
      e.menu.show_navbar ? (ve(), Ee(e0, {
        key: 0,
        density: "compact"
      }, {
        prepend: _(() => [
          f(ae, {
            icon: "",
            title: e.is_debug_signal ? "返回首页" : "章评"
          }, {
            default: _(() => [
              f(We, null, {
                default: _(() => [
                  J(Ke(e.is_debug_signal ? "mdi-arrow-left" : "mdi-candle"), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["title"])
        ]),
        default: _(() => [
          J(" " + Ke(e.is_debug_signal ? e.alert_msg : e.book_title) + " ", 1),
          f(uf),
          f(ae, {
            icon: "",
            title: "更多选项"
          }, {
            default: _(() => [
              f(We, null, {
                default: _(() => t[15] || (t[15] = [
                  J("mdi-dots-vertical")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : cn("", !0),
      f(o0, {
        modelValue: e.menu.value,
        "onUpdate:modelValue": t[4] || (t[4] = (c) => e.menu.value = c),
        active: e.menu.show_navbar,
        "z-index": "2599"
      }, {
        default: _(() => [
          f(ae, {
            value: "toc",
            onClick: t[0] || (t[0] = (c) => r.set_menu("toc"))
          }, {
            default: _(() => [
              f(We, null, {
                default: _(() => t[16] || (t[16] = [
                  J("mdi-book-open-variant-outline")
                ])),
                _: 1
              }),
              t[17] || (t[17] = we("span", null, "目录", -1))
            ]),
            _: 1
          }),
          f(ae, { onClick: r.switch_theme }, {
            default: _(() => [
              f(We, null, {
                default: _(() => [
                  J(Ke(r.switch_theme_icon), 1)
                ]),
                _: 1
              }),
              we("span", null, Ke(r.switch_theme_text), 1)
            ]),
            _: 1
          }, 8, ["onClick"]),
          f(ae, {
            value: "settings",
            onClick: t[1] || (t[1] = (c) => r.set_menu("settings"))
          }, {
            default: _(() => [
              f(We, null, {
                default: _(() => t[18] || (t[18] = [
                  J("mdi-cog")
                ])),
                _: 1
              }),
              t[19] || (t[19] = we("span", null, "设置", -1))
            ]),
            _: 1
          }),
          f(ae, {
            value: "more",
            onClick: t[2] || (t[2] = (c) => r.set_menu("more"))
          }, {
            default: _(() => [
              e.unread_count ? (ve(), Ee(n0, {
                key: 0,
                color: "error",
                content: e.unread_count
              }, {
                default: _(() => [
                  f(We, null, {
                    default: _(() => t[20] || (t[20] = [
                      J("mdi-account-circle-outline")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["content"])) : (ve(), Ee(We, { key: 1 }, {
                default: _(() => t[21] || (t[21] = [
                  J("mdi-account-circle-outline")
                ])),
                _: 1
              })),
              t[22] || (t[22] = we("span", null, "用户", -1))
            ]),
            _: 1
          }),
          f(ae, {
            value: "ai",
            onClick: t[3] || (t[3] = (c) => r.set_menu("ai"))
          }, {
            default: _(() => [
              f(We, null, {
                default: _(() => t[23] || (t[23] = [
                  J("mdi-face-man-shimmer")
                ])),
                _: 1
              }),
              t[24] || (t[24] = we("span", null, "AI", -1))
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue", "active"]),
      f(Wi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.settings,
        "onUpdate:modelValue": t[5] || (t[5] = (c) => e.menu.panels.settings = c),
        contained: "",
        persistent: "",
        "z-index": "234"
      }, {
        default: _(() => [
          f(s, {
            settings: e.settings,
            onUpdate: r.update_settings
          }, null, 8, ["settings", "onUpdate"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Wi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.toc,
        "onUpdate:modelValue": t[6] || (t[6] = (c) => e.menu.panels.toc = c),
        contained: "",
        "close-on-content-click": "",
        "z-index": "234"
      }, {
        default: _(() => [
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
      f(Wi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.more,
        "onUpdate:modelValue": t[8] || (t[8] = (c) => e.menu.panels.more = c),
        contained: "",
        "z-index": "234"
      }, {
        default: _(() => [
          e.user ? (ve(), Ee(d, {
            key: 1,
            messages: e.comments,
            user: e.user,
            onUpdate: r.on_login_user,
            onLogout: t[7] || (t[7] = (c) => e.user = null)
          }, null, 8, ["messages", "user", "onUpdate"])) : (ve(), Ee(a, {
            key: 0,
            onLogin: r.on_login_user
          }, null, 8, ["onLogin"]))
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Wi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.comments,
        "onUpdate:modelValue": t[10] || (t[10] = (c) => e.menu.panels.comments = c),
        contained: "",
        "z-index": "234"
      }, {
        default: _(() => [
          f(u, {
            login: e.is_login,
            comments: e.comments,
            onClose: t[9] || (t[9] = (c) => r.set_menu("hide")),
            onAdd_review: r.on_add_review
          }, null, 8, ["login", "comments", "onAdd_review"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      f(Wi, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.ai,
        "onUpdate:modelValue": t[11] || (t[11] = (c) => e.menu.panels.ai = c),
        contained: "",
        "z-index": "234"
      }, {
        default: _(() => [
          f(Ft, { title: "开发中" })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      we("div", {
        id: "comments-toolbar",
        style: to(`left: ${e.toolbar_left}px; top: ${e.toolbar_top}px;`)
      }, [
        f(Hs, {
          density: "compact",
          border: "",
          dense: "",
          floating: "",
          elevation: "10",
          rounded: ""
        }, {
          default: _(() => [
            f(ae, { onClick: r.on_click_toolbar_comments }, {
              default: _(() => t[25] || (t[25] = [
                J("发段评")
              ])),
              _: 1
            }, 8, ["onClick"]),
            f(mn, { vertical: "" }),
            f(ae, null, {
              default: _(() => t[26] || (t[26] = [
                J("从这里听")
              ])),
              _: 1
            }),
            f(mn, { vertical: "" }),
            f(ae, null, {
              default: _(() => t[27] || (t[27] = [
                J("复制")
              ])),
              _: 1
            }),
            f(mn, { vertical: "" }),
            f(ae, null, {
              default: _(() => t[28] || (t[28] = [
                J("反馈")
              ])),
              _: 1
            })
          ]),
          _: 1
        })
      ], 4),
      f(l0, {
        id: "main",
        class: "pa-0"
      }, {
        default: _(() => [
          f(Rs, {
            modelValue: e.loading,
            "onUpdate:modelValue": t[12] || (t[12] = (c) => e.loading = c),
            "z-index": "auto",
            class: "align-center justify-center",
            persistent: ""
          }, {
            default: _(() => [
              f(Hd, {
                indeterminate: "",
                size: "64",
                color: "primary"
              })
            ]),
            _: 1
          }, 8, ["modelValue"]),
          f(Zn, {
            modelValue: e.showTimeoutDialog,
            "onUpdate:modelValue": t[14] || (t[14] = (c) => e.showTimeoutDialog = c),
            "max-width": "500px"
          }, {
            default: _(() => [
              f(Ft, null, {
                default: _(() => [
                  f(Si, { class: "text-h5 text-center" }, {
                    default: _(() => t[29] || (t[29] = [
                      J("加载超时")
                    ])),
                    _: 1
                  }),
                  f(Vi, { class: "text-center" }, {
                    default: _(() => t[30] || (t[30] = [
                      J(" 电子书加载超时，可能是网络问题或文件格式不支持。 ")
                    ])),
                    _: 1
                  }),
                  f(xi, { class: "justify-center" }, {
                    default: _(() => [
                      f(ae, {
                        color: "primary",
                        variant: "text",
                        onClick: t[13] || (t[13] = (c) => e.showTimeoutDialog = !1)
                      }, {
                        default: _(() => t[31] || (t[31] = [
                          J(" 关闭 ")
                        ])),
                        _: 1
                      }),
                      f(ae, {
                        color: "primary",
                        variant: "flat",
                        onClick: r.retryLoad
                      }, {
                        default: _(() => t[32] || (t[32] = [
                          J(" 重试 ")
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
          we("div", {
            id: "status-bar-top",
            class: li(e.settings.theme)
          }, [
            we("div", u0, Ke(e.current_toc_title), 1),
            we("div", c0, " (" + Ke(r.readingProgress) + ") ", 1)
          ], 2),
          t[33] || (t[33] = we("div", { id: "reader" }, null, -1)),
          we("div", {
            id: "status-bar-bottom",
            class: li(e.settings.theme)
          }, [
            we("div", d0, [
              we("div", {
                class: "progress-bar",
                style: to({ width: r.readingProgress })
              }, null, 4)
            ])
          ], 2)
        ]),
        _: 1
      })
    ]),
    _: 1
  }, 8, ["theme"]);
}
const m0 = /* @__PURE__ */ mi(a0, [["render", f0]]), v0 = {
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
function h0(e, t, n, i, o, r) {
  const s = m0;
  return ve(), Ee(s, {
    book_url: n.book_url,
    display_url: n.display_url,
    debug: n.debug,
    themes_css: n.themes_css
  }, null, 8, ["book_url", "display_url", "debug", "themes_css"]);
}
const g0 = /* @__PURE__ */ mi(v0, [["render", h0]]);
class p0 {
  constructor(t, n) {
    var i = "https://api.talebook.org";
    const o = Jh(g0, n);
    cy(o, {
      server: n.server || i
    }), o.mount(t);
  }
}
export {
  p0 as Reader
};
