import { JsonRpcPayload, JsonRpcResult } from "ethers";
import { Strategy } from "./Strategy";
import { NoAvailableRPCError } from "../utils";

export interface DynamicStrategyOptions {
  historyDepth: number;
}

export class DynamicStrategy extends Strategy {
  options: DynamicStrategyOptions;
  latencies: Partial<Record<string, number[]>> = {};

  constructor(options: Partial<DynamicStrategyOptions> = {}) {
    super();

    this.options = {
      historyDepth: 5,
      ...options,
    };
  }

  async send(
    payload: JsonRpcPayload | JsonRpcPayload[],
    rpcs: string[]
  ): Promise<JsonRpcResult[]> {
    const errors: any[] = [];
    const usedRpc = new Set<string>();

    while (true) {
      let minLatency = Infinity;
      let index = -1;

      rpcs.forEach((rpc, i) => {
        if (usedRpc.has(rpc) || this.provider.isJailed(rpc)) {
          return;
        }

        const latencies = this.latencies[rpc] ?? [];
        const latency =
          latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);

        if (latency < minLatency) {
          minLatency = latency;
          index = i;
        }
      });

      if (index === -1) {
        throw errors.length
          ? new AggregateError(errors)
          : new NoAvailableRPCError();
      }

      const rpc = rpcs[index];

      try {
        const start = Date.now();
        const result = await this.provider.sendRequest(payload, rpc);
        const end = Date.now();

        this.latencies[rpc] ??= [];
        this.latencies[rpc].push(end - start);
        if (this.latencies[rpc].length > this.options.historyDepth) {
          this.latencies[rpc].shift();
        }

        return result;
      } catch (err) {
        errors.push(err);
        this.provider.jail(rpc, err);
        usedRpc.add(rpc);
      }
    }
  }
}
