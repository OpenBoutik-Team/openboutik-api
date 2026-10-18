import { createRequire } from 'module';
import * as _nestjsCommon from '@nestjs/common';
import * as _nestjsCore from '@nestjs/core';
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = createRequire(import.meta.url);
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// node_modules/@nestjs/throttler/dist/ip.js
var require_ip = __commonJS({
  "node_modules/@nestjs/throttler/dist/ip.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_IPV6_SUBNET_PREFIX = void 0;
    exports.normalizeIp = normalizeIp;
    var net_1 = __require("net");
    exports.DEFAULT_IPV6_SUBNET_PREFIX = 64;
    function toHextets(address) {
      let head = address;
      const lastColon = head.lastIndexOf(":");
      const tail = head.slice(lastColon + 1);
      if (tail.includes(".")) {
        const octets = tail.split(".").map(Number);
        if (octets.length !== 4 || octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
          return null;
        }
        const high = (octets[0] << 8 | octets[1]).toString(16);
        const low = (octets[2] << 8 | octets[3]).toString(16);
        head = `${head.slice(0, lastColon + 1)}${high}:${low}`;
      }
      const sides = head.split("::");
      if (sides.length > 2) {
        return null;
      }
      const left = sides[0] ? sides[0].split(":") : [];
      const right = sides.length === 2 && sides[1] ? sides[1].split(":") : [];
      const fill = sides.length === 2 ? 8 - left.length - right.length : 0;
      if (fill < 0 || left.length + fill + right.length !== 8) {
        return null;
      }
      const groups = [...left, ...new Array(fill).fill("0"), ...right];
      const hextets = groups.map((group) => parseInt(group, 16));
      if (hextets.some((hextet) => !Number.isInteger(hextet) || hextet < 0 || hextet > 65535)) {
        return null;
      }
      return hextets;
    }
    function maskHextets(hextets, prefix) {
      return hextets.map((hextet, index) => {
        const bitsBefore = index * 16;
        if (prefix >= bitsBefore + 16) {
          return hextet;
        }
        if (prefix <= bitsBefore) {
          return 0;
        }
        const keep = prefix - bitsBefore;
        return hextet & (65535 << 16 - keep & 65535);
      });
    }
    function formatIpv6(hextets) {
      let bestStart = -1;
      let bestLength = 0;
      let runStart = -1;
      let runLength = 0;
      for (let index = 0; index < hextets.length; index++) {
        if (hextets[index] !== 0) {
          runStart = -1;
          runLength = 0;
          continue;
        }
        if (runStart === -1) {
          runStart = index;
        }
        runLength++;
        if (runLength > bestLength) {
          bestStart = runStart;
          bestLength = runLength;
        }
      }
      const groups = hextets.map((hextet) => hextet.toString(16));
      if (bestLength < 2) {
        return groups.join(":");
      }
      return `${groups.slice(0, bestStart).join(":")}::${groups.slice(bestStart + bestLength).join(":")}`;
    }
    function normalizeIp(ip, ipv6SubnetPrefix = exports.DEFAULT_IPV6_SUBNET_PREFIX) {
      if (typeof ip !== "string" || ip.length === 0) {
        return ip;
      }
      const zoneIndex = ip.indexOf("%");
      const bare = zoneIndex === -1 ? ip : ip.slice(0, zoneIndex);
      const version = (0, net_1.isIP)(bare);
      if (version === 4) {
        return bare;
      }
      if (version !== 6) {
        return ip;
      }
      const hextets = toHextets(bare.toLowerCase());
      if (!hextets) {
        return ip;
      }
      const isLoopback = hextets[7] === 1 && hextets.slice(0, 7).every((hextet) => hextet === 0);
      if (isLoopback) {
        return "::1";
      }
      const isIpv4Mapped = hextets[0] === 0 && hextets[1] === 0 && hextets[2] === 0 && hextets[3] === 0 && hextets[4] === 0 && hextets[5] === 65535;
      if (isIpv4Mapped) {
        return [hextets[6] >> 8, hextets[6] & 255, hextets[7] >> 8, hextets[7] & 255].join(".");
      }
      const prefix = Number.isFinite(ipv6SubnetPrefix) ? Math.min(Math.max(Math.trunc(ipv6SubnetPrefix), 0), 128) : exports.DEFAULT_IPV6_SUBNET_PREFIX;
      return `${formatIpv6(maskHextets(hextets, prefix))}/${prefix}`;
    }
  }
});

