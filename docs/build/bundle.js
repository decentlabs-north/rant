
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.20.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    var global$1 = (typeof global !== "undefined" ? global :
                typeof self !== "undefined" ? self :
                typeof window !== "undefined" ? window : {});

    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
    var inited = false;
    function init$1 () {
      inited = true;
      var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      for (var i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }

      revLookup['-'.charCodeAt(0)] = 62;
      revLookup['_'.charCodeAt(0)] = 63;
    }

    function toByteArray (b64) {
      if (!inited) {
        init$1();
      }
      var i, j, l, tmp, placeHolders, arr;
      var len = b64.length;

      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

      // base64 is 4/3 + up to two characters of the original data
      arr = new Arr(len * 3 / 4 - placeHolders);

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? len - 4 : len;

      var L = 0;

      for (i = 0, j = 0; i < l; i += 4, j += 3) {
        tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
        arr[L++] = (tmp >> 16) & 0xFF;
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      if (placeHolders === 2) {
        tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[L++] = tmp & 0xFF;
      } else if (placeHolders === 1) {
        tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      return arr
    }

    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
    }

    function encodeChunk (uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output.push(tripletToBase64(tmp));
      }
      return output.join('')
    }

    function fromByteArray (uint8) {
      if (!inited) {
        init$1();
      }
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
      var output = '';
      var parts = [];
      var maxChunkLength = 16383; // must be multiple of 3

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
      }

      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1];
        output += lookup[tmp >> 2];
        output += lookup[(tmp << 4) & 0x3F];
        output += '==';
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
        output += lookup[tmp >> 10];
        output += lookup[(tmp >> 4) & 0x3F];
        output += lookup[(tmp << 2) & 0x3F];
        output += '=';
      }

      parts.push(output);

      return parts.join('')
    }

    function read (buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? (nBytes - 1) : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];

      i += d;

      e = s & ((1 << (-nBits)) - 1);
      s >>= (-nBits);
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      m = e & ((1 << (-nBits)) - 1);
      e >>= (-nBits);
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    }

    function write (buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
      var i = isLE ? 0 : (nBytes - 1);
      var d = isLE ? 1 : -1;
      var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

      value = Math.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

      e = (e << mLen) | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

      buffer[offset + i - d] |= s * 128;
    }

    var toString = {}.toString;

    var isArray = Array.isArray || function (arr) {
      return toString.call(arr) == '[object Array]';
    };

    var INSPECT_MAX_BYTES = 50;

    /**
     * If `Buffer.TYPED_ARRAY_SUPPORT`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Use Object implementation (most compatible, even IE6)
     *
     * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
     * Opera 11.6+, iOS 4.2+.
     *
     * Due to various browser bugs, sometimes the Object implementation will be used even
     * when the browser supports typed arrays.
     *
     * Note:
     *
     *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
     *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
     *
     *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
     *
     *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
     *     incorrect length in some situations.

     * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
     * get the Object implementation, which is slower but behaves correctly.
     */
    Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
      ? global$1.TYPED_ARRAY_SUPPORT
      : true;

    function kMaxLength () {
      return Buffer.TYPED_ARRAY_SUPPORT
        ? 0x7fffffff
        : 0x3fffffff
    }

    function createBuffer (that, length) {
      if (kMaxLength() < length) {
        throw new RangeError('Invalid typed array length')
      }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = new Uint8Array(length);
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        if (that === null) {
          that = new Buffer(length);
        }
        that.length = length;
      }

      return that
    }

    /**
     * The Buffer constructor returns instances of `Uint8Array` that have their
     * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
     * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
     * and the `Uint8Array` methods. Square bracket notation works as expected -- it
     * returns a single octet.
     *
     * The `Uint8Array` prototype remains unmodified.
     */

    function Buffer (arg, encodingOrOffset, length) {
      if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
        return new Buffer(arg, encodingOrOffset, length)
      }

      // Common case.
      if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
          throw new Error(
            'If encoding is specified then the first argument must be a string'
          )
        }
        return allocUnsafe(this, arg)
      }
      return from(this, arg, encodingOrOffset, length)
    }

    Buffer.poolSize = 8192; // not used by this implementation

    // TODO: Legacy, not needed anymore. Remove in next major version.
    Buffer._augment = function (arr) {
      arr.__proto__ = Buffer.prototype;
      return arr
    };

    function from (that, value, encodingOrOffset, length) {
      if (typeof value === 'number') {
        throw new TypeError('"value" argument must not be a number')
      }

      if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
        return fromArrayBuffer(that, value, encodingOrOffset, length)
      }

      if (typeof value === 'string') {
        return fromString(that, value, encodingOrOffset)
      }

      return fromObject(that, value)
    }

    /**
     * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
     * if value is a number.
     * Buffer.from(str[, encoding])
     * Buffer.from(array)
     * Buffer.from(buffer)
     * Buffer.from(arrayBuffer[, byteOffset[, length]])
     **/
    Buffer.from = function (value, encodingOrOffset, length) {
      return from(null, value, encodingOrOffset, length)
    };

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      Buffer.prototype.__proto__ = Uint8Array.prototype;
      Buffer.__proto__ = Uint8Array;
    }

    function assertSize (size) {
      if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be a number')
      } else if (size < 0) {
        throw new RangeError('"size" argument must not be negative')
      }
    }

    function alloc (that, size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(that, size)
      }
      if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpretted as a start offset.
        return typeof encoding === 'string'
          ? createBuffer(that, size).fill(fill, encoding)
          : createBuffer(that, size).fill(fill)
      }
      return createBuffer(that, size)
    }

    /**
     * Creates a new filled Buffer instance.
     * alloc(size[, fill[, encoding]])
     **/
    Buffer.alloc = function (size, fill, encoding) {
      return alloc(null, size, fill, encoding)
    };

    function allocUnsafe (that, size) {
      assertSize(size);
      that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) {
        for (var i = 0; i < size; ++i) {
          that[i] = 0;
        }
      }
      return that
    }

    /**
     * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
     * */
    Buffer.allocUnsafe = function (size) {
      return allocUnsafe(null, size)
    };
    /**
     * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
     */
    Buffer.allocUnsafeSlow = function (size) {
      return allocUnsafe(null, size)
    };

    function fromString (that, string, encoding) {
      if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8';
      }

      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('"encoding" must be a valid string encoding')
      }

      var length = byteLength(string, encoding) | 0;
      that = createBuffer(that, length);

      var actual = that.write(string, encoding);

      if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        that = that.slice(0, actual);
      }

      return that
    }

    function fromArrayLike (that, array) {
      var length = array.length < 0 ? 0 : checked(array.length) | 0;
      that = createBuffer(that, length);
      for (var i = 0; i < length; i += 1) {
        that[i] = array[i] & 255;
      }
      return that
    }

    function fromArrayBuffer (that, array, byteOffset, length) {
      array.byteLength; // this throws if `array` is not a valid ArrayBuffer

      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('\'offset\' is out of bounds')
      }

      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('\'length\' is out of bounds')
      }

      if (byteOffset === undefined && length === undefined) {
        array = new Uint8Array(array);
      } else if (length === undefined) {
        array = new Uint8Array(array, byteOffset);
      } else {
        array = new Uint8Array(array, byteOffset, length);
      }

      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = array;
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        that = fromArrayLike(that, array);
      }
      return that
    }

    function fromObject (that, obj) {
      if (internalIsBuffer(obj)) {
        var len = checked(obj.length) | 0;
        that = createBuffer(that, len);

        if (that.length === 0) {
          return that
        }

        obj.copy(that, 0, 0, len);
        return that
      }

      if (obj) {
        if ((typeof ArrayBuffer !== 'undefined' &&
            obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
          if (typeof obj.length !== 'number' || isnan(obj.length)) {
            return createBuffer(that, 0)
          }
          return fromArrayLike(that, obj)
        }

        if (obj.type === 'Buffer' && isArray(obj.data)) {
          return fromArrayLike(that, obj.data)
        }
      }

      throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
    }

    function checked (length) {
      // Note: cannot use `length < kMaxLength()` here because that fails when
      // length is NaN (which is otherwise coerced to zero.)
      if (length >= kMaxLength()) {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                             'size: 0x' + kMaxLength().toString(16) + ' bytes')
      }
      return length | 0
    }
    Buffer.isBuffer = isBuffer;
    function internalIsBuffer (b) {
      return !!(b != null && b._isBuffer)
    }

    Buffer.compare = function compare (a, b) {
      if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
        throw new TypeError('Arguments must be Buffers')
      }

      if (a === b) return 0

      var x = a.length;
      var y = b.length;

      for (var i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    Buffer.isEncoding = function isEncoding (encoding) {
      switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return true
        default:
          return false
      }
    };

    Buffer.concat = function concat (list, length) {
      if (!isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }

      if (list.length === 0) {
        return Buffer.alloc(0)
      }

      var i;
      if (length === undefined) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
          length += list[i].length;
        }
      }

      var buffer = Buffer.allocUnsafe(length);
      var pos = 0;
      for (i = 0; i < list.length; ++i) {
        var buf = list[i];
        if (!internalIsBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        }
        buf.copy(buffer, pos);
        pos += buf.length;
      }
      return buffer
    };

    function byteLength (string, encoding) {
      if (internalIsBuffer(string)) {
        return string.length
      }
      if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
          (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
        return string.byteLength
      }
      if (typeof string !== 'string') {
        string = '' + string;
      }

      var len = string.length;
      if (len === 0) return 0

      // Use a for loop to avoid recursion
      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'ascii':
          case 'latin1':
          case 'binary':
            return len
          case 'utf8':
          case 'utf-8':
          case undefined:
            return utf8ToBytes(string).length
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return len * 2
          case 'hex':
            return len >>> 1
          case 'base64':
            return base64ToBytes(string).length
          default:
            if (loweredCase) return utf8ToBytes(string).length // assume utf8
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer.byteLength = byteLength;

    function slowToString (encoding, start, end) {
      var loweredCase = false;

      // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
      // property of a typed array.

      // This behaves neither like String nor Uint8Array in that we set start/end
      // to their upper/lower bounds if the value passed is out of range.
      // undefined is handled specially as per ECMA-262 6th Edition,
      // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
      if (start === undefined || start < 0) {
        start = 0;
      }
      // Return early if start > this.length. Done here to prevent potential uint32
      // coercion fail below.
      if (start > this.length) {
        return ''
      }

      if (end === undefined || end > this.length) {
        end = this.length;
      }

      if (end <= 0) {
        return ''
      }

      // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
      end >>>= 0;
      start >>>= 0;

      if (end <= start) {
        return ''
      }

      if (!encoding) encoding = 'utf8';

      while (true) {
        switch (encoding) {
          case 'hex':
            return hexSlice(this, start, end)

          case 'utf8':
          case 'utf-8':
            return utf8Slice(this, start, end)

          case 'ascii':
            return asciiSlice(this, start, end)

          case 'latin1':
          case 'binary':
            return latin1Slice(this, start, end)

          case 'base64':
            return base64Slice(this, start, end)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return utf16leSlice(this, start, end)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = (encoding + '').toLowerCase();
            loweredCase = true;
        }
      }
    }

    // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
    // Buffer instances.
    Buffer.prototype._isBuffer = true;

    function swap (b, n, m) {
      var i = b[n];
      b[n] = b[m];
      b[m] = i;
    }

    Buffer.prototype.swap16 = function swap16 () {
      var len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits')
      }
      for (var i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this
    };

    Buffer.prototype.swap32 = function swap32 () {
      var len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits')
      }
      for (var i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this
    };

    Buffer.prototype.swap64 = function swap64 () {
      var len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits')
      }
      for (var i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this
    };

    Buffer.prototype.toString = function toString () {
      var length = this.length | 0;
      if (length === 0) return ''
      if (arguments.length === 0) return utf8Slice(this, 0, length)
      return slowToString.apply(this, arguments)
    };

    Buffer.prototype.equals = function equals (b) {
      if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
      if (this === b) return true
      return Buffer.compare(this, b) === 0
    };

    Buffer.prototype.inspect = function inspect () {
      var str = '';
      var max = INSPECT_MAX_BYTES;
      if (this.length > 0) {
        str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
        if (this.length > max) str += ' ... ';
      }
      return '<Buffer ' + str + '>'
    };

    Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
      if (!internalIsBuffer(target)) {
        throw new TypeError('Argument must be a Buffer')
      }

      if (start === undefined) {
        start = 0;
      }
      if (end === undefined) {
        end = target ? target.length : 0;
      }
      if (thisStart === undefined) {
        thisStart = 0;
      }
      if (thisEnd === undefined) {
        thisEnd = this.length;
      }

      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index')
      }

      if (thisStart >= thisEnd && start >= end) {
        return 0
      }
      if (thisStart >= thisEnd) {
        return -1
      }
      if (start >= end) {
        return 1
      }

      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;

      if (this === target) return 0

      var x = thisEnd - thisStart;
      var y = end - start;
      var len = Math.min(x, y);

      var thisCopy = this.slice(thisStart, thisEnd);
      var targetCopy = target.slice(start, end);

      for (var i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
    // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
    //
    // Arguments:
    // - buffer - a Buffer to search
    // - val - a string, Buffer, or number
    // - byteOffset - an index into `buffer`; will be clamped to an int32
    // - encoding - an optional encoding, relevant is val is a string
    // - dir - true for indexOf, false for lastIndexOf
    function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
      // Empty buffer means no match
      if (buffer.length === 0) return -1

      // Normalize byteOffset
      if (typeof byteOffset === 'string') {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff;
      } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000;
      }
      byteOffset = +byteOffset;  // Coerce to Number.
      if (isNaN(byteOffset)) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1);
      }

      // Normalize byteOffset: negative offsets start from the end of the buffer
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
      if (byteOffset >= buffer.length) {
        if (dir) return -1
        else byteOffset = buffer.length - 1;
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0;
        else return -1
      }

      // Normalize val
      if (typeof val === 'string') {
        val = Buffer.from(val, encoding);
      }

      // Finally, search either indexOf (if dir is true) or lastIndexOf
      if (internalIsBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
          return -1
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
      } else if (typeof val === 'number') {
        val = val & 0xFF; // Search for a byte value [0-255]
        if (Buffer.TYPED_ARRAY_SUPPORT &&
            typeof Uint8Array.prototype.indexOf === 'function') {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
          }
        }
        return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
      }

      throw new TypeError('val must be string, number or Buffer')
    }

    function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
      var indexSize = 1;
      var arrLength = arr.length;
      var valLength = val.length;

      if (encoding !== undefined) {
        encoding = String(encoding).toLowerCase();
        if (encoding === 'ucs2' || encoding === 'ucs-2' ||
            encoding === 'utf16le' || encoding === 'utf-16le') {
          if (arr.length < 2 || val.length < 2) {
            return -1
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }

      function read (buf, i) {
        if (indexSize === 1) {
          return buf[i]
        } else {
          return buf.readUInt16BE(i * indexSize)
        }
      }

      var i;
      if (dir) {
        var foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i;
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
          } else {
            if (foundIndex !== -1) i -= i - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
          var found = true;
          for (var j = 0; j < valLength; j++) {
            if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break
            }
          }
          if (found) return i
        }
      }

      return -1
    }

    Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1
    };

    Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    };

    Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    };

    function hexWrite (buf, string, offset, length) {
      offset = Number(offset) || 0;
      var remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }

      // must be an even number of digits
      var strLen = string.length;
      if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

      if (length > strLen / 2) {
        length = strLen / 2;
      }
      for (var i = 0; i < length; ++i) {
        var parsed = parseInt(string.substr(i * 2, 2), 16);
        if (isNaN(parsed)) return i
        buf[offset + i] = parsed;
      }
      return i
    }

    function utf8Write (buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    }

    function asciiWrite (buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length)
    }

    function latin1Write (buf, string, offset, length) {
      return asciiWrite(buf, string, offset, length)
    }

    function base64Write (buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length)
    }

    function ucs2Write (buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    }

    Buffer.prototype.write = function write (string, offset, length, encoding) {
      // Buffer#write(string)
      if (offset === undefined) {
        encoding = 'utf8';
        length = this.length;
        offset = 0;
      // Buffer#write(string, encoding)
      } else if (length === undefined && typeof offset === 'string') {
        encoding = offset;
        length = this.length;
        offset = 0;
      // Buffer#write(string, offset[, length][, encoding])
      } else if (isFinite(offset)) {
        offset = offset | 0;
        if (isFinite(length)) {
          length = length | 0;
          if (encoding === undefined) encoding = 'utf8';
        } else {
          encoding = length;
          length = undefined;
        }
      // legacy write(string, encoding, offset, length) - remove in v0.13
      } else {
        throw new Error(
          'Buffer.write(string, encoding, offset[, length]) is no longer supported'
        )
      }

      var remaining = this.length - offset;
      if (length === undefined || length > remaining) length = remaining;

      if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds')
      }

      if (!encoding) encoding = 'utf8';

      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'hex':
            return hexWrite(this, string, offset, length)

          case 'utf8':
          case 'utf-8':
            return utf8Write(this, string, offset, length)

          case 'ascii':
            return asciiWrite(this, string, offset, length)

          case 'latin1':
          case 'binary':
            return latin1Write(this, string, offset, length)

          case 'base64':
            // Warning: maxLength not taken into account in base64Write
            return base64Write(this, string, offset, length)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return ucs2Write(this, string, offset, length)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };

    Buffer.prototype.toJSON = function toJSON () {
      return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this._arr || this, 0)
      }
    };

    function base64Slice (buf, start, end) {
      if (start === 0 && end === buf.length) {
        return fromByteArray(buf)
      } else {
        return fromByteArray(buf.slice(start, end))
      }
    }

    function utf8Slice (buf, start, end) {
      end = Math.min(buf.length, end);
      var res = [];

      var i = start;
      while (i < end) {
        var firstByte = buf[i];
        var codePoint = null;
        var bytesPerSequence = (firstByte > 0xEF) ? 4
          : (firstByte > 0xDF) ? 3
          : (firstByte > 0xBF) ? 2
          : 1;

        if (i + bytesPerSequence <= end) {
          var secondByte, thirdByte, fourthByte, tempCodePoint;

          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 0x80) {
                codePoint = firstByte;
              }
              break
            case 2:
              secondByte = buf[i + 1];
              if ((secondByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                if (tempCodePoint > 0x7F) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }

        if (codePoint === null) {
          // we did not generate a valid codePoint so insert a
          // replacement char (U+FFFD) and advance only 1 byte
          codePoint = 0xFFFD;
          bytesPerSequence = 1;
        } else if (codePoint > 0xFFFF) {
          // encode to utf16 (surrogate pair dance)
          codePoint -= 0x10000;
          res.push(codePoint >>> 10 & 0x3FF | 0xD800);
          codePoint = 0xDC00 | codePoint & 0x3FF;
        }

        res.push(codePoint);
        i += bytesPerSequence;
      }

      return decodeCodePointsArray(res)
    }

    // Based on http://stackoverflow.com/a/22747272/680742, the browser with
    // the lowest limit is Chrome, with 0x10000 args.
    // We go 1 magnitude less, for safety
    var MAX_ARGUMENTS_LENGTH = 0x1000;

    function decodeCodePointsArray (codePoints) {
      var len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
      }

      // Decode in chunks to avoid "call stack size exceeded".
      var res = '';
      var i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res
    }

    function asciiSlice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 0x7F);
      }
      return ret
    }

    function latin1Slice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
      }
      return ret
    }

    function hexSlice (buf, start, end) {
      var len = buf.length;

      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;

      var out = '';
      for (var i = start; i < end; ++i) {
        out += toHex(buf[i]);
      }
      return out
    }

    function utf16leSlice (buf, start, end) {
      var bytes = buf.slice(start, end);
      var res = '';
      for (var i = 0; i < bytes.length; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res
    }

    Buffer.prototype.slice = function slice (start, end) {
      var len = this.length;
      start = ~~start;
      end = end === undefined ? len : ~~end;

      if (start < 0) {
        start += len;
        if (start < 0) start = 0;
      } else if (start > len) {
        start = len;
      }

      if (end < 0) {
        end += len;
        if (end < 0) end = 0;
      } else if (end > len) {
        end = len;
      }

      if (end < start) end = start;

      var newBuf;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        newBuf = this.subarray(start, end);
        newBuf.__proto__ = Buffer.prototype;
      } else {
        var sliceLen = end - start;
        newBuf = new Buffer(sliceLen, undefined);
        for (var i = 0; i < sliceLen; ++i) {
          newBuf[i] = this[i + start];
        }
      }

      return newBuf
    };

    /*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
    function checkOffset (offset, ext, length) {
      if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
      if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    }

    Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }

      return val
    };

    Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        checkOffset(offset, byteLength, this.length);
      }

      var val = this[offset + --byteLength];
      var mul = 1;
      while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul;
      }

      return val
    };

    Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      return this[offset]
    };

    Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] | (this[offset + 1] << 8)
    };

    Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return (this[offset] << 8) | this[offset + 1]
    };

    Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return ((this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16)) +
          (this[offset + 3] * 0x1000000)
    };

    Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        this[offset + 3])
    };

    Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var i = byteLength;
      var mul = 1;
      var val = this[offset + --i];
      while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      if (!(this[offset] & 0x80)) return (this[offset])
      return ((0xff - this[offset] + 1) * -1)
    };

    Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset] | (this[offset + 1] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset + 1] | (this[offset] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24)
    };

    Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3])
    };

    Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, true, 23, 4)
    };

    Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, false, 23, 4)
    };

    Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, true, 52, 8)
    };

    Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, false, 52, 8)
    };

    function checkInt (buf, value, offset, ext, max, min) {
      if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
    }

    Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var mul = 1;
      var i = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var i = byteLength - 1;
      var mul = 1;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      this[offset] = (value & 0xff);
      return offset + 1
    };

    function objectWriteUInt16 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
        buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
          (littleEndian ? i : 1 - i) * 8;
      }
    }

    Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    function objectWriteUInt32 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffffffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
        buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
      }
    }

    Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset + 3] = (value >>> 24);
        this[offset + 2] = (value >>> 16);
        this[offset + 1] = (value >>> 8);
        this[offset] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = 0;
      var mul = 1;
      var sub = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = byteLength - 1;
      var mul = 1;
      var sub = 0;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      if (value < 0) value = 0xff + value + 1;
      this[offset] = (value & 0xff);
      return offset + 1
    };

    Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
        this[offset + 2] = (value >>> 16);
        this[offset + 3] = (value >>> 24);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (value < 0) value = 0xffffffff + value + 1;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    function checkIEEE754 (buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
      if (offset < 0) throw new RangeError('Index out of range')
    }

    function writeFloat (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4);
      }
      write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4
    }

    Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert)
    };

    function writeDouble (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8);
      }
      write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8
    }

    Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert)
    };

    // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function copy (target, targetStart, start, end) {
      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (targetStart >= target.length) targetStart = target.length;
      if (!targetStart) targetStart = 0;
      if (end > 0 && end < start) end = start;

      // Copy 0 bytes; we're done
      if (end === start) return 0
      if (target.length === 0 || this.length === 0) return 0

      // Fatal error conditions
      if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds')
      }
      if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
      if (end < 0) throw new RangeError('sourceEnd out of bounds')

      // Are we oob?
      if (end > this.length) end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }

      var len = end - start;
      var i;

      if (this === target && start < targetStart && targetStart < end) {
        // descending copy from end
        for (i = len - 1; i >= 0; --i) {
          target[i + targetStart] = this[i + start];
        }
      } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
        // ascending copy from start
        for (i = 0; i < len; ++i) {
          target[i + targetStart] = this[i + start];
        }
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, start + len),
          targetStart
        );
      }

      return len
    };

    // Usage:
    //    buffer.fill(number[, offset[, end]])
    //    buffer.fill(buffer[, offset[, end]])
    //    buffer.fill(string[, offset[, end]][, encoding])
    Buffer.prototype.fill = function fill (val, start, end, encoding) {
      // Handle string cases:
      if (typeof val === 'string') {
        if (typeof start === 'string') {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === 'string') {
          encoding = end;
          end = this.length;
        }
        if (val.length === 1) {
          var code = val.charCodeAt(0);
          if (code < 256) {
            val = code;
          }
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
          throw new TypeError('encoding must be a string')
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }
      } else if (typeof val === 'number') {
        val = val & 255;
      }

      // Invalid ranges are not set to a default, so can range check early.
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index')
      }

      if (end <= start) {
        return this
      }

      start = start >>> 0;
      end = end === undefined ? this.length : end >>> 0;

      if (!val) val = 0;

      var i;
      if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        var bytes = internalIsBuffer(val)
          ? val
          : utf8ToBytes(new Buffer(val, encoding).toString());
        var len = bytes.length;
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }

      return this
    };

    // HELPER FUNCTIONS
    // ================

    var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

    function base64clean (str) {
      // Node strips out invalid characters like \n and \t from the string, base64-js does not
      str = stringtrim(str).replace(INVALID_BASE64_RE, '');
      // Node converts strings with length < 2 to ''
      if (str.length < 2) return ''
      // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
      while (str.length % 4 !== 0) {
        str = str + '=';
      }
      return str
    }

    function stringtrim (str) {
      if (str.trim) return str.trim()
      return str.replace(/^\s+|\s+$/g, '')
    }

    function toHex (n) {
      if (n < 16) return '0' + n.toString(16)
      return n.toString(16)
    }

    function utf8ToBytes (string, units) {
      units = units || Infinity;
      var codePoint;
      var length = string.length;
      var leadSurrogate = null;
      var bytes = [];

      for (var i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);

        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
          // last char was a lead
          if (!leadSurrogate) {
            // no lead yet
            if (codePoint > 0xDBFF) {
              // unexpected trail
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            } else if (i + 1 === length) {
              // unpaired lead
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            }

            // valid lead
            leadSurrogate = codePoint;

            continue
          }

          // 2 leads in a row
          if (codePoint < 0xDC00) {
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            leadSurrogate = codePoint;
            continue
          }

          // valid surrogate pair
          codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
        } else if (leadSurrogate) {
          // valid bmp char, but last char was a lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        }

        leadSurrogate = null;

        // encode utf8
        if (codePoint < 0x80) {
          if ((units -= 1) < 0) break
          bytes.push(codePoint);
        } else if (codePoint < 0x800) {
          if ((units -= 2) < 0) break
          bytes.push(
            codePoint >> 0x6 | 0xC0,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x10000) {
          if ((units -= 3) < 0) break
          bytes.push(
            codePoint >> 0xC | 0xE0,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x110000) {
          if ((units -= 4) < 0) break
          bytes.push(
            codePoint >> 0x12 | 0xF0,
            codePoint >> 0xC & 0x3F | 0x80,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else {
          throw new Error('Invalid code point')
        }
      }

      return bytes
    }

    function asciiToBytes (str) {
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF);
      }
      return byteArray
    }

    function utf16leToBytes (str, units) {
      var c, hi, lo;
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break

        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }

      return byteArray
    }


    function base64ToBytes (str) {
      return toByteArray(base64clean(str))
    }

    function blitBuffer (src, dst, offset, length) {
      for (var i = 0; i < length; ++i) {
        if ((i + offset >= dst.length) || (i >= src.length)) break
        dst[i + offset] = src[i];
      }
      return i
    }

    function isnan (val) {
      return val !== val // eslint-disable-line no-self-compare
    }


    // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
    // The _isBuffer check is for Safari 5-7 support, because it's missing
    // Object.prototype.constructor. Remove this eventually
    function isBuffer(obj) {
      return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
    }

    function isFastBuffer (obj) {
      return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
    }

    // For Node v0.10 support. Remove this eventually.
    function isSlowBuffer (obj) {
      return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    function getCjsExportFromNamespace (n) {
    	return n && n['default'] || n;
    }

    var encode_1 = encode;

    var MSB = 0x80
      , REST = 0x7F
      , MSBALL = ~REST
      , INT = Math.pow(2, 31);

    function encode(num, out, offset) {
      out = out || [];
      offset = offset || 0;
      var oldOffset = offset;

      while(num >= INT) {
        out[offset++] = (num & 0xFF) | MSB;
        num /= 128;
      }
      while(num & MSBALL) {
        out[offset++] = (num & 0xFF) | MSB;
        num >>>= 7;
      }
      out[offset] = num | 0;
      
      encode.bytes = offset - oldOffset + 1;
      
      return out
    }

    var decode = read$1;

    var MSB$1 = 0x80
      , REST$1 = 0x7F;

    function read$1(buf, offset) {
      var res    = 0
        , offset = offset || 0
        , shift  = 0
        , counter = offset
        , b
        , l = buf.length;

      do {
        if (counter >= l) {
          read$1.bytes = 0;
          throw new RangeError('Could not decode varint')
        }
        b = buf[counter++];
        res += shift < 28
          ? (b & REST$1) << shift
          : (b & REST$1) * Math.pow(2, shift);
        shift += 7;
      } while (b >= MSB$1)

      read$1.bytes = counter - offset;

      return res
    }

    var N1 = Math.pow(2,  7);
    var N2 = Math.pow(2, 14);
    var N3 = Math.pow(2, 21);
    var N4 = Math.pow(2, 28);
    var N5 = Math.pow(2, 35);
    var N6 = Math.pow(2, 42);
    var N7 = Math.pow(2, 49);
    var N8 = Math.pow(2, 56);
    var N9 = Math.pow(2, 63);

    var length = function (value) {
      return (
        value < N1 ? 1
      : value < N2 ? 2
      : value < N3 ? 3
      : value < N4 ? 4
      : value < N5 ? 5
      : value < N6 ? 6
      : value < N7 ? 7
      : value < N8 ? 8
      : value < N9 ? 9
      :              10
      )
    };

    var varint = {
        encode: encode_1
      , decode: decode
      , encodingLength: length
    };

    var encode$1 = function encode (v, b, o) {
      v = v >= 0 ? v*2 : v*-2 - 1;
      var r = varint.encode(v, b, o);
      encode.bytes = varint.encode.bytes;
      return r
    };
    var decode$1 = function decode (b, o) {
      var v = varint.decode(b, o);
      decode.bytes = varint.decode.bytes;
      return v & 1 ? (v+1) / -2 : v / 2
    };

    var encodingLength = function (v) {
      return varint.encodingLength(v >= 0 ? v*2 : v*-2 - 1)
    };

    var signedVarint = {
    	encode: encode$1,
    	decode: decode$1,
    	encodingLength: encodingLength
    };

    var protocolBuffersEncodings = createCommonjsModule(function (module, exports) {
    exports.make = encoder;

    exports.name = function (enc) {
      var keys = Object.keys(exports);
      for (var i = 0; i < keys.length; i++) {
        if (exports[keys[i]] === enc) return keys[i]
      }
      return null
    };

    exports.skip = function (type, buffer, offset) {
      switch (type) {
        case 0:
          varint.decode(buffer, offset);
          return offset + varint.decode.bytes

        case 1:
          return offset + 8

        case 2:
          var len = varint.decode(buffer, offset);
          return offset + varint.decode.bytes + len

        case 3:
        case 4:
          throw new Error('Groups are not supported')

        case 5:
          return offset + 4
      }

      throw new Error('Unknown wire type: ' + type)
    };

    exports.bytes = encoder(2,
      function encode (val, buffer, offset) {
        var oldOffset = offset;
        var len = bufferLength(val);

        varint.encode(len, buffer, offset);
        offset += varint.encode.bytes;

        if (isBuffer(val)) val.copy(buffer, offset);
        else buffer.write(val, offset, len);
        offset += len;

        encode.bytes = offset - oldOffset;
        return buffer
      },
      function decode (buffer, offset) {
        var oldOffset = offset;

        var len = varint.decode(buffer, offset);
        offset += varint.decode.bytes;

        var val = buffer.slice(offset, offset + len);
        offset += val.length;

        decode.bytes = offset - oldOffset;
        return val
      },
      function encodingLength (val) {
        var len = bufferLength(val);
        return varint.encodingLength(len) + len
      }
    );

    exports.string = encoder(2,
      function encode (val, buffer, offset) {
        var oldOffset = offset;
        var len = Buffer.byteLength(val);

        varint.encode(len, buffer, offset, 'utf-8');
        offset += varint.encode.bytes;

        buffer.write(val, offset, len);
        offset += len;

        encode.bytes = offset - oldOffset;
        return buffer
      },
      function decode (buffer, offset) {
        var oldOffset = offset;

        var len = varint.decode(buffer, offset);
        offset += varint.decode.bytes;

        var val = buffer.toString('utf-8', offset, offset + len);
        offset += len;

        decode.bytes = offset - oldOffset;
        return val
      },
      function encodingLength (val) {
        var len = Buffer.byteLength(val);
        return varint.encodingLength(len) + len
      }
    );

    exports.bool = encoder(0,
      function encode (val, buffer, offset) {
        buffer[offset] = val ? 1 : 0;
        encode.bytes = 1;
        return buffer
      },
      function decode (buffer, offset) {
        var bool = buffer[offset] > 0;
        decode.bytes = 1;
        return bool
      },
      function encodingLength () {
        return 1
      }
    );

    exports.int32 = encoder(0,
      function encode (val, buffer, offset) {
        varint.encode(val < 0 ? val + 4294967296 : val, buffer, offset);
        encode.bytes = varint.encode.bytes;
        return buffer
      },
      function decode (buffer, offset) {
        var val = varint.decode(buffer, offset);
        decode.bytes = varint.decode.bytes;
        return val > 2147483647 ? val - 4294967296 : val
      },
      function encodingLength (val) {
        return varint.encodingLength(val < 0 ? val + 4294967296 : val)
      }
    );

    exports.int64 = encoder(0,
      function encode (val, buffer, offset) {
        if (val < 0) {
          var last = offset + 9;
          varint.encode(val * -1, buffer, offset);
          offset += varint.encode.bytes - 1;
          buffer[offset] = buffer[offset] | 0x80;
          while (offset < last - 1) {
            offset++;
            buffer[offset] = 0xff;
          }
          buffer[last] = 0x01;
          encode.bytes = 10;
        } else {
          varint.encode(val, buffer, offset);
          encode.bytes = varint.encode.bytes;
        }
        return buffer
      },
      function decode (buffer, offset) {
        var val = varint.decode(buffer, offset);
        if (val >= Math.pow(2, 63)) {
          var limit = 9;
          while (buffer[offset + limit - 1] === 0xff) limit--;
          limit = limit || 9;
          var subset = Buffer.allocUnsafe(limit);
          buffer.copy(subset, 0, offset, offset + limit);
          subset[limit - 1] = subset[limit - 1] & 0x7f;
          val = -1 * varint.decode(subset, 0);
          decode.bytes = 10;
        } else {
          decode.bytes = varint.decode.bytes;
        }
        return val
      },
      function encodingLength (val) {
        return val < 0 ? 10 : varint.encodingLength(val)
      }
    );

    exports.sint32 =
    exports.sint64 = encoder(0,
      signedVarint.encode,
      signedVarint.decode,
      signedVarint.encodingLength
    );

    exports.uint32 =
    exports.uint64 =
    exports.enum =
    exports.varint = encoder(0,
      varint.encode,
      varint.decode,
      varint.encodingLength
    );

    // we cannot represent these in javascript so we just use buffers
    exports.fixed64 =
    exports.sfixed64 = encoder(1,
      function encode (val, buffer, offset) {
        val.copy(buffer, offset);
        encode.bytes = 8;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.slice(offset, offset + 8);
        decode.bytes = 8;
        return val
      },
      function encodingLength () {
        return 8
      }
    );

    exports.double = encoder(1,
      function encode (val, buffer, offset) {
        buffer.writeDoubleLE(val, offset);
        encode.bytes = 8;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.readDoubleLE(offset);
        decode.bytes = 8;
        return val
      },
      function encodingLength () {
        return 8
      }
    );

    exports.fixed32 = encoder(5,
      function encode (val, buffer, offset) {
        buffer.writeUInt32LE(val, offset);
        encode.bytes = 4;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.readUInt32LE(offset);
        decode.bytes = 4;
        return val
      },
      function encodingLength () {
        return 4
      }
    );

    exports.sfixed32 = encoder(5,
      function encode (val, buffer, offset) {
        buffer.writeInt32LE(val, offset);
        encode.bytes = 4;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.readInt32LE(offset);
        decode.bytes = 4;
        return val
      },
      function encodingLength () {
        return 4
      }
    );

    exports.float = encoder(5,
      function encode (val, buffer, offset) {
        buffer.writeFloatLE(val, offset);
        encode.bytes = 4;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.readFloatLE(offset);
        decode.bytes = 4;
        return val
      },
      function encodingLength () {
        return 4
      }
    );

    function encoder (type, encode, decode, encodingLength) {
      encode.bytes = decode.bytes = 0;

      return {
        type: type,
        encode: encode,
        decode: decode,
        encodingLength: encodingLength
      }
    }

    function bufferLength (val) {
      return isBuffer(val) ? val.length : Buffer.byteLength(val)
    }
    });
    var protocolBuffersEncodings_1 = protocolBuffersEncodings.make;
    var protocolBuffersEncodings_2 = protocolBuffersEncodings.name;
    var protocolBuffersEncodings_3 = protocolBuffersEncodings.skip;
    var protocolBuffersEncodings_4 = protocolBuffersEncodings.bytes;
    var protocolBuffersEncodings_5 = protocolBuffersEncodings.string;
    var protocolBuffersEncodings_6 = protocolBuffersEncodings.bool;
    var protocolBuffersEncodings_7 = protocolBuffersEncodings.int32;
    var protocolBuffersEncodings_8 = protocolBuffersEncodings.int64;
    var protocolBuffersEncodings_9 = protocolBuffersEncodings.sint32;
    var protocolBuffersEncodings_10 = protocolBuffersEncodings.sint64;
    var protocolBuffersEncodings_11 = protocolBuffersEncodings.uint32;
    var protocolBuffersEncodings_12 = protocolBuffersEncodings.uint64;
    var protocolBuffersEncodings_13 = protocolBuffersEncodings.varint;
    var protocolBuffersEncodings_14 = protocolBuffersEncodings.fixed64;
    var protocolBuffersEncodings_15 = protocolBuffersEncodings.sfixed64;
    var protocolBuffersEncodings_16 = protocolBuffersEncodings.fixed32;
    var protocolBuffersEncodings_17 = protocolBuffersEncodings.sfixed32;

    var messages = createCommonjsModule(function (module, exports) {
    // This file is auto generated by the protocol-buffers compiler

    /* eslint-disable quotes */
    /* eslint-disable indent */
    /* eslint-disable no-redeclare */
    /* eslint-disable camelcase */

    // Remember to `npm install --save protocol-buffers-encodings`

    var varint = protocolBuffersEncodings.varint;
    var skip = protocolBuffersEncodings.skip;

    var VoteMsg = exports.VoteMsg = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    var IdentityMessage = exports.IdentityMessage = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    var Keypair = exports.Keypair = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    var PollMessage = exports.PollMessage = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    var PollChallenge = exports.PollChallenge = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    var PollIntBasicVote = exports.PollIntBasicVote = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    var PollBallot = exports.PollBallot = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    var PollStatement = exports.PollStatement = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    defineVoteMsg();
    defineIdentityMessage();
    defineKeypair();
    definePollMessage();
    definePollChallenge();
    definePollIntBasicVote();
    definePollBallot();
    definePollStatement();

    function defineVoteMsg () {
      VoteMsg.encodingLength = encodingLength;
      VoteMsg.encode = encode;
      VoteMsg.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if (!defined(obj.value)) throw new Error("value is required")
        var len = protocolBuffersEncodings.int32.encodingLength(obj.value);
        length += 1 + len;
        if (defined(obj.geo)) {
          var len = protocolBuffersEncodings.string.encodingLength(obj.geo);
          length += 1 + len;
        }
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if (!defined(obj.value)) throw new Error("value is required")
        buf[offset++] = 8;
        protocolBuffersEncodings.int32.encode(obj.value, buf, offset);
        offset += protocolBuffersEncodings.int32.encode.bytes;
        if (defined(obj.geo)) {
          buf[offset++] = 18;
          protocolBuffersEncodings.string.encode(obj.geo, buf, offset);
          offset += protocolBuffersEncodings.string.encode.bytes;
        }
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          value: 0,
          geo: ""
        };
        var found0 = false;
        while (true) {
          if (end <= offset) {
            if (!found0) throw new Error("Decoded message is not valid")
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            obj.value = protocolBuffersEncodings.int32.decode(buf, offset);
            offset += protocolBuffersEncodings.int32.decode.bytes;
            found0 = true;
            break
            case 2:
            obj.geo = protocolBuffersEncodings.string.decode(buf, offset);
            offset += protocolBuffersEncodings.string.decode.bytes;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function defineIdentityMessage () {
      IdentityMessage.encodingLength = encodingLength;
      IdentityMessage.encode = encode;
      IdentityMessage.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if (!defined(obj.sig)) throw new Error("sig is required")
        var len = Keypair.encodingLength(obj.sig);
        length += varint.encodingLength(len);
        length += 1 + len;
        if (!defined(obj.box)) throw new Error("box is required")
        var len = Keypair.encodingLength(obj.box);
        length += varint.encodingLength(len);
        length += 1 + len;
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if (!defined(obj.sig)) throw new Error("sig is required")
        buf[offset++] = 10;
        varint.encode(Keypair.encodingLength(obj.sig), buf, offset);
        offset += varint.encode.bytes;
        Keypair.encode(obj.sig, buf, offset);
        offset += Keypair.encode.bytes;
        if (!defined(obj.box)) throw new Error("box is required")
        buf[offset++] = 18;
        varint.encode(Keypair.encodingLength(obj.box), buf, offset);
        offset += varint.encode.bytes;
        Keypair.encode(obj.box, buf, offset);
        offset += Keypair.encode.bytes;
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          sig: null,
          box: null
        };
        var found0 = false;
        var found1 = false;
        while (true) {
          if (end <= offset) {
            if (!found0 || !found1) throw new Error("Decoded message is not valid")
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            var len = varint.decode(buf, offset);
            offset += varint.decode.bytes;
            obj.sig = Keypair.decode(buf, offset, offset + len);
            offset += Keypair.decode.bytes;
            found0 = true;
            break
            case 2:
            var len = varint.decode(buf, offset);
            offset += varint.decode.bytes;
            obj.box = Keypair.decode(buf, offset, offset + len);
            offset += Keypair.decode.bytes;
            found1 = true;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function defineKeypair () {
      Keypair.encodingLength = encodingLength;
      Keypair.encode = encode;
      Keypair.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if (!defined(obj.sk)) throw new Error("sk is required")
        var len = protocolBuffersEncodings.bytes.encodingLength(obj.sk);
        length += 1 + len;
        if (!defined(obj.pk)) throw new Error("pk is required")
        var len = protocolBuffersEncodings.bytes.encodingLength(obj.pk);
        length += 1 + len;
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if (!defined(obj.sk)) throw new Error("sk is required")
        buf[offset++] = 10;
        protocolBuffersEncodings.bytes.encode(obj.sk, buf, offset);
        offset += protocolBuffersEncodings.bytes.encode.bytes;
        if (!defined(obj.pk)) throw new Error("pk is required")
        buf[offset++] = 18;
        protocolBuffersEncodings.bytes.encode(obj.pk, buf, offset);
        offset += protocolBuffersEncodings.bytes.encode.bytes;
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          sk: null,
          pk: null
        };
        var found0 = false;
        var found1 = false;
        while (true) {
          if (end <= offset) {
            if (!found0 || !found1) throw new Error("Decoded message is not valid")
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            obj.sk = protocolBuffersEncodings.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings.bytes.decode.bytes;
            found0 = true;
            break
            case 2:
            obj.pk = protocolBuffersEncodings.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings.bytes.decode.bytes;
            found1 = true;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function definePollMessage () {
      PollMessage.encodingLength = encodingLength;
      PollMessage.encode = encode;
      PollMessage.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if ((+defined(obj.challenge) + +defined(obj.ballot)) > 1) throw new Error("only one of the properties defined in oneof msg can be set")
        if (defined(obj.challenge)) {
          var len = PollChallenge.encodingLength(obj.challenge);
          length += varint.encodingLength(len);
          length += 1 + len;
        }
        if (defined(obj.ballot)) {
          var len = PollBallot.encodingLength(obj.ballot);
          length += varint.encodingLength(len);
          length += 1 + len;
        }
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if ((+defined(obj.challenge) + +defined(obj.ballot)) > 1) throw new Error("only one of the properties defined in oneof msg can be set")
        if (defined(obj.challenge)) {
          buf[offset++] = 10;
          varint.encode(PollChallenge.encodingLength(obj.challenge), buf, offset);
          offset += varint.encode.bytes;
          PollChallenge.encode(obj.challenge, buf, offset);
          offset += PollChallenge.encode.bytes;
        }
        if (defined(obj.ballot)) {
          buf[offset++] = 18;
          varint.encode(PollBallot.encodingLength(obj.ballot), buf, offset);
          offset += varint.encode.bytes;
          PollBallot.encode(obj.ballot, buf, offset);
          offset += PollBallot.encode.bytes;
        }
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          challenge: null,
          ballot: null
        };
        while (true) {
          if (end <= offset) {
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            delete obj.ballot;
            var len = varint.decode(buf, offset);
            offset += varint.decode.bytes;
            obj.challenge = PollChallenge.decode(buf, offset, offset + len);
            offset += PollChallenge.decode.bytes;
            break
            case 2:
            delete obj.challenge;
            var len = varint.decode(buf, offset);
            offset += varint.decode.bytes;
            obj.ballot = PollBallot.decode(buf, offset, offset + len);
            offset += PollBallot.decode.bytes;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function definePollChallenge () {
      PollChallenge.encodingLength = encodingLength;
      PollChallenge.encode = encode;
      PollChallenge.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if (!defined(obj.version)) throw new Error("version is required")
        var len = protocolBuffersEncodings.varint.encodingLength(obj.version);
        length += 1 + len;
        if (!defined(obj.box_pk)) throw new Error("box_pk is required")
        var len = protocolBuffersEncodings.bytes.encodingLength(obj.box_pk);
        length += 1 + len;
        if (defined(obj.motion)) {
          var len = protocolBuffersEncodings.string.encodingLength(obj.motion);
          length += 1 + len;
        }
        if (defined(obj.options)) {
          for (var i = 0; i < obj.options.length; i++) {
            if (!defined(obj.options[i])) continue
            var len = protocolBuffersEncodings.string.encodingLength(obj.options[i]);
            length += 1 + len;
          }
        }
        if (defined(obj.ends_at)) {
          var len = protocolBuffersEncodings.varint.encodingLength(obj.ends_at);
          length += 1 + len;
        }
        if (defined(obj.motd)) {
          var len = protocolBuffersEncodings.string.encodingLength(obj.motd);
          length += 1 + len;
        }
        if (defined(obj.extra)) {
          var len = protocolBuffersEncodings.bytes.encodingLength(obj.extra);
          length += 1 + len;
        }
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if (!defined(obj.version)) throw new Error("version is required")
        buf[offset++] = 8;
        protocolBuffersEncodings.varint.encode(obj.version, buf, offset);
        offset += protocolBuffersEncodings.varint.encode.bytes;
        if (!defined(obj.box_pk)) throw new Error("box_pk is required")
        buf[offset++] = 18;
        protocolBuffersEncodings.bytes.encode(obj.box_pk, buf, offset);
        offset += protocolBuffersEncodings.bytes.encode.bytes;
        if (defined(obj.motion)) {
          buf[offset++] = 26;
          protocolBuffersEncodings.string.encode(obj.motion, buf, offset);
          offset += protocolBuffersEncodings.string.encode.bytes;
        }
        if (defined(obj.options)) {
          for (var i = 0; i < obj.options.length; i++) {
            if (!defined(obj.options[i])) continue
            buf[offset++] = 34;
            protocolBuffersEncodings.string.encode(obj.options[i], buf, offset);
            offset += protocolBuffersEncodings.string.encode.bytes;
          }
        }
        if (defined(obj.ends_at)) {
          buf[offset++] = 40;
          protocolBuffersEncodings.varint.encode(obj.ends_at, buf, offset);
          offset += protocolBuffersEncodings.varint.encode.bytes;
        }
        if (defined(obj.motd)) {
          buf[offset++] = 50;
          protocolBuffersEncodings.string.encode(obj.motd, buf, offset);
          offset += protocolBuffersEncodings.string.encode.bytes;
        }
        if (defined(obj.extra)) {
          buf[offset++] = 58;
          protocolBuffersEncodings.bytes.encode(obj.extra, buf, offset);
          offset += protocolBuffersEncodings.bytes.encode.bytes;
        }
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          version: 0,
          box_pk: null,
          motion: "",
          options: [],
          ends_at: 0,
          motd: "",
          extra: null
        };
        var found0 = false;
        var found1 = false;
        while (true) {
          if (end <= offset) {
            if (!found0 || !found1) throw new Error("Decoded message is not valid")
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            obj.version = protocolBuffersEncodings.varint.decode(buf, offset);
            offset += protocolBuffersEncodings.varint.decode.bytes;
            found0 = true;
            break
            case 2:
            obj.box_pk = protocolBuffersEncodings.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings.bytes.decode.bytes;
            found1 = true;
            break
            case 3:
            obj.motion = protocolBuffersEncodings.string.decode(buf, offset);
            offset += protocolBuffersEncodings.string.decode.bytes;
            break
            case 4:
            obj.options.push(protocolBuffersEncodings.string.decode(buf, offset));
            offset += protocolBuffersEncodings.string.decode.bytes;
            break
            case 5:
            obj.ends_at = protocolBuffersEncodings.varint.decode(buf, offset);
            offset += protocolBuffersEncodings.varint.decode.bytes;
            break
            case 6:
            obj.motd = protocolBuffersEncodings.string.decode(buf, offset);
            offset += protocolBuffersEncodings.string.decode.bytes;
            break
            case 7:
            obj.extra = protocolBuffersEncodings.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings.bytes.decode.bytes;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function definePollIntBasicVote () {
      PollIntBasicVote.encodingLength = encodingLength;
      PollIntBasicVote.encode = encode;
      PollIntBasicVote.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if (!defined(obj.value)) throw new Error("value is required")
        var len = protocolBuffersEncodings.int32.encodingLength(obj.value);
        length += 1 + len;
        if (defined(obj.pluscode)) {
          var len = protocolBuffersEncodings.string.encodingLength(obj.pluscode);
          length += 1 + len;
        }
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if (!defined(obj.value)) throw new Error("value is required")
        buf[offset++] = 8;
        protocolBuffersEncodings.int32.encode(obj.value, buf, offset);
        offset += protocolBuffersEncodings.int32.encode.bytes;
        if (defined(obj.pluscode)) {
          buf[offset++] = 18;
          protocolBuffersEncodings.string.encode(obj.pluscode, buf, offset);
          offset += protocolBuffersEncodings.string.encode.bytes;
        }
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          value: 0,
          pluscode: ""
        };
        var found0 = false;
        while (true) {
          if (end <= offset) {
            if (!found0) throw new Error("Decoded message is not valid")
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            obj.value = protocolBuffersEncodings.int32.decode(buf, offset);
            offset += protocolBuffersEncodings.int32.decode.bytes;
            found0 = true;
            break
            case 2:
            obj.pluscode = protocolBuffersEncodings.string.decode(buf, offset);
            offset += protocolBuffersEncodings.string.decode.bytes;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function definePollBallot () {
      PollBallot.encodingLength = encodingLength;
      PollBallot.encode = encode;
      PollBallot.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if (!defined(obj.box_msg)) throw new Error("box_msg is required")
        var len = protocolBuffersEncodings.bytes.encodingLength(obj.box_msg);
        length += 1 + len;
        if (!defined(obj.secret_vote)) throw new Error("secret_vote is required")
        var len = protocolBuffersEncodings.bytes.encodingLength(obj.secret_vote);
        length += 1 + len;
        if (!defined(obj.box_pk)) throw new Error("box_pk is required")
        var len = protocolBuffersEncodings.bytes.encodingLength(obj.box_pk);
        length += 1 + len;
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if (!defined(obj.box_msg)) throw new Error("box_msg is required")
        buf[offset++] = 10;
        protocolBuffersEncodings.bytes.encode(obj.box_msg, buf, offset);
        offset += protocolBuffersEncodings.bytes.encode.bytes;
        if (!defined(obj.secret_vote)) throw new Error("secret_vote is required")
        buf[offset++] = 18;
        protocolBuffersEncodings.bytes.encode(obj.secret_vote, buf, offset);
        offset += protocolBuffersEncodings.bytes.encode.bytes;
        if (!defined(obj.box_pk)) throw new Error("box_pk is required")
        buf[offset++] = 26;
        protocolBuffersEncodings.bytes.encode(obj.box_pk, buf, offset);
        offset += protocolBuffersEncodings.bytes.encode.bytes;
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          box_msg: null,
          secret_vote: null,
          box_pk: null
        };
        var found0 = false;
        var found1 = false;
        var found2 = false;
        while (true) {
          if (end <= offset) {
            if (!found0 || !found1 || !found2) throw new Error("Decoded message is not valid")
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            obj.box_msg = protocolBuffersEncodings.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings.bytes.decode.bytes;
            found0 = true;
            break
            case 2:
            obj.secret_vote = protocolBuffersEncodings.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings.bytes.decode.bytes;
            found1 = true;
            break
            case 3:
            obj.box_pk = protocolBuffersEncodings.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings.bytes.decode.bytes;
            found2 = true;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function definePollStatement () {
      PollStatement.encodingLength = encodingLength;
      PollStatement.encode = encode;
      PollStatement.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if (!defined(obj.vote)) throw new Error("vote is required")
        var len = protocolBuffersEncodings.bytes.encodingLength(obj.vote);
        length += 1 + len;
        if (!defined(obj.proof)) throw new Error("proof is required")
        var len = protocolBuffersEncodings.bytes.encodingLength(obj.proof);
        length += 1 + len;
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if (!defined(obj.vote)) throw new Error("vote is required")
        buf[offset++] = 10;
        protocolBuffersEncodings.bytes.encode(obj.vote, buf, offset);
        offset += protocolBuffersEncodings.bytes.encode.bytes;
        if (!defined(obj.proof)) throw new Error("proof is required")
        buf[offset++] = 18;
        protocolBuffersEncodings.bytes.encode(obj.proof, buf, offset);
        offset += protocolBuffersEncodings.bytes.encode.bytes;
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          vote: null,
          proof: null
        };
        var found0 = false;
        var found1 = false;
        while (true) {
          if (end <= offset) {
            if (!found0 || !found1) throw new Error("Decoded message is not valid")
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            obj.vote = protocolBuffersEncodings.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings.bytes.decode.bytes;
            found0 = true;
            break
            case 2:
            obj.proof = protocolBuffersEncodings.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings.bytes.decode.bytes;
            found1 = true;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function defined (val) {
      return val !== null && val !== undefined && (typeof val !== 'number' || !isNaN(val))
    }
    });
    var messages_1 = messages.VoteMsg;
    var messages_2 = messages.IdentityMessage;
    var messages_3 = messages.Keypair;
    var messages_4 = messages.PollMessage;
    var messages_5 = messages.PollChallenge;
    var messages_6 = messages.PollIntBasicVote;
    var messages_7 = messages.PollBallot;
    var messages_8 = messages.PollStatement;

    var xsalsa20 = loadWebAssembly;

    loadWebAssembly.supported = typeof WebAssembly !== 'undefined';

    function loadWebAssembly (opts) {
      if (!loadWebAssembly.supported) return null

      var imp = opts && opts.imports;
      var wasm = toUint8Array('AGFzbQEAAAABGgNgBn9/f39/fwBgBn9/f39+fwF+YAN/f38AAwcGAAEBAgICBQUBAQroBwcoAwZtZW1vcnkCAAx4c2Fsc2EyMF94b3IAAAxjb3JlX3NhbHNhMjAABArqEQYYACAAIAEgAiADIAQgACkDACAFEAE3AwALPQBB8AAgAyAFEAMgACABIAIgA0EQaiAEQfAAEAJB8ABCADcDAEH4AEIANwMAQYABQgA3AwBBiAFCADcDAAuHBQEBfyACQQBGBEBCAA8LQdAAIAUpAwA3AwBB2AAgBUEIaikDADcDAEHgACAFQRBqKQMANwMAQegAIAVBGGopAwA3AwBBACADKQMANwMAQQggBDcDAAJAA0AgAkHAAEkNAUEQQQBB0AAQBSAAIAEpAwBBECkDAIU3AwAgAEEIaiABQQhqKQMAQRgpAwCFNwMAIABBEGogAUEQaikDAEEgKQMAhTcDACAAQRhqIAFBGGopAwBBKCkDAIU3AwAgAEEgaiABQSBqKQMAQTApAwCFNwMAIABBKGogAUEoaikDAEE4KQMAhTcDACAAQTBqIAFBMGopAwBBwAApAwCFNwMAIABBOGogAUE4aikDAEHIACkDAIU3AwBBCEEIKQMAQgF8NwMAIABBwABqIQAgAUHAAGohASACQcAAayECDAALC0EIKQMAIQQgAkEASwRAQRBBAEHQABAFAkACQAJAAkACQAJAAkACQCACQQhuDgcHBgUEAwIBAAsgAEE4aiABQThqKQMAQcgAKQMAhTcDAAsgAEEwaiABQTBqKQMAQcAAKQMAhTcDAAsgAEEoaiABQShqKQMAQTgpAwCFNwMACyAAQSBqIAFBIGopAwBBMCkDAIU3AwALIABBGGogAUEYaikDAEEoKQMAhTcDAAsgAEEQaiABQRBqKQMAQSApAwCFNwMACyAAQQhqIAFBCGopAwBBGCkDAIU3AwALIAAgASkDAEEQKQMAhTcDAAtBEEIANwMAQRhCADcDAEEgQgA3AwBBKEIANwMAQTBCADcDAEE4QgA3AwBBwABCADcDAEHIAEIANwMAQdAAQgA3AwBB2ABCADcDAEHgAEIANwMAQegAQgA3AwAgBA8LnQUBEX9B5fDBiwYhA0HuyIGZAyEIQbLaiMsHIQ1B9MqB2QYhEiACKAIAIQQgAkEEaigCACEFIAJBCGooAgAhBiACQQxqKAIAIQcgAkEQaigCACEOIAJBFGooAgAhDyACQRhqKAIAIRAgAkEcaigCACERIAEoAgAhCSABQQRqKAIAIQogAUEIaigCACELIAFBDGooAgAhDEEUIRMCQANAIBNBAEYNASAHIAMgD2pBB3dzIQcgCyAHIANqQQl3cyELIA8gCyAHakENd3MhDyADIA8gC2pBEndzIQMgDCAIIARqQQd3cyEMIBAgDCAIakEJd3MhECAEIBAgDGpBDXdzIQQgCCAEIBBqQRJ3cyEIIBEgDSAJakEHd3MhESAFIBEgDWpBCXdzIQUgCSAFIBFqQQ13cyEJIA0gCSAFakESd3MhDSAGIBIgDmpBB3dzIQYgCiAGIBJqQQl3cyEKIA4gCiAGakENd3MhDiASIA4gCmpBEndzIRIgBCADIAZqQQd3cyEEIAUgBCADakEJd3MhBSAGIAUgBGpBDXdzIQYgAyAGIAVqQRJ3cyEDIAkgCCAHakEHd3MhCSAKIAkgCGpBCXdzIQogByAKIAlqQQ13cyEHIAggByAKakESd3MhCCAOIA0gDGpBB3dzIQ4gCyAOIA1qQQl3cyELIAwgCyAOakENd3MhDCANIAwgC2pBEndzIQ0gDyASIBFqQQd3cyEPIBAgDyASakEJd3MhECARIBAgD2pBDXdzIREgEiARIBBqQRJ3cyESIBNBAmshEwwACwsgACADNgIAIABBBGogCDYCACAAQQhqIA02AgAgAEEMaiASNgIAIABBEGogCTYCACAAQRRqIAo2AgAgAEEYaiALNgIAIABBHGogDDYCAAsKACAAIAEgAhAFC90GASF/QeXwwYsGIQNB7siBmQMhCEGy2ojLByENQfTKgdkGIRIgAigCACEEIAJBBGooAgAhBSACQQhqKAIAIQYgAkEMaigCACEHIAJBEGooAgAhDiACQRRqKAIAIQ8gAkEYaigCACEQIAJBHGooAgAhESABKAIAIQkgAUEEaigCACEKIAFBCGooAgAhCyABQQxqKAIAIQwgAyETIAQhFCAFIRUgBiEWIAchFyAIIRggCSEZIAohGiALIRsgDCEcIA0hHSAOIR4gDyEfIBAhICARISEgEiEiQRQhIwJAA0AgI0EARg0BIAcgAyAPakEHd3MhByALIAcgA2pBCXdzIQsgDyALIAdqQQ13cyEPIAMgDyALakESd3MhAyAMIAggBGpBB3dzIQwgECAMIAhqQQl3cyEQIAQgECAMakENd3MhBCAIIAQgEGpBEndzIQggESANIAlqQQd3cyERIAUgESANakEJd3MhBSAJIAUgEWpBDXdzIQkgDSAJIAVqQRJ3cyENIAYgEiAOakEHd3MhBiAKIAYgEmpBCXdzIQogDiAKIAZqQQ13cyEOIBIgDiAKakESd3MhEiAEIAMgBmpBB3dzIQQgBSAEIANqQQl3cyEFIAYgBSAEakENd3MhBiADIAYgBWpBEndzIQMgCSAIIAdqQQd3cyEJIAogCSAIakEJd3MhCiAHIAogCWpBDXdzIQcgCCAHIApqQRJ3cyEIIA4gDSAMakEHd3MhDiALIA4gDWpBCXdzIQsgDCALIA5qQQ13cyEMIA0gDCALakESd3MhDSAPIBIgEWpBB3dzIQ8gECAPIBJqQQl3cyEQIBEgECAPakENd3MhESASIBEgEGpBEndzIRIgI0ECayEjDAALCyAAIAMgE2o2AgAgAEEEaiAEIBRqNgIAIABBCGogBSAVajYCACAAQQxqIAYgFmo2AgAgAEEQaiAHIBdqNgIAIABBFGogCCAYajYCACAAQRhqIAkgGWo2AgAgAEEcaiAKIBpqNgIAIABBIGogCyAbajYCACAAQSRqIAwgHGo2AgAgAEEoaiANIB1qNgIAIABBLGogDiAeajYCACAAQTBqIA8gH2o2AgAgAEE0aiAQICBqNgIAIABBOGogESAhajYCACAAQTxqIBIgImo2AgAL');
      var ready = null;

      var mod = {
        buffer: wasm,
        memory: null,
        exports: null,
        realloc: realloc,
        onload: onload
      };

      onload(function () {});

      return mod

      function realloc (size) {
        mod.exports.memory.grow(Math.ceil(Math.abs(size - mod.memory.length) / 65536));
        mod.memory = new Uint8Array(mod.exports.memory.buffer);
      }

      function onload (cb) {
        if (mod.exports) return cb()

        if (ready) {
          ready.then(cb.bind(null, null)).catch(cb);
          return
        }

        try {
          if (opts && opts.async) throw new Error('async')
          setup({instance: new WebAssembly.Instance(new WebAssembly.Module(wasm), imp)});
        } catch (err) {
          ready = WebAssembly.instantiate(wasm, imp).then(setup);
        }

        onload(cb);
      }

      function setup (w) {
        mod.exports = w.instance.exports;
        mod.memory = mod.exports.memory && mod.exports.memory.buffer && new Uint8Array(mod.exports.memory.buffer);
      }
    }

    function toUint8Array (s) {
      if (typeof atob === 'function') return new Uint8Array(atob(s).split('').map(charCodeAt))
      return new (commonjsRequire().Buffer)(s, 'base64')
    }

    function charCodeAt (c) {
      return c.charCodeAt(0)
    }

    var xsalsa20$1 = xsalsa20();

    var SIGMA = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
    var head = 144;
    var top = head;
    var free = [];

    var xsalsa20_1 = XSalsa20;

    XSalsa20.NONCEBYTES = 24;
    XSalsa20.KEYBYTES = 32;

    XSalsa20.core_hsalsa20 = core_hsalsa20;
    XSalsa20.SIGMA = SIGMA;

    function XSalsa20 (nonce, key) {
      if (!(this instanceof XSalsa20)) return new XSalsa20(nonce, key)
      if (!nonce || nonce.length < 24) throw new Error('nonce must be at least 24 bytes')
      if (!key || key.length < 32) throw new Error('key must be at least 32 bytes')
      this._xor = xsalsa20$1 && xsalsa20$1.exports ? new WASM(nonce, key) : new Fallback(nonce, key);
    }

    XSalsa20.prototype.update = function (input, output) {
      if (!input) throw new Error('input must be Uint8Array or Buffer')
      if (!output) output = new Uint8Array(input.length);
      if (input.length) this._xor.update(input, output);
      return output
    };

    XSalsa20.prototype.final =
    XSalsa20.prototype.finalize = function () {
      this._xor.finalize();
      this._xor = null;
    };

    function WASM (nonce, key) {
      if (!free.length) {
        free.push(head);
        head += 64;
      }

      this._pointer = free.pop();
      this._nonce = this._pointer + 8;
      this._key = this._nonce + 24;
      this._overflow = 0;

      xsalsa20$1.memory.fill(0, this._pointer, this._pointer + 8);
      xsalsa20$1.memory.set(nonce, this._nonce);
      xsalsa20$1.memory.set(key, this._key);
    }

    WASM.prototype.update = function (input, output) {
      var len = this._overflow + input.length;
      var start = head + this._overflow;

      top = head + len;
      if (top >= xsalsa20$1.memory.length) xsalsa20$1.realloc(top);

      xsalsa20$1.memory.set(input, start);
      xsalsa20$1.exports.xsalsa20_xor(this._pointer, head, head, len, this._nonce, this._key);
      output.set(xsalsa20$1.memory.subarray(start, head + len));

      this._overflow = len & 63;
    };

    WASM.prototype.finalize = function () {
      xsalsa20$1.memory.fill(0, this._pointer, this._key + 32);
      if (top > head) {
        xsalsa20$1.memory.fill(0, head, top);
        top = 0;
      }
      free.push(this._pointer);
    };

    function Fallback (nonce, key) {
      this._s = new Uint8Array(32);
      this._z = new Uint8Array(16);
      this._overflow = 0;
      core_hsalsa20(this._s, nonce, key, SIGMA);
      for (var i = 0; i < 8; i++) this._z[i] = nonce[i + 16];
    }

    Fallback.prototype.update = function (input, output) {
      var x = new Uint8Array(64);
      var u = 0;
      var i = this._overflow;
      var b = input.length + this._overflow;
      var z = this._z;
      var mpos = -this._overflow;
      var cpos = -this._overflow;

      while (b >= 64) {
        core_salsa20(x, z, this._s, SIGMA);
        for (; i < 64; i++) output[cpos + i] = input[mpos + i] ^ x[i];
        u = 1;
        for (i = 8; i < 16; i++) {
          u += (z[i] & 0xff) | 0;
          z[i] = u & 0xff;
          u >>>= 8;
        }
        b -= 64;
        cpos += 64;
        mpos += 64;
        i = 0;
      }
      if (b > 0) {
        core_salsa20(x, z, this._s, SIGMA);
        for (; i < b; i++) output[cpos + i] = input[mpos + i] ^ x[i];
      }

      this._overflow = b & 63;
    };

    Fallback.prototype.finalize = function () {
      this._s.fill(0);
      this._z.fill(0);
    };

    // below methods are ported from tweet nacl

    function core_salsa20(o, p, k, c) {
      var j0  = c[ 0] & 0xff | (c[ 1] & 0xff) << 8 | (c[ 2] & 0xff) << 16 | (c[ 3] & 0xff) << 24,
          j1  = k[ 0] & 0xff | (k[ 1] & 0xff) << 8 | (k[ 2] & 0xff) << 16 | (k[ 3] & 0xff) << 24,
          j2  = k[ 4] & 0xff | (k[ 5] & 0xff) << 8 | (k[ 6] & 0xff) << 16 | (k[ 7] & 0xff) << 24,
          j3  = k[ 8] & 0xff | (k[ 9] & 0xff) << 8 | (k[10] & 0xff) << 16 | (k[11] & 0xff) << 24,
          j4  = k[12] & 0xff | (k[13] & 0xff) << 8 | (k[14] & 0xff) << 16 | (k[15] & 0xff) << 24,
          j5  = c[ 4] & 0xff | (c[ 5] & 0xff) << 8 | (c[ 6] & 0xff) << 16 | (c[ 7] & 0xff) << 24,
          j6  = p[ 0] & 0xff | (p[ 1] & 0xff) << 8 | (p[ 2] & 0xff) << 16 | (p[ 3] & 0xff) << 24,
          j7  = p[ 4] & 0xff | (p[ 5] & 0xff) << 8 | (p[ 6] & 0xff) << 16 | (p[ 7] & 0xff) << 24,
          j8  = p[ 8] & 0xff | (p[ 9] & 0xff) << 8 | (p[10] & 0xff) << 16 | (p[11] & 0xff) << 24,
          j9  = p[12] & 0xff | (p[13] & 0xff) << 8 | (p[14] & 0xff) << 16 | (p[15] & 0xff) << 24,
          j10 = c[ 8] & 0xff | (c[ 9] & 0xff) << 8 | (c[10] & 0xff) << 16 | (c[11] & 0xff) << 24,
          j11 = k[16] & 0xff | (k[17] & 0xff) << 8 | (k[18] & 0xff) << 16 | (k[19] & 0xff) << 24,
          j12 = k[20] & 0xff | (k[21] & 0xff) << 8 | (k[22] & 0xff) << 16 | (k[23] & 0xff) << 24,
          j13 = k[24] & 0xff | (k[25] & 0xff) << 8 | (k[26] & 0xff) << 16 | (k[27] & 0xff) << 24,
          j14 = k[28] & 0xff | (k[29] & 0xff) << 8 | (k[30] & 0xff) << 16 | (k[31] & 0xff) << 24,
          j15 = c[12] & 0xff | (c[13] & 0xff) << 8 | (c[14] & 0xff) << 16 | (c[15] & 0xff) << 24;

      var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
          x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
          x15 = j15, u;

      for (var i = 0; i < 20; i += 2) {
        u = x0 + x12 | 0;
        x4 ^= u << 7 | u >>> 25;
        u = x4 + x0 | 0;
        x8 ^= u << 9 | u >>> 23;
        u = x8 + x4 | 0;
        x12 ^= u << 13 | u >>> 19;
        u = x12 + x8 | 0;
        x0 ^= u << 18 | u >>> 14;

        u = x5 + x1 | 0;
        x9 ^= u << 7 | u >>> 25;
        u = x9 + x5 | 0;
        x13 ^= u << 9 | u >>> 23;
        u = x13 + x9 | 0;
        x1 ^= u << 13 | u >>> 19;
        u = x1 + x13 | 0;
        x5 ^= u << 18 | u >>> 14;

        u = x10 + x6 | 0;
        x14 ^= u << 7 | u >>> 25;
        u = x14 + x10 | 0;
        x2 ^= u << 9 | u >>> 23;
        u = x2 + x14 | 0;
        x6 ^= u << 13 | u >>> 19;
        u = x6 + x2 | 0;
        x10 ^= u << 18 | u >>> 14;

        u = x15 + x11 | 0;
        x3 ^= u << 7 | u >>> 25;
        u = x3 + x15 | 0;
        x7 ^= u << 9 | u >>> 23;
        u = x7 + x3 | 0;
        x11 ^= u << 13 | u >>> 19;
        u = x11 + x7 | 0;
        x15 ^= u << 18 | u >>> 14;

        u = x0 + x3 | 0;
        x1 ^= u << 7 | u >>> 25;
        u = x1 + x0 | 0;
        x2 ^= u << 9 | u >>> 23;
        u = x2 + x1 | 0;
        x3 ^= u << 13 | u >>> 19;
        u = x3 + x2 | 0;
        x0 ^= u << 18 | u >>> 14;

        u = x5 + x4 | 0;
        x6 ^= u << 7 | u >>> 25;
        u = x6 + x5 | 0;
        x7 ^= u << 9 | u >>> 23;
        u = x7 + x6 | 0;
        x4 ^= u << 13 | u >>> 19;
        u = x4 + x7 | 0;
        x5 ^= u << 18 | u >>> 14;

        u = x10 + x9 | 0;
        x11 ^= u << 7 | u >>> 25;
        u = x11 + x10 | 0;
        x8 ^= u << 9 | u >>> 23;
        u = x8 + x11 | 0;
        x9 ^= u << 13 | u >>> 19;
        u = x9 + x8 | 0;
        x10 ^= u << 18 | u >>> 14;

        u = x15 + x14 | 0;
        x12 ^= u << 7 | u >>> 25;
        u = x12 + x15 | 0;
        x13 ^= u << 9 | u >>> 23;
        u = x13 + x12 | 0;
        x14 ^= u << 13 | u >>> 19;
        u = x14 + x13 | 0;
        x15 ^= u << 18 | u >>> 14;
      }
       x0 =  x0 +  j0 | 0;
       x1 =  x1 +  j1 | 0;
       x2 =  x2 +  j2 | 0;
       x3 =  x3 +  j3 | 0;
       x4 =  x4 +  j4 | 0;
       x5 =  x5 +  j5 | 0;
       x6 =  x6 +  j6 | 0;
       x7 =  x7 +  j7 | 0;
       x8 =  x8 +  j8 | 0;
       x9 =  x9 +  j9 | 0;
      x10 = x10 + j10 | 0;
      x11 = x11 + j11 | 0;
      x12 = x12 + j12 | 0;
      x13 = x13 + j13 | 0;
      x14 = x14 + j14 | 0;
      x15 = x15 + j15 | 0;

      o[ 0] = x0 >>>  0 & 0xff;
      o[ 1] = x0 >>>  8 & 0xff;
      o[ 2] = x0 >>> 16 & 0xff;
      o[ 3] = x0 >>> 24 & 0xff;

      o[ 4] = x1 >>>  0 & 0xff;
      o[ 5] = x1 >>>  8 & 0xff;
      o[ 6] = x1 >>> 16 & 0xff;
      o[ 7] = x1 >>> 24 & 0xff;

      o[ 8] = x2 >>>  0 & 0xff;
      o[ 9] = x2 >>>  8 & 0xff;
      o[10] = x2 >>> 16 & 0xff;
      o[11] = x2 >>> 24 & 0xff;

      o[12] = x3 >>>  0 & 0xff;
      o[13] = x3 >>>  8 & 0xff;
      o[14] = x3 >>> 16 & 0xff;
      o[15] = x3 >>> 24 & 0xff;

      o[16] = x4 >>>  0 & 0xff;
      o[17] = x4 >>>  8 & 0xff;
      o[18] = x4 >>> 16 & 0xff;
      o[19] = x4 >>> 24 & 0xff;

      o[20] = x5 >>>  0 & 0xff;
      o[21] = x5 >>>  8 & 0xff;
      o[22] = x5 >>> 16 & 0xff;
      o[23] = x5 >>> 24 & 0xff;

      o[24] = x6 >>>  0 & 0xff;
      o[25] = x6 >>>  8 & 0xff;
      o[26] = x6 >>> 16 & 0xff;
      o[27] = x6 >>> 24 & 0xff;

      o[28] = x7 >>>  0 & 0xff;
      o[29] = x7 >>>  8 & 0xff;
      o[30] = x7 >>> 16 & 0xff;
      o[31] = x7 >>> 24 & 0xff;

      o[32] = x8 >>>  0 & 0xff;
      o[33] = x8 >>>  8 & 0xff;
      o[34] = x8 >>> 16 & 0xff;
      o[35] = x8 >>> 24 & 0xff;

      o[36] = x9 >>>  0 & 0xff;
      o[37] = x9 >>>  8 & 0xff;
      o[38] = x9 >>> 16 & 0xff;
      o[39] = x9 >>> 24 & 0xff;

      o[40] = x10 >>>  0 & 0xff;
      o[41] = x10 >>>  8 & 0xff;
      o[42] = x10 >>> 16 & 0xff;
      o[43] = x10 >>> 24 & 0xff;

      o[44] = x11 >>>  0 & 0xff;
      o[45] = x11 >>>  8 & 0xff;
      o[46] = x11 >>> 16 & 0xff;
      o[47] = x11 >>> 24 & 0xff;

      o[48] = x12 >>>  0 & 0xff;
      o[49] = x12 >>>  8 & 0xff;
      o[50] = x12 >>> 16 & 0xff;
      o[51] = x12 >>> 24 & 0xff;

      o[52] = x13 >>>  0 & 0xff;
      o[53] = x13 >>>  8 & 0xff;
      o[54] = x13 >>> 16 & 0xff;
      o[55] = x13 >>> 24 & 0xff;

      o[56] = x14 >>>  0 & 0xff;
      o[57] = x14 >>>  8 & 0xff;
      o[58] = x14 >>> 16 & 0xff;
      o[59] = x14 >>> 24 & 0xff;

      o[60] = x15 >>>  0 & 0xff;
      o[61] = x15 >>>  8 & 0xff;
      o[62] = x15 >>> 16 & 0xff;
      o[63] = x15 >>> 24 & 0xff;
    }

    function core_hsalsa20(o,p,k,c) {
      var j0  = c[ 0] & 0xff | (c[ 1] & 0xff) << 8 | (c[ 2] & 0xff) << 16 | (c[ 3] & 0xff) << 24,
          j1  = k[ 0] & 0xff | (k[ 1] & 0xff) << 8 | (k[ 2] & 0xff) << 16 | (k[ 3] & 0xff) << 24,
          j2  = k[ 4] & 0xff | (k[ 5] & 0xff) << 8 | (k[ 6] & 0xff) << 16 | (k[ 7] & 0xff) << 24,
          j3  = k[ 8] & 0xff | (k[ 9] & 0xff) << 8 | (k[10] & 0xff) << 16 | (k[11] & 0xff) << 24,
          j4  = k[12] & 0xff | (k[13] & 0xff) << 8 | (k[14] & 0xff) << 16 | (k[15] & 0xff) << 24,
          j5  = c[ 4] & 0xff | (c[ 5] & 0xff) << 8 | (c[ 6] & 0xff) << 16 | (c[ 7] & 0xff) << 24,
          j6  = p[ 0] & 0xff | (p[ 1] & 0xff) << 8 | (p[ 2] & 0xff) << 16 | (p[ 3] & 0xff) << 24,
          j7  = p[ 4] & 0xff | (p[ 5] & 0xff) << 8 | (p[ 6] & 0xff) << 16 | (p[ 7] & 0xff) << 24,
          j8  = p[ 8] & 0xff | (p[ 9] & 0xff) << 8 | (p[10] & 0xff) << 16 | (p[11] & 0xff) << 24,
          j9  = p[12] & 0xff | (p[13] & 0xff) << 8 | (p[14] & 0xff) << 16 | (p[15] & 0xff) << 24,
          j10 = c[ 8] & 0xff | (c[ 9] & 0xff) << 8 | (c[10] & 0xff) << 16 | (c[11] & 0xff) << 24,
          j11 = k[16] & 0xff | (k[17] & 0xff) << 8 | (k[18] & 0xff) << 16 | (k[19] & 0xff) << 24,
          j12 = k[20] & 0xff | (k[21] & 0xff) << 8 | (k[22] & 0xff) << 16 | (k[23] & 0xff) << 24,
          j13 = k[24] & 0xff | (k[25] & 0xff) << 8 | (k[26] & 0xff) << 16 | (k[27] & 0xff) << 24,
          j14 = k[28] & 0xff | (k[29] & 0xff) << 8 | (k[30] & 0xff) << 16 | (k[31] & 0xff) << 24,
          j15 = c[12] & 0xff | (c[13] & 0xff) << 8 | (c[14] & 0xff) << 16 | (c[15] & 0xff) << 24;

      var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7,
          x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14,
          x15 = j15, u;

      for (var i = 0; i < 20; i += 2) {
        u = x0 + x12 | 0;
        x4 ^= u << 7 | u >>> 25;
        u = x4 + x0 | 0;
        x8 ^= u << 9 | u >>> 23;
        u = x8 + x4 | 0;
        x12 ^= u << 13 | u >>> 19;
        u = x12 + x8 | 0;
        x0 ^= u << 18 | u >>> 14;

        u = x5 + x1 | 0;
        x9 ^= u << 7 | u >>> 25;
        u = x9 + x5 | 0;
        x13 ^= u << 9 | u >>> 23;
        u = x13 + x9 | 0;
        x1 ^= u << 13 | u >>> 19;
        u = x1 + x13 | 0;
        x5 ^= u << 18 | u >>> 14;

        u = x10 + x6 | 0;
        x14 ^= u << 7 | u >>> 25;
        u = x14 + x10 | 0;
        x2 ^= u << 9 | u >>> 23;
        u = x2 + x14 | 0;
        x6 ^= u << 13 | u >>> 19;
        u = x6 + x2 | 0;
        x10 ^= u << 18 | u >>> 14;

        u = x15 + x11 | 0;
        x3 ^= u << 7 | u >>> 25;
        u = x3 + x15 | 0;
        x7 ^= u << 9 | u >>> 23;
        u = x7 + x3 | 0;
        x11 ^= u << 13 | u >>> 19;
        u = x11 + x7 | 0;
        x15 ^= u << 18 | u >>> 14;

        u = x0 + x3 | 0;
        x1 ^= u << 7 | u >>> 25;
        u = x1 + x0 | 0;
        x2 ^= u << 9 | u >>> 23;
        u = x2 + x1 | 0;
        x3 ^= u << 13 | u >>> 19;
        u = x3 + x2 | 0;
        x0 ^= u << 18 | u >>> 14;

        u = x5 + x4 | 0;
        x6 ^= u << 7 | u >>> 25;
        u = x6 + x5 | 0;
        x7 ^= u << 9 | u >>> 23;
        u = x7 + x6 | 0;
        x4 ^= u << 13 | u >>> 19;
        u = x4 + x7 | 0;
        x5 ^= u << 18 | u >>> 14;

        u = x10 + x9 | 0;
        x11 ^= u << 7 | u >>> 25;
        u = x11 + x10 | 0;
        x8 ^= u << 9 | u >>> 23;
        u = x8 + x11 | 0;
        x9 ^= u << 13 | u >>> 19;
        u = x9 + x8 | 0;
        x10 ^= u << 18 | u >>> 14;

        u = x15 + x14 | 0;
        x12 ^= u << 7 | u >>> 25;
        u = x12 + x15 | 0;
        x13 ^= u << 9 | u >>> 23;
        u = x13 + x12 | 0;
        x14 ^= u << 13 | u >>> 19;
        u = x14 + x13 | 0;
        x15 ^= u << 18 | u >>> 14;
      }

      o[ 0] = x0 >>>  0 & 0xff;
      o[ 1] = x0 >>>  8 & 0xff;
      o[ 2] = x0 >>> 16 & 0xff;
      o[ 3] = x0 >>> 24 & 0xff;

      o[ 4] = x5 >>>  0 & 0xff;
      o[ 5] = x5 >>>  8 & 0xff;
      o[ 6] = x5 >>> 16 & 0xff;
      o[ 7] = x5 >>> 24 & 0xff;

      o[ 8] = x10 >>>  0 & 0xff;
      o[ 9] = x10 >>>  8 & 0xff;
      o[10] = x10 >>> 16 & 0xff;
      o[11] = x10 >>> 24 & 0xff;

      o[12] = x15 >>>  0 & 0xff;
      o[13] = x15 >>>  8 & 0xff;
      o[14] = x15 >>> 16 & 0xff;
      o[15] = x15 >>> 24 & 0xff;

      o[16] = x6 >>>  0 & 0xff;
      o[17] = x6 >>>  8 & 0xff;
      o[18] = x6 >>> 16 & 0xff;
      o[19] = x6 >>> 24 & 0xff;

      o[20] = x7 >>>  0 & 0xff;
      o[21] = x7 >>>  8 & 0xff;
      o[22] = x7 >>> 16 & 0xff;
      o[23] = x7 >>> 24 & 0xff;

      o[24] = x8 >>>  0 & 0xff;
      o[25] = x8 >>>  8 & 0xff;
      o[26] = x8 >>> 16 & 0xff;
      o[27] = x8 >>> 24 & 0xff;

      o[28] = x9 >>>  0 & 0xff;
      o[29] = x9 >>>  8 & 0xff;
      o[30] = x9 >>> 16 & 0xff;
      o[31] = x9 >>> 24 & 0xff;
    }

    var crypto_stream = createCommonjsModule(function (module, exports) {
    exports.crypto_stream_KEYBYTES = 32;
    exports.crypto_stream_NONCEBYTES = 24;
    exports.crypto_stream_PRIMITIVE = 'xsalsa20';

    exports.crypto_stream = function (out, nonce, key) {
      out.fill(0);
      exports.crypto_stream_xor(out, out, nonce, key);
    };

    exports.crypto_stream_xor = function (out, inp, nonce, key) {
      var xor = xsalsa20_1(nonce, key);
      xor.update(inp, out);
      xor.final();
    };

    exports.crypto_stream_xor_instance = function (nonce, key) {
      return new XOR(nonce, key)
    };

    function XOR (nonce, key) {
      this._instance = xsalsa20_1(nonce, key);
    }

    XOR.prototype.update = function (out, inp) {
      this._instance.update(inp, out);
    };

    XOR.prototype.final = function () {
      this._instance.finalize();
      this._instance = null;
    };
    });
    var crypto_stream_1 = crypto_stream.crypto_stream_KEYBYTES;
    var crypto_stream_2 = crypto_stream.crypto_stream_NONCEBYTES;
    var crypto_stream_3 = crypto_stream.crypto_stream_PRIMITIVE;
    var crypto_stream_4 = crypto_stream.crypto_stream;
    var crypto_stream_5 = crypto_stream.crypto_stream_xor;
    var crypto_stream_6 = crypto_stream.crypto_stream_xor_instance;

    assert.notEqual = notEqual;
    assert.notOk = notOk;
    assert.equal = equal;
    assert.ok = assert;

    var nanoassert = assert;

    function equal (a, b, m) {
      assert(a == b, m); // eslint-disable-line eqeqeq
    }

    function notEqual (a, b, m) {
      assert(a != b, m); // eslint-disable-line eqeqeq
    }

    function notOk (t, m) {
      assert(!t, m);
    }

    function assert (t, m) {
      if (!t) throw new Error(m || 'AssertionError')
    }

    var _nodeResolve_empty = {};

    var _nodeResolve_empty$1 = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': _nodeResolve_empty
    });

    var require$$0 = getCjsExportFromNamespace(_nodeResolve_empty$1);

    var randombytes_1 = createCommonjsModule(function (module) {
    var randombytes = (function () {
      var QUOTA = 65536; // limit for QuotaExceededException
      var crypto = typeof commonjsGlobal !== 'undefined' ? crypto = (commonjsGlobal.crypto || commonjsGlobal.msCrypto) : null;

      function browserBytes (out, n) {
        for (var i = 0; i < n; i += QUOTA) {
          crypto.getRandomValues(out.subarray(i, i + Math.min(n - i, QUOTA)));
        }
      }

      function nodeBytes (out, n) {
        out.set(crypto.randomBytes(n));
      }

      function noImpl () {
        throw new Error('No secure random number generator available')
      }

      if (crypto && crypto.getRandomValues) {
        return browserBytes
      } else if (typeof commonjsRequire !== 'undefined') {
        // Node.js.
        crypto = require$$0;
        if (crypto && crypto.randomBytes) {
          return nodeBytes
        }
      }

      return noImpl
    })();

    Object.defineProperty(module.exports, 'randombytes', {
      value: randombytes
    });

    module.exports.randombytes_buf = function (out) {
      nanoassert(out, 'out must be given');
      randombytes(out, out.length);
    };
    });
    var randombytes_2 = randombytes_1.randombytes_buf;

    var blake2b = loadWebAssembly$1;

    loadWebAssembly$1.supported = typeof WebAssembly !== 'undefined';

    function loadWebAssembly$1 (opts) {
      if (!loadWebAssembly$1.supported) return null

      var imp = opts && opts.imports;
      var wasm = toUint8Array$1('AGFzbQEAAAABEANgAn9/AGADf39/AGABfwADBQQAAQICBQUBAQroBwdNBQZtZW1vcnkCAAxibGFrZTJiX2luaXQAAA5ibGFrZTJiX3VwZGF0ZQABDWJsYWtlMmJfZmluYWwAAhBibGFrZTJiX2NvbXByZXNzAAMK00AElgMAIABCADcDACAAQQhqQgA3AwAgAEEQakIANwMAIABBGGpCADcDACAAQSBqQgA3AwAgAEEoakIANwMAIABBMGpCADcDACAAQThqQgA3AwAgAEHAAGpCADcDACAAQcgAakIANwMAIABB0ABqQgA3AwAgAEHYAGpCADcDACAAQeAAakIANwMAIABB6ABqQgA3AwAgAEHwAGpCADcDACAAQfgAakIANwMAIABBgAFqQoiS853/zPmE6gBBACkDAIU3AwAgAEGIAWpCu86qptjQ67O7f0EIKQMAhTcDACAAQZABakKr8NP0r+68tzxBECkDAIU3AwAgAEGYAWpC8e30+KWn/aelf0EYKQMAhTcDACAAQaABakLRhZrv+s+Uh9EAQSApAwCFNwMAIABBqAFqQp/Y+dnCkdqCm39BKCkDAIU3AwAgAEGwAWpC6/qG2r+19sEfQTApAwCFNwMAIABBuAFqQvnC+JuRo7Pw2wBBOCkDAIU3AwAgAEHAAWpCADcDACAAQcgBakIANwMAIABB0AFqQgA3AwALbQEDfyAAQcABaiEDIABByAFqIQQgBCkDAKchBQJAA0AgASACRg0BIAVBgAFGBEAgAyADKQMAIAWtfDcDAEEAIQUgABADCyAAIAVqIAEtAAA6AAAgBUEBaiEFIAFBAWohAQwACwsgBCAFrTcDAAtkAQN/IABBwAFqIQEgAEHIAWohAiABIAEpAwAgAikDAHw3AwAgAEHQAWpCfzcDACACKQMApyEDAkADQCADQYABRg0BIAAgA2pBADoAACADQQFqIQMMAAsLIAIgA603AwAgABADC+U7AiB+CX8gAEGAAWohISAAQYgBaiEiIABBkAFqISMgAEGYAWohJCAAQaABaiElIABBqAFqISYgAEGwAWohJyAAQbgBaiEoICEpAwAhASAiKQMAIQIgIykDACEDICQpAwAhBCAlKQMAIQUgJikDACEGICcpAwAhByAoKQMAIQhCiJLznf/M+YTqACEJQrvOqqbY0Ouzu38hCkKr8NP0r+68tzwhC0Lx7fT4paf9p6V/IQxC0YWa7/rPlIfRACENQp/Y+dnCkdqCm38hDkLr+obav7X2wR8hD0L5wvibkaOz8NsAIRAgACkDACERIABBCGopAwAhEiAAQRBqKQMAIRMgAEEYaikDACEUIABBIGopAwAhFSAAQShqKQMAIRYgAEEwaikDACEXIABBOGopAwAhGCAAQcAAaikDACEZIABByABqKQMAIRogAEHQAGopAwAhGyAAQdgAaikDACEcIABB4ABqKQMAIR0gAEHoAGopAwAhHiAAQfAAaikDACEfIABB+ABqKQMAISAgDSAAQcABaikDAIUhDSAPIABB0AFqKQMAhSEPIAEgBSARfHwhASANIAGFQiCKIQ0gCSANfCEJIAUgCYVCGIohBSABIAUgEnx8IQEgDSABhUIQiiENIAkgDXwhCSAFIAmFQj+KIQUgAiAGIBN8fCECIA4gAoVCIIohDiAKIA58IQogBiAKhUIYiiEGIAIgBiAUfHwhAiAOIAKFQhCKIQ4gCiAOfCEKIAYgCoVCP4ohBiADIAcgFXx8IQMgDyADhUIgiiEPIAsgD3whCyAHIAuFQhiKIQcgAyAHIBZ8fCEDIA8gA4VCEIohDyALIA98IQsgByALhUI/iiEHIAQgCCAXfHwhBCAQIASFQiCKIRAgDCAQfCEMIAggDIVCGIohCCAEIAggGHx8IQQgECAEhUIQiiEQIAwgEHwhDCAIIAyFQj+KIQggASAGIBl8fCEBIBAgAYVCIIohECALIBB8IQsgBiALhUIYiiEGIAEgBiAafHwhASAQIAGFQhCKIRAgCyAQfCELIAYgC4VCP4ohBiACIAcgG3x8IQIgDSAChUIgiiENIAwgDXwhDCAHIAyFQhiKIQcgAiAHIBx8fCECIA0gAoVCEIohDSAMIA18IQwgByAMhUI/iiEHIAMgCCAdfHwhAyAOIAOFQiCKIQ4gCSAOfCEJIAggCYVCGIohCCADIAggHnx8IQMgDiADhUIQiiEOIAkgDnwhCSAIIAmFQj+KIQggBCAFIB98fCEEIA8gBIVCIIohDyAKIA98IQogBSAKhUIYiiEFIAQgBSAgfHwhBCAPIASFQhCKIQ8gCiAPfCEKIAUgCoVCP4ohBSABIAUgH3x8IQEgDSABhUIgiiENIAkgDXwhCSAFIAmFQhiKIQUgASAFIBt8fCEBIA0gAYVCEIohDSAJIA18IQkgBSAJhUI/iiEFIAIgBiAVfHwhAiAOIAKFQiCKIQ4gCiAOfCEKIAYgCoVCGIohBiACIAYgGXx8IQIgDiAChUIQiiEOIAogDnwhCiAGIAqFQj+KIQYgAyAHIBp8fCEDIA8gA4VCIIohDyALIA98IQsgByALhUIYiiEHIAMgByAgfHwhAyAPIAOFQhCKIQ8gCyAPfCELIAcgC4VCP4ohByAEIAggHnx8IQQgECAEhUIgiiEQIAwgEHwhDCAIIAyFQhiKIQggBCAIIBd8fCEEIBAgBIVCEIohECAMIBB8IQwgCCAMhUI/iiEIIAEgBiASfHwhASAQIAGFQiCKIRAgCyAQfCELIAYgC4VCGIohBiABIAYgHXx8IQEgECABhUIQiiEQIAsgEHwhCyAGIAuFQj+KIQYgAiAHIBF8fCECIA0gAoVCIIohDSAMIA18IQwgByAMhUIYiiEHIAIgByATfHwhAiANIAKFQhCKIQ0gDCANfCEMIAcgDIVCP4ohByADIAggHHx8IQMgDiADhUIgiiEOIAkgDnwhCSAIIAmFQhiKIQggAyAIIBh8fCEDIA4gA4VCEIohDiAJIA58IQkgCCAJhUI/iiEIIAQgBSAWfHwhBCAPIASFQiCKIQ8gCiAPfCEKIAUgCoVCGIohBSAEIAUgFHx8IQQgDyAEhUIQiiEPIAogD3whCiAFIAqFQj+KIQUgASAFIBx8fCEBIA0gAYVCIIohDSAJIA18IQkgBSAJhUIYiiEFIAEgBSAZfHwhASANIAGFQhCKIQ0gCSANfCEJIAUgCYVCP4ohBSACIAYgHXx8IQIgDiAChUIgiiEOIAogDnwhCiAGIAqFQhiKIQYgAiAGIBF8fCECIA4gAoVCEIohDiAKIA58IQogBiAKhUI/iiEGIAMgByAWfHwhAyAPIAOFQiCKIQ8gCyAPfCELIAcgC4VCGIohByADIAcgE3x8IQMgDyADhUIQiiEPIAsgD3whCyAHIAuFQj+KIQcgBCAIICB8fCEEIBAgBIVCIIohECAMIBB8IQwgCCAMhUIYiiEIIAQgCCAefHwhBCAQIASFQhCKIRAgDCAQfCEMIAggDIVCP4ohCCABIAYgG3x8IQEgECABhUIgiiEQIAsgEHwhCyAGIAuFQhiKIQYgASAGIB98fCEBIBAgAYVCEIohECALIBB8IQsgBiALhUI/iiEGIAIgByAUfHwhAiANIAKFQiCKIQ0gDCANfCEMIAcgDIVCGIohByACIAcgF3x8IQIgDSAChUIQiiENIAwgDXwhDCAHIAyFQj+KIQcgAyAIIBh8fCEDIA4gA4VCIIohDiAJIA58IQkgCCAJhUIYiiEIIAMgCCASfHwhAyAOIAOFQhCKIQ4gCSAOfCEJIAggCYVCP4ohCCAEIAUgGnx8IQQgDyAEhUIgiiEPIAogD3whCiAFIAqFQhiKIQUgBCAFIBV8fCEEIA8gBIVCEIohDyAKIA98IQogBSAKhUI/iiEFIAEgBSAYfHwhASANIAGFQiCKIQ0gCSANfCEJIAUgCYVCGIohBSABIAUgGnx8IQEgDSABhUIQiiENIAkgDXwhCSAFIAmFQj+KIQUgAiAGIBR8fCECIA4gAoVCIIohDiAKIA58IQogBiAKhUIYiiEGIAIgBiASfHwhAiAOIAKFQhCKIQ4gCiAOfCEKIAYgCoVCP4ohBiADIAcgHnx8IQMgDyADhUIgiiEPIAsgD3whCyAHIAuFQhiKIQcgAyAHIB18fCEDIA8gA4VCEIohDyALIA98IQsgByALhUI/iiEHIAQgCCAcfHwhBCAQIASFQiCKIRAgDCAQfCEMIAggDIVCGIohCCAEIAggH3x8IQQgECAEhUIQiiEQIAwgEHwhDCAIIAyFQj+KIQggASAGIBN8fCEBIBAgAYVCIIohECALIBB8IQsgBiALhUIYiiEGIAEgBiAXfHwhASAQIAGFQhCKIRAgCyAQfCELIAYgC4VCP4ohBiACIAcgFnx8IQIgDSAChUIgiiENIAwgDXwhDCAHIAyFQhiKIQcgAiAHIBt8fCECIA0gAoVCEIohDSAMIA18IQwgByAMhUI/iiEHIAMgCCAVfHwhAyAOIAOFQiCKIQ4gCSAOfCEJIAggCYVCGIohCCADIAggEXx8IQMgDiADhUIQiiEOIAkgDnwhCSAIIAmFQj+KIQggBCAFICB8fCEEIA8gBIVCIIohDyAKIA98IQogBSAKhUIYiiEFIAQgBSAZfHwhBCAPIASFQhCKIQ8gCiAPfCEKIAUgCoVCP4ohBSABIAUgGnx8IQEgDSABhUIgiiENIAkgDXwhCSAFIAmFQhiKIQUgASAFIBF8fCEBIA0gAYVCEIohDSAJIA18IQkgBSAJhUI/iiEFIAIgBiAWfHwhAiAOIAKFQiCKIQ4gCiAOfCEKIAYgCoVCGIohBiACIAYgGHx8IQIgDiAChUIQiiEOIAogDnwhCiAGIAqFQj+KIQYgAyAHIBN8fCEDIA8gA4VCIIohDyALIA98IQsgByALhUIYiiEHIAMgByAVfHwhAyAPIAOFQhCKIQ8gCyAPfCELIAcgC4VCP4ohByAEIAggG3x8IQQgECAEhUIgiiEQIAwgEHwhDCAIIAyFQhiKIQggBCAIICB8fCEEIBAgBIVCEIohECAMIBB8IQwgCCAMhUI/iiEIIAEgBiAffHwhASAQIAGFQiCKIRAgCyAQfCELIAYgC4VCGIohBiABIAYgEnx8IQEgECABhUIQiiEQIAsgEHwhCyAGIAuFQj+KIQYgAiAHIBx8fCECIA0gAoVCIIohDSAMIA18IQwgByAMhUIYiiEHIAIgByAdfHwhAiANIAKFQhCKIQ0gDCANfCEMIAcgDIVCP4ohByADIAggF3x8IQMgDiADhUIgiiEOIAkgDnwhCSAIIAmFQhiKIQggAyAIIBl8fCEDIA4gA4VCEIohDiAJIA58IQkgCCAJhUI/iiEIIAQgBSAUfHwhBCAPIASFQiCKIQ8gCiAPfCEKIAUgCoVCGIohBSAEIAUgHnx8IQQgDyAEhUIQiiEPIAogD3whCiAFIAqFQj+KIQUgASAFIBN8fCEBIA0gAYVCIIohDSAJIA18IQkgBSAJhUIYiiEFIAEgBSAdfHwhASANIAGFQhCKIQ0gCSANfCEJIAUgCYVCP4ohBSACIAYgF3x8IQIgDiAChUIgiiEOIAogDnwhCiAGIAqFQhiKIQYgAiAGIBt8fCECIA4gAoVCEIohDiAKIA58IQogBiAKhUI/iiEGIAMgByARfHwhAyAPIAOFQiCKIQ8gCyAPfCELIAcgC4VCGIohByADIAcgHHx8IQMgDyADhUIQiiEPIAsgD3whCyAHIAuFQj+KIQcgBCAIIBl8fCEEIBAgBIVCIIohECAMIBB8IQwgCCAMhUIYiiEIIAQgCCAUfHwhBCAQIASFQhCKIRAgDCAQfCEMIAggDIVCP4ohCCABIAYgFXx8IQEgECABhUIgiiEQIAsgEHwhCyAGIAuFQhiKIQYgASAGIB58fCEBIBAgAYVCEIohECALIBB8IQsgBiALhUI/iiEGIAIgByAYfHwhAiANIAKFQiCKIQ0gDCANfCEMIAcgDIVCGIohByACIAcgFnx8IQIgDSAChUIQiiENIAwgDXwhDCAHIAyFQj+KIQcgAyAIICB8fCEDIA4gA4VCIIohDiAJIA58IQkgCCAJhUIYiiEIIAMgCCAffHwhAyAOIAOFQhCKIQ4gCSAOfCEJIAggCYVCP4ohCCAEIAUgEnx8IQQgDyAEhUIgiiEPIAogD3whCiAFIAqFQhiKIQUgBCAFIBp8fCEEIA8gBIVCEIohDyAKIA98IQogBSAKhUI/iiEFIAEgBSAdfHwhASANIAGFQiCKIQ0gCSANfCEJIAUgCYVCGIohBSABIAUgFnx8IQEgDSABhUIQiiENIAkgDXwhCSAFIAmFQj+KIQUgAiAGIBJ8fCECIA4gAoVCIIohDiAKIA58IQogBiAKhUIYiiEGIAIgBiAgfHwhAiAOIAKFQhCKIQ4gCiAOfCEKIAYgCoVCP4ohBiADIAcgH3x8IQMgDyADhUIgiiEPIAsgD3whCyAHIAuFQhiKIQcgAyAHIB58fCEDIA8gA4VCEIohDyALIA98IQsgByALhUI/iiEHIAQgCCAVfHwhBCAQIASFQiCKIRAgDCAQfCEMIAggDIVCGIohCCAEIAggG3x8IQQgECAEhUIQiiEQIAwgEHwhDCAIIAyFQj+KIQggASAGIBF8fCEBIBAgAYVCIIohECALIBB8IQsgBiALhUIYiiEGIAEgBiAYfHwhASAQIAGFQhCKIRAgCyAQfCELIAYgC4VCP4ohBiACIAcgF3x8IQIgDSAChUIgiiENIAwgDXwhDCAHIAyFQhiKIQcgAiAHIBR8fCECIA0gAoVCEIohDSAMIA18IQwgByAMhUI/iiEHIAMgCCAafHwhAyAOIAOFQiCKIQ4gCSAOfCEJIAggCYVCGIohCCADIAggE3x8IQMgDiADhUIQiiEOIAkgDnwhCSAIIAmFQj+KIQggBCAFIBl8fCEEIA8gBIVCIIohDyAKIA98IQogBSAKhUIYiiEFIAQgBSAcfHwhBCAPIASFQhCKIQ8gCiAPfCEKIAUgCoVCP4ohBSABIAUgHnx8IQEgDSABhUIgiiENIAkgDXwhCSAFIAmFQhiKIQUgASAFIBx8fCEBIA0gAYVCEIohDSAJIA18IQkgBSAJhUI/iiEFIAIgBiAYfHwhAiAOIAKFQiCKIQ4gCiAOfCEKIAYgCoVCGIohBiACIAYgH3x8IQIgDiAChUIQiiEOIAogDnwhCiAGIAqFQj+KIQYgAyAHIB18fCEDIA8gA4VCIIohDyALIA98IQsgByALhUIYiiEHIAMgByASfHwhAyAPIAOFQhCKIQ8gCyAPfCELIAcgC4VCP4ohByAEIAggFHx8IQQgECAEhUIgiiEQIAwgEHwhDCAIIAyFQhiKIQggBCAIIBp8fCEEIBAgBIVCEIohECAMIBB8IQwgCCAMhUI/iiEIIAEgBiAWfHwhASAQIAGFQiCKIRAgCyAQfCELIAYgC4VCGIohBiABIAYgEXx8IQEgECABhUIQiiEQIAsgEHwhCyAGIAuFQj+KIQYgAiAHICB8fCECIA0gAoVCIIohDSAMIA18IQwgByAMhUIYiiEHIAIgByAVfHwhAiANIAKFQhCKIQ0gDCANfCEMIAcgDIVCP4ohByADIAggGXx8IQMgDiADhUIgiiEOIAkgDnwhCSAIIAmFQhiKIQggAyAIIBd8fCEDIA4gA4VCEIohDiAJIA58IQkgCCAJhUI/iiEIIAQgBSATfHwhBCAPIASFQiCKIQ8gCiAPfCEKIAUgCoVCGIohBSAEIAUgG3x8IQQgDyAEhUIQiiEPIAogD3whCiAFIAqFQj+KIQUgASAFIBd8fCEBIA0gAYVCIIohDSAJIA18IQkgBSAJhUIYiiEFIAEgBSAgfHwhASANIAGFQhCKIQ0gCSANfCEJIAUgCYVCP4ohBSACIAYgH3x8IQIgDiAChUIgiiEOIAogDnwhCiAGIAqFQhiKIQYgAiAGIBp8fCECIA4gAoVCEIohDiAKIA58IQogBiAKhUI/iiEGIAMgByAcfHwhAyAPIAOFQiCKIQ8gCyAPfCELIAcgC4VCGIohByADIAcgFHx8IQMgDyADhUIQiiEPIAsgD3whCyAHIAuFQj+KIQcgBCAIIBF8fCEEIBAgBIVCIIohECAMIBB8IQwgCCAMhUIYiiEIIAQgCCAZfHwhBCAQIASFQhCKIRAgDCAQfCEMIAggDIVCP4ohCCABIAYgHXx8IQEgECABhUIgiiEQIAsgEHwhCyAGIAuFQhiKIQYgASAGIBN8fCEBIBAgAYVCEIohECALIBB8IQsgBiALhUI/iiEGIAIgByAefHwhAiANIAKFQiCKIQ0gDCANfCEMIAcgDIVCGIohByACIAcgGHx8IQIgDSAChUIQiiENIAwgDXwhDCAHIAyFQj+KIQcgAyAIIBJ8fCEDIA4gA4VCIIohDiAJIA58IQkgCCAJhUIYiiEIIAMgCCAVfHwhAyAOIAOFQhCKIQ4gCSAOfCEJIAggCYVCP4ohCCAEIAUgG3x8IQQgDyAEhUIgiiEPIAogD3whCiAFIAqFQhiKIQUgBCAFIBZ8fCEEIA8gBIVCEIohDyAKIA98IQogBSAKhUI/iiEFIAEgBSAbfHwhASANIAGFQiCKIQ0gCSANfCEJIAUgCYVCGIohBSABIAUgE3x8IQEgDSABhUIQiiENIAkgDXwhCSAFIAmFQj+KIQUgAiAGIBl8fCECIA4gAoVCIIohDiAKIA58IQogBiAKhUIYiiEGIAIgBiAVfHwhAiAOIAKFQhCKIQ4gCiAOfCEKIAYgCoVCP4ohBiADIAcgGHx8IQMgDyADhUIgiiEPIAsgD3whCyAHIAuFQhiKIQcgAyAHIBd8fCEDIA8gA4VCEIohDyALIA98IQsgByALhUI/iiEHIAQgCCASfHwhBCAQIASFQiCKIRAgDCAQfCEMIAggDIVCGIohCCAEIAggFnx8IQQgECAEhUIQiiEQIAwgEHwhDCAIIAyFQj+KIQggASAGICB8fCEBIBAgAYVCIIohECALIBB8IQsgBiALhUIYiiEGIAEgBiAcfHwhASAQIAGFQhCKIRAgCyAQfCELIAYgC4VCP4ohBiACIAcgGnx8IQIgDSAChUIgiiENIAwgDXwhDCAHIAyFQhiKIQcgAiAHIB98fCECIA0gAoVCEIohDSAMIA18IQwgByAMhUI/iiEHIAMgCCAUfHwhAyAOIAOFQiCKIQ4gCSAOfCEJIAggCYVCGIohCCADIAggHXx8IQMgDiADhUIQiiEOIAkgDnwhCSAIIAmFQj+KIQggBCAFIB58fCEEIA8gBIVCIIohDyAKIA98IQogBSAKhUIYiiEFIAQgBSARfHwhBCAPIASFQhCKIQ8gCiAPfCEKIAUgCoVCP4ohBSABIAUgEXx8IQEgDSABhUIgiiENIAkgDXwhCSAFIAmFQhiKIQUgASAFIBJ8fCEBIA0gAYVCEIohDSAJIA18IQkgBSAJhUI/iiEFIAIgBiATfHwhAiAOIAKFQiCKIQ4gCiAOfCEKIAYgCoVCGIohBiACIAYgFHx8IQIgDiAChUIQiiEOIAogDnwhCiAGIAqFQj+KIQYgAyAHIBV8fCEDIA8gA4VCIIohDyALIA98IQsgByALhUIYiiEHIAMgByAWfHwhAyAPIAOFQhCKIQ8gCyAPfCELIAcgC4VCP4ohByAEIAggF3x8IQQgECAEhUIgiiEQIAwgEHwhDCAIIAyFQhiKIQggBCAIIBh8fCEEIBAgBIVCEIohECAMIBB8IQwgCCAMhUI/iiEIIAEgBiAZfHwhASAQIAGFQiCKIRAgCyAQfCELIAYgC4VCGIohBiABIAYgGnx8IQEgECABhUIQiiEQIAsgEHwhCyAGIAuFQj+KIQYgAiAHIBt8fCECIA0gAoVCIIohDSAMIA18IQwgByAMhUIYiiEHIAIgByAcfHwhAiANIAKFQhCKIQ0gDCANfCEMIAcgDIVCP4ohByADIAggHXx8IQMgDiADhUIgiiEOIAkgDnwhCSAIIAmFQhiKIQggAyAIIB58fCEDIA4gA4VCEIohDiAJIA58IQkgCCAJhUI/iiEIIAQgBSAffHwhBCAPIASFQiCKIQ8gCiAPfCEKIAUgCoVCGIohBSAEIAUgIHx8IQQgDyAEhUIQiiEPIAogD3whCiAFIAqFQj+KIQUgASAFIB98fCEBIA0gAYVCIIohDSAJIA18IQkgBSAJhUIYiiEFIAEgBSAbfHwhASANIAGFQhCKIQ0gCSANfCEJIAUgCYVCP4ohBSACIAYgFXx8IQIgDiAChUIgiiEOIAogDnwhCiAGIAqFQhiKIQYgAiAGIBl8fCECIA4gAoVCEIohDiAKIA58IQogBiAKhUI/iiEGIAMgByAafHwhAyAPIAOFQiCKIQ8gCyAPfCELIAcgC4VCGIohByADIAcgIHx8IQMgDyADhUIQiiEPIAsgD3whCyAHIAuFQj+KIQcgBCAIIB58fCEEIBAgBIVCIIohECAMIBB8IQwgCCAMhUIYiiEIIAQgCCAXfHwhBCAQIASFQhCKIRAgDCAQfCEMIAggDIVCP4ohCCABIAYgEnx8IQEgECABhUIgiiEQIAsgEHwhCyAGIAuFQhiKIQYgASAGIB18fCEBIBAgAYVCEIohECALIBB8IQsgBiALhUI/iiEGIAIgByARfHwhAiANIAKFQiCKIQ0gDCANfCEMIAcgDIVCGIohByACIAcgE3x8IQIgDSAChUIQiiENIAwgDXwhDCAHIAyFQj+KIQcgAyAIIBx8fCEDIA4gA4VCIIohDiAJIA58IQkgCCAJhUIYiiEIIAMgCCAYfHwhAyAOIAOFQhCKIQ4gCSAOfCEJIAggCYVCP4ohCCAEIAUgFnx8IQQgDyAEhUIgiiEPIAogD3whCiAFIAqFQhiKIQUgBCAFIBR8fCEEIA8gBIVCEIohDyAKIA98IQogBSAKhUI/iiEFICEgISkDACABIAmFhTcDACAiICIpAwAgAiAKhYU3AwAgIyAjKQMAIAMgC4WFNwMAICQgJCkDACAEIAyFhTcDACAlICUpAwAgBSANhYU3AwAgJiAmKQMAIAYgDoWFNwMAICcgJykDACAHIA+FhTcDACAoICgpAwAgCCAQhYU3AwAL');
      var ready = null;

      var mod = {
        buffer: wasm,
        memory: null,
        exports: null,
        realloc: realloc,
        onload: onload
      };

      onload(function () {});

      return mod

      function realloc (size) {
        mod.exports.memory.grow(Math.ceil(Math.abs(size - mod.memory.length) / 65536));
        mod.memory = new Uint8Array(mod.exports.memory.buffer);
      }

      function onload (cb) {
        if (mod.exports) return cb()

        if (ready) {
          ready.then(cb.bind(null, null)).catch(cb);
          return
        }

        try {
          if (opts && opts.async) throw new Error('async')
          setup({instance: new WebAssembly.Instance(new WebAssembly.Module(wasm), imp)});
        } catch (err) {
          ready = WebAssembly.instantiate(wasm, imp).then(setup);
        }

        onload(cb);
      }

      function setup (w) {
        mod.exports = w.instance.exports;
        mod.memory = mod.exports.memory && mod.exports.memory.buffer && new Uint8Array(mod.exports.memory.buffer);
      }
    }

    function toUint8Array$1 (s) {
      if (typeof atob === 'function') return new Uint8Array(atob(s).split('').map(charCodeAt$1))
      return new (commonjsRequire().Buffer)(s, 'base64')
    }

    function charCodeAt$1 (c) {
      return c.charCodeAt(0)
    }

    var blake2bWasm = createCommonjsModule(function (module) {
    var wasm = blake2b();

    var head = 64;
    var freeList = [];

    module.exports = Blake2b;
    var BYTES_MIN = module.exports.BYTES_MIN = 16;
    var BYTES_MAX = module.exports.BYTES_MAX = 64;
    var BYTES = module.exports.BYTES = 32;
    var KEYBYTES_MIN = module.exports.KEYBYTES_MIN = 16;
    var KEYBYTES_MAX = module.exports.KEYBYTES_MAX = 64;
    var KEYBYTES = module.exports.KEYBYTES = 32;
    var SALTBYTES = module.exports.SALTBYTES = 16;
    var PERSONALBYTES = module.exports.PERSONALBYTES = 16;

    function Blake2b (digestLength, key, salt, personal, noAssert) {
      if (!(this instanceof Blake2b)) return new Blake2b(digestLength, key, salt, personal, noAssert)
      if (!(wasm && wasm.exports)) throw new Error('WASM not loaded. Wait for Blake2b.ready(cb)')
      if (!digestLength) digestLength = 32;

      if (noAssert !== true) {
        nanoassert(digestLength >= BYTES_MIN, 'digestLength must be at least ' + BYTES_MIN + ', was given ' + digestLength);
        nanoassert(digestLength <= BYTES_MAX, 'digestLength must be at most ' + BYTES_MAX + ', was given ' + digestLength);
        if (key != null) nanoassert(key.length >= KEYBYTES_MIN, 'key must be at least ' + KEYBYTES_MIN + ', was given ' + key.length);
        if (key != null) nanoassert(key.length <= KEYBYTES_MAX, 'key must be at least ' + KEYBYTES_MAX + ', was given ' + key.length);
        if (salt != null) nanoassert(salt.length === SALTBYTES, 'salt must be exactly ' + SALTBYTES + ', was given ' + salt.length);
        if (personal != null) nanoassert(personal.length === PERSONALBYTES, 'personal must be exactly ' + PERSONALBYTES + ', was given ' + personal.length);
      }

      if (!freeList.length) {
        freeList.push(head);
        head += 216;
      }

      this.digestLength = digestLength;
      this.finalized = false;
      this.pointer = freeList.pop();

      wasm.memory.fill(0, 0, 64);
      wasm.memory[0] = this.digestLength;
      wasm.memory[1] = key ? key.length : 0;
      wasm.memory[2] = 1; // fanout
      wasm.memory[3] = 1; // depth

      if (salt) wasm.memory.set(salt, 32);
      if (personal) wasm.memory.set(personal, 48);

      if (this.pointer + 216 > wasm.memory.length) wasm.realloc(this.pointer + 216); // we need 216 bytes for the state
      wasm.exports.blake2b_init(this.pointer, this.digestLength);

      if (key) {
        this.update(key);
        wasm.memory.fill(0, head, head + key.length); // whiteout key
        wasm.memory[this.pointer + 200] = 128;
      }
    }


    Blake2b.prototype.update = function (input) {
      nanoassert(this.finalized === false, 'Hash instance finalized');
      nanoassert(input, 'input must be TypedArray or Buffer');

      if (head + input.length > wasm.memory.length) wasm.realloc(head + input.length);
      wasm.memory.set(input, head);
      wasm.exports.blake2b_update(this.pointer, head, head + input.length);
      return this
    };

    Blake2b.prototype.digest = function (enc) {
      nanoassert(this.finalized === false, 'Hash instance finalized');
      this.finalized = true;

      freeList.push(this.pointer);
      wasm.exports.blake2b_final(this.pointer);

      if (!enc || enc === 'binary') {
        return wasm.memory.slice(this.pointer + 128, this.pointer + 128 + this.digestLength)
      }

      if (enc === 'hex') {
        return hexSlice(wasm.memory, this.pointer + 128, this.digestLength)
      }

      nanoassert(enc.length >= this.digestLength, 'input must be TypedArray or Buffer');
      for (var i = 0; i < this.digestLength; i++) {
        enc[i] = wasm.memory[this.pointer + 128 + i];
      }

      return enc
    };

    // libsodium compat
    Blake2b.prototype.final = Blake2b.prototype.digest;

    Blake2b.WASM = wasm && wasm.buffer;
    Blake2b.SUPPORTED = typeof WebAssembly !== 'undefined';

    Blake2b.ready = function (cb) {
      if (!cb) cb = noop;
      if (!wasm) return cb(new Error('WebAssembly not supported'))

      // backwards compat, can be removed in a new major
      var p = new Promise(function (reject, resolve) {
        wasm.onload(function (err) {
          if (err) resolve();
          else reject();
          cb(err);
        });
      });

      return p
    };

    Blake2b.prototype.ready = Blake2b.ready;

    function noop () {}

    function hexSlice (buf, start, len) {
      var str = '';
      for (var i = 0; i < len; i++) str += toHex(buf[start + i]);
      return str
    }

    function toHex (n) {
      if (n < 16) return '0' + n.toString(16)
      return n.toString(16)
    }
    });
    var blake2bWasm_1 = blake2bWasm.BYTES_MIN;
    var blake2bWasm_2 = blake2bWasm.BYTES_MAX;
    var blake2bWasm_3 = blake2bWasm.BYTES;
    var blake2bWasm_4 = blake2bWasm.KEYBYTES_MIN;
    var blake2bWasm_5 = blake2bWasm.KEYBYTES_MAX;
    var blake2bWasm_6 = blake2bWasm.KEYBYTES;
    var blake2bWasm_7 = blake2bWasm.SALTBYTES;
    var blake2bWasm_8 = blake2bWasm.PERSONALBYTES;

    var blake2b$1 = createCommonjsModule(function (module) {
    // 64-bit unsigned addition
    // Sets v[a,a+1] += v[b,b+1]
    // v should be a Uint32Array
    function ADD64AA (v, a, b) {
      var o0 = v[a] + v[b];
      var o1 = v[a + 1] + v[b + 1];
      if (o0 >= 0x100000000) {
        o1++;
      }
      v[a] = o0;
      v[a + 1] = o1;
    }

    // 64-bit unsigned addition
    // Sets v[a,a+1] += b
    // b0 is the low 32 bits of b, b1 represents the high 32 bits
    function ADD64AC (v, a, b0, b1) {
      var o0 = v[a] + b0;
      if (b0 < 0) {
        o0 += 0x100000000;
      }
      var o1 = v[a + 1] + b1;
      if (o0 >= 0x100000000) {
        o1++;
      }
      v[a] = o0;
      v[a + 1] = o1;
    }

    // Little-endian byte access
    function B2B_GET32 (arr, i) {
      return (arr[i] ^
      (arr[i + 1] << 8) ^
      (arr[i + 2] << 16) ^
      (arr[i + 3] << 24))
    }

    // G Mixing function
    // The ROTRs are inlined for speed
    function B2B_G (a, b, c, d, ix, iy) {
      var x0 = m[ix];
      var x1 = m[ix + 1];
      var y0 = m[iy];
      var y1 = m[iy + 1];

      ADD64AA(v, a, b); // v[a,a+1] += v[b,b+1] ... in JS we must store a uint64 as two uint32s
      ADD64AC(v, a, x0, x1); // v[a, a+1] += x ... x0 is the low 32 bits of x, x1 is the high 32 bits

      // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated to the right by 32 bits
      var xor0 = v[d] ^ v[a];
      var xor1 = v[d + 1] ^ v[a + 1];
      v[d] = xor1;
      v[d + 1] = xor0;

      ADD64AA(v, c, d);

      // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 24 bits
      xor0 = v[b] ^ v[c];
      xor1 = v[b + 1] ^ v[c + 1];
      v[b] = (xor0 >>> 24) ^ (xor1 << 8);
      v[b + 1] = (xor1 >>> 24) ^ (xor0 << 8);

      ADD64AA(v, a, b);
      ADD64AC(v, a, y0, y1);

      // v[d,d+1] = (v[d,d+1] xor v[a,a+1]) rotated right by 16 bits
      xor0 = v[d] ^ v[a];
      xor1 = v[d + 1] ^ v[a + 1];
      v[d] = (xor0 >>> 16) ^ (xor1 << 16);
      v[d + 1] = (xor1 >>> 16) ^ (xor0 << 16);

      ADD64AA(v, c, d);

      // v[b,b+1] = (v[b,b+1] xor v[c,c+1]) rotated right by 63 bits
      xor0 = v[b] ^ v[c];
      xor1 = v[b + 1] ^ v[c + 1];
      v[b] = (xor1 >>> 31) ^ (xor0 << 1);
      v[b + 1] = (xor0 >>> 31) ^ (xor1 << 1);
    }

    // Initialization Vector
    var BLAKE2B_IV32 = new Uint32Array([
      0xF3BCC908, 0x6A09E667, 0x84CAA73B, 0xBB67AE85,
      0xFE94F82B, 0x3C6EF372, 0x5F1D36F1, 0xA54FF53A,
      0xADE682D1, 0x510E527F, 0x2B3E6C1F, 0x9B05688C,
      0xFB41BD6B, 0x1F83D9AB, 0x137E2179, 0x5BE0CD19
    ]);

    var SIGMA8 = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3,
      11, 8, 12, 0, 5, 2, 15, 13, 10, 14, 3, 6, 7, 1, 9, 4,
      7, 9, 3, 1, 13, 12, 11, 14, 2, 6, 5, 10, 4, 0, 15, 8,
      9, 0, 5, 7, 2, 4, 10, 15, 14, 1, 11, 12, 6, 8, 3, 13,
      2, 12, 6, 10, 0, 11, 8, 3, 4, 13, 7, 5, 15, 14, 1, 9,
      12, 5, 1, 15, 14, 13, 4, 10, 0, 7, 6, 3, 9, 2, 8, 11,
      13, 11, 7, 14, 12, 1, 3, 9, 5, 0, 15, 4, 8, 6, 2, 10,
      6, 15, 14, 9, 11, 3, 0, 8, 12, 2, 13, 7, 1, 4, 10, 5,
      10, 2, 8, 4, 7, 6, 1, 5, 15, 11, 9, 14, 3, 12, 13, 0,
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      14, 10, 4, 8, 9, 15, 13, 6, 1, 12, 0, 2, 11, 7, 5, 3
    ];

    // These are offsets into a uint64 buffer.
    // Multiply them all by 2 to make them offsets into a uint32 buffer,
    // because this is Javascript and we don't have uint64s
    var SIGMA82 = new Uint8Array(SIGMA8.map(function (x) { return x * 2 }));

    // Compression function. 'last' flag indicates last block.
    // Note we're representing 16 uint64s as 32 uint32s
    var v = new Uint32Array(32);
    var m = new Uint32Array(32);
    function blake2bCompress (ctx, last) {
      var i = 0;

      // init work variables
      for (i = 0; i < 16; i++) {
        v[i] = ctx.h[i];
        v[i + 16] = BLAKE2B_IV32[i];
      }

      // low 64 bits of offset
      v[24] = v[24] ^ ctx.t;
      v[25] = v[25] ^ (ctx.t / 0x100000000);
      // high 64 bits not supported, offset may not be higher than 2**53-1

      // last block flag set ?
      if (last) {
        v[28] = ~v[28];
        v[29] = ~v[29];
      }

      // get little-endian words
      for (i = 0; i < 32; i++) {
        m[i] = B2B_GET32(ctx.b, 4 * i);
      }

      // twelve rounds of mixing
      for (i = 0; i < 12; i++) {
        B2B_G(0, 8, 16, 24, SIGMA82[i * 16 + 0], SIGMA82[i * 16 + 1]);
        B2B_G(2, 10, 18, 26, SIGMA82[i * 16 + 2], SIGMA82[i * 16 + 3]);
        B2B_G(4, 12, 20, 28, SIGMA82[i * 16 + 4], SIGMA82[i * 16 + 5]);
        B2B_G(6, 14, 22, 30, SIGMA82[i * 16 + 6], SIGMA82[i * 16 + 7]);
        B2B_G(0, 10, 20, 30, SIGMA82[i * 16 + 8], SIGMA82[i * 16 + 9]);
        B2B_G(2, 12, 22, 24, SIGMA82[i * 16 + 10], SIGMA82[i * 16 + 11]);
        B2B_G(4, 14, 16, 26, SIGMA82[i * 16 + 12], SIGMA82[i * 16 + 13]);
        B2B_G(6, 8, 18, 28, SIGMA82[i * 16 + 14], SIGMA82[i * 16 + 15]);
      }

      for (i = 0; i < 16; i++) {
        ctx.h[i] = ctx.h[i] ^ v[i] ^ v[i + 16];
      }
    }

    // reusable parameter_block
    var parameter_block = new Uint8Array([
      0, 0, 0, 0,      //  0: outlen, keylen, fanout, depth
      0, 0, 0, 0,      //  4: leaf length, sequential mode
      0, 0, 0, 0,      //  8: node offset
      0, 0, 0, 0,      // 12: node offset
      0, 0, 0, 0,      // 16: node depth, inner length, rfu
      0, 0, 0, 0,      // 20: rfu
      0, 0, 0, 0,      // 24: rfu
      0, 0, 0, 0,      // 28: rfu
      0, 0, 0, 0,      // 32: salt
      0, 0, 0, 0,      // 36: salt
      0, 0, 0, 0,      // 40: salt
      0, 0, 0, 0,      // 44: salt
      0, 0, 0, 0,      // 48: personal
      0, 0, 0, 0,      // 52: personal
      0, 0, 0, 0,      // 56: personal
      0, 0, 0, 0       // 60: personal
    ]);

    // Creates a BLAKE2b hashing context
    // Requires an output length between 1 and 64 bytes
    // Takes an optional Uint8Array key
    function Blake2b (outlen, key, salt, personal) {
      // zero out parameter_block before usage
      parameter_block.fill(0);
      // state, 'param block'

      this.b = new Uint8Array(128);
      this.h = new Uint32Array(16);
      this.t = 0; // input count
      this.c = 0; // pointer within buffer
      this.outlen = outlen; // output length in bytes

      parameter_block[0] = outlen;
      if (key) parameter_block[1] = key.length;
      parameter_block[2] = 1; // fanout
      parameter_block[3] = 1; // depth

      if (salt) parameter_block.set(salt, 32);
      if (personal) parameter_block.set(personal, 48);

      // initialize hash state
      for (var i = 0; i < 16; i++) {
        this.h[i] = BLAKE2B_IV32[i] ^ B2B_GET32(parameter_block, i * 4);
      }

      // key the hash, if applicable
      if (key) {
        blake2bUpdate(this, key);
        // at the end
        this.c = 128;
      }
    }

    Blake2b.prototype.update = function (input) {
      nanoassert(input != null, 'input must be Uint8Array or Buffer');
      blake2bUpdate(this, input);
      return this
    };

    Blake2b.prototype.digest = function (out) {
      var buf = (!out || out === 'binary' || out === 'hex') ? new Uint8Array(this.outlen) : out;
      nanoassert(buf.length >= this.outlen, 'out must have at least outlen bytes of space');
      blake2bFinal(this, buf);
      if (out === 'hex') return hexSlice(buf)
      return buf
    };

    Blake2b.prototype.final = Blake2b.prototype.digest;

    Blake2b.ready = function (cb) {
      blake2bWasm.ready(function () {
        cb(); // ignore the error
      });
    };

    // Updates a BLAKE2b streaming hash
    // Requires hash context and Uint8Array (byte array)
    function blake2bUpdate (ctx, input) {
      for (var i = 0; i < input.length; i++) {
        if (ctx.c === 128) { // buffer full ?
          ctx.t += ctx.c; // add counters
          blake2bCompress(ctx, false); // compress (not last)
          ctx.c = 0; // counter to zero
        }
        ctx.b[ctx.c++] = input[i];
      }
    }

    // Completes a BLAKE2b streaming hash
    // Returns a Uint8Array containing the message digest
    function blake2bFinal (ctx, out) {
      ctx.t += ctx.c; // mark last block offset

      while (ctx.c < 128) { // fill up with zeros
        ctx.b[ctx.c++] = 0;
      }
      blake2bCompress(ctx, true); // final block flag = 1

      for (var i = 0; i < ctx.outlen; i++) {
        out[i] = ctx.h[i >> 2] >> (8 * (i & 3));
      }
      return out
    }

    function hexSlice (buf) {
      var str = '';
      for (var i = 0; i < buf.length; i++) str += toHex(buf[i]);
      return str
    }

    function toHex (n) {
      if (n < 16) return '0' + n.toString(16)
      return n.toString(16)
    }

    var Proto = Blake2b;

    module.exports = function createHash (outlen, key, salt, personal, noAssert) {
      if (noAssert !== true) {
        nanoassert(outlen >= BYTES_MIN, 'outlen must be at least ' + BYTES_MIN + ', was given ' + outlen);
        nanoassert(outlen <= BYTES_MAX, 'outlen must be at most ' + BYTES_MAX + ', was given ' + outlen);
        if (key != null) nanoassert(key.length >= KEYBYTES_MIN, 'key must be at least ' + KEYBYTES_MIN + ', was given ' + key.length);
        if (key != null) nanoassert(key.length <= KEYBYTES_MAX, 'key must be at most ' + KEYBYTES_MAX + ', was given ' + key.length);
        if (salt != null) nanoassert(salt.length === SALTBYTES, 'salt must be exactly ' + SALTBYTES + ', was given ' + salt.length);
        if (personal != null) nanoassert(personal.length === PERSONALBYTES, 'personal must be exactly ' + PERSONALBYTES + ', was given ' + personal.length);
      }

      return new Proto(outlen, key, salt, personal)
    };

    module.exports.ready = function (cb) {
      blake2bWasm.ready(function () { // ignore errors
        cb();
      });
    };

    module.exports.WASM_SUPPORTED = blake2bWasm.SUPPORTED;
    module.exports.WASM_LOADED = false;

    var BYTES_MIN = module.exports.BYTES_MIN = 16;
    var BYTES_MAX = module.exports.BYTES_MAX = 64;
    var BYTES = module.exports.BYTES = 32;
    var KEYBYTES_MIN = module.exports.KEYBYTES_MIN = 16;
    var KEYBYTES_MAX = module.exports.KEYBYTES_MAX = 64;
    var KEYBYTES = module.exports.KEYBYTES = 32;
    var SALTBYTES = module.exports.SALTBYTES = 16;
    var PERSONALBYTES = module.exports.PERSONALBYTES = 16;

    blake2bWasm.ready(function (err) {
      if (!err) {
        module.exports.WASM_LOADED = true;
        Proto = blake2bWasm;
      }
    });
    });
    var blake2b_1 = blake2b$1.ready;
    var blake2b_2 = blake2b$1.WASM_SUPPORTED;
    var blake2b_3 = blake2b$1.WASM_LOADED;
    var blake2b_4 = blake2b$1.BYTES_MIN;
    var blake2b_5 = blake2b$1.BYTES_MAX;
    var blake2b_6 = blake2b$1.BYTES;
    var blake2b_7 = blake2b$1.KEYBYTES_MIN;
    var blake2b_8 = blake2b$1.KEYBYTES_MAX;
    var blake2b_9 = blake2b$1.KEYBYTES;
    var blake2b_10 = blake2b$1.SALTBYTES;
    var blake2b_11 = blake2b$1.PERSONALBYTES;

    var crypto_generichash = createCommonjsModule(function (module) {
    module.exports.crypto_generichash_PRIMITIVE = 'blake2b';
    module.exports.crypto_generichash_BYTES_MIN = blake2b$1.BYTES_MIN;
    module.exports.crypto_generichash_BYTES_MAX = blake2b$1.BYTES_MAX;
    module.exports.crypto_generichash_BYTES = blake2b$1.BYTES;
    module.exports.crypto_generichash_KEYBYTES_MIN = blake2b$1.KEYBYTES_MIN;
    module.exports.crypto_generichash_KEYBYTES_MAX = blake2b$1.KEYBYTES_MAX;
    module.exports.crypto_generichash_KEYBYTES = blake2b$1.KEYBYTES;
    module.exports.crypto_generichash_WASM_SUPPORTED = blake2b$1.WASM_SUPPORTED;
    module.exports.crypto_generichash_WASM_LOADED = false;

    module.exports.crypto_generichash = function (output, input, key) {
      blake2b$1(output.length, key).update(input).final(output);
    };

    module.exports.crypto_generichash_ready = blake2b$1.ready;

    module.exports.crypto_generichash_batch = function (output, inputArray, key) {
      var ctx = blake2b$1(output.length, key);
      for (var i = 0; i < inputArray.length; i++) {
        ctx.update(inputArray[i]);
      }
      ctx.final(output);
    };

    module.exports.crypto_generichash_instance = function (key, outlen) {
      if (outlen == null) outlen = module.exports.crypto_generichash_BYTES;
      return blake2b$1(outlen, key)
    };

    blake2b$1.ready(function (err) {
      module.exports.crypto_generichash_WASM_LOADED = blake2b$1.WASM_LOADED;
    });
    });
    var crypto_generichash_1 = crypto_generichash.crypto_generichash_PRIMITIVE;
    var crypto_generichash_2 = crypto_generichash.crypto_generichash_BYTES_MIN;
    var crypto_generichash_3 = crypto_generichash.crypto_generichash_BYTES_MAX;
    var crypto_generichash_4 = crypto_generichash.crypto_generichash_BYTES;
    var crypto_generichash_5 = crypto_generichash.crypto_generichash_KEYBYTES_MIN;
    var crypto_generichash_6 = crypto_generichash.crypto_generichash_KEYBYTES_MAX;
    var crypto_generichash_7 = crypto_generichash.crypto_generichash_KEYBYTES;
    var crypto_generichash_8 = crypto_generichash.crypto_generichash_WASM_SUPPORTED;
    var crypto_generichash_9 = crypto_generichash.crypto_generichash_WASM_LOADED;
    var crypto_generichash_10 = crypto_generichash.crypto_generichash;
    var crypto_generichash_11 = crypto_generichash.crypto_generichash_ready;
    var crypto_generichash_12 = crypto_generichash.crypto_generichash_batch;
    var crypto_generichash_13 = crypto_generichash.crypto_generichash_instance;

    var crypto_kdf = createCommonjsModule(function (module) {
    var randombytes_buf = randombytes_1.randombytes_buf;


    module.exports.crypto_kdf_PRIMITIVE = 'blake2b';
    module.exports.crypto_kdf_BYTES_MIN = 16;
    module.exports.crypto_kdf_BYTES_MAX = 64;
    module.exports.crypto_kdf_CONTEXTBYTES = 8;
    module.exports.crypto_kdf_KEYBYTES = 32;

    function STORE64_LE(dest, int) {
      var mul = 1;
      var i = 0;
      dest[0] = int & 0xFF;
      while (++i < 8 && (mul *= 0x100)) {
        dest[i] = (int / mul) & 0xFF;
      }
    }

    module.exports.crypto_kdf_derive_from_key = function crypto_kdf_derive_from_key (subkey, subkey_id, ctx, key) {
      nanoassert(subkey.length >= module.exports.crypto_kdf_BYTES_MIN, 'subkey must be at least crypto_kdf_BYTES_MIN');
      nanoassert(subkey_id >= 0 && subkey_id <= 0x1fffffffffffff, 'subkey_id must be safe integer');
      nanoassert(ctx.length >= module.exports.crypto_kdf_CONTEXTBYTES, 'context must be at least crypto_kdf_CONTEXTBYTES');

      var ctx_padded = new Uint8Array(blake2b$1.PERSONALBYTES);
      var salt = new Uint8Array(blake2b$1.SALTBYTES);

      ctx_padded.set(ctx, 0, module.exports.crypto_kdf_CONTEXTBYTES);
      STORE64_LE(salt, subkey_id);

      var outlen = Math.min(subkey.length, module.exports.crypto_kdf_BYTES_MAX);
      blake2b$1(outlen, key.subarray(0, module.exports.crypto_kdf_KEYBYTES), salt, ctx_padded, true)
        .final(subkey);
    };

    module.exports.crypto_kdf_keygen = function crypto_kdf_keygen (out) {
      nanoassert(out.length >= module.exports.crypto_kdf_KEYBYTES, 'out.length must be crypto_kdf_KEYBYTES');
      randombytes_buf(out.subarray(0, module.exports.crypto_kdf_KEYBYTES));
    };
    });
    var crypto_kdf_1 = crypto_kdf.crypto_kdf_PRIMITIVE;
    var crypto_kdf_2 = crypto_kdf.crypto_kdf_BYTES_MIN;
    var crypto_kdf_3 = crypto_kdf.crypto_kdf_BYTES_MAX;
    var crypto_kdf_4 = crypto_kdf.crypto_kdf_CONTEXTBYTES;
    var crypto_kdf_5 = crypto_kdf.crypto_kdf_KEYBYTES;
    var crypto_kdf_6 = crypto_kdf.crypto_kdf_derive_from_key;
    var crypto_kdf_7 = crypto_kdf.crypto_kdf_keygen;

    var siphash24 = loadWebAssembly$2;

    loadWebAssembly$2.supported = typeof WebAssembly !== 'undefined';

    function loadWebAssembly$2 (opts) {
      if (!loadWebAssembly$2.supported) return null

      var imp = opts && opts.imports;
      var wasm = toUint8Array$2('AGFzbQEAAAABBgFgAn9/AAMCAQAFBQEBCpBOBxQCBm1lbW9yeQIAB3NpcGhhc2gAAArdCAHaCAIIfgJ/QvXKzYPXrNu38wAhAkLt3pHzlszct+QAIQNC4eSV89bs2bzsACEEQvPK0cunjNmy9AAhBUEIKQMAIQdBECkDACEIIAGtQjiGIQYgAUEHcSELIAAgAWogC2shCiAFIAiFIQUgBCAHhSEEIAMgCIUhAyACIAeFIQICQANAIAAgCkYNASAAKQMAIQkgBSAJhSEFIAIgA3whAiADQg2JIQMgAyAChSEDIAJCIIkhAiAEIAV8IQQgBUIQiSEFIAUgBIUhBSACIAV8IQIgBUIViSEFIAUgAoUhBSAEIAN8IQQgA0IRiSEDIAMgBIUhAyAEQiCJIQQgAiADfCECIANCDYkhAyADIAKFIQMgAkIgiSECIAQgBXwhBCAFQhCJIQUgBSAEhSEFIAIgBXwhAiAFQhWJIQUgBSAChSEFIAQgA3whBCADQhGJIQMgAyAEhSEDIARCIIkhBCACIAmFIQIgAEEIaiEADAALCwJAAkACQAJAAkACQAJAAkAgCw4HBwYFBAMCAQALIAYgADEABkIwhoQhBgsgBiAAMQAFQiiGhCEGCyAGIAAxAARCIIaEIQYLIAYgADEAA0IYhoQhBgsgBiAAMQACQhCGhCEGCyAGIAAxAAFCCIaEIQYLIAYgADEAAIQhBgsgBSAGhSEFIAIgA3whAiADQg2JIQMgAyAChSEDIAJCIIkhAiAEIAV8IQQgBUIQiSEFIAUgBIUhBSACIAV8IQIgBUIViSEFIAUgAoUhBSAEIAN8IQQgA0IRiSEDIAMgBIUhAyAEQiCJIQQgAiADfCECIANCDYkhAyADIAKFIQMgAkIgiSECIAQgBXwhBCAFQhCJIQUgBSAEhSEFIAIgBXwhAiAFQhWJIQUgBSAChSEFIAQgA3whBCADQhGJIQMgAyAEhSEDIARCIIkhBCACIAaFIQIgBEL/AYUhBCACIAN8IQIgA0INiSEDIAMgAoUhAyACQiCJIQIgBCAFfCEEIAVCEIkhBSAFIASFIQUgAiAFfCECIAVCFYkhBSAFIAKFIQUgBCADfCEEIANCEYkhAyADIASFIQMgBEIgiSEEIAIgA3whAiADQg2JIQMgAyAChSEDIAJCIIkhAiAEIAV8IQQgBUIQiSEFIAUgBIUhBSACIAV8IQIgBUIViSEFIAUgAoUhBSAEIAN8IQQgA0IRiSEDIAMgBIUhAyAEQiCJIQQgAiADfCECIANCDYkhAyADIAKFIQMgAkIgiSECIAQgBXwhBCAFQhCJIQUgBSAEhSEFIAIgBXwhAiAFQhWJIQUgBSAChSEFIAQgA3whBCADQhGJIQMgAyAEhSEDIARCIIkhBCACIAN8IQIgA0INiSEDIAMgAoUhAyACQiCJIQIgBCAFfCEEIAVCEIkhBSAFIASFIQUgAiAFfCECIAVCFYkhBSAFIAKFIQUgBCADfCEEIANCEYkhAyADIASFIQMgBEIgiSEEQQAgAiADIAQgBYWFhTcDAAs=');
      var ready = null;

      var mod = {
        buffer: wasm,
        memory: null,
        exports: null,
        realloc: realloc,
        onload: onload
      };

      onload(function () {});

      return mod

      function realloc (size) {
        mod.exports.memory.grow(Math.max(0, Math.ceil(Math.abs(size - mod.memory.length) / 65536)));
        mod.memory = new Uint8Array(mod.exports.memory.buffer);
      }

      function onload (cb) {
        if (mod.exports) return cb()

        if (ready) {
          ready.then(cb.bind(null, null)).catch(cb);
          return
        }

        try {
          if (opts && opts.async) throw new Error('async')
          setup({instance: new WebAssembly.Instance(new WebAssembly.Module(wasm), imp)});
        } catch (err) {
          ready = WebAssembly.instantiate(wasm, imp).then(setup);
        }

        onload(cb);
      }

      function setup (w) {
        mod.exports = w.instance.exports;
        mod.memory = mod.exports.memory && mod.exports.memory.buffer && new Uint8Array(mod.exports.memory.buffer);
      }
    }

    function toUint8Array$2 (s) {
      if (typeof atob === 'function') return new Uint8Array(atob(s).split('').map(charCodeAt$2))
      return new (commonjsRequire().Buffer)(s, 'base64')
    }

    function charCodeAt$2 (c) {
      return c.charCodeAt(0)
    }

    var fallback_1 = fallback;

    function _add (a, b) {
      var rl = a.l + b.l;
      var a2 = {
        h: a.h + b.h + (rl / 2 >>> 31) >>> 0,
        l: rl >>> 0
      };
      a.h = a2.h;
      a.l = a2.l;
    }

    function _xor (a, b) {
      a.h ^= b.h;
      a.h >>>= 0;
      a.l ^= b.l;
      a.l >>>= 0;
    }

    function _rotl (a, n) {
      var a2 = {
        h: a.h << n | a.l >>> (32 - n),
        l: a.l << n | a.h >>> (32 - n)
      };
      a.h = a2.h;
      a.l = a2.l;
    }

    function _rotl32 (a) {
      var al = a.l;
      a.l = a.h;
      a.h = al;
    }

    function _compress (v0, v1, v2, v3) {
      _add(v0, v1);
      _add(v2, v3);
      _rotl(v1, 13);
      _rotl(v3, 16);
      _xor(v1, v0);
      _xor(v3, v2);
      _rotl32(v0);
      _add(v2, v1);
      _add(v0, v3);
      _rotl(v1, 17);
      _rotl(v3, 21);
      _xor(v1, v2);
      _xor(v3, v0);
      _rotl32(v2);
    }

    function _get_int (a, offset) {
      return (a[offset + 3] << 24) | (a[offset + 2] << 16) | (a[offset + 1] << 8) | a[offset]
    }

    function fallback (out, m, key) { // modified from https://github.com/jedisct1/siphash-js to use uint8arrays
      var k0 = {h: _get_int(key, 4), l: _get_int(key, 0)};
      var k1 = {h: _get_int(key, 12), l: _get_int(key, 8)};
      var v0 = {h: k0.h, l: k0.l};
      var v2 = k0;
      var v1 = {h: k1.h, l: k1.l};
      var v3 = k1;
      var mi;
      var mp = 0;
      var ml = m.length;
      var ml7 = ml - 7;
      var buf = new Uint8Array(new ArrayBuffer(8));

      _xor(v0, {h: 0x736f6d65, l: 0x70736575});
      _xor(v1, {h: 0x646f7261, l: 0x6e646f6d});
      _xor(v2, {h: 0x6c796765, l: 0x6e657261});
      _xor(v3, {h: 0x74656462, l: 0x79746573});

      while (mp < ml7) {
        mi = {h: _get_int(m, mp + 4), l: _get_int(m, mp)};
        _xor(v3, mi);
        _compress(v0, v1, v2, v3);
        _compress(v0, v1, v2, v3);
        _xor(v0, mi);
        mp += 8;
      }

      buf[7] = ml;
      var ic = 0;
      while (mp < ml) {
        buf[ic++] = m[mp++];
      }
      while (ic < 7) {
        buf[ic++] = 0;
      }

      mi = {
        h: buf[7] << 24 | buf[6] << 16 | buf[5] << 8 | buf[4],
        l: buf[3] << 24 | buf[2] << 16 | buf[1] << 8 | buf[0]
      };

      _xor(v3, mi);
      _compress(v0, v1, v2, v3);
      _compress(v0, v1, v2, v3);
      _xor(v0, mi);
      _xor(v2, { h: 0, l: 0xff });
      _compress(v0, v1, v2, v3);
      _compress(v0, v1, v2, v3);
      _compress(v0, v1, v2, v3);
      _compress(v0, v1, v2, v3);

      var h = v0;
      _xor(h, v1);
      _xor(h, v2);
      _xor(h, v3);

      out[0] = h.l & 0xff;
      out[1] = (h.l >> 8) & 0xff;
      out[2] = (h.l >> 16) & 0xff;
      out[3] = (h.l >> 24) & 0xff;
      out[4] = h.h & 0xff;
      out[5] = (h.h >> 8) & 0xff;
      out[6] = (h.h >> 16) & 0xff;
      out[7] = (h.h >> 24) & 0xff;
    }

    var siphash24_1 = siphash24$1;

    var BYTES = siphash24$1.BYTES = 8;
    var KEYBYTES = siphash24$1.KEYBYTES = 16;
    var mod = siphash24();

    siphash24$1.WASM_SUPPORTED = typeof WebAssembly !== 'undefined';
    siphash24$1.WASM_LOADED = false;

    if (mod) {
      mod.onload(function (err) {
        siphash24$1.WASM_LOADED = !err;
      });
    }

    function siphash24$1 (data, key, out, noAssert) {
      if (!out) out = new Uint8Array(8);

      if (noAssert !== true) {
        nanoassert(out.length >= BYTES, 'output must be at least ' + BYTES);
        nanoassert(key.length >= KEYBYTES, 'key must be at least ' + KEYBYTES);
      }

      if (mod && mod.exports) {
        if (data.length + 24 > mod.memory.length) mod.realloc(data.length + 24);
        mod.memory.set(key, 8);
        mod.memory.set(data, 24);
        mod.exports.siphash(24, data.length);
        out.set(mod.memory.subarray(0, 8));
      } else {
        fallback_1(out, data, key);
      }

      return out
    }

    var crypto_shorthash_PRIMITIVE = 'siphash24';
    var crypto_shorthash_BYTES = siphash24_1.BYTES;
    var crypto_shorthash_KEYBYTES = siphash24_1.KEYBYTES;
    var crypto_shorthash_WASM_SUPPORTED = siphash24_1.WASM_SUPPORTED;
    var crypto_shorthash_WASM_LOADED = siphash24_1.WASM_LOADED;
    var crypto_shorthash_1 = shorthash;

    function shorthash (out, data, key, noAssert) {
      siphash24_1(data, key, out, noAssert);
    }

    var crypto_shorthash = {
    	crypto_shorthash_PRIMITIVE: crypto_shorthash_PRIMITIVE,
    	crypto_shorthash_BYTES: crypto_shorthash_BYTES,
    	crypto_shorthash_KEYBYTES: crypto_shorthash_KEYBYTES,
    	crypto_shorthash_WASM_SUPPORTED: crypto_shorthash_WASM_SUPPORTED,
    	crypto_shorthash_WASM_LOADED: crypto_shorthash_WASM_LOADED,
    	crypto_shorthash: crypto_shorthash_1
    };

    var sodiumJavascript = createCommonjsModule(function (module) {



    // Based on https://github.com/dchest/tweetnacl-js/blob/6dcbcaf5f5cbfd313f2dcfe763db35c828c8ff5b/nacl-fast.js.

    var sodium = module.exports;


    // Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
    // Public domain.
    //
    // Implementation derived from TweetNaCl version 20140427.
    // See for details: http://tweetnacl.cr.yp.to/

    var gf = function(init) {
      var i, r = new Float64Array(16);
      if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
      return r;
    };

    // also forwarded at the bottom but randombytes is non-enumerable
    var randombytes = randombytes_1.randombytes;
    var _9 = new Uint8Array(32); _9[0] = 9;

    var gf0 = gf(),
        gf1 = gf([1]),
        _121665 = gf([0xdb41, 1]),
        D = gf([0x78a3, 0x1359, 0x4dca, 0x75eb, 0xd8ab, 0x4141, 0x0a4d, 0x0070, 0xe898, 0x7779, 0x4079, 0x8cc7, 0xfe73, 0x2b6f, 0x6cee, 0x5203]),
        D2 = gf([0xf159, 0x26b2, 0x9b94, 0xebd6, 0xb156, 0x8283, 0x149a, 0x00e0, 0xd130, 0xeef3, 0x80f2, 0x198e, 0xfce7, 0x56df, 0xd9dc, 0x2406]),
        X = gf([0xd51a, 0x8f25, 0x2d60, 0xc956, 0xa7b2, 0x9525, 0xc760, 0x692c, 0xdc5c, 0xfdd6, 0xe231, 0xc0a4, 0x53fe, 0xcd6e, 0x36d3, 0x2169]),
        Y = gf([0x6658, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666, 0x6666]),
        I = gf([0xa0b0, 0x4a0e, 0x1b27, 0xc4ee, 0xe478, 0xad2f, 0x1806, 0x2f43, 0xd7a7, 0x3dfb, 0x0099, 0x2b4d, 0xdf0b, 0x4fc1, 0x2480, 0x2b83]);

    function ts64(x, i, h, l) {
      x[i]   = (h >> 24) & 0xff;
      x[i+1] = (h >> 16) & 0xff;
      x[i+2] = (h >>  8) & 0xff;
      x[i+3] = h & 0xff;
      x[i+4] = (l >> 24)  & 0xff;
      x[i+5] = (l >> 16)  & 0xff;
      x[i+6] = (l >>  8)  & 0xff;
      x[i+7] = l & 0xff;
    }

    function vn(x, xi, y, yi, n) {
      var i,d = 0;
      for (i = 0; i < n; i++) d |= x[xi+i]^y[yi+i];
      return (1 & ((d - 1) >>> 8)) - 1;
    }

    function crypto_verify_16(x, xi, y, yi) {
      return vn(x,xi,y,yi,16);
    }

    function crypto_verify_32(x, xi, y, yi) {
      return vn(x,xi,y,yi,32);
    }

    /*
    * Port of Andrew Moon's Poly1305-donna-16. Public domain.
    * https://github.com/floodyberry/poly1305-donna
    */

    var poly1305 = function(key) {
      this.buffer = new Uint8Array(16);
      this.r = new Uint16Array(10);
      this.h = new Uint16Array(10);
      this.pad = new Uint16Array(8);
      this.leftover = 0;
      this.fin = 0;

      var t0, t1, t2, t3, t4, t5, t6, t7;

      t0 = key[ 0] & 0xff | (key[ 1] & 0xff) << 8; this.r[0] = ( t0                     ) & 0x1fff;
      t1 = key[ 2] & 0xff | (key[ 3] & 0xff) << 8; this.r[1] = ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
      t2 = key[ 4] & 0xff | (key[ 5] & 0xff) << 8; this.r[2] = ((t1 >>> 10) | (t2 <<  6)) & 0x1f03;
      t3 = key[ 6] & 0xff | (key[ 7] & 0xff) << 8; this.r[3] = ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
      t4 = key[ 8] & 0xff | (key[ 9] & 0xff) << 8; this.r[4] = ((t3 >>>  4) | (t4 << 12)) & 0x00ff;
      this.r[5] = ((t4 >>>  1)) & 0x1ffe;
      t5 = key[10] & 0xff | (key[11] & 0xff) << 8; this.r[6] = ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
      t6 = key[12] & 0xff | (key[13] & 0xff) << 8; this.r[7] = ((t5 >>> 11) | (t6 <<  5)) & 0x1f81;
      t7 = key[14] & 0xff | (key[15] & 0xff) << 8; this.r[8] = ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
      this.r[9] = ((t7 >>>  5)) & 0x007f;

      this.pad[0] = key[16] & 0xff | (key[17] & 0xff) << 8;
      this.pad[1] = key[18] & 0xff | (key[19] & 0xff) << 8;
      this.pad[2] = key[20] & 0xff | (key[21] & 0xff) << 8;
      this.pad[3] = key[22] & 0xff | (key[23] & 0xff) << 8;
      this.pad[4] = key[24] & 0xff | (key[25] & 0xff) << 8;
      this.pad[5] = key[26] & 0xff | (key[27] & 0xff) << 8;
      this.pad[6] = key[28] & 0xff | (key[29] & 0xff) << 8;
      this.pad[7] = key[30] & 0xff | (key[31] & 0xff) << 8;
    };

    poly1305.prototype.blocks = function(m, mpos, bytes) {
      var hibit = this.fin ? 0 : (1 << 11);
      var t0, t1, t2, t3, t4, t5, t6, t7, c;
      var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;

      var h0 = this.h[0],
          h1 = this.h[1],
          h2 = this.h[2],
          h3 = this.h[3],
          h4 = this.h[4],
          h5 = this.h[5],
          h6 = this.h[6],
          h7 = this.h[7],
          h8 = this.h[8],
          h9 = this.h[9];

      var r0 = this.r[0],
          r1 = this.r[1],
          r2 = this.r[2],
          r3 = this.r[3],
          r4 = this.r[4],
          r5 = this.r[5],
          r6 = this.r[6],
          r7 = this.r[7],
          r8 = this.r[8],
          r9 = this.r[9];

      while (bytes >= 16) {
        t0 = m[mpos+ 0] & 0xff | (m[mpos+ 1] & 0xff) << 8; h0 += ( t0                     ) & 0x1fff;
        t1 = m[mpos+ 2] & 0xff | (m[mpos+ 3] & 0xff) << 8; h1 += ((t0 >>> 13) | (t1 <<  3)) & 0x1fff;
        t2 = m[mpos+ 4] & 0xff | (m[mpos+ 5] & 0xff) << 8; h2 += ((t1 >>> 10) | (t2 <<  6)) & 0x1fff;
        t3 = m[mpos+ 6] & 0xff | (m[mpos+ 7] & 0xff) << 8; h3 += ((t2 >>>  7) | (t3 <<  9)) & 0x1fff;
        t4 = m[mpos+ 8] & 0xff | (m[mpos+ 9] & 0xff) << 8; h4 += ((t3 >>>  4) | (t4 << 12)) & 0x1fff;
        h5 += ((t4 >>>  1)) & 0x1fff;
        t5 = m[mpos+10] & 0xff | (m[mpos+11] & 0xff) << 8; h6 += ((t4 >>> 14) | (t5 <<  2)) & 0x1fff;
        t6 = m[mpos+12] & 0xff | (m[mpos+13] & 0xff) << 8; h7 += ((t5 >>> 11) | (t6 <<  5)) & 0x1fff;
        t7 = m[mpos+14] & 0xff | (m[mpos+15] & 0xff) << 8; h8 += ((t6 >>>  8) | (t7 <<  8)) & 0x1fff;
        h9 += ((t7 >>> 5)) | hibit;

        c = 0;

        d0 = c;
        d0 += h0 * r0;
        d0 += h1 * (5 * r9);
        d0 += h2 * (5 * r8);
        d0 += h3 * (5 * r7);
        d0 += h4 * (5 * r6);
        c = (d0 >>> 13); d0 &= 0x1fff;
        d0 += h5 * (5 * r5);
        d0 += h6 * (5 * r4);
        d0 += h7 * (5 * r3);
        d0 += h8 * (5 * r2);
        d0 += h9 * (5 * r1);
        c += (d0 >>> 13); d0 &= 0x1fff;

        d1 = c;
        d1 += h0 * r1;
        d1 += h1 * r0;
        d1 += h2 * (5 * r9);
        d1 += h3 * (5 * r8);
        d1 += h4 * (5 * r7);
        c = (d1 >>> 13); d1 &= 0x1fff;
        d1 += h5 * (5 * r6);
        d1 += h6 * (5 * r5);
        d1 += h7 * (5 * r4);
        d1 += h8 * (5 * r3);
        d1 += h9 * (5 * r2);
        c += (d1 >>> 13); d1 &= 0x1fff;

        d2 = c;
        d2 += h0 * r2;
        d2 += h1 * r1;
        d2 += h2 * r0;
        d2 += h3 * (5 * r9);
        d2 += h4 * (5 * r8);
        c = (d2 >>> 13); d2 &= 0x1fff;
        d2 += h5 * (5 * r7);
        d2 += h6 * (5 * r6);
        d2 += h7 * (5 * r5);
        d2 += h8 * (5 * r4);
        d2 += h9 * (5 * r3);
        c += (d2 >>> 13); d2 &= 0x1fff;

        d3 = c;
        d3 += h0 * r3;
        d3 += h1 * r2;
        d3 += h2 * r1;
        d3 += h3 * r0;
        d3 += h4 * (5 * r9);
        c = (d3 >>> 13); d3 &= 0x1fff;
        d3 += h5 * (5 * r8);
        d3 += h6 * (5 * r7);
        d3 += h7 * (5 * r6);
        d3 += h8 * (5 * r5);
        d3 += h9 * (5 * r4);
        c += (d3 >>> 13); d3 &= 0x1fff;

        d4 = c;
        d4 += h0 * r4;
        d4 += h1 * r3;
        d4 += h2 * r2;
        d4 += h3 * r1;
        d4 += h4 * r0;
        c = (d4 >>> 13); d4 &= 0x1fff;
        d4 += h5 * (5 * r9);
        d4 += h6 * (5 * r8);
        d4 += h7 * (5 * r7);
        d4 += h8 * (5 * r6);
        d4 += h9 * (5 * r5);
        c += (d4 >>> 13); d4 &= 0x1fff;

        d5 = c;
        d5 += h0 * r5;
        d5 += h1 * r4;
        d5 += h2 * r3;
        d5 += h3 * r2;
        d5 += h4 * r1;
        c = (d5 >>> 13); d5 &= 0x1fff;
        d5 += h5 * r0;
        d5 += h6 * (5 * r9);
        d5 += h7 * (5 * r8);
        d5 += h8 * (5 * r7);
        d5 += h9 * (5 * r6);
        c += (d5 >>> 13); d5 &= 0x1fff;

        d6 = c;
        d6 += h0 * r6;
        d6 += h1 * r5;
        d6 += h2 * r4;
        d6 += h3 * r3;
        d6 += h4 * r2;
        c = (d6 >>> 13); d6 &= 0x1fff;
        d6 += h5 * r1;
        d6 += h6 * r0;
        d6 += h7 * (5 * r9);
        d6 += h8 * (5 * r8);
        d6 += h9 * (5 * r7);
        c += (d6 >>> 13); d6 &= 0x1fff;

        d7 = c;
        d7 += h0 * r7;
        d7 += h1 * r6;
        d7 += h2 * r5;
        d7 += h3 * r4;
        d7 += h4 * r3;
        c = (d7 >>> 13); d7 &= 0x1fff;
        d7 += h5 * r2;
        d7 += h6 * r1;
        d7 += h7 * r0;
        d7 += h8 * (5 * r9);
        d7 += h9 * (5 * r8);
        c += (d7 >>> 13); d7 &= 0x1fff;

        d8 = c;
        d8 += h0 * r8;
        d8 += h1 * r7;
        d8 += h2 * r6;
        d8 += h3 * r5;
        d8 += h4 * r4;
        c = (d8 >>> 13); d8 &= 0x1fff;
        d8 += h5 * r3;
        d8 += h6 * r2;
        d8 += h7 * r1;
        d8 += h8 * r0;
        d8 += h9 * (5 * r9);
        c += (d8 >>> 13); d8 &= 0x1fff;

        d9 = c;
        d9 += h0 * r9;
        d9 += h1 * r8;
        d9 += h2 * r7;
        d9 += h3 * r6;
        d9 += h4 * r5;
        c = (d9 >>> 13); d9 &= 0x1fff;
        d9 += h5 * r4;
        d9 += h6 * r3;
        d9 += h7 * r2;
        d9 += h8 * r1;
        d9 += h9 * r0;
        c += (d9 >>> 13); d9 &= 0x1fff;

        c = (((c << 2) + c)) | 0;
        c = (c + d0) | 0;
        d0 = c & 0x1fff;
        c = (c >>> 13);
        d1 += c;

        h0 = d0;
        h1 = d1;
        h2 = d2;
        h3 = d3;
        h4 = d4;
        h5 = d5;
        h6 = d6;
        h7 = d7;
        h8 = d8;
        h9 = d9;

        mpos += 16;
        bytes -= 16;
      }
      this.h[0] = h0;
      this.h[1] = h1;
      this.h[2] = h2;
      this.h[3] = h3;
      this.h[4] = h4;
      this.h[5] = h5;
      this.h[6] = h6;
      this.h[7] = h7;
      this.h[8] = h8;
      this.h[9] = h9;
    };

    poly1305.prototype.finish = function(mac, macpos) {
      var g = new Uint16Array(10);
      var c, mask, f, i;

      if (this.leftover) {
        i = this.leftover;
        this.buffer[i++] = 1;
        for (; i < 16; i++) this.buffer[i] = 0;
        this.fin = 1;
        this.blocks(this.buffer, 0, 16);
      }

      c = this.h[1] >>> 13;
      this.h[1] &= 0x1fff;
      for (i = 2; i < 10; i++) {
        this.h[i] += c;
        c = this.h[i] >>> 13;
        this.h[i] &= 0x1fff;
      }
      this.h[0] += (c * 5);
      c = this.h[0] >>> 13;
      this.h[0] &= 0x1fff;
      this.h[1] += c;
      c = this.h[1] >>> 13;
      this.h[1] &= 0x1fff;
      this.h[2] += c;

      g[0] = this.h[0] + 5;
      c = g[0] >>> 13;
      g[0] &= 0x1fff;
      for (i = 1; i < 10; i++) {
        g[i] = this.h[i] + c;
        c = g[i] >>> 13;
        g[i] &= 0x1fff;
      }
      g[9] -= (1 << 13);

      mask = (c ^ 1) - 1;
      for (i = 0; i < 10; i++) g[i] &= mask;
      mask = ~mask;
      for (i = 0; i < 10; i++) this.h[i] = (this.h[i] & mask) | g[i];

      this.h[0] = ((this.h[0]       ) | (this.h[1] << 13)                    ) & 0xffff;
      this.h[1] = ((this.h[1] >>>  3) | (this.h[2] << 10)                    ) & 0xffff;
      this.h[2] = ((this.h[2] >>>  6) | (this.h[3] <<  7)                    ) & 0xffff;
      this.h[3] = ((this.h[3] >>>  9) | (this.h[4] <<  4)                    ) & 0xffff;
      this.h[4] = ((this.h[4] >>> 12) | (this.h[5] <<  1) | (this.h[6] << 14)) & 0xffff;
      this.h[5] = ((this.h[6] >>>  2) | (this.h[7] << 11)                    ) & 0xffff;
      this.h[6] = ((this.h[7] >>>  5) | (this.h[8] <<  8)                    ) & 0xffff;
      this.h[7] = ((this.h[8] >>>  8) | (this.h[9] <<  5)                    ) & 0xffff;

      f = this.h[0] + this.pad[0];
      this.h[0] = f & 0xffff;
      for (i = 1; i < 8; i++) {
        f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
        this.h[i] = f & 0xffff;
      }

      mac[macpos+ 0] = (this.h[0] >>> 0) & 0xff;
      mac[macpos+ 1] = (this.h[0] >>> 8) & 0xff;
      mac[macpos+ 2] = (this.h[1] >>> 0) & 0xff;
      mac[macpos+ 3] = (this.h[1] >>> 8) & 0xff;
      mac[macpos+ 4] = (this.h[2] >>> 0) & 0xff;
      mac[macpos+ 5] = (this.h[2] >>> 8) & 0xff;
      mac[macpos+ 6] = (this.h[3] >>> 0) & 0xff;
      mac[macpos+ 7] = (this.h[3] >>> 8) & 0xff;
      mac[macpos+ 8] = (this.h[4] >>> 0) & 0xff;
      mac[macpos+ 9] = (this.h[4] >>> 8) & 0xff;
      mac[macpos+10] = (this.h[5] >>> 0) & 0xff;
      mac[macpos+11] = (this.h[5] >>> 8) & 0xff;
      mac[macpos+12] = (this.h[6] >>> 0) & 0xff;
      mac[macpos+13] = (this.h[6] >>> 8) & 0xff;
      mac[macpos+14] = (this.h[7] >>> 0) & 0xff;
      mac[macpos+15] = (this.h[7] >>> 8) & 0xff;
    };

    poly1305.prototype.update = function(m, mpos, bytes) {
      var i, want;

      if (this.leftover) {
        want = (16 - this.leftover);
        if (want > bytes)
          want = bytes;
        for (i = 0; i < want; i++)
          this.buffer[this.leftover + i] = m[mpos+i];
        bytes -= want;
        mpos += want;
        this.leftover += want;
        if (this.leftover < 16)
          return;
        this.blocks(this.buffer, 0, 16);
        this.leftover = 0;
      }

      if (bytes >= 16) {
        want = bytes - (bytes % 16);
        this.blocks(m, mpos, want);
        mpos += want;
        bytes -= want;
      }

      if (bytes) {
        for (i = 0; i < bytes; i++)
          this.buffer[this.leftover + i] = m[mpos+i];
        this.leftover += bytes;
      }
    };

    function crypto_stream_xor (c, cpos, m, mpos, clen, n, k) {
      crypto_stream.crypto_stream_xor(c, m, n, k);
    }

    function crypto_stream$1 (c, cpos, clen, n, k) {
      crypto_stream.crypto_stream(c, n, k);
    }

    function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
      var s = new poly1305(k);
      s.update(m, mpos, n);
      s.finish(out, outpos);
      return 0;
    }

    function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
      var x = new Uint8Array(16);
      crypto_onetimeauth(x,0,m,mpos,n,k);
      return crypto_verify_16(h,hpos,x,0);
    }

    function crypto_secretbox(c,m,d,n,k) {
      var i;
      if (d < 32) return -1;
      crypto_stream_xor(c,0,m,0,d,n,k);
      crypto_onetimeauth(c, 16, c, 32, d - 32, c);
      for (i = 0; i < 16; i++) c[i] = 0;
      return 0;
    }

    function crypto_secretbox_open(m,c,d,n,k) {
      var i;
      var x = new Uint8Array(32);
      if (d < 32) return -1;
      crypto_stream$1(x,0,32,n,k);
      if (crypto_onetimeauth_verify(c, 16,c, 32,d - 32,x) !== 0) return -1;
      crypto_stream_xor(m,0,c,0,d,n,k);
      for (i = 0; i < 32; i++) m[i] = 0;
      return 0;
    }

    function set25519(r, a) {
      var i;
      for (i = 0; i < 16; i++) r[i] = a[i]|0;
    }

    function car25519(o) {
      var i, v, c = 1;
      for (i = 0; i < 16; i++) {
        v = o[i] + c + 65535;
        c = Math.floor(v / 65536);
        o[i] = v - c * 65536;
      }
      o[0] += c-1 + 37 * (c-1);
    }

    function sel25519(p, q, b) {
      var t, c = ~(b-1);
      for (var i = 0; i < 16; i++) {
        t = c & (p[i] ^ q[i]);
        p[i] ^= t;
        q[i] ^= t;
      }
    }

    function pack25519(o, n) {
      var i, j, b;
      var m = gf(), t = gf();
      for (i = 0; i < 16; i++) t[i] = n[i];
      car25519(t);
      car25519(t);
      car25519(t);
      for (j = 0; j < 2; j++) {
        m[0] = t[0] - 0xffed;
        for (i = 1; i < 15; i++) {
          m[i] = t[i] - 0xffff - ((m[i-1]>>16) & 1);
          m[i-1] &= 0xffff;
        }
        m[15] = t[15] - 0x7fff - ((m[14]>>16) & 1);
        b = (m[15]>>16) & 1;
        m[14] &= 0xffff;
        sel25519(t, m, 1-b);
      }
      for (i = 0; i < 16; i++) {
        o[2*i] = t[i] & 0xff;
        o[2*i+1] = t[i]>>8;
      }
    }

    function neq25519(a, b) {
      var c = new Uint8Array(32), d = new Uint8Array(32);
      pack25519(c, a);
      pack25519(d, b);
      return crypto_verify_32(c, 0, d, 0);
    }

    function par25519(a) {
      var d = new Uint8Array(32);
      pack25519(d, a);
      return d[0] & 1;
    }

    function unpack25519(o, n) {
      var i;
      for (i = 0; i < 16; i++) o[i] = n[2*i] + (n[2*i+1] << 8);
      o[15] &= 0x7fff;
    }

    function A(o, a, b) {
      for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
    }

    function Z(o, a, b) {
      for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
    }

    function M(o, a, b) {
      var v, c,
         t0 = 0,  t1 = 0,  t2 = 0,  t3 = 0,  t4 = 0,  t5 = 0,  t6 = 0,  t7 = 0,
         t8 = 0,  t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0,
        t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0,
        t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0,
        b0 = b[0],
        b1 = b[1],
        b2 = b[2],
        b3 = b[3],
        b4 = b[4],
        b5 = b[5],
        b6 = b[6],
        b7 = b[7],
        b8 = b[8],
        b9 = b[9],
        b10 = b[10],
        b11 = b[11],
        b12 = b[12],
        b13 = b[13],
        b14 = b[14],
        b15 = b[15];

      v = a[0];
      t0 += v * b0;
      t1 += v * b1;
      t2 += v * b2;
      t3 += v * b3;
      t4 += v * b4;
      t5 += v * b5;
      t6 += v * b6;
      t7 += v * b7;
      t8 += v * b8;
      t9 += v * b9;
      t10 += v * b10;
      t11 += v * b11;
      t12 += v * b12;
      t13 += v * b13;
      t14 += v * b14;
      t15 += v * b15;
      v = a[1];
      t1 += v * b0;
      t2 += v * b1;
      t3 += v * b2;
      t4 += v * b3;
      t5 += v * b4;
      t6 += v * b5;
      t7 += v * b6;
      t8 += v * b7;
      t9 += v * b8;
      t10 += v * b9;
      t11 += v * b10;
      t12 += v * b11;
      t13 += v * b12;
      t14 += v * b13;
      t15 += v * b14;
      t16 += v * b15;
      v = a[2];
      t2 += v * b0;
      t3 += v * b1;
      t4 += v * b2;
      t5 += v * b3;
      t6 += v * b4;
      t7 += v * b5;
      t8 += v * b6;
      t9 += v * b7;
      t10 += v * b8;
      t11 += v * b9;
      t12 += v * b10;
      t13 += v * b11;
      t14 += v * b12;
      t15 += v * b13;
      t16 += v * b14;
      t17 += v * b15;
      v = a[3];
      t3 += v * b0;
      t4 += v * b1;
      t5 += v * b2;
      t6 += v * b3;
      t7 += v * b4;
      t8 += v * b5;
      t9 += v * b6;
      t10 += v * b7;
      t11 += v * b8;
      t12 += v * b9;
      t13 += v * b10;
      t14 += v * b11;
      t15 += v * b12;
      t16 += v * b13;
      t17 += v * b14;
      t18 += v * b15;
      v = a[4];
      t4 += v * b0;
      t5 += v * b1;
      t6 += v * b2;
      t7 += v * b3;
      t8 += v * b4;
      t9 += v * b5;
      t10 += v * b6;
      t11 += v * b7;
      t12 += v * b8;
      t13 += v * b9;
      t14 += v * b10;
      t15 += v * b11;
      t16 += v * b12;
      t17 += v * b13;
      t18 += v * b14;
      t19 += v * b15;
      v = a[5];
      t5 += v * b0;
      t6 += v * b1;
      t7 += v * b2;
      t8 += v * b3;
      t9 += v * b4;
      t10 += v * b5;
      t11 += v * b6;
      t12 += v * b7;
      t13 += v * b8;
      t14 += v * b9;
      t15 += v * b10;
      t16 += v * b11;
      t17 += v * b12;
      t18 += v * b13;
      t19 += v * b14;
      t20 += v * b15;
      v = a[6];
      t6 += v * b0;
      t7 += v * b1;
      t8 += v * b2;
      t9 += v * b3;
      t10 += v * b4;
      t11 += v * b5;
      t12 += v * b6;
      t13 += v * b7;
      t14 += v * b8;
      t15 += v * b9;
      t16 += v * b10;
      t17 += v * b11;
      t18 += v * b12;
      t19 += v * b13;
      t20 += v * b14;
      t21 += v * b15;
      v = a[7];
      t7 += v * b0;
      t8 += v * b1;
      t9 += v * b2;
      t10 += v * b3;
      t11 += v * b4;
      t12 += v * b5;
      t13 += v * b6;
      t14 += v * b7;
      t15 += v * b8;
      t16 += v * b9;
      t17 += v * b10;
      t18 += v * b11;
      t19 += v * b12;
      t20 += v * b13;
      t21 += v * b14;
      t22 += v * b15;
      v = a[8];
      t8 += v * b0;
      t9 += v * b1;
      t10 += v * b2;
      t11 += v * b3;
      t12 += v * b4;
      t13 += v * b5;
      t14 += v * b6;
      t15 += v * b7;
      t16 += v * b8;
      t17 += v * b9;
      t18 += v * b10;
      t19 += v * b11;
      t20 += v * b12;
      t21 += v * b13;
      t22 += v * b14;
      t23 += v * b15;
      v = a[9];
      t9 += v * b0;
      t10 += v * b1;
      t11 += v * b2;
      t12 += v * b3;
      t13 += v * b4;
      t14 += v * b5;
      t15 += v * b6;
      t16 += v * b7;
      t17 += v * b8;
      t18 += v * b9;
      t19 += v * b10;
      t20 += v * b11;
      t21 += v * b12;
      t22 += v * b13;
      t23 += v * b14;
      t24 += v * b15;
      v = a[10];
      t10 += v * b0;
      t11 += v * b1;
      t12 += v * b2;
      t13 += v * b3;
      t14 += v * b4;
      t15 += v * b5;
      t16 += v * b6;
      t17 += v * b7;
      t18 += v * b8;
      t19 += v * b9;
      t20 += v * b10;
      t21 += v * b11;
      t22 += v * b12;
      t23 += v * b13;
      t24 += v * b14;
      t25 += v * b15;
      v = a[11];
      t11 += v * b0;
      t12 += v * b1;
      t13 += v * b2;
      t14 += v * b3;
      t15 += v * b4;
      t16 += v * b5;
      t17 += v * b6;
      t18 += v * b7;
      t19 += v * b8;
      t20 += v * b9;
      t21 += v * b10;
      t22 += v * b11;
      t23 += v * b12;
      t24 += v * b13;
      t25 += v * b14;
      t26 += v * b15;
      v = a[12];
      t12 += v * b0;
      t13 += v * b1;
      t14 += v * b2;
      t15 += v * b3;
      t16 += v * b4;
      t17 += v * b5;
      t18 += v * b6;
      t19 += v * b7;
      t20 += v * b8;
      t21 += v * b9;
      t22 += v * b10;
      t23 += v * b11;
      t24 += v * b12;
      t25 += v * b13;
      t26 += v * b14;
      t27 += v * b15;
      v = a[13];
      t13 += v * b0;
      t14 += v * b1;
      t15 += v * b2;
      t16 += v * b3;
      t17 += v * b4;
      t18 += v * b5;
      t19 += v * b6;
      t20 += v * b7;
      t21 += v * b8;
      t22 += v * b9;
      t23 += v * b10;
      t24 += v * b11;
      t25 += v * b12;
      t26 += v * b13;
      t27 += v * b14;
      t28 += v * b15;
      v = a[14];
      t14 += v * b0;
      t15 += v * b1;
      t16 += v * b2;
      t17 += v * b3;
      t18 += v * b4;
      t19 += v * b5;
      t20 += v * b6;
      t21 += v * b7;
      t22 += v * b8;
      t23 += v * b9;
      t24 += v * b10;
      t25 += v * b11;
      t26 += v * b12;
      t27 += v * b13;
      t28 += v * b14;
      t29 += v * b15;
      v = a[15];
      t15 += v * b0;
      t16 += v * b1;
      t17 += v * b2;
      t18 += v * b3;
      t19 += v * b4;
      t20 += v * b5;
      t21 += v * b6;
      t22 += v * b7;
      t23 += v * b8;
      t24 += v * b9;
      t25 += v * b10;
      t26 += v * b11;
      t27 += v * b12;
      t28 += v * b13;
      t29 += v * b14;
      t30 += v * b15;

      t0  += 38 * t16;
      t1  += 38 * t17;
      t2  += 38 * t18;
      t3  += 38 * t19;
      t4  += 38 * t20;
      t5  += 38 * t21;
      t6  += 38 * t22;
      t7  += 38 * t23;
      t8  += 38 * t24;
      t9  += 38 * t25;
      t10 += 38 * t26;
      t11 += 38 * t27;
      t12 += 38 * t28;
      t13 += 38 * t29;
      t14 += 38 * t30;
      // t15 left as is

      // first car
      c = 1;
      v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
      v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
      v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
      v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
      v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
      v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
      v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
      v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
      v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
      v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
      v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
      v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
      v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
      v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
      v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
      v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
      t0 += c-1 + 37 * (c-1);

      // second car
      c = 1;
      v =  t0 + c + 65535; c = Math.floor(v / 65536);  t0 = v - c * 65536;
      v =  t1 + c + 65535; c = Math.floor(v / 65536);  t1 = v - c * 65536;
      v =  t2 + c + 65535; c = Math.floor(v / 65536);  t2 = v - c * 65536;
      v =  t3 + c + 65535; c = Math.floor(v / 65536);  t3 = v - c * 65536;
      v =  t4 + c + 65535; c = Math.floor(v / 65536);  t4 = v - c * 65536;
      v =  t5 + c + 65535; c = Math.floor(v / 65536);  t5 = v - c * 65536;
      v =  t6 + c + 65535; c = Math.floor(v / 65536);  t6 = v - c * 65536;
      v =  t7 + c + 65535; c = Math.floor(v / 65536);  t7 = v - c * 65536;
      v =  t8 + c + 65535; c = Math.floor(v / 65536);  t8 = v - c * 65536;
      v =  t9 + c + 65535; c = Math.floor(v / 65536);  t9 = v - c * 65536;
      v = t10 + c + 65535; c = Math.floor(v / 65536); t10 = v - c * 65536;
      v = t11 + c + 65535; c = Math.floor(v / 65536); t11 = v - c * 65536;
      v = t12 + c + 65535; c = Math.floor(v / 65536); t12 = v - c * 65536;
      v = t13 + c + 65535; c = Math.floor(v / 65536); t13 = v - c * 65536;
      v = t14 + c + 65535; c = Math.floor(v / 65536); t14 = v - c * 65536;
      v = t15 + c + 65535; c = Math.floor(v / 65536); t15 = v - c * 65536;
      t0 += c-1 + 37 * (c-1);

      o[ 0] = t0;
      o[ 1] = t1;
      o[ 2] = t2;
      o[ 3] = t3;
      o[ 4] = t4;
      o[ 5] = t5;
      o[ 6] = t6;
      o[ 7] = t7;
      o[ 8] = t8;
      o[ 9] = t9;
      o[10] = t10;
      o[11] = t11;
      o[12] = t12;
      o[13] = t13;
      o[14] = t14;
      o[15] = t15;
    }

    function S(o, a) {
      M(o, a, a);
    }

    function inv25519(o, i) {
      var c = gf();
      var a;
      for (a = 0; a < 16; a++) c[a] = i[a];
      for (a = 253; a >= 0; a--) {
        S(c, c);
        if(a !== 2 && a !== 4) M(c, c, i);
      }
      for (a = 0; a < 16; a++) o[a] = c[a];
    }

    function pow2523(o, i) {
      var c = gf();
      var a;
      for (a = 0; a < 16; a++) c[a] = i[a];
      for (a = 250; a >= 0; a--) {
          S(c, c);
          if(a !== 1) M(c, c, i);
      }
      for (a = 0; a < 16; a++) o[a] = c[a];
    }

    function crypto_scalarmult(q, n, p) {
      check(q, crypto_scalarmult_BYTES);
      check(n, crypto_scalarmult_SCALARBYTES);
      check(p, crypto_scalarmult_BYTES);
      var z = new Uint8Array(32);
      var x = new Float64Array(80), r, i;
      var a = gf(), b = gf(), c = gf(),
          d = gf(), e = gf(), f = gf();
      for (i = 0; i < 31; i++) z[i] = n[i];
      z[31]=(n[31]&127)|64;
      z[0]&=248;
      unpack25519(x,p);
      for (i = 0; i < 16; i++) {
        b[i]=x[i];
        d[i]=a[i]=c[i]=0;
      }
      a[0]=d[0]=1;
      for (i=254; i>=0; --i) {
        r=(z[i>>>3]>>>(i&7))&1;
        sel25519(a,b,r);
        sel25519(c,d,r);
        A(e,a,c);
        Z(a,a,c);
        A(c,b,d);
        Z(b,b,d);
        S(d,e);
        S(f,a);
        M(a,c,a);
        M(c,b,e);
        A(e,a,c);
        Z(a,a,c);
        S(b,a);
        Z(c,d,f);
        M(a,c,_121665);
        A(a,a,d);
        M(c,c,a);
        M(a,d,f);
        M(d,b,x);
        S(b,e);
        sel25519(a,b,r);
        sel25519(c,d,r);
      }
      for (i = 0; i < 16; i++) {
        x[i+16]=a[i];
        x[i+32]=c[i];
        x[i+48]=b[i];
        x[i+64]=d[i];
      }
      var x32 = x.subarray(32);
      var x16 = x.subarray(16);
      inv25519(x32,x32);
      M(x16,x16,x32);
      pack25519(q,x16);
      return 0;
    }

    function crypto_scalarmult_base(q, n) {
      return crypto_scalarmult(q, n, _9);
    }

    var K = [
      0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
      0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
      0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
      0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
      0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
      0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
      0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
      0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
      0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
      0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
      0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
      0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
      0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
      0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
      0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
      0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
      0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
      0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
      0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
      0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
      0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
      0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
      0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
      0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
      0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
      0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
      0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
      0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
      0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
      0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
      0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
      0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
      0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
      0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
      0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
      0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
      0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
      0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
      0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
      0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
    ];

    function crypto_hashblocks_hl(hh, hl, m, n) {
      var wh = new Int32Array(16), wl = new Int32Array(16),
          bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7,
          bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7,
          th, tl, i, j, h, l, a, b, c, d;

      var ah0 = hh[0],
          ah1 = hh[1],
          ah2 = hh[2],
          ah3 = hh[3],
          ah4 = hh[4],
          ah5 = hh[5],
          ah6 = hh[6],
          ah7 = hh[7],

          al0 = hl[0],
          al1 = hl[1],
          al2 = hl[2],
          al3 = hl[3],
          al4 = hl[4],
          al5 = hl[5],
          al6 = hl[6],
          al7 = hl[7];

      var pos = 0;
      while (n >= 128) {
        for (i = 0; i < 16; i++) {
          j = 8 * i + pos;
          wh[i] = (m[j+0] << 24) | (m[j+1] << 16) | (m[j+2] << 8) | m[j+3];
          wl[i] = (m[j+4] << 24) | (m[j+5] << 16) | (m[j+6] << 8) | m[j+7];
        }
        for (i = 0; i < 80; i++) {
          bh0 = ah0;
          bh1 = ah1;
          bh2 = ah2;
          bh3 = ah3;
          bh4 = ah4;
          bh5 = ah5;
          bh6 = ah6;
          bh7 = ah7;

          bl0 = al0;
          bl1 = al1;
          bl2 = al2;
          bl3 = al3;
          bl4 = al4;
          bl5 = al5;
          bl6 = al6;
          bl7 = al7;

          // add
          h = ah7;
          l = al7;

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          // Sigma1
          h = ((ah4 >>> 14) | (al4 << (32-14))) ^ ((ah4 >>> 18) | (al4 << (32-18))) ^ ((al4 >>> (41-32)) | (ah4 << (32-(41-32))));
          l = ((al4 >>> 14) | (ah4 << (32-14))) ^ ((al4 >>> 18) | (ah4 << (32-18))) ^ ((ah4 >>> (41-32)) | (al4 << (32-(41-32))));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // Ch
          h = (ah4 & ah5) ^ (~ah4 & ah6);
          l = (al4 & al5) ^ (~al4 & al6);

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // K
          h = K[i*2];
          l = K[i*2+1];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // w
          h = wh[i%16];
          l = wl[i%16];

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          th = c & 0xffff | d << 16;
          tl = a & 0xffff | b << 16;

          // add
          h = th;
          l = tl;

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          // Sigma0
          h = ((ah0 >>> 28) | (al0 << (32-28))) ^ ((al0 >>> (34-32)) | (ah0 << (32-(34-32)))) ^ ((al0 >>> (39-32)) | (ah0 << (32-(39-32))));
          l = ((al0 >>> 28) | (ah0 << (32-28))) ^ ((ah0 >>> (34-32)) | (al0 << (32-(34-32)))) ^ ((ah0 >>> (39-32)) | (al0 << (32-(39-32))));

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          // Maj
          h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
          l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          bh7 = (c & 0xffff) | (d << 16);
          bl7 = (a & 0xffff) | (b << 16);

          // add
          h = bh3;
          l = bl3;

          a = l & 0xffff; b = l >>> 16;
          c = h & 0xffff; d = h >>> 16;

          h = th;
          l = tl;

          a += l & 0xffff; b += l >>> 16;
          c += h & 0xffff; d += h >>> 16;

          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;

          bh3 = (c & 0xffff) | (d << 16);
          bl3 = (a & 0xffff) | (b << 16);

          ah1 = bh0;
          ah2 = bh1;
          ah3 = bh2;
          ah4 = bh3;
          ah5 = bh4;
          ah6 = bh5;
          ah7 = bh6;
          ah0 = bh7;

          al1 = bl0;
          al2 = bl1;
          al3 = bl2;
          al4 = bl3;
          al5 = bl4;
          al6 = bl5;
          al7 = bl6;
          al0 = bl7;

          if (i%16 === 15) {
            for (j = 0; j < 16; j++) {
              // add
              h = wh[j];
              l = wl[j];

              a = l & 0xffff; b = l >>> 16;
              c = h & 0xffff; d = h >>> 16;

              h = wh[(j+9)%16];
              l = wl[(j+9)%16];

              a += l & 0xffff; b += l >>> 16;
              c += h & 0xffff; d += h >>> 16;

              // sigma0
              th = wh[(j+1)%16];
              tl = wl[(j+1)%16];
              h = ((th >>> 1) | (tl << (32-1))) ^ ((th >>> 8) | (tl << (32-8))) ^ (th >>> 7);
              l = ((tl >>> 1) | (th << (32-1))) ^ ((tl >>> 8) | (th << (32-8))) ^ ((tl >>> 7) | (th << (32-7)));

              a += l & 0xffff; b += l >>> 16;
              c += h & 0xffff; d += h >>> 16;

              // sigma1
              th = wh[(j+14)%16];
              tl = wl[(j+14)%16];
              h = ((th >>> 19) | (tl << (32-19))) ^ ((tl >>> (61-32)) | (th << (32-(61-32)))) ^ (th >>> 6);
              l = ((tl >>> 19) | (th << (32-19))) ^ ((th >>> (61-32)) | (tl << (32-(61-32)))) ^ ((tl >>> 6) | (th << (32-6)));

              a += l & 0xffff; b += l >>> 16;
              c += h & 0xffff; d += h >>> 16;

              b += a >>> 16;
              c += b >>> 16;
              d += c >>> 16;

              wh[j] = (c & 0xffff) | (d << 16);
              wl[j] = (a & 0xffff) | (b << 16);
            }
          }
        }

        // add
        h = ah0;
        l = al0;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[0];
        l = hl[0];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[0] = ah0 = (c & 0xffff) | (d << 16);
        hl[0] = al0 = (a & 0xffff) | (b << 16);

        h = ah1;
        l = al1;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[1];
        l = hl[1];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[1] = ah1 = (c & 0xffff) | (d << 16);
        hl[1] = al1 = (a & 0xffff) | (b << 16);

        h = ah2;
        l = al2;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[2];
        l = hl[2];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[2] = ah2 = (c & 0xffff) | (d << 16);
        hl[2] = al2 = (a & 0xffff) | (b << 16);

        h = ah3;
        l = al3;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[3];
        l = hl[3];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[3] = ah3 = (c & 0xffff) | (d << 16);
        hl[3] = al3 = (a & 0xffff) | (b << 16);

        h = ah4;
        l = al4;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[4];
        l = hl[4];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[4] = ah4 = (c & 0xffff) | (d << 16);
        hl[4] = al4 = (a & 0xffff) | (b << 16);

        h = ah5;
        l = al5;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[5];
        l = hl[5];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[5] = ah5 = (c & 0xffff) | (d << 16);
        hl[5] = al5 = (a & 0xffff) | (b << 16);

        h = ah6;
        l = al6;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[6];
        l = hl[6];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[6] = ah6 = (c & 0xffff) | (d << 16);
        hl[6] = al6 = (a & 0xffff) | (b << 16);

        h = ah7;
        l = al7;

        a = l & 0xffff; b = l >>> 16;
        c = h & 0xffff; d = h >>> 16;

        h = hh[7];
        l = hl[7];

        a += l & 0xffff; b += l >>> 16;
        c += h & 0xffff; d += h >>> 16;

        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;

        hh[7] = ah7 = (c & 0xffff) | (d << 16);
        hl[7] = al7 = (a & 0xffff) | (b << 16);

        pos += 128;
        n -= 128;
      }

      return n;
    }

    function crypto_hash(out, m, n) {
      var hh = new Int32Array(8),
          hl = new Int32Array(8),
          x = new Uint8Array(256),
          i, b = n;

      hh[0] = 0x6a09e667;
      hh[1] = 0xbb67ae85;
      hh[2] = 0x3c6ef372;
      hh[3] = 0xa54ff53a;
      hh[4] = 0x510e527f;
      hh[5] = 0x9b05688c;
      hh[6] = 0x1f83d9ab;
      hh[7] = 0x5be0cd19;

      hl[0] = 0xf3bcc908;
      hl[1] = 0x84caa73b;
      hl[2] = 0xfe94f82b;
      hl[3] = 0x5f1d36f1;
      hl[4] = 0xade682d1;
      hl[5] = 0x2b3e6c1f;
      hl[6] = 0xfb41bd6b;
      hl[7] = 0x137e2179;

      crypto_hashblocks_hl(hh, hl, m, n);
      n %= 128;

      for (i = 0; i < n; i++) x[i] = m[b-n+i];
      x[n] = 128;

      n = 256-128*(n<112?1:0);
      x[n-9] = 0;
      ts64(x, n-8,  (b / 0x20000000) | 0, b << 3);
      crypto_hashblocks_hl(hh, hl, x, n);

      for (i = 0; i < 8; i++) ts64(out, 8*i, hh[i], hl[i]);

      return 0;
    }

    function add(p, q) {
      var a = gf(), b = gf(), c = gf(),
          d = gf(), e = gf(), f = gf(),
          g = gf(), h = gf(), t = gf();

      Z(a, p[1], p[0]);
      Z(t, q[1], q[0]);
      M(a, a, t);
      A(b, p[0], p[1]);
      A(t, q[0], q[1]);
      M(b, b, t);
      M(c, p[3], q[3]);
      M(c, c, D2);
      M(d, p[2], q[2]);
      A(d, d, d);
      Z(e, b, a);
      Z(f, d, c);
      A(g, d, c);
      A(h, b, a);

      M(p[0], e, f);
      M(p[1], h, g);
      M(p[2], g, f);
      M(p[3], e, h);
    }

    function cswap(p, q, b) {
      var i;
      for (i = 0; i < 4; i++) {
        sel25519(p[i], q[i], b);
      }
    }

    function pack(r, p) {
      var tx = gf(), ty = gf(), zi = gf();
      inv25519(zi, p[2]);
      M(tx, p[0], zi);
      M(ty, p[1], zi);
      pack25519(r, ty);
      r[31] ^= par25519(tx) << 7;
    }

    function scalarmult(p, q, s) {
      var b, i;
      set25519(p[0], gf0);
      set25519(p[1], gf1);
      set25519(p[2], gf1);
      set25519(p[3], gf0);
      for (i = 255; i >= 0; --i) {
        b = (s[(i/8)|0] >> (i&7)) & 1;
        cswap(p, q, b);
        add(q, p);
        add(p, p);
        cswap(p, q, b);
      }
    }

    function scalarbase(p, s) {
      var q = [gf(), gf(), gf(), gf()];
      set25519(q[0], X);
      set25519(q[1], Y);
      set25519(q[2], gf1);
      M(q[3], X, Y);
      scalarmult(p, q, s);
    }

    function crypto_sign_keypair(pk, sk, seeded) {
      check(pk, sodium.crypto_sign_PUBLICKEYBYTES);
      check(sk, sodium.crypto_sign_SECRETKEYBYTES);

      var d = new Uint8Array(64);
      var p = [gf(), gf(), gf(), gf()];
      var i;

      if (!seeded) randombytes(sk, 32);
      crypto_hash(d, sk, 32);
      d[0] &= 248;
      d[31] &= 127;
      d[31] |= 64;

      scalarbase(p, d);
      pack(pk, p);

      for (i = 0; i < 32; i++) sk[i+32] = pk[i];
      return 0;
    }

    function crypto_sign_seed_keypair (pk, sk, seed) {
      check(seed, sodium.crypto_sign_SEEDBYTES);
      seed.copy(sk);
      crypto_sign_keypair(pk, sk, true);
    }

    var L = new Float64Array([0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde, 0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10]);

    function modL(r, x) {
      var carry, i, j, k;
      for (i = 63; i >= 32; --i) {
        carry = 0;
        for (j = i - 32, k = i - 12; j < k; ++j) {
          x[j] += carry - 16 * x[i] * L[j - (i - 32)];
          carry = (x[j] + 128) >> 8;
          x[j] -= carry * 256;
        }
        x[j] += carry;
        x[i] = 0;
      }
      carry = 0;
      for (j = 0; j < 32; j++) {
        x[j] += carry - (x[31] >> 4) * L[j];
        carry = x[j] >> 8;
        x[j] &= 255;
      }
      for (j = 0; j < 32; j++) x[j] -= carry * L[j];
      for (i = 0; i < 32; i++) {
        x[i+1] += x[i] >> 8;
        r[i] = x[i] & 255;
      }
    }

    function reduce(r) {
      var x = new Float64Array(64), i;
      for (i = 0; i < 64; i++) x[i] = r[i];
      for (i = 0; i < 64; i++) r[i] = 0;
      modL(r, x);
    }

    // Note: difference from C - smlen returned, not passed as argument.
    function crypto_sign(sm, m, sk) {
      check(sm, crypto_sign_BYTES + m.length);
      check(m, 0);
      check(sk, crypto_sign_SECRETKEYBYTES);
      var n = m.length;

      var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
      var i, j, x = new Float64Array(64);
      var p = [gf(), gf(), gf(), gf()];

      crypto_hash(d, sk, 32);
      d[0] &= 248;
      d[31] &= 127;
      d[31] |= 64;
      for (i = 0; i < n; i++) sm[64 + i] = m[i];
      for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];

      crypto_hash(r, sm.subarray(32), n+32);
      reduce(r);
      scalarbase(p, r);
      pack(sm, p);

      for (i = 32; i < 64; i++) sm[i] = sk[i];
      crypto_hash(h, sm, n + 64);
      reduce(h);

      for (i = 0; i < 64; i++) x[i] = 0;
      for (i = 0; i < 32; i++) x[i] = r[i];
      for (i = 0; i < 32; i++) {
        for (j = 0; j < 32; j++) {
          x[i+j] += h[i] * d[j];
        }
      }

      modL(sm.subarray(32), x);
    }

    function crypto_sign_detached(sig, m, sk) {
      var sm = new Uint8Array(m.length + crypto_sign_BYTES);
      crypto_sign(sm, m, sk);
      for (var i = 0; i < crypto_sign_BYTES; i++) sig[i] = sm[i];
    }

    function unpackneg(r, p) {
      var t = gf(), chk = gf(), num = gf(),
          den = gf(), den2 = gf(), den4 = gf(),
          den6 = gf();

      set25519(r[2], gf1);
      unpack25519(r[1], p);
      S(num, r[1]);
      M(den, num, D);
      Z(num, num, r[2]);
      A(den, r[2], den);

      S(den2, den);
      S(den4, den2);
      M(den6, den4, den2);
      M(t, den6, num);
      M(t, t, den);

      pow2523(t, t);
      M(t, t, num);
      M(t, t, den);
      M(t, t, den);
      M(r[0], t, den);

      S(chk, r[0]);
      M(chk, chk, den);
      if (neq25519(chk, num)) M(r[0], r[0], I);

      S(chk, r[0]);
      M(chk, chk, den);
      if (neq25519(chk, num)) return -1;

      if (par25519(r[0]) === (p[31]>>7)) Z(r[0], gf0, r[0]);

      M(r[3], r[0], r[1]);
      return 0;
    }

    function crypto_sign_open(msg, sm, pk) {
      check(msg, sm.length - crypto_sign_BYTES);
      check(sm, crypto_sign_BYTES);
      check(pk, crypto_sign_PUBLICKEYBYTES);
      var n = sm.length;
      var m = new Uint8Array(sm.length);

      var i;
      var t = new Uint8Array(32), h = new Uint8Array(64);
      var p = [gf(), gf(), gf(), gf()],
          q = [gf(), gf(), gf(), gf()];
      if (n < 64) return false;

      if (unpackneg(q, pk)) return false;

      for (i = 0; i < n; i++) m[i] = sm[i];
      for (i = 0; i < 32; i++) m[i+32] = pk[i];
      crypto_hash(h, m, n);
      reduce(h);
      scalarmult(p, q, h);

      scalarbase(q, sm.subarray(32));
      add(p, q);
      pack(t, p);

      n -= 64;
      if (crypto_verify_32(sm, 0, t, 0)) {
        for (i = 0; i < n; i++) m[i] = 0;
        return false;
      }

      for (i = 0; i < n; i++) msg[i] = sm[i + 64];
      return true;
    }

    function crypto_sign_verify_detached (sig, m, pk) {
      check(sig, crypto_sign_BYTES);
      var sm = new Uint8Array(m.length + crypto_sign_BYTES);
      var i = 0;
      for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
      for (i = 0; i < m.length; i++) sm[i + crypto_sign_BYTES] = m[i];
      return crypto_sign_open(m, sm, pk)
    }

    function crypto_secretbox_detached (o, mac, msg, n, k) {
      check(mac, sodium.crypto_secretbox_MACBYTES);
      var tmp = new Uint8Array(msg.length + mac.length);
      crypto_secretbox_easy(tmp, msg, n, k);
      o.set(tmp.subarray(0, msg.length));
      mac.set(tmp.subarray(msg.length));
    }

    function crypto_secretbox_open_detached (msg, o, mac, n, k) {
      check(mac, sodium.crypto_secretbox_MACBYTES);
      var tmp = new Uint8Array(o.length + mac.length);
      tmp.set(o);
      tmp.set(mac, msg.length);
      return crypto_secretbox_open_easy(msg, tmp, n, k)
    }

    function crypto_secretbox_easy(o, msg, n, k) {
      check(msg, 0);
      check(o, msg.length + sodium.crypto_secretbox_MACBYTES);
      check(n, crypto_secretbox_NONCEBYTES);
      check(k, crypto_secretbox_KEYBYTES);

      var i;
      var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
      var c = new Uint8Array(m.length);
      for (i = 0; i < msg.length; i++) m[i+crypto_secretbox_ZEROBYTES] = msg[i];
      crypto_secretbox(c, m, m.length, n, k);
      for (i = crypto_secretbox_BOXZEROBYTES; i < c.length; i++) o[i - crypto_secretbox_BOXZEROBYTES] = c[i];
    }

    function crypto_secretbox_open_easy(msg, box, n, k) {
      check(box, sodium.crypto_secretbox_MACBYTES);
      check(msg, box.length - sodium.crypto_secretbox_MACBYTES);
      check(n, crypto_secretbox_NONCEBYTES);
      check(k, crypto_secretbox_KEYBYTES);

      var i;
      var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
      var m = new Uint8Array(c.length);
      for (i = 0; i < box.length; i++) c[i+crypto_secretbox_BOXZEROBYTES] = box[i];
      if (c.length < 32) return false;
      if (crypto_secretbox_open(m, c, c.length, n, k) !== 0) return false;

      for (i = crypto_secretbox_ZEROBYTES; i < m.length; i++) msg[i - crypto_secretbox_ZEROBYTES] = m[i];
      return true
    }

    function crypto_box_keypair(pk, sk) {
      check(pk, crypto_box_PUBLICKEYBYTES);
      check(sk, crypto_box_SECRETKEYBYTES);
      randombytes(sk, 32);
      return crypto_scalarmult_base(pk, sk)
    }

    function crypto_box_seal(c, m, pk) {
      check(c, crypto_box_SEALBYTES + m.length);
      check(pk, crypto_box_PUBLICKEYBYTES);

      var epk = c.subarray(0, crypto_box_PUBLICKEYBYTES);
      var esk = new Uint8Array(crypto_box_SECRETKEYBYTES);
      crypto_box_keypair(epk, esk);

      var n = new Uint8Array(crypto_box_NONCEBYTES);
      sodium.crypto_generichash_batch(n, [ epk, pk ]);

      var s = new Uint8Array(crypto_box_PUBLICKEYBYTES);
      crypto_scalarmult(s, esk, pk);

      var k = new Uint8Array(crypto_box_BEFORENMBYTES);
      var zero = new Uint8Array(16);
      xsalsa20_1.core_hsalsa20(k, zero, s, xsalsa20_1.SIGMA);

      crypto_secretbox_easy(c.subarray(epk.length), m, n, k);

      cleanup(esk);
    }

    function crypto_box_seal_open(m, c, pk, sk) {
      check(c, crypto_box_SEALBYTES);
      check(m, c.length - crypto_box_SEALBYTES);
      check(pk, crypto_box_PUBLICKEYBYTES);
      check(sk, crypto_box_SECRETKEYBYTES);

      var epk = c.subarray(0, crypto_box_PUBLICKEYBYTES);

      var n = new Uint8Array(crypto_box_NONCEBYTES);
      sodium.crypto_generichash_batch(n, [ epk, pk ]);

      var s = new Uint8Array(crypto_box_PUBLICKEYBYTES);
      crypto_scalarmult(s, sk, epk);

      var k = new Uint8Array(crypto_box_BEFORENMBYTES);
      var zero = new Uint8Array(16);
      xsalsa20_1.core_hsalsa20(k, zero, s, xsalsa20_1.SIGMA);

      return crypto_secretbox_open_easy(m, c.subarray(epk.length), n, k)
    }

    var crypto_secretbox_KEYBYTES = 32,
        crypto_secretbox_NONCEBYTES = 24,
        crypto_secretbox_ZEROBYTES = 32,
        crypto_secretbox_BOXZEROBYTES = 16,
        crypto_scalarmult_BYTES = 32,
        crypto_scalarmult_SCALARBYTES = 32,
        crypto_box_PUBLICKEYBYTES = 32,
        crypto_box_SECRETKEYBYTES = 32,
        crypto_box_BEFORENMBYTES = 32,
        crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES,
        crypto_box_SEALBYTES = 48,
        crypto_box_BEFORENMBYTES = 32,
        crypto_sign_BYTES = 64,
        crypto_sign_PUBLICKEYBYTES = 32,
        crypto_sign_SECRETKEYBYTES = 64,
        crypto_sign_SEEDBYTES = 32;

    sodium.memzero = function (len, offset) {
      for (var i = offset; i < len; i++) arr[i] = 0;
    };

    sodium.crypto_sign_BYTES = crypto_sign_BYTES;
    sodium.crypto_sign_PUBLICKEYBYTES = crypto_sign_PUBLICKEYBYTES;
    sodium.crypto_sign_SECRETKEYBYTES = crypto_sign_SECRETKEYBYTES;
    sodium.crypto_sign_SEEDBYTES = crypto_sign_SEEDBYTES;
    sodium.crypto_sign_keypair = crypto_sign_keypair;
    sodium.crypto_sign_seed_keypair = crypto_sign_seed_keypair;
    sodium.crypto_sign = crypto_sign;
    sodium.crypto_sign_open = crypto_sign_open;
    sodium.crypto_sign_detached = crypto_sign_detached;
    sodium.crypto_sign_verify_detached = crypto_sign_verify_detached;

    forward(crypto_generichash);
    forward(crypto_kdf);
    forward(crypto_shorthash);
    forward(randombytes_1);
    forward(crypto_stream);

    sodium.crypto_scalarmult_BYTES = crypto_scalarmult_BYTES;
    sodium.crypto_scalarmult_SCALARBYTES = crypto_scalarmult_SCALARBYTES;
    sodium.crypto_scalarmult_base = crypto_scalarmult_base;
    sodium.crypto_scalarmult = crypto_scalarmult;

    sodium.crypto_secretbox_KEYBYTES = crypto_secretbox_KEYBYTES,
    sodium.crypto_secretbox_NONCEBYTES = crypto_secretbox_NONCEBYTES,
    sodium.crypto_secretbox_MACBYTES = 16;
    sodium.crypto_secretbox_easy = crypto_secretbox_easy;
    sodium.crypto_secretbox_open_easy = crypto_secretbox_open_easy;
    sodium.crypto_secretbox_detached = crypto_secretbox_detached;
    sodium.crypto_secretbox_open_detached = crypto_secretbox_open_detached;

    sodium.crypto_box_PUBLICKEYBYTES = crypto_box_PUBLICKEYBYTES;
    sodium.crypto_box_SECRETKEYBYTES = crypto_box_SECRETKEYBYTES;
    sodium.crypto_box_SEALBYTES = crypto_box_SEALBYTES;
    sodium.crypto_box_BEFORENMBYTES = crypto_box_BEFORENMBYTES;
    sodium.crypto_box_keypair = crypto_box_keypair;
    sodium.crypto_box_seal = crypto_box_seal;
    sodium.crypto_box_seal_open = crypto_box_seal_open;

    sodium.sodium_malloc = function (n) {
      return new Uint8Array(n)
    };

    function cleanup(arr) {
      for (var i = 0; i < arr.length; i++) arr[i] = 0;
    }

    function check (buf, len) {
      if (!buf || (len && buf.length < len)) throw new Error('Argument must be a buffer' + (len ? ' of length ' + len : ''))
    }

    function forward (submodule) {
      Object.keys(submodule).forEach(function (prop) {
        module.exports[prop] = submodule[prop];
      });
    }
    });

    var browser = sodiumJavascript;

    var codecs_1 = codecs;

    codecs.ascii = createString('ascii');
    codecs.utf8 = createString('utf-8');
    codecs.hex = createString('hex');
    codecs.base64 = createString('base64');
    codecs.ucs2 = createString('ucs2');
    codecs.utf16le = createString('utf16le');
    codecs.ndjson = createJSON(true);
    codecs.json = createJSON(false);
    codecs.binary = {
      encode: function encodeBinary (obj) {
        return typeof obj === 'string' ? Buffer.from(obj, 'utf-8') : obj
      },
      decode: function decodeBinary (buf) {
        return buf
      }
    };

    function codecs (fmt) {
      if (typeof fmt === 'object' && fmt && fmt.encode && fmt.decode) return fmt

      switch (fmt) {
        case 'ndjson': return codecs.ndjson
        case 'json': return codecs.json
        case 'ascii': return codecs.ascii
        case 'utf-8':
        case 'utf8': return codecs.utf8
        case 'hex': return codecs.hex
        case 'base64': return codecs.base64
        case 'ucs-2':
        case 'ucs2': return codecs.ucs2
        case 'utf16-le':
        case 'utf16le': return codecs.utf16le
      }

      return codecs.binary
    }

    function createJSON (newline) {
      return {
        encode: newline ? encodeNDJSON : encodeJSON,
        decode: function decodeJSON (buf) {
          return JSON.parse(buf.toString())
        }
      }

      function encodeJSON (val) {
        return Buffer.from(JSON.stringify(val))
      }

      function encodeNDJSON (val) {
        return Buffer.from(JSON.stringify(val) + '\n')
      }
    }

    function createString (type) {
      return {
        encode: function encodeString (val) {
          if (typeof val !== 'string') val = val.toString();
          return Buffer.from(val, type)
        },
        decode: function decodeString (buf) {
          return buf.toString(type)
        }
      }
    }

    // SPDX-License-Identifier: AGPL-3.0-or-later
    // Copyright © 2020 Tony Ivanov <telamohn@pm.me>

    /* eslint-disable camelcase */
    const {
      crypto_sign_BYTES,
      crypto_sign_SECRETKEYBYTES,
      crypto_sign_PUBLICKEYBYTES,
      crypto_sign_detached,
      crypto_sign_verify_detached,
      crypto_sign_keypair
    } = browser;
    /* eslint-enable camelcase */



    var picofeed = class PicoFeed {
      static get MAX_FEED_SIZE () { return 64 << 10 } // 64 kilo byte
      static get INITIAL_FEED_SIZE () { return 1 << 10 } // 1 kilo byte
      static get PICKLE () { return Buffer.from('PIC0.') } // Buffer.from('🥒', 'utf8') }
      static get KEY () { return Buffer.from('K0.') } // Buffer.from('f09f979d', 'hex') }
      // consensus? pft! whoever can fit the most kittens into
      // a single bottle is obviously the winner.
      static get BLOCK () { return Buffer.from('B0.') } // Buffer.from('🐈', 'utf8') }
      static get SIGNATURE_SIZE () { return crypto_sign_BYTES } // eslint-disable-line camelcase
      static get COUNTER_SIZE () { return 4 } // Sizeof UInt32BE
      static get META_SIZE () { return PicoFeed.SIGNATURE_SIZE * 2 + PicoFeed.COUNTER_SIZE }

      constructor (opts = {}) {
        this.tail = 0; // Tail always points to next empty space
        this._lastBlockOffset = 0; // Ptr to start of last block

        const enc = opts.contentEncoding || 'utf8';
        this.encoding = codecs_1(enc === 'json' ? 'ndjson' : enc);

        this.buf = Buffer.alloc(opts.initialSize || PicoFeed.INITIAL_FEED_SIZE);
      }

      static signPair () {
        const sk = Buffer.allocUnsafe(crypto_sign_SECRETKEYBYTES);
        const pk = Buffer.allocUnsafe(crypto_sign_PUBLICKEYBYTES);
        crypto_sign_keypair(pk, sk);
        return { sk, pk }
      }

      _appendKey (data) {
        this._ensureMinimumCapacity(this.tail + PicoFeed.KEY.length + data.length);
        this.tail += PicoFeed.KEY.copy(this.buf, this.tail);
        this.tail += data.copy(this.buf, this.tail);
      }

      _appendBlock (chunk) {
        this._ensureMinimumCapacity(this.tail + chunk.length);
        this._lastBlockOffset = this.tail;
        this.tail += chunk.copy(this.buf, this.tail);
      }

      get free () { return PicoFeed.MAX_FEED_SIZE - this.tail }

      static dstructBlock (buf, start = 0) {
        /**
         * Block layout
         *  ___________
         * | Signature | <----------.
         * |-----------|             '.
         * | ParentSig | -.            '.
         * |-----------|  |- HEADR ---.  '.
         * | Body Size | -'           |    '.
         * |-----------|              |--> Sign(skey, data)
         * |           |              |
         * | Body BLOB | -------------'
         * |           |
         * `-----------'
         */
        const SIG_N = PicoFeed.SIGNATURE_SIZE;
        const COUNT_N = PicoFeed.COUNTER_SIZE;
        const HDR_N = SIG_N + COUNT_N;
        const mapper = {
          get start () { return start },
          get sig () { return buf.subarray(start, start + SIG_N) },
          get header () { return buf.subarray(start + SIG_N, start + SIG_N + HDR_N) },
          get parentSig () { return buf.subarray(start + SIG_N, start + SIG_N + SIG_N) },

          // Unsafe size read, use validateRead to ensure that you're reading a block.
          get size () { return buf.readUInt32BE(start + SIG_N * 2) },
          set size (v) {
            if (typeof v !== 'number' || v < 0 || v + start + SIG_N + HDR_N > buf.length) throw new Error('Invalid blob size')
            return buf.writeUInt32BE(v, start + SIG_N * 2)
          },
          get body () {
            return buf.subarray(start + SIG_N + HDR_N, mapper.safeEnd)
          },
          get dat () {
            return buf.subarray(start + SIG_N, mapper.safeEnd)
          },
          get end () { return start + SIG_N + HDR_N + mapper.size },
          get safeEnd () {
            const s = mapper.size;
            if (s < 1) throw new Error('Invalid blob size: ' + s)
            const end = start + SIG_N + HDR_N + s;
            if (end > buf.length) throw new Error('Incomplete or invalid block: end overflows buffer length' + end)
            return end
          },
          // get _unsafeNext () { return PicoFeed.dstructBlock(buf, mapper.end) },
          get next () { return PicoFeed.dstructBlock(buf, mapper.safeEnd) },

          verify (pk) {
            return crypto_sign_verify_detached(mapper.sig, mapper.dat, pk)
          },
          get buffer () { return buf.subarray(start, mapper.safeEnd) }
        };
        return mapper
      }

      _ensureMinimumCapacity (size) {
        if (this.buf.length < size) {
          console.info('Increasing backing buffer to new size:', size);
          const nbuf = Buffer.allocUnsafe(size + 32);
          this.buf.copy(nbuf);
          this.buf = nbuf;
        }
      }

      _ensureKey (pk) {
        for (const k of this.keys) {
          if (pk.equals(k)) return
        }
        this._appendKey(pk);
      }

      get lastBlock () {
        if (!this._lastBlockOffset) return
        return PicoFeed.dstructBlock(this.buf, this._lastBlockOffset)
      }

      append (data, sk, cb) {
        if (!sk) throw new Error('Can\'t append without a signing secret')
        if (sk.length !== 64) throw new Error('Unknown signature secret key format')
        const pk = sk.slice(32); // this is a libsodium thing
        this._ensureKey(pk);

        const metaSz = PicoFeed.META_SIZE;

        const pBlock = this.lastBlock;

        const encodedMessage = this.encoding.encode(data);
        if (!encodedMessage.length) throw new Error('Encoded data.length is 0')
        const dN = encodedMessage.length; // this.encoding.encodingLength(data)
        const newEnd = this.tail + dN + metaSz;

        // Ensure we're not gonna pass the boundary
        if (PicoFeed.MAX_FEED_SIZE < newEnd) {
          console.error('NOFIT', this.tail, dN, metaSz);
          throw new Error('MAX_FEED_SIZE reached, block won\'t fit:' + newEnd)
        }

        // Resize current buffer if needed
        this._ensureMinimumCapacity(newEnd);

        const map = PicoFeed.dstructBlock(this.buf, this.tail);
        // Debug
        // map.header.fill('H')
        // map.size = dN
        // map.body.fill('B')
        // map.sig.fill('S')
        // map.parentSig.fill('P')

        map.header.fill(0); // Zero out the header
        map.size = dN;

        // Can't use inplace encoding due to encoding.encodingLength() not
        // being always available, have to fallback on copying.
        // this.encoding.encode(data, map.body)
        encodedMessage.copy(map.body);

        if (pBlock) { // Origin blocks are origins.
          pBlock.sig.copy(map.parentSig);
        }

        crypto_sign_detached(map.sig, map.dat, sk);
        // sanity check.
        if (!map.verify(pk)) throw new Error('newly stored block is invalid. something went wrong')
        this._lastBlockOffset = this.tail;
        this.tail = newEnd;

        // This method isn't async but we'll honour the old ways
        if (typeof cb === 'function') cb(null, this.length);
        return this.length
      }

      /* This generator is pretty magic,
       * we're traversing the buffer and validating it
       * in one sweep. For optimization, properties
       * like length could be cached using a dirty flag.
       */
      * _index () {
        let offset = 0;
        // vars for key parsing
        const kchain = [];
        const ktok = PicoFeed.KEY;
        const KEY_SZ = 32;
        // vars for block parsing
        let prevSig = null;
        let blockIdx = 0;
        while (true) {
          if (offset >= this.tail) return

          if (offset + ktok.length > this.buf.length) return
          const isKey = ktok.equals(this.buf.slice(offset, offset + ktok.length));

          if (isKey) {
            const key = this.buf.slice(offset + ktok.length, offset + ktok.length + KEY_SZ);
            yield { type: 0, id: kchain.length, key: key, offset };
            kchain.push(key);
            offset += ktok.length + KEY_SZ;
          } else {
            const block = PicoFeed.dstructBlock(this.buf, offset);
            if (block.size === 0) return
            if (offset + block.size > this.buf.length) return

            // First block should have empty parentSig
            if (!blockIdx && !block.parentSig.equals(Buffer.alloc(64))) return

            // Consequent blocks must state correct parent.
            if (blockIdx && !prevSig.equals(block.parentSig)) return
            let valid = false;
            for (let i = kchain.length - 1; i >= 0; i--) {
              valid = block.verify(kchain[i]);
              if (!valid) continue
              yield { type: 1, id: blockIdx++, block, offset, key: kchain[i] };
              prevSig = block.sig;
              offset = block.end;
              break
            }
            if (!valid) return // chain of trust broken
          }
        }
      }

      get length () {
        let i = 0;
        for (const { type } of this._index()) if (type) i++;
        return i
      }

      toString () { return this.pickle() }

      pickle () {
        let str = encodeURIComponent(PicoFeed.PICKLE.toString('utf8'));
        const kToken = PicoFeed.KEY;
        const bToken = PicoFeed.BLOCK;
        for (const fact of this._index()) {
          str += !fact.type ? kToken + b2ub(fact.key)
            : bToken + b2ub(fact.block.buffer);
        }
        return str
      }

      // Unpickle
      _unpack (str) {
        if (!str) throw new Error('Missing first argument')
        if (typeof str !== 'string') throw new Error('url-friendly string expected')
        // TODO: re-engineer for efficiency
        const pToken = encodeURIComponent(PicoFeed.PICKLE);
        const kToken = encodeURIComponent(PicoFeed.KEY);
        const bToken = encodeURIComponent(PicoFeed.BLOCK);
        const pickleOffset = str.indexOf(pToken);
        if (pickleOffset === -1) throw new Error('NotPickleError')
        let o = pToken.length + pickleOffset;
        let kM = 0;
        let bM = 0;
        let type = -1;
        let start = -1;
        const processChunk = () => {
          if (type !== -1) {
            const chunk = decodeURIComponent(str.substr(start, o - start - bM - kM + 1));
            if (!type) { // Unpack Public Sign Key
              const key = ub2b(chunk);
              if (key.length !== 32) throw new Error('PSIG key wrong size: ')
              this._appendKey(key); // modifies tail
            } else { // Unpack Block
              this._appendBlock(ub2b(chunk));
            }
            type = -1; // for sanity, not needed.
          }
          start = o + 1;
          type = kM ? 0 : 1;
          kM = bM = 0;
        };

        while (o < str.length) {
          if (str[o] === kToken[kM]) {
            if (++kM === kToken.length) processChunk();
          } else kM = 0;

          if (str[o] === bToken[bM]) {
            if (++bM === bToken.length) processChunk();
          } else bM = 0;
          o++;
        }
        processChunk();
      }

      get (idx) {
        if (idx < 0) throw new Error('Positive integer expected')
        for (const { type, block } of this._index()) {
          if (type && !idx--) return this.encoding.decode(block.body)
        }
        throw new Error('NotFoundError')
      }

      // Truncating is a lot faster
      // than spawning a new feed.
      truncate (toLength) {
        if (toLength === 0) { // Empty the feed
          this.tail = 0;
          this._lastBlockOffset = 0;
          return true
        }

        const o = this.tail;
        for (const { type, block } of this._index()) {
          if (type && !--toLength) {
            this.tail = block.end;
            this._lastBlockOffset = block.start;
            break
          } else if (toLength < 0) break
        }
        return o !== this.tail
      }

      get keys () {
        const itr = this._index();
        function * filter () {
          for (const { type, key } of itr) if (!type) yield key;
        }
        return filter()
      }

      blocks (slice = 0) {
        const itr = this._index();
        function * filter () {
          for (const { type, block, key } of itr) if (type && --slice < 0) yield { block, key };
        }
        return filter()
      }

      /*
       * @param source something that from() can convert into feed.
       * @return {boolean} true if source is/was merged, false if unmergable
       */
      merge (source, forceCopy = false) {
        if (!source) throw new Error('First argument `source` expected by merge')
        const other = PicoFeed.from(source);

        // If we're empty then we'll just use theirs
        if (!this.length) {
          if (forceCopy) {
            this.buf = Buffer.alloc(other.buf.length);
            other.buf.copy(this.buf);
          } else {
            this.buf = other.buf;
          }
          this.tail = other.tail;
          this._lastBlockOffset = other._lastBlockOffset;
          // TODO: this.validate? or has it been validated already?
          return true
        }

        // Expected 2½ outcomes.
        // 1. conflict, no merge, abort mission
        // 2.a) no conflict, no new blocks, abort.
        // 2.b) no conflict, new blocks, copy + validate?
        try {
          const s = this._compare(other);
          if (s < 1) return true
          for (const { key, block } of other.blocks(other.length - 1)) {
            this._ensureKey(key);
            this._appendBlock(block.buffer);
          }
        } catch (err) {
          switch (err.type) {
            case 'BlockConflict':
            case 'NoCommonParent':
              return false
          }
          throw err
        }
      }

      /* How to look at counters
       *
       * A  0  1  2  3
       * K0 B1 B2 B3 B4
       * K0       B3 B4 B5 B6  (slice of a pickle)
       * B        0  1  2  3
       *
       * A  0  1  2  3
       * K0 B1 B2 B3 B4
       * K0 B1 B2 B3 B4 B5 B6
       * B  0  1  2  3  4  5
       *
       */
      _compare (other) {
        if (this === other) return 0
        const counters = [-1, -1];
        const iterators = [this._index(), other._index()];
        const blocks = [];
        const eof = [false, false];
        const parents = [];

        // Define a single step.
        const step = (chain) => { // until block
          if (blocks[chain]) parents[chain] = blocks[chain].sig;
          blocks[chain] = null;
          while (!blocks[chain] && !eof[chain]) {
            const n = iterators[chain].next();
            eof[chain] = eof[chain] || n.done;
            if (n.done && typeof n.value === 'undefined') break // Iterating an empty list..

            if (n.value.type) {
              counters[chain]++;
              blocks[chain] = n.value.block;
            }
          }
        };

        const fastForward = chain => {
          const c = counters[chain] - 1;
          while (blocks[chain]) step(chain);
          return counters[chain] - c
        };

        const A = 0;
        const B = 1;

        const mkErr = text => {
          const err = new Error(text);
          err.type = text;
          err.idxA = counters[A];
          err.idxB = counters[B];
          return err
        };

        // 1. Find common parent / align B to A
        step(B);
        if (!blocks[B]) return -fastForward(A) // No new blocks no conflicts
        const target = blocks[B].parentSig;
        while (!eof[A]) {
          step(A);
          if (!blocks[A]) break
          if (blocks[A].parentSig.equals(target)) break
        }

        if (!blocks[A]) throw mkErr('NoCommonParent') // No common parent! [a: a.length > 0, b: 0]

        // Check if it's the same block
        if (!blocks[A].sig.equals(blocks[B].sig)) throw mkErr('BlockConflict')

        // common parent found!
        if (counters[B] !== counters[A]) console.info('B is a slice of a pickle'); // TODO

        // 2. lockstep the iterators while checking for conflicts.
        while (1) {
          step(A);
          step(B);
          if (blocks[A] && blocks[B]) {
            // check for conflicts.
            if (!blocks[A].sig.equals(blocks[B].sig)) throw mkErr('BlockConflict')
          } else if (!blocks[A] && !blocks[B]) {
            return 0
          } else if (!blocks[A]) {
            // B has some new blocks @ counters[B]
            return fastForward(B)
          } else { // !block[B]
            // No new blocks / B is behind
            return -fastForward(A)
          }
        }
      }

      clone () {
        const f = new PicoFeed({
          contentEncoding: this.encoding,
          initialSize: this.buf.length
        });
        this.buf.copy(f.buf);
        f.tail = this.tail;
        f._lastBlockOffset = this._lastBlockOffset;
        return f
      }

      static isFeed (other) { return other instanceof PicoFeed }

      static from (source, opts = {}) {
        // If URL; pick the hash
        // if string pick the string,
        // if another buffer.. interersting.
        const sif = PicoFeed.isFeed(source);
        const feed = sif ? source : new PicoFeed(opts);
        if (!sif) {
          // Load string
          if (typeof source === 'string') feed._unpack(source);
          // Load URL
          else if (typeof source.hash === 'string') feed._unpack(source.hash);
          // Load buffers
          else if (isBuffer(source)) {
            // Assume buffer contains output from feed.pickle()
            feed._unpack(source.toString('utf8'));

            // We're not handling raw block buffers because you'd need to provide
            // the tail and _lastBlockOffset in order to iterate them.
          }
        }
        return feed
      }
    };
    // Url compatible b64
    function b2ub (b) {
      return b.toString('base64').replace(/\+/, '-').replace(/\//g, '_').replace(/=+$/, '')
    }

    function ub2b (str) {
      str = (str + '===').slice(0, str.length + (str.length % 4));
      str = str.replace(/-/g, '+').replace(/_/g, '/');
      return Buffer.from(str, 'base64')
    }

    var scrypt = createCommonjsModule(function (module, exports) {

    (function(root) {
        const MAX_VALUE = 0x7fffffff;

        // The SHA256 and PBKDF2 implementation are from scrypt-async-js:
        // See: https://github.com/dchest/scrypt-async-js
        function SHA256(m) {
            const K = new Uint32Array([
               0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b,
               0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
               0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7,
               0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
               0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152,
               0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
               0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
               0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
               0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819,
               0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
               0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f,
               0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
               0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
           ]);

            let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
            let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
            const w = new Uint32Array(64);

            function blocks(p) {
                let off = 0, len = p.length;
                while (len >= 64) {
                    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7, u, i, j, t1, t2;

                    for (i = 0; i < 16; i++) {
                        j = off + i*4;
                        w[i] = ((p[j] & 0xff)<<24) | ((p[j+1] & 0xff)<<16) |
                        ((p[j+2] & 0xff)<<8) | (p[j+3] & 0xff);
                    }

                    for (i = 16; i < 64; i++) {
                        u = w[i-2];
                        t1 = ((u>>>17) | (u<<(32-17))) ^ ((u>>>19) | (u<<(32-19))) ^ (u>>>10);

                        u = w[i-15];
                        t2 = ((u>>>7) | (u<<(32-7))) ^ ((u>>>18) | (u<<(32-18))) ^ (u>>>3);

                        w[i] = (((t1 + w[i-7]) | 0) + ((t2 + w[i-16]) | 0)) | 0;
                    }

                    for (i = 0; i < 64; i++) {
                        t1 = ((((((e>>>6) | (e<<(32-6))) ^ ((e>>>11) | (e<<(32-11))) ^
                                 ((e>>>25) | (e<<(32-25)))) + ((e & f) ^ (~e & g))) | 0) +
                              ((h + ((K[i] + w[i]) | 0)) | 0)) | 0;

                        t2 = ((((a>>>2) | (a<<(32-2))) ^ ((a>>>13) | (a<<(32-13))) ^
                               ((a>>>22) | (a<<(32-22)))) + ((a & b) ^ (a & c) ^ (b & c))) | 0;

                        h = g;
                        g = f;
                        f = e;
                        e = (d + t1) | 0;
                        d = c;
                        c = b;
                        b = a;
                        a = (t1 + t2) | 0;
                    }

                    h0 = (h0 + a) | 0;
                    h1 = (h1 + b) | 0;
                    h2 = (h2 + c) | 0;
                    h3 = (h3 + d) | 0;
                    h4 = (h4 + e) | 0;
                    h5 = (h5 + f) | 0;
                    h6 = (h6 + g) | 0;
                    h7 = (h7 + h) | 0;

                    off += 64;
                    len -= 64;
                }
            }

            blocks(m);

            let i, bytesLeft = m.length % 64,
            bitLenHi = (m.length / 0x20000000) | 0,
            bitLenLo = m.length << 3,
            numZeros = (bytesLeft < 56) ? 56 : 120,
            p = m.slice(m.length - bytesLeft, m.length);

            p.push(0x80);
            for (i = bytesLeft + 1; i < numZeros; i++) { p.push(0); }
            p.push((bitLenHi >>> 24) & 0xff);
            p.push((bitLenHi >>> 16) & 0xff);
            p.push((bitLenHi >>> 8)  & 0xff);
            p.push((bitLenHi >>> 0)  & 0xff);
            p.push((bitLenLo >>> 24) & 0xff);
            p.push((bitLenLo >>> 16) & 0xff);
            p.push((bitLenLo >>> 8)  & 0xff);
            p.push((bitLenLo >>> 0)  & 0xff);

            blocks(p);

            return [
                (h0 >>> 24) & 0xff, (h0 >>> 16) & 0xff, (h0 >>> 8) & 0xff, (h0 >>> 0) & 0xff,
                (h1 >>> 24) & 0xff, (h1 >>> 16) & 0xff, (h1 >>> 8) & 0xff, (h1 >>> 0) & 0xff,
                (h2 >>> 24) & 0xff, (h2 >>> 16) & 0xff, (h2 >>> 8) & 0xff, (h2 >>> 0) & 0xff,
                (h3 >>> 24) & 0xff, (h3 >>> 16) & 0xff, (h3 >>> 8) & 0xff, (h3 >>> 0) & 0xff,
                (h4 >>> 24) & 0xff, (h4 >>> 16) & 0xff, (h4 >>> 8) & 0xff, (h4 >>> 0) & 0xff,
                (h5 >>> 24) & 0xff, (h5 >>> 16) & 0xff, (h5 >>> 8) & 0xff, (h5 >>> 0) & 0xff,
                (h6 >>> 24) & 0xff, (h6 >>> 16) & 0xff, (h6 >>> 8) & 0xff, (h6 >>> 0) & 0xff,
                (h7 >>> 24) & 0xff, (h7 >>> 16) & 0xff, (h7 >>> 8) & 0xff, (h7 >>> 0) & 0xff
            ];
        }

        function PBKDF2_HMAC_SHA256_OneIter(password, salt, dkLen) {
            // compress password if it's longer than hash block length
            password = (password.length <= 64) ? password : SHA256(password);

            const innerLen = 64 + salt.length + 4;
            const inner = new Array(innerLen);
            const outerKey = new Array(64);

            let i;
            let dk = [];

            // inner = (password ^ ipad) || salt || counter
            for (i = 0; i < 64; i++) { inner[i] = 0x36; }
            for (i = 0; i < password.length; i++) { inner[i] ^= password[i]; }
            for (i = 0; i < salt.length; i++) { inner[64 + i] = salt[i]; }
            for (i = innerLen - 4; i < innerLen; i++) { inner[i] = 0; }

            // outerKey = password ^ opad
            for (i = 0; i < 64; i++) outerKey[i] = 0x5c;
            for (i = 0; i < password.length; i++) outerKey[i] ^= password[i];

            // increments counter inside inner
            function incrementCounter() {
                for (let i = innerLen - 1; i >= innerLen - 4; i--) {
                    inner[i]++;
                    if (inner[i] <= 0xff) return;
                    inner[i] = 0;
                }
            }

            // output blocks = SHA256(outerKey || SHA256(inner)) ...
            while (dkLen >= 32) {
                incrementCounter();
                dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))));
                dkLen -= 32;
            }
            if (dkLen > 0) {
                incrementCounter();
                dk = dk.concat(SHA256(outerKey.concat(SHA256(inner))).slice(0, dkLen));
            }

            return dk;
        }

        // The following is an adaptation of scryptsy
        // See: https://www.npmjs.com/package/scryptsy
        function blockmix_salsa8(BY, Yi, r, x, _X) {
            let i;

            arraycopy(BY, (2 * r - 1) * 16, _X, 0, 16);
            for (i = 0; i < 2 * r; i++) {
                blockxor(BY, i * 16, _X, 16);
                salsa20_8(_X, x);
                arraycopy(_X, 0, BY, Yi + (i * 16), 16);
            }

            for (i = 0; i < r; i++) {
                arraycopy(BY, Yi + (i * 2) * 16, BY, (i * 16), 16);
            }

            for (i = 0; i < r; i++) {
                arraycopy(BY, Yi + (i * 2 + 1) * 16, BY, (i + r) * 16, 16);
            }
        }

        function R(a, b) {
            return (a << b) | (a >>> (32 - b));
        }

        function salsa20_8(B, x) {
            arraycopy(B, 0, x, 0, 16);

            for (let i = 8; i > 0; i -= 2) {
                x[ 4] ^= R(x[ 0] + x[12], 7);
                x[ 8] ^= R(x[ 4] + x[ 0], 9);
                x[12] ^= R(x[ 8] + x[ 4], 13);
                x[ 0] ^= R(x[12] + x[ 8], 18);
                x[ 9] ^= R(x[ 5] + x[ 1], 7);
                x[13] ^= R(x[ 9] + x[ 5], 9);
                x[ 1] ^= R(x[13] + x[ 9], 13);
                x[ 5] ^= R(x[ 1] + x[13], 18);
                x[14] ^= R(x[10] + x[ 6], 7);
                x[ 2] ^= R(x[14] + x[10], 9);
                x[ 6] ^= R(x[ 2] + x[14], 13);
                x[10] ^= R(x[ 6] + x[ 2], 18);
                x[ 3] ^= R(x[15] + x[11], 7);
                x[ 7] ^= R(x[ 3] + x[15], 9);
                x[11] ^= R(x[ 7] + x[ 3], 13);
                x[15] ^= R(x[11] + x[ 7], 18);
                x[ 1] ^= R(x[ 0] + x[ 3], 7);
                x[ 2] ^= R(x[ 1] + x[ 0], 9);
                x[ 3] ^= R(x[ 2] + x[ 1], 13);
                x[ 0] ^= R(x[ 3] + x[ 2], 18);
                x[ 6] ^= R(x[ 5] + x[ 4], 7);
                x[ 7] ^= R(x[ 6] + x[ 5], 9);
                x[ 4] ^= R(x[ 7] + x[ 6], 13);
                x[ 5] ^= R(x[ 4] + x[ 7], 18);
                x[11] ^= R(x[10] + x[ 9], 7);
                x[ 8] ^= R(x[11] + x[10], 9);
                x[ 9] ^= R(x[ 8] + x[11], 13);
                x[10] ^= R(x[ 9] + x[ 8], 18);
                x[12] ^= R(x[15] + x[14], 7);
                x[13] ^= R(x[12] + x[15], 9);
                x[14] ^= R(x[13] + x[12], 13);
                x[15] ^= R(x[14] + x[13], 18);
            }

            for (let i = 0; i < 16; ++i) {
                B[i] += x[i];
            }
        }

        // naive approach... going back to loop unrolling may yield additional performance
        function blockxor(S, Si, D, len) {
            for (let i = 0; i < len; i++) {
                D[i] ^= S[Si + i];
            }
        }

        function arraycopy(src, srcPos, dest, destPos, length) {
            while (length--) {
                dest[destPos++] = src[srcPos++];
            }
        }

        function checkBufferish(o) {
            if (!o || typeof(o.length) !== 'number') { return false; }

            for (let i = 0; i < o.length; i++) {
                const v = o[i];
                if (typeof(v) !== 'number' || v % 1 || v < 0 || v >= 256) {
                    return false;
                }
            }

            return true;
        }

        function ensureInteger(value, name) {
            if (typeof(value) !== "number" || (value % 1)) { throw new Error('invalid ' + name); }
            return value;
        }

        // N = Cpu cost, r = Memory cost, p = parallelization cost
        // callback(error, progress, key)
        function _scrypt(password, salt, N, r, p, dkLen, callback) {

            N = ensureInteger(N, 'N');
            r = ensureInteger(r, 'r');
            p = ensureInteger(p, 'p');

            dkLen = ensureInteger(dkLen, 'dkLen');

            if (N === 0 || (N & (N - 1)) !== 0) { throw new Error('N must be power of 2'); }

            if (N > MAX_VALUE / 128 / r) { throw new Error('N too large'); }
            if (r > MAX_VALUE / 128 / p) { throw new Error('r too large'); }

            if (!checkBufferish(password)) {
                throw new Error('password must be an array or buffer');
            }
            password = Array.prototype.slice.call(password);

            if (!checkBufferish(salt)) {
                throw new Error('salt must be an array or buffer');
            }
            salt = Array.prototype.slice.call(salt);

            let b = PBKDF2_HMAC_SHA256_OneIter(password, salt, p * 128 * r);
            const B = new Uint32Array(p * 32 * r);
            for (let i = 0; i < B.length; i++) {
                const j = i * 4;
                B[i] = ((b[j + 3] & 0xff) << 24) |
                       ((b[j + 2] & 0xff) << 16) |
                       ((b[j + 1] & 0xff) << 8) |
                       ((b[j + 0] & 0xff) << 0);
            }

            const XY = new Uint32Array(64 * r);
            const V = new Uint32Array(32 * r * N);

            const Yi = 32 * r;

            // scratch space
            const x = new Uint32Array(16);       // salsa20_8
            const _X = new Uint32Array(16);      // blockmix_salsa8

            const totalOps = p * N * 2;
            let currentOp = 0;
            let lastPercent10 = null;

            // Set this to true to abandon the scrypt on the next step
            let stop = false;

            // State information
            let state = 0;
            let i0 = 0, i1;
            let Bi;

            // How many blockmix_salsa8 can we do per step?
            const limit = callback ? parseInt(1000 / r): 0xffffffff;

            // Trick from scrypt-async; if there is a setImmediate shim in place, use it
            const nextTick = (typeof(setImmediate) !== 'undefined') ? setImmediate : setTimeout;

            // This is really all I changed; making scryptsy a state machine so we occasionally
            // stop and give other evnts on the evnt loop a chance to run. ~RicMoo
            const incrementalSMix = function() {
                if (stop) {
                    return callback(new Error('cancelled'), currentOp / totalOps);
                }

                let steps;

                switch (state) {
                    case 0:
                        // for (var i = 0; i < p; i++)...
                        Bi = i0 * 32 * r;

                        arraycopy(B, Bi, XY, 0, Yi);                       // ROMix - 1

                        state = 1;                                         // Move to ROMix 2
                        i1 = 0;

                        // Fall through

                    case 1:

                        // Run up to 1000 steps of the first inner smix loop
                        steps = N - i1;
                        if (steps > limit) { steps = limit; }
                        for (let i = 0; i < steps; i++) {                  // ROMix - 2
                            arraycopy(XY, 0, V, (i1 + i) * Yi, Yi);         // ROMix - 3
                            blockmix_salsa8(XY, Yi, r, x, _X);             // ROMix - 4
                        }

                        // for (var i = 0; i < N; i++)
                        i1 += steps;
                        currentOp += steps;

                        if (callback) {
                            // Call the callback with the progress (optionally stopping us)
                            const percent10 = parseInt(1000 * currentOp / totalOps);
                            if (percent10 !== lastPercent10) {
                                stop = callback(null, currentOp / totalOps);
                                if (stop) { break; }
                                lastPercent10 = percent10;
                            }
                        }

                        if (i1 < N) { break; }

                        i1 = 0;                                          // Move to ROMix 6
                        state = 2;

                        // Fall through

                    case 2:

                        // Run up to 1000 steps of the second inner smix loop
                        steps = N - i1;
                        if (steps > limit) { steps = limit; }
                        for (let i = 0; i < steps; i++) {                // ROMix - 6
                            const offset = (2 * r - 1) * 16;             // ROMix - 7
                            const j = XY[offset] & (N - 1);
                            blockxor(V, j * Yi, XY, Yi);                 // ROMix - 8 (inner)
                            blockmix_salsa8(XY, Yi, r, x, _X);           // ROMix - 9 (outer)
                        }

                        // for (var i = 0; i < N; i++)...
                        i1 += steps;
                        currentOp += steps;

                        // Call the callback with the progress (optionally stopping us)
                        if (callback) {
                            const percent10 = parseInt(1000 * currentOp / totalOps);
                            if (percent10 !== lastPercent10) {
                                stop = callback(null, currentOp / totalOps);
                                if (stop) { break; }
                                lastPercent10 = percent10;
                            }
                        }

                        if (i1 < N) { break; }

                        arraycopy(XY, 0, B, Bi, Yi);                     // ROMix - 10

                        // for (var i = 0; i < p; i++)...
                        i0++;
                        if (i0 < p) {
                            state = 0;
                            break;
                        }

                        b = [];
                        for (let i = 0; i < B.length; i++) {
                            b.push((B[i] >>  0) & 0xff);
                            b.push((B[i] >>  8) & 0xff);
                            b.push((B[i] >> 16) & 0xff);
                            b.push((B[i] >> 24) & 0xff);
                        }

                        const derivedKey = PBKDF2_HMAC_SHA256_OneIter(password, b, dkLen);

                        // Send the result to the callback
                        if (callback) { callback(null, 1.0, derivedKey); }

                        // Done; don't break (which would reschedule)
                        return derivedKey;
                }

                // Schedule the next steps
                if (callback) { nextTick(incrementalSMix); }
            };

            // Run the smix state machine until completion
            if (!callback) {
                while (true) {
                    const derivedKey = incrementalSMix();
                    if (derivedKey != undefined) { return derivedKey; }
                }
            }

            // Bootstrap the async incremental smix
            incrementalSMix();
        }

        const lib = {
            scrypt: function(password, salt, N, r, p, dkLen, progressCallback) {
                return new Promise(function(resolve, reject) {
                    let lastProgress = 0;
                    if (progressCallback) { progressCallback(0); }
                    _scrypt(password, salt, N, r, p, dkLen, function(error, progress, key) {
                        if (error) {
                            reject(error);
                        } else if (key) {
                            if (progressCallback && lastProgress !== 1) {
                                progressCallback(1);
                            }
                            resolve(new Uint8Array(key));
                        } else if (progressCallback && progress !== lastProgress) {
                            lastProgress = progress;
                            return progressCallback(progress);
                        }
                    });
                });
            },
            syncScrypt: function(password, salt, N, r, p, dkLen) {
                return new Uint8Array(_scrypt(password, salt, N, r, p, dkLen));
            }
        };

        // node.js
        {
           module.exports = lib;

        // RequireJS/AMD
        // http://www.requirejs.org/docs/api.html
        // https://github.com/amdjs/amdjs-api/wiki/AMD
        }

    })();
    });

    var cryptology = createCommonjsModule(function (module) {
    // SPDX-License-Identifier: AGPL-3.0-or-later
    const { PollMessage, PollStatement, IdentityMessage, VoteMsg } = messages;

    const { scrypt: scrypt$1 } = scrypt;
    /* eslint-disable camelcase */
    const {
      crypto_kdf_CONTEXTBYTES,
      // crypto_kdf_KEYBYTES,
      crypto_kdf_derive_from_key,
      // crypto_kdf_keygen,

      crypto_sign_PUBLICKEYBYTES,
      crypto_sign_SECRETKEYBYTES,
      crypto_sign_SEEDBYTES,
      crypto_sign_BYTES,
      crypto_sign_seed_keypair,
      crypto_sign_keypair,
      crypto_sign,
      crypto_sign_open,
      crypto_sign_detached,
      crypto_sign_verify_detached,

      crypto_box_MACBYTES,
      crypto_box_NONCEBYTES,
      crypto_box_SECRETKEYBYTES,
      crypto_box_PUBLICKEYBYTES,
      crypto_box_SEEDBYTES,
      crypto_box_keypair,
      crypto_box_seed_keypair,
      crypto_box_easy,
      crypto_box_open_easy,

      crypto_box_SEALBYTES,
      crypto_box_seal,
      crypto_box_seal_open,

      crypto_secretbox_MACBYTES,
      crypto_secretbox_NONCEBYTES,
      crypto_secretbox_KEYBYTES,
      crypto_secretbox_easy,
      crypto_secretbox_open_easy,

      crypto_pwhash_SALTBYTES,
      crypto_pwhash_OPSLIMIT_INTERACTIVE,
      crypto_pwhash_MEMLIMIT_INTERACTIVE,
      crypto_pwhash_ALG_DEFAULT,
      crypto_pwhash,

      randombytes_buf
    } = browser;

    const Util = module.exports;

    module.exports.deriveSubkey = function (master, n, context = '__undef__', id = 0) {
      if (!isBuffer(context)) context = Buffer.from(context);
      const sub = Buffer.alloc(n);
      crypto_kdf_derive_from_key(
        sub,
        id,
        context.subarray(0, crypto_kdf_CONTEXTBYTES),
        master
      );
      return sub
    };

    module.exports.deriveSignPair = function (master, ctx = 'IDENTITY', id = 0) {
      // crypto_sign_keypair  (crypto_sign_ed25519 this is what hypercore uses)
      const sec = Buffer.alloc(crypto_sign_SECRETKEYBYTES); // U64
      const pub = Buffer.alloc(crypto_sign_PUBLICKEYBYTES); // U32
      crypto_sign_seed_keypair(
        pub,
        sec,
        Util.deriveSubkey(
          master,
          crypto_sign_SEEDBYTES,
          ctx,
          id
        )
      );
      return { pub, sec }
    };

    module.exports.deriveBoxPair = function (master, ctx = 'BOX00000', id = 0) {
      const sec = Buffer.alloc(crypto_box_SECRETKEYBYTES); // U64
      const pub = Buffer.alloc(crypto_box_PUBLICKEYBYTES); // U32
      crypto_box_seed_keypair(
        pub,
        sec,
        Util.deriveSubkey(
          master,
          crypto_box_SEEDBYTES || 32, // TODO: report missing const in browser.
          ctx,
          id
        )
      );
      return { pub, sec }
    };

    module.exports.randomBytes = function (length) {
      const b = Buffer.allocUnsafe(length);
      randombytes_buf(b);
      return b
    };

    module.exports.encrypt = function (data, encryptionKey, encode) {
      if (typeof encode === 'function') {
        data = encode(data);
      }
      if (!isBuffer(data)) data = Buffer.from(data, 'utf-8');

      const o = Buffer.allocUnsafe(data.length +
        crypto_secretbox_NONCEBYTES +
        crypto_secretbox_MACBYTES);

      const nonce = o.subarray(0, crypto_secretbox_NONCEBYTES);
      randombytes_buf(nonce);

      crypto_secretbox_easy(
        o.subarray(crypto_secretbox_NONCEBYTES),
        data, nonce, encryptionKey);
      return o
    };

    module.exports.decrypt = function (buffer, encryptionKey, decode) {
      const message = Buffer.allocUnsafe(buffer.length -
        crypto_secretbox_MACBYTES -
        crypto_secretbox_NONCEBYTES);

      const nonce = buffer.subarray(0, crypto_secretbox_NONCEBYTES);
      const success = crypto_secretbox_open_easy(
        message,
        buffer.subarray(crypto_secretbox_NONCEBYTES),
        nonce,
        encryptionKey);

      if (!success) {
        const err = new Error('DecryptionFailedError');
        err.type = err.message;
        throw err
      }
      // Run originally provided encoder if any
      if (typeof decode === 'function') return decode(message, 0, message.length)
      return message
    };

    module.exports.btoa = function (input) {
      if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
        return window.btoa(input)
      } else {
        if (typeof input === 'string') input = Buffer.from(input);
        return input.toString('base64')
      }
    };

    module.exports.atob = function (input) {
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        return window.atob(input)
      } else {
        return Buffer.from(input, 'base64')
      }
    };

    module.exports.sign = function (m, sk) {
      const msgSig = Buffer.allocUnsafe(crypto_sign_BYTES + m.length);
      crypto_sign(msgSig, m, sk);
      return msgSig
    };

    module.exports.signOpen = function (sm, pk) {
      const m = Buffer.allocUnsafe(sm.length - crypto_sign_BYTES);
      if (!crypto_sign_open(m, sm, pk)) throw new Error('Message failed signature authentication')
      return m
    };

    module.exports.signDetached = function (message, secretKey) {
      const signature = Buffer.allocUnsafe(crypto_sign_BYTES);
      crypto_sign_detached(signature, message, secretKey);
      return signature
    };

    module.exports.verifyDetached = function (message, signature, publicKey) {
      return crypto_sign_verify_detached(signature, message, publicKey)
    };

    module.exports.puzzleEncrypt = function (data, difficulty = 1) {
      if (difficulty > 3) throw new Error('Please mind the environment')
      const cipher = Buffer.allocUnsafe(data.length +
        crypto_secretbox_MACBYTES +
        crypto_secretbox_NONCEBYTES +
        crypto_pwhash_SALTBYTES);
      const salt = cipher.subarray(0, crypto_pwhash_SALTBYTES);
      const nonce = cipher.subarray(crypto_pwhash_SALTBYTES,
        crypto_pwhash_SALTBYTES + crypto_secretbox_NONCEBYTES);
      const pw = Buffer.allocUnsafe(difficulty);
      randombytes_buf(salt);
      randombytes_buf(nonce);
      randombytes_buf(pw);

      const secret = Buffer.allocUnsafe(crypto_secretbox_KEYBYTES);

      crypto_pwhash(secret, pw, salt,
        crypto_pwhash_OPSLIMIT_INTERACTIVE,
        crypto_pwhash_MEMLIMIT_INTERACTIVE,
        crypto_pwhash_ALG_DEFAULT);

      crypto_secretbox_easy(
        cipher.subarray(crypto_pwhash_SALTBYTES + crypto_secretbox_NONCEBYTES),
        data, nonce, secret);

      return cipher
    };

    module.exports.puzzleBreak = function (comb, difficulty = 1, _knownKey = null) {
      // If you want higher difficulty then go play with PoW instead.
      // (or open an issue if you believe that I messed up)
      if (difficulty > 3) throw new Error('Please mind the environment')
      const salt = comb.subarray(0, crypto_pwhash_SALTBYTES);
      const cipher = comb.subarray(crypto_pwhash_SALTBYTES);
      const pw = Buffer.allocUnsafe(difficulty);
      const nonceLen = crypto_secretbox_NONCEBYTES;
      const nonce = cipher.subarray(0, nonceLen); // First part of the buffer
      const headerSz = crypto_secretbox_MACBYTES +
        crypto_secretbox_NONCEBYTES +
        crypto_pwhash_SALTBYTES;

      const messageLen = comb.length - headerSz;

      const message = Buffer.allocUnsafe(messageLen);
      const secret = Buffer.allocUnsafe(crypto_secretbox_KEYBYTES);
      let success = false;

      const tried = [];
      while (!success) { // TODO: maybe add timeout.
        randombytes_buf(pw);
        // This does not work for higher diff
        // but i'm leaving it as is for now
        if (tried[pw[0]]) continue
        else tried[pw[0]] = true;
        crypto_pwhash(secret, _knownKey || pw, salt,
          crypto_pwhash_OPSLIMIT_INTERACTIVE,
          crypto_pwhash_MEMLIMIT_INTERACTIVE,
          crypto_pwhash_ALG_DEFAULT);
        success = crypto_secretbox_open_easy(
          message,
          comb.subarray(crypto_pwhash_SALTBYTES + crypto_secretbox_NONCEBYTES),
          nonce,
          secret
        );
        if (_knownKey) return success ? message : undefined
      }
      return { pw, data: message }
    };

    module.exports.puzzleOpen = function (comb, key) {
      return Util.puzzleBreak(comb, undefined, key)
    };

    // not supported in sodium-universal
    module.exports._box = function (to, from, m) {
      const o = Buffer.allocUnsafe(crypto_box_MACBYTES +
        crypto_box_NONCEBYTES +
        m.length);
      const n = o.subarray(0, crypto_box_NONCEBYTES);
      randombytes_buf(n);
      const c = o.subarray(crypto_box_NONCEBYTES);
      crypto_box_easy(c, m, n, to, from);
      return o
    };

    // not supported in sodium-universal
    module.exports._unbox = function (from, to, c) {
      const m = Buffer.allocUnsafe(c.length -
        crypto_box_MACBYTES -
        crypto_box_NONCEBYTES);
      const n = c.subarray(0, crypto_box_NONCEBYTES);
      const succ = crypto_box_open_easy(m, c.subarray(crypto_box_NONCEBYTES), n, from, to);
      if (!succ) throw new Error('DecryptionFailedError')
      return m
    };

    module.exports.seal = function (m, pk) {
      const c = Buffer.allocUnsafe(crypto_box_SEALBYTES + m.length);
      crypto_box_seal(c, m, pk);
      return c
    };

    module.exports.unseal = function (c, sk, pk) {
      const m = Buffer.allocUnsafe(c.length - crypto_box_SEALBYTES);
      const succ = crypto_box_seal_open(m, c, pk, sk);
      if (!succ) throw new Error('DecryptionFailedError')
      return m
    };

    module.exports.scrypt = function (passphrase, salt, n = 2048, r = 8, p = 1, dkLen = 32) {
      passphrase = Buffer.from(passphrase.normalize('NFKC'));
      salt = Buffer.from(typeof salt === 'string' ? salt.normalize('NFKC') : salt);
      return scrypt$1(passphrase, passphrase, n, r, p, dkLen)
    };

    module.exports.Identity = class Identity {
      constructor (keys = {}) {
        this.box = {
          pub: keys.bpk || Buffer.allocUnsafe(crypto_box_PUBLICKEYBYTES),
          sec: keys.bsk || Buffer.allocUnsafe(crypto_box_SECRETKEYBYTES)
        };
        if (!keys.bsk) crypto_box_keypair(this.box.pub, this.box.sec);

        this.sig = {
          pub: keys.spk || Buffer.allocUnsafe(crypto_sign_PUBLICKEYBYTES),
          sec: keys.ssk || Buffer.allocUnsafe(crypto_sign_SECRETKEYBYTES)
        };
        if (!keys.ssk) crypto_sign_keypair(this.sig.pub, this.sig.sec);
      }

      static encode (id, b, o) {
        const m = {
          box: { sk: id.box.sec, pk: id.box.pub },
          sig: { sk: id.sig.sec, pk: id.sig.pub }
        };
        return IdentityMessage.encode(m, b, o).toString('base64')
      }

      static decode (buf, o, e) {
        if (typeof buf === 'string') buf = Buffer.from(buf, 'base64');
        const m = IdentityMessage.decode(buf, o, e);
        return new Identity({
          bpk: m.box.pk,
          bsk: m.box.sk,
          spk: m.sig.pk,
          ssk: m.sig.sk
        })
      }
    };

    /* Work in progress.
    module.exports.DerivedIdentity = class DerivedIdentity extends Identity {
      constructor (mk = null) {
        super()
        this.master = mk
        if (!this.master) {
          this.master = Buffer.alloc(crypto_kdf_KEYBYTES)
          crypto_kdf_keygen(this.master)
        }
        // Signing keys
        this.sig = Util.deriveSignPair(this.master)
        this.box = Util.deriveBoxPair(this.master)
      }

      sign (m) {
        if (!Buffer.isBuffer(m)) m = Buffer.from(m)
        return Util.sign(m, this.sig.sec)
      }
    }
    */

    module.exports.Poll = class Poll extends picofeed {
      static get CHALLENGE_IDX () { return 0 }
      static get BALLOT_IDX () { return 1 }
      constructor (buf, opts) {
        super(buf, { ...opts, contentEncoding: PollMessage });
      }

      packChallenge (pkey, opts) {
        const { motion, options, endsAt, version, motd, extra } = opts;
        const msg = {
          challenge: {
            version: version || 1,
            box_pk: pkey,
            motion,
            options,
            ends_at: endsAt,
            motd,
            extra
          }
        };
        this.append(msg); // TODO: Should be this.set(0, msg)
      }

      get challenge () {
        return this.get(Poll.CHALLENGE_IDX).challenge
      }

      get ballot () {
        return this.get(Poll.BALLOT_IDX).ballot
      }

      packVote (ident, vote, append = false) {
        if (!isBuffer(vote)) throw new Error('vote must be a buffer')
        const b0 = Buffer.alloc(crypto_secretbox_KEYBYTES);
        randombytes_buf(b0);
        const msg = {
          ballot: {
            // This is also annoying, the bpk was supposed to be published
            // as part of the box-proof, with seals we're just sharing the users
            // public box key for good or bad.
            box_pk: ident.box.pub,
            secret_vote: Util.encrypt(vote, b0),
            // sadly not supported in browser
            // box_msg: Util.box(this.challenge.box_pk, ident.box.sec, b0)
            box_msg: Util.seal(b0, this.challenge.box_pk)
          }
        };

        // Sanity check. Don't want to accidentally litter the world with undecryptable messages.
        const safetyUnpack = Util.decrypt(msg.ballot.secret_vote, b0);
        if (!vote.equals(safetyUnpack)) {
          console.log(`Expected: (${vote.length})`, vote.toString(),
            `\nto equal: (${safetyUnpack.length})`, safetyUnpack.toString());
          throw new Error('Internal error, encryption failed')
        }

        if (!append) this.truncateAfter(Poll.CHALLENGE_IDX);
        if (this.length !== 1) throw new Error('invalid length after truncation')
        this.append(msg, ident.sig.sec);
        return b0
      }

      unboxBallot (sk, pk) {
        const blt = this.ballot;
        return Util.unseal(blt.box_msg, sk, pk)
        // sadly not supported in browser
        // return Util.unbox(blt.box_pk, wboxs, blt.box_msg)
      }

      _decryptVote (secret) {
        return Util.decrypt(this.ballot.secret_vote, secret)
      }

      get ballotKey () {
        let p = 2;
        for (const key of this.keys) if (!--p) return key
        return null
      }

      toStatement (sk, pk) {
        const b0 = this.unboxBallot(sk, pk);
        const stmt = {
          vote: this._decryptVote(b0),
          // If voter chooses to reveal b0, the statement becomes de-anonymized
          proof: Util.encrypt(this.ballotKey, b0)
        };
        return PollStatement.encode(stmt)
      }
    };
    // Export for external use.
    module.exports.Poll.Statement = PollStatement;
    module.exports.VoteMsg = VoteMsg;
    // module.exports.Buffer = Buffer
    /*
    if (typeof window !== 'undefined') {
      window.Cryptology = module.exports
    }
    */
    });
    var cryptology_1 = cryptology.deriveSubkey;
    var cryptology_2 = cryptology.deriveSignPair;
    var cryptology_3 = cryptology.deriveBoxPair;
    var cryptology_4 = cryptology.randomBytes;
    var cryptology_5 = cryptology.encrypt;
    var cryptology_6 = cryptology.decrypt;
    var cryptology_7 = cryptology.btoa;
    var cryptology_8 = cryptology.atob;
    var cryptology_9 = cryptology.sign;
    var cryptology_10 = cryptology.signOpen;
    var cryptology_11 = cryptology.signDetached;
    var cryptology_12 = cryptology.verifyDetached;
    var cryptology_13 = cryptology.puzzleEncrypt;
    var cryptology_14 = cryptology.puzzleBreak;
    var cryptology_15 = cryptology.puzzleOpen;
    var cryptology_16 = cryptology._box;
    var cryptology_17 = cryptology._unbox;
    var cryptology_18 = cryptology.seal;
    var cryptology_19 = cryptology.unseal;
    var cryptology_20 = cryptology.scrypt;
    var cryptology_21 = cryptology.Identity;
    var cryptology_22 = cryptology.Poll;
    var cryptology_23 = cryptology.VoteMsg;

    /**
     * Returns a function, that, as long as it continues to be invoked, will not
     * be triggered. The function will be called after it stops being called for
     * N milliseconds. If `immediate` is passed, trigger the function on the
     * leading edge, instead of the trailing. The function also has a property 'clear' 
     * that is a function which will clear the timer to prevent previously scheduled executions. 
     *
     * @source underscore.js
     * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
     * @param {Function} function to wrap
     * @param {Number} timeout in ms (`100`)
     * @param {Boolean} whether to execute at the beginning (`false`)
     * @api public
     */
    function debounce(func, wait, immediate){
      var timeout, args, context, timestamp, result;
      if (null == wait) wait = 100;

      function later() {
        var last = Date.now() - timestamp;

        if (last < wait && last >= 0) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            context = args = null;
          }
        }
      }
      var debounced = function(){
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }

        return result;
      };

      debounced.clear = function() {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      };
      
      debounced.flush = function() {
        if (timeout) {
          result = func.apply(context, args);
          context = args = null;
          
          clearTimeout(timeout);
          timeout = null;
        }
      };

      return debounced;
    }
    // Adds compatibility for ES modules
    debounce.debounce = debounce;

    var debounce_1 = debounce;

    var encode_1$1 = encode$2;

    var MSB$2 = 0x80
      , REST$2 = 0x7F
      , MSBALL$1 = ~REST$2
      , INT$1 = Math.pow(2, 31);

    function encode$2(num, out, offset) {
      out = out || [];
      offset = offset || 0;
      var oldOffset = offset;

      while(num >= INT$1) {
        out[offset++] = (num & 0xFF) | MSB$2;
        num /= 128;
      }
      while(num & MSBALL$1) {
        out[offset++] = (num & 0xFF) | MSB$2;
        num >>>= 7;
      }
      out[offset] = num | 0;
      
      encode$2.bytes = offset - oldOffset + 1;
      
      return out
    }

    var decode$2 = read$2;

    var MSB$3 = 0x80
      , REST$3 = 0x7F;

    function read$2(buf, offset) {
      var res    = 0
        , offset = offset || 0
        , shift  = 0
        , counter = offset
        , b
        , l = buf.length;

      do {
        if (counter >= l) {
          read$2.bytes = 0;
          throw new RangeError('Could not decode varint')
        }
        b = buf[counter++];
        res += shift < 28
          ? (b & REST$3) << shift
          : (b & REST$3) * Math.pow(2, shift);
        shift += 7;
      } while (b >= MSB$3)

      read$2.bytes = counter - offset;

      return res
    }

    var N1$1 = Math.pow(2,  7);
    var N2$1 = Math.pow(2, 14);
    var N3$1 = Math.pow(2, 21);
    var N4$1 = Math.pow(2, 28);
    var N5$1 = Math.pow(2, 35);
    var N6$1 = Math.pow(2, 42);
    var N7$1 = Math.pow(2, 49);
    var N8$1 = Math.pow(2, 56);
    var N9$1 = Math.pow(2, 63);

    var length$1 = function (value) {
      return (
        value < N1$1 ? 1
      : value < N2$1 ? 2
      : value < N3$1 ? 3
      : value < N4$1 ? 4
      : value < N5$1 ? 5
      : value < N6$1 ? 6
      : value < N7$1 ? 7
      : value < N8$1 ? 8
      : value < N9$1 ? 9
      :              10
      )
    };

    var varint$1 = {
        encode: encode_1$1
      , decode: decode$2
      , encodingLength: length$1
    };

    var encode$3 = function encode (v, b, o) {
      v = v >= 0 ? v*2 : v*-2 - 1;
      var r = varint$1.encode(v, b, o);
      encode.bytes = varint$1.encode.bytes;
      return r
    };
    var decode$3 = function decode (b, o) {
      var v = varint$1.decode(b, o);
      decode.bytes = varint$1.decode.bytes;
      return v & 1 ? (v+1) / -2 : v / 2
    };

    var encodingLength$1 = function (v) {
      return varint$1.encodingLength(v >= 0 ? v*2 : v*-2 - 1)
    };

    var signedVarint$1 = {
    	encode: encode$3,
    	decode: decode$3,
    	encodingLength: encodingLength$1
    };

    var protocolBuffersEncodings$1 = createCommonjsModule(function (module, exports) {
    exports.make = encoder;

    exports.name = function (enc) {
      var keys = Object.keys(exports);
      for (var i = 0; i < keys.length; i++) {
        if (exports[keys[i]] === enc) return keys[i]
      }
      return null
    };

    exports.skip = function (type, buffer, offset) {
      switch (type) {
        case 0:
          varint$1.decode(buffer, offset);
          return offset + varint$1.decode.bytes

        case 1:
          return offset + 8

        case 2:
          var len = varint$1.decode(buffer, offset);
          return offset + varint$1.decode.bytes + len

        case 3:
        case 4:
          throw new Error('Groups are not supported')

        case 5:
          return offset + 4
      }

      throw new Error('Unknown wire type: ' + type)
    };

    exports.bytes = encoder(2,
      function encode (val, buffer, offset) {
        var oldOffset = offset;
        var len = bufferLength(val);

        varint$1.encode(len, buffer, offset);
        offset += varint$1.encode.bytes;

        if (isBuffer(val)) val.copy(buffer, offset);
        else buffer.write(val, offset, len);
        offset += len;

        encode.bytes = offset - oldOffset;
        return buffer
      },
      function decode (buffer, offset) {
        var oldOffset = offset;

        var len = varint$1.decode(buffer, offset);
        offset += varint$1.decode.bytes;

        var val = buffer.slice(offset, offset + len);
        offset += val.length;

        decode.bytes = offset - oldOffset;
        return val
      },
      function encodingLength (val) {
        var len = bufferLength(val);
        return varint$1.encodingLength(len) + len
      }
    );

    exports.string = encoder(2,
      function encode (val, buffer, offset) {
        var oldOffset = offset;
        var len = Buffer.byteLength(val);

        varint$1.encode(len, buffer, offset, 'utf-8');
        offset += varint$1.encode.bytes;

        buffer.write(val, offset, len);
        offset += len;

        encode.bytes = offset - oldOffset;
        return buffer
      },
      function decode (buffer, offset) {
        var oldOffset = offset;

        var len = varint$1.decode(buffer, offset);
        offset += varint$1.decode.bytes;

        var val = buffer.toString('utf-8', offset, offset + len);
        offset += len;

        decode.bytes = offset - oldOffset;
        return val
      },
      function encodingLength (val) {
        var len = Buffer.byteLength(val);
        return varint$1.encodingLength(len) + len
      }
    );

    exports.bool = encoder(0,
      function encode (val, buffer, offset) {
        buffer[offset] = val ? 1 : 0;
        encode.bytes = 1;
        return buffer
      },
      function decode (buffer, offset) {
        var bool = buffer[offset] > 0;
        decode.bytes = 1;
        return bool
      },
      function encodingLength () {
        return 1
      }
    );

    exports.int32 = encoder(0,
      function encode (val, buffer, offset) {
        varint$1.encode(val < 0 ? val + 4294967296 : val, buffer, offset);
        encode.bytes = varint$1.encode.bytes;
        return buffer
      },
      function decode (buffer, offset) {
        var val = varint$1.decode(buffer, offset);
        decode.bytes = varint$1.decode.bytes;
        return val > 2147483647 ? val - 4294967296 : val
      },
      function encodingLength (val) {
        return varint$1.encodingLength(val < 0 ? val + 4294967296 : val)
      }
    );

    exports.int64 = encoder(0,
      function encode (val, buffer, offset) {
        if (val < 0) {
          var last = offset + 9;
          varint$1.encode(val * -1, buffer, offset);
          offset += varint$1.encode.bytes - 1;
          buffer[offset] = buffer[offset] | 0x80;
          while (offset < last - 1) {
            offset++;
            buffer[offset] = 0xff;
          }
          buffer[last] = 0x01;
          encode.bytes = 10;
        } else {
          varint$1.encode(val, buffer, offset);
          encode.bytes = varint$1.encode.bytes;
        }
        return buffer
      },
      function decode (buffer, offset) {
        var val = varint$1.decode(buffer, offset);
        if (val >= Math.pow(2, 63)) {
          var limit = 9;
          while (buffer[offset + limit - 1] === 0xff) limit--;
          limit = limit || 9;
          var subset = Buffer.allocUnsafe(limit);
          buffer.copy(subset, 0, offset, offset + limit);
          subset[limit - 1] = subset[limit - 1] & 0x7f;
          val = -1 * varint$1.decode(subset, 0);
          decode.bytes = 10;
        } else {
          decode.bytes = varint$1.decode.bytes;
        }
        return val
      },
      function encodingLength (val) {
        return val < 0 ? 10 : varint$1.encodingLength(val)
      }
    );

    exports.sint32 =
    exports.sint64 = encoder(0,
      signedVarint$1.encode,
      signedVarint$1.decode,
      signedVarint$1.encodingLength
    );

    exports.uint32 =
    exports.uint64 =
    exports.enum =
    exports.varint = encoder(0,
      varint$1.encode,
      varint$1.decode,
      varint$1.encodingLength
    );

    // we cannot represent these in javascript so we just use buffers
    exports.fixed64 =
    exports.sfixed64 = encoder(1,
      function encode (val, buffer, offset) {
        val.copy(buffer, offset);
        encode.bytes = 8;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.slice(offset, offset + 8);
        decode.bytes = 8;
        return val
      },
      function encodingLength () {
        return 8
      }
    );

    exports.double = encoder(1,
      function encode (val, buffer, offset) {
        buffer.writeDoubleLE(val, offset);
        encode.bytes = 8;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.readDoubleLE(offset);
        decode.bytes = 8;
        return val
      },
      function encodingLength () {
        return 8
      }
    );

    exports.fixed32 = encoder(5,
      function encode (val, buffer, offset) {
        buffer.writeUInt32LE(val, offset);
        encode.bytes = 4;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.readUInt32LE(offset);
        decode.bytes = 4;
        return val
      },
      function encodingLength () {
        return 4
      }
    );

    exports.sfixed32 = encoder(5,
      function encode (val, buffer, offset) {
        buffer.writeInt32LE(val, offset);
        encode.bytes = 4;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.readInt32LE(offset);
        decode.bytes = 4;
        return val
      },
      function encodingLength () {
        return 4
      }
    );

    exports.float = encoder(5,
      function encode (val, buffer, offset) {
        buffer.writeFloatLE(val, offset);
        encode.bytes = 4;
        return buffer
      },
      function decode (buffer, offset) {
        var val = buffer.readFloatLE(offset);
        decode.bytes = 4;
        return val
      },
      function encodingLength () {
        return 4
      }
    );

    function encoder (type, encode, decode, encodingLength) {
      encode.bytes = decode.bytes = 0;

      return {
        type: type,
        encode: encode,
        decode: decode,
        encodingLength: encodingLength
      }
    }

    function bufferLength (val) {
      return isBuffer(val) ? val.length : Buffer.byteLength(val)
    }
    });
    var protocolBuffersEncodings_1$1 = protocolBuffersEncodings$1.make;
    var protocolBuffersEncodings_2$1 = protocolBuffersEncodings$1.name;
    var protocolBuffersEncodings_3$1 = protocolBuffersEncodings$1.skip;
    var protocolBuffersEncodings_4$1 = protocolBuffersEncodings$1.bytes;
    var protocolBuffersEncodings_5$1 = protocolBuffersEncodings$1.string;
    var protocolBuffersEncodings_6$1 = protocolBuffersEncodings$1.bool;
    var protocolBuffersEncodings_7$1 = protocolBuffersEncodings$1.int32;
    var protocolBuffersEncodings_8$1 = protocolBuffersEncodings$1.int64;
    var protocolBuffersEncodings_9$1 = protocolBuffersEncodings$1.sint32;
    var protocolBuffersEncodings_10$1 = protocolBuffersEncodings$1.sint64;
    var protocolBuffersEncodings_11$1 = protocolBuffersEncodings$1.uint32;
    var protocolBuffersEncodings_12$1 = protocolBuffersEncodings$1.uint64;
    var protocolBuffersEncodings_13$1 = protocolBuffersEncodings$1.varint;
    var protocolBuffersEncodings_14$1 = protocolBuffersEncodings$1.fixed64;
    var protocolBuffersEncodings_15$1 = protocolBuffersEncodings$1.sfixed64;
    var protocolBuffersEncodings_16$1 = protocolBuffersEncodings$1.fixed32;
    var protocolBuffersEncodings_17$1 = protocolBuffersEncodings$1.sfixed32;

    var messages$1 = createCommonjsModule(function (module, exports) {
    // This file is auto generated by the protocol-buffers compiler

    /* eslint-disable quotes */
    /* eslint-disable indent */
    /* eslint-disable no-redeclare */
    /* eslint-disable camelcase */

    // Remember to `npm install --save protocol-buffers-encodings`

    var varint = protocolBuffersEncodings$1.varint;
    var skip = protocolBuffersEncodings$1.skip;

    var Postcard = exports.Postcard = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    var RantMessage = exports.RantMessage = {
      buffer: true,
      encodingLength: null,
      encode: null,
      decode: null
    };

    definePostcard();
    defineRantMessage();

    function definePostcard () {
      Postcard.encodingLength = encodingLength;
      Postcard.encode = encode;
      Postcard.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if (defined(obj.date)) {
          var len = protocolBuffersEncodings$1.varint.encodingLength(obj.date);
          length += 1 + len;
        }
        if (defined(obj.theme)) {
          var len = protocolBuffersEncodings$1.int32.encodingLength(obj.theme);
          length += 1 + len;
        }
        if (defined(obj.text)) {
          var len = protocolBuffersEncodings$1.bytes.encodingLength(obj.text);
          length += 1 + len;
        }
        if (defined(obj.compression)) {
          var len = protocolBuffersEncodings$1.varint.encodingLength(obj.compression);
          length += 1 + len;
        }
        if (defined(obj.encryption)) {
          var len = protocolBuffersEncodings$1.varint.encodingLength(obj.encryption);
          length += 1 + len;
        }
        if (defined(obj.nonce)) {
          var len = protocolBuffersEncodings$1.bytes.encodingLength(obj.nonce);
          length += 1 + len;
        }
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if (defined(obj.date)) {
          buf[offset++] = 8;
          protocolBuffersEncodings$1.varint.encode(obj.date, buf, offset);
          offset += protocolBuffersEncodings$1.varint.encode.bytes;
        }
        if (defined(obj.theme)) {
          buf[offset++] = 16;
          protocolBuffersEncodings$1.int32.encode(obj.theme, buf, offset);
          offset += protocolBuffersEncodings$1.int32.encode.bytes;
        }
        if (defined(obj.text)) {
          buf[offset++] = 26;
          protocolBuffersEncodings$1.bytes.encode(obj.text, buf, offset);
          offset += protocolBuffersEncodings$1.bytes.encode.bytes;
        }
        if (defined(obj.compression)) {
          buf[offset++] = 32;
          protocolBuffersEncodings$1.varint.encode(obj.compression, buf, offset);
          offset += protocolBuffersEncodings$1.varint.encode.bytes;
        }
        if (defined(obj.encryption)) {
          buf[offset++] = 40;
          protocolBuffersEncodings$1.varint.encode(obj.encryption, buf, offset);
          offset += protocolBuffersEncodings$1.varint.encode.bytes;
        }
        if (defined(obj.nonce)) {
          buf[offset++] = 50;
          protocolBuffersEncodings$1.bytes.encode(obj.nonce, buf, offset);
          offset += protocolBuffersEncodings$1.bytes.encode.bytes;
        }
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          date: 0,
          theme: 0,
          text: null,
          compression: 0,
          encryption: 0,
          nonce: null
        };
        while (true) {
          if (end <= offset) {
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            obj.date = protocolBuffersEncodings$1.varint.decode(buf, offset);
            offset += protocolBuffersEncodings$1.varint.decode.bytes;
            break
            case 2:
            obj.theme = protocolBuffersEncodings$1.int32.decode(buf, offset);
            offset += protocolBuffersEncodings$1.int32.decode.bytes;
            break
            case 3:
            obj.text = protocolBuffersEncodings$1.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings$1.bytes.decode.bytes;
            break
            case 4:
            obj.compression = protocolBuffersEncodings$1.varint.decode(buf, offset);
            offset += protocolBuffersEncodings$1.varint.decode.bytes;
            break
            case 5:
            obj.encryption = protocolBuffersEncodings$1.varint.decode(buf, offset);
            offset += protocolBuffersEncodings$1.varint.decode.bytes;
            break
            case 6:
            obj.nonce = protocolBuffersEncodings$1.bytes.decode(buf, offset);
            offset += protocolBuffersEncodings$1.bytes.decode.bytes;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function defineRantMessage () {
      RantMessage.encodingLength = encodingLength;
      RantMessage.encode = encode;
      RantMessage.decode = decode;

      function encodingLength (obj) {
        var length = 0;
        if ((+defined(obj.card)) > 1) throw new Error("only one of the properties defined in oneof msg can be set")
        if (defined(obj.card)) {
          var len = Postcard.encodingLength(obj.card);
          length += varint.encodingLength(len);
          length += 1 + len;
        }
        return length
      }

      function encode (obj, buf, offset) {
        if (!offset) offset = 0;
        if (!buf) buf = Buffer.allocUnsafe(encodingLength(obj));
        var oldOffset = offset;
        if ((+defined(obj.card)) > 1) throw new Error("only one of the properties defined in oneof msg can be set")
        if (defined(obj.card)) {
          buf[offset++] = 10;
          varint.encode(Postcard.encodingLength(obj.card), buf, offset);
          offset += varint.encode.bytes;
          Postcard.encode(obj.card, buf, offset);
          offset += Postcard.encode.bytes;
        }
        encode.bytes = offset - oldOffset;
        return buf
      }

      function decode (buf, offset, end) {
        if (!offset) offset = 0;
        if (!end) end = buf.length;
        if (!(end <= buf.length && offset <= buf.length)) throw new Error("Decoded message is not valid")
        var oldOffset = offset;
        var obj = {
          card: null
        };
        while (true) {
          if (end <= offset) {
            decode.bytes = offset - oldOffset;
            return obj
          }
          var prefix = varint.decode(buf, offset);
          offset += varint.decode.bytes;
          var tag = prefix >> 3;
          switch (tag) {
            case 1:
            var len = varint.decode(buf, offset);
            offset += varint.decode.bytes;
            obj.card = Postcard.decode(buf, offset, offset + len);
            offset += Postcard.decode.bytes;
            break
            default:
            offset = skip(prefix & 7, buf, offset);
          }
        }
      }
    }

    function defined (val) {
      return val !== null && val !== undefined && (typeof val !== 'number' || !isNaN(val))
    }
    });
    var messages_1$1 = messages$1.Postcard;
    var messages_2$1 = messages$1.RantMessage;

    // shim for using process in browser
    // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

    function defaultSetTimout() {
        throw new Error('setTimeout has not been defined');
    }
    function defaultClearTimeout () {
        throw new Error('clearTimeout has not been defined');
    }
    var cachedSetTimeout = defaultSetTimout;
    var cachedClearTimeout = defaultClearTimeout;
    if (typeof global$1.setTimeout === 'function') {
        cachedSetTimeout = setTimeout;
    }
    if (typeof global$1.clearTimeout === 'function') {
        cachedClearTimeout = clearTimeout;
    }

    function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
            //normal enviroments in sane situations
            return setTimeout(fun, 0);
        }
        // if setTimeout wasn't available but was latter defined
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedSetTimeout(fun, 0);
        } catch(e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                return cachedSetTimeout.call(null, fun, 0);
            } catch(e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                return cachedSetTimeout.call(this, fun, 0);
            }
        }


    }
    function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
            //normal enviroments in sane situations
            return clearTimeout(marker);
        }
        // if clearTimeout wasn't available but was latter defined
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedClearTimeout(marker);
        } catch (e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                return cachedClearTimeout.call(null, marker);
            } catch (e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                return cachedClearTimeout.call(this, marker);
            }
        }



    }
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;

    function cleanUpNextTick() {
        if (!draining || !currentQueue) {
            return;
        }
        draining = false;
        if (currentQueue.length) {
            queue = currentQueue.concat(queue);
        } else {
            queueIndex = -1;
        }
        if (queue.length) {
            drainQueue();
        }
    }

    function drainQueue() {
        if (draining) {
            return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;

        var len = queue.length;
        while(len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
                if (currentQueue) {
                    currentQueue[queueIndex].run();
                }
            }
            queueIndex = -1;
            len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
    }
    function nextTick(fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i];
            }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
        }
    }
    // v8 likes predictible objects
    function Item(fun, array) {
        this.fun = fun;
        this.array = array;
    }
    Item.prototype.run = function () {
        this.fun.apply(null, this.array);
    };
    var title = 'browser';
    var platform = 'browser';
    var browser$1 = true;
    var env = {};
    var argv = [];
    var version = ''; // empty string to avoid regexp issues
    var versions = {};
    var release = {};
    var config = {};

    function noop$1() {}

    var on = noop$1;
    var addListener = noop$1;
    var once = noop$1;
    var off = noop$1;
    var removeListener = noop$1;
    var removeAllListeners = noop$1;
    var emit = noop$1;

    function binding(name) {
        throw new Error('process.binding is not supported');
    }

    function cwd () { return '/' }
    function chdir (dir) {
        throw new Error('process.chdir is not supported');
    }function umask() { return 0; }

    // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
    var performance$1 = global$1.performance || {};
    var performanceNow =
      performance$1.now        ||
      performance$1.mozNow     ||
      performance$1.msNow      ||
      performance$1.oNow       ||
      performance$1.webkitNow  ||
      function(){ return (new Date()).getTime() };

    // generate timestamp or delta
    // see http://nodejs.org/api/process.html#process_process_hrtime
    function hrtime(previousTimestamp){
      var clocktime = performanceNow.call(performance$1)*1e-3;
      var seconds = Math.floor(clocktime);
      var nanoseconds = Math.floor((clocktime%1)*1e9);
      if (previousTimestamp) {
        seconds = seconds - previousTimestamp[0];
        nanoseconds = nanoseconds - previousTimestamp[1];
        if (nanoseconds<0) {
          seconds--;
          nanoseconds += 1e9;
        }
      }
      return [seconds,nanoseconds]
    }

    var startTime = new Date();
    function uptime() {
      var currentTime = new Date();
      var dif = currentTime - startTime;
      return dif / 1000;
    }

    var process = {
      nextTick: nextTick,
      title: title,
      browser: browser$1,
      env: env,
      argv: argv,
      version: version,
      versions: versions,
      on: on,
      addListener: addListener,
      once: once,
      off: off,
      removeListener: removeListener,
      removeAllListeners: removeAllListeners,
      emit: emit,
      binding: binding,
      cwd: cwd,
      chdir: chdir,
      umask: umask,
      hrtime: hrtime,
      platform: platform,
      release: release,
      config: config,
      uptime: uptime
    };

    var domain;

    // This constructor is used to store event handlers. Instantiating this is
    // faster than explicitly calling `Object.create(null)` to get a "clean" empty
    // object (tested with v8 v4.9).
    function EventHandlers() {}
    EventHandlers.prototype = Object.create(null);

    function EventEmitter() {
      EventEmitter.init.call(this);
    }

    // nodejs oddity
    // require('events') === require('events').EventEmitter
    EventEmitter.EventEmitter = EventEmitter;

    EventEmitter.usingDomains = false;

    EventEmitter.prototype.domain = undefined;
    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype._maxListeners = undefined;

    // By default EventEmitters will print a warning if more than 10 listeners are
    // added to it. This is a useful default which helps finding memory leaks.
    EventEmitter.defaultMaxListeners = 10;

    EventEmitter.init = function() {
      this.domain = null;
      if (EventEmitter.usingDomains) {
        // if there is an active domain, then attach to it.
        if (domain.active ) ;
      }

      if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
        this._events = new EventHandlers();
        this._eventsCount = 0;
      }

      this._maxListeners = this._maxListeners || undefined;
    };

    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
      if (typeof n !== 'number' || n < 0 || isNaN(n))
        throw new TypeError('"n" argument must be a positive number');
      this._maxListeners = n;
      return this;
    };

    function $getMaxListeners(that) {
      if (that._maxListeners === undefined)
        return EventEmitter.defaultMaxListeners;
      return that._maxListeners;
    }

    EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
      return $getMaxListeners(this);
    };

    // These standalone emit* functions are used to optimize calling of event
    // handlers for fast cases because emit() itself often has a variable number of
    // arguments and can be deoptimized because of that. These functions always have
    // the same number of arguments and thus do not get deoptimized, so the code
    // inside them can execute faster.
    function emitNone(handler, isFn, self) {
      if (isFn)
        handler.call(self);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self);
      }
    }
    function emitOne(handler, isFn, self, arg1) {
      if (isFn)
        handler.call(self, arg1);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1);
      }
    }
    function emitTwo(handler, isFn, self, arg1, arg2) {
      if (isFn)
        handler.call(self, arg1, arg2);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2);
      }
    }
    function emitThree(handler, isFn, self, arg1, arg2, arg3) {
      if (isFn)
        handler.call(self, arg1, arg2, arg3);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2, arg3);
      }
    }

    function emitMany(handler, isFn, self, args) {
      if (isFn)
        handler.apply(self, args);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].apply(self, args);
      }
    }

    EventEmitter.prototype.emit = function emit(type) {
      var er, handler, len, args, i, events, domain;
      var doError = (type === 'error');

      events = this._events;
      if (events)
        doError = (doError && events.error == null);
      else if (!doError)
        return false;

      domain = this.domain;

      // If there is no 'error' event listener then throw.
      if (doError) {
        er = arguments[1];
        if (domain) {
          if (!er)
            er = new Error('Uncaught, unspecified "error" event');
          er.domainEmitter = this;
          er.domain = domain;
          er.domainThrown = false;
          domain.emit('error', er);
        } else if (er instanceof Error) {
          throw er; // Unhandled 'error' event
        } else {
          // At least give some kind of context to the user
          var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
          err.context = er;
          throw err;
        }
        return false;
      }

      handler = events[type];

      if (!handler)
        return false;

      var isFn = typeof handler === 'function';
      len = arguments.length;
      switch (len) {
        // fast cases
        case 1:
          emitNone(handler, isFn, this);
          break;
        case 2:
          emitOne(handler, isFn, this, arguments[1]);
          break;
        case 3:
          emitTwo(handler, isFn, this, arguments[1], arguments[2]);
          break;
        case 4:
          emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
          break;
        // slower
        default:
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          emitMany(handler, isFn, this, args);
      }

      return true;
    };

    function _addListener(target, type, listener, prepend) {
      var m;
      var events;
      var existing;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = target._events;
      if (!events) {
        events = target._events = new EventHandlers();
        target._eventsCount = 0;
      } else {
        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (events.newListener) {
          target.emit('newListener', type,
                      listener.listener ? listener.listener : listener);

          // Re-assign `events` because a newListener handler could have caused the
          // this._events to be assigned to a new object
          events = target._events;
        }
        existing = events[type];
      }

      if (!existing) {
        // Optimize the case of one listener. Don't need the extra array object.
        existing = events[type] = listener;
        ++target._eventsCount;
      } else {
        if (typeof existing === 'function') {
          // Adding the second element, need to change to array.
          existing = events[type] = prepend ? [listener, existing] :
                                              [existing, listener];
        } else {
          // If we've already got an array, just append.
          if (prepend) {
            existing.unshift(listener);
          } else {
            existing.push(listener);
          }
        }

        // Check for listener leak
        if (!existing.warned) {
          m = $getMaxListeners(target);
          if (m && m > 0 && existing.length > m) {
            existing.warned = true;
            var w = new Error('Possible EventEmitter memory leak detected. ' +
                                existing.length + ' ' + type + ' listeners added. ' +
                                'Use emitter.setMaxListeners() to increase limit');
            w.name = 'MaxListenersExceededWarning';
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            emitWarning(w);
          }
        }
      }

      return target;
    }
    function emitWarning(e) {
      typeof console.warn === 'function' ? console.warn(e) : console.log(e);
    }
    EventEmitter.prototype.addListener = function addListener(type, listener) {
      return _addListener(this, type, listener, false);
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.prependListener =
        function prependListener(type, listener) {
          return _addListener(this, type, listener, true);
        };

    function _onceWrap(target, type, listener) {
      var fired = false;
      function g() {
        target.removeListener(type, g);
        if (!fired) {
          fired = true;
          listener.apply(target, arguments);
        }
      }
      g.listener = listener;
      return g;
    }

    EventEmitter.prototype.once = function once(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.on(type, _onceWrap(this, type, listener));
      return this;
    };

    EventEmitter.prototype.prependOnceListener =
        function prependOnceListener(type, listener) {
          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');
          this.prependListener(type, _onceWrap(this, type, listener));
          return this;
        };

    // emits a 'removeListener' event iff the listener was removed
    EventEmitter.prototype.removeListener =
        function removeListener(type, listener) {
          var list, events, position, i, originalListener;

          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');

          events = this._events;
          if (!events)
            return this;

          list = events[type];
          if (!list)
            return this;

          if (list === listener || (list.listener && list.listener === listener)) {
            if (--this._eventsCount === 0)
              this._events = new EventHandlers();
            else {
              delete events[type];
              if (events.removeListener)
                this.emit('removeListener', type, list.listener || listener);
            }
          } else if (typeof list !== 'function') {
            position = -1;

            for (i = list.length; i-- > 0;) {
              if (list[i] === listener ||
                  (list[i].listener && list[i].listener === listener)) {
                originalListener = list[i].listener;
                position = i;
                break;
              }
            }

            if (position < 0)
              return this;

            if (list.length === 1) {
              list[0] = undefined;
              if (--this._eventsCount === 0) {
                this._events = new EventHandlers();
                return this;
              } else {
                delete events[type];
              }
            } else {
              spliceOne(list, position);
            }

            if (events.removeListener)
              this.emit('removeListener', type, originalListener || listener);
          }

          return this;
        };

    EventEmitter.prototype.removeAllListeners =
        function removeAllListeners(type) {
          var listeners, events;

          events = this._events;
          if (!events)
            return this;

          // not listening for removeListener, no need to emit
          if (!events.removeListener) {
            if (arguments.length === 0) {
              this._events = new EventHandlers();
              this._eventsCount = 0;
            } else if (events[type]) {
              if (--this._eventsCount === 0)
                this._events = new EventHandlers();
              else
                delete events[type];
            }
            return this;
          }

          // emit removeListener for all listeners on all events
          if (arguments.length === 0) {
            var keys = Object.keys(events);
            for (var i = 0, key; i < keys.length; ++i) {
              key = keys[i];
              if (key === 'removeListener') continue;
              this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = new EventHandlers();
            this._eventsCount = 0;
            return this;
          }

          listeners = events[type];

          if (typeof listeners === 'function') {
            this.removeListener(type, listeners);
          } else if (listeners) {
            // LIFO order
            do {
              this.removeListener(type, listeners[listeners.length - 1]);
            } while (listeners[0]);
          }

          return this;
        };

    EventEmitter.prototype.listeners = function listeners(type) {
      var evlistener;
      var ret;
      var events = this._events;

      if (!events)
        ret = [];
      else {
        evlistener = events[type];
        if (!evlistener)
          ret = [];
        else if (typeof evlistener === 'function')
          ret = [evlistener.listener || evlistener];
        else
          ret = unwrapListeners(evlistener);
      }

      return ret;
    };

    EventEmitter.listenerCount = function(emitter, type) {
      if (typeof emitter.listenerCount === 'function') {
        return emitter.listenerCount(type);
      } else {
        return listenerCount.call(emitter, type);
      }
    };

    EventEmitter.prototype.listenerCount = listenerCount;
    function listenerCount(type) {
      var events = this._events;

      if (events) {
        var evlistener = events[type];

        if (typeof evlistener === 'function') {
          return 1;
        } else if (evlistener) {
          return evlistener.length;
        }
      }

      return 0;
    }

    EventEmitter.prototype.eventNames = function eventNames() {
      return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
    };

    // About 1.5x faster than the two-arg version of Array#splice().
    function spliceOne(list, index) {
      for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
        list[i] = list[k];
      list.pop();
    }

    function arrayClone(arr, i) {
      var copy = new Array(i);
      while (i--)
        copy[i] = arr[i];
      return copy;
    }

    function unwrapListeners(arr) {
      var ret = new Array(arr.length);
      for (var i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
      }
      return ret;
    }

    var inherits;
    if (typeof Object.create === 'function'){
      inherits = function inherits(ctor, superCtor) {
        // implementation from standard node.js 'util' module
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      };
    } else {
      inherits = function inherits(ctor, superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function () {};
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      };
    }
    var inherits$1 = inherits;

    var formatRegExp = /%[sdj%]/g;
    function format(f) {
      if (!isString(f)) {
        var objects = [];
        for (var i = 0; i < arguments.length; i++) {
          objects.push(inspect(arguments[i]));
        }
        return objects.join(' ');
      }

      var i = 1;
      var args = arguments;
      var len = args.length;
      var str = String(f).replace(formatRegExp, function(x) {
        if (x === '%%') return '%';
        if (i >= len) return x;
        switch (x) {
          case '%s': return String(args[i++]);
          case '%d': return Number(args[i++]);
          case '%j':
            try {
              return JSON.stringify(args[i++]);
            } catch (_) {
              return '[Circular]';
            }
          default:
            return x;
        }
      });
      for (var x = args[i]; i < len; x = args[++i]) {
        if (isNull(x) || !isObject(x)) {
          str += ' ' + x;
        } else {
          str += ' ' + inspect(x);
        }
      }
      return str;
    }

    // Mark that a method should not be used.
    // Returns a modified function which warns once by default.
    // If --no-deprecation is set, then it is a no-op.
    function deprecate(fn, msg) {
      // Allow for deprecating things in the process of starting up.
      if (isUndefined(global$1.process)) {
        return function() {
          return deprecate(fn, msg).apply(this, arguments);
        };
      }

      if (process.noDeprecation === true) {
        return fn;
      }

      var warned = false;
      function deprecated() {
        if (!warned) {
          if (process.throwDeprecation) {
            throw new Error(msg);
          } else if (process.traceDeprecation) {
            console.trace(msg);
          } else {
            console.error(msg);
          }
          warned = true;
        }
        return fn.apply(this, arguments);
      }

      return deprecated;
    }

    var debugs = {};
    var debugEnviron;
    function debuglog(set) {
      if (isUndefined(debugEnviron))
        debugEnviron = process.env.NODE_DEBUG || '';
      set = set.toUpperCase();
      if (!debugs[set]) {
        if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
          var pid = 0;
          debugs[set] = function() {
            var msg = format.apply(null, arguments);
            console.error('%s %d: %s', set, pid, msg);
          };
        } else {
          debugs[set] = function() {};
        }
      }
      return debugs[set];
    }

    /**
     * Echos the value of a value. Trys to print the value out
     * in the best way possible given the different types.
     *
     * @param {Object} obj The object to print out.
     * @param {Object} opts Optional options object that alters the output.
     */
    /* legacy: obj, showHidden, depth, colors*/
    function inspect(obj, opts) {
      // default options
      var ctx = {
        seen: [],
        stylize: stylizeNoColor
      };
      // legacy...
      if (arguments.length >= 3) ctx.depth = arguments[2];
      if (arguments.length >= 4) ctx.colors = arguments[3];
      if (isBoolean(opts)) {
        // legacy...
        ctx.showHidden = opts;
      } else if (opts) {
        // got an "options" object
        _extend(ctx, opts);
      }
      // set default options
      if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
      if (isUndefined(ctx.depth)) ctx.depth = 2;
      if (isUndefined(ctx.colors)) ctx.colors = false;
      if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
      if (ctx.colors) ctx.stylize = stylizeWithColor;
      return formatValue(ctx, obj, ctx.depth);
    }

    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    inspect.colors = {
      'bold' : [1, 22],
      'italic' : [3, 23],
      'underline' : [4, 24],
      'inverse' : [7, 27],
      'white' : [37, 39],
      'grey' : [90, 39],
      'black' : [30, 39],
      'blue' : [34, 39],
      'cyan' : [36, 39],
      'green' : [32, 39],
      'magenta' : [35, 39],
      'red' : [31, 39],
      'yellow' : [33, 39]
    };

    // Don't use 'blue' not visible on cmd.exe
    inspect.styles = {
      'special': 'cyan',
      'number': 'yellow',
      'boolean': 'yellow',
      'undefined': 'grey',
      'null': 'bold',
      'string': 'green',
      'date': 'magenta',
      // "name": intentionally not styling
      'regexp': 'red'
    };


    function stylizeWithColor(str, styleType) {
      var style = inspect.styles[styleType];

      if (style) {
        return '\u001b[' + inspect.colors[style][0] + 'm' + str +
               '\u001b[' + inspect.colors[style][1] + 'm';
      } else {
        return str;
      }
    }


    function stylizeNoColor(str, styleType) {
      return str;
    }


    function arrayToHash(array) {
      var hash = {};

      array.forEach(function(val, idx) {
        hash[val] = true;
      });

      return hash;
    }


    function formatValue(ctx, value, recurseTimes) {
      // Provide a hook for user-specified inspect functions.
      // Check that value is an object with an inspect function on it
      if (ctx.customInspect &&
          value &&
          isFunction(value.inspect) &&
          // Filter out the util module, it's inspect function is special
          value.inspect !== inspect &&
          // Also filter out any prototype objects using the circular check.
          !(value.constructor && value.constructor.prototype === value)) {
        var ret = value.inspect(recurseTimes, ctx);
        if (!isString(ret)) {
          ret = formatValue(ctx, ret, recurseTimes);
        }
        return ret;
      }

      // Primitive types cannot have properties
      var primitive = formatPrimitive(ctx, value);
      if (primitive) {
        return primitive;
      }

      // Look up the keys of the object.
      var keys = Object.keys(value);
      var visibleKeys = arrayToHash(keys);

      if (ctx.showHidden) {
        keys = Object.getOwnPropertyNames(value);
      }

      // IE doesn't make error fields non-enumerable
      // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
      if (isError(value)
          && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
        return formatError(value);
      }

      // Some type of object without properties can be shortcutted.
      if (keys.length === 0) {
        if (isFunction(value)) {
          var name = value.name ? ': ' + value.name : '';
          return ctx.stylize('[Function' + name + ']', 'special');
        }
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        }
        if (isDate(value)) {
          return ctx.stylize(Date.prototype.toString.call(value), 'date');
        }
        if (isError(value)) {
          return formatError(value);
        }
      }

      var base = '', array = false, braces = ['{', '}'];

      // Make Array say that they are Array
      if (isArray$1(value)) {
        array = true;
        braces = ['[', ']'];
      }

      // Make functions say that they are functions
      if (isFunction(value)) {
        var n = value.name ? ': ' + value.name : '';
        base = ' [Function' + n + ']';
      }

      // Make RegExps say that they are RegExps
      if (isRegExp(value)) {
        base = ' ' + RegExp.prototype.toString.call(value);
      }

      // Make dates with properties first say the date
      if (isDate(value)) {
        base = ' ' + Date.prototype.toUTCString.call(value);
      }

      // Make error with message first say the error
      if (isError(value)) {
        base = ' ' + formatError(value);
      }

      if (keys.length === 0 && (!array || value.length == 0)) {
        return braces[0] + base + braces[1];
      }

      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        } else {
          return ctx.stylize('[Object]', 'special');
        }
      }

      ctx.seen.push(value);

      var output;
      if (array) {
        output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
      } else {
        output = keys.map(function(key) {
          return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
        });
      }

      ctx.seen.pop();

      return reduceToSingleString(output, base, braces);
    }


    function formatPrimitive(ctx, value) {
      if (isUndefined(value))
        return ctx.stylize('undefined', 'undefined');
      if (isString(value)) {
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return ctx.stylize(simple, 'string');
      }
      if (isNumber(value))
        return ctx.stylize('' + value, 'number');
      if (isBoolean(value))
        return ctx.stylize('' + value, 'boolean');
      // For some reason typeof null is "object", so special case here.
      if (isNull(value))
        return ctx.stylize('null', 'null');
    }


    function formatError(value) {
      return '[' + Error.prototype.toString.call(value) + ']';
    }


    function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
      var output = [];
      for (var i = 0, l = value.length; i < l; ++i) {
        if (hasOwnProperty(value, String(i))) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              String(i), true));
        } else {
          output.push('');
        }
      }
      keys.forEach(function(key) {
        if (!key.match(/^\d+$/)) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              key, true));
        }
      });
      return output;
    }


    function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
      var name, str, desc;
      desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
      if (desc.get) {
        if (desc.set) {
          str = ctx.stylize('[Getter/Setter]', 'special');
        } else {
          str = ctx.stylize('[Getter]', 'special');
        }
      } else {
        if (desc.set) {
          str = ctx.stylize('[Setter]', 'special');
        }
      }
      if (!hasOwnProperty(visibleKeys, key)) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (ctx.seen.indexOf(desc.value) < 0) {
          if (isNull(recurseTimes)) {
            str = formatValue(ctx, desc.value, null);
          } else {
            str = formatValue(ctx, desc.value, recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (array) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = ctx.stylize('[Circular]', 'special');
        }
      }
      if (isUndefined(name)) {
        if (array && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = ctx.stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = ctx.stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    }


    function reduceToSingleString(output, base, braces) {
      var length = output.reduce(function(prev, cur) {
        if (cur.indexOf('\n') >= 0) ;
        return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
      }, 0);

      if (length > 60) {
        return braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];
      }

      return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }


    // NOTE: These type checking functions intentionally don't use `instanceof`
    // because it is fragile and can be easily faked with `Object.create()`.
    function isArray$1(ar) {
      return Array.isArray(ar);
    }

    function isBoolean(arg) {
      return typeof arg === 'boolean';
    }

    function isNull(arg) {
      return arg === null;
    }

    function isNumber(arg) {
      return typeof arg === 'number';
    }

    function isString(arg) {
      return typeof arg === 'string';
    }

    function isUndefined(arg) {
      return arg === void 0;
    }

    function isRegExp(re) {
      return isObject(re) && objectToString(re) === '[object RegExp]';
    }

    function isObject(arg) {
      return typeof arg === 'object' && arg !== null;
    }

    function isDate(d) {
      return isObject(d) && objectToString(d) === '[object Date]';
    }

    function isError(e) {
      return isObject(e) &&
          (objectToString(e) === '[object Error]' || e instanceof Error);
    }

    function isFunction(arg) {
      return typeof arg === 'function';
    }

    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }

    function _extend(origin, add) {
      // Don't do anything if add isn't an object
      if (!add || !isObject(add)) return origin;

      var keys = Object.keys(add);
      var i = keys.length;
      while (i--) {
        origin[keys[i]] = add[keys[i]];
      }
      return origin;
    }
    function hasOwnProperty(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }

    function BufferList() {
      this.head = null;
      this.tail = null;
      this.length = 0;
    }

    BufferList.prototype.push = function (v) {
      var entry = { data: v, next: null };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    };

    BufferList.prototype.unshift = function (v) {
      var entry = { data: v, next: this.head };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    };

    BufferList.prototype.shift = function () {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    };

    BufferList.prototype.clear = function () {
      this.head = this.tail = null;
      this.length = 0;
    };

    BufferList.prototype.join = function (s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;
      while (p = p.next) {
        ret += s + p.data;
      }return ret;
    };

    BufferList.prototype.concat = function (n) {
      if (this.length === 0) return Buffer.alloc(0);
      if (this.length === 1) return this.head.data;
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;
      while (p) {
        p.data.copy(ret, i);
        i += p.data.length;
        p = p.next;
      }
      return ret;
    };

    // Copyright Joyent, Inc. and other Node contributors.
    var isBufferEncoding = Buffer.isEncoding
      || function(encoding) {
           switch (encoding && encoding.toLowerCase()) {
             case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
             default: return false;
           }
         };


    function assertEncoding(encoding) {
      if (encoding && !isBufferEncoding(encoding)) {
        throw new Error('Unknown encoding: ' + encoding);
      }
    }

    // StringDecoder provides an interface for efficiently splitting a series of
    // buffers into a series of JS strings without breaking apart multi-byte
    // characters. CESU-8 is handled as part of the UTF-8 encoding.
    //
    // @TODO Handling all encodings inside a single object makes it very difficult
    // to reason about this code, so it should be split up in the future.
    // @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
    // points as used by CESU-8.
    function StringDecoder(encoding) {
      this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
      assertEncoding(encoding);
      switch (this.encoding) {
        case 'utf8':
          // CESU-8 represents each of Surrogate Pair by 3-bytes
          this.surrogateSize = 3;
          break;
        case 'ucs2':
        case 'utf16le':
          // UTF-16 represents each of Surrogate Pair by 2-bytes
          this.surrogateSize = 2;
          this.detectIncompleteChar = utf16DetectIncompleteChar;
          break;
        case 'base64':
          // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
          this.surrogateSize = 3;
          this.detectIncompleteChar = base64DetectIncompleteChar;
          break;
        default:
          this.write = passThroughWrite;
          return;
      }

      // Enough space to store all bytes of a single character. UTF-8 needs 4
      // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
      this.charBuffer = new Buffer(6);
      // Number of bytes received for the current incomplete multi-byte character.
      this.charReceived = 0;
      // Number of bytes expected for the current incomplete multi-byte character.
      this.charLength = 0;
    }

    // write decodes the given buffer and returns it as JS string that is
    // guaranteed to not contain any partial multi-byte characters. Any partial
    // character found at the end of the buffer is buffered up, and will be
    // returned when calling write again with the remaining bytes.
    //
    // Note: Converting a Buffer containing an orphan surrogate to a String
    // currently works, but converting a String to a Buffer (via `new Buffer`, or
    // Buffer#write) will replace incomplete surrogates with the unicode
    // replacement character. See https://codereview.chromium.org/121173009/ .
    StringDecoder.prototype.write = function(buffer) {
      var charStr = '';
      // if our last write ended with an incomplete multibyte character
      while (this.charLength) {
        // determine how many remaining bytes this buffer has to offer for this char
        var available = (buffer.length >= this.charLength - this.charReceived) ?
            this.charLength - this.charReceived :
            buffer.length;

        // add the new bytes to the char buffer
        buffer.copy(this.charBuffer, this.charReceived, 0, available);
        this.charReceived += available;

        if (this.charReceived < this.charLength) {
          // still not enough chars in this buffer? wait for more ...
          return '';
        }

        // remove bytes belonging to the current character from the buffer
        buffer = buffer.slice(available, buffer.length);

        // get the character that was split
        charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

        // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
        var charCode = charStr.charCodeAt(charStr.length - 1);
        if (charCode >= 0xD800 && charCode <= 0xDBFF) {
          this.charLength += this.surrogateSize;
          charStr = '';
          continue;
        }
        this.charReceived = this.charLength = 0;

        // if there are no more bytes in this buffer, just emit our char
        if (buffer.length === 0) {
          return charStr;
        }
        break;
      }

      // determine and set charLength / charReceived
      this.detectIncompleteChar(buffer);

      var end = buffer.length;
      if (this.charLength) {
        // buffer the incomplete character bytes we got
        buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
        end -= this.charReceived;
      }

      charStr += buffer.toString(this.encoding, 0, end);

      var end = charStr.length - 1;
      var charCode = charStr.charCodeAt(end);
      // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
      if (charCode >= 0xD800 && charCode <= 0xDBFF) {
        var size = this.surrogateSize;
        this.charLength += size;
        this.charReceived += size;
        this.charBuffer.copy(this.charBuffer, size, 0, size);
        buffer.copy(this.charBuffer, 0, 0, size);
        return charStr.substring(0, end);
      }

      // or just emit the charStr
      return charStr;
    };

    // detectIncompleteChar determines if there is an incomplete UTF-8 character at
    // the end of the given buffer. If so, it sets this.charLength to the byte
    // length that character, and sets this.charReceived to the number of bytes
    // that are available for this character.
    StringDecoder.prototype.detectIncompleteChar = function(buffer) {
      // determine how many bytes we have to check at the end of this buffer
      var i = (buffer.length >= 3) ? 3 : buffer.length;

      // Figure out if one of the last i bytes of our buffer announces an
      // incomplete char.
      for (; i > 0; i--) {
        var c = buffer[buffer.length - i];

        // See http://en.wikipedia.org/wiki/UTF-8#Description

        // 110XXXXX
        if (i == 1 && c >> 5 == 0x06) {
          this.charLength = 2;
          break;
        }

        // 1110XXXX
        if (i <= 2 && c >> 4 == 0x0E) {
          this.charLength = 3;
          break;
        }

        // 11110XXX
        if (i <= 3 && c >> 3 == 0x1E) {
          this.charLength = 4;
          break;
        }
      }
      this.charReceived = i;
    };

    StringDecoder.prototype.end = function(buffer) {
      var res = '';
      if (buffer && buffer.length)
        res = this.write(buffer);

      if (this.charReceived) {
        var cr = this.charReceived;
        var buf = this.charBuffer;
        var enc = this.encoding;
        res += buf.slice(0, cr).toString(enc);
      }

      return res;
    };

    function passThroughWrite(buffer) {
      return buffer.toString(this.encoding);
    }

    function utf16DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 2;
      this.charLength = this.charReceived ? 2 : 0;
    }

    function base64DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 3;
      this.charLength = this.charReceived ? 3 : 0;
    }

    Readable.ReadableState = ReadableState;

    var debug = debuglog('stream');
    inherits$1(Readable, EventEmitter);

    function prependListener(emitter, event, fn) {
      // Sadly this is not cacheable as some libraries bundle their own
      // event emitter implementation with them.
      if (typeof emitter.prependListener === 'function') {
        return emitter.prependListener(event, fn);
      } else {
        // This is a hack to make sure that our error handler is attached before any
        // userland ones.  NEVER DO THIS. This is here only because this code needs
        // to continue to work with older versions of Node.js that do not include
        // the prependListener() method. The goal is to eventually remove this hack.
        if (!emitter._events || !emitter._events[event])
          emitter.on(event, fn);
        else if (Array.isArray(emitter._events[event]))
          emitter._events[event].unshift(fn);
        else
          emitter._events[event] = [fn, emitter._events[event]];
      }
    }
    function listenerCount$1 (emitter, type) {
      return emitter.listeners(type).length;
    }
    function ReadableState(options, stream) {

      options = options || {};

      // object stream flag. Used to make read(n) ignore n and to
      // make all the buffer merging and length checks go away
      this.objectMode = !!options.objectMode;

      if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

      // the point at which it stops calling _read() to fill the buffer
      // Note: 0 is a valid value, means "don't call _read preemptively ever"
      var hwm = options.highWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

      // cast to ints.
      this.highWaterMark = ~ ~this.highWaterMark;

      // A linked list is used to store data chunks instead of an array because the
      // linked list can remove elements from the beginning faster than
      // array.shift()
      this.buffer = new BufferList();
      this.length = 0;
      this.pipes = null;
      this.pipesCount = 0;
      this.flowing = null;
      this.ended = false;
      this.endEmitted = false;
      this.reading = false;

      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, because any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;

      // whenever we return null, then we set a flag to say
      // that we're awaiting a 'readable' event emission.
      this.needReadable = false;
      this.emittedReadable = false;
      this.readableListening = false;
      this.resumeScheduled = false;

      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';

      // when piping, we only care about 'readable' events that happen
      // after read()ing all the bytes and not getting any pushback.
      this.ranOut = false;

      // the number of writers that are awaiting a drain event in .pipe()s
      this.awaitDrain = 0;

      // if true, a maybeReadMore has been scheduled
      this.readingMore = false;

      this.decoder = null;
      this.encoding = null;
      if (options.encoding) {
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable(options) {

      if (!(this instanceof Readable)) return new Readable(options);

      this._readableState = new ReadableState(options, this);

      // legacy
      this.readable = true;

      if (options && typeof options.read === 'function') this._read = options.read;

      EventEmitter.call(this);
    }

    // Manually shove something into the read() buffer.
    // This returns true if the highWaterMark has not been hit yet,
    // similar to how Writable.write() returns true if you should
    // write() some more.
    Readable.prototype.push = function (chunk, encoding) {
      var state = this._readableState;

      if (!state.objectMode && typeof chunk === 'string') {
        encoding = encoding || state.defaultEncoding;
        if (encoding !== state.encoding) {
          chunk = Buffer.from(chunk, encoding);
          encoding = '';
        }
      }

      return readableAddChunk(this, state, chunk, encoding, false);
    };

    // Unshift should *always* be something directly out of read()
    Readable.prototype.unshift = function (chunk) {
      var state = this._readableState;
      return readableAddChunk(this, state, chunk, '', true);
    };

    Readable.prototype.isPaused = function () {
      return this._readableState.flowing === false;
    };

    function readableAddChunk(stream, state, chunk, encoding, addToFront) {
      var er = chunkInvalid(state, chunk);
      if (er) {
        stream.emit('error', er);
      } else if (chunk === null) {
        state.reading = false;
        onEofChunk(stream, state);
      } else if (state.objectMode || chunk && chunk.length > 0) {
        if (state.ended && !addToFront) {
          var e = new Error('stream.push() after EOF');
          stream.emit('error', e);
        } else if (state.endEmitted && addToFront) {
          var _e = new Error('stream.unshift() after end event');
          stream.emit('error', _e);
        } else {
          var skipAdd;
          if (state.decoder && !addToFront && !encoding) {
            chunk = state.decoder.write(chunk);
            skipAdd = !state.objectMode && chunk.length === 0;
          }

          if (!addToFront) state.reading = false;

          // Don't add to the buffer if we've decoded to an empty string chunk and
          // we're not in object mode
          if (!skipAdd) {
            // if we want the data now, just emit it.
            if (state.flowing && state.length === 0 && !state.sync) {
              stream.emit('data', chunk);
              stream.read(0);
            } else {
              // update the buffer info.
              state.length += state.objectMode ? 1 : chunk.length;
              if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

              if (state.needReadable) emitReadable(stream);
            }
          }

          maybeReadMore(stream, state);
        }
      } else if (!addToFront) {
        state.reading = false;
      }

      return needMoreData(state);
    }

    // if it's past the high water mark, we can push in some more.
    // Also, if we have no data yet, we can stand some
    // more bytes.  This is to work around cases where hwm=0,
    // such as the repl.  Also, if the push() triggered a
    // readable event, and the user called read(largeNumber) such that
    // needReadable was set, then we ought to push more, so that another
    // 'readable' event will be triggered.
    function needMoreData(state) {
      return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
    }

    // backwards compatibility.
    Readable.prototype.setEncoding = function (enc) {
      this._readableState.decoder = new StringDecoder(enc);
      this._readableState.encoding = enc;
      return this;
    };

    // Don't raise the hwm > 8MB
    var MAX_HWM = 0x800000;
    function computeNewHighWaterMark(n) {
      if (n >= MAX_HWM) {
        n = MAX_HWM;
      } else {
        // Get the next highest power of 2 to prevent increasing hwm excessively in
        // tiny amounts
        n--;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        n++;
      }
      return n;
    }

    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function howMuchToRead(n, state) {
      if (n <= 0 || state.length === 0 && state.ended) return 0;
      if (state.objectMode) return 1;
      if (n !== n) {
        // Only flow one buffer at a time
        if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
      }
      // If we're asking for more than the current hwm, then raise the hwm.
      if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
      if (n <= state.length) return n;
      // Don't have enough
      if (!state.ended) {
        state.needReadable = true;
        return 0;
      }
      return state.length;
    }

    // you can override either this method, or the async _read(n) below.
    Readable.prototype.read = function (n) {
      debug('read', n);
      n = parseInt(n, 10);
      var state = this._readableState;
      var nOrig = n;

      if (n !== 0) state.emittedReadable = false;

      // if we're doing read(0) to trigger a readable event, but we
      // already have a bunch of data in the buffer, then just trigger
      // the 'readable' event and move on.
      if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
        debug('read: emitReadable', state.length, state.ended);
        if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
        return null;
      }

      n = howMuchToRead(n, state);

      // if we've ended, and we're now clear, then finish it up.
      if (n === 0 && state.ended) {
        if (state.length === 0) endReadable(this);
        return null;
      }

      // All the actual chunk generation logic needs to be
      // *below* the call to _read.  The reason is that in certain
      // synthetic stream cases, such as passthrough streams, _read
      // may be a completely synchronous operation which may change
      // the state of the read buffer, providing enough data when
      // before there was *not* enough.
      //
      // So, the steps are:
      // 1. Figure out what the state of things will be after we do
      // a read from the buffer.
      //
      // 2. If that resulting state will trigger a _read, then call _read.
      // Note that this may be asynchronous, or synchronous.  Yes, it is
      // deeply ugly to write APIs this way, but that still doesn't mean
      // that the Readable class should behave improperly, as streams are
      // designed to be sync/async agnostic.
      // Take note if the _read call is sync or async (ie, if the read call
      // has returned yet), so that we know whether or not it's safe to emit
      // 'readable' etc.
      //
      // 3. Actually pull the requested chunks out of the buffer and return.

      // if we need a readable event, then we need to do some reading.
      var doRead = state.needReadable;
      debug('need readable', doRead);

      // if we currently have less than the highWaterMark, then also read some
      if (state.length === 0 || state.length - n < state.highWaterMark) {
        doRead = true;
        debug('length less than watermark', doRead);
      }

      // however, if we've ended, then there's no point, and if we're already
      // reading, then it's unnecessary.
      if (state.ended || state.reading) {
        doRead = false;
        debug('reading or ended', doRead);
      } else if (doRead) {
        debug('do read');
        state.reading = true;
        state.sync = true;
        // if the length is currently zero, then we *need* a readable event.
        if (state.length === 0) state.needReadable = true;
        // call internal read method
        this._read(state.highWaterMark);
        state.sync = false;
        // If _read pushed data synchronously, then `reading` will be false,
        // and we need to re-evaluate how much data we can return to the user.
        if (!state.reading) n = howMuchToRead(nOrig, state);
      }

      var ret;
      if (n > 0) ret = fromList(n, state);else ret = null;

      if (ret === null) {
        state.needReadable = true;
        n = 0;
      } else {
        state.length -= n;
      }

      if (state.length === 0) {
        // If we have nothing in the buffer, then we want to know
        // as soon as we *do* get something into the buffer.
        if (!state.ended) state.needReadable = true;

        // If we tried to read() past the EOF, then emit end on the next tick.
        if (nOrig !== n && state.ended) endReadable(this);
      }

      if (ret !== null) this.emit('data', ret);

      return ret;
    };

    function chunkInvalid(state, chunk) {
      var er = null;
      if (!isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      return er;
    }

    function onEofChunk(stream, state) {
      if (state.ended) return;
      if (state.decoder) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;

      // emit 'readable' now to make sure it gets picked up.
      emitReadable(stream);
    }

    // Don't emit readable right away in sync mode, because this can trigger
    // another read() call => stack overflow.  This way, it might trigger
    // a nextTick recursion warning, but that's not so bad.
    function emitReadable(stream) {
      var state = stream._readableState;
      state.needReadable = false;
      if (!state.emittedReadable) {
        debug('emitReadable', state.flowing);
        state.emittedReadable = true;
        if (state.sync) nextTick(emitReadable_, stream);else emitReadable_(stream);
      }
    }

    function emitReadable_(stream) {
      debug('emit readable');
      stream.emit('readable');
      flow(stream);
    }

    // at this point, the user has presumably seen the 'readable' event,
    // and called read() to consume some data.  that may have triggered
    // in turn another _read(n) call, in which case reading = true if
    // it's in progress.
    // However, if we're not ended, or reading, and the length < hwm,
    // then go ahead and try to read some more preemptively.
    function maybeReadMore(stream, state) {
      if (!state.readingMore) {
        state.readingMore = true;
        nextTick(maybeReadMore_, stream, state);
      }
    }

    function maybeReadMore_(stream, state) {
      var len = state.length;
      while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
        debug('maybeReadMore read 0');
        stream.read(0);
        if (len === state.length)
          // didn't get any data, stop spinning.
          break;else len = state.length;
      }
      state.readingMore = false;
    }

    // abstract method.  to be overridden in specific implementation classes.
    // call cb(er, data) where data is <= n in length.
    // for virtual (non-string, non-buffer) streams, "length" is somewhat
    // arbitrary, and perhaps not very meaningful.
    Readable.prototype._read = function (n) {
      this.emit('error', new Error('not implemented'));
    };

    Readable.prototype.pipe = function (dest, pipeOpts) {
      var src = this;
      var state = this._readableState;

      switch (state.pipesCount) {
        case 0:
          state.pipes = dest;
          break;
        case 1:
          state.pipes = [state.pipes, dest];
          break;
        default:
          state.pipes.push(dest);
          break;
      }
      state.pipesCount += 1;
      debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

      var doEnd = (!pipeOpts || pipeOpts.end !== false);

      var endFn = doEnd ? onend : cleanup;
      if (state.endEmitted) nextTick(endFn);else src.once('end', endFn);

      dest.on('unpipe', onunpipe);
      function onunpipe(readable) {
        debug('onunpipe');
        if (readable === src) {
          cleanup();
        }
      }

      function onend() {
        debug('onend');
        dest.end();
      }

      // when the dest drains, it reduces the awaitDrain counter
      // on the source.  This would be more elegant with a .once()
      // handler in flow(), but adding and removing repeatedly is
      // too slow.
      var ondrain = pipeOnDrain(src);
      dest.on('drain', ondrain);

      var cleanedUp = false;
      function cleanup() {
        debug('cleanup');
        // cleanup event handlers once the pipe is broken
        dest.removeListener('close', onclose);
        dest.removeListener('finish', onfinish);
        dest.removeListener('drain', ondrain);
        dest.removeListener('error', onerror);
        dest.removeListener('unpipe', onunpipe);
        src.removeListener('end', onend);
        src.removeListener('end', cleanup);
        src.removeListener('data', ondata);

        cleanedUp = true;

        // if the reader is waiting for a drain event from this
        // specific writer, then it would cause it to never start
        // flowing again.
        // So, if this is awaiting a drain, then we just call it now.
        // If we don't know, then assume that we are waiting for one.
        if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
      }

      // If the user pushes more data while we're writing to dest then we'll end up
      // in ondata again. However, we only want to increase awaitDrain once because
      // dest will only emit one 'drain' event for the multiple writes.
      // => Introduce a guard on increasing awaitDrain.
      var increasedAwaitDrain = false;
      src.on('data', ondata);
      function ondata(chunk) {
        debug('ondata');
        increasedAwaitDrain = false;
        var ret = dest.write(chunk);
        if (false === ret && !increasedAwaitDrain) {
          // If the user unpiped during `dest.write()`, it is possible
          // to get stuck in a permanently paused state if that write
          // also returned false.
          // => Check whether `dest` is still a piping destination.
          if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
            debug('false write response, pause', src._readableState.awaitDrain);
            src._readableState.awaitDrain++;
            increasedAwaitDrain = true;
          }
          src.pause();
        }
      }

      // if the dest has an error, then stop piping into it.
      // however, don't suppress the throwing behavior for this.
      function onerror(er) {
        debug('onerror', er);
        unpipe();
        dest.removeListener('error', onerror);
        if (listenerCount$1(dest, 'error') === 0) dest.emit('error', er);
      }

      // Make sure our error handler is attached before userland ones.
      prependListener(dest, 'error', onerror);

      // Both close and finish should trigger unpipe, but only once.
      function onclose() {
        dest.removeListener('finish', onfinish);
        unpipe();
      }
      dest.once('close', onclose);
      function onfinish() {
        debug('onfinish');
        dest.removeListener('close', onclose);
        unpipe();
      }
      dest.once('finish', onfinish);

      function unpipe() {
        debug('unpipe');
        src.unpipe(dest);
      }

      // tell the dest that it's being piped to
      dest.emit('pipe', src);

      // start the flow if it hasn't been started already.
      if (!state.flowing) {
        debug('pipe resume');
        src.resume();
      }

      return dest;
    };

    function pipeOnDrain(src) {
      return function () {
        var state = src._readableState;
        debug('pipeOnDrain', state.awaitDrain);
        if (state.awaitDrain) state.awaitDrain--;
        if (state.awaitDrain === 0 && src.listeners('data').length) {
          state.flowing = true;
          flow(src);
        }
      };
    }

    Readable.prototype.unpipe = function (dest) {
      var state = this._readableState;

      // if we're not piping anywhere, then do nothing.
      if (state.pipesCount === 0) return this;

      // just one destination.  most common case.
      if (state.pipesCount === 1) {
        // passed in one, but it's not the right one.
        if (dest && dest !== state.pipes) return this;

        if (!dest) dest = state.pipes;

        // got a match.
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        if (dest) dest.emit('unpipe', this);
        return this;
      }

      // slow case. multiple pipe destinations.

      if (!dest) {
        // remove all.
        var dests = state.pipes;
        var len = state.pipesCount;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;

        for (var _i = 0; _i < len; _i++) {
          dests[_i].emit('unpipe', this);
        }return this;
      }

      // try to find the right one.
      var i = indexOf(state.pipes, dest);
      if (i === -1) return this;

      state.pipes.splice(i, 1);
      state.pipesCount -= 1;
      if (state.pipesCount === 1) state.pipes = state.pipes[0];

      dest.emit('unpipe', this);

      return this;
    };

    // set up data events if they are asked for
    // Ensure readable listeners eventually get something
    Readable.prototype.on = function (ev, fn) {
      var res = EventEmitter.prototype.on.call(this, ev, fn);

      if (ev === 'data') {
        // Start flowing on next tick if stream isn't explicitly paused
        if (this._readableState.flowing !== false) this.resume();
      } else if (ev === 'readable') {
        var state = this._readableState;
        if (!state.endEmitted && !state.readableListening) {
          state.readableListening = state.needReadable = true;
          state.emittedReadable = false;
          if (!state.reading) {
            nextTick(nReadingNextTick, this);
          } else if (state.length) {
            emitReadable(this);
          }
        }
      }

      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;

    function nReadingNextTick(self) {
      debug('readable nexttick read 0');
      self.read(0);
    }

    // pause() and resume() are remnants of the legacy readable stream API
    // If the user uses them, then switch into old mode.
    Readable.prototype.resume = function () {
      var state = this._readableState;
      if (!state.flowing) {
        debug('resume');
        state.flowing = true;
        resume(this, state);
      }
      return this;
    };

    function resume(stream, state) {
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        nextTick(resume_, stream, state);
      }
    }

    function resume_(stream, state) {
      if (!state.reading) {
        debug('resume read 0');
        stream.read(0);
      }

      state.resumeScheduled = false;
      state.awaitDrain = 0;
      stream.emit('resume');
      flow(stream);
      if (state.flowing && !state.reading) stream.read(0);
    }

    Readable.prototype.pause = function () {
      debug('call pause flowing=%j', this._readableState.flowing);
      if (false !== this._readableState.flowing) {
        debug('pause');
        this._readableState.flowing = false;
        this.emit('pause');
      }
      return this;
    };

    function flow(stream) {
      var state = stream._readableState;
      debug('flow', state.flowing);
      while (state.flowing && stream.read() !== null) {}
    }

    // wrap an old-style stream as the async data source.
    // This is *not* part of the readable stream interface.
    // It is an ugly unfortunate mess of history.
    Readable.prototype.wrap = function (stream) {
      var state = this._readableState;
      var paused = false;

      var self = this;
      stream.on('end', function () {
        debug('wrapped end');
        if (state.decoder && !state.ended) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length) self.push(chunk);
        }

        self.push(null);
      });

      stream.on('data', function (chunk) {
        debug('wrapped data');
        if (state.decoder) chunk = state.decoder.write(chunk);

        // don't skip over falsy values in objectMode
        if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

        var ret = self.push(chunk);
        if (!ret) {
          paused = true;
          stream.pause();
        }
      });

      // proxy all the other methods.
      // important when wrapping filters and duplexes.
      for (var i in stream) {
        if (this[i] === undefined && typeof stream[i] === 'function') {
          this[i] = function (method) {
            return function () {
              return stream[method].apply(stream, arguments);
            };
          }(i);
        }
      }

      // proxy certain important events.
      var events = ['error', 'close', 'destroy', 'pause', 'resume'];
      forEach(events, function (ev) {
        stream.on(ev, self.emit.bind(self, ev));
      });

      // when we try to consume some more bytes, simply unpause the
      // underlying stream.
      self._read = function (n) {
        debug('wrapped _read', n);
        if (paused) {
          paused = false;
          stream.resume();
        }
      };

      return self;
    };

    // exposed for testing purposes only.
    Readable._fromList = fromList;

    // Pluck off n bytes from an array of buffers.
    // Length is the combined lengths of all the buffers in the list.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function fromList(n, state) {
      // nothing buffered
      if (state.length === 0) return null;

      var ret;
      if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
        // read it all, truncate the list
        if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
        state.buffer.clear();
      } else {
        // read part of list
        ret = fromListPartial(n, state.buffer, state.decoder);
      }

      return ret;
    }

    // Extracts only enough buffered data to satisfy the amount requested.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function fromListPartial(n, list, hasStrings) {
      var ret;
      if (n < list.head.data.length) {
        // slice is the same for buffers and strings
        ret = list.head.data.slice(0, n);
        list.head.data = list.head.data.slice(n);
      } else if (n === list.head.data.length) {
        // first chunk is a perfect match
        ret = list.shift();
      } else {
        // result spans more than one buffer
        ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
      }
      return ret;
    }

    // Copies a specified amount of characters from the list of buffered data
    // chunks.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function copyFromBufferString(n, list) {
      var p = list.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) list.head = p.next;else list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }

    // Copies a specified amount of bytes from the list of buffered data chunks.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function copyFromBuffer(n, list) {
      var ret = Buffer.allocUnsafe(n);
      var p = list.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) list.head = p.next;else list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }

    function endReadable(stream) {
      var state = stream._readableState;

      // If we get here before consuming all the bytes, then that is a
      // bug in node.  Should never happen.
      if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

      if (!state.endEmitted) {
        state.ended = true;
        nextTick(endReadableNT, state, stream);
      }
    }

    function endReadableNT(state, stream) {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    }

    function forEach(xs, f) {
      for (var i = 0, l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }

    function indexOf(xs, x) {
      for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) return i;
      }
      return -1;
    }

    // A bit simpler than readable streams.
    Writable.WritableState = WritableState;
    inherits$1(Writable, EventEmitter);

    function nop() {}

    function WriteReq(chunk, encoding, cb) {
      this.chunk = chunk;
      this.encoding = encoding;
      this.callback = cb;
      this.next = null;
    }

    function WritableState(options, stream) {
      Object.defineProperty(this, 'buffer', {
        get: deprecate(function () {
          return this.getBuffer();
        }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
      });
      options = options || {};

      // object stream flag to indicate whether or not this stream
      // contains buffers or objects.
      this.objectMode = !!options.objectMode;

      if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

      // the point at which write() starts returning false
      // Note: 0 is a valid value, means that we always return false if
      // the entire buffer is not flushed immediately on write()
      var hwm = options.highWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

      // cast to ints.
      this.highWaterMark = ~ ~this.highWaterMark;

      this.needDrain = false;
      // at the start of calling end()
      this.ending = false;
      // when end() has been called, and returned
      this.ended = false;
      // when 'finish' is emitted
      this.finished = false;

      // should we decode strings into buffers before passing to _write?
      // this is here so that some node-core streams can optimize string
      // handling at a lower level.
      var noDecode = options.decodeStrings === false;
      this.decodeStrings = !noDecode;

      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';

      // not an actual buffer we keep track of, but a measurement
      // of how much we're waiting to get pushed to some underlying
      // socket or file.
      this.length = 0;

      // a flag to see when we're in the middle of a write.
      this.writing = false;

      // when true all writes will be buffered until .uncork() call
      this.corked = 0;

      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, because any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;

      // a flag to know if we're processing previously buffered items, which
      // may call the _write() callback in the same tick, so that we don't
      // end up in an overlapped onwrite situation.
      this.bufferProcessing = false;

      // the callback that's passed to _write(chunk,cb)
      this.onwrite = function (er) {
        onwrite(stream, er);
      };

      // the callback that the user supplies to write(chunk,encoding,cb)
      this.writecb = null;

      // the amount that is being written when _write is called.
      this.writelen = 0;

      this.bufferedRequest = null;
      this.lastBufferedRequest = null;

      // number of pending user-supplied write callbacks
      // this must be 0 before 'finish' can be emitted
      this.pendingcb = 0;

      // emit prefinish if the only thing we're waiting for is _write cbs
      // This is relevant for synchronous Transform streams
      this.prefinished = false;

      // True if the error was already emitted and should not be thrown again
      this.errorEmitted = false;

      // count buffered requests
      this.bufferedRequestCount = 0;

      // allocate the first CorkedRequest, there is always
      // one allocated and free to use, and we maintain at most two
      this.corkedRequestsFree = new CorkedRequest(this);
    }

    WritableState.prototype.getBuffer = function writableStateGetBuffer() {
      var current = this.bufferedRequest;
      var out = [];
      while (current) {
        out.push(current);
        current = current.next;
      }
      return out;
    };
    function Writable(options) {

      // Writable ctor is applied to Duplexes, though they're not
      // instanceof Writable, they're instanceof Readable.
      if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

      this._writableState = new WritableState(options, this);

      // legacy.
      this.writable = true;

      if (options) {
        if (typeof options.write === 'function') this._write = options.write;

        if (typeof options.writev === 'function') this._writev = options.writev;
      }

      EventEmitter.call(this);
    }

    // Otherwise people can pipe Writable streams, which is just wrong.
    Writable.prototype.pipe = function () {
      this.emit('error', new Error('Cannot pipe, not readable'));
    };

    function writeAfterEnd(stream, cb) {
      var er = new Error('write after end');
      // TODO: defer error events consistently everywhere, not just the cb
      stream.emit('error', er);
      nextTick(cb, er);
    }

    // If we get something that is not a buffer, string, null, or undefined,
    // and we're not in objectMode, then that's an error.
    // Otherwise stream chunks are all considered to be of length=1, and the
    // watermarks determine how many objects to keep in the buffer, rather than
    // how many bytes or characters.
    function validChunk(stream, state, chunk, cb) {
      var valid = true;
      var er = false;
      // Always throw error if a null is written
      // if we are not in object mode then throw
      // if it is not a buffer, string, or undefined.
      if (chunk === null) {
        er = new TypeError('May not write null values to stream');
      } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      if (er) {
        stream.emit('error', er);
        nextTick(cb, er);
        valid = false;
      }
      return valid;
    }

    Writable.prototype.write = function (chunk, encoding, cb) {
      var state = this._writableState;
      var ret = false;

      if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }

      if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

      if (typeof cb !== 'function') cb = nop;

      if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
        state.pendingcb++;
        ret = writeOrBuffer(this, state, chunk, encoding, cb);
      }

      return ret;
    };

    Writable.prototype.cork = function () {
      var state = this._writableState;

      state.corked++;
    };

    Writable.prototype.uncork = function () {
      var state = this._writableState;

      if (state.corked) {
        state.corked--;

        if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
      }
    };

    Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
      // node::ParseEncoding() requires lower case.
      if (typeof encoding === 'string') encoding = encoding.toLowerCase();
      if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
      this._writableState.defaultEncoding = encoding;
      return this;
    };

    function decodeChunk(state, chunk, encoding) {
      if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
        chunk = Buffer.from(chunk, encoding);
      }
      return chunk;
    }

    // if we're already writing something, then just put this
    // in the queue, and wait our turn.  Otherwise, call _write
    // If we return false, then we need a drain event, so set that flag.
    function writeOrBuffer(stream, state, chunk, encoding, cb) {
      chunk = decodeChunk(state, chunk, encoding);

      if (Buffer.isBuffer(chunk)) encoding = 'buffer';
      var len = state.objectMode ? 1 : chunk.length;

      state.length += len;

      var ret = state.length < state.highWaterMark;
      // we must ensure that previous needDrain will not be reset to false.
      if (!ret) state.needDrain = true;

      if (state.writing || state.corked) {
        var last = state.lastBufferedRequest;
        state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
        if (last) {
          last.next = state.lastBufferedRequest;
        } else {
          state.bufferedRequest = state.lastBufferedRequest;
        }
        state.bufferedRequestCount += 1;
      } else {
        doWrite(stream, state, false, len, chunk, encoding, cb);
      }

      return ret;
    }

    function doWrite(stream, state, writev, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }

    function onwriteError(stream, state, sync, er, cb) {
      --state.pendingcb;
      if (sync) nextTick(cb, er);else cb(er);

      stream._writableState.errorEmitted = true;
      stream.emit('error', er);
    }

    function onwriteStateUpdate(state) {
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
    }

    function onwrite(stream, er) {
      var state = stream._writableState;
      var sync = state.sync;
      var cb = state.writecb;

      onwriteStateUpdate(state);

      if (er) onwriteError(stream, state, sync, er, cb);else {
        // Check if we're actually ready to finish, but don't emit yet
        var finished = needFinish(state);

        if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
          clearBuffer(stream, state);
        }

        if (sync) {
          /*<replacement>*/
            nextTick(afterWrite, stream, state, finished, cb);
          /*</replacement>*/
        } else {
            afterWrite(stream, state, finished, cb);
          }
      }
    }

    function afterWrite(stream, state, finished, cb) {
      if (!finished) onwriteDrain(stream, state);
      state.pendingcb--;
      cb();
      finishMaybe(stream, state);
    }

    // Must force callback to be called on nextTick, so that we don't
    // emit 'drain' before the write() consumer gets the 'false' return
    // value, and has a chance to attach a 'drain' listener.
    function onwriteDrain(stream, state) {
      if (state.length === 0 && state.needDrain) {
        state.needDrain = false;
        stream.emit('drain');
      }
    }

    // if there's something in the buffer waiting, then process it
    function clearBuffer(stream, state) {
      state.bufferProcessing = true;
      var entry = state.bufferedRequest;

      if (stream._writev && entry && entry.next) {
        // Fast case, write everything using _writev()
        var l = state.bufferedRequestCount;
        var buffer = new Array(l);
        var holder = state.corkedRequestsFree;
        holder.entry = entry;

        var count = 0;
        while (entry) {
          buffer[count] = entry;
          entry = entry.next;
          count += 1;
        }

        doWrite(stream, state, true, state.length, buffer, '', holder.finish);

        // doWrite is almost always async, defer these to save a bit of time
        // as the hot path ends with doWrite
        state.pendingcb++;
        state.lastBufferedRequest = null;
        if (holder.next) {
          state.corkedRequestsFree = holder.next;
          holder.next = null;
        } else {
          state.corkedRequestsFree = new CorkedRequest(state);
        }
      } else {
        // Slow case, write chunks one-by-one
        while (entry) {
          var chunk = entry.chunk;
          var encoding = entry.encoding;
          var cb = entry.callback;
          var len = state.objectMode ? 1 : chunk.length;

          doWrite(stream, state, false, len, chunk, encoding, cb);
          entry = entry.next;
          // if we didn't call the onwrite immediately, then
          // it means that we need to wait until it does.
          // also, that means that the chunk and cb are currently
          // being processed, so move the buffer counter past them.
          if (state.writing) {
            break;
          }
        }

        if (entry === null) state.lastBufferedRequest = null;
      }

      state.bufferedRequestCount = 0;
      state.bufferedRequest = entry;
      state.bufferProcessing = false;
    }

    Writable.prototype._write = function (chunk, encoding, cb) {
      cb(new Error('not implemented'));
    };

    Writable.prototype._writev = null;

    Writable.prototype.end = function (chunk, encoding, cb) {
      var state = this._writableState;

      if (typeof chunk === 'function') {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }

      if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

      // .end() fully uncorks
      if (state.corked) {
        state.corked = 1;
        this.uncork();
      }

      // ignore unnecessary end() calls.
      if (!state.ending && !state.finished) endWritable(this, state, cb);
    };

    function needFinish(state) {
      return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
    }

    function prefinish(stream, state) {
      if (!state.prefinished) {
        state.prefinished = true;
        stream.emit('prefinish');
      }
    }

    function finishMaybe(stream, state) {
      var need = needFinish(state);
      if (need) {
        if (state.pendingcb === 0) {
          prefinish(stream, state);
          state.finished = true;
          stream.emit('finish');
        } else {
          prefinish(stream, state);
        }
      }
      return need;
    }

    function endWritable(stream, state, cb) {
      state.ending = true;
      finishMaybe(stream, state);
      if (cb) {
        if (state.finished) nextTick(cb);else stream.once('finish', cb);
      }
      state.ended = true;
      stream.writable = false;
    }

    // It seems a linked list but it is not
    // there will be only 2 of these for each stream
    function CorkedRequest(state) {
      var _this = this;

      this.next = null;
      this.entry = null;

      this.finish = function (err) {
        var entry = _this.entry;
        _this.entry = null;
        while (entry) {
          var cb = entry.callback;
          state.pendingcb--;
          cb(err);
          entry = entry.next;
        }
        if (state.corkedRequestsFree) {
          state.corkedRequestsFree.next = _this;
        } else {
          state.corkedRequestsFree = _this;
        }
      };
    }

    inherits$1(Duplex, Readable);

    var keys = Object.keys(Writable.prototype);
    for (var v = 0; v < keys.length; v++) {
      var method = keys[v];
      if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
    }
    function Duplex(options) {
      if (!(this instanceof Duplex)) return new Duplex(options);

      Readable.call(this, options);
      Writable.call(this, options);

      if (options && options.readable === false) this.readable = false;

      if (options && options.writable === false) this.writable = false;

      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

      this.once('end', onend);
    }

    // the no-half-open enforcer
    function onend() {
      // if we allow half-open state, or if the writable side ended,
      // then we're ok.
      if (this.allowHalfOpen || this._writableState.ended) return;

      // no more data can be written.
      // But allow more writes to happen in this tick.
      nextTick(onEndNT, this);
    }

    function onEndNT(self) {
      self.end();
    }

    // a transform stream is a readable/writable stream where you do
    inherits$1(Transform, Duplex);

    function TransformState(stream) {
      this.afterTransform = function (er, data) {
        return afterTransform(stream, er, data);
      };

      this.needTransform = false;
      this.transforming = false;
      this.writecb = null;
      this.writechunk = null;
      this.writeencoding = null;
    }

    function afterTransform(stream, er, data) {
      var ts = stream._transformState;
      ts.transforming = false;

      var cb = ts.writecb;

      if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

      ts.writechunk = null;
      ts.writecb = null;

      if (data !== null && data !== undefined) stream.push(data);

      cb(er);

      var rs = stream._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        stream._read(rs.highWaterMark);
      }
    }
    function Transform(options) {
      if (!(this instanceof Transform)) return new Transform(options);

      Duplex.call(this, options);

      this._transformState = new TransformState(this);

      // when the writable side finishes, then flush out anything remaining.
      var stream = this;

      // start out asking for a readable event once data is transformed.
      this._readableState.needReadable = true;

      // we have implemented the _read method, and done the other things
      // that Readable wants before the first _read call, so unset the
      // sync guard flag.
      this._readableState.sync = false;

      if (options) {
        if (typeof options.transform === 'function') this._transform = options.transform;

        if (typeof options.flush === 'function') this._flush = options.flush;
      }

      this.once('prefinish', function () {
        if (typeof this._flush === 'function') this._flush(function (er) {
          done(stream, er);
        });else done(stream);
      });
    }

    Transform.prototype.push = function (chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };

    // This is the part where you do stuff!
    // override this function in implementation classes.
    // 'chunk' is an input chunk.
    //
    // Call `push(newChunk)` to pass along transformed output
    // to the readable side.  You may call 'push' zero or more times.
    //
    // Call `cb(err)` when you are done with this chunk.  If you pass
    // an error, then that'll put the hurt on the whole operation.  If you
    // never call cb(), then you'll never get another chunk.
    Transform.prototype._transform = function (chunk, encoding, cb) {
      throw new Error('Not implemented');
    };

    Transform.prototype._write = function (chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
      }
    };

    // Doesn't matter what the args are here.
    // _transform does all the work.
    // That we got here means that the readable side wants more data.
    Transform.prototype._read = function (n) {
      var ts = this._transformState;

      if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        // mark that we need a transform, so that any data that comes in
        // will get processed, now that we've asked for it.
        ts.needTransform = true;
      }
    };

    function done(stream, er) {
      if (er) return stream.emit('error', er);

      // if there's nothing in the write buffer, then that means
      // that nothing more will ever be provided
      var ws = stream._writableState;
      var ts = stream._transformState;

      if (ws.length) throw new Error('Calling transform done when ws.length != 0');

      if (ts.transforming) throw new Error('Calling transform done when still transforming');

      return stream.push(null);
    }

    inherits$1(PassThrough, Transform);
    function PassThrough(options) {
      if (!(this instanceof PassThrough)) return new PassThrough(options);

      Transform.call(this, options);
    }

    PassThrough.prototype._transform = function (chunk, encoding, cb) {
      cb(null, chunk);
    };

    inherits$1(Stream, EventEmitter);
    Stream.Readable = Readable;
    Stream.Writable = Writable;
    Stream.Duplex = Duplex;
    Stream.Transform = Transform;
    Stream.PassThrough = PassThrough;

    // Backwards-compat with node 0.4.x
    Stream.Stream = Stream;

    // old-style streams.  Note that the pipe method (the only relevant
    // part of this class) is overridden in the Readable class.

    function Stream() {
      EventEmitter.call(this);
    }

    Stream.prototype.pipe = function(dest, options) {
      var source = this;

      function ondata(chunk) {
        if (dest.writable) {
          if (false === dest.write(chunk) && source.pause) {
            source.pause();
          }
        }
      }

      source.on('data', ondata);

      function ondrain() {
        if (source.readable && source.resume) {
          source.resume();
        }
      }

      dest.on('drain', ondrain);

      // If the 'end' option is not supplied, dest.end() will be called when
      // source gets the 'end' or 'close' events.  Only dest.end() once.
      if (!dest._isStdio && (!options || options.end !== false)) {
        source.on('end', onend);
        source.on('close', onclose);
      }

      var didOnEnd = false;
      function onend() {
        if (didOnEnd) return;
        didOnEnd = true;

        dest.end();
      }


      function onclose() {
        if (didOnEnd) return;
        didOnEnd = true;

        if (typeof dest.destroy === 'function') dest.destroy();
      }

      // don't leave dangling pipes when there are errors.
      function onerror(er) {
        cleanup();
        if (EventEmitter.listenerCount(this, 'error') === 0) {
          throw er; // Unhandled stream error in pipe.
        }
      }

      source.on('error', onerror);
      dest.on('error', onerror);

      // remove all the event listeners that were added.
      function cleanup() {
        source.removeListener('data', ondata);
        dest.removeListener('drain', ondrain);

        source.removeListener('end', onend);
        source.removeListener('close', onclose);

        source.removeListener('error', onerror);
        dest.removeListener('error', onerror);

        source.removeListener('end', cleanup);
        source.removeListener('close', cleanup);

        dest.removeListener('close', cleanup);
      }

      source.on('end', cleanup);
      source.on('close', cleanup);

      dest.on('close', cleanup);

      dest.emit('pipe', source);

      // Allow for unix-like usage: A.pipe(B).pipe(C)
      return dest;
    };

    var lzutf8 = createCommonjsModule(function (module) {
    /*!
     LZ-UTF8 v0.5.5

     Copyright (c) 2018, Rotem Dan
     Released under the MIT license.

     Build date: 2018-07-30 

     Please report any issue at https://github.com/rotemdan/lzutf8.js/issues
    */
    var LZUTF8;
    (function (LZUTF8) {
        LZUTF8.runningInNodeJS = function () {
            return ((typeof process === "object") && (typeof process.versions === "object") && (typeof process.versions.node === "string"));
        };
        LZUTF8.runningInMainNodeJSModule = function () {
            return LZUTF8.runningInNodeJS() && commonjsRequire.main === module;
        };
        LZUTF8.commonJSAvailable = function () {
            return  'object' === "object";
        };
        LZUTF8.runningInWebWorker = function () {
            return typeof window === "undefined" && typeof self === "object" && typeof self.addEventListener === "function" && typeof self.close === "function";
        };
        LZUTF8.runningInNodeChildProcess = function () {
            return LZUTF8.runningInNodeJS() && typeof process.send === "function";
        };
        LZUTF8.runningInNullOrigin = function () {
            if (typeof window !== "object" || typeof window.location !== "object")
                return false;
            return document.location.protocol !== 'http:' && document.location.protocol !== 'https:';
        };
        LZUTF8.webWorkersAvailable = function () {
            if (typeof Worker !== "function" || LZUTF8.runningInNullOrigin())
                return false;
            if (LZUTF8.runningInNodeJS())
                return false;
            if (navigator && navigator.userAgent && navigator.userAgent.indexOf("Android 4.3") >= 0)
                return false;
            return true;
        };
        LZUTF8.log = function (message, appendToDocument) {
            if (appendToDocument === void 0) { appendToDocument = false; }
            if (typeof console !== "object")
                return;
            console.log(message);
            if (appendToDocument && typeof document == "object")
                document.body.innerHTML += message + "<br/>";
        };
        LZUTF8.createErrorMessage = function (exception, title) {
            if (title === void 0) { title = "Unhandled exception"; }
            if (exception == null)
                return title;
            title += ": ";
            if (typeof exception.content === "object") {
                if (LZUTF8.runningInNodeJS()) {
                    return title + exception.content.stack;
                }
                else {
                    var exceptionJSON = JSON.stringify(exception.content);
                    if (exceptionJSON !== "{}")
                        return title + exceptionJSON;
                    else
                        return title + exception.content;
                }
            }
            else if (typeof exception.content === "string") {
                return title + exception.content;
            }
            else {
                return title + exception;
            }
        };
        LZUTF8.printExceptionAndStackTraceToConsole = function (exception, title) {
            if (title === void 0) { title = "Unhandled exception"; }
            LZUTF8.log(LZUTF8.createErrorMessage(exception, title));
        };
        LZUTF8.getGlobalObject = function () {
            if (typeof commonjsGlobal === "object")
                return commonjsGlobal;
            else if (typeof window === "object")
                return window;
            else if (typeof self === "object")
                return self;
            else
                return {};
        };
        LZUTF8.toString = Object.prototype.toString;
        if (LZUTF8.commonJSAvailable())
            module.exports = LZUTF8;
    })(LZUTF8 || (LZUTF8 = {}));
    if (typeof Uint8Array === "function" && new Uint8Array(1).subarray(1).byteLength !== 0) {
        var subarray = function (start, end) {
            var clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };
            start = start | 0;
            end = end | 0;
            if (arguments.length < 1)
                start = 0;
            if (arguments.length < 2)
                end = this.length;
            if (start < 0)
                start = this.length + start;
            if (end < 0)
                end = this.length + end;
            start = clamp(start, 0, this.length);
            end = clamp(end, 0, this.length);
            var len = end - start;
            if (len < 0)
                len = 0;
            return new this.constructor(this.buffer, this.byteOffset + start * this.BYTES_PER_ELEMENT, len);
        };
        var types = ['Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array', 'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array'];
        var globalObject = void 0;
        if (typeof window === "object")
            globalObject = window;
        else if (typeof self === "object")
            globalObject = self;
        if (globalObject !== undefined) {
            for (var i = 0; i < types.length; i++) {
                if (globalObject[types[i]])
                    globalObject[types[i]].prototype.subarray = subarray;
            }
        }
    }
    var LZUTF8;
    (function (LZUTF8) {
        var AsyncCompressor = (function () {
            function AsyncCompressor() {
            }
            AsyncCompressor.compressAsync = function (input, options, callback) {
                var timer = new LZUTF8.Timer();
                var compressor = new LZUTF8.Compressor();
                if (!callback)
                    throw new TypeError("compressAsync: No callback argument given");
                if (typeof input === "string") {
                    input = LZUTF8.encodeUTF8(input);
                }
                else if (input == null || !(input instanceof Uint8Array)) {
                    callback(undefined, new TypeError("compressAsync: Invalid input argument, only 'string' and 'Uint8Array' are supported"));
                    return;
                }
                var sourceBlocks = LZUTF8.ArrayTools.splitByteArray(input, options.blockSize);
                var compressedBlocks = [];
                var compressBlocksStartingAt = function (index) {
                    if (index < sourceBlocks.length) {
                        var compressedBlock = void 0;
                        try {
                            compressedBlock = compressor.compressBlock(sourceBlocks[index]);
                        }
                        catch (e) {
                            callback(undefined, e);
                            return;
                        }
                        compressedBlocks.push(compressedBlock);
                        if (timer.getElapsedTime() <= 20) {
                            compressBlocksStartingAt(index + 1);
                        }
                        else {
                            LZUTF8.enqueueImmediate(function () { return compressBlocksStartingAt(index + 1); });
                            timer.restart();
                        }
                    }
                    else {
                        var joinedCompressedBlocks_1 = LZUTF8.ArrayTools.concatUint8Arrays(compressedBlocks);
                        LZUTF8.enqueueImmediate(function () {
                            var result;
                            try {
                                result = LZUTF8.CompressionCommon.encodeCompressedBytes(joinedCompressedBlocks_1, options.outputEncoding);
                            }
                            catch (e) {
                                callback(undefined, e);
                                return;
                            }
                            LZUTF8.enqueueImmediate(function () { return callback(result); });
                        });
                    }
                };
                LZUTF8.enqueueImmediate(function () { return compressBlocksStartingAt(0); });
            };
            AsyncCompressor.createCompressionStream = function () {
                var compressor = new LZUTF8.Compressor();
                var NodeStream = Stream;
                var compressionStream = new NodeStream.Transform({ decodeStrings: true, highWaterMark: 65536 });
                compressionStream._transform = function (data, encoding, done) {
                    var buffer;
                    try {
                        buffer = LZUTF8.BufferTools.uint8ArrayToBuffer(compressor.compressBlock(LZUTF8.BufferTools.bufferToUint8Array(data)));
                    }
                    catch (e) {
                        compressionStream.emit("error", e);
                        return;
                    }
                    compressionStream.push(buffer);
                    done();
                };
                return compressionStream;
            };
            return AsyncCompressor;
        }());
        LZUTF8.AsyncCompressor = AsyncCompressor;
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var AsyncDecompressor = (function () {
            function AsyncDecompressor() {
            }
            AsyncDecompressor.decompressAsync = function (input, options, callback) {
                if (!callback)
                    throw new TypeError("decompressAsync: No callback argument given");
                var timer = new LZUTF8.Timer();
                try {
                    input = LZUTF8.CompressionCommon.decodeCompressedBytes(input, options.inputEncoding);
                }
                catch (e) {
                    callback(undefined, e);
                    return;
                }
                var decompressor = new LZUTF8.Decompressor();
                var sourceBlocks = LZUTF8.ArrayTools.splitByteArray(input, options.blockSize);
                var decompressedBlocks = [];
                var decompressBlocksStartingAt = function (index) {
                    if (index < sourceBlocks.length) {
                        var decompressedBlock = void 0;
                        try {
                            decompressedBlock = decompressor.decompressBlock(sourceBlocks[index]);
                        }
                        catch (e) {
                            callback(undefined, e);
                            return;
                        }
                        decompressedBlocks.push(decompressedBlock);
                        if (timer.getElapsedTime() <= 20) {
                            decompressBlocksStartingAt(index + 1);
                        }
                        else {
                            LZUTF8.enqueueImmediate(function () { return decompressBlocksStartingAt(index + 1); });
                            timer.restart();
                        }
                    }
                    else {
                        var joinedDecompressedBlocks_1 = LZUTF8.ArrayTools.concatUint8Arrays(decompressedBlocks);
                        LZUTF8.enqueueImmediate(function () {
                            var result;
                            try {
                                result = LZUTF8.CompressionCommon.encodeDecompressedBytes(joinedDecompressedBlocks_1, options.outputEncoding);
                            }
                            catch (e) {
                                callback(undefined, e);
                                return;
                            }
                            LZUTF8.enqueueImmediate(function () { return callback(result); });
                        });
                    }
                };
                LZUTF8.enqueueImmediate(function () { return decompressBlocksStartingAt(0); });
            };
            AsyncDecompressor.createDecompressionStream = function () {
                var decompressor = new LZUTF8.Decompressor();
                var NodeStream = Stream;
                var decompressionStream = new NodeStream.Transform({ decodeStrings: true, highWaterMark: 65536 });
                decompressionStream._transform = function (data, encoding, done) {
                    var buffer;
                    try {
                        buffer = LZUTF8.BufferTools.uint8ArrayToBuffer(decompressor.decompressBlock(LZUTF8.BufferTools.bufferToUint8Array(data)));
                    }
                    catch (e) {
                        decompressionStream.emit("error", e);
                        return;
                    }
                    decompressionStream.push(buffer);
                    done();
                };
                return decompressionStream;
            };
            return AsyncDecompressor;
        }());
        LZUTF8.AsyncDecompressor = AsyncDecompressor;
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var WebWorker;
        (function (WebWorker) {
            WebWorker.compressAsync = function (input, options, callback) {
                if (options.inputEncoding == "ByteArray") {
                    if (!(input instanceof Uint8Array)) {
                        callback(undefined, new TypeError("compressAsync: input is not a Uint8Array"));
                        return;
                    }
                }
                var request = {
                    token: Math.random().toString(),
                    type: "compress",
                    data: input,
                    inputEncoding: options.inputEncoding,
                    outputEncoding: options.outputEncoding
                };
                var responseListener = function (e) {
                    var response = e.data;
                    if (!response || response.token != request.token)
                        return;
                    WebWorker.globalWorker.removeEventListener("message", responseListener);
                    if (response.type == "error")
                        callback(undefined, new Error(response.error));
                    else
                        callback(response.data);
                };
                WebWorker.globalWorker.addEventListener("message", responseListener);
                WebWorker.globalWorker.postMessage(request, []);
            };
            WebWorker.decompressAsync = function (input, options, callback) {
                var request = {
                    token: Math.random().toString(),
                    type: "decompress",
                    data: input,
                    inputEncoding: options.inputEncoding,
                    outputEncoding: options.outputEncoding
                };
                var responseListener = function (e) {
                    var response = e.data;
                    if (!response || response.token != request.token)
                        return;
                    WebWorker.globalWorker.removeEventListener("message", responseListener);
                    if (response.type == "error")
                        callback(undefined, new Error(response.error));
                    else
                        callback(response.data);
                };
                WebWorker.globalWorker.addEventListener("message", responseListener);
                WebWorker.globalWorker.postMessage(request, []);
            };
            WebWorker.installWebWorkerIfNeeded = function () {
                if (typeof self == "object" && self.document === undefined && self.addEventListener != undefined) {
                    self.addEventListener("message", function (e) {
                        var request = e.data;
                        if (request.type == "compress") {
                            var compressedData = void 0;
                            try {
                                compressedData = LZUTF8.compress(request.data, { outputEncoding: request.outputEncoding });
                            }
                            catch (e) {
                                self.postMessage({ token: request.token, type: "error", error: LZUTF8.createErrorMessage(e) }, []);
                                return;
                            }
                            var response = {
                                token: request.token,
                                type: "compressionResult",
                                data: compressedData,
                                encoding: request.outputEncoding,
                            };
                            if (response.data instanceof Uint8Array && navigator.appVersion.indexOf("MSIE 10") === -1)
                                self.postMessage(response, [response.data.buffer]);
                            else
                                self.postMessage(response, []);
                        }
                        else if (request.type == "decompress") {
                            var decompressedData = void 0;
                            try {
                                decompressedData = LZUTF8.decompress(request.data, { inputEncoding: request.inputEncoding, outputEncoding: request.outputEncoding });
                            }
                            catch (e) {
                                self.postMessage({ token: request.token, type: "error", error: LZUTF8.createErrorMessage(e) }, []);
                                return;
                            }
                            var response = {
                                token: request.token,
                                type: "decompressionResult",
                                data: decompressedData,
                                encoding: request.outputEncoding,
                            };
                            if (response.data instanceof Uint8Array && navigator.appVersion.indexOf("MSIE 10") === -1)
                                self.postMessage(response, [response.data.buffer]);
                            else
                                self.postMessage(response, []);
                        }
                    });
                    self.addEventListener("error", function (e) {
                        LZUTF8.log(LZUTF8.createErrorMessage(e.error, "Unexpected LZUTF8 WebWorker exception"));
                    });
                }
            };
            WebWorker.createGlobalWorkerIfNeeded = function () {
                if (WebWorker.globalWorker)
                    return true;
                if (!LZUTF8.webWorkersAvailable())
                    return false;
                if (!WebWorker.scriptURI && typeof document === "object") {
                    var scriptElement = document.getElementById("lzutf8");
                    if (scriptElement != null)
                        WebWorker.scriptURI = scriptElement.getAttribute("src") || undefined;
                }
                if (WebWorker.scriptURI) {
                    WebWorker.globalWorker = new Worker(WebWorker.scriptURI);
                    return true;
                }
                else {
                    return false;
                }
            };
            WebWorker.terminate = function () {
                if (WebWorker.globalWorker) {
                    WebWorker.globalWorker.terminate();
                    WebWorker.globalWorker = undefined;
                }
            };
        })(WebWorker = LZUTF8.WebWorker || (LZUTF8.WebWorker = {}));
        WebWorker.installWebWorkerIfNeeded();
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var ArraySegment = (function () {
            function ArraySegment(container, startPosition, length) {
                this.container = container;
                this.startPosition = startPosition;
                this.length = length;
            }
            ArraySegment.prototype.get = function (index) {
                return this.container[this.startPosition + index];
            };
            ArraySegment.prototype.getInReversedOrder = function (reverseIndex) {
                return this.container[this.startPosition + this.length - 1 - reverseIndex];
            };
            ArraySegment.prototype.set = function (index, value) {
                this.container[this.startPosition + index] = value;
            };
            return ArraySegment;
        }());
        LZUTF8.ArraySegment = ArraySegment;
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var ArrayTools;
        (function (ArrayTools) {
            ArrayTools.copyElements = function (source, sourceIndex, destination, destinationIndex, count) {
                while (count--)
                    destination[destinationIndex++] = source[sourceIndex++];
            };
            ArrayTools.zeroElements = function (collection, index, count) {
                while (count--)
                    collection[index++] = 0;
            };
            ArrayTools.countNonzeroValuesInArray = function (array) {
                var result = 0;
                for (var i = 0; i < array.length; i++)
                    if (array[i])
                        result++;
                return result;
            };
            ArrayTools.truncateStartingElements = function (array, truncatedLength) {
                if (array.length <= truncatedLength)
                    throw new RangeError("truncateStartingElements: Requested length should be smaller than array length");
                var sourcePosition = array.length - truncatedLength;
                for (var i = 0; i < truncatedLength; i++)
                    array[i] = array[sourcePosition + i];
                array.length = truncatedLength;
            };
            ArrayTools.doubleByteArrayCapacity = function (array) {
                var newArray = new Uint8Array(array.length * 2);
                newArray.set(array);
                return newArray;
            };
            ArrayTools.concatUint8Arrays = function (arrays) {
                var totalLength = 0;
                for (var _i = 0, arrays_1 = arrays; _i < arrays_1.length; _i++) {
                    var array = arrays_1[_i];
                    totalLength += array.length;
                }
                var result = new Uint8Array(totalLength);
                var offset = 0;
                for (var _a = 0, arrays_2 = arrays; _a < arrays_2.length; _a++) {
                    var array = arrays_2[_a];
                    result.set(array, offset);
                    offset += array.length;
                }
                return result;
            };
            ArrayTools.splitByteArray = function (byteArray, maxPartLength) {
                var result = [];
                for (var offset = 0; offset < byteArray.length;) {
                    var blockLength = Math.min(maxPartLength, byteArray.length - offset);
                    result.push(byteArray.subarray(offset, offset + blockLength));
                    offset += blockLength;
                }
                return result;
            };
        })(ArrayTools = LZUTF8.ArrayTools || (LZUTF8.ArrayTools = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var BufferTools;
        (function (BufferTools) {
            BufferTools.convertToUint8ArrayIfNeeded = function (input) {
                if (typeof Buffer === "function" && isBuffer(input))
                    return BufferTools.bufferToUint8Array(input);
                else
                    return input;
            };
            BufferTools.uint8ArrayToBuffer = function (arr) {
                if (Buffer.prototype instanceof Uint8Array) {
                    var arrClone = new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength);
                    Object["setPrototypeOf"](arrClone, Buffer.prototype);
                    return arrClone;
                }
                else {
                    var len = arr.length;
                    var buf = new Buffer(len);
                    for (var i = 0; i < len; i++)
                        buf[i] = arr[i];
                    return buf;
                }
            };
            BufferTools.bufferToUint8Array = function (buf) {
                if (Buffer.prototype instanceof Uint8Array) {
                    return new Uint8Array(buf["buffer"], buf["byteOffset"], buf["byteLength"]);
                }
                else {
                    var len = buf.length;
                    var arr = new Uint8Array(len);
                    for (var i = 0; i < len; i++)
                        arr[i] = buf[i];
                    return arr;
                }
            };
        })(BufferTools = LZUTF8.BufferTools || (LZUTF8.BufferTools = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var CompressionCommon;
        (function (CompressionCommon) {
            CompressionCommon.getCroppedBuffer = function (buffer, cropStartOffset, cropLength, additionalCapacity) {
                if (additionalCapacity === void 0) { additionalCapacity = 0; }
                var croppedBuffer = new Uint8Array(cropLength + additionalCapacity);
                croppedBuffer.set(buffer.subarray(cropStartOffset, cropStartOffset + cropLength));
                return croppedBuffer;
            };
            CompressionCommon.getCroppedAndAppendedByteArray = function (bytes, cropStartOffset, cropLength, byteArrayToAppend) {
                return LZUTF8.ArrayTools.concatUint8Arrays([bytes.subarray(cropStartOffset, cropStartOffset + cropLength), byteArrayToAppend]);
            };
            CompressionCommon.detectCompressionSourceEncoding = function (input) {
                if (input == null)
                    throw new TypeError("detectCompressionSourceEncoding: input is null or undefined");
                if (typeof input === "string")
                    return "String";
                else if (input instanceof Uint8Array || (typeof Buffer === "function" && isBuffer(input)))
                    return "ByteArray";
                else
                    throw new TypeError("detectCompressionSourceEncoding: input must be of type 'string', 'Uint8Array' or 'Buffer'");
            };
            CompressionCommon.encodeCompressedBytes = function (compressedBytes, outputEncoding) {
                switch (outputEncoding) {
                    case "ByteArray":
                        return compressedBytes;
                    case "Buffer":
                        return LZUTF8.BufferTools.uint8ArrayToBuffer(compressedBytes);
                    case "Base64":
                        return LZUTF8.encodeBase64(compressedBytes);
                    case "BinaryString":
                        return LZUTF8.encodeBinaryString(compressedBytes);
                    case "StorageBinaryString":
                        return LZUTF8.encodeStorageBinaryString(compressedBytes);
                    default:
                        throw new TypeError("encodeCompressedBytes: invalid output encoding requested");
                }
            };
            CompressionCommon.decodeCompressedBytes = function (compressedData, inputEncoding) {
                if (inputEncoding == null)
                    throw new TypeError("decodeCompressedData: Input is null or undefined");
                switch (inputEncoding) {
                    case "ByteArray":
                    case "Buffer":
                        var normalizedBytes = LZUTF8.BufferTools.convertToUint8ArrayIfNeeded(compressedData);
                        if (!(normalizedBytes instanceof Uint8Array))
                            throw new TypeError("decodeCompressedData: 'ByteArray' or 'Buffer' input type was specified but input is not a Uint8Array or Buffer");
                        return normalizedBytes;
                    case "Base64":
                        if (typeof compressedData !== "string")
                            throw new TypeError("decodeCompressedData: 'Base64' input type was specified but input is not a string");
                        return LZUTF8.decodeBase64(compressedData);
                    case "BinaryString":
                        if (typeof compressedData !== "string")
                            throw new TypeError("decodeCompressedData: 'BinaryString' input type was specified but input is not a string");
                        return LZUTF8.decodeBinaryString(compressedData);
                    case "StorageBinaryString":
                        if (typeof compressedData !== "string")
                            throw new TypeError("decodeCompressedData: 'StorageBinaryString' input type was specified but input is not a string");
                        return LZUTF8.decodeStorageBinaryString(compressedData);
                    default:
                        throw new TypeError("decodeCompressedData: invalid input encoding requested: '" + inputEncoding + "'");
                }
            };
            CompressionCommon.encodeDecompressedBytes = function (decompressedBytes, outputEncoding) {
                switch (outputEncoding) {
                    case "String":
                        return LZUTF8.decodeUTF8(decompressedBytes);
                    case "ByteArray":
                        return decompressedBytes;
                    case "Buffer":
                        if (typeof Buffer !== "function")
                            throw new TypeError("encodeDecompressedBytes: a 'Buffer' type was specified but is not supported at the current envirnment");
                        return LZUTF8.BufferTools.uint8ArrayToBuffer(decompressedBytes);
                    default:
                        throw new TypeError("encodeDecompressedBytes: invalid output encoding requested");
                }
            };
        })(CompressionCommon = LZUTF8.CompressionCommon || (LZUTF8.CompressionCommon = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var EventLoop;
        (function (EventLoop) {
            var queuedFunctions = [];
            var asyncFlushFunc;
            EventLoop.enqueueImmediate = function (func) {
                queuedFunctions.push(func);
                if (queuedFunctions.length === 1)
                    asyncFlushFunc();
            };
            EventLoop.initializeScheduler = function () {
                var flush = function () {
                    for (var _i = 0, queuedFunctions_1 = queuedFunctions; _i < queuedFunctions_1.length; _i++) {
                        var func = queuedFunctions_1[_i];
                        try {
                            func.call(undefined);
                        }
                        catch (exception) {
                            LZUTF8.printExceptionAndStackTraceToConsole(exception, "enqueueImmediate exception");
                        }
                    }
                    queuedFunctions.length = 0;
                };
                if (LZUTF8.runningInNodeJS()) {
                    asyncFlushFunc = function () { return setImmediate(function () { return flush(); }); };
                }
                if (typeof window === "object" && typeof window.addEventListener === "function" && typeof window.postMessage === "function") {
                    var token_1 = "enqueueImmediate-" + Math.random().toString();
                    window.addEventListener("message", function (event) {
                        if (event.data === token_1)
                            flush();
                    });
                    var targetOrigin_1;
                    if (LZUTF8.runningInNullOrigin())
                        targetOrigin_1 = '*';
                    else
                        targetOrigin_1 = window.location.href;
                    asyncFlushFunc = function () { return window.postMessage(token_1, targetOrigin_1); };
                }
                else if (typeof MessageChannel === "function" && typeof MessagePort === "function") {
                    var channel_1 = new MessageChannel();
                    channel_1.port1.onmessage = function () { return flush(); };
                    asyncFlushFunc = function () { return channel_1.port2.postMessage(0); };
                }
                else {
                    asyncFlushFunc = function () { return setTimeout(function () { return flush(); }, 0); };
                }
            };
            EventLoop.initializeScheduler();
        })(EventLoop = LZUTF8.EventLoop || (LZUTF8.EventLoop = {}));
        LZUTF8.enqueueImmediate = function (func) { return EventLoop.enqueueImmediate(func); };
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var ObjectTools;
        (function (ObjectTools) {
            ObjectTools.override = function (obj, newPropertyValues) {
                return ObjectTools.extend(obj, newPropertyValues);
            };
            ObjectTools.extend = function (obj, newProperties) {
                if (obj == null)
                    throw new TypeError("obj is null or undefined");
                if (typeof obj !== "object")
                    throw new TypeError("obj is not an object");
                if (newProperties == null)
                    newProperties = {};
                if (typeof newProperties !== "object")
                    throw new TypeError("newProperties is not an object");
                if (newProperties != null) {
                    for (var property in newProperties)
                        obj[property] = newProperties[property];
                }
                return obj;
            };
        })(ObjectTools = LZUTF8.ObjectTools || (LZUTF8.ObjectTools = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        LZUTF8.getRandomIntegerInRange = function (low, high) {
            return low + Math.floor(Math.random() * (high - low));
        };
        LZUTF8.getRandomUTF16StringOfLength = function (length) {
            var randomString = "";
            for (var i = 0; i < length; i++) {
                var randomCodePoint = void 0;
                do {
                    randomCodePoint = LZUTF8.getRandomIntegerInRange(0, 0x10FFFF + 1);
                } while (randomCodePoint >= 0xD800 && randomCodePoint <= 0xDFFF);
                randomString += LZUTF8.Encoding.CodePoint.decodeToString(randomCodePoint);
            }
            return randomString;
        };
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var StringBuilder = (function () {
            function StringBuilder(outputBufferCapacity) {
                if (outputBufferCapacity === void 0) { outputBufferCapacity = 1024; }
                this.outputBufferCapacity = outputBufferCapacity;
                this.outputPosition = 0;
                this.outputString = "";
                this.outputBuffer = new Uint16Array(this.outputBufferCapacity);
            }
            StringBuilder.prototype.appendCharCode = function (charCode) {
                this.outputBuffer[this.outputPosition++] = charCode;
                if (this.outputPosition === this.outputBufferCapacity)
                    this.flushBufferToOutputString();
            };
            StringBuilder.prototype.appendCharCodes = function (charCodes) {
                for (var i = 0, length_1 = charCodes.length; i < length_1; i++)
                    this.appendCharCode(charCodes[i]);
            };
            StringBuilder.prototype.appendString = function (str) {
                for (var i = 0, length_2 = str.length; i < length_2; i++)
                    this.appendCharCode(str.charCodeAt(i));
            };
            StringBuilder.prototype.appendCodePoint = function (codePoint) {
                if (codePoint <= 0xFFFF) {
                    this.appendCharCode(codePoint);
                }
                else if (codePoint <= 0x10FFFF) {
                    this.appendCharCode(0xD800 + ((codePoint - 0x10000) >>> 10));
                    this.appendCharCode(0xDC00 + ((codePoint - 0x10000) & 1023));
                }
                else
                    throw new Error("appendCodePoint: A code point of " + codePoint + " cannot be encoded in UTF-16");
            };
            StringBuilder.prototype.getOutputString = function () {
                this.flushBufferToOutputString();
                return this.outputString;
            };
            StringBuilder.prototype.flushBufferToOutputString = function () {
                if (this.outputPosition === this.outputBufferCapacity)
                    this.outputString += String.fromCharCode.apply(null, this.outputBuffer);
                else
                    this.outputString += String.fromCharCode.apply(null, this.outputBuffer.subarray(0, this.outputPosition));
                this.outputPosition = 0;
            };
            return StringBuilder;
        }());
        LZUTF8.StringBuilder = StringBuilder;
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var Timer = (function () {
            function Timer() {
                this.restart();
            }
            Timer.prototype.restart = function () {
                this.startTime = Timer.getTimestamp();
            };
            Timer.prototype.getElapsedTime = function () {
                return Timer.getTimestamp() - this.startTime;
            };
            Timer.prototype.getElapsedTimeAndRestart = function () {
                var elapsedTime = this.getElapsedTime();
                this.restart();
                return elapsedTime;
            };
            Timer.prototype.logAndRestart = function (title, logToDocument) {
                if (logToDocument === void 0) { logToDocument = true; }
                var elapsedTime = this.getElapsedTime();
                var message = title + ": " + elapsedTime.toFixed(3) + "ms";
                LZUTF8.log(message, logToDocument);
                this.restart();
                return elapsedTime;
            };
            Timer.getTimestamp = function () {
                if (!this.timestampFunc)
                    this.createGlobalTimestampFunction();
                return this.timestampFunc();
            };
            Timer.getMicrosecondTimestamp = function () {
                return Math.floor(Timer.getTimestamp() * 1000);
            };
            Timer.createGlobalTimestampFunction = function () {
                if (typeof process === "object" && typeof process.hrtime === "function") {
                    var baseTimestamp_1 = 0;
                    this.timestampFunc = function () {
                        var nodeTimeStamp = process.hrtime();
                        var millisecondTime = (nodeTimeStamp[0] * 1000) + (nodeTimeStamp[1] / 1000000);
                        return baseTimestamp_1 + millisecondTime;
                    };
                    baseTimestamp_1 = Date.now() - this.timestampFunc();
                }
                else if (typeof chrome === "object" && chrome.Interval) {
                    var baseTimestamp_2 = Date.now();
                    var chromeIntervalObject_1 = new chrome.Interval();
                    chromeIntervalObject_1.start();
                    this.timestampFunc = function () { return baseTimestamp_2 + chromeIntervalObject_1.microseconds() / 1000; };
                }
                else if (typeof performance === "object" && performance.now) {
                    var baseTimestamp_3 = Date.now() - performance.now();
                    this.timestampFunc = function () { return baseTimestamp_3 + performance.now(); };
                }
                else if (Date.now) {
                    this.timestampFunc = function () { return Date.now(); };
                }
                else {
                    this.timestampFunc = function () { return (new Date()).getTime(); };
                }
            };
            return Timer;
        }());
        LZUTF8.Timer = Timer;
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var Compressor = (function () {
            function Compressor(useCustomHashTable) {
                if (useCustomHashTable === void 0) { useCustomHashTable = true; }
                this.MinimumSequenceLength = 4;
                this.MaximumSequenceLength = 31;
                this.MaximumMatchDistance = 32767;
                this.PrefixHashTableSize = 65537;
                this.inputBufferStreamOffset = 1;
                if (useCustomHashTable && typeof Uint32Array == "function")
                    this.prefixHashTable = new LZUTF8.CompressorCustomHashTable(this.PrefixHashTableSize);
                else
                    this.prefixHashTable = new LZUTF8.CompressorSimpleHashTable(this.PrefixHashTableSize);
            }
            Compressor.prototype.compressBlock = function (input) {
                if (input === undefined || input === null)
                    throw new TypeError("compressBlock: undefined or null input received");
                if (typeof input == "string")
                    input = LZUTF8.encodeUTF8(input);
                input = LZUTF8.BufferTools.convertToUint8ArrayIfNeeded(input);
                return this.compressUtf8Block(input);
            };
            Compressor.prototype.compressUtf8Block = function (utf8Bytes) {
                if (!utf8Bytes || utf8Bytes.length == 0)
                    return new Uint8Array(0);
                var bufferStartingReadOffset = this.cropAndAddNewBytesToInputBuffer(utf8Bytes);
                var inputBuffer = this.inputBuffer;
                var inputBufferLength = this.inputBuffer.length;
                this.outputBuffer = new Uint8Array(utf8Bytes.length);
                this.outputBufferPosition = 0;
                var latestMatchEndPosition = 0;
                for (var readPosition = bufferStartingReadOffset; readPosition < inputBufferLength; readPosition++) {
                    var inputValue = inputBuffer[readPosition];
                    var withinAMatchedRange = readPosition < latestMatchEndPosition;
                    if (readPosition > inputBufferLength - this.MinimumSequenceLength) {
                        if (!withinAMatchedRange)
                            this.outputRawByte(inputValue);
                        continue;
                    }
                    var targetBucketIndex = this.getBucketIndexForPrefix(readPosition);
                    if (!withinAMatchedRange) {
                        var matchLocator = this.findLongestMatch(readPosition, targetBucketIndex);
                        if (matchLocator != null) {
                            this.outputPointerBytes(matchLocator.length, matchLocator.distance);
                            latestMatchEndPosition = readPosition + matchLocator.length;
                            withinAMatchedRange = true;
                        }
                    }
                    if (!withinAMatchedRange)
                        this.outputRawByte(inputValue);
                    var inputStreamPosition = this.inputBufferStreamOffset + readPosition;
                    this.prefixHashTable.addValueToBucket(targetBucketIndex, inputStreamPosition);
                }
                return this.outputBuffer.subarray(0, this.outputBufferPosition);
            };
            Compressor.prototype.findLongestMatch = function (matchedSequencePosition, bucketIndex) {
                var bucket = this.prefixHashTable.getArraySegmentForBucketIndex(bucketIndex, this.reusableArraySegmentObject);
                if (bucket == null)
                    return null;
                var input = this.inputBuffer;
                var longestMatchDistance;
                var longestMatchLength = 0;
                for (var i = 0; i < bucket.length; i++) {
                    var testedSequencePosition = bucket.getInReversedOrder(i) - this.inputBufferStreamOffset;
                    var testedSequenceDistance = matchedSequencePosition - testedSequencePosition;
                    var lengthToSurpass = void 0;
                    if (longestMatchDistance === undefined)
                        lengthToSurpass = this.MinimumSequenceLength - 1;
                    else if (longestMatchDistance < 128 && testedSequenceDistance >= 128)
                        lengthToSurpass = longestMatchLength + (longestMatchLength >>> 1);
                    else
                        lengthToSurpass = longestMatchLength;
                    if (testedSequenceDistance > this.MaximumMatchDistance ||
                        lengthToSurpass >= this.MaximumSequenceLength ||
                        matchedSequencePosition + lengthToSurpass >= input.length)
                        break;
                    if (input[testedSequencePosition + lengthToSurpass] !== input[matchedSequencePosition + lengthToSurpass])
                        continue;
                    for (var offset = 0;; offset++) {
                        if (matchedSequencePosition + offset === input.length ||
                            input[testedSequencePosition + offset] !== input[matchedSequencePosition + offset]) {
                            if (offset > lengthToSurpass) {
                                longestMatchDistance = testedSequenceDistance;
                                longestMatchLength = offset;
                            }
                            break;
                        }
                        else if (offset === this.MaximumSequenceLength)
                            return { distance: testedSequenceDistance, length: this.MaximumSequenceLength };
                    }
                }
                if (longestMatchDistance !== undefined)
                    return { distance: longestMatchDistance, length: longestMatchLength };
                else
                    return null;
            };
            Compressor.prototype.getBucketIndexForPrefix = function (startPosition) {
                return (this.inputBuffer[startPosition] * 7880599 +
                    this.inputBuffer[startPosition + 1] * 39601 +
                    this.inputBuffer[startPosition + 2] * 199 +
                    this.inputBuffer[startPosition + 3]) % this.PrefixHashTableSize;
            };
            Compressor.prototype.outputPointerBytes = function (length, distance) {
                if (distance < 128) {
                    this.outputRawByte(192 | length);
                    this.outputRawByte(distance);
                }
                else {
                    this.outputRawByte(224 | length);
                    this.outputRawByte(distance >>> 8);
                    this.outputRawByte(distance & 255);
                }
            };
            Compressor.prototype.outputRawByte = function (value) {
                this.outputBuffer[this.outputBufferPosition++] = value;
            };
            Compressor.prototype.cropAndAddNewBytesToInputBuffer = function (newInput) {
                if (this.inputBuffer === undefined) {
                    this.inputBuffer = newInput;
                    return 0;
                }
                else {
                    var cropLength = Math.min(this.inputBuffer.length, this.MaximumMatchDistance);
                    var cropStartOffset = this.inputBuffer.length - cropLength;
                    this.inputBuffer = LZUTF8.CompressionCommon.getCroppedAndAppendedByteArray(this.inputBuffer, cropStartOffset, cropLength, newInput);
                    this.inputBufferStreamOffset += cropStartOffset;
                    return cropLength;
                }
            };
            return Compressor;
        }());
        LZUTF8.Compressor = Compressor;
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var CompressorCustomHashTable = (function () {
            function CompressorCustomHashTable(bucketCount) {
                this.minimumBucketCapacity = 4;
                this.maximumBucketCapacity = 64;
                this.bucketLocators = new Uint32Array(bucketCount * 2);
                this.storage = new Uint32Array(bucketCount * 2);
                this.storageIndex = 1;
            }
            CompressorCustomHashTable.prototype.addValueToBucket = function (bucketIndex, valueToAdd) {
                bucketIndex <<= 1;
                if (this.storageIndex >= (this.storage.length >>> 1))
                    this.compact();
                var startPosition = this.bucketLocators[bucketIndex];
                var length;
                if (startPosition === 0) {
                    startPosition = this.storageIndex;
                    length = 1;
                    this.storage[this.storageIndex] = valueToAdd;
                    this.storageIndex += this.minimumBucketCapacity;
                }
                else {
                    length = this.bucketLocators[bucketIndex + 1];
                    if (length === this.maximumBucketCapacity - 1)
                        length = this.truncateBucketToNewerElements(startPosition, length, this.maximumBucketCapacity / 2);
                    var endPosition = startPosition + length;
                    if (this.storage[endPosition] === 0) {
                        this.storage[endPosition] = valueToAdd;
                        if (endPosition === this.storageIndex)
                            this.storageIndex += length;
                    }
                    else {
                        LZUTF8.ArrayTools.copyElements(this.storage, startPosition, this.storage, this.storageIndex, length);
                        startPosition = this.storageIndex;
                        this.storageIndex += length;
                        this.storage[this.storageIndex++] = valueToAdd;
                        this.storageIndex += length;
                    }
                    length++;
                }
                this.bucketLocators[bucketIndex] = startPosition;
                this.bucketLocators[bucketIndex + 1] = length;
            };
            CompressorCustomHashTable.prototype.truncateBucketToNewerElements = function (startPosition, bucketLength, truncatedBucketLength) {
                var sourcePosition = startPosition + bucketLength - truncatedBucketLength;
                LZUTF8.ArrayTools.copyElements(this.storage, sourcePosition, this.storage, startPosition, truncatedBucketLength);
                LZUTF8.ArrayTools.zeroElements(this.storage, startPosition + truncatedBucketLength, bucketLength - truncatedBucketLength);
                return truncatedBucketLength;
            };
            CompressorCustomHashTable.prototype.compact = function () {
                var oldBucketLocators = this.bucketLocators;
                var oldStorage = this.storage;
                this.bucketLocators = new Uint32Array(this.bucketLocators.length);
                this.storageIndex = 1;
                for (var bucketIndex = 0; bucketIndex < oldBucketLocators.length; bucketIndex += 2) {
                    var length_3 = oldBucketLocators[bucketIndex + 1];
                    if (length_3 === 0)
                        continue;
                    this.bucketLocators[bucketIndex] = this.storageIndex;
                    this.bucketLocators[bucketIndex + 1] = length_3;
                    this.storageIndex += Math.max(Math.min(length_3 * 2, this.maximumBucketCapacity), this.minimumBucketCapacity);
                }
                this.storage = new Uint32Array(this.storageIndex * 8);
                for (var bucketIndex = 0; bucketIndex < oldBucketLocators.length; bucketIndex += 2) {
                    var sourcePosition = oldBucketLocators[bucketIndex];
                    if (sourcePosition === 0)
                        continue;
                    var destPosition = this.bucketLocators[bucketIndex];
                    var length_4 = this.bucketLocators[bucketIndex + 1];
                    LZUTF8.ArrayTools.copyElements(oldStorage, sourcePosition, this.storage, destPosition, length_4);
                }
            };
            CompressorCustomHashTable.prototype.getArraySegmentForBucketIndex = function (bucketIndex, outputObject) {
                bucketIndex <<= 1;
                var startPosition = this.bucketLocators[bucketIndex];
                if (startPosition === 0)
                    return null;
                if (outputObject === undefined)
                    outputObject = new LZUTF8.ArraySegment(this.storage, startPosition, this.bucketLocators[bucketIndex + 1]);
                return outputObject;
            };
            CompressorCustomHashTable.prototype.getUsedBucketCount = function () {
                return Math.floor(LZUTF8.ArrayTools.countNonzeroValuesInArray(this.bucketLocators) / 2);
            };
            CompressorCustomHashTable.prototype.getTotalElementCount = function () {
                var result = 0;
                for (var i = 0; i < this.bucketLocators.length; i += 2)
                    result += this.bucketLocators[i + 1];
                return result;
            };
            return CompressorCustomHashTable;
        }());
        LZUTF8.CompressorCustomHashTable = CompressorCustomHashTable;
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var CompressorSimpleHashTable = (function () {
            function CompressorSimpleHashTable(size) {
                this.maximumBucketCapacity = 64;
                this.buckets = new Array(size);
            }
            CompressorSimpleHashTable.prototype.addValueToBucket = function (bucketIndex, valueToAdd) {
                var bucket = this.buckets[bucketIndex];
                if (bucket === undefined) {
                    this.buckets[bucketIndex] = [valueToAdd];
                }
                else {
                    if (bucket.length === this.maximumBucketCapacity - 1)
                        LZUTF8.ArrayTools.truncateStartingElements(bucket, this.maximumBucketCapacity / 2);
                    bucket.push(valueToAdd);
                }
            };
            CompressorSimpleHashTable.prototype.getArraySegmentForBucketIndex = function (bucketIndex, outputObject) {
                var bucket = this.buckets[bucketIndex];
                if (bucket === undefined)
                    return null;
                if (outputObject === undefined)
                    outputObject = new LZUTF8.ArraySegment(bucket, 0, bucket.length);
                return outputObject;
            };
            CompressorSimpleHashTable.prototype.getUsedBucketCount = function () {
                return LZUTF8.ArrayTools.countNonzeroValuesInArray(this.buckets);
            };
            CompressorSimpleHashTable.prototype.getTotalElementCount = function () {
                var currentSum = 0;
                for (var i = 0; i < this.buckets.length; i++) {
                    if (this.buckets[i] !== undefined)
                        currentSum += this.buckets[i].length;
                }
                return currentSum;
            };
            return CompressorSimpleHashTable;
        }());
        LZUTF8.CompressorSimpleHashTable = CompressorSimpleHashTable;
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var Decompressor = (function () {
            function Decompressor() {
                this.MaximumMatchDistance = 32767;
                this.outputPosition = 0;
            }
            Decompressor.prototype.decompressBlockToString = function (input) {
                input = LZUTF8.BufferTools.convertToUint8ArrayIfNeeded(input);
                return LZUTF8.decodeUTF8(this.decompressBlock(input));
            };
            Decompressor.prototype.decompressBlock = function (input) {
                if (this.inputBufferRemainder) {
                    input = LZUTF8.ArrayTools.concatUint8Arrays([this.inputBufferRemainder, input]);
                    this.inputBufferRemainder = undefined;
                }
                var outputStartPosition = this.cropOutputBufferToWindowAndInitialize(Math.max(input.length * 4, 1024));
                for (var readPosition = 0, inputLength = input.length; readPosition < inputLength; readPosition++) {
                    var inputValue = input[readPosition];
                    if (inputValue >>> 6 != 3) {
                        this.outputByte(inputValue);
                        continue;
                    }
                    var sequenceLengthIdentifier = inputValue >>> 5;
                    if (readPosition == inputLength - 1 ||
                        (readPosition == inputLength - 2 && sequenceLengthIdentifier == 7)) {
                        this.inputBufferRemainder = input.subarray(readPosition);
                        break;
                    }
                    if (input[readPosition + 1] >>> 7 === 1) {
                        this.outputByte(inputValue);
                    }
                    else {
                        var matchLength = inputValue & 31;
                        var matchDistance = void 0;
                        if (sequenceLengthIdentifier == 6) {
                            matchDistance = input[readPosition + 1];
                            readPosition += 1;
                        }
                        else {
                            matchDistance = (input[readPosition + 1] << 8) | (input[readPosition + 2]);
                            readPosition += 2;
                        }
                        var matchPosition = this.outputPosition - matchDistance;
                        for (var offset = 0; offset < matchLength; offset++)
                            this.outputByte(this.outputBuffer[matchPosition + offset]);
                    }
                }
                this.rollBackIfOutputBufferEndsWithATruncatedMultibyteSequence();
                return LZUTF8.CompressionCommon.getCroppedBuffer(this.outputBuffer, outputStartPosition, this.outputPosition - outputStartPosition);
            };
            Decompressor.prototype.outputByte = function (value) {
                if (this.outputPosition === this.outputBuffer.length)
                    this.outputBuffer = LZUTF8.ArrayTools.doubleByteArrayCapacity(this.outputBuffer);
                this.outputBuffer[this.outputPosition++] = value;
            };
            Decompressor.prototype.cropOutputBufferToWindowAndInitialize = function (initialCapacity) {
                if (!this.outputBuffer) {
                    this.outputBuffer = new Uint8Array(initialCapacity);
                    return 0;
                }
                var cropLength = Math.min(this.outputPosition, this.MaximumMatchDistance);
                this.outputBuffer = LZUTF8.CompressionCommon.getCroppedBuffer(this.outputBuffer, this.outputPosition - cropLength, cropLength, initialCapacity);
                this.outputPosition = cropLength;
                if (this.outputBufferRemainder) {
                    for (var i = 0; i < this.outputBufferRemainder.length; i++)
                        this.outputByte(this.outputBufferRemainder[i]);
                    this.outputBufferRemainder = undefined;
                }
                return cropLength;
            };
            Decompressor.prototype.rollBackIfOutputBufferEndsWithATruncatedMultibyteSequence = function () {
                for (var offset = 1; offset <= 4 && this.outputPosition - offset >= 0; offset++) {
                    var value = this.outputBuffer[this.outputPosition - offset];
                    if ((offset < 4 && (value >>> 3) === 30) ||
                        (offset < 3 && (value >>> 4) === 14) ||
                        (offset < 2 && (value >>> 5) === 6)) {
                        this.outputBufferRemainder = this.outputBuffer.subarray(this.outputPosition - offset, this.outputPosition);
                        this.outputPosition -= offset;
                        return;
                    }
                }
            };
            return Decompressor;
        }());
        LZUTF8.Decompressor = Decompressor;
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var Encoding;
        (function (Encoding) {
            var Base64;
            (function (Base64) {
                var charCodeMap = new Uint8Array([65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 43, 47]);
                var reverseCharCodeMap = new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 62, 255, 255, 255, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255, 255, 0, 255, 255, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 255, 255, 255, 255, 255, 255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 255, 255, 255, 255]);
                var paddingCharacter = "=";
                var paddingCharCode = 61;
                Base64.encode = function (inputBytes) {
                    if (!inputBytes || inputBytes.length == 0)
                        return "";
                    if (LZUTF8.runningInNodeJS()) {
                        return (LZUTF8.BufferTools.uint8ArrayToBuffer(inputBytes)).toString("base64");
                    }
                    else {
                        return Base64.encodeWithJS(inputBytes);
                    }
                };
                Base64.decode = function (base64String) {
                    if (!base64String)
                        return new Uint8Array(0);
                    if (LZUTF8.runningInNodeJS()) {
                        return LZUTF8.BufferTools.bufferToUint8Array(new Buffer(base64String, "base64"));
                    }
                    else {
                        return Base64.decodeWithJS(base64String);
                    }
                };
                Base64.encodeWithJS = function (inputBytes, addPadding) {
                    if (addPadding === void 0) { addPadding = true; }
                    if (!inputBytes || inputBytes.length == 0)
                        return "";
                    var map = charCodeMap;
                    var output = new LZUTF8.StringBuilder();
                    var uint24;
                    for (var readPosition = 0, length_5 = inputBytes.length; readPosition < length_5; readPosition += 3) {
                        if (readPosition <= length_5 - 3) {
                            uint24 = inputBytes[readPosition] << 16 | inputBytes[readPosition + 1] << 8 | inputBytes[readPosition + 2];
                            output.appendCharCode(map[(uint24 >>> 18) & 63]);
                            output.appendCharCode(map[(uint24 >>> 12) & 63]);
                            output.appendCharCode(map[(uint24 >>> 6) & 63]);
                            output.appendCharCode(map[(uint24) & 63]);
                            uint24 = 0;
                        }
                        else if (readPosition === length_5 - 2) {
                            uint24 = inputBytes[readPosition] << 16 | inputBytes[readPosition + 1] << 8;
                            output.appendCharCode(map[(uint24 >>> 18) & 63]);
                            output.appendCharCode(map[(uint24 >>> 12) & 63]);
                            output.appendCharCode(map[(uint24 >>> 6) & 63]);
                            if (addPadding)
                                output.appendCharCode(paddingCharCode);
                        }
                        else if (readPosition === length_5 - 1) {
                            uint24 = inputBytes[readPosition] << 16;
                            output.appendCharCode(map[(uint24 >>> 18) & 63]);
                            output.appendCharCode(map[(uint24 >>> 12) & 63]);
                            if (addPadding) {
                                output.appendCharCode(paddingCharCode);
                                output.appendCharCode(paddingCharCode);
                            }
                        }
                    }
                    return output.getOutputString();
                };
                Base64.decodeWithJS = function (base64String, outputBuffer) {
                    if (!base64String || base64String.length == 0)
                        return new Uint8Array(0);
                    var lengthModulo4 = base64String.length % 4;
                    if (lengthModulo4 === 1)
                        throw new Error("Invalid Base64 string: length % 4 == 1");
                    else if (lengthModulo4 === 2)
                        base64String += paddingCharacter + paddingCharacter;
                    else if (lengthModulo4 === 3)
                        base64String += paddingCharacter;
                    if (!outputBuffer)
                        outputBuffer = new Uint8Array(base64String.length);
                    var outputPosition = 0;
                    var length = base64String.length;
                    for (var i = 0; i < length; i += 4) {
                        var uint24 = (reverseCharCodeMap[base64String.charCodeAt(i)] << 18) |
                            (reverseCharCodeMap[base64String.charCodeAt(i + 1)] << 12) |
                            (reverseCharCodeMap[base64String.charCodeAt(i + 2)] << 6) |
                            (reverseCharCodeMap[base64String.charCodeAt(i + 3)]);
                        outputBuffer[outputPosition++] = (uint24 >>> 16) & 255;
                        outputBuffer[outputPosition++] = (uint24 >>> 8) & 255;
                        outputBuffer[outputPosition++] = (uint24) & 255;
                    }
                    if (base64String.charCodeAt(length - 1) == paddingCharCode)
                        outputPosition--;
                    if (base64String.charCodeAt(length - 2) == paddingCharCode)
                        outputPosition--;
                    return outputBuffer.subarray(0, outputPosition);
                };
            })(Base64 = Encoding.Base64 || (Encoding.Base64 = {}));
        })(Encoding = LZUTF8.Encoding || (LZUTF8.Encoding = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var Encoding;
        (function (Encoding) {
            var BinaryString;
            (function (BinaryString) {
                BinaryString.encode = function (input) {
                    if (input == null)
                        throw new TypeError("BinaryString.encode: undefined or null input received");
                    if (input.length === 0)
                        return "";
                    var inputLength = input.length;
                    var outputStringBuilder = new LZUTF8.StringBuilder();
                    var remainder = 0;
                    var state = 1;
                    for (var i = 0; i < inputLength; i += 2) {
                        var value = void 0;
                        if (i == inputLength - 1)
                            value = (input[i] << 8);
                        else
                            value = (input[i] << 8) | input[i + 1];
                        outputStringBuilder.appendCharCode((remainder << (16 - state)) | value >>> state);
                        remainder = value & ((1 << state) - 1);
                        if (state === 15) {
                            outputStringBuilder.appendCharCode(remainder);
                            remainder = 0;
                            state = 1;
                        }
                        else {
                            state += 1;
                        }
                        if (i >= inputLength - 2)
                            outputStringBuilder.appendCharCode(remainder << (16 - state));
                    }
                    outputStringBuilder.appendCharCode(32768 | (inputLength % 2));
                    return outputStringBuilder.getOutputString();
                };
                BinaryString.decode = function (input) {
                    if (typeof input !== "string")
                        throw new TypeError("BinaryString.decode: invalid input type");
                    if (input == "")
                        return new Uint8Array(0);
                    var output = new Uint8Array(input.length * 3);
                    var outputPosition = 0;
                    var appendToOutput = function (value) {
                        output[outputPosition++] = value >>> 8;
                        output[outputPosition++] = value & 255;
                    };
                    var remainder = 0;
                    var state = 0;
                    for (var i = 0; i < input.length; i++) {
                        var value = input.charCodeAt(i);
                        if (value >= 32768) {
                            if (value == (32768 | 1))
                                outputPosition--;
                            state = 0;
                            continue;
                        }
                        if (state == 0) {
                            remainder = value;
                        }
                        else {
                            appendToOutput((remainder << state) | (value >>> (15 - state)));
                            remainder = value & ((1 << (15 - state)) - 1);
                        }
                        if (state == 15)
                            state = 0;
                        else
                            state += 1;
                    }
                    return output.subarray(0, outputPosition);
                };
            })(BinaryString = Encoding.BinaryString || (Encoding.BinaryString = {}));
        })(Encoding = LZUTF8.Encoding || (LZUTF8.Encoding = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var Encoding;
        (function (Encoding) {
            var CodePoint;
            (function (CodePoint) {
                CodePoint.encodeFromString = function (str, position) {
                    var charCode = str.charCodeAt(position);
                    if (charCode < 0xD800 || charCode > 0xDBFF)
                        return charCode;
                    else {
                        var nextCharCode = str.charCodeAt(position + 1);
                        if (nextCharCode >= 0xDC00 && nextCharCode <= 0xDFFF)
                            return 0x10000 + (((charCode - 0xD800) << 10) + (nextCharCode - 0xDC00));
                        else
                            throw new Error("getUnicodeCodePoint: Received a lead surrogate character, char code " + charCode + ", followed by " + nextCharCode + ", which is not a trailing surrogate character code.");
                    }
                };
                CodePoint.decodeToString = function (codePoint) {
                    if (codePoint <= 0xFFFF)
                        return String.fromCharCode(codePoint);
                    else if (codePoint <= 0x10FFFF)
                        return String.fromCharCode(0xD800 + ((codePoint - 0x10000) >>> 10), 0xDC00 + ((codePoint - 0x10000) & 1023));
                    else
                        throw new Error("getStringFromUnicodeCodePoint: A code point of " + codePoint + " cannot be encoded in UTF-16");
                };
            })(CodePoint = Encoding.CodePoint || (Encoding.CodePoint = {}));
        })(Encoding = LZUTF8.Encoding || (LZUTF8.Encoding = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var Encoding;
        (function (Encoding) {
            var DecimalString;
            (function (DecimalString) {
                var lookupTable = ["000", "001", "002", "003", "004", "005", "006", "007", "008", "009", "010", "011", "012", "013", "014", "015", "016", "017", "018", "019", "020", "021", "022", "023", "024", "025", "026", "027", "028", "029", "030", "031", "032", "033", "034", "035", "036", "037", "038", "039", "040", "041", "042", "043", "044", "045", "046", "047", "048", "049", "050", "051", "052", "053", "054", "055", "056", "057", "058", "059", "060", "061", "062", "063", "064", "065", "066", "067", "068", "069", "070", "071", "072", "073", "074", "075", "076", "077", "078", "079", "080", "081", "082", "083", "084", "085", "086", "087", "088", "089", "090", "091", "092", "093", "094", "095", "096", "097", "098", "099", "100", "101", "102", "103", "104", "105", "106", "107", "108", "109", "110", "111", "112", "113", "114", "115", "116", "117", "118", "119", "120", "121", "122", "123", "124", "125", "126", "127", "128", "129", "130", "131", "132", "133", "134", "135", "136", "137", "138", "139", "140", "141", "142", "143", "144", "145", "146", "147", "148", "149", "150", "151", "152", "153", "154", "155", "156", "157", "158", "159", "160", "161", "162", "163", "164", "165", "166", "167", "168", "169", "170", "171", "172", "173", "174", "175", "176", "177", "178", "179", "180", "181", "182", "183", "184", "185", "186", "187", "188", "189", "190", "191", "192", "193", "194", "195", "196", "197", "198", "199", "200", "201", "202", "203", "204", "205", "206", "207", "208", "209", "210", "211", "212", "213", "214", "215", "216", "217", "218", "219", "220", "221", "222", "223", "224", "225", "226", "227", "228", "229", "230", "231", "232", "233", "234", "235", "236", "237", "238", "239", "240", "241", "242", "243", "244", "245", "246", "247", "248", "249", "250", "251", "252", "253", "254", "255"];
                DecimalString.encode = function (binaryBytes) {
                    var resultArray = [];
                    for (var i = 0; i < binaryBytes.length; i++)
                        resultArray.push(lookupTable[binaryBytes[i]]);
                    return resultArray.join(" ");
                };
            })(DecimalString = Encoding.DecimalString || (Encoding.DecimalString = {}));
        })(Encoding = LZUTF8.Encoding || (LZUTF8.Encoding = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var Encoding;
        (function (Encoding) {
            var StorageBinaryString;
            (function (StorageBinaryString) {
                StorageBinaryString.encode = function (input) {
                    return Encoding.BinaryString.encode(input).replace(/\0/g, '\u8002');
                };
                StorageBinaryString.decode = function (input) {
                    return Encoding.BinaryString.decode(input.replace(/\u8002/g, '\0'));
                };
            })(StorageBinaryString = Encoding.StorageBinaryString || (Encoding.StorageBinaryString = {}));
        })(Encoding = LZUTF8.Encoding || (LZUTF8.Encoding = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        var Encoding;
        (function (Encoding) {
            var UTF8;
            (function (UTF8) {
                var nativeTextEncoder;
                var nativeTextDecoder;
                UTF8.encode = function (str) {
                    if (!str || str.length == 0)
                        return new Uint8Array(0);
                    if (LZUTF8.runningInNodeJS()) {
                        return LZUTF8.BufferTools.bufferToUint8Array(new Buffer(str, "utf8"));
                    }
                    else if (UTF8.createNativeTextEncoderAndDecoderIfAvailable()) {
                        return nativeTextEncoder.encode(str);
                    }
                    else {
                        return UTF8.encodeWithJS(str);
                    }
                };
                UTF8.decode = function (utf8Bytes) {
                    if (!utf8Bytes || utf8Bytes.length == 0)
                        return "";
                    if (LZUTF8.runningInNodeJS()) {
                        return LZUTF8.BufferTools.uint8ArrayToBuffer(utf8Bytes).toString("utf8");
                    }
                    else if (UTF8.createNativeTextEncoderAndDecoderIfAvailable()) {
                        return nativeTextDecoder.decode(utf8Bytes);
                    }
                    else {
                        return UTF8.decodeWithJS(utf8Bytes);
                    }
                };
                UTF8.encodeWithJS = function (str, outputArray) {
                    if (!str || str.length == 0)
                        return new Uint8Array(0);
                    if (!outputArray)
                        outputArray = new Uint8Array(str.length * 4);
                    var writeIndex = 0;
                    for (var readIndex = 0; readIndex < str.length; readIndex++) {
                        var charCode = Encoding.CodePoint.encodeFromString(str, readIndex);
                        if (charCode <= 0x7F) {
                            outputArray[writeIndex++] = charCode;
                        }
                        else if (charCode <= 0x7FF) {
                            outputArray[writeIndex++] = 0xC0 | (charCode >>> 6);
                            outputArray[writeIndex++] = 0x80 | (charCode & 63);
                        }
                        else if (charCode <= 0xFFFF) {
                            outputArray[writeIndex++] = 0xE0 | (charCode >>> 12);
                            outputArray[writeIndex++] = 0x80 | ((charCode >>> 6) & 63);
                            outputArray[writeIndex++] = 0x80 | (charCode & 63);
                        }
                        else if (charCode <= 0x10FFFF) {
                            outputArray[writeIndex++] = 0xF0 | (charCode >>> 18);
                            outputArray[writeIndex++] = 0x80 | ((charCode >>> 12) & 63);
                            outputArray[writeIndex++] = 0x80 | ((charCode >>> 6) & 63);
                            outputArray[writeIndex++] = 0x80 | (charCode & 63);
                            readIndex++;
                        }
                        else
                            throw new Error("Invalid UTF-16 string: Encountered a character unsupported by UTF-8/16 (RFC 3629)");
                    }
                    return outputArray.subarray(0, writeIndex);
                };
                UTF8.decodeWithJS = function (utf8Bytes, startOffset, endOffset) {
                    if (startOffset === void 0) { startOffset = 0; }
                    if (!utf8Bytes || utf8Bytes.length == 0)
                        return "";
                    if (endOffset === undefined)
                        endOffset = utf8Bytes.length;
                    var output = new LZUTF8.StringBuilder();
                    var outputCodePoint;
                    var leadByte;
                    for (var readIndex = startOffset, length_6 = endOffset; readIndex < length_6;) {
                        leadByte = utf8Bytes[readIndex];
                        if ((leadByte >>> 7) === 0) {
                            outputCodePoint = leadByte;
                            readIndex += 1;
                        }
                        else if ((leadByte >>> 5) === 6) {
                            if (readIndex + 1 >= endOffset)
                                throw new Error("Invalid UTF-8 stream: Truncated codepoint sequence encountered at position " + readIndex);
                            outputCodePoint = ((leadByte & 31) << 6) | (utf8Bytes[readIndex + 1] & 63);
                            readIndex += 2;
                        }
                        else if ((leadByte >>> 4) === 14) {
                            if (readIndex + 2 >= endOffset)
                                throw new Error("Invalid UTF-8 stream: Truncated codepoint sequence encountered at position " + readIndex);
                            outputCodePoint = ((leadByte & 15) << 12) | ((utf8Bytes[readIndex + 1] & 63) << 6) | (utf8Bytes[readIndex + 2] & 63);
                            readIndex += 3;
                        }
                        else if ((leadByte >>> 3) === 30) {
                            if (readIndex + 3 >= endOffset)
                                throw new Error("Invalid UTF-8 stream: Truncated codepoint sequence encountered at position " + readIndex);
                            outputCodePoint = ((leadByte & 7) << 18) | ((utf8Bytes[readIndex + 1] & 63) << 12) | ((utf8Bytes[readIndex + 2] & 63) << 6) | (utf8Bytes[readIndex + 3] & 63);
                            readIndex += 4;
                        }
                        else
                            throw new Error("Invalid UTF-8 stream: An invalid lead byte value encountered at position " + readIndex);
                        output.appendCodePoint(outputCodePoint);
                    }
                    return output.getOutputString();
                };
                UTF8.createNativeTextEncoderAndDecoderIfAvailable = function () {
                    if (nativeTextEncoder)
                        return true;
                    if (typeof TextEncoder == "function") {
                        nativeTextEncoder = new TextEncoder("utf-8");
                        nativeTextDecoder = new TextDecoder("utf-8");
                        return true;
                    }
                    else
                        return false;
                };
            })(UTF8 = Encoding.UTF8 || (Encoding.UTF8 = {}));
        })(Encoding = LZUTF8.Encoding || (LZUTF8.Encoding = {}));
    })(LZUTF8 || (LZUTF8 = {}));
    var LZUTF8;
    (function (LZUTF8) {
        function compress(input, options) {
            if (options === void 0) { options = {}; }
            if (input == null)
                throw new TypeError("compress: undefined or null input received");
            var inputEncoding = LZUTF8.CompressionCommon.detectCompressionSourceEncoding(input);
            options = LZUTF8.ObjectTools.override({ inputEncoding: inputEncoding, outputEncoding: "ByteArray" }, options);
            var compressor = new LZUTF8.Compressor();
            var compressedBytes = compressor.compressBlock(input);
            return LZUTF8.CompressionCommon.encodeCompressedBytes(compressedBytes, options.outputEncoding);
        }
        LZUTF8.compress = compress;
        function decompress(input, options) {
            if (options === void 0) { options = {}; }
            if (input == null)
                throw new TypeError("decompress: undefined or null input received");
            options = LZUTF8.ObjectTools.override({ inputEncoding: "ByteArray", outputEncoding: "String" }, options);
            var inputBytes = LZUTF8.CompressionCommon.decodeCompressedBytes(input, options.inputEncoding);
            var decompressor = new LZUTF8.Decompressor();
            var decompressedBytes = decompressor.decompressBlock(inputBytes);
            return LZUTF8.CompressionCommon.encodeDecompressedBytes(decompressedBytes, options.outputEncoding);
        }
        LZUTF8.decompress = decompress;
        function compressAsync(input, options, callback) {
            if (callback == null)
                callback = function () { };
            var inputEncoding;
            try {
                inputEncoding = LZUTF8.CompressionCommon.detectCompressionSourceEncoding(input);
            }
            catch (e) {
                callback(undefined, e);
                return;
            }
            options = LZUTF8.ObjectTools.override({
                inputEncoding: inputEncoding,
                outputEncoding: "ByteArray",
                useWebWorker: true,
                blockSize: 65536
            }, options);
            LZUTF8.enqueueImmediate(function () {
                if (options.useWebWorker && LZUTF8.WebWorker.createGlobalWorkerIfNeeded()) {
                    LZUTF8.WebWorker.compressAsync(input, options, callback);
                }
                else {
                    LZUTF8.AsyncCompressor.compressAsync(input, options, callback);
                }
            });
        }
        LZUTF8.compressAsync = compressAsync;
        function decompressAsync(input, options, callback) {
            if (callback == null)
                callback = function () { };
            if (input == null) {
                callback(undefined, new TypeError("decompressAsync: undefined or null input received"));
                return;
            }
            options = LZUTF8.ObjectTools.override({
                inputEncoding: "ByteArray",
                outputEncoding: "String",
                useWebWorker: true,
                blockSize: 65536
            }, options);
            var normalizedInput = LZUTF8.BufferTools.convertToUint8ArrayIfNeeded(input);
            LZUTF8.EventLoop.enqueueImmediate(function () {
                if (options.useWebWorker && LZUTF8.WebWorker.createGlobalWorkerIfNeeded()) {
                    LZUTF8.WebWorker.decompressAsync(normalizedInput, options, callback);
                }
                else {
                    LZUTF8.AsyncDecompressor.decompressAsync(input, options, callback);
                }
            });
        }
        LZUTF8.decompressAsync = decompressAsync;
        function createCompressionStream() {
            return LZUTF8.AsyncCompressor.createCompressionStream();
        }
        LZUTF8.createCompressionStream = createCompressionStream;
        function createDecompressionStream() {
            return LZUTF8.AsyncDecompressor.createDecompressionStream();
        }
        LZUTF8.createDecompressionStream = createDecompressionStream;
        function encodeUTF8(str) {
            return LZUTF8.Encoding.UTF8.encode(str);
        }
        LZUTF8.encodeUTF8 = encodeUTF8;
        function decodeUTF8(input) {
            return LZUTF8.Encoding.UTF8.decode(input);
        }
        LZUTF8.decodeUTF8 = decodeUTF8;
        function encodeBase64(input) {
            return LZUTF8.Encoding.Base64.encode(input);
        }
        LZUTF8.encodeBase64 = encodeBase64;
        function decodeBase64(str) {
            return LZUTF8.Encoding.Base64.decode(str);
        }
        LZUTF8.decodeBase64 = decodeBase64;
        function encodeBinaryString(input) {
            return LZUTF8.Encoding.BinaryString.encode(input);
        }
        LZUTF8.encodeBinaryString = encodeBinaryString;
        function decodeBinaryString(str) {
            return LZUTF8.Encoding.BinaryString.decode(str);
        }
        LZUTF8.decodeBinaryString = decodeBinaryString;
        function encodeStorageBinaryString(input) {
            return LZUTF8.Encoding.StorageBinaryString.encode(input);
        }
        LZUTF8.encodeStorageBinaryString = encodeStorageBinaryString;
        function decodeStorageBinaryString(str) {
            return LZUTF8.Encoding.StorageBinaryString.decode(str);
        }
        LZUTF8.decodeStorageBinaryString = decodeStorageBinaryString;
    })(LZUTF8 || (LZUTF8 = {}));
    });
    var lzutf8_1 = lzutf8.compress;
    var lzutf8_2 = lzutf8.decompress;

    var lzString = createCommonjsModule(function (module) {
    // Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
    // This work is free. You can redistribute it and/or modify it
    // under the terms of the WTFPL, Version 2
    // For more information see LICENSE.txt or http://www.wtfpl.net/
    //
    // For more information, the home page:
    // http://pieroxy.net/blog/pages/lz-string/testing.html
    //
    // LZ-based compression algorithm, version 1.4.4
    var LZString = (function() {

    // private property
    var f = String.fromCharCode;
    var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    var baseReverseDic = {};

    function getBaseValue(alphabet, character) {
      if (!baseReverseDic[alphabet]) {
        baseReverseDic[alphabet] = {};
        for (var i=0 ; i<alphabet.length ; i++) {
          baseReverseDic[alphabet][alphabet.charAt(i)] = i;
        }
      }
      return baseReverseDic[alphabet][character];
    }

    var LZString = {
      compressToBase64 : function (input) {
        if (input == null) return "";
        var res = LZString._compress(input, 6, function(a){return keyStrBase64.charAt(a);});
        switch (res.length % 4) { // To produce valid Base64
        default: // When could this happen ?
        case 0 : return res;
        case 1 : return res+"===";
        case 2 : return res+"==";
        case 3 : return res+"=";
        }
      },

      decompressFromBase64 : function (input) {
        if (input == null) return "";
        if (input == "") return null;
        return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrBase64, input.charAt(index)); });
      },

      compressToUTF16 : function (input) {
        if (input == null) return "";
        return LZString._compress(input, 15, function(a){return f(a+32);}) + " ";
      },

      decompressFromUTF16: function (compressed) {
        if (compressed == null) return "";
        if (compressed == "") return null;
        return LZString._decompress(compressed.length, 16384, function(index) { return compressed.charCodeAt(index) - 32; });
      },

      //compress into uint8array (UCS-2 big endian format)
      compressToUint8Array: function (uncompressed) {
        var compressed = LZString.compress(uncompressed);
        var buf=new Uint8Array(compressed.length*2); // 2 bytes per character

        for (var i=0, TotalLen=compressed.length; i<TotalLen; i++) {
          var current_value = compressed.charCodeAt(i);
          buf[i*2] = current_value >>> 8;
          buf[i*2+1] = current_value % 256;
        }
        return buf;
      },

      //decompress from uint8array (UCS-2 big endian format)
      decompressFromUint8Array:function (compressed) {
        if (compressed===null || compressed===undefined){
            return LZString.decompress(compressed);
        } else {
            var buf=new Array(compressed.length/2); // 2 bytes per character
            for (var i=0, TotalLen=buf.length; i<TotalLen; i++) {
              buf[i]=compressed[i*2]*256+compressed[i*2+1];
            }

            var result = [];
            buf.forEach(function (c) {
              result.push(f(c));
            });
            return LZString.decompress(result.join(''));

        }

      },


      //compress into a string that is already URI encoded
      compressToEncodedURIComponent: function (input) {
        if (input == null) return "";
        return LZString._compress(input, 6, function(a){return keyStrUriSafe.charAt(a);});
      },

      //decompress from an output of compressToEncodedURIComponent
      decompressFromEncodedURIComponent:function (input) {
        if (input == null) return "";
        if (input == "") return null;
        input = input.replace(/ /g, "+");
        return LZString._decompress(input.length, 32, function(index) { return getBaseValue(keyStrUriSafe, input.charAt(index)); });
      },

      compress: function (uncompressed) {
        return LZString._compress(uncompressed, 16, function(a){return f(a);});
      },
      _compress: function (uncompressed, bitsPerChar, getCharFromInt) {
        if (uncompressed == null) return "";
        var i, value,
            context_dictionary= {},
            context_dictionaryToCreate= {},
            context_c="",
            context_wc="",
            context_w="",
            context_enlargeIn= 2, // Compensate for the first entry which should not count
            context_dictSize= 3,
            context_numBits= 2,
            context_data=[],
            context_data_val=0,
            context_data_position=0,
            ii;

        for (ii = 0; ii < uncompressed.length; ii += 1) {
          context_c = uncompressed.charAt(ii);
          if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
            context_dictionary[context_c] = context_dictSize++;
            context_dictionaryToCreate[context_c] = true;
          }

          context_wc = context_w + context_c;
          if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
            context_w = context_wc;
          } else {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
              if (context_w.charCodeAt(0)<256) {
                for (i=0 ; i<context_numBits ; i++) {
                  context_data_val = (context_data_val << 1);
                  if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                }
                value = context_w.charCodeAt(0);
                for (i=0 ; i<8 ; i++) {
                  context_data_val = (context_data_val << 1) | (value&1);
                  if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              } else {
                value = 1;
                for (i=0 ; i<context_numBits ; i++) {
                  context_data_val = (context_data_val << 1) | value;
                  if (context_data_position ==bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i=0 ; i<16 ; i++) {
                  context_data_val = (context_data_val << 1) | (value&1);
                  if (context_data_position == bitsPerChar-1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                  } else {
                    context_data_position++;
                  }
                  value = value >> 1;
                }
              }
              context_enlargeIn--;
              if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
              }
              delete context_dictionaryToCreate[context_w];
            } else {
              value = context_dictionary[context_w];
              for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }


            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            // Add wc to the dictionary.
            context_dictionary[context_wc] = context_dictSize++;
            context_w = String(context_c);
          }
        }

        // Output the code for w.
        if (context_w !== "") {
          if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
            if (context_w.charCodeAt(0)<256) {
              for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
              }
              value = context_w.charCodeAt(0);
              for (i=0 ; i<8 ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            } else {
              value = 1;
              for (i=0 ; i<context_numBits ; i++) {
                context_data_val = (context_data_val << 1) | value;
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = 0;
              }
              value = context_w.charCodeAt(0);
              for (i=0 ; i<16 ; i++) {
                context_data_val = (context_data_val << 1) | (value&1);
                if (context_data_position == bitsPerChar-1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            delete context_dictionaryToCreate[context_w];
          } else {
            value = context_dictionary[context_w];
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == bitsPerChar-1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }


          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
        }

        // Mark the end of the stream
        value = 2;
        for (i=0 ; i<context_numBits ; i++) {
          context_data_val = (context_data_val << 1) | (value&1);
          if (context_data_position == bitsPerChar-1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }

        // Flush the last char
        while (true) {
          context_data_val = (context_data_val << 1);
          if (context_data_position == bitsPerChar-1) {
            context_data.push(getCharFromInt(context_data_val));
            break;
          }
          else context_data_position++;
        }
        return context_data.join('');
      },

      decompress: function (compressed) {
        if (compressed == null) return "";
        if (compressed == "") return null;
        return LZString._decompress(compressed.length, 32768, function(index) { return compressed.charCodeAt(index); });
      },

      _decompress: function (length, resetValue, getNextValue) {
        var dictionary = [],
            next,
            enlargeIn = 4,
            dictSize = 4,
            numBits = 3,
            entry = "",
            result = [],
            i,
            w,
            bits, resb, maxpower, power,
            c,
            data = {val:getNextValue(0), position:resetValue, index:1};

        for (i = 0; i < 3; i += 1) {
          dictionary[i] = i;
        }

        bits = 0;
        maxpower = Math.pow(2,2);
        power=1;
        while (power!=maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb>0 ? 1 : 0) * power;
          power <<= 1;
        }

        switch (next = bits) {
          case 0:
              bits = 0;
              maxpower = Math.pow(2,8);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
            c = f(bits);
            break;
          case 1:
              bits = 0;
              maxpower = Math.pow(2,16);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
            c = f(bits);
            break;
          case 2:
            return "";
        }
        dictionary[3] = c;
        w = c;
        result.push(c);
        while (true) {
          if (data.index > length) {
            return "";
          }

          bits = 0;
          maxpower = Math.pow(2,numBits);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }

          switch (c = bits) {
            case 0:
              bits = 0;
              maxpower = Math.pow(2,8);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }

              dictionary[dictSize++] = f(bits);
              c = dictSize-1;
              enlargeIn--;
              break;
            case 1:
              bits = 0;
              maxpower = Math.pow(2,16);
              power=1;
              while (power!=maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                  data.position = resetValue;
                  data.val = getNextValue(data.index++);
                }
                bits |= (resb>0 ? 1 : 0) * power;
                power <<= 1;
              }
              dictionary[dictSize++] = f(bits);
              c = dictSize-1;
              enlargeIn--;
              break;
            case 2:
              return result.join('');
          }

          if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
          }

          if (dictionary[c]) {
            entry = dictionary[c];
          } else {
            if (c === dictSize) {
              entry = w + w.charAt(0);
            } else {
              return null;
            }
          }
          result.push(entry);

          // Add w+entry[0] to the dictionary.
          dictionary[dictSize++] = w + entry.charAt(0);
          enlargeIn--;

          w = entry;

          if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
          }

        }
      }
    };
      return LZString;
    })();

    if(  module != null ) {
      module.exports = LZString;
    }
    });
    var lzString_1 = lzString.compressToUint8Array;
    var lzString_2 = lzString.decompressFromUint8Array;

    const { RantMessage } = messages$1;
    const { compress, decompress } = lzutf8;
    const { compressToUint8Array, decompressFromUint8Array } = lzString;
    const { encrypt, decrypt } = cryptology;

    var postcard = class Picocard extends picofeed {
      constructor () {
        super({ contentEncoding: RantMessage });
      }
      get key () {
        for (const { key } of this.blocks()) return key
      }
      get theme () { return this._card.theme }
      get date () { return this._card.date }
      get text () { return this._unpackText({ secret: this.__secret }) }
      get title () {
        const md = this.text;
        if (!md && !md.length) return
        // Not sure how robust theese regexes are, feel free to improve.
        const m1 = md.match(/^\s*(.+)\s*\n==+/m);
        if (m1) return m1[1]
        const m2 = this.text.match(/^#+ (.+)\s+$/m);
        if (m2) return m2[1]
      }
      update (props, sk) {
        return this._pack(props, sk)
      }

      get _card () {
        return this.get(0).card
      }

      decrypt(secret) {
        this.__secret = secret;
        return this._unpackText({ secret })
      }

      _unpackText (opts = {}) {
        const decompressors = [
          i => i.toString('utf8'),
          decompress,
          decompressFromUint8Array
        ];
        const card = this._card;
        switch (card.encryption) {
          case 0: // not encrypted; TODO: maybe always encrypt with 0K for deniability.
            return decompressors[card.compression](card.text)
          case 1: // secret_box encryption
            if (!opts.secret) throw new Error('ContentEncrypted')
            const plain = decrypt(card.text, opts.secret);
            return decompressors[card.compression](plain)
        }
      }

      _pack (props, sk) {
        const secret = props.secret;
        delete props.secret;

        const card = {
          // Defaults
          text: '',
          compression: 0,
          encryption: 0,
          // Merge existing
          ...(this.length ? this.get(0).card : {}),
          // Merge new
          ...props,
          // Auto generated ontop
          date: new Date().getTime(),
        };

        if (!card.text.length) return
        const text = card.text // Prepack transforms
          .replace(/\r/, ''); // Unecessary CRLF
          // .replace(/ {4}/, '\t') // most likely annoy more people than it saves space.

        // Let's waste some memory and cpu
        // and pick the algo that offers the best space efficiency
        // feel free to add more algorithms as long as they aren't too heavy deps.
        const candidates = [
          Buffer.from(text, 'utf8'),
          compress(Buffer.from(text, 'utf8')),
          compressToUint8Array(text)
        ];
        // Overwrite with compressed data
        const winrar = [ ...candidates ].sort((a, b) => a.length > b.length)[0];
        // And leave a note of what type of compression was used.
        card.compression = candidates.indexOf(winrar);
        card.text = Buffer.from(winrar);

        this.__secret = secret; // TODO: introduces state, but i'm to lazy to fix title getter.
        if (this.__secret) {
          card.encryption = 1;
          card.text = encrypt(card.text, this.__secret);
        }

        this.truncate(0); // evict all previous data.
        this.append({ card }, sk);
        return card.text.length
      }

      static from (source, opts = {}) {
        const card = new Picocard();
        const d = picofeed.from(source, opts);
        card.buf = d.buf;
        card.tail = d.tail;
        card._lastBlockOffset = d._lastBlockOffset;
        return card
      }
    };

    var defaults = createCommonjsModule(function (module) {
    function getDefaults() {
      return {
        baseUrl: null,
        breaks: false,
        gfm: true,
        headerIds: true,
        headerPrefix: '',
        highlight: null,
        langPrefix: 'language-',
        mangle: true,
        pedantic: false,
        renderer: null,
        sanitize: false,
        sanitizer: null,
        silent: false,
        smartLists: false,
        smartypants: false,
        xhtml: false
      };
    }

    function changeDefaults(newDefaults) {
      module.exports.defaults = newDefaults;
    }

    module.exports = {
      defaults: getDefaults(),
      getDefaults,
      changeDefaults
    };
    });
    var defaults_1 = defaults.defaults;
    var defaults_2 = defaults.getDefaults;
    var defaults_3 = defaults.changeDefaults;

    /**
     * Helpers
     */
    const escapeTest = /[&<>"']/;
    const escapeReplace = /[&<>"']/g;
    const escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
    const escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;
    const escapeReplacements = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    const getEscapeReplacement = (ch) => escapeReplacements[ch];
    function escape(html, encode) {
      if (encode) {
        if (escapeTest.test(html)) {
          return html.replace(escapeReplace, getEscapeReplacement);
        }
      } else {
        if (escapeTestNoEncode.test(html)) {
          return html.replace(escapeReplaceNoEncode, getEscapeReplacement);
        }
      }

      return html;
    }

    const unescapeTest = /&(#(?:\d+)|(?:#x[0-9A-Fa-f]+)|(?:\w+));?/ig;

    function unescape(html) {
      // explicitly match decimal, hex, and named HTML entities
      return html.replace(unescapeTest, (_, n) => {
        n = n.toLowerCase();
        if (n === 'colon') return ':';
        if (n.charAt(0) === '#') {
          return n.charAt(1) === 'x'
            ? String.fromCharCode(parseInt(n.substring(2), 16))
            : String.fromCharCode(+n.substring(1));
        }
        return '';
      });
    }

    const caret = /(^|[^\[])\^/g;
    function edit(regex, opt) {
      regex = regex.source || regex;
      opt = opt || '';
      const obj = {
        replace: (name, val) => {
          val = val.source || val;
          val = val.replace(caret, '$1');
          regex = regex.replace(name, val);
          return obj;
        },
        getRegex: () => {
          return new RegExp(regex, opt);
        }
      };
      return obj;
    }

    const nonWordAndColonTest = /[^\w:]/g;
    const originIndependentUrl = /^$|^[a-z][a-z0-9+.-]*:|^[?#]/i;
    function cleanUrl(sanitize, base, href) {
      if (sanitize) {
        let prot;
        try {
          prot = decodeURIComponent(unescape(href))
            .replace(nonWordAndColonTest, '')
            .toLowerCase();
        } catch (e) {
          return null;
        }
        if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0 || prot.indexOf('data:') === 0) {
          return null;
        }
      }
      if (base && !originIndependentUrl.test(href)) {
        href = resolveUrl(base, href);
      }
      try {
        href = encodeURI(href).replace(/%25/g, '%');
      } catch (e) {
        return null;
      }
      return href;
    }

    const baseUrls = {};
    const justDomain = /^[^:]+:\/*[^/]*$/;
    const protocol = /^([^:]+:)[\s\S]*$/;
    const domain$1 = /^([^:]+:\/*[^/]*)[\s\S]*$/;

    function resolveUrl(base, href) {
      if (!baseUrls[' ' + base]) {
        // we can ignore everything in base after the last slash of its path component,
        // but we might need to add _that_
        // https://tools.ietf.org/html/rfc3986#section-3
        if (justDomain.test(base)) {
          baseUrls[' ' + base] = base + '/';
        } else {
          baseUrls[' ' + base] = rtrim(base, '/', true);
        }
      }
      base = baseUrls[' ' + base];
      const relativeBase = base.indexOf(':') === -1;

      if (href.substring(0, 2) === '//') {
        if (relativeBase) {
          return href;
        }
        return base.replace(protocol, '$1') + href;
      } else if (href.charAt(0) === '/') {
        if (relativeBase) {
          return href;
        }
        return base.replace(domain$1, '$1') + href;
      } else {
        return base + href;
      }
    }

    const noopTest = { exec: function noopTest() {} };

    function merge(obj) {
      let i = 1,
        target,
        key;

      for (; i < arguments.length; i++) {
        target = arguments[i];
        for (key in target) {
          if (Object.prototype.hasOwnProperty.call(target, key)) {
            obj[key] = target[key];
          }
        }
      }

      return obj;
    }

    function splitCells(tableRow, count) {
      // ensure that every cell-delimiting pipe has a space
      // before it to distinguish it from an escaped pipe
      const row = tableRow.replace(/\|/g, (match, offset, str) => {
          let escaped = false,
            curr = offset;
          while (--curr >= 0 && str[curr] === '\\') escaped = !escaped;
          if (escaped) {
            // odd number of slashes means | is escaped
            // so we leave it alone
            return '|';
          } else {
            // add space before unescaped |
            return ' |';
          }
        }),
        cells = row.split(/ \|/);
      let i = 0;

      if (cells.length > count) {
        cells.splice(count);
      } else {
        while (cells.length < count) cells.push('');
      }

      for (; i < cells.length; i++) {
        // leading or trailing whitespace is ignored per the gfm spec
        cells[i] = cells[i].trim().replace(/\\\|/g, '|');
      }
      return cells;
    }

    // Remove trailing 'c's. Equivalent to str.replace(/c*$/, '').
    // /c*$/ is vulnerable to REDOS.
    // invert: Remove suffix of non-c chars instead. Default falsey.
    function rtrim(str, c, invert) {
      const l = str.length;
      if (l === 0) {
        return '';
      }

      // Length of suffix matching the invert condition.
      let suffLen = 0;

      // Step left until we fail to match the invert condition.
      while (suffLen < l) {
        const currChar = str.charAt(l - suffLen - 1);
        if (currChar === c && !invert) {
          suffLen++;
        } else if (currChar !== c && invert) {
          suffLen++;
        } else {
          break;
        }
      }

      return str.substr(0, l - suffLen);
    }

    function findClosingBracket(str, b) {
      if (str.indexOf(b[1]) === -1) {
        return -1;
      }
      const l = str.length;
      let level = 0,
        i = 0;
      for (; i < l; i++) {
        if (str[i] === '\\') {
          i++;
        } else if (str[i] === b[0]) {
          level++;
        } else if (str[i] === b[1]) {
          level--;
          if (level < 0) {
            return i;
          }
        }
      }
      return -1;
    }

    function checkSanitizeDeprecation(opt) {
      if (opt && opt.sanitize && !opt.silent) {
        console.warn('marked(): sanitize and sanitizer parameters are deprecated since version 0.7.0, should not be used and will be removed in the future. Read more here: https://marked.js.org/#/USING_ADVANCED.md#options');
      }
    }

    var helpers = {
      escape,
      unescape,
      edit,
      cleanUrl,
      resolveUrl,
      noopTest,
      merge,
      splitCells,
      rtrim,
      findClosingBracket,
      checkSanitizeDeprecation
    };

    const {
      noopTest: noopTest$1,
      edit: edit$1,
      merge: merge$1
    } = helpers;

    /**
     * Block-Level Grammar
     */
    const block = {
      newline: /^\n+/,
      code: /^( {4}[^\n]+\n*)+/,
      fences: /^ {0,3}(`{3,}(?=[^`\n]*\n)|~{3,})([^\n]*)\n(?:|([\s\S]*?)\n)(?: {0,3}\1[~`]* *(?:\n+|$)|$)/,
      hr: /^ {0,3}((?:- *){3,}|(?:_ *){3,}|(?:\* *){3,})(?:\n+|$)/,
      heading: /^ {0,3}(#{1,6}) +([^\n]*?)(?: +#+)? *(?:\n+|$)/,
      blockquote: /^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/,
      list: /^( {0,3})(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
      html: '^ {0,3}(?:' // optional indentation
        + '<(script|pre|style)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)' // (1)
        + '|comment[^\\n]*(\\n+|$)' // (2)
        + '|<\\?[\\s\\S]*?\\?>\\n*' // (3)
        + '|<![A-Z][\\s\\S]*?>\\n*' // (4)
        + '|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>\\n*' // (5)
        + '|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:\\n{2,}|$)' // (6)
        + '|<(?!script|pre|style)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) open tag
        + '|</(?!script|pre|style)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:\\n{2,}|$)' // (7) closing tag
        + ')',
      def: /^ {0,3}\[(label)\]: *\n? *<?([^\s>]+)>?(?:(?: +\n? *| *\n *)(title))? *(?:\n+|$)/,
      nptable: noopTest$1,
      table: noopTest$1,
      lheading: /^([^\n]+)\n {0,3}(=+|-+) *(?:\n+|$)/,
      // regex template, placeholders will be replaced according to different paragraph
      // interruption rules of commonmark and the original markdown spec:
      _paragraph: /^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html)[^\n]+)*)/,
      text: /^[^\n]+/
    };

    block._label = /(?!\s*\])(?:\\[\[\]]|[^\[\]])+/;
    block._title = /(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/;
    block.def = edit$1(block.def)
      .replace('label', block._label)
      .replace('title', block._title)
      .getRegex();

    block.bullet = /(?:[*+-]|\d{1,9}\.)/;
    block.item = /^( *)(bull) ?[^\n]*(?:\n(?!\1bull ?)[^\n]*)*/;
    block.item = edit$1(block.item, 'gm')
      .replace(/bull/g, block.bullet)
      .getRegex();

    block.list = edit$1(block.list)
      .replace(/bull/g, block.bullet)
      .replace('hr', '\\n+(?=\\1?(?:(?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$))')
      .replace('def', '\\n+(?=' + block.def.source + ')')
      .getRegex();

    block._tag = 'address|article|aside|base|basefont|blockquote|body|caption'
      + '|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption'
      + '|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe'
      + '|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option'
      + '|p|param|section|source|summary|table|tbody|td|tfoot|th|thead|title|tr'
      + '|track|ul';
    block._comment = /<!--(?!-?>)[\s\S]*?-->/;
    block.html = edit$1(block.html, 'i')
      .replace('comment', block._comment)
      .replace('tag', block._tag)
      .replace('attribute', / +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/)
      .getRegex();

    block.paragraph = edit$1(block._paragraph)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('|lheading', '') // setex headings don't interrupt commonmark paragraphs
      .replace('blockquote', ' {0,3}>')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
      .replace('tag', block._tag) // pars can be interrupted by type (6) html blocks
      .getRegex();

    block.blockquote = edit$1(block.blockquote)
      .replace('paragraph', block.paragraph)
      .getRegex();

    /**
     * Normal Block Grammar
     */

    block.normal = merge$1({}, block);

    /**
     * GFM Block Grammar
     */

    block.gfm = merge$1({}, block.normal, {
      nptable: '^ *([^|\\n ].*\\|.*)\\n' // Header
        + ' *([-:]+ *\\|[-| :]*)' // Align
        + '(?:\\n((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)', // Cells
      table: '^ *\\|(.+)\\n' // Header
        + ' *\\|?( *[-:]+[-| :]*)' // Align
        + '(?:\\n *((?:(?!\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)' // Cells
    });

    block.gfm.nptable = edit$1(block.gfm.nptable)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('blockquote', ' {0,3}>')
      .replace('code', ' {4}[^\\n]')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
      .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
      .getRegex();

    block.gfm.table = edit$1(block.gfm.table)
      .replace('hr', block.hr)
      .replace('heading', ' {0,3}#{1,6} ')
      .replace('blockquote', ' {0,3}>')
      .replace('code', ' {4}[^\\n]')
      .replace('fences', ' {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n')
      .replace('list', ' {0,3}(?:[*+-]|1[.)]) ') // only lists starting from 1 can interrupt
      .replace('html', '</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|!--)')
      .replace('tag', block._tag) // tables can be interrupted by type (6) html blocks
      .getRegex();

    /**
     * Pedantic grammar (original John Gruber's loose markdown specification)
     */

    block.pedantic = merge$1({}, block.normal, {
      html: edit$1(
        '^ *(?:comment *(?:\\n|\\s*$)'
        + '|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)' // closed tag
        + '|<tag(?:"[^"]*"|\'[^\']*\'|\\s[^\'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))')
        .replace('comment', block._comment)
        .replace(/tag/g, '(?!(?:'
          + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub'
          + '|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)'
          + '\\b)\\w+(?!:|[^\\w\\s@]*@)\\b')
        .getRegex(),
      def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,
      heading: /^ *(#{1,6}) *([^\n]+?) *(?:#+ *)?(?:\n+|$)/,
      fences: noopTest$1, // fences not supported
      paragraph: edit$1(block.normal._paragraph)
        .replace('hr', block.hr)
        .replace('heading', ' *#{1,6} *[^\n]')
        .replace('lheading', block.lheading)
        .replace('blockquote', ' {0,3}>')
        .replace('|fences', '')
        .replace('|list', '')
        .replace('|html', '')
        .getRegex()
    });

    /**
     * Inline-Level Grammar
     */
    const inline = {
      escape: /^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,
      autolink: /^<(scheme:[^\s\x00-\x1f<>]*|email)>/,
      url: noopTest$1,
      tag: '^comment'
        + '|^</[a-zA-Z][\\w:-]*\\s*>' // self-closing tag
        + '|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>' // open tag
        + '|^<\\?[\\s\\S]*?\\?>' // processing instruction, e.g. <?php ?>
        + '|^<![a-zA-Z]+\\s[\\s\\S]*?>' // declaration, e.g. <!DOCTYPE html>
        + '|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>', // CDATA section
      link: /^!?\[(label)\]\(\s*(href)(?:\s+(title))?\s*\)/,
      reflink: /^!?\[(label)\]\[(?!\s*\])((?:\\[\[\]]?|[^\[\]\\])+)\]/,
      nolink: /^!?\[(?!\s*\])((?:\[[^\[\]]*\]|\\[\[\]]|[^\[\]])*)\](?:\[\])?/,
      strong: /^__([^\s_])__(?!_)|^\*\*([^\s*])\*\*(?!\*)|^__([^\s][\s\S]*?[^\s])__(?!_)|^\*\*([^\s][\s\S]*?[^\s])\*\*(?!\*)/,
      em: /^_([^\s_])_(?!_)|^\*([^\s*<\[])\*(?!\*)|^_([^\s<][\s\S]*?[^\s_])_(?!_|[^\spunctuation])|^_([^\s_<][\s\S]*?[^\s])_(?!_|[^\spunctuation])|^\*([^\s<"][\s\S]*?[^\s\*])\*(?!\*|[^\spunctuation])|^\*([^\s*"<\[][\s\S]*?[^\s])\*(?!\*)/,
      code: /^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,
      br: /^( {2,}|\\)\n(?!\s*$)/,
      del: noopTest$1,
      text: /^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*]|\b_|$)|[^ ](?= {2,}\n))|(?= {2,}\n))/
    };

    // list of punctuation marks from common mark spec
    // without ` and ] to workaround Rule 17 (inline code blocks/links)
    inline._punctuation = '!"#$%&\'()*+,\\-./:;<=>?@\\[^_{|}~';
    inline.em = edit$1(inline.em).replace(/punctuation/g, inline._punctuation).getRegex();

    inline._escapes = /\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/g;

    inline._scheme = /[a-zA-Z][a-zA-Z0-9+.-]{1,31}/;
    inline._email = /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/;
    inline.autolink = edit$1(inline.autolink)
      .replace('scheme', inline._scheme)
      .replace('email', inline._email)
      .getRegex();

    inline._attribute = /\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/;

    inline.tag = edit$1(inline.tag)
      .replace('comment', block._comment)
      .replace('attribute', inline._attribute)
      .getRegex();

    inline._label = /(?:\[[^\[\]]*\]|\\.|`[^`]*`|[^\[\]\\`])*?/;
    inline._href = /<(?:\\[<>]?|[^\s<>\\])*>|[^\s\x00-\x1f]*/;
    inline._title = /"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/;

    inline.link = edit$1(inline.link)
      .replace('label', inline._label)
      .replace('href', inline._href)
      .replace('title', inline._title)
      .getRegex();

    inline.reflink = edit$1(inline.reflink)
      .replace('label', inline._label)
      .getRegex();

    /**
     * Normal Inline Grammar
     */

    inline.normal = merge$1({}, inline);

    /**
     * Pedantic Inline Grammar
     */

    inline.pedantic = merge$1({}, inline.normal, {
      strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
      em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/,
      link: edit$1(/^!?\[(label)\]\((.*?)\)/)
        .replace('label', inline._label)
        .getRegex(),
      reflink: edit$1(/^!?\[(label)\]\s*\[([^\]]*)\]/)
        .replace('label', inline._label)
        .getRegex()
    });

    /**
     * GFM Inline Grammar
     */

    inline.gfm = merge$1({}, inline.normal, {
      escape: edit$1(inline.escape).replace('])', '~|])').getRegex(),
      _extended_email: /[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/,
      url: /^((?:ftp|https?):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/,
      _backpedal: /(?:[^?!.,:;*_~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_~)]+(?!$))+/,
      del: /^~+(?=\S)([\s\S]*?\S)~+/,
      text: /^(`+|[^`])(?:[\s\S]*?(?:(?=[\\<!\[`*~]|\b_|https?:\/\/|ftp:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))|(?= {2,}\n|[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@))/
    });

    inline.gfm.url = edit$1(inline.gfm.url, 'i')
      .replace('email', inline.gfm._extended_email)
      .getRegex();
    /**
     * GFM + Line Breaks Inline Grammar
     */

    inline.breaks = merge$1({}, inline.gfm, {
      br: edit$1(inline.br).replace('{2,}', '*').getRegex(),
      text: edit$1(inline.gfm.text)
        .replace('\\b_', '\\b_| {2,}\\n')
        .replace(/\{2,\}/g, '*')
        .getRegex()
    });

    var rules = {
      block,
      inline
    };

    const { defaults: defaults$1 } = defaults;
    const { block: block$1 } = rules;
    const {
      rtrim: rtrim$1,
      splitCells: splitCells$1,
      escape: escape$1
    } = helpers;

    /**
     * Block Lexer
     */
    var Lexer_1 = class Lexer {
      constructor(options) {
        this.tokens = [];
        this.tokens.links = Object.create(null);
        this.options = options || defaults$1;
        this.rules = block$1.normal;

        if (this.options.pedantic) {
          this.rules = block$1.pedantic;
        } else if (this.options.gfm) {
          this.rules = block$1.gfm;
        }
      }

      /**
       * Expose Block Rules
       */
      static get rules() {
        return block$1;
      }

      /**
       * Static Lex Method
       */
      static lex(src, options) {
        const lexer = new Lexer(options);
        return lexer.lex(src);
      };

      /**
       * Preprocessing
       */
      lex(src) {
        src = src
          .replace(/\r\n|\r/g, '\n')
          .replace(/\t/g, '    ');

        return this.token(src, true);
      };

      /**
       * Lexing
       */
      token(src, top) {
        src = src.replace(/^ +$/gm, '');
        let next,
          loose,
          cap,
          bull,
          b,
          item,
          listStart,
          listItems,
          t,
          space,
          i,
          tag,
          l,
          isordered,
          istask,
          ischecked;

        while (src) {
          // newline
          if (cap = this.rules.newline.exec(src)) {
            src = src.substring(cap[0].length);
            if (cap[0].length > 1) {
              this.tokens.push({
                type: 'space'
              });
            }
          }

          // code
          if (cap = this.rules.code.exec(src)) {
            const lastToken = this.tokens[this.tokens.length - 1];
            src = src.substring(cap[0].length);
            // An indented code block cannot interrupt a paragraph.
            if (lastToken && lastToken.type === 'paragraph') {
              lastToken.text += '\n' + cap[0].trimRight();
            } else {
              cap = cap[0].replace(/^ {4}/gm, '');
              this.tokens.push({
                type: 'code',
                codeBlockStyle: 'indented',
                text: !this.options.pedantic
                  ? rtrim$1(cap, '\n')
                  : cap
              });
            }
            continue;
          }

          // fences
          if (cap = this.rules.fences.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'code',
              lang: cap[2] ? cap[2].trim() : cap[2],
              text: cap[3] || ''
            });
            continue;
          }

          // heading
          if (cap = this.rules.heading.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'heading',
              depth: cap[1].length,
              text: cap[2]
            });
            continue;
          }

          // table no leading pipe (gfm)
          if (cap = this.rules.nptable.exec(src)) {
            item = {
              type: 'table',
              header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
              align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
              cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
            };

            if (item.header.length === item.align.length) {
              src = src.substring(cap[0].length);

              for (i = 0; i < item.align.length; i++) {
                if (/^ *-+: *$/.test(item.align[i])) {
                  item.align[i] = 'right';
                } else if (/^ *:-+: *$/.test(item.align[i])) {
                  item.align[i] = 'center';
                } else if (/^ *:-+ *$/.test(item.align[i])) {
                  item.align[i] = 'left';
                } else {
                  item.align[i] = null;
                }
              }

              for (i = 0; i < item.cells.length; i++) {
                item.cells[i] = splitCells$1(item.cells[i], item.header.length);
              }

              this.tokens.push(item);

              continue;
            }
          }

          // hr
          if (cap = this.rules.hr.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'hr'
            });
            continue;
          }

          // blockquote
          if (cap = this.rules.blockquote.exec(src)) {
            src = src.substring(cap[0].length);

            this.tokens.push({
              type: 'blockquote_start'
            });

            cap = cap[0].replace(/^ *> ?/gm, '');

            // Pass `top` to keep the current
            // "toplevel" state. This is exactly
            // how markdown.pl works.
            this.token(cap, top);

            this.tokens.push({
              type: 'blockquote_end'
            });

            continue;
          }

          // list
          if (cap = this.rules.list.exec(src)) {
            src = src.substring(cap[0].length);
            bull = cap[2];
            isordered = bull.length > 1;

            listStart = {
              type: 'list_start',
              ordered: isordered,
              start: isordered ? +bull : '',
              loose: false
            };

            this.tokens.push(listStart);

            // Get each top-level item.
            cap = cap[0].match(this.rules.item);

            listItems = [];
            next = false;
            l = cap.length;
            i = 0;

            for (; i < l; i++) {
              item = cap[i];

              // Remove the list item's bullet
              // so it is seen as the next token.
              space = item.length;
              item = item.replace(/^ *([*+-]|\d+\.) */, '');

              // Outdent whatever the
              // list item contains. Hacky.
              if (~item.indexOf('\n ')) {
                space -= item.length;
                item = !this.options.pedantic
                  ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
                  : item.replace(/^ {1,4}/gm, '');
              }

              // Determine whether the next list item belongs here.
              // Backpedal if it does not belong in this list.
              if (i !== l - 1) {
                b = block$1.bullet.exec(cap[i + 1])[0];
                if (bull.length > 1 ? b.length === 1
                  : (b.length > 1 || (this.options.smartLists && b !== bull))) {
                  src = cap.slice(i + 1).join('\n') + src;
                  i = l - 1;
                }
              }

              // Determine whether item is loose or not.
              // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
              // for discount behavior.
              loose = next || /\n\n(?!\s*$)/.test(item);
              if (i !== l - 1) {
                next = item.charAt(item.length - 1) === '\n';
                if (!loose) loose = next;
              }

              if (loose) {
                listStart.loose = true;
              }

              // Check for task list items
              istask = /^\[[ xX]\] /.test(item);
              ischecked = undefined;
              if (istask) {
                ischecked = item[1] !== ' ';
                item = item.replace(/^\[[ xX]\] +/, '');
              }

              t = {
                type: 'list_item_start',
                task: istask,
                checked: ischecked,
                loose: loose
              };

              listItems.push(t);
              this.tokens.push(t);

              // Recurse.
              this.token(item, false);

              this.tokens.push({
                type: 'list_item_end'
              });
            }

            if (listStart.loose) {
              l = listItems.length;
              i = 0;
              for (; i < l; i++) {
                listItems[i].loose = true;
              }
            }

            this.tokens.push({
              type: 'list_end'
            });

            continue;
          }

          // html
          if (cap = this.rules.html.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: this.options.sanitize
                ? 'paragraph'
                : 'html',
              pre: !this.options.sanitizer
                && (cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style'),
              text: this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$1(cap[0])) : cap[0]
            });
            continue;
          }

          // def
          if (top && (cap = this.rules.def.exec(src))) {
            src = src.substring(cap[0].length);
            if (cap[3]) cap[3] = cap[3].substring(1, cap[3].length - 1);
            tag = cap[1].toLowerCase().replace(/\s+/g, ' ');
            if (!this.tokens.links[tag]) {
              this.tokens.links[tag] = {
                href: cap[2],
                title: cap[3]
              };
            }
            continue;
          }

          // table (gfm)
          if (cap = this.rules.table.exec(src)) {
            item = {
              type: 'table',
              header: splitCells$1(cap[1].replace(/^ *| *\| *$/g, '')),
              align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
              cells: cap[3] ? cap[3].replace(/\n$/, '').split('\n') : []
            };

            if (item.header.length === item.align.length) {
              src = src.substring(cap[0].length);

              for (i = 0; i < item.align.length; i++) {
                if (/^ *-+: *$/.test(item.align[i])) {
                  item.align[i] = 'right';
                } else if (/^ *:-+: *$/.test(item.align[i])) {
                  item.align[i] = 'center';
                } else if (/^ *:-+ *$/.test(item.align[i])) {
                  item.align[i] = 'left';
                } else {
                  item.align[i] = null;
                }
              }

              for (i = 0; i < item.cells.length; i++) {
                item.cells[i] = splitCells$1(
                  item.cells[i].replace(/^ *\| *| *\| *$/g, ''),
                  item.header.length);
              }

              this.tokens.push(item);

              continue;
            }
          }

          // lheading
          if (cap = this.rules.lheading.exec(src)) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'heading',
              depth: cap[2].charAt(0) === '=' ? 1 : 2,
              text: cap[1]
            });
            continue;
          }

          // top-level paragraph
          if (top && (cap = this.rules.paragraph.exec(src))) {
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'paragraph',
              text: cap[1].charAt(cap[1].length - 1) === '\n'
                ? cap[1].slice(0, -1)
                : cap[1]
            });
            continue;
          }

          // text
          if (cap = this.rules.text.exec(src)) {
            // Top-level should never reach here.
            src = src.substring(cap[0].length);
            this.tokens.push({
              type: 'text',
              text: cap[0]
            });
            continue;
          }

          if (src) {
            throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
          }
        }

        return this.tokens;
      };
    };

    const { defaults: defaults$2 } = defaults;
    const {
      cleanUrl: cleanUrl$1,
      escape: escape$2
    } = helpers;

    /**
     * Renderer
     */
    var Renderer_1 = class Renderer {
      constructor(options) {
        this.options = options || defaults$2;
      }

      code(code, infostring, escaped) {
        const lang = (infostring || '').match(/\S*/)[0];
        if (this.options.highlight) {
          const out = this.options.highlight(code, lang);
          if (out != null && out !== code) {
            escaped = true;
            code = out;
          }
        }

        if (!lang) {
          return '<pre><code>'
            + (escaped ? code : escape$2(code, true))
            + '</code></pre>';
        }

        return '<pre><code class="'
          + this.options.langPrefix
          + escape$2(lang, true)
          + '">'
          + (escaped ? code : escape$2(code, true))
          + '</code></pre>\n';
      };

      blockquote(quote) {
        return '<blockquote>\n' + quote + '</blockquote>\n';
      };

      html(html) {
        return html;
      };

      heading(text, level, raw, slugger) {
        if (this.options.headerIds) {
          return '<h'
            + level
            + ' id="'
            + this.options.headerPrefix
            + slugger.slug(raw)
            + '">'
            + text
            + '</h'
            + level
            + '>\n';
        }
        // ignore IDs
        return '<h' + level + '>' + text + '</h' + level + '>\n';
      };

      hr() {
        return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
      };

      list(body, ordered, start) {
        const type = ordered ? 'ol' : 'ul',
          startatt = (ordered && start !== 1) ? (' start="' + start + '"') : '';
        return '<' + type + startatt + '>\n' + body + '</' + type + '>\n';
      };

      listitem(text) {
        return '<li>' + text + '</li>\n';
      };

      checkbox(checked) {
        return '<input '
          + (checked ? 'checked="" ' : '')
          + 'disabled="" type="checkbox"'
          + (this.options.xhtml ? ' /' : '')
          + '> ';
      };

      paragraph(text) {
        return '<p>' + text + '</p>\n';
      };

      table(header, body) {
        if (body) body = '<tbody>' + body + '</tbody>';

        return '<table>\n'
          + '<thead>\n'
          + header
          + '</thead>\n'
          + body
          + '</table>\n';
      };

      tablerow(content) {
        return '<tr>\n' + content + '</tr>\n';
      };

      tablecell(content, flags) {
        const type = flags.header ? 'th' : 'td';
        const tag = flags.align
          ? '<' + type + ' align="' + flags.align + '">'
          : '<' + type + '>';
        return tag + content + '</' + type + '>\n';
      };

      // span level renderer
      strong(text) {
        return '<strong>' + text + '</strong>';
      };

      em(text) {
        return '<em>' + text + '</em>';
      };

      codespan(text) {
        return '<code>' + text + '</code>';
      };

      br() {
        return this.options.xhtml ? '<br/>' : '<br>';
      };

      del(text) {
        return '<del>' + text + '</del>';
      };

      link(href, title, text) {
        href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }
        let out = '<a href="' + escape$2(href) + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += '>' + text + '</a>';
        return out;
      };

      image(href, title, text) {
        href = cleanUrl$1(this.options.sanitize, this.options.baseUrl, href);
        if (href === null) {
          return text;
        }

        let out = '<img src="' + href + '" alt="' + text + '"';
        if (title) {
          out += ' title="' + title + '"';
        }
        out += this.options.xhtml ? '/>' : '>';
        return out;
      };

      text(text) {
        return text;
      };
    };

    /**
     * Slugger generates header id
     */
    var Slugger_1 = class Slugger {
      constructor() {
        this.seen = {};
      }

      /**
       * Convert string to unique id
       */
      slug(value) {
        let slug = value
          .toLowerCase()
          .trim()
          // remove html tags
          .replace(/<[!\/a-z].*?>/ig, '')
          // remove unwanted chars
          .replace(/[\u2000-\u206F\u2E00-\u2E7F\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
          .replace(/\s/g, '-');

        if (this.seen.hasOwnProperty(slug)) {
          const originalSlug = slug;
          do {
            this.seen[originalSlug]++;
            slug = originalSlug + '-' + this.seen[originalSlug];
          } while (this.seen.hasOwnProperty(slug));
        }
        this.seen[slug] = 0;

        return slug;
      };
    };

    const { defaults: defaults$3 } = defaults;
    const { inline: inline$1 } = rules;
    const {
      findClosingBracket: findClosingBracket$1,
      escape: escape$3
    } = helpers;

    /**
     * Inline Lexer & Compiler
     */
    var InlineLexer_1 = class InlineLexer {
      constructor(links, options) {
        this.options = options || defaults$3;
        this.links = links;
        this.rules = inline$1.normal;
        this.options.renderer = this.options.renderer || new Renderer_1();
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;

        if (!this.links) {
          throw new Error('Tokens array requires a `links` property.');
        }

        if (this.options.pedantic) {
          this.rules = inline$1.pedantic;
        } else if (this.options.gfm) {
          if (this.options.breaks) {
            this.rules = inline$1.breaks;
          } else {
            this.rules = inline$1.gfm;
          }
        }
      }

      /**
       * Expose Inline Rules
       */
      static get rules() {
        return inline$1;
      }

      /**
       * Static Lexing/Compiling Method
       */
      static output(src, links, options) {
        const inline = new InlineLexer(links, options);
        return inline.output(src);
      }

      /**
       * Lexing/Compiling
       */
      output(src) {
        let out = '',
          link,
          text,
          href,
          title,
          cap,
          prevCapZero;

        while (src) {
          // escape
          if (cap = this.rules.escape.exec(src)) {
            src = src.substring(cap[0].length);
            out += escape$3(cap[1]);
            continue;
          }

          // tag
          if (cap = this.rules.tag.exec(src)) {
            if (!this.inLink && /^<a /i.test(cap[0])) {
              this.inLink = true;
            } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
              this.inLink = false;
            }
            if (!this.inRawBlock && /^<(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
              this.inRawBlock = true;
            } else if (this.inRawBlock && /^<\/(pre|code|kbd|script)(\s|>)/i.test(cap[0])) {
              this.inRawBlock = false;
            }

            src = src.substring(cap[0].length);
            out += this.renderer.html(this.options.sanitize
              ? (this.options.sanitizer
                ? this.options.sanitizer(cap[0])
                : escape$3(cap[0]))
              : cap[0]);
            continue;
          }

          // link
          if (cap = this.rules.link.exec(src)) {
            const lastParenIndex = findClosingBracket$1(cap[2], '()');
            if (lastParenIndex > -1) {
              const start = cap[0].indexOf('!') === 0 ? 5 : 4;
              const linkLen = start + cap[1].length + lastParenIndex;
              cap[2] = cap[2].substring(0, lastParenIndex);
              cap[0] = cap[0].substring(0, linkLen).trim();
              cap[3] = '';
            }
            src = src.substring(cap[0].length);
            this.inLink = true;
            href = cap[2];
            if (this.options.pedantic) {
              link = /^([^'"]*[^\s])\s+(['"])(.*)\2/.exec(href);

              if (link) {
                href = link[1];
                title = link[3];
              } else {
                title = '';
              }
            } else {
              title = cap[3] ? cap[3].slice(1, -1) : '';
            }
            href = href.trim().replace(/^<([\s\S]*)>$/, '$1');
            out += this.outputLink(cap, {
              href: InlineLexer.escapes(href),
              title: InlineLexer.escapes(title)
            });
            this.inLink = false;
            continue;
          }

          // reflink, nolink
          if ((cap = this.rules.reflink.exec(src))
              || (cap = this.rules.nolink.exec(src))) {
            src = src.substring(cap[0].length);
            link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
            link = this.links[link.toLowerCase()];
            if (!link || !link.href) {
              out += cap[0].charAt(0);
              src = cap[0].substring(1) + src;
              continue;
            }
            this.inLink = true;
            out += this.outputLink(cap, link);
            this.inLink = false;
            continue;
          }

          // strong
          if (cap = this.rules.strong.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.strong(this.output(cap[4] || cap[3] || cap[2] || cap[1]));
            continue;
          }

          // em
          if (cap = this.rules.em.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.em(this.output(cap[6] || cap[5] || cap[4] || cap[3] || cap[2] || cap[1]));
            continue;
          }

          // code
          if (cap = this.rules.code.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.codespan(escape$3(cap[2].trim(), true));
            continue;
          }

          // br
          if (cap = this.rules.br.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.br();
            continue;
          }

          // del (gfm)
          if (cap = this.rules.del.exec(src)) {
            src = src.substring(cap[0].length);
            out += this.renderer.del(this.output(cap[1]));
            continue;
          }

          // autolink
          if (cap = this.rules.autolink.exec(src)) {
            src = src.substring(cap[0].length);
            if (cap[2] === '@') {
              text = escape$3(this.mangle(cap[1]));
              href = 'mailto:' + text;
            } else {
              text = escape$3(cap[1]);
              href = text;
            }
            out += this.renderer.link(href, null, text);
            continue;
          }

          // url (gfm)
          if (!this.inLink && (cap = this.rules.url.exec(src))) {
            if (cap[2] === '@') {
              text = escape$3(cap[0]);
              href = 'mailto:' + text;
            } else {
              // do extended autolink path validation
              do {
                prevCapZero = cap[0];
                cap[0] = this.rules._backpedal.exec(cap[0])[0];
              } while (prevCapZero !== cap[0]);
              text = escape$3(cap[0]);
              if (cap[1] === 'www.') {
                href = 'http://' + text;
              } else {
                href = text;
              }
            }
            src = src.substring(cap[0].length);
            out += this.renderer.link(href, null, text);
            continue;
          }

          // text
          if (cap = this.rules.text.exec(src)) {
            src = src.substring(cap[0].length);
            if (this.inRawBlock) {
              out += this.renderer.text(this.options.sanitize ? (this.options.sanitizer ? this.options.sanitizer(cap[0]) : escape$3(cap[0])) : cap[0]);
            } else {
              out += this.renderer.text(escape$3(this.smartypants(cap[0])));
            }
            continue;
          }

          if (src) {
            throw new Error('Infinite loop on byte: ' + src.charCodeAt(0));
          }
        }

        return out;
      }

      static escapes(text) {
        return text ? text.replace(InlineLexer.rules._escapes, '$1') : text;
      }

      /**
       * Compile Link
       */
      outputLink(cap, link) {
        const href = link.href,
          title = link.title ? escape$3(link.title) : null;

        return cap[0].charAt(0) !== '!'
          ? this.renderer.link(href, title, this.output(cap[1]))
          : this.renderer.image(href, title, escape$3(cap[1]));
      }

      /**
       * Smartypants Transformations
       */
      smartypants(text) {
        if (!this.options.smartypants) return text;
        return text
          // em-dashes
          .replace(/---/g, '\u2014')
          // en-dashes
          .replace(/--/g, '\u2013')
          // opening singles
          .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
          // closing singles & apostrophes
          .replace(/'/g, '\u2019')
          // opening doubles
          .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
          // closing doubles
          .replace(/"/g, '\u201d')
          // ellipses
          .replace(/\.{3}/g, '\u2026');
      }

      /**
       * Mangle Links
       */
      mangle(text) {
        if (!this.options.mangle) return text;
        const l = text.length;
        let out = '',
          i = 0,
          ch;

        for (; i < l; i++) {
          ch = text.charCodeAt(i);
          if (Math.random() > 0.5) {
            ch = 'x' + ch.toString(16);
          }
          out += '&#' + ch + ';';
        }

        return out;
      }
    };

    /**
     * TextRenderer
     * returns only the textual part of the token
     */
    var TextRenderer_1 = class TextRenderer {
      // no need for block level renderers
      strong(text) {
        return text;
      }

      em(text) {
        return text;
      }

      codespan(text) {
        return text;
      }

      del(text) {
        return text;
      }

      html(text) {
        return text;
      }

      text(text) {
        return text;
      }

      link(href, title, text) {
        return '' + text;
      }

      image(href, title, text) {
        return '' + text;
      }

      br() {
        return '';
      }
    };

    const { defaults: defaults$4 } = defaults;
    const {
      merge: merge$2,
      unescape: unescape$1
    } = helpers;

    /**
     * Parsing & Compiling
     */
    var Parser_1 = class Parser {
      constructor(options) {
        this.tokens = [];
        this.token = null;
        this.options = options || defaults$4;
        this.options.renderer = this.options.renderer || new Renderer_1();
        this.renderer = this.options.renderer;
        this.renderer.options = this.options;
        this.slugger = new Slugger_1();
      }

      /**
       * Static Parse Method
       */
      static parse(tokens, options) {
        const parser = new Parser(options);
        return parser.parse(tokens);
      };

      /**
       * Parse Loop
       */
      parse(tokens) {
        this.inline = new InlineLexer_1(tokens.links, this.options);
        // use an InlineLexer with a TextRenderer to extract pure text
        this.inlineText = new InlineLexer_1(
          tokens.links,
          merge$2({}, this.options, { renderer: new TextRenderer_1() })
        );
        this.tokens = tokens.reverse();

        let out = '';
        while (this.next()) {
          out += this.tok();
        }

        return out;
      };

      /**
       * Next Token
       */
      next() {
        this.token = this.tokens.pop();
        return this.token;
      };

      /**
       * Preview Next Token
       */
      peek() {
        return this.tokens[this.tokens.length - 1] || 0;
      };

      /**
       * Parse Text Tokens
       */
      parseText() {
        let body = this.token.text;

        while (this.peek().type === 'text') {
          body += '\n' + this.next().text;
        }

        return this.inline.output(body);
      };

      /**
       * Parse Current Token
       */
      tok() {
        let body = '';
        switch (this.token.type) {
          case 'space': {
            return '';
          }
          case 'hr': {
            return this.renderer.hr();
          }
          case 'heading': {
            return this.renderer.heading(
              this.inline.output(this.token.text),
              this.token.depth,
              unescape$1(this.inlineText.output(this.token.text)),
              this.slugger);
          }
          case 'code': {
            return this.renderer.code(this.token.text,
              this.token.lang,
              this.token.escaped);
          }
          case 'table': {
            let header = '',
              i,
              row,
              cell,
              j;

            // header
            cell = '';
            for (i = 0; i < this.token.header.length; i++) {
              cell += this.renderer.tablecell(
                this.inline.output(this.token.header[i]),
                { header: true, align: this.token.align[i] }
              );
            }
            header += this.renderer.tablerow(cell);

            for (i = 0; i < this.token.cells.length; i++) {
              row = this.token.cells[i];

              cell = '';
              for (j = 0; j < row.length; j++) {
                cell += this.renderer.tablecell(
                  this.inline.output(row[j]),
                  { header: false, align: this.token.align[j] }
                );
              }

              body += this.renderer.tablerow(cell);
            }
            return this.renderer.table(header, body);
          }
          case 'blockquote_start': {
            body = '';

            while (this.next().type !== 'blockquote_end') {
              body += this.tok();
            }

            return this.renderer.blockquote(body);
          }
          case 'list_start': {
            body = '';
            const ordered = this.token.ordered,
              start = this.token.start;

            while (this.next().type !== 'list_end') {
              body += this.tok();
            }

            return this.renderer.list(body, ordered, start);
          }
          case 'list_item_start': {
            body = '';
            const loose = this.token.loose;
            const checked = this.token.checked;
            const task = this.token.task;

            if (this.token.task) {
              if (loose) {
                if (this.peek().type === 'text') {
                  const nextToken = this.peek();
                  nextToken.text = this.renderer.checkbox(checked) + ' ' + nextToken.text;
                } else {
                  this.tokens.push({
                    type: 'text',
                    text: this.renderer.checkbox(checked)
                  });
                }
              } else {
                body += this.renderer.checkbox(checked);
              }
            }

            while (this.next().type !== 'list_item_end') {
              body += !loose && this.token.type === 'text'
                ? this.parseText()
                : this.tok();
            }
            return this.renderer.listitem(body, task, checked);
          }
          case 'html': {
            // TODO parse inline content if parameter markdown=1
            return this.renderer.html(this.token.text);
          }
          case 'paragraph': {
            return this.renderer.paragraph(this.inline.output(this.token.text));
          }
          case 'text': {
            return this.renderer.paragraph(this.parseText());
          }
          default: {
            const errMsg = 'Token with "' + this.token.type + '" type was not found.';
            if (this.options.silent) {
              console.log(errMsg);
            } else {
              throw new Error(errMsg);
            }
          }
        }
      };
    };

    const {
      merge: merge$3,
      checkSanitizeDeprecation: checkSanitizeDeprecation$1,
      escape: escape$4
    } = helpers;
    const {
      getDefaults,
      changeDefaults,
      defaults: defaults$5
    } = defaults;

    /**
     * Marked
     */
    function marked(src, opt, callback) {
      // throw error in case of non string input
      if (typeof src === 'undefined' || src === null) {
        throw new Error('marked(): input parameter is undefined or null');
      }
      if (typeof src !== 'string') {
        throw new Error('marked(): input parameter is of type '
          + Object.prototype.toString.call(src) + ', string expected');
      }

      if (callback || typeof opt === 'function') {
        if (!callback) {
          callback = opt;
          opt = null;
        }

        opt = merge$3({}, marked.defaults, opt || {});
        checkSanitizeDeprecation$1(opt);
        const highlight = opt.highlight;
        let tokens,
          pending,
          i = 0;

        try {
          tokens = Lexer_1.lex(src, opt);
        } catch (e) {
          return callback(e);
        }

        pending = tokens.length;

        const done = function(err) {
          if (err) {
            opt.highlight = highlight;
            return callback(err);
          }

          let out;

          try {
            out = Parser_1.parse(tokens, opt);
          } catch (e) {
            err = e;
          }

          opt.highlight = highlight;

          return err
            ? callback(err)
            : callback(null, out);
        };

        if (!highlight || highlight.length < 3) {
          return done();
        }

        delete opt.highlight;

        if (!pending) return done();

        for (; i < tokens.length; i++) {
          (function(token) {
            if (token.type !== 'code') {
              return --pending || done();
            }
            return highlight(token.text, token.lang, function(err, code) {
              if (err) return done(err);
              if (code == null || code === token.text) {
                return --pending || done();
              }
              token.text = code;
              token.escaped = true;
              --pending || done();
            });
          })(tokens[i]);
        }

        return;
      }
      try {
        opt = merge$3({}, marked.defaults, opt || {});
        checkSanitizeDeprecation$1(opt);
        return Parser_1.parse(Lexer_1.lex(src, opt), opt);
      } catch (e) {
        e.message += '\nPlease report this to https://github.com/markedjs/marked.';
        if ((opt || marked.defaults).silent) {
          return '<p>An error occurred:</p><pre>'
            + escape$4(e.message + '', true)
            + '</pre>';
        }
        throw e;
      }
    }

    /**
     * Options
     */

    marked.options =
    marked.setOptions = function(opt) {
      merge$3(marked.defaults, opt);
      changeDefaults(marked.defaults);
      return marked;
    };

    marked.getDefaults = getDefaults;

    marked.defaults = defaults$5;

    /**
     * Expose
     */

    marked.Parser = Parser_1;
    marked.parser = Parser_1.parse;

    marked.Renderer = Renderer_1;
    marked.TextRenderer = TextRenderer_1;

    marked.Lexer = Lexer_1;
    marked.lexer = Lexer_1.lex;

    marked.InlineLexer = InlineLexer_1;
    marked.inlineLexer = InlineLexer_1.output;

    marked.Slugger = Slugger_1;

    marked.parse = marked;

    var marked_1 = marked;

    var purify = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
    	 module.exports = factory() ;
    }(commonjsGlobal, (function () {
    function _toConsumableArray$1(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    var hasOwnProperty = Object.hasOwnProperty;
    var setPrototypeOf = Object.setPrototypeOf;
    var isFrozen = Object.isFrozen;
    var objectKeys = Object.keys;
    var freeze = Object.freeze;
    var seal = Object.seal; // eslint-disable-line import/no-mutable-exports

    var _ref = typeof Reflect !== 'undefined' && Reflect;
    var apply = _ref.apply;
    var construct = _ref.construct;

    if (!apply) {
      apply = function apply(fun, thisValue, args) {
        return fun.apply(thisValue, args);
      };
    }

    if (!freeze) {
      freeze = function freeze(x) {
        return x;
      };
    }

    if (!seal) {
      seal = function seal(x) {
        return x;
      };
    }

    if (!construct) {
      construct = function construct(Func, args) {
        return new (Function.prototype.bind.apply(Func, [null].concat(_toConsumableArray$1(args))))();
      };
    }

    var arrayForEach = unapply(Array.prototype.forEach);
    var arrayIndexOf = unapply(Array.prototype.indexOf);
    var arrayJoin = unapply(Array.prototype.join);
    var arrayPop = unapply(Array.prototype.pop);
    var arrayPush = unapply(Array.prototype.push);
    var arraySlice = unapply(Array.prototype.slice);

    var stringToLowerCase = unapply(String.prototype.toLowerCase);
    var stringMatch = unapply(String.prototype.match);
    var stringReplace = unapply(String.prototype.replace);
    var stringIndexOf = unapply(String.prototype.indexOf);
    var stringTrim = unapply(String.prototype.trim);

    var regExpTest = unapply(RegExp.prototype.test);
    var regExpCreate = unconstruct(RegExp);

    var typeErrorCreate = unconstruct(TypeError);

    function unapply(func) {
      return function (thisArg) {
        for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        return apply(func, thisArg, args);
      };
    }

    function unconstruct(func) {
      return function () {
        for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
          args[_key2] = arguments[_key2];
        }

        return construct(func, args);
      };
    }

    /* Add properties to a lookup table */
    function addToSet(set, array) {
      if (setPrototypeOf) {
        // Make 'in' and truthy checks like Boolean(set.constructor)
        // independent of any properties defined on Object.prototype.
        // Prevent prototype setters from intercepting set as a this value.
        setPrototypeOf(set, null);
      }

      var l = array.length;
      while (l--) {
        var element = array[l];
        if (typeof element === 'string') {
          var lcElement = stringToLowerCase(element);
          if (lcElement !== element) {
            // Config presets (e.g. tags.js, attrs.js) are immutable.
            if (!isFrozen(array)) {
              array[l] = lcElement;
            }

            element = lcElement;
          }
        }

        set[element] = true;
      }

      return set;
    }

    /* Shallow clone an object */
    function clone(object) {
      var newObject = {};

      var property = void 0;
      for (property in object) {
        if (apply(hasOwnProperty, object, [property])) {
          newObject[property] = object[property];
        }
      }

      return newObject;
    }

    var html = freeze(['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'section', 'select', 'shadow', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr']);

    // SVG
    var svg = freeze(['svg', 'a', 'altglyph', 'altglyphdef', 'altglyphitem', 'animatecolor', 'animatemotion', 'animatetransform', 'audio', 'canvas', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'filter', 'font', 'g', 'glyph', 'glyphref', 'hkern', 'image', 'line', 'lineargradient', 'marker', 'mask', 'metadata', 'mpath', 'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'style', 'switch', 'symbol', 'text', 'textpath', 'title', 'tref', 'tspan', 'video', 'view', 'vkern']);

    var svgFilters = freeze(['feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);

    var mathMl = freeze(['math', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover']);

    var text = freeze(['#text']);

    var html$1 = freeze(['accept', 'action', 'align', 'alt', 'autocomplete', 'background', 'bgcolor', 'border', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'clear', 'color', 'cols', 'colspan', 'controls', 'coords', 'crossorigin', 'datetime', 'default', 'dir', 'disabled', 'download', 'enctype', 'face', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'integrity', 'ismap', 'label', 'lang', 'list', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'name', 'noshade', 'novalidate', 'nowrap', 'open', 'optimum', 'pattern', 'placeholder', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'rev', 'reversed', 'role', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'sizes', 'span', 'srclang', 'start', 'src', 'srcset', 'step', 'style', 'summary', 'tabindex', 'title', 'type', 'usemap', 'valign', 'value', 'width', 'xmlns']);

    var svg$1 = freeze(['accent-height', 'accumulate', 'additive', 'alignment-baseline', 'ascent', 'attributename', 'attributetype', 'azimuth', 'basefrequency', 'baseline-shift', 'begin', 'bias', 'by', 'class', 'clip', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cx', 'cy', 'd', 'dx', 'dy', 'diffuseconstant', 'direction', 'display', 'divisor', 'dur', 'edgemode', 'elevation', 'end', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterunits', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'fx', 'fy', 'g1', 'g2', 'glyph-name', 'glyphref', 'gradientunits', 'gradienttransform', 'height', 'href', 'id', 'image-rendering', 'in', 'in2', 'k', 'k1', 'k2', 'k3', 'k4', 'kerning', 'keypoints', 'keysplines', 'keytimes', 'lang', 'lengthadjust', 'letter-spacing', 'kernelmatrix', 'kernelunitlength', 'lighting-color', 'local', 'marker-end', 'marker-mid', 'marker-start', 'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'max', 'mask', 'media', 'method', 'mode', 'min', 'name', 'numoctaves', 'offset', 'operator', 'opacity', 'order', 'orient', 'orientation', 'origin', 'overflow', 'paint-order', 'path', 'pathlength', 'patterncontentunits', 'patterntransform', 'patternunits', 'points', 'preservealpha', 'preserveaspectratio', 'primitiveunits', 'r', 'rx', 'ry', 'radius', 'refx', 'refy', 'repeatcount', 'repeatdur', 'restart', 'result', 'rotate', 'scale', 'seed', 'shape-rendering', 'specularconstant', 'specularexponent', 'spreadmethod', 'stddeviation', 'stitchtiles', 'stop-color', 'stop-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke', 'stroke-width', 'style', 'surfacescale', 'tabindex', 'targetx', 'targety', 'transform', 'text-anchor', 'text-decoration', 'text-rendering', 'textlength', 'type', 'u1', 'u2', 'unicode', 'values', 'viewbox', 'visibility', 'version', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'width', 'word-spacing', 'wrap', 'writing-mode', 'xchannelselector', 'ychannelselector', 'x', 'x1', 'x2', 'xmlns', 'y', 'y1', 'y2', 'z', 'zoomandpan']);

    var mathMl$1 = freeze(['accent', 'accentunder', 'align', 'bevelled', 'close', 'columnsalign', 'columnlines', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'displaystyle', 'encoding', 'fence', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linethickness', 'lspace', 'lquote', 'mathbackground', 'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'movablelimits', 'notation', 'numalign', 'open', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptlevel', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'separators', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xmlns']);

    var xml = freeze(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']);

    var MUSTACHE_EXPR = seal(/\{\{[\s\S]*|[\s\S]*\}\}/gm); // Specify template detection regex for SAFE_FOR_TEMPLATES mode
    var ERB_EXPR = seal(/<%[\s\S]*|[\s\S]*%>/gm);
    var DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]/); // eslint-disable-line no-useless-escape
    var ARIA_ATTR = seal(/^aria-[\-\w]+$/); // eslint-disable-line no-useless-escape
    var IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i // eslint-disable-line no-useless-escape
    );
    var IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
    var ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205f\u3000]/g // eslint-disable-line no-control-regex
    );

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

    function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

    var getGlobal = function getGlobal() {
      return typeof window === 'undefined' ? null : window;
    };

    /**
     * Creates a no-op policy for internal use only.
     * Don't export this function outside this module!
     * @param {?TrustedTypePolicyFactory} trustedTypes The policy factory.
     * @param {Document} document The document object (to determine policy name suffix)
     * @return {?TrustedTypePolicy} The policy created (or null, if Trusted Types
     * are not supported).
     */
    var _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, document) {
      if ((typeof trustedTypes === 'undefined' ? 'undefined' : _typeof(trustedTypes)) !== 'object' || typeof trustedTypes.createPolicy !== 'function') {
        return null;
      }

      // Allow the callers to control the unique policy name
      // by adding a data-tt-policy-suffix to the script element with the DOMPurify.
      // Policy creation with duplicate names throws in Trusted Types.
      var suffix = null;
      var ATTR_NAME = 'data-tt-policy-suffix';
      if (document.currentScript && document.currentScript.hasAttribute(ATTR_NAME)) {
        suffix = document.currentScript.getAttribute(ATTR_NAME);
      }

      var policyName = 'dompurify' + (suffix ? '#' + suffix : '');

      try {
        return trustedTypes.createPolicy(policyName, {
          createHTML: function createHTML(html$$1) {
            return html$$1;
          }
        });
      } catch (error) {
        // Policy creation failed (most likely another DOMPurify script has
        // already run). Skip creating the policy, as this will only cause errors
        // if TT are enforced.
        console.warn('TrustedTypes policy ' + policyName + ' could not be created.');
        return null;
      }
    };

    function createDOMPurify() {
      var window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();

      var DOMPurify = function DOMPurify(root) {
        return createDOMPurify(root);
      };

      /**
       * Version label, exposed for easier checks
       * if DOMPurify is up to date or not
       */
      DOMPurify.version = '2.0.8';

      /**
       * Array of elements that DOMPurify removed during sanitation.
       * Empty if nothing was removed.
       */
      DOMPurify.removed = [];

      if (!window || !window.document || window.document.nodeType !== 9) {
        // Not running in a browser, provide a factory function
        // so that you can pass your own Window
        DOMPurify.isSupported = false;

        return DOMPurify;
      }

      var originalDocument = window.document;
      var useDOMParser = false;
      var removeTitle = false;

      var document = window.document;
      var DocumentFragment = window.DocumentFragment,
          HTMLTemplateElement = window.HTMLTemplateElement,
          Node = window.Node,
          NodeFilter = window.NodeFilter,
          _window$NamedNodeMap = window.NamedNodeMap,
          NamedNodeMap = _window$NamedNodeMap === undefined ? window.NamedNodeMap || window.MozNamedAttrMap : _window$NamedNodeMap,
          Text = window.Text,
          Comment = window.Comment,
          DOMParser = window.DOMParser,
          trustedTypes = window.trustedTypes;

      // As per issue #47, the web-components registry is inherited by a
      // new document created via createHTMLDocument. As per the spec
      // (http://w3c.github.io/webcomponents/spec/custom/#creating-and-passing-registries)
      // a new empty registry is used when creating a template contents owner
      // document, so we use that as our parent document to ensure nothing
      // is inherited.

      if (typeof HTMLTemplateElement === 'function') {
        var template = document.createElement('template');
        if (template.content && template.content.ownerDocument) {
          document = template.content.ownerDocument;
        }
      }

      var trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, originalDocument);
      var emptyHTML = trustedTypesPolicy ? trustedTypesPolicy.createHTML('') : '';

      var _document = document,
          implementation = _document.implementation,
          createNodeIterator = _document.createNodeIterator,
          getElementsByTagName = _document.getElementsByTagName,
          createDocumentFragment = _document.createDocumentFragment;
      var importNode = originalDocument.importNode;


      var hooks = {};

      /**
       * Expose whether this browser supports running the full DOMPurify.
       */
      DOMPurify.isSupported = implementation && typeof implementation.createHTMLDocument !== 'undefined' && document.documentMode !== 9;

      var MUSTACHE_EXPR$$1 = MUSTACHE_EXPR,
          ERB_EXPR$$1 = ERB_EXPR,
          DATA_ATTR$$1 = DATA_ATTR,
          ARIA_ATTR$$1 = ARIA_ATTR,
          IS_SCRIPT_OR_DATA$$1 = IS_SCRIPT_OR_DATA,
          ATTR_WHITESPACE$$1 = ATTR_WHITESPACE;
      var IS_ALLOWED_URI$$1 = IS_ALLOWED_URI;

      /**
       * We consider the elements and attributes below to be safe. Ideally
       * don't add any new ones but feel free to remove unwanted ones.
       */

      /* allowed element names */

      var ALLOWED_TAGS = null;
      var DEFAULT_ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray(html), _toConsumableArray(svg), _toConsumableArray(svgFilters), _toConsumableArray(mathMl), _toConsumableArray(text)));

      /* Allowed attribute names */
      var ALLOWED_ATTR = null;
      var DEFAULT_ALLOWED_ATTR = addToSet({}, [].concat(_toConsumableArray(html$1), _toConsumableArray(svg$1), _toConsumableArray(mathMl$1), _toConsumableArray(xml)));

      /* Explicitly forbidden tags (overrides ALLOWED_TAGS/ADD_TAGS) */
      var FORBID_TAGS = null;

      /* Explicitly forbidden attributes (overrides ALLOWED_ATTR/ADD_ATTR) */
      var FORBID_ATTR = null;

      /* Decide if ARIA attributes are okay */
      var ALLOW_ARIA_ATTR = true;

      /* Decide if custom data attributes are okay */
      var ALLOW_DATA_ATTR = true;

      /* Decide if unknown protocols are okay */
      var ALLOW_UNKNOWN_PROTOCOLS = false;

      /* Output should be safe for jQuery's $() factory? */
      var SAFE_FOR_JQUERY = false;

      /* Output should be safe for common template engines.
       * This means, DOMPurify removes data attributes, mustaches and ERB
       */
      var SAFE_FOR_TEMPLATES = false;

      /* Decide if document with <html>... should be returned */
      var WHOLE_DOCUMENT = false;

      /* Track whether config is already set on this instance of DOMPurify. */
      var SET_CONFIG = false;

      /* Decide if all elements (e.g. style, script) must be children of
       * document.body. By default, browsers might move them to document.head */
      var FORCE_BODY = false;

      /* Decide if a DOM `HTMLBodyElement` should be returned, instead of a html
       * string (or a TrustedHTML object if Trusted Types are supported).
       * If `WHOLE_DOCUMENT` is enabled a `HTMLHtmlElement` will be returned instead
       */
      var RETURN_DOM = false;

      /* Decide if a DOM `DocumentFragment` should be returned, instead of a html
       * string  (or a TrustedHTML object if Trusted Types are supported) */
      var RETURN_DOM_FRAGMENT = false;

      /* If `RETURN_DOM` or `RETURN_DOM_FRAGMENT` is enabled, decide if the returned DOM
       * `Node` is imported into the current `Document`. If this flag is not enabled the
       * `Node` will belong (its ownerDocument) to a fresh `HTMLDocument`, created by
       * DOMPurify. */
      var RETURN_DOM_IMPORT = false;

      /* Try to return a Trusted Type object instead of a string, retrun a string in
       * case Trusted Types are not supported  */
      var RETURN_TRUSTED_TYPE = false;

      /* Output should be free from DOM clobbering attacks? */
      var SANITIZE_DOM = true;

      /* Keep element content when removing element? */
      var KEEP_CONTENT = true;

      /* If a `Node` is passed to sanitize(), then performs sanitization in-place instead
       * of importing it into a new Document and returning a sanitized copy */
      var IN_PLACE = false;

      /* Allow usage of profiles like html, svg and mathMl */
      var USE_PROFILES = {};

      /* Tags to ignore content of when KEEP_CONTENT is true */
      var FORBID_CONTENTS = addToSet({}, ['annotation-xml', 'audio', 'colgroup', 'desc', 'foreignobject', 'head', 'iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'noembed', 'noframes', 'plaintext', 'script', 'style', 'svg', 'template', 'thead', 'title', 'video', 'xmp']);

      /* Tags that are safe for data: URIs */
      var DATA_URI_TAGS = addToSet({}, ['audio', 'video', 'img', 'source', 'image']);

      /* Attributes safe for values like "javascript:" */
      var URI_SAFE_ATTRIBUTES = null;
      var DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ['alt', 'class', 'for', 'id', 'label', 'name', 'pattern', 'placeholder', 'summary', 'title', 'value', 'style', 'xmlns']);

      /* Keep a reference to config to pass to hooks */
      var CONFIG = null;

      /* Ideally, do not touch anything below this line */
      /* ______________________________________________ */

      var formElement = document.createElement('form');

      /**
       * _parseConfig
       *
       * @param  {Object} cfg optional config literal
       */
      // eslint-disable-next-line complexity
      var _parseConfig = function _parseConfig(cfg) {
        if (CONFIG && CONFIG === cfg) {
          return;
        }

        /* Shield configuration object from tampering */
        if (!cfg || (typeof cfg === 'undefined' ? 'undefined' : _typeof(cfg)) !== 'object') {
          cfg = {};
        }

        /* Set configuration parameters */
        ALLOWED_TAGS = 'ALLOWED_TAGS' in cfg ? addToSet({}, cfg.ALLOWED_TAGS) : DEFAULT_ALLOWED_TAGS;
        ALLOWED_ATTR = 'ALLOWED_ATTR' in cfg ? addToSet({}, cfg.ALLOWED_ATTR) : DEFAULT_ALLOWED_ATTR;
        URI_SAFE_ATTRIBUTES = 'ADD_URI_SAFE_ATTR' in cfg ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR) : DEFAULT_URI_SAFE_ATTRIBUTES;
        FORBID_TAGS = 'FORBID_TAGS' in cfg ? addToSet({}, cfg.FORBID_TAGS) : {};
        FORBID_ATTR = 'FORBID_ATTR' in cfg ? addToSet({}, cfg.FORBID_ATTR) : {};
        USE_PROFILES = 'USE_PROFILES' in cfg ? cfg.USE_PROFILES : false;
        ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false; // Default true
        ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false; // Default true
        ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false; // Default false
        SAFE_FOR_JQUERY = cfg.SAFE_FOR_JQUERY || false; // Default false
        SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false; // Default false
        WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false; // Default false
        RETURN_DOM = cfg.RETURN_DOM || false; // Default false
        RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false; // Default false
        RETURN_DOM_IMPORT = cfg.RETURN_DOM_IMPORT || false; // Default false
        RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false; // Default false
        FORCE_BODY = cfg.FORCE_BODY || false; // Default false
        SANITIZE_DOM = cfg.SANITIZE_DOM !== false; // Default true
        KEEP_CONTENT = cfg.KEEP_CONTENT !== false; // Default true
        IN_PLACE = cfg.IN_PLACE || false; // Default false
        IS_ALLOWED_URI$$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI$$1;
        if (SAFE_FOR_TEMPLATES) {
          ALLOW_DATA_ATTR = false;
        }

        if (RETURN_DOM_FRAGMENT) {
          RETURN_DOM = true;
        }

        /* Parse profile info */
        if (USE_PROFILES) {
          ALLOWED_TAGS = addToSet({}, [].concat(_toConsumableArray(text)));
          ALLOWED_ATTR = [];
          if (USE_PROFILES.html === true) {
            addToSet(ALLOWED_TAGS, html);
            addToSet(ALLOWED_ATTR, html$1);
          }

          if (USE_PROFILES.svg === true) {
            addToSet(ALLOWED_TAGS, svg);
            addToSet(ALLOWED_ATTR, svg$1);
            addToSet(ALLOWED_ATTR, xml);
          }

          if (USE_PROFILES.svgFilters === true) {
            addToSet(ALLOWED_TAGS, svgFilters);
            addToSet(ALLOWED_ATTR, svg$1);
            addToSet(ALLOWED_ATTR, xml);
          }

          if (USE_PROFILES.mathMl === true) {
            addToSet(ALLOWED_TAGS, mathMl);
            addToSet(ALLOWED_ATTR, mathMl$1);
            addToSet(ALLOWED_ATTR, xml);
          }
        }

        /* Merge configuration parameters */
        if (cfg.ADD_TAGS) {
          if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
            ALLOWED_TAGS = clone(ALLOWED_TAGS);
          }

          addToSet(ALLOWED_TAGS, cfg.ADD_TAGS);
        }

        if (cfg.ADD_ATTR) {
          if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
            ALLOWED_ATTR = clone(ALLOWED_ATTR);
          }

          addToSet(ALLOWED_ATTR, cfg.ADD_ATTR);
        }

        if (cfg.ADD_URI_SAFE_ATTR) {
          addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR);
        }

        /* Add #text in case KEEP_CONTENT is set to true */
        if (KEEP_CONTENT) {
          ALLOWED_TAGS['#text'] = true;
        }

        /* Add html, head and body to ALLOWED_TAGS in case WHOLE_DOCUMENT is true */
        if (WHOLE_DOCUMENT) {
          addToSet(ALLOWED_TAGS, ['html', 'head', 'body']);
        }

        /* Add tbody to ALLOWED_TAGS in case tables are permitted, see #286, #365 */
        if (ALLOWED_TAGS.table) {
          addToSet(ALLOWED_TAGS, ['tbody']);
          delete FORBID_TAGS.tbody;
        }

        // Prevent further manipulation of configuration.
        // Not available in IE8, Safari 5, etc.
        if (freeze) {
          freeze(cfg);
        }

        CONFIG = cfg;
      };

      /**
       * _forceRemove
       *
       * @param  {Node} node a DOM node
       */
      var _forceRemove = function _forceRemove(node) {
        arrayPush(DOMPurify.removed, { element: node });
        try {
          node.parentNode.removeChild(node);
        } catch (error) {
          node.outerHTML = emptyHTML;
        }
      };

      /**
       * _removeAttribute
       *
       * @param  {String} name an Attribute name
       * @param  {Node} node a DOM node
       */
      var _removeAttribute = function _removeAttribute(name, node) {
        try {
          arrayPush(DOMPurify.removed, {
            attribute: node.getAttributeNode(name),
            from: node
          });
        } catch (error) {
          arrayPush(DOMPurify.removed, {
            attribute: null,
            from: node
          });
        }

        node.removeAttribute(name);
      };

      /**
       * _initDocument
       *
       * @param  {String} dirty a string of dirty markup
       * @return {Document} a DOM, filled with the dirty markup
       */
      var _initDocument = function _initDocument(dirty) {
        /* Create a HTML document */
        var doc = void 0;
        var leadingWhitespace = void 0;

        if (FORCE_BODY) {
          dirty = '<remove></remove>' + dirty;
        } else {
          /* If FORCE_BODY isn't used, leading whitespace needs to be preserved manually */
          var matches = stringMatch(dirty, /^[\s]+/);
          leadingWhitespace = matches && matches[0];
        }

        var dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
        /* Use DOMParser to workaround Firefox bug (see comment below) */
        if (useDOMParser) {
          try {
            doc = new DOMParser().parseFromString(dirtyPayload, 'text/html');
          } catch (error) {}
        }

        /* Remove title to fix a mXSS bug in older MS Edge */
        if (removeTitle) {
          addToSet(FORBID_TAGS, ['title']);
        }

        /* Otherwise use createHTMLDocument, because DOMParser is unsafe in
        Safari (see comment below) */
        if (!doc || !doc.documentElement) {
          doc = implementation.createHTMLDocument('');
          var _doc = doc,
              body = _doc.body;

          body.parentNode.removeChild(body.parentNode.firstElementChild);
          body.outerHTML = dirtyPayload;
        }

        if (dirty && leadingWhitespace) {
          doc.body.insertBefore(document.createTextNode(leadingWhitespace), doc.body.childNodes[0] || null);
        }

        /* Work on whole document or just its body */
        return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? 'html' : 'body')[0];
      };

      // Firefox uses a different parser for innerHTML rather than
      // DOMParser (see https://bugzilla.mozilla.org/show_bug.cgi?id=1205631)
      // which means that you *must* use DOMParser, otherwise the output may
      // not be safe if used in a document.write context later.
      //
      // So we feature detect the Firefox bug and use the DOMParser if necessary.
      //
      // Chrome 77 and other versions ship an mXSS bug that caused a bypass to
      // happen. We now check for the mXSS trigger and react accordingly.
      if (DOMPurify.isSupported) {
        (function () {
          try {
            var doc = _initDocument('<svg><p><textarea><img src="</textarea><img src=x abc=1//">');
            if (doc.querySelector('svg img')) {
              useDOMParser = true;
            }
          } catch (error) {}
        })();

        (function () {
          try {
            var doc = _initDocument('<x/><title>&lt;/title&gt;&lt;img&gt;');
            if (regExpTest(/<\/title/, doc.querySelector('title').innerHTML)) {
              removeTitle = true;
            }
          } catch (error) {}
        })();
      }

      /**
       * _createIterator
       *
       * @param  {Document} root document/fragment to create iterator for
       * @return {Iterator} iterator instance
       */
      var _createIterator = function _createIterator(root) {
        return createNodeIterator.call(root.ownerDocument || root, root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT, function () {
          return NodeFilter.FILTER_ACCEPT;
        }, false);
      };

      /**
       * _isClobbered
       *
       * @param  {Node} elm element to check for clobbering attacks
       * @return {Boolean} true if clobbered, false if safe
       */
      var _isClobbered = function _isClobbered(elm) {
        if (elm instanceof Text || elm instanceof Comment) {
          return false;
        }

        if (typeof elm.nodeName !== 'string' || typeof elm.textContent !== 'string' || typeof elm.removeChild !== 'function' || !(elm.attributes instanceof NamedNodeMap) || typeof elm.removeAttribute !== 'function' || typeof elm.setAttribute !== 'function' || typeof elm.namespaceURI !== 'string') {
          return true;
        }

        return false;
      };

      /**
       * _isNode
       *
       * @param  {Node} obj object to check whether it's a DOM node
       * @return {Boolean} true is object is a DOM node
       */
      var _isNode = function _isNode(obj) {
        return (typeof Node === 'undefined' ? 'undefined' : _typeof(Node)) === 'object' ? obj instanceof Node : obj && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object' && typeof obj.nodeType === 'number' && typeof obj.nodeName === 'string';
      };

      /**
       * _executeHook
       * Execute user configurable hooks
       *
       * @param  {String} entryPoint  Name of the hook's entry point
       * @param  {Node} currentNode node to work on with the hook
       * @param  {Object} data additional hook parameters
       */
      var _executeHook = function _executeHook(entryPoint, currentNode, data) {
        if (!hooks[entryPoint]) {
          return;
        }

        arrayForEach(hooks[entryPoint], function (hook) {
          hook.call(DOMPurify, currentNode, data, CONFIG);
        });
      };

      /**
       * _sanitizeElements
       *
       * @protect nodeName
       * @protect textContent
       * @protect removeChild
       *
       * @param   {Node} currentNode to check for permission to exist
       * @return  {Boolean} true if node was killed, false if left alive
       */
      // eslint-disable-next-line complexity
      var _sanitizeElements = function _sanitizeElements(currentNode) {
        var content = void 0;

        /* Execute a hook if present */
        _executeHook('beforeSanitizeElements', currentNode, null);

        /* Check if element is clobbered or can clobber */
        if (_isClobbered(currentNode)) {
          _forceRemove(currentNode);
          return true;
        }

        /* Now let's check the element's type and name */
        var tagName = stringToLowerCase(currentNode.nodeName);

        /* Execute a hook if present */
        _executeHook('uponSanitizeElement', currentNode, {
          tagName: tagName,
          allowedTags: ALLOWED_TAGS
        });

        /* Take care of an mXSS pattern using p, br inside svg, math */
        if ((tagName === 'svg' || tagName === 'math') && currentNode.querySelectorAll('p, br').length !== 0) {
          _forceRemove(currentNode);
          return true;
        }

        /* Remove element if anything forbids its presence */
        if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
          /* Keep content except for black-listed elements */
          if (KEEP_CONTENT && !FORBID_CONTENTS[tagName] && typeof currentNode.insertAdjacentHTML === 'function') {
            try {
              var htmlToInsert = currentNode.innerHTML;
              currentNode.insertAdjacentHTML('AfterEnd', trustedTypesPolicy ? trustedTypesPolicy.createHTML(htmlToInsert) : htmlToInsert);
            } catch (error) {}
          }

          _forceRemove(currentNode);
          return true;
        }

        /* Remove in case a noscript/noembed XSS is suspected */
        if (tagName === 'noscript' && regExpTest(/<\/noscript/i, currentNode.innerHTML)) {
          _forceRemove(currentNode);
          return true;
        }

        if (tagName === 'noembed' && regExpTest(/<\/noembed/i, currentNode.innerHTML)) {
          _forceRemove(currentNode);
          return true;
        }

        /* Convert markup to cover jQuery behavior */
        if (SAFE_FOR_JQUERY && !currentNode.firstElementChild && (!currentNode.content || !currentNode.content.firstElementChild) && regExpTest(/</g, currentNode.textContent)) {
          arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
          if (currentNode.innerHTML) {
            currentNode.innerHTML = stringReplace(currentNode.innerHTML, /</g, '&lt;');
          } else {
            currentNode.innerHTML = stringReplace(currentNode.textContent, /</g, '&lt;');
          }
        }

        /* Sanitize element content to be template-safe */
        if (SAFE_FOR_TEMPLATES && currentNode.nodeType === 3) {
          /* Get the element's text content */
          content = currentNode.textContent;
          content = stringReplace(content, MUSTACHE_EXPR$$1, ' ');
          content = stringReplace(content, ERB_EXPR$$1, ' ');
          if (currentNode.textContent !== content) {
            arrayPush(DOMPurify.removed, { element: currentNode.cloneNode() });
            currentNode.textContent = content;
          }
        }

        /* Execute a hook if present */
        _executeHook('afterSanitizeElements', currentNode, null);

        return false;
      };

      /**
       * _isValidAttribute
       *
       * @param  {string} lcTag Lowercase tag name of containing element.
       * @param  {string} lcName Lowercase attribute name.
       * @param  {string} value Attribute value.
       * @return {Boolean} Returns true if `value` is valid, otherwise false.
       */
      // eslint-disable-next-line complexity
      var _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
        /* Make sure attribute cannot clobber */
        if (SANITIZE_DOM && (lcName === 'id' || lcName === 'name') && (value in document || value in formElement)) {
          return false;
        }

        /* Allow valid data-* attributes: At least one character after "-"
            (https://html.spec.whatwg.org/multipage/dom.html#embedding-custom-non-visible-data-with-the-data-*-attributes)
            XML-compatible (https://html.spec.whatwg.org/multipage/infrastructure.html#xml-compatible and http://www.w3.org/TR/xml/#d0e804)
            We don't need to check the value; it's always URI safe. */
        if (ALLOW_DATA_ATTR && regExpTest(DATA_ATTR$$1, lcName)) ; else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR$$1, lcName)) ; else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
          return false;

          /* Check value is safe. First, is attr inert? If so, is safe */
        } else if (URI_SAFE_ATTRIBUTES[lcName]) ; else if (regExpTest(IS_ALLOWED_URI$$1, stringReplace(value, ATTR_WHITESPACE$$1, ''))) ; else if ((lcName === 'src' || lcName === 'xlink:href' || lcName === 'href') && lcTag !== 'script' && stringIndexOf(value, 'data:') === 0 && DATA_URI_TAGS[lcTag]) ; else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA$$1, stringReplace(value, ATTR_WHITESPACE$$1, ''))) ; else if (!value) ; else {
          return false;
        }

        return true;
      };

      /**
       * _sanitizeAttributes
       *
       * @protect attributes
       * @protect nodeName
       * @protect removeAttribute
       * @protect setAttribute
       *
       * @param  {Node} currentNode to sanitize
       */
      // eslint-disable-next-line complexity
      var _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
        var attr = void 0;
        var value = void 0;
        var lcName = void 0;
        var idAttr = void 0;
        var l = void 0;
        /* Execute a hook if present */
        _executeHook('beforeSanitizeAttributes', currentNode, null);

        var attributes = currentNode.attributes;

        /* Check if we have attributes; if not we might have a text node */

        if (!attributes) {
          return;
        }

        var hookEvent = {
          attrName: '',
          attrValue: '',
          keepAttr: true,
          allowedAttributes: ALLOWED_ATTR
        };
        l = attributes.length;

        /* Go backwards over all attributes; safely remove bad ones */
        while (l--) {
          attr = attributes[l];
          var _attr = attr,
              name = _attr.name,
              namespaceURI = _attr.namespaceURI;

          value = stringTrim(attr.value);
          lcName = stringToLowerCase(name);

          /* Execute a hook if present */
          hookEvent.attrName = lcName;
          hookEvent.attrValue = value;
          hookEvent.keepAttr = true;
          hookEvent.forceKeepAttr = undefined; // Allows developers to see this is a property they can set
          _executeHook('uponSanitizeAttribute', currentNode, hookEvent);
          value = hookEvent.attrValue;
          /* Did the hooks approve of the attribute? */
          if (hookEvent.forceKeepAttr) {
            continue;
          }

          /* Remove attribute */
          // Safari (iOS + Mac), last tested v8.0.5, crashes if you try to
          // remove a "name" attribute from an <img> tag that has an "id"
          // attribute at the time.
          if (lcName === 'name' && currentNode.nodeName === 'IMG' && attributes.id) {
            idAttr = attributes.id;
            attributes = arraySlice(attributes, []);
            _removeAttribute('id', currentNode);
            _removeAttribute(name, currentNode);
            if (arrayIndexOf(attributes, idAttr) > l) {
              currentNode.setAttribute('id', idAttr.value);
            }
          } else if (
          // This works around a bug in Safari, where input[type=file]
          // cannot be dynamically set after type has been removed
          currentNode.nodeName === 'INPUT' && lcName === 'type' && value === 'file' && hookEvent.keepAttr && (ALLOWED_ATTR[lcName] || !FORBID_ATTR[lcName])) {
            continue;
          } else {
            // This avoids a crash in Safari v9.0 with double-ids.
            // The trick is to first set the id to be empty and then to
            // remove the attribute
            if (name === 'id') {
              currentNode.setAttribute(name, '');
            }

            _removeAttribute(name, currentNode);
          }

          /* Did the hooks approve of the attribute? */
          if (!hookEvent.keepAttr) {
            continue;
          }

          /* Work around a security issue in jQuery 3.0 */
          if (SAFE_FOR_JQUERY && regExpTest(/\/>/i, value)) {
            _removeAttribute(name, currentNode);
            continue;
          }

          /* Take care of an mXSS pattern using namespace switches */
          if (regExpTest(/svg|math/i, currentNode.namespaceURI) && regExpTest(regExpCreate('</(' + arrayJoin(objectKeys(FORBID_CONTENTS), '|') + ')', 'i'), value)) {
            _removeAttribute(name, currentNode);
            continue;
          }

          /* Sanitize attribute content to be template-safe */
          if (SAFE_FOR_TEMPLATES) {
            value = stringReplace(value, MUSTACHE_EXPR$$1, ' ');
            value = stringReplace(value, ERB_EXPR$$1, ' ');
          }

          /* Is `value` valid for this attribute? */
          var lcTag = currentNode.nodeName.toLowerCase();
          if (!_isValidAttribute(lcTag, lcName, value)) {
            continue;
          }

          /* Handle invalid data-* attribute set by try-catching it */
          try {
            if (namespaceURI) {
              currentNode.setAttributeNS(namespaceURI, name, value);
            } else {
              /* Fallback to setAttribute() for browser-unrecognized namespaces e.g. "x-schema". */
              currentNode.setAttribute(name, value);
            }

            arrayPop(DOMPurify.removed);
          } catch (error) {}
        }

        /* Execute a hook if present */
        _executeHook('afterSanitizeAttributes', currentNode, null);
      };

      /**
       * _sanitizeShadowDOM
       *
       * @param  {DocumentFragment} fragment to iterate over recursively
       */
      var _sanitizeShadowDOM = function _sanitizeShadowDOM(fragment) {
        var shadowNode = void 0;
        var shadowIterator = _createIterator(fragment);

        /* Execute a hook if present */
        _executeHook('beforeSanitizeShadowDOM', fragment, null);

        while (shadowNode = shadowIterator.nextNode()) {
          /* Execute a hook if present */
          _executeHook('uponSanitizeShadowNode', shadowNode, null);

          /* Sanitize tags and elements */
          if (_sanitizeElements(shadowNode)) {
            continue;
          }

          /* Deep shadow DOM detected */
          if (shadowNode.content instanceof DocumentFragment) {
            _sanitizeShadowDOM(shadowNode.content);
          }

          /* Check attributes, sanitize if necessary */
          _sanitizeAttributes(shadowNode);
        }

        /* Execute a hook if present */
        _executeHook('afterSanitizeShadowDOM', fragment, null);
      };

      /**
       * Sanitize
       * Public method providing core sanitation functionality
       *
       * @param {String|Node} dirty string or DOM node
       * @param {Object} configuration object
       */
      // eslint-disable-next-line complexity
      DOMPurify.sanitize = function (dirty, cfg) {
        var body = void 0;
        var importedNode = void 0;
        var currentNode = void 0;
        var oldNode = void 0;
        var returnNode = void 0;
        /* Make sure we have a string to sanitize.
          DO NOT return early, as this will return the wrong type if
          the user has requested a DOM object rather than a string */
        if (!dirty) {
          dirty = '<!-->';
        }

        /* Stringify, in case dirty is an object */
        if (typeof dirty !== 'string' && !_isNode(dirty)) {
          // eslint-disable-next-line no-negated-condition
          if (typeof dirty.toString !== 'function') {
            throw typeErrorCreate('toString is not a function');
          } else {
            dirty = dirty.toString();
            if (typeof dirty !== 'string') {
              throw typeErrorCreate('dirty is not a string, aborting');
            }
          }
        }

        /* Check we can run. Otherwise fall back or ignore */
        if (!DOMPurify.isSupported) {
          if (_typeof(window.toStaticHTML) === 'object' || typeof window.toStaticHTML === 'function') {
            if (typeof dirty === 'string') {
              return window.toStaticHTML(dirty);
            }

            if (_isNode(dirty)) {
              return window.toStaticHTML(dirty.outerHTML);
            }
          }

          return dirty;
        }

        /* Assign config vars */
        if (!SET_CONFIG) {
          _parseConfig(cfg);
        }

        /* Clean up removed elements */
        DOMPurify.removed = [];

        /* Check if dirty is correctly typed for IN_PLACE */
        if (typeof dirty === 'string') {
          IN_PLACE = false;
        }

        if (IN_PLACE) ; else if (dirty instanceof Node) {
          /* If dirty is a DOM element, append to an empty document to avoid
             elements being stripped by the parser */
          body = _initDocument('<!-->');
          importedNode = body.ownerDocument.importNode(dirty, true);
          if (importedNode.nodeType === 1 && importedNode.nodeName === 'BODY') {
            /* Node is already a body, use as is */
            body = importedNode;
          } else if (importedNode.nodeName === 'HTML') {
            body = importedNode;
          } else {
            // eslint-disable-next-line unicorn/prefer-node-append
            body.appendChild(importedNode);
          }
        } else {
          /* Exit directly if we have nothing to do */
          if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT && RETURN_TRUSTED_TYPE && dirty.indexOf('<') === -1) {
            return trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
          }

          /* Initialize the document to work on */
          body = _initDocument(dirty);

          /* Check we have a DOM node from the data */
          if (!body) {
            return RETURN_DOM ? null : emptyHTML;
          }
        }

        /* Remove first element node (ours) if FORCE_BODY is set */
        if (body && FORCE_BODY) {
          _forceRemove(body.firstChild);
        }

        /* Get node iterator */
        var nodeIterator = _createIterator(IN_PLACE ? dirty : body);

        /* Now start iterating over the created document */
        while (currentNode = nodeIterator.nextNode()) {
          /* Fix IE's strange behavior with manipulated textNodes #89 */
          if (currentNode.nodeType === 3 && currentNode === oldNode) {
            continue;
          }

          /* Sanitize tags and elements */
          if (_sanitizeElements(currentNode)) {
            continue;
          }

          /* Shadow DOM detected, sanitize it */
          if (currentNode.content instanceof DocumentFragment) {
            _sanitizeShadowDOM(currentNode.content);
          }

          /* Check attributes, sanitize if necessary */
          _sanitizeAttributes(currentNode);

          oldNode = currentNode;
        }

        oldNode = null;

        /* If we sanitized `dirty` in-place, return it. */
        if (IN_PLACE) {
          return dirty;
        }

        /* Return sanitized string or DOM */
        if (RETURN_DOM) {
          if (RETURN_DOM_FRAGMENT) {
            returnNode = createDocumentFragment.call(body.ownerDocument);

            while (body.firstChild) {
              // eslint-disable-next-line unicorn/prefer-node-append
              returnNode.appendChild(body.firstChild);
            }
          } else {
            returnNode = body;
          }

          if (RETURN_DOM_IMPORT) {
            /* AdoptNode() is not used because internal state is not reset
                   (e.g. the past names map of a HTMLFormElement), this is safe
                   in theory but we would rather not risk another attack vector.
                   The state that is cloned by importNode() is explicitly defined
                   by the specs. */
            returnNode = importNode.call(originalDocument, returnNode, true);
          }

          return returnNode;
        }

        var serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;

        /* Sanitize final string template-safe */
        if (SAFE_FOR_TEMPLATES) {
          serializedHTML = stringReplace(serializedHTML, MUSTACHE_EXPR$$1, ' ');
          serializedHTML = stringReplace(serializedHTML, ERB_EXPR$$1, ' ');
        }

        return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
      };

      /**
       * Public method to set the configuration once
       * setConfig
       *
       * @param {Object} cfg configuration object
       */
      DOMPurify.setConfig = function (cfg) {
        _parseConfig(cfg);
        SET_CONFIG = true;
      };

      /**
       * Public method to remove the configuration
       * clearConfig
       *
       */
      DOMPurify.clearConfig = function () {
        CONFIG = null;
        SET_CONFIG = false;
      };

      /**
       * Public method to check if an attribute value is valid.
       * Uses last set config, if any. Otherwise, uses config defaults.
       * isValidAttribute
       *
       * @param  {string} tag Tag name of containing element.
       * @param  {string} attr Attribute name.
       * @param  {string} value Attribute value.
       * @return {Boolean} Returns true if `value` is valid. Otherwise, returns false.
       */
      DOMPurify.isValidAttribute = function (tag, attr, value) {
        /* Initialize shared config vars if necessary. */
        if (!CONFIG) {
          _parseConfig({});
        }

        var lcTag = stringToLowerCase(tag);
        var lcName = stringToLowerCase(attr);
        return _isValidAttribute(lcTag, lcName, value);
      };

      /**
       * AddHook
       * Public method to add DOMPurify hooks
       *
       * @param {String} entryPoint entry point for the hook to add
       * @param {Function} hookFunction function to execute
       */
      DOMPurify.addHook = function (entryPoint, hookFunction) {
        if (typeof hookFunction !== 'function') {
          return;
        }

        hooks[entryPoint] = hooks[entryPoint] || [];
        arrayPush(hooks[entryPoint], hookFunction);
      };

      /**
       * RemoveHook
       * Public method to remove a DOMPurify hook at a given entryPoint
       * (pops it from the stack of hooks if more are present)
       *
       * @param {String} entryPoint entry point for the hook to remove
       */
      DOMPurify.removeHook = function (entryPoint) {
        if (hooks[entryPoint]) {
          arrayPop(hooks[entryPoint]);
        }
      };

      /**
       * RemoveHooks
       * Public method to remove all DOMPurify hooks at a given entryPoint
       *
       * @param  {String} entryPoint entry point for the hooks to remove
       */
      DOMPurify.removeHooks = function (entryPoint) {
        if (hooks[entryPoint]) {
          hooks[entryPoint] = [];
        }
      };

      /**
       * RemoveAllHooks
       * Public method to remove all DOMPurify hooks
       *
       */
      DOMPurify.removeAllHooks = function () {
        hooks = {};
      };

      return DOMPurify;
    }

    var purify = createDOMPurify();

    return purify;

    })));

    });

    /* src/Modal.svelte generated by Svelte v3.20.1 */
    const file = "src/Modal.svelte";
    const get_ctrls_slot_changes = dirty => ({});
    const get_ctrls_slot_context = ctx => ({});
    const get_header_slot_changes = dirty => ({});
    const get_header_slot_context = ctx => ({});

    function create_fragment(ctx) {
    	let div0;
    	let t0;
    	let div2;
    	let t1;
    	let br0;
    	let t2;
    	let t3;
    	let br1;
    	let t4;
    	let div1;
    	let button;
    	let t6;
    	let current;
    	let dispose;
    	const header_slot_template = /*$$slots*/ ctx[6].header;
    	const header_slot = create_slot(header_slot_template, ctx, /*$$scope*/ ctx[5], get_header_slot_context);
    	const default_slot_template = /*$$slots*/ ctx[6].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[5], null);
    	const ctrls_slot_template = /*$$slots*/ ctx[6].ctrls;
    	const ctrls_slot = create_slot(ctrls_slot_template, ctx, /*$$scope*/ ctx[5], get_ctrls_slot_context);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			if (header_slot) header_slot.c();
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			if (default_slot) default_slot.c();
    			t3 = space();
    			br1 = element("br");
    			t4 = space();
    			div1 = element("div");
    			button = element("button");
    			button.textContent = "close";
    			t6 = space();
    			if (ctrls_slot) ctrls_slot.c();
    			attr_dev(div0, "class", "modal-background svelte-gtfbs1");
    			add_location(div0, file, 42, 0, 921);
    			add_location(br0, file, 46, 2, 1078);
    			add_location(br1, file, 48, 2, 1101);
    			button.autofocus = true;
    			attr_dev(button, "class", "svelte-gtfbs1");
    			add_location(button, file, 51, 4, 1179);
    			attr_dev(div1, "class", "modal-ctrls svelte-gtfbs1");
    			add_location(div1, file, 50, 2, 1149);
    			attr_dev(div2, "class", "modal svelte-gtfbs1");
    			attr_dev(div2, "role", "dialog");
    			attr_dev(div2, "aria-modal", "true");
    			add_location(div2, file, 44, 0, 976);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);

    			if (header_slot) {
    				header_slot.m(div2, null);
    			}

    			append_dev(div2, t1);
    			append_dev(div2, br0);
    			append_dev(div2, t2);

    			if (default_slot) {
    				default_slot.m(div2, null);
    			}

    			append_dev(div2, t3);
    			append_dev(div2, br1);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, button);
    			append_dev(div1, t6);

    			if (ctrls_slot) {
    				ctrls_slot.m(div1, null);
    			}

    			/*div2_binding*/ ctx[7](div2);
    			current = true;
    			button.focus();
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(window, "keydown", /*handleKeydown*/ ctx[2], false, false, false),
    				listen_dev(div0, "click", /*close*/ ctx[1], false, false, false),
    				listen_dev(button, "click", /*close*/ ctx[1], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if (header_slot) {
    				if (header_slot.p && dirty & /*$$scope*/ 32) {
    					header_slot.p(get_slot_context(header_slot_template, ctx, /*$$scope*/ ctx[5], get_header_slot_context), get_slot_changes(header_slot_template, /*$$scope*/ ctx[5], dirty, get_header_slot_changes));
    				}
    			}

    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 32) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[5], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[5], dirty, null));
    				}
    			}

    			if (ctrls_slot) {
    				if (ctrls_slot.p && dirty & /*$$scope*/ 32) {
    					ctrls_slot.p(get_slot_context(ctrls_slot_template, ctx, /*$$scope*/ ctx[5], get_ctrls_slot_context), get_slot_changes(ctrls_slot_template, /*$$scope*/ ctx[5], dirty, get_ctrls_slot_changes));
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header_slot, local);
    			transition_in(default_slot, local);
    			transition_in(ctrls_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header_slot, local);
    			transition_out(default_slot, local);
    			transition_out(ctrls_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);
    			if (header_slot) header_slot.d(detaching);
    			if (default_slot) default_slot.d(detaching);
    			if (ctrls_slot) ctrls_slot.d(detaching);
    			/*div2_binding*/ ctx[7](null);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	const close = () => dispatch("close");
    	let modal;

    	const handleKeydown = e => {
    		if (e.key === "Escape") {
    			close();
    			return;
    		}

    		if (e.key === "Tab") {
    			// trap focus
    			const nodes = modal.querySelectorAll("*");

    			const tabbable = Array.from(nodes).filter(n => n.tabIndex >= 0);
    			let index = tabbable.indexOf(document.activeElement);
    			if (index === -1 && e.shiftKey) index = 0;
    			index += tabbable.length + (e.shiftKey ? -1 : 1);
    			index %= tabbable.length;
    			tabbable[index].focus();
    			e.preventDefault();
    		}
    	};

    	const previously_focused = typeof document !== "undefined" && document.activeElement;

    	if (previously_focused) {
    		onDestroy(() => {
    			previously_focused.focus();
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Modal> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Modal", $$slots, ['header','default','ctrls']);

    	function div2_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(0, modal = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("$$scope" in $$props) $$invalidate(5, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		dispatch,
    		close,
    		modal,
    		handleKeydown,
    		previously_focused
    	});

    	$$self.$inject_state = $$props => {
    		if ("modal" in $$props) $$invalidate(0, modal = $$props.modal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		modal,
    		close,
    		handleKeydown,
    		dispatch,
    		previously_focused,
    		$$scope,
    		$$slots,
    		div2_binding
    	];
    }

    class Modal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Modal",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/IdentityPane.svelte generated by Svelte v3.20.1 */
    const file$1 = "src/IdentityPane.svelte";

    // (27:0) {#if showModal}
    function create_if_block(ctx) {
    	let current;

    	const modal = new Modal({
    			props: {
    				$$slots: {
    					default: [create_default_slot],
    					header: [create_header_slot]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	modal.$on("close", /*close_handler*/ ctx[4]);

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, identity*/ 33) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(27:0) {#if showModal}",
    		ctx
    	});

    	return block;
    }

    // (29:4) <h2 slot="header" style="text-align: center">
    function create_header_slot(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Mysterious Stranger";
    			attr_dev(h2, "slot", "header");
    			set_style(h2, "text-align", "center");
    			add_location(h2, file$1, 28, 4, 722);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_header_slot.name,
    		type: "slot",
    		source: "(29:4) <h2 slot=\\\"header\\\" style=\\\"text-align: center\\\">",
    		ctx
    	});

    	return block;
    }

    // (28:1) <Modal on:close="{() => showModal = false}">
    function create_default_slot(ctx) {
    	let t0;
    	let pre;
    	let t1;
    	let t2_value = /*identity*/ ctx[0].sig.pub.toString("hex") + "";
    	let t2;
    	let t3;
    	let t4_value = /*identity*/ ctx[0].sig.sec.slice(0, 32).toString("hex") + "";
    	let t4;
    	let t5;
    	let t6_value = /*identity*/ ctx[0].box.pub.toString("hex") + "";
    	let t6;
    	let t7;
    	let t8_value = /*identity*/ ctx[0].box.sec.toString("hex") + "";
    	let t8;

    	const block = {
    		c: function create() {
    			t0 = space();
    			pre = element("pre");
    			t1 = text("SPK ");
    			t2 = text(t2_value);
    			t3 = text("\nSSK ");
    			t4 = text(t4_value);
    			t5 = text("\nBPK ");
    			t6 = text(t6_value);
    			t7 = text("\nBSK ");
    			t8 = text(t8_value);
    			add_location(pre, file$1, 31, 4, 808);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t1);
    			append_dev(pre, t2);
    			append_dev(pre, t3);
    			append_dev(pre, t4);
    			append_dev(pre, t5);
    			append_dev(pre, t6);
    			append_dev(pre, t7);
    			append_dev(pre, t8);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*identity*/ 1 && t2_value !== (t2_value = /*identity*/ ctx[0].sig.pub.toString("hex") + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*identity*/ 1 && t4_value !== (t4_value = /*identity*/ ctx[0].sig.sec.slice(0, 32).toString("hex") + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*identity*/ 1 && t6_value !== (t6_value = /*identity*/ ctx[0].box.pub.toString("hex") + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*identity*/ 1 && t8_value !== (t8_value = /*identity*/ ctx[0].box.sec.toString("hex") + "")) set_data_dev(t8, t8_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(28:1) <Modal on:close=\\\"{() => showModal = false}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let span;
    	let t0;
    	let code;
    	let t2;
    	let current;
    	let dispose;
    	let if_block = /*showModal*/ ctx[1] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text("👤");
    			code = element("code");
    			code.textContent = `${/*spk*/ ctx[2].toString("hex").substr(0, 12)}`;
    			t2 = space();
    			if (if_block) if_block.c();
    			add_location(code, file$1, 22, 4, 559);
    			add_location(span, file$1, 20, 2, 469);
    			add_location(div, file$1, 18, 0, 434);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, code);
    			append_dev(div, t2);
    			if (if_block) if_block.m(div, null);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(span, "click", /*click_handler*/ ctx[3], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showModal*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { identity } = $$props;

    	/* // Hashicons cost us 27k of minified data or about 7k compressed.
       // I like the but not the cubes, maybe fork it or talk to the author.

    import { onMount } from 'svelte'
    import hashicon from 'hashicon'
    onMount(() => {
      const ico = hashicon(spk, 22)
      container.appendChild(ico)
    })
    let container
     */
    	let spk = identity.sig.pub;

    	let showModal = false;
    	const writable_props = ["identity"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<IdentityPane> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("IdentityPane", $$slots, []);
    	const click_handler = () => $$invalidate(1, showModal = true);
    	const close_handler = () => $$invalidate(1, showModal = false);

    	$$self.$set = $$props => {
    		if ("identity" in $$props) $$invalidate(0, identity = $$props.identity);
    	};

    	$$self.$capture_state = () => ({ Modal, identity, spk, showModal });

    	$$self.$inject_state = $$props => {
    		if ("identity" in $$props) $$invalidate(0, identity = $$props.identity);
    		if ("spk" in $$props) $$invalidate(2, spk = $$props.spk);
    		if ("showModal" in $$props) $$invalidate(1, showModal = $$props.showModal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [identity, showModal, spk, click_handler, close_handler];
    }

    class IdentityPane extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { identity: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "IdentityPane",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*identity*/ ctx[0] === undefined && !("identity" in props)) {
    			console.warn("<IdentityPane> was created without expected prop 'identity'");
    		}
    	}

    	get identity() {
    		throw new Error("<IdentityPane>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set identity(value) {
    		throw new Error("<IdentityPane>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/EncryptionSettings.svelte generated by Svelte v3.20.1 */

    const { console: console_1 } = globals;
    const file$2 = "src/EncryptionSettings.svelte";

    // (33:2) {#if $visible}
    function create_if_block$1(ctx) {
    	let current;

    	const modal = new Modal({
    			props: {
    				$$slots: {
    					default: [create_default_slot$1],
    					ctrls: [create_ctrls_slot],
    					header: [create_header_slot$1]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	modal.$on("close", /*close_handler*/ ctx[14]);

    	const block = {
    		c: function create() {
    			create_component(modal.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(modal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const modal_changes = {};

    			if (dirty & /*$$scope, computing, passphrase, type*/ 32782) {
    				modal_changes.$$scope = { dirty, ctx };
    			}

    			modal.$set(modal_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(modal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(modal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(modal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(33:2) {#if $visible}",
    		ctx
    	});

    	return block;
    }

    // (35:6) <h2 slot="header" style="text-align: center">
    function create_header_slot$1(ctx) {
    	let h2;

    	const block = {
    		c: function create() {
    			h2 = element("h2");
    			h2.textContent = "Choose encryption type";
    			attr_dev(h2, "slot", "header");
    			set_style(h2, "text-align", "center");
    			add_location(h2, file$2, 34, 6, 808);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_header_slot$1.name,
    		type: "slot",
    		source: "(35:6) <h2 slot=\\\"header\\\" style=\\\"text-align: center\\\">",
    		ctx
    	});

    	return block;
    }

    // (61:10) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Anybody with the link can read the message";
    			add_location(p, file$2, 61, 12, 2284);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(61:10) {:else}",
    		ctx
    	});

    	return block;
    }

    // (58:31) 
    function create_if_block_4(ctx) {
    	let p;
    	let t1;
    	let br;
    	let a;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "A simple lock that can be cracked open with time";
    			t1 = space();
    			br = element("br");
    			a = element("a");
    			a.textContent = "Not impl yet.";
    			add_location(p, file$2, 58, 12, 2114);
    			add_location(br, file$2, 59, 12, 2182);
    			attr_dev(a, "href", "https://github.com/telamon/rant/issues");
    			add_location(a, file$2, 59, 17, 2187);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, a, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(58:31) ",
    		ctx
    	});

    	return block;
    }

    // (54:31) 
    function create_if_block_3(ctx) {
    	let p;
    	let t1;
    	let textarea;
    	let t2;
    	let br;
    	let a;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Only the receiver will be able to read the message";
    			t1 = space();
    			textarea = element("textarea");
    			t2 = space();
    			br = element("br");
    			a = element("a");
    			a.textContent = "Not impl yet.";
    			add_location(p, file$2, 54, 12, 1839);
    			textarea.disabled = "true";
    			attr_dev(textarea, "placeholder", "Receivers public box key");
    			add_location(textarea, file$2, 55, 12, 1909);
    			add_location(br, file$2, 56, 12, 1998);
    			attr_dev(a, "href", "https://github.com/telamon/rant/issues");
    			add_location(a, file$2, 56, 17, 2003);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, textarea, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, a, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(a);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(54:31) ",
    		ctx
    	});

    	return block;
    }

    // (44:10) {#if type == 1 }
    function create_if_block_1(ctx) {
    	let p;
    	let t1;
    	let input;
    	let t2;
    	let br;
    	let t3;
    	let small;
    	let t5;
    	let if_block_anchor;
    	let dispose;
    	let if_block = /*computing*/ ctx[3] && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Encrypt with a passphrase";
    			t1 = space();
    			input = element("input");
    			t2 = space();
    			br = element("br");
    			t3 = space();
    			small = element("small");
    			small.textContent = "This is the only time you will see the password";
    			t5 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			add_location(p, file$2, 44, 12, 1400);
    			attr_dev(input, "id", "pw");
    			attr_dev(input, "type", "text");
    			input.disabled = /*computing*/ ctx[3];
    			attr_dev(input, "class", "svelte-roik2p");
    			add_location(input, file$2, 45, 12, 1445);
    			add_location(br, file$2, 50, 12, 1657);
    			add_location(small, file$2, 51, 12, 1675);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, p, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input, anchor);
    			set_input_value(input, /*passphrase*/ ctx[1]);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, small, anchor);
    			insert_dev(target, t5, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "keydown", /*keydown_handler*/ ctx[12], false, false, false),
    				listen_dev(input, "input", /*input_input_handler*/ ctx[13])
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*computing*/ 8) {
    				prop_dev(input, "disabled", /*computing*/ ctx[3]);
    			}

    			if (dirty & /*passphrase*/ 2 && input.value !== /*passphrase*/ ctx[1]) {
    				set_input_value(input, /*passphrase*/ ctx[1]);
    			}

    			if (/*computing*/ ctx[3]) {
    				if (!if_block) {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(small);
    			if (detaching) detach_dev(t5);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(44:10) {#if type == 1 }",
    		ctx
    	});

    	return block;
    }

    // (53:12) {#if computing}
    function create_if_block_2(ctx) {
    	let h3;

    	const block = {
    		c: function create() {
    			h3 = element("h3");
    			h3.textContent = "Deriving key...";
    			add_location(h3, file$2, 52, 27, 1765);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h3, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(53:12) {#if computing}",
    		ctx
    	});

    	return block;
    }

    // (66:6) <span slot="ctrls">
    function create_ctrls_slot(ctx) {
    	let span;
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			span = element("span");
    			button = element("button");
    			button.textContent = "apply";
    			add_location(button, file$2, 66, 8, 2412);
    			attr_dev(span, "slot", "ctrls");
    			add_location(span, file$2, 65, 6, 2384);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, span, anchor);
    			append_dev(span, button);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*applyFn*/ ctx[5], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_ctrls_slot.name,
    		type: "slot",
    		source: "(66:6) <span slot=\\\"ctrls\\\">",
    		ctx
    	});

    	return block;
    }

    // (34:4) <Modal on:close="{() => $visible = false}">
    function create_default_slot$1(ctx) {
    	let t0;
    	let div1;
    	let label0;
    	let input0;
    	let input0_value_value;
    	let t1;
    	let t2;
    	let label1;
    	let input1;
    	let input1_value_value;
    	let t3;
    	let t4;
    	let label2;
    	let input2;
    	let input2_value_value;
    	let t5;
    	let t6;
    	let label3;
    	let input3;
    	let input3_value_value;
    	let t7;
    	let t8;
    	let div0;
    	let t9;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*type*/ ctx[2] == 1) return create_if_block_1;
    		if (/*type*/ ctx[2] === 2) return create_if_block_3;
    		if (/*type*/ ctx[2] === 3) return create_if_block_4;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			t0 = space();
    			div1 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t1 = text(" No encryption");
    			t2 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t3 = text(" Passphrase");
    			t4 = space();
    			label2 = element("label");
    			input2 = element("input");
    			t5 = text(" Personal");
    			t6 = space();
    			label3 = element("label");
    			input3 = element("input");
    			t7 = text(" Puzzlebox");
    			t8 = space();
    			div0 = element("div");
    			if_block.c();
    			t9 = space();
    			attr_dev(input0, "id", "plain");
    			attr_dev(input0, "type", "radio");
    			input0.__value = input0_value_value = 0;
    			input0.value = input0.__value;
    			/*$$binding_groups*/ ctx[8][0].push(input0);
    			add_location(input0, file$2, 38, 27, 936);
    			attr_dev(label0, "for", "plain");
    			add_location(label0, file$2, 38, 8, 917);
    			attr_dev(input1, "id", "pw");
    			attr_dev(input1, "type", "radio");
    			input1.__value = input1_value_value = 1;
    			input1.value = input1.__value;
    			attr_dev(input1, "class", "svelte-roik2p");
    			/*$$binding_groups*/ ctx[8][0].push(input1);
    			add_location(input1, file$2, 39, 24, 1043);
    			attr_dev(label1, "for", "pw");
    			add_location(label1, file$2, 39, 8, 1027);
    			attr_dev(input2, "id", "box");
    			attr_dev(input2, "type", "radio");
    			input2.__value = input2_value_value = 2;
    			input2.value = input2.__value;
    			/*$$binding_groups*/ ctx[8][0].push(input2);
    			add_location(input2, file$2, 40, 25, 1144);
    			attr_dev(label2, "for", "box");
    			add_location(label2, file$2, 40, 8, 1127);
    			attr_dev(input3, "id", "pz");
    			attr_dev(input3, "type", "radio");
    			input3.__value = input3_value_value = 3;
    			input3.value = input3.__value;
    			/*$$binding_groups*/ ctx[8][0].push(input3);
    			add_location(input3, file$2, 41, 24, 1244);
    			attr_dev(label3, "for", "pz");
    			add_location(label3, file$2, 41, 8, 1228);
    			set_style(div0, "text-align", "center");
    			add_location(div0, file$2, 42, 8, 1328);
    			add_location(div1, file$2, 37, 6, 903);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, label0);
    			append_dev(label0, input0);
    			input0.checked = input0.__value === /*type*/ ctx[2];
    			append_dev(label0, t1);
    			append_dev(div1, t2);
    			append_dev(div1, label1);
    			append_dev(label1, input1);
    			input1.checked = input1.__value === /*type*/ ctx[2];
    			append_dev(label1, t3);
    			append_dev(div1, t4);
    			append_dev(div1, label2);
    			append_dev(label2, input2);
    			input2.checked = input2.__value === /*type*/ ctx[2];
    			append_dev(label2, t5);
    			append_dev(div1, t6);
    			append_dev(div1, label3);
    			append_dev(label3, input3);
    			input3.checked = input3.__value === /*type*/ ctx[2];
    			append_dev(label3, t7);
    			append_dev(div1, t8);
    			append_dev(div1, div0);
    			if_block.m(div0, null);
    			insert_dev(target, t9, anchor);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "change", /*input0_change_handler*/ ctx[7]),
    				listen_dev(input1, "change", /*input1_change_handler*/ ctx[9]),
    				listen_dev(input2, "change", /*input2_change_handler*/ ctx[10]),
    				listen_dev(input3, "change", /*input3_change_handler*/ ctx[11])
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*type*/ 4) {
    				input0.checked = input0.__value === /*type*/ ctx[2];
    			}

    			if (dirty & /*type*/ 4) {
    				input1.checked = input1.__value === /*type*/ ctx[2];
    			}

    			if (dirty & /*type*/ 4) {
    				input2.checked = input2.__value === /*type*/ ctx[2];
    			}

    			if (dirty & /*type*/ 4) {
    				input3.checked = input3.__value === /*type*/ ctx[2];
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			/*$$binding_groups*/ ctx[8][0].splice(/*$$binding_groups*/ ctx[8][0].indexOf(input0), 1);
    			/*$$binding_groups*/ ctx[8][0].splice(/*$$binding_groups*/ ctx[8][0].indexOf(input1), 1);
    			/*$$binding_groups*/ ctx[8][0].splice(/*$$binding_groups*/ ctx[8][0].indexOf(input2), 1);
    			/*$$binding_groups*/ ctx[8][0].splice(/*$$binding_groups*/ ctx[8][0].indexOf(input3), 1);
    			if_block.d();
    			if (detaching) detach_dev(t9);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(34:4) <Modal on:close=\\\"{() => $visible = false}\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let section;
    	let current;
    	let if_block = /*$visible*/ ctx[4] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if (if_block) if_block.c();
    			add_location(section, file$2, 31, 0, 727);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if (if_block) if_block.m(section, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$visible*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(section, null);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $visible,
    		$$unsubscribe_visible = noop,
    		$$subscribe_visible = () => ($$unsubscribe_visible(), $$unsubscribe_visible = subscribe(visible, $$value => $$invalidate(4, $visible = $$value)), visible);

    	$$self.$$.on_destroy.push(() => $$unsubscribe_visible());
    	let { secret } = $$props;
    	let { visible } = $$props;
    	validate_store(visible, "visible");
    	$$subscribe_visible();

    	// import { writable } from 'svelte/store'
    	let passphrase;

    	let type = 0;
    	let computing = false; // writable(false)

    	const applyFn = () => {
    		switch (type) {
    			case 1:
    				console.time("scrypt");
    				$$invalidate(3, computing = true);
    				const salt = cryptology_4(6);
    				cryptology_20(passphrase, salt).then(buffer => {
    					console.timeEnd("scrypt");
    					secret.set({ salt, key: buffer, type });
    					$$invalidate(1, passphrase = "");
    					$$invalidate(3, computing = false);
    					visible.set(false);
    				});
    				break;
    			case 0:
    			default:
    				secret.set({ type: 0 });
    				visible.set(false);
    		}
    	};

    	const writable_props = ["secret", "visible"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<EncryptionSettings> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("EncryptionSettings", $$slots, []);
    	const $$binding_groups = [[]];

    	function input0_change_handler() {
    		type = this.__value;
    		$$invalidate(2, type);
    	}

    	function input1_change_handler() {
    		type = this.__value;
    		$$invalidate(2, type);
    	}

    	function input2_change_handler() {
    		type = this.__value;
    		$$invalidate(2, type);
    	}

    	function input3_change_handler() {
    		type = this.__value;
    		$$invalidate(2, type);
    	}

    	const keydown_handler = e => e.key === "Enter" && applyFn();

    	function input_input_handler() {
    		passphrase = this.value;
    		$$invalidate(1, passphrase);
    	}

    	const close_handler = () => set_store_value(visible, $visible = false);

    	$$self.$set = $$props => {
    		if ("secret" in $$props) $$invalidate(6, secret = $$props.secret);
    		if ("visible" in $$props) $$subscribe_visible($$invalidate(0, visible = $$props.visible));
    	};

    	$$self.$capture_state = () => ({
    		secret,
    		visible,
    		Modal,
    		scrypt: cryptology_20,
    		randomBytes: cryptology_4,
    		passphrase,
    		type,
    		computing,
    		applyFn,
    		$visible
    	});

    	$$self.$inject_state = $$props => {
    		if ("secret" in $$props) $$invalidate(6, secret = $$props.secret);
    		if ("visible" in $$props) $$subscribe_visible($$invalidate(0, visible = $$props.visible));
    		if ("passphrase" in $$props) $$invalidate(1, passphrase = $$props.passphrase);
    		if ("type" in $$props) $$invalidate(2, type = $$props.type);
    		if ("computing" in $$props) $$invalidate(3, computing = $$props.computing);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		visible,
    		passphrase,
    		type,
    		computing,
    		$visible,
    		applyFn,
    		secret,
    		input0_change_handler,
    		$$binding_groups,
    		input1_change_handler,
    		input2_change_handler,
    		input3_change_handler,
    		keydown_handler,
    		input_input_handler,
    		close_handler
    	];
    }

    class EncryptionSettings extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { secret: 6, visible: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EncryptionSettings",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*secret*/ ctx[6] === undefined && !("secret" in props)) {
    			console_1.warn("<EncryptionSettings> was created without expected prop 'secret'");
    		}

    		if (/*visible*/ ctx[0] === undefined && !("visible" in props)) {
    			console_1.warn("<EncryptionSettings> was created without expected prop 'visible'");
    		}
    	}

    	get secret() {
    		throw new Error("<EncryptionSettings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set secret(value) {
    		throw new Error("<EncryptionSettings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get visible() {
    		throw new Error("<EncryptionSettings>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set visible(value) {
    		throw new Error("<EncryptionSettings>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.20.1 */
    const file$3 = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    // (57:6) {:else}
    function create_else_block_1(ctx) {
    	let current;

    	const identitypane = new IdentityPane({
    			props: { identity: /*uid*/ ctx[1] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(identitypane.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(identitypane, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const identitypane_changes = {};
    			if (dirty & /*uid*/ 2) identitypane_changes.identity = /*uid*/ ctx[1];
    			identitypane.$set(identitypane_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(identitypane.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(identitypane.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(identitypane, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(57:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (48:6) {#if $editMode}
    function create_if_block_3$1(ctx) {
    	let div1;
    	let samp;
    	let t0_value = /*$card*/ ctx[8].size + "";
    	let t0;
    	let t1;
    	let t2;
    	let div0;
    	let span;
    	let span_style_value;
    	let t3;
    	let code;
    	let t4;
    	let t5_value = Math.round(/*$card*/ ctx[8].ratio * 100) + "";
    	let t5;
    	let t6;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			samp = element("samp");
    			t0 = text(t0_value);
    			t1 = text(" / 1024");
    			t2 = space();
    			div0 = element("div");
    			span = element("span");
    			t3 = space();
    			code = element("code");
    			t4 = text("[🗜️");
    			t5 = text(t5_value);
    			t6 = text("%]");
    			add_location(samp, file$3, 50, 10, 1399);
    			attr_dev(span, "style", span_style_value = `width: ${/*$card*/ ctx[8].size / 10.24}%;`);
    			add_location(span, file$3, 52, 12, 1474);
    			attr_dev(div0, "id", "capacity");
    			add_location(div0, file$3, 51, 10, 1442);
    			attr_dev(div1, "class", "flex column xcenter");
    			add_location(div1, file$3, 49, 8, 1355);
    			add_location(code, file$3, 55, 8, 1569);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, samp);
    			append_dev(samp, t0);
    			append_dev(samp, t1);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, code, anchor);
    			append_dev(code, t4);
    			append_dev(code, t5);
    			append_dev(code, t6);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$card*/ 256 && t0_value !== (t0_value = /*$card*/ ctx[8].size + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*$card*/ 256 && span_style_value !== (span_style_value = `width: ${/*$card*/ ctx[8].size / 10.24}%;`)) {
    				attr_dev(span, "style", span_style_value);
    			}

    			if (dirty & /*$card*/ 256 && t5_value !== (t5_value = Math.round(/*$card*/ ctx[8].ratio * 100) + "")) set_data_dev(t5, t5_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(code);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(48:6) {#if $editMode}",
    		ctx
    	});

    	return block;
    }

    // (65:6) {#if $editMode}
    function create_if_block_2$1(ctx) {
    	let button0;
    	let t1;
    	let button1;
    	let t2;
    	let span;
    	let t3_value = (/*$secret*/ ctx[9].type ? "🔒" : "🔓") + "";
    	let t3;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "🌼";
    			t1 = space();
    			button1 = element("button");
    			t2 = text("Encryption ");
    			span = element("span");
    			t3 = text(t3_value);
    			attr_dev(button0, "class", "uline red emo");
    			add_location(button0, file$3, 65, 8, 1866);
    			add_location(span, file$3, 70, 64, 2135);
    			attr_dev(button1, "class", "uline");
    			toggle_class(button1, "cobalt", !/*$secret*/ ctx[9].type);
    			toggle_class(button1, "purp", /*$secret*/ ctx[9].type);
    			add_location(button1, file$3, 67, 8, 1962);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, t2);
    			append_dev(button1, span);
    			append_dev(span, t3);
    			if (remount) dispose();
    			dispose = listen_dev(button1, "click", /*click_handler*/ ctx[20], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$secret*/ 512 && t3_value !== (t3_value = (/*$secret*/ ctx[9].type ? "🔒" : "🔓") + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*$secret*/ 512) {
    				toggle_class(button1, "cobalt", !/*$secret*/ ctx[9].type);
    			}

    			if (dirty & /*$secret*/ 512) {
    				toggle_class(button1, "purp", /*$secret*/ ctx[9].type);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(65:6) {#if $editMode}",
    		ctx
    	});

    	return block;
    }

    // (86:6) {:else}
    function create_else_block$1(ctx) {
    	let button0;
    	let t1;
    	let button1;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			button0.textContent = "Socmed";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Clipboard";
    			attr_dev(button0, "class", "uline orange");
    			add_location(button0, file$3, 86, 8, 2533);
    			attr_dev(button1, "class", "uline red");
    			add_location(button1, file$3, 87, 8, 2586);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, button1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(button1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(86:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (76:6) {#if $editMode}
    function create_if_block_1$1(ctx) {
    	let select;
    	let dispose;
    	let each_value = /*themes*/ ctx[15];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(select, "class", "uline moss");
    			if (/*$theme*/ ctx[11] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[21].call(select));
    			add_location(select, file$3, 78, 8, 2320);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, select, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, /*$theme*/ ctx[11]);
    			if (remount) dispose();
    			dispose = listen_dev(select, "change", /*select_change_handler*/ ctx[21]);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*themes*/ 32768) {
    				each_value = /*themes*/ ctx[15];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*$theme*/ 2048) {
    				select_option(select, /*$theme*/ ctx[11]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(select);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(76:6) {#if $editMode}",
    		ctx
    	});

    	return block;
    }

    // (80:10) {#each themes as t}
    function create_each_block(ctx) {
    	let option;
    	let t0_value = /*t*/ ctx[23].name + "";
    	let t0;
    	let t1;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = /*t*/ ctx[23].id;
    			option.value = option.__value;
    			add_location(option, file$3, 80, 12, 2410);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t0);
    			append_dev(option, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(80:10) {#each themes as t}",
    		ctx
    	});

    	return block;
    }

    // (94:2) {#if $editMode}
    function create_if_block$2(ctx) {
    	let section;
    	let textarea;
    	let dispose;

    	const block = {
    		c: function create() {
    			section = element("section");
    			textarea = element("textarea");
    			add_location(textarea, file$3, 95, 6, 2732);
    			attr_dev(section, "id", "editor");
    			add_location(section, file$3, 94, 4, 2704);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, section, anchor);
    			append_dev(section, textarea);
    			set_input_value(textarea, /*$rant*/ ctx[12]);
    			if (remount) dispose();
    			dispose = listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[22]);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$rant*/ 4096) {
    				set_input_value(textarea, /*$rant*/ ctx[12]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(94:2) {#if $editMode}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let main;
    	let nav;
    	let div0;
    	let h3;
    	let t1;
    	let small;
    	let t3;
    	let current_block_type_index;
    	let if_block0;
    	let t4;
    	let div1;
    	let button;
    	let t5_value = (/*$editMode*/ ctx[7] ? "Preview" : "Editor") + "";
    	let t5;
    	let t6;
    	let t7;
    	let div2;
    	let t8;
    	let t9;
    	let section;
    	let t10;
    	let footer;
    	let a0;
    	let t12;
    	let a1;
    	let t14;
    	let current;
    	let dispose;
    	const if_block_creators = [create_if_block_3$1, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$editMode*/ ctx[7]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = /*$editMode*/ ctx[7] && create_if_block_2$1(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*$editMode*/ ctx[7]) return create_if_block_1$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block2 = current_block_type(ctx);
    	let if_block3 = /*$editMode*/ ctx[7] && create_if_block$2(ctx);

    	const encryptionsettings = new EncryptionSettings({
    			props: {
    				secret: /*secret*/ ctx[4],
    				visible: /*encVisible*/ ctx[18]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			nav = element("nav");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "1k.rant";
    			t1 = space();
    			small = element("small");
    			small.textContent = "v0.5.0-alpha";
    			t3 = space();
    			if_block0.c();
    			t4 = space();
    			div1 = element("div");
    			button = element("button");
    			t5 = text(t5_value);
    			t6 = space();
    			if (if_block1) if_block1.c();
    			t7 = space();
    			div2 = element("div");
    			if_block2.c();
    			t8 = space();
    			if (if_block3) if_block3.c();
    			t9 = space();
    			section = element("section");
    			t10 = space();
    			footer = element("footer");
    			a0 = element("a");
    			a0.textContent = "1k.Rant copyright © Tony Ivanov 2020 - License GNU AGPLv3";
    			t12 = space();
    			a1 = element("a");
    			a1.textContent = "Source";
    			t14 = space();
    			create_component(encryptionsettings.$$.fragment);
    			attr_dev(h3, "class", "brand");
    			add_location(h3, file$3, 45, 6, 1220);
    			add_location(small, file$3, 46, 6, 1257);
    			attr_dev(div0, "class", "flex row xcenter");
    			add_location(div0, file$3, 44, 4, 1170);
    			attr_dev(button, "class", "uline moss");
    			add_location(button, file$3, 62, 6, 1728);
    			add_location(div1, file$3, 61, 4, 1701);
    			attr_dev(div2, "class", "flex row xcenter");
    			add_location(div2, file$3, 74, 4, 2214);
    			add_location(nav, file$3, 43, 2, 1160);
    			attr_dev(section, "id", "render");
    			add_location(section, file$3, 100, 2, 2818);
    			attr_dev(a0, "href", "https://decentlabs.se");
    			add_location(a0, file$3, 103, 10, 2883);
    			attr_dev(a1, "href", "https://github.com/telamon/rant/");
    			add_location(a1, file$3, 103, 104, 2977);
    			add_location(footer, file$3, 103, 2, 2875);
    			attr_dev(main, "class", /*$mainClass*/ ctx[6]);
    			add_location(main, file$3, 41, 0, 1112);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, main, anchor);
    			append_dev(main, nav);
    			append_dev(nav, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, small);
    			append_dev(div0, t3);
    			if_blocks[current_block_type_index].m(div0, null);
    			append_dev(nav, t4);
    			append_dev(nav, div1);
    			append_dev(div1, button);
    			append_dev(button, t5);
    			append_dev(div1, t6);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(nav, t7);
    			append_dev(nav, div2);
    			if_block2.m(div2, null);
    			append_dev(main, t8);
    			if (if_block3) if_block3.m(main, null);
    			append_dev(main, t9);
    			append_dev(main, section);
    			section.innerHTML = /*$mdHtml*/ ctx[13];
    			append_dev(main, t10);
    			append_dev(main, footer);
    			append_dev(footer, a0);
    			append_dev(footer, t12);
    			append_dev(footer, a1);
    			append_dev(main, t14);
    			mount_component(encryptionsettings, main, null);
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*toggleState*/ ctx[16], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(div0, null);
    			}

    			if ((!current || dirty & /*$editMode*/ 128) && t5_value !== (t5_value = (/*$editMode*/ ctx[7] ? "Preview" : "Editor") + "")) set_data_dev(t5, t5_value);

    			if (/*$editMode*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2$1(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div2, null);
    				}
    			}

    			if (/*$editMode*/ ctx[7]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block$2(ctx);
    					if_block3.c();
    					if_block3.m(main, t9);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (!current || dirty & /*$mdHtml*/ 8192) section.innerHTML = /*$mdHtml*/ ctx[13];			const encryptionsettings_changes = {};
    			if (dirty & /*secret*/ 16) encryptionsettings_changes.secret = /*secret*/ ctx[4];
    			encryptionsettings.$set(encryptionsettings_changes);

    			if (!current || dirty & /*$mainClass*/ 64) {
    				attr_dev(main, "class", /*$mainClass*/ ctx[6]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(encryptionsettings.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(encryptionsettings.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
    			if (if_block1) if_block1.d();
    			if_block2.d();
    			if (if_block3) if_block3.d();
    			destroy_component(encryptionsettings);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $mainClass;

    	let $editMode,
    		$$unsubscribe_editMode = noop,
    		$$subscribe_editMode = () => ($$unsubscribe_editMode(), $$unsubscribe_editMode = subscribe(editMode, $$value => $$invalidate(7, $editMode = $$value)), editMode);

    	let $card,
    		$$unsubscribe_card = noop,
    		$$subscribe_card = () => ($$unsubscribe_card(), $$unsubscribe_card = subscribe(card, $$value => $$invalidate(8, $card = $$value)), card);

    	let $secret,
    		$$unsubscribe_secret = noop,
    		$$subscribe_secret = () => ($$unsubscribe_secret(), $$unsubscribe_secret = subscribe(secret, $$value => $$invalidate(9, $secret = $$value)), secret);

    	let $encVisible;

    	let $theme,
    		$$unsubscribe_theme = noop,
    		$$subscribe_theme = () => ($$unsubscribe_theme(), $$unsubscribe_theme = subscribe(theme, $$value => $$invalidate(11, $theme = $$value)), theme);

    	let $rant,
    		$$unsubscribe_rant = noop,
    		$$subscribe_rant = () => ($$unsubscribe_rant(), $$unsubscribe_rant = subscribe(rant, $$value => $$invalidate(12, $rant = $$value)), rant);

    	let $mdHtml;
    	$$self.$$.on_destroy.push(() => $$unsubscribe_editMode());
    	$$self.$$.on_destroy.push(() => $$unsubscribe_card());
    	$$self.$$.on_destroy.push(() => $$unsubscribe_secret());
    	$$self.$$.on_destroy.push(() => $$unsubscribe_theme());
    	$$self.$$.on_destroy.push(() => $$unsubscribe_rant());
    	let { card } = $$props;
    	validate_store(card, "card");
    	$$subscribe_card();
    	let { uid } = $$props;
    	let { rant } = $$props;
    	validate_store(rant, "rant");
    	$$subscribe_rant();
    	let { theme } = $$props;
    	validate_store(theme, "theme");
    	$$subscribe_theme();
    	let { secret } = $$props;
    	validate_store(secret, "secret");
    	$$subscribe_secret();
    	let { editMode } = $$props;
    	validate_store(editMode, "editMode");
    	$$subscribe_editMode();

    	// code
    	const pickle = derived(card, s => s.pickle || "");

    	const mdHtml = derived([rant, card], ([$md, $card]) => {
    		const preprocessed = $md.replace(/!\[([^\]]+)\]\(emoj?i?:([^\)]+)\)/gi, "<span class=\"imgmoji\" alt=\"$1\" title=\"$1\">$2</span>");
    		return marked_1(purify.sanitize(preprocessed)).replace(/\{\{DATE\}\}/gi, new Date($card.date)).replace(/\{\{KEY\}\}/gi, $card.key.toString("hex"));
    	});

    	validate_store(mdHtml, "mdHtml");
    	component_subscribe($$self, mdHtml, value => $$invalidate(13, $mdHtml = value));
    	const themes = ["cyborg", "love-letter", "happy-birthday", "invitation", "robin", "blackmail"].map((name, id) => ({ name, id }));
    	const toggleState = editMode.update.bind(editMode, s => !s);
    	const mainClass = derived([theme, editMode], ([t, s]) => `${themes[t].name} ${s ? "edit" : "show"}`);
    	validate_store(mainClass, "mainClass");
    	component_subscribe($$self, mainClass, value => $$invalidate(6, $mainClass = value));
    	const encVisible = writable(false);
    	validate_store(encVisible, "encVisible");
    	component_subscribe($$self, encVisible, value => $$invalidate(10, $encVisible = value));
    	const writable_props = ["card", "uid", "rant", "theme", "secret", "editMode"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	const click_handler = () => set_store_value(encVisible, $encVisible = true);

    	function select_change_handler() {
    		$theme = select_value(this);
    		theme.set($theme);
    		$$invalidate(15, themes);
    	}

    	function textarea_input_handler() {
    		$rant = this.value;
    		rant.set($rant);
    	}

    	$$self.$set = $$props => {
    		if ("card" in $$props) $$subscribe_card($$invalidate(0, card = $$props.card));
    		if ("uid" in $$props) $$invalidate(1, uid = $$props.uid);
    		if ("rant" in $$props) $$subscribe_rant($$invalidate(2, rant = $$props.rant));
    		if ("theme" in $$props) $$subscribe_theme($$invalidate(3, theme = $$props.theme));
    		if ("secret" in $$props) $$subscribe_secret($$invalidate(4, secret = $$props.secret));
    		if ("editMode" in $$props) $$subscribe_editMode($$invalidate(5, editMode = $$props.editMode));
    	};

    	$$self.$capture_state = () => ({
    		derived,
    		writable,
    		marked: marked_1,
    		Purify: purify,
    		IdentityPane,
    		EncryptionSettings,
    		card,
    		uid,
    		rant,
    		theme,
    		secret,
    		editMode,
    		pickle,
    		mdHtml,
    		themes,
    		toggleState,
    		mainClass,
    		encVisible,
    		$mainClass,
    		$editMode,
    		$card,
    		$secret,
    		$encVisible,
    		$theme,
    		$rant,
    		$mdHtml
    	});

    	$$self.$inject_state = $$props => {
    		if ("card" in $$props) $$subscribe_card($$invalidate(0, card = $$props.card));
    		if ("uid" in $$props) $$invalidate(1, uid = $$props.uid);
    		if ("rant" in $$props) $$subscribe_rant($$invalidate(2, rant = $$props.rant));
    		if ("theme" in $$props) $$subscribe_theme($$invalidate(3, theme = $$props.theme));
    		if ("secret" in $$props) $$subscribe_secret($$invalidate(4, secret = $$props.secret));
    		if ("editMode" in $$props) $$subscribe_editMode($$invalidate(5, editMode = $$props.editMode));
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		card,
    		uid,
    		rant,
    		theme,
    		secret,
    		editMode,
    		$mainClass,
    		$editMode,
    		$card,
    		$secret,
    		$encVisible,
    		$theme,
    		$rant,
    		$mdHtml,
    		mdHtml,
    		themes,
    		toggleState,
    		mainClass,
    		encVisible,
    		pickle,
    		click_handler,
    		select_change_handler,
    		textarea_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			card: 0,
    			uid: 1,
    			rant: 2,
    			theme: 3,
    			secret: 4,
    			editMode: 5
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*card*/ ctx[0] === undefined && !("card" in props)) {
    			console.warn("<App> was created without expected prop 'card'");
    		}

    		if (/*uid*/ ctx[1] === undefined && !("uid" in props)) {
    			console.warn("<App> was created without expected prop 'uid'");
    		}

    		if (/*rant*/ ctx[2] === undefined && !("rant" in props)) {
    			console.warn("<App> was created without expected prop 'rant'");
    		}

    		if (/*theme*/ ctx[3] === undefined && !("theme" in props)) {
    			console.warn("<App> was created without expected prop 'theme'");
    		}

    		if (/*secret*/ ctx[4] === undefined && !("secret" in props)) {
    			console.warn("<App> was created without expected prop 'secret'");
    		}

    		if (/*editMode*/ ctx[5] === undefined && !("editMode" in props)) {
    			console.warn("<App> was created without expected prop 'editMode'");
    		}
    	}

    	get card() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set card(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get uid() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set uid(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rant() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rant(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get theme() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set theme(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get secret() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set secret(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get editMode() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set editMode(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const NOCRYPT = 0;
    const PWCRYPT = 1;
    // Todo: turn this into standalone-module
    const initIdentity = () => {
      const stored = localStorage.getItem('identity');
      if (!stored) {
        const id = new cryptology_21();
        window.localStorage.setItem('identity', cryptology_21.encode(id));
        console.info('new identity generated');
        return id
      } else {
        console.info('loading existing identity');
        return cryptology_21.decode(stored)
      }
    };

    const uid = initIdentity();
    const editMode = writable(false);
    const theme = writable(0);
    const rant = writable('');
    const secret = writable({ type: 0 });

    const clear = () => {
      card.truncate(0);
      card.merge(sample());
      secret.set({ type: 0 });
      rant.set(card.text);
      editMode.set(false);
    };


    // --- end of uid
    const card = new postcard();
    try {
      const url = new URL(window.location);
      if (url.hash.length) card.merge(url);
      else clear();
    } catch (err) {
      console.warn('Failed to load URL', err);
      console.info('Loading default sample');
      clear();
    }

    // Hydrate application from card if not empty.
    if (card.length) {
      theme.set(card.theme);
      const { encryption, nonce } = card._card;

      const attemptPWDecrypt = (msg = 'Input password') => {
        const passphrase = prompt(msg);
        if (!passphrase) return clear()
        console.log(nonce);
        cryptology_20(passphrase, nonce)
          .then(key => {
            try {
              secret.set({ key, nonce: nonce, type: PWCRYPT});
              rant.set(card.decrypt(key));
            } catch (err) {
              if (err.type === 'DecryptionFailedError') attemptPWDecrypt('Wrong password, try again');
              else {
                console.error(err);
                clear();
              }
            }
          });
      };

      switch (encryption) {
        case NOCRYPT:
          rant.set(card.text);
          break
        case PWCRYPT:
          attemptPWDecrypt();
          break
        default:
          alert('Corrupted or unknown encryption\npostcard unreadable code:' + card.encryption);
          clear();
          break
      }
    }

    /* this is actually the state of the model */
    const cardStore = readable({size: 0, key: ''}, set => {

      const pack = debounce_1(([$text, $theme, $secret, $editMode]) => {
        if (!$text.length) return
        const nonce = $secret.salt || card._card.nonce;

        let size = card._card.text.length;
        if ($editMode) {
          size = card.update({
            text: $text,
            theme: $theme,
            encryption: $secret.type,
            secret: $secret.key,
            nonce: nonce
          }, uid.sig.sec);
        }

        const pickle = card.pickle();
        const title = card.title; // TODO don't show title for encrypted content...
        const fancyPickle = !title ? pickle
          : `${encodeURIComponent(title.replace(/ +/g, '_'))}-${pickle}`;
        window.location.hash = fancyPickle; // Does this leak our rant to gogoolôgug?
        set({
          id: card.id,
          date: card.date,
          key: card.key,
          pickle,
          ratio: $text.length / size,
          size,
          clear
        });
      }, 500);

      return derived([rant, theme, secret, editMode], v => v)
        .subscribe(v => pack(v))
    });

    const app = new App({
    	target: document.body,
    	props: {
    		uid,
        rant,
        theme,
        secret,
        card: cardStore,
        editMode
    	}
    });

    function sample () {
      // Var tests
      // return '#PIC0.K0.7zymSDZ4Zlvrsr4aQ6GXj_g2QpIK6HGflAT3DDkxrZUB0.6MV_amWKyS9NCtotVTZfV14B5Yu2ydwAQAkMqfO_X8uUcLfHGa-z5RgMKmLsBN9IF61sDXooRTWAzBgJKI1zAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADECsEBCKj7ntGXLhAAGq4BVGl0bGUKPcQBCgojIFRvcGljCgpgV3JpdHRlbiB7e0RBVEV9fWAKClRoaXMgdGV4dCBpcyBzdG9yZWQgaW4gYSBwaWNrbGUgZmXEESBtZWFuIFtQaWNvxBFdKGh0dHBzOi8vZ2l0aHViLmNvbS90ZWxhbW9uL3DHJSkuCgoKe3tDQVBBQ0lUWX19CgpTaWduZWTEFk5BTUXEEnt7UEt9fSB7e0dMWVBISUNPTn19IAEoADDRLQ'

      // The welcome letter
      return '#%F0%9F%92%8C_1kilo.rant-PIC0.K0.7zymSDZ4Zlvrsr4aQ6GXj_g2QpIK6HGflAT3DDkxrZUB0._Rkb1yDJsTV2ZmIdGhWcgnSyf6lkokoijklvnjvrLkQlQUqWdFLMhLaboOZFsoQgrGvrkrXhQqVTcZ3aZqEwBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQFCoIICMDxtfuXLhAAGuoHMQAkvBuDE7IIwNYJYBsD2A6ATgQwHYBcBQ-wogPBuCR+yAOoCmiAxsgLbUCE+AKgBbwDOIAggAdBIXiFydqIagEcArvABumRNTwhkAMxCYQAE3gBzeLhUgACsh646mdHtSFi4QH07MEAGkkyEACEAnrjU+ABSctYgiPCwUrro1GaCVjZ2egA04pLxAOR8ulGMJuI+nMgA7iCMcnScotiayOiMmLjwyNiiuCC2HZomjlxiSda29qJ8BSbUesUgAAbQIAgoIABGgdRzGtpBAB64GaUVVTXjmS0A_IQAmshyIDzU1BkSYsw8PJiGUlGK1HxqVrxRD+Oo8eB6KQSKQAVQASgAZEAAWhA2B8ehamFWmEeaKekL0bHwAEltGUpJo5OhoehRIxVnIodw+KMZmUTLVoZUvvBbIgQEkKeg+FoQABhdD+QS4ZCGLCCTj+AaSDoUkDfLq6WXIAUSFrdHBrKThaYgBroABchFRJK6PXNRV0jzo8S6KD+kWouCC6EcqNu9wdmiiIh4TGo7SkWk0_pAAGVTDSdCB4opdXJWu04wARah0CFSMpZKE+BJdbDUfaOIigMCAXZ2LIhMPAOgBZOywPTlbChcJdVb5zCmkAU7LxUfoEytwx1QXN1viKtdZhG_VdIqcXGzFDIWBrRoztg0EBbz1UxAC5roLs9h5yYSNXCOGHg7Cz7nQ5jIx6qOiyulsWQT1_DuQ0OhqZArGZKQGBQOkxVA6lBWSNkawAeX3dUz1iVY7i6ABmAAGIi1g2Ph4maVsZxrZwwEAL12QDzRhkEIAAqNjfF1PQOJAAB9EwVD5Hg+JAABtKJsFgHgAF0AAoAEp8BYMT4Gab5ZLkzgfUEHhLQAen0xhAiwOgYnQHE9G+JTlLE_hjWHVoL3vbAp0eeTqBYy0SEAEH2bNAThoFrU8ACZawCgjwoCgAWKKAoAVkISgpx9NQdFwS0QAAbyyzEggAX3ywgAB80UwZgQFK3BpSkUqvlq_BiuRJqWsa0xVlUHhirsahioYXVisaqdDG0i5ipiWBiuikLBuKwdsHG6hJu7ThBvwVExN2GSJXjeMeRvbsyl7DatsFXEeEVLA8TUV1pSzY7xJAbauE8qRf3zAD1se7bxSggVW1wdArC+sSnoTIxsBaal_hB06ADVqCnPpbHu2HtvMPlkGRZh0G+EGwd+y9sQsFoakIOYKZxHhOHwQzumQSEOuQMyeHwAASe9ux0GUNW9SooPwCm5icOtAGkdkAADFWzMdYglZkkNSUE1BBeEtcgeVpLx0PDMxAEKQq9TRnxAeLCmwTN_lTBIZllXSWBAEhAEV9wgco8ABRa5CvwIAAAIAIoADIGYb7UxoU2'
    }

    return app;

}());
//# sourceMappingURL=bundle.js.map
