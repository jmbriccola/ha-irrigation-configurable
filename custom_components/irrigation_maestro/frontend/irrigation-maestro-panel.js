/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const L = globalThis, Q = L.ShadowRoot && (L.ShadyCSS === void 0 || L.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, X = /* @__PURE__ */ Symbol(), de = /* @__PURE__ */ new WeakMap();
let ze = class {
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
const Pe = (r) => new ze(typeof r == "string" ? r : r + "", void 0, X), J = (r, ...e) => {
  const t = r.length === 1 ? r[0] : e.reduce((i, o, s) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(o) + r[s + 1], r[0]);
  return new ze(t, r, X);
}, Ue = (r, e) => {
  if (Q) r.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), o = L.litNonce;
    o !== void 0 && i.setAttribute("nonce", o), i.textContent = t.cssText, r.appendChild(i);
  }
}, le = Q ? (r) => r : (r) => r instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return Pe(t);
})(r) : r;
const { is: Re, defineProperty: De, getOwnPropertyDescriptor: He, getOwnPropertyNames: Le, getOwnPropertySymbols: Fe, getPrototypeOf: je } = Object, q = globalThis, ce = q.trustedTypes, qe = ce ? ce.emptyScript : "", Be = q.reactiveElementPolyfillSupport, O = (r, e) => r, F = { toAttribute(r, e) {
  switch (e) {
    case Boolean:
      r = r ? qe : null;
      break;
    case Object:
    case Array:
      r = r == null ? r : JSON.stringify(r);
  }
  return r;
}, fromAttribute(r, e) {
  let t = r;
  switch (e) {
    case Boolean:
      t = r !== null;
      break;
    case Number:
      t = r === null ? null : Number(r);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(r);
      } catch {
        t = null;
      }
  }
  return t;
} }, Y = (r, e) => !Re(r, e), ue = { attribute: !0, type: String, converter: F, reflect: !1, useDefault: !1, hasChanged: Y };
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
      const i = /* @__PURE__ */ Symbol(), o = this.getPropertyDescriptor(e, i, t);
      o !== void 0 && De(this.prototype, e, o);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: o, set: s } = He(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: o, set(n) {
      const d = o?.call(this);
      s?.call(this, n), this.requestUpdate(e, d, i);
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
      for (const o of i) t.unshift(le(o));
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
    const i = this.constructor.elementProperties.get(e), o = this.constructor._$Eu(e, i);
    if (o !== void 0 && i.reflect === !0) {
      const s = (i.converter?.toAttribute !== void 0 ? i.converter : F).toAttribute(t, i.type);
      this._$Em = e, s == null ? this.removeAttribute(o) : this.setAttribute(o, s), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, o = i._$Eh.get(e);
    if (o !== void 0 && this._$Em !== o) {
      const s = i.getPropertyOptions(o), n = typeof s.converter == "function" ? { fromAttribute: s.converter } : s.converter?.fromAttribute !== void 0 ? s.converter : F;
      this._$Em = o;
      const d = n.fromAttribute(t, s.type);
      this[o] = d ?? this._$Ej?.get(o) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, o = !1, s) {
    if (e !== void 0) {
      const n = this.constructor;
      if (o === !1 && (s = this[e]), i ??= n.getPropertyOptions(e), !((i.hasChanged ?? Y)(s, t) || i.useDefault && i.reflect && s === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: o, wrapped: s }, n) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), s !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), o === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        const { wrapped: n } = s, d = this[o];
        n !== !0 || this._$AL.has(o) || d === void 0 || this.C(o, void 0, s, d);
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
const ee = globalThis, pe = (r) => r, j = ee.trustedTypes, he = j ? j.createPolicy("lit-html", { createHTML: (r) => r }) : void 0, Se = "$lit$", x = `lit$${Math.random().toFixed(9).slice(2)}$`, Ee = "?" + x, We = `<${Ee}>`, E = document, P = () => E.createComment(""), U = (r) => r === null || typeof r != "object" && typeof r != "function", te = Array.isArray, Ve = (r) => te(r) || typeof r?.[Symbol.iterator] == "function", Z = `[ 	
\f\r]`, N = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, me = /-->/g, _e = />/g, A = RegExp(`>|${Z}(?:([^\\s"'>=/]+)(${Z}*=${Z}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), ge = /'/g, fe = /"/g, ke = /^(?:script|style|textarea|title)$/i, Ze = (r) => (e, ...t) => ({ _$litType$: r, strings: e, values: t }), m = Ze(1), I = /* @__PURE__ */ Symbol.for("lit-noChange"), h = /* @__PURE__ */ Symbol.for("lit-nothing"), ve = /* @__PURE__ */ new WeakMap(), z = E.createTreeWalker(E, 129);
function Me(r, e) {
  if (!te(r) || !r.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return he !== void 0 ? he.createHTML(e) : e;
}
const Ke = (r, e) => {
  const t = r.length - 1, i = [];
  let o, s = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = N;
  for (let d = 0; d < t; d++) {
    const a = r[d];
    let c, u, l = -1, g = 0;
    for (; g < a.length && (n.lastIndex = g, u = n.exec(a), u !== null); ) g = n.lastIndex, n === N ? u[1] === "!--" ? n = me : u[1] !== void 0 ? n = _e : u[2] !== void 0 ? (ke.test(u[2]) && (o = RegExp("</" + u[2], "g")), n = A) : u[3] !== void 0 && (n = A) : n === A ? u[0] === ">" ? (n = o ?? N, l = -1) : u[1] === void 0 ? l = -2 : (l = n.lastIndex - u[2].length, c = u[1], n = u[3] === void 0 ? A : u[3] === '"' ? fe : ge) : n === fe || n === ge ? n = A : n === me || n === _e ? n = N : (n = A, o = void 0);
    const v = n === A && r[d + 1].startsWith("/>") ? " " : "";
    s += n === N ? a + We : l >= 0 ? (i.push(c), a.slice(0, l) + Se + a.slice(l) + x + v) : a + x + (l === -2 ? d : v);
  }
  return [Me(r, s + (r[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class R {
  constructor({ strings: e, _$litType$: t }, i) {
    let o;
    this.parts = [];
    let s = 0, n = 0;
    const d = e.length - 1, a = this.parts, [c, u] = Ke(e, t);
    if (this.el = R.createElement(c, i), z.currentNode = this.el.content, t === 2 || t === 3) {
      const l = this.el.content.firstChild;
      l.replaceWith(...l.childNodes);
    }
    for (; (o = z.nextNode()) !== null && a.length < d; ) {
      if (o.nodeType === 1) {
        if (o.hasAttributes()) for (const l of o.getAttributeNames()) if (l.endsWith(Se)) {
          const g = u[n++], v = o.getAttribute(l).split(x), H = /([.?@])?(.*)/.exec(g);
          a.push({ type: 1, index: s, name: H[2], strings: v, ctor: H[1] === "." ? Qe : H[1] === "?" ? Xe : H[1] === "@" ? Je : B }), o.removeAttribute(l);
        } else l.startsWith(x) && (a.push({ type: 6, index: s }), o.removeAttribute(l));
        if (ke.test(o.tagName)) {
          const l = o.textContent.split(x), g = l.length - 1;
          if (g > 0) {
            o.textContent = j ? j.emptyScript : "";
            for (let v = 0; v < g; v++) o.append(l[v], P()), z.nextNode(), a.push({ type: 2, index: ++s });
            o.append(l[g], P());
          }
        }
      } else if (o.nodeType === 8) if (o.data === Ee) a.push({ type: 2, index: s });
      else {
        let l = -1;
        for (; (l = o.data.indexOf(x, l + 1)) !== -1; ) a.push({ type: 7, index: s }), l += x.length - 1;
      }
      s++;
    }
  }
  static createElement(e, t) {
    const i = E.createElement("template");
    return i.innerHTML = e, i;
  }
}
function T(r, e, t = r, i) {
  if (e === I) return e;
  let o = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const s = U(e) ? void 0 : e._$litDirective$;
  return o?.constructor !== s && (o?._$AO?.(!1), s === void 0 ? o = void 0 : (o = new s(r), o._$AT(r, t, i)), i !== void 0 ? (t._$Co ??= [])[i] = o : t._$Cl = o), o !== void 0 && (e = T(r, o._$AS(r, e.values), o, i)), e;
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
    const { el: { content: t }, parts: i } = this._$AD, o = (e?.creationScope ?? E).importNode(t, !0);
    z.currentNode = o;
    let s = z.nextNode(), n = 0, d = 0, a = i[0];
    for (; a !== void 0; ) {
      if (n === a.index) {
        let c;
        a.type === 2 ? c = new D(s, s.nextSibling, this, e) : a.type === 1 ? c = new a.ctor(s, a.name, a.strings, this, e) : a.type === 6 && (c = new Ye(s, this, e)), this._$AV.push(c), a = i[++d];
      }
      n !== a?.index && (s = z.nextNode(), n++);
    }
    return z.currentNode = E, o;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class D {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, i, o) {
    this.type = 2, this._$AH = h, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = o, this._$Cv = o?.isConnected ?? !0;
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
    e = T(this, e, t), U(e) ? e === h || e == null || e === "" ? (this._$AH !== h && this._$AR(), this._$AH = h) : e !== this._$AH && e !== I && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Ve(e) ? this.k(e) : this._(e);
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
    const { values: t, _$litType$: i } = e, o = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = R.createElement(Me(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === o) this._$AH.p(t);
    else {
      const s = new Ge(o, this), n = s.u(this.options);
      s.p(t), this.T(n), this._$AH = s;
    }
  }
  _$AC(e) {
    let t = ve.get(e.strings);
    return t === void 0 && ve.set(e.strings, t = new R(e)), t;
  }
  k(e) {
    te(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, o = 0;
    for (const s of e) o === t.length ? t.push(i = new D(this.O(P()), this.O(P()), this, this.options)) : i = t[o], i._$AI(s), o++;
    o < t.length && (this._$AR(i && i._$AB.nextSibling, o), t.length = o);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const i = pe(e).nextSibling;
      pe(e).remove(), e = i;
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
  constructor(e, t, i, o, s) {
    this.type = 1, this._$AH = h, this._$AN = void 0, this.element = e, this.name = t, this._$AM = o, this.options = s, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = h;
  }
  _$AI(e, t = this, i, o) {
    const s = this.strings;
    let n = !1;
    if (s === void 0) e = T(this, e, t, 0), n = !U(e) || e !== this._$AH && e !== I, n && (this._$AH = e);
    else {
      const d = e;
      let a, c;
      for (e = s[0], a = 0; a < s.length - 1; a++) c = T(this, d[i + a], t, a), c === I && (c = this._$AH[a]), n ||= !U(c) || c !== this._$AH[a], c === h ? e = h : e !== h && (e += (c ?? "") + s[a + 1]), this._$AH[a] = c;
    }
    n && !o && this.j(e);
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
  constructor(e, t, i, o, s) {
    super(e, t, i, o, s), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = T(this, e, t, 0) ?? h) === I) return;
    const i = this._$AH, o = e === h && i !== h || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, s = e !== h && (i === h || o);
    o && this.element.removeEventListener(this.name, this, i), s && this.element.addEventListener(this.name, this, e), this._$AH = e;
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
    T(this, e);
  }
}
const et = ee.litHtmlPolyfillSupport;
et?.(R, D), (ee.litHtmlVersions ??= []).push("3.3.3");
const tt = (r, e, t) => {
  const i = t?.renderBefore ?? e;
  let o = i._$litPart$;
  if (o === void 0) {
    const s = t?.renderBefore ?? null;
    i._$litPart$ = o = new D(e.insertBefore(P(), s), s, void 0, t ?? {});
  }
  return o._$AI(r), o;
};
const ie = globalThis;
class S extends C {
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
    return I;
  }
}
S._$litElement$ = !0, S.finalized = !0, ie.litElementHydrateSupport?.({ LitElement: S });
const it = ie.litElementPolyfillSupport;
it?.({ LitElement: S });
(ie.litElementVersions ??= []).push("4.2.2");
const ot = { attribute: !0, type: String, converter: F, reflect: !1, hasChanged: Y }, rt = (r = ot, e, t) => {
  const { kind: i, metadata: o } = t;
  let s = globalThis.litPropertyMetadata.get(o);
  if (s === void 0 && globalThis.litPropertyMetadata.set(o, s = /* @__PURE__ */ new Map()), i === "setter" && ((r = Object.create(r)).wrapped = !0), s.set(t.name, r), i === "accessor") {
    const { name: n } = t;
    return { set(d) {
      const a = e.get.call(this);
      e.set.call(this, d), this.requestUpdate(n, a, r, !0, d);
    }, init(d) {
      return d !== void 0 && this.C(n, void 0, r, d), d;
    } };
  }
  if (i === "setter") {
    const { name: n } = t;
    return function(d) {
      const a = this[n];
      e.call(this, d), this.requestUpdate(n, a, r, !0, d);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function w(r) {
  return (e, t) => typeof t == "object" ? rt(r, e, t) : ((i, o, s) => {
    const n = o.hasOwnProperty(s);
    return o.constructor.createProperty(s, i), n ? Object.getOwnPropertyDescriptor(o, s) : void 0;
  })(r, e, t);
}
function b(r) {
  return w({ ...r, state: !0, attribute: !1 });
}
function f(r) {
  if (typeof r == "number" && Number.isFinite(r)) return r;
  if (typeof r == "string" && r.trim() !== "") {
    const e = Number(r);
    if (Number.isFinite(e)) return e;
  }
}
function $(r) {
  return typeof r == "string" && r !== "" ? r : void 0;
}
function st(r) {
  return Array.isArray(r) ? r : [];
}
function ye(r, e, t) {
  return Math.min(t, Math.max(e, r));
}
function oe(r, e) {
  customElements.get(r) || customElements.define(r, e);
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
  "panel.rename_program": "Rename",
  "panel.delete_program": "Delete",
  "panel.confirm_delete_program": 'Delete "{name}"?',
  "panel.weather_line": "Today ({day}) ≈ {min} min. Skips if it rains.",
  "panel.pick_a_day": "Pick at least one day",
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
  "panel.rename_program": "Rinomina",
  "panel.delete_program": "Elimina",
  "panel.confirm_delete_program": "Eliminare «{name}»?",
  "panel.weather_line": "Oggi ({day}) ≈ {min} min. Salta se piove.",
  "panel.pick_a_day": "Scegli almeno un giorno",
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
function re(r) {
  const t = (r?.locale?.language ?? r?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in Ce ? t : "en";
}
function at(r, e) {
  return e ? r.replace(/\{(\w+)\}/g, (t, i) => {
    const o = e[i];
    return o === void 0 ? t : String(o);
  }) : r;
}
function p(r, e, t) {
  const i = Ce[r] ?? G;
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
function ct(r) {
  const e = {}, t = /* @__PURE__ */ new Map(), i = [];
  for (const s of Object.values(r.states)) {
    const n = $(s.attributes.maestro_role);
    if (!n) continue;
    i.push(s.entity_id);
    const d = $(s.attributes.zone_id);
    if (d) {
      let a = t.get(d);
      if (a || (a = {
        zoneId: d,
        name: d,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(d, a)), n === "cycle_enabled")
        a.cycleSwitches.push(s);
      else {
        const c = lt[n];
        c && (a[c] = s);
      }
    } else {
      const a = dt[n];
      a && (e[a] = s);
    }
  }
  const o = [...t.values()];
  for (const s of o) {
    const n = s.state?.attributes ?? {};
    s.name = $(n.zone_name) ?? $(s.state?.attributes.friendly_name) ?? s.zoneId, s.order = f(n.order) ?? f(s.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return o.sort(
    (s, n) => s.order - n.order || s.name.localeCompare(n.name)
  ), { found: i.length > 0, hub: e, zones: o, entityIds: i };
}
function ut(r) {
  const e = st(r.state?.attributes?.cycles), t = [];
  for (const i of e) {
    if (typeof i != "object" || i === null) continue;
    const o = i, s = {
      cycle_id: $(o.cycle_id),
      name: $(o.name),
      enabled: typeof o.enabled == "boolean" ? o.enabled : void 0,
      trigger: o.trigger ?? void 0,
      curve: o.curve ?? void 0
    }, n = o.days;
    Array.isArray(n) && (s.days = n.map((a) => f(a)).filter((a) => a !== void 0));
    const d = o.day_minutes;
    if (d && typeof d == "object") {
      const a = {};
      for (const [c, u] of Object.entries(d)) {
        const l = f(u);
        l !== void 0 && (a[c] = l);
      }
      s.day_minutes = a;
    }
    s.amount = f(o.amount), s.heat = f(o.heat), t.push(s);
  }
  return t;
}
function pt(r) {
  const e = Math.abs(Math.round(r)), t = Math.floor(e / 3600), i = Math.round(e % 3600 / 60), o = [];
  return t > 0 && o.push(`${t} h`), i > 0 && o.push(`${i} min`), o.length === 0 && o.push(`${e} s`), o.join(" ");
}
function ht(r, e) {
  if (!r || typeof r != "object") return "";
  if (r.kind === "sun" && (r.event === "sunrise" || r.event === "sunset")) {
    const i = p(
      e,
      r.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), o = f(r.offset_s) ?? 0;
    if (o === 0) return i;
    const s = o < 0 ? "−" : "+";
    return `${i} ${s} ${pt(o)}`;
  }
  const t = $(r.at) ?? $(r.time);
  return t ? p(e, "trigger.at", { time: t }) : $(r.kind) ?? "";
}
const Ie = 12, Te = 25, mt = 35, _t = (Te - Ie) / 10;
function Ne(r) {
  const e = Math.floor(r), t = r - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function gt(r, e) {
  const t = Math.max(0, Ne(r - _t * e));
  return [
    [Ie, t],
    [Te, r],
    [mt, r + e]
  ];
}
function ft(r, e, t, i) {
  const o = r[0], s = r[r.length - 1];
  let n;
  if (!o || !s)
    n = 0;
  else if (e <= o[0])
    n = o[1];
  else if (e >= s[0])
    n = s[1];
  else {
    n = s[1];
    for (let d = 0; d < r.length - 1; d++) {
      const a = r[d], c = r[d + 1];
      if (!a || !c) continue;
      const [u, l] = a, [g, v] = c;
      if (u <= e && e <= g) {
        n = l + (v - l) * (e - u) / (g - u);
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
function Oe(r) {
  return $e[r] ?? $e.en;
}
function vt(r) {
  return !r || r.length === 0 || r.length >= 7;
}
function yt(r, e) {
  const t = new Set(r);
  return t.has(e) ? t.delete(e) : t.add(e), [...t].sort((i, o) => i - o);
}
function bt(r) {
  return !r || Object.keys(r).length === 0;
}
function K(r, e) {
  return r.day_minutes?.[String(e)] ?? r.amount ?? 0;
}
function $t(r, e, t, i, o) {
  return Ne(ft(gt(r, e), t, i, o));
}
var wt = Object.defineProperty, y = (r, e, t, i) => {
  for (var o = void 0, s = r.length - 1, n; s >= 0; s--)
    (n = r[s]) && (o = n(e, t, o) || o);
  return o && wt(e, t, o), o;
};
const we = 15, xe = 1, Ae = 1440, xt = -360, At = 360, zt = 5, se = class se extends S {
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
    if (!e) return m``;
    const t = re(this.hass), i = Oe(t);
    return m`
      <div class="section-label">${p(t, "program_editor.days")}</div>
      <div class="days">
        ${i.map(
      (o, s) => m`
            <div
              class="day ${this._days.includes(s) ? "on" : ""}"
              @click=${() => this._days = yt(this._days, s)}
            >
              ${o}
            </div>
          `
    )}
      </div>

      <div class="section-label">${p(t, "program_editor.start")}</div>
      <div class="start-row">
        <span class="seg">
          <span
            class="${this._startKind === "time" ? "sel" : ""}"
            @click=${() => this._startKind = "time"}
            >${p(t, "program_editor.start_fixed")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
            @click=${() => this._setSun("sunrise")}
            >${p(t, "program_editor.start_sunrise")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
            @click=${() => this._setSun("sunset")}
            >${p(t, "program_editor.start_sunset")}</span
          >
        </span>
        ${this._startKind === "time" ? m`<input
              type="time"
              class="timebox"
              .value=${this._startAt}
              @input=${(o) => this._startAt = o.target.value}
            />` : this._stepper(this._startOffsetMin, (o) => this._startOffsetMin = o, {
      min: xt,
      max: At,
      step: zt,
      suffix: "min",
      signed: !0
    })}
      </div>

      <div class="section-label">${p(t, "program_editor.duration_per_day")}</div>
      ${this._renderDurations(t, i)}
      <div class="same-row" @click=${() => this._sameForAll = !this._sameForAll}>
        <span class="switch ${this._sameForAll ? "on" : ""}"></span>
        ${p(t, "program_editor.same_duration")}
      </div>

      ${this._renderWeatherLine(t, e)}
      ${this._days.length === 0 ? m`<div class="hint">${p(t, "panel.pick_a_day")}</div>` : h}

      <div class="buttons">
        <button class="primary" ?disabled=${this._days.length === 0} @click=${this._save}>
          ${p(t, "editor.save")}
        </button>
        <button @click=${this._cancel}>${p(t, "editor.cancel")}</button>
      </div>
    `;
  }
  _setSun(e) {
    this._startKind = "sun", this._startEvent = e;
  }
  _renderDurations(e, t) {
    const i = p(e, "curve.unit_duration");
    return this._sameForAll ? m`<div class="duration-row">
        ${this._stepper(this._uniformMinutes, (o) => this._uniformMinutes = o, {
      min: xe,
      max: Ae,
      step: 1,
      suffix: i
    })}
      </div>` : m`${this._days.map((o) => {
      const s = K({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, o);
      return m`<div class="duration-row">
        <span class="dname">${t[o] ?? ""}</span>
        ${this._stepper(
        s,
        (n) => this._dayMinutes = { ...this._dayMinutes, [String(o)]: n },
        { min: xe, max: Ae, step: 1, suffix: i }
      )}
      </div>`;
    })}`;
  }
  _stepper(e, t, i) {
    const o = i.signed && e > 0 ? "+" : "";
    return m`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(ye(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${o}${e} ${i.suffix}</span>
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
    const o = ((/* @__PURE__ */ new Date()).getDay() + 6) % 7, s = K(t, o), n = f(t.heat) ?? 8, d = $t(
      s,
      n,
      i,
      f(t.curve?.min),
      f(t.curve?.max)
    ), a = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    });
    return m`<div class="weather">
      ${p(e, "panel.weather_line", { day: a, min: d })}
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
    if (this._days.length === 0) return;
    const e = this.zoneId, t = this.cycle?.cycle_id ?? "", i = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin }, o = [...this._days].sort((d, a) => d - a), s = o.length >= 7 ? [] : o;
    this.dispatchEvent(
      new CustomEvent("imc-program-save-schedule", {
        detail: { zoneId: e, programId: t, days: s, start: i },
        bubbles: !0,
        composed: !0
      })
    );
    const n = this._sameForAll ? { zoneId: e, programId: t, minutes: this._uniformMinutes } : { zoneId: e, programId: t, dayMinutes: this._buildDayMinutes() };
    this.dispatchEvent(
      new CustomEvent("imc-program-save-minutes", {
        detail: n,
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
se.styles = J`
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
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--error-color, #db4437);
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
let _ = se;
y([
  w({ attribute: !1 })
], _.prototype, "hass");
y([
  w()
], _.prototype, "zoneId");
y([
  w({ attribute: !1 })
], _.prototype, "cycle");
y([
  w({ attribute: !1 })
], _.prototype, "weightedTemp");
y([
  b()
], _.prototype, "_days");
y([
  b()
], _.prototype, "_startKind");
y([
  b()
], _.prototype, "_startAt");
y([
  b()
], _.prototype, "_startEvent");
y([
  b()
], _.prototype, "_startOffsetMin");
y([
  b()
], _.prototype, "_uniformMinutes");
y([
  b()
], _.prototype, "_dayMinutes");
y([
  b()
], _.prototype, "_sameForAll");
oe("imc-program-editor", _);
var St = Object.defineProperty, W = (r, e, t, i) => {
  for (var o = void 0, s = r.length - 1, n; s >= 0; s--)
    (n = r[s]) && (o = n(e, t, o) || o);
  return o && St(e, t, o), o;
};
const ne = class ne extends S {
  render() {
    const e = this.hass, t = this.zone;
    if (!e || !t) return m``;
    const i = re(e), o = ut(t);
    if (o.length === 0)
      return m`<div class="meta">${p(i, "panel.no_programs")}</div>`;
    const s = Oe(i);
    return m`${o.map((n) => {
      const d = n.days ?? [], a = vt(n.days), c = !!n.cycle_id && this._editingId === n.cycle_id, u = n.cycle_id ? this._findCycleSwitch(t, n.cycle_id) : void 0, l = u?.state === "on";
      return m`
        <div class="prog">
          <div class="name">${n.name ?? n.cycle_id}</div>
          <div class="days">
            ${s.map(
        (g, v) => m`
                <div class="day ${a || d.includes(v) ? "on" : ""}">
                  ${g}
                </div>
              `
      )}
          </div>
          <div class="meta">
            ${ht(n.trigger, i)} · ${this._minutesSummary(i, n)}
          </div>
          ${u ? m`<div
                class="toggle-row"
                @click=${() => this._onToggle(t.zoneId, n, u)}
              >
                <span class="switch ${l ? "on" : ""}"></span>
                <span
                  >${p(
        i,
        l ? "zone.cycle_enabled" : "zone.cycle_disabled"
      )}</span
                >
              </div>` : h}
          ${n.cycle_id ? m`<div class="actions">
                <button
                  class="link-btn"
                  @click=${() => this._editingId = c ? void 0 : n.cycle_id}
                >
                  ${p(i, "panel.edit_program")}
                </button>
                <button class="link-btn" @click=${() => this._onRename(i, t.zoneId, n)}>
                  ${p(i, "panel.rename_program")}
                </button>
                <button
                  class="link-btn danger"
                  @click=${() => this._onDelete(i, t.zoneId, n)}
                >
                  ${p(i, "panel.delete_program")}
                </button>
              </div>` : h}
          ${c ? m`<imc-program-editor
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
  /** Find the `cycle_enabled` switch entity for a program, matched by the
   *  discovery-assigned `cycle_id` attribute (see docs/design/card-contract.md). */
  _findCycleSwitch(e, t) {
    return e.cycleSwitches.find((i) => $(i.attributes.cycle_id) === t);
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
  _onRename(e, t, i) {
    if (!i.cycle_id) return;
    const o = i.name ?? "", s = window.prompt(p(e, "panel.rename_program"), o);
    if (s === null) return;
    const n = s.trim();
    !n || n === o || this._dispatch("imc-program-rename", {
      zoneId: t,
      programId: i.cycle_id,
      name: n
    });
  }
  _onDelete(e, t, i) {
    if (!i.cycle_id) return;
    const o = i.name ?? i.cycle_id;
    window.confirm(p(e, "panel.confirm_delete_program", { name: o })) && this._dispatch("imc-program-remove", { zoneId: t, programId: i.cycle_id });
  }
  _minutesSummary(e, t) {
    return t.day_minutes && Object.keys(t.day_minutes).length > 0 ? p(e, "panel.per_day_minutes") : p(e, "panel.minutes_value", { min: t.amount ?? "?" });
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
  `;
let k = ne;
W([
  w({ attribute: !1 })
], k.prototype, "hass");
W([
  w({ attribute: !1 })
], k.prototype, "zone");
W([
  w({ attribute: !1 })
], k.prototype, "weightedTemp");
W([
  b()
], k.prototype, "_editingId");
oe("imc-program-list", k);
var Et = Object.defineProperty, V = (r, e, t, i) => {
  for (var o = void 0, s = r.length - 1, n; s >= 0; s--)
    (n = r[s]) && (o = n(e, t, o) || o);
  return o && Et(e, t, o), o;
};
const ae = class ae extends S {
  constructor() {
    super(...arguments), this.narrow = !1, this._relevantIds = [], this._statesCount = 0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._errorTimer !== void 0 && (window.clearTimeout(this._errorTimer), this._errorTimer = void 0);
  }
  /* ------------------------------------------------------------ */
  /* Actions → services                                            */
  /* ------------------------------------------------------------ */
  async _call(e, t, i, o = !1) {
    if (this.hass)
      try {
        return await this.hass.callService(e, t, i, void 0, !0, o);
      } catch (s) {
        const n = s instanceof Error ? s.message : String(s);
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
  /* ------------------------------------------------------------ */
  /* Update gating: only re-render when a maestro entity changed   */
  /* (same change-detection approach as card.ts).                  */
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
  render() {
    const e = this.hass;
    if (!e) return m``;
    const t = re(e), i = ct(e);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(e.states).length, !i.found || i.zones.length === 0)
      return m`
        <div class="wrap">
          <header><h1>${p(t, "panel.title")}</h1></header>
          <div class="empty">${p(t, "panel.no_zones")}</div>
        </div>
      `;
    const o = this._resolveSelected(i.zones), s = f(i.hub.weightedTemp?.state);
    return m`
      <div
        class="wrap"
        @imc-program-save-schedule=${this._onSaveSchedule}
        @imc-program-save-minutes=${this._onSaveMinutes}
        @imc-program-cancel=${() => {
    }}
        @imc-program-toggle=${this._onProgramToggle}
        @imc-program-rename=${this._onProgramRename}
        @imc-program-remove=${this._onProgramRemove}
      >
        <header><h1>${p(t, "panel.title")}</h1></header>
        ${this._error ? m`<div class="error">${this._error}</div>` : h}
        <div class="tabs">
          ${i.zones.map(
      (n) => m`
              <div
                class="tab ${n.zoneId === o.zoneId ? "sel" : ""}"
                @click=${() => this._selectedZoneId = n.zoneId}
              >
                ${n.name}
              </div>
            `
    )}
        </div>
        <imc-program-list
          .hass=${e}
          .zone=${o}
          .weightedTemp=${s}
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
let M = ae;
V([
  w({ attribute: !1 })
], M.prototype, "hass");
V([
  w({ type: Boolean })
], M.prototype, "narrow");
V([
  b()
], M.prototype, "_selectedZoneId");
V([
  b()
], M.prototype, "_error");
oe("irrigation-maestro-panel", M);