// node_modules/@nestjs/throttler/dist/throttler-module-options.interface.js
var require_throttler_module_options_interface = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler-module-options.interface.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@nestjs/throttler/dist/throttler-storage.interface.js
var require_throttler_storage_interface = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler-storage.interface.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ThrottlerStorage = void 0;
    exports.ThrottlerStorage = /* @__PURE__ */ Symbol("ThrottlerStorage");
  }
});

// node_modules/@nestjs/throttler/dist/throttler.constants.js
var require_throttler_constants = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler.constants.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.THROTTLER_SKIP = exports.THROTTLER_OPTIONS = exports.THROTTLER_KEY_GENERATOR = exports.THROTTLER_BLOCK_DURATION = exports.THROTTLER_TRACKER = exports.THROTTLER_TTL = exports.THROTTLER_LIMIT = void 0;
    exports.THROTTLER_LIMIT = "THROTTLER:LIMIT";
    exports.THROTTLER_TTL = "THROTTLER:TTL";
    exports.THROTTLER_TRACKER = "THROTTLER:TRACKER";
    exports.THROTTLER_BLOCK_DURATION = "THROTTLER:BLOCK_DURATION";
    exports.THROTTLER_KEY_GENERATOR = "THROTTLER:KEY_GENERATOR";
    exports.THROTTLER_OPTIONS = "THROTTLER:MODULE_OPTIONS";
    exports.THROTTLER_SKIP = "THROTTLER:SKIP";
  }
});

