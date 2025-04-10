import { JsonRpcPayload, JsonRpcResult } from "ethers";
import { Strategy } from "./Strategy";
import { isCancelled, NoAvailableRPCError } from "../utils";

export interface HighestBlockStrategyOptions {
  syncInterval: number;
}

export class HighestBlockStrategy extends Strategy {
  options: HighestBlockStrategyOptions;
  blocks: Partial<Record<string, number>> = {};

  private intervalId: NodeJS.Timeout | null = null;
  private syncPromise: Promise<any> | null = null;

  constructor(options: Partial<HighestBlockStrategyOptions> = {}) {
    super();

    this.options = {
      syncInterval: 10_000,
      ...options,
    };
  }

  private start(rpcs: string[]) {
    if (!this.intervalId) {
      this.sync(rpcs);

      this.intervalId = setInterval(() => {
        this.sync(rpcs);
      }, this.options.syncInterval);
    }

    return this.syncPromise;
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  sync(rpcs: string[]) {
    if (!this.provider) {
      throw new Error("Provider is not set");
    }

    this.syncPromise = Promise.all(
      this.provider.onlyFreeRpcs(rpcs).map(async (rpc) => {
        try {
          const [blockNumber] = await this.provider.sendRequest(
            {
              method: "eth_blockNumber",
              params: [],
              jsonrpc: "2.0",
              id: 1,
            },
            rpc,
            1_000
          );
          this.blocks[rpc] = Number(blockNumber.result);
        } catch (err: any) {
          if (!isCancelled(err)) {
            this.provider.jail(rpc, err);
          }
        }
      })
    );

    return this.syncPromise;
  }

  async send(
    payload: JsonRpcPayload | JsonRpcPayload[],
    rpcs: string[]
  ): Promise<JsonRpcResult[]> {
    await this.start(rpcs);

    const errors: any[] = [];
    const usedRpc = new Set<string>();

    while (true) {
      let maxBlock = -1;
      let index = -1;

      rpcs.forEach((rpc, i) => {
        if (usedRpc.has(rpc) || this.provider.isJailed(rpc)) {
          return;
        }

        const block = this.blocks[rpc] ?? 0;

        if (block > maxBlock) {
          maxBlock = block;
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
        const result = await this.provider.sendRequest(payload, rpc);

        return result;
      } catch (err) {
        errors.push(err);
        this.provider.jail(rpc, err);
        usedRpc.add(rpc);
      }
    }
  }
}
