export const camelCaseToSpaceCase = (str: string) => {
  return str.replace(/([A-Z])/g, ' $1');
};