// node_modules/@nestjs/throttler/dist/throttler.service.js
var require_throttler_service = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler.service.js"(exports) {
    "use strict";
    var __decorate = exports && exports.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ThrottlerStorageService = exports.DEFAULT_SWEEP_INTERVAL = void 0;
    var common_1 = _nestjsCommon;
    var async_hooks_1 = __require("async_hooks");
    exports.DEFAULT_SWEEP_INTERVAL = 6e4;
    var ThrottlerStorageService = class ThrottlerStorageService {
      constructor() {
        this._storage = /* @__PURE__ */ new Map();
        this.hitExpirations = /* @__PURE__ */ new Map();
        this.sweepIntervalMs = exports.DEFAULT_SWEEP_INTERVAL;
        this.startSweep = async_hooks_1.AsyncResource.bind(() => {
          var _a, _b;
          this.sweepInterval = setInterval(() => this.evictIdleRecords(), this.sweepIntervalMs);
          (_b = (_a = this.sweepInterval).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
        });
      }
      ensureSweep() {
        if (this.sweepInterval) {
          return;
        }
        this.startSweep();
      }
      get storage() {
        return this._storage;
      }
      evictIdleRecords(now = Date.now()) {
        for (const [key, record] of this._storage) {
          if (record.isBlocked && record.blockExpiresAt > now) {
            continue;
          }
          if (record.expiresAt > now) {
            continue;
          }
          if (this.hasLiveHits(key, now)) {
            continue;
          }
          this.hitExpirations.delete(key);
          this._storage.delete(key);
        }
      }
      hasLiveHits(key, now) {
        const expirations = this.hitExpirations.get(key);
        if (!expirations) {
          return false;
        }
        for (const hits of expirations.values()) {
          if (hits.some((expiresAt) => expiresAt > now)) {
            return true;
          }
        }
        return false;
      }
      getHitExpirations(key, throttlerName) {
        let expirations = this.hitExpirations.get(key);
        if (!expirations) {
          expirations = /* @__PURE__ */ new Map();
          this.hitExpirations.set(key, expirations);
        }
        let hits = expirations.get(throttlerName);
        if (!hits) {
          hits = [];
          expirations.set(throttlerName, hits);
        }
        return hits;
      }
      pruneExpiredHits(key, throttlerName, now = Date.now()) {
        const hits = this.getHitExpirations(key, throttlerName).filter((expiresAt) => expiresAt > now);
        this.hitExpirations.get(key).set(throttlerName, hits);
        this.storage.get(key).totalHits.set(throttlerName, hits.length);
      }
      getExpirationTime(key) {
        return Math.ceil((this.storage.get(key).expiresAt - Date.now()) / 1e3);
      }
      getBlockExpirationTime(key) {
        return Math.ceil((this.storage.get(key).blockExpiresAt - Date.now()) / 1e3);
      }
      resetBlockedRequest(key, throttlerName) {
        this.storage.get(key).isBlocked = false;
        this.storage.get(key).totalHits.set(throttlerName, 0);
        this.hitExpirations.get(key).set(throttlerName, []);
      }
      fireHitCount(key, throttlerName, ttl) {
        const { totalHits } = this.storage.get(key);
        totalHits.set(throttlerName, totalHits.get(throttlerName) + 1);
        this.getHitExpirations(key, throttlerName).push(Date.now() + ttl);
      }
      incrementWithoutBlock(key, ttlMilliseconds, limit, throttlerName, timeToExpire) {
        const { totalHits } = this.storage.get(key);
        const isBlocked = totalHits.get(throttlerName) >= limit;
        if (!isBlocked) {
          this.fireHitCount(key, throttlerName, ttlMilliseconds);
        }
        const hits = this.getHitExpirations(key, throttlerName);
        const timeToBlockExpire = hits.length ? Math.ceil((Math.min(...hits) - Date.now()) / 1e3) : timeToExpire;
        return {
          totalHits: totalHits.get(throttlerName) + (isBlocked ? 1 : 0),
          timeToExpire,
          isBlocked,
          timeToBlockExpire: isBlocked ? timeToBlockExpire : 0
        };
      }
      async increment(key, ttl, limit, blockDuration, throttlerName) {
        const ttlMilliseconds = ttl;
        const blockDurationMilliseconds = blockDuration;
        this.ensureSweep();
        if (!this.storage.has(key)) {
          this.storage.set(key, {
            totalHits: /* @__PURE__ */ new Map([[throttlerName, 0]]),
            expiresAt: Date.now() + ttlMilliseconds,
            blockExpiresAt: 0,
            isBlocked: false
          });
        }
        this.pruneExpiredHits(key, throttlerName);
        let timeToExpire = this.getExpirationTime(key);
        if (timeToExpire <= 0) {
          this.storage.get(key).expiresAt = Date.now() + ttlMilliseconds;
          timeToExpire = this.getExpirationTime(key);
        }
        if (blockDurationMilliseconds <= 0) {
          return this.incrementWithoutBlock(key, ttlMilliseconds, limit, throttlerName, timeToExpire);
        }
        if (!this.storage.get(key).isBlocked) {
          this.fireHitCount(key, throttlerName, ttlMilliseconds);
        }
        if (this.storage.get(key).totalHits.get(throttlerName) > limit && !this.storage.get(key).isBlocked) {
          this.storage.get(key).isBlocked = true;
          this.storage.get(key).blockExpiresAt = Date.now() + blockDurationMilliseconds;
        }
        const timeToBlockExpire = this.getBlockExpirationTime(key);
        if (timeToBlockExpire <= 0 && this.storage.get(key).isBlocked) {
          this.resetBlockedRequest(key, throttlerName);
          this.fireHitCount(key, throttlerName, ttlMilliseconds);
        }
        return {
          totalHits: this.storage.get(key).totalHits.get(throttlerName),
          timeToExpire,
          isBlocked: this.storage.get(key).isBlocked,
          timeToBlockExpire
        };
      }
      onApplicationShutdown() {
        if (this.sweepInterval) {
          clearInterval(this.sweepInterval);
          this.sweepInterval = void 0;
        }
        this.hitExpirations.clear();
        this._storage.clear();
      }
    };
    exports.ThrottlerStorageService = ThrottlerStorageService;
    exports.ThrottlerStorageService = ThrottlerStorageService = __decorate([
      (0, common_1.Injectable)()
    ], ThrottlerStorageService);
  }
});

