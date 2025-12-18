document.addEventListener('DOMContentLoaded', async () => {
    const mapContainer = document.getElementById('map');
    const locationList = document.getElementById('location-list');
    const searchInput = document.getElementById('search-input');
    const detailsView = document.getElementById('details-view');
    const filterBtns = document.querySelectorAll('.filter-btn');

    let locations = [];
    let markers = [];
    let currentFilter = 'Alle';

    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        mapContainer.classList.toggle('dark-map');

        // Update icon
        const isDark = document.body.classList.contains('dark-mode');
        themeToggle.innerHTML = isDark
            ? `<svg class="moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
            : `<svg class="sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    });

    // Initialize Progress Bar
    const progress = document.querySelector('.progress');
    let width = 0;
    const interval = setInterval(() => {
        if (width >= 90) clearInterval(interval);
        width += Math.random() * 10;
        progress.style.width = `${Math.min(width, 95)}%`;
    }, 200);

    // Initialize MapLibre GL JS
    const map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.basemaps.cartocdn.com/gl/positron-gl-style/style.json', // Clean, light style
        center: [6.9583, 50.9375], // Cologne Center
        zoom: 11,
        maxZoom: 18,
        minZoom: 10
    });

    // Add navigation and terrain controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.on('load', () => {
        // Hide loader
        const loader = document.getElementById('loader');
        if (loader) {
            clearInterval(interval);
            progress.style.width = '100%';

            setTimeout(() => {
                loader.classList.add('fade-out');
            }, 800);
        }

        // Add 3D buildings layer
        const layers = map.getStyle().layers;
        let labelLayerId;
        for (let i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                labelLayerId = layers[i].id;
                break;
            }
        }

        // Hide default POIs to avoid confusion with our markers
        layers.forEach(layer => {
            if (layer.id.includes('poi') || (layer.source === 'openmaptiles' && layer['source-layer'] === 'poi')) {
                map.setLayoutProperty(layer.id, 'visibility', 'none');
            }
        });

        // Use preloaded data
        locations = locationsData;
        renderLocations(locations);
        addMarkers(locations);
    });

    function renderLocations(data) {
        locationList.innerHTML = '';
        data.forEach((loc, index) => {
            const card = document.createElement('div');
            card.className = 'location-card';
            card.dataset.id = loc.id;
            card.style.animationDelay = `${index * 0.1}s`;
            card.innerHTML = `
                <span class="category-tag ${loc.category.toLowerCase()}">${loc.category}</span>
                <h3>${loc.name}</h3>
                <p>${loc.description}</p>
            `;
            card.addEventListener('click', () => selectLocation(loc));
            locationList.appendChild(card);
        });
    }

    function addMarkers(data) {
        // Clear existing markers
        markers.forEach(m => m.remove());
        markers = [];
        console.log('Adding markers:', data.length);

        data.forEach(loc => {
            // Check if coordinates exist and are valid
            if (loc.coordinates && loc.coordinates.length === 2) {
                const el = document.createElement('div');
                el.className = `custom-marker ${loc.category.toLowerCase()}`;
                el.innerHTML = `
                    <div class="pulse-wrapper">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <circle cx="12" cy="12" r="10" fill="white" />
                            <circle cx="12" cy="12" r="7" class="marker-inner" />
                        </svg>
                    </div>
                `;

                const popupHTML = `
                    <div class="marker-popup">
                        <div class="popup-img" style="background-image: url('${loc.image || 'hero.png'}')"></div>
                        <div class="popup-text">
                            <h4>${loc.name}</h4>
                            <p>${loc.category}</p>
                        </div>
                    </div>
                `;

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(loc.coordinates)
                    .setPopup(new maplibregl.Popup({ offset: 30, className: 'fancy-popup' })
                        .setHTML(popupHTML))
                    .addTo(map);

                el.addEventListener('mouseenter', () => marker.togglePopup());
                el.addEventListener('mouseleave', () => marker.togglePopup());

                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectLocation(loc);
                });

                markers.push(marker);
            }
        });
    }

    function selectLocation(loc) {
        // Fly to location with cinematic 3D view
        map.flyTo({
            center: loc.coordinates,
            zoom: 15.5,
            pitch: 65,
            bearing: -20,
            duration: 2500,
            essential: true
        });

        // Update UI
        document.querySelectorAll('.location-card').forEach(c => {
            c.classList.toggle('selected', c.dataset.id === loc.id);
        });

        // Show details
        detailsView.innerHTML = `
            <div class="detail-image" style="background-image: url('${loc.image || 'hero.png'}')"></div>
            <div class="detail-content">
                <span class="category-tag ${loc.category.toLowerCase()}">${loc.category}</span>
                <h2>${loc.name}</h2>
                <div class="address">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    ${loc.address}
                </div>
                <p class="description">${loc.description}</p>
                <div class="detail-actions">
                    <a href="${loc.links[0]}" target="_blank" class="btn-primary">Website ansehen</a>
                    <button class="btn-close" onclick="document.getElementById('details-view').classList.remove('visible')">Schließen</button>
                </div>
            </div>
        `;
        detailsView.classList.add('visible');
    }

    // Search logic
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = locations.filter(loc =>
            (loc.name.toLowerCase().includes(term) || loc.description.toLowerCase().includes(term)) &&
            (currentFilter === 'Alle' || loc.category === currentFilter)
        );
        renderLocations(filtered);
        addMarkers(filtered);
    });

    // Filter logic
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.textContent;

            const term = searchInput.value.toLowerCase();
            const filtered = locations.filter(loc =>
                (currentFilter === 'Alle' || loc.category === currentFilter) &&
                (loc.name.toLowerCase().includes(term) || loc.description.toLowerCase().includes(term))
            );
            renderLocations(filtered);
            addMarkers(filtered);
        });
    });
});
