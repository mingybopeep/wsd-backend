export const validatePayload = (
  params: QsPayload,
  fieldsToValidate: QsParam[]
): string[] => {
  const invalidFields: string[] = [];

  fieldsToValidate.forEach((key) => {
    const value = params[key];
    if (key !== "searchTerm" && !value) {
      invalidFields.push(`${key} missing.`);
      return;
    }

    if (
      ["limit", "offset", "fromDate", "toDate"].includes(key) &&
      isNaN(+value)
    ) {
      invalidFields.push(`${value} is not a valid ${key}.`);
      return;
    }
  });

  return invalidFields;
};
