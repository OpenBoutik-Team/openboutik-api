import { Injectable } from '@nestjs/common';

export class ThrottlerModule {
  static forRoot(options = []) {
    return {
      module: ThrottlerModule,
      providers: [],
      exports: [],
    };
  }
  static forRootAsync(options) {
    return {
      module: ThrottlerModule,
      providers: [],
      exports: [],
    };
  }
}

export class ThrottlerGuard {
  canActivate() {
    return true;
  }
}

export const Throttle = () => (target, key, descriptor) => descriptor || target;
export const SkipThrottle = () => (target, key, descriptor) => descriptor || target;
export const InjectThrottlerOptions = () => () => {};
export const InjectThrottlerStorage = () => () => {};
export const getOptionsToken = () => 'THROTTLER_OPTIONS';
export const getStorageToken = () => 'THROTTLER_STORAGE';

export default {
  ThrottlerModule,
  ThrottlerGuard,
  Throttle,
  SkipThrottle,
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  getOptionsToken,
  getStorageToken,
};