// node_modules/@nestjs/throttler/dist/throttler.providers.js
var require_throttler_providers = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler.providers.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getStorageToken = exports.getOptionsToken = exports.ThrottlerStorageProvider = void 0;
    exports.createThrottlerProviders = createThrottlerProviders;
    var throttler_storage_interface_1 = require_throttler_storage_interface();
    var throttler_constants_1 = require_throttler_constants();
    var throttler_service_1 = require_throttler_service();
    function createThrottlerProviders(options) {
      return [
        {
          provide: throttler_constants_1.THROTTLER_OPTIONS,
          useValue: options
        }
      ];
    }
    exports.ThrottlerStorageProvider = {
      provide: throttler_storage_interface_1.ThrottlerStorage,
      useFactory: (options) => {
        return !Array.isArray(options) && options.storage ? options.storage : new throttler_service_1.ThrottlerStorageService();
      },
      inject: [throttler_constants_1.THROTTLER_OPTIONS]
    };
    var getOptionsToken = () => throttler_constants_1.THROTTLER_OPTIONS;
    exports.getOptionsToken = getOptionsToken;
    var getStorageToken = () => throttler_storage_interface_1.ThrottlerStorage;
    exports.getStorageToken = getStorageToken;
  }
});

// node_modules/@nestjs/throttler/dist/throttler.decorator.js
var require_throttler_decorator = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler.decorator.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.InjectThrottlerStorage = exports.InjectThrottlerOptions = exports.SkipThrottle = exports.Throttle = void 0;
    var common_1 = _nestjsCommon;
    var throttler_constants_1 = require_throttler_constants();
    var throttler_providers_1 = require_throttler_providers();
    function setThrottlerMetadata(target, options) {
      for (const name in options) {
        Reflect.defineMetadata(throttler_constants_1.THROTTLER_TTL + name, options[name].ttl, target);
        Reflect.defineMetadata(throttler_constants_1.THROTTLER_LIMIT + name, options[name].limit, target);
        Reflect.defineMetadata(throttler_constants_1.THROTTLER_BLOCK_DURATION + name, options[name].blockDuration, target);
        Reflect.defineMetadata(throttler_constants_1.THROTTLER_TRACKER + name, options[name].getTracker, target);
        Reflect.defineMetadata(throttler_constants_1.THROTTLER_KEY_GENERATOR + name, options[name].generateKey, target);
      }
    }
    var Throttle = (options) => {
      return (target, propertyKey, descriptor) => {
        if (descriptor) {
          setThrottlerMetadata(descriptor.value, options);
          return descriptor;
        }
        setThrottlerMetadata(target, options);
        return target;
      };
    };
    exports.Throttle = Throttle;
    var SkipThrottle = (skip = { default: true }) => {
      return (target, propertyKey, descriptor) => {
        var _a;
        const reflectionTarget = (_a = descriptor === null || descriptor === void 0 ? void 0 : descriptor.value) !== null && _a !== void 0 ? _a : target;
        for (const key in skip) {
          Reflect.defineMetadata(throttler_constants_1.THROTTLER_SKIP + key, skip[key], reflectionTarget);
        }
        return descriptor !== null && descriptor !== void 0 ? descriptor : target;
      };
    };
    exports.SkipThrottle = SkipThrottle;
    var InjectThrottlerOptions = () => (0, common_1.Inject)((0, throttler_providers_1.getOptionsToken)());
    exports.InjectThrottlerOptions = InjectThrottlerOptions;
    var InjectThrottlerStorage = () => (0, common_1.Inject)((0, throttler_providers_1.getStorageToken)());
    exports.InjectThrottlerStorage = InjectThrottlerStorage;
  }
});

