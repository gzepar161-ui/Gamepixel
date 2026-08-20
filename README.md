# UNDEATH KNIGHT

A browser-based pixel open-world dark-fantasy action game prototype built with vanilla HTML/CSS/JS + Canvas.

## Run
Open `index.html` in a modern browser. For best mobile support, serve the folder from a small local HTTP server because some browsers restrict audio/autoplay and local-file behavior.

Example:
`python3 -m http.server 8080`
then open `http://localhost:8080/`.

## Controls
- Left analog: move
- TAP attack: normal sword strike
- HOLD attack then release: charged dash through enemies
- Skill 1: 2 summons, 40 HP / 30 physical ATK each, 5 sec
- Skill 2: Shadow Cleave
- Skill 3: Abyss Barrier
- Ultimate: 10 sec elimination immunity, 200% lifesteal, 10 summons, 16 sec cooldown; dark-purple wings appear
- 100 kills: boss fight
- Shop: spend 5 coins per kill on functional upgrades

## Maps
- Grave: undead enemies, Big Zombie boss
- Snow Mountain: white fox enemies, Nine-Tailed Fox boss, summons become Snow Golems

## Audio
The title screen uses the requested Catbox MP3 URL. Map ambience is generated with Web Audio so the game does not ship copyrighted music.

## Assets
Character/enemy/map gameplay textures are locally generated pixel art assets; no Catbox gameplay textures are used. Catbox is used only for the requested index/map-selection visuals and index audio.
