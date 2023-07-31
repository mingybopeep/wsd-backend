const qsParams = [
  "offset",
  "limit",
  "fromDate",
  "toDate",
  "searchTerm",
  "type",
] as const;

type QsParam = (typeof qsParams)[number];

type QsPayload = Record<QsParam, string>;