// node_modules/@nestjs/throttler/dist/throttler.exception.js
var require_throttler_exception = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler.exception.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ThrottlerException = exports.throttlerMessage = void 0;
    var common_1 = _nestjsCommon;
    exports.throttlerMessage = "ThrottlerException: Too Many Requests";
    var ThrottlerException = class extends common_1.HttpException {
      constructor(message) {
        super(`${message || exports.throttlerMessage}`, common_1.HttpStatus.TOO_MANY_REQUESTS);
      }
    };
    exports.ThrottlerException = ThrottlerException;
  }
});

// node_modules/@nestjs/throttler/dist/hash.js
var require_hash = __commonJS({
  "node_modules/@nestjs/throttler/dist/hash.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.sha256 = sha256;
    var crypto = __require("node:crypto");
    function sha256(text) {
      return crypto.createHash("sha256").update(text).digest("hex");
    }
  }
});

// node_modules/@nestjs/throttler/dist/throttler.guard.js
var require_throttler_guard = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler.guard.js"(exports) {
    "use strict";
    var __decorate = exports && exports.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var __metadata = exports && exports.__metadata || function(k, v) {
      if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
    };
    var __param = exports && exports.__param || function(paramIndex, decorator) {
      return function(target, key) {
        decorator(target, key, paramIndex);
      };
    };
    var ThrottlerGuard_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ThrottlerGuard = void 0;
    var common_1 = _nestjsCommon;
    var core_1 = _nestjsCore;
    var hash_1 = require_hash();
    var ip_1 = require_ip();
    var throttler_storage_interface_1 = require_throttler_storage_interface();
    var throttler_constants_1 = require_throttler_constants();
    var throttler_decorator_1 = require_throttler_decorator();
    var throttler_exception_1 = require_throttler_exception();
    var ThrottlerGuard = ThrottlerGuard_1 = class ThrottlerGuard {
      constructor(options, storageService, reflector) {
        this.options = options;
        this.storageService = storageService;
        this.reflector = reflector;
        this.headerPrefix = "X-RateLimit";
        this.logger = new common_1.Logger(ThrottlerGuard_1.name);
        this.errorMessage = throttler_exception_1.throttlerMessage;
        this.ipv6SubnetPrefix = ip_1.DEFAULT_IPV6_SUBNET_PREFIX;
      }
      async onModuleInit() {
        var _a, _b, _c;
        var _d, _e;
        this.throttlers = (Array.isArray(this.options) ? this.options : this.options.throttlers).sort((first, second) => {
          if (typeof first.ttl === "function") {
            return 1;
          }
          if (typeof second.ttl === "function") {
            return 0;
          }
          return first.ttl - second.ttl;
        }).map((opt) => {
          var _a2;
          return Object.assign(Object.assign({}, opt), { name: (_a2 = opt.name) !== null && _a2 !== void 0 ? _a2 : "default" });
        });
        if (!this.throttlers.length) {
          this.logger.warn("No throttlers are configured, so no request is limited. Provide at least one entry to ThrottlerModule.forRoot() or return one from ThrottlerModule.forRootAsync().");
        }
        if (Array.isArray(this.options)) {
          this.commonOptions = {};
        } else {
          this.commonOptions = {
            skipIf: this.options.skipIf,
            ignoreUserAgents: this.options.ignoreUserAgents,
            getTracker: this.options.getTracker,
            generateKey: this.options.generateKey,
            setHeaders: this.options.setHeaders
          };
          this.ipv6SubnetPrefix = (_a = this.options.ipv6SubnetPrefix) !== null && _a !== void 0 ? _a : ip_1.DEFAULT_IPV6_SUBNET_PREFIX;
        }
        (_b = (_d = this.commonOptions).getTracker) !== null && _b !== void 0 ? _b : _d.getTracker = this.getTracker.bind(this);
        (_c = (_e = this.commonOptions).generateKey) !== null && _c !== void 0 ? _c : _e.generateKey = this.generateKey.bind(this);
      }
      async canActivate(context) {
        var _a;
        const handler = context.getHandler();
        const classRef = context.getClass();
        if (await this.shouldSkip(context)) {
          return true;
        }
        const continues = [];
        for (const namedThrottler of this.throttlers) {
          const skip = this.reflector.getAllAndOverride(throttler_constants_1.THROTTLER_SKIP + namedThrottler.name, [
            handler,
            classRef
          ]);
          const skipIf = namedThrottler.skipIf || this.commonOptions.skipIf;
          if (skip || (skipIf === null || skipIf === void 0 ? void 0 : skipIf(context))) {
            continues.push(true);
            continue;
          }
          const routeOrClassLimit = this.reflector.getAllAndOverride(throttler_constants_1.THROTTLER_LIMIT + namedThrottler.name, [handler, classRef]);
          const routeOrClassTtl = this.reflector.getAllAndOverride(throttler_constants_1.THROTTLER_TTL + namedThrottler.name, [handler, classRef]);
          const routeOrClassBlockDuration = this.reflector.getAllAndOverride(throttler_constants_1.THROTTLER_BLOCK_DURATION + namedThrottler.name, [handler, classRef]);
          const routeOrClassGetTracker = this.reflector.getAllAndOverride(throttler_constants_1.THROTTLER_TRACKER + namedThrottler.name, [handler, classRef]);
          const routeOrClassGetKeyGenerator = this.reflector.getAllAndOverride(throttler_constants_1.THROTTLER_KEY_GENERATOR + namedThrottler.name, [handler, classRef]);
          const limit = this.toNumber(await this.resolveValue(context, routeOrClassLimit !== null && routeOrClassLimit !== void 0 ? routeOrClassLimit : namedThrottler.limit), "limit", namedThrottler.name);
          const ttl = this.toNumber(await this.resolveValue(context, routeOrClassTtl !== null && routeOrClassTtl !== void 0 ? routeOrClassTtl : namedThrottler.ttl), "ttl", namedThrottler.name);
          const blockDuration = this.toNumber(await this.resolveValue(context, (_a = routeOrClassBlockDuration !== null && routeOrClassBlockDuration !== void 0 ? routeOrClassBlockDuration : namedThrottler.blockDuration) !== null && _a !== void 0 ? _a : ttl), "blockDuration", namedThrottler.name);
          const getTracker = routeOrClassGetTracker || namedThrottler.getTracker || this.commonOptions.getTracker;
          const generateKey = routeOrClassGetKeyGenerator || namedThrottler.generateKey || this.commonOptions.generateKey;
          continues.push(await this.handleRequest({
            context,
            limit,
            ttl,
            throttler: namedThrottler,
            blockDuration,
            getTracker,
            generateKey
          }));
        }
        return continues.every((cont) => cont);
      }
      async shouldSkip(_context) {
        return false;
      }
      async handleRequest(requestProps) {
        var _a, _b, _c;
        const { context, limit, ttl, throttler, blockDuration, getTracker, generateKey } = requestProps;
        const { req, res } = this.getRequestResponse(context);
        const ignoreUserAgents = (_a = throttler.ignoreUserAgents) !== null && _a !== void 0 ? _a : this.commonOptions.ignoreUserAgents;
        if (Array.isArray(ignoreUserAgents)) {
          for (const pattern of ignoreUserAgents) {
            if (pattern.test(req.headers["user-agent"])) {
              return true;
            }
          }
        }
        const tracker = await getTracker(req, context);
        const key = generateKey(context, tracker, throttler.name);
        const { totalHits, timeToExpire, isBlocked, timeToBlockExpire } = await this.storageService.increment(key, ttl, limit, blockDuration, throttler.name);
        const getThrottlerSuffix = (name) => name === "default" ? "" : `-${name}`;
        const setHeaders = (_c = (_b = throttler.setHeaders) !== null && _b !== void 0 ? _b : this.commonOptions.setHeaders) !== null && _c !== void 0 ? _c : true;
        if (isBlocked) {
          if (setHeaders) {
            this.setResponseHeader(res, `Retry-After${getThrottlerSuffix(throttler.name)}`, timeToBlockExpire);
          }
          await this.throwThrottlingException(context, {
            limit,
            ttl,
            key,
            tracker,
            totalHits,
            timeToExpire,
            isBlocked,
            timeToBlockExpire
          });
        }
        if (setHeaders) {
          this.setResponseHeader(res, `${this.headerPrefix}-Limit${getThrottlerSuffix(throttler.name)}`, limit);
          this.setResponseHeader(res, `${this.headerPrefix}-Remaining${getThrottlerSuffix(throttler.name)}`, Math.max(0, limit - totalHits));
          this.setResponseHeader(res, `${this.headerPrefix}-Reset${getThrottlerSuffix(throttler.name)}`, timeToExpire);
        }
        return true;
      }
      async getTracker(req) {
        return (0, ip_1.normalizeIp)(req.ip, this.ipv6SubnetPrefix);
      }
      setResponseHeader(res, name, value) {
        if (typeof res.header === "function") {
          res.header(name, value);
        } else if (typeof res.setHeader === "function") {
          res.setHeader(name, value);
        }
      }
      getRequestResponse(context) {
        const http = context.switchToHttp();
        return { req: http.getRequest(), res: http.getResponse() };
      }
      generateKey(context, suffix, name) {
        const prefix = `${context.getClass().name}-${context.getHandler().name}-${name}`;
        return (0, hash_1.sha256)(`${prefix}-${suffix}`);
      }
      async throwThrottlingException(context, throttlerLimitDetail) {
        throw new throttler_exception_1.ThrottlerException(await this.getErrorMessage(context, throttlerLimitDetail));
      }
      async getErrorMessage(context, throttlerLimitDetail) {
        if (!Array.isArray(this.options)) {
          if (!this.options.errorMessage)
            return this.errorMessage;
          return typeof this.options.errorMessage === "function" ? this.options.errorMessage(context, throttlerLimitDetail) : this.options.errorMessage;
        }
        return this.errorMessage;
      }
      toNumber(value, option, throttlerName) {
        const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
        if (typeof number !== "number" || Number.isNaN(number)) {
          throw new Error(`Invalid "${option}" for the "${throttlerName}" throttler: expected a number, got ${JSON.stringify(value)}.`);
        }
        return number;
      }
      async resolveValue(context, resolvableValue) {
        return typeof resolvableValue === "function" ? resolvableValue(context) : resolvableValue;
      }
    };
    exports.ThrottlerGuard = ThrottlerGuard;
    exports.ThrottlerGuard = ThrottlerGuard = ThrottlerGuard_1 = __decorate([
      (0, common_1.Injectable)(),
      __param(0, (0, throttler_decorator_1.InjectThrottlerOptions)()),
      __param(1, (0, throttler_decorator_1.InjectThrottlerStorage)()),
      __metadata("design:paramtypes", [Object, Object, core_1.Reflector])
    ], ThrottlerGuard);
  }
});

