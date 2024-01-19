import React from 'react';

import debounce from 'lodash/debounce';

type useFieldProps = {
  initValue: string;
  // eslint-disable-next-line no-unused-vars
  validate: (value: string) => string | boolean;
  required?: boolean;
};

export const useField = ({ initValue, validate, required = false }: useFieldProps) => {
  const [value, setValueNotDebounced] = React.useState(initValue);
  const [error, setError] = React.useState('');

  // eslint-disable-next-line
  const debouncedSetError = React.useCallback(
    debounce((newValue: string) => {
      const err = validate(newValue);
      setError(err as string);
    }, 300),
    []
  );

  const resetValue = () => {
    setValueNotDebounced(initValue);
    setError('');
  };

  const setValue = (newValue: string) => {
    debouncedSetError(newValue);
    setValueNotDebounced(newValue);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (typeof e === 'string') {
      setValue(e);
    } else {
      setValue(e?.target?.value);
    }
  };

  const isValid = (): boolean => {
    if (required && value.length < 1) {
      setError('This is a required field!');
      return false;
    }

    if (error) {
      return false;
    }

    return true;
  };

  return { value, setValue, onChange, error, resetValue, isValid };
};
