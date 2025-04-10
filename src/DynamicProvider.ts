import {
  FetchRequest,
  JsonRpcApiProvider,
  JsonRpcPayload,
  JsonRpcResult,
  Networkish,
} from "ethers";
import { MulticallWrapper } from "ethers-multicall-provider";
import { DynamicProviderOptions, RequestType } from "./types";
import { Strategy } from "./strategies/Strategy";

export class DynamicProvider extends JsonRpcApiProvider {
  #strategy: {
    read: Strategy;
    write: Strategy;
  };
  #rpcs: {
    read: string[];
    write: string[];
  };

  #jail: Partial<Record<string, number>> = {};
  #jailDuration: number | ((err: any, rpc: string) => number) = 0;

  #requestTimeout: number;
  #onRpcUsed?: (rpc: string) => void;

  constructor(
    rpcs:
      | string[]
      | {
          read: string[];
          write: string[];
        },
    options: DynamicProviderOptions,
    network?: Networkish
  ) {
    super(network, options);

    this.#rpcs = Array.isArray(rpcs) ? { read: rpcs, write: rpcs } : rpcs;

    if (!this.#rpcs.read.length || !this.#rpcs.write.length) {
      throw new Error("No RPCs provided for read or write requests");
    }

    this.#strategy =
      options.strategy instanceof Strategy
        ? { read: options.strategy, write: options.strategy }
        : options.strategy;

    this.#jailDuration = options.jailDuration ?? 10_000;
    this.#requestTimeout = options.requestTimeout ?? 10_000;
    this.#onRpcUsed = options.onRpcUsed;

    this.#strategy.read.setProvider(this);
    this.#strategy.write.setProvider(this);

    if (options.multicall) {
      const { maxDataLength, cache } =
        options.multicall === true ? {} : options.multicall;

      return MulticallWrapper.wrap(this, maxDataLength, cache);
    }

    return this;
  }

  async send(
    method: string,
    params: any[] | Record<string, any>
  ): Promise<any> {
    // All requests are over HTTP, so we can just start handling requests
    // We do this here rather than the constructor so that we don't send any
    // requests to the network (i.e. eth_chainId) until we absolutely have to.
    await this._start();

    return await super.send(method, params);
  }

  async _send(
    payload: JsonRpcPayload | JsonRpcPayload[]
  ): Promise<JsonRpcResult[]> {
    const type = this.getRequestType(payload);
    const strategy = this.#strategy[type];
    const rpcs = this.#rpcs[type];

    await this.waitForRpc(rpcs);

    return strategy.send(payload, rpcs);
  }

  getRequestType(payload: JsonRpcPayload | JsonRpcPayload[]): RequestType {
    const payloads = Array.isArray(payload) ? payload : [payload];
    const isSend = payloads.some((p) => p.method === "eth_sendRawTransaction");

    return isSend ? "write" : "read";
  }

  private async waitForRpc(rpcs: string[]) {
    const now = Date.now();

    const allJailed = rpcs.every((rpc) => this.isJailed(rpc));

    if (allJailed) {
      let nearestJailTime = Infinity;

      for (const rpc of rpcs) {
        const jailTime = this.#jail[rpc];

        if (jailTime && jailTime < nearestJailTime) {
          nearestJailTime = jailTime;
        }
      }

      const timeToWait = nearestJailTime - now;

      await new Promise((resolve) => setTimeout(resolve, timeToWait));
    }

    return Promise.resolve();
  }

  createRequest(
    payload: JsonRpcPayload | JsonRpcPayload[],
    rpc: string,
    timeout = this.#requestTimeout
  ): FetchRequest {
    const request = new FetchRequest(rpc);
    request.body = JSON.stringify(payload);
    request.timeout = timeout;
    request.setHeader("content-type", "application/json");

    this.#onRpcUsed?.(rpc);

    return request;
  }

  async sendRequest(
    payload: JsonRpcPayload | JsonRpcPayload[],
    rpc: string,
    timeout?: number
  ): Promise<JsonRpcResult[]> {
    const request = this.createRequest(payload, rpc, timeout);
    const response = await request.send();
    response.assertOk();

    const result = response.bodyJson;

    return Array.isArray(result) ? result : [result];
  }

  onlyFreeRpcs(rpcs: string[]) {
    return rpcs.filter((rpc) => !this.isJailed(rpc));
  }

  isJailed(rpc: string) {
    if (this.#jail[rpc]) {
      return this.#jail[rpc] > Date.now();
    }

    return false;
  }

  getJailUntil(rpc: string) {
    return this.#jail[rpc];
  }

  jail(rpc: string, error: any) {
    if (this.#jailDuration) {
      const duration =
        typeof this.#jailDuration === "function"
          ? this.#jailDuration(error, rpc)
          : this.#jailDuration;

      this.#jail[rpc] = Date.now() + duration;
    }
  }
}
