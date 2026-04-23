'use client';

import React from 'react';

// ----------------------------------------------------------------------

interface ReturnType {
  value: boolean;
  onTrue: () => void;
  onFalse: () => void;
  onToggle: () => void;
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
}

// ----------------------------------------------------------------------

export function useBoolean(defaultValue?: boolean): ReturnType {
  const [value, setValue] = React.useState(!!defaultValue);

  const onTrue = React.useCallback(() => {
    setValue(true);
  }, []);

  const onFalse = React.useCallback(() => {
    setValue(false);
  }, []);

  const onToggle = React.useCallback(() => {
    setValue((prev) => !prev);
  }, []);

  return {
    value,
    onTrue,
    onFalse,
    onToggle,
    setValue,
  };
}
