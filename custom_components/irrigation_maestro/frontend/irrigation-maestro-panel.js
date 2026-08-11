/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const q = globalThis, re = q.ShadowRoot && (q.ShadyCSS === void 0 || q.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, se = /* @__PURE__ */ Symbol(), _e = /* @__PURE__ */ new WeakMap();
let Ce = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== se) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (re && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = _e.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && _e.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const qe = (s) => new Ce(typeof s == "string" ? s : s + "", void 0, se), Z = (s, ...e) => {
  const t = s.length === 1 ? s[0] : e.reduce((i, r, o) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(r) + s[o + 1], s[0]);
  return new Ce(t, s, se);
}, Be = (s, e) => {
  if (re) s.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), r = q.litNonce;
    r !== void 0 && i.setAttribute("nonce", r), i.textContent = t.cssText, s.appendChild(i);
  }
}, me = re ? (s) => s : (s) => s instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return qe(t);
})(s) : s;
const { is: We, defineProperty: Ke, getOwnPropertyDescriptor: Ve, getOwnPropertyNames: Ze, getOwnPropertySymbols: Ge, getPrototypeOf: Qe } = Object, G = globalThis, ge = G.trustedTypes, Xe = ge ? ge.emptyScript : "", Je = G.reactiveElementPolyfillSupport, U = (s, e) => s, B = { toAttribute(s, e) {
  switch (e) {
    case Boolean:
      s = s ? Xe : null;
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
} }, oe = (s, e) => !We(s, e), fe = { attribute: !0, type: String, converter: B, reflect: !1, useDefault: !1, hasChanged: oe };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), G.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let C = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = fe) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = /* @__PURE__ */ Symbol(), r = this.getPropertyDescriptor(e, i, t);
      r !== void 0 && Ke(this.prototype, e, r);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: r, set: o } = Ve(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: r, set(n) {
      const d = r?.call(this);
      o?.call(this, n), this.requestUpdate(e, d, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? fe;
  }
  static _$Ei() {
    if (this.hasOwnProperty(U("elementProperties"))) return;
    const e = Qe(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(U("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(U("properties"))) {
      const t = this.properties, i = [...Ze(t), ...Ge(t)];
      for (const r of i) this.createProperty(r, t[r]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [i, r] of t) this.elementProperties.set(i, r);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, i] of this.elementProperties) {
      const r = this._$Eu(t, i);
      r !== void 0 && this._$Eh.set(r, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const i = new Set(e.flat(1 / 0).reverse());
      for (const r of i) t.unshift(me(r));
    } else e !== void 0 && t.push(me(e));
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
    return Be(e, this.constructor.elementStyles), e;
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
    const i = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, i);
    if (r !== void 0 && i.reflect === !0) {
      const o = (i.converter?.toAttribute !== void 0 ? i.converter : B).toAttribute(t, i.type);
      this._$Em = e, o == null ? this.removeAttribute(r) : this.setAttribute(r, o), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, r = i._$Eh.get(e);
    if (r !== void 0 && this._$Em !== r) {
      const o = i.getPropertyOptions(r), n = typeof o.converter == "function" ? { fromAttribute: o.converter } : o.converter?.fromAttribute !== void 0 ? o.converter : B;
      this._$Em = r;
      const d = n.fromAttribute(t, o.type);
      this[r] = d ?? this._$Ej?.get(r) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, r = !1, o) {
    if (e !== void 0) {
      const n = this.constructor;
      if (r === !1 && (o = this[e]), i ??= n.getPropertyOptions(e), !((i.hasChanged ?? oe)(o, t) || i.useDefault && i.reflect && o === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: r, wrapped: o }, n) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), o !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), r === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [r, o] of this._$Ep) this[r] = o;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [r, o] of i) {
        const { wrapped: n } = o, d = this[r];
        n !== !0 || this._$AL.has(r) || d === void 0 || this.C(r, void 0, o, d);
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
C.elementStyles = [], C.shadowRootOptions = { mode: "open" }, C[U("elementProperties")] = /* @__PURE__ */ new Map(), C[U("finalized")] = /* @__PURE__ */ new Map(), Je?.({ ReactiveElement: C }), (G.reactiveElementVersions ??= []).push("2.1.2");
const ne = globalThis, ve = (s) => s, W = ne.trustedTypes, ye = W ? W.createPolicy("lit-html", { createHTML: (s) => s }) : void 0, Ne = "$lit$", A = `lit$${Math.random().toFixed(9).slice(2)}$`, Oe = "?" + A, Ye = `<${Oe}>`, I = document, D = () => I.createComment(""), R = (s) => s === null || typeof s != "object" && typeof s != "function", ae = Array.isArray, et = (s) => ae(s) || typeof s?.[Symbol.iterator] == "function", ee = `[ 	
\f\r]`, P = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, be = /-->/g, $e = />/g, E = RegExp(`>|${ee}(?:([^\\s"'>=/]+)(${ee}*=${ee}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), xe = /'/g, we = /"/g, Pe = /^(?:script|style|textarea|title)$/i, tt = (s) => (e, ...t) => ({ _$litType$: s, strings: e, values: t }), c = tt(1), N = /* @__PURE__ */ Symbol.for("lit-noChange"), h = /* @__PURE__ */ Symbol.for("lit-nothing"), ze = /* @__PURE__ */ new WeakMap(), M = I.createTreeWalker(I, 129);
function Ue(s, e) {
  if (!ae(s) || !s.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return ye !== void 0 ? ye.createHTML(e) : e;
}
const it = (s, e) => {
  const t = s.length - 1, i = [];
  let r, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = P;
  for (let d = 0; d < t; d++) {
    const a = s[d];
    let p, _, u = -1, f = 0;
    for (; f < a.length && (n.lastIndex = f, _ = n.exec(a), _ !== null); ) f = n.lastIndex, n === P ? _[1] === "!--" ? n = be : _[1] !== void 0 ? n = $e : _[2] !== void 0 ? (Pe.test(_[2]) && (r = RegExp("</" + _[2], "g")), n = E) : _[3] !== void 0 && (n = E) : n === E ? _[0] === ">" ? (n = r ?? P, u = -1) : _[1] === void 0 ? u = -2 : (u = n.lastIndex - _[2].length, p = _[1], n = _[3] === void 0 ? E : _[3] === '"' ? we : xe) : n === we || n === xe ? n = E : n === be || n === $e ? n = P : (n = E, r = void 0);
    const $ = n === E && s[d + 1].startsWith("/>") ? " " : "";
    o += n === P ? a + Ye : u >= 0 ? (i.push(p), a.slice(0, u) + Ne + a.slice(u) + A + $) : a + A + (u === -2 ? d : $);
  }
  return [Ue(s, o + (s[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class F {
  constructor({ strings: e, _$litType$: t }, i) {
    let r;
    this.parts = [];
    let o = 0, n = 0;
    const d = e.length - 1, a = this.parts, [p, _] = it(e, t);
    if (this.el = F.createElement(p, i), M.currentNode = this.el.content, t === 2 || t === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (r = M.nextNode()) !== null && a.length < d; ) {
      if (r.nodeType === 1) {
        if (r.hasAttributes()) for (const u of r.getAttributeNames()) if (u.endsWith(Ne)) {
          const f = _[n++], $ = r.getAttribute(u).split(A), j = /([.?@])?(.*)/.exec(f);
          a.push({ type: 1, index: o, name: j[2], strings: $, ctor: j[1] === "." ? st : j[1] === "?" ? ot : j[1] === "@" ? nt : Q }), r.removeAttribute(u);
        } else u.startsWith(A) && (a.push({ type: 6, index: o }), r.removeAttribute(u));
        if (Pe.test(r.tagName)) {
          const u = r.textContent.split(A), f = u.length - 1;
          if (f > 0) {
            r.textContent = W ? W.emptyScript : "";
            for (let $ = 0; $ < f; $++) r.append(u[$], D()), M.nextNode(), a.push({ type: 2, index: ++o });
            r.append(u[f], D());
          }
        }
      } else if (r.nodeType === 8) if (r.data === Oe) a.push({ type: 2, index: o });
      else {
        let u = -1;
        for (; (u = r.data.indexOf(A, u + 1)) !== -1; ) a.push({ type: 7, index: o }), u += A.length - 1;
      }
      o++;
    }
  }
  static createElement(e, t) {
    const i = I.createElement("template");
    return i.innerHTML = e, i;
  }
}
function O(s, e, t = s, i) {
  if (e === N) return e;
  let r = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const o = R(e) ? void 0 : e._$litDirective$;
  return r?.constructor !== o && (r?._$AO?.(!1), o === void 0 ? r = void 0 : (r = new o(s), r._$AT(s, t, i)), i !== void 0 ? (t._$Co ??= [])[i] = r : t._$Cl = r), r !== void 0 && (e = O(s, r._$AS(s, e.values), r, i)), e;
}
class rt {
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
    const { el: { content: t }, parts: i } = this._$AD, r = (e?.creationScope ?? I).importNode(t, !0);
    M.currentNode = r;
    let o = M.nextNode(), n = 0, d = 0, a = i[0];
    for (; a !== void 0; ) {
      if (n === a.index) {
        let p;
        a.type === 2 ? p = new L(o, o.nextSibling, this, e) : a.type === 1 ? p = new a.ctor(o, a.name, a.strings, this, e) : a.type === 6 && (p = new at(o, this, e)), this._$AV.push(p), a = i[++d];
      }
      n !== a?.index && (o = M.nextNode(), n++);
    }
    return M.currentNode = I, r;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class L {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, i, r) {
    this.type = 2, this._$AH = h, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = r, this._$Cv = r?.isConnected ?? !0;
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
    e = O(this, e, t), R(e) ? e === h || e == null || e === "" ? (this._$AH !== h && this._$AR(), this._$AH = h) : e !== this._$AH && e !== N && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : et(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== h && R(this._$AH) ? this._$AA.nextSibling.data = e : this.T(I.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: i } = e, r = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = F.createElement(Ue(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === r) this._$AH.p(t);
    else {
      const o = new rt(r, this), n = o.u(this.options);
      o.p(t), this.T(n), this._$AH = o;
    }
  }
  _$AC(e) {
    let t = ze.get(e.strings);
    return t === void 0 && ze.set(e.strings, t = new F(e)), t;
  }
  k(e) {
    ae(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, r = 0;
    for (const o of e) r === t.length ? t.push(i = new L(this.O(D()), this.O(D()), this, this.options)) : i = t[r], i._$AI(o), r++;
    r < t.length && (this._$AR(i && i._$AB.nextSibling, r), t.length = r);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const i = ve(e).nextSibling;
      ve(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class Q {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, i, r, o) {
    this.type = 1, this._$AH = h, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = o, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = h;
  }
  _$AI(e, t = this, i, r) {
    const o = this.strings;
    let n = !1;
    if (o === void 0) e = O(this, e, t, 0), n = !R(e) || e !== this._$AH && e !== N, n && (this._$AH = e);
    else {
      const d = e;
      let a, p;
      for (e = o[0], a = 0; a < o.length - 1; a++) p = O(this, d[i + a], t, a), p === N && (p = this._$AH[a]), n ||= !R(p) || p !== this._$AH[a], p === h ? e = h : e !== h && (e += (p ?? "") + o[a + 1]), this._$AH[a] = p;
    }
    n && !r && this.j(e);
  }
  j(e) {
    e === h ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class st extends Q {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === h ? void 0 : e;
  }
}
class ot extends Q {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== h);
  }
}
class nt extends Q {
  constructor(e, t, i, r, o) {
    super(e, t, i, r, o), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = O(this, e, t, 0) ?? h) === N) return;
    const i = this._$AH, r = e === h && i !== h || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, o = e !== h && (i === h || r);
    r && this.element.removeEventListener(this.name, this, i), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class at {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    O(this, e);
  }
}
const dt = ne.litHtmlPolyfillSupport;
dt?.(F, L), (ne.litHtmlVersions ??= []).push("3.3.3");
const lt = (s, e, t) => {
  const i = t?.renderBefore ?? e;
  let r = i._$litPart$;
  if (r === void 0) {
    const o = t?.renderBefore ?? null;
    i._$litPart$ = r = new L(e.insertBefore(D(), o), o, void 0, t ?? {});
  }
  return r._$AI(s), r;
};
const de = globalThis;
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
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = lt(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return N;
  }
}
S._$litElement$ = !0, S.finalized = !0, de.litElementHydrateSupport?.({ LitElement: S });
const ct = de.litElementPolyfillSupport;
ct?.({ LitElement: S });
(de.litElementVersions ??= []).push("4.2.2");
const ut = { attribute: !0, type: String, converter: B, reflect: !1, hasChanged: oe }, pt = (s = ut, e, t) => {
  const { kind: i, metadata: r } = t;
  let o = globalThis.litPropertyMetadata.get(r);
  if (o === void 0 && globalThis.litPropertyMetadata.set(r, o = /* @__PURE__ */ new Map()), i === "setter" && ((s = Object.create(s)).wrapped = !0), o.set(t.name, s), i === "accessor") {
    const { name: n } = t;
    return { set(d) {
      const a = e.get.call(this);
      e.set.call(this, d), this.requestUpdate(n, a, s, !0, d);
    }, init(d) {
      return d !== void 0 && this.C(n, void 0, s, d), d;
    } };
  }
  if (i === "setter") {
    const { name: n } = t;
    return function(d) {
      const a = this[n];
      e.call(this, d), this.requestUpdate(n, a, s, !0, d);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function b(s) {
  return (e, t) => typeof t == "object" ? pt(s, e, t) : ((i, r, o) => {
    const n = r.hasOwnProperty(o);
    return r.constructor.createProperty(o, i), n ? Object.getOwnPropertyDescriptor(r, o) : void 0;
  })(s, e, t);
}
function m(s) {
  return b({ ...s, state: !0, attribute: !1 });
}
function v(s) {
  if (typeof s == "number" && Number.isFinite(s)) return s;
  if (typeof s == "string" && s.trim() !== "") {
    const e = Number(s);
    if (Number.isFinite(e)) return e;
  }
}
function w(s) {
  return typeof s == "string" && s !== "" ? s : void 0;
}
function ht(s) {
  return Array.isArray(s) ? s : [];
}
function K(s, e, t) {
  return Math.min(t, Math.max(e, s));
}
function X(s, e) {
  customElements.get(s) || customElements.define(s, e);
}
const ie = {
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
}, _t = {
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
}, De = {
  en: ie,
  it: _t
};
function J(s) {
  const t = (s?.locale?.language ?? s?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in De ? t : "en";
}
function mt(s, e) {
  return e ? s.replace(/\{(\w+)\}/g, (t, i) => {
    const r = e[i];
    return r === void 0 ? t : String(r);
  }) : s;
}
function l(s, e, t) {
  const i = De[s] ?? ie;
  return mt(i[e] ?? ie[e], t);
}
const gt = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, ft = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function vt(s) {
  const e = {}, t = /* @__PURE__ */ new Map(), i = [];
  for (const o of Object.values(s.states)) {
    const n = w(o.attributes.maestro_role);
    if (!n) continue;
    i.push(o.entity_id);
    const d = w(o.attributes.zone_id);
    if (d) {
      let a = t.get(d);
      if (a || (a = {
        zoneId: d,
        name: d,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(d, a)), n === "cycle_enabled")
        a.cycleSwitches.push(o);
      else {
        const p = ft[n];
        p && (a[p] = o);
      }
    } else {
      const a = gt[n];
      a && (e[a] = o);
    }
  }
  const r = [...t.values()];
  for (const o of r) {
    const n = o.state?.attributes ?? {};
    o.name = w(n.zone_name) ?? w(o.state?.attributes.friendly_name) ?? o.zoneId, o.order = v(n.order) ?? v(o.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return r.sort(
    (o, n) => o.order - n.order || o.name.localeCompare(n.name)
  ), { found: i.length > 0, hub: e, zones: r, entityIds: i };
}
function yt(s) {
  const e = ht(s.state?.attributes?.cycles), t = [];
  for (const i of e) {
    if (typeof i != "object" || i === null) continue;
    const r = i, o = {
      cycle_id: w(r.cycle_id),
      name: w(r.name),
      enabled: typeof r.enabled == "boolean" ? r.enabled : void 0,
      trigger: r.trigger ?? void 0,
      curve: r.curve ?? void 0
    }, n = r.days;
    Array.isArray(n) && (o.days = n.map((a) => v(a)).filter((a) => a !== void 0));
    const d = r.day_minutes;
    if (d && typeof d == "object") {
      const a = {};
      for (const [p, _] of Object.entries(d)) {
        const u = v(_);
        u !== void 0 && (a[p] = u);
      }
      o.day_minutes = a;
    }
    o.amount = v(r.amount), o.heat = v(r.heat), t.push(o);
  }
  return t;
}
function bt(s) {
  const e = Math.abs(Math.round(s)), t = Math.floor(e / 3600), i = Math.round(e % 3600 / 60), r = [];
  return t > 0 && r.push(`${t} h`), i > 0 && r.push(`${i} min`), r.length === 0 && r.push(`${e} s`), r.join(" ");
}
function $t(s, e) {
  if (!s || typeof s != "object") return "";
  if (s.kind === "sun" && (s.event === "sunrise" || s.event === "sunset")) {
    const i = l(
      e,
      s.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), r = v(s.offset_s) ?? 0;
    if (r === 0) return i;
    const o = r < 0 ? "−" : "+";
    return `${i} ${o} ${bt(r)}`;
  }
  const t = w(s.at) ?? w(s.time);
  return t ? l(e, "trigger.at", { time: t }) : w(s.kind) ?? "";
}
const Re = 12, Fe = 25, xt = 35, wt = (Fe - Re) / 10;
function Le(s) {
  const e = Math.floor(s), t = s - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function zt(s, e) {
  const t = Math.max(0, Le(s - wt * e));
  return [
    [Re, t],
    [Fe, s],
    [xt, s + e]
  ];
}
function At(s, e, t, i) {
  const r = s[0], o = s[s.length - 1];
  let n;
  if (!r || !o)
    n = 0;
  else if (e <= r[0])
    n = r[1];
  else if (e >= o[0])
    n = o[1];
  else {
    n = o[1];
    for (let d = 0; d < s.length - 1; d++) {
      const a = s[d], p = s[d + 1];
      if (!a || !p) continue;
      const [_, u] = a, [f, $] = p;
      if (_ <= e && e <= f) {
        n = u + ($ - u) * (e - _) / (f - _);
        break;
      }
    }
  }
  return t !== void 0 && (n = Math.max(n, t)), i !== void 0 && (n = Math.min(n, i)), n;
}
const V = [0, 1, 2, 3, 4, 5, 6], Ae = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
};
function le(s) {
  return Ae[s] ?? Ae.en;
}
function St(s) {
  return !s || s.length === 0 || s.length >= 7;
}
function He(s, e) {
  const t = new Set(s);
  return t.has(e) ? t.delete(e) : t.add(e), [...t].sort((i, r) => i - r);
}
function kt(s) {
  return !s || Object.keys(s).length === 0;
}
function te(s, e) {
  return s.day_minutes?.[String(e)] ?? s.amount ?? 0;
}
function je(s, e, t, i, r) {
  return Le(At(zt(s, e), t, i, r));
}
var Et = Object.defineProperty, x = (s, e, t, i) => {
  for (var r = void 0, o = s.length - 1, n; o >= 0; o--)
    (n = s[o]) && (r = n(e, t, r) || r);
  return r && Et(e, t, r), r;
};
const Se = 15, ke = 1, Ee = 1440, Mt = -360, It = 360, Tt = 5, ce = class ce extends S {
  constructor() {
    super(...arguments), this.zoneId = "", this._days = [...V], this._startKind = "time", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._uniformMinutes = Se, this._dayMinutes = {}, this._sameForAll = !0;
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
    this._days = e.days && e.days.length > 0 ? [...e.days] : [...V];
    const t = e.trigger;
    t?.kind === "sun" ? (this._startKind = "sun", this._startEvent = t.event === "sunset" ? "sunset" : "sunrise", this._startOffsetMin = Math.round((v(t.offset_s) ?? 0) / 60)) : (this._startKind = "time", this._startEvent = "sunrise", this._startOffsetMin = 0), this._startAt = t?.at ?? t?.time ?? "06:00", this._uniformMinutes = v(e.amount) ?? Se, this._dayMinutes = e.day_minutes ? { ...e.day_minutes } : {}, this._sameForAll = kt(e.day_minutes);
  }
  render() {
    const e = this.cycle;
    if (!e) return c``;
    const t = J(this.hass), i = le(t);
    return c`
      <div class="section-label">${l(t, "program_editor.days")}</div>
      <div class="days">
        ${i.map(
      (r, o) => c`
            <div
              class="day ${this._days.includes(o) ? "on" : ""}"
              @click=${() => this._days = He(this._days, o)}
            >
              ${r}
            </div>
          `
    )}
      </div>

      <div class="section-label">${l(t, "program_editor.start")}</div>
      <div class="start-row">
        <span class="seg">
          <span
            class="${this._startKind === "time" ? "sel" : ""}"
            @click=${() => this._startKind = "time"}
            >${l(t, "program_editor.start_fixed")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
            @click=${() => this._setSun("sunrise")}
            >${l(t, "program_editor.start_sunrise")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
            @click=${() => this._setSun("sunset")}
            >${l(t, "program_editor.start_sunset")}</span
          >
        </span>
        ${this._startKind === "time" ? c`<input
              type="time"
              class="timebox"
              .value=${this._startAt}
              @input=${(r) => this._startAt = r.target.value}
            />` : this._stepper(this._startOffsetMin, (r) => this._startOffsetMin = r, {
      min: Mt,
      max: It,
      step: Tt,
      suffix: "min",
      signed: !0
    })}
      </div>

      <div class="section-label">${l(t, "program_editor.duration_per_day")}</div>
      ${this._renderDurations(t, i)}
      <div class="same-row" @click=${() => this._sameForAll = !this._sameForAll}>
        <span class="switch ${this._sameForAll ? "on" : ""}"></span>
        ${l(t, "program_editor.same_duration")}
      </div>

      ${this._renderWeatherLine(t, e)}
      ${this._days.length === 0 ? c`<div class="hint">${l(t, "panel.pick_a_day")}</div>` : h}

      <div class="buttons">
        <button class="primary" ?disabled=${this._days.length === 0} @click=${this._save}>
          ${l(t, "editor.save")}
        </button>
        <button @click=${this._cancel}>${l(t, "editor.cancel")}</button>
      </div>
    `;
  }
  _setSun(e) {
    this._startKind = "sun", this._startEvent = e;
  }
  _renderDurations(e, t) {
    const i = l(e, "curve.unit_duration");
    return this._sameForAll ? c`<div class="duration-row">
        ${this._stepper(this._uniformMinutes, (r) => this._uniformMinutes = r, {
      min: ke,
      max: Ee,
      step: 1,
      suffix: i
    })}
      </div>` : c`${this._days.map((r) => {
      const o = te({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, r);
      return c`<div class="duration-row">
        <span class="dname">${t[r] ?? ""}</span>
        ${this._stepper(
        o,
        (n) => this._dayMinutes = { ...this._dayMinutes, [String(r)]: n },
        { min: ke, max: Ee, step: 1, suffix: i }
      )}
      </div>`;
    })}`;
  }
  _stepper(e, t, i) {
    const r = i.signed && e > 0 ? "+" : "";
    return c`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(K(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${r}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(K(e + i.step, i.min, i.max))}
        >
          +
        </button>
      </span>
    `;
  }
  _renderWeatherLine(e, t) {
    const i = this.weightedTemp;
    if (i === void 0 || Number.isNaN(i)) return h;
    const r = ((/* @__PURE__ */ new Date()).getDay() + 6) % 7, o = te(t, r), n = v(t.heat) ?? 8, d = je(
      o,
      n,
      i,
      v(t.curve?.min),
      v(t.curve?.max)
    ), a = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    });
    return c`<div class="weather">
      ${l(e, "panel.weather_line", { day: a, min: d })}
    </div>`;
  }
  _buildDayMinutes() {
    const e = {};
    for (const t of this._days)
      e[String(t)] = te(
        { amount: this._uniformMinutes, day_minutes: this._dayMinutes },
        t
      );
    return e;
  }
  _save() {
    if (this._days.length === 0) return;
    const e = this.zoneId, t = this.cycle?.cycle_id ?? "", i = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin }, r = [...this._days].sort((d, a) => d - a), o = r.length >= 7 ? [] : r;
    this.dispatchEvent(
      new CustomEvent("imc-program-save-schedule", {
        detail: { zoneId: e, programId: t, days: o, start: i },
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
ce.styles = Z`
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
let g = ce;
x([
  b({ attribute: !1 })
], g.prototype, "hass");
x([
  b()
], g.prototype, "zoneId");
x([
  b({ attribute: !1 })
], g.prototype, "cycle");
x([
  b({ attribute: !1 })
], g.prototype, "weightedTemp");
x([
  m()
], g.prototype, "_days");
x([
  m()
], g.prototype, "_startKind");
x([
  m()
], g.prototype, "_startAt");
x([
  m()
], g.prototype, "_startEvent");
x([
  m()
], g.prototype, "_startOffsetMin");
x([
  m()
], g.prototype, "_uniformMinutes");
x([
  m()
], g.prototype, "_dayMinutes");
x([
  m()
], g.prototype, "_sameForAll");
X("imc-program-editor", g);
var Ct = Object.defineProperty, z = (s, e, t, i) => {
  for (var r = void 0, o = s.length - 1, n; o >= 0; o--)
    (n = s[o]) && (r = n(e, t, r) || r);
  return r && Ct(e, t, r), r;
};
const Nt = 15, Ot = 8, Pt = 1, Ut = 60, Dt = 1, Rt = 1440, Ft = -360, Lt = 360, Ht = 5, Me = [0, 2, 4], Ie = [5, 6];
function Te(s, e) {
  return s.length !== e.length ? !1 : [...s].sort((i, r) => i - r).every((i, r) => i === e[r]);
}
const ue = class ue extends S {
  constructor() {
    super(...arguments), this.zoneId = "", this._step = 1, this._days = [...V], this._startKind = "sun", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._minutes = Nt;
  }
  render() {
    const e = J(this.hass);
    return c`
      <div class="head">
        <span class="title">${this._stepTitle(e)}</span>
        <button class="close" @click=${this._cancel} aria-label=${l(e, "editor.cancel")}>
          ✕
        </button>
      </div>
      <div class="dots">
        ${[1, 2, 3].map(
      (t) => c`<span class="dot ${this._step === t ? "on" : ""}"></span>`
    )}
      </div>
      ${this._step === 1 ? this._renderStep1(e) : h}
      ${this._step === 2 ? this._renderStep2(e) : h}
      ${this._step === 3 ? this._renderStep3(e) : h}
      <div class="buttons">
        ${this._step > 1 ? c`<button @click=${this._back}>${l(e, "wizard.back")}</button>` : c`<button @click=${this._cancel}>${l(e, "editor.cancel")}</button>`}
        ${this._step < 3 ? c`<button
              class="primary"
              ?disabled=${this._days.length === 0}
              @click=${this._next}
            >
              ${l(e, "wizard.next")}
            </button>` : c`<button
              class="primary"
              ?disabled=${this._days.length === 0}
              @click=${this._finish}
            >
              ${l(e, "wizard.finish")}
            </button>`}
      </div>
    `;
  }
  _stepTitle(e) {
    return this._step === 1 ? l(e, "wizard.step1_title") : this._step === 2 ? l(e, "wizard.step2_title") : l(e, "wizard.step3_title");
  }
  _renderStep1(e) {
    const t = le(e);
    return c`
      <div class="days">
        ${t.map(
      (i, r) => c`
            <div
              class="day ${this._days.includes(r) ? "on" : ""}"
              @click=${() => this._days = He(this._days, r)}
            >
              ${i}
            </div>
          `
    )}
      </div>
      <div class="presets">
        <span
          class="preset ${this._days.length === 7 ? "sel" : ""}"
          @click=${() => this._days = [...V]}
        >
          ${l(e, "wizard.preset_every_day")}
        </span>
        <span
          class="preset ${Te(this._days, Me) ? "sel" : ""}"
          @click=${() => this._days = [...Me]}
        >
          ${l(e, "wizard.preset_alternate")}
        </span>
        <span
          class="preset ${Te(this._days, Ie) ? "sel" : ""}"
          @click=${() => this._days = [...Ie]}
        >
          ${l(e, "wizard.preset_weekend")}
        </span>
      </div>
      ${this._days.length === 0 ? c`<div class="hint">${l(e, "panel.pick_a_day")}</div>` : h}
    `;
  }
  _renderStep2(e) {
    return c`
      <div class="seg">
        <span
          class="${this._startKind === "time" ? "sel" : ""}"
          @click=${() => this._startKind = "time"}
        >
          ${l(e, "program_editor.start_fixed")}
        </span>
        <span
          class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
          @click=${() => this._setSun("sunrise")}
        >
          ${l(e, "program_editor.start_sunrise")}
        </span>
        <span
          class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
          @click=${() => this._setSun("sunset")}
        >
          ${l(e, "program_editor.start_sunset")}
        </span>
      </div>
      ${this._startKind === "time" ? c`<input
            type="time"
            class="timebox"
            .value=${this._startAt}
            @input=${(t) => this._startAt = t.target.value}
          />` : c`<div class="offset-row">
            ${this._stepper(this._startOffsetMin, (t) => this._startOffsetMin = t, {
      min: Ft,
      max: Lt,
      step: Ht,
      suffix: "min",
      signed: !0
    })}
          </div>`}
    `;
  }
  _renderStep3(e) {
    const t = l(e, "curve.unit_duration");
    return c`
      <div class="stepper-row">
        ${this._stepper(this._minutes, (i) => this._minutes = i, {
      min: Dt,
      max: Rt,
      step: 1,
      suffix: t
    })}
      </div>
      ${this._renderPreview(e)}
    `;
  }
  _renderPreview(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return h;
    const i = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    }), r = je(
      this._minutes,
      Ot,
      t,
      Pt,
      Ut
    );
    return c`<div class="done">
      ${l(e, "wizard.done_prefix")}
      ${l(e, "panel.weather_line", { day: i, min: r })}
    </div>`;
  }
  _stepper(e, t, i) {
    const r = i.signed && e > 0 ? "+" : "";
    return c`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(K(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${r}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(K(e + i.step, i.min, i.max))}
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
    this._days.length !== 0 && this._step < 3 && (this._step = this._step + 1);
  }
  _finish() {
    if (this._days.length === 0) return;
    const e = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin }, t = [...this._days].sort((r, o) => r - o), i = t.length >= 7 ? [] : t;
    this.dispatchEvent(
      new CustomEvent("imc-wizard-finish", {
        detail: { zoneId: this.zoneId, days: i, start: e, minutes: this._minutes },
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
ue.styles = Z`
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
let y = ue;
z([
  b({ attribute: !1 })
], y.prototype, "hass");
z([
  b()
], y.prototype, "zoneId");
z([
  b({ attribute: !1 })
], y.prototype, "weightedTemp");
z([
  m()
], y.prototype, "_step");
z([
  m()
], y.prototype, "_days");
z([
  m()
], y.prototype, "_startKind");
z([
  m()
], y.prototype, "_startAt");
z([
  m()
], y.prototype, "_startEvent");
z([
  m()
], y.prototype, "_startOffsetMin");
z([
  m()
], y.prototype, "_minutes");
X("imc-program-wizard", y);
var jt = Object.defineProperty, H = (s, e, t, i) => {
  for (var r = void 0, o = s.length - 1, n; o >= 0; o--)
    (n = s[o]) && (r = n(e, t, r) || r);
  return r && jt(e, t, r), r;
};
const pe = class pe extends S {
  constructor() {
    super(...arguments), this._wizardOpen = !1;
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
    if (!e || !t) return c``;
    const i = J(e), r = yt(t);
    return c`
      ${r.length === 0 ? c`<div class="meta">${l(i, "panel.no_programs")}</div>` : this._renderCycles(i, e, t, r)}
      ${this._renderAddProgram(i, e, t)}
    `;
  }
  _renderAddProgram(e, t, i) {
    return c`
      <div class="add-row">
        ${this._wizardOpen ? c`<imc-program-wizard
              .hass=${t}
              .zoneId=${i.zoneId}
              .weightedTemp=${this.weightedTemp}
              @imc-wizard-finish=${() => this._wizardOpen = !1}
              @imc-wizard-cancel=${() => this._wizardOpen = !1}
            ></imc-program-wizard>` : c`<button class="add-btn" @click=${() => this._wizardOpen = !0}>
              ＋ ${l(e, "panel.add_program")}
            </button>`}
      </div>
    `;
  }
  _renderCycles(e, t, i, r) {
    const o = le(e);
    return c`${r.map((n) => {
      const d = n.days ?? [], a = St(n.days), p = !!n.cycle_id && this._editingId === n.cycle_id, _ = n.cycle_id ? this._findCycleSwitch(i, n.cycle_id) : void 0, u = _?.state === "on";
      return c`
        <div class="prog">
          <div class="name">${n.name ?? n.cycle_id}</div>
          <div class="days">
            ${o.map(
        (f, $) => c`
                <div class="day ${a || d.includes($) ? "on" : ""}">
                  ${f}
                </div>
              `
      )}
          </div>
          <div class="meta">
            ${$t(n.trigger, e)} · ${this._minutesSummary(e, n)}
          </div>
          ${_ ? c`<div
                class="toggle-row"
                @click=${() => this._onToggle(i.zoneId, n, _)}
              >
                <span class="switch ${u ? "on" : ""}"></span>
                <span
                  >${l(
        e,
        u ? "zone.cycle_enabled" : "zone.cycle_disabled"
      )}</span
                >
              </div>` : h}
          ${n.cycle_id ? c`<div class="actions">
                <button
                  class="link-btn"
                  @click=${() => this._editingId = p ? void 0 : n.cycle_id}
                >
                  ${l(e, "panel.edit_program")}
                </button>
                <button class="link-btn" @click=${() => this._onRename(e, i.zoneId, n)}>
                  ${l(e, "panel.rename_program")}
                </button>
                <button
                  class="link-btn danger"
                  @click=${() => this._onDelete(e, i.zoneId, n)}
                >
                  ${l(e, "panel.delete_program")}
                </button>
              </div>` : h}
          ${p ? c`<imc-program-editor
                .hass=${t}
                .zoneId=${i.zoneId}
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
    return e.cycleSwitches.find((i) => w(i.attributes.cycle_id) === t);
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
    const r = i.name ?? "", o = window.prompt(l(e, "panel.rename_program"), r);
    if (o === null) return;
    const n = o.trim();
    !n || n === r || this._dispatch("imc-program-rename", {
      zoneId: t,
      programId: i.cycle_id,
      name: n
    });
  }
  _onDelete(e, t, i) {
    if (!i.cycle_id) return;
    const r = i.name ?? i.cycle_id;
    window.confirm(l(e, "panel.confirm_delete_program", { name: r })) && this._dispatch("imc-program-remove", { zoneId: t, programId: i.cycle_id });
  }
  _minutesSummary(e, t) {
    return t.day_minutes && Object.keys(t.day_minutes).length > 0 ? l(e, "panel.per_day_minutes") : l(e, "panel.minutes_value", { min: t.amount ?? "?" });
  }
};
pe.styles = Z`
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
let k = pe;
H([
  b({ attribute: !1 })
], k.prototype, "hass");
H([
  b({ attribute: !1 })
], k.prototype, "zone");
H([
  b({ attribute: !1 })
], k.prototype, "weightedTemp");
H([
  m()
], k.prototype, "_editingId");
H([
  m()
], k.prototype, "_wizardOpen");
X("imc-program-list", k);
var qt = Object.defineProperty, Y = (s, e, t, i) => {
  for (var r = void 0, o = s.length - 1, n; o >= 0; o--)
    (n = s[o]) && (r = n(e, t, r) || r);
  return r && qt(e, t, r), r;
};
const he = class he extends S {
  constructor() {
    super(...arguments), this.narrow = !1, this._relevantIds = [], this._statesCount = 0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._errorTimer !== void 0 && (window.clearTimeout(this._errorTimer), this._errorTimer = void 0);
  }
  /* ------------------------------------------------------------ */
  /* Actions → services                                            */
  /* ------------------------------------------------------------ */
  async _call(e, t, i, r = !1) {
    if (this.hass)
      try {
        return await this.hass.callService(e, t, i, void 0, !0, r);
      } catch (o) {
        const n = o instanceof Error ? o.message : String(o);
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
    const t = e.detail, r = (await this._call(
      "irrigation_maestro",
      "add_program",
      { zone_id: t.zoneId, ...t.name ? { name: t.name } : {} },
      /* returnResponse */
      !0
    ))?.response?.program_id;
    typeof r != "string" || !r || (await this._call("irrigation_maestro", "set_program_schedule", {
      zone_id: t.zoneId,
      program_id: r,
      days: t.days,
      start_kind: t.start.kind,
      ...t.start.kind === "time" ? { start_time: t.start.at } : { start_event: t.start.event, start_offset_min: t.start.offset_min ?? 0 }
    }), await this._call("irrigation_maestro", "set_program_minutes", {
      zone_id: t.zoneId,
      program_id: r,
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
  render() {
    const e = this.hass;
    if (!e) return c``;
    const t = J(e), i = vt(e);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(e.states).length, !i.found || i.zones.length === 0)
      return c`
        <div class="wrap">
          <header><h1>${l(t, "panel.title")}</h1></header>
          <div class="empty">${l(t, "panel.no_zones")}</div>
        </div>
      `;
    const r = this._resolveSelected(i.zones), o = v(i.hub.weightedTemp?.state);
    return c`
      <div
        class="wrap"
        @imc-program-save-schedule=${this._onSaveSchedule}
        @imc-program-save-minutes=${this._onSaveMinutes}
        @imc-program-cancel=${() => {
    }}
        @imc-program-toggle=${this._onProgramToggle}
        @imc-program-rename=${this._onProgramRename}
        @imc-program-remove=${this._onProgramRemove}
        @imc-wizard-finish=${this._onWizardFinish}
        @imc-wizard-cancel=${() => {
    }}
      >
        <header><h1>${l(t, "panel.title")}</h1></header>
        ${this._error ? c`<div class="error">${this._error}</div>` : h}
        <div class="tabs">
          ${i.zones.map(
      (n) => c`
              <div
                class="tab ${n.zoneId === r.zoneId ? "sel" : ""}"
                @click=${() => this._selectedZoneId = n.zoneId}
              >
                ${n.name}
              </div>
            `
    )}
        </div>
        <imc-program-list
          .hass=${e}
          .zone=${r}
          .weightedTemp=${o}
        ></imc-program-list>
      </div>
    `;
  }
  _resolveSelected(e) {
    return e.find((t) => t.zoneId === this._selectedZoneId) ?? e[0];
  }
};
he.styles = Z`
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
let T = he;
Y([
  b({ attribute: !1 })
], T.prototype, "hass");
Y([
  b({ type: Boolean })
], T.prototype, "narrow");
Y([
  m()
], T.prototype, "_selectedZoneId");
Y([
  m()
], T.prototype, "_error");
X("irrigation-maestro-panel", T);
