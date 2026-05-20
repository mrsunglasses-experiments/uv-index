export interface MonthlyUV {
  month: string;
  uvIndex: number;
  peakUV: number;
  unavailable?: boolean;
}

export async function getCitySuggestions(query: string) {
  if (query.length < 2) return [];
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      query,
    )}&count=5&language=en&format=json`,
  );
  const data = await response.json();
  return data.results || [];
}

export async function getCityCoordinates(city: string) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city,
    )}&count=1&language=en&format=json`,
  );
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error("City not found");
  }

  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

export async function getCurrentUV(lat: number, lon: number) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=uv_index&daily=uv_index_max&timezone=auto`,
  );
  const data = await response.json();

  if (!data.hourly || !data.daily) {
    throw new Error("Could not fetch live UV data");
  }

  const now = new Date();
  const currentHourISO = new Date(now.setMinutes(0, 0, 0))
    .toISOString()
    .slice(0, 16);

  const hourIndex = data.hourly.time.findIndex((t: string) =>
    t.startsWith(currentHourISO),
  );
  const currentUV = hourIndex !== -1 ? data.hourly.uv_index[hourIndex] : 0;
  const todayMax = data.daily.uv_index_max[0];

  return { currentUV, todayMax };
}

export async function getCityFromCoords(lat: number, lon: number) {
  const osmResponse = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
  );
  const data = await osmResponse.json();
  const address = data.address;
  const name =
    address.city ||
    address.town ||
    address.village ||
    address.suburb ||
    "Unknown City";
  const country = address.country || "Unknown Country";
  return { name, country };
}

export async function getMonthlyUVData(
  lat: number,
  lon: number,
  year: number,
): Promise<MonthlyUV[]> {
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=ALLSKY_SFC_UV_INDEX&community=RE&longitude=${lon}&latitude=${lat}&format=JSON&start=${year}&end=${year}`;

  const response = await fetch(url);
  const data = await response.json();

  if (
    !data.properties ||
    !data.properties.parameter ||
    !data.properties.parameter.ALLSKY_SFC_UV_INDEX
  ) {
    if (data.header && data.header.messages) {
      throw new Error(data.header.messages[0]);
    }
    throw new Error(`Could not fetch UV data for ${year}`);
  }

  const uvValues = data.properties.parameter.ALLSKY_SFC_UV_INDEX;
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const result: MonthlyUV[] = monthNames.map((name, index) => {
    const monthKey = `${year}${String(index + 1).padStart(2, "0")}`;
    const value = uvValues[monthKey];
    const isValid = value !== undefined && value !== null && value !== -999;

    // Average monthly value
    const avg = isValid ? Number(value.toFixed(2)) : 0;

    // Estimated Peak: Scientific multiplier (~4.0) to estimate typical clear-sky noon peak
    // from the 24-hour mean provided by NASA POWER.
    const peak = isValid ? Number((value * 4.0).toFixed(1)) : 0;

    return {
      month: name,
      uvIndex: avg,
      peakUV: peak,
      unavailable: !isValid,
    };
  });

  return result;
}
