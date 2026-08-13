/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const le = globalThis, Pe = le.ShadowRoot && (le.ShadyCSS === void 0 || le.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Te = /* @__PURE__ */ Symbol(), qe = /* @__PURE__ */ new WeakMap();
let _t = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== Te) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (Pe && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = qe.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && qe.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const Et = (n) => new _t(typeof n == "string" ? n : n + "", void 0, Te), N = (n, ...e) => {
  const t = n.length === 1 ? n[0] : e.reduce((i, s, o) => i + ((r) => {
    if (r._$cssResult$ === !0) return r.cssText;
    if (typeof r == "number") return r;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + r + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s) + n[o + 1], n[0]);
  return new _t(t, n, Te);
}, Ct = (n, e) => {
  if (Pe) n.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), s = le.litNonce;
    s !== void 0 && i.setAttribute("nonce", s), i.textContent = t.cssText, n.appendChild(i);
  }
}, Ge = Pe ? (n) => n : (n) => n instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return Et(t);
})(n) : n;
const { is: Pt, defineProperty: Tt, getOwnPropertyDescriptor: It, getOwnPropertyNames: Nt, getOwnPropertySymbols: Ot, getPrototypeOf: Dt } = Object, me = globalThis, Ke = me.trustedTypes, Ft = Ke ? Ke.emptyScript : "", jt = me.reactiveElementPolyfillSupport, ee = (n, e) => n, ce = { toAttribute(n, e) {
  switch (e) {
    case Boolean:
      n = n ? Ft : null;
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
} }, Ie = (n, e) => !Pt(n, e), Xe = { attribute: !0, type: String, converter: ce, reflect: !1, useDefault: !1, hasChanged: Ie };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), me.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let H = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Xe) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = /* @__PURE__ */ Symbol(), s = this.getPropertyDescriptor(e, i, t);
      s !== void 0 && Tt(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: s, set: o } = It(this.prototype, e) ?? { get() {
      return this[t];
    }, set(r) {
      this[t] = r;
    } };
    return { get: s, set(r) {
      const l = s?.call(this);
      o?.call(this, r), this.requestUpdate(e, l, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Xe;
  }
  static _$Ei() {
    if (this.hasOwnProperty(ee("elementProperties"))) return;
    const e = Dt(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(ee("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(ee("properties"))) {
      const t = this.properties, i = [...Nt(t), ...Ot(t)];
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
      for (const s of i) t.unshift(Ge(s));
    } else e !== void 0 && t.push(Ge(e));
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
    return Ct(e, this.constructor.elementStyles), e;
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
      const o = (i.converter?.toAttribute !== void 0 ? i.converter : ce).toAttribute(t, i.type);
      this._$Em = e, o == null ? this.removeAttribute(s) : this.setAttribute(s, o), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, s = i._$Eh.get(e);
    if (s !== void 0 && this._$Em !== s) {
      const o = i.getPropertyOptions(s), r = typeof o.converter == "function" ? { fromAttribute: o.converter } : o.converter?.fromAttribute !== void 0 ? o.converter : ce;
      this._$Em = s;
      const l = r.fromAttribute(t, o.type);
      this[s] = l ?? this._$Ej?.get(s) ?? l, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, s = !1, o) {
    if (e !== void 0) {
      const r = this.constructor;
      if (s === !1 && (o = this[e]), i ??= r.getPropertyOptions(e), !((i.hasChanged ?? Ie)(o, t) || i.useDefault && i.reflect && o === this._$Ej?.get(e) && !this.hasAttribute(r._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: s, wrapped: o }, r) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, r ?? t ?? this[e]), o !== !0 || r !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), s === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        const { wrapped: r } = o, l = this[s];
        r !== !0 || this._$AL.has(s) || l === void 0 || this.C(s, void 0, o, l);
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
H.elementStyles = [], H.shadowRootOptions = { mode: "open" }, H[ee("elementProperties")] = /* @__PURE__ */ new Map(), H[ee("finalized")] = /* @__PURE__ */ new Map(), jt?.({ ReactiveElement: H }), (me.reactiveElementVersions ??= []).push("2.1.2");
const Ne = globalThis, Ye = (n) => n, pe = Ne.trustedTypes, Qe = pe ? pe.createPolicy("lit-html", { createHTML: (n) => n }) : void 0, ht = "$lit$", L = `lit$${Math.random().toFixed(9).slice(2)}$`, mt = "?" + L, Rt = `<${mt}>`, Z = document, te = () => Z.createComment(""), ie = (n) => n === null || typeof n != "object" && typeof n != "function", Oe = Array.isArray, Lt = (n) => Oe(n) || typeof n?.[Symbol.iterator] == "function", ye = `[ 	
\f\r]`, Y = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Je = /-->/g, et = />/g, U = RegExp(`>|${ye}(?:([^\\s"'>=/]+)(${ye}*=${ye}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), tt = /'/g, it = /"/g, vt = /^(?:script|style|textarea|title)$/i, ft = (n) => (e, ...t) => ({ _$litType$: n, strings: e, values: t }), d = ft(1), xe = ft(2), q = /* @__PURE__ */ Symbol.for("lit-noChange"), u = /* @__PURE__ */ Symbol.for("lit-nothing"), st = /* @__PURE__ */ new WeakMap(), W = Z.createTreeWalker(Z, 129);
function gt(n, e) {
  if (!Oe(n) || !n.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Qe !== void 0 ? Qe.createHTML(e) : e;
}
const Ut = (n, e) => {
  const t = n.length - 1, i = [];
  let s, o = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", r = Y;
  for (let l = 0; l < t; l++) {
    const c = n[l];
    let _, f, v = -1, z = 0;
    for (; z < c.length && (r.lastIndex = z, f = r.exec(c), f !== null); ) z = r.lastIndex, r === Y ? f[1] === "!--" ? r = Je : f[1] !== void 0 ? r = et : f[2] !== void 0 ? (vt.test(f[2]) && (s = RegExp("</" + f[2], "g")), r = U) : f[3] !== void 0 && (r = U) : r === U ? f[0] === ">" ? (r = s ?? Y, v = -1) : f[1] === void 0 ? v = -2 : (v = r.lastIndex - f[2].length, _ = f[1], r = f[3] === void 0 ? U : f[3] === '"' ? it : tt) : r === it || r === tt ? r = U : r === Je || r === et ? r = Y : (r = U, s = void 0);
    const I = r === U && n[l + 1].startsWith("/>") ? " " : "";
    o += r === Y ? c + Rt : v >= 0 ? (i.push(_), c.slice(0, v) + ht + c.slice(v) + L + I) : c + L + (v === -2 ? l : I);
  }
  return [gt(n, o + (n[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class se {
  constructor({ strings: e, _$litType$: t }, i) {
    let s;
    this.parts = [];
    let o = 0, r = 0;
    const l = e.length - 1, c = this.parts, [_, f] = Ut(e, t);
    if (this.el = se.createElement(_, i), W.currentNode = this.el.content, t === 2 || t === 3) {
      const v = this.el.content.firstChild;
      v.replaceWith(...v.childNodes);
    }
    for (; (s = W.nextNode()) !== null && c.length < l; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const v of s.getAttributeNames()) if (v.endsWith(ht)) {
          const z = f[r++], I = s.getAttribute(v).split(L), ae = /([.?@])?(.*)/.exec(z);
          c.push({ type: 1, index: o, name: ae[2], strings: I, ctor: ae[1] === "." ? Wt : ae[1] === "?" ? Zt : ae[1] === "@" ? Bt : ve }), s.removeAttribute(v);
        } else v.startsWith(L) && (c.push({ type: 6, index: o }), s.removeAttribute(v));
        if (vt.test(s.tagName)) {
          const v = s.textContent.split(L), z = v.length - 1;
          if (z > 0) {
            s.textContent = pe ? pe.emptyScript : "";
            for (let I = 0; I < z; I++) s.append(v[I], te()), W.nextNode(), c.push({ type: 2, index: ++o });
            s.append(v[z], te());
          }
        }
      } else if (s.nodeType === 8) if (s.data === mt) c.push({ type: 2, index: o });
      else {
        let v = -1;
        for (; (v = s.data.indexOf(L, v + 1)) !== -1; ) c.push({ type: 7, index: o }), v += L.length - 1;
      }
      o++;
    }
  }
  static createElement(e, t) {
    const i = Z.createElement("template");
    return i.innerHTML = e, i;
  }
}
function G(n, e, t = n, i) {
  if (e === q) return e;
  let s = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const o = ie(e) ? void 0 : e._$litDirective$;
  return s?.constructor !== o && (s?._$AO?.(!1), o === void 0 ? s = void 0 : (s = new o(n), s._$AT(n, t, i)), i !== void 0 ? (t._$Co ??= [])[i] = s : t._$Cl = s), s !== void 0 && (e = G(n, s._$AS(n, e.values), s, i)), e;
}
class Vt {
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
    const { el: { content: t }, parts: i } = this._$AD, s = (e?.creationScope ?? Z).importNode(t, !0);
    W.currentNode = s;
    let o = W.nextNode(), r = 0, l = 0, c = i[0];
    for (; c !== void 0; ) {
      if (r === c.index) {
        let _;
        c.type === 2 ? _ = new re(o, o.nextSibling, this, e) : c.type === 1 ? _ = new c.ctor(o, c.name, c.strings, this, e) : c.type === 6 && (_ = new Ht(o, this, e)), this._$AV.push(_), c = i[++l];
      }
      r !== c?.index && (o = W.nextNode(), r++);
    }
    return W.currentNode = Z, s;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class re {
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
    e = G(this, e, t), ie(e) ? e === u || e == null || e === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : e !== this._$AH && e !== q && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Lt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== u && ie(this._$AH) ? this._$AA.nextSibling.data = e : this.T(Z.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: i } = e, s = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = se.createElement(gt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === s) this._$AH.p(t);
    else {
      const o = new Vt(s, this), r = o.u(this.options);
      o.p(t), this.T(r), this._$AH = o;
    }
  }
  _$AC(e) {
    let t = st.get(e.strings);
    return t === void 0 && st.set(e.strings, t = new se(e)), t;
  }
  k(e) {
    Oe(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, s = 0;
    for (const o of e) s === t.length ? t.push(i = new re(this.O(te()), this.O(te()), this, this.options)) : i = t[s], i._$AI(o), s++;
    s < t.length && (this._$AR(i && i._$AB.nextSibling, s), t.length = s);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const i = Ye(e).nextSibling;
      Ye(e).remove(), e = i;
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
  constructor(e, t, i, s, o) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = e, this.name = t, this._$AM = s, this.options = o, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = u;
  }
  _$AI(e, t = this, i, s) {
    const o = this.strings;
    let r = !1;
    if (o === void 0) e = G(this, e, t, 0), r = !ie(e) || e !== this._$AH && e !== q, r && (this._$AH = e);
    else {
      const l = e;
      let c, _;
      for (e = o[0], c = 0; c < o.length - 1; c++) _ = G(this, l[i + c], t, c), _ === q && (_ = this._$AH[c]), r ||= !ie(_) || _ !== this._$AH[c], _ === u ? e = u : e !== u && (e += (_ ?? "") + o[c + 1]), this._$AH[c] = _;
    }
    r && !s && this.j(e);
  }
  j(e) {
    e === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Wt extends ve {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === u ? void 0 : e;
  }
}
class Zt extends ve {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== u);
  }
}
class Bt extends ve {
  constructor(e, t, i, s, o) {
    super(e, t, i, s, o), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = G(this, e, t, 0) ?? u) === q) return;
    const i = this._$AH, s = e === u && i !== u || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, o = e !== u && (i === u || s);
    s && this.element.removeEventListener(this.name, this, i), o && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Ht {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    G(this, e);
  }
}
const qt = Ne.litHtmlPolyfillSupport;
qt?.(se, re), (Ne.litHtmlVersions ??= []).push("3.3.3");
const Gt = (n, e, t) => {
  const i = t?.renderBefore ?? e;
  let s = i._$litPart$;
  if (s === void 0) {
    const o = t?.renderBefore ?? null;
    i._$litPart$ = s = new re(e.insertBefore(te(), o), o, void 0, t ?? {});
  }
  return s._$AI(n), s;
};
const De = globalThis;
class A extends H {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Gt(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return q;
  }
}
A._$litElement$ = !0, A.finalized = !0, De.litElementHydrateSupport?.({ LitElement: A });
const Kt = De.litElementPolyfillSupport;
Kt?.({ LitElement: A });
(De.litElementVersions ??= []).push("4.2.2");
const Xt = { attribute: !0, type: String, converter: ce, reflect: !1, hasChanged: Ie }, Yt = (n = Xt, e, t) => {
  const { kind: i, metadata: s } = t;
  let o = globalThis.litPropertyMetadata.get(s);
  if (o === void 0 && globalThis.litPropertyMetadata.set(s, o = /* @__PURE__ */ new Map()), i === "setter" && ((n = Object.create(n)).wrapped = !0), o.set(t.name, n), i === "accessor") {
    const { name: r } = t;
    return { set(l) {
      const c = e.get.call(this);
      e.set.call(this, l), this.requestUpdate(r, c, n, !0, l);
    }, init(l) {
      return l !== void 0 && this.C(r, void 0, n, l), l;
    } };
  }
  if (i === "setter") {
    const { name: r } = t;
    return function(l) {
      const c = this[r];
      e.call(this, l), this.requestUpdate(r, c, n, !0, l);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function h(n) {
  return (e, t) => typeof t == "object" ? Yt(n, e, t) : ((i, s, o) => {
    const r = s.hasOwnProperty(o);
    return s.constructor.createProperty(o, i), r ? Object.getOwnPropertyDescriptor(s, o) : void 0;
  })(n, e, t);
}
function p(n) {
  return h({ ...n, state: !0, attribute: !1 });
}
function m(n) {
  if (typeof n == "number" && Number.isFinite(n)) return n;
  if (typeof n == "string" && n.trim() !== "") {
    const e = Number(n);
    if (Number.isFinite(e)) return e;
  }
}
function P(n) {
  return typeof n == "string" && n !== "" ? n : void 0;
}
function bt(n) {
  return Array.isArray(n) ? n : [];
}
function $e(n) {
  return !n || n.state === "unavailable" || n.state === "unknown";
}
function ue(n, e, t) {
  return Math.min(t, Math.max(e, n));
}
function F(n, e) {
  customElements.get(n) || customElements.define(n, e);
}
const ne = {
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
  "editor.graph.caption": "Live preview — curve value by temperature",
  "editor.graph.today": "today {temp}°",
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
  "program_editor.soak_max_run": "Maximum run length",
  "program_editor.soak_max_run_hint": "Minutes. Splits the watering into shorter runs so the soil can absorb between them. Empty = one continuous run.",
  "program_editor.soak_pause": "Soak pause",
  "program_editor.soak_pause_hint": "Minutes to wait between runs. Needs a maximum run length to have any effect.",
  "program_editor.volume_safety_timeout": "Volume safety timeout",
  "program_editor.volume_safety_timeout_hint": "Minutes after which a volume-target run stops even if the meter has not reached the target.",
  "settings.advanced_note": "Advanced parameters (engine, safety, notifications) live in Settings"
}, Qt = {
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
  "editor.graph.caption": "Anteprima dal vivo — valore della curva secondo la temperatura",
  "editor.graph.today": "oggi {temp}°",
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
  "program_editor.soak_max_run": "Durata massima per corsa",
  "program_editor.soak_max_run_hint": "Minuti. Divide l'irrigazione in corse più brevi perché il terreno assorba fra una e l'altra. Vuoto = una corsa continua.",
  "program_editor.soak_pause": "Pausa di ammollo",
  "program_editor.soak_pause_hint": "Minuti di attesa fra una corsa e l'altra. Senza una durata massima per corsa non ha alcun effetto.",
  "program_editor.volume_safety_timeout": "Timeout di sicurezza volumetrico",
  "program_editor.volume_safety_timeout_hint": "Minuti dopo i quali una corsa a volume si ferma anche se il contatore non ha raggiunto il target.",
  "settings.advanced_note": "Parametri avanzati (motore, sicurezza, notifiche) → Impostazioni"
}, Fe = {
  en: ne,
  it: Qt
};
function x(n) {
  const t = (n?.locale?.language ?? n?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in Fe ? t : "en";
}
function Jt(n, e) {
  return e ? n.replace(/\{(\w+)\}/g, (t, i) => {
    const s = e[i];
    return s === void 0 ? t : String(s);
  }) : n;
}
function a(n, e, t) {
  const i = Fe[n] ?? ne;
  return Jt(i[e] ?? ne[e], t);
}
function ei(n, e, t) {
  const i = `${e}.${t}`, s = Fe[n] ?? ne, o = ne;
  return s[i] ?? o[i] ?? t;
}
function ti(n, e = 1) {
  const t = m(n);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (i) => e > 0 ? "" : i);
}
function ii(n) {
  const e = Math.abs(Math.round(n)), t = Math.floor(e / 3600), i = Math.round(e % 3600 / 60), s = [];
  return t > 0 && s.push(`${t} h`), i > 0 && s.push(`${i} min`), s.length === 0 && s.push(`${e} s`), s.join(" ");
}
function si(n, e) {
  if (!n || typeof n != "object") return "";
  if (n.kind === "sun" && (n.event === "sunrise" || n.event === "sunset")) {
    const i = a(
      e,
      n.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), s = m(n.offset_s) ?? 0;
    if (s === 0) return i;
    const o = s < 0 ? "−" : "+";
    return `${i} ${o} ${ii(s)}`;
  }
  const t = P(n.at) ?? P(n.time);
  return t ? a(e, "trigger.at", { time: t }) : P(n.kind) ?? "";
}
const ni = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, oi = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function ri(n) {
  const e = {}, t = /* @__PURE__ */ new Map(), i = [];
  for (const o of Object.values(n.states)) {
    const r = P(o.attributes.maestro_role);
    if (!r) continue;
    i.push(o.entity_id);
    const l = P(o.attributes.zone_id);
    if (l) {
      let c = t.get(l);
      if (c || (c = {
        zoneId: l,
        name: l,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(l, c)), r === "cycle_enabled")
        c.cycleSwitches.push(o);
      else {
        const _ = oi[r];
        _ && (c[_] = o);
      }
    } else {
      const c = ni[r];
      c && (e[c] = o);
    }
  }
  const s = [...t.values()];
  for (const o of s) {
    const r = o.state?.attributes ?? {};
    o.name = P(r.zone_name) ?? P(o.state?.attributes.friendly_name) ?? o.zoneId, o.order = m(r.order) ?? m(o.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return s.sort(
    (o, r) => o.order - r.order || o.name.localeCompare(r.name)
  ), { found: i.length > 0, hub: e, zones: s, entityIds: i };
}
function ai(n) {
  return !bt(n.state?.attributes?.degraded).some((t) => P(t) === "no_flow_meter");
}
function we(n) {
  return m(n.state?.attributes?.adjustment_pct) ?? 100;
}
function di(n, e, t, i) {
  const s = [];
  for (const o of n)
    for (const r of yt(o))
      r.cycle_id && (o.zoneId === e && r.cycle_id === t || !i && r.curve?.kind === "volume" || s.push({
        value: `${o.zoneId}:${r.cycle_id}`,
        zoneId: o.zoneId,
        programId: r.cycle_id,
        label: `${o.name} / ${r.name ?? r.cycle_id}`
      }));
  return s;
}
function yt(n) {
  const e = bt(n.state?.attributes?.cycles), t = [];
  for (const i of e) {
    if (typeof i != "object" || i === null) continue;
    const s = i, o = {
      cycle_id: P(s.cycle_id),
      name: P(s.name),
      enabled: typeof s.enabled == "boolean" ? s.enabled : void 0,
      trigger: s.trigger ?? void 0,
      curve: s.curve ?? void 0
    }, r = s.calendar;
    r && typeof r == "object" && (o.calendar = r);
    const l = s.season_months;
    Array.isArray(l) && (o.season_months = l.map((_) => m(_)).filter((_) => _ !== void 0)), o.soak_max_run_min = m(s.soak_max_run_min), o.soak_pause_min = m(s.soak_pause_min), o.volume_safety_timeout_min = m(s.volume_safety_timeout_min), o.intensity_pct = m(s.intensity_pct);
    const c = s.day_intensity_pct;
    if (c && typeof c == "object") {
      const _ = {};
      for (const [f, v] of Object.entries(c)) {
        const z = m(v);
        z !== void 0 && (_[f] = z);
      }
      o.day_intensity_pct = _;
    }
    t.push(o);
  }
  return t;
}
function K(n) {
  const e = Math.floor(n), t = n - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function fe(n) {
  if (!Array.isArray(n)) return [];
  const e = [];
  for (const t of n) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const i = m(t[0]), s = m(t[1]);
    i !== void 0 && s !== void 0 && e.push([i, s]);
  }
  return [...e].sort((t, i) => t[0] - i[0]);
}
const ge = 25, li = [5, 12, 20, 25, 30, 35, 40];
function xt(n, e) {
  const t = n[0], i = n[n.length - 1];
  if (!t || !i) return 0;
  if (e <= t[0]) return t[1];
  if (e >= i[0]) return i[1];
  for (let s = 0; s < n.length - 1; s++) {
    const o = n[s], r = n[s + 1];
    if (!o || !r) continue;
    const [l, c] = o, [_, f] = r;
    if (l <= e && e <= _) return c + (f - c) * (e - l) / (_ - l);
  }
  return i[1];
}
function oe(n, e, t = 100, i, s) {
  let o = xt(n, e) * t / 100;
  return i !== void 0 && (o = Math.max(o, i)), s !== void 0 && (o = Math.min(o, s)), o;
}
function ci(n) {
  if (n.length === 0) return "curve_empty";
  for (const e of n)
    if (e[1] < 0) return "curve_negative_value";
  for (let e = 1; e < n.length; e++) {
    const t = n[e - 1], i = n[e];
    if (!(!t || !i) && i[0] <= t[0])
      return "curve_temps_not_increasing";
  }
  return null;
}
const Ae = [0, 1, 2, 3, 4, 5, 6], nt = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
};
function pi(n) {
  return nt[n] ?? nt.en;
}
function $t(n) {
  return !n || Object.keys(n).length === 0;
}
function wt(n, e) {
  return n.day_intensity_pct?.[String(e)] ?? n.intensity_pct ?? 100;
}
function de(n, e) {
  const t = fe(n.curve?.points);
  return K(
    oe(t, ge, wt(n, e), n.curve?.min, n.curve?.max)
  );
}
function ui(n, e, t) {
  const i = fe(n.curve?.points), s = wt(n, e) * t / 100;
  return K(oe(i, ge, s, n.curve?.min, n.curve?.max));
}
function zt(n, e, t, i = 100) {
  const s = fe(n.curve?.points), o = xt(s, ge);
  if (o <= 0) return 0;
  const l = 100 * e / o * i / 100;
  return K(oe(s, t, l, n.curve?.min, n.curve?.max));
}
function _i(n, e, t, i, s, o) {
  if (n !== e) return !0;
  if (n) return i !== t;
  const r = /* @__PURE__ */ new Set([...Object.keys(s), ...Object.keys(o)]);
  for (const l of r)
    if (s[l] !== o[l]) return !0;
  return !1;
}
var hi = Object.defineProperty, mi = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, r; o >= 0; o--)
    (r = n[o]) && (s = r(e, t, s) || s);
  return s && hi(e, t, s), s;
};
const Me = [0, 1, 2, 3, 4, 5, 6], kt = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"], Ee = 1, St = 60;
function _e(n) {
  const e = { mode: "weekdays", days: [...Me] };
  if (!n) return e;
  if (n.mode === "interval") {
    const t = Number(n.interval_days) || Ee;
    return {
      mode: "interval",
      interval_days: Math.min(Math.max(Math.round(t), Ee), St)
    };
  }
  if (n.mode === "parity")
    return { mode: "parity", parity: n.parity === "even" ? "even" : "odd" };
  if (n.mode === "weekdays") {
    const t = [...new Set(n.days ?? [])].sort((i, s) => i - s);
    return t.length === 0 ? e : { mode: "weekdays", days: t };
  }
  return e;
}
function vi(n) {
  const e = _e(n);
  return e.mode === "interval" ? e.interval_days === 1 ? "Ogni giorno" : `Ogni ${e.interval_days} giorni` : e.mode === "parity" ? e.parity === "odd" ? "Giorni dispari" : "Giorni pari" : e.days.length >= 7 ? "Ogni giorno" : e.days.map((t) => kt[t]).join(", ");
}
const je = class je extends A {
  get _value() {
    return _e(this.calendar);
  }
  _emit(e) {
    this.dispatchEvent(
      new CustomEvent("imc-calendar-change", {
        detail: { calendar: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  /** Switching mode replaces the object; nothing carries over. */
  _selectMode(e) {
    this._value.mode !== e && (e === "interval" ? this._emit({ mode: "interval", interval_days: 3 }) : e === "parity" ? this._emit({ mode: "parity", parity: "odd" }) : this._emit({ mode: "weekdays", days: [...Me] }));
  }
  _toggleDay(e) {
    const t = this._value;
    if (t.mode !== "weekdays") return;
    const i = t.days.includes(e) ? t.days.filter((s) => s !== e) : [...t.days, e].sort((s, o) => s - o);
    i.length !== 0 && this._emit({ mode: "weekdays", days: i });
  }
  _setInterval(e) {
    this._emit(_e({ mode: "interval", interval_days: Number(e) }));
  }
  _renderBody(e) {
    return e.mode === "interval" ? d`
        <div class="interval">
          <label for="imc-interval">Ogni</label>
          <input
            id="imc-interval"
            type="number"
            min="${Ee}"
            max="${St}"
            .value=${String(e.interval_days)}
            @change=${(t) => this._setInterval(t.target.value)}
          />
          <span>giorni</span>
        </div>
        <div class="hint">Il conteggio riparte dal giorno in cui il programma ha irrigato.</div>
      ` : e.mode === "parity" ? d`
        <div class="chips">
          ${["odd", "even"].map(
      (t) => d`
              <button
                type="button"
                class="chip"
                aria-pressed=${e.parity === t}
                @click=${() => this._emit({ mode: "parity", parity: t })}
              >
                ${t === "odd" ? "Giorni dispari" : "Giorni pari"}
              </button>
            `
    )}
        </div>
        <div class="hint">Segue il giorno del mese, come le ordinanze comunali pari/dispari.</div>
      ` : d`
      <div class="chips">
        ${Me.map(
      (t) => d`
            <button
              type="button"
              class="chip"
              aria-pressed=${e.days.includes(t)}
              @click=${() => this._toggleDay(t)}
            >
              ${kt[t]}
            </button>
          `
    )}
      </div>
    `;
  }
  render() {
    const e = this._value;
    return d`
      <div class="modes" role="group" aria-label="Modalità del calendario">
        ${[
      ["weekdays", "Giorni della settimana"],
      ["interval", "Ogni N giorni"],
      ["parity", "Pari/dispari"]
    ].map(
      ([i, s]) => d`
            <button
              type="button"
              aria-pressed=${e.mode === i}
              @click=${() => this._selectMode(i)}
            >
              ${s}
            </button>
          `
    )}
      </div>
      ${this._renderBody(e)}
    `;
  }
};
je.styles = N`
    :host {
      display: block;
    }
    .modes {
      display: flex;
      gap: 4px;
      background: var(--secondary-background-color, #f1f1f1);
      border-radius: 10px;
      padding: 4px;
      margin-bottom: 12px;
    }
    .modes button {
      flex: 1;
      border: none;
      background: transparent;
      border-radius: 8px;
      padding: 8px 6px;
      font: inherit;
      font-size: 0.9em;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .modes button[aria-pressed="true"] {
      background: var(--card-background-color, #fff);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .chip {
      border: 1px solid var(--divider-color, #ddd);
      background: transparent;
      border-radius: 999px;
      padding: 6px 12px;
      font: inherit;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .chip[aria-pressed="true"] {
      background: var(--primary-color, #03a9f4);
      border-color: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    .interval {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .interval input {
      width: 5em;
      padding: 8px;
      font: inherit;
      border: 1px solid var(--divider-color, #ddd);
      border-radius: 8px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
    }
    .hint {
      margin-top: 8px;
      font-size: 0.85em;
      color: var(--secondary-text-color, #666);
    }
  `;
let he = je;
mi([
  h({ attribute: !1 })
], he.prototype, "calendar");
F("imc-calendar-editor", he);
const fi = /* @__PURE__ */ new Set(["unavailable", "unknown"]);
function gi(n) {
  return !n || fi.has(n.state) ? { on: !1, available: !1 } : { on: n.state === "on", available: !0 };
}
const bi = N`
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
  .toggle-row[aria-disabled="true"] {
    cursor: default;
    opacity: 0.65;
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
    flex: none;
    transition: background 0.15s ease;
  }
  .switch::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--card-background-color, #fff);
    transition: transform 0.15s ease;
  }
  .switch.on {
    background: var(--primary-color, #03a9f4);
  }
  .switch.on::after {
    transform: translateX(14px);
  }
`;
function At(n, e, t) {
  const { on: i, available: s } = gi(e), o = s ? a(n, i ? "zone.cycle_enabled" : "zone.cycle_disabled") : a(n, "program.toggle_unavailable"), r = () => {
    s && t();
  };
  return d`<div
    class="toggle-row"
    role="switch"
    tabindex=${s ? "0" : "-1"}
    aria-checked=${i ? "true" : "false"}
    aria-disabled=${s ? "false" : "true"}
    @click=${r}
    @keydown=${(l) => {
    (l.key === " " || l.key === "Enter") && (l.preventDefault(), r());
  }}
  >
    <span class="switch ${i ? "on" : ""}"></span>
    <span>${o}</span>
  </div>`;
}
function Mt(n) {
  return [...n].sort((e, t) => e[0] - t[0]);
}
function yi(n, e) {
  const t = n[e];
  if (!t) return n;
  const i = n[e + 1], s = i ? [(t[0] + i[0]) / 2, (t[1] + i[1]) / 2] : [t[0] + 5, t[1]];
  return Mt([...n, s]);
}
function xi(n, e) {
  return n.length <= 1 ? n : n.filter((t, i) => i !== e);
}
function ze(n, e, t, i) {
  const s = [...n];
  return s[e] ? (s[e] = [t, Math.max(0, i)], s) : n;
}
function $i(n, e) {
  return e ? n : void 0;
}
function wi(n) {
  return n.intensity_pct !== void 0 && n.intensity_pct !== 100 ? !0 : Object.keys(n.day_intensity_pct ?? {}).length > 0;
}
function zi(n, e, t) {
  return Math.max(0, K(n - e * t));
}
var ki = Object.defineProperty, O = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, r; o >= 0; o--)
    (r = n[o]) && (s = r(e, t, s) || s);
  return s && ki(e, t, s), s;
};
const ke = 320, R = 170, Q = 34, ot = 12, J = 16, V = 24, rt = 5, at = 40, dt = 2, Re = class Re extends A {
  constructor() {
    super(...arguments), this.language = "en", this.zoneHasFlowMeter = !1, this.zoneAdjustmentPct = 100, this._points = [[ge, 15]], this._min = 1, this._max = 120, this._kind = "duration", this._error = null;
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = fe(e?.points);
    t.length !== 0 && (this._points = t, this._min = m(e?.min) ?? 1, this._max = m(e?.max) ?? 120, this._kind = e?.kind === "volume" ? "volume" : "duration", this._error = null);
  }
  /** The curve's raw shape, as the user is drawing it: unscaled (intensity
   *  100%, no zone adjustment), since saving always resets the program's
   *  intensity to 100% anyway. Drives the graph line and handle positions —
   *  those must track the points being authored, not what any particular
   *  zone will deliver. For that, see `_deliveryValue`. */
  _previewValue(e) {
    return K(oe(this._points, e, 100, this._min, this._max));
  }
  /** What this curve actually delivers IN THIS ZONE: the raw shape times
   *  `zoneAdjustmentPct`, then the clamps — same order as `curve_value`
   *  (`engine/curves.py`) and `previewMinutes`/`dayDelivery`
   *  (schedule-math.ts). Drives the preview tiles and the "today" banner,
   *  which exist to answer "what will this water", not "what shape did I
   *  draw". Saving resets the program's own intensity to 100%, so the only
   *  per-zone factor left to fold in here is the adjustment. */
  _deliveryValue(e) {
    return K(oe(this._points, e, this.zoneAdjustmentPct, this._min, this._max));
  }
  _unit() {
    return a(this.language, this._kind === "volume" ? "curve.unit_volume" : "curve.unit_duration");
  }
  _axisMin() {
    return Math.min(this._points[0]?.[0] ?? rt, rt) - dt;
  }
  _axisMax() {
    const e = this._points[this._points.length - 1];
    return Math.max(e?.[0] ?? at, at) + dt;
  }
  _sx(e) {
    const t = this._axisMin(), i = this._axisMax();
    return Q + (e - t) / (i - t) * (ke - Q - ot);
  }
  _graphTop() {
    return Math.max(12, ...this._points.map((e) => e[1])) + 4;
  }
  _sy(e) {
    const t = this._graphTop();
    return R - V - e / t * (R - J - V);
  }
  /** Client coordinates of a pointer event, converted into the SVG's
   *  viewBox units (0..GRAPH_H on the y-axis). */
  _pointerViewY(e, t, i) {
    const s = e.createSVGPoint();
    return s.x = i.clientX, s.y = i.clientY, s.matrixTransform(t.inverse()).y;
  }
  /**
   * A drag is RELATIVE: the point's raw value at pointerdown, and the
   * pointer's own y at pointerdown, are both captured once and never
   * re-derived from the current pointer position. Every subsequent move
   * only ever applies `dragValue`'s delta to that frozen starting point, so
   * a drag of zero pixels leaves the point byte-identical — even when a
   * min/max clamp has pulled the handle's DRAWN position away from the
   * point's real value (e.g. a floor of 5 drawing a point of 2 at y(5)):
   * grabbing that handle no longer snaps the stored value to wherever it
   * happens to be drawn.
   */
  _startDrag(e, t) {
    t.preventDefault();
    const i = t.currentTarget.ownerSVGElement;
    if (!i) return;
    const s = this._points[e];
    if (!s) return;
    const o = s[1], r = i.getScreenCTM();
    if (!r) return;
    const l = this._pointerViewY(i, r, t), c = this._graphTop() / (R - J - V), _ = (v) => {
      const z = i.getScreenCTM();
      if (!z) return;
      const I = this._pointerViewY(i, z, v) - l;
      this._points = ze(
        this._points,
        e,
        s[0],
        zi(o, I, c)
      ), this._error = null;
    }, f = () => {
      window.removeEventListener("pointermove", _), window.removeEventListener("pointerup", f);
    };
    window.addEventListener("pointermove", _), window.addEventListener("pointerup", f);
  }
  _save() {
    const e = ci(this._points) ?? (this._min > this._max ? "min_above_max" : null) ?? (this._min < 0 ? "negative_clamp" : null);
    if (e) {
      this._error = e;
      return;
    }
    this._error = null;
    const t = $i(this._kind, this.zoneHasFlowMeter);
    this.dispatchEvent(
      new CustomEvent("imc-curve-save", {
        detail: {
          cycleId: this.cycle?.cycle_id ?? "",
          points: this._points.map((i) => [i[0], i[1]]),
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
      <div class="title">${a(e, "editor.title")}</div>

      ${this._renderIntensityNotice(e)}

      <div class="graph-box">
        <div class="caption">${a(e, "editor.graph.caption")}</div>
        ${this._renderGraph(e)}
      </div>

      <div class="caption">${a(e, "editor.preview_title")}</div>
      <div class="examples">
        ${li.map((t) => this._exampleTile(`${t}°`, this._deliveryValue(t)))}
      </div>

      ${this._renderToday(e)}

      <div class="points-title">${a(e, "editor.points_title")}</div>
      ${this._points.map((t, i) => this._renderPointRow(t, i, e))}

      ${this.zoneHasFlowMeter ? this._renderKind(e) : u}

      <div class="limits">
        <div class="limit">
          <label>${a(e, "editor.min.label")}</label>
          <div class="help">${a(e, "editor.min.help")}</div>
          <input type="number" min="0" .value=${String(this._min)}
            @input=${(t) => {
      const i = Number(t.target.value);
      Number.isNaN(i) || (this._min = i, this._error = null);
    }} /> ${this._unit()}
        </div>
        <div class="limit">
          <label>${a(e, "editor.max.label")}</label>
          <div class="help">${a(e, "editor.max.help")}</div>
          <input type="number" min="0" .value=${String(this._max)}
            @input=${(t) => {
      const i = Number(t.target.value);
      Number.isNaN(i) || (this._max = i, this._error = null);
    }} /> ${this._unit()}
        </div>
      </div>

      ${this._error ? d`<div class="error">${ei(e, "editor", this._error)}</div>` : u}

      <div class="buttons">
        <button class="primary" @click=${this._save}>${a(e, "editor.save")}</button>
        <button @click=${this._cancel}>${a(e, "editor.cancel")}</button>
      </div>
    `;
  }
  _renderIntensityNotice(e) {
    return wi(this.cycle ?? {}) ? d`<div class="intensity-notice">
      ${a(e, "editor.intensity_reset")}
    </div>` : u;
  }
  _renderKind(e) {
    return d`<div class="kind">
      <label for="imc-curve-kind">${a(e, "editor.kind_label")}</label>
      <select
        id="imc-curve-kind"
        .value=${this._kind}
        @change=${(t) => {
      const i = t.target.value;
      this._kind = i === "volume" ? "volume" : "duration";
    }}
      >
        <option value="duration">${a(e, "editor.kind_duration")}</option>
        <option value="volume">${a(e, "editor.kind_volume")}</option>
      </select>
    </div>`;
  }
  _exampleTile(e, t) {
    return d`<div class="example"><div class="lbl">${e}</div><div class="num">${t} ${this._unit()}</div></div>`;
  }
  _renderToday(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return u;
    const i = this._deliveryValue(t);
    return d`<div class="today-banner">${a(e, "editor.today", {
      temp: Math.round(t),
      value: i,
      unit: this._unit()
    })}</div>`;
  }
  _renderPointRow(e, t, i) {
    return d`<div class="point-row">
      <input
        type="number"
        step="0.5"
        .value=${String(e[0])}
        aria-label=${a(i, "editor.point_temp")}
        @change=${(s) => this._editPoint(t, s, "temp")}
      /> °C
      <input
        type="number"
        min="0"
        step="1"
        .value=${String(e[1])}
        aria-label=${a(i, "editor.point_value")}
        @change=${(s) => this._editPoint(t, s, "value")}
      /> ${this._unit()}
      <button
        type="button"
        ?disabled=${this._points.length <= 1}
        title=${a(i, "editor.point_remove")}
        @click=${() => this._points = xi(this._points, t)}
      >
        ✕
      </button>
      <button
        type="button"
        title=${a(i, "editor.point_add")}
        @click=${() => this._points = yi(this._points, t)}
      >
        ＋
      </button>
    </div>`;
  }
  _editPoint(e, t, i) {
    const s = Number(t.target.value);
    if (Number.isNaN(s)) return;
    const o = this._points[e];
    if (!o) return;
    const r = i === "temp" ? ze(this._points, e, s, o[1]) : ze(this._points, e, o[0], s);
    this._points = Mt(r), this._error = null;
  }
  _renderGraph(e) {
    const t = this._axisMin(), i = this._axisMax(), s = [];
    for (let c = t; c <= i; c += 1)
      s.push([this._sx(c), this._sy(this._previewValue(c))]);
    const o = s.map((c, _) => `${_ === 0 ? "M" : "L"}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(" "), r = this.weightedTemp, l = r !== void 0 && !Number.isNaN(r) && r >= t && r <= i;
    return xe`
      <svg viewBox="0 0 ${ke} ${R}">
        <line class="axis" x1=${Q} y1=${J} x2=${Q} y2=${R - V}></line>
        <line class="axis" x1=${Q} y1=${R - V} x2=${ke - ot} y2=${R - V}></line>
        ${l ? xe`<line class="today" x1=${this._sx(r)} y1=${J} x2=${this._sx(r)} y2=${R - V}></line>
              <text class="today-text" x=${this._sx(r)} y=${J - 4} text-anchor="middle">${a(e, "editor.graph.today", { temp: Math.round(r) })}</text>` : u}
        <path class="curve" d=${o}></path>
        ${this._points.map(
      (c, _) => xe`<circle class="handle" r="7"
            cx=${this._sx(c[0]).toFixed(1)} cy=${this._sy(this._previewValue(c[0])).toFixed(1)}
            @pointerdown=${(f) => this._startDrag(_, f)}></circle>`
    )}
      </svg>
    `;
  }
};
Re.styles = N`
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
let M = Re;
O([
  h()
], M.prototype, "language");
O([
  h({ attribute: !1 })
], M.prototype, "cycle");
O([
  h({ attribute: !1 })
], M.prototype, "weightedTemp");
O([
  h({ type: Boolean })
], M.prototype, "zoneHasFlowMeter");
O([
  h({ type: Number })
], M.prototype, "zoneAdjustmentPct");
O([
  p()
], M.prototype, "_points");
O([
  p()
], M.prototype, "_min");
O([
  p()
], M.prototype, "_max");
O([
  p()
], M.prototype, "_kind");
O([
  p()
], M.prototype, "_error");
F("imc-curve-editor", M);
var Si = Object.defineProperty, y = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, r; o >= 0; o--)
    (r = n[o]) && (s = r(e, t, s) || s);
  return s && Si(e, t, s), s;
};
const Ai = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic"
];
function Mi(n, e) {
  return n.includes(e) ? n.filter((t) => t !== e) : [...n, e].sort((t, i) => t - i);
}
function Ei(n) {
  const e = {};
  return n.soakMaxRunMin !== void 0 && (e.soak_max_run_min = n.soakMaxRunMin), n.soakPauseMin !== void 0 && (e.soak_pause_min = n.soakPauseMin), n.volumeSafetyTimeoutMin !== void 0 && (e.volume_safety_timeout_min = n.volumeSafetyTimeoutMin), e;
}
const Se = 15, lt = 1, ct = 1440, Ci = -360, Pi = 360, Ti = 5, Le = class Le extends A {
  constructor() {
    super(...arguments), this.zoneId = "", this.zoneHasFlowMeter = !1, this.zoneAdjustmentPct = 100, this.allZones = [], this._calendar = { mode: "weekdays", days: [...Ae] }, this._seasonMonths = [], this._startKind = "time", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._uniformMinutes = Se, this._dayMinutes = {}, this._sameForAll = !0, this._advancedOpen = !1, this._advanced = {}, this._seededUniformMinutes = Se, this._seededDayMinutes = {}, this._seededSameForAll = !0;
  }
  /**
   * Volume-mode programs (liters, edited via the curve editor's
   * amount/heat controls) have no minutes to save here — `amount`/`heat`
   * come back null for them. Duration steppers + weather preview only make
   * sense for a "duration" curve.
   */
  /** Weekdays the per-day duration editor should offer.
  
     * Only the weekday mode pins runs to particular weekdays; an interval or
     * parity program can land on any of them.
     */
  get _activeDays() {
    return this._calendar.mode === "weekdays" ? this._calendar.days : [...Ae];
  }
  get _isVolume() {
    return this.cycle?.curve?.kind === "volume";
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId ? (this._seededCycleId = t, this._seedFromCycle()) : this._curveSignature(this.cycle) !== this._seededCurveSignature && this._seedMinutesFromCycle();
    }
  }
  /** Fields of `cycle` that affect what a minutes stepper should show —
   *  used to detect a curve save/copy landing while this editor is open
   *  (see `willUpdate`). Not a general equality check: only what
   *  `_seedMinutesFromCycle` reads. */
  _curveSignature(e) {
    return JSON.stringify([
      e?.curve?.points,
      e?.curve?.min,
      e?.curve?.max,
      e?.curve?.kind,
      e?.intensity_pct,
      e?.day_intensity_pct
    ]);
  }
  _seedFromCycle() {
    const e = this.cycle;
    if (!e) return;
    this._calendar = _e(e.calendar), this._advanced = {
      soakMaxRunMin: e.soak_max_run_min,
      soakPauseMin: e.soak_pause_min,
      volumeSafetyTimeoutMin: e.volume_safety_timeout_min
    }, this._seasonMonths = [...e.season_months ?? []];
    const t = e.trigger;
    t?.kind === "sun" ? (this._startKind = "sun", this._startEvent = t.event === "sunset" ? "sunset" : "sunrise", this._startOffsetMin = Math.round((m(t.offset_s) ?? 0) / 60)) : (this._startKind = "time", this._startEvent = "sunrise", this._startOffsetMin = 0), this._startAt = t?.at ?? t?.time ?? "06:00", this._seedMinutesFromCycle();
  }
  /**
   * Seeds the minutes-editing state (uniform value, per-day map, and which
   * mode is in force) from the current `cycle`, and records that state as
   * the seed for `minutesChanged` to compare against in `_save`. Split out
   * from `_seedFromCycle` so a curve save/copy can refresh just this part
   * without disturbing calendar/season/start edits in progress.
   */
  _seedMinutesFromCycle() {
    const e = this.cycle;
    e && (this._seededCurveSignature = this._curveSignature(e), this._uniformMinutes = e.curve ? de({ curve: e.curve, intensity_pct: e.intensity_pct }, 0) : Se, this._dayMinutes = e.day_intensity_pct ? Object.fromEntries(
      Object.keys(e.day_intensity_pct).map((t) => [t, de(e, Number(t))])
    ) : {}, this._sameForAll = $t(e.day_intensity_pct), this._seededUniformMinutes = this._uniformMinutes, this._seededDayMinutes = this._buildDayMinutes(), this._seededSameForAll = this._sameForAll);
  }
  render() {
    const e = this.cycle;
    if (!e) return d``;
    const t = x(this.hass), i = pi(t);
    return d`
      ${At(t, this.cycleSwitch, () => this._onToggleEnabled())}

      <div class="section-label">${a(t, "program_editor.calendar")}</div>
      <imc-calendar-editor
        .calendar=${this._calendar}
        @imc-calendar-change=${(s) => this._calendar = s.detail.calendar}
      ></imc-calendar-editor>

      <div class="section-label">${a(t, "program_editor.season")}</div>
      <div class="days">
        ${Ai.map(
      (s, o) => d`
            <div
              class="day ${this._seasonMonths.includes(o + 1) ? "on" : ""}"
              @click=${() => this._seasonMonths = Mi(this._seasonMonths, o + 1)}
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
        ${this._startKind === "time" ? d`<input
              type="time"
              class="timebox"
              .value=${this._startAt}
              @input=${(s) => this._startAt = s.target.value}
            />` : this._stepper(this._startOffsetMin, (s) => this._startOffsetMin = s, {
      min: Ci,
      max: Pi,
      step: Ti,
      suffix: "min",
      signed: !0
    })}
      </div>

      ${this._isVolume ? d`<div class="volume-note">${a(t, "editor.volume_note")}</div>` : d`
            <div class="section-label">${a(t, "program_editor.duration_per_day")}</div>
            ${this._renderDurations(t, i)}
            <div class="same-row" @click=${() => this._sameForAll = !this._sameForAll}>
              <span class="switch ${this._sameForAll ? "on" : ""}"></span>
              ${a(t, "program_editor.same_duration")}
            </div>

            ${this._renderAdjustmentNote(t)}
            ${this._renderWeatherLine(t, e)}
          `}

      <div
        class="section-label advanced-toggle"
        @click=${() => this._advancedOpen = !this._advancedOpen}
      >
        ${this._advancedOpen ? "▾" : "▸"} ${a(t, "panel.advanced")}
      </div>
      ${this._advancedOpen ? this._renderAdvanced(t) : u}

      <div class="buttons">
        <button class="primary" @click=${this._save}>
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
    return d`
      <div class="section-label">${a(e, "program_editor.soak_max_run")}</div>
      <input
        class="field"
        type="number"
        min="1"
        .value=${this._advanced.soakMaxRunMin ?? ""}
        @input=${(t) => this._advanced = {
      ...this._advanced,
      soakMaxRunMin: m(t.target.value)
    }}
      />
      <div class="hint">${a(e, "program_editor.soak_max_run_hint")}</div>

      <div class="section-label">${a(e, "program_editor.soak_pause")}</div>
      <input
        class="field"
        type="number"
        min="0"
        .value=${this._advanced.soakPauseMin ?? ""}
        @input=${(t) => this._advanced = {
      ...this._advanced,
      soakPauseMin: m(t.target.value)
    }}
      />
      <div class="hint">${a(e, "program_editor.soak_pause_hint")}</div>

      ${this._isVolume ? d`
            <div class="section-label">
              ${a(e, "program_editor.volume_safety_timeout")}
            </div>
            <input
              class="field"
              type="number"
              min="1"
              .value=${this._advanced.volumeSafetyTimeoutMin ?? ""}
              @input=${(t) => this._advanced = {
      ...this._advanced,
      volumeSafetyTimeoutMin: m(t.target.value)
    }}
            />
            <div class="hint">
              ${a(e, "program_editor.volume_safety_timeout_hint")}
            </div>
          ` : u}

      <div class="section-label">${a(e, "panel.heat_response")}</div>
      ${this._renderCopyCurve(e)}
      <imc-curve-editor
        .cycle=${this.cycle}
        .weightedTemp=${this.weightedTemp}
        .language=${x(this.hass)}
        .zoneHasFlowMeter=${this.zoneHasFlowMeter}
        .zoneAdjustmentPct=${this.zoneAdjustmentPct}
        @imc-curve-save=${this._onCurveSave}
        @imc-curve-cancel=${() => this._advancedOpen = !1}
      ></imc-curve-editor>
    `;
  }
  /**
   * "Copy curve from…": every other program, across every zone, offered by
   * `buildCopyCandidates` (see its doc comment for the two things it
   * already leaves out). Picking one dispatches `imc-curve-copy`
   * immediately — there is no separate confirm step, mirroring how
   * `imc-curve-save` itself is a one-shot action — and the `<select>` is
   * reset back to its placeholder right after so the same source can be
   * picked again (e.g. after tweaking something and wanting a fresh copy).
   */
  _renderCopyCurve(e) {
    const t = this.cycle?.cycle_id ?? "", i = di(
      this.allZones,
      this.zoneId,
      t,
      this.zoneHasFlowMeter
    );
    return i.length === 0 ? d`
        <label class="copy-label">${a(e, "curve.copy_from")}</label>
        <div class="hint">${a(e, "curve.copy_error")}</div>
      ` : d`
      <label class="copy-label">${a(e, "curve.copy_from")}</label>
      <select class="timebox copy-select" @change=${this._onCopyCurve}>
        <option value="" selected>${a(e, "curve.copy_placeholder")}</option>
        ${i.map(
      (s) => d`<option value=${s.value}>${s.label}</option>`
    )}
      </select>
    `;
  }
  _onCopyCurve(e) {
    const t = e.target, i = t.value, s = this.cycle?.cycle_id;
    if (!i || !s) return;
    const o = i.indexOf(":");
    o < 0 || (this.dispatchEvent(
      new CustomEvent("imc-curve-copy", {
        detail: {
          zoneId: this.zoneId,
          programId: s,
          sourceZoneId: i.slice(0, o),
          sourceProgramId: i.slice(o + 1)
        },
        bubbles: !0,
        composed: !0
      })
    ), t.value = "");
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
    return this._sameForAll ? d`<div class="duration-row">
        ${this._stepper(this._uniformMinutes, (s) => this._uniformMinutes = s, {
      min: lt,
      max: ct,
      step: 1,
      suffix: i
    })}
      </div>` : d`${this._activeDays.map((s) => {
      const o = this._dayMinutes[String(s)] ?? de(this.cycle ?? {}, s);
      return d`<div class="duration-row">
        <span class="dname">${t[s] ?? ""}</span>
        ${this._stepper(
        o,
        (r) => this._dayMinutes = { ...this._dayMinutes, [String(s)]: r },
        { min: lt, max: ct, step: 1, suffix: i }
      )}
      </div>`;
    })}`;
  }
  _stepper(e, t, i) {
    const s = i.signed && e > 0 ? "+" : "";
    return d`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(ue(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${s}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(ue(e + i.step, i.min, i.max))}
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
    if (!this._activeDays.includes(s))
      return d`<div class="weather">${a(e, "reason.calendar_not_today")}</div>`;
    const o = this._sameForAll ? this._uniformMinutes : this._dayMinutes[String(s)] ?? this._uniformMinutes, r = zt(t, o, i, this.zoneAdjustmentPct), l = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    });
    return d`<div class="weather">
      ${a(e, "panel.weather_line", { day: l, min: r })}
    </div>`;
  }
  /**
   * When the zone's adjustment isn't a no-op, the stepper above shows the
   * SETTING (pre-adjustment) while the weather line and the program list
   * (program-list.ts) show DELIVERY — a zone at 70% displays 20 min on the
   * stepper and ≈14 min everywhere delivery is shown. Without this line
   * that split looks like a bug; this is the one place both figures are
   * visible together, so it is where the split gets explained.
   */
  _renderAdjustmentNote(e) {
    return this.zoneAdjustmentPct === 100 ? u : d`<div class="adjustment-note">
      ${a(e, "program_editor.zone_adjustment_note", { pct: this.zoneAdjustmentPct })}
    </div>`;
  }
  _buildDayMinutes() {
    const e = {};
    for (const t of this._activeDays)
      e[String(t)] = this._dayMinutes[String(t)] ?? de(this.cycle ?? {}, t);
    return e;
  }
  /** Reuses `imc-program-toggle`, so the panel needs no new plumbing. */
  _onToggleEnabled() {
    const e = this.cycleSwitch;
    !e || !this.cycle?.cycle_id || this.dispatchEvent(
      new CustomEvent("imc-program-toggle", {
        detail: {
          zoneId: this.zoneId,
          programId: this.cycle.cycle_id,
          entityId: e.entity_id,
          enabled: e.state !== "on"
        },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _save() {
    const e = this.zoneId, t = this.cycle?.cycle_id ?? "", i = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin };
    this.dispatchEvent(
      new CustomEvent("imc-program-save-schedule", {
        detail: {
          zoneId: e,
          programId: t,
          calendar: this._calendar,
          seasonMonths: this._seasonMonths.length ? [...this._seasonMonths].sort((l, c) => l - c) : void 0,
          start: i
        },
        bubbles: !0,
        composed: !0
      })
    );
    const s = Ei(this._advanced);
    if (Object.keys(s).length > 0 && this.dispatchEvent(
      new CustomEvent("imc-program-save-advanced", {
        detail: { zoneId: e, programId: t, patch: s },
        bubbles: !0,
        composed: !0
      })
    ), this._isVolume) return;
    const o = this._buildDayMinutes();
    if (!_i(
      this._sameForAll,
      this._seededSameForAll,
      this._seededUniformMinutes,
      this._uniformMinutes,
      this._seededDayMinutes,
      o
    ))
      return;
    const r = this._sameForAll ? { zoneId: e, programId: t, minutes: this._uniformMinutes } : { zoneId: e, programId: t, dayMinutes: o };
    this.dispatchEvent(
      new CustomEvent("imc-program-save-minutes", {
        detail: r,
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
Le.styles = N`
    ${bi}
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
    .adjustment-note {
      margin-top: 10px;
      font-size: 12.5px;
      opacity: 0.8;
      font-style: italic;
    }
    .hint {
      margin-top: 10px;
      font-size: 12px;
      color: var(--error-color, #db4437);
    }
    .copy-label {
      display: block;
      font-size: 12px;
      color: var(--secondary-text-color, #aab);
      margin-bottom: 4px;
    }
    .copy-select {
      width: 100%;
      box-sizing: border-box;
      margin-bottom: 4px;
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
let g = Le;
y([
  h({ attribute: !1 })
], g.prototype, "hass");
y([
  h({ attribute: !1 })
], g.prototype, "cycleSwitch");
y([
  h()
], g.prototype, "zoneId");
y([
  h({ attribute: !1 })
], g.prototype, "cycle");
y([
  h({ attribute: !1 })
], g.prototype, "weightedTemp");
y([
  h({ type: Boolean })
], g.prototype, "zoneHasFlowMeter");
y([
  h({ type: Number })
], g.prototype, "zoneAdjustmentPct");
y([
  h({ attribute: !1 })
], g.prototype, "allZones");
y([
  p()
], g.prototype, "_calendar");
y([
  p()
], g.prototype, "_seasonMonths");
y([
  p()
], g.prototype, "_startKind");
y([
  p()
], g.prototype, "_startAt");
y([
  p()
], g.prototype, "_startEvent");
y([
  p()
], g.prototype, "_startOffsetMin");
y([
  p()
], g.prototype, "_uniformMinutes");
y([
  p()
], g.prototype, "_dayMinutes");
y([
  p()
], g.prototype, "_sameForAll");
y([
  p()
], g.prototype, "_advancedOpen");
y([
  p()
], g.prototype, "_advanced");
F("imc-program-editor", g);
var Ii = Object.defineProperty, T = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, r; o >= 0; o--)
    (r = n[o]) && (s = r(e, t, s) || s);
  return s && Ii(e, t, s), s;
};
const Ce = 15, Ni = 8, Oi = 1, Di = 60, Fi = {
  curve: {
    points: [
      [12, 5],
      [25, Ce],
      [35, Ce + Ni]
    ],
    min: Oi,
    max: Di
  }
}, ji = 1, Ri = 1440, Li = -360, Ui = 360, Vi = 5, Ue = class Ue extends A {
  constructor() {
    super(...arguments), this.zoneId = "", this.zoneAdjustmentPct = 100, this._step = 1, this._calendar = { mode: "weekdays", days: [...Ae] }, this._startKind = "sun", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._minutes = Ce;
  }
  render() {
    const e = x(this.hass);
    return d`
      <div class="head">
        <span class="title">${this._stepTitle(e)}</span>
        <button class="close" @click=${this._cancel} aria-label=${a(e, "editor.cancel")}>
          ✕
        </button>
      </div>
      <div class="dots">
        ${[1, 2, 3].map(
      (t) => d`<span class="dot ${this._step === t ? "on" : ""}"></span>`
    )}
      </div>
      ${this._step === 1 ? this._renderStep1(e) : u}
      ${this._step === 2 ? this._renderStep2(e) : u}
      ${this._step === 3 ? this._renderStep3(e) : u}
      <div class="buttons">
        ${this._step > 1 ? d`<button @click=${this._back}>${a(e, "wizard.back")}</button>` : d`<button @click=${this._cancel}>${a(e, "editor.cancel")}</button>`}
        ${this._step < 3 ? d`<button
              class="primary"
              @click=${this._next}
            >
              ${a(e, "wizard.next")}
            </button>` : d`<button
              class="primary"
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
    return d`
      <imc-calendar-editor
        .calendar=${this._calendar}
        @imc-calendar-change=${(t) => this._calendar = t.detail.calendar}
      ></imc-calendar-editor>
    `;
  }
  _renderStep2(e) {
    return d`
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
      ${this._startKind === "time" ? d`<input
            type="time"
            class="timebox"
            .value=${this._startAt}
            @input=${(t) => this._startAt = t.target.value}
          />` : d`<div class="offset-row">
            ${this._stepper(this._startOffsetMin, (t) => this._startOffsetMin = t, {
      min: Li,
      max: Ui,
      step: Vi,
      suffix: "min",
      signed: !0
    })}
          </div>`}
    `;
  }
  _renderStep3(e) {
    const t = a(e, "curve.unit_duration");
    return d`
      <div class="stepper-row">
        ${this._stepper(this._minutes, (i) => this._minutes = i, {
      min: ji,
      max: Ri,
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
    }), s = zt(Fi, this._minutes, t, this.zoneAdjustmentPct);
    return d`<div class="done">
      ${a(e, "wizard.done_prefix")}
      ${a(e, "panel.weather_line", { day: i, min: s })}
    </div>`;
  }
  _stepper(e, t, i) {
    const s = i.signed && e > 0 ? "+" : "";
    return d`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(ue(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${s}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(ue(e + i.step, i.min, i.max))}
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
    this._step < 3 && (this._step = this._step + 1);
  }
  _finish() {
    const e = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin };
    this.dispatchEvent(
      new CustomEvent("imc-wizard-finish", {
        detail: {
          zoneId: this.zoneId,
          calendar: this._calendar,
          start: e,
          minutes: this._minutes
        },
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
Ue.styles = N`
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
let S = Ue;
T([
  h({ attribute: !1 })
], S.prototype, "hass");
T([
  h()
], S.prototype, "zoneId");
T([
  h({ attribute: !1 })
], S.prototype, "weightedTemp");
T([
  h({ type: Number })
], S.prototype, "zoneAdjustmentPct");
T([
  p()
], S.prototype, "_step");
T([
  p()
], S.prototype, "_calendar");
T([
  p()
], S.prototype, "_startKind");
T([
  p()
], S.prototype, "_startAt");
T([
  p()
], S.prototype, "_startEvent");
T([
  p()
], S.prototype, "_startOffsetMin");
T([
  p()
], S.prototype, "_minutes");
F("imc-program-wizard", S);
var Wi = Object.defineProperty, X = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, r; o >= 0; o--)
    (r = n[o]) && (s = r(e, t, s) || s);
  return s && Wi(e, t, s), s;
};
const Ve = class Ve extends A {
  constructor() {
    super(...arguments), this.allZones = [], this._wizardOpen = !1;
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
    if (!e || !t) return d``;
    const i = x(e), s = yt(t);
    return d`
      ${s.length === 0 ? d`<div class="meta">${a(i, "panel.no_programs")}</div>` : this._renderCycles(i, e, t, s)}
      ${this._renderAddProgram(i, e, t)}
    `;
  }
  _renderAddProgram(e, t, i) {
    return d`
      <div class="add-row">
        ${this._wizardOpen ? d`<imc-program-wizard
              .hass=${t}
              .zoneId=${i.zoneId}
              .weightedTemp=${this.weightedTemp}
              .zoneAdjustmentPct=${we(i)}
              @imc-wizard-finish=${() => this._wizardOpen = !1}
              @imc-wizard-cancel=${() => this._wizardOpen = !1}
            ></imc-program-wizard>` : d`<button class="add-btn" @click=${() => this._wizardOpen = !0}>
              ＋ ${a(e, "panel.add_program")}
            </button>`}
      </div>
    `;
  }
  _renderCycles(e, t, i, s) {
    return d`${s.map((o) => {
      const r = !!o.cycle_id && this._editingId === o.cycle_id, l = o.cycle_id ? this._findCycleSwitch(i, o.cycle_id) : void 0;
      return l?.state, d`
        <div class="prog">
          <div class="name">${o.name ?? o.cycle_id}</div>
          <div class="days">${vi(o.calendar)}</div>
          <div class="meta">
            ${si(o.trigger, e)} · ${this._minutesSummary(e, i, o)}
          </div>
          ${At(e, l, () => {
        l && this._onToggle(i.zoneId, o, l);
      })}
          ${o.cycle_id ? d`<div class="actions">
                <button
                  class="link-btn"
                  @click=${() => this._editingId = r ? void 0 : o.cycle_id}
                >
                  ${a(e, "panel.edit_program")}
                </button>
                <button class="link-btn" @click=${() => this._onRename(e, i.zoneId, o)}>
                  ${a(e, "panel.rename_program")}
                </button>
                <button class="link-btn" @click=${() => this._onDuplicate(i.zoneId, o)}>
                  ${a(e, "program.duplicate")}
                </button>
                <button
                  class="link-btn danger"
                  @click=${() => this._onDelete(e, i.zoneId, o)}
                >
                  ${a(e, "panel.delete_program")}
                </button>
              </div>` : u}
          ${r ? d`<imc-program-editor
                .hass=${t}
                .zoneId=${i.zoneId}
                .cycle=${o}
                .cycleSwitch=${l}
                .weightedTemp=${this.weightedTemp}
                .zoneHasFlowMeter=${ai(i)}
                .zoneAdjustmentPct=${we(i)}
                .allZones=${this.allZones}
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
    return e.cycleSwitches.find((i) => P(i.attributes.cycle_id) === t);
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
  _onRename(e, t, i) {
    if (!i.cycle_id) return;
    const s = i.name ?? "", o = window.prompt(a(e, "panel.rename_program"), s);
    if (o === null) return;
    const r = o.trim();
    !r || r === s || this._dispatch("imc-program-rename", {
      zoneId: t,
      programId: i.cycle_id,
      name: r
    });
  }
  _onDuplicate(e, t) {
    t.cycle_id && this._dispatch("imc-program-duplicate", {
      zoneId: e,
      programId: t.cycle_id
    });
  }
  _onDelete(e, t, i) {
    if (!i.cycle_id) return;
    const s = i.name ?? i.cycle_id;
    window.confirm(a(e, "panel.confirm_delete_program", { name: s })) && this._dispatch("imc-program-remove", { zoneId: t, programId: i.cycle_id });
  }
  /**
   * The user explicitly decided this line shows DELIVERY, not the SETTING
   * the program editor's stepper seeds from: this list is describing what
   * actually gets watered in this zone, factoring in its `adjustment_pct`
   * (see `dayDelivery` in schedule-math.ts and the split documented on
   * `dayBase` there).
   */
  _minutesSummary(e, t, i) {
    if (!$t(i.day_intensity_pct))
      return a(e, "panel.per_day_minutes");
    const s = i.curve?.kind === "volume" ? void 0 : ui(i, 0, we(t));
    return a(e, "panel.minutes_value", { min: s ?? "?" });
  }
};
Ve.styles = N`
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
let D = Ve;
X([
  h({ attribute: !1 })
], D.prototype, "hass");
X([
  h({ attribute: !1 })
], D.prototype, "zone");
X([
  h({ attribute: !1 })
], D.prototype, "weightedTemp");
X([
  h({ attribute: !1 })
], D.prototype, "allZones");
X([
  p()
], D.prototype, "_editingId");
X([
  p()
], D.prototype, "_wizardOpen");
F("imc-program-list", D);
var Zi = Object.defineProperty, be = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, r; o >= 0; o--)
    (r = n[o]) && (s = r(e, t, s) || s);
  return s && Zi(e, t, s), s;
};
function Bi() {
  return typeof customElements < "u" && !!customElements.get("ha-selector");
}
const We = class We extends A {
  constructor() {
    super(...arguments), this.selector = { entity: {} }, this.value = "", this.label = "";
  }
  _emit(e) {
    this.value = e, this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: e }, bubbles: !0, composed: !0 })
    );
  }
  render() {
    return Bi() ? d`<ha-selector
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
We.styles = N`
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
let B = We;
be([
  h({ attribute: !1 })
], B.prototype, "hass");
be([
  h({ attribute: !1 })
], B.prototype, "selector");
be([
  h()
], B.prototype, "value");
be([
  h()
], B.prototype, "label");
F("imc-entity-picker", B);
var Hi = Object.defineProperty, E = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, r; o >= 0; o--)
    (r = n[o]) && (s = r(e, t, s) || s);
  return s && Hi(e, t, s), s;
};
const Ze = class Ze extends A {
  constructor() {
    super(...arguments), this._name = "", this._valve = "", this._flowSensor = "", this._compatibilityGroup = "", this._advancedOpen = !1;
  }
  willUpdate(e) {
    (e.has("zone") || e.has("zoneId")) && this.zoneId !== this._seededZoneId && (this._seededZoneId = this.zoneId, this._seedFromZone());
  }
  _seedFromZone() {
    const e = this.zone;
    this._name = e?.name ?? "", this._valve = e?.valve_entity ?? "", this._areaM2 = e?.area_m2, this._flowSensor = e?.flow_sensor ?? "", this._nominalFlowLpm = e?.nominal_flow_lpm, this._flowTolerancePct = e?.flow_tolerance_pct, this._adjustmentPct = e?.adjustment_pct, this._order = e?.order, this._compatibilityGroup = e?.compatibility_group ?? "", this._advancedOpen = !1;
  }
  get _canSave() {
    return this._name.trim() !== "" && this._valve.trim() !== "";
  }
  render() {
    const e = x(this.hass), t = !!this.zone;
    return d`
      <div class="header">${a(e, t ? "zone.edit" : "zone.add")}</div>

      <div class="section-label">${a(e, "zone.field_name")}</div>
      <input
        class="field"
        type="text"
        .value=${this._name}
        @input=${(i) => this._name = i.target.value}
      />

      <div class="section-label">${a(e, "zone.field_valve")}</div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${{ entity: { domain: ["valve", "switch"] } }}
        .value=${this._valve}
        .label=${a(e, "zone.field_valve")}
        @value-changed=${(i) => this._valve = i.detail.value}
      ></imc-entity-picker>

      <div class="section-label">${a(e, "zone.field_area")}</div>
      <input
        class="field"
        type="number"
        min="0"
        step="0.1"
        .value=${this._areaM2 ?? ""}
        @input=${(i) => this._areaM2 = m(i.target.value)}
      />
      ${t ? d`
            <div
              class="section-label advanced-toggle"
              @click=${() => this._advancedOpen = !this._advancedOpen}
            >
              ${this._advancedOpen ? "▾" : "▸"} ${a(e, "zone.advanced")}
            </div>
            ${this._advancedOpen ? this._renderAdvanced(e) : u}
          ` : u}

      <div class="buttons">
        ${t ? d`<button class="danger" type="button" @click=${this._remove}>
              🗑 ${a(e, "zone.delete")}
            </button>` : u}
        <button type="button" @click=${this._cancel}>${a(e, "editor.cancel")}</button>
        <button
          class="primary"
          type="button"
          ?disabled=${!this._canSave}
          @click=${this._save}
        >
          ${a(e, "editor.save")}
        </button>
      </div>
    `;
  }
  _renderAdvanced(e) {
    return d`
      <div class="section-label">${a(e, "zone.field_flow_sensor")}</div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${{ entity: { domain: "sensor" } }}
        .value=${this._flowSensor}
        .label=${a(e, "zone.field_flow_sensor")}
        @value-changed=${(t) => this._flowSensor = t.detail.value}
      ></imc-entity-picker>

      <div class="section-label">${a(e, "zone.field_flow_nominal")}</div>
      <input
        class="field"
        type="number"
        min="0"
        step="0.1"
        .value=${this._nominalFlowLpm ?? ""}
        @input=${(t) => this._nominalFlowLpm = m(t.target.value)}
      />

      <div class="section-label">${a(e, "zone.field_flow_tolerance")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="100"
        step="1"
        .value=${this._flowTolerancePct ?? ""}
        @input=${(t) => this._flowTolerancePct = m(t.target.value)}
      />

      <div class="section-label">${a(e, "zone.field_adjustment")}</div>
      <input
        class="field"
        type="number"
        min="10"
        max="300"
        step="1"
        .value=${this._adjustmentPct ?? ""}
        @input=${(t) => this._adjustmentPct = m(t.target.value)}
      />

      <div class="section-label">${a(e, "zone.field_order")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="1000"
        step="1"
        .value=${this._order ?? ""}
        @input=${(t) => this._order = m(t.target.value)}
      />

      <div class="section-label">${a(e, "zone.field_group")}</div>
      <input
        class="field"
        type="text"
        .value=${this._compatibilityGroup}
        @input=${(t) => this._compatibilityGroup = t.target.value}
      />
    `;
  }
  _save() {
    if (!this._canSave) return;
    const e = !!this.zone, t = {
      name: this._name.trim(),
      valve_entity: this._valve.trim()
    };
    this._areaM2 !== void 0 && (t.area_m2 = this._areaM2), e && (this._flowSensor.trim() !== "" && (t.flow_sensor = this._flowSensor.trim()), this._nominalFlowLpm !== void 0 && (t.nominal_flow_lpm = this._nominalFlowLpm), this._flowTolerancePct !== void 0 && (t.flow_tolerance_pct = this._flowTolerancePct), this._adjustmentPct !== void 0 && (t.adjustment_pct = this._adjustmentPct), this._order !== void 0 && (t.order = this._order), this._compatibilityGroup.trim() !== "" && (t.compatibility_group = this._compatibilityGroup.trim())), this.dispatchEvent(
      new CustomEvent("imc-zone-save", {
        detail: { mode: e ? "update" : "add", zoneId: this.zoneId, patch: t },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _remove() {
    const e = this.zoneId;
    if (!e) return;
    const t = x(this.hass);
    window.confirm(`${a(t, "zone.delete")}?`) && this.dispatchEvent(
      new CustomEvent("imc-zone-remove", {
        detail: { zoneId: e },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _cancel() {
    this.dispatchEvent(
      new CustomEvent("imc-zone-cancel", { bubbles: !0, composed: !0 })
    );
  }
};
Ze.styles = N`
    :host {
      display: block;
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 8px;
    }
    .header {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color, #8b93a7);
      margin: 14px 0 6px;
    }
    .field {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #444);
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      font-size: 13px;
      font-family: inherit;
    }
    .months {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }
    .month {
      min-width: 40px;
      padding: 6px 8px;
      border-radius: 8px;
      text-align: center;
      font-size: 12px;
      background: var(--secondary-background-color, #26262e);
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    .month.on {
      background: var(--imc-accent, #3a6df0);
      color: #fff;
      font-weight: 600;
    }
    .advanced-toggle {
      cursor: pointer;
      user-select: none;
      color: var(--imc-accent, #8ab4ff);
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
    .buttons button.danger {
      flex: 0 0 auto;
      background: transparent;
      color: var(--error-color, #db4437);
      border-color: var(--error-color, #db4437);
    }
    .buttons button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `;
let w = Ze;
E([
  h({ attribute: !1 })
], w.prototype, "hass");
E([
  h({ attribute: !1 })
], w.prototype, "zone");
E([
  h()
], w.prototype, "zoneId");
E([
  p()
], w.prototype, "_name");
E([
  p()
], w.prototype, "_valve");
E([
  p()
], w.prototype, "_areaM2");
E([
  p()
], w.prototype, "_flowSensor");
E([
  p()
], w.prototype, "_nominalFlowLpm");
E([
  p()
], w.prototype, "_flowTolerancePct");
E([
  p()
], w.prototype, "_adjustmentPct");
E([
  p()
], w.prototype, "_order");
E([
  p()
], w.prototype, "_compatibilityGroup");
E([
  p()
], w.prototype, "_advancedOpen");
F("imc-zone-editor", w);
var qi = Object.defineProperty, $ = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, r; o >= 0; o--)
    (r = n[o]) && (s = r(e, t, s) || s);
  return s && qi(e, t, s), s;
};
function k(n, e, t) {
  t !== void 0 && (typeof t == "string" && t.trim() === "" || (n[e] = t));
}
function Gi(n) {
  const e = {};
  return k(e, "session_max_min", n.sessionMaxMin), k(e, "must_finish_by", n.mustFinishBy), k(e, "wait_free_min", n.waitFreeMin), k(e, "manual_block_min", n.manualBlockMin), k(e, "settle_pause_s", n.settlePauseS), k(e, "sentinel_time", n.sentinelTime), e;
}
function Ki(n) {
  const e = {};
  return k(e, "open_confirm_s", n.openConfirmS), k(e, "close_confirm_s", n.closeConfirmS), k(e, "switch_confirm_s", n.switchConfirmS), k(e, "startup_valve_timeout_s", n.startupValveTimeoutS), k(e, "watchdog_max_min", n.watchdogMaxMin), e;
}
function Xi(n) {
  const e = {};
  return k(e, "max_concurrent", n.maxConcurrent), k(e, "compatibility_groups", n.compatibilityGroups?.trim()), k(e, "master_pre_open_s", n.masterPreOpenS), k(e, "master_post_close_s", n.masterPostCloseS), e;
}
const pt = [
  "completed",
  "skipped",
  "interrupted",
  "cancelled",
  "anomaly",
  "watchdog",
  "sentinel",
  "session_overrun",
  "consumption_budget"
], Yi = { start: "22:00", end: "06:00" };
function Qi(n) {
  return n === "reduce" || n === "suspend" ? n : "notify";
}
const Be = class Be extends A {
  constructor() {
    super(...arguments), this.options = {}, this._weatherEntity = "", this._rainSensor = "", this._outdoorTempSensor = "", this._lineFlowSensor = "", this._masterValve = "", this._action = "notify", this._forbiddenWindows = [], this._sessionOpen = !1, this._valvesOpen = !1, this._session = {}, this._valves = {}, this._concurrency = {}, this._notifications = {};
  }
  willUpdate(e) {
    e.has("options") && this._seedFromOptions();
  }
  _seedFromOptions() {
    const e = this.options ?? {};
    this._weatherEntity = e.weather_entity ?? "", this._rainSensor = e.rain_sensor ?? "", this._outdoorTempSensor = e.outdoor_temp_sensor ?? "", this._lineFlowSensor = e.line_flow_sensor ?? "", this._masterValve = e.master_valve ?? "";
    const t = e.consumption_budget;
    this._litersPerMonth = t?.liters_per_month, this._action = Qi(t?.action), this._reducePct = t?.reduce_pct;
    const i = e.restrictions, s = this.options ?? {};
    this._session = {
      sessionMaxMin: s.session_max_min,
      mustFinishBy: s.must_finish_by,
      waitFreeMin: s.wait_free_min,
      manualBlockMin: s.manual_block_min,
      settlePauseS: s.settle_pause_s,
      sentinelTime: s.sentinel_time
    }, this._valves = {
      openConfirmS: s.open_confirm_s,
      closeConfirmS: s.close_confirm_s,
      switchConfirmS: s.switch_confirm_s,
      startupValveTimeoutS: s.startup_valve_timeout_s,
      watchdogMaxMin: s.watchdog_max_min
    }, this._concurrency = {
      maxConcurrent: s.max_concurrent,
      compatibilityGroups: s.compatibility_groups,
      masterPreOpenS: s.master_pre_open_s,
      masterPostCloseS: s.master_post_close_s
    }, this._notifications = Object.fromEntries(
      pt.map((o) => {
        const r = s.notifications?.[o];
        return [
          o,
          {
            enabled: r?.enabled ?? !1,
            services: (r?.services ?? []).join(", ")
          }
        ];
      })
    ), this._forbiddenWindows = i?.forbidden_windows ? i.forbidden_windows.map((o) => ({ ...o })) : [];
  }
  get _canSaveWeather() {
    return this._weatherEntity.trim() !== "";
  }
  /**
   * An optional entity field: the native `<ha-selector>` offers no reliable,
   * discoverable way to empty a value once set, so we render an explicit
   * "Clear" link (shown only when there IS a value) that sets the field back
   * to `""`. Saving then sends `""`, which `set_weather_sources` treats as
   * "clear this key" — restoring e.g. the weather entity's own temperature.
   */
  _optionalPicker(e, t, i, s, o) {
    const r = a(e, t);
    return d`
      <div class="section-label opt-label">
        <span>${r}</span>
        ${i ? d`<span
              class="clear-link"
              role="button"
              tabindex="0"
              @click=${() => o("")}
              @keydown=${(l) => {
      (l.key === "Enter" || l.key === " ") && (l.preventDefault(), o(""));
    }}
              >✕ ${a(e, "settings.clear")}</span
            >` : u}
      </div>
      <imc-entity-picker
        .hass=${this.hass}
        .selector=${s}
        .value=${i}
        .label=${r}
        @value-changed=${(l) => o(l.detail.value)}
      ></imc-entity-picker>
    `;
  }
  render() {
    const e = x(this.hass);
    return d`
      <div class="topbar">
        <span class="back" @click=${this._back}>‹ ${a(e, "wizard.back")}</span>
        <span class="title">${a(e, "settings.title")}</span>
      </div>

      ${this._renderWeatherSection(e)} ${this._renderBudgetSection(e)}
      ${this._renderRestrictionsSection(e)} ${this._renderNotificationsSection(e)}
      ${this._renderSessionDrawer(e)} ${this._renderValvesDrawer(e)}

      <div class="advanced-note">▸ ${a(e, "settings.advanced_note")}</div>
    `;
  }
  _renderWeatherSection(e) {
    return d`
      <div class="sec">
        <div class="header">🌦️ ${a(e, "settings.weather")}</div>

        <div class="section-label">${a(e, "settings.weather_entity")}</div>
        <imc-entity-picker
          .hass=${this.hass}
          .selector=${{ entity: { domain: "weather" } }}
          .value=${this._weatherEntity}
          .label=${a(e, "settings.weather_entity")}
          @value-changed=${(t) => this._weatherEntity = t.detail.value}
        ></imc-entity-picker>

        <div class="two">
          <div>
            ${this._optionalPicker(
      e,
      "settings.rain",
      this._rainSensor,
      { entity: { domain: "sensor" } },
      (t) => this._rainSensor = t
    )}
          </div>
          <div>
            ${this._optionalPicker(
      e,
      "settings.outdoor_temp",
      this._outdoorTempSensor,
      { entity: { domain: "sensor" } },
      (t) => this._outdoorTempSensor = t
    )}
          </div>
        </div>

        <div class="two">
          <div>
            ${this._optionalPicker(
      e,
      "settings.line_flow",
      this._lineFlowSensor,
      { entity: { domain: "sensor" } },
      (t) => this._lineFlowSensor = t
    )}
          </div>
          <div>
            ${this._optionalPicker(
      e,
      "settings.master_valve",
      this._masterValve,
      { entity: { domain: ["valve", "switch"] } },
      (t) => this._masterValve = t
    )}
          </div>
        </div>

        <div class="buttons">
          <button
            class="primary"
            type="button"
            ?disabled=${!this._canSaveWeather}
            @click=${this._saveWeather}
          >
            ${a(e, "editor.save")}
          </button>
        </div>
      </div>
    `;
  }
  _renderBudgetSection(e) {
    return d`
      <div class="sec">
        <div class="header">🚰 ${a(e, "settings.budget")}</div>

        <div class="two">
          <div>
            <div class="section-label">${a(e, "settings.liters")}</div>
            <input
              class="field"
              type="number"
              min="0"
              step="1"
              .value=${this._litersPerMonth ?? ""}
              @input=${(t) => this._litersPerMonth = m(t.target.value)}
            />
          </div>
          <div>
            <div class="section-label">${a(e, "settings.on_exceed")}</div>
            <span class="seg">
              <span
                class="${this._action === "notify" ? "sel" : ""}"
                @click=${() => this._action = "notify"}
                >${a(e, "settings.action_notify")}</span
              >
              <span
                class="${this._action === "reduce" ? "sel" : ""}"
                @click=${() => this._action = "reduce"}
                >${a(e, "settings.action_reduce")}</span
              >
              <span
                class="${this._action === "suspend" ? "sel" : ""}"
                @click=${() => this._action = "suspend"}
                >${a(e, "settings.action_suspend")}</span
              >
            </span>
          </div>
        </div>

        ${this._action === "reduce" ? d`
              <div class="section-label">${a(e, "settings.reduce_pct")}</div>
              <input
                class="field"
                type="number"
                min="1"
                max="100"
                step="1"
                .value=${this._reducePct ?? ""}
                @input=${(t) => this._reducePct = m(t.target.value)}
              />
            ` : u}

        <div class="buttons">
          <button class="primary" type="button" @click=${this._saveBudget}>
            ${a(e, "editor.save")}
          </button>
        </div>
      </div>
    `;
  }
  _renderRestrictionsSection(e) {
    return d`
      <div class="sec">
        <div class="header">🕑 ${a(e, "settings.restrictions")}</div>
        <div class="hint">${a(e, "settings.restrictions_hours_only")}</div>

        <div class="section-label">${a(e, "settings.forbidden_windows")}</div>
        ${this._forbiddenWindows.map(
      (t, i) => d`
            <div class="window-row">
              <input
                class="field"
                type="time"
                .value=${t.start}
                @input=${(s) => this._updateWindow(i, "start", s.target.value)}
              />
              <span class="window-sep">–</span>
              <input
                class="field"
                type="time"
                .value=${t.end}
                @input=${(s) => this._updateWindow(i, "end", s.target.value)}
              />
              <button
                class="icon-btn"
                type="button"
                @click=${() => this._removeWindow(i)}
                aria-label="remove"
              >
                ✕
              </button>
            </div>
          `
    )}
        <button class="add-window" type="button" @click=${this._addWindow}>＋</button>

        <div class="buttons">
          <button class="primary" type="button" @click=${this._saveRestrictions}>
            ${a(e, "editor.save")}
          </button>
        </div>
      </div>
    `;
  }
  _updateWindow(e, t, i) {
    this._forbiddenWindows = this._forbiddenWindows.map(
      (s, o) => o === e ? { ...s, [t]: i } : s
    );
  }
  _addWindow() {
    this._forbiddenWindows = [...this._forbiddenWindows, { ...Yi }];
  }
  _removeWindow(e) {
    this._forbiddenWindows = this._forbiddenWindows.filter((t, i) => i !== e);
  }
  /**
   * `set_weather_sources` MERGES its patch into existing options (unlike
   * the budget/restrictions services below, which replace their whole
   * section) — an omitted key there just means "leave unchanged". Sending
   * `""` for a cleared optional is therefore how the user actually clears
   * it; omitting the key instead would silently leave the old value in
   * place. `weather_entity` is always sent (required, non-empty — guarded
   * by `_canSaveWeather`/the disabled Save button).
   */
  _saveWeather() {
    if (!this._canSaveWeather) return;
    const e = {
      weather_entity: this._weatherEntity.trim(),
      rain_sensor: this._rainSensor.trim(),
      outdoor_temp_sensor: this._outdoorTempSensor.trim(),
      line_flow_sensor: this._lineFlowSensor.trim(),
      master_valve: this._masterValve.trim()
    };
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-weather", {
        detail: e,
        bubbles: !0,
        composed: !0
      })
    );
  }
  /**
   * `set_consumption_budget` REPLACES the whole `consumption_budget`
   * section — any field left out of the payload is cleared. This always
   * sends the full working state (`action` always; `liters_per_month`/
   * `reduce_pct` when set) rather than a partial diff.
   */
  _saveBudget() {
    const e = { action: this._action };
    this._litersPerMonth !== void 0 && (e.liters_per_month = this._litersPerMonth), this._action === "reduce" && this._reducePct !== void 0 && (e.reduce_pct = this._reducePct), this.dispatchEvent(
      new CustomEvent("imc-settings-save-budget", {
        detail: e,
        bubbles: !0,
        composed: !0
      })
    );
  }
  /**
   * `set_restrictions` REPLACES the whole `restrictions` section, so this
   * always sends the full current weekday set / parity / windows — never a
   * diff. All 7 (or 0) weekdays selected serializes as `[]`, mirroring the
   * "empty = every day allowed" convention used by `set_restrictions` and
   * the program schedule elsewhere in the panel.
   */
  _saveRestrictions() {
    const e = {
      forbidden_windows: this._forbiddenWindows.map((t) => ({ start: t.start, end: t.end }))
    };
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-restrictions", {
        detail: e,
        bubbles: !0,
        composed: !0
      })
    );
  }
  /** A labelled number input that reports its unit and its default. */
  _num(e, t, i, s) {
    return d`
      <div class="section-label">${e}</div>
      <input
        class="field"
        type="number"
        .value=${i ?? ""}
        @input=${(o) => s(m(o.target.value))}
      />
      <div class="hint">${t}</div>
    `;
  }
  _renderNotificationsSection(e) {
    return d`
      <div class="sec">
        <div class="header">🔔 ${a(e, "settings.notifications")}</div>
        ${pt.map((t) => {
      const i = this._notifications[t] ?? { enabled: !1, services: "" };
      return d`
            <div class="section-label">${a(e, `settings.notify_${t}`)}</div>
            <div class="toggle-row" @click=${() => this._toggleNotification(t)}>
              <span class="switch ${i.enabled ? "on" : ""}"></span>
              <span>${a(e, i.enabled ? "settings.on" : "settings.off")}</span>
            </div>
            <input
              class="field"
              type="text"
              placeholder="notify.mobile_app_phone"
              .value=${i.services}
              @input=${(s) => this._setNotificationServices(t, s.target.value)}
            />
          `;
    })}
      </div>
    `;
  }
  _renderSessionDrawer(e) {
    return d`
      <div class="sec">
        <div
          class="header advanced-toggle"
          @click=${() => this._sessionOpen = !this._sessionOpen}
        >
          ${this._sessionOpen ? "▾" : "▸"} ${a(e, "settings.session_safety")}
        </div>
        ${this._sessionOpen ? d`
              ${this._num(
      a(e, "settings.session_max_min"),
      a(e, "settings.session_max_min_hint"),
      this._session.sessionMaxMin,
      (t) => this._session = { ...this._session, sessionMaxMin: t }
    )}
              <div class="section-label">${a(e, "settings.must_finish_by")}</div>
              <input
                class="field"
                type="time"
                .value=${this._session.mustFinishBy ?? ""}
                @input=${(t) => this._session = {
      ...this._session,
      mustFinishBy: t.target.value
    }}
              />
              ${this._num(
      a(e, "settings.wait_free_min"),
      a(e, "settings.wait_free_min_hint"),
      this._session.waitFreeMin,
      (t) => this._session = { ...this._session, waitFreeMin: t }
    )}
              ${this._num(
      a(e, "settings.manual_block_min"),
      a(e, "settings.manual_block_min_hint"),
      this._session.manualBlockMin,
      (t) => this._session = { ...this._session, manualBlockMin: t }
    )}
              ${this._num(
      a(e, "settings.settle_pause_s"),
      a(e, "settings.settle_pause_s_hint"),
      this._session.settlePauseS,
      (t) => this._session = { ...this._session, settlePauseS: t }
    )}
              <div class="section-label">${a(e, "settings.sentinel_time")}</div>
              <input
                class="field"
                type="time"
                .value=${this._session.sentinelTime ?? ""}
                @input=${(t) => this._session = {
      ...this._session,
      sentinelTime: t.target.value
    }}
              />
              <button class="primary" @click=${this._saveSessionLimits}>
                ${a(e, "editor.save")}
              </button>
            ` : u}
      </div>
    `;
  }
  _renderValvesDrawer(e) {
    return d`
      <div class="sec">
        <div class="header advanced-toggle" @click=${() => this._valvesOpen = !this._valvesOpen}>
          ${this._valvesOpen ? "▾" : "▸"} ${a(e, "settings.valves_concurrency")}
        </div>
        ${this._valvesOpen ? d`
              ${this._num(
      a(e, "settings.open_confirm_s"),
      a(e, "settings.open_confirm_s_hint"),
      this._valves.openConfirmS,
      (t) => this._valves = { ...this._valves, openConfirmS: t }
    )}
              ${this._num(
      a(e, "settings.close_confirm_s"),
      a(e, "settings.close_confirm_s_hint"),
      this._valves.closeConfirmS,
      (t) => this._valves = { ...this._valves, closeConfirmS: t }
    )}
              ${this._num(
      a(e, "settings.switch_confirm_s"),
      a(e, "settings.switch_confirm_s_hint"),
      this._valves.switchConfirmS,
      (t) => this._valves = { ...this._valves, switchConfirmS: t }
    )}
              ${this._num(
      a(e, "settings.startup_valve_timeout_s"),
      a(e, "settings.startup_valve_timeout_s_hint"),
      this._valves.startupValveTimeoutS,
      (t) => this._valves = { ...this._valves, startupValveTimeoutS: t }
    )}
              ${this._num(
      a(e, "settings.watchdog_max_min"),
      a(e, "settings.watchdog_max_min_hint"),
      this._valves.watchdogMaxMin,
      (t) => this._valves = { ...this._valves, watchdogMaxMin: t }
    )}
              ${this._num(
      a(e, "settings.max_concurrent"),
      a(e, "settings.max_concurrent_hint"),
      this._concurrency.maxConcurrent,
      (t) => this._concurrency = { ...this._concurrency, maxConcurrent: t }
    )}
              <div class="section-label">${a(e, "settings.compatibility_groups")}</div>
              <input
                class="field"
                type="text"
                .value=${this._concurrency.compatibilityGroups ?? ""}
                @input=${(t) => this._concurrency = {
      ...this._concurrency,
      compatibilityGroups: t.target.value
    }}
              />
              <div class="hint">${a(e, "settings.compatibility_groups_hint")}</div>
              ${this._num(
      a(e, "settings.master_pre_open_s"),
      a(e, "settings.master_pre_open_s_hint"),
      this._concurrency.masterPreOpenS,
      (t) => this._concurrency = { ...this._concurrency, masterPreOpenS: t }
    )}
              ${this._num(
      a(e, "settings.master_post_close_s"),
      a(e, "settings.master_post_close_s_hint"),
      this._concurrency.masterPostCloseS,
      (t) => this._concurrency = { ...this._concurrency, masterPostCloseS: t }
    )}
              <button class="primary" @click=${this._saveValveSafety}>
                ${a(e, "editor.save")}
              </button>
            ` : u}
      </div>
    `;
  }
  _toggleNotification(e) {
    const t = this._notifications[e] ?? { enabled: !1, services: "" }, i = { ...t, enabled: !t.enabled };
    this._notifications = { ...this._notifications, [e]: i }, this._emitNotification(e, i);
  }
  _setNotificationServices(e, t) {
    const s = { ...this._notifications[e] ?? { enabled: !1, services: "" }, services: t };
    this._notifications = { ...this._notifications, [e]: s }, this._emitNotification(e, s);
  }
  _emitNotification(e, t) {
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-notifications", {
        detail: {
          event: e,
          enabled: t.enabled,
          services: t.services.split(",").map((i) => i.trim()).filter(Boolean)
        },
        bubbles: !0,
        composed: !0
      })
    );
  }
  _saveSessionLimits() {
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-session-limits", {
        detail: Gi(this._session),
        bubbles: !0,
        composed: !0
      })
    );
  }
  _saveValveSafety() {
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-valve-safety", {
        detail: Ki(this._valves),
        bubbles: !0,
        composed: !0
      })
    ), this.dispatchEvent(
      new CustomEvent("imc-settings-save-concurrency", {
        detail: Xi(this._concurrency),
        bubbles: !0,
        composed: !0
      })
    );
  }
  _back() {
    this.dispatchEvent(new CustomEvent("imc-settings-back", { bubbles: !0, composed: !0 }));
  }
};
Be.styles = N`
    :host {
      display: block;
    }
    .topbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 2px 0 12px;
    }
    .back {
      font-size: 13px;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .title {
      font-size: 15px;
      font-weight: 600;
    }
    .sec {
      border: 1px solid var(--divider-color, rgba(127, 127, 127, 0.25));
      border-radius: 12px;
      padding: 14px 16px;
      margin-top: 10px;
    }
    .header {
      font-size: 15px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .section-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color, #8b93a7);
      margin: 14px 0 6px;
    }
    .section-label:first-of-type {
      margin-top: 10px;
    }
    .section-label.opt-label {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;
    }
    .clear-link {
      font-size: 11px;
      text-transform: none;
      letter-spacing: 0;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .field {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, #444);
      background: var(--secondary-background-color, #26262e);
      color: var(--primary-text-color);
      font-size: 13px;
      font-family: inherit;
    }
    .two {
      display: flex;
      gap: 10px;
    }
    .two > div {
      flex: 1;
      min-width: 0;
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
    .window-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 6px;
    }
    .window-row input[type="time"] {
      width: auto;
      flex: 1;
    }
    .window-sep {
      color: var(--secondary-text-color, #8b93a7);
    }
    .icon-btn {
      border: none;
      background: transparent;
      color: var(--error-color, #db4437);
      cursor: pointer;
      font-size: 14px;
      padding: 4px 6px;
    }
    .add-window {
      margin-top: 8px;
      border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.4));
      background: transparent;
      color: var(--imc-accent, #3a6df0);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12.5px;
      cursor: pointer;
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
    .advanced-note {
      margin-top: 12px;
      padding: 0 2px;
      font-size: 12.5px;
      color: var(--secondary-text-color, #8b93a7);
    }
  `;
let b = Be;
$([
  h({ attribute: !1 })
], b.prototype, "hass");
$([
  h({ attribute: !1 })
], b.prototype, "options");
$([
  p()
], b.prototype, "_weatherEntity");
$([
  p()
], b.prototype, "_rainSensor");
$([
  p()
], b.prototype, "_outdoorTempSensor");
$([
  p()
], b.prototype, "_lineFlowSensor");
$([
  p()
], b.prototype, "_masterValve");
$([
  p()
], b.prototype, "_litersPerMonth");
$([
  p()
], b.prototype, "_action");
$([
  p()
], b.prototype, "_reducePct");
$([
  p()
], b.prototype, "_forbiddenWindows");
$([
  p()
], b.prototype, "_sessionOpen");
$([
  p()
], b.prototype, "_valvesOpen");
$([
  p()
], b.prototype, "_session");
$([
  p()
], b.prototype, "_valves");
$([
  p()
], b.prototype, "_concurrency");
$([
  p()
], b.prototype, "_notifications");
F("imc-settings-view", b);
function Ji(n) {
  const e = JSON.parse(n);
  return { options: e.options ?? {}, zones: e.zones ?? {} };
}
var es = Object.defineProperty, j = (n, e, t, i) => {
  for (var s = void 0, o = n.length - 1, r; o >= 0; o--)
    (r = n[o]) && (s = r(e, t, s) || s);
  return s && es(e, t, s), s;
};
function ut(n) {
  return n.mode === "interval" ? { calendar_mode: "interval", interval_days: n.interval_days } : n.mode === "parity" ? { calendar_mode: "parity", parity: n.parity } : { calendar_mode: "weekdays", days: n.days };
}
const He = class He extends A {
  constructor() {
    super(...arguments), this.narrow = !1, this._view = "zones", this._relevantIds = [], this._statesCount = 0;
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._errorTimer !== void 0 && (window.clearTimeout(this._errorTimer), this._errorTimer = void 0), this._noticeTimer !== void 0 && (window.clearTimeout(this._noticeTimer), this._noticeTimer = void 0);
  }
  /* ------------------------------------------------------------ */
  /* Actions → services                                            */
  /* ------------------------------------------------------------ */
  async _call(e, t, i, s = !1) {
    if (this.hass)
      try {
        return await this.hass.callService(e, t, i, void 0, !1, s);
      } catch (o) {
        const r = o instanceof Error ? o.message : String(o);
        this._showError(r);
        return;
      }
  }
  /** Surface a message in the `_error` toast, auto-dismissed after 6s — shared
   *  by `_call`'s failure path and any other spot (e.g. `_onEditZone`) that
   *  needs to report a non-`_call` failure the same way. */
  _showError(e) {
    this._error = e, this._errorTimer !== void 0 && window.clearTimeout(this._errorTimer), this._errorTimer = window.setTimeout(() => {
      this._error = void 0, this._errorTimer = void 0;
    }, 6e3);
  }
  /** Surface a message in the `_notice` toast, auto-dismissed after 3s — the
   *  success-side counterpart to `_showError` above, called after a save
   *  actually succeeds (never on failure — the `_error` toast already covers
   *  that). */
  _showNotice(e) {
    this._notice = e, this._noticeTimer !== void 0 && window.clearTimeout(this._noticeTimer), this._noticeTimer = window.setTimeout(() => {
      this._notice = void 0, this._noticeTimer = void 0;
    }, 3e3);
  }
  /**
   * Full-config snapshot, used to seed the zone editor with every field
   * (including the advanced ones `discover()`'s entity-attribute model
   * doesn't surface). `export_config` is a response service returning a
   * JSON string payload — nested under `res.response["payload"]`, same
   * shape as the other response services above.
   */
  async _readConfig() {
    const t = (await this._call("irrigation_maestro", "export_config", {}, !0))?.response?.payload;
    if (typeof t == "string")
      try {
        return Ji(t);
      } catch {
        return;
      }
  }
  async _onEditZone(e) {
    const t = await this._readConfig();
    t ? (this._editingZoneId = e, this._editingZone = t.zones[e] ?? {}) : this._showError(a(x(this.hass), "panel.config_read_failed"));
  }
  /**
   * ⚙️ header button: opens the everyday-settings view (spec §1.3), seeded
   * from a fresh `export_config` read — same "read-before-open" pattern as
   * `_onEditZone` above, including the shared `config_read_failed` error
   * path when the read fails or the payload is unusable.
   */
  async _onOpenSettings() {
    const e = await this._readConfig();
    e ? (this._options = e.options, this._view = "settings") : this._showError(a(x(this.hass), "panel.config_read_failed"));
  }
  /**
   * `imc-zone-save`: `add_zone` accepts ONLY `name`/`valve_entity`/
   * `area_m2`/`icon` — its voluptuous schema has no ALLOW_EXTRA, so any
   * other field in the payload hard-fails the call. Pick exactly those
   * keys rather than spreading `d.patch` (the editor never produces
   * advanced fields in create mode, but this guards defensively either
   * way). `update_zone` accepts the full field set, so the update branch
   * spreads the patch directly. `add_zone` is a response service — its id
   * comes back nested under `res.response["zone_id"]`, mirroring
   * `_onWizardFinish`'s `program_id` handling above.
   *
   * Editing state is only cleared on SUCCESS — `_call` returns `undefined`
   * on a failed service call (having already populated `_error`), so a
   * failed add/update leaves `_editingZone`/`_editingZoneId` untouched and
   * the editor stays open with the user's input intact, rather than
   * silently discarding it behind the 6s error toast.
   */
  async _onZoneSave(e) {
    const t = e.detail;
    let i;
    if (t.mode === "add") {
      const s = t.patch, o = { name: s.name, valve_entity: s.valve_entity };
      s.area_m2 !== void 0 && (o.area_m2 = s.area_m2), s.icon !== void 0 && (o.icon = s.icon);
      const l = (await this._call("irrigation_maestro", "add_zone", o, !0))?.response?.zone_id;
      i = typeof l == "string" && l !== "", i && (this._selectedZoneId = l);
    } else
      i = !!await this._call("irrigation_maestro", "update_zone", {
        zone_id: t.zoneId,
        ...t.patch
      });
    i && (this._editingZone = void 0, this._editingZoneId = void 0, this._showNotice(a(x(this.hass), "panel.saved_zone")));
  }
  async _onZoneRemove(e) {
    const t = await this._call("irrigation_maestro", "remove_zone", {
      zone_id: e.detail.zoneId
    });
    this._editingZone = void 0, this._editingZoneId = void 0, this._selectedZoneId = void 0, t && this._showNotice(a(x(this.hass), "panel.removed_zone"));
  }
  _onZoneCancel() {
    this._editingZone = void 0, this._editingZoneId = void 0;
  }
  /**
   * The 3 settings-view save events (spec §1.3, wired in this task): each
   * event's detail keys ARE the matching hub service's attr names 1:1
   * (verified against `services.yaml`), so every handler spreads the detail
   * straight into the service call — no field renaming needed here, unlike
   * e.g. `_onCurveSave` above.
   */
  async _onSaveWeather(e) {
    await this._call("irrigation_maestro", "set_weather_sources", {
      ...e.detail
    }) !== void 0 && this._showNotice(a(x(this.hass), "panel.saved_settings"));
  }
  async _onSaveBudget(e) {
    await this._call("irrigation_maestro", "set_consumption_budget", {
      ...e.detail
    }) !== void 0 && this._showNotice(a(x(this.hass), "panel.saved_settings"));
  }
  async _onSaveRestrictions(e) {
    await this._call("irrigation_maestro", "set_restrictions", { ...e.detail }) !== void 0 && this._showNotice(a(x(this.hass), "panel.saved_settings"));
  }
  _onSettingsBack() {
    this._view = "zones";
  }
  /** Shared path for the settings services: skip empty patches, toast on success. */
  async _saveSettings(e, t) {
    if (Object.keys(t).length === 0) return;
    await this._call("irrigation_maestro", e, t) !== void 0 && this._showNotice(a(x(this.hass), "panel.saved_settings"));
  }
  _onSaveSchedule(e) {
    const t = e.detail;
    this._call("irrigation_maestro", "set_program_schedule", {
      zone_id: t.zoneId,
      program_id: t.programId,
      ...ut(t.calendar),
      ...t.seasonMonths ? { season_months: t.seasonMonths } : {},
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
    this._call("irrigation_maestro", "set_curve", {
      zone_id: t,
      cycle_id: i.cycleId,
      points: i.points,
      min_value: i.min,
      max_value: i.max,
      ...i.kind !== void 0 ? { kind: i.kind } : {}
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
      ...ut(t.calendar),
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
  /**
   * `duplicate_program` names the copy itself and avoids collisions in the
   * target zone, so the panel passes no `name` and no `target_zone_id`
   * (defaulting to the same zone) — duplicating is always "another program
   * right here", cross-zone copies aren't offered by this control.
   */
  async _onProgramDuplicate(e) {
    const t = e.detail;
    await this._call("irrigation_maestro", "duplicate_program", {
      zone_id: t.zoneId,
      program_id: t.programId
    }) && this._showNotice(a(x(this.hass), "program.duplicate_done"));
  }
  /**
   * `copy_curve` replaces only `zoneId`/`programId`'s curve shape with
   * `sourceZoneId`/`sourceProgramId`'s — schedule, calendar, soak, name and
   * intensity all stay the destination's own. Reuses `editor.saved`
   * ("Curve updated.") for the success toast: that is exactly what
   * happened, and it was already sitting there unused by any other path.
   */
  async _onCurveCopy(e) {
    const t = e.detail;
    await this._call("irrigation_maestro", "copy_curve", {
      source_zone_id: t.sourceZoneId,
      source_program_id: t.sourceProgramId,
      zone_id: t.zoneId,
      program_id: t.programId
    }) && this._showNotice(a(x(this.hass), "editor.saved"));
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
  /** Error + success toasts, rendered together at the same spot in every
   *  render branch below — see `_showError`/`_showNotice`. */
  _renderToasts() {
    return d`
      ${this._error ? d`<div class="error">${this._error}</div>` : u}
      ${this._notice ? d`<div class="notice">${this._notice}</div>` : u}
    `;
  }
  render() {
    const e = this.hass;
    if (!e) return d``;
    const t = x(e), i = ri(e);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(e.states).length, this._editingZone !== void 0)
      return d`
        <div
          class="wrap ${this.narrow ? "narrow" : ""}"
          @imc-zone-save=${this._onZoneSave}
          @imc-zone-remove=${this._onZoneRemove}
          @imc-zone-cancel=${this._onZoneCancel}
        >
          <header><h1>${a(t, "panel.title")}</h1></header>
          ${this._renderToasts()}
          <imc-zone-editor
            .hass=${e}
            .zone=${this._editingZone ?? void 0}
            .zoneId=${this._editingZoneId}
          ></imc-zone-editor>
        </div>
      `;
    if (this._view === "settings")
      return d`
        <div
          class="wrap ${this.narrow ? "narrow" : ""}"
          @imc-settings-save-weather=${this._onSaveWeather}
          @imc-settings-save-budget=${this._onSaveBudget}
          @imc-settings-save-restrictions=${this._onSaveRestrictions}
          @imc-settings-save-session-limits=${(r) => this._saveSettings("set_session_limits", r.detail)}
        @imc-settings-save-valve-safety=${(r) => this._saveSettings("set_valve_safety", r.detail)}
        @imc-settings-save-concurrency=${(r) => this._saveSettings("set_concurrency", r.detail)}
        @imc-settings-save-notifications=${(r) => this._saveSettings("set_notifications", { ...r.detail })}
        @imc-settings-back=${this._onSettingsBack}
        >
          <header><h1>${a(t, "panel.title")}</h1></header>
          ${this._renderToasts()}
          <imc-settings-view .hass=${e} .options=${this._options ?? {}}></imc-settings-view>
        </div>
      `;
    if (!i.found || i.zones.length === 0)
      return d`
        <div class="wrap">
          <header>
            <h1>${a(t, "panel.title")}</h1>
            <span class="settings-btn" @click=${this._onOpenSettings}>
              ⚙️ ${a(t, "settings.title")}
            </span>
          </header>
          ${this._renderToasts()}
          <div class="empty">${a(t, "panel.no_zones")}</div>
          <div class="tabs">
            <div
              class="tab add"
              @click=${() => {
        this._editingZone = null, this._editingZoneId = void 0;
      }}
            >
              ＋ ${a(t, "zone.add")}
            </div>
          </div>
        </div>
      `;
    const s = this._resolveSelected(i.zones), o = $e(i.hub.weightedTemp) ? void 0 : m(i.hub.weightedTemp?.state);
    return d`
      <div
        class="wrap ${this.narrow ? "narrow" : ""}"
        @imc-program-save-schedule=${this._onSaveSchedule}
        @imc-program-save-advanced=${(r) => this._saveSettings("set_program_advanced", {
      zone_id: r.detail.zoneId,
      program_id: r.detail.programId,
      ...r.detail.patch
    })}
        @imc-program-save-minutes=${this._onSaveMinutes}
        @imc-curve-save=${this._onCurveSave}
        @imc-curve-copy=${this._onCurveCopy}
        @imc-program-cancel=${() => {
    }}
        @imc-program-toggle=${this._onProgramToggle}
        @imc-program-rename=${this._onProgramRename}
        @imc-program-remove=${this._onProgramRemove}
        @imc-program-duplicate=${this._onProgramDuplicate}
        @imc-wizard-finish=${this._onWizardFinish}
        @imc-wizard-cancel=${() => {
    }}
      >
        <header>
          <h1>${a(t, "panel.title")}</h1>
          <span class="settings-btn" @click=${this._onOpenSettings}>
            ⚙️ ${a(t, "settings.title")}
          </span>
        </header>
        ${this._renderWeatherContext(i, t, o)}
        ${this._renderToasts()}
        <div class="tabs">
          ${i.zones.map(
      (r) => d`
              <div
                class="tab ${r.zoneId === s.zoneId ? "sel" : ""}"
                @click=${() => this._selectedZoneId = r.zoneId}
              >
                ${r.name}
              </div>
            `
    )}
          <div
            class="tab add"
            @click=${() => {
      this._editingZone = null, this._editingZoneId = void 0;
    }}
          >
            ＋ ${a(t, "zone.add")}
          </div>
        </div>
        <div class="zone-toolbar">
          <span class="edit-zone-link" @click=${() => this._onEditZone(s.zoneId)}>
            ✎ ${a(t, "zone.edit")}
          </span>
        </div>
        <imc-program-list
          .hass=${e}
          .zone=${s}
          .weightedTemp=${o}
          .allZones=${i.zones}
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
    const s = $e(e.hub.waterBudget) ? void 0 : m(e.hub.waterBudget?.state), o = $e(e.hub.skipThreshold) ? void 0 : m(e.hub.skipThreshold?.state), r = s !== void 0 && o !== void 0 ? s >= o ? "panel.budget_ok" : "panel.budget_low" : void 0;
    return d`
      <div class="meteo">
        ${a(t, "panel.weather_temp", { temp: ti(i, 1) ?? "" })}
        ${r ? d` · ${a(t, r)}` : u}
      </div>
    `;
  }
};
He.styles = N`
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
    .settings-btn {
      margin-left: auto;
      font-size: 13px;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .settings-btn:hover {
      opacity: 0.8;
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
    .tab.add {
      background: transparent;
      border: 1px dashed var(--divider-color, rgba(127, 127, 127, 0.4));
      color: var(--imc-accent, #3a6df0);
      font-weight: 600;
    }
    .zone-toolbar {
      display: flex;
      justify-content: flex-end;
      margin: -6px 0 8px;
    }
    .edit-zone-link {
      font-size: 12px;
      color: var(--imc-accent, #3a6df0);
      cursor: pointer;
      user-select: none;
    }
    .edit-zone-link:hover {
      opacity: 0.8;
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
    .notice {
      margin: 0 0 12px;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 12px;
      background: var(--success-color, #1f9d55);
      color: var(--text-primary-color, #fff);
      overflow-wrap: anywhere;
    }
  `;
let C = He;
j([
  h({ attribute: !1 })
], C.prototype, "hass");
j([
  h({ type: Boolean })
], C.prototype, "narrow");
j([
  p()
], C.prototype, "_selectedZoneId");
j([
  p()
], C.prototype, "_error");
j([
  p()
], C.prototype, "_notice");
j([
  p()
], C.prototype, "_editingZone");
j([
  p()
], C.prototype, "_editingZoneId");
j([
  p()
], C.prototype, "_view");
j([
  p()
], C.prototype, "_options");
F("irrigation-maestro-panel", C);
