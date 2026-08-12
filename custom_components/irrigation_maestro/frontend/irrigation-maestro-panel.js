/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const pe = globalThis, Ae = pe.ShadowRoot && (pe.ShadyCSS === void 0 || pe.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Ee = /* @__PURE__ */ Symbol(), je = /* @__PURE__ */ new WeakMap();
let ct = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== Ee) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (Ae && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = je.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && je.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const xt = (o) => new ct(typeof o == "string" ? o : o + "", void 0, Ee), U = (o, ...e) => {
  const t = o.length === 1 ? o[0] : e.reduce((i, s, n) => i + ((r) => {
    if (r._$cssResult$ === !0) return r.cssText;
    if (typeof r == "number") return r;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + r + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(s) + o[n + 1], o[0]);
  return new ct(t, o, Ee);
}, wt = (o, e) => {
  if (Ae) o.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), s = pe.litNonce;
    s !== void 0 && i.setAttribute("nonce", s), i.textContent = t.cssText, o.appendChild(i);
  }
}, He = Ae ? (o) => o : (o) => o instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return xt(t);
})(o) : o;
const { is: zt, defineProperty: kt, getOwnPropertyDescriptor: St, getOwnPropertyNames: At, getOwnPropertySymbols: Et, getPrototypeOf: Mt } = Object, me = globalThis, Ze = me.trustedTypes, Tt = Ze ? Ze.emptyScript : "", It = me.reactiveElementPolyfillSupport, se = (o, e) => o, ue = { toAttribute(o, e) {
  switch (e) {
    case Boolean:
      o = o ? Tt : null;
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
} }, Me = (o, e) => !zt(o, e), Ve = { attribute: !0, type: String, converter: ue, reflect: !1, useDefault: !1, hasChanged: Me };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), me.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let K = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = Ve) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = /* @__PURE__ */ Symbol(), s = this.getPropertyDescriptor(e, i, t);
      s !== void 0 && kt(this.prototype, e, s);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: s, set: n } = St(this.prototype, e) ?? { get() {
      return this[t];
    }, set(r) {
      this[t] = r;
    } };
    return { get: s, set(r) {
      const c = s?.call(this);
      n?.call(this, r), this.requestUpdate(e, c, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? Ve;
  }
  static _$Ei() {
    if (this.hasOwnProperty(se("elementProperties"))) return;
    const e = Mt(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(se("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(se("properties"))) {
      const t = this.properties, i = [...At(t), ...Et(t)];
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
      for (const s of i) t.unshift(He(s));
    } else e !== void 0 && t.push(He(e));
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
    return wt(e, this.constructor.elementStyles), e;
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
      const n = (i.converter?.toAttribute !== void 0 ? i.converter : ue).toAttribute(t, i.type);
      this._$Em = e, n == null ? this.removeAttribute(s) : this.setAttribute(s, n), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, s = i._$Eh.get(e);
    if (s !== void 0 && this._$Em !== s) {
      const n = i.getPropertyOptions(s), r = typeof n.converter == "function" ? { fromAttribute: n.converter } : n.converter?.fromAttribute !== void 0 ? n.converter : ue;
      this._$Em = s;
      const c = r.fromAttribute(t, n.type);
      this[s] = c ?? this._$Ej?.get(s) ?? c, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, s = !1, n) {
    if (e !== void 0) {
      const r = this.constructor;
      if (s === !1 && (n = this[e]), i ??= r.getPropertyOptions(e), !((i.hasChanged ?? Me)(n, t) || i.useDefault && i.reflect && n === this._$Ej?.get(e) && !this.hasAttribute(r._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: s, wrapped: n }, r) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, r ?? t ?? this[e]), n !== !0 || r !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), s === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [s, n] of this._$Ep) this[s] = n;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [s, n] of i) {
        const { wrapped: r } = n, c = this[s];
        r !== !0 || this._$AL.has(s) || c === void 0 || this.C(s, void 0, n, c);
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
K.elementStyles = [], K.shadowRootOptions = { mode: "open" }, K[se("elementProperties")] = /* @__PURE__ */ new Map(), K[se("finalized")] = /* @__PURE__ */ new Map(), It?.({ ReactiveElement: K }), (me.reactiveElementVersions ??= []).push("2.1.2");
const Te = globalThis, Be = (o) => o, he = Te.trustedTypes, qe = he ? he.createPolicy("lit-html", { createHTML: (o) => o }) : void 0, pt = "$lit$", F = `lit$${Math.random().toFixed(9).slice(2)}$`, ut = "?" + F, Ct = `<${ut}>`, B = document, oe = () => B.createComment(""), ne = (o) => o === null || typeof o != "object" && typeof o != "function", Ie = Array.isArray, Ot = (o) => Ie(o) || typeof o?.[Symbol.iterator] == "function", be = `[ 	
\f\r]`, ee = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ke = /-->/g, Ge = />/g, j = RegExp(`>|${be}(?:([^\\s"'>=/]+)(${be}*=${be}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Xe = /'/g, Qe = /"/g, ht = /^(?:script|style|textarea|title)$/i, _t = (o) => (e, ...t) => ({ _$litType$: o, strings: e, values: t }), d = _t(1), ye = _t(2), Q = /* @__PURE__ */ Symbol.for("lit-noChange"), u = /* @__PURE__ */ Symbol.for("lit-nothing"), Je = /* @__PURE__ */ new WeakMap(), H = B.createTreeWalker(B, 129);
function mt(o, e) {
  if (!Ie(o) || !o.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return qe !== void 0 ? qe.createHTML(e) : e;
}
const Pt = (o, e) => {
  const t = o.length - 1, i = [];
  let s, n = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", r = ee;
  for (let c = 0; c < t; c++) {
    const l = o[c];
    let _, m, h = -1, f = 0;
    for (; f < l.length && (r.lastIndex = f, m = r.exec(l), m !== null); ) f = r.lastIndex, r === ee ? m[1] === "!--" ? r = Ke : m[1] !== void 0 ? r = Ge : m[2] !== void 0 ? (ht.test(m[2]) && (s = RegExp("</" + m[2], "g")), r = j) : m[3] !== void 0 && (r = j) : r === j ? m[0] === ">" ? (r = s ?? ee, h = -1) : m[1] === void 0 ? h = -2 : (h = r.lastIndex - m[2].length, _ = m[1], r = m[3] === void 0 ? j : m[3] === '"' ? Qe : Xe) : r === Qe || r === Xe ? r = j : r === Ke || r === Ge ? r = ee : (r = j, s = void 0);
    const w = r === j && o[c + 1].startsWith("/>") ? " " : "";
    n += r === ee ? l + Ct : h >= 0 ? (i.push(_), l.slice(0, h) + pt + l.slice(h) + F + w) : l + F + (h === -2 ? c : w);
  }
  return [mt(o, n + (o[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class re {
  constructor({ strings: e, _$litType$: t }, i) {
    let s;
    this.parts = [];
    let n = 0, r = 0;
    const c = e.length - 1, l = this.parts, [_, m] = Pt(e, t);
    if (this.el = re.createElement(_, i), H.currentNode = this.el.content, t === 2 || t === 3) {
      const h = this.el.content.firstChild;
      h.replaceWith(...h.childNodes);
    }
    for (; (s = H.nextNode()) !== null && l.length < c; ) {
      if (s.nodeType === 1) {
        if (s.hasAttributes()) for (const h of s.getAttributeNames()) if (h.endsWith(pt)) {
          const f = m[r++], w = s.getAttribute(h).split(F), le = /([.?@])?(.*)/.exec(f);
          l.push({ type: 1, index: n, name: le[2], strings: w, ctor: le[1] === "." ? Dt : le[1] === "?" ? Ft : le[1] === "@" ? Rt : ve }), s.removeAttribute(h);
        } else h.startsWith(F) && (l.push({ type: 6, index: n }), s.removeAttribute(h));
        if (ht.test(s.tagName)) {
          const h = s.textContent.split(F), f = h.length - 1;
          if (f > 0) {
            s.textContent = he ? he.emptyScript : "";
            for (let w = 0; w < f; w++) s.append(h[w], oe()), H.nextNode(), l.push({ type: 2, index: ++n });
            s.append(h[f], oe());
          }
        }
      } else if (s.nodeType === 8) if (s.data === ut) l.push({ type: 2, index: n });
      else {
        let h = -1;
        for (; (h = s.data.indexOf(F, h + 1)) !== -1; ) l.push({ type: 7, index: n }), h += F.length - 1;
      }
      n++;
    }
  }
  static createElement(e, t) {
    const i = B.createElement("template");
    return i.innerHTML = e, i;
  }
}
function J(o, e, t = o, i) {
  if (e === Q) return e;
  let s = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const n = ne(e) ? void 0 : e._$litDirective$;
  return s?.constructor !== n && (s?._$AO?.(!1), n === void 0 ? s = void 0 : (s = new n(o), s._$AT(o, t, i)), i !== void 0 ? (t._$Co ??= [])[i] = s : t._$Cl = s), s !== void 0 && (e = J(o, s._$AS(o, e.values), s, i)), e;
}
class Nt {
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
    const { el: { content: t }, parts: i } = this._$AD, s = (e?.creationScope ?? B).importNode(t, !0);
    H.currentNode = s;
    let n = H.nextNode(), r = 0, c = 0, l = i[0];
    for (; l !== void 0; ) {
      if (r === l.index) {
        let _;
        l.type === 2 ? _ = new ae(n, n.nextSibling, this, e) : l.type === 1 ? _ = new l.ctor(n, l.name, l.strings, this, e) : l.type === 6 && (_ = new Ut(n, this, e)), this._$AV.push(_), l = i[++c];
      }
      r !== l?.index && (n = H.nextNode(), r++);
    }
    return H.currentNode = B, s;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class ae {
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
    e = J(this, e, t), ne(e) ? e === u || e == null || e === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : e !== this._$AH && e !== Q && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Ot(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== u && ne(this._$AH) ? this._$AA.nextSibling.data = e : this.T(B.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: i } = e, s = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = re.createElement(mt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === s) this._$AH.p(t);
    else {
      const n = new Nt(s, this), r = n.u(this.options);
      n.p(t), this.T(r), this._$AH = n;
    }
  }
  _$AC(e) {
    let t = Je.get(e.strings);
    return t === void 0 && Je.set(e.strings, t = new re(e)), t;
  }
  k(e) {
    Ie(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, s = 0;
    for (const n of e) s === t.length ? t.push(i = new ae(this.O(oe()), this.O(oe()), this, this.options)) : i = t[s], i._$AI(n), s++;
    s < t.length && (this._$AR(i && i._$AB.nextSibling, s), t.length = s);
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
  constructor(e, t, i, s, n) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = e, this.name = t, this._$AM = s, this.options = n, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = u;
  }
  _$AI(e, t = this, i, s) {
    const n = this.strings;
    let r = !1;
    if (n === void 0) e = J(this, e, t, 0), r = !ne(e) || e !== this._$AH && e !== Q, r && (this._$AH = e);
    else {
      const c = e;
      let l, _;
      for (e = n[0], l = 0; l < n.length - 1; l++) _ = J(this, c[i + l], t, l), _ === Q && (_ = this._$AH[l]), r ||= !ne(_) || _ !== this._$AH[l], _ === u ? e = u : e !== u && (e += (_ ?? "") + n[l + 1]), this._$AH[l] = _;
    }
    r && !s && this.j(e);
  }
  j(e) {
    e === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Dt extends ve {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === u ? void 0 : e;
  }
}
class Ft extends ve {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== u);
  }
}
class Rt extends ve {
  constructor(e, t, i, s, n) {
    super(e, t, i, s, n), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = J(this, e, t, 0) ?? u) === Q) return;
    const i = this._$AH, s = e === u && i !== u || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, n = e !== u && (i === u || s);
    s && this.element.removeEventListener(this.name, this, i), n && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Ut {
  constructor(e, t, i) {
    this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(e) {
    J(this, e);
  }
}
const Lt = Te.litHtmlPolyfillSupport;
Lt?.(re, ae), (Te.litHtmlVersions ??= []).push("3.3.3");
const Wt = (o, e, t) => {
  const i = t?.renderBefore ?? e;
  let s = i._$litPart$;
  if (s === void 0) {
    const n = t?.renderBefore ?? null;
    i._$litPart$ = s = new ae(e.insertBefore(oe(), n), n, void 0, t ?? {});
  }
  return s._$AI(o), s;
};
const Ce = globalThis;
class M extends K {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Wt(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return Q;
  }
}
M._$litElement$ = !0, M.finalized = !0, Ce.litElementHydrateSupport?.({ LitElement: M });
const jt = Ce.litElementPolyfillSupport;
jt?.({ LitElement: M });
(Ce.litElementVersions ??= []).push("4.2.2");
const Ht = { attribute: !0, type: String, converter: ue, reflect: !1, hasChanged: Me }, Zt = (o = Ht, e, t) => {
  const { kind: i, metadata: s } = t;
  let n = globalThis.litPropertyMetadata.get(s);
  if (n === void 0 && globalThis.litPropertyMetadata.set(s, n = /* @__PURE__ */ new Map()), i === "setter" && ((o = Object.create(o)).wrapped = !0), n.set(t.name, o), i === "accessor") {
    const { name: r } = t;
    return { set(c) {
      const l = e.get.call(this);
      e.set.call(this, c), this.requestUpdate(r, l, o, !0, c);
    }, init(c) {
      return c !== void 0 && this.C(r, void 0, o, c), c;
    } };
  }
  if (i === "setter") {
    const { name: r } = t;
    return function(c) {
      const l = this[r];
      e.call(this, c), this.requestUpdate(r, l, o, !0, c);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function g(o) {
  return (e, t) => typeof t == "object" ? Zt(o, e, t) : ((i, s, n) => {
    const r = s.hasOwnProperty(n);
    return s.constructor.createProperty(n, i), r ? Object.getOwnPropertyDescriptor(s, n) : void 0;
  })(o, e, t);
}
function p(o) {
  return g({ ...o, state: !0, attribute: !1 });
}
function v(o) {
  if (typeof o == "number" && Number.isFinite(o)) return o;
  if (typeof o == "string" && o.trim() !== "") {
    const e = Number(o);
    if (Number.isFinite(e)) return e;
  }
}
function C(o) {
  return typeof o == "string" && o !== "" ? o : void 0;
}
function Vt(o) {
  return Array.isArray(o) ? o : [];
}
function $e(o) {
  return !o || o.state === "unavailable" || o.state === "unknown";
}
function _e(o, e, t) {
  return Math.min(t, Math.max(e, o));
}
function L(o, e) {
  customElements.get(o) || customElements.define(o, e);
}
const ke = {
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
  "settings.forbidden_windows": "Forbidden windows",
  "settings.advanced_note": "Advanced parameters (engine, safety, notifications) live in Settings"
}, Bt = {
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
  "settings.forbidden_windows": "Finestre vietate",
  "settings.advanced_note": "Parametri avanzati (motore, sicurezza, notifiche) → Impostazioni"
}, vt = {
  en: ke,
  it: Bt
};
function O(o) {
  const t = (o?.locale?.language ?? o?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in vt ? t : "en";
}
function qt(o, e) {
  return e ? o.replace(/\{(\w+)\}/g, (t, i) => {
    const s = e[i];
    return s === void 0 ? t : String(s);
  }) : o;
}
function a(o, e, t) {
  const i = vt[o] ?? ke;
  return qt(i[e] ?? ke[e], t);
}
function Kt(o, e = 1) {
  const t = v(o);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (i) => e > 0 ? "" : i);
}
function Gt(o) {
  const e = Math.abs(Math.round(o)), t = Math.floor(e / 3600), i = Math.round(e % 3600 / 60), s = [];
  return t > 0 && s.push(`${t} h`), i > 0 && s.push(`${i} min`), s.length === 0 && s.push(`${e} s`), s.join(" ");
}
function Xt(o, e) {
  if (!o || typeof o != "object") return "";
  if (o.kind === "sun" && (o.event === "sunrise" || o.event === "sunset")) {
    const i = a(
      e,
      o.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), s = v(o.offset_s) ?? 0;
    if (s === 0) return i;
    const n = s < 0 ? "−" : "+";
    return `${i} ${n} ${Gt(s)}`;
  }
  const t = C(o.at) ?? C(o.time);
  return t ? a(e, "trigger.at", { time: t }) : C(o.kind) ?? "";
}
const Qt = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, Jt = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function Yt(o) {
  const e = {}, t = /* @__PURE__ */ new Map(), i = [];
  for (const n of Object.values(o.states)) {
    const r = C(n.attributes.maestro_role);
    if (!r) continue;
    i.push(n.entity_id);
    const c = C(n.attributes.zone_id);
    if (c) {
      let l = t.get(c);
      if (l || (l = {
        zoneId: c,
        name: c,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(c, l)), r === "cycle_enabled")
        l.cycleSwitches.push(n);
      else {
        const _ = Jt[r];
        _ && (l[_] = n);
      }
    } else {
      const l = Qt[r];
      l && (e[l] = n);
    }
  }
  const s = [...t.values()];
  for (const n of s) {
    const r = n.state?.attributes ?? {};
    n.name = C(r.zone_name) ?? C(n.state?.attributes.friendly_name) ?? n.zoneId, n.order = v(r.order) ?? v(n.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return s.sort(
    (n, r) => n.order - r.order || n.name.localeCompare(r.name)
  ), { found: i.length > 0, hub: e, zones: s, entityIds: i };
}
function ei(o) {
  const e = Vt(o.state?.attributes?.cycles), t = [];
  for (const i of e) {
    if (typeof i != "object" || i === null) continue;
    const s = i, n = {
      cycle_id: C(s.cycle_id),
      name: C(s.name),
      enabled: typeof s.enabled == "boolean" ? s.enabled : void 0,
      trigger: s.trigger ?? void 0,
      curve: s.curve ?? void 0
    }, r = s.days;
    Array.isArray(r) && (n.days = r.map((l) => v(l)).filter((l) => l !== void 0));
    const c = s.day_minutes;
    if (c && typeof c == "object") {
      const l = {};
      for (const [_, m] of Object.entries(c)) {
        const h = v(m);
        h !== void 0 && (l[_] = h);
      }
      n.day_minutes = l;
    }
    n.amount = v(s.amount), n.heat = v(s.heat), t.push(n);
  }
  return t;
}
const G = 12, Z = 25, X = 35, gt = 3, ft = 45, bt = 0, yt = 30, ti = (Z - G) / 10;
function Ye(o, e, t) {
  return Math.max(e, Math.min(t, o));
}
function D(o) {
  const e = Math.floor(o), t = o - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function Se(o, e) {
  const t = Math.max(0, D(o - ti * e));
  return [
    [G, t],
    [Z, o],
    [X, o + e]
  ];
}
function V(o, e, t, i) {
  const s = o[0], n = o[o.length - 1];
  let r;
  if (!s || !n)
    r = 0;
  else if (e <= s[0])
    r = s[1];
  else if (e >= n[0])
    r = n[1];
  else {
    r = n[1];
    for (let c = 0; c < o.length - 1; c++) {
      const l = o[c], _ = o[c + 1];
      if (!l || !_) continue;
      const [m, h] = l, [f, w] = _;
      if (m <= e && e <= f) {
        r = h + (w - h) * (e - m) / (f - m);
        break;
      }
    }
  }
  return t !== void 0 && (r = Math.max(r, t)), i !== void 0 && (r = Math.min(r, i)), r;
}
function et(o, e, t) {
  const i = V(o, Z, e, t), s = V(o, X, e, t);
  return {
    amount: Ye(D(i), gt, ft),
    heat: Ye(D(s - i), bt, yt)
  };
}
function ii(o) {
  if (!Array.isArray(o)) return [];
  const e = [];
  for (const t of o) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const i = v(t[0]), s = v(t[1]);
    i !== void 0 && s !== void 0 && e.push([i, s]);
  }
  return [...e].sort((t, i) => t[0] - i[0]);
}
const Y = [0, 1, 2, 3, 4, 5, 6], tt = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
};
function ge(o) {
  return tt[o] ?? tt.en;
}
function si(o) {
  return !o || o.length === 0 || o.length >= 7;
}
function Oe(o, e) {
  const t = new Set(o);
  return t.has(e) ? t.delete(e) : t.add(e), [...t].sort((i, s) => i - s);
}
function oi(o) {
  return !o || Object.keys(o).length === 0;
}
function xe(o, e) {
  return o.day_minutes?.[String(e)] ?? o.amount ?? 0;
}
function $t(o, e, t, i, s) {
  return D(V(Se(o, e), t, i, s));
}
var ni = Object.defineProperty, P = (o, e, t, i) => {
  for (var s = void 0, n = o.length - 1, r; n >= 0; n--)
    (r = o[n]) && (s = r(e, t, s) || s);
  return s && ni(e, t, s), s;
};
const we = 320, E = 170, te = 34, it = 12, ie = 16, T = 24, ce = 5, ze = 40, Pe = class Pe extends M {
  constructor() {
    super(...arguments), this.language = "en", this._amount = 15, this._heat = 15, this._min = 1, this._max = 120, this._advanced = !1, this._dragged = !1, this._points = Se(15, 15);
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = ii(e?.points);
    if (t.length === 0) return;
    const i = v(e?.min) ?? 1, s = v(e?.max) ?? 120, { amount: n, heat: r } = et(t, i, s);
    this._amount = n, this._heat = r, this._min = i, this._max = s, this._dragged = !1, this._points = [
      [G, D(V(t, G))],
      [Z, D(V(t, Z))],
      [X, D(V(t, X))]
    ];
  }
  _regen() {
    this._points = Se(this._amount, this._heat), this._dragged = !1;
  }
  _onAmount(e) {
    this._amount = Number(e.target.value), this._regen();
  }
  _onHeat(e) {
    this._heat = Number(e.target.value), this._regen();
  }
  _clampedValue(e) {
    return D(V(this._points, e, this._min, this._max));
  }
  _sx(e) {
    return te + (e - ce) / (ze - ce) * (we - te - it);
  }
  _graphTop() {
    return Math.max(12, ...this._points.map((e) => e[1])) + 4;
  }
  _sy(e) {
    const t = this._graphTop();
    return E - T - e / t * (E - ie - T);
  }
  _valueFromY(e) {
    const t = this._graphTop(), i = (E - T - e) / (E - ie - T) * t;
    return Math.max(0, D(i));
  }
  _startDrag(e, t) {
    if (!this._advanced) return;
    t.preventDefault();
    const i = t.currentTarget.ownerSVGElement;
    if (!i) return;
    const s = (r) => {
      const c = i.getScreenCTM();
      if (!c) return;
      const l = i.createSVGPoint();
      l.x = r.clientX, l.y = r.clientY;
      const _ = l.matrixTransform(c.inverse()).y, m = [...this._points], h = m[e];
      if (!h) return;
      m[e] = [h[0], this._valueFromY(_)], this._points = m, this._dragged = !0;
      const { amount: f, heat: w } = et(this._points);
      this._amount = f, this._heat = w;
    }, n = () => {
      window.removeEventListener("pointermove", s), window.removeEventListener("pointerup", n);
    };
    window.addEventListener("pointermove", s), window.addEventListener("pointerup", n);
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
    return this.cycle?.curve?.kind === "volume" ? d`<div class="volume-note">${a(e, "editor.volume_note")}</div>` : d`
      <div class="title">${a(e, "editor.title")}</div>

      <div class="field">
        <div class="row">
          <label>${a(e, "editor.amount.label")}</label>
          <span class="value">${a(e, "editor.amount.value", { min: this._amount })}</span>
        </div>
        <div class="help">${a(e, "editor.amount.help")}</div>
        <input type="range" min=${gt} max=${ft} .value=${String(this._amount)}
          @input=${this._onAmount} />
        <div class="ends"><span>${a(e, "editor.amount.low")}</span><span>${a(e, "editor.amount.high")}</span></div>
      </div>

      <div class="field">
        <div class="row">
          <label>${a(e, "editor.heat.label")}</label>
          <span class="value">${a(e, "editor.heat.value", { min: this._heat })}</span>
        </div>
        <div class="help">${a(e, "editor.heat.help")}</div>
        <input type="range" min=${bt} max=${yt} .value=${String(this._heat)}
          @input=${this._onHeat} />
        <div class="ends"><span>${a(e, "editor.heat.low")}</span><span>${a(e, "editor.heat.high")}</span></div>
      </div>

      <div class="graph-box">
        <div class="caption">${a(e, "editor.graph.caption")}</div>
        ${this._renderGraph(e)}
      </div>

      <div class="examples">
        ${this._exampleTile(a(e, "editor.example.cool"), this._clampedValue(G))}
        ${this._exampleTile(a(e, "editor.example.mild"), this._clampedValue(Z))}
        ${this._exampleTile(a(e, "editor.example.hot"), this._clampedValue(X))}
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
    return d`<div class="example"><div class="lbl">${e}</div><div class="num">${t} min</div></div>`;
  }
  _renderToday(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return u;
    const i = this._clampedValue(t);
    return d`<div class="today-banner">${a(e, "editor.today", {
      temp: Math.round(t),
      min: i
    })}</div>`;
  }
  _renderAdvanced(e) {
    return d`
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
    for (let r = ce; r <= ze; r += 1)
      t.push([this._sx(r), this._sy(this._clampedValue(r))]);
    const i = t.map((r, c) => `${c === 0 ? "M" : "L"}${r[0].toFixed(1)},${r[1].toFixed(1)}`).join(" "), s = this.weightedTemp, n = s !== void 0 && !Number.isNaN(s) && s >= ce && s <= ze;
    return ye`
      <svg viewBox="0 0 ${we} ${E}">
        <line class="axis" x1=${te} y1=${ie} x2=${te} y2=${E - T}></line>
        <line class="axis" x1=${te} y1=${E - T} x2=${we - it} y2=${E - T}></line>
        <text class="tick" x=${this._sx(G)} y=${E - T + 12} text-anchor="middle">12°</text>
        <text class="tick" x=${this._sx(Z)} y=${E - T + 12} text-anchor="middle">25°</text>
        <text class="tick" x=${this._sx(X)} y=${E - T + 12} text-anchor="middle">35°</text>
        ${n ? ye`<line class="today" x1=${this._sx(s)} y1=${ie} x2=${this._sx(s)} y2=${E - T}></line>
              <text class="today-text" x=${this._sx(s)} y=${ie - 4} text-anchor="middle">${a(e, "editor.graph.today", { temp: Math.round(s) })}</text>` : u}
        <path class="curve" d=${i}></path>
        ${this._points.map(
      (r, c) => ye`<circle class="handle" r=${this._advanced ? 7 : 3.5}
            cx=${this._sx(r[0]).toFixed(1)} cy=${this._sy(this._clampedValue(r[0])).toFixed(1)}
            @pointerdown=${(l) => this._startDrag(c, l)}></circle>`
    )}
      </svg>
    `;
  }
};
Pe.styles = U`
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
let z = Pe;
P([
  g()
], z.prototype, "language");
P([
  g({ attribute: !1 })
], z.prototype, "cycle");
P([
  g({ attribute: !1 })
], z.prototype, "weightedTemp");
P([
  p()
], z.prototype, "_amount");
P([
  p()
], z.prototype, "_heat");
P([
  p()
], z.prototype, "_min");
P([
  p()
], z.prototype, "_max");
P([
  p()
], z.prototype, "_advanced");
P([
  p()
], z.prototype, "_dragged");
P([
  p()
], z.prototype, "_points");
L("imc-curve-editor", z);
var ri = Object.defineProperty, S = (o, e, t, i) => {
  for (var s = void 0, n = o.length - 1, r; n >= 0; n--)
    (r = o[n]) && (s = r(e, t, s) || s);
  return s && ri(e, t, s), s;
};
const st = 15, ot = 1, nt = 1440, ai = -360, di = 360, li = 5, Ne = class Ne extends M {
  constructor() {
    super(...arguments), this.zoneId = "", this._days = [...Y], this._startKind = "time", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._uniformMinutes = st, this._dayMinutes = {}, this._sameForAll = !0, this._advancedOpen = !1;
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
    this._days = e.days && e.days.length > 0 ? [...e.days] : [...Y];
    const t = e.trigger;
    t?.kind === "sun" ? (this._startKind = "sun", this._startEvent = t.event === "sunset" ? "sunset" : "sunrise", this._startOffsetMin = Math.round((v(t.offset_s) ?? 0) / 60)) : (this._startKind = "time", this._startEvent = "sunrise", this._startOffsetMin = 0), this._startAt = t?.at ?? t?.time ?? "06:00", this._uniformMinutes = v(e.amount) ?? st, this._dayMinutes = e.day_minutes ? { ...e.day_minutes } : {}, this._sameForAll = oi(e.day_minutes);
  }
  render() {
    const e = this.cycle;
    if (!e) return d``;
    const t = O(this.hass), i = ge(t);
    return d`
      <div class="section-label">${a(t, "program_editor.days")}</div>
      <div class="days">
        ${i.map(
      (s, n) => d`
            <div
              class="day ${this._days.includes(n) ? "on" : ""}"
              @click=${() => this._days = Oe(this._days, n)}
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
      min: ai,
      max: di,
      step: li,
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

            ${this._renderWeatherLine(t, e)}
          `}
      ${this._days.length === 0 ? d`<div class="hint">${a(t, "panel.pick_a_day")}</div>` : u}

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
    return d`
      <div class="section-label">${a(e, "panel.heat_response")}</div>
      <imc-curve-editor
        .cycle=${this.cycle}
        .weightedTemp=${this.weightedTemp}
        .language=${O(this.hass)}
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
    return this._sameForAll ? d`<div class="duration-row">
        ${this._stepper(this._uniformMinutes, (s) => this._uniformMinutes = s, {
      min: ot,
      max: nt,
      step: 1,
      suffix: i
    })}
      </div>` : d`${this._days.map((s) => {
      const n = xe({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, s);
      return d`<div class="duration-row">
        <span class="dname">${t[s] ?? ""}</span>
        ${this._stepper(
        n,
        (r) => this._dayMinutes = { ...this._dayMinutes, [String(s)]: r },
        { min: ot, max: nt, step: 1, suffix: i }
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
          @click=${() => t(_e(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${s}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(_e(e + i.step, i.min, i.max))}
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
      return d`<div class="weather">${a(e, "reason.day_not_scheduled")}</div>`;
    const r = this._sameForAll ? this._uniformMinutes : xe({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, s), c = v(t.heat) ?? 8, l = $t(
      r,
      c,
      i,
      v(t.curve?.min),
      v(t.curve?.max)
    ), _ = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    });
    return d`<div class="weather">
      ${a(e, "panel.weather_line", { day: _, min: l })}
    </div>`;
  }
  _buildDayMinutes() {
    const e = {};
    for (const t of this._days)
      e[String(t)] = xe(
        { amount: this._uniformMinutes, day_minutes: this._dayMinutes },
        t
      );
    return e;
  }
  _save() {
    if (this._days.length === 0) return;
    const e = this.zoneId, t = this.cycle?.cycle_id ?? "", i = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin }, s = [...this._days].sort((c, l) => c - l), n = s.length >= 7 ? [] : s;
    if (this.dispatchEvent(
      new CustomEvent("imc-program-save-schedule", {
        detail: { zoneId: e, programId: t, days: n, start: i },
        bubbles: !0,
        composed: !0
      })
    ), this._isVolume) return;
    const r = this._sameForAll ? { zoneId: e, programId: t, minutes: this._uniformMinutes } : { zoneId: e, programId: t, dayMinutes: this._buildDayMinutes() };
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
Ne.styles = U`
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
let y = Ne;
S([
  g({ attribute: !1 })
], y.prototype, "hass");
S([
  g()
], y.prototype, "zoneId");
S([
  g({ attribute: !1 })
], y.prototype, "cycle");
S([
  g({ attribute: !1 })
], y.prototype, "weightedTemp");
S([
  p()
], y.prototype, "_days");
S([
  p()
], y.prototype, "_startKind");
S([
  p()
], y.prototype, "_startAt");
S([
  p()
], y.prototype, "_startEvent");
S([
  p()
], y.prototype, "_startOffsetMin");
S([
  p()
], y.prototype, "_uniformMinutes");
S([
  p()
], y.prototype, "_dayMinutes");
S([
  p()
], y.prototype, "_sameForAll");
S([
  p()
], y.prototype, "_advancedOpen");
L("imc-program-editor", y);
var ci = Object.defineProperty, N = (o, e, t, i) => {
  for (var s = void 0, n = o.length - 1, r; n >= 0; n--)
    (r = o[n]) && (s = r(e, t, s) || s);
  return s && ci(e, t, s), s;
};
const pi = 15, ui = 8, hi = 1, _i = 60, mi = 1, vi = 1440, gi = -360, fi = 360, bi = 5, rt = [0, 2, 4], at = [5, 6];
function dt(o, e) {
  return o.length !== e.length ? !1 : [...o].sort((i, s) => i - s).every((i, s) => i === e[s]);
}
const De = class De extends M {
  constructor() {
    super(...arguments), this.zoneId = "", this._step = 1, this._days = [...Y], this._startKind = "sun", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._minutes = pi;
  }
  render() {
    const e = O(this.hass);
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
              ?disabled=${this._days.length === 0}
              @click=${this._next}
            >
              ${a(e, "wizard.next")}
            </button>` : d`<button
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
    const t = ge(e);
    return d`
      <div class="days">
        ${t.map(
      (i, s) => d`
            <div
              class="day ${this._days.includes(s) ? "on" : ""}"
              @click=${() => this._days = Oe(this._days, s)}
            >
              ${i}
            </div>
          `
    )}
      </div>
      <div class="presets">
        <span
          class="preset ${this._days.length === 7 ? "sel" : ""}"
          @click=${() => this._days = [...Y]}
        >
          ${a(e, "wizard.preset_every_day")}
        </span>
        <span
          class="preset ${dt(this._days, rt) ? "sel" : ""}"
          @click=${() => this._days = [...rt]}
        >
          ${a(e, "wizard.preset_alternate")}
        </span>
        <span
          class="preset ${dt(this._days, at) ? "sel" : ""}"
          @click=${() => this._days = [...at]}
        >
          ${a(e, "wizard.preset_weekend")}
        </span>
      </div>
      ${this._days.length === 0 ? d`<div class="hint">${a(e, "panel.pick_a_day")}</div>` : u}
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
      min: gi,
      max: fi,
      step: bi,
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
      min: mi,
      max: vi,
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
    }), s = $t(
      this._minutes,
      ui,
      t,
      hi,
      _i
    );
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
          @click=${() => t(_e(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${s}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(_e(e + i.step, i.min, i.max))}
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
    const e = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin }, t = [...this._days].sort((s, n) => s - n), i = t.length >= 7 ? [] : t;
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
De.styles = U`
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
let k = De;
N([
  g({ attribute: !1 })
], k.prototype, "hass");
N([
  g()
], k.prototype, "zoneId");
N([
  g({ attribute: !1 })
], k.prototype, "weightedTemp");
N([
  p()
], k.prototype, "_step");
N([
  p()
], k.prototype, "_days");
N([
  p()
], k.prototype, "_startKind");
N([
  p()
], k.prototype, "_startAt");
N([
  p()
], k.prototype, "_startEvent");
N([
  p()
], k.prototype, "_startOffsetMin");
N([
  p()
], k.prototype, "_minutes");
L("imc-program-wizard", k);
var yi = Object.defineProperty, de = (o, e, t, i) => {
  for (var s = void 0, n = o.length - 1, r; n >= 0; n--)
    (r = o[n]) && (s = r(e, t, s) || s);
  return s && yi(e, t, s), s;
};
const Fe = class Fe extends M {
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
    if (!e || !t) return d``;
    const i = O(e), s = ei(t);
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
              @imc-wizard-finish=${() => this._wizardOpen = !1}
              @imc-wizard-cancel=${() => this._wizardOpen = !1}
            ></imc-program-wizard>` : d`<button class="add-btn" @click=${() => this._wizardOpen = !0}>
              ＋ ${a(e, "panel.add_program")}
            </button>`}
      </div>
    `;
  }
  _renderCycles(e, t, i, s) {
    const n = ge(e);
    return d`${s.map((r) => {
      const c = r.days ?? [], l = si(r.days), _ = !!r.cycle_id && this._editingId === r.cycle_id, m = r.cycle_id ? this._findCycleSwitch(i, r.cycle_id) : void 0, h = m?.state === "on";
      return d`
        <div class="prog">
          <div class="name">${r.name ?? r.cycle_id}</div>
          <div class="days">
            ${n.map(
        (f, w) => d`
                <div class="day ${l || c.includes(w) ? "on" : ""}">
                  ${f}
                </div>
              `
      )}
          </div>
          <div class="meta">
            ${Xt(r.trigger, e)} · ${this._minutesSummary(e, r)}
          </div>
          ${m ? d`<div
                class="toggle-row"
                role="switch"
                tabindex="0"
                aria-checked=${h ? "true" : "false"}
                @click=${() => this._onToggle(i.zoneId, r, m)}
                @keydown=${(f) => this._onToggleKeydown(f, i.zoneId, r, m)}
              >
                <span class="switch ${h ? "on" : ""}"></span>
                <span
                  >${a(
        e,
        h ? "zone.cycle_enabled" : "zone.cycle_disabled"
      )}</span
                >
              </div>` : u}
          ${r.cycle_id ? d`<div class="actions">
                <button
                  class="link-btn"
                  @click=${() => this._editingId = _ ? void 0 : r.cycle_id}
                >
                  ${a(e, "panel.edit_program")}
                </button>
                <button class="link-btn" @click=${() => this._onRename(e, i.zoneId, r)}>
                  ${a(e, "panel.rename_program")}
                </button>
                <button
                  class="link-btn danger"
                  @click=${() => this._onDelete(e, i.zoneId, r)}
                >
                  ${a(e, "panel.delete_program")}
                </button>
              </div>` : u}
          ${_ ? d`<imc-program-editor
                .hass=${t}
                .zoneId=${i.zoneId}
                .cycle=${r}
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
    return e.cycleSwitches.find((i) => C(i.attributes.cycle_id) === t);
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
    const s = i.name ?? "", n = window.prompt(a(e, "panel.rename_program"), s);
    if (n === null) return;
    const r = n.trim();
    !r || r === s || this._dispatch("imc-program-rename", {
      zoneId: t,
      programId: i.cycle_id,
      name: r
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
Fe.styles = U`
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
let R = Fe;
de([
  g({ attribute: !1 })
], R.prototype, "hass");
de([
  g({ attribute: !1 })
], R.prototype, "zone");
de([
  g({ attribute: !1 })
], R.prototype, "weightedTemp");
de([
  p()
], R.prototype, "_editingId");
de([
  p()
], R.prototype, "_wizardOpen");
L("imc-program-list", R);
var $i = Object.defineProperty, fe = (o, e, t, i) => {
  for (var s = void 0, n = o.length - 1, r; n >= 0; n--)
    (r = o[n]) && (s = r(e, t, s) || s);
  return s && $i(e, t, s), s;
};
function xi() {
  return typeof customElements < "u" && !!customElements.get("ha-selector");
}
const Re = class Re extends M {
  constructor() {
    super(...arguments), this.selector = { entity: {} }, this.value = "", this.label = "";
  }
  _emit(e) {
    this.value = e, this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: e }, bubbles: !0, composed: !0 })
    );
  }
  render() {
    return xi() ? d`<ha-selector
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
Re.styles = U`
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
let q = Re;
fe([
  g({ attribute: !1 })
], q.prototype, "hass");
fe([
  g({ attribute: !1 })
], q.prototype, "selector");
fe([
  g()
], q.prototype, "value");
fe([
  g()
], q.prototype, "label");
L("imc-entity-picker", q);
var wi = Object.defineProperty, x = (o, e, t, i) => {
  for (var s = void 0, n = o.length - 1, r; n >= 0; n--)
    (r = o[n]) && (s = r(e, t, s) || s);
  return s && wi(e, t, s), s;
};
const lt = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  it: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]
};
function zi(o) {
  return lt[o] ?? lt.en;
}
const Ue = class Ue extends M {
  constructor() {
    super(...arguments), this._name = "", this._valve = "", this._flowSensor = "", this._compatibilityGroup = "", this._seasonMonths = [], this._advancedOpen = !1;
  }
  willUpdate(e) {
    (e.has("zone") || e.has("zoneId")) && this.zoneId !== this._seededZoneId && (this._seededZoneId = this.zoneId, this._seedFromZone());
  }
  _seedFromZone() {
    const e = this.zone;
    this._name = e?.name ?? "", this._valve = e?.valve_entity ?? "", this._areaM2 = e?.area_m2, this._flowSensor = e?.flow_sensor ?? "", this._nominalFlowLpm = e?.nominal_flow_lpm, this._flowTolerancePct = e?.flow_tolerance_pct, this._adjustmentPct = e?.adjustment_pct, this._order = e?.order, this._intervalDays = e?.interval_days, this._compatibilityGroup = e?.compatibility_group ?? "", this._seasonMonths = e?.season_months ? [...e.season_months] : [], this._advancedOpen = !1;
  }
  get _canSave() {
    return this._name.trim() !== "" && this._valve.trim() !== "";
  }
  render() {
    const e = O(this.hass), t = !!this.zone;
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
        @input=${(i) => this._areaM2 = v(i.target.value)}
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
        @input=${(t) => this._nominalFlowLpm = v(t.target.value)}
      />

      <div class="section-label">${a(e, "zone.field_flow_tolerance")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="100"
        step="1"
        .value=${this._flowTolerancePct ?? ""}
        @input=${(t) => this._flowTolerancePct = v(t.target.value)}
      />

      <div class="section-label">${a(e, "zone.field_adjustment")}</div>
      <input
        class="field"
        type="number"
        min="10"
        max="300"
        step="1"
        .value=${this._adjustmentPct ?? ""}
        @input=${(t) => this._adjustmentPct = v(t.target.value)}
      />

      <div class="section-label">${a(e, "zone.field_order")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="1000"
        step="1"
        .value=${this._order ?? ""}
        @input=${(t) => this._order = v(t.target.value)}
      />

      <div class="section-label">${a(e, "zone.field_interval")}</div>
      <input
        class="field"
        type="number"
        min="1"
        max="60"
        step="1"
        .value=${this._intervalDays ?? ""}
        @input=${(t) => this._intervalDays = v(t.target.value)}
      />

      <div class="section-label">${a(e, "zone.field_season")}</div>
      <div class="months">
        ${zi(e).map((t, i) => {
      const s = i + 1;
      return d`
            <div
              class="month ${this._seasonMonths.includes(s) ? "on" : ""}"
              @click=${() => this._seasonMonths = this._toggleMonth(s)}
            >
              ${t}
            </div>
          `;
    })}
      </div>

      <div class="section-label">${a(e, "zone.field_group")}</div>
      <input
        class="field"
        type="text"
        .value=${this._compatibilityGroup}
        @input=${(t) => this._compatibilityGroup = t.target.value}
      />
    `;
  }
  _toggleMonth(e) {
    const t = new Set(this._seasonMonths);
    return t.has(e) ? t.delete(e) : t.add(e), [...t].sort((i, s) => i - s);
  }
  _save() {
    if (!this._canSave) return;
    const e = !!this.zone, t = {
      name: this._name.trim(),
      valve_entity: this._valve.trim()
    };
    this._areaM2 !== void 0 && (t.area_m2 = this._areaM2), e && (this._flowSensor.trim() !== "" && (t.flow_sensor = this._flowSensor.trim()), this._nominalFlowLpm !== void 0 && (t.nominal_flow_lpm = this._nominalFlowLpm), this._flowTolerancePct !== void 0 && (t.flow_tolerance_pct = this._flowTolerancePct), this._adjustmentPct !== void 0 && (t.adjustment_pct = this._adjustmentPct), this._order !== void 0 && (t.order = this._order), this._intervalDays !== void 0 && (t.interval_days = this._intervalDays), this._compatibilityGroup.trim() !== "" && (t.compatibility_group = this._compatibilityGroup.trim()), this._seasonMonths.length > 0 && (t.season_months = [...this._seasonMonths])), this.dispatchEvent(
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
    const t = O(this.hass);
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
Ue.styles = U`
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
let b = Ue;
x([
  g({ attribute: !1 })
], b.prototype, "hass");
x([
  g({ attribute: !1 })
], b.prototype, "zone");
x([
  g()
], b.prototype, "zoneId");
x([
  p()
], b.prototype, "_name");
x([
  p()
], b.prototype, "_valve");
x([
  p()
], b.prototype, "_areaM2");
x([
  p()
], b.prototype, "_flowSensor");
x([
  p()
], b.prototype, "_nominalFlowLpm");
x([
  p()
], b.prototype, "_flowTolerancePct");
x([
  p()
], b.prototype, "_adjustmentPct");
x([
  p()
], b.prototype, "_order");
x([
  p()
], b.prototype, "_intervalDays");
x([
  p()
], b.prototype, "_compatibilityGroup");
x([
  p()
], b.prototype, "_seasonMonths");
x([
  p()
], b.prototype, "_advancedOpen");
L("imc-zone-editor", b);
var ki = Object.defineProperty, A = (o, e, t, i) => {
  for (var s = void 0, n = o.length - 1, r; n >= 0; n--)
    (r = o[n]) && (s = r(e, t, s) || s);
  return s && ki(e, t, s), s;
};
const Si = { start: "22:00", end: "06:00" };
function Ai(o) {
  return o === "reduce" || o === "suspend" ? o : "notify";
}
function Ei(o) {
  return o === "odd" || o === "even" ? o : "none";
}
const Le = class Le extends M {
  constructor() {
    super(...arguments), this.options = {}, this._weatherEntity = "", this._rainSensor = "", this._outdoorTempSensor = "", this._lineFlowSensor = "", this._masterValve = "", this._action = "notify", this._allowedWeekdays = [...Y], this._parity = "none", this._forbiddenWindows = [];
  }
  willUpdate(e) {
    e.has("options") && this._seedFromOptions();
  }
  _seedFromOptions() {
    const e = this.options ?? {};
    this._weatherEntity = e.weather_entity ?? "", this._rainSensor = e.rain_sensor ?? "", this._outdoorTempSensor = e.outdoor_temp_sensor ?? "", this._lineFlowSensor = e.line_flow_sensor ?? "", this._masterValve = e.master_valve ?? "";
    const t = e.consumption_budget;
    this._litersPerMonth = t?.liters_per_month, this._action = Ai(t?.action), this._reducePct = t?.reduce_pct;
    const i = e.restrictions, s = i?.allowed_weekdays;
    this._allowedWeekdays = s && s.length > 0 && s.length < 7 ? [...s].sort((n, r) => n - r) : [...Y], this._parity = Ei(i?.parity), this._forbiddenWindows = i?.forbidden_windows ? i.forbidden_windows.map((n) => ({ ...n })) : [];
  }
  get _canSaveWeather() {
    return this._weatherEntity.trim() !== "";
  }
  render() {
    const e = O(this.hass);
    return d`
      <div class="topbar">
        <span class="back" @click=${this._back}>‹ ${a(e, "wizard.back")}</span>
        <span class="title">${a(e, "settings.title")}</span>
      </div>

      ${this._renderWeatherSection(e)} ${this._renderBudgetSection(e)}
      ${this._renderRestrictionsSection(e)}

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
            <div class="section-label">${a(e, "settings.rain")}</div>
            <imc-entity-picker
              .hass=${this.hass}
              .selector=${{ entity: { domain: "sensor" } }}
              .value=${this._rainSensor}
              .label=${a(e, "settings.rain")}
              @value-changed=${(t) => this._rainSensor = t.detail.value}
            ></imc-entity-picker>
          </div>
          <div>
            <div class="section-label">${a(e, "settings.outdoor_temp")}</div>
            <imc-entity-picker
              .hass=${this.hass}
              .selector=${{ entity: { domain: "sensor" } }}
              .value=${this._outdoorTempSensor}
              .label=${a(e, "settings.outdoor_temp")}
              @value-changed=${(t) => this._outdoorTempSensor = t.detail.value}
            ></imc-entity-picker>
          </div>
        </div>

        <div class="two">
          <div>
            <div class="section-label">${a(e, "settings.line_flow")}</div>
            <imc-entity-picker
              .hass=${this.hass}
              .selector=${{ entity: { domain: "sensor" } }}
              .value=${this._lineFlowSensor}
              .label=${a(e, "settings.line_flow")}
              @value-changed=${(t) => this._lineFlowSensor = t.detail.value}
            ></imc-entity-picker>
          </div>
          <div>
            <div class="section-label">${a(e, "settings.master_valve")}</div>
            <imc-entity-picker
              .hass=${this.hass}
              .selector=${{ entity: { domain: ["valve", "switch"] } }}
              .value=${this._masterValve}
              .label=${a(e, "settings.master_valve")}
              @value-changed=${(t) => this._masterValve = t.detail.value}
            ></imc-entity-picker>
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
              @input=${(t) => this._litersPerMonth = v(t.target.value)}
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
                @input=${(t) => this._reducePct = v(t.target.value)}
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
    const t = ge(e);
    return d`
      <div class="sec">
        <div class="header">📅 ${a(e, "settings.restrictions")}</div>

        <div class="section-label">${a(e, "settings.allowed_days")}</div>
        <div class="days">
          ${t.map(
      (i, s) => d`
              <div
                class="day ${this._allowedWeekdays.includes(s) ? "on" : ""}"
                @click=${() => this._allowedWeekdays = Oe(this._allowedWeekdays, s)}
              >
                ${i}
              </div>
            `
    )}
        </div>

        <span class="seg parity-seg">
          <span
            class="${this._parity === "none" ? "sel" : ""}"
            @click=${() => this._parity = "none"}
            >${a(e, "settings.parity_all")}</span
          >
          <span
            class="${this._parity === "odd" ? "sel" : ""}"
            @click=${() => this._parity = "odd"}
            >${a(e, "settings.parity_odd")}</span
          >
          <span
            class="${this._parity === "even" ? "sel" : ""}"
            @click=${() => this._parity = "even"}
            >${a(e, "settings.parity_even")}</span
          >
        </span>

        <div class="section-label">${a(e, "settings.forbidden_windows")}</div>
        ${this._forbiddenWindows.map(
      (i, s) => d`
            <div class="window-row">
              <input
                class="field"
                type="time"
                .value=${i.start}
                @input=${(n) => this._updateWindow(s, "start", n.target.value)}
              />
              <span class="window-sep">–</span>
              <input
                class="field"
                type="time"
                .value=${i.end}
                @input=${(n) => this._updateWindow(s, "end", n.target.value)}
              />
              <button
                class="icon-btn"
                type="button"
                @click=${() => this._removeWindow(s)}
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
      (s, n) => n === e ? { ...s, [t]: i } : s
    );
  }
  _addWindow() {
    this._forbiddenWindows = [...this._forbiddenWindows, { ...Si }];
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
    const e = [...this._allowedWeekdays].sort((i, s) => i - s), t = {
      allowed_weekdays: e.length === 0 || e.length >= 7 ? [] : e,
      parity: this._parity,
      forbidden_windows: this._forbiddenWindows.map((i) => ({ start: i.start, end: i.end }))
    };
    this.dispatchEvent(
      new CustomEvent("imc-settings-save-restrictions", {
        detail: t,
        bubbles: !0,
        composed: !0
      })
    );
  }
  _back() {
    this.dispatchEvent(new CustomEvent("imc-settings-back", { bubbles: !0, composed: !0 }));
  }
};
Le.styles = U`
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
    .parity-seg {
      margin-top: 10px;
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
let $ = Le;
A([
  g({ attribute: !1 })
], $.prototype, "hass");
A([
  g({ attribute: !1 })
], $.prototype, "options");
A([
  p()
], $.prototype, "_weatherEntity");
A([
  p()
], $.prototype, "_rainSensor");
A([
  p()
], $.prototype, "_outdoorTempSensor");
A([
  p()
], $.prototype, "_lineFlowSensor");
A([
  p()
], $.prototype, "_masterValve");
A([
  p()
], $.prototype, "_litersPerMonth");
A([
  p()
], $.prototype, "_action");
A([
  p()
], $.prototype, "_reducePct");
A([
  p()
], $.prototype, "_allowedWeekdays");
A([
  p()
], $.prototype, "_parity");
A([
  p()
], $.prototype, "_forbiddenWindows");
L("imc-settings-view", $);
function Mi(o) {
  const e = JSON.parse(o);
  return { options: e.options ?? {}, zones: e.zones ?? {} };
}
var Ti = Object.defineProperty, W = (o, e, t, i) => {
  for (var s = void 0, n = o.length - 1, r; n >= 0; n--)
    (r = o[n]) && (s = r(e, t, s) || s);
  return s && Ti(e, t, s), s;
};
const We = class We extends M {
  constructor() {
    super(...arguments), this.narrow = !1, this._view = "zones", this._relevantIds = [], this._statesCount = 0;
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
      } catch (n) {
        const r = n instanceof Error ? n.message : String(n);
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
        return Mi(t);
      } catch {
        return;
      }
  }
  async _onEditZone(e) {
    const t = await this._readConfig();
    t ? (this._editingZoneId = e, this._editingZone = t.zones[e] ?? {}) : this._showError(a(O(this.hass), "panel.config_read_failed"));
  }
  /**
   * ⚙️ header button: opens the everyday-settings view (spec §1.3), seeded
   * from a fresh `export_config` read — same "read-before-open" pattern as
   * `_onEditZone` above, including the shared `config_read_failed` error
   * path when the read fails or the payload is unusable.
   */
  async _onOpenSettings() {
    const e = await this._readConfig();
    e ? (this._options = e.options, this._view = "settings") : this._showError(a(O(this.hass), "panel.config_read_failed"));
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
      const s = t.patch, n = { name: s.name, valve_entity: s.valve_entity };
      s.area_m2 !== void 0 && (n.area_m2 = s.area_m2), s.icon !== void 0 && (n.icon = s.icon);
      const c = (await this._call("irrigation_maestro", "add_zone", n, !0))?.response?.zone_id;
      i = typeof c == "string" && c !== "", i && (this._selectedZoneId = c);
    } else
      i = !!await this._call("irrigation_maestro", "update_zone", {
        zone_id: t.zoneId,
        ...t.patch
      });
    i && (this._editingZone = void 0, this._editingZoneId = void 0);
  }
  async _onZoneRemove(e) {
    await this._call("irrigation_maestro", "remove_zone", { zone_id: e.detail.zoneId }), this._editingZone = void 0, this._editingZoneId = void 0, this._selectedZoneId = void 0;
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
  _onSaveWeather(e) {
    this._call("irrigation_maestro", "set_weather_sources", { ...e.detail });
  }
  _onSaveBudget(e) {
    this._call("irrigation_maestro", "set_consumption_budget", { ...e.detail });
  }
  _onSaveRestrictions(e) {
    this._call("irrigation_maestro", "set_restrictions", { ...e.detail });
  }
  _onSettingsBack() {
    this._view = "zones";
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
        (n) => t.states[n] !== i.states[n]
      );
    }
    return !0;
  }
  render() {
    const e = this.hass;
    if (!e) return d``;
    const t = O(e), i = Yt(e);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(e.states).length, this._editingZone !== void 0)
      return d`
        <div
          class="wrap ${this.narrow ? "narrow" : ""}"
          @imc-zone-save=${this._onZoneSave}
          @imc-zone-remove=${this._onZoneRemove}
          @imc-zone-cancel=${this._onZoneCancel}
        >
          <header><h1>${a(t, "panel.title")}</h1></header>
          ${this._error ? d`<div class="error">${this._error}</div>` : u}
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
          @imc-settings-back=${this._onSettingsBack}
        >
          <header><h1>${a(t, "panel.title")}</h1></header>
          ${this._error ? d`<div class="error">${this._error}</div>` : u}
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
          ${this._error ? d`<div class="error">${this._error}</div>` : u}
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
    const s = this._resolveSelected(i.zones), n = $e(i.hub.weightedTemp) ? void 0 : v(i.hub.weightedTemp?.state);
    return d`
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
        <header>
          <h1>${a(t, "panel.title")}</h1>
          <span class="settings-btn" @click=${this._onOpenSettings}>
            ⚙️ ${a(t, "settings.title")}
          </span>
        </header>
        ${this._renderWeatherContext(i, t, n)}
        ${this._error ? d`<div class="error">${this._error}</div>` : u}
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
          .weightedTemp=${n}
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
    const s = $e(e.hub.waterBudget) ? void 0 : v(e.hub.waterBudget?.state), n = $e(e.hub.skipThreshold) ? void 0 : v(e.hub.skipThreshold?.state), r = s !== void 0 && n !== void 0 ? s >= n ? "panel.budget_ok" : "panel.budget_low" : void 0;
    return d`
      <div class="meteo">
        ${a(t, "panel.weather_temp", { temp: Kt(i, 1) ?? "" })}
        ${r ? d` · ${a(t, r)}` : u}
      </div>
    `;
  }
};
We.styles = U`
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
  `;
let I = We;
W([
  g({ attribute: !1 })
], I.prototype, "hass");
W([
  g({ type: Boolean })
], I.prototype, "narrow");
W([
  p()
], I.prototype, "_selectedZoneId");
W([
  p()
], I.prototype, "_error");
W([
  p()
], I.prototype, "_editingZone");
W([
  p()
], I.prototype, "_editingZoneId");
W([
  p()
], I.prototype, "_view");
W([
  p()
], I.prototype, "_options");
L("irrigation-maestro-panel", I);
