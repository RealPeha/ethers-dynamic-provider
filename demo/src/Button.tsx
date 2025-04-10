import styled from "@emotion/styled";

export const Button = styled.button<{ active?: boolean }>`
  all: unset;
  cursor: pointer;
  border: 2px solid black;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 16px;
  min-width: 100px;
  text-align: center;
  background-color: white;
  transition: background-color 0.3s, color 0.3s;

  :hover {
    background-color: black;
    color: white;
  }

  ${({ active }) =>
    active &&
    `
    background-color: black;
    color: white;
  `}
`;
