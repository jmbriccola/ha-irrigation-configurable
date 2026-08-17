/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const ue = globalThis, $e = ue.ShadowRoot && (ue.ShadyCSS === void 0 || ue.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, ze = /* @__PURE__ */ Symbol(), De = /* @__PURE__ */ new WeakMap();
let et = class {
  constructor(e, t, o) {
    if (this._$cssResult$ = !0, o !== ze) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if ($e && e === void 0) {
      const o = t !== void 0 && t.length === 1;
      o && (e = De.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), o && De.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const gt = (n) => new et(typeof n == "string" ? n : n + "", void 0, ze), X = (n, ...e) => {
  const t = n.length === 1 ? n[0] : e.reduce((o, i, a) => o + ((s) => {
    if (s._$cssResult$ === !0) return s.cssText;
    if (typeof s == "number") return s;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + s + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(i) + n[a + 1], n[0]);
  return new et(t, n, ze);
}, vt = (n, e) => {
  if ($e) n.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const o = document.createElement("style"), i = ue.litNonce;
    i !== void 0 && o.setAttribute("nonce", i), o.textContent = t.cssText, n.appendChild(o);
  }
}, Oe = $e ? (n) => n : (n) => n instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const o of e.cssRules) t += o.cssText;
  return gt(t);
})(n) : n;
const { is: yt, defineProperty: bt, getOwnPropertyDescriptor: wt, getOwnPropertyNames: xt, getOwnPropertySymbols: $t, getPrototypeOf: zt } = Object, me = globalThis, Re = me.trustedTypes, kt = Re ? Re.emptyScript : "", St = me.reactiveElementPolyfillSupport, ie = (n, e) => n, pe = { toAttribute(n, e) {
  switch (e) {
    case Boolean:
      n = n ? kt : null;
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
} }, ke = (n, e) => !yt(n, e), Le = { attribute: !0, type: String, converter: pe, reflect: !1, useDefault: !1, hasChanged: ke };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), me.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let Z = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Le) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const o = /* @__PURE__ */ Symbol(), i = this.getPropertyDescriptor(e, o, t);
      i !== void 0 && bt(this.prototype, e, i);
    }
  }
  static getPropertyDescriptor(e, t, o) {
    const { get: i, set: a } = wt(this.prototype, e) ?? { get() {
      return this[t];
    }, set(s) {
      this[t] = s;
    } };
    return { get: i, set(s) {
      const l = i?.call(this);
      a?.call(this, s), this.requestUpdate(e, l, o);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Le;
  }
  static _$Ei() {
    if (this.hasOwnProperty(ie("elementProperties"))) return;
    const e = zt(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(ie("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(ie("properties"))) {
      const t = this.properties, o = [...xt(t), ...$t(t)];
      for (const i of o) this.createProperty(i, t[i]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [o, i] of t) this.elementProperties.set(o, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, o] of this.elementProperties) {
      const i = this._$Eu(t, o);
      i !== void 0 && this._$Eh.set(i, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const o = new Set(e.flat(1 / 0).reverse());
      for (const i of o) t.unshift(Oe(i));
    } else e !== void 0 && t.push(Oe(e));
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
    return vt(e, this.constructor.elementStyles), e;
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
    const o = this.constructor.elementProperties.get(e), i = this.constructor._$Eu(e, o);
    if (i !== void 0 && o.reflect === !0) {
      const a = (o.converter?.toAttribute !== void 0 ? o.converter : pe).toAttribute(t, o.type);
      this._$Em = e, a == null ? this.removeAttribute(i) : this.setAttribute(i, a), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const o = this.constructor, i = o._$Eh.get(e);
    if (i !== void 0 && this._$Em !== i) {
      const a = o.getPropertyOptions(i), s = typeof a.converter == "function" ? { fromAttribute: a.converter } : a.converter?.fromAttribute !== void 0 ? a.converter : pe;
      this._$Em = i;
      const l = s.fromAttribute(t, a.type);
      this[i] = l ?? this._$Ej?.get(i) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, t, o, i = !1, a) {
    if (e !== void 0) {
      const s = this.constructor;
      if (i === !1 && (a = this[e]), o ??= s.getPropertyOptions(e), !((o.hasChanged ?? ke)(a, t) || o.useDefault && o.reflect && a === this._$Ej?.get(e) && !this.hasAttribute(s._$Eu(e, o)))) return;
      this.C(e, t, o);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: o, reflect: i, wrapped: a }, s) {
    o && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, s ?? t ?? this[e]), a !== !0 || s !== void 0) || (this._$AL.has(e) || (this.hasUpdated || o || (t = void 0), this._$AL.set(e, t)), i === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [i, a] of this._$Ep) this[i] = a;
        this._$Ep = void 0;
      }
      const o = this.constructor.elementProperties;
      if (o.size > 0) for (const [i, a] of o) {
        const { wrapped: s } = a, l = this[i];
        s !== !0 || this._$AL.has(i) || l === void 0 || this.C(i, void 0, a, l);
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
Z.elementStyles = [], Z.shadowRootOptions = { mode: "open" }, Z[ie("elementProperties")] = /* @__PURE__ */ new Map(), Z[ie("finalized")] = /* @__PURE__ */ new Map(), St?.({ ReactiveElement: Z }), (me.reactiveElementVersions ??= []).push("2.1.2");
const Se = globalThis, Fe = (n) => n, he = Se.trustedTypes, Ue = he ? he.createPolicy("lit-html", { createHTML: (n) => n }) : void 0, tt = "$lit$", E = `lit$${Math.random().toFixed(9).slice(2)}$`, ot = "?" + E, At = `<${ot}>`, H = document, ne = () => H.createComment(""), ae = (n) => n === null || typeof n != "object" && typeof n != "function", Ae = Array.isArray, Ct = (n) => Ae(n) || typeof n?.[Symbol.iterator] == "function", ye = `[ 	
\f\r]`, te = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, He = /-->/g, je = />/g, q = RegExp(`>|${ye}(?:([^\\s"'>=/]+)(${ye}*=${ye}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Be = /'/g, Ve = /"/g, it = /^(?:script|style|textarea|title)$/i, nt = (n) => (e, ...t) => ({ _$litType$: n, strings: e, values: t }), p = nt(1), R = nt(2), G = /* @__PURE__ */ Symbol.for("lit-noChange"), u = /* @__PURE__ */ Symbol.for("lit-nothing"), We = /* @__PURE__ */ new WeakMap(), L = H.createTreeWalker(H, 129);
function at(n, e) {
  if (!Ae(n) || !n.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Ue !== void 0 ? Ue.createHTML(e) : e;
}
const Nt = (n, e) => {
  const t = n.length - 1, o = [];
  let i, a = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", s = te;
  for (let l = 0; l < t; l++) {
    const r = n[l];
    let d, h, _ = -1, m = 0;
    for (; m < r.length && (s.lastIndex = m, h = s.exec(r), h !== null); ) m = s.lastIndex, s === te ? h[1] === "!--" ? s = He : h[1] !== void 0 ? s = je : h[2] !== void 0 ? (it.test(h[2]) && (i = RegExp("</" + h[2], "g")), s = q) : h[3] !== void 0 && (s = q) : s === q ? h[0] === ">" ? (s = i ?? te, _ = -1) : h[1] === void 0 ? _ = -2 : (_ = s.lastIndex - h[2].length, d = h[1], s = h[3] === void 0 ? q : h[3] === '"' ? Ve : Be) : s === Ve || s === Be ? s = q : s === He || s === je ? s = te : (s = q, i = void 0);
    const f = s === q && n[l + 1].startsWith("/>") ? " " : "";
    a += s === te ? r + At : _ >= 0 ? (o.push(d), r.slice(0, _) + tt + r.slice(_) + E + f) : r + E + (_ === -2 ? l : f);
  }
  return [at(n, a + (n[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), o];
};
class se {
  constructor({ strings: e, _$litType$: t }, o) {
    let i;
    this.parts = [];
    let a = 0, s = 0;
    const l = e.length - 1, r = this.parts, [d, h] = Nt(e, t);
    if (this.el = se.createElement(d, o), L.currentNode = this.el.content, t === 2 || t === 3) {
      const _ = this.el.content.firstChild;
      _.replaceWith(..._.childNodes);
    }
    for (; (i = L.nextNode()) !== null && r.length < l; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const _ of i.getAttributeNames()) if (_.endsWith(tt)) {
          const m = h[s++], f = i.getAttribute(_).split(E), w = /([.?@])?(.*)/.exec(m);
          r.push({ type: 1, index: a, name: w[2], strings: f, ctor: w[1] === "." ? Et : w[1] === "?" ? Tt : w[1] === "@" ? Pt : fe }), i.removeAttribute(_);
        } else _.startsWith(E) && (r.push({ type: 6, index: a }), i.removeAttribute(_));
        if (it.test(i.tagName)) {
          const _ = i.textContent.split(E), m = _.length - 1;
          if (m > 0) {
            i.textContent = he ? he.emptyScript : "";
            for (let f = 0; f < m; f++) i.append(_[f], ne()), L.nextNode(), r.push({ type: 2, index: ++a });
            i.append(_[m], ne());
          }
        }
      } else if (i.nodeType === 8) if (i.data === ot) r.push({ type: 2, index: a });
      else {
        let _ = -1;
        for (; (_ = i.data.indexOf(E, _ + 1)) !== -1; ) r.push({ type: 7, index: a }), _ += E.length - 1;
      }
      a++;
    }
  }
  static createElement(e, t) {
    const o = H.createElement("template");
    return o.innerHTML = e, o;
  }
}
function Q(n, e, t = n, o) {
  if (e === G) return e;
  let i = o !== void 0 ? t._$Co?.[o] : t._$Cl;
  const a = ae(e) ? void 0 : e._$litDirective$;
  return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(n), i._$AT(n, t, o)), o !== void 0 ? (t._$Co ??= [])[o] = i : t._$Cl = i), i !== void 0 && (e = Q(n, i._$AS(n, e.values), i, o)), e;
}
class Mt {
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
    const { el: { content: t }, parts: o } = this._$AD, i = (e?.creationScope ?? H).importNode(t, !0);
    L.currentNode = i;
    let a = L.nextNode(), s = 0, l = 0, r = o[0];
    for (; r !== void 0; ) {
      if (s === r.index) {
        let d;
        r.type === 2 ? d = new le(a, a.nextSibling, this, e) : r.type === 1 ? d = new r.ctor(a, r.name, r.strings, this, e) : r.type === 6 && (d = new It(a, this, e)), this._$AV.push(d), r = o[++l];
      }
      s !== r?.index && (a = L.nextNode(), s++);
    }
    return L.currentNode = H, i;
  }
  p(e) {
    let t = 0;
    for (const o of this._$AV) o !== void 0 && (o.strings !== void 0 ? (o._$AI(e, o, t), t += o.strings.length - 2) : o._$AI(e[t])), t++;
  }
}
class le {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, o, i) {
    this.type = 2, this._$AH = u, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = o, this.options = i, this._$Cv = i?.isConnected ?? !0;
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
    e = Q(this, e, t), ae(e) ? e === u || e == null || e === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : e !== this._$AH && e !== G && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Ct(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== u && ae(this._$AH) ? this._$AA.nextSibling.data = e : this.T(H.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: o } = e, i = typeof o == "number" ? this._$AC(e) : (o.el === void 0 && (o.el = se.createElement(at(o.h, o.h[0]), this.options)), o);
    if (this._$AH?._$AD === i) this._$AH.p(t);
    else {
      const a = new Mt(i, this), s = a.u(this.options);
      a.p(t), this.T(s), this._$AH = a;
    }
  }
  _$AC(e) {
    let t = We.get(e.strings);
    return t === void 0 && We.set(e.strings, t = new se(e)), t;
  }
  k(e) {
    Ae(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let o, i = 0;
    for (const a of e) i === t.length ? t.push(o = new le(this.O(ne()), this.O(ne()), this, this.options)) : o = t[i], o._$AI(a), i++;
    i < t.length && (this._$AR(o && o._$AB.nextSibling, i), t.length = i);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const o = Fe(e).nextSibling;
      Fe(e).remove(), e = o;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class fe {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, o, i, a) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = e, this.name = t, this._$AM = i, this.options = a, o.length > 2 || o[0] !== "" || o[1] !== "" ? (this._$AH = Array(o.length - 1).fill(new String()), this.strings = o) : this._$AH = u;
  }
  _$AI(e, t = this, o, i) {
    const a = this.strings;
    let s = !1;
    if (a === void 0) e = Q(this, e, t, 0), s = !ae(e) || e !== this._$AH && e !== G, s && (this._$AH = e);
    else {
      const l = e;
      let r, d;
      for (e = a[0], r = 0; r < a.length - 1; r++) d = Q(this, l[o + r], t, r), d === G && (d = this._$AH[r]), s ||= !ae(d) || d !== this._$AH[r], d === u ? e = u : e !== u && (e += (d ?? "") + a[r + 1]), this._$AH[r] = d;
    }
    s && !i && this.j(e);
  }
  j(e) {
    e === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Et extends fe {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === u ? void 0 : e;
  }
}
class Tt extends fe {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== u);
  }
}
class Pt extends fe {
  constructor(e, t, o, i, a) {
    super(e, t, o, i, a), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = Q(this, e, t, 0) ?? u) === G) return;
    const o = this._$AH, i = e === u && o !== u || e.capture !== o.capture || e.once !== o.once || e.passive !== o.passive, a = e !== u && (o === u || i);
    i && this.element.removeEventListener(this.name, this, o), a && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class It {
  constructor(e, t, o) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = o;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    Q(this, e);
  }
}
const qt = Se.litHtmlPolyfillSupport;
qt?.(se, le), (Se.litHtmlVersions ??= []).push("3.3.3");
const Dt = (n, e, t) => {
  const o = t?.renderBefore ?? e;
  let i = o._$litPart$;
  if (i === void 0) {
    const a = t?.renderBefore ?? null;
    o._$litPart$ = i = new le(e.insertBefore(ne(), a), a, void 0, t ?? {});
  }
  return i._$AI(n), i;
};
const Ce = globalThis;
class S extends Z {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Dt(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return G;
  }
}
S._$litElement$ = !0, S.finalized = !0, Ce.litElementHydrateSupport?.({ LitElement: S });
const Ot = Ce.litElementPolyfillSupport;
Ot?.({ LitElement: S });
(Ce.litElementVersions ??= []).push("4.2.2");
const Rt = { attribute: !0, type: String, converter: pe, reflect: !1, hasChanged: ke }, Lt = (n = Rt, e, t) => {
  const { kind: o, metadata: i } = t;
  let a = globalThis.litPropertyMetadata.get(i);
  if (a === void 0 && globalThis.litPropertyMetadata.set(i, a = /* @__PURE__ */ new Map()), o === "setter" && ((n = Object.create(n)).wrapped = !0), a.set(t.name, n), o === "accessor") {
    const { name: s } = t;
    return { set(l) {
      const r = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(s, r, n, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(s, void 0, n, l), l;
    } };
  }
  if (o === "setter") {
    const { name: s } = t;
    return function(l) {
      const r = this[s];
      e.call(this, l), this.requestUpdate(s, r, n, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + o);
};
function b(n) {
  return (e, t) => typeof t == "object" ? Lt(n, e, t) : ((o, i, a) => {
    const s = i.hasOwnProperty(a);
    return i.constructor.createProperty(a, o), s ? Object.getOwnPropertyDescriptor(i, a) : void 0;
  })(n, e, t);
}
function z(n) {
  return b({ ...n, state: !0, attribute: !1 });
}
const Ft = {
  show_header: !0,
  show_queue: !0,
  show_controls: !0,
  compact: !1
};
function v(n) {
  if (typeof n == "number" && Number.isFinite(n)) return n;
  if (typeof n == "string" && n.trim() !== "") {
    const e = Number(n);
    if (Number.isFinite(e)) return e;
  }
}
function g(n) {
  return typeof n == "string" && n !== "" ? n : void 0;
}
function Y(n) {
  return Array.isArray(n) ? n : [];
}
function T(n) {
  return !n || n.state === "unavailable" || n.state === "unknown";
}
function we(n, e, t) {
  return Math.min(t, Math.max(e, n));
}
function J(n, e) {
  customElements.get(n) || customElements.define(n, e);
}
const Ut = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_leak: "leak",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, Ht = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_water_total: "zone_water_total",
  zone_leak: "leak",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function st(n) {
  const e = {}, t = /* @__PURE__ */ new Map(), o = [];
  for (const a of Object.values(n.states)) {
    const s = g(a.attributes.maestro_role);
    if (!s) continue;
    o.push(a.entity_id);
    const l = g(a.attributes.zone_id);
    if (l) {
      let r = t.get(l);
      if (r || (r = {
        zoneId: l,
        name: l,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(l, r)), s === "cycle_enabled")
        r.cycleSwitches.push(a);
      else {
        const d = Ht[s];
        d && (r[d] = a);
      }
    } else {
      const r = Ut[s];
      r && (e[r] = a);
    }
  }
  const i = [...t.values()];
  for (const a of i) {
    const s = a.state?.attributes ?? {};
    a.name = g(s.zone_name) ?? g(a.state?.attributes.friendly_name) ?? a.zoneId, a.order = v(s.order) ?? v(a.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return i.sort(
    (a, s) => a.order - s.order || a.name.localeCompare(s.name)
  ), { found: o.length > 0, hub: e, zones: i, entityIds: o };
}
function jt(n) {
  return T(n.state) ? !1 : !Y(n.state?.attributes?.degraded).some((t) => g(t) === "no_flow_meter");
}
function rt(n) {
  const e = n.state?.attributes?.capabilities;
  return e && typeof e == "object" ? e : {};
}
function Bt(n) {
  const e = rt(n), t = [];
  g(e.water_accounting) === "estimated" && t.push({ key: "water_estimated", tone: "muted" });
  const o = g(e.leak_watch);
  o === "none" ? t.push({ key: "leak_unavailable", tone: "muted" }) : o === "system" && t.push({ key: "leak_system_scope", tone: "muted" }), g(e.leak_detection) === "candidate_available" && t.push({ key: "leak_candidate", tone: "hint" });
  const i = g(e.water_supply);
  return i === "unavailable" ? t.push({ key: "supply_unavailable", tone: "muted" }) : i === "candidate_available" && t.push({ key: "supply_candidate", tone: "hint" }), t;
}
const Vt = ["leak_never_observable", "leak_evidence_unresolved"];
function lt(n) {
  return !n || n.state !== "on" ? null : {
    coverage: "alarm",
    confirmedAt: g(n.attributes.since),
    sources: Y(n.attributes.sources).map((e) => g(e)).filter((e) => e !== void 0),
    describingSource: g(n.attributes.describing_source)
  };
}
function Wt(n) {
  const e = lt(n.leak);
  if (e) return e;
  if (n.leak?.state === "off") return { coverage: "quiet", sources: [] };
  const t = Y(n.state?.attributes?.degraded).map((o) => g(o));
  return Vt.some((o) => t.includes(o)) ? { coverage: "unresolved", sources: [] } : g(rt(n).leak_watch) === "zone" ? { coverage: "establishing", sources: [] } : { coverage: "unknown", sources: [] };
}
function Zt(n) {
  const e = lt(n.leak);
  return e || { coverage: n.leak?.state === "off" ? "quiet" : "unknown", sources: [] };
}
function Gt(n) {
  const e = n.zone_water_total;
  if (!e) return null;
  const t = v(e.state);
  return t === void 0 ? null : {
    total: t,
    today: v(e.attributes.today_l) ?? 0,
    month: v(e.attributes.month_l) ?? 0,
    estimated: !!e.attributes.estimated
  };
}
function Qt(n) {
  return v(n.state?.attributes?.adjustment_pct) ?? 100;
}
const N = {
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
  // Driven by `leak_watch`, not by `leak_detection`: this says nothing
  // watches the zone AT ALL, which is a coverage statement and not a
  // statement about the valve's sensor. A metered zone with no sensor never
  // sees it.
  "zone.leak_unavailable": "Leaks not watched here",
  // The shared-line-meter zone: watched, but not by an alarm that can name
  // it. Says where, because "not watched" would be false and "watched" alone
  // would promise a zone-named alarm that can never arrive.
  "zone.leak_system_scope": "Leaks watched at system level, not for this zone",
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
  // Which one wins, when the user picked something other than what the
  // device offers -- the same distinction the flow unit's note draws
  // between an override and the entity's own declaration.
  "zone.sensor_detected_other": "Using the sensor you picked; this valve's device also offers {entity}",
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
  "settings.leak_confirm_s_hint": 'Seconds the evidence must last before the alarm is raised. Each leak entity also stays unavailable until its scope has been watched this long (never less than 30 s, so that "no problem" is never asserted out of nothing), so raising it postpones a first answer. Default 300.',
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
  "settings.advanced_note": "Advanced parameters (engine, safety, notifications) live in Settings",
  // Program calendar, rendered in words. Diagnostic #5 from the brief: "Mon
  // and Thu" and "every 3 days with a retry" are very different behaviours
  // and were distinguishable only by reading the stored JSON. Weekday names
  // live here rather than coming from toLocaleDateString, so the card's
  // language wins over the browser's.
  "weekday.0": "Mon",
  "weekday.1": "Tue",
  "weekday.2": "Wed",
  "weekday.3": "Thu",
  "weekday.4": "Fri",
  "weekday.5": "Sat",
  "weekday.6": "Sun",
  "list.and": "and",
  "calendar.every_day": "every day",
  "calendar.interval": "every {n} days",
  "calendar.parity_odd": "odd days",
  "calendar.parity_even": "even days",
  "calendar.last_completed": "last completed {date}",
  "calendar.never_completed": "never completed",
  // Consumption history chart. The three marks carry their meaning in SHAPE
  // (solid, hatched, baseline tick) and not in hue alone: the card may force
  // no colours, must work on light and dark themes, and must stay readable to
  // someone who cannot tell two theme tokens apart.
  "chart.no_data": "No consumption recorded for this period.",
  "chart.measured": "measured",
  "chart.estimated": "estimated",
  "chart.gap": "meter unreadable",
  "chart.unrecorded": "not recorded yet",
  "chart.aria": "Daily water use over {days} days, {liters} litres in total"
}, Yt = {
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
  // Guidata da `leak_watch`, non da `leak_detection`: dice che nessuno
  // sorveglia la zona, il che riguarda la copertura e non il sensore della
  // valvola. Una zona con flussometro proprio non la vede mai.
  "zone.leak_unavailable": "Perdite non sorvegliate qui",
  // La zona dietro al flussometro condiviso: sorvegliata, ma non da un
  // allarme che possa nominarla. Dice dove, perché «non sorvegliata» sarebbe
  // falso e «sorvegliata» prometterebbe un allarme di zona che non arriverà.
  "zone.leak_system_scope": "Perdite sorvegliate sull'impianto, non su questa zona",
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
  // Quale dei due vince, quando l'utente ne ha scelto uno diverso da
  // quello che offre il dispositivo: la stessa distinzione che la nota
  // dell'unità del flussometro fa fra una forzatura e l'entità.
  "zone.sensor_detected_other": "Uso il sensore che hai scelto; il dispositivo della valvola ne offre anche un altro ({entity})",
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
  "settings.leak_confirm_s_hint": "Secondi per cui le prove devono durare prima che scatti l'allarme. Ogni entità di perdita resta non disponibile finché il suo ambito non è stato osservato altrettanto a lungo (mai meno di 30 s, perché «nessun problema» non venga mai affermato dal nulla), quindi alzarlo rimanda anche la prima risposta. Default 300.",
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
  "settings.advanced_note": "Parametri avanzati (motore, sicurezza, notifiche) → Impostazioni",
  // Calendario del programma, in parole. Diagnostico #5 del brief: "lun e
  // gio" e "ogni 3 giorni con ritentativo" sono comportamenti molto diversi
  // e si distinguevano solo leggendo il JSON. I nomi dei giorni stanno qui e
  // non vengono da toLocaleDateString, così la lingua della card vince su
  // quella del browser.
  "weekday.0": "lun",
  "weekday.1": "mar",
  "weekday.2": "mer",
  "weekday.3": "gio",
  "weekday.4": "ven",
  "weekday.5": "sab",
  "weekday.6": "dom",
  "list.and": "e",
  "calendar.every_day": "ogni giorno",
  "calendar.interval": "ogni {n} giorni",
  "calendar.parity_odd": "giorni dispari",
  "calendar.parity_even": "giorni pari",
  "calendar.last_completed": "ultimo completato il {date}",
  "calendar.never_completed": "mai completato",
  // Grafico dello storico dei consumi. I tre marcatori portano il significato
  // nella FORMA (pieno, tratteggiato, tacca sulla base) e non nel solo colore:
  // la card non forza colori, deve funzionare su temi chiari e scuri e deve
  // restare leggibile a chi non distingue due token del tema.
  "chart.no_data": "Nessun consumo registrato in questo periodo.",
  "chart.measured": "misurato",
  "chart.estimated": "litri stimati",
  "chart.gap": "flussometro non leggibile",
  "chart.unrecorded": "non ancora registrato",
  "chart.aria": "Consumo giornaliero su {days} giorni, {liters} litri in totale"
}, ge = {
  en: N,
  it: Yt
};
function ct(n) {
  const t = (n?.locale?.language ?? n?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in ge ? t : "en";
}
function Kt(n, e) {
  return e ? n.replace(/\{(\w+)\}/g, (t, o) => {
    const i = e[o];
    return i === void 0 ? t : String(i);
  }) : n;
}
function c(n, e, t) {
  const o = ge[n] ?? N;
  return Kt(o[e] ?? N[e], t);
}
function F(n, e, t) {
  const o = `${e}.${t}`, i = ge[n] ?? N, a = N;
  return i[o] ?? a[o] ?? t;
}
function Xt(n, e) {
  const t = ge[n] ?? N, o = N;
  for (const i of ["queue_state", "zone_state", "outcome"]) {
    const a = `${i}.${e}`, s = t[a] ?? o[a];
    if (s !== void 0) return s;
  }
  return e;
}
const Ze = /* @__PURE__ */ new Map(), Ge = /* @__PURE__ */ new Map(), Qe = /* @__PURE__ */ new Map();
function ce(n) {
  let e = Ze.get(n);
  return e || (e = new Intl.RelativeTimeFormat(n, { numeric: "auto" }), Ze.set(n, e)), e;
}
function xe(n, e, t = Date.now()) {
  if (!n) return;
  const o = Date.parse(n);
  if (Number.isNaN(o)) return;
  const i = Math.round((o - t) / 1e3), a = Math.abs(i);
  try {
    return a < 60 ? ce(e).format(i, "second") : a < 3600 ? ce(e).format(Math.round(i / 60), "minute") : a < 86400 ? ce(e).format(Math.round(i / 3600), "hour") : ce(e).format(Math.round(i / 86400), "day");
  } catch {
    return;
  }
}
function Jt(n, e) {
  if (!n) return;
  const t = Date.parse(n);
  if (Number.isNaN(t)) return;
  let o = Ge.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }), Ge.set(e, o)), o.format(t);
}
function eo(n, e) {
  if (!n) return;
  const t = Date.parse(n);
  if (Number.isNaN(t)) return;
  let o = Qe.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }), Qe.set(e, o)), o.format(t);
}
function U(n, e = 1) {
  const t = v(n);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (o) => e > 0 ? "" : o);
}
function dt(n, e, t, o) {
  const i = [e], a = t.describingSource ?? t.sources[0];
  a && i.push(F(n, "leak_source", a));
  const s = xe(t.confirmedAt, n, o);
  return s && i.push(c(n, "zone.leak_confirmed_at", { when: s })), i.join(" · ");
}
function to(n) {
  const e = v(n);
  if (e !== void 0) return e;
  if (n && typeof n == "object") {
    const t = n;
    return v(t.duration_min) ?? v(t.duration) ?? v(t.minutes);
  }
}
function oo(n, e) {
  const t = g(n.run_started_at), o = v(n.run_duration_min);
  if (!t || o === void 0 || o <= 0)
    return;
  const i = Date.parse(t);
  if (Number.isNaN(i)) return;
  const a = (e - i) / 6e4, s = we(a / o, 0, 1), l = Math.max(0, Math.ceil(o - a)), r = [], d = n.run_planned_runs;
  if (Array.isArray(d) && d.length > 1) {
    const h = d.map(to).filter((m) => m !== void 0 && m > 0), _ = h.reduce((m, f) => m + f, 0);
    if (h.length > 1 && _ > 0) {
      let m = 0;
      for (let f = 0; f < h.length - 1; f += 1)
        m += h[f] ?? 0, r.push(m / _);
    }
  }
  return { fraction: s, remainingMin: l, segmentBounds: r };
}
function io(n) {
  const e = Math.abs(Math.round(n)), t = Math.floor(e / 3600), o = Math.round(e % 3600 / 60), i = [];
  return t > 0 && i.push(`${t} h`), o > 0 && i.push(`${o} min`), i.length === 0 && i.push(`${e} s`), i.join(" ");
}
function no(n, e) {
  if (!n || typeof n != "object") return "";
  if (n.kind === "sun" && (n.event === "sunrise" || n.event === "sunset")) {
    const o = c(
      e,
      n.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), i = v(n.offset_s) ?? 0;
    if (i === 0) return o;
    const a = i < 0 ? "−" : "+";
    return `${o} ${a} ${io(i)}`;
  }
  const t = g(n.at) ?? g(n.time);
  return t ? c(e, "trigger.at", { time: t }) : g(n.kind) ?? "";
}
function ut(n) {
  const e = Math.floor(n), t = n - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function pt(n) {
  if (!Array.isArray(n)) return [];
  const e = [];
  for (const t of n) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const o = v(t[0]), i = v(t[1]);
    o !== void 0 && i !== void 0 && e.push([o, i]);
  }
  return [...e].sort((t, o) => t[0] - o[0]);
}
const ao = 25, so = [5, 12, 20, 25, 30, 35, 40];
function ht(n, e) {
  const t = n[0], o = n[n.length - 1];
  if (!t || !o) return 0;
  if (e <= t[0]) return t[1];
  if (e >= o[0]) return o[1];
  for (let i = 0; i < n.length - 1; i++) {
    const a = n[i], s = n[i + 1];
    if (!a || !s) continue;
    const [l, r] = a, [d, h] = s;
    if (l <= e && e <= d) return r + (h - r) * (e - l) / (d - l);
  }
  return o[1];
}
function ro(n, e, t = 100, o, i) {
  let a = ht(n, e) * t / 100;
  return o !== void 0 && (a = Math.max(a, o)), i !== void 0 && (a = Math.min(a, i)), a;
}
function lo(n) {
  if (n.length === 0) return "curve_empty";
  for (const e of n)
    if (e[1] < 0) return "curve_negative_value";
  for (let e = 1; e < n.length; e++) {
    const t = n[e - 1], o = n[e];
    if (!(!t || !o) && o[0] <= t[0])
      return "curve_temps_not_increasing";
  }
  return null;
}
var co = Object.defineProperty, uo = (n, e, t, o) => {
  for (var i = void 0, a = n.length - 1, s; a >= 0; a--)
    (s = n[a]) && (i = s(e, t, i) || i);
  return i && co(e, t, i), i;
};
const B = 150, V = 44, de = 6, Ye = 6, Me = class Me extends S {
  render() {
    const e = this.curve, t = pt(e?.points);
    if (t.length === 0) return u;
    const o = v(e?.min), i = v(e?.max), a = t.map((y) => y[0]), s = t.map((y) => y[1]);
    o !== void 0 && s.push(o), i !== void 0 && s.push(i);
    let l = Math.min(...a), r = Math.max(...a), d = Math.min(...s), h = Math.max(...s);
    r - l < 1e-9 && (l -= 1, r += 1), h - d < 1e-9 && (d -= 1, h += 1);
    const _ = (y) => de + (y - l) / (r - l) * (B - 2 * de), m = (y) => V - Ye - (y - d) / (h - d) * (V - 2 * Ye), f = t.map((y, ee) => `${ee === 0 ? "M" : "L"}${_(y[0]).toFixed(1)},${m(y[1]).toFixed(1)}`).join(" "), w = (y, ee) => R`
      <line
        class="clamp"
        x1="0" x2="${B}"
        y1="${m(y).toFixed(1)}" y2="${m(y).toFixed(1)}"
      ></line>
      <text class="clamp-label" x="${B - 2}" text-anchor="end"
        y="${(m(y) - 2).toFixed(1)}">${ee}</text>
    `, k = t[0], I = t[t.length - 1];
    return p`
      <svg
        viewBox="0 0 ${B} ${V + 10}"
        width="${B}"
        height="${V + 10}"
        role="img"
        aria-hidden="true"
      >
        ${o !== void 0 ? w(o, String(o)) : u}
        ${i !== void 0 ? w(i, String(i)) : u}
        <path class="line" d="${f}"></path>
        ${t.map(
      (y) => R`<circle class="dot" r="2"
            cx="${_(y[0]).toFixed(1)}" cy="${m(y[1]).toFixed(1)}"></circle>`
    )}
        ${k ? R`<text class="axis-label" x="${de}" y="${V + 8}"
              text-anchor="start">${k[0]}°</text>` : u}
        ${I && I !== k ? R`<text class="axis-label" x="${B - de}" y="${V + 8}"
              text-anchor="end">${I[0]}°</text>` : u}
      </svg>
    `;
  }
};
Me.styles = X`
    :host {
      display: inline-block;
      line-height: 0;
    }
    svg {
      display: block;
      overflow: visible;
    }
    .line {
      fill: none;
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 1.8;
      stroke-linejoin: round;
      stroke-linecap: round;
    }
    .dot {
      fill: var(--primary-color, #03a9f4);
    }
    .clamp {
      stroke: var(--secondary-text-color, #727272);
      stroke-width: 1;
      stroke-dasharray: 3 3;
      opacity: 0.7;
    }
    .clamp-label {
      fill: var(--secondary-text-color, #727272);
      font-size: 7px;
      font-family: inherit;
    }
    .axis-label {
      fill: var(--secondary-text-color, #727272);
      font-size: 7.5px;
      font-family: inherit;
    }
  `;
let _e = Me;
uo([
  b({ attribute: !1 })
], _e.prototype, "curve");
J("imc-curve-sparkline", _e);
function _t(n) {
  return [...n].sort((e, t) => e[0] - t[0]);
}
function po(n, e) {
  const t = n[e];
  if (!t) return n;
  const o = n[e + 1], i = o ? [(t[0] + o[0]) / 2, (t[1] + o[1]) / 2] : [t[0] + 5, t[1]];
  return _t([...n, i]);
}
function ho(n, e) {
  return n.length <= 1 ? n : n.filter((t, o) => o !== e);
}
function be(n, e, t, o) {
  const i = [...n];
  return i[e] ? (i[e] = [t, Math.max(0, o)], i) : n;
}
function _o(n, e) {
  return e ? n : void 0;
}
function mo(n) {
  return n.intensity_pct !== void 0 && n.intensity_pct !== 100 ? !0 : Object.keys(n.day_intensity_pct ?? {}).length > 0;
}
function fo(n, e, t) {
  return e === 0 ? n : Math.max(0, ut(n - e * t));
}
function go(n, e, t, o, i, a) {
  const s = [...n.map((d) => d[1]), e, t], l = Math.max(12, ...s) + 4, r = o - i - a;
  return {
    top: l,
    y: (d) => o - a - d / l * r
  };
}
var vo = Object.defineProperty, A = (n, e, t, o) => {
  for (var i = void 0, a = n.length - 1, s; a >= 0; a--)
    (s = n[a]) && (i = s(e, t, i) || i);
  return i && vo(e, t, i), i;
};
const M = 320, D = 170, C = 34, O = 12, oe = 16, W = 24, Ke = 5, Xe = 40, Je = 2, Ee = class Ee extends S {
  constructor() {
    super(...arguments), this.language = "en", this.zoneHasFlowMeter = !1, this.zoneAdjustmentPct = 100, this._points = [[ao, 15]], this._min = 1, this._max = 120, this._kind = "duration", this._error = null;
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = pt(e?.points);
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
    return ut(ro(this._points, e, this.zoneAdjustmentPct, this._min, this._max));
  }
  _unit() {
    return c(this.language, this._kind === "volume" ? "curve.unit_volume" : "curve.unit_duration");
  }
  _axisMin() {
    return Math.min(this._points[0]?.[0] ?? Ke, Ke) - Je;
  }
  _axisMax() {
    const e = this._points[this._points.length - 1];
    return Math.max(e?.[0] ?? Xe, Xe) + Je;
  }
  _sx(e) {
    const t = this._axisMin(), o = this._axisMax();
    return C + (e - t) / (o - t) * (M - C - O);
  }
  /** The graph's vertical axis, scaled to contain every raw point AND both
   *  clamp lines — see `graphAxis`'s doc comment for why both matter. */
  _axis() {
    return go(this._points, this._min, this._max, D, oe, W);
  }
  _sy(e) {
    return this._axis().y(e);
  }
  /** Client coordinates of a pointer event, converted into the SVG's
   *  viewBox units (0..GRAPH_H on the y-axis). */
  _pointerViewY(e, t, o) {
    const i = e.createSVGPoint();
    return i.x = o.clientX, i.y = o.clientY, i.matrixTransform(t.inverse()).y;
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
    const o = t.currentTarget.ownerSVGElement;
    if (!o) return;
    const i = this._points[e];
    if (!i) return;
    const a = i[1], s = o.getScreenCTM();
    if (!s) return;
    const l = this._pointerViewY(o, s, t), r = this._axis().top / (D - oe - W), d = (_) => {
      const m = o.getScreenCTM();
      if (!m) return;
      const f = this._pointerViewY(o, m, _) - l;
      this._points = be(
        this._points,
        e,
        i[0],
        fo(a, f, r)
      ), this._error = null;
    }, h = () => {
      window.removeEventListener("pointermove", d), window.removeEventListener("pointerup", h);
    };
    window.addEventListener("pointermove", d), window.addEventListener("pointerup", h);
  }
  _save() {
    const e = lo(this._points) ?? (this._min > this._max ? "min_above_max" : null) ?? (this._min < 0 ? "negative_clamp" : null);
    if (e) {
      this._error = e;
      return;
    }
    this._error = null;
    const t = _o(this._kind, this.zoneHasFlowMeter);
    this.dispatchEvent(
      new CustomEvent("imc-curve-save", {
        detail: {
          cycleId: this.cycle?.cycle_id ?? "",
          points: this._points.map((o) => [o[0], o[1]]),
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
    return p`
      <div class="title">${c(e, "editor.title")}</div>

      ${this._renderIntensityNotice(e)}

      <div class="graph-box">
        <div class="caption">${c(e, "editor.graph.caption")}</div>
        ${this._renderGraph(e)}
      </div>

      ${this._renderAdjustmentNote(e)}

      <div class="caption">${c(e, "editor.preview_title")}</div>
      <div class="examples">
        ${so.map((t) => this._exampleTile(`${t}°`, this._deliveryValue(t)))}
      </div>

      ${this._renderToday(e)}

      <div class="points-title">${c(e, "editor.points_title")}</div>
      ${this._points.map((t, o) => this._renderPointRow(t, o, e))}

      ${this.zoneHasFlowMeter ? this._renderKind(e) : u}

      <div class="limits">
        <div class="limit">
          <label>${c(e, "editor.min.label")}</label>
          <div class="help">${c(e, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(t) => {
      const o = Number(t.target.value);
      Number.isNaN(o) || (this._min = o, this._error = null);
    }} /> ${this._unit()}
        </div>
        <div class="limit">
          <label>${c(e, "editor.max.label")}</label>
          <div class="help">${c(e, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(t) => {
      const o = Number(t.target.value);
      Number.isNaN(o) || (this._max = o, this._error = null);
    }} /> ${this._unit()}
        </div>
      </div>

      ${this._error ? p`<div class="error">${F(e, "editor", this._error)}</div>` : u}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${c(e, "editor.save")}</button>
        <button @click=${this._cancel}>${c(e, "editor.cancel")}</button>
      </div>
    `;
  }
  _renderIntensityNotice(e) {
    return mo(this.cycle ?? {}) ? p`<div class="intensity-notice">
      ${c(e, "editor.intensity_reset")}
    </div>` : u;
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
    return this.zoneAdjustmentPct === 100 ? u : p`<div class="graph-note">
      ${c(e, "editor.graph.adjustment_note", { pct: this.zoneAdjustmentPct })}
    </div>`;
  }
  _renderKind(e) {
    return p`<div class="kind">
      <label for="imc-curve-kind">${c(e, "editor.kind_label")}</label>
      <select
        id="imc-curve-kind"
        .value=${this._kind}
        @change=${(t) => {
      const o = t.target.value;
      this._kind = o === "volume" ? "volume" : "duration";
    }}
      >
        <option value="duration">${c(e, "editor.kind_duration")}</option>
        <option value="volume">${c(e, "editor.kind_volume")}</option>
      </select>
    </div>`;
  }
  _exampleTile(e, t) {
    return p`<div class="example"><div class="lbl">${e}</div><div class="num">${t} ${this._unit()}</div></div>`;
  }
  _renderToday(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return u;
    const o = this._deliveryValue(t);
    return p`<div class="today-banner">${c(e, "editor.today", {
      temp: Math.round(t),
      value: o,
      unit: this._unit()
    })}</div>`;
  }
  _renderPointRow(e, t, o) {
    return p`<div class="point-row">
      <input
        type="number"
        step="0.5"
        .value=${String(e[0])}
        aria-label=${c(o, "editor.point_temp")}
        @change=${(i) => this._editPoint(t, i, "temp")}
      /> °C
      <input
        type="number"
        min="0"
        step="1"
        .value=${String(e[1])}
        aria-label=${c(o, "editor.point_value")}
        @change=${(i) => this._editPoint(t, i, "value")}
      /> ${this._unit()}
      <button
        type="button"
        ?disabled=${this._points.length <= 1}
        title=${c(o, "editor.point_remove")}
        @click=${() => this._points = ho(this._points, t)}
      >
        ✕
      </button>
      <button
        type="button"
        title=${c(o, "editor.point_add")}
        @click=${() => this._points = po(this._points, t)}
      >
        ＋
      </button>
    </div>`;
  }
  _editPoint(e, t, o) {
    const i = Number(t.target.value);
    if (Number.isNaN(i)) return;
    const a = this._points[e];
    if (!a) return;
    const s = o === "temp" ? be(this._points, e, i, a[1]) : be(this._points, e, a[0], i);
    this._points = _t(s), this._error = null;
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
    const t = this._axisMin(), o = this._axisMax(), i = [];
    for (let f = t; f <= o; f += 1)
      i.push([this._sx(f), this._sy(ht(this._points, f))]);
    const a = i.map((f, w) => `${w === 0 ? "M" : "L"}${f[0].toFixed(1)},${f[1].toFixed(1)}`).join(" "), s = this.weightedTemp, l = s !== void 0 && !Number.isNaN(s) && s >= t && s <= o, r = this._sy(this._min), d = this._sy(this._max), h = Math.min(r, d), _ = Math.abs(d - r), m = this._unit();
    return R`
      <svg viewBox="0 0 ${M} ${D}">
        <rect class="clamp-band" x=${C} y=${h.toFixed(1)}
          width=${(M - C - O).toFixed(1)} height=${_.toFixed(1)}></rect>
        <line class="clamp-line" x1=${C} y1=${r.toFixed(1)} x2=${M - O} y2=${r.toFixed(1)}></line>
        <line class="clamp-line" x1=${C} y1=${d.toFixed(1)} x2=${M - O} y2=${d.toFixed(1)}></line>
        <text class="clamp-text" x=${M - O} y=${(r - 3).toFixed(1)} text-anchor="end">${c(e, "curve.clamp_min")} ${this._min} ${m}</text>
        <text class="clamp-text" x=${M - O} y=${(d - 3).toFixed(1)} text-anchor="end">${c(e, "curve.clamp_max")} ${this._max} ${m}</text>
        <line class="axis" x1=${C} y1=${oe} x2=${C} y2=${D - W}></line>
        <line class="axis" x1=${C} y1=${D - W} x2=${M - O} y2=${D - W}></line>
        ${l ? R`<line class="today" x1=${this._sx(s)} y1=${oe} x2=${this._sx(s)} y2=${D - W}></line>
              <text class="today-text" x=${this._sx(s)} y=${oe - 4} text-anchor="middle">${c(e, "editor.graph.today", { temp: Math.round(s) })}</text>` : u}
        <path class="curve" d=${a}></path>
        ${this._points.map(
      (f, w) => R`<circle class="handle" r="7"
            cx=${this._sx(f[0]).toFixed(1)} cy=${this._sy(f[1]).toFixed(1)}
            @pointerdown=${(k) => this._startDrag(w, k)}></circle>`
    )}
      </svg>
    `;
  }
};
Ee.styles = X`
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
let x = Ee;
A([
  b()
], x.prototype, "language");
A([
  b({ attribute: !1 })
], x.prototype, "cycle");
A([
  b({ attribute: !1 })
], x.prototype, "weightedTemp");
A([
  b({ type: Boolean })
], x.prototype, "zoneHasFlowMeter");
A([
  b({ type: Number })
], x.prototype, "zoneAdjustmentPct");
A([
  z()
], x.prototype, "_points");
A([
  z()
], x.prototype, "_min");
A([
  z()
], x.prototype, "_max");
A([
  z()
], x.prototype, "_kind");
A([
  z()
], x.prototype, "_error");
J("imc-curve-editor", x);
var yo = Object.defineProperty, P = (n, e, t, o) => {
  for (var i = void 0, a = n.length - 1, s; a >= 0; a--)
    (s = n[a]) && (i = s(e, t, i) || i);
  return i && yo(e, t, i), i;
};
const mt = {
  idle: "mdi:water-outline",
  queued: "mdi:timer-sand",
  watering: "mdi:water",
  soaking: "mdi:water-percent",
  paused: "mdi:pause-circle-outline",
  suspended: "mdi:calendar-remove-outline",
  disabled: "mdi:water-off-outline"
}, bo = [1, 4, 8, 24], wo = {
  water_estimated: { label: "zone.water_estimated", icon: "mdi:approximately-equal" },
  leak_unavailable: { label: "zone.leak_unavailable", icon: "mdi:water-alert-outline" },
  leak_system_scope: { label: "zone.leak_system_scope", icon: "mdi:home-flood" },
  leak_candidate: { label: "zone.leak_candidate", icon: "mdi:water-plus-outline" },
  supply_unavailable: { label: "zone.supply_unavailable", icon: "mdi:water-pump-off" },
  supply_candidate: { label: "zone.supply_candidate", icon: "mdi:water-pump" }
};
function xo(n) {
  return n in mt;
}
const Te = class Te extends S {
  constructor() {
    super(...arguments), this.language = "en", this.now = Date.now(), this.compact = !1, this.showControls = !0, this._expanded = !1;
  }
  get _zoneState() {
    const e = this.zone?.state?.state;
    return e && xo(e) ? e : void 0;
  }
  _dispatch(e) {
    this.dispatchEvent(
      new CustomEvent("imc-zone-action", {
        detail: e,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _toggleExpanded() {
    this._expanded = !this._expanded;
  }
  _onHeaderKeydown(e) {
    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this._toggleExpanded());
  }
  _onPauseSelect(e) {
    const t = e.currentTarget, o = Number(t.value);
    t.value = "";
    const i = this.zone?.zoneId;
    i && Number.isFinite(o) && o > 0 && this._dispatch({ action: "pause", zoneId: i, hours: o });
  }
  _onSuspendDate(e) {
    const t = e.currentTarget, o = t.value;
    t.value = "";
    const i = this.zone?.zoneId;
    i && o && this._dispatch({ action: "suspend", zoneId: i, until: `${o}T00:00:00` });
  }
  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */
  _renderBadges(e, t) {
    const o = this.zone;
    if (!o) return u;
    const i = o.state?.attributes ?? {}, a = [];
    if (t.coverage === "alarm") {
      const r = c(this.language, "zone.leak_alarm");
      a.push(p`
        <span class="badge alarm" title=${this._leakTitle(t)}>
          <ha-icon icon="mdi:water-alert" style="--mdc-icon-size:12px"></ha-icon>
          ${r}
        </span>
      `);
    } else if (t.coverage === "establishing") {
      const r = c(this.language, "zone.leak_checking");
      a.push(p`
        <span class="badge muted" title=${r}>
          <ha-icon icon="mdi:progress-question" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : r}
        </span>
      `);
    }
    const s = g(i.suspended_until) ?? (T(o.suspendUntil) ? void 0 : o.suspendUntil?.state);
    if (this._zoneState === "suspended" && s) {
      const r = eo(s, this.language) ?? s;
      a.push(p`
        <span class="badge" title=${c(this.language, "zone.suspended_until", { date: r })}>
          <ha-icon icon="mdi:calendar-remove-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${r}
        </span>
      `);
    }
    for (const r of Y(i.degraded)) {
      const d = g(r);
      if (!d) continue;
      const h = F(this.language, "degraded", d);
      a.push(p`
        <span class="badge" title=${h}>
          <ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : h}
        </span>
      `);
    }
    const l = Bt(o);
    for (const r of l) {
      const d = wo[r.key], h = c(this.language, d.label);
      a.push(p`
        <span class="badge ${r.tone}" title=${h}>
          <ha-icon icon=${d.icon} style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : h}
        </span>
      `);
    }
    if (e?.estimated && !l.some((r) => r.key === "water_estimated")) {
      const r = c(this.language, "zone.water_estimated");
      a.push(p`
        <span class="badge muted" title=${r}>
          <ha-icon icon="mdi:approximately-equal" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : r}
        </span>
      `);
    }
    return a;
  }
  /** This zone's standing alarm, described once for the badge's tooltip and
   *  the meta line below it (see `describeLeakAlarm` for the two things that
   *  sentence is not allowed to say). */
  _leakTitle(e) {
    return dt(
      this.language,
      c(this.language, "zone.leak_alarm"),
      e,
      this.now
    );
  }
  _renderProgress() {
    const e = this.zone, t = this._zoneState;
    if (!e || t !== "watering" && t !== "soaking")
      return u;
    const o = oo(
      e.state?.attributes ?? {},
      this.now
    );
    return o ? p`
      <div class="progress-line">
        <div class="progress ${t === "soaking" ? "soaking" : ""}">
          <div class="bar" style="width:${(o.fraction * 100).toFixed(2)}%"></div>
          ${o.segmentBounds.map(
      (i) => p`<div class="seg" style="left:${(i * 100).toFixed(2)}%"></div>`
    )}
        </div>
        <span class="remaining">
          ${c(this.language, "zone.remaining", {
      minutes: o.remainingMin
    })}
        </span>
      </div>
    ` : u;
  }
  _renderMeta(e, t) {
    const o = this.zone;
    if (!o) return u;
    const i = this.language, a = [];
    t.coverage === "alarm" && a.push(p`<span class="leak-line">${this._leakTitle(t)}</span>`);
    const s = o.nextRun;
    if (s && !T(s)) {
      const r = xe(s.state, i, this.now), d = Jt(s.state, i), h = g(s.attributes.cycle_name);
      (r || d) && a.push(p`
          <span>
            ${c(i, "zone.next_run")}: ${r ?? ""}
            ${d ? p`<span class="abs">
                  · ${d}${h ? ` (${h})` : ""}
                </span>` : u}
          </span>
        `);
    } else
      a.push(p`<span>${c(i, "zone.no_next_run")}</span>`);
    const l = o.lastOutcome;
    if (l && !T(l) && l.state !== "none") {
      const r = F(i, "outcome", l.state), d = g(l.attributes.reason_key), h = d ? F(i, "reason", d) : void 0, _ = g(l.attributes.finished_at), m = xe(_, i, this.now);
      a.push(p`
        <span>
          ${c(i, "zone.last_outcome")}: ${r}${h ? ` — ${h}` : ""}${m ? p`<span class="abs"> · ${m}</span>` : u}
        </span>
      `);
    }
    if (e) {
      const r = c(i, "curve.unit_volume");
      a.push(p`
        <span>
          ${U(e.total, 0)} ${r}
          <span class="abs">
            · ${c(i, "zone.water_today")}
            ${U(e.today, 0)} ${r} ·
            ${c(i, "zone.water_month")}
            ${U(e.month, 0)} ${r}
          </span>
        </span>
      `);
    }
    return p`<div class="meta">${a}</div>`;
  }
  _renderControls() {
    const e = this.zone;
    if (!e || !this.showControls) return u;
    const t = this.language, o = e.zoneId, i = this._zoneState, a = e.enabledSwitch, s = a?.state === "on", l = i === "paused" || i === "suspended";
    return p`
      <div class="controls" @click=${(r) => r.stopPropagation()}>
        <button @click=${() => this._dispatch({ action: "run", zoneId: o })}>
          ${c(t, "controls.run_now")}
        </button>
        <button @click=${() => this._dispatch({ action: "skip", zoneId: o })}>
          ${c(t, "controls.skip_today")}
        </button>
        <select
          .value=${""}
          @change=${this._onPauseSelect}
          aria-label=${c(t, "controls.pause_for")}
        >
          <option value="" disabled selected hidden>
            ${c(t, "controls.pause_for")}
          </option>
          ${bo.map(
      (r) => p`<option value=${r}>
              ${c(t, "controls.hours", { hours: r })}
            </option>`
    )}
        </select>
        <input
          type="date"
          @change=${this._onSuspendDate}
          aria-label=${c(t, "controls.suspend_until")}
          title=${c(t, "controls.suspend_until")}
        />
        ${l ? p`<button
              @click=${() => this._dispatch({ action: "resume", zoneId: o })}
            >
              ${c(t, "controls.resume")}
            </button>` : u}
        ${a ? p`<button
              @click=${() => this._dispatch({
      action: "set-enabled",
      zoneId: o,
      enabled: !s
    })}
            >
              ${c(t, s ? "controls.disable" : "controls.enable")}
            </button>` : u}
      </div>
    `;
  }
  _renderCycles() {
    const e = this.zone;
    if (!e) return u;
    const t = this.language, o = Y(e.state?.attributes.cycles).filter(
      (i) => !!i && typeof i == "object"
    );
    return o.length === 0 ? p`<div class="details">
        <div class="no-cycles">${c(t, "zone.no_cycles")}</div>
      </div>` : p`
      <div class="details">
        <div class="details-title">${c(t, "zone.cycles")}</div>
        ${o.map((i) => this._renderCycle(i))}
      </div>
    `;
  }
  _renderCycle(e) {
    const t = this.language, o = this.zone, i = g(e.cycle_id), a = o?.cycleSwitches.find(
      (I) => g(I.attributes.cycle_id) === i
    ), s = a ? a.state === "on" : e.enabled !== !1, l = no(e.trigger, t), r = e.curve, d = v(r?.min), h = v(r?.max), _ = c(
      t,
      r?.kind === "volume" ? "curve.unit_volume" : "curve.unit_duration"
    ), m = [];
    d !== void 0 && m.push(
      `${c(t, "curve.clamp_min")} ${d} ${_}`
    ), h !== void 0 && m.push(
      `${c(t, "curve.clamp_max")} ${h} ${_}`
    );
    const f = !!i && this._editingCycle === i, w = i ? p`<button
          class="link-btn"
          @click=${() => this._editingCycle = f ? void 0 : i}
        >
          ${c(t, "editor.edit_curve")}
        </button>` : u, k = f ? p`<imc-curve-editor
          .language=${t}
          .cycle=${e}
          .weightedTemp=${this.weightedTemp}
          .zoneHasFlowMeter=${this.zone ? jt(this.zone) : !1}
          .zoneAdjustmentPct=${this.zone ? Qt(this.zone) : 100}
          @imc-curve-save=${this._onCurveSave}
          @imc-curve-cancel=${() => this._editingCycle = void 0}
        ></imc-curve-editor>` : u;
    return p`
      <div class="cycle">
        <div class="cycle-info">
          <div class="cycle-name">
            ${g(e.name) ?? i ?? "?"}
            ${s ? u : p`<span class="off">
                  ${c(t, "zone.cycle_disabled")}
                </span>`}
          </div>
          <div class="cycle-sub">
            ${l}${l && m.length > 0 ? " · " : ""}${m.join(" · ")}
          </div>
        </div>
        ${r ? p`<imc-curve-sparkline .curve=${r}></imc-curve-sparkline>` : u}
        ${w}
      </div>
      ${k}
    `;
  }
  _onCurveSave(e) {
    const t = this.zone?.zoneId;
    if (!t) return;
    const o = e.detail;
    this._dispatch({
      action: "save-curve",
      zoneId: t,
      cycleId: o.cycleId,
      points: o.points,
      min: o.min,
      max: o.max,
      kind: o.kind
    }), this._editingCycle = void 0;
  }
  render() {
    const e = this.zone;
    if (!e) return u;
    const t = this.language, o = this._zoneState, i = o ? F(t, "zone_state", o) : c(t, "card.unavailable"), a = o ? mt[o] : "mdi:help-circle-outline", s = o ?? "unknown", l = !this.compact || this._expanded, r = Gt(e), d = Wt(e);
    return p`
      <div class="zone ${s}">
        <div
          class="row"
          role="button"
          tabindex="0"
          aria-expanded=${this._expanded ? "true" : "false"}
          @click=${this._toggleExpanded}
          @keydown=${this._onHeaderKeydown}
        >
          <ha-icon class="state-icon ${s}" icon=${a}></ha-icon>
          <div class="main">
            <div class="name-line">
              <span class="name">${e.name}</span>
              ${this._renderBadges(r, d)}
            </div>
          </div>
          <span class="state-chip ${s}">${i}</span>
          <ha-icon
            class="caret"
            icon=${this._expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </div>
        ${this._renderProgress()}
        ${l ? this._renderMeta(r, d) : u}
        ${l ? this._renderControls() : u}
        ${this._expanded ? this._renderCycles() : u}
      </div>
    `;
  }
};
Te.styles = X`
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    .zone {
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
      padding: 10px 16px;
    }
    :host([compact]) .zone {
      padding: 6px 16px;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      user-select: none;
    }
    .row:focus-visible {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: 2px;
      border-radius: 4px;
    }
    .state-icon {
      flex: none;
      color: var(--secondary-text-color, #727272);
      --mdc-icon-size: 22px;
    }
    .state-icon.watering,
    .state-icon.queued,
    .state-icon.soaking {
      color: var(--primary-color, #03a9f4);
    }
    .state-icon.paused,
    .state-icon.suspended {
      color: var(--warning-color, #ffa600);
    }
    .state-icon.disabled {
      color: var(--disabled-text-color, #9e9e9e);
    }
    .main {
      flex: 1;
      min-width: 0;
    }
    .name-line {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 6px;
    }
    .name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .zone.disabled .name {
      color: var(--disabled-text-color, #9e9e9e);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      font-size: 10px;
      line-height: 1;
      padding: 3px 6px;
      border-radius: 10px;
      white-space: nowrap;
      border: 1px solid var(--warning-color, #ffa600);
      color: var(--warning-color, #ffa600);
    }
    /* A declared absence is not a fault: it states what this zone cannot do,
       in the same weight as the rest of the row's secondary text. */
    .badge.muted {
      border-color: var(--divider-color, rgba(127, 127, 127, 0.35));
      color: var(--secondary-text-color, #727272);
    }
    /* An invitation -- "your hardware could do this" -- reads as a link
       would, never as a warning. */
    .badge.hint {
      border-color: var(--primary-color, #03a9f4);
      color: var(--primary-color, #03a9f4);
    }
    /* A confirmed leak is the one thing in this row that is filled rather
       than outlined. */
    .badge.alarm {
      border-color: transparent;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
      font-weight: 600;
    }
    .state-chip {
      flex: none;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      white-space: nowrap;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.12)
      );
      color: var(--secondary-text-color, #727272);
    }
    .state-chip.watering,
    .state-chip.soaking,
    .state-chip.queued {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .state-chip.paused,
    .state-chip.suspended {
      background: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
    .caret {
      flex: none;
      color: var(--secondary-text-color, #727272);
      --mdc-icon-size: 20px;
    }
    .meta {
      margin-top: 4px;
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta .abs {
      opacity: 0.8;
    }
    .meta .leak-line {
      color: var(--error-color, #db4437);
      font-weight: 500;
    }
    .progress-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .progress {
      position: relative;
      flex: 1;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.15)
      );
    }
    .progress .bar {
      height: 100%;
      border-radius: 3px;
      background: var(--primary-color, #03a9f4);
      transition: width 0.9s linear;
    }
    .progress.soaking .bar {
      opacity: 0.45;
    }
    .progress .seg {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: var(--card-background-color, #fff);
    }
    .remaining {
      flex: none;
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      font-variant-numeric: tabular-nums;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
    }
    button,
    select,
    input[type="date"] {
      font: inherit;
      font-size: 12px;
      color: var(--primary-color, #03a9f4);
      background: transparent;
      border: 1px solid
        var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 6px;
      padding: 4px 8px;
      cursor: pointer;
    }
    button:hover,
    select:hover,
    input[type="date"]:hover {
      border-color: var(--primary-color, #03a9f4);
    }
    input[type="date"] {
      color-scheme: light dark;
      max-width: 130px;
    }
    select {
      appearance: auto;
    }
    .details {
      margin-top: 10px;
      border-top: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.2));
      padding-top: 8px;
    }
    .details-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 6px;
    }
    .cycle {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 4px 0;
    }
    .cycle-info {
      flex: 1;
      min-width: 0;
    }
    .cycle-name {
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .cycle-name .off {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 8px;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.12)
      );
      color: var(--secondary-text-color, #727272);
    }
    .cycle-sub {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      margin-top: 1px;
    }
    .no-cycles {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    .link-btn {
      flex: none;
      border: none;
      background: transparent;
      padding: 2px 4px;
      font-size: 11px;
      color: var(--primary-color, #03a9f4);
      cursor: pointer;
      text-decoration: underline;
    }
    .link-btn:hover {
      border-color: transparent;
      opacity: 0.8;
    }
  `;
let $ = Te;
P([
  b({ attribute: !1 })
], $.prototype, "zone");
P([
  b()
], $.prototype, "language");
P([
  b({ attribute: !1 })
], $.prototype, "now");
P([
  b({ type: Boolean, reflect: !0 })
], $.prototype, "compact");
P([
  b({ type: Boolean })
], $.prototype, "showControls");
P([
  b({ attribute: !1 })
], $.prototype, "weightedTemp");
P([
  z()
], $.prototype, "_expanded");
P([
  z()
], $.prototype, "_editingCycle");
J("imc-zone-row", $);
var $o = Object.defineProperty, Ne = (n, e, t, o) => {
  for (var i = void 0, a = n.length - 1, s; a >= 0; a--)
    (s = n[a]) && (i = s(e, t, i) || i);
  return i && $o(e, t, i), i;
};
const Pe = class Pe extends S {
  constructor() {
    super(...arguments), this.language = "en", this.paused = !1, this.hasPauseSwitch = !1;
  }
  _dispatch(e) {
    this.dispatchEvent(
      new CustomEvent("imc-global-action", {
        detail: e,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _onStopAll() {
    window.confirm(c(this.language, "controls.confirm_stop_all")) && this._dispatch({ action: "stop_all" });
  }
  render() {
    const e = this.language;
    return p`
      <div class="controls">
        <button @click=${() => this._dispatch({ action: "run_all" })}>
          ${c(e, "controls.run_all")}
        </button>
        <button class="danger" @click=${this._onStopAll}>
          ${c(e, "controls.stop_all")}
        </button>
        <button @click=${() => this._dispatch({ action: "evaluate" })}>
          ${c(e, "controls.evaluate_now")}
        </button>
        ${this.hasPauseSwitch ? p`<button
              class=${this.paused ? "active" : ""}
              @click=${() => this._dispatch({ action: "set-pause", paused: !this.paused })}
            >
              ${c(
      e,
      this.paused ? "controls.resume_global" : "controls.pause_global"
    )}
            </button>` : u}
      </div>
    `;
  }
};
Pe.styles = X`
    :host {
      display: block;
    }
    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      padding: 10px 16px 14px;
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    button {
      font: inherit;
      font-size: 12px;
      color: var(--primary-color, #03a9f4);
      background: transparent;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 6px;
      padding: 5px 10px;
      cursor: pointer;
    }
    button:hover {
      border-color: var(--primary-color, #03a9f4);
    }
    button.danger {
      color: var(--error-color, #db4437);
    }
    button.danger:hover {
      border-color: var(--error-color, #db4437);
    }
    button.active {
      background: var(--warning-color, #ffa600);
      border-color: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
  `;
let K = Pe;
Ne([
  b()
], K.prototype, "language");
Ne([
  b({ type: Boolean })
], K.prototype, "paused");
Ne([
  b({ type: Boolean })
], K.prototype, "hasPauseSwitch");
J("imc-global-controls", K);
var zo = Object.defineProperty, ve = (n, e, t, o) => {
  for (var i = void 0, a = n.length - 1, s; a >= 0; a--)
    (s = n[a]) && (i = s(e, t, i) || i);
  return i && zo(e, t, i), i;
};
const ko = [
  "idle",
  "evaluating",
  "running"
];
function So(n) {
  return !!n && ko.includes(n);
}
const Ie = class Ie extends S {
  constructor() {
    super(...arguments), this._now = Date.now(), this._relevantIds = [], this._statesCount = 0, this._timerPeriod = 0;
  }
  /* ------------------------------------------------------------ */
  /* Custom-card API                                               */
  /* ------------------------------------------------------------ */
  static getConfigElement() {
    return document.createElement("irrigation-maestro-card-editor");
  }
  static getStubConfig() {
    return {};
  }
  setConfig(e) {
    if (!e || typeof e != "object")
      throw new Error("Invalid configuration");
    this._config = { ...Ft, ...e };
  }
  getCardSize() {
    const e = this._model?.zones.length ?? 2, t = this._config?.show_header !== !1 ? 2 : 0;
    return Math.max(2, t + e);
  }
  /* ------------------------------------------------------------ */
  /* Update gating: only re-render when a maestro entity changed   */
  /* ------------------------------------------------------------ */
  shouldUpdate(e) {
    if (e.size === 1 && e.has("hass")) {
      const t = e.get("hass"), o = this.hass;
      return !t || !o || Object.keys(o.states).length !== this._statesCount ? !0 : this._relevantIds.some(
        (a) => t.states[a] !== o.states[a]
      );
    }
    return !0;
  }
  /* ------------------------------------------------------------ */
  /* Refresh timer (1 s while watering, 30 s otherwise)            */
  /* ------------------------------------------------------------ */
  connectedCallback() {
    super.connectedCallback(), this._ensureTimer(this._timerPeriod === 1e3);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._timer !== void 0 && (window.clearInterval(this._timer), this._timer = void 0, this._timerPeriod = 0), this._errorTimer !== void 0 && (window.clearTimeout(this._errorTimer), this._errorTimer = void 0);
  }
  _ensureTimer(e) {
    const t = e ? 1e3 : 3e4;
    this._timer !== void 0 && this._timerPeriod === t || (this._timer !== void 0 && window.clearInterval(this._timer), this._timerPeriod = t, this._timer = window.setInterval(() => {
      this._now = Date.now();
    }, t));
  }
  updated() {
    const e = this._model?.zones.some(
      (t) => t.state?.state === "watering" || t.state?.state === "soaking"
    );
    this.isConnected && this._ensureTimer(!!e);
  }
  /* ------------------------------------------------------------ */
  /* Actions → services                                            */
  /* ------------------------------------------------------------ */
  async _call(e, t, o) {
    const i = this.hass;
    if (i)
      try {
        await i.callService(e, t, o);
      } catch (a) {
        const s = a instanceof Error ? a.message : String(a);
        this._error = s, this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
          this._error = void 0, this._errorTimer = void 0;
        }, 6e3);
      }
  }
  _onZoneAction(e) {
    const t = e.detail;
    switch (t.action) {
      case "run":
        this._call("irrigation_maestro", "run_zone", {
          zone_id: t.zoneId
        });
        break;
      case "skip":
        this._call("irrigation_maestro", "skip_today", {
          zone_id: t.zoneId
        });
        break;
      case "pause":
        this._call("irrigation_maestro", "pause", {
          hours: t.hours,
          zone_id: t.zoneId
        });
        break;
      case "suspend":
        this._call("irrigation_maestro", "suspend_until", {
          until: t.until,
          zone_id: t.zoneId
        });
        break;
      case "resume":
        this._call("irrigation_maestro", "resume", {
          zone_id: t.zoneId
        });
        break;
      case "set-enabled": {
        const i = this._model?.zones.find(
          (a) => a.zoneId === t.zoneId
        )?.enabledSwitch?.entity_id;
        i && this._call(
          "switch",
          t.enabled ? "turn_on" : "turn_off",
          { entity_id: i }
        );
        break;
      }
      case "save-curve":
        this._call("irrigation_maestro", "set_curve", {
          zone_id: t.zoneId,
          cycle_id: t.cycleId,
          points: t.points,
          min_value: t.min,
          max_value: t.max,
          ...t.kind !== void 0 ? { kind: t.kind } : {}
        });
        break;
    }
  }
  _onGlobalAction(e) {
    const t = e.detail;
    switch (t.action) {
      case "run_all":
        this._call("irrigation_maestro", "run_all");
        break;
      case "stop_all":
        this._call("irrigation_maestro", "stop_all");
        break;
      case "evaluate":
        this._call("irrigation_maestro", "evaluate");
        break;
      case "set-pause": {
        const o = this._model?.hub.pauseSwitch?.entity_id;
        o && this._call(
          "switch",
          t.paused ? "turn_on" : "turn_off",
          { entity_id: o }
        );
        break;
      }
    }
  }
  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */
  _renderHeader(e, t) {
    const o = e.hub, i = T(o.waterBudget) ? void 0 : v(o.waterBudget?.state), a = T(o.skipThreshold) ? void 0 : v(o.skipThreshold?.state);
    let s = u;
    if (i !== void 0 || a !== void 0) {
      const k = Math.max(i ?? 0, a ?? 0, 1e-3), I = we((i ?? 0) / k, 0, 1), y = a !== void 0 ? we(a / k, 0, 1) : void 0, ee = i !== void 0 && a !== void 0 && i >= a;
      s = p`
        <div
          class="budget"
          title=${`${c(t, "header.water_budget")} / ${c(t, "header.skip_threshold")}`}
        >
          <span class="budget-label">${c(t, "header.water_budget")}</span>
          <div class="meter">
            <div
              class="meter-fill ${ee ? "sufficient" : ""}"
              style="width:${(I * 100).toFixed(1)}%"
            ></div>
            ${y !== void 0 ? p`<div
                  class="meter-mark"
                  style="left:${(y * 100).toFixed(1)}%"
                ></div>` : u}
          </div>
          <span class="budget-numbers">
            ${U(i, 2) ?? "—"} /
            ${U(a, 1) ?? "—"} mm
          </span>
        </div>
      `;
    }
    const l = o.weightedTemp, r = T(l) ? void 0 : v(l?.state), d = l?.attributes.stale_weather === !0, h = o.session?.state, _ = So(h) ? h : void 0, m = o.pauseSwitch?.state === "on", f = T(o.consumptionLeft) ? void 0 : v(o.consumptionLeft?.state), w = Zt(o);
    return p`
      <div class="header">
        ${s}
        <div class="chips">
          ${w.coverage === "alarm" ? p`<span
                class="chip alarm"
                title=${dt(
      t,
      c(t, "header.leak"),
      w,
      this._now
    )}
              >
                <ha-icon icon="mdi:water-alert" style="--mdc-icon-size:14px"></ha-icon>
                ${c(t, "header.leak")}
              </span>` : u}
          ${r !== void 0 ? p`<span
                class="chip"
                title=${c(t, "header.weighted_temp")}
              >
                <ha-icon icon="mdi:thermometer" style="--mdc-icon-size:14px"></ha-icon>
                ${U(r, 1)} °C
              </span>` : u}
          ${d ? p`<span class="chip warning">
                <ha-icon icon="mdi:alert" style="--mdc-icon-size:14px"></ha-icon>
                ${c(t, "header.stale_weather")}
              </span>` : u}
          ${_ ? p`<span
                class="chip ${_ !== "idle" ? "accent" : ""}"
                title=${c(t, "header.session")}
              >
                <ha-icon
                  icon=${_ === "running" ? "mdi:play-circle-outline" : _ === "evaluating" ? "mdi:magnify" : "mdi:sleep"}
                  style="--mdc-icon-size:14px"
                ></ha-icon>
                ${F(t, "session", _)}
              </span>` : u}
          ${m ? p`<span class="chip warning">
                <ha-icon icon="mdi:pause" style="--mdc-icon-size:14px"></ha-icon>
                ${c(t, "header.global_pause")}
              </span>` : u}
          ${f !== void 0 ? p`<span
                class="chip"
                title=${c(t, "header.consumption_left")}
              >
                <ha-icon icon="mdi:counter" style="--mdc-icon-size:14px"></ha-icon>
                ${U(f, 0)} L
              </span>` : u}
        </div>
      </div>
    `;
  }
  _renderQueue(e, t) {
    const o = e.hub.session;
    if (o?.state !== "running") return u;
    const i = Y(o.attributes.queue).filter(
      (s) => !!s && typeof s == "object"
    );
    if (i.length === 0) return u;
    const a = g(o.attributes.active_zone_id);
    return p`
      <div class="queue">
        <div class="queue-title">${c(t, "queue.title")}</div>
        ${i.map((s, l) => {
      const r = g(s.state), d = a !== void 0 && s.zone_id === a || r === "watering" || r === "running", h = v(s.duration_min);
      return p`
            <div class="queue-item ${d ? "active" : ""}">
              <span class="queue-index">${l + 1}.</span>
              <span class="queue-name">
                ${g(s.zone_name) ?? g(s.zone_id) ?? "?"}
              </span>
              ${h !== void 0 ? p`<span class="queue-duration">
                    ${c(t, "queue.duration", { minutes: h })}
                  </span>` : u}
              ${r ? p`<span class="queue-state">
                    ${Xt(t, r)}
                  </span>` : u}
            </div>
          `;
    })}
      </div>
    `;
  }
  /* ------------------------------------------------------------ */
  /* Render                                                        */
  /* ------------------------------------------------------------ */
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const o = ct(t), i = st(t);
    this._model = i, this._relevantIds = i.entityIds, this._statesCount = Object.keys(t.states).length;
    const a = e.title ? p`<h1 class="card-title">${e.title}</h1>` : u;
    if (!i.found)
      return p`
        <ha-card>
          ${a}
          <div class="message">${c(o, "card.not_installed")}</div>
        </ha-card>
      `;
    const s = e.zones, l = s && s.length > 0 ? i.zones.filter((r) => s.includes(r.zoneId)) : i.zones;
    return p`
      <ha-card @imc-zone-action=${this._onZoneAction} @imc-global-action=${this._onGlobalAction}>
        ${a}
        ${e.show_header !== !1 ? this._renderHeader(i, o) : u}
        ${this._error ? p`<div class="error">${this._error}</div>` : u}
        ${e.show_queue !== !1 ? this._renderQueue(i, o) : u}
        ${l.length === 0 ? p`<div class="message">${c(o, "card.no_zones")}</div>` : l.map(
      (r) => p`
                <imc-zone-row
                  .zone=${r}
                  .language=${o}
                  .now=${this._now}
                  .compact=${e.compact === !0}
                  .showControls=${e.show_controls !== !1}
                  .weightedTemp=${v(i.hub.weightedTemp?.state)}
                ></imc-zone-row>
              `
    )}
        ${e.show_controls !== !1 ? p`<imc-global-controls
              .language=${o}
              .paused=${i.hub.pauseSwitch?.state === "on"}
              .hasPauseSwitch=${!!i.hub.pauseSwitch}
            ></imc-global-controls>` : u}
      </ha-card>
    `;
  }
};
Ie.styles = X`
    :host {
      display: block;
    }
    ha-card {
      overflow: hidden;
      color: var(--primary-text-color);
    }
    .card-title {
      font-size: 18px;
      font-weight: 500;
      line-height: 1.2;
      margin: 0;
      padding: 14px 16px 0;
    }
    .message {
      padding: 16px;
      color: var(--secondary-text-color, #727272);
      font-size: 13px;
    }
    .error {
      margin: 0 16px 8px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
    }
    .header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
    }
    .budget {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 220px;
      min-width: 200px;
    }
    .budget-label {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
    }
    .meter {
      position: relative;
      flex: 1;
      height: 8px;
      border-radius: 4px;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.15)
      );
      min-width: 60px;
    }
    .meter-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--primary-color, #03a9f4);
      transition: width 0.3s ease;
    }
    .meter-fill.sufficient {
      background: var(--success-color, #43a047);
    }
    .meter-mark {
      position: absolute;
      top: -2px;
      bottom: -2px;
      width: 2px;
      background: var(--primary-text-color, #212121);
      opacity: 0.6;
    }
    .budget-numbers {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 12px;
      white-space: nowrap;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.12)
      );
      color: var(--primary-text-color);
    }
    .chip.accent {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .chip.warning {
      background: var(--warning-color, #ffa600);
      color: var(--text-primary-color, #fff);
    }
    .chip.alarm {
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
      font-weight: 600;
    }
    .queue {
      margin: 0 16px 10px;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(
        --secondary-background-color,
        rgba(127, 127, 127, 0.08)
      );
    }
    .queue-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 4px;
    }
    .queue-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 12px;
      padding: 2px 0;
    }
    .queue-item.active {
      color: var(--primary-color, #03a9f4);
      font-weight: 500;
    }
    .queue-index {
      color: var(--secondary-text-color, #727272);
      font-variant-numeric: tabular-nums;
    }
    .queue-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .queue-duration,
    .queue-state {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
    }
    .queue-item.active .queue-state {
      color: var(--primary-color, #03a9f4);
    }
  `;
let j = Ie;
ve([
  b({ attribute: !1 })
], j.prototype, "hass");
ve([
  z()
], j.prototype, "_config");
ve([
  z()
], j.prototype, "_now");
ve([
  z()
], j.prototype, "_error");
J("irrigation-maestro-card", j);
var Ao = Object.defineProperty, ft = (n, e, t, o) => {
  for (var i = void 0, a = n.length - 1, s; a >= 0; a--)
    (s = n[a]) && (i = s(e, t, i) || i);
  return i && Ao(e, t, i), i;
};
const Co = [
  { key: "show_header", label: "editor.show_header", fallback: !0 },
  { key: "show_queue", label: "editor.show_queue", fallback: !0 },
  { key: "show_controls", label: "editor.show_controls", fallback: !0 },
  { key: "compact", label: "editor.compact", fallback: !1 }
], qe = class qe extends S {
  setConfig(e) {
    this._config = { ...e };
  }
  _emitConfig(e) {
    this._config = e, this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _onTitleInput(e) {
    if (!this._config) return;
    const t = e.currentTarget.value, o = { ...this._config };
    t ? o.title = t : delete o.title, this._emitConfig(o);
  }
  _onToggle(e, t) {
    if (!this._config) return;
    const o = t.currentTarget.checked;
    this._emitConfig({ ...this._config, [e]: o });
  }
  _onZoneToggle(e, t) {
    if (!this._config) return;
    const o = t.currentTarget.checked, i = new Set(this._config.zones ?? []);
    o ? i.add(e) : i.delete(e);
    const a = { ...this._config };
    i.size > 0 ? a.zones = [...i] : delete a.zones, this._emitConfig(a);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const o = ct(t), i = st(t).zones, a = new Set(e.zones ?? []);
    return p`
      <div class="form">
        <label class="field">
          ${c(o, "card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${c(o, "card_editor.title_placeholder")}
            @input=${this._onTitleInput}
          />
        </label>

        ${Co.map(
      ({ key: s, label: l, fallback: r }) => p`
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${e[s] ?? r}
                @change=${(d) => this._onToggle(s, d)}
              />
              ${c(o, l)}
            </label>
          `
    )}

        <div class="zones">
          <span class="zones-title">${c(o, "editor.zones")}</span>
          ${i.length === 0 ? p`<span class="hint">${c(o, "editor.no_zones")}</span>` : p`
                ${i.map(
      (s) => p`
                    <label class="toggle">
                      <input
                        type="checkbox"
                        .checked=${a.has(s.zoneId)}
                        @change=${(l) => this._onZoneToggle(s.zoneId, l)}
                      />
                      ${s.name}
                    </label>
                  `
    )}
                <span class="hint">${c(o, "editor.zones_hint")}</span>
              `}
        </div>
      </div>
    `;
  }
};
qe.styles = X`
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    .form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 4px 0;
    }
    label.field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    input[type="text"] {
      font: inherit;
      font-size: 14px;
      color: var(--primary-text-color);
      background: var(--card-background-color, transparent);
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 6px;
      padding: 8px 10px;
    }
    input[type="text"]:focus {
      outline: none;
      border-color: var(--primary-color, #03a9f4);
    }
    label.toggle {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--primary-color, #03a9f4);
      cursor: pointer;
    }
    .zones {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .zones-title {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    .hint {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      opacity: 0.9;
    }
  `;
let re = qe;
ft([
  b({ attribute: !1 })
], re.prototype, "hass");
ft([
  z()
], re.prototype, "_config");
J("irrigation-maestro-card-editor", re);
window.customCards = window.customCards ?? [];
window.customCards.some((n) => n.type === "irrigation-maestro-card") || window.customCards.push({
  type: "irrigation-maestro-card",
  name: N["card.name"],
  description: N["card.description"],
  preview: !0,
  documentationURL: "https://github.com/jmbriccola/ha-irrigation-configurable"
});
