/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const he = globalThis, ke = he.ShadowRoot && (he.ShadyCSS === void 0 || he.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Ce = /* @__PURE__ */ Symbol(), He = /* @__PURE__ */ new WeakMap();
let at = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== Ce) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (ke && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = He.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && He.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const xt = (n) => new at(typeof n == "string" ? n : n + "", void 0, Ce), X = (n, ...e) => {
  const t = n.length === 1 ? n[0] : e.reduce((i, o, s) => i + ((a) => {
    if (a._$cssResult$ === !0) return a.cssText;
    if (typeof a == "number") return a;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + a + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(o) + n[s + 1], n[0]);
  return new at(t, n, Ce);
}, $t = (n, e) => {
  if (ke) n.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), o = he.litNonce;
    o !== void 0 && i.setAttribute("nonce", o), i.textContent = t.cssText, n.appendChild(i);
  }
}, Le = ke ? (n) => n : (n) => n instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return xt(t);
})(n) : n;
const { is: wt, defineProperty: zt, getOwnPropertyDescriptor: At, getOwnPropertyNames: St, getOwnPropertySymbols: kt, getPrototypeOf: Ct } = Object, fe = globalThis, Fe = fe.trustedTypes, Et = Fe ? Fe.emptyScript : "", Mt = fe.reactiveElementPolyfillSupport, oe = (n, e) => n, me = { toAttribute(n, e) {
  switch (e) {
    case Boolean:
      n = n ? Et : null;
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
} }, Ee = (n, e) => !wt(n, e), je = { attribute: !0, type: String, converter: me, reflect: !1, useDefault: !1, hasChanged: Ee };
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
      const i = /* @__PURE__ */ Symbol(), o = this.getPropertyDescriptor(e, i, t);
      o !== void 0 && zt(this.prototype, e, o);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: o, set: s } = At(this.prototype, e) ?? { get() {
      return this[t];
    }, set(a) {
      this[t] = a;
    } };
    return { get: o, set(a) {
      const l = o?.call(this);
      s?.call(this, a), this.requestUpdate(e, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? je;
  }
  static _$Ei() {
    if (this.hasOwnProperty(oe("elementProperties"))) return;
    const e = Ct(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(oe("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(oe("properties"))) {
      const t = this.properties, i = [...St(t), ...kt(t)];
      for (const o of i) this.createProperty(o, t[o]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [i, o] of t) this.elementProperties.set(i, o);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, i] of this.elementProperties) {
      const o = this._$Eu(t, i);
      o !== void 0 && this._$Eh.set(o, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const o of i) t.unshift(Le(o));
    } else e !== void 0 && t.push(Le(e));
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
    return $t(e, this.constructor.elementStyles), e;
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
    const i = this.constructor.elementProperties.get(e), o = this.constructor._$Eu(e, i);
    if (o !== void 0 && i.reflect === !0) {
      const s = (i.converter?.toAttribute !== void 0 ? i.converter : me).toAttribute(t, i.type);
      this._$Em = e, s == null ? this.removeAttribute(o) : this.setAttribute(o, s), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, o = i._$Eh.get(e);
    if (o !== void 0 && this._$Em !== o) {
      const s = i.getPropertyOptions(o), a = typeof s.converter == "function" ? { fromAttribute: s.converter } : s.converter?.fromAttribute !== void 0 ? s.converter : me;
      this._$Em = o;
      const l = a.fromAttribute(t, s.type);
      this[o] = l ?? this._$Ej?.get(o) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, o = !1, s) {
    if (e !== void 0) {
      const a = this.constructor;
      if (o === !1 && (s = this[e]), i ??= a.getPropertyOptions(e), !((i.hasChanged ?? Ee)(s, t) || i.useDefault && i.reflect && s === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: o, wrapped: s }, a) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), s !== !0 || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), o === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [o, s] of this._$Ep) this[o] = s;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [o, s] of i) {
        const { wrapped: a } = s, l = this[o];
        a !== !0 || this._$AL.has(o) || l === void 0 || this.C(o, void 0, s, l);
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
B.elementStyles = [], B.shadowRootOptions = { mode: "open" }, B[oe("elementProperties")] = /* @__PURE__ */ new Map(), B[oe("finalized")] = /* @__PURE__ */ new Map(), Mt?.({ ReactiveElement: B }), (fe.reactiveElementVersions ??= []).push("2.1.2");
const Me = globalThis, Be = (n) => n, _e = Me.trustedTypes, Ve = _e ? _e.createPolicy("lit-html", { createHTML: (n) => n }) : void 0, rt = "$lit$", T = `lit$${Math.random().toFixed(9).slice(2)}$`, lt = "?" + T, Tt = `<${lt}>`, H = document, ne = () => H.createComment(""), se = (n) => n === null || typeof n != "object" && typeof n != "function", Te = Array.isArray, Nt = (n) => Te(n) || typeof n?.[Symbol.iterator] == "function", $e = `[ 	
\f\r]`, J = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, We = /-->/g, Ze = />/g, D = RegExp(`>|${$e}(?:([^\\s"'>=/]+)(${$e}*=${$e}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Ge = /'/g, Qe = /"/g, ct = /^(?:script|style|textarea|title)$/i, dt = (n) => (e, ...t) => ({ _$litType$: n, strings: e, values: t }), u = dt(1), O = dt(2), G = /* @__PURE__ */ Symbol.for("lit-noChange"), d = /* @__PURE__ */ Symbol.for("lit-nothing"), Ke = /* @__PURE__ */ new WeakMap(), q = H.createTreeWalker(H, 129);
function ut(n, e) {
  if (!Te(n) || !n.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Ve !== void 0 ? Ve.createHTML(e) : e;
}
const Pt = (n, e) => {
  const t = n.length - 1, i = [];
  let o, s = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", a = J;
  for (let l = 0; l < t; l++) {
    const r = n[l];
    let p, h, m = -1, _ = 0;
    for (; _ < r.length && (a.lastIndex = _, h = a.exec(r), h !== null); ) _ = a.lastIndex, a === J ? h[1] === "!--" ? a = We : h[1] !== void 0 ? a = Ze : h[2] !== void 0 ? (ct.test(h[2]) && (o = RegExp("</" + h[2], "g")), a = D) : h[3] !== void 0 && (a = D) : a === D ? h[0] === ">" ? (a = o ?? J, m = -1) : h[1] === void 0 ? m = -2 : (m = a.lastIndex - h[2].length, p = h[1], a = h[3] === void 0 ? D : h[3] === '"' ? Qe : Ge) : a === Qe || a === Ge ? a = D : a === We || a === Ze ? a = J : (a = D, o = void 0);
    const g = a === D && n[l + 1].startsWith("/>") ? " " : "";
    s += a === J ? r + Tt : m >= 0 ? (i.push(p), r.slice(0, m) + rt + r.slice(m) + T + g) : r + T + (m === -2 ? l : g);
  }
  return [ut(n, s + (n[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class ae {
  constructor({ strings: e, _$litType$: t }, i) {
    let o;
    this.parts = [];
    let s = 0, a = 0;
    const l = e.length - 1, r = this.parts, [p, h] = Pt(e, t);
    if (this.el = ae.createElement(p, i), q.currentNode = this.el.content, t === 2 || t === 3) {
      const m = this.el.content.firstChild;
      m.replaceWith(...m.childNodes);
    }
    for (; (o = q.nextNode()) !== null && r.length < l; ) {
      if (o.nodeType === 1) {
        if (o.hasAttributes()) for (const m of o.getAttributeNames()) if (m.endsWith(rt)) {
          const _ = h[a++], g = o.getAttribute(m).split(T), x = /([.?@])?(.*)/.exec(_);
          r.push({ type: 1, index: s, name: x[2], strings: g, ctor: x[1] === "." ? Dt : x[1] === "?" ? Ot : x[1] === "@" ? qt : ve }), o.removeAttribute(m);
        } else m.startsWith(T) && (r.push({ type: 6, index: s }), o.removeAttribute(m));
        if (ct.test(o.tagName)) {
          const m = o.textContent.split(T), _ = m.length - 1;
          if (_ > 0) {
            o.textContent = _e ? _e.emptyScript : "";
            for (let g = 0; g < _; g++) o.append(m[g], ne()), q.nextNode(), r.push({ type: 2, index: ++s });
            o.append(m[_], ne());
          }
        }
      } else if (o.nodeType === 8) if (o.data === lt) r.push({ type: 2, index: s });
      else {
        let m = -1;
        for (; (m = o.data.indexOf(T, m + 1)) !== -1; ) r.push({ type: 7, index: s }), m += T.length - 1;
      }
      s++;
    }
  }
  static createElement(e, t) {
    const i = H.createElement("template");
    return i.innerHTML = e, i;
  }
}
function Q(n, e, t = n, i) {
  if (e === G) return e;
  let o = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const s = se(e) ? void 0 : e._$litDirective$;
  return o?.constructor !== s && (o?._$AO?.(!1), s === void 0 ? o = void 0 : (o = new s(n), o._$AT(n, t, i)), i !== void 0 ? (t._$Co ??= [])[i] = o : t._$Cl = o), o !== void 0 && (e = Q(n, o._$AS(n, e.values), o, i)), e;
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
    const { el: { content: t }, parts: i } = this._$AD, o = (e?.creationScope ?? H).importNode(t, !0);
    q.currentNode = o;
    let s = q.nextNode(), a = 0, l = 0, r = i[0];
    for (; r !== void 0; ) {
      if (a === r.index) {
        let p;
        r.type === 2 ? p = new le(s, s.nextSibling, this, e) : r.type === 1 ? p = new r.ctor(s, r.name, r.strings, this, e) : r.type === 6 && (p = new Rt(s, this, e)), this._$AV.push(p), r = i[++l];
      }
      a !== r?.index && (s = q.nextNode(), a++);
    }
    return q.currentNode = H, o;
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
  constructor(e, t, i, o) {
    this.type = 2, this._$AH = d, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = o, this._$Cv = o?.isConnected ?? !0;
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
    e = Q(this, e, t), se(e) ? e === d || e == null || e === "" ? (this._$AH !== d && this._$AR(), this._$AH = d) : e !== this._$AH && e !== G && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Nt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== d && se(this._$AH) ? this._$AA.nextSibling.data = e : this.T(H.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: i } = e, o = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = ae.createElement(ut(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === o) this._$AH.p(t);
    else {
      const s = new It(o, this), a = s.u(this.options);
      s.p(t), this.T(a), this._$AH = s;
    }
  }
  _$AC(e) {
    let t = Ke.get(e.strings);
    return t === void 0 && Ke.set(e.strings, t = new ae(e)), t;
  }
  k(e) {
    Te(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, o = 0;
    for (const s of e) o === t.length ? t.push(i = new le(this.O(ne()), this.O(ne()), this, this.options)) : i = t[o], i._$AI(s), o++;
    o < t.length && (this._$AR(i && i._$AB.nextSibling, o), t.length = o);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const i = Be(e).nextSibling;
      Be(e).remove(), e = i;
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
  constructor(e, t, i, o, s) {
    this.type = 1, this._$AH = d, this._$AN = void 0, this.element = e, this.name = t, this._$AM = o, this.options = s, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = d;
  }
  _$AI(e, t = this, i, o) {
    const s = this.strings;
    let a = !1;
    if (s === void 0) e = Q(this, e, t, 0), a = !se(e) || e !== this._$AH && e !== G, a && (this._$AH = e);
    else {
      const l = e;
      let r, p;
      for (e = s[0], r = 0; r < s.length - 1; r++) p = Q(this, l[i + r], t, r), p === G && (p = this._$AH[r]), a ||= !se(p) || p !== this._$AH[r], p === d ? e = d : e !== d && (e += (p ?? "") + s[r + 1]), this._$AH[r] = p;
    }
    a && !o && this.j(e);
  }
  j(e) {
    e === d ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Dt extends ve {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === d ? void 0 : e;
  }
}
class Ot extends ve {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== d);
  }
}
class qt extends ve {
  constructor(e, t, i, o, s) {
    super(e, t, i, o, s), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = Q(this, e, t, 0) ?? d) === G) return;
    const i = this._$AH, o = e === d && i !== d || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, s = e !== d && (i === d || o);
    o && this.element.removeEventListener(this.name, this, i), s && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Rt {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    Q(this, e);
  }
}
const Ut = Me.litHtmlPolyfillSupport;
Ut?.(ae, le), (Me.litHtmlVersions ??= []).push("3.3.3");
const Ht = (n, e, t) => {
  const i = t?.renderBefore ?? e;
  let o = i._$litPart$;
  if (o === void 0) {
    const s = t?.renderBefore ?? null;
    i._$litPart$ = o = new le(e.insertBefore(ne(), s), s, void 0, t ?? {});
  }
  return o._$AI(n), o;
};
const Ne = globalThis;
class k extends B {
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
k._$litElement$ = !0, k.finalized = !0, Ne.litElementHydrateSupport?.({ LitElement: k });
const Lt = Ne.litElementPolyfillSupport;
Lt?.({ LitElement: k });
(Ne.litElementVersions ??= []).push("4.2.2");
const Ft = { attribute: !0, type: String, converter: me, reflect: !1, hasChanged: Ee }, jt = (n = Ft, e, t) => {
  const { kind: i, metadata: o } = t;
  let s = globalThis.litPropertyMetadata.get(o);
  if (s === void 0 && globalThis.litPropertyMetadata.set(o, s = /* @__PURE__ */ new Map()), i === "setter" && ((n = Object.create(n)).wrapped = !0), s.set(t.name, n), i === "accessor") {
    const { name: a } = t;
    return { set(l) {
      const r = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(a, r, n, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(a, void 0, n, l), l;
    } };
  }
  if (i === "setter") {
    const { name: a } = t;
    return function(l) {
      const r = this[a];
      e.call(this, l), this.requestUpdate(a, r, n, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function y(n) {
  return (e, t) => typeof t == "object" ? jt(n, e, t) : ((i, o, s) => {
    const a = o.hasOwnProperty(s);
    return o.constructor.createProperty(s, i), a ? Object.getOwnPropertyDescriptor(o, s) : void 0;
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
function R(n) {
  return !n || n.state === "unavailable" || n.state === "unknown";
}
function Se(n, e, t) {
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
  const e = {}, t = /* @__PURE__ */ new Map(), i = [];
  for (const s of Object.values(n.states)) {
    const a = b(s.attributes.maestro_role);
    if (!a) continue;
    i.push(s.entity_id);
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
  const o = [...t.values()];
  for (const s of o) {
    const a = s.state?.attributes ?? {};
    s.name = b(a.zone_name) ?? b(s.state?.attributes.friendly_name) ?? s.zoneId, s.order = f(a.order) ?? f(s.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return o.sort(
    (s, a) => s.order - a.order || s.name.localeCompare(a.name)
  ), { found: i.length > 0, hub: e, zones: o, entityIds: i };
}
const E = {
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
  "settings.on": "On",
  "settings.off": "Off",
  "settings.notify_completed": "Cycle finished",
  "settings.notify_skipped": "Cycle skipped",
  "settings.notify_interrupted": "Cycle interrupted",
  "settings.notify_cancelled": "Cycle cancelled",
  "settings.notify_anomaly": "Anomaly",
  "settings.notify_watchdog": "Watchdog",
  "settings.notify_sentinel": "Sentinel",
  "settings.notify_session_overrun": "Session overrun",
  "settings.notify_consumption_budget": "Consumption budget",
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
  "settings.on": "Attive",
  "settings.off": "Disattive",
  "settings.notify_completed": "Ciclo completato",
  "settings.notify_skipped": "Ciclo saltato",
  "settings.notify_interrupted": "Ciclo interrotto",
  "settings.notify_cancelled": "Ciclo annullato",
  "settings.notify_anomaly": "Anomalia",
  "settings.notify_watchdog": "Watchdog",
  "settings.notify_sentinel": "Sentinella",
  "settings.notify_session_overrun": "Sessione troppo lunga",
  "settings.notify_consumption_budget": "Budget consumo",
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
  "settings.advanced_note": "Parametri avanzati (motore, sicurezza, notifiche) → Impostazioni"
}, be = {
  en: E,
  it: Zt
};
function ht(n) {
  const t = (n?.locale?.language ?? n?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in be ? t : "en";
}
function Gt(n, e) {
  return e ? n.replace(/\{(\w+)\}/g, (t, i) => {
    const o = e[i];
    return o === void 0 ? t : String(o);
  }) : n;
}
function c(n, e, t) {
  const i = be[n] ?? E;
  return Gt(i[e] ?? E[e], t);
}
function ie(n, e, t) {
  const i = `${e}.${t}`, o = be[n] ?? E, s = E;
  return o[i] ?? s[i] ?? t;
}
function Qt(n, e) {
  const t = be[n] ?? E, i = E;
  for (const o of ["queue_state", "zone_state", "outcome"]) {
    const s = `${o}.${e}`, a = t[s] ?? i[s];
    if (a !== void 0) return a;
  }
  return e;
}
const Xe = /* @__PURE__ */ new Map(), Ye = /* @__PURE__ */ new Map(), Je = /* @__PURE__ */ new Map();
function ce(n) {
  let e = Xe.get(n);
  return e || (e = new Intl.RelativeTimeFormat(n, { numeric: "auto" }), Xe.set(n, e)), e;
}
function et(n, e, t = Date.now()) {
  if (!n) return;
  const i = Date.parse(n);
  if (Number.isNaN(i)) return;
  const o = Math.round((i - t) / 1e3), s = Math.abs(o);
  try {
    return s < 60 ? ce(e).format(o, "second") : s < 3600 ? ce(e).format(Math.round(o / 60), "minute") : s < 86400 ? ce(e).format(Math.round(o / 3600), "hour") : ce(e).format(Math.round(o / 86400), "day");
  } catch {
    return;
  }
}
function Kt(n, e) {
  if (!n) return;
  const t = Date.parse(n);
  if (Number.isNaN(t)) return;
  let i = Ye.get(e);
  return i || (i = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }), Ye.set(e, i)), i.format(t);
}
function Xt(n, e) {
  if (!n) return;
  const t = Date.parse(n);
  if (Number.isNaN(t)) return;
  let i = Je.get(e);
  return i || (i = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }), Je.set(e, i)), i.format(t);
}
function de(n, e = 1) {
  const t = f(n);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (i) => e > 0 ? "" : i);
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
  const t = b(n.run_started_at), i = f(n.run_duration_min);
  if (!t || i === void 0 || i <= 0)
    return;
  const o = Date.parse(t);
  if (Number.isNaN(o)) return;
  const s = (e - o) / 6e4, a = Se(s / i, 0, 1), l = Math.max(0, Math.ceil(i - s)), r = [], p = n.run_planned_runs;
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
function ei(n) {
  const e = Math.abs(Math.round(n)), t = Math.floor(e / 3600), i = Math.round(e % 3600 / 60), o = [];
  return t > 0 && o.push(`${t} h`), i > 0 && o.push(`${i} min`), o.length === 0 && o.push(`${e} s`), o.join(" ");
}
function ti(n, e) {
  if (!n || typeof n != "object") return "";
  if (n.kind === "sun" && (n.event === "sunrise" || n.event === "sunset")) {
    const i = c(
      e,
      n.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), o = f(n.offset_s) ?? 0;
    if (o === 0) return i;
    const s = o < 0 ? "−" : "+";
    return `${i} ${s} ${ei(o)}`;
  }
  const t = b(n.at) ?? b(n.time);
  return t ? c(e, "trigger.at", { time: t }) : b(n.kind) ?? "";
}
const V = 12, U = 25, W = 35, mt = 3, _t = 45, gt = 0, ft = 30, ii = (U - V) / 10;
function tt(n, e, t) {
  return Math.max(e, Math.min(t, n));
}
function N(n) {
  const e = Math.floor(n), t = n - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function it(n, e) {
  const t = Math.max(0, N(n - ii * e));
  return [
    [V, t],
    [U, n],
    [W, n + e]
  ];
}
function Z(n, e, t, i) {
  const o = n[0], s = n[n.length - 1];
  let a;
  if (!o || !s)
    a = 0;
  else if (e <= o[0])
    a = o[1];
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
  return t !== void 0 && (a = Math.max(a, t)), i !== void 0 && (a = Math.min(a, i)), a;
}
function ot(n, e, t) {
  const i = Z(n, U, e, t), o = Z(n, W, e, t);
  return {
    amount: tt(N(i), mt, _t),
    heat: tt(N(o - i), gt, ft)
  };
}
function vt(n) {
  if (!Array.isArray(n)) return [];
  const e = [];
  for (const t of n) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const i = f(t[0]), o = f(t[1]);
    i !== void 0 && o !== void 0 && e.push([i, o]);
  }
  return [...e].sort((t, i) => t[0] - i[0]);
}
var oi = Object.defineProperty, ni = (n, e, t, i) => {
  for (var o = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (o = a(e, t, o) || o);
  return o && oi(e, t, o), o;
};
const F = 150, j = 44, ue = 6, nt = 6, Ie = class Ie extends k {
  render() {
    const e = this.curve, t = vt(e?.points);
    if (t.length === 0) return d;
    const i = f(e?.min), o = f(e?.max), s = t.map((v) => v[0]), a = t.map((v) => v[1]);
    i !== void 0 && a.push(i), o !== void 0 && a.push(o);
    let l = Math.min(...s), r = Math.max(...s), p = Math.min(...a), h = Math.max(...a);
    r - l < 1e-9 && (l -= 1, r += 1), h - p < 1e-9 && (p -= 1, h += 1);
    const m = (v) => ue + (v - l) / (r - l) * (F - 2 * ue), _ = (v) => j - nt - (v - p) / (h - p) * (j - 2 * nt), g = t.map((v, xe) => `${xe === 0 ? "M" : "L"}${m(v[0]).toFixed(1)},${_(v[1]).toFixed(1)}`).join(" "), x = (v, xe) => O`
      <line
        class="clamp"
        x1="0" x2="${F}"
        y1="${_(v).toFixed(1)}" y2="${_(v).toFixed(1)}"
      ></line>
      <text class="clamp-label" x="${F - 2}" text-anchor="end"
        y="${(_(v) - 2).toFixed(1)}">${xe}</text>
    `, I = t[0], M = t[t.length - 1];
    return u`
      <svg
        viewBox="0 0 ${F} ${j + 10}"
        width="${F}"
        height="${j + 10}"
        role="img"
        aria-hidden="true"
      >
        ${i !== void 0 ? x(i, String(i)) : d}
        ${o !== void 0 ? x(o, String(o)) : d}
        <path class="line" d="${g}"></path>
        ${t.map(
      (v) => O`<circle class="dot" r="2"
            cx="${m(v[0]).toFixed(1)}" cy="${_(v[1]).toFixed(1)}"></circle>`
    )}
        ${I ? O`<text class="axis-label" x="${ue}" y="${j + 8}"
              text-anchor="start">${I[0]}°</text>` : d}
        ${M && M !== I ? O`<text class="axis-label" x="${F - ue}" y="${j + 8}"
              text-anchor="end">${M[0]}°</text>` : d}
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
ni([
  y({ attribute: !1 })
], ge.prototype, "curve");
Y("imc-curve-sparkline", ge);
var si = Object.defineProperty, C = (n, e, t, i) => {
  for (var o = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (o = a(e, t, o) || o);
  return o && si(e, t, o), o;
};
const we = 320, z = 170, ee = 34, st = 12, te = 16, A = 24, pe = 5, ze = 40, De = class De extends k {
  constructor() {
    super(...arguments), this.language = "en", this._amount = 15, this._heat = 15, this._min = 1, this._max = 120, this._advanced = !1, this._dragged = !1, this._points = it(15, 15);
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
    const i = f(e?.min) ?? 1, o = f(e?.max) ?? 120, { amount: s, heat: a } = ot(t, i, o);
    this._amount = s, this._heat = a, this._min = i, this._max = o, this._dragged = !1, this._points = [
      [V, N(Z(t, V))],
      [U, N(Z(t, U))],
      [W, N(Z(t, W))]
    ];
  }
  _regen() {
    this._points = it(this._amount, this._heat), this._dragged = !1;
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
    const t = this._graphTop(), i = (z - A - e) / (z - te - A) * t;
    return Math.max(0, N(i));
  }
  _startDrag(e, t) {
    if (!this._advanced) return;
    t.preventDefault();
    const i = t.currentTarget.ownerSVGElement;
    if (!i) return;
    const o = (a) => {
      const l = i.getScreenCTM();
      if (!l) return;
      const r = i.createSVGPoint();
      r.x = a.clientX, r.y = a.clientY;
      const p = r.matrixTransform(l.inverse()).y, h = [...this._points], m = h[e];
      if (!m) return;
      h[e] = [m[0], this._valueFromY(p)], this._points = h, this._dragged = !0;
      const { amount: _, heat: g } = ot(this._points);
      this._amount = _, this._heat = g;
    }, s = () => {
      window.removeEventListener("pointermove", o), window.removeEventListener("pointerup", s);
    };
    window.addEventListener("pointermove", o), window.addEventListener("pointerup", s);
  }
  _save() {
    const e = this.cycle?.cycle_id ?? "", t = this._dragged ? {
      cycleId: e,
      mode: "advanced",
      points: this._points.map((i) => [i[0], i[1]]),
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
    return this.cycle?.curve?.kind === "volume" ? u`<div class="volume-note">${c(e, "editor.volume_note")}</div>` : u`
      <div class="title">${c(e, "editor.title")}</div>

      <div class="field">
        <div class="row">
          <label>${c(e, "editor.amount.label")}</label>
          <span class="value">${c(e, "editor.amount.value", { min: this._amount })}</span>
        </div>
        <div class="help">${c(e, "editor.amount.help")}</div>
        <input type="range" min=${mt} max=${_t} .value=${String(this._amount)}
          @input=${this._onAmount} />
        <div class="ends"><span>${c(e, "editor.amount.low")}</span><span>${c(e, "editor.amount.high")}</span></div>
      </div>

      <div class="field">
        <div class="row">
          <label>${c(e, "editor.heat.label")}</label>
          <span class="value">${c(e, "editor.heat.value", { min: this._heat })}</span>
        </div>
        <div class="help">${c(e, "editor.heat.help")}</div>
        <input type="range" min=${gt} max=${ft} .value=${String(this._heat)}
          @input=${this._onHeat} />
        <div class="ends"><span>${c(e, "editor.heat.low")}</span><span>${c(e, "editor.heat.high")}</span></div>
      </div>

      <div class="graph-box">
        <div class="caption">${c(e, "editor.graph.caption")}</div>
        ${this._renderGraph(e)}
      </div>

      <div class="examples">
        ${this._exampleTile(c(e, "editor.example.cool"), this._clampedValue(V))}
        ${this._exampleTile(c(e, "editor.example.mild"), this._clampedValue(U))}
        ${this._exampleTile(c(e, "editor.example.hot"), this._clampedValue(W))}
      </div>

      ${this._renderToday(e)}

      <div class="advanced-toggle" @click=${() => this._advanced = !this._advanced}>
        ${this._advanced ? "▾" : "▸"} ${c(e, "editor.advanced.toggle")}
      </div>
      ${this._advanced ? this._renderAdvanced(e) : d}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${c(e, "editor.save")}</button>
        <button @click=${this._cancel}>${c(e, "editor.cancel")}</button>
      </div>
    `;
  }
  _exampleTile(e, t) {
    return u`<div class="example"><div class="lbl">${e}</div><div class="num">${t} min</div></div>`;
  }
  _renderToday(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return d;
    const i = this._clampedValue(t);
    return u`<div class="today-banner">${c(e, "editor.today", {
      temp: Math.round(t),
      min: i
    })}</div>`;
  }
  _renderAdvanced(e) {
    return u`
      <div class="help">${c(e, "editor.advanced.help")}</div>
      <div class="limits">
        <div class="limit">
          <label>${c(e, "editor.min.label")}</label>
          <div class="help">${c(e, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(t) => {
      const i = Number(t.target.value);
      Number.isNaN(i) || (this._min = Math.min(i, this._max));
    }} /> min
        </div>
        <div class="limit">
          <label>${c(e, "editor.max.label")}</label>
          <div class="help">${c(e, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(t) => {
      const i = Number(t.target.value);
      Number.isNaN(i) || (this._max = Math.max(i, this._min));
    }} /> min
        </div>
      </div>
      <div class="note">${c(e, "editor.drag_hint")}</div>
      <div class="note">${c(e, "editor.more_points")}</div>
    `;
  }
  _renderGraph(e) {
    const t = [];
    for (let a = pe; a <= ze; a += 1)
      t.push([this._sx(a), this._sy(this._clampedValue(a))]);
    const i = t.map((a, l) => `${l === 0 ? "M" : "L"}${a[0].toFixed(1)},${a[1].toFixed(1)}`).join(" "), o = this.weightedTemp, s = o !== void 0 && !Number.isNaN(o) && o >= pe && o <= ze;
    return O`
      <svg viewBox="0 0 ${we} ${z}">
        <line class="axis" x1=${ee} y1=${te} x2=${ee} y2=${z - A}></line>
        <line class="axis" x1=${ee} y1=${z - A} x2=${we - st} y2=${z - A}></line>
        <text class="tick" x=${this._sx(V)} y=${z - A + 12} text-anchor="middle">12°</text>
        <text class="tick" x=${this._sx(U)} y=${z - A + 12} text-anchor="middle">25°</text>
        <text class="tick" x=${this._sx(W)} y=${z - A + 12} text-anchor="middle">35°</text>
        ${s ? O`<line class="today" x1=${this._sx(o)} y1=${te} x2=${this._sx(o)} y2=${z - A}></line>
              <text class="today-text" x=${this._sx(o)} y=${te - 4} text-anchor="middle">${c(e, "editor.graph.today", { temp: Math.round(o) })}</text>` : d}
        <path class="curve" d=${i}></path>
        ${this._points.map(
      (a, l) => O`<circle class="handle" r=${this._advanced ? 7 : 3.5}
            cx=${this._sx(a[0]).toFixed(1)} cy=${this._sy(this._clampedValue(a[0])).toFixed(1)}
            @pointerdown=${(r) => this._startDrag(l, r)}></circle>`
    )}
      </svg>
    `;
  }
};
De.styles = X`
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
let $ = De;
C([
  y()
], $.prototype, "language");
C([
  y({ attribute: !1 })
], $.prototype, "cycle");
C([
  y({ attribute: !1 })
], $.prototype, "weightedTemp");
C([
  w()
], $.prototype, "_amount");
C([
  w()
], $.prototype, "_heat");
C([
  w()
], $.prototype, "_min");
C([
  w()
], $.prototype, "_max");
C([
  w()
], $.prototype, "_advanced");
C([
  w()
], $.prototype, "_dragged");
C([
  w()
], $.prototype, "_points");
Y("imc-curve-editor", $);
var ai = Object.defineProperty, P = (n, e, t, i) => {
  for (var o = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (o = a(e, t, o) || o);
  return o && ai(e, t, o), o;
};
const bt = {
  idle: "mdi:water-outline",
  queued: "mdi:timer-sand",
  watering: "mdi:water",
  soaking: "mdi:water-percent",
  paused: "mdi:pause-circle-outline",
  suspended: "mdi:calendar-remove-outline",
  disabled: "mdi:water-off-outline"
}, ri = [1, 4, 8, 24];
function li(n) {
  return n in bt;
}
const Oe = class Oe extends k {
  constructor() {
    super(...arguments), this.language = "en", this.now = Date.now(), this.compact = !1, this.showControls = !0, this._expanded = !1;
  }
  get _zoneState() {
    const e = this.zone?.state?.state;
    return e && li(e) ? e : void 0;
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
    const t = e.currentTarget, i = Number(t.value);
    t.value = "";
    const o = this.zone?.zoneId;
    o && Number.isFinite(i) && i > 0 && this._dispatch({ action: "pause", zoneId: o, hours: i });
  }
  _onSuspendDate(e) {
    const t = e.currentTarget, i = t.value;
    t.value = "";
    const o = this.zone?.zoneId;
    o && i && this._dispatch({ action: "suspend", zoneId: o, until: `${i}T00:00:00` });
  }
  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */
  _renderBadges() {
    const e = this.zone;
    if (!e) return d;
    const t = e.state?.attributes ?? {}, i = [], o = b(t.suspended_until) ?? (R(e.suspendUntil) ? void 0 : e.suspendUntil?.state);
    if (this._zoneState === "suspended" && o) {
      const s = Xt(o, this.language) ?? o;
      i.push(u`
        <span class="badge" title=${c(this.language, "zone.suspended_until", { date: s })}>
          <ha-icon icon="mdi:calendar-remove-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${s}
        </span>
      `);
    }
    for (const s of Ae(t.degraded)) {
      const a = b(s);
      if (!a) continue;
      const l = ie(this.language, "degraded", a);
      i.push(u`
        <span class="badge" title=${l}>
          <ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? d : l}
        </span>
      `);
    }
    return i;
  }
  _renderProgress() {
    const e = this.zone, t = this._zoneState;
    if (!e || t !== "watering" && t !== "soaking")
      return d;
    const i = Jt(
      e.state?.attributes ?? {},
      this.now
    );
    return i ? u`
      <div class="progress-line">
        <div class="progress ${t === "soaking" ? "soaking" : ""}">
          <div class="bar" style="width:${(i.fraction * 100).toFixed(2)}%"></div>
          ${i.segmentBounds.map(
      (o) => u`<div class="seg" style="left:${(o * 100).toFixed(2)}%"></div>`
    )}
        </div>
        <span class="remaining">
          ${c(this.language, "zone.remaining", {
      minutes: i.remainingMin
    })}
        </span>
      </div>
    ` : d;
  }
  _renderMeta() {
    const e = this.zone;
    if (!e) return d;
    const t = this.language, i = [], o = e.nextRun;
    if (o && !R(o)) {
      const a = et(o.state, t, this.now), l = Kt(o.state, t), r = b(o.attributes.cycle_name);
      (a || l) && i.push(u`
          <span>
            ${c(t, "zone.next_run")}: ${a ?? ""}
            ${l ? u`<span class="abs">
                  · ${l}${r ? ` (${r})` : ""}
                </span>` : d}
          </span>
        `);
    } else
      i.push(u`<span>${c(t, "zone.no_next_run")}</span>`);
    const s = e.lastOutcome;
    if (s && !R(s) && s.state !== "none") {
      const a = ie(t, "outcome", s.state), l = b(s.attributes.reason_key), r = l ? ie(t, "reason", l) : void 0, p = b(s.attributes.finished_at), h = et(p, t, this.now);
      i.push(u`
        <span>
          ${c(t, "zone.last_outcome")}: ${a}${r ? ` — ${r}` : ""}${h ? u`<span class="abs"> · ${h}</span>` : d}
        </span>
      `);
    }
    return u`<div class="meta">${i}</div>`;
  }
  _renderControls() {
    const e = this.zone;
    if (!e || !this.showControls) return d;
    const t = this.language, i = e.zoneId, o = this._zoneState, s = e.enabledSwitch, a = s?.state === "on", l = o === "paused" || o === "suspended";
    return u`
      <div class="controls" @click=${(r) => r.stopPropagation()}>
        <button @click=${() => this._dispatch({ action: "run", zoneId: i })}>
          ${c(t, "controls.run_now")}
        </button>
        <button @click=${() => this._dispatch({ action: "skip", zoneId: i })}>
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
          ${ri.map(
      (r) => u`<option value=${r}>
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
        ${l ? u`<button
              @click=${() => this._dispatch({ action: "resume", zoneId: i })}
            >
              ${c(t, "controls.resume")}
            </button>` : d}
        ${s ? u`<button
              @click=${() => this._dispatch({
      action: "set-enabled",
      zoneId: i,
      enabled: !a
    })}
            >
              ${c(t, a ? "controls.disable" : "controls.enable")}
            </button>` : d}
      </div>
    `;
  }
  _renderCycles() {
    const e = this.zone;
    if (!e) return d;
    const t = this.language, i = Ae(e.state?.attributes.cycles).filter(
      (o) => !!o && typeof o == "object"
    );
    return i.length === 0 ? u`<div class="details">
        <div class="no-cycles">${c(t, "zone.no_cycles")}</div>
      </div>` : u`
      <div class="details">
        <div class="details-title">${c(t, "zone.cycles")}</div>
        ${i.map((o) => this._renderCycle(o))}
      </div>
    `;
  }
  _renderCycle(e) {
    const t = this.language, i = this.zone, o = b(e.cycle_id), s = i?.cycleSwitches.find(
      (v) => b(v.attributes.cycle_id) === o
    ), a = s ? s.state === "on" : e.enabled !== !1, l = ti(e.trigger, t), r = e.curve, p = f(r?.min), h = f(r?.max), m = c(
      t,
      r?.kind === "volume" ? "curve.unit_volume" : "curve.unit_duration"
    ), _ = [];
    p !== void 0 && _.push(
      `${c(t, "curve.clamp_min")} ${p} ${m}`
    ), h !== void 0 && _.push(
      `${c(t, "curve.clamp_max")} ${h} ${m}`
    );
    const g = r?.kind === "volume", x = !!o && this._editingCycle === o, I = g || !o ? d : u`<button
            class="link-btn"
            @click=${() => this._editingCycle = x ? void 0 : o}
          >
            ${c(t, "editor.edit_curve")}
          </button>`, M = x ? u`<imc-curve-editor
          .language=${t}
          .cycle=${e}
          .weightedTemp=${this.weightedTemp}
          @imc-curve-save=${this._onCurveSave}
          @imc-curve-cancel=${() => this._editingCycle = void 0}
        ></imc-curve-editor>` : d;
    return u`
      <div class="cycle">
        <div class="cycle-info">
          <div class="cycle-name">
            ${b(e.name) ?? o ?? "?"}
            ${a ? d : u`<span class="off">
                  ${c(t, "zone.cycle_disabled")}
                </span>`}
          </div>
          <div class="cycle-sub">
            ${l}${l && _.length > 0 ? " · " : ""}${_.join(" · ")}
          </div>
        </div>
        ${r ? u`<imc-curve-sparkline .curve=${r}></imc-curve-sparkline>` : d}
        ${I}
      </div>
      ${M}
    `;
  }
  _onCurveSave(e) {
    const t = this.zone?.zoneId;
    if (!t) return;
    const i = e.detail;
    i.mode === "simple" ? this._dispatch({
      action: "save-simple-curve",
      zoneId: t,
      cycleId: i.cycleId,
      amount: i.amount,
      heat: i.heat,
      min: i.min,
      max: i.max
    }) : this._dispatch({
      action: "save-curve",
      zoneId: t,
      cycleId: i.cycleId,
      points: i.points,
      min: i.min,
      max: i.max
    }), this._editingCycle = void 0;
  }
  render() {
    const e = this.zone;
    if (!e) return d;
    const t = this.language, i = this._zoneState, o = i ? ie(t, "zone_state", i) : c(t, "card.unavailable"), s = i ? bt[i] : "mdi:help-circle-outline", a = i ?? "unknown", l = !this.compact || this._expanded;
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
          <span class="state-chip ${a}">${o}</span>
          <ha-icon
            class="caret"
            icon=${this._expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </div>
        ${this._renderProgress()}
        ${l ? this._renderMeta() : d}
        ${l ? this._renderControls() : d}
        ${this._expanded ? this._renderCycles() : d}
      </div>
    `;
  }
};
Oe.styles = X`
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
let S = Oe;
P([
  y({ attribute: !1 })
], S.prototype, "zone");
P([
  y()
], S.prototype, "language");
P([
  y({ attribute: !1 })
], S.prototype, "now");
P([
  y({ type: Boolean, reflect: !0 })
], S.prototype, "compact");
P([
  y({ type: Boolean })
], S.prototype, "showControls");
P([
  y({ attribute: !1 })
], S.prototype, "weightedTemp");
P([
  w()
], S.prototype, "_expanded");
P([
  w()
], S.prototype, "_editingCycle");
Y("imc-zone-row", S);
var ci = Object.defineProperty, Pe = (n, e, t, i) => {
  for (var o = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (o = a(e, t, o) || o);
  return o && ci(e, t, o), o;
};
const qe = class qe extends k {
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
    return u`
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
        ${this.hasPauseSwitch ? u`<button
              class=${this.paused ? "active" : ""}
              @click=${() => this._dispatch({ action: "set-pause", paused: !this.paused })}
            >
              ${c(
      e,
      this.paused ? "controls.resume_global" : "controls.pause_global"
    )}
            </button>` : d}
      </div>
    `;
  }
};
qe.styles = X`
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
let K = qe;
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
var di = Object.defineProperty, ye = (n, e, t, i) => {
  for (var o = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (o = a(e, t, o) || o);
  return o && di(e, t, o), o;
};
const ui = [
  "idle",
  "evaluating",
  "running"
];
function pi(n) {
  return !!n && ui.includes(n);
}
const Re = class Re extends k {
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
      const t = e.get("hass"), i = this.hass;
      return !t || !i || Object.keys(i.states).length !== this._statesCount ? !0 : this._relevantIds.some(
        (s) => t.states[s] !== i.states[s]
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
  async _call(e, t, i) {
    const o = this.hass;
    if (o)
      try {
        await o.callService(e, t, i);
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
        const o = this._model?.zones.find(
          (s) => s.zoneId === t.zoneId
        )?.enabledSwitch?.entity_id;
        o && this._call(
          "switch",
          t.enabled ? "turn_on" : "turn_off",
          { entity_id: o }
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
        const i = this._model?.hub.pauseSwitch?.entity_id;
        i && this._call(
          "switch",
          t.paused ? "turn_on" : "turn_off",
          { entity_id: i }
        );
        break;
      }
    }
  }
  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */
  _renderHeader(e, t) {
    const i = e.hub, o = R(i.waterBudget) ? void 0 : f(i.waterBudget?.state), s = R(i.skipThreshold) ? void 0 : f(i.skipThreshold?.state);
    let a = d;
    if (o !== void 0 || s !== void 0) {
      const x = Math.max(o ?? 0, s ?? 0, 1e-3), I = Se((o ?? 0) / x, 0, 1), M = s !== void 0 ? Se(s / x, 0, 1) : void 0, v = o !== void 0 && s !== void 0 && o >= s;
      a = u`
        <div
          class="budget"
          title=${`${c(t, "header.water_budget")} / ${c(t, "header.skip_threshold")}`}
        >
          <span class="budget-label">${c(t, "header.water_budget")}</span>
          <div class="meter">
            <div
              class="meter-fill ${v ? "sufficient" : ""}"
              style="width:${(I * 100).toFixed(1)}%"
            ></div>
            ${M !== void 0 ? u`<div
                  class="meter-mark"
                  style="left:${(M * 100).toFixed(1)}%"
                ></div>` : d}
          </div>
          <span class="budget-numbers">
            ${de(o, 2) ?? "—"} /
            ${de(s, 1) ?? "—"} mm
          </span>
        </div>
      `;
    }
    const l = i.weightedTemp, r = R(l) ? void 0 : f(l?.state), p = l?.attributes.stale_weather === !0, h = i.session?.state, m = pi(h) ? h : void 0, _ = i.pauseSwitch?.state === "on", g = R(i.consumptionLeft) ? void 0 : f(i.consumptionLeft?.state);
    return u`
      <div class="header">
        ${a}
        <div class="chips">
          ${r !== void 0 ? u`<span
                class="chip"
                title=${c(t, "header.weighted_temp")}
              >
                <ha-icon icon="mdi:thermometer" style="--mdc-icon-size:14px"></ha-icon>
                ${de(r, 1)} °C
              </span>` : d}
          ${p ? u`<span class="chip warning">
                <ha-icon icon="mdi:alert" style="--mdc-icon-size:14px"></ha-icon>
                ${c(t, "header.stale_weather")}
              </span>` : d}
          ${m ? u`<span
                class="chip ${m !== "idle" ? "accent" : ""}"
                title=${c(t, "header.session")}
              >
                <ha-icon
                  icon=${m === "running" ? "mdi:play-circle-outline" : m === "evaluating" ? "mdi:magnify" : "mdi:sleep"}
                  style="--mdc-icon-size:14px"
                ></ha-icon>
                ${ie(t, "session", m)}
              </span>` : d}
          ${_ ? u`<span class="chip warning">
                <ha-icon icon="mdi:pause" style="--mdc-icon-size:14px"></ha-icon>
                ${c(t, "header.global_pause")}
              </span>` : d}
          ${g !== void 0 ? u`<span
                class="chip"
                title=${c(t, "header.consumption_left")}
              >
                <ha-icon icon="mdi:counter" style="--mdc-icon-size:14px"></ha-icon>
                ${de(g, 0)} L
              </span>` : d}
        </div>
      </div>
    `;
  }
  _renderQueue(e, t) {
    const i = e.hub.session;
    if (i?.state !== "running") return d;
    const o = Ae(i.attributes.queue).filter(
      (a) => !!a && typeof a == "object"
    );
    if (o.length === 0) return d;
    const s = b(i.attributes.active_zone_id);
    return u`
      <div class="queue">
        <div class="queue-title">${c(t, "queue.title")}</div>
        ${o.map((a, l) => {
      const r = b(a.state), p = s !== void 0 && a.zone_id === s || r === "watering" || r === "running", h = f(a.duration_min);
      return u`
            <div class="queue-item ${p ? "active" : ""}">
              <span class="queue-index">${l + 1}.</span>
              <span class="queue-name">
                ${b(a.zone_name) ?? b(a.zone_id) ?? "?"}
              </span>
              ${h !== void 0 ? u`<span class="queue-duration">
                    ${c(t, "queue.duration", { minutes: h })}
                  </span>` : d}
              ${r ? u`<span class="queue-state">
                    ${Qt(t, r)}
                  </span>` : d}
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
    if (!e || !t) return d;
    const i = ht(t), o = pt(t);
    this._model = o, this._relevantIds = o.entityIds, this._statesCount = Object.keys(t.states).length;
    const s = e.title ? u`<h1 class="card-title">${e.title}</h1>` : d;
    if (!o.found)
      return u`
        <ha-card>
          ${s}
          <div class="message">${c(i, "card.not_installed")}</div>
        </ha-card>
      `;
    const a = e.zones, l = a && a.length > 0 ? o.zones.filter((r) => a.includes(r.zoneId)) : o.zones;
    return u`
      <ha-card @imc-zone-action=${this._onZoneAction} @imc-global-action=${this._onGlobalAction}>
        ${s}
        ${e.show_header !== !1 ? this._renderHeader(o, i) : d}
        ${this._error ? u`<div class="error">${this._error}</div>` : d}
        ${e.show_queue !== !1 ? this._renderQueue(o, i) : d}
        ${l.length === 0 ? u`<div class="message">${c(i, "card.no_zones")}</div>` : l.map(
      (r) => u`
                <imc-zone-row
                  .zone=${r}
                  .language=${i}
                  .now=${this._now}
                  .compact=${e.compact === !0}
                  .showControls=${e.show_controls !== !1}
                  .weightedTemp=${f(o.hub.weightedTemp?.state)}
                ></imc-zone-row>
              `
    )}
        ${e.show_controls !== !1 ? u`<imc-global-controls
              .language=${i}
              .paused=${o.hub.pauseSwitch?.state === "on"}
              .hasPauseSwitch=${!!o.hub.pauseSwitch}
            ></imc-global-controls>` : d}
      </ha-card>
    `;
  }
};
Re.styles = X`
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
let L = Re;
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
var hi = Object.defineProperty, yt = (n, e, t, i) => {
  for (var o = void 0, s = n.length - 1, a; s >= 0; s--)
    (a = n[s]) && (o = a(e, t, o) || o);
  return o && hi(e, t, o), o;
};
const mi = [
  { key: "show_header", label: "editor.show_header", fallback: !0 },
  { key: "show_queue", label: "editor.show_queue", fallback: !0 },
  { key: "show_controls", label: "editor.show_controls", fallback: !0 },
  { key: "compact", label: "editor.compact", fallback: !1 }
], Ue = class Ue extends k {
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
    const t = e.currentTarget.value, i = { ...this._config };
    t ? i.title = t : delete i.title, this._emitConfig(i);
  }
  _onToggle(e, t) {
    if (!this._config) return;
    const i = t.currentTarget.checked;
    this._emitConfig({ ...this._config, [e]: i });
  }
  _onZoneToggle(e, t) {
    if (!this._config) return;
    const i = t.currentTarget.checked, o = new Set(this._config.zones ?? []);
    i ? o.add(e) : o.delete(e);
    const s = { ...this._config };
    o.size > 0 ? s.zones = [...o] : delete s.zones, this._emitConfig(s);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return d;
    const i = ht(t), o = pt(t).zones, s = new Set(e.zones ?? []);
    return u`
      <div class="form">
        <label class="field">
          ${c(i, "card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${c(i, "card_editor.title_placeholder")}
            @input=${this._onTitleInput}
          />
        </label>

        ${mi.map(
      ({ key: a, label: l, fallback: r }) => u`
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${e[a] ?? r}
                @change=${(p) => this._onToggle(a, p)}
              />
              ${c(i, l)}
            </label>
          `
    )}

        <div class="zones">
          <span class="zones-title">${c(i, "editor.zones")}</span>
          ${o.length === 0 ? u`<span class="hint">${c(i, "editor.no_zones")}</span>` : u`
                ${o.map(
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
                <span class="hint">${c(i, "editor.zones_hint")}</span>
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
  name: E["card.name"],
  description: E["card.description"],
  preview: !0,
  documentationURL: "https://github.com/jmbriccola/ha-irrigation-configurable"
});
