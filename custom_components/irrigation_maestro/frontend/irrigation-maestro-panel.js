/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const re = globalThis, be = re.ShadowRoot && (re.ShadyCSS === void 0 || re.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, $e = /* @__PURE__ */ Symbol(), Ce = /* @__PURE__ */ new WeakMap();
let Je = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== $e) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (be && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = Ce.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && Ce.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const ut = (r) => new Je(typeof r == "string" ? r : r + "", void 0, $e), Y = (r, ...e) => {
  const t = r.length === 1 ? r[0] : e.reduce((i, s, o) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s) + r[o + 1], r[0]);
  return new Je(t, r, $e);
}, ht = (r, e) => {
  if (be) r.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), s = re.litNonce;
    s !== void 0 && i.setAttribute("nonce", s), i.textContent = t.cssText, r.appendChild(i);
  }
}, Ne = be ? (r) => r : (r) => r instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return ut(t);
})(r) : r;
const { is: mt, defineProperty: _t, getOwnPropertyDescriptor: gt, getOwnPropertyNames: ft, getOwnPropertySymbols: vt, getPrototypeOf: yt } = Object, le = globalThis, Oe = le.trustedTypes, bt = Oe ? Oe.emptyScript : "", $t = le.reactiveElementPolyfillSupport, W = (r, e) => r, oe = { toAttribute(r, e) {
  switch (e) {
    case Boolean:
      r = r ? bt : null;
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
} }, xe = (r, e) => !mt(r, e), Pe = { attribute: !0, type: String, converter: oe, reflect: !1, useDefault: !1, hasChanged: xe };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), le.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let F = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Pe) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = /* @__PURE__ */ Symbol(), s = this.getPropertyDescriptor(e, i, t);
      s !== void 0 && _t(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: s, set: o } = gt(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: s, set(n) {
      const l = s?.call(this);
      o?.call(this, n), this.requestUpdate(e, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Pe;
  }
  static _$Ei() {
    if (this.hasOwnProperty(W("elementProperties"))) return;
    const e = yt(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(W("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(W("properties"))) {
      const t = this.properties, i = [...ft(t), ...vt(t)];
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
      for (const s of i) t.unshift(Ne(s));
    } else e !== void 0 && t.push(Ne(e));
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
    return ht(e, this.constructor.elementStyles), e;
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
      const o = (i.converter?.toAttribute !== void 0 ? i.converter : oe).toAttribute(t, i.type);
      this._$Em = e, o == null ? this.removeAttribute(s) : this.setAttribute(s, o), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, s = i._$Eh.get(e);
    if (s !== void 0 && this._$Em !== s) {
      const o = i.getPropertyOptions(s), n = typeof o.converter == "function" ? { fromAttribute: o.converter } : o.converter?.fromAttribute !== void 0 ? o.converter : oe;
      this._$Em = s;
      const l = n.fromAttribute(t, o.type);
      this[s] = l ?? this._$Ej?.get(s) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, s = !1, o) {
    if (e !== void 0) {
      const n = this.constructor;
      if (s === !1 && (o = this[e]), i ??= n.getPropertyOptions(e), !((i.hasChanged ?? xe)(o, t) || i.useDefault && i.reflect && o === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: s, wrapped: o }, n) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), o !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), s === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        const { wrapped: n } = o, l = this[s];
        n !== !0 || this._$AL.has(s) || l === void 0 || this.C(s, void 0, o, l);
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
F.elementStyles = [], F.shadowRootOptions = { mode: "open" }, F[W("elementProperties")] = /* @__PURE__ */ new Map(), F[W("finalized")] = /* @__PURE__ */ new Map(), $t?.({ ReactiveElement: F }), (le.reactiveElementVersions ??= []).push("2.1.2");
const we = globalThis, De = (r) => r, ne = we.trustedTypes, Ue = ne ? ne.createPolicy("lit-html", { createHTML: (r) => r }) : void 0, et = "$lit$", I = `lit$${Math.random().toFixed(9).slice(2)}$`, tt = "?" + I, xt = `<${tt}>`, U = document, Z = () => U.createComment(""), G = (r) => r === null || typeof r != "object" && typeof r != "function", ze = Array.isArray, wt = (r) => ze(r) || typeof r?.[Symbol.iterator] == "function", ue = `[ 	
\f\r]`, V = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Re = /-->/g, Fe = />/g, N = RegExp(`>|${ue}(?:([^\\s"'>=/]+)(${ue}*=${ue}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Le = /'/g, He = /"/g, it = /^(?:script|style|textarea|title)$/i, st = (r) => (e, ...t) => ({ _$litType$: r, strings: e, values: t }), c = st(1), he = st(2), j = /* @__PURE__ */ Symbol.for("lit-noChange"), u = /* @__PURE__ */ Symbol.for("lit-nothing"), je = /* @__PURE__ */ new WeakMap(), O = U.createTreeWalker(U, 129);
function rt(r, e) {
  if (!ze(r) || !r.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Ue !== void 0 ? Ue.createHTML(e) : e;
}
const zt = (r, e) => {
  const t = r.length - 1, i = [];
  let s, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = V;
  for (let l = 0; l < t; l++) {
    const d = r[l];
    let h, m, p = -1, f = 0;
    for (; f < d.length && (n.lastIndex = f, m = n.exec(d), m !== null); ) f = n.lastIndex, n === V ? m[1] === "!--" ? n = Re : m[1] !== void 0 ? n = Fe : m[2] !== void 0 ? (it.test(m[2]) && (s = RegExp("</" + m[2], "g")), n = N) : m[3] !== void 0 && (n = N) : n === N ? m[0] === ">" ? (n = s ?? V, p = -1) : m[1] === void 0 ? p = -2 : (p = n.lastIndex - m[2].length, h = m[1], n = m[3] === void 0 ? N : m[3] === '"' ? He : Le) : n === He || n === Le ? n = N : n === Re || n === Fe ? n = V : (n = N, s = void 0);
    const b = n === N && r[l + 1].startsWith("/>") ? " " : "";
    o += n === V ? d + xt : p >= 0 ? (i.push(h), d.slice(0, p) + et + d.slice(p) + I + b) : d + I + (p === -2 ? l : b);
  }
  return [rt(r, o + (r[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class X {
  constructor({ strings: e, _$litType$: t }, i) {
    let s;
    this.parts = [];
    let o = 0, n = 0;
    const l = e.length - 1, d = this.parts, [h, m] = zt(e, t);
    if (this.el = X.createElement(h, i), O.currentNode = this.el.content, t === 2 || t === 3) {
      const p = this.el.content.firstChild;
      p.replaceWith(...p.childNodes);
    }
    for (; (s = O.nextNode()) !== null && d.length < l; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const p of s.getAttributeNames()) if (p.endsWith(et)) {
          const f = m[n++], b = s.getAttribute(p).split(I), ie = /([.?@])?(.*)/.exec(f);
          d.push({ type: 1, index: o, name: ie[2], strings: b, ctor: ie[1] === "." ? kt : ie[1] === "?" ? St : ie[1] === "@" ? Et : ce }), s.removeAttribute(p);
        } else p.startsWith(I) && (d.push({ type: 6, index: o }), s.removeAttribute(p));
        if (it.test(s.tagName)) {
          const p = s.textContent.split(I), f = p.length - 1;
          if (f > 0) {
            s.textContent = ne ? ne.emptyScript : "";
            for (let b = 0; b < f; b++) s.append(p[b], Z()), O.nextNode(), d.push({ type: 2, index: ++o });
            s.append(p[f], Z());
          }
        }
      } else if (s.nodeType === 8) if (s.data === tt) d.push({ type: 2, index: o });
      else {
        let p = -1;
        for (; (p = s.data.indexOf(I, p + 1)) !== -1; ) d.push({ type: 7, index: o }), p += I.length - 1;
      }
      o++;
    }
  }
  static createElement(e, t) {
    const i = U.createElement("template");
    return i.innerHTML = e, i;
  }
}
function q(r, e, t = r, i) {
  if (e === j) return e;
  let s = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const o = G(e) ? void 0 : e._$litDirective$;
  return s?.constructor !== o && (s?._$AO?.(!1), o === void 0 ? s = void 0 : (s = new o(r), s._$AT(r, t, i)), i !== void 0 ? (t._$Co ??= [])[i] = s : t._$Cl = s), s !== void 0 && (e = q(r, s._$AS(r, e.values), s, i)), e;
}
class At {
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
    const { el: { content: t }, parts: i } = this._$AD, s = (e?.creationScope ?? U).importNode(t, !0);
    O.currentNode = s;
    let o = O.nextNode(), n = 0, l = 0, d = i[0];
    for (; d !== void 0; ) {
      if (n === d.index) {
        let h;
        d.type === 2 ? h = new J(o, o.nextSibling, this, e) : d.type === 1 ? h = new d.ctor(o, d.name, d.strings, this, e) : d.type === 6 && (h = new Mt(o, this, e)), this._$AV.push(h), d = i[++l];
      }
      n !== d?.index && (o = O.nextNode(), n++);
    }
    return O.currentNode = U, s;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class J {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, i, s) {
    this.type = 2, this._$AH = u, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = s, this._$Cv = s?.isConnected ?? !0;
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
    e = q(this, e, t), G(e) ? e === u || e == null || e === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : e !== this._$AH && e !== j && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : wt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== u && G(this._$AH) ? this._$AA.nextSibling.data = e : this.T(U.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: i } = e, s = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = X.createElement(rt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === s) this._$AH.p(t);
    else {
      const o = new At(s, this), n = o.u(this.options);
      o.p(t), this.T(n), this._$AH = o;
    }
  }
  _$AC(e) {
    let t = je.get(e.strings);
    return t === void 0 && je.set(e.strings, t = new X(e)), t;
  }
  k(e) {
    ze(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, s = 0;
    for (const o of e) s === t.length ? t.push(i = new J(this.O(Z()), this.O(Z()), this, this.options)) : i = t[s], i._$AI(o), s++;
    s < t.length && (this._$AR(i && i._$AB.nextSibling, s), t.length = s);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const i = De(e).nextSibling;
      De(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class ce {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, i, s, o) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = e, this.name = t, this._$AM = s, this.options = o, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = u;
  }
  _$AI(e, t = this, i, s) {
    const o = this.strings;
    let n = !1;
    if (o === void 0) e = q(this, e, t, 0), n = !G(e) || e !== this._$AH && e !== j, n && (this._$AH = e);
    else {
      const l = e;
      let d, h;
      for (e = o[0], d = 0; d < o.length - 1; d++) h = q(this, l[i + d], t, d), h === j && (h = this._$AH[d]), n ||= !G(h) || h !== this._$AH[d], h === u ? e = u : e !== u && (e += (h ?? "") + o[d + 1]), this._$AH[d] = h;
    }
    n && !s && this.j(e);
  }
  j(e) {
    e === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class kt extends ce {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === u ? void 0 : e;
  }
}
class St extends ce {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== u);
  }
}
class Et extends ce {
  constructor(e, t, i, s, o) {
    super(e, t, i, s, o), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = q(this, e, t, 0) ?? u) === j) return;
    const i = this._$AH, s = e === u && i !== u || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, o = e !== u && (i === u || s);
    s && this.element.removeEventListener(this.name, this, i), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Mt {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    q(this, e);
  }
}
const Tt = we.litHtmlPolyfillSupport;
Tt?.(X, J), (we.litHtmlVersions ??= []).push("3.3.3");
const It = (r, e, t) => {
  const i = t?.renderBefore ?? e;
  let s = i._$litPart$;
  if (s === void 0) {
    const o = t?.renderBefore ?? null;
    i._$litPart$ = s = new J(e.insertBefore(Z(), o), o, void 0, t ?? {});
  }
  return s._$AI(r), s;
};
const Ae = globalThis;
class T extends F {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = It(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return j;
  }
}
T._$litElement$ = !0, T.finalized = !0, Ae.litElementHydrateSupport?.({ LitElement: T });
const Ct = Ae.litElementPolyfillSupport;
Ct?.({ LitElement: T });
(Ae.litElementVersions ??= []).push("4.2.2");
const Nt = { attribute: !0, type: String, converter: oe, reflect: !1, hasChanged: xe }, Ot = (r = Nt, e, t) => {
  const { kind: i, metadata: s } = t;
  let o = globalThis.litPropertyMetadata.get(s);
  if (o === void 0 && globalThis.litPropertyMetadata.set(s, o = /* @__PURE__ */ new Map()), i === "setter" && ((r = Object.create(r)).wrapped = !0), o.set(t.name, r), i === "accessor") {
    const { name: n } = t;
    return { set(l) {
      const d = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(n, d, r, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(n, void 0, r, l), l;
    } };
  }
  if (i === "setter") {
    const { name: n } = t;
    return function(l) {
      const d = this[n];
      e.call(this, l), this.requestUpdate(n, d, r, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function y(r) {
  return (e, t) => typeof t == "object" ? Ot(r, e, t) : ((i, s, o) => {
    const n = s.hasOwnProperty(o);
    return s.constructor.createProperty(o, i), n ? Object.getOwnPropertyDescriptor(s, o) : void 0;
  })(r, e, t);
}
function _(r) {
  return y({ ...r, state: !0, attribute: !1 });
}
function g(r) {
  if (typeof r == "number" && Number.isFinite(r)) return r;
  if (typeof r == "string" && r.trim() !== "") {
    const e = Number(r);
    if (Number.isFinite(e)) return e;
  }
}
function k(r) {
  return typeof r == "string" && r !== "" ? r : void 0;
}
function Pt(r) {
  return Array.isArray(r) ? r : [];
}
function me(r) {
  return !r || r.state === "unavailable" || r.state === "unknown";
}
function ae(r, e, t) {
  return Math.min(t, Math.max(e, r));
}
function ee(r, e) {
  customElements.get(r) || customElements.define(r, e);
}
const ve = {
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
  "editor.volume_note": "This program uses a volume curve (liters). Edit it in the zone settings."
}, Dt = {
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
  "editor.volume_note": "Questo programma usa una curva a volume (litri). Modificala nelle impostazioni della zona."
}, ot = {
  en: ve,
  it: Dt
};
function Q(r) {
  const t = (r?.locale?.language ?? r?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in ot ? t : "en";
}
function Ut(r, e) {
  return e ? r.replace(/\{(\w+)\}/g, (t, i) => {
    const s = e[i];
    return s === void 0 ? t : String(s);
  }) : r;
}
function a(r, e, t) {
  const i = ot[r] ?? ve;
  return Ut(i[e] ?? ve[e], t);
}
function Rt(r, e = 1) {
  const t = g(r);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (i) => e > 0 ? "" : i);
}
function Ft(r) {
  const e = Math.abs(Math.round(r)), t = Math.floor(e / 3600), i = Math.round(e % 3600 / 60), s = [];
  return t > 0 && s.push(`${t} h`), i > 0 && s.push(`${i} min`), s.length === 0 && s.push(`${e} s`), s.join(" ");
}
function Lt(r, e) {
  if (!r || typeof r != "object") return "";
  if (r.kind === "sun" && (r.event === "sunrise" || r.event === "sunset")) {
    const i = a(
      e,
      r.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), s = g(r.offset_s) ?? 0;
    if (s === 0) return i;
    const o = s < 0 ? "−" : "+";
    return `${i} ${o} ${Ft(s)}`;
  }
  const t = k(r.at) ?? k(r.time);
  return t ? a(e, "trigger.at", { time: t }) : k(r.kind) ?? "";
}
const Ht = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, jt = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function qt(r) {
  const e = {}, t = /* @__PURE__ */ new Map(), i = [];
  for (const o of Object.values(r.states)) {
    const n = k(o.attributes.maestro_role);
    if (!n) continue;
    i.push(o.entity_id);
    const l = k(o.attributes.zone_id);
    if (l) {
      let d = t.get(l);
      if (d || (d = {
        zoneId: l,
        name: l,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(l, d)), n === "cycle_enabled")
        d.cycleSwitches.push(o);
      else {
        const h = jt[n];
        h && (d[h] = o);
      }
    } else {
      const d = Ht[n];
      d && (e[d] = o);
    }
  }
  const s = [...t.values()];
  for (const o of s) {
    const n = o.state?.attributes ?? {};
    o.name = k(n.zone_name) ?? k(o.state?.attributes.friendly_name) ?? o.zoneId, o.order = g(n.order) ?? g(o.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return s.sort(
    (o, n) => o.order - n.order || o.name.localeCompare(n.name)
  ), { found: i.length > 0, hub: e, zones: s, entityIds: i };
}
function Vt(r) {
  const e = Pt(r.state?.attributes?.cycles), t = [];
  for (const i of e) {
    if (typeof i != "object" || i === null) continue;
    const s = i, o = {
      cycle_id: k(s.cycle_id),
      name: k(s.name),
      enabled: typeof s.enabled == "boolean" ? s.enabled : void 0,
      trigger: s.trigger ?? void 0,
      curve: s.curve ?? void 0
    }, n = s.days;
    Array.isArray(n) && (o.days = n.map((d) => g(d)).filter((d) => d !== void 0));
    const l = s.day_minutes;
    if (l && typeof l == "object") {
      const d = {};
      for (const [h, m] of Object.entries(l)) {
        const p = g(m);
        p !== void 0 && (d[h] = p);
      }
      o.day_minutes = d;
    }
    o.amount = g(s.amount), o.heat = g(s.heat), t.push(o);
  }
  return t;
}
const L = 12, P = 25, H = 35, nt = 3, at = 45, dt = 0, lt = 30, Bt = (P - L) / 10;
function qe(r, e, t) {
  return Math.max(e, Math.min(t, r));
}
function M(r) {
  const e = Math.floor(r), t = r - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function ye(r, e) {
  const t = Math.max(0, M(r - Bt * e));
  return [
    [L, t],
    [P, r],
    [H, r + e]
  ];
}
function D(r, e, t, i) {
  const s = r[0], o = r[r.length - 1];
  let n;
  if (!s || !o)
    n = 0;
  else if (e <= s[0])
    n = s[1];
  else if (e >= o[0])
    n = o[1];
  else {
    n = o[1];
    for (let l = 0; l < r.length - 1; l++) {
      const d = r[l], h = r[l + 1];
      if (!d || !h) continue;
      const [m, p] = d, [f, b] = h;
      if (m <= e && e <= f) {
        n = p + (b - p) * (e - m) / (f - m);
        break;
      }
    }
  }
  return t !== void 0 && (n = Math.max(n, t)), i !== void 0 && (n = Math.min(n, i)), n;
}
function Ve(r, e, t) {
  const i = D(r, P, e, t), s = D(r, H, e, t);
  return {
    amount: qe(M(i), nt, at),
    heat: qe(M(s - i), dt, lt)
  };
}
function Kt(r) {
  if (!Array.isArray(r)) return [];
  const e = [];
  for (const t of r) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const i = g(t[0]), s = g(t[1]);
    i !== void 0 && s !== void 0 && e.push([i, s]);
  }
  return [...e].sort((t, i) => t[0] - i[0]);
}
const de = [0, 1, 2, 3, 4, 5, 6], Be = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
};
function ke(r) {
  return Be[r] ?? Be.en;
}
function Wt(r) {
  return !r || r.length === 0 || r.length >= 7;
}
function ct(r, e) {
  const t = new Set(r);
  return t.has(e) ? t.delete(e) : t.add(e), [...t].sort((i, s) => i - s);
}
function Zt(r) {
  return !r || Object.keys(r).length === 0;
}
function _e(r, e) {
  return r.day_minutes?.[String(e)] ?? r.amount ?? 0;
}
function pt(r, e, t, i, s) {
  return M(D(ye(r, e), t, i, s));
}
var Gt = Object.defineProperty, S = (r, e, t, i) => {
  for (var s = void 0, o = r.length - 1, n; o >= 0; o--)
    (n = r[o]) && (s = n(e, t, s) || s);
  return s && Gt(e, t, s), s;
};
const ge = 320, z = 170, B = 34, Ke = 12, K = 16, A = 24, se = 5, fe = 40, Se = class Se extends T {
  constructor() {
    super(...arguments), this.language = "en", this._amount = 15, this._heat = 15, this._min = 1, this._max = 120, this._advanced = !1, this._dragged = !1, this._points = ye(15, 15);
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = Kt(e?.points);
    if (t.length === 0) return;
    const i = g(e?.min) ?? 1, s = g(e?.max) ?? 120, { amount: o, heat: n } = Ve(t, i, s);
    this._amount = o, this._heat = n, this._min = i, this._max = s, this._dragged = !1, this._points = [
      [L, M(D(t, L))],
      [P, M(D(t, P))],
      [H, M(D(t, H))]
    ];
  }
  _regen() {
    this._points = ye(this._amount, this._heat), this._dragged = !1;
  }
  _onAmount(e) {
    this._amount = Number(e.target.value), this._regen();
  }
  _onHeat(e) {
    this._heat = Number(e.target.value), this._regen();
  }
  _clampedValue(e) {
    return M(D(this._points, e, this._min, this._max));
  }
  _sx(e) {
    return B + (e - se) / (fe - se) * (ge - B - Ke);
  }
  _graphTop() {
    return Math.max(12, ...this._points.map((e) => e[1])) + 4;
  }
  _sy(e) {
    const t = this._graphTop();
    return z - A - e / t * (z - K - A);
  }
  _valueFromY(e) {
    const t = this._graphTop(), i = (z - A - e) / (z - K - A) * t;
    return Math.max(0, M(i));
  }
  _startDrag(e, t) {
    if (!this._advanced) return;
    t.preventDefault();
    const i = t.currentTarget.ownerSVGElement;
    if (!i) return;
    const s = (n) => {
      const l = i.getScreenCTM();
      if (!l) return;
      const d = i.createSVGPoint();
      d.x = n.clientX, d.y = n.clientY;
      const h = d.matrixTransform(l.inverse()).y, m = [...this._points], p = m[e];
      if (!p) return;
      m[e] = [p[0], this._valueFromY(h)], this._points = m, this._dragged = !0;
      const { amount: f, heat: b } = Ve(this._points);
      this._amount = f, this._heat = b;
    }, o = () => {
      window.removeEventListener("pointermove", s), window.removeEventListener("pointerup", o);
    };
    window.addEventListener("pointermove", s), window.addEventListener("pointerup", o);
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
    return this.cycle?.curve?.kind === "volume" ? c`<div class="volume-note">${a(e, "editor.volume_note")}</div>` : c`
      <div class="title">${a(e, "editor.title")}</div>

      <div class="field">
        <div class="row">
          <label>${a(e, "editor.amount.label")}</label>
          <span class="value">${a(e, "editor.amount.value", { min: this._amount })}</span>
        </div>
        <div class="help">${a(e, "editor.amount.help")}</div>
        <input type="range" min=${nt} max=${at} .value=${String(this._amount)}
          @input=${this._onAmount} />
        <div class="ends"><span>${a(e, "editor.amount.low")}</span><span>${a(e, "editor.amount.high")}</span></div>
      </div>

      <div class="field">
        <div class="row">
          <label>${a(e, "editor.heat.label")}</label>
          <span class="value">${a(e, "editor.heat.value", { min: this._heat })}</span>
        </div>
        <div class="help">${a(e, "editor.heat.help")}</div>
        <input type="range" min=${dt} max=${lt} .value=${String(this._heat)}
          @input=${this._onHeat} />
        <div class="ends"><span>${a(e, "editor.heat.low")}</span><span>${a(e, "editor.heat.high")}</span></div>
      </div>

      <div class="graph-box">
        <div class="caption">${a(e, "editor.graph.caption")}</div>
        ${this._renderGraph(e)}
      </div>

      <div class="examples">
        ${this._exampleTile(a(e, "editor.example.cool"), this._clampedValue(L))}
        ${this._exampleTile(a(e, "editor.example.mild"), this._clampedValue(P))}
        ${this._exampleTile(a(e, "editor.example.hot"), this._clampedValue(H))}
      </div>

      ${this._renderToday(e)}

      <div class="advanced-toggle" @click=${() => this._advanced = !this._advanced}>
        ${this._advanced ? "▾" : "▸"} ${a(e, "editor.advanced.toggle")}
      </div>
      ${this._advanced ? this._renderAdvanced(e) : u}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${a(e, "editor.save")}</button>
        <button @click=${this._cancel}>${a(e, "editor.cancel")}</button>
      </div>
    `;
  }
  _exampleTile(e, t) {
    return c`<div class="example"><div class="lbl">${e}</div><div class="num">${t} min</div></div>`;
  }
  _renderToday(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return u;
    const i = this._clampedValue(t);
    return c`<div class="today-banner">${a(e, "editor.today", {
      temp: Math.round(t),
      min: i
    })}</div>`;
  }
  _renderAdvanced(e) {
    return c`
      <div class="help">${a(e, "editor.advanced.help")}</div>
      <div class="limits">
        <div class="limit">
          <label>${a(e, "editor.min.label")}</label>
          <div class="help">${a(e, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(t) => {
      const i = Number(t.target.value);
      Number.isNaN(i) || (this._min = Math.min(i, this._max));
    }} /> min
        </div>
        <div class="limit">
          <label>${a(e, "editor.max.label")}</label>
          <div class="help">${a(e, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(t) => {
      const i = Number(t.target.value);
      Number.isNaN(i) || (this._max = Math.max(i, this._min));
    }} /> min
        </div>
      </div>
      <div class="note">${a(e, "editor.drag_hint")}</div>
      <div class="note">${a(e, "editor.more_points")}</div>
    `;
  }
  _renderGraph(e) {
    const t = [];
    for (let n = se; n <= fe; n += 1)
      t.push([this._sx(n), this._sy(this._clampedValue(n))]);
    const i = t.map((n, l) => `${l === 0 ? "M" : "L"}${n[0].toFixed(1)},${n[1].toFixed(1)}`).join(" "), s = this.weightedTemp, o = s !== void 0 && !Number.isNaN(s) && s >= se && s <= fe;
    return he`
      <svg viewBox="0 0 ${ge} ${z}">
        <line class="axis" x1=${B} y1=${K} x2=${B} y2=${z - A}></line>
        <line class="axis" x1=${B} y1=${z - A} x2=${ge - Ke} y2=${z - A}></line>
        <text class="tick" x=${this._sx(L)} y=${z - A + 12} text-anchor="middle">12°</text>
        <text class="tick" x=${this._sx(P)} y=${z - A + 12} text-anchor="middle">25°</text>
        <text class="tick" x=${this._sx(H)} y=${z - A + 12} text-anchor="middle">35°</text>
        ${o ? he`<line class="today" x1=${this._sx(s)} y1=${K} x2=${this._sx(s)} y2=${z - A}></line>
              <text class="today-text" x=${this._sx(s)} y=${K - 4} text-anchor="middle">${a(e, "editor.graph.today", { temp: Math.round(s) })}</text>` : u}
        <path class="curve" d=${i}></path>
        ${this._points.map(
      (n, l) => he`<circle class="handle" r=${this._advanced ? 7 : 3.5}
            cx=${this._sx(n[0]).toFixed(1)} cy=${this._sy(this._clampedValue(n[0])).toFixed(1)}
            @pointerdown=${(d) => this._startDrag(l, d)}></circle>`
    )}
      </svg>
    `;
  }
};
Se.styles = Y`
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
let $ = Se;
S([
  y()
], $.prototype, "language");
S([
  y({ attribute: !1 })
], $.prototype, "cycle");
S([
  y({ attribute: !1 })
], $.prototype, "weightedTemp");
S([
  _()
], $.prototype, "_amount");
S([
  _()
], $.prototype, "_heat");
S([
  _()
], $.prototype, "_min");
S([
  _()
], $.prototype, "_max");
S([
  _()
], $.prototype, "_advanced");
S([
  _()
], $.prototype, "_dragged");
S([
  _()
], $.prototype, "_points");
ee("imc-curve-editor", $);
var Xt = Object.defineProperty, w = (r, e, t, i) => {
  for (var s = void 0, o = r.length - 1, n; o >= 0; o--)
    (n = r[o]) && (s = n(e, t, s) || s);
  return s && Xt(e, t, s), s;
};
const We = 15, Ze = 1, Ge = 1440, Qt = -360, Yt = 360, Jt = 5, Ee = class Ee extends T {
  constructor() {
    super(...arguments), this.zoneId = "", this._days = [...de], this._startKind = "time", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._uniformMinutes = We, this._dayMinutes = {}, this._sameForAll = !0, this._advancedOpen = !1;
  }
  /**
   * Volume-mode programs (liters, edited via the curve editor's
   * amount/heat controls) have no minutes to save here — `amount`/`heat`
   * come back null for them. Duration steppers + weather preview only make
   * sense for a "duration" curve.
   */
  get _isVolume() {
    return this.cycle?.curve?.kind === "volume";
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
    this._days = e.days && e.days.length > 0 ? [...e.days] : [...de];
    const t = e.trigger;
    t?.kind === "sun" ? (this._startKind = "sun", this._startEvent = t.event === "sunset" ? "sunset" : "sunrise", this._startOffsetMin = Math.round((g(t.offset_s) ?? 0) / 60)) : (this._startKind = "time", this._startEvent = "sunrise", this._startOffsetMin = 0), this._startAt = t?.at ?? t?.time ?? "06:00", this._uniformMinutes = g(e.amount) ?? We, this._dayMinutes = e.day_minutes ? { ...e.day_minutes } : {}, this._sameForAll = Zt(e.day_minutes);
  }
  render() {
    const e = this.cycle;
    if (!e) return c``;
    const t = Q(this.hass), i = ke(t);
    return c`
      <div class="section-label">${a(t, "program_editor.days")}</div>
      <div class="days">
        ${i.map(
      (s, o) => c`
            <div
              class="day ${this._days.includes(o) ? "on" : ""}"
              @click=${() => this._days = ct(this._days, o)}
            >
              ${s}
            </div>
          `
    )}
      </div>

      <div class="section-label">${a(t, "program_editor.start")}</div>
      <div class="start-row">
        <span class="seg">
          <span
            class="${this._startKind === "time" ? "sel" : ""}"
            @click=${() => this._startKind = "time"}
            >${a(t, "program_editor.start_fixed")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
            @click=${() => this._setSun("sunrise")}
            >${a(t, "program_editor.start_sunrise")}</span
          >
          <span
            class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
            @click=${() => this._setSun("sunset")}
            >${a(t, "program_editor.start_sunset")}</span
          >
        </span>
        ${this._startKind === "time" ? c`<input
              type="time"
              class="timebox"
              .value=${this._startAt}
              @input=${(s) => this._startAt = s.target.value}
            />` : this._stepper(this._startOffsetMin, (s) => this._startOffsetMin = s, {
      min: Qt,
      max: Yt,
      step: Jt,
      suffix: "min",
      signed: !0
    })}
      </div>

      ${this._isVolume ? c`<div class="volume-note">${a(t, "editor.volume_note")}</div>` : c`
            <div class="section-label">${a(t, "program_editor.duration_per_day")}</div>
            ${this._renderDurations(t, i)}
            <div class="same-row" @click=${() => this._sameForAll = !this._sameForAll}>
              <span class="switch ${this._sameForAll ? "on" : ""}"></span>
              ${a(t, "program_editor.same_duration")}
            </div>

            ${this._renderWeatherLine(t, e)}
          `}
      ${this._days.length === 0 ? c`<div class="hint">${a(t, "panel.pick_a_day")}</div>` : u}

      <div
        class="section-label advanced-toggle"
        @click=${() => this._advancedOpen = !this._advancedOpen}
      >
        ${this._advancedOpen ? "▾" : "▸"} ${a(t, "panel.advanced")}
      </div>
      ${this._advancedOpen ? this._renderAdvanced(t) : u}

      <div class="buttons">
        <button class="primary" ?disabled=${this._days.length === 0} @click=${this._save}>
          ${a(t, "editor.save")}
        </button>
        <button @click=${this._cancel}>${a(t, "editor.cancel")}</button>
      </div>
    `;
  }
  _setSun(e) {
    this._startKind = "sun", this._startEvent = e;
  }
  _renderAdvanced(e) {
    return c`
      <div class="section-label">${a(e, "panel.heat_response")}</div>
      <imc-curve-editor
        .cycle=${this.cycle}
        .weightedTemp=${this.weightedTemp}
        .language=${Q(this.hass)}
        @imc-curve-save=${this._onCurveSave}
        @imc-curve-cancel=${() => this._advancedOpen = !1}
      ></imc-curve-editor>
    `;
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
    const i = a(e, "curve.unit_duration");
    return this._sameForAll ? c`<div class="duration-row">
        ${this._stepper(this._uniformMinutes, (s) => this._uniformMinutes = s, {
      min: Ze,
      max: Ge,
      step: 1,
      suffix: i
    })}
      </div>` : c`${this._days.map((s) => {
      const o = _e({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, s);
      return c`<div class="duration-row">
        <span class="dname">${t[s] ?? ""}</span>
        ${this._stepper(
        o,
        (n) => this._dayMinutes = { ...this._dayMinutes, [String(s)]: n },
        { min: Ze, max: Ge, step: 1, suffix: i }
      )}
      </div>`;
    })}`;
  }
  _stepper(e, t, i) {
    const s = i.signed && e > 0 ? "+" : "";
    return c`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(ae(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${s}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(ae(e + i.step, i.min, i.max))}
        >
          +
        </button>
      </span>
    `;
  }
  _renderWeatherLine(e, t) {
    const i = this.weightedTemp;
    if (i === void 0 || Number.isNaN(i)) return u;
    const s = ((/* @__PURE__ */ new Date()).getDay() + 6) % 7;
    if (!(this._days.length >= 7) && !this._days.includes(s))
      return c`<div class="weather">${a(e, "reason.day_not_scheduled")}</div>`;
    const n = this._sameForAll ? this._uniformMinutes : _e({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, s), l = g(t.heat) ?? 8, d = pt(
      n,
      l,
      i,
      g(t.curve?.min),
      g(t.curve?.max)
    ), h = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    });
    return c`<div class="weather">
      ${a(e, "panel.weather_line", { day: h, min: d })}
    </div>`;
  }
  _buildDayMinutes() {
    const e = {};
    for (const t of this._days)
      e[String(t)] = _e(
        { amount: this._uniformMinutes, day_minutes: this._dayMinutes },
        t
      );
    return e;
  }
  _save() {
    if (this._days.length === 0) return;
    const e = this.zoneId, t = this.cycle?.cycle_id ?? "", i = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin }, s = [...this._days].sort((l, d) => l - d), o = s.length >= 7 ? [] : s;
    if (this.dispatchEvent(
      new CustomEvent("imc-program-save-schedule", {
        detail: { zoneId: e, programId: t, days: o, start: i },
        bubbles: !0,
        composed: !0
      })
    ), this._isVolume) return;
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
Ee.styles = Y`
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
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--error-color, #db4437);
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
let v = Ee;
w([
  y({ attribute: !1 })
], v.prototype, "hass");
w([
  y()
], v.prototype, "zoneId");
w([
  y({ attribute: !1 })
], v.prototype, "cycle");
w([
  y({ attribute: !1 })
], v.prototype, "weightedTemp");
w([
  _()
], v.prototype, "_days");
w([
  _()
], v.prototype, "_startKind");
w([
  _()
], v.prototype, "_startAt");
w([
  _()
], v.prototype, "_startEvent");
w([
  _()
], v.prototype, "_startOffsetMin");
w([
  _()
], v.prototype, "_uniformMinutes");
w([
  _()
], v.prototype, "_dayMinutes");
w([
  _()
], v.prototype, "_sameForAll");
w([
  _()
], v.prototype, "_advancedOpen");
ee("imc-program-editor", v);
var ei = Object.defineProperty, E = (r, e, t, i) => {
  for (var s = void 0, o = r.length - 1, n; o >= 0; o--)
    (n = r[o]) && (s = n(e, t, s) || s);
  return s && ei(e, t, s), s;
};
const ti = 15, ii = 8, si = 1, ri = 60, oi = 1, ni = 1440, ai = -360, di = 360, li = 5, Xe = [0, 2, 4], Qe = [5, 6];
function Ye(r, e) {
  return r.length !== e.length ? !1 : [...r].sort((i, s) => i - s).every((i, s) => i === e[s]);
}
const Me = class Me extends T {
  constructor() {
    super(...arguments), this.zoneId = "", this._step = 1, this._days = [...de], this._startKind = "sun", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._minutes = ti;
  }
  render() {
    const e = Q(this.hass);
    return c`
      <div class="head">
        <span class="title">${this._stepTitle(e)}</span>
        <button class="close" @click=${this._cancel} aria-label=${a(e, "editor.cancel")}>
          ✕
        </button>
      </div>
      <div class="dots">
        ${[1, 2, 3].map(
      (t) => c`<span class="dot ${this._step === t ? "on" : ""}"></span>`
    )}
      </div>
      ${this._step === 1 ? this._renderStep1(e) : u}
      ${this._step === 2 ? this._renderStep2(e) : u}
      ${this._step === 3 ? this._renderStep3(e) : u}
      <div class="buttons">
        ${this._step > 1 ? c`<button @click=${this._back}>${a(e, "wizard.back")}</button>` : c`<button @click=${this._cancel}>${a(e, "editor.cancel")}</button>`}
        ${this._step < 3 ? c`<button
              class="primary"
              ?disabled=${this._days.length === 0}
              @click=${this._next}
            >
              ${a(e, "wizard.next")}
            </button>` : c`<button
              class="primary"
              ?disabled=${this._days.length === 0}
              @click=${this._finish}
            >
              ${a(e, "wizard.finish")}
            </button>`}
      </div>
    `;
  }
  _stepTitle(e) {
    return this._step === 1 ? a(e, "wizard.step1_title") : this._step === 2 ? a(e, "wizard.step2_title") : a(e, "wizard.step3_title");
  }
  _renderStep1(e) {
    const t = ke(e);
    return c`
      <div class="days">
        ${t.map(
      (i, s) => c`
            <div
              class="day ${this._days.includes(s) ? "on" : ""}"
              @click=${() => this._days = ct(this._days, s)}
            >
              ${i}
            </div>
          `
    )}
      </div>
      <div class="presets">
        <span
          class="preset ${this._days.length === 7 ? "sel" : ""}"
          @click=${() => this._days = [...de]}
        >
          ${a(e, "wizard.preset_every_day")}
        </span>
        <span
          class="preset ${Ye(this._days, Xe) ? "sel" : ""}"
          @click=${() => this._days = [...Xe]}
        >
          ${a(e, "wizard.preset_alternate")}
        </span>
        <span
          class="preset ${Ye(this._days, Qe) ? "sel" : ""}"
          @click=${() => this._days = [...Qe]}
        >
          ${a(e, "wizard.preset_weekend")}
        </span>
      </div>
      ${this._days.length === 0 ? c`<div class="hint">${a(e, "panel.pick_a_day")}</div>` : u}
    `;
  }
  _renderStep2(e) {
    return c`
      <div class="seg">
        <span
          class="${this._startKind === "time" ? "sel" : ""}"
          @click=${() => this._startKind = "time"}
        >
          ${a(e, "program_editor.start_fixed")}
        </span>
        <span
          class="${this._startKind === "sun" && this._startEvent === "sunrise" ? "sel" : ""}"
          @click=${() => this._setSun("sunrise")}
        >
          ${a(e, "program_editor.start_sunrise")}
        </span>
        <span
          class="${this._startKind === "sun" && this._startEvent === "sunset" ? "sel" : ""}"
          @click=${() => this._setSun("sunset")}
        >
          ${a(e, "program_editor.start_sunset")}
        </span>
      </div>
      ${this._startKind === "time" ? c`<input
            type="time"
            class="timebox"
            .value=${this._startAt}
            @input=${(t) => this._startAt = t.target.value}
          />` : c`<div class="offset-row">
            ${this._stepper(this._startOffsetMin, (t) => this._startOffsetMin = t, {
      min: ai,
      max: di,
      step: li,
      suffix: "min",
      signed: !0
    })}
          </div>`}
    `;
  }
  _renderStep3(e) {
    const t = a(e, "curve.unit_duration");
    return c`
      <div class="stepper-row">
        ${this._stepper(this._minutes, (i) => this._minutes = i, {
      min: oi,
      max: ni,
      step: 1,
      suffix: t
    })}
      </div>
      ${this._renderPreview(e)}
    `;
  }
  _renderPreview(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return u;
    const i = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    }), s = pt(
      this._minutes,
      ii,
      t,
      si,
      ri
    );
    return c`<div class="done">
      ${a(e, "wizard.done_prefix")}
      ${a(e, "panel.weather_line", { day: i, min: s })}
    </div>`;
  }
  _stepper(e, t, i) {
    const s = i.signed && e > 0 ? "+" : "";
    return c`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(ae(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${s}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(ae(e + i.step, i.min, i.max))}
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
    const e = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin }, t = [...this._days].sort((s, o) => s - o), i = t.length >= 7 ? [] : t;
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
Me.styles = Y`
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
let x = Me;
E([
  y({ attribute: !1 })
], x.prototype, "hass");
E([
  y()
], x.prototype, "zoneId");
E([
  y({ attribute: !1 })
], x.prototype, "weightedTemp");
E([
  _()
], x.prototype, "_step");
E([
  _()
], x.prototype, "_days");
E([
  _()
], x.prototype, "_startKind");
E([
  _()
], x.prototype, "_startAt");
E([
  _()
], x.prototype, "_startEvent");
E([
  _()
], x.prototype, "_startOffsetMin");
E([
  _()
], x.prototype, "_minutes");
ee("imc-program-wizard", x);
var ci = Object.defineProperty, te = (r, e, t, i) => {
  for (var s = void 0, o = r.length - 1, n; o >= 0; o--)
    (n = r[o]) && (s = n(e, t, s) || s);
  return s && ci(e, t, s), s;
};
const Te = class Te extends T {
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
    const i = Q(e), s = Vt(t);
    return c`
      ${s.length === 0 ? c`<div class="meta">${a(i, "panel.no_programs")}</div>` : this._renderCycles(i, e, t, s)}
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
              ＋ ${a(e, "panel.add_program")}
            </button>`}
      </div>
    `;
  }
  _renderCycles(e, t, i, s) {
    const o = ke(e);
    return c`${s.map((n) => {
      const l = n.days ?? [], d = Wt(n.days), h = !!n.cycle_id && this._editingId === n.cycle_id, m = n.cycle_id ? this._findCycleSwitch(i, n.cycle_id) : void 0, p = m?.state === "on";
      return c`
        <div class="prog">
          <div class="name">${n.name ?? n.cycle_id}</div>
          <div class="days">
            ${o.map(
        (f, b) => c`
                <div class="day ${d || l.includes(b) ? "on" : ""}">
                  ${f}
                </div>
              `
      )}
          </div>
          <div class="meta">
            ${Lt(n.trigger, e)} · ${this._minutesSummary(e, n)}
          </div>
          ${m ? c`<div
                class="toggle-row"
                role="switch"
                tabindex="0"
                aria-checked=${p ? "true" : "false"}
                @click=${() => this._onToggle(i.zoneId, n, m)}
                @keydown=${(f) => this._onToggleKeydown(f, i.zoneId, n, m)}
              >
                <span class="switch ${p ? "on" : ""}"></span>
                <span
                  >${a(
        e,
        p ? "zone.cycle_enabled" : "zone.cycle_disabled"
      )}</span
                >
              </div>` : u}
          ${n.cycle_id ? c`<div class="actions">
                <button
                  class="link-btn"
                  @click=${() => this._editingId = h ? void 0 : n.cycle_id}
                >
                  ${a(e, "panel.edit_program")}
                </button>
                <button class="link-btn" @click=${() => this._onRename(e, i.zoneId, n)}>
                  ${a(e, "panel.rename_program")}
                </button>
                <button
                  class="link-btn danger"
                  @click=${() => this._onDelete(e, i.zoneId, n)}
                >
                  ${a(e, "panel.delete_program")}
                </button>
              </div>` : u}
          ${h ? c`<imc-program-editor
                .hass=${t}
                .zoneId=${i.zoneId}
                .cycle=${n}
                .weightedTemp=${this.weightedTemp}
                @imc-program-save-schedule=${() => this._editingId = void 0}
                @imc-program-save-minutes=${() => this._editingId = void 0}
                @imc-program-cancel=${() => this._editingId = void 0}
              ></imc-program-editor>` : u}
        </div>
      `;
    })}`;
  }
  /** Find the `cycle_enabled` switch entity for a program, matched by the
   *  discovery-assigned `cycle_id` attribute (see docs/design/card-contract.md). */
  _findCycleSwitch(e, t) {
    return e.cycleSwitches.find((i) => k(i.attributes.cycle_id) === t);
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
  _onToggleKeydown(e, t, i, s) {
    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this._onToggle(t, i, s));
  }
  _onRename(e, t, i) {
    if (!i.cycle_id) return;
    const s = i.name ?? "", o = window.prompt(a(e, "panel.rename_program"), s);
    if (o === null) return;
    const n = o.trim();
    !n || n === s || this._dispatch("imc-program-rename", {
      zoneId: t,
      programId: i.cycle_id,
      name: n
    });
  }
  _onDelete(e, t, i) {
    if (!i.cycle_id) return;
    const s = i.name ?? i.cycle_id;
    window.confirm(a(e, "panel.confirm_delete_program", { name: s })) && this._dispatch("imc-program-remove", { zoneId: t, programId: i.cycle_id });
  }
  _minutesSummary(e, t) {
    return t.day_minutes && Object.keys(t.day_minutes).length > 0 ? a(e, "panel.per_day_minutes") : a(e, "panel.minutes_value", { min: t.amount ?? "?" });
  }
};
Te.styles = Y`
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
let C = Te;
te([
  y({ attribute: !1 })
], C.prototype, "hass");
te([
  y({ attribute: !1 })
], C.prototype, "zone");
te([
  y({ attribute: !1 })
], C.prototype, "weightedTemp");
te([
  _()
], C.prototype, "_editingId");
te([
  _()
], C.prototype, "_wizardOpen");
ee("imc-program-list", C);
var pi = Object.defineProperty, pe = (r, e, t, i) => {
  for (var s = void 0, o = r.length - 1, n; o >= 0; o--)
    (n = r[o]) && (s = n(e, t, s) || s);
  return s && pi(e, t, s), s;
};
const Ie = class Ie extends T {
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
        return await this.hass.callService(e, t, i, void 0, !1, s);
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
   * `imc-curve-save`, re-dispatched by `program-editor.ts` with `zoneId`
   * attached (the embedded `imc-curve-editor`'s own event has no zoneId —
   * see the doc comment on `ProgramCurveSaveDetail`). The curve services use
   * DIFFERENT field names than the schedule/minutes services above:
   * `cycle_id` (not `program_id`) and `min_value`/`max_value` (not
   * `min`/`max`) — mirrors the dashboard card's handler at `card.ts:213-231`.
   */
  _onCurveSave(e) {
    const { zoneId: t, curve: i } = e.detail;
    i.mode === "simple" ? this._call("irrigation_maestro", "set_simple_curve", {
      zone_id: t,
      cycle_id: i.cycleId,
      amount: i.amount,
      heat: i.heat,
      min_value: i.min,
      max_value: i.max
    }) : this._call("irrigation_maestro", "set_curve", {
      zone_id: t,
      cycle_id: i.cycleId,
      points: i.points,
      min_value: i.min,
      max_value: i.max
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
      days: t.days,
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
    const t = Q(e), i = qt(e);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(e.states).length, !i.found || i.zones.length === 0)
      return c`
        <div class="wrap">
          <header><h1>${a(t, "panel.title")}</h1></header>
          <div class="empty">${a(t, "panel.no_zones")}</div>
        </div>
      `;
    const s = this._resolveSelected(i.zones), o = me(i.hub.weightedTemp) ? void 0 : g(i.hub.weightedTemp?.state);
    return c`
      <div
        class="wrap ${this.narrow ? "narrow" : ""}"
        @imc-program-save-schedule=${this._onSaveSchedule}
        @imc-program-save-minutes=${this._onSaveMinutes}
        @imc-curve-save=${this._onCurveSave}
        @imc-program-cancel=${() => {
    }}
        @imc-program-toggle=${this._onProgramToggle}
        @imc-program-rename=${this._onProgramRename}
        @imc-program-remove=${this._onProgramRemove}
        @imc-wizard-finish=${this._onWizardFinish}
        @imc-wizard-cancel=${() => {
    }}
      >
        <header><h1>${a(t, "panel.title")}</h1></header>
        ${this._renderWeatherContext(i, t, o)}
        ${this._error ? c`<div class="error">${this._error}</div>` : u}
        <div class="tabs">
          ${i.zones.map(
      (n) => c`
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
          .weightedTemp=${o}
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
    if (i === void 0) return u;
    const s = me(e.hub.waterBudget) ? void 0 : g(e.hub.waterBudget?.state), o = me(e.hub.skipThreshold) ? void 0 : g(e.hub.skipThreshold?.state), n = s !== void 0 && o !== void 0 ? s >= o ? "panel.budget_ok" : "panel.budget_low" : void 0;
    return c`
      <div class="meteo">
        ${a(t, "panel.weather_temp", { temp: Rt(i, 1) ?? "" })}
        ${n ? c` · ${a(t, n)}` : u}
      </div>
    `;
  }
};
Ie.styles = Y`
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
  `;
let R = Ie;
pe([
  y({ attribute: !1 })
], R.prototype, "hass");
pe([
  y({ type: Boolean })
], R.prototype, "narrow");
pe([
  _()
], R.prototype, "_selectedZoneId");
pe([
  _()
], R.prototype, "_error");
ee("irrigation-maestro-panel", R);
