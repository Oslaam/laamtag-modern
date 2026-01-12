import Phaser from 'phaser';

// This allows the Game to send messages like "Enemy Killed" to the UI
export const EventBus = new Phaser.Events.EventEmitter();