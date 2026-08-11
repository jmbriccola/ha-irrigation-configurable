/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const L = globalThis, Q = L.ShadowRoot && (L.ShadyCSS === void 0 || L.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, X = /* @__PURE__ */ Symbol(), de = /* @__PURE__ */ new WeakMap();
let Se = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== X) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (Q && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = de.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && de.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Pe = (o) => new Se(typeof o == "string" ? o : o + "", void 0, X), J = (o, ...e) => {
  const t = o.length === 1 ? o[0] : e.reduce((i, s, r) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s) + o[r + 1], o[0]);
  return new Se(t, o, X);
}, Ue = (o, e) => {
  if (Q) o.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), s = L.litNonce;
    s !== void 0 && i.setAttribute("nonce", s), i.textContent = t.cssText, o.appendChild(i);
  }
}, le = Q ? (o) => o : (o) => o instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return Pe(t);
})(o) : o;
const { is: De, defineProperty: Re, getOwnPropertyDescriptor: He, getOwnPropertyNames: Le, getOwnPropertySymbols: Fe, getPrototypeOf: je } = Object, q = globalThis, ce = q.trustedTypes, qe = ce ? ce.emptyScript : "", Be = q.reactiveElementPolyfillSupport, O = (o, e) => o, F = { toAttribute(o, e) {
  switch (e) {
    case Boolean:
      o = o ? qe : null;
      break;
    case Object:
    case Array:
      o = o == null ? o : JSON.stringify(o);
  }
  return o;
}, fromAttribute(o, e) {
  let t = o;
  switch (e) {
    case Boolean:
      t = o !== null;
      break;
    case Number:
      t = o === null ? null : Number(o);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(o);
      } catch {
        t = null;
      }
  }
  return t;
} }, Y = (o, e) => !De(o, e), ue = { attribute: !0, type: String, converter: F, reflect: !1, useDefault: !1, hasChanged: Y };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), q.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let C = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = ue) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = /* @__PURE__ */ Symbol(), s = this.getPropertyDescriptor(e, i, t);
      s !== void 0 && Re(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: s, set: r } = He(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: s, set(n) {
      const d = s?.call(this);
      r?.call(this, n), this.requestUpdate(e, d, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? ue;
  }
  static _$Ei() {
    if (this.hasOwnProperty(O("elementProperties"))) return;
    const e = je(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(O("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(O("properties"))) {
      const t = this.properties, i = [...Le(t), ...Fe(t)];
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
      for (const s of i) t.unshift(le(s));
    } else e !== void 0 && t.push(le(e));
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
    return Ue(e, this.constructor.elementStyles), e;
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
      const r = (i.converter?.toAttribute !== void 0 ? i.converter : F).toAttribute(t, i.type);
      this._$Em = e, r == null ? this.removeAttribute(s) : this.setAttribute(s, r), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, s = i._$Eh.get(e);
    if (s !== void 0 && this._$Em !== s) {
      const r = i.getPropertyOptions(s), n = typeof r.converter == "function" ? { fromAttribute: r.converter } : r.converter?.fromAttribute !== void 0 ? r.converter : F;
      this._$Em = s;
      const d = n.fromAttribute(t, r.type);
      this[s] = d ?? this._$Ej?.get(s) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, s = !1, r) {
    if (e !== void 0) {
      const n = this.constructor;
      if (s === !1 && (r = this[e]), i ??= n.getPropertyOptions(e), !((i.hasChanged ?? Y)(r, t) || i.useDefault && i.reflect && r === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: s, wrapped: r }, n) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), r !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), s === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [s, r] of this._$Ep) this[s] = r;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [s, r] of i) {
        const { wrapped: n } = r, d = this[s];
        n !== !0 || this._$AL.has(s) || d === void 0 || this.C(s, void 0, r, d);
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
C.elementStyles = [], C.shadowRootOptions = { mode: "open" }, C[O("elementProperties")] = /* @__PURE__ */ new Map(), C[O("finalized")] = /* @__PURE__ */ new Map(), Be?.({ ReactiveElement: C }), (q.reactiveElementVersions ??= []).push("2.1.2");
const ee = globalThis, he = (o) => o, j = ee.trustedTypes, pe = j ? j.createPolicy("lit-html", { createHTML: (o) => o }) : void 0, ze = "$lit$", x = `lit$${Math.random().toFixed(9).slice(2)}$`, Ee = "?" + x, We = `<${Ee}>`, E = document, P = () => E.createComment(""), U = (o) => o === null || typeof o != "object" && typeof o != "function", te = Array.isArray, Ve = (o) => te(o) || typeof o?.[Symbol.iterator] == "function", Z = `[ 	
\f\r]`, N = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, me = /-->/g, _e = />/g, A = RegExp(`>|${Z}(?:([^\\s"'>=/]+)(${Z}*=${Z}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), fe = /'/g, ge = /"/g, Me = /^(?:script|style|textarea|title)$/i, Ze = (o) => (e, ...t) => ({ _$litType$: o, strings: e, values: t }), p = Ze(1), T = /* @__PURE__ */ Symbol.for("lit-noChange"), h = /* @__PURE__ */ Symbol.for("lit-nothing"), ve = /* @__PURE__ */ new WeakMap(), S = E.createTreeWalker(E, 129);
function ke(o, e) {
  if (!te(o) || !o.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return pe !== void 0 ? pe.createHTML(e) : e;
}
const Ke = (o, e) => {
  const t = o.length - 1, i = [];
  let s, r = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = N;
  for (let d = 0; d < t; d++) {
    const a = o[d];
    let c, u, l = -1, g = 0;
    for (; g < a.length && (n.lastIndex = g, u = n.exec(a), u !== null); ) g = n.lastIndex, n === N ? u[1] === "!--" ? n = me : u[1] !== void 0 ? n = _e : u[2] !== void 0 ? (Me.test(u[2]) && (s = RegExp("</" + u[2], "g")), n = A) : u[3] !== void 0 && (n = A) : n === A ? u[0] === ">" ? (n = s ?? N, l = -1) : u[1] === void 0 ? l = -2 : (l = n.lastIndex - u[2].length, c = u[1], n = u[3] === void 0 ? A : u[3] === '"' ? ge : fe) : n === ge || n === fe ? n = A : n === me || n === _e ? n = N : (n = A, s = void 0);
    const b = n === A && o[d + 1].startsWith("/>") ? " " : "";
    r += n === N ? a + We : l >= 0 ? (i.push(c), a.slice(0, l) + ze + a.slice(l) + x + b) : a + x + (l === -2 ? d : b);
  }
  return [ke(o, r + (o[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class D {
  constructor({ strings: e, _$litType$: t }, i) {
    let s;
    this.parts = [];
    let r = 0, n = 0;
    const d = e.length - 1, a = this.parts, [c, u] = Ke(e, t);
    if (this.el = D.createElement(c, i), S.currentNode = this.el.content, t === 2 || t === 3) {
      const l = this.el.content.firstChild;
      l.replaceWith(...l.childNodes);
    }
    for (; (s = S.nextNode()) !== null && a.length < d; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const l of s.getAttributeNames()) if (l.endsWith(ze)) {
          const g = u[n++], b = s.getAttribute(l).split(x), H = /([.?@])?(.*)/.exec(g);
          a.push({ type: 1, index: r, name: H[2], strings: b, ctor: H[1] === "." ? Qe : H[1] === "?" ? Xe : H[1] === "@" ? Je : B }), s.removeAttribute(l);
        } else l.startsWith(x) && (a.push({ type: 6, index: r }), s.removeAttribute(l));
        if (Me.test(s.tagName)) {
          const l = s.textContent.split(x), g = l.length - 1;
          if (g > 0) {
            s.textContent = j ? j.emptyScript : "";
            for (let b = 0; b < g; b++) s.append(l[b], P()), S.nextNode(), a.push({ type: 2, index: ++r });
            s.append(l[g], P());
          }
        }
      } else if (s.nodeType === 8) if (s.data === Ee) a.push({ type: 2, index: r });
      else {
        let l = -1;
        for (; (l = s.data.indexOf(x, l + 1)) !== -1; ) a.push({ type: 7, index: r }), l += x.length - 1;
      }
      r++;
    }
  }
  static createElement(e, t) {
    const i = E.createElement("template");
    return i.innerHTML = e, i;
  }
}
function I(o, e, t = o, i) {
  if (e === T) return e;
  let s = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const r = U(e) ? void 0 : e._$litDirective$;
  return s?.constructor !== r && (s?._$AO?.(!1), r === void 0 ? s = void 0 : (s = new r(o), s._$AT(o, t, i)), i !== void 0 ? (t._$Co ??= [])[i] = s : t._$Cl = s), s !== void 0 && (e = I(o, s._$AS(o, e.values), s, i)), e;
}
class Ge {
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
    const { el: { content: t }, parts: i } = this._$AD, s = (e?.creationScope ?? E).importNode(t, !0);
    S.currentNode = s;
    let r = S.nextNode(), n = 0, d = 0, a = i[0];
    for (; a !== void 0; ) {
      if (n === a.index) {
        let c;
        a.type === 2 ? c = new R(r, r.nextSibling, this, e) : a.type === 1 ? c = new a.ctor(r, a.name, a.strings, this, e) : a.type === 6 && (c = new Ye(r, this, e)), this._$AV.push(c), a = i[++d];
      }
      n !== a?.index && (r = S.nextNode(), n++);
    }
    return S.currentNode = E, s;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class R {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, i, s) {
    this.type = 2, this._$AH = h, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = s, this._$Cv = s?.isConnected ?? !0;
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
    e = I(this, e, t), U(e) ? e === h || e == null || e === "" ? (this._$AH !== h && this._$AR(), this._$AH = h) : e !== this._$AH && e !== T && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Ve(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== h && U(this._$AH) ? this._$AA.nextSibling.data = e : this.T(E.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: i } = e, s = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = D.createElement(ke(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === s) this._$AH.p(t);
    else {
      const r = new Ge(s, this), n = r.u(this.options);
      r.p(t), this.T(n), this._$AH = r;
    }
  }
  _$AC(e) {
    let t = ve.get(e.strings);
    return t === void 0 && ve.set(e.strings, t = new D(e)), t;
  }
  k(e) {
    te(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, s = 0;
    for (const r of e) s === t.length ? t.push(i = new R(this.O(P()), this.O(P()), this, this.options)) : i = t[s], i._$AI(r), s++;
    s < t.length && (this._$AR(i && i._$AB.nextSibling, s), t.length = s);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const i = he(e).nextSibling;
      he(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class B {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, i, s, r) {
    this.type = 1, this._$AH = h, this._$AN = void 0, this.element = e, this.name = t, this._$AM = s, this.options = r, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = h;
  }
  _$AI(e, t = this, i, s) {
    const r = this.strings;
    let n = !1;
    if (r === void 0) e = I(this, e, t, 0), n = !U(e) || e !== this._$AH && e !== T, n && (this._$AH = e);
    else {
      const d = e;
      let a, c;
      for (e = r[0], a = 0; a < r.length - 1; a++) c = I(this, d[i + a], t, a), c === T && (c = this._$AH[a]), n ||= !U(c) || c !== this._$AH[a], c === h ? e = h : e !== h && (e += (c ?? "") + r[a + 1]), this._$AH[a] = c;
    }
    n && !s && this.j(e);
  }
  j(e) {
    e === h ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Qe extends B {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === h ? void 0 : e;
  }
}
class Xe extends B {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== h);
  }
}
class Je extends B {
  constructor(e, t, i, s, r) {
    super(e, t, i, s, r), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = I(this, e, t, 0) ?? h) === T) return;
    const i = this._$AH, s = e === h && i !== h || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, r = e !== h && (i === h || s);
    s && this.element.removeEventListener(this.name, this, i), r && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Ye {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    I(this, e);
  }
}
const et = ee.litHtmlPolyfillSupport;
et?.(D, R), (ee.litHtmlVersions ??= []).push("3.3.3");
const tt = (o, e, t) => {
  const i = t?.renderBefore ?? e;
  let s = i._$litPart$;
  if (s === void 0) {
    const r = t?.renderBefore ?? null;
    i._$litPart$ = s = new R(e.insertBefore(P(), r), r, void 0, t ?? {});
  }
  return s._$AI(o), s;
};
const ie = globalThis;
class z extends C {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = tt(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return T;
  }
}
z._$litElement$ = !0, z.finalized = !0, ie.litElementHydrateSupport?.({ LitElement: z });
const it = ie.litElementPolyfillSupport;
it?.({ LitElement: z });
(ie.litElementVersions ??= []).push("4.2.2");
const st = { attribute: !0, type: String, converter: F, reflect: !1, hasChanged: Y }, ot = (o = st, e, t) => {
  const { kind: i, metadata: s } = t;
  let r = globalThis.litPropertyMetadata.get(s);
  if (r === void 0 && globalThis.litPropertyMetadata.set(s, r = /* @__PURE__ */ new Map()), i === "setter" && ((o = Object.create(o)).wrapped = !0), r.set(t.name, o), i === "accessor") {
    const { name: n } = t;
    return { set(d) {
      const a = e.get.call(this);
      e.set.call(this, d), this.requestUpdate(n, a, o, !0, d);
    }, init(d) {
      return d !== void 0 && this.C(n, void 0, o, d), d;
    } };
  }
  if (i === "setter") {
    const { name: n } = t;
    return function(d) {
      const a = this[n];
      e.call(this, d), this.requestUpdate(n, a, o, !0, d);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function $(o) {
  return (e, t) => typeof t == "object" ? ot(o, e, t) : ((i, s, r) => {
    const n = s.hasOwnProperty(r);
    return s.constructor.createProperty(r, i), n ? Object.getOwnPropertyDescriptor(s, r) : void 0;
  })(o, e, t);
}
function y(o) {
  return $({ ...o, state: !0, attribute: !1 });
}
function f(o) {
  if (typeof o == "number" && Number.isFinite(o)) return o;
  if (typeof o == "string" && o.trim() !== "") {
    const e = Number(o);
    if (Number.isFinite(e)) return e;
  }
}
function w(o) {
  return typeof o == "string" && o !== "" ? o : void 0;
}
function rt(o) {
  return Array.isArray(o) ? o : [];
}
function ye(o, e, t) {
  return Math.min(t, Math.max(e, o));
}
function se(o, e) {
  customElements.get(o) || customElements.define(o, e);
}
const G = {
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
  "panel.weather_line": "Today ({day}) ≈ {min} min. Skips if it rains.",
  // Program editor (panel)
  "program_editor.days": "Days",
  "program_editor.start": "When does it start?",
  "program_editor.start_fixed": "Fixed time",
  "program_editor.start_sunrise": "Sunrise",
  "program_editor.start_sunset": "Sunset",
  "program_editor.duration_per_day": "Duration per day",
  "program_editor.same_duration": "Same duration every day",
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
}, nt = {
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
  "panel.weather_line": "Oggi ({day}) ≈ {min} min. Salta se piove.",
  // Editor programma (pannello)
  "program_editor.days": "Giorni",
  "program_editor.start": "Orario di partenza",
  "program_editor.start_fixed": "Ora fissa",
  "program_editor.start_sunrise": "Alba",
  "program_editor.start_sunset": "Tramonto",
  "program_editor.duration_per_day": "Durata per giorno",
  "program_editor.same_duration": "Stessa durata per tutti i giorni",
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
}, Ce = {
  en: G,
  it: nt
};
function oe(o) {
  const t = (o?.locale?.language ?? o?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in Ce ? t : "en";
}
function at(o, e) {
  return e ? o.replace(/\{(\w+)\}/g, (t, i) => {
    const s = e[i];
    return s === void 0 ? t : String(s);
  }) : o;
}
function m(o, e, t) {
  const i = Ce[o] ?? G;
  return at(i[e] ?? G[e], t);
}
const dt = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, lt = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function ct(o) {
  const e = {}, t = /* @__PURE__ */ new Map(), i = [];
  for (const r of Object.values(o.states)) {
    const n = w(r.attributes.maestro_role);
    if (!n) continue;
    i.push(r.entity_id);
    const d = w(r.attributes.zone_id);
    if (d) {
      let a = t.get(d);
      if (a || (a = {
        zoneId: d,
        name: d,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(d, a)), n === "cycle_enabled")
        a.cycleSwitches.push(r);
      else {
        const c = lt[n];
        c && (a[c] = r);
      }
    } else {
      const a = dt[n];
      a && (e[a] = r);
    }
  }
  const s = [...t.values()];
  for (const r of s) {
    const n = r.state?.attributes ?? {};
    r.name = w(n.zone_name) ?? w(r.state?.attributes.friendly_name) ?? r.zoneId, r.order = f(n.order) ?? f(r.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return s.sort(
    (r, n) => r.order - n.order || r.name.localeCompare(n.name)
  ), { found: i.length > 0, hub: e, zones: s, entityIds: i };
}
function ut(o) {
  const e = rt(o.state?.attributes?.cycles), t = [];
  for (const i of e) {
    if (typeof i != "object" || i === null) continue;
    const s = i, r = {
      cycle_id: w(s.cycle_id),
      name: w(s.name),
      enabled: typeof s.enabled == "boolean" ? s.enabled : void 0,
      trigger: s.trigger ?? void 0,
      curve: s.curve ?? void 0
    }, n = s.days;
    Array.isArray(n) && (r.days = n.map((a) => f(a)).filter((a) => a !== void 0));
    const d = s.day_minutes;
    if (d && typeof d == "object") {
      const a = {};
      for (const [c, u] of Object.entries(d)) {
        const l = f(u);
        l !== void 0 && (a[c] = l);
      }
      r.day_minutes = a;
    }
    r.amount = f(s.amount), r.heat = f(s.heat), t.push(r);
  }
  return t;
}
function ht(o) {
  const e = Math.abs(Math.round(o)), t = Math.floor(e / 3600), i = Math.round(e % 3600 / 60), s = [];
  return t > 0 && s.push(`${t} h`), i > 0 && s.push(`${i} min`), s.length === 0 && s.push(`${e} s`), s.join(" ");
}
function pt(o, e) {
  if (!o || typeof o != "object") return "";
  if (o.kind === "sun" && (o.event === "sunrise" || o.event === "sunset")) {
    const i = m(
      e,
      o.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), s = f(o.offset_s) ?? 0;
    if (s === 0) return i;
    const r = s < 0 ? "−" : "+";
    return `${i} ${r} ${ht(s)}`;
  }
  const t = w(o.at) ?? w(o.time);
  return t ? m(e, "trigger.at", { time: t }) : w(o.kind) ?? "";
}
const Te = 12, Ie = 25, mt = 35, _t = (Ie - Te) / 10;
function Ne(o) {
  const e = Math.floor(o), t = o - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function ft(o, e) {
  const t = Math.max(0, Ne(o - _t * e));
  return [
    [Te, t],
    [Ie, o],
    [mt, o + e]
  ];
}
function gt(o, e, t, i) {
  const s = o[0], r = o[o.length - 1];
  let n;
  if (!s || !r)
    n = 0;
  else if (e <= s[0])
    n = s[1];
  else if (e >= r[0])
    n = r[1];
  else {
    n = r[1];
    for (let d = 0; d < o.length - 1; d++) {
      const a = o[d], c = o[d + 1];
      if (!a || !c) continue;
      const [u, l] = a, [g, b] = c;
      if (u <= e && e <= g) {
        n = l + (b - l) * (e - u) / (g - u);
        break;
      }
    }
  }
  return t !== void 0 && (n = Math.max(n, t)), i !== void 0 && (n = Math.min(n, i)), n;
}
const be = [0, 1, 2, 3, 4, 5, 6], $e = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
};
function Oe(o) {
  return $e[o] ?? $e.en;
}
function vt(o) {
  return !o || o.length === 0 || o.length >= 7;
}
function yt(o, e) {
  const t = new Set(o);
  return t.has(e) ? t.delete(e) : t.add(e), [...t].sort((i, s) => i - s);
}
function bt(o) {
  return !o || Object.keys(o).length === 0;
}
function K(o, e) {
  return o.day_minutes?.[String(e)] ?? o.amount ?? 0;
}
function $t(o, e, t, i, s) {
  return Ne(gt(ft(o, e), t, i, s));
}
var wt = Object.defineProperty, v = (o, e, t, i) => {
  for (var s = void 0, r = o.length - 1, n; r >= 0; r--)
    (n = o[r]) && (s = n(e, t, s) || s);
  return s && wt(e, t, s), s;
};
const we = 15, xe = 1, Ae = 240, xt = -180, At = 180, St = 5, re = class re extends z {
  constructor() {
    super(...arguments), this.zoneId = "", this._days = [...be], this._startKind = "time", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._uniformMinutes = we, this._dayMinutes = {}, this._sameForAll = !0;
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle;
    if (!e) return;
    this._days = e.days && e.days.length > 0 ? [...e.days] : [...be];
    const t = e.trigger;
    t?.kind === "sun" ? (this._startKind = "sun", this._startEvent = t.event === "sunset" ? "sunset" : "sunrise", this._startOffsetMin = Math.round((f(t.offset_s) ?? 0) / 60)) : (this._startKind = "time", this._startEvent = "sunrise", this._startOffsetMin = 0), this._startAt = t?.at ?? t?.time ?? "06:00", this._uniformMinutes = f(e.amount) ?? we, this._dayMinutes = e.day_minutes ? { ...e.day_minutes } : {}, this._sameForAll = bt(e.day_minutes);
  }
  render() {
    const e = this.cycle;
    if (!e) return p``;
    const t = oe(this.hass), i = Oe(t);
    return p`
      <div class="section-label">${m(t, "program_editor.days")}</div>
      <div class="days">
        ${i.map(
      (s, r) => p`
            <div
              class="day ${this._days.includes(r) ? "on" : ""}"
              @click=${() => this._days = yt(this._days, r)}
            >
              ${s}
            </div>
          `
    )}
      </div>

      <div class="section-label">${m(t, "program_editor.start")}</div>
      <div class="start-row">
        <span class="seg">
          <span
            class="${this._startKind === "time" ? "sel" : ""}"
            @click=${() => this._startKind = "time"}
            >${m(t, "program_editor.start_fixed")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
            @click=${() => this._setSun("sunrise")}
            >${m(t, "program_editor.start_sunrise")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
            @click=${() => this._setSun("sunset")}
            >${m(t, "program_editor.start_sunset")}</span
          >
        </span>
        ${this._startKind === "time" ? p`<input
              type="time"
              class="timebox"
              .value=${this._startAt}
              @input=${(s) => this._startAt = s.target.value}
            />` : this._stepper(this._startOffsetMin, (s) => this._startOffsetMin = s, {
      min: xt,
      max: At,
      step: St,
      suffix: "min",
      signed: !0
    })}
      </div>

      <div class="section-label">${m(t, "program_editor.duration_per_day")}</div>
      ${this._renderDurations(t, i)}
      <div class="same-row" @click=${() => this._sameForAll = !this._sameForAll}>
        <span class="switch ${this._sameForAll ? "on" : ""}"></span>
        ${m(t, "program_editor.same_duration")}
      </div>

      ${this._renderWeatherLine(t, e)}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${m(t, "editor.save")}</button>
        <button @click=${this._cancel}>${m(t, "editor.cancel")}</button>
      </div>
    `;
  }
  _setSun(e) {
    this._startKind = "sun", this._startEvent = e;
  }
  _renderDurations(e, t) {
    const i = m(e, "curve.unit_duration");
    return this._sameForAll ? p`<div class="duration-row">
        ${this._stepper(this._uniformMinutes, (s) => this._uniformMinutes = s, {
      min: xe,
      max: Ae,
      step: 1,
      suffix: i
    })}
      </div>` : p`${this._days.map((s) => {
      const r = K({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, s);
      return p`<div class="duration-row">
        <span class="dname">${t[s] ?? ""}</span>
        ${this._stepper(
        r,
        (n) => this._dayMinutes = { ...this._dayMinutes, [String(s)]: n },
        { min: xe, max: Ae, step: 1, suffix: i }
      )}
      </div>`;
    })}`;
  }
  _stepper(e, t, i) {
    const s = i.signed && e > 0 ? "+" : "";
    return p`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(ye(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${s}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(ye(e + i.step, i.min, i.max))}
        >
          +
        </button>
      </span>
    `;
  }
  _renderWeatherLine(e, t) {
    const i = this.weightedTemp;
    if (i === void 0 || Number.isNaN(i)) return h;
    const s = ((/* @__PURE__ */ new Date()).getDay() + 6) % 7, r = K(t, s), n = f(t.heat) ?? 8, d = $t(
      r,
      n,
      i,
      f(t.curve?.min),
      f(t.curve?.max)
    ), a = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    });
    return p`<div class="weather">
      ${m(e, "panel.weather_line", { day: a, min: d })}
    </div>`;
  }
  _buildDayMinutes() {
    const e = {};
    for (const t of this._days)
      e[String(t)] = K(
        { amount: this._uniformMinutes, day_minutes: this._dayMinutes },
        t
      );
    return e;
  }
  _save() {
    const e = this.zoneId, t = this.cycle?.cycle_id ?? "", i = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin };
    this.dispatchEvent(
      new CustomEvent("imc-program-save-schedule", {
        detail: { zoneId: e, programId: t, days: [...this._days], start: i },
        bubbles: !0,
        composed: !0
      })
    );
    const s = this._sameForAll ? { zoneId: e, programId: t, minutes: this._uniformMinutes } : { zoneId: e, programId: t, dayMinutes: this._buildDayMinutes() };
    this.dispatchEvent(
      new CustomEvent("imc-program-save-minutes", {
        detail: s,
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
re.styles = J`
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
  `;
let _ = re;
v([
  $({ attribute: !1 })
], _.prototype, "hass");
v([
  $()
], _.prototype, "zoneId");
v([
  $({ attribute: !1 })
], _.prototype, "cycle");
v([
  $({ attribute: !1 })
], _.prototype, "weightedTemp");
v([
  y()
], _.prototype, "_days");
v([
  y()
], _.prototype, "_startKind");
v([
  y()
], _.prototype, "_startAt");
v([
  y()
], _.prototype, "_startEvent");
v([
  y()
], _.prototype, "_startOffsetMin");
v([
  y()
], _.prototype, "_uniformMinutes");
v([
  y()
], _.prototype, "_dayMinutes");
v([
  y()
], _.prototype, "_sameForAll");
se("imc-program-editor", _);
var zt = Object.defineProperty, W = (o, e, t, i) => {
  for (var s = void 0, r = o.length - 1, n; r >= 0; r--)
    (n = o[r]) && (s = n(e, t, s) || s);
  return s && zt(e, t, s), s;
};
const ne = class ne extends z {
  render() {
    const e = this.hass, t = this.zone;
    if (!e || !t) return p``;
    const i = oe(e), s = ut(t);
    if (s.length === 0)
      return p`<div class="meta">${m(i, "panel.no_programs")}</div>`;
    const r = Oe(i);
    return p`${s.map((n) => {
      const d = n.days ?? [], a = vt(n.days), c = !!n.cycle_id && this._editingId === n.cycle_id;
      return p`
        <div class="prog">
          <div class="name">${n.name ?? n.cycle_id}</div>
          <div class="days">
            ${r.map(
        (u, l) => p`
                <div class="day ${a || d.includes(l) ? "on" : ""}">
                  ${u}
                </div>
              `
      )}
          </div>
          <div class="meta">
            ${pt(n.trigger, i)} · ${this._minutesSummary(i, n)}
          </div>
          ${n.cycle_id ? p`<button
                class="link-btn"
                @click=${() => this._editingId = c ? void 0 : n.cycle_id}
              >
                ${m(i, "panel.edit_program")}
              </button>` : h}
          ${c ? p`<imc-program-editor
                .hass=${e}
                .zoneId=${t.zoneId}
                .cycle=${n}
                .weightedTemp=${this.weightedTemp}
                @imc-program-save-schedule=${() => this._editingId = void 0}
                @imc-program-save-minutes=${() => this._editingId = void 0}
                @imc-program-cancel=${() => this._editingId = void 0}
              ></imc-program-editor>` : h}
        </div>
      `;
    })}`;
  }
  _minutesSummary(e, t) {
    return t.day_minutes && Object.keys(t.day_minutes).length > 0 ? m(e, "panel.per_day_minutes") : m(e, "panel.minutes_value", { min: t.amount ?? "?" });
  }
};
ne.styles = J`
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
  `;
let M = ne;
W([
  $({ attribute: !1 })
], M.prototype, "hass");
W([
  $({ attribute: !1 })
], M.prototype, "zone");
W([
  $({ attribute: !1 })
], M.prototype, "weightedTemp");
W([
  y()
], M.prototype, "_editingId");
se("imc-program-list", M);
var Et = Object.defineProperty, V = (o, e, t, i) => {
  for (var s = void 0, r = o.length - 1, n; r >= 0; r--)
    (n = o[r]) && (s = n(e, t, s) || s);
  return s && Et(e, t, s), s;
};
const ae = class ae extends z {
  constructor() {
    super(...arguments), this.narrow = !1, this._relevantIds = [], this._statesCount = 0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._errorTimer !== void 0 && (window.clearTimeout(this._errorTimer), this._errorTimer = void 0);
  }
  /* ------------------------------------------------------------ */
  /* Actions → services                                            */
  /* ------------------------------------------------------------ */
  async _call(e, t, i, s = !1) {
    if (this.hass)
      try {
        return await this.hass.callService(e, t, i, void 0, !0, s);
      } catch (r) {
        const n = r instanceof Error ? r.message : String(r);
        this._error = n, this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
          this._error = void 0, this._errorTimer = void 0;
        }, 6e3);
        return;
      }
  }
  _onSaveSchedule(e) {
    const t = e.detail;
    this._call("irrigation_maestro", "set_program_schedule", {
      zone_id: t.zoneId,
      program_id: t.programId,
      days: t.days,
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
  /* ------------------------------------------------------------ */
  /* Update gating: only re-render when a maestro entity changed   */
  /* (same change-detection approach as card.ts).                  */
  /* ------------------------------------------------------------ */
  shouldUpdate(e) {
    if (e.size === 1 && e.has("hass")) {
      const t = e.get("hass"), i = this.hass;
      return !t || !i || Object.keys(i.states).length !== this._statesCount ? !0 : this._relevantIds.some(
        (r) => t.states[r] !== i.states[r]
      );
    }
    return !0;
  }
  render() {
    const e = this.hass;
    if (!e) return p``;
    const t = oe(e), i = ct(e);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(e.states).length, !i.found || i.zones.length === 0)
      return p`
        <div class="wrap">
          <header><h1>${m(t, "panel.title")}</h1></header>
          <div class="empty">${m(t, "panel.no_zones")}</div>
        </div>
      `;
    const s = this._resolveSelected(i.zones), r = f(i.hub.weightedTemp?.state);
    return p`
      <div
        class="wrap"
        @imc-program-save-schedule=${this._onSaveSchedule}
        @imc-program-save-minutes=${this._onSaveMinutes}
        @imc-program-cancel=${() => {
    }}
      >
        <header><h1>${m(t, "panel.title")}</h1></header>
        ${this._error ? p`<div class="error">${this._error}</div>` : h}
        <div class="tabs">
          ${i.zones.map(
      (n) => p`
              <div
                class="tab ${n.zoneId === s.zoneId ? "sel" : ""}"
                @click=${() => this._selectedZoneId = n.zoneId}
              >
                ${n.name}
              </div>
            `
    )}
        </div>
        <imc-program-list
          .hass=${e}
          .zone=${s}
          .weightedTemp=${r}
        ></imc-program-list>
      </div>
    `;
  }
  _resolveSelected(e) {
    return e.find((t) => t.zoneId === this._selectedZoneId) ?? e[0];
  }
};
ae.styles = J`
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
    .error {
      margin: 0 0 12px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
    }
  `;
let k = ae;
V([
  $({ attribute: !1 })
], k.prototype, "hass");
V([
  $({ type: Boolean })
], k.prototype, "narrow");
V([
  y()
], k.prototype, "_selectedZoneId");
V([
  y()
], k.prototype, "_error");
se("irrigation-maestro-panel", k);
