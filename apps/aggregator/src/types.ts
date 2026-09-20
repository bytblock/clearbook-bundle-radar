import type { UnifiedBundleEvent } from "@clearbook/bundle-schema";

export type EmitFn = (event: UnifiedBundleEvent) => void;

export interface Adapter {
  name: string;
  start(emit: EmitFn): void | Promise<void>;
  stop(): void | Promise<void>;
}
