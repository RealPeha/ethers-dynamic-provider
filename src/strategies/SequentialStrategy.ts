import { JsonRpcPayload, JsonRpcResult } from "ethers";
import { Strategy } from "./Strategy";
import { RequestType } from "../types";
import { NoAvailableRPCError } from "../utils";

export interface SequentialStrategyOptions {
  requestsPerRpc: number;
}

export class SequentialStrategy extends Strategy {
  options: SequentialStrategyOptions;
  private index = {
    write: 0,
    read: 0,
  };
  private requestsForCurrentRpc = 0;

  constructor(options: Partial<SequentialStrategyOptions> = {}) {
    super();

    this.options = {
      requestsPerRpc: 5,
      ...options,
    };

    if (this.options.requestsPerRpc < 1) {
      throw new Error("requestsPerRpc should be greater than 0");
    }
  }

  private nextRpc(type: RequestType, max: number) {
    this.requestsForCurrentRpc = 0;
    this.index[type] = (this.index[type] + 1) % max;
  }

  async send(
    payload: JsonRpcPayload | JsonRpcPayload[],
    rpcs: string[]
  ): Promise<JsonRpcResult[]> {
    const type = this.provider.getRequestType(payload);
    const errors: any[] = [];
    const usedRpc = new Set<string>();

    while (true) {
      this.requestsForCurrentRpc += 1;

      // switch to the next rpc if the current rpc has reached the requests limit
      if (this.requestsForCurrentRpc > this.options.requestsPerRpc) {
        this.nextRpc(type, rpcs.length);
      }

      const index = this.index[type];
      const availableRpcs = this.provider
        .onlyFreeRpcs(rpcs)
        .filter((rpc) => !usedRpc.has(rpc));
      const rpc = rpcs[index];

      if (!rpc || !availableRpcs.length) {
        throw errors.length
          ? new AggregateError(errors)
          : new NoAvailableRPCError();
      }

      // skip jailed rpcs
      if (this.provider.isJailed(rpc)) {
        this.nextRpc(type, rpcs.length);
        continue;
      }

      try {
        const result = await this.provider.sendRequest(payload, rpc);

        return result;
      } catch (err) {
        errors.push(err);
        this.provider.jail(rpc, err);
        usedRpc.add(rpc);
        this.nextRpc(type, rpcs.length);
      }
    }
  }
}
