# Architecture boundary

The server is authoritative for future room state, timing, answers and scoring. React owns the
browser DOM. Phaser owns only the Host canvas. `GameBridge` is the boundary between the Host shell
and Phaser scenes.

Prompt 2 intentionally provides infrastructure only. It does not implement room gameplay, character
claiming, scoring, levels or official educational content.
