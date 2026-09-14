import { terrainScene,terrainThumbnail } from './worlds.mjs';
import { art, icon } from './ui.mjs';
import { escapeHTML, STAGES } from './domain.mjs';
import { ASSETS } from './assets.mjs';
export const WAYPOINTS = [[190,693],[260,538],[230,391],[253,207],[315,80]];
export const SEGMENTS = [
 'M190 693 C265 644 415 624 395 602 C385 585 268 561 230 543 L260 538',
 'M260 538 C360 509 350 486 292 467 C231 449 203 440 218 413 L230 391',
 'M230 391 C281 371 328 354 302 329 C279 311 200 281 218 262 C244 240 272 226 253 207',
 'M253 207 C325 177 300 164 270 152 C234 139 252 118 297 102 L315 80'
];
export function birds(cls=''){return `<svg class="birds ${cls}" viewBox="0 0 200 80" aria-hidden="true"><path d="M20 40q8-12 18 0 8-12 16-1M85 20q5-9 11 0 6-9 12-1M145 49q5-8 11 0 6-8 12-1" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;}
export function scenicBackground(){return `<div class="scenic-backdrop" aria-hidden="true">${art('panorama','backdrop-panorama')}${art('mist','ambient-mist mist-a')}${art('mist','ambient-mist mist-b')}${birds()}</div>`;}
export function littleMountain(m,cls=''){return terrainThumbnail(m);}
export function mountainScene(plan,completed=0,options={}){return terrainScene(plan,completed,options);}
export function heroScene(){return `<div class="hero-scene" aria-hidden="true">${art('panorama','hero-panorama')}${art('middle','hero-far-peak')}${art('mist','hero-cloud one')}${art('mist','hero-cloud two')}${birds('hero-birds')}</div>`;}
