/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const qe = globalThis, at = qe.ShadowRoot && (qe.ShadyCSS === void 0 || qe.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, ot = /* @__PURE__ */ Symbol(), Mt = /* @__PURE__ */ new WeakMap();
let Jt = class {
  constructor(e, t, a) {
    if (this._$cssResult$ = !0, a !== ot) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (at && e === void 0) {
      const a = t !== void 0 && t.length === 1;
      a && (e = Mt.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), a && Mt.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const $i = (o) => new Jt(typeof o == "string" ? o : o + "", void 0, ot), w = (o, ...e) => {
  const t = o.length === 1 ? o[0] : e.reduce((a, i, n) => a + ((s) => {
    if (s._$cssResult$ === !0) return s.cssText;
    if (typeof s == "number") return s;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + s + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(i) + o[n + 1], o[0]);
  return new Jt(t, o, ot);
}, zi = (o, e) => {
  if (at) o.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const a = document.createElement("style"), i = qe.litNonce;
    i !== void 0 && a.setAttribute("nonce", i), a.textContent = t.cssText, o.appendChild(a);
  }
}, Dt = at ? (o) => o : (o) => o instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const a of e.cssRules) t += a.cssText;
  return $i(t);
})(o) : o;
const { is: ki, defineProperty: Si, getOwnPropertyDescriptor: Ai, getOwnPropertyNames: Ci, getOwnPropertySymbols: Ti, getPrototypeOf: Pi } = Object, He = globalThis, It = He.trustedTypes, Ei = It ? It.emptyScript : "", Ni = He.reactiveElementPolyfillSupport, be = (o, e) => o, Oe = { toAttribute(o, e) {
  switch (e) {
    case Boolean:
      o = o ? Ei : null;
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
} }, nt = (o, e) => !ki(o, e), qt = { attribute: !0, type: String, converter: Oe, reflect: !1, useDefault: !1, hasChanged: nt };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), He.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let pe = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = qt) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const a = /* @__PURE__ */ Symbol(), i = this.getPropertyDescriptor(e, a, t);
      i !== void 0 && Si(this.prototype, e, i);
    }
  }
  static getPropertyDescriptor(e, t, a) {
    const { get: i, set: n } = Ai(this.prototype, e) ?? { get() {
      return this[t];
    }, set(s) {
      this[t] = s;
    } };
    return { get: i, set(s) {
      const d = i?.call(this);
      n?.call(this, s), this.requestUpdate(e, d, a);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? qt;
  }
  static _$Ei() {
    if (this.hasOwnProperty(be("elementProperties"))) return;
    const e = Pi(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(be("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(be("properties"))) {
      const t = this.properties, a = [...Ci(t), ...Ti(t)];
      for (const i of a) this.createProperty(i, t[i]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [a, i] of t) this.elementProperties.set(a, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, a] of this.elementProperties) {
      const i = this._$Eu(t, a);
      i !== void 0 && this._$Eh.set(i, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const a = new Set(e.flat(1 / 0).reverse());
      for (const i of a) t.unshift(Dt(i));
    } else e !== void 0 && t.push(Dt(e));
    return t;
  }
  static _$Eu(e, t) {
    const a = t.attribute;
    return a === !1 ? void 0 : typeof a == "string" ? a : typeof e == "string" ? e.toLowerCase() : void 0;
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
    for (const a of t.keys()) this.hasOwnProperty(a) && (e.set(a, this[a]), delete this[a]);
    e.size > 0 && (this._$Ep = e);
  }
  createRenderRoot() {
    const e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return zi(e, this.constructor.elementStyles), e;
  }
  connectedCallback() {
    this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
  }
  enableUpdating(e) {
  }
  disconnectedCallback() {
    this._$EO?.forEach((e) => e.hostDisconnected?.());
  }
  attributeChangedCallback(e, t, a) {
    this._$AK(e, a);
  }
  _$ET(e, t) {
    const a = this.constructor.elementProperties.get(e), i = this.constructor._$Eu(e, a);
    if (i !== void 0 && a.reflect === !0) {
      const n = (a.converter?.toAttribute !== void 0 ? a.converter : Oe).toAttribute(t, a.type);
      this._$Em = e, n == null ? this.removeAttribute(i) : this.setAttribute(i, n), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const a = this.constructor, i = a._$Eh.get(e);
    if (i !== void 0 && this._$Em !== i) {
      const n = a.getPropertyOptions(i), s = typeof n.converter == "function" ? { fromAttribute: n.converter } : n.converter?.fromAttribute !== void 0 ? n.converter : Oe;
      this._$Em = i;
      const d = s.fromAttribute(t, n.type);
      this[i] = d ?? this._$Ej?.get(i) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, t, a, i = !1, n) {
    if (e !== void 0) {
      const s = this.constructor;
      if (i === !1 && (n = this[e]), a ??= s.getPropertyOptions(e), !((a.hasChanged ?? nt)(n, t) || a.useDefault && a.reflect && n === this._$Ej?.get(e) && !this.hasAttribute(s._$Eu(e, a)))) return;
      this.C(e, t, a);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: a, reflect: i, wrapped: n }, s) {
    a && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, s ?? t ?? this[e]), n !== !0 || s !== void 0) || (this._$AL.has(e) || (this.hasUpdated || a || (t = void 0), this._$AL.set(e, t)), i === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [i, n] of this._$Ep) this[i] = n;
        this._$Ep = void 0;
      }
      const a = this.constructor.elementProperties;
      if (a.size > 0) for (const [i, n] of a) {
        const { wrapped: s } = n, d = this[i];
        s !== !0 || this._$AL.has(i) || d === void 0 || this.C(i, void 0, n, d);
      }
    }
    let e = !1;
    const t = this._$AL;
    try {
      e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((a) => a.hostUpdate?.()), this.update(t)) : this._$EM();
    } catch (a) {
      throw e = !1, this._$EM(), a;
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
pe.elementStyles = [], pe.shadowRootOptions = { mode: "open" }, pe[be("elementProperties")] = /* @__PURE__ */ new Map(), pe[be("finalized")] = /* @__PURE__ */ new Map(), Ni?.({ ReactiveElement: pe }), (He.reactiveElementVersions ??= []).push("2.1.2");
const st = globalThis, Ot = (o) => o, Re = st.trustedTypes, Rt = Re ? Re.createPolicy("lit-html", { createHTML: (o) => o }) : void 0, ei = "$lit$", F = `lit$${Math.random().toFixed(9).slice(2)}$`, ti = "?" + F, Mi = `<${ti}>`, ie = document, xe = () => ie.createComment(""), we = (o) => o === null || typeof o != "object" && typeof o != "function", rt = Array.isArray, Di = (o) => rt(o) || typeof o?.[Symbol.iterator] == "function", Qe = `[ 	
\f\r]`, ve = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Lt = /-->/g, jt = />/g, Q = RegExp(`>|${Qe}(?:([^\\s"'>=/]+)(${Qe}*=${Qe}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Ft = /'/g, Ut = /"/g, ii = /^(?:script|style|textarea|title)$/i, ai = (o) => (e, ...t) => ({ _$litType$: o, strings: e, values: t }), l = ai(1), q = ai(2), he = /* @__PURE__ */ Symbol.for("lit-noChange"), u = /* @__PURE__ */ Symbol.for("lit-nothing"), Ht = /* @__PURE__ */ new WeakMap(), te = ie.createTreeWalker(ie, 129);
function oi(o, e) {
  if (!rt(o) || !o.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Rt !== void 0 ? Rt.createHTML(e) : e;
}
const Ii = (o, e) => {
  const t = o.length - 1, a = [];
  let i, n = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", s = ve;
  for (let d = 0; d < t; d++) {
    const c = o[d];
    let p, _, g = -1, v = 0;
    for (; v < c.length && (s.lastIndex = v, _ = s.exec(c), _ !== null); ) v = s.lastIndex, s === ve ? _[1] === "!--" ? s = Lt : _[1] !== void 0 ? s = jt : _[2] !== void 0 ? (ii.test(_[2]) && (i = RegExp("</" + _[2], "g")), s = Q) : _[3] !== void 0 && (s = Q) : s === Q ? _[0] === ">" ? (s = i ?? ve, g = -1) : _[1] === void 0 ? g = -2 : (g = s.lastIndex - _[2].length, p = _[1], s = _[3] === void 0 ? Q : _[3] === '"' ? Ut : Ft) : s === Ut || s === Ft ? s = Q : s === Lt || s === jt ? s = ve : (s = Q, i = void 0);
    const y = s === Q && o[d + 1].startsWith("/>") ? " " : "";
    n += s === ve ? c + Mi : g >= 0 ? (a.push(p), c.slice(0, g) + ei + c.slice(g) + F + y) : c + F + (g === -2 ? d : y);
  }
  return [oi(o, n + (o[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), a];
};
class $e {
  constructor({ strings: e, _$litType$: t }, a) {
    let i;
    this.parts = [];
    let n = 0, s = 0;
    const d = e.length - 1, c = this.parts, [p, _] = Ii(e, t);
    if (this.el = $e.createElement(p, a), te.currentNode = this.el.content, t === 2 || t === 3) {
      const g = this.el.content.firstChild;
      g.replaceWith(...g.childNodes);
    }
    for (; (i = te.nextNode()) !== null && c.length < d; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const g of i.getAttributeNames()) if (g.endsWith(ei)) {
          const v = _[s++], y = i.getAttribute(g).split(F), A = /([.?@])?(.*)/.exec(v);
          c.push({ type: 1, index: n, name: A[2], strings: y, ctor: A[1] === "." ? Oi : A[1] === "?" ? Ri : A[1] === "@" ? Li : Be }), i.removeAttribute(g);
        } else g.startsWith(F) && (c.push({ type: 6, index: n }), i.removeAttribute(g));
        if (ii.test(i.tagName)) {
          const g = i.textContent.split(F), v = g.length - 1;
          if (v > 0) {
            i.textContent = Re ? Re.emptyScript : "";
            for (let y = 0; y < v; y++) i.append(g[y], xe()), te.nextNode(), c.push({ type: 2, index: ++n });
            i.append(g[v], xe());
          }
        }
      } else if (i.nodeType === 8) if (i.data === ti) c.push({ type: 2, index: n });
      else {
        let g = -1;
        for (; (g = i.data.indexOf(F, g + 1)) !== -1; ) c.push({ type: 7, index: n }), g += F.length - 1;
      }
      n++;
    }
  }
  static createElement(e, t) {
    const a = ie.createElement("template");
    return a.innerHTML = e, a;
  }
}
function _e(o, e, t = o, a) {
  if (e === he) return e;
  let i = a !== void 0 ? t._$Co?.[a] : t._$Cl;
  const n = we(e) ? void 0 : e._$litDirective$;
  return i?.constructor !== n && (i?._$AO?.(!1), n === void 0 ? i = void 0 : (i = new n(o), i._$AT(o, t, a)), a !== void 0 ? (t._$Co ??= [])[a] = i : t._$Cl = i), i !== void 0 && (e = _e(o, i._$AS(o, e.values), i, a)), e;
}
class qi {
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
    const { el: { content: t }, parts: a } = this._$AD, i = (e?.creationScope ?? ie).importNode(t, !0);
    te.currentNode = i;
    let n = te.nextNode(), s = 0, d = 0, c = a[0];
    for (; c !== void 0; ) {
      if (s === c.index) {
        let p;
        c.type === 2 ? p = new Ce(n, n.nextSibling, this, e) : c.type === 1 ? p = new c.ctor(n, c.name, c.strings, this, e) : c.type === 6 && (p = new ji(n, this, e)), this._$AV.push(p), c = a[++d];
      }
      s !== c?.index && (n = te.nextNode(), s++);
    }
    return te.currentNode = ie, i;
  }
  p(e) {
    let t = 0;
    for (const a of this._$AV) a !== void 0 && (a.strings !== void 0 ? (a._$AI(e, a, t), t += a.strings.length - 2) : a._$AI(e[t])), t++;
  }
}
class Ce {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, a, i) {
    this.type = 2, this._$AH = u, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = a, this.options = i, this._$Cv = i?.isConnected ?? !0;
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
    e = _e(this, e, t), we(e) ? e === u || e == null || e === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : e !== this._$AH && e !== he && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Di(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== u && we(this._$AH) ? this._$AA.nextSibling.data = e : this.T(ie.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: a } = e, i = typeof a == "number" ? this._$AC(e) : (a.el === void 0 && (a.el = $e.createElement(oi(a.h, a.h[0]), this.options)), a);
    if (this._$AH?._$AD === i) this._$AH.p(t);
    else {
      const n = new qi(i, this), s = n.u(this.options);
      n.p(t), this.T(s), this._$AH = n;
    }
  }
  _$AC(e) {
    let t = Ht.get(e.strings);
    return t === void 0 && Ht.set(e.strings, t = new $e(e)), t;
  }
  k(e) {
    rt(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let a, i = 0;
    for (const n of e) i === t.length ? t.push(a = new Ce(this.O(xe()), this.O(xe()), this, this.options)) : a = t[i], a._$AI(n), i++;
    i < t.length && (this._$AR(a && a._$AB.nextSibling, i), t.length = i);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const a = Ot(e).nextSibling;
      Ot(e).remove(), e = a;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class Be {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, a, i, n) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = e, this.name = t, this._$AM = i, this.options = n, a.length > 2 || a[0] !== "" || a[1] !== "" ? (this._$AH = Array(a.length - 1).fill(new String()), this.strings = a) : this._$AH = u;
  }
  _$AI(e, t = this, a, i) {
    const n = this.strings;
    let s = !1;
    if (n === void 0) e = _e(this, e, t, 0), s = !we(e) || e !== this._$AH && e !== he, s && (this._$AH = e);
    else {
      const d = e;
      let c, p;
      for (e = n[0], c = 0; c < n.length - 1; c++) p = _e(this, d[a + c], t, c), p === he && (p = this._$AH[c]), s ||= !we(p) || p !== this._$AH[c], p === u ? e = u : e !== u && (e += (p ?? "") + n[c + 1]), this._$AH[c] = p;
    }
    s && !i && this.j(e);
  }
  j(e) {
    e === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Oi extends Be {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === u ? void 0 : e;
  }
}
class Ri extends Be {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== u);
  }
}
class Li extends Be {
  constructor(e, t, a, i, n) {
    super(e, t, a, i, n), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = _e(this, e, t, 0) ?? u) === he) return;
    const a = this._$AH, i = e === u && a !== u || e.capture !== a.capture || e.once !== a.once || e.passive !== a.passive, n = e !== u && (a === u || i);
    i && this.element.removeEventListener(this.name, this, a), n && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class ji {
  constructor(e, t, a) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = a;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    _e(this, e);
  }
}
const Fi = st.litHtmlPolyfillSupport;
Fi?.($e, Ce), (st.litHtmlVersions ??= []).push("3.3.3");
const Ui = (o, e, t) => {
  const a = t?.renderBefore ?? e;
  let i = a._$litPart$;
  if (i === void 0) {
    const n = t?.renderBefore ?? null;
    a._$litPart$ = i = new Ce(e.insertBefore(xe(), n), n, void 0, t ?? {});
  }
  return i._$AI(o), i;
};
const lt = globalThis;
class b extends pe {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ui(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return he;
  }
}
b._$litElement$ = !0, b.finalized = !0, lt.litElementHydrateSupport?.({ LitElement: b });
const Hi = lt.litElementPolyfillSupport;
Hi?.({ LitElement: b });
(lt.litElementVersions ??= []).push("4.2.2");
const Bi = { attribute: !0, type: String, converter: Oe, reflect: !1, hasChanged: nt }, Wi = (o = Bi, e, t) => {
  const { kind: a, metadata: i } = t;
  let n = globalThis.litPropertyMetadata.get(i);
  if (n === void 0 && globalThis.litPropertyMetadata.set(i, n = /* @__PURE__ */ new Map()), a === "setter" && ((o = Object.create(o)).wrapped = !0), n.set(t.name, o), a === "accessor") {
    const { name: s } = t;
    return { set(d) {
      const c = e.get.call(this);
      e.set.call(this, d), this.requestUpdate(s, c, o, !0, d);
    }, init(d) {
      return d !== void 0 && this.C(s, void 0, o, d), d;
    } };
  }
  if (a === "setter") {
    const { name: s } = t;
    return function(d) {
      const c = this[s];
      e.call(this, d), this.requestUpdate(s, c, o, !0, d);
    };
  }
  throw Error("Unsupported decorator location: " + a);
};
function h(o) {
  return (e, t) => typeof t == "object" ? Wi(o, e, t) : ((a, i, n) => {
    const s = i.hasOwnProperty(n);
    return i.constructor.createProperty(n, a), s ? Object.getOwnPropertyDescriptor(i, n) : void 0;
  })(o, e, t);
}
function x(o) {
  return h({ ...o, state: !0, attribute: !1 });
}
const ni = [
  "state",
  "next_run",
  "last_outcome",
  "programs",
  "curve",
  "hardware",
  "consumption",
  "actions"
], Vi = [30, 90, 365];
function E(o, e) {
  return o.blocks?.[e] !== !1;
}
const si = ["session", "decision", "health", "actions"];
function ee(o, e) {
  return o.blocks?.[e] !== !1;
}
const Zi = {
  show_header: !0,
  show_queue: !0,
  show_controls: !0,
  compact: !1
};
function m(o) {
  if (typeof o == "number" && Number.isFinite(o)) return o;
  if (typeof o == "string" && o.trim() !== "") {
    const e = Number(o);
    if (Number.isFinite(e)) return e;
  }
}
function f(o) {
  return typeof o == "string" && o !== "" ? o : void 0;
}
function N(o) {
  return Array.isArray(o) ? o : [];
}
function T(o) {
  return !o || o.state === "unavailable" || o.state === "unknown";
}
function et(o, e, t) {
  return Math.min(t, Math.max(e, o));
}
function $(o, e) {
  customElements.get(o) || customElements.define(o, e);
}
const Gi = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_unattributed_water: "unattributedWater",
  hub_leak: "leak",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, Ki = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_water_total: "zone_water_total",
  zone_leak: "leak",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function U(o) {
  const e = {}, t = /* @__PURE__ */ new Map(), a = [];
  for (const n of Object.values(o.states)) {
    const s = f(n.attributes.maestro_role);
    if (!s) continue;
    a.push(n.entity_id);
    const d = f(n.attributes.zone_id);
    if (d) {
      let c = t.get(d);
      if (c || (c = {
        zoneId: d,
        name: d,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(d, c)), s === "cycle_enabled")
        c.cycleSwitches.push(n);
      else {
        const p = Ki[s];
        p && (c[p] = n);
      }
    } else {
      const c = Gi[s];
      c && (e[c] = n);
    }
  }
  const i = [...t.values()];
  for (const n of i) {
    const s = n.state?.attributes ?? {};
    n.name = f(s.zone_name) ?? f(n.state?.attributes.friendly_name) ?? n.zoneId, n.order = m(s.order) ?? m(n.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return i.sort(
    (n, s) => n.order - s.order || n.name.localeCompare(s.name)
  ), { found: a.length > 0, hub: e, zones: i, entityIds: a };
}
function Yi(o) {
  return T(o.state) ? !1 : !N(o.state?.attributes?.degraded).some((t) => f(t) === "no_flow_meter");
}
function ri(o) {
  const e = o.state?.attributes?.capabilities;
  return e && typeof e == "object" ? e : {};
}
function Qi(o) {
  const e = ri(o), t = [];
  f(e.water_accounting) === "estimated" && t.push({ key: "water_estimated", tone: "muted" });
  const a = f(e.leak_watch);
  a === "none" ? t.push({ key: "leak_unavailable", tone: "muted" }) : a === "system" && t.push({ key: "leak_system_scope", tone: "muted" }), f(e.leak_detection) === "candidate_available" && t.push({ key: "leak_candidate", tone: "hint" });
  const i = f(e.water_supply);
  return i === "unavailable" ? t.push({ key: "supply_unavailable", tone: "muted" }) : i === "candidate_available" && t.push({ key: "supply_candidate", tone: "hint" }), t;
}
const Xi = ["leak_never_observable", "leak_evidence_unresolved"];
function li(o) {
  return !o || o.state !== "on" ? null : {
    coverage: "alarm",
    confirmedAt: f(o.attributes.since),
    sources: N(o.attributes.sources).map((e) => f(e)).filter((e) => e !== void 0),
    describingSource: f(o.attributes.describing_source)
  };
}
function ci(o) {
  const e = li(o.leak);
  if (e) return e;
  if (o.leak?.state === "off") return { coverage: "quiet", sources: [] };
  const t = N(o.state?.attributes?.degraded).map((a) => f(a));
  return Xi.some((a) => t.includes(a)) ? { coverage: "unresolved", sources: [] } : f(ri(o).leak_watch) === "zone" ? { coverage: "establishing", sources: [] } : { coverage: "unknown", sources: [] };
}
function di(o) {
  const e = li(o.leak);
  return e || { coverage: o.leak?.state === "off" ? "quiet" : "unknown", sources: [] };
}
function ui(o) {
  const e = o.zone_water_total;
  if (!e) return null;
  const t = m(e.state);
  return t === void 0 ? null : {
    total: t,
    today: m(e.attributes.today_l) ?? 0,
    month: m(e.attributes.month_l) ?? 0,
    estimated: !!e.attributes.estimated
  };
}
function pi(o) {
  return m(o.state?.attributes?.adjustment_pct) ?? 100;
}
function Ji(o) {
  const e = N(o.state?.attributes?.cycles), t = [];
  for (const a of e) {
    if (typeof a != "object" || a === null) continue;
    const i = a, n = {
      cycle_id: f(i.cycle_id),
      name: f(i.name),
      enabled: typeof i.enabled == "boolean" ? i.enabled : void 0,
      trigger: i.trigger ?? void 0,
      curve: i.curve ?? void 0
    }, s = i.calendar;
    s && typeof s == "object" && (n.calendar = s);
    const d = i.season_months;
    Array.isArray(d) && (n.season_months = d.map((p) => m(p)).filter((p) => p !== void 0)), n.soak_max_run_min = m(i.soak_max_run_min), n.soak_pause_min = m(i.soak_pause_min), n.volume_safety_timeout_min = m(i.volume_safety_timeout_min), n.intensity_pct = m(i.intensity_pct);
    const c = i.day_intensity_pct;
    if (c && typeof c == "object") {
      const p = {};
      for (const [_, g] of Object.entries(c)) {
        const v = m(g);
        v !== void 0 && (p[_] = v);
      }
      n.day_intensity_pct = p;
    }
    t.push(n);
  }
  return t;
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
  "chart.aria": "Daily water use over {days} days, {liters} litres in total",
  // Next run: two facts, never merged. The instant is already resolved
  // against every projectable gate; the verdict beside it is about NOW and
  // must read that way -- "not evaluated yet" is not "will not water".
  "next_run.next": "Next",
  "next_run.today": "Today",
  "next_run.none": "no run scheduled",
  "next_run.would_run": "it would water",
  "next_run.blocked": "it would not water",
  "next_run.not_evaluated": "not evaluated yet",
  "next_run.age_now": "just evaluated",
  "next_run.age_minutes": "evaluated {n} min ago",
  "next_run.age_hours": "evaluated {n} h ago",
  "next_run.age_days": "evaluated {n} d ago",
  // Zone card blocks
  "programs.none": "No programs configured.",
  "programs.minutes": "{n} min today",
  "programs.enable": "Enable",
  "programs.disable": "Disable",
  "consumption.today": "Today",
  "consumption.month": "This month",
  "consumption.total": "Total",
  "consumption.estimated": "includes estimated litres",
  "hardware.adopt": "Use it",
  "hardware.battery": "Battery",
  "hardware.meter": "Flow meter",
  "hardware.unit_unknown": "unit not resolved, readings ignored",
  "hardware.unit_resolved": "reads {unit}, converted to L/min",
  "capability.water_accounting": "Water accounting",
  "capability.leak_watch": "Leak watched by",
  "capability.leak_detection": "Leak sensor",
  "capability.water_supply": "Water-supply sensor",
  "capability_state.measured": "measured",
  "capability_state.estimated": "estimated from the nominal rate",
  "capability_state.configured": "configured",
  "capability_state.candidate_available": "your valve offers one — not set up yet",
  "capability_state.unavailable": "not present",
  "capability_state.zone": "this zone",
  "capability_state.system": "the system (shared meter)",
  "capability_state.none": "nothing",
  // The zone card
  "zone_card.name": "Irrigation Maestro Zone",
  "zone_card.description": "One zone in detail: state, next run, programs, curve, hardware and consumption.",
  "zone_card.missing_zone": "This card is set to zone {id}, which no longer exists. Pick another in the card editor.",
  "zone_card.programs": "Programs",
  "zone_card.hardware": "Hardware and capabilities",
  "zone_card.consumption": "Consumption",
  "zone_card.remaining": "{n} min left",
  "zone_card_editor.zone": "Zone",
  "zone_card_editor.title": "Title",
  "zone_card_editor.title_placeholder": "Defaults to the zone name",
  "zone_card_editor.blocks": "Blocks to show",
  "zone_card_editor.chart_days": "History period",
  "zone_card_editor.days": "{n} days",
  "zone_card_editor.consumption_source": "Consumption figures",
  "zone_card_editor.source_internal": "From the integration",
  "zone_card_editor.source_entity": "From my own entities",
  "zone_card_editor.total_entity": "Total entity",
  "zone_card_editor.today_entity": "Today entity",
  "zone_card_editor.month_entity": "This-month entity",
  "zone_card_editor.battery_entity": "Battery entity",
  "zone_card_editor.battery_hint": "The integration does not know about batteries — map yours here.",
  "block.state": "State",
  "block.next_run": "Next run",
  "block.last_outcome": "Last outcome",
  "block.programs": "Programs",
  "block.curve": "Curve",
  "block.hardware": "Hardware",
  "block.consumption": "Consumption",
  "block.actions": "Actions",
  // Hub card
  "hub_card.name": "Irrigation Maestro Hub",
  "hub_card.description": "Session, decision panel and system health for the whole installation.",
  "hub_card.not_installed": "Irrigation Maestro is not installed yet.",
  "hub_card.session": "Session",
  "hub_card.decision": "Decision",
  "hub_card.health": "System health",
  "hub_card.not_evaluated": "not evaluated yet",
  "hub_card.will_water": "it would water",
  "hub_card.will_skip": "it would skip",
  "decision.weighted_temp": "Weighted temperature",
  "decision.rain": "Rain",
  "decision.forecast_credit": "Forecast credit",
  "decision.day_d3": "3 days ago",
  "decision.day_d2": "2 days ago",
  "decision.day_d1": "yesterday",
  "decision.day_today": "today",
  "decision.day_tomorrow": "tomorrow",
  "decision.missing_day": "no reading — its weight was redistributed",
  "decision.weights_note": "Weights as configured. A day with no reading is not counted as 0 °C: its weight is shared out across the others.",
  "health.weather_source": "Weather source",
  "health.weather_stale": "the last reading is old",
  "health.notifications": "Notifications",
  "health.notifications_ok": "every enabled event has a recipient",
  "health.notifications_muted": "nothing would be sent at all",
  "health.notifications_partial": "{n} problem(s) — something would go nowhere",
  "health.notifications_unchecked": "could not be checked",
  "health.silent_events": "enabled with no recipient",
  "health.unreachable": "recipient not found",
  "health.test_notification": "Send a test",
  "health.unattributed": "Unattributed water",
  "health.unattributed_note": "not consumption; the closed-valve subset is what leak detection reads",
  "health.closed_subset": "({liters} L with every valve closed)",
  "health.system_leak": "System leak",
  "health.leak_nothing": "nothing established",
  "health.budget_left": "Consumption budget left",
  "hub_card_editor.title": "Title",
  "hub_card_editor.blocks": "Blocks to show",
  "hub_block.session": "Session",
  "hub_block.decision": "Decision",
  "hub_block.health": "System health",
  "hub_block.actions": "Actions"
}, ea = {
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
  "chart.aria": "Consumo giornaliero su {days} giorni, {liters} litri in totale",
  // Prossima irrigazione: due fatti, mai fusi. L'istante è già risolto contro
  // ogni gate proiettabile; il verdetto accanto riguarda ADESSO e deve
  // leggersi così -- "non ancora valutato" non è "non irrigherebbe".
  "next_run.next": "Prossima",
  "next_run.today": "Oggi",
  "next_run.none": "nessuna irrigazione in programma",
  "next_run.would_run": "irrigherebbe",
  "next_run.blocked": "non irrigherebbe",
  "next_run.not_evaluated": "non ancora valutato",
  "next_run.age_now": "valutato ora",
  "next_run.age_minutes": "valutato {n} min fa",
  "next_run.age_hours": "valutato {n} h fa",
  "next_run.age_days": "valutato {n} g fa",
  // Blocchi della card zona
  "programs.none": "Nessun programma configurato.",
  "programs.minutes": "{n} min oggi",
  "programs.enable": "Attiva",
  "programs.disable": "Disattiva",
  "consumption.today": "Oggi",
  "consumption.month": "Questo mese",
  "consumption.total": "Totale",
  "consumption.estimated": "include litri stimati",
  "hardware.adopt": "Usalo",
  "hardware.battery": "Batteria",
  "hardware.meter": "Flussometro",
  "hardware.unit_unknown": "unità non risolta, letture ignorate",
  "hardware.unit_resolved": "legge {unit}, convertito in L/min",
  "capability.water_accounting": "Contabilità dell'acqua",
  "capability.leak_watch": "Perdite sorvegliate da",
  "capability.leak_detection": "Sensore di perdita",
  "capability.water_supply": "Sensore di mancanza d'acqua",
  "capability_state.measured": "misurata",
  "capability_state.estimated": "stimata dalla portata nominale",
  "capability_state.configured": "configurato",
  "capability_state.candidate_available": "la tua valvola ne offre uno — non ancora impostato",
  "capability_state.unavailable": "non presente",
  "capability_state.zone": "questa zona",
  "capability_state.system": "l'impianto (flussometro condiviso)",
  "capability_state.none": "nulla",
  // La card zona
  "zone_card.name": "Zona Irrigation Maestro",
  "zone_card.description": "Una zona in dettaglio: stato, prossima irrigazione, programmi, curva, hardware e consumi.",
  "zone_card.missing_zone": "Questa card punta alla zona {id}, che non esiste più. Scegline un'altra nell'editor.",
  "zone_card.programs": "Programmi",
  "zone_card.hardware": "Hardware e capacità",
  "zone_card.consumption": "Consumi",
  "zone_card.remaining": "mancano {n} min",
  "zone_card_editor.zone": "Zona",
  "zone_card_editor.title": "Titolo",
  "zone_card_editor.title_placeholder": "Se vuoto, il nome della zona",
  "zone_card_editor.blocks": "Blocchi da mostrare",
  "zone_card_editor.chart_days": "Periodo dello storico",
  "zone_card_editor.days": "{n} giorni",
  "zone_card_editor.consumption_source": "Dati dei consumi",
  "zone_card_editor.source_internal": "Dall'integrazione",
  "zone_card_editor.source_entity": "Dalle mie entità",
  "zone_card_editor.total_entity": "Entità totale",
  "zone_card_editor.today_entity": "Entità oggi",
  "zone_card_editor.month_entity": "Entità questo mese",
  "zone_card_editor.battery_entity": "Entità batteria",
  "zone_card_editor.battery_hint": "L'integrazione non conosce le batterie — mappa qui la tua.",
  "block.state": "Stato",
  "block.next_run": "Prossima irrigazione",
  "block.last_outcome": "Ultimo esito",
  "block.programs": "Programmi",
  "block.curve": "Curva",
  "block.hardware": "Hardware",
  "block.consumption": "Consumi",
  "block.actions": "Azioni",
  // Card hub
  "hub_card.name": "Impianto Irrigation Maestro",
  "hub_card.description": "Sessione, pannello decisionale e salute del sistema per tutto l'impianto.",
  "hub_card.not_installed": "Irrigation Maestro non è ancora installato.",
  "hub_card.session": "Sessione",
  "hub_card.decision": "Decisione",
  "hub_card.health": "Salute del sistema",
  "hub_card.not_evaluated": "non ancora valutato",
  "hub_card.will_water": "irrigherebbe",
  "hub_card.will_skip": "salterebbe",
  "decision.weighted_temp": "Temperatura pesata",
  "decision.rain": "Pioggia",
  "decision.forecast_credit": "Credito previsioni",
  "decision.day_d3": "3 giorni fa",
  "decision.day_d2": "2 giorni fa",
  "decision.day_d1": "ieri",
  "decision.day_today": "oggi",
  "decision.day_tomorrow": "domani",
  "decision.missing_day": "nessuna lettura — il suo peso è stato ridistribuito",
  "decision.weights_note": "Pesi come configurati. Un giorno senza lettura non vale 0 °C: il suo peso viene ripartito sugli altri.",
  "health.weather_source": "Sorgente meteo",
  "health.weather_stale": "l'ultima lettura è vecchia",
  "health.notifications": "Notifiche",
  "health.notifications_ok": "ogni evento attivo ha un destinatario",
  "health.notifications_muted": "non verrebbe inviato nulla",
  "health.notifications_partial": "{n} problema/i — qualcosa non arriverebbe a nessuno",
  "health.notifications_unchecked": "non è stato possibile verificare",
  "health.silent_events": "attivi senza destinatario",
  "health.unreachable": "destinatario non trovato",
  "health.test_notification": "Invia una prova",
  "health.unattributed": "Acqua non attribuita",
  "health.unattributed_note": "non è consumo; il sottoinsieme a valvole chiuse è quello che legge il rilevamento perdite",
  "health.closed_subset": "({liters} L a valvole chiuse)",
  "health.system_leak": "Perdita nell'impianto",
  "health.leak_nothing": "nulla di stabilito",
  "health.budget_left": "Budget consumi residuo",
  "hub_card_editor.title": "Titolo",
  "hub_card_editor.blocks": "Blocchi da mostrare",
  "hub_block.session": "Sessione",
  "hub_block.decision": "Decisione",
  "hub_block.health": "Salute del sistema",
  "hub_block.actions": "Azioni"
}, We = {
  en: C,
  it: ea
};
function ge(o) {
  const t = (o?.locale?.language ?? o?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in We ? t : "en";
}
function ta(o, e) {
  return e ? o.replace(/\{(\w+)\}/g, (t, a) => {
    const i = e[a];
    return i === void 0 ? t : String(i);
  }) : o;
}
function r(o, e, t) {
  const a = We[o] ?? C;
  return ta(a[e] ?? C[e], t);
}
function k(o, e, t) {
  const a = `${e}.${t}`, i = We[o] ?? C, n = C;
  return i[a] ?? n[a] ?? t;
}
function tt(o, e) {
  const t = We[o] ?? C, a = C;
  for (const i of ["queue_state", "zone_state", "outcome"]) {
    const n = `${i}.${e}`, s = t[n] ?? a[n];
    if (s !== void 0) return s;
  }
  return e;
}
const Bt = /* @__PURE__ */ new Map(), Wt = /* @__PURE__ */ new Map(), Vt = /* @__PURE__ */ new Map();
function Me(o) {
  let e = Bt.get(o);
  return e || (e = new Intl.RelativeTimeFormat(o, { numeric: "auto" }), Bt.set(o, e)), e;
}
function it(o, e, t = Date.now()) {
  if (!o) return;
  const a = Date.parse(o);
  if (Number.isNaN(a)) return;
  const i = Math.round((a - t) / 1e3), n = Math.abs(i);
  try {
    return n < 60 ? Me(e).format(i, "second") : n < 3600 ? Me(e).format(Math.round(i / 60), "minute") : n < 86400 ? Me(e).format(Math.round(i / 3600), "hour") : Me(e).format(Math.round(i / 86400), "day");
  } catch {
    return;
  }
}
function ia(o, e) {
  if (!o) return;
  const t = Date.parse(o);
  if (Number.isNaN(t)) return;
  let a = Wt.get(e);
  return a || (a = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }), Wt.set(e, a)), a.format(t);
}
function aa(o, e) {
  if (!o) return;
  const t = Date.parse(o);
  if (Number.isNaN(t)) return;
  let a = Vt.get(e);
  return a || (a = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }), Vt.set(e, a)), a.format(t);
}
function S(o, e = 1) {
  const t = m(o);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (a) => e > 0 ? "" : a);
}
function ct(o, e, t, a) {
  const i = [e], n = t.describingSource ?? t.sources[0];
  n && i.push(k(o, "leak_source", n));
  const s = it(t.confirmedAt, o, a);
  return s && i.push(r(o, "zone.leak_confirmed_at", { when: s })), i.join(" · ");
}
function oa(o) {
  const e = m(o);
  if (e !== void 0) return e;
  if (o && typeof o == "object") {
    const t = o;
    return m(t.duration_min) ?? m(t.duration) ?? m(t.minutes);
  }
}
function na(o, e) {
  const t = f(o.run_started_at), a = m(o.run_duration_min);
  if (!t || a === void 0 || a <= 0)
    return;
  const i = Date.parse(t);
  if (Number.isNaN(i)) return;
  const n = (e - i) / 6e4, s = et(n / a, 0, 1), d = Math.max(0, Math.ceil(a - n)), c = [], p = o.run_planned_runs;
  if (Array.isArray(p) && p.length > 1) {
    const _ = p.map(oa).filter((v) => v !== void 0 && v > 0), g = _.reduce((v, y) => v + y, 0);
    if (_.length > 1 && g > 0) {
      let v = 0;
      for (let y = 0; y < _.length - 1; y += 1)
        v += _[y] ?? 0, c.push(v / g);
    }
  }
  return { fraction: s, remainingMin: d, segmentBounds: c };
}
function sa(o) {
  const e = Math.abs(Math.round(o)), t = Math.floor(e / 3600), a = Math.round(e % 3600 / 60), i = [];
  return t > 0 && i.push(`${t} h`), a > 0 && i.push(`${a} min`), i.length === 0 && i.push(`${e} s`), i.join(" ");
}
function ra(o, e) {
  if (!o || typeof o != "object") return "";
  if (o.kind === "sun" && (o.event === "sunrise" || o.event === "sunset")) {
    const a = r(
      e,
      o.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), i = m(o.offset_s) ?? 0;
    if (i === 0) return a;
    const n = i < 0 ? "−" : "+";
    return `${a} ${n} ${sa(i)}`;
  }
  const t = f(o.at) ?? f(o.time);
  return t ? r(e, "trigger.at", { time: t }) : f(o.kind) ?? "";
}
var la = Object.defineProperty, Ve = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && la(e, t, i), i;
};
function ca(o, e) {
  const t = Math.max(o ?? 0, e ?? 0, 1e-3);
  return {
    fill: et((o ?? 0) / t, 0, 1),
    mark: e !== void 0 ? et(e / t, 0, 1) : void 0,
    sufficient: o !== void 0 && e !== void 0 && o >= e
  };
}
const _t = class _t extends b {
  constructor() {
    super(...arguments), this.language = "en", this.wide = !1;
  }
  render() {
    if (this.budget === void 0 && this.threshold === void 0) return u;
    const { fill: e, mark: t, sufficient: a } = ca(this.budget, this.threshold), i = this.language;
    return l`
      <span class="label">${r(i, "header.water_budget")}</span>
      <div
        class="meter"
        title=${`${r(i, "header.water_budget")} / ${r(i, "header.skip_threshold")}`}
      >
        <div
          class="meter-fill ${a ? "sufficient" : ""}"
          style="width:${(e * 100).toFixed(1)}%"
        ></div>
        ${t !== void 0 ? l`<div class="meter-mark" style="left:${(t * 100).toFixed(1)}%"></div>` : u}
      </div>
      <span class="numbers">
        ${S(this.budget, 2) ?? "—"} / ${S(this.threshold, 1) ?? "—"} mm
      </span>
    `;
  }
};
_t.styles = w`
    :host {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1 1 220px;
      min-width: 200px;
    }
    :host([wide]) {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
    }
    .label {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
    }
    .meter {
      position: relative;
      flex: 1;
      height: 8px;
      border-radius: 4px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
      min-width: 60px;
    }
    :host([wide]) .meter {
      height: 12px;
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
    .numbers {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
  `;
let ae = _t;
Ve([
  h({ attribute: !1 })
], ae.prototype, "budget");
Ve([
  h({ attribute: !1 })
], ae.prototype, "threshold");
Ve([
  h()
], ae.prototype, "language");
Ve([
  h({ type: Boolean, reflect: !0 })
], ae.prototype, "wide");
$("imc-budget-meter", ae);
function dt(o) {
  const e = Math.floor(o), t = o - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function ut(o) {
  if (!Array.isArray(o)) return [];
  const e = [];
  for (const t of o) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const a = m(t[0]), i = m(t[1]);
    a !== void 0 && i !== void 0 && e.push([a, i]);
  }
  return [...e].sort((t, a) => t[0] - a[0]);
}
const hi = 25, da = [5, 12, 20, 25, 30, 35, 40];
function _i(o, e) {
  const t = o[0], a = o[o.length - 1];
  if (!t || !a) return 0;
  if (e <= t[0]) return t[1];
  if (e >= a[0]) return a[1];
  for (let i = 0; i < o.length - 1; i++) {
    const n = o[i], s = o[i + 1];
    if (!n || !s) continue;
    const [d, c] = n, [p, _] = s;
    if (d <= e && e <= p) return c + (_ - c) * (e - d) / (p - d);
  }
  return a[1];
}
function mi(o, e, t = 100, a, i) {
  let n = _i(o, e) * t / 100;
  return a !== void 0 && (n = Math.max(n, a)), i !== void 0 && (n = Math.min(n, i)), n;
}
function ua(o) {
  if (o.length === 0) return "curve_empty";
  for (const e of o)
    if (e[1] < 0) return "curve_negative_value";
  for (let e = 1; e < o.length; e++) {
    const t = o[e - 1], a = o[e];
    if (!(!t || !a) && a[0] <= t[0])
      return "curve_temps_not_increasing";
  }
  return null;
}
var pa = Object.defineProperty, ha = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && pa(e, t, i), i;
};
const le = 150, ce = 44, De = 6, Zt = 6, mt = class mt extends b {
  render() {
    const e = this.curve, t = ut(e?.points);
    if (t.length === 0) return u;
    const a = m(e?.min), i = m(e?.max), n = t.map((z) => z[0]), s = t.map((z) => z[1]);
    a !== void 0 && s.push(a), i !== void 0 && s.push(i);
    let d = Math.min(...n), c = Math.max(...n), p = Math.min(...s), _ = Math.max(...s);
    c - d < 1e-9 && (d -= 1, c += 1), _ - p < 1e-9 && (p -= 1, _ += 1);
    const g = (z) => De + (z - d) / (c - d) * (le - 2 * De), v = (z) => ce - Zt - (z - p) / (_ - p) * (ce - 2 * Zt), y = t.map((z, Ye) => `${Ye === 0 ? "M" : "L"}${g(z[0]).toFixed(1)},${v(z[1]).toFixed(1)}`).join(" "), A = (z, Ye) => q`
      <line
        class="clamp"
        x1="0" x2="${le}"
        y1="${v(z).toFixed(1)}" y2="${v(z).toFixed(1)}"
      ></line>
      <text class="clamp-label" x="${le - 2}" text-anchor="end"
        y="${(v(z) - 2).toFixed(1)}">${Ye}</text>
    `, Y = t[0], fe = t[t.length - 1];
    return l`
      <svg
        viewBox="0 0 ${le} ${ce + 10}"
        width="${le}"
        height="${ce + 10}"
        role="img"
        aria-hidden="true"
      >
        ${a !== void 0 ? A(a, String(a)) : u}
        ${i !== void 0 ? A(i, String(i)) : u}
        <path class="line" d="${y}"></path>
        ${t.map(
      (z) => q`<circle class="dot" r="2"
            cx="${g(z[0]).toFixed(1)}" cy="${v(z[1]).toFixed(1)}"></circle>`
    )}
        ${Y ? q`<text class="axis-label" x="${De}" y="${ce + 8}"
              text-anchor="start">${Y[0]}°</text>` : u}
        ${fe && fe !== Y ? q`<text class="axis-label" x="${le - De}" y="${ce + 8}"
              text-anchor="end">${fe[0]}°</text>` : u}
      </svg>
    `;
  }
};
mt.styles = w`
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
let Le = mt;
ha([
  h({ attribute: !1 })
], Le.prototype, "curve");
$("imc-curve-sparkline", Le);
function gi(o) {
  return [...o].sort((e, t) => e[0] - t[0]);
}
function _a(o, e) {
  const t = o[e];
  if (!t) return o;
  const a = o[e + 1], i = a ? [(t[0] + a[0]) / 2, (t[1] + a[1]) / 2] : [t[0] + 5, t[1]];
  return gi([...o, i]);
}
function ma(o, e) {
  return o.length <= 1 ? o : o.filter((t, a) => a !== e);
}
function Xe(o, e, t, a) {
  const i = [...o];
  return i[e] ? (i[e] = [t, Math.max(0, a)], i) : o;
}
function ga(o, e) {
  return e ? o : void 0;
}
function fa(o) {
  return o.intensity_pct !== void 0 && o.intensity_pct !== 100 ? !0 : Object.keys(o.day_intensity_pct ?? {}).length > 0;
}
function va(o, e, t) {
  return e === 0 ? o : Math.max(0, dt(o - e * t));
}
function ya(o, e, t, a, i, n) {
  const s = [...o.map((p) => p[1]), e, t], d = Math.max(12, ...s) + 4, c = a - i - n;
  return {
    top: d,
    y: (p) => a - n - p / d * c
  };
}
var ba = Object.defineProperty, R = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && ba(e, t, i), i;
};
const j = 320, X = 170, L = 34, J = 12, ye = 16, de = 24, Gt = 5, Kt = 40, Yt = 2, gt = class gt extends b {
  constructor() {
    super(...arguments), this.language = "en", this.zoneHasFlowMeter = !1, this.zoneAdjustmentPct = 100, this._points = [[hi, 15]], this._min = 1, this._max = 120, this._kind = "duration", this._error = null;
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = ut(e?.points);
    t.length !== 0 && (this._points = t, this._min = m(e?.min) ?? 1, this._max = m(e?.max) ?? 120, this._kind = e?.kind === "volume" ? "volume" : "duration", this._error = null);
  }
  /** What this curve actually delivers IN THIS ZONE: the raw shape times
   *  `zoneAdjustmentPct`, then the clamps — same order as `curve_value`
   *  (`engine/curves.py`) and `previewMinutes`/`dayDelivery`
   *  (schedule-math.ts). Drives the preview tiles and the "today" banner,
   *  which exist to answer "what will this water", not "what shape did I
   *  draw". Saving resets the program's own intensity to 100%, so the only
   *  per-zone factor left to fold in here is the adjustment. */
  _deliveryValue(e) {
    return dt(mi(this._points, e, this.zoneAdjustmentPct, this._min, this._max));
  }
  _unit() {
    return r(this.language, this._kind === "volume" ? "curve.unit_volume" : "curve.unit_duration");
  }
  _axisMin() {
    return Math.min(this._points[0]?.[0] ?? Gt, Gt) - Yt;
  }
  _axisMax() {
    const e = this._points[this._points.length - 1];
    return Math.max(e?.[0] ?? Kt, Kt) + Yt;
  }
  _sx(e) {
    const t = this._axisMin(), a = this._axisMax();
    return L + (e - t) / (a - t) * (j - L - J);
  }
  /** The graph's vertical axis, scaled to contain every raw point AND both
   *  clamp lines — see `graphAxis`'s doc comment for why both matter. */
  _axis() {
    return ya(this._points, this._min, this._max, X, ye, de);
  }
  _sy(e) {
    return this._axis().y(e);
  }
  /** Client coordinates of a pointer event, converted into the SVG's
   *  viewBox units (0..GRAPH_H on the y-axis). */
  _pointerViewY(e, t, a) {
    const i = e.createSVGPoint();
    return i.x = a.clientX, i.y = a.clientY, i.matrixTransform(t.inverse()).y;
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
    const a = t.currentTarget.ownerSVGElement;
    if (!a) return;
    const i = this._points[e];
    if (!i) return;
    const n = i[1], s = a.getScreenCTM();
    if (!s) return;
    const d = this._pointerViewY(a, s, t), c = this._axis().top / (X - ye - de), p = (g) => {
      const v = a.getScreenCTM();
      if (!v) return;
      const y = this._pointerViewY(a, v, g) - d;
      this._points = Xe(
        this._points,
        e,
        i[0],
        va(n, y, c)
      ), this._error = null;
    }, _ = () => {
      window.removeEventListener("pointermove", p), window.removeEventListener("pointerup", _);
    };
    window.addEventListener("pointermove", p), window.addEventListener("pointerup", _);
  }
  _save() {
    const e = ua(this._points) ?? (this._min > this._max ? "min_above_max" : null) ?? (this._min < 0 ? "negative_clamp" : null);
    if (e) {
      this._error = e;
      return;
    }
    this._error = null;
    const t = ga(this._kind, this.zoneHasFlowMeter);
    this.dispatchEvent(
      new CustomEvent("imc-curve-save", {
        detail: {
          cycleId: this.cycle?.cycle_id ?? "",
          points: this._points.map((a) => [a[0], a[1]]),
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
        ${da.map((t) => this._exampleTile(`${t}°`, this._deliveryValue(t)))}
      </div>

      ${this._renderToday(e)}

      <div class="points-title">${r(e, "editor.points_title")}</div>
      ${this._points.map((t, a) => this._renderPointRow(t, a, e))}

      ${this.zoneHasFlowMeter ? this._renderKind(e) : u}

      <div class="limits">
        <div class="limit">
          <label>${r(e, "editor.min.label")}</label>
          <div class="help">${r(e, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(t) => {
      const a = Number(t.target.value);
      Number.isNaN(a) || (this._min = a, this._error = null);
    }} /> ${this._unit()}
        </div>
        <div class="limit">
          <label>${r(e, "editor.max.label")}</label>
          <div class="help">${r(e, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(t) => {
      const a = Number(t.target.value);
      Number.isNaN(a) || (this._max = a, this._error = null);
    }} /> ${this._unit()}
        </div>
      </div>

      ${this._error ? l`<div class="error">${k(e, "editor", this._error)}</div>` : u}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${r(e, "editor.save")}</button>
        <button @click=${this._cancel}>${r(e, "editor.cancel")}</button>
      </div>
    `;
  }
  _renderIntensityNotice(e) {
    return fa(this.cycle ?? {}) ? l`<div class="intensity-notice">
      ${r(e, "editor.intensity_reset")}
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
    return this.zoneAdjustmentPct === 100 ? u : l`<div class="graph-note">
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
      const a = t.target.value;
      this._kind = a === "volume" ? "volume" : "duration";
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
    if (t === void 0 || Number.isNaN(t)) return u;
    const a = this._deliveryValue(t);
    return l`<div class="today-banner">${r(e, "editor.today", {
      temp: Math.round(t),
      value: a,
      unit: this._unit()
    })}</div>`;
  }
  _renderPointRow(e, t, a) {
    return l`<div class="point-row">
      <input
        type="number"
        step="0.5"
        .value=${String(e[0])}
        aria-label=${r(a, "editor.point_temp")}
        @change=${(i) => this._editPoint(t, i, "temp")}
      /> °C
      <input
        type="number"
        min="0"
        step="1"
        .value=${String(e[1])}
        aria-label=${r(a, "editor.point_value")}
        @change=${(i) => this._editPoint(t, i, "value")}
      /> ${this._unit()}
      <button
        type="button"
        ?disabled=${this._points.length <= 1}
        title=${r(a, "editor.point_remove")}
        @click=${() => this._points = ma(this._points, t)}
      >
        ✕
      </button>
      <button
        type="button"
        title=${r(a, "editor.point_add")}
        @click=${() => this._points = _a(this._points, t)}
      >
        ＋
      </button>
    </div>`;
  }
  _editPoint(e, t, a) {
    const i = Number(t.target.value);
    if (Number.isNaN(i)) return;
    const n = this._points[e];
    if (!n) return;
    const s = a === "temp" ? Xe(this._points, e, i, n[1]) : Xe(this._points, e, n[0], i);
    this._points = gi(s), this._error = null;
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
    const t = this._axisMin(), a = this._axisMax(), i = [];
    for (let y = t; y <= a; y += 1)
      i.push([this._sx(y), this._sy(_i(this._points, y))]);
    const n = i.map((y, A) => `${A === 0 ? "M" : "L"}${y[0].toFixed(1)},${y[1].toFixed(1)}`).join(" "), s = this.weightedTemp, d = s !== void 0 && !Number.isNaN(s) && s >= t && s <= a, c = this._sy(this._min), p = this._sy(this._max), _ = Math.min(c, p), g = Math.abs(p - c), v = this._unit();
    return q`
      <svg viewBox="0 0 ${j} ${X}">
        <rect class="clamp-band" x=${L} y=${_.toFixed(1)}
          width=${(j - L - J).toFixed(1)} height=${g.toFixed(1)}></rect>
        <line class="clamp-line" x1=${L} y1=${c.toFixed(1)} x2=${j - J} y2=${c.toFixed(1)}></line>
        <line class="clamp-line" x1=${L} y1=${p.toFixed(1)} x2=${j - J} y2=${p.toFixed(1)}></line>
        <text class="clamp-text" x=${j - J} y=${(c - 3).toFixed(1)} text-anchor="end">${r(e, "curve.clamp_min")} ${this._min} ${v}</text>
        <text class="clamp-text" x=${j - J} y=${(p - 3).toFixed(1)} text-anchor="end">${r(e, "curve.clamp_max")} ${this._max} ${v}</text>
        <line class="axis" x1=${L} y1=${ye} x2=${L} y2=${X - de}></line>
        <line class="axis" x1=${L} y1=${X - de} x2=${j - J} y2=${X - de}></line>
        ${d ? q`<line class="today" x1=${this._sx(s)} y1=${ye} x2=${this._sx(s)} y2=${X - de}></line>
              <text class="today-text" x=${this._sx(s)} y=${ye - 4} text-anchor="middle">${r(e, "editor.graph.today", { temp: Math.round(s) })}</text>` : u}
        <path class="curve" d=${n}></path>
        ${this._points.map(
      (y, A) => q`<circle class="handle" r="7"
            cx=${this._sx(y[0]).toFixed(1)} cy=${this._sy(y[1]).toFixed(1)}
            @pointerdown=${(Y) => this._startDrag(A, Y)}></circle>`
    )}
      </svg>
    `;
  }
};
gt.styles = w`
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
let P = gt;
R([
  h()
], P.prototype, "language");
R([
  h({ attribute: !1 })
], P.prototype, "cycle");
R([
  h({ attribute: !1 })
], P.prototype, "weightedTemp");
R([
  h({ type: Boolean })
], P.prototype, "zoneHasFlowMeter");
R([
  h({ type: Number })
], P.prototype, "zoneAdjustmentPct");
R([
  x()
], P.prototype, "_points");
R([
  x()
], P.prototype, "_min");
R([
  x()
], P.prototype, "_max");
R([
  x()
], P.prototype, "_kind");
R([
  x()
], P.prototype, "_error");
$("imc-curve-editor", P);
var xa = Object.defineProperty, Z = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && xa(e, t, i), i;
};
const fi = {
  idle: "mdi:water-outline",
  queued: "mdi:timer-sand",
  watering: "mdi:water",
  soaking: "mdi:water-percent",
  paused: "mdi:pause-circle-outline",
  suspended: "mdi:calendar-remove-outline",
  disabled: "mdi:water-off-outline"
}, wa = [1, 4, 8, 24], $a = {
  water_estimated: { label: "zone.water_estimated", icon: "mdi:approximately-equal" },
  leak_unavailable: { label: "zone.leak_unavailable", icon: "mdi:water-alert-outline" },
  leak_system_scope: { label: "zone.leak_system_scope", icon: "mdi:home-flood" },
  leak_candidate: { label: "zone.leak_candidate", icon: "mdi:water-plus-outline" },
  supply_unavailable: { label: "zone.supply_unavailable", icon: "mdi:water-pump-off" },
  supply_candidate: { label: "zone.supply_candidate", icon: "mdi:water-pump" }
};
function za(o) {
  return o in fi;
}
const ft = class ft extends b {
  constructor() {
    super(...arguments), this.language = "en", this.now = Date.now(), this.compact = !1, this.showControls = !0, this._expanded = !1;
  }
  get _zoneState() {
    const e = this.zone?.state?.state;
    return e && za(e) ? e : void 0;
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
    const t = e.currentTarget, a = Number(t.value);
    t.value = "";
    const i = this.zone?.zoneId;
    i && Number.isFinite(a) && a > 0 && this._dispatch({ action: "pause", zoneId: i, hours: a });
  }
  _onSuspendDate(e) {
    const t = e.currentTarget, a = t.value;
    t.value = "";
    const i = this.zone?.zoneId;
    i && a && this._dispatch({ action: "suspend", zoneId: i, until: `${a}T00:00:00` });
  }
  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */
  _renderBadges(e, t) {
    const a = this.zone;
    if (!a) return u;
    const i = a.state?.attributes ?? {}, n = [];
    if (t.coverage === "alarm") {
      const c = r(this.language, "zone.leak_alarm");
      n.push(l`
        <span class="badge alarm" title=${this._leakTitle(t)}>
          <ha-icon icon="mdi:water-alert" style="--mdc-icon-size:12px"></ha-icon>
          ${c}
        </span>
      `);
    } else if (t.coverage === "establishing") {
      const c = r(this.language, "zone.leak_checking");
      n.push(l`
        <span class="badge muted" title=${c}>
          <ha-icon icon="mdi:progress-question" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : c}
        </span>
      `);
    }
    const s = f(i.suspended_until) ?? (T(a.suspendUntil) ? void 0 : a.suspendUntil?.state);
    if (this._zoneState === "suspended" && s) {
      const c = aa(s, this.language) ?? s;
      n.push(l`
        <span class="badge" title=${r(this.language, "zone.suspended_until", { date: c })}>
          <ha-icon icon="mdi:calendar-remove-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${c}
        </span>
      `);
    }
    for (const c of N(i.degraded)) {
      const p = f(c);
      if (!p) continue;
      const _ = k(this.language, "degraded", p);
      n.push(l`
        <span class="badge" title=${_}>
          <ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : _}
        </span>
      `);
    }
    const d = Qi(a);
    for (const c of d) {
      const p = $a[c.key], _ = r(this.language, p.label);
      n.push(l`
        <span class="badge ${c.tone}" title=${_}>
          <ha-icon icon=${p.icon} style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : _}
        </span>
      `);
    }
    if (e?.estimated && !d.some((c) => c.key === "water_estimated")) {
      const c = r(this.language, "zone.water_estimated");
      n.push(l`
        <span class="badge muted" title=${c}>
          <ha-icon icon="mdi:approximately-equal" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : c}
        </span>
      `);
    }
    return n;
  }
  /** This zone's standing alarm, described once for the badge's tooltip and
   *  the meta line below it (see `describeLeakAlarm` for the two things that
   *  sentence is not allowed to say). */
  _leakTitle(e) {
    return ct(
      this.language,
      r(this.language, "zone.leak_alarm"),
      e,
      this.now
    );
  }
  _renderProgress() {
    const e = this.zone, t = this._zoneState;
    if (!e || t !== "watering" && t !== "soaking")
      return u;
    const a = na(
      e.state?.attributes ?? {},
      this.now
    );
    return a ? l`
      <div class="progress-line">
        <div class="progress ${t === "soaking" ? "soaking" : ""}">
          <div class="bar" style="width:${(a.fraction * 100).toFixed(2)}%"></div>
          ${a.segmentBounds.map(
      (i) => l`<div class="seg" style="left:${(i * 100).toFixed(2)}%"></div>`
    )}
        </div>
        <span class="remaining">
          ${r(this.language, "zone.remaining", {
      minutes: a.remainingMin
    })}
        </span>
      </div>
    ` : u;
  }
  _renderMeta(e, t) {
    const a = this.zone;
    if (!a) return u;
    const i = this.language, n = [];
    t.coverage === "alarm" && n.push(l`<span class="leak-line">${this._leakTitle(t)}</span>`);
    const s = a.nextRun;
    if (s && !T(s)) {
      const c = it(s.state, i, this.now), p = ia(s.state, i), _ = f(s.attributes.cycle_name);
      (c || p) && n.push(l`
          <span>
            ${r(i, "zone.next_run")}: ${c ?? ""}
            ${p ? l`<span class="abs">
                  · ${p}${_ ? ` (${_})` : ""}
                </span>` : u}
          </span>
        `);
    } else
      n.push(l`<span>${r(i, "zone.no_next_run")}</span>`);
    const d = a.lastOutcome;
    if (d && !T(d) && d.state !== "none") {
      const c = k(i, "outcome", d.state), p = f(d.attributes.reason_key), _ = p ? k(i, "reason", p) : void 0, g = f(d.attributes.finished_at), v = it(g, i, this.now);
      n.push(l`
        <span>
          ${r(i, "zone.last_outcome")}: ${c}${_ ? ` — ${_}` : ""}${v ? l`<span class="abs"> · ${v}</span>` : u}
        </span>
      `);
    }
    if (e) {
      const c = r(i, "curve.unit_volume");
      n.push(l`
        <span>
          ${S(e.total, 0)} ${c}
          <span class="abs">
            · ${r(i, "zone.water_today")}
            ${S(e.today, 0)} ${c} ·
            ${r(i, "zone.water_month")}
            ${S(e.month, 0)} ${c}
          </span>
        </span>
      `);
    }
    return l`<div class="meta">${n}</div>`;
  }
  _renderControls() {
    const e = this.zone;
    if (!e || !this.showControls) return u;
    const t = this.language, a = e.zoneId, i = this._zoneState, n = e.enabledSwitch, s = n?.state === "on", d = i === "paused" || i === "suspended";
    return l`
      <div class="controls" @click=${(c) => c.stopPropagation()}>
        <button @click=${() => this._dispatch({ action: "run", zoneId: a })}>
          ${r(t, "controls.run_now")}
        </button>
        <button @click=${() => this._dispatch({ action: "skip", zoneId: a })}>
          ${r(t, "controls.skip_today")}
        </button>
        <select
          .value=${""}
          @change=${this._onPauseSelect}
          aria-label=${r(t, "controls.pause_for")}
        >
          <option value="" disabled selected hidden>
            ${r(t, "controls.pause_for")}
          </option>
          ${wa.map(
      (c) => l`<option value=${c}>
              ${r(t, "controls.hours", { hours: c })}
            </option>`
    )}
        </select>
        <input
          type="date"
          @change=${this._onSuspendDate}
          aria-label=${r(t, "controls.suspend_until")}
          title=${r(t, "controls.suspend_until")}
        />
        ${d ? l`<button
              @click=${() => this._dispatch({ action: "resume", zoneId: a })}
            >
              ${r(t, "controls.resume")}
            </button>` : u}
        ${n ? l`<button
              @click=${() => this._dispatch({
      action: "set-enabled",
      zoneId: a,
      enabled: !s
    })}
            >
              ${r(t, s ? "controls.disable" : "controls.enable")}
            </button>` : u}
      </div>
    `;
  }
  _renderCycles() {
    const e = this.zone;
    if (!e) return u;
    const t = this.language, a = N(e.state?.attributes.cycles).filter(
      (i) => !!i && typeof i == "object"
    );
    return a.length === 0 ? l`<div class="details">
        <div class="no-cycles">${r(t, "zone.no_cycles")}</div>
      </div>` : l`
      <div class="details">
        <div class="details-title">${r(t, "zone.cycles")}</div>
        ${a.map((i) => this._renderCycle(i))}
      </div>
    `;
  }
  _renderCycle(e) {
    const t = this.language, a = this.zone, i = f(e.cycle_id), n = a?.cycleSwitches.find(
      (fe) => f(fe.attributes.cycle_id) === i
    ), s = n ? n.state === "on" : e.enabled !== !1, d = ra(e.trigger, t), c = e.curve, p = m(c?.min), _ = m(c?.max), g = r(
      t,
      c?.kind === "volume" ? "curve.unit_volume" : "curve.unit_duration"
    ), v = [];
    p !== void 0 && v.push(
      `${r(t, "curve.clamp_min")} ${p} ${g}`
    ), _ !== void 0 && v.push(
      `${r(t, "curve.clamp_max")} ${_} ${g}`
    );
    const y = !!i && this._editingCycle === i, A = i ? l`<button
          class="link-btn"
          @click=${() => this._editingCycle = y ? void 0 : i}
        >
          ${r(t, "editor.edit_curve")}
        </button>` : u, Y = y ? l`<imc-curve-editor
          .language=${t}
          .cycle=${e}
          .weightedTemp=${this.weightedTemp}
          .zoneHasFlowMeter=${this.zone ? Yi(this.zone) : !1}
          .zoneAdjustmentPct=${this.zone ? pi(this.zone) : 100}
          @imc-curve-save=${this._onCurveSave}
          @imc-curve-cancel=${() => this._editingCycle = void 0}
        ></imc-curve-editor>` : u;
    return l`
      <div class="cycle">
        <div class="cycle-info">
          <div class="cycle-name">
            ${f(e.name) ?? i ?? "?"}
            ${s ? u : l`<span class="off">
                  ${r(t, "zone.cycle_disabled")}
                </span>`}
          </div>
          <div class="cycle-sub">
            ${d}${d && v.length > 0 ? " · " : ""}${v.join(" · ")}
          </div>
        </div>
        ${c ? l`<imc-curve-sparkline .curve=${c}></imc-curve-sparkline>` : u}
        ${A}
      </div>
      ${Y}
    `;
  }
  _onCurveSave(e) {
    const t = this.zone?.zoneId;
    if (!t) return;
    const a = e.detail;
    this._dispatch({
      action: "save-curve",
      zoneId: t,
      cycleId: a.cycleId,
      points: a.points,
      min: a.min,
      max: a.max,
      kind: a.kind
    }), this._editingCycle = void 0;
  }
  render() {
    const e = this.zone;
    if (!e) return u;
    const t = this.language, a = this._zoneState, i = a ? k(t, "zone_state", a) : r(t, "card.unavailable"), n = a ? fi[a] : "mdi:help-circle-outline", s = a ?? "unknown", d = !this.compact || this._expanded, c = ui(e), p = ci(e);
    return l`
      <div class="zone ${s}">
        <div
          class="row"
          role="button"
          tabindex="0"
          aria-expanded=${this._expanded ? "true" : "false"}
          @click=${this._toggleExpanded}
          @keydown=${this._onHeaderKeydown}
        >
          <ha-icon class="state-icon ${s}" icon=${n}></ha-icon>
          <div class="main">
            <div class="name-line">
              <span class="name">${e.name}</span>
              ${this._renderBadges(c, p)}
            </div>
          </div>
          <span class="state-chip ${s}">${i}</span>
          <ha-icon
            class="caret"
            icon=${this._expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </div>
        ${this._renderProgress()}
        ${d ? this._renderMeta(c, p) : u}
        ${d ? this._renderControls() : u}
        ${this._expanded ? this._renderCycles() : u}
      </div>
    `;
  }
};
ft.styles = w`
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
let M = ft;
Z([
  h({ attribute: !1 })
], M.prototype, "zone");
Z([
  h()
], M.prototype, "language");
Z([
  h({ attribute: !1 })
], M.prototype, "now");
Z([
  h({ type: Boolean, reflect: !0 })
], M.prototype, "compact");
Z([
  h({ type: Boolean })
], M.prototype, "showControls");
Z([
  h({ attribute: !1 })
], M.prototype, "weightedTemp");
Z([
  x()
], M.prototype, "_expanded");
Z([
  x()
], M.prototype, "_editingCycle");
$("imc-zone-row", M);
var ka = Object.defineProperty, pt = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && ka(e, t, i), i;
};
const vt = class vt extends b {
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
    window.confirm(r(this.language, "controls.confirm_stop_all")) && this._dispatch({ action: "stop_all" });
  }
  render() {
    const e = this.language;
    return l`
      <div class="controls">
        <button @click=${() => this._dispatch({ action: "run_all" })}>
          ${r(e, "controls.run_all")}
        </button>
        <button class="danger" @click=${this._onStopAll}>
          ${r(e, "controls.stop_all")}
        </button>
        <button @click=${() => this._dispatch({ action: "evaluate" })}>
          ${r(e, "controls.evaluate_now")}
        </button>
        ${this.hasPauseSwitch ? l`<button
              class=${this.paused ? "active" : ""}
              @click=${() => this._dispatch({ action: "set-pause", paused: !this.paused })}
            >
              ${r(
      e,
      this.paused ? "controls.resume_global" : "controls.pause_global"
    )}
            </button>` : u}
      </div>
    `;
  }
};
vt.styles = w`
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
let me = vt;
pt([
  h()
], me.prototype, "language");
pt([
  h({ type: Boolean })
], me.prototype, "paused");
pt([
  h({ type: Boolean })
], me.prototype, "hasPauseSwitch");
$("imc-global-controls", me);
var Sa = Object.defineProperty, Ze = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && Sa(e, t, i), i;
};
const Aa = [
  "idle",
  "evaluating",
  "running"
];
function Ca(o) {
  return !!o && Aa.includes(o);
}
const yt = class yt extends b {
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
    this._config = { ...Zi, ...e };
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
      const t = e.get("hass"), a = this.hass;
      return !t || !a || Object.keys(a.states).length !== this._statesCount ? !0 : this._relevantIds.some(
        (n) => t.states[n] !== a.states[n]
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
  async _call(e, t, a) {
    const i = this.hass;
    if (i)
      try {
        await i.callService(e, t, a);
      } catch (n) {
        const s = n instanceof Error ? n.message : String(n);
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
          (n) => n.zoneId === t.zoneId
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
        const a = this._model?.hub.pauseSwitch?.entity_id;
        a && this._call(
          "switch",
          t.paused ? "turn_on" : "turn_off",
          { entity_id: a }
        );
        break;
      }
    }
  }
  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */
  _renderHeader(e, t) {
    const a = e.hub, i = T(a.waterBudget) ? void 0 : m(a.waterBudget?.state), n = T(a.skipThreshold) ? void 0 : m(a.skipThreshold?.state), s = i !== void 0 || n !== void 0 ? l`<imc-budget-meter
            .budget=${i}
            .threshold=${n}
            .language=${t}
          ></imc-budget-meter>` : u, d = a.weightedTemp, c = T(d) ? void 0 : m(d?.state), p = d?.attributes.stale_weather === !0, _ = a.session?.state, g = Ca(_) ? _ : void 0, v = a.pauseSwitch?.state === "on", y = T(a.consumptionLeft) ? void 0 : m(a.consumptionLeft?.state), A = di(a);
    return l`
      <div class="header">
        ${s}
        <div class="chips">
          ${A.coverage === "alarm" ? l`<span
                class="chip alarm"
                title=${ct(
      t,
      r(t, "header.leak"),
      A,
      this._now
    )}
              >
                <ha-icon icon="mdi:water-alert" style="--mdc-icon-size:14px"></ha-icon>
                ${r(t, "header.leak")}
              </span>` : u}
          ${c !== void 0 ? l`<span
                class="chip"
                title=${r(t, "header.weighted_temp")}
              >
                <ha-icon icon="mdi:thermometer" style="--mdc-icon-size:14px"></ha-icon>
                ${S(c, 1)} °C
              </span>` : u}
          ${p ? l`<span class="chip warning">
                <ha-icon icon="mdi:alert" style="--mdc-icon-size:14px"></ha-icon>
                ${r(t, "header.stale_weather")}
              </span>` : u}
          ${g ? l`<span
                class="chip ${g !== "idle" ? "accent" : ""}"
                title=${r(t, "header.session")}
              >
                <ha-icon
                  icon=${g === "running" ? "mdi:play-circle-outline" : g === "evaluating" ? "mdi:magnify" : "mdi:sleep"}
                  style="--mdc-icon-size:14px"
                ></ha-icon>
                ${k(t, "session", g)}
              </span>` : u}
          ${v ? l`<span class="chip warning">
                <ha-icon icon="mdi:pause" style="--mdc-icon-size:14px"></ha-icon>
                ${r(t, "header.global_pause")}
              </span>` : u}
          ${y !== void 0 ? l`<span
                class="chip"
                title=${r(t, "header.consumption_left")}
              >
                <ha-icon icon="mdi:counter" style="--mdc-icon-size:14px"></ha-icon>
                ${S(y, 0)} L
              </span>` : u}
        </div>
      </div>
    `;
  }
  _renderQueue(e, t) {
    const a = e.hub.session;
    if (a?.state !== "running") return u;
    const i = N(a.attributes.queue).filter(
      (s) => !!s && typeof s == "object"
    );
    if (i.length === 0) return u;
    const n = f(a.attributes.active_zone_id);
    return l`
      <div class="queue">
        <div class="queue-title">${r(t, "queue.title")}</div>
        ${i.map((s, d) => {
      const c = f(s.state), p = n !== void 0 && s.zone_id === n || c === "watering" || c === "running", _ = m(s.duration_min);
      return l`
            <div class="queue-item ${p ? "active" : ""}">
              <span class="queue-index">${d + 1}.</span>
              <span class="queue-name">
                ${f(s.zone_name) ?? f(s.zone_id) ?? "?"}
              </span>
              ${_ !== void 0 ? l`<span class="queue-duration">
                    ${r(t, "queue.duration", { minutes: _ })}
                  </span>` : u}
              ${c ? l`<span class="queue-state">
                    ${tt(t, c)}
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
    const a = ge(t), i = U(t);
    this._model = i, this._relevantIds = i.entityIds, this._statesCount = Object.keys(t.states).length;
    const n = e.title ? l`<h1 class="card-title">${e.title}</h1>` : u;
    if (!i.found)
      return l`
        <ha-card>
          ${n}
          <div class="message">${r(a, "card.not_installed")}</div>
        </ha-card>
      `;
    const s = e.zones, d = s && s.length > 0 ? i.zones.filter((c) => s.includes(c.zoneId)) : i.zones;
    return l`
      <ha-card @imc-zone-action=${this._onZoneAction} @imc-global-action=${this._onGlobalAction}>
        ${n}
        ${e.show_header !== !1 ? this._renderHeader(i, a) : u}
        ${this._error ? l`<div class="error">${this._error}</div>` : u}
        ${e.show_queue !== !1 ? this._renderQueue(i, a) : u}
        ${d.length === 0 ? l`<div class="message">${r(a, "card.no_zones")}</div>` : d.map(
      (c) => l`
                <imc-zone-row
                  .zone=${c}
                  .language=${a}
                  .now=${this._now}
                  .compact=${e.compact === !0}
                  .showControls=${e.show_controls !== !1}
                  .weightedTemp=${m(i.hub.weightedTemp?.state)}
                ></imc-zone-row>
              `
    )}
        ${e.show_controls !== !1 ? l`<imc-global-controls
              .language=${a}
              .paused=${i.hub.pauseSwitch?.state === "on"}
              .hasPauseSwitch=${!!i.hub.pauseSwitch}
            ></imc-global-controls>` : u}
      </ha-card>
    `;
  }
};
yt.styles = w`
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
let oe = yt;
Ze([
  h({ attribute: !1 })
], oe.prototype, "hass");
Ze([
  x()
], oe.prototype, "_config");
Ze([
  x()
], oe.prototype, "_now");
Ze([
  x()
], oe.prototype, "_error");
$("irrigation-maestro-card", oe);
var Ta = Object.defineProperty, vi = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && Ta(e, t, i), i;
};
const Pa = [
  { key: "show_header", label: "editor.show_header", fallback: !0 },
  { key: "show_queue", label: "editor.show_queue", fallback: !0 },
  { key: "show_controls", label: "editor.show_controls", fallback: !0 },
  { key: "compact", label: "editor.compact", fallback: !1 }
], bt = class bt extends b {
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
    const t = e.currentTarget.value, a = { ...this._config };
    t ? a.title = t : delete a.title, this._emitConfig(a);
  }
  _onToggle(e, t) {
    if (!this._config) return;
    const a = t.currentTarget.checked;
    this._emitConfig({ ...this._config, [e]: a });
  }
  _onZoneToggle(e, t) {
    if (!this._config) return;
    const a = t.currentTarget.checked, i = new Set(this._config.zones ?? []);
    a ? i.add(e) : i.delete(e);
    const n = { ...this._config };
    i.size > 0 ? n.zones = [...i] : delete n.zones, this._emitConfig(n);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const a = ge(t), i = U(t).zones, n = new Set(e.zones ?? []);
    return l`
      <div class="form">
        <label class="field">
          ${r(a, "card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${r(a, "card_editor.title_placeholder")}
            @input=${this._onTitleInput}
          />
        </label>

        ${Pa.map(
      ({ key: s, label: d, fallback: c }) => l`
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${e[s] ?? c}
                @change=${(p) => this._onToggle(s, p)}
              />
              ${r(a, d)}
            </label>
          `
    )}

        <div class="zones">
          <span class="zones-title">${r(a, "editor.zones")}</span>
          ${i.length === 0 ? l`<span class="hint">${r(a, "editor.no_zones")}</span>` : l`
                ${i.map(
      (s) => l`
                    <label class="toggle">
                      <input
                        type="checkbox"
                        .checked=${n.has(s.zoneId)}
                        @change=${(d) => this._onZoneToggle(s.zoneId, d)}
                      />
                      ${s.name}
                    </label>
                  `
    )}
                <span class="hint">${r(a, "editor.zones_hint")}</span>
              `}
        </div>
      </div>
    `;
  }
};
bt.styles = w`
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
let ze = bt;
vi([
  h({ attribute: !1 })
], ze.prototype, "hass");
vi([
  x()
], ze.prototype, "_config");
$("irrigation-maestro-card-editor", ze);
const Ea = "irrigation_maestro", Na = 300 * 1e3;
function Qt(o) {
  const e = o.getFullYear(), t = String(o.getMonth() + 1).padStart(2, "0"), a = String(o.getDate()).padStart(2, "0");
  return `${e}-${t}-${a}`;
}
function Ma(o) {
  const t = N(o?.zones)[0];
  return {
    days: N(t?.days).map((i) => {
      const n = i;
      return {
        date: f(n.date) ?? "",
        l: m(n.l) ?? 0,
        est: n.est === !0,
        gap_s: m(n.gap_s) ?? 0
      };
    }),
    oldestRecorded: f(o?.oldest_recorded) ?? null,
    totalL: m(t?.total_l) ?? 0
  };
}
class je {
  constructor() {
    this._entries = /* @__PURE__ */ new Map();
  }
  static _key(e, t) {
    return `${e}|${t}`;
  }
  /** The fetched series, or null while one is in flight, after a failure, or before the first request. */
  get(e, t) {
    return this._entries.get(je._key(e, t))?.series ?? null;
  }
  /**
   * Fetch if one is owed. Safe to call on every update — that is the point.
   *
   * ``now`` and ``today`` are passed in rather than read from a clock here, so
   * the tests can drive both without freezing global time, the same division
   * of labour the Python engine modules use.
   */
  request(e, t, a, i, n) {
    const s = je._key(t, a), d = this._entries.get(s);
    if (d?.inFlight || d && i - d.attemptedAt < Na) return;
    const c = new Date(n.getTime()), p = new Date(n.getTime());
    p.setDate(p.getDate() - (a - 1));
    const _ = { attemptedAt: i, series: d?.series ?? null, inFlight: !0 };
    this._entries.set(s, _), e.callService(
      Ea,
      "get_water_history",
      { zone_id: t, start_date: Qt(p), end_date: Qt(c) },
      void 0,
      !1,
      !0
    ).then((g) => {
      this._entries.set(s, {
        attemptedAt: i,
        series: Ma(g.response),
        inFlight: !1
      });
    }).catch(() => {
      this._entries.set(s, { attemptedAt: i, series: null, inFlight: !1 });
    });
  }
}
var Da = Object.defineProperty, Te = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && Da(e, t, i), i;
};
function Ia(o) {
  return !o || o.verdict !== "blocked" || o.reason_key ? [] : N(o.programs).map((e) => e).filter((e) => e.verdict === "blocked");
}
function qa(o) {
  const e = o?.verdict;
  return e === "would_run" || e === "blocked" ? e : "unknown";
}
function Oa(o, e, t) {
  if (!e) return null;
  const a = Date.parse(e);
  if (Number.isNaN(a)) return null;
  const i = Math.max(0, Math.round((t - a) / 6e4));
  if (i < 1) return r(o, "next_run.age_now");
  if (i < 60) return r(o, "next_run.age_minutes", { n: i });
  const n = Math.round(i / 60);
  return n < 24 ? r(o, "next_run.age_hours", { n }) : r(o, "next_run.age_days", { n: Math.round(n / 24) });
}
const xt = class xt extends b {
  constructor() {
    super(...arguments), this.language = "en", this.now = Date.now();
  }
  _when() {
    if (!this.nextRun) return r(this.language, "next_run.none");
    const e = new Date(this.nextRun);
    if (Number.isNaN(e.getTime())) return r(this.language, "next_run.none");
    const t = e.toLocaleString(this.language, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
    return this.nextRunProgram ? `${t} — ${this.nextRunProgram}` : t;
  }
  _today() {
    const e = qa(this.verdict);
    if (e === "unknown")
      return l`<span class="value muted">${r(this.language, "next_run.not_evaluated")}</span>`;
    if (e === "would_run")
      return l`<span class="value">${r(this.language, "next_run.would_run")}</span>`;
    const t = f(this.verdict?.reason_key);
    return l`<span class="value"
      >${r(this.language, "next_run.blocked")}${t ? ` — ${k(this.language, "reason", t)}` : ""}</span
    >`;
  }
  render() {
    const e = Ia(this.verdict), t = Oa(this.language, this.verdict?.evaluated_at, this.now);
    return l`
      <div class="line">
        <span class="label">${r(this.language, "next_run.next")}</span>
        <span class="value">${this._when()}</span>
      </div>
      <div class="line">
        <span class="label">${r(this.language, "next_run.today")}</span>
        ${this._today()}
        ${t ? l`<span class="age">· ${t}</span>` : u}
      </div>
      ${e.length > 0 ? l`<ul>
            ${e.map(
      (a) => l`<li>
                  ${a.reason_key ? k(this.language, "reason", a.reason_key) : r(this.language, "next_run.blocked")}
                </li>`
    )}
          </ul>` : u}
    `;
  }
};
xt.styles = w`
    :host {
      display: block;
    }
    .line {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px;
      font-size: 13px;
      padding: 2px 0;
    }
    .label {
      color: var(--secondary-text-color, #727272);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      min-width: 74px;
    }
    .value {
      color: var(--primary-text-color);
    }
    .muted {
      color: var(--secondary-text-color, #727272);
    }
    .age {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
    }
    ul {
      margin: 2px 0 0;
      padding-left: 88px;
      list-style: none;
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    li::before {
      content: "· ";
    }
  `;
let H = xt;
Te([
  h()
], H.prototype, "nextRun");
Te([
  h()
], H.prototype, "nextRunProgram");
Te([
  h({ attribute: !1 })
], H.prototype, "verdict");
Te([
  h()
], H.prototype, "language");
Te([
  h({ attribute: !1 })
], H.prototype, "now");
$("imc-next-run-block", H);
const Ra = [
  "weekday.0",
  "weekday.1",
  "weekday.2",
  "weekday.3",
  "weekday.4",
  "weekday.5",
  "weekday.6"
];
function La(o, e) {
  const t = e.map((i) => Ra[i]).filter((i) => i !== void 0).map((i) => r(o, i));
  if (t.length <= 1) return t[0] ?? "";
  const a = t[t.length - 1];
  return `${t.slice(0, -1).join(", ")} ${r(o, "list.and")} ${a}`;
}
function ja(o) {
  const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(o);
  if (!e) return null;
  const [, t, a, i] = e, n = /* @__PURE__ */ new Date(`${t}-${a}-${i}T00:00:00Z`);
  return Number.isNaN(n.getTime()) ? null : `${i}/${a}`;
}
function Fa(o, e, t) {
  const a = r(o, "calendar.every_day");
  if (e?.mode === "weekdays") {
    const i = [...new Set(e.days ?? [])].filter((n) => n >= 0 && n <= 6).sort((n, s) => n - s);
    return i.length === 0 || i.length === 7 ? a : La(o, i);
  }
  if (e?.mode === "interval") {
    const i = e.interval_days ?? 1, n = i === 1 ? a : r(o, "calendar.interval", { n: i }), s = t ? ja(t) : null, d = s ? r(o, "calendar.last_completed", { date: s }) : r(o, "calendar.never_completed");
    return `${n} · ${d}`;
  }
  return e?.mode === "parity" ? r(
    o,
    e.parity === "even" ? "calendar.parity_even" : "calendar.parity_odd"
  ) : a;
}
function Ua(o, e) {
  return o.day_intensity_pct?.[String(e)] ?? o.intensity_pct ?? 100;
}
function Ha(o, e, t) {
  const a = ut(o.curve?.points), i = Ua(o, e) * t / 100;
  return dt(mi(a, hi, i, o.curve?.min, o.curve?.max));
}
var Ba = Object.defineProperty, Pe = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && Ba(e, t, i), i;
};
function Wa(o, e, t, a, i) {
  return e.map((n) => ({
    cycle: n,
    // Delivery, never the setting: the contract calls this out because the two
    // differ whenever the zone's adjustment is not 100%, and the list is
    // describing what gets watered.
    minutes: i === void 0 ? null : Math.round(Ha(n, t, a)),
    calendar: Fa(o, n.calendar, n.last_completed)
  }));
}
const wt = class wt extends b {
  constructor() {
    super(...arguments), this.cycles = [], this.adjustmentPct = 100, this.language = "en", this.showControls = !0;
  }
  _toggle(e) {
    this.dispatchEvent(
      new CustomEvent("imc-program-toggle", {
        detail: { cycleId: e.cycle_id, enabled: e.enabled === !1 },
        bubbles: !0,
        composed: !0
      })
    );
  }
  render() {
    if (this.cycles.length === 0)
      return l`<div class="empty">${r(this.language, "programs.none")}</div>`;
    const e = ((/* @__PURE__ */ new Date()).getDay() + 6) % 7, t = Wa(
      this.language,
      this.cycles,
      e,
      this.adjustmentPct,
      this.weightedTemp
    );
    return l`
      ${t.map(
      (a) => l`
          <div class="row ${a.cycle.enabled === !1 ? "off" : ""}">
            <span class="name">${a.cycle.name ?? a.cycle.cycle_id}</span>
            <span class="meta">${a.calendar}</span>
            <span class="minutes">
              ${a.minutes === null ? "—" : r(this.language, "programs.minutes", { n: a.minutes })}
            </span>
            ${this.showControls ? l`<button @click=${() => this._toggle(a.cycle)}>
                  ${r(
        this.language,
        a.cycle.enabled === !1 ? "programs.enable" : "programs.disable"
      )}
                </button>` : u}
          </div>
        `
    )}
    `;
  }
};
wt.styles = w`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 4px 0;
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
    }
    .row:first-child {
      border-top: none;
    }
    .name {
      font-size: 13px;
      color: var(--primary-text-color);
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      flex: 2 1 auto;
      min-width: 0;
    }
    .minutes {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      color: var(--primary-text-color);
    }
    .off {
      opacity: 0.55;
    }
    button {
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      border-radius: 12px;
      padding: 2px 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.35));
      background: transparent;
      color: var(--primary-text-color);
    }
    .empty {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
  `;
let B = wt;
Pe([
  h({ attribute: !1 })
], B.prototype, "cycles");
Pe([
  h({ attribute: !1 })
], B.prototype, "weightedTemp");
Pe([
  h({ type: Number })
], B.prototype, "adjustmentPct");
Pe([
  h()
], B.prototype, "language");
Pe([
  h({ type: Boolean })
], B.prototype, "showControls");
$("imc-programs-block", B);
var Va = Object.defineProperty, re = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && Va(e, t, i), i;
};
function Za(o, e) {
  const t = o ?? {}, a = [];
  for (const i of ["water_accounting", "leak_watch", "leak_detection", "water_supply"]) {
    const n = typeof t[i] == "string" ? t[i] : "unavailable", s = i === "leak_detection" ? "leak_candidate" : "supply_candidate";
    a.push({
      key: i,
      state: n,
      adoptable: n === "candidate_available" && !!e?.[s]
    });
  }
  return a;
}
const $t = class $t extends b {
  constructor() {
    super(...arguments), this.degraded = [], this.language = "en";
  }
  _adopt(e) {
    const t = e === "leak_detection" ? "leak_sensor" : "water_supply_sensor", a = e === "leak_detection" ? this.candidates?.leak_candidate : this.candidates?.supply_candidate;
    a && this.dispatchEvent(
      new CustomEvent("imc-adopt-sensor", {
        detail: { field: t, entityId: a },
        bubbles: !0,
        composed: !0
      })
    );
  }
  render() {
    const e = Za(this.capabilities, this.candidates);
    return l`
      ${e.map(
      (t) => l`
          <div class="row">
            <span class="label">${k(this.language, "capability", t.key)}</span>
            <span class="value ${t.state === "candidate_available" ? "hint" : ""}">
              ${k(this.language, "capability_state", t.state)}
            </span>
            ${t.adoptable ? l`<button @click=${() => this._adopt(t.key)}>
                  ${r(this.language, "hardware.adopt")}
                </button>` : u}
          </div>
        `
    )}
      ${this.batteryState !== void 0 ? l`<div class="row">
            <span class="label">${r(this.language, "hardware.battery")}</span>
            <span class="value">${this.batteryState}</span>
          </div>` : u}
      ${this.meterEntity ? l`<div class="meter">
            ${r(this.language, "hardware.meter")}: <code>${this.meterEntity}</code>
            ${this.degraded.includes("flow_unit_unknown") ? l` — ${r(this.language, "hardware.unit_unknown")}` : this.meterUnit ? l` — ${r(this.language, "hardware.unit_resolved", {
      unit: this.meterUnit
    })}` : u}
          </div>` : u}
    `;
  }
};
$t.styles = w`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 3px 0;
      font-size: 12px;
    }
    .label {
      color: var(--secondary-text-color, #727272);
      flex: 0 0 auto;
      min-width: 130px;
    }
    .value {
      color: var(--primary-text-color);
      flex: 1 1 auto;
    }
    .hint {
      color: var(--secondary-text-color, #727272);
      font-style: italic;
    }
    button {
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      border-radius: 12px;
      padding: 2px 8px;
      border: 1px solid var(--primary-color, #03a9f4);
      background: transparent;
      color: var(--primary-color, #03a9f4);
    }
    .meter {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      padding-top: 4px;
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.2));
      margin-top: 4px;
    }
    code {
      font-size: 11px;
    }
  `;
let O = $t;
re([
  h({ attribute: !1 })
], O.prototype, "capabilities");
re([
  h({ attribute: !1 })
], O.prototype, "candidates");
re([
  h({ attribute: !1 })
], O.prototype, "degraded");
re([
  h()
], O.prototype, "meterEntity");
re([
  h()
], O.prototype, "meterUnit");
re([
  h()
], O.prototype, "batteryState");
re([
  h()
], O.prototype, "language");
$("imc-hardware-block", O);
var Ga = Object.defineProperty, yi = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && Ga(e, t, i), i;
};
const Je = 320, Ie = 96, ht = 4, bi = 4, Fe = 6, Ka = 10, Ya = 3, Ue = {
  width: (o) => o - ht - bi,
  height: (o) => o - Fe - Ka
};
function Qa(o, e, t) {
  const a = o.days;
  if (a.length === 0) return [];
  const i = Ue.width(e), n = Ue.height(t), s = i / a.length, d = Math.max(s - Math.min(1, s * 0.15), s * 0.5), c = Math.max(...a.map((p) => p.l), 0);
  return a.map((p, _) => {
    const g = o.oldestRecorded !== null && p.date < o.oldestRecorded, v = g || c <= 0 ? 0 : p.l / c * n;
    return {
      date: p.date,
      x: ht + _ * s + (s - d) / 2,
      y: Fe + n - v,
      w: d,
      h: v,
      est: p.est,
      // Diagnostic #7: a day with six hours of unreadable meter must never
      // look like a quiet day, so the mark rides on gap_s alone.
      gap: p.gap_s > 0,
      unrecorded: g
    };
  });
}
const zt = class zt extends b {
  constructor() {
    super(...arguments), this.language = "en";
  }
  render() {
    const e = this.series;
    if (!e || e.days.length === 0)
      return l`<div class="empty">${r(this.language, "chart.no_data")}</div>`;
    const t = Qa(e, Je, Ie), a = Fe + Ue.height(Ie), i = t.some((d) => d.est), n = t.some((d) => d.gap), s = t.some((d) => d.unrecorded);
    return l`
      <svg viewBox="0 0 ${Je} ${Ie}" role="img"
           aria-label=${r(this.language, "chart.aria", {
      days: e.days.length,
      liters: S(e.totalL, 0) ?? "0"
    })}>
        <defs>
          <pattern id="imc-hatch" width="4" height="4" patternUnits="userSpaceOnUse"
                   patternTransform="rotate(45)">
            <line class="hatch-line" x1="0" y1="0" x2="0" y2="4"></line>
          </pattern>
        </defs>
        ${t.map(
      (d) => d.unrecorded ? q`<rect class="unrecorded" x=${d.x} y=${Fe}
                        width=${d.w} height=${Ue.height(Ie)}></rect>` : d.h > 0 ? q`<rect class="bar ${d.est ? "est" : ""}" x=${d.x} y=${d.y}
                          width=${d.w} height=${d.h}></rect>` : u
    )}
        <line class="baseline" x1=${ht} y1=${a}
              x2=${Je - bi} y2=${a}></line>
        ${t.filter((d) => d.gap).map(
      (d) => q`<rect class="gap" x=${d.x} y=${a + 1}
                        width=${d.w} height=${Ya}></rect>`
    )}
      </svg>
      <div class="legend">
        <span><i class="swatch"></i>${r(this.language, "chart.measured")}</span>
        ${i ? l`<span><i class="swatch est"></i>${r(this.language, "chart.estimated")}</span>` : u}
        ${n ? l`<span><i class="swatch gap"></i>${r(this.language, "chart.gap")}</span>` : u}
        ${s ? l`<span><i class="swatch unrecorded"></i>${r(
      this.language,
      "chart.unrecorded"
    )}</span>` : u}
      </div>
    `;
  }
};
zt.styles = w`
    :host {
      display: block;
      line-height: 0;
    }
    svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }
    .bar {
      fill: var(--primary-color, #03a9f4);
    }
    .bar.est {
      fill: url(#imc-hatch);
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 0.5;
    }
    .unrecorded {
      fill: var(--divider-color, rgba(127, 127, 127, 0.25));
    }
    .gap {
      fill: var(--warning-color, #ffa600);
    }
    .baseline {
      stroke: var(--divider-color, rgba(127, 127, 127, 0.4));
      stroke-width: 1;
    }
    .hatch-line {
      stroke: var(--primary-color, #03a9f4);
      stroke-width: 1.2;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      line-height: 1.4;
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      padding-top: 4px;
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .swatch {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      background: var(--primary-color, #03a9f4);
    }
    .swatch.est {
      background: repeating-linear-gradient(
        45deg,
        var(--primary-color, #03a9f4) 0 1.5px,
        transparent 1.5px 3px
      );
      box-shadow: inset 0 0 0 1px var(--primary-color, #03a9f4);
    }
    .swatch.gap {
      background: var(--warning-color, #ffa600);
      height: 3px;
      border-radius: 1px;
    }
    .swatch.unrecorded {
      background: var(--divider-color, rgba(127, 127, 127, 0.25));
    }
    .empty {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
      line-height: 1.4;
    }
  `;
let ke = zt;
yi([
  h({ attribute: !1 })
], ke.prototype, "series");
yi([
  h()
], ke.prototype, "language");
$("imc-water-chart", ke);
var Xa = Object.defineProperty, Ee = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && Xa(e, t, i), i;
};
function Ja(o, e) {
  return o !== "internal" ? !1 : e !== "unavailable";
}
const kt = class kt extends b {
  constructor() {
    super(...arguments), this.source = "internal", this.language = "en";
  }
  _figure(e, t) {
    return l`
      <div class="figure">
        <span class="figure-label">${r(this.language, e)}</span>
        <span class="figure-value">${S(t, 1) ?? "—"} L</span>
      </div>
    `;
  }
  render() {
    const e = this.water ?? void 0;
    return l`
      <div class="figures">
        ${this._figure("consumption.today", e?.today)}
        ${this._figure("consumption.month", e?.month)}
        ${this._figure("consumption.total", e?.total)}
        ${e?.estimated ? l`<span class="badge">${r(this.language, "consumption.estimated")}</span>` : u}
      </div>
      ${Ja(this.source, this.accounting) ? l`<imc-water-chart
            .series=${this.series ?? void 0}
            .language=${this.language}
          ></imc-water-chart>` : u}
    `;
  }
};
kt.styles = w`
    :host {
      display: block;
    }
    .figures {
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      padding-bottom: 6px;
    }
    .figure {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }
    .figure-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--secondary-text-color, #727272);
    }
    .figure-value {
      font-size: 15px;
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
    }
    .badge {
      align-self: center;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.14));
      color: var(--secondary-text-color, #727272);
    }
  `;
let W = kt;
Ee([
  h({ attribute: !1 })
], W.prototype, "water");
Ee([
  h({ attribute: !1 })
], W.prototype, "series");
Ee([
  h()
], W.prototype, "source");
Ee([
  h()
], W.prototype, "accounting");
Ee([
  h()
], W.prototype, "language");
$("imc-consumption-block", W);
var eo = Object.defineProperty, Ne = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && eo(e, t, i), i;
};
const ue = "irrigation_maestro", St = class St extends b {
  constructor() {
    super(...arguments), this._now = Date.now(), this._history = new je(), this._relevantIds = [], this._statesCount = 0, this._timerPeriod = 0;
  }
  /* ------------------------------------------------------------ */
  /* Custom-card API                                               */
  /* ------------------------------------------------------------ */
  static getConfigElement() {
    return document.createElement("irrigation-maestro-zone-card-editor");
  }
  /**
   * What the card picker inserts. Seeded with the first zone by order, so the
   * preview shows a real card rather than the missing-zone line.
   */
  static getStubConfig(e) {
    const t = e ? U(e).zones : [];
    return t.length > 0 ? { zone: t[0].zoneId } : {};
  }
  setConfig(e) {
    if (!e || typeof e != "object")
      throw new Error("Invalid configuration");
    this._config = { ...e };
  }
  getCardSize() {
    const e = this._config;
    if (!e) return 3;
    const t = ni.filter((a) => E(e, a)).length;
    return Math.max(3, t + (E(e, "consumption") ? 3 : 0));
  }
  /* ------------------------------------------------------------ */
  /* Update gating and the refresh timer                           */
  /* ------------------------------------------------------------ */
  shouldUpdate(e) {
    if (e.size === 1 && e.has("hass")) {
      const t = e.get("hass"), a = this.hass;
      return !t || !a || Object.keys(a.states).length !== this._statesCount ? !0 : this._relevantIds.some((n) => t.states[n] !== a.states[n]);
    }
    return !0;
  }
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
    const e = this._zone(), t = e?.state?.state === "watering" || e?.state?.state === "soaking";
    this.isConnected && this._ensureTimer(!!t);
    const a = this._config;
    this.hass && e && a && E(a, "consumption") && this._history.request(
      this.hass,
      e.zoneId,
      a.chart_days ?? 30,
      Date.now(),
      /* @__PURE__ */ new Date()
    ), this.hass && e && a && E(a, "hardware") && this._discoverSensors(e.zoneId);
  }
  /* ------------------------------------------------------------ */
  /* Services — every write in the card is here                    */
  /* ------------------------------------------------------------ */
  async _call(e, t, a) {
    const i = this.hass;
    if (i)
      try {
        await i.callService(e, t, a);
      } catch (n) {
        this._error = n instanceof Error ? n.message : String(n), this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
          this._error = void 0, this._errorTimer = void 0;
        }, 6e3);
      }
  }
  /**
   * Ask the backend which sensors this zone's own valve device offers.
   *
   * Once per zone, not per render: the answer changes only when hardware does.
   * The card never derives candidates by name — the contract forbids it, and
   * the backend's own tests carry a decoy whose id looks right and whose
   * device class is wrong.
   */
  _discoverSensors(e) {
    this._discoveredFor === e || !this.hass || (this._discoveredFor = e, this.hass.callService(ue, "discover_zone_sensors", { zone_id: e }, void 0, !1, !0).then((t) => {
      this._candidates = t.response ?? {};
    }).catch(() => {
      this._candidates = {};
    }));
  }
  _onProgramToggle(e) {
    const t = this._zone(), a = e.detail.cycleId, i = t?.cycleSwitches.find(
      (n) => f(n.attributes.cycle_id) === a
    );
    i && this._call("switch", e.detail.enabled ? "turn_on" : "turn_off", {
      entity_id: i.entity_id
    });
  }
  _onAdoptSensor(e) {
    const t = this._zone();
    t && this._call(ue, "update_zone", {
      zone_id: t.zoneId,
      [e.detail.field]: e.detail.entityId
    });
  }
  /* ------------------------------------------------------------ */
  /* Model                                                         */
  /* ------------------------------------------------------------ */
  _zone() {
    const e = this.hass, t = this._config?.zone;
    if (!(!e || !t))
      return U(e).zones.find((a) => a.zoneId === t);
  }
  /* ------------------------------------------------------------ */
  /* Render                                                        */
  /* ------------------------------------------------------------ */
  _renderState(e, t) {
    const a = ci(e), i = e.state?.state ?? "unknown", n = f(e.state?.attributes.run_started_at), s = m(e.state?.attributes.run_duration_min);
    let d = u;
    if (n && s) {
      const c = Math.max(0, (this._now - Date.parse(n)) / 6e4), p = Math.min(1, c / s);
      d = l`
        <div class="progress" role="progressbar" aria-valuenow=${Math.round(p * 100)}>
          <div class="progress-fill" style="width:${(p * 100).toFixed(1)}%"></div>
        </div>
        <span class="progress-text">
          ${r(t, "zone_card.remaining", {
        n: Math.max(0, Math.round(s - c))
      })}
        </span>
      `;
    }
    return l`
      <div class="status-row">
        <span class="status">${k(t, "zone_state", i)}</span>
        ${a.coverage === "alarm" ? l`<span
              class="chip alarm"
              title=${ct(t, r(t, "header.leak"), a, this._now)}
              >${r(t, "header.leak")}</span
            >` : u}
      </div>
      ${d}
    `;
  }
  _renderLastOutcome(e, t) {
    const a = e.lastOutcome;
    if (!a || T(a) || a.state === "none") return u;
    const i = f(a.attributes.reason_key), n = m(a.attributes.duration_min), s = m(a.attributes.volume_l);
    return l`
      <div class="line">
        <span class="label">${r(t, "zone.last_outcome")}</span>
        <span class="value">
          ${k(t, "outcome", a.state)}${i ? ` — ${k(t, "reason", i)}` : ""}
          ${n !== void 0 ? l`· ${n} min` : u}
          ${s !== void 0 ? l`· ${S(s, 1)} L` : u}
        </span>
      </div>
    `;
  }
  _renderActions(e, t) {
    return l`
      <div class="actions">
        <button @click=${() => this._call(ue, "run_zone", { zone_id: e.zoneId })}>
          ${r(t, "controls.run_now")}
        </button>
        <button @click=${() => this._call(ue, "skip_today", { zone_id: e.zoneId })}>
          ${r(t, "controls.skip_today")}
        </button>
        <button @click=${() => this._call(ue, "pause", { zone_id: e.zoneId, hours: 24 })}>
          ${r(t, "controls.pause_for") + " " + r(t, "controls.hours", { hours: 24 })}
        </button>
        <button @click=${() => this._call(ue, "resume", { zone_id: e.zoneId })}>
          ${r(t, "controls.resume")}
        </button>
      </div>
    `;
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const a = ge(t), i = U(t);
    this._relevantIds = i.entityIds, this._statesCount = Object.keys(t.states).length;
    const n = i.zones.find((_) => _.zoneId === e.zone);
    if (!n)
      return l`<ha-card
        ><div class="message">
          ${r(a, "zone_card.missing_zone", { id: e.zone ?? "—" })}
        </div></ha-card
      >`;
    const s = Ji(n), d = ui(n), c = n.state?.attributes.capabilities, p = N(n.state?.attributes.degraded).map((_) => f(_)).filter((_) => _ !== void 0);
    return l`
      <ha-card
        @imc-program-toggle=${this._onProgramToggle}
        @imc-adopt-sensor=${this._onAdoptSensor}
      >
        <h1 class="card-title">${e.title ?? n.name}</h1>
        ${this._error ? l`<div class="error">${this._error}</div>` : u}
        ${E(e, "state") ? l`<div class="block">${this._renderState(n, a)}</div>` : u}
        ${E(e, "next_run") ? l`<div class="block">
              <imc-next-run-block
                .nextRun=${T(n.nextRun) ? void 0 : n.nextRun?.state}
                .nextRunProgram=${f(n.nextRun?.attributes.cycle_name)}
                .verdict=${n.state?.attributes.next_run}
                .language=${a}
                .now=${this._now}
              ></imc-next-run-block>
            </div>` : u}
        ${E(e, "last_outcome") ? l`<div class="block">${this._renderLastOutcome(n, a)}</div>` : u}
        ${E(e, "programs") ? l`<div class="block">
              <div class="block-title">${r(a, "zone_card.programs")}</div>
              <imc-programs-block
                .cycles=${s}
                .language=${a}
                .adjustmentPct=${pi(n)}
                .weightedTemp=${m(i.hub.weightedTemp?.state)}
              ></imc-programs-block>
            </div>` : u}
        ${E(e, "hardware") ? l`<div class="block">
              <div class="block-title">${r(a, "zone_card.hardware")}</div>
              <imc-hardware-block
                .capabilities=${c}
                .candidates=${this._candidates}
                .degraded=${p}
                .meterEntity=${f(n.zone_water_total?.attributes.meter_entity)}
                .batteryState=${e.battery_entity ? t.states[e.battery_entity]?.state : void 0}
                .language=${a}
              ></imc-hardware-block>
            </div>` : u}
        ${E(e, "consumption") ? l`<div class="block">
              <div class="block-title">${r(a, "zone_card.consumption")}</div>
              <imc-consumption-block
                .water=${d}
                .series=${this._history.get(n.zoneId, e.chart_days ?? 30)}
                .source=${e.consumption_source ?? "internal"}
                .accounting=${f(c?.water_accounting)}
                .language=${a}
              ></imc-consumption-block>
            </div>` : u}
        ${E(e, "actions") ? l`<div class="block">${this._renderActions(n, a)}</div>` : u}
      </ha-card>
    `;
  }
};
St.styles = w`
    :host {
      display: block;
    }
    ha-card {
      overflow: hidden;
      color: var(--primary-text-color);
      padding-bottom: 8px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 500;
      line-height: 1.2;
      margin: 0;
      padding: 14px 16px 4px;
    }
    .block {
      padding: 8px 16px;
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.18));
    }
    .block:first-of-type {
      border-top: none;
    }
    .block-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 4px;
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
    .status-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
    .chip.alarm {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
      font-weight: 600;
    }
    .progress {
      position: relative;
      height: 6px;
      border-radius: 3px;
      margin-top: 6px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
      background: var(--primary-color, #03a9f4);
      transition: width 0.3s ease;
    }
    .progress-text {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
    }
    .line {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: baseline;
      font-size: 13px;
    }
    .label {
      color: var(--secondary-text-color, #727272);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      min-width: 74px;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    button {
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      border-radius: 14px;
      padding: 4px 10px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.35));
      background: transparent;
      color: var(--primary-text-color);
    }
    button:hover {
      border-color: var(--primary-color, #03a9f4);
    }
  `;
let V = St;
Ne([
  h({ attribute: !1 })
], V.prototype, "hass");
Ne([
  x()
], V.prototype, "_config");
Ne([
  x()
], V.prototype, "_now");
Ne([
  x()
], V.prototype, "_error");
Ne([
  x()
], V.prototype, "_candidates");
$("irrigation-maestro-zone-card", V);
var to = Object.defineProperty, Ge = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && to(e, t, i), i;
};
function io() {
  return typeof customElements < "u" && !!customElements.get("ha-selector");
}
const At = class At extends b {
  constructor() {
    super(...arguments), this.selector = { entity: {} }, this.value = "", this.label = "";
  }
  _emit(e) {
    this.value = e, this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: e }, bubbles: !0, composed: !0 })
    );
  }
  render() {
    return io() ? l`<ha-selector
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
At.styles = w`
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
let ne = At;
Ge([
  h({ attribute: !1 })
], ne.prototype, "hass");
Ge([
  h({ attribute: !1 })
], ne.prototype, "selector");
Ge([
  h()
], ne.prototype, "value");
Ge([
  h()
], ne.prototype, "label");
$("imc-entity-picker", ne);
var ao = Object.defineProperty, xi = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && ao(e, t, i), i;
};
const Ct = class Ct extends b {
  setConfig(e) {
    this._config = { ...e };
  }
  _emit(e) {
    this._config = e, this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  /** Set a key, or delete it when the value is the default — never write a default out. */
  _set(e, t, a) {
    if (!this._config) return;
    const i = { ...this._config };
    a ? delete i[e] : i[e] = t, this._emit(i);
  }
  _setBlock(e, t) {
    if (!this._config) return;
    const a = { ...this._config.blocks ?? {} };
    t ? delete a[e] : a[e] = !1;
    const i = { ...this._config };
    Object.keys(a).length > 0 ? i.blocks = a : delete i.blocks, this._emit(i);
  }
  _setSource(e) {
    if (!this._config) return;
    const t = { ...this._config };
    e === "internal" ? (delete t.consumption_source, delete t.total_entity, delete t.today_entity, delete t.month_entity) : t.consumption_source = "entity", this._emit(t);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const a = ge(t), i = U(t).zones, n = e.consumption_source ?? "internal";
    return l`
      <div class="form">
        <label class="field">
          ${r(a, "zone_card_editor.zone")}
          <select
            .value=${e.zone ?? ""}
            @change=${(s) => this._set("zone", s.currentTarget.value, !1)}
          >
            ${i.map(
      (s) => l`<option value=${s.zoneId} ?selected=${s.zoneId === e.zone}>
                  ${s.name}
                </option>`
    )}
          </select>
        </label>

        <label class="field">
          ${r(a, "zone_card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${r(a, "zone_card_editor.title_placeholder")}
            @input=${(s) => {
      const d = s.currentTarget.value;
      this._set("title", d, d === "");
    }}
          />
        </label>

        <div class="group">
          <span class="group-title">${r(a, "zone_card_editor.blocks")}</span>
          ${ni.map(
      (s) => l`
              <label class="toggle">
                <input
                  type="checkbox"
                  .checked=${E(e, s)}
                  @change=${(d) => this._setBlock(s, d.currentTarget.checked)}
                />
                ${k(a, "block", s)}
              </label>
            `
    )}
        </div>

        <label class="field">
          ${r(a, "zone_card_editor.chart_days")}
          <select
            @change=${(s) => {
      const d = Number(s.currentTarget.value);
      this._set("chart_days", d, d === 30);
    }}
          >
            ${Vi.map(
      (s) => l`<option value=${s} ?selected=${(e.chart_days ?? 30) === s}>
                  ${r(a, "zone_card_editor.days", { n: s })}
                </option>`
    )}
          </select>
        </label>

        <label class="field">
          ${r(a, "zone_card_editor.consumption_source")}
          <select
            @change=${(s) => this._setSource(
      s.currentTarget.value
    )}
          >
            <option value="internal" ?selected=${n === "internal"}>
              ${r(a, "zone_card_editor.source_internal")}
            </option>
            <option value="entity" ?selected=${n === "entity"}>
              ${r(a, "zone_card_editor.source_entity")}
            </option>
          </select>
        </label>

        ${n === "entity" ? l`
              ${[
      ["total_entity", "zone_card_editor.total_entity"],
      ["today_entity", "zone_card_editor.today_entity"],
      ["month_entity", "zone_card_editor.month_entity"]
    ].map(
      ([s, d]) => l`
                  <label class="field">
                    ${r(a, d)}
                    <imc-entity-picker
                      .hass=${t}
                      .value=${e[s] ?? ""}
                      .selector=${{ entity: { domain: "sensor" } }}
                      @value-changed=${(c) => this._set(s, c.detail.value, !c.detail.value)}
                    ></imc-entity-picker>
                  </label>
                `
    )}
            ` : u}

        <label class="field">
          ${r(a, "zone_card_editor.battery_entity")}
          <imc-entity-picker
            .hass=${t}
            .value=${e.battery_entity ?? ""}
            .selector=${{ entity: { domain: "sensor" } }}
            @value-changed=${(s) => this._set("battery_entity", s.detail.value, !s.detail.value)}
          ></imc-entity-picker>
          <span class="hint">${r(a, "zone_card_editor.battery_hint")}</span>
        </label>
      </div>
    `;
  }
};
Ct.styles = w`
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
    input[type="text"],
    select {
      font: inherit;
      font-size: 14px;
      color: var(--primary-text-color);
      background: var(--card-background-color, transparent);
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.3));
      border-radius: 6px;
      padding: 8px 10px;
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
    .group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .group-title {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
    .hint {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
    }
  `;
let Se = Ct;
xi([
  h({ attribute: !1 })
], Se.prototype, "hass");
xi([
  x()
], Se.prototype, "_config");
$("irrigation-maestro-zone-card-editor", Se);
const oo = [
  "temp_d3",
  "temp_d2",
  "temp_d1",
  "temp_today_eff",
  "temp_tomorrow"
];
function no(o, e) {
  const t = Array.isArray(e) ? e : [];
  return oo.map((a, i) => {
    const n = o?.[a], s = typeof n == "number" ? n : null, d = typeof t[i] == "number" ? t[i] : null;
    return { key: a, value: s, weight: d, missing: s === null };
  });
}
function so(o) {
  return o.every((e) => !e.missing);
}
function ro(o) {
  if (!o) return { verdict: "unchecked", silentEvents: [], unreachable: [] };
  const e = Array.isArray(o.enabled_without_target) ? o.enabled_without_target.map(String) : [], t = o.unreachable ?? {}, a = Object.keys(t), i = o.verdict;
  return { verdict: i === "mute" || i === "muted" ? "muted" : e.length > 0 || a.length > 0 ? "partial" : "ok", silentEvents: e, unreachable: a };
}
function lo(o, e) {
  switch (e.verdict) {
    case "muted":
      return r(o, "health.notifications_muted");
    case "partial":
      return r(o, "health.notifications_partial", {
        n: e.silentEvents.length + e.unreachable.length
      });
    case "unchecked":
      return r(o, "health.notifications_unchecked");
    default:
      return r(o, "health.notifications_ok");
  }
}
var co = Object.defineProperty, G = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && co(e, t, i), i;
};
const Tt = class Tt extends b {
  constructor() {
    super(...arguments), this.evaluated = !1, this.language = "en";
  }
  _verdict() {
    if (!this.evaluated)
      return l`<div class="verdict muted">
        ${r(this.language, "hub_card.not_evaluated")}
      </div>`;
    const e = this.skipReason;
    return l`<div class="verdict">
      ${r(this.language, e ? "hub_card.will_skip" : "hub_card.will_water")}
      ${e ? l`<span class="reason">— ${k(this.language, "reason", e)}</span>` : u}
    </div>`;
  }
  _rain() {
    const e = this.language, t = [
      [r(e, "decision.day_today"), m(this.budgetAttrs?.rain_today)],
      [r(e, "decision.day_d1"), m(this.budgetAttrs?.rain_d1)],
      [r(e, "decision.day_d2"), m(this.budgetAttrs?.rain_d2)],
      [r(e, "decision.day_d3"), m(this.budgetAttrs?.rain_d3)]
    ], a = m(this.budgetAttrs?.forecast_credit);
    return l`
      <div class="section">
        <div class="section-title">${r(e, "decision.rain")}</div>
        ${t.map(
      ([i, n]) => l`
            <div class="row">
              <span class="name">${i}</span>
              <span class="num">${S(n, 2) ?? "—"} mm</span>
            </div>
          `
    )}
        <div class="row">
          <span class="name">${r(e, "decision.forecast_credit")}</span>
          <span class="num">${S(a, 2) ?? "—"} mm</span>
        </div>
      </div>
    `;
  }
  _temperature() {
    const e = this.language, t = no(this.tempAttrs, this.tempAttrs?.temp_weights), a = {
      temp_d3: r(e, "decision.day_d3"),
      temp_d2: r(e, "decision.day_d2"),
      temp_d1: r(e, "decision.day_d1"),
      temp_today_eff: r(e, "decision.day_today"),
      temp_tomorrow: r(e, "decision.day_tomorrow")
    };
    return l`
      <div class="section">
        <div class="section-title">
          ${r(e, "decision.weighted_temp")}:
          ${S(this.weightedTemp, 1) ?? "—"} °C
        </div>
        ${t.map(
      (i) => l`
            <div class="row ${i.missing ? "missing" : ""}">
              <span class="name">${a[i.key] ?? i.key}</span>
              <span class="num">
                ${i.missing ? r(e, "decision.missing_day") : `${S(i.value ?? void 0, 1)} °C`}
              </span>
              <span class="weight">
                ${i.missing || i.weight === null ? "" : `${Math.round(i.weight * 100)}%`}
              </span>
            </div>
          `
    )}
        ${so(t) ? u : l`<div class="note">${r(e, "decision.weights_note")}</div>`}
      </div>
    `;
  }
  render() {
    return l`
      ${this._verdict()}
      <imc-budget-meter
        .budget=${this.budget}
        .threshold=${this.threshold}
        .language=${this.language}
        wide
      ></imc-budget-meter>
      ${this.evaluated ? l`${this._rain()} ${this._temperature()}` : u}
    `;
  }
};
Tt.styles = w`
    :host {
      display: block;
    }
    .verdict {
      font-size: 15px;
      padding-bottom: 6px;
      color: var(--primary-text-color);
    }
    .verdict .reason {
      color: var(--secondary-text-color, #727272);
      font-size: 13px;
    }
    .muted {
      color: var(--secondary-text-color, #727272);
    }
    .section {
      padding-top: 8px;
    }
    .section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      color: var(--secondary-text-color, #727272);
      padding-bottom: 2px;
    }
    .row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 12px;
      padding: 1px 0;
    }
    .row .name {
      flex: 1 1 auto;
      color: var(--secondary-text-color, #727272);
    }
    .row .num {
      font-variant-numeric: tabular-nums;
      color: var(--primary-text-color);
    }
    .row .weight {
      font-variant-numeric: tabular-nums;
      color: var(--secondary-text-color, #727272);
      min-width: 42px;
      text-align: right;
    }
    .row.missing .name,
    .row.missing .num {
      text-decoration: line-through;
      opacity: 0.7;
    }
    .note {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      padding-top: 4px;
      font-style: italic;
    }
  `;
let D = Tt;
G([
  h({ attribute: !1 })
], D.prototype, "budget");
G([
  h({ attribute: !1 })
], D.prototype, "threshold");
G([
  h({ attribute: !1 })
], D.prototype, "budgetAttrs");
G([
  h({ attribute: !1 })
], D.prototype, "tempAttrs");
G([
  h({ attribute: !1 })
], D.prototype, "weightedTemp");
G([
  h()
], D.prototype, "skipReason");
G([
  h({ type: Boolean })
], D.prototype, "evaluated");
G([
  h()
], D.prototype, "language");
$("imc-decision-block", D);
var uo = Object.defineProperty, K = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && uo(e, t, i), i;
};
const Pt = class Pt extends b {
  constructor() {
    super(...arguments), this.staleWeather = !1, this.language = "en";
  }
  _test() {
    this.dispatchEvent(new CustomEvent("imc-test-notification", { bubbles: !0, composed: !0 }));
  }
  render() {
    const e = this.language, t = ro(this.notifications), a = this.leak?.coverage === "alarm" ? l`<span class="value warn">${r(e, "header.leak")}</span>` : (
      // Never a tick: unavailable means nothing was established, and the
      // hub has no degraded list to say why.
      l`<span class="value">${r(e, "health.leak_nothing")}</span>`
    );
    return l`
      <div class="row">
        <span class="label">${r(e, "health.weather_source")}</span>
        <span class="value">
          ${this.weatherEntity ? l`<code>${this.weatherEntity}</code>` : "—"}
          ${this.staleWeather ? l`<span class="warn">— ${r(e, "health.weather_stale")}</span>` : u}
        </span>
      </div>

      <div class="row">
        <span class="label">${r(e, "health.notifications")}</span>
        <span class="value ${t.verdict === "ok" ? "" : "warn"}">
          ${lo(e, t)}
        </span>
        <button @click=${this._test}>${r(e, "health.test_notification")}</button>
      </div>
      ${t.silentEvents.length > 0 ? l`<ul>
            ${t.silentEvents.map(
      (i) => l`<li>${i} — ${r(e, "health.silent_events")}</li>`
    )}
          </ul>` : u}
      ${t.unreachable.length > 0 ? l`<ul>
            ${t.unreachable.map(
      (i) => l`<li>${i} — ${r(e, "health.unreachable")}</li>`
    )}
          </ul>` : u}

      <div class="row">
        <span class="label">${r(e, "health.system_leak")}</span>
        ${a}
      </div>

      ${this.unattributedTotal !== void 0 ? l`<div class="row">
              <span class="label">${r(e, "health.unattributed")}</span>
              <span class="value">
                ${S(this.unattributedTotal, 1)} L
                ${this.unattributedClosed !== void 0 ? l`${r(e, "health.closed_subset", {
      liters: S(this.unattributedClosed, 1) ?? "0"
    })}` : u}
              </span>
            </div>
            <div class="row">
              <span class="label"></span>
              <span class="note">${r(e, "health.unattributed_note")}</span>
            </div>` : u}

      ${this.budgetLeft !== void 0 ? l`<div class="row">
            <span class="label">${r(e, "health.budget_left")}</span>
            <span class="value">${S(this.budgetLeft, 0)} L</span>
          </div>` : u}
    `;
  }
};
Pt.styles = w`
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 12px;
      padding: 3px 0;
    }
    .label {
      color: var(--secondary-text-color, #727272);
      flex: 0 0 auto;
      min-width: 140px;
    }
    .value {
      color: var(--primary-text-color);
      flex: 1 1 auto;
    }
    .warn {
      color: var(--warning-color, #ffa600);
    }
    .note {
      font-size: 11px;
      font-style: italic;
      color: var(--secondary-text-color, #727272);
    }
    ul {
      margin: 2px 0 0;
      padding-left: 148px;
      list-style: none;
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
    }
    li::before {
      content: "· ";
    }
    button {
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      border-radius: 12px;
      padding: 2px 8px;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.35));
      background: transparent;
      color: var(--primary-text-color);
    }
    code {
      font-size: 11px;
    }
  `;
let I = Pt;
K([
  h()
], I.prototype, "weatherEntity");
K([
  h({ type: Boolean })
], I.prototype, "staleWeather");
K([
  h({ attribute: !1 })
], I.prototype, "notifications");
K([
  h({ attribute: !1 })
], I.prototype, "leak");
K([
  h({ attribute: !1 })
], I.prototype, "unattributedTotal");
K([
  h({ attribute: !1 })
], I.prototype, "unattributedClosed");
K([
  h({ attribute: !1 })
], I.prototype, "budgetLeft");
K([
  h()
], I.prototype, "language");
$("imc-health-block", I);
var po = Object.defineProperty, Ke = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && po(e, t, i), i;
};
const Xt = "irrigation_maestro", ho = 300 * 1e3, Et = class Et extends b {
  constructor() {
    super(...arguments), this._relevantIds = [], this._statesCount = 0, this._notificationsAt = 0, this._notificationsInFlight = !1;
  }
  static getConfigElement() {
    return document.createElement("irrigation-maestro-hub-card-editor");
  }
  static getStubConfig() {
    return {};
  }
  setConfig(e) {
    if (!e || typeof e != "object") throw new Error("Invalid configuration");
    this._config = { ...e };
  }
  getCardSize() {
    const e = this._config;
    return e ? si.filter((t) => ee(e, t)).length + 2 : 4;
  }
  shouldUpdate(e) {
    if (e.size === 1 && e.has("hass")) {
      const t = e.get("hass"), a = this.hass;
      return !t || !a || Object.keys(a.states).length !== this._statesCount ? !0 : this._relevantIds.some((i) => t.states[i] !== a.states[i]);
    }
    return !0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._errorTimer !== void 0 && (window.clearTimeout(this._errorTimer), this._errorTimer = void 0);
  }
  updated() {
    const e = this._config;
    this.hass && e && ee(e, "health") && this._refreshNotifications(Date.now());
  }
  /**
   * Ask what the notification configuration would actually deliver.
   *
   * From `updated()`, never from `render()`, and rate-limited — the same rule
   * the history cache follows, for the same reason. A failed call ages exactly
   * like a successful one, so a hub that is down is asked once rather than on
   * every frame, and the block degrades to "could not be checked" rather than
   * to "fine".
   */
  _refreshNotifications(e) {
    this._notificationsInFlight || this._notifications !== void 0 && e - this._notificationsAt < ho || this.hass && (this._notificationsInFlight = !0, this._notificationsAt = e, this.hass.callService(Xt, "notification_status", {}, void 0, !1, !0).then((t) => {
      this._notifications = t.response ?? null;
    }).catch(() => {
      this._notifications = null;
    }).finally(() => {
      this._notificationsInFlight = !1;
    }));
  }
  async _call(e, t) {
    const a = this.hass;
    if (a)
      try {
        await a.callService(Xt, e, t);
      } catch (i) {
        this._error = i instanceof Error ? i.message : String(i), this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
          this._error = void 0, this._errorTimer = void 0;
        }, 6e3);
      }
  }
  _onGlobalAction(e) {
    const t = this.hass ? U(this.hass).hub : void 0;
    switch (e.detail.action) {
      case "run_all":
        this._call("run_all");
        break;
      case "stop_all":
        this._call("stop_all");
        break;
      case "evaluate":
        this._call("evaluate");
        break;
      case "set-pause": {
        const a = t?.pauseSwitch?.entity_id;
        a && this.hass && this.hass.callService("switch", e.detail.paused ? "turn_on" : "turn_off", {
          entity_id: a
        });
        break;
      }
    }
  }
  _renderSession(e, t) {
    const a = e.hub.session, i = N(a?.attributes.queue).filter(
      (s) => !!s && typeof s == "object"
    ), n = f(a?.attributes.active_zone_id);
    return l`
      <div class="session-state">
        ${a ? tt(t, a.state) : "—"}
      </div>
      ${i.length > 0 ? l`<div class="queue">
            ${i.map(
      (s, d) => l`
                <div class="queue-item ${s.zone_id === n ? "active" : ""}">
                  <span class="idx">${d + 1}.</span>
                  <span class="qname">${f(s.zone_name) ?? "?"}</span>
                  ${m(s.duration_min) !== void 0 ? l`<span class="qmeta">${m(s.duration_min)} min</span>` : u}
                  ${f(s.state) ? l`<span class="qmeta">${tt(t, f(s.state))}</span>` : u}
                </div>
              `
    )}
          </div>` : u}
    `;
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const a = ge(t), i = U(t);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(t.states).length, !i.found)
      return l`<ha-card
        ><div class="message">${r(a, "hub_card.not_installed")}</div></ha-card
      >`;
    const n = i.hub, s = T(n.waterBudget) ? void 0 : m(n.waterBudget?.state), d = T(n.skipThreshold) ? void 0 : m(n.skipThreshold?.state), c = n.weightedTemp?.attributes.temp_today_eff !== void 0;
    return l`
      <ha-card @imc-global-action=${this._onGlobalAction} @imc-test-notification=${() => this._call("test_notification")}>
        ${e.title ? l`<h1 class="card-title">${e.title}</h1>` : u}
        ${this._error ? l`<div class="error">${this._error}</div>` : u}

        ${ee(e, "session") ? l`<div class="block">
              <div class="block-title">${r(a, "hub_card.session")}</div>
              ${this._renderSession(i, a)}
            </div>` : u}

        ${ee(e, "decision") ? l`<div class="block">
              <div class="block-title">${r(a, "hub_card.decision")}</div>
              <imc-decision-block
                .budget=${s}
                .threshold=${d}
                .budgetAttrs=${n.waterBudget?.attributes}
                .tempAttrs=${n.weightedTemp?.attributes}
                .weightedTemp=${m(n.weightedTemp?.state)}
                .skipReason=${f(n.session?.attributes.skip_reason)}
                .evaluated=${c}
                .language=${a}
              ></imc-decision-block>
            </div>` : u}

        ${ee(e, "health") ? l`<div class="block">
              <div class="block-title">${r(a, "hub_card.health")}</div>
              <imc-health-block
                .weatherEntity=${f(n.weightedTemp?.attributes.weather_entity)}
                .staleWeather=${n.weightedTemp?.attributes.stale_weather === !0}
                .notifications=${this._notifications}
                .leak=${di(n)}
                .unattributedTotal=${m(n.unattributedWater?.state)}
                .unattributedClosed=${m(n.unattributedWater?.attributes.closed_l)}
                .budgetLeft=${T(n.consumptionLeft) ? void 0 : m(n.consumptionLeft?.state)}
                .language=${a}
              ></imc-health-block>
            </div>` : u}

        ${ee(e, "actions") ? l`<div class="block">
              <imc-global-controls
                .language=${a}
                .paused=${n.pauseSwitch?.state === "on"}
                .hasPauseSwitch=${!!n.pauseSwitch}
              ></imc-global-controls>
            </div>` : u}
      </ha-card>
    `;
  }
};
Et.styles = w`
    :host {
      display: block;
    }
    ha-card {
      overflow: hidden;
      color: var(--primary-text-color);
      padding-bottom: 8px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 500;
      margin: 0;
      padding: 14px 16px 4px;
    }
    .block {
      padding: 8px 16px;
      border-top: 1px solid var(--divider-color, rgba(127, 127, 127, 0.18));
    }
    .block:first-of-type {
      border-top: none;
    }
    .block-title {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--secondary-text-color, #727272);
      margin-bottom: 4px;
    }
    .message {
      padding: 16px;
      font-size: 13px;
      color: var(--secondary-text-color, #727272);
    }
    .error {
      margin: 0 16px 8px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--error-color, #db4437);
      color: var(--text-primary-color, #fff);
    }
    .session-state {
      font-size: 14px;
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
    .idx {
      color: var(--secondary-text-color, #727272);
      font-variant-numeric: tabular-nums;
    }
    .qname {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .qmeta {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      white-space: nowrap;
    }
  `;
let se = Et;
Ke([
  h({ attribute: !1 })
], se.prototype, "hass");
Ke([
  x()
], se.prototype, "_config");
Ke([
  x()
], se.prototype, "_error");
Ke([
  x()
], se.prototype, "_notifications");
$("irrigation-maestro-hub-card", se);
var _o = Object.defineProperty, wi = (o, e, t, a) => {
  for (var i = void 0, n = o.length - 1, s; n >= 0; n--)
    (s = o[n]) && (i = s(e, t, i) || i);
  return i && _o(e, t, i), i;
};
const Nt = class Nt extends b {
  setConfig(e) {
    this._config = { ...e };
  }
  _emit(e) {
    this._config = e, this.dispatchEvent(
      new CustomEvent("config-changed", { detail: { config: e }, bubbles: !0, composed: !0 })
    );
  }
  _setBlock(e, t) {
    if (!this._config) return;
    const a = { ...this._config.blocks ?? {} };
    t ? delete a[e] : a[e] = !1;
    const i = { ...this._config };
    Object.keys(a).length > 0 ? i.blocks = a : delete i.blocks, this._emit(i);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const a = ge(t);
    return l`
      <div class="form">
        <label class="field">
          ${r(a, "hub_card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            @input=${(i) => {
      const n = i.currentTarget.value, s = { ...e };
      n ? s.title = n : delete s.title, this._emit(s);
    }}
          />
        </label>

        <div class="group">
          <span class="group-title">${r(a, "hub_card_editor.blocks")}</span>
          ${si.map(
      (i) => l`
              <label class="toggle">
                <input
                  type="checkbox"
                  .checked=${ee(e, i)}
                  @change=${(n) => this._setBlock(i, n.currentTarget.checked)}
                />
                ${k(a, "hub_block", i)}
              </label>
            `
    )}
        </div>
      </div>
    `;
  }
};
Nt.styles = w`
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
    .group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .group-title {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
  `;
let Ae = Nt;
wi([
  h({ attribute: !1 })
], Ae.prototype, "hass");
wi([
  x()
], Ae.prototype, "_config");
$("irrigation-maestro-hub-card-editor", Ae);
const mo = "https://github.com/jmbriccola/ha-irrigation-configurable";
window.customCards = window.customCards ?? [];
for (const o of [
  {
    type: "irrigation-maestro-card",
    name: C["card.name"],
    description: C["card.description"]
  },
  {
    type: "irrigation-maestro-zone-card",
    name: C["zone_card.name"],
    description: C["zone_card.description"]
  },
  {
    type: "irrigation-maestro-hub-card",
    name: C["hub_card.name"],
    description: C["hub_card.description"]
  }
])
  window.customCards.some((e) => e.type === o.type) || window.customCards.push({ ...o, preview: !0, documentationURL: mo });
