# TITAN HATCH · Climate Card

A white matte MECHA climate instrument for Home Assistant. Temperature and humidity, smooth history graphs, a transparent background and softly blinking LEDs.

**by Antarikfox** · [Русский](README.md) | **English** · [Full guide](START-TITAN-EN.txt) · [Interactive demo](index.html) · [Download standalone demo](TITAN-Climate-Demo.html)

![TITAN HATCH transparent armor](assets/titan-backplate.webp)

## Features

- Home Assistant temperature and humidity readings, with °C / °F support.
- Two smooth 24-hour history graphs with transitions that avoid artificial peaks.
- Matte white armor, translucent panels, cables and exposed circuit boards.
- Occasional asynchronous LED blinking and a subtle amber core pulse.
- Transparent background with separate background and body opacity controls.
- Visual editor for entities, opacity, LEDs and comfort thresholds.
- Optional battery indicator, status labels and last-update time.
- Unavailable sensor and missing-history handling.
- Tap, hold and double-tap actions.
- Animations pause off-screen; reduced-motion preferences are respected.

All artwork is embedded in `titan-climate-card.js`. No separate images are required for installation.

## Install with HACS

TITAN HATCH Climate Card is included in the default HACS catalog.

1. Open HACS in Home Assistant and search for **TITAN HATCH Climate Card** (or `TITAN`).
2. Open the repository entry and select **Download**.
3. Reload the Home Assistant page after installation.
4. Add the card using the dashboard editor or YAML: `type: custom:titan-climate-card`.
5. Select your temperature and humidity sensors.

If the resource was not registered automatically, open **Settings → Dashboards → ⋮ → Resources** and add a **JavaScript module** resource:

```text
/hacsfiles/titan-climate-card/titan-climate-card.js
```

If Resources is hidden, enable Advanced mode in your Home Assistant profile.
Do not load the same card through both `/local/` and `/hacsfiles/`.

### Fallback: custom repository

If the card does not appear in HACS search yet, open **⋮ → Custom repositories**, add `https://github.com/Antarikfox/titan-climate-card` with type **Dashboard**, then download the card.

## Manual installation

1. Download [`titan-climate-card.js`](titan-climate-card.js) into Home Assistant's `/config/www/` directory. Create `www` if needed.
2. Add a **JavaScript module** resource:

   ```text
   /local/titan-climate-card.js?v=1.0.0
   ```

3. Reload the page and clear the browser cache.

For devices that have trouble downloading JS files, use [`titan-climate-card.js.txt`](titan-climate-card.js.txt) and remove only the final `.txt` extension.

## Updates

For a HACS installation, download the available update in HACS and reload Home Assistant.
For a manual installation, replace the JS file, change the `?v=` value in the resource URL and clear the browser cache.
When switching from a manual installation to HACS, remove the old `/local/titan-climate-card.js` resource so that the card loads only once. You can keep the card's YAML configuration.

## Card configuration

```yaml
type: custom:titan-climate-card
name: Living room
temperature_entity: sensor.living_room_temperature
humidity_entity: sensor.living_room_humidity
precision: 1
show_sparkline: true
show_last_updated: true
animations: full
leds_enabled: true
led_brightness: 0.7
background_opacity: 0
background_blur: 0
body_opacity: 1
```

Replace the entity IDs with your own. [Antarikfox living-room example](examples/living-room.yaml).

## Opacity and lighting

| Setting | Values | Default |
| --- | --- | --- |
| `background_opacity` | 0: transparent background; 1: opaque dark background | `0` |
| `body_opacity` | 0: hidden body; 1: normal body; readings remain visible | `1` |
| `background_blur` | Background blur, 0–30 px | `0` |
| `led_brightness` | Animated LED brightness, 0–1 | `0.7` |
| `leds_enabled` | Live lighting effects | `true` |
| `animations` | `full`, `reduced`, `off` | `full` |

In `full` mode, LEDs blink at different intervals of approximately 10–19 seconds.
`reduced` keeps steady lighting and smooth graph transitions. `off` disables animations.
Painted highlights remain part of the body artwork.

These settings are also available in the visual editor. The card is square; a width of at least 390 px is recommended.

## Data and history

The card requests the last 24 hours of Recorder history through the Home Assistant API.
History requests are cached for five minutes; current readings update through the `hass` object.
Unknown and unavailable values create gaps in the history.

Graphs use monotone cubic interpolation and 1.4-second transitions between updates.
If Recorder or history is unavailable, the card continues to display current readings.

Optional battery sensor:

```yaml
battery_entity: sensor.living_room_battery
```

See the [full guide](START-TITAN-EN.txt) for comfort thresholds and actions.

## Demo

Download and open `TITAN-Climate-Demo.html`. It works offline and uses **simulated readings and history**, with no connection to your Home Assistant.

For GitHub Pages, select branch `main` and folder `/ (root)`. The repository already includes `index.html` and `.nojekyll`.

## Development and validation

Node.js is required only for tests. Python 3 is required only for building. The build has no external dependencies.

```sh
npm test
python3 build.py
```

Source files are in `src/`; original artwork is in `assets/`. The build generates standalone JS and HTML files in the repository root.

`tests/browser-fixture.html` contains integration checks using a simulated `hass` object. Copy the built JS file next to the fixture, or serve both from the same directory on a local server.

Validation covers thresholds, unavailable values, interpolation, history gaps, configuration, opacity, LEDs and the editor. Browser checks use a simulated Home Assistant environment. Check the installed card with your own sensors and device.

## License

MIT for the code. Artwork generated for this project. **by Antarikfox**.
