# TITAN HATCH · Climate Card

A white matte MECHA climate instrument for Home Assistant. Temperature and humidity, smooth history graphs, a transparent background and softly blinking LEDs.

**by Antarikfox** · [Русская инструкция](START-TITAN.txt) · [Interactive demo](index.html) · [Download standalone demo](TITAN-Climate-Demo.html)

![TITAN HATCH transparent armor](assets/titan-backplate.webp)

## Возможности

- Температура и влажность из Home Assistant, единицы °C / °F.
- Два плавных графика за 24 часа с переходами без ложных пиков.
- Матовая белая броня, полупрозрачные панели, кабели и открытые платы.
- Редкое несинхронное подмигивание LED и слабая пульсация янтарного узла.
- Прозрачный фон; отдельные настройки непрозрачности подложки и корпуса.
- Визуальный редактор сущностей, прозрачности, LED и порогов комфорта.
- Опциональный заряд батареи, статусы и время обновления.
- Обработка пропавшего сигнала и отсутствующей истории.
- Действия по нажатию, удержанию и двойному нажатию.
- Остановка анимаций вне экрана и поддержка уменьшения движения.

Вся графика встроена в `titan-climate-card.js`. Отдельные картинки при установке не нужны.

## Установка через HACS

Репозиторий подготовлен для добавления как пользовательская карточка; в каталог HACS по умолчанию он не включён.

1. В HACS открой меню **Пользовательские репозитории / Custom repositories**.
2. Добавь URL этого репозитория. Категория — **Dashboard / Панель**.
3. Скачай **TITAN HATCH Climate Card** и обнови страницу.
4. Если ресурс не появился автоматически, добавь ресурс типа **JavaScript module**:

   ```text
   /hacsfiles/titan-climate-card/titan-climate-card.js
   ```

Затем добавь карточку `custom:titan-climate-card`.

## Ручная установка

1. Скачай [`titan-climate-card.js`](titan-climate-card.js) в `/config/www/` Home Assistant.
2. Добавь ресурс типа **Модуль JavaScript**:

   ```text
   /local/titan-climate-card.js?v=1.0.0
   ```

3. Обнови страницу с очисткой кеша.

Для планшета есть [`titan-climate-card.js.txt`](titan-climate-card.js.txt). После скачивания убери только окончание `.txt`.

## Карточка

```yaml
type: custom:titan-climate-card
name: Гостиная
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

Замени сущности на свои. [Пример для датчиков гостиной Antarikfox](examples/living-room.yaml).

## Прозрачность и свет

| Настройка | Значения | Значение по умолчанию |
| --- | --- | --- |
| `background_opacity` | 0 — прозрачный фон, 1 — тёмная непрозрачная подложка | `0` |
| `body_opacity` | 0 — корпус скрыт, 1 — обычный корпус; показания сохраняются | `1` |
| `background_blur` | Размытие подложки, 0–30 px | `0` |
| `led_brightness` | Яркость живых LED, 0–1 | `0.7` |
| `leds_enabled` | Живые световые эффекты | `true` |
| `animations` | `full`, `reduced`, `off` | `full` |

В режиме `full` LED подмигивают с различными периодами примерно 10–19 секунд. `reduced` сохраняет спокойный свет и плавные графики. `off` отключает анимации. Рисованные блики корпуса остаются частью изображения.

Эти настройки доступны и в визуальном редакторе. Форма карточки квадратная; рекомендуемая ширина от 390 px.

## Данные и история

История читается из Recorder за последние сутки через API Home Assistant. Запросы кешируются на пять минут; текущие показания обновляются по объекту `hass`. Неизвестные и недоступные значения образуют разрывы истории.

Для графиков применяется монотонная кубическая интерполяция с переходом между данными за 1,4 секунды. Если Recorder недоступен или истории нет, карточка продолжает показывать текущие значения.

Опциональный заряд батареи:

```yaml
battery_entity: sensor.living_room_battery
```

Пороги статусов и действия описаны в [полной инструкции](START-TITAN.txt).

## Демо

Скачай и открой `TITAN-Climate-Demo.html` — файл работает локально без интернета. Демо использует **искусственные показания и историю**, а не подключение к твоему HA.

Для GitHub Pages используй ветку `main`, папку `/ (root)`. В корне уже есть `index.html` и `.nojekyll`.

## Разработка и проверка

Node.js нужен только для тестов. Python 3 — только для сборки. Зависимостей для сборки нет.

```sh
npm test
python3 build.py
```

Исходники находятся в `src/`, отдельная исходная графика — в `assets/`. Сборка создаёт автономные JS и HTML в корне репозитория.

`tests/browser-fixture.html` содержит интеграционные проверки с имитацией `hass`; для запуска скопируй рядом с ним собранный JS или размести оба файла в одной папке на локальном сервере.

Проверены пороги, обработка недоступных значений, интерполяция, разрывы истории, конфигурация, прозрачность, светодиоды и редактор. Браузерные проверки выполнялись с имитацией Home Assistant. Проверка на конкретном планшете и реальном HA выполняется после установки.

## License

MIT for the code. Artwork generated for this project. **by Antarikfox**.
