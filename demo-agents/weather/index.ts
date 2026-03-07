// External agents receive `tool` and `z` via context.utils
// to avoid dual-instance issues when loaded via jiti at runtime.
// Do NOT import { tool } from 'ai' or { z } from 'zod' directly.

interface AgentContext {
  getConfig: () => Promise<Record<string, unknown>>
  knowledge: { text: string }
  userId: string
  utils: {
    tool: typeof import('ai').tool
    z: typeof import('zod').z
  }
}

interface CognovaAgent {
  systemPrompt: string
  tools?: Record<string, unknown>
  maxSteps?: number
}

interface WeatherConfig {
  defaultCity?: string
  temperatureUnit?: 'celsius' | 'fahrenheit'
  windSpeedUnit?: 'kmh' | 'mph' | 'ms' | 'knots'
}

const TEMP_SYMBOLS: Record<string, string> = {
  celsius: '°C',
  fahrenheit: '°F'
}

const WIND_LABELS: Record<string, string> = {
  kmh: 'km/h',
  mph: 'mph',
  ms: 'm/s',
  knots: 'kn'
}

interface GeoResult {
  latitude: number
  longitude: number
  name: string
  country: string
  admin1?: string
}

async function geocode(query: string): Promise<GeoResult | null> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en`
  )
  const data = await res.json() as { results?: GeoResult[] }
  return data.results?.[0] || null
}

export async function createAgent(
  _config: Record<string, unknown>,
  context: AgentContext
): Promise<CognovaAgent> {
  const { tool, z } = context.utils
  const config = await context.getConfig() as WeatherConfig

  const tempUnit = config.temperatureUnit || 'celsius'
  const windUnit = config.windSpeedUnit || 'kmh'
  const defaultCity = config.defaultCity
  const tempSym = TEMP_SYMBOLS[tempUnit] || '°C'
  const windLabel = WIND_LABELS[windUnit] || 'km/h'

  const knowledgeSection = context.knowledge.text
    ? `\n\n## Knowledge\n\n${context.knowledge.text}`
    : ''

  const defaultCityHint = defaultCity
    ? `\nIf the user doesn't specify a location, use "${defaultCity}" as the default.`
    : '\nIf the user doesn\'t specify a location, ask them which city they\'d like weather for.'

  return {
    systemPrompt: `You are a weather assistant with two tools:
- **getWeather**: current conditions for any city or zip code
- **getForecast**: daily forecast (up to 7 days) for any city or zip code

When a user asks about weather, use the appropriate tool. For "what's the weather?" use getWeather. For "what's the forecast?" or "will it rain tomorrow?" use getForecast.

Present results in a clear, friendly format with relevant details.
${defaultCityHint}${knowledgeSection}`,

    tools: {
      getWeather: tool({
        description: 'Get current weather conditions. Accepts a city name or zip/postal code.',
        parameters: z.object({
          location: z.string().describe('City name or zip/postal code (e.g. "New York", "10001", "London")')
        }),
        execute: async ({ location }) => {
          const geo = await geocode(location)
          if (!geo) return { error: `Location "${location}" not found` }

          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}`
            + `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation`
            + `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`
          )
          const data = await res.json() as {
            current: {
              temperature_2m: number
              apparent_temperature: number
              relative_humidity_2m: number
              weather_code: number
              wind_speed_10m: number
              precipitation: number
            }
          }

          const c = data.current
          return {
            location: geo.admin1 ? `${geo.name}, ${geo.admin1}` : geo.name,
            country: geo.country,
            temperature: `${c.temperature_2m}${tempSym}`,
            feelsLike: `${c.apparent_temperature}${tempSym}`,
            humidity: `${c.relative_humidity_2m}%`,
            windSpeed: `${c.wind_speed_10m} ${windLabel}`,
            precipitation: `${c.precipitation} mm`,
            condition: weatherCodeToText(c.weather_code)
          }
        }
      }),

      getForecast: tool({
        description: 'Get daily weather forecast for up to 7 days. Accepts a city name or zip/postal code.',
        parameters: z.object({
          location: z.string().describe('City name or zip/postal code'),
          days: z.number().min(1).max(7).default(3).describe('Number of forecast days (1-7, default 3)')
        }),
        execute: async ({ location, days }) => {
          const geo = await geocode(location)
          if (!geo) return { error: `Location "${location}" not found` }

          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}`
            + `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code,wind_speed_10m_max`
            + `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`
            + `&timezone=auto&forecast_days=${days}`
          )
          const data = await res.json() as {
            daily: {
              time: string[]
              temperature_2m_max: number[]
              temperature_2m_min: number[]
              precipitation_sum: number[]
              precipitation_probability_max: number[]
              weather_code: number[]
              wind_speed_10m_max: number[]
            }
          }

          const d = data.daily
          const forecast = d.time.map((date, i) => ({
            date,
            high: `${d.temperature_2m_max[i]}${tempSym}`,
            low: `${d.temperature_2m_min[i]}${tempSym}`,
            precipitation: `${d.precipitation_sum[i]} mm`,
            precipChance: `${d.precipitation_probability_max[i]}%`,
            wind: `${d.wind_speed_10m_max[i]} ${windLabel}`,
            condition: weatherCodeToText(d.weather_code[i])
          }))

          return {
            location: geo.admin1 ? `${geo.name}, ${geo.admin1}` : geo.name,
            country: geo.country,
            days: forecast
          }
        }
      })
    },

    maxSteps: 3
  }
}

function weatherCodeToText(code: number): string {
  const codes: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Freezing light drizzle',
    57: 'Freezing dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Freezing light rain',
    67: 'Freezing heavy rain',
    71: 'Slight snowfall',
    73: 'Moderate snowfall',
    75: 'Heavy snowfall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  }
  return codes[code] || 'Unknown'
}