// node_modules/@nestjs/throttler/dist/throttler.guard.interface.js
var require_throttler_guard_interface = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler.guard.interface.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
  }
});

// node_modules/@nestjs/throttler/dist/throttler.module.js
var require_throttler_module = __commonJS({
  "node_modules/@nestjs/throttler/dist/throttler.module.js"(exports) {
    "use strict";
    var __decorate = exports && exports.__decorate || function(decorators, target, key, desc) {
      var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
      if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
      else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
      return c > 3 && r && Object.defineProperty(target, key, r), r;
    };
    var ThrottlerModule_1;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ThrottlerModule = void 0;
    var common_1 = _nestjsCommon;
    var throttler_constants_1 = require_throttler_constants();
    var throttler_providers_1 = require_throttler_providers();
    var ThrottlerModule = ThrottlerModule_1 = class ThrottlerModule {
      static forRoot(options = []) {
        const providers = [...(0, throttler_providers_1.createThrottlerProviders)(options), throttler_providers_1.ThrottlerStorageProvider];
        return {
          module: ThrottlerModule_1,
          providers,
          exports: providers
        };
      }
      static forRootAsync(options) {
        const providers = [...this.createAsyncProviders(options), throttler_providers_1.ThrottlerStorageProvider];
        return {
          module: ThrottlerModule_1,
          imports: options.imports || [],
          providers,
          exports: providers
        };
      }
      static createAsyncProviders(options) {
        if (options.useExisting || options.useFactory) {
          return [this.createAsyncOptionsProvider(options)];
        }
        return [
          this.createAsyncOptionsProvider(options),
          {
            provide: options.useClass,
            useClass: options.useClass
          }
        ];
      }
      static createAsyncOptionsProvider(options) {
        if (options.useFactory) {
          return {
            provide: throttler_constants_1.THROTTLER_OPTIONS,
            useFactory: options.useFactory,
            inject: options.inject || []
          };
        }
        return {
          provide: throttler_constants_1.THROTTLER_OPTIONS,
          useFactory: async (optionsFactory) => await optionsFactory.createThrottlerOptions(),
          inject: [options.useExisting || options.useClass]
        };
      }
    };
    exports.ThrottlerModule = ThrottlerModule;
    exports.ThrottlerModule = ThrottlerModule = ThrottlerModule_1 = __decorate([
      (0, common_1.Global)(),
      (0, common_1.Module)({})
    ], ThrottlerModule);
  }
});

