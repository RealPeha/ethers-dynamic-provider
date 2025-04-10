import React, { useEffect, useRef, useState } from "react";
import { rpcs, strategies, StrategyId } from "./constants";
import styled from "@emotion/styled";
import { Button } from "./Button";
import {
  DynamicProvider,
  Strategy as AbstractStrategy,
  HighestBlockStrategy,
} from "ethers-dynamic-provider";
import { Network } from "ethers";

interface StrategyProps {
  id: StrategyId;
}

const JAIL_DURATION = 5_000;

export const Strategy: React.FC<StrategyProps> = ({ id }) => {
  const [calls, setCalls] = useState<Record<string, number>>({});
  const [started, setStarted] = useState(false);
  const [strategy, setStrategy] = useState<AbstractStrategy>();
  const [provider, setProvider] = useState<DynamicProvider>();

  const intervalRef = useRef<NodeJS.Timeout>();

  const handleStart = () => {
    if (!provider) {
      return alert("Provider not initialized");
    }

    setStarted(true);

    intervalRef.current = setInterval(() => {
      provider.send("eth_blockNumber", []);
    }, 100);
  };

  const handleStop = () => {
    setStarted(false);
    clearInterval(intervalRef.current);

    if (strategy instanceof HighestBlockStrategy) {
      strategy.stop();
    }
  };

  const totalCalls = Object.values(calls).reduce(
    (sum, value) => sum + value,
    0
  );

  useEffect(() => {
    setStarted(false);
    setCalls({});

    const strategy = strategies[id].create();

    const network = new Network("unknown", 42161);
    const provider = new DynamicProvider(
      rpcs,
      {
        strategy,
        staticNetwork: network,
        batchMaxCount: 1,
        jailDuration: JAIL_DURATION,
        onRpcUsed: (rpc) => {
          setCalls((calls) => ({
            ...calls,
            [rpc]: (calls[rpc] ?? 0) + 1,
          }));
        },
      },
      network
    );

    setStrategy(strategy);
    setProvider(provider);
  }, [id]);

  return (
    <Wrapper>
      {rpcs.map((rpc) => (
        <Rpc
          url={rpc}
          calls={calls[rpc] ?? 0}
          totalCalls={totalCalls}
          jailed={provider?.isJailed(rpc)}
          jailedUntil={provider?.getJailUntil(rpc)}
        />
      ))}
      {started ? (
        <Button onClick={handleStop}>Stop</Button>
      ) : (
        <Button onClick={handleStart}>Start</Button>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

interface RpcProps {
  url: string;
  calls: number;
  totalCalls: number;
  jailed?: boolean;
  jailedUntil?: number;
}

const Rpc: React.FC<RpcProps> = ({
  url,
  calls,
  totalCalls,
  jailed = false,
  jailedUntil = 0,
}) => {
  const progress = calls / totalCalls;
  const jailRemaining = jailedUntil ? jailedUntil - Date.now() : 0;
  const jailProgress = jailRemaining / JAIL_DURATION;

  return (
    <RpcProgress
      progress={progress}
      jailed={jailed}
      jailProgress={jailProgress}
    >
      <RpcUrl>{url}</RpcUrl>
      <span>{calls}</span>
    </RpcProgress>
  );
};

const RpcProgress = styled.div<{
  progress: number;
  jailed: boolean;
  jailProgress: number;
}>`
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  padding: 2px 8px 2px 8px;
  position: relative;
  width: 500px;
  height: 24px;
  border: 1px solid black;
  border-radius: 4px;
  overflow: hidden;

  &:after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    transition: width 0.3s;
    width: ${({ progress }) => progress * 100}%;
    height: 100%;
    background-color: ${({ jailed }) => (jailed ? "tomato" : "green")};
    opacity: 0.3;
  }

  &:before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    transition: width 0.3s;
    width: ${({ jailProgress }) => jailProgress * 100}%;
    height: 100%;
    background-color: blue;
    opacity: 0.05;
  }
`;

const RpcUrl = styled.div`
  max-width: 80%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: gray;
`;
