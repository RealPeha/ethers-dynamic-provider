import styled from "@emotion/styled";
import { useState } from "react";
import { strategies, StrategyId } from "./constants";
import { Strategy } from "./Strategy";
import { Button } from "./Button";

export const App: React.FC = () => {
  const [strategy, setStrategy] = useState<StrategyId>("fallback");

  return (
    <Wrapper>
      <Buttons>
        {Object.entries(strategies).map(([id, { name }]) => (
          <Button
            key={id}
            active={strategy === id}
            onClick={() => setStrategy(id as StrategyId)}
          >
            {name}
          </Button>
        ))}
      </Buttons>
      <Strategy id={strategy} />
    </Wrapper>
  );
};

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
`;

const Buttons = styled.div`
  display: flex;
  gap: 8px;
`;
