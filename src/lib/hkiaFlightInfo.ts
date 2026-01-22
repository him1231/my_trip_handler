export type HkiaLanguage = "en" | "zh_HK" | "zh_CN";

export type HkiaFlightNumber = {
  no: string;
  airline: string;
};

export type HkiaFlightStatus = {
  statusCode?: string | null;
  status?: string;
};

export type HkiaArrivalPassenger = HkiaFlightStatus & {
  origin: string;
  baggage?: string;
  hall?: string;
  terminal?: string;
  stand?: string;
  time: string;
  flight: HkiaFlightNumber[];
};

export type HkiaDeparturePassenger = HkiaFlightStatus & {
  destination: string;
  terminal?: string;
  aisle?: string;
  gate?: string;
  time: string;
  flight: HkiaFlightNumber[];
};

export type HkiaArrivalCargo = HkiaFlightStatus & {
  origin: string;
  time: string;
  flight: HkiaFlightNumber[];
};

export type HkiaDepartureCargo = HkiaFlightStatus & {
  destination: string;
  time: string;
  flight: HkiaFlightNumber[];
};

export type HkiaFlightRecord =
  | HkiaArrivalPassenger
  | HkiaDeparturePassenger
  | HkiaArrivalCargo
  | HkiaDepartureCargo;

export type HkiaFlightInfoResponse = {
  date?: string;
  arrival?: boolean;
  cargo?: boolean;
  list?: HkiaFlightEntry[];
};

export type HkiaFlightEntry = {
  seq?: number;
  origin?: string | string[];
  destination?: string | string[];
  time?: string;
  status?: string;
  statusCode?: string | null;
  flight?: HkiaFlightNumber[];
  flightNumberList?: HkiaFlightNumber[];
};

export type HkiaFlightMatch = {
  arrival: boolean;
  cargo: boolean;
  date: string;
  origin?: string;
  destination?: string;
  time?: string;
  status?: string;
  statusCode?: string;
};

const DEFAULT_BASE_URL = "https://www.hongkongairport.com/flightinfo-rest/rest/flights/past";

const getBaseUrl = () => {
  const proxy = import.meta.env?.VITE_HKIA_PROXY_URL;
  if (!proxy) {
    return DEFAULT_BASE_URL;
  }
  const trimmed = proxy.replace(/\/+$/, "");
  return `${trimmed}/past`;
};

const toQuery = (params: Record<string, string | number | boolean>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    search.set(key, String(value));
  });
  return search.toString();
};

export const buildPastFlightsUrl = (options: {
  date: string;
  arrival: boolean;
  cargo: boolean;
  lang: HkiaLanguage;
}) => {
  const query = toQuery({
    date: options.date,
    arrival: options.arrival,
    cargo: options.cargo,
    lang: options.lang
  });
  return `${getBaseUrl()}?${query}`;
};

export const fetchPastFlights = async (options: {
  date: string;
  arrival: boolean;
  cargo: boolean;
  lang?: HkiaLanguage;
  signal?: AbortSignal;
}): Promise<HkiaFlightInfoResponse> => {
  const url = buildPastFlightsUrl({
    date: options.date,
    arrival: options.arrival,
    cargo: options.cargo,
    lang: options.lang ?? "en"
  });

  const response = await fetch(url, { method: "GET", signal: options.signal });
  if (!response.ok) {
    throw new Error(`HKIA flight info request failed (${response.status})`);
  }
  const data = await response.json();
  if (Array.isArray(data)) {
    return data[0] ?? { list: [], date: options.date, arrival: options.arrival, cargo: options.cargo };
  }
  return data as HkiaFlightInfoResponse;
};

const normalize = (value?: string) => value?.toUpperCase().replace(/[^A-Z0-9]+/g, "") ?? "";

const extractFlights = (entry: HkiaFlightEntry): HkiaFlightNumber[] => {
  const candidates =
    entry.flight ??
    entry.flightNumberList ??
    [];

  if (!Array.isArray(candidates)) {
    return [];
  }

  return candidates.map((flight) => ({
    airline: String(flight.airline ?? ""),
    no: String(flight.no ?? "")
  }));
};