// node_modules/@nestjs/throttler/dist/utilities.js
var require_utilities = __commonJS({
  "node_modules/@nestjs/throttler/dist/utilities.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.weeks = exports.days = exports.hours = exports.minutes = exports.seconds = void 0;
    var seconds = (howMany) => howMany * 1e3;
    exports.seconds = seconds;
    var minutes = (howMany) => 60 * howMany * (0, exports.seconds)(1);
    exports.minutes = minutes;
    var hours = (howMany) => 60 * howMany * (0, exports.minutes)(1);
    exports.hours = hours;
    var days = (howMany) => 24 * howMany * (0, exports.hours)(1);
    exports.days = days;
    var weeks = (howMany) => 7 * howMany * (0, exports.days)(1);
    exports.weeks = weeks;
  }
});

// node_modules/@nestjs/throttler/dist/index.js
var require_index = __commonJS({
  "node_modules/@nestjs/throttler/dist/index.js"(exports) {
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getStorageToken = exports.getOptionsToken = void 0;
    __exportStar(require_ip(), exports);
    __exportStar(require_throttler_module_options_interface(), exports);
    __exportStar(require_throttler_storage_interface(), exports);
    __exportStar(require_throttler_decorator(), exports);
    __exportStar(require_throttler_exception(), exports);
    __exportStar(require_throttler_guard(), exports);
    __exportStar(require_throttler_guard_interface(), exports);
    __exportStar(require_throttler_module(), exports);
    var throttler_providers_1 = require_throttler_providers();
    Object.defineProperty(exports, "getOptionsToken", { enumerable: true, get: function() {
      return throttler_providers_1.getOptionsToken;
    } });
    Object.defineProperty(exports, "getStorageToken", { enumerable: true, get: function() {
      return throttler_providers_1.getStorageToken;
    } });
    __exportStar(require_throttler_service(), exports);
    __exportStar(require_utilities(), exports);
  }
});
const __throttlerExports = require_index();
export const {
  ThrottlerModule,
  ThrottlerGuard,
  Throttle,
  SkipThrottle,
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  getOptionsToken,
  getStorageToken,
} = __throttlerExports;
export default __throttlerExports;
