/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const he = globalThis, Se = he.ShadowRoot && (he.ShadyCSS === void 0 || he.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Ee = /* @__PURE__ */ Symbol(), He = /* @__PURE__ */ new WeakMap();
let at = class {
  constructor(e, t, o) {
    if (this._$cssResult$ = !0, o !== Ee) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (Se && e === void 0) {
      const o = t !== void 0 && t.length === 1;
      o && (e = He.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), o && He.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const $t = (n) => new at(typeof n == "string" ? n : n + "", void 0, Ee), X = (n, ...e) => {
  const t = n.length === 1 ? n[0] : e.reduce((o, i, s) => o + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(i) + n[s + 1], n[0]);
  return new at(t, n, Ee);
}, xt = (n, e) => {
  if (Se) n.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const o = document.createElement("style"), i = he.litNonce;
    i !== void 0 && o.setAttribute("nonce", i), o.textContent = t.cssText, n.appendChild(o);
  }
}, Le = Se ? (n) => n : (n) => n instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const o of e.cssRules) t += o.cssText;
  return $t(t);
})(n) : n;
const { is: wt, defineProperty: zt, getOwnPropertyDescriptor: At, getOwnPropertyNames: kt, getOwnPropertySymbols: St, getPrototypeOf: Et } = Object, fe = globalThis, Fe = fe.trustedTypes, Ct = Fe ? Fe.emptyScript : "", Tt = fe.reactiveElementPolyfillSupport, ie = (n, e) => n, me = { toAttribute(n, e) {
  switch (e) {
    case Boolean:
      n = n ? Ct : null;
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
} }, Ce = (n, e) => !wt(n, e), je = { attribute: !0, type: String, converter: me, reflect: !1, useDefault: !1, hasChanged: Ce };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), fe.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let B = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = je) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const o = /* @__PURE__ */ Symbol(), i = this.getPropertyDescriptor(e, o, t);
      i !== void 0 && zt(this.prototype, e, i);
    }
  }
  static getPropertyDescriptor(e, t, o) {
    const { get: i, set: s } = At(this.prototype, e) ?? { get() {
      return this[t];
    }, set(a) {
      this[t] = a;
    } };
    return { get: i, set(a) {
      const l = i?.call(this);
      s?.call(this, a), this.requestUpdate(e, l, o);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? je;
  }
  static _$Ei() {
    if (this.hasOwnProperty(ie("elementProperties"))) return;
    const e = Et(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(ie("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(ie("properties"))) {
      const t = this.properties, o = [...kt(t), ...St(t)];
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
      for (const i of o) t.unshift(Le(i));
    } else e !== void 0 && t.push(Le(e));
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
    return xt(e, this.constructor.elementStyles), e;
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
      const s = (o.converter?.toAttribute !== void 0 ? o.converter : me).toAttribute(t, o.type);
      this._$Em = e, s == null ? this.removeAttribute(i) : this.setAttribute(i, s), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const o = this.constructor, i = o._$Eh.get(e);
    if (i !== void 0 && this._$Em !== i) {
      const s = o.getPropertyOptions(i), a = typeof s.converter == "function" ? { fromAttribute: s.converter } : s.converter?.fromAttribute !== void 0 ? s.converter : me;
      this._$Em = i;
      const l = a.fromAttribute(t, s.type);
      this[i] = l ?? this._$Ej?.get(i) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, t, o, i = !1, s) {
    if (e !== void 0) {
      const a = this.constructor;
      if (i === !1 && (s = this[e]), o ??= a.getPropertyOptions(e), !((o.hasChanged ?? Ce)(s, t) || o.useDefault && o.reflect && s === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, o)))) return;
      this.C(e, t, o);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: o, reflect: i, wrapped: s }, a) {
    o && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), s !== !0 || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || o || (t = void 0), this._$AL.set(e, t)), i === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [i, s] of this._$Ep) this[i] = s;
        this._$Ep = void 0;
      }
      const o = this.constructor.elementProperties;
      if (o.size > 0) for (const [i, s] of o) {
        const { wrapped: a } = s, l = this[i];
        a !== !0 || this._$AL.has(i) || l === void 0 || this.C(i, void 0, s, l);
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
B.elementStyles = [], B.shadowRootOptions = { mode: "open" }, B[ie("elementProperties")] = /* @__PURE__ */ new Map(), B[ie("finalized")] = /* @__PURE__ */ new Map(), Tt?.({ ReactiveElement: B }), (fe.reactiveElementVersions ??= []).push("2.1.2");
const Te = globalThis, Be = (n) => n, _e = Te.trustedTypes, Ve = _e ? _e.createPolicy("lit-html", { createHTML: (n) => n }) : void 0, rt = "$lit$", M = `lit$${Math.random().toFixed(9).slice(2)}$`, lt = "?" + M, Mt = `<${lt}>`, H = document, ne = () => H.createComment(""), se = (n) => n === null || typeof n != "object" && typeof n != "function", Me = Array.isArray, Nt = (n) => Me(n) || typeof n?.[Symbol.iterator] == "function", xe = `[ 	
\f\r]`, J = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, We = /-->/g, Ze = />/g, O = RegExp(`>|${xe}(?:([^\\s"'>=/]+)(${xe}*=${xe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Ge = /'/g, Qe = /"/g, dt = /^(?:script|style|textarea|title)$/i, ct = (n) => (e, ...t) => ({ _$litType$: n, strings: e, values: t }), u = ct(1), D = ct(2), G = /* @__PURE__ */ Symbol.for("lit-noChange"), c = /* @__PURE__ */ Symbol.for("lit-nothing"), Ke = /* @__PURE__ */ new WeakMap(), R = H.createTreeWalker(H, 129);
function ut(n, e) {
  if (!Me(n) || !n.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Ve !== void 0 ? Ve.createHTML(e) : e;
}
const Pt = (n, e) => {
  const t = n.length - 1, o = [];
  let i, s = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", a = J;
  for (let l = 0; l < t; l++) {
    const r = n[l];
    let p, h, m = -1, _ = 0;
    for (; _ < r.length && (a.lastIndex = _, h = a.exec(r), h !== null); ) _ = a.lastIndex, a === J ? h[1] === "!--" ? a = We : h[1] !== void 0 ? a = Ze : h[2] !== void 0 ? (dt.test(h[2]) && (i = RegExp("</" + h[2], "g")), a = O) : h[3] !== void 0 && (a = O) : a === O ? h[0] === ">" ? (a = i ?? J, m = -1) : h[1] === void 0 ? m = -2 : (m = a.lastIndex - h[2].length, p = h[1], a = h[3] === void 0 ? O : h[3] === '"' ? Qe : Ge) : a === Qe || a === Ge ? a = O : a === We || a === Ze ? a = J : (a = O, i = void 0);
    const g = a === O && n[l + 1].startsWith("/>") ? " " : "";
    s += a === J ? r + Mt : m >= 0 ? (o.push(p), r.slice(0, m) + rt + r.slice(m) + M + g) : r + M + (m === -2 ? l : g);
  }
  return [ut(n, s + (n[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), o];
};
class ae {
  constructor({ strings: e, _$litType$: t }, o) {
    let i;
    this.parts = [];
    let s = 0, a = 0;
    const l = e.length - 1, r = this.parts, [p, h] = Pt(e, t);
    if (this.el = ae.createElement(p, o), R.currentNode = this.el.content, t === 2 || t === 3) {
      const m = this.el.content.firstChild;
      m.replaceWith(...m.childNodes);
    }
    for (; (i = R.nextNode()) !== null && r.length < l; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const m of i.getAttributeNames()) if (m.endsWith(rt)) {
          const _ = h[a++], g = i.getAttribute(m).split(M), $ = /([.?@])?(.*)/.exec(_);
          r.push({ type: 1, index: s, name: $[2], strings: g, ctor: $[1] === "." ? Ot : $[1] === "?" ? Dt : $[1] === "@" ? Rt : ve }), i.removeAttribute(m);
        } else m.startsWith(M) && (r.push({ type: 6, index: s }), i.removeAttribute(m));
        if (dt.test(i.tagName)) {
          const m = i.textContent.split(M), _ = m.length - 1;
          if (_ > 0) {
            i.textContent = _e ? _e.emptyScript : "";
            for (let g = 0; g < _; g++) i.append(m[g], ne()), R.nextNode(), r.push({ type: 2, index: ++s });
            i.append(m[_], ne());
          }
        }
      } else if (i.nodeType === 8) if (i.data === lt) r.push({ type: 2, index: s });
      else {
        let m = -1;
        for (; (m = i.data.indexOf(M, m + 1)) !== -1; ) r.push({ type: 7, index: s }), m += M.length - 1;
      }
      s++;
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
  const s = se(e) ? void 0 : e._$litDirective$;
  return i?.constructor !== s && (i?._$AO?.(!1), s === void 0 ? i = void 0 : (i = new s(n), i._$AT(n, t, o)), o !== void 0 ? (t._$Co ??= [])[o] = i : t._$Cl = i), i !== void 0 && (e = Q(n, i._$AS(n, e.values), i, o)), e;
}
class It {
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
    R.currentNode = i;
    let s = R.nextNode(), a = 0, l = 0, r = o[0];
    for (; r !== void 0; ) {
      if (a === r.index) {
        let p;
        r.type === 2 ? p = new le(s, s.nextSibling, this, e) : r.type === 1 ? p = new r.ctor(s, r.name, r.strings, this, e) : r.type === 6 && (p = new qt(s, this, e)), this._$AV.push(p), r = o[++l];
      }
      a !== r?.index && (s = R.nextNode(), a++);
    }
    return R.currentNode = H, i;
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
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = o, this.options = i, this._$Cv = i?.isConnected ?? !0;
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
    e = Q(this, e, t), se(e) ? e === c || e == null || e === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : e !== this._$AH && e !== G && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Nt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== c && se(this._$AH) ? this._$AA.nextSibling.data = e : this.T(H.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: o } = e, i = typeof o == "number" ? this._$AC(e) : (o.el === void 0 && (o.el = ae.createElement(ut(o.h, o.h[0]), this.options)), o);
    if (this._$AH?._$AD === i) this._$AH.p(t);
    else {
      const s = new It(i, this), a = s.u(this.options);
      s.p(t), this.T(a), this._$AH = s;
    }
  }
  _$AC(e) {
    let t = Ke.get(e.strings);
    return t === void 0 && Ke.set(e.strings, t = new ae(e)), t;
  }
  k(e) {
    Me(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let o, i = 0;
    for (const s of e) i === t.length ? t.push(o = new le(this.O(ne()), this.O(ne()), this, this.options)) : o = t[i], o._$AI(s), i++;
    i < t.length && (this._$AR(o && o._$AB.nextSibling, i), t.length = i);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const o = Be(e).nextSibling;
      Be(e).remove(), e = o;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class ve {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, o, i, s) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = e, this.name = t, this._$AM = i, this.options = s, o.length > 2 || o[0] !== "" || o[1] !== "" ? (this._$AH = Array(o.length - 1).fill(new String()), this.strings = o) : this._$AH = c;
  }
  _$AI(e, t = this, o, i) {
    const s = this.strings;
    let a = !1;
    if (s === void 0) e = Q(this, e, t, 0), a = !se(e) || e !== this._$AH && e !== G, a && (this._$AH = e);
    else {
      const l = e;
      let r, p;
      for (e = s[0], r = 0; r < s.length - 1; r++) p = Q(this, l[o + r], t, r), p === G && (p = this._$AH[r]), a ||= !se(p) || p !== this._$AH[r], p === c ? e = c : e !== c && (e += (p ?? "") + s[r + 1]), this._$AH[r] = p;
    }
    a && !i && this.j(e);
  }
  j(e) {
    e === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Ot extends ve {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === c ? void 0 : e;
  }
}
class Dt extends ve {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== c);
  }
}
class Rt extends ve {
  constructor(e, t, o, i, s) {
    super(e, t, o, i, s), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = Q(this, e, t, 0) ?? c) === G) return;
    const o = this._$AH, i = e === c && o !== c || e.capture !== o.capture || e.once !== o.once || e.passive !== o.passive, s = e !== c && (o === c || i);
    i && this.element.removeEventListener(this.name, this, o), s && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class qt {
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
const Ut = Te.litHtmlPolyfillSupport;
Ut?.(ae, le), (Te.litHtmlVersions ??= []).push("3.3.3");
const Ht = (n, e, t) => {
  const o = t?.renderBefore ?? e;
  let i = o._$litPart$;
  if (i === void 0) {
    const s = t?.renderBefore ?? null;
    o._$litPart$ = i = new le(e.insertBefore(ne(), s), s, void 0, t ?? {});
  }
  return i._$AI(n), i;
};
const Ne = globalThis;
class S extends B {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ht(t, this.renderRoot, this.renderOptions);
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
S._$litElement$ = !0, S.finalized = !0, Ne.litElementHydrateSupport?.({ LitElement: S });
const Lt = Ne.litElementPolyfillSupport;
Lt?.({ LitElement: S });
(Ne.litElementVersions ??= []).push("4.2.2");
const Ft = { attribute: !0, type: String, converter: me, reflect: !1, hasChanged: Ce }, jt = (n = Ft, e, t) => {
  const { kind: o, metadata: i } = t;
  let s = globalThis.litPropertyMetadata.get(i);
  if (s === void 0 && globalThis.litPropertyMetadata.set(i, s = /* @__PURE__ */ new Map()), o === "setter" && ((n = Object.create(n)).wrapped = !0), s.set(t.name, n), o === "accessor") {
    const { name: a } = t;
    return { set(l) {
      const r = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(a, r, n, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(a, void 0, n, l), l;
    } };
  }
  if (o === "setter") {
    const { name: a } = t;
    return function(l) {
      const r = this[a];
      e.call(this, l), this.requestUpdate(a, r, n, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + o);
};
function y(n) {
  return (e, t) => typeof t == "object" ? jt(n, e, t) : ((o, i, s) => {
    const a = i.hasOwnProperty(s);
    return i.constructor.createProperty(s, o), a ? Object.getOwnPropertyDescriptor(i, s) : void 0;
  })(n, e, t);
}
function w(n) {
  return y({ ...n, state: !0, attribute: !1 });
}
const Bt = {
  show_header: !0,
  show_queue: !0,
  show_controls: !0,
  compact: !1
};
function f(n) {
  if (typeof n == "number" && Number.isFinite(n)) return n;
  if (typeof n == "string" && n.trim() !== "") {
    const e = Number(n);
    if (Number.isFinite(e)) return e;
  }
}
function b(n) {
  return typeof n == "string" && n !== "" ? n : void 0;
}
function Ae(n) {
  return Array.isArray(n) ? n : [];
}
function q(n) {
  return !n || n.state === "unavailable" || n.state === "unknown";
}
function ke(n, e, t) {
  return Math.min(t, Math.max(e, n));
}
function Y(n, e) {
  customElements.get(n) || customElements.define(n, e);
}
const Vt = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, Wt = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function pt(n) {
  const e = {}, t = /* @__PURE__ */ new Map(), o = [];
  for (const s of Object.values(n.states)) {
    const a = b(s.attributes.maestro_role);
    if (!a) continue;
    o.push(s.entity_id);
    const l = b(s.attributes.zone_id);
    if (l) {
      let r = t.get(l);
      if (r || (r = {
        zoneId: l,
        name: l,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(l, r)), a === "cycle_enabled")
        r.cycleSwitches.push(s);
      else {
        const p = Wt[a];
        p && (r[p] = s);
      }
    } else {
      const r = Vt[a];
      r && (e[r] = s);
    }
  }
  const i = [...t.values()];
  for (const s of i) {
    const a = s.state?.attributes ?? {};
    s.name = b(a.zone_name) ?? b(s.state?.attributes.friendly_name) ?? s.zoneId, s.order = f(a.order) ?? f(s.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return i.sort(
    (s, a) => s.order - a.order || s.name.localeCompare(a.name)
  ), { found: o.length > 0, hub: e, zones: i, entityIds: o };
}
const C = {
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
  // Program editor (panel)
  "program_editor.days": "Days",
  "program_editor.start": "When does it start?",
  "program_editor.start_fixed": "Fixed time",
  "program_editor.start_sunrise": "Sunrise",
  "program_editor.start_sunset": "Sunset",
  "program_editor.duration_per_day": "Duration per day",
  "program_editor.same_duration": "Same duration every day",
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
  "zone.cycles": "Programs",
  "zone.no_cycles": "No programs configured",
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
  "editor.volume_note": "This program uses a volume curve (liters). Edit it in the zone settings.",
  // Zone editor (panel)
  "zone.add": "Add zone",
  "zone.edit": "Edit zone",
  "zone.delete": "Delete zone",
  "zone.field_name": "Name",
  "zone.field_valve": "Valve",
  "zone.field_area": "Area (m²)",
  "zone.advanced": "Advanced",
  "zone.field_flow_sensor": "Flow sensor",
  "zone.field_flow_nominal": "Nominal flow (L/min)",
  "zone.field_flow_tolerance": "Flow tolerance (%)",
  "zone.field_adjustment": "Adjustment (%)",
  "zone.field_order": "Order",
  "zone.field_interval": "Watering interval (days)",
  "zone.field_season": "Season months override",
  "zone.field_group": "Compatibility group",
  // Settings view (panel)
  "settings.title": "Settings",
  "settings.weather": "Weather & sensors",
  "settings.weather_entity": "Weather entity",
  "settings.rain": "Rain sensor",
  "settings.outdoor_temp": "Outdoor temperature sensor",
  "settings.line_flow": "Line flow sensor",
  "settings.master_valve": "Master valve",
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
  "settings.forbidden_windows": "Forbidden windows",
  "settings.advanced_note": "Advanced parameters (engine, safety, notifications) live in Settings"
}, Zt = {
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
  // Editor programma (pannello)
  "program_editor.days": "Giorni",
  "program_editor.start": "Orario di partenza",
  "program_editor.start_fixed": "Ora fissa",
  "program_editor.start_sunrise": "Alba",
  "program_editor.start_sunset": "Tramonto",
  "program_editor.duration_per_day": "Durata per giorno",
  "program_editor.same_duration": "Stessa durata per tutti i giorni",
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
  "zone.cycles": "Programmi",
  "zone.no_cycles": "Nessun programma configurato",
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
  "editor.volume_note": "Questo programma usa una curva a volume (litri). Modificala nelle impostazioni della zona.",
  // Editor zona (pannello)
  "zone.add": "Aggiungi zona",
  "zone.edit": "Modifica zona",
  "zone.delete": "Elimina zona",
  "zone.field_name": "Nome",
  "zone.field_valve": "Valvola",
  "zone.field_area": "Area (m²)",
  "zone.advanced": "Avanzate",
  "zone.field_flow_sensor": "Sensore di portata",
  "zone.field_flow_nominal": "Portata nominale (L/min)",
  "zone.field_flow_tolerance": "Tolleranza di portata (%)",
  "zone.field_adjustment": "Correzione (%)",
  "zone.field_order": "Ordine",
  "zone.field_interval": "Intervallo di irrigazione (giorni)",
  "zone.field_season": "Deroga ai mesi della stagione",
  "zone.field_group": "Gruppo di compatibilità",
  // Vista impostazioni (pannello)
  "settings.title": "Impostazioni",
  "settings.weather": "Meteo e sensori",
  "settings.weather_entity": "Entità meteo",
  "settings.rain": "Sensore pioggia",
  "settings.outdoor_temp": "Sensore temperatura esterna",
  "settings.line_flow": "Sensore di portata di linea",
  "settings.master_valve": "Valvola principale",
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
  "settings.forbidden_windows": "Finestre vietate",
  "settings.advanced_note": "Parametri avanzati (motore, sicurezza, notifiche) → Impostazioni"
}, be = {
  en: C,
  it: Zt
};
function ht(n) {
  const t = (n?.locale?.language ?? n?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in be ? t : "en";
}
function Gt(n, e) {
  return e ? n.replace(/\{(\w+)\}/g, (t, o) => {
    const i = e[o];
    return i === void 0 ? t : String(i);
  }) : n;
}
function d(n, e, t) {
  const o = be[n] ?? C;
  return Gt(o[e] ?? C[e], t);
}
function oe(n, e, t) {
  const o = `${e}.${t}`, i = be[n] ?? C, s = C;
  return i[o] ?? s[o] ?? t;
}
function Qt(n, e) {
  const t = be[n] ?? C, o = C;
  for (const i of ["queue_state", "zone_state", "outcome"]) {
    const s = `${i}.${e}`, a = t[s] ?? o[s];
    if (a !== void 0) return a;
  }
  return e;
}
const Xe = /* @__PURE__ */ new Map(), Ye = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map();
function de(n) {
  let e = Xe.get(n);
  return e || (e = new Intl.RelativeTimeFormat(n, { numeric: "auto" }), Xe.set(n, e)), e;
}
function et(n, e, t = Date.now()) {
  if (!n) return;
  const o = Date.parse(n);
  if (Number.isNaN(o)) return;
  const i = Math.round((o - t) / 1e3), s = Math.abs(i);
  try {
    return s < 60 ? de(e).format(i, "second") : s < 3600 ? de(e).format(Math.round(i / 60), "minute") : s < 86400 ? de(e).format(Math.round(i / 3600), "hour") : de(e).format(Math.round(i / 86400), "day");
  } catch {
    return;
  }
}
function Kt(n, e) {
  if (!n) return;
  const t = Date.parse(n);
  if (Number.isNaN(t)) return;
  let o = Ye.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }), Ye.set(e, o)), o.format(t);
}
function Xt(n, e) {
  if (!n) return;
  const t = Date.parse(n);
  if (Number.isNaN(t)) return;
  let o = Je.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }), Je.set(e, o)), o.format(t);
}
function ce(n, e = 1) {
  const t = f(n);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (o) => e > 0 ? "" : o);
}
function Yt(n) {
  const e = f(n);
  if (e !== void 0) return e;
  if (n && typeof n == "object") {
    const t = n;
    return f(t.duration_min) ?? f(t.duration) ?? f(t.minutes);
  }
}
function Jt(n, e) {
  const t = b(n.run_started_at), o = f(n.run_duration_min);
  if (!t || o === void 0 || o <= 0)
    return;
  const i = Date.parse(t);
  if (Number.isNaN(i)) return;
  const s = (e - i) / 6e4, a = ke(s / o, 0, 1), l = Math.max(0, Math.ceil(o - s)), r = [], p = n.run_planned_runs;
  if (Array.isArray(p) && p.length > 1) {
    const h = p.map(Yt).filter((_) => _ !== void 0 && _ > 0), m = h.reduce((_, g) => _ + g, 0);
    if (h.length > 1 && m > 0) {
      let _ = 0;
      for (let g = 0; g < h.length - 1; g += 1)
        _ += h[g] ?? 0, r.push(_ / m);
    }
  }
  return { fraction: a, remainingMin: l, segmentBounds: r };
}
function eo(n) {
  const e = Math.abs(Math.round(n)), t = Math.floor(e / 3600), o = Math.round(e % 3600 / 60), i = [];
  return t > 0 && i.push(`${t} h`), o > 0 && i.push(`${o} min`), i.length === 0 && i.push(`${e} s`), i.join(" ");
}
function to(n, e) {
  if (!n || typeof n != "object") return "";
  if (n.kind === "sun" && (n.event === "sunrise" || n.event === "sunset")) {
    const o = d(
      e,
      n.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), i = f(n.offset_s) ?? 0;
    if (i === 0) return o;
    const s = i < 0 ? "−" : "+";
    return `${o} ${s} ${eo(i)}`;
  }
  const t = b(n.at) ?? b(n.time);
  return t ? d(e, "trigger.at", { time: t }) : b(n.kind) ?? "";
}
const V = 12, U = 25, W = 35, mt = 3, _t = 45, gt = 0, ft = 30, oo = (U - V) / 10;
function tt(n, e, t) {
  return Math.max(e, Math.min(t, n));
}
function N(n) {
  const e = Math.floor(n), t = n - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function ot(n, e) {
  const t = Math.max(0, N(n - oo * e));
  return [
    [V, t],
    [U, n],
    [W, n + e]
  ];
}
function Z(n, e, t, o) {
  const i = n[0], s = n[n.length - 1];
  let a;
  if (!i || !s)
    a = 0;
  else if (e <= i[0])
    a = i[1];
  else if (e >= s[0])
    a = s[1];
  else {
    a = s[1];
    for (let l = 0; l < n.length - 1; l++) {
      const r = n[l], p = n[l + 1];
      if (!r || !p) continue;
      const [h, m] = r, [_, g] = p;
      if (h <= e && e <= _) {
        a = m + (g - m) * (e - h) / (_ - h);
        break;
      }
    }
  }
  return t !== void 0 && (a = Math.max(a, t)), o !== void 0 && (a = Math.min(a, o)), a;
}
function it(n, e, t) {
  const o = Z(n, U, e, t), i = Z(n, W, e, t);
  return {
    amount: tt(N(o), mt, _t),
    heat: tt(N(i - o), gt, ft)
  };
}
function vt(n) {
  if (!Array.isArray(n)) return [];
  const e = [];
  for (const t of n) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const o = f(t[0]), i = f(t[1]);
    o !== void 0 && i !== void 0 && e.push([o, i]);
  }
  return [...e].sort((t, o) => t[0] - o[0]);
}
var io = Object.defineProperty, no = (n, e, t, o) => {
  for (var i = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (i = a(e, t, i) || i);
  return i && io(e, t, i), i;
};
const F = 150, j = 44, ue = 6, nt = 6, Ie = class Ie extends S {
  render() {
    const e = this.curve, t = vt(e?.points);
    if (t.length === 0) return c;
    const o = f(e?.min), i = f(e?.max), s = t.map((v) => v[0]), a = t.map((v) => v[1]);
    o !== void 0 && a.push(o), i !== void 0 && a.push(i);
    let l = Math.min(...s), r = Math.max(...s), p = Math.min(...a), h = Math.max(...a);
    r - l < 1e-9 && (l -= 1, r += 1), h - p < 1e-9 && (p -= 1, h += 1);
    const m = (v) => ue + (v - l) / (r - l) * (F - 2 * ue), _ = (v) => j - nt - (v - p) / (h - p) * (j - 2 * nt), g = t.map((v, $e) => `${$e === 0 ? "M" : "L"}${m(v[0]).toFixed(1)},${_(v[1]).toFixed(1)}`).join(" "), $ = (v, $e) => D`
      <line
        class="clamp"
        x1="0" x2="${F}"
        y1="${_(v).toFixed(1)}" y2="${_(v).toFixed(1)}"
      ></line>
      <text class="clamp-label" x="${F - 2}" text-anchor="end"
        y="${(_(v) - 2).toFixed(1)}">${$e}</text>
    `, I = t[0], T = t[t.length - 1];
    return u`
      <svg
        viewBox="0 0 ${F} ${j + 10}"
        width="${F}"
        height="${j + 10}"
        role="img"
        aria-hidden="true"
      >
        ${o !== void 0 ? $(o, String(o)) : c}
        ${i !== void 0 ? $(i, String(i)) : c}
        <path class="line" d="${g}"></path>
        ${t.map(
      (v) => D`<circle class="dot" r="2"
            cx="${m(v[0]).toFixed(1)}" cy="${_(v[1]).toFixed(1)}"></circle>`
    )}
        ${I ? D`<text class="axis-label" x="${ue}" y="${j + 8}"
              text-anchor="start">${I[0]}°</text>` : c}
        ${T && T !== I ? D`<text class="axis-label" x="${F - ue}" y="${j + 8}"
              text-anchor="end">${T[0]}°</text>` : c}
      </svg>
    `;
  }
};
Ie.styles = X`
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
let ge = Ie;
no([
  y({ attribute: !1 })
], ge.prototype, "curve");
Y("imc-curve-sparkline", ge);
var so = Object.defineProperty, E = (n, e, t, o) => {
  for (var i = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (i = a(e, t, i) || i);
  return i && so(e, t, i), i;
};
const we = 320, z = 170, ee = 34, st = 12, te = 16, A = 24, pe = 5, ze = 40, Oe = class Oe extends S {
  constructor() {
    super(...arguments), this.language = "en", this._amount = 15, this._heat = 15, this._min = 1, this._max = 120, this._advanced = !1, this._dragged = !1, this._points = ot(15, 15);
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = vt(e?.points);
    if (t.length === 0) return;
    const o = f(e?.min) ?? 1, i = f(e?.max) ?? 120, { amount: s, heat: a } = it(t, o, i);
    this._amount = s, this._heat = a, this._min = o, this._max = i, this._dragged = !1, this._points = [
      [V, N(Z(t, V))],
      [U, N(Z(t, U))],
      [W, N(Z(t, W))]
    ];
  }
  _regen() {
    this._points = ot(this._amount, this._heat), this._dragged = !1;
  }
  _onAmount(e) {
    this._amount = Number(e.target.value), this._regen();
  }
  _onHeat(e) {
    this._heat = Number(e.target.value), this._regen();
  }
  _clampedValue(e) {
    return N(Z(this._points, e, this._min, this._max));
  }
  _sx(e) {
    return ee + (e - pe) / (ze - pe) * (we - ee - st);
  }
  _graphTop() {
    return Math.max(12, ...this._points.map((e) => e[1])) + 4;
  }
  _sy(e) {
    const t = this._graphTop();
    return z - A - e / t * (z - te - A);
  }
  _valueFromY(e) {
    const t = this._graphTop(), o = (z - A - e) / (z - te - A) * t;
    return Math.max(0, N(o));
  }
  _startDrag(e, t) {
    if (!this._advanced) return;
    t.preventDefault();
    const o = t.currentTarget.ownerSVGElement;
    if (!o) return;
    const i = (a) => {
      const l = o.getScreenCTM();
      if (!l) return;
      const r = o.createSVGPoint();
      r.x = a.clientX, r.y = a.clientY;
      const p = r.matrixTransform(l.inverse()).y, h = [...this._points], m = h[e];
      if (!m) return;
      h[e] = [m[0], this._valueFromY(p)], this._points = h, this._dragged = !0;
      const { amount: _, heat: g } = it(this._points);
      this._amount = _, this._heat = g;
    }, s = () => {
      window.removeEventListener("pointermove", i), window.removeEventListener("pointerup", s);
    };
    window.addEventListener("pointermove", i), window.addEventListener("pointerup", s);
  }
  _save() {
    const e = this.cycle?.cycle_id ?? "", t = this._dragged ? {
      cycleId: e,
      mode: "advanced",
      points: this._points.map((o) => [o[0], o[1]]),
      min: this._min,
      max: this._max
    } : {
      cycleId: e,
      mode: "simple",
      amount: this._amount,
      heat: this._heat,
      min: this._min,
      max: this._max
    };
    this.dispatchEvent(
      new CustomEvent("imc-curve-save", {
        detail: t,
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
    return this.cycle?.curve?.kind === "volume" ? u`<div class="volume-note">${d(e, "editor.volume_note")}</div>` : u`
      <div class="title">${d(e, "editor.title")}</div>

      <div class="field">
        <div class="row">
          <label>${d(e, "editor.amount.label")}</label>
          <span class="value">${d(e, "editor.amount.value", { min: this._amount })}</span>
        </div>
        <div class="help">${d(e, "editor.amount.help")}</div>
        <input type="range" min=${mt} max=${_t} .value=${String(this._amount)}
          @input=${this._onAmount} />
        <div class="ends"><span>${d(e, "editor.amount.low")}</span><span>${d(e, "editor.amount.high")}</span></div>
      </div>

      <div class="field">
        <div class="row">
          <label>${d(e, "editor.heat.label")}</label>
          <span class="value">${d(e, "editor.heat.value", { min: this._heat })}</span>
        </div>
        <div class="help">${d(e, "editor.heat.help")}</div>
        <input type="range" min=${gt} max=${ft} .value=${String(this._heat)}
          @input=${this._onHeat} />
        <div class="ends"><span>${d(e, "editor.heat.low")}</span><span>${d(e, "editor.heat.high")}</span></div>
      </div>

      <div class="graph-box">
        <div class="caption">${d(e, "editor.graph.caption")}</div>
        ${this._renderGraph(e)}
      </div>

      <div class="examples">
        ${this._exampleTile(d(e, "editor.example.cool"), this._clampedValue(V))}
        ${this._exampleTile(d(e, "editor.example.mild"), this._clampedValue(U))}
        ${this._exampleTile(d(e, "editor.example.hot"), this._clampedValue(W))}
      </div>

      ${this._renderToday(e)}

      <div class="advanced-toggle" @click=${() => this._advanced = !this._advanced}>
        ${this._advanced ? "▾" : "▸"} ${d(e, "editor.advanced.toggle")}
      </div>
      ${this._advanced ? this._renderAdvanced(e) : c}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${d(e, "editor.save")}</button>
        <button @click=${this._cancel}>${d(e, "editor.cancel")}</button>
      </div>
    `;
  }
  _exampleTile(e, t) {
    return u`<div class="example"><div class="lbl">${e}</div><div class="num">${t} min</div></div>`;
  }
  _renderToday(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return c;
    const o = this._clampedValue(t);
    return u`<div class="today-banner">${d(e, "editor.today", {
      temp: Math.round(t),
      min: o
    })}</div>`;
  }
  _renderAdvanced(e) {
    return u`
      <div class="help">${d(e, "editor.advanced.help")}</div>
      <div class="limits">
        <div class="limit">
          <label>${d(e, "editor.min.label")}</label>
          <div class="help">${d(e, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(t) => {
      const o = Number(t.target.value);
      Number.isNaN(o) || (this._min = Math.min(o, this._max));
    }} /> min
        </div>
        <div class="limit">
          <label>${d(e, "editor.max.label")}</label>
          <div class="help">${d(e, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(t) => {
      const o = Number(t.target.value);
      Number.isNaN(o) || (this._max = Math.max(o, this._min));
    }} /> min
        </div>
      </div>
      <div class="note">${d(e, "editor.drag_hint")}</div>
      <div class="note">${d(e, "editor.more_points")}</div>
    `;
  }
  _renderGraph(e) {
    const t = [];
    for (let a = pe; a <= ze; a += 1)
      t.push([this._sx(a), this._sy(this._clampedValue(a))]);
    const o = t.map((a, l) => `${l === 0 ? "M" : "L"}${a[0].toFixed(1)},${a[1].toFixed(1)}`).join(" "), i = this.weightedTemp, s = i !== void 0 && !Number.isNaN(i) && i >= pe && i <= ze;
    return D`
      <svg viewBox="0 0 ${we} ${z}">
        <line class="axis" x1=${ee} y1=${te} x2=${ee} y2=${z - A}></line>
        <line class="axis" x1=${ee} y1=${z - A} x2=${we - st} y2=${z - A}></line>
        <text class="tick" x=${this._sx(V)} y=${z - A + 12} text-anchor="middle">12°</text>
        <text class="tick" x=${this._sx(U)} y=${z - A + 12} text-anchor="middle">25°</text>
        <text class="tick" x=${this._sx(W)} y=${z - A + 12} text-anchor="middle">35°</text>
        ${s ? D`<line class="today" x1=${this._sx(i)} y1=${te} x2=${this._sx(i)} y2=${z - A}></line>
              <text class="today-text" x=${this._sx(i)} y=${te - 4} text-anchor="middle">${d(e, "editor.graph.today", { temp: Math.round(i) })}</text>` : c}
        <path class="curve" d=${o}></path>
        ${this._points.map(
      (a, l) => D`<circle class="handle" r=${this._advanced ? 7 : 3.5}
            cx=${this._sx(a[0]).toFixed(1)} cy=${this._sy(this._clampedValue(a[0])).toFixed(1)}
            @pointerdown=${(r) => this._startDrag(l, r)}></circle>`
    )}
      </svg>
    `;
  }
};
Oe.styles = X`
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
    .field {
      margin-bottom: 16px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
    }
    label {
      font-weight: 600;
    }
    .value {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      white-space: nowrap;
    }
    .help {
      font-size: 0.8rem;
      opacity: 0.7;
      margin: 2px 0 6px;
    }
    input[type="range"] {
      width: 100%;
    }
    .ends {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      opacity: 0.5;
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
    .tick {
      fill: var(--secondary-text-color, #888);
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
    }
    .example {
      flex: 1;
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
      font-size: 1.1rem;
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
    .advanced-toggle {
      cursor: pointer;
      user-select: none;
      font-size: 0.85rem;
      margin-bottom: 12px;
      text-decoration: underline;
      opacity: 0.85;
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
    .note {
      font-size: 0.75rem;
      opacity: 0.6;
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
    .volume-note {
      font-size: 0.9rem;
      opacity: 0.8;
    }
  `;
let x = Oe;
E([
  y()
], x.prototype, "language");
E([
  y({ attribute: !1 })
], x.prototype, "cycle");
E([
  y({ attribute: !1 })
], x.prototype, "weightedTemp");
E([
  w()
], x.prototype, "_amount");
E([
  w()
], x.prototype, "_heat");
E([
  w()
], x.prototype, "_min");
E([
  w()
], x.prototype, "_max");
E([
  w()
], x.prototype, "_advanced");
E([
  w()
], x.prototype, "_dragged");
E([
  w()
], x.prototype, "_points");
Y("imc-curve-editor", x);
var ao = Object.defineProperty, P = (n, e, t, o) => {
  for (var i = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (i = a(e, t, i) || i);
  return i && ao(e, t, i), i;
};
const bt = {
  idle: "mdi:water-outline",
  queued: "mdi:timer-sand",
  watering: "mdi:water",
  soaking: "mdi:water-percent",
  paused: "mdi:pause-circle-outline",
  suspended: "mdi:calendar-remove-outline",
  disabled: "mdi:water-off-outline"
}, ro = [1, 4, 8, 24];
function lo(n) {
  return n in bt;
}
const De = class De extends S {
  constructor() {
    super(...arguments), this.language = "en", this.now = Date.now(), this.compact = !1, this.showControls = !0, this._expanded = !1;
  }
  get _zoneState() {
    const e = this.zone?.state?.state;
    return e && lo(e) ? e : void 0;
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
  _renderBadges() {
    const e = this.zone;
    if (!e) return c;
    const t = e.state?.attributes ?? {}, o = [], i = b(t.suspended_until) ?? (q(e.suspendUntil) ? void 0 : e.suspendUntil?.state);
    if (this._zoneState === "suspended" && i) {
      const s = Xt(i, this.language) ?? i;
      o.push(u`
        <span class="badge" title=${d(this.language, "zone.suspended_until", { date: s })}>
          <ha-icon icon="mdi:calendar-remove-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${s}
        </span>
      `);
    }
    for (const s of Ae(t.degraded)) {
      const a = b(s);
      if (!a) continue;
      const l = oe(this.language, "degraded", a);
      o.push(u`
        <span class="badge" title=${l}>
          <ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? c : l}
        </span>
      `);
    }
    return o;
  }
  _renderProgress() {
    const e = this.zone, t = this._zoneState;
    if (!e || t !== "watering" && t !== "soaking")
      return c;
    const o = Jt(
      e.state?.attributes ?? {},
      this.now
    );
    return o ? u`
      <div class="progress-line">
        <div class="progress ${t === "soaking" ? "soaking" : ""}">
          <div class="bar" style="width:${(o.fraction * 100).toFixed(2)}%"></div>
          ${o.segmentBounds.map(
      (i) => u`<div class="seg" style="left:${(i * 100).toFixed(2)}%"></div>`
    )}
        </div>
        <span class="remaining">
          ${d(this.language, "zone.remaining", {
      minutes: o.remainingMin
    })}
        </span>
      </div>
    ` : c;
  }
  _renderMeta() {
    const e = this.zone;
    if (!e) return c;
    const t = this.language, o = [], i = e.nextRun;
    if (i && !q(i)) {
      const a = et(i.state, t, this.now), l = Kt(i.state, t), r = b(i.attributes.cycle_name);
      (a || l) && o.push(u`
          <span>
            ${d(t, "zone.next_run")}: ${a ?? ""}
            ${l ? u`<span class="abs">
                  · ${l}${r ? ` (${r})` : ""}
                </span>` : c}
          </span>
        `);
    } else
      o.push(u`<span>${d(t, "zone.no_next_run")}</span>`);
    const s = e.lastOutcome;
    if (s && !q(s) && s.state !== "none") {
      const a = oe(t, "outcome", s.state), l = b(s.attributes.reason_key), r = l ? oe(t, "reason", l) : void 0, p = b(s.attributes.finished_at), h = et(p, t, this.now);
      o.push(u`
        <span>
          ${d(t, "zone.last_outcome")}: ${a}${r ? ` — ${r}` : ""}${h ? u`<span class="abs"> · ${h}</span>` : c}
        </span>
      `);
    }
    return u`<div class="meta">${o}</div>`;
  }
  _renderControls() {
    const e = this.zone;
    if (!e || !this.showControls) return c;
    const t = this.language, o = e.zoneId, i = this._zoneState, s = e.enabledSwitch, a = s?.state === "on", l = i === "paused" || i === "suspended";
    return u`
      <div class="controls" @click=${(r) => r.stopPropagation()}>
        <button @click=${() => this._dispatch({ action: "run", zoneId: o })}>
          ${d(t, "controls.run_now")}
        </button>
        <button @click=${() => this._dispatch({ action: "skip", zoneId: o })}>
          ${d(t, "controls.skip_today")}
        </button>
        <select
          .value=${""}
          @change=${this._onPauseSelect}
          aria-label=${d(t, "controls.pause_for")}
        >
          <option value="" disabled selected hidden>
            ${d(t, "controls.pause_for")}
          </option>
          ${ro.map(
      (r) => u`<option value=${r}>
              ${d(t, "controls.hours", { hours: r })}
            </option>`
    )}
        </select>
        <input
          type="date"
          @change=${this._onSuspendDate}
          aria-label=${d(t, "controls.suspend_until")}
          title=${d(t, "controls.suspend_until")}
        />
        ${l ? u`<button
              @click=${() => this._dispatch({ action: "resume", zoneId: o })}
            >
              ${d(t, "controls.resume")}
            </button>` : c}
        ${s ? u`<button
              @click=${() => this._dispatch({
      action: "set-enabled",
      zoneId: o,
      enabled: !a
    })}
            >
              ${d(t, a ? "controls.disable" : "controls.enable")}
            </button>` : c}
      </div>
    `;
  }
  _renderCycles() {
    const e = this.zone;
    if (!e) return c;
    const t = this.language, o = Ae(e.state?.attributes.cycles).filter(
      (i) => !!i && typeof i == "object"
    );
    return o.length === 0 ? u`<div class="details">
        <div class="no-cycles">${d(t, "zone.no_cycles")}</div>
      </div>` : u`
      <div class="details">
        <div class="details-title">${d(t, "zone.cycles")}</div>
        ${o.map((i) => this._renderCycle(i))}
      </div>
    `;
  }
  _renderCycle(e) {
    const t = this.language, o = this.zone, i = b(e.cycle_id), s = o?.cycleSwitches.find(
      (v) => b(v.attributes.cycle_id) === i
    ), a = s ? s.state === "on" : e.enabled !== !1, l = to(e.trigger, t), r = e.curve, p = f(r?.min), h = f(r?.max), m = d(
      t,
      r?.kind === "volume" ? "curve.unit_volume" : "curve.unit_duration"
    ), _ = [];
    p !== void 0 && _.push(
      `${d(t, "curve.clamp_min")} ${p} ${m}`
    ), h !== void 0 && _.push(
      `${d(t, "curve.clamp_max")} ${h} ${m}`
    );
    const g = r?.kind === "volume", $ = !!i && this._editingCycle === i, I = g || !i ? c : u`<button
            class="link-btn"
            @click=${() => this._editingCycle = $ ? void 0 : i}
          >
            ${d(t, "editor.edit_curve")}
          </button>`, T = $ ? u`<imc-curve-editor
          .language=${t}
          .cycle=${e}
          .weightedTemp=${this.weightedTemp}
          @imc-curve-save=${this._onCurveSave}
          @imc-curve-cancel=${() => this._editingCycle = void 0}
        ></imc-curve-editor>` : c;
    return u`
      <div class="cycle">
        <div class="cycle-info">
          <div class="cycle-name">
            ${b(e.name) ?? i ?? "?"}
            ${a ? c : u`<span class="off">
                  ${d(t, "zone.cycle_disabled")}
                </span>`}
          </div>
          <div class="cycle-sub">
            ${l}${l && _.length > 0 ? " · " : ""}${_.join(" · ")}
          </div>
        </div>
        ${r ? u`<imc-curve-sparkline .curve=${r}></imc-curve-sparkline>` : c}
        ${I}
      </div>
      ${T}
    `;
  }
  _onCurveSave(e) {
    const t = this.zone?.zoneId;
    if (!t) return;
    const o = e.detail;
    o.mode === "simple" ? this._dispatch({
      action: "save-simple-curve",
      zoneId: t,
      cycleId: o.cycleId,
      amount: o.amount,
      heat: o.heat,
      min: o.min,
      max: o.max
    }) : this._dispatch({
      action: "save-curve",
      zoneId: t,
      cycleId: o.cycleId,
      points: o.points,
      min: o.min,
      max: o.max
    }), this._editingCycle = void 0;
  }
  render() {
    const e = this.zone;
    if (!e) return c;
    const t = this.language, o = this._zoneState, i = o ? oe(t, "zone_state", o) : d(t, "card.unavailable"), s = o ? bt[o] : "mdi:help-circle-outline", a = o ?? "unknown", l = !this.compact || this._expanded;
    return u`
      <div class="zone ${a}">
        <div
          class="row"
          role="button"
          tabindex="0"
          aria-expanded=${this._expanded ? "true" : "false"}
          @click=${this._toggleExpanded}
          @keydown=${this._onHeaderKeydown}
        >
          <ha-icon class="state-icon ${a}" icon=${s}></ha-icon>
          <div class="main">
            <div class="name-line">
              <span class="name">${e.name}</span>
              ${this._renderBadges()}
            </div>
          </div>
          <span class="state-chip ${a}">${i}</span>
          <ha-icon
            class="caret"
            icon=${this._expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </div>
        ${this._renderProgress()}
        ${l ? this._renderMeta() : c}
        ${l ? this._renderControls() : c}
        ${this._expanded ? this._renderCycles() : c}
      </div>
    `;
  }
};
De.styles = X`
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
let k = De;
P([
  y({ attribute: !1 })
], k.prototype, "zone");
P([
  y()
], k.prototype, "language");
P([
  y({ attribute: !1 })
], k.prototype, "now");
P([
  y({ type: Boolean, reflect: !0 })
], k.prototype, "compact");
P([
  y({ type: Boolean })
], k.prototype, "showControls");
P([
  y({ attribute: !1 })
], k.prototype, "weightedTemp");
P([
  w()
], k.prototype, "_expanded");
P([
  w()
], k.prototype, "_editingCycle");
Y("imc-zone-row", k);
var co = Object.defineProperty, Pe = (n, e, t, o) => {
  for (var i = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (i = a(e, t, i) || i);
  return i && co(e, t, i), i;
};
const Re = class Re extends S {
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
    window.confirm(d(this.language, "controls.confirm_stop_all")) && this._dispatch({ action: "stop_all" });
  }
  render() {
    const e = this.language;
    return u`
      <div class="controls">
        <button @click=${() => this._dispatch({ action: "run_all" })}>
          ${d(e, "controls.run_all")}
        </button>
        <button class="danger" @click=${this._onStopAll}>
          ${d(e, "controls.stop_all")}
        </button>
        <button @click=${() => this._dispatch({ action: "evaluate" })}>
          ${d(e, "controls.evaluate_now")}
        </button>
        ${this.hasPauseSwitch ? u`<button
              class=${this.paused ? "active" : ""}
              @click=${() => this._dispatch({ action: "set-pause", paused: !this.paused })}
            >
              ${d(
      e,
      this.paused ? "controls.resume_global" : "controls.pause_global"
    )}
            </button>` : c}
      </div>
    `;
  }
};
Re.styles = X`
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
let K = Re;
Pe([
  y()
], K.prototype, "language");
Pe([
  y({ type: Boolean })
], K.prototype, "paused");
Pe([
  y({ type: Boolean })
], K.prototype, "hasPauseSwitch");
Y("imc-global-controls", K);
var uo = Object.defineProperty, ye = (n, e, t, o) => {
  for (var i = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (i = a(e, t, i) || i);
  return i && uo(e, t, i), i;
};
const po = [
  "idle",
  "evaluating",
  "running"
];
function ho(n) {
  return !!n && po.includes(n);
}
const qe = class qe extends S {
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
    this._config = { ...Bt, ...e };
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
        (s) => t.states[s] !== o.states[s]
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
      } catch (s) {
        const a = s instanceof Error ? s.message : String(s);
        this._error = a, this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
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
          (s) => s.zoneId === t.zoneId
        )?.enabledSwitch?.entity_id;
        i && this._call(
          "switch",
          t.enabled ? "turn_on" : "turn_off",
          { entity_id: i }
        );
        break;
      }
      case "save-simple-curve":
        this._call("irrigation_maestro", "set_simple_curve", {
          zone_id: t.zoneId,
          cycle_id: t.cycleId,
          amount: t.amount,
          heat: t.heat,
          min_value: t.min,
          max_value: t.max
        });
        break;
      case "save-curve":
        this._call("irrigation_maestro", "set_curve", {
          zone_id: t.zoneId,
          cycle_id: t.cycleId,
          points: t.points,
          min_value: t.min,
          max_value: t.max
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
    const o = e.hub, i = q(o.waterBudget) ? void 0 : f(o.waterBudget?.state), s = q(o.skipThreshold) ? void 0 : f(o.skipThreshold?.state);
    let a = c;
    if (i !== void 0 || s !== void 0) {
      const $ = Math.max(i ?? 0, s ?? 0, 1e-3), I = ke((i ?? 0) / $, 0, 1), T = s !== void 0 ? ke(s / $, 0, 1) : void 0, v = i !== void 0 && s !== void 0 && i >= s;
      a = u`
        <div
          class="budget"
          title=${`${d(t, "header.water_budget")} / ${d(t, "header.skip_threshold")}`}
        >
          <span class="budget-label">${d(t, "header.water_budget")}</span>
          <div class="meter">
            <div
              class="meter-fill ${v ? "sufficient" : ""}"
              style="width:${(I * 100).toFixed(1)}%"
            ></div>
            ${T !== void 0 ? u`<div
                  class="meter-mark"
                  style="left:${(T * 100).toFixed(1)}%"
                ></div>` : c}
          </div>
          <span class="budget-numbers">
            ${ce(i, 2) ?? "—"} /
            ${ce(s, 1) ?? "—"} mm
          </span>
        </div>
      `;
    }
    const l = o.weightedTemp, r = q(l) ? void 0 : f(l?.state), p = l?.attributes.stale_weather === !0, h = o.session?.state, m = ho(h) ? h : void 0, _ = o.pauseSwitch?.state === "on", g = q(o.consumptionLeft) ? void 0 : f(o.consumptionLeft?.state);
    return u`
      <div class="header">
        ${a}
        <div class="chips">
          ${r !== void 0 ? u`<span
                class="chip"
                title=${d(t, "header.weighted_temp")}
              >
                <ha-icon icon="mdi:thermometer" style="--mdc-icon-size:14px"></ha-icon>
                ${ce(r, 1)} °C
              </span>` : c}
          ${p ? u`<span class="chip warning">
                <ha-icon icon="mdi:alert" style="--mdc-icon-size:14px"></ha-icon>
                ${d(t, "header.stale_weather")}
              </span>` : c}
          ${m ? u`<span
                class="chip ${m !== "idle" ? "accent" : ""}"
                title=${d(t, "header.session")}
              >
                <ha-icon
                  icon=${m === "running" ? "mdi:play-circle-outline" : m === "evaluating" ? "mdi:magnify" : "mdi:sleep"}
                  style="--mdc-icon-size:14px"
                ></ha-icon>
                ${oe(t, "session", m)}
              </span>` : c}
          ${_ ? u`<span class="chip warning">
                <ha-icon icon="mdi:pause" style="--mdc-icon-size:14px"></ha-icon>
                ${d(t, "header.global_pause")}
              </span>` : c}
          ${g !== void 0 ? u`<span
                class="chip"
                title=${d(t, "header.consumption_left")}
              >
                <ha-icon icon="mdi:counter" style="--mdc-icon-size:14px"></ha-icon>
                ${ce(g, 0)} L
              </span>` : c}
        </div>
      </div>
    `;
  }
  _renderQueue(e, t) {
    const o = e.hub.session;
    if (o?.state !== "running") return c;
    const i = Ae(o.attributes.queue).filter(
      (a) => !!a && typeof a == "object"
    );
    if (i.length === 0) return c;
    const s = b(o.attributes.active_zone_id);
    return u`
      <div class="queue">
        <div class="queue-title">${d(t, "queue.title")}</div>
        ${i.map((a, l) => {
      const r = b(a.state), p = s !== void 0 && a.zone_id === s || r === "watering" || r === "running", h = f(a.duration_min);
      return u`
            <div class="queue-item ${p ? "active" : ""}">
              <span class="queue-index">${l + 1}.</span>
              <span class="queue-name">
                ${b(a.zone_name) ?? b(a.zone_id) ?? "?"}
              </span>
              ${h !== void 0 ? u`<span class="queue-duration">
                    ${d(t, "queue.duration", { minutes: h })}
                  </span>` : c}
              ${r ? u`<span class="queue-state">
                    ${Qt(t, r)}
                  </span>` : c}
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
    if (!e || !t) return c;
    const o = ht(t), i = pt(t);
    this._model = i, this._relevantIds = i.entityIds, this._statesCount = Object.keys(t.states).length;
    const s = e.title ? u`<h1 class="card-title">${e.title}</h1>` : c;
    if (!i.found)
      return u`
        <ha-card>
          ${s}
          <div class="message">${d(o, "card.not_installed")}</div>
        </ha-card>
      `;
    const a = e.zones, l = a && a.length > 0 ? i.zones.filter((r) => a.includes(r.zoneId)) : i.zones;
    return u`
      <ha-card @imc-zone-action=${this._onZoneAction} @imc-global-action=${this._onGlobalAction}>
        ${s}
        ${e.show_header !== !1 ? this._renderHeader(i, o) : c}
        ${this._error ? u`<div class="error">${this._error}</div>` : c}
        ${e.show_queue !== !1 ? this._renderQueue(i, o) : c}
        ${l.length === 0 ? u`<div class="message">${d(o, "card.no_zones")}</div>` : l.map(
      (r) => u`
                <imc-zone-row
                  .zone=${r}
                  .language=${o}
                  .now=${this._now}
                  .compact=${e.compact === !0}
                  .showControls=${e.show_controls !== !1}
                  .weightedTemp=${f(i.hub.weightedTemp?.state)}
                ></imc-zone-row>
              `
    )}
        ${e.show_controls !== !1 ? u`<imc-global-controls
              .language=${o}
              .paused=${i.hub.pauseSwitch?.state === "on"}
              .hasPauseSwitch=${!!i.hub.pauseSwitch}
            ></imc-global-controls>` : c}
      </ha-card>
    `;
  }
};
qe.styles = X`
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
let L = qe;
ye([
  y({ attribute: !1 })
], L.prototype, "hass");
ye([
  w()
], L.prototype, "_config");
ye([
  w()
], L.prototype, "_now");
ye([
  w()
], L.prototype, "_error");
Y("irrigation-maestro-card", L);
var mo = Object.defineProperty, yt = (n, e, t, o) => {
  for (var i = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (i = a(e, t, i) || i);
  return i && mo(e, t, i), i;
};
const _o = [
  { key: "show_header", label: "editor.show_header", fallback: !0 },
  { key: "show_queue", label: "editor.show_queue", fallback: !0 },
  { key: "show_controls", label: "editor.show_controls", fallback: !0 },
  { key: "compact", label: "editor.compact", fallback: !1 }
], Ue = class Ue extends S {
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
    const s = { ...this._config };
    i.size > 0 ? s.zones = [...i] : delete s.zones, this._emitConfig(s);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return c;
    const o = ht(t), i = pt(t).zones, s = new Set(e.zones ?? []);
    return u`
      <div class="form">
        <label class="field">
          ${d(o, "card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${d(o, "card_editor.title_placeholder")}
            @input=${this._onTitleInput}
          />
        </label>

        ${_o.map(
      ({ key: a, label: l, fallback: r }) => u`
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${e[a] ?? r}
                @change=${(p) => this._onToggle(a, p)}
              />
              ${d(o, l)}
            </label>
          `
    )}

        <div class="zones">
          <span class="zones-title">${d(o, "editor.zones")}</span>
          ${i.length === 0 ? u`<span class="hint">${d(o, "editor.no_zones")}</span>` : u`
                ${i.map(
      (a) => u`
                    <label class="toggle">
                      <input
                        type="checkbox"
                        .checked=${s.has(a.zoneId)}
                        @change=${(l) => this._onZoneToggle(a.zoneId, l)}
                      />
                      ${a.name}
                    </label>
                  `
    )}
                <span class="hint">${d(o, "editor.zones_hint")}</span>
              `}
        </div>
      </div>
    `;
  }
};
Ue.styles = X`
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
let re = Ue;
yt([
  y({ attribute: !1 })
], re.prototype, "hass");
yt([
  w()
], re.prototype, "_config");
Y("irrigation-maestro-card-editor", re);
window.customCards = window.customCards ?? [];
window.customCards.some((n) => n.type === "irrigation-maestro-card") || window.customCards.push({
  type: "irrigation-maestro-card",
  name: C["card.name"],
  description: C["card.description"],
  preview: !0,
  documentationURL: "https://github.com/jmbriccola/ha-irrigation-configurable"
});