const matchFlight = (entry: HkiaFlightEntry, airline: string, flightNumber: string) => {
  const targetAirline = normalize(airline);
  const targetNumber = normalize(flightNumber);
  const strippedNumber = targetAirline && targetNumber.startsWith(targetAirline)
    ? targetNumber.slice(targetAirline.length)
    : targetNumber;
  const combined = normalize(`${airline}${flightNumber}`);
  const combinedWithSpace = normalize(`${airline} ${flightNumber}`);
  const splitNumber = (value: string) => {
    const match = value.match(/^([A-Z]+)(\d+)$/);
    if (!match) {
      return { prefix: "", suffix: "" };
    }
    return { prefix: match[1], suffix: match[2] };
  };

  return extractFlights(entry).some((flight) => {
    const entryAirline = normalize(flight.airline);
    const entryNumber = normalize(flight.no);
    const { prefix, suffix } = splitNumber(entryNumber);
    const entryLooksCombined =
      entryNumber.startsWith(targetAirline) && entryNumber.endsWith(targetNumber);
    const entryContainsBoth =
      targetAirline && targetNumber && entryNumber.includes(targetAirline) && entryNumber.endsWith(targetNumber);
    const entryMatchesStripped =
      targetAirline && strippedNumber && entryNumber.endsWith(strippedNumber) && entryNumber.startsWith(targetAirline);

    return (
      (entryAirline && entryNumber && entryAirline === targetAirline && entryNumber === targetNumber) ||
      entryNumber === combined ||
      entryNumber === combinedWithSpace ||
      entryNumber === targetNumber ||
      (prefix === targetAirline && suffix === targetNumber) ||
      entryLooksCombined ||
      entryContainsBoth ||
      entryMatchesStripped
    );
  });
};

export const findPastFlight = async (options: {
  date: string;
  arrival: boolean;
  cargo: boolean;
  airline: string;
  flightNumber: string;
  lang?: HkiaLanguage;
  signal?: AbortSignal;
}): Promise<HkiaFlightMatch | null> => {
  const response = await fetchPastFlights({
    date: options.date,
    arrival: options.arrival,
    cargo: options.cargo,
    lang: options.lang,
    signal: options.signal
  });

  const rawList = response.list;
  if (!rawList || !Array.isArray(rawList)) {
    return null;
  }

  const found = rawList.find((entry) => matchFlight(entry, options.airline, options.flightNumber));
  if (!found) {
    return null;
  }

  const record = found;
  const pickString = (...values: Array<string | null | undefined>) => {
    const foundValue = values.find((value) => typeof value === "string" && value.length > 0);
    return foundValue ?? undefined;
  };
  const pickLocation = (value?: string | string[]) => {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : undefined;
    }
    return undefined;
  };
  return {
    arrival: options.arrival,
    cargo: options.cargo,
    date: response.date ?? options.date,
    origin: pickLocation(record.origin),
    destination: pickLocation(record.destination),
    time: pickString(record.time),
    status: pickString(record.status),
    statusCode: pickString(record.statusCode ?? undefined)
  };
};

export const extractMatchFromResponse = (
  response: HkiaFlightInfoResponse,
  airline: string,
  flightNumber: string
): HkiaFlightMatch | null => {
  const rawList = response.list;
  
  if (!response || !rawList || !Array.isArray(rawList)) {
    return null;
  }

  const found = rawList.find((entry) => matchFlight(entry, airline, flightNumber));
  if (!found) {
    const debugFlights = rawList
      .flatMap((entry) => extractFlights(entry))
      .map((flight) => ({ airline: flight.airline, no: flight.no }))
      .slice(0, 50);
    const normalizedTarget = {
      airline: normalize(airline),
      flightNumber: normalize(flightNumber),
      combined: normalize(`${airline}${flightNumber}`),
      combinedWithSpace: normalize(`${airline} ${flightNumber}`)
    };
    const nearMatches = debugFlights.filter((flight) => {
      const entryNumber = normalize(flight.no);
      return (
        entryNumber.includes(normalizedTarget.airline) ||
        entryNumber.endsWith(normalizedTarget.flightNumber)
      );
    });
    return null;
  }
  const record = found;
  const arrival = response.arrival;
  const cargo = response.cargo;
  const date = response.date;
  const pickString = (...values: Array<string | null | undefined>) => {
    const foundValue = values.find((value) => typeof value === "string" && value.length > 0);
    return foundValue ?? undefined;
  };
  const pickLocation = (value?: string | string[]) => {
    if (typeof value === "string") {
      return value;
    }
    if (Array.isArray(value)) {
      return typeof value[0] === "string" ? value[0] : undefined;
    }
    return undefined;
  };
  return {
    arrival: Boolean(arrival),
    cargo: Boolean(cargo),
    date: date ?? "",
    origin: pickLocation(record.origin),
    destination: pickLocation(record.destination),
    time: pickString(record.time),
    status: pickString(record.status),
    statusCode: pickString(record.statusCode)
  };
};
