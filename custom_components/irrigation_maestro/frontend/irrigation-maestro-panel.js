/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const R = globalThis, V = R.ShadowRoot && (R.ShadyCSS === void 0 || R.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, W = /* @__PURE__ */ Symbol(), Y = /* @__PURE__ */ new WeakMap();
let ce = class {
  constructor(e, t, o) {
    if (this._$cssResult$ = !0, o !== W) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (V && e === void 0) {
      const o = t !== void 0 && t.length === 1;
      o && (e = Y.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), o && Y.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const be = (s) => new ce(typeof s == "string" ? s : s + "", void 0, W), he = (s, ...e) => {
  const t = s.length === 1 ? s[0] : e.reduce((o, n, i) => o + ((r) => {
    if (r._$cssResult$ === !0) return r.cssText;
    if (typeof r == "number") return r;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + r + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(n) + s[i + 1], s[0]);
  return new ce(t, s, W);
}, Ae = (s, e) => {
  if (V) s.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const o = document.createElement("style"), n = R.litNonce;
    n !== void 0 && o.setAttribute("nonce", n), o.textContent = t.cssText, s.appendChild(o);
  }
}, ee = V ? (s) => s : (s) => s instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const o of e.cssRules) t += o.cssText;
  return be(t);
})(s) : s;
const { is: we, defineProperty: ze, getOwnPropertyDescriptor: Se, getOwnPropertyNames: Ee, getOwnPropertySymbols: xe, getPrototypeOf: Ce } = Object, L = globalThis, te = L.trustedTypes, Ne = te ? te.emptyScript : "", Me = L.reactiveElementPolyfillSupport, N = (s, e) => s, H = { toAttribute(s, e) {
  switch (e) {
    case Boolean:
      s = s ? Ne : null;
      break;
    case Object:
    case Array:
      s = s == null ? s : JSON.stringify(s);
  }
  return s;
}, fromAttribute(s, e) {
  let t = s;
  switch (e) {
    case Boolean:
      t = s !== null;
      break;
    case Number:
      t = s === null ? null : Number(s);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(s);
      } catch {
        t = null;
      }
  }
  return t;
} }, Z = (s, e) => !we(s, e), oe = { attribute: !0, type: String, converter: H, reflect: !1, useDefault: !1, hasChanged: Z };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), L.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let w = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = oe) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const o = /* @__PURE__ */ Symbol(), n = this.getPropertyDescriptor(e, o, t);
      n !== void 0 && ze(this.prototype, e, n);
    }
  }
  static getPropertyDescriptor(e, t, o) {
    const { get: n, set: i } = Se(this.prototype, e) ?? { get() {
      return this[t];
    }, set(r) {
      this[t] = r;
    } };
    return { get: n, set(r) {
      const l = n?.call(this);
      i?.call(this, r), this.requestUpdate(e, l, o);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? oe;
  }
  static _$Ei() {
    if (this.hasOwnProperty(N("elementProperties"))) return;
    const e = Ce(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(N("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(N("properties"))) {
      const t = this.properties, o = [...Ee(t), ...xe(t)];
      for (const n of o) this.createProperty(n, t[n]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [o, n] of t) this.elementProperties.set(o, n);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, o] of this.elementProperties) {
      const n = this._$Eu(t, o);
      n !== void 0 && this._$Eh.set(n, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const o = new Set(e.flat(1 / 0).reverse());
      for (const n of o) t.unshift(ee(n));
    } else e !== void 0 && t.push(ee(e));
    return t;
  }
  static _$Eu(e, t) {
    const o = t.attribute;
    return o === !1 ? void 0 : typeof o == "string" ? o : typeof e == "string" ? e.toLowerCase() : void 0;
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
    for (const o of t.keys()) this.hasOwnProperty(o) && (e.set(o, this[o]), delete this[o]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Ae(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, t, o) {
    this._$AK(e, o);
  }
  _$ET(e, t) {
    const o = this.constructor.elementProperties.get(e), n = this.constructor._$Eu(e, o);
    if (n !== void 0 && o.reflect === !0) {
      const i = (o.converter?.toAttribute !== void 0 ? o.converter : H).toAttribute(t, o.type);
      this._$Em = e, i == null ? this.removeAttribute(n) : this.setAttribute(n, i), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const o = this.constructor, n = o._$Eh.get(e);
    if (n !== void 0 && this._$Em !== n) {
      const i = o.getPropertyOptions(n), r = typeof i.converter == "function" ? { fromAttribute: i.converter } : i.converter?.fromAttribute !== void 0 ? i.converter : H;
      this._$Em = n;
      const l = r.fromAttribute(t, i.type);
      this[n] = l ?? this._$Ej?.get(n) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, t, o, n = !1, i) {
    if (e !== void 0) {
      const r = this.constructor;
      if (n === !1 && (i = this[e]), o ??= r.getPropertyOptions(e), !((o.hasChanged ?? Z)(i, t) || o.useDefault && o.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(r._$Eu(e, o)))) return;
      this.C(e, t, o);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: o, reflect: n, wrapped: i }, r) {
    o && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, r ?? t ?? this[e]), i !== !0 || r !== void 0) || (this._$AL.has(e) || (this.hasUpdated || o || (t = void 0), this._$AL.set(e, t)), n === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [n, i] of this._$Ep) this[n] = i;
        this._$Ep = void 0;
      }
      const o = this.constructor.elementProperties;
      if (o.size > 0) for (const [n, i] of o) {
        const { wrapped: r } = i, l = this[n];
        r !== !0 || this._$AL.has(n) || l === void 0 || this.C(n, void 0, i, l);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((o) => o.hostUpdate?.()), this.update(t)) : this._$EM();
    } catch (o) {
      throw e = !1, this._$EM(), o;
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
w.elementStyles = [], w.shadowRootOptions = { mode: "open" }, w[N("elementProperties")] = /* @__PURE__ */ new Map(), w[N("finalized")] = /* @__PURE__ */ new Map(), Me?.({ ReactiveElement: w }), (L.reactiveElementVersions ??= []).push("2.1.2");
const F = globalThis, ne = (s) => s, D = F.trustedTypes, se = D ? D.createPolicy("lit-html", { createHTML: (s) => s }) : void 0, pe = "$lit$", g = `lit$${Math.random().toFixed(9).slice(2)}$`, me = "?" + g, Pe = `<${me}>`, A = document, M = () => A.createComment(""), P = (s) => s === null || typeof s != "object" && typeof s != "function", Q = Array.isArray, ke = (s) => Q(s) || typeof s?.[Symbol.iterator] == "function", j = `[ 	
\f\r]`, C = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, ie = /-->/g, re = />/g, y = RegExp(`>|${j}(?:([^\\s"'>=/]+)(${j}*=${j}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), ae = /'/g, le = /"/g, _e = /^(?:script|style|textarea|title)$/i, Oe = (s) => (e, ...t) => ({ _$litType$: s, strings: e, values: t }), m = Oe(1), S = /* @__PURE__ */ Symbol.for("lit-noChange"), h = /* @__PURE__ */ Symbol.for("lit-nothing"), de = /* @__PURE__ */ new WeakMap(), $ = A.createTreeWalker(A, 129);
function fe(s, e) {
  if (!Q(s) || !s.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return se !== void 0 ? se.createHTML(e) : e;
}
const Ie = (s, e) => {
  const t = s.length - 1, o = [];
  let n, i = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", r = C;
  for (let l = 0; l < t; l++) {
    const a = s[l];
    let u, c, d = -1, p = 0;
    for (; p < a.length && (r.lastIndex = p, c = r.exec(a), c !== null); ) p = r.lastIndex, r === C ? c[1] === "!--" ? r = ie : c[1] !== void 0 ? r = re : c[2] !== void 0 ? (_e.test(c[2]) && (n = RegExp("</" + c[2], "g")), r = y) : c[3] !== void 0 && (r = y) : r === y ? c[0] === ">" ? (r = n ?? C, d = -1) : c[1] === void 0 ? d = -2 : (d = r.lastIndex - c[2].length, u = c[1], r = c[3] === void 0 ? y : c[3] === '"' ? le : ae) : r === le || r === ae ? r = y : r === ie || r === re ? r = C : (r = y, n = void 0);
    const f = r === y && s[l + 1].startsWith("/>") ? " " : "";
    i += r === C ? a + Pe : d >= 0 ? (o.push(u), a.slice(0, d) + pe + a.slice(d) + g + f) : a + g + (d === -2 ? l : f);
  }
  return [fe(s, i + (s[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), o];
};
class k {
  constructor({ strings: e, _$litType$: t }, o) {
    let n;
    this.parts = [];
    let i = 0, r = 0;
    const l = e.length - 1, a = this.parts, [u, c] = Ie(e, t);
    if (this.el = k.createElement(u, o), $.currentNode = this.el.content, t === 2 || t === 3) {
      const d = this.el.content.firstChild;
      d.replaceWith(...d.childNodes);
    }
    for (; (n = $.nextNode()) !== null && a.length < l; ) {
      if (n.nodeType === 1) {
        if (n.hasAttributes()) for (const d of n.getAttributeNames()) if (d.endsWith(pe)) {
          const p = c[r++], f = n.getAttribute(d).split(g), U = /([.?@])?(.*)/.exec(p);
          a.push({ type: 1, index: i, name: U[2], strings: f, ctor: U[1] === "." ? Ue : U[1] === "?" ? Re : U[1] === "@" ? He : q }), n.removeAttribute(d);
        } else d.startsWith(g) && (a.push({ type: 6, index: i }), n.removeAttribute(d));
        if (_e.test(n.tagName)) {
          const d = n.textContent.split(g), p = d.length - 1;
          if (p > 0) {
            n.textContent = D ? D.emptyScript : "";
            for (let f = 0; f < p; f++) n.append(d[f], M()), $.nextNode(), a.push({ type: 2, index: ++i });
            n.append(d[p], M());
          }
        }
      } else if (n.nodeType === 8) if (n.data === me) a.push({ type: 2, index: i });
      else {
        let d = -1;
        for (; (d = n.data.indexOf(g, d + 1)) !== -1; ) a.push({ type: 7, index: i }), d += g.length - 1;
      }
      i++;
    }
  }
  static createElement(e, t) {
    const o = A.createElement("template");
    return o.innerHTML = e, o;
  }
}
function E(s, e, t = s, o) {
  if (e === S) return e;
  let n = o !== void 0 ? t._$Co?.[o] : t._$Cl;
  const i = P(e) ? void 0 : e._$litDirective$;
  return n?.constructor !== i && (n?._$AO?.(!1), i === void 0 ? n = void 0 : (n = new i(s), n._$AT(s, t, o)), o !== void 0 ? (t._$Co ??= [])[o] = n : t._$Cl = n), n !== void 0 && (e = E(s, n._$AS(s, e.values), n, o)), e;
}
class Te {
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
    const { el: { content: t }, parts: o } = this._$AD, n = (e?.creationScope ?? A).importNode(t, !0);
    $.currentNode = n;
    let i = $.nextNode(), r = 0, l = 0, a = o[0];
    for (; a !== void 0; ) {
      if (r === a.index) {
        let u;
        a.type === 2 ? u = new I(i, i.nextSibling, this, e) : a.type === 1 ? u = new a.ctor(i, a.name, a.strings, this, e) : a.type === 6 && (u = new De(i, this, e)), this._$AV.push(u), a = o[++l];
      }
      r !== a?.index && (i = $.nextNode(), r++);
    }
    return $.currentNode = A, n;
  }
  p(e) {
    let t = 0;
    for (const o of this._$AV) o !== void 0 && (o.strings !== void 0 ? (o._$AI(e, o, t), t += o.strings.length - 2) : o._$AI(e[t])), t++;
  }
}
class I {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, o, n) {
    this.type = 2, this._$AH = h, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = o, this.options = n, this._$Cv = n?.isConnected ?? !0;
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
    e = E(this, e, t), P(e) ? e === h || e == null || e === "" ? (this._$AH !== h && this._$AR(), this._$AH = h) : e !== this._$AH && e !== S && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : ke(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== h && P(this._$AH) ? this._$AA.nextSibling.data = e : this.T(A.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: o } = e, n = typeof o == "number" ? this._$AC(e) : (o.el === void 0 && (o.el = k.createElement(fe(o.h, o.h[0]), this.options)), o);
    if (this._$AH?._$AD === n) this._$AH.p(t);
    else {
      const i = new Te(n, this), r = i.u(this.options);
      i.p(t), this.T(r), this._$AH = i;
    }
  }
  _$AC(e) {
    let t = de.get(e.strings);
    return t === void 0 && de.set(e.strings, t = new k(e)), t;
  }
  k(e) {
    Q(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let o, n = 0;
    for (const i of e) n === t.length ? t.push(o = new I(this.O(M()), this.O(M()), this, this.options)) : o = t[n], o._$AI(i), n++;
    n < t.length && (this._$AR(o && o._$AB.nextSibling, n), t.length = n);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const o = ne(e).nextSibling;
      ne(e).remove(), e = o;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class q {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, o, n, i) {
    this.type = 1, this._$AH = h, this._$AN = void 0, this.element = e, this.name = t, this._$AM = n, this.options = i, o.length > 2 || o[0] !== "" || o[1] !== "" ? (this._$AH = Array(o.length - 1).fill(new String()), this.strings = o) : this._$AH = h;
  }
  _$AI(e, t = this, o, n) {
    const i = this.strings;
    let r = !1;
    if (i === void 0) e = E(this, e, t, 0), r = !P(e) || e !== this._$AH && e !== S, r && (this._$AH = e);
    else {
      const l = e;
      let a, u;
      for (e = i[0], a = 0; a < i.length - 1; a++) u = E(this, l[o + a], t, a), u === S && (u = this._$AH[a]), r ||= !P(u) || u !== this._$AH[a], u === h ? e = h : e !== h && (e += (u ?? "") + i[a + 1]), this._$AH[a] = u;
    }
    r && !n && this.j(e);
  }
  j(e) {
    e === h ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Ue extends q {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === h ? void 0 : e;
  }
}
class Re extends q {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== h);
  }
}
class He extends q {
  constructor(e, t, o, n, i) {
    super(e, t, o, n, i), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = E(this, e, t, 0) ?? h) === S) return;
    const o = this._$AH, n = e === h && o !== h || e.capture !== o.capture || e.once !== o.once || e.passive !== o.passive, i = e !== h && (o === h || n);
    n && this.element.removeEventListener(this.name, this, o), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class De {
  constructor(e, t, o) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = o;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    E(this, e);
  }
}
const Le = F.litHtmlPolyfillSupport;
Le?.(k, I), (F.litHtmlVersions ??= []).push("3.3.3");
const qe = (s, e, t) => {
  const o = t?.renderBefore ?? e;
  let n = o._$litPart$;
  if (n === void 0) {
    const i = t?.renderBefore ?? null;
    o._$litPart$ = n = new I(e.insertBefore(M(), i), i, void 0, t ?? {});
  }
  return n._$AI(s), n;
};
const G = globalThis;
class z extends w {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = qe(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return S;
  }
}
z._$litElement$ = !0, z.finalized = !0, G.litElementHydrateSupport?.({ LitElement: z });
const je = G.litElementPolyfillSupport;
je?.({ LitElement: z });
(G.litElementVersions ??= []).push("4.2.2");
const Be = { attribute: !0, type: String, converter: H, reflect: !1, hasChanged: Z }, Ve = (s = Be, e, t) => {
  const { kind: o, metadata: n } = t;
  let i = globalThis.litPropertyMetadata.get(n);
  if (i === void 0 && globalThis.litPropertyMetadata.set(n, i = /* @__PURE__ */ new Map()), o === "setter" && ((s = Object.create(s)).wrapped = !0), i.set(t.name, s), o === "accessor") {
    const { name: r } = t;
    return { set(l) {
      const a = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(r, a, s, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(r, void 0, s, l), l;
    } };
  }
  if (o === "setter") {
    const { name: r } = t;
    return function(l) {
      const a = this[r];
      e.call(this, l), this.requestUpdate(r, a, s, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + o);
};
function T(s) {
  return (e, t) => typeof t == "object" ? Ve(s, e, t) : ((o, n, i) => {
    const r = n.hasOwnProperty(i);
    return n.constructor.createProperty(i, o), r ? Object.getOwnPropertyDescriptor(n, i) : void 0;
  })(s, e, t);
}
function We(s) {
  return T({ ...s, state: !0, attribute: !1 });
}
function b(s) {
  if (typeof s == "number" && Number.isFinite(s)) return s;
  if (typeof s == "string" && s.trim() !== "") {
    const e = Number(s);
    if (Number.isFinite(e)) return e;
  }
}
function _(s) {
  return typeof s == "string" && s !== "" ? s : void 0;
}
function Ze(s) {
  return Array.isArray(s) ? s : [];
}
function ge(s, e) {
  customElements.get(s) || customElements.define(s, e);
}
const B = {
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
  // Header
  "header.water_budget": "Water budget",
  "header.skip_threshold": "Skip threshold",
  "header.weighted_temp": "Weighted temperature",
  "header.session": "Session",
  "header.global_pause": "Globally paused",
  "header.stale_weather": "Stale weather data",
  "header.consumption_left": "Water left",
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
  "reason.not_due": "Not due yet",
  "reason.calendar_restricted": "Calendar restriction",
  "reason.zone_disabled": "Zone disabled",
  "reason.cycle_disabled": "Cycle disabled",
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
  "reason.watchdog": "Closed by the safety watchdog",
  "reason.zone_removed": "Zone removed",
  "reason.shutdown": "Integration shut down",
  "reason.cancelled": "Cancelled",
  // Degraded-feature keys
  "degraded.switch_valve": "Valve without position feedback",
  "degraded.no_flow_meter": "No flow meter",
  "degraded.line_meter_shared": "Shared line meter",
  "degraded.no_hourly_forecast": "No hourly forecast",
  "degraded.volume_mode_unavailable": "Volume mode unavailable",
  // Zone rows
  "zone.next_run": "Next run",
  "zone.no_next_run": "No run scheduled",
  "zone.last_outcome": "Last outcome",
  "zone.suspended_until": "Suspended until {date}",
  "zone.remaining": "{minutes} min left",
  "zone.cycles": "Cycles",
  "zone.no_cycles": "No cycles configured",
  "zone.cycle_enabled": "Enabled",
  "zone.cycle_disabled": "Disabled",
  // Cycle triggers
  "trigger.sunrise": "Sunrise",
  "trigger.sunset": "Sunset",
  "trigger.at": "At {time}",
  // Curve display
  "curve.clamp_min": "min",
  "curve.clamp_max": "max",
  "curve.unit_duration": "min",
  "curve.unit_volume": "L",
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
  "editor.amount.label": "💧 How much water",
  "editor.amount.help": "Watering minutes on a mild day (25°). This is the baseline everything else builds on.",
  "editor.amount.value": "{min} min at 25°",
  "editor.amount.low": "little (3 min)",
  "editor.amount.high": "a lot (45 min)",
  "editor.heat.label": "🔥 How much more when it's hot",
  "editor.heat.help": "Extra minutes on a hot day (35°) compared with a mild one. At 0 it waters the same regardless.",
  "editor.heat.value": "+{min} min at 35°",
  "editor.heat.low": "same (+0)",
  "editor.heat.high": "much more (+30)",
  "editor.graph.caption": "Live preview — watering minutes by temperature",
  "editor.graph.today": "today {temp}°",
  "editor.example.cool": "Cool · 12°",
  "editor.example.mild": "Mild · 25°",
  "editor.example.hot": "Hot · 35°",
  "editor.today": "🌡️ With today's weather (weighted temperature {temp}°) it would water ≈ {min} min.",
  "editor.advanced.toggle": "Advanced — limits and draggable points",
  "editor.advanced.help": "For precise control. You can ignore this — the defaults are fine.",
  "editor.min.label": "⬇️ Never less than",
  "editor.min.help": "Absolute minimum minutes, even when cold.",
  "editor.max.label": "⬆️ Never more than",
  "editor.max.help": "Absolute maximum minutes, even in extreme heat.",
  "editor.drag_hint": "✋ Drag the three points (up/down) to shape the curve by hand.",
  "editor.more_points": "Need more than three points? Edit the full curve in the zone settings.",
  "editor.save": "Save",
  "editor.cancel": "Cancel",
  "editor.saved": "Curve updated.",
  "editor.save_error": "Couldn't save the curve: {error}",
  "editor.volume_note": "This cycle uses a volume curve (liters). Edit it in the zone settings."
}, Fe = {
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
  // Intestazione
  "header.water_budget": "Budget idrico",
  "header.skip_threshold": "Soglia di salto",
  "header.weighted_temp": "Temperatura pesata",
  "header.session": "Sessione",
  "header.global_pause": "In pausa globale",
  "header.stale_weather": "Dati meteo non aggiornati",
  "header.consumption_left": "Acqua residua",
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
  // Stati ultimo esito (riferiti al "ciclo", maschile)
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
  "reason.not_due": "Non ancora in programma",
  "reason.calendar_restricted": "Limitazione di calendario",
  "reason.zone_disabled": "Zona disabilitata",
  "reason.cycle_disabled": "Ciclo disabilitato",
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
  "reason.watchdog": "Chiusa dal watchdog di sicurezza",
  "reason.zone_removed": "Zona rimossa",
  "reason.shutdown": "Integrazione arrestata",
  "reason.cancelled": "Annullato",
  // Funzionalità degradate
  "degraded.switch_valve": "Valvola senza conferma di posizione",
  "degraded.no_flow_meter": "Nessun contatore di flusso",
  "degraded.line_meter_shared": "Contatore di linea condiviso",
  "degraded.no_hourly_forecast": "Nessuna previsione oraria",
  "degraded.volume_mode_unavailable": "Modalità a volume non disponibile",
  // Righe zona
  "zone.next_run": "Prossima irrigazione",
  "zone.no_next_run": "Nessuna irrigazione programmata",
  "zone.last_outcome": "Ultimo esito",
  "zone.suspended_until": "Sospesa fino al {date}",
  "zone.remaining": "{minutes} min rimanenti",
  "zone.cycles": "Cicli",
  "zone.no_cycles": "Nessun ciclo configurato",
  "zone.cycle_enabled": "Abilitato",
  "zone.cycle_disabled": "Disabilitato",
  // Trigger dei cicli
  "trigger.sunrise": "Alba",
  "trigger.sunset": "Tramonto",
  "trigger.at": "Alle {time}",
  // Curve
  "curve.clamp_min": "min",
  "curve.clamp_max": "max",
  "curve.unit_duration": "min",
  "curve.unit_volume": "L",
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
  "editor.amount.label": "💧 Quanta acqua",
  "editor.amount.help": "Minuti di irrigazione in una giornata mite (25°). È la base: tutto il resto parte da qui.",
  "editor.amount.value": "{min} min a 25°",
  "editor.amount.low": "poca (3 min)",
  "editor.amount.high": "tanta (45 min)",
  "editor.heat.label": "🔥 Quanto di più quando fa caldo",
  "editor.heat.help": "Minuti extra in una giornata calda (35°) rispetto a una mite. A 0 irriga sempre uguale.",
  "editor.heat.value": "+{min} min a 35°",
  "editor.heat.low": "uguale (+0)",
  "editor.heat.high": "molto di più (+30)",
  "editor.graph.caption": "Anteprima dal vivo — minuti di irrigazione secondo la temperatura",
  "editor.graph.today": "oggi {temp}°",
  "editor.example.cool": "Fresco · 12°",
  "editor.example.mild": "Mite · 25°",
  "editor.example.hot": "Caldo · 35°",
  "editor.today": "🌡️ Con il meteo di oggi (temperatura pesata {temp}°) irrigherebbe ≈ {min} min.",
  "editor.advanced.toggle": "Avanzate — limiti e punti trascinabili",
  "editor.advanced.help": "Per chi vuole il controllo preciso. Puoi ignorarle: i valori predefiniti vanno bene.",
  "editor.min.label": "⬇️ Mai meno di",
  "editor.min.help": "Minuti minimi assoluti, anche col freddo.",
  "editor.max.label": "⬆️ Mai più di",
  "editor.max.help": "Minuti massimi assoluti, anche col gran caldo.",
  "editor.drag_hint": "✋ Trascina i tre punti (su/giù) per modellare la curva a mano.",
  "editor.more_points": "Ti servono più di tre punti? La curva completa si modifica nelle impostazioni della zona.",
  "editor.save": "Salva",
  "editor.cancel": "Annulla",
  "editor.saved": "Curva aggiornata.",
  "editor.save_error": "Non è stato possibile salvare la curva: {error}",
  "editor.volume_note": "Questo ciclo usa una curva a volume (litri). Modificala nelle impostazioni della zona."
}, ve = {
  en: B,
  it: Fe
};
function ye(s) {
  const t = (s?.locale?.language ?? s?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in ve ? t : "en";
}
function Qe(s, e) {
  return e ? s.replace(/\{(\w+)\}/g, (t, o) => {
    const n = e[o];
    return n === void 0 ? t : String(n);
  }) : s;
}
function v(s, e, t) {
  const o = ve[s] ?? B;
  return Qe(o[e] ?? B[e], t);
}
const Ge = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, Ke = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function Je(s) {
  const e = {}, t = /* @__PURE__ */ new Map(), o = [];
  for (const i of Object.values(s.states)) {
    const r = _(i.attributes.maestro_role);
    if (!r) continue;
    o.push(i.entity_id);
    const l = _(i.attributes.zone_id);
    if (l) {
      let a = t.get(l);
      if (a || (a = {
        zoneId: l,
        name: l,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(l, a)), r === "cycle_enabled")
        a.cycleSwitches.push(i);
      else {
        const u = Ke[r];
        u && (a[u] = i);
      }
    } else {
      const a = Ge[r];
      a && (e[a] = i);
    }
  }
  const n = [...t.values()];
  for (const i of n) {
    const r = i.state?.attributes ?? {};
    i.name = _(r.zone_name) ?? _(i.state?.attributes.friendly_name) ?? i.zoneId, i.order = b(r.order) ?? b(i.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return n.sort(
    (i, r) => i.order - r.order || i.name.localeCompare(r.name)
  ), { found: o.length > 0, hub: e, zones: n, entityIds: o };
}
function Xe(s) {
  const e = Ze(s.state?.attributes?.cycles), t = [];
  for (const o of e) {
    if (typeof o != "object" || o === null) continue;
    const n = o, i = {
      cycle_id: _(n.cycle_id),
      name: _(n.name),
      enabled: typeof n.enabled == "boolean" ? n.enabled : void 0,
      trigger: n.trigger ?? void 0,
      curve: n.curve ?? void 0
    }, r = n.days;
    Array.isArray(r) && (i.days = r.map((a) => b(a)).filter((a) => a !== void 0));
    const l = n.day_minutes;
    if (l && typeof l == "object") {
      const a = {};
      for (const [u, c] of Object.entries(l)) {
        const d = b(c);
        d !== void 0 && (a[u] = d);
      }
      i.day_minutes = a;
    }
    i.amount = b(n.amount), i.heat = b(n.heat), t.push(i);
  }
  return t;
}
function Ye(s) {
  const e = Math.abs(Math.round(s)), t = Math.floor(e / 3600), o = Math.round(e % 3600 / 60), n = [];
  return t > 0 && n.push(`${t} h`), o > 0 && n.push(`${o} min`), n.length === 0 && n.push(`${e} s`), n.join(" ");
}
function et(s, e) {
  if (!s || typeof s != "object") return "";
  if (s.kind === "sun" && (s.event === "sunrise" || s.event === "sunset")) {
    const o = v(
      e,
      s.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), n = b(s.offset_s) ?? 0;
    if (n === 0) return o;
    const i = n < 0 ? "−" : "+";
    return `${o} ${i} ${Ye(n)}`;
  }
  const t = _(s.at) ?? _(s.time);
  return t ? v(e, "trigger.at", { time: t }) : _(s.kind) ?? "";
}
const ue = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
};
function tt(s) {
  return ue[s] ?? ue.en;
}
function ot(s) {
  if (!s || s.length === 0) return !0;
  const e = new Set(s);
  for (let t = 0; t < 7; t += 1)
    if (!e.has(t)) return !1;
  return !0;
}
var nt = Object.defineProperty, $e = (s, e, t, o) => {
  for (var n = void 0, i = s.length - 1, r; i >= 0; i--)
    (r = s[i]) && (n = r(e, t, n) || n);
  return n && nt(e, t, n), n;
};
const J = class J extends z {
  render() {
    const e = this.hass, t = this.zone;
    if (!e || !t) return m``;
    const o = ye(e), n = Xe(t);
    if (n.length === 0)
      return m`<div class="meta">${v(o, "panel.no_programs")}</div>`;
    const i = tt(o);
    return m`${n.map((r) => {
      const l = r.days ?? [], a = ot(r.days);
      return m`
        <div class="prog">
          <div class="name">${r.name ?? r.cycle_id}</div>
          <div class="days">
            ${i.map(
        (u, c) => m`
                <div class="day ${a || l.includes(c) ? "on" : ""}">
                  ${u}
                </div>
              `
      )}
          </div>
          <div class="meta">
            ${et(r.trigger, o)} · ${this._minutesSummary(o, r)}
          </div>
        </div>
      `;
    })}`;
  }
  _minutesSummary(e, t) {
    return t.day_minutes && Object.keys(t.day_minutes).length > 0 ? v(e, "panel.per_day_minutes") : v(e, "panel.minutes_value", { min: t.amount ?? "?" });
  }
};
J.styles = he`
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
  `;
let O = J;
$e([
  T({ attribute: !1 })
], O.prototype, "hass");
$e([
  T({ attribute: !1 })
], O.prototype, "zone");
ge("imc-program-list", O);
var st = Object.defineProperty, K = (s, e, t, o) => {
  for (var n = void 0, i = s.length - 1, r; i >= 0; i--)
    (r = s[i]) && (n = r(e, t, n) || n);
  return n && st(e, t, n), n;
};
const X = class X extends z {
  constructor() {
    super(...arguments), this.narrow = !1, this._relevantIds = [], this._statesCount = 0;
  }
  /* ------------------------------------------------------------ */
  /* Update gating: only re-render when a maestro entity changed   */
  /* (same change-detection approach as card.ts).                  */
  /* ------------------------------------------------------------ */
  shouldUpdate(e) {
    if (e.size === 1 && e.has("hass")) {
      const t = e.get("hass"), o = this.hass;
      return !t || !o || Object.keys(o.states).length !== this._statesCount ? !0 : this._relevantIds.some(
        (i) => t.states[i] !== o.states[i]
      );
    }
    return !0;
  }
  render() {
    const e = this.hass;
    if (!e) return m``;
    const t = ye(e), o = Je(e);
    if (this._relevantIds = o.entityIds, this._statesCount = Object.keys(e.states).length, !o.found || o.zones.length === 0)
      return m`
        <div class="wrap">
          <header><h1>${v(t, "panel.title")}</h1></header>
          <div class="empty">${v(t, "panel.no_zones")}</div>
        </div>
      `;
    const n = this._resolveSelected(o.zones);
    return m`
      <div class="wrap">
        <header><h1>${v(t, "panel.title")}</h1></header>
        <div class="tabs">
          ${o.zones.map(
      (i) => m`
              <div
                class="tab ${i.zoneId === n.zoneId ? "sel" : ""}"
                @click=${() => this._selectedZoneId = i.zoneId}
              >
                ${i.name}
              </div>
            `
    )}
        </div>
        <imc-program-list .hass=${e} .zone=${n}></imc-program-list>
      </div>
    `;
  }
  _resolveSelected(e) {
    return e.find((t) => t.zoneId === this._selectedZoneId) ?? e[0];
  }
};
X.styles = he`
    :host {
      display: block;
      height: 100%;
      --imc-accent: #3a6df0;
    }
    .wrap {
      max-width: 760px;
      margin: 0 auto;
      padding: 16px;
    }
    header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    header h1 {
      font-size: 20px;
      font-weight: 600;
    }
    .tabs {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 14px;
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
    .empty {
      color: var(--secondary-text-color);
      padding: 24px 0;
    }
  `;
let x = X;
K([
  T({ attribute: !1 })
], x.prototype, "hass");
K([
  T({ type: Boolean })
], x.prototype, "narrow");
K([
  We()
], x.prototype, "_selectedZoneId");
ge("irrigation-maestro-panel", x);
