const API_KEY = import.meta.env.VITE_WEATHER_API_KEY;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const weatherCache = new Map();

/**
 * Weather Service for CivicStream
 * Fetches real-time weather data using One Call 3.0 API.
 * https://api.openweathermap.org/data/3.0/onecall?lat={lat}&lon={lon}&appid={API_KEY}
 */
export const fetchWeather = async (lat, lon) => {
    const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
    const now = Date.now();

    if (weatherCache.has(cacheKey)) {
        const cached = weatherCache.get(cacheKey);
        if (now - cached.timestamp < CACHE_DURATION) {
            return cached.data;
        }
    }

    try {
        // Implement a timeout for the fetch call (3 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&appid=${API_KEY}&units=metric`,
            { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        if (response.status === 401) {
            console.warn("One Call 3.0 requires an active subscription. Using realistic mock fallback for demo.");
            return getMockWeatherData(lat, lon);
        }

        if (!response.ok) {
            throw new Error(`Weather API Error: ${response.status}`);
        }

        const data = await response.json();

        // Process One Call 3.0 data
        const processedWeather = {
            current: {
                temp: Math.round(data.current.temp),
                humidity: data.current.humidity,
                condition: data.current.weather[0].main,
                description: data.current.weather[0].description,
                icon: data.current.weather[0].icon
            },
            forecast: {
                // One Call 3.0 provides daily 'pop' (Probability of Precipitation)
                rainProbability: Math.round((data.daily[0].pop || 0) * 100),
                shortSummary: `Forecast: ${data.daily[0].summary || data.daily[0].weather[0].description}. Highs of ${Math.round(data.daily[0].temp.max)}°C.`,
                next24hPop: Math.round((data.daily[0].pop || 0) * 100)
            },
            timestamp: now,
            isMock: false
        };

        weatherCache.set(cacheKey, {
            timestamp: now,
            data: processedWeather
        });

        return processedWeather;
    } catch (error) {
        console.warn("Weather API call failed, using mock fallback:", error);
        return getMockWeatherData(lat, lon);
    }
};

/**
 * Generates realistic mock data based on location
 */
const getMockWeatherData = (lat, lon) => {
    const seed = Math.floor(lat * 100 + lon * 100);
    const conditions = ['Rainy', 'Cloudy', 'Sunny', 'Clear', 'Thunderstorm'];
    const condition = conditions[seed % conditions.length];
    
    let temp = 28 + (seed % 10);
    let humidity = 60 + (seed % 30);
    let rainProb = 10 + (seed % 80);

    if (condition === 'Rainy' || condition === 'Thunderstorm') {
        rainProb = Math.max(rainProb, 70);
        temp = Math.min(temp, 30);
    }

    return {
        current: {
            temp: temp,
            humidity: humidity,
            condition: condition,
            description: `Scattered ${condition.toLowerCase()} patterns`,
            icon: '04d'
        },
        forecast: {
            rainProbability: rainProb,
            shortSummary: `Forecast shows ${condition.toLowerCase()} persisting. Rain probability around ${rainProb}%.`,
            next24hPop: rainProb
        },
        timestamp: Date.now(),
        isMock: true
    };
};
