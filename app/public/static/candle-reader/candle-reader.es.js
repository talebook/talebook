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
const Be = Vc.NODE_ENV !== "production" ? Object.freeze({}) : {}, Wo = Vc.NODE_ENV !== "production" ? Object.freeze([]) : [], ct = () => {
}, fv = () => !1, $i = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), bl = (e) => e.startsWith("onUpdate:"), Xe = Object.assign, Sa = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, mv = Object.prototype.hasOwnProperty, De = (e, t) => mv.call(e, t), he = Array.isArray, Co = (e) => Mi(e) === "[object Map]", ql = (e) => Mi(e) === "[object Set]", Ir = (e) => Mi(e) === "[object Date]", Se = (e) => typeof e == "function", Ye = (e) => typeof e == "string", kn = (e) => typeof e == "symbol", $e = (e) => e !== null && typeof e == "object", Ca = (e) => ($e(e) || Se(e)) && Se(e.then) && Se(e.catch), Nc = Object.prototype.toString, Mi = (e) => Nc.call(e), Ea = (e) => Mi(e).slice(8, -1), Tc = (e) => Mi(e) === "[object Object]", xa = (e) => Ye(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, mi = /* @__PURE__ */ Mn(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), vv = /* @__PURE__ */ Mn(
  "bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text,memo"
), Gl = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return (n) => t[n] || (t[n] = e(n));
}, hv = /-(\w)/g, gt = Gl(
  (e) => e.replace(hv, (t, n) => n ? n.toUpperCase() : "")
), gv = /\B([A-Z])/g, no = Gl(
  (e) => e.replace(gv, "-$1").toLowerCase()
), Wt = Gl((e) => e.charAt(0).toUpperCase() + e.slice(1)), po = Gl(
  (e) => e ? `on${Wt(e)}` : ""
), eo = (e, t) => !Object.is(e, t), Ho = (e, ...t) => {
  for (let n = 0; n < e.length; n++)
    e[n](...t);
}, _l = (e, t, n, o = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: o,
    value: n
  });
}, wl = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
}, yv = (e) => {
  const t = Ye(e) ? Number(e) : NaN;
  return isNaN(t) ? e : t;
};
let Ar;
const Fi = () => Ar || (Ar = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function rn(e) {
  if (he(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const o = e[n], i = Ye(o) ? wv(o) : rn(o);
      if (i)
        for (const l in i)
          t[l] = i[l];
    }
    return t;
  } else if (Ye(e) || $e(e))
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
function yn(e) {
  let t = "";
  if (Ye(e))
    t = e;
  else if (he(e))
    for (let n = 0; n < e.length; n++) {
      const o = yn(e[n]);
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
    n = Kl(e[o], t[o]);
  return n;
}
function Kl(e, t) {
  if (e === t) return !0;
  let n = Ir(e), o = Ir(t);
  if (n || o)
    return n && o ? e.getTime() === t.getTime() : !1;
  if (n = kn(e), o = kn(t), n || o)
    return e === t;
  if (n = he(e), o = he(t), n || o)
    return n && o ? Ov(e, t) : !1;
  if (n = $e(e), o = $e(t), n || o) {
    if (!n || !o)
      return !1;
    const i = Object.keys(e).length, l = Object.keys(t).length;
    if (i !== l)
      return !1;
    for (const s in e) {
      const a = e.hasOwnProperty(s), r = t.hasOwnProperty(s);
      if (a && !r || !a && r || !Kl(e[s], t[s]))
        return !1;
    }
  }
  return String(e) === String(t);
}
function Iv(e, t) {
  return e.findIndex((n) => Kl(n, t));
}
const Ic = (e) => !!(e && e.__v_isRef === !0), Ne = (e) => Ye(e) ? e : e == null ? "" : he(e) || $e(e) && (e.toString === Nc || !Se(e.toString)) ? Ic(e) ? Ne(e.value) : JSON.stringify(e, Ac, 2) : String(e), Ac = (e, t) => Ic(t) ? Ac(e, t.value) : Co(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (n, [o, i], l) => (n[ys(o, l) + " =>"] = i, n),
    {}
  )
} : ql(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((n) => ys(n))
} : kn(t) ? ys(t) : $e(t) && !he(t) && !Tc(t) ? String(t) : t, ys = (e, t = "") => {
  var n;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    kn(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e
  );
};
var Le = {};
function qt(e, ...t) {
  console.warn(`[Vue warn] ${e}`, ...t);
}
let St;
class Pc {
  constructor(t = !1) {
    this.detached = t, this._active = !0, this.effects = [], this.cleanups = [], this._isPaused = !1, this.parent = St, !t && St && (this.index = (St.scopes || (St.scopes = [])).push(
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
      const n = St;
      try {
        return St = this, t();
      } finally {
        St = n;
      }
    } else Le.NODE_ENV !== "production" && qt("cannot run an inactive effect scope.");
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    St = this;
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    St = this.parent;
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
function Av() {
  return St;
}
function Bt(e, t = !1) {
  St ? St.cleanups.push(e) : Le.NODE_ENV !== "production" && !t && qt(
    "onScopeDispose() is called when there is no active effect scope to be associated with."
  );
}
let Me;
const ps = /* @__PURE__ */ new WeakSet();
class Dc {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, St && St.active && St.effects.push(this);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, ps.has(this) && (ps.delete(this), this.trigger()));
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
    const t = Me, n = Zt;
    Me = this, Zt = !0;
    try {
      return this.fn();
    } finally {
      Le.NODE_ENV !== "production" && Me !== this && qt(
        "Active effect was not restored correctly - this is likely a Vue internal bug."
      ), Bc(this), Me = t, Zt = n, this.flags &= -3;
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
    this.flags & 64 ? ps.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    js(this) && this.run();
  }
  get dirty() {
    return js(this);
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
function js(e) {
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
  if (e.flags |= 2, t.version > 0 && !e.isSSR && e.deps && !js(e)) {
    e.flags &= -3;
    return;
  }
  const n = Me, o = Zt;
  Me = e, Zt = !0;
  try {
    Fc(e);
    const i = e.fn(e._value);
    (t.version === 0 || eo(i, e._value)) && (e._value = i, t.version++);
  } catch (i) {
    throw t.version++, i;
  } finally {
    Me = n, Zt = o, Bc(e), e.flags &= -3;
  }
}
function Oa(e, t = !1) {
  const { dep: n, prevSub: o, nextSub: i } = e;
  if (o && (o.nextSub = i, e.prevSub = void 0), i && (i.prevSub = o, e.nextSub = void 0), Le.NODE_ENV !== "production" && n.subsHead === e && (n.subsHead = i), n.subs === e && (n.subs = o, !o && n.computed)) {
    n.computed.flags &= -5;
    for (let l = n.computed.deps; l; l = l.nextDep)
      Oa(l, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function Pv(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let Zt = !0;
const Rc = [];
function Fn() {
  Rc.push(Zt), Zt = !1;
}
function Bn() {
  const e = Rc.pop();
  Zt = e === void 0 ? !0 : e;
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
class Ia {
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, Le.NODE_ENV !== "production" && (this.subsHead = void 0);
  }
  track(t) {
    if (!Me || !Zt || Me === this.computed)
      return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== Me)
      n = this.activeLink = new Dv(Me, this), Me.deps ? (n.prevDep = Me.depsTail, Me.depsTail.nextDep = n, Me.depsTail = n) : Me.deps = Me.depsTail = n, Hc(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const o = n.nextDep;
      o.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = o), n.prevDep = Me.depsTail, n.nextDep = void 0, Me.depsTail.nextDep = n, Me.depsTail = n, Me.deps === n && (Me.deps = o);
    }
    return Le.NODE_ENV !== "production" && Me.onTrack && Me.onTrack(
      Xe(
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
      if (Le.NODE_ENV !== "production")
        for (let n = this.subsHead; n; n = n.nextSub)
          n.sub.onTrigger && !(n.sub.flags & 8) && n.sub.onTrigger(
            Xe(
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
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), Le.NODE_ENV !== "production" && e.dep.subsHead === void 0 && (e.dep.subsHead = e), e.dep.subs = e;
  }
}
const kl = /* @__PURE__ */ new WeakMap(), Eo = Symbol(
  Le.NODE_ENV !== "production" ? "Object iterate" : ""
), zs = Symbol(
  Le.NODE_ENV !== "production" ? "Map keys iterate" : ""
), _i = Symbol(
  Le.NODE_ENV !== "production" ? "Array iterate" : ""
);
function ut(e, t, n) {
  if (Zt && Me) {
    let o = kl.get(e);
    o || kl.set(e, o = /* @__PURE__ */ new Map());
    let i = o.get(n);
    i || (o.set(n, i = new Ia()), i.map = o, i.key = n), Le.NODE_ENV !== "production" ? i.track({
      target: e,
      type: t,
      key: n
    }) : i.track();
  }
}
function un(e, t, n, o, i, l) {
  const s = kl.get(e);
  if (!s) {
    bi++;
    return;
  }
  const a = (r) => {
    r && (Le.NODE_ENV !== "production" ? r.trigger({
      target: e,
      type: t,
      key: n,
      newValue: o,
      oldValue: i,
      oldTarget: l
    }) : r.trigger());
  };
  if (Na(), t === "clear")
    s.forEach(a);
  else {
    const r = he(e), f = r && xa(n);
    if (r && n === "length") {
      const u = Number(o);
      s.forEach((d, m) => {
        (m === "length" || m === _i || !kn(m) && m >= u) && a(d);
      });
    } else
      switch ((n !== void 0 || s.has(void 0)) && a(s.get(n)), f && a(s.get(_i)), t) {
        case "add":
          r ? f && a(s.get("length")) : (a(s.get(Eo)), Co(e) && a(s.get(zs)));
          break;
        case "delete":
          r || (a(s.get(Eo)), Co(e) && a(s.get(zs)));
          break;
        case "set":
          Co(e) && a(s.get(Eo));
          break;
      }
  }
  Ta();
}
function $v(e, t) {
  const n = kl.get(e);
  return n && n.get(t);
}
function Bo(e) {
  const t = fe(e);
  return t === e ? t : (ut(t, "iterate", _i), xt(e) ? t : t.map(pt));
}
function Yl(e) {
  return ut(e = fe(e), "iterate", _i), e;
}
const Mv = {
  __proto__: null,
  [Symbol.iterator]() {
    return bs(this, Symbol.iterator, pt);
  },
  concat(...e) {
    return Bo(this).concat(
      ...e.map((t) => he(t) ? Bo(t) : t)
    );
  },
  entries() {
    return bs(this, "entries", (e) => (e[1] = pt(e[1]), e));
  },
  every(e, t) {
    return Nn(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return Nn(this, "filter", e, t, (n) => n.map(pt), arguments);
  },
  find(e, t) {
    return Nn(this, "find", e, t, pt, arguments);
  },
  findIndex(e, t) {
    return Nn(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return Nn(this, "findLast", e, t, pt, arguments);
  },
  findLastIndex(e, t) {
    return Nn(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return Nn(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return _s(this, "includes", e);
  },
  indexOf(...e) {
    return _s(this, "indexOf", e);
  },
  join(e) {
    return Bo(this).join(e);
  },
  // keys() iterator only reads `length`, no optimisation required
  lastIndexOf(...e) {
    return _s(this, "lastIndexOf", e);
  },
  map(e, t) {
    return Nn(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return li(this, "pop");
  },
  push(...e) {
    return li(this, "push", e);
  },
  reduce(e, ...t) {
    return Dr(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return Dr(this, "reduceRight", e, t);
  },
  shift() {
    return li(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return Nn(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return li(this, "splice", e);
  },
  toReversed() {
    return Bo(this).toReversed();
  },
  toSorted(e) {
    return Bo(this).toSorted(e);
  },
  toSpliced(...e) {
    return Bo(this).toSpliced(...e);
  },
  unshift(...e) {
    return li(this, "unshift", e);
  },
  values() {
    return bs(this, "values", pt);
  }
};
function bs(e, t, n) {
  const o = Yl(e), i = o[t]();
  return o !== e && !xt(e) && (i._next = i.next, i.next = () => {
    const l = i._next();
    return l.value && (l.value = n(l.value)), l;
  }), i;
}
const Fv = Array.prototype;
function Nn(e, t, n, o, i, l) {
  const s = Yl(e), a = s !== e && !xt(e), r = s[t];
  if (r !== Fv[t]) {
    const d = r.apply(e, l);
    return a ? pt(d) : d;
  }
  let f = n;
  s !== e && (a ? f = function(d, m) {
    return n.call(this, pt(d), m, e);
  } : n.length > 2 && (f = function(d, m) {
    return n.call(this, d, m, e);
  }));
  const u = r.call(s, f, o);
  return a && i ? i(u) : u;
}
function Dr(e, t, n, o) {
  const i = Yl(e);
  let l = n;
  return i !== e && (xt(e) ? n.length > 3 && (l = function(s, a, r) {
    return n.call(this, s, a, r, e);
  }) : l = function(s, a, r) {
    return n.call(this, s, pt(a), r, e);
  }), i[t](l, ...o);
}
function _s(e, t, n) {
  const o = fe(e);
  ut(o, "iterate", _i);
  const i = o[t](...n);
  return (i === -1 || i === !1) && wi(n[0]) ? (n[0] = fe(n[0]), o[t](...n)) : i;
}
function li(e, t, n = []) {
  Fn(), Na();
  const o = fe(e)[t].apply(e, n);
  return Ta(), Bn(), o;
}
const Bv = /* @__PURE__ */ Mn("__proto__,__v_isRef,__isVue"), jc = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(kn)
);
function Lv(e) {
  kn(e) || (e = String(e));
  const t = fe(this);
  return ut(t, "has", e), t.hasOwnProperty(e);
}
class zc {
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
      return o === (i ? l ? Yc : Kc : l ? Gc : qc).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(o) ? t : void 0;
    const s = he(t);
    if (!i) {
      let r;
      if (s && (r = Mv[n]))
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
      je(t) ? t : o
    );
    return (kn(n) ? jc.has(n) : Bv(n)) || (i || ut(t, "get", n), l) ? a : je(a) ? s && xa(n) ? a : a.value : $e(a) ? i ? Bi(a) : ht(a) : a;
  }
}
class Uc extends zc {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, o, i) {
    let l = t[n];
    if (!this._isShallow) {
      const r = $n(l);
      if (!xt(o) && !$n(o) && (l = fe(l), o = fe(o)), !he(t) && je(l) && !je(o))
        return r ? !1 : (l.value = o, !0);
    }
    const s = he(t) && xa(n) ? Number(n) < t.length : De(t, n), a = Reflect.set(
      t,
      n,
      o,
      je(t) ? t : i
    );
    return t === fe(i) && (s ? eo(o, l) && un(t, "set", n, o, l) : un(t, "add", n, o)), a;
  }
  deleteProperty(t, n) {
    const o = De(t, n), i = t[n], l = Reflect.deleteProperty(t, n);
    return l && o && un(t, "delete", n, void 0, i), l;
  }
  has(t, n) {
    const o = Reflect.has(t, n);
    return (!kn(n) || !jc.has(n)) && ut(t, "has", n), o;
  }
  ownKeys(t) {
    return ut(
      t,
      "iterate",
      he(t) ? "length" : Eo
    ), Reflect.ownKeys(t);
  }
}
class Wc extends zc {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return Le.NODE_ENV !== "production" && qt(
      `Set operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
  deleteProperty(t, n) {
    return Le.NODE_ENV !== "production" && qt(
      `Delete operation on key "${String(n)}" failed: target is readonly.`,
      t
    ), !0;
  }
}
const Rv = /* @__PURE__ */ new Uc(), Hv = /* @__PURE__ */ new Wc(), jv = /* @__PURE__ */ new Uc(!0), zv = /* @__PURE__ */ new Wc(!0), Us = (e) => e, Zi = (e) => Reflect.getPrototypeOf(e);
function Uv(e, t, n) {
  return function(...o) {
    const i = this.__v_raw, l = fe(i), s = Co(l), a = e === "entries" || e === Symbol.iterator && s, r = e === "keys" && s, f = i[e](...o), u = n ? Us : t ? Ws : pt;
    return !t && ut(
      l,
      "iterate",
      r ? zs : Eo
    ), {
      // iterator protocol
      next() {
        const { value: d, done: m } = f.next();
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
function Qi(e) {
  return function(...t) {
    if (Le.NODE_ENV !== "production") {
      const n = t[0] ? `on key "${t[0]}" ` : "";
      qt(
        `${Wt(e)} operation ${n}failed: target is readonly.`,
        fe(this)
      );
    }
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function Wv(e, t) {
  const n = {
    get(i) {
      const l = this.__v_raw, s = fe(l), a = fe(i);
      e || (eo(i, a) && ut(s, "get", i), ut(s, "get", a));
      const { has: r } = Zi(s), f = t ? Us : e ? Ws : pt;
      if (r.call(s, i))
        return f(l.get(i));
      if (r.call(s, a))
        return f(l.get(a));
      l !== s && l.get(i);
    },
    get size() {
      const i = this.__v_raw;
      return !e && ut(fe(i), "iterate", Eo), Reflect.get(i, "size", i);
    },
    has(i) {
      const l = this.__v_raw, s = fe(l), a = fe(i);
      return e || (eo(i, a) && ut(s, "has", i), ut(s, "has", a)), i === a ? l.has(i) : l.has(i) || l.has(a);
    },
    forEach(i, l) {
      const s = this, a = s.__v_raw, r = fe(a), f = t ? Us : e ? Ws : pt;
      return !e && ut(r, "iterate", Eo), a.forEach((u, d) => i.call(l, f(u), f(d), s));
    }
  };
  return Xe(
    n,
    e ? {
      add: Qi("add"),
      set: Qi("set"),
      delete: Qi("delete"),
      clear: Qi("clear")
    } : {
      add(i) {
        !t && !xt(i) && !$n(i) && (i = fe(i));
        const l = fe(this);
        return Zi(l).has.call(l, i) || (l.add(i), un(l, "add", i, i)), this;
      },
      set(i, l) {
        !t && !xt(l) && !$n(l) && (l = fe(l));
        const s = fe(this), { has: a, get: r } = Zi(s);
        let f = a.call(s, i);
        f ? Le.NODE_ENV !== "production" && $r(s, a, i) : (i = fe(i), f = a.call(s, i));
        const u = r.call(s, i);
        return s.set(i, l), f ? eo(l, u) && un(s, "set", i, l, u) : un(s, "add", i, l), this;
      },
      delete(i) {
        const l = fe(this), { has: s, get: a } = Zi(l);
        let r = s.call(l, i);
        r ? Le.NODE_ENV !== "production" && $r(l, s, i) : (i = fe(i), r = s.call(l, i));
        const f = a ? a.call(l, i) : void 0, u = l.delete(i);
        return r && un(l, "delete", i, void 0, f), u;
      },
      clear() {
        const i = fe(this), l = i.size !== 0, s = Le.NODE_ENV !== "production" ? Co(i) ? new Map(i) : new Set(i) : void 0, a = i.clear();
        return l && un(
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
    n[i] = Uv(i, e, t);
  }), n;
}
function Xl(e, t) {
  const n = Wv(e, t);
  return (o, i, l) => i === "__v_isReactive" ? !e : i === "__v_isReadonly" ? e : i === "__v_raw" ? o : Reflect.get(
    De(n, i) && i in o ? n : o,
    i,
    l
  );
}
const qv = {
  get: /* @__PURE__ */ Xl(!1, !1)
}, Gv = {
  get: /* @__PURE__ */ Xl(!1, !0)
}, Kv = {
  get: /* @__PURE__ */ Xl(!0, !1)
}, Yv = {
  get: /* @__PURE__ */ Xl(!0, !0)
};
function $r(e, t, n) {
  const o = fe(n);
  if (o !== n && t.call(e, o)) {
    const i = Ea(e);
    qt(
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
  return $n(e) ? e : Jl(
    e,
    !1,
    Rv,
    qv,
    qc
  );
}
function Zv(e) {
  return Jl(
    e,
    !1,
    jv,
    Gv,
    Gc
  );
}
function Bi(e) {
  return Jl(
    e,
    !0,
    Hv,
    Kv,
    Kc
  );
}
function dn(e) {
  return Jl(
    e,
    !0,
    zv,
    Yv,
    Yc
  );
}
function Jl(e, t, n, o, i) {
  if (!$e(e))
    return Le.NODE_ENV !== "production" && qt(
      `value cannot be made ${t ? "readonly" : "reactive"}: ${String(
        e
      )}`
    ), e;
  if (e.__v_raw && !(t && e.__v_isReactive))
    return e;
  const l = i.get(e);
  if (l)
    return l;
  const s = Jv(e);
  if (s === 0)
    return e;
  const a = new Proxy(
    e,
    s === 2 ? o : n
  );
  return i.set(e, a), a;
}
function xo(e) {
  return $n(e) ? xo(e.__v_raw) : !!(e && e.__v_isReactive);
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
function fe(e) {
  const t = e && e.__v_raw;
  return t ? fe(t) : e;
}
function Xc(e) {
  return !De(e, "__v_skip") && Object.isExtensible(e) && _l(e, "__v_skip", !0), e;
}
const pt = (e) => $e(e) ? ht(e) : e, Ws = (e) => $e(e) ? Bi(e) : e;
function je(e) {
  return e ? e.__v_isRef === !0 : !1;
}
function le(e) {
  return Jc(e, !1);
}
function we(e) {
  return Jc(e, !0);
}
function Jc(e, t) {
  return je(e) ? e : new Qv(e, t);
}
class Qv {
  constructor(t, n) {
    this.dep = new Ia(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : fe(t), this._value = n ? t : pt(t), this.__v_isShallow = n;
  }
  get value() {
    return Le.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, o = this.__v_isShallow || xt(t) || $n(t);
    t = o ? t : fe(t), eo(t, n) && (this._rawValue = t, this._value = o ? t : pt(t), Le.NODE_ENV !== "production" ? this.dep.trigger({
      target: this,
      type: "set",
      key: "value",
      newValue: t,
      oldValue: n
    }) : this.dep.trigger());
  }
}
function fn(e) {
  return je(e) ? e.value : e;
}
const eh = {
  get: (e, t, n) => t === "__v_raw" ? e : fn(Reflect.get(e, t, n)),
  set: (e, t, n, o) => {
    const i = e[t];
    return je(i) && !je(n) ? (i.value = n, !0) : Reflect.set(e, t, n, o);
  }
};
function Zc(e) {
  return xo(e) ? e : new Proxy(e, eh);
}
function Aa(e) {
  Le.NODE_ENV !== "production" && !wi(e) && qt("toRefs() expects a reactive object but received a plain one.");
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
    return $v(fe(this._object), this._key);
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
  return je(e) ? e : Se(e) ? new nh(e) : $e(e) && arguments.length > 1 ? Qc(e, t, n) : le(e);
}
function Qc(e, t, n) {
  const o = e[t];
  return je(o) ? o : new th(e, t, n);
}
class oh {
  constructor(t, n, o) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new Ia(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = bi - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = o;
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
    const t = Le.NODE_ENV !== "production" ? this.dep.track({
      target: this,
      type: "get",
      key: "value"
    }) : this.dep.track();
    return Lc(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter ? this.setter(t) : Le.NODE_ENV !== "production" && qt("Write operation failed: computed value is readonly");
  }
}
function ih(e, t, n = !1) {
  let o, i;
  Se(e) ? o = e : (o = e.get, i = e.set);
  const l = new oh(o, i, n);
  return Le.NODE_ENV !== "production" && t && !n && (l.onTrack = t.onTrack, l.onTrigger = t.onTrigger), l;
}
const el = {}, Sl = /* @__PURE__ */ new WeakMap();
let bo;
function lh(e, t = !1, n = bo) {
  if (n) {
    let o = Sl.get(n);
    o || Sl.set(n, o = []), o.push(e);
  } else Le.NODE_ENV !== "production" && !t && qt(
    "onWatcherCleanup() was called when there was no active watcher to associate with."
  );
}
function sh(e, t, n = Be) {
  const { immediate: o, deep: i, once: l, scheduler: s, augmentJob: a, call: r } = n, f = (x) => {
    (n.onWarn || qt)(
      "Invalid watch source: ",
      x,
      "A watch source can only be a getter/effect function, a ref, a reactive object, or an array of these types."
    );
  }, u = (x) => i ? x : xt(x) || i === !1 || i === 0 ? Dn(x, 1) : Dn(x);
  let d, m, h, v, g = !1, _ = !1;
  if (je(e) ? (m = () => e.value, g = xt(e)) : xo(e) ? (m = () => u(e), g = !0) : he(e) ? (_ = !0, g = e.some((x) => xo(x) || xt(x)), m = () => e.map((x) => {
    if (je(x))
      return x.value;
    if (xo(x))
      return u(x);
    if (Se(x))
      return r ? r(x, 2) : x();
    Le.NODE_ENV !== "production" && f(x);
  })) : Se(e) ? t ? m = r ? () => r(e, 2) : e : m = () => {
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
      return r ? r(e, 3, [v]) : e(v);
    } finally {
      bo = x;
    }
  } : (m = ct, Le.NODE_ENV !== "production" && f(e)), t && i) {
    const x = m, C = i === !0 ? 1 / 0 : i;
    m = () => Dn(x(), C);
  }
  const S = Av(), N = () => {
    d.stop(), S && Sa(S.effects, d);
  };
  if (l && t) {
    const x = t;
    t = (...C) => {
      x(...C), N();
    };
  }
  let A = _ ? new Array(e.length).fill(el) : el;
  const P = (x) => {
    if (!(!(d.flags & 1) || !d.dirty && !x))
      if (t) {
        const C = d.run();
        if (i || g || (_ ? C.some(($, V) => eo($, A[V])) : eo(C, A))) {
          h && h();
          const $ = bo;
          bo = d;
          try {
            const V = [
              C,
              // pass undefined as the old value when it's changed for the first time
              A === el ? void 0 : _ && A[0] === el ? [] : A,
              v
            ];
            r ? r(t, 3, V) : (
              // @ts-expect-error
              t(...V)
            ), A = C;
          } finally {
            bo = $;
          }
        }
      } else
        d.run();
  };
  return a && a(P), d = new Dc(m), d.scheduler = s ? () => s(P, !1) : P, v = (x) => lh(x, !1, d), h = d.onStop = () => {
    const x = Sl.get(d);
    if (x) {
      if (r)
        r(x, 4);
      else
        for (const C of x) C();
      Sl.delete(d);
    }
  }, Le.NODE_ENV !== "production" && (d.onTrack = n.onTrack, d.onTrigger = n.onTrigger), t ? o ? P(!0) : A = d.run() : s ? s(P.bind(null, !0), !0) : d.run(), N.pause = d.pause.bind(d), N.resume = d.resume.bind(d), N.stop = N, N;
}
function Dn(e, t = 1 / 0, n) {
  if (t <= 0 || !$e(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Set(), n.has(e)))
    return e;
  if (n.add(e), t--, je(e))
    Dn(e.value, t, n);
  else if (he(e))
    for (let o = 0; o < e.length; o++)
      Dn(e[o], t, n);
  else if (ql(e) || Co(e))
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
const Vo = [];
function al(e) {
  Vo.push(e);
}
function rl() {
  Vo.pop();
}
let ws = !1;
function q(e, ...t) {
  if (ws) return;
  ws = !0, Fn();
  const n = Vo.length ? Vo[Vo.length - 1].component : null, o = n && n.appContext.config.warnHandler, i = ah();
  if (o)
    Qo(
      o,
      n,
      11,
      [
        // eslint-disable-next-line no-restricted-syntax
        e + t.map((l) => {
          var s, a;
          return (a = (s = l.toString) == null ? void 0 : s.call(l)) != null ? a : JSON.stringify(l);
        }).join(""),
        n && n.proxy,
        i.map(
          ({ vnode: l }) => `at <${os(n, l.type)}>`
        ).join(`
`),
        i
      ]
    );
  else {
    const l = [`[Vue warn]: ${e}`, ...t];
    i.length && l.push(`
`, ...rh(i)), console.warn(...l);
  }
  Bn(), ws = !1;
}
function ah() {
  let e = Vo[Vo.length - 1];
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
  const n = t > 0 ? `... (${t} recursive calls)` : "", o = e.component ? e.component.parent == null : !1, i = ` at <${os(
    e.component,
    e.type,
    o
  )}`, l = ">" + n;
  return e.props ? [i, ...ch(e.props), l] : [i + l];
}
function ch(e) {
  const t = [], n = Object.keys(e);
  return n.slice(0, 3).forEach((o) => {
    t.push(...ed(o, e[o]));
  }), n.length > 3 && t.push(" ..."), t;
}
function ed(e, t, n) {
  return Ye(t) ? (t = JSON.stringify(t), n ? t : [`${e}=${t}`]) : typeof t == "number" || typeof t == "boolean" || t == null ? n ? t : [`${e}=${t}`] : je(t) ? (t = ed(e, fe(t.value), !0), n ? t : [`${e}=Ref<`, t, ">"]) : Se(t) ? [`${e}=fn${t.name ? `<${t.name}>` : ""}`] : (t = fe(t), n ? t : [`${e}=`, t]);
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
function en(e, t, n, o) {
  if (Se(e)) {
    const i = Qo(e, t, n, o);
    return i && Ca(i) && i.catch((l) => {
      Li(l, t, n);
    }), i;
  }
  if (he(e)) {
    const i = [];
    for (let l = 0; l < e.length; l++)
      i.push(en(e[l], t, n, o));
    return i;
  } else E.NODE_ENV !== "production" && q(
    `Invalid value type passed to callWithAsyncErrorHandling(): ${typeof e}`
  );
}
function Li(e, t, n, o = !0) {
  const i = t ? t.vnode : null, { errorHandler: l, throwUnhandledErrorInProduction: s } = t && t.appContext.config || Be;
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
    if (l) {
      Fn(), Qo(l, null, 10, [
        e,
        r,
        f
      ]), Bn();
      return;
    }
  }
  fh(e, n, i, o, s);
}
function fh(e, t, n, o = !0, i = !1) {
  if (E.NODE_ENV !== "production") {
    const l = Pa[t];
    if (n && al(n), q(`Unhandled error${l ? ` during execution of ${l}` : ""}`), n && rl(), o)
      throw e;
    console.error(e);
  } else {
    if (i)
      throw e;
    console.error(e);
  }
}
const Et = [];
let an = -1;
const qo = [];
let Yn = null, jo = 0;
const td = /* @__PURE__ */ Promise.resolve();
let Cl = null;
const mh = 100;
function at(e) {
  const t = Cl || td;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function vh(e) {
  let t = an + 1, n = Et.length;
  for (; t < n; ) {
    const o = t + n >>> 1, i = Et[o], l = ki(i);
    l < e || l === e && i.flags & 2 ? t = o + 1 : n = o;
  }
  return t;
}
function Zl(e) {
  if (!(e.flags & 1)) {
    const t = ki(e), n = Et[Et.length - 1];
    !n || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= ki(n) ? Et.push(e) : Et.splice(vh(t), 0, e), e.flags |= 1, nd();
  }
}
function nd() {
  Cl || (Cl = td.then(ld));
}
function od(e) {
  he(e) ? qo.push(...e) : Yn && e.id === -1 ? Yn.splice(jo + 1, 0, e) : e.flags & 1 || (qo.push(e), e.flags |= 1), nd();
}
function Mr(e, t, n = an + 1) {
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
    for (Yn = t, E.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map()), jo = 0; jo < Yn.length; jo++) {
      const n = Yn[jo];
      E.NODE_ENV !== "production" && Da(e, n) || (n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2);
    }
    Yn = null, jo = 0;
  }
}
const ki = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function ld(e) {
  E.NODE_ENV !== "production" && (e = e || /* @__PURE__ */ new Map());
  const t = E.NODE_ENV !== "production" ? (n) => Da(e, n) : ct;
  try {
    for (an = 0; an < Et.length; an++) {
      const n = Et[an];
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
    for (; an < Et.length; an++) {
      const n = Et[an];
      n && (n.flags &= -2);
    }
    an = -1, Et.length = 0, id(e), Cl = null, (Et.length || qo.length) && ld(e);
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
let Xt = !1;
const ul = /* @__PURE__ */ new Map();
E.NODE_ENV !== "production" && (Fi().__VUE_HMR_RUNTIME__ = {
  createRecord: ks(sd),
  rerender: ks(yh),
  reload: ks(ph)
});
const Po = /* @__PURE__ */ new Map();
function hh(e) {
  const t = e.type.__hmrId;
  let n = Po.get(t);
  n || (sd(t, e.type), n = Po.get(t)), n.instances.add(e);
}
function gh(e) {
  Po.get(e.type.__hmrId).instances.delete(e);
}
function sd(e, t) {
  return Po.has(e) ? !1 : (Po.set(e, {
    initialDef: El(t),
    instances: /* @__PURE__ */ new Set()
  }), !0);
}
function El(e) {
  return Yd(e) ? e.__vccOpts : e;
}
function yh(e, t) {
  const n = Po.get(e);
  n && (n.initialDef.render = t, [...n.instances].forEach((o) => {
    t && (o.render = t, El(o.type).render = t), o.renderCache = [], Xt = !0, o.update(), Xt = !1;
  }));
}
function ph(e, t) {
  const n = Po.get(e);
  if (!n) return;
  t = El(t), Fr(n.initialDef, t);
  const o = [...n.instances];
  for (let i = 0; i < o.length; i++) {
    const l = o[i], s = El(l.type);
    let a = ul.get(s);
    a || (s !== n.initialDef && Fr(s, t), ul.set(s, a = /* @__PURE__ */ new Set())), a.add(l), l.appContext.propsCache.delete(l.type), l.appContext.emitsCache.delete(l.type), l.appContext.optionsCache.delete(l.type), l.ceReload ? (a.add(l), l.ceReload(t.styles), a.delete(l)) : l.parent ? Zl(() => {
      Xt = !0, l.parent.update(), Xt = !1, a.delete(l);
    }) : l.appContext.reload ? l.appContext.reload() : typeof window < "u" ? window.location.reload() : console.warn(
      "[HMR] Root or manually mounted instance modified. Full reload required."
    ), l.root.ce && l !== l.root && l.root.ce._removeChildStyle(s);
  }
  od(() => {
    ul.clear();
  });
}
function Fr(e, t) {
  Xe(e, t);
  for (const n in e)
    n !== "__file" && !(n in t) && delete e[n];
}
function ks(e) {
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
let cn, di = [], qs = !1;
function Ri(e, ...t) {
  cn ? cn.emit(e, ...t) : qs || di.push({ event: e, args: t });
}
function ad(e, t) {
  var n, o;
  cn = e, cn ? (cn.enabled = !0, di.forEach(({ event: i, args: l }) => cn.emit(i, ...l)), di = []) : /* handle late devtools injection - only do this if we are in an actual */ /* browser environment to avoid the timer handle stalling test runner exit */ /* (#4815) */ typeof window < "u" && // some envs mock window but not fully
  window.HTMLElement && // also exclude jsdom
  // eslint-disable-next-line no-restricted-syntax
  !((o = (n = window.navigator) == null ? void 0 : n.userAgent) != null && o.includes("jsdom")) ? ((t.__VUE_DEVTOOLS_HOOK_REPLAY__ = t.__VUE_DEVTOOLS_HOOK_REPLAY__ || []).push((l) => {
    ad(l, t);
  }), setTimeout(() => {
    cn || (t.__VUE_DEVTOOLS_HOOK_REPLAY__ = null, qs = !0, di = []);
  }, 3e3)) : (qs = !0, di = []);
}
function bh(e, t) {
  Ri("app:init", e, t, {
    Fragment: Ve,
    Text: Mo,
    Comment: st,
    Static: dl
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
  cn && typeof cn.cleanupBuffer == "function" && // remove the component if it wasn't buffered
  !cn.cleanupBuffer(e) && kh(e);
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
let bt = null, cd = null;
function xl(e) {
  const t = bt;
  return bt = e, cd = e && e.type.__scopeId || null, t;
}
function p(e, t = bt, n) {
  if (!t || e._n)
    return e;
  const o = (...i) => {
    o._d && Zr(-1);
    const l = xl(t);
    let s;
    try {
      s = e(...i);
    } finally {
      xl(l), o._d && Zr(1);
    }
    return E.NODE_ENV !== "production" && rd(t), s;
  };
  return o._n = !0, o._c = !0, o._d = !0, o;
}
function dd(e) {
  vv(e) && q("Do not use built-in directive ids as custom directive id: " + e);
}
function rt(e, t) {
  if (bt === null)
    return E.NODE_ENV !== "production" && q("withDirectives can only be used inside render functions."), e;
  const n = ns(bt), o = e.dirs || (e.dirs = []);
  for (let i = 0; i < t.length; i++) {
    let [l, s, a, r = Be] = t[i];
    l && (Se(l) && (l = {
      mounted: l,
      updated: l
    }), l.deep && Dn(s), o.push({
      dir: l,
      instance: n,
      value: s,
      oldValue: void 0,
      arg: a,
      modifiers: r
    }));
  }
  return e;
}
function mo(e, t, n, o) {
  const i = e.dirs, l = t && t.dirs;
  for (let s = 0; s < i.length; s++) {
    const a = i[s];
    l && (a.oldValue = l[s].value);
    let r = a.dir[o];
    r && (Fn(), en(r, n, 8, [
      e.el,
      a,
      e,
      t
    ]), Bn());
  }
}
const fd = Symbol("_vte"), md = (e) => e.__isTeleport, No = (e) => e && (e.disabled || e.disabled === ""), Vh = (e) => e && (e.defer || e.defer === ""), Br = (e) => typeof SVGElement < "u" && e instanceof SVGElement, Lr = (e) => typeof MathMLElement == "function" && e instanceof MathMLElement, Gs = (e, t) => {
  const n = e && e.to;
  if (Ye(n))
    if (t) {
      const o = t(n);
      return E.NODE_ENV !== "production" && !o && !No(e) && q(
        `Failed to locate Teleport target with selector "${n}". Note the target element must exist before the component is mounted - i.e. the target cannot be rendered by the component itself, and ideally should be outside of the entire Vue component tree.`
      ), o;
    } else
      return E.NODE_ENV !== "production" && q(
        "Current renderer does not support string target for Teleports. (missing querySelector renderer option)"
      ), null;
  else
    return E.NODE_ENV !== "production" && !n && !No(e) && q(`Invalid Teleport target: ${n}`), n;
}, Nh = {
  name: "Teleport",
  __isTeleport: !0,
  process(e, t, n, o, i, l, s, a, r, f) {
    const {
      mc: u,
      pc: d,
      pbc: m,
      o: { insert: h, querySelector: v, createText: g, createComment: _ }
    } = f, S = No(t.props);
    let { shapeFlag: N, children: A, dynamicChildren: P } = t;
    if (E.NODE_ENV !== "production" && Xt && (r = !1, P = null), e == null) {
      const x = t.el = E.NODE_ENV !== "production" ? _("teleport start") : g(""), C = t.anchor = E.NODE_ENV !== "production" ? _("teleport end") : g("");
      h(x, n, o), h(C, n, o);
      const $ = (T, D) => {
        N & 16 && (i && i.isCE && (i.ce._teleportTarget = T), u(
          A,
          T,
          D,
          i,
          l,
          s,
          a,
          r
        ));
      }, V = () => {
        const T = t.target = Gs(t.props, v), D = vd(T, t, g, h);
        T ? (s !== "svg" && Br(T) ? s = "svg" : s !== "mathml" && Lr(T) && (s = "mathml"), S || ($(T, D), cl(t, !1))) : E.NODE_ENV !== "production" && !S && q(
          "Invalid Teleport target on mount:",
          T,
          `(${typeof T})`
        );
      };
      S && ($(n, C), cl(t, !0)), Vh(t.props) ? Ot(V, l) : V();
    } else {
      t.el = e.el, t.targetStart = e.targetStart;
      const x = t.anchor = e.anchor, C = t.target = e.target, $ = t.targetAnchor = e.targetAnchor, V = No(e.props), T = V ? n : C, D = V ? x : $;
      if (s === "svg" || Br(C) ? s = "svg" : (s === "mathml" || Lr(C)) && (s = "mathml"), P ? (m(
        e.dynamicChildren,
        P,
        T,
        i,
        l,
        s,
        a
      ), yi(e, t, !0)) : r || d(
        e,
        t,
        T,
        D,
        i,
        l,
        s,
        a,
        !1
      ), S)
        V ? t.props && e.props && t.props.to !== e.props.to && (t.props.to = e.props.to) : tl(
          t,
          n,
          x,
          f,
          1
        );
      else if ((t.props && t.props.to) !== (e.props && e.props.to)) {
        const O = t.target = Gs(
          t.props,
          v
        );
        O ? tl(
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
      } else V && tl(
        t,
        C,
        $,
        f,
        1
      );
      cl(t, S);
    }
  },
  remove(e, t, n, { um: o, o: { remove: i } }, l) {
    const {
      shapeFlag: s,
      children: a,
      anchor: r,
      targetStart: f,
      targetAnchor: u,
      target: d,
      props: m
    } = e;
    if (d && (i(f), i(u)), l && i(r), s & 16) {
      const h = l || !No(m);
      for (let v = 0; v < a.length; v++) {
        const g = a[v];
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
  move: tl,
  hydrate: Th
};
function tl(e, t, n, { o: { insert: o }, m: i }, l = 2) {
  l === 0 && o(e.targetAnchor, t, n);
  const { el: s, anchor: a, shapeFlag: r, children: f, props: u } = e, d = l === 2;
  if (d && o(s, t, n), (!d || No(u)) && r & 16)
    for (let m = 0; m < f.length; m++)
      i(
        f[m],
        t,
        n,
        2
      );
  d && o(a, t, n);
}
function Th(e, t, n, o, i, l, {
  o: { nextSibling: s, parentNode: a, querySelector: r, insert: f, createText: u }
}, d) {
  const m = t.target = Gs(
    t.props,
    r
  );
  if (m) {
    const h = No(t.props), v = m._lpa || m.firstChild;
    if (t.shapeFlag & 16)
      if (h)
        t.anchor = d(
          s(e),
          t,
          a(e),
          n,
          o,
          i,
          l
        ), t.targetStart = v, t.targetAnchor = v && s(v);
      else {
        t.anchor = s(e);
        let g = v;
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
        t.targetAnchor || vd(m, t, u, f), d(
          v && s(v),
          t,
          m,
          n,
          o,
          i,
          l
        );
      }
    cl(t, h);
  }
  return t.anchor && s(t.anchor);
}
const Oh = Nh;
function cl(e, t) {
  const n = e.ctx;
  if (n && n.ut) {
    let o, i;
    for (t ? (o = e.el, i = e.anchor) : (o = e.targetStart, i = e.targetAnchor); o && o !== i; )
      o.nodeType === 1 && o.setAttribute("data-v-owner", n.uid), o = o.nextSibling;
    n.ut();
  }
}
function vd(e, t, n, o) {
  const i = t.targetStart = n(""), l = t.targetAnchor = n("");
  return i[fd] = l, e && (o(i, e), o(l, e)), l;
}
const Xn = Symbol("_leaveCb"), nl = Symbol("_enterCb");
function hd() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  return Cn(() => {
    e.isMounted = !0;
  }), wt(() => {
    e.isUnmounting = !0;
  }), e;
}
const zt = [Function, Array], gd = {
  mode: String,
  appear: Boolean,
  persisted: Boolean,
  // enter
  onBeforeEnter: zt,
  onEnter: zt,
  onAfterEnter: zt,
  onEnterCancelled: zt,
  // leave
  onBeforeLeave: zt,
  onLeave: zt,
  onAfterLeave: zt,
  onLeaveCancelled: zt,
  // appear
  onBeforeAppear: zt,
  onAppear: zt,
  onAfterAppear: zt,
  onAppearCancelled: zt
}, yd = (e) => {
  const t = e.subTree;
  return t.component ? yd(t.component) : t;
}, Ih = {
  name: "BaseTransition",
  props: gd,
  setup(e, { slots: t }) {
    const n = ts(), o = hd();
    return () => {
      const i = t.default && Ma(t.default(), !0);
      if (!i || !i.length)
        return;
      const l = pd(i), s = fe(e), { mode: a } = s;
      if (E.NODE_ENV !== "production" && a && a !== "in-out" && a !== "out-in" && a !== "default" && q(`invalid <transition> mode: ${a}`), o.isLeaving)
        return Ss(l);
      const r = Rr(l);
      if (!r)
        return Ss(l);
      let f = Si(
        r,
        s,
        o,
        n,
        // #11061, ensure enterHooks is fresh after clone
        (m) => f = m
      );
      r.type !== st && Do(r, f);
      const u = n.subTree, d = u && Rr(u);
      if (d && d.type !== st && !_o(r, d) && yd(n).type !== st) {
        const m = Si(
          d,
          s,
          o,
          n
        );
        if (Do(d, m), a === "out-in" && r.type !== st)
          return o.isLeaving = !0, m.afterLeave = () => {
            o.isLeaving = !1, n.job.flags & 8 || n.update(), delete m.afterLeave;
          }, Ss(l);
        a === "in-out" && r.type !== st && (m.delayLeave = (h, v, g) => {
          const _ = bd(
            o,
            d
          );
          _[String(d.key)] = d, h[Xn] = () => {
            v(), h[Xn] = void 0, delete f.delayedLeave;
          }, f.delayedLeave = g;
        });
      }
      return l;
    };
  }
};
function pd(e) {
  let t = e[0];
  if (e.length > 1) {
    let n = !1;
    for (const o of e)
      if (o.type !== st) {
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
const Ah = Ih;
function bd(e, t) {
  const { leavingVNodes: n } = e;
  let o = n.get(t.type);
  return o || (o = /* @__PURE__ */ Object.create(null), n.set(t.type, o)), o;
}
function Si(e, t, n, o, i) {
  const {
    appear: l,
    mode: s,
    persisted: a = !1,
    onBeforeEnter: r,
    onEnter: f,
    onAfterEnter: u,
    onEnterCancelled: d,
    onBeforeLeave: m,
    onLeave: h,
    onAfterLeave: v,
    onLeaveCancelled: g,
    onBeforeAppear: _,
    onAppear: S,
    onAfterAppear: N,
    onAppearCancelled: A
  } = t, P = String(e.key), x = bd(n, e), C = (T, D) => {
    T && en(
      T,
      o,
      9,
      D
    );
  }, $ = (T, D) => {
    const O = D[1];
    C(T, D), he(T) ? T.every((k) => k.length <= 1) && O() : T.length <= 1 && O();
  }, V = {
    mode: s,
    persisted: a,
    beforeEnter(T) {
      let D = r;
      if (!n.isMounted)
        if (l)
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
        if (l)
          D = S || f, O = N || u, k = A || d;
        else
          return;
      let I = !1;
      const B = T[nl] = (Z) => {
        I || (I = !0, Z ? C(k, [T]) : C(O, [T]), V.delayedLeave && V.delayedLeave(), T[nl] = void 0);
      };
      D ? $(D, [T, B]) : B();
    },
    leave(T, D) {
      const O = String(e.key);
      if (T[nl] && T[nl](
        !0
        /* cancelled */
      ), n.isUnmounting)
        return D();
      C(m, [T]);
      let k = !1;
      const I = T[Xn] = (B) => {
        k || (k = !0, D(), B ? C(g, [T]) : C(v, [T]), T[Xn] = void 0, x[O] === e && delete x[O]);
      };
      x[O] = e, h ? $(h, [T, I]) : I();
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
function Ss(e) {
  if (Hi(e))
    return e = tn(e), e.children = null, e;
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
function Do(e, t) {
  e.shapeFlag & 6 && e.component ? (e.transition = t, Do(e.component.subTree, t)) : e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function Ma(e, t = !1, n) {
  let o = [], i = 0;
  for (let l = 0; l < e.length; l++) {
    let s = e[l];
    const a = n == null ? s.key : String(n) + String(s.key != null ? s.key : l);
    s.type === Ve ? (s.patchFlag & 128 && i++, o = o.concat(
      Ma(s.children, t, a)
    )) : (t || s.type !== st) && o.push(a != null ? tn(s, { key: a }) : s);
  }
  if (i > 1)
    for (let l = 0; l < o.length; l++)
      o[l].patchFlag = -2;
  return o;
}
/*! #__NO_SIDE_EFFECTS__ */
// @__NO_SIDE_EFFECTS__
function Ph(e, t) {
  return Se(e) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    Xe({ name: e.name }, t, { setup: e })
  ) : e;
}
function _d(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
const Dh = /* @__PURE__ */ new WeakSet();
function Ks(e, t, n, o, i = !1) {
  if (he(e)) {
    e.forEach(
      (v, g) => Ks(
        v,
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
  const l = o.shapeFlag & 4 ? ns(o.component) : o.el, s = i ? null : l, { i: a, r } = e;
  if (E.NODE_ENV !== "production" && !a) {
    q(
      "Missing ref owner context. ref cannot be used on hoisted vnodes. A vnode with ref must be created inside the render function."
    );
    return;
  }
  const f = t && t.r, u = a.refs === Be ? a.refs = {} : a.refs, d = a.setupState, m = fe(d), h = d === Be ? () => !1 : (v) => E.NODE_ENV !== "production" && (De(m, v) && !je(m[v]) && q(
    `Template ref "${v}" used on a non-ref value. It will not work in the production build.`
  ), Dh.has(m[v])) ? !1 : De(m, v);
  if (f != null && f !== r && (Ye(f) ? (u[f] = null, h(f) && (d[f] = null)) : je(f) && (f.value = null)), Se(r))
    Qo(r, a, 12, [s, u]);
  else {
    const v = Ye(r), g = je(r);
    if (v || g) {
      const _ = () => {
        if (e.f) {
          const S = v ? h(r) ? d[r] : u[r] : r.value;
          i ? he(S) && Sa(S, l) : he(S) ? S.includes(l) || S.push(l) : v ? (u[r] = [l], h(r) && (d[r] = u[r])) : (r.value = [l], e.k && (u[e.k] = r.value));
        } else v ? (u[r] = s, h(r) && (d[r] = s)) : g ? (r.value = s, e.k && (u[e.k] = s)) : E.NODE_ENV !== "production" && q("Invalid template ref type:", r, `(${typeof r})`);
      };
      s ? (_.id = -1, Ot(_, n)) : _();
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
  if (Ql(t, o, n), n) {
    let i = n.parent;
    for (; i && i.parent; )
      Hi(i.parent.vnode) && $h(o, t, n, i), i = i.parent;
  }
}
function $h(e, t, n, o) {
  const i = Ql(
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
function Ql(e, t, n = dt, o = !1) {
  if (n) {
    const i = n[e] || (n[e] = []), l = t.__weh || (t.__weh = (...s) => {
      Fn();
      const a = ji(n), r = en(t, n, e, s);
      return a(), Bn(), r;
    });
    return o ? i.unshift(l) : i.push(l), l;
  } else if (E.NODE_ENV !== "production") {
    const i = po(Pa[e].replace(/ hook$/, ""));
    q(
      `${i} is called when there is no active component instance to be associated with. Lifecycle injection APIs can only be used during execution of setup(). If you are using async setup(), make sure to register lifecycle hooks before the first await statement.`
    );
  }
}
const Ln = (e) => (t, n = dt) => {
  (!Ei || e === "sp") && Ql(e, (...o) => t(...o), n);
}, Fa = Ln("bm"), Cn = Ln("m"), Mh = Ln(
  "bu"
), Ba = Ln("u"), wt = Ln(
  "bum"
), Cd = Ln("um"), Fh = Ln(
  "sp"
), Bh = Ln("rtg"), Lh = Ln("rtc");
function Rh(e, t = dt) {
  Ql("ec", e, t);
}
const Ys = "components", Hh = "directives", jh = Symbol.for("v-ndc");
function zh(e) {
  return Ye(e) && Ed(Ys, e, !1) || e;
}
function Rn(e) {
  return Ed(Hh, e);
}
function Ed(e, t, n = !0, o = !1) {
  const i = bt || dt;
  if (i) {
    const l = i.type;
    if (e === Ys) {
      const a = Wa(
        l,
        !1
      );
      if (a && (a === t || a === gt(t) || a === Wt(gt(t))))
        return l;
    }
    const s = (
      // local registration
      // check instance[type] first which is resolved for options API
      Hr(i[e] || l[e], t) || // global registration
      Hr(i.appContext[e], t)
    );
    if (!s && o)
      return l;
    if (E.NODE_ENV !== "production" && n && !s) {
      const a = e === Ys ? `
If this is a native custom element, make sure to exclude it from component resolution via compilerOptions.isCustomElement.` : "";
      q(`Failed to resolve ${e.slice(0, -1)}: ${t}${a}`);
    }
    return s;
  } else E.NODE_ENV !== "production" && q(
    `resolve${Wt(e.slice(0, -1))} can only be used in render() or setup().`
  );
}
function Hr(e, t) {
  return e && (e[t] || e[gt(t)] || e[Wt(gt(t))]);
}
function Qt(e, t, n, o) {
  let i;
  const l = n, s = he(e);
  if (s || Ye(e)) {
    const a = s && xo(e);
    let r = !1;
    a && (r = !xt(e), e = Yl(e)), i = new Array(e.length);
    for (let f = 0, u = e.length; f < u; f++)
      i[f] = t(
        r ? pt(e[f]) : e[f],
        f,
        void 0,
        l
      );
  } else if (typeof e == "number") {
    E.NODE_ENV !== "production" && !Number.isInteger(e) && q(`The v-for range expect an integer value but got ${e}.`), i = new Array(e);
    for (let a = 0; a < e; a++)
      i[a] = t(a + 1, a, void 0, l);
  } else if ($e(e))
    if (e[Symbol.iterator])
      i = Array.from(
        e,
        (a, r) => t(a, r, void 0, l)
      );
    else {
      const a = Object.keys(e);
      i = new Array(a.length);
      for (let r = 0, f = a.length; r < f; r++) {
        const u = a[r];
        i[r] = t(e[u], u, r, l);
      }
    }
  else
    i = [];
  return i;
}
const Xs = (e) => e ? Gd(e) ? ns(e) : Xs(e.parent) : null, To = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ Xe(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => E.NODE_ENV !== "production" ? dn(e.props) : e.props,
    $attrs: (e) => E.NODE_ENV !== "production" ? dn(e.attrs) : e.attrs,
    $slots: (e) => E.NODE_ENV !== "production" ? dn(e.slots) : e.slots,
    $refs: (e) => E.NODE_ENV !== "production" ? dn(e.refs) : e.refs,
    $parent: (e) => Xs(e.parent),
    $root: (e) => Xs(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => Ra(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      Zl(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = at.bind(e.proxy)),
    $watch: (e) => wg.bind(e)
  })
), La = (e) => e === "_" || e === "$", Cs = (e, t) => e !== Be && !e.__isScriptSetup && De(e, t), xd = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: n, setupState: o, data: i, props: l, accessCache: s, type: a, appContext: r } = e;
    if (E.NODE_ENV !== "production" && t === "__isVue")
      return !0;
    let f;
    if (t[0] !== "$") {
      const h = s[t];
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
        if (Cs(o, t))
          return s[t] = 1, o[t];
        if (i !== Be && De(i, t))
          return s[t] = 2, i[t];
        if (
          // only cache other properties when instance has declared (thus stable)
          // props
          (f = e.propsOptions[0]) && De(f, t)
        )
          return s[t] = 3, l[t];
        if (n !== Be && De(n, t))
          return s[t] = 4, n[t];
        Js && (s[t] = 0);
      }
    }
    const u = To[t];
    let d, m;
    if (u)
      return t === "$attrs" ? (ut(e.attrs, "get", ""), E.NODE_ENV !== "production" && Tl()) : E.NODE_ENV !== "production" && t === "$slots" && ut(e, "get", t), u(e);
    if (
      // css module (injected by vue-loader)
      (d = a.__cssModules) && (d = d[t])
    )
      return d;
    if (n !== Be && De(n, t))
      return s[t] = 4, n[t];
    if (
      // global properties
      m = r.config.globalProperties, De(m, t)
    )
      return m[t];
    E.NODE_ENV !== "production" && bt && (!Ye(t) || // #1091 avoid internal isRef/isVNode checks on component instance leading
    // to infinite warning loop
    t.indexOf("__v") !== 0) && (i !== Be && La(t[0]) && De(i, t) ? q(
      `Property ${JSON.stringify(
        t
      )} must be accessed via $data because it starts with a reserved character ("$" or "_") and is not proxied on the render context.`
    ) : e === bt && q(
      `Property ${JSON.stringify(t)} was accessed during render but is not defined on instance.`
    ));
  },
  set({ _: e }, t, n) {
    const { data: o, setupState: i, ctx: l } = e;
    return Cs(i, t) ? (i[t] = n, !0) : E.NODE_ENV !== "production" && i.__isScriptSetup && De(i, t) ? (q(`Cannot mutate <script setup> binding "${t}" from Options API.`), !1) : o !== Be && De(o, t) ? (o[t] = n, !0) : De(e.props, t) ? (E.NODE_ENV !== "production" && q(`Attempting to mutate prop "${t}". Props are readonly.`), !1) : t[0] === "$" && t.slice(1) in e ? (E.NODE_ENV !== "production" && q(
      `Attempting to mutate public property "${t}". Properties starting with $ are reserved and readonly.`
    ), !1) : (E.NODE_ENV !== "production" && t in e.appContext.config.globalProperties ? Object.defineProperty(l, t, {
      enumerable: !0,
      configurable: !0,
      value: n
    }) : l[t] = n, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: n, ctx: o, appContext: i, propsOptions: l }
  }, s) {
    let a;
    return !!n[s] || e !== Be && De(e, s) || Cs(t, s) || (a = l[0]) && De(a, s) || De(o, s) || De(To, s) || De(i.config.globalProperties, s);
  },
  defineProperty(e, t, n) {
    return n.get != null ? e._.accessCache[t] = 0 : De(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
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
  }), Object.keys(To).forEach((n) => {
    Object.defineProperty(t, n, {
      configurable: !0,
      enumerable: !1,
      get: () => To[n](e),
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
  Object.keys(fe(n)).forEach((o) => {
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
let Js = !0;
function Kh(e) {
  const t = Ra(e), n = e.proxy, o = e.ctx;
  Js = !1, t.beforeCreate && zr(t.beforeCreate, e, "bc");
  const {
    // state
    data: i,
    computed: l,
    methods: s,
    watch: a,
    provide: r,
    inject: f,
    // lifecycle
    created: u,
    beforeMount: d,
    mounted: m,
    beforeUpdate: h,
    updated: v,
    activated: g,
    deactivated: _,
    beforeDestroy: S,
    beforeUnmount: N,
    destroyed: A,
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
    directives: I,
    filters: B
  } = t, Z = E.NODE_ENV !== "production" ? Gh() : null;
  if (E.NODE_ENV !== "production") {
    const [ne] = e.propsOptions;
    if (ne)
      for (const X in ne)
        Z("Props", X);
  }
  if (f && Yh(f, o, Z), s)
    for (const ne in s) {
      const X = s[ne];
      Se(X) ? (E.NODE_ENV !== "production" ? Object.defineProperty(o, ne, {
        value: X.bind(n),
        configurable: !0,
        enumerable: !0,
        writable: !0
      }) : o[ne] = X.bind(n), E.NODE_ENV !== "production" && Z("Methods", ne)) : E.NODE_ENV !== "production" && q(
        `Method "${ne}" has type "${typeof X}" in the component definition. Did you reference the function correctly?`
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
      for (const X in ne)
        Z("Data", X), La(X[0]) || Object.defineProperty(o, X, {
          configurable: !0,
          enumerable: !0,
          get: () => ne[X],
          set: ct
        });
  }
  if (Js = !0, l)
    for (const ne in l) {
      const X = l[ne], Ce = Se(X) ? X.bind(n, n) : Se(X.get) ? X.get.bind(n, n) : ct;
      E.NODE_ENV !== "production" && Ce === ct && q(`Computed property "${ne}" has no getter.`);
      const G = !Se(X) && Se(X.set) ? X.set.bind(n) : E.NODE_ENV !== "production" ? () => {
        q(
          `Write operation failed: computed property "${ne}" is readonly.`
        );
      } : ct, Y = b({
        get: Ce,
        set: G
      });
      Object.defineProperty(o, ne, {
        enumerable: !0,
        configurable: !0,
        get: () => Y.value,
        set: (te) => Y.value = te
      }), E.NODE_ENV !== "production" && Z("Computed", ne);
    }
  if (a)
    for (const ne in a)
      Vd(a[ne], o, n, ne);
  if (r) {
    const ne = Se(r) ? r.call(n) : r;
    Reflect.ownKeys(ne).forEach((X) => {
      yt(X, ne[X]);
    });
  }
  u && zr(u, e, "c");
  function re(ne, X) {
    he(X) ? X.forEach((Ce) => ne(Ce.bind(n))) : X && ne(X.bind(n));
  }
  if (re(Fa, d), re(Cn, m), re(Mh, h), re(Ba, v), re(wd, g), re(kd, _), re(Rh, V), re(Lh, C), re(Bh, $), re(wt, N), re(Cd, P), re(Fh, T), he(D))
    if (D.length) {
      const ne = e.exposed || (e.exposed = {});
      D.forEach((X) => {
        Object.defineProperty(ne, X, {
          get: () => n[X],
          set: (Ce) => n[X] = Ce
        });
      });
    } else e.exposed || (e.exposed = {});
  x && e.render === ct && (e.render = x), O != null && (e.inheritAttrs = O), k && (e.components = k), I && (e.directives = I), T && _d(e);
}
function Yh(e, t, n = ct) {
  he(e) && (e = Zs(e));
  for (const o in e) {
    const i = e[o];
    let l;
    $e(i) ? "default" in i ? l = He(
      i.from || o,
      i.default,
      !0
    ) : l = He(i.from || o) : l = He(i), je(l) ? Object.defineProperty(t, o, {
      enumerable: !0,
      configurable: !0,
      get: () => l.value,
      set: (s) => l.value = s
    }) : t[o] = l, E.NODE_ENV !== "production" && n("Inject", o);
  }
}
function zr(e, t, n) {
  en(
    he(e) ? e.map((o) => o.bind(t.proxy)) : e.bind(t.proxy),
    t,
    n
  );
}
function Vd(e, t, n, o) {
  let i = o.includes(".") ? Ld(n, o) : () => n[o];
  if (Ye(e)) {
    const l = t[e];
    Se(l) ? ke(i, l) : E.NODE_ENV !== "production" && q(`Invalid watch handler specified by key "${e}"`, l);
  } else if (Se(e))
    ke(i, e.bind(n));
  else if ($e(e))
    if (he(e))
      e.forEach((l) => Vd(l, t, n, o));
    else {
      const l = Se(e.handler) ? e.handler.bind(n) : t[e.handler];
      Se(l) ? ke(i, l, e) : E.NODE_ENV !== "production" && q(`Invalid watch handler specified by key "${e.handler}"`, l);
    }
  else E.NODE_ENV !== "production" && q(`Invalid watch option: "${o}"`, e);
}
function Ra(e) {
  const t = e.type, { mixins: n, extends: o } = t, {
    mixins: i,
    optionsCache: l,
    config: { optionMergeStrategies: s }
  } = e.appContext, a = l.get(t);
  let r;
  return a ? r = a : !i.length && !n && !o ? r = t : (r = {}, i.length && i.forEach(
    (f) => Vl(r, f, s, !0)
  ), Vl(r, t, s)), $e(t) && l.set(t, r), r;
}
function Vl(e, t, n, o = !1) {
  const { mixins: i, extends: l } = t;
  l && Vl(e, l, n, !0), i && i.forEach(
    (s) => Vl(e, s, n, !0)
  );
  for (const s in t)
    if (o && s === "expose")
      E.NODE_ENV !== "production" && q(
        '"expose" option is ignored when declared in mixins or extends. It should only be declared in the base component itself.'
      );
    else {
      const a = Xh[s] || n && n[s];
      e[s] = a ? a(e[s], t[s]) : t[s];
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
  beforeCreate: kt,
  created: kt,
  beforeMount: kt,
  mounted: kt,
  beforeUpdate: kt,
  updated: kt,
  beforeDestroy: kt,
  beforeUnmount: kt,
  destroyed: kt,
  unmounted: kt,
  activated: kt,
  deactivated: kt,
  errorCaptured: kt,
  serverPrefetch: kt,
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
    return Xe(
      Se(e) ? e.call(this, this) : e,
      Se(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function Jh(e, t) {
  return fi(Zs(e), Zs(t));
}
function Zs(e) {
  if (he(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++)
      t[e[n]] = e[n];
    return t;
  }
  return e;
}
function kt(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function fi(e, t) {
  return e ? Xe(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function Wr(e, t) {
  return e ? he(e) && he(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : Xe(
    /* @__PURE__ */ Object.create(null),
    jr(e),
    jr(t ?? {})
  ) : t;
}
function Zh(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = Xe(/* @__PURE__ */ Object.create(null), e);
  for (const o in t)
    n[o] = kt(e[o], t[o]);
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
    Se(o) || (o = Xe({}, o)), i != null && !$e(i) && (E.NODE_ENV !== "production" && q("root props passed to app.mount() must be an object."), i = null);
    const l = Nd(), s = /* @__PURE__ */ new WeakSet(), a = [];
    let r = !1;
    const f = l.app = {
      _uid: Qh++,
      _component: o,
      _props: i,
      _container: null,
      _context: l,
      _instance: null,
      version: nu,
      get config() {
        return l.config;
      },
      set config(u) {
        E.NODE_ENV !== "production" && q(
          "app.config cannot be replaced. Modify individual options instead."
        );
      },
      use(u, ...d) {
        return s.has(u) ? E.NODE_ENV !== "production" && q("Plugin has already been applied to target app.") : u && Se(u.install) ? (s.add(u), u.install(f, ...d)) : Se(u) ? (s.add(u), u(f, ...d)) : E.NODE_ENV !== "production" && q(
          'A plugin must either be a function or an object with an "install" function.'
        ), f;
      },
      mixin(u) {
        return l.mixins.includes(u) ? E.NODE_ENV !== "production" && q(
          "Mixin has already been applied to target app" + (u.name ? `: ${u.name}` : "")
        ) : l.mixins.push(u), f;
      },
      component(u, d) {
        return E.NODE_ENV !== "production" && oa(u, l.config), d ? (E.NODE_ENV !== "production" && l.components[u] && q(`Component "${u}" has already been registered in target app.`), l.components[u] = d, f) : l.components[u];
      },
      directive(u, d) {
        return E.NODE_ENV !== "production" && dd(u), d ? (E.NODE_ENV !== "production" && l.directives[u] && q(`Directive "${u}" has already been registered in target app.`), l.directives[u] = d, f) : l.directives[u];
      },
      mount(u, d, m) {
        if (r)
          E.NODE_ENV !== "production" && q(
            "App has already been mounted.\nIf you want to remount the same app, move your app creation logic into a factory function and create fresh app instances for each mount - e.g. `const createMyApp = () => createApp(App)`"
          );
        else {
          E.NODE_ENV !== "production" && u.__vue_app__ && q(
            "There is already an app instance mounted on the host container.\n If you want to mount another app on the same host container, you need to unmount the previous app by calling `app.unmount()` first."
          );
          const h = f._ceVNode || c(o, i);
          return h.appContext = l, m === !0 ? m = "svg" : m === !1 && (m = void 0), E.NODE_ENV !== "production" && (l.reload = () => {
            e(
              tn(h),
              u,
              m
            );
          }), d && t ? t(h, u) : e(h, u, m), r = !0, f._container = u, u.__vue_app__ = f, E.NODE_ENV !== "production" && (f._instance = h.component, bh(f, nu)), ns(h.component);
        }
      },
      onUnmount(u) {
        E.NODE_ENV !== "production" && typeof u != "function" && q(
          `Expected function as first argument to app.onUnmount(), but got ${typeof u}`
        ), a.push(u);
      },
      unmount() {
        r ? (en(
          a,
          f._instance,
          16
        ), e(null, f._container), E.NODE_ENV !== "production" && (f._instance = null, _h(f)), delete f._container.__vue_app__) : E.NODE_ENV !== "production" && q("Cannot unmount an app that is not mounted.");
      },
      provide(u, d) {
        return E.NODE_ENV !== "production" && u in l.provides && q(
          `App already provides property with key "${String(u)}". It will be overwritten with the new value.`
        ), l.provides[u] = d, f;
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
function He(e, t, n = !1) {
  const o = dt || bt;
  if (o || Go) {
    const i = Go ? Go._context.provides : o ? o.parent == null ? o.vnode.appContext && o.vnode.appContext.provides : o.parent.provides : void 0;
    if (i && e in i)
      return i[e];
    if (arguments.length > 1)
      return n && Se(t) ? t.call(o && o.proxy) : t;
    E.NODE_ENV !== "production" && q(`injection "${String(e)}" not found.`);
  } else E.NODE_ENV !== "production" && q("inject() can only be used inside setup() or functional components.");
}
const Td = {}, Od = () => Object.create(Td), Id = (e) => Object.getPrototypeOf(e) === Td;
function tg(e, t, n, o = !1) {
  const i = {}, l = Od();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), Ad(e, t, i, l);
  for (const s in e.propsOptions[0])
    s in i || (i[s] = void 0);
  E.NODE_ENV !== "production" && Dd(t || {}, i, e), n ? e.props = o ? i : Zv(i) : e.type.props ? e.props = i : e.props = l, e.attrs = l;
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
    attrs: l,
    vnode: { patchFlag: s }
  } = e, a = fe(i), [r] = e.propsOptions;
  let f = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(E.NODE_ENV !== "production" && ng(e)) && (o || s > 0) && !(s & 16)
  ) {
    if (s & 8) {
      const u = e.vnode.dynamicProps;
      for (let d = 0; d < u.length; d++) {
        let m = u[d];
        if (es(e.emitsOptions, m))
          continue;
        const h = t[m];
        if (r)
          if (De(l, m))
            h !== l[m] && (l[m] = h, f = !0);
          else {
            const v = gt(m);
            i[v] = Qs(
              r,
              a,
              v,
              h,
              e,
              !1
            );
          }
        else
          h !== l[m] && (l[m] = h, f = !0);
      }
    }
  } else {
    Ad(e, t, i, l) && (f = !0);
    let u;
    for (const d in a)
      (!t || // for camelCase
      !De(t, d) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((u = no(d)) === d || !De(t, u))) && (r ? n && // for camelCase
      (n[d] !== void 0 || // for kebab-case
      n[u] !== void 0) && (i[d] = Qs(
        r,
        a,
        d,
        void 0,
        e,
        !0
      )) : delete i[d]);
    if (l !== a)
      for (const d in l)
        (!t || !De(t, d)) && (delete l[d], f = !0);
  }
  f && un(e.attrs, "set", ""), E.NODE_ENV !== "production" && Dd(t || {}, i, e);
}
function Ad(e, t, n, o) {
  const [i, l] = e.propsOptions;
  let s = !1, a;
  if (t)
    for (let r in t) {
      if (mi(r))
        continue;
      const f = t[r];
      let u;
      i && De(i, u = gt(r)) ? !l || !l.includes(u) ? n[u] = f : (a || (a = {}))[u] = f : es(e.emitsOptions, r) || (!(r in o) || f !== o[r]) && (o[r] = f, s = !0);
    }
  if (l) {
    const r = fe(n), f = a || Be;
    for (let u = 0; u < l.length; u++) {
      const d = l[u];
      n[d] = Qs(
        i,
        r,
        d,
        f[d],
        e,
        !De(f, d)
      );
    }
  }
  return s;
}
function Qs(e, t, n, o, i, l) {
  const s = e[n];
  if (s != null) {
    const a = De(s, "default");
    if (a && o === void 0) {
      const r = s.default;
      if (s.type !== Function && !s.skipFactory && Se(r)) {
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
    s[
      0
      /* shouldCast */
    ] && (l && !a ? o = !1 : s[
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
  const l = e.props, s = {}, a = [];
  let r = !1;
  if (!Se(e)) {
    const u = (d) => {
      r = !0;
      const [m, h] = Pd(d, t, !0);
      Xe(s, m), h && a.push(...h);
    };
    !n && t.mixins.length && t.mixins.forEach(u), e.extends && u(e.extends), e.mixins && e.mixins.forEach(u);
  }
  if (!l && !r)
    return $e(e) && o.set(e, Wo), Wo;
  if (he(l))
    for (let u = 0; u < l.length; u++) {
      E.NODE_ENV !== "production" && !Ye(l[u]) && q("props must be strings when using array syntax.", l[u]);
      const d = gt(l[u]);
      qr(d) && (s[d] = Be);
    }
  else if (l) {
    E.NODE_ENV !== "production" && !$e(l) && q("invalid props options", l);
    for (const u in l) {
      const d = gt(u);
      if (qr(d)) {
        const m = l[u], h = s[d] = he(m) || Se(m) ? { type: m } : Xe({}, m), v = h.type;
        let g = !1, _ = !0;
        if (he(v))
          for (let S = 0; S < v.length; ++S) {
            const N = v[S], A = Se(N) && N.name;
            if (A === "Boolean") {
              g = !0;
              break;
            } else A === "String" && (_ = !1);
          }
        else
          g = Se(v) && v.name === "Boolean";
        h[
          0
          /* shouldCast */
        ] = g, h[
          1
          /* shouldCastTrue */
        ] = _, (g || De(h, "default")) && a.push(d);
      }
    }
  }
  const f = [s, a];
  return $e(e) && o.set(e, f), f;
}
function qr(e) {
  return e[0] !== "$" && !mi(e) ? !0 : (E.NODE_ENV !== "production" && q(`Invalid prop name: "${e}" is a reserved property.`), !1);
}
function lg(e) {
  return e === null ? "null" : typeof e == "function" ? e.name || "" : typeof e == "object" && e.constructor && e.constructor.name || "";
}
function Dd(e, t, n) {
  const o = fe(t), i = n.propsOptions[0], l = Object.keys(e).map((s) => gt(s));
  for (const s in i) {
    let a = i[s];
    a != null && sg(
      s,
      o[s],
      a,
      E.NODE_ENV !== "production" ? dn(o) : o,
      !l.includes(s)
    );
  }
}
function sg(e, t, n, o, i) {
  const { type: l, required: s, validator: a, skipCheck: r } = n;
  if (s && i) {
    q('Missing required prop: "' + e + '"');
    return;
  }
  if (!(t == null && !s)) {
    if (l != null && l !== !0 && !r) {
      let f = !1;
      const u = he(l) ? l : [l], d = [];
      for (let m = 0; m < u.length && !f; m++) {
        const { valid: h, expectedType: v } = rg(t, u[m]);
        d.push(v || ""), f = h;
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
  const o = lg(t);
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
  let o = `Invalid prop: type check failed for prop "${e}". Expected ${n.map(Wt).join(" | ")}`;
  const i = n[0], l = Ea(t), s = Gr(t, i), a = Gr(t, l);
  return n.length === 1 && Kr(i) && !cg(i, l) && (o += ` with value ${s}`), o += `, got ${l} `, Kr(l) && (o += `with value ${a}.`), o;
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
const $d = (e) => e[0] === "_" || e === "$stable", Ha = (e) => he(e) ? e.map(Kt) : [Kt(e)], dg = (e, t, n) => {
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
    const l = e[i];
    if (Se(l))
      t[i] = dg(i, l, o);
    else if (l != null) {
      E.NODE_ENV !== "production" && q(
        `Non-function value encountered for slot "${i}". Prefer function slots for better performance.`
      );
      const s = Ha(l);
      t[i] = () => s;
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
    i ? (ea(o, t, n), n && _l(o, "_", i, !0)) : Md(t, o);
  } else t && Fd(e, t);
}, mg = (e, t, n) => {
  const { vnode: o, slots: i } = e;
  let l = !0, s = Be;
  if (o.shapeFlag & 32) {
    const a = t._;
    a ? E.NODE_ENV !== "production" && Xt ? (ea(i, t, n), un(e, "set", "$slots")) : n && a === 1 ? l = !1 : ea(i, t, n) : (l = !t.$stable, Md(t, i)), s = t;
  } else t && (Fd(e, t), s = { default: 1 });
  if (l)
    for (const a in i)
      !$d(a) && s[a] == null && delete i[a];
};
let si, Zn;
function On(e, t) {
  e.appContext.config.performance && Nl() && Zn.mark(`vue-${t}-${e.uid}`), E.NODE_ENV !== "production" && Ch(e, t, Nl() ? Zn.now() : Date.now());
}
function In(e, t) {
  if (e.appContext.config.performance && Nl()) {
    const n = `vue-${t}-${e.uid}`, o = n + ":end";
    Zn.mark(o), Zn.measure(
      `<${os(e, e.type)}> ${t}`,
      n,
      o
    ), Zn.clearMarks(n), Zn.clearMarks(o);
  }
  E.NODE_ENV !== "production" && Eh(e, t, Nl() ? Zn.now() : Date.now());
}
function Nl() {
  return si !== void 0 || (typeof window < "u" && window.performance ? (si = !0, Zn = window.performance) : si = !1), si;
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
    patchProp: l,
    createElement: s,
    createText: a,
    createComment: r,
    setText: f,
    setElementText: u,
    parentNode: d,
    nextSibling: m,
    setScopeId: h = ct,
    insertStaticContent: v
  } = e, g = (y, w, F, j = null, L = null, R = null, Q = void 0, J = null, K = E.NODE_ENV !== "production" && Xt ? !1 : !!w.dynamicChildren) => {
    if (y === w)
      return;
    y && !_o(y, w) && (j = Re(y), Oe(y, L, R, !0), y = null), w.patchFlag === -2 && (K = !1, w.dynamicChildren = null);
    const { type: z, ref: pe, shapeFlag: ie } = w;
    switch (z) {
      case Mo:
        _(y, w, F, j);
        break;
      case st:
        S(y, w, F, j);
        break;
      case dl:
        y == null ? N(w, F, j, Q) : E.NODE_ENV !== "production" && A(y, w, F, Q);
        break;
      case Ve:
        I(
          y,
          w,
          F,
          j,
          L,
          R,
          Q,
          J,
          K
        );
        break;
      default:
        ie & 1 ? C(
          y,
          w,
          F,
          j,
          L,
          R,
          Q,
          J,
          K
        ) : ie & 6 ? B(
          y,
          w,
          F,
          j,
          L,
          R,
          Q,
          J,
          K
        ) : ie & 64 || ie & 128 ? z.process(
          y,
          w,
          F,
          j,
          L,
          R,
          Q,
          J,
          K,
          Ht
        ) : E.NODE_ENV !== "production" && q("Invalid VNode type:", z, `(${typeof z})`);
    }
    pe != null && L && Ks(pe, y && y.ref, R, w || y, !w);
  }, _ = (y, w, F, j) => {
    if (y == null)
      o(
        w.el = a(w.children),
        F,
        j
      );
    else {
      const L = w.el = y.el;
      w.children !== y.children && f(L, w.children);
    }
  }, S = (y, w, F, j) => {
    y == null ? o(
      w.el = r(w.children || ""),
      F,
      j
    ) : w.el = y.el;
  }, N = (y, w, F, j) => {
    [y.el, y.anchor] = v(
      y.children,
      w,
      F,
      j,
      y.el,
      y.anchor
    );
  }, A = (y, w, F, j) => {
    if (w.children !== y.children) {
      const L = m(y.anchor);
      x(y), [w.el, w.anchor] = v(
        w.children,
        F,
        L,
        j
      );
    } else
      w.el = y.el, w.anchor = y.anchor;
  }, P = ({ el: y, anchor: w }, F, j) => {
    let L;
    for (; y && y !== w; )
      L = m(y), o(y, F, j), y = L;
    o(w, F, j);
  }, x = ({ el: y, anchor: w }) => {
    let F;
    for (; y && y !== w; )
      F = m(y), i(y), y = F;
    i(w);
  }, C = (y, w, F, j, L, R, Q, J, K) => {
    w.type === "svg" ? Q = "svg" : w.type === "math" && (Q = "mathml"), y == null ? $(
      w,
      F,
      j,
      L,
      R,
      Q,
      J,
      K
    ) : D(
      y,
      w,
      L,
      R,
      Q,
      J,
      K
    );
  }, $ = (y, w, F, j, L, R, Q, J) => {
    let K, z;
    const { props: pe, shapeFlag: ie, transition: me, dirs: M } = y;
    if (K = y.el = s(
      y.type,
      R,
      pe && pe.is,
      pe
    ), ie & 8 ? u(K, y.children) : ie & 16 && T(
      y.children,
      K,
      null,
      j,
      L,
      Es(y, R),
      Q,
      J
    ), M && mo(y, null, j, "created"), V(K, y, y.scopeId, Q, j), pe) {
      for (const ye in pe)
        ye !== "value" && !mi(ye) && l(K, ye, null, pe[ye], R, j);
      "value" in pe && l(K, "value", null, pe.value, R), (z = pe.onVnodeBeforeMount) && sn(z, j, y);
    }
    E.NODE_ENV !== "production" && (_l(K, "__vnode", y, !0), _l(K, "__vueParentComponent", j, !0)), M && mo(y, null, j, "beforeMount");
    const H = yg(L, me);
    H && me.beforeEnter(K), o(K, w, F), ((z = pe && pe.onVnodeMounted) || H || M) && Ot(() => {
      z && sn(z, j, y), H && me.enter(K), M && mo(y, null, j, "mounted");
    }, L);
  }, V = (y, w, F, j, L) => {
    if (F && h(y, F), j)
      for (let R = 0; R < j.length; R++)
        h(y, j[R]);
    if (L) {
      let R = L.subTree;
      if (E.NODE_ENV !== "production" && R.patchFlag > 0 && R.patchFlag & 2048 && (R = za(R.children) || R), w === R || jd(R.type) && (R.ssContent === w || R.ssFallback === w)) {
        const Q = L.vnode;
        V(
          y,
          Q,
          Q.scopeId,
          Q.slotScopeIds,
          L.parent
        );
      }
    }
  }, T = (y, w, F, j, L, R, Q, J, K = 0) => {
    for (let z = K; z < y.length; z++) {
      const pe = y[z] = J ? Jn(y[z]) : Kt(y[z]);
      g(
        null,
        pe,
        w,
        F,
        j,
        L,
        R,
        Q,
        J
      );
    }
  }, D = (y, w, F, j, L, R, Q) => {
    const J = w.el = y.el;
    E.NODE_ENV !== "production" && (J.__vnode = w);
    let { patchFlag: K, dynamicChildren: z, dirs: pe } = w;
    K |= y.patchFlag & 16;
    const ie = y.props || Be, me = w.props || Be;
    let M;
    if (F && vo(F, !1), (M = me.onVnodeBeforeUpdate) && sn(M, F, w, y), pe && mo(w, y, F, "beforeUpdate"), F && vo(F, !0), E.NODE_ENV !== "production" && Xt && (K = 0, Q = !1, z = null), (ie.innerHTML && me.innerHTML == null || ie.textContent && me.textContent == null) && u(J, ""), z ? (O(
      y.dynamicChildren,
      z,
      J,
      F,
      j,
      Es(w, L),
      R
    ), E.NODE_ENV !== "production" && yi(y, w)) : Q || Ce(
      y,
      w,
      J,
      null,
      F,
      j,
      Es(w, L),
      R,
      !1
    ), K > 0) {
      if (K & 16)
        k(J, ie, me, F, L);
      else if (K & 2 && ie.class !== me.class && l(J, "class", null, me.class, L), K & 4 && l(J, "style", ie.style, me.style, L), K & 8) {
        const H = w.dynamicProps;
        for (let ye = 0; ye < H.length; ye++) {
          const ge = H[ye], ue = ie[ge], Ae = me[ge];
          (Ae !== ue || ge === "value") && l(J, ge, ue, Ae, L, F);
        }
      }
      K & 1 && y.children !== w.children && u(J, w.children);
    } else !Q && z == null && k(J, ie, me, F, L);
    ((M = me.onVnodeUpdated) || pe) && Ot(() => {
      M && sn(M, F, w, y), pe && mo(w, y, F, "updated");
    }, j);
  }, O = (y, w, F, j, L, R, Q) => {
    for (let J = 0; J < w.length; J++) {
      const K = y[J], z = w[J], pe = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        K.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (K.type === Ve || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !_o(K, z) || // - In the case of a component, it could contain anything.
        K.shapeFlag & 70) ? d(K.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          F
        )
      );
      g(
        K,
        z,
        pe,
        null,
        j,
        L,
        R,
        Q,
        !0
      );
    }
  }, k = (y, w, F, j, L) => {
    if (w !== F) {
      if (w !== Be)
        for (const R in w)
          !mi(R) && !(R in F) && l(
            y,
            R,
            w[R],
            null,
            L,
            j
          );
      for (const R in F) {
        if (mi(R)) continue;
        const Q = F[R], J = w[R];
        Q !== J && R !== "value" && l(y, R, J, Q, L, j);
      }
      "value" in F && l(y, "value", w.value, F.value, L);
    }
  }, I = (y, w, F, j, L, R, Q, J, K) => {
    const z = w.el = y ? y.el : a(""), pe = w.anchor = y ? y.anchor : a("");
    let { patchFlag: ie, dynamicChildren: me, slotScopeIds: M } = w;
    E.NODE_ENV !== "production" && // #5523 dev root fragment may inherit directives
    (Xt || ie & 2048) && (ie = 0, K = !1, me = null), M && (J = J ? J.concat(M) : M), y == null ? (o(z, F, j), o(pe, F, j), T(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      w.children || [],
      F,
      pe,
      L,
      R,
      Q,
      J,
      K
    )) : ie > 0 && ie & 64 && me && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    y.dynamicChildren ? (O(
      y.dynamicChildren,
      me,
      F,
      L,
      R,
      Q,
      J
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
      Q,
      J,
      K
    );
  }, B = (y, w, F, j, L, R, Q, J, K) => {
    w.slotScopeIds = J, y == null ? w.shapeFlag & 512 ? L.ctx.activate(
      w,
      F,
      j,
      Q,
      K
    ) : Z(
      w,
      F,
      j,
      L,
      R,
      Q,
      K
    ) : re(y, w, K);
  }, Z = (y, w, F, j, L, R, Q) => {
    const J = y.component = Dg(
      y,
      j,
      L
    );
    if (E.NODE_ENV !== "production" && J.type.__hmrId && hh(J), E.NODE_ENV !== "production" && (al(y), On(J, "mount")), Hi(y) && (J.ctx.renderer = Ht), E.NODE_ENV !== "production" && On(J, "init"), Mg(J, !1, Q), E.NODE_ENV !== "production" && In(J, "init"), J.asyncDep) {
      if (E.NODE_ENV !== "production" && Xt && (y.el = null), L && L.registerDep(J, ne, Q), !y.el) {
        const K = J.subTree = c(st);
        S(null, K, w, F);
      }
    } else
      ne(
        J,
        y,
        w,
        F,
        L,
        R,
        Q
      );
    E.NODE_ENV !== "production" && (rl(), In(J, "mount"));
  }, re = (y, w, F) => {
    const j = w.component = y.component;
    if (xg(y, w, F))
      if (j.asyncDep && !j.asyncResolved) {
        E.NODE_ENV !== "production" && al(w), X(j, w, F), E.NODE_ENV !== "production" && rl();
        return;
      } else
        j.next = w, j.update();
    else
      w.el = y.el, j.vnode = w;
  }, ne = (y, w, F, j, L, R, Q) => {
    const J = () => {
      if (y.isMounted) {
        let { next: ie, bu: me, u: M, parent: H, vnode: ye } = y;
        {
          const ot = Bd(y);
          if (ot) {
            ie && (ie.el = ye.el, X(y, ie, Q)), ot.asyncDep.then(() => {
              y.isUnmounted || J();
            });
            return;
          }
        }
        let ge = ie, ue;
        E.NODE_ENV !== "production" && al(ie || y.vnode), vo(y, !1), ie ? (ie.el = ye.el, X(y, ie, Q)) : ie = ye, me && Ho(me), (ue = ie.props && ie.props.onVnodeBeforeUpdate) && sn(ue, H, ie, ye), vo(y, !0), E.NODE_ENV !== "production" && On(y, "render");
        const Ae = xs(y);
        E.NODE_ENV !== "production" && In(y, "render");
        const et = y.subTree;
        y.subTree = Ae, E.NODE_ENV !== "production" && On(y, "patch"), g(
          et,
          Ae,
          // parent may have changed if it's in a teleport
          d(et.el),
          // anchor may have changed if it's in a fragment
          Re(et),
          y,
          L,
          R
        ), E.NODE_ENV !== "production" && In(y, "patch"), ie.el = Ae.el, ge === null && Vg(y, Ae.el), M && Ot(M, L), (ue = ie.props && ie.props.onVnodeUpdated) && Ot(
          () => sn(ue, H, ie, ye),
          L
        ), E.NODE_ENV !== "production" && rd(y), E.NODE_ENV !== "production" && rl();
      } else {
        let ie;
        const { el: me, props: M } = w, { bm: H, m: ye, parent: ge, root: ue, type: Ae } = y, et = gi(w);
        if (vo(y, !1), H && Ho(H), !et && (ie = M && M.onVnodeBeforeMount) && sn(ie, ge, w), vo(y, !0), me && qn) {
          const ot = () => {
            E.NODE_ENV !== "production" && On(y, "render"), y.subTree = xs(y), E.NODE_ENV !== "production" && In(y, "render"), E.NODE_ENV !== "production" && On(y, "hydrate"), qn(
              me,
              y.subTree,
              y,
              L,
              null
            ), E.NODE_ENV !== "production" && In(y, "hydrate");
          };
          et && Ae.__asyncHydrate ? Ae.__asyncHydrate(
            me,
            y,
            ot
          ) : ot();
        } else {
          ue.ce && ue.ce._injectChildStyle(Ae), E.NODE_ENV !== "production" && On(y, "render");
          const ot = y.subTree = xs(y);
          E.NODE_ENV !== "production" && In(y, "render"), E.NODE_ENV !== "production" && On(y, "patch"), g(
            null,
            ot,
            F,
            j,
            y,
            L,
            R
          ), E.NODE_ENV !== "production" && In(y, "patch"), w.el = ot.el;
        }
        if (ye && Ot(ye, L), !et && (ie = M && M.onVnodeMounted)) {
          const ot = w;
          Ot(
            () => sn(ie, ge, ot),
            L
          );
        }
        (w.shapeFlag & 256 || ge && gi(ge.vnode) && ge.vnode.shapeFlag & 256) && y.a && Ot(y.a, L), y.isMounted = !0, E.NODE_ENV !== "production" && wh(y), w = F = j = null;
      }
    };
    y.scope.on();
    const K = y.effect = new Dc(J);
    y.scope.off();
    const z = y.update = K.run.bind(K), pe = y.job = K.runIfDirty.bind(K);
    pe.i = y, pe.id = y.uid, K.scheduler = () => Zl(pe), vo(y, !0), E.NODE_ENV !== "production" && (K.onTrack = y.rtc ? (ie) => Ho(y.rtc, ie) : void 0, K.onTrigger = y.rtg ? (ie) => Ho(y.rtg, ie) : void 0), z();
  }, X = (y, w, F) => {
    w.component = y;
    const j = y.vnode.props;
    y.vnode = w, y.next = null, og(y, w.props, j, F), mg(y, w.children, F), Fn(), Mr(y), Bn();
  }, Ce = (y, w, F, j, L, R, Q, J, K = !1) => {
    const z = y && y.children, pe = y ? y.shapeFlag : 0, ie = w.children, { patchFlag: me, shapeFlag: M } = w;
    if (me > 0) {
      if (me & 128) {
        Y(
          z,
          ie,
          F,
          j,
          L,
          R,
          Q,
          J,
          K
        );
        return;
      } else if (me & 256) {
        G(
          z,
          ie,
          F,
          j,
          L,
          R,
          Q,
          J,
          K
        );
        return;
      }
    }
    M & 8 ? (pe & 16 && Ee(z, L, R), ie !== z && u(F, ie)) : pe & 16 ? M & 16 ? Y(
      z,
      ie,
      F,
      j,
      L,
      R,
      Q,
      J,
      K
    ) : Ee(z, L, R, !0) : (pe & 8 && u(F, ""), M & 16 && T(
      ie,
      F,
      j,
      L,
      R,
      Q,
      J,
      K
    ));
  }, G = (y, w, F, j, L, R, Q, J, K) => {
    y = y || Wo, w = w || Wo;
    const z = y.length, pe = w.length, ie = Math.min(z, pe);
    let me;
    for (me = 0; me < ie; me++) {
      const M = w[me] = K ? Jn(w[me]) : Kt(w[me]);
      g(
        y[me],
        M,
        F,
        null,
        L,
        R,
        Q,
        J,
        K
      );
    }
    z > pe ? Ee(
      y,
      L,
      R,
      !0,
      !1,
      ie
    ) : T(
      w,
      F,
      j,
      L,
      R,
      Q,
      J,
      K,
      ie
    );
  }, Y = (y, w, F, j, L, R, Q, J, K) => {
    let z = 0;
    const pe = w.length;
    let ie = y.length - 1, me = pe - 1;
    for (; z <= ie && z <= me; ) {
      const M = y[z], H = w[z] = K ? Jn(w[z]) : Kt(w[z]);
      if (_o(M, H))
        g(
          M,
          H,
          F,
          null,
          L,
          R,
          Q,
          J,
          K
        );
      else
        break;
      z++;
    }
    for (; z <= ie && z <= me; ) {
      const M = y[ie], H = w[me] = K ? Jn(w[me]) : Kt(w[me]);
      if (_o(M, H))
        g(
          M,
          H,
          F,
          null,
          L,
          R,
          Q,
          J,
          K
        );
      else
        break;
      ie--, me--;
    }
    if (z > ie) {
      if (z <= me) {
        const M = me + 1, H = M < pe ? w[M].el : j;
        for (; z <= me; )
          g(
            null,
            w[z] = K ? Jn(w[z]) : Kt(w[z]),
            F,
            H,
            L,
            R,
            Q,
            J,
            K
          ), z++;
      }
    } else if (z > me)
      for (; z <= ie; )
        Oe(y[z], L, R, !0), z++;
    else {
      const M = z, H = z, ye = /* @__PURE__ */ new Map();
      for (z = H; z <= me; z++) {
        const lt = w[z] = K ? Jn(w[z]) : Kt(w[z]);
        lt.key != null && (E.NODE_ENV !== "production" && ye.has(lt.key) && q(
          "Duplicate keys found during update:",
          JSON.stringify(lt.key),
          "Make sure keys are unique."
        ), ye.set(lt.key, z));
      }
      let ge, ue = 0;
      const Ae = me - H + 1;
      let et = !1, ot = 0;
      const ft = new Array(Ae);
      for (z = 0; z < Ae; z++) ft[z] = 0;
      for (z = M; z <= ie; z++) {
        const lt = y[z];
        if (ue >= Ae) {
          Oe(lt, L, R, !0);
          continue;
        }
        let Pt;
        if (lt.key != null)
          Pt = ye.get(lt.key);
        else
          for (ge = H; ge <= me; ge++)
            if (ft[ge - H] === 0 && _o(lt, w[ge])) {
              Pt = ge;
              break;
            }
        Pt === void 0 ? Oe(lt, L, R, !0) : (ft[Pt - H] = z + 1, Pt >= ot ? ot = Pt : et = !0, g(
          lt,
          w[Pt],
          F,
          null,
          L,
          R,
          Q,
          J,
          K
        ), ue++);
      }
      const jt = et ? pg(ft) : Wo;
      for (ge = jt.length - 1, z = Ae - 1; z >= 0; z--) {
        const lt = H + z, Pt = w[lt], co = lt + 1 < pe ? w[lt + 1].el : j;
        ft[z] === 0 ? g(
          null,
          Pt,
          F,
          co,
          L,
          R,
          Q,
          J,
          K
        ) : et && (ge < 0 || z !== jt[ge] ? te(Pt, F, co, 2) : ge--);
      }
    }
  }, te = (y, w, F, j, L = null) => {
    const { el: R, type: Q, transition: J, children: K, shapeFlag: z } = y;
    if (z & 6) {
      te(y.component.subTree, w, F, j);
      return;
    }
    if (z & 128) {
      y.suspense.move(w, F, j);
      return;
    }
    if (z & 64) {
      Q.move(y, w, F, Ht);
      return;
    }
    if (Q === Ve) {
      o(R, w, F);
      for (let ie = 0; ie < K.length; ie++)
        te(K[ie], w, F, j);
      o(y.anchor, w, F);
      return;
    }
    if (Q === dl) {
      P(y, w, F);
      return;
    }
    if (j !== 2 && z & 1 && J)
      if (j === 0)
        J.beforeEnter(R), o(R, w, F), Ot(() => J.enter(R), L);
      else {
        const { leave: ie, delayLeave: me, afterLeave: M } = J, H = () => o(R, w, F), ye = () => {
          ie(R, () => {
            H(), M && M();
          });
        };
        me ? me(R, H, ye) : ye();
      }
    else
      o(R, w, F);
  }, Oe = (y, w, F, j = !1, L = !1) => {
    const {
      type: R,
      props: Q,
      ref: J,
      children: K,
      dynamicChildren: z,
      shapeFlag: pe,
      patchFlag: ie,
      dirs: me,
      cacheIndex: M
    } = y;
    if (ie === -2 && (L = !1), J != null && Ks(J, null, F, y, !0), M != null && (w.renderCache[M] = void 0), pe & 256) {
      w.ctx.deactivate(y);
      return;
    }
    const H = pe & 1 && me, ye = !gi(y);
    let ge;
    if (ye && (ge = Q && Q.onVnodeBeforeUnmount) && sn(ge, w, y), pe & 6)
      oe(y.component, F, j);
    else {
      if (pe & 128) {
        y.suspense.unmount(F, j);
        return;
      }
      H && mo(y, null, w, "beforeUnmount"), pe & 64 ? y.type.remove(
        y,
        w,
        F,
        Ht,
        j
      ) : z && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !z.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (R !== Ve || ie > 0 && ie & 64) ? Ee(
        z,
        w,
        F,
        !1,
        !0
      ) : (R === Ve && ie & 384 || !L && pe & 16) && Ee(K, w, F), j && We(y);
    }
    (ye && (ge = Q && Q.onVnodeUnmounted) || H) && Ot(() => {
      ge && sn(ge, w, y), H && mo(y, null, w, "unmounted");
    }, F);
  }, We = (y) => {
    const { type: w, el: F, anchor: j, transition: L } = y;
    if (w === Ve) {
      E.NODE_ENV !== "production" && y.patchFlag > 0 && y.patchFlag & 2048 && L && !L.persisted ? y.children.forEach((Q) => {
        Q.type === st ? i(Q.el) : We(Q);
      }) : qe(F, j);
      return;
    }
    if (w === dl) {
      x(y);
      return;
    }
    const R = () => {
      i(F), L && !L.persisted && L.afterLeave && L.afterLeave();
    };
    if (y.shapeFlag & 1 && L && !L.persisted) {
      const { leave: Q, delayLeave: J } = L, K = () => Q(F, R);
      J ? J(y.el, R, K) : K();
    } else
      R();
  }, qe = (y, w) => {
    let F;
    for (; y !== w; )
      F = m(y), i(y), y = F;
    i(w);
  }, oe = (y, w, F) => {
    E.NODE_ENV !== "production" && y.type.__hmrId && gh(y);
    const { bum: j, scope: L, job: R, subTree: Q, um: J, m: K, a: z } = y;
    Yr(K), Yr(z), j && Ho(j), L.stop(), R && (R.flags |= 8, Oe(Q, y, w, F)), J && Ot(J, w), Ot(() => {
      y.isUnmounted = !0;
    }, w), w && w.pendingBranch && !w.isUnmounted && y.asyncDep && !y.asyncResolved && y.suspenseId === w.pendingId && (w.deps--, w.deps === 0 && w.resolve()), E.NODE_ENV !== "production" && Sh(y);
  }, Ee = (y, w, F, j = !1, L = !1, R = 0) => {
    for (let Q = R; Q < y.length; Q++)
      Oe(y[Q], w, F, j, L);
  }, Re = (y) => {
    if (y.shapeFlag & 6)
      return Re(y.component.subTree);
    if (y.shapeFlag & 128)
      return y.suspense.next();
    const w = m(y.anchor || y.el), F = w && w[fd];
    return F ? m(F) : w;
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
  }, Ht = {
    p: g,
    um: Oe,
    m: te,
    r: We,
    mt: Z,
    mc: T,
    pc: Ce,
    pbc: O,
    n: Re,
    o: e
  };
  let Wn, qn;
  return {
    render: Qe,
    hydrate: Wn,
    createApp: eg(Qe, Wn)
  };
}
function Es({ type: e, props: t }, n) {
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
    for (let l = 0; l < o.length; l++) {
      const s = o[l];
      let a = i[l];
      a.shapeFlag & 1 && !a.dynamicChildren && ((a.patchFlag <= 0 || a.patchFlag === 32) && (a = i[l] = Jn(i[l]), a.el = s.el), !n && a.patchFlag !== -2 && yi(s, a)), a.type === Mo && (a.el = s.el), E.NODE_ENV !== "production" && a.type === st && !a.el && (a.el = s.el);
    }
}
function pg(e) {
  const t = e.slice(), n = [0];
  let o, i, l, s, a;
  const r = e.length;
  for (o = 0; o < r; o++) {
    const f = e[o];
    if (f !== 0) {
      if (i = n[n.length - 1], e[i] < f) {
        t[o] = i, n.push(o);
        continue;
      }
      for (l = 0, s = n.length - 1; l < s; )
        a = l + s >> 1, e[n[a]] < f ? l = a + 1 : s = a;
      f < e[n[l]] && (l > 0 && (t[o] = n[l - 1]), n[l] = o);
    }
  }
  for (l = n.length, s = n[l - 1]; l-- > 0; )
    n[l] = s, s = t[s];
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
    const e = He(bg);
    return e || E.NODE_ENV !== "production" && q(
      "Server rendering context not provided. Make sure to only call useSSRContext() conditionally in the server build."
    ), e;
  }
};
function nn(e, t) {
  return ja(e, null, t);
}
function ke(e, t, n) {
  return E.NODE_ENV !== "production" && !Se(t) && q(
    "`watch(fn, options?)` signature has been moved to a separate API. Use `watchEffect(fn, options?)` instead. `watch` now only supports `watch(source, cb, options?) signature."
  ), ja(e, t, n);
}
function ja(e, t, n = Be) {
  const { immediate: o, deep: i, flush: l, once: s } = n;
  E.NODE_ENV !== "production" && !t && (o !== void 0 && q(
    'watch() "immediate" option is only respected when using the watch(source, callback, options?) signature.'
  ), i !== void 0 && q(
    'watch() "deep" option is only respected when using the watch(source, callback, options?) signature.'
  ), s !== void 0 && q(
    'watch() "once" option is only respected when using the watch(source, callback, options?) signature.'
  ));
  const a = Xe({}, n);
  E.NODE_ENV !== "production" && (a.onWarn = q);
  const r = t && o || !t && l !== "post";
  let f;
  if (Ei) {
    if (l === "sync") {
      const h = _g();
      f = h.__watcherHandles || (h.__watcherHandles = []);
    } else if (!r) {
      const h = () => {
      };
      return h.stop = ct, h.resume = ct, h.pause = ct, h;
    }
  }
  const u = dt;
  a.call = (h, v, g) => en(h, u, v, g);
  let d = !1;
  l === "post" ? a.scheduler = (h) => {
    Ot(h, u && u.suspense);
  } : l !== "sync" && (d = !0, a.scheduler = (h, v) => {
    v ? h() : Zl(h);
  }), a.augmentJob = (h) => {
    t && (h.flags |= 4), d && (h.flags |= 2, u && (h.id = u.uid, h.i = u));
  };
  const m = sh(e, t, a);
  return Ei && (f ? f.push(m) : r && m()), m;
}
function wg(e, t, n) {
  const o = this.proxy, i = Ye(e) ? e.includes(".") ? Ld(o, e) : () => o[e] : e.bind(o, o);
  let l;
  Se(t) ? l = t : (l = t.handler, n = t);
  const s = ji(this), a = ja(i, l.bind(o), n);
  return s(), a;
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
  const o = e.vnode.props || Be;
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
        const m = u[t];
        Se(m) && (m(...n) || q(
          `Invalid event arguments: event validation failed for event "${t}".`
        ));
      }
  }
  let i = n;
  const l = t.startsWith("update:"), s = l && kg(o, t.slice(7));
  if (s && (s.trim && (i = n.map((u) => Ye(u) ? u.trim() : u)), s.number && (i = n.map(wl))), E.NODE_ENV !== "production" && xh(e, t, i), E.NODE_ENV !== "production") {
    const u = t.toLowerCase();
    u !== t && o[po(u)] && q(
      `Event "${u}" is emitted in component ${os(
        e,
        e.type
      )} but the handler is registered for "${t}". Note that HTML attributes are case-insensitive and you cannot use v-on to listen to camelCase events when using in-DOM templates. You should probably use "${no(
        t
      )}" instead of "${t}".`
    );
  }
  let a, r = o[a = po(t)] || // also try camelCase event handler (#2249)
  o[a = po(gt(t))];
  !r && l && (r = o[a = po(no(t))]), r && en(
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
    e.emitted[a] = !0, en(
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
  const l = e.emits;
  let s = {}, a = !1;
  if (!Se(e)) {
    const r = (f) => {
      const u = Rd(f, t, !0);
      u && (a = !0, Xe(s, u));
    };
    !n && t.mixins.length && t.mixins.forEach(r), e.extends && r(e.extends), e.mixins && e.mixins.forEach(r);
  }
  return !l && !a ? ($e(e) && o.set(e, null), null) : (he(l) ? l.forEach((r) => s[r] = null) : Xe(s, l), $e(e) && o.set(e, s), s);
}
function es(e, t) {
  return !e || !$i(t) ? !1 : (t = t.slice(2).replace(/Once$/, ""), De(e, t[0].toLowerCase() + t.slice(1)) || De(e, no(t)) || De(e, t));
}
let ta = !1;
function Tl() {
  ta = !0;
}
function xs(e) {
  const {
    type: t,
    vnode: n,
    proxy: o,
    withProxy: i,
    propsOptions: [l],
    slots: s,
    attrs: a,
    emit: r,
    render: f,
    renderCache: u,
    props: d,
    data: m,
    setupState: h,
    ctx: v,
    inheritAttrs: g
  } = e, _ = xl(e);
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
      S = Kt(
        f.call(
          C,
          x,
          u,
          E.NODE_ENV !== "production" ? dn(d) : d,
          h,
          m,
          v
        )
      ), N = a;
    } else {
      const x = t;
      E.NODE_ENV !== "production" && a === d && Tl(), S = Kt(
        x.length > 1 ? x(
          E.NODE_ENV !== "production" ? dn(d) : d,
          E.NODE_ENV !== "production" ? {
            get attrs() {
              return Tl(), dn(a);
            },
            slots: s,
            emit: r
          } : { attrs: a, slots: s, emit: r }
        ) : x(
          E.NODE_ENV !== "production" ? dn(d) : d,
          null
        )
      ), N = t.props ? a : Cg(a);
    }
  } catch (x) {
    pi.length = 0, Li(x, e, 1), S = c(st);
  }
  let A = S, P;
  if (E.NODE_ENV !== "production" && S.patchFlag > 0 && S.patchFlag & 2048 && ([A, P] = Hd(S)), N && g !== !1) {
    const x = Object.keys(N), { shapeFlag: C } = A;
    if (x.length) {
      if (C & 7)
        l && x.some(bl) && (N = Eg(
          N,
          l
        )), A = tn(A, N, !1, !0);
      else if (E.NODE_ENV !== "production" && !ta && A.type !== st) {
        const $ = Object.keys(a), V = [], T = [];
        for (let D = 0, O = $.length; D < O; D++) {
          const k = $[D];
          $i(k) ? bl(k) || V.push(k[2].toLowerCase() + k.slice(3)) : T.push(k);
        }
        T.length && q(
          `Extraneous non-props attributes (${T.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes.`
        ), V.length && q(
          `Extraneous non-emits event listeners (${V.join(", ")}) were passed to component but could not be automatically inherited because component renders fragment or text root nodes. If the listener is intended to be a component custom event listener only, declare it using the "emits" option.`
        );
      }
    }
  }
  return n.dirs && (E.NODE_ENV !== "production" && !Xr(A) && q(
    "Runtime directive used on component with non-element root node. The directives will not function as intended."
  ), A = tn(A, null, !1, !0), A.dirs = A.dirs ? A.dirs.concat(n.dirs) : n.dirs), n.transition && (E.NODE_ENV !== "production" && !Xr(A) && q(
    "Component inside <Transition> renders non-element root node that cannot be animated."
  ), Do(A, n.transition)), E.NODE_ENV !== "production" && P ? P(A) : S = A, xl(_), S;
}
const Hd = (e) => {
  const t = e.children, n = e.dynamicChildren, o = za(t, !1);
  if (o) {
    if (E.NODE_ENV !== "production" && o.patchFlag > 0 && o.patchFlag & 2048)
      return Hd(o);
  } else return [e, void 0];
  const i = t.indexOf(o), l = n ? n.indexOf(o) : -1, s = (a) => {
    t[i] = a, n && (l > -1 ? n[l] = a : a.patchFlag > 0 && (e.dynamicChildren = [...n, a]));
  };
  return [Kt(o), s];
};
function za(e, t = !0) {
  let n;
  for (let o = 0; o < e.length; o++) {
    const i = e[o];
    if (Yo(i)) {
      if (i.type !== st || i.children === "v-if") {
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
    (!bl(o) || !(o.slice(9) in t)) && (n[o] = e[o]);
  return n;
}, Xr = (e) => e.shapeFlag & 7 || e.type === st;
function xg(e, t, n) {
  const { props: o, children: i, component: l } = e, { props: s, children: a, patchFlag: r } = t, f = l.emitsOptions;
  if (E.NODE_ENV !== "production" && (i || a) && Xt || t.dirs || t.transition)
    return !0;
  if (n && r >= 0) {
    if (r & 1024)
      return !0;
    if (r & 16)
      return o ? Jr(o, s, f) : !!s;
    if (r & 8) {
      const u = t.dynamicProps;
      for (let d = 0; d < u.length; d++) {
        const m = u[d];
        if (s[m] !== o[m] && !es(f, m))
          return !0;
      }
    }
  } else
    return (i || a) && (!a || !a.$stable) ? !0 : o === s ? !1 : o ? s ? Jr(o, s, f) : !0 : !!s;
  return !1;
}
function Jr(e, t, n) {
  const o = Object.keys(t);
  if (o.length !== Object.keys(e).length)
    return !0;
  for (let i = 0; i < o.length; i++) {
    const l = o[i];
    if (t[l] !== e[l] && !es(n, l))
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
const Ve = Symbol.for("v-fgt"), Mo = Symbol.for("v-txt"), st = Symbol.for("v-cmt"), dl = Symbol.for("v-stc"), pi = [];
let $t = null;
function ee(e = !1) {
  pi.push($t = e ? null : []);
}
function Tg() {
  pi.pop(), $t = pi[pi.length - 1] || null;
}
let Ci = 1;
function Zr(e) {
  Ci += e, e < 0 && $t && ($t.hasOnce = !0);
}
function zd(e) {
  return e.dynamicChildren = Ci > 0 ? $t || Wo : null, Tg(), Ci > 0 && $t && $t.push(e), e;
}
function Ze(e, t, n, o, i, l) {
  return zd(
    se(
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
function ve(e, t, n, o, i) {
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
    const n = ul.get(t.type);
    if (n && n.has(e.component))
      return e.shapeFlag &= -257, t.shapeFlag &= -513, !1;
  }
  return e.type === t.type && e.key === t.key;
}
const Og = (...e) => Wd(
  ...e
), Ud = ({ key: e }) => e ?? null, fl = ({
  ref: e,
  ref_key: t,
  ref_for: n
}) => (typeof e == "number" && (e = "" + e), e != null ? Ye(e) || je(e) || Se(e) ? { i: bt, r: e, k: t, f: !!n } : e : null);
function se(e, t = null, n = null, o = 0, i = null, l = e === Ve ? 0 : 1, s = !1, a = !1) {
  const r = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && Ud(t),
    ref: t && fl(t),
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
    shapeFlag: l,
    patchFlag: o,
    dynamicProps: i,
    dynamicChildren: null,
    appContext: null,
    ctx: bt
  };
  return a ? (Ua(r, n), l & 128 && e.normalize(r)) : n && (r.shapeFlag |= Ye(n) ? 8 : 16), E.NODE_ENV !== "production" && r.key !== r.key && q("VNode created with invalid key (NaN). VNode type:", r.type), Ci > 0 && // avoid a block node from tracking itself
  !s && // has current parent block
  $t && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (r.patchFlag > 0 || l & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  r.patchFlag !== 32 && $t.push(r), r;
}
const c = E.NODE_ENV !== "production" ? Og : Wd;
function Wd(e, t = null, n = null, o = 0, i = null, l = !1) {
  if ((!e || e === jh) && (E.NODE_ENV !== "production" && !e && q(`Invalid vnode type when creating vnode: ${e}.`), e = st), Yo(e)) {
    const a = tn(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return n && Ua(a, n), Ci > 0 && !l && $t && (a.shapeFlag & 6 ? $t[$t.indexOf(e)] = a : $t.push(a)), a.patchFlag = -2, a;
  }
  if (Yd(e) && (e = e.__vccOpts), t) {
    t = Ig(t);
    let { class: a, style: r } = t;
    a && !Ye(a) && (t.class = yn(a)), $e(r) && (wi(r) && !he(r) && (r = Xe({}, r)), t.style = rn(r));
  }
  const s = Ye(e) ? 1 : jd(e) ? 128 : md(e) ? 64 : $e(e) ? 4 : Se(e) ? 2 : 0;
  return E.NODE_ENV !== "production" && s & 4 && wi(e) && (e = fe(e), q(
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
    s,
    l,
    !0
  );
}
function Ig(e) {
  return e ? wi(e) || Id(e) ? Xe({}, e) : e : null;
}
function tn(e, t, n = !1, o = !1) {
  const { props: i, ref: l, patchFlag: s, children: a, transition: r } = e, f = t ? xe(i || {}, t) : i, u = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: f,
    key: f && Ud(f),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      n && l ? he(l) ? l.concat(fl(t)) : [l, fl(t)] : fl(t)
    ) : l,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: E.NODE_ENV !== "production" && s === -1 && he(a) ? a.map(qd) : a,
    target: e.target,
    targetStart: e.targetStart,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: t && e.type !== Ve ? s === -1 ? 16 : s | 16 : s,
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
    ssContent: e.ssContent && tn(e.ssContent),
    ssFallback: e.ssFallback && tn(e.ssFallback),
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return r && o && Do(
    u,
    r.clone(u)
  ), u;
}
function qd(e) {
  const t = tn(e);
  return he(e.children) && (t.children = e.children.map(qd)), t;
}
function U(e = " ", t = 0) {
  return c(Mo, null, e, t);
}
function ze(e = "", t = !1) {
  return t ? (ee(), ve(st, null, e)) : c(st, null, e);
}
function Kt(e) {
  return e == null || typeof e == "boolean" ? c(st) : he(e) ? c(
    Ve,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : Yo(e) ? Jn(e) : c(Mo, null, String(e));
}
function Jn(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : tn(e);
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
      !i && !Id(t) ? t._ctx = bt : i === 3 && bt && (bt.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else Se(t) ? (t = { default: t, _ctx: bt }, n = 32) : (t = String(t), o & 64 ? (n = 16, t = [U(t)]) : n = 8);
  e.children = t, e.shapeFlag |= n;
}
function xe(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const o = e[n];
    for (const i in o)
      if (i === "class")
        t.class !== o.class && (t.class = yn([t.class, o.class]));
      else if (i === "style")
        t.style = rn([t.style, o.style]);
      else if ($i(i)) {
        const l = t[i], s = o[i];
        s && l !== s && !(he(l) && l.includes(s)) && (t[i] = l ? [].concat(l, s) : s);
      } else i !== "" && (t[i] = o[i]);
  }
  return t;
}
function sn(e, t, n, o = null) {
  en(e, t, 7, [
    n,
    o
  ]);
}
const Ag = Nd();
let Pg = 0;
function Dg(e, t, n) {
  const o = e.type, i = (t ? t.appContext : e.appContext) || Ag, l = {
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
    propsDefaults: Be,
    // inheritAttrs
    inheritAttrs: o.inheritAttrs,
    // state
    ctx: Be,
    data: Be,
    props: Be,
    attrs: Be,
    slots: Be,
    refs: Be,
    setupState: Be,
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
  return E.NODE_ENV !== "production" ? l.ctx = Uh(l) : l.ctx = { _: l }, l.root = t ? t.root : l, l.emit = Sg.bind(null, l), e.ce && e.ce(l), l;
}
let dt = null;
const ts = () => dt || bt;
let Ol, na;
{
  const e = Fi(), t = (n, o) => {
    let i;
    return (i = e[n]) || (i = e[n] = []), i.push(o), (l) => {
      i.length > 1 ? i.forEach((s) => s(l)) : i[0](l);
    };
  };
  Ol = t(
    "__VUE_INSTANCE_SETTERS__",
    (n) => dt = n
  ), na = t(
    "__VUE_SSR_SETTERS__",
    (n) => Ei = n
  );
}
const ji = (e) => {
  const t = dt;
  return Ol(e), e.scope.on(), () => {
    e.scope.off(), Ol(t);
  };
}, Qr = () => {
  dt && dt.scope.off(), Ol(null);
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
  const { props: o, children: i } = e.vnode, l = Gd(e);
  tg(e, o, l, t), fg(e, i, n);
  const s = l ? Fg(e, t) : void 0;
  return t && na(!1), s;
}
function Fg(e, t) {
  var n;
  const o = e.type;
  if (E.NODE_ENV !== "production") {
    if (o.name && oa(o.name, e.appContext.config), o.components) {
      const l = Object.keys(o.components);
      for (let s = 0; s < l.length; s++)
        oa(l[s], e.appContext.config);
    }
    if (o.directives) {
      const l = Object.keys(o.directives);
      for (let s = 0; s < l.length; s++)
        dd(l[s]);
    }
    o.compilerOptions && Bg() && q(
      '"compilerOptions" is only supported when using a build of Vue that includes the runtime compiler. Since you are using a runtime-only build, the options should be passed via your build tool config instead.'
    );
  }
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, xd), E.NODE_ENV !== "production" && Wh(e);
  const { setup: i } = o;
  if (i) {
    Fn();
    const l = e.setupContext = i.length > 1 ? Rg(e) : null, s = ji(e), a = Qo(
      i,
      e,
      0,
      [
        E.NODE_ENV !== "production" ? dn(e.props) : e.props,
        l
      ]
    ), r = Ca(a);
    if (Bn(), s(), (r || e.sp) && !gi(e) && _d(e), r) {
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
        const { isCustomElement: l, compilerOptions: s } = e.appContext.config, { delimiters: a, compilerOptions: r } = o, f = Xe(
          Xe(
            {
              isCustomElement: l,
              delimiters: a
            },
            s
          ),
          r
        );
        o.render = ia(i, f), E.NODE_ENV !== "production" && In(e, "compile");
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
    return Tl(), ut(e, "get", ""), e[t];
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
      o === "object" && (he(n) ? o = "array" : je(n) && (o = "ref")), o !== "object" && q(
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
        return (i, ...l) => e.emit(i, ...l);
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
function ns(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Zc(Xc(e.exposed)), {
    get(t, n) {
      if (n in t)
        return t[n];
      if (n in To)
        return To[n](e);
    },
    has(t, n) {
      return n in t || n in To;
    }
  })) : e.proxy;
}
const Hg = /(?:^|[-_])(\w)/g, jg = (e) => e.replace(Hg, (t) => t.toUpperCase()).replace(/[-_]/g, "");
function Wa(e, t = !0) {
  return Se(e) ? e.displayName || e.name : e.name || t && e.__name;
}
function os(e, t, n = !1) {
  let o = Wa(t);
  if (!o && t.__file) {
    const i = t.__file.match(/([^/\\]+)\.\w+$/);
    i && (o = i[1]);
  }
  if (!o && e && e.parent) {
    const i = (l) => {
      for (const s in l)
        if (l[s] === t)
          return s;
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
    const o = ts();
    o && o.appContext.config.warnRecursiveComputed && (n._warnRecursive = !0);
  }
  return n;
};
function lo(e, t, n) {
  const o = arguments.length;
  return o === 2 ? $e(t) && !he(t) ? Yo(t) ? c(e, null, [t]) : c(e, t) : c(e, null, t) : (o > 3 ? n = Array.prototype.slice.call(arguments, 2) : o === 3 && Yo(n) && (n = [n]), c(e, t, n));
}
function zg() {
  if (E.NODE_ENV === "production" || typeof window > "u")
    return;
  const e = { style: "color:#3ba776" }, t = { style: "color:#1677ff" }, n = { style: "color:#f5222d" }, o = { style: "color:#eb2f96" }, i = {
    __vue_custom_formatter: !0,
    header(d) {
      return $e(d) ? d.__isVue ? ["div", e, "VueInstance"] : je(d) ? [
        "div",
        {},
        ["span", e, u(d)],
        "<",
        // avoid debugger accessing value affecting behavior
        a("_value" in d ? d._value : d),
        ">"
      ] : xo(d) ? [
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
          ...l(d.$)
        ];
    }
  };
  function l(d) {
    const m = [];
    d.type.props && d.props && m.push(s("props", fe(d.props))), d.setupState !== Be && m.push(s("setup", d.setupState)), d.data !== Be && m.push(s("data", fe(d.data)));
    const h = r(d, "computed");
    h && m.push(s("computed", h));
    const v = r(d, "inject");
    return v && m.push(s("injected", v)), m.push([
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
    return m = Xe({}, m), Object.keys(m).length ? [
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
        ...Object.keys(m).map((h) => [
          "div",
          {},
          ["span", o, h + ": "],
          a(m[h], !1)
        ])
      ]
    ] : ["span", {}];
  }
  function a(d, m = !0) {
    return typeof d == "number" ? ["span", t, d] : typeof d == "string" ? ["span", n, JSON.stringify(d)] : typeof d == "boolean" ? ["span", o, d] : $e(d) ? ["object", { object: m ? fe(d) : d }] : ["span", n, String(d)];
  }
  function r(d, m) {
    const h = d.type;
    if (Se(h))
      return;
    const v = {};
    for (const g in d.ctx)
      f(h, g, m) && (v[g] = d.ctx[g]);
    return v;
  }
  function f(d, m, h) {
    const v = d[h];
    if (he(v) && v.includes(m) || $e(v) && m in v || d.extends && f(d.extends, m, h) || d.mixins && d.mixins.some((g) => f(g, m, h)))
      return !0;
  }
  function u(d) {
    return xt(d) ? "ShallowRef" : d.effect ? "ComputedRef" : "Ref";
  }
  window.devtoolsFormatters ? window.devtoolsFormatters.push(i) : window.devtoolsFormatters = [i];
}
const nu = "3.5.12", Vt = E.NODE_ENV !== "production" ? q : ct;
var Mt = {};
let la;
const ou = typeof window < "u" && window.trustedTypes;
if (ou)
  try {
    la = /* @__PURE__ */ ou.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch (e) {
    Mt.NODE_ENV !== "production" && Vt(`Error creating trusted types policy: ${e}`);
  }
const Xd = la ? (e) => la.createHTML(e) : (e) => e, Ug = "http://www.w3.org/2000/svg", Wg = "http://www.w3.org/1998/Math/MathML", Pn = typeof document < "u" ? document : null, iu = Pn && /* @__PURE__ */ Pn.createElement("template"), qg = {
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
  insertStaticContent(e, t, n, o, i, l) {
    const s = n ? n.previousSibling : t.lastChild;
    if (i && (i === l || i.nextSibling))
      for (; t.insertBefore(i.cloneNode(!0), n), !(i === l || !(i = i.nextSibling)); )
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
      s ? s.nextSibling : t.firstChild,
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
}, Zd = /* @__PURE__ */ Xe(
  {},
  gd,
  Jd
), Gg = (e) => (e.displayName = "Transition", e.props = Zd, e), $o = /* @__PURE__ */ Gg(
  (e, { slots: t }) => lo(Ah, Qd(e), t)
), ho = (e, t = []) => {
  he(e) ? e.forEach((n) => n(...t)) : e && e(...t);
}, lu = (e) => e ? he(e) ? e.some((t) => t.length > 1) : e.length > 1 : !1;
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
    enterFromClass: l = `${n}-enter-from`,
    enterActiveClass: s = `${n}-enter-active`,
    enterToClass: a = `${n}-enter-to`,
    appearFromClass: r = l,
    appearActiveClass: f = s,
    appearToClass: u = a,
    leaveFromClass: d = `${n}-leave-from`,
    leaveActiveClass: m = `${n}-leave-active`,
    leaveToClass: h = `${n}-leave-to`
  } = e, v = Kg(i), g = v && v[0], _ = v && v[1], {
    onBeforeEnter: S,
    onEnter: N,
    onEnterCancelled: A,
    onLeave: P,
    onLeaveCancelled: x,
    onBeforeAppear: C = S,
    onAppear: $ = N,
    onAppearCancelled: V = A
  } = t, T = (k, I, B) => {
    Kn(k, I ? u : a), Kn(k, I ? f : s), B && B();
  }, D = (k, I) => {
    k._isLeaving = !1, Kn(k, d), Kn(k, h), Kn(k, m), I && I();
  }, O = (k) => (I, B) => {
    const Z = k ? $ : N, re = () => T(I, k, B);
    ho(Z, [I, re]), su(() => {
      Kn(I, k ? r : l), An(I, k ? u : a), lu(Z) || au(I, o, g, re);
    });
  };
  return Xe(t, {
    onBeforeEnter(k) {
      ho(S, [k]), An(k, l), An(k, s);
    },
    onBeforeAppear(k) {
      ho(C, [k]), An(k, r), An(k, f);
    },
    onEnter: O(!1),
    onAppear: O(!0),
    onLeave(k, I) {
      k._isLeaving = !0;
      const B = () => D(k, I);
      An(k, d), An(k, m), tf(), su(() => {
        k._isLeaving && (Kn(k, d), An(k, h), lu(P) || au(k, o, _, B));
      }), ho(P, [k, B]);
    },
    onEnterCancelled(k) {
      T(k, !1), ho(A, [k]);
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
    return [Vs(e.enter), Vs(e.leave)];
  {
    const t = Vs(e);
    return [t, t];
  }
}
function Vs(e) {
  const t = yv(e);
  return Mt.NODE_ENV !== "production" && dh(t, "<transition> explicit duration"), t;
}
function An(e, t) {
  t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[Xo] || (e[Xo] = /* @__PURE__ */ new Set())).add(t);
}
function Kn(e, t) {
  t.split(/\s+/).forEach((o) => o && e.classList.remove(o));
  const n = e[Xo];
  n && (n.delete(t), n.size || (e[Xo] = void 0));
}
function su(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let Yg = 0;
function au(e, t, n, o) {
  const i = e._endId = ++Yg, l = () => {
    i === e._endId && o();
  };
  if (n != null)
    return setTimeout(l, n);
  const { type: s, timeout: a, propCount: r } = ef(e, t);
  if (!s)
    return o();
  const f = s + "end";
  let u = 0;
  const d = () => {
    e.removeEventListener(f, m), l();
  }, m = (h) => {
    h.target === e && ++u >= r && d();
  };
  setTimeout(() => {
    u < r && d();
  }, a + 1), e.addEventListener(f, m);
}
function ef(e, t) {
  const n = window.getComputedStyle(e), o = (v) => (n[v] || "").split(", "), i = o(`${Gn}Delay`), l = o(`${Gn}Duration`), s = ru(i, l), a = o(`${ai}Delay`), r = o(`${ai}Duration`), f = ru(a, r);
  let u = null, d = 0, m = 0;
  t === Gn ? s > 0 && (u = Gn, d = s, m = l.length) : t === ai ? f > 0 && (u = ai, d = f, m = r.length) : (d = Math.max(s, f), u = d > 0 ? s > f ? Gn : ai : null, m = u ? u === Gn ? l.length : r.length : 0);
  const h = u === Gn && /\b(transform|all)(,|$)/.test(
    o(`${Gn}Property`).toString()
  );
  return {
    type: u,
    timeout: d,
    propCount: m,
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
const Il = Symbol("_vod"), nf = Symbol("_vsh"), En = {
  beforeMount(e, { value: t }, { transition: n }) {
    e[Il] = e.style.display === "none" ? "" : e.style.display, n && t ? n.beforeEnter(e) : ri(e, t);
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
Mt.NODE_ENV !== "production" && (En.name = "show");
function ri(e, t) {
  e.style.display = t ? e[Il] : "none", e[nf] = !t;
}
const Jg = Symbol(Mt.NODE_ENV !== "production" ? "CSS_VAR_TEXT" : ""), Zg = /(^|;)\s*display\s*:/;
function Qg(e, t, n) {
  const o = e.style, i = Ye(n);
  let l = !1;
  if (n && !i) {
    if (t)
      if (Ye(t))
        for (const s of t.split(";")) {
          const a = s.slice(0, s.indexOf(":")).trim();
          n[a] == null && ml(o, a, "");
        }
      else
        for (const s in t)
          n[s] == null && ml(o, s, "");
    for (const s in n)
      s === "display" && (l = !0), ml(o, s, n[s]);
  } else if (i) {
    if (t !== n) {
      const s = o[Jg];
      s && (n += ";" + s), o.cssText = n, l = Zg.test(n);
    }
  } else t && e.removeAttribute("style");
  Il in e && (e[Il] = l ? o.display : "", e[nf] && (o.display = "none"));
}
const ey = /[^\\];\s*$/, cu = /\s*!important$/;
function ml(e, t, n) {
  if (he(n))
    n.forEach((o) => ml(e, t, o));
  else if (n == null && (n = ""), Mt.NODE_ENV !== "production" && ey.test(n) && Vt(
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
const du = ["Webkit", "Moz", "ms"], Ns = {};
function ty(e, t) {
  const n = Ns[t];
  if (n)
    return n;
  let o = gt(t);
  if (o !== "filter" && o in e)
    return Ns[t] = o;
  o = Wt(o);
  for (let i = 0; i < du.length; i++) {
    const l = du[i] + o;
    if (l in e)
      return Ns[t] = l;
  }
  return t;
}
const fu = "http://www.w3.org/1999/xlink";
function mu(e, t, n, o, i, l = Tv(t)) {
  o && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(fu, t.slice(6, t.length)) : e.setAttributeNS(fu, t, n) : n == null || l && !Oc(n) ? e.removeAttribute(t) : e.setAttribute(
    t,
    l ? "" : kn(n) ? String(n) : n
  );
}
function vu(e, t, n, o, i) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? Xd(n) : n);
    return;
  }
  const l = e.tagName;
  if (t === "value" && l !== "PROGRESS" && // custom elements may use _value internally
  !l.includes("-")) {
    const a = l === "OPTION" ? e.getAttribute("value") || "" : e.value, r = n == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      e.type === "checkbox" ? "on" : ""
    ) : String(n);
    (a !== r || !("_value" in e)) && (e.value = r), n == null && e.removeAttribute(t), e._value = n;
    return;
  }
  let s = !1;
  if (n === "" || n == null) {
    const a = typeof e[t];
    a === "boolean" ? n = Oc(n) : n == null && a === "string" ? (n = "", s = !0) : a === "number" && (n = 0, s = !0);
  }
  try {
    e[t] = n;
  } catch (a) {
    Mt.NODE_ENV !== "production" && !s && Vt(
      `Failed setting prop "${t}" on <${l.toLowerCase()}>: value ${n} is invalid.`,
      a
    );
  }
  s && e.removeAttribute(i || t);
}
function wo(e, t, n, o) {
  e.addEventListener(t, n, o);
}
function ny(e, t, n, o) {
  e.removeEventListener(t, n, o);
}
const hu = Symbol("_vei");
function oy(e, t, n, o, i = null) {
  const l = e[hu] || (e[hu] = {}), s = l[t];
  if (o && s)
    s.value = Mt.NODE_ENV !== "production" ? yu(o, t) : o;
  else {
    const [a, r] = iy(t);
    if (o) {
      const f = l[t] = ay(
        Mt.NODE_ENV !== "production" ? yu(o, t) : o,
        i
      );
      wo(e, a, f, r);
    } else s && (ny(e, a, s, r), l[t] = void 0);
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
let Ts = 0;
const ly = /* @__PURE__ */ Promise.resolve(), sy = () => Ts || (ly.then(() => Ts = 0), Ts = Date.now());
function ay(e, t) {
  const n = (o) => {
    if (!o._vts)
      o._vts = Date.now();
    else if (o._vts <= n.attached)
      return;
    en(
      ry(o, n.value),
      t,
      5,
      [o]
    );
  };
  return n.value = e, n.attached = sy(), n;
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
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, uy = (e, t, n, o, i, l) => {
  const s = i === "svg";
  t === "class" ? Xg(e, o, s) : t === "style" ? Qg(e, n, o) : $i(t) ? bl(t) || oy(e, t, n, o, l) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : cy(e, t, o, s)) ? (vu(e, t, o), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && mu(e, t, o, s, l, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && (/[A-Z]/.test(t) || !Ye(o)) ? vu(e, gt(t), o, l, t) : (t === "true-value" ? e._trueValue = o : t === "false-value" && (e._falseValue = o), mu(e, t, o, s));
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
  return pu(t) && Ye(n) ? !1 : t in e;
}
const of = /* @__PURE__ */ new WeakMap(), lf = /* @__PURE__ */ new WeakMap(), Al = Symbol("_moveCb"), bu = Symbol("_enterCb"), dy = (e) => (delete e.props.mode, e), fy = /* @__PURE__ */ dy({
  name: "TransitionGroup",
  props: /* @__PURE__ */ Xe({}, Zd, {
    tag: String,
    moveClass: String
  }),
  setup(e, { slots: t }) {
    const n = ts(), o = hd();
    let i, l;
    return Ba(() => {
      if (!i.length)
        return;
      const s = e.moveClass || `${e.name || "v"}-move`;
      if (!gy(
        i[0].el,
        n.vnode.el,
        s
      ))
        return;
      i.forEach(my), i.forEach(vy);
      const a = i.filter(hy);
      tf(), a.forEach((r) => {
        const f = r.el, u = f.style;
        An(f, s), u.transform = u.webkitTransform = u.transitionDuration = "";
        const d = f[Al] = (m) => {
          m && m.target !== f || (!m || /transform$/.test(m.propertyName)) && (f.removeEventListener("transitionend", d), f[Al] = null, Kn(f, s));
        };
        f.addEventListener("transitionend", d);
      });
    }), () => {
      const s = fe(e), a = Qd(s);
      let r = s.tag || Ve;
      if (i = [], l)
        for (let f = 0; f < l.length; f++) {
          const u = l[f];
          u.el && u.el instanceof Element && (i.push(u), Do(
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
      l = t.default ? Ma(t.default()) : [];
      for (let f = 0; f < l.length; f++) {
        const u = l[f];
        u.key != null ? Do(
          u,
          Si(u, a, o, n)
        ) : Mt.NODE_ENV !== "production" && u.type !== Mo && Vt("<TransitionGroup> children must be keyed.");
      }
      return c(r, null, l);
    };
  }
}), qa = fy;
function my(e) {
  const t = e.el;
  t[Al] && t[Al](), t[bu] && t[bu]();
}
function vy(e) {
  lf.set(e, e.el.getBoundingClientRect());
}
function hy(e) {
  const t = of.get(e), n = lf.get(e), o = t.left - n.left, i = t.top - n.top;
  if (o || i) {
    const l = e.el.style;
    return l.transform = l.webkitTransform = `translate(${o}px,${i}px)`, l.transitionDuration = "0s", e;
  }
}
function gy(e, t, n) {
  const o = e.cloneNode(), i = e[Xo];
  i && i.forEach((a) => {
    a.split(/\s+/).forEach((r) => r && o.classList.remove(r));
  }), n.split(/\s+/).forEach((a) => a && o.classList.add(a)), o.style.display = "none";
  const l = t.nodeType === 1 ? t : t.parentNode;
  l.appendChild(o);
  const { hasTransform: s } = ef(o);
  return l.removeChild(o), s;
}
const Pl = (e) => {
  const t = e.props["onUpdate:modelValue"] || !1;
  return he(t) ? (n) => Ho(t, n) : t;
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
    e[Ko] = Pl(i);
    const l = o || i.props && i.props.type === "number";
    wo(e, t ? "change" : "input", (s) => {
      if (s.target.composing) return;
      let a = e.value;
      n && (a = a.trim()), l && (a = wl(a)), e[Ko](a);
    }), n && wo(e, "change", () => {
      e.value = e.value.trim();
    }), t || (wo(e, "compositionstart", yy), wo(e, "compositionend", _u), wo(e, "change", _u));
  },
  // set value on mounted so it's after min/max for type="range"
  mounted(e, { value: t }) {
    e.value = t ?? "";
  },
  beforeUpdate(e, { value: t, oldValue: n, modifiers: { lazy: o, trim: i, number: l } }, s) {
    if (e[Ko] = Pl(s), e.composing) return;
    const a = (l || e.type === "number") && !/^0\d/.test(e.value) ? wl(e.value) : e.value, r = t ?? "";
    a !== r && (document.activeElement === e && e.type !== "range" && (o && t === n || i && e.value.trim() === r) || (e.value = r));
  }
}, by = {
  // <select multiple> value need to be deep traversed
  deep: !0,
  created(e, { value: t, modifiers: { number: n } }, o) {
    const i = ql(t);
    wo(e, "change", () => {
      const l = Array.prototype.filter.call(e.options, (s) => s.selected).map(
        (s) => n ? wl(Dl(s)) : Dl(s)
      );
      e[Ko](
        e.multiple ? i ? new Set(l) : l : l[0]
      ), e._assigning = !0, at(() => {
        e._assigning = !1;
      });
    }), e[Ko] = Pl(o);
  },
  // set value in mounted & updated because <select> relies on its children
  // <option>s.
  mounted(e, { value: t }) {
    wu(e, t);
  },
  beforeUpdate(e, t, n) {
    e[Ko] = Pl(n);
  },
  updated(e, { value: t }) {
    e._assigning || wu(e, t);
  }
};
function wu(e, t) {
  const n = e.multiple, o = he(t);
  if (n && !o && !ql(t)) {
    Mt.NODE_ENV !== "production" && Vt(
      `<select multiple v-model> expects an Array or Set value for its binding, but got ${Object.prototype.toString.call(t).slice(8, -1)}.`
    );
    return;
  }
  for (let i = 0, l = e.options.length; i < l; i++) {
    const s = e.options[i], a = Dl(s);
    if (n)
      if (o) {
        const r = typeof a;
        r === "string" || r === "number" ? s.selected = t.some((f) => String(f) === String(a)) : s.selected = Iv(t, a) > -1;
      } else
        s.selected = t.has(a);
    else if (Kl(Dl(s), t)) {
      e.selectedIndex !== i && (e.selectedIndex = i);
      return;
    }
  }
  !n && e.selectedIndex !== -1 && (e.selectedIndex = -1);
}
function Dl(e) {
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
}, vl = (e, t) => {
  const n = e._withMods || (e._withMods = {}), o = t.join(".");
  return n[o] || (n[o] = (i, ...l) => {
    for (let s = 0; s < t.length; s++) {
      const a = wy[t[s]];
      if (a && a(i, t)) return;
    }
    return e(i, ...l);
  });
}, ky = /* @__PURE__ */ Xe({ patchProp: uy }, qg);
let ku;
function Sy() {
  return ku || (ku = hg(ky));
}
const Cy = (...e) => {
  const t = Sy().createApp(...e);
  Mt.NODE_ENV !== "production" && (xy(t), Vy(t));
  const { mount: n } = t;
  return t.mount = (o) => {
    const i = Ny(o);
    if (!i) return;
    const l = t._component;
    !Se(l) && !l.render && !l.template && (l.template = i.innerHTML), i.nodeType === 1 && (i.textContent = "");
    const s = n(i, !1, Ey(i));
    return i instanceof Element && (i.removeAttribute("v-cloak"), i.setAttribute("data-v-app", "")), s;
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
  if (Ye(e)) {
    const t = document.querySelector(e);
    return Mt.NODE_ENV !== "production" && !t && Vt(
      `Failed to mount app: mount target selector "${e}" returned null.`
    ), t;
  }
  return Mt.NODE_ENV !== "production" && window.ShadowRoot && e instanceof window.ShadowRoot && e.mode === "closed" && Vt(
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
  }), Bt(() => {
    n == null || n.stop();
  });
}
const Ge = typeof window < "u", Ga = Ge && "IntersectionObserver" in window, Iy = Ge && ("ontouchstart" in window || window.navigator.maxTouchPoints > 0);
function sf(e, t, n) {
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
function sa(e, t, n) {
  return e == null || !t || typeof t != "string" ? n : e[t] !== void 0 ? e[t] : (t = t.replace(/\[(\w+)\]/g, ".$1"), t = t.replace(/^\./, ""), sf(e, t.split("."), n));
}
function ui(e, t, n) {
  if (t === !0) return e === void 0 ? n : e;
  if (t == null || typeof t == "boolean") return n;
  if (e !== Object(e)) {
    if (typeof t != "function") return n;
    const i = t(e, n);
    return typeof i > "u" ? n : i;
  }
  if (typeof t == "string") return sa(e, t, n);
  if (Array.isArray(t)) return sf(e, t, n);
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
}), Ay = Object.freeze({
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
function Os(e, t) {
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
  for (const l in e)
    t.some((s) => s instanceof RegExp ? s.test(l) : s === l) && !(n != null && n.some((s) => s === l)) ? o[l] = e[l] : i[l] = e[l];
  return [o, i];
}
function Fo(e, t) {
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
function is(e) {
  const [t, n] = aa(e, [cf]), o = Fo(t, Dy), [i, l] = aa(n, ["class", "style", "id", /^data-/]);
  return Object.assign(i, t), Object.assign(l, o), [i, l];
}
function pn(e) {
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
function _t() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {}, n = arguments.length > 2 ? arguments[2] : void 0;
  const o = {};
  for (const i in e)
    o[i] = e[i];
  for (const i in t) {
    const l = e[i], s = t[i];
    if (Su(l) && Su(s)) {
      o[i] = _t(l, s, n);
      continue;
    }
    if (n && Array.isArray(l) && Array.isArray(s)) {
      o[i] = n(l, s);
      continue;
    }
    o[i] = s;
  }
  return o;
}
function df(e) {
  return e.map((t) => t.type === Ve ? df(t.children) : t).flat();
}
function Oo() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  if (Oo.cache.has(e)) return Oo.cache.get(e);
  const t = e.replace(/[^a-z]/gi, "-").replace(/\B([A-Z])/g, "-$1").toLowerCase();
  return Oo.cache.set(e, t), t;
}
Oo.cache = /* @__PURE__ */ new Map();
function zo(e, t) {
  if (!t || typeof t != "object") return [];
  if (Array.isArray(t))
    return t.map((n) => zo(e, n)).flat(1);
  if (t.suspense)
    return zo(e, t.ssContent);
  if (Array.isArray(t.children))
    return t.children.map((n) => zo(e, n)).flat(1);
  if (t.component) {
    if (Object.getOwnPropertySymbols(t.component.provides).includes(e))
      return [t.component];
    if (t.component.subTree)
      return zo(e, t.component.subTree).flat(1);
  }
  return [];
}
function Ja(e) {
  const t = ht({}), n = b(e);
  return nn(() => {
    for (const o in n.value)
      t[o] = n.value[o];
  }, {
    flush: "sync"
  }), Aa(t);
}
function $l(e, t) {
  return e.includes(t);
}
function ff(e) {
  return e[2].toLowerCase() + e.slice(3);
}
const Ut = () => [Function, Array];
function Nu(e, t) {
  return t = "on" + Wt(t), !!(e[t] || e[`${t}Once`] || e[`${t}Capture`] || e[`${t}OnceCapture`] || e[`${t}CaptureOnce`]);
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
  const l = t === "next" ? 1 : -1;
  do
    i += l, o = e[i];
  while ((!o || o.offsetParent == null) && i < e.length && i >= 0);
  return o;
}
function vf(e, t) {
  var o, i, l, s;
  const n = Za(e);
  if (!t)
    (e === document.activeElement || !e.contains(document.activeElement)) && ((o = n[0]) == null || o.focus());
  else if (t === "first")
    (i = n[0]) == null || i.focus();
  else if (t === "last")
    (l = n.at(-1)) == null || l.focus();
  else if (typeof t == "number")
    (s = n[t]) == null || s.focus();
  else {
    const a = My(n, t);
    a ? a.focus() : vf(e, t === "next" ? "first" : "last");
  }
}
function hf(e, t) {
  if (!(Ge && typeof CSS < "u" && typeof CSS.supports < "u" && CSS.supports(`selector(${t})`))) return null;
  try {
    return !!e && e.matches(t);
  } catch {
    return null;
  }
}
function Fy(e, t) {
  if (!Ge || e === 0)
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
  return o || (o = $l(gf, n) ? "start" : $l(By, n) ? "top" : "center"), {
    side: Tu(n, t),
    align: Tu(o, t)
  };
}
function Tu(e, t) {
  return e === "start" ? t ? "right" : "left" : e === "end" ? t ? "left" : "right" : e;
}
function Is(e) {
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
function As(e) {
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
function Iu(e) {
  return $l(gf, e.side) ? "y" : "x";
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
function Au(e, t) {
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
  return Array.isArray(e) ? new Io({
    x: e[0],
    y: e[1],
    width: 0,
    height: 0
  }) : e.getBoundingClientRect();
}
function Qa(e) {
  const t = e.getBoundingClientRect(), n = getComputedStyle(e), o = n.transform;
  if (o) {
    let i, l, s, a, r;
    if (o.startsWith("matrix3d("))
      i = o.slice(9, -1).split(/, /), l = +i[0], s = +i[5], a = +i[12], r = +i[13];
    else if (o.startsWith("matrix("))
      i = o.slice(7, -1).split(/, /), l = +i[0], s = +i[3], a = +i[4], r = +i[5];
    else
      return new Io(t);
    const f = n.transformOrigin, u = t.x - a - (1 - l) * parseFloat(f), d = t.y - r - (1 - s) * parseFloat(f.slice(f.indexOf(" ") + 1)), m = l ? t.width / l : e.offsetWidth + 1, h = s ? t.height / s : e.offsetHeight + 1;
    return new Io({
      x: u,
      y: d,
      width: m,
      height: h
    });
  } else
    return new Io(t);
}
function So(e, t, n) {
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
const hl = /* @__PURE__ */ new WeakMap();
function Ly(e, t) {
  Object.keys(t).forEach((n) => {
    if (Xa(n)) {
      const o = ff(n), i = hl.get(e);
      if (t[n] == null)
        i == null || i.forEach((l) => {
          const [s, a] = l;
          s === o && (e.removeEventListener(o, a), i.delete(l));
        });
      else if (!i || ![...i].some((l) => l[0] === o && l[1] === t[n])) {
        e.addEventListener(o, t[n]);
        const l = i || /* @__PURE__ */ new Set();
        l.add([o, t[n]]), hl.has(e) || hl.set(e, l);
      }
    } else
      t[n] == null ? e.removeAttribute(n) : e.setAttribute(n, t[n]);
  });
}
function Ry(e, t) {
  Object.keys(t).forEach((n) => {
    if (Xa(n)) {
      const o = ff(n), i = hl.get(e);
      i == null || i.forEach((l) => {
        const [s, a] = l;
        s === o && (e.removeEventListener(o, a), i.delete(l));
      });
    } else
      e.removeAttribute(n);
  });
}
const Lo = 2.4, Pu = 0.2126729, Du = 0.7151522, $u = 0.072175, Hy = 0.55, jy = 0.58, zy = 0.57, Uy = 0.62, ol = 0.03, Mu = 1.45, Wy = 5e-4, qy = 1.25, Gy = 1.25, Fu = 0.078, Bu = 12.82051282051282, il = 0.06, Lu = 1e-3;
function Ru(e, t) {
  const n = (e.r / 255) ** Lo, o = (e.g / 255) ** Lo, i = (e.b / 255) ** Lo, l = (t.r / 255) ** Lo, s = (t.g / 255) ** Lo, a = (t.b / 255) ** Lo;
  let r = n * Pu + o * Du + i * $u, f = l * Pu + s * Du + a * $u;
  if (r <= ol && (r += (ol - r) ** Mu), f <= ol && (f += (ol - f) ** Mu), Math.abs(f - r) < Wy) return 0;
  let u;
  if (f > r) {
    const d = (f ** Hy - r ** jy) * qy;
    u = d < Lu ? 0 : d < Fu ? d - d * Bu * il : d - il;
  } else {
    const d = (f ** Uy - r ** zy) * Gy;
    u = d > -Lu ? 0 : d > -Fu ? d - d * Bu * il : d + il;
  }
  return u * 100;
}
function bn(e) {
  Vt(`Vuetify: ${e}`);
}
function Ml(e) {
  Vt(`Vuetify error: ${e}`);
}
function Ky(e, t) {
  t = Array.isArray(t) ? t.slice(0, -1).map((n) => `'${n}'`).join(", ") + ` or '${t.at(-1)}'` : `'${t}'`, Vt(`[Vuetify UPGRADE] '${e}' is deprecated, use ${t} instead.`);
}
const Fl = 0.20689655172413793, Yy = (e) => e > Fl ** 3 ? Math.cbrt(e) : e / (3 * Fl ** 2) + 4 / 29, Xy = (e) => e > Fl ? e ** 3 : 3 * Fl ** 2 * (e - 4 / 29);
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
  const i = [0, 0, 0], l = ep, s = Qy;
  t = l(t / 255), n = l(n / 255), o = l(o / 255);
  for (let a = 0; a < 3; ++a)
    i[a] = s[a][0] * t + s[a][1] * n + s[a][2] * o;
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
function mn(e) {
  if (typeof e == "number")
    return (isNaN(e) || e < 0 || e > 16777215) && bn(`'${e}' is not a valid hex color`), {
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
    } = t, i = o.split(/,\s*/).map((l) => l.endsWith("%") && ["hsl", "hsla", "hsv", "hsva"].includes(n) ? parseFloat(l) / 100 : parseFloat(l));
    return np[n](...i);
  } else if (typeof e == "string") {
    let t = e.startsWith("#") ? e.slice(1) : e;
    [3, 4].includes(t.length) ? t = t.split("").map((o) => o + o).join("") : [6, 8].includes(t.length) || bn(`'${e}' is not a valid hex(a) color`);
    const n = parseInt(t, 16);
    return (isNaN(n) || n < 0 || n > 4294967295) && bn(`'${e}' is not a valid hex(a) color`), ip(t);
  } else if (typeof e == "object") {
    if (Os(e, ["r", "g", "b"]))
      return e;
    if (Os(e, ["h", "s", "l"]))
      return xi(wf(e));
    if (Os(e, ["h", "s", "v"]))
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
  } = e, l = (a) => {
    const r = (a + t / 60) % 6;
    return o - o * n * Math.max(Math.min(r, 4 - r, 1), 0);
  }, s = [l(5), l(3), l(1)].map((a) => Math.round(a * 255));
  return {
    r: s[0],
    g: s[1],
    b: s[2],
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
  } = e, l = o + n * Math.min(o, 1 - o), s = l === 0 ? 0 : 2 - 2 * o / l;
  return {
    h: t,
    s,
    v: l,
    a: i
  };
}
function ll(e) {
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
  return `#${[ll(t), ll(n), ll(o), i !== void 0 ? ll(Math.round(i * 255)) : ""].join("")}`;
}
function ip(e) {
  e = lp(e);
  let [t, n, o, i] = $y(e, 2).map((l) => parseInt(l, 16));
  return i = i === void 0 ? i : i / 255, {
    r: t,
    g: n,
    b: o,
    a: i
  };
}
function lp(e) {
  return e.startsWith("#") && (e = e.slice(1)), e = e.replace(/([^0-9a-f])/gi, "F"), (e.length === 3 || e.length === 4) && (e = e.split("").map((t) => t + t).join("")), e.length !== 6 && (e = xu(xu(e, 6), 8, "F")), e;
}
function sp(e, t) {
  const n = pf(er(e));
  return n[0] = n[0] + t * 10, _f(bf(n));
}
function ap(e, t) {
  const n = pf(er(e));
  return n[0] = n[0] - t * 10, _f(bf(n));
}
function rp(e) {
  const t = mn(e);
  return er(t)[1];
}
function kf(e) {
  const t = Math.abs(Ru(mn(0), mn(e)));
  return Math.abs(Ru(mn(16777215), mn(e))) > Math.min(t, 50) ? "#fff" : "#000";
}
function W(e, t) {
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
const Te = W({
  class: [String, Array, Object],
  style: {
    type: [String, Array, Object],
    default: null
  }
}, "component");
function it(e, t) {
  const n = ts();
  if (!n)
    throw new Error(`[Vuetify] ${e} must be called from inside a setup function`);
  return n;
}
function xn() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "composables";
  const t = it(e).type;
  return Oo((t == null ? void 0 : t.aliasName) || (t == null ? void 0 : t.name));
}
let Sf = 0, gl = /* @__PURE__ */ new WeakMap();
function on() {
  const e = it("getUid");
  if (gl.has(e)) return gl.get(e);
  {
    const t = Sf++;
    return gl.set(e, t), t;
  }
}
on.reset = () => {
  Sf = 0, gl = /* @__PURE__ */ new WeakMap();
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
  return le(e);
}
function tr() {
  const e = He(Jo);
  if (!e) throw new Error("[Vuetify] Could not find defaults instance");
  return e;
}
function so(e, t) {
  const n = tr(), o = le(e), i = b(() => {
    if (fn(t == null ? void 0 : t.disabled)) return n.value;
    const s = fn(t == null ? void 0 : t.scoped), a = fn(t == null ? void 0 : t.reset), r = fn(t == null ? void 0 : t.root);
    if (o.value == null && !(s || a || r)) return n.value;
    let f = _t(o.value, {
      prev: n.value
    });
    if (s) return f;
    if (a || r) {
      const u = Number(a || 1 / 0);
      for (let d = 0; d <= u && !(!f || !("prev" in f)); d++)
        f = f.prev;
      return f && typeof r == "string" && r in f && (f = _t(_t(f, {
        prev: f
      }), f[r])), f;
    }
    return f.prev ? _t(f.prev, f) : f;
  });
  return yt(Jo, i), i;
}
function dp(e, t) {
  var n, o;
  return typeof ((n = e.props) == null ? void 0 : n[t]) < "u" || typeof ((o = e.props) == null ? void 0 : o[Oo(t)]) < "u";
}
function fp() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 ? arguments[1] : void 0, n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : tr();
  const o = it("useDefaults");
  if (t = t ?? o.type.name ?? o.type.__name, !t)
    throw new Error("[Vuetify] Could not determine component name");
  const i = b(() => {
    var r;
    return (r = n.value) == null ? void 0 : r[e._as ?? t];
  }), l = new Proxy(e, {
    get(r, f) {
      var d, m, h, v, g, _, S;
      const u = Reflect.get(r, f);
      return f === "class" || f === "style" ? [(d = i.value) == null ? void 0 : d[f], u].filter((N) => N != null) : typeof f == "string" && !dp(o.vnode, f) ? ((m = i.value) == null ? void 0 : m[f]) !== void 0 ? (h = i.value) == null ? void 0 : h[f] : ((g = (v = n.value) == null ? void 0 : v.global) == null ? void 0 : g[f]) !== void 0 ? (S = (_ = n.value) == null ? void 0 : _.global) == null ? void 0 : S[f] : u : u;
    }
  }), s = we();
  nn(() => {
    if (i.value) {
      const r = Object.entries(i.value).filter((f) => {
        let [u] = f;
        return u.startsWith(u[0].toUpperCase());
      });
      s.value = r.length ? Object.fromEntries(r) : void 0;
    } else
      s.value = void 0;
  });
  function a() {
    const r = up(Jo, o);
    yt(Jo, b(() => s.value ? _t((r == null ? void 0 : r.value) ?? {}, s.value) : r == null ? void 0 : r.value));
  }
  return {
    props: l,
    provideSubDefaults: a
  };
}
function ei(e) {
  if (e._setup = e._setup ?? e.setup, !e.name)
    return bn("The component is missing an explicit name, unable to generate default prop value"), e;
  if (e._setup) {
    e.props = W(e.props ?? {}, e.name)();
    const t = Object.keys(e.props).filter((n) => n !== "class" && n !== "style");
    e.filterProps = function(o) {
      return uf(o, t);
    }, e.props._as = String, e.setup = function(o, i) {
      const l = tr();
      if (!l.value) return e._setup(o, i);
      const {
        props: s,
        provideSubDefaults: a
      } = fp(o, o._as ?? e.name, l), r = e._setup(s, i);
      return a(), r;
    };
  }
  return e;
}
function de() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !0;
  return (t) => (e ? ei : Ph)(t);
}
function ls(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "div", n = arguments.length > 2 ? arguments[2] : void 0;
  return de()({
    name: n ?? Wt(gt(e.replace(/__/g, "-"))),
    props: {
      tag: {
        type: String,
        default: t
      },
      ...Te()
    },
    setup(o, i) {
      let {
        slots: l
      } = i;
      return () => {
        var s;
        return lo(o.tag, {
          class: [e, o.class],
          style: o.style
        }, (s = l.default) == null ? void 0 : s.call(l));
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
function Bl(e, t) {
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
function Ke(e, t, n) {
  let o = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : (d) => d, i = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : (d) => d;
  const l = it("useProxiedModel"), s = le(e[t] !== void 0 ? e[t] : n), a = Oo(t), f = b(a !== t ? () => {
    var d, m, h, v;
    return e[t], !!(((d = l.vnode.props) != null && d.hasOwnProperty(t) || (m = l.vnode.props) != null && m.hasOwnProperty(a)) && ((h = l.vnode.props) != null && h.hasOwnProperty(`onUpdate:${t}`) || (v = l.vnode.props) != null && v.hasOwnProperty(`onUpdate:${a}`)));
  } : () => {
    var d, m;
    return e[t], !!((d = l.vnode.props) != null && d.hasOwnProperty(t) && ((m = l.vnode.props) != null && m.hasOwnProperty(`onUpdate:${t}`)));
  });
  oo(() => !f.value, () => {
    ke(() => e[t], (d) => {
      s.value = d;
    });
  });
  const u = b({
    get() {
      const d = e[t];
      return o(f.value ? d : s.value);
    },
    set(d) {
      const m = i(d), h = fe(f.value ? e[t] : s.value);
      h === m || o(h) === d || (s.value = m, l == null || l.emit(`update:${t}`, m));
    }
  });
  return Object.defineProperty(u, "externalValue", {
    get: () => f.value ? e[t] : s.value
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
  for (var i = arguments.length, l = new Array(i > 1 ? i - 1 : 0), s = 1; s < i; s++)
    l[s - 1] = arguments[s];
  if (!o.startsWith(zu))
    return Uu(o, l);
  const a = o.replace(zu, ""), r = e.value && n.value[e.value], f = t.value && n.value[t.value];
  let u = sa(r, a, null);
  return u || (bn(`Translation key "${o}" not found in "${e.value}", trying fallback locale`), u = sa(f, a, null)), u || (Ml(`Translation key "${o}" not found in fallback`), u = o), typeof u != "string" && (Ml(`Translation key "${o}" has a non-string value`), u = o), Uu(u, l);
};
function xf(e, t) {
  return (n, o) => new Intl.NumberFormat([e.value, t.value], o).format(n);
}
function Ps(e, t, n) {
  const o = Ke(e, t, e[t] ?? n.value);
  return o.value = e[t] ?? n.value, ke(n, (i) => {
    e[t] == null && (o.value = n.value);
  }), o;
}
function Vf(e) {
  return (t) => {
    const n = Ps(t, "locale", e.current), o = Ps(t, "fallback", e.fallback), i = Ps(t, "messages", e.messages);
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
  const t = we((e == null ? void 0 : e.locale) ?? "en"), n = we((e == null ? void 0 : e.fallback) ?? "en"), o = le({
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
const Ll = Symbol.for("vuetify:locale");
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
function ss() {
  const e = He(Ll);
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
  const n = le((t == null ? void 0 : t.rtl) ?? kp()), o = b(() => n.value[e.current.value] ?? !1);
  return {
    isRtl: o,
    rtl: n,
    rtlClasses: b(() => `v-locale--is-${o.value ? "rtl" : "ltr"}`)
  };
}
function Lt() {
  const e = He(Ll);
  if (!e) throw new Error("[Vuetify] Could not find injected rtl instance");
  return {
    isRtl: e.isRtl,
    rtlClasses: e.rtlClasses
  };
}
const as = {
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
  const l = Nf(e), s = Tf(e), a = n ?? as[t.slice(-2).toUpperCase()] ?? 0, r = (l.getDay() - a + 7) % 7, f = (s.getDay() - a + 7) % 7;
  for (let u = 0; u < r; u++) {
    const d = new Date(l);
    d.setDate(d.getDate() - (r - u)), i.push(d);
  }
  for (let u = 1; u <= s.getDate(); u++) {
    const d = new Date(e.getFullYear(), e.getMonth(), u);
    i.push(d), i.length === 7 && (o.push(i), i = []);
  }
  for (let u = 1; u < 7 - f; u++) {
    const d = new Date(s);
    d.setDate(d.getDate() + u), i.push(d);
  }
  return i.length > 0 && o.push(i), o;
}
function Ep(e, t, n) {
  const o = n ?? as[t.slice(-2).toUpperCase()] ?? 0, i = new Date(e);
  for (; i.getDay() !== o; )
    i.setDate(i.getDate() - 1);
  return i;
}
function xp(e, t) {
  const n = new Date(e), o = ((as[t.slice(-2).toUpperCase()] ?? 0) + 6) % 7;
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
  const n = t ?? as[e.slice(-2).toUpperCase()] ?? 0;
  return Ka(7).map((o) => {
    const i = new Date(Wu);
    return i.setDate(Wu.getDate() + n + o), new Intl.DateTimeFormat(e, {
      weekday: "narrow"
    }).format(i);
  });
}
function Op(e, t, n, o) {
  const i = Of(e) ?? /* @__PURE__ */ new Date(), l = o == null ? void 0 : o[t];
  if (typeof l == "function")
    return l(i, t, n);
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
      const a = i.getDate(), r = new Intl.DateTimeFormat(n, {
        month: "long"
      }).format(i);
      return `${a} ${r}`;
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
      s = l ?? {
        timeZone: "UTC",
        timeZoneName: "short"
      };
  }
  return new Intl.DateTimeFormat(n, s).format(i);
}
function Ip(e, t) {
  const n = e.toJsDate(t), o = n.getFullYear(), i = Vu(String(n.getMonth() + 1), 2, "0"), l = Vu(String(n.getDate()), 2, "0");
  return `${o}-${i}-${l}`;
}
function Ap(e) {
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
  return Rl(e, t[0]) && Xp(e, t[1]);
}
function Kp(e) {
  const t = new Date(e);
  return t instanceof Date && !isNaN(t.getTime());
}
function Rl(e, t) {
  return e.getTime() > t.getTime();
}
function Yp(e, t) {
  return Rl(da(e), da(t));
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
function lb(e, t) {
  const n = new Date(e);
  return n.setFullYear(t), n;
}
function da(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate(), 0, 0, 0, 0);
}
function sb(e) {
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
    return Ip(this, t);
  }
  parseISO(t) {
    return Ap(t);
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
    return Rl(t, n);
  }
  isAfterDay(t, n) {
    return Yp(t, n);
  }
  isBefore(t, n) {
    return !Rl(t, n) && !qu(t, n);
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
    return lb(t, n);
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
    return sb(t);
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
  const n = _t({
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
const rs = ["sm", "md", "lg", "xl", "xxl"], fa = Symbol.for("vuetify:display"), Ku = {
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
  return _t(Ku, e);
};
function Yu(e) {
  return Ge && !e ? window.innerWidth : typeof e == "object" && e.clientWidth || 0;
}
function Xu(e) {
  return Ge && !e ? window.innerHeight : typeof e == "object" && e.clientHeight || 0;
}
function Ju(e) {
  const t = Ge && !e ? window.navigator.userAgent : "ssr";
  function n(v) {
    return !!t.match(v);
  }
  const o = n(/android/i), i = n(/iphone|ipad|ipod/i), l = n(/cordova/i), s = n(/electron/i), a = n(/chrome/i), r = n(/edge/i), f = n(/firefox/i), u = n(/opera/i), d = n(/win/i), m = n(/mac/i), h = n(/linux/i);
  return {
    android: o,
    ios: i,
    cordova: l,
    electron: s,
    chrome: a,
    edge: r,
    firefox: f,
    opera: u,
    win: d,
    mac: m,
    linux: h,
    touch: Iy,
    ssr: t === "ssr"
  };
}
function fb(e, t) {
  const {
    thresholds: n,
    mobileBreakpoint: o
  } = db(e), i = we(Xu(t)), l = we(Ju(t)), s = ht({}), a = we(Yu(t));
  function r() {
    i.value = Xu(), a.value = Yu();
  }
  function f() {
    r(), l.value = Ju();
  }
  return nn(() => {
    const u = a.value < n.sm, d = a.value < n.md && !u, m = a.value < n.lg && !(d || u), h = a.value < n.xl && !(m || d || u), v = a.value < n.xxl && !(h || m || d || u), g = a.value >= n.xxl, _ = u ? "xs" : d ? "sm" : m ? "md" : h ? "lg" : v ? "xl" : "xxl", S = typeof o == "number" ? o : n[o], N = a.value < S;
    s.xs = u, s.sm = d, s.md = m, s.lg = h, s.xl = v, s.xxl = g, s.smAndUp = !u, s.mdAndUp = !(u || d), s.lgAndUp = !(u || d || m), s.xlAndUp = !(u || d || m || h), s.smAndDown = !(m || h || v || g), s.mdAndDown = !(h || v || g), s.lgAndDown = !(v || g), s.xlAndDown = !g, s.name = _, s.height = i.value, s.width = a.value, s.mobile = N, s.mobileBreakpoint = o, s.platform = l.value, s.thresholds = n;
  }), Ge && window.addEventListener("resize", r, {
    passive: !0
  }), {
    ...Aa(s),
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
function If() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {}, t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  const n = He(fa);
  if (!n) throw new Error("Could not find Vuetify display injection");
  const o = b(() => {
    if (e.mobile != null) return e.mobile;
    if (!e.mobileBreakpoint) return n.mobile.value;
    const l = typeof e.mobileBreakpoint == "number" ? e.mobileBreakpoint : n.thresholds.value[e.mobileBreakpoint];
    return n.width.value < l;
  }), i = b(() => t ? {
    [`${t}--mobile`]: o.value
  } : {});
  return {
    ...n,
    displayClasses: i,
    mobile: o
  };
}
const Af = Symbol.for("vuetify:goto");
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
function Ds(e, t, n) {
  if (typeof e == "number") return t && n ? -e : e;
  let o = or(e), i = 0;
  for (; o; )
    i += t ? o.offsetLeft : o.offsetTop, o = o.offsetParent;
  return i;
}
function hb(e, t) {
  return {
    rtl: t.isRtl,
    options: _t(Pf(), e)
  };
}
async function Zu(e, t, n, o) {
  const i = n ? "scrollLeft" : "scrollTop", l = _t((o == null ? void 0 : o.options) ?? Pf(), t), s = o == null ? void 0 : o.rtl.value, a = (typeof e == "number" ? e : or(e)) ?? 0, r = l.container === "parent" && a instanceof HTMLElement ? a.parentElement : vb(l.container), f = typeof l.easing == "function" ? l.easing : l.patterns[l.easing];
  if (!f) throw new TypeError(`Easing function "${l.easing}" not found.`);
  let u;
  if (typeof a == "number")
    u = Ds(a, n, s);
  else if (u = Ds(a, n, s) - Ds(r, n, s), l.layout) {
    const v = window.getComputedStyle(a).getPropertyValue("--v-layout-top");
    v && (u -= parseInt(v, 10));
  }
  u += l.offset, u = yb(r, u, !!s, !!n);
  const d = r[i] ?? 0;
  if (u === d) return Promise.resolve(u);
  const m = performance.now();
  return new Promise((h) => requestAnimationFrame(function v(g) {
    const S = (g - m) / l.duration, N = Math.floor(d + (u - d) * f(Sn(S, 0, 1)));
    if (r[i] = N, S >= 1 && Math.abs(N - r[i]) < 10)
      return h(u);
    if (S > 2)
      return bn("Scroll target is not reachable"), h(r[i]);
    requestAnimationFrame(v);
  }));
}
function gb() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
  const t = He(Af), {
    isRtl: n
  } = Lt();
  if (!t) throw new Error("[Vuetify] Could not find injected goto instance");
  const o = {
    ...t,
    // can be set via VLocaleProvider
    rtl: b(() => t.rtl.value || n.value)
  };
  async function i(l, s) {
    return Zu(l, _t(e, s), !1, o);
  }
  return i.horizontal = async (l, s) => Zu(l, _t(e, s), !0, o), i;
}
function yb(e, t, n, o) {
  const {
    scrollWidth: i,
    scrollHeight: l
  } = e, [s, a] = e === document.scrollingElement ? [window.innerWidth, window.innerHeight] : [e.offsetWidth, e.offsetHeight];
  let r, f;
  return o ? n ? (r = -(i - s), f = 0) : (r = 0, f = i - s) : (r = 0, f = l + -a), Math.max(Math.min(t, f), r);
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
  component: (e) => lo($f, {
    ...e,
    class: "mdi"
  })
}, Ue = [String, Function, Object, Array], ma = Symbol.for("vuetify:icons"), us = W({
  icon: {
    type: Ue
  },
  // Could not remove this and use makeTagProps, types complained because it is not required
  tag: {
    type: String,
    required: !0
  }
}, "icon"), Qu = de()({
  name: "VComponentIcon",
  props: us(),
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
  props: us(),
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
  props: us(),
  setup(e) {
    return () => c(e.tag, null, {
      default: () => [e.icon]
    });
  }
});
const $f = ei({
  name: "VClassIcon",
  props: us(),
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
  return n === "mdi" && !t.mdi && (t.mdi = bb), _t({
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
  const t = He(ma);
  if (!t) throw new Error("Missing Vuetify Icons provide!");
  return {
    iconData: b(() => {
      var r;
      const o = fn(e);
      if (!o) return {
        component: Qu
      };
      let i = o;
      if (typeof i == "string" && (i = i.trim(), i.startsWith("$") && (i = (r = t.aliases) == null ? void 0 : r[i.slice(1)])), i || bn(`Could not find aliased icon "${o}"`), Array.isArray(i))
        return {
          component: Df,
          icon: i
        };
      if (typeof i != "string")
        return {
          component: Qu,
          icon: i
        };
      const l = Object.keys(t.sets).find((f) => typeof i == "string" && i.startsWith(`${f}:`)), s = l ? i.slice(l.length + 1) : i;
      return {
        component: t.sets[l ?? t.defaultSet].component,
        icon: s
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
  for (const [l, s] of Object.entries(e.themes ?? {})) {
    const a = s.dark || l === "dark" ? (o = t.themes) == null ? void 0 : o.dark : (i = t.themes) == null ? void 0 : i.light;
    n[l] = _t(a, s);
  }
  return _t(t, {
    ...e,
    themes: n
  });
}
function Cb(e) {
  const t = Sb(e), n = le(t.defaultTheme), o = le(t.themes), i = b(() => {
    const u = {};
    for (const [d, m] of Object.entries(o.value)) {
      const h = u[d] = {
        ...m,
        colors: {
          ...m.colors
        }
      };
      if (t.variations)
        for (const v of t.variations.colors) {
          const g = h.colors[v];
          if (g)
            for (const _ of ["lighten", "darken"]) {
              const S = _ === "lighten" ? sp : ap;
              for (const N of Ka(t.variations[_], 1))
                h.colors[`${v}-${_}-${N}`] = op(S(mn(g), N));
            }
        }
      for (const v of Object.keys(h.colors)) {
        if (/^on-[a-z]/.test(v) || h.colors[`on-${v}`]) continue;
        const g = `on-${v}`, _ = mn(h.colors[v]);
        h.colors[g] = kf(_);
      }
    }
    return u;
  }), l = b(() => i.value[n.value]), s = b(() => {
    var v;
    const u = [];
    (v = l.value) != null && v.dark && go(u, ":root", ["color-scheme: dark"]), go(u, ":root", tc(l.value));
    for (const [g, _] of Object.entries(i.value))
      go(u, `.v-theme--${g}`, [`color-scheme: ${_.dark ? "dark" : "normal"}`, ...tc(_)]);
    const d = [], m = [], h = new Set(Object.values(i.value).flatMap((g) => Object.keys(g.colors)));
    for (const g of h)
      /^on-[a-z]/.test(g) ? go(m, `.${g}`, [`color: rgb(var(--v-theme-${g})) !important`]) : (go(d, `.bg-${g}`, [`--v-theme-overlay-multiplier: var(--v-theme-${g}-overlay-multiplier)`, `background-color: rgb(var(--v-theme-${g})) !important`, `color: rgb(var(--v-theme-on-${g})) !important`]), go(m, `.text-${g}`, [`color: rgb(var(--v-theme-${g})) !important`]), go(m, `.border-${g}`, [`--v-border-color: var(--v-theme-${g})`]));
    return u.push(...d, ...m), u.map((g, _) => _ === 0 ? g : `    ${g}`).join("");
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
  function r(u) {
    if (t.isDisabled) return;
    const d = u._context.provides.usehead;
    if (d)
      if (d.push) {
        const m = d.push(a);
        Ge && ke(s, () => {
          m.patch(a);
        });
      } else
        Ge ? (d.addHeadObjs(b(a)), nn(() => d.updateDOM())) : d.addHeadObjs(a());
    else {
      let h = function() {
        if (typeof document < "u" && !m) {
          const v = document.createElement("style");
          v.type = "text/css", v.id = "vuetify-theme-stylesheet", t.cspNonce && v.setAttribute("nonce", t.cspNonce), m = v, document.head.appendChild(m);
        }
        m && (m.innerHTML = s.value);
      }, m = Ge ? document.getElementById("vuetify-theme-stylesheet") : null;
      Ge ? ke(s, h, {
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
    current: l,
    computedThemes: i,
    themeClasses: f,
    styles: s,
    global: {
      name: n,
      current: l
    }
  };
}
function vt(e) {
  it("provideTheme");
  const t = He(Ni, null);
  if (!t) throw new Error("Could not find Vuetify theme injection");
  const n = b(() => e.theme ?? t.name.value), o = b(() => t.themes.value[n.value]), i = b(() => t.isDisabled ? void 0 : `v-theme--${n.value}`), l = {
    ...t,
    name: n,
    current: o,
    themeClasses: i
  };
  return yt(Ni, l), l;
}
function Mf() {
  it("useTheme");
  const e = He(Ni, null);
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
  for (const [i, l] of Object.entries(e.colors)) {
    const s = mn(l);
    o.push(`--v-theme-${i}: ${s.r},${s.g},${s.b}`), i.startsWith("on-") || o.push(`--v-theme-${i}-overlay-multiplier: ${rp(l) > 0.18 ? t : n}`);
  }
  for (const [i, l] of Object.entries(e.variables)) {
    const s = typeof l == "string" && l.startsWith("#") ? mn(l) : void 0, a = s ? `${s.r}, ${s.g}, ${s.b}` : void 0;
    o.push(`--v-${i}: ${a ?? l}`);
  }
  return o;
}
function Hl(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "content";
  const n = ra(), o = le();
  if (Ge) {
    const i = new ResizeObserver((l) => {
      l.length && (t === "content" ? o.value = l[0].contentRect : o.value = l[0].target.getBoundingClientRect());
    });
    wt(() => {
      i.disconnect();
    }), ke(() => n.el, (l, s) => {
      s && (i.unobserve(s), o.value = void 0), l && i.observe(l);
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
  const e = He(Ti);
  if (!e) throw new Error("[Vuetify] Could not find injected layout");
  return {
    getLayoutItem: e.getLayoutItem,
    mainRect: e.mainRect,
    mainStyles: e.mainStyles
  };
}
function Rf(e) {
  const t = He(Ti);
  if (!t) throw new Error("[Vuetify] Could not find injected layout");
  const n = e.id ?? `layout-item-${on()}`, o = it("useLayoutItem");
  yt(Ff, {
    id: n
  });
  const i = we(!1);
  kd(() => i.value = !0), wd(() => i.value = !1);
  const {
    layoutItemStyles: l,
    layoutItemScrimStyles: s
  } = t.register(o, {
    ...e,
    active: b(() => i.value ? !1 : e.active.value),
    id: n
  });
  return wt(() => t.unregister(n)), {
    layoutItemStyles: l,
    layoutRect: t.layoutRect,
    layoutItemScrimStyles: s
  };
}
const xb = (e, t, n, o) => {
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
  for (const s of e) {
    const a = t.get(s), r = n.get(s), f = o.get(s);
    if (!a || !r || !f) continue;
    const u = {
      ...i,
      [a.value]: parseInt(i[a.value], 10) + (f.value ? parseInt(r.value, 10) : 0)
    };
    l.push({
      id: s,
      layer: u
    }), i = u;
  }
  return l;
};
function Vb(e) {
  const t = He(Ti, null), n = b(() => t ? t.rootZIndex.value - 100 : nc), o = le([]), i = ht(/* @__PURE__ */ new Map()), l = ht(/* @__PURE__ */ new Map()), s = ht(/* @__PURE__ */ new Map()), a = ht(/* @__PURE__ */ new Map()), r = ht(/* @__PURE__ */ new Map()), {
    resizeRef: f,
    contentRect: u
  } = Hl(), d = b(() => {
    const C = /* @__PURE__ */ new Map(), $ = e.overlaps ?? [];
    for (const V of $.filter((T) => T.includes(":"))) {
      const [T, D] = V.split(":");
      if (!o.value.includes(T) || !o.value.includes(D)) continue;
      const O = i.get(T), k = i.get(D), I = l.get(T), B = l.get(D);
      !O || !k || !I || !B || (C.set(D, {
        position: O.value,
        amount: parseInt(I.value, 10)
      }), C.set(T, {
        position: k.value,
        amount: -parseInt(B.value, 10)
      }));
    }
    return C;
  }), m = b(() => {
    const C = [...new Set([...s.values()].map((V) => V.value))].sort((V, T) => V - T), $ = [];
    for (const V of C) {
      const T = o.value.filter((D) => {
        var O;
        return ((O = s.get(D)) == null ? void 0 : O.value) === V;
      });
      $.push(...T);
    }
    return xb($, i, l, a);
  }), h = b(() => !Array.from(r.values()).some((C) => C.value)), v = b(() => m.value[m.value.length - 1].layer), g = b(() => ({
    "--v-layout-left": be(v.value.left),
    "--v-layout-right": be(v.value.right),
    "--v-layout-top": be(v.value.top),
    "--v-layout-bottom": be(v.value.bottom),
    ...h.value ? void 0 : {
      transition: "none"
    }
  })), _ = b(() => m.value.slice(1).map((C, $) => {
    let {
      id: V
    } = C;
    const {
      layer: T
    } = m.value[$], D = l.get(V), O = i.get(V);
    return {
      id: V,
      ...T,
      size: Number(D.value),
      position: O.value
    };
  })), S = (C) => _.value.find(($) => $.id === C), N = it("createLayout"), A = we(!1);
  Cn(() => {
    A.value = !0;
  }), yt(Ti, {
    register: (C, $) => {
      let {
        id: V,
        order: T,
        position: D,
        layoutSize: O,
        elementSize: k,
        active: I,
        disableTransitions: B,
        absolute: Z
      } = $;
      s.set(V, T), i.set(V, D), l.set(V, O), a.set(V, I), B && r.set(V, B);
      const ne = zo(Ff, N == null ? void 0 : N.vnode).indexOf(C);
      ne > -1 ? o.value.splice(ne, 0, V) : o.value.push(V);
      const X = b(() => _.value.findIndex((te) => te.id === V)), Ce = b(() => n.value + m.value.length * 2 - X.value * 2), G = b(() => {
        const te = D.value === "left" || D.value === "right", Oe = D.value === "right", We = D.value === "bottom", qe = k.value ?? O.value, oe = qe === 0 ? "%" : "px", Ee = {
          [D.value]: 0,
          zIndex: Ce.value,
          transform: `translate${te ? "X" : "Y"}(${(I.value ? 0 : -(qe === 0 ? 100 : qe)) * (Oe || We ? -1 : 1)}${oe})`,
          position: Z.value || n.value !== nc ? "absolute" : "fixed",
          ...h.value ? void 0 : {
            transition: "none"
          }
        };
        if (!A.value) return Ee;
        const Re = _.value[X.value];
        if (!Re) throw new Error(`[Vuetify] Could not find layout item "${V}"`);
        const nt = d.value.get(V);
        return nt && (Re[nt.position] += nt.amount), {
          ...Ee,
          height: te ? `calc(100% - ${Re.top}px - ${Re.bottom}px)` : k.value ? `${k.value}px` : void 0,
          left: Oe ? void 0 : `${Re.left}px`,
          right: Oe ? `${Re.right}px` : void 0,
          top: D.value !== "bottom" ? `${Re.top}px` : void 0,
          bottom: D.value !== "top" ? `${Re.bottom}px` : void 0,
          width: te ? k.value ? `${k.value}px` : void 0 : `calc(100% - ${Re.left}px - ${Re.right}px)`
        };
      }), Y = b(() => ({
        zIndex: Ce.value - 1
      }));
      return {
        layoutItemStyles: G,
        layoutItemScrimStyles: Y,
        zIndex: Ce
      };
    },
    unregister: (C) => {
      s.delete(C), i.delete(C), l.delete(C), a.delete(C), r.delete(C), o.value = o.value.filter(($) => $ !== C);
    },
    mainRect: v,
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
  } = e, o = _t(t, n), {
    aliases: i = {},
    components: l = {},
    directives: s = {}
  } = o, a = cp(o.defaults), r = fb(o.display, o.ssr), f = Cb(o.theme), u = wb(o.icons), d = wp(o.locale), m = ub(o.date, d), h = hb(o.goTo, d);
  return {
    install: (g) => {
      for (const _ in s)
        g.directive(_, s[_]);
      for (const _ in l)
        g.component(_, l[_]);
      for (const _ in i)
        g.component(_, ei({
          ...i[_],
          name: _,
          aliasName: i[_].name
        }));
      if (f.install(g), g.provide(Jo, a), g.provide(fa, r), g.provide(Ni, f), g.provide(ma, u), g.provide(Ll, d), g.provide(rb, m.options), g.provide(Gu, m.instance), g.provide(Af, h), Ge && o.ssr)
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
      on.reset(), g.mixin({
        computed: {
          $vuetify() {
            return ht({
              defaults: Ro.call(this, Jo),
              display: Ro.call(this, fa),
              theme: Ro.call(this, Ni),
              icons: Ro.call(this, ma),
              locale: Ro.call(this, Ll),
              date: Ro.call(this, Gu)
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
    date: m,
    goTo: h
  };
}
const Nb = "3.7.4";
Hf.version = Nb;
function Ro(e) {
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
}), Ib = {
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
      }, s = n + o;
      i !== void 0 && Object.assign(l, i);
      const a = new AbortController(), r = setTimeout(() => a.abort(), l.timeout || 1e4);
      return fetch(s, {
        ...l,
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
function Ab(e, t) {
  e.use(Ob).use(Ib, t);
}
const Vn = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [o, i] of t)
    n[o] = i;
  return n;
}, Pb = ls("v-alert-title"), ao = W({
  border: [Boolean, Number, String]
}, "border");
function ro(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  return {
    borderClasses: b(() => {
      const o = je(e) ? e.value : e.border, i = [];
      if (o === !0 || o === "")
        i.push(`${t}--border`);
      else if (typeof o == "string" || o === 0)
        for (const l of String(o).split(" "))
          i.push(`border-${l}`);
      return i;
    })
  };
}
const Db = [null, "default", "comfortable", "compact"], Gt = W({
  density: {
    type: String,
    default: "default",
    validator: (e) => Db.includes(e)
  }
}, "density");
function ln(e) {
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
      const n = je(e) ? e.value : e.elevation, o = [];
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
      const o = je(e) ? e.value : e.rounded, i = je(e) ? e.value : e.tile, l = [];
      if (o === !0 || o === "")
        l.push(`${t}--rounded`);
      else if (typeof o == "string" || o === 0)
        for (const s of String(o).split(" "))
          l.push(`rounded-${s}`);
      else (i || o === !1) && l.push("rounded-0");
      return l;
    })
  };
}
const Je = W({
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
          const o = mn(e.value.background);
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
function Ft(e, t) {
  const n = b(() => ({
    text: je(e) ? e.value : t ? e[t] : null
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
    background: je(e) ? e.value : t ? e[t] : null
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
      variant: l
    } = fn(e);
    return `${t}--variant-${l}`;
  }), {
    colorClasses: o,
    colorStyles: i
  } = ir(b(() => {
    const {
      variant: l,
      color: s
    } = fn(e);
    return {
      [["elevated", "flat"].includes(l) ? "background" : "text"]: s
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
  ...Gt(),
  ...Hn(),
  ...Nt(),
  ...Je(),
  ...tt(),
  ...uo()
}, "VBtnGroup"), ko = de()({
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
    } = ln(e), {
      borderClasses: l
    } = ro(e), {
      elevationClasses: s
    } = jn(e), {
      roundedClasses: a
    } = Tt(e);
    so({
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
      }, o.value, l.value, i.value, s.value, a.value, e.class],
      style: e.style
    }, n));
  }
}), lr = W({
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
  const i = on();
  yt(Symbol.for(`${t.description}:id`), i);
  const l = He(t, null);
  if (!l) {
    if (!n) return l;
    throw new Error(`[Vuetify] Could not find useGroup injection with symbol ${t.description}`);
  }
  const s = ae(e, "value"), a = b(() => !!(l.disabled.value || e.disabled));
  l.register({
    id: i,
    value: s,
    disabled: a
  }, o), wt(() => {
    l.unregister(i);
  });
  const r = b(() => l.isSelected(i)), f = b(() => l.items.value[0].id === i), u = b(() => l.items.value[l.items.value.length - 1].id === i), d = b(() => r.value && [l.selectedClass.value, e.selectedClass]);
  return ke(r, (m) => {
    o.emit("group:selected", {
      value: m
    });
  }, {
    flush: "sync"
  }), {
    id: i,
    isSelected: r,
    isFirst: f,
    isLast: u,
    toggle: () => l.select(i, !r.value),
    select: (m) => l.select(i, m),
    selectedClass: d,
    value: s,
    disabled: a,
    group: l
  };
}
function cs(e, t) {
  let n = !1;
  const o = ht([]), i = Ke(e, "modelValue", [], (m) => m == null ? [] : Wf(o, pn(m)), (m) => {
    const h = Fb(o, m);
    return e.multiple ? h : h[0];
  }), l = it("useGroup");
  function s(m, h) {
    const v = m, g = Symbol.for(`${t.description}:id`), S = zo(g, l == null ? void 0 : l.vnode).indexOf(h);
    fn(v.value) == null && (v.value = S, v.useIndexAsValue = !0), S > -1 ? o.splice(S, 0, v) : o.push(v);
  }
  function a(m) {
    if (n) return;
    r();
    const h = o.findIndex((v) => v.id === m);
    o.splice(h, 1);
  }
  function r() {
    const m = o.find((h) => !h.disabled);
    m && e.mandatory === "force" && !i.value.length && (i.value = [m.id]);
  }
  Cn(() => {
    r();
  }), wt(() => {
    n = !0;
  }), Ba(() => {
    for (let m = 0; m < o.length; m++)
      o[m].useIndexAsValue && (o[m].value = m);
  });
  function f(m, h) {
    const v = o.find((g) => g.id === m);
    if (!(h && (v != null && v.disabled)))
      if (e.multiple) {
        const g = i.value.slice(), _ = g.findIndex((N) => N === m), S = ~_;
        if (h = h ?? !S, S && e.mandatory && g.length <= 1 || !S && e.max != null && g.length + 1 > e.max) return;
        _ < 0 && h ? g.push(m) : _ >= 0 && !h && g.splice(_, 1), i.value = g;
      } else {
        const g = i.value.includes(m);
        if (e.mandatory && g) return;
        i.value = h ?? !g ? [m] : [];
      }
  }
  function u(m) {
    if (e.multiple && bn('This method is not supported when using "multiple" prop'), i.value.length) {
      const h = i.value[0], v = o.findIndex((S) => S.id === h);
      let g = (v + m) % o.length, _ = o[g];
      for (; _.disabled && g !== v; )
        g = (g + m) % o.length, _ = o[g];
      if (_.disabled) return;
      i.value = [o[g].id];
    } else {
      const h = o.find((v) => !v.disabled);
      h && (i.value = [h.id]);
    }
  }
  const d = {
    register: s,
    unregister: a,
    selected: i,
    select: f,
    disabled: ae(e, "disabled"),
    prev: () => u(o.length - 1),
    next: () => u(1),
    isSelected: (m) => i.value.includes(m),
    selectedClass: b(() => e.selectedClass),
    items: b(() => o),
    getItemIndex: (m) => Mb(o, m)
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
    const i = e.find((s) => zi(o, s.value)), l = e[o];
    (i == null ? void 0 : i.value) != null ? n.push(i.id) : l != null && n.push(l.id);
  }), n;
}
function Fb(e, t) {
  const n = [];
  return t.forEach((o) => {
    const i = e.findIndex((l) => l.id === o);
    if (~i) {
      const l = e[i];
      n.push(l.value != null ? l.value : i);
    }
  }), n;
}
const sr = Symbol.for("vuetify:v-btn-toggle"), Bb = W({
  ...jf(),
  ...lr()
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
      prev: l,
      select: s,
      selected: a
    } = cs(e, sr);
    return _e(() => {
      const r = ko.filterProps(e);
      return c(ko, xe({
        class: ["v-btn-toggle", e.class]
      }, r, {
        style: e.style
      }), {
        default: () => {
          var f;
          return [(f = n.default) == null ? void 0 : f.call(n, {
            isSelected: o,
            next: i,
            prev: l,
            select: s,
            selected: a
          })];
        }
      });
    }), {
      next: i,
      prev: l,
      select: s
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
      reset: l,
      root: s,
      scoped: a
    } = Aa(e);
    return so(o, {
      reset: l,
      root: s,
      scoped: a,
      disabled: i
    }), () => {
      var r;
      return (r = n.default) == null ? void 0 : r.call(n);
    };
  }
}), Rb = ["x-small", "small", "default", "large", "x-large"], ds = W({
  size: {
    type: [String, Number],
    default: "default"
  }
}, "size");
function fs(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  return Ja(() => {
    let n, o;
    return $l(Rb, e.size) ? n = `${t}--size-${e.size}` : e.size && (o = {
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
  icon: Ue,
  ...Te(),
  ...ds(),
  ...Je({
    tag: "i"
  }),
  ...tt()
}, "VIcon"), Pe = de()({
  name: "VIcon",
  props: Hb(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = le(), {
      themeClasses: l
    } = vt(e), {
      iconData: s
    } = kb(b(() => i.value || e.icon)), {
      sizeClasses: a
    } = fs(e), {
      textColorClasses: r,
      textColorStyles: f
    } = Ft(ae(e, "color"));
    return _e(() => {
      var m, h;
      const u = (m = o.default) == null ? void 0 : m.call(o);
      u && (i.value = (h = df(u).filter((v) => v.type === Mo && v.children && typeof v.children == "string")[0]) == null ? void 0 : h.children);
      const d = !!(n.onClick || n.onClickOnce);
      return c(s.value.component, {
        tag: e.tag,
        icon: s.value.icon,
        class: ["v-icon", "notranslate", l.value, a.value, r.value, {
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
  const n = le(), o = we(!1);
  if (Ga) {
    const i = new IntersectionObserver((l) => {
      o.value = !!l.find((s) => s.isIntersecting);
    }, t);
    wt(() => {
      i.disconnect();
    }), ke(n, (l, s) => {
      s && (i.unobserve(s), o.value = !1), l && i.observe(l);
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
  ...ds(),
  ...Je({
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
    const o = 20, i = 2 * Math.PI * o, l = le(), {
      themeClasses: s
    } = vt(e), {
      sizeClasses: a,
      sizeStyles: r
    } = fs(e), {
      textColorClasses: f,
      textColorStyles: u
    } = Ft(ae(e, "color")), {
      textColorClasses: d,
      textColorStyles: m
    } = Ft(ae(e, "bgColor")), {
      intersectionRef: h,
      isIntersecting: v
    } = qf(), {
      resizeRef: g,
      contentRect: _
    } = Hl(), S = b(() => Math.max(0, Math.min(100, parseFloat(e.modelValue)))), N = b(() => Number(e.width)), A = b(() => r.value ? Number(e.size) : _.value ? _.value.width : Math.max(N.value, 32)), P = b(() => o / (1 - N.value / A.value) * 2), x = b(() => N.value / A.value * P.value), C = b(() => be((100 - S.value) / 100 * i));
    return nn(() => {
      h.value = l.value, g.value = l.value;
    }), _e(() => c(e.tag, {
      ref: l,
      class: ["v-progress-circular", {
        "v-progress-circular--indeterminate": !!e.indeterminate,
        "v-progress-circular--visible": v.value,
        "v-progress-circular--disable-shrink": e.indeterminate === "disable-shrink"
      }, s.value, a.value, f.value, e.class],
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
        style: m.value,
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
      const n = {}, o = be(e.height), i = be(e.maxHeight), l = be(e.maxWidth), s = be(e.minHeight), a = be(e.minWidth), r = be(e.width);
      return o != null && (n.height = o), i != null && (n.maxHeight = i), l != null && (n.maxWidth = l), s != null && (n.minHeight = s), a != null && (n.minWidth = a), r != null && (n.width = r), n;
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
  } = Lt();
  return {
    locationStyles: b(() => {
      if (!e.location) return {};
      const {
        side: l,
        align: s
      } = ua(e.location.split(" ").length > 1 ? e.location : `${e.location} center`, o.value);
      function a(f) {
        return n ? n(f) : 0;
      }
      const r = {};
      return l !== "center" && (t ? r[oc[l]] = `calc(100% - ${a(l)}px)` : r[l] = 0), s !== "center" ? t ? r[oc[s]] = `calc(100% - ${a(s)}px)` : r[s] = 0 : (l === "center" ? r.top = r.left = "50%" : r[{
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
  ...Je(),
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
    const o = Ke(e, "modelValue"), {
      isRtl: i,
      rtlClasses: l
    } = Lt(), {
      themeClasses: s
    } = vt(e), {
      locationStyles: a
    } = Ui(e), {
      textColorClasses: r,
      textColorStyles: f
    } = Ft(e, "color"), {
      backgroundColorClasses: u,
      backgroundColorStyles: d
    } = At(b(() => e.bgColor || e.color)), {
      backgroundColorClasses: m,
      backgroundColorStyles: h
    } = At(b(() => e.bufferColor || e.bgColor || e.color)), {
      backgroundColorClasses: v,
      backgroundColorStyles: g
    } = At(e, "color"), {
      roundedClasses: _
    } = Tt(e), {
      intersectionRef: S,
      isIntersecting: N
    } = qf(), A = b(() => parseFloat(e.max)), P = b(() => parseFloat(e.height)), x = b(() => Sn(parseFloat(e.bufferValue) / A.value * 100, 0, 100)), C = b(() => Sn(parseFloat(o.value) / A.value * 100, 0, 100)), $ = b(() => i.value !== e.reverse), V = b(() => e.indeterminate ? "fade-transition" : "slide-x-transition"), T = Ge && ((O = window.matchMedia) == null ? void 0 : O.call(window, "(forced-colors: active)").matches);
    function D(k) {
      if (!S.value) return;
      const {
        left: I,
        right: B,
        width: Z
      } = S.value.getBoundingClientRect(), re = $.value ? Z - k.clientX + (B - Z) : k.clientX - I;
      o.value = Math.round(re / Z * A.value);
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
      }, _.value, s.value, l.value, e.class],
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
        class: ["v-progress-linear__buffer", T ? void 0 : m.value],
        style: [h.value, {
          opacity: parseFloat(e.bufferOpacity),
          width: be(x.value, "%")
        }]
      }, null), c($o, {
        name: V.value
      }, {
        default: () => [e.indeterminate ? c("div", {
          class: "v-progress-linear__indeterminate"
        }, [["long", "short"].map((k) => c("div", {
          key: k,
          class: ["v-progress-linear__indeterminate", k, T ? void 0 : v.value],
          style: g.value
        }, null))]) : c("div", {
          class: ["v-progress-linear__determinate", T ? void 0 : v.value],
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
const Ub = ["static", "relative", "fixed", "absolute", "sticky"], ms = W({
  position: {
    type: String,
    validator: (
      /* istanbul ignore next */
      (e) => Ub.includes(e)
    )
  }
}, "position");
function vs(e) {
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
  var d, m;
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
  const l = b(() => ({
    ...e,
    to: ae(() => e.to || "")
  })), s = n.useLink(l.value), a = b(() => e.to ? s : void 0), r = Wb(), f = b(() => {
    var h, v, g;
    return a.value ? e.exact ? r.value ? ((g = a.value.isExactActive) == null ? void 0 : g.value) && zi(a.value.route.value.query, r.value.query) : ((v = a.value.isExactActive) == null ? void 0 : v.value) ?? !1 : ((h = a.value.isActive) == null ? void 0 : h.value) ?? !1 : !1;
  }), u = b(() => {
    var h;
    return e.to ? (h = a.value) == null ? void 0 : h.route.value.href : e.href;
  });
  return {
    isLink: o,
    isClickable: i,
    isActive: f,
    route: (d = a.value) == null ? void 0 : d.route,
    navigate: (m = a.value) == null ? void 0 : m.navigate,
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
let $s = !1;
function Gb(e, t) {
  let n = !1, o, i;
  Ge && (at(() => {
    window.addEventListener("popstate", l), o = e == null ? void 0 : e.beforeEach((s, a, r) => {
      $s ? n ? t(r) : r() : setTimeout(() => n ? t(r) : r()), $s = !0;
    }), i = e == null ? void 0 : e.afterEach(() => {
      $s = !1;
    });
  }), Bt(() => {
    window.removeEventListener("popstate", l), o == null || o(), i == null || i();
  }));
  function l(s) {
    var a;
    (a = s.state) != null && a.replaced || (n = !0, setTimeout(() => n = !1));
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
    const m = t.getBoundingClientRect(), h = ha(e) ? e.touches[e.touches.length - 1] : e;
    o = h.clientX - m.left, i = h.clientY - m.top;
  }
  let l = 0, s = 0.3;
  (d = t._ripple) != null && d.circle ? (s = 0.15, l = t.clientWidth / 2, l = n.center ? l : l + Math.sqrt((o - l) ** 2 + (i - l) ** 2) / 4) : l = Math.sqrt(t.clientWidth ** 2 + t.clientHeight ** 2) / 2;
  const a = `${(t.clientWidth - l * 2) / 2}px`, r = `${(t.clientHeight - l * 2) / 2}px`, f = n.center ? a : `${o - l}px`, u = n.center ? r : `${i - l}px`;
  return {
    radius: l,
    scale: s,
    x: f,
    y: u,
    centerX: a,
    centerY: r
  };
}, jl = {
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
      scale: s,
      x: a,
      y: r,
      centerX: f,
      centerY: u
    } = Xb(e, t, n), d = `${l * 2}px`;
    i.className = "v-ripple__animation", i.style.width = d, i.style.height = d, t.appendChild(o);
    const m = window.getComputedStyle(t);
    m && m.position === "static" && (t.style.position = "relative", t.dataset.previousPosition = "static"), i.classList.add("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--visible"), ic(i, `translate(${a}, ${r}) scale3d(${s},${s},${s})`), i.dataset.activated = String(performance.now()), setTimeout(() => {
      i.classList.remove("v-ripple__animation--enter"), i.classList.add("v-ripple__animation--in"), ic(i, `translate(${f}, ${u}) scale3d(1,1,1)`);
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
        jl.show(e, n, t);
      }, n._ripple.showTimer = window.setTimeout(() => {
        var o;
        (o = n == null ? void 0 : n._ripple) != null && o.showTimerCommit && (n._ripple.showTimerCommit(), n._ripple.showTimerCommit = null);
      }, Yb);
    } else
      jl.show(e, n, t);
  }
}
function lc(e) {
  e[va] = !0;
}
function Dt(e) {
  const t = e.currentTarget;
  if (t != null && t._ripple) {
    if (window.clearTimeout(t._ripple.showTimer), e.type === "touchend" && t._ripple.showTimerCommit) {
      t._ripple.showTimerCommit(), t._ripple.showTimerCommit = null, t._ripple.showTimer = window.setTimeout(() => {
        Dt(e);
      });
      return;
    }
    window.setTimeout(() => {
      t._ripple && (t._ripple.touched = !1);
    }), jl.hide(t);
  }
}
function Jf(e) {
  const t = e.currentTarget;
  t != null && t._ripple && (t._ripple.showTimerCommit && (t._ripple.showTimerCommit = null), window.clearTimeout(t._ripple.showTimer));
}
let Ii = !1;
function Zf(e) {
  !Ii && (e.keyCode === Cu.enter || e.keyCode === Cu.space) && (Ii = !0, Oi(e));
}
function Qf(e) {
  Ii = !1, Dt(e);
}
function em(e) {
  Ii && (Ii = !1, Dt(e));
}
function tm(e, t, n) {
  const {
    value: o,
    modifiers: i
  } = t, l = Xf(o);
  if (l || jl.hide(e), e._ripple = e._ripple ?? {}, e._ripple.enabled = l, e._ripple.centered = i.center, e._ripple.circle = i.circle, af(o) && o.class && (e._ripple.class = o.class), l && !n) {
    if (i.stop) {
      e.addEventListener("touchstart", lc, {
        passive: !0
      }), e.addEventListener("mousedown", lc);
      return;
    }
    e.addEventListener("touchstart", Oi, {
      passive: !0
    }), e.addEventListener("touchend", Dt, {
      passive: !0
    }), e.addEventListener("touchmove", Jf, {
      passive: !0
    }), e.addEventListener("touchcancel", Dt), e.addEventListener("mousedown", Oi), e.addEventListener("mouseup", Dt), e.addEventListener("mouseleave", Dt), e.addEventListener("keydown", Zf), e.addEventListener("keyup", Qf), e.addEventListener("blur", em), e.addEventListener("dragstart", Dt, {
      passive: !0
    });
  } else !l && n && nm(e);
}
function nm(e) {
  e.removeEventListener("mousedown", Oi), e.removeEventListener("touchstart", Oi), e.removeEventListener("touchend", Dt), e.removeEventListener("touchmove", Jf), e.removeEventListener("touchcancel", Dt), e.removeEventListener("mouseup", Dt), e.removeEventListener("mouseleave", Dt), e.removeEventListener("keydown", Zf), e.removeEventListener("keyup", Qf), e.removeEventListener("dragstart", Dt), e.removeEventListener("blur", em);
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
    default: sr
  },
  flat: Boolean,
  icon: [Boolean, String, Function, Object],
  prependIcon: Ue,
  appendIcon: Ue,
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
  ...Gt(),
  ...zn(),
  ...Hn(),
  ...zf(),
  ...rr(),
  ...oi(),
  ...ms(),
  ...Nt(),
  ...dr(),
  ...ds(),
  ...Je({
    tag: "button"
  }),
  ...tt(),
  ...uo({
    variant: "elevated"
  })
}, "VBtn"), ce = de()({
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
      borderClasses: l
    } = ro(e), {
      densityClasses: s
    } = ln(e), {
      dimensionStyles: a
    } = Un(e), {
      elevationClasses: r
    } = jn(e), {
      loaderClasses: f
    } = ur(e), {
      locationStyles: u
    } = Ui(e), {
      positionClasses: d
    } = vs(e), {
      roundedClasses: m
    } = Tt(e), {
      sizeClasses: h,
      sizeStyles: v
    } = fs(e), g = Uf(e, e.symbol, !1), _ = cr(e, n), S = b(() => {
      var O;
      return e.active !== void 0 ? e.active : _.isLink.value ? (O = _.isActive) == null ? void 0 : O.value : g == null ? void 0 : g.isSelected.value;
    }), N = b(() => S.value ? e.activeColor ?? e.color : e.color), A = b(() => {
      var k, I;
      return {
        color: (g == null ? void 0 : g.isSelected.value) && (!_.isLink.value || ((k = _.isActive) == null ? void 0 : k.value)) || !g || ((I = _.isActive) == null ? void 0 : I.value) ? N.value ?? e.baseColor : e.baseColor,
        variant: e.variant
      };
    }), {
      colorClasses: P,
      colorStyles: x,
      variantClasses: C
    } = ni(A), $ = b(() => (g == null ? void 0 : g.disabled.value) || e.disabled), V = b(() => e.variant === "elevated" && !(e.disabled || e.flat || e.border)), T = b(() => {
      if (!(e.value === void 0 || typeof e.value == "symbol"))
        return Object(e.value) === e.value ? JSON.stringify(e.value, null, 0) : e.value;
    });
    function D(O) {
      var k;
      $.value || _.isLink.value && (O.metaKey || O.ctrlKey || O.shiftKey || O.button !== 0 || n.target === "_blank") || ((k = _.navigate) == null || k.call(_, O), g == null || g.toggle());
    }
    return Kb(_, g == null ? void 0 : g.select), _e(() => {
      const O = _.isLink.value ? "a" : e.tag, k = !!(e.prependIcon || o.prepend), I = !!(e.appendIcon || o.append), B = !!(e.icon && e.icon !== !0);
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
        }, i.value, l.value, P.value, s.value, r.value, f.value, d.value, m.value, h.value, C.value, e.class],
        style: [x.value, a.value, u.value, v.value, e.style],
        "aria-busy": e.loading ? !0 : void 0,
        disabled: $.value || void 0,
        tabindex: e.loading || e.readonly ? -1 : void 0,
        onClick: D,
        value: T.value
      }, _.linkProps), {
        default: () => {
          var Z;
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
          }, o.prepend) : c(Pe, {
            key: "prepend-icon",
            icon: e.prependIcon
          }, null)]), c("span", {
            class: "v-btn__content",
            "data-no-activator": ""
          }, [!o.default && B ? c(Pe, {
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
          })]), !e.icon && I && c("span", {
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
          }, o.append) : c(Pe, {
            key: "append-icon",
            icon: e.appendIcon
          }, null)]), !!e.loading && c("span", {
            key: "loader",
            class: "v-btn__loader"
          }, [((Z = o.loader) == null ? void 0 : Z.call(o)) ?? c(Gf, {
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
    type: Ue,
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
  ...Gt(),
  ...zn(),
  ...Hn(),
  ...oi(),
  ...ms(),
  ...Nt(),
  ...Je(),
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
    const i = Ke(e, "modelValue"), l = b(() => {
      if (e.icon !== !1)
        return e.type ? e.icon ?? `$${e.type}` : e.icon;
    }), s = b(() => ({
      color: e.color ?? e.type,
      variant: e.variant
    })), {
      themeClasses: a
    } = vt(e), {
      colorClasses: r,
      colorStyles: f,
      variantClasses: u
    } = ni(s), {
      densityClasses: d
    } = ln(e), {
      dimensionStyles: m
    } = Un(e), {
      elevationClasses: h
    } = jn(e), {
      locationStyles: v
    } = Ui(e), {
      positionClasses: g
    } = vs(e), {
      roundedClasses: _
    } = Tt(e), {
      textColorClasses: S,
      textColorStyles: N
    } = Ft(ae(e, "borderColor")), {
      t: A
    } = ss(), P = b(() => ({
      "aria-label": A(e.closeLabel),
      onClick(x) {
        i.value = !1, n("click:close", x);
      }
    }));
    return () => {
      const x = !!(o.prepend || l.value), C = !!(o.title || e.title), $ = !!(o.close || e.closable);
      return i.value && c(e.tag, {
        class: ["v-alert", e.border && {
          "v-alert--border": !!e.border,
          [`v-alert--border-${e.border === !0 ? "start" : e.border}`]: !0
        }, {
          "v-alert--prominent": e.prominent
        }, a.value, r.value, d.value, h.value, g.value, _.value, u.value, e.class],
        style: [f.value, m.value, v.value, e.style],
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
            disabled: !l.value,
            defaults: {
              VIcon: {
                density: e.density,
                icon: l.value,
                size: e.prominent ? 44 : 28
              }
            }
          }, o.prepend) : c(Pe, {
            key: "prepend-icon",
            density: e.density,
            icon: l.value,
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
          }) : c(ce, xe({
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
    return so({
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
  ...Je()
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
}), Qn = ls("v-card-title");
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
}, "VResponsive"), sc = de()({
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
      var l;
      return c("div", {
        class: ["v-responsive", {
          "v-responsive--inline": e.inline
        }, e.class],
        style: [i.value, e.style]
      }, [c("div", {
        class: "v-responsive__sizer",
        style: o.value
      }, null), (l = n.additional) == null ? void 0 : l.call(n), n.default && c("div", {
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
}, "transition"), vn = (e, t) => {
  let {
    slots: n
  } = t;
  const {
    transition: o,
    disabled: i,
    group: l,
    ...s
  } = e, {
    component: a = l ? qa : $o,
    ...r
  } = typeof o == "object" ? o : {};
  return lo(a, xe(typeof o == "string" ? {
    name: i ? "" : o
  } : r, typeof o == "string" ? {} : Object.fromEntries(Object.entries({
    disabled: i,
    group: l
  }).filter((f) => {
    let [u, d] = f;
    return d !== void 0;
  })), s), n);
};
function l_(e, t) {
  if (!Ga) return;
  const n = t.modifiers || {}, o = t.value, {
    handler: i,
    options: l
  } = typeof o == "object" ? o : {
    handler: o,
    options: {}
  }, s = new IntersectionObserver(function() {
    var d;
    let a = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], r = arguments.length > 1 ? arguments[1] : void 0;
    const f = (d = e._observe) == null ? void 0 : d[t.instance.$.uid];
    if (!f) return;
    const u = a.some((m) => m.isIntersecting);
    i && (!n.quiet || f.init) && (!n.once || u || f.init) && i(u, a, r), u && n.once ? lm(e, t) : f.init = !0;
  }, l);
  e._observe = Object(e._observe), e._observe[t.instance.$.uid] = {
    init: !1,
    observer: s
  }, s.observe(e);
}
function lm(e, t) {
  var o;
  const n = (o = e._observe) == null ? void 0 : o[t.instance.$.uid];
  n && (n.observer.unobserve(e), delete e._observe[t.instance.$.uid]);
}
const fr = {
  mounted: l_,
  unmounted: lm
}, s_ = W({
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
  props: s_(),
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
    } = At(ae(e, "color")), {
      roundedClasses: s
    } = Tt(e), a = it("VImg"), r = we(""), f = le(), u = we(e.eager ? "loading" : "idle"), d = we(), m = we(), h = b(() => e.src && typeof e.src == "object" ? {
      src: e.src.src,
      srcset: e.srcset || e.src.srcset,
      lazySrc: e.lazySrc || e.src.lazySrc,
      aspect: Number(e.aspectRatio || e.src.aspect || 0)
    } : {
      src: e.src,
      srcset: e.srcset,
      lazySrc: e.lazySrc,
      aspect: Number(e.aspectRatio || 0)
    }), v = b(() => h.value.aspect || d.value / m.value || 0);
    ke(() => e.src, () => {
      g(u.value !== "idle");
    }), ke(v, (k, I) => {
      !k && I && f.value && P(f.value);
    }), Fa(() => g());
    function g(k) {
      if (!(e.eager && k) && !(Ga && !k && !e.eager)) {
        if (u.value = "loading", h.value.lazySrc) {
          const I = new Image();
          I.src = h.value.lazySrc, P(I, null);
        }
        h.value.src && at(() => {
          var I;
          n("loadstart", ((I = f.value) == null ? void 0 : I.currentSrc) || h.value.src), setTimeout(() => {
            var B;
            if (!a.isUnmounted)
              if ((B = f.value) != null && B.complete) {
                if (f.value.naturalWidth || S(), u.value === "error") return;
                v.value || P(f.value, null), u.value === "loading" && _();
              } else
                v.value || P(f.value), N();
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
    let A = -1;
    wt(() => {
      clearTimeout(A);
    });
    function P(k) {
      let I = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 100;
      const B = () => {
        if (clearTimeout(A), a.isUnmounted) return;
        const {
          naturalHeight: Z,
          naturalWidth: re
        } = k;
        Z || re ? (d.value = re, m.value = Z) : !k.complete && u.value === "loading" && I != null ? A = window.setTimeout(B, I) : (k.currentSrc.endsWith(".svg") || k.currentSrc.startsWith("data:image/svg+xml")) && (d.value = 1, m.value = 1);
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
      }, null), I = (B = o.sources) == null ? void 0 : B.call(o);
      return c(vn, {
        transition: e.transition,
        appear: !0
      }, {
        default: () => [rt(I ? c("picture", {
          class: "v-img__picture"
        }, [I, k]) : k, [[En, u.value === "loaded"]])]
      });
    }, $ = () => c(vn, {
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
    }), V = () => o.placeholder ? c(vn, {
      transition: e.transition,
      appear: !0
    }, {
      default: () => [(u.value === "loading" || u.value === "error" && !o.error) && c("div", {
        class: "v-img__placeholder"
      }, [o.placeholder()])]
    }) : null, T = () => o.error ? c(vn, {
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
      const k = ke(v, (I) => {
        I && (requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            O.value = !0;
          });
        }), k());
      });
    }
    return _e(() => {
      const k = sc.filterProps(e);
      return rt(c(sc, xe({
        class: ["v-img", {
          "v-img--absolute": e.absolute,
          "v-img--booting": !O.value
        }, i.value, s.value, e.class],
        style: [{
          width: be(e.width === "auto" ? d.value : e.width)
        }, l.value, e.style]
      }, k, {
        aspectRatio: v.value,
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
      naturalHeight: m
    };
  }
}), a_ = W({
  start: Boolean,
  end: Boolean,
  icon: Ue,
  image: String,
  text: String,
  ...ao(),
  ...Te(),
  ...Gt(),
  ...Nt(),
  ...ds(),
  ...Je(),
  ...tt(),
  ...uo({
    variant: "flat"
  })
}, "VAvatar"), hn = de()({
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
      colorClasses: l,
      colorStyles: s,
      variantClasses: a
    } = ni(e), {
      densityClasses: r
    } = ln(e), {
      roundedClasses: f
    } = Tt(e), {
      sizeClasses: u,
      sizeStyles: d
    } = fs(e);
    return _e(() => c(e.tag, {
      class: ["v-avatar", {
        "v-avatar--start": e.start,
        "v-avatar--end": e.end
      }, o.value, i.value, l.value, r.value, f.value, u.value, a.value, e.class],
      style: [s.value, d.value, e.style]
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
      }, null) : e.icon ? c(Pe, {
        key: "icon",
        icon: e.icon
      }, null) : e.text, ti(!1, "v-avatar")]
    })), {};
  }
}), r_ = W({
  appendAvatar: String,
  appendIcon: Ue,
  prependAvatar: String,
  prependIcon: Ue,
  subtitle: [String, Number],
  title: [String, Number],
  ...Te(),
  ...Gt()
}, "VCardItem"), sm = de()({
  name: "VCardItem",
  props: r_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    return _e(() => {
      var f;
      const o = !!(e.prependAvatar || e.prependIcon), i = !!(o || n.prepend), l = !!(e.appendAvatar || e.appendIcon), s = !!(l || n.append), a = !!(e.title != null || n.title), r = !!(e.subtitle != null || n.subtitle);
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
      }, n.prepend) : c(Ve, null, [e.prependAvatar && c(hn, {
        key: "prepend-avatar",
        density: e.density,
        image: e.prependAvatar
      }, null), e.prependIcon && c(Pe, {
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
      }), (f = n.default) == null ? void 0 : f.call(n)]), s && c("div", {
        key: "append",
        class: "v-card-item__append"
      }, [n.append ? c(mt, {
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
      }, n.append) : c(Ve, null, [e.appendIcon && c(Pe, {
        key: "append-icon",
        density: e.density,
        icon: e.appendIcon
      }, null), e.appendAvatar && c(hn, {
        key: "append-avatar",
        density: e.density,
        image: e.appendAvatar
      }, null)])])]);
    }), {};
  }
}), u_ = W({
  opacity: [Number, String],
  ...Te(),
  ...Je()
}, "VCardText"), _n = de()({
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
  appendIcon: Ue,
  disabled: Boolean,
  flat: Boolean,
  hover: Boolean,
  image: String,
  link: {
    type: Boolean,
    default: void 0
  },
  prependAvatar: String,
  prependIcon: Ue,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  subtitle: [String, Number],
  text: [String, Number],
  title: [String, Number],
  ...ao(),
  ...Te(),
  ...Gt(),
  ...zn(),
  ...Hn(),
  ...rr(),
  ...oi(),
  ...ms(),
  ...Nt(),
  ...dr(),
  ...Je(),
  ...tt(),
  ...uo({
    variant: "elevated"
  })
}, "VCard"), Ct = de()({
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
      borderClasses: l
    } = ro(e), {
      colorClasses: s,
      colorStyles: a,
      variantClasses: r
    } = ni(e), {
      densityClasses: f
    } = ln(e), {
      dimensionStyles: u
    } = Un(e), {
      elevationClasses: d
    } = jn(e), {
      loaderClasses: m
    } = ur(e), {
      locationStyles: h
    } = Ui(e), {
      positionClasses: v
    } = vs(e), {
      roundedClasses: g
    } = Tt(e), _ = cr(e, n), S = b(() => e.link !== !1 && _.isLink.value), N = b(() => !e.disabled && e.link !== !1 && (e.link || _.isClickable.value));
    return _e(() => {
      const A = S.value ? "a" : e.tag, P = !!(o.title || e.title != null), x = !!(o.subtitle || e.subtitle != null), C = P || x, $ = !!(o.append || e.appendAvatar || e.appendIcon), V = !!(o.prepend || e.prependAvatar || e.prependIcon), T = !!(o.image || e.image), D = C || V || $, O = !!(o.text || e.text != null);
      return rt(c(A, xe({
        class: ["v-card", {
          "v-card--disabled": e.disabled,
          "v-card--flat": e.flat,
          "v-card--hover": e.hover && !(e.disabled || e.flat),
          "v-card--link": N.value
        }, i.value, l.value, s.value, f.value, d.value, m.value, v.value, g.value, r.value, e.class],
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
          }), D && c(sm, {
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
          }), O && c(_n, {
            key: "text"
          }, {
            default: () => {
              var I;
              return [((I = o.text) == null ? void 0 : I.call(o)) ?? e.text];
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
function Rt(e, t, n) {
  return de()({
    name: e,
    props: d_({
      mode: n,
      origin: t
    }),
    setup(o, i) {
      let {
        slots: l
      } = i;
      const s = {
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
              height: m
            } = a._transitionInitialStyles;
            delete a._transitionInitialStyles, a.style.position = r || "", a.style.top = f || "", a.style.left = u || "", a.style.width = d || "", a.style.height = m || "";
          }
        }
      };
      return () => {
        const a = o.group ? qa : $o;
        return lo(a, {
          name: o.disabled ? "" : e,
          css: !o.disabled,
          ...o.group ? void 0 : {
            mode: o.mode
          },
          ...o.disabled ? {} : s
        }, l.default);
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
        slots: l
      } = i;
      const s = o.group ? qa : $o;
      return () => lo(s, {
        name: o.disabled ? "" : e,
        css: !o.disabled,
        // mode: props.mode, // TODO: vuejs/vue-next#3104
        ...o.disabled ? {} : t
      }, l.default);
    }
  });
}
function rm() {
  let e = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "";
  const n = (arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1) ? "width" : "height", o = gt(`offset-${n}`);
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
      const r = `${s[o]}px`;
      s.style[n] = "0", s.offsetHeight, s.style.transition = a.transition, e && s._parent && s._parent.classList.add(e), requestAnimationFrame(() => {
        s.style[n] = r;
      });
    },
    onAfterEnter: l,
    onEnterCancelled: l,
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
    e && s._parent && s._parent.classList.remove(e), l(s);
  }
  function l(s) {
    const a = s._initialStyle[n];
    s.style.overflow = s._initialStyle.overflow, a != null && (s.style[n] = a), delete s._initialStyle;
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
      async onEnter(i, l) {
        var m;
        await new Promise((h) => requestAnimationFrame(h)), await new Promise((h) => requestAnimationFrame(h)), i.style.visibility = "";
        const {
          x: s,
          y: a,
          sx: r,
          sy: f,
          speed: u
        } = rc(e.target, i), d = So(i, [{
          transform: `translate(${s}px, ${a}px) scale(${r}, ${f})`,
          opacity: 0
        }, {}], {
          duration: 225 * u,
          easing: mp
        });
        (m = ac(i)) == null || m.forEach((h) => {
          So(h, [{
            opacity: 0
          }, {
            opacity: 0,
            offset: 0.33
          }, {}], {
            duration: 225 * 2 * u,
            easing: Vi
          });
        }), d.finished.then(() => l());
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
          x: s,
          y: a,
          sx: r,
          sy: f,
          speed: u
        } = rc(e.target, i);
        So(i, [{}, {
          transform: `translate(${s}px, ${a}px) scale(${r}, ${f})`,
          opacity: 0
        }], {
          duration: 125 * u,
          easing: vp
        }).finished.then(() => l()), (m = ac(i)) == null || m.forEach((h) => {
          So(h, [{}, {
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
    return () => e.target ? c($o, xe({
      name: "dialog-transition"
    }, o, {
      css: !1
    }), n) : c($o, {
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
  const n = yf(e), o = Qa(t), [i, l] = getComputedStyle(t).transformOrigin.split(" ").map((S) => parseFloat(S)), [s, a] = getComputedStyle(t).getPropertyValue("--v-overlay-anchor-origin").split(" ");
  let r = n.left + n.width / 2;
  s === "left" || a === "left" ? r -= n.width / 2 : (s === "right" || a === "right") && (r += n.width / 2);
  let f = n.top + n.height / 2;
  s === "top" || a === "top" ? f -= n.height / 2 : (s === "bottom" || a === "bottom") && (f += n.height / 2);
  const u = n.width / o.width, d = n.height / o.height, m = Math.max(1, u, d), h = u / m || 0, v = d / m || 0, g = o.width * o.height / (window.innerWidth * window.innerHeight), _ = g > 0.12 ? Math.min(1.5, (g - 0.12) * 10 + 1) : 1;
  return {
    x: r - (i + o.left),
    y: f - (l + o.top),
    sx: h,
    sy: v,
    speed: _
  };
}
Rt("fab-transition", "center center", "out-in");
Rt("dialog-bottom-transition");
Rt("dialog-top-transition");
const uc = Rt("fade-transition"), v_ = Rt("scale-transition");
Rt("scroll-x-transition");
Rt("scroll-x-reverse-transition");
Rt("scroll-y-transition");
Rt("scroll-y-reverse-transition");
Rt("slide-x-transition");
Rt("slide-x-reverse-transition");
const um = Rt("slide-y-transition");
Rt("slide-y-reverse-transition");
const cm = am("expand-transition", rm()), h_ = am("expand-x-transition", rm("", !0)), ga = Symbol.for("vuetify:list");
function dm() {
  const e = He(ga, {
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
  return He(ga, null);
}
const vr = (e) => {
  const t = {
    activate: (n) => {
      let {
        id: o,
        value: i,
        activated: l
      } = n;
      return o = fe(o), e && !i && l.size === 1 && l.has(o) || (i ? l.add(o) : l.delete(o)), l;
    },
    in: (n, o, i) => {
      let l = /* @__PURE__ */ new Set();
      if (n != null)
        for (const s of pn(n))
          l = t.activate({
            id: s,
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
}, mm = (e) => {
  const t = vr(e);
  return {
    activate: (o) => {
      let {
        activated: i,
        id: l,
        ...s
      } = o;
      l = fe(l);
      const a = i.has(l) ? /* @__PURE__ */ new Set([l]) : /* @__PURE__ */ new Set();
      return t.activate({
        ...s,
        id: l,
        activated: a
      });
    },
    in: (o, i, l) => {
      let s = /* @__PURE__ */ new Set();
      if (o != null) {
        const a = pn(o);
        a.length && (s = t.in(a.slice(0, 1), i, l));
      }
      return s;
    },
    out: (o, i, l) => t.out(o, i, l)
  };
}, g_ = (e) => {
  const t = vr(e);
  return {
    activate: (o) => {
      let {
        id: i,
        activated: l,
        children: s,
        ...a
      } = o;
      return i = fe(i), s.has(i) ? l : t.activate({
        id: i,
        activated: l,
        children: s,
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
        activated: l,
        children: s,
        ...a
      } = o;
      return i = fe(i), s.has(i) ? l : t.activate({
        id: i,
        activated: l,
        children: s,
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
      const l = /* @__PURE__ */ new Set();
      l.add(t);
      let s = i.get(t);
      for (; s != null; )
        l.add(s), s = i.get(s);
      return l;
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
      let l = i.get(t);
      for (o.add(t); l != null && l !== t; )
        o.add(l), l = i.get(l);
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
    const l = [];
    let s = i.get(t);
    for (; s != null; )
      l.push(s), s = i.get(s);
    return new Set(l);
  }
}, hr = (e) => {
  const t = {
    select: (n) => {
      let {
        id: o,
        value: i,
        selected: l
      } = n;
      if (o = fe(o), e && !i) {
        const s = Array.from(l.entries()).reduce((a, r) => {
          let [f, u] = r;
          return u === "on" && a.push(f), a;
        }, []);
        if (s.length === 1 && s[0] === o) return l;
      }
      return l.set(o, i ? "on" : "off"), l;
    },
    in: (n, o, i) => {
      let l = /* @__PURE__ */ new Map();
      for (const s of n || [])
        l = t.select({
          id: s,
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
}, hm = (e) => {
  const t = hr(e);
  return {
    select: (o) => {
      let {
        selected: i,
        id: l,
        ...s
      } = o;
      l = fe(l);
      const a = i.has(l) ? /* @__PURE__ */ new Map([[l, i.get(l)]]) : /* @__PURE__ */ new Map();
      return t.select({
        ...s,
        id: l,
        selected: a
      });
    },
    in: (o, i, l) => {
      let s = /* @__PURE__ */ new Map();
      return o != null && o.length && (s = t.in(o.slice(0, 1), i, l)), s;
    },
    out: (o, i, l) => t.out(o, i, l)
  };
}, __ = (e) => {
  const t = hr(e);
  return {
    select: (o) => {
      let {
        id: i,
        selected: l,
        children: s,
        ...a
      } = o;
      return i = fe(i), s.has(i) ? l : t.select({
        id: i,
        selected: l,
        children: s,
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
        selected: l,
        children: s,
        ...a
      } = o;
      return i = fe(i), s.has(i) ? l : t.select({
        id: i,
        selected: l,
        children: s,
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
        selected: l,
        children: s,
        parents: a
      } = n;
      o = fe(o);
      const r = new Map(l), f = [o];
      for (; f.length; ) {
        const d = f.shift();
        l.set(fe(d), i ? "on" : "off"), s.has(d) && f.push(...s.get(d));
      }
      let u = fe(a.get(o));
      for (; u; ) {
        const d = s.get(u), m = d.every((v) => l.get(fe(v)) === "on"), h = d.every((v) => !l.has(fe(v)) || l.get(fe(v)) === "off");
        l.set(u, m ? "on" : h ? "off" : "indeterminate"), u = fe(a.get(u));
      }
      return e && !i && Array.from(l.entries()).reduce((m, h) => {
        let [v, g] = h;
        return g === "on" && m.push(v), m;
      }, []).length === 0 ? r : l;
    },
    in: (n, o, i) => {
      let l = /* @__PURE__ */ new Map();
      for (const s of n || [])
        l = t.select({
          id: s,
          value: !0,
          selected: new Map(l),
          children: o,
          parents: i
        });
      return l;
    },
    out: (n, o) => {
      const i = [];
      for (const [l, s] of n.entries())
        s === "on" && !o.has(l) && i.push(l);
      return i;
    }
  };
  return t;
}, Ai = Symbol.for("vuetify:nested"), gm = {
  id: we(),
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
  const n = le(/* @__PURE__ */ new Map()), o = le(/* @__PURE__ */ new Map()), i = Ke(e, "opened", e.opened, (v) => new Set(v), (v) => [...v.values()]), l = b(() => {
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
  }), s = b(() => {
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
  }), r = Ke(e, "activated", e.activated, (v) => l.value.in(v, n.value, o.value), (v) => l.value.out(v, n.value, o.value)), f = Ke(e, "selected", e.selected, (v) => s.value.in(v, n.value, o.value), (v) => s.value.out(v, n.value, o.value));
  wt(() => {
    t = !0;
  });
  function u(v) {
    const g = [];
    let _ = v;
    for (; _ != null; )
      g.unshift(_), _ = o.value.get(_);
    return g;
  }
  const d = it("nested"), m = /* @__PURE__ */ new Set(), h = {
    id: we(),
    root: {
      opened: i,
      activatable: ae(e, "activatable"),
      selectable: ae(e, "selectable"),
      activated: r,
      selected: f,
      selectedValues: b(() => {
        const v = [];
        for (const [g, _] of f.value.entries())
          _ === "on" && v.push(g);
        return v;
      }),
      register: (v, g, _) => {
        if (m.has(v)) {
          const S = u(v).map(String).join(" -> "), N = u(g).concat(v).map(String).join(" -> ");
          Ml(`Multiple nodes with the same ID
	${S}
	${N}`);
          return;
        } else
          m.add(v);
        g && v !== g && o.value.set(v, g), _ && n.value.set(v, []), g != null && n.value.set(g, [...n.value.get(g) || [], v]);
      },
      unregister: (v) => {
        if (t) return;
        m.delete(v), n.value.delete(v);
        const g = o.value.get(v);
        if (g) {
          const _ = n.value.get(g) ?? [];
          n.value.set(g, _.filter((S) => S !== v));
        }
        o.value.delete(v);
      },
      open: (v, g, _) => {
        d.emit("click:open", {
          id: v,
          value: g,
          path: u(v),
          event: _
        });
        const S = a.value.open({
          id: v,
          value: g,
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        S && (i.value = S);
      },
      openOnSelect: (v, g, _) => {
        const S = a.value.select({
          id: v,
          value: g,
          selected: new Map(f.value),
          opened: new Set(i.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        S && (i.value = S);
      },
      select: (v, g, _) => {
        d.emit("click:select", {
          id: v,
          value: g,
          path: u(v),
          event: _
        });
        const S = s.value.select({
          id: v,
          value: g,
          selected: new Map(f.value),
          children: n.value,
          parents: o.value,
          event: _
        });
        S && (f.value = S), h.root.openOnSelect(v, g, _);
      },
      activate: (v, g, _) => {
        if (!e.activatable)
          return h.root.select(v, !0, _);
        d.emit("click:activate", {
          id: v,
          value: g,
          path: u(v),
          event: _
        });
        const S = l.value.activate({
          id: v,
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
  return yt(Ai, h), h.root;
}, ym = (e, t) => {
  const n = He(Ai, gm), o = Symbol(on()), i = b(() => e.value !== void 0 ? e.value : o), l = {
    ...n,
    id: i,
    open: (s, a) => n.root.open(i.value, s, a),
    openOnSelect: (s, a) => n.root.openOnSelect(i.value, s, a),
    isOpen: b(() => n.root.opened.value.has(i.value)),
    parent: b(() => n.root.parents.value.get(i.value)),
    activate: (s, a) => n.root.activate(i.value, s, a),
    isActivated: b(() => n.root.activated.value.has(fe(i.value))),
    select: (s, a) => n.root.select(i.value, s, a),
    isSelected: b(() => n.root.selected.value.get(fe(i.value)) === "on"),
    isIndeterminate: b(() => n.root.selected.value.get(i.value) === "indeterminate"),
    isLeaf: b(() => !n.root.children.value.get(i.value)),
    isGroupActivator: n.isGroupActivator
  };
  return !n.isGroupActivator && n.root.register(i.value, n.id.value, t), wt(() => {
    !n.isGroupActivator && n.root.unregister(i.value);
  }), t && yt(Ai, l), l;
}, E_ = () => {
  const e = He(Ai, gm);
  yt(Ai, {
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
    type: Ue,
    default: "$collapse"
  },
  expandIcon: {
    type: Ue,
    default: "$expand"
  },
  prependIcon: Ue,
  appendIcon: Ue,
  fluid: Boolean,
  subgroup: Boolean,
  title: String,
  value: null,
  ...Te(),
  ...Je()
}, "VListGroup"), zl = de()({
  name: "VListGroup",
  props: V_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isOpen: o,
      open: i,
      id: l
    } = ym(ae(e, "value"), !0), s = b(() => `v-list-group--id-${String(l.value)}`), a = fm(), {
      isBooted: r
    } = Gi();
    function f(h) {
      h.stopPropagation(), i(!o.value, h);
    }
    const u = b(() => ({
      onClick: f,
      class: "v-list-group__header",
      id: s.value
    })), d = b(() => o.value ? e.collapseIcon : e.expandIcon), m = b(() => ({
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
        defaults: m.value
      }, {
        default: () => [c(x_, null, {
          default: () => [n.activator({
            props: u.value,
            isOpen: o.value
          })]
        })]
      }), c(vn, {
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
            "aria-labelledby": s.value
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
  ...Je()
}, "VListItemSubtitle"), hs = de()({
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
}), Ki = ls("v-list-item-title"), T_ = W({
  active: {
    type: Boolean,
    default: void 0
  },
  activeClass: String,
  /* @deprecated */
  activeColor: String,
  appendAvatar: String,
  appendIcon: Ue,
  baseColor: String,
  disabled: Boolean,
  lines: [Boolean, String],
  link: {
    type: Boolean,
    default: void 0
  },
  nav: Boolean,
  prependAvatar: String,
  prependIcon: Ue,
  ripple: {
    type: [Boolean, Object],
    default: !0
  },
  slim: Boolean,
  subtitle: [String, Number],
  title: [String, Number],
  value: null,
  onClick: Ut(),
  onClickOnce: Ut(),
  ...ao(),
  ...Te(),
  ...Gt(),
  ...zn(),
  ...Hn(),
  ...Nt(),
  ...dr(),
  ...Je(),
  ...tt(),
  ...uo({
    variant: "text"
  })
}, "VListItem"), Fe = de()({
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
    const l = cr(e, n), s = b(() => e.value === void 0 ? l.href.value : e.value), {
      activate: a,
      isActivated: r,
      select: f,
      isOpen: u,
      isSelected: d,
      isIndeterminate: m,
      isGroupActivator: h,
      root: v,
      parent: g,
      openOnSelect: _,
      id: S
    } = ym(s, !1), N = fm(), A = b(() => {
      var te;
      return e.active !== !1 && (e.active || ((te = l.isActive) == null ? void 0 : te.value) || (v.activatable.value ? r.value : d.value));
    }), P = b(() => e.link !== !1 && l.isLink.value), x = b(() => !e.disabled && e.link !== !1 && (e.link || l.isClickable.value || !!N && (v.selectable.value || v.activatable.value || e.value != null))), C = b(() => e.rounded || e.nav), $ = b(() => e.color ?? e.activeColor), V = b(() => ({
      color: A.value ? $.value ?? e.baseColor : e.baseColor,
      variant: e.variant
    }));
    ke(() => {
      var te;
      return (te = l.isActive) == null ? void 0 : te.value;
    }, (te) => {
      te && g.value != null && v.open(g.value, !0), te && _(te);
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
      variantClasses: I
    } = ni(V), {
      densityClasses: B
    } = ln(e), {
      dimensionStyles: Z
    } = Un(e), {
      elevationClasses: re
    } = jn(e), {
      roundedClasses: ne
    } = Tt(C), X = b(() => e.lines ? `v-list-item--${e.lines}-line` : void 0), Ce = b(() => ({
      isActive: A.value,
      select: f,
      isOpen: u.value,
      isSelected: d.value,
      isIndeterminate: m.value
    }));
    function G(te) {
      var Oe;
      i("click", te), x.value && ((Oe = l.navigate) == null || Oe.call(l, te), !h && (v.activatable.value ? a(!r.value, te) : (v.selectable.value || e.value != null) && f(!d.value, te)));
    }
    function Y(te) {
      (te.key === "Enter" || te.key === " ") && (te.preventDefault(), te.target.dispatchEvent(new MouseEvent("click", te)));
    }
    return _e(() => {
      const te = P.value ? "a" : e.tag, Oe = o.title || e.title != null, We = o.subtitle || e.subtitle != null, qe = !!(e.appendAvatar || e.appendIcon), oe = !!(qe || o.append), Ee = !!(e.prependAvatar || e.prependIcon), Re = !!(Ee || o.prepend);
      return N == null || N.updateHasPrepend(Re), e.activeColor && Ky("active-color", ["color", "base-color"]), rt(c(te, xe({
        class: ["v-list-item", {
          "v-list-item--active": A.value,
          "v-list-item--disabled": e.disabled,
          "v-list-item--link": x.value,
          "v-list-item--nav": e.nav,
          "v-list-item--prepend": !Re && (N == null ? void 0 : N.hasPrepend.value),
          "v-list-item--slim": e.slim,
          [`${e.activeClass}`]: e.activeClass && A.value
        }, T.value, D.value, O.value, B.value, re.value, X.value, ne.value, I.value, e.class],
        style: [k.value, Z.value, e.style],
        tabindex: x.value ? N ? -2 : 0 : void 0,
        "aria-selected": v.activatable.value ? r.value : d.value,
        onClick: G,
        onKeydown: x.value && !P.value && Y
      }, l.linkProps), {
        default: () => {
          var nt;
          return [ti(x.value || A.value, "v-list-item"), Re && c("div", {
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
          }) : c(Ve, null, [e.prependAvatar && c(hn, {
            key: "prepend-avatar",
            density: e.density,
            image: e.prependAvatar
          }, null), e.prependIcon && c(Pe, {
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
          }), We && c(hs, {
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
              var Qe;
              return [(Qe = o.append) == null ? void 0 : Qe.call(o, Ce.value)];
            }
          }) : c(Ve, null, [e.appendIcon && c(Pe, {
            key: "append-icon",
            density: e.density,
            icon: e.appendIcon
          }, null), e.appendAvatar && c(hn, {
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
      root: v,
      id: S
    };
  }
}), O_ = W({
  color: String,
  inset: Boolean,
  sticky: Boolean,
  title: String,
  ...Te(),
  ...Je()
}, "VListSubheader"), I_ = de()({
  name: "VListSubheader",
  props: O_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      textColorClasses: o,
      textColorStyles: i
    } = Ft(ae(e, "color"));
    return _e(() => {
      const l = !!(n.default || e.title);
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
          var s;
          return [l && c("div", {
            class: "v-list-subheader__text"
          }, [((s = n.default) == null ? void 0 : s.call(n)) ?? e.title])];
        }
      });
    }), {};
  }
}), A_ = W({
  color: String,
  inset: Boolean,
  length: [Number, String],
  opacity: [Number, String],
  thickness: [Number, String],
  vertical: Boolean,
  ...Te(),
  ...tt()
}, "VDivider"), Jt = de()({
  name: "VDivider",
  props: A_(),
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const {
      themeClasses: i
    } = vt(e), {
      textColorClasses: l,
      textColorStyles: s
    } = Ft(ae(e, "color")), a = b(() => {
      const r = {};
      return e.length && (r[e.vertical ? "height" : "width"] = be(e.length)), e.thickness && (r[e.vertical ? "borderRightWidth" : "borderTopWidth"] = be(e.thickness)), r;
    });
    return _e(() => {
      const r = c("hr", {
        class: [{
          "v-divider": !0,
          "v-divider--inset": e.inset,
          "v-divider--vertical": e.vertical
        }, i.value, l.value, e.class],
        style: [a.value, s.value, {
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
      return ((o = n.default) == null ? void 0 : o.call(n)) ?? ((i = e.items) == null ? void 0 : i.map((l) => {
        var m, h;
        let {
          children: s,
          props: a,
          type: r,
          raw: f
        } = l;
        if (r === "divider")
          return ((m = n.divider) == null ? void 0 : m.call(n, {
            props: a
          })) ?? c(Jt, a, null);
        if (r === "subheader")
          return ((h = n.subheader) == null ? void 0 : h.call(n, {
            props: a
          })) ?? c(I_, a, null);
        const u = {
          subtitle: n.subtitle ? (v) => {
            var g;
            return (g = n.subtitle) == null ? void 0 : g.call(n, {
              ...v,
              item: f
            });
          } : void 0,
          prepend: n.prepend ? (v) => {
            var g;
            return (g = n.prepend) == null ? void 0 : g.call(n, {
              ...v,
              item: f
            });
          } : void 0,
          append: n.append ? (v) => {
            var g;
            return (g = n.append) == null ? void 0 : g.call(n, {
              ...v,
              item: f
            });
          } : void 0,
          title: n.title ? (v) => {
            var g;
            return (g = n.title) == null ? void 0 : g.call(n, {
              ...v,
              item: f
            });
          } : void 0
        }, d = zl.filterProps(a);
        return s ? c(zl, xe({
          value: a == null ? void 0 : a.value
        }, d), {
          activator: (v) => {
            let {
              props: g
            } = v;
            const _ = {
              ...a,
              ...g,
              value: e.returnObject ? f : a.value
            };
            return n.header ? n.header({
              props: _
            }) : c(Fe, _, u);
          },
          default: () => c(pm, {
            items: s,
            returnObject: e.returnObject
          }, n)
        }) : n.item ? n.item({
          props: a
        }) : c(Fe, xe(a, {
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
  const n = ui(t, e.itemType, "item"), o = $_(t) ? t : ui(t, e.itemTitle), i = ui(t, e.itemValue, void 0), l = ui(t, e.itemChildren), s = e.itemProps === !0 ? Fo(t, ["children"]) : ui(t, e.itemProps), a = {
    title: o,
    value: i,
    ...s
  };
  return {
    type: n,
    title: a.title,
    value: a.value,
    props: a,
    children: n === "item" && l ? bm(e, l) : void 0,
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
  "onClick:open": Ut(),
  "onClick:select": Ut(),
  "onUpdate:opened": Ut(),
  ...S_({
    selectStrategy: "single-leaf",
    openStrategy: "list"
  }),
  ...ao(),
  ...Te(),
  ...Gt(),
  ...zn(),
  ...Hn(),
  itemType: {
    type: String,
    default: "type"
  },
  ...D_(),
  ...Nt(),
  ...Je(),
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
      backgroundColorClasses: l,
      backgroundColorStyles: s
    } = At(ae(e, "bgColor")), {
      borderClasses: a
    } = ro(e), {
      densityClasses: r
    } = ln(e), {
      dimensionStyles: f
    } = Un(e), {
      elevationClasses: u
    } = jn(e), {
      roundedClasses: d
    } = Tt(e), {
      children: m,
      open: h,
      parents: v,
      select: g,
      getPath: _
    } = C_(e), S = b(() => e.lines ? `v-list--${e.lines}-line` : void 0), N = ae(e, "activeColor"), A = ae(e, "baseColor"), P = ae(e, "color");
    dm(), so({
      VListGroup: {
        activeColor: N,
        baseColor: A,
        color: P,
        expandIcon: ae(e, "expandIcon"),
        collapseIcon: ae(e, "collapseIcon")
      },
      VListItem: {
        activeClass: ae(e, "activeClass"),
        activeColor: N,
        baseColor: A,
        color: P,
        density: ae(e, "density"),
        disabled: ae(e, "disabled"),
        lines: ae(e, "lines"),
        nav: ae(e, "nav"),
        slim: ae(e, "slim"),
        variant: ae(e, "variant")
      }
    });
    const x = we(!1), C = le();
    function $(I) {
      x.value = !0;
    }
    function V(I) {
      x.value = !1;
    }
    function T(I) {
      var B;
      !x.value && !(I.relatedTarget && ((B = C.value) != null && B.contains(I.relatedTarget))) && k();
    }
    function D(I) {
      const B = I.target;
      if (!(!C.value || ["INPUT", "TEXTAREA"].includes(B.tagName))) {
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
    function O(I) {
      x.value = !0;
    }
    function k(I) {
      if (C.value)
        return vf(C.value, I);
    }
    return _e(() => c(e.tag, {
      ref: C,
      class: ["v-list", {
        "v-list--disabled": e.disabled,
        "v-list--nav": e.nav,
        "v-list--slim": e.slim
      }, i.value, l.value, a.value, r.value, u.value, S.value, d.value, e.class],
      style: [s.value, f.value, e.style],
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
      children: m,
      parents: v,
      getPath: _
    };
  }
}), L_ = W({
  text: String,
  ...Te(),
  ...Je()
}, "VToolbarTitle"), _m = de()({
  name: "VToolbarTitle",
  props: L_(),
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
}), R_ = [null, "prominent", "default", "comfortable", "compact"], wm = W({
  absolute: Boolean,
  collapse: Boolean,
  color: String,
  density: {
    type: String,
    default: "default",
    validator: (e) => R_.includes(e)
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
  ...Je({
    tag: "header"
  }),
  ...tt()
}, "VToolbar"), Ul = de()({
  name: "VToolbar",
  props: wm(),
  setup(e, t) {
    var h;
    let {
      slots: n
    } = t;
    const {
      backgroundColorClasses: o,
      backgroundColorStyles: i
    } = At(ae(e, "color")), {
      borderClasses: l
    } = ro(e), {
      elevationClasses: s
    } = jn(e), {
      roundedClasses: a
    } = Tt(e), {
      themeClasses: r
    } = vt(e), {
      rtlClasses: f
    } = Lt(), u = we(!!(e.extended || (h = n.extension) != null && h.call(n))), d = b(() => parseInt(Number(e.height) + (e.density === "prominent" ? Number(e.height) : 0) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0), 10)), m = b(() => u.value ? parseInt(Number(e.extensionHeight) + (e.density === "prominent" ? Number(e.extensionHeight) : 0) - (e.density === "comfortable" ? 4 : 0) - (e.density === "compact" ? 8 : 0), 10) : 0);
    return so({
      VBtn: {
        variant: "text"
      }
    }), _e(() => {
      var S;
      const v = !!(e.title || n.title), g = !!(n.image || e.image), _ = (S = n.extension) == null ? void 0 : S.call(n);
      return u.value = !!(e.extended || _), c(e.tag, {
        class: ["v-toolbar", {
          "v-toolbar--absolute": e.absolute,
          "v-toolbar--collapse": e.collapse,
          "v-toolbar--flat": e.flat,
          "v-toolbar--floating": e.floating,
          [`v-toolbar--density-${e.density}`]: !0
        }, o.value, l.value, s.value, a.value, r.value, f.value, e.class],
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
            var N, A, P;
            return [c("div", {
              class: "v-toolbar__content",
              style: {
                height: be(d.value)
              }
            }, [n.prepend && c("div", {
              class: "v-toolbar__prepend"
            }, [(N = n.prepend) == null ? void 0 : N.call(n)]), v && c(_m, {
              key: "title",
              text: e.title
            }, {
              text: n.title
            }), (A = n.default) == null ? void 0 : A.call(n), n.append && c("div", {
              class: "v-toolbar__append"
            }, [(P = n.append) == null ? void 0 : P.call(n)])])];
          }
        }), c(mt, {
          defaults: {
            VTabs: {
              height: be(m.value)
            }
          }
        }, {
          default: () => [c(cm, null, {
            default: () => [u.value && c("div", {
              class: "v-toolbar__extension",
              style: {
                height: be(m.value)
              }
            }, [_])]
          })]
        })]
      });
    }), {
      contentHeight: d,
      extensionHeight: m
    };
  }
}), H_ = {
  name: "BookAnnotations",
  emits: ["close", "locate", "refresh"],
  props: {
    annotations: { type: Array, default: () => [] },
    loading: { type: Boolean, default: !1 },
    error: { type: String, default: "" }
  }
}, j_ = {
  key: 1,
  class: "annotation-content mt-1"
}, z_ = {
  key: 1,
  class: "annotation-location-hint text-medium-emphasis"
};
function U_(e, t, n, o, i, l) {
  return ee(), ve(Ct, {
    class: "annotation-panel",
    rounded: "t-lg",
    "aria-busy": String(n.loading)
  }, {
    default: p(() => [
      c(Ul, { density: "compact" }, {
        append: p(() => [
          c(ce, {
            icon: "mdi-refresh",
            title: "刷新笔记",
            "aria-label": "刷新笔记",
            loading: n.loading,
            onClick: t[0] || (t[0] = (s) => e.$emit("refresh"))
          }, null, 8, ["loading"]),
          c(ce, {
            icon: "mdi-close",
            title: "关闭笔记",
            "aria-label": "关闭笔记",
            onClick: t[1] || (t[1] = (s) => e.$emit("close"))
          })
        ]),
        default: p(() => [
          c(_m, { id: "annotation-panel-title" }, {
            default: p(() => t[2] || (t[2] = [
              U("阅读笔记")
            ])),
            _: 1
          })
        ]),
        _: 1
      }),
      n.loading ? (ee(), ve(ar, {
        key: 0,
        indeterminate: ""
      })) : ze("", !0),
      n.error ? (ee(), ve(Uo, {
        key: 1,
        class: "ma-3",
        type: "error",
        variant: "tonal",
        density: "compact"
      }, {
        default: p(() => [
          U(Ne(n.error), 1)
        ]),
        _: 1
      })) : ze("", !0),
      !n.loading && n.annotations.length === 0 ? (ee(), ve(_n, {
        key: 2,
        class: "annotation-empty text-center"
      }, {
        default: p(() => [
          c(Pe, { size: "32" }, {
            default: p(() => t[3] || (t[3] = [
              U("mdi-notebook-outline")
            ])),
            _: 1
          }),
          t[4] || (t[4] = se("div", { class: "mt-2" }, "还没有划线或笔记", -1)),
          t[5] || (t[5] = se("div", { class: "text-medium-emphasis mt-1" }, "在正文中选择文字即可开始。", -1))
        ]),
        _: 1
      })) : (ee(), ve(wn, {
        key: 3,
        "aria-label": "本书笔记列表",
        lines: "three"
      }, {
        default: p(() => [
          (ee(!0), Ze(Ve, null, Qt(n.annotations, (s) => (ee(), ve(Fe, {
            key: s.id || s.client_id,
            class: "annotation-item",
            link: !!s.cfi,
            onClick: (a) => s.cfi && e.$emit("locate", s)
          }, {
            prepend: p(() => [
              c(Pe, {
                color: s.annotation_type === "note" ? "blue" : "amber-darken-2"
              }, {
                default: p(() => [
                  U(Ne(s.annotation_type === "note" ? "mdi-note-text-outline" : "mdi-format-color-highlight"), 1)
                ]),
                _: 2
              }, 1032, ["color"])
            ]),
            append: p(() => [
              s.cfi ? (ee(), ve(Pe, {
                key: 0,
                size: "small"
              }, {
                default: p(() => t[6] || (t[6] = [
                  U("mdi-chevron-right")
                ])),
                _: 1
              })) : (ee(), Ze("span", z_, "仅章节定位"))
            ]),
            default: p(() => [
              c(Ki, null, {
                default: p(() => [
                  U(Ne(s.chapter || "未命名章节"), 1)
                ]),
                _: 2
              }, 1024),
              s.quote_text ? (ee(), ve(hs, {
                key: 0,
                class: "annotation-quote"
              }, {
                default: p(() => [
                  U(Ne(s.quote_text), 1)
                ]),
                _: 2
              }, 1024)) : ze("", !0),
              s.content ? (ee(), Ze("div", j_, Ne(s.content), 1)) : ze("", !0)
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
const km = /* @__PURE__ */ Vn(H_, [["render", U_], ["__scopeId", "data-v-df774754"]]), Sm = rs.reduce((e, t) => (e[t] = {
  type: [Boolean, String, Number],
  default: !1
}, e), {}), Cm = rs.reduce((e, t) => {
  const n = "offset" + Wt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), Em = rs.reduce((e, t) => {
  const n = "order" + Wt(t);
  return e[n] = {
    type: [String, Number],
    default: null
  }, e;
}, {}), cc = {
  col: Object.keys(Sm),
  offset: Object.keys(Cm),
  order: Object.keys(Em)
};
function W_(e, t, n) {
  let o = e;
  if (!(n == null || n === !1)) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return e === "col" && (o = "v-" + o), e === "col" && (n === "" || n === !0) || (o += `-${n}`), o.toLowerCase();
  }
}
const q_ = ["auto", "start", "end", "center", "baseline", "stretch"], G_ = W({
  cols: {
    type: [Boolean, String, Number],
    default: !1
  },
  ...Sm,
  offset: {
    type: [String, Number],
    default: null
  },
  ...Cm,
  order: {
    type: [String, Number],
    default: null
  },
  ...Em,
  alignSelf: {
    type: String,
    default: null,
    validator: (e) => q_.includes(e)
  },
  ...Te(),
  ...Je()
}, "VCol"), Ie = de()({
  name: "VCol",
  props: G_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = b(() => {
      const i = [];
      let l;
      for (l in cc)
        cc[l].forEach((a) => {
          const r = e[a], f = W_(l, a, r);
          f && i.push(f);
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
      return lo(e.tag, {
        class: [o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), gr = ["start", "end", "center"], xm = ["space-between", "space-around", "space-evenly"];
function yr(e, t) {
  return rs.reduce((n, o) => {
    const i = e + Wt(o);
    return n[i] = t(), n;
  }, {});
}
const K_ = [...gr, "baseline", "stretch"], Vm = (e) => K_.includes(e), Nm = yr("align", () => ({
  type: String,
  default: null,
  validator: Vm
})), Y_ = [...gr, ...xm], Tm = (e) => Y_.includes(e), Om = yr("justify", () => ({
  type: String,
  default: null,
  validator: Tm
})), X_ = [...gr, ...xm, "stretch"], Im = (e) => X_.includes(e), Am = yr("alignContent", () => ({
  type: String,
  default: null,
  validator: Im
})), dc = {
  align: Object.keys(Nm),
  justify: Object.keys(Om),
  alignContent: Object.keys(Am)
}, J_ = {
  align: "align",
  justify: "justify",
  alignContent: "align-content"
};
function Z_(e, t, n) {
  let o = J_[e];
  if (n != null) {
    if (t) {
      const i = t.replace(e, "");
      o += `-${i}`;
    }
    return o += `-${n}`, o.toLowerCase();
  }
}
const Q_ = W({
  dense: Boolean,
  noGutters: Boolean,
  align: {
    type: String,
    default: null,
    validator: Vm
  },
  ...Nm,
  justify: {
    type: String,
    default: null,
    validator: Tm
  },
  ...Om,
  alignContent: {
    type: String,
    default: null,
    validator: Im
  },
  ...Am,
  ...Te(),
  ...Je()
}, "VRow"), It = de()({
  name: "VRow",
  props: Q_(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = b(() => {
      const i = [];
      let l;
      for (l in dc)
        dc[l].forEach((s) => {
          const a = e[s], r = Z_(l, s, a);
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
      return lo(e.tag, {
        class: ["v-row", o.value, e.class],
        style: e.style
      }, (i = n.default) == null ? void 0 : i.call(n));
    };
  }
}), yl = ls("v-spacer", "div", "VSpacer"), e0 = W({
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
}, "VCounter"), Pm = de()({
  name: "VCounter",
  functional: !0,
  props: e0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = b(() => e.max ? `${e.value} / ${e.max}` : String(e.value));
    return _e(() => c(vn, {
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
}), t0 = W({
  text: String,
  onClick: Ut(),
  ...Te(),
  ...tt()
}, "VLabel"), pr = de()({
  name: "VLabel",
  props: t0(),
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
}), n0 = W({
  floating: Boolean,
  ...Te()
}, "VFieldLabel"), sl = de()({
  name: "VFieldLabel",
  props: n0(),
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
function Dm(e) {
  const {
    t
  } = ss();
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
    }[i], s = e[`onClick:${i}`], a = s && l ? t(`$vuetify.input.${l}`, e.label ?? "") : void 0;
    return c(Pe, {
      icon: e[`${i}Icon`],
      "aria-label": a,
      onClick: s
    }, null);
  }
  return {
    InputIcon: n
  };
}
const br = W({
  focused: Boolean,
  "onUpdate:focused": Ut()
}, "focus");
function Yi(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn();
  const n = Ke(e, "focused"), o = b(() => ({
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
const o0 = ["underlined", "outlined", "filled", "solo", "solo-inverted", "solo-filled", "plain"], _r = W({
  appendInnerIcon: Ue,
  bgColor: String,
  clearable: Boolean,
  clearIcon: {
    type: Ue,
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
  prependInnerIcon: Ue,
  reverse: Boolean,
  singleLine: Boolean,
  variant: {
    type: String,
    default: "filled",
    validator: (e) => o0.includes(e)
  },
  "onClick:clear": Ut(),
  "onClick:appendInner": Ut(),
  "onClick:prependInner": Ut(),
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
      themeClasses: l
    } = vt(e), {
      loaderClasses: s
    } = ur(e), {
      focusClasses: a,
      isFocused: r,
      focus: f,
      blur: u
    } = Yi(e), {
      InputIcon: d
    } = Dm(e), {
      roundedClasses: m
    } = Tt(e), {
      rtlClasses: h
    } = Lt(), v = b(() => e.dirty || e.active), g = b(() => !e.singleLine && !!(e.label || i.label)), _ = on(), S = b(() => e.id || `input-${_}`), N = b(() => `${S.value}-messages`), A = le(), P = le(), x = le(), C = b(() => ["plain", "underlined"].includes(e.variant)), {
      backgroundColorClasses: $,
      backgroundColorStyles: V
    } = At(ae(e, "bgColor")), {
      textColorClasses: T,
      textColorStyles: D
    } = Ft(b(() => e.error || e.disabled ? void 0 : v.value && r.value ? e.color : e.baseColor));
    ke(v, (B) => {
      if (g.value) {
        const Z = A.value.$el, re = P.value.$el;
        requestAnimationFrame(() => {
          const ne = Qa(Z), X = re.getBoundingClientRect(), Ce = X.x - ne.x, G = X.y - ne.y - (ne.height / 2 - X.height / 2), Y = X.width / 0.75, te = Math.abs(Y - ne.width) > 1 ? {
            maxWidth: be(Y)
          } : void 0, Oe = getComputedStyle(Z), We = getComputedStyle(re), qe = parseFloat(Oe.transitionDuration) * 1e3 || 150, oe = parseFloat(We.getPropertyValue("--v-field-label-scale")), Ee = We.getPropertyValue("color");
          Z.style.visibility = "visible", re.style.visibility = "hidden", So(Z, {
            transform: `translate(${Ce}px, ${G}px) scale(${oe})`,
            color: Ee,
            ...te
          }, {
            duration: qe,
            easing: Vi,
            direction: B ? "normal" : "reverse"
          }).finished.then(() => {
            Z.style.removeProperty("visibility"), re.style.removeProperty("visibility");
          });
        });
      }
    }, {
      flush: "post"
    });
    const O = b(() => ({
      isActive: v,
      isFocused: r,
      controlRef: x,
      blur: u,
      focus: f
    }));
    function k(B) {
      B.target !== document.activeElement && B.preventDefault();
    }
    function I(B) {
      var Z;
      B.key !== "Enter" && B.key !== " " || (B.preventDefault(), B.stopPropagation(), (Z = e["onClick:clear"]) == null || Z.call(e, new MouseEvent("click")));
    }
    return _e(() => {
      var Ce, G, Y;
      const B = e.variant === "outlined", Z = !!(i["prepend-inner"] || e.prependInnerIcon), re = !!(e.clearable || i.clear), ne = !!(i["append-inner"] || e.appendInnerIcon || re), X = () => i.label ? i.label({
        ...O.value,
        label: e.label,
        props: {
          for: S.value
        }
      }) : e.label;
      return c("div", xe({
        class: ["v-field", {
          "v-field--active": v.value,
          "v-field--appended": ne,
          "v-field--center-affix": e.centerAffix ?? !C.value,
          "v-field--disabled": e.disabled,
          "v-field--dirty": e.dirty,
          "v-field--error": e.error,
          "v-field--flat": e.flat,
          "v-field--has-background": !!e.bgColor,
          "v-field--persistent-clear": e.persistentClear,
          "v-field--prepended": Z,
          "v-field--reverse": e.reverse,
          "v-field--single-line": e.singleLine,
          "v-field--no-label": !X(),
          [`v-field--variant-${e.variant}`]: !0
        }, l.value, $.value, a.value, s.value, m.value, h.value, e.class],
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
      }), Z && c("div", {
        key: "prepend",
        class: "v-field__prepend-inner"
      }, [e.prependInnerIcon && c(d, {
        key: "prepend-icon",
        name: "prependInner"
      }, null), (Ce = i["prepend-inner"]) == null ? void 0 : Ce.call(i, O.value)]), c("div", {
        class: "v-field__field",
        "data-no-activator": ""
      }, [["filled", "solo", "solo-inverted", "solo-filled"].includes(e.variant) && g.value && c(sl, {
        key: "floating-label",
        ref: P,
        class: [T.value],
        floating: !0,
        for: S.value,
        style: D.value
      }, {
        default: () => [X()]
      }), c(sl, {
        ref: A,
        for: S.value
      }, {
        default: () => [X()]
      }), (G = i.default) == null ? void 0 : G.call(i, {
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
              onKeydown: I,
              onFocus: f,
              onBlur: u,
              onClick: e["onClick:clear"]
            }
          }) : c(d, {
            name: "clear",
            onKeydown: I,
            onFocus: f,
            onBlur: u
          }, null)]
        })]), [[En, e.dirty]])]
      }), ne && c("div", {
        key: "append",
        class: "v-field__append-inner"
      }, [(Y = i["append-inner"]) == null ? void 0 : Y.call(i, O.value), e.appendInnerIcon && c(d, {
        key: "append-icon",
        name: "appendInner"
      }, null)]), c("div", {
        class: ["v-field__outline", T.value],
        style: D.value
      }, [B && c(Ve, null, [c("div", {
        class: "v-field__outline__start"
      }, null), g.value && c("div", {
        class: "v-field__outline__notch"
      }, [c(sl, {
        ref: P,
        floating: !0,
        for: S.value
      }, {
        default: () => [X()]
      })]), c("div", {
        class: "v-field__outline__end"
      }, null)]), C.value && g.value && c(sl, {
        ref: P,
        floating: !0,
        for: S.value
      }, {
        default: () => [X()]
      })])]);
    }), {
      controlRef: x
    };
  }
});
function $m(e) {
  const t = Object.keys(wr.props).filter((n) => !Xa(n) && n !== "class" && n !== "style");
  return uf(e, t);
}
const i0 = W({
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
}, "VMessages"), l0 = de()({
  name: "VMessages",
  props: i0(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = b(() => pn(e.messages)), {
      textColorClasses: i,
      textColorStyles: l
    } = Ft(b(() => e.color));
    return _e(() => c(vn, {
      transition: e.transition,
      tag: "div",
      class: ["v-messages", i.value, e.class],
      style: [l.value, e.style],
      role: "alert",
      "aria-live": "polite"
    }, {
      default: () => [e.active && o.value.map((s, a) => c("div", {
        class: "v-messages__message",
        key: `${a}-${o.value}`
      }, [n.message ? n.message({
        message: s
      }) : s]))]
    })), {};
  }
}), Mm = Symbol.for("vuetify:form"), s0 = W({
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
function a0(e) {
  const t = Ke(e, "modelValue"), n = b(() => e.disabled), o = b(() => e.readonly), i = we(!1), l = le([]), s = le([]);
  async function a() {
    const u = [];
    let d = !0;
    s.value = [], i.value = !0;
    for (const m of l.value) {
      const h = await m.validate();
      if (h.length > 0 && (d = !1, u.push({
        id: m.id,
        errorMessages: h
      })), !d && e.fastFail) break;
    }
    return s.value = u, i.value = !1, {
      valid: d,
      errors: s.value
    };
  }
  function r() {
    l.value.forEach((u) => u.reset());
  }
  function f() {
    l.value.forEach((u) => u.resetValidation());
  }
  return ke(l, () => {
    let u = 0, d = 0;
    const m = [];
    for (const h of l.value)
      h.isValid === !1 ? (d++, m.push({
        id: h.id,
        errorMessages: h.errorMessages
      })) : h.isValid === !0 && u++;
    s.value = m, t.value = d > 0 ? !1 : u === l.value.length ? !0 : null;
  }, {
    deep: !0,
    flush: "post"
  }), yt(Mm, {
    register: (u) => {
      let {
        id: d,
        vm: m,
        validate: h,
        reset: v,
        resetValidation: g
      } = u;
      l.value.some((_) => _.id === d) && bn(`Duplicate input name "${d}"`), l.value.push({
        id: d,
        validate: h,
        reset: v,
        resetValidation: g,
        vm: Xc(m),
        isValid: null,
        errorMessages: []
      });
    },
    unregister: (u) => {
      l.value = l.value.filter((d) => d.id !== u);
    },
    update: (u, d, m) => {
      const h = l.value.find((v) => v.id === u);
      h && (h.isValid = d, h.errorMessages = m);
    },
    isDisabled: n,
    isReadonly: o,
    isValidating: i,
    isValid: t,
    items: l,
    validateOn: ae(e, "validateOn")
  }), {
    errors: s,
    isDisabled: n,
    isReadonly: o,
    isValidating: i,
    isValid: t,
    items: l,
    validate: a,
    reset: r,
    resetValidation: f
  };
}
function r0() {
  return He(Mm, null);
}
const u0 = W({
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
function c0(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : xn(), n = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : on();
  const o = Ke(e, "modelValue"), i = b(() => e.validationValue === void 0 ? o.value : e.validationValue), l = r0(), s = le([]), a = we(!0), r = b(() => !!(pn(o.value === "" ? null : o.value).length || pn(i.value === "" ? null : i.value).length)), f = b(() => !!(e.disabled ?? (l == null ? void 0 : l.isDisabled.value))), u = b(() => !!(e.readonly ?? (l == null ? void 0 : l.isReadonly.value))), d = b(() => {
    var x;
    return (x = e.errorMessages) != null && x.length ? pn(e.errorMessages).concat(s.value).slice(0, Math.max(0, +e.maxErrors)) : s.value;
  }), m = b(() => {
    let x = (e.validateOn ?? (l == null ? void 0 : l.validateOn.value)) || "input";
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
    return e.error || (x = e.errorMessages) != null && x.length ? !1 : e.rules.length ? a.value ? s.value.length || m.value.lazy ? null : !0 : !s.value.length : !0;
  }), v = we(!1), g = b(() => ({
    [`${t}--error`]: h.value === !1,
    [`${t}--dirty`]: r.value,
    [`${t}--disabled`]: f.value,
    [`${t}--readonly`]: u.value
  })), _ = it("validation"), S = b(() => e.name ?? fn(n));
  Fa(() => {
    l == null || l.register({
      id: S.value,
      vm: _,
      validate: P,
      reset: N,
      resetValidation: A
    });
  }), wt(() => {
    l == null || l.unregister(S.value);
  }), Cn(async () => {
    m.value.lazy || await P(!m.value.eager), l == null || l.update(S.value, h.value, d.value);
  }), oo(() => m.value.input || m.value.invalidInput && h.value === !1, () => {
    ke(i, () => {
      if (i.value != null)
        P();
      else if (e.focused) {
        const x = ke(() => e.focused, (C) => {
          C || P(), x();
        });
      }
    });
  }), oo(() => m.value.blur, () => {
    ke(() => e.focused, (x) => {
      x || P();
    });
  }), ke([h, d], () => {
    l == null || l.update(S.value, h.value, d.value);
  });
  async function N() {
    o.value = null, await at(), await A();
  }
  async function A() {
    a.value = !0, m.value.lazy ? s.value = [] : await P(!m.value.eager);
  }
  async function P() {
    let x = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : !1;
    const C = [];
    v.value = !0;
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
    return s.value = C, v.value = !1, a.value = x, s.value;
  }
  return {
    errorMessages: d,
    isDirty: r,
    isDisabled: f,
    isReadonly: u,
    isPristine: a,
    isValid: h,
    isValidating: v,
    reset: N,
    resetValidation: A,
    validate: P,
    validationClasses: g
  };
}
const Xi = W({
  id: String,
  appendIcon: Ue,
  centerAffix: {
    type: Boolean,
    default: !0
  },
  prependIcon: Ue,
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
  "onClick:prepend": Ut(),
  "onClick:append": Ut(),
  ...Te(),
  ...Gt(),
  ...Py(zn(), ["maxWidth", "minWidth", "width"]),
  ...tt(),
  ...u0()
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
      densityClasses: l
    } = ln(e), {
      dimensionStyles: s
    } = Un(e), {
      themeClasses: a
    } = vt(e), {
      rtlClasses: r
    } = Lt(), {
      InputIcon: f
    } = Dm(e), u = on(), d = b(() => e.id || `input-${u}`), m = b(() => `${d.value}-messages`), {
      errorMessages: h,
      isDirty: v,
      isDisabled: g,
      isReadonly: _,
      isPristine: S,
      isValid: N,
      isValidating: A,
      reset: P,
      resetValidation: x,
      validate: C,
      validationClasses: $
    } = c0(e, "v-input", d), V = b(() => ({
      id: d,
      messagesId: m,
      isDirty: v,
      isDisabled: g,
      isReadonly: _,
      isPristine: S,
      isValid: N,
      isValidating: A,
      reset: P,
      resetValidation: x,
      validate: C
    })), T = b(() => {
      var D;
      return (D = e.errorMessages) != null && D.length || !S.value && h.value.length ? h.value : e.hint && (e.persistentHint || e.focused) ? e.hint : e.messages;
    });
    return _e(() => {
      var B, Z, re, ne;
      const D = !!(o.prepend || e.prependIcon), O = !!(o.append || e.appendIcon), k = T.value.length > 0, I = !e.hideDetails || e.hideDetails === "auto" && (k || !!o.details);
      return c("div", {
        class: ["v-input", `v-input--${e.direction}`, {
          "v-input--center-affix": e.centerAffix,
          "v-input--hide-spin-buttons": e.hideSpinButtons
        }, l.value, a.value, r.value, $.value, e.class],
        style: [s.value, e.style]
      }, [D && c("div", {
        key: "prepend",
        class: "v-input__prepend"
      }, [(B = o.prepend) == null ? void 0 : B.call(o, V.value), e.prependIcon && c(f, {
        key: "prepend-icon",
        name: "prepend"
      }, null)]), o.default && c("div", {
        class: "v-input__control"
      }, [(Z = o.default) == null ? void 0 : Z.call(o, V.value)]), O && c("div", {
        key: "append",
        class: "v-input__append"
      }, [e.appendIcon && c(f, {
        key: "append-icon",
        name: "append"
      }, null), (re = o.append) == null ? void 0 : re.call(o, V.value)]), I && c("div", {
        class: "v-input__details"
      }, [c(l0, {
        id: m.value,
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
}), Ms = Symbol("Forwarded refs");
function Fs(e, t) {
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
  return e[Ms] = n, new Proxy(e, {
    get(i, l) {
      if (Reflect.has(i, l))
        return Reflect.get(i, l);
      if (!(typeof l == "symbol" || l.startsWith("$") || l.startsWith("__"))) {
        for (const s of n)
          if (s.value && Reflect.has(s.value, l)) {
            const a = Reflect.get(s.value, l);
            return typeof a == "function" ? a.bind(s.value) : a;
          }
      }
    },
    has(i, l) {
      if (Reflect.has(i, l))
        return !0;
      if (typeof l == "symbol" || l.startsWith("$") || l.startsWith("__")) return !1;
      for (const s of n)
        if (s.value && Reflect.has(s.value, l))
          return !0;
      return !1;
    },
    set(i, l, s) {
      if (Reflect.has(i, l))
        return Reflect.set(i, l, s);
      if (typeof l == "symbol" || l.startsWith("$") || l.startsWith("__")) return !1;
      for (const a of n)
        if (a.value && Reflect.has(a.value, l))
          return Reflect.set(a.value, l, s);
      return !1;
    },
    getOwnPropertyDescriptor(i, l) {
      var a;
      const s = Reflect.getOwnPropertyDescriptor(i, l);
      if (s) return s;
      if (!(typeof l == "symbol" || l.startsWith("$") || l.startsWith("__"))) {
        for (const r of n) {
          if (!r.value) continue;
          const f = Fs(r.value, l) ?? ("_" in r.value ? Fs((a = r.value._) == null ? void 0 : a.setupState, l) : void 0);
          if (f) return f;
        }
        for (const r of n) {
          const f = r.value && r.value[Ms];
          if (!f) continue;
          const u = f.slice();
          for (; u.length; ) {
            const d = u.shift(), m = Fs(d.value, l);
            if (m) return m;
            const h = d.value && d.value[Ms];
            h && u.push(...h);
          }
        }
      }
    }
  });
}
const d0 = ["color", "file", "time", "date", "datetime-local", "week", "month"], f0 = W({
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
}, "VTextField"), Yt = de()({
  name: "VTextField",
  directives: {
    Intersect: fr
  },
  inheritAttrs: !1,
  props: f0(),
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
    const l = Ke(e, "modelValue"), {
      isFocused: s,
      focus: a,
      blur: r
    } = Yi(e), f = b(() => typeof e.counterValue == "function" ? e.counterValue(l.value) : typeof e.counterValue == "number" ? e.counterValue : (l.value ?? "").toString().length), u = b(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    }), d = b(() => ["plain", "underlined"].includes(e.variant));
    function m(C, $) {
      var V, T;
      !e.autofocus || !C || (T = (V = $[0].target) == null ? void 0 : V.focus) == null || T.call(V);
    }
    const h = le(), v = le(), g = le(), _ = b(() => d0.includes(e.type) || e.persistentPlaceholder || s.value || e.active);
    function S() {
      var C;
      g.value !== document.activeElement && ((C = g.value) == null || C.focus()), s.value || a();
    }
    function N(C) {
      o("mousedown:control", C), C.target !== g.value && (S(), C.preventDefault());
    }
    function A(C) {
      S(), o("click:control", C);
    }
    function P(C) {
      C.stopPropagation(), S(), at(() => {
        l.value = null, mf(e["onClick:clear"], C);
      });
    }
    function x(C) {
      var V;
      const $ = C.target;
      if (l.value = $.value, (V = e.modelModifiers) != null && V.trim && ["text", "search", "password", "tel", "url"].includes(e.type)) {
        const T = [$.selectionStart, $.selectionEnd];
        at(() => {
          $.selectionStart = T[0], $.selectionEnd = T[1];
        });
      }
    }
    return _e(() => {
      const C = !!(i.counter || e.counter !== !1 && e.counter != null), $ = !!(C || i.details), [V, T] = is(n), {
        modelValue: D,
        ...O
      } = io.filterProps(e), k = $m(e);
      return c(io, xe({
        ref: h,
        modelValue: l.value,
        "onUpdate:modelValue": (I) => l.value = I,
        class: ["v-text-field", {
          "v-text-field--prefixed": e.prefix,
          "v-text-field--suffixed": e.suffix,
          "v-input--plain-underlined": d.value
        }, e.class],
        style: e.style
      }, V, O, {
        centerAffix: !d.value,
        focused: s.value
      }), {
        ...i,
        default: (I) => {
          let {
            id: B,
            isDisabled: Z,
            isDirty: re,
            isReadonly: ne,
            isValid: X
          } = I;
          return c(wr, xe({
            ref: v,
            onMousedown: N,
            onClick: A,
            "onClick:clear": P,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"],
            role: e.role
          }, k, {
            id: B.value,
            active: _.value || re.value,
            dirty: re.value || e.dirty,
            disabled: Z.value,
            focused: s.value,
            error: X.value === !1
          }), {
            ...i,
            default: (Ce) => {
              let {
                props: {
                  class: G,
                  ...Y
                }
              } = Ce;
              const te = rt(c("input", xe({
                ref: g,
                value: l.value,
                onInput: x,
                autofocus: e.autofocus,
                readonly: ne.value,
                disabled: Z.value,
                name: e.name,
                placeholder: e.placeholder,
                size: 1,
                type: e.type,
                onFocus: S,
                onBlur: r
              }, Y, T), null), [[Rn("intersect"), {
                handler: m
              }, null, {
                once: !0
              }]]);
              return c(Ve, null, [e.prefix && c("span", {
                class: "v-text-field__prefix"
              }, [c("span", {
                class: "v-text-field__prefix__text"
              }, [e.prefix])]), i.default ? c("div", {
                class: G,
                "data-no-activator": ""
              }, [i.default(), te]) : tn(te, {
                class: G
              }), e.suffix && c("span", {
                class: "v-text-field__suffix"
              }, [c("span", {
                class: "v-text-field__suffix__text"
              }, [e.suffix])])]);
            }
          });
        },
        details: $ ? (I) => {
          var B;
          return c(Ve, null, [(B = i.details) == null ? void 0 : B.call(i, I), C && c(Ve, null, [c("span", null, null), c(Pm, {
            active: e.persistentCounter || s.value,
            value: f.value,
            max: u.value,
            disabled: e.disabled
          }, i.counter)])]);
        } : void 0
      });
    }), ii({}, h, v, g);
  }
}), m0 = {
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
function v0(e, t, n, o, i, l) {
  return ee(), ve(Ct, null, {
    default: p(() => [
      c(It, null, {
        default: p(() => [
          c(Ie, {
            offset: "2",
            cols: "8",
            class: "text-center"
          }, {
            default: p(() => t[4] || (t[4] = [
              se("h4", { class: "mt-3" }, "评论列表", -1)
            ])),
            _: 1
          }),
          c(Ie, { cols: "2" }, {
            default: p(() => [
              c(ce, {
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
      c(Jt),
      n.comments.length == 0 ? (ee(), ve(wn, {
        key: 0,
        density: "compact"
      }, {
        default: p(() => [
          c(Fe, { class: "my-4" }, {
            default: p(() => [
              c(Ki, { class: "text-center" }, {
                default: p(() => t[5] || (t[5] = [
                  U("尚未有人发表评论")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : (ee(), ve(wn, {
        key: 1,
        id: "book-comments",
        density: "compact"
      }, {
        default: p(() => [
          (ee(!0), Ze(Ve, null, Qt(n.comments, (s) => (ee(), ve(Fe, {
            class: "pr-0 align-self-start mb-4",
            "prepend-avatar": s.avatar,
            "append-icon": "mdi-thumb-up",
            subtitle: s.nickName
          }, {
            prepend: p(() => [
              c(hn, {
                variant: "outlined",
                size: "large",
                color: "grey",
                class: "text-center",
                icon: s.avatar
              }, null, 8, ["icon"])
            ]),
            append: p(() => [
              c(ce, {
                class: "px-0",
                size: "small",
                variant: "plain",
                stacked: "",
                "prepend-icon": "mdi-thumb-up",
                title: "点赞"
              }, {
                default: p(() => [
                  U(Ne(s.likeCount), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            default: p(() => [
              U(Ne(s.content) + " ", 1),
              c(hs, null, {
                default: p(() => [
                  U(Ne(s.level) + "楼 * " + Ne(s.createTime) + " * " + Ne(s.geo), 1)
                ]),
                _: 2
              }, 1024)
            ]),
            _: 2
          }, 1032, ["prepend-avatar", "subtitle"]))), 256))
        ]),
        _: 1
      })),
      c(_n, { class: "my-2 py-0 px-2" }, {
        default: p(() => [
          n.login ? (ee(), ve(It, { key: 1 }, {
            default: p(() => [
              c(Ie, { cols: "9" }, {
                default: p(() => [
                  c(Yt, {
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
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ce, {
                    onClick: t[3] || (t[3] = (s) => e.$emit("add_review", this.content))
                  }, {
                    default: p(() => t[7] || (t[7] = [
                      U("发表")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (ee(), ve(ce, {
            key: 0,
            onClick: t[1] || (t[1] = (s) => e.$emit("login")),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: p(() => t[6] || (t[6] = [
              U("点击登录，发表评论")
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
const Fm = /* @__PURE__ */ Vn(m0, [["render", v0]]);
function Bs(e, t) {
  return {
    x: e.x + t.x,
    y: e.y + t.y
  };
}
function h0(e, t) {
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
    } = e, i = o === "left" ? 0 : o === "center" ? t.width / 2 : o === "right" ? t.width : o, l = n === "top" ? 0 : n === "bottom" ? t.height : n;
    return Bs({
      x: i,
      y: l
    }, t);
  } else if (e.side === "left" || e.side === "right") {
    const {
      side: n,
      align: o
    } = e, i = n === "left" ? 0 : n === "right" ? t.width : n, l = o === "top" ? 0 : o === "center" ? t.height / 2 : o === "bottom" ? t.height : o;
    return Bs({
      x: i,
      y: l
    }, t);
  }
  return Bs({
    x: t.width / 2,
    y: t.height / 2
  }, t);
}
const Bm = {
  static: p0,
  // specific viewport position, usually centered
  connected: _0
  // connected to a certain element
}, g0 = W({
  locationStrategy: {
    type: [String, Function],
    default: "static",
    validator: (e) => typeof e == "function" || e in Bm
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
function y0(e, t) {
  const n = le({}), o = le();
  Ge && oo(() => !!(t.isActive.value && e.locationStrategy), (l) => {
    var s, a;
    ke(() => e.locationStrategy, l), Bt(() => {
      window.removeEventListener("resize", i), o.value = void 0;
    }), window.addEventListener("resize", i, {
      passive: !0
    }), typeof e.locationStrategy == "function" ? o.value = (s = e.locationStrategy(t, e, n)) == null ? void 0 : s.updateLocation : o.value = (a = Bm[e.locationStrategy](t, e, n)) == null ? void 0 : a.updateLocation;
  });
  function i(l) {
    var s;
    (s = o.value) == null || s.call(o, l);
  }
  return {
    contentStyles: n,
    updateLocation: o
  };
}
function p0() {
}
function b0(e, t) {
  const n = Qa(e);
  return t ? n.x += parseFloat(e.style.right || 0) : n.x -= parseFloat(e.style.left || 0), n.y -= parseFloat(e.style.top || 0), n;
}
function _0(e, t, n) {
  (Array.isArray(e.target.value) || yp(e.target.value)) && Object.assign(n.value, {
    position: "fixed",
    top: 0,
    [e.isRtl.value ? "right" : "left"]: 0
  });
  const {
    preferredAnchor: i,
    preferredOrigin: l
  } = Ja(() => {
    const v = ua(t.location, e.isRtl.value), g = t.origin === "overlap" ? v : t.origin === "auto" ? Is(v) : ua(t.origin, e.isRtl.value);
    return v.side === g.side && v.align === As(g).align ? {
      preferredAnchor: Ou(v),
      preferredOrigin: Ou(g)
    } : {
      preferredAnchor: v,
      preferredOrigin: g
    };
  }), [s, a, r, f] = ["minWidth", "minHeight", "maxWidth", "maxHeight"].map((v) => b(() => {
    const g = parseFloat(t[v]);
    return isNaN(g) ? 1 / 0 : g;
  })), u = b(() => {
    if (Array.isArray(t.offset))
      return t.offset;
    if (typeof t.offset == "string") {
      const v = t.offset.split(" ").map(parseFloat);
      return v.length < 2 && v.push(0), v;
    }
    return typeof t.offset == "number" ? [t.offset, 0] : [0, 0];
  });
  let d = !1;
  const m = new ResizeObserver(() => {
    d && h();
  });
  ke([e.target, e.contentEl], (v, g) => {
    let [_, S] = v, [N, A] = g;
    N && !Array.isArray(N) && m.unobserve(N), _ && !Array.isArray(_) && m.observe(_), A && m.unobserve(A), S && m.observe(S);
  }, {
    immediate: !0
  }), Bt(() => {
    m.disconnect();
  });
  function h() {
    if (d = !1, requestAnimationFrame(() => d = !0), !e.target.value || !e.contentEl.value) return;
    const v = yf(e.target.value), g = b0(e.contentEl.value, e.isRtl.value), _ = Bl(e.contentEl.value), S = 12;
    _.length || (_.push(document.documentElement), e.contentEl.value.style.top && e.contentEl.value.style.left || (g.x -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-x") || 0), g.y -= parseFloat(document.documentElement.style.getPropertyValue("--v-body-scroll-y") || 0)));
    const N = _.reduce((O, k) => {
      const I = k.getBoundingClientRect(), B = new Io({
        x: k === document.documentElement ? 0 : I.x,
        y: k === document.documentElement ? 0 : I.y,
        width: k.clientWidth,
        height: k.clientHeight
      });
      return O ? new Io({
        x: Math.max(O.left, B.left),
        y: Math.max(O.top, B.top),
        width: Math.min(O.right, B.right) - Math.max(O.left, B.left),
        height: Math.min(O.bottom, B.bottom) - Math.max(O.top, B.top)
      }) : B;
    }, void 0);
    N.x += S, N.y += S, N.width -= S * 2, N.height -= S * 2;
    let A = {
      anchor: i.value,
      origin: l.value
    };
    function P(O) {
      const k = new Io(g), I = fc(O.anchor, v), B = fc(O.origin, k);
      let {
        x: Z,
        y: re
      } = h0(I, B);
      switch (O.anchor.side) {
        case "top":
          re -= u.value[0];
          break;
        case "bottom":
          re += u.value[0];
          break;
        case "left":
          Z -= u.value[0];
          break;
        case "right":
          Z += u.value[0];
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
          Z -= u.value[1];
          break;
        case "right":
          Z += u.value[1];
          break;
      }
      return k.x += Z, k.y += re, k.width = Math.min(k.width, r.value), k.height = Math.min(k.height, f.value), {
        overflows: Au(k, N),
        x: Z,
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
        Ml("Infinite loop detected in connectedLocationStrategy");
        break;
      }
      const {
        x: O,
        y: k,
        overflows: I
      } = P(A);
      x += O, C += k, g.x += O, g.y += k;
      {
        const B = Iu(A.anchor), Z = I.x.before || I.x.after, re = I.y.before || I.y.after;
        let ne = !1;
        if (["x", "y"].forEach((X) => {
          if (X === "x" && Z && !V.x || X === "y" && re && !V.y) {
            const Ce = {
              anchor: {
                ...A.anchor
              },
              origin: {
                ...A.origin
              }
            }, G = X === "x" ? B === "y" ? As : Is : B === "y" ? Is : As;
            Ce.anchor = G(Ce.anchor), Ce.origin = G(Ce.origin);
            const {
              overflows: Y
            } = P(Ce);
            (Y[X].before <= I[X].before && Y[X].after <= I[X].after || Y[X].before + Y[X].after < (I[X].before + I[X].after) / 2) && (A = Ce, ne = V[X] = !0);
          }
        }), ne) continue;
      }
      I.x.before && (x += I.x.before, g.x += I.x.before), I.x.after && (x -= I.x.after, g.x -= I.x.after), I.y.before && (C += I.y.before, g.y += I.y.before), I.y.after && (C -= I.y.after, g.y -= I.y.after);
      {
        const B = Au(g, N);
        $.x = N.width - B.x.before - B.x.after, $.y = N.height - B.y.before - B.y.after, x += B.x.before, g.x += B.x.before, C += B.y.before, g.y += B.y.before;
      }
      break;
    }
    const D = Iu(A.anchor);
    return Object.assign(n.value, {
      "--v-overlay-anchor-origin": `${A.anchor.side} ${A.anchor.align}`,
      transformOrigin: `${A.origin.side} ${A.origin.align}`,
      // transform: `translate(${pixelRound(x)}px, ${pixelRound(y)}px)`,
      top: be(Ls(C)),
      left: e.isRtl.value ? void 0 : be(Ls(x)),
      right: e.isRtl.value ? be(Ls(-x)) : void 0,
      minWidth: be(D === "y" ? Math.min(s.value, v.width) : s.value),
      maxWidth: be(mc(Sn($.x, s.value === 1 / 0 ? 0 : s.value, r.value))),
      maxHeight: be(mc(Sn($.y, a.value === 1 / 0 ? 0 : a.value, f.value)))
    }), {
      available: $,
      contentBox: g
    };
  }
  return ke(() => [i.value, l.value, t.offset, t.minWidth, t.minHeight, t.maxWidth, t.maxHeight], () => h()), at(() => {
    const v = h();
    if (!v) return;
    const {
      available: g,
      contentBox: _
    } = v;
    _.height > g.y && requestAnimationFrame(() => {
      h(), requestAnimationFrame(() => {
        h();
      });
    });
  }), {
    updateLocation: h
  };
}
function Ls(e) {
  return Math.round(e * devicePixelRatio) / devicePixelRatio;
}
function mc(e) {
  return Math.ceil(e * devicePixelRatio) / devicePixelRatio;
}
let ya = !0;
const Wl = [];
function w0(e) {
  !ya || Wl.length ? (Wl.push(e), pa()) : (ya = !1, e(), pa());
}
let vc = -1;
function pa() {
  cancelAnimationFrame(vc), vc = requestAnimationFrame(() => {
    const e = Wl.shift();
    e && e(), Wl.length ? pa() : ya = !0;
  });
}
const pl = {
  none: null,
  close: C0,
  block: E0,
  reposition: x0
}, k0 = W({
  scrollStrategy: {
    type: [String, Function],
    default: "block",
    validator: (e) => typeof e == "function" || e in pl
  }
}, "VOverlay-scroll-strategies");
function S0(e, t) {
  if (!Ge) return;
  let n;
  nn(async () => {
    n == null || n.stop(), t.isActive.value && e.scrollStrategy && (n = Va(), await new Promise((o) => setTimeout(o)), n.active && n.run(() => {
      var o;
      typeof e.scrollStrategy == "function" ? e.scrollStrategy(t, e, n) : (o = pl[e.scrollStrategy]) == null || o.call(pl, t, e, n);
    }));
  }), Bt(() => {
    n == null || n.stop();
  });
}
function C0(e) {
  function t(n) {
    e.isActive.value = !1;
  }
  Lm(e.targetEl.value ?? e.contentEl.value, t);
}
function E0(e, t) {
  var s;
  const n = (s = e.root.value) == null ? void 0 : s.offsetParent, o = [.../* @__PURE__ */ new Set([...Bl(e.targetEl.value, t.contained ? n : void 0), ...Bl(e.contentEl.value, t.contained ? n : void 0)])].filter((a) => !a.classList.contains("v-overlay-scroll-blocked")), i = window.innerWidth - document.documentElement.offsetWidth, l = ((a) => nr(a) && a)(n || document.documentElement);
  l && e.root.value.classList.add("v-overlay--scroll-blocked"), o.forEach((a, r) => {
    a.style.setProperty("--v-body-scroll-x", be(-a.scrollLeft)), a.style.setProperty("--v-body-scroll-y", be(-a.scrollTop)), a !== document.documentElement && a.style.setProperty("--v-scrollbar-offset", be(i)), a.classList.add("v-overlay-scroll-blocked");
  }), Bt(() => {
    o.forEach((a, r) => {
      const f = parseFloat(a.style.getPropertyValue("--v-body-scroll-x")), u = parseFloat(a.style.getPropertyValue("--v-body-scroll-y")), d = a.style.scrollBehavior;
      a.style.scrollBehavior = "auto", a.style.removeProperty("--v-body-scroll-x"), a.style.removeProperty("--v-body-scroll-y"), a.style.removeProperty("--v-scrollbar-offset"), a.classList.remove("v-overlay-scroll-blocked"), a.scrollLeft = -f, a.scrollTop = -u, a.style.scrollBehavior = d;
    }), l && e.root.value.classList.remove("v-overlay--scroll-blocked");
  });
}
function x0(e, t, n) {
  let o = !1, i = -1, l = -1;
  function s(a) {
    w0(() => {
      var u, d;
      const r = performance.now();
      (d = (u = e.updateLocation).value) == null || d.call(u, a), o = (performance.now() - r) / (1e3 / 60) > 2;
    });
  }
  l = (typeof requestIdleCallback > "u" ? (a) => a() : requestIdleCallback)(() => {
    n.run(() => {
      Lm(e.targetEl.value ?? e.contentEl.value, (a) => {
        o ? (cancelAnimationFrame(i), i = requestAnimationFrame(() => {
          i = requestAnimationFrame(() => {
            s(a);
          });
        })) : s(a);
      });
    });
  }), Bt(() => {
    typeof cancelIdleCallback < "u" && cancelIdleCallback(l), cancelAnimationFrame(i);
  });
}
function Lm(e, t) {
  const n = [document, ...Bl(e)];
  n.forEach((o) => {
    o.addEventListener("scroll", t, {
      passive: !0
    });
  }), Bt(() => {
    n.forEach((o) => {
      o.removeEventListener("scroll", t);
    });
  });
}
const V0 = Symbol.for("vuetify:v-menu"), N0 = W({
  closeDelay: [Number, String],
  openDelay: [Number, String]
}, "delay");
function T0(e, t) {
  let n = () => {
  };
  function o(s) {
    n == null || n();
    const a = Number(s ? e.openDelay : e.closeDelay);
    return new Promise((r) => {
      n = Fy(a, () => {
        t == null || t(s), r(s);
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
const O0 = W({
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
  ...N0()
}, "VOverlay-activator");
function I0(e, t) {
  let {
    isActive: n,
    isTop: o,
    contentEl: i
  } = t;
  const l = it("useActivator"), s = le();
  let a = !1, r = !1, f = !0;
  const u = b(() => e.openOnFocus || e.openOnFocus == null && e.openOnHover), d = b(() => e.openOnClick || e.openOnClick == null && !e.openOnHover && !u.value), {
    runOpenDelay: m,
    runCloseDelay: h
  } = T0(e, (V) => {
    V === (e.openOnHover && a || u.value && r) && !(e.openOnHover && n.value && !o.value) && (n.value !== V && (f = !0), n.value = V);
  }), v = le(), g = {
    onClick: (V) => {
      V.stopPropagation(), s.value = V.currentTarget || V.target, n.value || (v.value = [V.clientX, V.clientY]), n.value = !n.value;
    },
    onMouseenter: (V) => {
      var T;
      (T = V.sourceCapabilities) != null && T.firesTouchEvents || (a = !0, s.value = V.currentTarget || V.target, m());
    },
    onMouseleave: (V) => {
      a = !1, h();
    },
    onFocus: (V) => {
      hf(V.target, ":focus-visible") !== !1 && (r = !0, V.stopPropagation(), s.value = V.currentTarget || V.target, m());
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
      a = !0, m();
    }, V.onMouseleave = () => {
      a = !1, h();
    }), u.value && (V.onFocusin = () => {
      r = !0, m();
    }, V.onFocusout = () => {
      r = !1, h();
    }), e.closeOnContentClick) {
      const T = He(V0, null);
      V.onClick = () => {
        n.value = !1, T == null || T.closeParents();
      };
    }
    return V;
  }), N = b(() => {
    const V = {};
    return e.openOnHover && (V.onMouseenter = () => {
      f && (a = !0, f = !1, m());
    }, V.onMouseleave = () => {
      a = !1, h();
    }), V;
  });
  ke(o, (V) => {
    var T;
    V && (e.openOnHover && !a && (!u.value || !r) || u.value && !r && (!e.openOnHover || !a)) && !((T = i.value) != null && T.contains(document.activeElement)) && (n.value = !1);
  }), ke(n, (V) => {
    V || setTimeout(() => {
      v.value = void 0;
    });
  }, {
    flush: "post"
  });
  const A = ra();
  nn(() => {
    A.value && at(() => {
      s.value = A.el;
    });
  });
  const P = ra(), x = b(() => e.target === "cursor" && v.value ? v.value : P.value ? P.el : Rm(e.target, l) || s.value), C = b(() => Array.isArray(x.value) ? void 0 : x.value);
  let $;
  return ke(() => !!e.activator, (V) => {
    V && Ge ? ($ = Va(), $.run(() => {
      A0(e, l, {
        activatorEl: s,
        activatorEvents: _
      });
    })) : $ && $.stop();
  }, {
    flush: "post",
    immediate: !0
  }), Bt(() => {
    $ == null || $.stop();
  }), {
    activatorEl: s,
    activatorRef: A,
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
      u && s(u);
    }
    r && at(() => l());
  }, {
    immediate: !0
  }), ke(() => e.activatorProps, () => {
    l();
  }), Bt(() => {
    s();
  });
  function l() {
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : a(), f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    r && Ly(r, xe(i.value, f));
  }
  function s() {
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : a(), f = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : e.activatorProps;
    r && Ry(r, xe(i.value, f));
  }
  function a() {
    let r = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : e.activator;
    const f = Rm(r, t);
    return o.value = (f == null ? void 0 : f.nodeType) === Node.ELEMENT_NODE ? f : void 0, o.value;
  }
}
function Rm(e, t) {
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
function P0() {
  if (!Ge) return we(!1);
  const {
    ssr: e
  } = If();
  if (e) {
    const t = we(!1);
    return Cn(() => {
      t.value = !0;
    }), t;
  } else
    return we(!0);
}
const Hm = W({
  eager: Boolean
}, "lazy");
function jm(e, t) {
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
function gs() {
  const t = it("useScopeId").vnode.scopeId;
  return {
    scopeId: t ? {
      [t]: ""
    } : void 0
  };
}
const hc = Symbol.for("vuetify:stack"), ci = ht([]);
function D0(e, t, n) {
  const o = it("useStack"), i = !n, l = He(hc, void 0), s = ht({
    activeChildren: /* @__PURE__ */ new Set()
  });
  yt(hc, s);
  const a = we(+t.value);
  oo(e, () => {
    var d;
    const u = (d = ci.at(-1)) == null ? void 0 : d[1];
    a.value = u ? u + 10 : +t.value, i && ci.push([o.uid, a.value]), l == null || l.activeChildren.add(o.uid), Bt(() => {
      if (i) {
        const m = fe(ci).findIndex((h) => h[0] === o.uid);
        ci.splice(m, 1);
      }
      l == null || l.activeChildren.delete(o.uid);
    });
  });
  const r = we(!0);
  i && nn(() => {
    var d;
    const u = ((d = ci.at(-1)) == null ? void 0 : d[0]) === o.uid;
    setTimeout(() => r.value = u);
  });
  const f = b(() => !s.activeChildren.size);
  return {
    globalTop: Bi(r),
    localTop: f,
    stackStyles: b(() => ({
      zIndex: a.value
    }))
  };
}
function $0(e) {
  return {
    teleportTarget: b(() => {
      const n = e();
      if (n === !0 || !Ge) return;
      const o = n === !1 ? document.body : typeof n == "string" ? document.querySelector(n) : n;
      if (o == null) {
        Vt(`Unable to locate target ${n}`);
        return;
      }
      let i = [...o.children].find((l) => l.matches(".v-overlay-container"));
      return i || (i = document.createElement("div"), i.className = "v-overlay-container", o.appendChild(i)), i;
    })
  };
}
function M0() {
  return !0;
}
function zm(e, t, n) {
  if (!e || Um(e, n) === !1) return !1;
  const o = Cf(t);
  if (typeof ShadowRoot < "u" && o instanceof ShadowRoot && o.host === e.target) return !1;
  const i = (typeof n.value == "object" && n.value.include || (() => []))();
  return i.push(t), !i.some((l) => l == null ? void 0 : l.contains(e.target));
}
function Um(e, t) {
  return (typeof t.value == "object" && t.value.closeConditional || M0)(e);
}
function F0(e, t, n) {
  const o = typeof n.value == "function" ? n.value : n.value.handler;
  e.shadowTarget = e.target, t._clickOutside.lastMousedownWasOutside && zm(e, t, n) && setTimeout(() => {
    Um(e, n) && o && o(e);
  }, 0);
}
function gc(e, t) {
  const n = Cf(e);
  t(document), typeof ShadowRoot < "u" && n instanceof ShadowRoot && t(n);
}
const B0 = {
  // [data-app] may not be found
  // if using bind, inserted makes
  // sure that the root element is
  // available, iOS does not support
  // clicks on body
  mounted(e, t) {
    const n = (i) => F0(i, e, t), o = (i) => {
      e._clickOutside.lastMousedownWasOutside = zm(i, e, t);
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
function L0(e) {
  const {
    modelValue: t,
    color: n,
    ...o
  } = e;
  return c($o, {
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
  ...O0(),
  ...Te(),
  ...zn(),
  ...Hm(),
  ...g0(),
  ...k0(),
  ...tt(),
  ...qi()
}, "VOverlay"), Pi = de()({
  name: "VOverlay",
  directives: {
    ClickOutside: B0
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
    const l = it("VOverlay"), s = le(), a = le(), r = le(), f = Ke(e, "modelValue"), u = b({
      get: () => f.value,
      set: (oe) => {
        oe && e.disabled || (f.value = oe);
      }
    }), {
      themeClasses: d
    } = vt(e), {
      rtlClasses: m,
      isRtl: h
    } = Lt(), {
      hasContent: v,
      onAfterLeave: g
    } = jm(e, u), _ = At(b(() => typeof e.scrim == "string" ? e.scrim : null)), {
      globalTop: S,
      localTop: N,
      stackStyles: A
    } = D0(u, ae(e, "zIndex"), e._disableGlobalStack), {
      activatorEl: P,
      activatorRef: x,
      target: C,
      targetEl: $,
      targetRef: V,
      activatorEvents: T,
      contentEvents: D,
      scrimEvents: O
    } = I0(e, {
      isActive: u,
      isTop: N,
      contentEl: r
    }), {
      teleportTarget: k
    } = $0(() => {
      var Re, nt, Qe;
      const oe = e.attach || e.contained;
      if (oe) return oe;
      const Ee = ((Re = P == null ? void 0 : P.value) == null ? void 0 : Re.getRootNode()) || ((Qe = (nt = l.proxy) == null ? void 0 : nt.$el) == null ? void 0 : Qe.getRootNode());
      return Ee instanceof ShadowRoot ? Ee : !1;
    }), {
      dimensionStyles: I
    } = Un(e), B = P0(), {
      scopeId: Z
    } = gs();
    ke(() => e.disabled, (oe) => {
      oe && (u.value = !1);
    });
    const {
      contentStyles: re,
      updateLocation: ne
    } = y0(e, {
      isRtl: h,
      contentEl: r,
      target: C,
      isActive: u
    });
    S0(e, {
      root: s,
      contentEl: r,
      targetEl: $,
      isActive: u,
      updateLocation: ne
    });
    function X(oe) {
      i("click:outside", oe), e.persistent ? Oe() : u.value = !1;
    }
    function Ce(oe) {
      return u.value && S.value && // If using scrim, only close if clicking on it rather than anything opened on top
      (!e.scrim || oe.target === a.value || oe instanceof MouseEvent && oe.shadowTarget === a.value);
    }
    Ge && ke(u, (oe) => {
      oe ? window.addEventListener("keydown", G) : window.removeEventListener("keydown", G);
    }, {
      immediate: !0
    }), wt(() => {
      Ge && window.removeEventListener("keydown", G);
    });
    function G(oe) {
      var Ee, Re;
      oe.key === "Escape" && S.value && (e.persistent ? Oe() : (u.value = !1, (Ee = r.value) != null && Ee.contains(document.activeElement) && ((Re = P.value) == null || Re.focus())));
    }
    const Y = qb();
    oo(() => e.closeOnBack, () => {
      Gb(Y, (oe) => {
        S.value && u.value ? (oe(!1), e.persistent ? Oe() : u.value = !1) : oe();
      });
    });
    const te = le();
    ke(() => u.value && (e.absolute || e.contained) && k.value == null, (oe) => {
      if (oe) {
        const Ee = hp(s.value);
        Ee && Ee !== document.scrollingElement && (te.value = Ee.scrollTop);
      }
    });
    function Oe() {
      e.noClickAnimation || r.value && So(r.value, [{
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
    function We() {
      i("afterEnter");
    }
    function qe() {
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
      }), B.value && v.value && c(Oh, {
        disabled: !k.value,
        to: k.value
      }, {
        default: () => [c("div", xe({
          class: ["v-overlay", {
            "v-overlay--absolute": e.absolute || e.contained,
            "v-overlay--active": u.value,
            "v-overlay--contained": e.contained
          }, d.value, m.value, e.class],
          style: [A.value, {
            "--v-overlay-opacity": e.opacity,
            top: be(te.value)
          }, e.style],
          ref: s
        }, Z, o), [c(L0, xe({
          color: _,
          modelValue: u.value && !!e.scrim,
          ref: a
        }, O.value), null), c(vn, {
          appear: !0,
          persisted: !0,
          transition: e.transition,
          target: C.value,
          onAfterEnter: We,
          onAfterLeave: qe
        }, {
          default: () => {
            var Ee;
            return [rt(c("div", xe({
              ref: r,
              class: ["v-overlay__content", e.contentClass],
              style: [I.value, re.value]
            }, D.value, e.contentProps), [(Ee = n.default) == null ? void 0 : Ee.call(n, {
              isActive: u
            })]), [[En, u.value], [Rn("click-outside"), {
              handler: X,
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
}), Wm = W({
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
}, "VDialog"), gn = de()({
  name: "VDialog",
  props: Wm(),
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
    const i = Ke(e, "modelValue"), {
      scopeId: l
    } = gs(), s = le();
    function a(u) {
      var h, v;
      const d = u.relatedTarget, m = u.target;
      if (d !== m && ((h = s.value) != null && h.contentEl) && // We're the topmost dialog
      ((v = s.value) != null && v.globalTop) && // It isn't the document or the dialog body
      ![document, s.value.contentEl].includes(m) && // It isn't inside the dialog body
      !s.value.contentEl.contains(m)) {
        const g = Za(s.value.contentEl);
        if (!g.length) return;
        const _ = g[0], S = g[g.length - 1];
        d === _ ? S.focus() : _.focus();
      }
    }
    wt(() => {
      document.removeEventListener("focusin", a);
    }), Ge && ke(() => i.value && e.retainFocus, (u) => {
      u ? document.addEventListener("focusin", a) : document.removeEventListener("focusin", a);
    }, {
      immediate: !0
    });
    function r() {
      var u;
      n("afterEnter"), (u = s.value) != null && u.contentEl && !s.value.contentEl.contains(document.activeElement) && s.value.contentEl.focus({
        preventScroll: !0
      });
    }
    function f() {
      n("afterLeave");
    }
    return ke(i, async (u) => {
      var d;
      u || (await at(), (d = s.value.activatorEl) == null || d.focus({
        preventScroll: !0
      }));
    }), _e(() => {
      const u = Pi.filterProps(e), d = xe({
        "aria-haspopup": "dialog"
      }, e.activatorProps), m = xe({
        tabindex: -1
      }, e.contentProps);
      return c(Pi, xe({
        ref: s,
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
        contentProps: m,
        height: e.fullscreen ? void 0 : e.height,
        width: e.fullscreen ? void 0 : e.width,
        maxHeight: e.fullscreen ? void 0 : e.maxHeight,
        maxWidth: e.fullscreen ? void 0 : e.maxWidth,
        role: "dialog",
        onAfterEnter: r,
        onAfterLeave: f
      }, l), {
        activator: o.activator,
        default: function() {
          for (var h = arguments.length, v = new Array(h), g = 0; g < h; g++)
            v[g] = arguments[g];
          return c(mt, {
            root: "VDialog"
          }, {
            default: () => {
              var _;
              return [(_ = o.default) == null ? void 0 : _.call(o, ...v)];
            }
          });
        }
      });
    }), ii({}, s);
  }
}), R0 = {
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
}, H0 = { class: "px-4 py-2" }, j0 = { class: "px-4 py-2" }, z0 = { class: "my-2" };
function U0(e, t, n, o, i, l) {
  return ee(), ve(Ct, null, {
    default: p(() => [
      c(Qn, { class: "text-center" }, {
        default: p(() => t[14] || (t[14] = [
          U(" 消息 ")
        ])),
        _: 1
      }),
      se("div", H0, [
        c(Ct, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "用户信息"
        }, {
          default: p(() => [
            c(wn, null, {
              default: p(() => [
                c(Fe, {
                  class: "text-right",
                  onClick: l.alert_avatar
                }, {
                  prepend: p(() => t[15] || (t[15] = [
                    se("span", null, "头像", -1)
                  ])),
                  append: p(() => [
                    c(hn, {
                      image: n.user.avatar
                    }, null, 8, ["image"])
                  ]),
                  _: 1
                }, 8, ["onClick"]),
                c(Fe, {
                  class: "text-right",
                  title: n.user.email
                }, {
                  prepend: p(() => t[16] || (t[16] = [
                    se("span", null, "邮箱", -1)
                  ])),
                  _: 1
                }, 8, ["title"]),
                c(Fe, {
                  class: "text-right",
                  onClick: t[0] || (t[0] = (s) => e.editNickname = !0),
                  title: n.user.nickname
                }, {
                  prepend: p(() => t[17] || (t[17] = [
                    se("span", null, "昵称", -1)
                  ])),
                  append: p(() => [
                    c(Pe, null, {
                      default: p(() => t[18] || (t[18] = [
                        U("mdi-chevron-right")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                }, 8, ["title"]),
                c(Fe, {
                  class: "text-right",
                  onClick: t[1] || (t[1] = (s) => e.editPassword = !0),
                  title: "(点击更改)",
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: p(() => t[19] || (t[19] = [
                    se("span", null, "密码", -1)
                  ])),
                  _: 1
                }),
                c(Fe, {
                  class: "text-right",
                  onClick: t[2] || (t[2] = (s) => e.checkLogout = !0),
                  "append-icon": "mdi-chevron-right"
                }, {
                  prepend: p(() => t[20] || (t[20] = [
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
      se("div", j0, [
        c(Ct, {
          class: "mb-3 elevation-4 rounded-lg",
          subtitle: "章评互动信息"
        }, {
          default: p(() => [
            n.messages.length === 0 ? (ee(), ve(wn, {
              key: 0,
              density: "compact",
              class: "mr-4"
            }, {
              default: p(() => [
                c(Fe, { class: "my-4" }, {
                  default: p(() => [
                    c(Ki, { class: "text-center" }, {
                      default: p(() => t[21] || (t[21] = [
                        U("无新的互动消息")
                      ])),
                      _: 1
                    })
                  ]),
                  _: 1
                })
              ]),
              _: 1
            })) : ze("", !0),
            c(wn, {
              id: "book-comments",
              density: "compact",
              class: "mr-4"
            }, {
              default: p(() => [
                (ee(!0), Ze(Ve, null, Qt(n.messages, (s) => (ee(), ve(Fe, {
                  key: s.id,
                  class: "pr-0 align-self-start mb-4",
                  "prepend-avatar": s.avatar,
                  subtitle: s.nickName + " @《宿命之环》"
                }, {
                  default: p(() => [
                    se("div", z0, Ne(l.thumb_or_content(s)), 1),
                    c(Ct, {
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
      c(gn, {
        modelValue: e.editAvatar,
        "onUpdate:modelValue": t[3] || (t[3] = (s) => e.editAvatar = s),
        persistent: ""
      }, {
        default: p(() => [
          c(Uo)
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(gn, {
        modelValue: e.editNickname,
        "onUpdate:modelValue": t[6] || (t[6] = (s) => e.editNickname = s),
        persistent: ""
      }, {
        default: p(() => [
          c(Ct, null, {
            default: p(() => [
              c(Qn, { class: "text-center" }, {
                default: p(() => t[22] || (t[22] = [
                  U("修改昵称")
                ])),
                _: 1
              }),
              c(_n, null, {
                default: p(() => [
                  c(Yt, {
                    modelValue: e.newNickname,
                    "onUpdate:modelValue": t[4] || (t[4] = (s) => e.newNickname = s),
                    label: "新昵称"
                  }, null, 8, ["modelValue"]),
                  e.alert.msg ? (ee(), ve(Uo, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: p(() => [
                      U(Ne(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : ze("", !0)
                ]),
                _: 1
              }),
              c(Ao, null, {
                default: p(() => [
                  c(ce, {
                    text: "",
                    onClick: t[5] || (t[5] = (s) => e.editNickname = !1)
                  }, {
                    default: p(() => t[23] || (t[23] = [
                      U("取消")
                    ])),
                    _: 1
                  }),
                  c(ce, {
                    text: "",
                    onClick: l.saveNickname
                  }, {
                    default: p(() => t[24] || (t[24] = [
                      U("保存")
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
      c(gn, {
        modelValue: e.editPassword,
        "onUpdate:modelValue": t[11] || (t[11] = (s) => e.editPassword = s),
        persistent: "",
        "z-index": "2999"
      }, {
        default: p(() => [
          c(Ct, null, {
            default: p(() => [
              c(Qn, { class: "text-center" }, {
                default: p(() => t[25] || (t[25] = [
                  U("修改密码")
                ])),
                _: 1
              }),
              c(_n, null, {
                default: p(() => [
                  c(Yt, {
                    modelValue: e.oldPassword,
                    "onUpdate:modelValue": t[7] || (t[7] = (s) => e.oldPassword = s),
                    label: "当前密码"
                  }, null, 8, ["modelValue"]),
                  c(Yt, {
                    modelValue: e.newPassword,
                    "onUpdate:modelValue": t[8] || (t[8] = (s) => e.newPassword = s),
                    label: "新密码",
                    rules: [e.rules.pass]
                  }, null, 8, ["modelValue", "rules"]),
                  c(Yt, {
                    modelValue: e.examPassword,
                    "onUpdate:modelValue": t[9] || (t[9] = (s) => e.examPassword = s),
                    label: "确认密码",
                    rules: [l.double_check_password]
                  }, null, 8, ["modelValue", "rules"]),
                  e.alert.msg ? (ee(), ve(Uo, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: p(() => [
                      U(Ne(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : ze("", !0)
                ]),
                _: 1
              }),
              c(Ao, null, {
                default: p(() => [
                  c(ce, {
                    text: "",
                    onClick: t[10] || (t[10] = (s) => e.editPassword = !1)
                  }, {
                    default: p(() => t[26] || (t[26] = [
                      U("取消")
                    ])),
                    _: 1
                  }),
                  c(ce, {
                    text: "",
                    onClick: l.savePassword
                  }, {
                    default: p(() => t[27] || (t[27] = [
                      U("保存")
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
      c(gn, {
        modelValue: e.checkLogout,
        "onUpdate:modelValue": t[13] || (t[13] = (s) => e.checkLogout = s),
        persistent: ""
      }, {
        default: p(() => [
          c(Ct, null, {
            default: p(() => [
              c(Qn, { class: "text-center" }, {
                default: p(() => t[28] || (t[28] = [
                  U("请确认")
                ])),
                _: 1
              }),
              c(_n, null, {
                default: p(() => [
                  t[29] || (t[29] = U(" 是否要退出登录？ ")),
                  e.alert.msg ? (ee(), ve(Uo, {
                    key: 0,
                    type: e.alert.type,
                    dismissible: ""
                  }, {
                    default: p(() => [
                      U(Ne(e.alert.msg), 1)
                    ]),
                    _: 1
                  }, 8, ["type"])) : ze("", !0)
                ]),
                _: 1
              }),
              c(Ao, null, {
                default: p(() => [
                  c(ce, {
                    text: "",
                    onClick: t[12] || (t[12] = (s) => e.checkLogout = !1)
                  }, {
                    default: p(() => t[30] || (t[30] = [
                      U("取消")
                    ])),
                    _: 1
                  }),
                  c(ce, {
                    text: "",
                    onClick: l.do_logout
                  }, {
                    default: p(() => t[31] || (t[31] = [
                      U("确认")
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
const qm = /* @__PURE__ */ Vn(R0, [["render", U0], ["__scopeId", "data-v-924d6d99"]]), W0 = W({
  ...Te(),
  ...s0()
}, "VForm"), Rs = de()({
  name: "VForm",
  props: W0(),
  emits: {
    "update:modelValue": (e) => !0,
    submit: (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = a0(e), l = le();
    function s(r) {
      r.preventDefault(), i.reset();
    }
    function a(r) {
      const f = r, u = i.validate();
      f.then = u.then.bind(u), f.catch = u.catch.bind(u), f.finally = u.finally.bind(u), o("submit", f), f.defaultPrevented || u.then((d) => {
        var h;
        let {
          valid: m
        } = d;
        m && ((h = l.value) == null || h.submit());
      }), f.preventDefault();
    }
    return _e(() => {
      var r;
      return c("form", {
        ref: l,
        class: ["v-form", e.class],
        style: e.style,
        novalidate: !0,
        onReset: s,
        onSubmit: a
      }, [(r = n.default) == null ? void 0 : r.call(n, i)]);
    }), ii(i, l);
  }
}), q0 = {
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
function G0(e, t, n, o, i, l) {
  return ee(), ve(Ct, { title: "登录到书评系统" }, {
    default: p(() => [
      c(Jt),
      c(sm, null, {
        default: p(() => [
          e.mode == "login" ? (ee(), ve(Rs, {
            key: 0,
            onSubmit: vl(l.do_login, ["prevent"])
          }, {
            default: p(() => [
              c(Yt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[0] || (t[0] = (s) => e.email = s),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              c(Yt, {
                "prepend-icon": "mdi-lock",
                modelValue: e.password,
                "onUpdate:modelValue": t[1] || (t[1] = (s) => e.password = s),
                label: "密码",
                type: "password"
              }, null, 8, ["modelValue"]),
              c(ce, {
                type: "submit",
                color: "primary"
              }, {
                default: p(() => t[8] || (t[8] = [
                  U("登录")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "forget" ? (ee(), ve(Rs, {
            key: 1,
            onSubmit: vl(l.do_reset, ["prevent"])
          }, {
            default: p(() => [
              c(Yt, {
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[2] || (t[2] = (s) => e.email = s),
                label: "邮箱",
                type: "text",
                autocomplete: "old-email"
              }, null, 8, ["modelValue"]),
              c(ce, {
                type: "submit",
                color: "red"
              }, {
                default: p(() => t[9] || (t[9] = [
                  U("重置密码")
                ])),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["onSubmit"])) : e.mode == "signup" ? (ee(), ve(Rs, {
            key: 2,
            ref: "form",
            onSubmit: vl(l.do_signup, ["prevent"])
          }, {
            default: p(() => [
              c(Yt, {
                required: "",
                "prepend-icon": "mdi-email",
                modelValue: e.email,
                "onUpdate:modelValue": t[3] || (t[3] = (s) => e.email = s),
                label: "邮箱",
                type: "text",
                autocomplete: "new-email",
                rules: [e.rules.email]
              }, null, 8, ["modelValue", "rules"]),
              c(Yt, {
                required: "",
                "prepend-icon": "mdi-guy-fawkes-mask",
                modelValue: e.nickname,
                "onUpdate:modelValue": t[4] || (t[4] = (s) => e.nickname = s),
                label: "昵称",
                type: "text",
                autocomplete: "new-nickname",
                rules: [e.rules.nick]
              }, null, 8, ["modelValue", "rules"]),
              c(ce, {
                type: "submit",
                color: "green"
              }, {
                default: p(() => t[10] || (t[10] = [
                  U("注册")
                ])),
                _: 1
              }),
              t[11] || (t[11] = se("p", { class: "text-small" }, " * 账号密码将随机生成，并发往邮箱", -1))
            ]),
            _: 1
          }, 8, ["onSubmit"])) : ze("", !0)
        ]),
        _: 1
      }),
      e.alert.msg ? (ee(), ve(Uo, {
        key: 0,
        type: e.alert.type
      }, {
        default: p(() => [
          U(Ne(e.alert.msg), 1)
        ]),
        _: 1
      }, 8, ["type"])) : ze("", !0),
      c(Jt),
      c(Ao, null, {
        default: p(() => [
          e.mode == "login" ? (ee(), ve(ce, {
            key: 0,
            onClick: t[5] || (t[5] = (s) => e.mode = "forget"),
            text: "忘记密码?"
          })) : ze("", !0),
          e.mode != "login" ? (ee(), ve(ce, {
            key: 1,
            onClick: t[6] || (t[6] = (s) => e.mode = "login"),
            text: "登录账号"
          })) : ze("", !0),
          c(yl),
          c(ce, {
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
const Gm = /* @__PURE__ */ Vn(q0, [["render", G0]]), Sr = Symbol.for("vuetify:v-tabs"), K0 = W({
  fixed: Boolean,
  sliderColor: String,
  hideSlider: Boolean,
  direction: {
    type: String,
    default: "horizontal"
  },
  ...Fo(om({
    selectedClass: "v-tab--selected",
    variant: "text"
  }), ["active", "block", "flat", "location", "position", "symbol"])
}, "VTab"), ba = de()({
  name: "VTab",
  props: K0(),
  setup(e, t) {
    let {
      slots: n,
      attrs: o
    } = t;
    const {
      textColorClasses: i,
      textColorStyles: l
    } = Ft(e, "sliderColor"), s = le(), a = le(), r = b(() => e.direction === "horizontal"), f = b(() => {
      var d, m;
      return ((m = (d = s.value) == null ? void 0 : d.group) == null ? void 0 : m.isSelected.value) ?? !1;
    });
    function u(d) {
      var h, v;
      let {
        value: m
      } = d;
      if (m) {
        const g = (v = (h = s.value) == null ? void 0 : h.$el.parentElement) == null ? void 0 : v.querySelector(".v-tab--selected .v-tab__slider"), _ = a.value;
        if (!g || !_) return;
        const S = getComputedStyle(g).color, N = g.getBoundingClientRect(), A = _.getBoundingClientRect(), P = r.value ? "x" : "y", x = r.value ? "X" : "Y", C = r.value ? "right" : "bottom", $ = r.value ? "width" : "height", V = N[P], T = A[P], D = V > T ? N[C] - A[C] : N[P] - A[P], O = Math.sign(D) > 0 ? r.value ? "right" : "bottom" : Math.sign(D) < 0 ? r.value ? "left" : "top" : "center", I = (Math.abs(D) + (Math.sign(D) < 0 ? N[$] : A[$])) / Math.max(N[$], A[$]) || 0, B = N[$] / A[$] || 0, Z = 1.5;
        So(_, {
          backgroundColor: [S, "currentcolor"],
          transform: [`translate${x}(${D}px) scale${x}(${B})`, `translate${x}(${D / Z}px) scale${x}(${(I - 1) / Z + 1})`, "none"],
          transformOrigin: Array(3).fill(O)
        }, {
          duration: 225,
          easing: Vi
        });
      }
    }
    return _e(() => {
      const d = ce.filterProps(e);
      return c(ce, xe({
        symbol: Sr,
        ref: s,
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
          var m;
          return c(Ve, null, [((m = n.default) == null ? void 0 : m.call(n)) ?? e.text, !e.hideSlider && c("div", {
            ref: a,
            class: ["v-tab__slider", i.value],
            style: l.value
          }, null)]);
        }
      });
    }), ii({}, s);
  }
}), Y0 = (e) => {
  const {
    touchstartX: t,
    touchendX: n,
    touchstartY: o,
    touchendY: i
  } = e, l = 0.5, s = 16;
  e.offsetX = n - t, e.offsetY = i - o, Math.abs(e.offsetY) < l * Math.abs(e.offsetX) && (e.left && n < t - s && e.left(e), e.right && n > t + s && e.right(e)), Math.abs(e.offsetX) < l * Math.abs(e.offsetY) && (e.up && i < o - s && e.up(e), e.down && i > o + s && e.down(e));
};
function X0(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchstartX = n.clientX, t.touchstartY = n.clientY, (o = t.start) == null || o.call(t, {
    originalEvent: e,
    ...t
  });
}
function J0(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchendX = n.clientX, t.touchendY = n.clientY, (o = t.end) == null || o.call(t, {
    originalEvent: e,
    ...t
  }), Y0(t);
}
function Z0(e, t) {
  var o;
  const n = e.changedTouches[0];
  t.touchmoveX = n.clientX, t.touchmoveY = n.clientY, (o = t.move) == null || o.call(t, {
    originalEvent: e,
    ...t
  });
}
function Q0() {
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
    touchstart: (n) => X0(n, t),
    touchend: (n) => J0(n, t),
    touchmove: (n) => Z0(n, t)
  };
}
function e1(e, t) {
  var a;
  const n = t.value, o = n != null && n.parent ? e.parentElement : e, i = (n == null ? void 0 : n.options) ?? {
    passive: !0
  }, l = (a = t.instance) == null ? void 0 : a.$.uid;
  if (!o || !l) return;
  const s = Q0(t.value);
  o._touchHandlers = o._touchHandlers ?? /* @__PURE__ */ Object.create(null), o._touchHandlers[l] = s, rf(s).forEach((r) => {
    o.addEventListener(r, s[r], i);
  });
}
function t1(e, t) {
  var l, s;
  const n = (l = t.value) != null && l.parent ? e.parentElement : e, o = (s = t.instance) == null ? void 0 : s.$.uid;
  if (!(n != null && n._touchHandlers) || !o) return;
  const i = n._touchHandlers[o];
  rf(i).forEach((a) => {
    n.removeEventListener(a, i[a]);
  }), delete n._touchHandlers[o];
}
const Km = {
  mounted: e1,
  unmounted: t1
}, Ym = Symbol.for("vuetify:v-window"), Xm = Symbol.for("vuetify:v-window-group"), Jm = W({
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
  ...Je(),
  ...tt()
}, "VWindow"), yc = de()({
  name: "VWindow",
  directives: {
    Touch: Km
  },
  props: Jm(),
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
    } = Lt(), {
      t: l
    } = ss(), s = cs(e, Xm), a = le(), r = b(() => i.value ? !e.reverse : e.reverse), f = we(!1), u = b(() => {
      const P = e.direction === "vertical" ? "y" : "x", C = (r.value ? !f.value : f.value) ? "-reverse" : "";
      return `v-window-${P}${C}-transition`;
    }), d = we(0), m = le(void 0), h = b(() => s.items.value.findIndex((P) => s.selected.value.includes(P.id)));
    ke(h, (P, x) => {
      const C = s.items.value.length, $ = C - 1;
      C <= 2 ? f.value = P < x : P === $ && x === 0 ? f.value = !0 : P === 0 && x === $ ? f.value = !1 : f.value = P < x;
    }), yt(Ym, {
      transition: u,
      isReversed: f,
      transitionCount: d,
      transitionHeight: m,
      rootRef: a
    });
    const v = b(() => e.continuous || h.value !== 0), g = b(() => e.continuous || h.value !== s.items.value.length - 1);
    function _() {
      v.value && s.prev();
    }
    function S() {
      g.value && s.next();
    }
    const N = b(() => {
      const P = [], x = {
        icon: i.value ? e.nextIcon : e.prevIcon,
        class: `v-window__${r.value ? "right" : "left"}`,
        onClick: s.prev,
        "aria-label": l("$vuetify.carousel.prev")
      };
      P.push(v.value ? n.prev ? n.prev({
        props: x
      }) : c(ce, x, null) : c("div", null, null));
      const C = {
        icon: i.value ? e.prevIcon : e.nextIcon,
        class: `v-window__${r.value ? "left" : "right"}`,
        onClick: s.next,
        "aria-label": l("$vuetify.carousel.next")
      };
      return P.push(g.value ? n.next ? n.next({
        props: C
      }) : c(ce, C, null) : c("div", null, null)), P;
    }), A = b(() => e.touch === !1 ? e.touch : {
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
            height: m.value
          }
        }, [(P = n.default) == null ? void 0 : P.call(n, {
          group: s
        }), e.showArrows !== !1 && c("div", {
          class: "v-window__controls"
        }, [N.value])]), (x = n.additional) == null ? void 0 : x.call(n, {
          group: s
        })];
      }
    }), [[Rn("touch"), A.value]])), {
      group: s
    };
  }
}), n1 = W({
  ...Fo(Jm(), ["continuous", "nextIcon", "prevIcon", "showArrows", "touch", "mandatory"])
}, "VTabsWindow"), o1 = de()({
  name: "VTabsWindow",
  props: n1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = He(Sr, null), i = Ke(e, "modelValue"), l = b({
      get() {
        var s;
        return i.value != null || !o ? i.value : (s = o.items.value.find((a) => o.selected.value.includes(a.id))) == null ? void 0 : s.value;
      },
      set(s) {
        i.value = s;
      }
    });
    return _e(() => {
      const s = yc.filterProps(e);
      return c(yc, xe({
        _as: "VTabsWindow"
      }, s, {
        modelValue: l.value,
        "onUpdate:modelValue": (a) => l.value = a,
        class: ["v-tabs-window", e.class],
        style: e.style,
        mandatory: !1,
        touch: !1
      }), n);
    }), {};
  }
}), Zm = W({
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
  ...Hm()
}, "VWindowItem"), pc = de()({
  name: "VWindowItem",
  directives: {
    Touch: Km
  },
  props: Zm(),
  emits: {
    "group:selected": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = He(Ym), i = Uf(e, Xm), {
      isBooted: l
    } = Gi();
    if (!o || !i) throw new Error("[Vuetify] VWindowItem must be used inside VWindow");
    const s = we(!1), a = b(() => l.value && (o.isReversed.value ? e.reverseTransition !== !1 : e.transition !== !1));
    function r() {
      !s.value || !o || (s.value = !1, o.transitionCount.value > 0 && (o.transitionCount.value -= 1, o.transitionCount.value === 0 && (o.transitionHeight.value = void 0)));
    }
    function f() {
      var v;
      s.value || !o || (s.value = !0, o.transitionCount.value === 0 && (o.transitionHeight.value = be((v = o.rootRef.value) == null ? void 0 : v.clientHeight)), o.transitionCount.value += 1);
    }
    function u() {
      r();
    }
    function d(v) {
      s.value && at(() => {
        !a.value || !s.value || !o || (o.transitionHeight.value = be(v.clientHeight));
      });
    }
    const m = b(() => {
      const v = o.isReversed.value ? e.reverseTransition : e.transition;
      return a.value ? {
        name: typeof v != "string" ? o.transition.value : v,
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
    } = jm(e, i.isSelected);
    return _e(() => c(vn, {
      transition: m.value,
      disabled: !l.value
    }, {
      default: () => {
        var v;
        return [rt(c("div", {
          class: ["v-window-item", i.selectedClass.value, e.class],
          style: e.style
        }, [h.value && ((v = n.default) == null ? void 0 : v.call(n))]), [[En, i.isSelected.value]])];
      }
    })), {
      groupItem: i
    };
  }
}), i1 = W({
  ...Zm()
}, "VTabsWindowItem"), l1 = de()({
  name: "VTabsWindowItem",
  props: i1(),
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
  const l = Di(i, n), s = Qm(i, o, n), a = Di(i, t), r = ev(i, t), f = a * 0.4;
  return s > r ? r - f : s + l < r + a ? r - l + a + f : s;
}
function a1(e) {
  let {
    selectedElement: t,
    containerElement: n,
    isHorizontal: o
  } = e;
  const i = Di(o, n), l = ev(o, t), s = Di(o, t);
  return l - i / 2 + s / 2;
}
function bc(e, t) {
  const n = e ? "scrollWidth" : "scrollHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function r1(e, t) {
  const n = e ? "clientWidth" : "clientHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function Qm(e, t, n) {
  if (!n)
    return 0;
  const {
    scrollLeft: o,
    offsetWidth: i,
    scrollWidth: l
  } = n;
  return e ? t ? l - i + o : o : n.scrollTop;
}
function Di(e, t) {
  const n = e ? "offsetWidth" : "offsetHeight";
  return (t == null ? void 0 : t[n]) || 0;
}
function ev(e, t) {
  const n = e ? "offsetLeft" : "offsetTop";
  return (t == null ? void 0 : t[n]) || 0;
}
const u1 = Symbol.for("vuetify:v-slide-group"), tv = W({
  centerActive: Boolean,
  direction: {
    type: String,
    default: "horizontal"
  },
  symbol: {
    type: null,
    default: u1
  },
  nextIcon: {
    type: Ue,
    default: "$next"
  },
  prevIcon: {
    type: Ue,
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
  ...Je(),
  ...lr({
    selectedClass: "v-slide-group-item--active"
  })
}, "VSlideGroup"), _c = de()({
  name: "VSlideGroup",
  props: tv(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      isRtl: o
    } = Lt(), {
      displayClasses: i,
      mobile: l
    } = If(e), s = cs(e, e.symbol), a = we(!1), r = we(0), f = we(0), u = we(0), d = b(() => e.direction === "horizontal"), {
      resizeRef: m,
      contentRect: h
    } = Hl(), {
      resizeRef: v,
      contentRect: g
    } = Hl(), _ = gb(), S = b(() => ({
      container: m.el,
      duration: 200,
      easing: "easeOutQuart"
    })), N = b(() => s.selected.value.length ? s.items.value.findIndex((G) => G.id === s.selected.value[0]) : -1), A = b(() => s.selected.value.length ? s.items.value.findIndex((G) => G.id === s.selected.value[s.selected.value.length - 1]) : -1);
    if (Ge) {
      let G = -1;
      ke(() => [s.selected.value, h.value, g.value, d.value], () => {
        cancelAnimationFrame(G), G = requestAnimationFrame(() => {
          if (h.value && g.value) {
            const Y = d.value ? "width" : "height";
            f.value = h.value[Y], u.value = g.value[Y], a.value = f.value + 1 < u.value;
          }
          if (N.value >= 0 && v.el) {
            const Y = v.el.children[A.value];
            x(Y, e.centerActive);
          }
        });
      });
    }
    const P = we(!1);
    function x(G, Y) {
      let te = 0;
      Y ? te = a1({
        containerElement: m.el,
        isHorizontal: d.value,
        selectedElement: G
      }) : te = s1({
        containerElement: m.el,
        isHorizontal: d.value,
        isRtl: o.value,
        selectedElement: G
      }), C(te);
    }
    function C(G) {
      if (!Ge || !m.el) return;
      const Y = Di(d.value, m.el), te = Qm(d.value, o.value, m.el);
      if (!(bc(d.value, m.el) <= Y || // Prevent scrolling by only a couple of pixels, which doesn't look smooth
      Math.abs(G - te) < 16)) {
        if (d.value && o.value && m.el) {
          const {
            scrollWidth: We,
            offsetWidth: qe
          } = m.el;
          G = We - qe - G;
        }
        d.value ? _.horizontal(G, S.value) : _(G, S.value);
      }
    }
    function $(G) {
      const {
        scrollTop: Y,
        scrollLeft: te
      } = G.target;
      r.value = d.value ? te : Y;
    }
    function V(G) {
      if (P.value = !0, !(!a.value || !v.el)) {
        for (const Y of G.composedPath())
          for (const te of v.el.children)
            if (te === Y) {
              x(te);
              return;
            }
      }
    }
    function T(G) {
      P.value = !1;
    }
    let D = !1;
    function O(G) {
      var Y;
      !D && !P.value && !(G.relatedTarget && ((Y = v.el) != null && Y.contains(G.relatedTarget))) && B(), D = !1;
    }
    function k() {
      D = !0;
    }
    function I(G) {
      if (!v.el) return;
      function Y(te) {
        G.preventDefault(), B(te);
      }
      d.value ? G.key === "ArrowRight" ? Y(o.value ? "prev" : "next") : G.key === "ArrowLeft" && Y(o.value ? "next" : "prev") : G.key === "ArrowDown" ? Y("next") : G.key === "ArrowUp" && Y("prev"), G.key === "Home" ? Y("first") : G.key === "End" && Y("last");
    }
    function B(G) {
      var te, Oe;
      if (!v.el) return;
      let Y;
      if (!G)
        Y = Za(v.el)[0];
      else if (G === "next") {
        if (Y = (te = v.el.querySelector(":focus")) == null ? void 0 : te.nextElementSibling, !Y) return B("first");
      } else if (G === "prev") {
        if (Y = (Oe = v.el.querySelector(":focus")) == null ? void 0 : Oe.previousElementSibling, !Y) return B("last");
      } else G === "first" ? Y = v.el.firstElementChild : G === "last" && (Y = v.el.lastElementChild);
      Y && Y.focus({
        preventScroll: !0
      });
    }
    function Z(G) {
      const Y = d.value && o.value ? -1 : 1, te = (G === "prev" ? -Y : Y) * f.value;
      let Oe = r.value + te;
      if (d.value && o.value && m.el) {
        const {
          scrollWidth: We,
          offsetWidth: qe
        } = m.el;
        Oe += We - qe;
      }
      C(Oe);
    }
    const re = b(() => ({
      next: s.next,
      prev: s.prev,
      select: s.select,
      isSelected: s.isSelected
    })), ne = b(() => {
      switch (e.showArrows) {
        case "always":
          return !0;
        case "desktop":
          return !l.value;
        case !0:
          return a.value || Math.abs(r.value) > 0;
        case "mobile":
          return l.value || a.value || Math.abs(r.value) > 0;
        default:
          return !l.value && (a.value || Math.abs(r.value) > 0);
      }
    }), X = b(() => Math.abs(r.value) > 1), Ce = b(() => {
      if (!m.value) return !1;
      const G = bc(d.value, m.el), Y = r1(d.value, m.el);
      return G - Y - Math.abs(r.value) > 1;
    });
    return _e(() => c(e.tag, {
      class: ["v-slide-group", {
        "v-slide-group--vertical": !d.value,
        "v-slide-group--has-affixes": ne.value,
        "v-slide-group--is-overflowing": a.value
      }, i.value, e.class],
      style: e.style,
      tabindex: P.value || s.selected.value.length ? -1 : 0,
      onFocus: O
    }, {
      default: () => {
        var G, Y, te;
        return [ne.value && c("div", {
          key: "prev",
          class: ["v-slide-group__prev", {
            "v-slide-group__prev--disabled": !X.value
          }],
          onMousedown: k,
          onClick: () => X.value && Z("prev")
        }, [((G = n.prev) == null ? void 0 : G.call(n, re.value)) ?? c(uc, null, {
          default: () => [c(Pe, {
            icon: o.value ? e.nextIcon : e.prevIcon
          }, null)]
        })]), c("div", {
          key: "container",
          ref: m,
          class: "v-slide-group__container",
          onScroll: $
        }, [c("div", {
          ref: v,
          class: "v-slide-group__content",
          onFocusin: V,
          onFocusout: T,
          onKeydown: I
        }, [(Y = n.default) == null ? void 0 : Y.call(n, re.value)])]), ne.value && c("div", {
          key: "next",
          class: ["v-slide-group__next", {
            "v-slide-group__next--disabled": !Ce.value
          }],
          onMousedown: k,
          onClick: () => Ce.value && Z("next")
        }, [((te = n.next) == null ? void 0 : te.call(n, re.value)) ?? c(uc, null, {
          default: () => [c(Pe, {
            icon: o.value ? e.prevIcon : e.nextIcon
          }, null)]
        })])];
      }
    })), {
      selected: s.selected,
      scrollTo: Z,
      scrollOffset: r,
      focus: B,
      hasPrev: X,
      hasNext: Ce
    };
  }
});
function c1(e) {
  return e ? e.map((t) => af(t) ? t : {
    text: t,
    value: t
  }) : [];
}
const d1 = W({
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
  ...tv({
    mandatory: "force",
    selectedClass: "v-tab-item--selected"
  }),
  ...Gt(),
  ...Je()
}, "VTabs"), f1 = de()({
  name: "VTabs",
  props: d1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = Ke(e, "modelValue"), l = b(() => c1(e.items)), {
      densityClasses: s
    } = ln(e), {
      backgroundColorClasses: a,
      backgroundColorStyles: r
    } = At(ae(e, "bgColor")), {
      scopeId: f
    } = gs();
    return so({
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
        "onUpdate:modelValue": (m) => i.value = m,
        class: ["v-tabs", `v-tabs--${e.direction}`, `v-tabs--align-tabs-${e.alignTabs}`, {
          "v-tabs--fixed-tabs": e.fixedTabs,
          "v-tabs--grow": e.grow,
          "v-tabs--stacked": e.stacked
        }, s.value, a.value, e.class],
        style: [{
          "--v-tabs-height": be(e.height)
        }, r.value, e.style],
        role: "tablist",
        symbol: Sr
      }, f, n), {
        default: () => {
          var m;
          return [((m = o.default) == null ? void 0 : m.call(o)) ?? l.value.map((h) => {
            var v;
            return ((v = o.tab) == null ? void 0 : v.call(o, {
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
      }), d && c(o1, xe({
        modelValue: i.value,
        "onUpdate:modelValue": (m) => i.value = m,
        key: "tabs-window"
      }, f), {
        default: () => {
          var m;
          return [l.value.map((h) => {
            var v;
            return ((v = o.item) == null ? void 0 : v.call(o, {
              item: h
            })) ?? c(l1, {
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
}), m1 = {
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
}, v1 = { class: "text-white" }, h1 = { class: "br-list" }, g1 = ["onClick"], y1 = { class: "text-white text-caption" };
function p1(e, t, n, o, i, l) {
  return ee(), ve(Ct, { class: "book-review-card" }, {
    default: p(() => [
      c(It, {
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
              se("h4", { class: "mt-3" }, "本书评论", -1)
            ])),
            _: 1
          }),
          c(Ie, {
            cols: "2",
            class: "text-right"
          }, {
            default: p(() => [
              c(ce, {
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
      n.user ? (ee(), Ze(Ve, { key: 0 }, [
        c(Fe, {
          class: "br-fixed",
          title: n.user.nickName || n.user.nickname,
          subtitle: n.user.email,
          onClick: t[1] || (t[1] = (s) => e.$emit("open-settings"))
        }, {
          prepend: p(() => [
            n.user.avatar ? (ee(), ve(hn, {
              key: 0,
              image: n.user.avatar
            }, null, 8, ["image"])) : (ee(), ve(hn, {
              key: 1,
              color: l.avatar_color(n.user.id)
            }, {
              default: p(() => [
                se("span", v1, Ne(l.avatar_text(n.user.nickName || n.user.nickname)), 1)
              ]),
              _: 1
            }, 8, ["color"]))
          ]),
          append: p(() => [
            c(Pe, { title: "用户设置" }, {
              default: p(() => t[6] || (t[6] = [
                U("mdi-cog-outline")
              ])),
              _: 1
            })
          ]),
          _: 1
        }, 8, ["title", "subtitle"]),
        c(Jt, { class: "br-fixed" })
      ], 64)) : ze("", !0),
      c(f1, {
        class: "br-fixed",
        "model-value": n.sort,
        "onUpdate:modelValue": t[2] || (t[2] = (s) => e.$emit("update:sort", s)),
        density: "compact",
        grow: ""
      }, {
        default: p(() => [
          c(ba, { value: "latest" }, {
            default: p(() => t[7] || (t[7] = [
              U("最新")
            ])),
            _: 1
          }),
          c(ba, { value: "hot" }, {
            default: p(() => t[8] || (t[8] = [
              U("热门")
            ])),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["model-value"]),
      c(Jt, { class: "br-fixed" }),
      se("div", h1, [
        n.comments.length === 0 ? (ee(), ve(wn, {
          key: 0,
          density: "compact"
        }, {
          default: p(() => [
            c(Fe, { class: "my-4" }, {
              default: p(() => [
                c(Ki, { class: "text-center text-medium-emphasis" }, {
                  default: p(() => t[9] || (t[9] = [
                    U("尚未有人发表评论")
                  ])),
                  _: 1
                })
              ]),
              _: 1
            })
          ]),
          _: 1
        })) : (ee(), ve(wn, {
          key: 1,
          id: "book-review-list",
          density: "compact"
        }, {
          default: p(() => [
            (ee(!0), Ze(Ve, null, Qt(n.comments, (s) => (ee(), ve(Fe, {
              key: s.reviewId,
              class: "pr-0 align-self-start mb-4",
              subtitle: s.nickName
            }, {
              prepend: p(() => [
                s.avatar ? (ee(), ve(hn, {
                  key: 0,
                  image: s.avatar,
                  size: "30"
                }, null, 8, ["image"])) : (ee(), ve(hn, {
                  key: 1,
                  size: "30",
                  color: l.avatar_color(s.userId)
                }, {
                  default: p(() => [
                    se("span", y1, Ne(l.avatar_text(s.nickName)), 1)
                  ]),
                  _: 2
                }, 1032, ["color"]))
              ]),
              append: p(() => [
                c(ce, {
                  class: "px-0",
                  size: "small",
                  variant: "plain",
                  stacked: "",
                  "prepend-icon": "mdi-thumb-up",
                  title: "点赞"
                }, {
                  default: p(() => [
                    U(Ne(s.likeCount), 1)
                  ]),
                  _: 2
                }, 1024)
              ]),
              default: p(() => [
                U(Ne(s.content) + " ", 1),
                s.referText ? (ee(), Ze("div", {
                  key: 0,
                  class: yn(["br-refer text-caption text-medium-emphasis", { "br-refer--link": s.cfi }]),
                  onClick: vl((a) => s.cfi && e.$emit("jump", s.cfi), ["stop"])
                }, Ne(s.referText), 11, g1)) : ze("", !0),
                c(hs, null, {
                  default: p(() => [
                    U(Ne(s.level) + "楼 · " + Ne(s.createTime) + " · " + Ne(s.geo), 1)
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
      c(_n, { class: "br-fixed my-2 py-0 px-2" }, {
        default: p(() => [
          n.login ? (ee(), ve(It, {
            key: 1,
            "no-gutters": "",
            class: "align-center"
          }, {
            default: p(() => [
              c(Ie, { cols: "9" }, {
                default: p(() => [
                  c(Yt, {
                    modelValue: e.content,
                    "onUpdate:modelValue": t[4] || (t[4] = (s) => e.content = s),
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
                  c(ce, { onClick: l.submit }, {
                    default: p(() => t[11] || (t[11] = [
                      U("发表")
                    ])),
                    _: 1
                  }, 8, ["onClick"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })) : (ee(), ve(ce, {
            key: 0,
            onClick: t[3] || (t[3] = (s) => e.$emit("login")),
            variant: "text",
            style: { width: "100%" }
          }, {
            default: p(() => t[10] || (t[10] = [
              U("点击登录，发表评论")
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
const nv = /* @__PURE__ */ Vn(m1, [["render", p1], ["__scopeId", "data-v-9af658bd"]]), b1 = {
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
function _1(e, t, n, o, i, l) {
  return ee(), ve(wn, {
    "onClick:select": l.click_toc,
    ref: "tocList"
  }, {
    default: p(() => [
      c(zl, null, {
        activator: p(({ props: s }) => [
          c(Fe, xe(s, { title: "书籍信息" }), null, 16)
        ]),
        default: p(() => [
          (ee(!0), Ze(Ve, null, Qt(l.meta_items, (s) => (ee(), ve(Fe, {
            key: s.title,
            title: s.title,
            subtitle: s.subtitle,
            lines: "3"
          }, null, 8, ["title", "subtitle"]))), 128))
        ]),
        _: 1
      }),
      c(Jt),
      (ee(!0), Ze(Ve, null, Qt(n.toc_items, (s, a) => (ee(), Ze(Ve, null, [
        s.subitems.length == 0 ? (ee(), ve(Fe, {
          key: 0,
          "prepend-icon": "mdi-book-open-page-variant-outline",
          title: s.label,
          value: s.href,
          class: yn({ "current-chapter": l.isCurrentChapter(s) }),
          ref_for: !0,
          ref: "listItem"
        }, null, 8, ["title", "value", "class"])) : (ee(), ve(zl, {
          key: s.href
        }, {
          activator: p(({ props: r }) => [
            c(Fe, xe({ ref_for: !0 }, r, {
              "prepend-icon": "mdi-book-open-page-variant-outline",
              title: s.label,
              value: s.href,
              class: { "current-chapter": l.isCurrentChapter(s) },
              ref_for: !0,
              ref: "listItem"
            }), null, 16, ["title", "value", "class"])
          ]),
          default: p(() => [
            (ee(!0), Ze(Ve, null, Qt(s.subitems, (r, f) => (ee(), ve(Fe, {
              key: r.href,
              title: r.label,
              value: r.href,
              class: yn({ "current-chapter": l.isCurrentChapter(r) }),
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
const ov = /* @__PURE__ */ Vn(b1, [["render", _1], ["__scopeId", "data-v-f081fe9b"]]), Cr = Symbol.for("vuetify:v-slider");
function w1(e, t, n) {
  const o = n === "vertical", i = t.getBoundingClientRect(), l = "touches" in e ? e.touches[0] : e;
  return o ? l.clientY - (i.top + i.height / 2) : l.clientX - (i.left + i.width / 2);
}
function k1(e, t) {
  return "touches" in e && e.touches.length ? e.touches[0][t] : "changedTouches" in e && e.changedTouches.length ? e.changedTouches[0][t] : e[t];
}
const S1 = W({
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
}, "Slider"), C1 = (e) => {
  const t = b(() => parseFloat(e.min)), n = b(() => parseFloat(e.max)), o = b(() => +e.step > 0 ? parseFloat(e.step) : 0), i = b(() => Math.max(Eu(o.value), Eu(t.value)));
  function l(s) {
    if (s = parseFloat(s), o.value <= 0) return s;
    const a = Sn(s, t.value, n.value), r = t.value % o.value, f = Math.round((a - r) / o.value) * o.value + r;
    return parseFloat(Math.min(f, n.value).toFixed(i.value));
  }
  return {
    min: t,
    max: n,
    step: o,
    decimals: i,
    roundValue: l
  };
}, E1 = (e) => {
  let {
    props: t,
    steps: n,
    onSliderStart: o,
    onSliderMove: i,
    onSliderEnd: l,
    getActiveThumb: s
  } = e;
  const {
    isRtl: a
  } = Lt(), r = ae(t, "reverse"), f = b(() => t.direction === "vertical"), u = b(() => f.value !== r.value), {
    min: d,
    max: m,
    step: h,
    decimals: v,
    roundValue: g
  } = n, _ = b(() => parseInt(t.thumbSize, 10)), S = b(() => parseInt(t.tickSize, 10)), N = b(() => parseInt(t.trackSize, 10)), A = b(() => (m.value - d.value) / h.value), P = ae(t, "disabled"), x = b(() => t.error || t.disabled ? void 0 : t.thumbColor ?? t.color), C = b(() => t.error || t.disabled ? void 0 : t.trackColor ?? t.color), $ = b(() => t.error || t.disabled ? void 0 : t.trackFillColor ?? t.color), V = we(!1), T = we(0), D = le(), O = le();
  function k(oe) {
    var w;
    const Ee = t.direction === "vertical", Re = Ee ? "top" : "left", nt = Ee ? "height" : "width", Qe = Ee ? "clientY" : "clientX", {
      [Re]: Ht,
      [nt]: Wn
    } = (w = D.value) == null ? void 0 : w.$el.getBoundingClientRect(), qn = k1(oe, Qe);
    let y = Math.min(Math.max((qn - Ht - T.value) / Wn, 0), 1) || 0;
    return (Ee ? u.value : u.value !== a.value) && (y = 1 - y), g(d.value + y * (m.value - d.value));
  }
  const I = (oe) => {
    l({
      value: k(oe)
    }), V.value = !1, T.value = 0;
  }, B = (oe) => {
    O.value = s(oe), O.value && (O.value.focus(), V.value = !0, O.value.contains(oe.target) ? T.value = w1(oe, O.value, t.direction) : (T.value = 0, i({
      value: k(oe)
    })), o({
      value: k(oe)
    }));
  }, Z = {
    passive: !0,
    capture: !0
  };
  function re(oe) {
    i({
      value: k(oe)
    });
  }
  function ne(oe) {
    oe.stopPropagation(), oe.preventDefault(), I(oe), window.removeEventListener("mousemove", re, Z), window.removeEventListener("mouseup", ne);
  }
  function X(oe) {
    var Ee;
    I(oe), window.removeEventListener("touchmove", re, Z), (Ee = oe.target) == null || Ee.removeEventListener("touchend", X);
  }
  function Ce(oe) {
    var Ee;
    B(oe), window.addEventListener("touchmove", re, Z), (Ee = oe.target) == null || Ee.addEventListener("touchend", X, {
      passive: !1
    });
  }
  function G(oe) {
    oe.preventDefault(), B(oe), window.addEventListener("mousemove", re, Z), window.addEventListener("mouseup", ne, {
      passive: !1
    });
  }
  const Y = (oe) => {
    const Ee = (oe - d.value) / (m.value - d.value) * 100;
    return Sn(isNaN(Ee) ? 0 : Ee, 0, 100);
  }, te = ae(t, "showTicks"), Oe = b(() => te.value ? t.ticks ? Array.isArray(t.ticks) ? t.ticks.map((oe) => ({
    value: oe,
    position: Y(oe),
    label: oe.toString()
  })) : Object.keys(t.ticks).map((oe) => ({
    value: parseFloat(oe),
    position: Y(parseFloat(oe)),
    label: t.ticks[oe]
  })) : A.value !== 1 / 0 ? Ka(A.value + 1).map((oe) => {
    const Ee = d.value + oe * h.value;
    return {
      value: Ee,
      position: Y(Ee)
    };
  }) : [] : []), We = b(() => Oe.value.some((oe) => {
    let {
      label: Ee
    } = oe;
    return !!Ee;
  })), qe = {
    activeThumbRef: O,
    color: ae(t, "color"),
    decimals: v,
    disabled: P,
    direction: ae(t, "direction"),
    elevation: ae(t, "elevation"),
    hasLabels: We,
    isReversed: r,
    indexFromEnd: u,
    min: d,
    max: m,
    mousePressed: V,
    numTicks: A,
    onSliderMousedown: G,
    onSliderTouchstart: Ce,
    parsedTicks: Oe,
    parseMouseMove: k,
    position: Y,
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
  return yt(Cr, qe), qe;
}, x1 = W({
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
}, "VSliderThumb"), V1 = de()({
  name: "VSliderThumb",
  directives: {
    Ripple: Wi
  },
  props: x1(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n,
      emit: o
    } = t;
    const i = He(Cr), {
      isRtl: l,
      rtlClasses: s
    } = Lt();
    if (!i) throw new Error("[Vuetify] v-slider-thumb must be used inside v-slider or v-range-slider");
    const {
      thumbColor: a,
      step: r,
      disabled: f,
      thumbSize: u,
      thumbLabel: d,
      direction: m,
      isReversed: h,
      vertical: v,
      readonly: g,
      elevation: _,
      mousePressed: S,
      decimals: N,
      indexFromEnd: A
    } = i, P = b(() => f.value ? void 0 : _.value), {
      elevationClasses: x
    } = jn(P), {
      textColorClasses: C,
      textColorStyles: $
    } = Ft(a), {
      pageup: V,
      pagedown: T,
      end: D,
      home: O,
      left: k,
      right: I,
      down: B,
      up: Z
    } = Ay, re = [V, T, D, O, k, I, B, Z], ne = b(() => r.value ? [1, 2, 3] : [1, 5, 10]);
    function X(G, Y) {
      if (!re.includes(G.key)) return;
      G.preventDefault();
      const te = r.value || 0.1, Oe = (e.max - e.min) / te;
      if ([k, I, B, Z].includes(G.key)) {
        const qe = (v.value ? [l.value ? k : I, h.value ? B : Z] : A.value !== l.value ? [k, Z] : [I, Z]).includes(G.key) ? 1 : -1, oe = G.shiftKey ? 2 : G.ctrlKey ? 1 : 0;
        Y = Y + qe * te * ne.value[oe];
      } else if (G.key === O)
        Y = e.min;
      else if (G.key === D)
        Y = e.max;
      else {
        const We = G.key === T ? 1 : -1;
        Y = Y - We * te * (Oe > 100 ? Oe / 10 : 10);
      }
      return Math.max(e.min, Math.min(e.max, Y));
    }
    function Ce(G) {
      const Y = X(G, e.modelValue);
      Y != null && o("update:modelValue", Y);
    }
    return _e(() => {
      const G = be(A.value ? 100 - e.position : e.position, "%");
      return c("div", {
        class: ["v-slider-thumb", {
          "v-slider-thumb--focused": e.focused,
          "v-slider-thumb--pressed": e.focused && S.value
        }, e.class, s.value],
        style: [{
          "--v-slider-thumb-position": G,
          "--v-slider-thumb-size": be(u.value)
        }, e.style],
        role: "slider",
        tabindex: f.value ? -1 : 0,
        "aria-label": e.name,
        "aria-valuemin": e.min,
        "aria-valuemax": e.max,
        "aria-valuenow": e.modelValue,
        "aria-readonly": !!g.value,
        "aria-orientation": m.value,
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
          var Y;
          return [rt(c("div", {
            class: "v-slider-thumb__label-container"
          }, [c("div", {
            class: ["v-slider-thumb__label"]
          }, [c("div", null, [((Y = n["thumb-label"]) == null ? void 0 : Y.call(n, {
            modelValue: e.modelValue
          })) ?? e.modelValue.toFixed(r.value ? N.value : 1)])])]), [[En, d.value && e.focused || d.value === "always"]])];
        }
      })]);
    }), {};
  }
}), N1 = W({
  start: {
    type: Number,
    required: !0
  },
  stop: {
    type: Number,
    required: !0
  },
  ...Te()
}, "VSliderTrack"), T1 = de()({
  name: "VSliderTrack",
  props: N1(),
  emits: {},
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = He(Cr);
    if (!o) throw new Error("[Vuetify] v-slider-track must be inside v-slider or v-range-slider");
    const {
      color: i,
      parsedTicks: l,
      rounded: s,
      showTicks: a,
      tickSize: r,
      trackColor: f,
      trackFillColor: u,
      trackSize: d,
      vertical: m,
      min: h,
      max: v,
      indexFromEnd: g
    } = o, {
      roundedClasses: _
    } = Tt(s), {
      backgroundColorClasses: S,
      backgroundColorStyles: N
    } = At(u), {
      backgroundColorClasses: A,
      backgroundColorStyles: P
    } = At(f), x = b(() => `inset-${m.value ? "block" : "inline"}-${g.value ? "end" : "start"}`), C = b(() => m.value ? "height" : "width"), $ = b(() => ({
      [x.value]: "0%",
      [C.value]: "100%"
    })), V = b(() => e.stop - e.start), T = b(() => ({
      [x.value]: be(e.start, "%"),
      [C.value]: be(V.value, "%")
    })), D = b(() => a.value ? (m.value ? l.value.slice().reverse() : l.value).map((k, I) => {
      var Z;
      const B = k.value !== h.value && k.value !== v.value ? be(k.position, "%") : void 0;
      return c("div", {
        key: k.value,
        class: ["v-slider-track__tick", {
          "v-slider-track__tick--filled": k.position >= e.start && k.position <= e.stop,
          "v-slider-track__tick--first": k.value === h.value,
          "v-slider-track__tick--last": k.value === v.value
        }],
        style: {
          [x.value]: B
        }
      }, [(k.label || n["tick-label"]) && c("div", {
        class: "v-slider-track__tick-label"
      }, [((Z = n["tick-label"]) == null ? void 0 : Z.call(n, {
        tick: k,
        index: I
      })) ?? k.label])]);
    }) : []);
    return _e(() => c("div", {
      class: ["v-slider-track", _.value, e.class],
      style: [{
        "--v-slider-track-size": be(d.value),
        "--v-slider-tick-size": be(r.value)
      }, e.style]
    }, [c("div", {
      class: ["v-slider-track__background", A.value, {
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
}), O1 = W({
  ...br(),
  ...S1(),
  ...Xi(),
  modelValue: {
    type: [Number, String],
    default: 0
  }
}, "VSlider"), I1 = de()({
  name: "VSlider",
  props: O1(),
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
      rtlClasses: l
    } = Lt(), s = C1(e), a = Ke(e, "modelValue", void 0, (C) => s.roundValue(C ?? s.min.value)), {
      min: r,
      max: f,
      mousePressed: u,
      roundValue: d,
      onSliderMousedown: m,
      onSliderTouchstart: h,
      trackContainerRef: v,
      position: g,
      hasLabels: _,
      readonly: S
    } = E1({
      props: e,
      steps: s,
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
      focus: A,
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
        }, l.value, e.class],
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
            onMousedown: S.value ? void 0 : m,
            onTouchstartPassive: S.value ? void 0 : h
          }, [c("input", {
            id: T.value,
            name: e.name || T.value,
            disabled: !!e.disabled,
            readonly: !!e.readonly,
            tabindex: "-1",
            value: a.value
          }, null), c(T1, {
            ref: v,
            start: 0,
            stop: x.value
          }, {
            "tick-label": n["tick-label"]
          }), c(V1, {
            ref: i,
            "aria-describedby": D.value,
            focused: N.value,
            min: r.value,
            max: f.value,
            modelValue: a.value,
            "onUpdate:modelValue": (O) => a.value = O,
            position: x.value,
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
    var e, t, n, o, i, l, s, a, r, f, u;
    this.opt = {
      flow: ((e = this.settings) == null ? void 0 : e.flow) || this.opt.flow,
      theme: ((t = this.settings) == null ? void 0 : t.theme) || this.opt.theme,
      theme_mode: ((n = this.settings) == null ? void 0 : n.theme_mode) || this.opt.theme_mode,
      font_size: ((o = this.settings) == null ? void 0 : o.font_size) || this.opt.font_size,
      line_height: ((i = this.settings) == null ? void 0 : i.line_height) || this.opt.line_height,
      letter_spacing: ((l = this.settings) == null ? void 0 : l.letter_spacing) || this.opt.letter_spacing,
      brightness: ((s = this.settings) == null ? void 0 : s.brightness) || this.opt.brightness,
      show_comments: ((a = this.settings) == null ? void 0 : a.show_comments) ?? this.opt.show_comments,
      show_annotations: ((r = this.settings) == null ? void 0 : r.show_annotations) ?? this.opt.show_annotations,
      paging_control: ((f = this.settings) == null ? void 0 : f.paging_control) || this.opt.paging_control,
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
      show_annotations: !0,
      paging_control: "mouse_and_keyboard",
      wheel_paging: !0
    },
    themes: to
  })
}, P1 = { class: "d-inline-blockx text-center" }, D1 = { class: "d-inline-blockx text-center" }, $1 = { class: "d-inline-blockx text-center" };
function M1(e, t, n, o, i, l) {
  return ee(), ve(wn, { density: "compact" }, {
    default: p(() => [
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[22] || (t[22] = [
                  se("span", null, "亮度", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "9" }, {
                default: p(() => [
                  c(I1, {
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
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, { class: "align-center gx-3" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[23] || (t[23] = [
                  se("span", { class: "text-justify" }, "字体", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "2" }, {
                default: p(() => [
                  c(ce, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[2] || (t[2] = (s) => l.set_and_emit("font_size", e.opt.font_size - 2))
                  }, {
                    default: p(() => t[24] || (t[24] = [
                      U("A-")
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
                  se("span", P1, Ne(e.opt.font_size), 1)
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[3] || (t[3] = (s) => l.set_and_emit("font_size", e.opt.font_size + 2))
                  }, {
                    default: p(() => t[25] || (t[25] = [
                      U("A+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[4] || (t[4] = (s) => l.set_and_emit("font_size", 18))
                  }, {
                    default: p(() => t[26] || (t[26] = [
                      U("默认")
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
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[27] || (t[27] = [
                  se("span", null, "行距", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "2" }, {
                default: p(() => [
                  c(ce, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[5] || (t[5] = (s) => l.set_and_emit("line_height", e.opt.line_height - 0.1))
                  }, {
                    default: p(() => t[28] || (t[28] = [
                      U("-")
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
                  se("span", D1, Ne(e.opt.line_height.toFixed(1)), 1)
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[6] || (t[6] = (s) => l.set_and_emit("line_height", e.opt.line_height + 0.1))
                  }, {
                    default: p(() => t[29] || (t[29] = [
                      U("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[7] || (t[7] = (s) => l.set_and_emit("line_height", 1.5))
                  }, {
                    default: p(() => t[30] || (t[30] = [
                      U("默认")
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
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[31] || (t[31] = [
                  se("span", null, "间距", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "2" }, {
                default: p(() => [
                  c(ce, {
                    class: "text-justify",
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[8] || (t[8] = (s) => l.set_and_emit("letter_spacing", e.opt.letter_spacing - 1))
                  }, {
                    default: p(() => t[32] || (t[32] = [
                      U("-")
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
                  se("span", $1, Ne(e.opt.letter_spacing) + "px", 1)
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[9] || (t[9] = (s) => l.set_and_emit("letter_spacing", e.opt.letter_spacing + 1))
                  }, {
                    default: p(() => t[33] || (t[33] = [
                      U("+")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }),
              c(Ie, { cols: "3" }, {
                default: p(() => [
                  c(ce, {
                    variant: "outlined",
                    density: "comfortable",
                    onClick: t[10] || (t[10] = (s) => l.set_and_emit("letter_spacing", 0))
                  }, {
                    default: p(() => t[34] || (t[34] = [
                      U("默认")
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
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[35] || (t[35] = [
                  se("span", null, "翻页", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "10" }, {
                default: p(() => [
                  c(ko, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: p(() => [
                      c(ce, {
                        active: e.opt.flow == "paginated",
                        onClick: t[11] || (t[11] = (s) => l.set_and_emit("flow", "paginated"))
                      }, {
                        default: p(() => t[36] || (t[36] = [
                          U("左右点击")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      c(ce, {
                        active: e.opt.flow == "scrolled",
                        onClick: t[12] || (t[12] = (s) => l.set_and_emit("flow", "scrolled"))
                      }, {
                        default: p(() => t[37] || (t[37] = [
                          U("上下滑动")
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
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[38] || (t[38] = [
                  se("span", null, "控制", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "10" }, {
                default: p(() => [
                  c(ko, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: p(() => [
                      c(ce, {
                        active: e.opt.paging_control == "mouse_and_keyboard",
                        onClick: t[13] || (t[13] = (s) => l.set_and_emit("paging_control", "mouse_and_keyboard"))
                      }, {
                        default: p(() => t[39] || (t[39] = [
                          U("鼠标+键盘")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      c(ce, {
                        active: e.opt.paging_control == "keyboard_only",
                        onClick: t[14] || (t[14] = (s) => l.set_and_emit("paging_control", "keyboard_only"))
                      }, {
                        default: p(() => t[40] || (t[40] = [
                          U("仅键盘")
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
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[41] || (t[41] = [
                  se("span", { density: "compact" }, "滚轮翻页", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "10" }, {
                default: p(() => [
                  c(ko, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: p(() => [
                      c(ce, {
                        active: e.opt.wheel_paging == !0,
                        onClick: t[15] || (t[15] = (s) => l.set_and_emit("wheel_paging", !0))
                      }, {
                        default: p(() => t[42] || (t[42] = [
                          U("开启")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      c(ce, {
                        active: e.opt.wheel_paging == !1,
                        onClick: t[16] || (t[16] = (s) => l.set_and_emit("wheel_paging", !1))
                      }, {
                        default: p(() => t[43] || (t[43] = [
                          U("关闭")
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
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[44] || (t[44] = [
                  se("span", { density: "compact" }, "章评*", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "10" }, {
                default: p(() => [
                  c(ko, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: p(() => [
                      c(ce, {
                        active: e.opt.show_comments == !0,
                        onClick: t[17] || (t[17] = (s) => l.set_and_emit("show_comments", !0))
                      }, {
                        default: p(() => t[45] || (t[45] = [
                          U("开启")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      c(ce, {
                        active: e.opt.show_comments == !1,
                        onClick: t[18] || (t[18] = (s) => l.set_and_emit("show_comments", !1))
                      }, {
                        default: p(() => t[46] || (t[46] = [
                          U("关闭")
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
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, { class: "align-center" }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[47] || (t[47] = [
                  se("span", { density: "compact" }, "划线笔记", -1)
                ])),
                _: 1
              }),
              c(Ie, { cols: "10" }, {
                default: p(() => [
                  c(ko, {
                    variant: "outlined",
                    divided: "",
                    density: "compact"
                  }, {
                    default: p(() => [
                      c(ce, {
                        active: e.opt.show_annotations == !0,
                        onClick: t[19] || (t[19] = (s) => l.set_and_emit("show_annotations", !0))
                      }, {
                        default: p(() => t[48] || (t[48] = [
                          U("开启")
                        ])),
                        _: 1
                      }, 8, ["active"]),
                      c(ce, {
                        active: e.opt.show_annotations == !1,
                        onClick: t[20] || (t[20] = (s) => l.set_and_emit("show_annotations", !1))
                      }, {
                        default: p(() => t[49] || (t[49] = [
                          U("关闭")
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
      c(Fe, { class: "my-2" }, {
        default: p(() => [
          c(It, {
            class: "align-center",
            "no-gutters": ""
          }, {
            default: p(() => [
              c(Ie, { cols: "2" }, {
                default: p(() => t[50] || (t[50] = [
                  se("span", { density: "compact" }, "皮肤", -1)
                ])),
                _: 1
              }),
              (ee(!0), Ze(Ve, null, Qt(l.quick_themes, (s) => (ee(), ve(Ie, {
                key: s.id,
                class: "text-center"
              }, {
                default: p(() => [
                  c(ce, {
                    active: e.opt.theme == s.id,
                    density: "compact",
                    icon: s.icon,
                    color: s.bg,
                    onClick: (a) => l.set_theme_and_emit(s.id, s.mode)
                  }, null, 8, ["active", "icon", "color", "onClick"])
                ]),
                _: 2
              }, 1024))), 128)),
              c(Ie, {
                cols: "3",
                class: "text-right"
              }, {
                default: p(() => [
                  c(ce, {
                    variant: "text",
                    density: "compact",
                    size: "small",
                    "append-icon": "mdi-chevron-right",
                    onClick: t[21] || (t[21] = (s) => e.$emit("open-themes"))
                  }, {
                    default: p(() => t[51] || (t[51] = [
                      U("更多")
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
const iv = /* @__PURE__ */ Vn(A1, [["render", M1]]), _a = "data-candle-audiobook-active", Er = "candle-audiobook", xr = "candle-audiobook-active";
function Zo(e) {
  return String(e || "").replace(/\s+/g, "").trim();
}
function F1(e, t) {
  let n = 0, o = e.length - 1, i = -1;
  for (; n <= o; ) {
    const s = Math.floor((n + o) / 2);
    Number(e[s].start_ms) <= t ? (i = s, n = s + 1) : o = s - 1;
  }
  if (i < 0) return null;
  const l = e[i];
  return t < Number(l.end_ms) ? l : null;
}
function wc(e) {
  return decodeURIComponent(String(e || "").split(/[?#]/)[0]).replace(/^\.\//, "").replace(/^\//, "");
}
function wa(e, t) {
  const n = wc(e), o = wc(t);
  return !n || !o ? !1 : n === o || n.endsWith(`/${o}`) || o.endsWith(`/${n}`) || n.split("/").pop() === o.split("/").pop();
}
function lv(e) {
  var t, n, o, i;
  return ((t = e == null ? void 0 : e.section) == null ? void 0 : t.href) || ((n = e == null ? void 0 : e.section) == null ? void 0 : n.url) || ((i = (o = e == null ? void 0 : e.document) == null ? void 0 : o.location) == null ? void 0 : i.pathname) || "";
}
function Hs(e, t) {
  var l, s, a;
  const n = ((l = e == null ? void 0 : e.views) == null ? void 0 : l.call(e)) || [];
  let o = null;
  if ((s = n.forEach) == null || s.call(n, (r) => {
    var f, u;
    !o && wa(((f = r == null ? void 0 : r.section) == null ? void 0 : f.href) || ((u = r == null ? void 0 : r.section) == null ? void 0 : u.url), t) && (o = r);
  }), o != null && o.contents) return o.contents;
  const i = ((a = e == null ? void 0 : e.getContents) == null ? void 0 : a.call(e)) || [];
  return t ? i.find((r) => wa(lv(r), t)) || null : i[0] || null;
}
function B1(e, t) {
  return Array.from((e == null ? void 0 : e.children) || []).filter((n) => {
    var o;
    return ((o = n.localName) == null ? void 0 : o.toLowerCase()) === t;
  });
}
function L1(e, t) {
  const n = String(t || "").replace(/^\/+/, "").split("/").filter(Boolean);
  if (!n.length) return null;
  let o = e.documentElement;
  for (const i of n) {
    const l = i.match(/^([\w-]+)(?:\[(\d+)\])?$/);
    if (!l) return null;
    const s = l[1].toLowerCase(), a = Math.max(0, Number(l[2] || 1) - 1);
    if (s === "html") {
      o = e.documentElement;
      continue;
    }
    if (s === "body") {
      o = e.body;
      continue;
    }
    if (o = B1(o, s)[a], !o) return null;
  }
  return o;
}
function R1(e, t) {
  const n = Zo(t);
  if (!n) return null;
  const o = e.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote, div");
  return Array.from(o).find((i) => {
    const l = Zo(i.textContent);
    return l === n || l.includes(n) || n.includes(l);
  }) || null;
}
function H1(e, t) {
  const n = e == null ? void 0 : e.document, o = (t == null ? void 0 : t.locator) || {};
  if (!n) return null;
  let i = o.element_id ? n.getElementById(o.element_id) : null;
  return !i && o.dom_path && (i = L1(n, o.dom_path)), i || (i = R1(n, t.text)), i ? { document: n, element: i, locator: o } : null;
}
function j1(e) {
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
function z1(e, t, n) {
  const o = j1(e);
  if (!o.length) return null;
  const i = o.reduce((d, m) => d + m.data.length, 0), l = Math.min(i, Math.max(0, Number(t) || 0)), s = Number(n), a = Math.min(i, Number.isFinite(s) && s > l ? s : i), r = kc(o, l), f = kc(o, a);
  if (!r || !f) return null;
  const u = e.ownerDocument.createRange();
  return u.setStart(r.node, r.offset), u.setEnd(f.node, f.offset), u;
}
function U1(e) {
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
function sv(e) {
  var n;
  (((n = e == null ? void 0 : e.getContents) == null ? void 0 : n.call(e)) || []).forEach((o) => {
    var l, s, a;
    const i = o.document;
    i && ((a = (s = (l = i.defaultView) == null ? void 0 : l.CSS) == null ? void 0 : s.highlights) == null || a.delete(Er), i.querySelectorAll(`[${_a}]`).forEach((r) => {
      r.removeAttribute(_a), r.classList.remove(xr);
    }));
  });
}
function W1(e, t, n) {
  var f, u;
  sv(e);
  const o = H1(t, n);
  if (!o) return null;
  const { document: i, element: l, locator: s } = o;
  U1(i), l.setAttribute(_a, n.id || ""), l.classList.add(xr);
  const a = z1(l, s.start_char, s.end_char), r = i.defaultView;
  return a && ((f = r == null ? void 0 : r.CSS) != null && f.highlights) && r.Highlight && r.CSS.highlights.set(Er, new r.Highlight(a)), (u = l.scrollIntoView) == null || u.call(l, { block: "center", behavior: "smooth" }), { contents: t, document: i, element: l, range: a };
}
function q1(e, t) {
  return wa(e == null ? void 0 : e.source_key, t);
}
function G1(e, t) {
  var i;
  if (!e || !t) return !1;
  if ((i = e.locator) != null && i.element_id && e.locator.element_id === t.id) return !0;
  const n = Zo(e.text), o = Zo(t.textContent);
  return !!(n && o && (o.includes(n) || n.includes(o)));
}
const K1 = {
  key: 0,
  class: "audiobook-player",
  "data-testid": "candle-audiobook-player",
  "aria-label": "边听边读播放器"
}, Y1 = { class: "player-heading" }, X1 = {
  key: 0,
  class: "player-error",
  role: "alert"
}, J1 = { class: "player-controls" }, Z1 = ["disabled"], Q1 = ["aria-label", "disabled"], ew = ["disabled"], tw = { class: "time" }, nw = ["max", "value"], ow = { class: "time" }, iw = { class: "rate-control" }, lw = ["value"], sw = 50, aw = 100, rw = 40, uw = {
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
    const o = e, i = n, l = le(null), s = le(null), a = le(null), r = le([]), f = le(null), u = le(!1), d = le(!1), m = le(""), h = le(0), v = le(0), g = le(1), _ = le(!0), S = le(""), N = le(0), A = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 2];
    let P = null, x = null, C = null, $ = "", V = 0, T = 0;
    const D = b(() => {
      var M;
      return ((M = s.value) == null ? void 0 : M.chapters) || [];
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
    function I() {
      return o.manifestUrl || (o.editionId ? `/api/audiobooks/${o.editionId}/manifest` : "");
    }
    function B() {
      return s.value || !I() ? Promise.resolve() : C || (C = Z().finally(() => {
        C = null;
      }), C);
    }
    async function Z() {
      var M, H, ye, ge;
      d.value = !0, m.value = "";
      try {
        const ue = await o.request(I());
        if (ue.err !== "ok" || !((H = (M = ue.manifest) == null ? void 0 : M.chapters) != null && H.length))
          throw new Error(ue.msg || "当前书籍没有可播放章节");
        s.value = ue.manifest, N.value = ((ye = ue.progress) == null ? void 0 : ye.version) || 0;
        const Ae = z(), et = D.value.find((ft) => {
          var jt;
          return ft.id === ((jt = ue.progress) == null ? void 0 : jt.chapter_id);
        }) || D.value.find((ft) => ft.number === Ae.chapterNumber) || D.value[0], ot = ((ge = ue.progress) == null ? void 0 : ge.position_ms) ?? Ae.positionMs ?? 0;
        g.value = Ae.rate || 1, await ne(et, { startMs: ot, autoplay: !1, navigate: !1 });
      } catch (ue) {
        m.value = (ue == null ? void 0 : ue.message) || "有声书加载失败";
      } finally {
        d.value = !1;
      }
    }
    async function re(M) {
      var ge;
      const H = M.timeline_url || `/api/audiobooks/${s.value.id}/chapters/${M.number}/timeline`, ye = await o.request(H);
      r.value = ye.err === "ok" ? ((ge = ye.timeline) == null ? void 0 : ge.segments) || [] : [];
    }
    async function ne(M, { startMs: H = 0, autoplay: ye = !1, navigate: ge = !0 } = {}) {
      if (M) {
        d.value = !0, m.value = "", y();
        try {
          a.value = M, h.value = Math.max(0, Number(H) || 0), v.value = Number(M.duration_ms) || 0, await re(M), ge && _.value && await X(M), await at();
          const ue = l.value;
          if (!ue) return;
          const Ae = new URL(M.audio_url, window.location.href).href;
          ue.src !== Ae && (ue.src = M.audio_url, ue.load()), await Oe(ue), ue.playbackRate = g.value, ue.currentTime = Math.min(h.value / 1e3, ue.duration || 1 / 0), pe(), Ht(!0), ye && await G();
        } catch (ue) {
          m.value = (ue == null ? void 0 : ue.message) || "章节音频加载失败";
        } finally {
          d.value = !1;
        }
      }
    }
    async function X(M) {
      !o.rendition || !(M != null && M.source_key) || await o.rendition.display(M.source_key);
    }
    async function Ce() {
      if (S.value || !s.value) return;
      const M = await o.request(`/api/audiobooks/${s.value.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "candle", device_id: "candle-reader" })
      });
      M.err === "ok" && (S.value = M.session_id || "");
    }
    async function G() {
      const M = l.value;
      if (M) {
        await Ce(), M.playbackRate = g.value;
        try {
          await M.play();
        } catch (H) {
          m.value = (H == null ? void 0 : H.name) === "NotAllowedError" ? "请再次点击播放" : "无法播放章节音频";
        }
      }
    }
    async function Y() {
      s.value || await B();
      const M = l.value;
      !M || !a.value || (M.paused ? await G() : M.pause());
    }
    function te() {
      const M = l.value;
      M && (v.value = Number.isFinite(M.duration) ? Math.round(M.duration * 1e3) : v.value);
    }
    function Oe(M) {
      return M.readyState >= HTMLMediaElement.HAVE_METADATA ? Promise.resolve() : new Promise((H, ye) => {
        const ge = () => {
          Ae(), H();
        }, ue = () => {
          Ae(), ye(new Error("章节音频元数据加载失败"));
        }, Ae = () => {
          M.removeEventListener("loadedmetadata", ge), M.removeEventListener("error", ue);
        };
        M.addEventListener("loadedmetadata", ge), M.addEventListener("error", ue);
      });
    }
    function We() {
      u.value = !0, T = Date.now(), Ht(!0), Re(), ie();
    }
    function qe() {
      u.value = !1, nt(), Qe(), K(!0), pe();
    }
    async function oe() {
      u.value = !1, nt(), await K(!0, O.value === D.value.length - 1), O.value < D.value.length - 1 && await ne(D.value[O.value + 1], { autoplay: !0 });
    }
    function Ee() {
      var M;
      (M = l.value) != null && M.src && (m.value = "章节音频加载失败", u.value = !1, nt());
    }
    function Re() {
      nt(), P = window.setInterval(Qe, 150), x = window.setInterval(() => void K(), 1e4);
    }
    function nt() {
      P && window.clearInterval(P), x && window.clearInterval(x), P = null, x = null;
    }
    function Qe() {
      const M = l.value;
      M && (h.value = Math.round(M.currentTime * 1e3), Ht(), pe());
    }
    function Ht(M = !1) {
      const H = F1(r.value, h.value), ye = (H == null ? void 0 : H.id) || "";
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
      let ue = Hs(o.rendition, ge);
      !ue && o.rendition && _.value && await o.rendition.display(ge);
      for (let ot = 0; ot < rw; ot += 1) {
        if (H !== V || !_.value) return;
        if (ue = Hs(o.rendition, ge), ue && W1(o.rendition, ue, M)) {
          if (await new Promise((lt) => window.setTimeout(lt, aw)), H !== V || !_.value) return;
          const ft = Hs(o.rendition, ge), jt = (et = ft == null ? void 0 : ft.document) == null ? void 0 : et.querySelector("[data-candle-audiobook-active]");
          if ((jt == null ? void 0 : jt.getAttribute("data-candle-audiobook-active")) === M.id) return;
        }
        await new Promise((ft) => window.setTimeout(ft, sw));
      }
      H === V && _.value && console.warn("[candle-audiobook] 无法定位时间轴片段", M.id);
    }
    function qn() {
      f.value && _.value && u.value && Wn(f.value);
    }
    function y() {
      V += 1, sv(o.rendition);
    }
    function w() {
      !a.value || !f.value || (_.value = !1, y());
    }
    async function F() {
      _.value = !0, f.value && await Wn(f.value);
    }
    function j(M) {
      const H = l.value;
      h.value = Math.max(0, Math.min(v.value, M)), H && (H.currentTime = h.value / 1e3), Ht(!0), pe();
    }
    function L() {
      l.value && (l.value.playbackRate = g.value), pe();
    }
    async function R() {
      O.value > 0 && await ne(D.value[O.value - 1], { autoplay: u.value });
    }
    async function Q() {
      O.value < D.value.length - 1 && await ne(D.value[O.value + 1], { autoplay: u.value });
    }
    async function J(M) {
      var jt, lt, Pt, co, Vr, Ji, Nr, Tr, Or;
      if (s.value || await B(), !s.value || !M) return !1;
      _.value = !0;
      const H = ((jt = M.toc) == null ? void 0 : jt.href) || ((lt = M.toc) == null ? void 0 : lt.id) || lv(M.contents), ye = D.value.find((fo) => q1(fo, H)) || a.value || D.value[0];
      (ye == null ? void 0 : ye.id) !== ((Pt = a.value) == null ? void 0 : Pt.id) && await ne(ye, { navigate: !1 });
      const ge = ((Vr = (co = M.cfi) == null ? void 0 : co.toString) == null ? void 0 : Vr.call(co)) || M.cfi, ue = ge && ((Nr = (Ji = o.rendition) == null ? void 0 : Ji.getRange) == null ? void 0 : Nr.call(Ji, ge)), Ae = ((Tr = ue == null ? void 0 : ue.startContainer) == null ? void 0 : Tr.nodeType) === Node.TEXT_NODE ? ue.startContainer.parentElement : ue == null ? void 0 : ue.startContainer, et = ((Or = Ae == null ? void 0 : Ae.closest) == null ? void 0 : Or.call(Ae, "p, h1, h2, h3, h4, h5, h6, li, blockquote")) || null, ot = Zo(et == null ? void 0 : et.textContent), ft = ot && r.value.find((fo) => Zo(fo.text) === ot) || et && r.value.find((fo) => G1(fo, et)) || r.value.find((fo) => Number(fo.index) === Number(M.segment_id));
      return ft ? (await ne(ye, { startMs: ft.start_ms, autoplay: !0, navigate: !0 }), !0) : !1;
    }
    async function K(M = !1, H = !1) {
      var Ae;
      if (!S.value || !a.value) return;
      const ye = Date.now(), ge = u.value && T ? Math.min(6e4, Math.max(0, ye - T)) : 0;
      if (!M && ge < 9e3) return;
      T = ye;
      const ue = await o.request(`/api/audiobook-sessions/${S.value}`, {
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
      (ue.err === "ok" || ue.err === "progress.conflict") && (N.value = ue.version || N.value);
    }
    function z() {
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
      !("mediaSession" in navigator) || !a.value || (navigator.mediaSession.metadata = new MediaMetadata({ title: a.value.title, album: "边听边读" }), navigator.mediaSession.setActionHandler("play", G), navigator.mediaSession.setActionHandler("pause", () => {
        var M;
        return (M = l.value) == null ? void 0 : M.pause();
      }), navigator.mediaSession.setActionHandler("previoustrack", R), navigator.mediaSession.setActionHandler("nexttrack", Q));
    }
    function me(M) {
      const H = Math.max(0, Math.floor((M || 0) / 1e3));
      return `${Math.floor(H / 60)}:${String(H % 60).padStart(2, "0")}`;
    }
    return wt(() => {
      var M, H;
      nt(), (H = (M = o.rendition) == null ? void 0 : M.off) == null || H.call(M, "rendered", qn), y(), S.value && o.request(`/api/audiobook-sessions/${S.value}`, { method: "POST" });
    }), t({ loadManifest: B, playFromSelection: J, returnToNarration: F, suspendFollow: w }), (M, H) => {
      var ye, ge;
      return e.visible ? (ee(), Ze("section", K1, [
        se("header", Y1, [
          se("div", null, [
            H[3] || (H[3] = se("span", { class: "player-kicker" }, "边听边读", -1)),
            se("strong", null, Ne(((ye = a.value) == null ? void 0 : ye.title) || "正在载入有声书"), 1)
          ]),
          se("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "关闭听书播放器",
            onClick: H[0] || (H[0] = (ue) => i("close"))
          }, [
            c(Pe, { size: "20" }, {
              default: p(() => H[4] || (H[4] = [
                U("mdi-close")
              ])),
              _: 1
            })
          ])
        ]),
        se("p", {
          class: yn(["active-dialogue", { muted: !f.value }])
        }, Ne(((ge = f.value) == null ? void 0 : ge.text) || (d.value ? "正在加载章节时间轴…" : "片段间留白")), 3),
        m.value ? (ee(), Ze("div", X1, Ne(m.value), 1)) : ze("", !0),
        se("div", J1, [
          se("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "上一章",
            disabled: O.value <= 0,
            onClick: R
          }, [
            c(Pe, null, {
              default: p(() => H[5] || (H[5] = [
                U("mdi-skip-previous")
              ])),
              _: 1
            })
          ], 8, Z1),
          se("button", {
            type: "button",
            class: "play-button",
            "aria-label": u.value ? "暂停听书" : "播放听书",
            disabled: d.value || !a.value,
            onClick: Y
          }, [
            c(Pe, null, {
              default: p(() => [
                U(Ne(u.value ? "mdi-pause" : "mdi-play"), 1)
              ]),
              _: 1
            })
          ], 8, Q1),
          se("button", {
            type: "button",
            class: "icon-button",
            "aria-label": "下一章",
            disabled: O.value >= D.value.length - 1,
            onClick: Q
          }, [
            c(Pe, null, {
              default: p(() => H[6] || (H[6] = [
                U("mdi-skip-next")
              ])),
              _: 1
            })
          ], 8, ew),
          se("span", tw, Ne(me(h.value)), 1),
          se("input", {
            class: "timeline-slider",
            type: "range",
            min: "0",
            max: Math.max(v.value, 1),
            step: "100",
            value: h.value,
            "aria-label": "听书进度",
            onInput: H[1] || (H[1] = (ue) => j(Number(ue.target.value)))
          }, null, 40, nw),
          se("span", ow, Ne(me(v.value)), 1),
          se("label", iw, [
            H[7] || (H[7] = se("span", { class: "sr-only" }, "播放速度", -1)),
            rt(se("select", {
              "onUpdate:modelValue": H[2] || (H[2] = (ue) => g.value = ue),
              "aria-label": "播放速度",
              onChange: L
            }, [
              (ee(), Ze(Ve, null, Qt(A, (ue) => se("option", {
                key: ue,
                value: ue
              }, "x" + Ne(ue), 9, lw)), 64))
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
        _.value ? ze("", !0) : (ee(), Ze("button", {
          key: 1,
          type: "button",
          class: "return-button",
          "data-testid": "return-to-narration",
          onClick: F
        }, [
          c(Pe, { size: "18" }, {
            default: p(() => H[8] || (H[8] = [
              U("mdi-target")
            ])),
            _: 1
          }),
          H[9] || (H[9] = U(" 回到朗读位置 "))
        ])),
        se("audio", {
          ref_key: "audioElement",
          ref: l,
          preload: "metadata",
          onLoadedmetadata: te,
          onPlay: We,
          onPause: qe,
          onEnded: oe,
          onError: Ee
        }, null, 544)
      ])) : ze("", !0);
    };
  }
}, av = /* @__PURE__ */ Vn(uw, [["__scopeId", "data-v-f2028a04"]]), cw = "candle-reader:annotations:v1:";
function Sc(e) {
  return e.client_id || e.id;
}
function ka() {
  var e;
  return (e = window.crypto) != null && e.randomUUID ? window.crypto.randomUUID() : `candle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function dw(e) {
  const t = Array.isArray(e) ? e : e == null ? void 0 : e.annotations;
  if (!Array.isArray(t)) throw new Error("读取笔记的回调必须返回数组或 { annotations }");
  return t;
}
function fw(e) {
  const t = (e == null ? void 0 : e.annotation) || e;
  if (!t || typeof t != "object" || Array.isArray(t))
    throw new Error("写入笔记的回调必须返回笔记对象或 { annotation }");
  return t;
}
function mw(e, t) {
  return `${cw}${encodeURIComponent(String(e || t || "unknown-book"))}`;
}
function vw({ bookId: e, bookUrl: t, storage: n } = {}) {
  const o = mw(e, t);
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
      const s = JSON.parse(i.getItem(o) || "[]");
      return Array.isArray(s) ? s : [];
    } catch (s) {
      return console.warn("Candle Reader 本地笔记损坏，已忽略：", s), [];
    }
  }
  return {
    async load({ chapter: s } = {}) {
      const a = l();
      return s ? a.filter((r) => r.chapter === s) : a;
    },
    async save(s) {
      const a = (/* @__PURE__ */ new Date()).toISOString(), r = l(), f = Sc(s) || ka(), u = r.findIndex((h) => Sc(h) === f), d = u >= 0 ? r[u] : null, m = {
        ...d,
        ...s,
        id: (d == null ? void 0 : d.id) || s.id || f,
        client_id: s.client_id || (d == null ? void 0 : d.client_id) || f,
        created_at: (d == null ? void 0 : d.created_at) || s.created_at || a,
        updated_at: a
      };
      return u >= 0 ? r.splice(u, 1, m) : r.push(m), i.setItem(o, JSON.stringify(r)), m;
    }
  };
}
function hw({ callbacks: e, bookId: t, bookUrl: n, storage: o } = {}) {
  const i = e != null;
  if (i && (typeof e.load != "function" || typeof e.save != "function"))
    throw new Error("annotation_callbacks 必须同时提供 load 和 save 函数");
  const l = i ? e : vw({ bookId: t, bookUrl: n, storage: o }), s = { book_id: t || null, book_url: n || "" };
  return {
    source: i ? "callback" : "localStorage",
    async load(a = {}) {
      return dw(await l.load({ ...s, ...a }));
    },
    async save(a) {
      return fw(await l.save({ ...a }, s));
    }
  };
}
const gw = W({
  ...Te(),
  ...Eb({
    fullHeight: !0
  }),
  ...tt()
}, "VApp"), yw = de()({
  name: "VApp",
  props: gw(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = vt(e), {
      layoutClasses: i,
      getLayoutItem: l,
      items: s,
      layoutRef: a
    } = Vb(e), {
      rtlClasses: r
    } = Lt();
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
      getLayoutItem: l,
      items: s,
      theme: o
    };
  }
}), pw = W({
  scrollTarget: {
    type: String
  },
  scrollThreshold: {
    type: [String, Number],
    default: 300
  }
}, "scroll");
function bw(e) {
  let t = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
  const {
    canScroll: n
  } = t;
  let o = 0, i = 0;
  const l = le(null), s = we(0), a = we(0), r = we(0), f = we(!1), u = we(!1), d = b(() => Number(e.scrollThreshold)), m = b(() => Sn((d.value - s.value) / d.value || 0)), h = () => {
    const v = l.value;
    if (!v || n && !n.value) return;
    o = s.value, s.value = "window" in v ? v.pageYOffset : v.scrollTop;
    const g = v instanceof Window ? document.documentElement.scrollHeight : v.scrollHeight;
    if (i !== g) {
      i = g;
      return;
    }
    u.value = s.value < o, r.value = Math.abs(s.value - d.value);
  };
  return ke(u, () => {
    a.value = a.value || s.value;
  }), ke(f, () => {
    a.value = 0;
  }), Cn(() => {
    ke(() => e.scrollTarget, (v) => {
      var _;
      const g = v ? document.querySelector(v) : window;
      if (!g) {
        bn(`Unable to locate element with identifier ${v}`);
        return;
      }
      g !== l.value && ((_ = l.value) == null || _.removeEventListener("scroll", h), l.value = g, l.value.addEventListener("scroll", h, {
        passive: !0
      }));
    }, {
      immediate: !0
    });
  }), wt(() => {
    var v;
    (v = l.value) == null || v.removeEventListener("scroll", h);
  }), n && ke(n, h, {
    immediate: !0
  }), {
    scrollThreshold: d,
    currentScroll: s,
    currentThreshold: r,
    isScrollActive: f,
    scrollRatio: m,
    // required only for testing
    // probably can be removed
    // later (2 chars chlng)
    isScrollingUp: u,
    savedScroll: a
  };
}
const _w = W({
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
  ...wm(),
  ...Bf(),
  ...pw(),
  height: {
    type: [Number, String],
    default: 64
  }
}, "VAppBar"), ww = de()({
  name: "VAppBar",
  props: _w(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = le(), i = Ke(e, "modelValue"), l = b(() => {
      var A;
      const N = new Set(((A = e.scrollBehavior) == null ? void 0 : A.split(" ")) ?? []);
      return {
        hide: N.has("hide"),
        fullyHide: N.has("fully-hide"),
        inverted: N.has("inverted"),
        collapse: N.has("collapse"),
        elevate: N.has("elevate"),
        fadeImage: N.has("fade-image")
        // shrink: behavior.has('shrink'),
      };
    }), s = b(() => {
      const N = l.value;
      return N.hide || N.fullyHide || N.inverted || N.collapse || N.elevate || N.fadeImage || // behavior.shrink ||
      !i.value;
    }), {
      currentScroll: a,
      scrollThreshold: r,
      isScrollingUp: f,
      scrollRatio: u
    } = bw(e, {
      canScroll: s
    }), d = b(() => l.value.hide || l.value.fullyHide), m = b(() => e.collapse || l.value.collapse && (l.value.inverted ? u.value > 0 : u.value === 0)), h = b(() => e.flat || l.value.fullyHide && !i.value || l.value.elevate && (l.value.inverted ? a.value > 0 : a.value === 0)), v = b(() => l.value.fadeImage ? l.value.inverted ? 1 - u.value : u.value : void 0), g = b(() => {
      var P, x;
      if (l.value.hide && l.value.inverted) return 0;
      const N = ((P = o.value) == null ? void 0 : P.contentHeight) ?? 0, A = ((x = o.value) == null ? void 0 : x.extensionHeight) ?? 0;
      return d.value ? a.value < r.value || l.value.fullyHide ? N + A : N : N + A;
    });
    oo(b(() => !!e.scrollBehavior), () => {
      nn(() => {
        d.value ? l.value.inverted ? i.value = a.value > r.value : i.value = f.value || a.value < r.value : i.value = !0;
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
      const N = Ul.filterProps(e);
      return c(Ul, xe({
        ref: o,
        class: ["v-app-bar", {
          "v-app-bar--bottom": e.location === "bottom"
        }, e.class],
        style: [{
          ...S.value,
          "--v-toolbar-image-opacity": v.value,
          height: void 0,
          ..._.value
        }, e.style]
      }, N, {
        collapse: m.value,
        flat: h.value
      }), n);
    }), {};
  }
}), kw = W({
  bordered: Boolean,
  color: String,
  content: [Number, String],
  dot: Boolean,
  floating: Boolean,
  icon: Ue,
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
  ...Je(),
  ...tt(),
  ...qi({
    transition: "scale-rotate-transition"
  })
}, "VBadge"), Cc = de()({
  name: "VBadge",
  inheritAttrs: !1,
  props: kw(),
  setup(e, t) {
    const {
      backgroundColorClasses: n,
      backgroundColorStyles: o
    } = At(ae(e, "color")), {
      roundedClasses: i
    } = Tt(e), {
      t: l
    } = ss(), {
      textColorClasses: s,
      textColorStyles: a
    } = Ft(ae(e, "textColor")), {
      themeClasses: r
    } = Mf(), {
      locationStyles: f
    } = Ui(e, !0, (u) => (e.floating ? e.dot ? 2 : 4 : e.dot ? 8 : 12) + (["top", "bottom"].includes(u) ? +(e.offsetY ?? 0) : ["left", "right"].includes(u) ? +(e.offsetX ?? 0) : 0));
    return _e(() => {
      const u = Number(e.content), d = !e.max || isNaN(u) ? e.content : u <= +e.max ? u : `${e.max}+`, [m, h] = aa(t.attrs, ["aria-atomic", "aria-label", "aria-live", "role", "title"]);
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
          var v, g;
          return [c("div", {
            class: "v-badge__wrapper"
          }, [(g = (v = t.slots).default) == null ? void 0 : g.call(v), c(vn, {
            transition: e.transition
          }, {
            default: () => {
              var _, S;
              return [rt(c("span", xe({
                class: ["v-badge__badge", r.value, n.value, i.value, s.value],
                style: [o.value, a.value, e.inline ? {} : f.value],
                "aria-atomic": "true",
                "aria-label": l(e.label, u),
                "aria-live": "polite",
                role: "status"
              }, m), [e.dot ? void 0 : t.slots.badge ? (S = (_ = t.slots).badge) == null ? void 0 : S.call(_) : e.icon ? c(Pe, {
                icon: e.icon
              }, null) : d]), [[En, e.modelValue]])];
            }
          })])];
        }
      });
    }), {};
  }
}), Sw = W({
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
  ...Gt(),
  ...Hn(),
  ...Nt(),
  ...Bf({
    name: "bottom-navigation"
  }),
  ...Je({
    tag: "header"
  }),
  ...lr({
    selectedClass: "v-btn--selected"
  }),
  ...tt()
}, "VBottomNavigation"), Cw = de()({
  name: "VBottomNavigation",
  props: Sw(),
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
      backgroundColorClasses: l,
      backgroundColorStyles: s
    } = At(ae(e, "bgColor")), {
      densityClasses: a
    } = ln(e), {
      elevationClasses: r
    } = jn(e), {
      roundedClasses: f
    } = Tt(e), {
      ssrBootStyles: u
    } = Gi(), d = b(() => Number(e.height) - (e.density === "comfortable" ? 8 : 0) - (e.density === "compact" ? 16 : 0)), m = Ke(e, "active", e.active), {
      layoutItemStyles: h
    } = Rf({
      id: e.name,
      order: b(() => parseInt(e.order, 10)),
      position: b(() => "bottom"),
      layoutSize: b(() => m.value ? d.value : 0),
      elementSize: d,
      active: m,
      absolute: ae(e, "absolute")
    });
    return cs(e, sr), so({
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
        "v-bottom-navigation--active": m.value,
        "v-bottom-navigation--grow": e.grow,
        "v-bottom-navigation--shift": e.mode === "shift"
      }, o.value, l.value, i.value, a.value, r.value, f.value, e.class],
      style: [s.value, h.value, {
        height: be(d.value)
      }, u.value, e.style]
    }, {
      default: () => [n.default && c("div", {
        class: "v-bottom-navigation__content"
      }, [n.default()])]
    })), {};
  }
}), Ew = W({
  inset: Boolean,
  ...Wm({
    transition: "bottom-sheet-transition"
  })
}, "VBottomSheet"), yo = de()({
  name: "VBottomSheet",
  props: Ew(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ke(e, "modelValue");
    return _e(() => {
      const i = gn.filterProps(e);
      return c(gn, xe(i, {
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
  falseIcon: Ue,
  trueIcon: Ue,
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
  ...Gt(),
  ...tt()
}, "SelectionControlGroup"), xw = W({
  ...uv({
    defaultsTarget: "VSelectionControl"
  })
}, "VSelectionControlGroup");
de()({
  name: "VSelectionControlGroup",
  props: xw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ke(e, "modelValue"), i = on(), l = b(() => e.id || `v-selection-control-group-${i}`), s = b(() => e.name || l.value), a = /* @__PURE__ */ new Set();
    return yt(rv, {
      modelValue: o,
      forceUpdate: () => {
        a.forEach((r) => r());
      },
      onForceUpdate: (r) => {
        a.add(r), Bt(() => {
          a.delete(r);
        });
      }
    }), so({
      [e.defaultsTarget]: {
        color: ae(e, "color"),
        disabled: ae(e, "disabled"),
        density: ae(e, "density"),
        error: ae(e, "error"),
        inline: ae(e, "inline"),
        modelValue: o,
        multiple: b(() => !!e.multiple || e.multiple == null && Array.isArray(o.value)),
        name: s,
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
function Vw(e) {
  const t = He(rv, void 0), {
    densityClasses: n
  } = ln(e), o = Ke(e, "modelValue"), i = b(() => e.trueValue !== void 0 ? e.trueValue : e.value !== void 0 ? e.value : !0), l = b(() => e.falseValue !== void 0 ? e.falseValue : !1), s = b(() => !!e.multiple || e.multiple == null && Array.isArray(o.value)), a = b({
    get() {
      const h = t ? t.modelValue.value : o.value;
      return s.value ? pn(h).some((v) => e.valueComparator(v, i.value)) : e.valueComparator(h, i.value);
    },
    set(h) {
      if (e.readonly) return;
      const v = h ? i.value : l.value;
      let g = v;
      s.value && (g = h ? [...pn(o.value), v] : pn(o.value).filter((_) => !e.valueComparator(_, i.value))), t ? t.modelValue.value = g : o.value = g;
    }
  }), {
    textColorClasses: r,
    textColorStyles: f
  } = Ft(b(() => {
    if (!(e.error || e.disabled))
      return a.value ? e.color : e.baseColor;
  })), {
    backgroundColorClasses: u,
    backgroundColorStyles: d
  } = At(b(() => a.value && !e.error && !e.disabled ? e.color : e.baseColor)), m = b(() => a.value ? e.trueIcon : e.falseIcon);
  return {
    group: t,
    densityClasses: n,
    trueValue: i,
    falseValue: l,
    model: a,
    textColorClasses: r,
    textColorStyles: f,
    backgroundColorClasses: u,
    backgroundColorStyles: d,
    icon: m
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
      densityClasses: l,
      icon: s,
      model: a,
      textColorClasses: r,
      textColorStyles: f,
      backgroundColorClasses: u,
      backgroundColorStyles: d,
      trueValue: m
    } = Vw(e), h = on(), v = we(!1), g = we(!1), _ = le(), S = b(() => e.id || `input-${h}`), N = b(() => !e.disabled && !e.readonly);
    i == null || i.onForceUpdate(() => {
      _.value && (_.value.checked = a.value);
    });
    function A($) {
      N.value && (v.value = !0, hf($.target, ":focus-visible") !== !1 && (g.value = !0));
    }
    function P() {
      v.value = !1, g.value = !1;
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
      }) : e.label, [V, T] = is(n), D = c("input", xe({
        ref: _,
        checked: a.value,
        disabled: !!e.disabled,
        id: S.value,
        onBlur: P,
        onFocus: A,
        onInput: C,
        "aria-disabled": !!e.disabled,
        "aria-label": e.label,
        type: e.type,
        value: m.value,
        name: e.name,
        "aria-checked": e.type === "checkbox" ? a.value : void 0
      }, T), null);
      return c("div", xe({
        class: ["v-selection-control", {
          "v-selection-control--dirty": a.value,
          "v-selection-control--disabled": e.disabled,
          "v-selection-control--error": e.error,
          "v-selection-control--focused": v.value,
          "v-selection-control--focus-visible": g.value,
          "v-selection-control--inline": e.inline
        }, l.value, e.class]
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
        icon: s.value,
        props: {
          onFocus: A,
          onBlur: P,
          id: S.value
        }
      })) ?? c(Ve, null, [s.value && c(Pe, {
        key: "icon",
        icon: s.value
      }, null), D])]), [[Rn("ripple"), e.ripple && [!e.disabled && !e.readonly, null, ["center", "circle"]]]])]), $ && c(pr, {
        for: S.value,
        onClick: x
      }, {
        default: () => [$]
      })]);
    }), {
      isFocused: v,
      input: _
    };
  }
}), dv = W({
  indeterminate: Boolean,
  indeterminateIcon: {
    type: Ue,
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
    const o = Ke(e, "indeterminate"), i = Ke(e, "modelValue");
    function l(r) {
      o.value && (o.value = !1);
    }
    const s = b(() => o.value ? e.indeterminateIcon : e.falseIcon), a = b(() => o.value ? e.indeterminateIcon : e.trueIcon);
    return _e(() => {
      const r = Fo(Ec.filterProps(e), ["modelValue"]);
      return c(Ec, xe(r, {
        modelValue: i.value,
        "onUpdate:modelValue": [(f) => i.value = f, l],
        class: ["v-checkbox-btn", e.class],
        style: e.style,
        type: "checkbox",
        falseIcon: s.value,
        trueIcon: a.value,
        "aria-checked": o.value ? "mixed" : void 0
      }), n);
    }), {};
  }
}), Nw = W({
  ...Xi(),
  ...Fo(dv(), ["inline"])
}, "VCheckbox"), Tw = de()({
  name: "VCheckbox",
  inheritAttrs: !1,
  props: Nw(),
  emits: {
    "update:modelValue": (e) => !0,
    "update:focused": (e) => !0
  },
  setup(e, t) {
    let {
      attrs: n,
      slots: o
    } = t;
    const i = Ke(e, "modelValue"), {
      isFocused: l,
      focus: s,
      blur: a
    } = Yi(e), r = on(), f = b(() => e.id || `checkbox-${r}`);
    return _e(() => {
      const [u, d] = is(n), m = io.filterProps(e), h = xc.filterProps(e);
      return c(io, xe({
        class: ["v-checkbox", e.class]
      }, u, m, {
        modelValue: i.value,
        "onUpdate:modelValue": (v) => i.value = v,
        id: f.value,
        focused: l.value,
        style: e.style
      }), {
        ...o,
        default: (v) => {
          let {
            id: g,
            messagesId: _,
            isDisabled: S,
            isReadonly: N,
            isValid: A
          } = v;
          return c(xc, xe(h, {
            id: g.value,
            "aria-describedby": _.value,
            disabled: S.value,
            readonly: N.value
          }, d, {
            error: A.value === !1,
            modelValue: i.value,
            "onUpdate:modelValue": (P) => i.value = P,
            onFocus: s,
            onBlur: a
          }), o);
        }
      });
    }), {};
  }
}), Ow = W({
  scrollable: Boolean,
  ...Te(),
  ...zn(),
  ...Je({
    tag: "main"
  })
}, "VMain"), Iw = de()({
  name: "VMain",
  props: Ow(),
  setup(e, t) {
    let {
      slots: n
    } = t;
    const {
      dimensionStyles: o
    } = Un(e), {
      mainStyles: i
    } = Lf(), {
      ssrBootStyles: l
    } = Gi();
    return _e(() => c(e.tag, {
      class: ["v-main", {
        "v-main--scrollable": e.scrollable
      }, e.class],
      style: [i.value, l.value, o.value, e.style]
    }, {
      default: () => {
        var s, a;
        return [e.scrollable ? c("div", {
          class: "v-main__scroller"
        }, [(s = n.default) == null ? void 0 : s.call(n)]) : (a = n.default) == null ? void 0 : a.call(n)];
      }
    })), {};
  }
});
function Aw(e) {
  const t = we(e());
  let n = -1;
  function o() {
    clearInterval(n);
  }
  function i() {
    o(), at(() => t.value = e());
  }
  function l(s) {
    const a = s ? getComputedStyle(s) : {
      transitionDuration: 0.2
    }, r = parseFloat(a.transitionDuration) * 1e3 || 200;
    if (o(), t.value <= 0) return;
    const f = performance.now();
    n = window.setInterval(() => {
      const u = performance.now() - f + r;
      t.value = Math.max(e() - u, 0), t.value <= 0 && o();
    }, r);
  }
  return Bt(o), {
    clear: o,
    time: t,
    start: l,
    reset: i
  };
}
const Pw = W({
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
  ...ms(),
  ...Nt(),
  ...uo(),
  ...tt(),
  ...Fo(kr({
    transition: "v-snackbar-transition"
  }), ["persistent", "noClickAnimation", "scrim", "scrollStrategy"])
}, "VSnackbar"), Dw = de()({
  name: "VSnackbar",
  props: Pw(),
  emits: {
    "update:modelValue": (e) => !0
  },
  setup(e, t) {
    let {
      slots: n
    } = t;
    const o = Ke(e, "modelValue"), {
      positionClasses: i
    } = vs(e), {
      scopeId: l
    } = gs(), {
      themeClasses: s
    } = vt(e), {
      colorClasses: a,
      colorStyles: r,
      variantClasses: f
    } = ni(e), {
      roundedClasses: u
    } = Tt(e), d = Aw(() => Number(e.timeout)), m = le(), h = le(), v = we(!1), g = we(0), _ = le(), S = He(Ti, void 0);
    oo(() => !!S, () => {
      const O = Lf();
      nn(() => {
        _.value = O.mainStyles.value;
      });
    }), ke(o, A), ke(() => e.timeout, A), Cn(() => {
      o.value && A();
    });
    let N = -1;
    function A() {
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
      v.value = !0, P();
    }
    function C() {
      v.value = !1, A();
    }
    function $(O) {
      g.value = O.touches[0].clientY;
    }
    function V(O) {
      Math.abs(g.value - O.changedTouches[0].clientY) > 50 && (o.value = !1);
    }
    function T() {
      v.value && C();
    }
    const D = b(() => e.location.split(" ").reduce((O, k) => (O[`v-snackbar--${k}`] = !0, O), {}));
    return _e(() => {
      const O = Pi.filterProps(e), k = !!(n.default || n.text || e.text);
      return c(Pi, xe({
        ref: m,
        class: ["v-snackbar", {
          "v-snackbar--active": o.value,
          "v-snackbar--multi-line": e.multiLine && !e.vertical,
          "v-snackbar--timer": !!e.timer,
          "v-snackbar--vertical": e.vertical
        }, D.value, i.value, e.class],
        style: [_.value, e.style]
      }, O, {
        modelValue: o.value,
        "onUpdate:modelValue": (I) => o.value = I,
        contentProps: xe({
          class: ["v-snackbar__wrapper", s.value, a.value, u.value, f.value],
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
      }, l), {
        default: () => {
          var I, B;
          return [ti(!1, "v-snackbar"), e.timer && !v.value && c("div", {
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
          }, [((I = n.text) == null ? void 0 : I.call(n)) ?? e.text, (B = n.default) == null ? void 0 : B.call(n)]), n.actions && c(mt, {
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
    }), ii({}, m);
  }
}), $w = W({
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
}, "VTextarea"), Mw = de()({
  name: "VTextarea",
  directives: {
    Intersect: fr
  },
  inheritAttrs: !1,
  props: $w(),
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
    const l = Ke(e, "modelValue"), {
      isFocused: s,
      focus: a,
      blur: r
    } = Yi(e), f = b(() => typeof e.counterValue == "function" ? e.counterValue(l.value) : (l.value || "").toString().length), u = b(() => {
      if (n.maxlength) return n.maxlength;
      if (!(!e.counter || typeof e.counter != "number" && typeof e.counter != "string"))
        return e.counter;
    });
    function d(O, k) {
      var I, B;
      !e.autofocus || !O || (B = (I = k[0].target) == null ? void 0 : I.focus) == null || B.call(I);
    }
    const m = le(), h = le(), v = we(""), g = le(), _ = b(() => e.persistentPlaceholder || s.value || e.active);
    function S() {
      var O;
      g.value !== document.activeElement && ((O = g.value) == null || O.focus()), s.value || a();
    }
    function N(O) {
      S(), o("click:control", O);
    }
    function A(O) {
      o("mousedown:control", O);
    }
    function P(O) {
      O.stopPropagation(), S(), at(() => {
        l.value = "", mf(e["onClick:clear"], O);
      });
    }
    function x(O) {
      var I;
      const k = O.target;
      if (l.value = k.value, (I = e.modelModifiers) != null && I.trim) {
        const B = [k.selectionStart, k.selectionEnd];
        at(() => {
          k.selectionStart = B[0], k.selectionEnd = B[1];
        });
      }
    }
    const C = le(), $ = le(+e.rows), V = b(() => ["plain", "underlined"].includes(e.variant));
    nn(() => {
      e.autoGrow || ($.value = +e.rows);
    });
    function T() {
      e.autoGrow && at(() => {
        if (!C.value || !h.value) return;
        const O = getComputedStyle(C.value), k = getComputedStyle(h.value.$el), I = parseFloat(O.getPropertyValue("--v-field-padding-top")) + parseFloat(O.getPropertyValue("--v-input-padding-top")) + parseFloat(O.getPropertyValue("--v-field-padding-bottom")), B = C.value.scrollHeight, Z = parseFloat(O.lineHeight), re = Math.max(parseFloat(e.rows) * Z + I, parseFloat(k.getPropertyValue("--v-input-control-height"))), ne = parseFloat(e.maxRows) * Z + I || 1 / 0, X = Sn(B ?? 0, re, ne);
        $.value = Math.floor((X - I) / Z), v.value = be(X);
      });
    }
    Cn(T), ke(l, T), ke(() => e.rows, T), ke(() => e.maxRows, T), ke(() => e.density, T);
    let D;
    return ke(C, (O) => {
      O ? (D = new ResizeObserver(T), D.observe(C.value)) : D == null || D.disconnect();
    }), wt(() => {
      D == null || D.disconnect();
    }), _e(() => {
      const O = !!(i.counter || e.counter || e.counterValue), k = !!(O || i.details), [I, B] = is(n), {
        modelValue: Z,
        ...re
      } = io.filterProps(e), ne = $m(e);
      return c(io, xe({
        ref: m,
        modelValue: l.value,
        "onUpdate:modelValue": (X) => l.value = X,
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
      }, I, re, {
        centerAffix: $.value === 1 && !V.value,
        focused: s.value
      }), {
        ...i,
        default: (X) => {
          let {
            id: Ce,
            isDisabled: G,
            isDirty: Y,
            isReadonly: te,
            isValid: Oe
          } = X;
          return c(wr, xe({
            ref: h,
            style: {
              "--v-textarea-control-height": v.value
            },
            onClick: N,
            onMousedown: A,
            "onClick:clear": P,
            "onClick:prependInner": e["onClick:prependInner"],
            "onClick:appendInner": e["onClick:appendInner"]
          }, ne, {
            id: Ce.value,
            active: _.value || Y.value,
            centerAffix: $.value === 1 && !V.value,
            dirty: Y.value || e.dirty,
            disabled: G.value,
            focused: s.value,
            error: Oe.value === !1
          }), {
            ...i,
            default: (We) => {
              let {
                props: {
                  class: qe,
                  ...oe
                }
              } = We;
              return c(Ve, null, [e.prefix && c("span", {
                class: "v-text-field__prefix"
              }, [e.prefix]), rt(c("textarea", xe({
                ref: g,
                class: qe,
                value: l.value,
                onInput: x,
                autofocus: e.autofocus,
                readonly: te.value,
                disabled: G.value,
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
                class: [qe, "v-textarea__sizer"],
                id: `${oe.id}-sizer`,
                "onUpdate:modelValue": (Ee) => l.value = Ee,
                ref: C,
                readonly: !0,
                "aria-hidden": "true"
              }, null), [[py, l.value]]), e.suffix && c("span", {
                class: "v-text-field__suffix"
              }, [e.suffix])]);
            }
          });
        },
        details: k ? (X) => {
          var Ce;
          return c(Ve, null, [(Ce = i.details) == null ? void 0 : Ce.call(i, X), O && c(Ve, null, [c("span", null, null), c(Pm, {
            active: e.persistentCounter || s.value,
            value: f.value,
            max: u.value,
            disabled: e.disabled
          }, i.counter)])]);
        } : void 0
      });
    }), ii({}, m, h, g);
  }
}), Fw = {
  name: "EpubReader",
  components: {
    Settings: iv,
    BookToc: ov,
    Guest: Gm,
    UserCenter: qm,
    BookComments: Fm,
    BookReview: nv,
    BookAnnotations: km,
    AudiobookPlayer: av
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
        this.annotation_repository = hw({
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
      if (!this.settings.show_annotations || !this.rendition || !(e != null && e.cfi)) return;
      const t = this.annotation_identity(e);
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
      if (!this.annotation_repository || !this.settings.show_annotations) return;
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
      if (!e || !this.annotation_repository || !this.settings.show_annotations) return;
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
      var i, l, s, a, r;
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
        this.upsert_annotation(f), this.render_annotation(f), this.load_chapter_annotations(String(((l = o.toc) == null ? void 0 : l.label) || this.current_toc_title || "").trim()), this.hide_toolbar();
        try {
          (r = (a = (s = o.contents) == null ? void 0 : s.window) == null ? void 0 : a.getSelection()) == null || r.removeAllRanges();
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
      (e = this.selected_location) != null && e.quote_text && (this.hide_toolbar(), this.annotation_editor_content = "", this.annotation_editor_error = "", this.annotation_editor_public = !1, this.annotation_editor_open = !0);
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
      const t = this.settings.show_annotations;
      e.flow != this.settings.flow && (this.rendition.flow(e.flow), this.set_menu("hide"));
      for (const n in e)
        this.settings[n] = e[n];
      if (this.apply_theme(this.settings.theme), t && !this.settings.show_annotations ? (this.annotation_list_request++, this.annotation_chapter_request++, this.annotation_editor_open = !1, this.chapter_annotation_count = 0, this.menu.current_panel === "annotations" && this.set_menu("hide"), this.clear_annotation_marks()) : !t && this.settings.show_annotations && this.load_chapter_annotations(this.current_toc_title), e.brightness !== void 0) {
        const n = e.brightness / 100;
        document.getElementById("main").style.filter = `brightness(${n})`;
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
      const t = e.view.frameElement.getBoundingClientRect(), n = document.getElementById("reader"), o = n.offsetWidth, i = n.offsetHeight, l = (e.clientX + t.x) % n.offsetWidth, s = (e.clientY + t.y) % n.offsetHeight;
      if (this.debug_click(l, s, o, i), this.is_toolbar_visible()) {
        this.hide_toolbar();
        return;
      }
      const a = o < this.wide_screen, r = a ? 3 : 5, f = this.settings.paging_control === "keyboard_only";
      l < o / r || a && s < i / r ? f || (this.suspend_audiobook_follow(), this.rendition.prev()) : l > o * (r - 1) / r || a && s > i * (r - 1) / r ? f || (this.suspend_audiobook_follow(), this.rendition.next().then()) : (console.log("-- toggle menu"), this.menu.show_navbar = !this.menu.show_navbar);
    },
    bin_search: function(e, t, n) {
      for (var o = 0, i = e.length; o < i; ) {
        const s = Math.floor((o + i) / 2);
        if (s == o)
          break;
        const a = e[s];
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
        r < 0 && (i = s), r > 0 && (o = s);
      }
      const l = e[o];
      if (l.cfi === void 0) {
        if (l.href.indexOf("#") > 0) {
          const s = l.href.split("#")[1];
          l.elem = n.document.getElementById(s);
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
      if (console.log("got spine href in toc:", i), i !== void 0) {
        if (i.elem === void 0) {
          const s = ["h1", "h2", "h3", "h4", "h5", "h6", "p"];
          for (let r of s) {
            const f = t.document.getElementsByTagName(r);
            if (f.length > 0) {
              i.elem = f[0];
              break;
            }
          }
          const a = new ePub.CFI(i.elem, t.cfiBase);
          i.cfi = new ePub.CFI(a.toString());
        }
        var l = i;
        return i.subitems.length > 0 && (l = this.bin_search(i.subitems, n, t), this.book.locations.epubcfi.compare(n, l.cfi) < 0 && (l = i)), console.log("find_toc = ", l), l;
      }
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
    hide_toolbar: function() {
      this.toolbar_left = -999;
    },
    show_toolbar: function(e, t) {
      console.log("show toolbar at rect", e, " from iframe rect", t);
      const n = e.left + t.x, o = e.top + t.y, i = e.bottom + t.y;
      this.toolbar_left = 8, this.toolbar_top = i + 12, this.$nextTick(() => {
        var r;
        const l = this.$refs.selectionToolbar;
        if (!l) return;
        const s = Math.max(8, window.innerWidth - l.offsetWidth - 8);
        this.toolbar_left = Math.max(8, Math.min(s, n));
        const a = this.menu.show_navbar ? 64 : 8;
        this.toolbar_top = o >= l.offsetHeight + 64 ? o - l.offsetHeight - 12 : Math.min(window.innerHeight - l.offsetHeight - a, i + 12), (r = l.querySelector("button")) == null || r.focus({ preventScroll: !0 });
      });
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
      const i = new ePub.CFI(o, t.cfiBase), l = this.find_toc(i, t);
      console.log("cfi = ", i, "toc =", l);
      const s = this.count_distinct_between(l.elem, o);
      console.log("selected segment_id = ", s), this.selected_location = {
        client_id: ka(),
        toc: l,
        cfi: String(e),
        paragraph_cfi: i.toString(),
        quote_text: n.toString().trim(),
        contents: t,
        segment_id: s
      };
      const a = this.rendition.views()._views.filter((r) => r.index == t.sectionIndex)[0];
      this.show_toolbar(o.getBoundingClientRect(), a.iframe.getBoundingClientRect());
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
        const o = this.book.spine.get(n), i = t.filter((a) => a.cfiBase == o.cfiBase)[0], l = new ePub.CFI(n), s = this.find_toc(l, i, o.href);
        this.load_comments_summary(i, s);
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
        t.load_time = /* @__PURE__ */ new Date(), t.summary = {}, t.chapter_id = i.data.chapter_id, i.data.list.forEach((l) => {
          t.summary[l.segmentId] = l, t.icons_rendered = !1;
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
        for (var i = 0, l = t.elem; i <= n && l; ) {
          const s = l.nodeName.toUpperCase();
          if ((s === "P" || s[0] === "H") && (this.add_icon_into_paragraph(e, l, i, t), i++), l.firstChild)
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
      const l = new ePub.CFI(t, e.cfiBase).toString(), s = i.reviewNum, a = i.is_hot ? "hot-comment" : "", f = e.document.createElement("div");
      f.className = `comment-icon ${a}`, f.innerHTML = `<span class="comment-count">${s}</span>`, t.appendChild(f), f.addEventListener("click", (u) => {
        u.stopPropagation(), console.log("点击评论按钮", o.chapter_id, n, l), this.show_selected_comments(o, n, l);
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
      const i = this.$options.data().settings, l = JSON.parse(t);
      this.settings = Object.assign({}, i);
      for (const s in l)
        l[s] !== void 0 && (this.settings[s] = l[s]);
      console.log("加载设置：", t);
    }
    this.initialize_annotations(), this.is_debug_signal = this.debug, this.is_debug_click = this.debug, this.loadingTimeout = setTimeout(() => {
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
      const l = `/api/review/book?title=${this.book_title}`;
      this.$backend(l).then((s) => {
        s.err == "ok" && (this.book_id = s.data.id);
      }).catch((s) => {
        console.error("获取书籍ID失败:", s);
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
      const l = localStorage.getItem(o) || this.display_url;
      return l ? this.rendition.display(l) : this.rendition.display();
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
      show_annotations: !0,
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
}, Bw = { class: "annotation-editor-quote" }, Lw = {
  id: "status-bar-left",
  class: "align-start"
}, Rw = {
  id: "status-bar-right",
  class: "align-end"
}, Hw = { class: "progress-bar-container" }, jw = { class: "theme-group-label" }, zw = { class: "theme-grid" }, Uw = ["onClick"], Ww = {
  key: 1,
  class: "theme-badge"
}, qw = { class: "theme-name" };
function Gw(e, t, n, o, i, l) {
  const s = av, a = iv, r = ov, f = nv, u = Gm, d = qm, m = Fm, h = km;
  return ee(), ve(yw, {
    theme: e.settings.theme,
    "full-height": "",
    density: "compact"
  }, {
    default: p(() => [
      se("div", {
        id: "safe-bottom",
        style: rn({ backgroundColor: l.foot_color })
      }, null, 4),
      e.menu.show_navbar ? (ee(), ve(ww, {
        key: 0,
        density: "compact"
      }, {
        prepend: p(() => [
          c(ce, {
            icon: "",
            title: e.is_debug_signal ? "返回首页" : "章评"
          }, {
            default: p(() => [
              c(Pe, null, {
                default: p(() => [
                  U(Ne(e.is_debug_signal ? "mdi-arrow-left" : "mdi-candle"), 1)
                ]),
                _: 1
              })
            ]),
            _: 1
          }, 8, ["title"])
        ]),
        default: p(() => [
          U(" " + Ne(e.is_debug_signal ? e.alert_msg : e.book_title) + " ", 1),
          c(yl),
          c(ce, {
            icon: "",
            title: "更多选项"
          }, {
            default: p(() => [
              c(Pe, null, {
                default: p(() => t[31] || (t[31] = [
                  U("mdi-dots-vertical")
                ])),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _: 1
      })) : ze("", !0),
      c(Cw, {
        modelValue: e.menu.value,
        "onUpdate:modelValue": t[3] || (t[3] = (v) => e.menu.value = v),
        active: e.menu.show_navbar,
        "z-index": "2599"
      }, {
        default: p(() => [
          c(ce, {
            value: "toc",
            onClick: t[0] || (t[0] = (v) => l.set_menu("toc"))
          }, {
            default: p(() => [
              c(Pe, null, {
                default: p(() => t[32] || (t[32] = [
                  U("mdi-book-open-variant-outline")
                ])),
                _: 1
              }),
              t[33] || (t[33] = se("span", null, "目录", -1))
            ]),
            _: 1
          }),
          c(ce, { onClick: l.switch_theme }, {
            default: p(() => [
              c(Pe, null, {
                default: p(() => [
                  U(Ne(l.switch_theme_icon), 1)
                ]),
                _: 1
              }),
              se("span", null, Ne(l.switch_theme_text), 1)
            ]),
            _: 1
          }, 8, ["onClick"]),
          l.has_audiobook ? (ee(), ve(ce, {
            key: 0,
            onClick: l.open_audiobook
          }, {
            default: p(() => [
              c(Pe, null, {
                default: p(() => t[34] || (t[34] = [
                  U("mdi-headphones")
                ])),
                _: 1
              }),
              t[35] || (t[35] = se("span", null, "听书", -1))
            ]),
            _: 1
          }, 8, ["onClick"])) : ze("", !0),
          e.settings.show_annotations ? (ee(), ve(ce, {
            key: 1,
            value: "annotations",
            "aria-label": e.chapter_annotation_count ? `笔记，本章 ${e.chapter_annotation_count} 条` : "笔记",
            onClick: l.on_open_annotations
          }, {
            default: p(() => [
              e.chapter_annotation_count ? (ee(), ve(Cc, {
                key: 0,
                color: "primary",
                content: e.chapter_annotation_count
              }, {
                default: p(() => [
                  c(Pe, null, {
                    default: p(() => t[36] || (t[36] = [
                      U("mdi-notebook-outline")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["content"])) : (ee(), ve(Pe, { key: 1 }, {
                default: p(() => t[37] || (t[37] = [
                  U("mdi-notebook-outline")
                ])),
                _: 1
              })),
              t[38] || (t[38] = se("span", null, "笔记", -1))
            ]),
            _: 1
          }, 8, ["aria-label", "onClick"])) : ze("", !0),
          c(ce, {
            value: "settings",
            onClick: t[1] || (t[1] = (v) => l.set_menu("settings"))
          }, {
            default: p(() => [
              c(Pe, null, {
                default: p(() => t[39] || (t[39] = [
                  U("mdi-cog")
                ])),
                _: 1
              }),
              t[40] || (t[40] = se("span", null, "设置", -1))
            ]),
            _: 1
          }),
          c(ce, {
            value: "more",
            onClick: l.on_open_comments
          }, {
            default: p(() => [
              e.unread_count ? (ee(), ve(Cc, {
                key: 0,
                color: "error",
                content: e.unread_count
              }, {
                default: p(() => [
                  c(Pe, null, {
                    default: p(() => t[41] || (t[41] = [
                      U("mdi-comment-text-multiple-outline")
                    ])),
                    _: 1
                  })
                ]),
                _: 1
              }, 8, ["content"])) : (ee(), ve(Pe, { key: 1 }, {
                default: p(() => t[42] || (t[42] = [
                  U("mdi-comment-text-multiple-outline")
                ])),
                _: 1
              })),
              t[43] || (t[43] = se("span", null, "评论", -1))
            ]),
            _: 1
          }, 8, ["onClick"]),
          c(ce, {
            value: "ai",
            onClick: t[2] || (t[2] = (v) => l.set_menu("ai"))
          }, {
            default: p(() => [
              c(Pe, null, {
                default: p(() => t[44] || (t[44] = [
                  U("mdi-face-man-shimmer")
                ])),
                _: 1
              }),
              t[45] || (t[45] = se("span", null, "AI", -1))
            ]),
            _: 1
          })
        ]),
        _: 1
      }, 8, ["modelValue", "active"]),
      l.has_audiobook ? (ee(), ve(s, {
        key: 1,
        ref: "audiobookPlayer",
        visible: e.audiobook_open,
        "edition-id": n.audiobook_edition_id,
        "manifest-url": n.audiobook_manifest_url,
        rendition: e.rendition,
        request: l.audiobook_request,
        onClose: t[4] || (t[4] = (v) => e.audiobook_open = !1)
      }, null, 8, ["visible", "edition-id", "manifest-url", "rendition", "request"])) : ze("", !0),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.settings,
        "onUpdate:modelValue": t[5] || (t[5] = (v) => e.menu.panels.settings = v),
        contained: "",
        persistent: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(a, {
            settings: e.settings,
            onUpdate: l.update_settings,
            onOpenThemes: l.open_theme_dialog
          }, null, 8, ["settings", "onUpdate", "onOpenThemes"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.toc,
        "onUpdate:modelValue": t[6] || (t[6] = (v) => e.menu.panels.toc = v),
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
            "onClick:select": l.on_click_toc
          }, null, 8, ["meta", "toc_items", "current-chapter", "onClick:select"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.more,
        "onUpdate:modelValue": t[10] || (t[10] = (v) => e.menu.panels.more = v),
        contained: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(f, {
            user: e.user,
            login: e.is_login,
            comments: e.book_reviews,
            sort: e.book_review_sort,
            onClose: t[7] || (t[7] = (v) => l.set_menu("hide")),
            onLogin: t[8] || (t[8] = (v) => e.show_login = !0),
            "onUpdate:sort": l.on_change_book_review_sort,
            onOpenSettings: t[9] || (t[9] = (v) => e.show_user_center = !0),
            onAdd: l.on_add_book_review,
            onJump: l.on_jump_review
          }, null, 8, ["user", "login", "comments", "sort", "onUpdate:sort", "onAdd", "onJump"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(gn, {
        modelValue: e.show_login,
        "onUpdate:modelValue": t[11] || (t[11] = (v) => e.show_login = v),
        "max-width": "500",
        "z-index": "2999"
      }, {
        default: p(() => [
          c(u, { onLogin: l.on_book_login }, null, 8, ["onLogin"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.show_user_center,
        "onUpdate:modelValue": t[12] || (t[12] = (v) => e.show_user_center = v),
        contained: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(d, {
            messages: e.comments,
            user: e.user,
            onUpdate: l.on_login_user,
            onLogout: l.on_book_logout
          }, null, 8, ["messages", "user", "onUpdate", "onLogout"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.comments,
        "onUpdate:modelValue": t[15] || (t[15] = (v) => e.menu.panels.comments = v),
        contained: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(m, {
            login: e.is_login,
            comments: e.comments,
            onClose: t[13] || (t[13] = (v) => l.set_menu("hide")),
            onLogin: t[14] || (t[14] = (v) => l.set_menu("more")),
            onAdd_review: l.on_add_review
          }, null, 8, ["login", "comments", "onAdd_review"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14 annotation-bottom-sheet",
        "max-height": "90%",
        modelValue: e.menu.panels.annotations,
        "onUpdate:modelValue": t[17] || (t[17] = (v) => e.menu.panels.annotations = v),
        contained: "",
        "z-index": "234",
        "aria-labelledby": "annotation-panel-title"
      }, {
        default: p(() => [
          c(h, {
            annotations: e.annotations,
            loading: e.annotations_loading,
            error: e.annotations_error,
            onClose: t[16] || (t[16] = (v) => l.set_menu("hide")),
            onRefresh: l.load_annotations,
            onLocate: l.locate_annotation
          }, null, 8, ["annotations", "loading", "error", "onRefresh", "onLocate"])
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(yo, {
        class: "fixed mb-14",
        "max-height": "90%",
        modelValue: e.menu.panels.ai,
        "onUpdate:modelValue": t[18] || (t[18] = (v) => e.menu.panels.ai = v),
        contained: "",
        "z-index": "234"
      }, {
        default: p(() => [
          c(Ct, { title: "开发中" })
        ]),
        _: 1
      }, 8, ["modelValue"]),
      c(gn, {
        modelValue: e.annotation_editor_open,
        "onUpdate:modelValue": t[23] || (t[23] = (v) => e.annotation_editor_open = v),
        class: "annotation-editor-dialog",
        "max-width": "520",
        "aria-labelledby": "annotation-editor-title",
        onAfterLeave: l.restore_reader_focus
      }, {
        default: p(() => [
          c(Ct, null, {
            default: p(() => [
              c(Qn, { id: "annotation-editor-title" }, {
                default: p(() => t[46] || (t[46] = [
                  U("添加笔记")
                ])),
                _: 1
              }),
              c(_n, null, {
                default: p(() => {
                  var v;
                  return [
                    se("blockquote", Bw, Ne(e.selected_location.quote_text), 1),
                    c(Mw, {
                      ref: "annotationEditorContent",
                      modelValue: e.annotation_editor_content,
                      "onUpdate:modelValue": [
                        t[19] || (t[19] = (g) => e.annotation_editor_content = g),
                        t[20] || (t[20] = (g) => e.annotation_editor_error = "")
                      ],
                      class: "mt-4",
                      label: "笔记内容",
                      rows: "4",
                      autofocus: "",
                      "error-messages": e.annotation_editor_error
                    }, null, 8, ["modelValue", "error-messages"]),
                    ((v = e.annotation_repository) == null ? void 0 : v.source) === "callback" ? (ee(), ve(Tw, {
                      key: 0,
                      modelValue: e.annotation_editor_public,
                      "onUpdate:modelValue": t[21] || (t[21] = (g) => e.annotation_editor_public = g),
                      label: "公开给其他用户",
                      "hide-details": ""
                    }, null, 8, ["modelValue"])) : ze("", !0)
                  ];
                }),
                _: 1
              }),
              c(Ao, null, {
                default: p(() => [
                  c(yl),
                  c(ce, {
                    onClick: t[22] || (t[22] = (v) => e.annotation_editor_open = !1)
                  }, {
                    default: p(() => t[47] || (t[47] = [
                      U("取消")
                    ])),
                    _: 1
                  }),
                  c(ce, {
                    color: "primary",
                    loading: e.annotation_saving,
                    onClick: l.save_note
                  }, {
                    default: p(() => t[48] || (t[48] = [
                      U("保存笔记")
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
      c(Dw, {
        modelValue: e.annotation_feedback_visible,
        "onUpdate:modelValue": t[25] || (t[25] = (v) => e.annotation_feedback_visible = v),
        class: "annotation-feedback",
        color: e.annotation_feedback_error ? "error" : "primary",
        timeout: e.annotation_feedback_error ? -1 : 5e3
      }, {
        actions: p(() => [
          c(ce, {
            variant: "text",
            onClick: t[24] || (t[24] = (v) => e.annotation_feedback_visible = !1)
          }, {
            default: p(() => t[49] || (t[49] = [
              U("关闭")
            ])),
            _: 1
          })
        ]),
        default: p(() => [
          U(Ne(e.annotation_feedback_message) + " ", 1)
        ]),
        _: 1
      }, 8, ["modelValue", "color", "timeout"]),
      rt(se("div", {
        id: "comments-toolbar",
        ref: "selectionToolbar",
        role: "group",
        "aria-label": "选中文字操作",
        style: rn(`left: ${e.toolbar_left}px; top: ${e.toolbar_top}px;`)
      }, [
        c(Ul, {
          density: "compact",
          border: "",
          dense: "",
          floating: "",
          elevation: "10",
          rounded: ""
        }, {
          default: p(() => [
            e.settings.show_annotations ? (ee(), Ze(Ve, { key: 0 }, [
              c(ce, {
                loading: e.annotation_saving,
                onClick: l.save_highlight
              }, {
                default: p(() => t[50] || (t[50] = [
                  U("划线")
                ])),
                _: 1
              }, 8, ["loading", "onClick"]),
              c(Jt, { vertical: "" }),
              c(ce, {
                disabled: e.annotation_saving,
                onClick: l.open_note_editor
              }, {
                default: p(() => t[51] || (t[51] = [
                  U("笔记")
                ])),
                _: 1
              }, 8, ["disabled", "onClick"]),
              c(Jt, { vertical: "" })
            ], 64)) : ze("", !0),
            c(ce, { onClick: l.on_click_toolbar_comments }, {
              default: p(() => t[52] || (t[52] = [
                U("发段评")
              ])),
              _: 1
            }, 8, ["onClick"]),
            c(Jt, { vertical: "" }),
            l.has_audiobook ? (ee(), ve(ce, {
              key: 1,
              onClick: l.on_click_toolbar_listen
            }, {
              default: p(() => t[53] || (t[53] = [
                U("从这里听")
              ])),
              _: 1
            }, 8, ["onClick"])) : ze("", !0),
            l.has_audiobook ? (ee(), ve(Jt, {
              key: 2,
              vertical: ""
            })) : ze("", !0),
            c(ce, { onClick: l.copy_selection }, {
              default: p(() => t[54] || (t[54] = [
                U("复制")
              ])),
              _: 1
            }, 8, ["onClick"])
          ]),
          _: 1
        })
      ], 4), [
        [En, l.is_toolbar_visible()]
      ]),
      c(Iw, {
        id: "main",
        class: "pa-0"
      }, {
        default: p(() => [
          c(Pi, {
            modelValue: e.loading,
            "onUpdate:modelValue": t[26] || (t[26] = (v) => e.loading = v),
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
          c(gn, {
            modelValue: e.showTimeoutDialog,
            "onUpdate:modelValue": t[28] || (t[28] = (v) => e.showTimeoutDialog = v),
            "max-width": "500px"
          }, {
            default: p(() => [
              c(Ct, null, {
                default: p(() => [
                  c(Qn, { class: "text-h5 text-center" }, {
                    default: p(() => t[55] || (t[55] = [
                      U("加载超时")
                    ])),
                    _: 1
                  }),
                  c(_n, { class: "text-center" }, {
                    default: p(() => t[56] || (t[56] = [
                      U(" 电子书加载超时，可能是网络问题或文件格式不支持。 ")
                    ])),
                    _: 1
                  }),
                  c(Ao, { class: "justify-center" }, {
                    default: p(() => [
                      c(ce, {
                        color: "primary",
                        variant: "text",
                        onClick: t[27] || (t[27] = (v) => e.showTimeoutDialog = !1)
                      }, {
                        default: p(() => t[57] || (t[57] = [
                          U(" 关闭 ")
                        ])),
                        _: 1
                      }),
                      c(ce, {
                        color: "primary",
                        variant: "flat",
                        onClick: l.retryLoad
                      }, {
                        default: p(() => t[58] || (t[58] = [
                          U(" 重试 ")
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
            class: yn(e.settings.theme),
            style: rn(l.status_bar_style)
          }, [
            se("div", Lw, Ne(e.current_toc_title), 1),
            se("div", Rw, " (" + Ne(l.readingProgress) + ") ", 1)
          ], 6),
          t[59] || (t[59] = se("div", { id: "reader" }, null, -1)),
          se("div", {
            id: "status-bar-bottom",
            class: yn(e.settings.theme),
            style: rn(l.status_bar_style)
          }, [
            se("div", Hw, [
              se("div", {
                class: "progress-bar",
                style: rn({ width: l.readingProgress })
              }, null, 4)
            ])
          ], 6)
        ]),
        _: 1
      }),
      c(gn, {
        modelValue: e.show_theme_dialog,
        "onUpdate:modelValue": t[30] || (t[30] = (v) => e.show_theme_dialog = v),
        "max-width": "520",
        scrollable: "",
        fullscreen: e.$vuetify.display.smAndDown
      }, {
        default: p(() => [
          c(Ct, null, {
            default: p(() => [
              c(Qn, { class: "d-flex align-center" }, {
                default: p(() => [
                  t[60] || (t[60] = se("span", null, "阅读皮肤", -1)),
                  c(yl),
                  c(ce, {
                    icon: "mdi-close",
                    variant: "text",
                    density: "compact",
                    onClick: t[29] || (t[29] = (v) => e.show_theme_dialog = !1)
                  })
                ]),
                _: 1
              }),
              c(_n, null, {
                default: p(() => [
                  (ee(!0), Ze(Ve, null, Qt(l.theme_groups, (v) => (ee(), Ze(Ve, {
                    key: v.mode
                  }, [
                    se("div", jw, Ne(v.label), 1),
                    se("div", zw, [
                      (ee(!0), Ze(Ve, null, Qt(v.items, (g) => (ee(), Ze("div", {
                        class: "theme-cell",
                        key: g.id
                      }, [
                        se("div", {
                          class: yn(["theme-card", { active: e.settings.theme === g.id }]),
                          style: rn(l.theme_card_style(g)),
                          onClick: (_) => l.pick_theme(g)
                        }, [
                          se("span", {
                            class: "theme-sample",
                            style: rn({ color: g.text })
                          }, Ne(g.sample), 5),
                          g.id === e.settings.theme_day || g.id === e.settings.theme_night ? (ee(), ve(Pe, {
                            key: 0,
                            class: "theme-check",
                            size: "18",
                            title: g.mode === "day" ? "当前白天皮肤" : "当前夜晚皮肤"
                          }, {
                            default: p(() => t[61] || (t[61] = [
                              U("mdi-check-circle")
                            ])),
                            _: 2
                          }, 1032, ["title"])) : ze("", !0),
                          e.settings.theme === g.id ? (ee(), Ze("span", Ww, "使用中")) : ze("", !0)
                        ], 14, Uw),
                        se("div", qw, Ne(g.name), 1)
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
const Kw = /* @__PURE__ */ Vn(Fw, [["render", Gw], ["__scopeId", "data-v-1257bc8e"]]), Yw = {
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
function Xw(e, t, n, o, i, l) {
  const s = Kw;
  return ee(), ve(s, {
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
const Jw = /* @__PURE__ */ Vn(Yw, [["render", Xw]]);
class Zw {
  constructor(t, n) {
    var o = "https://api.talebook.org";
    const i = Cy(Jw, n);
    Ab(i, {
      server: n.server || o
    }), i.mount(t);
  }
}
export {
  Zw as Reader
};
