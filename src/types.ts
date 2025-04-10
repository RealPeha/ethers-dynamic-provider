import type { JsonRpcApiProviderOptions } from "ethers";
import type { Strategy } from "./strategies";

export type RequestType = "read" | "write";

export interface MulticallOptions {
  maxDataLength?: number;
  cache?: boolean;
}

export interface DynamicProviderOptions extends JsonRpcApiProviderOptions {
  strategy:
    | Strategy
    | {
        read: Strategy;
        write: Strategy;
      };
  multicall?: boolean | MulticallOptions;
  jailDuration?: number | ((err: any, rpc: string) => number);
  requestTimeout?: number;
  onRpcUsed?: (rpc: string) => void;
}
