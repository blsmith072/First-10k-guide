// Weather Dashboard Application
// Uses OpenWeatherMap Free API

class WeatherDashboard {
    constructor() {
        // Get your free API key from https://openweathermap.org/api
        // Replace with your actual API key
        this.apiKey = 'your_api_key_here'; // Free tier available
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.forecastUrl = 'https://api.openweathermap.org/data/3.0/onecall';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedLocation();
    }

    setupEventListeners() {
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');
        const locationBtn = document.getElementById('locationBtn');
        const quickBtns = document.querySelectorAll('.quick-btn');

        searchBtn.addEventListener('click', () => this.handleSearch());
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        locationBtn.addEventListener('click', () => this.useCurrentLocation());
        quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.fetchWeather(e.target.dataset.city);
            });
        });
    }

    handleSearch() {
        const searchInput = document.getElementById('searchInput');
        const query = searchInput.value.trim();
        
        if (!query) {
            this.showError('Please enter a city name or coordinates');
            return;
        }

        this.fetchWeather(query);
    }

    useCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by your browser');
            return;
        }

        this.showLoading();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                this.fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                this.showError('Unable to get your location: ' + error.message);
            }
        );
    }

    showLoading() {
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('weatherContent').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        document.getElementById('weatherContent').style.display = 'none';
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    showContent() {
        document.getElementById('weatherContent').style.display = 'block';
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
    }

    async fetchWeather(cityName) {
        this.showLoading();
        try {
            const response = await fetch(
                `${this.baseUrl}/weather?q=${cityName}&appid=${this.apiKey}&units=metric`
            );

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('City not found. Please check the spelling and try again.');
                } else if (response.status === 401) {
                    throw new Error('Invalid API key. Please configure your OpenWeatherMap API key.');
                }
                throw new Error('Unable to fetch weather data. Please try again.');
            }

            const data = await response.json();
            await this.fetchFullWeatherData(data.coord.lat, data.coord.lon, cityName);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async fetchWeatherByCoords(latitude, longitude) {
        this.showLoading();
        try {
            const response = await fetch(
                `${this.baseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`
            );

            if (!response.ok) {
                throw new Error('Unable to fetch weather data for your location');
            }

            const data = await response.json();
            const cityName = data.name || 'Current Location';
            await this.fetchFullWeatherData(latitude, longitude, cityName);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async fetchFullWeatherData(latitude, longitude, cityName) {
        try {
            // Fetch current weather and forecast
            const currentResponse = await fetch(
                `${this.baseUrl}/weather?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`
            );

            const forecastResponse = await fetch(
                `${this.baseUrl}/forecast?lat=${latitude}&lon=${longitude}&appid=${this.apiKey}&units=metric`
            );

            if (!currentResponse.ok || !forecastResponse.ok) {
                throw new Error('Unable to fetch complete weather data');
            }

            const currentData = await currentResponse.json();
            const forecastData = await forecastResponse.json();

            this.displayWeather(currentData, forecastData);
            this.saveLocation(cityName, latitude, longitude);
            this.showContent();
        } catch (error) {
            this.showError(error.message);
        }
    }

    displayWeather(currentData, forecastData) {
        const {
            name,
            sys: { country, sunrise, sunset },
            main: { temp, temp_max, temp_min, feels_like, humidity, pressure },
            weather,
            wind: { speed },
            clouds: { all: cloudiness },
            visibility,
            rain = {},
            dt
        } = currentData;

        // Update current weather display
        document.getElementById('cityName').textContent = `${name}, ${country}`;
        document.getElementById('lastUpdated').textContent = this.formatTime(dt * 1000);
        document.getElementById('temperature').textContent = Math.round(temp);
        document.getElementById('weatherIcon').src = this.getWeatherIcon(weather[0].main);
        document.getElementById('weatherDescription').innerHTML = `
            <p>${weather[0].main}</p>
            <p>${weather[0].description}</p>
        `;
        document.getElementById('weatherDetails').textContent = `Humidity: ${humidity}% | Wind: ${speed.toFixed(1)} m/s`;

        // Update stats
        document.getElementById('humidity').textContent = `${humidity}%`;
        document.getElementById('windSpeed').textContent = `${speed.toFixed(1)} m/s`;
        document.getElementById('pressure').textContent = `${pressure} hPa`;
        document.getElementById('visibility').textContent = `${(visibility / 1000).toFixed(1)} km`;

        // Update temperature details
        document.getElementById('maxTemp').textContent = Math.round(temp_max);
        document.getElementById('minTemp').textContent = Math.round(temp_min);
        document.getElementById('feelsLike').textContent = Math.round(feels_like);

        // Update sky conditions
        document.getElementById('cloudiness').textContent = cloudiness;
        document.getElementById('uvIndex').textContent = 'N/A'; // Would need separate API call
        document.getElementById('rainfall').textContent = (rain['1h'] || 0).toFixed(1);

        // Update sun times
        document.getElementById('sunrise').textContent = this.formatTime(sunrise * 1000, 'time');
        document.getElementById('sunset').textContent = this.formatTime(sunset * 1000, 'time');
        
        const dayLength = Math.round((sunset - sunrise) / 3600);
        document.getElementById('dayLength').textContent = `${dayLength}h`;

        // Display forecast
        this.displayForecast(forecastData.list);
    }

    displayForecast(forecastList) {
        const forecastContainer = document.getElementById('forecastContainer');
        forecastContainer.innerHTML = '';

        // Get one forecast per day (every 24 hours)
        const dailyForecasts = {};

        forecastList.forEach(forecast => {
            const date = new Date(forecast.dt * 1000);
            const dayKey = date.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });

            if (!dailyForecasts[dayKey]) {
                dailyForecasts[dayKey] = forecast;
            }
        });

        // Display next 5 days
        let count = 0;
        for (const [day, forecast] of Object.entries(dailyForecasts)) {
            if (count >= 5) break;

            const card = document.createElement('div');
            card.className = 'forecast-card';
            card.innerHTML = `
                <div class="forecast-date">${day}</div>
                <div class="forecast-icon">
                    <img src="${this.getWeatherIcon(forecast.weather[0].main)}" alt="Weather icon">
                </div>
                <div class="forecast-temp">
                    <strong>${Math.round(forecast.main.temp)}°C</strong>
                </div>
                <div class="forecast-desc">${forecast.weather[0].main}</div>
                <div class="forecast-details">
                    <div>💧 ${forecast.main.humidity}%</div>
                    <div>💨 ${forecast.wind.speed.toFixed(1)} m/s</div>
                </div>
            `;
            forecastContainer.appendChild(card);
            count++;
        }
    }

    getWeatherIcon(weatherMain) {
        const iconMap = {
            'Clear': 'https://openweathermap.org/img/wn/01d@2x.png',
            'Clouds': 'https://openweathermap.org/img/wn/02d@2x.png',
            'Rain': 'https://openweathermap.org/img/wn/10d@2x.png',
            'Snow': 'https://openweathermap.org/img/wn/13d@2x.png',
            'Thunderstorm': 'https://openweathermap.org/img/wn/11d@2x.png',
            'Drizzle': 'https://openweathermap.org/img/wn/09d@2x.png',
            'Mist': 'https://openweathermap.org/img/wn/50d@2x.png',
            'Fog': 'https://openweathermap.org/img/wn/50d@2x.png'
        };
        return iconMap[weatherMain] || 'https://openweathermap.org/img/wn/01d@2x.png';
    }

    formatTime(timestamp, format = 'full') {
        const date = new Date(timestamp);
        
        if (format === 'time') {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        
        return date.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    saveLocation(cityName, latitude, longitude) {
        localStorage.setItem('lastLocation', JSON.stringify({
            cityName,
            latitude,
            longitude,
            timestamp: Date.now()
        }));
    }

    loadSavedLocation() {
        const saved = localStorage.getItem('lastLocation');
        if (saved) {
            const { latitude, longitude } = JSON.parse(saved);
            this.fetchWeatherByCoords(latitude, longitude);
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new WeatherDashboard();
    
    // Check if API key is configured
    if (dashboard.apiKey === 'your_api_key_here') {
        dashboard.showError(
            'API Key Not Configured: Please update the apiKey in script.js with your OpenWeatherMap API key. ' +
            'Get a free key at https://openweathermap.org/api'
        );
    }
});
