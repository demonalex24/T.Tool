/* @ds-bundle: {"format":4,"namespace":"TTool","components":[{"name":"Icon"},{"name":"Button"},{"name":"IconButton"},{"name":"Toolbar"},{"name":"TextField"},{"name":"TagInput"},{"name":"PanelSection"},{"name":"ProjectTree"},{"name":"DocTabs"},{"name":"ContextMenu"},{"name":"ModuleCard"},{"name":"TextModule"},{"name":"NumberModule"},{"name":"AxisModule"},{"name":"RadarModule"},{"name":"BooleanModule"},{"name":"ModuleList"},{"name":"ArchiveHeader"},{"name":"ReferenceList"},{"name":"PresetLibrary"},{"name":"CanvasNode"},{"name":"RelationCanvas"},{"name":"SnapshotHistory"},{"name":"Dialog"},{"name":"StatusBar"}]} */
(function () {
  'use strict';
  var React = window.React, ReactDOM = window.ReactDOM;
  var h = React.createElement, Frag = React.Fragment;
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect,
    useLayoutEffect = React.useLayoutEffect, useMemo = React.useMemo, useCallback = React.useCallback;

  function cx() { var o = []; for (var i = 0; i < arguments.length; i++) if (arguments[i]) o.push(arguments[i]); return o.join(' '); }
  var seq = 0;
  function uid(p) { seq += 1; return (p || 'id') + '_' + seq.toString(36) + Math.random().toString(36).slice(2, 6); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function omit(o, keys) { var r = {}; for (var k in o) if (keys.indexOf(k) < 0) r[k] = o[k]; return r; }
  function assign() { return Object.assign.apply(Object, [{}].concat([].slice.call(arguments))); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDate(ts) { var d = new Date(ts); return pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function hhmm(ts) { var d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* value / defaultValue / onChange — works controlled or uncontrolled; setter accepts an updater fn */
  function useControllable(value, defaultValue, onChange) {
    var isC = value !== undefined;
    var st = useState(defaultValue);
    var cur = isC ? value : st[0];
    var ref = useRef(cur); ref.current = cur;
    var cb = useRef(onChange); cb.current = onChange;
    var set = useCallback(function (next) {
      var v = typeof next === 'function' ? next(ref.current) : next;
      if (v === ref.current) return;
      ref.current = v;
      if (!isC) st[1](v);
      if (cb.current) cb.current(v);
    }, [isC]);
    return [cur, set];
  }

  /* ---------- Icon ---------- */
  var ICONS = {
    plus: ['M12 5v14', 'M5 12h14'],
    close: ['M6 6l12 12', 'M18 6L6 18'],
    check: ['M5 12.5l4.5 4.5L19 7'],
    'chevron-right': ['M9.5 6l6 6-6 6'],
    'chevron-down': ['M6 9.5l6 6 6-6'],
    'arrow-up': ['M12 19V5', 'M6.5 10.5L12 5l5.5 5.5'],
    'arrow-down': ['M12 5v14', 'M6.5 13.5L12 19l5.5-5.5'],
    grip: { sw: 2.6, d: ['M9 6h.01', 'M15 6h.01', 'M9 12h.01', 'M15 12h.01', 'M9 18h.01', 'M15 18h.01'] },
    more: { sw: 2.6, d: ['M6 12h.01', 'M12 12h.01', 'M18 12h.01'] },
    trash: ['M4 7h16', 'M9.5 7V4.5h5V7', 'M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7', 'M10 11v6', 'M14 11v6'],
    undo: ['M9 14L4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
    history: ['M3.5 12a8.5 8.5 0 1 0 2.6-6.1', 'M3.5 4v4.5H8', 'M12 7.5V12l3 2'],
    snapshot: ['M4 8.5h3.2L8.8 6h6.4l1.6 2.5H20v11H4z', 'M15.5 13.5a3.5 3.5 0 1 1-7 0a3.5 3.5 0 1 1 7 0'],
    connect: ['M8 18a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0', 'M21 6a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0', 'M7.6 16.4l8.8-8.8'],
    note: ['M5 4.5h14v9.5l-5.5 5.5H5z', 'M13.5 19.5V14H19'],
    paperclip: ['M15.5 7.5l-6.4 6.4a1.8 1.8 0 0 0 2.5 2.5l6.7-6.7a3.6 3.6 0 0 0-5.1-5.1l-6.9 6.9a5.4 5.4 0 0 0 7.6 7.6l5.6-5.6'],
    fit: ['M4 9V4h5', 'M15 4h5v5', 'M20 15v5h-5', 'M9 20H4v-5'],
    'zoom-in': ['M17 11a6 6 0 1 1-12 0a6 6 0 1 1 12 0', 'M20 20l-4.6-4.6', 'M11 8.5v5', 'M8.5 11h5'],
    'zoom-out': ['M17 11a6 6 0 1 1-12 0a6 6 0 1 1 12 0', 'M20 20l-4.6-4.6', 'M8.5 11h5'],
    save: ['M5 4h11.5L20 7.5V20H5z', 'M8 4v5h7V4', 'M8 20v-6h9v6'],
    export: ['M12 15V4', 'M7.5 8.5L12 4l4.5 4.5', 'M5 14v6h14v-6'],
    'import': ['M12 4v11', 'M7.5 10.5L12 15l4.5-4.5', 'M5 14v6h14v-6'],
    canvas: ['M8.2 7a2.2 2.2 0 1 1-4.4 0a2.2 2.2 0 1 1 4.4 0', 'M20.2 7a2.2 2.2 0 1 1-4.4 0a2.2 2.2 0 1 1 4.4 0', 'M14.2 18a2.2 2.2 0 1 1-4.4 0a2.2 2.2 0 1 1 4.4 0', 'M8.6 7h6.8', 'M7.1 9l3.4 6.9', 'M16.9 9l-3.4 6.9'],
    preset: ['M12 4l8 4-8 4-8-4z', 'M4 12l8 4 8-4', 'M4 16l8 4 8-4'],
    folder: ['M3.5 7A1.5 1.5 0 0 1 5 5.5h4l2 2h8A1.5 1.5 0 0 1 20.5 9v8.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z'],
    archive: ['M6 3.5h8l4 4v13H6z', 'M14 3.5v4h4', 'M9 12h6', 'M9 15.5h4'],
    tag: ['M4 4h7l9 9-7 7-9-9z', 'M8.5 8a.5.5 0 1 1-1 0a.5.5 0 1 1 1 0'],
    edit: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
    warn: ['M12 4L2.8 19.5h18.4z', 'M12 10v4.5', 'M12 17h.01'],
    info: ['M20.5 12a8.5 8.5 0 1 1-17 0a8.5 8.5 0 1 1 17 0', 'M12 11v5', 'M12 8h.01'],
    jump: ['M8 16L16 8', 'M9.5 8H16v6.5'],
    search: ['M17.5 11a6.5 6.5 0 1 1-13 0a6.5 6.5 0 1 1 13 0', 'M20 20l-4.3-4.3'],
    child: ['M6 4.5v8a2 2 0 0 0 2 2h4', 'M17 11.5v6', 'M14 14.5h6'],
    sibling: ['M4 7h11', 'M4 12h11', 'M18 14v6', 'M15 17h6'],
    swap: ['M5 8h13', 'M15 4.5L18.5 8 15 11.5', 'M19 16H6', 'M9 12.5L5.5 16 9 19.5'],
    tree: ['M5 4.5h6v4H5z', 'M13 10h6v4h-6z', 'M13 16.5h6v4h-6z', 'M8 8.5v10h5', 'M8 12h5'],
    'mod-text': ['M5 6h14', 'M5 10h14', 'M5 14h14', 'M5 18h8'],
    'mod-number': ['M10 4L8 20', 'M16 4l-2 16', 'M5 9h15', 'M4 15h15'],
    'mod-axis': ['M3.5 12h17', 'M3.5 8.5v7', 'M20.5 8.5v7', 'M13 6.5v11', 'M11.5 6.5h3', 'M11.5 17.5h3'],
    'mod-radar': ['M12 3.5l8.1 5.9-3.1 9.6H7l-3.1-9.6z', 'M12 8.5l3.6 2.6-1.4 4.3H9.8l-1.4-4.3z'],
    'mod-bool': ['M3.5 12a5 5 0 0 1 5-5h7a5 5 0 0 1 0 10h-7a5 5 0 0 1-5-5z', 'M18 12a2.5 2.5 0 1 1-5 0a2.5 2.5 0 1 1 5 0']
  };
  function Icon(p) {
    var def = ICONS[p.name] || ICONS.more;
    var d = Array.isArray(def) ? def : def.d;
    var size = p.size || 16;
    return h('svg', {
      className: cx('tt-icon', p.className), width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: p.strokeWidth || def.sw || 1.6, strokeLinecap: 'round', strokeLinejoin: 'round',
      'aria-hidden': p.title ? undefined : true, role: p.title ? 'img' : undefined, focusable: 'false', style: p.style
    }, p.title ? h('title', null, p.title) : null, d.map(function (x, i) { return h('path', { key: i, d: x }); }));
  }
  Icon.names = Object.keys(ICONS);
  Icon.paths = ICONS;

  /* ---------- Button ---------- */
  function Button(p) {
    var variant = p.variant || 'secondary', size = p.size || 'md';
    var rest = omit(p, ['variant', 'size', 'icon', 'tone', 'className', 'children']);
    return h('button', assign({ type: 'button' }, rest, {
      className: cx('tt-btn', 'tt-btn--' + variant, size === 'sm' && 'tt-btn--sm', p.tone === 'danger' && 'tt-btn--tone-danger', p.className)
    }), p.icon ? h(Icon, { name: p.icon, size: size === 'sm' ? 14 : 16 }) : null, p.children != null ? h('span', null, p.children) : null);
  }

  /* ---------- IconButton: an icon that always shows its words ---------- */
  function IconButton(p) {
    var layout = p.layout || 'stack';
    var rest = omit(p, ['icon', 'label', 'layout', 'active', 'tone', 'shortcut', 'className']);
    return h('button', assign({
      type: 'button',
      title: p.shortcut ? p.label + '（' + p.shortcut + '）' : undefined,
      'aria-pressed': p.active === undefined ? undefined : !!p.active
    }, rest, {
      className: cx('tt-ibtn', 'tt-ibtn--' + layout, p.active && 'is-active', p.tone === 'danger' && 'tt-ibtn--danger', p.className)
    }), h(Icon, { name: p.icon, size: layout === 'stack' ? 20 : 14 }), h('span', { className: 'tt-ibtn__label' }, p.label));
  }

  /* ---------- Toolbar ---------- */
  function Toolbar(p) {
    return h('div', { role: 'toolbar', 'aria-label': p.label, className: cx('tt-toolbar', p.className), style: p.style }, p.children);
  }
  Toolbar.Divider = function () { return h('span', { className: 'tt-toolbar__div', role: 'separator', 'aria-orientation': 'vertical' }); };
  Toolbar.Spacer = function () { return h('span', { className: 'tt-toolbar__spacer' }); };

  /* ---------- InlineEdit (internal): commit on Enter/blur, cancel on Esc ---------- */
  function InlineEdit(p) {
    var done = useRef(false);
    function finish(ok, v) { if (done.current) return; done.current = true; if (ok) p.onCommit(v); else if (p.onCancel) p.onCancel(); }
    var props = {
      className: p.className, defaultValue: p.value, autoFocus: true, placeholder: p.placeholder, 'aria-label': p.ariaLabel, style: p.style,
      onFocus: function (e) { e.target.select(); },
      onClick: function (e) { e.stopPropagation(); },
      onPointerDown: function (e) { e.stopPropagation(); },
      onDoubleClick: function (e) { e.stopPropagation(); },
      onKeyDown: function (e) {
        e.stopPropagation();
        if (e.key === 'Enter' && (!p.multiline || !e.shiftKey)) { e.preventDefault(); finish(true, e.target.value); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      },
      onBlur: function (e) { finish(true, e.target.value); }
    };
    return p.multiline ? h('textarea', props) : h('input', props);
  }

  /* ---------- TextField ---------- */
  function TextField(p) {
    var s = useControllable(p.value, p.defaultValue || '', p.onChange);
    var id = useMemo(function () { return uid('f'); }, []);
    var ta = useRef(null);
    useLayoutEffect(function () {
      if (p.multiline && p.autoGrow !== false && ta.current) {
        ta.current.style.height = 'auto';
        ta.current.style.height = (ta.current.scrollHeight + 2) + 'px';
      }
    }, [s[0], p.multiline]);
    var common = {
      id: id, value: s[0], placeholder: p.placeholder, disabled: p.disabled, 'aria-label': p.label ? undefined : p.ariaLabel,
      'aria-describedby': p.hint ? id + 'h' : undefined, onKeyDown: p.onKeyDown, onBlur: p.onBlur,
      onChange: function (e) { s[1](e.target.value); },
      className: cx('tt-input', p.multiline && 'tt-input--multi', p.variant && 'tt-input--' + p.variant)
    };
    return h('div', { className: cx('tt-field', p.className), style: p.style },
      p.label ? h('label', { htmlFor: id, className: 'tt-field__label' }, p.label) : null,
      p.multiline ? h('textarea', assign({ ref: ta, rows: p.rows || 3 }, common)) : h('input', assign({ type: p.type || 'text', list: p.list }, common)),
      p.hint ? h('div', { id: id + 'h', className: 'tt-field__hint' }, p.hint) : null);
  }

  /* ---------- TagInput ---------- */
  function TagInput(p) {
    var s = useControllable(p.value, p.defaultValue || [], p.onChange);
    var d = useState(''), draft = d[0], setDraft = d[1];
    var input = useRef(null);
    function add(t) {
      t = String(t).trim().replace(/^#/, '');
      setDraft('');
      if (!t || s[0].indexOf(t) >= 0) return;
      s[1](s[0].concat([t]));
    }
    function remove(i) { var n = s[0].slice(); n.splice(i, 1); s[1](n); }
    return h('div', { className: cx('tt-tags', p.className), onClick: function () { if (input.current) input.current.focus(); } },
      s[0].map(function (t, i) {
        return h('span', { key: t, className: 'tt-tag' }, h('span', { className: 'tt-tag__text' }, t),
          h('button', { type: 'button', className: 'tt-tag__x', 'aria-label': '移除标签 ' + t, title: '移除',
            onClick: function (e) { e.stopPropagation(); remove(i); } }, h(Icon, { name: 'close', size: 12 })));
      }),
      h('input', {
        ref: input, className: 'tt-tags__input', value: draft, 'aria-label': p.ariaLabel || '添加标签',
        placeholder: s[0].length ? '+ 标签' : (p.placeholder || '添加标签，回车确认'),
        onChange: function (e) { var v = e.target.value; if (/[,，、]$/.test(v)) add(v.slice(0, -1)); else setDraft(v); },
        onKeyDown: function (e) {
          if (e.key === 'Enter') { e.preventDefault(); add(draft); }
          else if (e.key === 'Backspace' && !draft && s[0].length) remove(s[0].length - 1);
        },
        onBlur: function () { if (draft) add(draft); }
      }));
  }

  /* ---------- ContextMenu ---------- */
  function ContextMenu(p) {
    var ref = useRef(null);
    var ps = useState({ x: p.x || 0, y: p.y || 0 }), pos = ps[0], setPos = ps[1];
    var open = p.inline || p.open;
    var closeRef = useRef(p.onClose); closeRef.current = p.onClose;
    useLayoutEffect(function () {
      if (!open || p.inline || !ref.current) return;
      var r = ref.current.getBoundingClientRect(), x = p.x, y = p.y, W = window.innerWidth, H = window.innerHeight;
      if (x + r.width > W - 8) x = Math.max(8, x - r.width);
      if (y + r.height > H - 8) y = Math.max(8, H - r.height - 8);
      setPos({ x: x, y: y });
    }, [open, p.x, p.y]);
    useEffect(function () {
      if (!open || p.inline) return;
      function close() { if (closeRef.current) closeRef.current(); }
      function down(e) { if (ref.current && !ref.current.contains(e.target)) close(); }
      function key(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
      document.addEventListener('pointerdown', down, true);
      document.addEventListener('keydown', key, true);
      window.addEventListener('blur', close);
      window.addEventListener('resize', close);
      var first = ref.current && ref.current.querySelector('.tt-menu__item:not(:disabled)');
      if (first) first.focus({ preventScroll: true });
      return function () {
        document.removeEventListener('pointerdown', down, true);
        document.removeEventListener('keydown', key, true);
        window.removeEventListener('blur', close);
        window.removeEventListener('resize', close);
      };
    }, [open]);
    function onKey(e) {
      var items = [].slice.call(ref.current.querySelectorAll('.tt-menu__item:not(:disabled)'));
      var i = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
    }
    if (!open) return null;
    var el = h('div', {
      ref: ref, role: 'menu', 'aria-label': p.label, className: cx('tt-menu', p.inline && 'tt-menu--inline', p.className),
      style: p.inline ? p.style : { left: pos.x, top: pos.y }, onContextMenu: function (e) { e.preventDefault(); }, onKeyDown: onKey
    }, (p.items || []).map(function (it, i) {
      if (it.divider) return h('div', { key: i, className: 'tt-menu__div', role: 'separator' });
      if (it.heading) return h('div', { key: i, className: 'tt-menu__head' }, it.heading);
      return h('button', {
        key: i, type: 'button', role: 'menuitem', disabled: it.disabled, className: cx('tt-menu__item', it.danger && 'is-danger'),
        onClick: function () { if (closeRef.current) closeRef.current(); if (it.onSelect) it.onSelect(); }
      },
        h('span', { className: 'tt-menu__icon' }, it.icon ? h(Icon, { name: it.icon, size: 15 }) : null),
        h('span', { className: 'tt-menu__label' }, it.label),
        it.hint ? h('span', { className: 'tt-menu__hint' }, it.hint) : null,
        it.shortcut ? h('kbd', { className: 'tt-menu__kbd' }, it.shortcut) : null);
    }));
    return p.inline ? el : ReactDOM.createPortal(el, document.body);
  }

  /* ---------- PanelSection ---------- */
  function PanelSection(p) {
    var o = useState(p.defaultOpen !== false);
    return h('section', { className: cx('tt-panel', p.grow && o[0] && 'tt-panel--grow', p.className), style: p.style },
      h('header', { className: 'tt-panel__head' },
        h('button', { type: 'button', className: 'tt-panel__toggle', 'aria-expanded': o[0], onClick: function () { o[1](!o[0]); } },
          h(Icon, { name: o[0] ? 'chevron-down' : 'chevron-right', size: 14 }),
          h('span', { className: 'tt-panel__title' }, p.title),
          p.count != null ? h('span', { className: 'tt-count' }, p.count) : null),
        p.actions ? h('div', { className: 'tt-panel__actions' }, p.actions.map(function (a, i) {
          return h(IconButton, { key: i, layout: 'inline', icon: a.icon, label: a.label, onClick: a.onClick });
        })) : null),
      o[0] ? h('div', { className: 'tt-panel__body' }, p.children) : null);
  }

  /* ---------- tree helpers (pure) ---------- */
  var T = {
    find: function (nodes, id, trail) {
      trail = trail || [];
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i], t = trail.concat([n]);
        if (n.id === id) return t;
        if (n.children) { var r = T.find(n.children, id, t); if (r) return r; }
      }
      return null;
    },
    isInside: function (nodes, ancestorId, id) {
      var p = T.find(nodes, id);
      return !!p && p.slice(0, -1).some(function (n) { return n.id === ancestorId; });
    },
    remove: function (nodes, id) {
      var removed = null;
      function rec(list) {
        return list.filter(function (n) { if (n.id === id) { removed = n; return false; } return true; })
          .map(function (n) { return n.children ? assign(n, { children: rec(n.children) }) : n; });
      }
      var out = rec(nodes);
      return { nodes: out, removed: removed };
    },
    insert: function (nodes, targetId, pos, node) {
      function rec(list) {
        var out = [];
        list.forEach(function (n) {
          if (n.id === targetId) {
            if (pos === 'before') out.push(node, n);
            else if (pos === 'after') out.push(n, node);
            else out.push(assign(n, { children: (n.children || []).concat([node]) }));
          } else out.push(n.children ? assign(n, { children: rec(n.children) }) : n);
        });
        return out;
      }
      return rec(nodes);
    },
    move: function (nodes, dragId, targetId, pos) {
      if (dragId === targetId || T.isInside(nodes, dragId, targetId)) return nodes;
      var r = T.remove(nodes, dragId);
      return r.removed ? T.insert(r.nodes, targetId, pos, r.removed) : nodes;
    },
    update: function (nodes, id, fn) {
      return nodes.map(function (n) {
        if (n.id === id) return fn(n);
        return n.children ? assign(n, { children: T.update(n.children, id, fn) }) : n;
      });
    },
    count: function (n) { return (n.children || []).reduce(function (s, c) { return s + 1 + T.count(c); }, 0); },
    flatten: function (nodes, expanded, depth, parent, out) {
      depth = depth || 0; out = out || [];
      nodes.forEach(function (n) {
        out.push({ node: n, depth: depth, parent: parent || null });
        if (n.children && n.children.length && expanded[n.id]) T.flatten(n.children, expanded, depth + 1, n, out);
      });
      return out;
    }
  };

  function ensureVisible(box, el) {
    if (!box || !el) return;
    var b = box.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (r.top < b.top) box.scrollTop -= (b.top - r.top) + 4;
    else if (r.bottom > b.bottom) box.scrollTop += (r.bottom - b.bottom) + 4;
  }

  /* ---------- ProjectTree ---------- */
  function ProjectTree(p) {
    var ns = useControllable(p.nodes, p.defaultNodes || [], p.onChange), nodes = ns[0], setNodes = ns[1];
    var ss = useControllable(p.selectedId, p.defaultSelectedId != null ? p.defaultSelectedId : null), sel = ss[0], setSel = ss[1];
    var es = useState(function () {
      var m = {};
      (p.defaultExpanded || (p.nodes || p.defaultNodes || []).map(function (n) { return n.id; })).forEach(function (id) { m[id] = true; });
      return m;
    }), expanded = es[0], setExpanded = es[1];
    var rs = useState(null), renaming = rs[0], setRenaming = rs[1];
    var ds = useState(null), drag = ds[0], setDrag = ds[1];
    var ms = useState(null), menu = ms[0], setMenu = ms[1];
    var root = useRef(null), hoverTimer = useRef(null);
    var rows = useMemo(function () { return T.flatten(nodes, expanded); }, [nodes, expanded]);

    function select(n) { setSel(n.id); if (p.onSelect) p.onSelect(n); }
    function toggle(id, force) { setExpanded(function (e) { var o = assign(e); o[id] = force != null ? force : !e[id]; return o; }); }
    function focusRow(id) {
      requestAnimationFrame(function () {
        var el = root.current && root.current.querySelector('[data-id="' + id + '"]');
        if (el) { el.focus({ preventScroll: true }); ensureVisible(root.current, el); }
      });
    }
    function create(target, asChild) {
      var node = { id: uid('n'), name: '未命名档案', type: '' };
      setNodes(function (cur) {
        if (!target) return cur.concat([node]);
        return T.insert(cur, target.id, asChild ? 'inside' : 'after', node);
      });
      if (target && asChild) toggle(target.id, true);
      setSel(node.id); setRenaming(node.id);
      if (p.onCreate) p.onCreate(node, target || null, !!asChild);
    }
    function doRemove(n) { setNodes(function (cur) { return T.remove(cur, n.id).nodes; }); if (p.onDelete) p.onDelete(n); }
    function remove(n) { if (p.onRequestDelete) p.onRequestDelete(n, function () { doRemove(n); }); else doRemove(n); }
    function commitRename(id, name) {
      name = String(name).trim(); setRenaming(null);
      if (name) setNodes(function (cur) { return T.update(cur, id, function (n) { return assign(n, { name: name }); }); });
      focusRow(id);
    }
    function openMenu(e, n) {
      e.preventDefault(); e.stopPropagation();
      if (n) setSel(n.id);
      if (p.onContextMenu) { p.onContextMenu(e, n); return; }
      if (p.contextMenu === false) return;
      var kids = n ? T.count(n) : 0;
      var items = n ? [
        { label: '新建同级档案', icon: 'sibling', onSelect: function () { create(n, false); } },
        { label: '新建子档案', icon: 'child', onSelect: function () { create(n, true); } },
        { divider: true },
        { label: '重命名', icon: 'edit', shortcut: 'F2', onSelect: function () { setRenaming(n.id); } },
        { divider: true },
        { label: kids ? '删除（连同 ' + kids + ' 个子档案）' : '删除档案', icon: 'trash', danger: true, onSelect: function () { remove(n); } }
      ] : [{ label: '新建档案', icon: 'plus', onSelect: function () { create(null); } }];
      setMenu({ x: e.clientX, y: e.clientY, items: items });
    }
    function onDragStart(e, n) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', n.name); } catch (_) { /* ignore */ }
      setDrag({ id: n.id, over: null, pos: null });
    }
    function onDragOver(e, n) {
      if (!drag) return;
      if (n.id === drag.id || T.isInside(nodes, drag.id, n.id)) { if (drag.over) setDrag({ id: drag.id, over: null, pos: null }); return; }
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      var r = e.currentTarget.getBoundingClientRect(), t = (e.clientY - r.top) / r.height;
      var pos = t < 0.28 ? 'before' : t > 0.72 ? 'after' : 'inside';
      if (drag.over !== n.id || drag.pos !== pos) {
        setDrag({ id: drag.id, over: n.id, pos: pos });
        clearTimeout(hoverTimer.current);
        if (pos === 'inside' && n.children && n.children.length && !expanded[n.id]) {
          hoverTimer.current = setTimeout(function () { toggle(n.id, true); }, 650);
        }
      }
    }
    function onDrop(e, n) {
      e.preventDefault(); clearTimeout(hoverTimer.current);
      if (drag && drag.over === n.id) {
        var d = drag;
        setNodes(function (cur) { return T.move(cur, d.id, n.id, d.pos); });
        if (d.pos === 'inside') toggle(n.id, true);
        setSel(d.id);
        if (p.onMove) p.onMove(d.id, n.id, d.pos);
      }
      setDrag(null);
    }
    function onDragEnd() { clearTimeout(hoverTimer.current); setDrag(null); }
    function onKey(e, i) {
      if (renaming) return;
      var row = rows[i], n = row.node, has = n.children && n.children.length, next = null;
      if (e.key === 'ArrowDown') next = rows[Math.min(rows.length - 1, i + 1)];
      else if (e.key === 'ArrowUp') next = rows[Math.max(0, i - 1)];
      else if (e.key === 'ArrowRight') { if (has && !expanded[n.id]) toggle(n.id, true); else if (has) next = rows[i + 1]; }
      else if (e.key === 'ArrowLeft') {
        if (has && expanded[n.id]) toggle(n.id, false);
        else if (row.parent) next = rows.filter(function (r) { return r.node.id === row.parent.id; })[0];
      }
      else if (e.key === 'F2') setRenaming(n.id);
      else if (e.key === 'Enter') select(n);
      else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
        var r = e.currentTarget.getBoundingClientRect();
        openMenu({ preventDefault: function () {}, stopPropagation: function () {}, clientX: r.left + 40, clientY: r.bottom }, n);
      }
      else return;
      e.preventDefault();
      if (next) { select(next.node); focusRow(next.node.id); }
    }
    function renderRow(row, i) {
      var n = row.node, has = !!(n.children && n.children.length), open = !!expanded[n.id];
      var isSel = sel === n.id, dropPos = drag && drag.over === n.id ? drag.pos : null;
      var indent = 8 + row.depth * 16;
      return h('div', {
        key: n.id, 'data-id': n.id, role: 'treeitem', 'aria-level': row.depth + 1, 'aria-expanded': has ? open : undefined,
        'aria-selected': isSel, tabIndex: isSel || (!sel && i === 0) ? 0 : -1,
        className: cx('tt-tree__row', isSel && 'is-selected', dropPos && 'is-drop-' + dropPos, drag && drag.id === n.id && 'is-dragging'),
        style: { paddingLeft: indent, '--indent': (indent + 18) + 'px' },
        draggable: renaming !== n.id,
        onDragStart: function (e) { onDragStart(e, n); }, onDragOver: function (e) { onDragOver(e, n); },
        onDrop: function (e) { onDrop(e, n); }, onDragEnd: onDragEnd,
        onClick: function () { select(n); }, onDoubleClick: function () { setRenaming(n.id); },
        onContextMenu: function (e) { openMenu(e, n); }, onKeyDown: function (e) { onKey(e, i); }
      },
        h('span', { className: 'tt-tree__twisty', onClick: function (e) { if (has) { e.stopPropagation(); toggle(n.id); } } },
          has ? h(Icon, { name: open ? 'chevron-down' : 'chevron-right', size: 14 }) : null),
        h(Icon, { name: has ? 'folder' : 'archive', size: 15, className: 'tt-tree__icon' }),
        renaming === n.id
          ? h(InlineEdit, { className: 'tt-tree__rename', value: n.name, ariaLabel: '档案名称',
            onCommit: function (v) { commitRename(n.id, v); }, onCancel: function () { setRenaming(null); focusRow(n.id); } })
          : h('span', { className: 'tt-tree__name' }, n.name || '未命名档案'),
        has && !open ? h('span', { className: 'tt-count', title: '包含 ' + T.count(n) + ' 个子档案' }, T.count(n)) : null,
        n.type ? h('span', { className: 'tt-tree__type' }, n.type) : null);
    }
    return h(Frag, null,
      h('div', { ref: root, className: cx('tt-tree', p.className), role: 'tree', 'aria-label': p.label || '项目树', style: p.style,
        onContextMenu: function (e) { openMenu(e, null); } },
        rows.length ? h('div', { className: 'tt-tree__inner' }, rows.map(renderRow))
          : h('div', { className: 'tt-tree__empty' }, '还没有档案。右键空白处，或点上方“新建档案”开始。')),
      menu ? h(ContextMenu, { open: true, x: menu.x, y: menu.y, items: menu.items, onClose: function () { setMenu(null); } }) : null);
  }
  ProjectTree.utils = T;

  /* ---------- DocTabs ---------- */
  function DocTabs(p) {
    var ts = useControllable(p.tabs, p.defaultTabs || [], p.onTabsChange), tabs = ts[0], setTabs = ts[1];
    var as = useControllable(p.activeId, p.defaultActiveId != null ? p.defaultActiveId : (tabs[0] ? tabs[0].id : null), p.onActiveChange);
    var active = as[0], setActive = as[1];
    var sc = useRef(null);
    useEffect(function () {
      var box = sc.current; if (!box) return;
      var el = box.querySelector('[data-tab="' + active + '"]'); if (!el) return;
      var l = el.offsetLeft, r = l + el.offsetWidth;
      if (l < box.scrollLeft) box.scrollLeft = l - 8;
      else if (r > box.scrollLeft + box.clientWidth) box.scrollLeft = r - box.clientWidth + 8;
    }, [active, tabs.length]);
    function activate(t) { setActive(t.id); if (p.onSelect) p.onSelect(t); }
    function close(t) {
      var i = tabs.findIndex(function (x) { return x.id === t.id; });
      var next = tabs.filter(function (x) { return x.id !== t.id; });
      setTabs(next);
      if (t.id === active) { var n = next[i] || next[i - 1]; setActive(n ? n.id : null); }
      if (p.onClose) p.onClose(t);
    }
    function onKey(e, i) {
      var t = e.key === 'ArrowRight' ? tabs[i + 1] : e.key === 'ArrowLeft' ? tabs[i - 1] : null;
      if (t) { e.preventDefault(); activate(t); var el = sc.current.querySelector('[data-tab="' + t.id + '"]'); if (el) el.focus({ preventScroll: true }); }
      else if (e.key === 'Delete' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w')) { e.preventDefault(); close(tabs[i]); }
    }
    return h('div', { className: cx('tt-tabs', p.className), style: p.style },
      h('div', { className: 'tt-tabs__scroll', ref: sc, role: 'tablist', 'aria-label': '打开的档案',
        onWheel: function (e) { if (sc.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) sc.current.scrollLeft += e.deltaY; } },
        tabs.map(function (t, i) {
          var act = t.id === active;
          return h('div', {
            key: t.id, 'data-tab': t.id, role: 'tab', 'aria-selected': act, tabIndex: act ? 0 : -1, title: t.title,
            className: cx('tt-tab', act && 'is-active'),
            onClick: function () { activate(t); }, onKeyDown: function (e) { onKey(e, i); },
            onMouseDown: function (e) { if (e.button === 1) { e.preventDefault(); close(t); } }
          },
            h(Icon, { name: 'archive', size: 14, className: 'tt-tab__icon' }),
            h('span', { className: 'tt-tab__title' }, t.title || '未命名档案'),
            t.type ? h('span', { className: 'tt-tab__type' }, t.type) : null,
            h('button', { type: 'button', tabIndex: -1, className: cx('tt-tab__close', t.dirty && 'is-dirty'), 'aria-label': '关闭 ' + t.title,
              title: t.dirty ? '有未保存的改动 · 关闭（Ctrl+W）' : '关闭（Ctrl+W）',
              onClick: function (e) { e.stopPropagation(); close(t); } },
              h('span', { className: 'tt-tab__dot' }), h(Icon, { name: 'close', size: 12 })));
        })),
      p.onAdd ? h(IconButton, { layout: 'inline', icon: 'plus', label: '新建档案', onClick: p.onAdd, className: 'tt-tabs__add' }) : null);
  }

  /* ---------- module kinds: default data + how a preset strips the filled-in values ---------- */
  var KINDS = {
    text: { icon: 'mod-text', name: '文本', desc: '长段文字',
      make: function () { return { text: '' }; },
      strip: function () { return { text: '' }; } },
    number: { icon: 'mod-number', name: '数值', desc: '年龄、人口、战力',
      make: function () { return { rows: [{ label: '', value: '', unit: '' }] }; },
      strip: function (d) { return { rows: (d.rows || []).map(function (r) { return { label: r.label, value: '', unit: r.unit }; }) }; } },
    axis: { icon: 'mod-axis', name: '倾向轴', desc: '善良 ↔ 邪恶',
      make: function () { return { rows: [{ left: '善良', right: '邪恶', value: 0 }] }; },
      strip: function (d) { return { rows: (d.rows || []).map(function (r) { return { left: r.left, right: r.right, value: 0 }; }) }; } },
    radar: { icon: 'mod-radar', name: '雷达图', desc: '多维度打分',
      make: function () { return { max: 10, rows: '力敏智魅体'.split('').map(function (n) { return { name: n, value: 5 }; }) }; },
      strip: function (d) { return { max: d.max, rows: (d.rows || []).map(function (r) { return { name: r.name, value: 0 }; }) }; } },
    bool: { icon: 'mod-bool', name: '是/否', desc: '是否拥有某种能力',
      make: function () { return { rows: [{ statement: '', value: null, yes: '是', no: '否' }] }; },
      strip: function (d) { return { rows: (d.rows || []).map(function (r) { return { statement: r.statement, value: null, yes: r.yes, no: r.no }; }) }; } }
  };

  /* ---------- ModuleCard: the shell every module shares ---------- */
  function ModuleCard(p) {
    var meta = KINDS[p.kind] || { icon: 'more', name: '模块' };
    var ts = useControllable(p.title, p.defaultTitle != null ? p.defaultTitle : meta.name, p.onTitleChange);
    return h('section', {
      className: cx('tt-mod', p.dragging && 'is-dragging', p.drop === 'before' && 'is-drop-before', p.drop === 'after' && 'is-drop-after', p.className),
      'data-kind': p.kind, style: p.style, onDragOver: p.onDragOver, onDrop: p.onDrop, 'aria-label': (ts[0] || meta.name) + '（' + meta.name + '模块）'
    },
      h('header', { className: 'tt-mod__head', onContextMenu: p.onHeadContextMenu },
        h('span', { className: 'tt-mod__grip', draggable: !!p.onDragStart, onDragStart: p.onDragStart, onDragEnd: p.onDragEnd, title: '按住拖动排序' },
          h(Icon, { name: 'grip', size: 16 })),
        h('span', { className: 'tt-mod__kind', title: meta.name + '模块' }, h(Icon, { name: meta.icon, size: 15 })),
        h('input', { className: 'tt-mod__title', value: ts[0], placeholder: meta.name, 'aria-label': '模块标题',
          onChange: function (e) { ts[1](e.target.value); } }),
        h('div', { className: 'tt-mod__actions' },
          h(IconButton, { layout: 'inline', icon: 'arrow-up', label: '上移', disabled: p.canMoveUp === false, onClick: p.onMoveUp }),
          h(IconButton, { layout: 'inline', icon: 'arrow-down', label: '下移', disabled: p.canMoveDown === false, onClick: p.onMoveDown }),
          h(IconButton, { layout: 'inline', icon: 'trash', label: '删除', tone: 'danger', onClick: p.onDelete }))),
      h('div', { className: 'tt-mod__body' }, p.children));
  }

  function useRows(p, def) {
    var s = useControllable(p.data, p.defaultData || def, p.onChange), data = s[0], setData = s[1];
    return {
      data: data, setData: setData, rows: data.rows || [],
      set: function (i, patch) { setData(function (d) { return assign(d, { rows: d.rows.map(function (r, j) { return j === i ? assign(r, patch) : r; }) }); }); },
      add: function (row) { setData(function (d) { return assign(d, { rows: (d.rows || []).concat([row]) }); }); },
      del: function (i) { setData(function (d) { return assign(d, { rows: d.rows.filter(function (_, j) { return j !== i; }) }); }); }
    };
  }
  function RowDelete(p) { return h('button', { type: 'button', className: 'tt-rowdel', onClick: p.onClick, 'aria-label': p.ariaLabel || '删除这一行' }, '删除'); }
  function AddRow(p) { return h(Button, { variant: 'quiet', size: 'sm', icon: 'plus', className: 'tt-modadd', onClick: p.onClick }, p.children); }

  /* ---------- TextModule ---------- */
  function TextModule(p) {
    var s = useControllable(p.data, p.defaultData || { text: '' }, p.onChange);
    return h(TextField, { multiline: true, variant: 'prose', rows: p.rows || 4, value: s[0].text || '',
      placeholder: p.placeholder || '在这里写下设定、简介或剧情分析……', ariaLabel: p.ariaLabel || '文本内容',
      onChange: function (v) { s[1](function (d) { return assign(d, { text: v }); }); } });
  }

  /* ---------- NumberModule ---------- */
  function NumberModule(p) {
    var m = useRows(p, { rows: [{ label: '年龄', value: '', unit: '岁' }] });
    return h('div', { className: 'tt-rows' },
      m.rows.map(function (r, i) {
        return h('div', { key: i, className: 'tt-row tt-num' },
          h('input', { className: 'tt-cell tt-cell--label', value: r.label, placeholder: '名称', 'aria-label': '数值名称',
            onChange: function (e) { m.set(i, { label: e.target.value }); } }),
          h('input', { className: 'tt-cell tt-cell--num', inputMode: 'decimal', value: r.value, placeholder: '—', 'aria-label': (r.label || '数值') + '的值',
            onChange: function (e) { m.set(i, { value: e.target.value.replace(/[^0-9.,\-]/g, '') }); } }),
          h('input', { className: 'tt-cell tt-cell--unit', value: r.unit || '', placeholder: '单位', 'aria-label': '单位',
            onChange: function (e) { m.set(i, { unit: e.target.value }); } }),
          h(RowDelete, { onClick: function () { m.del(i); } }));
      }),
      h(AddRow, { onClick: function () { m.add({ label: '', value: '', unit: '' }); } }, '添加数值'));
  }

  /* ---------- AxisModule: two poles, one I-beam cursor, no colour fill ---------- */
  function AxisRow(p) {
    var row = p.row, track = useRef(null);
    var v = clamp(Math.round(row.value || 0), -100, 100);
    var L = Math.round((100 - v) / 2), R = 100 - L;
    function setV(nv) { p.onChange({ value: clamp(Math.round(nv), -100, 100) }); }
    function fromX(x) { var r = track.current.getBoundingClientRect(); var nv = ((x - r.left) / r.width - 0.5) * 200; if (Math.abs(nv) < 3) nv = 0; setV(nv); }
    function pct(side) { return function (e) { var n = clamp(parseInt(e.target.value || '0', 10) || 0, 0, 100); setV(side === 'L' ? 100 - 2 * n : 2 * n - 100); }; }
    var left = row.left || '左端', right = row.right || '右端';
    return h('div', { className: 'tt-axis tt-row' },
      h('input', { className: 'tt-cell tt-axis__pole tt-axis__pole--l', value: row.left, placeholder: '左端', 'aria-label': '左端名称',
        onChange: function (e) { p.onChange({ left: e.target.value }); } }),
      h('input', { className: 'tt-axis__pct', type: 'number', min: 0, max: 100, value: L, 'aria-label': left + '百分比', onChange: pct('L') }),
      h('div', {
        ref: track, className: 'tt-axis__track', role: 'slider', tabIndex: 0, title: '拖动游标；双击回到中点',
        'aria-label': left + ' 与 ' + right + ' 的倾向', 'aria-valuemin': -100, 'aria-valuemax': 100, 'aria-valuenow': v,
        'aria-valuetext': left + ' ' + L + '%，' + right + ' ' + R + '%',
        onPointerDown: function (e) { if (e.button !== 0) return; e.preventDefault(); track.current.focus({ preventScroll: true }); track.current.setPointerCapture(e.pointerId); fromX(e.clientX); },
        onPointerMove: function (e) { if (track.current.hasPointerCapture && track.current.hasPointerCapture(e.pointerId)) fromX(e.clientX); },
        onDoubleClick: function () { setV(0); },
        onKeyDown: function (e) {
          var step = e.shiftKey ? 10 : 2;
          var map = { ArrowLeft: v - step, ArrowDown: v - step, ArrowRight: v + step, ArrowUp: v + step, Home: -100, End: 100, '0': 0 };
          if (e.key in map) { e.preventDefault(); setV(map[e.key]); }
        }
      }, h('span', { className: 'tt-axis__ticks' }), h('span', { className: 'tt-axis__center' }),
        h('span', { className: 'tt-axis__cursor', style: { left: ((v + 100) / 2) + '%' } })),
      h('input', { className: 'tt-axis__pct', type: 'number', min: 0, max: 100, value: R, 'aria-label': right + '百分比', onChange: pct('R') }),
      h('input', { className: 'tt-cell tt-axis__pole tt-axis__pole--r', value: row.right, placeholder: '右端', 'aria-label': '右端名称',
        onChange: function (e) { p.onChange({ right: e.target.value }); } }),
      h(RowDelete, { onClick: p.onDelete }));
  }
  function AxisModule(p) {
    var m = useRows(p, { rows: [{ left: '内向', right: '外向', value: 0 }] });
    return h('div', { className: 'tt-rows' },
      m.rows.map(function (r, i) { return h(AxisRow, { key: i, row: r, onChange: function (patch) { m.set(i, patch); }, onDelete: function () { m.del(i); } }); }),
      h(AddRow, { onClick: function () { m.add({ left: '', right: '', value: 0 }); } }, '添加倾向轴'));
  }

  /* ---------- RadarModule ---------- */
  function RadarChart(p) {
    var rows = p.rows || [], n = rows.length, size = p.size || 220, max = p.max || 10;
    if (n < 3) return h('div', { className: 'tt-radar__empty', style: { width: size, height: size } }, '至少需要 3 个维度', h('br'), '才能画出雷达图');
    var c = size / 2, R = size / 2 - 30;
    function ang(i) { return -Math.PI / 2 + i * 2 * Math.PI / n; }
    function pt(i, f) { return [c + Math.cos(ang(i)) * R * f, c + Math.sin(ang(i)) * R * f]; }
    function val(i) { return clamp((+rows[i].value || 0) / max, 0, 1); }
    function poly(f) { return rows.map(function (_, i) { return pt(i, typeof f === 'function' ? f(i) : f).map(function (x) { return x.toFixed(1); }).join(','); }).join(' '); }
    return h('svg', { className: 'tt-radar__chart', width: size, height: size, viewBox: '0 0 ' + size + ' ' + size, role: 'img',
      'aria-label': '雷达图：' + rows.map(function (r) { return (r.name || '未命名') + ' ' + r.value; }).join('，') },
      [0.2, 0.4, 0.6, 0.8, 1].map(function (f) { return h('polygon', { key: f, className: cx('tt-radar__ring', f === 1 && 'tt-radar__ring--outer'), points: poly(f) }); }),
      rows.map(function (_, i) { var q = pt(i, 1); return h('line', { key: 'a' + i, className: 'tt-radar__axis', x1: c, y1: c, x2: q[0], y2: q[1] }); }),
      h('polygon', { className: 'tt-radar__shape', points: poly(val) }),
      rows.map(function (_, i) { var q = pt(i, val(i)); return h('circle', { key: 'p' + i, className: 'tt-radar__pt', cx: q[0], cy: q[1], r: 2.5 }); }),
      rows.map(function (r, i) {
        var a = ang(i), cos = Math.cos(a);
        return h('text', { key: 'l' + i, className: 'tt-radar__label', x: c + cos * (R + 14), y: c + Math.sin(a) * (R + 14),
          textAnchor: Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end', dominantBaseline: 'middle' }, (r.name || '·').slice(0, 6));
      }));
  }
  function RadarModule(p) {
    var m = useRows(p, KINDS.radar.make());
    var max = +m.data.max || 10, step = max <= 10 ? 0.5 : 1;
    return h('div', { className: 'tt-radar' },
      h('div', { className: 'tt-radar__chartwrap' }, h(RadarChart, { rows: m.rows, max: max })),
      h('div', { className: 'tt-radar__dims' },
        m.rows.map(function (r, i) {
          return h('div', { key: i, className: 'tt-dim tt-row' },
            h('input', { className: 'tt-cell tt-dim__name', value: r.name, maxLength: 8, placeholder: '维度', 'aria-label': '维度名称',
              onChange: function (e) { m.set(i, { name: e.target.value }); } }),
            h('input', { className: 'tt-range', type: 'range', min: 0, max: max, step: step, value: r.value,
              style: { '--pct': (clamp((+r.value || 0) / max, 0, 1) * 100) + '%' }, 'aria-label': (r.name || '维度') + '分值',
              onChange: function (e) { m.set(i, { value: +e.target.value }); } }),
            h('input', { className: 'tt-cell tt-dim__val', type: 'number', min: 0, max: max, step: step, value: r.value, 'aria-label': (r.name || '维度') + '分值',
              onChange: function (e) { m.set(i, { value: clamp(+e.target.value || 0, 0, max) }); } }),
            h(RowDelete, { onClick: function () { m.del(i); } }));
        }),
        h('div', { className: 'tt-radar__foot' },
          h(AddRow, { onClick: function () { m.add({ name: '', value: max / 2 }); } }, '添加维度'),
          h('label', { className: 'tt-radar__max' }, '满分',
            h('input', { className: 'tt-cell tt-dim__val', type: 'number', min: 1, value: m.data.max || 10, 'aria-label': '满分',
              onChange: function (e) { var nv = Math.max(1, +e.target.value || 10); m.setData(function (d) { return assign(d, { max: nv }); }); } })))));
  }

  /* ---------- BooleanModule: 是 / 否 / 未设定 ---------- */
  function BoolSeg(p) {
    var row = p.row, es = useState(null), edit = es[0], setEdit = es[1];
    function opt(key, val, label) {
      if (edit === key) {
        return h(InlineEdit, { key: key, className: 'tt-seg__edit', value: label, ariaLabel: '选项名称',
          onCommit: function (v) { setEdit(null); var o = {}; o[key] = String(v).trim() || (key === 'yes' ? '是' : '否'); p.onChange(o); },
          onCancel: function () { setEdit(null); } });
      }
      return h('button', { key: key, type: 'button', role: 'radio', 'aria-checked': row.value === val, className: 'tt-seg__opt',
        title: '单击选择，再点一次取消；双击改名',
        onClick: function () { p.onChange({ value: row.value === val ? null : val }); },
        onDoubleClick: function () { setEdit(key); } }, label);
    }
    return h('div', { className: 'tt-seg', role: 'radiogroup', 'aria-label': row.statement || '是否' },
      opt('yes', true, row.yes || '是'), opt('no', false, row.no || '否'));
  }
  function BooleanModule(p) {
    var m = useRows(p, { rows: [{ statement: '是否拥有超自然能力？', value: null, yes: '是', no: '否' }] });
    return h('div', { className: 'tt-rows' },
      m.rows.map(function (r, i) {
        return h('div', { key: i, className: 'tt-row tt-bool' },
          h('input', { className: 'tt-cell tt-bool__stmt', value: r.statement, placeholder: '写一个是非问题，例如：是否已婚？', 'aria-label': '问题',
            onChange: function (e) { m.set(i, { statement: e.target.value }); } }),
          h(BoolSeg, { row: r, onChange: function (patch) { m.set(i, patch); } }),
          h('span', { className: 'tt-bool__state' }, r.value == null ? '未设定' : ''),
          h(RowDelete, { onClick: function () { m.del(i); } }));
      }),
      h(AddRow, { onClick: function () { m.add({ statement: '', value: null, yes: '是', no: '否' }); } }, '添加是/否项'));
  }

  var BODIES = { text: TextModule, number: NumberModule, axis: AxisModule, radar: RadarModule, bool: BooleanModule };

  /* ---------- ModuleList: ordering, insert, delete, drag ---------- */
  function ModuleList(p) {
    var ls = useControllable(p.modules, p.defaultModules || [], p.onChange), list = ls[0], setList = ls[1];
    var ds = useState(null), drag = ds[0], setDrag = ds[1];
    var ms = useState(null), menu = ms[0], setMenu = ms[1];
    function patch(id, obj) { setList(function (cur) { return cur.map(function (m) { return m.id === id ? assign(m, obj) : m; }); }); }
    function move(i, d) { setList(function (cur) { var j = i + d; if (j < 0 || j >= cur.length) return cur; var n = cur.slice(), t = n[i]; n[i] = n[j]; n[j] = t; return n; }); }
    function remove(id) { setList(function (cur) { return cur.filter(function (m) { return m.id !== id; }); }); }
    function insert(kind, at) { setList(function (cur) { var n = cur.slice(); n.splice(at == null ? n.length : at, 0, ModuleList.create(kind)); return n; }); }
    function reorder(dragId, overId, pos) {
      setList(function (cur) {
        if (dragId === overId) return cur;
        var item = cur.filter(function (m) { return m.id === dragId; })[0]; if (!item) return cur;
        var rest = cur.filter(function (m) { return m.id !== dragId; });
        var idx = rest.findIndex(function (m) { return m.id === overId; }); if (idx < 0) return cur;
        rest.splice(pos === 'after' ? idx + 1 : idx, 0, item);
        return rest;
      });
    }
    function kindItems(at, heading) {
      return [{ heading: heading || '插入模块' }].concat(Object.keys(KINDS).map(function (k) {
        return { label: KINDS[k].name + '模块', icon: KINDS[k].icon, hint: KINDS[k].desc, onSelect: function () { insert(k, at); } };
      }));
    }
    function openAt(e, items) {
      e.preventDefault(); e.stopPropagation();
      var r = e.currentTarget.getBoundingClientRect(), ctx = e.type === 'contextmenu';
      setMenu({ x: ctx ? e.clientX : r.left, y: ctx ? e.clientY : r.bottom + 4, items: items });
    }
    var cards = list.map(function (m, i) {
      var Body = BODIES[m.kind];
      return h(ModuleCard, {
        key: m.id, kind: m.kind, title: m.title, onTitleChange: function (t) { patch(m.id, { title: t }); },
        canMoveUp: i > 0, canMoveDown: i < list.length - 1,
        onMoveUp: function () { move(i, -1); }, onMoveDown: function () { move(i, 1); }, onDelete: function () { remove(m.id); },
        dragging: drag && drag.id === m.id, drop: drag && drag.over === m.id ? drag.pos : null,
        onHeadContextMenu: function (e) {
          if (e.target.closest('input')) return;
          openAt(e, kindItems(i + 1, '在此模块下方插入').concat([{ divider: true }, { label: '删除这个模块', icon: 'trash', danger: true, onSelect: function () { remove(m.id); } }]));
        },
        onDragStart: function (e) {
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', m.title || ''); } catch (_) { /* ignore */ }
          var card = e.currentTarget.closest('.tt-mod'); if (card && e.dataTransfer.setDragImage) e.dataTransfer.setDragImage(card, 24, 20);
          setDrag({ id: m.id, over: null, pos: null });
        },
        onDragOver: function (e) {
          if (!drag) return; e.preventDefault();
          var r = e.currentTarget.getBoundingClientRect(), pos = (e.clientY - r.top) < r.height / 2 ? 'before' : 'after';
          if (drag.over !== m.id || drag.pos !== pos) setDrag({ id: drag.id, over: m.id, pos: pos });
        },
        onDrop: function (e) { e.preventDefault(); if (drag && drag.over) reorder(drag.id, drag.over, drag.pos); setDrag(null); },
        onDragEnd: function () { setDrag(null); }
      }, Body ? h(Body, { data: m.data || KINDS[m.kind].make(), onChange: function (d) { patch(m.id, { data: d }); } }) : null);
    });
    return h('div', { className: cx('tt-modlist', p.className), style: p.style,
      onContextMenu: function (e) { if (e.target.closest('input,textarea,.tt-mod')) return; openAt(e, kindItems(null)); } },
      list.length ? cards : h('div', { className: 'tt-empty' },
        h('div', { className: 'tt-empty__title' }, '这个档案还没有模块'),
        '模块不是必填项。需要时点下方“插入模块”，或在这里右键。'),
      p.showInsert === false ? null : h('div', { className: 'tt-modlist__foot' },
        h(Button, { icon: 'plus', onClick: function (e) { openAt(e, kindItems(null)); } }, '插入模块'),
        p.footer || null),
      menu ? h(ContextMenu, { open: true, x: menu.x, y: menu.y, items: menu.items, onClose: function () { setMenu(null); } }) : null);
  }
  ModuleList.kinds = KINDS;
  ModuleList.create = function (kind, title) { return { id: uid('m'), kind: kind, title: title || KINDS[kind].name, data: KINDS[kind].make() }; };
  ModuleList.toPreset = function (modules) {
    return (modules || []).map(function (m) { return { kind: m.kind, title: m.title, data: KINDS[m.kind].strip(m.data || {}) }; });
  };
  ModuleList.fromPreset = function (preset) {
    return (preset.modules || []).map(function (m) { return { id: uid('m'), kind: m.kind, title: m.title, data: m.data ? clone(m.data) : KINDS[m.kind].make() }; });
  };

  /* ---------- ArchiveHeader ---------- */
  function ArchiveHeader(p) {
    var s = useControllable(p.value, p.defaultValue || { name: '', type: '', tags: [] }, p.onChange), v = s[0];
    var listId = useMemo(function () { return uid('types'); }, []);
    function set(k, val) { s[1](function (cur) { var n = assign(cur); n[k] = val; return n; }); }
    return h('header', { className: cx('tt-arch', p.className), style: p.style },
      h('input', { className: 'tt-arch__name', value: v.name || '', placeholder: '未命名档案', 'aria-label': '档案名称',
        onChange: function (e) { set('name', e.target.value); } }),
      h('div', { className: 'tt-arch__meta' },
        h('label', { className: 'tt-arch__field' }, h('span', { className: 'tt-arch__key' }, '类型'),
          h('input', { className: 'tt-cell tt-arch__type', value: v.type || '', placeholder: '随便写，如：角色', list: listId,
            onChange: function (e) { set('type', e.target.value); } })),
        h('datalist', { id: listId }, (p.typeSuggestions || []).map(function (t) { return h('option', { key: t, value: t }); })),
        h('div', { className: 'tt-arch__field tt-arch__field--tags' }, h('span', { className: 'tt-arch__key' }, '标签'),
          h(TagInput, { value: v.tags || [], onChange: function (t) { set('tags', t); } })),
        p.id ? h('span', { className: 'tt-arch__id', title: '内部编号，不可修改' }, 'ID ' + p.id) : null));
  }

  /* ---------- ReferenceList: which canvases point at this archive ---------- */
  function ReferenceList(p) {
    var refs = p.refs || [];
    return h('footer', { className: cx('tt-refs', p.className), style: p.style },
      h('div', { className: 'tt-refs__head' },
        h(Icon, { name: 'paperclip', size: 15 }),
        h('span', { className: 'tt-refs__title' }, '画布引用'),
        h('span', { className: 'tt-refs__sum' }, refs.length ? '该档案被 ' + refs.length + ' 张关系画布引用' : '尚未被任何关系画布引用')),
      refs.length ? h('ul', { className: 'tt-refs__list' }, refs.map(function (r) {
        return h('li', { key: r.id }, h('button', { type: 'button', className: 'tt-refs__item', onClick: function () { if (p.onJump) p.onJump(r); } },
          h(Icon, { name: 'canvas', size: 15 }),
          h('span', { className: 'tt-refs__name' }, r.name),
          r.count > 1 ? h('span', { className: 'tt-refs__count' }, r.count + ' 处') : null,
          h('span', { className: 'tt-refs__go' }, '跳转到画布', h(Icon, { name: 'jump', size: 13 }))));
      })) : h('p', { className: 'tt-refs__empty' }, '把这个档案从项目树拖进任意关系画布，这里就会出现引用。画布里的任何操作都不会改动档案本身。'));
  }

  /* ---------- PresetLibrary ---------- */
  function PresetLibrary(p) {
    var ls = useControllable(p.presets, p.defaultPresets || [], p.onChange), list = ls[0], setList = ls[1];
    var qs = useState(''), q = qs[0], setQ = qs[1];
    var ns = useState(false), naming = ns[0], setNaming = ns[1];
    var dn = useState(null), done = dn[0], setDone = dn[1];
    var timer = useRef(null);
    useEffect(function () { return function () { clearTimeout(timer.current); }; }, []);
    function flash(id, text) { setDone({ id: id, text: text }); clearTimeout(timer.current); timer.current = setTimeout(function () { setDone(null); }, 2400); }
    function save(name) {
      setNaming(false); name = String(name || '').trim(); if (!name) return;
      var preset = { id: uid('p'), name: name, modules: ModuleList.toPreset(p.currentModules || []), updated: Date.now() };
      setList(function (cur) { return [preset].concat(cur); });
      if (p.onSave) p.onSave(preset);
      flash(preset.id, '已保存');
    }
    function doImport(x) { if (p.onImport) p.onImport(x, ModuleList.fromPreset(x)); flash(x.id, '已导入 ' + x.modules.length + ' 个模块'); }
    var shown = list.filter(function (x) {
      return !q || x.name.indexOf(q) >= 0 || x.modules.some(function (m) { return (m.title || '').indexOf(q) >= 0; });
    });
    return h('div', { className: cx('tt-presets', p.className), style: p.style },
      h('header', { className: 'tt-presets__head' },
        h('div', { className: 'tt-presets__titles' },
          h('h3', { className: 'tt-presets__title' }, p.title || '预设库'),
          h('p', { className: 'tt-presets__note' }, '预设只记住模块的结构——标题、维度名、选项名；不会带走你填写的文字和数值。')),
        p.onClose ? h(IconButton, { layout: 'inline', icon: 'close', label: '收起', onClick: p.onClose }) : null),
      p.currentModules ? h('div', { className: 'tt-presets__save' },
        naming
          ? h(InlineEdit, { className: 'tt-input', value: '', placeholder: '给预设起个名字，回车保存', ariaLabel: '预设名称', onCommit: save, onCancel: function () { setNaming(false); } })
          : h(Button, { variant: 'primary', icon: 'preset', onClick: function () { setNaming(true); } }, '将当前模块存为预设'),
        naming ? null : h('span', { className: 'tt-presets__count' }, '当前档案有 ' + p.currentModules.length + ' 个模块')) : null,
      h('label', { className: 'tt-presets__search' }, h(Icon, { name: 'search', size: 14 }),
        h('input', { className: 'tt-presets__q', value: q, placeholder: '搜索预设或模块名', 'aria-label': '搜索预设', onChange: function (e) { setQ(e.target.value); } })),
      h('div', { className: 'tt-presets__list' }, shown.length ? shown.map(function (x) {
        return h('article', { key: x.id, className: 'tt-preset' },
          h('div', { className: 'tt-preset__top' },
            h('span', { className: 'tt-preset__name' }, x.name),
            h('span', { className: 'tt-preset__meta' }, x.modules.length + ' 个模块' + (x.updated ? ' · ' + fmtDate(x.updated) : ''))),
          h('div', { className: 'tt-preset__chips' }, x.modules.map(function (m, i) {
            var k = KINDS[m.kind] || { icon: 'more', name: '模块' };
            return h('span', { key: i, className: 'tt-chip' }, h(Icon, { name: k.icon, size: 13 }), m.title || k.name);
          })),
          h('div', { className: 'tt-preset__actions' },
            h(Button, { size: 'sm', icon: 'import', onClick: function () { doImport(x); } }, '导入到当前档案'),
            h(Button, { size: 'sm', variant: 'quiet', tone: 'danger', onClick: function () {
              setList(function (cur) { return cur.filter(function (y) { return y.id !== x.id; }); }); if (p.onDelete) p.onDelete(x);
            } }, '删除'),
            done && done.id === x.id ? h('span', { className: 'tt-preset__done', role: 'status' }, h(Icon, { name: 'check', size: 13 }), done.text) : null));
      }) : h('div', { className: 'tt-empty' }, q ? '没有匹配“' + q + '”的预设。' : '还没有预设。把一个档案的模块排好，再点上方按钮存下来。')));
  }

  /* ---------- Dialog ---------- */
  function Dialog(p) {
    var id = useMemo(function () { return uid('dlg'); }, []);
    var ref = useRef(null);
    var closeRef = useRef(p.onClose); closeRef.current = p.onClose;
    useEffect(function () {
      if (!p.open || p.inline) return;
      var prev = document.activeElement;
      function key(e) { if (e.key === 'Escape') { e.stopPropagation(); if (closeRef.current) closeRef.current(); } }
      document.addEventListener('keydown', key, true);
      var f = ref.current && (ref.current.querySelector('[data-autofocus]') || ref.current.querySelector('.tt-dialog__foot button') || ref.current.querySelector('input, button'));
      if (f) f.focus({ preventScroll: true });
      return function () { document.removeEventListener('keydown', key, true); if (prev && prev.focus) prev.focus({ preventScroll: true }); };
    }, [p.open]);
    var box = h('div', { ref: ref, className: cx('tt-dialog', p.className), role: p.role || 'dialog', 'aria-modal': p.inline ? undefined : true, 'aria-labelledby': id, style: { width: p.width } },
      h('div', { className: 'tt-dialog__head' },
        h('h2', { id: id, className: 'tt-dialog__title' }, p.title),
        p.onClose ? h(IconButton, { layout: 'inline', icon: 'close', label: '关闭', onClick: p.onClose }) : null),
      h('div', { className: 'tt-dialog__body' }, p.children),
      p.footer ? h('div', { className: 'tt-dialog__foot' }, p.footer) : null);
    if (p.inline) return h('div', { className: 'tt-dialog-inline' }, box);
    if (!p.open) return null;
    return ReactDOM.createPortal(h('div', { className: 'tt-backdrop', onMouseDown: function (e) { if (e.target === e.currentTarget && p.onClose) p.onClose(); } }, box), document.body);
  }

  /* ---------- StatusBar ---------- */
  function StatusBar(p) {
    var items = p.items || [], m = p.message;
    return h('div', { className: cx('tt-status', p.className), style: p.style },
      items.map(function (it, i) {
        return h(Frag, { key: i }, i ? h('span', { className: 'tt-status__sep', 'aria-hidden': true }) : null, h('span', { className: 'tt-status__item' }, it));
      }),
      h('span', { className: 'tt-status__live', role: 'status', 'aria-live': 'polite' },
        m ? h('span', { className: cx('tt-status__msg', 'tt-status__msg--' + (m.tone || 'info')), title: m.text },
          h(Icon, { name: m.tone === 'warn' || m.tone === 'danger' ? 'warn' : 'info', size: 14 }), h('span', null, m.text)) : null),
      h('span', { className: 'tt-status__spacer' }),
      p.right ? h('span', { className: 'tt-status__item tt-status__right' }, p.right) : null);
  }

  /* ---------- SnapshotHistory ---------- */
  function SnapshotHistory(p) {
    var list = p.snapshots || [], cur = p.current;
    return h('aside', { className: cx('tt-snaps', p.embedded && 'tt-snaps--embedded', p.className), 'aria-label': '历史快照', style: p.style },
      h('header', { className: 'tt-snaps__head' },
        h('span', { className: 'tt-snaps__title' }, '历史快照'),
        p.onClose ? h(IconButton, { layout: 'inline', icon: 'close', label: '收起', onClick: p.onClose }) : null),
      h('p', { className: 'tt-snaps__note' }, '回退前会先把当前画布自动存成一条快照，回退之后随时可以再回来。'),
      h('ol', { className: 'tt-snaps__list' },
        cur ? h('li', { className: 'tt-snap is-current' }, h('span', { className: 'tt-snap__dot' }),
          h('div', { className: 'tt-snap__body' }, h('div', { className: 'tt-snap__label' }, '当前画布'),
            h('div', { className: 'tt-snap__meta' }, cur.nodes + ' 方块 · ' + cur.edges + ' 关系' + (cur.dirty ? ' · 有未存的改动' : '')))) : null,
        list.map(function (s) {
          var c = s.counts || { nodes: s.graph ? s.graph.nodes.length : 0, edges: s.graph ? s.graph.edges.length : 0 };
          return h('li', { key: s.id, className: 'tt-snap' }, h('span', { className: 'tt-snap__dot' }),
            h('div', { className: 'tt-snap__body' },
              h('div', { className: 'tt-snap__label' }, s.label),
              h('div', { className: 'tt-snap__meta' }, fmtDate(s.time) + ' · ' + (s.auto ? '自动' : '手动') + ' · ' + c.nodes + ' 方块 ' + c.edges + ' 关系'),
              p.onRestore ? h(Button, { size: 'sm', icon: 'history', className: 'tt-snap__act', onClick: function () { p.onRestore(s); } }, '回退到此') : null));
        }),
        !list.length ? h('li', { className: 'tt-snaps__empty' }, '还没有快照。按 Ctrl+S 或点“存快照”。') : null));
  }

  /* ---------- CanvasNode: 📎 archive reference, or plain sticky note ---------- */
  var NODE_SIZE = { ref: { w: 172, h: 64 }, note: { w: 164, h: 84 } };
  function CanvasNode(p) {
    var kind = p.kind === 'note' ? 'note' : 'ref', sz = NODE_SIZE[kind];
    var style = assign({ width: sz.w, height: sz.h }, p.style);
    var title = p.editing
      ? h(InlineEdit, { className: cx('tt-node__edit', kind === 'note' && 'tt-node__edit--note'), multiline: kind === 'note', value: p.title || '',
        placeholder: kind === 'note' ? '写点什么……' : '方块名称', ariaLabel: kind === 'note' ? '便签内容' : '方块名称',
        onCommit: p.onEditCommit || function () {}, onCancel: p.onEditCancel })
      : h('div', { className: cx('tt-node__title', !p.title && 'is-empty') }, p.title || (kind === 'note' ? '空白便签' : '未命名'));
    return h('div', {
      className: cx('tt-node', 'tt-node--' + kind, p.selected && 'is-selected', p.linkSource && 'is-link-source', p.linkTarget && 'is-link-target',
        p.dragging && 'is-dragging', p.static && 'is-static', p.className),
      style: style, 'data-id': p.id, role: 'group', 'aria-label': (kind === 'ref' ? '档案引用：' : '便签：') + (p.title || ''),
      onDoubleClick: p.onDoubleClick, onClick: p.onClick
    },
      kind === 'ref' ? h('span', { className: 'tt-node__clip', title: '档案引用' }, h(Icon, { name: 'paperclip', size: 14 })) : null,
      title,
      kind === 'ref' && p.subtitle ? h('div', { className: 'tt-node__sub' }, p.subtitle) : null,
      p.childCount ? h('span', { className: cx('tt-node__kids', p.collapsed && 'is-collapsed'), title: p.collapsed ? '子节点已收起，双击展开' : '双击收起子节点' },
        p.collapsed ? '+' + p.childCount : p.childCount + ' 子') : null,
      p.showHandle ? h('span', { className: 'tt-node__handle', title: '按住拖到另一个方块，建立关系' }) : null);
  }
  CanvasNode.size = NODE_SIZE;

  /* ---------- canvas geometry ---------- */
  function boxOf(n) { var s = NODE_SIZE[n.kind] || NODE_SIZE.ref; return { x: n.x, y: n.y, w: s.w, h: s.h, cx: n.x + s.w / 2, cy: n.y + s.h / 2 }; }
  function rayToBox(cx0, cy0, tx, ty, hw, hh) {
    var dx = tx - cx0, dy = ty - cy0; if (!dx && !dy) return { x: cx0, y: cy0 };
    var t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return { x: cx0 + dx * t, y: cy0 + dy * t };
  }
  /* offset > 0 pushes the line to one side of the canonical (id-ordered) axis, so A→B and B→A sit on opposite sides */
  function segment(a, b, offset, t) {
    var A = boxOf(a), B = boxOf(b), lo = a.id < b.id ? A : B, hi = a.id < b.id ? B : A;
    var dx = hi.cx - lo.cx, dy = hi.cy - lo.cy, len = Math.hypot(dx, dy) || 1;
    var ox = -dy / len * offset, oy = dx / len * offset;
    var s = rayToBox(A.cx + ox, A.cy + oy, B.cx + ox, B.cy + oy, A.w / 2 + 2, A.h / 2 + 2);
    var e = rayToBox(B.cx + ox, B.cy + oy, A.cx + ox, A.cy + oy, B.w / 2 + 3, B.h / 2 + 3);
    t = t == null ? 0.5 : t;
    return { x1: s.x, y1: s.y, x2: e.x, y2: e.y, lx: s.x + (e.x - s.x) * t, ly: s.y + (e.y - s.y) * t,
      ang: Math.atan2(e.y - s.y, e.x - s.x), len: Math.hypot(e.x - s.x, e.y - s.y),
      dir: (e.x - s.x) * (B.cx - A.cx) + (e.y - s.y) * (B.cy - A.cy) };
  }
  function arrowPath(x, y, ang) {
    var size = 8, w = 3.6, bx = x - Math.cos(ang) * size, by = y - Math.sin(ang) * size, px = -Math.sin(ang) * w, py = Math.cos(ang) * w;
    return 'M' + x.toFixed(1) + ' ' + y.toFixed(1) + 'L' + (bx + px).toFixed(1) + ' ' + (by + py).toFixed(1) + 'L' + (bx - px).toFixed(1) + ' ' + (by - py).toFixed(1) + 'Z';
  }
  var G = {
    descendants: function (nodes, id) {
      var out = {};
      (function walk(pid) { nodes.forEach(function (n) { if (n.parent === pid && !out[n.id]) { out[n.id] = 1; walk(n.id); } }); })(id);
      return out;
    },
    hidden: function (nodes) {
      var hid = {};
      nodes.forEach(function (n) { if (n.collapsed) Object.keys(G.descendants(nodes, n.id)).forEach(function (k) { hid[k] = 1; }); });
      return hid;
    },
    kids: function (nodes, id) { return nodes.filter(function (n) { return n.parent === id; }).length; },
    bbox: function (nodes) {
      if (!nodes.length) return null;
      var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      nodes.forEach(function (n) { var q = boxOf(n); b.x0 = Math.min(b.x0, q.x); b.y0 = Math.min(b.y0, q.y); b.x1 = Math.max(b.x1, q.x + q.w); b.y1 = Math.max(b.y1, q.y + q.h); });
      return b;
    }
  };

  /* ---------- RelationCanvas ---------- */
  function RelationCanvas(p) {
    var gs = useState(function () { return clone(p.defaultGraph || { nodes: [], edges: [] }); }), graph = gs[0], setGraphRaw = gs[1];
    var graphRef = useRef(graph); graphRef.current = graph;
    var undoRef = useRef([]);
    var sn = useState(function () { return (p.defaultSnapshots || []).map(function (s) { return assign({ id: uid('s') }, s); }); }), snaps = sn[0], setSnaps = sn[1];
    var hs = useState(!!p.defaultShowHistory), showHistory = hs[0], setShowHistory = hs[1];
    var vs = useState({ x: 0, y: 0, s: 1 }), view = vs[0], setView = vs[1];
    var viewRef = useRef(view); viewRef.current = view;
    var zs = useState({ w: 0, h: 0 }), size = zs[0], setSize = zs[1];
    var se = useState(null), sel = se[0], setSel = se[1];
    var lm = useState(false), linkMode = lm[0], setLinkMode = lm[1];
    var lf = useState(null), linkFrom = lf[0], setLinkFrom = lf[1];
    var tp = useState(null), temp = tp[0], setTemp = tp[1];
    var ee = useState(null), editEdge = ee[0], setEditEdge = ee[1];
    var en = useState(null), editNode = en[0], setEditNode = en[1];
    var mn = useState(null), menu = mn[0], setMenu = mn[1];
    var mg = useState(null), msg = mg[0], setMsg = mg[1];
    var dg = useState(null), dragId = dg[0], setDragId = dg[1];
    var pn = useState(false), panning = pn[0], setPanning = pn[1];
    var vp = useRef(null), rootRef = useRef(null), act = useRef(null), sbAct = useRef(null), msgTimer = useRef(null), dirty = useRef(false), engaged = useRef(false), fitted = useRef(false);
    var archives = p.archives || [];

    var hidden = useMemo(function () { return G.hidden(graph.nodes); }, [graph.nodes]);
    var visNodes = useMemo(function () { return graph.nodes.filter(function (n) { return !hidden[n.id]; }); }, [graph.nodes, hidden]);
    var nodeMap = useMemo(function () { var m = {}; graph.nodes.forEach(function (n) { m[n.id] = n; }); return m; }, [graph.nodes]);
    var bbox = G.bbox(visNodes) || { x0: 0, y0: 0, x1: 320, y1: 200 };

    function say(text, tone) { setMsg({ text: text, tone: tone || 'info' }); clearTimeout(msgTimer.current); msgTimer.current = setTimeout(function () { setMsg(null); }, 5600); }
    function emit(g) { if (p.onChange) p.onChange(g); }
    function commit(fn, noUndo) {
      var prev = graphRef.current, next = fn(prev);
      if (next === prev) return;
      if (!noUndo) { undoRef.current.push(prev); if (undoRef.current.length > 60) undoRef.current.shift(); }
      graphRef.current = next; dirty.current = true; setGraphRaw(next); emit(next);
    }
    function nodeTitle(id) { var n = graphRef.current.nodes.filter(function (x) { return x.id === id; })[0]; return n ? (n.title || (n.kind === 'note' ? '便签' : '未命名')) : '?'; }
    function undo() {
      var prev = undoRef.current.pop();
      if (!prev) { say('没有可以撤销的操作了。'); return; }
      graphRef.current = prev; setGraphRaw(prev); emit(prev); setSel(null); say('已撤销上一步。');
    }

    /* ---- viewport: clamp so the content can always be reached at any zoom ---- */
    function clampV(v) {
      var m = 72, b = bbox;
      var minX = m - b.x1 * v.s, maxX = size.w - m - b.x0 * v.s, minY = m - b.y1 * v.s, maxY = size.h - m - b.y0 * v.s;
      return { s: v.s, x: clamp(v.x, Math.min(minX, maxX), Math.max(minX, maxX)), y: clamp(v.y, Math.min(minY, maxY), Math.max(minY, maxY)) };
    }
    function setV(v) { setView(clampV(v)); }
    function zoomAt(f, sx, sy) { var v = viewRef.current, s = clamp(v.s * f, 0.25, 3), k = s / v.s; setV({ s: s, x: sx - (sx - v.x) * k, y: sy - (sy - v.y) * k }); }
    function fit() {
      var b = G.bbox(visNodes);
      if (!b) { setView({ x: size.w / 2 - 160, y: size.h / 2 - 100, s: 1 }); return; }
      var pad = 64, s = clamp(Math.min((size.w - pad * 2) / ((b.x1 - b.x0) || 1), (size.h - pad * 2) / ((b.y1 - b.y0) || 1)), 0.25, 1.2);
      setView({ s: s, x: (size.w - (b.x1 - b.x0) * s) / 2 - b.x0 * s, y: (size.h - (b.y1 - b.y0) * s) / 2 - b.y0 * s });
    }
    var fns = useRef({}); fns.current = { zoomAt: zoomAt, setV: setV };
    function centerWorld() { var v = viewRef.current; return { x: (size.w / 2 - v.x) / v.s, y: (size.h / 2 - v.y) / v.s }; }
    function toWorld(cx0, cy0) { var r = vp.current.getBoundingClientRect(), v = viewRef.current; return { x: (cx0 - r.left - v.x) / v.s, y: (cy0 - r.top - v.y) / v.s }; }

    useLayoutEffect(function () {
      var el = vp.current; if (!el) return undefined;
      function upd() { setSize({ w: el.clientWidth, h: el.clientHeight }); }
      upd();
      var ro = new ResizeObserver(upd); ro.observe(el);
      return function () { ro.disconnect(); };
    }, []);
    useEffect(function () { if (!fitted.current && size.w > 60) { fitted.current = true; fit(); } }, [size.w]);
    useEffect(function () {
      var el = vp.current;
      function onWheel(e) {
        if (p.wheelRequiresFocus && !engaged.current) return;
        e.preventDefault();
        var r = el.getBoundingClientRect();
        if (e.ctrlKey || e.metaKey) fns.current.zoomAt(Math.exp(-e.deltaY * 0.0018), e.clientX - r.left, e.clientY - r.top);
        else {
          var v = viewRef.current, horiz = e.shiftKey && !e.deltaX;
          fns.current.setV({ s: v.s, x: v.x - (horiz ? e.deltaY : e.deltaX), y: v.y - (horiz ? 0 : e.deltaY) });
        }
      }
      function down(e) { engaged.current = !!(rootRef.current && rootRef.current.contains(e.target)); }
      el.addEventListener('wheel', onWheel, { passive: false });
      document.addEventListener('pointerdown', down, true);
      return function () { el.removeEventListener('wheel', onWheel); document.removeEventListener('pointerdown', down, true); clearTimeout(msgTimer.current); };
    }, []);

    /* ---- graph edits ---- */
    function createEdge(from, to) {
      var g = graphRef.current, A = nodeTitle(from), B = nodeTitle(to);
      var dup = g.edges.filter(function (x) { return x.from === from && x.to === to; })[0];
      if (dup) {
        setSel({ type: 'edge', id: dup.id });
        say('“' + A + ' → ' + B + '”已经有一条关系了。同一方向的多重关系，请写进这条线的描述里；差别很大的话，可以新建一张画布。', 'warn');
        return;
      }
      var rev = g.edges.some(function (x) { return x.from === to && x.to === from; });
      var edge = { id: uid('e'), from: from, to: to, label: '' };
      commit(function (gg) { return { nodes: gg.nodes, edges: gg.edges.concat([edge]) }; });
      setSel({ type: 'edge', id: edge.id }); setEditEdge(edge.id);
      say(rev ? '已建立反向关系，两条线会平行错开显示。' : '已连线：' + A + ' → ' + B + '。写下关系描述，或按 Esc 留空。');
    }
    function setEdgeLabel(id, label) {
      label = String(label).trim();
      commit(function (g) {
        var e = g.edges.filter(function (x) { return x.id === id; })[0];
        if (!e || e.label === label) return g;
        return { nodes: g.nodes, edges: g.edges.map(function (x) { return x.id === id ? assign(x, { label: label }) : x; }) };
      });
    }
    function removeEdge(id) { commit(function (g) { return { nodes: g.nodes, edges: g.edges.filter(function (x) { return x.id !== id; }) }; }); setSel(null); say('已删除这条关系。'); }
    function flipEdge(e) { commit(function (g) { return { nodes: g.nodes, edges: g.edges.map(function (x) { return x.id === e.id ? assign(x, { from: x.to, to: x.from }) : x; }) }; }); }
    function addNote(at, parent) {
      var c = at || centerWorld(), n = { id: uid('c'), kind: 'note', title: '', x: Math.round(c.x - 82), y: Math.round(c.y - 42) };
      if (parent) n.parent = parent;
      commit(function (g) { return { nodes: g.nodes.concat([n]), edges: g.edges }; });
      setSel({ type: 'node', id: n.id }); setEditNode(n.id);
      return n;
    }
    function addRef(a, at) {
      var c = at || centerWorld();
      var n = { id: uid('c'), kind: 'ref', archiveId: a.id, archive: a.name, type: a.type, title: a.name, x: Math.round(c.x - 86), y: Math.round(c.y - 32) };
      commit(function (g) { return { nodes: g.nodes.concat([n]), edges: g.edges }; });
      setSel({ type: 'node', id: n.id });
      say('已引用档案“' + a.name + '”。画布里的改动不会影响档案本身。');
    }
    function addChild(parent) {
      var g = graphRef.current, k = G.kids(g.nodes, parent.id), b = boxOf(parent);
      var n = { id: uid('c'), kind: 'note', title: '', parent: parent.id, x: Math.round(parent.x + 24 + k * 28), y: Math.round(parent.y + b.h + 56 + k * 12) };
      commit(function (gg) { return { nodes: gg.nodes.map(function (x) { return x.id === parent.id ? assign(x, { collapsed: false }) : x; }).concat([n]), edges: gg.edges }; });
      setSel({ type: 'node', id: n.id }); setEditNode(n.id);
      say('已在“' + (parent.title || '方块') + '”下新建子级。双击“' + (parent.title || '方块') + '”可以收起或展开它的子节点。');
    }
    function renameNode(id, v) {
      commit(function (g) {
        var n = g.nodes.filter(function (x) { return x.id === id; })[0]; if (!n) return g;
        var t = n.kind === 'ref' ? (String(v).trim() || n.archive || n.title) : String(v);
        if (t === n.title) return g;
        return { nodes: g.nodes.map(function (x) { return x.id === id ? assign(x, { title: t }) : x; }), edges: g.edges };
      });
    }
    function removeNode(id) {
      var n = nodeMap[id]; if (!n) return;
      commit(function (g) {
        return {
          nodes: g.nodes.filter(function (x) { return x.id !== id; }).map(function (x) { return x.parent === id ? assign(x, { parent: n.parent || undefined }) : x; }),
          edges: g.edges.filter(function (e) { return e.from !== id && e.to !== id; })
        };
      });
      setSel(null);
      say(n.kind === 'ref' ? '已从画布移除“' + n.title + '”。档案本身没有被删除。' : '已删除便签。');
    }
    function toggleCollapse(n) {
      var k = G.kids(graphRef.current.nodes, n.id);
      commit(function (g) { return { nodes: g.nodes.map(function (x) { return x.id === n.id ? assign(x, { collapsed: !x.collapsed }) : x; }), edges: g.edges }; });
      say(n.collapsed ? '已展开“' + n.title + '”的 ' + k + ' 个子节点。' : '已收起“' + n.title + '”的子节点。');
    }
    function onNodeDouble(n) {
      if (G.kids(graph.nodes, n.id)) toggleCollapse(n);
      else if (n.kind === 'note') setEditNode(n.id);
      else say('“' + n.title + '”还没有子节点。右键 → 新建子级 可以添加（双击跳转档案暂未开放）。');
    }
    function saveSnap(label, auto) {
      var s = { id: uid('s'), label: label || ('快照 ' + hhmm(Date.now())), time: Date.now(), auto: !!auto, graph: graphRef.current };
      setSnaps(function (cur) { return [s].concat(cur); }); dirty.current = false;
      return s;
    }
    function restore(s) {
      saveSnap('回退前自动保存', true);
      undoRef.current.push(graphRef.current);
      graphRef.current = s.graph; setGraphRaw(s.graph); emit(s.graph); setSel(null); dirty.current = false;
      say('已回退到“' + s.label + '”。回退前的画布已自动存成一条快照。');
    }

    /* ---- pointer ---- */
    function capture(e) { try { vp.current.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } }
    function onDown(e) {
      if (e.button !== 0) return;
      if (e.target.closest('input,textarea,.tt-sb')) return;
      var nodeEl = e.target.closest('.tt-node'), handle = e.target.closest('.tt-node__handle'), edgeEl = e.target.closest('[data-edge]');
      if (handle && nodeEl) {
        var w0 = toWorld(e.clientX, e.clientY);
        act.current = { type: 'link', from: nodeEl.getAttribute('data-id') };
        setTemp({ from: act.current.from, x: w0.x, y: w0.y, over: null }); capture(e); return;
      }
      if (nodeEl) {
        var id = nodeEl.getAttribute('data-id');
        if (linkMode) {
          if (!linkFrom) { setLinkFrom(id); say('已选起点“' + nodeTitle(id) + '”，再点终点方块。'); }
          else if (linkFrom === id) setLinkFrom(null);
          else { createEdge(linkFrom, id); setLinkFrom(null); }
          return;
        }
        setSel({ type: 'node', id: id });
        var w = toWorld(e.clientX, e.clientY), n = nodeMap[id];
        act.current = { type: 'drag', id: id, ox: w.x - n.x, oy: w.y - n.y, start: graphRef.current, moved: false, sx: e.clientX, sy: e.clientY };
        capture(e); return;
      }
      if (edgeEl) { setSel({ type: 'edge', id: edgeEl.getAttribute('data-edge') }); return; }
      if (linkFrom) setLinkFrom(null);
      setSel(null);
      act.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y, moved: false };
      capture(e);
    }
    function nodeAt(e, except) {
      var el = document.elementFromPoint(e.clientX, e.clientY), ne = el && el.closest && el.closest('.tt-node');
      var id = ne && ne.getAttribute('data-id');
      return id && id !== except ? id : null;
    }
    function onMove(e) {
      var a = act.current; if (!a) return;
      if (a.type === 'pan') {
        var dx = e.clientX - a.sx, dy = e.clientY - a.sy;
        if (!a.moved && Math.hypot(dx, dy) > 3) { a.moved = true; setPanning(true); }
        if (a.moved) fns.current.setV({ s: viewRef.current.s, x: a.vx + dx, y: a.vy + dy });
      } else if (a.type === 'drag') {
        if (!a.moved && Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < 3) return;
        if (!a.moved) { a.moved = true; setDragId(a.id); }
        var w = toWorld(e.clientX, e.clientY), nx = Math.round(w.x - a.ox), ny = Math.round(w.y - a.oy);
        commit(function (g) { return { nodes: g.nodes.map(function (n) { return n.id === a.id ? assign(n, { x: nx, y: ny }) : n; }), edges: g.edges }; }, true);
      } else if (a.type === 'link') {
        var w2 = toWorld(e.clientX, e.clientY);
        setTemp({ from: a.from, x: w2.x, y: w2.y, over: nodeAt(e, a.from) });
      }
    }
    function onUp(e) {
      var a = act.current; act.current = null; if (!a) return;
      try { vp.current.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      if (a.type === 'pan') setPanning(false);
      else if (a.type === 'drag') { setDragId(null); if (a.moved) undoRef.current.push(a.start); }
      else if (a.type === 'link') {
        setTemp(null);
        var target = nodeAt(e, a.from);
        if (target) createEdge(a.from, target);
        else say('松开在另一个方块上，才能建立关系。');
      }
    }
    function sbDown(axis, ext) {
      return function (e) {
        e.stopPropagation(); e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        var tr = e.currentTarget.parentElement.getBoundingClientRect();
        var span = axis === 'x' ? ext.x1 - ext.x0 : ext.y1 - ext.y0, len = axis === 'x' ? tr.width : tr.height;
        sbAct.current = { axis: axis, start: axis === 'x' ? e.clientX : e.clientY, v0: viewRef.current, k: span / len };
      };
    }
    function sbMove(e) {
      var a = sbAct.current; if (!a) return;
      var d = ((a.axis === 'x' ? e.clientX : e.clientY) - a.start) * a.k * a.v0.s;
      fns.current.setV(a.axis === 'x' ? { s: a.v0.s, x: a.v0.x - d, y: a.v0.y } : { s: a.v0.s, x: a.v0.x, y: a.v0.y - d });
    }
    function sbUp() { sbAct.current = null; }

    function onKeyDown(e) {
      if (e.target.closest('input,textarea')) return;
      var mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
      if (mod && k === 'z') { e.preventDefault(); undo(); }
      else if (mod && k === 's') { e.preventDefault(); saveSnap(); say('已存快照，可在“历史快照”里回退。'); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); if (sel.type === 'node') removeNode(sel.id); else removeEdge(sel.id); }
      else if (e.key === 'Escape') { setLinkMode(false); setLinkFrom(null); setMenu(null); setSel(null); }
      else if (e.key === 'F2' && sel && sel.type === 'node') { e.preventDefault(); setEditNode(sel.id); }
    }
    function archiveItems(at) {
      return archives.map(function (a) { return { label: a.name, hint: a.type, icon: 'archive', onSelect: function () { addRef(a, at); } }; });
    }
    function onCtx(e) {
      e.preventDefault();
      if (e.target.closest('input,textarea')) return;
      var nodeEl = e.target.closest('.tt-node'), edgeEl = e.target.closest('[data-edge]'), w = toWorld(e.clientX, e.clientY), items;
      if (nodeEl) {
        var n = nodeMap[nodeEl.getAttribute('data-id')], k = G.kids(graph.nodes, n.id);
        setSel({ type: 'node', id: n.id });
        items = [
          { label: '重命名', icon: 'edit', shortcut: 'F2', onSelect: function () { setEditNode(n.id); } },
          { label: '新建子级', icon: 'child', onSelect: function () { addChild(n); } },
          { label: '从这里连线', icon: 'connect', onSelect: function () { setLinkMode(true); setLinkFrom(n.id); say('已选起点“' + n.title + '”，再点终点方块。'); } }
        ];
        if (k) items.push({ label: n.collapsed ? '展开 ' + k + ' 个子节点' : '收起子节点', icon: n.collapsed ? 'chevron-down' : 'chevron-right', onSelect: function () { toggleCollapse(n); } });
        items.push({ divider: true }, n.kind === 'ref'
          ? { label: '从画布移除', hint: '不删档案', icon: 'close', danger: true, onSelect: function () { removeNode(n.id); } }
          : { label: '删除便签', icon: 'trash', danger: true, onSelect: function () { removeNode(n.id); } });
      } else if (edgeEl) {
        var ed = graph.edges.filter(function (x) { return x.id === edgeEl.getAttribute('data-edge'); })[0];
        if (!ed) return;
        var canFlip = !graph.edges.some(function (x) { return x.from === ed.to && x.to === ed.from; });
        setSel({ type: 'edge', id: ed.id });
        items = [
          { label: '编辑关系描述', icon: 'edit', onSelect: function () { setEditEdge(ed.id); } },
          { label: '调转方向', icon: 'swap', disabled: !canFlip, hint: canFlip ? '' : '反向已存在', onSelect: function () { flipEdge(ed); } },
          { divider: true },
          { label: '删除关系', icon: 'trash', danger: true, onSelect: function () { removeEdge(ed.id); } }
        ];
      } else {
        items = [{ label: '在这里贴便签', icon: 'note', onSelect: function () { addNote(w); } }];
        if (archives.length) items = items.concat([{ heading: '在这里引用档案' }], archiveItems(w).slice(0, 6));
        items.push({ divider: true },
          { label: '适应视图', icon: 'fit', onSelect: fit },
          { label: '存快照', icon: 'snapshot', shortcut: 'Ctrl+S', onSelect: function () { saveSnap(); say('已存快照。'); } });
      }
      setMenu({ x: e.clientX, y: e.clientY, items: items });
    }

    /* ---- render ---- */
    var v = view;
    var visSet = {}; visNodes.forEach(function (n) { visSet[n.id] = 1; });
    var geo = graph.edges.filter(function (e) { return visSet[e.from] && visSet[e.to]; }).map(function (e) {
      var paired = graph.edges.some(function (x) { return x.from === e.to && x.to === e.from; });
      var off = paired ? (e.from < e.to ? 14 : -14) : 0;
      return { e: e, g: segment(nodeMap[e.from], nodeMap[e.to], off, paired ? 0.42 : 0.5) };
    });
    var hier = visNodes.filter(function (n) { return n.parent && visSet[n.parent]; }).map(function (n) { return { id: n.id, g: segment(nodeMap[n.parent], n, 0) }; });
    var vis = { x0: -v.x / v.s, x1: (size.w - v.x) / v.s, y0: -v.y / v.s, y1: (size.h - v.y) / v.s };
    var ext = { x0: Math.min(bbox.x0 - 40, vis.x0), x1: Math.max(bbox.x1 + 40, vis.x1), y0: Math.min(bbox.y0 - 40, vis.y0), y1: Math.max(bbox.y1 + 40, vis.y1) };
    var hw = (vis.x1 - vis.x0) / (ext.x1 - ext.x0), vh = (vis.y1 - vis.y0) / (ext.y1 - ext.y0);
    var X0 = bbox.x0 - 3000, Y0 = bbox.y0 - 3000, SW = bbox.x1 - bbox.x0 + 6000, SH = bbox.y1 - bbox.y0 + 6000;
    var isSelEdge = function (id) { return sel && sel.type === 'edge' && sel.id === id; };

    var svg = h('svg', { className: 'tt-rc__svg', style: { left: X0, top: Y0, width: SW, height: SH }, viewBox: X0 + ' ' + Y0 + ' ' + SW + ' ' + SH, 'aria-hidden': true },
      hier.map(function (x) { return h('line', { key: 'h' + x.id, className: 'tt-hier', x1: x.g.x1, y1: x.g.y1, x2: x.g.x2, y2: x.g.y2 }); }),
      geo.map(function (o) {
        var g = o.g, e = o.e; if (g.len < 14 || g.dir <= 0) return null;
        var ex = g.x2 - Math.cos(g.ang) * 6, ey = g.y2 - Math.sin(g.ang) * 6;
        return h('g', { key: e.id, className: cx('tt-edge', isSelEdge(e.id) && 'is-selected') },
          h('line', { className: 'tt-edge__line', x1: g.x1, y1: g.y1, x2: ex, y2: ey }),
          h('path', { className: 'tt-edge__head', d: arrowPath(g.x2, g.y2, g.ang) }),
          h('line', { className: 'tt-edge__hit', 'data-edge': e.id, x1: g.x1, y1: g.y1, x2: g.x2, y2: g.y2, onDoubleClick: function () { setEditEdge(e.id); } }));
      }),
      temp && nodeMap[temp.from] ? (function () {
        var b = boxOf(nodeMap[temp.from]), s = rayToBox(b.cx, b.cy, temp.x, temp.y, b.w / 2, b.h / 2);
        return h('line', { className: 'tt-edge--temp', x1: s.x, y1: s.y, x2: temp.x, y2: temp.y });
      })() : null);

    var nodes = visNodes.map(function (n) {
      var sub = n.kind === 'ref' ? (n.archive && n.title !== n.archive ? '档案：' + n.archive : (n.type || '档案引用')) : null;
      return h(CanvasNode, {
        key: n.id, id: n.id, kind: n.kind, title: n.title, subtitle: sub, childCount: G.kids(graph.nodes, n.id), collapsed: !!n.collapsed,
        selected: sel && sel.type === 'node' && sel.id === n.id, linkSource: linkFrom === n.id || (temp && temp.from === n.id),
        linkTarget: temp && temp.over === n.id, dragging: dragId === n.id, showHandle: !linkMode,
        style: { left: n.x, top: n.y }, editing: editNode === n.id,
        onDoubleClick: function () { onNodeDouble(n); },
        onEditCommit: function (val) { setEditNode(null); renameNode(n.id, val); },
        onEditCancel: function () { setEditNode(null); }
      });
    });
    var labels = geo.map(function (o) {
      var e = o.e, g = o.g;
      if (editEdge === e.id) {
        return h(InlineEdit, { key: 'le' + e.id, className: 'tt-elabel__input', value: e.label, placeholder: '描述关系（可留空）', ariaLabel: '关系描述',
          style: { left: g.lx, top: g.ly },
          onCommit: function (val) { setEditEdge(null); setEdgeLabel(e.id, val); }, onCancel: function () { setEditEdge(null); } });
      }
      if (!e.label) return null;
      return h('div', { key: 'l' + e.id, 'data-edge': e.id, className: cx('tt-elabel', isSelEdge(e.id) && 'is-selected'), style: { left: g.lx, top: g.ly },
        title: e.label, onDoubleClick: function () { setEditEdge(e.id); } }, e.label);
    });

    var tools = h(Toolbar, { label: '画布工具' },
      h(IconButton, { icon: 'undo', label: '撤销', shortcut: 'Ctrl+Z', disabled: !undoRef.current.length, onClick: undo }),
      h(IconButton, { icon: 'snapshot', label: '存快照', shortcut: 'Ctrl+S', onClick: function () { saveSnap(); say('已存快照，可在“历史快照”里回退。'); } }),
      h(IconButton, { icon: 'history', label: '历史快照', active: showHistory, onClick: function () { setShowHistory(function (x) { return !x; }); } }),
      h(Toolbar.Divider),
      h(IconButton, { icon: 'paperclip', label: '引用档案', disabled: !archives.length, onClick: function (e) {
        var r = e.currentTarget.getBoundingClientRect();
        setMenu({ x: r.left, y: r.bottom + 4, items: [{ heading: '把档案贴到画布上' }].concat(archiveItems(null)) });
      } }),
      h(IconButton, { icon: 'note', label: '便签', onClick: function () { addNote(); } }),
      h(IconButton, { icon: 'connect', label: '连线', active: linkMode, onClick: function () { setLinkMode(function (m) { return !m; }); setLinkFrom(null); } }),
      h(Toolbar.Divider),
      h(IconButton, { icon: 'zoom-out', label: '缩小', onClick: function () { zoomAt(1 / 1.2, size.w / 2, size.h / 2); } }),
      h('span', { className: 'tt-rc__zoom', title: '当前缩放' }, Math.round(v.s * 100) + '%'),
      h(IconButton, { icon: 'zoom-in', label: '放大', onClick: function () { zoomAt(1.2, size.w / 2, size.h / 2); } }),
      h(IconButton, { icon: 'fit', label: '适应', onClick: fit }));

    return h('div', { ref: rootRef, className: cx('tt-rc', p.className), style: assign({ height: p.height || 520 }, p.style), tabIndex: 0, onKeyDown: onKeyDown,
      'aria-label': '关系画布' + (p.name ? '：' + p.name : '') },
      tools,
      h('div', { className: 'tt-rc__main' },
        h('div', {
          ref: vp, className: cx('tt-rc__viewport', panning && 'is-panning', linkMode && 'is-linking'),
          style: { backgroundSize: (20 * v.s) + 'px ' + (20 * v.s) + 'px', backgroundPosition: v.x + 'px ' + v.y + 'px' },
          onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: onUp, onContextMenu: onCtx
        },
          p.name ? h('div', { className: 'tt-rc__name' }, p.name) : null,
          linkMode ? h('div', { className: 'tt-rc__banner' }, linkFrom ? '再点终点方块' : '连线模式：先点起点方块', ' · Esc 退出') : null,
          h('div', { className: 'tt-rc__world', style: { transform: 'translate(' + v.x + 'px,' + v.y + 'px) scale(' + v.s + ')' } }, svg, nodes, labels),
          !visNodes.length ? h('div', { className: 'tt-rc__empty' }, h('div', null, h('strong', null, '空白画布'), h('br'), '右键贴一张便签，或点“引用档案”把项目里的档案贴上来。')) : null,
          hw < 0.995 ? h('div', { className: 'tt-sb tt-sb--h' }, h('div', { className: 'tt-sb__thumb', style: { left: ((vis.x0 - ext.x0) / (ext.x1 - ext.x0) * 100) + '%', width: (hw * 100) + '%' },
            onPointerDown: sbDown('x', ext), onPointerMove: sbMove, onPointerUp: sbUp })) : null,
          vh < 0.995 ? h('div', { className: 'tt-sb tt-sb--v' }, h('div', { className: 'tt-sb__thumb', style: { top: ((vis.y0 - ext.y0) / (ext.y1 - ext.y0) * 100) + '%', height: (vh * 100) + '%' },
            onPointerDown: sbDown('y', ext), onPointerMove: sbMove, onPointerUp: sbUp })) : null),
        showHistory ? h(SnapshotHistory, { embedded: true, snapshots: snaps, onRestore: restore, onClose: function () { setShowHistory(false); },
          current: { nodes: graph.nodes.length, edges: graph.edges.length, dirty: dirty.current } }) : null),
      h(StatusBar, { items: [p.name || '未命名画布', visNodes.length + ' 个方块', graph.edges.length + ' 条关系'], message: msg,
        right: p.wheelRequiresFocus && !engaged.current ? '点一下画布后可用滚轮平移' : '滚轮平移 · Ctrl+滚轮缩放' }),
      menu ? h(ContextMenu, { open: true, x: menu.x, y: menu.y, items: menu.items, onClose: function () { setMenu(null); } }) : null);
  }
  RelationCanvas.geometry = { segment: segment, boxOf: boxOf };

  var C = window;
  C.TTool = C.TTool || {};
  Object.assign(C.TTool, {
    Icon: Icon, Button: Button, IconButton: IconButton, Toolbar: Toolbar, TextField: TextField, TagInput: TagInput, PanelSection: PanelSection,
    ProjectTree: ProjectTree, DocTabs: DocTabs, ContextMenu: ContextMenu, ModuleCard: ModuleCard, TextModule: TextModule, NumberModule: NumberModule,
    AxisModule: AxisModule, RadarModule: RadarModule, BooleanModule: BooleanModule, ModuleList: ModuleList, ArchiveHeader: ArchiveHeader,
    ReferenceList: ReferenceList, PresetLibrary: PresetLibrary, CanvasNode: CanvasNode, RelationCanvas: RelationCanvas,
    SnapshotHistory: SnapshotHistory, Dialog: Dialog, StatusBar: StatusBar
  });
})();
