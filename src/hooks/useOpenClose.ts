'use client';

import React from 'react';

// ----------------------------------------------------------------------

interface ReturnType {
  value: boolean;
  open: () => void;
  close: () => void;
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
}

// ----------------------------------------------------------------------

export function useOpenClose(defaultValue?: boolean): ReturnType {
  const [value, setValue] = React.useState(!!defaultValue);

  const open = React.useCallback(() => {
    setValue(true);
  }, []);

  const close = React.useCallback(() => {
    setValue(false);
  }, []);

  return {
    value,
    open,
    close,
    setValue,
  };
}
