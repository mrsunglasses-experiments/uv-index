export interface MonthlyUV {
  month: string;
  uvIndex: number;
}

export async function getCityCoordinates(city: string) {
  const response = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      city
    )}&count=1&language=en&format=json`
  );
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error('City not found');
  }

  const { latitude, longitude, name, country } = data.results[0];
  return { latitude, longitude, name, country };
}

export async function getMonthlyUVData(lat: number, lon: number, year: number): Promise<MonthlyUV[]> {
  // NASA POWER API provides reliable monthly averages directly
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=ALLSKY_SFC_UV_INDEX&community=RE&longitude=${lon}&latitude=${lat}&format=JSON&start=${year}&end=${year}`;

  console.log(`Fetching NASA UV data for Lat: ${lat}, Lon: ${lon} for year ${year}`);

  const response = await fetch(url);
  const data = await response.json();

  if (!data.properties || !data.properties.parameter || !data.properties.parameter.ALLSKY_SFC_UV_INDEX) {
    if (data.header && data.header.messages) {
      throw new Error(data.header.messages[0]);
    }
    throw new Error(`Could not fetch UV data for ${year}`);
  }

  const uvValues = data.properties.parameter.ALLSKY_SFC_UV_INDEX;
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const result: MonthlyUV[] = monthNames.map((name, index) => {
    const monthKey = `${year}${String(index + 1).padStart(2, '0')}`;
    const value = uvValues[monthKey];
    // NASA uses -999 for missing data
    const isValid = value !== undefined && value !== null && value !== -999;
    return {
      month: name,
      uvIndex: isValid ? Number(value.toFixed(2)) : 0
    };
  });

  return result;
}
