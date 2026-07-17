/*!
 * irrigation-maestro-card
 * Custom Lovelace card for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const te = globalThis, he = te.ShadowRoot && (te.ShadyCSS === void 0 || te.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, fe = /* @__PURE__ */ Symbol(), Ae = /* @__PURE__ */ new WeakMap();
let Le = class {
  constructor(e, t, o) {
    if (this._$cssResult$ = !0, o !== fe) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (he && e === void 0) {
      const o = t !== void 0 && t.length === 1;
      o && (e = Ae.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), o && Ae.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Xe = (n) => new Le(typeof n == "string" ? n : n + "", void 0, fe), W = (n, ...e) => {
  const t = n.length === 1 ? n[0] : e.reduce((o, s, i) => o + ((r) => {
    if (r._$cssResult$ === !0) return r.cssText;
    if (typeof r == "number") return r;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + r + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s) + n[i + 1], n[0]);
  return new Le(t, n, fe);
}, Je = (n, e) => {
  if (he) n.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const o = document.createElement("style"), s = te.litNonce;
    s !== void 0 && o.setAttribute("nonce", s), o.textContent = t.cssText, n.appendChild(o);
  }
}, Se = he ? (n) => n : (n) => n instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const o of e.cssRules) t += o.cssText;
  return Xe(t);
})(n) : n;
const { is: Ye, defineProperty: et, getOwnPropertyDescriptor: tt, getOwnPropertyNames: ot, getOwnPropertySymbols: st, getPrototypeOf: nt } = Object, ie = globalThis, ke = ie.trustedTypes, it = ke ? ke.emptyScript : "", rt = ie.reactiveElementPolyfillSupport, j = (n, e) => n, oe = { toAttribute(n, e) {
  switch (e) {
    case Boolean:
      n = n ? it : null;
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
} }, _e = (n, e) => !Ye(n, e), Ee = { attribute: !0, type: String, converter: oe, reflect: !1, useDefault: !1, hasChanged: _e };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), ie.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let I = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Ee) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const o = /* @__PURE__ */ Symbol(), s = this.getPropertyDescriptor(e, o, t);
      s !== void 0 && et(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, t, o) {
    const { get: s, set: i } = tt(this.prototype, e) ?? { get() {
      return this[t];
    }, set(r) {
      this[t] = r;
    } };
    return { get: s, set(r) {
      const l = s?.call(this);
      i?.call(this, r), this.requestUpdate(e, l, o);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Ee;
  }
  static _$Ei() {
    if (this.hasOwnProperty(j("elementProperties"))) return;
    const e = nt(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(j("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(j("properties"))) {
      const t = this.properties, o = [...ot(t), ...st(t)];
      for (const s of o) this.createProperty(s, t[s]);
    }
    const e = this[Symbol.metadata];
    if (e !== null) {
      const t = litPropertyMetadata.get(e);
      if (t !== void 0) for (const [o, s] of t) this.elementProperties.set(o, s);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [t, o] of this.elementProperties) {
      const s = this._$Eu(t, o);
      s !== void 0 && this._$Eh.set(s, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(e) {
    const t = [];
    if (Array.isArray(e)) {
      const o = new Set(e.flat(1 / 0).reverse());
      for (const s of o) t.unshift(Se(s));
    } else e !== void 0 && t.push(Se(e));
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
    return Je(e, this.constructor.elementStyles), e;
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
    const o = this.constructor.elementProperties.get(e), s = this.constructor._$Eu(e, o);
    if (s !== void 0 && o.reflect === !0) {
      const i = (o.converter?.toAttribute !== void 0 ? o.converter : oe).toAttribute(t, o.type);
      this._$Em = e, i == null ? this.removeAttribute(s) : this.setAttribute(s, i), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const o = this.constructor, s = o._$Eh.get(e);
    if (s !== void 0 && this._$Em !== s) {
      const i = o.getPropertyOptions(s), r = typeof i.converter == "function" ? { fromAttribute: i.converter } : i.converter?.fromAttribute !== void 0 ? i.converter : oe;
      this._$Em = s;
      const l = r.fromAttribute(t, i.type);
      this[s] = l ?? this._$Ej?.get(s) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, t, o, s = !1, i) {
    if (e !== void 0) {
      const r = this.constructor;
      if (s === !1 && (i = this[e]), o ??= r.getPropertyOptions(e), !((o.hasChanged ?? _e)(i, t) || o.useDefault && o.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(r._$Eu(e, o)))) return;
      this.C(e, t, o);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: o, reflect: s, wrapped: i }, r) {
    o && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, r ?? t ?? this[e]), i !== !0 || r !== void 0) || (this._$AL.has(e) || (this.hasUpdated || o || (t = void 0), this._$AL.set(e, t)), s === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [s, i] of this._$Ep) this[s] = i;
        this._$Ep = void 0;
      }
      const o = this.constructor.elementProperties;
      if (o.size > 0) for (const [s, i] of o) {
        const { wrapped: r } = i, l = this[s];
        r !== !0 || this._$AL.has(s) || l === void 0 || this.C(s, void 0, i, l);
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
I.elementStyles = [], I.shadowRootOptions = { mode: "open" }, I[j("elementProperties")] = /* @__PURE__ */ new Map(), I[j("finalized")] = /* @__PURE__ */ new Map(), rt?.({ ReactiveElement: I }), (ie.reactiveElementVersions ??= []).push("2.1.2");
const me = globalThis, Ce = (n) => n, se = me.trustedTypes, Pe = se ? se.createPolicy("lit-html", { createHTML: (n) => n }) : void 0, je = "$lit$", A = `lit$${Math.random().toFixed(9).slice(2)}$`, Be = "?" + A, at = `<${Be}>`, C = document, B = () => C.createComment(""), F = (n) => n === null || typeof n != "object" && typeof n != "function", ge = Array.isArray, lt = (n) => ge(n) || typeof n?.[Symbol.iterator] == "function", de = `[ 	
\f\r]`, H = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Te = /-->/g, Me = />/g, S = RegExp(`>|${de}(?:([^\\s"'>=/]+)(${de}*=${de}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Ne = /'/g, Ie = /"/g, Fe = /^(?:script|style|textarea|title)$/i, Ve = (n) => (e, ...t) => ({ _$litType$: n, strings: e, values: t }), d = Ve(1), X = Ve(2), O = /* @__PURE__ */ Symbol.for("lit-noChange"), c = /* @__PURE__ */ Symbol.for("lit-nothing"), Oe = /* @__PURE__ */ new WeakMap(), k = C.createTreeWalker(C, 129);
function Ze(n, e) {
  if (!ge(n) || !n.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Pe !== void 0 ? Pe.createHTML(e) : e;
}
const ct = (n, e) => {
  const t = n.length - 1, o = [];
  let s, i = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", r = H;
  for (let l = 0; l < t; l++) {
    const a = n[l];
    let p, f, h = -1, _ = 0;
    for (; _ < a.length && (r.lastIndex = _, f = r.exec(a), f !== null); ) _ = r.lastIndex, r === H ? f[1] === "!--" ? r = Te : f[1] !== void 0 ? r = Me : f[2] !== void 0 ? (Fe.test(f[2]) && (s = RegExp("</" + f[2], "g")), r = S) : f[3] !== void 0 && (r = S) : r === S ? f[0] === ">" ? (r = s ?? H, h = -1) : f[1] === void 0 ? h = -2 : (h = r.lastIndex - f[2].length, p = f[1], r = f[3] === void 0 ? S : f[3] === '"' ? Ie : Ne) : r === Ie || r === Ne ? r = S : r === Te || r === Me ? r = H : (r = S, s = void 0);
    const m = r === S && n[l + 1].startsWith("/>") ? " " : "";
    i += r === H ? a + at : h >= 0 ? (o.push(p), a.slice(0, h) + je + a.slice(h) + A + m) : a + A + (h === -2 ? l : m);
  }
  return [Ze(n, i + (n[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), o];
};
class V {
  constructor({ strings: e, _$litType$: t }, o) {
    let s;
    this.parts = [];
    let i = 0, r = 0;
    const l = e.length - 1, a = this.parts, [p, f] = ct(e, t);
    if (this.el = V.createElement(p, o), k.currentNode = this.el.content, t === 2 || t === 3) {
      const h = this.el.content.firstChild;
      h.replaceWith(...h.childNodes);
    }
    for (; (s = k.nextNode()) !== null && a.length < l; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const h of s.getAttributeNames()) if (h.endsWith(je)) {
          const _ = f[r++], m = s.getAttribute(h).split(A), y = /([.?@])?(.*)/.exec(_);
          a.push({ type: 1, index: i, name: y[2], strings: m, ctor: y[1] === "." ? ut : y[1] === "?" ? pt : y[1] === "@" ? ht : re }), s.removeAttribute(h);
        } else h.startsWith(A) && (a.push({ type: 6, index: i }), s.removeAttribute(h));
        if (Fe.test(s.tagName)) {
          const h = s.textContent.split(A), _ = h.length - 1;
          if (_ > 0) {
            s.textContent = se ? se.emptyScript : "";
            for (let m = 0; m < _; m++) s.append(h[m], B()), k.nextNode(), a.push({ type: 2, index: ++i });
            s.append(h[_], B());
          }
        }
      } else if (s.nodeType === 8) if (s.data === Be) a.push({ type: 2, index: i });
      else {
        let h = -1;
        for (; (h = s.data.indexOf(A, h + 1)) !== -1; ) a.push({ type: 7, index: i }), h += A.length - 1;
      }
      i++;
    }
  }
  static createElement(e, t) {
    const o = C.createElement("template");
    return o.innerHTML = e, o;
  }
}
function q(n, e, t = n, o) {
  if (e === O) return e;
  let s = o !== void 0 ? t._$Co?.[o] : t._$Cl;
  const i = F(e) ? void 0 : e._$litDirective$;
  return s?.constructor !== i && (s?._$AO?.(!1), i === void 0 ? s = void 0 : (s = new i(n), s._$AT(n, t, o)), o !== void 0 ? (t._$Co ??= [])[o] = s : t._$Cl = s), s !== void 0 && (e = q(n, s._$AS(n, e.values), s, o)), e;
}
class dt {
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
    const { el: { content: t }, parts: o } = this._$AD, s = (e?.creationScope ?? C).importNode(t, !0);
    k.currentNode = s;
    let i = k.nextNode(), r = 0, l = 0, a = o[0];
    for (; a !== void 0; ) {
      if (r === a.index) {
        let p;
        a.type === 2 ? p = new G(i, i.nextSibling, this, e) : a.type === 1 ? p = new a.ctor(i, a.name, a.strings, this, e) : a.type === 6 && (p = new ft(i, this, e)), this._$AV.push(p), a = o[++l];
      }
      r !== a?.index && (i = k.nextNode(), r++);
    }
    return k.currentNode = C, s;
  }
  p(e) {
    let t = 0;
    for (const o of this._$AV) o !== void 0 && (o.strings !== void 0 ? (o._$AI(e, o, t), t += o.strings.length - 2) : o._$AI(e[t])), t++;
  }
}
class G {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, o, s) {
    this.type = 2, this._$AH = c, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = o, this.options = s, this._$Cv = s?.isConnected ?? !0;
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
    e = q(this, e, t), F(e) ? e === c || e == null || e === "" ? (this._$AH !== c && this._$AR(), this._$AH = c) : e !== this._$AH && e !== O && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : lt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== c && F(this._$AH) ? this._$AA.nextSibling.data = e : this.T(C.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: o } = e, s = typeof o == "number" ? this._$AC(e) : (o.el === void 0 && (o.el = V.createElement(Ze(o.h, o.h[0]), this.options)), o);
    if (this._$AH?._$AD === s) this._$AH.p(t);
    else {
      const i = new dt(s, this), r = i.u(this.options);
      i.p(t), this.T(r), this._$AH = i;
    }
  }
  _$AC(e) {
    let t = Oe.get(e.strings);
    return t === void 0 && Oe.set(e.strings, t = new V(e)), t;
  }
  k(e) {
    ge(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let o, s = 0;
    for (const i of e) s === t.length ? t.push(o = new G(this.O(B()), this.O(B()), this, this.options)) : o = t[s], o._$AI(i), s++;
    s < t.length && (this._$AR(o && o._$AB.nextSibling, s), t.length = s);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const o = Ce(e).nextSibling;
      Ce(e).remove(), e = o;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class re {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, o, s, i) {
    this.type = 1, this._$AH = c, this._$AN = void 0, this.element = e, this.name = t, this._$AM = s, this.options = i, o.length > 2 || o[0] !== "" || o[1] !== "" ? (this._$AH = Array(o.length - 1).fill(new String()), this.strings = o) : this._$AH = c;
  }
  _$AI(e, t = this, o, s) {
    const i = this.strings;
    let r = !1;
    if (i === void 0) e = q(this, e, t, 0), r = !F(e) || e !== this._$AH && e !== O, r && (this._$AH = e);
    else {
      const l = e;
      let a, p;
      for (e = i[0], a = 0; a < i.length - 1; a++) p = q(this, l[o + a], t, a), p === O && (p = this._$AH[a]), r ||= !F(p) || p !== this._$AH[a], p === c ? e = c : e !== c && (e += (p ?? "") + i[a + 1]), this._$AH[a] = p;
    }
    r && !s && this.j(e);
  }
  j(e) {
    e === c ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class ut extends re {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === c ? void 0 : e;
  }
}
class pt extends re {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== c);
  }
}
class ht extends re {
  constructor(e, t, o, s, i) {
    super(e, t, o, s, i), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = q(this, e, t, 0) ?? c) === O) return;
    const o = this._$AH, s = e === c && o !== c || e.capture !== o.capture || e.once !== o.once || e.passive !== o.passive, i = e !== c && (o === c || s);
    s && this.element.removeEventListener(this.name, this, o), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class ft {
  constructor(e, t, o) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = o;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    q(this, e);
  }
}
const _t = me.litHtmlPolyfillSupport;
_t?.(V, G), (me.litHtmlVersions ??= []).push("3.3.3");
const mt = (n, e, t) => {
  const o = t?.renderBefore ?? e;
  let s = o._$litPart$;
  if (s === void 0) {
    const i = t?.renderBefore ?? null;
    o._$litPart$ = s = new G(e.insertBefore(B(), i), i, void 0, t ?? {});
  }
  return s._$AI(n), s;
};
const ve = globalThis;
class x extends I {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = mt(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return O;
  }
}
x._$litElement$ = !0, x.finalized = !0, ve.litElementHydrateSupport?.({ LitElement: x });
const gt = ve.litElementPolyfillSupport;
gt?.({ LitElement: x });
(ve.litElementVersions ??= []).push("4.2.2");
const vt = { attribute: !0, type: String, converter: oe, reflect: !1, hasChanged: _e }, bt = (n = vt, e, t) => {
  const { kind: o, metadata: s } = t;
  let i = globalThis.litPropertyMetadata.get(s);
  if (i === void 0 && globalThis.litPropertyMetadata.set(s, i = /* @__PURE__ */ new Map()), o === "setter" && ((n = Object.create(n)).wrapped = !0), i.set(t.name, n), o === "accessor") {
    const { name: r } = t;
    return { set(l) {
      const a = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(r, a, n, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(r, void 0, n, l), l;
    } };
  }
  if (o === "setter") {
    const { name: r } = t;
    return function(l) {
      const a = this[r];
      e.call(this, l), this.requestUpdate(r, a, n, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + o);
};
function $(n) {
  return (e, t) => typeof t == "object" ? bt(n, e, t) : ((o, s, i) => {
    const r = s.hasOwnProperty(i);
    return s.constructor.createProperty(i, o), r ? Object.getOwnPropertyDescriptor(s, i) : void 0;
  })(n, e, t);
}
function K(n) {
  return $({ ...n, state: !0, attribute: !1 });
}
const $t = {
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
function ue(n) {
  return Array.isArray(n) ? n : [];
}
function E(n) {
  return !n || n.state === "unavailable" || n.state === "unknown";
}
function pe(n, e, t) {
  return Math.min(t, Math.max(e, n));
}
function Q(n, e) {
  customElements.get(n) || customElements.define(n, e);
}
const yt = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, xt = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function We(n) {
  const e = {}, t = /* @__PURE__ */ new Map(), o = [];
  for (const i of Object.values(n.states)) {
    const r = g(i.attributes.maestro_role);
    if (!r) continue;
    o.push(i.entity_id);
    const l = g(i.attributes.zone_id);
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
        const p = xt[r];
        p && (a[p] = i);
      }
    } else {
      const a = yt[r];
      a && (e[a] = i);
    }
  }
  const s = [...t.values()];
  for (const i of s) {
    const r = i.state?.attributes ?? {};
    i.name = g(r.zone_name) ?? g(i.state?.attributes.friendly_name) ?? i.zoneId, i.order = v(r.order) ?? v(i.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return s.sort(
    (i, r) => i.order - r.order || i.name.localeCompare(r.name)
  ), { found: o.length > 0, hub: e, zones: s, entityIds: o };
}
const w = {
  // Card-level messages
  "card.name": "Irrigation Maestro Card",
  "card.description": "Overview and control of the Irrigation Maestro integration: water budget, zones, queue and curves.",
  "card.not_installed": "Irrigation Maestro is not installed or has not created any entities yet. Set up the integration first.",
  "card.no_zones": "No zones configured yet. Add zones from the Irrigation Maestro integration options.",
  "card.unavailable": "unavailable",
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
  // Editor
  "editor.title": "Title",
  "editor.title_placeholder": "Card title (optional)",
  "editor.show_header": "Show header",
  "editor.show_queue": "Show queue while running",
  "editor.show_controls": "Show controls",
  "editor.compact": "Compact layout",
  "editor.zones": "Zones",
  "editor.zones_hint": "Select the zones to display. Leave all unchecked to show every zone.",
  "editor.no_zones": "No zones discovered yet."
}, wt = {
  // Messaggi a livello di scheda
  "card.name": "Scheda Irrigation Maestro",
  "card.description": "Panoramica e controllo dell'integrazione Irrigation Maestro: bilancio idrico, zone, coda e curve.",
  "card.not_installed": "Irrigation Maestro non è installato o non ha ancora creato entità. Configura prima l'integrazione.",
  "card.no_zones": "Nessuna zona configurata. Aggiungi le zone dalle opzioni dell'integrazione Irrigation Maestro.",
  "card.unavailable": "non disponibile",
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
  // Editor
  "editor.title": "Titolo",
  "editor.title_placeholder": "Titolo della scheda (facoltativo)",
  "editor.show_header": "Mostra intestazione",
  "editor.show_queue": "Mostra la coda durante l'esecuzione",
  "editor.show_controls": "Mostra comandi",
  "editor.compact": "Layout compatto",
  "editor.zones": "Zone",
  "editor.zones_hint": "Seleziona le zone da mostrare. Lascia tutto deselezionato per mostrarle tutte.",
  "editor.no_zones": "Nessuna zona rilevata al momento."
}, ae = {
  en: w,
  it: wt
};
function Ge(n) {
  const t = (n?.locale?.language ?? n?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in ae ? t : "en";
}
function zt(n, e) {
  return e ? n.replace(/\{(\w+)\}/g, (t, o) => {
    const s = e[o];
    return s === void 0 ? t : String(s);
  }) : n;
}
function u(n, e, t) {
  const o = ae[n] ?? w;
  return zt(o[e] ?? w[e], t);
}
function L(n, e, t) {
  const o = `${e}.${t}`, s = ae[n] ?? w, i = w;
  return s[o] ?? i[o] ?? t;
}
function At(n, e) {
  const t = ae[n] ?? w, o = w;
  for (const s of ["queue_state", "zone_state", "outcome"]) {
    const i = `${s}.${e}`, r = t[i] ?? o[i];
    if (r !== void 0) return r;
  }
  return e;
}
const qe = /* @__PURE__ */ new Map(), Ue = /* @__PURE__ */ new Map(), Re = /* @__PURE__ */ new Map();
function J(n) {
  let e = qe.get(n);
  return e || (e = new Intl.RelativeTimeFormat(n, { numeric: "auto" }), qe.set(n, e)), e;
}
function De(n, e, t = Date.now()) {
  if (!n) return;
  const o = Date.parse(n);
  if (Number.isNaN(o)) return;
  const s = Math.round((o - t) / 1e3), i = Math.abs(s);
  try {
    return i < 60 ? J(e).format(s, "second") : i < 3600 ? J(e).format(Math.round(s / 60), "minute") : i < 86400 ? J(e).format(Math.round(s / 3600), "hour") : J(e).format(Math.round(s / 86400), "day");
  } catch {
    return;
  }
}
function St(n, e) {
  if (!n) return;
  const t = Date.parse(n);
  if (Number.isNaN(t)) return;
  let o = Ue.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }), Ue.set(e, o)), o.format(t);
}
function kt(n, e) {
  if (!n) return;
  const t = Date.parse(n);
  if (Number.isNaN(t)) return;
  let o = Re.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }), Re.set(e, o)), o.format(t);
}
function Y(n, e = 1) {
  const t = v(n);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (o) => e > 0 ? "" : o);
}
function Et(n) {
  const e = v(n);
  if (e !== void 0) return e;
  if (n && typeof n == "object") {
    const t = n;
    return v(t.duration_min) ?? v(t.duration) ?? v(t.minutes);
  }
}
function Ct(n, e) {
  const t = g(n.run_started_at), o = v(n.run_duration_min);
  if (!t || o === void 0 || o <= 0)
    return;
  const s = Date.parse(t);
  if (Number.isNaN(s)) return;
  const i = (e - s) / 6e4, r = pe(i / o, 0, 1), l = Math.max(0, Math.ceil(o - i)), a = [], p = n.run_planned_runs;
  if (Array.isArray(p) && p.length > 1) {
    const f = p.map(Et).filter((_) => _ !== void 0 && _ > 0), h = f.reduce((_, m) => _ + m, 0);
    if (f.length > 1 && h > 0) {
      let _ = 0;
      for (let m = 0; m < f.length - 1; m += 1)
        _ += f[m] ?? 0, a.push(_ / h);
    }
  }
  return { fraction: r, remainingMin: l, segmentBounds: a };
}
function Pt(n) {
  const e = Math.abs(Math.round(n)), t = Math.floor(e / 3600), o = Math.round(e % 3600 / 60), s = [];
  return t > 0 && s.push(`${t} h`), o > 0 && s.push(`${o} min`), s.length === 0 && s.push(`${e} s`), s.join(" ");
}
function Tt(n, e) {
  if (!n || typeof n != "object") return "";
  if (n.kind === "sun" && (n.event === "sunrise" || n.event === "sunset")) {
    const o = u(
      e,
      n.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), s = v(n.offset_s) ?? 0;
    if (s === 0) return o;
    const i = s < 0 ? "−" : "+";
    return `${o} ${i} ${Pt(s)}`;
  }
  const t = g(n.at) ?? g(n.time);
  return t ? u(e, "trigger.at", { time: t }) : g(n.kind) ?? "";
}
var Mt = Object.defineProperty, Nt = (n, e, t, o) => {
  for (var s = void 0, i = n.length - 1, r; i >= 0; i--)
    (r = n[i]) && (s = r(e, t, s) || s);
  return s && Mt(e, t, s), s;
};
const M = 150, N = 44, ee = 6, He = 6;
function It(n) {
  if (!Array.isArray(n)) return [];
  const e = [];
  for (const t of n) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const o = v(t[0]), s = v(t[1]);
    o !== void 0 && s !== void 0 && e.push([o, s]);
  }
  return e.sort((t, o) => t[0] - o[0]);
}
const $e = class $e extends x {
  render() {
    const e = this.curve, t = It(e?.points);
    if (t.length === 0) return c;
    const o = v(e?.min), s = v(e?.max), i = t.map((b) => b[0]), r = t.map((b) => b[1]);
    o !== void 0 && r.push(o), s !== void 0 && r.push(s);
    let l = Math.min(...i), a = Math.max(...i), p = Math.min(...r), f = Math.max(...r);
    a - l < 1e-9 && (l -= 1, a += 1), f - p < 1e-9 && (p -= 1, f += 1);
    const h = (b) => ee + (b - l) / (a - l) * (M - 2 * ee), _ = (b) => N - He - (b - p) / (f - p) * (N - 2 * He), m = t.map((b, ce) => `${ce === 0 ? "M" : "L"}${h(b[0]).toFixed(1)},${_(b[1]).toFixed(1)}`).join(" "), y = (b, ce) => X`
      <line
        class="clamp"
        x1="0" x2="${M}"
        y1="${_(b).toFixed(1)}" y2="${_(b).toFixed(1)}"
      ></line>
      <text class="clamp-label" x="${M - 2}" text-anchor="end"
        y="${(_(b) - 2).toFixed(1)}">${ce}</text>
    `, D = t[0], T = t[t.length - 1];
    return d`
      <svg
        viewBox="0 0 ${M} ${N + 10}"
        width="${M}"
        height="${N + 10}"
        role="img"
        aria-hidden="true"
      >
        ${o !== void 0 ? y(o, String(o)) : c}
        ${s !== void 0 ? y(s, String(s)) : c}
        <path class="line" d="${m}"></path>
        ${t.map(
      (b) => X`<circle class="dot" r="2"
            cx="${h(b[0]).toFixed(1)}" cy="${_(b[1]).toFixed(1)}"></circle>`
    )}
        ${D ? X`<text class="axis-label" x="${ee}" y="${N + 8}"
              text-anchor="start">${D[0]}°</text>` : c}
        ${T && T !== D ? X`<text class="axis-label" x="${M - ee}" y="${N + 8}"
              text-anchor="end">${T[0]}°</text>` : c}
      </svg>
    `;
  }
};
$e.styles = W`
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
let ne = $e;
Nt([
  $({ attribute: !1 })
], ne.prototype, "curve");
Q("imc-curve-sparkline", ne);
var Ot = Object.defineProperty, R = (n, e, t, o) => {
  for (var s = void 0, i = n.length - 1, r; i >= 0; i--)
    (r = n[i]) && (s = r(e, t, s) || s);
  return s && Ot(e, t, s), s;
};
const Ke = {
  idle: "mdi:water-outline",
  queued: "mdi:timer-sand",
  watering: "mdi:water",
  soaking: "mdi:water-percent",
  paused: "mdi:pause-circle-outline",
  suspended: "mdi:calendar-remove-outline",
  disabled: "mdi:water-off-outline"
}, qt = [1, 4, 8, 24];
function Ut(n) {
  return n in Ke;
}
const ye = class ye extends x {
  constructor() {
    super(...arguments), this.language = "en", this.now = Date.now(), this.compact = !1, this.showControls = !0, this._expanded = !1;
  }
  get _zoneState() {
    const e = this.zone?.state?.state;
    return e && Ut(e) ? e : void 0;
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
    const s = this.zone?.zoneId;
    s && Number.isFinite(o) && o > 0 && this._dispatch({ action: "pause", zoneId: s, hours: o });
  }
  _onSuspendDate(e) {
    const t = e.currentTarget, o = t.value;
    t.value = "";
    const s = this.zone?.zoneId;
    s && o && this._dispatch({ action: "suspend", zoneId: s, until: `${o}T00:00:00` });
  }
  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */
  _renderBadges() {
    const e = this.zone;
    if (!e) return c;
    const t = e.state?.attributes ?? {}, o = [], s = g(t.suspended_until) ?? (E(e.suspendUntil) ? void 0 : e.suspendUntil?.state);
    if (this._zoneState === "suspended" && s) {
      const i = kt(s, this.language) ?? s;
      o.push(d`
        <span class="badge" title=${u(this.language, "zone.suspended_until", { date: i })}>
          <ha-icon icon="mdi:calendar-remove-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${i}
        </span>
      `);
    }
    for (const i of ue(t.degraded)) {
      const r = g(i);
      if (!r) continue;
      const l = L(this.language, "degraded", r);
      o.push(d`
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
    const o = Ct(
      e.state?.attributes ?? {},
      this.now
    );
    return o ? d`
      <div class="progress-line">
        <div class="progress ${t === "soaking" ? "soaking" : ""}">
          <div class="bar" style="width:${(o.fraction * 100).toFixed(2)}%"></div>
          ${o.segmentBounds.map(
      (s) => d`<div class="seg" style="left:${(s * 100).toFixed(2)}%"></div>`
    )}
        </div>
        <span class="remaining">
          ${u(this.language, "zone.remaining", {
      minutes: o.remainingMin
    })}
        </span>
      </div>
    ` : c;
  }
  _renderMeta() {
    const e = this.zone;
    if (!e) return c;
    const t = this.language, o = [], s = e.nextRun;
    if (s && !E(s)) {
      const r = De(s.state, t, this.now), l = St(s.state, t), a = g(s.attributes.cycle_name);
      (r || l) && o.push(d`
          <span>
            ${u(t, "zone.next_run")}: ${r ?? ""}
            ${l ? d`<span class="abs">
                  · ${l}${a ? ` (${a})` : ""}
                </span>` : c}
          </span>
        `);
    } else
      o.push(d`<span>${u(t, "zone.no_next_run")}</span>`);
    const i = e.lastOutcome;
    if (i && !E(i) && i.state !== "none") {
      const r = L(t, "outcome", i.state), l = g(i.attributes.reason_key), a = l ? L(t, "reason", l) : void 0, p = g(i.attributes.finished_at), f = De(p, t, this.now);
      o.push(d`
        <span>
          ${u(t, "zone.last_outcome")}: ${r}${a ? ` — ${a}` : ""}${f ? d`<span class="abs"> · ${f}</span>` : c}
        </span>
      `);
    }
    return d`<div class="meta">${o}</div>`;
  }
  _renderControls() {
    const e = this.zone;
    if (!e || !this.showControls) return c;
    const t = this.language, o = e.zoneId, s = this._zoneState, i = e.enabledSwitch, r = i?.state === "on", l = s === "paused" || s === "suspended";
    return d`
      <div class="controls" @click=${(a) => a.stopPropagation()}>
        <button @click=${() => this._dispatch({ action: "run", zoneId: o })}>
          ${u(t, "controls.run_now")}
        </button>
        <button @click=${() => this._dispatch({ action: "skip", zoneId: o })}>
          ${u(t, "controls.skip_today")}
        </button>
        <select
          .value=${""}
          @change=${this._onPauseSelect}
          aria-label=${u(t, "controls.pause_for")}
        >
          <option value="" disabled selected hidden>
            ${u(t, "controls.pause_for")}
          </option>
          ${qt.map(
      (a) => d`<option value=${a}>
              ${u(t, "controls.hours", { hours: a })}
            </option>`
    )}
        </select>
        <input
          type="date"
          @change=${this._onSuspendDate}
          aria-label=${u(t, "controls.suspend_until")}
          title=${u(t, "controls.suspend_until")}
        />
        ${l ? d`<button
              @click=${() => this._dispatch({ action: "resume", zoneId: o })}
            >
              ${u(t, "controls.resume")}
            </button>` : c}
        ${i ? d`<button
              @click=${() => this._dispatch({
      action: "set-enabled",
      zoneId: o,
      enabled: !r
    })}
            >
              ${u(t, r ? "controls.disable" : "controls.enable")}
            </button>` : c}
      </div>
    `;
  }
  _renderCycles() {
    const e = this.zone;
    if (!e) return c;
    const t = this.language, o = ue(e.state?.attributes.cycles).filter(
      (s) => !!s && typeof s == "object"
    );
    return o.length === 0 ? d`<div class="details">
        <div class="no-cycles">${u(t, "zone.no_cycles")}</div>
      </div>` : d`
      <div class="details">
        <div class="details-title">${u(t, "zone.cycles")}</div>
        ${o.map((s) => this._renderCycle(s))}
      </div>
    `;
  }
  _renderCycle(e) {
    const t = this.language, o = this.zone, s = g(e.cycle_id), i = o?.cycleSwitches.find(
      (m) => g(m.attributes.cycle_id) === s
    ), r = i ? i.state === "on" : e.enabled !== !1, l = Tt(e.trigger, t), a = e.curve, p = v(a?.min), f = v(a?.max), h = u(
      t,
      a?.kind === "volume" ? "curve.unit_volume" : "curve.unit_duration"
    ), _ = [];
    return p !== void 0 && _.push(
      `${u(t, "curve.clamp_min")} ${p} ${h}`
    ), f !== void 0 && _.push(
      `${u(t, "curve.clamp_max")} ${f} ${h}`
    ), d`
      <div class="cycle">
        <div class="cycle-info">
          <div class="cycle-name">
            ${g(e.name) ?? s ?? "?"}
            ${r ? c : d`<span class="off">
                  ${u(t, "zone.cycle_disabled")}
                </span>`}
          </div>
          <div class="cycle-sub">
            ${l}${l && _.length > 0 ? " · " : ""}${_.join(" · ")}
          </div>
        </div>
        ${a ? d`<imc-curve-sparkline .curve=${a}></imc-curve-sparkline>` : c}
      </div>
    `;
  }
  render() {
    const e = this.zone;
    if (!e) return c;
    const t = this.language, o = this._zoneState, s = o ? L(t, "zone_state", o) : u(t, "card.unavailable"), i = o ? Ke[o] : "mdi:help-circle-outline", r = o ?? "unknown", l = !this.compact || this._expanded;
    return d`
      <div class="zone ${r}">
        <div
          class="row"
          role="button"
          tabindex="0"
          aria-expanded=${this._expanded ? "true" : "false"}
          @click=${this._toggleExpanded}
          @keydown=${this._onHeaderKeydown}
        >
          <ha-icon class="state-icon ${r}" icon=${i}></ha-icon>
          <div class="main">
            <div class="name-line">
              <span class="name">${e.name}</span>
              ${this._renderBadges()}
            </div>
          </div>
          <span class="state-chip ${r}">${s}</span>
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
ye.styles = W`
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
  `;
let z = ye;
R([
  $({ attribute: !1 })
], z.prototype, "zone");
R([
  $()
], z.prototype, "language");
R([
  $({ attribute: !1 })
], z.prototype, "now");
R([
  $({ type: Boolean, reflect: !0 })
], z.prototype, "compact");
R([
  $({ type: Boolean })
], z.prototype, "showControls");
R([
  K()
], z.prototype, "_expanded");
Q("imc-zone-row", z);
var Rt = Object.defineProperty, be = (n, e, t, o) => {
  for (var s = void 0, i = n.length - 1, r; i >= 0; i--)
    (r = n[i]) && (s = r(e, t, s) || s);
  return s && Rt(e, t, s), s;
};
const xe = class xe extends x {
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
    window.confirm(u(this.language, "controls.confirm_stop_all")) && this._dispatch({ action: "stop_all" });
  }
  render() {
    const e = this.language;
    return d`
      <div class="controls">
        <button @click=${() => this._dispatch({ action: "run_all" })}>
          ${u(e, "controls.run_all")}
        </button>
        <button class="danger" @click=${this._onStopAll}>
          ${u(e, "controls.stop_all")}
        </button>
        <button @click=${() => this._dispatch({ action: "evaluate" })}>
          ${u(e, "controls.evaluate_now")}
        </button>
        ${this.hasPauseSwitch ? d`<button
              class=${this.paused ? "active" : ""}
              @click=${() => this._dispatch({ action: "set-pause", paused: !this.paused })}
            >
              ${u(
      e,
      this.paused ? "controls.resume_global" : "controls.pause_global"
    )}
            </button>` : c}
      </div>
    `;
  }
};
xe.styles = W`
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
let U = xe;
be([
  $()
], U.prototype, "language");
be([
  $({ type: Boolean })
], U.prototype, "paused");
be([
  $({ type: Boolean })
], U.prototype, "hasPauseSwitch");
Q("imc-global-controls", U);
var Dt = Object.defineProperty, le = (n, e, t, o) => {
  for (var s = void 0, i = n.length - 1, r; i >= 0; i--)
    (r = n[i]) && (s = r(e, t, s) || s);
  return s && Dt(e, t, s), s;
};
const Ht = [
  "idle",
  "evaluating",
  "running"
];
function Lt(n) {
  return !!n && Ht.includes(n);
}
const we = class we extends x {
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
    this._config = { ...$t, ...e };
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
        (i) => t.states[i] !== o.states[i]
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
    const s = this.hass;
    if (s)
      try {
        await s.callService(e, t, o);
      } catch (i) {
        const r = i instanceof Error ? i.message : String(i);
        this._error = r, this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
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
        const s = this._model?.zones.find(
          (i) => i.zoneId === t.zoneId
        )?.enabledSwitch?.entity_id;
        s && this._call(
          "switch",
          t.enabled ? "turn_on" : "turn_off",
          { entity_id: s }
        );
        break;
      }
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
    const o = e.hub, s = E(o.waterBudget) ? void 0 : v(o.waterBudget?.state), i = E(o.skipThreshold) ? void 0 : v(o.skipThreshold?.state);
    let r = c;
    if (s !== void 0 || i !== void 0) {
      const y = Math.max(s ?? 0, i ?? 0, 1e-3), D = pe((s ?? 0) / y, 0, 1), T = i !== void 0 ? pe(i / y, 0, 1) : void 0, b = s !== void 0 && i !== void 0 && s >= i;
      r = d`
        <div
          class="budget"
          title=${`${u(t, "header.water_budget")} / ${u(t, "header.skip_threshold")}`}
        >
          <span class="budget-label">${u(t, "header.water_budget")}</span>
          <div class="meter">
            <div
              class="meter-fill ${b ? "sufficient" : ""}"
              style="width:${(D * 100).toFixed(1)}%"
            ></div>
            ${T !== void 0 ? d`<div
                  class="meter-mark"
                  style="left:${(T * 100).toFixed(1)}%"
                ></div>` : c}
          </div>
          <span class="budget-numbers">
            ${Y(s, 2) ?? "—"} /
            ${Y(i, 1) ?? "—"} mm
          </span>
        </div>
      `;
    }
    const l = o.weightedTemp, a = E(l) ? void 0 : v(l?.state), p = l?.attributes.stale_weather === !0, f = o.session?.state, h = Lt(f) ? f : void 0, _ = o.pauseSwitch?.state === "on", m = E(o.consumptionLeft) ? void 0 : v(o.consumptionLeft?.state);
    return d`
      <div class="header">
        ${r}
        <div class="chips">
          ${a !== void 0 ? d`<span
                class="chip"
                title=${u(t, "header.weighted_temp")}
              >
                <ha-icon icon="mdi:thermometer" style="--mdc-icon-size:14px"></ha-icon>
                ${Y(a, 1)} °C
              </span>` : c}
          ${p ? d`<span class="chip warning">
                <ha-icon icon="mdi:alert" style="--mdc-icon-size:14px"></ha-icon>
                ${u(t, "header.stale_weather")}
              </span>` : c}
          ${h ? d`<span
                class="chip ${h !== "idle" ? "accent" : ""}"
                title=${u(t, "header.session")}
              >
                <ha-icon
                  icon=${h === "running" ? "mdi:play-circle-outline" : h === "evaluating" ? "mdi:magnify" : "mdi:sleep"}
                  style="--mdc-icon-size:14px"
                ></ha-icon>
                ${L(t, "session", h)}
              </span>` : c}
          ${_ ? d`<span class="chip warning">
                <ha-icon icon="mdi:pause" style="--mdc-icon-size:14px"></ha-icon>
                ${u(t, "header.global_pause")}
              </span>` : c}
          ${m !== void 0 ? d`<span
                class="chip"
                title=${u(t, "header.consumption_left")}
              >
                <ha-icon icon="mdi:counter" style="--mdc-icon-size:14px"></ha-icon>
                ${Y(m, 0)} L
              </span>` : c}
        </div>
      </div>
    `;
  }
  _renderQueue(e, t) {
    const o = e.hub.session;
    if (o?.state !== "running") return c;
    const s = ue(o.attributes.queue).filter(
      (r) => !!r && typeof r == "object"
    );
    if (s.length === 0) return c;
    const i = g(o.attributes.active_zone_id);
    return d`
      <div class="queue">
        <div class="queue-title">${u(t, "queue.title")}</div>
        ${s.map((r, l) => {
      const a = g(r.state), p = i !== void 0 && r.zone_id === i || a === "watering" || a === "running", f = v(r.duration_min);
      return d`
            <div class="queue-item ${p ? "active" : ""}">
              <span class="queue-index">${l + 1}.</span>
              <span class="queue-name">
                ${g(r.zone_name) ?? g(r.zone_id) ?? "?"}
              </span>
              ${f !== void 0 ? d`<span class="queue-duration">
                    ${u(t, "queue.duration", { minutes: f })}
                  </span>` : c}
              ${a ? d`<span class="queue-state">
                    ${At(t, a)}
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
    const o = Ge(t), s = We(t);
    this._model = s, this._relevantIds = s.entityIds, this._statesCount = Object.keys(t.states).length;
    const i = e.title ? d`<h1 class="card-title">${e.title}</h1>` : c;
    if (!s.found)
      return d`
        <ha-card>
          ${i}
          <div class="message">${u(o, "card.not_installed")}</div>
        </ha-card>
      `;
    const r = e.zones, l = r && r.length > 0 ? s.zones.filter((a) => r.includes(a.zoneId)) : s.zones;
    return d`
      <ha-card @imc-zone-action=${this._onZoneAction} @imc-global-action=${this._onGlobalAction}>
        ${i}
        ${e.show_header !== !1 ? this._renderHeader(s, o) : c}
        ${this._error ? d`<div class="error">${this._error}</div>` : c}
        ${e.show_queue !== !1 ? this._renderQueue(s, o) : c}
        ${l.length === 0 ? d`<div class="message">${u(o, "card.no_zones")}</div>` : l.map(
      (a) => d`
                <imc-zone-row
                  .zone=${a}
                  .language=${o}
                  .now=${this._now}
                  .compact=${e.compact === !0}
                  .showControls=${e.show_controls !== !1}
                ></imc-zone-row>
              `
    )}
        ${e.show_controls !== !1 ? d`<imc-global-controls
              .language=${o}
              .paused=${s.hub.pauseSwitch?.state === "on"}
              .hasPauseSwitch=${!!s.hub.pauseSwitch}
            ></imc-global-controls>` : c}
      </ha-card>
    `;
  }
};
we.styles = W`
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
let P = we;
le([
  $({ attribute: !1 })
], P.prototype, "hass");
le([
  K()
], P.prototype, "_config");
le([
  K()
], P.prototype, "_now");
le([
  K()
], P.prototype, "_error");
Q("irrigation-maestro-card", P);
var jt = Object.defineProperty, Qe = (n, e, t, o) => {
  for (var s = void 0, i = n.length - 1, r; i >= 0; i--)
    (r = n[i]) && (s = r(e, t, s) || s);
  return s && jt(e, t, s), s;
};
const Bt = [
  { key: "show_header", label: "editor.show_header", fallback: !0 },
  { key: "show_queue", label: "editor.show_queue", fallback: !0 },
  { key: "show_controls", label: "editor.show_controls", fallback: !0 },
  { key: "compact", label: "editor.compact", fallback: !1 }
], ze = class ze extends x {
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
    const o = t.currentTarget.checked, s = new Set(this._config.zones ?? []);
    o ? s.add(e) : s.delete(e);
    const i = { ...this._config };
    s.size > 0 ? i.zones = [...s] : delete i.zones, this._emitConfig(i);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return c;
    const o = Ge(t), s = We(t).zones, i = new Set(e.zones ?? []);
    return d`
      <div class="form">
        <label class="field">
          ${u(o, "editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${u(o, "editor.title_placeholder")}
            @input=${this._onTitleInput}
          />
        </label>

        ${Bt.map(
      ({ key: r, label: l, fallback: a }) => d`
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${e[r] ?? a}
                @change=${(p) => this._onToggle(r, p)}
              />
              ${u(o, l)}
            </label>
          `
    )}

        <div class="zones">
          <span class="zones-title">${u(o, "editor.zones")}</span>
          ${s.length === 0 ? d`<span class="hint">${u(o, "editor.no_zones")}</span>` : d`
                ${s.map(
      (r) => d`
                    <label class="toggle">
                      <input
                        type="checkbox"
                        .checked=${i.has(r.zoneId)}
                        @change=${(l) => this._onZoneToggle(r.zoneId, l)}
                      />
                      ${r.name}
                    </label>
                  `
    )}
                <span class="hint">${u(o, "editor.zones_hint")}</span>
              `}
        </div>
      </div>
    `;
  }
};
ze.styles = W`
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
let Z = ze;
Qe([
  $({ attribute: !1 })
], Z.prototype, "hass");
Qe([
  K()
], Z.prototype, "_config");
Q("irrigation-maestro-card-editor", Z);
window.customCards = window.customCards ?? [];
window.customCards.some((n) => n.type === "irrigation-maestro-card") || window.customCards.push({
  type: "irrigation-maestro-card",
  name: w["card.name"],
  description: w["card.description"],
  preview: !0,
  documentationURL: "https://github.com/jmbriccola/ha-irrigation-configurable"
});
