import { JsonRpcPayload, JsonRpcResult } from "ethers";
import { type DynamicProvider } from "../DynamicProvider";

export abstract class Strategy {
  protected provider!: DynamicProvider;
  setProvider(provider: DynamicProvider): void {
    if (this.provider && this.provider !== provider) {
      throw new Error("This strategy is already used by another provider");
    }

    this.provider = provider;
  }

  abstract send(
    payload: JsonRpcPayload | JsonRpcPayload[],
    rpcs: string[]
  ): Promise<JsonRpcResult[]>;
}
