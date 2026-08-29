// @__NO_SIDE_EFFECTS__
function bs(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const n of e.split(",")) t[n] = 1;
  return (n) => n in t;
}
const Q = {}, kt = [], We = () => {
}, yr = () => !1, Rn = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // uppercase letter
(e.charCodeAt(2) > 122 || e.charCodeAt(2) < 97), Nn = (e) => e.startsWith("onUpdate:"), le = Object.assign, ys = (e, t) => {
  const n = e.indexOf(t);
  n > -1 && e.splice(n, 1);
}, Oi = Object.prototype.hasOwnProperty, K = (e, t) => Oi.call(e, t), M = Array.isArray, ft = (e) => on(e) === "[object Map]", Sn = (e) => on(e) === "[object Set]", $s = (e) => on(e) === "[object Date]", D = (e) => typeof e == "function", ne = (e) => typeof e == "string", ze = (e) => typeof e == "symbol", W = (e) => e !== null && typeof e == "object", _r = (e) => (W(e) || D(e)) && D(e.then) && D(e.catch), xr = Object.prototype.toString, on = (e) => xr.call(e), ki = (e) => on(e).slice(8, -1), Sr = (e) => on(e) === "[object Object]", _s = (e) => ne(e) && e !== "NaN" && e[0] !== "-" && "" + parseInt(e, 10) === e, Kt = /* @__PURE__ */ bs(
  // the leading comma is intentional so empty string "" is also included
  ",key,ref,ref_for,ref_key,onVnodeBeforeMount,onVnodeMounted,onVnodeBeforeUpdate,onVnodeUpdated,onVnodeBeforeUnmount,onVnodeUnmounted"
), Dn = (e) => {
  const t = /* @__PURE__ */ Object.create(null);
  return ((n) => t[n] || (t[n] = e(n)));
}, Mi = /-\w/g, ke = Dn(
  (e) => e.replace(Mi, (t) => t.slice(1).toUpperCase())
), Fi = /\B([A-Z])/g, Tt = Dn(
  (e) => e.replace(Fi, "-$1").toLowerCase()
), Cr = Dn((e) => e.charAt(0).toUpperCase() + e.slice(1)), qn = Dn(
  (e) => e ? `on${Cr(e)}` : ""
), Ue = (e, t) => !Object.is(e, t), Gn = (e, ...t) => {
  for (let n = 0; n < e.length; n++)
    e[n](...t);
}, wr = (e, t, n, s = !1) => {
  Object.defineProperty(e, t, {
    configurable: !0,
    enumerable: !1,
    writable: s,
    value: n
  });
}, Ri = (e) => {
  const t = parseFloat(e);
  return isNaN(t) ? e : t;
}, Ni = (e) => {
  const t = ne(e) ? Number(e) : NaN;
  return isNaN(t) ? e : t;
};
let Ls;
const $n = () => Ls || (Ls = typeof globalThis < "u" ? globalThis : typeof self < "u" ? self : typeof window < "u" ? window : typeof global < "u" ? global : {});
function Yt(e) {
  if (M(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++) {
      const s = e[n], r = ne(s) ? Hi(s) : Yt(s);
      if (r)
        for (const i in r)
          t[i] = r[i];
    }
    return t;
  } else if (ne(e) || W(e))
    return e;
}
const Di = /;(?![^(]*\))/g, $i = /:([^]+)/, Li = /\/\*[^]*?\*\//g;
function Hi(e) {
  const t = {};
  return e.replace(Li, "").split(Di).forEach((n) => {
    if (n) {
      const s = n.split($i);
      s.length > 1 && (t[s[0].trim()] = s[1].trim());
    }
  }), t;
}
function xt(e) {
  let t = "";
  if (ne(e))
    t = e;
  else if (M(e))
    for (let n = 0; n < e.length; n++) {
      const s = xt(e[n]);
      s && (t += s + " ");
    }
  else if (W(e))
    for (const n in e)
      e[n] && (t += n + " ");
  return t.trim();
}
const ji = "itemscope,allowfullscreen,formnovalidate,ismap,nomodule,novalidate,readonly", Bi = /* @__PURE__ */ bs(ji);
function Tr(e) {
  return !!e || e === "";
}
function Vi(e, t) {
  if (e.length !== t.length) return !1;
  let n = !0;
  for (let s = 0; n && s < e.length; s++)
    n = Ln(e[s], t[s]);
  return n;
}
function Hs(e, t) {
  if (e.size !== t.size) return !1;
  const n = Array.from(t), s = new Uint8Array(n.length);
  for (const r of e) {
    let i = -1;
    for (let o = 0; o < n.length; o++)
      if (!s[o] && Ln(r, n[o])) {
        i = o;
        break;
      }
    if (i < 0) return !1;
    s[i] = 1;
  }
  return !0;
}
function Ln(e, t) {
  if (e === t) return !0;
  let n = $s(e), s = $s(t);
  if (n || s)
    return n && s ? e.getTime() === t.getTime() : !1;
  if (n = ze(e), s = ze(t), n || s)
    return e === t;
  if (n = M(e), s = M(t), n || s)
    return n && s ? Vi(e, t) : !1;
  if (n = W(e), s = W(t), n || s) {
    if (!n || !s)
      return !1;
    if (n = ft(e), s = ft(t), n || s || (n = Sn(e), s = Sn(t), n || s))
      return n && s ? Hs(e, t) : !1;
    const r = Object.keys(e).length, i = Object.keys(t).length;
    if (r !== i)
      return !1;
    for (const o in e) {
      const l = e.hasOwnProperty(o), c = t.hasOwnProperty(o);
      if (l && !c || !l && c || !Ln(e[o], t[o]))
        return !1;
    }
  }
  return String(e) === String(t);
}
const Er = (e) => !!(e && e.__v_isRef === !0), Le = (e) => ne(e) ? e : e == null ? "" : M(e) || W(e) && (e.toString === xr || !D(e.toString)) ? Er(e) ? Le(e.value) : JSON.stringify(e, Pr, 2) : String(e), Pr = (e, t) => Er(t) ? Pr(e, t.value) : ft(t) ? {
  [`Map(${t.size})`]: [...t.entries()].reduce(
    (n, [s, r], i) => (n[Jn(s, i) + " =>"] = r, n),
    {}
  )
} : Sn(t) ? {
  [`Set(${t.size})`]: [...t.values()].map((n) => Jn(n))
} : ze(t) ? Jn(t) : W(t) && !M(t) && !Sr(t) ? String(t) : t, Jn = (e, t = "") => {
  var n;
  return (
    // Symbol.description in es2019+ so we need to cast here to pass
    // the lib: es2016 check
    ze(e) ? `Symbol(${(n = e.description) != null ? n : t})` : e
  );
};
let ue;
class Ui {
  // TODO isolatedDeclarations "__v_skip"
  constructor(t = !1) {
    this.detached = t, this._active = !0, this._on = 0, this.effects = [], this.cleanups = [], this._isPaused = !1, this._warnOnRun = !0, this.__v_skip = !0, !t && ue && (ue.active ? (this.parent = ue, this.index = (ue.scopes || (ue.scopes = [])).push(
      this
    ) - 1) : (this._active = !1, this._warnOnRun = !1));
  }
  get active() {
    return this._active;
  }
  pause() {
    if (this._active) {
      this._isPaused = !0;
      let t, n;
      if (this.scopes) {
        const s = this.scopes.slice();
        for (t = 0, n = s.length; t < n; t++)
          s[t].pause();
      }
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
      if (this.scopes) {
        const r = this.scopes.slice();
        for (t = 0, n = r.length; t < n; t++)
          r[t].resume();
      }
      const s = this.effects.slice();
      for (t = 0, n = s.length; t < n; t++)
        s[t].resume();
    }
  }
  run(t) {
    if (this._active) {
      const n = ue;
      try {
        return ue = this, t();
      } finally {
        ue = n;
      }
    }
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  on() {
    ++this._on === 1 && (this.prevScope = ue, ue = this);
  }
  /**
   * This should only be called on non-detached scopes
   * @internal
   */
  off() {
    if (this._on > 0 && --this._on === 0) {
      if (ue === this)
        ue = this.prevScope;
      else {
        let t = ue;
        for (; t; ) {
          if (t.prevScope === this) {
            t.prevScope = this.prevScope;
            break;
          }
          t = t.prevScope;
        }
      }
      this.prevScope = void 0;
    }
  }
  stop(t) {
    if (this._active) {
      this._active = !1;
      let n, s;
      for (n = 0, s = this.effects.length; n < s; n++)
        this.effects[n].stop();
      for (this.effects.length = 0, n = 0, s = this.cleanups.length; n < s; n++)
        this.cleanups[n]();
      if (this.cleanups.length = 0, this.scopes) {
        const r = this.scopes.slice();
        for (n = 0, s = r.length; n < s; n++)
          r[n].stop(!0);
        this.scopes.length = 0;
      }
      if (!this.detached && this.parent && !t) {
        const r = this.parent.scopes.pop();
        r && r !== this && (this.parent.scopes[this.index] = r, r.index = this.index);
      }
      this.parent = void 0;
    }
  }
}
function Ki() {
  return ue;
}
let Z;
const Yn = /* @__PURE__ */ new WeakSet();
class Ar {
  constructor(t) {
    this.fn = t, this.deps = void 0, this.depsTail = void 0, this.flags = 5, this.next = void 0, this.cleanup = void 0, this.scheduler = void 0, ue && (ue.active ? ue.effects.push(this) : this.flags &= -2);
  }
  pause() {
    this.flags |= 64;
  }
  resume() {
    this.flags & 64 && (this.flags &= -65, Yn.has(this) && (Yn.delete(this), this.trigger()));
  }
  /**
   * @internal
   */
  notify() {
    this.flags & 2 && !(this.flags & 32) || this.flags & 8 || Or(this);
  }
  run() {
    if (!(this.flags & 1))
      return this.fn();
    this.flags |= 2, js(this), kr(this);
    const t = Z, n = Me;
    Z = this, Me = !0;
    try {
      return this.fn();
    } finally {
      Mr(this), Z = t, Me = n, this.flags &= -3;
    }
  }
  stop() {
    if (this.flags & 1) {
      for (let t = this.deps; t; t = t.nextDep)
        Cs(t);
      this.deps = this.depsTail = void 0, js(this), this.onStop && this.onStop(), this.flags &= -2;
    }
  }
  trigger() {
    this.flags & 64 ? Yn.add(this) : this.scheduler ? this.scheduler() : this.runIfDirty();
  }
  /**
   * @internal
   */
  runIfDirty() {
    ls(this) && this.run();
  }
  get dirty() {
    return ls(this);
  }
}
let Ir = 0, Wt, zt;
function Or(e, t = !1) {
  if (e.flags |= 8, t) {
    e.next = zt, zt = e;
    return;
  }
  e.next = Wt, Wt = e;
}
function xs() {
  Ir++;
}
function Ss() {
  if (--Ir > 0)
    return;
  if (zt) {
    let t = zt;
    for (zt = void 0; t; ) {
      const n = t.next;
      t.next = void 0, t.flags &= -9, t = n;
    }
  }
  let e;
  for (; Wt; ) {
    let t = Wt;
    for (Wt = void 0; t; ) {
      const n = t.next;
      if (t.next = void 0, t.flags &= -9, t.flags & 1)
        try {
          t.trigger();
        } catch (s) {
          e || (e = s);
        }
      t = n;
    }
  }
  if (e) throw e;
}
function kr(e) {
  for (let t = e.deps; t; t = t.nextDep)
    t.version = -1, t.prevActiveLink = t.dep.activeLink, t.dep.activeLink = t;
}
function Mr(e) {
  let t, n = e.depsTail, s = n;
  for (; s; ) {
    const r = s.prevDep;
    s.version === -1 ? (s === n && (n = r), Cs(s), Wi(s)) : t = s, s.dep.activeLink = s.prevActiveLink, s.prevActiveLink = void 0, s = r;
  }
  e.deps = t, e.depsTail = n;
}
function ls(e) {
  for (let t = e.deps; t; t = t.nextDep)
    if (t.dep.version !== t.version || t.dep.computed && (Fr(t.dep.computed) || t.dep.version !== t.version))
      return !0;
  return !!e._dirty;
}
function Fr(e) {
  if (e.flags & 4 && !(e.flags & 16) || (e.flags &= -17, e.globalVersion === Xt) || (e.globalVersion = Xt, !e.isSSR && e.flags & 128 && (!e.deps && !e._dirty || !ls(e))))
    return;
  e.flags |= 2;
  const t = e.dep, n = Z, s = Me;
  Z = e, Me = !0;
  try {
    kr(e);
    const r = e.fn(e._value);
    (t.version === 0 || Ue(r, e._value)) && (e.flags |= 128, e._value = r, t.version++);
  } catch (r) {
    throw t.version++, r;
  } finally {
    Z = n, Me = s, Mr(e), e.flags &= -3;
  }
}
function Cs(e, t = !1) {
  const { dep: n, prevSub: s, nextSub: r } = e;
  if (s && (s.nextSub = r, e.prevSub = void 0), r && (r.prevSub = s, e.nextSub = void 0), n.subs === e && (n.subs = s, !s && n.computed)) {
    n.computed.flags &= -5;
    for (let i = n.computed.deps; i; i = i.nextDep)
      Cs(i, !0);
  }
  !t && !--n.sc && n.map && n.map.delete(n.key);
}
function Wi(e) {
  const { prevDep: t, nextDep: n } = e;
  t && (t.nextDep = n, e.prevDep = void 0), n && (n.prevDep = t, e.nextDep = void 0);
}
let Me = !0;
const Rr = [];
function nt() {
  Rr.push(Me), Me = !1;
}
function st() {
  const e = Rr.pop();
  Me = e === void 0 ? !0 : e;
}
function js(e) {
  const { cleanup: t } = e;
  if (e.cleanup = void 0, t) {
    const n = Z;
    Z = void 0;
    try {
      t();
    } finally {
      Z = n;
    }
  }
}
let Xt = 0;
class zi {
  constructor(t, n) {
    this.sub = t, this.dep = n, this.version = n.version, this.nextDep = this.prevDep = this.nextSub = this.prevSub = this.prevActiveLink = void 0;
  }
}
class ws {
  // TODO isolatedDeclarations "__v_skip"
  constructor(t) {
    this.computed = t, this.version = 0, this.activeLink = void 0, this.subs = void 0, this.map = void 0, this.key = void 0, this.sc = 0, this.__v_skip = !0;
  }
  track(t) {
    if (!Z || !Me || Z === this.computed)
      return;
    let n = this.activeLink;
    if (n === void 0 || n.sub !== Z)
      n = this.activeLink = new zi(Z, this), Z.deps ? (n.prevDep = Z.depsTail, Z.depsTail.nextDep = n, Z.depsTail = n) : Z.deps = Z.depsTail = n, Nr(n);
    else if (n.version === -1 && (n.version = this.version, n.nextDep)) {
      const s = n.nextDep;
      s.prevDep = n.prevDep, n.prevDep && (n.prevDep.nextDep = s), n.prevDep = Z.depsTail, n.nextDep = void 0, Z.depsTail.nextDep = n, Z.depsTail = n, Z.deps === n && (Z.deps = s);
    }
    return n;
  }
  trigger(t) {
    this.version++, Xt++, this.notify(t);
  }
  notify(t) {
    xs();
    try {
      for (let n = this.subs; n; n = n.prevSub)
        n.sub.notify() && n.sub.dep.notify();
    } finally {
      Ss();
    }
  }
}
function Nr(e) {
  if (e.dep.sc++, e.sub.flags & 4) {
    const t = e.dep.computed;
    if (t && !e.dep.subs) {
      t.flags |= 20;
      for (let s = t.deps; s; s = s.nextDep)
        Nr(s);
    }
    const n = e.dep.subs;
    n !== e && (e.prevSub = n, n && (n.nextSub = e)), e.dep.subs = e;
  }
}
const cs = /* @__PURE__ */ new WeakMap(), St = /* @__PURE__ */ Symbol(
  ""
), as = /* @__PURE__ */ Symbol(
  ""
), Zt = /* @__PURE__ */ Symbol(
  ""
);
function pe(e, t, n) {
  if (Me && Z) {
    let s = cs.get(e);
    s || cs.set(e, s = /* @__PURE__ */ new Map());
    let r = s.get(n);
    r || (s.set(n, r = new ws()), r.map = s, r.key = n), r.track();
  }
}
function tt(e, t, n, s, r, i) {
  const o = cs.get(e);
  if (!o) {
    Xt++;
    return;
  }
  const l = (c) => {
    c && c.trigger();
  };
  if (xs(), t === "clear")
    o.forEach(l);
  else {
    const c = M(e), u = c && _s(n);
    if (c && n === "length") {
      const f = Number(s);
      o.forEach((m, x) => {
        (x === "length" || x === Zt || !ze(x) && x >= f) && l(m);
      });
    } else
      switch ((n !== void 0 || o.has(void 0)) && l(o.get(n)), u && l(o.get(Zt)), t) {
        case "add":
          c ? u && l(o.get("length")) : (l(o.get(St)), ft(e) && l(o.get(as)));
          break;
        case "delete":
          c || (l(o.get(St)), ft(e) && l(o.get(as)));
          break;
        case "set":
          ft(e) && l(o.get(St));
          break;
      }
  }
  Ss();
}
function It(e) {
  const t = /* @__PURE__ */ U(e);
  return t === e ? t : (pe(t, "iterate", Zt), /* @__PURE__ */ Ae(e) ? t : t.map(Fe));
}
function Hn(e) {
  return pe(e = /* @__PURE__ */ U(e), "iterate", Zt), e;
}
function Be(e, t) {
  return /* @__PURE__ */ rt(e) ? Rt(/* @__PURE__ */ Ct(e) ? Fe(t) : t) : Fe(t);
}
const qi = {
  __proto__: null,
  [Symbol.iterator]() {
    return Xn(this, Symbol.iterator, (e) => Be(this, e));
  },
  concat(...e) {
    return It(this).concat(
      ...e.map((t) => M(t) ? It(t) : t)
    );
  },
  entries() {
    return Xn(this, "entries", (e) => (e[1] = Be(this, e[1]), e));
  },
  every(e, t) {
    return Je(this, "every", e, t, void 0, arguments);
  },
  filter(e, t) {
    return Je(
      this,
      "filter",
      e,
      t,
      (n) => n.map((s) => Be(this, s)),
      arguments
    );
  },
  find(e, t) {
    return Je(
      this,
      "find",
      e,
      t,
      (n) => Be(this, n),
      arguments
    );
  },
  findIndex(e, t) {
    return Je(this, "findIndex", e, t, void 0, arguments);
  },
  findLast(e, t) {
    return Je(
      this,
      "findLast",
      e,
      t,
      (n) => Be(this, n),
      arguments
    );
  },
  findLastIndex(e, t) {
    return Je(this, "findLastIndex", e, t, void 0, arguments);
  },
  // flat, flatMap could benefit from ARRAY_ITERATE but are not straight-forward to implement
  forEach(e, t) {
    return Je(this, "forEach", e, t, void 0, arguments);
  },
  includes(...e) {
    return Zn(this, "includes", e);
  },
  indexOf(...e) {
    return Zn(this, "indexOf", e);
  },
  join(e) {
    return It(this).join(e);
  },
  // keys() iterator only reads `length`, no optimization required
  lastIndexOf(...e) {
    return Zn(this, "lastIndexOf", e);
  },
  map(e, t) {
    return Je(this, "map", e, t, void 0, arguments);
  },
  pop() {
    return Lt(this, "pop");
  },
  push(...e) {
    return Lt(this, "push", e);
  },
  reduce(e, ...t) {
    return Bs(this, "reduce", e, t);
  },
  reduceRight(e, ...t) {
    return Bs(this, "reduceRight", e, t);
  },
  shift() {
    return Lt(this, "shift");
  },
  // slice could use ARRAY_ITERATE but also seems to beg for range tracking
  some(e, t) {
    return Je(this, "some", e, t, void 0, arguments);
  },
  splice(...e) {
    return Lt(this, "splice", e);
  },
  toReversed() {
    return It(this).toReversed();
  },
  toSorted(e) {
    return It(this).toSorted(e);
  },
  toSpliced(...e) {
    return It(this).toSpliced(...e);
  },
  unshift(...e) {
    return Lt(this, "unshift", e);
  },
  values() {
    return Xn(this, "values", (e) => Be(this, e));
  }
};
function Xn(e, t, n) {
  const s = Hn(e), r = s[t]();
  return s !== e && !/* @__PURE__ */ Ae(e) && (r._next = r.next, r.next = () => {
    const i = r._next();
    return i.done || (i.value = n(i.value)), i;
  }), r;
}
const Gi = Array.prototype;
function Je(e, t, n, s, r, i) {
  const o = Hn(e), l = o !== e && !/* @__PURE__ */ Ae(e), c = o[t];
  if (c !== Gi[t]) {
    const m = c.apply(e, i);
    return l ? Fe(m) : m;
  }
  let u = n;
  o !== e && (l ? u = function(m, x) {
    return n.call(this, Be(e, m), x, e);
  } : n.length > 2 && (u = function(m, x) {
    return n.call(this, m, x, e);
  }));
  const f = c.call(o, u, s);
  return l && r ? r(f) : f;
}
function Bs(e, t, n, s) {
  const r = Hn(e), i = r !== e && !/* @__PURE__ */ Ae(e);
  let o = n, l = !1;
  r !== e && (i ? (l = s.length === 0, o = function(u, f, m) {
    return l && (l = !1, u = Be(e, u)), n.call(this, u, Be(e, f), m, e);
  }) : n.length > 3 && (o = function(u, f, m) {
    return n.call(this, u, f, m, e);
  }));
  const c = r[t](o, ...s);
  return l ? Be(e, c) : c;
}
function Zn(e, t, n) {
  const s = /* @__PURE__ */ U(e);
  pe(s, "iterate", Zt);
  const r = s[t](...n);
  return (r === -1 || r === !1) && /* @__PURE__ */ Ps(n[0]) ? (n[0] = /* @__PURE__ */ U(n[0]), s[t](...n)) : r;
}
function Lt(e, t, n = []) {
  nt(), xs();
  const s = (/* @__PURE__ */ U(e))[t].apply(e, n);
  return Ss(), st(), s;
}
const Ji = /* @__PURE__ */ bs("__proto__,__v_isRef,__isVue"), Dr = new Set(
  /* @__PURE__ */ Object.getOwnPropertyNames(Symbol).filter((e) => e !== "arguments" && e !== "caller").map((e) => Symbol[e]).filter(ze)
);
function Yi(e) {
  ze(e) || (e = String(e));
  const t = /* @__PURE__ */ U(this);
  return pe(t, "has", e), t.hasOwnProperty(e);
}
class $r {
  constructor(t = !1, n = !1) {
    this._isReadonly = t, this._isShallow = n;
  }
  get(t, n, s) {
    if (n === "__v_skip") return t.__v_skip;
    const r = this._isReadonly, i = this._isShallow;
    if (n === "__v_isReactive")
      return !r;
    if (n === "__v_isReadonly")
      return r;
    if (n === "__v_isShallow")
      return i;
    if (n === "__v_raw")
      return s === (r ? i ? oo : Br : i ? jr : Hr).get(t) || // receiver is not the reactive proxy, but has the same prototype
      // this means the receiver is a user proxy of the reactive proxy
      Object.getPrototypeOf(t) === Object.getPrototypeOf(s) ? t : void 0;
    const o = M(t);
    if (!r) {
      let c;
      if (o && (c = qi[n]))
        return c;
      if (n === "hasOwnProperty")
        return Yi;
    }
    const l = Reflect.get(
      t,
      n,
      // if this is a proxy wrapping a ref, return methods using the raw ref
      // as receiver so that we don't have to call `toRaw` on the ref in all
      // its class methods
      /* @__PURE__ */ ge(t) ? t : s
    );
    if ((ze(n) ? Dr.has(n) : Ji(n)) || (r || pe(t, "get", n), i))
      return l;
    if (/* @__PURE__ */ ge(l)) {
      const c = o && _s(n) ? l : l.value;
      return r && W(c) ? /* @__PURE__ */ us(c) : c;
    }
    return W(l) ? r ? /* @__PURE__ */ us(l) : /* @__PURE__ */ jn(l) : l;
  }
}
class Lr extends $r {
  constructor(t = !1) {
    super(!1, t);
  }
  set(t, n, s, r) {
    let i = t[n];
    const o = M(t) && _s(n);
    if (!this._isShallow) {
      const u = /* @__PURE__ */ rt(i);
      if (!/* @__PURE__ */ Ae(s) && !/* @__PURE__ */ rt(s) && (i = /* @__PURE__ */ U(i), s = /* @__PURE__ */ U(s)), !o && /* @__PURE__ */ ge(i) && !/* @__PURE__ */ ge(s))
        return u || (i.value = s), !0;
    }
    const l = o ? Number(n) < t.length : K(t, n), c = Reflect.set(
      t,
      n,
      s,
      /* @__PURE__ */ ge(t) ? t : r
    );
    return t === /* @__PURE__ */ U(r) && c && (l ? Ue(s, i) && tt(t, "set", n, s) : tt(t, "add", n, s)), c;
  }
  deleteProperty(t, n) {
    const s = K(t, n);
    t[n];
    const r = Reflect.deleteProperty(t, n);
    return r && s && tt(t, "delete", n, void 0), r;
  }
  has(t, n) {
    const s = Reflect.has(t, n);
    return (!ze(n) || !Dr.has(n)) && pe(t, "has", n), s;
  }
  ownKeys(t) {
    return pe(
      t,
      "iterate",
      M(t) ? "length" : St
    ), Reflect.ownKeys(t);
  }
}
class Xi extends $r {
  constructor(t = !1) {
    super(!0, t);
  }
  set(t, n) {
    return !0;
  }
  deleteProperty(t, n) {
    return !0;
  }
}
const Zi = /* @__PURE__ */ new Lr(), Qi = /* @__PURE__ */ new Xi(), eo = /* @__PURE__ */ new Lr(!0);
const fs = (e) => e, un = (e) => Reflect.getPrototypeOf(e);
function to(e, t, n) {
  return function(...s) {
    const r = this.__v_raw, i = /* @__PURE__ */ U(r), o = ft(i), l = e === "entries" || e === Symbol.iterator && o, c = e === "keys" && o, u = r[e](...s), f = n ? fs : t ? Rt : Fe;
    return !t && pe(
      i,
      "iterate",
      c ? as : St
    ), le(
      // inheriting all iterator properties
      Object.create(u),
      {
        // iterator protocol
        next() {
          const { value: m, done: x } = u.next();
          return x ? { value: m, done: x } : {
            value: l ? [f(m[0]), f(m[1])] : f(m),
            done: x
          };
        }
      }
    );
  };
}
function dn(e) {
  return function(...t) {
    return e === "delete" ? !1 : e === "clear" ? void 0 : this;
  };
}
function no(e, t) {
  const n = {
    get(r) {
      const i = this.__v_raw, o = /* @__PURE__ */ U(i), l = /* @__PURE__ */ U(r);
      e || (Ue(r, l) && pe(o, "get", r), pe(o, "get", l));
      const { has: c } = un(o), u = t ? fs : e ? Rt : Fe;
      if (c.call(o, r))
        return u(i.get(r));
      if (c.call(o, l))
        return u(i.get(l));
      i !== o && i.get(r);
    },
    get size() {
      const r = this.__v_raw;
      return !e && pe(/* @__PURE__ */ U(r), "iterate", St), r.size;
    },
    has(r) {
      const i = this.__v_raw, o = /* @__PURE__ */ U(i), l = /* @__PURE__ */ U(r);
      return e || (Ue(r, l) && pe(o, "has", r), pe(o, "has", l)), r === l ? i.has(r) : i.has(r) || i.has(l);
    },
    forEach(r, i) {
      const o = this, l = o.__v_raw, c = /* @__PURE__ */ U(l), u = t ? fs : e ? Rt : Fe;
      return !e && pe(c, "iterate", St), l.forEach((f, m) => r.call(i, u(f), u(m), o));
    }
  };
  return le(
    n,
    e ? {
      add: dn("add"),
      set: dn("set"),
      delete: dn("delete"),
      clear: dn("clear")
    } : {
      add(r) {
        const i = /* @__PURE__ */ U(this), o = un(i), l = /* @__PURE__ */ U(r), c = !t && !/* @__PURE__ */ Ae(r) && !/* @__PURE__ */ rt(r) ? l : r;
        return o.has.call(i, c) || Ue(r, c) && o.has.call(i, r) || Ue(l, c) && o.has.call(i, l) || (i.add(c), tt(i, "add", c, c)), this;
      },
      set(r, i) {
        !t && !/* @__PURE__ */ Ae(i) && !/* @__PURE__ */ rt(i) && (i = /* @__PURE__ */ U(i));
        const o = /* @__PURE__ */ U(this), { has: l, get: c } = un(o);
        let u = l.call(o, r);
        u || (r = /* @__PURE__ */ U(r), u = l.call(o, r));
        const f = c.call(o, r);
        return o.set(r, i), u ? Ue(i, f) && tt(o, "set", r, i) : tt(o, "add", r, i), this;
      },
      delete(r) {
        const i = /* @__PURE__ */ U(this), { has: o, get: l } = un(i);
        let c = o.call(i, r);
        c || (r = /* @__PURE__ */ U(r), c = o.call(i, r)), l && l.call(i, r);
        const u = i.delete(r);
        return c && tt(i, "delete", r, void 0), u;
      },
      clear() {
        const r = /* @__PURE__ */ U(this), i = r.size !== 0, o = r.clear();
        return i && tt(
          r,
          "clear",
          void 0,
          void 0
        ), o;
      }
    }
  ), [
    "keys",
    "values",
    "entries",
    Symbol.iterator
  ].forEach((r) => {
    n[r] = to(r, e, t);
  }), n;
}
function Ts(e, t) {
  const n = no(e, t);
  return (s, r, i) => r === "__v_isReactive" ? !e : r === "__v_isReadonly" ? e : r === "__v_raw" ? s : Reflect.get(
    K(n, r) && r in s ? n : s,
    r,
    i
  );
}
const so = {
  get: /* @__PURE__ */ Ts(!1, !1)
}, ro = {
  get: /* @__PURE__ */ Ts(!1, !0)
}, io = {
  get: /* @__PURE__ */ Ts(!0, !1)
};
const Hr = /* @__PURE__ */ new WeakMap(), jr = /* @__PURE__ */ new WeakMap(), Br = /* @__PURE__ */ new WeakMap(), oo = /* @__PURE__ */ new WeakMap();
function lo(e) {
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
// @__NO_SIDE_EFFECTS__
function jn(e) {
  return /* @__PURE__ */ rt(e) ? e : Es(
    e,
    !1,
    Zi,
    so,
    Hr
  );
}
// @__NO_SIDE_EFFECTS__
function co(e) {
  return Es(
    e,
    !1,
    eo,
    ro,
    jr
  );
}
// @__NO_SIDE_EFFECTS__
function us(e) {
  return Es(
    e,
    !0,
    Qi,
    io,
    Br
  );
}
function Es(e, t, n, s, r) {
  if (!W(e) || e.__v_raw && !(t && e.__v_isReactive) || e.__v_skip || !Object.isExtensible(e))
    return e;
  const i = r.get(e);
  if (i)
    return i;
  const o = lo(ki(e));
  if (o === 0)
    return e;
  const l = new Proxy(
    e,
    o === 2 ? s : n
  );
  return r.set(e, l), l;
}
// @__NO_SIDE_EFFECTS__
function Ct(e) {
  return /* @__PURE__ */ rt(e) ? /* @__PURE__ */ Ct(e.__v_raw) : !!(e && e.__v_isReactive);
}
// @__NO_SIDE_EFFECTS__
function rt(e) {
  return !!(e && e.__v_isReadonly);
}
// @__NO_SIDE_EFFECTS__
function Ae(e) {
  return !!(e && e.__v_isShallow);
}
// @__NO_SIDE_EFFECTS__
function Ps(e) {
  return e ? !!e.__v_raw : !1;
}
// @__NO_SIDE_EFFECTS__
function U(e) {
  const t = e && e.__v_raw;
  return t ? /* @__PURE__ */ U(t) : e;
}
function ao(e) {
  return !K(e, "__v_skip") && Object.isExtensible(e) && wr(e, "__v_skip", !0), e;
}
const Fe = (e) => W(e) ? /* @__PURE__ */ jn(e) : e, Rt = (e) => W(e) ? /* @__PURE__ */ us(e) : e;
// @__NO_SIDE_EFFECTS__
function ge(e) {
  return e ? e.__v_isRef === !0 : !1;
}
// @__NO_SIDE_EFFECTS__
function pt(e) {
  return fo(e, !1);
}
function fo(e, t) {
  return /* @__PURE__ */ ge(e) ? e : new uo(e, t);
}
class uo {
  constructor(t, n) {
    this.dep = new ws(), this.__v_isRef = !0, this.__v_isShallow = !1, this._rawValue = n ? t : /* @__PURE__ */ U(t), this._value = n ? t : Fe(t), this.__v_isShallow = n;
  }
  get value() {
    return this.dep.track(), this._value;
  }
  set value(t) {
    const n = this._rawValue, s = this.__v_isShallow || /* @__PURE__ */ Ae(t) || /* @__PURE__ */ rt(t);
    t = s ? t : /* @__PURE__ */ U(t), Ue(t, n) && (this._rawValue = t, this._value = s ? t : Fe(t), this.dep.trigger());
  }
}
function ho(e) {
  return /* @__PURE__ */ ge(e) ? e.value : e;
}
const po = {
  get: (e, t, n) => t === "__v_raw" ? e : ho(Reflect.get(e, t, n)),
  set: (e, t, n, s) => {
    const r = e[t];
    return /* @__PURE__ */ ge(r) && !/* @__PURE__ */ ge(n) ? (r.value = n, !0) : Reflect.set(e, t, n, s);
  }
};
function Vr(e) {
  return /* @__PURE__ */ Ct(e) ? e : new Proxy(e, po);
}
class go {
  constructor(t, n, s) {
    this.fn = t, this.setter = n, this._value = void 0, this.dep = new ws(this), this.__v_isRef = !0, this.deps = void 0, this.depsTail = void 0, this.flags = 16, this.globalVersion = Xt - 1, this.next = void 0, this.effect = this, this.__v_isReadonly = !n, this.isSSR = s;
  }
  /**
   * @internal
   */
  notify() {
    if (this.flags |= 16, !(this.flags & 8) && // avoid infinite self recursion
    Z !== this)
      return Or(this, !0), !0;
  }
  get value() {
    const t = this.dep.track();
    return Fr(this), t && (t.version = this.dep.version), this._value;
  }
  set value(t) {
    this.setter && this.setter(t);
  }
}
// @__NO_SIDE_EFFECTS__
function mo(e, t, n = !1) {
  let s, r;
  return D(e) ? s = e : (s = e.get, r = e.set), new go(s, r, n);
}
const hn = {}, Cn = /* @__PURE__ */ new WeakMap();
let yt;
function vo(e, t = !1, n = yt) {
  if (n) {
    let s = Cn.get(n);
    s || Cn.set(n, s = []), s.push(e);
  }
}
function bo(e, t, n = Q) {
  const { immediate: s, deep: r, once: i, scheduler: o, augmentJob: l, call: c } = n, u = (P) => r ? P : /* @__PURE__ */ Ae(P) || r === !1 || r === 0 ? ct(P, 1) : ct(P);
  let f, m, x, T, R = !1, O = !1;
  if (/* @__PURE__ */ ge(e) ? (m = () => e.value, R = /* @__PURE__ */ Ae(e)) : /* @__PURE__ */ Ct(e) ? (m = () => u(e), R = !0) : M(e) ? (O = !0, R = e.some((P) => /* @__PURE__ */ Ct(P) || /* @__PURE__ */ Ae(P)), m = () => e.map((P) => {
    if (/* @__PURE__ */ ge(P))
      return P.value;
    if (/* @__PURE__ */ Ct(P))
      return u(P);
    if (D(P))
      return c ? c(P, 2) : P();
  })) : D(e) ? t ? m = c ? () => c(e, 2) : e : m = () => {
    if (x) {
      nt();
      try {
        x();
      } finally {
        st();
      }
    }
    const P = yt;
    yt = f;
    try {
      return c ? c(e, 3, [T]) : e(T);
    } finally {
      yt = P;
    }
  } : m = We, t && r) {
    const P = m, V = r === !0 ? 1 / 0 : r;
    m = () => ct(P(), V);
  }
  const J = Ki(), j = () => {
    f.stop(), J && J.active && ys(J.effects, f);
  };
  if (i && t) {
    const P = t;
    t = (...V) => {
      const se = P(...V);
      return j(), se;
    };
  }
  let F = O ? new Array(e.length).fill(hn) : hn;
  const $ = (P) => {
    if (!(!(f.flags & 1) || !f.dirty && !P))
      if (t) {
        const V = f.run();
        if (P || r || R || (O ? V.some((se, ae) => Ue(se, F[ae])) : Ue(V, F))) {
          x && x();
          const se = yt;
          yt = f;
          try {
            const ae = [
              V,
              // pass undefined as the old value when it's changed for the first time
              F === hn ? void 0 : O && F[0] === hn ? [] : F,
              T
            ];
            F = V, c ? c(t, 3, ae) : (
              // @ts-expect-error
              t(...ae)
            );
          } finally {
            yt = se;
          }
        }
      } else
        f.run();
  };
  return l && l($), f = new Ar(m), f.scheduler = o ? () => o($, !1) : $, T = (P) => vo(P, !1, f), x = f.onStop = () => {
    const P = Cn.get(f);
    if (P) {
      if (c)
        c(P, 4);
      else
        for (const V of P) V();
      Cn.delete(f);
    }
  }, t ? s ? $(!0) : F = f.run() : o ? o($.bind(null, !0), !0) : f.run(), j.pause = f.pause.bind(f), j.resume = f.resume.bind(f), j.stop = j, j;
}
function ct(e, t = 1 / 0, n) {
  if (t <= 0 || !W(e) || e.__v_skip || (n = n || /* @__PURE__ */ new Map(), (n.get(e) || 0) >= t))
    return e;
  if (n.set(e, t), t--, /* @__PURE__ */ ge(e))
    ct(e.value, t, n);
  else if (M(e))
    for (let s = 0; s < e.length; s++)
      ct(e[s], t, n);
  else if (Sn(e) || ft(e))
    e.forEach((s) => {
      ct(s, t, n);
    });
  else if (Sr(e)) {
    for (const s in e)
      ct(e[s], t, n);
    for (const s of Object.getOwnPropertySymbols(e))
      Object.prototype.propertyIsEnumerable.call(e, s) && ct(e[s], t, n);
  }
  return e;
}
function ln(e, t, n, s) {
  try {
    return s ? e(...s) : e();
  } catch (r) {
    Bn(r, t, n);
  }
}
function Ie(e, t, n, s) {
  if (D(e)) {
    const r = ln(e, t, n, s);
    return r && _r(r) && r.catch((i) => {
      Bn(i, t, n);
    }), r;
  }
  if (M(e)) {
    const r = [];
    for (let i = 0; i < e.length; i++)
      r.push(Ie(e[i], t, n, s));
    return r;
  }
}
function Bn(e, t, n, s = !0) {
  const r = t ? t.vnode : null, { errorHandler: i, throwUnhandledErrorInProduction: o } = t && t.appContext.config || Q;
  if (t) {
    let l = t.parent;
    const c = t.proxy, u = `https://vuejs.org/error-reference/#runtime-${n}`;
    for (; l; ) {
      const f = l.ec;
      if (f) {
        for (let m = 0; m < f.length; m++)
          if (f[m](e, c, u) === !1)
            return;
      }
      l = l.parent;
    }
    if (i) {
      nt(), ln(i, null, 10, [
        e,
        c,
        u
      ]), st();
      return;
    }
  }
  yo(e, n, r, s, o);
}
function yo(e, t, n, s = !0, r = !1) {
  if (r)
    throw e;
  console.error(e);
}
const ve = [];
let je = -1;
const Mt = [];
let lt = null, Ot = 0;
const Ur = /* @__PURE__ */ Promise.resolve();
let wn = null;
function Kr(e) {
  const t = wn || Ur;
  return e ? t.then(this ? e.bind(this) : e) : t;
}
function _o(e) {
  let t = je + 1, n = ve.length;
  for (; t < n; ) {
    const s = t + n >>> 1, r = ve[s], i = Qt(r);
    i < e || i === e && r.flags & 2 ? t = s + 1 : n = s;
  }
  return t;
}
function As(e) {
  if (!(e.flags & 1)) {
    const t = Qt(e), n = ve[ve.length - 1];
    !n || // fast path when the job id is larger than the tail
    !(e.flags & 2) && t >= Qt(n) ? ve.push(e) : ve.splice(_o(t), 0, e), e.flags |= 1, Wr();
  }
}
function Wr() {
  wn || (wn = Ur.then(qr));
}
function xo(e) {
  if (!M(e))
    lt && e.id === -1 ? lt.splice(Ot + 1, 0, e) : e.flags & 1 || (Mt.push(e), e.flags |= 1);
  else
    for (let t = 0; t < e.length; t++)
      Mt.push(e[t]);
  Wr();
}
function Vs(e, t, n = je + 1) {
  for (; n < ve.length; n++) {
    const s = ve[n];
    if (s && s.flags & 2) {
      if (e && s.id !== e.uid)
        continue;
      ve.splice(n, 1), n--, s.flags & 4 && (s.flags &= -2), s(), s.flags & 4 || (s.flags &= -2);
    }
  }
}
function zr(e) {
  if (Mt.length) {
    const t = [...new Set(Mt)].sort(
      (n, s) => Qt(n) - Qt(s)
    );
    if (Mt.length = 0, lt) {
      for (let n = 0; n < t.length; n++)
        lt.push(t[n]);
      return;
    }
    for (lt = t, Ot = 0; Ot < lt.length; Ot++) {
      const n = lt[Ot];
      n.flags & 4 && (n.flags &= -2), n.flags & 8 || n(), n.flags &= -2;
    }
    lt = null, Ot = 0;
  }
}
const Qt = (e) => e.id == null ? e.flags & 2 ? -1 : 1 / 0 : e.id;
function qr(e) {
  try {
    for (je = 0; je < ve.length; je++) {
      const t = ve[je];
      t && !(t.flags & 8) && (t.flags & 4 && (t.flags &= -2), ln(
        t,
        t.i,
        t.i ? 15 : 14
      ), t.flags & 4 || (t.flags &= -2));
    }
  } finally {
    for (; je < ve.length; je++) {
      const t = ve[je];
      t && (t.flags &= -2);
    }
    je = -1, ve.length = 0, zr(), wn = null, (ve.length || Mt.length) && qr();
  }
}
let Ke = null, Gr = null;
function Tn(e) {
  const t = Ke;
  return Ke = e, Gr = e && e.type.__scopeId || null, t;
}
function Bt(e, t = Ke, n) {
  if (!t || e._n)
    return e;
  const s = (...r) => {
    s._d && In(-1);
    const i = Tn(t), o = wt.length;
    let l;
    try {
      l = e(...r);
    } finally {
      for (let c = wt.length; c > o; c--) Si();
      Tn(i), s._d && In(1);
    }
    return l;
  };
  return s._n = !0, s._c = !0, s._d = !0, s;
}
function gt(e, t, n, s) {
  const r = e.dirs, i = t && t.dirs;
  for (let o = 0; o < r.length; o++) {
    const l = r[o];
    i && (l.oldValue = i[o].value);
    let c = l.dir[s];
    c && (nt(), Ie(c, n, 8, [
      e.el,
      l,
      e,
      t
    ]), st());
  }
}
function So(e, t) {
  if (ye) {
    let n = ye.provides;
    const s = ye.parent && ye.parent.provides;
    s === n && (n = ye.provides = Object.create(s)), n[e] = t;
  }
}
function _n(e, t, n = !1) {
  const s = Ti();
  if (s || Ft) {
    let r = Ft ? Ft._context.provides : s ? s.parent == null || s.ce ? s.vnode.appContext && s.vnode.appContext.provides : s.parent.provides : void 0;
    if (r && e in r)
      return r[e];
    if (arguments.length > 1)
      return n && D(t) ? t.call(s && s.proxy) : t;
  }
}
const Co = /* @__PURE__ */ Symbol.for("v-scx"), wo = () => _n(Co);
function at(e, t, n) {
  return Jr(e, t, n);
}
function Jr(e, t, n = Q) {
  const { immediate: s, deep: r, flush: i, once: o } = n, l = le({}, n), c = t && s || !t && i !== "post";
  let u;
  if (sn) {
    if (i === "sync") {
      const T = wo();
      u = T.__watcherHandles || (T.__watcherHandles = []);
    } else if (!c) {
      const T = () => {
      };
      return T.stop = We, T.resume = We, T.pause = We, T;
    }
  }
  const f = ye;
  l.call = (T, R, O) => Ie(T, f, R, O);
  let m = !1;
  i === "post" ? l.scheduler = (T) => {
    _e(T, f && f.suspense);
  } : i !== "sync" && (m = !0, l.scheduler = (T, R) => {
    R ? T() : As(T);
  }), l.augmentJob = (T) => {
    t && (T.flags |= 4), m && (T.flags |= 2, f && (T.id = f.uid, T.i = f));
  };
  const x = bo(e, t, l);
  return sn && (u ? u.push(x) : c && x()), x;
}
function To(e, t, n) {
  const s = this.proxy, r = ne(e) ? e.includes(".") ? Yr(s, e) : () => s[e] : e.bind(s, s);
  let i;
  D(t) ? i = t : (i = t.handler, n = t);
  const o = cn(this), l = Jr(r, i.bind(s), n);
  return o(), l;
}
function Yr(e, t) {
  const n = t.split(".");
  return () => {
    let s = e;
    for (let r = 0; r < n.length && s; r++)
      s = s[n[r]];
    return s;
  };
}
const Eo = /* @__PURE__ */ Symbol("_vte"), Vn = (e) => e.__isTeleport, Pe = /* @__PURE__ */ Symbol("_leaveCb"), Ht = /* @__PURE__ */ Symbol("_enterCb");
function Po() {
  const e = {
    isMounted: !1,
    isLeaving: !1,
    isUnmounting: !1,
    leavingVNodes: /* @__PURE__ */ new Map()
  };
  return Is(() => {
    e.isMounted = !0;
  }), Os(() => {
    e.isUnmounting = !0;
  }), e;
}
const Ee = [Function, Array], Xr = {
  mode: String,
  appear: Boolean,
  persisted: Boolean,
  // enter
  onBeforeEnter: Ee,
  onEnter: Ee,
  onAfterEnter: Ee,
  onEnterCancelled: Ee,
  // leave
  onBeforeLeave: Ee,
  onLeave: Ee,
  onAfterLeave: Ee,
  onLeaveCancelled: Ee,
  // appear
  onBeforeAppear: Ee,
  onAppear: Ee,
  onAfterAppear: Ee,
  onAppearCancelled: Ee
}, Zr = (e) => {
  const t = e.subTree;
  return t.component ? Zr(t.component) : t;
}, Ao = {
  name: "BaseTransition",
  props: Xr,
  setup(e, { slots: t }) {
    const n = Ti(), s = Po();
    return () => {
      const r = t.default && ti(t.default(), !0), i = r && r.length ? Qr(r) : (
        // Keep explicit default-slot conditionals on the same transition path
        // as regular v-if branches, which render a comment placeholder.
        n.subTree ? Ze() : void 0
      );
      if (!i)
        return;
      const o = /* @__PURE__ */ U(e), { mode: l } = o;
      if (s.isLeaving)
        return Qn(i);
      const c = En(i);
      if (!c)
        return Qn(i);
      let u = ds(
        c,
        o,
        s,
        n,
        // #11061, ensure enterHooks is fresh after clone
        (m) => u = m
      );
      c.type !== be && en(c, u);
      let f = n.subTree && En(n.subTree);
      if (f && f.type !== be && !_t(f, c) && Zr(n).type !== be) {
        let m = ds(
          f,
          o,
          s,
          n
        );
        if (en(f, m), l === "out-in" && c.type !== be)
          return s.isLeaving = !0, m.afterLeave = () => {
            s.isLeaving = !1, n.job.flags & 8 || n.update(), delete m.afterLeave, f = void 0;
          }, Qn(i);
        l === "in-out" && c.type !== be ? m.delayLeave = (x, T, R) => {
          const O = ei(
            s,
            f
          );
          O[String(f.key)] = f, x[Pe] = () => {
            T(), x[Pe] = void 0, delete u.delayedLeave, f = void 0;
          }, u.delayedLeave = () => {
            R(), delete u.delayedLeave, f = void 0;
          };
        } : f = void 0;
      } else f && (f = void 0);
      return i;
    };
  }
};
function Qr(e) {
  let t = e[0];
  if (e.length > 1) {
    for (const n of e)
      if (n.type !== be) {
        t = n;
        break;
      }
  }
  return t;
}
const Io = Ao;
function ei(e, t) {
  const { leavingVNodes: n } = e;
  let s = n.get(t.type);
  return s || (s = /* @__PURE__ */ Object.create(null), n.set(t.type, s)), s;
}
function ds(e, t, n, s, r) {
  const {
    appear: i,
    mode: o,
    persisted: l = !1,
    onBeforeEnter: c,
    onEnter: u,
    onAfterEnter: f,
    onEnterCancelled: m,
    onBeforeLeave: x,
    onLeave: T,
    onAfterLeave: R,
    onLeaveCancelled: O,
    onBeforeAppear: J,
    onAppear: j,
    onAfterAppear: F,
    onAppearCancelled: $
  } = t, P = String(e.key), V = ei(n, e), se = (N, L) => {
    N && Ie(
      N,
      s,
      9,
      L
    );
  }, ae = (N, L) => {
    const ee = L[1];
    se(N, L), M(N) ? N.every((E) => E.length <= 1) && ee() : N.length <= 1 && ee();
  }, he = {
    mode: o,
    persisted: l,
    beforeEnter(N) {
      let L = c;
      if (!n.isMounted)
        if (i)
          L = J || c;
        else
          return;
      N[Pe] && N[Pe](
        !0
        /* cancelled */
      );
      const ee = V[P];
      ee && _t(e, ee) && ee.el[Pe] && ee.el[Pe](), se(L, [N]);
    },
    enter(N) {
      if (V[P] === e) return;
      let L = u, ee = f, E = m;
      if (!n.isMounted)
        if (i)
          L = j || u, ee = F || f, E = $ || m;
        else
          return;
      let B = !1;
      N[Ht] = (xe) => {
        B || (B = !0, xe ? se(E, [N]) : se(ee, [N]), he.delayedLeave && he.delayedLeave(), N[Ht] = void 0);
      };
      const oe = N[Ht].bind(null, !1);
      L ? ae(L, [N, oe]) : oe();
    },
    leave(N, L) {
      const ee = String(e.key);
      if (N[Ht] && N[Ht](
        !0
        /* cancelled */
      ), n.isUnmounting)
        return L();
      se(x, [N]);
      let E = !1;
      N[Pe] = (oe) => {
        E || (E = !0, L(), oe ? se(O, [N]) : se(R, [N]), N[Pe] = void 0, V[ee] === e && delete V[ee]);
      };
      const B = N[Pe].bind(null, !1);
      V[ee] = e, T ? ae(T, [N, B]) : B();
    },
    clone(N) {
      const L = ds(
        N,
        t,
        n,
        s,
        r
      );
      return r && r(L), L;
    }
  };
  return he;
}
function Qn(e) {
  if (Un(e))
    return e = ut(e), e.children = null, e;
}
function En(e) {
  if (!Un(e))
    return Vn(e.type) && e.children ? Qr(e.children) : e;
  if (e.component)
    return e.component.subTree;
  const { shapeFlag: t, children: n } = e;
  if (n) {
    if (t & 16)
      return n[0];
    if (t & 32 && D(n.default))
      return n.default();
  }
}
function en(e, t) {
  if (e.shapeFlag & 6 && e.component) {
    e.transition = t;
    const n = e.component.subTree;
    en(
      Vn(n.type) && En(n) || n,
      t
    );
  } else e.shapeFlag & 128 ? (e.ssContent.transition = t.clone(e.ssContent), e.ssFallback.transition = t.clone(e.ssFallback)) : e.transition = t;
}
function ti(e, t = !1, n) {
  let s = [], r = 0;
  for (let i = 0; i < e.length; i++) {
    let o = e[i];
    const l = n == null ? o.key : String(n) + String(o.key != null ? o.key : i);
    o.type === ce ? (o.patchFlag & 128 && r++, s = s.concat(
      ti(o.children, t, l)
    )) : (t || o.type !== be) && s.push(l != null ? ut(o, { key: l }) : o);
  }
  if (r > 1)
    for (let i = 0; i < s.length; i++)
      s[i].patchFlag = -2;
  return s;
}
// @__NO_SIDE_EFFECTS__
function Oo(e, t) {
  return D(e) ? (
    // #8236: extend call and options.name access are considered side-effects
    // by Rollup, so we have to wrap it in a pure-annotated IIFE.
    le({ name: e.name }, t, { setup: e })
  ) : e;
}
function ni(e) {
  e.ids = [e.ids[0] + e.ids[2]++ + "-", 0, 0];
}
function Us(e, t) {
  let n;
  return !!((n = Object.getOwnPropertyDescriptor(e, t)) && !n.configurable);
}
const Pn = /* @__PURE__ */ new WeakMap();
function qt(e, t, n, s, r = !1) {
  if (M(e)) {
    e.forEach(
      (O, J) => qt(
        O,
        t && (M(t) ? t[J] : t),
        n,
        s,
        r
      )
    );
    return;
  }
  if (Gt(s) && !r) {
    s.shapeFlag & 512 && s.type.__asyncResolved && s.component.subTree.component && qt(e, t, n, s.component.subTree);
    return;
  }
  const i = s.shapeFlag & 4 ? Fs(s.component) : s.el, o = r ? null : i, { i: l, r: c } = e, u = t && t.r, f = l.refs === Q ? l.refs = {} : l.refs, m = l.setupState, x = /* @__PURE__ */ U(m), T = m === Q ? yr : (O) => Us(f, O) ? !1 : K(x, O), R = (O, J) => !(J && Us(f, J));
  if (u != null && u !== c) {
    if (Ks(t), ne(u))
      f[u] = null, T(u) && (m[u] = null);
    else if (/* @__PURE__ */ ge(u)) {
      const O = t;
      R(u, O.k) && (u.value = null), O.k && (f[O.k] = null);
    }
  }
  if (D(c))
    ln(c, l, 12, [o, f]);
  else {
    const O = ne(c), J = /* @__PURE__ */ ge(c);
    if (O || J) {
      const j = () => {
        if (e.f) {
          const F = O ? T(c) ? m[c] : f[c] : R() || !e.k ? c.value : f[e.k];
          if (r)
            M(F) && ys(F, i);
          else if (M(F))
            F.includes(i) || F.push(i);
          else if (O)
            f[c] = [i], T(c) && (m[c] = f[c]);
          else {
            const $ = [i];
            R(c, e.k) && (c.value = $), e.k && (f[e.k] = $);
          }
        } else O ? (f[c] = o, T(c) && (m[c] = o)) : J && (R(c, e.k) && (c.value = o), e.k && (f[e.k] = o));
      };
      if (o) {
        const F = () => {
          j(), Pn.delete(e);
        };
        F.id = -1, Pn.set(e, F), _e(F, n);
      } else
        Ks(e), j();
    }
  }
}
function Ks(e) {
  const t = Pn.get(e);
  t && (t.flags |= 8, Pn.delete(e));
}
$n().requestIdleCallback;
$n().cancelIdleCallback;
const Gt = (e) => !!e.type.__asyncLoader, Un = (e) => e.type.__isKeepAlive;
function ko(e, t) {
  si(e, "a", t);
}
function Mo(e, t) {
  si(e, "da", t);
}
function si(e, t, n = ye) {
  const s = e.__wdc || (e.__wdc = () => {
    let r = n;
    for (; r; ) {
      if (r.isDeactivated)
        return;
      r = r.parent;
    }
    return e();
  });
  if (Kn(t, s, n), n) {
    let r = n.parent;
    for (; r && r.parent; )
      Un(r.parent.vnode) && Fo(s, t, n, r), r = r.parent;
  }
}
function Fo(e, t, n, s) {
  const r = Kn(
    t,
    e,
    s,
    !0
    /* prepend */
  );
  ri(() => {
    ys(s[t], r);
  }, n);
}
function Kn(e, t, n = ye, s = !1) {
  if (n) {
    const r = n[e] || (n[e] = []), i = t.__weh || (t.__weh = (...o) => {
      nt();
      const l = cn(n), c = Ie(t, n, e, o);
      return l(), st(), c;
    });
    return s ? r.unshift(i) : r.push(i), i;
  }
}
const it = (e) => (t, n = ye) => {
  (!sn || e === "sp") && Kn(e, (...s) => t(...s), n);
}, Ro = it("bm"), Is = it("m"), No = it(
  "bu"
), Do = it("u"), Os = it(
  "bum"
), ri = it("um"), $o = it(
  "sp"
), Lo = it("rtg"), Ho = it("rtc");
function jo(e, t = ye) {
  Kn("ec", e, t);
}
const Bo = /* @__PURE__ */ Symbol.for("v-ndc");
function pn(e, t, n, s) {
  let r;
  const i = n, o = M(e);
  if (o || ne(e)) {
    const l = o && /* @__PURE__ */ Ct(e);
    let c = !1, u = !1;
    l && (c = !/* @__PURE__ */ Ae(e), u = /* @__PURE__ */ rt(e), e = Hn(e)), r = new Array(e.length);
    for (let f = 0, m = e.length; f < m; f++)
      r[f] = t(
        c ? u ? Rt(Fe(e[f])) : Fe(e[f]) : e[f],
        f,
        void 0,
        i
      );
  } else if (typeof e == "number") {
    r = new Array(e);
    for (let l = 0; l < e; l++)
      r[l] = t(l + 1, l, void 0, i);
  } else if (W(e))
    if (e[Symbol.iterator])
      r = Array.from(
        e,
        (l, c) => t(l, c, void 0, i)
      );
    else {
      const l = Object.keys(e);
      r = new Array(l.length);
      for (let c = 0, u = l.length; c < u; c++) {
        const f = l[c];
        r[c] = t(e[f], f, c, i);
      }
    }
  else
    r = [];
  return r;
}
const hs = (e) => e ? Ei(e) ? Fs(e) : hs(e.parent) : null, Jt = (
  // Move PURE marker to new line to workaround compiler discarding it
  // due to type annotation
  /* @__PURE__ */ le(/* @__PURE__ */ Object.create(null), {
    $: (e) => e,
    $el: (e) => e.vnode.el,
    $data: (e) => e.data,
    $props: (e) => e.props,
    $attrs: (e) => e.attrs,
    $slots: (e) => e.slots,
    $refs: (e) => e.refs,
    $parent: (e) => hs(e.parent),
    $root: (e) => hs(e.root),
    $host: (e) => e.ce,
    $emit: (e) => e.emit,
    $options: (e) => oi(e),
    $forceUpdate: (e) => e.f || (e.f = () => {
      As(e.update);
    }),
    $nextTick: (e) => e.n || (e.n = Kr.bind(e.proxy)),
    $watch: (e) => To.bind(e)
  })
), es = (e, t) => e !== Q && !e.__isScriptSetup && K(e, t), Vo = {
  get({ _: e }, t) {
    if (t === "__v_skip")
      return !0;
    const { ctx: n, setupState: s, data: r, props: i, accessCache: o, type: l, appContext: c } = e;
    if (t[0] !== "$") {
      const x = o[t];
      if (x !== void 0)
        switch (x) {
          case 1:
            return s[t];
          case 2:
            return r[t];
          case 4:
            return n[t];
          case 3:
            return i[t];
        }
      else {
        if (es(s, t))
          return o[t] = 1, s[t];
        if (r !== Q && K(r, t))
          return o[t] = 2, r[t];
        if (K(i, t))
          return o[t] = 3, i[t];
        if (n !== Q && K(n, t))
          return o[t] = 4, n[t];
        ps && (o[t] = 0);
      }
    }
    const u = Jt[t];
    let f, m;
    if (u)
      return t === "$attrs" && pe(e.attrs, "get", ""), u(e);
    if (
      // css module (injected by vue-loader)
      (f = l.__cssModules) && (f = f[t])
    )
      return f;
    if (n !== Q && K(n, t))
      return o[t] = 4, n[t];
    if (
      // global properties
      m = c.config.globalProperties, K(m, t)
    )
      return m[t];
  },
  set({ _: e }, t, n) {
    const { data: s, setupState: r, ctx: i } = e;
    return es(r, t) ? (r[t] = n, !0) : s !== Q && K(s, t) ? (s[t] = n, !0) : K(e.props, t) || t[0] === "$" && t.slice(1) in e ? !1 : (i[t] = n, !0);
  },
  has({
    _: { data: e, setupState: t, accessCache: n, ctx: s, appContext: r, props: i, type: o }
  }, l) {
    let c;
    return !!(n[l] || e !== Q && l[0] !== "$" && K(e, l) || es(t, l) || K(i, l) || K(s, l) || K(Jt, l) || K(r.config.globalProperties, l) || (c = o.__cssModules) && c[l]);
  },
  defineProperty(e, t, n) {
    return n.get != null ? e._.accessCache[t] = 0 : K(n, "value") && this.set(e, t, n.value, null), Reflect.defineProperty(e, t, n);
  }
};
function Ws(e) {
  return M(e) ? e.reduce(
    (t, n) => (t[n] = null, t),
    {}
  ) : e;
}
let ps = !0;
function Uo(e) {
  const t = oi(e), n = e.proxy, s = e.ctx;
  ps = !1, t.beforeCreate && zs(t.beforeCreate, e, "bc");
  const {
    // state
    data: r,
    computed: i,
    methods: o,
    watch: l,
    provide: c,
    inject: u,
    // lifecycle
    created: f,
    beforeMount: m,
    mounted: x,
    beforeUpdate: T,
    updated: R,
    activated: O,
    deactivated: J,
    beforeDestroy: j,
    beforeUnmount: F,
    destroyed: $,
    unmounted: P,
    render: V,
    renderTracked: se,
    renderTriggered: ae,
    errorCaptured: he,
    serverPrefetch: N,
    // public API
    expose: L,
    inheritAttrs: ee,
    // assets
    components: E,
    directives: B,
    filters: oe
  } = t;
  if (u && Ko(u, s, null), o)
    for (const q in o) {
      const z = o[q];
      D(z) && (s[q] = z.bind(n));
    }
  if (r) {
    const q = r.call(n, n);
    W(q) && (e.data = /* @__PURE__ */ jn(q));
  }
  if (ps = !0, i)
    for (const q in i) {
      const z = i[q], qe = D(z) ? z.bind(n, n) : D(z.get) ? z.get.bind(n, n) : We, Et = !D(z) && D(z.set) ? z.set.bind(n) : We, Ge = He({
        get: qe,
        set: Et
      });
      Object.defineProperty(s, q, {
        enumerable: !0,
        configurable: !0,
        get: () => Ge.value,
        set: (we) => Ge.value = we
      });
    }
  if (l)
    for (const q in l)
      ii(l[q], s, n, q);
  if (c) {
    const q = D(c) ? c.call(n) : c;
    Reflect.ownKeys(q).forEach((z) => {
      So(z, q[z]);
    });
  }
  f && zs(f, e, "c");
  function re(q, z) {
    M(z) ? z.forEach((qe) => q(qe.bind(n))) : z && q(z.bind(n));
  }
  if (re(Ro, m), re(Is, x), re(No, T), re(Do, R), re(ko, O), re(Mo, J), re(jo, he), re(Ho, se), re(Lo, ae), re(Os, F), re(ri, P), re($o, N), M(L))
    if (L.length) {
      const q = e.exposed || (e.exposed = {});
      L.forEach((z) => {
        Object.defineProperty(q, z, {
          get: () => n[z],
          set: (qe) => n[z] = qe,
          enumerable: !0
        });
      });
    } else e.exposed || (e.exposed = {});
  V && e.render === We && (e.render = V), ee != null && (e.inheritAttrs = ee), E && (e.components = E), B && (e.directives = B), N && ni(e);
}
function Ko(e, t, n = We) {
  M(e) && (e = gs(e));
  for (const s in e) {
    const r = e[s];
    let i;
    W(r) ? "default" in r ? i = _n(
      r.from || s,
      r.default,
      !0
    ) : i = _n(r.from || s) : i = _n(r), /* @__PURE__ */ ge(i) ? Object.defineProperty(t, s, {
      enumerable: !0,
      configurable: !0,
      get: () => i.value,
      set: (o) => i.value = o
    }) : t[s] = i;
  }
}
function zs(e, t, n) {
  Ie(
    M(e) ? e.map((s) => s.bind(t.proxy)) : e.bind(t.proxy),
    t,
    n
  );
}
function ii(e, t, n, s) {
  let r = s.includes(".") ? Yr(n, s) : () => n[s];
  if (ne(e)) {
    const i = t[e];
    D(i) && at(r, i);
  } else if (D(e))
    at(r, e.bind(n));
  else if (W(e))
    if (M(e))
      e.forEach((i) => ii(i, t, n, s));
    else {
      const i = D(e.handler) ? e.handler.bind(n) : t[e.handler];
      D(i) && at(r, i, e);
    }
}
function oi(e) {
  const t = e.type, { mixins: n, extends: s } = t, {
    mixins: r,
    optionsCache: i,
    config: { optionMergeStrategies: o }
  } = e.appContext, l = i.get(t);
  let c;
  return l ? c = l : !r.length && !n && !s ? c = t : (c = {}, r.length && r.forEach(
    (u) => An(c, u, o, !0)
  ), An(c, t, o)), W(t) && i.set(t, c), c;
}
function An(e, t, n, s = !1) {
  const { mixins: r, extends: i } = t;
  i && An(e, i, n, !0), r && r.forEach(
    (o) => An(e, o, n, !0)
  );
  for (const o in t)
    if (!(s && o === "expose")) {
      const l = Wo[o] || n && n[o];
      e[o] = l ? l(e[o], t[o]) : t[o];
    }
  return e;
}
const Wo = {
  data: qs,
  props: Gs,
  emits: Gs,
  // objects
  methods: Vt,
  computed: Vt,
  // lifecycle
  beforeCreate: me,
  created: me,
  beforeMount: me,
  mounted: me,
  beforeUpdate: me,
  updated: me,
  beforeDestroy: me,
  beforeUnmount: me,
  destroyed: me,
  unmounted: me,
  activated: me,
  deactivated: me,
  errorCaptured: me,
  serverPrefetch: me,
  // assets
  components: Vt,
  directives: Vt,
  // watch
  watch: qo,
  // provide / inject
  provide: qs,
  inject: zo
};
function qs(e, t) {
  return t ? e ? function() {
    return le(
      D(e) ? e.call(this, this) : e,
      D(t) ? t.call(this, this) : t
    );
  } : t : e;
}
function zo(e, t) {
  return Vt(gs(e), gs(t));
}
function gs(e) {
  if (M(e)) {
    const t = {};
    for (let n = 0; n < e.length; n++)
      t[e[n]] = e[n];
    return t;
  }
  return e;
}
function me(e, t) {
  return e ? [...new Set([].concat(e, t))] : t;
}
function Vt(e, t) {
  return e ? le(/* @__PURE__ */ Object.create(null), e, t) : t;
}
function Gs(e, t) {
  return e ? M(e) && M(t) ? [.../* @__PURE__ */ new Set([...e, ...t])] : le(
    /* @__PURE__ */ Object.create(null),
    Ws(e),
    Ws(t ?? {})
  ) : t;
}
function qo(e, t) {
  if (!e) return t;
  if (!t) return e;
  const n = le(/* @__PURE__ */ Object.create(null), e);
  for (const s in t)
    n[s] = me(e[s], t[s]);
  return n;
}
function li() {
  return {
    app: null,
    config: {
      isNativeTag: yr,
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
let Go = 0;
function Jo(e, t) {
  return function(s, r = null) {
    D(s) || (s = le({}, s)), r != null && !W(r) && (r = null);
    const i = li(), o = /* @__PURE__ */ new WeakSet(), l = [];
    let c = !1;
    const u = i.app = {
      _uid: Go++,
      _component: s,
      _props: r,
      _container: null,
      _context: i,
      _instance: null,
      version: Pl,
      get config() {
        return i.config;
      },
      set config(f) {
      },
      use(f, ...m) {
        return o.has(f) || (f && D(f.install) ? (o.add(f), f.install(u, ...m)) : D(f) && (o.add(f), f(u, ...m))), u;
      },
      mixin(f) {
        return i.mixins.includes(f) || i.mixins.push(f), u;
      },
      component(f, m) {
        return m ? (i.components[f] = m, u) : i.components[f];
      },
      directive(f, m) {
        return m ? (i.directives[f] = m, u) : i.directives[f];
      },
      mount(f, m, x) {
        if (!c) {
          const T = u._ceVNode || de(s, r);
          return T.appContext = i, x === !0 ? x = "svg" : x === !1 && (x = void 0), e(T, f, x), c = !0, u._container = f, f.__vue_app__ = u, Fs(T.component);
        }
      },
      onUnmount(f) {
        l.push(f);
      },
      unmount() {
        c && (Ie(
          l,
          u._instance,
          16
        ), e(null, u._container), delete u._container.__vue_app__);
      },
      provide(f, m) {
        return i.provides[f] = m, u;
      },
      runWithContext(f) {
        const m = Ft;
        Ft = u;
        try {
          return f();
        } finally {
          Ft = m;
        }
      }
    };
    return u;
  };
}
let Ft = null;
const Yo = (e, t) => t === "modelValue" || t === "model-value" ? e.modelModifiers : e[`${t}Modifiers`] || e[`${ke(t)}Modifiers`] || e[`${Tt(t)}Modifiers`];
function Xo(e, t, ...n) {
  if (e.isUnmounted) return;
  const s = e.vnode.props || Q;
  let r = n;
  const i = t.startsWith("update:"), o = i && Yo(s, t.slice(7));
  o && (o.trim && (r = n.map((f) => ne(f) ? f.trim() : f)), o.number && (r = r.map(Ri)));
  let l, c = s[l = qn(t)] || // also try camelCase event handler (#2249)
  s[l = qn(ke(t))];
  !c && i && (c = s[l = qn(Tt(t))]), c && Ie(
    c,
    e,
    6,
    r
  );
  const u = s[l + "Once"];
  if (u) {
    if (!e.emitted)
      e.emitted = {};
    else if (e.emitted[l])
      return;
    e.emitted[l] = !0, Ie(
      u,
      e,
      6,
      r
    );
  }
}
const Zo = /* @__PURE__ */ new WeakMap();
function ci(e, t, n = !1) {
  const s = n ? Zo : t.emitsCache, r = s.get(e);
  if (r !== void 0)
    return r;
  const i = e.emits;
  let o = {}, l = !1;
  if (!D(e)) {
    const c = (u) => {
      const f = ci(u, t, !0);
      f && (l = !0, le(o, f));
    };
    !n && t.mixins.length && t.mixins.forEach(c), e.extends && c(e.extends), e.mixins && e.mixins.forEach(c);
  }
  return !i && !l ? (W(e) && s.set(e, null), null) : (M(i) ? i.forEach((c) => o[c] = null) : le(o, i), W(e) && s.set(e, o), o);
}
function Wn(e, t) {
  return !e || !Rn(t) ? !1 : (t = t.slice(2), t = t === "Once" ? t : t.replace(/Once$/, ""), K(e, t[0].toLowerCase() + t.slice(1)) || K(e, Tt(t)) || K(e, t));
}
function Js(e) {
  const {
    type: t,
    vnode: n,
    proxy: s,
    withProxy: r,
    propsOptions: [i],
    slots: o,
    attrs: l,
    emit: c,
    render: u,
    renderCache: f,
    props: m,
    data: x,
    setupState: T,
    ctx: R,
    inheritAttrs: O
  } = e, J = Tn(e);
  let j, F;
  try {
    if (n.shapeFlag & 4) {
      const P = r || s, V = P;
      j = Ve(
        u.call(
          V,
          P,
          f,
          m,
          T,
          x,
          R
        )
      ), F = l;
    } else {
      const P = t;
      j = Ve(
        P.length > 1 ? P(
          m,
          { attrs: l, slots: o, emit: c }
        ) : P(
          m,
          null
        )
      ), F = t.props ? l : Qo(l);
    }
  } catch (P) {
    wt.length = 0, Bn(P, e, 1), j = de(be);
  }
  let $ = j;
  if (F && O !== !1) {
    const P = Object.keys(F), { shapeFlag: V } = $;
    P.length && V & 7 && (i && P.some(Nn) && (F = el(
      F,
      i
    )), $ = ut($, F, !1, !0));
  }
  if (n.dirs && ($ = ut($, null, !1, !0), $.dirs = $.dirs ? $.dirs.concat(n.dirs) : n.dirs), n.transition) {
    const P = Vn($.type) && En($) || $;
    en(P, n.transition);
  }
  return j = $, Tn(J), j;
}
const Qo = (e) => {
  let t;
  for (const n in e)
    (n === "class" || n === "style" || Rn(n)) && ((t || (t = {}))[n] = e[n]);
  return t;
}, el = (e, t) => {
  const n = {};
  for (const s in e)
    (!Nn(s) || !(s.slice(9) in t)) && (n[s] = e[s]);
  return n;
};
function tl(e, t, n) {
  const { props: s, children: r, component: i } = e, { props: o, children: l, patchFlag: c } = t, u = i.emitsOptions;
  if (t.dirs || t.transition)
    return !0;
  if (n && c >= 0) {
    if (c & 1024)
      return !0;
    if (c & 16)
      return s ? Ys(s, o, u) : !!o;
    if (c & 8) {
      const f = t.dynamicProps;
      for (let m = 0; m < f.length; m++) {
        const x = f[m];
        if (ai(o, s, x) && !Wn(u, x))
          return !0;
      }
    }
  } else
    return (r || l) && (!l || !l.$stable) ? !0 : s === o ? !1 : s ? o ? Ys(s, o, u) : !0 : !!o;
  return !1;
}
function Ys(e, t, n) {
  const s = Object.keys(t);
  if (s.length !== Object.keys(e).length)
    return !0;
  for (let r = 0; r < s.length; r++) {
    const i = s[r];
    if (ai(t, e, i) && !Wn(n, i))
      return !0;
  }
  return !1;
}
function ai(e, t, n) {
  const s = e[n], r = t[n];
  return n === "style" && W(s) && W(r) ? !Ln(s, r) : s !== r;
}
function nl({ vnode: e, parent: t, suspense: n }, s) {
  for (; t; ) {
    const r = t.subTree;
    if (r.suspense && r.suspense.activeBranch === e && (r.suspense.vnode.el = r.el = s, e = r), r === e)
      (e = t.vnode).el = s, t = t.parent;
    else
      break;
  }
  n && n.activeBranch === e && (n.vnode.el = s);
}
const fi = {}, ui = () => Object.create(fi), di = (e) => Object.getPrototypeOf(e) === fi;
function sl(e, t, n, s = !1) {
  const r = {}, i = ui();
  e.propsDefaults = /* @__PURE__ */ Object.create(null), hi(e, t, r, i);
  for (const o in e.propsOptions[0])
    o in r || (r[o] = void 0);
  n ? e.props = s ? r : /* @__PURE__ */ co(r) : e.type.props ? e.props = r : e.props = i, e.attrs = i;
}
function rl(e, t, n, s) {
  const {
    props: r,
    attrs: i,
    vnode: { patchFlag: o }
  } = e, l = /* @__PURE__ */ U(r), [c] = e.propsOptions;
  let u = !1;
  if (
    // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    (s || o > 0) && !(o & 16)
  ) {
    if (o & 8) {
      const f = e.vnode.dynamicProps;
      for (let m = 0; m < f.length; m++) {
        let x = f[m];
        if (Wn(e.emitsOptions, x))
          continue;
        const T = t[x];
        if (c)
          if (K(i, x))
            T !== i[x] && (i[x] = T, u = !0);
          else {
            const R = ke(x);
            r[R] = ms(
              c,
              l,
              R,
              T,
              e,
              !1
            );
          }
        else
          T !== i[x] && (i[x] = T, u = !0);
      }
    }
  } else {
    hi(e, t, r, i) && (u = !0);
    let f;
    for (const m in l)
      (!t || // for camelCase
      !K(t, m) && // it's possible the original props was passed in as kebab-case
      // and converted to camelCase (#955)
      ((f = Tt(m)) === m || !K(t, f))) && (c ? n && // for camelCase
      (n[m] !== void 0 || // for kebab-case
      n[f] !== void 0) && (r[m] = ms(
        c,
        l,
        m,
        void 0,
        e,
        !0
      )) : delete r[m]);
    if (i !== l)
      for (const m in i)
        (!t || !K(t, m)) && (delete i[m], u = !0);
  }
  u && tt(e.attrs, "set", "");
}
function hi(e, t, n, s) {
  const [r, i] = e.propsOptions;
  let o = !1, l;
  if (t)
    for (let c in t) {
      if (Kt(c))
        continue;
      const u = t[c];
      let f;
      r && K(r, f = ke(c)) ? !i || !i.includes(f) ? n[f] = u : (l || (l = {}))[f] = u : Wn(e.emitsOptions, c) || (!(c in s) || u !== s[c]) && (s[c] = u, o = !0);
    }
  if (i) {
    const c = /* @__PURE__ */ U(n), u = l || Q;
    for (let f = 0; f < i.length; f++) {
      const m = i[f];
      n[m] = ms(
        r,
        c,
        m,
        u[m],
        e,
        !K(u, m)
      );
    }
  }
  return o;
}
function ms(e, t, n, s, r, i) {
  const o = e[n];
  if (o != null) {
    const l = K(o, "default");
    if (l && s === void 0) {
      const c = o.default;
      if (o.type !== Function && !o.skipFactory && D(c)) {
        const { propsDefaults: u } = r;
        if (n in u)
          s = u[n];
        else {
          const f = cn(r);
          s = u[n] = c.call(
            null,
            t
          ), f();
        }
      } else
        s = c;
      r.ce && r.ce._setProp(n, s);
    }
    o[
      0
      /* shouldCast */
    ] && (i && !l ? s = !1 : o[
      1
      /* shouldCastTrue */
    ] && (s === "" || s === Tt(n)) && (s = !0));
  }
  return s;
}
const il = /* @__PURE__ */ new WeakMap();
function pi(e, t, n = !1) {
  const s = n ? il : t.propsCache, r = s.get(e);
  if (r)
    return r;
  const i = e.props, o = {}, l = [];
  let c = !1;
  if (!D(e)) {
    const f = (m) => {
      c = !0;
      const [x, T] = pi(m, t, !0);
      le(o, x), T && l.push(...T);
    };
    !n && t.mixins.length && t.mixins.forEach(f), e.extends && f(e.extends), e.mixins && e.mixins.forEach(f);
  }
  if (!i && !c)
    return W(e) && s.set(e, kt), kt;
  if (M(i))
    for (let f = 0; f < i.length; f++) {
      const m = ke(i[f]);
      Xs(m) && (o[m] = Q);
    }
  else if (i)
    for (const f in i) {
      const m = ke(f);
      if (Xs(m)) {
        const x = i[f], T = o[m] = M(x) || D(x) ? { type: x } : le({}, x), R = T.type;
        let O = !1, J = !0;
        if (M(R))
          for (let j = 0; j < R.length; ++j) {
            const F = R[j], $ = D(F) && F.name;
            if ($ === "Boolean") {
              O = !0;
              break;
            } else $ === "String" && (J = !1);
          }
        else
          O = D(R) && R.name === "Boolean";
        T[
          0
          /* shouldCast */
        ] = O, T[
          1
          /* shouldCastTrue */
        ] = J, (O || K(T, "default")) && l.push(m);
      }
    }
  const u = [o, l];
  return W(e) && s.set(e, u), u;
}
function Xs(e) {
  return e[0] !== "$" && !Kt(e);
}
const ks = (e) => e === "_" || e === "_ctx" || e === "$stable", Ms = (e) => M(e) ? e.map(Ve) : [Ve(e)], ol = (e, t, n) => {
  if (t._n)
    return t;
  const s = Bt((...r) => Ms(t(...r)), n);
  return s._c = !1, s;
}, gi = (e, t, n) => {
  const s = e._ctx;
  for (const r in e) {
    if (ks(r)) continue;
    const i = e[r];
    if (D(i))
      t[r] = ol(r, i, s);
    else if (i != null) {
      const o = Ms(i);
      t[r] = () => o;
    }
  }
}, mi = (e, t) => {
  const n = Ms(t);
  e.slots.default = () => n;
}, vi = (e, t, n) => {
  for (const s in t)
    (n || !ks(s)) && (e[s] = t[s]);
}, ll = (e, t, n) => {
  const s = e.slots = ui();
  if (e.vnode.shapeFlag & 32) {
    const r = t._;
    r ? (vi(s, t, n), n && wr(s, "_", r, !0)) : gi(t, s);
  } else t && mi(e, t);
}, cl = (e, t, n) => {
  const { vnode: s, slots: r } = e;
  let i = !0, o = Q;
  if (s.shapeFlag & 32) {
    const l = t._;
    l ? n && l === 1 ? i = !1 : vi(r, t, n) : (i = !t.$stable, gi(t, r)), o = t;
  } else t && (mi(e, t), o = { default: 1 });
  if (i)
    for (const l in r)
      !ks(l) && o[l] == null && delete r[l];
}, _e = hl;
function al(e) {
  return fl(e);
}
function fl(e, t) {
  const n = $n();
  n.__VUE__ = !0;
  const {
    insert: s,
    remove: r,
    patchProp: i,
    createElement: o,
    createText: l,
    createComment: c,
    setText: u,
    setElementText: f,
    parentNode: m,
    nextSibling: x,
    setScopeId: T = We,
    insertStaticContent: R
  } = e, O = (a, d, v, _ = null, y = null, b = null, C = void 0, h = null, g = !!d.dynamicChildren) => {
    if (a === d)
      return;
    a && !_t(a, d) && (_ = At(a), we(a, y, b, !0), a = null), d.patchFlag === -2 && (g = !1, d.dynamicChildren = null);
    const { type: p, ref: S, shapeFlag: w } = d;
    switch (p) {
      case zn:
        J(a, d, v, _);
        break;
      case be:
        j(a, d, v, _);
        break;
      case ns:
        a == null && F(d, v, _, C);
        break;
      case ce:
        E(
          a,
          d,
          v,
          _,
          y,
          b,
          C,
          h,
          g
        );
        break;
      default:
        w & 1 ? V(
          a,
          d,
          v,
          _,
          y,
          b,
          C,
          h,
          g
        ) : w & 6 ? B(
          a,
          d,
          v,
          _,
          y,
          b,
          C,
          h,
          g
        ) : (w & 64 || w & 128) && p.process(
          a,
          d,
          v,
          _,
          y,
          b,
          C,
          h,
          g,
          Te
        );
    }
    S != null && y ? qt(S, a && a.ref, b, d || a, !d) : S == null && a && a.ref != null && qt(a.ref, null, b, a, !0);
  }, J = (a, d, v, _) => {
    if (a == null)
      s(
        d.el = l(d.children),
        v,
        _
      );
    else {
      const y = d.el = a.el;
      d.children !== a.children && u(y, d.children);
    }
  }, j = (a, d, v, _) => {
    a == null ? s(
      d.el = c(d.children || ""),
      v,
      _
    ) : d.el = a.el;
  }, F = (a, d, v, _) => {
    [a.el, a.anchor] = R(
      a.children,
      d,
      v,
      _,
      a.el,
      a.anchor
    );
  }, $ = ({ el: a, anchor: d }, v, _) => {
    let y;
    for (; a && a !== d; )
      y = x(a), s(a, v, _), a = y;
    s(d, v, _);
  }, P = ({ el: a, anchor: d }) => {
    let v;
    for (; a && a !== d; )
      v = x(a), r(a), a = v;
    r(d);
  }, V = (a, d, v, _, y, b, C, h, g) => {
    if (d.type === "svg" ? C = "svg" : d.type === "math" && (C = "mathml"), a == null)
      se(
        d,
        v,
        _,
        y,
        b,
        C,
        h,
        g
      );
    else {
      const p = a.el && a.el._isVueCE ? a.el : null;
      try {
        p && p._beginPatch(), N(
          a,
          d,
          y,
          b,
          C,
          h,
          g
        );
      } finally {
        p && p._endPatch();
      }
    }
  }, se = (a, d, v, _, y, b, C, h) => {
    let g, p;
    const { props: S, shapeFlag: w, transition: I, dirs: k } = a;
    if (g = a.el = o(
      a.type,
      b,
      S && S.is,
      S
    ), w & 8 ? f(g, a.children) : w & 16 && he(
      a.children,
      g,
      null,
      _,
      y,
      ts(a, b),
      C,
      h
    ), k && gt(a, null, _, "created"), ae(g, a, a.scopeId, C, _), S) {
      for (const Y in S)
        Y !== "value" && !Kt(Y) && i(g, Y, null, S[Y], b, _);
      "value" in S && i(g, "value", null, S.value, b), (p = S.onVnodeBeforeMount) && $e(p, _, a);
    }
    k && gt(a, null, _, "beforeMount");
    const H = ul(y, I);
    H && I.beforeEnter(g), s(g, d, v), ((p = S && S.onVnodeMounted) || H || k) && _e(() => {
      p && $e(p, _, a), H && I.enter(g), k && gt(a, null, _, "mounted");
    }, y);
  }, ae = (a, d, v, _, y) => {
    if (v && T(a, v), _)
      for (let b = 0; b < _.length; b++)
        T(a, _[b]);
    if (y) {
      let b = y.subTree;
      if (d === b || xi(b.type) && (b.ssContent === d || b.ssFallback === d)) {
        const C = y.vnode;
        ae(
          a,
          C,
          C.scopeId,
          C.slotScopeIds,
          y.parent
        );
      }
    }
  }, he = (a, d, v, _, y, b, C, h, g = 0) => {
    for (let p = g; p < a.length; p++) {
      const S = a[p] = h ? et(a[p]) : Ve(a[p]);
      O(
        null,
        S,
        d,
        v,
        _,
        y,
        b,
        C,
        h
      );
    }
  }, N = (a, d, v, _, y, b, C) => {
    const h = d.el = a.el;
    let { patchFlag: g, dynamicChildren: p, dirs: S } = d;
    g |= a.patchFlag & 16;
    const w = a.props || Q, I = d.props || Q;
    let k;
    if (v && mt(v, !1), (k = I.onVnodeBeforeUpdate) && $e(k, v, d, a), S && gt(d, a, v, "beforeUpdate"), v && mt(v, !0), // #6385 the old vnode may be a user-wrapped non-isomorphic block
    // Force full diff when block metadata is unstable.
    p && (!a.dynamicChildren || a.dynamicChildren.length !== p.length) && (g = 0, C = !1, p = null), (w.innerHTML && I.innerHTML == null || w.textContent && I.textContent == null) && f(h, ""), p ? L(
      a.dynamicChildren,
      p,
      h,
      v,
      _,
      ts(d, y),
      b
    ) : C || z(
      a,
      d,
      h,
      null,
      v,
      _,
      ts(d, y),
      b,
      !1
    ), g > 0) {
      if (g & 16)
        ee(h, w, I, v, y);
      else if (g & 2 && w.class !== I.class && i(h, "class", null, I.class, y), g & 4 && i(h, "style", w.style, I.style, y), g & 8) {
        const H = d.dynamicProps;
        for (let Y = 0; Y < H.length; Y++) {
          const G = H[Y], ie = w[G], fe = I[G];
          (fe !== ie || G === "value") && i(h, G, ie, fe, y, v);
        }
      }
      g & 1 && a.children !== d.children && f(h, d.children);
    } else !C && p == null && ee(h, w, I, v, y);
    ((k = I.onVnodeUpdated) || S) && _e(() => {
      k && $e(k, v, d, a), S && gt(d, a, v, "updated");
    }, _);
  }, L = (a, d, v, _, y, b, C) => {
    for (let h = 0; h < d.length; h++) {
      const g = a[h], p = d[h], S = (
        // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        g.el && // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        (g.type === ce || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !_t(g, p) || // - In the case of a component, it could contain anything.
        g.shapeFlag & 198) ? m(g.el) : (
          // In other cases, the parent container is not actually used so we
          // just pass the block element here to avoid a DOM parentNode call.
          v
        )
      );
      O(
        g,
        p,
        S,
        null,
        _,
        y,
        b,
        C,
        !0
      );
    }
  }, ee = (a, d, v, _, y) => {
    if (d !== v) {
      if (d !== Q)
        for (const b in d)
          !Kt(b) && !(b in v) && i(
            a,
            b,
            d[b],
            null,
            y,
            _
          );
      for (const b in v) {
        if (Kt(b)) continue;
        const C = v[b], h = d[b];
        C !== h && b !== "value" && i(a, b, h, C, y, _);
      }
      "value" in v && i(a, "value", d.value, v.value, y);
    }
  }, E = (a, d, v, _, y, b, C, h, g) => {
    const p = d.el = a ? a.el : l(""), S = d.anchor = a ? a.anchor : l("");
    let { patchFlag: w, dynamicChildren: I, slotScopeIds: k } = d;
    k && (h = h ? h.concat(k) : k), a == null ? (s(p, v, _), s(S, v, _), he(
      // #10007
      // such fragment like `<></>` will be compiled into
      // a fragment which doesn't have a children.
      // In this case fallback to an empty array
      d.children || [],
      v,
      S,
      y,
      b,
      C,
      h,
      g
    )) : w > 0 && w & 64 && I && // #2715 the previous fragment could've been a BAILed one as a result
    // of renderSlot() with no valid children
    a.dynamicChildren && a.dynamicChildren.length === I.length ? (L(
      a.dynamicChildren,
      I,
      v,
      y,
      b,
      C,
      h
    ), // #2080 if the stable fragment has a key, it's a <template v-for> that may
    //  get moved around. Make sure all root level vnodes inherit el.
    // #2134 or if it's a component root, it may also get moved around
    // as the component is being moved.
    (d.key != null || y && d === y.subTree) && bi(
      a,
      d,
      !0
      /* shallow */
    )) : z(
      a,
      d,
      v,
      S,
      y,
      b,
      C,
      h,
      g
    );
  }, B = (a, d, v, _, y, b, C, h, g) => {
    d.slotScopeIds = h, a == null ? d.shapeFlag & 512 ? y.ctx.activate(
      d,
      v,
      _,
      C,
      g
    ) : oe(
      d,
      v,
      _,
      y,
      b,
      C,
      g
    ) : xe(a, d, g);
  }, oe = (a, d, v, _, y, b, C) => {
    const h = a.component = _l(
      a,
      _,
      y
    );
    if (Un(a) && (h.ctx.renderer = Te), xl(h, !1, C), h.asyncDep) {
      if (y && y.registerDep(h, re, C), !a.el) {
        const g = h.subTree = de(be);
        j(null, g, d, v), a.placeholder = g.el;
      }
    } else
      re(
        h,
        a,
        d,
        v,
        y,
        b,
        C
      );
  }, xe = (a, d, v) => {
    const _ = d.component = a.component;
    if (tl(a, d, v))
      if (_.asyncDep && !_.asyncResolved) {
        q(_, d, v);
        return;
      } else
        _.next = d, _.update();
    else
      d.el = a.el, _.vnode = d;
  }, re = (a, d, v, _, y, b, C) => {
    const h = () => {
      if (a.isMounted) {
        let { next: w, bu: I, u: k, parent: H, vnode: Y } = a;
        {
          const Ne = yi(a);
          if (Ne) {
            w && (w.el = Y.el, q(a, w, C)), Ne.asyncDep.then(() => {
              _e(() => {
                a.isUnmounted || p();
              }, y);
            });
            return;
          }
        }
        let G = w, ie;
        mt(a, !1), w ? (w.el = Y.el, q(a, w, C)) : w = Y, I && Gn(I), (ie = w.props && w.props.onVnodeBeforeUpdate) && $e(ie, H, w, Y), mt(a, !0);
        const fe = Js(a), Re = a.subTree;
        a.subTree = fe, O(
          Re,
          fe,
          // parent may have changed if it's in a teleport
          m(Re.el),
          // anchor may have changed if it's in a fragment
          At(Re),
          a,
          y,
          b
        ), w.el = fe.el, G === null && nl(a, fe.el), k && _e(k, y), (ie = w.props && w.props.onVnodeUpdated) && _e(
          () => $e(ie, H, w, Y),
          y
        );
      } else {
        let w;
        const { el: I, props: k } = d, { bm: H, m: Y, parent: G, root: ie, type: fe } = a, Re = Gt(d);
        mt(a, !1), H && Gn(H), !Re && (w = k && k.onVnodeBeforeMount) && $e(w, G, d), mt(a, !0);
        {
          ie.ce && ie.ce._hasShadowRoot() && ie.ce._injectChildStyle(
            fe,
            a.parent ? a.parent.type : void 0
          );
          const Ne = a.subTree = Js(a);
          O(
            null,
            Ne,
            v,
            _,
            a,
            y,
            b
          ), d.el = Ne.el;
        }
        if (Y && _e(Y, y), !Re && (w = k && k.onVnodeMounted)) {
          const Ne = d;
          _e(
            () => $e(w, G, Ne),
            y
          );
        }
        (d.shapeFlag & 256 || G && Gt(G.vnode) && G.vnode.shapeFlag & 256) && a.a && _e(a.a, y), a.isMounted = !0, d = v = _ = null;
      }
    };
    a.scope.on();
    const g = a.effect = new Ar(h);
    a.scope.off();
    const p = a.update = g.run.bind(g), S = a.job = g.runIfDirty.bind(g);
    S.i = a, S.id = a.uid, g.scheduler = () => As(S), mt(a, !0), p();
  }, q = (a, d, v) => {
    d.component = a;
    const _ = a.vnode.props;
    a.vnode = d, a.next = null, rl(a, d.props, _, v), cl(a, d.children, v), nt(), Vs(a), st();
  }, z = (a, d, v, _, y, b, C, h, g = !1) => {
    const p = a && a.children, S = a ? a.shapeFlag : 0, w = d.children, { patchFlag: I, shapeFlag: k } = d;
    if (I > 0) {
      if (I & 128) {
        Et(
          p,
          w,
          v,
          _,
          y,
          b,
          C,
          h,
          g
        );
        return;
      } else if (I & 256) {
        qe(
          p,
          w,
          v,
          _,
          y,
          b,
          C,
          h,
          g
        );
        return;
      }
    }
    k & 8 ? (S & 16 && dt(p, y, b), w !== p && f(v, w)) : S & 16 ? k & 16 ? Et(
      p,
      w,
      v,
      _,
      y,
      b,
      C,
      h,
      g
    ) : dt(p, y, b, !0) : (S & 8 && f(v, ""), k & 16 && he(
      w,
      v,
      _,
      y,
      b,
      C,
      h,
      g
    ));
  }, qe = (a, d, v, _, y, b, C, h, g) => {
    a = a || kt, d = d || kt;
    const p = a.length, S = d.length, w = Math.min(p, S);
    let I;
    for (I = 0; I < w; I++) {
      const k = d[I] = g ? et(d[I]) : Ve(d[I]);
      O(
        a[I],
        k,
        v,
        null,
        y,
        b,
        C,
        h,
        g
      );
    }
    p > S ? dt(
      a,
      y,
      b,
      !0,
      !1,
      w
    ) : he(
      d,
      v,
      _,
      y,
      b,
      C,
      h,
      g,
      w
    );
  }, Et = (a, d, v, _, y, b, C, h, g) => {
    let p = 0;
    const S = d.length;
    let w = a.length - 1, I = S - 1;
    for (; p <= w && p <= I; ) {
      const k = a[p], H = d[p] = g ? et(d[p]) : Ve(d[p]);
      if (_t(k, H))
        O(
          k,
          H,
          v,
          null,
          y,
          b,
          C,
          h,
          g
        );
      else
        break;
      p++;
    }
    for (; p <= w && p <= I; ) {
      const k = a[w], H = d[I] = g ? et(d[I]) : Ve(d[I]);
      if (_t(k, H))
        O(
          k,
          H,
          v,
          null,
          y,
          b,
          C,
          h,
          g
        );
      else
        break;
      w--, I--;
    }
    if (p > w) {
      if (p <= I) {
        const k = I + 1, H = k < S ? d[k].el : _;
        for (; p <= I; )
          O(
            null,
            d[p] = g ? et(d[p]) : Ve(d[p]),
            v,
            H,
            y,
            b,
            C,
            h,
            g
          ), p++;
      }
    } else if (p > I)
      for (; p <= w; )
        we(a[p], y, b, !0), p++;
    else {
      const k = p, H = p, Y = /* @__PURE__ */ new Map();
      for (p = H; p <= I; p++) {
        const Se = d[p] = g ? et(d[p]) : Ve(d[p]);
        Se.key != null && Y.set(Se.key, p);
      }
      let G, ie = 0;
      const fe = I - H + 1;
      let Re = !1, Ne = 0;
      const $t = new Array(fe);
      for (p = 0; p < fe; p++) $t[p] = 0;
      for (p = k; p <= w; p++) {
        const Se = a[p];
        if (ie >= fe) {
          we(Se, y, b, !0);
          continue;
        }
        let De;
        if (Se.key != null)
          De = Y.get(Se.key);
        else
          for (G = H; G <= I; G++)
            if ($t[G - H] === 0 && _t(Se, d[G])) {
              De = G;
              break;
            }
        De === void 0 ? we(Se, y, b, !0) : ($t[De - H] = p + 1, De >= Ne ? Ne = De : Re = !0, O(
          Se,
          d[De],
          v,
          null,
          y,
          b,
          C,
          h,
          g
        ), ie++);
      }
      const Rs = Re ? dl($t) : kt;
      for (G = Rs.length - 1, p = fe - 1; p >= 0; p--) {
        const Se = H + p, De = d[Se], Ns = d[Se + 1], Ds = Se + 1 < S ? (
          // #13559, #14173 fallback to el placeholder for unresolved async component
          Ns.el || _i(Ns)
        ) : _;
        $t[p] === 0 ? O(
          null,
          De,
          v,
          Ds,
          y,
          b,
          C,
          h,
          g
        ) : Re && (G < 0 || p !== Rs[G] ? Ge(De, v, Ds, 2) : G--);
      }
    }
  }, Ge = (a, d, v, _, y = null) => {
    const { el: b, type: C, transition: h, children: g, shapeFlag: p } = a;
    if (p & 6) {
      Ge(a.component.subTree, d, v, _);
      return;
    }
    if (p & 128) {
      a.suspense.move(d, v, _);
      return;
    }
    if (p & 64) {
      C.move(a, d, v, Te);
      return;
    }
    if (C === ce) {
      s(b, d, v);
      for (let w = 0; w < g.length; w++)
        Ge(g[w], d, v, _);
      s(a.anchor, d, v);
      return;
    }
    if (C === ns) {
      $(a, d, v);
      return;
    }
    if (_ !== 2 && p & 1 && h)
      if (_ === 0)
        h.persisted && !b[Pe] ? s(b, d, v) : (h.beforeEnter(b), s(b, d, v), _e(() => h.enter(b), y));
      else {
        const { leave: w, delayLeave: I, afterLeave: k } = h, H = () => {
          a.ctx.isUnmounted ? r(b) : s(b, d, v);
        }, Y = () => {
          const G = b._isLeaving || !!b[Pe];
          b._isLeaving && b[Pe](
            !0
            /* cancelled */
          ), h.persisted && !G ? H() : w(b, () => {
            H(), k && k();
          });
        };
        I ? I(b, H, Y) : Y();
      }
    else
      s(b, d, v);
  }, we = (a, d, v, _ = !1, y = !1) => {
    const {
      type: b,
      props: C,
      ref: h,
      children: g,
      dynamicChildren: p,
      shapeFlag: S,
      patchFlag: w,
      dirs: I,
      cacheIndex: k,
      memo: H
    } = a;
    if (w === -2 && (y = !1), h != null && (nt(), qt(h, null, v, a, !0), st()), k != null && (d.renderCache[k] = void 0), S & 256) {
      d.ctx.deactivate(a);
      return;
    }
    const Y = S & 1 && I, G = !Gt(a);
    let ie;
    if (G && (ie = C && C.onVnodeBeforeUnmount) && $e(ie, d, a), S & 6)
      fn(a.component, v, _);
    else {
      if (S & 128) {
        a.suspense.unmount(v, _);
        return;
      }
      Y && gt(a, null, d, "beforeUnmount"), S & 64 ? a.type.remove(
        a,
        d,
        v,
        Te,
        _
      ) : p && // #5154
      // when v-once is used inside a block, setBlockTracking(-1) marks the
      // parent block with hasOnce: true
      // so that it doesn't take the fast path during unmount - otherwise
      // components nested in v-once are never unmounted.
      !p.hasOnce && // #1153: fast path should not be taken for non-stable (v-for) fragments
      (b !== ce || w > 0 && w & 64) ? dt(
        p,
        d,
        v,
        !1,
        !0
      ) : (b === ce && w & 384 || !y && S & 16) && dt(g, d, v), _ && Pt(a);
    }
    const fe = H != null && k == null;
    (G && (ie = C && C.onVnodeUnmounted) || Y || fe) && _e(() => {
      ie && $e(ie, d, a), Y && gt(a, null, d, "unmounted"), fe && (a.el = null);
    }, v);
  }, Pt = (a) => {
    const { type: d, el: v, anchor: _, transition: y } = a;
    if (d === ce) {
      an(v, _);
      return;
    }
    if (d === ns) {
      P(a);
      return;
    }
    const b = () => {
      r(v), y && !y.persisted && y.afterLeave && y.afterLeave();
    };
    if (a.shapeFlag & 1 && y && !y.persisted) {
      const { leave: C, delayLeave: h } = y, g = () => C(v, b);
      h ? h(a.el, b, g) : g();
    } else
      b();
  }, an = (a, d) => {
    let v;
    for (; a !== d; )
      v = x(a), r(a), a = v;
    r(d);
  }, fn = (a, d, v) => {
    const { bum: _, scope: y, job: b, subTree: C, um: h, m: g, a: p } = a;
    Zs(g), Zs(p), _ && Gn(_), y.stop(), b && (b.flags |= 8, we(C, a, d, v)), h && _e(h, d), _e(() => {
      a.isUnmounted = !0;
    }, d);
  }, dt = (a, d, v, _ = !1, y = !1, b = 0) => {
    for (let C = b; C < a.length; C++)
      we(a[C], d, v, _, y);
  }, At = (a) => {
    if (a.shapeFlag & 6)
      return At(a.component.subTree);
    if (a.shapeFlag & 128)
      return a.suspense.next();
    const d = x(a.anchor || a.el), v = d && d[Eo];
    return v ? x(v) : d;
  };
  let ht = !1;
  const Nt = (a, d, v) => {
    let _;
    a == null ? d._vnode && (we(d._vnode, null, null, !0), _ = d._vnode.component) : O(
      d._vnode || null,
      a,
      d,
      null,
      null,
      null,
      v
    ), d._vnode = a, ht || (ht = !0, Vs(_), zr(), ht = !1);
  }, Te = {
    p: O,
    um: we,
    m: Ge,
    r: Pt,
    mt: oe,
    mc: he,
    pc: z,
    pbc: L,
    n: At,
    o: e
  };
  return {
    render: Nt,
    hydrate: void 0,
    createApp: Jo(Nt)
  };
}
function ts({ type: e, props: t }, n) {
  return n === "svg" && e === "foreignObject" || n === "mathml" && e === "annotation-xml" && t && t.encoding && t.encoding.includes("html") ? void 0 : n;
}
function mt({ effect: e, job: t }, n) {
  n ? (e.flags |= 32, t.flags |= 4) : (e.flags &= -33, t.flags &= -5);
}
function ul(e, t) {
  return (!e || e && !e.pendingBranch) && t && !t.persisted;
}
function bi(e, t, n = !1) {
  const s = e.children, r = t.children;
  if (M(s) && M(r))
    for (let i = 0; i < s.length; i++) {
      const o = s[i];
      let l = r[i];
      l.shapeFlag & 1 && !l.dynamicChildren && ((l.patchFlag <= 0 || l.patchFlag === 32) && (l = r[i] = et(r[i]), l.el = o.el), !n && l.patchFlag !== -2 && bi(o, l)), l.type === zn && (l.patchFlag === -1 && (l = r[i] = et(l)), l.el = o.el), l.type === be && !l.el && (l.el = o.el);
    }
}
function dl(e) {
  const t = e.slice(), n = [0];
  let s, r, i, o, l;
  const c = e.length;
  for (s = 0; s < c; s++) {
    const u = e[s];
    if (u !== 0) {
      if (r = n[n.length - 1], e[r] < u) {
        t[s] = r, n.push(s);
        continue;
      }
      for (i = 0, o = n.length - 1; i < o; )
        l = i + o >> 1, e[n[l]] < u ? i = l + 1 : o = l;
      u < e[n[i]] && (i > 0 && (t[s] = n[i - 1]), n[i] = s);
    }
  }
  for (i = n.length, o = n[i - 1]; i-- > 0; )
    n[i] = o, o = t[o];
  return n;
}
function yi(e) {
  const t = e.subTree.component;
  if (t)
    return t.asyncDep && !t.asyncResolved ? t : yi(t);
}
function Zs(e) {
  if (e)
    for (let t = 0; t < e.length; t++)
      e[t].flags |= 8;
}
function _i(e) {
  if (e.placeholder)
    return e.placeholder;
  const t = e.component;
  return t ? _i(t.subTree) : null;
}
const xi = (e) => e.__isSuspense;
function hl(e, t) {
  t && t.pendingBranch ? M(e) ? t.effects.push(...e) : t.effects.push(e) : xo(e);
}
const ce = /* @__PURE__ */ Symbol.for("v-fgt"), zn = /* @__PURE__ */ Symbol.for("v-txt"), be = /* @__PURE__ */ Symbol.for("v-cmt"), ns = /* @__PURE__ */ Symbol.for("v-stc"), wt = [];
let Ce = null;
function X(e = !1) {
  wt.push(Ce = e ? null : []);
}
function Si() {
  wt.pop(), Ce = wt[wt.length - 1] || null;
}
let tn = 1;
function In(e, t = !1) {
  tn += e, e < 0 && Ce && t && (Ce.hasOnce = !0);
}
function Ci(e) {
  return e.dynamicChildren = tn > 0 ? Ce || kt : null, Si(), tn > 0 && Ce && Ce.push(e), e;
}
function te(e, t, n, s, r, i) {
  return Ci(
    A(
      e,
      t,
      n,
      s,
      r,
      i,
      !0
    )
  );
}
function pl(e, t, n, s, r) {
  return Ci(
    de(
      e,
      t,
      n,
      s,
      r,
      !0
    )
  );
}
function On(e) {
  return e ? e.__v_isVNode === !0 : !1;
}
function _t(e, t) {
  return e.type === t.type && e.key === t.key;
}
const wi = ({ key: e }) => e ?? null, xn = ({
  ref: e,
  ref_key: t,
  ref_for: n
}) => (typeof e == "number" && (e = "" + e), e != null ? ne(e) || /* @__PURE__ */ ge(e) || D(e) ? { i: Ke, r: e, k: t, f: !!n } : e : null);
function A(e, t = null, n = null, s = 0, r = null, i = e === ce ? 0 : 1, o = !1, l = !1) {
  const c = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e,
    props: t,
    key: t && wi(t),
    ref: t && xn(t),
    scopeId: Gr,
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
    shapeFlag: i,
    patchFlag: s,
    dynamicProps: r,
    dynamicChildren: null,
    appContext: null,
    ctx: Ke
  };
  return l ? (kn(c, n), i & 128 && e.normalize(c)) : n && (c.shapeFlag |= ne(n) ? 8 : 16), tn > 0 && // avoid a block node from tracking itself
  !o && // has current parent block
  Ce && // presence of a patch flag indicates this node needs patching on updates.
  // component nodes also should always be patched, because even if the
  // component doesn't need to update, it needs to persist the instance on to
  // the next vnode so that it can be properly unmounted later.
  (c.patchFlag > 0 || i & 6) && // the EVENTS flag is only for hydration and if it is the only flag, the
  // vnode should not be considered dynamic due to handler caching.
  c.patchFlag !== 32 && Ce.push(c), c;
}
const de = gl;
function gl(e, t = null, n = null, s = 0, r = null, i = !1) {
  if ((!e || e === Bo) && (e = be), On(e)) {
    const l = ut(
      e,
      t,
      !0
      /* mergeRef: true */
    );
    return n && kn(l, n), tn > 0 && !i && Ce && (l.shapeFlag & 6 ? Ce[Ce.indexOf(e)] = l : Ce.push(l)), l.patchFlag = -2, l;
  }
  if (Tl(e) && (e = e.__vccOpts), t) {
    t = ml(t);
    let { class: l, style: c } = t;
    l && !ne(l) && (t.class = xt(l)), W(c) && (/* @__PURE__ */ Ps(c) && !M(c) && (c = le({}, c)), t.style = Yt(c));
  }
  const o = ne(e) ? 1 : xi(e) ? 128 : Vn(e) ? 64 : W(e) ? 4 : D(e) ? 2 : 0;
  return A(
    e,
    t,
    n,
    s,
    r,
    o,
    i,
    !0
  );
}
function ml(e) {
  return e ? /* @__PURE__ */ Ps(e) || di(e) ? le({}, e) : e : null;
}
function ut(e, t, n = !1, s = !1) {
  const { props: r, ref: i, patchFlag: o, children: l, transition: c } = e, u = t ? vl(r || {}, t) : r, f = {
    __v_isVNode: !0,
    __v_skip: !0,
    type: e.type,
    props: u,
    key: u && wi(u),
    ref: t && t.ref ? (
      // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      n && i ? M(i) ? i.concat(xn(t)) : [i, xn(t)] : xn(t)
    ) : i,
    scopeId: e.scopeId,
    slotScopeIds: e.slotScopeIds,
    children: l,
    target: e.target,
    targetStart: e.targetStart,
    targetAnchor: e.targetAnchor,
    staticCount: e.staticCount,
    shapeFlag: e.shapeFlag,
    // if the vnode is cloned with extra props, we can no longer assume its
    // existing patch flag to be reliable and need to add the FULL_PROPS flag.
    // note: preserve flag for fragments since they use the flag for children
    // fast paths only.
    patchFlag: t && e.type !== ce ? o === -1 ? 16 : o | 16 : o,
    dynamicProps: e.dynamicProps,
    dynamicChildren: e.dynamicChildren,
    appContext: e.appContext,
    dirs: e.dirs,
    transition: c,
    // These should technically only be non-null on mounted VNodes. However,
    // they *should* be copied for kept-alive vnodes. So we just always copy
    // them since them being non-null during a mount doesn't affect the logic as
    // they will simply be overwritten.
    component: e.component,
    suspense: e.suspense,
    ssContent: e.ssContent && ut(e.ssContent),
    ssFallback: e.ssFallback && ut(e.ssFallback),
    placeholder: e.placeholder,
    el: e.el,
    anchor: e.anchor,
    ctx: e.ctx,
    ce: e.ce
  };
  return c && s && en(
    f,
    c.clone(f)
  ), f;
}
function Xe(e = " ", t = 0) {
  return de(zn, null, e, t);
}
function Ze(e = "", t = !1) {
  return t ? (X(), pl(be, null, e)) : de(be, null, e);
}
function Ve(e) {
  return e == null || typeof e == "boolean" ? de(be) : M(e) ? de(
    ce,
    null,
    // #3666, avoid reference pollution when reusing vnode
    e.slice()
  ) : On(e) ? et(e) : de(zn, null, String(e));
}
function et(e) {
  return e.el === null && e.patchFlag !== -1 || e.memo ? e : ut(e);
}
function kn(e, t) {
  let n = 0;
  const { shapeFlag: s } = e;
  if (t == null)
    t = null;
  else if (M(t))
    n = 16;
  else if (typeof t == "object")
    if (s & 65) {
      const r = t.default;
      r && (r._c && (r._d = !1), kn(e, r()), r._c && (r._d = !0));
      return;
    } else {
      n = 32;
      const r = t._;
      !r && !di(t) ? t._ctx = Ke : r === 3 && Ke && (Ke.slots._ === 1 ? t._ = 1 : (t._ = 2, e.patchFlag |= 1024));
    }
  else if (D(t)) {
    if (s & 65) {
      kn(e, { default: t });
      return;
    }
    t = { default: t, _ctx: Ke }, n = 32;
  } else
    t = String(t), s & 64 ? (n = 16, t = [Xe(t)]) : n = 8;
  e.children = t, e.shapeFlag |= n;
}
function vl(...e) {
  const t = {};
  for (let n = 0; n < e.length; n++) {
    const s = e[n];
    for (const r in s)
      if (r === "class")
        t.class !== s.class && (t.class = xt([t.class, s.class]));
      else if (r === "style")
        t.style = Yt([t.style, s.style]);
      else if (Rn(r)) {
        const i = t[r], o = s[r];
        o && i !== o && !(M(i) && i.includes(o)) ? t[r] = i ? [].concat(i, o) : o : o == null && i == null && // mergeProps({ 'onUpdate:modelValue': undefined }) should not retain
        // the model listener.
        !Nn(r) && (t[r] = o);
      } else r !== "" && (t[r] = s[r]);
  }
  return t;
}
function $e(e, t, n, s = null) {
  Ie(e, t, 7, [
    n,
    s
  ]);
}
const bl = li();
let yl = 0;
function _l(e, t, n) {
  const s = e.type, r = (t ? t.appContext : e.appContext) || bl, i = {
    uid: yl++,
    vnode: e,
    type: s,
    parent: t,
    appContext: r,
    root: null,
    // to be immediately set
    next: null,
    subTree: null,
    // will be set synchronously right after creation
    effect: null,
    update: null,
    // will be set synchronously right after creation
    job: null,
    scope: new Ui(
      !0
      /* detached */
    ),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    provides: t ? t.provides : Object.create(r.provides),
    ids: t ? t.ids : ["", 0, 0],
    accessCache: null,
    renderCache: [],
    // local resolved assets
    components: null,
    directives: null,
    // resolved props and emits options
    propsOptions: pi(s, r),
    emitsOptions: ci(s, r),
    // emit
    emit: null,
    // to be set immediately
    emitted: null,
    // props default value
    propsDefaults: Q,
    // inheritAttrs
    inheritAttrs: s.inheritAttrs,
    // state
    ctx: Q,
    data: Q,
    props: Q,
    attrs: Q,
    slots: Q,
    refs: Q,
    setupState: Q,
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
  return i.ctx = { _: i }, i.root = t ? t.root : i, i.emit = Xo.bind(null, i), e.ce && e.ce(i), i;
}
let ye = null;
const Ti = () => ye || Ke;
let Mn, nn;
{
  const e = $n(), t = (n, s) => {
    let r;
    return (r = e[n]) || (r = e[n] = []), r.push(s), (i) => {
      r.length > 1 ? r.forEach((o) => o(i)) : r[0](i);
    };
  };
  Mn = t(
    "__VUE_INSTANCE_SETTERS__",
    (n) => ye = n
  ), nn = t(
    "__VUE_SSR_SETTERS__",
    (n) => sn = n
  );
}
const cn = (e) => {
  const t = ye;
  return Mn(e), e.scope.on(), () => {
    e.scope.off(), Mn(t);
  };
}, Qs = () => {
  ye && ye.scope.off(), Mn(null);
};
function Ei(e) {
  return e.vnode.shapeFlag & 4;
}
let sn = !1;
function xl(e, t = !1, n = !1) {
  t && nn(t);
  const { props: s, children: r } = e.vnode, i = Ei(e);
  sl(e, s, i, t), ll(e, r, n || t);
  const o = i ? Sl(e, t) : void 0;
  return t && nn(!1), o;
}
function Sl(e, t) {
  const n = e.type;
  e.accessCache = /* @__PURE__ */ Object.create(null), e.proxy = new Proxy(e.ctx, Vo);
  const { setup: s } = n;
  if (s) {
    nt();
    const r = e.setupContext = s.length > 1 ? wl(e) : null, i = cn(e), o = ln(
      s,
      e,
      0,
      [
        e.props,
        r
      ]
    ), l = _r(o);
    if (st(), i(), (l || e.sp) && !Gt(e) && ni(e), l) {
      if (o.then(Qs, Qs), t)
        return o.then((c) => {
          nn(!0);
          try {
            er(e, c, t);
          } finally {
            nn(!1);
          }
        }).catch((c) => {
          Bn(c, e, 0);
        });
      e.asyncDep = o;
    } else
      er(e, o);
  } else
    Pi(e);
}
function er(e, t, n) {
  D(t) ? e.type.__ssrInlineRender ? e.ssrRender = t : e.render = t : W(t) && (e.setupState = Vr(t)), Pi(e);
}
function Pi(e, t, n) {
  const s = e.type;
  e.render || (e.render = s.render || We);
  {
    const r = cn(e);
    nt();
    try {
      Uo(e);
    } finally {
      st(), r();
    }
  }
}
const Cl = {
  get(e, t) {
    return pe(e, "get", ""), e[t];
  }
};
function wl(e) {
  const t = (n) => {
    e.exposed = n || {};
  };
  return {
    attrs: new Proxy(e.attrs, Cl),
    slots: e.slots,
    emit: e.emit,
    expose: t
  };
}
function Fs(e) {
  return e.exposed ? e.exposeProxy || (e.exposeProxy = new Proxy(Vr(ao(e.exposed)), {
    get(t, n) {
      if (n in t)
        return t[n];
      if (n in Jt)
        return Jt[n](e);
    },
    has(t, n) {
      return n in t || n in Jt;
    }
  })) : e.proxy;
}
function Tl(e) {
  return D(e) && "__vccOpts" in e;
}
const He = (e, t) => /* @__PURE__ */ mo(e, t, sn);
function El(e, t, n) {
  try {
    In(-1);
    const s = arguments.length;
    return s === 2 ? W(t) && !M(t) ? On(t) ? de(e, null, [t]) : de(e, t) : de(e, null, t) : (s > 3 ? n = Array.prototype.slice.call(arguments, 2) : s === 3 && On(n) && (n = [n]), de(e, t, n));
  } finally {
    In(1);
  }
}
const Pl = "3.5.42";
let vs;
const tr = typeof window < "u" && window.trustedTypes;
if (tr)
  try {
    vs = /* @__PURE__ */ tr.createPolicy("vue", {
      createHTML: (e) => e
    });
  } catch {
  }
const Ai = vs ? (e) => vs.createHTML(e) : (e) => e, Al = "http://www.w3.org/2000/svg", Il = "http://www.w3.org/1998/Math/MathML", Qe = typeof document < "u" ? document : null, nr = Qe && /* @__PURE__ */ Qe.createElement("template"), Ol = {
  insert: (e, t, n) => {
    t.insertBefore(e, n || null);
  },
  remove: (e) => {
    const t = e.parentNode;
    t && t.removeChild(e);
  },
  createElement: (e, t, n, s) => {
    const r = t === "svg" ? Qe.createElementNS(Al, e) : t === "mathml" ? Qe.createElementNS(Il, e) : n ? Qe.createElement(e, { is: n }) : Qe.createElement(e);
    return e === "select" && s && s.multiple != null && r.setAttribute("multiple", s.multiple), r;
  },
  createText: (e) => Qe.createTextNode(e),
  createComment: (e) => Qe.createComment(e),
  setText: (e, t) => {
    e.nodeValue = t;
  },
  setElementText: (e, t) => {
    e.textContent = t;
  },
  parentNode: (e) => e.parentNode,
  nextSibling: (e) => e.nextSibling,
  querySelector: (e) => Qe.querySelector(e),
  setScopeId(e, t) {
    e.setAttribute(t, "");
  },
  // __UNSAFE__
  // Reason: innerHTML.
  // Static content here can only come from compiled templates.
  // As long as the user only uses trusted templates, this is safe.
  insertStaticContent(e, t, n, s, r, i) {
    const o = n ? n.previousSibling : t.lastChild;
    if (r && (r === i || r.nextSibling))
      for (; t.insertBefore(r.cloneNode(!0), n), !(r === i || !(r = r.nextSibling)); )
        ;
    else {
      nr.innerHTML = Ai(
        s === "svg" ? `<svg>${e}</svg>` : s === "mathml" ? `<math>${e}</math>` : e
      );
      const l = nr.content;
      if (s === "svg" || s === "mathml") {
        const c = l.firstChild;
        for (; c.firstChild; )
          l.appendChild(c.firstChild);
        l.removeChild(c);
      }
      t.insertBefore(l, n);
    }
    return [
      // first
      o ? o.nextSibling : t.firstChild,
      // last
      n ? n.previousSibling : t.lastChild
    ];
  }
}, ot = "transition", jt = "animation", rn = /* @__PURE__ */ Symbol("_vtc"), Ii = {
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
}, kl = /* @__PURE__ */ le(
  {},
  Xr,
  Ii
), Ml = (e) => (e.displayName = "Transition", e.props = kl, e), gn = /* @__PURE__ */ Ml(
  (e, { slots: t }) => El(Io, Fl(e), t)
), vt = (e, t = []) => {
  M(e) ? e.forEach((n) => n(...t)) : e && e(...t);
}, sr = (e) => e ? M(e) ? e.some((t) => t.length > 1) : e.length > 1 : !1;
function Fl(e) {
  const t = {};
  for (const E in e)
    E in Ii || (t[E] = e[E]);
  if (e.css === !1)
    return t;
  const {
    name: n = "v",
    type: s,
    duration: r,
    enterFromClass: i = `${n}-enter-from`,
    enterActiveClass: o = `${n}-enter-active`,
    enterToClass: l = `${n}-enter-to`,
    appearFromClass: c = i,
    appearActiveClass: u = o,
    appearToClass: f = l,
    leaveFromClass: m = `${n}-leave-from`,
    leaveActiveClass: x = `${n}-leave-active`,
    leaveToClass: T = `${n}-leave-to`
  } = e, R = Rl(r), O = R && R[0], J = R && R[1], {
    onBeforeEnter: j,
    onEnter: F,
    onEnterCancelled: $,
    onLeave: P,
    onLeaveCancelled: V,
    onBeforeAppear: se = j,
    onAppear: ae = F,
    onAppearCancelled: he = $
  } = t, N = (E, B, oe, xe) => {
    E._enterCancelled = xe, bt(E, B ? f : l), bt(E, B ? u : o), oe && oe();
  }, L = (E, B) => {
    E._isLeaving = !1, bt(E, m), bt(E, T), bt(E, x), B && B();
  }, ee = (E) => (B, oe) => {
    const xe = E ? ae : F, re = () => N(B, E, oe);
    vt(xe, [B, re]), rr(() => {
      bt(B, E ? c : i), Ye(B, E ? f : l), sr(xe) || ir(B, s, O, re);
    });
  };
  return le(t, {
    onBeforeEnter(E) {
      vt(j, [E]), Ye(E, i), Ye(E, o);
    },
    onBeforeAppear(E) {
      vt(se, [E]), Ye(E, c), Ye(E, u);
    },
    onEnter: ee(!1),
    onAppear: ee(!0),
    onLeave(E, B) {
      E._isLeaving = !0;
      const oe = () => L(E, B);
      Ye(E, m), E._enterCancelled ? (Ye(E, x), cr(E)) : (cr(E), Ye(E, x)), rr(() => {
        E._isLeaving && (bt(E, m), Ye(E, T), sr(P) || ir(E, s, J, oe));
      }), vt(P, [E, oe]);
    },
    onEnterCancelled(E) {
      N(E, !1, void 0, !0), vt($, [E]);
    },
    onAppearCancelled(E) {
      N(E, !0, void 0, !0), vt(he, [E]);
    },
    onLeaveCancelled(E) {
      L(E), vt(V, [E]);
    }
  });
}
function Rl(e) {
  if (e == null)
    return null;
  if (W(e))
    return [ss(e.enter), ss(e.leave)];
  {
    const t = ss(e);
    return [t, t];
  }
}
function ss(e) {
  return Ni(e);
}
function Ye(e, t) {
  t.split(/\s+/).forEach((n) => n && e.classList.add(n)), (e[rn] || (e[rn] = /* @__PURE__ */ new Set())).add(t);
}
function bt(e, t) {
  t.split(/\s+/).forEach((s) => s && e.classList.remove(s));
  const n = e[rn];
  n && (n.delete(t), n.size || (e[rn] = void 0));
}
function rr(e) {
  requestAnimationFrame(() => {
    requestAnimationFrame(e);
  });
}
let Nl = 0;
function ir(e, t, n, s) {
  const r = e._endId = ++Nl, i = () => {
    r === e._endId && s();
  };
  if (n != null)
    return setTimeout(i, n);
  const { type: o, timeout: l, propCount: c } = Dl(e, t);
  if (!o)
    return s();
  const u = o + "end";
  let f = 0;
  const m = () => {
    e.removeEventListener(u, x), i();
  }, x = (T) => {
    T.target === e && ++f >= c && m();
  };
  setTimeout(() => {
    f < c && m();
  }, l + 1), e.addEventListener(u, x);
}
function Dl(e, t) {
  const n = window.getComputedStyle(e), s = (R) => (n[R] || "").split(", "), r = s(`${ot}Delay`), i = s(`${ot}Duration`), o = or(r, i), l = s(`${jt}Delay`), c = s(`${jt}Duration`), u = or(l, c);
  let f = null, m = 0, x = 0;
  t === ot ? o > 0 && (f = ot, m = o, x = i.length) : t === jt ? u > 0 && (f = jt, m = u, x = c.length) : (m = Math.max(o, u), f = m > 0 ? o > u ? ot : jt : null, x = f ? f === ot ? i.length : c.length : 0);
  const T = f === ot && /\b(?:transform|all)(?:,|$)/.test(
    s(`${ot}Property`).toString()
  );
  return {
    type: f,
    timeout: m,
    propCount: x,
    hasTransform: T
  };
}
function or(e, t) {
  for (; e.length < t.length; )
    e = e.concat(e);
  return Math.max(...t.map((n, s) => lr(n) + lr(e[s])));
}
function lr(e) {
  return e === "auto" ? 0 : Number(e.slice(0, -1).replace(",", ".")) * 1e3;
}
function cr(e) {
  return (e ? e.ownerDocument : document).body.offsetHeight;
}
function $l(e, t, n) {
  const s = e[rn];
  s && (t = (t ? [t, ...s] : [...s]).join(" ")), t == null ? e.removeAttribute("class") : n ? e.setAttribute("class", t) : e.className = t;
}
const ar = /* @__PURE__ */ Symbol("_vod"), Ll = /* @__PURE__ */ Symbol("_vsh"), Hl = /* @__PURE__ */ Symbol(""), jl = /(?:^|;)\s*display\s*:/;
function Bl(e, t, n) {
  const s = e.style, r = ne(n);
  let i = !1;
  if (n && !r) {
    if (t)
      if (ne(t))
        for (const o of t.split(";")) {
          const l = o.slice(0, o.indexOf(":")).trim();
          n[l] == null && Ut(s, l, "");
        }
      else
        for (const o in t)
          n[o] == null && Ut(s, o, "");
    for (const o in n) {
      o === "display" && (i = !0);
      const l = n[o];
      l != null ? Ul(
        e,
        o,
        !ne(t) && t ? t[o] : void 0,
        l
      ) || Ut(s, o, l) : Ut(s, o, "");
    }
  } else if (r) {
    if (t !== n) {
      const o = s[Hl];
      o && (n += ";" + o), s.cssText = n, i = jl.test(n);
    }
  } else t && e.removeAttribute("style");
  ar in e && (e[ar] = i ? s.display : "", e[Ll] && (s.display = "none"));
}
const mn = /\s*!important$/;
function Ut(e, t, n) {
  if (M(n))
    n.forEach((s) => Ut(e, t, s));
  else if (n == null && (n = ""), t.startsWith("--"))
    mn.test(n) ? e.setProperty(t, n.replace(mn, ""), "important") : e.setProperty(t, n);
  else {
    const s = Vl(e, t);
    mn.test(n) ? e.setProperty(
      Tt(s),
      n.replace(mn, ""),
      "important"
    ) : e[s] = n;
  }
}
const fr = ["Webkit", "Moz", "ms"], rs = {};
function Vl(e, t) {
  const n = rs[t];
  if (n)
    return n;
  let s = ke(t);
  if (s !== "filter" && s in e)
    return rs[t] = s;
  s = Cr(s);
  for (let r = 0; r < fr.length; r++) {
    const i = fr[r] + s;
    if (i in e)
      return rs[t] = i;
  }
  return t;
}
function Ul(e, t, n, s) {
  return e.tagName === "TEXTAREA" && (t === "width" || t === "height") && ne(s) && n === s;
}
const ur = "http://www.w3.org/1999/xlink";
function dr(e, t, n, s, r, i = Bi(t)) {
  s && t.startsWith("xlink:") ? n == null ? e.removeAttributeNS(ur, t.slice(6, t.length)) : e.setAttributeNS(ur, t, n) : n == null || i && !Tr(n) ? e.removeAttribute(t) : e.setAttribute(
    t,
    i ? "" : ze(n) ? String(n) : n
  );
}
function hr(e, t, n, s, r) {
  if (t === "innerHTML" || t === "textContent") {
    n != null && (e[t] = t === "innerHTML" ? Ai(n) : n);
    return;
  }
  const i = e.tagName;
  if (t === "value" && i !== "PROGRESS" && // custom elements may use _value internally
  !i.includes("-")) {
    const l = i === "OPTION" ? e.getAttribute("value") || "" : e.value, c = n == null ? (
      // #11647: value should be set as empty string for null and undefined,
      // but <input type="checkbox"> should be set as 'on'.
      e.type === "checkbox" ? "on" : ""
    ) : String(n);
    (l !== c || !("_value" in e)) && (e.value = c), n == null && e.removeAttribute(t), e._value = n;
    return;
  }
  let o = !1;
  if (n === "" || n == null) {
    const l = typeof e[t];
    l === "boolean" ? n = Tr(n) : n == null && l === "string" ? (n = "", o = !0) : l === "number" && (n = 0, o = !0);
  }
  try {
    e[t] = n;
  } catch {
  }
  o && e.removeAttribute(r || t);
}
function Kl(e, t, n, s) {
  e.addEventListener(t, n, s);
}
function Wl(e, t, n, s) {
  e.removeEventListener(t, n, s);
}
const pr = /* @__PURE__ */ Symbol("_vei");
function zl(e, t, n, s, r = null) {
  const i = e[pr] || (e[pr] = {}), o = i[t];
  if (s && o)
    o.value = s;
  else {
    const [l, c] = Jl(t);
    if (s) {
      const u = i[t] = Zl(
        s,
        r
      );
      Kl(e, l, u, c);
    } else o && (Wl(e, l, o, c), i[t] = void 0);
  }
}
const ql = /(Once|Passive|Capture)$/, Gl = /^on:?(?:Once|Passive|Capture)$/;
function Jl(e) {
  let t, n;
  for (; (n = e.match(ql)) && !Gl.test(e); )
    t || (t = {}), e = e.slice(0, e.length - n[1].length), t[n[1].toLowerCase()] = !0;
  return [e[2] === ":" ? e.slice(3) : Tt(e.slice(2)), t];
}
let is = 0;
const Yl = /* @__PURE__ */ Promise.resolve(), Xl = () => is || (Yl.then(() => is = 0), is = Date.now());
function Zl(e, t) {
  const n = (s) => {
    if (!s._vts)
      s._vts = Date.now();
    else if (s._vts <= n.attached)
      return;
    const r = n.value;
    if (M(r)) {
      const i = s.stopImmediatePropagation;
      s.stopImmediatePropagation = () => {
        i.call(s), s._stopped = !0;
      };
      const o = r.slice(), l = [s];
      for (let c = 0; c < o.length && !s._stopped; c++) {
        const u = o[c];
        u && Ie(
          u,
          t,
          5,
          l
        );
      }
    } else
      Ie(
        r,
        t,
        5,
        [s]
      );
  };
  return n.value = e, n.attached = Xl(), n;
}
const gr = (e) => e.charCodeAt(0) === 111 && e.charCodeAt(1) === 110 && // lowercase letter
e.charCodeAt(2) > 96 && e.charCodeAt(2) < 123, Ql = (e, t, n, s, r, i) => {
  const o = r === "svg";
  t === "class" ? $l(e, s, o) : t === "style" ? Bl(e, n, s) : Rn(t) ? Nn(t) || zl(e, t, n, s, i) : (t[0] === "." ? (t = t.slice(1), !0) : t[0] === "^" ? (t = t.slice(1), !1) : ec(e, t, s, o)) ? (hr(e, t, s), !e.tagName.includes("-") && (t === "value" || t === "checked" || t === "selected") && dr(e, t, s, o, i, t !== "value")) : /* #11081 force set props for possible async custom element */ e._isVueCE && // #12408 check if it's declared prop or it's async custom element
  (tc(e, t) || // @ts-expect-error _def is private
  e._def.__asyncLoader && (/[A-Z]/.test(t) || !ne(s))) ? hr(e, ke(t), s, i, t) : (t === "true-value" ? e._trueValue = s : t === "false-value" && (e._falseValue = s), dr(e, t, s, o));
};
function ec(e, t, n, s) {
  if (s)
    return !!(t === "innerHTML" || t === "textContent" || t in e && gr(t) && D(n));
  if (t === "spellcheck" || t === "draggable" || t === "translate" || t === "autocorrect" || t === "sandbox" && e.tagName === "IFRAME" || t === "form" || t === "list" && e.tagName === "INPUT" || t === "type" && e.tagName === "TEXTAREA")
    return !1;
  if (t === "width" || t === "height") {
    const r = e.tagName;
    if (r === "IMG" || r === "VIDEO" || r === "CANVAS" || r === "SOURCE")
      return !1;
  }
  return gr(t) && ne(n) ? !1 : t in e;
}
function tc(e, t) {
  const n = (
    // @ts-expect-error _def is private
    e._def.props
  );
  if (!n)
    return !1;
  const s = ke(t);
  return Array.isArray(n) ? n.some((r) => ke(r) === s) : Object.keys(n).some((r) => ke(r) === s);
}
const nc = /* @__PURE__ */ le({ patchProp: Ql }, Ol);
let mr;
function sc() {
  return mr || (mr = al(nc));
}
const rc = ((...e) => {
  const t = sc().createApp(...e), { mount: n } = t;
  return t.mount = (s) => {
    const r = oc(s);
    if (!r) return;
    const i = t._component;
    !D(i) && !i.render && !i.template && (i.template = r.innerHTML), r.nodeType === 1 && (r.textContent = "");
    const o = n(r, !1, ic(r));
    return r instanceof Element && (r.removeAttribute("v-cloak"), r.setAttribute("data-v-app", "")), o;
  }, t;
});
function ic(e) {
  if (e instanceof SVGElement)
    return "svg";
  if (typeof MathMLElement == "function" && e instanceof MathMLElement)
    return "mathml";
}
function oc(e) {
  return ne(e) ? document.querySelector(e) : e;
}
const Oe = Object.freeze({
  direction: "ltr",
  layout: "single",
  pagedScale: "screen",
  continuousScale: "width",
  sidePadding: 0,
  pageGap: 0,
  background: "#000000",
  preload: 2,
  animations: !0,
  swipe: !0,
  showToolbarInitially: !0
}), lc = /* @__PURE__ */ new Set(["ltr", "rtl", "vertical", "webtoon"]), cc = /* @__PURE__ */ new Set(["single", "double", "double-no-cover"]), ac = /* @__PURE__ */ new Set(["screen", "width", "width-shrink-only", "height", "original"]), fc = /* @__PURE__ */ new Set(["width", "original"]);
function vr(e = {}) {
  return {
    direction: lc.has(e.direction ?? "") ? e.direction : Oe.direction,
    layout: cc.has(e.layout ?? "") ? e.layout : Oe.layout,
    pagedScale: ac.has(e.pagedScale ?? "") ? e.pagedScale : Oe.pagedScale,
    continuousScale: fc.has(e.continuousScale ?? "") ? e.continuousScale : Oe.continuousScale,
    sidePadding: os(e.sidePadding, 0, 40, Oe.sidePadding),
    pageGap: os(e.pageGap, 0, 64, Oe.pageGap),
    background: typeof e.background == "string" && e.background.trim() ? e.background : Oe.background,
    preload: Math.round(os(e.preload, 0, 10, Oe.preload)),
    animations: typeof e.animations == "boolean" ? e.animations : Oe.animations,
    swipe: typeof e.swipe == "boolean" ? e.swipe : Oe.swipe,
    showToolbarInitially: typeof e.showToolbarInitially == "boolean" ? e.showToolbarInitially : Oe.showToolbarInitially
  };
}
function os(e, t, n, s) {
  return typeof e == "number" && Number.isFinite(e) ? Math.min(n, Math.max(t, e)) : s;
}
function uc(e) {
  if (!e || !Array.isArray(e.pages) || e.pages.length === 0)
    return {
      valid: !1,
      code: "empty-manifest",
      message: "The page manifest must contain at least one page."
    };
  const t = /* @__PURE__ */ new Set();
  for (const [n, s] of e.pages.entries()) {
    if (!s || typeof s.id != "string" && typeof s.id != "number")
      return vn(`Page ${n + 1} must have a string or number id.`);
    if (t.has(s.id))
      return vn(`Page id ${String(s.id)} is duplicated.`);
    if (t.add(s.id), typeof s.src != "string" || !s.src.trim())
      return vn(`Page ${n + 1} must have a non-empty src URL.`);
    if (!br(s.width) || !br(s.height))
      return vn(`Page ${n + 1} dimensions must be positive finite numbers when provided.`);
  }
  return { valid: !0 };
}
function dc(e, t, n) {
  if (n?.pageId !== void 0) {
    const s = e.pages.findIndex((r) => r.id === n.pageId);
    if (s >= 0) return s + 1;
  }
  return n?.pageIndex !== void 0 && Number.isFinite(n.pageIndex) ? Fn(Math.trunc(n.pageIndex) + 1, e.pages.length) : Fn(t ?? 1, e.pages.length);
}
function Fn(e, t) {
  return Number.isFinite(e) ? Math.min(t, Math.max(1, Math.trunc(e))) : 1;
}
function br(e) {
  return e === void 0 || Number.isFinite(e) && e > 0;
}
function vn(e) {
  return { valid: !1, code: "invalid-manifest", message: e };
}
function hc(e, t) {
  if (e.length === 0) return [];
  if (t === "single") return e.map((i) => [i]);
  const n = [...e], s = [];
  let r;
  if (t === "double") {
    const i = n.shift();
    if (s.push(bn(i) ? [i] : [yn(i), i]), n.length > 0) {
      const o = n.pop();
      r = bn(o) ? [o] : [o, yn(o)];
    }
  }
  for (; n.length > 0; ) {
    const i = n.shift();
    if (bn(i)) {
      s.push([i]);
      continue;
    }
    const o = n.shift();
    o ? bn(o) ? s.push([i, yn(i)], [o]) : s.push([i, o]) : s.push([i, yn(i)]);
  }
  return r && s.push(r), s;
}
function pc(e, t) {
  const n = e.findIndex((s) => s.some((r) => !r.blank && r.id === t));
  return n < 0 ? 0 : n;
}
function bn(e) {
  return (e.width ?? 0) > (e.height ?? 0);
}
function yn(e) {
  return {
    id: `__blank-${String(e.id)}`,
    src: "",
    width: e.width ?? 20,
    height: e.height ?? 30,
    alt: "",
    blank: !0
  };
}
const gc = ["aria-label"], mc = {
  key: 0,
  class: "kr-empty",
  role: "alert"
}, vc = {
  key: 0,
  class: "kr-toolbar kr-toolbar--top"
}, bc = { class: "kr-title" }, yc = { class: "kr-stage" }, _c = {
  key: 0,
  class: "kr-blank",
  "aria-hidden": "true"
}, xc = ["src", "srcset", "alt", "crossorigin", "referrerpolicy", "onError"], Sc = {
  class: "kr-preload",
  "aria-hidden": "true"
}, Cc = ["src", "crossorigin", "referrerpolicy", "onError"], wc = ["id", "data-page-index", "src", "srcset", "alt", "width", "height", "loading", "crossorigin", "referrerpolicy", "onError"], Tc = {
  key: 0,
  class: "kr-panel kr-explorer",
  "aria-label": "Page explorer"
}, Ec = { class: "kr-panel__heading" }, Pc = { class: "kr-thumbnails" }, Ac = ["aria-label", "onClick"], Ic = ["src", "alt"], Oc = {
  key: 0,
  class: "kr-panel kr-settings",
  "aria-label": "Reader settings"
}, kc = { class: "kr-panel__heading" }, Mc = ["value"], Fc = ["value"], Rc = ["value"], Nc = ["value"], Dc = ["value"], $c = ["value"], Lc = { class: "kr-check" }, Hc = ["checked"], jc = { class: "kr-check" }, Bc = ["checked"], Vc = {
  key: 0,
  class: "kr-toolbar kr-toolbar--bottom"
}, Uc = ["max", "value", "aria-label"], Kc = { class: "kr-page-count" }, Wc = {
  class: "kr-sr-only",
  "aria-live": "polite"
}, zc = /* @__PURE__ */ Oo({
  __name: "ComicReader",
  props: {
    manifest: {},
    initialPage: { default: 1 },
    initialProgress: { default: void 0 },
    config: { default: () => ({}) }
  },
  emits: ["progress", "exit", "error", "config-change"],
  setup(e, { expose: t, emit: n }) {
    const s = e, r = n, i = /* @__PURE__ */ pt(), o = /* @__PURE__ */ pt(), l = He(() => uc(s.manifest)), c = He(() => l.value.valid ? s.manifest.pages : []), u = /* @__PURE__ */ jn(vr(s.config)), f = /* @__PURE__ */ pt(1), m = /* @__PURE__ */ pt(u.showToolbarInitially), x = /* @__PURE__ */ pt(!1), T = /* @__PURE__ */ pt(!1), R = /* @__PURE__ */ pt(), O = /* @__PURE__ */ new Set();
    let J = "", j = 0;
    const F = He(() => u.direction === "webtoon"), $ = He(() => hc(c.value, u.layout)), P = He(() => {
      const h = c.value[f.value - 1];
      return h ? pc($.value, h.id) : 0;
    }), V = He(() => $.value[P.value] ?? []), se = He(() => {
      if (F.value) return [];
      const h = Math.max(0, f.value - 1 - u.preload), g = Math.min(c.value.length - 1, f.value - 1 + u.preload);
      return c.value.slice(h, g + 1).filter((p) => !V.value.some((S) => S.id === p.id));
    }), ae = He(() => ({
      "--kr-background": u.background
    })), he = He(() => ({
      "--kr-side-padding": `${u.sidePadding}%`,
      "--kr-page-gap": `${u.pageGap}px`,
      scrollBehavior: u.animations ? "smooth" : "auto"
    }));
    at(l, (h) => {
      !h.valid && h.message && h.message !== J && (J = h.message, r("error", {
        code: h.code ?? "invalid-manifest",
        message: h.message
      }));
    }, { immediate: !0 }), at(
      () => [s.manifest, s.initialPage, s.initialProgress],
      () => {
        l.value.valid && (f.value = dc(s.manifest, s.initialPage, s.initialProgress), O.clear(), Pt());
      },
      { immediate: !0 }
    ), at(
      () => s.config,
      (h) => Object.assign(u, vr(h)),
      { deep: !0 }
    ), at(f, () => {
      l.value.valid && r("progress", N());
    }), at(F, () => {
      Pt();
    }), Is(() => {
      i.value?.focus({ preventScroll: !0 }), l.value.valid && r("progress", N());
    }), Os(() => {
      j && cancelAnimationFrame(j);
    });
    function N() {
      const h = Fn(f.value, c.value.length) - 1;
      return {
        pageId: c.value[h].id,
        pageIndex: h,
        pageNumber: h + 1,
        pagesCount: c.value.length,
        percent: Math.round((h + 1) / c.value.length * 1e4) / 100,
        completed: h === c.value.length - 1,
        timestamp: Date.now()
      };
    }
    function L(h, g = !0) {
      if (!l.value.valid) return;
      const p = Fn(h, c.value.length), S = p !== f.value;
      f.value = p, S || r("progress", N()), F.value && g && Pt();
    }
    function ee(h) {
      const g = c.value.findIndex((p) => p.id === h);
      g >= 0 && L(g + 1);
    }
    function E() {
      if (F.value) {
        f.value > 1 && L(f.value - 1);
        return;
      }
      oe(-1);
    }
    function B() {
      if (F.value) {
        f.value < c.value.length ? L(f.value + 1) : q("end");
        return;
      }
      oe(1);
    }
    function oe(h) {
      const g = P.value + h;
      if (g < 0) return;
      if (g >= $.value.length) {
        q("end");
        return;
      }
      const p = $.value[g].filter((w) => !w.blank), S = h > 0 ? p[0] : p.at(-1);
      S && ee(S.id);
    }
    function xe() {
      u.direction === "rtl" ? B() : E();
    }
    function re() {
      u.direction === "rtl" ? E() : B();
    }
    function q(h) {
      l.value.valid && r("exit", { reason: h, progress: N() });
    }
    function z() {
      m.value = !m.value;
    }
    function qe(h) {
      if (h.ctrlKey || h.altKey || h.metaKey) return;
      const g = h.target;
      if (!(["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(g.tagName) && h.key !== "Escape"))
        switch (h.key) {
          case "ArrowLeft":
            h.preventDefault(), xe();
            break;
          case "ArrowRight":
            h.preventDefault(), re();
            break;
          case "ArrowUp":
          case "PageUp":
            h.preventDefault(), E();
            break;
          case "ArrowDown":
          case "PageDown":
          case " ":
            h.preventDefault(), B();
            break;
          case "Home":
            h.preventDefault(), L(1);
            break;
          case "End":
            h.preventDefault(), L(c.value.length);
            break;
          case "Escape":
            h.preventDefault(), x.value ? x.value = !1 : T.value ? T.value = !1 : m.value ? m.value = !1 : q("keyboard");
            break;
        }
    }
    function Et(h) {
      const g = h.changedTouches[0];
      g && (R.value = { x: g.clientX, y: g.clientY });
    }
    function Ge(h) {
      if (!u.swipe || !R.value) return;
      const g = h.changedTouches[0];
      if (!g) return;
      const p = g.clientX - R.value.x, S = g.clientY - R.value.y;
      R.value = void 0, !(Math.max(Math.abs(p), Math.abs(S)) < 48) && (F.value || u.direction === "vertical" || Math.abs(S) > Math.abs(p) ? S < 0 ? B() : E() : p < 0 ? re() : xe());
    }
    function we() {
      j && cancelAnimationFrame(j), j = requestAnimationFrame(() => {
        const h = o.value;
        if (!h) return;
        const g = h.getBoundingClientRect().top + h.clientHeight / 2, p = Array.from(h.querySelectorAll("img[data-page-index]"));
        let S = f.value - 1, w = Number.POSITIVE_INFINITY;
        for (const I of p) {
          const k = I.getBoundingClientRect(), H = Math.abs(k.top + k.height / 2 - g);
          H < w && (w = H, S = Number(I.dataset.pageIndex));
        }
        Number.isFinite(S) && S + 1 !== f.value && L(S + 1, !1);
      });
    }
    async function Pt() {
      if (!F.value) return;
      await Kr(), o.value?.querySelector(`#${an(f.value - 1)}`)?.scrollIntoView?.({ block: "start", behavior: u.animations ? "smooth" : "auto" });
    }
    function an(h) {
      return `kr-page-${h + 1}`;
    }
    function fn(h) {
      return c.value.findIndex((g) => g.id === h) + 1;
    }
    function dt(h) {
      return u.continuousScale === "original" ? h.width : void 0;
    }
    function At(h) {
      return u.continuousScale === "original" ? h.height : void 0;
    }
    function ht(h) {
      O.has(h.id) || (O.add(h.id), r("error", {
        code: "image-load",
        message: `Could not load page ${fn(h.id)}.`,
        page: h
      }));
    }
    async function Nt() {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
        else if (i.value?.requestFullscreen) await i.value.requestFullscreen();
        else throw new Error("Fullscreen API is not available.");
      } catch (h) {
        r("error", {
          code: "fullscreen",
          message: "Could not change fullscreen mode.",
          cause: h
        });
      }
    }
    function Te() {
      r("config-change", { ...u });
    }
    function Dt(h) {
      return h.target.value;
    }
    function a(h) {
      u.direction = Dt(h), Te();
    }
    function d(h) {
      u.layout = Dt(h), Te();
    }
    function v(h) {
      u.pagedScale = Dt(h), Te();
    }
    function _(h) {
      u.continuousScale = Dt(h), Te();
    }
    function y(h, g) {
      u[h] = Number(g.target.value), Te();
    }
    function b(h, g) {
      u[h] = g.target.checked, Te();
    }
    function C(h) {
      L(Number(h.target.value));
    }
    return t({
      goTo: L,
      next: B,
      previous: E,
      toggleFullscreen: Nt
    }), (h, g) => (X(), te("section", {
      ref_key: "root",
      ref: i,
      class: "kr-reader",
      style: Yt(ae.value),
      "aria-label": e.manifest.title || "Comic reader",
      tabindex: "0",
      onKeydown: qe,
      onTouchstartPassive: Et,
      onTouchendPassive: Ge
    }, [
      l.value.valid ? (X(), te(ce, { key: 1 }, [
        de(gn, { name: "kr-toolbar" }, {
          default: Bt(() => [
            m.value ? (X(), te("header", vc, [
              A("button", {
                type: "button",
                "aria-label": "Exit reader",
                title: "Exit reader",
                onClick: g[0] || (g[0] = (p) => q("button"))
              }, " ← "),
              A("strong", bc, Le(e.manifest.title || "Comic"), 1),
              g[9] || (g[9] = A("span", { class: "kr-spacer" }, null, -1)),
              A("button", {
                type: "button",
                "aria-label": "Toggle fullscreen",
                title: "Fullscreen",
                onClick: Nt
              }, " ⛶ "),
              A("button", {
                type: "button",
                "aria-label": "Open page explorer",
                title: "Pages",
                onClick: g[1] || (g[1] = (p) => x.value = !x.value)
              }, " ▦ "),
              A("button", {
                type: "button",
                "aria-label": "Open reader settings",
                title: "Settings",
                onClick: g[2] || (g[2] = (p) => T.value = !T.value)
              }, " ⚙ ")
            ])) : Ze("", !0)
          ]),
          _: 1
        }),
        A("main", yc, [
          F.value ? (X(), te("div", {
            key: 1,
            ref_key: "continuousScroller",
            ref: o,
            class: xt(["kr-continuous", `kr-continuous--${u.continuousScale}`]),
            style: Yt(he.value),
            onScrollPassive: we
          }, [
            (X(!0), te(ce, null, pn(c.value, (p, S) => (X(), te("img", {
              id: an(S),
              key: p.id,
              "data-page-index": S,
              src: p.src,
              srcset: p.srcset,
              alt: p.alt || `Page ${S + 1}`,
              width: dt(p),
              height: At(p),
              loading: Math.abs(S - (f.value - 1)) <= u.preload ? "eager" : "lazy",
              crossorigin: p.crossOrigin,
              referrerpolicy: p.referrerPolicy,
              onError: (w) => ht(p)
            }, null, 40, wc))), 128)),
            A("button", {
              type: "button",
              class: "kr-zone kr-zone--center",
              "aria-label": "Toggle reader controls",
              onClick: z
            })
          ], 38)) : (X(), te("div", {
            key: 0,
            class: xt(["kr-paged", [
              `kr-direction--${u.direction}`,
              { "kr-paged--fit-screen": u.pagedScale === "screen" }
            ]])
          }, [
            A("div", {
              class: xt(["kr-spread", [
                `kr-scale--${u.pagedScale}`,
                { "kr-spread--double": V.value.length > 1, "kr-spread--animated": u.animations }
              ]])
            }, [
              (X(!0), te(ce, null, pn(V.value, (p) => (X(), te(ce, {
                key: p.id
              }, [
                p.blank ? (X(), te("span", _c)) : (X(), te("img", {
                  key: 1,
                  src: p.src,
                  srcset: p.srcset,
                  alt: p.alt || `Page ${fn(p.id)}`,
                  crossorigin: p.crossOrigin,
                  referrerpolicy: p.referrerPolicy,
                  draggable: "false",
                  onError: (S) => ht(p)
                }, null, 40, xc))
              ], 64))), 128))
            ], 2),
            A("div", Sc, [
              (X(!0), te(ce, null, pn(se.value, (p) => (X(), te("img", {
                key: p.id,
                src: p.src,
                crossorigin: p.crossOrigin,
                referrerpolicy: p.referrerPolicy,
                alt: "",
                onError: (S) => ht(p)
              }, null, 40, Cc))), 128))
            ]),
            u.direction !== "vertical" ? (X(), te("button", {
              key: 0,
              type: "button",
              class: "kr-zone kr-zone--left",
              "aria-label": "Turn left",
              onClick: xe
            })) : Ze("", !0),
            u.direction !== "vertical" ? (X(), te("button", {
              key: 1,
              type: "button",
              class: "kr-zone kr-zone--right",
              "aria-label": "Turn right",
              onClick: re
            })) : Ze("", !0),
            u.direction === "vertical" ? (X(), te("button", {
              key: 2,
              type: "button",
              class: "kr-zone kr-zone--top",
              "aria-label": "Previous page",
              onClick: E
            })) : Ze("", !0),
            u.direction === "vertical" ? (X(), te("button", {
              key: 3,
              type: "button",
              class: "kr-zone kr-zone--bottom",
              "aria-label": "Next page",
              onClick: B
            })) : Ze("", !0),
            A("button", {
              type: "button",
              class: "kr-zone kr-zone--center",
              "aria-label": "Toggle reader controls",
              onClick: z
            })
          ], 2))
        ]),
        de(gn, { name: "kr-panel" }, {
          default: Bt(() => [
            x.value ? (X(), te("aside", Tc, [
              A("div", Ec, [
                g[10] || (g[10] = A("strong", null, "Pages", -1)),
                A("button", {
                  type: "button",
                  "aria-label": "Close page explorer",
                  onClick: g[3] || (g[3] = (p) => x.value = !1)
                }, "×")
              ]),
              A("div", Pc, [
                (X(!0), te(ce, null, pn(c.value, (p, S) => (X(), te("button", {
                  key: p.id,
                  type: "button",
                  class: xt({ "kr-thumbnail--active": S + 1 === f.value }),
                  "aria-label": `Go to page ${S + 1}`,
                  onClick: (w) => {
                    L(S + 1), x.value = !1;
                  }
                }, [
                  A("img", {
                    src: p.src,
                    alt: p.alt || `Page ${S + 1}`,
                    loading: "lazy"
                  }, null, 8, Ic),
                  A("span", null, Le(S + 1), 1)
                ], 10, Ac))), 128))
              ])
            ])) : Ze("", !0)
          ]),
          _: 1
        }),
        de(gn, { name: "kr-panel" }, {
          default: Bt(() => [
            T.value ? (X(), te("aside", Oc, [
              A("div", kc, [
                g[11] || (g[11] = A("strong", null, "Reader settings", -1)),
                A("button", {
                  type: "button",
                  "aria-label": "Close reader settings",
                  onClick: g[4] || (g[4] = (p) => T.value = !1)
                }, "×")
              ]),
              A("label", null, [
                g[13] || (g[13] = Xe(" Reading direction ", -1)),
                A("select", {
                  value: u.direction,
                  onChange: a
                }, [...g[12] || (g[12] = [
                  A("option", { value: "ltr" }, "Left to right", -1),
                  A("option", { value: "rtl" }, "Right to left", -1),
                  A("option", { value: "vertical" }, "Vertical pages", -1),
                  A("option", { value: "webtoon" }, "Webtoon", -1)
                ])], 40, Mc)
              ]),
              F.value ? (X(), te(ce, { key: 1 }, [
                A("label", null, [
                  g[19] || (g[19] = Xe(" Scale ", -1)),
                  A("select", {
                    value: u.continuousScale,
                    onChange: _
                  }, [...g[18] || (g[18] = [
                    A("option", { value: "width" }, "Fit width", -1),
                    A("option", { value: "original" }, "Original size", -1)
                  ])], 40, Nc)
                ]),
                A("label", null, [
                  Xe(" Side padding: " + Le(u.sidePadding) + "% ", 1),
                  A("input", {
                    type: "range",
                    min: "0",
                    max: "40",
                    step: "5",
                    value: u.sidePadding,
                    onInput: g[5] || (g[5] = (p) => y("sidePadding", p))
                  }, null, 40, Dc)
                ]),
                A("label", null, [
                  Xe(" Page gap: " + Le(u.pageGap) + "px ", 1),
                  A("input", {
                    type: "range",
                    min: "0",
                    max: "64",
                    step: "4",
                    value: u.pageGap,
                    onInput: g[6] || (g[6] = (p) => y("pageGap", p))
                  }, null, 40, $c)
                ])
              ], 64)) : (X(), te(ce, { key: 0 }, [
                A("label", null, [
                  g[15] || (g[15] = Xe(" Page layout ", -1)),
                  A("select", {
                    value: u.layout,
                    onChange: d
                  }, [...g[14] || (g[14] = [
                    A("option", { value: "single" }, "Single page", -1),
                    A("option", { value: "double" }, "Double page with cover", -1),
                    A("option", { value: "double-no-cover" }, "Double page without cover", -1)
                  ])], 40, Fc)
                ]),
                A("label", null, [
                  g[17] || (g[17] = Xe(" Scale ", -1)),
                  A("select", {
                    value: u.pagedScale,
                    onChange: v
                  }, [...g[16] || (g[16] = [
                    A("option", { value: "screen" }, "Fit screen", -1),
                    A("option", { value: "width" }, "Fit width", -1),
                    A("option", { value: "width-shrink-only" }, "Fit width, shrink only", -1),
                    A("option", { value: "height" }, "Fit height", -1),
                    A("option", { value: "original" }, "Original size", -1)
                  ])], 40, Rc)
                ])
              ], 64)),
              A("label", Lc, [
                A("input", {
                  type: "checkbox",
                  checked: u.animations,
                  onChange: g[7] || (g[7] = (p) => b("animations", p))
                }, null, 40, Hc),
                g[20] || (g[20] = Xe(" Animate transitions ", -1))
              ]),
              A("label", jc, [
                A("input", {
                  type: "checkbox",
                  checked: u.swipe,
                  onChange: g[8] || (g[8] = (p) => b("swipe", p))
                }, null, 40, Bc),
                g[21] || (g[21] = Xe(" Swipe gestures ", -1))
              ])
            ])) : Ze("", !0)
          ]),
          _: 1
        }),
        de(gn, { name: "kr-toolbar" }, {
          default: Bt(() => [
            m.value ? (X(), te("footer", Vc, [
              A("button", {
                type: "button",
                "aria-label": "Previous page",
                onClick: E
              }, "‹"),
              A("input", {
                type: "range",
                min: "1",
                max: c.value.length,
                value: f.value,
                "aria-label": `Page ${f.value} of ${c.value.length}`,
                onInput: C
              }, null, 40, Uc),
              A("span", Kc, Le(f.value) + " / " + Le(c.value.length), 1),
              A("button", {
                type: "button",
                "aria-label": "Next page",
                onClick: B
              }, "›")
            ])) : Ze("", !0)
          ]),
          _: 1
        }),
        A("p", Wc, "Page " + Le(f.value) + " of " + Le(c.value.length), 1)
      ], 64)) : (X(), te("div", mc, Le(l.value.message), 1))
    ], 44, gc));
  }
}), qc = (e, t) => {
  const n = e.__vccOpts || e;
  for (const [s, r] of t)
    n[s] = r;
  return n;
}, Gc = /* @__PURE__ */ qc(zc, [["__scopeId", "data-v-8231eec8"]]);
class Yc {
  app;
  controls;
  destroyed = !1;
  constructor(t, n) {
    const s = Jc(t);
    this.app = rc(Gc, {
      manifest: n.manifest,
      initialPage: n.initialPage,
      initialProgress: n.initialProgress,
      config: n.config,
      onProgress: n.onProgress,
      onExit: n.onExit,
      onError: n.onError,
      onConfigChange: n.onConfigChange
    }), this.controls = this.app.mount(s);
  }
  goTo(t) {
    this.activeControls().goTo(t);
  }
  next() {
    this.activeControls().next();
  }
  previous() {
    this.activeControls().previous();
  }
  toggleFullscreen() {
    return this.activeControls().toggleFullscreen();
  }
  destroy() {
    this.destroyed || (this.app.unmount(), this.destroyed = !0);
  }
  activeControls() {
    if (this.destroyed) throw new Error("Comic reader has already been destroyed.");
    return this.controls;
  }
}
function Jc(e) {
  if (typeof e != "string") return e;
  if (typeof document > "u")
    throw new Error("Comic reader standalone bundle requires a browser DOM.");
  const t = document.querySelector(e);
  if (!t) throw new Error(`Comic reader target not found: ${e}`);
  return t;
}
export {
  Yc as Reader,
  Yc as default
};
