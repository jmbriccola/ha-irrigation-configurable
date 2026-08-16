/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const ue = globalThis, Fe = ue.ShadowRoot && (ue.ShadyCSS === void 0 || ue.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, De = /* @__PURE__ */ Symbol(), Je = /* @__PURE__ */ new WeakMap();
let bt = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== De) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (Fe && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = Je.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && Je.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const qt = (n) => new bt(typeof n == "string" ? n : n + "", void 0, De), O = (n, ...e) => {
  const t = n.length === 1 ? n[0] : e.reduce((i, s, o) => i + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s) + n[o + 1], n[0]);
  return new bt(t, n, De);
}, Wt = (n, e) => {
  if (Fe) n.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), s = ue.litNonce;
    s !== void 0 && i.setAttribute("nonce", s), i.textContent = t.cssText, n.appendChild(i);
  }
}, et = Fe ? (n) => n : (n) => n instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return qt(t);
})(n) : n;
const { is: Zt, defineProperty: Vt, getOwnPropertyDescriptor: Bt, getOwnPropertyNames: Ht, getOwnPropertySymbols: Gt, getPrototypeOf: Kt } = Object, ge = globalThis, tt = ge.trustedTypes, Yt = tt ? tt.emptyScript : "", Qt = ge.reactiveElementPolyfillSupport, se = (n, e) => n, _e = { toAttribute(n, e) {
  switch (e) {
    case Boolean:
      n = n ? Yt : null;
      break;
    case Object:
    case Array:
      n = n == null ? n : JSON.stringify(n);
  }
  return n;
}, fromAttribute(n, e) {
  let t = n;
  switch (e) {
    case Boolean:
      t = n !== null;
      break;
    case Number:
      t = n === null ? null : Number(n);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(n);
      } catch {
        t = null;
      }
  }
  return t;
} }, Re = (n, e) => !Zt(n, e), it = { attribute: !0, type: String, converter: _e, reflect: !1, useDefault: !1, hasChanged: Re };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), ge.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let Y = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = it) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = /* @__PURE__ */ Symbol(), s = this.getPropertyDescriptor(e, i, t);
      s !== void 0 && Vt(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: s, set: o } = Bt(this.prototype, e) ?? { get() {
      return this[t];
    }, set(a) {
      this[t] = a;
    } };
    return { get: s, set(a) {
      const d = s?.call(this);
      o?.call(this, a), this.requestUpdate(e, d, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? it;
  }
  static _$Ei() {
    if (this.hasOwnProperty(se("elementProperties"))) return;
    const e = Kt(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(se("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(se("properties"))) {
      const t = this.properties, i = [...Ht(t), ...Gt(t)];
      for (const s of i) this.createProperty(s, t[s]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [i, s] of t) this.elementProperties.set(i, s);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, i] of this.elementProperties) {
      const s = this._$Eu(t, i);
      s !== void 0 && this._$Eh.set(s, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const s of i) t.unshift(et(s));
    } else e !== void 0 && t.push(et(e));
    return t;
  }
  static _$Eu(e, t) {
    const i = t.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof e == "string" ? e.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
  }
  addController(e) {
    (this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
  }
  removeController(e) {
    this._$EO?.delete(e);
  }
  _$E_() {
    const e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
    for (const i of t.keys()) this.hasOwnProperty(i) && (e.set(i, this[i]), delete this[i]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Wt(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, t, i) {
    this._$AK(e, i);
  }
  _$ET(e, t) {
    const i = this.constructor.elementProperties.get(e), s = this.constructor._$Eu(e, i);
    if (s !== void 0 && i.reflect === !0) {
      const o = (i.converter?.toAttribute !== void 0 ? i.converter : _e).toAttribute(t, i.type);
      this._$Em = e, o == null ? this.removeAttribute(s) : this.setAttribute(s, o), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, s = i._$Eh.get(e);
    if (s !== void 0 && this._$Em !== s) {
      const o = i.getPropertyOptions(s), a = typeof o.converter == "function" ? { fromAttribute: o.converter } : o.converter?.fromAttribute !== void 0 ? o.converter : _e;
      this._$Em = s;
      const d = a.fromAttribute(t, o.type);
      this[s] = d ?? this._$Ej?.get(s) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, s = !1, o) {
    if (e !== void 0) {
      const a = this.constructor;
      if (s === !1 && (o = this[e]), i ??= a.getPropertyOptions(e), !((i.hasChanged ?? Re)(o, t) || i.useDefault && i.reflect && o === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: s, wrapped: o }, a) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), o !== !0 || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), s === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const e = this.scheduleUpdate();
    return e != null && await e, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
        for (const [s, o] of this._$Ep) this[s] = o;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [s, o] of i) {
        const { wrapped: a } = o, d = this[s];
        a !== !0 || this._$AL.has(s) || d === void 0 || this.C(s, void 0, o, d);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((i) => i.hostUpdate?.()), this.update(t)) : this._$EM();
    } catch (i) {
      throw e = !1, this._$EM(), i;
    }
    e && this._$AE(t);
  }
  willUpdate(e) {
  }
  _$AE(e) {
    this._$EO?.forEach((t) => t.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(e) {
    return !0;
  }
  update(e) {
    this._$Eq &&= this._$Eq.forEach((t) => this._$ET(t, this[t])), this._$EM();
  }
  updated(e) {
  }
  firstUpdated(e) {
  }
};
Y.elementStyles = [], Y.shadowRootOptions = { mode: "open" }, Y[se("elementProperties")] = /* @__PURE__ */ new Map(), Y[se("finalized")] = /* @__PURE__ */ new Map(), Qt?.({ ReactiveElement: Y }), (ge.reactiveElementVersions ??= []).push("2.1.2");
const Le = globalThis, st = (n) => n, he = Le.trustedTypes, nt = he ? he.createPolicy("lit-html", { createHTML: (n) => n }) : void 0, wt = "$lit$", q = `lit$${Math.random().toFixed(9).slice(2)}$`, $t = "?" + q, Xt = `<${$t}>`, H = document, ne = () => H.createComment(""), oe = (n) => n === null || typeof n != "object" && typeof n != "function", Ue = Array.isArray, Jt = (n) => Ue(n) || typeof n?.[Symbol.iterator] == "function", ze = `[ 	
\f\r]`, ee = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ot = /-->/g, rt = />/g, W = RegExp(`>|${ze}(?:([^\\s"'>=/]+)(${ze}*=${ze}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), at = /'/g, lt = /"/g, xt = /^(?:script|style|textarea|title)$/i, kt = (n) => (e, ...t) => ({ _$litType$: n, strings: e, values: t }), l = kt(1), Se = kt(2), Q = /* @__PURE__ */ Symbol.for("lit-noChange"), p = /* @__PURE__ */ Symbol.for("lit-nothing"), dt = /* @__PURE__ */ new WeakMap(), B = H.createTreeWalker(H, 129);
function zt(n, e) {
  if (!Ue(n) || !n.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return nt !== void 0 ? nt.createHTML(e) : e;
}
const ei = (n, e) => {
  const t = n.length - 1, i = [];
  let s, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", a = ee;
  for (let d = 0; d < t; d++) {
    const u = n[d];
    let _, g, m = -1, S = 0;
    for (; S < u.length && (a.lastIndex = S, g = a.exec(u), g !== null); ) S = a.lastIndex, a === ee ? g[1] === "!--" ? a = ot : g[1] !== void 0 ? a = rt : g[2] !== void 0 ? (xt.test(g[2]) && (s = RegExp("</" + g[2], "g")), a = W) : g[3] !== void 0 && (a = W) : a === W ? g[0] === ">" ? (a = s ?? ee, m = -1) : g[1] === void 0 ? m = -2 : (m = a.lastIndex - g[2].length, _ = g[1], a = g[3] === void 0 ? W : g[3] === '"' ? lt : at) : a === lt || a === at ? a = W : a === ot || a === rt ? a = ee : (a = W, s = void 0);
    const w = a === W && n[d + 1].startsWith("/>") ? " " : "";
    o += a === ee ? u + Xt : m >= 0 ? (i.push(_), u.slice(0, m) + wt + u.slice(m) + q + w) : u + q + (m === -2 ? d : w);
  }
  return [zt(n, o + (n[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class re {
  constructor({ strings: e, _$litType$: t }, i) {
    let s;
    this.parts = [];
    let o = 0, a = 0;
    const d = e.length - 1, u = this.parts, [_, g] = ei(e, t);
    if (this.el = re.createElement(_, i), B.currentNode = this.el.content, t === 2 || t === 3) {
      const m = this.el.content.firstChild;
      m.replaceWith(...m.childNodes);
    }
    for (; (s = B.nextNode()) !== null && u.length < d; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const m of s.getAttributeNames()) if (m.endsWith(wt)) {
          const S = g[a++], w = s.getAttribute(m).split(q), U = /([.?@])?(.*)/.exec(S);
          u.push({ type: 1, index: o, name: U[2], strings: w, ctor: U[1] === "." ? ii : U[1] === "?" ? si : U[1] === "@" ? ni : ye }), s.removeAttribute(m);
        } else m.startsWith(q) && (u.push({ type: 6, index: o }), s.removeAttribute(m));
        if (xt.test(s.tagName)) {
          const m = s.textContent.split(q), S = m.length - 1;
          if (S > 0) {
            s.textContent = he ? he.emptyScript : "";
            for (let w = 0; w < S; w++) s.append(m[w], ne()), B.nextNode(), u.push({ type: 2, index: ++o });
            s.append(m[S], ne());
          }
        }
      } else if (s.nodeType === 8) if (s.data === $t) u.push({ type: 2, index: o });
      else {
        let m = -1;
        for (; (m = s.data.indexOf(q, m + 1)) !== -1; ) u.push({ type: 7, index: o }), m += q.length - 1;
      }
      o++;
    }
  }
  static createElement(e, t) {
    const i = H.createElement("template");
    return i.innerHTML = e, i;
  }
}
function X(n, e, t = n, i) {
  if (e === Q) return e;
  let s = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const o = oe(e) ? void 0 : e._$litDirective$;
  return s?.constructor !== o && (s?._$AO?.(!1), o === void 0 ? s = void 0 : (s = new o(n), s._$AT(n, t, i)), i !== void 0 ? (t._$Co ??= [])[i] = s : t._$Cl = s), s !== void 0 && (e = X(n, s._$AS(n, e.values), s, i)), e;
}
class ti {
  constructor(e, t) {
    this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(e) {
    const { el: { content: t }, parts: i } = this._$AD, s = (e?.creationScope ?? H).importNode(t, !0);
    B.currentNode = s;
    let o = B.nextNode(), a = 0, d = 0, u = i[0];
    for (; u !== void 0; ) {
      if (a === u.index) {
        let _;
        u.type === 2 ? _ = new le(o, o.nextSibling, this, e) : u.type === 1 ? _ = new u.ctor(o, u.name, u.strings, this, e) : u.type === 6 && (_ = new oi(o, this, e)), this._$AV.push(_), u = i[++d];
      }
      a !== u?.index && (o = B.nextNode(), a++);
    }
    return B.currentNode = H, s;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class le {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, i, s) {
    this.type = 2, this._$AH = p, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = s, this._$Cv = s?.isConnected ?? !0;
  }
  get parentNode() {
    let e = this._$AA.parentNode;
    const t = this._$AM;
    return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(e, t = this) {
    e = X(this, e, t), oe(e) ? e === p || e == null || e === "" ? (this._$AH !== p && this._$AR(), this._$AH = p) : e !== this._$AH && e !== Q && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Jt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== p && oe(this._$AH) ? this._$AA.nextSibling.data = e : this.T(H.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: i } = e, s = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = re.createElement(zt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === s) this._$AH.p(t);
    else {
      const o = new ti(s, this), a = o.u(this.options);
      o.p(t), this.T(a), this._$AH = o;
    }
  }
  _$AC(e) {
    let t = dt.get(e.strings);
    return t === void 0 && dt.set(e.strings, t = new re(e)), t;
  }
  k(e) {
    Ue(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, s = 0;
    for (const o of e) s === t.length ? t.push(i = new le(this.O(ne()), this.O(ne()), this, this.options)) : i = t[s], i._$AI(o), s++;
    s < t.length && (this._$AR(i && i._$AB.nextSibling, s), t.length = s);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const i = st(e).nextSibling;
      st(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class ye {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, i, s, o) {
    this.type = 1, this._$AH = p, this._$AN = void 0, this.element = e, this.name = t, this._$AM = s, this.options = o, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = p;
  }
  _$AI(e, t = this, i, s) {
    const o = this.strings;
    let a = !1;
    if (o === void 0) e = X(this, e, t, 0), a = !oe(e) || e !== this._$AH && e !== Q, a && (this._$AH = e);
    else {
      const d = e;
      let u, _;
      for (e = o[0], u = 0; u < o.length - 1; u++) _ = X(this, d[i + u], t, u), _ === Q && (_ = this._$AH[u]), a ||= !oe(_) || _ !== this._$AH[u], _ === p ? e = p : e !== p && (e += (_ ?? "") + o[u + 1]), this._$AH[u] = _;
    }
    a && !s && this.j(e);
  }
  j(e) {
    e === p ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class ii extends ye {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === p ? void 0 : e;
  }
}
class si extends ye {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== p);
  }
}
class ni extends ye {
  constructor(e, t, i, s, o) {
    super(e, t, i, s, o), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = X(this, e, t, 0) ?? p) === Q) return;
    const i = this._$AH, s = e === p && i !== p || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, o = e !== p && (i === p || s);
    s && this.element.removeEventListener(this.name, this, i), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class oi {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    X(this, e);
  }
}
const ri = Le.litHtmlPolyfillSupport;
ri?.(re, le), (Le.litHtmlVersions ??= []).push("3.3.3");
const ai = (n, e, t) => {
  const i = t?.renderBefore ?? e;
  let s = i._$litPart$;
  if (s === void 0) {
    const o = t?.renderBefore ?? null;
    i._$litPart$ = s = new le(e.insertBefore(ne(), o), o, void 0, t ?? {});
  }
  return s._$AI(n), s;
};
const je = globalThis;
class P extends Y {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = ai(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return Q;
  }
}
P._$litElement$ = !0, P.finalized = !0, je.litElementHydrateSupport?.({ LitElement: P });
const li = je.litElementPolyfillSupport;
li?.({ LitElement: P });
(je.litElementVersions ??= []).push("4.2.2");
const di = { attribute: !0, type: String, converter: _e, reflect: !1, hasChanged: Re }, ci = (n = di, e, t) => {
  const { kind: i, metadata: s } = t;
  let o = globalThis.litPropertyMetadata.get(s);
  if (o === void 0 && globalThis.litPropertyMetadata.set(s, o = /* @__PURE__ */ new Map()), i === "setter" && ((n = Object.create(n)).wrapped = !0), o.set(t.name, n), i === "accessor") {
    const { name: a } = t;
    return { set(d) {
      const u = e.get.call(this);
      e.set.call(this, d), this.requestUpdate(a, u, n, !0, d);
    }, init(d) {
      return d !== void 0 && this.C(a, void 0, n, d), d;
    } };
  }
  if (i === "setter") {
    const { name: a } = t;
    return function(d) {
      const u = this[a];
      e.call(this, d), this.requestUpdate(a, u, n, !0, d);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function h(n) {
  return (e, t) => typeof t == "object" ? ci(n, e, t) : ((i, s, o) => {
    const a = s.hasOwnProperty(o);
    return s.constructor.createProperty(o, i), a ? Object.getOwnPropertyDescriptor(s, o) : void 0;
  })(n, e, t);
}
function c(n) {
  return h({ ...n, state: !0, attribute: !1 });
}
function v(n) {
  if (typeof n == "number" && Number.isFinite(n)) return n;
  if (typeof n == "string" && n.trim() !== "") {
    const e = Number(n);
    if (Number.isFinite(e)) return e;
  }
}
function N(n) {
  return typeof n == "string" && n !== "" ? n : void 0;
}
function St(n) {
  return Array.isArray(n) ? n : [];
}
function pe(n) {
  return !n || n.state === "unavailable" || n.state === "unknown";
}
function me(n, e, t) {
  return Math.min(t, Math.max(e, n));
}
function L(n, e) {
  customElements.get(n) || customElements.define(n, e);
}
const ae = {
  // Card-level messages
  "card.name": "Irrigation Maestro Card",
  "card.description": "Overview and control of the Irrigation Maestro integration: water budget, zones, queue and curves.",
  "card.not_installed": "Irrigation Maestro is not installed or has not created any entities yet. Set up the integration first.",
  "card.no_zones": "No zones configured yet. Add zones from the Irrigation Maestro integration options.",
  "card.unavailable": "unavailable",
  // Panel (sidebar)
  "panel.title": "Irrigation",
  "panel.no_zones": "No zones configured yet. Add zones from the Irrigation Maestro integration options.",
  "panel.no_programs": "No programs configured yet.",
  "panel.per_day_minutes": "Different duration per day",
  "panel.minutes_value": "{min} min",
  "panel.edit_program": "Edit",
  "panel.rename_program": "Rename",
  "panel.delete_program": "Delete",
  "panel.confirm_delete_program": 'Delete "{name}"?',
  "panel.weather_line": "Today ({day}) ≈ {min} min. Skips if it rains.",
  "panel.pick_a_day": "Pick at least one day",
  "panel.add_program": "Add program",
  "panel.advanced": "Advanced settings",
  "panel.heat_response": "Heat response",
  "panel.weather_temp": "weather: {temp}°",
  "panel.budget_ok": "water budget OK",
  "panel.budget_low": "water budget low",
  "panel.config_read_failed": "Couldn't read the current configuration.",
  "panel.saved_settings": "Settings saved",
  "panel.saved_zone": "Zone saved",
  "panel.removed_zone": "Zone deleted",
  "program.duplicate": "Duplicate",
  "program.duplicate_done": "Program duplicated",
  // Program editor (panel)
  "program_editor.days": "Days",
  "program_editor.start": "When does it start?",
  "program_editor.start_fixed": "Fixed time",
  "program_editor.start_sunrise": "Sunrise",
  "program_editor.start_sunset": "Sunset",
  "program_editor.duration_per_day": "Duration per day",
  "program_editor.same_duration": "Same duration every day",
  "program_editor.zone_adjustment_note": "This zone waters at {pct}% of each program's setting.",
  // Add-program wizard (panel)
  "wizard.step1_title": "Which days?",
  "wizard.step2_title": "When does it start?",
  "wizard.step3_title": "For how long?",
  "wizard.preset_every_day": "Every day",
  "wizard.preset_alternate": "Alternate days",
  "wizard.preset_weekend": "Weekends",
  "wizard.done_prefix": "✓ Done!",
  "wizard.back": "Back",
  "wizard.next": "Next",
  "wizard.finish": "Done",
  // Header
  "header.water_budget": "Water budget",
  "header.skip_threshold": "Skip threshold",
  "header.weighted_temp": "Weighted temperature",
  "header.session": "Session",
  "header.global_pause": "Globally paused",
  "header.stale_weather": "Stale weather data",
  "header.consumption_left": "Water left",
  // The hub scope: water on a meter no single zone owns. There is no zone to
  // name, which is exactly why the hub has an alarm of its own.
  "header.leak": "System leak",
  // Session states
  "session.idle": "Idle",
  "session.evaluating": "Evaluating",
  "session.running": "Running",
  // Zone states
  "zone_state.idle": "Idle",
  "zone_state.queued": "Queued",
  "zone_state.watering": "Watering",
  "zone_state.soaking": "Soaking",
  "zone_state.paused": "Paused",
  "zone_state.suspended": "Suspended",
  "zone_state.disabled": "Disabled",
  // Last-outcome states
  "outcome.completed": "Completed",
  "outcome.skipped": "Skipped",
  "outcome.interrupted": "Interrupted",
  "outcome.cancelled": "Cancelled",
  "outcome.none": "No runs yet",
  // Skip / outcome reason keys
  "reason.out_of_season": "Out of season",
  "reason.precipitation": "Enough precipitation",
  "reason.frost_risk": "Frost risk",
  "reason.cold_day": "Too cold",
  "reason.wind": "Too windy",
  "reason.budget_sufficient": "Water budget sufficient",
  "program_editor.calendar": "Calendar",
  "program_editor.season": "Season (empty = all year as configured on the hub)",
  "reason.calendar_not_today": "Not a watering day",
  "program.toggle_unavailable": "Enable switch unavailable",
  "reason.not_due": "Not due yet",
  "reason.calendar_restricted": "Calendar restriction",
  "reason.zone_disabled": "Zone disabled",
  "reason.cycle_disabled": "Program disabled",
  "reason.suspended": "Zone suspended",
  "reason.paused": "Paused",
  "reason.manual_stop_block": "Blocked after manual stop",
  "reason.session_overrun": "Session ran over its time limit",
  "reason.weather_unavailable": "Weather data unavailable",
  "reason.skip_today_requested": "Skip requested for today",
  "reason.day_not_scheduled": "Not scheduled today",
  "reason.consumption_budget": "Consumption budget reached",
  "reason.valves_busy": "Valves busy",
  "reason.valve_unavailable": "Valve unavailable",
  "reason.open_failed": "Valve failed to open",
  "reason.foreign_valve_open": "Another valve already open",
  "reason.manual_intervention": "Manual intervention",
  "reason.no_flow": "No water flow detected",
  "reason.flow_out_of_range": "Flow out of range",
  "reason.close_failed": "Valve failed to close",
  "reason.leak": "Blocked by a leak alarm",
  "reason.no_water_supply": "No water supply",
  "reason.watchdog": "Closed by the safety watchdog",
  "reason.zone_removed": "Zone removed",
  "reason.shutdown": "Integration shut down",
  "reason.cancelled": "Cancelled",
  // Degraded-feature keys
  "degraded.switch_valve": "Valve without position feedback",
  "degraded.no_flow_meter": "No flow meter",
  "degraded.flow_unit_unknown": "Flow meter unit unknown",
  "degraded.line_meter_shared": "Shared line meter",
  "degraded.no_hourly_forecast": "No hourly forecast",
  "degraded.volume_mode_unavailable": "Volume mode unavailable",
  "degraded.leak_sensor_missing": "The chosen leak sensor no longer exists",
  "degraded.water_supply_sensor_missing": "The chosen water-supply sensor no longer exists",
  // Diagnostics, never alarms: "could not check", not "is broken" and not
  // "is leaking". A valve held open outside the integration reads exactly
  // like this, and an afternoon of hand-watering is entirely benign.
  "degraded.leak_never_observable": "This zone has had no way to check for leaks",
  "degraded.leak_evidence_unresolved": "This zone cannot finish judging a possible leak",
  // Leak sources, as `zone_leak`/`hub_leak` publish them. Observations, not
  // conclusions: a `moisture` sensor on this hardware means "water passed
  // while I was shut", not "there is water on the ground".
  "leak_source.valve_sensor": "the valve's own sensor reports a leak",
  "leak_source.no_flow_closed": "water measured with every valve closed",
  // Zone rows
  "zone.next_run": "Next run",
  "zone.no_next_run": "No run scheduled",
  "zone.last_outcome": "Last outcome",
  "zone.suspended_until": "Suspended until {date}",
  "zone.remaining": "{minutes} min left",
  "zone.cycles": "Programs",
  "zone.no_cycles": "No programs configured",
  "zone.cycle_enabled": "Enabled",
  "zone.cycle_disabled": "Disabled",
  "zone.water_estimated": "estimated",
  "zone.water_today": "today",
  "zone.water_month": "this month",
  "zone.leak_alarm": "Leak",
  // `since` is when the alarm was CONFIRMED — the evidence completing, not
  // the water starting. Never word this as "leaking since".
  "zone.leak_confirmed_at": "Confirmed {when}",
  "zone.leak_checking": "Leak check not concluded yet",
  // Named for what the capability actually measures — the leak SENSOR. A
  // zone with its own flow meter is still covered by the meter while this
  // reads "unavailable", so it must not say "leak detection is off".
  "zone.leak_unavailable": "No leak sensor",
  "zone.leak_candidate": "This valve's device offers a leak sensor",
  "zone.supply_unavailable": "No water-supply sensor",
  "zone.supply_candidate": "This valve's device offers a water-supply sensor",
  // Cycle triggers
  "trigger.sunrise": "Sunrise",
  "trigger.sunset": "Sunset",
  "trigger.at": "At {time}",
  // Curve display
  "curve.clamp_min": "min",
  "curve.clamp_max": "max",
  "curve.unit_duration": "min",
  "curve.unit_volume": "L",
  "curve.copy_from": "Copy curve from…",
  "curve.copy_placeholder": "Choose a program…",
  "curve.copy_error": "No other program to copy a curve from yet.",
  // Queue
  "queue.title": "Queue",
  "queue.duration": "{minutes} min",
  "queue_state.pending": "Pending",
  "queue_state.running": "Running",
  "queue_state.done": "Done",
  // Controls
  "controls.run_now": "Run now",
  "controls.skip_today": "Skip today",
  "controls.pause_for": "Pause…",
  "controls.hours": "{hours} h",
  "controls.resume": "Resume",
  "controls.suspend_until": "Suspend until…",
  "controls.enable": "Enable",
  "controls.disable": "Disable",
  "controls.run_all": "Run all",
  "controls.stop_all": "Stop all",
  "controls.confirm_stop_all": "Stop all irrigation now?",
  "controls.evaluate_now": "Evaluate now",
  "controls.pause_global": "Pause all",
  "controls.resume_global": "Resume all",
  // Editor (card configuration)
  "card_editor.title": "Title",
  "card_editor.title_placeholder": "Card title (optional)",
  "editor.show_header": "Show header",
  "editor.show_queue": "Show queue while running",
  "editor.show_controls": "Show controls",
  "editor.compact": "Compact layout",
  "editor.zones": "Zones",
  "editor.zones_hint": "Select the zones to display. Leave all unchecked to show every zone.",
  "editor.no_zones": "No zones discovered yet.",
  // Curve editor
  "editor.edit_curve": "Edit curve",
  "editor.title": "How much to water by temperature",
  "editor.graph.caption": "The curve you're drawing — the shaded band is the min/max range that clamps it",
  "editor.graph.today": "today {temp}°",
  "editor.graph.adjustment_note": "This graph shows the curve itself, unscaled. The figures below show what this zone will actually water, at {pct}% of it.",
  "editor.preview_title": "Preview at reference temperatures",
  "editor.today": "🌡️ With today's weather (weighted temperature {temp}°) it would give ≈ {value} {unit}.",
  "editor.points_title": "Points",
  "editor.point_temp": "Temperature (°C)",
  "editor.point_value": "Value",
  "editor.point_add": "Add a point after this one",
  "editor.point_remove": "Remove this point",
  "editor.kind_label": "This curve measures",
  "editor.kind_duration": "Duration (minutes)",
  "editor.kind_volume": "Volume (liters)",
  "editor.min.label": "⬇️ Never less than",
  "editor.min.help": "Absolute minimum, applied after the curve and any scaling.",
  "editor.max.label": "⬆️ Never more than",
  "editor.max.help": "Absolute maximum, applied after the curve and any scaling.",
  "editor.intensity_reset": "Saving a curve you edit here resets this program's watering strength — including any per-day amounts — to the curve's own values.",
  "editor.curve_empty": "The curve needs at least one point.",
  "editor.curve_negative_value": "No point can have a negative value.",
  "editor.curve_temps_not_increasing": "Temperatures must strictly increase from left to right.",
  "editor.min_above_max": "The minimum can't be higher than the maximum.",
  "editor.negative_clamp": "The minimum can't be negative.",
  "editor.save": "Save",
  "editor.cancel": "Cancel",
  "editor.saved": "Curve updated.",
  "editor.save_error": "Couldn't save the curve: {error}",
  "editor.volume_note": "This program uses a volume curve (liters) — edit its points in Advanced settings below.",
  // Zone editor (panel)
  "zone.add": "Add zone",
  "zone.edit": "Edit zone",
  "zone.delete": "Delete zone",
  "zone.field_name": "Name",
  "zone.field_valve": "Valve",
  "zone.field_area": "Area (m²)",
  "zone.advanced": "Advanced",
  "zone.field_flow_sensor": "Flow sensor",
  "zone.field_flow_unit": "Flow sensor unit",
  "zone.flow_unit_auto": "Detected from the entity",
  "zone.flow_unit_from_override": "Using {unit} — you set this, overriding the entity",
  "zone.flow_unit_from_entity": "Using {unit}, declared by the entity",
  "zone.flow_unit_unknown": "No usable unit: readings are ignored until you set one",
  "zone.field_flow_nominal": "Nominal flow (L/min)",
  "zone.field_flow_tolerance": "Flow tolerance (%)",
  "zone.field_adjustment": "Adjustment (%)",
  "zone.field_order": "Order",
  "zone.field_interval": "Watering interval (days)",
  "zone.field_season": "Season months override",
  "zone.field_group": "Compatibility group",
  "zone.field_leak_sensor": "Leak sensor",
  "zone.field_water_supply_sensor": "Water-supply sensor",
  "zone.sensor_detected": "Found on this valve's device: {entity}",
  "zone.leak_sensor_none": "This valve's device offers no leak sensor. You can still pick one anywhere — a probe in the bed is a deliberate, valid choice.",
  "zone.water_supply_none": "This valve's device offers no water-supply sensor. You can still pick one anywhere.",
  // The polarity is inverted with respect to the field's name, and getting
  // it backwards would block every cycle instead of none.
  "zone.water_supply_polarity": "A “problem” sensor: on means there is NO water.",
  // Settings view (panel)
  "settings.title": "Settings",
  "settings.weather": "Weather & sensors",
  "settings.weather_entity": "Weather entity",
  "settings.rain": "Rain sensor",
  "settings.outdoor_temp": "Outdoor temperature sensor",
  "settings.line_flow": "Line flow sensor",
  "settings.field_line_flow_unit": "Line flow sensor unit",
  "settings.master_valve": "Master valve",
  "settings.clear": "Clear",
  "settings.budget": "Consumption budget",
  "settings.liters": "Liters per month",
  "settings.on_exceed": "On exceed",
  "settings.action_notify": "Notify",
  "settings.action_reduce": "Reduce",
  "settings.action_suspend": "Suspend",
  "settings.reduce_pct": "Reduction percentage",
  "settings.restrictions": "Calendar restrictions",
  "settings.allowed_days": "Allowed days",
  "settings.parity_all": "All",
  "settings.parity_odd": "Odd",
  "settings.parity_even": "Even",
  "settings.restrictions_hours_only": "Forbidden hours only. Which days a zone waters is set on each program's calendar.",
  "settings.forbidden_windows": "Forbidden windows",
  "settings.notifications": "Notifications",
  // Notification wizard (panel)
  "notify.loading": "Reading the notification status…",
  "notify.load_failed": "The notification status could not be read.",
  "notify.retry": "Try again",
  "notify.mute_title": "You will not receive any notification",
  "notify.mute_body": "No essential event reaches anyone: a forced valve closure, an anomaly, an interrupted run, a missed program or a water leak would pass unnoticed.",
  "notify.partial_body": "These essential events will not reach you: {events}.",
  "notify.configure": "Configure now",
  "notify.step_recipients": "Who receives them",
  "notify.step_events": "What to send",
  "notify.step_summary": "Confirm",
  "notify.no_recipients": "This instance has no notify service yet. Set one up first — the companion app, Telegram, e-mail — and it will appear here.",
  "notify.recipient_gone": "no longer exists",
  "notify.recipient_gone_hint": "A recipient marked as no longer existing is still stored and is still written back on every save. Uncheck it to remove it.",
  "notify.send_test": "Send a test",
  "notify.test_sending": "Sending",
  // "Sent", not "Delivered": the service learns only that notify.<service>
  // accepted the call without raising — a push can still die downstream.
  "notify.test_ok": "Sent",
  "notify.test_failed": "Not delivered: {error}",
  // The reason shown when the test send itself never came back with a
  // verdict — the call failed, or answered with something unusable.
  "notify.test_no_result": "no result came back",
  "notify.preset_recommended": "Recommended",
  "notify.preset_critical": "Critical only",
  "notify.preset_all": "Everything",
  "notify.group_critical": "Critical",
  "notify.group_operational": "Operational",
  "notify.group_informational": "Informational",
  "notify.priority_high": "High",
  "notify.priority_normal": "Normal",
  "notify.needs_recipient": "Choose at least one recipient before enabling an event.",
  "notify.back": "Back",
  "notify.next": "Next",
  "notify.save": "Save",
  "notify.test_title": "Irrigation Maestro",
  "notify.test_message": "Test notification. If you can read this, this recipient works.",
  "notify.event_watchdog": "Watchdog",
  "notify.event_anomaly": "Anomaly",
  "notify.event_leak": "Leak",
  "notify.event_skipped": "Cycle skipped",
  "notify.event_interrupted": "Cycle interrupted",
  "notify.event_cancelled": "Cycle cancelled",
  "notify.event_completed": "Cycle finished",
  "notify.event_sentinel": "Sentinel",
  "notify.event_session_overrun": "Session overrun",
  "notify.event_consumption_budget": "Consumption budget",
  "settings.session_safety": "Advanced: session and safety",
  "settings.valves_concurrency": "Advanced: valves and concurrency",
  "settings.session_max_min": "Maximum session length",
  "settings.session_max_min_hint": "Minutes. Anything still queued past this is skipped. Empty = no limit.",
  "settings.must_finish_by": "Must finish by",
  "settings.must_finish_by_hint": "Local time. Empty = no deadline.",
  "settings.wait_free_min": "Wait for free valves",
  "settings.wait_free_min_hint": "Minutes to wait for a busy valve before cancelling the run. Default 5.",
  "settings.manual_block_min": "Block after a manual stop",
  "settings.manual_block_min_hint": "Minutes during which scheduled runs stay blocked after you stop watering by hand. Default 30.",
  "settings.settle_pause_s": "Settle pause",
  "settings.settle_pause_s_hint": "Seconds between one zone closing and the next opening. Default 60.",
  "settings.sentinel_time": "Sentinel time",
  "settings.sentinel_time_hint": "Local time of the daily check that every due program left a trace. Default 23:30.",
  "settings.open_confirm_s": "Open confirmation",
  "settings.open_confirm_s_hint": "Seconds to wait for a valve to report open. Default 10.",
  "settings.close_confirm_s": "Close confirmation",
  "settings.close_confirm_s_hint": "Seconds to wait for a valve to report closed. Default 15.",
  "settings.switch_confirm_s": "Switch confirmation",
  "settings.switch_confirm_s_hint": "Seconds for switch-backed valves, which report no position. Default 8.",
  "settings.startup_valve_timeout_s": "Startup close timeout",
  "settings.startup_valve_timeout_s_hint": "Seconds allowed for the close-all performed at startup. Default 30.",
  "settings.watchdog_max_min": "Watchdog maximum",
  "settings.watchdog_max_min_hint": "Minutes after which the watchdog force-closes a valve. Default 45.",
  "settings.max_concurrent": "Zones at once",
  "settings.max_concurrent_hint": "How many zones may water simultaneously. Default 1.",
  "settings.compatibility_groups": "Compatibility groups",
  "settings.compatibility_groups_hint": "Comma-separated group names whose zones may run together.",
  "settings.master_pre_open_s": "Master pre-open",
  "settings.master_pre_open_s_hint": "Seconds the master valve opens before a zone. Default 0.",
  "settings.master_post_close_s": "Master post-close",
  "settings.master_post_close_s_hint": "Seconds the master valve stays open after a zone. Default 0.",
  "settings.leak_action": "On a confirmed leak",
  "settings.leak_action_hint": "What to do once a leak is confirmed. Re-closing a valve that is already shut is a no-op — it recovers a valve left open by a lost command, and dries nothing on a false positive. Default: notify and re-close.",
  "settings.leak_action_notify": "Notify only",
  "settings.leak_action_close": "Notify and re-close the valves",
  "settings.leak_action_close_and_block": "Notify, re-close and block new cycles",
  "settings.leak_threshold_lpm": "Leak threshold",
  "settings.leak_threshold_lpm_hint": "Litres per minute measured with every valve closed before it counts as a leak. Default 0.5.",
  "settings.leak_confirm_s": "Leak confirmation",
  "settings.leak_confirm_s_hint": "Seconds the evidence must last before the alarm is raised. Each leak entity also stays unavailable until its scope has been watched this long, so raising it postpones a first answer. Default 300.",
  "settings.leak_repeat_min": "Leak reminder",
  "settings.leak_repeat_min_hint": "Minutes between reminders while the alarm stands. 0 turns the reminders off without touching the alarm. Default 360.",
  "settings.require_water_supply": "Refuse to start without water",
  "settings.require_water_supply_hint": "Refuse to start a cycle while the zone's water-supply sensor reports no water. The notification and the repair notice are raised either way — this governs the refusal, not the telling.",
  "settings.water_supply_confirm_s": "Water-supply confirmation",
  "settings.water_supply_confirm_s_hint": "Seconds the outage must have lasted before a start is refused and a notice sent. It never delays the diagnosis of a run already interrupted. Default 180.",
  "program_editor.soak_max_run": "Maximum run length",
  "program_editor.soak_max_run_hint": "Minutes. Splits the watering into shorter runs so the soil can absorb between them. Empty = one continuous run.",
  "program_editor.soak_pause": "Soak pause",
  "program_editor.soak_pause_hint": "Minutes to wait between runs. Needs a maximum run length to have any effect.",
  "program_editor.volume_safety_timeout": "Volume safety timeout",
  "program_editor.volume_safety_timeout_hint": "Minutes after which a volume-target run stops even if the meter has not reached the target.",
  "settings.advanced_note": "Advanced parameters (engine, safety, notifications) live in Settings"
}, ui = {
  // Messaggi a livello di scheda
  "card.name": "Scheda Irrigation Maestro",
  "card.description": "Panoramica e controllo dell'integrazione Irrigation Maestro: bilancio idrico, zone, coda e curve.",
  "card.not_installed": "Irrigation Maestro non è installato o non ha ancora creato entità. Configura prima l'integrazione.",
  "card.no_zones": "Nessuna zona configurata. Aggiungi le zone dalle opzioni dell'integrazione Irrigation Maestro.",
  "card.unavailable": "non disponibile",
  // Pannello (barra laterale)
  "panel.title": "Irrigazione",
  "panel.no_zones": "Nessuna zona configurata. Aggiungi le zone dalle opzioni dell'integrazione Irrigation Maestro.",
  "panel.no_programs": "Nessun programma configurato ancora.",
  "panel.per_day_minutes": "Durata diversa per giorno",
  "panel.minutes_value": "{min} min",
  "panel.edit_program": "Modifica",
  "panel.rename_program": "Rinomina",
  "panel.delete_program": "Elimina",
  "panel.confirm_delete_program": "Eliminare «{name}»?",
  "panel.weather_line": "Oggi ({day}) ≈ {min} min. Salta se piove.",
  "panel.pick_a_day": "Scegli almeno un giorno",
  "panel.add_program": "Aggiungi programma",
  "panel.advanced": "Impostazioni avanzate",
  "panel.heat_response": "Reattività al caldo",
  "panel.weather_temp": "meteo: {temp}°",
  "panel.budget_ok": "budget acqua OK",
  "panel.budget_low": "budget acqua basso",
  "panel.config_read_failed": "Impossibile leggere la configurazione attuale.",
  "panel.saved_settings": "Impostazioni salvate",
  "panel.saved_zone": "Zona salvata",
  "panel.removed_zone": "Zona eliminata",
  "program.duplicate": "Duplica",
  "program.duplicate_done": "Programma duplicato",
  // Editor programma (pannello)
  "program_editor.days": "Giorni",
  "program_editor.start": "Orario di partenza",
  "program_editor.start_fixed": "Ora fissa",
  "program_editor.start_sunrise": "Alba",
  "program_editor.start_sunset": "Tramonto",
  "program_editor.duration_per_day": "Durata per giorno",
  "program_editor.same_duration": "Stessa durata per tutti i giorni",
  "program_editor.zone_adjustment_note": "Questa zona irriga al {pct}% dell'impostazione di ogni programma.",
  // Wizard "nuovo programma" (pannello)
  "wizard.step1_title": "In che giorni?",
  "wizard.step2_title": "Quando parte?",
  "wizard.step3_title": "Per quanto tempo?",
  "wizard.preset_every_day": "Ogni giorno",
  "wizard.preset_alternate": "Giorni alterni",
  "wizard.preset_weekend": "Solo weekend",
  "wizard.done_prefix": "✓ Fatto!",
  "wizard.back": "Indietro",
  "wizard.next": "Avanti",
  "wizard.finish": "Fatto",
  // Intestazione
  "header.water_budget": "Budget idrico",
  "header.skip_threshold": "Soglia di salto",
  "header.weighted_temp": "Temperatura pesata",
  "header.session": "Sessione",
  "header.global_pause": "In pausa globale",
  "header.stale_weather": "Dati meteo non aggiornati",
  "header.consumption_left": "Acqua residua",
  // L'ambito hub: acqua su un flussometro che non appartiene a una sola zona.
  // Non c'è nessuna zona da nominare, ed è proprio per questo che l'hub ha un
  // allarme suo.
  "header.leak": "Perdita nell'impianto",
  // Stati sessione
  "session.idle": "Inattiva",
  "session.evaluating": "In valutazione",
  "session.running": "In corso",
  // Stati zona
  "zone_state.idle": "Inattiva",
  "zone_state.queued": "In coda",
  "zone_state.watering": "In irrigazione",
  "zone_state.soaking": "In assorbimento",
  "zone_state.paused": "In pausa",
  "zone_state.suspended": "Sospesa",
  "zone_state.disabled": "Disabilitata",
  // Stati ultimo esito (riferiti al "programma", maschile)
  "outcome.completed": "Completato",
  "outcome.skipped": "Saltato",
  "outcome.interrupted": "Interrotto",
  "outcome.cancelled": "Annullato",
  "outcome.none": "Nessuna irrigazione finora",
  // Motivi di salto / esito
  "reason.out_of_season": "Fuori stagione",
  "reason.precipitation": "Precipitazioni sufficienti",
  "reason.frost_risk": "Rischio di gelo",
  "reason.cold_day": "Giornata troppo fredda",
  "reason.wind": "Troppo vento",
  "reason.budget_sufficient": "Budget idrico sufficiente",
  "program_editor.calendar": "Calendario",
  "program_editor.season": "Stagione (vuoto = come impostato nell'hub)",
  "reason.calendar_not_today": "Non è un giorno di irrigazione",
  "program.toggle_unavailable": "Interruttore non disponibile",
  "reason.not_due": "Non ancora in programma",
  "reason.calendar_restricted": "Limitazione di calendario",
  "reason.zone_disabled": "Zona disabilitata",
  "reason.cycle_disabled": "Programma disabilitato",
  "reason.suspended": "Zona sospesa",
  "reason.paused": "In pausa",
  "reason.manual_stop_block": "Bloccata dopo un arresto manuale",
  "reason.session_overrun": "Sessione oltre il tempo massimo",
  "reason.weather_unavailable": "Dati meteo non disponibili",
  "reason.skip_today_requested": "Salto richiesto per oggi",
  "reason.day_not_scheduled": "Non previsto oggi",
  "reason.consumption_budget": "Budget di consumo raggiunto",
  "reason.valves_busy": "Valvole occupate",
  "reason.valve_unavailable": "Valvola non disponibile",
  "reason.open_failed": "Apertura della valvola non riuscita",
  "reason.foreign_valve_open": "Un'altra valvola è già aperta",
  "reason.manual_intervention": "Intervento manuale",
  "reason.no_flow": "Nessun flusso d'acqua rilevato",
  "reason.flow_out_of_range": "Flusso fuori dai limiti",
  "reason.close_failed": "Chiusura della valvola non riuscita",
  "reason.leak": "Bloccata da un allarme perdita",
  "reason.no_water_supply": "Mancanza d'acqua",
  "reason.watchdog": "Chiusa dal watchdog di sicurezza",
  "reason.zone_removed": "Zona rimossa",
  "reason.shutdown": "Integrazione arrestata",
  "reason.cancelled": "Annullato",
  // Funzionalità degradate
  "degraded.switch_valve": "Valvola senza conferma di posizione",
  "degraded.no_flow_meter": "Nessun flussometro",
  "degraded.flow_unit_unknown": "Unità del flussometro sconosciuta",
  "degraded.line_meter_shared": "Flussometro di linea condiviso",
  "degraded.no_hourly_forecast": "Nessuna previsione oraria",
  "degraded.volume_mode_unavailable": "Modalità a volume non disponibile",
  "degraded.leak_sensor_missing": "Il sensore di perdita scelto non esiste più",
  "degraded.water_supply_sensor_missing": "Il sensore di mancanza d'acqua scelto non esiste più",
  // Diagnosi, mai allarmi: «non ha potuto controllare», non «è guasta» e non
  // «perde». Una valvola tenuta aperta fuori dall'integrazione si legge così,
  // e un pomeriggio di innaffiature a mano è del tutto innocuo.
  "degraded.leak_never_observable": "Questa zona non ha potuto controllare le perdite",
  "degraded.leak_evidence_unresolved": "Questa zona non riesce a concludere su una possibile perdita",
  // Origini della perdita, come le pubblicano `zone_leak`/`hub_leak`.
  // Osservazioni, non conclusioni: su questo hardware un sensore «moisture»
  // dice «è passata acqua mentre ero chiusa», non «c'è acqua per terra».
  "leak_source.valve_sensor": "il sensore della valvola segnala una perdita",
  "leak_source.no_flow_closed": "acqua misurata con tutte le valvole chiuse",
  // Righe zona
  "zone.next_run": "Prossima irrigazione",
  "zone.no_next_run": "Nessuna irrigazione programmata",
  "zone.last_outcome": "Ultimo esito",
  "zone.suspended_until": "Sospesa fino al {date}",
  "zone.remaining": "{minutes} min rimanenti",
  "zone.cycles": "Programmi",
  "zone.no_cycles": "Nessun programma configurato",
  "zone.cycle_enabled": "Abilitato",
  "zone.cycle_disabled": "Disabilitato",
  "zone.water_estimated": "stimato",
  "zone.water_today": "oggi",
  "zone.water_month": "questo mese",
  "zone.leak_alarm": "Perdita",
  // `since` è il momento della CONFERMA — quando le prove si sono chiuse, non
  // quando l'acqua ha iniziato a uscire. Mai «perde da…».
  "zone.leak_confirmed_at": "Confermata {when}",
  "zone.leak_checking": "Controllo perdite non ancora concluso",
  // Il nome dice ciò che la capability misura davvero: il SENSORE di perdita.
  // Una zona con flussometro proprio resta coperta dal flussometro anche
  // quando qui c'è «non disponibile», quindi non si può scrivere «rilevamento
  // perdite disattivo».
  "zone.leak_unavailable": "Nessun sensore di perdita",
  "zone.leak_candidate": "Il dispositivo di questa valvola offre un sensore di perdita",
  "zone.supply_unavailable": "Nessun sensore di mancanza d'acqua",
  "zone.supply_candidate": "Il dispositivo di questa valvola offre un sensore di mancanza d'acqua",
  // Trigger dei cicli
  "trigger.sunrise": "Alba",
  "trigger.sunset": "Tramonto",
  "trigger.at": "Alle {time}",
  // Curve
  "curve.clamp_min": "min",
  "curve.clamp_max": "max",
  "curve.unit_duration": "min",
  "curve.unit_volume": "L",
  "curve.copy_from": "Copia curva da…",
  "curve.copy_placeholder": "Scegli un programma…",
  "curve.copy_error": "Nessun altro programma da cui copiare una curva, per ora.",
  // Coda
  "queue.title": "Coda",
  "queue.duration": "{minutes} min",
  "queue_state.pending": "In attesa",
  "queue_state.running": "In corso",
  "queue_state.done": "Completata",
  // Comandi
  "controls.run_now": "Avvia ora",
  "controls.skip_today": "Salta oggi",
  "controls.pause_for": "Pausa…",
  "controls.hours": "{hours} h",
  "controls.resume": "Riprendi",
  "controls.suspend_until": "Sospendi fino a…",
  "controls.enable": "Abilita",
  "controls.disable": "Disabilita",
  "controls.run_all": "Avvia tutte",
  "controls.stop_all": "Ferma tutto",
  "controls.confirm_stop_all": "Fermare subito tutta l'irrigazione?",
  "controls.evaluate_now": "Valuta ora",
  "controls.pause_global": "Metti in pausa tutto",
  "controls.resume_global": "Riprendi tutto",
  // Editor (configurazione scheda)
  "card_editor.title": "Titolo",
  "card_editor.title_placeholder": "Titolo della scheda (facoltativo)",
  "editor.show_header": "Mostra intestazione",
  "editor.show_queue": "Mostra la coda durante l'esecuzione",
  "editor.show_controls": "Mostra comandi",
  "editor.compact": "Layout compatto",
  "editor.zones": "Zone",
  "editor.zones_hint": "Seleziona le zone da mostrare. Lascia tutto deselezionato per mostrarle tutte.",
  "editor.no_zones": "Nessuna zona rilevata al momento.",
  // Editor curva
  "editor.edit_curve": "Modifica curva",
  "editor.title": "Quanto irrigare in base al caldo",
  "editor.graph.caption": "La curva che stai disegnando — la fascia evidenziata è l'intervallo minimo/massimo che la limita",
  "editor.graph.today": "oggi {temp}°",
  "editor.graph.adjustment_note": "Questo grafico mostra la curva in sé, non modificata. I valori qui sotto mostrano quanto irrigherà davvero questa zona, al {pct}% di essa.",
  "editor.preview_title": "Anteprima alle temperature di riferimento",
  "editor.today": "🌡️ Con il meteo di oggi (temperatura pesata {temp}°) darebbe ≈ {value} {unit}.",
  "editor.points_title": "Punti",
  "editor.point_temp": "Temperatura (°C)",
  "editor.point_value": "Valore",
  "editor.point_add": "Aggiungi un punto dopo questo",
  "editor.point_remove": "Rimuovi questo punto",
  "editor.kind_label": "Questa curva misura",
  "editor.kind_duration": "Durata (minuti)",
  "editor.kind_volume": "Volume (litri)",
  "editor.min.label": "⬇️ Mai meno di",
  "editor.min.help": "Minimo assoluto, applicato dopo la curva ed eventuali variazioni d'intensità.",
  "editor.max.label": "⬆️ Mai più di",
  "editor.max.help": "Massimo assoluto, applicato dopo la curva ed eventuali variazioni d'intensità.",
  "editor.intensity_reset": "Salvare qui una curva modificata riporta l'intensità di irrigazione di questo programma — comprese eventuali quantità per singolo giorno — ai valori della curva stessa.",
  "editor.curve_empty": "La curva deve avere almeno un punto.",
  "editor.curve_negative_value": "Nessun punto può avere un valore negativo.",
  "editor.curve_temps_not_increasing": "Le temperature devono essere strettamente crescenti da sinistra a destra.",
  "editor.min_above_max": "Il minimo non può essere superiore al massimo.",
  "editor.negative_clamp": "Il minimo non può essere negativo.",
  "editor.save": "Salva",
  "editor.cancel": "Annulla",
  "editor.saved": "Curva aggiornata.",
  "editor.save_error": "Non è stato possibile salvare la curva: {error}",
  "editor.volume_note": "Questo programma usa una curva a volume (litri) — modificane i punti nelle Impostazioni avanzate qui sotto.",
  // Editor zona (pannello)
  "zone.add": "Aggiungi zona",
  "zone.edit": "Modifica zona",
  "zone.delete": "Elimina zona",
  "zone.field_name": "Nome",
  "zone.field_valve": "Valvola",
  "zone.field_area": "Area (m²)",
  "zone.advanced": "Avanzate",
  "zone.field_flow_sensor": "Flussometro",
  "zone.field_flow_unit": "Unità del flussometro",
  "zone.flow_unit_auto": "Rilevata dall'entità",
  "zone.flow_unit_from_override": "Uso {unit} — l'hai impostata tu, e vince sull'entità",
  "zone.flow_unit_from_entity": "Uso {unit}, dichiarata dall'entità",
  "zone.flow_unit_unknown": "Nessuna unità utilizzabile: le letture sono ignorate finché non ne imposti una",
  "zone.field_flow_nominal": "Portata nominale (L/min)",
  "zone.field_flow_tolerance": "Tolleranza di portata (%)",
  "zone.field_adjustment": "Correzione (%)",
  "zone.field_order": "Ordine",
  "zone.field_interval": "Intervallo di irrigazione (giorni)",
  "zone.field_season": "Deroga ai mesi della stagione",
  "zone.field_group": "Gruppo di compatibilità",
  "zone.field_leak_sensor": "Sensore di perdita",
  "zone.field_water_supply_sensor": "Sensore di mancanza d'acqua",
  "zone.sensor_detected": "Trovato sul dispositivo di questa valvola: {entity}",
  "zone.leak_sensor_none": "Il dispositivo di questa valvola non offre un sensore di perdita. Puoi comunque sceglierne uno altrove: una sonda nell'aiuola è una scelta legittima e voluta.",
  "zone.water_supply_none": "Il dispositivo di questa valvola non offre un sensore di mancanza d'acqua. Puoi comunque sceglierne uno altrove.",
  // La polarità è invertita rispetto al nome del campo, e capirla al
  // contrario bloccherebbe ogni ciclo invece di nessuno.
  "zone.water_supply_polarity": "È un sensore di tipo «problema»: on significa che l'acqua NON c'è.",
  // Vista impostazioni (pannello)
  "settings.title": "Impostazioni",
  "settings.weather": "Meteo e sensori",
  "settings.weather_entity": "Entità meteo",
  "settings.rain": "Sensore pioggia",
  "settings.outdoor_temp": "Sensore temperatura esterna",
  "settings.line_flow": "Flussometro di linea",
  "settings.field_line_flow_unit": "Unità del flussometro di linea",
  "settings.master_valve": "Valvola principale",
  "settings.clear": "Rimuovi",
  "settings.budget": "Budget consumo",
  "settings.liters": "Litri al mese",
  "settings.on_exceed": "Al superamento",
  "settings.action_notify": "Notifica",
  "settings.action_reduce": "Riduci",
  "settings.action_suspend": "Sospendi",
  "settings.reduce_pct": "Percentuale di riduzione",
  "settings.restrictions": "Restrizioni calendario",
  "settings.allowed_days": "Giorni consentiti",
  "settings.parity_all": "Tutti",
  "settings.parity_odd": "Dispari",
  "settings.parity_even": "Pari",
  "settings.restrictions_hours_only": "Solo fasce orarie vietate. I giorni in cui una zona irriga si impostano nel calendario di ogni programma.",
  "settings.forbidden_windows": "Finestre vietate",
  "settings.notifications": "Notifiche",
  // Procedura guidata notifiche (pannello)
  "notify.loading": "Lettura dello stato delle notifiche…",
  "notify.load_failed": "Non è stato possibile leggere lo stato delle notifiche.",
  "notify.retry": "Riprova",
  "notify.mute_title": "Non riceverai nessuna notifica",
  "notify.mute_body": "Nessun evento essenziale arriva a qualcuno: una chiusura forzata, un'anomalia, un'irrigazione interrotta, un programma mancato o una perdita d'acqua passerebbero inosservati.",
  "notify.partial_body": "Questi eventi essenziali non ti arriveranno: {events}.",
  "notify.configure": "Configura ora",
  "notify.step_recipients": "Chi le riceve",
  "notify.step_events": "Cosa inviare",
  "notify.step_summary": "Conferma",
  "notify.no_recipients": "Questa istanza non ha ancora nessun servizio notify. Configurane uno — l'app companion, Telegram, l'e-mail — e comparirà qui.",
  "notify.recipient_gone": "non esiste più",
  "notify.recipient_gone_hint": "Un destinatario indicato come non più esistente resta memorizzato e viene riscritto a ogni salvataggio. Deselezionalo per rimuoverlo.",
  "notify.send_test": "Invia prova",
  "notify.test_sending": "Invio in corso",
  "notify.test_ok": "Inviata",
  "notify.test_failed": "Non consegnata: {error}",
  "notify.test_no_result": "nessun risultato ricevuto",
  "notify.preset_recommended": "Consigliato",
  "notify.preset_critical": "Solo critici",
  "notify.preset_all": "Tutto",
  "notify.group_critical": "Critici",
  "notify.group_operational": "Operativi",
  "notify.group_informational": "Informativi",
  "notify.priority_high": "Alta",
  "notify.priority_normal": "Normale",
  "notify.needs_recipient": "Scegli almeno un destinatario prima di attivare un evento.",
  "notify.back": "Indietro",
  "notify.next": "Avanti",
  "notify.save": "Salva",
  "notify.test_title": "Irrigation Maestro",
  "notify.test_message": "Notifica di prova. Se riesci a leggere questo messaggio, il destinatario funziona.",
  "notify.event_watchdog": "Watchdog",
  "notify.event_anomaly": "Anomalia",
  "notify.event_leak": "Perdita d'acqua",
  "notify.event_skipped": "Ciclo saltato",
  "notify.event_interrupted": "Ciclo interrotto",
  "notify.event_cancelled": "Ciclo annullato",
  "notify.event_completed": "Ciclo completato",
  "notify.event_sentinel": "Sentinella",
  "notify.event_session_overrun": "Sessione troppo lunga",
  "notify.event_consumption_budget": "Budget consumo",
  "settings.session_safety": "Avanzate: sessione e sicurezza",
  "settings.valves_concurrency": "Avanzate: valvole e concorrenza",
  "settings.session_max_min": "Durata massima della sessione",
  "settings.session_max_min_hint": "Minuti. Ciò che resta in coda oltre questo limite viene saltato. Vuoto = nessun limite.",
  "settings.must_finish_by": "Deve finire entro",
  "settings.must_finish_by_hint": "Ora locale. Vuoto = nessuna scadenza.",
  "settings.wait_free_min": "Attesa valvole libere",
  "settings.wait_free_min_hint": "Minuti di attesa per una valvola occupata prima di annullare la corsa. Default 5.",
  "settings.manual_block_min": "Blocco dopo stop manuale",
  "settings.manual_block_min_hint": "Minuti in cui le corse programmate restano bloccate dopo uno stop manuale. Default 30.",
  "settings.settle_pause_s": "Pausa di assestamento",
  "settings.settle_pause_s_hint": "Secondi fra la chiusura di una zona e l'apertura della successiva. Default 60.",
  "settings.sentinel_time": "Orario sentinella",
  "settings.sentinel_time_hint": "Ora locale del controllo giornaliero che ogni programma previsto abbia lasciato traccia. Default 23:30.",
  "settings.open_confirm_s": "Conferma apertura",
  "settings.open_confirm_s_hint": "Secondi di attesa perché una valvola risulti aperta. Default 10.",
  "settings.close_confirm_s": "Conferma chiusura",
  "settings.close_confirm_s_hint": "Secondi di attesa perché una valvola risulti chiusa. Default 15.",
  "settings.switch_confirm_s": "Conferma switch",
  "settings.switch_confirm_s_hint": "Secondi per le valvole su switch, che non riportano posizione. Default 8.",
  "settings.startup_valve_timeout_s": "Timeout chiusura all'avvio",
  "settings.startup_valve_timeout_s_hint": "Secondi concessi alla chiusura di tutte le valvole all'avvio. Default 30.",
  "settings.watchdog_max_min": "Massimo watchdog",
  "settings.watchdog_max_min_hint": "Minuti dopo i quali il watchdog forza la chiusura di una valvola. Default 45.",
  "settings.max_concurrent": "Zone contemporanee",
  "settings.max_concurrent_hint": "Quante zone possono irrigare insieme. Default 1.",
  "settings.compatibility_groups": "Gruppi di compatibilità",
  "settings.compatibility_groups_hint": "Nomi di gruppo separati da virgola le cui zone possono irrigare insieme.",
  "settings.master_pre_open_s": "Pre-apertura master",
  "settings.master_pre_open_s_hint": "Secondi di anticipo con cui la valvola master apre. Default 0.",
  "settings.master_post_close_s": "Post-chiusura master",
  "settings.master_post_close_s_hint": "Secondi in cui la valvola master resta aperta dopo la zona. Default 0.",
  "settings.leak_action": "Con una perdita confermata",
  "settings.leak_action_hint": "Cosa fare quando una perdita è confermata. Richiudere una valvola già chiusa non fa nulla: recupera una valvola rimasta aperta per un comando perso, e in caso di falso allarme non lascia nulla a secco. Default: notifica e richiude.",
  "settings.leak_action_notify": "Solo notifica",
  "settings.leak_action_close": "Notifica e richiude le valvole",
  "settings.leak_action_close_and_block": "Notifica, richiude e blocca i nuovi cicli",
  "settings.leak_threshold_lpm": "Soglia di perdita",
  "settings.leak_threshold_lpm_hint": "Litri al minuto misurati con tutte le valvole chiuse perché contino come perdita. Default 0,5.",
  "settings.leak_confirm_s": "Conferma della perdita",
  "settings.leak_confirm_s_hint": "Secondi per cui le prove devono durare prima che scatti l'allarme. Ogni entità di perdita resta non disponibile finché il suo ambito non è stato osservato altrettanto a lungo, quindi alzarlo rimanda anche la prima risposta. Default 300.",
  "settings.leak_repeat_min": "Promemoria della perdita",
  "settings.leak_repeat_min_hint": "Minuti fra un promemoria e l'altro finché l'allarme dura. 0 li disattiva senza toccare l'allarme. Default 360.",
  "settings.require_water_supply": "Non partire senza acqua",
  "settings.require_water_supply_hint": "Rifiuta l'avvio di un ciclo finché il sensore della zona segnala che l'acqua manca. La notifica e la segnalazione di riparazione arrivano comunque: questa impostazione governa il rifiuto, non l'avviso.",
  "settings.water_supply_confirm_s": "Conferma della mancanza d'acqua",
  "settings.water_supply_confirm_s_hint": "Secondi per cui la mancanza deve durare prima che un avvio venga rifiutato e parta l'avviso. Non ritarda mai la diagnosi di un'irrigazione già interrotta. Default 180.",
  "program_editor.soak_max_run": "Durata massima per corsa",
  "program_editor.soak_max_run_hint": "Minuti. Divide l'irrigazione in corse più brevi perché il terreno assorba fra una e l'altra. Vuoto = una corsa continua.",
  "program_editor.soak_pause": "Pausa di ammollo",
  "program_editor.soak_pause_hint": "Minuti di attesa fra una corsa e l'altra. Senza una durata massima per corsa non ha alcun effetto.",
  "program_editor.volume_safety_timeout": "Timeout di sicurezza volumetrico",
  "program_editor.volume_safety_timeout_hint": "Minuti dopo i quali una corsa a volume si ferma anche se il flussometro non ha raggiunto il target.",
  "settings.advanced_note": "Parametri avanzati (motore, sicurezza, notifiche) → Impostazioni"
}, qe = {
  en: ae,
  it: ui
};
function k(n) {
  const t = (n?.locale?.language ?? n?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in qe ? t : "en";
}
function pi(n, e) {
  return e ? n.replace(/\{(\w+)\}/g, (t, i) => {
    const s = e[i];
    return s === void 0 ? t : String(s);
  }) : n;
}
function r(n, e, t) {
  const i = qe[n] ?? ae;
  return pi(i[e] ?? ae[e], t);
}
function _i(n, e, t) {
  const i = `${e}.${t}`, s = qe[n] ?? ae, o = ae;
  return s[i] ?? o[i] ?? t;
}
function hi(n, e = 1) {
  const t = v(n);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (i) => e > 0 ? "" : i);
}
function mi(n) {
  const e = Math.abs(Math.round(n)), t = Math.floor(e / 3600), i = Math.round(e % 3600 / 60), s = [];
  return t > 0 && s.push(`${t} h`), i > 0 && s.push(`${i} min`), s.length === 0 && s.push(`${e} s`), s.join(" ");
}
function vi(n, e) {
  if (!n || typeof n != "object") return "";
  if (n.kind === "sun" && (n.event === "sunrise" || n.event === "sunset")) {
    const i = r(
      e,
      n.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), s = v(n.offset_s) ?? 0;
    if (s === 0) return i;
    const o = s < 0 ? "−" : "+";
    return `${i} ${o} ${mi(s)}`;
  }
  const t = N(n.at) ?? N(n.time);
  return t ? r(e, "trigger.at", { time: t }) : N(n.kind) ?? "";
}
const fi = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_leak: "leak",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, gi = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_water_total: "zone_water_total",
  zone_leak: "leak",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function yi(n) {
  const e = {}, t = /* @__PURE__ */ new Map(), i = [];
  for (const o of Object.values(n.states)) {
    const a = N(o.attributes.maestro_role);
    if (!a) continue;
    i.push(o.entity_id);
    const d = N(o.attributes.zone_id);
    if (d) {
      let u = t.get(d);
      if (u || (u = {
        zoneId: d,
        name: d,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(d, u)), a === "cycle_enabled")
        u.cycleSwitches.push(o);
      else {
        const _ = gi[a];
        _ && (u[_] = o);
      }
    } else {
      const u = fi[a];
      u && (e[u] = o);
    }
  }
  const s = [...t.values()];
  for (const o of s) {
    const a = o.state?.attributes ?? {};
    o.name = N(a.zone_name) ?? N(o.state?.attributes.friendly_name) ?? o.zoneId, o.order = v(a.order) ?? v(o.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return s.sort(
    (o, a) => o.order - a.order || o.name.localeCompare(a.name)
  ), { found: i.length > 0, hub: e, zones: s, entityIds: i };
}
function bi(n) {
  return pe(n.state) ? !1 : !St(n.state?.attributes?.degraded).some((t) => N(t) === "no_flow_meter");
}
function Ae(n) {
  return v(n.state?.attributes?.adjustment_pct) ?? 100;
}
function wi(n, e, t, i) {
  const s = [];
  for (const o of n)
    for (const a of At(o))
      a.cycle_id && (o.zoneId === e && a.cycle_id === t || !i && a.curve?.kind === "volume" || s.push({
        value: `${o.zoneId}:${a.cycle_id}`,
        zoneId: o.zoneId,
        programId: a.cycle_id,
        label: `${o.name} / ${a.name ?? a.cycle_id}`
      }));
  return s;
}
function At(n) {
  const e = St(n.state?.attributes?.cycles), t = [];
  for (const i of e) {
    if (typeof i != "object" || i === null) continue;
    const s = i, o = {
      cycle_id: N(s.cycle_id),
      name: N(s.name),
      enabled: typeof s.enabled == "boolean" ? s.enabled : void 0,
      trigger: s.trigger ?? void 0,
      curve: s.curve ?? void 0
    }, a = s.calendar;
    a && typeof a == "object" && (o.calendar = a);
    const d = s.season_months;
    Array.isArray(d) && (o.season_months = d.map((_) => v(_)).filter((_) => _ !== void 0)), o.soak_max_run_min = v(s.soak_max_run_min), o.soak_pause_min = v(s.soak_pause_min), o.volume_safety_timeout_min = v(s.volume_safety_timeout_min), o.intensity_pct = v(s.intensity_pct);
    const u = s.day_intensity_pct;
    if (u && typeof u == "object") {
      const _ = {};
      for (const [g, m] of Object.entries(u)) {
        const S = v(m);
        S !== void 0 && (_[g] = S);
      }
      o.day_intensity_pct = _;
    }
    t.push(o);
  }
  return t;
}
function de(n) {
  const e = Math.floor(n), t = n - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function be(n) {
  if (!Array.isArray(n)) return [];
  const e = [];
  for (const t of n) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const i = v(t[0]), s = v(t[1]);
    i !== void 0 && s !== void 0 && e.push([i, s]);
  }
  return [...e].sort((t, i) => t[0] - i[0]);
}
const we = 25, $i = [5, 12, 20, 25, 30, 35, 40];
function We(n, e) {
  const t = n[0], i = n[n.length - 1];
  if (!t || !i) return 0;
  if (e <= t[0]) return t[1];
  if (e >= i[0]) return i[1];
  for (let s = 0; s < n.length - 1; s++) {
    const o = n[s], a = n[s + 1];
    if (!o || !a) continue;
    const [d, u] = o, [_, g] = a;
    if (d <= e && e <= _) return u + (g - u) * (e - d) / (_ - d);
  }
  return i[1];
}
function $e(n, e, t = 100, i, s) {
  let o = We(n, e) * t / 100;
  return i !== void 0 && (o = Math.max(o, i)), s !== void 0 && (o = Math.min(o, s)), o;
}
function xi(n, e, t, i, s, o = 100) {
  const a = We(n, we);
  if (a <= 0) return 0;
  const u = 100 * e / a * o / 100;
  return de($e(n, t, u, i, s));
}
function ki(n) {
  if (n.length === 0) return "curve_empty";
  for (const e of n)
    if (e[1] < 0) return "curve_negative_value";
  for (let e = 1; e < n.length; e++) {
    const t = n[e - 1], i = n[e];
    if (!(!t || !i) && i[0] <= t[0])
      return "curve_temps_not_increasing";
  }
  return null;
}
const Te = [0, 1, 2, 3, 4, 5, 6], ct = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
};
function zi(n) {
  return ct[n] ?? ct.en;
}
function Et(n) {
  return !n || Object.keys(n).length === 0;
}
function Mt(n, e) {
  return n.day_intensity_pct?.[String(e)] ?? n.intensity_pct ?? 100;
}
function ce(n, e) {
  const t = be(n.curve?.points);
  return de(
    $e(t, we, Mt(n, e), n.curve?.min, n.curve?.max)
  );
}
function Si(n, e, t) {
  const i = be(n.curve?.points), s = Mt(n, e) * t / 100;
  return de($e(i, we, s, n.curve?.min, n.curve?.max));
}
function Ct(n, e, t, i = 100) {
  const s = be(n.curve?.points);
  return xi(
    s,
    e,
    t,
    n.curve?.min,
    n.curve?.max,
    i
  );
}
function Ai(n, e, t, i, s, o) {
  if (n !== e) return !0;
  if (n) return i !== t;
  const a = /* @__PURE__ */ new Set([...Object.keys(s), ...Object.keys(o)]);
  for (const d of a)
    if (s[d] !== o[d]) return !0;
  return !1;
}
var Ei = Object.defineProperty, Mi = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, a; o >= 0; o--)
    (a = n[o]) && (s = a(e, t, s) || s);
  return s && Ei(e, t, s), s;
};
const Ne = [0, 1, 2, 3, 4, 5, 6], Pt = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"], Ie = 1, Tt = 60;
function ve(n) {
  const e = { mode: "weekdays", days: [...Ne] };
  if (!n) return e;
  if (n.mode === "interval") {
    const t = Number(n.interval_days) || Ie;
    return {
      mode: "interval",
      interval_days: Math.min(Math.max(Math.round(t), Ie), Tt)
    };
  }
  if (n.mode === "parity")
    return { mode: "parity", parity: n.parity === "even" ? "even" : "odd" };
  if (n.mode === "weekdays") {
    const t = [...new Set(n.days ?? [])].sort((i, s) => i - s);
    return t.length === 0 ? e : { mode: "weekdays", days: t };
  }
  return e;
}
function Ci(n) {
  const e = ve(n);
  return e.mode === "interval" ? e.interval_days === 1 ? "Ogni giorno" : `Ogni ${e.interval_days} giorni` : e.mode === "parity" ? e.parity === "odd" ? "Giorni dispari" : "Giorni pari" : e.days.length >= 7 ? "Ogni giorno" : e.days.map((t) => Pt[t]).join(", ");
}
const Ze = class Ze extends P {
  get _value() {
    return ve(this.calendar);
  }
  _emit(e) {
    this.dispatchEvent(
      new CustomEvent("imc-calendar-change", {
        detail: { calendar: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  /** Switching mode replaces the object; nothing carries over. */
  _selectMode(e) {
    this._value.mode !== e && (e === "interval" ? this._emit({ mode: "interval", interval_days: 3 }) : e === "parity" ? this._emit({ mode: "parity", parity: "odd" }) : this._emit({ mode: "weekdays", days: [...Ne] }));
  }
  _toggleDay(e) {
    const t = this._value;
    if (t.mode !== "weekdays") return;
    const i = t.days.includes(e) ? t.days.filter((s) => s !== e) : [...t.days, e].sort((s, o) => s - o);
    i.length !== 0 && this._emit({ mode: "weekdays", days: i });
  }
  _setInterval(e) {
    this._emit(ve({ mode: "interval", interval_days: Number(e) }));
  }
  _renderBody(e) {
    return e.mode === "interval" ? l`
        <div class="interval">
          <label for="imc-interval">Ogni</label>
          <input
            id="imc-interval"
            type="number"
            min="${Ie}"
            max="${Tt}"
            .value=${String(e.interval_days)}
            @change=${(t) => this._setInterval(t.target.value)}
          />
          <span>giorni</span>
        </div>
        <div class="hint">Il conteggio riparte dal giorno in cui il programma ha irrigato.</div>
      ` : e.mode === "parity" ? l`
        <div class="chips">
          ${["odd", "even"].map(
      (t) => l`
              <button
                type="button"
                class="chip"
                aria-pressed=${e.parity === t}
                @click=${() => this._emit({ mode: "parity", parity: t })}
              >
                ${t === "odd" ? "Giorni dispari" : "Giorni pari"}
              </button>
            `
    )}
        </div>
        <div class="hint">Segue il giorno del mese, come le ordinanze comunali pari/dispari.</div>
      ` : l`
      <div class="chips">
        ${Ne.map(
      (t) => l`
            <button
              type="button"
              class="chip"
              aria-pressed=${e.days.includes(t)}
              @click=${() => this._toggleDay(t)}
            >
              ${Pt[t]}
            </button>
          `
    )}
      </div>
    `;
  }
  render() {
    const e = this._value;
    return l`
      <div class="modes" role="group" aria-label="Modalità del calendario">
        ${[
      ["weekdays", "Giorni della settimana"],
      ["interval", "Ogni N giorni"],
      ["parity", "Pari/dispari"]
    ].map(
      ([i, s]) => l`
            <button
              type="button"
              aria-pressed=${e.mode === i}
              @click=${() => this._selectMode(i)}
            >
              ${s}
            </button>
          `
    )}
      </div>
      ${this._renderBody(e)}
    `;
  }
};
Ze.styles = O`
    :host {
      display: block;
    }
    .modes {
      display: flex;
      gap: 4px;
      background: var(--secondary-background-color, #f1f1f1);
      border-radius: 10px;
      padding: 4px;
      margin-bottom: 12px;
    }
    .modes button {
      flex: 1;
      border: none;
      background: transparent;
      border-radius: 8px;
      padding: 8px 6px;
      font: inherit;
      font-size: 0.9em;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .modes button[aria-pressed="true"] {
      background: var(--card-background-color, #fff);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      border: 1px solid var(--divider-color, #ddd);
      background: transparent;
      border-radius: 999px;
      padding: 6px 12px;
      font: inherit;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .chip[aria-pressed="true"] {
      background: var(--primary-color, #03a9f4);
      border-color: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .interval {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .interval input {
      width: 5em;
      padding: 8px;
      font: inherit;
      border: 1px solid var(--divider-color, #ddd);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
    }
    .hint {
      margin-top: 8px;
      font-size: 0.85em;
      color: var(--secondary-text-color, #666);
    }
  `;
let fe = Ze;
Mi([
  h({ attribute: !1 })
], fe.prototype, "calendar");
L("imc-calendar-editor", fe);
const Pi = /* @__PURE__ */ new Set(["unavailable", "unknown"]);
function Ti(n) {
  return !n || Pi.has(n.state) ? { on: !1, available: !1 } : { on: n.state === "on", available: !0 };
}
const Ni = O`
  .toggle-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 8px 0;
    font-size: 12.5px;
    color: var(--secondary-text-color);
    cursor: pointer;
    user-select: none;
  }
  .toggle-row[aria-disabled="true"] {
    cursor: default;
    opacity: 0.65;
  }
  .toggle-row:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 2px;
    border-radius: 4px;
  }
  .switch {
    width: 34px;
    height: 20px;
    background: var(--divider-color, #444);
    border-radius: 999px;
    position: relative;
    flex: none;
    transition: background 0.15s ease;
  }
  .switch::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--card-background-color, #fff);
    transition: transform 0.15s ease;
  }
  .switch.on {
    background: var(--primary-color, #03a9f4);
  }
  .switch.on::after {
    transform: translateX(14px);
  }
`;
function Nt(n, e, t) {
  const { on: i, available: s } = Ti(e), o = s ? r(n, i ? "zone.cycle_enabled" : "zone.cycle_disabled") : r(n, "program.toggle_unavailable"), a = () => {
    s && t();
  };
  return l`<div
    class="toggle-row"
    role="switch"
    tabindex=${s ? "0" : "-1"}
    aria-checked=${i ? "true" : "false"}
    aria-disabled=${s ? "false" : "true"}
    @click=${a}
    @keydown=${(d) => {
    (d.key === " " || d.key === "Enter") && (d.preventDefault(), a());
  }}
  >
    <span class="switch ${i ? "on" : ""}"></span>
    <span>${o}</span>
  </div>`;
}
function It(n) {
  return [...n].sort((e, t) => e[0] - t[0]);
}
function Ii(n, e) {
  const t = n[e];
  if (!t) return n;
  const i = n[e + 1], s = i ? [(t[0] + i[0]) / 2, (t[1] + i[1]) / 2] : [t[0] + 5, t[1]];
  return It([...n, s]);
}
function Oi(n, e) {
  return n.length <= 1 ? n : n.filter((t, i) => i !== e);
}
function Ee(n, e, t, i) {
  const s = [...n];
  return s[e] ? (s[e] = [t, Math.max(0, i)], s) : n;
}
function Fi(n, e) {
  return e ? n : void 0;
}
function Di(n) {
  return n.intensity_pct !== void 0 && n.intensity_pct !== 100 ? !0 : Object.keys(n.day_intensity_pct ?? {}).length > 0;
}
function Ri(n, e, t) {
  return e === 0 ? n : Math.max(0, de(n - e * t));
}
function Li(n, e, t, i, s, o) {
  const a = [...n.map((_) => _[1]), e, t], d = Math.max(12, ...a) + 4, u = i - s - o;
  return {
    top: d,
    y: (_) => i - o - _ / d * u
  };
}
var Ui = Object.defineProperty, F = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, a; o >= 0; o--)
    (a = n[o]) && (s = a(e, t, s) || s);
  return s && Ui(e, t, s), s;
};
const j = 320, Z = 170, D = 34, V = 12, te = 16, K = 24, ut = 5, pt = 40, _t = 2, Ve = class Ve extends P {
  constructor() {
    super(...arguments), this.language = "en", this.zoneHasFlowMeter = !1, this.zoneAdjustmentPct = 100, this._points = [[we, 15]], this._min = 1, this._max = 120, this._kind = "duration", this._error = null;
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = be(e?.points);
    t.length !== 0 && (this._points = t, this._min = v(e?.min) ?? 1, this._max = v(e?.max) ?? 120, this._kind = e?.kind === "volume" ? "volume" : "duration", this._error = null);
  }
  /** What this curve actually delivers IN THIS ZONE: the raw shape times
   *  `zoneAdjustmentPct`, then the clamps — same order as `curve_value`
   *  (`engine/curves.py`) and `previewMinutes`/`dayDelivery`
   *  (schedule-math.ts). Drives the preview tiles and the "today" banner,
   *  which exist to answer "what will this water", not "what shape did I
   *  draw". Saving resets the program's own intensity to 100%, so the only
   *  per-zone factor left to fold in here is the adjustment. */
  _deliveryValue(e) {
    return de($e(this._points, e, this.zoneAdjustmentPct, this._min, this._max));
  }
  _unit() {
    return r(this.language, this._kind === "volume" ? "curve.unit_volume" : "curve.unit_duration");
  }
  _axisMin() {
    return Math.min(this._points[0]?.[0] ?? ut, ut) - _t;
  }
  _axisMax() {
    const e = this._points[this._points.length - 1];
    return Math.max(e?.[0] ?? pt, pt) + _t;
  }
  _sx(e) {
    const t = this._axisMin(), i = this._axisMax();
    return D + (e - t) / (i - t) * (j - D - V);
  }
  /** The graph's vertical axis, scaled to contain every raw point AND both
   *  clamp lines — see `graphAxis`'s doc comment for why both matter. */
  _axis() {
    return Li(this._points, this._min, this._max, Z, te, K);
  }
  _sy(e) {
    return this._axis().y(e);
  }
  /** Client coordinates of a pointer event, converted into the SVG's
   *  viewBox units (0..GRAPH_H on the y-axis). */
  _pointerViewY(e, t, i) {
    const s = e.createSVGPoint();
    return s.x = i.clientX, s.y = i.clientY, s.matrixTransform(t.inverse()).y;
  }
  /**
   * A drag is RELATIVE: the point's raw value at pointerdown, and the
   * pointer's own y at pointerdown, are both captured once and never
   * re-derived from the current pointer position. Every subsequent move
   * only ever applies `dragValue`'s delta to that frozen starting point, so
   * a drag of zero pixels leaves the point byte-identical. The handle is
   * always drawn at the point's own raw value (see `_renderGraph`), so
   * grabbing it and moving the pointer always moves it visibly — a min/max
   * clamp shades the permitted band but never repositions the handle.
   */
  _startDrag(e, t) {
    t.preventDefault();
    const i = t.currentTarget.ownerSVGElement;
    if (!i) return;
    const s = this._points[e];
    if (!s) return;
    const o = s[1], a = i.getScreenCTM();
    if (!a) return;
    const d = this._pointerViewY(i, a, t), u = this._axis().top / (Z - te - K), _ = (m) => {
      const S = i.getScreenCTM();
      if (!S) return;
      const w = this._pointerViewY(i, S, m) - d;
      this._points = Ee(
        this._points,
        e,
        s[0],
        Ri(o, w, u)
      ), this._error = null;
    }, g = () => {
      window.removeEventListener("pointermove", _), window.removeEventListener("pointerup", g);
    };
    window.addEventListener("pointermove", _), window.addEventListener("pointerup", g);
  }
  _save() {
    const e = ki(this._points) ?? (this._min > this._max ? "min_above_max" : null) ?? (this._min < 0 ? "negative_clamp" : null);
    if (e) {
      this._error = e;
      return;
    }
    this._error = null;
    const t = Fi(this._kind, this.zoneHasFlowMeter);
    this.dispatchEvent(
      new CustomEvent("imc-curve-save", {
        detail: {
          cycleId: this.cycle?.cycle_id ?? "",
          points: this._points.map((i) => [i[0], i[1]]),
          min: this._min,
          max: this._max,
          ...t !== void 0 ? { kind: t } : {}
        },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _cancel() {
    this.dispatchEvent(
      new CustomEvent("imc-curve-cancel", { bubbles: !0, composed: !0 })
    );
  }
  render() {
    const e = this.language;
    return l`
      <div class="title">${r(e, "editor.title")}</div>

      ${this._renderIntensityNotice(e)}

      <div class="graph-box">
        <div class="caption">${r(e, "editor.graph.caption")}</div>
        ${this._renderGraph(e)}
      </div>

      ${this._renderAdjustmentNote(e)}

      <div class="caption">${r(e, "editor.preview_title")}</div>
      <div class="examples">
        ${$i.map((t) => this._exampleTile(`${t}°`, this._deliveryValue(t)))}
      </div>

      ${this._renderToday(e)}

      <div class="points-title">${r(e, "editor.points_title")}</div>
      ${this._points.map((t, i) => this._renderPointRow(t, i, e))}

      ${this.zoneHasFlowMeter ? this._renderKind(e) : p}

      <div class="limits">
        <div class="limit">
          <label>${r(e, "editor.min.label")}</label>
          <div class="help">${r(e, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(t) => {
      const i = Number(t.target.value);
      Number.isNaN(i) || (this._min = i, this._error = null);
    }} /> ${this._unit()}
        </div>
        <div class="limit">
          <label>${r(e, "editor.max.label")}</label>
          <div class="help">${r(e, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(t) => {
      const i = Number(t.target.value);
      Number.isNaN(i) || (this._max = i, this._error = null);
    }} /> ${this._unit()}
        </div>
      </div>

      ${this._error ? l`<div class="error">${_i(e, "editor", this._error)}</div>` : p}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${r(e, "editor.save")}</button>
        <button @click=${this._cancel}>${r(e, "editor.cancel")}</button>
      </div>
    `;
  }
  _renderIntensityNotice(e) {
    return Di(this.cycle ?? {}) ? l`<div class="intensity-notice">
      ${r(e, "editor.intensity_reset")}
    </div>` : p;
  }
  /**
   * Explains the split this editor otherwise leaves implicit: the graph
   * above is always the curve's raw shape (100% intensity, no zone
   * adjustment); the preview tiles and "today" banner below fold in
   * `zoneAdjustmentPct`, so a 70% zone shows a graph reading 20 at 25°C
   * directly above a tile reading 14. In the panel (program-editor.ts) a
   * separate note explains the SETTING/DELIVERY split for the minutes
   * stepper; opened from the dashboard card (zone-row.ts) there is no such
   * context, so this editor carries its own explanation rather than
   * relying on the panel's. Silent at exactly 100 — a no-op adjustment has
   * nothing to explain.
   */
  _renderAdjustmentNote(e) {
    return this.zoneAdjustmentPct === 100 ? p : l`<div class="graph-note">
      ${r(e, "editor.graph.adjustment_note", { pct: this.zoneAdjustmentPct })}
    </div>`;
  }
  _renderKind(e) {
    return l`<div class="kind">
      <label for="imc-curve-kind">${r(e, "editor.kind_label")}</label>
      <select
        id="imc-curve-kind"
        .value=${this._kind}
        @change=${(t) => {
      const i = t.target.value;
      this._kind = i === "volume" ? "volume" : "duration";
    }}
      >
        <option value="duration">${r(e, "editor.kind_duration")}</option>
        <option value="volume">${r(e, "editor.kind_volume")}</option>
      </select>
    </div>`;
  }
  _exampleTile(e, t) {
    return l`<div class="example"><div class="lbl">${e}</div><div class="num">${t} ${this._unit()}</div></div>`;
  }
  _renderToday(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return p;
    const i = this._deliveryValue(t);
    return l`<div class="today-banner">${r(e, "editor.today", {
      temp: Math.round(t),
      value: i,
      unit: this._unit()
    })}</div>`;
  }
  _renderPointRow(e, t, i) {
    return l`<div class="point-row">
      <input
        type="number"
        step="0.5"
        .value=${String(e[0])}
        aria-label=${r(i, "editor.point_temp")}
        @change=${(s) => this._editPoint(t, s, "temp")}
      /> °C
      <input
        type="number"
        min="0"
        step="1"
        .value=${String(e[1])}
        aria-label=${r(i, "editor.point_value")}
        @change=${(s) => this._editPoint(t, s, "value")}
      /> ${this._unit()}
      <button
        type="button"
        ?disabled=${this._points.length <= 1}
        title=${r(i, "editor.point_remove")}
        @click=${() => this._points = Oi(this._points, t)}
      >
        ✕
      </button>
      <button
        type="button"
        title=${r(i, "editor.point_add")}
        @click=${() => this._points = Ii(this._points, t)}
      >
        ＋
      </button>
    </div>`;
  }
  _editPoint(e, t, i) {
    const s = Number(t.target.value);
    if (Number.isNaN(s)) return;
    const o = this._points[e];
    if (!o) return;
    const a = i === "temp" ? Ee(this._points, e, s, o[1]) : Ee(this._points, e, o[0], s);
    this._points = It(a), this._error = null;
  }
  /**
   * The graph draws the curve's RAW shape — `rawValue`, no intensity, no
   * clamps — because that is exactly what the handles edit; a clamped line
   * would put a handle wherever the clamp cut, not where its point's value
   * actually is, and dragging it would visibly do nothing until the raw
   * value crossed back over the clamp. `min`/`max` are drawn instead as a
   * shaded band with dashed guide lines, so where a clamp bites is shown
   * rather than implied, and the axis (`_axis`/`graphAxis`) is scaled to
   * keep both the points and the clamp lines on-screen at once.
   */
  _renderGraph(e) {
    const t = this._axisMin(), i = this._axisMax(), s = [];
    for (let w = t; w <= i; w += 1)
      s.push([this._sx(w), this._sy(We(this._points, w))]);
    const o = s.map((w, U) => `${U === 0 ? "M" : "L"}${w[0].toFixed(1)},${w[1].toFixed(1)}`).join(" "), a = this.weightedTemp, d = a !== void 0 && !Number.isNaN(a) && a >= t && a <= i, u = this._sy(this._min), _ = this._sy(this._max), g = Math.min(u, _), m = Math.abs(_ - u), S = this._unit();
    return Se`
      <svg viewBox="0 0 ${j} ${Z}">
        <rect class="clamp-band" x=${D} y=${g.toFixed(1)}
          width=${(j - D - V).toFixed(1)} height=${m.toFixed(1)}></rect>
        <line class="clamp-line" x1=${D} y1=${u.toFixed(1)} x2=${j - V} y2=${u.toFixed(1)}></line>
        <line class="clamp-line" x1=${D} y1=${_.toFixed(1)} x2=${j - V} y2=${_.toFixed(1)}></line>
        <text class="clamp-text" x=${j - V} y=${(u - 3).toFixed(1)} text-anchor="end">${r(e, "curve.clamp_min")} ${this._min} ${S}</text>
        <text class="clamp-text" x=${j - V} y=${(_ - 3).toFixed(1)} text-anchor="end">${r(e, "curve.clamp_max")} ${this._max} ${S}</text>
        <line class="axis" x1=${D} y1=${te} x2=${D} y2=${Z - K}></line>
        <line class="axis" x1=${D} y1=${Z - K} x2=${j - V} y2=${Z - K}></line>
        ${d ? Se`<line class="today" x1=${this._sx(a)} y1=${te} x2=${this._sx(a)} y2=${Z - K}></line>
              <text class="today-text" x=${this._sx(a)} y=${te - 4} text-anchor="middle">${r(e, "editor.graph.today", { temp: Math.round(a) })}</text>` : p}
        <path class="curve" d=${o}></path>
        ${this._points.map(
      (w, U) => Se`<circle class="handle" r="7"
            cx=${this._sx(w[0]).toFixed(1)} cy=${this._sy(w[1]).toFixed(1)}
            @pointerdown=${(jt) => this._startDrag(U, jt)}></circle>`
    )}
      </svg>
    `;
  }
};
Ve.styles = O`
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .title {
      font-weight: 700;
      font-size: 1.05rem;
      margin-bottom: 12px;
    }
    .graph-box {
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 10px;
      margin: 6px 0 12px;
    }
    .caption {
      font-size: 0.72rem;
      opacity: 0.6;
      margin-bottom: 4px;
    }
    svg {
      display: block;
      width: 100%;
      height: 150px;
      overflow: visible;
    }
    .axis {
      stroke: var(--secondary-text-color, #888);
      opacity: 0.4;
    }
    .clamp-band {
      fill: var(--success-color, #43a047);
      opacity: 0.08;
    }
    .clamp-line {
      stroke: var(--secondary-text-color, #727272);
      stroke-width: 1;
      stroke-dasharray: 3 3;
      opacity: 0.75;
    }
    .clamp-text {
      fill: var(--secondary-text-color, #727272);
      font-size: 9px;
    }
    .curve {
      fill: none;
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 3;
      stroke-linejoin: round;
    }
    .handle {
      fill: var(--primary-color, #03a9f4);
      stroke: var(--card-background-color, #fff);
      stroke-width: 2;
      cursor: ns-resize;
    }
    .today {
      stroke: var(--success-color, #43a047);
      stroke-dasharray: 4 3;
    }
    .today-text {
      fill: var(--success-color, #43a047);
      font-size: 10px;
      font-weight: 700;
    }
    .examples {
      display: flex;
      gap: 8px;
      margin-bottom: 10px;
      flex-wrap: wrap;
    }
    .example {
      flex: 1 1 60px;
      text-align: center;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 10px;
      padding: 8px 4px;
    }
    .example .lbl {
      font-size: 0.72rem;
      opacity: 0.6;
    }
    .example .num {
      font-size: 1.05rem;
      font-weight: 700;
    }
    .today-banner {
      background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      border: 1px solid var(--success-color, #43a047);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 0.9rem;
    }
    .intensity-notice {
      background: color-mix(in srgb, var(--warning-color, #ffa600) 14%, transparent);
      border: 1px solid var(--warning-color, #ffa600);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 14px;
      font-size: 0.85rem;
    }
    .graph-note {
      font-size: 0.8rem;
      opacity: 0.75;
      margin: -2px 0 12px;
    }
    .points-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #727272);
      margin: 4px 0 6px;
    }
    .point-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }
    .point-row input[type="number"] {
      width: 64px;
      text-align: center;
    }
    .point-row button {
      flex: none;
      padding: 4px 8px;
      width: auto;
    }
    .kind {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .limits {
      display: flex;
      gap: 12px;
      margin-bottom: 14px;
    }
    .limits .limit {
      flex: 1;
    }
    .limits input {
      width: 70px;
      text-align: center;
    }
    label {
      font-weight: 600;
    }
    .help {
      font-size: 0.8rem;
      opacity: 0.7;
      margin: 2px 0 6px;
    }
    .error {
      font-size: 0.85rem;
      color: var(--error-color, #db4437);
      margin-bottom: 12px;
    }
    .buttons {
      display: flex;
      gap: 10px;
    }
    button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    select {
      font: inherit;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
    }
  `;
let T = Ve;
F([
  h()
], T.prototype, "language");
F([
  h({ attribute: !1 })
], T.prototype, "cycle");
F([
  h({ attribute: !1 })
], T.prototype, "weightedTemp");
F([
  h({ type: Boolean })
], T.prototype, "zoneHasFlowMeter");
F([
  h({ type: Number })
], T.prototype, "zoneAdjustmentPct");
F([
  c()
], T.prototype, "_points");
F([
  c()
], T.prototype, "_min");
F([
  c()
], T.prototype, "_max");
F([
  c()
], T.prototype, "_kind");
F([
  c()
], T.prototype, "_error");
L("imc-curve-editor", T);
var ji = Object.defineProperty, z = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, a; o >= 0; o--)
    (a = n[o]) && (s = a(e, t, s) || s);
  return s && ji(e, t, s), s;
};
const qi = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic"
];
function Wi(n, e) {
  return n.includes(e) ? n.filter((t) => t !== e) : [...n, e].sort((t, i) => t - i);
}
function Zi(n) {
  const e = {};
  return n.soakMaxRunMin !== void 0 && (e.soak_max_run_min = n.soakMaxRunMin), n.soakPauseMin !== void 0 && (e.soak_pause_min = n.soakPauseMin), n.volumeSafetyTimeoutMin !== void 0 && (e.volume_safety_timeout_min = n.volumeSafetyTimeoutMin), e;
}
const Me = 15, ht = 1, mt = 1440, Vi = -360, Bi = 360, Hi = 5, Be = class Be extends P {
  constructor() {
    super(...arguments), this.zoneId = "", this.zoneHasFlowMeter = !1, this.zoneAdjustmentPct = 100, this.allZones = [], this._calendar = { mode: "weekdays", days: [...Te] }, this._seasonMonths = [], this._startKind = "time", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._uniformMinutes = Me, this._dayMinutes = {}, this._sameForAll = !0, this._advancedOpen = !1, this._advanced = {}, this._seededUniformMinutes = Me, this._seededDayMinutes = {}, this._seededSameForAll = !0;
  }
  /**
   * Volume-mode programs (liters, edited via the curve editor's
   * amount/heat controls) have no minutes to save here — `amount`/`heat`
   * come back null for them. Duration steppers + weather preview only make
   * sense for a "duration" curve.
   */
  /** Weekdays the per-day duration editor should offer.
  
     * Only the weekday mode pins runs to particular weekdays; an interval or
     * parity program can land on any of them.
     */
  get _activeDays() {
    return this._calendar.mode === "weekdays" ? this._calendar.days : [...Te];
  }
  get _isVolume() {
    return this.cycle?.curve?.kind === "volume";
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId ? (this._seededCycleId = t, this._seedFromCycle()) : this._curveSignature(this.cycle) !== this._seededCurveSignature && this._seedMinutesFromCycle();
    }
  }
  /** Fields of `cycle` that affect what a minutes stepper should show —
   *  used to detect a curve save/copy landing while this editor is open
   *  (see `willUpdate`). Not a general equality check: only what
   *  `_seedMinutesFromCycle` reads. */
  _curveSignature(e) {
    return JSON.stringify([
      e?.curve?.points,
      e?.curve?.min,
      e?.curve?.max,
      e?.curve?.kind,
      e?.intensity_pct,
      e?.day_intensity_pct
    ]);
  }
  _seedFromCycle() {
    const e = this.cycle;
    if (!e) return;
    this._calendar = ve(e.calendar), this._advanced = {
      soakMaxRunMin: e.soak_max_run_min,
      soakPauseMin: e.soak_pause_min,
      volumeSafetyTimeoutMin: e.volume_safety_timeout_min
    }, this._seasonMonths = [...e.season_months ?? []];
    const t = e.trigger;
    t?.kind === "sun" ? (this._startKind = "sun", this._startEvent = t.event === "sunset" ? "sunset" : "sunrise", this._startOffsetMin = Math.round((v(t.offset_s) ?? 0) / 60)) : (this._startKind = "time", this._startEvent = "sunrise", this._startOffsetMin = 0), this._startAt = t?.at ?? t?.time ?? "06:00", this._seedMinutesFromCycle();
  }
  /**
   * Seeds the minutes-editing state (uniform value, per-day map, and which
   * mode is in force) from the current `cycle`, and records that state as
   * the seed for `minutesChanged` to compare against in `_save`. Split out
   * from `_seedFromCycle` so a curve save/copy can refresh just this part
   * without disturbing calendar/season/start edits in progress.
   */
  _seedMinutesFromCycle() {
    const e = this.cycle;
    e && (this._seededCurveSignature = this._curveSignature(e), this._uniformMinutes = e.curve ? ce({ curve: e.curve, intensity_pct: e.intensity_pct }, 0) : Me, this._dayMinutes = e.day_intensity_pct ? Object.fromEntries(
      Object.keys(e.day_intensity_pct).map((t) => [t, ce(e, Number(t))])
    ) : {}, this._sameForAll = Et(e.day_intensity_pct), this._seededUniformMinutes = this._uniformMinutes, this._seededDayMinutes = this._buildDayMinutes(), this._seededSameForAll = this._sameForAll);
  }
  render() {
    const e = this.cycle;
    if (!e) return l``;
    const t = k(this.hass), i = zi(t);
    return l`
      ${Nt(t, this.cycleSwitch, () => this._onToggleEnabled())}

      <div class="section-label">${r(t, "program_editor.calendar")}</div>
      <imc-calendar-editor
        .calendar=${this._calendar}
        @imc-calendar-change=${(s) => this._calendar = s.detail.calendar}
      ></imc-calendar-editor>

      <div class="section-label">${r(t, "program_editor.season")}</div>
      <div class="days">
        ${qi.map(
      (s, o) => l`
            <div
              class="day ${this._seasonMonths.includes(o + 1) ? "on" : ""}"
              @click=${() => this._seasonMonths = Wi(this._seasonMonths, o + 1)}
            >
              ${s}
            </div>
          `
    )}
      </div>

      <div class="section-label">${r(t, "program_editor.start")}</div>
      <div class="start-row">
        <span class="seg">
          <span
            class="${this._startKind === "time" ? "sel" : ""}"
            @click=${() => this._startKind = "time"}
            >${r(t, "program_editor.start_fixed")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
            @click=${() => this._setSun("sunrise")}
            >${r(t, "program_editor.start_sunrise")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
            @click=${() => this._setSun("sunset")}
            >${r(t, "program_editor.start_sunset")}</span
          >
        </span>
        ${this._startKind === "time" ? l`<input
              type="time"
              class="timebox"
              .value=${this._startAt}
              @input=${(s) => this._startAt = s.target.value}
            />` : this._stepper(this._startOffsetMin, (s) => this._startOffsetMin = s, {
      min: Vi,
      max: Bi,
      step: Hi,
      suffix: "min",
      signed: !0
    })}
      </div>

      ${this._isVolume ? l`<div class="volume-note">${r(t, "editor.volume_note")}</div>` : l`
            <div class="section-label">${r(t, "program_editor.duration_per_day")}</div>
            ${this._renderDurations(t, i)}
            <div class="same-row" @click=${() => this._sameForAll = !this._sameForAll}>
              <span class="switch ${this._sameForAll ? "on" : ""}"></span>
              ${r(t, "program_editor.same_duration")}
            </div>

            ${this._renderAdjustmentNote(t)}
            ${this._renderWeatherLine(t, e)}
          `}

      <div
        class="section-label advanced-toggle"
        @click=${() => this._advancedOpen = !this._advancedOpen}
      >
        ${this._advancedOpen ? "▾" : "▸"} ${r(t, "panel.advanced")}
      </div>
      ${this._advancedOpen ? this._renderAdvanced(t) : p}

      <div class="buttons">
        <button class="primary" @click=${this._save}>
          ${r(t, "editor.save")}
        </button>
        <button @click=${this._cancel}>${r(t, "editor.cancel")}</button>
      </div>
    `;
  }
  _setSun(e) {
    this._startKind = "sun", this._startEvent = e;
  }
  _renderAdvanced(e) {
    return l`
      <div class="section-label">${r(e, "program_editor.soak_max_run")}</div>
      <input
        class="field"
        type="number"
        min="1"
        .value=${this._advanced.soakMaxRunMin ?? ""}
        @input=${(t) => this._advanced = {
      ...this._advanced,
      soakMaxRunMin: v(t.target.value)
    }}
      />
      <div class="hint">${r(e, "program_editor.soak_max_run_hint")}</div>

      <div class="section-label">${r(e, "program_editor.soak_pause")}</div>
      <input
        class="field"
        type="number"
        min="0"
        .value=${this._advanced.soakPauseMin ?? ""}
        @input=${(t) => this._advanced = {
      ...this._advanced,
      soakPauseMin: v(t.target.value)
    }}
      />
      <div class="hint">${r(e, "program_editor.soak_pause_hint")}</div>

      ${this._isVolume ? l`
            <div class="section-label">
              ${r(e, "program_editor.volume_safety_timeout")}
            </div>
            <input
              class="field"
              type="number"
              min="1"
              .value=${this._advanced.volumeSafetyTimeoutMin ?? ""}
              @input=${(t) => this._advanced = {
      ...this._advanced,
      volumeSafetyTimeoutMin: v(t.target.value)
    }}
            />
            <div class="hint">
              ${r(e, "program_editor.volume_safety_timeout_hint")}
            </div>
          ` : p}

      <div class="section-label">${r(e, "panel.heat_response")}</div>
      ${this._renderCopyCurve(e)}
      <imc-curve-editor
        .cycle=${this.cycle}
        .weightedTemp=${this.weightedTemp}
        .language=${k(this.hass)}
        .zoneHasFlowMeter=${this.zoneHasFlowMeter}
        .zoneAdjustmentPct=${this.zoneAdjustmentPct}
        @imc-curve-save=${this._onCurveSave}
        @imc-curve-cancel=${() => this._advancedOpen = !1}
      ></imc-curve-editor>
    `;
  }
  /**
   * "Copy curve from…": every other program, across every zone, offered by
   * `buildCopyCandidates` (see its doc comment for the two things it
   * already leaves out). Picking one dispatches `imc-curve-copy`
   * immediately — there is no separate confirm step, mirroring how
   * `imc-curve-save` itself is a one-shot action — and the `<select>` is
   * reset back to its placeholder right after so the same source can be
   * picked again (e.g. after tweaking something and wanting a fresh copy).
   */
  _renderCopyCurve(e) {
    const t = this.cycle?.cycle_id ?? "", i = wi(
      this.allZones,
      this.zoneId,
      t,
      this.zoneHasFlowMeter
    );
    return i.length === 0 ? l`
        <label class="copy-label">${r(e, "curve.copy_from")}</label>
        <div class="hint">${r(e, "curve.copy_error")}</div>
      ` : l`
      <label class="copy-label">${r(e, "curve.copy_from")}</label>
      <select class="timebox copy-select" @change=${this._onCopyCurve}>
        <option value="" selected>${r(e, "curve.copy_placeholder")}</option>
        ${i.map(
      (s) => l`<option value=${s.value}>${s.label}</option>`
    )}
      </select>
    `;
  }
  _onCopyCurve(e) {
    const t = e.target, i = t.value, s = this.cycle?.cycle_id;
    if (!i || !s) return;
    const o = i.indexOf(":");
    o < 0 || (this.dispatchEvent(
      new CustomEvent("imc-curve-copy", {
        detail: {
          zoneId: this.zoneId,
          programId: s,
          sourceZoneId: i.slice(0, o),
          sourceProgramId: i.slice(o + 1)
        },
        bubbles: !0,
        composed: !0
      })
    ), t.value = "");
  }
  /**
   * Intercepts the embedded curve editor's `imc-curve-save` (raw
   * `CurveSavePayload`, no zoneId) and re-dispatches under the same event
   * name with `zoneId` attached — see the `ProgramCurveSaveDetail` doc
   * comment above for why. `curve-editor.ts` itself is never modified.
   */
  _onCurveSave(e) {
    e.stopPropagation(), this.dispatchEvent(
      new CustomEvent("imc-curve-save", {
        detail: { zoneId: this.zoneId, curve: e.detail },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _renderDurations(e, t) {
    const i = r(e, "curve.unit_duration");
    return this._sameForAll ? l`<div class="duration-row">
        ${this._stepper(this._uniformMinutes, (s) => this._uniformMinutes = s, {
      min: ht,
      max: mt,
      step: 1,
      suffix: i
    })}
      </div>` : l`${this._activeDays.map((s) => {
      const o = this._dayMinutes[String(s)] ?? ce(this.cycle ?? {}, s);
      return l`<div class="duration-row">
        <span class="dname">${t[s] ?? ""}</span>
        ${this._stepper(
        o,
        (a) => this._dayMinutes = { ...this._dayMinutes, [String(s)]: a },
        { min: ht, max: mt, step: 1, suffix: i }
      )}
      </div>`;
    })}`;
  }
  _stepper(e, t, i) {
    const s = i.signed && e > 0 ? "+" : "";
    return l`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(me(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${s}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(me(e + i.step, i.min, i.max))}
        >
          +
        </button>
      </span>
    `;
  }
  _renderWeatherLine(e, t) {
    const i = this.weightedTemp;
    if (i === void 0 || Number.isNaN(i)) return p;
    const s = ((/* @__PURE__ */ new Date()).getDay() + 6) % 7;
    if (!this._activeDays.includes(s))
      return l`<div class="weather">${r(e, "reason.calendar_not_today")}</div>`;
    const o = this._sameForAll ? this._uniformMinutes : this._dayMinutes[String(s)] ?? this._uniformMinutes, a = Ct(t, o, i, this.zoneAdjustmentPct), d = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    });
    return l`<div class="weather">
      ${r(e, "panel.weather_line", { day: d, min: a })}
    </div>`;
  }
  /**
   * When the zone's adjustment isn't a no-op, the stepper above shows the
   * SETTING (pre-adjustment) while the weather line and the program list
   * (program-list.ts) show DELIVERY — a zone at 70% displays 20 min on the
   * stepper and ≈14 min everywhere delivery is shown. Without this line
   * that split looks like a bug; this is the one place both figures are
   * visible together, so it is where the split gets explained.
   */
  _renderAdjustmentNote(e) {
    return this.zoneAdjustmentPct === 100 ? p : l`<div class="adjustment-note">
      ${r(e, "program_editor.zone_adjustment_note", { pct: this.zoneAdjustmentPct })}
    </div>`;
  }
  _buildDayMinutes() {
    const e = {};
    for (const t of this._activeDays)
      e[String(t)] = this._dayMinutes[String(t)] ?? ce(this.cycle ?? {}, t);
    return e;
  }
  /** Reuses `imc-program-toggle`, so the panel needs no new plumbing. */
  _onToggleEnabled() {
    const e = this.cycleSwitch;
    !e || !this.cycle?.cycle_id || this.dispatchEvent(
      new CustomEvent("imc-program-toggle", {
        detail: {
          zoneId: this.zoneId,
          programId: this.cycle.cycle_id,
          entityId: e.entity_id,
          enabled: e.state !== "on"
        },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _save() {
    const e = this.zoneId, t = this.cycle?.cycle_id ?? "", i = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin };
    this.dispatchEvent(
      new CustomEvent("imc-program-save-schedule", {
        detail: {
          zoneId: e,
          programId: t,
          calendar: this._calendar,
          seasonMonths: this._seasonMonths.length ? [...this._seasonMonths].sort((d, u) => d - u) : void 0,
          start: i
        },
        bubbles: !0,
        composed: !0
      })
    );
    const s = Zi(this._advanced);
    if (Object.keys(s).length > 0 && this.dispatchEvent(
      new CustomEvent("imc-program-save-advanced", {
        detail: { zoneId: e, programId: t, patch: s },
        bubbles: !0,
        composed: !0
      })
    ), this._isVolume) return;
    const o = this._buildDayMinutes();
    if (!Ai(
      this._sameForAll,
      this._seededSameForAll,
      this._seededUniformMinutes,
      this._uniformMinutes,
      this._seededDayMinutes,
      o
    ))
      return;
    const a = this._sameForAll ? { zoneId: e, programId: t, minutes: this._uniformMinutes } : { zoneId: e, programId: t, dayMinutes: o };
    this.dispatchEvent(
      new CustomEvent("imc-program-save-minutes", {
        detail: a,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _cancel() {
    this.dispatchEvent(
      new CustomEvent("imc-program-cancel", { bubbles: !0, composed: !0 })
    );
  }
};
Be.styles = O`
    ${Ni}
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color, #8b93a7);
      margin: 14px 0 6px;
    }
    .section-label:first-child {
      margin-top: 0;
    }
    .days {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .day {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      background: var(--secondary-background-color, #26262e);
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    .day.on {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
      font-weight: 600;
    }
    .start-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .seg {
      display: inline-flex;
      flex-wrap: wrap;
      background: var(--secondary-background-color, #26262e);
      border-radius: 10px;
      padding: 3px;
      gap: 2px;
    }
    .seg span {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      color: var(--secondary-text-color, #aab);
      cursor: pointer;
      user-select: none;
    }
    .seg span.sel {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
    }
    .timebox {
      background: var(--secondary-background-color, #26262e);
      border: none;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 13px;
      color: inherit;
      font-family: inherit;
    }
    .duration-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px solid var(--divider-color, rgba(127, 127, 127, 0.15));
    }
    .dname {
      width: 44px;
      font-size: 13px;
      color: var(--secondary-text-color);
    }
    .stepper {
      display: inline-flex;
      align-items: center;
      background: var(--secondary-background-color, #26262e);
      border-radius: 8px;
      overflow: hidden;
    }
    .stepper button {
      border: none;
      background: transparent;
      color: var(--imc-accent, #8ab4ff);
      width: 30px;
      height: 30px;
      padding: 0;
      font-size: 16px;
      cursor: pointer;
    }
    .stepper .val {
      min-width: 64px;
      text-align: center;
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }
    .same-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #aab);
      margin-top: 10px;
      cursor: pointer;
      user-select: none;
    }
    .switch {
      width: 34px;
      height: 20px;
      background: var(--divider-color, #444);
      border-radius: 999px;
      position: relative;
      transition: background 0.15s ease;
      flex: none;
    }
    .switch::after {
      content: "";
      position: absolute;
      left: 2px;
      top: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: left 0.15s ease;
    }
    .switch.on {
      background: var(--imc-accent, #3a6df0);
    }
    .switch.on::after {
      left: 16px;
    }
    .weather {
      margin-top: 14px;
      background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      border: 1px solid var(--success-color, #43a047);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12.5px;
    }
    .volume-note {
      margin-top: 14px;
      font-size: 12.5px;
      opacity: 0.8;
    }
    .adjustment-note {
      margin-top: 10px;
      font-size: 12.5px;
      opacity: 0.8;
      font-style: italic;
    }
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--error-color, #db4437);
    }
    .copy-label {
      display: block;
      font-size: 12px;
      color: var(--secondary-text-color, #aab);
      margin-bottom: 4px;
    }
    .copy-select {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 4px;
    }
    .advanced-toggle {
      cursor: pointer;
      user-select: none;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }
    .buttons button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .buttons button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    .buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
let b = Be;
z([
  h({ attribute: !1 })
], b.prototype, "hass");
z([
  h({ attribute: !1 })
], b.prototype, "cycleSwitch");
z([
  h()
], b.prototype, "zoneId");
z([
  h({ attribute: !1 })
], b.prototype, "cycle");
z([
  h({ attribute: !1 })
], b.prototype, "weightedTemp");
z([
  h({ type: Boolean })
], b.prototype, "zoneHasFlowMeter");
z([
  h({ type: Number })
], b.prototype, "zoneAdjustmentPct");
z([
  h({ attribute: !1 })
], b.prototype, "allZones");
z([
  c()
], b.prototype, "_calendar");
z([
  c()
], b.prototype, "_seasonMonths");
z([
  c()
], b.prototype, "_startKind");
z([
  c()
], b.prototype, "_startAt");
z([
  c()
], b.prototype, "_startEvent");
z([
  c()
], b.prototype, "_startOffsetMin");
z([
  c()
], b.prototype, "_uniformMinutes");
z([
  c()
], b.prototype, "_dayMinutes");
z([
  c()
], b.prototype, "_sameForAll");
z([
  c()
], b.prototype, "_advancedOpen");
z([
  c()
], b.prototype, "_advanced");
L("imc-program-editor", b);
var Gi = Object.defineProperty, I = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, a; o >= 0; o--)
    (a = n[o]) && (s = a(e, t, s) || s);
  return s && Gi(e, t, s), s;
};
const Oe = 15, Ki = 8, Yi = 1, Qi = 60, Xi = {
  curve: {
    points: [
      [12, 5],
      [25, Oe],
      [35, Oe + Ki]
    ],
    min: Yi,
    max: Qi
  }
}, Ji = 1, es = 1440, ts = -360, is = 360, ss = 5, He = class He extends P {
  constructor() {
    super(...arguments), this.zoneId = "", this.zoneAdjustmentPct = 100, this._step = 1, this._calendar = { mode: "weekdays", days: [...Te] }, this._startKind = "sun", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._minutes = Oe;
  }
  render() {
    const e = k(this.hass);
    return l`
      <div class="head">
        <span class="title">${this._stepTitle(e)}</span>
        <button class="close" @click=${this._cancel} aria-label=${r(e, "editor.cancel")}>
          ✕
        </button>
      </div>
      <div class="dots">
        ${[1, 2, 3].map(
      (t) => l`<span class="dot ${this._step === t ? "on" : ""}"></span>`
    )}
      </div>
      ${this._step === 1 ? this._renderStep1(e) : p}
      ${this._step === 2 ? this._renderStep2(e) : p}
      ${this._step === 3 ? this._renderStep3(e) : p}
      <div class="buttons">
        ${this._step > 1 ? l`<button @click=${this._back}>${r(e, "wizard.back")}</button>` : l`<button @click=${this._cancel}>${r(e, "editor.cancel")}</button>`}
        ${this._step < 3 ? l`<button
              class="primary"
              @click=${this._next}
            >
              ${r(e, "wizard.next")}
            </button>` : l`<button
              class="primary"
              @click=${this._finish}
            >
              ${r(e, "wizard.finish")}
            </button>`}
      </div>
    `;
  }
  _stepTitle(e) {
    return this._step === 1 ? r(e, "wizard.step1_title") : this._step === 2 ? r(e, "wizard.step2_title") : r(e, "wizard.step3_title");
  }
  _renderStep1(e) {
    return l`
      <imc-calendar-editor
        .calendar=${this._calendar}
        @imc-calendar-change=${(t) => this._calendar = t.detail.calendar}
      ></imc-calendar-editor>
    `;
  }
  _renderStep2(e) {
    return l`
      <div class="seg">
        <span
          class="${this._startKind === "time" ? "sel" : ""}"
          @click=${() => this._startKind = "time"}
        >
          ${r(e, "program_editor.start_fixed")}
        </span>
        <span
          class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
          @click=${() => this._setSun("sunrise")}
        >
          ${r(e, "program_editor.start_sunrise")}
        </span>
        <span
          class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
          @click=${() => this._setSun("sunset")}
        >
          ${r(e, "program_editor.start_sunset")}
        </span>
      </div>
      ${this._startKind === "time" ? l`<input
            type="time"
            class="timebox"
            .value=${this._startAt}
            @input=${(t) => this._startAt = t.target.value}
          />` : l`<div class="offset-row">
            ${this._stepper(this._startOffsetMin, (t) => this._startOffsetMin = t, {
      min: ts,
      max: is,
      step: ss,
      suffix: "min",
      signed: !0
    })}
          </div>`}
    `;
  }
  _renderStep3(e) {
    const t = r(e, "curve.unit_duration");
    return l`
      <div class="stepper-row">
        ${this._stepper(this._minutes, (i) => this._minutes = i, {
      min: Ji,
      max: es,
      step: 1,
      suffix: t
    })}
      </div>
      ${this._renderPreview(e)}
    `;
  }
  _renderPreview(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return p;
    const i = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    }), s = Ct(Xi, this._minutes, t, this.zoneAdjustmentPct);
    return l`<div class="done">
      ${r(e, "wizard.done_prefix")}
      ${r(e, "panel.weather_line", { day: i, min: s })}
    </div>`;
  }
  _stepper(e, t, i) {
    const s = i.signed && e > 0 ? "+" : "";
    return l`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(me(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${s}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(me(e + i.step, i.min, i.max))}
        >
          +
        </button>
      </span>
    `;
  }
  _setSun(e) {
    this._startKind = "sun", this._startEvent = e;
  }
  _back() {
    this._step > 1 && (this._step = this._step - 1);
  }
  _next() {
    this._step < 3 && (this._step = this._step + 1);
  }
  _finish() {
    const e = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin };
    this.dispatchEvent(
      new CustomEvent("imc-wizard-finish", {
        detail: {
          zoneId: this.zoneId,
          calendar: this._calendar,
          start: e,
          minutes: this._minutes
        },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _cancel() {
    this.dispatchEvent(
      new CustomEvent("imc-wizard-cancel", { bubbles: !0, composed: !0 })
    );
  }
};
He.styles = O`
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }
    .title {
      font-size: 14px;
      font-weight: 600;
    }
    .close {
      border: none;
      background: transparent;
      color: var(--secondary-text-color, #8b93a7);
      font-size: 14px;
      cursor: pointer;
      padding: 2px 6px;
    }
    .dots {
      display: flex;
      gap: 6px;
      justify-content: center;
      margin-bottom: 14px;
    }
    .dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--divider-color, #3a3a44);
    }
    .dot.on {
      background: var(--imc-accent, #3a6df0);
    }
    .days {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .day {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      background: var(--secondary-background-color, #26262e);
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    .day.on {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
      font-weight: 600;
    }
    .presets {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      justify-content: center;
      margin-top: 12px;
    }
    .preset {
      font-size: 11px;
      color: var(--secondary-text-color, #aab);
      background: var(--secondary-background-color, #26262e);
      border-radius: 999px;
      padding: 5px 12px;
      cursor: pointer;
      user-select: none;
    }
    .preset.sel {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
    }
    .seg {
      display: flex;
      flex-wrap: wrap;
      background: var(--secondary-background-color, #26262e);
      border-radius: 10px;
      padding: 3px;
      gap: 2px;
    }
    .seg span {
      flex: 1;
      text-align: center;
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 8px;
      color: var(--secondary-text-color, #aab);
      cursor: pointer;
      user-select: none;
    }
    .seg span.sel {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
    }
    .timebox {
      display: block;
      width: 100%;
      box-sizing: border-box;
      margin-top: 14px;
      background: var(--secondary-background-color, #26262e);
      border: none;
      border-radius: 8px;
      padding: 10px;
      font-size: 20px;
      text-align: center;
      color: inherit;
      font-family: inherit;
    }
    .offset-row {
      display: flex;
      justify-content: center;
      margin-top: 14px;
    }
    .stepper-row {
      display: flex;
      justify-content: center;
      margin-top: 6px;
    }
    .stepper {
      display: inline-flex;
      align-items: center;
      background: var(--secondary-background-color, #26262e);
      border-radius: 8px;
      overflow: hidden;
    }
    .stepper button {
      border: none;
      background: transparent;
      color: var(--imc-accent, #8ab4ff);
      width: 34px;
      height: 34px;
      padding: 0;
      font-size: 18px;
      cursor: pointer;
    }
    .stepper .val {
      min-width: 80px;
      text-align: center;
      font-size: 15px;
      font-variant-numeric: tabular-nums;
    }
    .done {
      margin-top: 14px;
      background: color-mix(in srgb, var(--success-color, #43a047) 14%, transparent);
      border: 1px solid var(--success-color, #43a047);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 12.5px;
      text-align: center;
    }
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--error-color, #db4437);
      text-align: center;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 18px;
    }
    .buttons button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .buttons button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    .buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
let M = He;
I([
  h({ attribute: !1 })
], M.prototype, "hass");
I([
  h()
], M.prototype, "zoneId");
I([
  h({ attribute: !1 })
], M.prototype, "weightedTemp");
I([
  h({ type: Number })
], M.prototype, "zoneAdjustmentPct");
I([
  c()
], M.prototype, "_step");
I([
  c()
], M.prototype, "_calendar");
I([
  c()
], M.prototype, "_startKind");
I([
  c()
], M.prototype, "_startAt");
I([
  c()
], M.prototype, "_startEvent");
I([
  c()
], M.prototype, "_startOffsetMin");
I([
  c()
], M.prototype, "_minutes");
L("imc-program-wizard", M);
var ns = Object.defineProperty, J = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, a; o >= 0; o--)
    (a = n[o]) && (s = a(e, t, s) || s);
  return s && ns(e, t, s), s;
};
const Ge = class Ge extends P {
  constructor() {
    super(...arguments), this.allZones = [], this._wizardOpen = !1;
  }
  /**
   * Closing the wizard on zone switch avoids a stale add-program flow
   * (targeting the previous zone) surviving a tab change. `panel.ts` calls
   * `discover(hass)` fresh on every re-render and builds a brand-new
   * `ZoneBundle` object each time, so `changed.has("zone")` fires on
   * essentially every re-render (any relevant maestro entity tick), not
   * just an actual tab switch — gate on the stable `zoneId` actually
   * changing, not object identity, the same way `program-editor.ts` seeds
   * off `cycle.cycle_id` rather than the `cycle` object reference.
   */
  willUpdate(e) {
    if (e.has("zone")) {
      const t = e.get("zone");
      t && t.zoneId !== this.zone?.zoneId && (this._wizardOpen = !1);
    }
  }
  render() {
    const e = this.hass, t = this.zone;
    if (!e || !t) return l``;
    const i = k(e), s = At(t);
    return l`
      ${s.length === 0 ? l`<div class="meta">${r(i, "panel.no_programs")}</div>` : this._renderCycles(i, e, t, s)}
      ${this._renderAddProgram(i, e, t)}
    `;
  }
  _renderAddProgram(e, t, i) {
    return l`
      <div class="add-row">
        ${this._wizardOpen ? l`<imc-program-wizard
              .hass=${t}
              .zoneId=${i.zoneId}
              .weightedTemp=${this.weightedTemp}
              .zoneAdjustmentPct=${Ae(i)}
              @imc-wizard-finish=${() => this._wizardOpen = !1}
              @imc-wizard-cancel=${() => this._wizardOpen = !1}
            ></imc-program-wizard>` : l`<button class="add-btn" @click=${() => this._wizardOpen = !0}>
              ＋ ${r(e, "panel.add_program")}
            </button>`}
      </div>
    `;
  }
  _renderCycles(e, t, i, s) {
    return l`${s.map((o) => {
      const a = !!o.cycle_id && this._editingId === o.cycle_id, d = o.cycle_id ? this._findCycleSwitch(i, o.cycle_id) : void 0;
      return d?.state, l`
        <div class="prog">
          <div class="name">${o.name ?? o.cycle_id}</div>
          <div class="days">${Ci(o.calendar)}</div>
          <div class="meta">
            ${vi(o.trigger, e)} · ${this._minutesSummary(e, i, o)}
          </div>
          ${Nt(e, d, () => {
        d && this._onToggle(i.zoneId, o, d);
      })}
          ${o.cycle_id ? l`<div class="actions">
                <button
                  class="link-btn"
                  @click=${() => this._editingId = a ? void 0 : o.cycle_id}
                >
                  ${r(e, "panel.edit_program")}
                </button>
                <button class="link-btn" @click=${() => this._onRename(e, i.zoneId, o)}>
                  ${r(e, "panel.rename_program")}
                </button>
                <button class="link-btn" @click=${() => this._onDuplicate(i.zoneId, o)}>
                  ${r(e, "program.duplicate")}
                </button>
                <button
                  class="link-btn danger"
                  @click=${() => this._onDelete(e, i.zoneId, o)}
                >
                  ${r(e, "panel.delete_program")}
                </button>
              </div>` : p}
          ${a ? l`<imc-program-editor
                .hass=${t}
                .zoneId=${i.zoneId}
                .cycle=${o}
                .cycleSwitch=${d}
                .weightedTemp=${this.weightedTemp}
                .zoneHasFlowMeter=${bi(i)}
                .zoneAdjustmentPct=${Ae(i)}
                .allZones=${this.allZones}
                @imc-program-save-schedule=${() => this._editingId = void 0}
                @imc-program-save-minutes=${() => this._editingId = void 0}
                @imc-program-cancel=${() => this._editingId = void 0}
              ></imc-program-editor>` : p}
        </div>
      `;
    })}`;
  }
  /** Find the `cycle_enabled` switch entity for a program, matched by the
   *  discovery-assigned `cycle_id` attribute (see docs/design/card-contract.md). */
  _findCycleSwitch(e, t) {
    return e.cycleSwitches.find((i) => N(i.attributes.cycle_id) === t);
  }
  _dispatch(e, t) {
    this.dispatchEvent(new CustomEvent(e, { detail: t, bubbles: !0, composed: !0 }));
  }
  _onToggle(e, t, i) {
    t.cycle_id && this._dispatch("imc-program-toggle", {
      zoneId: e,
      programId: t.cycle_id,
      entityId: i.entity_id,
      enabled: i.state !== "on"
    });
  }
  /** Enter/Space activate the toggle, mirroring zone-row.ts's header keydown pattern. */
  _onRename(e, t, i) {
    if (!i.cycle_id) return;
    const s = i.name ?? "", o = window.prompt(r(e, "panel.rename_program"), s);
    if (o === null) return;
    const a = o.trim();
    !a || a === s || this._dispatch("imc-program-rename", {
      zoneId: t,
      programId: i.cycle_id,
      name: a
    });
  }
  _onDuplicate(e, t) {
    t.cycle_id && this._dispatch("imc-program-duplicate", {
      zoneId: e,
      programId: t.cycle_id
    });
  }
  _onDelete(e, t, i) {
    if (!i.cycle_id) return;
    const s = i.name ?? i.cycle_id;
    window.confirm(r(e, "panel.confirm_delete_program", { name: s })) && this._dispatch("imc-program-remove", { zoneId: t, programId: i.cycle_id });
  }
  /**
   * The user explicitly decided this line shows DELIVERY, not the SETTING
   * the program editor's stepper seeds from: this list is describing what
   * actually gets watered in this zone, factoring in its `adjustment_pct`
   * (see `dayDelivery` in schedule-math.ts and the split documented on
   * `dayBase` there).
   */
  _minutesSummary(e, t, i) {
    if (!Et(i.day_intensity_pct))
      return r(e, "panel.per_day_minutes");
    const s = i.curve?.kind === "volume" ? void 0 : Si(i, 0, Ae(t));
    return r(e, "panel.minutes_value", { min: s ?? "?" });
  }
};
Ge.styles = O`
    .prog {
      border: 1px solid var(--divider-color, #333);
      border-radius: 12px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    .name {
      font-weight: 600;
      margin-bottom: 8px;
    }
    .days {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      margin: 6px 0;
    }
    .day {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      background: var(--secondary-background-color, #26262e);
      color: var(--secondary-text-color);
    }
    .day.on {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
    }
    .meta {
      font-size: 12.5px;
      color: var(--secondary-text-color);
    }
    .link-btn {
      margin-top: 8px;
      border: none;
      background: transparent;
      padding: 2px 0;
      font-size: 11px;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      text-decoration: underline;
    }
    .link-btn:hover {
      opacity: 0.8;
    }
    .link-btn.danger {
      color: var(--error-color, #db4437);
    }
    .actions {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }
    .toggle-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
      font-size: 12.5px;
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    .toggle-row:focus-visible {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: 2px;
      border-radius: 4px;
    }
    .switch {
      width: 34px;
      height: 20px;
      background: var(--divider-color, #444);
      border-radius: 999px;
      position: relative;
      transition: background 0.15s ease;
      flex: none;
    }
    .switch::after {
      content: "";
      position: absolute;
      left: 2px;
      top: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: left 0.15s ease;
    }
    .switch.on {
      background: var(--imc-accent, #3a6df0);
    }
    .switch.on::after {
      left: 16px;
    }
    .add-row {
      margin-top: 4px;
    }
    .add-btn {
      width: 100%;
      border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.4));
      border-radius: 12px;
      background: transparent;
      color: var(--imc-accent, #3a6df0);
      font: inherit;
      font-size: 13px;
      font-weight: 600;
      padding: 10px 14px;
      cursor: pointer;
    }
    .add-btn:hover {
      opacity: 0.85;
    }
  `;
let R = Ge;
J([
  h({ attribute: !1 })
], R.prototype, "hass");
J([
  h({ attribute: !1 })
], R.prototype, "zone");
J([
  h({ attribute: !1 })
], R.prototype, "weightedTemp");
J([
  h({ attribute: !1 })
], R.prototype, "allZones");
J([
  c()
], R.prototype, "_editingId");
J([
  c()
], R.prototype, "_wizardOpen");
L("imc-program-list", R);
const xe = [
  "L/min",
  "L/h",
  "L/s",
  "mL/s",
  "m³/h",
  "m³/min",
  "m³/s",
  "ft³/min",
  "gal/h",
  "gal/min",
  "gal/d"
];
function Ot(n, e) {
  const t = N(n.states?.[e]?.attributes.unit_of_measurement);
  return t && xe.includes(t) ? t : void 0;
}
function os(n, e) {
  return n && xe.includes(n) ? { unit: n, source: "override" } : e ? { unit: e, source: "detected" } : { unit: void 0, source: "unknown" };
}
const rs = {
  override: "zone.flow_unit_from_override",
  detected: "zone.flow_unit_from_entity",
  unknown: "zone.flow_unit_unknown"
};
function Ft(n, e, t) {
  const { unit: i, source: s } = os(e, t);
  return r(n, rs[s], i ? { unit: i } : void 0);
}
var as = Object.defineProperty, ke = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, a; o >= 0; o--)
    (a = n[o]) && (s = a(e, t, s) || s);
  return s && as(e, t, s), s;
};
function ls() {
  return typeof customElements < "u" && !!customElements.get("ha-selector");
}
const Ke = class Ke extends P {
  constructor() {
    super(...arguments), this.selector = { entity: {} }, this.value = "", this.label = "";
  }
  _emit(e) {
    this.value = e, this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: e }, bubbles: !0, composed: !0 })
    );
  }
  render() {
    return ls() ? l`<ha-selector
        .hass=${this.hass}
        .selector=${this.selector}
        .value=${this.value || void 0}
        .label=${this.label}
        @value-changed=${(e) => this._emit(e.detail?.value ?? "")}
      ></ha-selector>` : l`<input
      .value=${this.value}
      placeholder=${this.label}
      @input=${(e) => this._emit(e.target.value)}
    />`;
  }
};
Ke.styles = O`
    input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #444);
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      font-size: 13px;
    }
  `;
let G = Ke;
ke([
  h({ attribute: !1 })
], G.prototype, "hass");
ke([
  h({ attribute: !1 })
], G.prototype, "selector");
ke([
  h()
], G.prototype, "value");
ke([
  h()
], G.prototype, "label");
L("imc-entity-picker", G);
var ds = Object.defineProperty, E = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, a; o >= 0; o--)
    (a = n[o]) && (s = a(e, t, s) || s);
  return s && ds(e, t, s), s;
};
function cs(n, e, t, i) {
  if (!i) return;
  const s = e === "leak" ? i.leak_candidate : i.supply_candidate;
  if (s) return r(n, "zone.sensor_detected", { entity: s });
  if (t.trim() === "")
    return r(n, e === "leak" ? "zone.leak_sensor_none" : "zone.water_supply_none");
}
const Ye = class Ye extends P {
  constructor() {
    super(...arguments), this._name = "", this._valve = "", this._flowSensor = "", this._flowSensorUnit = "", this._leakSensor = "", this._waterSupplySensor = "", this._compatibilityGroup = "", this._advancedOpen = !1;
  }
  /**
   * Seeding happens once per zone. `sensorDiscovery` therefore has to be set
   * in the SAME update as `zone`/`zoneId` — the panel reads the config and
   * the discovery together and assigns both before the editor renders. A
   * discovery arriving in a later update would be ignored rather than
   * re-seeding, which is the right trade: re-seeding on any later property
   * change would throw away whatever the user had already typed.
   */
  willUpdate(e) {
    (e.has("zone") || e.has("zoneId")) && this.zoneId !== this._seededZoneId && (this._seededZoneId = this.zoneId, this._seedFromZone());
  }
  _seedFromZone() {
    const e = this.zone;
    this._name = e?.name ?? "", this._valve = e?.valve_entity ?? "", this._areaM2 = e?.area_m2, this._flowSensor = e?.flow_sensor ?? "", this._flowSensorUnit = e?.flow_sensor_unit ?? "";
    const t = this.sensorDiscovery;
    this._leakSensor = e?.leak_sensor ?? t?.leak_candidate ?? "", this._waterSupplySensor = e?.water_supply_sensor ?? t?.supply_candidate ?? "", this._nominalFlowLpm = e?.nominal_flow_lpm, this._flowTolerancePct = e?.flow_tolerance_pct, this._adjustmentPct = e?.adjustment_pct, this._order = e?.order, this._compatibilityGroup = e?.compatibility_group ?? "", this._advancedOpen = !1;
  }
  get _canSave() {
    return this._name.trim() !== "" && this._valve.trim() !== "";
  }
  render() {
    const e = k(this.hass), t = !!this.zone;
    return l`
      <div class="header">${r(e, t ? "zone.edit" : "zone.add")}</div>

      <div class="section-label">${r(e, "zone.field_name")}</div>
      <input
        class="field"
        type="text"
        .value=${this._name}
        @input=${(i) => this._name = i.target.value}
      />

      <div class="section-label">${r(e, "zone.field_valve")}</div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${{ entity: { domain: ["valve", "switch"] } }}
        .value=${this._valve}
        .label=${r(e, "zone.field_valve")}
        @value-changed=${(i) => this._valve = i.detail.value}
      ></imc-entity-picker>

      <div class="section-label">${r(e, "zone.field_area")}</div>
      <input
        class="field"
        type="number"
        min="0"
        step="0.1"
        .value=${this._areaM2 ?? ""}
        @input=${(i) => this._areaM2 = v(i.target.value)}
      />
      ${t ? l`
            <div
              class="section-label advanced-toggle"
              @click=${() => this._advancedOpen = !this._advancedOpen}
            >
              ${this._advancedOpen ? "▾" : "▸"} ${r(e, "zone.advanced")}
            </div>
            ${this._advancedOpen ? this._renderAdvanced(e) : p}
          ` : p}

      <div class="buttons">
        ${t ? l`<button class="danger" type="button" @click=${this._remove}>
              🗑 ${r(e, "zone.delete")}
            </button>` : p}
        <button type="button" @click=${this._cancel}>${r(e, "editor.cancel")}</button>
        <button
          class="primary"
          type="button"
          ?disabled=${!this._canSave}
          @click=${this._save}
        >
          ${r(e, "editor.save")}
        </button>
      </div>
    `;
  }
  /**
   * The unit this zone's meter reports in. Rendered only while a meter is in
   * the picker above: with no meter there is nothing to state a unit for, and
   * the note below would warn about ignored readings that do not exist.
   *
   * Emptying the picker only hides this field, it does not clear the stored
   * override — an empty `flow_sensor` is omitted from the patch, so the zone
   * keeps the meter it had, and dropping the unit under it would leave that
   * meter being read in whatever unit it declares. (The hub's line meter
   * differs: `set_weather_sources` really does clear it, and drops its unit
   * with it — see settings-view's `_setLineFlowSensor`.)
   *
   * "Detected from the entity" is a real option, not an empty placeholder —
   * it is how the user hands the decision back to the entity, and saving it
   * sends `""`, which `update_zone` treats as "clear the override".
   */
  _renderFlowUnit(e) {
    const t = this._flowSensor.trim();
    if (t === "") return p;
    const i = this.hass ? Ot(this.hass, t) : void 0, s = r(e, "zone.field_flow_unit"), o = this._flowSensorUnit;
    return l`
      <div class="section-label">${s}</div>
      <select
        class="field"
        aria-label=${s}
        @change=${(a) => this._flowSensorUnit = a.target.value}
      >
        <option value="" ?selected=${o === ""}>
          ${r(e, "zone.flow_unit_auto")}
        </option>
        ${xe.map(
      (a) => l`<option value=${a} ?selected=${o === a}>${a}</option>`
    )}
      </select>
      <div class="field-note">${Ft(e, this._flowSensorUnit, i)}</div>
    `;
  }
  /**
   * One of the two `binary_sensor` fields, with the provenance underneath it
   * in the same `.field-note` idiom the flow unit uses.
   *
   * The picker is filtered by `device_class` rather than by domain alone,
   * mirroring how the backend finds candidates: `moisture` for a leak,
   * `problem` for the water supply. It is a filter, not a rule — the user is
   * free to pick anything the selector will show them, and a probe elsewhere
   * in the garden is a legitimate choice.
   *
   * The supply field carries one extra line, always: its polarity is
   * inverted with respect to its name (`on` means there is NO water), and a
   * user who reads it the other way round configures a zone that refuses to
   * water whenever everything is fine.
   */
  _renderSensorPicker(e, t) {
    const i = t === "leak", s = r(
      e,
      i ? "zone.field_leak_sensor" : "zone.field_water_supply_sensor"
    ), o = i ? this._leakSensor : this._waterSupplySensor, a = cs(e, t, o, this.sensorDiscovery);
    return l`
      <div class="section-label">${s}</div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${{
      entity: { domain: "binary_sensor", device_class: i ? "moisture" : "problem" }
    }}
        .value=${o}
        .label=${s}
        @value-changed=${(d) => {
      i ? this._leakSensor = d.detail.value : this._waterSupplySensor = d.detail.value;
    }}
      ></imc-entity-picker>
      ${a ? l`<div class="field-note">${a}</div>` : p}
      ${i ? p : l`<div class="field-note">
            ${r(e, "zone.water_supply_polarity")}
          </div>`}
    `;
  }
  _renderAdvanced(e) {
    return l`
      <div class="section-label">${r(e, "zone.field_flow_sensor")}</div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${{ entity: { domain: "sensor" } }}
        .value=${this._flowSensor}
        .label=${r(e, "zone.field_flow_sensor")}
        @value-changed=${(t) => this._flowSensor = t.detail.value}
      ></imc-entity-picker>
      ${this._renderFlowUnit(e)}

      ${this._renderSensorPicker(e, "leak")}
      ${this._renderSensorPicker(e, "supply")}

      <div class="section-label">${r(e, "zone.field_flow_nominal")}</div>
      <input
        class="field"
        type="number"
        min="0"
        step="0.1"
        .value=${this._nominalFlowLpm ?? ""}
        @input=${(t) => this._nominalFlowLpm = v(t.target.value)}
      />

      <div class="section-label">${r(e, "zone.field_flow_tolerance")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="100"
        step="1"
        .value=${this._flowTolerancePct ?? ""}
        @input=${(t) => this._flowTolerancePct = v(t.target.value)}
      />

      <div class="section-label">${r(e, "zone.field_adjustment")}</div>
      <input
        class="field"
        type="number"
        min="10"
        max="300"
        step="1"
        .value=${this._adjustmentPct ?? ""}
        @input=${(t) => this._adjustmentPct = v(t.target.value)}
      />

      <div class="section-label">${r(e, "zone.field_order")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="1000"
        step="1"
        .value=${this._order ?? ""}
        @input=${(t) => this._order = v(t.target.value)}
      />

      <div class="section-label">${r(e, "zone.field_group")}</div>
      <input
        class="field"
        type="text"
        .value=${this._compatibilityGroup}
        @input=${(t) => this._compatibilityGroup = t.target.value}
      />
    `;
  }
  _save() {
    if (!this._canSave) return;
    const e = !!this.zone, t = {
      name: this._name.trim(),
      valve_entity: this._valve.trim()
    };
    this._areaM2 !== void 0 && (t.area_m2 = this._areaM2), e && (this._flowSensor.trim() !== "" && (t.flow_sensor = this._flowSensor.trim()), t.flow_sensor_unit = this._flowSensorUnit.trim(), t.leak_sensor = this._leakSensor.trim(), t.water_supply_sensor = this._waterSupplySensor.trim(), this._nominalFlowLpm !== void 0 && (t.nominal_flow_lpm = this._nominalFlowLpm), this._flowTolerancePct !== void 0 && (t.flow_tolerance_pct = this._flowTolerancePct), this._adjustmentPct !== void 0 && (t.adjustment_pct = this._adjustmentPct), this._order !== void 0 && (t.order = this._order), this._compatibilityGroup.trim() !== "" && (t.compatibility_group = this._compatibilityGroup.trim())), this.dispatchEvent(
      new CustomEvent("imc-zone-save", {
        detail: { mode: e ? "update" : "add", zoneId: this.zoneId, patch: t },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _remove() {
    const e = this.zoneId;
    if (!e) return;
    const t = k(this.hass);
    window.confirm(`${r(t, "zone.delete")}?`) && this.dispatchEvent(
      new CustomEvent("imc-zone-remove", {
        detail: { zoneId: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _cancel() {
    this.dispatchEvent(
      new CustomEvent("imc-zone-cancel", { bubbles: !0, composed: !0 })
    );
  }
};
Ye.styles = O`
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .header {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color, #8b93a7);
      margin: 14px 0 6px;
    }
    .field {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #444);
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      font-size: 13px;
      font-family: inherit;
    }
    .field-note {
      margin-top: 6px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #8b93a7);
    }
    .months {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .month {
      min-width: 40px;
      padding: 6px 8px;
      border-radius: 8px;
      text-align: center;
      font-size: 12px;
      background: var(--secondary-background-color, #26262e);
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    .month.on {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
      font-weight: 600;
    }
    .advanced-toggle {
      cursor: pointer;
      user-select: none;
      color: var(--imc-accent, #8ab4ff);
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }
    .buttons button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .buttons button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    .buttons button.danger {
      flex: 0 0 auto;
      background: transparent;
      color: var(--error-color, #db4437);
      border-color: var(--error-color, #db4437);
    }
    .buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
let x = Ye;
E([
  h({ attribute: !1 })
], x.prototype, "hass");
E([
  h({ attribute: !1 })
], x.prototype, "zone");
E([
  h()
], x.prototype, "zoneId");
E([
  h({ attribute: !1 })
], x.prototype, "sensorDiscovery");
E([
  c()
], x.prototype, "_name");
E([
  c()
], x.prototype, "_valve");
E([
  c()
], x.prototype, "_areaM2");
E([
  c()
], x.prototype, "_flowSensor");
E([
  c()
], x.prototype, "_flowSensorUnit");
E([
  c()
], x.prototype, "_leakSensor");
E([
  c()
], x.prototype, "_waterSupplySensor");
E([
  c()
], x.prototype, "_nominalFlowLpm");
E([
  c()
], x.prototype, "_flowTolerancePct");
E([
  c()
], x.prototype, "_adjustmentPct");
E([
  c()
], x.prototype, "_order");
E([
  c()
], x.prototype, "_compatibilityGroup");
E([
  c()
], x.prototype, "_advancedOpen");
L("imc-zone-editor", x);
const us = ["critical", "operational", "informational"], Dt = [
  "watchdog",
  "anomaly",
  "leak",
  "skipped",
  "interrupted",
  "cancelled",
  "completed",
  "sentinel",
  "session_overrun",
  "consumption_budget"
], ps = /* @__PURE__ */ new Set(["send_message"]);
function Rt(n) {
  const e = n.services?.notify;
  return e ? Object.keys(e).filter((t) => !ps.has(t)).sort().map((t) => ({ service: t, label: e[t]?.name || t })) : [];
}
function _s(n, e) {
  const t = Rt(n), i = new Set(t.map((o) => o.service)), s = [...new Set(e)].filter((o) => !i.has(o)).sort().map((o) => ({ service: o, label: o, missing: !0 }));
  return [...t, ...s];
}
function vt(n, e) {
  return n === "recommended" ? [...e.recommended] : n === "critical" ? [...e.groups.critical ?? []] : e.events.map((t) => t.event);
}
function hs(n) {
  const e = n.events.filter((s) => s.enabled), t = [...new Set(e.flatMap((s) => s.services))], i = {};
  for (const s of e)
    s.stored_priority && (i[s.event] = s.stored_priority === "high" ? "high" : "normal");
  return {
    recipients: t,
    events: e.length ? e.map((s) => s.event) : [...n.recommended],
    priorities: i
  };
}
function ms(n) {
  const e = new Set(n.events);
  if (e.size > 0 && n.recipients.length === 0)
    throw new Error("Choose at least one recipient before enabling an event.");
  const t = [], i = /* @__PURE__ */ new Map();
  for (const o of e) {
    const a = n.priorities[o];
    i.set(a, [...i.get(a) ?? [], o]);
  }
  for (const [o, a] of i) {
    const d = {
      events: a,
      enabled: !0,
      services: [...n.recipients]
    };
    o !== void 0 && (d.priority = o), t.push(d);
  }
  const s = Dt.filter((o) => !e.has(o));
  return s.length && t.push({ events: s, enabled: !1 }), t;
}
var vs = Object.defineProperty, y = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, a; o >= 0; o--)
    (a = n[o]) && (s = a(e, t, s) || s);
  return s && vs(e, t, s), s;
};
function $(n, e, t) {
  t !== void 0 && (typeof t == "string" && t.trim() === "" || (n[e] = t));
}
function fs(n) {
  const e = {};
  return $(e, "session_max_min", n.sessionMaxMin), $(e, "must_finish_by", n.mustFinishBy), $(e, "wait_free_min", n.waitFreeMin), $(e, "manual_block_min", n.manualBlockMin), $(e, "settle_pause_s", n.settlePauseS), $(e, "sentinel_time", n.sentinelTime), e;
}
function gs(n) {
  const e = {};
  return $(e, "open_confirm_s", n.openConfirmS), $(e, "close_confirm_s", n.closeConfirmS), $(e, "switch_confirm_s", n.switchConfirmS), $(e, "startup_valve_timeout_s", n.startupValveTimeoutS), $(e, "watchdog_max_min", n.watchdogMaxMin), $(e, "leak_action", n.leakAction), $(e, "leak_threshold_lpm", n.leakThresholdLpm), $(e, "leak_confirm_s", n.leakConfirmS), $(e, "leak_repeat_min", n.leakRepeatMin), $(e, "require_water_supply", n.requireWaterSupply), $(e, "water_supply_confirm_s", n.waterSupplyConfirmS), e;
}
function ys(n) {
  const e = {};
  return $(e, "max_concurrent", n.maxConcurrent), $(e, "compatibility_groups", n.compatibilityGroups?.trim()), $(e, "master_pre_open_s", n.masterPreOpenS), $(e, "master_post_close_s", n.masterPostCloseS), e;
}
const bs = {
  watchdog: "notify.event_watchdog",
  anomaly: "notify.event_anomaly",
  leak: "notify.event_leak",
  skipped: "notify.event_skipped",
  interrupted: "notify.event_interrupted",
  cancelled: "notify.event_cancelled",
  completed: "notify.event_completed",
  sentinel: "notify.event_sentinel",
  session_overrun: "notify.event_session_overrun",
  consumption_budget: "notify.event_consumption_budget"
}, ws = {
  critical: "notify.group_critical",
  operational: "notify.group_operational",
  informational: "notify.group_informational"
}, $s = {
  recommended: "notify.preset_recommended",
  critical: "notify.preset_critical",
  all: "notify.preset_all"
}, xs = ["recommended", "critical", "all"], Ce = [
  "notify.step_recipients",
  "notify.step_events",
  "notify.step_summary"
];
function ie(n) {
  return (e) => {
    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), n());
  };
}
function Pe(n, e) {
  const t = bs[e];
  return t === void 0 ? e : r(n, t);
}
function ks(n, e, t) {
  const i = n.priorities[t];
  return i !== void 0 ? i : e.events.find((o) => o.event === t)?.priority === "high" ? "high" : "normal";
}
function zs(n) {
  return n.events.filter((e) => e.essential && !e.reachable).map((e) => e.event);
}
function Ss(n, e) {
  const t = new Set(n), i = new Set(e);
  return t.size === i.size && [...t].every((s) => i.has(s));
}
const Lt = ["notify", "close", "close_and_block"], Ut = "close", ft = !0, As = { start: "22:00", end: "06:00" };
function Es(n) {
  return n === "reduce" || n === "suspend" ? n : "notify";
}
function gt(n) {
  return Lt.includes(n ?? "") ? n : Ut;
}
const Qe = class Qe extends P {
  constructor() {
    super(...arguments), this.options = {}, this._weatherEntity = "", this._rainSensor = "", this._outdoorTempSensor = "", this._lineFlowSensor = "", this._lineFlowSensorUnit = "", this._masterValve = "", this._action = "notify", this._forbiddenWindows = [], this._sessionOpen = !1, this._valvesOpen = !1, this._session = {}, this._valves = {}, this._concurrency = {}, this.notifyStatusFailed = !1, this.testResults = {}, this.testPending = [], this._wizardStep = 0, this._selection = { recipients: [], events: [], priorities: {} }, this._collapsedGroups = [];
  }
  willUpdate(e) {
    e.has("options") && this._seedFromOptions(), e.has("notifyStatus") && this.notifyStatus && (this._selection = hs(this.notifyStatus), this._saveError = void 0);
  }
  _seedFromOptions() {
    const e = this.options ?? {};
    this._weatherEntity = e.weather_entity ?? "", this._rainSensor = e.rain_sensor ?? "", this._outdoorTempSensor = e.outdoor_temp_sensor ?? "", this._lineFlowSensor = e.line_flow_sensor ?? "", this._lineFlowSensorUnit = e.line_flow_sensor_unit ?? "", this._masterValve = e.master_valve ?? "";
    const t = e.consumption_budget;
    this._litersPerMonth = t?.liters_per_month, this._action = Es(t?.action), this._reducePct = t?.reduce_pct;
    const i = e.restrictions, s = this.options ?? {};
    this._session = {
      sessionMaxMin: s.session_max_min,
      mustFinishBy: s.must_finish_by,
      waitFreeMin: s.wait_free_min,
      manualBlockMin: s.manual_block_min,
      settlePauseS: s.settle_pause_s,
      sentinelTime: s.sentinel_time
    }, this._valves = {
      openConfirmS: s.open_confirm_s,
      closeConfirmS: s.close_confirm_s,
      switchConfirmS: s.switch_confirm_s,
      startupValveTimeoutS: s.startup_valve_timeout_s,
      watchdogMaxMin: s.watchdog_max_min,
      // Unlike every field above, these two are always sent — a select and a
      // checkbox have no "unset" to render — so they are seeded to the
      // backend's own defaults when the hub has never been told. Anything
      // else here and the first save in this drawer would quietly move the
      // installation onto a different leak policy.
      leakAction: gt(s.leak_action),
      leakThresholdLpm: s.leak_threshold_lpm,
      leakConfirmS: s.leak_confirm_s,
      leakRepeatMin: s.leak_repeat_min,
      requireWaterSupply: s.require_water_supply ?? ft,
      waterSupplyConfirmS: s.water_supply_confirm_s
    }, this._concurrency = {
      maxConcurrent: s.max_concurrent,
      compatibilityGroups: s.compatibility_groups,
      masterPreOpenS: s.master_pre_open_s,
      masterPostCloseS: s.master_post_close_s
    }, this._forbiddenWindows = i?.forbidden_windows ? i.forbidden_windows.map((o) => ({ ...o })) : [];
  }
  get _canSaveWeather() {
    return this._weatherEntity.trim() !== "";
  }
  /**
   * An optional entity field: the native `<ha-selector>` offers no reliable,
   * discoverable way to empty a value once set, so we render an explicit
   * "Clear" link (shown only when there IS a value) that sets the field back
   * to `""`. Saving then sends `""`, which `set_weather_sources` treats as
   * "clear this key" — restoring e.g. the weather entity's own temperature.
   */
  _optionalPicker(e, t, i, s, o) {
    const a = r(e, t);
    return l`
      <div class="section-label opt-label">
        <span>${a}</span>
        ${i ? l`<span
              class="clear-link"
              role="button"
              tabindex="0"
              @click=${() => o("")}
              @keydown=${ie(() => o(""))}
              >✕ ${r(e, "settings.clear")}</span
            >` : p}
      </div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${s}
        .value=${i}
        .label=${a}
        @value-changed=${(d) => o(d.detail.value)}
      ></imc-entity-picker>
    `;
  }
  /**
   * `set_weather_sources` already drops a stored line-meter unit whenever the
   * line meter itself is cleared — an override that outlived its sensor would
   * silently apply to whatever sensor is configured next. Mirror that here so
   * the form shows what the save will actually do.
   */
  _setLineFlowSensor(e) {
    this._lineFlowSensor = e, e.trim() === "" && (this._lineFlowSensorUnit = "");
  }
  /**
   * The unit the line meter reports in, under the picker it belongs to.
   * Rendered only once a meter is chosen (see `_setLineFlowSensor`), and
   * offering "detected from the entity" as a real option: saving it sends
   * `""`, which `set_weather_sources` reads as "clear the override".
   */
  _renderLineFlowUnit(e) {
    const t = this._lineFlowSensor.trim();
    if (t === "") return p;
    const i = this.hass ? Ot(this.hass, t) : void 0, s = r(e, "settings.field_line_flow_unit"), o = this._lineFlowSensorUnit;
    return l`
      <div class="section-label">${s}</div>
      <select
        class="field"
        aria-label=${s}
        @change=${(a) => this._lineFlowSensorUnit = a.target.value}
      >
        <option value="" ?selected=${o === ""}>
          ${r(e, "zone.flow_unit_auto")}
        </option>
        ${xe.map(
      (a) => l`<option value=${a} ?selected=${o === a}>${a}</option>`
    )}
      </select>
      <div class="field-note">${Ft(e, this._lineFlowSensorUnit, i)}</div>
    `;
  }
  render() {
    const e = k(this.hass);
    return l`
      <div class="topbar">
        <span class="back" @click=${this._back}>‹ ${r(e, "wizard.back")}</span>
        <span class="title">${r(e, "settings.title")}</span>
      </div>

      ${this._renderWeatherSection(e)} ${this._renderBudgetSection(e)}
      ${this._renderRestrictionsSection(e)} ${this._renderNotificationsSection(e)}
      ${this._renderSessionDrawer(e)} ${this._renderValvesDrawer(e)}

      <div class="advanced-note">▸ ${r(e, "settings.advanced_note")}</div>
    `;
  }
  _renderWeatherSection(e) {
    return l`
      <div class="sec">
        <div class="header">🌦️ ${r(e, "settings.weather")}</div>

        <div class="section-label">${r(e, "settings.weather_entity")}</div>
        <imc-entity-picker
          .hass=${this.hass}
          .selector=${{ entity: { domain: "weather" } }}
          .value=${this._weatherEntity}
          .label=${r(e, "settings.weather_entity")}
          @value-changed=${(t) => this._weatherEntity = t.detail.value}
        ></imc-entity-picker>

        <div class="two">
          <div>
            ${this._optionalPicker(
      e,
      "settings.rain",
      this._rainSensor,
      { entity: { domain: "sensor" } },
      (t) => this._rainSensor = t
    )}
          </div>
          <div>
            ${this._optionalPicker(
      e,
      "settings.outdoor_temp",
      this._outdoorTempSensor,
      { entity: { domain: "sensor" } },
      (t) => this._outdoorTempSensor = t
    )}
          </div>
        </div>

        <div class="two">
          <div>
            ${this._optionalPicker(
      e,
      "settings.line_flow",
      this._lineFlowSensor,
      { entity: { domain: "sensor" } },
      (t) => this._setLineFlowSensor(t)
    )}
            ${this._renderLineFlowUnit(e)}
          </div>
          <div>
            ${this._optionalPicker(
      e,
      "settings.master_valve",
      this._masterValve,
      { entity: { domain: ["valve", "switch"] } },
      (t) => this._masterValve = t
    )}
          </div>
        </div>

        <div class="buttons">
          <button
            class="primary"
            type="button"
            ?disabled=${!this._canSaveWeather}
            @click=${this._saveWeather}
          >
            ${r(e, "editor.save")}
          </button>
        </div>
      </div>
    `;
  }
  _renderBudgetSection(e) {
    return l`
      <div class="sec">
        <div class="header">🚰 ${r(e, "settings.budget")}</div>

        <div class="two">
          <div>
            <div class="section-label">${r(e, "settings.liters")}</div>
            <input
              class="field"
              type="number"
              min="0"
              step="1"
              .value=${this._litersPerMonth ?? ""}
              @input=${(t) => this._litersPerMonth = v(t.target.value)}
            />
          </div>
          <div>
            <div class="section-label">${r(e, "settings.on_exceed")}</div>
            <span class="seg">
              <span
                class="${this._action === "notify" ? "sel" : ""}"
                @click=${() => this._action = "notify"}
                >${r(e, "settings.action_notify")}</span
              >
              <span
                class="${this._action === "reduce" ? "sel" : ""}"
                @click=${() => this._action = "reduce"}
                >${r(e, "settings.action_reduce")}</span
              >
              <span
                class="${this._action === "suspend" ? "sel" : ""}"
                @click=${() => this._action = "suspend"}
                >${r(e, "settings.action_suspend")}</span
              >
            </span>
          </div>
        </div>

        ${this._action === "reduce" ? l`
              <div class="section-label">${r(e, "settings.reduce_pct")}</div>
              <input
                class="field"
                type="number"
                min="1"
                max="100"
                step="1"
                .value=${this._reducePct ?? ""}
                @input=${(t) => this._reducePct = v(t.target.value)}
              />
            ` : p}

        <div class="buttons">
          <button class="primary" type="button" @click=${this._saveBudget}>
            ${r(e, "editor.save")}
          </button>
        </div>
      </div>
    `;
  }
  _renderRestrictionsSection(e) {
    return l`
      <div class="sec">
        <div class="header">🕑 ${r(e, "settings.restrictions")}</div>
        <div class="hint">${r(e, "settings.restrictions_hours_only")}</div>

        <div class="section-label">${r(e, "settings.forbidden_windows")}</div>
        ${this._forbiddenWindows.map(
      (t, i) => l`
            <div class="window-row">
              <input
                class="field"
                type="time"
                .value=${t.start}
                @input=${(s) => this._updateWindow(i, "start", s.target.value)}
              />
              <span class="window-sep">–</span>
              <input
                class="field"
                type="time"
                .value=${t.end}
                @input=${(s) => this._updateWindow(i, "end", s.target.value)}
              />
              <button
                class="icon-btn"
                type="button"
                @click=${() => this._removeWindow(i)}
                aria-label="remove"
              >
                ✕
              </button>
            </div>
          `
    )}
        <button class="add-window" type="button" @click=${this._addWindow}>＋</button>

        <div class="buttons">
          <button class="primary" type="button" @click=${this._saveRestrictions}>
            ${r(e, "editor.save")}
          </button>
        </div>
      </div>
    `;
  }
  _updateWindow(e, t, i) {
    this._forbiddenWindows = this._forbiddenWindows.map(
      (s, o) => o === e ? { ...s, [t]: i } : s
    );
  }
  _addWindow() {
    this._forbiddenWindows = [...this._forbiddenWindows, { ...As }];
  }
  _removeWindow(e) {
    this._forbiddenWindows = this._forbiddenWindows.filter((t, i) => i !== e);
  }
  /**
   * `set_weather_sources` MERGES its patch into existing options (unlike
   * the budget/restrictions services below, which replace their whole
   * section) — an omitted key there just means "leave unchanged". Sending
   * `""` for a cleared optional is therefore how the user actually clears
   * it; omitting the key instead would silently leave the old value in
   * place. `weather_entity` is always sent (required, non-empty — guarded
   * by `_canSaveWeather`/the disabled Save button).
   */
  _saveWeather() {
    if (!this._canSaveWeather) return;
    const e = {
      weather_entity: this._weatherEntity.trim(),
      rain_sensor: this._rainSensor.trim(),
      outdoor_temp_sensor: this._outdoorTempSensor.trim(),
      line_flow_sensor: this._lineFlowSensor.trim(),
      line_flow_sensor_unit: this._lineFlowSensorUnit.trim(),
      master_valve: this._masterValve.trim()
    };
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-weather", {
        detail: e,
        bubbles: !0,
        composed: !0
      })
    );
  }
  /**
   * `set_consumption_budget` REPLACES the whole `consumption_budget`
   * section — any field left out of the payload is cleared. This always
   * sends the full working state (`action` always; `liters_per_month`/
   * `reduce_pct` when set) rather than a partial diff.
   */
  _saveBudget() {
    const e = { action: this._action };
    this._litersPerMonth !== void 0 && (e.liters_per_month = this._litersPerMonth), this._action === "reduce" && this._reducePct !== void 0 && (e.reduce_pct = this._reducePct), this.dispatchEvent(
      new CustomEvent("imc-settings-save-budget", {
        detail: e,
        bubbles: !0,
        composed: !0
      })
    );
  }
  /**
   * `set_restrictions` REPLACES the whole `restrictions` section, so this
   * always sends the full current weekday set / parity / windows — never a
   * diff. All 7 (or 0) weekdays selected serializes as `[]`, mirroring the
   * "empty = every day allowed" convention used by `set_restrictions` and
   * the program schedule elsewhere in the panel.
   */
  _saveRestrictions() {
    const e = {
      forbidden_windows: this._forbiddenWindows.map((t) => ({ start: t.start, end: t.end }))
    };
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-restrictions", {
        detail: e,
        bubbles: !0,
        composed: !0
      })
    );
  }
  /** A labelled number input that reports its unit and its default. */
  _num(e, t, i, s) {
    return l`
      <div class="section-label">${e}</div>
      <input
        class="field"
        type="number"
        .value=${i ?? ""}
        @input=${(o) => s(v(o.target.value))}
      />
      <div class="hint">${t}</div>
    `;
  }
  /**
   * The guided path: who receives them, what to send, confirm. A recipient
   * is PICKED from the notify services the instance actually has, never
   * typed — the field this replaces carried a `notify.mobile_app_phone`
   * placeholder, which the integration then invoked as
   * `notify.notify.mobile_app_phone` and which therefore never arrived.
   */
  _renderNotificationsSection(e) {
    const t = this.notifyStatus;
    return t ? l`
      <div class="sec">
        <div class="header">🔔 ${r(e, "settings.notifications")}</div>
        ${t.verdict === "ok" ? p : this._renderMuteBanner(e, t)}
        <div class="steps">
          ${Ce.map(
      (i, s) => l`<span class="step ${s === this._wizardStep ? "on" : ""}"
                >${s + 1}. ${r(e, i)}</span
              >`
    )}
        </div>
        ${this._wizardStep === 0 ? this._renderRecipients(e) : p}
        ${this._wizardStep === 1 ? this._renderEvents(e, t) : p}
        ${this._wizardStep === 2 ? this._renderSummary(e) : p}
        ${this._renderWizardNav(e)}
      </div>
    ` : l`
        <div class="sec">
          <div class="header">🔔 ${r(e, "settings.notifications")}</div>
          ${this.notifyStatusFailed ? l`
                <div class="notify-error">${r(e, "notify.load_failed")}</div>
                <button class="link-btn" type="button" @click=${this._retryNotifyStatus}>
                  ${r(e, "notify.retry")}
                </button>
              ` : l`<div class="notify-hint">${r(e, "notify.loading")}</div>`}
        </div>
      `;
  }
  /**
   * What will not arrive. The verdict is the backend's, never recomputed
   * here: `silent` means no essential event has a working recipient at all,
   * `partial` means some of them do and the banner names the rest.
   */
  _renderMuteBanner(e, t) {
    const i = zs(t).map((s) => Pe(e, s)).join(", ");
    return l`
      <div class="notify-banner">
        ${t.verdict === "silent" ? l`
              <div class="notify-banner-title">${r(e, "notify.mute_title")}</div>
              <div>${r(e, "notify.mute_body")}</div>
            ` : l`<div>${r(e, "notify.partial_body", { events: i })}</div>`}
        <button class="link-btn" type="button" @click=${() => this._goToStep(0)}>
          ${r(e, "notify.configure")}
        </button>
      </div>
    `;
  }
  /**
   * Step 1. The list is the instance's own notify services, so a recipient
   * that cannot exist cannot be chosen. Each one can be proved before it
   * matters: `test_notification` reports per recipient whether the message
   * actually left.
   *
   * A recipient that is still stored but has vanished from the instance is
   * listed too, marked as gone: it has no service to test, but it needs the
   * checkbox, because unchecking it is the only way to stop Save from writing
   * it back and its ERROR repair from re-raising.
   */
  _renderRecipients(e) {
    const t = this.hass ? _s(this.hass, this._selection.recipients) : [];
    return t.length === 0 ? l`<div class="notify-hint">${r(e, "notify.no_recipients")}</div>` : l`
      <div class="section-label">${r(e, "notify.step_recipients")}</div>
      ${t.map((i) => {
      const s = this.testPending.includes(i.service), o = this.testResults[i.service];
      return l`
          <div class="notify-row">
            <label class="check-row">
              <input
                type="checkbox"
                .checked=${this._selection.recipients.includes(i.service)}
                @change=${() => this._toggleRecipient(i.service)}
              />
              <span>${i.label}</span>
            </label>
            ${i.missing ? l`<span class="recipient-gone">${r(e, "notify.recipient_gone")}</span>` : l`
                  <button
                    class="link-btn"
                    type="button"
                    ?disabled=${s}
                    @click=${() => this._sendTest(i.service)}
                  >
                    ${r(e, "notify.send_test")}
                  </button>
                `}
            ${s ? l`<span class="test-result">… ${r(e, "notify.test_sending")}</span>` : o === void 0 ? p : l`<span class="test-result ${o.sent ? "ok" : "fail"}"
                    >${o.sent ? `✓ ${r(e, "notify.test_ok")}` : `✗ ${r(e, "notify.test_failed", { error: o.error ?? "" })}`}</span
                  >`}
          </div>
        `;
    })}
      ${t.some((i) => i.missing) ? l`<div class="notify-hint">${r(e, "notify.recipient_gone_hint")}</div>` : p}
    `;
  }
  /** Step 2: a preset in one click, or the three groups browsed by hand. */
  _renderEvents(e, t) {
    return l`
      <div class="section-label">${r(e, "notify.step_events")}</div>
      <span class="seg">
        ${xs.map((i) => {
      const s = Ss(this._selection.events, vt(i, t));
      return l`<span
            class="${s ? "sel" : ""}"
            role="button"
            tabindex="0"
            aria-pressed=${s ? "true" : "false"}
            @click=${() => this._applyPreset(i, t)}
            @keydown=${ie(() => this._applyPreset(i, t))}
            >${r(e, $s[i])}</span
          >`;
    })}
      </span>
      ${us.map((i) => this._renderEventGroup(e, i, t))}
    `;
  }
  _renderEventGroup(e, t, i) {
    const s = !this._collapsedGroups.includes(t), o = i.groups[t] ?? [];
    return l`
      <div
        class="group-header"
        role="button"
        tabindex="0"
        aria-expanded=${s ? "true" : "false"}
        @click=${() => this._toggleGroup(t)}
        @keydown=${ie(() => this._toggleGroup(t))}
      >
        ${s ? "▾" : "▸"} ${r(e, ws[t])}
      </div>
      ${s ? o.map((a) => this._renderEventRow(e, a, i)) : p}
    `;
  }
  _renderEventRow(e, t, i) {
    const s = ks(this._selection, i, t);
    return l`
      <div class="notify-row">
        <label class="check-row">
          <input
            type="checkbox"
            .checked=${this._selection.events.includes(t)}
            @change=${() => this._toggleEvent(t)}
          />
          <span>${Pe(e, t)}</span>
        </label>
        <span class="seg small">
          <span
            class="${s === "high" ? "sel" : ""}"
            role="button"
            tabindex="0"
            aria-pressed=${s === "high" ? "true" : "false"}
            @click=${() => this._setPriority(t, "high")}
            @keydown=${ie(() => this._setPriority(t, "high"))}
            >${r(e, "notify.priority_high")}</span
          >
          <span
            class="${s === "normal" ? "sel" : ""}"
            role="button"
            tabindex="0"
            aria-pressed=${s === "normal" ? "true" : "false"}
            @click=${() => this._setPriority(t, "normal")}
            @keydown=${ie(() => this._setPriority(t, "normal"))}
            >${r(e, "notify.priority_normal")}</span
          >
        </span>
      </div>
    `;
  }
  /** Step 3: exactly what Save will write, in the backend's own event order. */
  _renderSummary(e) {
    const t = new Map(
      (this.hass ? Rt(this.hass) : []).map((s) => [s.service, s.label])
    ), i = Dt.filter((s) => this._selection.events.includes(s));
    return l`
      <div class="section-label">${r(e, "notify.step_recipients")}</div>
      <div class="summary">
        ${this._selection.recipients.map((s) => t.get(s) ?? s).join(", ") || "—"}
      </div>
      <div class="section-label">${r(e, "notify.step_events")}</div>
      <div class="summary">
        ${i.length === 0 ? "—" : i.map((s) => Pe(e, s)).join(", ")}
      </div>
      ${this._saveError ? l`<div class="notify-error">${this._saveError}</div>` : p}
    `;
  }
  _renderWizardNav(e) {
    return l`
      <div class="buttons">
        ${this._wizardStep > 0 ? l`<button type="button" @click=${() => this._goToStep(this._wizardStep - 1)}>
              ${r(e, "notify.back")}
            </button>` : p}
        ${this._wizardStep < Ce.length - 1 ? l`<button
              class="primary"
              type="button"
              @click=${() => this._goToStep(this._wizardStep + 1)}
            >
              ${r(e, "notify.next")}
            </button>` : l`<button class="primary" type="button" @click=${() => this._saveNotifications(e)}>
              ${r(e, "notify.save")}
            </button>`}
      </div>
    `;
  }
  _goToStep(e) {
    this._wizardStep = Math.min(Ce.length - 1, Math.max(0, e)), this._saveError = void 0;
  }
  _toggleRecipient(e) {
    const t = this._selection.recipients;
    this._selection = {
      ...this._selection,
      recipients: t.includes(e) ? t.filter((i) => i !== e) : [...t, e]
    };
  }
  _toggleEvent(e) {
    const t = this._selection.events;
    this._selection = {
      ...this._selection,
      events: t.includes(e) ? t.filter((i) => i !== e) : [...t, e]
    };
  }
  _toggleGroup(e) {
    this._collapsedGroups = this._collapsedGroups.includes(e) ? this._collapsedGroups.filter((t) => t !== e) : [...this._collapsedGroups, e];
  }
  _applyPreset(e, t) {
    this._selection = { ...this._selection, events: vt(e, t) };
  }
  /**
   * The ONLY writer of `priorities` — see `effectiveNotifyPriority` above
   * for why nothing else may add an entry.
   */
  _setPriority(e, t) {
    this._selection = {
      ...this._selection,
      priorities: { ...this._selection.priorities, [e]: t }
    };
  }
  /** Ask the panel to read `notification_status` again after a failed read. */
  _retryNotifyStatus() {
    this.dispatchEvent(
      new CustomEvent("imc-settings-retry-notifications", {
        bubbles: !0,
        composed: !0
      })
    );
  }
  _sendTest(e) {
    this.dispatchEvent(
      new CustomEvent("imc-settings-test-notification", {
        detail: { services: [e] },
        bubbles: !0,
        composed: !0
      })
    );
  }
  /**
   * `buildSaveCalls` refuses a selection that enables an event with nowhere
   * to send it — the same refusal `set_notifications` makes server-side.
   * Catching it here keeps the user in the wizard with an explanation,
   * instead of a service-error toast over a form they can no longer see.
   */
  _saveNotifications(e) {
    let t;
    try {
      t = ms(this._selection);
    } catch {
      this._saveError = r(e, "notify.needs_recipient");
      return;
    }
    this._saveError = void 0, this.dispatchEvent(
      new CustomEvent("imc-settings-save-notifications", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _renderSessionDrawer(e) {
    return l`
      <div class="sec">
        <div
          class="header advanced-toggle"
          @click=${() => this._sessionOpen = !this._sessionOpen}
        >
          ${this._sessionOpen ? "▾" : "▸"} ${r(e, "settings.session_safety")}
        </div>
        ${this._sessionOpen ? l`
              ${this._num(
      r(e, "settings.session_max_min"),
      r(e, "settings.session_max_min_hint"),
      this._session.sessionMaxMin,
      (t) => this._session = { ...this._session, sessionMaxMin: t }
    )}
              <div class="section-label">${r(e, "settings.must_finish_by")}</div>
              <input
                class="field"
                type="time"
                .value=${this._session.mustFinishBy ?? ""}
                @input=${(t) => this._session = {
      ...this._session,
      mustFinishBy: t.target.value
    }}
              />
              ${this._num(
      r(e, "settings.wait_free_min"),
      r(e, "settings.wait_free_min_hint"),
      this._session.waitFreeMin,
      (t) => this._session = { ...this._session, waitFreeMin: t }
    )}
              ${this._num(
      r(e, "settings.manual_block_min"),
      r(e, "settings.manual_block_min_hint"),
      this._session.manualBlockMin,
      (t) => this._session = { ...this._session, manualBlockMin: t }
    )}
              ${this._num(
      r(e, "settings.settle_pause_s"),
      r(e, "settings.settle_pause_s_hint"),
      this._session.settlePauseS,
      (t) => this._session = { ...this._session, settlePauseS: t }
    )}
              <div class="section-label">${r(e, "settings.sentinel_time")}</div>
              <input
                class="field"
                type="time"
                .value=${this._session.sentinelTime ?? ""}
                @input=${(t) => this._session = {
      ...this._session,
      sentinelTime: t.target.value
    }}
              />
              <button class="primary" @click=${this._saveSessionLimits}>
                ${r(e, "editor.save")}
              </button>
            ` : p}
      </div>
    `;
  }
  _renderValvesDrawer(e) {
    return l`
      <div class="sec">
        <div class="header advanced-toggle" @click=${() => this._valvesOpen = !this._valvesOpen}>
          ${this._valvesOpen ? "▾" : "▸"} ${r(e, "settings.valves_concurrency")}
        </div>
        ${this._valvesOpen ? l`
              ${this._num(
      r(e, "settings.open_confirm_s"),
      r(e, "settings.open_confirm_s_hint"),
      this._valves.openConfirmS,
      (t) => this._valves = { ...this._valves, openConfirmS: t }
    )}
              ${this._num(
      r(e, "settings.close_confirm_s"),
      r(e, "settings.close_confirm_s_hint"),
      this._valves.closeConfirmS,
      (t) => this._valves = { ...this._valves, closeConfirmS: t }
    )}
              ${this._num(
      r(e, "settings.switch_confirm_s"),
      r(e, "settings.switch_confirm_s_hint"),
      this._valves.switchConfirmS,
      (t) => this._valves = { ...this._valves, switchConfirmS: t }
    )}
              ${this._num(
      r(e, "settings.startup_valve_timeout_s"),
      r(e, "settings.startup_valve_timeout_s_hint"),
      this._valves.startupValveTimeoutS,
      (t) => this._valves = { ...this._valves, startupValveTimeoutS: t }
    )}
              ${this._num(
      r(e, "settings.watchdog_max_min"),
      r(e, "settings.watchdog_max_min_hint"),
      this._valves.watchdogMaxMin,
      (t) => this._valves = { ...this._valves, watchdogMaxMin: t }
    )}
              ${this._num(
      r(e, "settings.max_concurrent"),
      r(e, "settings.max_concurrent_hint"),
      this._concurrency.maxConcurrent,
      (t) => this._concurrency = { ...this._concurrency, maxConcurrent: t }
    )}
              <div class="section-label">${r(e, "settings.compatibility_groups")}</div>
              <input
                class="field"
                type="text"
                .value=${this._concurrency.compatibilityGroups ?? ""}
                @input=${(t) => this._concurrency = {
      ...this._concurrency,
      compatibilityGroups: t.target.value
    }}
              />
              <div class="hint">${r(e, "settings.compatibility_groups_hint")}</div>
              ${this._num(
      r(e, "settings.master_pre_open_s"),
      r(e, "settings.master_pre_open_s_hint"),
      this._concurrency.masterPreOpenS,
      (t) => this._concurrency = { ...this._concurrency, masterPreOpenS: t }
    )}
              ${this._num(
      r(e, "settings.master_post_close_s"),
      r(e, "settings.master_post_close_s_hint"),
      this._concurrency.masterPostCloseS,
      (t) => this._concurrency = { ...this._concurrency, masterPostCloseS: t }
    )}
              ${this._renderLeakFields(e)}
              <button class="primary" @click=${this._saveValveSafety}>
                ${r(e, "editor.save")}
              </button>
            ` : p}
      </div>
    `;
  }
  /**
   * Leak detection and the water-supply gate, inside the same drawer as the
   * valve confirmations they belong with. Everything here is written by
   * `set_valve_safety`, so one Save covers the lot.
   *
   * The action is a `<select>` whose selection lives on its options rather
   * than in a `.value` binding, for the reason spelled out in the zone
   * editor's `_renderFlowUnit`: lit-html commits an element's own bindings
   * before its children exist, so `.value` would be assigned against an
   * empty option list and fall back to the first entry — which here means
   * the control would silently disagree with what is stored.
   */
  _renderLeakFields(e) {
    const t = r(e, "settings.leak_action"), i = this._valves.leakAction ?? Ut, s = r(e, "settings.require_water_supply");
    return l`
      <div class="section-label">${t}</div>
      <select
        class="field"
        aria-label=${t}
        @change=${(o) => this._valves = {
      ...this._valves,
      leakAction: gt(o.target.value)
    }}
      >
        ${Lt.map(
      (o) => l`<option value=${o} ?selected=${i === o}>
            ${r(e, `settings.leak_action_${o}`)}
          </option>`
    )}
      </select>
      <div class="hint">${r(e, "settings.leak_action_hint")}</div>

      ${this._num(
      r(e, "settings.leak_threshold_lpm"),
      r(e, "settings.leak_threshold_lpm_hint"),
      this._valves.leakThresholdLpm,
      (o) => this._valves = { ...this._valves, leakThresholdLpm: o }
    )}
      ${this._num(
      r(e, "settings.leak_confirm_s"),
      r(e, "settings.leak_confirm_s_hint"),
      this._valves.leakConfirmS,
      (o) => this._valves = { ...this._valves, leakConfirmS: o }
    )}
      ${this._num(
      r(e, "settings.leak_repeat_min"),
      r(e, "settings.leak_repeat_min_hint"),
      this._valves.leakRepeatMin,
      (o) => this._valves = { ...this._valves, leakRepeatMin: o }
    )}

      <label class="section-label">
        <input
          type="checkbox"
          .checked=${this._valves.requireWaterSupply ?? ft}
          @change=${(o) => this._valves = {
      ...this._valves,
      requireWaterSupply: o.target.checked
    }}
        />
        ${s}
      </label>
      <div class="hint">${r(e, "settings.require_water_supply_hint")}</div>
      ${this._num(
      r(e, "settings.water_supply_confirm_s"),
      r(e, "settings.water_supply_confirm_s_hint"),
      this._valves.waterSupplyConfirmS,
      (o) => this._valves = { ...this._valves, waterSupplyConfirmS: o }
    )}
    `;
  }
  _saveSessionLimits() {
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-session-limits", {
        detail: fs(this._session),
        bubbles: !0,
        composed: !0
      })
    );
  }
  _saveValveSafety() {
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-valve-safety", {
        detail: gs(this._valves),
        bubbles: !0,
        composed: !0
      })
    ), this.dispatchEvent(
      new CustomEvent("imc-settings-save-concurrency", {
        detail: ys(this._concurrency),
        bubbles: !0,
        composed: !0
      })
    );
  }
  _back() {
    this.dispatchEvent(new CustomEvent("imc-settings-back", { bubbles: !0, composed: !0 }));
  }
};
Qe.styles = O`
    :host {
      display: block;
    }
    .topbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px 0 12px;
    }
    .back {
      font-size: 13px;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .title {
      font-size: 15px;
      font-weight: 600;
    }
    .sec {
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 10px;
    }
    .header {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color, #8b93a7);
      margin: 14px 0 6px;
    }
    .section-label:first-of-type {
      margin-top: 10px;
    }
    .section-label.opt-label {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    .clear-link {
      font-size: 11px;
      text-transform: none;
      letter-spacing: 0;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .field {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #444);
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      font-size: 13px;
      font-family: inherit;
    }
    .field-note {
      margin-top: 6px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #8b93a7);
    }
    .two {
      display: flex;
      gap: 10px;
    }
    .two > div {
      flex: 1;
      min-width: 0;
    }
    .days {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .day {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      background: var(--secondary-background-color, #26262e);
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    .day.on {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
      font-weight: 600;
    }
    .seg {
      display: inline-flex;
      flex-wrap: wrap;
      background: var(--secondary-background-color, #26262e);
      border-radius: 10px;
      padding: 3px;
      gap: 2px;
    }
    .seg span {
      font-size: 12px;
      padding: 6px 12px;
      border-radius: 8px;
      color: var(--secondary-text-color, #aab);
      cursor: pointer;
      user-select: none;
    }
    .seg span.sel {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
    }
    .window-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .window-row input[type="time"] {
      width: auto;
      flex: 1;
    }
    .window-sep {
      color: var(--secondary-text-color, #8b93a7);
    }
    .icon-btn {
      border: none;
      background: transparent;
      color: var(--error-color, #db4437);
      cursor: pointer;
      font-size: 14px;
      padding: 4px 6px;
    }
    .add-window {
      margin-top: 8px;
      border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.4));
      background: transparent;
      color: var(--imc-accent, #3a6df0);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12.5px;
      cursor: pointer;
    }
    .buttons {
      display: flex;
      gap: 10px;
      margin-top: 16px;
    }
    .buttons button {
      flex: 1;
      padding: 8px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      background: var(--card-background-color, #fff);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .buttons button.primary {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
      border-color: transparent;
    }
    .buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .advanced-note {
      margin-top: 12px;
      padding: 0 2px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #8b93a7);
    }
    .notify-hint {
      margin-top: 8px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #8b93a7);
    }
    .notify-error {
      margin-top: 10px;
      font-size: 12.5px;
      color: var(--error-color, #db4437);
    }
    .notify-banner {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 12.5px;
      background: color-mix(in srgb, var(--error-color, #db4437) 12%, transparent);
      border: 1px solid var(--error-color, #db4437);
    }
    .notify-banner-title {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .steps {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 14px 0 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color, #8b93a7);
    }
    .step.on {
      color: var(--imc-accent, #3a6df0);
      font-weight: 600;
    }
    .notify-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin: 7px 0;
    }
    .check-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 150px;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
      overflow-wrap: anywhere;
    }
    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      flex: none;
      accent-color: var(--imc-accent, #3a6df0);
      cursor: pointer;
    }
    .link-btn {
      border: none;
      background: transparent;
      color: var(--imc-accent, #3a6df0);
      font: inherit;
      font-size: 12px;
      padding: 0;
      cursor: pointer;
    }
    .notify-banner .link-btn {
      margin-top: 6px;
    }
    .link-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .recipient-gone {
      font-size: 12px;
      color: var(--error-color, #db4437);
    }
    .test-result {
      font-size: 12px;
      overflow-wrap: anywhere;
    }
    .test-result.ok {
      color: var(--success-color, #1f9d55);
    }
    .test-result.fail {
      color: var(--error-color, #db4437);
    }
    .group-header {
      margin-top: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
    }
    .seg.small span {
      font-size: 11px;
      padding: 4px 9px;
    }
    .summary {
      font-size: 13px;
      overflow-wrap: anywhere;
    }
  `;
let f = Qe;
y([
  h({ attribute: !1 })
], f.prototype, "hass");
y([
  h({ attribute: !1 })
], f.prototype, "options");
y([
  c()
], f.prototype, "_weatherEntity");
y([
  c()
], f.prototype, "_rainSensor");
y([
  c()
], f.prototype, "_outdoorTempSensor");
y([
  c()
], f.prototype, "_lineFlowSensor");
y([
  c()
], f.prototype, "_lineFlowSensorUnit");
y([
  c()
], f.prototype, "_masterValve");
y([
  c()
], f.prototype, "_litersPerMonth");
y([
  c()
], f.prototype, "_action");
y([
  c()
], f.prototype, "_reducePct");
y([
  c()
], f.prototype, "_forbiddenWindows");
y([
  c()
], f.prototype, "_sessionOpen");
y([
  c()
], f.prototype, "_valvesOpen");
y([
  c()
], f.prototype, "_session");
y([
  c()
], f.prototype, "_valves");
y([
  c()
], f.prototype, "_concurrency");
y([
  h({ attribute: !1 })
], f.prototype, "notifyStatus");
y([
  h({ attribute: !1 })
], f.prototype, "notifyStatusFailed");
y([
  h({ attribute: !1 })
], f.prototype, "testResults");
y([
  h({ attribute: !1 })
], f.prototype, "testPending");
y([
  c()
], f.prototype, "_wizardStep");
y([
  c()
], f.prototype, "_selection");
y([
  c()
], f.prototype, "_collapsedGroups");
y([
  c()
], f.prototype, "_saveError");
L("imc-settings-view", f);
function Ms(n) {
  const e = JSON.parse(n);
  return { options: e.options ?? {}, zones: e.zones ?? {} };
}
var Cs = Object.defineProperty, C = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, a; o >= 0; o--)
    (a = n[o]) && (s = a(e, t, s) || s);
  return s && Cs(e, t, s), s;
};
function yt(n) {
  return n.mode === "interval" ? { calendar_mode: "interval", interval_days: n.interval_days } : n.mode === "parity" ? { calendar_mode: "parity", parity: n.parity } : { calendar_mode: "weekdays", days: n.days };
}
function Ps(n) {
  if (typeof n != "object" || n === null || Array.isArray(n)) return;
  const e = {};
  for (const [t, i] of Object.entries(n)) {
    if (typeof i != "object" || i === null) return;
    const { sent: s, error: o } = i;
    if (typeof s != "boolean") return;
    e[t] = { sent: s, error: typeof o == "string" ? o : null };
  }
  return e;
}
function Ts(n) {
  if (typeof n != "object" || n === null || Array.isArray(n)) return;
  const e = n, t = {};
  for (const i of [
    "leak_sensor",
    "water_supply_sensor",
    "leak_candidate",
    "supply_candidate"
  ]) {
    const s = e[i];
    typeof s == "string" && s !== "" && (t[i] = s);
  }
  return t;
}
const Xe = class Xe extends P {
  constructor() {
    super(...arguments), this.narrow = !1, this._view = "zones", this._notifyStatusFailed = !1, this._testResults = {}, this._testPending = [], this._relevantIds = [], this._statesCount = 0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._errorTimer !== void 0 && (window.clearTimeout(this._errorTimer), this._errorTimer = void 0), this._noticeTimer !== void 0 && (window.clearTimeout(this._noticeTimer), this._noticeTimer = void 0);
  }
  /* ------------------------------------------------------------ */
  /* Actions → services                                            */
  /* ------------------------------------------------------------ */
  async _call(e, t, i, s = !1) {
    if (this.hass)
      try {
        return await this.hass.callService(e, t, i, void 0, !1, s);
      } catch (o) {
        const a = o instanceof Error ? o.message : String(o);
        this._showError(a);
        return;
      }
  }
  /** Surface a message in the `_error` toast, auto-dismissed after 6s — shared
   *  by `_call`'s failure path and any other spot (e.g. `_onEditZone`) that
   *  needs to report a non-`_call` failure the same way. */
  _showError(e) {
    this._error = e, this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
      this._error = void 0, this._errorTimer = void 0;
    }, 6e3);
  }
  /** Surface a message in the `_notice` toast, auto-dismissed after 3s — the
   *  success-side counterpart to `_showError` above, called after a save
   *  actually succeeds (never on failure — the `_error` toast already covers
   *  that). */
  _showNotice(e) {
    this._notice = e, this._noticeTimer !== void 0 && window.clearTimeout(this._noticeTimer), this._noticeTimer = window.setTimeout(() => {
      this._notice = void 0, this._noticeTimer = void 0;
    }, 3e3);
  }
  /**
   * Full-config snapshot, used to seed the zone editor with every field
   * (including the advanced ones `discover()`'s entity-attribute model
   * doesn't surface). `export_config` is a response service returning a
   * JSON string payload — nested under `res.response["payload"]`, same
   * shape as the other response services above.
   */
  async _readConfig() {
    const t = (await this._call("irrigation_maestro", "export_config", {}, !0))?.response?.payload;
    if (typeof t == "string")
      try {
        return Ms(t);
      } catch {
        return;
      }
  }
  /**
   * What the zone's valve device could offer, for the editor to propose.
   *
   * Read here rather than in the editor because it is a service call, and
   * because the editor seeds once: config and discovery have to arrive
   * together. A failure answers `undefined` — the editor then says nothing
   * about candidates rather than claiming the device has none, and every
   * other field still works.
   */
  async _discoverZoneSensors(e) {
    const t = await this._call(
      "irrigation_maestro",
      "discover_zone_sensors",
      { zone_id: e },
      !0
    );
    return Ts(t?.response);
  }
  async _onEditZone(e) {
    const [t, i] = await Promise.all([
      this._readConfig(),
      this._discoverZoneSensors(e)
    ]);
    t ? (this._editingZoneId = e, this._editingZoneSensors = i, this._editingZone = t.zones[e] ?? {}) : this._showError(r(k(this.hass), "panel.config_read_failed"));
  }
  /**
   * ⚙️ header button: opens the everyday-settings view (spec §1.3), seeded
   * from a fresh `export_config` read — same "read-before-open" pattern as
   * `_onEditZone` above, including the shared `config_read_failed` error
   * path when the read fails or the payload is unusable.
   */
  async _onOpenSettings() {
    this._testResults = {}, this._testPending = [];
    const [e] = await Promise.all([this._readConfig(), this._loadNotificationStatus()]);
    e ? (this._options = e.options, this._view = "settings") : this._showError(r(k(this.hass), "panel.config_read_failed"));
  }
  /**
   * The notification wizard's whole state: what is configured, where it
   * goes, and whether it goes anywhere. Deliberately a service read rather
   * than a slice of `export_config` — the verdict, the recommendation and
   * per-event reachability are derived state, and notify.py is the single
   * place that derives them.
   */
  async _loadNotificationStatus() {
    this._notifyStatusFailed = !1;
    const t = (await this._call("irrigation_maestro", "notification_status", {}, !0))?.response;
    if (Array.isArray(t?.events)) {
      this._notifyStatus = t;
      return;
    }
    this._notifyStatusFailed = !0;
  }
  /**
   * `set_notifications` grouped by priority, issued in sequence: each call
   * rewrites the hub options and wakes the update listener, so one call per
   * event would be nine config reloads for one Save. The status is re-read
   * afterwards so the banner and the wizard reflect what is now stored.
   *
   * The sequence STOPS at the first failure. `buildSaveCalls` always emits
   * the enabling calls first and the disable-the-remainder call last, so
   * carrying on past a failed enable would switch previously-enabled events
   * off while the intended enables never landed — driving the install toward
   * exactly the configured-looking-but-mute state this feature exists to
   * prevent. The re-read still runs, so the wizard shows the true state
   * rather than the one the user asked for.
   */
  async _onSaveNotifications(e) {
    for (const t of e.detail)
      if (!await this._saveSettings("set_notifications", { ...t })) break;
    await this._loadNotificationStatus();
  }
  /**
   * A test send in the user's own language. `test_notification`'s own
   * defaults follow `hass.config.language` (English fallback), so this is no
   * longer what saves an Italian instance from an English test message — but
   * the panel keeps sending its own strings, because the card's language is
   * the frontend locale of whoever is logged in, which is not necessarily the
   * language the instance is configured in.
   *
   * Results are MERGED, not replaced: the wizard tests one recipient at a
   * time, and replacing would erase the previous recipient's verdict the
   * moment the next one is proved.
   *
   * EVERY tested recipient gets a verdict, including when the call itself
   * failed or answered with something unusable. The inline ✓/✗ is the whole
   * point of the feature: leaving the row the user just clicked blank answers
   * the one question they asked with silence, and the 6s toast is gone before
   * they look away from it.
   */
  async _onTestNotification(e) {
    const t = k(this.hass), i = e.detail.services;
    this._testPending = [.../* @__PURE__ */ new Set([...this._testPending, ...i])];
    try {
      const s = await this._call(
        "irrigation_maestro",
        "test_notification",
        {
          services: i,
          title: r(t, "notify.test_title"),
          message: r(t, "notify.test_message")
        },
        !0
      ), o = Ps(s?.response?.results) ?? {}, a = { ...this._testResults, ...o };
      for (const d of i)
        a[d] = o[d] ?? {
          sent: !1,
          error: r(t, "notify.test_no_result")
        };
      this._testResults = a;
    } finally {
      this._testPending = this._testPending.filter((s) => !i.includes(s));
    }
  }
  /**
   * `imc-zone-save`: `add_zone` accepts ONLY `name`/`valve_entity`/
   * `area_m2`/`icon` — its voluptuous schema has no ALLOW_EXTRA, so any
   * other field in the payload hard-fails the call. Pick exactly those
   * keys rather than spreading `d.patch` (the editor never produces
   * advanced fields in create mode, but this guards defensively either
   * way). `update_zone` accepts the full field set, so the update branch
   * spreads the patch directly. `add_zone` is a response service — its id
   * comes back nested under `res.response["zone_id"]`, mirroring
   * `_onWizardFinish`'s `program_id` handling above.
   *
   * Editing state is only cleared on SUCCESS — `_call` returns `undefined`
   * on a failed service call (having already populated `_error`), so a
   * failed add/update leaves `_editingZone`/`_editingZoneId` untouched and
   * the editor stays open with the user's input intact, rather than
   * silently discarding it behind the 6s error toast.
   */
  async _onZoneSave(e) {
    const t = e.detail;
    let i;
    if (t.mode === "add") {
      const s = t.patch, o = { name: s.name, valve_entity: s.valve_entity };
      s.area_m2 !== void 0 && (o.area_m2 = s.area_m2), s.icon !== void 0 && (o.icon = s.icon);
      const d = (await this._call("irrigation_maestro", "add_zone", o, !0))?.response?.zone_id;
      i = typeof d == "string" && d !== "", i && (this._selectedZoneId = d);
    } else
      i = !!await this._call("irrigation_maestro", "update_zone", {
        zone_id: t.zoneId,
        ...t.patch
      });
    i && (this._editingZone = void 0, this._editingZoneId = void 0, this._editingZoneSensors = void 0, this._showNotice(r(k(this.hass), "panel.saved_zone")));
  }
  async _onZoneRemove(e) {
    const t = await this._call("irrigation_maestro", "remove_zone", {
      zone_id: e.detail.zoneId
    });
    this._editingZone = void 0, this._editingZoneId = void 0, this._editingZoneSensors = void 0, this._selectedZoneId = void 0, t && this._showNotice(r(k(this.hass), "panel.removed_zone"));
  }
  _onZoneCancel() {
    this._editingZone = void 0, this._editingZoneId = void 0, this._editingZoneSensors = void 0;
  }
  /**
   * The 3 settings-view save events (spec §1.3, wired in this task): each
   * event's detail keys ARE the matching hub service's attr names 1:1
   * (verified against `services.yaml`), so every handler spreads the detail
   * straight into the service call — no field renaming needed here, unlike
   * e.g. `_onCurveSave` above.
   */
  async _onSaveWeather(e) {
    await this._call("irrigation_maestro", "set_weather_sources", {
      ...e.detail
    }) !== void 0 && this._showNotice(r(k(this.hass), "panel.saved_settings"));
  }
  async _onSaveBudget(e) {
    await this._call("irrigation_maestro", "set_consumption_budget", {
      ...e.detail
    }) !== void 0 && this._showNotice(r(k(this.hass), "panel.saved_settings"));
  }
  async _onSaveRestrictions(e) {
    await this._call("irrigation_maestro", "set_restrictions", { ...e.detail }) !== void 0 && this._showNotice(r(k(this.hass), "panel.saved_settings"));
  }
  _onSettingsBack() {
    this._view = "zones";
  }
  /**
   * Shared path for the settings services: skip empty patches, toast on
   * success. Reports whether the call actually landed — a caller issuing a
   * SEQUENCE of them (`_onSaveNotifications`) must stop at the first failure
   * rather than run the rest of the sequence against a half-written state.
   */
  async _saveSettings(e, t) {
    return Object.keys(t).length === 0 ? !0 : await this._call("irrigation_maestro", e, t) === void 0 ? !1 : (this._showNotice(r(k(this.hass), "panel.saved_settings")), !0);
  }
  _onSaveSchedule(e) {
    const t = e.detail;
    this._call("irrigation_maestro", "set_program_schedule", {
      zone_id: t.zoneId,
      program_id: t.programId,
      ...yt(t.calendar),
      ...t.seasonMonths ? { season_months: t.seasonMonths } : {},
      start_kind: t.start.kind,
      ...t.start.kind === "time" ? { start_time: t.start.at } : { start_event: t.start.event, start_offset_min: t.start.offset_min ?? 0 }
    });
  }
  _onSaveMinutes(e) {
    const t = e.detail;
    this._call(
      "irrigation_maestro",
      "set_program_minutes",
      t.dayMinutes ? { zone_id: t.zoneId, program_id: t.programId, day_minutes: t.dayMinutes } : { zone_id: t.zoneId, program_id: t.programId, minutes: t.minutes }
    );
  }
  /**
   * `imc-curve-save`, re-dispatched by `program-editor.ts` with `zoneId`
   * attached (the embedded `imc-curve-editor`'s own event has no zoneId —
   * see the doc comment on `ProgramCurveSaveDetail`). The curve services use
   * DIFFERENT field names than the schedule/minutes services above:
   * `cycle_id` (not `program_id`) and `min_value`/`max_value` (not
   * `min`/`max`) — mirrors the dashboard card's handler at `card.ts:213-231`.
   */
  _onCurveSave(e) {
    const { zoneId: t, curve: i } = e.detail;
    this._call("irrigation_maestro", "set_curve", {
      zone_id: t,
      cycle_id: i.cycleId,
      points: i.points,
      min_value: i.min,
      max_value: i.max,
      ...i.kind !== void 0 ? { kind: i.kind } : {}
    });
  }
  /**
   * Add-program wizard finish: chain `add_program` → `set_program_schedule`
   * → `set_program_minutes` for the freshly created program. `add_program`
   * is a response service — its id comes back **nested** under
   * `res.response["program_id"]` (the frontend `callService(...,
   * returnResponse=true)` resolves to `{ context, response }`), never
   * `res.program_id`. If the response is missing the id, `_call` has
   * already surfaced `_error` on a hard failure; either way we abort the
   * chain rather than write a schedule/minutes against an unknown program.
   */
  async _onWizardFinish(e) {
    const t = e.detail, s = (await this._call(
      "irrigation_maestro",
      "add_program",
      { zone_id: t.zoneId, ...t.name ? { name: t.name } : {} },
      /* returnResponse */
      !0
    ))?.response?.program_id;
    typeof s != "string" || !s || (await this._call("irrigation_maestro", "set_program_schedule", {
      zone_id: t.zoneId,
      program_id: s,
      ...yt(t.calendar),
      start_kind: t.start.kind,
      ...t.start.kind === "time" ? { start_time: t.start.at } : { start_event: t.start.event, start_offset_min: t.start.offset_min ?? 0 }
    }), await this._call("irrigation_maestro", "set_program_minutes", {
      zone_id: t.zoneId,
      program_id: s,
      minutes: t.minutes
    }));
  }
  _onProgramToggle(e) {
    const t = e.detail;
    this._call("switch", t.enabled ? "turn_on" : "turn_off", {
      entity_id: t.entityId
    });
  }
  _onProgramRename(e) {
    const t = e.detail;
    this._call("irrigation_maestro", "rename_program", {
      zone_id: t.zoneId,
      program_id: t.programId,
      name: t.name
    });
  }
  _onProgramRemove(e) {
    const t = e.detail;
    this._call("irrigation_maestro", "remove_program", {
      zone_id: t.zoneId,
      program_id: t.programId
    });
  }
  /**
   * `duplicate_program` names the copy itself and avoids collisions in the
   * target zone, so the panel passes no `name` and no `target_zone_id`
   * (defaulting to the same zone) — duplicating is always "another program
   * right here", cross-zone copies aren't offered by this control.
   */
  async _onProgramDuplicate(e) {
    const t = e.detail;
    await this._call("irrigation_maestro", "duplicate_program", {
      zone_id: t.zoneId,
      program_id: t.programId
    }) && this._showNotice(r(k(this.hass), "program.duplicate_done"));
  }
  /**
   * `copy_curve` replaces only `zoneId`/`programId`'s curve shape with
   * `sourceZoneId`/`sourceProgramId`'s — schedule, calendar, soak, name and
   * intensity all stay the destination's own. Reuses `editor.saved`
   * ("Curve updated.") for the success toast: that is exactly what
   * happened, and it was already sitting there unused by any other path.
   */
  async _onCurveCopy(e) {
    const t = e.detail;
    await this._call("irrigation_maestro", "copy_curve", {
      source_zone_id: t.sourceZoneId,
      source_program_id: t.sourceProgramId,
      zone_id: t.zoneId,
      program_id: t.programId
    }) && this._showNotice(r(k(this.hass), "editor.saved"));
  }
  /* ------------------------------------------------------------ */
  /* Update gating: only re-render when a maestro entity changed   */
  /* (same change-detection approach as card.ts).                  */
  /* ------------------------------------------------------------ */
  shouldUpdate(e) {
    if (e.size === 1 && e.has("hass")) {
      const t = e.get("hass"), i = this.hass;
      return !t || !i || Object.keys(i.states).length !== this._statesCount ? !0 : this._relevantIds.some(
        (o) => t.states[o] !== i.states[o]
      );
    }
    return !0;
  }
  /** Error + success toasts, rendered together at the same spot in every
   *  render branch below — see `_showError`/`_showNotice`. */
  _renderToasts() {
    return l`
      ${this._error ? l`<div class="error">${this._error}</div>` : p}
      ${this._notice ? l`<div class="notice">${this._notice}</div>` : p}
    `;
  }
  render() {
    const e = this.hass;
    if (!e) return l``;
    const t = k(e), i = yi(e);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(e.states).length, this._editingZone !== void 0)
      return l`
        <div
          class="wrap ${this.narrow ? "narrow" : ""}"
          @imc-zone-save=${this._onZoneSave}
          @imc-zone-remove=${this._onZoneRemove}
          @imc-zone-cancel=${this._onZoneCancel}
        >
          <header><h1>${r(t, "panel.title")}</h1></header>
          ${this._renderToasts()}
          <imc-zone-editor
            .hass=${e}
            .zone=${this._editingZone ?? void 0}
            .zoneId=${this._editingZoneId}
            .sensorDiscovery=${this._editingZoneSensors}
          ></imc-zone-editor>
        </div>
      `;
    if (this._view === "settings")
      return l`
        <div
          class="wrap ${this.narrow ? "narrow" : ""}"
          @imc-settings-save-weather=${this._onSaveWeather}
          @imc-settings-save-budget=${this._onSaveBudget}
          @imc-settings-save-restrictions=${this._onSaveRestrictions}
          @imc-settings-save-session-limits=${(a) => this._saveSettings("set_session_limits", a.detail)}
        @imc-settings-save-valve-safety=${(a) => this._saveSettings("set_valve_safety", a.detail)}
        @imc-settings-save-concurrency=${(a) => this._saveSettings("set_concurrency", a.detail)}
        @imc-settings-save-notifications=${this._onSaveNotifications}
        @imc-settings-test-notification=${this._onTestNotification}
        @imc-settings-retry-notifications=${() => {
        this._loadNotificationStatus();
      }}
        @imc-settings-back=${this._onSettingsBack}
        >
          <header><h1>${r(t, "panel.title")}</h1></header>
          ${this._renderToasts()}
          <imc-settings-view
            .hass=${e}
            .options=${this._options ?? {}}
            .notifyStatus=${this._notifyStatus}
            .notifyStatusFailed=${this._notifyStatusFailed}
            .testResults=${this._testResults}
            .testPending=${this._testPending}
          ></imc-settings-view>
        </div>
      `;
    if (!i.found || i.zones.length === 0)
      return l`
        <div class="wrap">
          <header>
            <h1>${r(t, "panel.title")}</h1>
            <span class="settings-btn" @click=${this._onOpenSettings}>
              ⚙️ ${r(t, "settings.title")}
            </span>
          </header>
          ${this._renderToasts()}
          <div class="empty">${r(t, "panel.no_zones")}</div>
          <div class="tabs">
            <div
              class="tab add"
              @click=${() => {
        this._editingZone = null, this._editingZoneId = void 0, this._editingZoneSensors = void 0;
      }}
            >
              ＋ ${r(t, "zone.add")}
            </div>
          </div>
        </div>
      `;
    const s = this._resolveSelected(i.zones), o = pe(i.hub.weightedTemp) ? void 0 : v(i.hub.weightedTemp?.state);
    return l`
      <div
        class="wrap ${this.narrow ? "narrow" : ""}"
        @imc-program-save-schedule=${this._onSaveSchedule}
        @imc-program-save-advanced=${(a) => this._saveSettings("set_program_advanced", {
      zone_id: a.detail.zoneId,
      program_id: a.detail.programId,
      ...a.detail.patch
    })}
        @imc-program-save-minutes=${this._onSaveMinutes}
        @imc-curve-save=${this._onCurveSave}
        @imc-curve-copy=${this._onCurveCopy}
        @imc-program-cancel=${() => {
    }}
        @imc-program-toggle=${this._onProgramToggle}
        @imc-program-rename=${this._onProgramRename}
        @imc-program-remove=${this._onProgramRemove}
        @imc-program-duplicate=${this._onProgramDuplicate}
        @imc-wizard-finish=${this._onWizardFinish}
        @imc-wizard-cancel=${() => {
    }}
      >
        <header>
          <h1>${r(t, "panel.title")}</h1>
          <span class="settings-btn" @click=${this._onOpenSettings}>
            ⚙️ ${r(t, "settings.title")}
          </span>
        </header>
        ${this._renderWeatherContext(i, t, o)}
        ${this._renderToasts()}
        <div class="tabs">
          ${i.zones.map(
      (a) => l`
              <div
                class="tab ${a.zoneId === s.zoneId ? "sel" : ""}"
                @click=${() => this._selectedZoneId = a.zoneId}
              >
                ${a.name}
              </div>
            `
    )}
          <div
            class="tab add"
            @click=${() => {
      this._editingZone = null, this._editingZoneId = void 0, this._editingZoneSensors = void 0;
    }}
          >
            ＋ ${r(t, "zone.add")}
          </div>
        </div>
        <div class="zone-toolbar">
          <span class="edit-zone-link" @click=${() => this._onEditZone(s.zoneId)}>
            ✎ ${r(t, "zone.edit")}
          </span>
        </div>
        <imc-program-list
          .hass=${e}
          .zone=${s}
          .weightedTemp=${o}
          .allZones=${i.zones}
        ></imc-program-list>
      </div>
    `;
  }
  _resolveSelected(e) {
    return e.find((t) => t.zoneId === this._selectedZoneId) ?? e[0];
  }
  /**
   * Header weather line — "meteo: 32° · budget acqua OK" (spec §1.1: "Header
   * shows live context: current weighted temperature and water-budget
   * status"). Degrades gracefully: no weighted-temp reading (sensor
   * missing/unavailable) hides the whole line; a temperature without a
   * clean budget/threshold pair (either sensor missing/unavailable) shows
   * just the temperature. The sufficiency check mirrors card.ts's
   * `_renderHeader` budget meter (`budget >= threshold`).
   */
  _renderWeatherContext(e, t, i) {
    if (i === void 0) return p;
    const s = pe(e.hub.waterBudget) ? void 0 : v(e.hub.waterBudget?.state), o = pe(e.hub.skipThreshold) ? void 0 : v(e.hub.skipThreshold?.state), a = s !== void 0 && o !== void 0 ? s >= o ? "panel.budget_ok" : "panel.budget_low" : void 0;
    return l`
      <div class="meteo">
        ${r(t, "panel.weather_temp", { temp: hi(i, 1) ?? "" })}
        ${a ? l` · ${r(t, a)}` : p}
      </div>
    `;
  }
};
Xe.styles = O`
    :host {
      display: block;
      height: 100%;
      --imc-accent: #3a6df0;
    }
    .wrap {
      max-width: 760px;
      margin: 0 auto;
      padding: 16px;
      box-sizing: border-box;
    }
    .wrap.narrow {
      padding: 10px;
    }
    header {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 4px;
    }
    header h1 {
      font-size: 20px;
      font-weight: 600;
    }
    .settings-btn {
      margin-left: auto;
      font-size: 13px;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .settings-btn:hover {
      opacity: 0.8;
    }
    .meteo {
      font-size: 12.5px;
      color: var(--secondary-text-color);
      margin: 0 0 14px;
    }
    .tabs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .wrap.narrow .tabs {
      gap: 4px;
    }
    .tab {
      font-size: 13px;
      padding: 6px 14px;
      border-radius: 999px;
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .tab.sel {
      background: var(--imc-accent);
      color: #fff;
    }
    .tab.add {
      background: transparent;
      border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.4));
      color: var(--imc-accent, #3a6df0);
      font-weight: 600;
    }
    .zone-toolbar {
      display: flex;
      justify-content: flex-end;
      margin: -6px 0 8px;
    }
    .edit-zone-link {
      font-size: 12px;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .edit-zone-link:hover {
      opacity: 0.8;
    }
    .empty {
      color: var(--secondary-text-color);
      padding: 24px 0;
    }
    .error {
      margin: 0 0 12px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
      overflow-wrap: anywhere;
    }
    .notice {
      margin: 0 0 12px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--success-color, #1f9d55);
      color: var(--text-primary-color, #fff);
      overflow-wrap: anywhere;
    }
  `;
let A = Xe;
C([
  h({ attribute: !1 })
], A.prototype, "hass");
C([
  h({ type: Boolean })
], A.prototype, "narrow");
C([
  c()
], A.prototype, "_selectedZoneId");
C([
  c()
], A.prototype, "_error");
C([
  c()
], A.prototype, "_notice");
C([
  c()
], A.prototype, "_editingZone");
C([
  c()
], A.prototype, "_editingZoneId");
C([
  c()
], A.prototype, "_editingZoneSensors");
C([
  c()
], A.prototype, "_view");
C([
  c()
], A.prototype, "_options");
C([
  c()
], A.prototype, "_notifyStatus");
C([
  c()
], A.prototype, "_notifyStatusFailed");
C([
  c()
], A.prototype, "_testResults");
C([
  c()
], A.prototype, "_testPending");
L("irrigation-maestro-panel", A);
