/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const Ce = globalThis, We = Ce.ShadowRoot && (Ce.ShadyCSS === void 0 || Ce.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Ze = /* @__PURE__ */ Symbol(), ft = /* @__PURE__ */ new WeakMap();
let qt = class {
  constructor(e, t, o) {
    if (this._$cssResult$ = !0, o !== Ze) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (We && e === void 0) {
      const o = t !== void 0 && t.length === 1;
      o && (e = ft.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), o && ft.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const no = (i) => new qt(typeof i == "string" ? i : i + "", void 0, Ze), k = (i, ...e) => {
  const t = i.length === 1 ? i[0] : e.reduce((o, n, a) => o + ((r) => {
    if (r._$cssResult$ === !0) return r.cssText;
    if (typeof r == "number") return r;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + r + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(n) + i[a + 1], i[0]);
  return new qt(t, i, Ze);
}, io = (i, e) => {
  if (We) i.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const o = document.createElement("style"), n = Ce.litNonce;
    n !== void 0 && o.setAttribute("nonce", n), o.textContent = t.cssText, i.appendChild(o);
  }
}, vt = We ? (i) => i : (i) => i instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const o of e.cssRules) t += o.cssText;
  return no(t);
})(i) : i;
const { is: ao, defineProperty: ro, getOwnPropertyDescriptor: so, getOwnPropertyNames: lo, getOwnPropertySymbols: co, getPrototypeOf: uo } = Object, Ie = globalThis, yt = Ie.trustedTypes, po = yt ? yt.emptyScript : "", ho = Ie.reactiveElementPolyfillSupport, he = (i, e) => i, Te = { toAttribute(i, e) {
  switch (e) {
    case Boolean:
      i = i ? po : null;
      break;
    case Object:
    case Array:
      i = i == null ? i : JSON.stringify(i);
  }
  return i;
}, fromAttribute(i, e) {
  let t = i;
  switch (e) {
    case Boolean:
      t = i !== null;
      break;
    case Number:
      t = i === null ? null : Number(i);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(i);
      } catch {
        t = null;
      }
  }
  return t;
} }, Ge = (i, e) => !ao(i, e), bt = { attribute: !0, type: String, converter: Te, reflect: !1, useDefault: !1, hasChanged: Ge };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), Ie.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let ae = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = bt) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const o = /* @__PURE__ */ Symbol(), n = this.getPropertyDescriptor(e, o, t);
      n !== void 0 && ro(this.prototype, e, n);
    }
  }
  static getPropertyDescriptor(e, t, o) {
    const { get: n, set: a } = so(this.prototype, e) ?? { get() {
      return this[t];
    }, set(r) {
      this[t] = r;
    } };
    return { get: n, set(r) {
      const c = n?.call(this);
      a?.call(this, r), this.requestUpdate(e, c, o);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? bt;
  }
  static _$Ei() {
    if (this.hasOwnProperty(he("elementProperties"))) return;
    const e = uo(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(he("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(he("properties"))) {
      const t = this.properties, o = [...lo(t), ...co(t)];
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
      for (const n of o) t.unshift(vt(n));
    } else e !== void 0 && t.push(vt(e));
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
    return io(e, this.constructor.elementStyles), e;
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
      const a = (o.converter?.toAttribute !== void 0 ? o.converter : Te).toAttribute(t, o.type);
      this._$Em = e, a == null ? this.removeAttribute(n) : this.setAttribute(n, a), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const o = this.constructor, n = o._$Eh.get(e);
    if (n !== void 0 && this._$Em !== n) {
      const a = o.getPropertyOptions(n), r = typeof a.converter == "function" ? { fromAttribute: a.converter } : a.converter?.fromAttribute !== void 0 ? a.converter : Te;
      this._$Em = n;
      const c = r.fromAttribute(t, a.type);
      this[n] = c ?? this._$Ej?.get(n) ?? c, this._$Em = null;
    }
  }
  requestUpdate(e, t, o, n = !1, a) {
    if (e !== void 0) {
      const r = this.constructor;
      if (n === !1 && (a = this[e]), o ??= r.getPropertyOptions(e), !((o.hasChanged ?? Ge)(a, t) || o.useDefault && o.reflect && a === this._$Ej?.get(e) && !this.hasAttribute(r._$Eu(e, o)))) return;
      this.C(e, t, o);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: o, reflect: n, wrapped: a }, r) {
    o && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, r ?? t ?? this[e]), a !== !0 || r !== void 0) || (this._$AL.has(e) || (this.hasUpdated || o || (t = void 0), this._$AL.set(e, t)), n === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [n, a] of this._$Ep) this[n] = a;
        this._$Ep = void 0;
      }
      const o = this.constructor.elementProperties;
      if (o.size > 0) for (const [n, a] of o) {
        const { wrapped: r } = a, c = this[n];
        r !== !0 || this._$AL.has(n) || c === void 0 || this.C(n, void 0, a, c);
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
ae.elementStyles = [], ae.shadowRootOptions = { mode: "open" }, ae[he("elementProperties")] = /* @__PURE__ */ new Map(), ae[he("finalized")] = /* @__PURE__ */ new Map(), ho?.({ ReactiveElement: ae }), (Ie.reactiveElementVersions ??= []).push("2.1.2");
const Qe = globalThis, xt = (i) => i, Pe = Qe.trustedTypes, wt = Pe ? Pe.createPolicy("lit-html", { createHTML: (i) => i }) : void 0, Ot = "$lit$", F = `lit$${Math.random().toFixed(9).slice(2)}$`, Rt = "?" + F, _o = `<${Rt}>`, Y = document, _e = () => Y.createComment(""), me = (i) => i === null || typeof i != "object" && typeof i != "function", Ke = Array.isArray, mo = (i) => Ke(i) || typeof i?.[Symbol.iterator] == "function", je = `[ 	
\f\r]`, ue = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, $t = /-->/g, zt = />/g, Z = RegExp(`>|${je}(?:([^\\s"'>=/]+)(${je}*=${je}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), kt = /'/g, St = /"/g, Lt = /^(?:script|style|textarea|title)$/i, Ft = (i) => (e, ...t) => ({ _$litType$: i, strings: e, values: t }), d = Ft(1), M = Ft(2), se = /* @__PURE__ */ Symbol.for("lit-noChange"), u = /* @__PURE__ */ Symbol.for("lit-nothing"), At = /* @__PURE__ */ new WeakMap(), K = Y.createTreeWalker(Y, 129);
function jt(i, e) {
  if (!Ke(i) || !i.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return wt !== void 0 ? wt.createHTML(e) : e;
}
const go = (i, e) => {
  const t = i.length - 1, o = [];
  let n, a = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", r = ue;
  for (let c = 0; c < t; c++) {
    const l = i[c];
    let p, h, _ = -1, g = 0;
    for (; g < l.length && (r.lastIndex = g, h = r.exec(l), h !== null); ) g = r.lastIndex, r === ue ? h[1] === "!--" ? r = $t : h[1] !== void 0 ? r = zt : h[2] !== void 0 ? (Lt.test(h[2]) && (n = RegExp("</" + h[2], "g")), r = Z) : h[3] !== void 0 && (r = Z) : r === Z ? h[0] === ">" ? (r = n ?? ue, _ = -1) : h[1] === void 0 ? _ = -2 : (_ = r.lastIndex - h[2].length, p = h[1], r = h[3] === void 0 ? Z : h[3] === '"' ? St : kt) : r === St || r === kt ? r = Z : r === $t || r === zt ? r = ue : (r = Z, n = void 0);
    const y = r === Z && i[c + 1].startsWith("/>") ? " " : "";
    a += r === ue ? l + _o : _ >= 0 ? (o.push(p), l.slice(0, _) + Ot + l.slice(_) + F + y) : l + F + (_ === -2 ? c : y);
  }
  return [jt(i, a + (i[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), o];
};
class ge {
  constructor({ strings: e, _$litType$: t }, o) {
    let n;
    this.parts = [];
    let a = 0, r = 0;
    const c = e.length - 1, l = this.parts, [p, h] = go(e, t);
    if (this.el = ge.createElement(p, o), K.currentNode = this.el.content, t === 2 || t === 3) {
      const _ = this.el.content.firstChild;
      _.replaceWith(..._.childNodes);
    }
    for (; (n = K.nextNode()) !== null && l.length < c; ) {
      if (n.nodeType === 1) {
        if (n.hasAttributes()) for (const _ of n.getAttributeNames()) if (_.endsWith(Ot)) {
          const g = h[r++], y = n.getAttribute(_).split(F), w = /([.?@])?(.*)/.exec(g);
          l.push({ type: 1, index: a, name: w[2], strings: y, ctor: w[1] === "." ? vo : w[1] === "?" ? yo : w[1] === "@" ? bo : qe }), n.removeAttribute(_);
        } else _.startsWith(F) && (l.push({ type: 6, index: a }), n.removeAttribute(_));
        if (Lt.test(n.tagName)) {
          const _ = n.textContent.split(F), g = _.length - 1;
          if (g > 0) {
            n.textContent = Pe ? Pe.emptyScript : "";
            for (let y = 0; y < g; y++) n.append(_[y], _e()), K.nextNode(), l.push({ type: 2, index: ++a });
            n.append(_[g], _e());
          }
        }
      } else if (n.nodeType === 8) if (n.data === Rt) l.push({ type: 2, index: a });
      else {
        let _ = -1;
        for (; (_ = n.data.indexOf(F, _ + 1)) !== -1; ) l.push({ type: 7, index: a }), _ += F.length - 1;
      }
      a++;
    }
  }
  static createElement(e, t) {
    const o = Y.createElement("template");
    return o.innerHTML = e, o;
  }
}
function le(i, e, t = i, o) {
  if (e === se) return e;
  let n = o !== void 0 ? t._$Co?.[o] : t._$Cl;
  const a = me(e) ? void 0 : e._$litDirective$;
  return n?.constructor !== a && (n?._$AO?.(!1), a === void 0 ? n = void 0 : (n = new a(i), n._$AT(i, t, o)), o !== void 0 ? (t._$Co ??= [])[o] = n : t._$Cl = n), n !== void 0 && (e = le(i, n._$AS(i, e.values), n, o)), e;
}
class fo {
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
    const { el: { content: t }, parts: o } = this._$AD, n = (e?.creationScope ?? Y).importNode(t, !0);
    K.currentNode = n;
    let a = K.nextNode(), r = 0, c = 0, l = o[0];
    for (; l !== void 0; ) {
      if (r === l.index) {
        let p;
        l.type === 2 ? p = new be(a, a.nextSibling, this, e) : l.type === 1 ? p = new l.ctor(a, l.name, l.strings, this, e) : l.type === 6 && (p = new xo(a, this, e)), this._$AV.push(p), l = o[++c];
      }
      r !== l?.index && (a = K.nextNode(), r++);
    }
    return K.currentNode = Y, n;
  }
  p(e) {
    let t = 0;
    for (const o of this._$AV) o !== void 0 && (o.strings !== void 0 ? (o._$AI(e, o, t), t += o.strings.length - 2) : o._$AI(e[t])), t++;
  }
}
class be {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, o, n) {
    this.type = 2, this._$AH = u, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = o, this.options = n, this._$Cv = n?.isConnected ?? !0;
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
    e = le(this, e, t), me(e) ? e === u || e == null || e === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : e !== this._$AH && e !== se && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : mo(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== u && me(this._$AH) ? this._$AA.nextSibling.data = e : this.T(Y.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: o } = e, n = typeof o == "number" ? this._$AC(e) : (o.el === void 0 && (o.el = ge.createElement(jt(o.h, o.h[0]), this.options)), o);
    if (this._$AH?._$AD === n) this._$AH.p(t);
    else {
      const a = new fo(n, this), r = a.u(this.options);
      a.p(t), this.T(r), this._$AH = a;
    }
  }
  _$AC(e) {
    let t = At.get(e.strings);
    return t === void 0 && At.set(e.strings, t = new ge(e)), t;
  }
  k(e) {
    Ke(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let o, n = 0;
    for (const a of e) n === t.length ? t.push(o = new be(this.O(_e()), this.O(_e()), this, this.options)) : o = t[n], o._$AI(a), n++;
    n < t.length && (this._$AR(o && o._$AB.nextSibling, n), t.length = n);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const o = xt(e).nextSibling;
      xt(e).remove(), e = o;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class qe {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, o, n, a) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = e, this.name = t, this._$AM = n, this.options = a, o.length > 2 || o[0] !== "" || o[1] !== "" ? (this._$AH = Array(o.length - 1).fill(new String()), this.strings = o) : this._$AH = u;
  }
  _$AI(e, t = this, o, n) {
    const a = this.strings;
    let r = !1;
    if (a === void 0) e = le(this, e, t, 0), r = !me(e) || e !== this._$AH && e !== se, r && (this._$AH = e);
    else {
      const c = e;
      let l, p;
      for (e = a[0], l = 0; l < a.length - 1; l++) p = le(this, c[o + l], t, l), p === se && (p = this._$AH[l]), r ||= !me(p) || p !== this._$AH[l], p === u ? e = u : e !== u && (e += (p ?? "") + a[l + 1]), this._$AH[l] = p;
    }
    r && !n && this.j(e);
  }
  j(e) {
    e === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class vo extends qe {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === u ? void 0 : e;
  }
}
class yo extends qe {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== u);
  }
}
class bo extends qe {
  constructor(e, t, o, n, a) {
    super(e, t, o, n, a), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = le(this, e, t, 0) ?? u) === se) return;
    const o = this._$AH, n = e === u && o !== u || e.capture !== o.capture || e.once !== o.once || e.passive !== o.passive, a = e !== u && (o === u || n);
    n && this.element.removeEventListener(this.name, this, o), a && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class xo {
  constructor(e, t, o) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = o;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    le(this, e);
  }
}
const wo = Qe.litHtmlPolyfillSupport;
wo?.(ge, be), (Qe.litHtmlVersions ??= []).push("3.3.3");
const $o = (i, e, t) => {
  const o = t?.renderBefore ?? e;
  let n = o._$litPart$;
  if (n === void 0) {
    const a = t?.renderBefore ?? null;
    o._$litPart$ = n = new be(e.insertBefore(_e(), a), a, void 0, t ?? {});
  }
  return n._$AI(i), n;
};
const Ye = globalThis;
class x extends ae {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = $o(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return se;
  }
}
x._$litElement$ = !0, x.finalized = !0, Ye.litElementHydrateSupport?.({ LitElement: x });
const zo = Ye.litElementPolyfillSupport;
zo?.({ LitElement: x });
(Ye.litElementVersions ??= []).push("4.2.2");
const ko = { attribute: !0, type: String, converter: Te, reflect: !1, hasChanged: Ge }, So = (i = ko, e, t) => {
  const { kind: o, metadata: n } = t;
  let a = globalThis.litPropertyMetadata.get(n);
  if (a === void 0 && globalThis.litPropertyMetadata.set(n, a = /* @__PURE__ */ new Map()), o === "setter" && ((i = Object.create(i)).wrapped = !0), a.set(t.name, i), o === "accessor") {
    const { name: r } = t;
    return { set(c) {
      const l = e.get.call(this);
      e.set.call(this, c), this.requestUpdate(r, l, i, !0, c);
    }, init(c) {
      return c !== void 0 && this.C(r, void 0, i, c), c;
    } };
  }
  if (o === "setter") {
    const { name: r } = t;
    return function(c) {
      const l = this[r];
      e.call(this, c), this.requestUpdate(r, l, i, !0, c);
    };
  }
  throw Error("Unsupported decorator location: " + o);
};
function m(i) {
  return (e, t) => typeof t == "object" ? So(i, e, t) : ((o, n, a) => {
    const r = n.hasOwnProperty(a);
    return n.constructor.createProperty(a, o), r ? Object.getOwnPropertyDescriptor(n, a) : void 0;
  })(i, e, t);
}
function $(i) {
  return m({ ...i, state: !0, attribute: !1 });
}
const Ut = [
  "state",
  "next_run",
  "last_outcome",
  "programs",
  "curve",
  "hardware",
  "consumption",
  "actions"
], Ao = [30, 90, 365];
function C(i, e) {
  return i.blocks?.[e] !== !1;
}
const Co = {
  show_header: !0,
  show_queue: !0,
  show_controls: !0,
  compact: !1
};
function v(i) {
  if (typeof i == "number" && Number.isFinite(i)) return i;
  if (typeof i == "string" && i.trim() !== "") {
    const e = Number(i);
    if (Number.isFinite(e)) return e;
  }
}
function f(i) {
  return typeof i == "string" && i !== "" ? i : void 0;
}
function P(i) {
  return Array.isArray(i) ? i : [];
}
function D(i) {
  return !i || i.state === "unavailable" || i.state === "unknown";
}
function Be(i, e, t) {
  return Math.min(t, Math.max(e, i));
}
function S(i, e) {
  customElements.get(i) || customElements.define(i, e);
}
const To = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_leak: "leak",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, Po = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_water_total: "zone_water_total",
  zone_leak: "leak",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function re(i) {
  const e = {}, t = /* @__PURE__ */ new Map(), o = [];
  for (const a of Object.values(i.states)) {
    const r = f(a.attributes.maestro_role);
    if (!r) continue;
    o.push(a.entity_id);
    const c = f(a.attributes.zone_id);
    if (c) {
      let l = t.get(c);
      if (l || (l = {
        zoneId: c,
        name: c,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(c, l)), r === "cycle_enabled")
        l.cycleSwitches.push(a);
      else {
        const p = Po[r];
        p && (l[p] = a);
      }
    } else {
      const l = To[r];
      l && (e[l] = a);
    }
  }
  const n = [...t.values()];
  for (const a of n) {
    const r = a.state?.attributes ?? {};
    a.name = f(r.zone_name) ?? f(a.state?.attributes.friendly_name) ?? a.zoneId, a.order = v(r.order) ?? v(a.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return n.sort(
    (a, r) => a.order - r.order || a.name.localeCompare(r.name)
  ), { found: o.length > 0, hub: e, zones: n, entityIds: o };
}
function Eo(i) {
  return D(i.state) ? !1 : !P(i.state?.attributes?.degraded).some((t) => f(t) === "no_flow_meter");
}
function Ht(i) {
  const e = i.state?.attributes?.capabilities;
  return e && typeof e == "object" ? e : {};
}
function No(i) {
  const e = Ht(i), t = [];
  f(e.water_accounting) === "estimated" && t.push({ key: "water_estimated", tone: "muted" });
  const o = f(e.leak_watch);
  o === "none" ? t.push({ key: "leak_unavailable", tone: "muted" }) : o === "system" && t.push({ key: "leak_system_scope", tone: "muted" }), f(e.leak_detection) === "candidate_available" && t.push({ key: "leak_candidate", tone: "hint" });
  const n = f(e.water_supply);
  return n === "unavailable" ? t.push({ key: "supply_unavailable", tone: "muted" }) : n === "candidate_available" && t.push({ key: "supply_candidate", tone: "hint" }), t;
}
const Mo = ["leak_never_observable", "leak_evidence_unresolved"];
function Bt(i) {
  return !i || i.state !== "on" ? null : {
    coverage: "alarm",
    confirmedAt: f(i.attributes.since),
    sources: P(i.attributes.sources).map((e) => f(e)).filter((e) => e !== void 0),
    describingSource: f(i.attributes.describing_source)
  };
}
function Vt(i) {
  const e = Bt(i.leak);
  if (e) return e;
  if (i.leak?.state === "off") return { coverage: "quiet", sources: [] };
  const t = P(i.state?.attributes?.degraded).map((o) => f(o));
  return Mo.some((o) => t.includes(o)) ? { coverage: "unresolved", sources: [] } : f(Ht(i).leak_watch) === "zone" ? { coverage: "establishing", sources: [] } : { coverage: "unknown", sources: [] };
}
function Do(i) {
  const e = Bt(i.leak);
  return e || { coverage: i.leak?.state === "off" ? "quiet" : "unknown", sources: [] };
}
function Wt(i) {
  const e = i.zone_water_total;
  if (!e) return null;
  const t = v(e.state);
  return t === void 0 ? null : {
    total: t,
    today: v(e.attributes.today_l) ?? 0,
    month: v(e.attributes.month_l) ?? 0,
    estimated: !!e.attributes.estimated
  };
}
function Zt(i) {
  return v(i.state?.attributes?.adjustment_pct) ?? 100;
}
function Io(i) {
  const e = P(i.state?.attributes?.cycles), t = [];
  for (const o of e) {
    if (typeof o != "object" || o === null) continue;
    const n = o, a = {
      cycle_id: f(n.cycle_id),
      name: f(n.name),
      enabled: typeof n.enabled == "boolean" ? n.enabled : void 0,
      trigger: n.trigger ?? void 0,
      curve: n.curve ?? void 0
    }, r = n.calendar;
    r && typeof r == "object" && (a.calendar = r);
    const c = n.season_months;
    Array.isArray(c) && (a.season_months = c.map((p) => v(p)).filter((p) => p !== void 0)), a.soak_max_run_min = v(n.soak_max_run_min), a.soak_pause_min = v(n.soak_pause_min), a.volume_safety_timeout_min = v(n.volume_safety_timeout_min), a.intensity_pct = v(n.intensity_pct);
    const l = n.day_intensity_pct;
    if (l && typeof l == "object") {
      const p = {};
      for (const [h, _] of Object.entries(l)) {
        const g = v(_);
        g !== void 0 && (p[h] = g);
      }
      a.day_intensity_pct = p;
    }
    t.push(a);
  }
  return t;
}
const T = {
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
  "block.actions": "Actions"
}, qo = {
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
  "block.actions": "Azioni"
}, Oe = {
  en: T,
  it: qo
};
function Re(i) {
  const t = (i?.locale?.language ?? i?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in Oe ? t : "en";
}
function Oo(i, e) {
  return e ? i.replace(/\{(\w+)\}/g, (t, o) => {
    const n = e[o];
    return n === void 0 ? t : String(n);
  }) : i;
}
function s(i, e, t) {
  const o = Oe[i] ?? T;
  return Oo(o[e] ?? T[e], t);
}
function z(i, e, t) {
  const o = `${e}.${t}`, n = Oe[i] ?? T, a = T;
  return n[o] ?? a[o] ?? t;
}
function Ro(i, e) {
  const t = Oe[i] ?? T, o = T;
  for (const n of ["queue_state", "zone_state", "outcome"]) {
    const a = `${n}.${e}`, r = t[a] ?? o[a];
    if (r !== void 0) return r;
  }
  return e;
}
const Ct = /* @__PURE__ */ new Map(), Tt = /* @__PURE__ */ new Map(), Pt = /* @__PURE__ */ new Map();
function ke(i) {
  let e = Ct.get(i);
  return e || (e = new Intl.RelativeTimeFormat(i, { numeric: "auto" }), Ct.set(i, e)), e;
}
function Ve(i, e, t = Date.now()) {
  if (!i) return;
  const o = Date.parse(i);
  if (Number.isNaN(o)) return;
  const n = Math.round((o - t) / 1e3), a = Math.abs(n);
  try {
    return a < 60 ? ke(e).format(n, "second") : a < 3600 ? ke(e).format(Math.round(n / 60), "minute") : a < 86400 ? ke(e).format(Math.round(n / 3600), "hour") : ke(e).format(Math.round(n / 86400), "day");
  } catch {
    return;
  }
}
function Lo(i, e) {
  if (!i) return;
  const t = Date.parse(i);
  if (Number.isNaN(t)) return;
  let o = Tt.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }), Tt.set(e, o)), o.format(t);
}
function Fo(i, e) {
  if (!i) return;
  const t = Date.parse(i);
  if (Number.isNaN(t)) return;
  let o = Pt.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }), Pt.set(e, o)), o.format(t);
}
function I(i, e = 1) {
  const t = v(i);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (o) => e > 0 ? "" : o);
}
function Xe(i, e, t, o) {
  const n = [e], a = t.describingSource ?? t.sources[0];
  a && n.push(z(i, "leak_source", a));
  const r = Ve(t.confirmedAt, i, o);
  return r && n.push(s(i, "zone.leak_confirmed_at", { when: r })), n.join(" · ");
}
function jo(i) {
  const e = v(i);
  if (e !== void 0) return e;
  if (i && typeof i == "object") {
    const t = i;
    return v(t.duration_min) ?? v(t.duration) ?? v(t.minutes);
  }
}
function Uo(i, e) {
  const t = f(i.run_started_at), o = v(i.run_duration_min);
  if (!t || o === void 0 || o <= 0)
    return;
  const n = Date.parse(t);
  if (Number.isNaN(n)) return;
  const a = (e - n) / 6e4, r = Be(a / o, 0, 1), c = Math.max(0, Math.ceil(o - a)), l = [], p = i.run_planned_runs;
  if (Array.isArray(p) && p.length > 1) {
    const h = p.map(jo).filter((g) => g !== void 0 && g > 0), _ = h.reduce((g, y) => g + y, 0);
    if (h.length > 1 && _ > 0) {
      let g = 0;
      for (let y = 0; y < h.length - 1; y += 1)
        g += h[y] ?? 0, l.push(g / _);
    }
  }
  return { fraction: r, remainingMin: c, segmentBounds: l };
}
function Ho(i) {
  const e = Math.abs(Math.round(i)), t = Math.floor(e / 3600), o = Math.round(e % 3600 / 60), n = [];
  return t > 0 && n.push(`${t} h`), o > 0 && n.push(`${o} min`), n.length === 0 && n.push(`${e} s`), n.join(" ");
}
function Bo(i, e) {
  if (!i || typeof i != "object") return "";
  if (i.kind === "sun" && (i.event === "sunrise" || i.event === "sunset")) {
    const o = s(
      e,
      i.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), n = v(i.offset_s) ?? 0;
    if (n === 0) return o;
    const a = n < 0 ? "−" : "+";
    return `${o} ${a} ${Ho(n)}`;
  }
  const t = f(i.at) ?? f(i.time);
  return t ? s(e, "trigger.at", { time: t }) : f(i.kind) ?? "";
}
function Je(i) {
  const e = Math.floor(i), t = i - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function et(i) {
  if (!Array.isArray(i)) return [];
  const e = [];
  for (const t of i) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const o = v(t[0]), n = v(t[1]);
    o !== void 0 && n !== void 0 && e.push([o, n]);
  }
  return [...e].sort((t, o) => t[0] - o[0]);
}
const Gt = 25, Vo = [5, 12, 20, 25, 30, 35, 40];
function Qt(i, e) {
  const t = i[0], o = i[i.length - 1];
  if (!t || !o) return 0;
  if (e <= t[0]) return t[1];
  if (e >= o[0]) return o[1];
  for (let n = 0; n < i.length - 1; n++) {
    const a = i[n], r = i[n + 1];
    if (!a || !r) continue;
    const [c, l] = a, [p, h] = r;
    if (c <= e && e <= p) return l + (h - l) * (e - c) / (p - c);
  }
  return o[1];
}
function Kt(i, e, t = 100, o, n) {
  let a = Qt(i, e) * t / 100;
  return o !== void 0 && (a = Math.max(a, o)), n !== void 0 && (a = Math.min(a, n)), a;
}
function Wo(i) {
  if (i.length === 0) return "curve_empty";
  for (const e of i)
    if (e[1] < 0) return "curve_negative_value";
  for (let e = 1; e < i.length; e++) {
    const t = i[e - 1], o = i[e];
    if (!(!t || !o) && o[0] <= t[0])
      return "curve_temps_not_increasing";
  }
  return null;
}
var Zo = Object.defineProperty, Go = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && Zo(e, t, n), n;
};
const te = 150, oe = 44, Se = 6, Et = 6, nt = class nt extends x {
  render() {
    const e = this.curve, t = et(e?.points);
    if (t.length === 0) return u;
    const o = v(e?.min), n = v(e?.max), a = t.map((b) => b[0]), r = t.map((b) => b[1]);
    o !== void 0 && r.push(o), n !== void 0 && r.push(n);
    let c = Math.min(...a), l = Math.max(...a), p = Math.min(...r), h = Math.max(...r);
    l - c < 1e-9 && (c -= 1, l += 1), h - p < 1e-9 && (p -= 1, h += 1);
    const _ = (b) => Se + (b - c) / (l - c) * (te - 2 * Se), g = (b) => oe - Et - (b - p) / (h - p) * (oe - 2 * Et), y = t.map((b, de) => `${de === 0 ? "M" : "L"}${_(b[0]).toFixed(1)},${g(b[1]).toFixed(1)}`).join(" "), w = (b, de) => M`
      <line
        class="clamp"
        x1="0" x2="${te}"
        y1="${g(b).toFixed(1)}" y2="${g(b).toFixed(1)}"
      ></line>
      <text class="clamp-label" x="${te - 2}" text-anchor="end"
        y="${(g(b) - 2).toFixed(1)}">${de}</text>
    `, N = t[0], W = t[t.length - 1];
    return d`
      <svg
        viewBox="0 0 ${te} ${oe + 10}"
        width="${te}"
        height="${oe + 10}"
        role="img"
        aria-hidden="true"
      >
        ${o !== void 0 ? w(o, String(o)) : u}
        ${n !== void 0 ? w(n, String(n)) : u}
        <path class="line" d="${y}"></path>
        ${t.map(
      (b) => M`<circle class="dot" r="2"
            cx="${_(b[0]).toFixed(1)}" cy="${g(b[1]).toFixed(1)}"></circle>`
    )}
        ${N ? M`<text class="axis-label" x="${Se}" y="${oe + 8}"
              text-anchor="start">${N[0]}°</text>` : u}
        ${W && W !== N ? M`<text class="axis-label" x="${te - Se}" y="${oe + 8}"
              text-anchor="end">${W[0]}°</text>` : u}
      </svg>
    `;
  }
};
nt.styles = k`
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
let Ee = nt;
Go([
  m({ attribute: !1 })
], Ee.prototype, "curve");
S("imc-curve-sparkline", Ee);
function Yt(i) {
  return [...i].sort((e, t) => e[0] - t[0]);
}
function Qo(i, e) {
  const t = i[e];
  if (!t) return i;
  const o = i[e + 1], n = o ? [(t[0] + o[0]) / 2, (t[1] + o[1]) / 2] : [t[0] + 5, t[1]];
  return Yt([...i, n]);
}
function Ko(i, e) {
  return i.length <= 1 ? i : i.filter((t, o) => o !== e);
}
function Ue(i, e, t, o) {
  const n = [...i];
  return n[e] ? (n[e] = [t, Math.max(0, o)], n) : i;
}
function Yo(i, e) {
  return e ? i : void 0;
}
function Xo(i) {
  return i.intensity_pct !== void 0 && i.intensity_pct !== 100 ? !0 : Object.keys(i.day_intensity_pct ?? {}).length > 0;
}
function Jo(i, e, t) {
  return e === 0 ? i : Math.max(0, Je(i - e * t));
}
function en(i, e, t, o, n, a) {
  const r = [...i.map((p) => p[1]), e, t], c = Math.max(12, ...r) + 4, l = o - n - a;
  return {
    top: c,
    y: (p) => o - a - p / c * l
  };
}
var tn = Object.defineProperty, O = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && tn(e, t, n), n;
};
const L = 320, G = 170, R = 34, Q = 12, pe = 16, ne = 24, Nt = 5, Mt = 40, Dt = 2, it = class it extends x {
  constructor() {
    super(...arguments), this.language = "en", this.zoneHasFlowMeter = !1, this.zoneAdjustmentPct = 100, this._points = [[Gt, 15]], this._min = 1, this._max = 120, this._kind = "duration", this._error = null;
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = et(e?.points);
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
    return Je(Kt(this._points, e, this.zoneAdjustmentPct, this._min, this._max));
  }
  _unit() {
    return s(this.language, this._kind === "volume" ? "curve.unit_volume" : "curve.unit_duration");
  }
  _axisMin() {
    return Math.min(this._points[0]?.[0] ?? Nt, Nt) - Dt;
  }
  _axisMax() {
    const e = this._points[this._points.length - 1];
    return Math.max(e?.[0] ?? Mt, Mt) + Dt;
  }
  _sx(e) {
    const t = this._axisMin(), o = this._axisMax();
    return R + (e - t) / (o - t) * (L - R - Q);
  }
  /** The graph's vertical axis, scaled to contain every raw point AND both
   *  clamp lines — see `graphAxis`'s doc comment for why both matter. */
  _axis() {
    return en(this._points, this._min, this._max, G, pe, ne);
  }
  _sy(e) {
    return this._axis().y(e);
  }
  /** Client coordinates of a pointer event, converted into the SVG's
   *  viewBox units (0..GRAPH_H on the y-axis). */
  _pointerViewY(e, t, o) {
    const n = e.createSVGPoint();
    return n.x = o.clientX, n.y = o.clientY, n.matrixTransform(t.inverse()).y;
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
    const n = this._points[e];
    if (!n) return;
    const a = n[1], r = o.getScreenCTM();
    if (!r) return;
    const c = this._pointerViewY(o, r, t), l = this._axis().top / (G - pe - ne), p = (_) => {
      const g = o.getScreenCTM();
      if (!g) return;
      const y = this._pointerViewY(o, g, _) - c;
      this._points = Ue(
        this._points,
        e,
        n[0],
        Jo(a, y, l)
      ), this._error = null;
    }, h = () => {
      window.removeEventListener("pointermove", p), window.removeEventListener("pointerup", h);
    };
    window.addEventListener("pointermove", p), window.addEventListener("pointerup", h);
  }
  _save() {
    const e = Wo(this._points) ?? (this._min > this._max ? "min_above_max" : null) ?? (this._min < 0 ? "negative_clamp" : null);
    if (e) {
      this._error = e;
      return;
    }
    this._error = null;
    const t = Yo(this._kind, this.zoneHasFlowMeter);
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
    return d`
      <div class="title">${s(e, "editor.title")}</div>

      ${this._renderIntensityNotice(e)}

      <div class="graph-box">
        <div class="caption">${s(e, "editor.graph.caption")}</div>
        ${this._renderGraph(e)}
      </div>

      ${this._renderAdjustmentNote(e)}

      <div class="caption">${s(e, "editor.preview_title")}</div>
      <div class="examples">
        ${Vo.map((t) => this._exampleTile(`${t}°`, this._deliveryValue(t)))}
      </div>

      ${this._renderToday(e)}

      <div class="points-title">${s(e, "editor.points_title")}</div>
      ${this._points.map((t, o) => this._renderPointRow(t, o, e))}

      ${this.zoneHasFlowMeter ? this._renderKind(e) : u}

      <div class="limits">
        <div class="limit">
          <label>${s(e, "editor.min.label")}</label>
          <div class="help">${s(e, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(t) => {
      const o = Number(t.target.value);
      Number.isNaN(o) || (this._min = o, this._error = null);
    }} /> ${this._unit()}
        </div>
        <div class="limit">
          <label>${s(e, "editor.max.label")}</label>
          <div class="help">${s(e, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(t) => {
      const o = Number(t.target.value);
      Number.isNaN(o) || (this._max = o, this._error = null);
    }} /> ${this._unit()}
        </div>
      </div>

      ${this._error ? d`<div class="error">${z(e, "editor", this._error)}</div>` : u}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${s(e, "editor.save")}</button>
        <button @click=${this._cancel}>${s(e, "editor.cancel")}</button>
      </div>
    `;
  }
  _renderIntensityNotice(e) {
    return Xo(this.cycle ?? {}) ? d`<div class="intensity-notice">
      ${s(e, "editor.intensity_reset")}
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
    return this.zoneAdjustmentPct === 100 ? u : d`<div class="graph-note">
      ${s(e, "editor.graph.adjustment_note", { pct: this.zoneAdjustmentPct })}
    </div>`;
  }
  _renderKind(e) {
    return d`<div class="kind">
      <label for="imc-curve-kind">${s(e, "editor.kind_label")}</label>
      <select
        id="imc-curve-kind"
        .value=${this._kind}
        @change=${(t) => {
      const o = t.target.value;
      this._kind = o === "volume" ? "volume" : "duration";
    }}
      >
        <option value="duration">${s(e, "editor.kind_duration")}</option>
        <option value="volume">${s(e, "editor.kind_volume")}</option>
      </select>
    </div>`;
  }
  _exampleTile(e, t) {
    return d`<div class="example"><div class="lbl">${e}</div><div class="num">${t} ${this._unit()}</div></div>`;
  }
  _renderToday(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return u;
    const o = this._deliveryValue(t);
    return d`<div class="today-banner">${s(e, "editor.today", {
      temp: Math.round(t),
      value: o,
      unit: this._unit()
    })}</div>`;
  }
  _renderPointRow(e, t, o) {
    return d`<div class="point-row">
      <input
        type="number"
        step="0.5"
        .value=${String(e[0])}
        aria-label=${s(o, "editor.point_temp")}
        @change=${(n) => this._editPoint(t, n, "temp")}
      /> °C
      <input
        type="number"
        min="0"
        step="1"
        .value=${String(e[1])}
        aria-label=${s(o, "editor.point_value")}
        @change=${(n) => this._editPoint(t, n, "value")}
      /> ${this._unit()}
      <button
        type="button"
        ?disabled=${this._points.length <= 1}
        title=${s(o, "editor.point_remove")}
        @click=${() => this._points = Ko(this._points, t)}
      >
        ✕
      </button>
      <button
        type="button"
        title=${s(o, "editor.point_add")}
        @click=${() => this._points = Qo(this._points, t)}
      >
        ＋
      </button>
    </div>`;
  }
  _editPoint(e, t, o) {
    const n = Number(t.target.value);
    if (Number.isNaN(n)) return;
    const a = this._points[e];
    if (!a) return;
    const r = o === "temp" ? Ue(this._points, e, n, a[1]) : Ue(this._points, e, a[0], n);
    this._points = Yt(r), this._error = null;
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
    const t = this._axisMin(), o = this._axisMax(), n = [];
    for (let y = t; y <= o; y += 1)
      n.push([this._sx(y), this._sy(Qt(this._points, y))]);
    const a = n.map((y, w) => `${w === 0 ? "M" : "L"}${y[0].toFixed(1)},${y[1].toFixed(1)}`).join(" "), r = this.weightedTemp, c = r !== void 0 && !Number.isNaN(r) && r >= t && r <= o, l = this._sy(this._min), p = this._sy(this._max), h = Math.min(l, p), _ = Math.abs(p - l), g = this._unit();
    return M`
      <svg viewBox="0 0 ${L} ${G}">
        <rect class="clamp-band" x=${R} y=${h.toFixed(1)}
          width=${(L - R - Q).toFixed(1)} height=${_.toFixed(1)}></rect>
        <line class="clamp-line" x1=${R} y1=${l.toFixed(1)} x2=${L - Q} y2=${l.toFixed(1)}></line>
        <line class="clamp-line" x1=${R} y1=${p.toFixed(1)} x2=${L - Q} y2=${p.toFixed(1)}></line>
        <text class="clamp-text" x=${L - Q} y=${(l - 3).toFixed(1)} text-anchor="end">${s(e, "curve.clamp_min")} ${this._min} ${g}</text>
        <text class="clamp-text" x=${L - Q} y=${(p - 3).toFixed(1)} text-anchor="end">${s(e, "curve.clamp_max")} ${this._max} ${g}</text>
        <line class="axis" x1=${R} y1=${pe} x2=${R} y2=${G - ne}></line>
        <line class="axis" x1=${R} y1=${G - ne} x2=${L - Q} y2=${G - ne}></line>
        ${c ? M`<line class="today" x1=${this._sx(r)} y1=${pe} x2=${this._sx(r)} y2=${G - ne}></line>
              <text class="today-text" x=${this._sx(r)} y=${pe - 4} text-anchor="middle">${s(e, "editor.graph.today", { temp: Math.round(r) })}</text>` : u}
        <path class="curve" d=${a}></path>
        ${this._points.map(
      (y, w) => M`<circle class="handle" r="7"
            cx=${this._sx(y[0]).toFixed(1)} cy=${this._sy(y[1]).toFixed(1)}
            @pointerdown=${(N) => this._startDrag(w, N)}></circle>`
    )}
      </svg>
    `;
  }
};
it.styles = k`
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
let A = it;
O([
  m()
], A.prototype, "language");
O([
  m({ attribute: !1 })
], A.prototype, "cycle");
O([
  m({ attribute: !1 })
], A.prototype, "weightedTemp");
O([
  m({ type: Boolean })
], A.prototype, "zoneHasFlowMeter");
O([
  m({ type: Number })
], A.prototype, "zoneAdjustmentPct");
O([
  $()
], A.prototype, "_points");
O([
  $()
], A.prototype, "_min");
O([
  $()
], A.prototype, "_max");
O([
  $()
], A.prototype, "_kind");
O([
  $()
], A.prototype, "_error");
S("imc-curve-editor", A);
var on = Object.defineProperty, V = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && on(e, t, n), n;
};
const Xt = {
  idle: "mdi:water-outline",
  queued: "mdi:timer-sand",
  watering: "mdi:water",
  soaking: "mdi:water-percent",
  paused: "mdi:pause-circle-outline",
  suspended: "mdi:calendar-remove-outline",
  disabled: "mdi:water-off-outline"
}, nn = [1, 4, 8, 24], an = {
  water_estimated: { label: "zone.water_estimated", icon: "mdi:approximately-equal" },
  leak_unavailable: { label: "zone.leak_unavailable", icon: "mdi:water-alert-outline" },
  leak_system_scope: { label: "zone.leak_system_scope", icon: "mdi:home-flood" },
  leak_candidate: { label: "zone.leak_candidate", icon: "mdi:water-plus-outline" },
  supply_unavailable: { label: "zone.supply_unavailable", icon: "mdi:water-pump-off" },
  supply_candidate: { label: "zone.supply_candidate", icon: "mdi:water-pump" }
};
function rn(i) {
  return i in Xt;
}
const at = class at extends x {
  constructor() {
    super(...arguments), this.language = "en", this.now = Date.now(), this.compact = !1, this.showControls = !0, this._expanded = !1;
  }
  get _zoneState() {
    const e = this.zone?.state?.state;
    return e && rn(e) ? e : void 0;
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
    const n = this.zone?.zoneId;
    n && Number.isFinite(o) && o > 0 && this._dispatch({ action: "pause", zoneId: n, hours: o });
  }
  _onSuspendDate(e) {
    const t = e.currentTarget, o = t.value;
    t.value = "";
    const n = this.zone?.zoneId;
    n && o && this._dispatch({ action: "suspend", zoneId: n, until: `${o}T00:00:00` });
  }
  /* ------------------------------------------------------------ */
  /* Render fragments                                              */
  /* ------------------------------------------------------------ */
  _renderBadges(e, t) {
    const o = this.zone;
    if (!o) return u;
    const n = o.state?.attributes ?? {}, a = [];
    if (t.coverage === "alarm") {
      const l = s(this.language, "zone.leak_alarm");
      a.push(d`
        <span class="badge alarm" title=${this._leakTitle(t)}>
          <ha-icon icon="mdi:water-alert" style="--mdc-icon-size:12px"></ha-icon>
          ${l}
        </span>
      `);
    } else if (t.coverage === "establishing") {
      const l = s(this.language, "zone.leak_checking");
      a.push(d`
        <span class="badge muted" title=${l}>
          <ha-icon icon="mdi:progress-question" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : l}
        </span>
      `);
    }
    const r = f(n.suspended_until) ?? (D(o.suspendUntil) ? void 0 : o.suspendUntil?.state);
    if (this._zoneState === "suspended" && r) {
      const l = Fo(r, this.language) ?? r;
      a.push(d`
        <span class="badge" title=${s(this.language, "zone.suspended_until", { date: l })}>
          <ha-icon icon="mdi:calendar-remove-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${l}
        </span>
      `);
    }
    for (const l of P(n.degraded)) {
      const p = f(l);
      if (!p) continue;
      const h = z(this.language, "degraded", p);
      a.push(d`
        <span class="badge" title=${h}>
          <ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : h}
        </span>
      `);
    }
    const c = No(o);
    for (const l of c) {
      const p = an[l.key], h = s(this.language, p.label);
      a.push(d`
        <span class="badge ${l.tone}" title=${h}>
          <ha-icon icon=${p.icon} style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : h}
        </span>
      `);
    }
    if (e?.estimated && !c.some((l) => l.key === "water_estimated")) {
      const l = s(this.language, "zone.water_estimated");
      a.push(d`
        <span class="badge muted" title=${l}>
          <ha-icon icon="mdi:approximately-equal" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : l}
        </span>
      `);
    }
    return a;
  }
  /** This zone's standing alarm, described once for the badge's tooltip and
   *  the meta line below it (see `describeLeakAlarm` for the two things that
   *  sentence is not allowed to say). */
  _leakTitle(e) {
    return Xe(
      this.language,
      s(this.language, "zone.leak_alarm"),
      e,
      this.now
    );
  }
  _renderProgress() {
    const e = this.zone, t = this._zoneState;
    if (!e || t !== "watering" && t !== "soaking")
      return u;
    const o = Uo(
      e.state?.attributes ?? {},
      this.now
    );
    return o ? d`
      <div class="progress-line">
        <div class="progress ${t === "soaking" ? "soaking" : ""}">
          <div class="bar" style="width:${(o.fraction * 100).toFixed(2)}%"></div>
          ${o.segmentBounds.map(
      (n) => d`<div class="seg" style="left:${(n * 100).toFixed(2)}%"></div>`
    )}
        </div>
        <span class="remaining">
          ${s(this.language, "zone.remaining", {
      minutes: o.remainingMin
    })}
        </span>
      </div>
    ` : u;
  }
  _renderMeta(e, t) {
    const o = this.zone;
    if (!o) return u;
    const n = this.language, a = [];
    t.coverage === "alarm" && a.push(d`<span class="leak-line">${this._leakTitle(t)}</span>`);
    const r = o.nextRun;
    if (r && !D(r)) {
      const l = Ve(r.state, n, this.now), p = Lo(r.state, n), h = f(r.attributes.cycle_name);
      (l || p) && a.push(d`
          <span>
            ${s(n, "zone.next_run")}: ${l ?? ""}
            ${p ? d`<span class="abs">
                  · ${p}${h ? ` (${h})` : ""}
                </span>` : u}
          </span>
        `);
    } else
      a.push(d`<span>${s(n, "zone.no_next_run")}</span>`);
    const c = o.lastOutcome;
    if (c && !D(c) && c.state !== "none") {
      const l = z(n, "outcome", c.state), p = f(c.attributes.reason_key), h = p ? z(n, "reason", p) : void 0, _ = f(c.attributes.finished_at), g = Ve(_, n, this.now);
      a.push(d`
        <span>
          ${s(n, "zone.last_outcome")}: ${l}${h ? ` — ${h}` : ""}${g ? d`<span class="abs"> · ${g}</span>` : u}
        </span>
      `);
    }
    if (e) {
      const l = s(n, "curve.unit_volume");
      a.push(d`
        <span>
          ${I(e.total, 0)} ${l}
          <span class="abs">
            · ${s(n, "zone.water_today")}
            ${I(e.today, 0)} ${l} ·
            ${s(n, "zone.water_month")}
            ${I(e.month, 0)} ${l}
          </span>
        </span>
      `);
    }
    return d`<div class="meta">${a}</div>`;
  }
  _renderControls() {
    const e = this.zone;
    if (!e || !this.showControls) return u;
    const t = this.language, o = e.zoneId, n = this._zoneState, a = e.enabledSwitch, r = a?.state === "on", c = n === "paused" || n === "suspended";
    return d`
      <div class="controls" @click=${(l) => l.stopPropagation()}>
        <button @click=${() => this._dispatch({ action: "run", zoneId: o })}>
          ${s(t, "controls.run_now")}
        </button>
        <button @click=${() => this._dispatch({ action: "skip", zoneId: o })}>
          ${s(t, "controls.skip_today")}
        </button>
        <select
          .value=${""}
          @change=${this._onPauseSelect}
          aria-label=${s(t, "controls.pause_for")}
        >
          <option value="" disabled selected hidden>
            ${s(t, "controls.pause_for")}
          </option>
          ${nn.map(
      (l) => d`<option value=${l}>
              ${s(t, "controls.hours", { hours: l })}
            </option>`
    )}
        </select>
        <input
          type="date"
          @change=${this._onSuspendDate}
          aria-label=${s(t, "controls.suspend_until")}
          title=${s(t, "controls.suspend_until")}
        />
        ${c ? d`<button
              @click=${() => this._dispatch({ action: "resume", zoneId: o })}
            >
              ${s(t, "controls.resume")}
            </button>` : u}
        ${a ? d`<button
              @click=${() => this._dispatch({
      action: "set-enabled",
      zoneId: o,
      enabled: !r
    })}
            >
              ${s(t, r ? "controls.disable" : "controls.enable")}
            </button>` : u}
      </div>
    `;
  }
  _renderCycles() {
    const e = this.zone;
    if (!e) return u;
    const t = this.language, o = P(e.state?.attributes.cycles).filter(
      (n) => !!n && typeof n == "object"
    );
    return o.length === 0 ? d`<div class="details">
        <div class="no-cycles">${s(t, "zone.no_cycles")}</div>
      </div>` : d`
      <div class="details">
        <div class="details-title">${s(t, "zone.cycles")}</div>
        ${o.map((n) => this._renderCycle(n))}
      </div>
    `;
  }
  _renderCycle(e) {
    const t = this.language, o = this.zone, n = f(e.cycle_id), a = o?.cycleSwitches.find(
      (W) => f(W.attributes.cycle_id) === n
    ), r = a ? a.state === "on" : e.enabled !== !1, c = Bo(e.trigger, t), l = e.curve, p = v(l?.min), h = v(l?.max), _ = s(
      t,
      l?.kind === "volume" ? "curve.unit_volume" : "curve.unit_duration"
    ), g = [];
    p !== void 0 && g.push(
      `${s(t, "curve.clamp_min")} ${p} ${_}`
    ), h !== void 0 && g.push(
      `${s(t, "curve.clamp_max")} ${h} ${_}`
    );
    const y = !!n && this._editingCycle === n, w = n ? d`<button
          class="link-btn"
          @click=${() => this._editingCycle = y ? void 0 : n}
        >
          ${s(t, "editor.edit_curve")}
        </button>` : u, N = y ? d`<imc-curve-editor
          .language=${t}
          .cycle=${e}
          .weightedTemp=${this.weightedTemp}
          .zoneHasFlowMeter=${this.zone ? Eo(this.zone) : !1}
          .zoneAdjustmentPct=${this.zone ? Zt(this.zone) : 100}
          @imc-curve-save=${this._onCurveSave}
          @imc-curve-cancel=${() => this._editingCycle = void 0}
        ></imc-curve-editor>` : u;
    return d`
      <div class="cycle">
        <div class="cycle-info">
          <div class="cycle-name">
            ${f(e.name) ?? n ?? "?"}
            ${r ? u : d`<span class="off">
                  ${s(t, "zone.cycle_disabled")}
                </span>`}
          </div>
          <div class="cycle-sub">
            ${c}${c && g.length > 0 ? " · " : ""}${g.join(" · ")}
          </div>
        </div>
        ${l ? d`<imc-curve-sparkline .curve=${l}></imc-curve-sparkline>` : u}
        ${w}
      </div>
      ${N}
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
    const t = this.language, o = this._zoneState, n = o ? z(t, "zone_state", o) : s(t, "card.unavailable"), a = o ? Xt[o] : "mdi:help-circle-outline", r = o ?? "unknown", c = !this.compact || this._expanded, l = Wt(e), p = Vt(e);
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
          <ha-icon class="state-icon ${r}" icon=${a}></ha-icon>
          <div class="main">
            <div class="name-line">
              <span class="name">${e.name}</span>
              ${this._renderBadges(l, p)}
            </div>
          </div>
          <span class="state-chip ${r}">${n}</span>
          <ha-icon
            class="caret"
            icon=${this._expanded ? "mdi:chevron-up" : "mdi:chevron-down"}
          ></ha-icon>
        </div>
        ${this._renderProgress()}
        ${c ? this._renderMeta(l, p) : u}
        ${c ? this._renderControls() : u}
        ${this._expanded ? this._renderCycles() : u}
      </div>
    `;
  }
};
at.styles = k`
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
let E = at;
V([
  m({ attribute: !1 })
], E.prototype, "zone");
V([
  m()
], E.prototype, "language");
V([
  m({ attribute: !1 })
], E.prototype, "now");
V([
  m({ type: Boolean, reflect: !0 })
], E.prototype, "compact");
V([
  m({ type: Boolean })
], E.prototype, "showControls");
V([
  m({ attribute: !1 })
], E.prototype, "weightedTemp");
V([
  $()
], E.prototype, "_expanded");
V([
  $()
], E.prototype, "_editingCycle");
S("imc-zone-row", E);
var sn = Object.defineProperty, tt = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && sn(e, t, n), n;
};
const rt = class rt extends x {
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
    window.confirm(s(this.language, "controls.confirm_stop_all")) && this._dispatch({ action: "stop_all" });
  }
  render() {
    const e = this.language;
    return d`
      <div class="controls">
        <button @click=${() => this._dispatch({ action: "run_all" })}>
          ${s(e, "controls.run_all")}
        </button>
        <button class="danger" @click=${this._onStopAll}>
          ${s(e, "controls.stop_all")}
        </button>
        <button @click=${() => this._dispatch({ action: "evaluate" })}>
          ${s(e, "controls.evaluate_now")}
        </button>
        ${this.hasPauseSwitch ? d`<button
              class=${this.paused ? "active" : ""}
              @click=${() => this._dispatch({ action: "set-pause", paused: !this.paused })}
            >
              ${s(
      e,
      this.paused ? "controls.resume_global" : "controls.pause_global"
    )}
            </button>` : u}
      </div>
    `;
  }
};
rt.styles = k`
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
let ce = rt;
tt([
  m()
], ce.prototype, "language");
tt([
  m({ type: Boolean })
], ce.prototype, "paused");
tt([
  m({ type: Boolean })
], ce.prototype, "hasPauseSwitch");
S("imc-global-controls", ce);
var ln = Object.defineProperty, Le = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && ln(e, t, n), n;
};
const cn = [
  "idle",
  "evaluating",
  "running"
];
function dn(i) {
  return !!i && cn.includes(i);
}
const st = class st extends x {
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
    this._config = { ...Co, ...e };
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
    const n = this.hass;
    if (n)
      try {
        await n.callService(e, t, o);
      } catch (a) {
        const r = a instanceof Error ? a.message : String(a);
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
        const n = this._model?.zones.find(
          (a) => a.zoneId === t.zoneId
        )?.enabledSwitch?.entity_id;
        n && this._call(
          "switch",
          t.enabled ? "turn_on" : "turn_off",
          { entity_id: n }
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
    const o = e.hub, n = D(o.waterBudget) ? void 0 : v(o.waterBudget?.state), a = D(o.skipThreshold) ? void 0 : v(o.skipThreshold?.state);
    let r = u;
    if (n !== void 0 || a !== void 0) {
      const N = Math.max(n ?? 0, a ?? 0, 1e-3), W = Be((n ?? 0) / N, 0, 1), b = a !== void 0 ? Be(a / N, 0, 1) : void 0, de = n !== void 0 && a !== void 0 && n >= a;
      r = d`
        <div
          class="budget"
          title=${`${s(t, "header.water_budget")} / ${s(t, "header.skip_threshold")}`}
        >
          <span class="budget-label">${s(t, "header.water_budget")}</span>
          <div class="meter">
            <div
              class="meter-fill ${de ? "sufficient" : ""}"
              style="width:${(W * 100).toFixed(1)}%"
            ></div>
            ${b !== void 0 ? d`<div
                  class="meter-mark"
                  style="left:${(b * 100).toFixed(1)}%"
                ></div>` : u}
          </div>
          <span class="budget-numbers">
            ${I(n, 2) ?? "—"} /
            ${I(a, 1) ?? "—"} mm
          </span>
        </div>
      `;
    }
    const c = o.weightedTemp, l = D(c) ? void 0 : v(c?.state), p = c?.attributes.stale_weather === !0, h = o.session?.state, _ = dn(h) ? h : void 0, g = o.pauseSwitch?.state === "on", y = D(o.consumptionLeft) ? void 0 : v(o.consumptionLeft?.state), w = Do(o);
    return d`
      <div class="header">
        ${r}
        <div class="chips">
          ${w.coverage === "alarm" ? d`<span
                class="chip alarm"
                title=${Xe(
      t,
      s(t, "header.leak"),
      w,
      this._now
    )}
              >
                <ha-icon icon="mdi:water-alert" style="--mdc-icon-size:14px"></ha-icon>
                ${s(t, "header.leak")}
              </span>` : u}
          ${l !== void 0 ? d`<span
                class="chip"
                title=${s(t, "header.weighted_temp")}
              >
                <ha-icon icon="mdi:thermometer" style="--mdc-icon-size:14px"></ha-icon>
                ${I(l, 1)} °C
              </span>` : u}
          ${p ? d`<span class="chip warning">
                <ha-icon icon="mdi:alert" style="--mdc-icon-size:14px"></ha-icon>
                ${s(t, "header.stale_weather")}
              </span>` : u}
          ${_ ? d`<span
                class="chip ${_ !== "idle" ? "accent" : ""}"
                title=${s(t, "header.session")}
              >
                <ha-icon
                  icon=${_ === "running" ? "mdi:play-circle-outline" : _ === "evaluating" ? "mdi:magnify" : "mdi:sleep"}
                  style="--mdc-icon-size:14px"
                ></ha-icon>
                ${z(t, "session", _)}
              </span>` : u}
          ${g ? d`<span class="chip warning">
                <ha-icon icon="mdi:pause" style="--mdc-icon-size:14px"></ha-icon>
                ${s(t, "header.global_pause")}
              </span>` : u}
          ${y !== void 0 ? d`<span
                class="chip"
                title=${s(t, "header.consumption_left")}
              >
                <ha-icon icon="mdi:counter" style="--mdc-icon-size:14px"></ha-icon>
                ${I(y, 0)} L
              </span>` : u}
        </div>
      </div>
    `;
  }
  _renderQueue(e, t) {
    const o = e.hub.session;
    if (o?.state !== "running") return u;
    const n = P(o.attributes.queue).filter(
      (r) => !!r && typeof r == "object"
    );
    if (n.length === 0) return u;
    const a = f(o.attributes.active_zone_id);
    return d`
      <div class="queue">
        <div class="queue-title">${s(t, "queue.title")}</div>
        ${n.map((r, c) => {
      const l = f(r.state), p = a !== void 0 && r.zone_id === a || l === "watering" || l === "running", h = v(r.duration_min);
      return d`
            <div class="queue-item ${p ? "active" : ""}">
              <span class="queue-index">${c + 1}.</span>
              <span class="queue-name">
                ${f(r.zone_name) ?? f(r.zone_id) ?? "?"}
              </span>
              ${h !== void 0 ? d`<span class="queue-duration">
                    ${s(t, "queue.duration", { minutes: h })}
                  </span>` : u}
              ${l ? d`<span class="queue-state">
                    ${Ro(t, l)}
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
    const o = Re(t), n = re(t);
    this._model = n, this._relevantIds = n.entityIds, this._statesCount = Object.keys(t.states).length;
    const a = e.title ? d`<h1 class="card-title">${e.title}</h1>` : u;
    if (!n.found)
      return d`
        <ha-card>
          ${a}
          <div class="message">${s(o, "card.not_installed")}</div>
        </ha-card>
      `;
    const r = e.zones, c = r && r.length > 0 ? n.zones.filter((l) => r.includes(l.zoneId)) : n.zones;
    return d`
      <ha-card @imc-zone-action=${this._onZoneAction} @imc-global-action=${this._onGlobalAction}>
        ${a}
        ${e.show_header !== !1 ? this._renderHeader(n, o) : u}
        ${this._error ? d`<div class="error">${this._error}</div>` : u}
        ${e.show_queue !== !1 ? this._renderQueue(n, o) : u}
        ${c.length === 0 ? d`<div class="message">${s(o, "card.no_zones")}</div>` : c.map(
      (l) => d`
                <imc-zone-row
                  .zone=${l}
                  .language=${o}
                  .now=${this._now}
                  .compact=${e.compact === !0}
                  .showControls=${e.show_controls !== !1}
                  .weightedTemp=${v(n.hub.weightedTemp?.state)}
                ></imc-zone-row>
              `
    )}
        ${e.show_controls !== !1 ? d`<imc-global-controls
              .language=${o}
              .paused=${n.hub.pauseSwitch?.state === "on"}
              .hasPauseSwitch=${!!n.hub.pauseSwitch}
            ></imc-global-controls>` : u}
      </ha-card>
    `;
  }
};
st.styles = k`
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
let X = st;
Le([
  m({ attribute: !1 })
], X.prototype, "hass");
Le([
  $()
], X.prototype, "_config");
Le([
  $()
], X.prototype, "_now");
Le([
  $()
], X.prototype, "_error");
S("irrigation-maestro-card", X);
var un = Object.defineProperty, Jt = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && un(e, t, n), n;
};
const pn = [
  { key: "show_header", label: "editor.show_header", fallback: !0 },
  { key: "show_queue", label: "editor.show_queue", fallback: !0 },
  { key: "show_controls", label: "editor.show_controls", fallback: !0 },
  { key: "compact", label: "editor.compact", fallback: !1 }
], lt = class lt extends x {
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
    const o = t.currentTarget.checked, n = new Set(this._config.zones ?? []);
    o ? n.add(e) : n.delete(e);
    const a = { ...this._config };
    n.size > 0 ? a.zones = [...n] : delete a.zones, this._emitConfig(a);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const o = Re(t), n = re(t).zones, a = new Set(e.zones ?? []);
    return d`
      <div class="form">
        <label class="field">
          ${s(o, "card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${s(o, "card_editor.title_placeholder")}
            @input=${this._onTitleInput}
          />
        </label>

        ${pn.map(
      ({ key: r, label: c, fallback: l }) => d`
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${e[r] ?? l}
                @change=${(p) => this._onToggle(r, p)}
              />
              ${s(o, c)}
            </label>
          `
    )}

        <div class="zones">
          <span class="zones-title">${s(o, "editor.zones")}</span>
          ${n.length === 0 ? d`<span class="hint">${s(o, "editor.no_zones")}</span>` : d`
                ${n.map(
      (r) => d`
                    <label class="toggle">
                      <input
                        type="checkbox"
                        .checked=${a.has(r.zoneId)}
                        @change=${(c) => this._onZoneToggle(r.zoneId, c)}
                      />
                      ${r.name}
                    </label>
                  `
    )}
                <span class="hint">${s(o, "editor.zones_hint")}</span>
              `}
        </div>
      </div>
    `;
  }
};
lt.styles = k`
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
let fe = lt;
Jt([
  m({ attribute: !1 })
], fe.prototype, "hass");
Jt([
  $()
], fe.prototype, "_config");
S("irrigation-maestro-card-editor", fe);
const hn = "irrigation_maestro", _n = 300 * 1e3;
function It(i) {
  const e = i.getFullYear(), t = String(i.getMonth() + 1).padStart(2, "0"), o = String(i.getDate()).padStart(2, "0");
  return `${e}-${t}-${o}`;
}
function mn(i) {
  const t = P(i?.zones)[0];
  return {
    days: P(t?.days).map((n) => {
      const a = n;
      return {
        date: f(a.date) ?? "",
        l: v(a.l) ?? 0,
        est: a.est === !0,
        gap_s: v(a.gap_s) ?? 0
      };
    }),
    oldestRecorded: f(i?.oldest_recorded) ?? null,
    totalL: v(t?.total_l) ?? 0
  };
}
class Ne {
  constructor() {
    this._entries = /* @__PURE__ */ new Map();
  }
  static _key(e, t) {
    return `${e}|${t}`;
  }
  /** The fetched series, or null while one is in flight, after a failure, or before the first request. */
  get(e, t) {
    return this._entries.get(Ne._key(e, t))?.series ?? null;
  }
  /**
   * Fetch if one is owed. Safe to call on every update — that is the point.
   *
   * ``now`` and ``today`` are passed in rather than read from a clock here, so
   * the tests can drive both without freezing global time, the same division
   * of labour the Python engine modules use.
   */
  request(e, t, o, n, a) {
    const r = Ne._key(t, o), c = this._entries.get(r);
    if (c?.inFlight || c && n - c.attemptedAt < _n) return;
    const l = new Date(a.getTime()), p = new Date(a.getTime());
    p.setDate(p.getDate() - (o - 1));
    const h = { attemptedAt: n, series: c?.series ?? null, inFlight: !0 };
    this._entries.set(r, h), e.callService(
      hn,
      "get_water_history",
      { zone_id: t, start_date: It(p), end_date: It(l) },
      void 0,
      !1,
      !0
    ).then((_) => {
      this._entries.set(r, {
        attemptedAt: n,
        series: mn(_.response),
        inFlight: !1
      });
    }).catch(() => {
      this._entries.set(r, { attemptedAt: n, series: null, inFlight: !1 });
    });
  }
}
var gn = Object.defineProperty, xe = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && gn(e, t, n), n;
};
function fn(i) {
  return !i || i.verdict !== "blocked" || i.reason_key ? [] : P(i.programs).map((e) => e).filter((e) => e.verdict === "blocked");
}
function vn(i, e, t) {
  if (!e) return null;
  const o = Date.parse(e);
  if (Number.isNaN(o)) return null;
  const n = Math.max(0, Math.round((t - o) / 6e4));
  if (n < 1) return s(i, "next_run.age_now");
  if (n < 60) return s(i, "next_run.age_minutes", { n });
  const a = Math.round(n / 60);
  return a < 24 ? s(i, "next_run.age_hours", { n: a }) : s(i, "next_run.age_days", { n: Math.round(a / 24) });
}
const ct = class ct extends x {
  constructor() {
    super(...arguments), this.language = "en", this.now = Date.now();
  }
  _when() {
    if (!this.nextRun) return s(this.language, "next_run.none");
    const e = new Date(this.nextRun);
    if (Number.isNaN(e.getTime())) return s(this.language, "next_run.none");
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
    const e = this.verdict?.verdict;
    if (e === "unknown" || e === void 0)
      return d`<span class="value muted">${s(this.language, "next_run.not_evaluated")}</span>`;
    if (e === "would_run")
      return d`<span class="value">${s(this.language, "next_run.would_run")}</span>`;
    const t = f(this.verdict?.reason_key);
    return d`<span class="value"
      >${s(this.language, "next_run.blocked")}${t ? ` — ${z(this.language, "reason", t)}` : ""}</span
    >`;
  }
  render() {
    const e = fn(this.verdict), t = vn(this.language, this.verdict?.evaluated_at, this.now);
    return d`
      <div class="line">
        <span class="label">${s(this.language, "next_run.next")}</span>
        <span class="value">${this._when()}</span>
      </div>
      <div class="line">
        <span class="label">${s(this.language, "next_run.today")}</span>
        ${this._today()}
        ${t ? d`<span class="age">· ${t}</span>` : u}
      </div>
      ${e.length > 0 ? d`<ul>
            ${e.map(
      (o) => d`<li>
                  ${o.reason_key ? z(this.language, "reason", o.reason_key) : s(this.language, "next_run.blocked")}
                </li>`
    )}
          </ul>` : u}
    `;
  }
};
ct.styles = k`
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
let j = ct;
xe([
  m()
], j.prototype, "nextRun");
xe([
  m()
], j.prototype, "nextRunProgram");
xe([
  m({ attribute: !1 })
], j.prototype, "verdict");
xe([
  m()
], j.prototype, "language");
xe([
  m({ attribute: !1 })
], j.prototype, "now");
S("imc-next-run-block", j);
const yn = [
  "weekday.0",
  "weekday.1",
  "weekday.2",
  "weekday.3",
  "weekday.4",
  "weekday.5",
  "weekday.6"
];
function bn(i, e) {
  const t = e.map((n) => yn[n]).filter((n) => n !== void 0).map((n) => s(i, n));
  if (t.length <= 1) return t[0] ?? "";
  const o = t[t.length - 1];
  return `${t.slice(0, -1).join(", ")} ${s(i, "list.and")} ${o}`;
}
function xn(i) {
  const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(i);
  if (!e) return null;
  const [, t, o, n] = e, a = /* @__PURE__ */ new Date(`${t}-${o}-${n}T00:00:00Z`);
  return Number.isNaN(a.getTime()) ? null : `${n}/${o}`;
}
function wn(i, e, t) {
  const o = s(i, "calendar.every_day");
  if (e?.mode === "weekdays") {
    const n = [...new Set(e.days ?? [])].filter((a) => a >= 0 && a <= 6).sort((a, r) => a - r);
    return n.length === 0 || n.length === 7 ? o : bn(i, n);
  }
  if (e?.mode === "interval") {
    const n = e.interval_days ?? 1, a = n === 1 ? o : s(i, "calendar.interval", { n }), r = t ? xn(t) : null, c = r ? s(i, "calendar.last_completed", { date: r }) : s(i, "calendar.never_completed");
    return `${a} · ${c}`;
  }
  return e?.mode === "parity" ? s(
    i,
    e.parity === "even" ? "calendar.parity_even" : "calendar.parity_odd"
  ) : o;
}
function $n(i, e) {
  return i.day_intensity_pct?.[String(e)] ?? i.intensity_pct ?? 100;
}
function zn(i, e, t) {
  const o = et(i.curve?.points), n = $n(i, e) * t / 100;
  return Je(Kt(o, Gt, n, i.curve?.min, i.curve?.max));
}
var kn = Object.defineProperty, we = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && kn(e, t, n), n;
};
function Sn(i, e, t, o, n) {
  return e.map((a) => ({
    cycle: a,
    // Delivery, never the setting: the contract calls this out because the two
    // differ whenever the zone's adjustment is not 100%, and the list is
    // describing what gets watered.
    minutes: n === void 0 ? null : Math.round(zn(a, t, o)),
    calendar: wn(i, a.calendar, a.last_completed)
  }));
}
const dt = class dt extends x {
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
      return d`<div class="empty">${s(this.language, "programs.none")}</div>`;
    const e = ((/* @__PURE__ */ new Date()).getDay() + 6) % 7, t = Sn(
      this.language,
      this.cycles,
      e,
      this.adjustmentPct,
      this.weightedTemp
    );
    return d`
      ${t.map(
      (o) => d`
          <div class="row ${o.cycle.enabled === !1 ? "off" : ""}">
            <span class="name">${o.cycle.name ?? o.cycle.cycle_id}</span>
            <span class="meta">${o.calendar}</span>
            <span class="minutes">
              ${o.minutes === null ? "—" : s(this.language, "programs.minutes", { n: o.minutes })}
            </span>
            ${this.showControls ? d`<button @click=${() => this._toggle(o.cycle)}>
                  ${s(
        this.language,
        o.cycle.enabled === !1 ? "programs.enable" : "programs.disable"
      )}
                </button>` : u}
          </div>
        `
    )}
    `;
  }
};
dt.styles = k`
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
let U = dt;
we([
  m({ attribute: !1 })
], U.prototype, "cycles");
we([
  m({ attribute: !1 })
], U.prototype, "weightedTemp");
we([
  m({ type: Number })
], U.prototype, "adjustmentPct");
we([
  m()
], U.prototype, "language");
we([
  m({ type: Boolean })
], U.prototype, "showControls");
S("imc-programs-block", U);
var An = Object.defineProperty, ee = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && An(e, t, n), n;
};
function Cn(i, e) {
  const t = i ?? {}, o = [];
  for (const n of ["water_accounting", "leak_watch", "leak_detection", "water_supply"]) {
    const a = typeof t[n] == "string" ? t[n] : "unavailable", r = n === "leak_detection" ? "leak_candidate" : "supply_candidate";
    o.push({
      key: n,
      state: a,
      adoptable: a === "candidate_available" && !!e?.[r]
    });
  }
  return o;
}
const ut = class ut extends x {
  constructor() {
    super(...arguments), this.degraded = [], this.language = "en";
  }
  _adopt(e) {
    const t = e === "leak_detection" ? "leak_sensor" : "water_supply_sensor", o = e === "leak_detection" ? this.candidates?.leak_candidate : this.candidates?.supply_candidate;
    o && this.dispatchEvent(
      new CustomEvent("imc-adopt-sensor", {
        detail: { field: t, entityId: o },
        bubbles: !0,
        composed: !0
      })
    );
  }
  render() {
    const e = Cn(this.capabilities, this.candidates);
    return d`
      ${e.map(
      (t) => d`
          <div class="row">
            <span class="label">${z(this.language, "capability", t.key)}</span>
            <span class="value ${t.state === "candidate_available" ? "hint" : ""}">
              ${z(this.language, "capability_state", t.state)}
            </span>
            ${t.adoptable ? d`<button @click=${() => this._adopt(t.key)}>
                  ${s(this.language, "hardware.adopt")}
                </button>` : u}
          </div>
        `
    )}
      ${this.batteryState !== void 0 ? d`<div class="row">
            <span class="label">${s(this.language, "hardware.battery")}</span>
            <span class="value">${this.batteryState}</span>
          </div>` : u}
      ${this.meterEntity ? d`<div class="meter">
            ${s(this.language, "hardware.meter")}: <code>${this.meterEntity}</code>
            ${this.degraded.includes("flow_unit_unknown") ? d` — ${s(this.language, "hardware.unit_unknown")}` : this.meterUnit ? d` — ${s(this.language, "hardware.unit_resolved", {
      unit: this.meterUnit
    })}` : u}
          </div>` : u}
    `;
  }
};
ut.styles = k`
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
let q = ut;
ee([
  m({ attribute: !1 })
], q.prototype, "capabilities");
ee([
  m({ attribute: !1 })
], q.prototype, "candidates");
ee([
  m({ attribute: !1 })
], q.prototype, "degraded");
ee([
  m()
], q.prototype, "meterEntity");
ee([
  m()
], q.prototype, "meterUnit");
ee([
  m()
], q.prototype, "batteryState");
ee([
  m()
], q.prototype, "language");
S("imc-hardware-block", q);
var Tn = Object.defineProperty, eo = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && Tn(e, t, n), n;
};
const He = 320, Ae = 96, ot = 4, to = 4, Me = 6, Pn = 10, En = 3, De = {
  width: (i) => i - ot - to,
  height: (i) => i - Me - Pn
};
function Nn(i, e, t) {
  const o = i.days;
  if (o.length === 0) return [];
  const n = De.width(e), a = De.height(t), r = n / o.length, c = Math.max(r - Math.min(1, r * 0.15), r * 0.5), l = Math.max(...o.map((p) => p.l), 0);
  return o.map((p, h) => {
    const _ = i.oldestRecorded !== null && p.date < i.oldestRecorded, g = _ || l <= 0 ? 0 : p.l / l * a;
    return {
      date: p.date,
      x: ot + h * r + (r - c) / 2,
      y: Me + a - g,
      w: c,
      h: g,
      est: p.est,
      // Diagnostic #7: a day with six hours of unreadable meter must never
      // look like a quiet day, so the mark rides on gap_s alone.
      gap: p.gap_s > 0,
      unrecorded: _
    };
  });
}
const pt = class pt extends x {
  constructor() {
    super(...arguments), this.language = "en";
  }
  render() {
    const e = this.series;
    if (!e || e.days.length === 0)
      return d`<div class="empty">${s(this.language, "chart.no_data")}</div>`;
    const t = Nn(e, He, Ae), o = Me + De.height(Ae), n = t.some((c) => c.est), a = t.some((c) => c.gap), r = t.some((c) => c.unrecorded);
    return d`
      <svg viewBox="0 0 ${He} ${Ae}" role="img"
           aria-label=${s(this.language, "chart.aria", {
      days: e.days.length,
      liters: I(e.totalL, 0) ?? "0"
    })}>
        <defs>
          <pattern id="imc-hatch" width="4" height="4" patternUnits="userSpaceOnUse"
                   patternTransform="rotate(45)">
            <line class="hatch-line" x1="0" y1="0" x2="0" y2="4"></line>
          </pattern>
        </defs>
        ${t.map(
      (c) => c.unrecorded ? M`<rect class="unrecorded" x=${c.x} y=${Me}
                        width=${c.w} height=${De.height(Ae)}></rect>` : c.h > 0 ? M`<rect class="bar ${c.est ? "est" : ""}" x=${c.x} y=${c.y}
                          width=${c.w} height=${c.h}></rect>` : u
    )}
        <line class="baseline" x1=${ot} y1=${o}
              x2=${He - to} y2=${o}></line>
        ${t.filter((c) => c.gap).map(
      (c) => M`<rect class="gap" x=${c.x} y=${o + 1}
                        width=${c.w} height=${En}></rect>`
    )}
      </svg>
      <div class="legend">
        <span><i class="swatch"></i>${s(this.language, "chart.measured")}</span>
        ${n ? d`<span><i class="swatch est"></i>${s(this.language, "chart.estimated")}</span>` : u}
        ${a ? d`<span><i class="swatch gap"></i>${s(this.language, "chart.gap")}</span>` : u}
        ${r ? d`<span><i class="swatch unrecorded"></i>${s(
      this.language,
      "chart.unrecorded"
    )}</span>` : u}
      </div>
    `;
  }
};
pt.styles = k`
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
let ve = pt;
eo([
  m({ attribute: !1 })
], ve.prototype, "series");
eo([
  m()
], ve.prototype, "language");
S("imc-water-chart", ve);
var Mn = Object.defineProperty, $e = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && Mn(e, t, n), n;
};
function Dn(i, e) {
  return i !== "internal" ? !1 : e !== "unavailable";
}
const ht = class ht extends x {
  constructor() {
    super(...arguments), this.source = "internal", this.language = "en";
  }
  _figure(e, t) {
    return d`
      <div class="figure">
        <span class="figure-label">${s(this.language, e)}</span>
        <span class="figure-value">${I(t, 1) ?? "—"} L</span>
      </div>
    `;
  }
  render() {
    const e = this.water ?? void 0;
    return d`
      <div class="figures">
        ${this._figure("consumption.today", e?.today)}
        ${this._figure("consumption.month", e?.month)}
        ${this._figure("consumption.total", e?.total)}
        ${e?.estimated ? d`<span class="badge">${s(this.language, "consumption.estimated")}</span>` : u}
      </div>
      ${Dn(this.source, this.accounting) ? d`<imc-water-chart
            .series=${this.series ?? void 0}
            .language=${this.language}
          ></imc-water-chart>` : u}
    `;
  }
};
ht.styles = k`
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
let H = ht;
$e([
  m({ attribute: !1 })
], H.prototype, "water");
$e([
  m({ attribute: !1 })
], H.prototype, "series");
$e([
  m()
], H.prototype, "source");
$e([
  m()
], H.prototype, "accounting");
$e([
  m()
], H.prototype, "language");
S("imc-consumption-block", H);
var In = Object.defineProperty, ze = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && In(e, t, n), n;
};
const ie = "irrigation_maestro", _t = class _t extends x {
  constructor() {
    super(...arguments), this._now = Date.now(), this._history = new Ne(), this._relevantIds = [], this._statesCount = 0, this._timerPeriod = 0;
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
    const t = e ? re(e).zones : [];
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
    const t = Ut.filter((o) => C(e, o)).length;
    return Math.max(3, t + (C(e, "consumption") ? 3 : 0));
  }
  /* ------------------------------------------------------------ */
  /* Update gating and the refresh timer                           */
  /* ------------------------------------------------------------ */
  shouldUpdate(e) {
    if (e.size === 1 && e.has("hass")) {
      const t = e.get("hass"), o = this.hass;
      return !t || !o || Object.keys(o.states).length !== this._statesCount ? !0 : this._relevantIds.some((a) => t.states[a] !== o.states[a]);
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
    const o = this._config;
    this.hass && e && o && C(o, "consumption") && this._history.request(
      this.hass,
      e.zoneId,
      o.chart_days ?? 30,
      Date.now(),
      /* @__PURE__ */ new Date()
    ), this.hass && e && o && C(o, "hardware") && this._discoverSensors(e.zoneId);
  }
  /* ------------------------------------------------------------ */
  /* Services — every write in the card is here                    */
  /* ------------------------------------------------------------ */
  async _call(e, t, o) {
    const n = this.hass;
    if (n)
      try {
        await n.callService(e, t, o);
      } catch (a) {
        this._error = a instanceof Error ? a.message : String(a), this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
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
    this._discoveredFor === e || !this.hass || (this._discoveredFor = e, this.hass.callService(ie, "discover_zone_sensors", { zone_id: e }, void 0, !1, !0).then((t) => {
      this._candidates = t.response ?? {};
    }).catch(() => {
      this._candidates = {};
    }));
  }
  _onProgramToggle(e) {
    const t = this._zone(), o = e.detail.cycleId, n = t?.cycleSwitches.find(
      (a) => f(a.attributes.cycle_id) === o
    );
    n && this._call("switch", e.detail.enabled ? "turn_on" : "turn_off", {
      entity_id: n.entity_id
    });
  }
  _onAdoptSensor(e) {
    const t = this._zone();
    t && this._call(ie, "update_zone", {
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
      return re(e).zones.find((o) => o.zoneId === t);
  }
  /* ------------------------------------------------------------ */
  /* Render                                                        */
  /* ------------------------------------------------------------ */
  _renderState(e, t) {
    const o = Vt(e), n = e.state?.state ?? "unknown", a = f(e.state?.attributes.run_started_at), r = v(e.state?.attributes.run_duration_min);
    let c = u;
    if (a && r) {
      const l = Math.max(0, (this._now - Date.parse(a)) / 6e4), p = Math.min(1, l / r);
      c = d`
        <div class="progress" role="progressbar" aria-valuenow=${Math.round(p * 100)}>
          <div class="progress-fill" style="width:${(p * 100).toFixed(1)}%"></div>
        </div>
        <span class="progress-text">
          ${s(t, "zone_card.remaining", {
        n: Math.max(0, Math.round(r - l))
      })}
        </span>
      `;
    }
    return d`
      <div class="status-row">
        <span class="status">${z(t, "zone_state", n)}</span>
        ${o.coverage === "alarm" ? d`<span
              class="chip alarm"
              title=${Xe(t, s(t, "header.leak"), o, this._now)}
              >${s(t, "header.leak")}</span
            >` : u}
      </div>
      ${c}
    `;
  }
  _renderLastOutcome(e, t) {
    const o = e.lastOutcome;
    if (!o || D(o) || o.state === "none") return u;
    const n = f(o.attributes.reason_key), a = v(o.attributes.duration_min), r = v(o.attributes.volume_l);
    return d`
      <div class="line">
        <span class="label">${s(t, "zone.last_outcome")}</span>
        <span class="value">
          ${z(t, "outcome", o.state)}${n ? ` — ${z(t, "reason", n)}` : ""}
          ${a !== void 0 ? d`· ${a} min` : u}
          ${r !== void 0 ? d`· ${I(r, 1)} L` : u}
        </span>
      </div>
    `;
  }
  _renderActions(e, t) {
    return d`
      <div class="actions">
        <button @click=${() => this._call(ie, "run_zone", { zone_id: e.zoneId })}>
          ${s(t, "controls.run_now")}
        </button>
        <button @click=${() => this._call(ie, "skip_today", { zone_id: e.zoneId })}>
          ${s(t, "controls.skip_today")}
        </button>
        <button @click=${() => this._call(ie, "pause", { zone_id: e.zoneId, hours: 24 })}>
          ${s(t, "controls.pause_for") + " " + s(t, "controls.hours", { hours: 24 })}
        </button>
        <button @click=${() => this._call(ie, "resume", { zone_id: e.zoneId })}>
          ${s(t, "controls.resume")}
        </button>
      </div>
    `;
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const o = Re(t), n = re(t);
    this._relevantIds = n.entityIds, this._statesCount = Object.keys(t.states).length;
    const a = n.zones.find((h) => h.zoneId === e.zone);
    if (!a)
      return d`<ha-card
        ><div class="message">
          ${s(o, "zone_card.missing_zone", { id: e.zone ?? "—" })}
        </div></ha-card
      >`;
    const r = Io(a), c = Wt(a), l = a.state?.attributes.capabilities, p = P(a.state?.attributes.degraded).map((h) => f(h)).filter((h) => h !== void 0);
    return d`
      <ha-card
        @imc-program-toggle=${this._onProgramToggle}
        @imc-adopt-sensor=${this._onAdoptSensor}
      >
        <h1 class="card-title">${e.title ?? a.name}</h1>
        ${this._error ? d`<div class="error">${this._error}</div>` : u}
        ${C(e, "state") ? d`<div class="block">${this._renderState(a, o)}</div>` : u}
        ${C(e, "next_run") ? d`<div class="block">
              <imc-next-run-block
                .nextRun=${D(a.nextRun) ? void 0 : a.nextRun?.state}
                .nextRunProgram=${f(a.nextRun?.attributes.cycle_name)}
                .verdict=${a.state?.attributes.next_run}
                .language=${o}
                .now=${this._now}
              ></imc-next-run-block>
            </div>` : u}
        ${C(e, "last_outcome") ? d`<div class="block">${this._renderLastOutcome(a, o)}</div>` : u}
        ${C(e, "programs") ? d`<div class="block">
              <div class="block-title">${s(o, "zone_card.programs")}</div>
              <imc-programs-block
                .cycles=${r}
                .language=${o}
                .adjustmentPct=${Zt(a)}
                .weightedTemp=${v(n.hub.weightedTemp?.state)}
              ></imc-programs-block>
            </div>` : u}
        ${C(e, "hardware") ? d`<div class="block">
              <div class="block-title">${s(o, "zone_card.hardware")}</div>
              <imc-hardware-block
                .capabilities=${l}
                .candidates=${this._candidates}
                .degraded=${p}
                .meterEntity=${f(a.zone_water_total?.attributes.meter_entity)}
                .batteryState=${e.battery_entity ? t.states[e.battery_entity]?.state : void 0}
                .language=${o}
              ></imc-hardware-block>
            </div>` : u}
        ${C(e, "consumption") ? d`<div class="block">
              <div class="block-title">${s(o, "zone_card.consumption")}</div>
              <imc-consumption-block
                .water=${c}
                .series=${this._history.get(a.zoneId, e.chart_days ?? 30)}
                .source=${e.consumption_source ?? "internal"}
                .accounting=${f(l?.water_accounting)}
                .language=${o}
              ></imc-consumption-block>
            </div>` : u}
        ${C(e, "actions") ? d`<div class="block">${this._renderActions(a, o)}</div>` : u}
      </ha-card>
    `;
  }
};
_t.styles = k`
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
let B = _t;
ze([
  m({ attribute: !1 })
], B.prototype, "hass");
ze([
  $()
], B.prototype, "_config");
ze([
  $()
], B.prototype, "_now");
ze([
  $()
], B.prototype, "_error");
ze([
  $()
], B.prototype, "_candidates");
S("irrigation-maestro-zone-card", B);
var qn = Object.defineProperty, Fe = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && qn(e, t, n), n;
};
function On() {
  return typeof customElements < "u" && !!customElements.get("ha-selector");
}
const mt = class mt extends x {
  constructor() {
    super(...arguments), this.selector = { entity: {} }, this.value = "", this.label = "";
  }
  _emit(e) {
    this.value = e, this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: e }, bubbles: !0, composed: !0 })
    );
  }
  render() {
    return On() ? d`<ha-selector
        .hass=${this.hass}
        .selector=${this.selector}
        .value=${this.value || void 0}
        .label=${this.label}
        @value-changed=${(e) => this._emit(e.detail?.value ?? "")}
      ></ha-selector>` : d`<input
      .value=${this.value}
      placeholder=${this.label}
      @input=${(e) => this._emit(e.target.value)}
    />`;
  }
};
mt.styles = k`
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
let J = mt;
Fe([
  m({ attribute: !1 })
], J.prototype, "hass");
Fe([
  m({ attribute: !1 })
], J.prototype, "selector");
Fe([
  m()
], J.prototype, "value");
Fe([
  m()
], J.prototype, "label");
S("imc-entity-picker", J);
var Rn = Object.defineProperty, oo = (i, e, t, o) => {
  for (var n = void 0, a = i.length - 1, r; a >= 0; a--)
    (r = i[a]) && (n = r(e, t, n) || n);
  return n && Rn(e, t, n), n;
};
const gt = class gt extends x {
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
  _set(e, t, o) {
    if (!this._config) return;
    const n = { ...this._config };
    o ? delete n[e] : n[e] = t, this._emit(n);
  }
  _setBlock(e, t) {
    if (!this._config) return;
    const o = { ...this._config.blocks ?? {} };
    t ? delete o[e] : o[e] = !1;
    const n = { ...this._config };
    Object.keys(o).length > 0 ? n.blocks = o : delete n.blocks, this._emit(n);
  }
  _setSource(e) {
    if (!this._config) return;
    const t = { ...this._config };
    e === "internal" ? (delete t.consumption_source, delete t.total_entity, delete t.today_entity, delete t.month_entity) : t.consumption_source = "entity", this._emit(t);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const o = Re(t), n = re(t).zones, a = e.consumption_source ?? "internal";
    return d`
      <div class="form">
        <label class="field">
          ${s(o, "zone_card_editor.zone")}
          <select
            .value=${e.zone ?? ""}
            @change=${(r) => this._set("zone", r.currentTarget.value, !1)}
          >
            ${n.map(
      (r) => d`<option value=${r.zoneId} ?selected=${r.zoneId === e.zone}>
                  ${r.name}
                </option>`
    )}
          </select>
        </label>

        <label class="field">
          ${s(o, "zone_card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${s(o, "zone_card_editor.title_placeholder")}
            @input=${(r) => {
      const c = r.currentTarget.value;
      this._set("title", c, c === "");
    }}
          />
        </label>

        <div class="group">
          <span class="group-title">${s(o, "zone_card_editor.blocks")}</span>
          ${Ut.map(
      (r) => d`
              <label class="toggle">
                <input
                  type="checkbox"
                  .checked=${C(e, r)}
                  @change=${(c) => this._setBlock(r, c.currentTarget.checked)}
                />
                ${z(o, "block", r)}
              </label>
            `
    )}
        </div>

        <label class="field">
          ${s(o, "zone_card_editor.chart_days")}
          <select
            @change=${(r) => {
      const c = Number(r.currentTarget.value);
      this._set("chart_days", c, c === 30);
    }}
          >
            ${Ao.map(
      (r) => d`<option value=${r} ?selected=${(e.chart_days ?? 30) === r}>
                  ${s(o, "zone_card_editor.days", { n: r })}
                </option>`
    )}
          </select>
        </label>

        <label class="field">
          ${s(o, "zone_card_editor.consumption_source")}
          <select
            @change=${(r) => this._setSource(
      r.currentTarget.value
    )}
          >
            <option value="internal" ?selected=${a === "internal"}>
              ${s(o, "zone_card_editor.source_internal")}
            </option>
            <option value="entity" ?selected=${a === "entity"}>
              ${s(o, "zone_card_editor.source_entity")}
            </option>
          </select>
        </label>

        ${a === "entity" ? d`
              ${[
      ["total_entity", "zone_card_editor.total_entity"],
      ["today_entity", "zone_card_editor.today_entity"],
      ["month_entity", "zone_card_editor.month_entity"]
    ].map(
      ([r, c]) => d`
                  <label class="field">
                    ${s(o, c)}
                    <imc-entity-picker
                      .hass=${t}
                      .value=${e[r] ?? ""}
                      .selector=${{ entity: { domain: "sensor" } }}
                      @value-changed=${(l) => this._set(r, l.detail.value, !l.detail.value)}
                    ></imc-entity-picker>
                  </label>
                `
    )}
            ` : u}

        <label class="field">
          ${s(o, "zone_card_editor.battery_entity")}
          <imc-entity-picker
            .hass=${t}
            .value=${e.battery_entity ?? ""}
            .selector=${{ entity: { domain: "sensor" } }}
            @value-changed=${(r) => this._set("battery_entity", r.detail.value, !r.detail.value)}
          ></imc-entity-picker>
          <span class="hint">${s(o, "zone_card_editor.battery_hint")}</span>
        </label>
      </div>
    `;
  }
};
gt.styles = k`
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
let ye = gt;
oo([
  m({ attribute: !1 })
], ye.prototype, "hass");
oo([
  $()
], ye.prototype, "_config");
S("irrigation-maestro-zone-card-editor", ye);
const Ln = "https://github.com/jmbriccola/ha-irrigation-configurable";
window.customCards = window.customCards ?? [];
for (const i of [
  {
    type: "irrigation-maestro-card",
    name: T["card.name"],
    description: T["card.description"]
  },
  {
    type: "irrigation-maestro-zone-card",
    name: T["zone_card.name"],
    description: T["zone_card.description"]
  }
])
  window.customCards.some((e) => e.type === i.type) || window.customCards.push({ ...i, preview: !0, documentationURL: Ln });
