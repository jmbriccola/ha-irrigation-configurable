/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const qe = globalThis, nt = qe.ShadowRoot && (qe.ShadyCSS === void 0 || qe.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, st = /* @__PURE__ */ Symbol(), It = /* @__PURE__ */ new WeakMap();
let ii = class {
  constructor(e, t, o) {
    if (this._$cssResult$ = !0, o !== st) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (nt && e === void 0) {
      const o = t !== void 0 && t.length === 1;
      o && (e = It.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), o && It.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Ci = (a) => new ii(typeof a == "string" ? a : a + "", void 0, st), $ = (a, ...e) => {
  const t = a.length === 1 ? a[0] : e.reduce((o, i, n) => o + ((s) => {
    if (s._$cssResult$ === !0) return s.cssText;
    if (typeof s == "number") return s;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + s + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(i) + a[n + 1], a[0]);
  return new ii(t, a, st);
}, Ti = (a, e) => {
  if (nt) a.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const o = document.createElement("style"), i = qe.litNonce;
    i !== void 0 && o.setAttribute("nonce", i), o.textContent = t.cssText, a.appendChild(o);
  }
}, Ot = nt ? (a) => a : (a) => a instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const o of e.cssRules) t += o.cssText;
  return Ci(t);
})(a) : a;
const { is: Pi, defineProperty: Ei, getOwnPropertyDescriptor: Ni, getOwnPropertyNames: Mi, getOwnPropertySymbols: Di, getPrototypeOf: Ii } = Object, We = globalThis, qt = We.trustedTypes, Oi = qt ? qt.emptyScript : "", qi = We.reactiveElementPolyfillSupport, xe = (a, e) => a, Re = { toAttribute(a, e) {
  switch (e) {
    case Boolean:
      a = a ? Oi : null;
      break;
    case Object:
    case Array:
      a = a == null ? a : JSON.stringify(a);
  }
  return a;
}, fromAttribute(a, e) {
  let t = a;
  switch (e) {
    case Boolean:
      t = a !== null;
      break;
    case Number:
      t = a === null ? null : Number(a);
      break;
    case Object:
    case Array:
      try {
        t = JSON.parse(a);
      } catch {
        t = null;
      }
  }
  return t;
} }, rt = (a, e) => !Pi(a, e), Rt = { attribute: !0, type: String, converter: Re, reflect: !1, useDefault: !1, hasChanged: rt };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), We.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let pe = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Rt) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const o = /* @__PURE__ */ Symbol(), i = this.getPropertyDescriptor(e, o, t);
      i !== void 0 && Ei(this.prototype, e, i);
    }
  }
  static getPropertyDescriptor(e, t, o) {
    const { get: i, set: n } = Ni(this.prototype, e) ?? { get() {
      return this[t];
    }, set(s) {
      this[t] = s;
    } };
    return { get: i, set(s) {
      const d = i?.call(this);
      n?.call(this, s), this.requestUpdate(e, d, o);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Rt;
  }
  static _$Ei() {
    if (this.hasOwnProperty(xe("elementProperties"))) return;
    const e = Ii(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(xe("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(xe("properties"))) {
      const t = this.properties, o = [...Mi(t), ...Di(t)];
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
      for (const i of o) t.unshift(Ot(i));
    } else e !== void 0 && t.push(Ot(e));
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
    return Ti(e, this.constructor.elementStyles), e;
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
      const n = (o.converter?.toAttribute !== void 0 ? o.converter : Re).toAttribute(t, o.type);
      this._$Em = e, n == null ? this.removeAttribute(i) : this.setAttribute(i, n), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const o = this.constructor, i = o._$Eh.get(e);
    if (i !== void 0 && this._$Em !== i) {
      const n = o.getPropertyOptions(i), s = typeof n.converter == "function" ? { fromAttribute: n.converter } : n.converter?.fromAttribute !== void 0 ? n.converter : Re;
      this._$Em = i;
      const d = s.fromAttribute(t, n.type);
      this[i] = d ?? this._$Ej?.get(i) ?? d, this._$Em = null;
    }
  }
  requestUpdate(e, t, o, i = !1, n) {
    if (e !== void 0) {
      const s = this.constructor;
      if (i === !1 && (n = this[e]), o ??= s.getPropertyOptions(e), !((o.hasChanged ?? rt)(n, t) || o.useDefault && o.reflect && n === this._$Ej?.get(e) && !this.hasAttribute(s._$Eu(e, o)))) return;
      this.C(e, t, o);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: o, reflect: i, wrapped: n }, s) {
    o && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, s ?? t ?? this[e]), n !== !0 || s !== void 0) || (this._$AL.has(e) || (this.hasUpdated || o || (t = void 0), this._$AL.set(e, t)), i === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
      const o = this.constructor.elementProperties;
      if (o.size > 0) for (const [i, n] of o) {
        const { wrapped: s } = n, d = this[i];
        s !== !0 || this._$AL.has(i) || d === void 0 || this.C(i, void 0, n, d);
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
pe.elementStyles = [], pe.shadowRootOptions = { mode: "open" }, pe[xe("elementProperties")] = /* @__PURE__ */ new Map(), pe[xe("finalized")] = /* @__PURE__ */ new Map(), qi?.({ ReactiveElement: pe }), (We.reactiveElementVersions ??= []).push("2.1.2");
const lt = globalThis, Lt = (a) => a, Le = lt.trustedTypes, Ft = Le ? Le.createPolicy("lit-html", { createHTML: (a) => a }) : void 0, oi = "$lit$", B = `lit$${Math.random().toFixed(9).slice(2)}$`, ai = "?" + B, Ri = `<${ai}>`, ie = document, we = () => ie.createComment(""), $e = (a) => a === null || typeof a != "object" && typeof a != "function", ct = Array.isArray, Li = (a) => ct(a) || typeof a?.[Symbol.iterator] == "function", Je = `[ 	
\f\r]`, ye = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, jt = /-->/g, Ut = />/g, Q = RegExp(`>|${Je}(?:([^\\s"'>=/]+)(${Je}*=${Je}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Bt = /'/g, Ht = /"/g, ni = /^(?:script|style|textarea|title)$/i, si = (a) => (e, ...t) => ({ _$litType$: a, strings: e, values: t }), l = si(1), q = si(2), he = /* @__PURE__ */ Symbol.for("lit-noChange"), u = /* @__PURE__ */ Symbol.for("lit-nothing"), Wt = /* @__PURE__ */ new WeakMap(), te = ie.createTreeWalker(ie, 129);
function ri(a, e) {
  if (!ct(a) || !a.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Ft !== void 0 ? Ft.createHTML(e) : e;
}
const Fi = (a, e) => {
  const t = a.length - 1, o = [];
  let i, n = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", s = ye;
  for (let d = 0; d < t; d++) {
    const c = a[d];
    let p, _, f = -1, v = 0;
    for (; v < c.length && (s.lastIndex = v, _ = s.exec(c), _ !== null); ) v = s.lastIndex, s === ye ? _[1] === "!--" ? s = jt : _[1] !== void 0 ? s = Ut : _[2] !== void 0 ? (ni.test(_[2]) && (i = RegExp("</" + _[2], "g")), s = Q) : _[3] !== void 0 && (s = Q) : s === Q ? _[0] === ">" ? (s = i ?? ye, f = -1) : _[1] === void 0 ? f = -2 : (f = s.lastIndex - _[2].length, p = _[1], s = _[3] === void 0 ? Q : _[3] === '"' ? Ht : Bt) : s === Ht || s === Bt ? s = Q : s === jt || s === Ut ? s = ye : (s = Q, i = void 0);
    const y = s === Q && a[d + 1].startsWith("/>") ? " " : "";
    n += s === ye ? c + Ri : f >= 0 ? (o.push(p), c.slice(0, f) + oi + c.slice(f) + B + y) : c + B + (f === -2 ? d : y);
  }
  return [ri(a, n + (a[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), o];
};
class ze {
  constructor({ strings: e, _$litType$: t }, o) {
    let i;
    this.parts = [];
    let n = 0, s = 0;
    const d = e.length - 1, c = this.parts, [p, _] = Fi(e, t);
    if (this.el = ze.createElement(p, o), te.currentNode = this.el.content, t === 2 || t === 3) {
      const f = this.el.content.firstChild;
      f.replaceWith(...f.childNodes);
    }
    for (; (i = te.nextNode()) !== null && c.length < d; ) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const f of i.getAttributeNames()) if (f.endsWith(oi)) {
          const v = _[s++], y = i.getAttribute(f).split(B), A = /([.?@])?(.*)/.exec(v);
          c.push({ type: 1, index: n, name: A[2], strings: y, ctor: A[1] === "." ? Ui : A[1] === "?" ? Bi : A[1] === "@" ? Hi : Ve }), i.removeAttribute(f);
        } else f.startsWith(B) && (c.push({ type: 6, index: n }), i.removeAttribute(f));
        if (ni.test(i.tagName)) {
          const f = i.textContent.split(B), v = f.length - 1;
          if (v > 0) {
            i.textContent = Le ? Le.emptyScript : "";
            for (let y = 0; y < v; y++) i.append(f[y], we()), te.nextNode(), c.push({ type: 2, index: ++n });
            i.append(f[v], we());
          }
        }
      } else if (i.nodeType === 8) if (i.data === ai) c.push({ type: 2, index: n });
      else {
        let f = -1;
        for (; (f = i.data.indexOf(B, f + 1)) !== -1; ) c.push({ type: 7, index: n }), f += B.length - 1;
      }
      n++;
    }
  }
  static createElement(e, t) {
    const o = ie.createElement("template");
    return o.innerHTML = e, o;
  }
}
function _e(a, e, t = a, o) {
  if (e === he) return e;
  let i = o !== void 0 ? t._$Co?.[o] : t._$Cl;
  const n = $e(e) ? void 0 : e._$litDirective$;
  return i?.constructor !== n && (i?._$AO?.(!1), n === void 0 ? i = void 0 : (i = new n(a), i._$AT(a, t, o)), o !== void 0 ? (t._$Co ??= [])[o] = i : t._$Cl = i), i !== void 0 && (e = _e(a, i._$AS(a, e.values), i, o)), e;
}
class ji {
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
    const { el: { content: t }, parts: o } = this._$AD, i = (e?.creationScope ?? ie).importNode(t, !0);
    te.currentNode = i;
    let n = te.nextNode(), s = 0, d = 0, c = o[0];
    for (; c !== void 0; ) {
      if (s === c.index) {
        let p;
        c.type === 2 ? p = new Te(n, n.nextSibling, this, e) : c.type === 1 ? p = new c.ctor(n, c.name, c.strings, this, e) : c.type === 6 && (p = new Wi(n, this, e)), this._$AV.push(p), c = o[++d];
      }
      s !== c?.index && (n = te.nextNode(), s++);
    }
    return te.currentNode = ie, i;
  }
  p(e) {
    let t = 0;
    for (const o of this._$AV) o !== void 0 && (o.strings !== void 0 ? (o._$AI(e, o, t), t += o.strings.length - 2) : o._$AI(e[t])), t++;
  }
}
class Te {
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
    e = _e(this, e, t), $e(e) ? e === u || e == null || e === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : e !== this._$AH && e !== he && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Li(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== u && $e(this._$AH) ? this._$AA.nextSibling.data = e : this.T(ie.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: o } = e, i = typeof o == "number" ? this._$AC(e) : (o.el === void 0 && (o.el = ze.createElement(ri(o.h, o.h[0]), this.options)), o);
    if (this._$AH?._$AD === i) this._$AH.p(t);
    else {
      const n = new ji(i, this), s = n.u(this.options);
      n.p(t), this.T(s), this._$AH = n;
    }
  }
  _$AC(e) {
    let t = Wt.get(e.strings);
    return t === void 0 && Wt.set(e.strings, t = new ze(e)), t;
  }
  k(e) {
    ct(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let o, i = 0;
    for (const n of e) i === t.length ? t.push(o = new Te(this.O(we()), this.O(we()), this, this.options)) : o = t[i], o._$AI(n), i++;
    i < t.length && (this._$AR(o && o._$AB.nextSibling, i), t.length = i);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const o = Lt(e).nextSibling;
      Lt(e).remove(), e = o;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class Ve {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, o, i, n) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = e, this.name = t, this._$AM = i, this.options = n, o.length > 2 || o[0] !== "" || o[1] !== "" ? (this._$AH = Array(o.length - 1).fill(new String()), this.strings = o) : this._$AH = u;
  }
  _$AI(e, t = this, o, i) {
    const n = this.strings;
    let s = !1;
    if (n === void 0) e = _e(this, e, t, 0), s = !$e(e) || e !== this._$AH && e !== he, s && (this._$AH = e);
    else {
      const d = e;
      let c, p;
      for (e = n[0], c = 0; c < n.length - 1; c++) p = _e(this, d[o + c], t, c), p === he && (p = this._$AH[c]), s ||= !$e(p) || p !== this._$AH[c], p === u ? e = u : e !== u && (e += (p ?? "") + n[c + 1]), this._$AH[c] = p;
    }
    s && !i && this.j(e);
  }
  j(e) {
    e === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Ui extends Ve {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === u ? void 0 : e;
  }
}
class Bi extends Ve {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== u);
  }
}
class Hi extends Ve {
  constructor(e, t, o, i, n) {
    super(e, t, o, i, n), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = _e(this, e, t, 0) ?? u) === he) return;
    const o = this._$AH, i = e === u && o !== u || e.capture !== o.capture || e.once !== o.once || e.passive !== o.passive, n = e !== u && (o === u || i);
    i && this.element.removeEventListener(this.name, this, o), n && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Wi {
  constructor(e, t, o) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = o;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    _e(this, e);
  }
}
const Vi = lt.litHtmlPolyfillSupport;
Vi?.(ze, Te), (lt.litHtmlVersions ??= []).push("3.3.3");
const Zi = (a, e, t) => {
  const o = t?.renderBefore ?? e;
  let i = o._$litPart$;
  if (i === void 0) {
    const n = t?.renderBefore ?? null;
    o._$litPart$ = i = new Te(e.insertBefore(we(), n), n, void 0, t ?? {});
  }
  return i._$AI(a), i;
};
const dt = globalThis;
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
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Zi(t, this.renderRoot, this.renderOptions);
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
b._$litElement$ = !0, b.finalized = !0, dt.litElementHydrateSupport?.({ LitElement: b });
const Gi = dt.litElementPolyfillSupport;
Gi?.({ LitElement: b });
(dt.litElementVersions ??= []).push("4.2.2");
const Ki = { attribute: !0, type: String, converter: Re, reflect: !1, hasChanged: rt }, Yi = (a = Ki, e, t) => {
  const { kind: o, metadata: i } = t;
  let n = globalThis.litPropertyMetadata.get(i);
  if (n === void 0 && globalThis.litPropertyMetadata.set(i, n = /* @__PURE__ */ new Map()), o === "setter" && ((a = Object.create(a)).wrapped = !0), n.set(t.name, a), o === "accessor") {
    const { name: s } = t;
    return { set(d) {
      const c = e.get.call(this);
      e.set.call(this, d), this.requestUpdate(s, c, a, !0, d);
    }, init(d) {
      return d !== void 0 && this.C(s, void 0, a, d), d;
    } };
  }
  if (o === "setter") {
    const { name: s } = t;
    return function(d) {
      const c = this[s];
      e.call(this, d), this.requestUpdate(s, c, a, !0, d);
    };
  }
  throw Error("Unsupported decorator location: " + o);
};
function h(a) {
  return (e, t) => typeof t == "object" ? Yi(a, e, t) : ((o, i, n) => {
    const s = i.hasOwnProperty(n);
    return i.constructor.createProperty(n, o), s ? Object.getOwnPropertyDescriptor(i, n) : void 0;
  })(a, e, t);
}
function w(a) {
  return h({ ...a, state: !0, attribute: !1 });
}
function Me(a, e) {
  return a[e] !== !1;
}
const li = [
  "state",
  "next_run",
  "last_outcome",
  "programs",
  "curve",
  "hardware",
  "consumption",
  "actions"
], Qi = [30, 90, 365];
function C(a, e) {
  return a.blocks?.[e] !== !1;
}
const ci = ["session", "decision", "health", "actions"];
function ee(a, e) {
  return a.blocks?.[e] !== !1;
}
const Xi = {
  show_header: !0,
  show_queue: !0,
  show_controls: !0,
  compact: !1
};
function m(a) {
  if (typeof a == "number" && Number.isFinite(a)) return a;
  if (typeof a == "string" && a.trim() !== "") {
    const e = Number(a);
    if (Number.isFinite(e)) return e;
  }
}
function g(a) {
  return typeof a == "string" && a !== "" ? a : void 0;
}
function N(a) {
  return Array.isArray(a) ? a : [];
}
function E(a) {
  return !a || a.state === "unavailable" || a.state === "unknown";
}
function it(a, e, t) {
  return Math.min(t, Math.max(e, a));
}
function z(a, e) {
  customElements.get(a) || customElements.define(a, e);
}
const Ji = {
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
}, eo = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_water_total: "zone_water_total",
  zone_leak: "leak",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function H(a) {
  const e = {}, t = /* @__PURE__ */ new Map(), o = [];
  for (const n of Object.values(a.states)) {
    const s = g(n.attributes.maestro_role);
    if (!s) continue;
    o.push(n.entity_id);
    const d = g(n.attributes.zone_id);
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
        const p = eo[s];
        p && (c[p] = n);
      }
    } else {
      const c = Ji[s];
      c && (e[c] = n);
    }
  }
  const i = [...t.values()];
  for (const n of i) {
    const s = n.state?.attributes ?? {};
    n.name = g(s.zone_name) ?? g(n.state?.attributes.friendly_name) ?? n.zoneId, n.order = m(s.order) ?? m(n.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return i.sort(
    (n, s) => n.order - s.order || n.name.localeCompare(s.name)
  ), { found: o.length > 0, hub: e, zones: i, entityIds: o };
}
function di(a) {
  return E(a.state) ? !1 : !N(a.state?.attributes?.degraded).some((t) => g(t) === "no_flow_meter");
}
function ui(a) {
  const e = a.state?.attributes?.capabilities;
  return e && typeof e == "object" ? e : {};
}
function to(a) {
  const e = ui(a), t = [];
  g(e.water_accounting) === "estimated" && t.push({ key: "water_estimated", tone: "muted" });
  const o = g(e.leak_watch);
  o === "none" ? t.push({ key: "leak_unavailable", tone: "muted" }) : o === "system" && t.push({ key: "leak_system_scope", tone: "muted" }), g(e.leak_detection) === "candidate_available" && t.push({ key: "leak_candidate", tone: "hint" });
  const i = g(e.water_supply);
  return i === "unavailable" ? t.push({ key: "supply_unavailable", tone: "muted" }) : i === "candidate_available" && t.push({ key: "supply_candidate", tone: "hint" }), t;
}
const io = ["leak_never_observable", "leak_evidence_unresolved"];
function pi(a) {
  return !a || a.state !== "on" ? null : {
    coverage: "alarm",
    confirmedAt: g(a.attributes.since),
    sources: N(a.attributes.sources).map((e) => g(e)).filter((e) => e !== void 0),
    describingSource: g(a.attributes.describing_source)
  };
}
function hi(a) {
  const e = pi(a.leak);
  if (e) return e;
  if (a.leak?.state === "off") return { coverage: "quiet", sources: [] };
  const t = N(a.state?.attributes?.degraded).map((o) => g(o));
  return io.some((o) => t.includes(o)) ? { coverage: "unresolved", sources: [] } : g(ui(a).leak_watch) === "zone" ? { coverage: "establishing", sources: [] } : { coverage: "unknown", sources: [] };
}
function _i(a) {
  const e = pi(a.leak);
  return e || { coverage: a.leak?.state === "off" ? "quiet" : "unknown", sources: [] };
}
function mi(a) {
  const e = a.zone_water_total;
  if (!e) return null;
  const t = m(e.state);
  return t === void 0 ? null : {
    total: t,
    today: m(e.attributes.today_l) ?? 0,
    month: m(e.attributes.month_l) ?? 0,
    estimated: !!e.attributes.estimated
  };
}
function ot(a) {
  return m(a.state?.attributes?.adjustment_pct) ?? 100;
}
function oo(a) {
  const e = N(a.state?.attributes?.cycles), t = [];
  for (const o of e) {
    if (typeof o != "object" || o === null) continue;
    const i = o, n = {
      cycle_id: g(i.cycle_id),
      name: g(i.name),
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
      for (const [_, f] of Object.entries(c)) {
        const v = m(f);
        v !== void 0 && (p[_] = v);
      }
      n.day_intensity_pct = p;
    }
    t.push(n);
  }
  return t;
}
const P = {
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
  "zone.today": "Today",
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
  "editor.show_verdict": "Today's verdict per zone",
  "editor.show_next_run": "Next run per zone",
  "editor.show_last_outcome": "Last outcome per zone",
  "editor.show_water": "Water used per zone",
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
  "programs.never_run": "no run in the last 30 days",
  "programs.manual": "run by hand",
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
  "zone_card.curve": "Curve",
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
}, ao = {
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
  "zone.today": "Oggi",
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
  "editor.show_verdict": "Verdetto di oggi per zona",
  "editor.show_next_run": "Prossima irrigazione per zona",
  "editor.show_last_outcome": "Ultimo esito per zona",
  "editor.show_water": "Consumi per zona",
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
  "programs.never_run": "nessuna esecuzione negli ultimi 30 giorni",
  "programs.manual": "avviato a mano",
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
  "zone_card.curve": "Curva",
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
}, Ze = {
  en: P,
  it: ao
};
function ge(a) {
  const t = (a?.locale?.language ?? a?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in Ze ? t : "en";
}
function no(a, e) {
  return e ? a.replace(/\{(\w+)\}/g, (t, o) => {
    const i = e[o];
    return i === void 0 ? t : String(i);
  }) : a;
}
function r(a, e, t) {
  const o = Ze[a] ?? P;
  return no(o[e] ?? P[e], t);
}
function x(a, e, t) {
  const o = `${e}.${t}`, i = Ze[a] ?? P, n = P;
  return i[o] ?? n[o] ?? t;
}
function at(a, e) {
  const t = Ze[a] ?? P, o = P;
  for (const i of ["queue_state", "zone_state", "outcome"]) {
    const n = `${i}.${e}`, s = t[n] ?? o[n];
    if (s !== void 0) return s;
  }
  return e;
}
const Vt = /* @__PURE__ */ new Map(), Zt = /* @__PURE__ */ new Map(), Gt = /* @__PURE__ */ new Map();
function De(a) {
  let e = Vt.get(a);
  return e || (e = new Intl.RelativeTimeFormat(a, { numeric: "auto" }), Vt.set(a, e)), e;
}
function Fe(a, e, t = Date.now()) {
  if (!a) return;
  const o = Date.parse(a);
  if (Number.isNaN(o)) return;
  const i = Math.round((o - t) / 1e3), n = Math.abs(i);
  try {
    return n < 60 ? De(e).format(i, "second") : n < 3600 ? De(e).format(Math.round(i / 60), "minute") : n < 86400 ? De(e).format(Math.round(i / 3600), "hour") : De(e).format(Math.round(i / 86400), "day");
  } catch {
    return;
  }
}
function so(a, e) {
  if (!a) return;
  const t = Date.parse(a);
  if (Number.isNaN(t)) return;
  let o = Zt.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }), Zt.set(e, o)), o.format(t);
}
function ro(a, e) {
  if (!a) return;
  const t = Date.parse(a);
  if (Number.isNaN(t)) return;
  let o = Gt.get(e);
  return o || (o = new Intl.DateTimeFormat(e, {
    day: "numeric",
    month: "short",
    year: "numeric"
  }), Gt.set(e, o)), o.format(t);
}
function k(a, e = 1) {
  const t = m(a);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (o) => e > 0 ? "" : o);
}
function ut(a, e, t, o) {
  const i = [e], n = t.describingSource ?? t.sources[0];
  n && i.push(x(a, "leak_source", n));
  const s = Fe(t.confirmedAt, a, o);
  return s && i.push(r(a, "zone.leak_confirmed_at", { when: s })), i.join(" · ");
}
function lo(a) {
  const e = m(a);
  if (e !== void 0) return e;
  if (a && typeof a == "object") {
    const t = a;
    return m(t.duration_min) ?? m(t.duration) ?? m(t.minutes);
  }
}
function co(a, e) {
  const t = g(a.run_started_at), o = m(a.run_duration_min);
  if (!t || o === void 0 || o <= 0)
    return;
  const i = Date.parse(t);
  if (Number.isNaN(i)) return;
  const n = (e - i) / 6e4, s = it(n / o, 0, 1), d = Math.max(0, Math.ceil(o - n)), c = [], p = a.run_planned_runs;
  if (Array.isArray(p) && p.length > 1) {
    const _ = p.map(lo).filter((v) => v !== void 0 && v > 0), f = _.reduce((v, y) => v + y, 0);
    if (_.length > 1 && f > 0) {
      let v = 0;
      for (let y = 0; y < _.length - 1; y += 1)
        v += _[y] ?? 0, c.push(v / f);
    }
  }
  return { fraction: s, remainingMin: d, segmentBounds: c };
}
function uo(a) {
  const e = Math.abs(Math.round(a)), t = Math.floor(e / 3600), o = Math.round(e % 3600 / 60), i = [];
  return t > 0 && i.push(`${t} h`), o > 0 && i.push(`${o} min`), i.length === 0 && i.push(`${e} s`), i.join(" ");
}
function gi(a, e) {
  if (!a || typeof a != "object") return "";
  if (a.kind === "sun" && (a.event === "sunrise" || a.event === "sunset")) {
    const o = r(
      e,
      a.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), i = m(a.offset_s) ?? 0;
    if (i === 0) return o;
    const n = i < 0 ? "−" : "+";
    return `${o} ${n} ${uo(i)}`;
  }
  const t = g(a.at) ?? g(a.time);
  return t ? r(e, "trigger.at", { time: t }) : g(a.kind) ?? "";
}
var po = Object.defineProperty, Ge = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && po(e, t, i), i;
};
function ho(a, e) {
  const t = Math.max(a ?? 0, e ?? 0, 1e-3);
  return {
    fill: it((a ?? 0) / t, 0, 1),
    mark: e !== void 0 ? it(e / t, 0, 1) : void 0,
    sufficient: a !== void 0 && e !== void 0 && a >= e
  };
}
const gt = class gt extends b {
  constructor() {
    super(...arguments), this.language = "en", this.wide = !1;
  }
  render() {
    if (this.budget === void 0 && this.threshold === void 0) return u;
    const { fill: e, mark: t, sufficient: o } = ho(this.budget, this.threshold), i = this.language;
    return l`
      <span class="label">${r(i, "header.water_budget")}</span>
      <div
        class="meter"
        title=${`${r(i, "header.water_budget")} / ${r(i, "header.skip_threshold")}`}
      >
        <div
          class="meter-fill ${o ? "sufficient" : ""}"
          style="width:${(e * 100).toFixed(1)}%"
        ></div>
        ${t !== void 0 ? l`<div class="meter-mark" style="left:${(t * 100).toFixed(1)}%"></div>` : u}
      </div>
      <span class="numbers">
        ${k(this.budget, 2) ?? "—"} / ${k(this.threshold, 1) ?? "—"} mm
      </span>
    `;
  }
};
gt.styles = $`
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
let oe = gt;
Ge([
  h({ attribute: !1 })
], oe.prototype, "budget");
Ge([
  h({ attribute: !1 })
], oe.prototype, "threshold");
Ge([
  h()
], oe.prototype, "language");
Ge([
  h({ type: Boolean, reflect: !0 })
], oe.prototype, "wide");
z("imc-budget-meter", oe);
var _o = Object.defineProperty, Pe = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && _o(e, t, i), i;
};
function mo(a) {
  return !a || a.verdict !== "blocked" || a.reason_key ? [] : N(a.programs).map((e) => e).filter((e) => e.verdict === "blocked");
}
function fi(a) {
  const e = a?.verdict;
  return e === "would_run" || e === "blocked" ? e : "unknown";
}
function go(a, e, t) {
  if (!e) return null;
  const o = Date.parse(e);
  if (Number.isNaN(o)) return null;
  const i = Math.max(0, Math.round((t - o) / 6e4));
  if (i < 1) return r(a, "next_run.age_now");
  if (i < 60) return r(a, "next_run.age_minutes", { n: i });
  const n = Math.round(i / 60);
  return n < 24 ? r(a, "next_run.age_hours", { n }) : r(a, "next_run.age_days", { n: Math.round(n / 24) });
}
const ft = class ft extends b {
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
    const e = fi(this.verdict);
    if (e === "unknown")
      return l`<span class="value muted">${r(this.language, "next_run.not_evaluated")}</span>`;
    if (e === "would_run")
      return l`<span class="value">${r(this.language, "next_run.would_run")}</span>`;
    const t = g(this.verdict?.reason_key);
    return l`<span class="value"
      >${r(this.language, "next_run.blocked")}${t ? ` — ${x(this.language, "reason", t)}` : ""}</span
    >`;
  }
  render() {
    const e = mo(this.verdict), t = go(this.language, this.verdict?.evaluated_at, this.now);
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
      (o) => l`<li>
                  ${o.reason_key ? x(this.language, "reason", o.reason_key) : r(this.language, "next_run.blocked")}
                </li>`
    )}
          </ul>` : u}
    `;
  }
};
ft.styles = $`
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
let W = ft;
Pe([
  h()
], W.prototype, "nextRun");
Pe([
  h()
], W.prototype, "nextRunProgram");
Pe([
  h({ attribute: !1 })
], W.prototype, "verdict");
Pe([
  h()
], W.prototype, "language");
Pe([
  h({ attribute: !1 })
], W.prototype, "now");
z("imc-next-run-block", W);
function pt(a) {
  const e = Math.floor(a), t = a - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function ht(a) {
  if (!Array.isArray(a)) return [];
  const e = [];
  for (const t of a) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const o = m(t[0]), i = m(t[1]);
    o !== void 0 && i !== void 0 && e.push([o, i]);
  }
  return [...e].sort((t, o) => t[0] - o[0]);
}
const vi = 25, fo = [5, 12, 20, 25, 30, 35, 40];
function yi(a, e) {
  const t = a[0], o = a[a.length - 1];
  if (!t || !o) return 0;
  if (e <= t[0]) return t[1];
  if (e >= o[0]) return o[1];
  for (let i = 0; i < a.length - 1; i++) {
    const n = a[i], s = a[i + 1];
    if (!n || !s) continue;
    const [d, c] = n, [p, _] = s;
    if (d <= e && e <= p) return c + (_ - c) * (e - d) / (p - d);
  }
  return o[1];
}
function bi(a, e, t = 100, o, i) {
  let n = yi(a, e) * t / 100;
  return o !== void 0 && (n = Math.max(n, o)), i !== void 0 && (n = Math.min(n, i)), n;
}
function vo(a) {
  if (a.length === 0) return "curve_empty";
  for (const e of a)
    if (e[1] < 0) return "curve_negative_value";
  for (let e = 1; e < a.length; e++) {
    const t = a[e - 1], o = a[e];
    if (!(!t || !o) && o[0] <= t[0])
      return "curve_temps_not_increasing";
  }
  return null;
}
var yo = Object.defineProperty, bo = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && yo(e, t, i), i;
};
const le = 150, ce = 44, Ie = 6, Kt = 6, vt = class vt extends b {
  render() {
    const e = this.curve, t = ht(e?.points);
    if (t.length === 0) return u;
    const o = m(e?.min), i = m(e?.max), n = t.map((S) => S[0]), s = t.map((S) => S[1]);
    o !== void 0 && s.push(o), i !== void 0 && s.push(i);
    let d = Math.min(...n), c = Math.max(...n), p = Math.min(...s), _ = Math.max(...s);
    c - d < 1e-9 && (d -= 1, c += 1), _ - p < 1e-9 && (p -= 1, _ += 1);
    const f = (S) => Ie + (S - d) / (c - d) * (le - 2 * Ie), v = (S) => ce - Kt - (S - p) / (_ - p) * (ce - 2 * Kt), y = t.map((S, Xe) => `${Xe === 0 ? "M" : "L"}${f(S[0]).toFixed(1)},${v(S[1]).toFixed(1)}`).join(" "), A = (S, Xe) => q`
      <line
        class="clamp"
        x1="0" x2="${le}"
        y1="${v(S).toFixed(1)}" y2="${v(S).toFixed(1)}"
      ></line>
      <text class="clamp-label" x="${le - 2}" text-anchor="end"
        y="${(v(S) - 2).toFixed(1)}">${Xe}</text>
    `, Y = t[0], ve = t[t.length - 1];
    return l`
      <svg
        viewBox="0 0 ${le} ${ce + 10}"
        width="${le}"
        height="${ce + 10}"
        role="img"
        aria-hidden="true"
      >
        ${o !== void 0 ? A(o, String(o)) : u}
        ${i !== void 0 ? A(i, String(i)) : u}
        <path class="line" d="${y}"></path>
        ${t.map(
      (S) => q`<circle class="dot" r="2"
            cx="${f(S[0]).toFixed(1)}" cy="${v(S[1]).toFixed(1)}"></circle>`
    )}
        ${Y ? q`<text class="axis-label" x="${Ie}" y="${ce + 8}"
              text-anchor="start">${Y[0]}°</text>` : u}
        ${ve && ve !== Y ? q`<text class="axis-label" x="${le - Ie}" y="${ce + 8}"
              text-anchor="end">${ve[0]}°</text>` : u}
      </svg>
    `;
  }
};
vt.styles = $`
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
let je = vt;
bo([
  h({ attribute: !1 })
], je.prototype, "curve");
z("imc-curve-sparkline", je);
function xi(a) {
  return [...a].sort((e, t) => e[0] - t[0]);
}
function xo(a, e) {
  const t = a[e];
  if (!t) return a;
  const o = a[e + 1], i = o ? [(t[0] + o[0]) / 2, (t[1] + o[1]) / 2] : [t[0] + 5, t[1]];
  return xi([...a, i]);
}
function wo(a, e) {
  return a.length <= 1 ? a : a.filter((t, o) => o !== e);
}
function et(a, e, t, o) {
  const i = [...a];
  return i[e] ? (i[e] = [t, Math.max(0, o)], i) : a;
}
function $o(a, e) {
  return e ? a : void 0;
}
function zo(a) {
  return a.intensity_pct !== void 0 && a.intensity_pct !== 100 ? !0 : Object.keys(a.day_intensity_pct ?? {}).length > 0;
}
function ko(a, e, t) {
  return e === 0 ? a : Math.max(0, pt(a - e * t));
}
function So(a, e, t, o, i, n) {
  const s = [...a.map((p) => p[1]), e, t], d = Math.max(12, ...s) + 4, c = o - i - n;
  return {
    top: d,
    y: (p) => o - n - p / d * c
  };
}
var Ao = Object.defineProperty, L = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && Ao(e, t, i), i;
};
const U = 320, X = 170, F = 34, J = 12, be = 16, de = 24, Yt = 5, Qt = 40, Xt = 2, yt = class yt extends b {
  constructor() {
    super(...arguments), this.language = "en", this.zoneHasFlowMeter = !1, this.zoneAdjustmentPct = 100, this._points = [[vi, 15]], this._min = 1, this._max = 120, this._kind = "duration", this._error = null;
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = ht(e?.points);
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
    return pt(bi(this._points, e, this.zoneAdjustmentPct, this._min, this._max));
  }
  _unit() {
    return r(this.language, this._kind === "volume" ? "curve.unit_volume" : "curve.unit_duration");
  }
  _axisMin() {
    return Math.min(this._points[0]?.[0] ?? Yt, Yt) - Xt;
  }
  _axisMax() {
    const e = this._points[this._points.length - 1];
    return Math.max(e?.[0] ?? Qt, Qt) + Xt;
  }
  _sx(e) {
    const t = this._axisMin(), o = this._axisMax();
    return F + (e - t) / (o - t) * (U - F - J);
  }
  /** The graph's vertical axis, scaled to contain every raw point AND both
   *  clamp lines — see `graphAxis`'s doc comment for why both matter. */
  _axis() {
    return So(this._points, this._min, this._max, X, be, de);
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
    const n = i[1], s = o.getScreenCTM();
    if (!s) return;
    const d = this._pointerViewY(o, s, t), c = this._axis().top / (X - be - de), p = (f) => {
      const v = o.getScreenCTM();
      if (!v) return;
      const y = this._pointerViewY(o, v, f) - d;
      this._points = et(
        this._points,
        e,
        i[0],
        ko(n, y, c)
      ), this._error = null;
    }, _ = () => {
      window.removeEventListener("pointermove", p), window.removeEventListener("pointerup", _);
    };
    window.addEventListener("pointermove", p), window.addEventListener("pointerup", _);
  }
  _save() {
    const e = vo(this._points) ?? (this._min > this._max ? "min_above_max" : null) ?? (this._min < 0 ? "negative_clamp" : null);
    if (e) {
      this._error = e;
      return;
    }
    this._error = null;
    const t = $o(this._kind, this.zoneHasFlowMeter);
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
        ${fo.map((t) => this._exampleTile(`${t}°`, this._deliveryValue(t)))}
      </div>

      ${this._renderToday(e)}

      <div class="points-title">${r(e, "editor.points_title")}</div>
      ${this._points.map((t, o) => this._renderPointRow(t, o, e))}

      ${this.zoneHasFlowMeter ? this._renderKind(e) : u}

      <div class="limits">
        <div class="limit">
          <label>${r(e, "editor.min.label")}</label>
          <div class="help">${r(e, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(t) => {
      const o = Number(t.target.value);
      Number.isNaN(o) || (this._min = o, this._error = null);
    }} /> ${this._unit()}
        </div>
        <div class="limit">
          <label>${r(e, "editor.max.label")}</label>
          <div class="help">${r(e, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(t) => {
      const o = Number(t.target.value);
      Number.isNaN(o) || (this._max = o, this._error = null);
    }} /> ${this._unit()}
        </div>
      </div>

      ${this._error ? l`<div class="error">${x(e, "editor", this._error)}</div>` : u}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${r(e, "editor.save")}</button>
        <button @click=${this._cancel}>${r(e, "editor.cancel")}</button>
      </div>
    `;
  }
  _renderIntensityNotice(e) {
    return zo(this.cycle ?? {}) ? l`<div class="intensity-notice">
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
      const o = t.target.value;
      this._kind = o === "volume" ? "volume" : "duration";
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
    const o = this._deliveryValue(t);
    return l`<div class="today-banner">${r(e, "editor.today", {
      temp: Math.round(t),
      value: o,
      unit: this._unit()
    })}</div>`;
  }
  _renderPointRow(e, t, o) {
    return l`<div class="point-row">
      <input
        type="number"
        step="0.5"
        .value=${String(e[0])}
        aria-label=${r(o, "editor.point_temp")}
        @change=${(i) => this._editPoint(t, i, "temp")}
      /> °C
      <input
        type="number"
        min="0"
        step="1"
        .value=${String(e[1])}
        aria-label=${r(o, "editor.point_value")}
        @change=${(i) => this._editPoint(t, i, "value")}
      /> ${this._unit()}
      <button
        type="button"
        ?disabled=${this._points.length <= 1}
        title=${r(o, "editor.point_remove")}
        @click=${() => this._points = wo(this._points, t)}
      >
        ✕
      </button>
      <button
        type="button"
        title=${r(o, "editor.point_add")}
        @click=${() => this._points = xo(this._points, t)}
      >
        ＋
      </button>
    </div>`;
  }
  _editPoint(e, t, o) {
    const i = Number(t.target.value);
    if (Number.isNaN(i)) return;
    const n = this._points[e];
    if (!n) return;
    const s = o === "temp" ? et(this._points, e, i, n[1]) : et(this._points, e, n[0], i);
    this._points = xi(s), this._error = null;
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
    for (let y = t; y <= o; y += 1)
      i.push([this._sx(y), this._sy(yi(this._points, y))]);
    const n = i.map((y, A) => `${A === 0 ? "M" : "L"}${y[0].toFixed(1)},${y[1].toFixed(1)}`).join(" "), s = this.weightedTemp, d = s !== void 0 && !Number.isNaN(s) && s >= t && s <= o, c = this._sy(this._min), p = this._sy(this._max), _ = Math.min(c, p), f = Math.abs(p - c), v = this._unit();
    return q`
      <svg viewBox="0 0 ${U} ${X}">
        <rect class="clamp-band" x=${F} y=${_.toFixed(1)}
          width=${(U - F - J).toFixed(1)} height=${f.toFixed(1)}></rect>
        <line class="clamp-line" x1=${F} y1=${c.toFixed(1)} x2=${U - J} y2=${c.toFixed(1)}></line>
        <line class="clamp-line" x1=${F} y1=${p.toFixed(1)} x2=${U - J} y2=${p.toFixed(1)}></line>
        <text class="clamp-text" x=${U - J} y=${(c - 3).toFixed(1)} text-anchor="end">${r(e, "curve.clamp_min")} ${this._min} ${v}</text>
        <text class="clamp-text" x=${U - J} y=${(p - 3).toFixed(1)} text-anchor="end">${r(e, "curve.clamp_max")} ${this._max} ${v}</text>
        <line class="axis" x1=${F} y1=${be} x2=${F} y2=${X - de}></line>
        <line class="axis" x1=${F} y1=${X - de} x2=${U - J} y2=${X - de}></line>
        ${d ? q`<line class="today" x1=${this._sx(s)} y1=${be} x2=${this._sx(s)} y2=${X - de}></line>
              <text class="today-text" x=${this._sx(s)} y=${be - 4} text-anchor="middle">${r(e, "editor.graph.today", { temp: Math.round(s) })}</text>` : u}
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
yt.styles = $`
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
let M = yt;
L([
  h()
], M.prototype, "language");
L([
  h({ attribute: !1 })
], M.prototype, "cycle");
L([
  h({ attribute: !1 })
], M.prototype, "weightedTemp");
L([
  h({ type: Boolean })
], M.prototype, "zoneHasFlowMeter");
L([
  h({ type: Number })
], M.prototype, "zoneAdjustmentPct");
L([
  w()
], M.prototype, "_points");
L([
  w()
], M.prototype, "_min");
L([
  w()
], M.prototype, "_max");
L([
  w()
], M.prototype, "_kind");
L([
  w()
], M.prototype, "_error");
z("imc-curve-editor", M);
var Co = Object.defineProperty, D = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && Co(e, t, i), i;
};
const wi = {
  idle: "mdi:water-outline",
  queued: "mdi:timer-sand",
  watering: "mdi:water",
  soaking: "mdi:water-percent",
  paused: "mdi:pause-circle-outline",
  suspended: "mdi:calendar-remove-outline",
  disabled: "mdi:water-off-outline"
}, To = [1, 4, 8, 24], Po = {
  water_estimated: { label: "zone.water_estimated", icon: "mdi:approximately-equal" },
  leak_unavailable: { label: "zone.leak_unavailable", icon: "mdi:water-alert-outline" },
  leak_system_scope: { label: "zone.leak_system_scope", icon: "mdi:home-flood" },
  leak_candidate: { label: "zone.leak_candidate", icon: "mdi:water-plus-outline" },
  supply_unavailable: { label: "zone.supply_unavailable", icon: "mdi:water-pump-off" },
  supply_candidate: { label: "zone.supply_candidate", icon: "mdi:water-pump" }
};
function Eo(a) {
  return a in wi;
}
const bt = class bt extends b {
  constructor() {
    super(...arguments), this.language = "en", this.now = Date.now(), this.compact = !1, this.showControls = !0, this.showVerdict = !0, this.showNextRun = !0, this.showLastOutcome = !0, this.showWater = !0, this._expanded = !1;
  }
  get _zoneState() {
    const e = this.zone?.state?.state;
    return e && Eo(e) ? e : void 0;
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
    const i = o.state?.attributes ?? {}, n = [];
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
    const s = g(i.suspended_until) ?? (E(o.suspendUntil) ? void 0 : o.suspendUntil?.state);
    if (this._zoneState === "suspended" && s) {
      const c = ro(s, this.language) ?? s;
      n.push(l`
        <span class="badge" title=${r(this.language, "zone.suspended_until", { date: c })}>
          <ha-icon icon="mdi:calendar-remove-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${c}
        </span>
      `);
    }
    for (const c of N(i.degraded)) {
      const p = g(c);
      if (!p) continue;
      const _ = x(this.language, "degraded", p);
      n.push(l`
        <span class="badge" title=${_}>
          <ha-icon icon="mdi:alert-outline" style="--mdc-icon-size:12px"></ha-icon>
          ${this.compact ? u : _}
        </span>
      `);
    }
    const d = to(o);
    for (const c of d) {
      const p = Po[c.key], _ = r(this.language, p.label);
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
    return ut(
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
    const o = co(
      e.state?.attributes ?? {},
      this.now
    );
    return o ? l`
      <div class="progress-line">
        <div class="progress ${t === "soaking" ? "soaking" : ""}">
          <div class="bar" style="width:${(o.fraction * 100).toFixed(2)}%"></div>
          ${o.segmentBounds.map(
      (i) => l`<div class="seg" style="left:${(i * 100).toFixed(2)}%"></div>`
    )}
        </div>
        <span class="remaining">
          ${r(this.language, "zone.remaining", {
      minutes: o.remainingMin
    })}
        </span>
      </div>
    ` : u;
  }
  _renderMeta(e, t) {
    const o = this.zone;
    if (!o) return u;
    const i = this.language, n = [];
    if (t.coverage === "alarm" && n.push(l`<span class="leak-line">${this._leakTitle(t)}</span>`), this.showVerdict) {
      const c = o.state?.attributes.next_run, p = fi(c);
      if (p !== "unknown") {
        const _ = g(c?.reason_key);
        n.push(l`
          <span>
            ${r(i, "zone.today")}:
            ${r(i, p === "would_run" ? "next_run.would_run" : "next_run.blocked")}${p === "blocked" && _ ? ` — ${x(i, "reason", _)}` : ""}
          </span>
        `);
      }
    }
    const s = this.showNextRun ? o.nextRun : void 0;
    if (this.showNextRun && s && !E(s)) {
      const c = Fe(s.state, i, this.now), p = so(s.state, i), _ = g(s.attributes.cycle_name);
      (c || p) && n.push(l`
          <span>
            ${r(i, "zone.next_run")}: ${c ?? ""}
            ${p ? l`<span class="abs">
                  · ${p}${_ ? ` (${_})` : ""}
                </span>` : u}
          </span>
        `);
    } else this.showNextRun && n.push(l`<span>${r(i, "zone.no_next_run")}</span>`);
    const d = this.showLastOutcome ? o.lastOutcome : void 0;
    if (d && !E(d) && d.state !== "none") {
      const c = x(i, "outcome", d.state), p = g(d.attributes.reason_key), _ = p ? x(i, "reason", p) : void 0, f = g(d.attributes.finished_at), v = Fe(f, i, this.now);
      n.push(l`
        <span>
          ${r(i, "zone.last_outcome")}: ${c}${_ ? ` — ${_}` : ""}${v ? l`<span class="abs"> · ${v}</span>` : u}
        </span>
      `);
    }
    if (e && this.showWater) {
      const c = r(i, "curve.unit_volume");
      n.push(l`
        <span>
          ${k(e.total, 0)} ${c}
          <span class="abs">
            · ${r(i, "zone.water_today")}
            ${k(e.today, 0)} ${c} ·
            ${r(i, "zone.water_month")}
            ${k(e.month, 0)} ${c}
          </span>
        </span>
      `);
    }
    return l`<div class="meta">${n}</div>`;
  }
  _renderControls() {
    const e = this.zone;
    if (!e || !this.showControls) return u;
    const t = this.language, o = e.zoneId, i = this._zoneState, n = e.enabledSwitch, s = n?.state === "on", d = i === "paused" || i === "suspended";
    return l`
      <div class="controls" @click=${(c) => c.stopPropagation()}>
        <button @click=${() => this._dispatch({ action: "run", zoneId: o })}>
          ${r(t, "controls.run_now")}
        </button>
        <button @click=${() => this._dispatch({ action: "skip", zoneId: o })}>
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
          ${To.map(
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
              @click=${() => this._dispatch({ action: "resume", zoneId: o })}
            >
              ${r(t, "controls.resume")}
            </button>` : u}
        ${n ? l`<button
              @click=${() => this._dispatch({
      action: "set-enabled",
      zoneId: o,
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
    const t = this.language, o = N(e.state?.attributes.cycles).filter(
      (i) => !!i && typeof i == "object"
    );
    return o.length === 0 ? l`<div class="details">
        <div class="no-cycles">${r(t, "zone.no_cycles")}</div>
      </div>` : l`
      <div class="details">
        <div class="details-title">${r(t, "zone.cycles")}</div>
        ${o.map((i) => this._renderCycle(i))}
      </div>
    `;
  }
  _renderCycle(e) {
    const t = this.language, o = this.zone, i = g(e.cycle_id), n = o?.cycleSwitches.find(
      (ve) => g(ve.attributes.cycle_id) === i
    ), s = n ? n.state === "on" : e.enabled !== !1, d = gi(e.trigger, t), c = e.curve, p = m(c?.min), _ = m(c?.max), f = r(
      t,
      c?.kind === "volume" ? "curve.unit_volume" : "curve.unit_duration"
    ), v = [];
    p !== void 0 && v.push(
      `${r(t, "curve.clamp_min")} ${p} ${f}`
    ), _ !== void 0 && v.push(
      `${r(t, "curve.clamp_max")} ${_} ${f}`
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
          .zoneHasFlowMeter=${this.zone ? di(this.zone) : !1}
          .zoneAdjustmentPct=${this.zone ? ot(this.zone) : 100}
          @imc-curve-save=${this._onCurveSave}
          @imc-curve-cancel=${() => this._editingCycle = void 0}
        ></imc-curve-editor>` : u;
    return l`
      <div class="cycle">
        <div class="cycle-info">
          <div class="cycle-name">
            ${g(e.name) ?? i ?? "?"}
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
    const t = this.language, o = this._zoneState, i = o ? x(t, "zone_state", o) : r(t, "card.unavailable"), n = o ? wi[o] : "mdi:help-circle-outline", s = o ?? "unknown", d = !this.compact || this._expanded, c = mi(e), p = hi(e);
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
bt.styles = $`
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
let T = bt;
D([
  h({ attribute: !1 })
], T.prototype, "zone");
D([
  h()
], T.prototype, "language");
D([
  h({ attribute: !1 })
], T.prototype, "now");
D([
  h({ type: Boolean, reflect: !0 })
], T.prototype, "compact");
D([
  h({ type: Boolean })
], T.prototype, "showControls");
D([
  h({ type: Boolean })
], T.prototype, "showVerdict");
D([
  h({ type: Boolean })
], T.prototype, "showNextRun");
D([
  h({ type: Boolean })
], T.prototype, "showLastOutcome");
D([
  h({ type: Boolean })
], T.prototype, "showWater");
D([
  h({ attribute: !1 })
], T.prototype, "weightedTemp");
D([
  w()
], T.prototype, "_expanded");
D([
  w()
], T.prototype, "_editingCycle");
z("imc-zone-row", T);
var No = Object.defineProperty, _t = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && No(e, t, i), i;
};
const xt = class xt extends b {
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
xt.styles = $`
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
let me = xt;
_t([
  h()
], me.prototype, "language");
_t([
  h({ type: Boolean })
], me.prototype, "paused");
_t([
  h({ type: Boolean })
], me.prototype, "hasPauseSwitch");
z("imc-global-controls", me);
var Mo = Object.defineProperty, Ke = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && Mo(e, t, i), i;
};
const Do = [
  "idle",
  "evaluating",
  "running"
];
function Io(a) {
  return !!a && Do.includes(a);
}
const wt = class wt extends b {
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
    this._config = { ...Xi, ...e };
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
        (n) => t.states[n] !== o.states[n]
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
    const o = e.hub, i = E(o.waterBudget) ? void 0 : m(o.waterBudget?.state), n = E(o.skipThreshold) ? void 0 : m(o.skipThreshold?.state), s = i !== void 0 || n !== void 0 ? l`<imc-budget-meter
            .budget=${i}
            .threshold=${n}
            .language=${t}
          ></imc-budget-meter>` : u, d = o.weightedTemp, c = E(d) ? void 0 : m(d?.state), p = d?.attributes.stale_weather === !0, _ = o.session?.state, f = Io(_) ? _ : void 0, v = o.pauseSwitch?.state === "on", y = E(o.consumptionLeft) ? void 0 : m(o.consumptionLeft?.state), A = _i(o);
    return l`
      <div class="header">
        ${s}
        <div class="chips">
          ${A.coverage === "alarm" ? l`<span
                class="chip alarm"
                title=${ut(
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
                ${k(c, 1)} °C
              </span>` : u}
          ${p ? l`<span class="chip warning">
                <ha-icon icon="mdi:alert" style="--mdc-icon-size:14px"></ha-icon>
                ${r(t, "header.stale_weather")}
              </span>` : u}
          ${f ? l`<span
                class="chip ${f !== "idle" ? "accent" : ""}"
                title=${r(t, "header.session")}
              >
                <ha-icon
                  icon=${f === "running" ? "mdi:play-circle-outline" : f === "evaluating" ? "mdi:magnify" : "mdi:sleep"}
                  style="--mdc-icon-size:14px"
                ></ha-icon>
                ${x(t, "session", f)}
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
                ${k(y, 0)} L
              </span>` : u}
        </div>
      </div>
    `;
  }
  _renderQueue(e, t) {
    const o = e.hub.session;
    if (o?.state !== "running") return u;
    const i = N(o.attributes.queue).filter(
      (s) => !!s && typeof s == "object"
    );
    if (i.length === 0) return u;
    const n = g(o.attributes.active_zone_id);
    return l`
      <div class="queue">
        <div class="queue-title">${r(t, "queue.title")}</div>
        ${i.map((s, d) => {
      const c = g(s.state), p = n !== void 0 && s.zone_id === n || c === "watering" || c === "running", _ = m(s.duration_min);
      return l`
            <div class="queue-item ${p ? "active" : ""}">
              <span class="queue-index">${d + 1}.</span>
              <span class="queue-name">
                ${g(s.zone_name) ?? g(s.zone_id) ?? "?"}
              </span>
              ${_ !== void 0 ? l`<span class="queue-duration">
                    ${r(t, "queue.duration", { minutes: _ })}
                  </span>` : u}
              ${c ? l`<span class="queue-state">
                    ${at(t, c)}
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
    const o = ge(t), i = H(t);
    this._model = i, this._relevantIds = i.entityIds, this._statesCount = Object.keys(t.states).length;
    const n = e.title ? l`<h1 class="card-title">${e.title}</h1>` : u;
    if (!i.found)
      return l`
        <ha-card>
          ${n}
          <div class="message">${r(o, "card.not_installed")}</div>
        </ha-card>
      `;
    const s = e.zones, d = s && s.length > 0 ? i.zones.filter((c) => s.includes(c.zoneId)) : i.zones;
    return l`
      <ha-card @imc-zone-action=${this._onZoneAction} @imc-global-action=${this._onGlobalAction}>
        ${n}
        ${e.show_header !== !1 ? this._renderHeader(i, o) : u}
        ${this._error ? l`<div class="error">${this._error}</div>` : u}
        ${e.show_queue !== !1 ? this._renderQueue(i, o) : u}
        ${d.length === 0 ? l`<div class="message">${r(o, "card.no_zones")}</div>` : d.map(
      (c) => l`
                <imc-zone-row
                  .zone=${c}
                  .language=${o}
                  .now=${this._now}
                  .compact=${e.compact === !0}
                  .showControls=${e.show_controls !== !1}
                  .showVerdict=${Me(e, "show_verdict")}
                  .showNextRun=${Me(e, "show_next_run")}
                  .showLastOutcome=${Me(e, "show_last_outcome")}
                  .showWater=${Me(e, "show_water")}
                  .weightedTemp=${m(i.hub.weightedTemp?.state)}
                ></imc-zone-row>
              `
    )}
        ${e.show_controls !== !1 ? l`<imc-global-controls
              .language=${o}
              .paused=${i.hub.pauseSwitch?.state === "on"}
              .hasPauseSwitch=${!!i.hub.pauseSwitch}
            ></imc-global-controls>` : u}
      </ha-card>
    `;
  }
};
wt.styles = $`
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
let ae = wt;
Ke([
  h({ attribute: !1 })
], ae.prototype, "hass");
Ke([
  w()
], ae.prototype, "_config");
Ke([
  w()
], ae.prototype, "_now");
Ke([
  w()
], ae.prototype, "_error");
z("irrigation-maestro-card", ae);
var Oo = Object.defineProperty, $i = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && Oo(e, t, i), i;
};
const qo = [
  { key: "show_header", label: "editor.show_header", fallback: !0 },
  { key: "show_queue", label: "editor.show_queue", fallback: !0 },
  { key: "show_controls", label: "editor.show_controls", fallback: !0 },
  { key: "compact", label: "editor.compact", fallback: !1 },
  // Per-row content. Listed after the card-level options because they are a
  // narrower choice: what each zone's line says, not what the card contains.
  { key: "show_verdict", label: "editor.show_verdict", fallback: !0 },
  { key: "show_next_run", label: "editor.show_next_run", fallback: !0 },
  { key: "show_last_outcome", label: "editor.show_last_outcome", fallback: !0 },
  { key: "show_water", label: "editor.show_water", fallback: !0 }
], $t = class $t extends b {
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
    const n = { ...this._config };
    i.size > 0 ? n.zones = [...i] : delete n.zones, this._emitConfig(n);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const o = ge(t), i = H(t).zones, n = new Set(e.zones ?? []);
    return l`
      <div class="form">
        <label class="field">
          ${r(o, "card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${r(o, "card_editor.title_placeholder")}
            @input=${this._onTitleInput}
          />
        </label>

        ${qo.map(
      ({ key: s, label: d, fallback: c }) => l`
            <label class="toggle">
              <input
                type="checkbox"
                .checked=${e[s] ?? c}
                @change=${(p) => this._onToggle(s, p)}
              />
              ${r(o, d)}
            </label>
          `
    )}

        <div class="zones">
          <span class="zones-title">${r(o, "editor.zones")}</span>
          ${i.length === 0 ? l`<span class="hint">${r(o, "editor.no_zones")}</span>` : l`
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
                <span class="hint">${r(o, "editor.zones_hint")}</span>
              `}
        </div>
      </div>
    `;
  }
};
$t.styles = $`
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
let ke = $t;
$i([
  h({ attribute: !1 })
], ke.prototype, "hass");
$i([
  w()
], ke.prototype, "_config");
z("irrigation-maestro-card-editor", ke);
const Ro = "irrigation_maestro", Lo = 300 * 1e3;
function Jt(a) {
  const e = a.getFullYear(), t = String(a.getMonth() + 1).padStart(2, "0"), o = String(a.getDate()).padStart(2, "0");
  return `${e}-${t}-${o}`;
}
function Fo(a) {
  const t = N(a?.zones)[0];
  return {
    days: N(t?.days).map((i) => {
      const n = i;
      return {
        date: g(n.date) ?? "",
        l: m(n.l) ?? 0,
        est: n.est === !0,
        gap_s: m(n.gap_s) ?? 0
      };
    }),
    oldestRecorded: g(a?.oldest_recorded) ?? null,
    totalL: m(t?.total_l) ?? 0
  };
}
class Ue {
  constructor() {
    this._entries = /* @__PURE__ */ new Map();
  }
  static _key(e, t) {
    return `${e}|${t}`;
  }
  /** The fetched series, or null while one is in flight, after a failure, or before the first request. */
  get(e, t) {
    return this._entries.get(Ue._key(e, t))?.series ?? null;
  }
  /**
   * Fetch if one is owed. Safe to call on every update — that is the point.
   *
   * ``now`` and ``today`` are passed in rather than read from a clock here, so
   * the tests can drive both without freezing global time, the same division
   * of labour the Python engine modules use.
   */
  request(e, t, o, i, n) {
    const s = Ue._key(t, o), d = this._entries.get(s);
    if (d?.inFlight || d && i - d.attemptedAt < Lo) return;
    const c = new Date(n.getTime()), p = new Date(n.getTime());
    p.setDate(p.getDate() - (o - 1));
    const _ = { attemptedAt: i, series: d?.series ?? null, inFlight: !0 };
    this._entries.set(s, _), e.callService(
      Ro,
      "get_water_history",
      { zone_id: t, start_date: Jt(p), end_date: Jt(c) },
      void 0,
      !1,
      !0
    ).then((f) => {
      this._entries.set(s, {
        attemptedAt: i,
        series: Fo(f.response),
        inFlight: !1
      });
    }).catch(() => {
      this._entries.set(s, { attemptedAt: i, series: null, inFlight: !1 });
    });
  }
}
const jo = "irrigation_maestro", Uo = 300 * 1e3, Bo = 30;
function ei(a) {
  const e = a.getFullYear(), t = String(a.getMonth() + 1).padStart(2, "0"), o = String(a.getDate()).padStart(2, "0");
  return `${e}-${t}-${o}`;
}
function Ho(a) {
  return N(a?.runs).map((e) => {
    const t = e;
    return {
      at: g(t.at) ?? "",
      programId: g(t.program_id) ?? "",
      programName: g(t.program_name) ?? null,
      result: g(t.result) ?? "",
      reasonKey: g(t.reason_key) ?? null,
      durationMin: m(t.duration_min) ?? null,
      volumeL: m(t.volume_l) ?? null,
      scheduled: t.scheduled !== !1
    };
  });
}
function Wo(a) {
  const e = /* @__PURE__ */ new Map();
  for (const t of a) {
    if (!t.programId) continue;
    const o = e.get(t.programId);
    (!o || Date.parse(t.at) > Date.parse(o.at)) && e.set(t.programId, t);
  }
  return e;
}
class Vo {
  constructor() {
    this._entries = /* @__PURE__ */ new Map();
  }
  /** The window's runs, or null while one is in flight, after a failure, or before the first request. */
  get(e) {
    return this._entries.get(e)?.runs ?? null;
  }
  request(e, t, o, i) {
    const n = this._entries.get(t);
    if (n?.inFlight || n && o - n.attemptedAt < Uo) return;
    const s = new Date(i.getTime());
    s.setDate(s.getDate() - (Bo - 1)), this._entries.set(t, {
      attemptedAt: o,
      runs: n?.runs ?? null,
      inFlight: !0
    }), e.callService(
      jo,
      "get_run_history",
      { zone_id: t, start_date: ei(s), end_date: ei(i) },
      void 0,
      !1,
      !0
    ).then((d) => {
      this._entries.set(t, {
        attemptedAt: o,
        runs: Ho(d.response),
        inFlight: !1
      });
    }).catch(() => {
      this._entries.set(t, { attemptedAt: o, runs: null, inFlight: !1 });
    });
  }
}
const Zo = [
  "weekday.0",
  "weekday.1",
  "weekday.2",
  "weekday.3",
  "weekday.4",
  "weekday.5",
  "weekday.6"
];
function Go(a, e) {
  const t = e.map((i) => Zo[i]).filter((i) => i !== void 0).map((i) => r(a, i));
  if (t.length <= 1) return t[0] ?? "";
  const o = t[t.length - 1];
  return `${t.slice(0, -1).join(", ")} ${r(a, "list.and")} ${o}`;
}
function Ko(a) {
  const e = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a);
  if (!e) return null;
  const [, t, o, i] = e, n = /* @__PURE__ */ new Date(`${t}-${o}-${i}T00:00:00Z`);
  return Number.isNaN(n.getTime()) ? null : `${i}/${o}`;
}
function Yo(a, e, t) {
  const o = r(a, "calendar.every_day");
  if (e?.mode === "weekdays") {
    const i = [...new Set(e.days ?? [])].filter((n) => n >= 0 && n <= 6).sort((n, s) => n - s);
    return i.length === 0 || i.length === 7 ? o : Go(a, i);
  }
  if (e?.mode === "interval") {
    const i = e.interval_days ?? 1, n = i === 1 ? o : r(a, "calendar.interval", { n: i }), s = t ? Ko(t) : null, d = s ? r(a, "calendar.last_completed", { date: s }) : r(a, "calendar.never_completed");
    return `${n} · ${d}`;
  }
  return e?.mode === "parity" ? r(
    a,
    e.parity === "even" ? "calendar.parity_even" : "calendar.parity_odd"
  ) : o;
}
function Qo(a, e) {
  return a.day_intensity_pct?.[String(e)] ?? a.intensity_pct ?? 100;
}
function Xo(a, e, t) {
  const o = ht(a.curve?.points), i = Qo(a, e) * t / 100;
  return pt(bi(o, vi, i, a.curve?.min, a.curve?.max));
}
var Jo = Object.defineProperty, fe = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && Jo(e, t, i), i;
};
function ea(a, e, t, o, i) {
  return e.map((n) => ({
    cycle: n,
    // Delivery, never the setting: the contract calls this out because the two
    // differ whenever the zone's adjustment is not 100%, and the list is
    // describing what gets watered.
    minutes: i === void 0 ? null : Math.round(Xo(n, t, o)),
    calendar: Yo(a, n.calendar, n.last_completed),
    // Absent since 3.7.0 despite being in that spec, and arguably the first
    // thing anyone wants from a program list.
    start: gi(n.trigger, a)
  }));
}
const zt = class zt extends b {
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
  /**
   * How this program's last run went — the answer `zone_last_outcome` cannot
   * give, because it is per zone and a zone may have several programs.
   *
   * A skip is shown as prominently as a completion: a cycle that does not
   * start leaves no other trace, and those are the ones that get away.
   */
  _lastRun(e) {
    if (this.lastRuns === void 0) return u;
    const t = this.language, o = e.cycle_id ?? "", i = this.lastRuns.get(o);
    if (!i)
      return l`<div class="last-run muted">${r(t, "programs.never_run")}</div>`;
    const n = Fe(i.at, t, Date.now()) ?? i.at, s = [
      i.durationMin !== null ? `${i.durationMin} min` : null,
      i.volumeL !== null ? `${k(i.volumeL, 0)} L` : null
    ].filter((d) => d !== null);
    return l`
      <div class="last-run">
        ${n} — ${x(t, "outcome", i.result)}${i.reasonKey ? `: ${x(t, "reason", i.reasonKey)}` : ""}${s.length > 0 ? ` · ${s.join(" · ")}` : ""}${i.scheduled ? "" : ` · ${r(t, "programs.manual")}`}
      </div>
    `;
  }
  render() {
    if (this.cycles.length === 0)
      return l`<div class="empty">${r(this.language, "programs.none")}</div>`;
    const e = ((/* @__PURE__ */ new Date()).getDay() + 6) % 7, t = ea(
      this.language,
      this.cycles,
      e,
      this.adjustmentPct,
      this.weightedTemp
    );
    return l`
      ${t.map(
      (o) => l`
          <div class="row ${o.cycle.enabled === !1 ? "off" : ""}">
            <span class="name">${o.cycle.name ?? o.cycle.cycle_id}</span>
            <span class="meta">${o.start ? `${o.start} · ` : ""}${o.calendar}</span>
            <span class="minutes">
              ${o.minutes === null ? "—" : r(this.language, "programs.minutes", { n: o.minutes })}
            </span>
            ${this.showControls ? l`<button @click=${() => this._toggle(o.cycle)}>
                  ${r(
        this.language,
        o.cycle.enabled === !1 ? "programs.enable" : "programs.disable"
      )}
                </button>` : u}
          </div>
          ${this._lastRun(o.cycle)}
        `
    )}
    `;
  }
};
zt.styles = $`
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
    .last-run {
      font-size: 11px;
      color: var(--secondary-text-color, #727272);
      padding: 0 0 4px 8px;
    }
    .last-run.muted {
      font-style: italic;
      opacity: 0.8;
    }
    .empty {
      font-size: 12px;
      color: var(--secondary-text-color, #727272);
    }
  `;
let j = zt;
fe([
  h({ attribute: !1 })
], j.prototype, "cycles");
fe([
  h({ attribute: !1 })
], j.prototype, "weightedTemp");
fe([
  h({ type: Number })
], j.prototype, "adjustmentPct");
fe([
  h()
], j.prototype, "language");
fe([
  h({ type: Boolean })
], j.prototype, "showControls");
fe([
  h({ attribute: !1 })
], j.prototype, "lastRuns");
z("imc-programs-block", j);
var ta = Object.defineProperty, re = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && ta(e, t, i), i;
};
function ia(a, e) {
  const t = a ?? {}, o = [];
  for (const i of ["water_accounting", "leak_watch", "leak_detection", "water_supply"]) {
    const n = typeof t[i] == "string" ? t[i] : "unavailable", s = i === "leak_detection" ? "leak_candidate" : "supply_candidate";
    o.push({
      key: i,
      state: n,
      adoptable: n === "candidate_available" && !!e?.[s]
    });
  }
  return o;
}
const kt = class kt extends b {
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
    const e = ia(this.capabilities, this.candidates);
    return l`
      ${e.map(
      (t) => l`
          <div class="row">
            <span class="label">${x(this.language, "capability", t.key)}</span>
            <span class="value ${t.state === "candidate_available" ? "hint" : ""}">
              ${x(this.language, "capability_state", t.state)}
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
kt.styles = $`
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
let R = kt;
re([
  h({ attribute: !1 })
], R.prototype, "capabilities");
re([
  h({ attribute: !1 })
], R.prototype, "candidates");
re([
  h({ attribute: !1 })
], R.prototype, "degraded");
re([
  h()
], R.prototype, "meterEntity");
re([
  h()
], R.prototype, "meterUnit");
re([
  h()
], R.prototype, "batteryState");
re([
  h()
], R.prototype, "language");
z("imc-hardware-block", R);
var oa = Object.defineProperty, zi = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && oa(e, t, i), i;
};
const tt = 320, Oe = 96, mt = 4, ki = 4, Be = 6, aa = 10, na = 3, He = {
  width: (a) => a - mt - ki,
  height: (a) => a - Be - aa
};
function sa(a, e, t) {
  const o = a.days;
  if (o.length === 0) return [];
  const i = He.width(e), n = He.height(t), s = i / o.length, d = Math.max(s - Math.min(1, s * 0.15), s * 0.5), c = Math.max(...o.map((p) => p.l), 0);
  return o.map((p, _) => {
    const f = a.oldestRecorded !== null && p.date < a.oldestRecorded, v = f || c <= 0 ? 0 : p.l / c * n;
    return {
      date: p.date,
      x: mt + _ * s + (s - d) / 2,
      y: Be + n - v,
      w: d,
      h: v,
      est: p.est,
      // Diagnostic #7: a day with six hours of unreadable meter must never
      // look like a quiet day, so the mark rides on gap_s alone.
      gap: p.gap_s > 0,
      unrecorded: f
    };
  });
}
const St = class St extends b {
  constructor() {
    super(...arguments), this.language = "en";
  }
  render() {
    const e = this.series;
    if (!e || e.days.length === 0)
      return l`<div class="empty">${r(this.language, "chart.no_data")}</div>`;
    const t = sa(e, tt, Oe), o = Be + He.height(Oe), i = t.some((d) => d.est), n = t.some((d) => d.gap), s = t.some((d) => d.unrecorded);
    return l`
      <svg viewBox="0 0 ${tt} ${Oe}" role="img"
           aria-label=${r(this.language, "chart.aria", {
      days: e.days.length,
      liters: k(e.totalL, 0) ?? "0"
    })}>
        <defs>
          <pattern id="imc-hatch" width="4" height="4" patternUnits="userSpaceOnUse"
                   patternTransform="rotate(45)">
            <line class="hatch-line" x1="0" y1="0" x2="0" y2="4"></line>
          </pattern>
        </defs>
        ${t.map(
      (d) => d.unrecorded ? q`<rect class="unrecorded" x=${d.x} y=${Be}
                        width=${d.w} height=${He.height(Oe)}></rect>` : d.h > 0 ? q`<rect class="bar ${d.est ? "est" : ""}" x=${d.x} y=${d.y}
                          width=${d.w} height=${d.h}></rect>` : u
    )}
        <line class="baseline" x1=${mt} y1=${o}
              x2=${tt - ki} y2=${o}></line>
        ${t.filter((d) => d.gap).map(
      (d) => q`<rect class="gap" x=${d.x} y=${o + 1}
                        width=${d.w} height=${na}></rect>`
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
St.styles = $`
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
let Se = St;
zi([
  h({ attribute: !1 })
], Se.prototype, "series");
zi([
  h()
], Se.prototype, "language");
z("imc-water-chart", Se);
var ra = Object.defineProperty, Ee = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && ra(e, t, i), i;
};
function la(a, e) {
  return a !== "internal" ? !1 : e !== "unavailable";
}
const At = class At extends b {
  constructor() {
    super(...arguments), this.source = "internal", this.language = "en";
  }
  _figure(e, t) {
    return l`
      <div class="figure">
        <span class="figure-label">${r(this.language, e)}</span>
        <span class="figure-value">${k(t, 1) ?? "—"} L</span>
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
      ${la(this.source, this.accounting) ? l`<imc-water-chart
            .series=${this.series ?? void 0}
            .language=${this.language}
          ></imc-water-chart>` : u}
    `;
  }
};
At.styles = $`
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
let V = At;
Ee([
  h({ attribute: !1 })
], V.prototype, "water");
Ee([
  h({ attribute: !1 })
], V.prototype, "series");
Ee([
  h()
], V.prototype, "source");
Ee([
  h()
], V.prototype, "accounting");
Ee([
  h()
], V.prototype, "language");
z("imc-consumption-block", V);
var ca = Object.defineProperty, Ne = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && ca(e, t, i), i;
};
const ue = "irrigation_maestro", Ct = class Ct extends b {
  constructor() {
    super(...arguments), this._now = Date.now(), this._history = new Ue(), this._runs = new Vo(), this._relevantIds = [], this._statesCount = 0, this._timerPeriod = 0;
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
    const t = e ? H(e).zones : [];
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
    const t = li.filter((o) => C(e, o)).length;
    return Math.max(3, t + (C(e, "consumption") ? 3 : 0));
  }
  /* ------------------------------------------------------------ */
  /* Update gating and the refresh timer                           */
  /* ------------------------------------------------------------ */
  shouldUpdate(e) {
    if (e.size === 1 && e.has("hass")) {
      const t = e.get("hass"), o = this.hass;
      return !t || !o || Object.keys(o.states).length !== this._statesCount ? !0 : this._relevantIds.some((n) => t.states[n] !== o.states[n]);
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
    ), this.hass && e && o && C(o, "programs") && this._runs.request(this.hass, e.zoneId, Date.now(), /* @__PURE__ */ new Date()), this.hass && e && o && C(o, "hardware") && this._discoverSensors(e.zoneId);
  }
  /* ------------------------------------------------------------ */
  /* Services — every write in the card is here                    */
  /* ------------------------------------------------------------ */
  async _call(e, t, o) {
    const i = this.hass;
    if (i)
      try {
        await i.callService(e, t, o);
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
    const t = this._zone(), o = e.detail.cycleId, i = t?.cycleSwitches.find(
      (n) => g(n.attributes.cycle_id) === o
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
      return H(e).zones.find((o) => o.zoneId === t);
  }
  /* ------------------------------------------------------------ */
  /* Render                                                        */
  /* ------------------------------------------------------------ */
  _renderState(e, t) {
    const o = hi(e), i = e.state?.state ?? "unknown", n = g(e.state?.attributes.run_started_at), s = m(e.state?.attributes.run_duration_min);
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
        <span class="status">${x(t, "zone_state", i)}</span>
        ${o.coverage === "alarm" ? l`<span
              class="chip alarm"
              title=${ut(t, r(t, "header.leak"), o, this._now)}
              >${r(t, "header.leak")}</span
            >` : u}
      </div>
      ${d}
    `;
  }
  _renderLastOutcome(e, t) {
    const o = e.lastOutcome;
    if (!o || E(o) || o.state === "none") return u;
    const i = g(o.attributes.reason_key), n = m(o.attributes.duration_min), s = m(o.attributes.volume_l);
    return l`
      <div class="line">
        <span class="label">${r(t, "zone.last_outcome")}</span>
        <span class="value">
          ${x(t, "outcome", o.state)}${i ? ` — ${x(t, "reason", i)}` : ""}
          ${n !== void 0 ? l`· ${n} min` : u}
          ${s !== void 0 ? l`· ${k(s, 1)} L` : u}
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
    const o = ge(t), i = H(t);
    this._relevantIds = i.entityIds, this._statesCount = Object.keys(t.states).length;
    const n = i.zones.find((v) => v.zoneId === e.zone);
    if (!n)
      return l`<ha-card
        ><div class="message">
          ${r(o, "zone_card.missing_zone", { id: e.zone ?? "—" })}
        </div></ha-card
      >`;
    const s = oo(n), d = mi(n), c = n.state?.attributes.capabilities, p = g(n.zone_water_total?.attributes.meter_entity), _ = this._runs.get(n.zoneId), f = N(n.state?.attributes.degraded).map((v) => g(v)).filter((v) => v !== void 0);
    return l`
      <ha-card
        @imc-program-toggle=${this._onProgramToggle}
        @imc-adopt-sensor=${this._onAdoptSensor}
      >
        <h1 class="card-title">${e.title ?? n.name}</h1>
        ${this._error ? l`<div class="error">${this._error}</div>` : u}
        ${C(e, "state") ? l`<div class="block">${this._renderState(n, o)}</div>` : u}
        ${C(e, "next_run") ? l`<div class="block">
              <imc-next-run-block
                .nextRun=${E(n.nextRun) ? void 0 : n.nextRun?.state}
                .nextRunProgram=${g(n.nextRun?.attributes.cycle_name)}
                .verdict=${n.state?.attributes.next_run}
                .language=${o}
                .now=${this._now}
              ></imc-next-run-block>
            </div>` : u}
        ${C(e, "last_outcome") ? l`<div class="block">${this._renderLastOutcome(n, o)}</div>` : u}
        ${C(e, "programs") ? l`<div class="block">
              <div class="block-title">${r(o, "zone_card.programs")}</div>
              <imc-programs-block
                .cycles=${s}
                .language=${o}
                .adjustmentPct=${ot(n)}
                .weightedTemp=${m(i.hub.weightedTemp?.state)}
                .showControls=${C(e, "actions")}
                .lastRuns=${_ === null ? void 0 : Wo(_)}
              ></imc-programs-block>
            </div>` : u}
        ${C(e, "curve") ? l`<div class="block">
              <div class="block-title">${r(o, "zone_card.curve")}</div>
              ${s.length === 0 ? l`<div class="message">${r(o, "programs.none")}</div>` : s.map(
      (v) => l`
                      <imc-curve-editor
                        .cycle=${v}
                        .language=${o}
                        .weightedTemp=${m(i.hub.weightedTemp?.state)}
                        .zoneHasFlowMeter=${di(n)}
                        .zoneAdjustmentPct=${ot(n)}
                      ></imc-curve-editor>
                    `
    )}
            </div>` : u}
        ${C(e, "hardware") ? l`<div class="block">
              <div class="block-title">${r(o, "zone_card.hardware")}</div>
              <imc-hardware-block
                .capabilities=${c}
                .candidates=${this._candidates}
                .degraded=${f}
                .meterEntity=${p}
                .meterUnit=${p ? g(t.states[p]?.attributes.unit_of_measurement) : void 0}
                .batteryState=${e.battery_entity ? t.states[e.battery_entity]?.state : void 0}
                .language=${o}
              ></imc-hardware-block>
            </div>` : u}
        ${C(e, "consumption") ? l`<div class="block">
              <div class="block-title">${r(o, "zone_card.consumption")}</div>
              <imc-consumption-block
                .water=${d}
                .series=${this._history.get(n.zoneId, e.chart_days ?? 30)}
                .source=${e.consumption_source ?? "internal"}
                .accounting=${g(c?.water_accounting)}
                .language=${o}
              ></imc-consumption-block>
            </div>` : u}
        ${C(e, "actions") ? l`<div class="block">${this._renderActions(n, o)}</div>` : u}
      </ha-card>
    `;
  }
};
Ct.styles = $`
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
let Z = Ct;
Ne([
  h({ attribute: !1 })
], Z.prototype, "hass");
Ne([
  w()
], Z.prototype, "_config");
Ne([
  w()
], Z.prototype, "_now");
Ne([
  w()
], Z.prototype, "_error");
Ne([
  w()
], Z.prototype, "_candidates");
z("irrigation-maestro-zone-card", Z);
var da = Object.defineProperty, Ye = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && da(e, t, i), i;
};
function ua() {
  return typeof customElements < "u" && !!customElements.get("ha-selector");
}
const Tt = class Tt extends b {
  constructor() {
    super(...arguments), this.selector = { entity: {} }, this.value = "", this.label = "";
  }
  _emit(e) {
    this.value = e, this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: e }, bubbles: !0, composed: !0 })
    );
  }
  render() {
    return ua() ? l`<ha-selector
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
Tt.styles = $`
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
let ne = Tt;
Ye([
  h({ attribute: !1 })
], ne.prototype, "hass");
Ye([
  h({ attribute: !1 })
], ne.prototype, "selector");
Ye([
  h()
], ne.prototype, "value");
Ye([
  h()
], ne.prototype, "label");
z("imc-entity-picker", ne);
var pa = Object.defineProperty, Si = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && pa(e, t, i), i;
};
const Pt = class Pt extends b {
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
    const i = { ...this._config };
    o ? delete i[e] : i[e] = t, this._emit(i);
  }
  _setBlock(e, t) {
    if (!this._config) return;
    const o = { ...this._config.blocks ?? {} };
    t ? delete o[e] : o[e] = !1;
    const i = { ...this._config };
    Object.keys(o).length > 0 ? i.blocks = o : delete i.blocks, this._emit(i);
  }
  _setSource(e) {
    if (!this._config) return;
    const t = { ...this._config };
    e === "internal" ? (delete t.consumption_source, delete t.total_entity, delete t.today_entity, delete t.month_entity) : t.consumption_source = "entity", this._emit(t);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const o = ge(t), i = H(t).zones, n = e.consumption_source ?? "internal";
    return l`
      <div class="form">
        <label class="field">
          ${r(o, "zone_card_editor.zone")}
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
          ${r(o, "zone_card_editor.title")}
          <input
            type="text"
            .value=${e.title ?? ""}
            placeholder=${r(o, "zone_card_editor.title_placeholder")}
            @input=${(s) => {
      const d = s.currentTarget.value;
      this._set("title", d, d === "");
    }}
          />
        </label>

        <div class="group">
          <span class="group-title">${r(o, "zone_card_editor.blocks")}</span>
          ${li.map(
      (s) => l`
              <label class="toggle">
                <input
                  type="checkbox"
                  .checked=${C(e, s)}
                  @change=${(d) => this._setBlock(s, d.currentTarget.checked)}
                />
                ${x(o, "block", s)}
              </label>
            `
    )}
        </div>

        <label class="field">
          ${r(o, "zone_card_editor.chart_days")}
          <select
            @change=${(s) => {
      const d = Number(s.currentTarget.value);
      this._set("chart_days", d, d === 30);
    }}
          >
            ${Qi.map(
      (s) => l`<option value=${s} ?selected=${(e.chart_days ?? 30) === s}>
                  ${r(o, "zone_card_editor.days", { n: s })}
                </option>`
    )}
          </select>
        </label>

        <label class="field">
          ${r(o, "zone_card_editor.consumption_source")}
          <select
            @change=${(s) => this._setSource(
      s.currentTarget.value
    )}
          >
            <option value="internal" ?selected=${n === "internal"}>
              ${r(o, "zone_card_editor.source_internal")}
            </option>
            <option value="entity" ?selected=${n === "entity"}>
              ${r(o, "zone_card_editor.source_entity")}
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
                    ${r(o, d)}
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
          ${r(o, "zone_card_editor.battery_entity")}
          <imc-entity-picker
            .hass=${t}
            .value=${e.battery_entity ?? ""}
            .selector=${{ entity: { domain: "sensor" } }}
            @value-changed=${(s) => this._set("battery_entity", s.detail.value, !s.detail.value)}
          ></imc-entity-picker>
          <span class="hint">${r(o, "zone_card_editor.battery_hint")}</span>
        </label>
      </div>
    `;
  }
};
Pt.styles = $`
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
let Ae = Pt;
Si([
  h({ attribute: !1 })
], Ae.prototype, "hass");
Si([
  w()
], Ae.prototype, "_config");
z("irrigation-maestro-zone-card-editor", Ae);
const ha = [
  "temp_d3",
  "temp_d2",
  "temp_d1",
  "temp_today_eff",
  "temp_tomorrow"
];
function _a(a, e) {
  const t = Array.isArray(e) ? e : [];
  return ha.map((o, i) => {
    const n = a?.[o], s = typeof n == "number" ? n : null, d = typeof t[i] == "number" ? t[i] : null;
    return { key: o, value: s, weight: d, missing: s === null };
  });
}
function ma(a) {
  return a.every((e) => !e.missing);
}
function ga(a) {
  if (!a) return { verdict: "unchecked", silentEvents: [], unreachable: [] };
  const e = Array.isArray(a.enabled_without_target) ? a.enabled_without_target.map(String) : [], t = a.unreachable ?? {}, o = Object.keys(t), i = a.verdict;
  return { verdict: i === "mute" || i === "muted" ? "muted" : e.length > 0 || o.length > 0 ? "partial" : "ok", silentEvents: e, unreachable: o };
}
function fa(a, e) {
  switch (e.verdict) {
    case "muted":
      return r(a, "health.notifications_muted");
    case "partial":
      return r(a, "health.notifications_partial", {
        n: e.silentEvents.length + e.unreachable.length
      });
    case "unchecked":
      return r(a, "health.notifications_unchecked");
    default:
      return r(a, "health.notifications_ok");
  }
}
var va = Object.defineProperty, G = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && va(e, t, i), i;
};
const Et = class Et extends b {
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
      ${e ? l`<span class="reason">— ${x(this.language, "reason", e)}</span>` : u}
    </div>`;
  }
  _rain() {
    const e = this.language, t = [
      [r(e, "decision.day_today"), m(this.budgetAttrs?.rain_today)],
      [r(e, "decision.day_d1"), m(this.budgetAttrs?.rain_d1)],
      [r(e, "decision.day_d2"), m(this.budgetAttrs?.rain_d2)],
      [r(e, "decision.day_d3"), m(this.budgetAttrs?.rain_d3)]
    ], o = m(this.budgetAttrs?.forecast_credit);
    return l`
      <div class="section">
        <div class="section-title">${r(e, "decision.rain")}</div>
        ${t.map(
      ([i, n]) => l`
            <div class="row">
              <span class="name">${i}</span>
              <span class="num">${k(n, 2) ?? "—"} mm</span>
            </div>
          `
    )}
        <div class="row">
          <span class="name">${r(e, "decision.forecast_credit")}</span>
          <span class="num">${k(o, 2) ?? "—"} mm</span>
        </div>
      </div>
    `;
  }
  _temperature() {
    const e = this.language, t = _a(this.tempAttrs, this.tempAttrs?.temp_weights), o = {
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
          ${k(this.weightedTemp, 1) ?? "—"} °C
        </div>
        ${t.map(
      (i) => l`
            <div class="row ${i.missing ? "missing" : ""}">
              <span class="name">${o[i.key] ?? i.key}</span>
              <span class="num">
                ${i.missing ? r(e, "decision.missing_day") : `${k(i.value ?? void 0, 1)} °C`}
              </span>
              <span class="weight">
                ${i.missing || i.weight === null ? "" : `${Math.round(i.weight * 100)}%`}
              </span>
            </div>
          `
    )}
        ${ma(t) ? u : l`<div class="note">${r(e, "decision.weights_note")}</div>`}
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
Et.styles = $`
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
let I = Et;
G([
  h({ attribute: !1 })
], I.prototype, "budget");
G([
  h({ attribute: !1 })
], I.prototype, "threshold");
G([
  h({ attribute: !1 })
], I.prototype, "budgetAttrs");
G([
  h({ attribute: !1 })
], I.prototype, "tempAttrs");
G([
  h({ attribute: !1 })
], I.prototype, "weightedTemp");
G([
  h()
], I.prototype, "skipReason");
G([
  h({ type: Boolean })
], I.prototype, "evaluated");
G([
  h()
], I.prototype, "language");
z("imc-decision-block", I);
var ya = Object.defineProperty, K = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && ya(e, t, i), i;
};
const Nt = class Nt extends b {
  constructor() {
    super(...arguments), this.staleWeather = !1, this.language = "en";
  }
  _test() {
    this.dispatchEvent(new CustomEvent("imc-test-notification", { bubbles: !0, composed: !0 }));
  }
  render() {
    const e = this.language, t = ga(this.notifications), o = this.leak?.coverage === "alarm" ? l`<span class="value warn">${r(e, "header.leak")}</span>` : (
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
          ${fa(e, t)}
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
        ${o}
      </div>

      ${this.unattributedTotal !== void 0 ? l`<div class="row">
              <span class="label">${r(e, "health.unattributed")}</span>
              <span class="value">
                ${k(this.unattributedTotal, 1)} L
                ${this.unattributedClosed !== void 0 ? l`${r(e, "health.closed_subset", {
      liters: k(this.unattributedClosed, 1) ?? "0"
    })}` : u}
              </span>
            </div>
            <div class="row">
              <span class="label"></span>
              <span class="note">${r(e, "health.unattributed_note")}</span>
            </div>` : u}

      ${this.budgetLeft !== void 0 ? l`<div class="row">
            <span class="label">${r(e, "health.budget_left")}</span>
            <span class="value">${k(this.budgetLeft, 0)} L</span>
          </div>` : u}
    `;
  }
};
Nt.styles = $`
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
let O = Nt;
K([
  h()
], O.prototype, "weatherEntity");
K([
  h({ type: Boolean })
], O.prototype, "staleWeather");
K([
  h({ attribute: !1 })
], O.prototype, "notifications");
K([
  h({ attribute: !1 })
], O.prototype, "leak");
K([
  h({ attribute: !1 })
], O.prototype, "unattributedTotal");
K([
  h({ attribute: !1 })
], O.prototype, "unattributedClosed");
K([
  h({ attribute: !1 })
], O.prototype, "budgetLeft");
K([
  h()
], O.prototype, "language");
z("imc-health-block", O);
var ba = Object.defineProperty, Qe = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && ba(e, t, i), i;
};
const ti = "irrigation_maestro", xa = 300 * 1e3, Mt = class Mt extends b {
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
    return e ? ci.filter((t) => ee(e, t)).length + 2 : 4;
  }
  shouldUpdate(e) {
    if (e.size === 1 && e.has("hass")) {
      const t = e.get("hass"), o = this.hass;
      return !t || !o || Object.keys(o.states).length !== this._statesCount ? !0 : this._relevantIds.some((i) => t.states[i] !== o.states[i]);
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
    this._notificationsInFlight || this._notifications !== void 0 && e - this._notificationsAt < xa || this.hass && (this._notificationsInFlight = !0, this._notificationsAt = e, this.hass.callService(ti, "notification_status", {}, void 0, !1, !0).then((t) => {
      this._notifications = t.response ?? null;
    }).catch(() => {
      this._notifications = null;
    }).finally(() => {
      this._notificationsInFlight = !1;
    }));
  }
  async _call(e, t) {
    const o = this.hass;
    if (o)
      try {
        await o.callService(ti, e, t);
      } catch (i) {
        this._error = i instanceof Error ? i.message : String(i), this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
          this._error = void 0, this._errorTimer = void 0;
        }, 6e3);
      }
  }
  _onGlobalAction(e) {
    const t = this.hass ? H(this.hass).hub : void 0;
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
        const o = t?.pauseSwitch?.entity_id;
        o && this.hass && this.hass.callService("switch", e.detail.paused ? "turn_on" : "turn_off", {
          entity_id: o
        });
        break;
      }
    }
  }
  _renderSession(e, t) {
    const o = e.hub.session, i = N(o?.attributes.queue).filter(
      (s) => !!s && typeof s == "object"
    ), n = g(o?.attributes.active_zone_id);
    return l`
      <div class="session-state">
        ${o ? at(t, o.state) : "—"}
      </div>
      ${i.length > 0 ? l`<div class="queue">
            ${i.map(
      (s, d) => l`
                <div class="queue-item ${s.zone_id === n ? "active" : ""}">
                  <span class="idx">${d + 1}.</span>
                  <span class="qname">${g(s.zone_name) ?? "?"}</span>
                  ${m(s.duration_min) !== void 0 ? l`<span class="qmeta">${m(s.duration_min)} min</span>` : u}
                  ${g(s.state) ? l`<span class="qmeta">${at(t, g(s.state))}</span>` : u}
                </div>
              `
    )}
          </div>` : u}
    `;
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const o = ge(t), i = H(t);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(t.states).length, !i.found)
      return l`<ha-card
        ><div class="message">${r(o, "hub_card.not_installed")}</div></ha-card
      >`;
    const n = i.hub, s = E(n.waterBudget) ? void 0 : m(n.waterBudget?.state), d = E(n.skipThreshold) ? void 0 : m(n.skipThreshold?.state), c = n.weightedTemp?.attributes.temp_today_eff !== void 0;
    return l`
      <ha-card @imc-global-action=${this._onGlobalAction} @imc-test-notification=${() => this._call("test_notification")}>
        ${e.title ? l`<h1 class="card-title">${e.title}</h1>` : u}
        ${this._error ? l`<div class="error">${this._error}</div>` : u}

        ${ee(e, "session") ? l`<div class="block">
              <div class="block-title">${r(o, "hub_card.session")}</div>
              ${this._renderSession(i, o)}
            </div>` : u}

        ${ee(e, "decision") ? l`<div class="block">
              <div class="block-title">${r(o, "hub_card.decision")}</div>
              <imc-decision-block
                .budget=${s}
                .threshold=${d}
                .budgetAttrs=${n.waterBudget?.attributes}
                .tempAttrs=${n.weightedTemp?.attributes}
                .weightedTemp=${m(n.weightedTemp?.state)}
                .skipReason=${g(n.waterBudget?.attributes.skip_reason)}
                .evaluated=${c}
                .language=${o}
              ></imc-decision-block>
            </div>` : u}

        ${ee(e, "health") ? l`<div class="block">
              <div class="block-title">${r(o, "hub_card.health")}</div>
              <imc-health-block
                .weatherEntity=${g(n.weightedTemp?.attributes.weather_entity)}
                .staleWeather=${n.weightedTemp?.attributes.stale_weather === !0}
                .notifications=${this._notifications}
                .leak=${_i(n)}
                .unattributedTotal=${m(n.unattributedWater?.state)}
                .unattributedClosed=${m(n.unattributedWater?.attributes.closed_l)}
                .budgetLeft=${E(n.consumptionLeft) ? void 0 : m(n.consumptionLeft?.state)}
                .language=${o}
              ></imc-health-block>
            </div>` : u}

        ${ee(e, "actions") ? l`<div class="block">
              <imc-global-controls
                .language=${o}
                .paused=${n.pauseSwitch?.state === "on"}
                .hasPauseSwitch=${!!n.pauseSwitch}
              ></imc-global-controls>
            </div>` : u}
      </ha-card>
    `;
  }
};
Mt.styles = $`
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
let se = Mt;
Qe([
  h({ attribute: !1 })
], se.prototype, "hass");
Qe([
  w()
], se.prototype, "_config");
Qe([
  w()
], se.prototype, "_error");
Qe([
  w()
], se.prototype, "_notifications");
z("irrigation-maestro-hub-card", se);
var wa = Object.defineProperty, Ai = (a, e, t, o) => {
  for (var i = void 0, n = a.length - 1, s; n >= 0; n--)
    (s = a[n]) && (i = s(e, t, i) || i);
  return i && wa(e, t, i), i;
};
const Dt = class Dt extends b {
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
    const o = { ...this._config.blocks ?? {} };
    t ? delete o[e] : o[e] = !1;
    const i = { ...this._config };
    Object.keys(o).length > 0 ? i.blocks = o : delete i.blocks, this._emit(i);
  }
  render() {
    const e = this._config, t = this.hass;
    if (!e || !t) return u;
    const o = ge(t);
    return l`
      <div class="form">
        <label class="field">
          ${r(o, "hub_card_editor.title")}
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
          <span class="group-title">${r(o, "hub_card_editor.blocks")}</span>
          ${ci.map(
      (i) => l`
              <label class="toggle">
                <input
                  type="checkbox"
                  .checked=${ee(e, i)}
                  @change=${(n) => this._setBlock(i, n.currentTarget.checked)}
                />
                ${x(o, "hub_block", i)}
              </label>
            `
    )}
        </div>
      </div>
    `;
  }
};
Dt.styles = $`
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
let Ce = Dt;
Ai([
  h({ attribute: !1 })
], Ce.prototype, "hass");
Ai([
  w()
], Ce.prototype, "_config");
z("irrigation-maestro-hub-card-editor", Ce);
const $a = "https://github.com/jmbriccola/ha-irrigation-configurable";
window.customCards = window.customCards ?? [];
for (const a of [
  {
    type: "irrigation-maestro-card",
    name: P["card.name"],
    description: P["card.description"]
  },
  {
    type: "irrigation-maestro-zone-card",
    name: P["zone_card.name"],
    description: P["zone_card.description"]
  },
  {
    type: "irrigation-maestro-hub-card",
    name: P["hub_card.name"],
    description: P["hub_card.description"]
  }
])
  window.customCards.some((e) => e.type === a.type) || window.customCards.push({ ...a, preview: !0, documentationURL: $a });
