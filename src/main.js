//import './ui/hud.css';
import { Game } from './core/Game.js';

const app = document.querySelector('#app');
const game = new Game(app);
game.start();
