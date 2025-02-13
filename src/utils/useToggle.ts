import { useState } from 'react';

export const useToggle = (defaultState?: boolean) => {
  const [toggleState, setToggleState] = useState(defaultState || false);

  const closeToggle = () => {
    setToggleState(false);
  };

  const openToggle = () => {
    setToggleState(true);
  };

  return { toggleState, closeToggle, openToggle };
};
