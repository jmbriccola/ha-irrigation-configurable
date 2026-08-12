/*!
 * irrigation-maestro
 * Custom frontend for the Irrigation Maestro Home Assistant integration.
 * Copyright (c) Jacopo Maria Briccola
 * @license MIT
 */
const de = globalThis, ze = de.ShadowRoot && (de.ShadyCSS === void 0 || de.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Ae = /* @__PURE__ */ Symbol(), Fe = /* @__PURE__ */ new WeakMap();
let nt = class {
  constructor(e, t, i) {
    if (this._$cssResult$ = !0, i !== Ae) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = e, this.t = t;
  }
  get styleSheet() {
    let e = this.o;
    const t = this.t;
    if (ze && e === void 0) {
      const i = t !== void 0 && t.length === 1;
      i && (e = Fe.get(t)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), i && Fe.set(t, e));
    }
    return e;
  }
  toString() {
    return this.cssText;
  }
};
const bt = (s) => new nt(typeof s == "string" ? s : s + "", void 0, Ae), Z = (s, ...e) => {
  const t = s.length === 1 ? s[0] : e.reduce((i, o, r) => i + ((n) => {
    if (n._$cssResult$ === !0) return n.cssText;
    if (typeof n == "number") return n;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + n + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(o) + s[r + 1], s[0]);
  return new nt(t, s, Ae);
}, yt = (s, e) => {
  if (ze) s.adoptedStyleSheets = e.map((t) => t instanceof CSSStyleSheet ? t : t.styleSheet);
  else for (const t of e) {
    const i = document.createElement("style"), o = de.litNonce;
    o !== void 0 && i.setAttribute("nonce", o), i.textContent = t.cssText, s.appendChild(i);
  }
}, Le = ze ? (s) => s : (s) => s instanceof CSSStyleSheet ? ((e) => {
  let t = "";
  for (const i of e.cssRules) t += i.cssText;
  return bt(t);
})(s) : s;
const { is: $t, defineProperty: xt, getOwnPropertyDescriptor: wt, getOwnPropertyNames: zt, getOwnPropertySymbols: At, getPrototypeOf: kt } = Object, he = globalThis, Re = he.trustedTypes, St = Re ? Re.emptyScript : "", Et = he.reactiveElementPolyfillSupport, ee = (s, e) => s, le = { toAttribute(s, e) {
  switch (e) {
    case Boolean:
      s = s ? St : null;
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
} }, ke = (s, e) => !$t(s, e), je = { attribute: !0, type: String, converter: le, reflect: !1, useDefault: !1, hasChanged: ke };
Symbol.metadata ??= /* @__PURE__ */ Symbol("metadata"), he.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
let q = class extends HTMLElement {
  static addInitializer(e) {
    this._$Ei(), (this.l ??= []).push(e);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(e, t = je) {
    if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
      const i = /* @__PURE__ */ Symbol(), o = this.getPropertyDescriptor(e, i, t);
      o !== void 0 && xt(this.prototype, e, o);
    }
  }
  static getPropertyDescriptor(e, t, i) {
    const { get: o, set: r } = wt(this.prototype, e) ?? { get() {
      return this[t];
    }, set(n) {
      this[t] = n;
    } };
    return { get: o, set(n) {
      const c = o?.call(this);
      r?.call(this, n), this.requestUpdate(e, c, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(e) {
    return this.elementProperties.get(e) ?? je;
  }
  static _$Ei() {
    if (this.hasOwnProperty(ee("elementProperties"))) return;
    const e = kt(this);
    e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(ee("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(ee("properties"))) {
      const t = this.properties, i = [...zt(t), ...At(t)];
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
      for (const o of i) t.unshift(Le(o));
    } else e !== void 0 && t.push(Le(e));
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
    return yt(e, this.constructor.elementStyles), e;
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
      const r = (i.converter?.toAttribute !== void 0 ? i.converter : le).toAttribute(t, i.type);
      this._$Em = e, r == null ? this.removeAttribute(o) : this.setAttribute(o, r), this._$Em = null;
    }
  }
  _$AK(e, t) {
    const i = this.constructor, o = i._$Eh.get(e);
    if (o !== void 0 && this._$Em !== o) {
      const r = i.getPropertyOptions(o), n = typeof r.converter == "function" ? { fromAttribute: r.converter } : r.converter?.fromAttribute !== void 0 ? r.converter : le;
      this._$Em = o;
      const c = n.fromAttribute(t, r.type);
      this[o] = c ?? this._$Ej?.get(o) ?? c, this._$Em = null;
    }
  }
  requestUpdate(e, t, i, o = !1, r) {
    if (e !== void 0) {
      const n = this.constructor;
      if (o === !1 && (r = this[e]), i ??= n.getPropertyOptions(e), !((i.hasChanged ?? ke)(r, t) || i.useDefault && i.reflect && r === this._$Ej?.get(e) && !this.hasAttribute(n._$Eu(e, i)))) return;
      this.C(e, t, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(e, t, { useDefault: i, reflect: o, wrapped: r }, n) {
    i && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, n ?? t ?? this[e]), r !== !0 || n !== void 0) || (this._$AL.has(e) || (this.hasUpdated || i || (t = void 0), this._$AL.set(e, t)), o === !0 && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
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
        for (const [o, r] of this._$Ep) this[o] = r;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [o, r] of i) {
        const { wrapped: n } = r, c = this[o];
        n !== !0 || this._$AL.has(o) || c === void 0 || this.C(o, void 0, r, c);
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
q.elementStyles = [], q.shadowRootOptions = { mode: "open" }, q[ee("elementProperties")] = /* @__PURE__ */ new Map(), q[ee("finalized")] = /* @__PURE__ */ new Map(), Et?.({ ReactiveElement: q }), (he.reactiveElementVersions ??= []).push("2.1.2");
const Se = globalThis, He = (s) => s, ce = Se.trustedTypes, Ze = ce ? ce.createPolicy("lit-html", { createHTML: (s) => s }) : void 0, at = "$lit$", O = `lit$${Math.random().toFixed(9).slice(2)}$`, dt = "?" + O, Mt = `<${dt}>`, j = document, te = () => j.createComment(""), ie = (s) => s === null || typeof s != "object" && typeof s != "function", Ee = Array.isArray, Tt = (s) => Ee(s) || typeof s?.[Symbol.iterator] == "function", ve = `[ 	
\f\r]`, Q = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Ve = /-->/g, qe = />/g, U = RegExp(`>|${ve}(?:([^\\s"'>=/]+)(${ve}*=${ve}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Be = /'/g, We = /"/g, lt = /^(?:script|style|textarea|title)$/i, ct = (s) => (e, ...t) => ({ _$litType$: s, strings: e, values: t }), l = ct(1), fe = ct(2), K = /* @__PURE__ */ Symbol.for("lit-noChange"), u = /* @__PURE__ */ Symbol.for("lit-nothing"), Ke = /* @__PURE__ */ new WeakMap(), F = j.createTreeWalker(j, 129);
function pt(s, e) {
  if (!Ee(s) || !s.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Ze !== void 0 ? Ze.createHTML(e) : e;
}
const It = (s, e) => {
  const t = s.length - 1, i = [];
  let o, r = e === 2 ? "<svg>" : e === 3 ? "<math>" : "", n = Q;
  for (let c = 0; c < t; c++) {
    const d = s[c];
    let _, m, h = -1, g = 0;
    for (; g < d.length && (n.lastIndex = g, m = n.exec(d), m !== null); ) g = n.lastIndex, n === Q ? m[1] === "!--" ? n = Ve : m[1] !== void 0 ? n = qe : m[2] !== void 0 ? (lt.test(m[2]) && (o = RegExp("</" + m[2], "g")), n = U) : m[3] !== void 0 && (n = U) : n === U ? m[0] === ">" ? (n = o ?? Q, h = -1) : m[1] === void 0 ? h = -2 : (h = n.lastIndex - m[2].length, _ = m[1], n = m[3] === void 0 ? U : m[3] === '"' ? We : Be) : n === We || n === Be ? n = U : n === Ve || n === qe ? n = Q : (n = U, o = void 0);
    const x = n === U && s[c + 1].startsWith("/>") ? " " : "";
    r += n === Q ? d + Mt : h >= 0 ? (i.push(_), d.slice(0, h) + at + d.slice(h) + O + x) : d + O + (h === -2 ? c : x);
  }
  return [pt(s, r + (s[t] || "<?>") + (e === 2 ? "</svg>" : e === 3 ? "</math>" : "")), i];
};
class oe {
  constructor({ strings: e, _$litType$: t }, i) {
    let o;
    this.parts = [];
    let r = 0, n = 0;
    const c = e.length - 1, d = this.parts, [_, m] = It(e, t);
    if (this.el = oe.createElement(_, i), F.currentNode = this.el.content, t === 2 || t === 3) {
      const h = this.el.content.firstChild;
      h.replaceWith(...h.childNodes);
    }
    for (; (o = F.nextNode()) !== null && d.length < c; ) {
      if (o.nodeType === 1) {
        if (o.hasAttributes()) for (const h of o.getAttributeNames()) if (h.endsWith(at)) {
          const g = m[n++], x = o.getAttribute(h).split(O), ne = /([.?@])?(.*)/.exec(g);
          d.push({ type: 1, index: r, name: ne[2], strings: x, ctor: ne[1] === "." ? Nt : ne[1] === "?" ? Ot : ne[1] === "@" ? Pt : _e }), o.removeAttribute(h);
        } else h.startsWith(O) && (d.push({ type: 6, index: r }), o.removeAttribute(h));
        if (lt.test(o.tagName)) {
          const h = o.textContent.split(O), g = h.length - 1;
          if (g > 0) {
            o.textContent = ce ? ce.emptyScript : "";
            for (let x = 0; x < g; x++) o.append(h[x], te()), F.nextNode(), d.push({ type: 2, index: ++r });
            o.append(h[g], te());
          }
        }
      } else if (o.nodeType === 8) if (o.data === dt) d.push({ type: 2, index: r });
      else {
        let h = -1;
        for (; (h = o.data.indexOf(O, h + 1)) !== -1; ) d.push({ type: 7, index: r }), h += O.length - 1;
      }
      r++;
    }
  }
  static createElement(e, t) {
    const i = j.createElement("template");
    return i.innerHTML = e, i;
  }
}
function G(s, e, t = s, i) {
  if (e === K) return e;
  let o = i !== void 0 ? t._$Co?.[i] : t._$Cl;
  const r = ie(e) ? void 0 : e._$litDirective$;
  return o?.constructor !== r && (o?._$AO?.(!1), r === void 0 ? o = void 0 : (o = new r(s), o._$AT(s, t, i)), i !== void 0 ? (t._$Co ??= [])[i] = o : t._$Cl = o), o !== void 0 && (e = G(s, o._$AS(s, e.values), o, i)), e;
}
class Ct {
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
    const { el: { content: t }, parts: i } = this._$AD, o = (e?.creationScope ?? j).importNode(t, !0);
    F.currentNode = o;
    let r = F.nextNode(), n = 0, c = 0, d = i[0];
    for (; d !== void 0; ) {
      if (n === d.index) {
        let _;
        d.type === 2 ? _ = new se(r, r.nextSibling, this, e) : d.type === 1 ? _ = new d.ctor(r, d.name, d.strings, this, e) : d.type === 6 && (_ = new Dt(r, this, e)), this._$AV.push(_), d = i[++c];
      }
      n !== d?.index && (r = F.nextNode(), n++);
    }
    return F.currentNode = j, o;
  }
  p(e) {
    let t = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(e, i, t), t += i.strings.length - 2) : i._$AI(e[t])), t++;
  }
}
class se {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(e, t, i, o) {
    this.type = 2, this._$AH = u, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = i, this.options = o, this._$Cv = o?.isConnected ?? !0;
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
    e = G(this, e, t), ie(e) ? e === u || e == null || e === "" ? (this._$AH !== u && this._$AR(), this._$AH = u) : e !== this._$AH && e !== K && this._(e) : e._$litType$ !== void 0 ? this.$(e) : e.nodeType !== void 0 ? this.T(e) : Tt(e) ? this.k(e) : this._(e);
  }
  O(e) {
    return this._$AA.parentNode.insertBefore(e, this._$AB);
  }
  T(e) {
    this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
  }
  _(e) {
    this._$AH !== u && ie(this._$AH) ? this._$AA.nextSibling.data = e : this.T(j.createTextNode(e)), this._$AH = e;
  }
  $(e) {
    const { values: t, _$litType$: i } = e, o = typeof i == "number" ? this._$AC(e) : (i.el === void 0 && (i.el = oe.createElement(pt(i.h, i.h[0]), this.options)), i);
    if (this._$AH?._$AD === o) this._$AH.p(t);
    else {
      const r = new Ct(o, this), n = r.u(this.options);
      r.p(t), this.T(n), this._$AH = r;
    }
  }
  _$AC(e) {
    let t = Ke.get(e.strings);
    return t === void 0 && Ke.set(e.strings, t = new oe(e)), t;
  }
  k(e) {
    Ee(this._$AH) || (this._$AH = [], this._$AR());
    const t = this._$AH;
    let i, o = 0;
    for (const r of e) o === t.length ? t.push(i = new se(this.O(te()), this.O(te()), this, this.options)) : i = t[o], i._$AI(r), o++;
    o < t.length && (this._$AR(i && i._$AB.nextSibling, o), t.length = o);
  }
  _$AR(e = this._$AA.nextSibling, t) {
    for (this._$AP?.(!1, !0, t); e !== this._$AB; ) {
      const i = He(e).nextSibling;
      He(e).remove(), e = i;
    }
  }
  setConnected(e) {
    this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
  }
}
class _e {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(e, t, i, o, r) {
    this.type = 1, this._$AH = u, this._$AN = void 0, this.element = e, this.name = t, this._$AM = o, this.options = r, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = u;
  }
  _$AI(e, t = this, i, o) {
    const r = this.strings;
    let n = !1;
    if (r === void 0) e = G(this, e, t, 0), n = !ie(e) || e !== this._$AH && e !== K, n && (this._$AH = e);
    else {
      const c = e;
      let d, _;
      for (e = r[0], d = 0; d < r.length - 1; d++) _ = G(this, c[i + d], t, d), _ === K && (_ = this._$AH[d]), n ||= !ie(_) || _ !== this._$AH[d], _ === u ? e = u : e !== u && (e += (_ ?? "") + r[d + 1]), this._$AH[d] = _;
    }
    n && !o && this.j(e);
  }
  j(e) {
    e === u ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
  }
}
class Nt extends _e {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(e) {
    this.element[this.name] = e === u ? void 0 : e;
  }
}
class Ot extends _e {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(e) {
    this.element.toggleAttribute(this.name, !!e && e !== u);
  }
}
class Pt extends _e {
  constructor(e, t, i, o, r) {
    super(e, t, i, o, r), this.type = 5;
  }
  _$AI(e, t = this) {
    if ((e = G(this, e, t, 0) ?? u) === K) return;
    const i = this._$AH, o = e === u && i !== u || e.capture !== i.capture || e.once !== i.once || e.passive !== i.passive, r = e !== u && (i === u || o);
    o && this.element.removeEventListener(this.name, this, i), r && this.element.addEventListener(this.name, this, e), this._$AH = e;
  }
  handleEvent(e) {
    typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
  }
}
class Dt {
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
const Ut = Se.litHtmlPolyfillSupport;
Ut?.(oe, se), (Se.litHtmlVersions ??= []).push("3.3.3");
const Ft = (s, e, t) => {
  const i = t?.renderBefore ?? e;
  let o = i._$litPart$;
  if (o === void 0) {
    const r = t?.renderBefore ?? null;
    i._$litPart$ = o = new se(e.insertBefore(te(), r), r, void 0, t ?? {});
  }
  return o._$AI(s), o;
};
const Me = globalThis;
class E extends q {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    const e = super.createRenderRoot();
    return this.renderOptions.renderBefore ??= e.firstChild, e;
  }
  update(e) {
    const t = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = Ft(t, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    super.connectedCallback(), this._$Do?.setConnected(!0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._$Do?.setConnected(!1);
  }
  render() {
    return K;
  }
}
E._$litElement$ = !0, E.finalized = !0, Me.litElementHydrateSupport?.({ LitElement: E });
const Lt = Me.litElementPolyfillSupport;
Lt?.({ LitElement: E });
(Me.litElementVersions ??= []).push("4.2.2");
const Rt = { attribute: !0, type: String, converter: le, reflect: !1, hasChanged: ke }, jt = (s = Rt, e, t) => {
  const { kind: i, metadata: o } = t;
  let r = globalThis.litPropertyMetadata.get(o);
  if (r === void 0 && globalThis.litPropertyMetadata.set(o, r = /* @__PURE__ */ new Map()), i === "setter" && ((s = Object.create(s)).wrapped = !0), r.set(t.name, s), i === "accessor") {
    const { name: n } = t;
    return { set(c) {
      const d = e.get.call(this);
      e.set.call(this, c), this.requestUpdate(n, d, s, !0, c);
    }, init(c) {
      return c !== void 0 && this.C(n, void 0, s, c), c;
    } };
  }
  if (i === "setter") {
    const { name: n } = t;
    return function(c) {
      const d = this[n];
      e.call(this, c), this.requestUpdate(n, d, s, !0, c);
    };
  }
  throw Error("Unsupported decorator location: " + i);
};
function f(s) {
  return (e, t) => typeof t == "object" ? jt(s, e, t) : ((i, o, r) => {
    const n = o.hasOwnProperty(r);
    return o.constructor.createProperty(r, i), n ? Object.getOwnPropertyDescriptor(o, r) : void 0;
  })(s, e, t);
}
function p(s) {
  return f({ ...s, state: !0, attribute: !1 });
}
function v(s) {
  if (typeof s == "number" && Number.isFinite(s)) return s;
  if (typeof s == "string" && s.trim() !== "") {
    const e = Number(s);
    if (Number.isFinite(e)) return e;
  }
}
function M(s) {
  return typeof s == "string" && s !== "" ? s : void 0;
}
function Ht(s) {
  return Array.isArray(s) ? s : [];
}
function ge(s) {
  return !s || s.state === "unavailable" || s.state === "unknown";
}
function pe(s, e, t) {
  return Math.min(t, Math.max(e, s));
}
function V(s, e) {
  customElements.get(s) || customElements.define(s, e);
}
const xe = {
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
  "zone.field_group": "Compatibility group"
}, Zt = {
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
  "zone.field_group": "Gruppo di compatibilità"
}, ut = {
  en: xe,
  it: Zt
};
function P(s) {
  const t = (s?.locale?.language ?? s?.language ?? "en").toLowerCase().split(/[-_]/)[0] ?? "en";
  return t in ut ? t : "en";
}
function Vt(s, e) {
  return e ? s.replace(/\{(\w+)\}/g, (t, i) => {
    const o = e[i];
    return o === void 0 ? t : String(o);
  }) : s;
}
function a(s, e, t) {
  const i = ut[s] ?? xe;
  return Vt(i[e] ?? xe[e], t);
}
function qt(s, e = 1) {
  const t = v(s);
  if (t !== void 0)
    return t.toFixed(e).replace(/\.0+$/, (i) => e > 0 ? "" : i);
}
function Bt(s) {
  const e = Math.abs(Math.round(s)), t = Math.floor(e / 3600), i = Math.round(e % 3600 / 60), o = [];
  return t > 0 && o.push(`${t} h`), i > 0 && o.push(`${i} min`), o.length === 0 && o.push(`${e} s`), o.join(" ");
}
function Wt(s, e) {
  if (!s || typeof s != "object") return "";
  if (s.kind === "sun" && (s.event === "sunrise" || s.event === "sunset")) {
    const i = a(
      e,
      s.event === "sunrise" ? "trigger.sunrise" : "trigger.sunset"
    ), o = v(s.offset_s) ?? 0;
    if (o === 0) return i;
    const r = o < 0 ? "−" : "+";
    return `${i} ${r} ${Bt(o)}`;
  }
  const t = M(s.at) ?? M(s.time);
  return t ? a(e, "trigger.at", { time: t }) : M(s.kind) ?? "";
}
const Kt = {
  hub_water_budget: "waterBudget",
  hub_skip_threshold: "skipThreshold",
  hub_weighted_temp: "weightedTemp",
  hub_session: "session",
  hub_consumption_left: "consumptionLeft",
  hub_pause: "pauseSwitch",
  hub_evaluate: "evaluateButton",
  hub_stop_all: "stopAllButton"
}, Gt = {
  zone_state: "state",
  zone_next_run: "nextRun",
  zone_last_outcome: "lastOutcome",
  zone_enabled: "enabledSwitch",
  zone_order: "orderNumber",
  zone_suspend_until: "suspendUntil"
};
function Xt(s) {
  const e = {}, t = /* @__PURE__ */ new Map(), i = [];
  for (const r of Object.values(s.states)) {
    const n = M(r.attributes.maestro_role);
    if (!n) continue;
    i.push(r.entity_id);
    const c = M(r.attributes.zone_id);
    if (c) {
      let d = t.get(c);
      if (d || (d = {
        zoneId: c,
        name: c,
        order: Number.MAX_SAFE_INTEGER,
        cycleSwitches: []
      }, t.set(c, d)), n === "cycle_enabled")
        d.cycleSwitches.push(r);
      else {
        const _ = Gt[n];
        _ && (d[_] = r);
      }
    } else {
      const d = Kt[n];
      d && (e[d] = r);
    }
  }
  const o = [...t.values()];
  for (const r of o) {
    const n = r.state?.attributes ?? {};
    r.name = M(n.zone_name) ?? M(r.state?.attributes.friendly_name) ?? r.zoneId, r.order = v(n.order) ?? v(r.orderNumber?.state) ?? Number.MAX_SAFE_INTEGER;
  }
  return o.sort(
    (r, n) => r.order - n.order || r.name.localeCompare(n.name)
  ), { found: i.length > 0, hub: e, zones: o, entityIds: i };
}
function Qt(s) {
  const e = Ht(s.state?.attributes?.cycles), t = [];
  for (const i of e) {
    if (typeof i != "object" || i === null) continue;
    const o = i, r = {
      cycle_id: M(o.cycle_id),
      name: M(o.name),
      enabled: typeof o.enabled == "boolean" ? o.enabled : void 0,
      trigger: o.trigger ?? void 0,
      curve: o.curve ?? void 0
    }, n = o.days;
    Array.isArray(n) && (r.days = n.map((d) => v(d)).filter((d) => d !== void 0));
    const c = o.day_minutes;
    if (c && typeof c == "object") {
      const d = {};
      for (const [_, m] of Object.entries(c)) {
        const h = v(m);
        h !== void 0 && (d[_] = h);
      }
      r.day_minutes = d;
    }
    r.amount = v(o.amount), r.heat = v(o.heat), t.push(r);
  }
  return t;
}
const B = 12, L = 25, W = 35, ht = 3, _t = 45, mt = 0, vt = 30, Jt = (L - B) / 10;
function Ge(s, e, t) {
  return Math.max(e, Math.min(t, s));
}
function C(s) {
  const e = Math.floor(s), t = s - e;
  return t < 0.5 ? e : t > 0.5 ? e + 1 : e % 2 === 0 ? e : e + 1;
}
function we(s, e) {
  const t = Math.max(0, C(s - Jt * e));
  return [
    [B, t],
    [L, s],
    [W, s + e]
  ];
}
function R(s, e, t, i) {
  const o = s[0], r = s[s.length - 1];
  let n;
  if (!o || !r)
    n = 0;
  else if (e <= o[0])
    n = o[1];
  else if (e >= r[0])
    n = r[1];
  else {
    n = r[1];
    for (let c = 0; c < s.length - 1; c++) {
      const d = s[c], _ = s[c + 1];
      if (!d || !_) continue;
      const [m, h] = d, [g, x] = _;
      if (m <= e && e <= g) {
        n = h + (x - h) * (e - m) / (g - m);
        break;
      }
    }
  }
  return t !== void 0 && (n = Math.max(n, t)), i !== void 0 && (n = Math.min(n, i)), n;
}
function Xe(s, e, t) {
  const i = R(s, L, e, t), o = R(s, W, e, t);
  return {
    amount: Ge(C(i), ht, _t),
    heat: Ge(C(o - i), mt, vt)
  };
}
function Yt(s) {
  if (!Array.isArray(s)) return [];
  const e = [];
  for (const t of s) {
    if (!Array.isArray(t) || t.length < 2) continue;
    const i = v(t[0]), o = v(t[1]);
    i !== void 0 && o !== void 0 && e.push([i, o]);
  }
  return [...e].sort((t, i) => t[0] - i[0]);
}
const ue = [0, 1, 2, 3, 4, 5, 6], Qe = {
  en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  it: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"]
};
function Te(s) {
  return Qe[s] ?? Qe.en;
}
function ei(s) {
  return !s || s.length === 0 || s.length >= 7;
}
function ft(s, e) {
  const t = new Set(s);
  return t.has(e) ? t.delete(e) : t.add(e), [...t].sort((i, o) => i - o);
}
function ti(s) {
  return !s || Object.keys(s).length === 0;
}
function be(s, e) {
  return s.day_minutes?.[String(e)] ?? s.amount ?? 0;
}
function gt(s, e, t, i, o) {
  return C(R(we(s, e), t, i, o));
}
var ii = Object.defineProperty, T = (s, e, t, i) => {
  for (var o = void 0, r = s.length - 1, n; r >= 0; r--)
    (n = s[r]) && (o = n(e, t, o) || o);
  return o && ii(e, t, o), o;
};
const ye = 320, k = 170, J = 34, Je = 12, Y = 16, S = 24, ae = 5, $e = 40, Ie = class Ie extends E {
  constructor() {
    super(...arguments), this.language = "en", this._amount = 15, this._heat = 15, this._min = 1, this._max = 120, this._advanced = !1, this._dragged = !1, this._points = we(15, 15);
  }
  willUpdate(e) {
    if (e.has("cycle")) {
      const t = this.cycle?.cycle_id;
      t !== this._seededCycleId && (this._seededCycleId = t, this._seedFromCycle());
    }
  }
  _seedFromCycle() {
    const e = this.cycle?.curve, t = Yt(e?.points);
    if (t.length === 0) return;
    const i = v(e?.min) ?? 1, o = v(e?.max) ?? 120, { amount: r, heat: n } = Xe(t, i, o);
    this._amount = r, this._heat = n, this._min = i, this._max = o, this._dragged = !1, this._points = [
      [B, C(R(t, B))],
      [L, C(R(t, L))],
      [W, C(R(t, W))]
    ];
  }
  _regen() {
    this._points = we(this._amount, this._heat), this._dragged = !1;
  }
  _onAmount(e) {
    this._amount = Number(e.target.value), this._regen();
  }
  _onHeat(e) {
    this._heat = Number(e.target.value), this._regen();
  }
  _clampedValue(e) {
    return C(R(this._points, e, this._min, this._max));
  }
  _sx(e) {
    return J + (e - ae) / ($e - ae) * (ye - J - Je);
  }
  _graphTop() {
    return Math.max(12, ...this._points.map((e) => e[1])) + 4;
  }
  _sy(e) {
    const t = this._graphTop();
    return k - S - e / t * (k - Y - S);
  }
  _valueFromY(e) {
    const t = this._graphTop(), i = (k - S - e) / (k - Y - S) * t;
    return Math.max(0, C(i));
  }
  _startDrag(e, t) {
    if (!this._advanced) return;
    t.preventDefault();
    const i = t.currentTarget.ownerSVGElement;
    if (!i) return;
    const o = (n) => {
      const c = i.getScreenCTM();
      if (!c) return;
      const d = i.createSVGPoint();
      d.x = n.clientX, d.y = n.clientY;
      const _ = d.matrixTransform(c.inverse()).y, m = [...this._points], h = m[e];
      if (!h) return;
      m[e] = [h[0], this._valueFromY(_)], this._points = m, this._dragged = !0;
      const { amount: g, heat: x } = Xe(this._points);
      this._amount = g, this._heat = x;
    }, r = () => {
      window.removeEventListener("pointermove", o), window.removeEventListener("pointerup", r);
    };
    window.addEventListener("pointermove", o), window.addEventListener("pointerup", r);
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
    return this.cycle?.curve?.kind === "volume" ? l`<div class="volume-note">${a(e, "editor.volume_note")}</div>` : l`
      <div class="title">${a(e, "editor.title")}</div>

      <div class="field">
        <div class="row">
          <label>${a(e, "editor.amount.label")}</label>
          <span class="value">${a(e, "editor.amount.value", { min: this._amount })}</span>
        </div>
        <div class="help">${a(e, "editor.amount.help")}</div>
        <input type="range" min=${ht} max=${_t} .value=${String(this._amount)}
          @input=${this._onAmount} />
        <div class="ends"><span>${a(e, "editor.amount.low")}</span><span>${a(e, "editor.amount.high")}</span></div>
      </div>

      <div class="field">
        <div class="row">
          <label>${a(e, "editor.heat.label")}</label>
          <span class="value">${a(e, "editor.heat.value", { min: this._heat })}</span>
        </div>
        <div class="help">${a(e, "editor.heat.help")}</div>
        <input type="range" min=${mt} max=${vt} .value=${String(this._heat)}
          @input=${this._onHeat} />
        <div class="ends"><span>${a(e, "editor.heat.low")}</span><span>${a(e, "editor.heat.high")}</span></div>
      </div>

      <div class="graph-box">
        <div class="caption">${a(e, "editor.graph.caption")}</div>
        ${this._renderGraph(e)}
      </div>

      <div class="examples">
        ${this._exampleTile(a(e, "editor.example.cool"), this._clampedValue(B))}
        ${this._exampleTile(a(e, "editor.example.mild"), this._clampedValue(L))}
        ${this._exampleTile(a(e, "editor.example.hot"), this._clampedValue(W))}
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
    return l`<div class="example"><div class="lbl">${e}</div><div class="num">${t} min</div></div>`;
  }
  _renderToday(e) {
    const t = this.weightedTemp;
    if (t === void 0 || Number.isNaN(t)) return u;
    const i = this._clampedValue(t);
    return l`<div class="today-banner">${a(e, "editor.today", {
      temp: Math.round(t),
      min: i
    })}</div>`;
  }
  _renderAdvanced(e) {
    return l`
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
    for (let n = ae; n <= $e; n += 1)
      t.push([this._sx(n), this._sy(this._clampedValue(n))]);
    const i = t.map((n, c) => `${c === 0 ? "M" : "L"}${n[0].toFixed(1)},${n[1].toFixed(1)}`).join(" "), o = this.weightedTemp, r = o !== void 0 && !Number.isNaN(o) && o >= ae && o <= $e;
    return fe`
      <svg viewBox="0 0 ${ye} ${k}">
        <line class="axis" x1=${J} y1=${Y} x2=${J} y2=${k - S}></line>
        <line class="axis" x1=${J} y1=${k - S} x2=${ye - Je} y2=${k - S}></line>
        <text class="tick" x=${this._sx(B)} y=${k - S + 12} text-anchor="middle">12°</text>
        <text class="tick" x=${this._sx(L)} y=${k - S + 12} text-anchor="middle">25°</text>
        <text class="tick" x=${this._sx(W)} y=${k - S + 12} text-anchor="middle">35°</text>
        ${r ? fe`<line class="today" x1=${this._sx(o)} y1=${Y} x2=${this._sx(o)} y2=${k - S}></line>
              <text class="today-text" x=${this._sx(o)} y=${Y - 4} text-anchor="middle">${a(e, "editor.graph.today", { temp: Math.round(o) })}</text>` : u}
        <path class="curve" d=${i}></path>
        ${this._points.map(
      (n, c) => fe`<circle class="handle" r=${this._advanced ? 7 : 3.5}
            cx=${this._sx(n[0]).toFixed(1)} cy=${this._sy(this._clampedValue(n[0])).toFixed(1)}
            @pointerdown=${(d) => this._startDrag(c, d)}></circle>`
    )}
      </svg>
    `;
  }
};
Ie.styles = Z`
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
let w = Ie;
T([
  f()
], w.prototype, "language");
T([
  f({ attribute: !1 })
], w.prototype, "cycle");
T([
  f({ attribute: !1 })
], w.prototype, "weightedTemp");
T([
  p()
], w.prototype, "_amount");
T([
  p()
], w.prototype, "_heat");
T([
  p()
], w.prototype, "_min");
T([
  p()
], w.prototype, "_max");
T([
  p()
], w.prototype, "_advanced");
T([
  p()
], w.prototype, "_dragged");
T([
  p()
], w.prototype, "_points");
V("imc-curve-editor", w);
var oi = Object.defineProperty, A = (s, e, t, i) => {
  for (var o = void 0, r = s.length - 1, n; r >= 0; r--)
    (n = s[r]) && (o = n(e, t, o) || o);
  return o && oi(e, t, o), o;
};
const Ye = 15, et = 1, tt = 1440, si = -360, ri = 360, ni = 5, Ce = class Ce extends E {
  constructor() {
    super(...arguments), this.zoneId = "", this._days = [...ue], this._startKind = "time", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._uniformMinutes = Ye, this._dayMinutes = {}, this._sameForAll = !0, this._advancedOpen = !1;
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
    this._days = e.days && e.days.length > 0 ? [...e.days] : [...ue];
    const t = e.trigger;
    t?.kind === "sun" ? (this._startKind = "sun", this._startEvent = t.event === "sunset" ? "sunset" : "sunrise", this._startOffsetMin = Math.round((v(t.offset_s) ?? 0) / 60)) : (this._startKind = "time", this._startEvent = "sunrise", this._startOffsetMin = 0), this._startAt = t?.at ?? t?.time ?? "06:00", this._uniformMinutes = v(e.amount) ?? Ye, this._dayMinutes = e.day_minutes ? { ...e.day_minutes } : {}, this._sameForAll = ti(e.day_minutes);
  }
  render() {
    const e = this.cycle;
    if (!e) return l``;
    const t = P(this.hass), i = Te(t);
    return l`
      <div class="section-label">${a(t, "program_editor.days")}</div>
      <div class="days">
        ${i.map(
      (o, r) => l`
            <div
              class="day ${this._days.includes(r) ? "on" : ""}"
              @click=${() => this._days = ft(this._days, r)}
            >
              ${o}
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
        ${this._startKind === "time" ? l`<input
              type="time"
              class="timebox"
              .value=${this._startAt}
              @input=${(o) => this._startAt = o.target.value}
            />` : this._stepper(this._startOffsetMin, (o) => this._startOffsetMin = o, {
      min: si,
      max: ri,
      step: ni,
      suffix: "min",
      signed: !0
    })}
      </div>

      ${this._isVolume ? l`<div class="volume-note">${a(t, "editor.volume_note")}</div>` : l`
            <div class="section-label">${a(t, "program_editor.duration_per_day")}</div>
            ${this._renderDurations(t, i)}
            <div class="same-row" @click=${() => this._sameForAll = !this._sameForAll}>
              <span class="switch ${this._sameForAll ? "on" : ""}"></span>
              ${a(t, "program_editor.same_duration")}
            </div>

            ${this._renderWeatherLine(t, e)}
          `}
      ${this._days.length === 0 ? l`<div class="hint">${a(t, "panel.pick_a_day")}</div>` : u}

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
    return l`
      <div class="section-label">${a(e, "panel.heat_response")}</div>
      <imc-curve-editor
        .cycle=${this.cycle}
        .weightedTemp=${this.weightedTemp}
        .language=${P(this.hass)}
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
    return this._sameForAll ? l`<div class="duration-row">
        ${this._stepper(this._uniformMinutes, (o) => this._uniformMinutes = o, {
      min: et,
      max: tt,
      step: 1,
      suffix: i
    })}
      </div>` : l`${this._days.map((o) => {
      const r = be({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, o);
      return l`<div class="duration-row">
        <span class="dname">${t[o] ?? ""}</span>
        ${this._stepper(
        r,
        (n) => this._dayMinutes = { ...this._dayMinutes, [String(o)]: n },
        { min: et, max: tt, step: 1, suffix: i }
      )}
      </div>`;
    })}`;
  }
  _stepper(e, t, i) {
    const o = i.signed && e > 0 ? "+" : "";
    return l`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(pe(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${o}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(pe(e + i.step, i.min, i.max))}
        >
          +
        </button>
      </span>
    `;
  }
  _renderWeatherLine(e, t) {
    const i = this.weightedTemp;
    if (i === void 0 || Number.isNaN(i)) return u;
    const o = ((/* @__PURE__ */ new Date()).getDay() + 6) % 7;
    if (!(this._days.length >= 7) && !this._days.includes(o))
      return l`<div class="weather">${a(e, "reason.day_not_scheduled")}</div>`;
    const n = this._sameForAll ? this._uniformMinutes : be({ amount: this._uniformMinutes, day_minutes: this._dayMinutes }, o), c = v(t.heat) ?? 8, d = gt(
      n,
      c,
      i,
      v(t.curve?.min),
      v(t.curve?.max)
    ), _ = (/* @__PURE__ */ new Date()).toLocaleDateString(e === "it" ? "it-IT" : "en-US", {
      weekday: "long"
    });
    return l`<div class="weather">
      ${a(e, "panel.weather_line", { day: _, min: d })}
    </div>`;
  }
  _buildDayMinutes() {
    const e = {};
    for (const t of this._days)
      e[String(t)] = be(
        { amount: this._uniformMinutes, day_minutes: this._dayMinutes },
        t
      );
    return e;
  }
  _save() {
    if (this._days.length === 0) return;
    const e = this.zoneId, t = this.cycle?.cycle_id ?? "", i = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin }, o = [...this._days].sort((c, d) => c - d), r = o.length >= 7 ? [] : o;
    if (this.dispatchEvent(
      new CustomEvent("imc-program-save-schedule", {
        detail: { zoneId: e, programId: t, days: r, start: i },
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
Ce.styles = Z`
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
let y = Ce;
A([
  f({ attribute: !1 })
], y.prototype, "hass");
A([
  f()
], y.prototype, "zoneId");
A([
  f({ attribute: !1 })
], y.prototype, "cycle");
A([
  f({ attribute: !1 })
], y.prototype, "weightedTemp");
A([
  p()
], y.prototype, "_days");
A([
  p()
], y.prototype, "_startKind");
A([
  p()
], y.prototype, "_startAt");
A([
  p()
], y.prototype, "_startEvent");
A([
  p()
], y.prototype, "_startOffsetMin");
A([
  p()
], y.prototype, "_uniformMinutes");
A([
  p()
], y.prototype, "_dayMinutes");
A([
  p()
], y.prototype, "_sameForAll");
A([
  p()
], y.prototype, "_advancedOpen");
V("imc-program-editor", y);
var ai = Object.defineProperty, I = (s, e, t, i) => {
  for (var o = void 0, r = s.length - 1, n; r >= 0; r--)
    (n = s[r]) && (o = n(e, t, o) || o);
  return o && ai(e, t, o), o;
};
const di = 15, li = 8, ci = 1, pi = 60, ui = 1, hi = 1440, _i = -360, mi = 360, vi = 5, it = [0, 2, 4], ot = [5, 6];
function st(s, e) {
  return s.length !== e.length ? !1 : [...s].sort((i, o) => i - o).every((i, o) => i === e[o]);
}
const Ne = class Ne extends E {
  constructor() {
    super(...arguments), this.zoneId = "", this._step = 1, this._days = [...ue], this._startKind = "sun", this._startAt = "06:00", this._startEvent = "sunrise", this._startOffsetMin = 0, this._minutes = di;
  }
  render() {
    const e = P(this.hass);
    return l`
      <div class="head">
        <span class="title">${this._stepTitle(e)}</span>
        <button class="close" @click=${this._cancel} aria-label=${a(e, "editor.cancel")}>
          ✕
        </button>
      </div>
      <div class="dots">
        ${[1, 2, 3].map(
      (t) => l`<span class="dot ${this._step === t ? "on" : ""}"></span>`
    )}
      </div>
      ${this._step === 1 ? this._renderStep1(e) : u}
      ${this._step === 2 ? this._renderStep2(e) : u}
      ${this._step === 3 ? this._renderStep3(e) : u}
      <div class="buttons">
        ${this._step > 1 ? l`<button @click=${this._back}>${a(e, "wizard.back")}</button>` : l`<button @click=${this._cancel}>${a(e, "editor.cancel")}</button>`}
        ${this._step < 3 ? l`<button
              class="primary"
              ?disabled=${this._days.length === 0}
              @click=${this._next}
            >
              ${a(e, "wizard.next")}
            </button>` : l`<button
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
    const t = Te(e);
    return l`
      <div class="days">
        ${t.map(
      (i, o) => l`
            <div
              class="day ${this._days.includes(o) ? "on" : ""}"
              @click=${() => this._days = ft(this._days, o)}
            >
              ${i}
            </div>
          `
    )}
      </div>
      <div class="presets">
        <span
          class="preset ${this._days.length === 7 ? "sel" : ""}"
          @click=${() => this._days = [...ue]}
        >
          ${a(e, "wizard.preset_every_day")}
        </span>
        <span
          class="preset ${st(this._days, it) ? "sel" : ""}"
          @click=${() => this._days = [...it]}
        >
          ${a(e, "wizard.preset_alternate")}
        </span>
        <span
          class="preset ${st(this._days, ot) ? "sel" : ""}"
          @click=${() => this._days = [...ot]}
        >
          ${a(e, "wizard.preset_weekend")}
        </span>
      </div>
      ${this._days.length === 0 ? l`<div class="hint">${a(e, "panel.pick_a_day")}</div>` : u}
    `;
  }
  _renderStep2(e) {
    return l`
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
      ${this._startKind === "time" ? l`<input
            type="time"
            class="timebox"
            .value=${this._startAt}
            @input=${(t) => this._startAt = t.target.value}
          />` : l`<div class="offset-row">
            ${this._stepper(this._startOffsetMin, (t) => this._startOffsetMin = t, {
      min: _i,
      max: mi,
      step: vi,
      suffix: "min",
      signed: !0
    })}
          </div>`}
    `;
  }
  _renderStep3(e) {
    const t = a(e, "curve.unit_duration");
    return l`
      <div class="stepper-row">
        ${this._stepper(this._minutes, (i) => this._minutes = i, {
      min: ui,
      max: hi,
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
    }), o = gt(
      this._minutes,
      li,
      t,
      ci,
      pi
    );
    return l`<div class="done">
      ${a(e, "wizard.done_prefix")}
      ${a(e, "panel.weather_line", { day: i, min: o })}
    </div>`;
  }
  _stepper(e, t, i) {
    const o = i.signed && e > 0 ? "+" : "";
    return l`
      <span class="stepper">
        <button
          type="button"
          @click=${() => t(pe(e - i.step, i.min, i.max))}
        >
          –
        </button>
        <span class="val">${o}${e} ${i.suffix}</span>
        <button
          type="button"
          @click=${() => t(pe(e + i.step, i.min, i.max))}
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
    const e = this._startKind === "time" ? { kind: "time", at: this._startAt } : { kind: "sun", event: this._startEvent, offset_min: this._startOffsetMin }, t = [...this._days].sort((o, r) => o - r), i = t.length >= 7 ? [] : t;
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
Ne.styles = Z`
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
let z = Ne;
I([
  f({ attribute: !1 })
], z.prototype, "hass");
I([
  f()
], z.prototype, "zoneId");
I([
  f({ attribute: !1 })
], z.prototype, "weightedTemp");
I([
  p()
], z.prototype, "_step");
I([
  p()
], z.prototype, "_days");
I([
  p()
], z.prototype, "_startKind");
I([
  p()
], z.prototype, "_startAt");
I([
  p()
], z.prototype, "_startEvent");
I([
  p()
], z.prototype, "_startOffsetMin");
I([
  p()
], z.prototype, "_minutes");
V("imc-program-wizard", z);
var fi = Object.defineProperty, re = (s, e, t, i) => {
  for (var o = void 0, r = s.length - 1, n; r >= 0; r--)
    (n = s[r]) && (o = n(e, t, o) || o);
  return o && fi(e, t, o), o;
};
const Oe = class Oe extends E {
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
    if (!e || !t) return l``;
    const i = P(e), o = Qt(t);
    return l`
      ${o.length === 0 ? l`<div class="meta">${a(i, "panel.no_programs")}</div>` : this._renderCycles(i, e, t, o)}
      ${this._renderAddProgram(i, e, t)}
    `;
  }
  _renderAddProgram(e, t, i) {
    return l`
      <div class="add-row">
        ${this._wizardOpen ? l`<imc-program-wizard
              .hass=${t}
              .zoneId=${i.zoneId}
              .weightedTemp=${this.weightedTemp}
              @imc-wizard-finish=${() => this._wizardOpen = !1}
              @imc-wizard-cancel=${() => this._wizardOpen = !1}
            ></imc-program-wizard>` : l`<button class="add-btn" @click=${() => this._wizardOpen = !0}>
              ＋ ${a(e, "panel.add_program")}
            </button>`}
      </div>
    `;
  }
  _renderCycles(e, t, i, o) {
    const r = Te(e);
    return l`${o.map((n) => {
      const c = n.days ?? [], d = ei(n.days), _ = !!n.cycle_id && this._editingId === n.cycle_id, m = n.cycle_id ? this._findCycleSwitch(i, n.cycle_id) : void 0, h = m?.state === "on";
      return l`
        <div class="prog">
          <div class="name">${n.name ?? n.cycle_id}</div>
          <div class="days">
            ${r.map(
        (g, x) => l`
                <div class="day ${d || c.includes(x) ? "on" : ""}">
                  ${g}
                </div>
              `
      )}
          </div>
          <div class="meta">
            ${Wt(n.trigger, e)} · ${this._minutesSummary(e, n)}
          </div>
          ${m ? l`<div
                class="toggle-row"
                role="switch"
                tabindex="0"
                aria-checked=${h ? "true" : "false"}
                @click=${() => this._onToggle(i.zoneId, n, m)}
                @keydown=${(g) => this._onToggleKeydown(g, i.zoneId, n, m)}
              >
                <span class="switch ${h ? "on" : ""}"></span>
                <span
                  >${a(
        e,
        h ? "zone.cycle_enabled" : "zone.cycle_disabled"
      )}</span
                >
              </div>` : u}
          ${n.cycle_id ? l`<div class="actions">
                <button
                  class="link-btn"
                  @click=${() => this._editingId = _ ? void 0 : n.cycle_id}
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
          ${_ ? l`<imc-program-editor
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
    return e.cycleSwitches.find((i) => M(i.attributes.cycle_id) === t);
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
  _onToggleKeydown(e, t, i, o) {
    (e.key === "Enter" || e.key === " ") && (e.preventDefault(), this._onToggle(t, i, o));
  }
  _onRename(e, t, i) {
    if (!i.cycle_id) return;
    const o = i.name ?? "", r = window.prompt(a(e, "panel.rename_program"), o);
    if (r === null) return;
    const n = r.trim();
    !n || n === o || this._dispatch("imc-program-rename", {
      zoneId: t,
      programId: i.cycle_id,
      name: n
    });
  }
  _onDelete(e, t, i) {
    if (!i.cycle_id) return;
    const o = i.name ?? i.cycle_id;
    window.confirm(a(e, "panel.confirm_delete_program", { name: o })) && this._dispatch("imc-program-remove", { zoneId: t, programId: i.cycle_id });
  }
  _minutesSummary(e, t) {
    return t.day_minutes && Object.keys(t.day_minutes).length > 0 ? a(e, "panel.per_day_minutes") : a(e, "panel.minutes_value", { min: t.amount ?? "?" });
  }
};
Oe.styles = Z`
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
let D = Oe;
re([
  f({ attribute: !1 })
], D.prototype, "hass");
re([
  f({ attribute: !1 })
], D.prototype, "zone");
re([
  f({ attribute: !1 })
], D.prototype, "weightedTemp");
re([
  p()
], D.prototype, "_editingId");
re([
  p()
], D.prototype, "_wizardOpen");
V("imc-program-list", D);
var gi = Object.defineProperty, me = (s, e, t, i) => {
  for (var o = void 0, r = s.length - 1, n; r >= 0; r--)
    (n = s[r]) && (o = n(e, t, o) || o);
  return o && gi(e, t, o), o;
};
function bi() {
  return typeof customElements < "u" && !!customElements.get("ha-selector");
}
const Pe = class Pe extends E {
  constructor() {
    super(...arguments), this.selector = { entity: {} }, this.value = "", this.label = "";
  }
  _emit(e) {
    this.value = e, this.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: e }, bubbles: !0, composed: !0 })
    );
  }
  render() {
    return bi() ? l`<ha-selector
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
Pe.styles = Z`
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
let H = Pe;
me([
  f({ attribute: !1 })
], H.prototype, "hass");
me([
  f({ attribute: !1 })
], H.prototype, "selector");
me([
  f()
], H.prototype, "value");
me([
  f()
], H.prototype, "label");
V("imc-entity-picker", H);
var yi = Object.defineProperty, $ = (s, e, t, i) => {
  for (var o = void 0, r = s.length - 1, n; r >= 0; r--)
    (n = s[r]) && (o = n(e, t, o) || o);
  return o && yi(e, t, o), o;
};
const rt = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  it: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]
};
function $i(s) {
  return rt[s] ?? rt.en;
}
const De = class De extends E {
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
    const e = P(this.hass), t = !!this.zone;
    return l`
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
      ${t ? l`
            <div
              class="section-label advanced-toggle"
              @click=${() => this._advancedOpen = !this._advancedOpen}
            >
              ${this._advancedOpen ? "▾" : "▸"} ${a(e, "zone.advanced")}
            </div>
            ${this._advancedOpen ? this._renderAdvanced(e) : u}
          ` : u}

      <div class="buttons">
        ${t ? l`<button class="danger" type="button" @click=${this._remove}>
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
    return l`
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
        ${$i(e).map((t, i) => {
      const o = i + 1;
      return l`
            <div
              class="month ${this._seasonMonths.includes(o) ? "on" : ""}"
              @click=${() => this._seasonMonths = this._toggleMonth(o)}
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
    return t.has(e) ? t.delete(e) : t.add(e), [...t].sort((i, o) => i - o);
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
    const t = P(this.hass);
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
De.styles = Z`
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
let b = De;
$([
  f({ attribute: !1 })
], b.prototype, "hass");
$([
  f({ attribute: !1 })
], b.prototype, "zone");
$([
  f()
], b.prototype, "zoneId");
$([
  p()
], b.prototype, "_name");
$([
  p()
], b.prototype, "_valve");
$([
  p()
], b.prototype, "_areaM2");
$([
  p()
], b.prototype, "_flowSensor");
$([
  p()
], b.prototype, "_nominalFlowLpm");
$([
  p()
], b.prototype, "_flowTolerancePct");
$([
  p()
], b.prototype, "_adjustmentPct");
$([
  p()
], b.prototype, "_order");
$([
  p()
], b.prototype, "_intervalDays");
$([
  p()
], b.prototype, "_compatibilityGroup");
$([
  p()
], b.prototype, "_seasonMonths");
$([
  p()
], b.prototype, "_advancedOpen");
V("imc-zone-editor", b);
function xi(s) {
  const e = JSON.parse(s);
  return { options: e.options ?? {}, zones: e.zones ?? {} };
}
var wi = Object.defineProperty, X = (s, e, t, i) => {
  for (var o = void 0, r = s.length - 1, n; r >= 0; r--)
    (n = s[r]) && (o = n(e, t, o) || o);
  return o && wi(e, t, o), o;
};
const Ue = class Ue extends E {
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
        return await this.hass.callService(e, t, i, void 0, !1, o);
      } catch (r) {
        const n = r instanceof Error ? r.message : String(r);
        this._showError(n);
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
        return xi(t);
      } catch {
        return;
      }
  }
  async _onEditZone(e) {
    const t = await this._readConfig();
    t ? (this._editingZoneId = e, this._editingZone = t.zones[e] ?? {}) : this._showError(a(P(this.hass), "panel.config_read_failed"));
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
      const o = t.patch, r = { name: o.name, valve_entity: o.valve_entity };
      o.area_m2 !== void 0 && (r.area_m2 = o.area_m2), o.icon !== void 0 && (r.icon = o.icon);
      const c = (await this._call("irrigation_maestro", "add_zone", r, !0))?.response?.zone_id;
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
    const t = e.detail, o = (await this._call(
      "irrigation_maestro",
      "add_program",
      { zone_id: t.zoneId, ...t.name ? { name: t.name } : {} },
      /* returnResponse */
      !0
    ))?.response?.program_id;
    typeof o != "string" || !o || (await this._call("irrigation_maestro", "set_program_schedule", {
      zone_id: t.zoneId,
      program_id: o,
      days: t.days,
      start_kind: t.start.kind,
      ...t.start.kind === "time" ? { start_time: t.start.at } : { start_event: t.start.event, start_offset_min: t.start.offset_min ?? 0 }
    }), await this._call("irrigation_maestro", "set_program_minutes", {
      zone_id: t.zoneId,
      program_id: o,
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
        (r) => t.states[r] !== i.states[r]
      );
    }
    return !0;
  }
  render() {
    const e = this.hass;
    if (!e) return l``;
    const t = P(e), i = Xt(e);
    if (this._relevantIds = i.entityIds, this._statesCount = Object.keys(e.states).length, this._editingZone !== void 0)
      return l`
        <div
          class="wrap ${this.narrow ? "narrow" : ""}"
          @imc-zone-save=${this._onZoneSave}
          @imc-zone-remove=${this._onZoneRemove}
          @imc-zone-cancel=${this._onZoneCancel}
        >
          <header><h1>${a(t, "panel.title")}</h1></header>
          ${this._error ? l`<div class="error">${this._error}</div>` : u}
          <imc-zone-editor
            .hass=${e}
            .zone=${this._editingZone ?? void 0}
            .zoneId=${this._editingZoneId}
          ></imc-zone-editor>
        </div>
      `;
    if (!i.found || i.zones.length === 0)
      return l`
        <div class="wrap">
          <header><h1>${a(t, "panel.title")}</h1></header>
          ${this._error ? l`<div class="error">${this._error}</div>` : u}
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
    const o = this._resolveSelected(i.zones), r = ge(i.hub.weightedTemp) ? void 0 : v(i.hub.weightedTemp?.state);
    return l`
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
        ${this._renderWeatherContext(i, t, r)}
        ${this._error ? l`<div class="error">${this._error}</div>` : u}
        <div class="tabs">
          ${i.zones.map(
      (n) => l`
              <div
                class="tab ${n.zoneId === o.zoneId ? "sel" : ""}"
                @click=${() => this._selectedZoneId = n.zoneId}
              >
                ${n.name}
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
          <span class="edit-zone-link" @click=${() => this._onEditZone(o.zoneId)}>
            ✎ ${a(t, "zone.edit")}
          </span>
        </div>
        <imc-program-list
          .hass=${e}
          .zone=${o}
          .weightedTemp=${r}
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
    const o = ge(e.hub.waterBudget) ? void 0 : v(e.hub.waterBudget?.state), r = ge(e.hub.skipThreshold) ? void 0 : v(e.hub.skipThreshold?.state), n = o !== void 0 && r !== void 0 ? o >= r ? "panel.budget_ok" : "panel.budget_low" : void 0;
    return l`
      <div class="meteo">
        ${a(t, "panel.weather_temp", { temp: qt(i, 1) ?? "" })}
        ${n ? l` · ${a(t, n)}` : u}
      </div>
    `;
  }
};
Ue.styles = Z`
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
let N = Ue;
X([
  f({ attribute: !1 })
], N.prototype, "hass");
X([
  f({ type: Boolean })
], N.prototype, "narrow");
X([
  p()
], N.prototype, "_selectedZoneId");
X([
  p()
], N.prototype, "_error");
X([
  p()
], N.prototype, "_editingZone");
X([
  p()
], N.prototype, "_editingZoneId");
V("irrigation-maestro-panel", N);
