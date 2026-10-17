# 🏊 Aqua Sprint 3D

**▶ Play now: https://dliedke.github.io/Swim-Game/**

🌐 In English: https://dliedke.github.io/Swim-Game/?lang=en · Em português: https://dliedke.github.io/Swim-Game/?lang=pt

Swimming game in **3D first person**: you are the swimmer. You see the water, the lane, your arms entering the water, the bottom of the pool with the light reflections and, when you breathe, the opponent in the next lane. You race 7 opponents, with a start from the block, underwater phases, turns and four strokes.

Made with **HTML + CSS + JavaScript** and [Three.js](https://threejs.org/) (bundled in `lib/`, so it works offline). Runs on **desktop and mobile**.

## How to play

Open `index.html` in your browser. That's it: no build or install needed (double-clicking works too).

Or play online at **https://dliedke.github.io/Swim-Game/** (works on your phone too; it plays best in landscape). You can also add it to your phone's home screen: it gets the swimmer icon.

## Languages

The game is in **English** and **Portuguese**. It picks the language of your browser: Portuguese if your browser is set to Portuguese, English for any other language. To choose one yourself, add `?lang=en` or `?lang=pt` to the address:

- English: https://dliedke.github.io/Swim-Game/?lang=en
- Português: https://dliedke.github.io/Swim-Game/?lang=pt

All the text is in `js/i18n.js`, with one table per language. To change a text, edit it there; in the page, elements with a `data-i18n` attribute get their text from that file.

## Features

- **First-person view** at water level. The surface ripples, the camera dips under the water, and the sound gets muffled underwater.
- **Living water**: shader with waves and ripples from each swimmer, the ceiling lights reflecting on the surface, caustics on the bottom, a "Snell's window" when you look up from underwater, light rays, bubbles and splashes.
- **4 strokes**: freestyle (crawl), backstroke, breaststroke and butterfly, plus **medley** (butterfly → backstroke → breaststroke → freestyle).
- **Real start**: "Take your marks", then the beep. False start = warning, and a second one disqualifies you. Backstroke starts in the water.
- **Turns**: flip turn in freestyle and backstroke, touch turn in breaststroke and butterfly, with a gauge that shows the perfect zone. In backstroke, the **flags at 5 m** pass overhead.
- **Underwater**: glide after the start and after each turn, with dolphin kicks (15 m limit).
- **Rhythm, energy and air**: perfect strokes in a row build a **streak** that adds speed; tapping faster is a **sprint** that burns energy, which comes back when you return to the rhythm. The air runs out if you don't breathe, and breathing too much costs speed.
- **Close races**: opponents far ahead ease off a little and the ones behind push, so the pack stays together (except on Olympic).
- **7 AI opponents** with different styles (sprinters, finishers, steady swimmers) and 4 difficulty levels.
- **3 cameras**: swimmer view, TV camera and rear camera (key `C`).
- Arena with a crowd, a live scoreboard, lane ropes, starting blocks and touch pads.
- **Medal podium**: finish 1st, 2nd or 3rd and the top three climb the podium behind the starting blocks, get their gold, silver and bronze medals, and watch their flags go up under confetti. Press `Space` or **See results** to continue.
- **English and Portuguese**: the game follows your browser language (Portuguese for `pt`, English otherwise). Add `?lang=pt` or `?lang=en` to the URL to force one.
- Results with splits, reaction time and a **personal record** saved in the browser.

## Controls

| Action | Keyboard | Phone |
|---|---|---|
| Start (dive) | `Space` | **DIVE!** button |
| Freestyle / backstroke | `←` `→` alternating (or `A` `D`) | ◀ ▶ buttons alternating |
| Butterfly | `↑` or `←`+`→` together | tap ◀ ▶ together |
| Breaststroke | `↑` arm stroke, then `↓` kick | ▲ arm stroke / ▼ kick |
| Breathe (freestyle/butterfly) | `Space` | **BREATHE** |
| Turn (near the wall) | `Space` | **TURN!** |
| Dolphin kick (underwater) | `↓` or `Space` | **DOLPHIN KICK** |
| Camera / Pause / Sound | `C` / `Esc` / `M` | 🎥 / ⏸ / 🔊 |

## Code structure

```
index.html          screens, HUD and touch buttons
img/                swimmer icon (tab icon, home-screen icon and menu title)
css/style.css       responsive layout (desktop, landscape and portrait)
js/i18n.js          English and Portuguese texts, language detection
js/config.js        strokes, difficulty, opponents
js/water.js         water shader + underwater light rays
js/pool.js          pool, lane ropes, blocks, arena, crowd, scoreboard
js/swimmerModel.js  articulated swimmer model and stroke animations
js/player.js        player physics, rhythm, breathing, turns and camera
js/ai.js            opponents
js/race.js          start, ranking, results, effects
js/podium.js        medal ceremony on the podium after the race
js/particles.js     splashes, foam and bubbles
js/audio.js         synthesized sounds (WebAudio)
js/input.js         keyboard and touch
js/hud.js           on-screen information
js/main.js          game loop, menus and cameras
```
